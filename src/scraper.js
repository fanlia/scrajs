
import UserAgent from 'user-agents'
import { g } from '../src/graphql.js'
import { getWorkers } from '../workers/index.js'
import * as util from './util.js'

export const run = async ({
  workers,
  url,
  spiders,
  transform = (list) => list.reduceRight((m, d, i) => ({...m, ...Object.keys(d).reduce((mm, dd) => ({...mm, [`${list.length - i}.${dd}`]: d[dd]}), {})}), {}),
  ...options
}) => {

  const ua = new UserAgent().toString()

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

    const br = runQueries(spiders, {
      ...options,
      ua,
    })

    for await (const [line, ...d] of br(url)) {
      const count = line.i
      const data = transform(d, util)
      await worker({
        event: 'item',
        data: {
          count,
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

export const request = (query, options = {}) => async function* (url) {

  const {
    ua,
    requestOptions = {},
  } = options

  const {
    headers = {},
    proxy,
  } = requestOptions

  const headersWithUA = {
    ...headers, 
    'User-Agent': headers['User-Agent'] || ua,
  }

  let next = url
  let i = 1

  do {
    const variables = { url: {
      url: next,
      headers: headersWithUA,
      proxy,
    } }

    const response = await g({
      query,
      variables,
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

const Base = (options = {}) => {
  let i = 1
  return async function* (url) {
    await delay(options.delay || 100)
    yield [{i: i++}]
  }
}

export const runQueries = (queries = [], options) => {
  let funcs = queries.map(d => request(d, options))

  return funcs.reduceRight((m, f) => {
    return async function* (url) {
      for await (const d of f(url)) {
        for await (const dd of m(d.url)) {
          yield [...dd, d]
        }
      }
    }
  }, Base(options))
}
