const pageInjects = require('./pageInjects')

class InjectManager {
  static rawScoll () {
    return pageInjects.scroll.scrollPage
  }

  static rawNoNaughty () {
    return pageInjects.noNaughtJs
  }

  static rawCollectInject () {
    return pageInjects.collectLinks.collect
  }

  static rawOutLinks () {
    return pageInjects.collectLinks.outLinks
  }

  static getCollectInject (old = false) {
    const key = old ? 'scriptSource' : 'source'
    return {
      [key]: `(${pageInjects.collectLinks.collect.toString()})()`
    }
  }

  static getNoNaughtyJsInject (old = false) {
    const key = old ? 'scriptSource' : 'source'
    return {
      [key]: `(${pageInjects.noNaughtJs.toString()})()`
    }
  }

  static getScollOnLoadInject (old = false) {
    const key = old ? 'scriptSource' : 'source'
    return {
      [key]: `(${pageInjects.scroll.scrollOnLoad.toString()})()`
    }
  }

  static getScrollInject (old = false) {
    const key = old ? 'scriptSource' : 'source'
    return {
      [key]: `(${pageInjects.scroll.scrollOnLoad.toString()})()`
    }
  }

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
