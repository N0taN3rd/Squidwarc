const puppeteer = require('puppeteer')
const DEFAULT_ARGS = require('./defaultArgs')

module.exports = function launch (options) {
  const args = options.headless ? DEFAULT_ARGS.concat(['--headless']) : DEFAULT_ARGS
  return puppeteer.launch({
    ignoreDefaultArgs: true,
    defaultViewport: {width: 1920, height: 1080},
    args
  })
}
