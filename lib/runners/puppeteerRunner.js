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
  cp.crawlerOpt('Crawler Operating In', conf.crawlControl.mode, 'mode')
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
  cp.crawlerOpt(
    'Crawler Generated WARCs Will Be Placed At',
    conf.warc.output,
    `${conf.warc.appending ? 'in appending mode' : ''}`
  )

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
      frontier.process(links)
      await crawler.genWARCForPage(outlinks)
    }
    cp.cyan(`Crawler Has ${frontier.size()} Seeds Left To Crawl`)
  }
  cp.cyan(`Crawler shutting down. Have nice day :)`)
  await crawler.shutdown()
}

module.exports = puppeteerRunner
