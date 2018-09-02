/*
 Squidwarc  Copyright (C) 2017-Present John Berlin <n0tan3rd@gmail.com>

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

const ChromeCrawler = require('./chrome')
const PuppeteerCrawler = require('./puppeteer')

/**
 * @desc Receive the crawl config requested crawler
 * @param {CrawlConfig} config - The crawl config
 * @returns {ChromeCrawler | PuppeteerCrawler}
 */
function getCrawler (config) {
  if (config.chrome.use === 'puppeteer') {
    return new PuppeteerCrawler(config)
  }
  return ChromeCrawler.withAutoClose(config)
}

/**
 * @type {{ChromeCrawler: ChromeCrawler, PuppeteerCrawler: PuppeteerCrawler, getCrawler: getCrawler}}
 */
module.exports = {
  ChromeCrawler,
  PuppeteerCrawler,
  getCrawler
}
