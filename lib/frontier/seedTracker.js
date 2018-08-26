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

class SeedTracker {
  /**
   *
   * @param {string} url
   * @param {Symbol} mode
   * @param {number} depth
   */
  constructor (url, mode, depth) {
    /**
     *
     * @type {number}
     */
    this.urlCount = 1

    /**
     * @type {string}
     */
    this.url = url

    /**
     *
     * @type {Symbol}
     */
    this.mode = mode

    /**
     *
     * @type {Set<string>}
     */
    this.seen = new Set([url])

    /**
     *
     * @type {number}
     */
    this.depth = depth
  }

  /**
   *
   * @returns {boolean}
   */
  done () {
    return this.urlCount === 0
  }

  crawledURL () {
    this.urlCount -= 1
  }

  /**
   *
   * @param {string} url
   * @returns {boolean}
   */
  seenURL (url) {
    return this.seen.has(url)
  }

  /**
   *
   * @param {string} url
   */
  addToSeen (url) {
    this.seen.add(url)
    this.urlCount += 1
  }
}

module.exports = SeedTracker
