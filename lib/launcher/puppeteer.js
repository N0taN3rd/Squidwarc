const os = require('os')
const puppeteer = require('puppeteer')
const DEFAULT_ARGS = require('./defaultArgs')
const CRI = require('chrome-remote-interface')

async function findPageToConnectTo (options) {
  const targets = await CRI.List(options.connect)
  let backup
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]
    if (target.webSocketDebuggerUrl) {
      if (target.type === 'page') {
        return target.webSocketDebuggerUrl
      } else {
        backup = target
      }
    }
  }
  if (backup) return backup
  throw new Error('Squidwarc could not find a browser page to connect to')
}

/**
 * @param options
 * @returns {!Promise<!Puppeteer.Browser>}
 */
async function launch (options) {
  if (options.connect.launch) {
    const chromeArgs = [...DEFAULT_ARGS]
    if (options.headless) {
      chromeArgs.push('--headless', '--hide-scrollbars')
      if (os.platform() === 'win32') {
        chromeArgs.push('--disable-gpu')
      }
    }
    if (process.env.INDOCKER) {
      chromeArgs.push(
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      )
    }
    return puppeteer.launch({
      ignoreDefaultArgs: true,
      defaultViewport: { width: 1920, height: 1080 },
      args: chromeArgs
    })
  }
  const browserWSEndpoint = await findPageToConnectTo(options)
  return puppeteer.connect({
    browserWSEndpoint,
    defaultViewport: { width: 1920, height: 1080 }
  })
}

module.exports = launch
