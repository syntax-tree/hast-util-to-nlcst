/**
 * @typedef {import('nlcst').Root} NlcstRoot
 * @typedef {import('nlcst').Paragraph} NlcstParagraph
 * @typedef {import('nlcst').Sentence} NlcstSentence
 * @typedef {import('nlcst').Content} NlcstContent
 * @typedef {import('nlcst').SentenceContent} NlcstSentenceContent
 * @typedef {import('hast').Root} HastRoot
 * @typedef {import('hast').Element} HastElement
 * @typedef {import('hast').Content} HastContent
 * @typedef {import('hast').ElementContent} HastElementContent
 * @typedef {import('vfile').VFile} VFile
 */

/**
 * @typedef {NlcstRoot | NlcstContent} NlcstNode
 * @typedef {Extract<NlcstNode, import('unist').Parent>} NlcstParent
 * @typedef {HastRoot | HastContent} HastNode
 *
 *
 * @typedef {{
 *   tokenizeSentencePlugins: Array<(node: NlcstSentence) => void>,
 *   tokenizeParagraphPlugins: Array<(node: NlcstParagraph) => void>,
 *   parse(value: string | null | undefined): NlcstRoot
 *   tokenizeParagraph(value: string | null | undefined): NlcstParagraph
 *   tokenize(value: string | null | undefined): Array<NlcstSentenceContent>
 * }} ParserInstance
 * @typedef {new () => ParserInstance} ParserConstructor
 */

import {embedded} from 'hast-util-embedded'
import {convertElement} from 'hast-util-is-element'
import {phrasing} from 'hast-util-phrasing'
import {toString} from 'hast-util-to-string'
import {whitespace} from 'hast-util-whitespace'
import {toString as nlcstToString} from 'nlcst-to-string'
import {pointStart, pointEnd} from 'unist-util-position'
import {location} from 'vfile-location'

