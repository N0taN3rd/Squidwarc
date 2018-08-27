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
const FH = require('./helper')
const SeedTracker = require('./seedTracker')
const { cmodePO } = require('./modes')

/**
 * @desc In memory implementation of a frontier
 */
class Frontier {
  /**
   * @desc Create a new frontier object
   */
  constructor () {
    /**
     * @desc URLs to be crawled
     * @type {Array<{url: string, mode: Symbol, cdepth: number, tracker: string}>}
     */
    this.queue = []

    /**
     * @desc Tracks the depth and crawl config per starting seed
     * @type {Map<string, SeedTracker>}
     */
    this.trackers = new Map()

    /**
     * @desc Information pertaining to the current URL being crawled
     * @type {?{url: string, mode: Symbol, cdepth: number, tracker: string}}
     */
    this.current = null
  }

  /**
   * @desc Initialize the initial frontier
   * @param {Array<{url: string, mode: Symbol, depth:number}> | {url: string, mode: Symbol, depth:number}} starting
   */
  init (starting) {
    if (Array.isArray(starting)) {
      let i = 0
      let len = starting.length
      let strt
      while (i < len) {
        strt = starting[i]
        this.trackers.set(strt.url, new SeedTracker(strt.url, strt.mode, strt.depth || 1))
        this.queue.push({
          url: strt.url,
          cdepth: 0,
          mode: strt.mode,
          tracker: strt.url
        })
        i++
      }
    } else {
      this.trackers.set(
        starting.url,
        new SeedTracker(starting.url, starting.mode, starting.depth || 1)
      )
      this.queue.push({
        url: starting.url,
        cdepth: 0,
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
   * @param {Array<{href: string, pathname: string, host: string}>} links list of seeds to consider
   */
  process (links) {
    const tracker = this.trackers.get(this.current.tracker)
    tracker.crawledURL()
    if (this.current.mode !== cmodePO) {
      const nextDepth = this.current.cdepth + 1
      const nextMode = nextDepth < tracker.depth ? this.current.mode : cmodePO
      let i = links.length
      let url
      while (i--) {
        url = links[i]
        if (FH.shouldAddToFrontier(url, this.current.url, tracker)) {
          tracker.addToSeen(url.href)
          this.queue.push({
            url: url.href,
            cdepth: nextDepth,
            mode: nextMode,
            tracker: this.current.tracker
          })
        }
      }
    }
    if (tracker.done()) {
      this.trackers.delete(this.current.tracker)
    }
  }
}

module.exports = Frontier
