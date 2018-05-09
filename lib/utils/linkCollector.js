/**
 * @desc code that gets injected into the top and every child frame of the
 * currently crawled page. If the frame injected into is the top frame
 * setups to collect the outlinks and crawl metadata otherwise setups to
 * communicate with the top frame.
 */
function init () {
  let isIframe
  try {
    isIframe = window.self !== window.top
  } catch (e) {
    isIframe = true
  }

  function getOutLinks () {
    const ignore = [
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
    const ilen = ignore.length
    const outlinks = []
    const linksSeen = new Set()
    const links = []
    let i = 0
    let nn
    let elem
    const found = document.querySelectorAll(
      'a[href],link[href],img[src],script[src],area[href]'
    )
    const len = found.length
    const good = {
      'http:': true,
      'https:': true
    }
    const urlParer = new window.URL('about:blank')

    function shouldIgnore (test) {
      let j = 0
      let ignored = false
      while (j < ilen) {
        if (test.startsWith(ignore[j])) {
          ignored = true
          break
        }
        j++
      }
      if (!ignored) {
        let parsed = true
        try {
          urlParer.href = test
        } catch (error) {
          parsed = false
        }
        return !(parsed && good[urlParer.protocol])
      }
      return ignored
    }

    while (i < len) {
      elem = found[i]
      nn = elem.nodeName
      switch (nn) {
        case 'LINK':
          if (elem.href !== '') {
            outlinks.push(`${elem.href} E link/@href\r\n`)
          }
          break
        case 'IMG':
          if (elem.src !== '') {
            outlinks.push(`${elem.src} E =EMBED_MISC\r\n`)
          }
          break
        case 'SCRIPT':
          if (elem.src !== '') {
            outlinks.push(`${elem.src} E script/@src\r\n`)
          }
          break
        default:
          let href = elem.href.trim()
          if (href !== '' && href !== ' ') {
            if (!shouldIgnore(href) && !linksSeen.has(href)) {
              linksSeen.add(href)
              links.push({
                href,
                pathname: urlParer.pathname,
                host: urlParer.host
              })
            }
            outlinks.push(`outlink: ${href} L a/@href\r\n`)
          }
          break
      }
      i++
    }
    let location
    try {
      location = window.location.href
    } catch (error) {}
    return {
      outlinks: outlinks.join(''),
      links,
      location
    }
  }

  const indicateIsChild = '__$imaiframe$__'
  const outlinkcollect = '__$outlinkscollect$__'
  const outlinkgot = '__$outlinksgot$__'

  class CrawlCollector {
    constructor (isIframe) {
      this.found = {
        outlinks: '',
        links: [],
        totalChildren: 0
      }
      /**
       * @type {function}
       */
      this.done = null
      this.isIframe = isIframe
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
      return new Promise((resolve) => {
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
          c.postMessage({type: outlinkcollect}, '*')
        }
      }
      this.to = setTimeout(this.finished, 25000)
    }

    helloFromFrame (e) {
      if (e.data) {
        if (
          e.data.type === indicateIsChild &&
          e.origin &&
          e.origin !== 'null' &&
          this.countingChildren
        ) {
          this.childFrames += 1
          this.childSources.push(e.source)
        } else if (e.data.type === outlinkgot) {
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
      const {links, outlinks, location} = getOutLinks()
      this.found.outlinks += outlinks
      this.found.location = location
      this.found.links = this.found.links.concat(links)
      this.done(window.__$crawlCollect$__.found)
    }
  }

  if (!isIframe) {
    window.__$crawlCollect$__ = new CrawlCollector(isIframe)
    window.addEventListener('message', window.__$crawlCollect$__.helloFromFrame,
      false)
  } else {
    const mhc = function messageHandlerChild (e) {
      if (e.data && e.data.type === outlinkcollect) {
        let outlinks
        try {
          outlinks = getOutLinks()
        } catch (e) {
          outlinks = {
            error: e.toString(),
            outlinks: '',
            links: [],
            location: window.location.href
          }
        }
        window.top.postMessage({type: outlinkgot, outlinks}, '*')
      }
    }
    window.addEventListener('message', mhc, false)
    window.top.postMessage({type: indicateIsChild}, '*')
  }
}

function collect () {
  const prom = window.__$crawlCollect$__.prWhenDone()
  window.__$crawlCollect$__.go()
  return prom
}

module.exports = {
  initInject: {
    scriptSource: `(${init.toString()})()`
  },
  collectInject: {
    expression: `(${collect.toString()})()`,
    generatePreview: true,
    returnByValue: true
  },
  init,
  collect
}
