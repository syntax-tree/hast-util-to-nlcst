# hast-util-to-nlcst

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[hast][] utility to transform to [nlcst][].

## Contents

*   [What is this?](#what-is-this)
*   [When should I use this?](#when-should-i-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`toNlcst(tree, file, Parser)`](#tonlcsttree-file-parser)
*   [Types](#types)
*   [Compatibility](#compatibility)
*   [Security](#security)
*   [Related](#related)
*   [Contribute](#contribute)
*   [License](#license)

## What is this?

This package is a utility that takes a [hast][] (HTML) syntax tree as input and
turns it into [nlcst][] (natural language).

## When should I use this?

This project is useful when you want to deal with ASTs and inspect the natural
language inside HTML.
Unfortunately, there is no way yet to apply changes to the nlcst back into
hast.

The mdast utility [`mdast-util-to-nlcst`][mdast-util-to-nlcst] does the same but
uses a markdown tree as input.

The rehype plugin [`rehype-retext`][rehype-retext] wraps this utility to do the
same at a higher-level (easier) abstraction.

## Install

This package is [ESM only][esm].
In Node.js (version 12.20+, 14.14+, or 16.0+), install with [npm][]:

```sh
npm install hast-util-to-nlcst
```

In Deno with [`esm.sh`][esmsh]:

```js
import {toNlcst} from "https://esm.sh/hast-util-to-nlcst@2"
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {toNlcst} from "https://esm.sh/hast-util-to-nlcst@2?bundle"
</script>
```

## Use

Say our document `example.html` contains:

```html
<article>
  Implicit.
  <h1>Explicit: <strong>foo</strong>s-ball</h1>
  <pre><code class="language-foo">bar()</code></pre>
</article>
```

…and our module `example.js` looks as follows:

```js
import {read} from 'to-vfile'
import {inspect} from 'unist-util-inspect'
import {toNlcst} from 'hast-util-to-nlcst'
import {ParseEnglish} from 'parse-english'
import {rehype} from 'rehype'

const file = await read('example.html')
const tree = rehype().parse(file)

console.log(inspect(toNlcst(tree, file, ParseEnglish)))
```

…now running `node example.js` yields (positional info removed for brevity):

```txt
RootNode[2] (1:1-6:1, 0-134)
├─0 ParagraphNode[3] (1:10-3:3, 9-24)
│   ├─0 WhiteSpaceNode "\n  " (1:10-2:3, 9-12)
│   ├─1 SentenceNode[2] (2:3-2:12, 12-21)
│   │   ├─0 WordNode[1] (2:3-2:11, 12-20)
│   │   │   └─0 TextNode "Implicit" (2:3-2:11, 12-20)
│   │   └─1 PunctuationNode "." (2:11-2:12, 20-21)
│   └─2 WhiteSpaceNode "\n  " (2:12-3:3, 21-24)
└─1 ParagraphNode[1] (3:7-3:43, 28-64)
    └─0 SentenceNode[4] (3:7-3:43, 28-64)
        ├─0 WordNode[1] (3:7-3:15, 28-36)
        │   └─0 TextNode "Explicit" (3:7-3:15, 28-36)
        ├─1 PunctuationNode ":" (3:15-3:16, 36-37)
        ├─2 WhiteSpaceNode " " (3:16-3:17, 37-38)
        └─3 WordNode[4] (3:25-3:43, 46-64)
            ├─0 TextNode "foo" (3:25-3:28, 46-49)
            ├─1 TextNode "s" (3:37-3:38, 58-59)
            ├─2 PunctuationNode "-" (3:38-3:39, 59-60)
            └─3 TextNode "ball" (3:39-3:43, 60-64)
```

## API

This package exports the identifier `toNlcst`.
There is no default export.

### `toNlcst(tree, file, Parser)`

[hast][] utility to transform to [nlcst][].

> 👉 **Note**: `tree` must have positional info, `file` must be a [vfile][]
> corresponding to `tree`, and `Parser` must be a parser such as
> [`parse-english`][parse-english], [`parse-dutch`][parse-dutch], or
> [`parse-latin`][parse-latin].

##### Returns

[`NlcstNode`][nlcst-node].

##### Notes

###### Implied paragraphs

The algorithm supports implicit and explicit paragraphs, such as:

```html
<article>
  An implicit paragraph.
  <h1>An explicit paragraph.</h1>
</article>
```

Overlapping paragraphs are also supported (see the tests or the HTML spec for
more info).

###### Ignored nodes

Some elements are ignored and their content will not be present in
**[nlcst][]**: `<script>`, `<style>`, `<svg>`, `<math>`, `<del>`.

To ignore other elements, add a `data-nlcst` attribute with a value of `ignore`:

```html
<p>This is <span data-nlcst="ignore">hidden</span>.</p>
<p data-nlcst="ignore">Completely hidden.</p>
```

###### Source nodes

`<code>` elements are mapped to [`Source`][nlcst-source] nodes in
**[nlcst][]**.

To mark other elements as source, add a `data-nlcst` attribute with a value
of `source`:

```html
<p>This is <span data-nlcst="source">marked as source</span>.</p>
<p data-nlcst="source">Completely marked.</p>
```

## Types

This package is fully typed with [TypeScript][].
It exports the additional types `ParserConstructor` and `ParserInstance`.

## Compatibility

Projects maintained by the unified collective are compatible with all maintained
versions of Node.js.
As of now, that is Node.js 12.20+, 14.14+, and 16.0+.
Our projects sometimes work with older versions, but this is not guaranteed.

## Security

`hast-util-to-nlcst` does not change the original syntax tree so there are no
openings for [cross-site scripting (XSS)][xss] attacks.

## Related

*   [`mdast-util-to-nlcst`](https://github.com/syntax-tree/mdast-util-to-nlcst)
    — transform mdast to nlcst
*   [`hast-util-to-mdast`](https://github.com/syntax-tree/hast-util-to-mdast)
    — transform hast to mdast
*   [`hast-util-to-xast`](https://github.com/syntax-tree/hast-util-to-xast)
    — transform hast to xast

## Contribute

See [`contributing.md`][contributing] in [`syntax-tree/.github`][health] for
ways to get started.
See [`support.md`][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://github.com/syntax-tree/hast-util-to-nlcst/workflows/main/badge.svg

[build]: https://github.com/syntax-tree/hast-util-to-nlcst/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/syntax-tree/hast-util-to-nlcst.svg

[coverage]: https://codecov.io/github/syntax-tree/hast-util-to-nlcst

[downloads-badge]: https://img.shields.io/npm/dm/hast-util-to-nlcst.svg

[downloads]: https://www.npmjs.com/package/hast-util-to-nlcst

[size-badge]: https://img.shields.io/bundlephobia/minzip/hast-util-to-nlcst.svg

[size]: https://bundlephobia.com/result?p=hast-util-to-nlcst

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[chat]: https://github.com/syntax-tree/unist/discussions

[npm]: https://docs.npmjs.com/cli/install

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[esmsh]: https://esm.sh

[typescript]: https://www.typescriptlang.org

[license]: license

[author]: https://wooorm.com

[health]: https://github.com/syntax-tree/.github

[contributing]: https://github.com/syntax-tree/.github/blob/main/contributing.md

[support]: https://github.com/syntax-tree/.github/blob/main/support.md

[coc]: https://github.com/syntax-tree/.github/blob/main/code-of-conduct.md

[rehype-retext]: https://github.com/rehypejs/rehype-retext

[vfile]: https://github.com/vfile/vfile

[hast]: https://github.com/syntax-tree/hast

[nlcst]: https://github.com/syntax-tree/nlcst

[nlcst-node]: https://github.com/syntax-tree/nlcst#nodes

[nlcst-source]: https://github.com/syntax-tree/nlcst#source

[mdast-util-to-nlcst]: https://github.com/syntax-tree/mdast-util-to-nlcst

[xss]: https://en.wikipedia.org/wiki/Cross-site_scripting

[parse-english]: https://github.com/wooorm/parse-english

[parse-latin]: https://github.com/wooorm/parse-latin

[parse-dutch]: https://github.com/wooorm/parse-dutch
