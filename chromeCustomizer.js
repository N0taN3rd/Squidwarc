
/**
 * @desc This function can be used to customize the behavior of the browser.
 * Depending on the browser controller implementation choose (chrome, chrome-extra, puppeteer).
 * As always please consult {@link https://chromedevtools.github.io/devtools-protocol/tot/}
 * for the explicate details on what is available :)
 *
 * @example
 *  // chrome-remote-interface-extra i.e. chrome-extra
 *  module.exports = async function chromeCustomizer (page) {
 *    // set the download path of files downloaded by the browser
 *    await page.setDownloadBehavior('<path to new downloads folder>')
 *
 *    // set the Accept-Language HTTP header
 *    await page.setAcceptLanguage('<new language>')
 *
 *    // set navigator.platform
 *    await page.setNavigatorPlatform('<new platform>')
 *
 *    // set new geolocation
 *    await page.setGeolocation({longitude: number, latitude: number, accuracy: (number|undefined)})
 *  }
 *
 * @see https://chromedevtools.github.io/devtools-protocol/tot/
 * @param {Page} page
 * @return {Promise<void>}
 */
module.exports = async function chromeCustomizer (page) {}
