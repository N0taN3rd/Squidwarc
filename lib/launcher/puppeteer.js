/*
 Squidwarc  Copyright (C) 2017-present  John Berlin <n0tan3rd@gmail.com>

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 Squidwarc is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this Squidwarc.  If not, see <http://www.gnu.org/licenses/>
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
