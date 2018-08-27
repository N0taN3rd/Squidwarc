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
const Path = require('path')
const parseDomain = require('parse-domain')
const bigExtLookup = require('../utils/bigExtLookup')
const { cmodePO, cmodePAL, cmodePSD } = require('./modes')

/**
 * @desc Helper class providing utility functions for in memory frontier implementation {@link Frontier}
 */
class FrontierHelper {
  /**
   * @desc Ensure the starting seed list is one the frontier can understand
   * @param {Array<{url:string,mode:string,depth:number}|string>|{url:string,mode:string,depth:number}|string} seeds - The initial seeds for the crawl
   * @param {string} mode - The crawl mode for the crawl to be launched
   * @param {number} depth - The crawls depth
   * @returns {Array<{url:string,mode:Symbol,depth:number}>|{url:string,mode:Symbol,depth:number}}
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
   * @returns {Symbol} - The crawl modes internal symbol
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
   * @desc Determine if the supplied
   * @param {Object} url - A URL extracted for the currently visited page
   * @param {string} curURL - The URL of the currently visited page
   * @param {SeedTracker} tracker - The seed tracker associated with the very first page the chain of pages being visited originated from
   * @returns {boolean}
   */
  static shouldAddToFrontier (url, curURL, tracker) {
    if (tracker.mode === cmodePSD) {
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
   * @desc Should a discovered URL be added to the frontier using the default strategy
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

module.exports = FrontierHelper
