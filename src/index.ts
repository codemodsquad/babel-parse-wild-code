import * as t from '@babel/types'
import * as Path from 'path'
import _resolve from 'resolve'
import { promisify } from 'util'
import * as defaultBabelParser from '@babel/parser'
import { ParserOptions, ParserPlugin } from '@babel/parser'
import { readFile as _readFile, readFileSync } from 'fs'
const readFile = promisify(_readFile)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isEmpty(obj: any): boolean {
  for (const key in obj) return false
  return true
}

type BabelParser = Pick<typeof defaultBabelParser, 'parse' | 'parseExpression'>

function pluginName(p: ParserPlugin): string {
  return typeof p === 'string' ? p : p[0]
}

function pluginOpts(p: ParserPlugin): any {
  return typeof p === 'string' ? {} : p[1]
}

function arePluginsEqual(a: ParserPlugin, b: ParserPlugin): boolean {
  return (
    pluginName(a) === pluginName(b) &&
    t.shallowEqual(pluginOpts(a), pluginOpts(b))
  )
}

function mergePlugins(
  a: ParserPlugin[] | undefined,
  b: ParserPlugin[] | undefined
): ParserPlugin[] | undefined {
  if (!b) return a
  if (!a) return b

  if (b.every((bp) => a.find((ap) => arePluginsEqual(ap, bp)))) return a

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map: Map<string, any> = new Map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    a.map((p: ParserPlugin): [string, any] =>
      Array.isArray(p) ? p : [p, undefined]
    )
  )
  for (const p of b) {
    if (Array.isArray(p)) map.set(p[0], { ...map.get(p[0]), ...p[1] })
    else if (!map.has(p)) map.set(p, map.get(p))
  }
  return [...map.entries()].map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: [string, any]) => (e[1] === undefined ? e[0] : e)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any
}

function removePlugins(
  a: ParserPlugin[] | undefined,
  b: string[]
): ParserPlugin[] | undefined {
  if (!b.some((plugin) => a?.some((p) => pluginName(p) === plugin))) {
    return a
  }
  return a?.filter((p) => !b.includes(pluginName(p)))
}

export class Parser {
  readonly babelParser: BabelParser
  readonly parserOpts: ParserOptions

  _forJs: Parser | undefined
  _forJsx: Parser | undefined
  _forTs: Parser | undefined
  _forTsx: Parser | undefined
  _forDts: Parser | undefined

  constructor(babelParser: BabelParser, parserOpts: ParserOptions) {
    this.babelParser = babelParser
    this.parserOpts = parserOpts
  }

  parse(code: string, parserOpts?: ParserOptions): t.File {
    return parserOpts
      ? this.bindParserOpts(parserOpts).parse(code)
      : this.babelParser.parse(code, this.parserOpts)
  }

  parseExpression(code: string, parserOpts?: ParserOptions): t.Expression {
    return parserOpts
      ? this.bindParserOpts(parserOpts).parseExpression(code)
      : this.babelParser.parseExpression(code, this.parserOpts)
  }

  bindParserOpts(parserOpts: ParserOptions): Parser {
    return new Parser(this.babelParser, {
      ...this.parserOpts,
      ...parserOpts,
      plugins: mergePlugins(this.parserOpts.plugins, parserOpts.plugins),
    })
  }

  mergePlugins(...plugins: ParserPlugin[]): Parser {
    const merged = mergePlugins(this.parserOpts.plugins, plugins)
    return merged === this.parserOpts.plugins
      ? this
      : new Parser(this.babelParser, {
          ...this.parserOpts,
          plugins: merged,
        })
  }

  removePlugins(...plugins: string[]): Parser {
    const removed = removePlugins(this.parserOpts.plugins, plugins)
    return removed === this.parserOpts.plugins
      ? this
      : new Parser(this.babelParser, {
          ...this.parserOpts,
          plugins: removed,
        })
  }

  get forJs(): Parser {
    return (
      this._forJs ||
      (this._forJs = (() => {
        if (
          !this.parserOpts.plugins?.some((p) => pluginName(p) === 'typescript')
        ) {
          return this
        }
        return this.removePlugins(
          'typescript',
          'decorators-legacy'
        ).mergePlugins(['flow', { all: true }], 'flowComments', 'jsx', [
          'decorators',
          { decoratorsBeforeExport: false },
        ])
      })())
    )
  }

  get forJsx(): Parser {
    return (
      this._forJsx ||
      (this._forJsx = (() => {
        const { plugins } = this.parserOpts
        if (
          !plugins?.some((p) => pluginName(p) === 'typescript') &&
          plugins?.some((p) => pluginName(p) === 'jsx')
        ) {
          return this
        }
        return this.removePlugins(
          'typescript',
          'decorators-legacy'
        ).mergePlugins(['flow', { all: true }], 'flowComments', 'jsx', [
          'decorators',
          { decoratorsBeforeExport: false },
        ])
      })())
    )
  }

