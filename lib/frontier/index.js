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
const FH = require('./helper')
const SeedTracker = require('./seedTracker')
const { cmodePO, cmodSite } = require('./modes')

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
     * @type {{url: string, mode: symbol, cdepth: number, tracker: string}[]}
     */
    this.queue = []

    /**
     * @desc Tracks the depth and crawl config per starting seed
     * @type {Map<string, SeedTracker>}
     */
    this.trackers = new Map()

    /**
     * @desc Information pertaining to the current URL being crawled
     * @type {?{url: string, mode: symbol, cdepth: number, tracker: string}}
     */
    this.current = null
  }

  /**
   * @desc Initialize the initial frontier
   * @param {Seed[] | Seed} starting
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
    if (this.current.mode === cmodSite) {
      return this._processSiteMode(links)
    }
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

  _processSiteMode (links) {
    const tracker = this.trackers.get(this.current.tracker)
    const nextDepth = this.current.cdepth + 1
    let i = links.length
    let url
    while (i--) {
      url = links[i]
      if (FH.shouldAddToFrontier(url, this.current.url, tracker)) {
        tracker.addToSeen(url.href)
        this.queue.push({
          url: url.href,
          cdepth: nextDepth,
          mode: cmodSite,
          tracker: this.current.tracker
        })
      }
    }
  }
}

/**
 * @type {Frontier}
 */
module.exports = Frontier
