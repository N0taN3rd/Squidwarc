'use strict'
const path = require('path')
const inspect = require('util').inspect
const fs = require('fs-extra')
const untildify = require('untildify')
const { defaultOpts } = require('../defaults')
const cp = require('../utils/colorPrinters')
const FH = require('../frontier/helper')

function badExport (exposed) {
  console.log(cp.chalk`{bold.red Squidwarc does not know how to handled the supplied script:
You supplied a ${typeof exposed}:
    ${inspect(exposed, { depth: null })}}
`)
  console.log(cp.chalk.bold.blue('Please export a function similar to:'))
  console.log(cp.chalk.bold.blue('module.exports = async function (page) {....}'))
}

function notAsync (notAsyncFn) {
  console.log(cp.chalk`{bold.red Squidwarc expects the function exported by user scripts to be async functions
You supplied:
    ${notAsyncFn.toString()}}`)
  console.log(cp.chalk.bold.blue('Please export a function similar to:'))
  console.log(cp.chalk.bold.blue('module.exports = async function (page) {....}'))
}

function usrFNGood () {
  console.log(cp.chalk`{bold.green With great power comes great responsibility!}
{bold.red Squidwarc is not responsible for ill behaved user supplied scripts!}
`)
}

class Config {
  /**
   *
   * @param {string} configPath
   * @returns {Promise<{use: string, headless: boolean, mode: string, depth: number, connect: ({host, port, remote}), crawlControl: ({globalWait, inflightIdle, navWait, numInflight}), versionInfo: ({v, isPartOfV, warcInfoDescription}), warc: ({naming, output, append}), seeds: (Array<{url: string, mode: symbol, depth: number}>|{url: string, mode: symbol, depth: number}), script: (?function(Page))}>}
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
   *
   * @param {?string} scriptP
   * @returns {Promise<?function(page: Page)>}
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
