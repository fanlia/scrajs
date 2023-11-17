
import { g } from '../src/graphql.js'
import { getWorkers } from '../workers/index.js'
import * as util from './util.js'

export const run = async ({
  url,
  spiders,
  workers,
  transform = (d) => d[1],
}) => {

  workers = await getWorkers(workers)

  const worker = async (data) => {
    const message = {
        ...data,
        createdAt: new Date(),
    }
    for (const w of workers) {
      await w(message)
    }
  }

  const startAt = Date.now()

  await worker({
    event: 'start',
    data: {
      startAt,
    },
  })

  try {

    const br = runQueries(spiders)

    for await (const d of br(url)) {
      const data = transform(d, util)
      await worker({
        event: 'item',
        data: {
          data,
        },
      })
    }
  } finally {
    const endAt = Date.now()

    await worker({
      event: 'end',
      data: {
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
      if (page.next !== next) {
        next = page.next
      }
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
