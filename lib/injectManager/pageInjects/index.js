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

const noNaughtJs = require('./noNaughtyJS')
const { scrollPage, scrollOnLoad } = require('./scroll')
const { initCollectLinks, collect, outLinks } = require('./collectLinks')

/**
 * @type {{noNaughtJs: function(): void, scrollPage: scrollPage, scrollOnLoad: scrollOnLoad, initCollectLinks: initCollectLinks, collect: collect, outLinks: outLinks}}
 */
module.exports = {
  noNaughtJs,
  scrollPage,
  scrollOnLoad,
  initCollectLinks,
  collect,
  outLinks
}
