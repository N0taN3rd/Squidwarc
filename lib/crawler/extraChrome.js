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
const normalizeURL = require('normalize-url')
const { Page, TimeoutError } = require('chrome-remote-interface-extra')
const RemoteChromeWARCGenerator = require('node-warc/lib/writers/remoteChrome')
const RequestHandler = require('node-warc/lib/requestCapturers/requestHandler')
const defaults = require('../defaults')
const Launcher = require('../launcher/chrome')
const NavigationMan = require('./navigationMan')
const InjectManager = require('../injectManager')
const WARCNaming = require('../utils/warcNaming')
const cp = require('../utils/colorPrinters')
const Frontier = require('../frontier')

const Events = {
  navigating: 'Crawler-Navigating',
  navigated: 'Crawler-Navigated',
  inited: 'Crawler-initialized'
}

/// cause I removed squidwarc needs from node-warc
class NetworkMonitor extends RequestHandler {
  /**
   * @param {Object} network
   * @param {NavigationMan} navMan
   */
  constructor (network, navMan) {
    super()
    /**
     * @type {NavigationMan}
     */
    this.navMan = navMan
    this.requestWillBeSent = this.requestWillBeSent.bind(this)
    this.loadingFinished = this.loadingFinished.bind(this)
    network.requestWillBeSent(this.requestWillBeSent)
    network.loadingFailed(this.loadingFinished)
    network.loadingFinished(this.loadingFinished)
  }

  /**
   * @desc Indicate that a request has finished for the RequestHandler#navMan
   * @param {Object} info
   */
  loadingFinished (info) {
    if (this._capture) {
      this.navMan.reqFinished(info)
    }
  }

  requestWillBeSent (info) {
    super.requestWillBeSent(info)
    if (this._capture) {
      this.navMan.reqStarted(info)
    }
  }
}

class ExtraChromeCrawler extends EventEmitter {
  /**
   * @desc Create a new ExtraChromeCrawler instance. For a description of the expected options see the
   * JSDoc CrawlConfig typedef {@link CrawlConfig}
   * @param {Object} client - CRI chrome
   * @param {CrawlConfig} options - The crawl config for this crawl
   */
  constructor (client, options) {
    super()
    /**
     * @desc Crawl configuration options
     * @type {CrawlConfig}
     */
    this.options = options

    /**
     * @desc Devtools protocol client for issuing commands to the browser
     * @type {CRI}
     * @private
     */
    this._client = null

    this._frontier = new Frontier()

    /**
     * @type {Page}
     * @private
     */
    this._page = null

    /**
     * @type {CRIConnection}
     * @private
     */
    this._client = client

    this._pages = []

    /**
     * @desc The UserAgent string of the remote instance we are connecting to
     * @type {string}
     * @private
     */
    this._ua = ''
    // this._onWARCGenFinished = this._onWARCGenFinished.bind(this)
    // this._onWARCGenError = this._onWARCGenError.bind(this)
  }

  static async create (options) {
    const client = options.chrome.launch
      ? await Launcher.launch(options.chrome)
      : await Launcher.connect(options.chrome)
    const crawler = new ExtraChromeCrawler(client, options)
    await crawler.init()
    return crawler
  }

  /**
   * @desc Navigate the browser to the URL of the page to be crawled
   * @param {string} url
   * @returns {Promise<boolean>}
   */
  async navigate (url) {
    this.emit(Events.navigating, url)
    this._currentUrl = url
    try {
      await this._page.goto(url, this.defaultWait)
    } catch (e) {
      if (e instanceof TimeoutError) {
        const mainFrame = this._page.mainFrame()
        this._pages.push(this._currentUrl)
        this.emit(Events.navigating, mainFrame.url())
        return true
      }
      cp.error('Crawler encountered a navigation error', e)
      return false
    }
    this._pages.push(this._currentUrl)
    this.emit(Events.navigating, this._currentUrl)
    return true
  }

  async crawl () {
    let currentSeed
    while (!this._frontier.exhausted()) {
      currentSeed = this._frontier.next()
      cp.cyan(`Crawler Navigating To ${currentSeed}`)
      const good = await this.navigate(currentSeed)
      if (good) {
        cp.cyan(`Crawler Navigated To ${currentSeed}`)
        await this.runUserScript()
        cp.cyan(`Crawler Generating WARC`)
      }
      cp.cyan(`Crawler Has ${this._frontier.size()} Seeds Left To Crawl`)
    }

    cp.cyan(`Crawler shutting down. Have nice day :)`)
    await this.shutdown()
  }
  /**
   * @desc Stop crawling and exit
   * @return {Promise<void>}
   */
  async shutdown () {
    await this._page.close()
    await this._client.close()
  }

  async init () {
    this._page = await Page.create(this._client)
    await this._page.disableCache()
    await this._page.addScriptToEvaluateOnNewDocument(
      InjectManager.getNoNaughtyJsInject().source
    )
    this._ua = await this.getUserAgent()
    this._frontier.init(this.options.seeds)
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
}

module.exports = ExtraChromeCrawler
