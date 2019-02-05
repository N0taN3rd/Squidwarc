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
const { Events } = require('puppeteer/lib/Events')
const autobind = require('class-autobind')
const H = require('./helper')

/**
 * @desc Monitors the HTTP requests made by a page and emits the 'network-idle' event when it has been determined the network is idle
 * Used by {@link PuppeteerCrawler}
 * @extends {EventEmitter}
 */
class NetIdleWatcher extends EventEmitter {
  /**
   * @param {Page} page - Puppeteer page object for the page being crawled
   * @param {?NetIdleOptions} [options = {}] - Optional options to control fine tune network idle determination
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
    this._idleTime = options.inflightIdle || 1500

    /**
     * @desc The number of in-flight requests there should be before starting the network-idle timer
     * @type {number}
     * @private
     */
    this._idleInflight = options.numInflight || 2

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

    /**
     * @desc An array of listeners registered on the page object
     * @type {{emitter: !EventEmitter, eventName: string, handler: function()}[]}
     * @private
     */
    this._pageListenrs = []

    autobind.default(this, NetIdleWatcher.prototype)
  }

  /**
   * @desc Start monitoring the network and receive a Promise that resolves once network idle occurred or the global wait time has been reached
   * @param {Page} page - Puppeteer page object for the page being crawled
   * @param {?NetIdleOptions} [options = {}] - Optional options to control fine tune network idle determination
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
      H.addEventListener(this.page, Events.Page.Request, this.reqStarted),
      H.addEventListener(this.page, Events.Page.Response, this.reqFinished),
      H.addEventListener(this.page, Events.Page.RequestFailed, this.reqFinished)
    ]
    this._requestIds.clear()
    this._doneTimers = false
    this._globalWaitTimer = setTimeout(this._globalNetworkTimeout, this._timeout)
  }

  /**
   * @desc Indicate that a request was made
   * @param {Request} info - Puppeteer Request object
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
   * @param {Response | Request} info - Puppeteer Request or Response object
   */
  reqFinished (info) {
    if (!this._doneTimers) {
      if (info._requestId) {
        this._requestIds.delete(info._requestId)
      } else {
        this._requestIds.delete(info.request()._requestId)
      }
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

/**
 * @type {NetIdleWatcher}
 */
module.exports = NetIdleWatcher

/**
 * @typedef {Object} NetIdleOptions
 * @property {number} [globalWait = 40000]  - Maximum amount of time, in milliseconds, to wait for network idle to occur
 * @property {number} [numInflight = 2]     - The number of inflight requests (requests with no response) that should exist before starting the inflightIdle timer
 * @property {number} [inflightIdle = 1500] - Amount of time, in milliseconds, that should elapse when there are only numInflight requests for network idle to be determined
 */

/**
 *  @external {Page} https://pptr.dev/#?product=Puppeteer&version=v1.7.0&show=api-class-page
 */
