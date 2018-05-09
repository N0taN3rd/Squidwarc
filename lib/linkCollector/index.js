const Collector = require('./collector')
const TopHandler = require('./topHandler')
const uuid = require('uuid/v1')

class LinkCollector {
  constructor () {
    this.messages = `{
  indicateIsChild: ${this.genMessageType()},
  outlinkcollect: ${this.genMessageType()},
  outlinkgot: ${this.genMessageType()}
}`
    this.windowAdd = this.genWindowAddition()
    this.cachedInit = null
    this.cachedCollect = null
  }

  refresh () {
    this.messages = `{
  indicateIsChild: ${this.genMessageType()},
  outlinkcollect: ${this.genMessageType()},
  outlinkgot: ${this.genMessageType()}
}`
    this.windowAdd = this.genWindowAddition()
    this.cachedInit = null
    this.cachedCollect = null
  }

  genMessageType () {
    return `'$__@squidwarc#PM${uuid()}#@__$'`
  }

  genWindowAddition () {
    return `'$__@squidwarc#crawlCollect${uuid()}#@__$'`
  }

  generateInit () {
    return `function init () {
  let isIframe
  try {
    isIframe = window.self !== window.top
  } catch (e) {
    isIframe = true
  }
  
  ${Collector} 
  const m = ${this.messages}

  if (!isIframe) {
    ${TopHandler} 
    window[${this.windowAdd}] = new TopHandler(Collector, m)
    window.addEventListener('message', window[${this.windowAdd}].helloFromFrame,
      false)
  } else {
    const mhc = function messageHandlerChild (e) {
      if (e.data && e.data.type === m.outlinkcollect) {
        let outlinks
        try {
          outlinks = Collector.extractLinks()
        } catch (e) {
          outlinks = {
            error: e.toString(),
            outlinks: '',
            links: [],
            location: window.location.href
          }
        }
        window.top.postMessage({type: m.outlinkgot, outlinks}, '*')
      }
    }
    window.addEventListener('message', mhc, false)
    window.top.postMessage({type: m.indicateIsChild}, '*')
  }
}`
  }

  generateCollect () {
    return `function collect () {
  const prom = window[${this.windowAdd}].prWhenDone()
  window[${this.windowAdd}].go()
  return prom
}`
  }

  getInitInject () {
    if (!this.cachedInit) {
      this.cachedInit = {scriptSource: `(${this.generateInit()})()`}
    }
    return this.cachedInit
  }

  getCollectInject () {
    if (!this.cachedCollect) {
      let expression = `(${this.generateCollect()})()`
      this.cachedCollect = {
        expression,
        generatePreview: true,
        returnByValue: true
      }
    }
    return this.cachedCollect
  }

  getInit () {
    if (!this.cachedInit) {
      return this.getInitInject().scriptSource
    }
    return this.cachedInit.scriptSource
  }

  getCollect () {
    if (!this.cachedCollect) {
      return this.getCollectInject().expression
    }
    return this.cachedCollect.expression
  }
}

const linkCollector = new LinkCollector()
module.exports = linkCollector
