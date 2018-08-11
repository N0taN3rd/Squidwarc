function init () {
  let isIframe
  try {
    isIframe = window.self !== window.top
  } catch (e) {
    isIframe = true
  }

  class Collector {
    constructor () {
      this.ignore = [
        '#',
        'about:',
        'data:',
        'mailto:',
        'javascript:',
        'js:',
        '{',
        '*',
        'ftp:',
        'tel:'
      ]
      this.good = {
        'http:': true,
        'https:': true
      }
      this.ilen = this.ignore.length
      this.outlinks = []
      this.links = []
      this.linksSeen = new Set()
      this.urlParer = new window.URL('about:blank')
      this.urlParts = /^(https?:\/\/)?([^/]*@)?(.+?)(:\d{2,5})?([/?].*)?$/
      this.dot = /\./g
    }

    static extractLinks () {
      const collector = new Collector()
      return collector.getOutlinks()
    }

    shouldIgnore (test) {
      let ignored = false
      for (let i = 0; i < this.ilen; ++i) {
        if (test.startsWith(this.ignore[i])) {
          ignored = true
          break
        }
      }
      if (!ignored) {
        let parsed = true
        try {
          this.urlParer.href = test
        } catch (error) {
          parsed = false
        }
        return !(parsed && this.good[this.urlParer.protocol])
      }
      return ignored
    }

    getOutlinks () {
      const found = document.querySelectorAll(
        'a[href],link[href],img[src],script[src],area[href]'
      )
      let flen = found.length
      let elem
      for (let i = 0; i < flen; ++i) {
        elem = found[i]
        switch (elem.nodeName) {
          case 'LINK':
            if (elem.href !== '') {
              this.outlinks.push(`${elem.href} E link/@href\r\n`)
            }
            break
          case 'IMG':
            if (elem.src !== '') {
              this.outlinks.push(`${elem.src} E =EMBED_MISC\r\n`)
            }
            break
          case 'SCRIPT':
            if (elem.src !== '') {
              this.outlinks.push(`${elem.src} E script/@src\r\n`)
            }
            break
          default:
            let href = elem.href.trim()
            if (href !== '' && href !== ' ') {
              if (!this.shouldIgnore(href) && !this.linksSeen.has(href)) {
                this.linksSeen.add(href)
                this.links.push({
                  href,
                  pathname: this.urlParer.pathname,
                  host: this.urlParer.host
                })
              }
              this.outlinks.push(`outlink: ${href} L a/@href\r\n`)
            }
            break
        }
      }
      let location
      try {
        location = window.location.href
      } catch (error) {}
      return {
        outlinks: this.outlinks.join(''),
        links: this.links,
        location
      }
    }
  }

  class TopHandler {
    constructor (collectorRef, messages) {
      this.found = {
        outlinks: '',
        links: [],
        totalChildren: 0
      }
      this.collectorRef = collectorRef
      this.messages = messages
      this.done = null
      this.childSources = []
      this.childFrames = 0
      this.countingChildren = true
      this.to = null
      this.toStop = false
      this.go = this.go.bind(this)
      this.helloFromFrame = this.helloFromFrame.bind(this)
      this.finished = this.finished.bind(this)
    }

    prWhenDone () {
      return new Promise(resolve => {
        this.done = resolve
      })
    }

    go () {
      this.countingChildren = false
      this.found.totalChildren = this.childFrames
      const cs = this.childSources
      for (let i = 0; i < cs.length; ++i) {
        let c = cs[i]
        if (c && c.postMessage) {
          c.postMessage({type: this.messages.outlinkcollect}, '*')
        }
      }
      this.to = setTimeout(this.finished, 15000)
    }

    helloFromFrame (e) {
      if (e.data) {
        if (
          e.data.type === this.messages.indicateIsChild &&
          e.origin &&
          e.origin !== 'null' &&
          this.countingChildren
        ) {
          this.childFrames += 1
          this.childSources.push(e.source)
        } else if (e.data.type === this.messages.outlinkgot) {
          this.found.outlinks += e.data.outlinks.outlinks
          this.found.links = this.found.links.concat(e.data.outlinks.links)
          this.childFrames -= 1
          if (this.childFrames === 0 && !this.toStop) {
            this.finished()
          }
        }
      }
    }

    finished () {
      if (this.to) {
        clearTimeout(this.to)
      }
      this.to = null
      this.toStop = true
      const {links, outlinks, location} = this.collectorRef.extractLinks()
      this.found.outlinks += outlinks
      this.found.location = location
      this.found.links = this.found.links.concat(links)
      this.done(this.found)
    }
  }

  const m = {
    indicateIsChild: '$$$$Squidwarc$$IsChild$$$$',
    outlinkcollect: '$$$$Squidwarc$$CollectOutLinks$$$$',
    outlinkgot: '$$$$Squidwarc$$GotOutlinks$$$$'
  }

  if (!isIframe) {
    Object.defineProperty(window, '$$$$Squidwarc$$Collector$$$$', {
      enumerable: false,
      configurable: false,
      value: new TopHandler(Collector, m)
    })
    window.addEventListener('message', window.$$$$Squidwarc$$Collector$$$$.helloFromFrame, false)
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
}

function collect () {
  const prom = window.$$$$Squidwarc$$Collector$$$$.prWhenDone()
  // defer execution of go
  Promise.resolve().then(() => window.$$$$Squidwarc$$Collector$$$$.go())
  return prom
}

module.exports = {
  init,
  collect
}
