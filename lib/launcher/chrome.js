/**
 * @typedef {Object} CRI
 * @property {Object} Runtime
 * @property {Object} Debugger
 * @property {Object} DOM
 * @property {Object} Page
 * @property {Object} Network
 * @property {Object} Animation
 * @property {Object} Emulation
 *
 */

const os = require('os')
const path = require('path')
const BPromise = require('bluebird')
const cp = require('child_process')
const fs = require('fs-extra')
const CRI = require('chrome-remote-interface')
const readline = require('readline')
const DEFAULT_ARGS = require('./defaultArgs')

// heavily inspired if not copied from puppeteer
const CHROME_PROFILE_PATH = path.join(os.tmpdir(), 'squidwarc_profile-')

function bingo (somePath) {
  if (!somePath) return false
  try {
    fs.accessSync(somePath)
  } catch (error) {
    return false
  }
  return true
}

class ChromeLauncher {
  static findChrome () {
    if (bingo(process.env.CHROME_PATH)) {
      return process.env.CHROME_PATH
    }
    let plat = process.platform
    if (plat === 'linux') {
      return ChromeLauncher.findChromeLinux()
    } else if (plat === 'darwin') {
      return ChromeLauncher.findChromeDarwin()
    } else {
      throw new Error(`Unsupported platform ${plat}`)
    }
  }

  static async findChromeLinux () {
    const nlre = /\r?\n/
    const exec = BPromise.promisify(cp.exec)
    const execs = [
      'google-chrome-beta',
      'google-chrome-unstable',
      'google-chrome-stable',
      'chromium-browser',
      'chromium'
    ]
    let len = execs.length
    let i = 0
    let theExe
    while (i < len) {
      try {
        theExe = await exec(`which ${execs[i]}`)
        theExe = theExe.split(nlre)[0]
        if (bingo(theExe)) {
          return theExe
        }
      } catch (e) {
        // no exist
      }
      i++
    }
    const desktops = [
      '/usr/share/applications/*.desktop',
      '~/.local/share/applications/*.desktop'
    ]
    const argumentsRegex = /(^[^ ]+).*/
    const desktopFinder = /(.*(?:google|chrome|chromium).*\.desktop)/gmi
    let maybeString
    let matchAr
    len = execs.length
    for (let desktop of desktops) {
      try {
        maybeString = await exec(`ls ${desktop}`)
        if (maybeString.length > 0) {
          matchAr = desktopFinder[Symbol.match](maybeString)
          if (matchAr !== null && matchAr.length > 0) {
            let whichOne = matchAr.reduce((acum, str) => {
              acum[path.basename(str, '.desktop')] = str
              return acum
            }, {})
            i = 0
            while (i < len) {
              if (whichOne[execs[i]] !== undefined) {
                maybeString = await exec(
                  `grep -E "^Exec=\/.*\/(google|chrome|chromium)-.*" ${whichOne[execs[i]]} | awk -F '=' '{print $2}'`)
                theExe = Array.from(new Set(maybeString.split(nlre)
                  .map(it => it.replace(argumentsRegex, '$1'))))[0]
                if (bingo(theExe)) {
                  return theExe
                }
              }
              i++
            }
          }
        }
      } catch (e) {
        // no exist
      }
    }
    throw new Error('No Chrome Installations Found')
  }

  static async findChromeDarwin () {
    // shamelessly borrowed from chrome-launcher (https://github.com/GoogleChrome/chrome-launcher/blob/master/chrome-finder.ts)
    const suffixes = [
      '/Contents/MacOS/Google Chrome Canary',
      '/Contents/MacOS/Google Chrome']

    const LSREGISTER = '/System/Library/Frameworks/CoreServices.framework' +
      '/Versions/A/Frameworks/LaunchServices.framework' +
      '/Versions/A/Support/lsregister'
    const nlre = /\r?\n/
    const installations = []
    const exec = BPromise.promisify(cp.exec)

    let str = await exec(
      `${LSREGISTER} -dump | grep -i 'google chrome\\( canary\\)\\?.app$' | awk '{$1="" print $0}'`)
    str.toString().split(nlre).forEach((inst) => {
      suffixes.forEach(suffix => {
        const execPath = path.join(inst.trim(), suffix)
        if (bingo(execPath)) {
          installations.push(execPath)
        }
      })
    })

    // Retains one per line to maintain readability.
    // clang-format off
    const priorities = [
      {
        regex: new RegExp(`^${process.env.HOME}/Applications/.*Chrome.app`),
        weight: 50
      },
      {
        regex: new RegExp(
          `^${process.env.HOME}/Applications/.*Chrome Canary.app`),
        weight: 51
      },
      {regex: /^\/Applications\/.*Chrome.app/, weight: 100},
      {regex: /^\/Applications\/.*Chrome Canary.app/, weight: 101},
      {regex: /^\/Volumes\/.*Chrome.app/, weight: -2},
      {regex: /^\/Volumes\/.*Chrome Canary.app/, weight: -1}
    ]
    const defaultPriority = 10
    return installations
    // assign priorities
      .map((inst) => {
        for (const pair of priorities) {
          if (pair.regex.test(inst)) {
            return {path: inst, weight: pair.weight}
          }
        }
        return {path: inst, weight: defaultPriority}
      })
      // sort based on priorities
      .sort((a, b) => (b.weight - a.weight))
      // remove priority flag
      .map(pair => pair.path)[0]
  }

