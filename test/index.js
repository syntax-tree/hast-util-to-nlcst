import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import test from 'node:test'
import {isHidden} from 'is-hidden'
import {VFile} from 'vfile'
import {ParseLatin} from 'parse-latin'
import {ParseDutch} from 'parse-dutch'
import {ParseEnglish} from 'parse-english'
import {fromHtml} from 'hast-util-from-html'
import {toNlcst} from '../index.js'
import * as mod from '../index.js'

test('toNlcst', () => {
  assert.deepEqual(
    Object.keys(mod).sort(),
    ['toNlcst'],
    'should expose the public api'
  )

  assert.throws(
    () => {
      // @ts-expect-error runtime.
      toNlcst()
    },
    /hast-util-to-nlcst expected node/,
    'should fail when not given a tree'
  )

  assert.throws(
    () => {
      // @ts-expect-error runtime.
      toNlcst({})
    },
    /hast-util-to-nlcst expected node/,
    'should fail when not given a tree (#2)'
  )

  assert.throws(
    () => {
      // @ts-expect-error runtime.
      toNlcst({type: 'foo'})
    },
    /hast-util-to-nlcst expected file/,
    'should fail when not given a file'
  )

  assert.throws(
    () => {
      // @ts-expect-error runtime.
      toNlcst({type: 'foo'})
    },
    /hast-util-to-nlcst expected file/,
    'should fail when not given a file (#2)'
  )

  assert.throws(
    () => {
      // @ts-expect-error runtime.
      toNlcst({type: 'text', value: 'foo'}, {foo: 'bar'})
    },
    /hast-util-to-nlcst expected file/,
    'should fail when not given a file (#3)'
  )

  assert.throws(
    () => {
      // @ts-expect-error runtime.
      toNlcst({type: 'text', value: 'foo'}, new VFile('foo'))
    },
    /hast-util-to-nlcst expected parser/,
    'should fail without parser'
  )

  assert.throws(
    () => {
      toNlcst({type: 'text', value: 'foo'}, new VFile(), ParseLatin)
    },
    /hast-util-to-nlcst expected position on nodes/,
    'should fail when not given positional information'
  )

  assert.doesNotThrow(() => {
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

  assert.doesNotThrow(() => {
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

  assert.throws(
    () => {
      toNlcst(
        {
          type: 'text',
          value: 'foo',
          // @ts-expect-error runtime.
          position: {start: {}, end: {}}
        },
        new VFile(),
        ParseLatin
      )
    },
    /hast-util-to-nlcst expected position on nodes/,
    'should fail when not given positional information (#2)'
  )
})

await test('should accept nodes without offsets', () => {
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

  assert.equal(
    node.position && node.position.start.offset,
    0,
    'should set starting offset'
  )
  assert.equal(
    node.position && node.position.end.offset,
    3,
    'should set ending offset'
  )
})

await test('should accept comments', () => {
  const node = toNlcst(
    {
      type: 'comment',
      value: 'a',
      position: {start: {line: 1, column: 1}, end: {line: 1, column: 9}}
    },
    new VFile('<!--a-->'),
    ParseLatin
  )

  assert.deepEqual(
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
})

test('fixtures', async () => {
  const root = new URL('fixtures/', import.meta.url)
  const files = await fs.readdir(root)
  let index = -1

  while (++index < files.length) {
    const folder = files[index]

    if (isHidden(folder)) continue

    const input = new URL(folder + '/input.html', root)
    const output = new URL(folder + '/output.json', root)
    const file = new VFile(await fs.readFile(input))
    const actual = toNlcst(fromHtml(file), file, ParseLatin)
    /** @type {import('unist').Node} */
    let expected

    try {
      expected = JSON.parse(String(await fs.readFile(output)))
    } catch {
      await fs.writeFile(output, JSON.stringify(actual, null, 2) + '\n')
      continue
    }

    assert.deepEqual(actual, expected, 'should work on `' + files[index] + '`')
  }
})
