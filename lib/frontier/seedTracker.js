class SeedTracker {
  constructor (url, mode, depth) {
    this.urlCount = 1
    this.url = url
    this.mode = mode
    this.seen = new Set([url])
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
