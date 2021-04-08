# babel-parse-wild-code

Provides an easy-to-use API for parsing users' js/ts/tsx files using their project's installed Babel version and config.
This way it won't fail if they're using funky features like the smart pipeline operator. This is a big problem for codemod
tools; for example, `jscodeshift` would choke on the smart pipeline operator unless you pass a custom parser. I want my
codemod tools to just work.

Note: only Babel 7 is currently supported.

`babel-parse-wild-code` also improves performance. Until recently, doing `require('@babel/core').loadOptionsAsync` and passing that config
to a bunch of `require('@babel/core').parseAsync` calls didn't improve performance as expected; `parseAsync` was accidentally re-doing
a lot of the work that had already been done by `loadOptionsAsync`. That bug has been fixed since I reported it, but `babel-parse-wild-code`
works around this for older versions of Babel 7 by extracting the options for `@babel/parser` from the user's Babel config.

If `babel-parse-wild-code` fails to load `@babel/core`, `@babel/parser`, or the Babel config from the user's
project, or the file is ts/tsx, it falls back to parsing with reasonable default options.

# API

## `parseSync(file: string, options?: { encoding?: BufferEncoding } & Omit<ParserOptions, 'plugins'>): File`

```ts
import { parseSync } from 'babel-parse-wild-code'
```

Parses the given file synchronously, returning the `File` node.

`encoding` defaults to `utf8`. The remaining options are passed to `@babel/parser`'s `parse` function.

## `parseAsync(file: string, options?: { encoding?: BufferEncoding } & Omit<ParserOptions, 'plugins'>): Promise<File>`

```ts
import { parseAsync } from 'babel-parse-wild-code'
```

Parses the given file asynchronously, returning a `Promise` that will resolve to the `File` node.

`encoding` defaults to `utf8`. The remaining options are passed to `@babel/parser`'s `parse` function.

## `clearCache(): void`

Instances of `@babel/core`, `@babel/parser` and parser options are cached on a per-directory basis.
Calling `clearCache()` clears this cache, and deletes instances of `@babel/core` and `@babel/parser`
from `require.cache`.

You should probably do this before any bulk parsing operation. It would be nice to bust the cache
automatically when the user's Babel version or config changes, but setting up the watchers would be
complicated. Clearing the cache before you parse a bunch of files is simpler and won't have a huge
impact on performance.

## `getParserSync(file: string, options?: Omit<ParserOptions, 'plugins'>): Parser`

```ts
import { getParserSync } from 'babel-parse-wild-code'
```

Gets a fully-configured parser for the given file synchronously.

`options` is additional options for `@babel/parser`'s `parse` function. For example when working
with `jscodeshift` or `recast`, you should pass `{ tokens: true }`.

## `getParserAsync(file: string, options?: Omit<ParserOptions, 'plugins'>): Promise<Parser>`

```ts
import { getParserSync } from 'babel-parse-wild-code'
```

Gets a fully-configured parser for the given file asynchronously.

`options` is additional options for `@babel/parser`'s `parse` function. For example when working
with `jscodeshift` or `recast`, you should pass `{ tokens: true }`.

## `class Parser`

```ts
import { Parser } from 'babel-parse-wild-code'
```

Type defs:

```ts
import * as defaultBabelParser from '@babel/parser'

type BabelParser = Pick<typeof defaultBabelParser, 'parse' | 'parseExpression'>

export class Parser {
  readonly babelParser: BabelParser
  readonly parserOpts: ParserOptions

  constructor(babelParser: BabelParser, parserOpts: ParserOptions)
  parse(code: string, parserOpts?: ParserOptions): t.File
  parseExpression(code: string, parserOpts?: ParserOptions): t.Expression
  bindParserOpts(parserOpts: ParserOptions): Parser
}
```

## `tsParser`

```ts
import { tsParser } from 'babel-parse-wild-code'
```

The parser used for `.ts` files.

## `tsxParser`

```ts
import { tsxParser } from 'babel-parse-wild-code'
```

The parser used for `.tsx` files.

## `jsParser`

```ts
import { jsParser } from 'babel-parse-wild-code'
```

The fallback parser used for parsing `.js` files when `babel-parse-wild-code` failed to load Babel modules or config for the file's directory.
