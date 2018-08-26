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

/**
 * @typedef {Object} ConnectOptions
 * @property {string} host
 * @property {number} port
 * @property {boolean} remote
 */

/**
 * @typedef {Object} Seed
 * @property {string} url
 * @property {Symbol} mode
 * @property {number} depth
 */

'use strict'
const path = require('path')
const {inspect} = require('util')
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
   * @param {string} configPath
   * @returns {Promise<{use: string, headless: boolean, mode: string, depth: number, connect: ConnectOptions, crawlControl: {globalWait: number, inflightIdle: number, navWait: number, numInflight: number}, versionInfo: {v: string, isPartOfV: string, warcInfoDescription: string}, warc: {naming: string, output: string, append: boolean}, seeds: Seed|Seed[], script: function(page: Page): void}>}
   */
  static async loadConfig (configPath) {
    let {
      use = 'chrome',
      headless = true,
      mode = 'page-only',
      depth = 1,
      connect = defaultOpts.connect,
      crawlControl = defaultOpts.crawlControl,
      versionInfo = defaultOpts.versionInfo,
      warc = defaultOpts.warc,
      seeds,
      script
    } = await fs.readJSON(configPath)
    connect.host = connect.host || defaultOpts.connect.host
    connect.port = connect.port || defaultOpts.connect.port
    warc.naming = warc.naming || defaultOpts.warc.naming
    warc.output = warc.output || defaultOpts.warc.output
    warc.append = warc.append || defaultOpts.warc.append
    script = await Config.ensureScript(script)
    if (script != null && use === 'chrome') {
      use = 'puppeteer'
    }
    seeds = await Config.ensureSeeds(seeds, mode, depth)
    return {
      use,
      headless,
      mode,
      depth,
      connect,
      crawlControl,
      versionInfo,
      warc,
      seeds,
      script
    }
  }

  /**
   * @desc Load the user supplied script (if it exists) and perform validation of it
   * @param {?string} scriptP - The path to the user script
   * @returns {Promise<function(page: Page): void>}
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
   * @param {string} mode - The crawl mode for the seeds
   * @param {number} depth - The depth of the crawl
   * @return {Promise<Array<{url: string, mode: Symbol, depth: number}>|{url: string, mode: Symbol, depth: number}>}
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

module.exports = Config
