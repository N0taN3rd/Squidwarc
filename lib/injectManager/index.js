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

const pageInjects = require('./pageInjects')

/**
 * @desc Manages the JavaScript that is injected into the page
 */
class InjectManager {
  /**
   * @desc Receive the raw scroll page function
   * @return {function(): Promise<void>}
   */
  static rawScoll () {
    return pageInjects.scroll.scrollPage
  }

  /**
   * @desc Receive the raw function that helps ensure that the pages JS can not be naughty
   * @return {function(): Promise<void>}
   */
  static rawNoNaughty () {
    return pageInjects.noNaughtJs
  }

  /**
   * @desc Receive the raw function that is used to collect outlines from the pre-injected script of {@link getCrawlInjects}
   * @return {function(): Promise<any>}
   */
  static rawCollectInject () {
    return pageInjects.collectLinks.collect
  }

  /**
   *
   * @return {function(): Promise<{outlinks: string, links: Array<string>}>}
   */
  static rawOutLinks () {
    return pageInjects.collectLinks.outLinks
  }

  /**
   *
   * @param {boolean} [old = false]
   * @return {{scriptSource: string} | {source: string}}
   */
  static getCollectInject (old = false) {
    const key = old ? 'scriptSource' : 'source'
    return {
      [key]: `(${pageInjects.collectLinks.collect.toString()})()`
    }
  }

  /**
   *
   * @param {boolean} [old = false]
   * @return {{scriptSource: string} | {source: string}}
   */
  static getNoNaughtyJsInject (old = false) {
    const key = old ? 'scriptSource' : 'source'
    return {
      [key]: `(${pageInjects.noNaughtJs.toString()})()`
    }
  }

  /**
   *
   * @param {boolean} [old = false]
   * @return {{scriptSource: string} | {source: string}}
   */
  static getScollOnLoadInject (old = false) {
    const key = old ? 'scriptSource' : 'source'
    return {
      [key]: `(${pageInjects.scroll.scrollOnLoad.toString()})()`
    }
  }

  /**
   *
   * @param {boolean} [old = false]
   * @return {{scriptSource: string} | {source: string}}
   */
  static getScrollInject (old = false) {
    const key = old ? 'scriptSource' : 'source'
    return {
      [key]: `(${pageInjects.scroll.scrollOnLoad.toString()})()`
    }
  }

  /**
   *
   * @param {boolean} [old = false]
   * @return {{scriptSource: string} | {source: string}}
   */
  static getCrawlInjects (old = false) {
    const key = old ? 'scriptSource' : 'source'
    return {
      [key]: `(function (){
        (${pageInjects.noNaughtJs.toString()})();
        (${pageInjects.scroll.scrollOnLoad.toString()})();
        (${pageInjects.collectLinks.init.toString()})();
      })();`
    }
  }

  /**
   *
   * @param {boolean} [old = false]
   * @return {{scriptSource: string} | {source: string}}
   */
  static getCrawlInjectsNoScroll (old = false) {
    const key = old ? 'scriptSource' : 'source'
    return {
      [key]: `(function (){
        (${pageInjects.noNaughtJs.toString()})();
        (${pageInjects.collectLinks.init.toString()})();
      })();`
    }
  }
}

module.exports = InjectManager
