// const PuppeteerPage = require('puppeteer/lib/Page').Page
// const { Page } = require('chrome-remote-interface-extra')

/**
 * @desc This function can be used to customize the behavior of the browser.
 * Depending on the browser controller implementation choose (chrome, chrome-extra, puppeteer).
 * As always please consult {@link https://chromedevtools.github.io/devtools-protocol/tot/}
 * for the explicate details on what is available :)
 *
 * @example
 *  // chrome-remote-interface-extra i.e. chrome-extra
 *  module.exports = async function chromeCustomizer (pageOrClient) {
 *    // set the download path of files downloaded by the browser
 *    await pageOrClient.setDownloadBehavior('<path to new downloads folder>')
 *
 *    // set the Accept-Language HTTP header
 *    await pageOrClient.setAcceptLanguage('<new language>')
 *
 *    // set navigator.platform
 *    await pageOrClient.setNavigatorPlatform('<new platform>')
 *
 *    // set new geolocation
 *    await pageOrClient.setGeolocation({longitude: number, latitude: number, accuracy: (number|undefined)})
 *  }
 *
 * @see https://chromedevtools.github.io/devtools-protocol/tot/
 * @param {Object} pageOrClient
 * @return {Promise<void>}
 */
module.exports = async function chromeCustomizer (pageOrClient) {}
