
import { makeExecutableSchema } from '@graphql-tools/schema'
import { graphql } from 'graphql'

import axios from 'axios'
import chardet from 'chardet'
import * as cheerio from 'cheerio'
import { pptr, bm } from './pptr.js'

export const typeDefs = `

scalar JSON

type HTML {
  child(selector: String! move: [RelativeType]): HTML
  children(selector: String! move: [RelativeType]): [HTML]
  text(selector: String move: [RelativeType]): String
  texts(selector: String move: [RelativeType]): [String]
  html(selector: String move: [RelativeType] strips: [String]): String
  htmls(selector: String move: [RelativeType] strips: [String]): [String]
  attr(selector: String move: [RelativeType] name: String!): String
  attrs(selector: String move: [RelativeType] name: String!): [String]
  url(selector: String move: [RelativeType] name: String = "href"): String
  urls(selector: String move: [RelativeType] name: String = "href"): [String]
  page(selector: String move: [RelativeType] name: String = "href" extraOptions: JSON): HTML
  pages(selector: String move: [RelativeType] name: String = "href" extraOptions: JSON): [HTML]
  pptr(selector: String move: [RelativeType] name: String = "href" extraOptions: JSON): HTML
  pptrs(selector: String move: [RelativeType] name: String = "href" extraOptions: JSON): [HTML]
  show(selector: String move: [RelativeType]): JSON
}

enum DirectionEnum { parent next prev }

input RelativeType {
  direction: DirectionEnum!
  selector: String
}

type Query {
  page(url: JSON!): HTML
  pptr(url: JSON!): HTML
  puppeteer(url: JSON! script: String): JSON
  request(url: JSON!): JSON
  echo(data: JSON!): JSON
  browser_list(id: [String!]): [JSON]
}

input FetchInput {
  url: String!
  options: JSON
  responseType: String = "text"
}

type Mutation {
  browser_open(id: String! url: JSON!): String
  browser_close(id: String!): Boolean
  browser_run(id: String! script: String!): JSON
  browser_fetch(id: String! args: FetchInput!): JSON
  browser_closeall: Boolean
}
`
const getRequest = (req) => {
  const ua = req.headers['user-agent'];
  return axios.create({
    headers: {
      'User-Agent': ua,
    }
  })
}
export const resolvers = {
  Query: {
    async echo(_, { data }) {
      console.log({ echo: data })
      return data
    },
    async request(_, { url = {}}, req) {
      const request = getRequest(req)
      const { data, status, statusText, headers } = await request(url)
      return { data, status, statusText, headers }
    },
    async puppeteer(_, { url = {}, script }) {
      return pptr(url, script)
    },
    async page(_, { url = {}}, req) {
      const request = getRequest(req)
      const response = await request(url)
      let html = response.data
      if (typeof html !== 'string') throw new Error('not html page')
      const buf = Buffer.from(html)
      const encoding = chardet.detect(buf)
      if (encoding !== 'UTF-8') {
        const decoder = new TextDecoder(encoding)
        html = decoder.decode(buf)
      }

      const baseUrl = response.config.url
      return html2root(html, baseUrl)
    },
    async pptr(_, { url = {}}) {
      const response = await pptr(url)
      let html = response.data
      const baseUrl = response.config.url
      return html2root(html, baseUrl)
    },
    async browser_list(_, { id }) {
      return bm.list(id)
    },
  },

  Mutation: {
    async browser_open(_, { id, url = {}}) {
      return bm.open(id, url)
    },
    async browser_close(_, { id }) {
      return bm.close(id)
    },
    async browser_run(_, { id, script }) {
      return bm.run(id, script)
    },
    async browser_fetch(_, { id, args }) {
      return bm.fetch(id, args)
    },
    async browser_closeall() {
      return bm.closeall()
    },
  },

  HTML: {
    async child(root, args) {
      return singleHTML('children', root, args)
    },
    async children(root, { selector, move, n }) {
      return find(root, selector, move, n)
    },
    async show(root, { selector, move }) {
      const result = find(root, selector, move)
      .flatMap((childroot) => {
        return find(childroot, '*')
        .map(({ $el, el }) => {
          const className = ($el.attr('class') || '').trim()
          const classList = className.length > 0 ? className.split(/\s+/) : []

          const id = ($el.attr('id') || '').trim()
          const byid = id.length > 0 ? `#${id}` : ''

          const tagName = el.tagName + byid

          let href = ''

          if (el.tagName.toLowerCase() === 'a') {
            const _href = ($el.attr('href') || '').trim()
            if (_href.length > 0) href = `[]`
          }

          const tag = [tagName, ...classList].join('.')

          const text = $el.contents().filter((i, el) => el.type === 'text').map((i, el) => (el.data || '').trim()).toArray().join('')

          const attributes = el.attributes.filter(d => !['id', 'class'].includes(d.name))

          return {
            level: $el.parents().length,
            selector: tag,
            text,
            attributes: attributes.length > 0 ? attributes : '',
          }
        })
      })

      return result
    },
    async text(root, args) {
      return singleHTML('texts', root, args)
    },
    async texts(root, { selector, move, n }) {
      return find(root, selector, move, n).map(({ $el }) => safetrim($el.text()))
    },
    async html(root, args) {
      return singleHTML('htmls', root, args)
    },
    async htmls(root, { selector, move, n, strips = [] }) {
      return find(root, selector, move, n).map(({ $, $el, el }) => {
        const $html = $el.clone().wrap('<root></root>')
        for (const strip of strips) {
          $html.find(strip).remove()
        }
        return safetrim($html.parent().html())
      })
    },
    async attr(root, args) {
      return singleHTML('attrs', root, args)
    },
    async attrs(root, { selector, move, n, name }) {
      return find(root, selector, move, n).map(({ $el }) => safetrim($el.attr(name)))
    },
    async url(root, args) {
      return singleHTML('urls', root, args)
    },
    async urls(root, { selector, move, n, name }) {
      return find(root, selector, move, n).map(({ $el, baseUrl }) => {
        const url = safetrim($el.attr(name))
        return url && resolve(baseUrl, url)
      })
    },
    async page(root, args) {
      return singleHTML('pages', root, args)
    },
    async pages(root, { selector, move, n, name, extraOptions }) {
      return find(root, selector, move, n).map(({ $el, baseUrl }) => {
        const url = safetrim($el.attr(name).trim())
        return url && resolvers.Query.page(null, {
          ...extraOptions,
          url: resolve(baseUrl, url),
        })
      })
    },
    async pptr(root, args) {
      return singleHTML('pptrs', root, args)
    },
    async pptrs(root, { selector, move, n, name, extraOptions }) {
      return find(root, selector, move, n).map(({ $el, baseUrl }) => {
        const url = safetrim($el.attr(name))
        return url && resolvers.Query.pptr(null, {
          ...extraOptions,
          url: resolve(baseUrl, url),
        })
      })
    },
  },
}

