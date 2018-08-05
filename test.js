const puppeteer = require('puppeteer')
const {scroller} = require('./lib/injectManager/injectFuns')
const DEFAULT_ARGS = require('./lib/launcher/defaultArgs')
const PC = require('./node-warc/lib/requestCapturers/puppeteer')
const NavMan = require('./lib/crawler/navigationMan')
const EventEmitter = require('eventemitter3')

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
    this._networkIdled = this._networkIdled.bind(this)
    this._globalNetworkTimeout = this._globalNetworkTimeout.bind(this)
    this.reqFinished = this.reqFinished.bind(this)
    this.reqStarted = this.reqStarted.bind(this)
    page.on('request', this.reqStarted)
    page.on('requestfailed', this.reqFinished)
    page.on('requestfinished', this.reqFinished)
  }

  static idlePromise (page, options) {
    const im = new NetIdle(page, options)
    return new Promise((resolve, reject) => {
      im.on('network-idle', resolve)
    })
  }

  start () {
    this._requestIds.clear()
    this._doneTimers = false
    if (!this.pageLoadStrat) {
      this._globalWaitTimer = setTimeout(this._globalNetworkTimeout, this._timeout)
    }
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
    process.nextTick(() => this.emit('network-idle'))
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
    process.nextTick(() => this.emit('network-idle'))
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

async function doIt () {
  const browser = await puppeteer.launch({
    headless: true,
    ignoreDefaultArgs: true,
    args: DEFAULT_ARGS
  })
  const page = await browser.newPage()
  await page.setViewport({width: 1920, height: 1080})
  await page.evaluateOnNewDocument(scroller)
  // console.log(page)
  const pc = new PC(page)
  const url = 'https://www.instagram.com/visit_berlin/'
  // page.on('request', r => {
  //   console.log(r.url())
  // })

  pc.startCapturing()
  await page.goto(url, {waitUntil: 'networkidle2'})
  console.log('doing collection')
  const nip = NetIdle.idlePromise(page)
  await page.$$eval('*[srcset]', async ss => {
    const noop = () => {}
    const doFetch = url => fetch(url).catch(noop)
    const found = []
    const srcsetSplit = /\s*(\S*\s+[\d.]+[wx]),|(?:\s*,(?:\s+|(?=https?:)))/
    for (let i = 0; i < ss.length; i++) {
      const srcset = ss[i].srcset
      const values = srcset.split(srcsetSplit).filter(Boolean)
      for (let j = 0; j < values.length; j++) {
        const value = values[j].trim()
        if (value.length > 0) {
          const url = value.split(' ')[0]
          found.push(url)
          await doFetch(url)
        }
      }
    }
    return found
  })
  await nip
  for (const req of pc.iterateRequests()) {
    const res = req.response()
    console.log(req.url())
    if (res && res.ok()) {
      console.log(await res.buffer())
    }
  }
  await browser.close()
  // console.log(map)
}

doIt().catch(err => console.error(err))