  /**
   * @param {?Object} options
   * @return {Promise<CRI>}
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
      options.executablePath = await ChromeLauncher.findChrome()
    }
    let fakeUdir = null
    const chromeArguments = [].concat(DEFAULT_ARGS)
    if (!options.userDataDir) {
      fakeUdir = await fs.mkdtemp(CHROME_PROFILE_PATH)
    }
    chromeArguments.push(`--user-data-dir=${options.userDataDir || fakeUdir}`,
      `--remote-debugging-port=${options.connect.port}`)
    if (options.args) {
      chromeArguments.push(
        ...options.args.filter(arg => !arg.startsWith('--user-data-dir=')))
    }
    if (options.headless) {
      chromeArguments.push(
        '--headless',
        '--disable-gpu',
        '--hide-scrollbars'
      )
    }

    let chromeExecutable = options.executablePath

    const chromeProcess = cp.spawn(chromeExecutable, chromeArguments,
      {stdio: ['ignore', 'ignore', 'pipe']})

    let killed = false
    process.on('exit', killChrome)
    chromeProcess.once('close', () => {
      if (fakeUdir) {
        fs.removeSync(fakeUdir)
      }
    })

    if (options.handleSIGINT !== false) {
      process.on('SIGINT', killChrome)
    }
    if (options.handleSIGTERM !== false) {
      process.on('SIGTERM', killChrome)
    }

    if (options.handleSIGHUP !== false) {
      process.on('SIGHUP', killChrome)
    }

    function killChrome () {
      if (killed) {
        return
      }
      killed = true
      if (chromeProcess.pid && !chromeProcess.killed) {
        try {
          if (process.platform === 'win32') {
            cp.execSync(`taskkill /pid ${chromeProcess.pid} /T /F`)
          } else {
            process.kill(-chromeProcess.pid, 'SIGKILL')
          }
        } catch (e) {
          console.error('There was an error killing chrome')
        }
      }
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
        chromeProcess, options.timeout || 30 * 1000)
      console.log(listeningOn)
      await BPromise.delay(5000)
      criClient = await CRI(options.connect)
    } catch (e) {
      killChrome()
      throw e
    }
    return criClient
  }

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
      options.executablePath = await ChromeLauncher.findChrome()
    }
    let fakeUdir = null
    const chromeArguments = [].concat(DEFAULT_ARGS)
    if (!options.userDataDir) {
      fakeUdir = await fs.mkdtemp(CHROME_PROFILE_PATH)
    }
    chromeArguments.push(`--user-data-dir=${options.userDataDir || fakeUdir}`,
      `--remote-debugging-port=${options.connect.port}`)
    if (options.args) {
      chromeArguments.push(
        ...options.args.filter(arg => !arg.startsWith('--user-data-dir=')))
    }
    if (options.headless) {
      chromeArguments.push(
        '--headless',
        '--disable-gpu',
        '--hide-scrollbars'
      )
    }

    let chromeExecutable = options.executablePath

    const chromeProcess = cp.spawn(chromeExecutable, chromeArguments,
      {stdio: ['ignore', 'ignore', 'pipe']})

    let killed = false
    process.once('exit', killChrome)
    chromeProcess.once('close', () => {
      if (fakeUdir) {
        fs.removeSync(fakeUdir)
      }
    })

    if (options.handleSIGINT !== false) {
      process.once('SIGINT', killChrome)
    }

    function killChrome () {
      if (killed) {
        return
      }
      killed = true
      if (process.platform === 'win32') {
        cp.execSync(`taskkill /pid ${chromeProcess.pid} /T /F`)
      } else {
        chromeProcess.kill('SIGKILL')
      }
    }

    try {
      // await Promise.delay(5000)
      let listeningOn = await waitForWSEndpoint(
        chromeProcess, options.timeout || 30 * 1000)
      console.log(listeningOn)
    } catch (e) {
      killChrome()
      throw e
    }
  }

  /**
   *
   * @param options
   * @return {Promise<Object>}
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
    await ChromeLauncher.launchNoConnect(options)
    return CRI.Protocol(options.connect)
  }
}

function waitForWSEndpoint (chromeProcess, timeout) {
  function addEventListener (emitter, eventName, handler) {
    emitter.on(eventName, handler)
    return {emitter, eventName, handler}
  }

  function removeEventListeners (listeners) {
    for (const listener of listeners) {
      listener.emitter.removeListener(listener.eventName, listener.handler)
    }
    listeners.splice(0, listeners.length)
  }

  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({input: chromeProcess.stderr})
    let stderr = ''
    const listeners = [
      addEventListener(rl, 'line', onLine),
      addEventListener(rl, 'close', onClose),
      addEventListener(chromeProcess, 'exit', onClose)
    ]
    const timeoutId = timeout ? setTimeout(onTimeout, timeout) : 0

    function onClose () {
      cleanup()
      reject(new Error([
        'Failed to launch chrome!',
        stderr
      ].join('\n')))
    }

    function onTimeout () {
      cleanup()
      reject(new Error(
        `Timed out after ${timeout} ms while trying to connect to Chrome!`))
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

module.exports = ChromeLauncher
