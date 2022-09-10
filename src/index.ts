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

function mergePlugins(
  a: ParserPlugin[] | undefined,
  b: ParserPlugin[] | undefined
): ParserPlugin[] | undefined {
  if (!b) return a
  if (!a) return b
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

export class Parser {
  readonly babelParser: BabelParser
  readonly parserOpts: ParserOptions

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
}

const tsPlugins: ParserPlugin[] = [
  'asyncGenerators',
  'bigInt',
  'classPrivateMethods',
  'classPrivateProperties',
  'classProperties',
  'decorators-legacy',
  'doExpressions',
  'dynamicImport',
  'exportDefaultFrom',
  'exportNamespaceFrom',
  'functionBind',
  'functionSent',
  'importMeta',
  'nullishCoalescingOperator',
  'numericSeparator',
  'objectRestSpread',
  'optionalCatchBinding',
  'optionalChaining',
  ['pipelineOperator', { proposal: 'minimal' }],
  'throwExpressions',
  'typescript',
]

export const tsParser: Parser = new Parser(defaultBabelParser, {
  sourceType: 'module',
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  startLine: 1,
  plugins: tsPlugins,
})
export const tsxParser: Parser = new Parser(defaultBabelParser, {
  ...tsParser.parserOpts,
  plugins: [...tsPlugins, 'jsx'],
})
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
    ['decorators', { decoratorsBeforeExport: false }],
    'doExpressions',
    'dynamicImport',
    'exportDefaultFrom',
    'exportNamespaceFrom',
    'functionBind',
    'functionSent',
    'importMeta',
    'logicalAssignment',
    'nullishCoalescingOperator',
    'numericSeparator',
    'objectRestSpread',
    'optionalCatchBinding',
    'optionalChaining',
    ['pipelineOperator', { proposal: 'minimal' }],
    'throwExpressions',
  ],
})

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

export function getParserSync(file: string, options?: ParserOptions): Parser {
  const parentDir = Path.dirname(file)
  const extname = Path.extname(file)
  const parser = dirParserCache.getSync(
    `${parentDir}${Path.delimiter}${extname}`,
    () => {
      try {
        const babelPath = _resolve.sync('@babel/core', {
          basedir: parentDir,
        })
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const babel = require(babelPath)
        requiredPaths.push(babelPath)

        const parserPath = _resolve.sync('@babel/parser', {
          basedir: parentDir,
        })
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const parser = require(parserPath)
        requiredPaths.push(parserPath)

        const loadOpts = {
          filename: file,
          cwd: Path.dirname(file),
          rootMode: 'upward-optional',
        }
        const partial = babel.loadPartialConfigSync(loadOpts)
        const babelrc = partial.babelrc || partial.config
        const getParser = () => {
          const config = babel.loadOptionsSync(loadOpts)
          return createParserFromConfig(parser, config)
        }
        return babelrc
          ? babelrcParserCache.getSync(
              `${babelrc}${Path.delimiter}${extname}`,
              getParser
            )
          : getParser()
      } catch (error) {
        return extname === '.tsx'
          ? tsxParser
          : extname === '.ts'
          ? tsParser
          : jsParser
      }
    }
  )
  return !options || isEmpty(options) ? parser : parser.bindParserOpts(options)
}

export async function getParserAsync(
  file: string,
  options?: ParserOptions
): Promise<Parser> {
  const parentDir = Path.dirname(file)
  const extname = Path.extname(file)

  const parser = await dirParserCache.getAsync(
    `${parentDir}${Path.delimiter}${extname}`,
    async (): Promise<Parser> => {
      try {
        const babelPath = await resolve('@babel/core', {
          basedir: parentDir,
        })
        const babel = await import(babelPath)
        requiredPaths.push(babelPath)

        const parserPath = await resolve('@babel/parser', {
          basedir: parentDir,
        })
        const parser = await import(parserPath)
        requiredPaths.push(parserPath)

        const loadOpts = {
          filename: file,
          cwd: parentDir,
          rootMode: 'upward-optional',
        }
        const partial = await babel.loadPartialConfigAsync(loadOpts)
        const babelrc = partial.babelrc || partial.config
        const getParser = async (): Promise<Parser> => {
          const config = await babel.loadOptionsAsync(loadOpts)
          return createParserFromConfig(parser, config)
        }
        return babelrc
          ? await babelrcParserCache.getAsync(
              `${babelrc}${Path.delimiter}${extname}`,
              getParser
            )
          : await getParser()
      } catch (error) {
        return extname === '.tsx'
          ? tsxParser
          : extname === '.ts'
          ? tsParser
          : jsParser
      }
    }
  )
  return !options || isEmpty(options) ? parser : parser.bindParserOpts(options)
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
