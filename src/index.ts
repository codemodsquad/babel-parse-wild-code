/* eslint-disable @typescript-eslint/no-explicit-any */

import * as t from '@babel/types'
import * as Path from 'path'
import _resolve from 'resolve'
import { promisify } from 'util'
import * as defaultBabelParser from '@babel/parser'
import { ParserOptions, ParserPlugin } from '@babel/parser'
import { readFile as _readFile, readFileSync } from 'fs'
const readFile = promisify(_readFile)

function isEmpty(obj: any): boolean {
  for (const key in obj) return false
  return true
}

type BabelParser = Pick<typeof defaultBabelParser, 'parse' | 'parseExpression'>

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
    return new Parser(this.babelParser, { ...this.parserOpts, ...parserOpts })
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

export function getParserSync(
  file: string,
  options?: Omit<ParserOptions, 'plugins'>
): Parser {
  let result
  if (/\.ts$/.test(file)) result = tsParser
  else if (/\.tsx$/.test(file)) result = tsxParser
  else {
    const parentDir = Path.dirname(file)
    result = syncCache.get(parentDir)

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
        result = jsParser
      }
      syncCache.set(parentDir, result)
      asyncCache.set(parentDir, Promise.resolve(result))
    }
  }
  return !options || isEmpty(options) ? result : result.bindParserOpts(options)
}

export async function getParserAsync(
  file: string,
  options?: Omit<ParserOptions, 'plugins'>
): Promise<Parser> {
  let promise
  if (/\.ts$/.test(file)) promise = Promise.resolve(tsParser)
  else if (/\.tsx$/.test(file)) promise = Promise.resolve(tsxParser)
  else {
    const parentDir = Path.dirname(file)

    promise = asyncCache.get(parentDir)

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
          result = jsParser
        }
        syncCache.set(parentDir, result)
        return result
      })()
      asyncCache.set(parentDir, promise)
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
  }: { encoding?: BufferEncoding } & Omit<ParserOptions, 'plugins'> = {}
): t.File {
  const parser = getParserSync(file, options)
  return parser.parse(readFileSync(file, encoding))
}

export async function parseAsync(
  file: string,
  {
    encoding = 'utf8',
    ...options
  }: { encoding?: BufferEncoding } & Omit<ParserOptions, 'plugins'> = {}
): Promise<t.File> {
  const parser = await getParserAsync(file, options)
  return parser.parse(await readFile(file, encoding))
}
