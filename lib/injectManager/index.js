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

const {
  noNaughtJs,
  scrollPage,
  scrollOnLoad,
  initCollectLinks,
  collect,
  outLinks
} = require('./pageInjects')

/**
 * @desc Manages the JavaScript that is injected into the page
 */
class InjectManager {
  /**
   * @desc Receive the raw scroll page function
   * @return {scrollPage}
   */
  static rawScoll () {
    return scrollPage
  }

  /**
   * @desc Receive the raw function that helps ensure that the pages JS can not be naughty
   * @return {function(): void}
   */
  static rawNoNaughty () {
    return noNaughtJs
  }

  /**
   * @desc Receive the raw function that is used to collect outlines from the pre-injected script of {@link getCrawlInjects}
   * @return {collect}
   */
  static rawCollectInject () {
    return collect
  }

  /**
   * @desc Receive the raw function that is used to collect outlines from each of the pages frames. Used by {@link PuppeteerCrawler}
   * @return {outLinks}
   */
  static rawOutLinks () {
    return outLinks
  }

  /**
   * @desc JS injected into every frame of the page crawled that sets up out link collection
   * @param {boolean} [old = false] - Use Page.addScriptToEvaluateOnLoad (old = true) or Page.addScriptToEvaluateOnNewDocument (old = false) params
   * @return {{scriptSource: string} | {source: string}}
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnLoad
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnNewDocument
   */
  static getCollectInject (old = false) {
    const key = old ? 'scriptSource' : 'source'
    return {
      [key]: `(${collect.toString()})()`
    }
  }

  /**
   * @desc JS injected into every frame of the page crawled that includes disabling things that can act as an crawler trap
   * @param {boolean} [old = false] - Use Page.addScriptToEvaluateOnLoad (old = true) or Page.addScriptToEvaluateOnNewDocument (old = false) params
   * @return {{scriptSource: string} | {source: string}}
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnLoad
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnNewDocument
   */
  static getNoNaughtyJsInject (old = false) {
    const key = old ? 'scriptSource' : 'source'
    return {
      [key]: `(${noNaughtJs.toString()})()`
    }
  }

  /**
   *
   * @param {boolean} [old = false] - Use Page.addScriptToEvaluateOnLoad (old = true) or Page.addScriptToEvaluateOnNewDocument (old = false) params
   * @return {{scriptSource: string} | {source: string}}
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnLoad
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnNewDocument
   */
  static getScollOnLoadInject (old = false) {
    const key = old ? 'scriptSource' : 'source'
    return {
      [key]: `(${scrollOnLoad.toString()})()`
    }
  }

  /**
   * @desc JS injected into every frame of the page crawled that scrolls the page automatically
   * @param {boolean} [old = false] - Use Page.addScriptToEvaluateOnLoad (old = true) or Page.addScriptToEvaluateOnNewDocument (old = false) params
   * @return {{scriptSource: string} | {source: string}}
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnLoad
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnNewDocument
   */
  static getScrollInject (old = false) {
    const key = old ? 'scriptSource' : 'source'
    return {
      [key]: `(${scrollOnLoad.toString()})()`
    }
  }

  /**
   * @desc JS injected into every frame of the page crawled that includes disabling things that can act as an crawler trap, JS that scrolls the page automatically and JS that sets up out link collection
   * @param {boolean} [old = false] - Use Page.addScriptToEvaluateOnLoad (old = true) or Page.addScriptToEvaluateOnNewDocument (old = false) params
   * @return {{scriptSource: string} | {source: string}}
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnLoad
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnNewDocument
   */
  static getCrawlInjects (old = false) {
    const key = old ? 'scriptSource' : 'source'
    return {
      [key]: `(function (){
        (${noNaughtJs.toString()})();
        (${scrollOnLoad.toString()})();
        (${initCollectLinks.toString()})();
      })();`
    }
  }

  /**
   * @desc JS injected into every frame of the page crawled that includes disabling things that can act as an crawler trap and JS that sets up out link collection
   * @param {boolean} [old = false] - Use Page.addScriptToEvaluateOnLoad (old = true) or Page.addScriptToEvaluateOnNewDocument (old = false) params
   * @return {{scriptSource: string} | {source: string}}
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnLoad
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnNewDocument
   */
  static getCrawlInjectsNoScroll (old = false) {
    const key = old ? 'scriptSource' : 'source'
    return {
      [key]: `(function (){
        (${noNaughtJs.toString()})();
        (${initCollectLinks.toString()})();
      })();`
    }
  }
}

/**
 * @type {InjectManager}
 */
InjectManager
