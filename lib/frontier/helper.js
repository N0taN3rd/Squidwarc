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
const Path = require('path')
const parseDomain = require('parse-domain')
const bigExtLookup = require('../utils/bigExtLookup')
const { cmodePO, cmodePAL, cmodePSD, cmodSite } = require('./modes')

/**
 * @desc Helper class providing utility functions for in memory frontier implementation {@link Frontier}
 */
class FrontierHelper {
  /**
   * @desc Ensure the starting seed list is one the frontier can understand
   * @param {Array<{url:string,mode:string,depth:number}|string>|{url:string,mode:string,depth:number}|string} seeds - The initial seeds for the crawl
   * @param {string} mode - The crawl mode for the crawl to be launched
   * @param {number} depth - The crawls depth
   * @returns {Seed | Seed[]} - The normalized {@link Seed}(s)
   */
  static normalizeSeeds (seeds, mode, depth = 1) {
    if (Array.isArray(seeds)) {
      return seeds.map(aSeed => {
        if (typeof aSeed === 'object') {
          return {
            url: aSeed.url,
            mode: FrontierHelper.crawlModeToSymbol(aSeed.mode || mode),
            depth: aSeed.depth || depth
          }
        } else if (typeof aSeed === 'string') {
          return {
            url: aSeed,
            mode: FrontierHelper.crawlModeToSymbol(mode),
            depth
          }
        }
      })
    } else if (typeof seeds === 'object') {
      return {
        url: seeds.url,
        mode: FrontierHelper.crawlModeToSymbol(seeds.mode || mode),
        depth: seeds.depth || depth
      }
    } else if (typeof seeds === 'string') {
      return {
        url: seeds,
        mode: FrontierHelper.crawlModeToSymbol(mode),
        depth
      }
    }
  }

  /**
   * @desc Retrieve the crawl-mode symbol from a configs string
   * @param {string} mode - The crawl mode
   * @returns {symbol} - The crawl modes internal symbol
   */
  static crawlModeToSymbol (mode) {
    if (mode) {
      switch (mode) {
        case 'site':
          return cmodSite
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
   * @desc Determine if a URL should be added to the frontier
   * @param {Object} url - A URL extracted for the currently visited page
   * @param {string} curURL - The URL of the currently visited page
   * @param {SeedTracker} tracker - The seed tracker associated with the very first page the chain of pages being visited originated from
   * @returns {boolean}
   */
  static shouldAddToFrontier (url, curURL, tracker) {
    if (tracker.mode === cmodePSD || tracker.mode === cmodSite) {
      return FrontierHelper.shouldAddToFrontierPSD(url, curURL, tracker)
    }
    return FrontierHelper.shouldAddToFrontierDefault(url, curURL, tracker)
  }

  /**
   * @desc Should a discovered URL be added to the frontier  using the Page Same Domain strategy
   * @param {Object} url - A URL extracted for the currently visited page
   * @param {string} curURL - The URL of the currently visited page
   * @param {SeedTracker} tracker - The seed tracker associated with the very first page the chain of pages being visited originated from
   * @returns {boolean}
   */
  static shouldAddToFrontierPSD (url, curURL, tracker) {
    const cDomain = parseDomain(curURL)
    const ext = Path.extname(url.pathname)
    const td = parseDomain(url.host)
    const tdTest = td && cDomain.domain === td.domain
    if (ext !== '') {
      return !bigExtLookup[ext] && tdTest && !tracker.seenURL(url.href)
    }
    return tdTest && !tracker.seenURL(url.href)
  }

  /**
   * @desc Should a discovered URL be added to the frontier using the default strategy, applies for page-only and page-all-links
   * @param {Object} url - A URL extracted for the currently visited page
   * @param {string} curURL - The URL of the currently visited page
   * @param {SeedTracker} tracker - The seed tracker associated with the very first page the chain of pages being visited originated from
   * @returns {boolean}
   */
  static shouldAddToFrontierDefault (url, curURL, tracker) {
    const ext = Path.extname(url.pathname)
    if (ext !== '') {
      return !bigExtLookup[ext] && !tracker.seenURL(url.href)
    }
    return !tracker.seenURL(url.href)
  }
}

/**
 * @type {FrontierHelper}
 */
module.exports = FrontierHelper

/**
 * @typedef {Object} Seed
 * @property {string} url   - The URL of the seed to be crawled
 * @property {symbol} mode  - The mode the seed and the URLs discovered by crawl the seed should operate in
 * @property {number} depth - The depth of the crawl
 */
