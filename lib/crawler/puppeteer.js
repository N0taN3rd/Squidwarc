const EventEmitter = require('eventemitter3')
const BPromise = require('bluebird')
const RequestMonitor = require('node-warc/lib/requestCapturers/puppeteerCDP')
const WARCGenerator = require('node-warc/lib/writers/puppeteer')
const NavMan = require('./navigationMan')
const defaults = require('../defaults')
const InjectManager = require('../injectManager')
const launch = require('../launcher/puppeteer')

/**
 * @extends {EventEmitter}
 */
class PuppeteerCrawler extends EventEmitter {
  /**
   * @param {?Object} [options]
   */
  constructor (options) {
    super()
    this.options = options || {}

    /**
     * @type {Browser}
     * @private
     */
    this._browser = null

    /**
     * @type {Page}
     * @private
     */
    this._page = null

    /**
     * @type {CDPSession}
     * @private
     */
    this._client = null

    /**
     * @type {string}
     * @private
     */
    this._ua = ''

    /**
     * @type {PuppeteerWARCGenerator}
     * @private
     */
    this._warcGenerator = new WARCGenerator()

    /**
     * @type {NavigationMan}
     * @private
     */
    this._navMan = new NavMan(this.options, this)

    /**
     * @type {PuppeteerCDPRequestCapturer}
     */
    this.requestMonitor = new RequestMonitor(this._navMan)

    this.init = this.init.bind(this)
    this._onWARCGenFinished = this._onWARCGenFinished.bind(this)
    this._onWARCGenError = this._onWARCGenError.bind(this)
    this._didNavigate = this._didNavigate.bind(this)
    this._pageLoaded = this._pageLoaded.bind(this)
  }

  async init () {
    this._browser = await launch(this.options)
    this._page = await this._browser.newPage()
    await this._page.setViewport({ width: 1920, height: 1080 })
    this._client = await this._page.target().createCDPSession()
    let wasError = false
    try {
      await this._client.send('Runtime.enable')
      await this._client.send('Page.enable')
      await this._client.send('Network.enable')
    } catch (err) {
      wasError = true
      this.emit('error', { type: 'enabling-browser-hooks', err })
    }
    if (!wasError) {
      await this._client.send('Animation.setPlaybackRate', { playbackRate: 1000 })
      await this._client.send('Network.setBypassServiceWorker', { bypass: true })
      await this._client.send(
        'Page.addScriptToEvaluateOnNewDocument',
        InjectManager.getCrawlInjects()
      )
      this.requestMonitor.attach(this._client)
      this._ua = await this.getUserAgent()
      if (this._navMan.pageLoadStrat) {
        this._client.on('Page.loadEventFired', this._pageLoaded)
      }
      this._warcGenerator.on('finished', this._onWARCGenFinished)
      this._warcGenerator.on('error', this._onWARCGenError)
      this.emit('connected')
    }
  }

  /**
   * @desc Navigate to a new Web Page
   * @param {string} url
   */
  navigate (url) {
    this._currentUrl = url
    this.requestMonitor.startCapturing()
    let navProm = this._client.send('Page.navigate', { url })
    this._navMan.startedNav(url)
    navProm
      .then(res => {
        if (res.errorText) {
          this._navMan.navigationError(`${res.errorText} at ${url}`)
        } else {
          this._navMan.didNavigate()
        }
      })
      .catch(error => {
        this._navMan.navigationError(error)
      })
  }

  /**
   * @desc Equivalent to hitting the refresh button when it is an X
   * @return {!Promise<?Object>}
   */
  stopPageLoading () {
    return this._client.send('Page.stopLoading')
  }

  /**
   * @desc Stop capturing the current web pages network requests
   */
  stopCapturingNetwork () {
    this.requestMonitor.stopCapturing()
  }

  /**
   * @desc Stop the page loading and stop capturing requests
   * @return {!Promise<?Object>}
   */
  stop () {
    this.requestMonitor.stopCapturing()
    return this._client.send('Page.stopLoading')
  }

