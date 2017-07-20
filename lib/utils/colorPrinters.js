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

const chalk = require('chalk')
const PrettyError = require('pretty-error')
const pe = new PrettyError()

module.exports = {
  yellow (...args) {
    console.log(chalk.yellow(...args))
  },
  green (...args) {
    console.log(chalk.green(...args))
  },
  red (...args) {
    console.log(chalk.red(...args))
  },
  bred (...args) {
    console.log(chalk.bold.red(...args))
  },
  blue (...args) {
    console.log(chalk.blue(...args))
  },
  cyan (...args) {
    console.log(chalk.cyan(...args))
  },
  magenta (...args) {
    console.log(chalk.magenta(...args))
  },
  error (m, error) {
    console.log(chalk.bold.red(m))
    console.log(pe.render(error))
  },
  boldBlueGreen (bb, ...rest) {
    console.log(chalk.bold.blue(bb), chalk.green(...rest))
  },
  crawlerOpt (f, ...r) {
    console.log(chalk.bold.blue(f), chalk.bold.yellow(...r))
  },
  configError (m, config) {
    console.log(chalk.bold.red(m))
    console.log(chalk.red(JSON.stringify(config, null, '\t')))
  }
}
