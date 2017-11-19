# hast-util-to-nlcst [![Build Status][travis-badge]][travis] [![Coverage Status][codecov-badge]][codecov]

Transform [HAST][] to [NLCST][].

> **Note** You probably want to use [rehype-retext][].

###### Implied sentences

The algorithm supports implicit and explicit paragraphs, such as:

```html
<article>
  An implicit sentence.
  <h1>An explicit sentence.</h1>
</article>
```

Overlapping paragraphs are also supported (see the tests or the HTML spec
for more info).

###### Ignored nodes

Some elements are ignored and their content will not be present in NLCST:
`<script>`, `<style>`, `<svg>`, `<math>`, `<del>`.

To ignore other elements, add a `data-nlcst` attribute with a value of `ignore`:

```html
<p>This is <span data-nlcst="ignore">hidden</span>.</p>
<p data-nlcst="ignore">Completely hidden.</p>
```

###### Source nodes

`<code>` elements are mapped to [Source][] nodes in NLCST.

To mark other elements as source, add a `data-nlcst` attribute with a value
of `source`:

```html
<p>This is <span data-nlcst="source">marked as source</span>.</p>
<p data-nlcst="source">Completely marked.</p>
```

## Installation

[npm][]:

```bash
npm install hast-util-to-nlcst
```

## Usage

Say we have the following `example.html`:

```html
<article>
  Implicit.
  <h1>Explicit: <strong>foo</strong>s-ball</h1>
  <pre><code class="language-foo">bar()</code></pre>
</article>
```

...and next to it, `index.js`:

```javascript
var rehype = require('rehype');
var vfile = require('to-vfile');
var English = require('parse-english');
var inspect = require('unist-util-inspect');
var toNLCST = require('hast-util-to-nlcst');

var file = vfile.readSync('example.html');
var tree = rehype().parse(file);

console.log(inspect(toNLCST(tree, file, English)));
```

Which, when running, yields:

```txt
RootNode[2] (1:1-6:1, 0-134)
├─ ParagraphNode[3] (1:10-3:3, 9-24)
│  ├─ WhiteSpaceNode: "\n  " (1:10-2:3, 9-12)
│  ├─ SentenceNode[2] (2:3-2:12, 12-21)
│  │  ├─ WordNode[1] (2:3-2:11, 12-20)
│  │  │  └─ TextNode: "Implicit" (2:3-2:11, 12-20)
│  │  └─ PunctuationNode: "." (2:11-2:12, 20-21)
│  └─ WhiteSpaceNode: "\n  " (2:12-3:3, 21-24)
└─ ParagraphNode[1] (3:7-3:43, 28-64)
   └─ SentenceNode[4] (3:7-3:43, 28-64)
      ├─ WordNode[1] (3:7-3:15, 28-36)
      │  └─ TextNode: "Explicit" (3:7-3:15, 28-36)
      ├─ PunctuationNode: ":" (3:15-3:16, 36-37)
      ├─ WhiteSpaceNode: " " (3:16-3:17, 37-38)
      └─ WordNode[4] (3:25-3:43, 46-64)
         ├─ TextNode: "foo" (3:25-3:28, 46-49)
         ├─ TextNode: "s" (3:37-3:38, 58-59)
         ├─ PunctuationNode: "-" (3:38-3:39, 59-60)
         └─ TextNode: "ball" (3:39-3:43, 60-64)
```

## API

### `toNLCST(node, file, Parser)`

Transform a [HAST][] syntax tree and corresponding [virtual file][vfile]
into an [NLCST][nlcst] tree.

##### Parameters

###### `node`

Syntax tree with positional information ([`HASTNode`][hast]).

###### `file`

Virtual file ([`VFile`][vfile]).

###### `parser`

Constructor of an NLCST parser, such as [`parse-english`][english],
[`parse-dutch`][dutch], or [`parse-latin`][latin] (`Function`).

##### Returns

[`NLCSTNode`][nlcst].

## Contribute

See [`contribute.md` in `syntax-tree/hast`][contribute] for ways to get
started.

This organisation has a [Code of Conduct][coc].  By interacting with this
repository, organisation, or community you agree to abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[travis-badge]: https://img.shields.io/travis/syntax-tree/hast-util-to-nlcst.svg

[travis]: https://travis-ci.org/syntax-tree/hast-util-to-nlcst

[codecov-badge]: https://img.shields.io/codecov/c/github/syntax-tree/hast-util-to-nlcst.svg

[codecov]: https://codecov.io/github/syntax-tree/hast-util-to-nlcst

[npm]: https://docs.npmjs.com/cli/install

[license]: LICENSE

[author]: http://wooorm.com

[hast]: https://github.com/syntax-tree/hast

[nlcst]: https://github.com/syntax-tree/nlcst

[rehype-retext]: https://github.com/wooorm/rehype-retext

[vfile]: https://github.com/vfile/vfile

[english]: https://github.com/wooorm/parse-english

[latin]: https://github.com/wooorm/parse-latin

[dutch]: https://github.com/wooorm/parse-dutch

[source]: https://github.com/syntax-tree/nlcst#source

[contribute]: https://github.com/syntax-tree/hast/blob/master/contributing.md

[coc]: https://github.com/syntax-tree/hast/blob/master/code-of-conduct.md
