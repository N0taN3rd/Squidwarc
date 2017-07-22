/*
 Squidwarc Copyright (C) 2017  John Berlin <n0tan3rd@gmail.com>

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
const pkg = require('../../package.json')

module.exports = {
  UA: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.71 Safari/537.36',
  defaultOpts: {
    connect: {
      host: 'localhost',
      port: 9222
    },
    timeouts: {
      navigationTimeout: 8000,
      waitAfterLoad: 5000
    },
    versionInfo: {
      v: pkg.version,
      isPartOfV: 'ChromeCrawled',
      warcInfoDescription: ''
    },
    warc: {
      naming: 'url',
      output: process.cwd()
    },
    deviceMetrics: {
      width: 1920,
      height: 1080,
      screenWidth: 1920,
      screenHeight: 1080,
      deviceScaleFactor: 0,
      mobile: false,
      fitWindow: false
    },
    noHTTP2: false
  }
}
