
const query = `
query q(
  $url: JSON!
) {
  page(url: $url) {
    children(selector: ".quote") {
      text(selector: ".text")
      author:text(selector: ".author")
      authorlink:url(selector: "span a")
      tags:texts(selector: ".tags .tag")
    }
    next:url(selector: ".next a")
  }
}
`

const parse = async function* (response) {

  const data = response.data.page

  for (const d of data.children) {
    yield { type: 'data', data: d }
  }
  
  const nextUrl = data.next
  if (nextUrl) {
    yield {
      type: 'request',
      data: {
        name: 'quotes',
        query,
        variables: {
          url: nextUrl,
        },
        parse,
      },
    }
  }
}

export const spiders = async () => [
  {
    name: 'quotes',
    query,
    variables: {
      url: 'http://quotes.toscrape.com/tag/humor/',
    },
    parse,
  },
]

export const workers = [
  'log',
]
