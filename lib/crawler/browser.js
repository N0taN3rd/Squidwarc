const parseDomain = require('parse-domain')
const isURL = require('validator/lib/isURL')
const {resolve} = require('url')
const pageEvals = require('../utils/pageEvals')

class Browser {
  constructor (client, options) {
    this._client = client
    this.options = options
  }

  async init () {
    await this._client.Runtime.enable()
    await this._client.Debugger.enable()
    await this._client.DOM.enable()
    await this._client.Page.enable()
    await this._client.Network.enable()
    await this._client.Animation.setPlaybackRate({playbackRate: 1000})
    if (await this._client.Network.canClearBrowserCache()) {
      await this._client.Network.clearBrowserCache()
    }
    await this._client.Emulation.setDeviceMetricsOverride(this.options.deviceMetrics)
    await this._client.Emulation.setVisibleSize({
      width: this.options.deviceMetrics.width,
      height: this.options.deviceMetrics.height
    })
    await this._client.Network.setBypassServiceWorker({bypass: true})
    await this._client.Page.addScriptToEvaluateOnLoad(pageEvals.noNaughtyJS2)
    await this._client.Page.addScriptToEvaluateOnNewDocument(pageEvals.noNaughtyJs)
  }

  _domNodes () {
    return this._client.DOMSnapshot.getSnapshot({computedStyleWhitelist: []}).then(domSnapshot => domSnapshot.domNodes)
  }

  _urlFinder (ats, prop) {
    if (ats === undefined) return ats
    let i = 0
    let len = ats.length
    while (i < len) {
      if (ats[i].name === prop) {
        return ats[i].value
      }
      i++
    }
    return undefined
  }

  async getOutLinkMetadata (curl) {
    let domNodes = await this._domNodes()
    let domain = parseDomain(curl).domain
    let i = 0
    let len = domNodes.length
    let furl
    while (i < len) {
      switch (domNodes[i].nodeName) {
        case 'A':
        case 'AREA':
          furl = this._urlFinder(domNodes[i].attributes, 'href')
          if (furl !== undefined) {
            if (!isURL(furl)) {
              furl = resolve(curl, furl)
            }
            if (domain === parseDomain(furl).domain) {
              console.log(furl)
            }
          }
          break
        case 'LINK':
          // furl = urlFinder(domNodes[i].attributes, 'href')
          // if (furl !== undefined) {
          //   if (!isURL(furl)) {
          //     console.log(furl,resolve(curl, furl))
          //   }
          // }
          break
        case 'SCRIPT':
        case 'IMG':
          // furl = urlFinder(domNodes[i].attributes, 'src')
          // if (furl !== undefined) {
          //   if (!isURL(furl)) {
          //     console.log(furl,resolve(curl, furl))
          //   }
          // }
          break
      }
      i++
    }
  }

  async getOutLinkMetadataSameD () {
    try {
      let evaled = await this._client.Runtime.evaluate(pageEvals.metadataSameD)
      return evaled.result.value
    } catch (error) {
      throw error
    }
  }

  async getOutLinkMetadataAll () {
    try {
      let evaled = await this._client.Runtime.evaluate(pageEvals.metadataAll)
      return evaled.result.value
    } catch (error) {
      throw error
    }
  }
}

module.exports = Browser
