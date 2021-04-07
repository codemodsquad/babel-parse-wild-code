# @codemodsquad/parse-with-babel

Provides an easy-to-use API for parsing users' js/ts/tsx files using their project's installed Babel version and config.
This way it won't fail if they're using funky features like the smart pipeline operator. This is a big problem for codemod
tools; for example, `jscodeshift` would choke on the smart pipeline operator unless you pass a custom parser. I want my
codemod tools to just work.

If `@codemodsquad/parse-with-babel` fails to load `@babel/core`, `@babel/parser`, or the Babel config from the user's
project, or the file is ts/tsx, it falls back to parsing with reasonable default options.

# API

## `parseSync(file: string, options?: { encoding?: BufferEncoding } & Omit<ParserOptions, 'plugins'>): File`

```ts
import { parseSync } from '@codemodsquad/parse-with-babel'
```

Parses the given file synchronously, returning the `File` node.

`encoding` defaults to `utf8`. The remaining options are passed to `@babel/parser`'s `parse` function.

## `parseAsync(file: string, options?: { encoding?: BufferEncoding } & Omit<ParserOptions, 'plugins'>): Promise<File>`

```ts
import { parseAsync } from '@codemodsquad/parse-with-babel'
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

## `type Parser`

```ts
import { type Parser } from '@codemodsquad/parse-with-babel'
```

```ts
export type Parser = {
  parserOpts: ParserOptions
  parse: (code: string) => t.File
}
```

`options` is additional options for `@babel/parser`'s `parse` function. For example when working
with `jscodeshift` or `recast`, you should pass `{ tokens: true }`.

## `getParserSync(file: string, options?: Omit<ParserOptions, 'plugins'>): Parser`

```ts
import { getParserSync } from '@codemodsquad/parse-with-babel'
```

Gets a fully-configured parser for the given file synchronously.

## `getParserAsync(file: string, options?: Omit<ParserOptions, 'plugins'>): Promise<Parser>`

```ts
import { getParserSync } from '@codemodsquad/parse-with-babel'
```

Gets a fully-configured parser for the given file asynchronously.
