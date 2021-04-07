# @codemodsquad/parse-with-babel

One of the challenges of making codemod tools is tolerating the wide variety of JS syntaxes users' code might be written in.
They may be using `@babel/plugin-proposal-pipeline-operator`, which allows them to choose between three different syntax proposals.
They may be using a newer version of Babel than was available when you released your codemod.

Basically you need to load the version of Babel they have installed in their project, and load their project's Babel config.
This presents another snag: until issues I reported recently were fixed, parsing a bunch of files was slow even if you fully preload
the Babel config, because `@babel/core` was accidentally re-doing config-loading operations on each `parse*` call in that case.

So this package presents an easy-to-use API for loading the installed version of `@babel/parser` in the user's project, loading their
Babel config, and fully resolving the parser options.

If loading stuff from the user's directory fails for any reason, it falls back to `@babel/parser` from this package's own dependencies
with reasonable default options (copied from https://github.com/facebook/jscodeshift/blob/master/parser/babylon.js)

# API

## `parseSync(file: string, options?: { encoding?: BufferEncoding }): File`

```ts
import { parseSync } from '@codemodsquad/parse-with-babel'
```

Parses the given file synchronously, returning the `File` node.

`encoding` defaults to `utf8`.

## `parseAsync(file: string, options?: { encoding?: BufferEncoding }): Promise<File>`

```ts
import { parseAsync } from '@codemodsquad/parse-with-babel'
```

Parses the given file asynchronously, returning a `Promise` that will resolve to the `File` node.

`encoding` defaults to `utf8`.

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
  parse: (code: string, options?: Omit<ParserOptions, 'plugins'>) => t.File
}
```

`options` is additional options for `@babel/parser`'s `parse` function. For example when working
with `jscodeshift` or `recast`, you should pass `{ tokens: true }`.

## `getParserSync(file: string): Parser`

```ts
import { getParserSync } from '@codemodsquad/parse-with-babel'
```

Gets a fully-configured parser for the given file synchronously.

## `getParserAsync(file: string): Promise<Parser>`

```ts
import { getParserSync } from '@codemodsquad/parse-with-babel'
```

Gets a fully-configured parser for the given file asynchronously.
