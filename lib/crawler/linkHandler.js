const parseDomain = require('parse-domain')
const {URL, resolve} = require('url')
const Path = require('path')
const bigExtLookup = require('../utils/bigExtLookup')()

const shortIgnore = /^(ftp:|data:|tel:|js:|{|\*|\/#|#)/
const httpRE = /^https?:\/\//

function urlFinder (ats, prop) {
  if (ats === undefined) return ats
  let i = 0
  let len = ats.length
  while (i < len) {
    if (ats[i].name === prop) {
      let url = ats[i].value.trim()
      if (url === ' ' || url === '' || url[0] === '#') return undefined
      return url.match(shortIgnore) === null ? url : undefined
    }
    i++
  }
  return undefined
}
const good = {
  'http:': true,
  'https:': true
}

class LinkHandler {
  static outLinks (curl, domNodes) {
    let i = 0
    let len = domNodes.length
    let furl
    const outlinks = []
    while (i < len) {
      switch (domNodes[i].nodeName) {
        case 'A':
          furl = urlFinder(domNodes[i].attributes, 'href')
          if (furl !== undefined) {
            if (!httpRE.test(furl)) {
              furl = resolve(curl, furl)
            }
            outlinks.push(`${furl} L a/@href\r\n`)
          }
          break
        case 'AREA':
          furl = urlFinder(domNodes[i].attributes, 'href')
          if (furl !== undefined) {
            if (!httpRE.test(furl)) {
              furl = resolve(curl, furl)
            }
            outlinks.push(`${furl} L area/@href\r\n`)
          }
          break
        case 'LINK':
          furl = urlFinder(domNodes[i].attributes, 'href')
          if (furl !== undefined) {
            if (!httpRE.test(furl)) {
              furl = resolve(curl, furl)
            }
            outlinks.push(`${furl} E link/@href\r\n`)
          }
          break
        case 'SCRIPT':
          furl = urlFinder(domNodes[i].attributes, 'src')
          if (furl !== undefined) {
            if (!httpRE.test(furl)) {
              furl = resolve(curl, furl)
            }
            outlinks.push(`${furl} E script/@src\r\n`)
          }
          break
        case 'IMG':
          furl = urlFinder(domNodes[i].attributes, 'src')
          if (furl !== undefined) {
            if (!httpRE.test(furl)) {
              furl = resolve(curl, furl)
            }
            outlinks.push(`${furl} E =EMBED_MISC\r\n`)
          }
          break
      }
      i++
    }
    return outlinks.join('')
  }

  static linksSameD (curl, domNodes) {
    let i = 0
    let len = domNodes.length
    let furl
    let cdomain = parseDomain(curl)
    const outlinks = []
    const links = new Set()
    while (i < len) {
      switch (domNodes[i].nodeName) {
        case 'A':
        case 'AREA':
          furl = urlFinder(domNodes[i].attributes, 'href')
          if (furl !== undefined) {
            let turl
            let parsed = true
            try {
              turl = new URL(furl, curl)
            } catch (error) {
              parsed = false
            }
            if (parsed) {
              outlinks.push(`${turl.href} L ${domNodes[i].nodeName.toLowerCase()}/@href\r\n`)
              if (good[turl.protocol] && turl.hash === '') {
                let pname = turl.pathname
                let ext = Path.extname(pname)
                let td = parseDomain(turl.host)
                if (td) {
                  if (ext !== '') {
                    if (!bigExtLookup[ext] && cdomain === td.domain) {
                      links.add(turl.href)
                    }
                  } else if (cdomain === td.domain) {
                    links.add(turl.href)
                  }
                }
              }
            } else {
              outlinks.push(`${furl} L ${domNodes[i].nodeName.toLowerCase()}/@href\r\n`)
            }
          }
          break
        case 'LINK':
          furl = urlFinder(domNodes[i].attributes, 'href')
          if (furl !== undefined) {
            if (!httpRE.test(furl)) {
              furl = resolve(curl, furl)
            }
            outlinks.push(`${furl} E link/@href\r\n`)
          }
          break
        case 'SCRIPT':
          furl = urlFinder(domNodes[i].attributes, 'src')
          if (furl !== undefined) {
            if (!httpRE.test(furl)) {
              furl = resolve(curl, furl)
            }
            outlinks.push(`${furl} E script/@src\r\n`)
          }
          break
        case 'IMG':
          furl = urlFinder(domNodes[i].attributes, 'src')
          if (furl !== undefined) {
            if (!httpRE.test(furl)) {
              furl = resolve(curl, furl)
            }
            outlinks.push(`${furl} E =EMBED_MISC\r\n`)
          }
          break
      }
      i++
    }
    return {
      outlinks: outlinks.join(''),
      links: [...links]
    }
  }

  linksAll (curl, domNodes) {
    let i = 0
    let len = domNodes.length
    let furl
    const outlinks = []
    const links = new Set()
    while (i < len) {
      switch (domNodes[i].nodeName) {
        case 'A':
        case 'AREA':
          furl = urlFinder(domNodes[i].attributes, 'href')
          if (furl !== undefined) {
            let turl
            let parsed = true
            try {
              turl = new URL(furl, curl)
            } catch (error) {
              parsed = false
            }
            if (parsed) {
              outlinks.push(`${turl.href} L ${domNodes[i].nodeName.toLowerCase()}/@href\r\n`)
              if (good[turl.protocol] && turl.hash === '') {
                let pname = turl.pathname
                let ext = Path.extname(pname)
                if (ext !== '') {
                  if (!bigExtLookup[ext]) {
                    links.add(turl.href)
                  }
                } else {
                  links.add(turl.href)
                }
              }
            }
          }
          break
        case 'LINK':
          furl = urlFinder(domNodes[i].attributes, 'href')
          if (furl !== undefined) {
            if (!httpRE.test(furl)) {
              furl = resolve(curl, furl)
            }
            outlinks.push(`${furl} E link/@href\r\n`)
          }
          break
        case 'SCRIPT':
          furl = urlFinder(domNodes[i].attributes, 'src')
          if (furl !== undefined) {
            if (!httpRE.test(furl)) {
              furl = resolve(curl, furl)
            }
            outlinks.push(`${furl} E script/@src\r\n`)
          }
          break
        case 'IMG':
          furl = urlFinder(domNodes[i].attributes, 'src')
          if (furl !== undefined) {
            if (!httpRE.test(furl)) {
              furl = resolve(curl, furl)
            }
            outlinks.push(`${furl} E =EMBED_MISC\r\n`)
          }
          break
      }
      i++
    }
    return {
      outlinks: outlinks.join(''),
      links: [...links]
    }
  }
}

module.exports = LinkHandler
