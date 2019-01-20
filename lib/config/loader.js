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
const yaml = require('js-yaml')
const untildify = require('untildify')
const { defaultOpts } = require('../defaults')
const cp = require('../utils/colorPrinters')
const FH = require('../frontier/helper')
const uuid = require('uuid/v1')

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

class Loader {
  /**
   *
   * @param {string} confPath
   * @return {Promise<Object>}
   */
  static async load (confPath) {
    const configPath = path.resolve(untildify(confPath))
    const exists = await fs.pathExists(configPath)
    if (!exists) {
      throw new Error(`The config file does not exist: path = ${configPath}`)
    }
    let config
    if (path.extname(configPath).includes('json')) {
      config = await fs.readJSON(configPath)
    } else {
      const rawConf = await fs.readFile(confPath, 'utf8')
      config = yaml.safeLoad(rawConf)
    }
    const chrome = Object.assign(
      {
        use: config.use || 'chrome',
        headless: config.headless != null ? config.headless : true,
        ...defaultOpts.connect
      },
      config.chrome,
      config.connect
    )
    if (chrome.userDataDir) {
      chrome.userDataDir = path.resolve(untildify(chrome.userDataDir))
    }
    const crawlControl = Object.assign(
      {
        script: config.script,
        mode: 'page-only',
        depth: 1,
        ...defaultOpts.crawlControl
      },
      config.crawlControl
    )
    crawlControl.script = await Loader.ensureScript(crawlControl.script)
    if (crawlControl.script && chrome.use === 'chrome') {
      chrome.use = 'puppeteer'
    }
    const warc = Object.assign(
      {
        gzip:
          process.env.SQUIDWARC_WRITE_GZIPPED != null ||
          process.env.NODEWARC_WRITE_GZIPPED != null ||
          false,
        ...defaultOpts.warc
      },
      config.warc
    )
    warc.appending = warc.appending || warc.append || false
    const seeds = await Loader.ensureSeeds(
      config.seeds,
      crawlControl.mode,
      crawlControl.depth
    )
    return { chrome, crawlControl, warc, seeds }
  }

  /**
   * @desc Load the user supplied script (if it exists) and perform validation of it
   * @param {string} scriptP - The path to the user script
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
    const scriptExists = await fs.pathExists(scriptPath)
    if (!scriptExists) {
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
 * @type {{Loader: Loader}}
 */
module.exports = { Loader }
