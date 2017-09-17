const EventEmitter = require('eventemitter3')

class NavigationMan extends EventEmitter {
  constructor (parentEmitter, options) {
    super()
    this._timeout = options.globalWait || 40000 // could be 30 seconds
    this._idleTime = options.inflightIdle || 1000 // could be 1500 (1.5 seconds)
    this._idleInflight = options.numInflight || 2 // could be 4
    this._navTimeoutTime = options.navWait || 8000
    this._requestIds = new Set()
    this._idleTimer = null
    this._doneTimers = false
    this._globalWaitTimer = null
    this._parentEmitter = parentEmitter
    this._networkIdled = this._networkIdled.bind(this)
    this._globalNetworkTimeout = this._globalNetworkTimeout.bind(this)
    this._didNavigate = this._didNavigate.bind(this)
    this._navTimedOut = this._navTimedOut.bind(this)
    this.reqFinished = this.reqFinished.bind(this)
    this.reqStarted = this.reqStarted.bind(this)
  }

  startedNav () {
    this._requestIds.clear()
    this._doneTimers = false
    this._navTimeout = setTimeout(this._navTimedOut, this._navTimeoutTime)
    this._globalWaitTimer = setTimeout(this._globalNetworkTimeout, this._timeout)
  }

  reqStarted (info) {
    if (!this._doneTimers) {
      this._requestIds.add(info.requestId)
      if (this._requestIds.size > this._idleInflight) {
        clearTimeout(this._idleTimer)
        this._idleTimer = null
      }
    }
  }

  reqFinished (info) {
    if (!this._doneTimers) {
      this._requestIds.delete(info.requestId)
      if (this._requestIds.size <= this._idleInflight && !this._idleTimer) {
        this._idleTimer = setTimeout(this._networkIdled, this._idleTime)
      }
    }
  }

  _navTimedOut () {
    if (this._navTimeout) {
      clearTimeout(this._navTimeout)
      this._navTimeout = null
    }
    this._emitEvent('navigation-timedout')
  }

  _didNavigate () {
    if (this._navTimeout) {
      clearTimeout(this._navTimeout)
      this._navTimeout = null
    }
    this._emitEvent('navigated')
  }

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

  _emitEvent (event) {
    if (this._parentEmitter) {
      this._parentEmitter.emit(event)
    } else {
      this.emit(event)
    }
  }
}

module.exports = NavigationMan
