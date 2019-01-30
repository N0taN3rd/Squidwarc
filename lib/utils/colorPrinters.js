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
const chalk = require('chalk')
const PrettyError = require('pretty-error')
/**
 * @type {module:pretty-error.PrettyError}
 */
const pe = new PrettyError()

pe.appendStyle({
  'pretty-error > header > message': {
    color: 'bright-red'
  }
})

/**
 * @desc Utility class for displaying colored text in console
 */
class ColorPrinters {
  /**
   * @desc Yellow colored console.log
   * @param args
   */
  static yellow (...args) {
    console.log(chalk.yellow(...args))
  }

  /**
   * @desc Green colored console.log
   * @param args
   */
  static green (...args) {
    console.log(chalk.green(...args))
  }

  /**
   * @desc Red colored console.log
   * @param args
   */
  static red (...args) {
    console.log(chalk.red(...args))
  }

  /**
   * @desc Bright red colored console.log
   * @param args
   */
  static bred (...args) {
    console.log(chalk.bold.red(...args))
  }

  /**
   * @desc Blue colored console.log
   * @param args
   */
  static blue (...args) {
    console.log(chalk.blue(...args))
  }

  /**
   * @desc Cyan colored console.log
   * @param args
   */
  static cyan (...args) {
    console.log(chalk.cyan(...args))
  }

  /**
   * @desc Magenta colored console.log
   * @param args
   */
  static magenta (...args) {
    console.log(chalk.magenta(...args))
  }

  /**
   * @desc Display an error message and pretty print the exception
   * @param {string} m - The message to display
   * @param {Error} error - The exception to pretty print
   */
  static error (m, error) {
    console.log(chalk.bold.red(m))
    console.log(pe.render(error))
  }

  /**
   * @desc Bold blue first arg, green rest
   * @param bb
   * @param rest
   */
  static boldBlueGreen (bb, ...rest) {
    console.log(chalk.bold.blue(bb), chalk.green(...rest))
  }

  /**
   * @desc Display an crawler option ack
   * @param f
   * @param r
   */
  static crawlerOpt (f, ...r) {
    console.log(chalk.bold.blue(f), chalk.bold.yellow(...r))
  }

  /**
   * @desc Display message about how the crawl config is broke
   * @param m
   * @param config
   */
  static configError (m, config) {
    console.log(chalk.bold.red(m))
    console.log(chalk.red(JSON.stringify(config, null, '\t')))
  }
}

/**
 * @type {chalk}
 */
ColorPrinters.chalk = chalk

/**
 * @type {ColorPrinters}
 */
module.exports = ColorPrinters
