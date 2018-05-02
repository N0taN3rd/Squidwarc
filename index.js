/*
 Squidwarc  Copyright (C) 2017  John Berlin <n0tan3rd@gmail.com>

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

const program = require('commander')
const R = require('ramda')
const configRunner = require('./lib/runners').configRunner
const cp = require('./lib/utils/colorPrinters')

process.on('unhandledRejection', function (reason, p) {
  console.log('Unhandled Rejection:', reason.stack)
  // or next(reason);
})

program
  .version('1.0.0', '-v, --version')
  .option('-c, --config <path-to-config.json>', 'Launch A Crawl From A Config')

program.parse(process.argv)
if (program.rawArgs.slice(2).length === 0) {
  cp.green(program.helpInformation())
  // process.exit(1)
} else {
  if (!R.isNil(program.config)) {
    cp.crawlerOpt('Running Crawl From Config File', program.config)
    configRunner(program.config)
  } else {
    cp.bred('Config argument (-c) was no supplied.')
  }
}
