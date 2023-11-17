
export const spiders = [
`
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
`,
]

export const url = 'http://quotes.toscrape.com/tag/humor/'
