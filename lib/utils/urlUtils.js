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

const partialRight = require('lodash/partialRight')
const _normalizeURL = require('normalize-url')

/**
 * @desc the default URL normalization function
 * does not strip ```www`` or ```fragment```
 */
const normalizeURL = partialRight(_normalizeURL, {
  stripFragment: false,
  stripWWW: false
})

/**
 * @desc wrapper around {@link https://github.com/sindresorhus/normalize-url} that
 * given a configuration for normalize-url returns a function that applies the normalization
 * to the supplied URL
 * @param {Object} configuration
 * @return {function (url: string): string}
 */
function configureURLNormalizer (
  configuration = { stripFragment: false, stripWWW: false }
) {
  return partialRight(_normalizeURL, configuration)
}

module.exports = {
  normalizeURL,
  configureURLNormalizer
}
