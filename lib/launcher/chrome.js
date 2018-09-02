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
const path = require('path')
const cp = require('child_process')
const fs = require('fs-extra')
const CRI = require('chrome-remote-interface')
const readline = require('readline')
const DEFAULT_ARGS = require('./defaultArgs')
const ChromeFinder = require('./chromeFinder')
const { delay } = require('../utils/promises')

/**
 * @desc {@link CrawlConfig}
 * @param {CrawlConfig | Object} options
 * @return {CrawlConfig | Object}
 */
function ensureOptions (options = {}) {
  if (options.connect === undefined) {
    options.connect = {
      host: 'localhost',
      port: 9222,
      local: false
    }
  }
  if (options.connect.port === undefined) {
    options.connect.port = 9222
  }
  if (options.connect.host === undefined) {
    options.connect.host = 'localhost'
  }
  if (options.connect.local === undefined || options.connect.local) {
    options.connect.local = false
  }
  return options
}

/**
 * @type {string}
 */
const CHROME_PROFILE_PATH = path.join(os.tmpdir(), 'squidwarc_profile-')

/**
 * @desc Utility class for launching or connecting to a Chrome/Chromium instance
 */
class Launcher {
  /**
   * @desc Launch Chrome by finding an acceptable executable on the host system
   * @param {CrawlConfig | Object} [options = {}]
   * @return {Promise<CRI>}
   */
  static async launch (options) {
    options = ensureOptions(options)
    if (options.executablePath === undefined) {
      options.executablePath = await ChromeFinder.findChrome()
    }
    let fakeUdir = null
    const chromeArguments = [].concat(DEFAULT_ARGS)
    if (!options.userDataDir) {
      fakeUdir = await fs.mkdtemp(CHROME_PROFILE_PATH)
    }
    chromeArguments.push(
      `--user-data-dir=${options.userDataDir || fakeUdir}`,
      `--remote-debugging-port=${options.connect.port}`
    )
    if (options.args) {
      chromeArguments.push(
        ...options.args.filter(arg => !arg.startsWith('--user-data-dir='))
      )
    }
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
    if (
      Array.isArray(options.args) &&
      chromeArguments.every(arg => arg.startsWith('-'))
    ) {
      chromeArguments.push('about:blank')
    }

    let chromeExecutable = options.executablePath

    const chromeProcess = cp.spawn(chromeExecutable, chromeArguments, {
      stdio: ['ignore', 'ignore', 'pipe'],
      env: options.env || process.env
    })

    let killed = false
    process.on('exit', killChrome)
    chromeProcess.once('exit', () => {
      try {
        if (fakeUdir) {
          fs.removeSync(fakeUdir)
        }
      } catch (e) {}
    })

    if (options.handleSIGINT !== false) {
      process.on('SIGINT', () => {
        killChrome()
        process.exit(130)
      })
    }

    if (options.handleSIGTERM !== false) {
      process.once('SIGTERM', killChrome)
    }

    if (options.handleSIGHUP !== false) {
      process.once('SIGHUP', killChrome)
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

      try {
        if (fakeUdir) {
          fs.removeSync(fakeUdir)
        }
      } catch (e) {}
    }

    let criClient
    try {
      // await Promise.delay(5000)
      let listeningOn = await waitForWSEndpoint(
        chromeProcess,
        options.timeout || 30 * 1000
      )
      console.log(listeningOn)
      await delay(3000)
      criClient = await CRI(options.connect)
    } catch (e) {
      killChrome()
      throw e
    }
    return criClient
  }

