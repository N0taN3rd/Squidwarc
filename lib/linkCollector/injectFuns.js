/* eslint-disable */
/* debug / figure out how to inject collector.js topHandler.js */

function init (LC, TH, m) {
  let isIframe
  try {
    isIframe = window.self !== window.top
  } catch (e) {
    isIframe = true
  }

  if (!isIframe) {
    window.__$crawlCollect$__ = new TH(LC, m)
    window.addEventListener('message', window.__$crawlCollect$__.helloFromFrame,
      false)
  } else {
    const mhc = function messageHandlerChild (e) {
      if (e.data && e.data.type === m.outlinkcollect) {
        let outlinks
        try {
          outlinks = LC.extractLinks()
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
  const prom = window.__$crawlCollect$__.prWhenDone()
  window.__$crawlCollect$__.go()
  return prom
}
/* eslint-enable */
