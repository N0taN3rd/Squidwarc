const puppeteer = require('puppeteer')
const LinkCollector = require('./lib/injectManager')
const DEFAULT_ARGS = require('./lib/launcher/defaultArgs')

async function doIt () {
  const browser = await puppeteer.launch({
    headless: false,
    ignoreDefaultArgs: true,
    args: DEFAULT_ARGS
  })
  const page = await browser.newPage()
  await page.setViewport({width: 1920, height: 1080})
  const it = await page.evaluateOnNewDocument(LinkCollector.getInit())
  console.log(it)
  page.on('console', msg => {
    if (msg.type() === 'info') {
      console.log(msg.text())
    }
  })

  await page.goto('https://www.reuters.com/', {waitUntil: 'networkidle2'})
  console.log('doing collection')
  const results = await page.evaluate(LinkCollector.getCollect())
  console.log(results)
  await require('fs-extra').writeJson('found.json', results)

  await browser.close()
}

doIt().catch(err => console.error(err))
