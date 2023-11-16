
import vm from 'vm'
import puppeteer from 'puppeteer-extra'

import StealthPlugin from 'puppeteer-extra-plugin-stealth'
puppeteer.use(StealthPlugin())

class Browser {
  constructor(options) {
    this.setOptions(options)
    this.page = null
  }

  setOptions(options) {
    if (!options) throw Error('options required')

    if (typeof options === 'string') {
      options = {
        url: options,
      }
    }

    if (typeof options !== 'object') throw new Error('invalid options')

    this.timestamp = Date.now()
    this.options = options
  }

  async open() {
    this.timestamp = Date.now()
    if (this.page) {
      const isConnected = this.page.browser().isConnected()
      const isClosed = this.page.isClosed()

      if (!isConnected) {
        return this._open()
      } else if (isClosed) {
        const browser = this.page.browser()
        return this._openpage(browser)
      }
      return this.page
    }

    return this._open()
  }

  async _open() {
    const browser = await this._openbrowser()
    return this._openpage(browser)
  }

  async _openbrowser() {
    const {
      launchOptions,
    } = this.options

    const browser = await puppeteer.launch({
      headless: 'new',
      ...launchOptions,
    })
    return browser
  }

  async _openpage(browser) {
    const {
      url,
      waitForTimeout = 0,
      gotoOptions,
    } = this.options

    try {
      const page = await browser.newPage()
      await page.goto(url, gotoOptions)
      await page.waitForTimeout(waitForTimeout)

      this.page = page

      return this.page

    } catch (e) {
      await browser.close()
      throw e
    }
  }

  async run(script = 'page.content()') {
    const page = await this.open()
    const context = {
        page,
        setTimeout,
    }
    vm.createContext(context)

    if (/await/.test(script)) {
      script = `{${script}}`
    }

    const asyncscript = `(async () => ${script})()`

    try {
      const data = await vm.runInContext(asyncscript, context)
      return data
    } catch (e) {
      throw e.toString()
    }
  }

  async fetch(args = {}) {
    const page = await this.open()
    const result = await page.evaluate(({ url, options, responseType = 'text' }) => fetch(url, options).then(res => res[responseType]()), args)
    return result
  }

  async close() {
    if (this.page) {
      await this.page.browser().close()
      this.page = null
    }
  }
}

class BrowserManager {
  constructor(options = {}) {
    const {
      autoclose_interval = 1 * 60 * 60 * 1000,
      autoclose_lifetime = 24 * 60 * 60 * 1000,
    } = options
    this.browsers = new Map()
    this.autoclose_interval = autoclose_interval
    this.autoclose_lifetime = autoclose_lifetime
    this.interval = null
  }

  toggle_autoclose() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
      return false
    } else {
      this.interval = setInterval(() => this.autoclose(), this.autoclose_interval)
      return true
    }
  }

  async autoclose() {
    for (const [ id, browser ] of this.browsers) {
      try {
        if (Date.now() - browser.timestamp > this.autoclose_lifetime) {
          await this.close(id)
        }
      } catch (e) {
        // ignore error
      }
    }
  }

  async open(id, options) {
    if (id && this.browsers.has(id)) {
      const browser = this.browsers.get(id)
      browser.setOptions(options)
      return id
    }
    const browser = new Browser(options)
    this.browsers.set(id, browser)
    return id
  }

  async close(id) {
    const browser = this.get(id)
    await browser.close()
    this.browsers.delete(id)
    return true
  }

  get(id) {
    if (!id) throw new Error(`browser id required`)
    const browser = this.browsers.get(id)
    if (!browser) throw new Error(`browser id:${id} not found`)
    return browser
  }

  async run(id, script) {
    const browser = this.get(id)
    return browser.run(script)
  }

  async fetch(id, args) {
    const browser = this.get(id)
    return browser.fetch(args)
  }

  list(ids = []) {
    return Array.from(this.browsers.entries())
      .filter(([id]) => ids.length === 0 || ids.includes(id))
      .map(([id, browser]) => ({ id, url: browser.options }))
  }

  async closeall() {
    for (const id of this.browsers.keys()) {
      await this.close(id)
    }
    return true
  }
}

export const bm = new BrowserManager({
  // autoclose_interval: 10 * 1000,
  // autoclose_lifetime: 60 * 1000,
})

export const pptr = async (options, script) => {
  const browser = new Browser(options)

  try {
    const data = await browser.run(script)

    return {
      data,
      config: browser.options,
    }
  } finally {
    await browser.close()
  }
}

