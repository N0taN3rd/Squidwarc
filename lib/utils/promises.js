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

const cp = require('../utils/colorPrinters')

/**
 * @ignore
 * @desc Default function that does nothing
 */
function thenNoop () {}

/**
 * @desc Default catch function for promises. Prints error and message
 * @param {Error} err
 */
function defaultCatcher (err) {
  cp.error('A Fatal Error Occurred', err)
  cp.bred(
    'Please Inform The Maintainer Of This Project About It. Information In package.json'
  )
  process.exit()
}

/**
 * @desc Runs a promise using the supplied thener and catcher functions
 * @param {function()|Promise} runnable The promise or async / promise returning function to run
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

/**
 * @desc Composes the supplied function with {@link runPromise}.
 * @param {function(...args: any): Promise} runnable
 * @returns {function(...args: any): void}
 */
exports.makeRunnable = function makeRunnable (runnable) {
  return function () {
    return runPromise(runnable.apply(this, arguments))
  }
}

/**
 * @desc Promise wrapper around {@link setTimeout}
 * @param {number} amount - The amount of time to delay by
 * @return {Promise<void>}
 */
exports.delay = function delay (amount) {
  return new Promise(resolve => {
    setTimeout(resolve, amount)
  })
}
