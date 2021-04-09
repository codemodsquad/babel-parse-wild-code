/* eslint-env mocha */

import * as Path from 'path'
import { parseSync, parseAsync, getParserSync, clearCache } from '../src'
import fs from 'fs-extra'
import { expect } from 'chai'
import os from 'os'

const fixturesDir = Path.resolve(__dirname, 'fixtures')

describe('parseSync', function () {
  this.timeout(10000)

  beforeEach(() => {
    clearCache()
  })

  it(`falls back to sensible defaults if babel not found`, async function () {
    const dir = os.tmpdir()
    const file = Path.join(dir, 'test.js')
    await fs.writeFile(file, `const foo = bar |> baz`, 'utf8')
    expect(parseSync(file).type).to.equal('File')
  })
  it('works', () => {
    expect(
      parseSync(Path.join(fixturesDir, 'babelPipeline', 'test.js')).type
    ).to.equal('File')
  })
  it('works on ts file', () => {
    expect(
      parseSync(Path.join(fixturesDir, 'babelPipeline', 'test.ts')).type
    ).to.equal('File')
  })
  it('works on tsx file', () => {
    expect(
      parseSync(Path.join(fixturesDir, 'babelPipeline', 'test.tsx')).type
    ).to.equal('File')
  })
  it('passing options works for js file', function () {
    expect(parseSync(Path.join(fixturesDir, 'babelPipeline', 'test.js')).tokens)
      .not.to.exist
    expect(
      parseSync(Path.join(fixturesDir, 'babelPipeline', 'test.js'), {
        tokens: true,
      }).tokens
    ).to.exist
  })
  it('passing options works for ts file', function () {
    expect(parseSync(Path.join(fixturesDir, 'babelPipeline', 'test.ts')).tokens)
      .not.to.exist
    expect(
      parseSync(Path.join(fixturesDir, 'babelPipeline', 'test.ts'), {
        tokens: true,
      }).tokens
    ).to.exist
  })
})
describe(`parseAsync`, function () {
  this.timeout(10000)

  it(`falls back to sensible defaults if babel not found`, async function () {
    const dir = os.tmpdir()
    const file = Path.join(dir, 'test.js')
    await fs.writeFile(file, `const foo = bar |> baz`, 'utf8')
    expect((await parseAsync(file)).type).to.equal('File')
  })
  it('works', async () => {
    expect(
      (await parseAsync(Path.join(fixturesDir, 'babelPipeline', 'test.js')))
        .type
    ).to.equal('File')
  })
  it('works on ts file', async () => {
    expect(
      (await parseAsync(Path.join(fixturesDir, 'babelPipeline', 'test.ts')))
        .type
    ).to.equal('File')
  })
  it('works on tsx file', async () => {
    expect(
      (await parseAsync(Path.join(fixturesDir, 'babelPipeline', 'test.tsx')))
        .type
    ).to.equal('File')
  })
  it('passing options works for js file', async () => {
    expect(
      (await parseAsync(Path.join(fixturesDir, 'babelPipeline', 'test.js')))
        .tokens
    ).not.to.exist
    expect(
      (
        await parseAsync(Path.join(fixturesDir, 'babelPipeline', 'test.js'), {
          tokens: true,
        })
      ).tokens
    ).to.exist
  })
  it('passing options works for ts file', async () => {
    expect(
      (await parseAsync(Path.join(fixturesDir, 'babelPipeline', 'test.ts')))
        .tokens
    ).not.to.exist
    expect(
      (
        await parseAsync(Path.join(fixturesDir, 'babelPipeline', 'test.ts'), {
          tokens: true,
        })
      ).tokens
    ).to.exist
  })
})

describe(`Parser`, function () {
  describe(`.parse`, function () {
    it(`passing options works`, async function () {
      const file = Path.join(fixturesDir, 'babelPipeline', 'test.ts')
      const parser = getParserSync(file)
      expect(parser.parse(await fs.readFile(file, 'utf8')).tokens).not.to.exist
      expect(
        parser.parse(await fs.readFile(file, 'utf8'), { tokens: true }).tokens
      ).to.exist
    })
  })
  describe(`.parseExpression`, function () {
    it(`passing options works`, async function () {
      const file = Path.join(fixturesDir, 'babelPipeline', 'test.ts')
      const parser = getParserSync(file)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((parser.parseExpression('foo(bar)') as any).tokens).not.to.exist
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (parser.parseExpression('foo(bar)', { tokens: true }) as any).tokens
      ).to.exist
    })
  })
})
