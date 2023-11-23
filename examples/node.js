
import * as demo from '../spiders/demo.js'
import { run } from '../src/lib.js'

await run({
  ...demo,
  workers: ['log'],
})
