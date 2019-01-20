/**
 * Copyright 2017-2019 John Berlin <n0tan3rd@gmail.com>. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @desc Function that is injected into every frame of the page currently being crawled that will
 * setup the outlink collection depending if the frame injected into is the top frame or a sub frame.
 *
 * If this function is injected into the top frame an instance of Collector / TopHandler are created otherwise
 * only an instance of Collector is created.
 *
 * In the case of injection into the top frame the `$$$$Squidwarc$$Collector$$$$` property will be defined on
 * window with value of the created TopHandler instance and `message` event listener will be registered on window for
 * receiving messages sent by this script when injected into child frames.
 *
 * Each child frame will send two messages (`indicateIsChild`, `outlinkgot`) and listen for one (`outlinkcollect`).
 * The message types are found in the object m within the body of this function.
 * The `indicateIsChild` message is sent immediately by a child frames to allow TopHandler can hold onto a reference to the frame for communicating with it.
 * The `outlinkgot` message is sent by each child frame to the top frame once outlinks have been collected for that frame.
 * The `outlinkcollect` message is sent by TopHandler to each child frame to have it start collecting outlinks.
 * @return {void}
 */
exports.initCollectLinks = function initCollectLinks () {
  let isIframe
  try {
    isIframe = window.self !== window.top
  } catch (e) {
    isIframe = true
  }

  /**
   * @desc Performs the outlink collection for a frame
   */
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

    /**
     * @desc Determines if the supplied URL is to be ignored or not
     * @param {string} test - A URL
     * @return {boolean}
     */
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

    /**
     * @desc Collects the outlink information for a frame
     * @return {{outlinks: string, links: Array<string>, location: string}}
     */
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
      /**
       * @type {{outlinks: string, links: Array<string>, totalChildren: number}}
       */
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

    /**
     * @desc Returns a promise that resolves once outlink collection, from top frame and child frames is complete
     * @return {Promise<{outlinks: string, links: Array<string>, totalChildren: number}>}
     */
    prWhenDone () {
      return new Promise(resolve => {
        this.done = resolve
      })
    }

    /**
     * @desc Send the `outlinkcollect` message to all child frames and start the collection timeout
     */
    go () {
      this.countingChildren = false
      this.found.totalChildren = this.childFrames
      const cs = this.childSources
      for (let i = 0; i < cs.length; ++i) {
        let c = cs[i]
        if (c && c.postMessage) {
          c.postMessage({ type: this.messages.outlinkcollect }, '*')
        }
      }
      this.to = setTimeout(this.finished, 20000)
    }

    /**
     * @desc Listens for the `outlinkgot` message sent by each child frame that contains its outlink information
     */
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

    /**
     * @desc Called once child frame outlink collection is complete. Collects the top frames outlinks and
     * resolves the Promise that is being awaited by the crawler with the values of all outlinks collected
     */
    finished () {
      if (this.to) {
        clearTimeout(this.to)
      }
      this.to = null
      this.toStop = true
      const { links, outlinks, location } = this.collectorRef.extractLinks()
      this.found.outlinks += outlinks
      this.found.location = location
      this.found.links = this.found.links.concat(links)
      this.done(this.found)
    }
  }

  /**
   * @type {{indicateIsChild: string, outlinkcollect: string, outlinkgot: string}}
   */
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
    window.addEventListener(
      'message',
      window.$$$$Squidwarc$$Collector$$$$.helloFromFrame,
      false
    )
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
        window.top.postMessage({ type: m.outlinkgot, outlinks }, '*')
      }
    }
    window.addEventListener('message', mhc, false)
    window.top.postMessage({ type: m.indicateIsChild }, '*')
  }
}

/**
 * @desc Starts the collection of the outlinks. Use only when {@link initCollectLinks} is pre-injected into every frame
 * @return {Promise<{outlinks: string, links: Array<string>, location: string}>}
 */
exports.collect = function collect () {
  const prom = window.$$$$Squidwarc$$Collector$$$$.prWhenDone()
  // defer execution of go
  Promise.resolve().then(() => window.$$$$Squidwarc$$Collector$$$$.go())
  return prom
}

/**
 * @desc Builds the WARC outlink metadata information and finds potential links to goto next from a page and build
 * @return {Promise<{outlinks: string, links: Array<string>}>}
 */
exports.outLinks = async function outLinks () {
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
  const good = { 'http:': true, 'https:': true }
  const outlinks = []
  const links = []
  const linksSeen = new Set()
  const urlParer = new URL('about:blank')
  function shouldIgnore (test) {
    let ignored = false
    let i = ignore.length
    while (i--) {
      if (test.startsWith(ignore[i])) {
        ignored = true
        break
      }
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

  const found = document.querySelectorAll(
    'a[href],link[href],img[src],script[src],area[href]'
  )
  let elem
  let i = found.length
  while (i--) {
    elem = found[i]
    switch (elem.nodeName) {
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
  }
  return {
    outlinks: outlinks.join(''),
    links: links
  }
}
