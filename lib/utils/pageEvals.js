const bigExtLookup = require('./bigExtLookup')

function killAllJsAlertPromptConfirm (win) {
  Object.defineProperty(win, 'onbeforeunload', {
    configurable: false,
    writeable: false,
    value: function () {}
  })
  Object.defineProperty(win, 'onunload', {
    configurable: false,
    writeable: false,
    value: function () {}
  })
  window.alert = function () {}
  window.confirm = function () {}
  window.prompt = function () {}
  win.alert = function () {}
  win.confirm = function () {}
  win.prompt = function () {}
}

function metaData () {
  var outlinks = []
  var nn
  $x('//img|//link|//script|//a').forEach(it => {
    nn = it.nodeName
    if (nn === 'LINK') {
      if (it.href !== '') {
        outlinks.push(`${it.href} E link/@href\r\n`)
      }
    } else if (nn === 'IMG') {
      if (it.src !== '') {
        outlinks.push(`${it.src} E =EMBED_MISC\r\n`)
      }
    } else if (nn === 'SCRIPT') {
      if (it.src !== '') {
        outlinks.push(`${it.src} E script/@src\r\n`)
      }
    } else {
      if (it.href !== '') {
        outlinks.push(`outlink: ${it.href} L a/@href\r\n`)
      }
    }
  })
  return outlinks.join('')
}

function metaDataSameD (extLookup, extname) {
  var ignore = ['#', 'about:', 'data:', 'mailto:', 'javascript:', 'js:', '{', '*']
  var len = ignore.length
  var outlinks = []
  var curHost = window.location.host
  var links = new Set()
  var i = 0
  var ignored = false
  var test
  var nn
  $x('//img|//link|//script|//a').forEach(it => {
    nn = it.nodeName
    if (nn === 'LINK') {
      if (it.href !== '') {
        outlinks.push(`${it.href} E link/@href\r\n`)
      }
    } else if (nn === 'IMG') {
      if (it.src !== '') {
        outlinks.push(`${it.src} E =EMBED_MISC\r\n`)
      }
    } else if (nn === 'SCRIPT') {
      if (it.src !== '') {
        outlinks.push(`${it.src} E script/@src\r\n`)
      }
    } else {
      test = it.href
      if (test !== '') {
        ignored = false
        i = 0
        for (; i < len; ++i) {
          if (test.indexOf(ignore[i]) !== -1) {
            ignored = true
            break
          }
        }
        if (!ignored && it.host === curHost && test !== window.location.href) {
          if (test.endsWith('/')) {
            test = test.substr(0, test.length - 1)
          }
          if (!extLookup[extname(test)]) {
            links.add(it.href)
          }
        }
        outlinks.push(`outlink: ${it.href} L a/@href\r\n`)
      }
    }
  })
  return {
    outlinks: outlinks.join(''),
    links: [...links]
  }
}

function metaDataAll (extLookup, extname) {
  var ignore = ['#', 'about:', 'data:', 'mailto:', 'javascript:', 'js:', '{', '*']
  var len = ignore.length
  var outlinks = []
  var links = new Set()
  var i = 0
  var ignored = false
  var test
  var nn
  $x('//img|//link|//script|//a').forEach(it => {
    nn = it.nodeName
    if (nn === 'LINK') {
      if (it.href !== '') {
        outlinks.push(`${it.href} E link/@href\r\n`)
      }
    } else if (nn === 'IMG') {
      if (it.src !== '') {
        outlinks.push(`${it.src} E =EMBED_MISC\r\n`)
      }
    } else if (nn === 'SCRIPT') {
      if (it.src !== '') {
        outlinks.push(`${it.src} E script/@src\r\n`)
      }
    } else {
      test = it.href
      if (test !== '') {
        ignored = false
        i = 0
        for (; i < len; ++i) {
          if (test.indexOf(ignore[i]) !== -1) {
            ignored = true
            break
          }
        }
        if (!ignored && test !== window.location.href) {
          if (test.endsWith('/')) {
            test = test.substr(0, test.length - 1)
          }
          if (!extLookup[extname(test)]) {
            links.add(it.href)
          }
          outlinks.push(`outlink: ${it.href} L a/@href\r\n`)
        }
      }
    }
  })
  return {
    outlinks: outlinks.join(''),
    links: [...links]
  }
}

function scrollToBottom () {
  window.scrollTo(0, document.body.scrollHeight)
}

