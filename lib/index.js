/**
 * @typedef {import('unist').Node} UnistNode
 * @typedef {import('hast').Parent} Parent
 * @typedef {import('hast').Root} Root
 * @typedef {import('hast').DocType} Doctype
 * @typedef {import('hast').Element} Element
 * @typedef {import('hast').Text} Text
 * @typedef {import('hast').Comment} Comment
 * @typedef {Parent['children'][number]} Child
 * @typedef {Element['children'][number]} ElementChild
 * @typedef {Child|Root} Node
 * @typedef {import('vfile-location').Location} Location
 * @typedef {import('vfile').VFile} VFile
 *
 * @typedef {{
 *   parse(nodes: UnistNode[]): UnistNode
 *   tokenizeSource(value: string): UnistNode
 *   tokenizeWhiteSpace(value: string): UnistNode
 *   tokenizeParagraph(nodes: UnistNode[]): UnistNode
 *   tokenize(value: string): UnistNode[]
 * }} ParserInstance
 * @typedef {new () => ParserInstance} ParserConstructor
 */

import {embedded} from 'hast-util-embedded'
import {convertElement} from 'hast-util-is-element'
import {phrasing} from 'hast-util-phrasing'
import toString from 'hast-util-to-string'
import {whitespace} from 'hast-util-whitespace'
import {toString as nlcstToString} from 'nlcst-to-string'
import {pointStart} from 'unist-util-position'
import vfileLocation from 'vfile-location'

var push = [].push

