/*
 Control Chrome Headless  Copyright (C) 2017  John Berlin <n0tan3rd@gmail.com>

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 Control Chrome Headless is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this Control Chrome Headless.  If not, see <http://www.gnu.org/licenses/>
 */

const partialRight = require('lodash/partialRight')
const _normalizeURL = require('normalize-url')
const fileNamify = require('filenamify-url')
const moment = require('moment')
const path = require('path')

/**
 * @desc the default URL normalization function
 * does not strip ```www`` or ```fragment```
 */
const normalizeURL = partialRight(_normalizeURL, {stripFragment: false, stripWWW: false})

/**
 * @desc wrapper around {@link https://github.com/sindresorhus/normalize-url} that
 * given a configuration for normalize-url returns a function that applies the normalization
 * to the supplied URL
 * @param {Object} configuration
 * @return {function (url: string): string}
 */
function configureURLNormalizer (configuration = {stripFragment: false, stripWWW: false}) {
  return partialRight(_normalizeURL, configuration)
}

/**
 * @desc Returns a function that will concatenate the output path with the filenamified seedURL
 * producing the full path to WARC of the page being preserved
 * @param {string} outPath the full path to the WARC file output directory
 * @return {function(seedURL: string): string}
 */
function warcNamePerURL (outPath) {
  return (seedURL) => path.join(outPath, `${fileNamify(seedURL)}-${moment().format('YYYY-MMM-DD_x')}.warc`)
}

/**
 * @desc Returns a function that provides the full path to WARC file being written to
 * @param {string} outPath  the full path to the WARC file output directory
 * @param {string} warcName the name of the WARC file to create
 * @return {function(): string}
 */
function suppliedWarcName (outPath, warcName) {
  const warcFilePath = path.join(outPath, warcName)
  return () => warcFilePath
}

module.exports = {
  normalizeURL,
  configureURLNormalizer,
  warcNamePerURL,
  suppliedWarcName
}
