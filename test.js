const Crawler = require('./puppeteer-redux/crawler')

const usrScriptP = '/home/john/WebstormProjects/Squidwarc/userFns.js'
const url = 'https://www.instagram.com/visit_berlin/'

async function doIt () {
  const crawler = new Crawler({script: usrScriptP})
  await crawler.init()
  const outlinks = await crawler.crawl(url)
  await crawler.shutdown()
  for (const it of crawler) {
    console.log(it)
  }
  console.log(outlinks)
}

doIt().catch(error => console.error(error))

