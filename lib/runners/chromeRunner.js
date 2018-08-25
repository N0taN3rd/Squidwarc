/*
 Squidwarc  Copyright (C) 2017 - present  John Berlin <n0tan3rd@gmail.com>

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

const prettyMs = require('pretty-ms')
const cp = require('../utils/colorPrinters')
const ChromeCrawler = require('../crawler/chrome')
const Frontier = require('../frontier')
const WARCNaming = require('../utils/warcNaming')

/**
 * @desc Launches a crawl using the supplied configuration file path
 * @param {Object} conf Path to the crawls configuration file
 * @return {Promise<void, Error>}
 */
async function chromeRunner (conf) {
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
  if (conf.warc.naming.toLowerCase() === 'url') {
    cp.crawlerOpt('Crawler Will Be Generating WARC Files Using', 'the filenamified url')
  } else {
    cp.crawlerOpt('Crawler Will Be Generating WARC Files Named', conf.warc.naming)
  }
  cp.crawlerOpt('Crawler Generated WARCs Will Be Placed At', conf.warc.output)
  cp.crawlerOpt('Crawler Is Connecting To Chrome On Host', conf.connect.host)
  cp.crawlerOpt('Crawler Is Connecting To Chrome On Port', conf.connect.port)
  cp.crawlerOpt(
    'Crawler Will Be Waiting At Maximum For Navigation To Happen For',
    prettyMs(conf.crawlControl.navWait)
  )
  if (conf.crawlControl.pageLoad) {
    cp.crawlerOpt(
      'Crawler Will Be Waiting After Page Load For',
      prettyMs(conf.crawlControl.waitAfterLoad)
    )
  } else {
    cp.crawlerOpt(
      'Crawler Will Be Waiting After For',
      conf.crawlControl.numInflight,
      'inflight requests'
    )
  }

  const crawler = ChromeCrawler.withAutoClose(conf)
  let currentSeed = frontier.next()
  let warcFilePath
  if (conf.warc.append) {
    warcFilePath = WARCNaming.apndWarcNamePerURL(conf.mode, conf.warc.output)
  } else {
    warcFilePath = WARCNaming.warcNamePerURL(conf.warc.output)
  }
  crawler.on('error', async err => {
    cp.error('Crawler Encountered A Random Error', err.err)
    if (err.type === 'warc-gen') {
      if (frontier.exhausted()) {
        cp.cyan('No More Seeds\nCrawler Shutting Down\nGoodBy')
        await crawler.shutdown()
      } else {
        cp.cyan(`Crawler Has ${frontier.size()} Seeds Left To Crawl`)
        currentSeed = frontier.next()
        crawler.navigate(currentSeed)
      }
    }
  })

  crawler.on('navigation-error', async err => {
    cp.error('Crawler Encountered A Navigation Error', err.err)
    if (frontier.exhausted()) {
      cp.cyan('No More Seeds\nCrawler Shutting Down\nGoodBy')
      await crawler.shutdown()
    } else {
      cp.cyan(`Crawler Has ${frontier.size()} Seeds Left To Crawl`)
      currentSeed = frontier.next()
      crawler.navigate(currentSeed)
    }
  })

  crawler.on('disconnect', () => {
    cp.bred('Crawlers Connection To The Remote Browser Has Closed')
  })

  crawler.on('navigation-timedout', async url => {
    cp.bred(
      `Crawler Attempted To Navigate To ${url}\nBut The Navigation Wait Time Of ${prettyMs(
        conf.timeouts.navigationTimeout
      )} Was Exceeded`
    )
    if (frontier.exhausted()) {
      cp.cyan('No More Seeds\nCrawler Shutting Down\nGoodBy')
      await crawler.shutdown()
    } else {
      await crawler.stop()
      cp.cyan(`Crawler Has ${frontier.size()} Seeds Left To Crawl`)
      currentSeed = frontier.next()
      crawler.navigate(currentSeed)
    }
  })

  crawler.on('navigated', navigatedTo => {
    cp.cyan(`Crawler Navigated To ${navigatedTo}`)
  })

  crawler.on('connected', () => {
    cp.cyan(`Crawler Navigating To ${currentSeed}`)
    crawler.navigate(currentSeed)
  })

  crawler.on('warc-gen-finished', async () => {
    cp.cyan('Crawler Generated WARC')
    if (frontier.exhausted()) {
      cp.cyan('No More Seeds\nCrawler Shutting Down\nGoodBy')
      await crawler.shutdown()
    } else {
      cp.cyan(`Crawler Has ${frontier.size()} Seeds Left To Crawl`)
      currentSeed = frontier.next()
      crawler.navigate(currentSeed)
    }
  })

  crawler.on('page-loaded', async loadedInfo => {
    cp.cyan(`${currentSeed} loaded page load \nCrawler Generating WARC`)
    crawler.initWARC(warcFilePath(currentSeed), conf.warc.append)
    let { outlinks, links } = await crawler.getOutLinks()
    frontier.process(links)
    await crawler.genWarc({ outlinks })
  })

  crawler.on('network-idle', async loadedInfo => {
    cp.cyan(`${currentSeed} network idle \nCrawler Generating WARC`)
    crawler.initWARC(warcFilePath(currentSeed), conf.warc.append)
    let { outlinks, links } = await crawler.getOutLinks()
    frontier.process(links)
    await crawler.genWarc({ outlinks })
  })

  await crawler.init()
}

module.exports = chromeRunner
