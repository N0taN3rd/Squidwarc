const puppeteer = require('puppeteer')
const DEFAULT_ARGS = require('./defaultArgs')

module.exports = function launch (options) {
  return puppeteer.launch({
    ignoreDefaultArgs: true,
    args: DEFAULT_ARGS,
    headless: options.headless || true
  })
}