const singleHTML = (funcname, root, args) => {
  return resolvers.HTML[funcname](root, {
    ...args,
    n: { to: 1 },
  }).then(items => items[0])
}

function html2root(html, baseUrl) {
  const $ = cheerio.load(html)
  const $el = $.root()
  const el = $el.get(0)
  return { $, $el, baseUrl, el }
}

function resolve(from, to) {
  const resolvedUrl = new URL(to, new URL(from, 'resolve://'));
  if (resolvedUrl.protocol === 'resolve:') {
    // `from` is a relative URL.
    const { pathname, search, hash } = resolvedUrl;
    return pathname + search + hash;
  }
  return resolvedUrl.toString();
}

const safetrim = (str) => str && str.trim().replace(/\s+/g, ' ')

const find = ({$, $el, baseUrl}, selector, move = [], n = {}) => {
  let start = selector ? $el.find(selector) : $el
  for (const m of move) {
    start = start[m.direction](m.selector)
  }
  const {
    from = 0,
    to,
  } = n
  const roots = start
  .toArray()
  .slice(from, to)
  .map(el => ({
    $,
    $el: $(el),
    baseUrl,
    el,
  }))

  return roots
}

export const schema = makeExecutableSchema({ typeDefs, resolvers })

export const g = ( { query, variables } ) => graphql({
  schema, 
  source: query,
  variableValues: variables,
})

export const request = async (url) => {
  const query = `
query request($url: JSON!) {
  request(url: $url)
}
  `
  const response = await g({
    query,
    variables: {
      url,
    },
  })

  return response.data
}