  get forTs(): Parser {
    return (
      this._forTs ||
      (this._forTs = (() => {
        const { plugins } = this.parserOpts
        if (
          plugins?.some(
            (p) => pluginName(p) === 'typescript' && !pluginOpts(p)?.dts
          ) &&
          !plugins?.some((p) => pluginName(p) === 'jsx')
        ) {
          return this
        }
        return this.removePlugins(
          'flow',
          'flowComments',
          'decorators',
          'jsx'
        ).mergePlugins(['typescript', { dts: false }], 'decorators-legacy')
      })())
    )
  }

  get forTsx(): Parser {
    return (
      this._forTsx ||
      (this._forTsx = (() => {
        const { plugins } = this.parserOpts
        if (
          plugins?.some(
            (p) => pluginName(p) === 'typescript' && !pluginOpts(p)?.dts
          ) &&
          plugins?.some((p) => pluginName(p) === 'jsx')
        ) {
          return this
        }
        return this.removePlugins(
          'flow',
          'flowComments',
          'decorators'
        ).mergePlugins(
          ['typescript', { disallowAmbiguousJSXLike: true, dts: false }],
          'decorators-legacy',
          'jsx'
        )
      })())
    )
  }

  get forDts(): Parser {
    return (
      this._forDts ||
      (this._forDts = (() => {
        if (
          this.parserOpts.plugins?.some(
            (p) => pluginName(p) === 'typescript' && pluginOpts(p)?.dts
          )
        ) {
          return this
        }
        return this.removePlugins(
          'flow',
          'flowComments',
          'decorators',
          'jsx'
        ).mergePlugins(['typescript', { dts: true }], 'decorators-legacy')
      })())
    )
  }

  forExtension(e: string): Parser {
    if (/(\.|^)([cm]?jsx)$/i.test(e)) return this.forJsx
    if (/(\.|^)([cm]?jsx?(\.flow)?)$/i.test(e)) return this.forJs
    if (/(\.|^)d\.ts$/i.test(e)) return this.forDts
    if (/(\.|^)[cm]?tsx$/i.test(e)) return this.forTsx
    if (/(\.|^)[cm]?ts$/i.test(e)) return this.forTs
    return this
  }
}

export const jsParser: Parser = new Parser(defaultBabelParser, {
  sourceType: 'module',
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  startLine: 1,
  plugins: [
    ['flow', { all: true }],
    'flowComments',
    'jsx',
    'asyncGenerators',
    'bigInt',
    'classProperties',
    'classPrivateProperties',
    'classPrivateMethods',
    'classStaticBlock',
    'dynamicImport',
    'exportNamespaceFrom',
    'exportDefaultFrom',
    'functionSent',
    'importMeta',
    'logicalAssignment',
    'moduleStringNames',
    'nullishCoalescingOperator',
    'numericSeparator',
    'objectRestSpread',
    'optionalCatchBinding',
    'optionalChaining',
    'privateIn',
    'topLevelAwait',
  ],
})
export const jsxParser: Parser = jsParser

export const tsParser: Parser = jsParser.forTs
export const tsxParser: Parser = jsParser.forTsx
export const dtsParser: Parser = jsParser.forDts

function defaultParser(extname: string): Parser {
  return jsParser.forExtension(extname)
}