function extname (url) {
  // thanks node.js src code! path.extname minus assert
  var startDot = -1
  var startPart = 0
  var end = -1
  var matchedSlash = true
  // Track the state of characters (if any) we see before our first dot and
  // after any url separator we find
  var preDotState = 0
  var i = url.length - 1
  for (; i >= 0; --i) {
    const code = url.charCodeAt(i)
    if (code === 47/* / */) {
      // If we reached a url separator that was not part of a set of url
      // separators at the end of the string, stop now
      if (!matchedSlash) {
        startPart = i + 1
        break
      }
      continue
    }
    if (end === -1) {
      // We saw the first non-url separator, mark this as the end of our
      // extension
      matchedSlash = false
      end = i + 1
    }
    if (code === 46/* . */) {
      // If this is our first dot, mark it as the start of our extension
      if (startDot === -1) { startDot = i } else if (preDotState !== 1) { preDotState = 1 }
    } else if (startDot !== -1) {
      // We saw a non-dot and non-url separator before our dot, so we should
      // have a good chance at having a non-empty extension
      preDotState = -1
    }
  }

  if (startDot === -1 ||
    end === -1 ||
    // We saw a non-dot character immediately before the dot
    preDotState === 0 ||
    // The (right-most) trimmed url component is exactly '..'
    (preDotState === 1 &&
    startDot === end - 1 &&
    startDot === startPart + 1)) {
    return ''
  }
  return url.slice(startDot, end)
}

let extLookUpString = `(${bigExtLookup.toString()})()`
let extnameString = `${extname.toString()}`

// thank you Hasen el Judy (https://coderwall.com/hasenj) https://coderwall.com/p/hujlhg/smooth-scrolling-without-jquery
function smoothScroll (duration) {
  var element = document.body
  var target = Math.round(document.documentElement.scrollHeight)
  duration = Math.round(duration)
  if (duration < 0) {
    // eslint-disable-next-line
    return Promise.reject(new Error('bad duration'))
  }
  if (duration === 0) {
    element.scrollTop = target
    return Promise.resolve()
  }

  var startTime = Date.now()
  var endTime = startTime + duration

  var startTop = element.scrollTop
  var distance = target - startTop

  // based on http://en.wikipedia.org/wiki/Smoothstep
  var smoothStep = function (start, end, point) {
    if (point <= start) { return 0 }
    if (point >= end) { return 1 }
    var x = (point - start) / (end - start) // interpolation
    return x * x * (3 - 2 * x)
  }

  return new Promise(function (resolve, reject) {
    // This is to keep track of where the element's scrollTop is
    // supposed to be, based on what we're doing
    var previousTop = element.scrollTop

    // This is like a think function from a game loop
    var scrollFrame = function () {
      // set the scrollTop for this frame
      var now = Date.now()
      var point = smoothStep(startTime, endTime, now)
      var frameTop = Math.round(startTop + (distance * point))
      element.scrollTop = frameTop

      // check if we're done!
      if (now >= endTime) {
        resolve()
        return
      }

      // If we were supposed to scroll but didn't, then we
      // probably hit the limit, so consider it done; not
      // interrupted.
      if (element.scrollTop === previousTop &&
        element.scrollTop !== frameTop) {
        resolve()
        return
      }
      previousTop = element.scrollTop

      // schedule next frame for execution
      setTimeout(scrollFrame, 0)
    }

    // boostrap the animation process
    setTimeout(scrollFrame, 0)
  })
}

const smoothString = smoothScroll.toString()

module.exports = {
  pageEval: {
    expression: `(${metaData.toString()})()`,
    includeCommandLineAPI: true,
    generatePreview: true,
    returnByValue: true
  },
  metadataSameD: {
    expression: `(${metaDataSameD.toString()})(${extLookUpString},${extnameString})`,
    includeCommandLineAPI: true,
    generatePreview: true,
    returnByValue: true
  },
  metadataAll: {
    expression: `(${metaDataAll.toString()})(${extLookUpString},${extnameString})`,
    includeCommandLineAPI: true,
    generatePreview: true,
    returnByValue: true
  },
  doScroll: {
    expression: `(${scrollToBottom.toString()})()`
  },
  noNaughtyJs: {
    source: `(${killAllJsAlertPromptConfirm.toString()})(window);`
  },
  noNaughtyJS2: {
    scriptSource: `(${killAllJsAlertPromptConfirm.toString()})(window);`
  },
  makeSmoothScroll (dur = 4000) {
    return {
      expression: `(${smoothString})(${dur})`,
      awaitPromise: true,
      userGesture: true
    }
  }
}
