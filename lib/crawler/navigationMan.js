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
   * @param {{globalWait: ?number, inflightIdle: ?number, numInflight: ?number, navWait: ?number}} options
   * @param {?EventEmitter} parentEmitter
   */
  constructor (options, parentEmitter) {
    super()
    options = options || {}
    /**
     * @type {number}
     * @private
     */
    this._timeout = options.globalWait || 40000 // could be 30 seconds
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
     * @type {number}
     * @private
     */
    this._navTimeoutTime = options.navWait || 8000
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
    /**
     * @type {?EventEmitter}
     * @private
     */
    this._parentEmitter = parentEmitter
    /**
     * @type {?string}
     * @private
     */
    this._curl = null
    this.pageLoadStrat = options.pageLoad
    this._networkIdled = this._networkIdled.bind(this)
    this._globalNetworkTimeout = this._globalNetworkTimeout.bind(this)
    this.didNavigate = this.didNavigate.bind(this)
    this._navTimedOut = this._navTimedOut.bind(this)
    this.reqFinished = this.reqFinished.bind(this)
    this.reqStarted = this.reqStarted.bind(this)
  }

  /**
   * @desc Start Timers For Navigation Monitoring
   * @param {String} curl the URL browser is navigating to
   */
  startedNav (curl) {
    this._curl = curl
    this._requestIds.clear()
    this._doneTimers = false
    this._navTimeout = setTimeout(this._navTimedOut, this._navTimeoutTime)
    if (!this.pageLoadStrat) {
      this._globalWaitTimer = setTimeout(this._globalNetworkTimeout, this._timeout)
    }
  }

  /**
   * @desc Indicate that a request was made
   * @param {Object} info
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
   * @param {Object} info
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
    this._emitEvent('network-idle')
  }

  /**
   * @desc Called when the network idle has been determined
   * @private
   */
  _networkIdled () {
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
    this._emitEvent('network-idle')
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

  /**
   * @desc Emit an event
   * @param {string} event
   * @param {...any} args
   * @private
   */
  _emitEvent (event, ...args) {
    if (this._parentEmitter) {
      this._parentEmitter.emit(event, ...args)
    } else {
      this.emit(event, ...args)
    }
  }
}

module.exports = NavigationMan
