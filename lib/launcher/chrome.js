const os = require('os')
const path = require('path')
const cp = require('child_process')
const fs = require('fs-extra')
const CRI = require('chrome-remote-interface')
const readline = require('readline')
const DEFAULT_ARGS = require('./defaultArgs')
const ChromeFinder = require('./chromeFinder')
const { delay } = require('../utils/promises')
// heavily inspired if not copied from puppeteer
const CHROME_PROFILE_PATH = path.join(os.tmpdir(), 'squidwarc_profile-')

/**
 * @desc Utility class for launching, connecting to a Chrome instance and more
 */
class Launcher {
  /**
   * @desc Launch Chrome by finding an acceptable executable on the host system
   * @param {?Object} options
   * @return {Promise<CRI>}
   * @public
   */
  static async launch (options) {
    options = options || {}
    if (options.connect === undefined) {
      options.connect = {
        host: 'localhost',
        port: 9222,
        remote: true
      }
    } else {
      if (options.connect.port === undefined) {
        options.connect.port = 9222
      }
      if (options.connect.host === undefined) {
        options.connect.host = 'localhost'
      }
      options.connect.remote = true
    }
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
      await delay(5000)
      criClient = await CRI(options.connect)
    } catch (e) {
      killChrome()
      throw e
    }
    return criClient
  }

  /**
   * @desc Launch Chrome by finding an acceptable executable on the host system but do not connect to it
   * @param {?Object} [options = {}]
   * @property {{host: string, port: number, remote: boolean}} connect
   * @return {Promise<void>}
   * @public
   */
  static async launchNoConnect (options) {
    options = options || {}
    if (options.connect === undefined) {
      options.connect = {
        host: 'localhost',
        port: 9222,
        remote: true
      }
    } else {
      if (options.connect.port === undefined) {
        options.connect.port = 9222
      }
      if (options.connect.host === undefined) {
        options.connect.host = 'localhost'
      }
      options.connect.remote = true
    }

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
   * @external {CRI} https://github.com/cyrus-and/chrome-remote-interface
   * @param {?Object} [options = {}]
   * @property {{host: string, port: number, remote: boolean}} connect
   * @return {Promise<CRI>}
   * @public
   */
  static connect (options) {
    options = options || {}
    if (options.connect === undefined) {
      options.connect = {
        host: 'localhost',
        port: 9222,
        remote: true
      }
    } else {
      if (options.connect.port === undefined) {
        options.connect.port = 9222
      }
      if (options.connect.host === undefined) {
        options.connect.host = 'localhost'
      }
      options.connect.remote = true
    }
    return CRI(options.connect)
  }

  /**
   * @desc Create and connect to a new tab of a running Chrome instance
   * @param {?Object} [options = {}]
   * @property {{host: string, port: number, remote: boolean}} connect
   * @return {Promise<CRI>}
   * @public
   */
  static async newTab (options) {
    options = options || {}
    if (options.connect === undefined) {
      options.connect = {
        host: 'localhost',
        port: 9222,
        remote: true
      }
    } else {
      if (options.connect.port === undefined) {
        options.connect.port = 9222
      }
      if (options.connect.host === undefined) {
        options.connect.host = 'localhost'
      }
      options.connect.remote = true
    }

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
   * @param {?Object} [options = {}]
   * @property {{host: string, port: number, remote: boolean}} connect
   * @return {Promise<Object>}
   * @public
   */
  static async getProtocolDef (options) {
    options = options || {}
    if (options.connect === undefined) {
      options.connect = {
        host: 'localhost',
        port: 9222,
        remote: true
      }
    } else {
      if (options.connect.port === undefined) {
        options.connect.port = 9222
      }
      if (options.connect.host === undefined) {
        options.connect.host = 'localhost'
      }
      options.connect.remote = true
    }
    return CRI.Protocol(options.connect)
  }
}

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

module.exports = Launcher
