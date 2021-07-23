import fs from 'fs'
import path from 'path'
import test from 'tape'
import rehype from 'rehype'
import {VFile} from 'vfile'
// @ts-expect-error: to do type.
import {ParseLatin} from 'parse-latin'
// @ts-expect-error: to do type.
import {ParseDutch} from 'parse-dutch'
// @ts-expect-error: to do type.
import {ParseEnglish} from 'parse-english'
import {isHidden} from 'is-hidden'
import {toNlcst} from '../index.js'

test('hast-util-to-nlcst', (t) => {
  t.throws(
    () => {
      // @ts-ignore runtime.
      toNlcst()
    },
    /hast-util-to-nlcst expected node/,
    'should fail when not given a tree'
  )

  t.throws(
    () => {
      // @ts-ignore runtime.
      toNlcst({})
    },
    /hast-util-to-nlcst expected node/,
    'should fail when not given a tree (#2)'
  )

  t.throws(
    () => {
      // @ts-ignore runtime.
      toNlcst({type: 'foo'})
    },
    /hast-util-to-nlcst expected file/,
    'should fail when not given a file'
  )

  t.throws(
    () => {
      // @ts-ignore runtime.
      toNlcst({type: 'foo'})
    },
    /hast-util-to-nlcst expected file/,
    'should fail when not given a file (#2)'
  )

  t.throws(
    () => {
      // @ts-ignore runtime.
      toNlcst({type: 'text', value: 'foo'}, {foo: 'bar'})
    },
    /hast-util-to-nlcst expected file/,
    'should fail when not given a file (#3)'
  )

  t.throws(
    () => {
      // @ts-ignore runtime.
      toNlcst({type: 'text', value: 'foo'}, new VFile('foo'))
    },
    /hast-util-to-nlcst expected parser/,
    'should fail without parser'
  )

  t.throws(
    () => {
      toNlcst({type: 'text', value: 'foo'}, new VFile(), ParseLatin)
    },
    /hast-util-to-nlcst expected position on nodes/,
    'should fail when not given positional information'
  )

  t.doesNotThrow(() => {
    toNlcst(
      {
        type: 'text',
        value: 'foo',
        position: {
          start: {line: 1, column: 1},
          end: {line: 1, column: 4}
        }
      },
      new VFile(),
      ParseEnglish
    )
  }, 'should accept a parser constructor')

  t.doesNotThrow(() => {
    toNlcst(
      {
        type: 'text',
        value: 'foo',
        position: {
          start: {line: 1, column: 1},
          end: {line: 1, column: 4}
        }
      },
      new VFile(),
      new ParseDutch()
    )
  }, 'should accept a parser instance')

  t.throws(
    () => {
      toNlcst(
        {
          type: 'text',
          value: 'foo',
          // @ts-ignore runtime.
          position: {start: {}, end: {}}
        },
        new VFile(),
        ParseLatin
      )
    },
    /hast-util-to-nlcst expected position on nodes/,
    'should fail when not given positional information (#2)'
  )

  t.test('should accept nodes without offsets', (st) => {
    const node = toNlcst(
      {
        type: 'text',
        value: 'foo',
        position: {
          start: {line: 1, column: 1},
          end: {line: 1, column: 4}
        }
      },
      new VFile('foo'),
      ParseLatin
    )

    st.equal(node.position.start.offset, 0, 'should set starting offset')
    st.equal(node.position.end.offset, 3, 'should set ending offset')

    st.end()
  })

  t.test('should accept comments', (st) => {
    const node = toNlcst(
      {
        type: 'comment',
        value: 'a',
        position: {start: {line: 1, column: 1}, end: {line: 1, column: 9}}
      },
      new VFile('<!--a-->'),
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

test('Fixtures', (t) => {
  const root = path.join('test', 'fixtures')
  const files = fs.readdirSync(root)
  let index = -1
  /** @type {string} */
  let input
  /** @type {string} */
  let output
  /** @type {import('vfile').VFile} */
  let file
  /** @type {import('unist').Node} */
  let actual
  /** @type {import('unist').Node} */
  let expected

  while (++index < files.length) {
    if (isHidden(files[index])) continue

    input = path.join(root, files[index], 'input.html')
    output = path.join(root, files[index], 'output.json')
    file = new VFile(fs.readFileSync(input))
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
