/* eslint-disable @typescript-eslint/no-explicit-any */

import * as t from '@babel/types'
import * as Path from 'path'
import _resolve from 'resolve'
import { promisify } from 'util'
import { parse as defaultParse, ParserOptions } from '@babel/parser'
import { readFile as _readFile, readFileSync } from 'fs'
const readFile = promisify(_readFile)

export type Parser = {
  parse: (code: string, options?: Omit<ParserOptions, 'plugins'>) => t.File
}

const tsParser = {
  parse: (code: string, options?: Omit<ParserOptions, 'plugins'>): t.File =>
    defaultParse(code, { ...options, plugins: ['typescript'] }),
}

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

function createParser(parser: any, options: any): Parser {
  const { plugins, sourceType } = options
  const opts = {
    parserOpts: { plugins: [], sourceType },
    generatorOpts: {},
  }
  for (const { manipulateOptions } of plugins) {
    manipulateOptions?.(opts, opts.parserOpts)
  }
  return {
    parse: (code: string, options?: Omit<ParserOptions, 'plugins'>): t.File =>
      parser.parse(code, { ...options, ...opts.parserOpts }),
  }
}

export function getParserSync(file: string): Parser {
  if (/\.tsx?$/.test(file)) return tsParser

  const parentDir = Path.dirname(file)

  let result = syncCache.get(parentDir)

  if (result) return result
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

    const options = babel.loadOptionsSync({
      filename: file,
      cwd: Path.dirname(file),
      rootMode: 'upward-optional',
    })
    result = createParser(parser, options)
    syncCache.set(parentDir, result)
    asyncCache.set(parentDir, Promise.resolve(result))
    return result
  } catch (error) {
    error.message = `failed to get babel or config for file ${file}: ${error.message}`
    throw error
  }
}

export async function getParserAsync(file: string): Promise<Parser> {
  if (/\.tsx?$/.test(file)) return tsParser

  const parentDir = Path.dirname(file)

  let result = asyncCache.get(parentDir)

  if (result) return await result
  result = (async (): Promise<Parser> => {
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

      const options = await babel.loadOptionsAsync({
        filename: file,
        cwd: process.cwd(),
      })
      const result = createParser(parser, options)
      syncCache.set(parentDir, result)
      return result
    } catch (error) {
      error.message = `failed to get babel or config for file ${file}: ${error.message}`
      throw error
    }
  })()
  asyncCache.set(parentDir, result)
  return await result
}

export function parseSync(
  file: string,
  { encoding = 'utf8' }: { encoding?: BufferEncoding } = {}
): t.File {
  const parser = getParserSync(file)
  return parser.parse(readFileSync(file, encoding))
}

export async function parseAsync(
  file: string,
  { encoding = 'utf8' }: { encoding?: BufferEncoding } = {}
): Promise<t.File> {
  const parser = await getParserAsync(file)
  return parser.parse(await readFile(file, encoding))
}
