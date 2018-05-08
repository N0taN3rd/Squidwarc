const puppeteer = require('puppeteer')
const DEFAULT_ARGS = require('./defaultArgs')

async function launch () {
  const brower = await puppeteer.launch({
    ignoreDefaultArgs: true,
    args: DEFAULT_ARGS
  })
}