  /**
   * @desc Stop crawling and exit
   * @return {Promise<void>}
   */
  async shutdown () {
    this.requestMonitor.stopCapturing()
    await this._client.detach()
    await this._browser.close()
    process.exit()
  }

  /**
   * @desc Initialize the WARC writter for writting a new WARC
   * @param {string} warcPath           - the path to the new WARC
   * @param {boolean} [appending=false] - append to an already existing WARC file
   */
  initWARC (warcPath, appending = false) {
    this._warcGenerator.initWARC(warcPath, appending)
  }

  /**
   * @desc Alias for {@link genWarc}
   * @param {!Object} warcInfo    - WARC record information
   * @property {!string} outlinks - Pre-formatted string containing the pages outlinks tobe used by the WARC metadata record
   * @property {?Object} info     - Information for the WARC info record
   * @return {!Promise<void, Error>}
   */
  genWARC (warcInfo) {
    return this.genWarc(warcInfo)
  }

  /**
   * @desc Generate the WARC file
   * @param {!Object} warcInfo          - WARC record information
   * @param {!string} warcInfo.outlinks - Pre-formatted string containing the pages outlinks tobe used by the WARC metadata record
   * @param {?Object} warcInfo.info     - Information for the WARC info record
   * @return {!Promise<void, Error>}
   */
  async genWarc ({ info, outlinks }) {
    info = info || {}
    info.isPartOfV = info.isPartOfV || this.options.versionInfo.isPartOfV
    info.warcInfoDescription =
      info.warcInfoDescription || this.options.versionInfo.warcInfoDescription
    await this._warcGenerator.writeWarcInfoRecord(
      info.isPartOfV,
      info.warcInfoDescription,
      this._ua
    )
    await this._warcGenerator.writeWarcMetadataOutlinks(this._currentUrl, outlinks)
    this.requestMonitor.stopCapturing()
    for (let nreq of this.requestMonitor.iterateRequests()) {
      try {
        await this._warcGenerator.generateWarcEntry(nreq, this._client)
      } catch (error) {
        console.error(error)
      }
    }
    this._warcGenerator.end()
  }

  /**
   * @desc Generate the WARC Info and Metadata records
   * @param {!Object} warcInfo          - WARC record information
   * @param {!string} warcInfo.outlinks - Pre-formatted string containing the pages outlinks tobe used by the WARC metadata record
   * @param {?Object} warcInfo.info     - Information for the WARC info record
   * @return {!Promise<void>}
   */
  async genInfoMetaDataRecord ({ info, outlinks }) {
    info = info || {}
    info.v = info.v || this.options.versionInfo.v
    info.isPartOfV = info.isPartOfV || this.options.versionInfo.isPartOfV
    info.warcInfoDescription =
      info.warcInfoDescription || this.options.versionInfo.warcInfoDescription
    await this._warcGenerator.writeWarcInfoRecord(
      info.isPartOfV,
      info.warcInfoDescription,
      this._ua
    )
    await this._warcGenerator.writeWarcMetadataOutlinks(this._currentUrl, outlinks)
  }

  /**
   * @desc Retrieve the page's meta information
   * @return {Promise<{outlinks: string, links: Array<{href: string, pathname: string, host: string}>, location: string}, Error>}
   */
  async getOutLinks () {
    let evaled = await this._client.send(
      'Runtime.evaluate',
      InjectManager.getCollectInject()
    )
    return evaled.result.value
  }

  /**
   * @desc Retrieve the browsers user-agent string
   * @return {!Promise<string>}
   */
  async getUserAgent () {
    try {
      const res = await this._client.send('Browser.getVersion')
      return res.userAgent
    } catch (e) {
      return defaults.UA
    }
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
   * @desc Callback for Page.load event
   * @param info
   * @return {Promise<void>}
   * @private
   */
  async _pageLoaded (info) {
    if (this.options.timeouts.waitAfterLoad) {
      await BPromise.delay(this.options.timeouts.waitAfterLoad)
    }
    this.emit('page-loaded', info)
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
}

module.exports = PuppeteerCrawler
