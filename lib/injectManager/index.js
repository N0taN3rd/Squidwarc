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
   * @desc Receive the raw scroll page function for use with Runtime.evaluate
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Runtime#method-evaluate
   * @return {scrollPage}
   */
  static rawScoll () {
    return scrollPage
  }

  /**
   * @desc Receive the raw function that helps ensure that the pages JS can not be naughty for use with Runtime.evaluate
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Runtime#method-evaluate
   * @return {function(): void}
   */
  static rawNoNaughty () {
    return noNaughtJs
  }

  /**
   * @desc Receive the raw function that is used to collect outlinks from the pre-injected script {@link collect} for use with Runtime.evaluate
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Runtime#method-evaluate
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
   * @desc Receive param object for JS injected into every frame of the page crawled that sets up out link collection
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnNewDocument
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnLoad
   */
  static getCollectInject () {
    return {
      expression: `(${collect.toString()})()`,
      returnByValue: true,
      awaitPromise: true
    }
  }

  /**
   * @desc Receive param object for JS injected into every frame of the page crawled that includes disabling things that can act as an crawler trap
   * @param {boolean} [onNewDocument = true] - Flag indicating if the inject object is for Page.addScriptToEvaluateOnNewDocument (default) or Page.addScriptToEvaluateOnLoad  params
   * @return {OnNewDocumentInject | OnLoadInject} - Object keyed for the params used by the desired CDP method
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnNewDocument
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnLoad
   */
  static getNoNaughtyJsInject (onNewDocument = true) {
    const key = onNewDocument ? 'source' : 'scriptSource'
    return {
      [key]: `(${noNaughtJs.toString()})()`
    }
  }

  /**
   * @desc Receive param object for JS injected into every frame of the page crawled that scrolls the page once the `load` event has fired
   * @param {boolean} [onNewDocument = true] - Flag indicating if the inject object is for Page.addScriptToEvaluateOnNewDocument (default) or Page.addScriptToEvaluateOnLoad  params
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnNewDocument
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnLoad
   */
  static getScollOnLoadInject (onNewDocument = true) {
    const key = onNewDocument ? 'source' : 'scriptSource'
    return {
      [key]: `(${scrollOnLoad.toString()})()`
    }
  }

  /**
   * @desc Receive param object for JS injected into every frame of the page crawled that scrolls the page automatically
   * @param {boolean} [onNewDocument = true] - Flag indicating if the inject object is for Page.addScriptToEvaluateOnNewDocument (default) or Page.addScriptToEvaluateOnLoad  params
   * @return {OnNewDocumentInject | OnLoadInject} - Object keyed for the params used by the desired CDP method
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnNewDocument
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnLoad
   */
  static getScrollInject (onNewDocument = true) {
    const key = onNewDocument ? 'source' : 'scriptSource'
    return {
      [key]: `(${scrollOnLoad.toString()})()`
    }
  }

  /**
   * @desc JS injected into every frame of the page crawled that includes disabling things that can act as an crawler trap, JS that scrolls the page automatically and JS that sets up out link collection
   * @param {boolean} [onNewDocument = true] - Flag indicating if the inject object is for Page.addScriptToEvaluateOnNewDocument (default) or Page.addScriptToEvaluateOnLoad  params
   * @return {OnNewDocumentInject | OnLoadInject} - Object keyed for the params used by the desired CDP method
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnLoad
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnNewDocument
   */
  static getCrawlInjects (onNewDocument = true) {
    const key = onNewDocument ? 'source' : 'scriptSource'
    return {
      [key]: `(function (){
        (${noNaughtJs.toString()})();
        (${scrollOnLoad.toString()})();
        (${initCollectLinks.toString()})();
      })();`
    }
  }

  /**
   * @desc Receive param object for JS injected into every frame of the page crawled that includes disabling things that can act as an crawler trap and JS that sets up out link collection
   * @param {boolean} [onNewDocument = true] - Flag indicating if the inject object is for Page.addScriptToEvaluateOnNewDocument (default) or Page.addScriptToEvaluateOnLoad  params
   * @return {OnNewDocumentInject | OnLoadInject} - Object keyed for the params used by the desired CDP method
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnNewDocument
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Page#method-addScriptToEvaluateOnLoad
   */
  static getCrawlInjectsNoScroll (onNewDocument = true) {
    const key = onNewDocument ? 'source' : 'scriptSource'
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
module.exports = InjectManager

/**
 * @typedef {{scriptSource: string}} OnLoadInject
 */

/**
 * @typedef {{source: string}} OnNewDocumentInject
 */
