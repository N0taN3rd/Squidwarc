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
const RemoteChromeWARCGenerator = require('node-warc/lib/writers/remoteChrome')
const RequestHandler = require('node-warc/lib/requestCapturers/requestHandler')
const defaults = require('../defaults')
const Launcher = require('../launcher/chrome')
const NavigationMan = require('./navigationMan')
const InjectManager = require('../injectManager')
const WARCNaming = require('../utils/warcNaming')

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

/**
 * @desc Crawler based on cyrus-and/chrome-remote-interface
 * @extends {EventEmitter}
 */
class ChromeCrawler extends EventEmitter {
  /**
   * @desc Create a new ChromeCrawler instance. For a description of the expected options see the
   * JSDoc CrawlConfig typedef {@link CrawlConfig}
   * @param {CrawlConfig} options - The crawl config for this crawl
   */
  constructor (options) {
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

    /**
     * @desc Flag indicating if once the process exists should the crawler close the browser
     * @type {boolean}
     * @private
     */
    this._autoClose = false

    /**
     * @desc Handles the tracking and capturing of the HTTP requests made by the browser
     * @type {NetworkMonitor}
     */
    this.requestMonitor = null

    /**
     * @desc The current url the crawler is visiting
     * @type {?string}
     */
    this._currentUrl = null

    /**
     * @desc WARC generator for use with cyrus-and/chrome-remote-interface
     * @type {RemoteChromeWARCGenerator}
     * @private
     */
    this._warcGenerator = new RemoteChromeWARCGenerator()

    /**
     * @desc Manger for detecting network-idle, if we have not navigated or if we have reached the global wait time
     * @type {NavigationMan}
     * @private
     */
    this._navMan = new NavigationMan(options.crawlControl, this)

    /**
     * @desc The UserAgent string of the remote instance we are connecting to
     * @type {string}
     * @private
     */
    this._ua = ''

    this.init = this.init.bind(this)
    this._onWARCGenFinished = this._onWARCGenFinished.bind(this)
    this._onWARCGenError = this._onWARCGenError.bind(this)
    this._close = this._close.bind(this)
    this._didNavigate = this._didNavigate.bind(this)
    this._warcNamingFN = WARCNaming.getWarcNamingFunction(this.options)
    this._pages = []
  }

  /**
   * @emits {connected} when the required setup is done
   * @desc Connect to the Chrome instance the crawler will be using and setup crawler
   * @return {Promise<void>}
   */
  async init () {
    if (this.options.chrome.launch) {
      this._client = await Launcher.launch(this.options.chrome)
    } else {
      this._client = await Launcher.connect(this.options.chrome)
    }
    this._warcGenerator.on('finished', this._onWARCGenFinished)
    this._warcGenerator.on('error', this._onWARCGenError)
    let wasError = false
    try {
      await this._client.Runtime.enable()
      await this._client.Page.enable()
      await this._client.Network.enable()
    } catch (err) {
      wasError = true
      this.emit('error', { type: 'enabling-browser-hooks', err })
    }
    if (!wasError) {
      await this._client.Animation.setPlaybackRate({ playbackRate: 1000 })
      this._ua = await this.getUserAgent()
      await this._initInjects()
      this.requestMonitor = new NetworkMonitor(this._client.Network, this._navMan)
      this.emit('connected')
    }
  }

  /**
   * @desc Instruct the browsers to inject JavaScript into every page
   * @return {Promise<void>}
   * @private
   */
  async _initInjects () {
    if (this._client.Page.addScriptToEvaluateOnNewDocument) {
      await this._client.Page.addScriptToEvaluateOnNewDocument(
        InjectManager.getCrawlInjects()
      )
    } else {
      await this._client.Page.addScriptToEvaluateOnLoad(
        InjectManager.getCrawlInjects(true)
      )
    }
  }

  /**
   * @desc Navigate to a new Web Page
   * @param {string} url - The url to navigate the browser to
   */
  navigate (url) {
    this._currentUrl = url
    this._pages.push(url)
    this._client.Page.navigate({ url }, this._navMan.didNavigate)
    this.requestMonitor.startCapturing()
    this._navMan.startedNav(url)
  }

  /**
   * @desc Equivalent to hitting the refresh button when it is an X
   * @return {Promise<any>}
   */
  stopPageLoading () {
    return this._client.Page.stopLoading()
  }

  /**
   * @desc Stop capturing the current web pages network requests
   */
  stopCapturingNetwork () {
    this.requestMonitor.stopCapturing()
  }

  /**
   * @desc Stop the page loading and stop capturing requests
   * @return {Promise<void>}
   */
  stop () {
    this.requestMonitor.stopCapturing()
    return this._client.Page.stopLoading()
  }

  /**
   * @desc Disconnect from the Chrome instance currently attached to
   */
  async shutdown () {
    this._client.close()
    if (this.options.warc.appending) {
      await this.writeWRPlayerPagesRecord()
    }
    process.exit()
  }

