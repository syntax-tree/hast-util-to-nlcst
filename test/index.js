import fs from 'fs'
import path from 'path'
import test from 'tape'
import rehype from 'rehype'
import vfile from 'vfile'
import {ParseLatin} from 'parse-latin'
import {ParseDutch} from 'parse-dutch'
import {ParseEnglish} from 'parse-english'
import {isHidden} from 'is-hidden'
import {toNlcst} from '../index.js'

test('hast-util-to-nlcst', function (t) {
  t.throws(
    function () {
      // @ts-ignore runtime.
      toNlcst()
    },
    /hast-util-to-nlcst expected node/,
    'should fail when not given a tree'
  )

  t.throws(
    function () {
      // @ts-ignore runtime.
      toNlcst({})
    },
    /hast-util-to-nlcst expected node/,
    'should fail when not given a tree (#2)'
  )

  t.throws(
    function () {
      // @ts-ignore runtime.
      toNlcst({type: 'foo'})
    },
    /hast-util-to-nlcst expected file/,
    'should fail when not given a file'
  )

  t.throws(
    function () {
      // @ts-ignore runtime.
      toNlcst({type: 'foo'})
    },
    /hast-util-to-nlcst expected file/,
    'should fail when not given a file (#2)'
  )

  t.throws(
    function () {
      // @ts-ignore runtime.
      toNlcst({type: 'text', value: 'foo'}, {foo: 'bar'})
    },
    /hast-util-to-nlcst expected file/,
    'should fail when not given a file (#3)'
  )

  t.throws(
    function () {
      // @ts-ignore runtime.
      toNlcst({type: 'text', value: 'foo'}, vfile('foo'))
    },
    /hast-util-to-nlcst expected parser/,
    'should fail without parser'
  )

  t.throws(
    function () {
      toNlcst({type: 'text', value: 'foo'}, vfile(), ParseLatin)
    },
    /hast-util-to-nlcst expected position on nodes/,
    'should fail when not given positional information'
  )

  t.doesNotThrow(function () {
    toNlcst(
      {
        type: 'text',
        value: 'foo',
        position: {
          start: {line: 1, column: 1},
          end: {line: 1, column: 4}
        }
      },
      vfile(),
      ParseEnglish
    )
  }, 'should accept a parser constructor')

  t.doesNotThrow(function () {
    toNlcst(
      {
        type: 'text',
        value: 'foo',
        position: {
          start: {line: 1, column: 1},
          end: {line: 1, column: 4}
        }
      },
      vfile(),
      new ParseDutch()
    )
  }, 'should accept a parser instance')

  t.throws(
    function () {
      toNlcst(
        {
          type: 'text',
          value: 'foo',
          // @ts-ignore runtime.
          position: {start: {}, end: {}}
        },
        vfile(),
        ParseLatin
      )
    },
    /hast-util-to-nlcst expected position on nodes/,
    'should fail when not given positional information (#2)'
  )

  t.test('should accept nodes without offsets', function (st) {
    var node = toNlcst(
      {
        type: 'text',
        value: 'foo',
        position: {
          start: {line: 1, column: 1},
          end: {line: 1, column: 4}
        }
      },
      vfile('foo'),
      ParseLatin
    )

    st.equal(node.position.start.offset, 0, 'should set starting offset')
    st.equal(node.position.end.offset, 3, 'should set ending offset')

    st.end()
  })

  t.test('should accept comments', function (st) {
    var node = toNlcst(
      {
        type: 'comment',
        value: 'a',
        position: {start: {line: 1, column: 1}, end: {line: 1, column: 9}}
      },
      vfile('<!--a-->'),
      ParseLatin
    )

    st.deepEqual(
      node,
      {
        type: 'RootNode',
        children: [],
        position: {
          start: {line: 1, column: 1, offset: 0},
          end: {line: 1, column: 9, offset: 8}
        }
      },
      'should support comments'
    )

    st.end()
  })

  t.end()
})

test('Fixtures', function (t) {
  var root = path.join('test', 'fixtures')
  var files = fs.readdirSync(root)
  var index = -1
  /** @type {string} */
  var input
  /** @type {string} */
  var output
  /** @type {import('vfile').VFile} */
  var file
  /** @type {import('unist').Node} */
  var actual
  /** @type {import('unist').Node} */
  var expected

  while (++index < files.length) {
    if (isHidden(files[index])) continue

    input = path.join(root, files[index], 'input.html')
    output = path.join(root, files[index], 'output.json')
    file = vfile(fs.readFileSync(input))
    // @ts-ignore Assume hast.
    actual = toNlcst(rehype().parse(file), file, ParseLatin)

    try {
      expected = JSON.parse(String(fs.readFileSync(output)))
    } catch {
      fs.writeFileSync(output, JSON.stringify(actual, null, 2) + '\n')
      return
    }

    t.deepEqual(actual, expected, 'should work on `' + files[index] + '`')
  }

  t.end()
})
