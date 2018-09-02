/*
 Squidwarc  Copyright (C) 2017 - present  John Berlin <n0tan3rd@gmail.com>

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

const fileNamify = require('filenamify-url')
const moment = require('moment')
const path = require('path')

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
      path.join(outPath, `${fileNamify(seedURL)}-${moment().format('MM-DD-YYYY_x')}.warc`)
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
   * @param {string} config
   * @param {string} outPath
   * @return {function(seedURL: string): string}
   */
  static apndWarcNamePerURL (config, outPath) {
    let fseed
    return function (seedURL) {
      if (fseed == null) {
        fseed = path.join(
          outPath,
          `${fileNamify(seedURL)}-[${config}]-${moment().format('MM-DD-YYYY_x')}.warc`
        )
      }
      return fseed
    }
  }
}

module.exports = WARCNaming