  /**
   * @desc Initialize the WARC writter for writting a new WARC
   * @param {string} warcPath           - the path to the new WARC
   * @param {Object} [options] - WARC file creation options
   */
  initWARC (warcPath, options) {
    this._warcGenerator.initWARC(warcPath, options)
  }

  /**
   * @desc Alias for {@link genWarc}
   * @param {!Object} warcInfo    - WARC record information
   * @property {!string} outlinks - Pre-formatted string containing the pages outlinks tobe used by the WARC metadata record
   * @property {?Object} info     - Information for the WARC info record
   * @return {Promise<void, Error>}
   */
  genWARC (warcInfo) {
    return this.genWarc(warcInfo)
  }

  /**
   * @desc Generate the WARC file
   * @param {!Object} warcInfo          - WARC record information
   * @property {!string} outlinks - Pre-formatted string containing the pages outlinks tobe used by the WARC metadata record
   * @property {?Object} info     - Information for the WARC info record
   * @return {Promise<void, Error>}
   */
  async genWarc ({ info, outlinks }) {
    info = info || {}
    info.isPartOfV = info.isPartOfV || this.options.versionInfo.isPartOfV
    info.warcInfoDescription =
      info.warcInfoDescription || this.options.versionInfo.warcInfoDescription
    await this._warcGenerator.writeWarcInfoRecord({
      isPartOf: info.isPartOfV,
      description: info.warcInfoDescription,
      'http-header-user-agent': this._ua
    })
    await this._warcGenerator.writeWarcMetadata(this._currentUrl, outlinks)
    this.requestMonitor.stopCapturing()
    for (let nreq of this.requestMonitor.iterateRequests()) {
      try {
        await this._warcGenerator.generateWarcEntry(nreq, this._client.Network)
      } catch (error) {
        console.error(error)
      }
    }
    this._warcGenerator.end()
  }

  genWARCForPage (outlinks) {
    /**
     *
     * @type {{warcOpts: {warcPath: string, appending: boolean, gzip: boolean}, metadata: {targetURI: string, content: string}, pages: ?string, winfo: ?Object}}
     */
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
    return this._warcGenerator.generateWARC(this.requestCapturer, this._client, opts)
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
   * @desc Generate the WARC Info and Metadata records
   * @param {!Object} warcInfo    - WARC record information
   * @property {!string} outlinks - Pre-formatted string containing the pages outlinks tobe used by the WARC metadata record
   * @property {?Object} info     - Information for the WARC info record
   * @return {!Promise<void>}
   */
  async genInfoMetaDataRecord ({ info, outlinks }) {
    info = info || {}
    info.v = info.v || this.options.versionInfo.v
    info.isPartOfV = info.isPartOfV || this.options.versionInfo.isPartOfV
    info.warcInfoDescription =
      info.warcInfoDescription || this.options.versionInfo.warcInfoDescription
    await this._warcGenerator.writeWarcInfoRecord({
      isPartOf: info.isPartOfV,
      description: info.warcInfoDescription,
      'http-header-user-agent': this._ua
    })
    await this._warcGenerator.writeWarcMetadataOutlinks(this._currentUrl, outlinks)
  }

  /**
   * @desc Retrieve the page's meta information
   * @return {Promise<{outlinks: string, links: string[], location: string}, Error>}
   */
  async getOutLinks () {
    let evaled = await this._client.Runtime.evaluate(InjectManager.getCollectInject())
    return evaled.result.value
  }

  /**
   * @desc Retrieve the browsers user-agent string
   * @return {Promise<string>}
   */
  async getUserAgent () {
    let { userAgent } = await this._client.Browser.getVersion()
    if (userAgent.indexOf('HeadlessChrome/') !== -1) {
      // We are not a robot, pinkie promise!
      userAgent = userAgent.replace('HeadlessChrome/', 'Chrome/')
      await this._client.Network.setUserAgentOverride({ userAgent })
    }
    return userAgent
  }

  /**
   * @desc Iterate over the captured network requests for the current web page
   * @return {Iterator<CapturedRequest>}
   */
  [Symbol.iterator] () {
    return this.requestMonitor.values()
  }

  /**
   * @desc Callback used for Page.navigate
   * @private
   */
  _didNavigate () {
    this._navMan.didNavigate()
  }

  /**
   * @desc Enable auto closing of the connection to the remote browser
   * @return {ChromeCrawler}
   * @private
   */
  enableAutoClose () {
    if (!this._autoClose) {
      process.on('exit', this._close)
    }
    this._autoClose = true
    return this
  }

  /**
   * @desc Callback for process.on('exit')
   * @private
   */
  _close () {
    if (this._client) {
      return this._client.close()
    }
  }

  /**
   * @desc Listener for warc generator error
   * @param {Error} err
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

  /**
   * @desc Create a new {@link ChromeCrawler} instance with auto close enabled
   * @param {CrawlConfig} options - The crawl config for this crawl
   * @return {ChromeCrawler}
   */
  static withAutoClose (options) {
    return new ChromeCrawler(options).enableAutoClose()
  }
}

/**
 * @type {ChromeCrawler}
 */
module.exports = ChromeCrawler
