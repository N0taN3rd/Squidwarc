/*
 Squid  Copyright (C) 2017  John Berlin <n0tan3rd@gmail.com>

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 Squid is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this Squid.  If not, see <http://www.gnu.org/licenses/>
 */

const R = require('ramda')
const fs = require('fs-extra')
const prettyMs = require('pretty-ms')
const runPromise = require('../runPromise')
const cp = require('../utils/colorPrinters')
const defaults = require('../defaults')
const Crawler = require('../crawler')
const warcNamePerURL = require('../utils/urlUtils').warcNamePerURL

module.exports = R.compose(runPromise, async configPath => {
  const conf = await fs.readJson(configPath)
  let mode = conf.mode || 'page-only'
  let notSP = null
  let justOutlinkMD = true
  if (mode !== 'page-only') {
    notSP = []
    justOutlinkMD = false
  }
  let seeds = conf.seeds
  let warc = conf.warc || defaults.defaultOpts.warc
  warc.naming = warc.naming || defaults.defaultOpts.warc.naming
  warc.output = warc.output || defaults.defaultOpts.warc.output
  conf.connect = conf.connect || defaults.defaultOpts.connect
  conf.connect.host = conf.connect.host || defaults.defaultOpts.connect.host
  conf.connect.port = conf.connect.port || defaults.defaultOpts.connect.port
  conf.timeouts = conf.timeouts || defaults.defaultOpts.timeouts
  conf.timeouts.navigationTimeout = conf.timeouts.navigationTimeout || defaults.defaultOpts.timeouts.navigationTimeout
  conf.timeouts.waitAfterLoad = conf.timeouts.waitAfterLoad || defaults.defaultOpts.timeouts.waitAfterLoad
  conf.versionInfo = defaults.defaultOpts.versionInfo
  conf.versionInfo.isPartOfV = conf.isPartOfV || defaults.defaultOpts.versionInfo.isPartOfV
  conf.versionInfo.warcInfoDescription = conf.warcInfoDescription || defaults.defaultOpts.versionInfo.warcInfoDescription

  cp.crawlerOpt('Crawler Operating In', mode, 'mode')
  if (R.isNil(seeds)) {
    cp.configError('No Seeds Were Provided Via The Config File', conf)
    cp.bred('Crawler Shutting Down. GoodBy')
    process.exit(0)
  }
  if (Array.isArray(seeds)) {
    cp.crawlerOpt('Crawler Will Be Preserving', `${seeds.length} Seeds`)
  } else {
    cp.crawlerOpt('Crawler Will Be Preserving', seeds)
    seeds = [seeds]
  }
  if (warc.naming.toLowerCase() === 'url') {
    cp.crawlerOpt('Crawler Will Be Generating WARC Files Using', 'the filenamified url')
  } else {
    cp.crawlerOpt('Crawler Will Be Generating WARC Files Named', warc.naming)
  }
  cp.crawlerOpt('Crawler Generated WARCs Will Be Placed At', warc.output)
  cp.crawlerOpt('Crawler Is Connecting To Chrome On Host', conf.connect.host)
  cp.crawlerOpt('Crawler Is Connecting To Chrome On Port', conf.connect.port)
  cp.crawlerOpt('Crawler Will Be Waiting At Maximum For Navigation To Happen For', prettyMs(conf.timeouts.navigationTimeout))
  cp.crawlerOpt('Crawler Will Be Waiting After Page Load For', prettyMs(conf.timeouts.waitAfterLoad))

  const crawler = Crawler.withAutoClose(conf)

  const warcFilePath = warcNamePerURL(warc.output)
  let seedUrl = seeds.shift()

  crawler.on('error', async err => {
    cp.error('Crawler Encountered A Random Error', err.err)
    if (err.type === 'warc-gen') {
      if (seeds.length === 0) {
        cp.cyan('No More Seeds\nCrawler Shutting Down\nGoodBy')
        await crawler.shutdown()
      } else {
        cp.cyan(`Crawler Has ${seeds.length} Seeds Left To Crawl`)
        seedUrl = seeds.shift()
        crawler.navigate(seedUrl)
      }
    }
  })

  crawler.on('disconnect', () => {
    cp.bred('Crawlers Connection To The Remote Browser Has Closed')
  })

  crawler.on('navigation-timedout', url => {
    cp.bred(`Crawler Attempted To Navigate To ${url}\nBut The Navigation Wait Time Of ${prettyMs(conf.timeouts.navigationTimeout)} Was Exceeded`)
  })

  crawler.on('navigated', navigatedTo => {
    cp.cyan(`Crawler Navigated To ${navigatedTo}`)
  })

  crawler.on('connected', () => {
    cp.cyan(`Crawler Navigating To ${seedUrl}`)
    crawler.navigate(seedUrl)
  })

  crawler.on('warc-gen-finished', async () => {
    cp.cyan('Crawler Generated WARC')
    if (seeds.length === 0) {
      if (notSP) {
        seeds = seeds.concat(notSP)
        justOutlinkMD = true
        if (seeds.length > 0) {
          cp.cyan(`Crawler Will Now Begin Preserving ${seeds.length} Seeds Retrieved For Mode ${conf.mode}`)
          seedUrl = seeds.shift()
          crawler.navigate(seedUrl)
        } else {
          cp.cyan('No More Seeds\nCrawler Shutting Down\nGoodBy')
          await crawler.shutdown()
        }
      } else {
        cp.cyan('No More Seeds\nCrawler Shutting Down\nGoodBy')
        await crawler.shutdown()
      }
    } else {
      cp.cyan(`Crawler Has ${seeds.length} Seeds Left To Crawl`)
      if (notSP && !justOutlinkMD) {
        cp.cyan(`Crawler Has Retrieved ${notSP.length} Seeds So Far For Mode ${conf.mode}`)
      }
      seedUrl = seeds.shift()
      crawler.navigate(seedUrl)
    }
  })

  crawler.on('page-loaded', async loadedInfo => {
    cp.cyan(`${seedUrl} loaded \nCrawler Generating WARC`)
    crawler.initWARC(warcFilePath(seedUrl))
    let outlinks
    if (justOutlinkMD) {
      outlinks = await crawler.getOutLinkMetadata()
    } else {
      let evalued
      if (mode === 'page-same-domain') {
        evalued = await crawler.getOutLinkMetadataSameD()
      } else {
        evalued = await crawler.getOutLinkMetadataAll()
      }
      outlinks = evalued.outlinks
      notSP = notSP.concat(evalued.links)
    }
    try {
      await crawler.genWarc({outlinks})
    } catch (error) {
      cp.error('Crawler Encountered An Error While Generating The WARC', error)
      crawler.emit('error', {type: 'warc-gen', err: error})
    }
  })

  crawler.init()
})
