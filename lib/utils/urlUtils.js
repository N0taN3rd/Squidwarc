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

const partialRight = require('lodash/partialRight')
const _normalizeURL = require('normalize-url')

/**
 * @desc the default URL normalization function
 * does not strip ```www`` or ```fragment```
 */
const normalizeURL = partialRight(_normalizeURL, {
  stripHash: false,
  stripWWW: true
})

/**
 * @desc wrapper around {@link https://github.com/sindresorhus/normalize-url} that
 * given a configuration for normalize-url returns a function that applies the normalization
 * to the supplied URL
 * @param {Object} configuration
 * @return {function (url: string): string}
 */
function configureURLNormalizer (
  configuration = { stripHash: false, stripWWW: true }
) {
  return partialRight(_normalizeURL, configuration)
}

/**
 *
 * @type {{normalizeURL: function(string): string, configureURLNormalizer: (function(Object=): *)}}
 */
module.exports = {
  normalizeURL,
  configureURLNormalizer
}
