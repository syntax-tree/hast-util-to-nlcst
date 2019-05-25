'use strict'

var fs = require('fs')
var path = require('path')
var test = require('tape')
var rehype = require('rehype')
var vfile = require('vfile')
var Latin = require('parse-latin')
var Dutch = require('parse-dutch')
var English = require('parse-english')
var negate = require('negate')
var hidden = require('is-hidden')
var toNlcst = require('..')

test('hast-util-to-nlcst', function(t) {
  t.throws(
    function() {
      toNlcst()
    },
    /hast-util-to-nlcst expected node/,
    'should fail when not given a tree'
  )

  t.throws(
    function() {
      toNlcst({})
    },
    /hast-util-to-nlcst expected node/,
    'should fail when not given a tree (#2)'
  )

  t.throws(
    function() {
      toNlcst({type: 'foo'})
    },
    /hast-util-to-nlcst expected file/,
    'should fail when not given a file'
  )

  t.throws(
    function() {
      toNlcst({type: 'foo'})
    },
    /hast-util-to-nlcst expected file/,
    'should fail when not given a file (#2)'
  )

  t.throws(
    function() {
      toNlcst({type: 'text', value: 'foo'}, {foo: 'bar'})
    },
    /hast-util-to-nlcst expected file/,
    'should fail when not given a file (#3)'
  )

  t.throws(
    function() {
      toNlcst({type: 'text', value: 'foo'}, vfile('foo'))
    },
    /hast-util-to-nlcst expected parser/,
    'should fail without parser'
  )

  t.throws(
    function() {
      toNlcst({type: 'text', value: 'foo'}, vfile(), Latin)
    },
    /hast-util-to-nlcst expected position on nodes/,
    'should fail when not given positional information'
  )

  t.doesNotThrow(function() {
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
      English
    )
  }, 'should accept a parser constructor')

  t.doesNotThrow(function() {
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
      new Dutch()
    )
  }, 'should accept a parser instance')

  t.throws(
    function() {
      toNlcst(
        {
          type: 'text',
          value: 'foo',
          position: {start: {}, end: {}}
        },
        vfile(),
        Latin
      )
    },
    /hast-util-to-nlcst expected position on nodes/,
    'should fail when not given positional information (#2)'
  )

  t.test('should accept nodes without offsets', function(st) {
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
      Latin
    )

    st.equal(node.position.start.offset, 0, 'should set starting offset')
    st.equal(node.position.end.offset, 3, 'should set ending offset')

    st.end()
  })

  t.end()
})

test('Fixtures', function(t) {
  var root = path.join(__dirname, 'fixtures')

  fs.readdirSync(root)
    .filter(negate(hidden))
    .forEach(function(fixture) {
      var input = path.join(root, fixture, 'input.html')
      var output = path.join(root, fixture, 'output.json')
      var file = vfile(fs.readFileSync(input))
      var actual = toNlcst(rehype().parse(file), file, Latin)
      var expected

      try {
        expected = JSON.parse(fs.readFileSync(output))
      } catch (error) {
        fs.writeFileSync(output, JSON.stringify(actual, null, 2) + '\n')
        return
      }

      t.deepEqual(actual, expected, 'should work on `' + fixture + '`')
    })

  t.end()
})
