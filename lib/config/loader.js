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
    let yamlConfig = false
    let config
    if (path.extname(configPath).includes('json')) {
      config = await fs.readJSON(configPath)
    } else {
      const rawConf = await fs.readFile(confPath, 'utf8')
      config = yaml.safeLoad(rawConf)
      yamlConfig = true
    }
    const browser = Object.assign(
      {
        use: config.use || 'chrome',
        headless: config.headless != null ? config.headless : true,
        ...defaultOpts.connect
      },
      config.browser,
      config.connect
    )
    if (browser.userDataDir) {
      browser.userDataDir = path.resolve(untildify(browser.userDataDir))
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
    if (crawlControl.script && browser.use === 'chrome') {
      browser.use = 'puppeteer'
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
    if (config.crawlId) {
      crawlControl.crawlId = config.crawlId
    } else {
      crawlControl.crawlId = uuid()
      config.crawlId = crawlControl.crawlId
      if (yamlConfig) {
        await fs.writeFile(configPath, yaml.safeDump(config), 'utf8')
      } else {
        await fs.writeJSON(confPath, config)
      }
    }
    return { browser, crawlControl, warc }
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
}

/**
 * @type {{Loader: Loader}}
 */
module.exports = { Loader }
