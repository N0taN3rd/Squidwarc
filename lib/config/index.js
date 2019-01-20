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

'use strict'
const path = require('path')
const { inspect } = require('util')
const fs = require('fs-extra')
const untildify = require('untildify')
const { defaultOpts } = require('../defaults')
const cp = require('../utils/colorPrinters')
const FH = require('../frontier/helper')

/**
 * @desc Informs the user that they did not export the correct type of user script
 * @param {any} exposed
 */
function badExport (exposed) {
  console.log(cp.chalk`{bold.red Squidwarc does not know how to handled the supplied script:
You supplied a ${typeof exposed}:
    ${inspect(exposed, { depth: null })}}
`)
  console.log(cp.chalk.bold.blue('Please export a function similar to:'))
  console.log(cp.chalk.bold.blue('module.exports = async function (page) {....}'))
}

/**
 * @desc Informs the user that they did not export an async function
 * @param {any} notAsyncFn
 */
function notAsync (notAsyncFn) {
  console.log(cp.chalk`{bold.red Squidwarc expects the function exported by user scripts to be async functions
You supplied:
    ${notAsyncFn.toString()}}`)
  console.log(cp.chalk.bold.blue('Please export a function similar to:'))
  console.log(cp.chalk.bold.blue('module.exports = async function (page) {....}'))
}

/**
 * @desc Informs the user that the user script is good
 */
function usrFNGood () {
  console.log(cp.chalk`{bold.green With great power comes great responsibility!}
{bold.red Squidwarc is not responsible for ill behaved user supplied scripts!}
`)
}

/**
 * @desc Crawl config loader
 */
class Config {
  /**
   * @desc Loads the config file and performs the preliminary normalization
   * @param {string} configPath - Path to this crawls config file
   * @returns {Promise<CrawlConfig>}
   */
  static async loadConfig (configPath) {
    let {
      use = 'chrome',
      headless = true,
      mode = 'page-only',
      depth = 1,
      connect = defaultOpts.connect,
      crawlControl = defaultOpts.crawlControl,
      warc = defaultOpts.warc,
      seeds,
      script
    } = await fs.readJSON(configPath)
    connect.host = connect.host || defaultOpts.connect.host
    connect.port = connect.port || defaultOpts.connect.port
    connect.launch = connect.launch || defaultOpts.connect.launch
    if (connect.userDataDir) {
      connect.userDataDir = untildify(connect.userDataDir)
    }
    warc.naming = warc.naming || defaultOpts.warc.naming
    warc.output = warc.output || defaultOpts.warc.output
    warc.appending = warc.appending || defaultOpts.warc.appending
    const versionInfo = {}
    versionInfo.isPartOf = warc.isPartOf || defaultOpts.versionInfo.isPartOfV
    versionInfo.warcInfoDescription =
      warc.infoDescription || defaultOpts.versionInfo.warcInfoDescription
    script = await Config.ensureScript(script)
    if (script != null && use === 'chrome') {
      use = 'puppeteer'
    }
    seeds = await Config.ensureSeeds(seeds, mode, depth)
    return {
      chrome: {
        use,
        headless,
        local: false,
        ...connect
      },
      mode,
      depth,
      crawlControl,
      warc,
      seeds,
      script,
      versionInfo
    }
  }

  /**
   * @desc Load the user supplied script (if it exists) and perform validation of it
   * @param {?string} scriptP - The path to the user script
   * @returns {Promise<UserScript | null>}
   */
  static async ensureScript (scriptP) {
    if (scriptP == null) {
      return null
    }
    if (typeof scriptP !== 'string') {
      cp.bred(
        `The value for the script field found in the supplied config is not a "string" it is a ${typeof scriptP}`
      )
      cp.bred(
        'To have Squidwarc use a script during crawling please use a string that is a path to the script'
      )
      return null
    }
    const scriptPath = path.resolve(untildify(scriptP))
    if (!await fs.pathExists(scriptPath)) {
      cp.bred(
        `The supplied script path does not exist ${scriptP} [resolved path = ${scriptPath}]`
      )
      return null
    }

    let good = true
    let userFN

    try {
      userFN = require(scriptPath)
    } catch (e) {
      cp.error('Squidwarc is unable to use the supplied user script due to an error!', e)
      good = false
    }

    if (good && typeof userFN !== 'function') {
      badExport(userFN)
      good = false
    }

    if (good && userFN[Symbol.toStringTag] !== 'AsyncFunction') {
      notAsync(userFN)
      good = false
    }

    if (good) {
      usrFNGood()
    }

    return userFN
  }

