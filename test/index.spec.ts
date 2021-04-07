/* eslint-env mocha */

import * as Path from 'path'
import { parseSync, parseAsync } from '../src'
import { spawn } from 'promisify-child-process'

const fixturesDir = Path.resolve(__dirname, 'fixtures')

before(async function () {
  this.timeout(120000)
  await spawn('yarn', {
    cwd: Path.join(fixturesDir, 'babelPipeline'),
    stdio: 'inherit',
  })
})

describe('parseSync', function () {
  this.timeout(10000)

  it('works', async () => {
    parseSync(Path.join(fixturesDir, 'babelPipeline', 'test.js'))
  })
  it('works on ts file', async () => {
    parseSync(Path.join(fixturesDir, 'babelPipeline', 'test.ts'))
  })
})
describe(`parseAsync`, function () {
  this.timeout(10000)

  it('works', async () => {
    await parseAsync(Path.join(fixturesDir, 'babelPipeline', 'test.js'))
  })
  it('works on ts file', async () => {
    await parseAsync(Path.join(fixturesDir, 'babelPipeline', 'test.ts'))
  })
})
