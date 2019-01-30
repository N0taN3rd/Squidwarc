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
const pkg = require('../../package.json')

/**
 * @type {{UA: string, defaultOpts: {connect: Object, timeouts: {navigationTimeout: number, waitAfterLoad: number}, versionInfo: VersionInfo, warc: WARCOptions, deviceMetrics: {width: number, height: number, screenWidth: number, screenHeight: number, deviceScaleFactor: number, mobile: boolean, fitWindow: boolean}, crawlControl: CrawlControl}}}
 */
module.exports = {
  UA:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.71 Safari/537.36',
  defaultOpts: {
    connect: {
      host: 'localhost',
      port: 9222,
      local: false,
      launch: true
    },
    timeouts: {
      navigationTimeout: 8000,
      waitAfterLoad: 5000
    },
    versionInfo: {
      v: pkg.version,
      isPartOfV: 'Squidwarc Crawl',
      warcInfoDescription: 'High fidelity preservation using Squidwarc'
    },
    warc: {
      naming: 'url',
      output: process.cwd(),
      appending: false
    },
    deviceMetrics: {
      width: 1920,
      height: 1080,
      screenWidth: 1920,
      screenHeight: 1080,
      deviceScaleFactor: 1.0,
      mobile: false,
      fitWindow: false
    },
    crawlControl: {
      globalWait: 60000,
      inflightIdle: 1000,
      navWait: 8000,
      numInflight: 2
    }
  }
}
