const Path = require('path')
const parseDomain = require('parse-domain')
const bigExtLookup = require('../utils/bigExtLookup')()

const cmodePO = Symbol('page-only')
const cmodePSD = Symbol('page-same-domain')
const cmodePAL = Symbol('page-all-links')

/**
 * @desc In memory implementation of a frontier
 */
class Frontier {
  constructor () {
    /**
     * @desc URLs to be crawled
     * @type {Array<{url: string,mode: Symbol, cdepth: number, depth:number, tracker: string}>}
     */
    this.queue = []

    /**
     * @desc Tracks the depth and crawl config per starting seed
     * @type {Map<string, {count: number, seen: Set<string>}>}
     */
    this.trackers = new Map()
  }

  /**
   * @desc Retrieve the crawl-mode symbol from a configs string
   * @param {string} mode
   * @returns {symbol}
   */
  static crawlModeToSymbol (mode) {
    if (mode) {
      switch (mode) {
        case 'page-only':
        case 'po':
          return cmodePO
        case 'page-same-domain':
        case 'psd':
          return cmodePSD
        case 'page-all-links':
        case 'pal':
          return cmodePAL
        default:
          return cmodePO
      }
    } else {
      return cmodePO
    }
  }

  /**
   * @desc Ensure the starting seed list is one the frontier can understand
   * @param {Array<{url:string,mode:string,depth:number}|string>|{url:string,mode:string,depth:number}|string} seeds
   * @param {string} mode
   * @param {number} depth
   * @returns {Array<{url:string,mode:symbol,depth:number}>|{url:string,mode:symbol,depth:number}}
   */
  static normalizeSeeds (seeds, mode, depth = 1) {
    if (Array.isArray(seeds)) {
      return seeds.map(aSeed => {
        if (typeof aSeed === 'object') {
          aSeed.mode = Frontier.crawlModeToSymbol(aSeed.mode || mode)
          aSeed.depth = aSeed.depth || depth
          return aSeed
        } else if (typeof aSeed === 'string') {
          return {
            url: aSeed,
            mode: Frontier.crawlModeToSymbol(mode),
            depth
          }
        }
      })
    } else if (typeof seeds === 'object') {
      seeds.mode = Frontier.crawlModeToSymbol(seeds.mode || mode)
      seeds.depth = seeds.depth || depth
      return seeds
    } else if (typeof seeds === 'string') {
      return {
        url: seeds,
        mode: Frontier.crawlModeToSymbol(mode),
        depth
      }
    }
  }

  /**
   * @desc Initialize the initial frontier
   * @param {Array<{url: string,mode: Symbol, depth:number}> | {url: string,mode: Symbol, depth:number}} starting
   */
  init (starting) {
    if (Array.isArray(starting)) {
      let i = 0
      let len = starting.length
      let strt
      while (i < len) {
        strt = starting[i]
        this.trackers.set(strt.url, {
          count: 1,
          seen: new Set([strt.url])
        })
        this.queue.push({
          url: strt.url,
          cdepth: 0,
          depth: strt.depth || 1,
          mode: strt.mode,
          tracker: strt.url
        })
        i++
      }
    } else {
      this.trackers.set(starting.url, {
        count: 1,
        seen: new Set([starting.url])
      })
      this.queue.push({
        url: starting.url,
        cdepth: 0,
        depth: starting.depth || 1,
        mode: starting.mode,
        tracker: starting.url
      })
    }
  }

  /**
   * @desc Returns the number of URLs left in the queue
   * @return {number}
   */
  size () {
    return this.queue.length
  }

  /**
   * @desc Is the frontier exhausted
   * @return {boolean}
   */
  exhausted () {
    return this.queue.length === 0
  }

  /**
   * @desc Get the next URL to crawl from the frontier, queue length - 1
   * @return {?string}
   */
  next () {
    this.current = this.queue.shift()
    if (this.current) {
      return this.current.url
    }
    return undefined
  }

