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

const cp = require('child_process')
const path = require('path')
const fs = require('fs-extra')

/**
 * @type {RegExp}
 */
const nlre = /\r?\n/
/**
 * @type {RegExp}
 */
const desktopArgRE = /(^[^ ]+).*/

/**
 * @desc Executes the supplied command
 * @param {string} someCommand
 * @param {boolean} [rejectOnError = false]
 * @returns {Promise<string>}
 */
function exec (someCommand, rejectOnError = false) {
  return new Promise((resolve, reject) => {
    cp.exec(someCommand, { encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error && rejectOnError) reject(error)
      resolve(stdout.trim())
    })
  })
}

/**
 * @desc Executes the which command for the supplied executable name
 * @param {string} executable
 */
function which (executable) {
  return exec(`which ${executable}`)
}

/**
 * @desc Executes the ls command for the supplied path looking for .desktop files for Chrome or Chromium
 * @param {string} desktopPath
 * @returns {Promise<string[]>}
 */
function chromeDesktops (desktopPath) {
  // eslint-disable-next-line
  return exec(`ls ${desktopPath} | grep -E "\/.*\/(google|chrome|chromium)-.*"`).then(
    results => results.split(nlre)
  )
}

/**
 * @desc Extracts the Chrome or Chromium executable path from the .desktop file
 * @param {string} desktopPath
 * @returns {Promise<string[]>}
 */
async function desktopExePath (desktopPath) {
  let maybeResults
  // eslint-disable-next-line
  const patternPipe = `"^Exec=\/.*\/(google|chrome|chromium)-.*" ${desktopPath} | awk -F '=' '{print $2}'`
  try {
    maybeResults = await exec(`grep -ER ${patternPipe}`, true)
  } catch (e) {
    maybeResults = await exec(`grep -Er ${patternPipe}`)
  }
  const seen = new Set()
  let keep
  return maybeResults
    .split(nlre)
    .map(execPath => execPath.replace(desktopArgRE, '$1'))
    .filter(exePath => {
      keep = !seen.has(exePath)
      seen.add(exePath)
      return keep
    })
}

/**
 * @desc Tests (T|F) to see if the execPath is executable by this process
 * @param {string} execPath - The executable path to test
 * @returns {Promise<boolean>}
 */
async function bingo (execPath) {
  if (!execPath || execPath === '') return false
  try {
    await fs.access(execPath, fs.constants.X_OK)
    return true
  } catch (e) {
    return false
  }
}

/**
 * @desc Utility class that provides functionality for finding an suitable chrome executable
 */
class ChromeFinder {
  /**
   * @desc Finds an acceptable Chrome or Chromium executable.
   * If the env key 'CHROME_PATH' is defined that is returned by default
   * @returns {Promise<string>}
   */
  static async findChrome () {
    if (await bingo(process.env.CHROME_PATH)) {
      return process.env.CHROME_PATH
    }
    let plat = process.platform
    if (plat === 'linux') {
      return ChromeFinder.findChromeLinux()
    } else if (plat === 'darwin') {
      return ChromeFinder.findChromeDarwin()
    } else if (plat === 'win32') {
      return ChromeFinder.findChromeWindows()
    } else {
      throw new Error(`Unsupported platform ${plat}`)
    }
  }

  /**
   * @desc Finds an acceptable Chrome or Chromium executable on Linux
   * If one is not found throws
   * @throws Error - If an acceptable executable was not found
   * @returns {Promise<string>}
   */
  static async findChromeLinux () {
    const execs = [
      'google-chrome-unstable',
      'google-chrome-beta',
      'google-chrome-stable',
      'chromium-browser',
      'chromium'
    ]
    let i = 0
    let len = execs.length
    let commandResults
    // check which exec first
    while (i < len) {
      commandResults = await which(execs[i])
      if (await bingo(commandResults)) {
        return commandResults
      }
      i += 1
    }
    // which executable did not result in an exe so we must now check desktop files
    const desktops = [
      '/usr/share/applications/*.desktop',
      '~/.local/share/applications/*.desktop'
    ]
    len = desktops.length
    let len2
    let j = 0
    i = 0
    let found = []
    while (i < len) {
      commandResults = await chromeDesktops(desktops[i])
      len2 = commandResults.length
      while (j < len2) {
        found = found.concat(await desktopExePath(commandResults[j]))
        j += 1
      }
      i += 1
    }
    const desiredExes = [
      { regex: /google-chrome-unstable$/, weight: 52 },
      { regex: /google-chrome-beta$/, weight: 51 },
      { regex: /google-chrome-stable$/, weight: 50 },
      { regex: /google-chrome$/, weight: 49 },
      { regex: /chrome-wrapper$/, weight: 48 },
      { regex: /chromium-browser$/, weight: 47 },
      { regex: /chromium$/, weight: 46 }
    ]
    let sortedExes = found
      .map(exep => {
        for (const desired of desiredExes) {
          if (desired.regex.test(exep)) {
            return { exep, weight: desired.weight }
          }
        }
        return { exep, weight: 10 }
      })
      .sort((a, b) => b.weight - a.weight)
      .map(pair => pair.exep)
    if (sortedExes.length > 0) {
      return sortedExes[0]
    }
    throw new Error('No Chrome Installations Found')
  }

