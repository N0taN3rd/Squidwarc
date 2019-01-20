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

const fileNamify = require('filenamify-url')
const moment = require('moment')
const path = require('path')
const cp = require('./colorPrinters')

/**
 * @desc Class that initializes the warc naming function used when generating the warcs
 */
class WARCNaming {
  /**
   * @desc Returns a function that will concatenate the output path with the filenamified seedURL
   * producing the full path to WARC of the page being preserved
   * @param {string} outPath the full path to the WARC file output directory
   * @return {function(seedURL: string): string}
   */
  static warcNamePerURL (outPath) {
    return seedURL =>
      path.join(
        outPath,
        `${fileNamify(seedURL, { replacement: '_' })}-${moment().format(
          'MM-DD-YYYY_x'
        )}.warc`
      )
  }

  /**
   * @desc Returns a function that provides the full path to WARC file being written to
   * @param {string} outPath  the full path to the WARC file output directory
   * @param {string} warcName the name of the WARC file to create
   * @return {function(): string}
   */
  static suppliedWarcName (outPath, warcName) {
    const warcFilePath = path.join(outPath, warcName)
    return () => warcFilePath
  }

  /**
   * @desc Returns a function that creates a WARC filename based on the first URL supplied to returned function
   * @param {string} outPath
   * @return {function(seedURL: string): string}
   */
  static apndWarcNamePerURL (outPath) {
    let fseed
    return function (seedURL) {
      if (fseed == null) {
        fseed = path.join(
          outPath,
          `${fileNamify(seedURL, { replacement: '_' })}-${moment().format(
            'MM-DD-YYYY_x'
          )}.warc`
        )
      }
      return fseed
    }
  }

  /**
   * @desc Configures the function that produces the WARC(s) name
   * @param {CrawlConfig} options
   */
  static getWarcNamingFunction ({ warc }) {
    if (warc.naming.toLowerCase() === 'url') {
      cp.crawlerOpt('Crawler Will Be Generating WARC Files Using', 'the filenamified url')
      if (warc.appending) return WARCNaming.apndWarcNamePerURL(warc.output)
      return WARCNaming.warcNamePerURL(warc.output)
    }
    warc.appending = true
    cp.crawlerOpt('Crawler Will Be Generating A WARC File Named', warc.naming)
    return WARCNaming.suppliedWarcName(warc.output, warc.naming)
  }
}

module.exports = WARCNaming
