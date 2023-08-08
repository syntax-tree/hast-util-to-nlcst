import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import test from 'node:test'
import {fromHtml} from 'hast-util-from-html'
import {isHidden} from 'is-hidden'
import {ParseDutch} from 'parse-dutch'
import {ParseEnglish} from 'parse-english'
import {ParseLatin} from 'parse-latin'
import {VFile} from 'vfile'
import {toNlcst} from '../index.js'

test('toNlcst', async function (t) {
  await t.test('should expose the public api', async function () {
    assert.deepEqual(Object.keys(await import('../index.js')).sort(), [
      'toNlcst'
    ])
  })

  await t.test('should fail when not given a tree', async function () {
    assert.throws(function () {
      // @ts-expect-error: check how no node is handled.
      toNlcst()
    }, /hast-util-to-nlcst expected node/)
  })

  await t.test('should fail when not given a tree (#2)', async function () {
    assert.throws(function () {
      // @ts-expect-error: check how an invalid node is handled.
      toNlcst({})
    }, /hast-util-to-nlcst expected node/)
  })

  await t.test('should fail when not given a file', async function () {
    assert.throws(function () {
      // @ts-expect-error: check how no file is handled.
      toNlcst({type: 'foo'})
    }, /hast-util-to-nlcst expected file/)
  })

  await t.test('should fail when not given a file (#2)', async function () {
    assert.throws(function () {
      // @ts-expect-error: check how no file is handled.
      toNlcst({type: 'foo'})
    }, /hast-util-to-nlcst expected file/)
  })

  await t.test('should fail when not given a file (#3)', async function () {
    assert.throws(function () {
      // @ts-expect-error: check how an invalid file is handled.
      toNlcst({type: 'text', value: 'foo'}, {foo: 'bar'})
    }, /hast-util-to-nlcst expected file/)
  })

  await t.test('should fail without parser', async function () {
    assert.throws(function () {
      // @ts-expect-error: check how no parser is handled.
      toNlcst({type: 'text', value: 'foo'}, new VFile('foo'))
    }, /hast-util-to-nlcst expected parser/)
  })

  await t.test(
    'should fail when not given positional information',
    async function () {
      assert.throws(function () {
        toNlcst({type: 'text', value: 'foo'}, new VFile(), ParseLatin)
      }, /hast-util-to-nlcst expected position on nodes/)
    }
  )

  await t.test('should accept a parser constructor', async function () {
    assert.doesNotThrow(function () {
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
    })
  })

  await t.test('should accept a parser instance', async function () {
    assert.doesNotThrow(function () {
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
    })
  })

  await t.test(
    'should fail when not given positional information (#2)',
    async function () {
      assert.throws(function () {
        toNlcst(
          {
            type: 'text',
            value: 'foo',
            // @ts-expect-error: check how empty points are handled.
            position: {start: {}, end: {}}
          },
          new VFile(),
          ParseLatin
        )
      }, /hast-util-to-nlcst expected position on nodes/)
    }
  )

  await t.test('should accept nodes without offsets', async function (t) {
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

    await t.test('should set starting offset', async function () {
      assert.equal(node.position && node.position.start.offset, 0)
    })

    await t.test('should set ending offset', async function () {
      assert.equal(node.position && node.position.end.offset, 3)
    })
  })

  await t.test('should support comments', async function () {
    const node = toNlcst(
      {
        type: 'comment',
        value: 'a',
        position: {start: {line: 1, column: 1}, end: {line: 1, column: 9}}
      },
      new VFile('<!--a-->'),
      ParseLatin
    )

    assert.deepEqual(node, {
      type: 'RootNode',
      children: [],
      position: {
        start: {line: 1, column: 1, offset: 0},
        end: {line: 1, column: 9, offset: 8}
      }
    })
  })
})

test('fixtures', async function (t) {
  const root = new URL('fixtures/', import.meta.url)
  const files = await fs.readdir(root)
  let index = -1

  while (++index < files.length) {
    const folder = files[index]

    if (isHidden(folder)) continue

    await t.test(files[index], async function () {
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
        return
      }

      assert.deepEqual(actual, expected)
    })
  }
})