  /**
   * @desc Launch Chrome by finding an acceptable executable on the host system but do not connect to it
   * @param {CrawlConfig | Object} [options = {}]
   * @return {Promise<void>}
   */
  static async launchNoConnect (options = {}) {
    options = ensureOptions(options)
    if (options.executablePath === undefined) {
      options.executablePath = await ChromeFinder.findChrome()
    }
    let fakeUdir = null
    const chromeArguments = [].concat(DEFAULT_ARGS)
    if (!options.userDataDir) {
      fakeUdir = await fs.mkdtemp(CHROME_PROFILE_PATH)
    }
    chromeArguments.push(
      `--user-data-dir=${options.userDataDir || fakeUdir}`,
      `--remote-debugging-port=${options.connect.port}`
    )
    if (options.args) {
      chromeArguments.push(
        ...options.args.filter(arg => !arg.startsWith('--user-data-dir='))
      )
    }
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

    let chromeExecutable = options.executablePath

    const chromeProcess = cp.spawn(chromeExecutable, chromeArguments, {
      stdio: ['ignore', 'ignore', 'pipe'],
      env: options.env || process.env
    })

    let killed = false
    process.on('exit', killChrome)
    chromeProcess.once('close', () => {
      if (fakeUdir) {
        fs.removeSync(fakeUdir)
      }
    })

    if (options.handleSIGINT !== false) {
      process.on('SIGINT', () => {
        killChrome()
        process.exit(130)
      })
    }

    if (options.handleSIGTERM !== false) {
      process.once('SIGTERM', killChrome)
    }

    if (options.handleSIGHUP !== false) {
      process.once('SIGHUP', killChrome)
    }

    function killChrome () {
      if (killed) {
        return
      }
      killed = true
      if (process.platform === 'win32') {
        cp.execSync(`taskkill /pid ${chromeProcess.pid} /T /F`)
      } else {
        process.kill(-chromeProcess.pid, 'SIGKILL')
      }
    }

    try {
      // await Promise.delay(5000)
      let listeningOn = await waitForWSEndpoint(
        chromeProcess,
        options.timeout || 30 * 1000
      )
      console.log(listeningOn)
    } catch (e) {
      killChrome()
      throw e
    }
  }

  /**
   * @desc Connect to an running instance of Chrome
   * @param {CrawlConfig | Object} [options]
   * @return {Promise<CRI>}
   */
  static connect (options = {}) {
    options = ensureOptions(options)
    return CRI(options.connect)
  }

  /**
   * @desc Create and connect to a new tab of a running Chrome instance
   * @param {CrawlConfig | Object} [options = {}]
   * @return {Promise<CRI>}
   * @public
   */
  static async newTab (options = {}) {
    options = ensureOptions(options)
    let newRet
    let wasError = false
    try {
      newRet = await CRI.New(options)
    } catch (error) {
      wasError = true
    }
    let client
    if (!wasError) {
      options.connect.tab = newRet.tab
      client = await CRI(options.connect)
      return client
    }
  }

  /**
   * @desc Receive the protocol definition of the remote Chrome
   * @param {LauncherArgs} [options = {}]
   * @return {Promise<Object>}
   * @public
   */
  static async getProtocolDef (options = {}) {
    options = ensureOptions(options)
    return CRI.Protocol(options.connect)
  }
}

/**
 * @desc Function that returns a promise resolving when chrome tells us the WS endpoint is ready
 * @param chromeProcess
 * @param timeout
 * @return {Promise<any>}
 */
function waitForWSEndpoint (chromeProcess, timeout) {
  function addEventListener (emitter, eventName, handler) {
    emitter.on(eventName, handler)
    return { emitter, eventName, handler }
  }

  function removeEventListeners (listeners) {
    for (const listener of listeners) {
      listener.emitter.removeListener(listener.eventName, listener.handler)
    }
    listeners.splice(0, listeners.length)
  }

  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: chromeProcess.stderr })
    let stderr = ''
    const listeners = [
      addEventListener(rl, 'line', onLine),
      addEventListener(rl, 'close', onClose),
      addEventListener(chromeProcess, 'exit', onClose),
      addEventListener(chromeProcess, 'error', onClose)
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
      removeEventListeners(listeners)
    }
  })
}

/**
 * @type {Launcher}
 */
module.exports = Launcher

/**
 * @typedef {Object} LauncherArgs
 * @property {?ConnectOptions} connect - Options controlling how to connect to the remote Chrome/Chromium browser
 * @property {?string} executablePath  - Optional path to Chrome/Chromium exectuable or command to be used to launch Chrome/Chromium
 * @property {?string} userDataDir     - Optional path to a user data directory (generated by Chrome/Chromium) to be used rather than a temporary one
 * @property {?boolean} [headless = true]  - Should the browser used by Squidwarc be launched in headless mode
 * @property {?string[]} args - Optional array of additional args used when Squidwarc launches Chrome/Chromium
 */

/**
 * @external {CRI} https://github.com/cyrus-and/chrome-remote-interface
 */

/**
 * {@link CrawlConfig}
 */
