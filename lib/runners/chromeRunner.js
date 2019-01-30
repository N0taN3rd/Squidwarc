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

const prettyMs = require('pretty-ms')
const cp = require('../utils/colorPrinters')
const ChromeCrawler = require('../crawler/chrome')
const Frontier = require('../frontier')
const WARCNaming = require('../utils/warcNaming')

/**
 * @desc Launches a crawl using the supplied configuration file path
 * @param {CrawlConfig} conf - The crawl config for this crawl
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
  cp.crawlerOpt('Crawler Is Connecting To Chrome On Host', conf.chrome.host)
  cp.crawlerOpt('Crawler Is Connecting To Chrome On Port', conf.chrome.port)
  cp.crawlerOpt(
    'Crawler Will Be Waiting At Maximum For Navigation To Happen For',
    prettyMs(conf.crawlControl.navWait)
  )

  cp.crawlerOpt(
    'Crawler Will Be Waiting After For',
    conf.crawlControl.numInflight,
    'inflight requests'
  )

  const crawler = ChromeCrawler.withAutoClose(conf)

  let currentSeed = frontier.next()
  const warcFilePath = WARCNaming.getWarcNamingFunction(conf)

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
        conf.crawlControl.navWait
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

  crawler.on('network-idle', async loadedInfo => {
    cp.cyan(`${currentSeed} network idle \nCrawler Generating WARC`)
    let { outlinks, links } = await crawler.getOutLinks()
    frontier.process(links)
    await crawler.genWARCForPage(outlinks)
  })

  await crawler.init()
}

module.exports = chromeRunner
