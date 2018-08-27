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
