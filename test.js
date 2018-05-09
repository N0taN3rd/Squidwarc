const puppeteer = require('puppeteer')
const {init, collect} = require('./lib/utils/linkCollector')
const DEFAULT_ARGS = require('./lib/launcher/defaultArgs')

puppeteer.launch({
  headless: false,
  ignoreDefaultArgs: true,
  args: DEFAULT_ARGS
}).then(async browser => {
  const page = await browser.newPage()
  await page.setViewport({width: 1920, height: 1080})
  await page.evaluateOnNewDocument(init)
  page.on('console', msg => {
    if (msg.type() === 'info') {
      console.log(msg.text())
    }
  })

  await page.goto('https://www.reuters.com/', {waitUntil: 'networkidle2'})
  console.log('doing collection')
  const results = await page.evaluate(collect)
  console.log(results)

  await browser.close()
})

