/*
 Squidwarc  Copyright (C) 2017-present  John Berlin <n0tan3rd@gmail.com>

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
/**
 *  @external {Page} https://pptr.dev/#?product=Puppeteer&version=v1.7.0&show=api-class-page
 */

const EventEmitter = require('eventemitter3')
const H = require('./helper')
const autobind = require('class-autobind')

/**
 * @desc Monitors the HTTP requests made by a page and emits the 'network-idle' event when it has been determined the network is idle
 * Used by {@link PuppeteerCrawler}
 */
class NetIdleWatcher extends EventEmitter {
  /**
   * @param {Page} page
   * @param {{globalWait: ?number, inflightIdle: ?number, numInflight: ?number, navWait: ?number}} [options = {}]
   */
  constructor (page, options = {}) {
    super()

    /**
     * @desc Maximum amount of time a crawler going to visit a page
     * @type {number}
     * @private
     */
    this._timeout = options.globalWait || 40000

    /**
     * @desc The amount of time no new HTTP requests should be made before emitting the network-idle event
     * @type {number}
     * @private
     */
    this._idleTime = options.inflightIdle || 1000 // could be 1500 (1.5 seconds)

    /**
     * @desc The number of in-flight requests there should be before starting the network-idle timer
     * @type {number}
     * @private
     */
    this._idleInflight = options.numInflight || 2 // could be 4

    /**
     * @desc Set of the HTTP requests ids, used for tracking network-idle
     * @type {Set<string>}
     * @private
     */
    this._requestIds = new Set()

    /**
     * @desc The id of the setTimeout for the network-idle timer
     * @type {?number}
     * @private
     */
    this._idleTimer = null

    /**
     * @desc Flag indicating if we are in a network tracking state of not
     * @type {boolean}
     * @private
     */
    this._doneTimers = false

    /**
     * @desc The id of the global crawler setTimeout timer
     * @type {?number}
     * @private
     */
    this._globalWaitTimer = null

    /**
     * @desc The page object of the current page the crawler is visting
     * @type {Page}
     */
    this.page = page
    autobind.default(this, NetIdleWatcher.prototype)
  }

  /**
   * @desc Start monitoring the network and receive a Promise that resolves once network idle occurred or the global wait time has been reached
   * @param {Page} page
   * @param {{globalWait: ?number, inflightIdle: ?number, numInflight: ?number, navWait: ?number}} options
   * @return {Promise<void>}
   */
  static idlePromise (page, options) {
    const im = new NetIdleWatcher(page, options)
    return new Promise((resolve, reject) => {
      im.start()
      im.on('network-idle', resolve)
    })
  }

  /**
   * @desc Setup the necessary listeners
   */
  start () {
    this._pageListenrs = [
      H.addEventListener(this.page, 'request', this.reqStarted),
      H.addEventListener(this.page, 'requestfailed', this.reqFinished),
      H.addEventListener(this.page, 'requestfinished', this.reqFinished)
    ]
    this._requestIds.clear()
    this._doneTimers = false
    this._globalWaitTimer = setTimeout(this._globalNetworkTimeout, this._timeout)
  }

  /**
   * @desc Indicate that a request was made
   * @external {Request} https://pptr.dev/#?product=Puppeteer&version=v1.7.0&show=api-class-request
   * @param {Request} info
   */
  reqStarted (info) {
    if (!this._doneTimers) {
      this._requestIds.add(info._requestId)
      if (this._requestIds.size > this._idleInflight) {
        clearTimeout(this._idleTimer)
        this._idleTimer = null
      }
    }
  }

  /**
   * @desc Indicate that a request has finished
   * @external {Request} https://pptr.dev/#?product=Puppeteer&version=v1.7.0&show=api-class-request
   * @param {Request} info
   */
  reqFinished (info) {
    if (!this._doneTimers) {
      this._requestIds.delete(info._requestId)
      if (this._requestIds.size <= this._idleInflight && !this._idleTimer) {
        this._idleTimer = setTimeout(this._networkIdled, this._idleTime)
      }
    }
  }

  /**
   * @desc Called when the global time limit was hit
   * @private
   */
  _globalNetworkTimeout () {
    if (!this._doneTimers) {
      this._doneTimers = true
    }
    this._clearTimers()
    process.nextTick(this._emitNetIdle)
  }

  /**
   * @desc Called when the network idle has been determined
   * @private
   */
  _networkIdled () {
    if (!this._doneTimers) {
      this._doneTimers = true
    }
    this._clearTimers()
    process.nextTick(this._emitNetIdle)
  }

  /**
   * @desc Emit the network-idle event
   * @private
   */
  _emitNetIdle () {
    H.removeEventListeners(this._pageListenrs)
    this.emit('network-idle')
  }

  /**
   * @desc Clear all timers
   * @private
   */
  _clearTimers () {
    if (this._globalWaitTimer) {
      clearTimeout(this._globalWaitTimer)
      this._globalWaitTimer = null
    }
    if (this._idleTimer) {
      clearTimeout(this._idleTimer)
      this._idleTimer = null
    }
  }
}

module.exports = NetIdleWatcher
