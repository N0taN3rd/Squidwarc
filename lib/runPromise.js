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

const cp = require('../lib/utils/colorPrinters')

/**
 * @desc just a no op
 */
function thenNoop () {}

/**
 * @desc The default Promise.catch function
 * @param {Error} err
 */
function defaultCatcher (err) {
  cp.error('A Fatal Error Occurred', err)
  cp.bred(
    'Please Inform The Maintainer Of This Project About It. Information In package.json'
  )
}

/**
 * @desc Runs a promise using the supplied thener and catcher functions
 * @param {!function(): Promise<any> | Promise<any>} runnable The promise or async / promise returning function to run
 * @param {function(...args: any)} [thener]  The callback function to be supplied to Promise.then
 * @param {function(...args: any)} [catcher] The callback function to be supplied to Promise.catch
 * @return {void}
 */
function runPromise (runnable, thener = thenNoop, catcher = defaultCatcher) {
  if (typeof runnable.then === 'function') {
    runnable.then(thener).catch(catcher)
  } else {
    runnable()
      .then(thener)
      .catch(catcher)
  }
}

module.exports = runPromise
