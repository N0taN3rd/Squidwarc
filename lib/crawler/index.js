/*
 Squidwarc  Copyright (C) 2017  John Berlin <n0tan3rd@gmail.com>

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
const CDP = require('chrome-remote-interface')
const EventEmitter = require('eventemitter3')
const Promise = require('bluebird')
const RequestMonitor = require('../../node-warc/lib/requestCapturers/remoteChrome')
const WARCGenerator = require('../../node-warc/lib/writers/remoteChrome')
const pageEvals = require('../utils/pageEvals')
const defaults = require('../defaults')
const cp = require('../utils/colorPrinters')
const fs = require('fs-extra')

const {defaultOpts, UA} = defaults

/*
 Map.prototype.entries = function() {};
 Map.prototype.forEach = function(callbackfn,thisArg) {};
 Map.prototype.get = function(key) {};
 Map.prototype.has = function(key) {};
 Map.prototype.keys = function() {};
 Map.prototype.set = function(key,value) {};
 Map.prototype.values = function() {};
 */

/**
 *
 */
class Crawler extends EventEmitter {
  /**
   *
   * @param options
   */
  constructor (options = defaultOpts) {
    super()
    options.connect = options.connect || defaultOpts.connect
    options.timeouts = options.timeouts || defaultOpts.timeouts
    options.deviceMetrics = options.deviceMetrics || defaultOpts.deviceMetrics
    this.options = options
    this._client = null
    this._autoClose = false
    this.requestMonitor = null
    this._currentUrl = null
    this._navTimeout = null
    this._noHTTP2 = options.noHTTP2
    this._warcGenerator = new WARCGenerator(options.noHTTP2)
    this.init = this.init.bind(this)
    this._onWARCGenFinished = this._onWARCGenFinished.bind(this)
    this._onWARCGenError = this._onWARCGenError.bind(this)
    this._close = this._close.bind(this)
    this._navTimedOut = this._navTimedOut.bind(this)
    this._connected = this._connected.bind(this)
    this._didNavigate = this._didNavigate.bind(this)
    this._pageLoaded = this._pageLoaded.bind(this)
  }

  /**
   * @desc Connect to the Chrome instance the crawler will be using
   */
  init () {
    CDP(this.options.connect, this._connected)
      .on('error', (err) => {
        this.emit('error', {type: 'connection', err})
      })
      .on('disconnect', () => {
        this.emit('disconnected')
      })
  }

