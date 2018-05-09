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

module.exports = Collector