const source = convertElement(['code', dataNlcstSourced])
const ignore = convertElement([
  'script',
  'style',
  'svg',
  'math',
  'del',
  dataNlcstIgnore
])
const explicit = convertElement(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

const flowAccepting = convertElement([
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

// Ported from:
// <https://github.com/wooorm/parse-latin/blob/ea33f09/lib/expressions.js#L5>
const terminalMarker = /^([!.?\u2026\u203D]+)$/

/**
 * Turn a hast tree into an nlcst tree.
 *
 * @param {HastNode} tree
 *   hast tree to transform.
 * @param {VFile} file
 *   Virtual file.
 * @param {ParserInstance | ParserConstructor} Parser
 *   Parser to use.
 * @returns {NlcstRoot}
 *   nlcst tree.
 */
export function toNlcst(tree, file, Parser) {
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

  const doc = String(file)
  const loc = location(doc)
  const parser = 'parse' in Parser ? Parser : new Parser()
  /** @type {Array<NlcstContent>} */
  const results = []

  find(tree)

  return {
    type: 'RootNode',
    children: results,
    position: {start: loc.toPoint(0), end: loc.toPoint(doc.length)}
  }

  /**
   * Transform a hast node.
   *
   * @param {HastNode} node
   *   hast node.
   * @returns {void}
   *   Nothing.
   */
  function find(node) {
    if (node.type === 'root') {
      findAll(node.children)
    } else if (node.type === 'element' && !ignore(node)) {
      if (explicit(node)) {
        // Explicit paragraph.
        add(node)
      } else if (flowAccepting(node)) {
        // Slightly simplified version of:
        // <https://html.spec.whatwg.org/multipage/dom.html#paragraphs>.
        implicit(flattenAll(node.children))
      } else {
        // Dig deeper.
        findAll(node.children)
      }
    }
  }

  /**
   * Transform hast children.
   *
   * @param {Array<HastContent>} children
   *   hast children.
   * @returns {void}
   *   Nothing.
   */
  function findAll(children) {
    let index = -1

    while (++index < children.length) {
      find(children[index])
    }
  }

  /**
   * Flatten hast children: this unravels `a`, `ins`, `del`, and `map` elements.
   *
   * @param {Array<HastElementContent>} children
   *   Children.
   * @returns {Array<HastElementContent>}
   *   Flattened children.
   */
  function flattenAll(children) {
    /** @type {Array<HastElementContent>} */
    const results = []
    let index = -1

    while (++index < children.length) {
      const child = children[index]

      // See: <https://html.spec.whatwg.org/multipage/dom.html#paragraphs>
      if (
        child.type === 'element' &&
        (child.tagName === 'a' ||
          child.tagName === 'ins' ||
          child.tagName === 'del' ||
          child.tagName === 'map')
      ) {
        results.push(...flattenAll(child.children))
      } else {
        results.push(child)
      }
    }

    return results
  }

  /**
   * Add one or more nodes.
   *
   * @param {HastElementContent | Array<HastElementContent>} node
   *   hast node.
   * @returns {void}
   *   Nothing.
   */
  function add(node) {
    /** @type {Array<NlcstSentenceContent> | undefined} */
    const result = Array.isArray(node) ? all(node) : one(node)

    if (result && result.length > 0) {
      const start = pointStart(result[0])
      const end = pointEnd(result[result.length - 1])

      // Turn into a sentence.
      /** @type {NlcstSentence} */
      const sentence = {type: 'SentenceNode', children: result}
      if (start && end) sentence.position = {start, end}

      let index = -1
      while (parser.tokenizeSentencePlugins[++index]) {
        parser.tokenizeSentencePlugins[index](sentence)
      }

      // Turn into a paragraph.
      /** @type {NlcstParagraph} */
      const paragraph = {
        type: 'ParagraphNode',
        children: splitNode(sentence, 'PunctuationNode', terminalMarker)
      }
      if (start && end) paragraph.position = {start: {...start}, end: {...end}}

      index = -1
      while (parser.tokenizeParagraphPlugins[++index]) {
        parser.tokenizeParagraphPlugins[index](paragraph)
      }

      results.push(paragraph)
    }
  }

  /**
   * Handle implicit paragraphs.
   *
   * See: <https://html.spec.whatwg.org/multipage/dom.html#paragraphs>.
   *
   * @param {Array<HastElementContent>} children
   *   hast nodes.
   * @returns {void}
   *   Nothing.
   */
  function implicit(children) {
    let index = -1
    let start = -1
    /** @type {boolean | undefined} */
    let viable

    while (++index <= children.length) {
      const child = children[index]

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

        viable = undefined
        start = -1
      }
    }
  }

  /**
   * Turn a hast node into nlcst nodes.
   *
   * @param {HastContent} node
   *   hast node.
   * @returns {Array<NlcstSentenceContent> | undefined}
   *   nlcst sentence content.
   */
  function one(node) {
    /** @type {Array<NlcstSentenceContent> | undefined} */
    let replacement
    /** @type {boolean | undefined} */
    let change

    if (node.type === 'text') {
      replacement = parser.tokenize(node.value)
      change = true
    } else if (node.type === 'element' && !ignore(node)) {
      if (node.tagName === 'wbr') {
        replacement = [{type: 'WhiteSpaceNode', value: ' '}]
        change = true
      } else if (node.tagName === 'br') {
        replacement = [{type: 'WhiteSpaceNode', value: '\n'}]
        change = true
      } else if (source(node)) {
        replacement = [{type: 'SourceNode', value: toString(node)}]
        change = true
      } else {
        replacement = all(node.children)
      }
    }

    if (change && replacement) {
      patch(replacement, loc, loc.toOffset(pointStart(node)))
    }

    return replacement
  }

  /**
   * Turn hast nodes into nlcst nodes.
   *
   * @param {Array<HastContent>} nodes
   *   hast nodes.
   * @returns {Array<NlcstSentenceContent> | undefined}
   *   nlcst sentence content.
   */
  function all(nodes) {
    /** @type {Array<NlcstSentenceContent>} */
    const results = []
    let index = -1

    while (++index < nodes.length) {
      const result = one(nodes[index])
      if (result) {
        results.push(...result)
      }
    }

    return results
  }

  /**
   * Patch a position on each node in `nodes`.
   *
   * `offset` is the offset in `file` this run of content starts at.
   *
   * Note that nlcst nodes are concrete, meaning that their starting and ending
   * positions can be inferred from their content.
   *
   * @param {Array<NlcstContent>} nodes
   *   Nodes to patch.
   * @param {ReturnType<location>} location
   *   Location info.
   * @param {number} offset
   *   Current offset.
   * @returns {void}
   *   Nothing.
   */
  function patch(nodes, location, offset) {
    let index = -1
    let start = offset

    while (++index < nodes.length) {
      const node = nodes[index]

      if ('children' in node) {
        patch(node.children, location, start)
      }

      const end = start + nlcstToString(node).length

      node.position = {
        start: location.toPoint(start),
        end: location.toPoint(end)
      }

      start = end
    }
  }
}

/**
 * Check if an element has a `data-nlcst` attribute set to `source`.
 *
 * @param {HastElement} node
 *   Element.
 * @returns {boolean}
 *   Whether `node` has a `data-nlcst` attribute set to `source`.
 */
function dataNlcstSourced(node) {
  return Boolean(node.properties && node.properties.dataNlcst === 'source')
}

/**
 * Check if an element has a `data-nlcst` attribute set to `ignore`.
 *
 * @param {HastElement} node
 *   Element.
 * @returns {boolean}
 *   Whether `node` has a `data-nlcst` attribute set to `ignore`.
 */
function dataNlcstIgnore(node) {
  return Boolean(node.properties && node.properties.dataNlcst === 'ignore')
}

// Ported from:
// <https://github.com/wooorm/parse-latin/blob/ea33f09/lib/index.js#L266-L310>
/**
 * A function that splits one node into several nodes.
 *
 * @template {NlcstParent} TheNode
 * @param {TheNode} node
 * @param {RegExp} expression
 * @param {NlcstContent['type']} childType
 * @returns {Array<TheNode>}
 */
function splitNode(node, childType, expression) {
  /** @type {Array<TheNode>} */
  const result = []
  let index = -1
  let start = 0

  while (++index < node.children.length) {
    const token = node.children[index]

    if (
      index === node.children.length - 1 ||
      (token.type === childType && expression.test(nlcstToString(token)))
    ) {
      /** @type {TheNode} */
      // @ts-expect-error: fine
      const parent = {
        type: node.type,
        children: node.children.slice(start, index + 1)
      }

      const first = node.children[start]
      const last = token
      if (first.position && last.position) {
        parent.position = {
          start: first.position.start,
          end: last.position.end
        }
      }

      result.push(parent)
      start = index + 1
    }
  }

  return result
}
