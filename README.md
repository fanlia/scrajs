# scrajs
scrap web page by graphql

## Deploy

```sh
NODE_ENV=production node cli.js api
```

## Usage

```sh
npm i
./cli.js api
./cli.js run -s ../spiders/demo.js -w log
```

```graphql

query show  {
  page(url: "https://quotes.toscrape.com") {
    show
  }
}

query q  {
  page(url: "https://quotes.toscrape.com/") {
    children(selector: ".quote") {
      text(selector: ".text")

      author:text(selector: ".author")
      authorlink:url(selector: "span a")
      tags:texts(selector: ".tags .tag")
    }
    next:url(selector: ".next a")
  }
}

query request {
  request(url: {
    url: "https://httpbin.org/ip"
    })
}

query pptr {
  pptr(url: {
    url: "https://quotes.toscrape.com"
  }) {
    children(selector: "a") {
      text
      url
    }
  }
}

query puppeteer {
  puppeteer(
    url: "https://quotes.toscrape.com"
    script: "const title = await page.title(); return { title }"
  )
}

mutation browser {
  browser_open(
    id: "quotes"
    url: "https://quotes.toscrape.com"
  )
  browser_run(id: "quotes" script: "page.title()")
  browser_fetch(id: "quotes" args: {
    url: "https://quotes.toscrape.com/page/2/"
  })
  browser_close(id: "quotes")
}
```
