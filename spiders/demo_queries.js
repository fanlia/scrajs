
import { runQueries } from '../src/scraper.js'

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

const url = 'http://quotes.toscrape.com/tag/humor/'

const queries = [query]

const br = runQueries(queries)

for await (const d of br(url)) {
  console.log(d)
}
