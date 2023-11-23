
const DefaultTransform = (list, count) => list.reduceRight((m, d, i) => ({...m, ...Object.keys(d).reduce((mm, dd) => ({...mm, [`${list.length - i}.${dd}`]: d[dd]}), {})}), {'no.': count})

export const runSpider = async ({
  workers,
  url,
  spiders,
  transform = DefaultTransform,
  limit = Infinity,
  ...options
}, g, util = {}) => {

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
  let count = 0

  await worker({
    event: 'start',
    data: {
      startAt,
    },
  })

  try {

    const br = runQueries(g, spiders, options)

    for await (const [line, ...d] of br(url)) {
      count = line.i
      const data = transform(d, count, util)
      await worker({
        event: 'item',
        data: {
          count,
          data,
        },
      })
      if (count >= limit) {
        break
      }
    }
  } finally {
    const endAt = Date.now()

    await worker({
      event: 'end',
      data: {
        startAt,
        endAt,
        count,
      },
    })

  }
}

export const request = (g, query, options = {}) => async function* (url) {

  const {
    requestOptions = {},
  } = options

  let next = url
  let i = 1

  do {
    const variables = { url: {
      ...requestOptions,
      url: next,
    } }

    const response = await g({
      query,
      variables,
    })

    if (response.errors) {
      throw response.errors[0]
    }

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

export const runQueries = (g, queries = [], options) => {
  let funcs = queries.map(d => request(g, d, options))

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
