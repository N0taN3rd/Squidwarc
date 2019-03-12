/**
 * Copyright 2017-2019 John Berlin <n0tan3rd@gmail.com>. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const EventEmitter = require('eventemitter3')
const Events = require('chrome-remote-interface-extra/lib/Events')
const Browser = require('chrome-remote-interface-extra/lib/browser/Browser')
const { TimeoutError } = require('chrome-remote-interface-extra/lib/Errors')
const { CRIExtraWARCGenerator, CRIExtraCapturer } = require('node-warc')
const Launcher = require('../launcher/chrome')
const InjectManager = require('../injectManager')
const WARCNaming = require('../utils/warcNaming')
const cp = require('../utils/colorPrinters')
const Frontier = require('../frontier')

const CEvents = {
  navigating: 'Crawler-Navigating',
  navigated: 'Crawler-Navigated',
  navigationError: 'Crawler-NavigationError',
  inited: 'Crawler-initialized'
}

class ExtraChromeCrawler extends EventEmitter {
  /**
   * @desc Create a new ExtraChromeCrawler instance. For a description of the expected options see the
   * JSDoc CrawlConfig typedef {@link CrawlConfig}
   * @param {{browser: Browser, options: CrawlConfig}} - init
   */
  constructor ({ browser, options }) {
    super()
    /**
     * @desc Crawl configuration options
     * @type {CrawlConfig}
     */
    this.options = options

    /**
     * @desc Devtools protocol client for issuing commands to the browser
     * @type {CRIConnection}
     * @private
     */
    this._client = null

    this._frontier = new Frontier()

    /**
     *
     * @type {Browser}
     * @private
     */
    this._browser = browser

    this._actualShutdown = false

    /**
     * @type {Page}
     * @private
     */
    this._page = null

    this._pages = []

    /**
     * @type {CRIExtraWARCGenerator}
     * @private
     */
    this._warcGenerator = new CRIExtraWARCGenerator()

    /**
     * @type {?CRIExtraRequestCapturer}
     */
    this.requestCapturer = null

    this._warcNamingFN = WARCNaming.getWarcNamingFunction(this.options)

    /**
     * @desc The UserAgent string of the remote instance we are connecting to
     * @type {string}
     * @private
     */
    this._ua = ''
  }

  static async create (options) {
    let crawler
    if (options.chrome.launch) {
      const browser = await Launcher.launchB(options.chrome)
      crawler = new ExtraChromeCrawler({ browser, options })
    } else {
      const browser = await Launcher.connectB(options.chrome)
      crawler = new ExtraChromeCrawler({ browser, options })
    }
    await crawler.init()
    return crawler
  }

  genWARCForPage (outlinks) {
    const opts = {
      warcOpts: {
        warcPath: this._warcNamingFN(this._currentUrl),
        appending: this.options.warc.appending,
        gzip: this.options.warc.gzip
      },
      metadata: {
        targetURI: this._currentUrl,
        content: outlinks
      }
    }
    if (!this.options.warc.appending) {
      opts.pages = this._pages.shift()
    }
    const defaultWinfo = { 'http-header-user-agent': this._ua }
    if (this.options.warc.winfo) {
      opts.winfo = Object.assign(defaultWinfo, this.options.warc.winfo)
    } else {
      opts.winfo = defaultWinfo
    }
    this.requestCapturer.stopCapturing()
    return this._warcGenerator.generateWARC(this.requestCapturer, opts)
  }

  async writeWRPlayerPagesRecord () {
    this._warcGenerator.initWARC(this._warcNamingFN(this._currentUrl), {
      appending: true
    })
    await this._warcGenerator.writeWebrecorderBookmarksInfoRecord(this._pages)
    await new Promise(resolve => {
      this._warcGenerator.once('finished', resolve)
      this._warcGenerator.end()
    })
    this._pages.length = 0
  }

  /**
   * @desc Navigate the browser to the URL of the page to be crawled
   * @param {string} url
   * @returns {Promise<boolean>}
   */
  async navigate (url) {
    this._currentUrl = url
    this.requestCapturer.startCapturing()
    try {
      await this._page.goto(url, this.defaultWait)
    } catch (e) {
      if (e instanceof TimeoutError) {
        this._pages.push(this._currentUrl)
        return true
      }
      cp.error('Crawler encountered a navigation error', e)
      return false
    }
    this._pages.push(this._currentUrl)
    return true
  }

  async crawl () {
    let currentSeed
    let good
    let retrievedOutlinks
    while (!this._frontier.exhausted()) {
      currentSeed = this._frontier.next()
      cp.cyan(`Crawler Navigating To ${currentSeed}`)
      good = await this.navigate(currentSeed)
      if (good) {
        cp.cyan(`Crawler Navigated To ${currentSeed}`)
        await this.runUserScript()
        retrievedOutlinks = await this.getOutLinks()
        this._frontier.process(retrievedOutlinks.links)
        cp.cyan(`Crawler Generating WARC`)
        await this.genWARCForPage(retrievedOutlinks.outlinks)
      }
      cp.cyan(`Crawler Has ${this._frontier.size()} Seeds Left To Crawl`)
    }
  }

  /**
   * @desc Retrieve the page's meta information
   * @return {Promise<{outlinks: string, links: Array<{href: string, pathname: string, host: string}>, location: string}, Error>}
   */
  async getOutLinks () {
    const frames = this._page.frames()
    const numFrames = frames.length
    const outlinks = []
    const discoveredLinks = {
      outlinks: '',
      links: [],
      location: this._page.url()
    }
    let i = 0
    let frame
    let results
    const outlinksFN = InjectManager.rawOutLinks()
    for (; i < numFrames; i++) {
      frame = frames[i]
      try {
        results = await frame.evaluate(outlinksFN)
        outlinks.push(results.outlinks)
        discoveredLinks.links = discoveredLinks.links.concat(results.links)
      } catch (e) {}
    }
    discoveredLinks.outlinks = outlinks.join('')
    return discoveredLinks
  }

  /**
   * @desc Stop crawling and exit
   * @return {Promise<void>}
   */
  async shutdown () {
    this._actualShutdown = true
    await this._page.close()
    await this._browser.close()
    if (this.options.warc.appending && this._pages.length) {
      await this.writeWRPlayerPagesRecord()
    }
  }

  async init () {
    if (this.options.chrome.launch) {
      const pages = await this._browser.pages()
      this._page = await this._browser.newPage()
      await pages[0].close()
    } else {
      this._page = await this._browser.newPage()
    }
    this._page.on(Events.Page.Close, async () => {
      if (!this._actualShutdown) {
        cp.bred('The page closed unexpectedly we must exit now :(')
        await this._browser.close()
        process.exit()
      }
    })
    if (this.options.chrome.customizer) {
      console.log(
        cp.chalk`{bold.blue Crawler using supplied chrome customizer.} {bold.yellow Squidwarc is not responsible for changes out of its control!}`
      )
      await this.options.chrome.customizer(this._page)
    }
    this.requestCapturer = new CRIExtraCapturer(this._page, Events.Page.Request)
    this._ua = await this.getUserAgent()
    await this._page.disableNetworkCache()
    await this._page.addScriptToEvaluateOnNewDocument(
      InjectManager.getNoNaughtyJsInject().source
    )
    this._ua = await this.getUserAgent()
    this._frontier.init(this.options.seeds)
    this._warcGenerator.on('finished', this._onWARCGenFinished)
    this._warcGenerator.on('error', this._onWARCGenError)
  }

  /**
   * @desc If the user supplied a script that scrip is executed or if non was supplied just scroll the page
   * @return {Promise<void>}
   */
  async runUserScript () {
    if (this.options.crawlControl.script) {
      cp.cyan(`Running user script`)
      try {
        await this.options.crawlControl.script(this._page)
      } catch (e) {
        cp.error('An exception was thrown while running the user script', e)
      }
    } else {
      try {
        await this._page.evaluate(InjectManager.rawScoll())
      } catch (e) {
        cp.error('An exception was thrown while running the default scroll script', e)
      }
    }
    await this._page.networkIdlePromise(this.options.crawlControl)
  }

  /**
   * @desc Retrieve the browsers user-agent string
   * @return {!Promise<string>}
   */
  async getUserAgent () {
    let ua = await this._page.userAgent()
    if (ua.indexOf('HeadlessChrome/') !== -1) {
      // We are not a robot, pinkie promise!
      ua = ua.replace('HeadlessChrome/', 'Chrome/')
      await this._page.setUserAgent(ua)
    }
    return ua
  }

  /**
   * @desc Listener for warc generator error
   * @param {Error} err - The error to emit
   * @private
   */
  _onWARCGenError (err) {
    this.emit('error', { type: 'warc-gen', err })
  }

  /**
   * @desc Listener for warc generator finished
   * @private
   */
  _onWARCGenFinished () {
    this.emit('warc-gen-finished')
  }
}

/**
 * @type {ExtraChromeCrawler}
 */
module.exports = ExtraChromeCrawler
