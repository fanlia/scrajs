
import { g } from '../src/graphql.js'
import { getWorkers } from '../workers/index.js'
import * as util from './util.js'

class MemoryQueue {

  constructor () {
    this.queues = []
  }

  async length () {
    return this.queues.length
  }
  async pop () {
    return this.queues.pop()
  }
  async push (list = []) {
    this.queues.push(...list.reverse())
  }
}

// test MemoryQueue
// const mq = new MemoryQueue()
// mq.push([1, 2, 3])
// mq.push([])
// mq.push([4, 5, 6])
// console.log(mq.queues, [3, 2, 1, 6, 5, 4])

export const run = async ({
  context,
  spiders,
  workers,
  queues = new MemoryQueue(),
}) => {

  spiders = await spiders({ env: context, util })
  workers = await getWorkers(workers)

  const worker = async (data) => {
    const message = {
        ...data,
        createdAt: new Date(),
    }
    for (const w of workers) {
      await w(message, context)
    }
  }

  await queues.push(spiders)

  const startAt = Date.now()

  await worker({
    event: 'start',
    data: {
      startAt,
    },
  })

  let count = 0

  try {

    while (true) {

      const length = await queues.length()

      if (length <= 0) break

      await worker({
        event: 'length',
        data: {
          length,
        },
      })

      const { name, query, variables, parse, env = {} } = await queues.pop()

      if (!parse) break

      const response = await g({
        query,
        variables,
      })

      const tools = {
        env,
        util,
      }

      let localspiders = []

      for await (const { type, data } of parse(response, tools)) {
        if (type === 'data' && data) {
          count++
          await worker({
            event: 'item',
            data: {
              name,
              count,
              data,
            },
          })
        } else if (type === 'request') {
          localspiders.push(data)
        }
      }

      await queues.push(localspiders)
    }

  } finally {
    const endAt = Date.now()

    await worker({
      event: 'end',
      data: {
        count,
        startAt,
        endAt,
      },
    })

  }
}

export const request = (query) => async function* (url) {

  let next = url
  let i = 1

  do {
    const response = await g({
      query,
      variables: { url: next },
    })

    const page = response.data.page

    if (!page) {
      break
    }

    if (Array.isArray(page.children)) {
      for (const data of page.children) {
        yield data
      }
      next = page.next
    } else {
      yield page
      next = null
    }

  } while (next)
}

const delay = (wait = 1000) => new Promise(resolve => setTimeout(resolve, wait))

const Base = () => {
  let i = 1
  return async function* (url) {
    await delay(100)
    yield [{i: i++}]
  }
}

export const runQueries = (queries = []) => {
  let funcs = queries.map(request)

  return funcs.reduceRight((m, f) => {
    return async function* (url) {
      for await (const d of f(url)) {
        for await (const dd of m(d.url)) {
          yield [...dd, d]
        }
      }
    }
  }, Base())
}
