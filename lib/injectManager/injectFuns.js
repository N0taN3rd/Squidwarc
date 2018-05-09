/* eslint-disable */

function init () {
  let isIframe
  try {
    isIframe = window.self !== window.top
  } catch (e) {
    isIframe = true
  }

  COLLECTOR

  const m = MESSAGES

  if (!isIframe) {
    TOPHANDLER
    window[WINDOWADD] = new TopHandler(Collector, m)
    window.addEventListener('message', window[WINDOWADD].helloFromFrame,
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
}

function collect () {
  const prom = window[WINDOWADD].prWhenDone()
  // defer execution of go
  Promise.resolve().then(() => window[WINDOWADD].go())
  return prom
}

/* eslint-enable */

function noNaughtyJS () {
  Object.defineProperty(window, 'onbeforeunload', {
    configurable: false,
    writeable: false,
    value: function () {}
  })
  Object.defineProperty(window, 'onunload', {
    configurable: false,
    writeable: false,
    value: function () {}
  })
  window.alert = function () {}
  window.confirm = function () {}
  window.prompt = function () {}
}

function scroller () {
  let scrollingTO = 2000
  let lastScrolled
  let scrollerInterval
  window.addEventListener('load', () => {
    lastScrolled = Date.now()
    let scrollCount = 0
    let maxScroll = Math.max(document.body.scrollHeight,
      document.documentElement.scrollHeight)

    scrollerInterval = setInterval(() => {
      let scrollPos = window.scrollY + window.innerHeight
      if (scrollCount < 15) {
        maxScroll = Math.max(document.body.scrollHeight,
          document.documentElement.scrollHeight)
        scrollCount += 1
      }
      if (scrollPos < maxScroll) {
        window.scrollBy(0, 200)
        lastScrolled = Date.now()
      } else if (!lastScrolled || (Date.now() - lastScrolled) > scrollingTO) {
        if (scrollerInterval === undefined) {
          return
        }
        clearInterval(scrollerInterval)
        scrollerInterval = undefined
      } else if (scrollPos >= maxScroll) {
        clearInterval(scrollerInterval)
        scrollerInterval = undefined
      }
    }, 200)
  })
}

module.exports = {
  init,
  collect,
  scroller,
  noNaughtyJS
}
