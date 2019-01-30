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
const os = require('os')
const puppeteer = require('puppeteer')
const DEFAULT_ARGS = require('./defaultArgs')
const CRI = require('chrome-remote-interface')

/**
 * @desc Attempts to find an accible target (page) to connect to in an already launched chrome instance
 * @param {ChromeOptions} options
 * @return {Promise<string>}
 */
async function findPageToConnectTo (options) {
  const targets = await CRI.List(options)
  let backup
  let i = 0
  for (; i < targets.length; i++) {
    const target = targets[i]
    if (target.webSocketDebuggerUrl) {
      if (target.type === 'page') {
        return target.webSocketDebuggerUrl
      } else {
        backup = target
      }
    }
  }
  if (backup) return backup.webSocketDebuggerUrl
  throw new Error('Squidwarc could not find a browser page to connect to')
}

/**
 * @desc Launch and connect or connect to Chrome/Chromium
 * @param {ChromeOptions} options
 * @returns {!Promise<!Puppeteer.Browser>}
 */
module.exports = async function launch (options) {
  if (options.launch) {
    const chromeArgs = [...DEFAULT_ARGS]
    if (options.headless) {
      chromeArgs.push('--headless', '--hide-scrollbars')
      if (os.platform() === 'win32') {
        chromeArgs.push('--disable-gpu')
      }
    }

    if (options.userDataDir) {
      chromeArgs.push(`--user-data-dir=${options.userDataDir}`)
    } else {
      chromeArgs.push('--password-store=basic', '--use-mock-keychain')
    }

    if (process.env.INDOCKER) {
      chromeArgs.push(
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      )
    }

    chromeArgs.push('about:blank')

    return puppeteer.launch({
      executablePath: options.executable,
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
