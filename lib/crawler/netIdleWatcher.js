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
const EventEmitter = require('eventemitter3')
const H = require('./helper')
const autobind = require('class-autobind').default

class NetIdle extends EventEmitter {
  /**
   * @param {Page} page
   * @param {{globalWait: ?number, inflightIdle: ?number, numInflight: ?number, navWait: ?number, pageLoad: ?boolean}} [options]
   */
  constructor (page, options) {
    super()
    options = options || {}

    /**
     * @type {number}
     * @private
     */
    this._timeout = options.globalWait || 40000

    /**
     * @type {number}
     * @private
     */
    this._idleTime = options.inflightIdle || 1000 // could be 1500 (1.5 seconds)

    /**
     * @type {number}
     * @private
     */
    this._idleInflight = options.numInflight || 2 // could be 4

    /**
     * @type {Set<string>}
     * @private
     */
    this._requestIds = new Set()

    /**
     * @type {?number}
     * @private
     */
    this._idleTimer = null

    /**
     * @type {boolean}
     * @private
     */
    this._doneTimers = false

    /**
     * @type {?number}
     * @private
     */
    this._globalWaitTimer = null
    this.page = page
    autobind(this, NetIdle.prototype)
  }

  static idlePromise (page, options) {
    const im = new NetIdle(page, options)
    return new Promise((resolve, reject) => {
      im.start()
      im.on('network-idle', resolve)
    })
  }

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

  reqStarted (info) {
    if (!this._doneTimers) {
      this._requestIds.add(info._requestId)
      if (this._requestIds.size > this._idleInflight) {
        clearTimeout(this._idleTimer)
        this._idleTimer = null
      }
    }
  }

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

module.exports = NetIdle
