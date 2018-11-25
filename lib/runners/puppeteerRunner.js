/*
 Squidwarc  Copyright (C) 2017  John Berlin <n0tan3rd@gmail.com>

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

const cp = require('../utils/colorPrinters')
const PuppeteerCrawler = require('../crawler/puppeteer')
const Frontier = require('../frontier')
const WARCNaming = require('../utils/warcNaming')

/**
 * @desc Launches a crawl using the supplied configuration file path
 * @param {CrawlConfig} conf - The crawl config for this crawl
 * @return {Promise<void, Error>}
 */
async function puppeteerRunner (conf) {
  const frontier = new Frontier()
  cp.crawlerOpt('Crawler Operating In', conf.mode, 'mode')
  if (conf.seeds == null) {
    cp.configError('No Seeds Were Provided Via The Config File', conf)
    cp.bred('Crawler Shutting Down. GoodBy')
    process.exit(0)
  }

  if (Array.isArray(conf.seeds)) {
    cp.crawlerOpt('Crawler Will Be Preserving', `${conf.seeds.length} Seeds`)
  } else {
    cp.crawlerOpt('Crawler Will Be Preserving', conf.seeds)
  }

  frontier.init(conf.seeds)
  const warcFilePath = WARCNaming.getWarcNamingFunction(conf)

  cp.crawlerOpt('Crawler Generated WARCs Will Be Placed At', conf.warc.output)

  const crawler = new PuppeteerCrawler(conf)
  let currentSeed

  crawler.on('error', async err => {
    cp.error('Crawler Encountered A Random Error', err.err)
  })

  crawler.on('disconnect', async () => {
    cp.bred('Crawlers Connection To The Remote Browser Has Closed')
    await crawler.shutdown()
  })

  await crawler.init()
  while (!frontier.exhausted()) {
    currentSeed = frontier.next()
    cp.cyan(`Crawler Navigating To ${currentSeed}`)
    const good = await crawler.navigate(currentSeed)
    if (good) {
      cp.cyan(`Crawler Navigated To ${currentSeed}`)
      await crawler.runUserScript()
      cp.cyan(`Crawler Generating WARC`)
      let { outlinks, links } = await crawler.getOutLinks()
      const donePromise = crawler.initWARC(warcFilePath(currentSeed), conf.warc.append)
      frontier.process(links)
      await crawler.genWarc({ outlinks })
      await donePromise
    }
    await crawler.stopPageLoading()
    cp.cyan(`Crawler Has ${frontier.size()} Seeds Left To Crawl`)
  }
  cp.cyan(`Crawler shutting down. Have nice day :)`)
  await crawler.shutdown()
}

module.exports = puppeteerRunner
