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
const path = require('path')
const cp = require('child_process')
const fs = require('fs-extra')
const CRI = require('chrome-remote-interface')
const readline = require('readline')
const DEFAULT_ARGS = require('./defaultArgs')
const ChromeFinder = require('./chromeFinder')
const H = require('../crawler/helper')
const { delay } = require('../utils/promises')

/**
 * @param {ChromeOptions} options
 * @return {?ChromeOptions}
 */
function ensureOptions (options = {}) {
  if (options.port == null) {
    options.port = 9222
  }
  if (options.host == null) {
    options.host = 'localhost'
  }
  if (options.local == null || !options.local) {
    options.local = false
  }
  return options
}

/**
 *
 * @param {ChromeOptions} options
 * @param {string} userDataDir
 * @return {string[]}
 */
function chromeArgs (options, userDataDir) {
  const chromeArguments = [...DEFAULT_ARGS]
  chromeArguments.push(
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${options.port}`
  )
  if (options.headless) {
    chromeArguments.push('--headless', '--hide-scrollbars')
    if (os.platform() === 'win32') {
      chromeArguments.push('--disable-gpu')
    }
  }
  if (process.env.INDOCKER) {
    chromeArguments.push(
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    )
  }
  return chromeArguments
}

/**
 * @type {string}
 */
const CHROME_PROFILE_PATH = path.join(os.tmpdir(), 'squidwarc_profile-')

/**
 * @desc Utility class for launching or connecting to a Chrome/Chromium instance
 */
class ChromeLauncher {
  /**
   * @desc Launch Chrome by finding an acceptable executable on the host system
   * @param {?ChromeOptions} [options = {}]
   * @return {Promise<CRI>}
   */
  static async launch (options) {
    options = ensureOptions(options)
    if (options.executable === undefined) {
      options.executable = await ChromeFinder.findChrome()
    }
    let userDataDir = null
    if (!options.userDataDir) {
      userDataDir = await fs.mkdtemp(CHROME_PROFILE_PATH)
    } else {
      userDataDir = options.userDataDir
    }
    const chromeArguments = chromeArgs(options, userDataDir)
    if (!options.userDataDir) {
      chromeArguments.push('--password-store=basic', '--use-mock-keychain')
    }
    chromeArguments.push('about:blank')
    const chromeProcess = cp.spawn(options.executable, chromeArguments, {
      stdio: ['ignore', 'ignore', 'pipe'],
      env: process.env,
      detached: process.platform !== 'win32'
    })

    function maybeRemoveUDataDir () {
      if (!options.userDataDir) {
        try {
          fs.removeSync(userDataDir)
        } catch (e) {}
      }
    }

    let killed = false

    function killChrome () {
      if (killed) {
        return
      }
      killed = true
      try {
        if (process.platform === 'win32') {
          cp.execSync(`taskkill /pid ${chromeProcess.pid} /T /F`)
        } else {
          process.kill(-chromeProcess.pid, 'SIGKILL')
        }
      } catch (e) {}

      maybeRemoveUDataDir()
    }

    process.on('exit', killChrome)
    chromeProcess.once('exit', maybeRemoveUDataDir)

    process.on('SIGINT', () => {
      killChrome()
      process.exit(130)
    })
    process.once('SIGTERM', killChrome)
    process.once('SIGHUP', killChrome)

    let criClient
    try {
      // await Promise.delay(5000)
      let listeningOn = await waitForWSEndpoint(chromeProcess, 30 * 1000)
      console.log(listeningOn)
      await delay(3000)
      criClient = await CRI(options)
    } catch (e) {
      killChrome()
      throw e
    }
    return criClient
  }

  /**
   * @desc Launch Chrome by finding an acceptable executable on the host system but do not connect to it
   * @param {?ChromeOptions} [options = {}]
   * @return {Promise<CRI>}
   */
  static async launchNoConnect (options = {}) {
    options = ensureOptions(options)
    if (options.executable == null) {
      options.executable = await ChromeFinder.findChrome()
    }
    let userDataDir = null
    if (!options.executable) {
      userDataDir = await fs.mkdtemp(CHROME_PROFILE_PATH)
    } else {
      userDataDir = options.userDataDir
    }

    const chromeArguments = chromeArgs(options, userDataDir)
    let killed = false
    const chromeProcess = cp.spawn(options.executable, chromeArguments, {
      stdio: ['ignore', 'ignore', 'pipe'],
      env: process.env,
      detached: process.platform !== 'win32'
    })

    process.on('exit', killChrome)
    chromeProcess.once('exit', maybeRemoveUDataDir)

    process.on('SIGINT', () => {
      killChrome()
      process.exit(130)
    })
    process.once('SIGTERM', killChrome)
    process.once('SIGHUP', killChrome)

    try {
      // await Promise.delay(5000)
      let listeningOn = await waitForWSEndpoint(chromeProcess, 30 * 1000)
      console.log(listeningOn)
    } catch (e) {
      killChrome()
      throw e
    }

    function maybeRemoveUDataDir () {
      if (!options.userDataDir) {
        try {
          fs.removeSync(userDataDir)
        } catch (e) {}
      }
    }

    function killChrome () {
      if (killed) {
        return
      }
      killed = true
      try {
        if (process.platform === 'win32') {
          cp.execSync(`taskkill /pid ${chromeProcess.pid} /T /F`)
        } else {
          process.kill(-chromeProcess.pid, 'SIGKILL')
        }
      } catch (e) {}

      maybeRemoveUDataDir()
    }
  }

  /**
   * @desc Connect to an running instance of Chrome
   * @param {?ChromeOptions} [options]
   * @return {Promise<CRI>}
   */
  static connect (options = {}) {
    return CRI(ensureOptions(options))
  }

  /**
   * @desc Create and connect to a new tab of a running Chrome instance
   * @param {?ChromeOptions} [options = {}]
   * @return {Promise<CRI>}
   * @public
   */
  static async newTab (options = {}) {
    options = ensureOptions(options)
    let target = await CRI.New(options)
    return CRI({ ...options, target })
  }

  /**
   * @desc Receive the protocol definition of the remote Chrome
   * @param {?ChromeOptions} [options = {}]
   * @return {Promise<Object>}
   * @public
   */
  static async getProtocolDef (options = {}) {
    options = ensureOptions(options)
    return CRI.Protocol(options)
  }
}

/**
 * @desc Function that returns a promise resolving when chrome tells us the WS endpoint is ready
 * @param chromeProcess
 * @param timeout
 * @return {Promise<any>}
 */
function waitForWSEndpoint (chromeProcess, timeout) {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: chromeProcess.stderr })
    let stderr = ''
    const listeners = [
      H.addEventListener(rl, 'line', onLine),
      H.addEventListener(rl, 'close', onClose),
      H.addEventListener(chromeProcess, 'exit', onClose),
      H.addEventListener(chromeProcess, 'error', onClose)
    ]
    const timeoutId = timeout ? setTimeout(onTimeout, timeout) : 0

    function onClose () {
      cleanup()
      reject(new Error(['Failed to launch chrome!', stderr].join('\n')))
    }

    function onTimeout () {
      cleanup()
      reject(
        new Error(`Timed out after ${timeout} ms while trying to connect to Chrome!`)
      )
    }

    /**
     * @param {string} line
     */
    function onLine (line) {
      stderr += line + '\n'
      const match = line.match(/^DevTools listening on (ws:\/\/.*)$/)
      if (!match) {
        return
      }
      cleanup()
      resolve(match[1])
    }

    function cleanup () {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      H.removeEventListeners(listeners)
    }
  })
}

/**
 * @type {ChromeLauncher}
 */
module.exports = ChromeLauncher

/**
 * @external {CRI} https://github.com/cyrus-and/chrome-remote-interface
 */