const resolve: (
  id: string,
  opts: _resolve.AsyncOpts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => Promise<string> = promisify(_resolve as any)

const requiredPaths: string[] = []

class Cache<K, V> {
  syncCache: Map<K, V> = new Map()
  asyncCache: Map<K, Promise<V>> = new Map()

  getSync(key: K, fetch: () => V): V {
    let result = this.syncCache.get(key)
    if (!result) {
      result = fetch()
      this.syncCache.set(key, result)
      this.asyncCache.set(key, Promise.resolve(result))
    }
    return result
  }

  getAsync(key: K, fetch: () => Promise<V>): Promise<V> {
    let result = this.asyncCache.get(key)
    if (!result) {
      result = fetch()
      this.asyncCache.set(key, result)
      result.then((value) => {
        // check if cache was cleared before this point
        if (this.asyncCache.get(key) === result) {
          this.syncCache.set(key, value)
        }
      })
    }
    return result
  }

  clear() {
    this.syncCache.clear()
    this.asyncCache.clear()
  }
}

const dirParserCache = new Cache<string, Parser>()
const babelrcParserCache = new Cache<string, Parser>()

export function clearCache(): void {
  dirParserCache.clear()
  babelrcParserCache.clear()
  for (const path of requiredPaths) {
    delete require.cache[path]
  }
  requiredPaths.length = 0
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createParserFromConfig(babelParser: BabelParser, config: any): Parser {
  const { plugins, sourceType } = config
  const opts = {
    parserOpts: { plugins: [], sourceType },
    generatorOpts: {},
  }
  for (const { manipulateOptions } of plugins) {
    manipulateOptions?.(opts, opts.parserOpts)
  }
  return new Parser(babelParser, opts.parserOpts)
}

function getExtname(file: string): string {
  return /(\.d\.ts|\.js\.flow|\.[^.]+)$/i.exec(file)?.[1] || ''
}

export function getParserSync(file: string, options?: ParserOptions): Parser {
  file = Path.resolve(file)
  const parentDir = Path.dirname(file)
  const extname = getExtname(file)
  const parser = dirParserCache.getSync(
    `${parentDir}${Path.delimiter}${extname}`,
    () => {
      try {
        const babelPath = _resolve.sync('@babel/core', {
          basedir: parentDir,
        })
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const babel = require(/* webpackIgnore: true */ babelPath)
        requiredPaths.push(babelPath)

        let parser: typeof defaultBabelParser
        try {
          const parserPath = _resolve.sync('@babel/parser', {
            basedir: parentDir,
          })
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          parser = require(/* webpackIgnore: true */ parserPath)
          requiredPaths.push(parserPath)
        } catch (error) {
          parser = defaultBabelParser
        }

        const loadOpts = {
          filename: file,
          cwd: Path.dirname(file),
          rootMode: 'upward-optional',
        }
        const partial = babel.loadPartialConfigSync(loadOpts)
        const babelrc = partial.babelrc || partial.config
        const getParser = () => {
          const config = babel.loadOptionsSync(loadOpts)
          const result = createParserFromConfig(parser, config)
          return extname === '.d.ts'
            ? result.bindParserOpts({
                plugins: [['typescript', { dts: true }]],
              })
            : result
        }
        return babelrc
          ? babelrcParserCache.getSync(
              `${babelrc}${Path.delimiter}${extname}`,
              getParser
            )
          : getParser()
      } catch (error) {
        return defaultParser(extname)
      }
    }
  )
  return (
    !options || isEmpty(options) ? parser : parser.bindParserOpts(options)
  ).forExtension(file)
}

export async function getParserAsync(
  file: string,
  options?: ParserOptions
): Promise<Parser> {
  file = Path.resolve(file)
  const parentDir = Path.dirname(file)
  const extname = getExtname(file)

  const parser = await dirParserCache.getAsync(
    `${parentDir}${Path.delimiter}${extname}`,
    async (): Promise<Parser> => {
      try {
        const babelPath = await resolve('@babel/core', {
          basedir: parentDir,
        })
        const babel = await import(/* webpackIgnore: true */ babelPath)
        requiredPaths.push(babelPath)

        let parser: typeof defaultBabelParser
        try {
          const parserPath = await resolve('@babel/parser', {
            basedir: parentDir,
          })
          parser = await import(/* webpackIgnore: true */ parserPath)
          requiredPaths.push(parserPath)
        } catch (error) {
          parser = defaultBabelParser
        }

        const loadOpts = {
          filename: file,
          cwd: parentDir,
          rootMode: 'upward-optional',
        }
        const partial = await babel.loadPartialConfigAsync(loadOpts)
        const babelrc = partial.babelrc || partial.config
        const getParser = async (): Promise<Parser> => {
          const config = await babel.loadOptionsAsync(loadOpts)
          const result = createParserFromConfig(parser, config)
          return extname === '.d.ts'
            ? result.bindParserOpts({
                plugins: [['typescript', { dts: true }]],
              })
            : result
        }
        return babelrc
          ? await babelrcParserCache.getAsync(
              `${babelrc}${Path.delimiter}${extname}`,
              getParser
            )
          : await getParser()
      } catch (error) {
        return defaultParser(extname)
      }
    }
  )
  return (
    !options || isEmpty(options) ? parser : parser.bindParserOpts(options)
  ).forExtension(file)
}

export function parseSync(
  file: string,
  {
    encoding = 'utf8',
    ...options
  }: { encoding?: BufferEncoding } & ParserOptions = {}
): t.File {
  const parser = getParserSync(file, options)
  return parser.parse(readFileSync(file, encoding))
}

export async function parseAsync(
  file: string,
  {
    encoding = 'utf8',
    ...options
  }: { encoding?: BufferEncoding } & ParserOptions = {}
): Promise<t.File> {
  const parser = await getParserAsync(file, options)
  return parser.parse(await readFile(file, encoding))
}
