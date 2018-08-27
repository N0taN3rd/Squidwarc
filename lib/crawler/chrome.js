/*
 Squidwarc  Copyright (C) 2017-Present John Berlin <n0tan3rd@gmail.com>

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 Squidwarc is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this Squidwarc.  If not, see <http://www.gnu.org/licenses/>
 */
const EventEmitter = require('eventemitter3')
const RequestMonitor = require('../../node-warc/lib/requestCapturers/remoteChrome')
const RemoteChromeWARCGenerator = require('../../node-warc/lib/writers/remoteChrome')
const defaults = require('../defaults')
const Launcher = require('../launcher/chrome')
const NavMan = require('./navigationMan')
const InjectManager = require('../injectManager')

/**
 * @desc Crawler based on cyrus-and/chrome-remote-interface
 * @extends {EventEmitter}
 */
class ChromeCrawler extends EventEmitter {
  /**
   * @param {Object} [options = defaultOpts]
   */
  constructor (options = defaults.defaultOpts) {
    super()
    options.connect = options.connect || defaults.defaultOpts.connect
    options.timeouts = options.timeouts || defaults.defaultOpts.timeouts
    options.deviceMetrics = options.deviceMetrics || defaults.defaultOpts.deviceMetrics
    options.connect.remote = true
    /**
     * @desc Crawl configuration options
     * @type {Object}
     */
    this.options = options

    /**
     * @desc Devtools protocol client for issuing commands to the browser
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
     * @type {RequestMonitor}
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
    this._navMan = new NavMan(options.crawlControl, this)

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
  }

  /**
   * @emits {connected} when the required setup is done
   * @desc Connect to the Chrome instance the crawler will be using and setup crawler
   * @return {Promise<void>}
   */
  async init () {
    if (this.options.connect.launch) {
      this._client = await Launcher.launch(this.options)
    } else {
      this._client = await Launcher.connect(this.options)
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
      await this._initInjects()
      this.requestMonitor = new RequestMonitor(this._client.Network)
      if (!this._navMan.pageLoadStrat) {
        this.requestMonitor.withNavigationManager(this._client.Network, this._navMan)
      } else {
        this._client.Page.loadEventFired(this._pageLoaded)
      }
      this._ua = await this.getUserAgent()
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
    this.requestMonitor.startCapturing()
    this._client.Page.navigate({ url }, this._navMan.didNavigate)
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
  shutdown () {
    this._client.close()
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
   * @return {Promise<void, Error>}
   */
  genWARC (warcInfo) {
    return this.genWarc(warcInfo)
  }

  /**
   * @desc Generate the WARC file
   * @param {!Object} warcInfo          - WARC record information
   * @param {!string} warcInfo.outlinks - Pre-formatted string containing the pages outlinks tobe used by the WARC metadata record
   * @param {?Object} warcInfo.info     - Information for the WARC info record
   * @return {Promise<void, Error>}
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
        await this._warcGenerator.generateWarcEntry(nreq, this._client.Network)
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
      this._ua || defaults.defaultOpts.UA
    )
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
    try {
      let ua = await this._client.Browser.getVersion()
      return ua.userAgent
    } catch (error) {
      return defaults.defaultOpts.UA
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
   * @desc Enable auto closing of the connection to the remote browser
   * @return {ChromeCrawler}
   * @private
   */
  _enableAutoClose () {
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
   * @param options
   * @return {ChromeCrawler}
   */
  static withAutoClose (options = defaults.defaultOpts) {
    return new ChromeCrawler(options)._enableAutoClose()
  }
}

module.exports = ChromeCrawler