  /**
   * @desc Navigate to a new Web Page
   * @param {string} url
   */
  navigate (url) {
    this._currentUrl = url
    this.requestMonitor.startCapturing()
    this._client.Page.navigate({url}, this._didNavigate)
    if (this.options.timeouts.navigationTimeout) {
      this._navTimeout = setTimeout(this._navTimedOut, this.options.timeouts.navigationTimeout)
    }
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
   * @desc Disconnect from the Chrome instance currently attached to
   * @param args
   */
  shutdown (...args) {
    return this._client.close(...args)
  }

  initWARC (warcPath, appending = false) {
    this._warcGenerator.initWARC(warcPath, appending)
  }

  async genWarc ({info, outlinks}) {
    info = info || {}
    info.isPartOfV = info.isPartOfV || this.options.versionInfo.isPartOfV
    info.warcInfoDescription = info.warcInfoDescription || this.options.versionInfo.warcInfoDescription
    await this._warcGenerator.writeWarcInfoRecord(info.isPartOfV, info.warcInfoDescription, UA)
    await this._warcGenerator.writeWarcMetadataOutlinks(this._currentUrl, outlinks)
    this.requestMonitor.stopCapturing()
    for (let nreq of this.requestMonitor.values()) {
      try {
        if (nreq.redirectResponse) {
          await this._warcGenerator.generateRedirectResponse(nreq, this._client.Network)
        } else {
          switch (nreq.method) {
            case 'POST':
              await this._warcGenerator.generatePost(nreq, this._client.Network)
              break
            case 'GET':
              await this._warcGenerator.generateGet(nreq, this._client.Network)
              break
            case 'OPTIONS':
              await this._warcGenerator.generateOptions(nreq, this._client.Network)
              break
            default:
              if (
                (nreq.headers === null || nreq.headers === undefined) &&
                (nreq.method === null || nreq.method === undefined) &&
                (nreq.url === null || nreq.url === undefined) &&
                (nreq.res !== null || nreq.res !== undefined)
              ) {
                await this._warcGenerator.generateOnlyRes(nreq, this._client.Network)
              } else {
                await this._warcGenerator.generateOther(nreq, this._client.Network)
              }
              break
          }
        }
      } catch (error) {
        console.error(error)
      }
    }

    await fs.writeJSON('raw.json', this.requestMonitor._raw)

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

  async getOutLinkMetadata () {
    try {
      let evaled = await this._client.Runtime.evaluate(pageEvals.pageEval)
      return evaled.result.value
    } catch (error) {
      throw error
    }
  }

  async getOutLinkMetadataSameD () {
    try {
      let evaled = await this._client.Runtime.evaluate(pageEvals.metadataSameD)
      return evaled.result.value
    } catch (error) {
      throw error
    }
  }

  async getOutLinkMetadataAll () {
    try {
      let evaled = await this._client.Runtime.evaluate(pageEvals.metadataAll)
      return evaled.result.value
    } catch (error) {
      throw error
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
   * @desc Callback used when first connecting to the browser
   * @param client
   * @return {Promise.<void>}
   * @private
   */
  async _connected (client) {
    this._warcGenerator.on('finished', this._onWARCGenFinished)
    this._warcGenerator.on('error', this._onWARCGenError)
    this._client = client
    let wasError = false
    try {
      await Promise.all([
        this._client.Runtime.enable(),
        this._client.DOM.enable(),
        this._client.Page.enable(),
        this._client.Network.enable()
      ])
    } catch (err) {
      wasError = true
      this.emit('error', {type: 'enabling-browser-hooks', err})
    }

    if (!wasError) {
      if (await this._client.Network.canClearBrowserCache()) {
        await this._client.Network.clearBrowserCache()
      }
      await this._client.Emulation.setDeviceMetricsOverride(this.options.deviceMetrics)
      await this._client.Network.setCacheDisabled({cacheDisabled: true})
      await this._client.Network.setBypassServiceWorker({bypass: true})
      await this._client.Page.addScriptToEvaluateOnLoad(pageEvals.noNaughtyJS)
      this.requestMonitor = new RequestMonitor(this._client.Network, this._noHTTP2)
      this._client.Page.loadEventFired(this._pageLoaded)
      this.emit('connected')
    }
  }

  /**
   * @desc Callback for the failed to navigate timeout
   * @private
   */
  _navTimedOut () {
    if (this._navTimeout) {
      clearTimeout(this._navTimeout)
      this._navTimeout = null
    }
    this._navTimeout = null
    this.emit('navigation-timedout', this._currentUrl)
  }

  /**
   * @desc Callback used for Page.navigate
   * @private
   */
  _didNavigate (...args) {
    if (this._navTimeout) {
      clearTimeout(this._navTimeout)
      this._navTimeout = null
    }
    this.emit('navigated', this._currentUrl)
  }

  /**
   * @desc Callback for Page.load event
   * @param info
   * @return {Promise.<void>}
   * @private
   */
  async _pageLoaded (info) {
    if (this._navTimeout) {
      clearTimeout(this._navTimeout)
      this._navTimeout = null
    }
    if (this.options.scroll) {
      try {
        await this._client.Runtime.evaluate(pageEvals.makeSmoothScroll(this.options.scroll))
      } catch (error) {
        cp.error('Smooth Scroll Failed', error)
      }
    }
    if (this.options.timeouts.waitAfterLoad) {
      await Promise.delay(this.options.timeouts.waitAfterLoad)
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
   * @desc Create a new {@link Crawler} instace with auto close enabled
   * @param options
   * @return {Crawler}
   */
  static withAutoClose (options = defaultOpts) {
    return new Crawler(options)._enableAutoClose()
  }

  static Protocol (...args) {
    return CDP.Protocol(...args)
  }

  static List (...args) {
    return CDP.List(...args)
  }

  static New (...args) {
    return CDP.New(...args)
  }

  static Activate (...args) {
    return CDP.Activate(...args)
  }

  static Close (...args) {
    return CDP.Close(...args)
  }

  static Version (...args) {
    return CDP.Version(...args)
  }
}

module.exports = Crawler