  /**
   * @desc Process discovered outlinks of a page based on the originating seeds configuration
   * @param {Array<string>} links list of seeds to consider
   */
  process (links) {
    let nextDepth = this.current.cdepth + 1
    let tracker = this.trackers.get(this.current.tracker)
    let next
    tracker.count -= 1
    if (this.current.mode !== cmodePO) {
      if (nextDepth < this.current.depth) {
        if (this.current.mode === cmodePSD) {
          next = this.processSD(links, nextDepth, tracker)
        } else {
          next = this.processAL(links, nextDepth, tracker)
        }
        if (next.length) {
          this.queue = this.queue.concat(next)
        }
      } else {
        next = this.processPO(links, nextDepth, tracker)
        if (next.length) {
          this.queue = this.queue.concat(next)
        }
      }
    }
    if (tracker.count === 0) {
      this.trackers.delete(this.current.tracker)
    }
  }

  /**
   * @desc Process a list of seeds using the page-only configuration
   * @param {Array<{href: string, pathname: string, host: string}>} links
   * @param {number} nextDepth
   * @param {{count: number, seen: Set<string>}} tracker
   * @return {Array<{url: string,mode: Symbol, cdepth: number, depth:number, tracker: string}>}
   */
  processPO (links, nextDepth, tracker) {
    let i = 0
    let len = links.length
    let next = []
    while (i < len) {
      let url = links[i]
      let ext = Path.extname(url.pathname)
      if (ext !== '' && !bigExtLookup[ext] && !tracker.seen.has(url.href)) {
        tracker.seen.add(url.href)
        next.push({
          url: url.href,
          cdepth: nextDepth,
          depth: this.current.depth,
          mode: cmodePO,
          tracker: this.current.tracker
        })
      } else if (!tracker.seen.has(url.href)) {
        tracker.seen.add(url.href)
        next.push({
          url: url.href,
          cdepth: nextDepth,
          depth: this.current.depth,
          mode: cmodePO,
          tracker: this.current.tracker
        })
      }
      i++
    }
    tracker.count += next.length
    return next
  }

  /**
   * @desc Process a list of seeds using the page-same-domain configuration
   * @param {Array<{href: string, pathname: string, host: string}>} links
   * @param {number} nextDepth
   * @param {{count: number, seen: Set<string>}} tracker
   * @return {Array<{url: string,mode: Symbol, cdepth: number, depth:number, tracker: string}>}
   */
  processSD (links, nextDepth, tracker) {
    let cDomain = parseDomain(this.current.url)
    let i = 0
    let len = links.length
    let next = []
    while (i < len) {
      let url = links[i]
      let ext = Path.extname(url.pathname)
      let td = parseDomain(url.host)
      if (ext !== '') {
        if (td && !bigExtLookup[ext] && !tracker.seen.has(url.href) && cDomain.domain === td.domain) {
          tracker.seen.add(url.href)
          next.push({
            url: url.href,
            cdepth: nextDepth,
            depth: this.current.depth,
            mode: this.current.mode,
            tracker: this.current.tracker
          })
        }
      } else if (td && !tracker.seen.has(url.href) && cDomain.domain === td.domain) {
        tracker.seen.add(url.href)
        next.push({
          url: url.href,
          cdepth: nextDepth,
          depth: this.current.depth,
          mode: this.current.mode,
          tracker: this.current.tracker
        })
      }
      i++
    }
    tracker.count += next.length
    return next
  }

  /**
   * @desc Process a list of seeds using the page-all-links configuration
   * @param {Array<{href: string, pathname: string, host: string}>} links
   * @param {number} nextDepth
   * @param {{count: number, seen: Set<string>}} tracker
   * @return {Array<{url: string,mode: Symbol, cdepth: number, depth:number, tracker: string}>}
   */
  processAL (links, nextDepth, tracker) {
    let i = 0
    let len = links.length
    let next = []
    while (i < len) {
      let url = links[i]
      let pname = url.pathname
      let ext = Path.extname(pname)
      if (ext !== '' && !bigExtLookup[ext] && !tracker.seen.has(url.href)) {
        tracker.seen.add(url.href)
        next.push({
          url: url.href,
          cdepth: nextDepth,
          depth: this.current.depth,
          mode: this.current.mode,
          tracker: this.current.tracker
        })
      } else if (!tracker.seen.has(url.href)) {
        tracker.seen.add(url.href)
        next.push({
          url: url.href,
          cdepth: nextDepth,
          depth: this.current.depth,
          mode: this.current.mode,
          tracker: this.current.tracker
        })
      }
      i++
    }
    tracker.count += next.length
    return next
  }
}

module.exports = Frontier
