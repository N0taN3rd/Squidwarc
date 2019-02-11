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
const ExtraChromeCrawler = require('../crawler/extraChrome')
const cp = require('../utils/colorPrinters')

async function extraChromeRunner (config) {
  cp.crawlerOpt('Crawler Operating In', config.crawlControl.mode, 'mode')
  if (config.seeds == null) {
    cp.configError('No Seeds Were Provided Via The Config File', config)
    cp.bred('Crawler Shutting Down. GoodBy')
    process.exit(0)
  }

  if (Array.isArray(config.seeds)) {
    cp.crawlerOpt('Crawler Will Be Preserving', `${config.seeds.length} Seeds`)
  } else {
    cp.crawlerOpt('Crawler Will Be Preserving', config.seeds)
  }

  cp.crawlerOpt(
    'Crawler Generated WARCs Will Be Placed At',
    config.warc.output,
    `${config.warc.appending ? 'in appending mode' : ''}`
  )
  const crawler = await ExtraChromeCrawler.create(config)
  await crawler.crawl()
  cp.cyan(`Crawler shutting down. Have nice day :)`)
  await crawler.shutdown()
}

module.exports = extraChromeRunner
