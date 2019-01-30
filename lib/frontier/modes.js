/**
 * @desc Sentinel representing the page only crawl mode
 * @type {symbol}
 */
const cmodePO = Symbol('page-only')

/**
 * @desc Sentinel representing the page same domain crawl mode
 * @type {symbol}
 */
const cmodePSD = Symbol('page-same-domain')

/**
 * @desc Sentinel representing the page all links crawl mode
 * @type {symbol}
 */
const cmodePAL = Symbol('page-all-links')

/**
 * @desc Sentinel representing the site crawl mode
 * @type {symbol}
 */
const cmodSite = Symbol('site-crawl')

/**
 * @desc Crawl modes as symbols
 * @type {{cmodePO: symbol, cmodePSD: Symbol, cmodePAL: symbol, cmodSite: symbol}}
 */
module.exports = {
  cmodePO,
  cmodePSD,
  cmodePAL,
  cmodSite
}