  /**
   * @desc Normalizes the supplied seeds. If it value of the seeds field is a string loads the seeds from the file
   * @param {string | string[]} seeds - The seeds to be normalized
   * @param {string} mode             - The crawl mode for the seeds
   * @param {number} depth            - The depth of the crawl
   * @return {Promise<Seed | Seed[]>}
   */
  static async ensureSeeds (seeds, mode, depth) {
    if (!Array.isArray(seeds)) {
      if (typeof seeds !== 'string') {
        throw new Error(
          `The value of the seeds field was not an Array\nExpecting a sting that is path to a seeds file.\nSquidwarc found "${typeof seeds}"`
        )
      }
      seeds = untildify(seeds)
      const seedPathExists = await fs.pathExists(seeds)
      if (!seedPathExists) {
        throw new Error(
          `The path to the seed list file contained in the seeds field does not exist`
        )
      }
      seeds = await fs.readJSON(seeds)
      if (!Array.isArray(seeds)) {
        throw new Error(
          `The contents of the seeds file is not an array. Squidwarc found "${typeof seeds}"`
        )
      }
    }
    return FH.normalizeSeeds(seeds, mode, depth)
  }
}

/**
 * @type {Config}
 */
module.exports = Config

/**
 * @typedef {Object} WARCOptions
 * @property {string} [naming = url] - The naming scheme to be used for WARC generation
 * @property {string} [output = <current working directory>] - Path to the directory the WARCs are to be created in
 * @property {boolean} [appending = false] - Should Squidwarc create a single WARC file for the crawl or no
 */

/**
 * @typedef {Object} CrawlControl
 * @property {number} [globalWait = 60000]  - Maximum amount of time, in milliseconds, that Squidwarc should wait before generating a WARC and moving to the next URL
 * @property {number} [numInflight = 2]     - The number of inflight requests (requests with no response) that should exist before starting the inflightIdle timer
 * @property {number} [inflightIdle = 1000] - Amount of time, in milliseconds, that should elapse when there are only numInflight requests for network idle to be determined
 * @property {number} [navWait = 8000]      - Maximum amount of time, in milliseconds, that Squidwarc should wait for indication that the browser has navigated to the page being crawled
 */

/**
 * @typedef {Object} VersionInfo
 * @property {string} [isPartOfV = Squidwarc Crawl] - The value for the isPartOf field of the WARC Info Record
 * @property {string} [warcInfoDescription = High fidelity preservation using Squidwarc] - The value for the description field of the WARC Info Record
 */

/**
 * @typedef {function(page: Page): Promise<void>} UserScript - A user supplied function that Squidwarc will execute once network idle has been reached
 */

/**
 * @typedef {Object} ChromeOptions
 * @property {string}  [use = chrome]     - Should Squidwarc connect directly to Chrome/Chromium or via puppeteer
 * @property {string}  [executable]   - Path to the browser executable or command to be use to launch the browser
 * @property {string}  [userDataDir]      - Path to a user data directory (generated by Chrome/Chromium) to be used rather than a temporary one
 * @property {string}  [host = localhost] - The host name the browsers CDP endpoint is listing on
 * @property {number}  [port = 9222]      - The port number the browsers CDP endpoint is listing on
 * @property {boolean} [launch = true]    - Should Squidwarc launch and manage the browser or connect to an already running instance
 * @property {boolean} [headless = true]  - Should the browser used by Squidwarc be launched in headless mode
 * @property {boolean} [local = false]    - Should the CDP descriptor used by the chrome-remote-interface use the local CDP descriptor or fetch it from the browser connecting to
 */

/**
 * @typedef {Object} CrawlConfig
 * @property {ChromeOptions}  chrome      - Information about how to connect to or launch Chrome/Chromium
 * @property {string}  [mode = page-only] - The mode this crawl is to be operating in
 * @property {number}  [depth = 1]        - The depth of this crawl
 * @property {CrawlControl} crawlControl  - Options for fine tuning the crawl
 * @property {WARCOptions} warc           - Options for how this crawls WARCs should be created
 * @property {VersionInfo} versionInfo    - Information to be included in the WARC Info record fields per page preserved
 * @property {Seed | Seed[]} seeds        - The seed(s) to be crawled
 * @property {UserScript} [script]        - A script to be run when using puppeteer. If the value of this correct, use defaults to puppeteer
 */
