/*
 Squidwarc  Copyright (C) 2017-present  John Berlin <n0tan3rd@gmail.com>

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
