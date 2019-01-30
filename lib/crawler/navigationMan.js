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

/**
 * @desc Monitor navigation and request events for crawling a page.
 * @emits {network-idle} when network idle has been detected or global-wait timer has fired
 * @emits {navigated} when the browser has navigated
 * @emits {navigation-timedout} when the browser has not navigated
 * @extends {EventEmitter}
 */
class NavigationMan extends EventEmitter {
  /**
   *
   * @param {CrawlControl} [options = {}]
   * @param {EventEmitter} [parentEmitter]
   */
  constructor (options = {}, parentEmitter) {
    super()

    /**
     * @desc Maximum amount of time, in milliseconds, before generating a WARC and moving to the next URL
     * @type {number}
     * @private
     */
    this._timeout = options.globalWait || 60000 // could be 30 seconds

    /**
     * @desc Amount of time, in milliseconds, that should elapse when there are only {@link _idleInflight} requests for network idle to be determined
     * @type {number}
     * @private
     */
    this._idleTime = options.inflightIdle || 1000 // could be 1500 (1.5 seconds)

    /**
     * @desc The number of inflight requests (requests with no response) that should exist before starting the inflightIdle timer
     * @type {number}
     * @private
     */
    this._idleInflight = options.numInflight || 2 // could be 4

    /**
     * @desc How long should we wait before for navigation to occur before emitting navigation-timedout event
     * @type {number}
     * @private
     */
    this._navTimeoutTime = options.navWait || 8000

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
     * @desc The id of the navigation setTimeout timer
     * @type {?number}
     * @private
     */
    this._navTimeout = null

    /**
     * @desc An optional EventEmitter that we should emit this emitters events to rather than via ourselves
     * @type {?EventEmitter}
     * @private
     */
    this._parentEmitter = parentEmitter

    /**
     * @desc The url of the page a crawler is visiting
     * @type {?string}
     * @private
     */
    this._curl = null

    this._networkIdled = this._networkIdled.bind(this)
    this._globalNetworkTimeout = this._globalNetworkTimeout.bind(this)
    this.didNavigate = this.didNavigate.bind(this)
    this._navTimedOut = this._navTimedOut.bind(this)
    this.reqFinished = this.reqFinished.bind(this)
    this.reqStarted = this.reqStarted.bind(this)
  }

  /**
   * @desc Start Timers For Navigation Monitoring
   * @param {string} curl the URL browser is navigating to
   */
  startedNav (curl) {
    this._curl = curl
    this._requestIds.clear()
    this._doneTimers = false
    this._navTimeout = setTimeout(this._navTimedOut, this._navTimeoutTime)
    this._globalWaitTimer = setTimeout(this._globalNetworkTimeout, this._timeout)
  }

  /**
   * @desc Indicate that a request was made
   * @param {Object} info - CDP object received from Network.requestWillBeSent
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Network#event-requestWillBeSent
   */
  reqStarted (info) {
    if (!this._doneTimers) {
      this._requestIds.add(info.requestId)
      if (this._requestIds.size > this._idleInflight) {
        clearTimeout(this._idleTimer)
        this._idleTimer = null
      }
    }
  }

  /**
   * @desc Indicate that a request has finished
   * @param {Object} info - CDP Response object received by Network.responseReceived or Network.loadingFailed
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Network#event-responseReceived
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Network#event-loadingFailed
   */
  reqFinished (info) {
    if (!this._doneTimers) {
      this._requestIds.delete(info.requestId)
      if (this._requestIds.size <= this._idleInflight && !this._idleTimer) {
        this._idleTimer = setTimeout(this._networkIdled, this._idleTime)
      }
    }
  }

  /**
   * @desc Indicate that the browser has navigated to the current URL
   */
  didNavigate () {
    if (this._navTimeout) {
      clearTimeout(this._navTimeout)
      this._navTimeout = null
    }
    this._emitEvent('navigated', this._curl)
  }

  /**
   * @desc Used to have the NavigationManger emit the 'navigation-error' event
   * @param {Error | string} err
   */
  navigationError (err) {
    if (this._navTimeout) {
      clearTimeout(this._navTimeout)
      this._navTimeout = null
    }
    if (typeof err === 'string') {
      this._emitEvent('navigation-error', new Error(err))
    } else {
      this._emitEvent('navigation-error', err)
    }
  }

  /**
   * @desc Called when the navigation time limit was hit
   * @private
   */
  _navTimedOut () {
    if (this._navTimeout) {
      clearTimeout(this._navTimeout)
      this._navTimeout = null
    }
    this._emitEvent('navigation-timedout', this._curl)
  }

  /**
   * @desc Called when the global time limit was hit
   * @private
   */
  _globalNetworkTimeout () {
    this._clearTimers()
    this._emitEvent('network-idle')
  }

  /**
   * @desc Called when the network idle has been determined
   * @private
   */
  _networkIdled () {
    this._clearTimers()
    this._emitEvent('network-idle')
  }

  /**
   * @desc Clear all timers
   * @private
   */
  _clearTimers () {
    if (!this._doneTimers) {
      this._doneTimers = true
    }
    if (this._globalWaitTimer) {
      clearTimeout(this._globalWaitTimer)
      this._globalWaitTimer = null
    }
    if (this._idleTimer) {
      clearTimeout(this._idleTimer)
      this._idleTimer = null
    }
  }

  /**
   * @desc Emit an event
   * @param {string} event - The event name to be emitted
   * @param [arg]          - The value to be emitted for the event
   * @private
   */
  _emitEvent (event, arg) {
    if (this._parentEmitter) {
      this._parentEmitter.emit(event, arg)
    } else {
      this.emit(event, arg)
    }
  }
}

/**
 * @type {NavigationMan}
 */
module.exports = NavigationMan
