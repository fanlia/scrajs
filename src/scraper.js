
import { runSpider } from '../src/request.js'
import { getWorkers } from '../workers/index.js'
import { g } from '../src/graphql.js'
import * as util from '../src/util.js'

export const run = async ({
  workers,
  ...options
}) => {

  workers = await getWorkers(workers)

  const spider = {
    ...options,
    workers,
  }

  return runSpider(spider, g, util)
}
