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
const syncCache: Map<string, Parser> = new Map()
const asyncCache: Map<string, Promise<Parser>> = new Map()

export function clearCache(): void {
  syncCache.clear()
  asyncCache.clear()
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
  let result
  const parentDir = Path.dirname(file)
  const extname = Path.extname(file)
  const cacheKey = `${parentDir}${Path.delimiter}${extname}`
  result = syncCache.get(cacheKey)

  if (!result) {
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

      const config = babel.loadOptionsSync({
        filename: file,
        cwd: Path.dirname(file),
        rootMode: 'upward-optional',
      })
      result = createParserFromConfig(parser, config)
    } catch (error) {
      result =
        extname === '.tsx' ? tsxParser : extname === '.ts' ? tsParser : jsParser
    }
    syncCache.set(cacheKey, result)
    asyncCache.set(cacheKey, Promise.resolve(result))
  }
  return !options || isEmpty(options) ? result : result.bindParserOpts(options)
}

export async function getParserAsync(
  file: string,
  options?: ParserOptions
): Promise<Parser> {
  let promise
  if (/\.ts$/.test(file)) promise = Promise.resolve(tsParser)
  else if (/\.tsx$/.test(file)) promise = Promise.resolve(tsxParser)
  else {
    const parentDir = Path.dirname(file)
    const extname = Path.extname(file)
    const cacheKey = `${parentDir}${Path.delimiter}${extname}`

    promise = asyncCache.get(cacheKey)

    if (!promise) {
      promise = (async (): Promise<Parser> => {
        let result
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

          const config = await babel.loadOptionsAsync({
            filename: file,
            cwd: parentDir,
          })
          result = createParserFromConfig(parser, config)
        } catch (error) {
          result =
            extname === '.tsx'
              ? tsxParser
              : extname === '.ts'
              ? tsParser
              : jsParser
        }
        syncCache.set(cacheKey, result)
        return result
      })()
      asyncCache.set(cacheKey, promise)
    }
  }
  const result = await promise
  return !options || isEmpty(options) ? result : result.bindParserOpts(options)
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