  /**
   * @desc Finds an acceptable Chrome or Chromium executable on MacOS
   * If one is not found throws
   * @throws Error - If an acceptable executable was not found
   * @returns {Promise<string>}
   */
  static async findChromeDarwin () {
    // shamelessly borrowed from chrome-launcher (https://github.com/GoogleChrome/chrome-launcher/blob/master/chrome-finder.ts)
    const suffixes = [
      '/Contents/MacOS/Google Chrome Canary',
      '/Contents/MacOS/Google Chrome'
    ]

    const LSREGISTER =
      '/System/Library/Frameworks/CoreServices.framework' +
      '/Versions/A/Frameworks/LaunchServices.framework' +
      '/Versions/A/Support/lsregister'
    const nlre = /\r?\n/
    const installations = []

    let commandResults = await exec(
      `${LSREGISTER} -dump | grep -i 'google chrome\\( canary\\)\\?.app$' | awk '{$1="" print $0}'`
    )
    let i = 0
    let split = commandResults.split(nlre)
    let len = split.length
    let execPath
    let inst

    while (i < len) {
      inst = split[i]
      execPath = path.join(inst.trim(), suffixes[0])
      if (await bingo(execPath)) {
        installations.push(execPath)
      }
      execPath = path.join(inst.trim(), suffixes[1])
      if (await bingo(execPath)) {
        installations.push(execPath)
      }
      i += 1
    }

    // Retains one per line to maintain readability.
    // clang-format off
    const priorities = [
      { regex: new RegExp(`^${process.env.HOME}/Applications/.*Chrome.app`), weight: 50 },
      {
        regex: new RegExp(`^${process.env.HOME}/Applications/.*Chrome Canary.app`),
        weight: 51
      },
      { regex: /^\/Applications\/.*Chrome.app/, weight: 100 },
      { regex: /^\/Applications\/.*Chrome Canary.app/, weight: 101 },
      { regex: /^\/Volumes\/.*Chrome.app/, weight: -2 },
      { regex: /^\/Volumes\/.*Chrome Canary.app/, weight: -1 }
    ]

    if (process.env.CHROME_PATH) {
      priorities.unshift({ regex: new RegExp(`${process.env.CHROME_PATH}`), weight: 151 })
    }
    const defaultPriority = 10
    let sortedExes = installations
      // assign priorities
      .map(inst => {
        for (const pair of priorities) {
          if (pair.regex.test(inst)) {
            return { path: inst, weight: pair.weight }
          }
        }
        return { path: inst, weight: defaultPriority }
      })
      // sort based on priorities
      .sort((a, b) => b.weight - a.weight)
      // remove priority flag
      .map(pair => pair.path)[0]
    if (sortedExes.length > 0) {
      return sortedExes[0]
    }
    throw new Error('No Chrome Installations Found')
  }

  /**
   * @desc Finds an acceptable Chrome or Chromium executable on Windows
   * If one is not found throws
   * @throws Error - If an acceptable executable was not found
   * @returns {Promise<string>}
   */
  static async findChromeWindows () {
    // shamelessly borrowed from chrome-launcher (https://github.com/GoogleChrome/chrome-launcher/blob/master/chrome-finder.ts)
    const installations = []
    const suffixes = [
      `${path.sep}Google${path.sep}Chrome SxS${path.sep}Application${path.sep}chrome.exe`,
      `${path.sep}Google${path.sep}Chrome${path.sep}Application${path.sep}chrome.exe`
    ]
    const prefixes = [
      process.env.LOCALAPPDATA,
      process.env.PROGRAMFILES,
      process.env['PROGRAMFILES(X86)']
    ].filter(Boolean)

    if (process.env.CHROME_PATH && (await bingo(process.env.CHROME_PATH))) {
      installations.push(process.env.CHROME_PATH)
    }

    let i = 0
    let j = 0
    let len = prefixes.length
    let len2 = suffixes.length
    let chromePath
    while (i < len) {
      while (j < len2) {
        chromePath = path.join(prefixes[i], suffixes[j])
        if (await bingo(chromePath)) {
          installations.push(chromePath)
        }
        j += 1
      }
      i += 1
    }
    if (installations.length > 0) {
      return installations[0]
    }
    throw new Error('No Chrome Installations Found')
  }
}

/**
 * @type {ChromeFinder}
 */
module.exports = ChromeFinder
