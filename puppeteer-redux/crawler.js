const puppeteer = require('puppeteer')
const {Browser} = require('puppeteer/lib/Browser')
const InjectManager = require('../lib/injectManager')
const DEFAULT_ARGS = require('../lib/launcher/defaultArgs')
const RequestMonitor = require('../node-warc/lib/requestCapturers/puppeteerCDP')
const WARCGenerator = require('../node-warc/lib/writers/puppeteer')
const EventEmitter = require('eventemitter3')
const NetIdle = require('../lib/crawler/netIdleWatcher')
const chalk = require('chalk')
const autobind = require('class-autobind').default
const inspect = require('util').inspect

function badExport (exposed) {
  console.log(chalk`{bold.red Squidwarc does not know how to handled the supplied script:
You supplied a ${typeof exposed}:
    ${inspect(exposed, {depth: null})}}
`)
  console.log(chalk.bold.blue('Please export a function similar to:'))
  console.log(chalk.bold.blue('module.exports = async function (page) {....}'))
}

function notAsync (notAsyncFn) {
  console.log(chalk`{bold.red Squidwarc expects the function exported by user scripts to be async functions
You supplied:
    ${notAsyncFn.toString()}}`)
  console.log(chalk.bold.blue('Please export a function similar to:'))
  console.log(chalk.bold.blue('module.exports = async function (page) {....}'))
}

function usrFNGood () {
  console.log(chalk`{bold.green With great power comes great responsibility!}
{bold.red Squidwarc is not responsible for ill behaved user supplied scripts!}
`)
}

module.exports = class Crawler extends EventEmitter {
  constructor (options = {}) {
    super()

    /**
     * @type {?Browser}
     */
    this._browser = null

    /**
     * @type {?Page}
     */
    this._page = null

    /**
     * @type {?CDPSession}
     * @private
     */
    this._client = null

    /**
     * @type {string}
     * @private
     */
    this._ua = ''

    /**
     * @type {?function(page: Page)}
     * @private
     */
    this._usrFN = null

    this.options = options
    /**
     * @type {?RequestMonitor}
     */
    this.requestMonitor = null

    /**
     * @type {PuppeteerWARCGenerator}
     * @private
     */
    this._warcGenerator = new WARCGenerator()

    this.defaultWait = {waitUntil: 'networkidle2'}
    autobind(this, Crawler.prototype)
  }

  _onDisconnected () {
    this.emit('disconnected')
  }

  async _init () {
    await this._client.send('Animation.setPlaybackRate', {playbackRate: 1000})
    await this._client.send('Network.setBypassServiceWorker', {bypass: true})
    await this._client.send(
      'Page.addScriptToEvaluateOnNewDocument',
      InjectManager.getCrawlInjectsNoScroll()
    )
    // so much noise
    this._client.removeAllListeners('Performance.metrics')
    this._client.removeAllListeners('Log.entryAdded')
    this._client.removeAllListeners('Runtime.consoleAPICalled')
    this._client.removeAllListeners('Runtime.exceptionThrown')
  }

  async init () {
    this._browser = await puppeteer.launch({
      ignoreDefaultArgs: true,
      args: DEFAULT_ARGS.concat(['--headless']),
      defaultViewport: {width: 1920, height: 1080}
    })
    this._browser.on(Browser.Events.Disconnected, this._onDisconnected)
    this._page = await this._browser.newPage()
    this._client = this._page._client
    await this._init()
    this.requestMonitor = new RequestMonitor()
    this.requestMonitor.attach(this._client)
    this._warcGenerator.on('finished', this._onWARCGenFinished)
    this._warcGenerator.on('error', this._onWARCGenError)
  }

  async crawl (url) {
    this.requestMonitor.startCapturing()
    await this._page.goto(url, this.defaultWait)
    const nip = NetIdle.idlePromise(this._page)
    if (this._usrFN) {
      try {
        await this._usrFN(this._page)
      } catch (e) {
        console.error(e)
      }
    }
    await nip
    return this._page.evaluate(InjectManager.rawCollectInject())
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
    await this._browser.close()
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
    const res = await this._client.send('Browser.getVersion')
    return res.userAgent
  }

  /**
   * @desc Iterate over the captured network requests for the current web page
   * @return {Iterator<CapturedRequest>}
   */
  [Symbol.iterator] () {
    return this.requestMonitor.values()
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
