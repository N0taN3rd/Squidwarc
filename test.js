const Crawler = require('./puppeteer-redux/crawler')
const Config = require('./lib/config')
const path = require('path')
const pd = require('parse-domain')
const untildify = require('untildify')

const usrScriptP = './userFns.js'
const url = 'https://www.reuters.com/'

async function doIt () {
  // console.log(await Config.loadConfig('conf.json'))
  const crawler = new Crawler({script: require(usrScriptP)})
  await crawler.init()
  const outlinks = await crawler.crawl(url)
  await crawler.shutdown()
  for (const it of crawler) {
    console.log(it)
  }
  console.log(outlinks)
}

doIt().catch(error => console.error(error))

// console.log(require(usrScriptP))