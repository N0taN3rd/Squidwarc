/*
 Squidwarc  Copyright (C) 2017-2018  John Berlin <n0tan3rd@gmail.com>

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
const Launcher = require('./launcher')
const EventEmitter = require('eventemitter3')
const BPromise = require('bluebird')
const RequestMonitor = require('node-warc/lib/requestCapturers/remoteChrome')
const WARCGenerator = require('node-warc/lib/writers/remoteChrome')
const pageEvals = require('../utils/pageEvals')
const defaults = require('../defaults')
const cp = require('../utils/colorPrinters')
const NavMan = require('./navigationMan')

const {defaultOpts, UA} = defaults

/**
 * @extends {EventEmitter}
 */
class Crawler extends EventEmitter {
  /**
   * @param {Object} options
   */
  constructor (options = defaultOpts) {
    super()
    options.connect = options.connect || defaultOpts.connect
    options.timeouts = options.timeouts || defaultOpts.timeouts
    options.deviceMetrics = options.deviceMetrics || defaultOpts.deviceMetrics
    options.connect.remote = true
    this.options = options
    this._client = null
    this._autoClose = false
    this.requestMonitor = null
    this._currentUrl = null
    this._navTimeout = null
    this._warcGenerator = new WARCGenerator()
    this._navMan = new NavMan(options.crawlControl, this)
    this.init = this.init.bind(this)
    this._onWARCGenFinished = this._onWARCGenFinished.bind(this)
    this._onWARCGenError = this._onWARCGenError.bind(this)
    this._close = this._close.bind(this)
    this._didNavigate = this._didNavigate.bind(this)
    this._pageLoaded = this._pageLoaded.bind(this)
  }

  /**
   * @desc Connect to the Chrome instance the crawler will be using and setup crawler
   * @emits {connected} when the required setup is done
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
      await this._client.Debugger.enable()
      await this._client.DOM.enable()
      await this._client.Page.enable()
      await this._client.Network.enable()
    } catch (err) {
      wasError = true
      this.emit('error', {type: 'enabling-browser-hooks', err})
    }

    if (!wasError) {
      await this._client.Animation.setPlaybackRate({playbackRate: 1000})
      if (await this._client.Network.canClearBrowserCache()) {
        await this._client.Network.clearBrowserCache()
      }
      await this._client.Emulation.setDeviceMetricsOverride(this.options.deviceMetrics)
      await this._client.Emulation.setVisibleSize({
        width: this.options.deviceMetrics.width,
        height: this.options.deviceMetrics.height
      })
      await this._client.Network.setBypassServiceWorker({bypass: true})
      try {
        await this._client.Page.addScriptToEvaluateOnNewDocument(pageEvals.noNaughtyJs)
      } catch (error) {
        await this._client.Page.addScriptToEvaluateOnLoad(pageEvals.noNaughtyJS2)
      }
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
   * @desc Navigate to a new Web Page
   * @param {string} url
   */
  navigate (url) {
    this._currentUrl = url
    this.requestMonitor.startCapturing()
    this._client.Page.navigate({url}, this._navMan.didNavigate)
    this._navMan.startedNav(url)
  }

  /**
   * @desc Equivalent to hitting the refresh button when it is an X
   * @return {*}
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
  async stop () {
    this.requestMonitor.stopCapturing()
    await this._client.Page.stopLoading()
  }

  /**
   * @desc Disconnect from the Chrome instance currently attached to
   * @param args
   */
  shutdown (...args) {
    this._client.close(...args)
    process.exit()
  }

  /**
   * @desc Initialize the WARC writter for writting a new WARC
   * @param {string} warcPath the path to the new WARC
   * @param {boolean} [appending=false] append to an already existing WARC file
   */
  initWARC (warcPath, appending = false) {
    this._warcGenerator.initWARC(warcPath, appending)
  }

  /**
   * @desc Alias for {@link genWarc}
   * @param {{info: ?Object, outlinks: string}} warcInfo
   * @return {Promise<void>}
   */
  genWARC (warcInfo) {
    return this.genWarc(warcInfo)
  }

  /**
   * @desc Generate the WARC file
   * @param {{info: ?Object, outlinks: string}} info WARC info record information
   * @return {Promise<void>}
   */
  async genWarc ({info, outlinks}) {
    info = info || {}
    info.isPartOfV = info.isPartOfV || this.options.versionInfo.isPartOfV
    info.warcInfoDescription = info.warcInfoDescription || this.options.versionInfo.warcInfoDescription
    await this._warcGenerator.writeWarcInfoRecord(info.isPartOfV, info.warcInfoDescription, this._ua)
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

  async genInfoMetaDataRecord ({info, outlinks}) {
    info = info || {}
    info.v = info.v || this.options.versionInfo.v
    info.isPartOfV = info.isPartOfV || this.options.versionInfo.isPartOfV
    info.warcInfoDescription = info.warcInfoDescription || this.options.versionInfo.warcInfoDescription
    await this._warcGenerator.writeWarcInfoRecord(info.isPartOfV, info.warcInfoDescription, UA)
    await this._warcGenerator.writeWarcMetadataOutlinks(this._currentUrl, outlinks)
  }

  /**
   *
   * @return {Promise<Object>}
   */
  async getOutLinks () {
    try {
      let evaled = await this._client.Runtime.evaluate(pageEvals.getLinks)
      return evaled.result.value
    } catch (error) {
      throw error
    }
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
      return UA
    }
  }

  /**
   * @desc Iterate over the captured network requests for the current web page
   * @return {Symbol.iterator}
   */
  [Symbol.iterator] () {
    return this.requestMonitor.values()
  }

  /**
   * @desc Callback used for Page.navigate
   * @private
   */
  _didNavigate (...args) {
    this._navMan.didNavigate()
  }

  /**
   * @desc Callback for Page.load event
   * @param info
   * @return {Promise.<void>}
   * @private
   */
  async _pageLoaded (info) {
    if (this.options.scroll) {
      try {
        await this._client.Runtime.evaluate(pageEvals.makeSmoothScroll(this.options.scroll))
      } catch (error) {
        cp.error('Smooth Scroll Failed', error)
      }
    }
    if (this.options.timeouts.waitAfterLoad) {
      await BPromise.delay(this.options.timeouts.waitAfterLoad)
    }
    this.emit('page-loaded', info)
  }

  /**
   * @desc Enable auto closing of the connection to the remote browser
   * @return {Crawler}
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
    this.emit('error', {type: 'warc-gen', err})
  }

  /**
   * @desc Listener for warc generator finished
   * @private
   */
  _onWARCGenFinished () {
    this.emit('warc-gen-finished')
  }

  /**
   * @desc Create a new {@link Crawler} instance with auto close enabled
   * @param options
   * @return {Crawler}
   */
  static withAutoClose (options = defaultOpts) {
    return new Crawler(options)._enableAutoClose()
  }
}

module.exports = Crawler