var source = convertElement(['code', dataNlcstSourced])
var ignore = convertElement([
  'script',
  'style',
  'svg',
  'math',
  'del',
  dataNlcstIgnore
])
var explicit = convertElement(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

var flowAccepting = convertElement([
  'body',
  'article',
  'section',
  'blockquote',
  'nav',
  'aside',
  'header',
  'footer',
  'address',
  'li',
  'dt',
  'dd',
  'figure',
  'figcaption',
  'div',
  'main',
  'caption',
  'td',
  'th',
  'form',
  'fieldset',
  'details',
  'dialog'
])

// See: <https://html.spec.whatwg.org/multipage/dom.html#paragraphs>
var unravelInParagraph = convertElement(['a', 'ins', 'del', 'map'])

/**
 * Transform `tree` to nlcst.
 *
 * @param {Node} tree
 * @param {VFile} file
 * @param {ParserInstance|ParserConstructor} Parser
 */
export function toNlcst(tree, file, Parser) {
  /** @type {ParserInstance} */
  var parser
  /** @type {Location} */
  var location
  /** @type {Array.<UnistNode>} */
  var results
  /** @type {string} */
  var doc

  // Warn for invalid parameters.
  if (!tree || !tree.type) {
    throw new Error('hast-util-to-nlcst expected node')
  }

  if (!file || !file.messages) {
    throw new Error('hast-util-to-nlcst expected file')
  }

  // Construct parser.
  if (!Parser) {
    throw new Error('hast-util-to-nlcst expected parser')
  }

  if (!pointStart(tree).line || !pointStart(tree).column) {
    throw new Error('hast-util-to-nlcst expected position on nodes')
  }

  doc = String(file)
  location = vfileLocation(doc)
  parser = 'parse' in Parser ? Parser : new Parser()

  // Transform hast to nlcst, and pass these into `parser.parse` to insert
  // sentences, paragraphs where needed.
  results = []

  find(tree)

  return {
    type: 'RootNode',
    children: results,
    position: {start: location.toPoint(0), end: location.toPoint(doc.length)}
  }

  /**
   * @param {Node} node
   */
  function find(node) {
    if (node.type === 'root') {
      findAll(node.children)
    } else if (node.type === 'element' && !ignore(node)) {
      if (explicit(node)) {
        // Explicit paragraph.
        add(node)
      } else if (flowAccepting(node)) {
        // Slightly simplified version of: <https://html.spec.whatwg.org/#paragraphs>.
        implicit(flattenAll(node.children))
      } else {
        // Dig deeper.
        findAll(node.children)
      }
    }
  }

  /**
   * @param {Array.<Child>} children
   */
  function findAll(children) {
    var index = -1

    while (++index < children.length) {
      find(children[index])
    }
  }

  /**
   * @param {Array.<ElementChild>} children
   * @returns {Array.<ElementChild>}
   */
  function flattenAll(children) {
    /** @type {Array.<ElementChild>} */
    var results = []
    var index = -1

    while (++index < children.length) {
      if (unravelInParagraph(children[index])) {
        // @ts-ignore Is element.
        results.push(...flattenAll(children[index].children))
      } else {
        results.push(children[index])
      }
    }

    return results
  }

  /**
   * @param {Array.<Node>|Node} node
   */
  function add(node) {
    /** @type {Array.<UnistNode>} */
    // @ts-ignore Assume child.
    var result = Array.isArray(node) ? all(node) : one(node)

    if (result.length > 0) {
      results.push(parser.tokenizeParagraph(result))
    }
  }

  /**
   * @param {Array.<ElementChild>} children
   */
  function implicit(children) {
    var index = -1
    var start = -1
    /** @type {boolean} */
    var viable
    /** @type {ElementChild} */
    var child

    while (++index <= children.length) {
      child = children[index]

      if (child && phrasing(child)) {
        if (start === -1) start = index

        if (!viable && !embedded(child) && !whitespace(child)) {
          viable = true
        }
      } else if (child && start === -1) {
        find(child)
        start = index + 1
      } else if (start !== -1) {
        ;(viable ? add : findAll)(children.slice(start, index))

        if (child) {
          find(child)
        }

        viable = null
        start = -1
      }
    }
  }

  /**
   * Convert `node` (hast) to nlcst.
   *
   * @param {Node} node
   * @returns {Array.<UnistNode>}
   */
  function one(node) {
    /** @type {Array.<UnistNode>} */
    var replacement
    /** @type {boolean} */
    var change

    if (node.type === 'text') {
      replacement = parser.tokenize(node.value)
      change = true
    } else if (node.type === 'element' && !ignore(node)) {
      if (node.tagName === 'wbr') {
        replacement = [parser.tokenizeWhiteSpace(' ')]
        change = true
      } else if (node.tagName === 'br') {
        replacement = [parser.tokenizeWhiteSpace('\n')]
        change = true
      } else if (source(node)) {
        replacement = [parser.tokenizeSource(toString(node))]
        change = true
      } else {
        replacement = all(node.children)
      }
    }

    return change
      ? patch(replacement, location, location.toOffset(pointStart(node)))
      : replacement
  }

  /**
   * Convert all `children` (hast) to nlcst.
   *
   * @param {Array.<Child>} children
   * @returns {Array.<UnistNode>}
   */
  function all(children) {
    /** @type {Array.<UnistNode>} */
    var results = []
    var index = -1

    while (++index < children.length) {
      push.apply(results, one(children[index]) || [])
    }

    return results
  }

  /**
   * Patch a position on each node in `nodes`.
   * `offset` is the offset in `file` this run of content starts at.
   *
   * Note that nlcst nodes are concrete, meaning that their starting and ending
   * positions can be inferred from their content.
   *
   * @template {Array.<UnistNode>} T
   * @param {T} nodes
   * @param {Location} location
   * @param {number} offset
   * @returns {T}
   */
  function patch(nodes, location, offset) {
    var index = -1
    var start = offset
    /** @type {number} */
    var end
    /** @type {UnistNode} */
    var node

    while (++index < nodes.length) {
      node = nodes[index]

      if ('children' in node) {
        // @ts-ignore Looks like a parent.
        patch(node.children, location, start)
      }

      end = start + nlcstToString(node).length

      node.position = {
        start: location.toPoint(start),
        end: location.toPoint(end)
      }

      start = end
    }

    return nodes
  }
}

/**
 * @param {Element} node
 * @returns {boolean}
 */
function dataNlcstSourced(node) {
  return node.properties.dataNlcst === 'source'
}

/**
 * @param {Element} node
 * @returns {boolean}
 */
function dataNlcstIgnore(node) {
  return node.properties.dataNlcst === 'ignore'
}
