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
const pe = new PrettyError()

pe.appendStyle({
  'pretty-error > header > message': {
    color: 'bright-red'
  }
})

class ColorPrinters {
  static yellow (...args) {
    console.log(chalk.yellow(...args))
  }

  static green (...args) {
    console.log(chalk.green(...args))
  }

  static red (...args) {
    console.log(chalk.red(...args))
  }

  static bred (...args) {
    console.log(chalk.bold.red(...args))
  }

  static blue (...args) {
    console.log(chalk.blue(...args))
  }

  static cyan (...args) {
    console.log(chalk.cyan(...args))
  }

  static magenta (...args) {
    console.log(chalk.magenta(...args))
  }

  static error (m, error) {
    console.log(chalk.bold.red(m))
    console.log(pe.render(error))
  }

  static boldBlueGreen (bb, ...rest) {
    console.log(chalk.bold.blue(bb), chalk.green(...rest))
  }

  static crawlerOpt (f, ...r) {
    console.log(chalk.bold.blue(f), chalk.bold.yellow(...r))
  }

  static configError (m, config) {
    console.log(chalk.bold.red(m))
    console.log(chalk.red(JSON.stringify(config, null, '\t')))
  }
}

ColorPrinters.chalk = chalk

module.exports = ColorPrinters
