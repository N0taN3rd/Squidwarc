const uuid = require('uuid/v1')
const Collector = require('./collector')
const TopHandler = require('./topHandler')
const { init, collect, noNaughtyJS, scroller } = require('./injectFuns')

class InjectManager {
  constructor () {
    this._cachedInit = { source: '' }
    this._cachedCollect = {
      expression: '',
      generatePreview: true,
      returnByValue: true,
      awaitPromise: true
    }
    this._replaceRE = /([A-Z]{7,})/g
    this.refresh()
  }

  refresh () {
    const messages = this._messagesUUID()
    const winadd = `'squidwarc$${uuid()}'`
    this._cachedInit.source = this._makeInjectFun(init.toString(), messages, winadd)
    this._cachedCollect.expression = this._makeInjectFun(
      collect.toString(),
      messages,
      winadd
    )
  }

  getInitInject () {
    return this._cachedInit
  }

  getCollectInject () {
    return this._cachedCollect
  }

  getNoNaughtyJsInject (old) {
    const key = old ? 'scriptSource' : 'source'
    return {
      [key]: `(${noNaughtyJS.toString()})()`
    }
  }

  getScollerInject (old) {
    const key = old ? 'scriptSource' : 'source'
    return {
      [key]: `(${scroller.toString()})()`
    }
  }

  getCrawlInjects (old) {
    const key = old ? 'scriptSource' : 'source'
    const messages = this._messagesUUID()
    const winadd = `'squidwarc$${uuid()}'`
    this._cachedCollect.expression = this._makeInjectFun(
      collect.toString(),
      messages,
      winadd
    )
    return {
      [key]: `(function (){
        (${noNaughtyJS.toString()})();
        (${scroller.toString()})();
        ${this._makeInjectFun(init.toString(), messages, winadd)};
      })();`
    }
  }

  getInit () {
    return this._cachedInit.source
  }

  getCollect () {
    return this._cachedCollect.expression
  }

  _messagesUUID () {
    return `{
    indicateIsChild: 'squidwarc$${uuid()}',
    outlinkcollect: 'squidwarc$${uuid()}',
    outlinkgot: 'squidwarc$${uuid()}'
  }`
  }

  _makeInjectFun (string, messages, windowAdd) {
    let replaced = string.replace(this._replaceRE, (match, p1) => {
      switch (p1) {
        case 'COLLECTOR':
          return Collector.toString()
        case 'MESSAGES':
          return messages
        case 'TOPHANDLER':
          return TopHandler.toString()
        case 'WINDOWADD':
          return windowAdd
      }
    })
    return `(${replaced})()`
  }
}

const injectManager = new InjectManager()
module.exports = injectManager
