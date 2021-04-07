/* eslint-disable @typescript-eslint/no-explicit-any */

import * as t from '@babel/types'
import * as Path from 'path'
import _resolve from 'resolve'
import { promisify } from 'util'
import { parse as defaultParse, ParserOptions } from '@babel/parser'
import { readFile as _readFile, readFileSync } from 'fs'
const readFile = promisify(_readFile)

export type Parser = {
  parse: (code: string) => t.File
  parserOpts: ParserOptions
}

function createParser(parserOpts: ParserOptions): Parser {
  return {
    parserOpts,
    parse: (code: string): t.File => defaultParse(code, parserOpts),
  }
}

const tsParser: Parser = createParser({
  sourceType: 'module',
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  startLine: 1,
  tokens: true,
  plugins: [
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
  ],
})
const tsxParser: Parser = createParser({
  ...tsParser.parserOpts,
  plugins: [...(tsParser.parserOpts.plugins || []), 'jsx'],
})
const jsParser: Parser = createParser({
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

function createParserFromConfig(parser: any, config: any): Parser {
  const { plugins, sourceType } = config
  const opts = {
    parserOpts: { plugins: [], sourceType },
    generatorOpts: {},
  }
  for (const { manipulateOptions } of plugins) {
    manipulateOptions?.(opts, opts.parserOpts)
  }
  return createParser(opts.parserOpts)
}

export function getParserSync(
  file: string,
  options?: Omit<ParserOptions, 'plugins'>
): Parser {
  if (/\.ts$/.test(file)) return tsParser
  if (/\.tsx$/.test(file)) return tsxParser

  const parentDir = Path.dirname(file)

  let result = syncCache.get(parentDir)

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
  return options ? createParser({ ...result.parserOpts, ...options }) : result
}

export async function getParserAsync(
  file: string,
  options?: ParserOptions
): Promise<Parser> {
  if (/\.ts$/.test(file)) return tsParser
  if (/\.tsx$/.test(file)) return tsxParser

  const parentDir = Path.dirname(file)

  let promise = asyncCache.get(parentDir)

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
          cwd: process.cwd(),
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
  const result = await promise
  return options ? createParser({ ...result.parserOpts, ...options }) : result
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
