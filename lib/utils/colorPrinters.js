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
 *
 * @type {chalk}
 */
ColorPrinters.chalk = chalk

module.exports = ColorPrinters
