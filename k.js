const fs = require('fs-extra')
const zlib = require('zlib')
const Promise = require('bluebird')
const util = require('util')
const uuid = require('uuid/v1')
const url = require('url')
const URL = url.URL

const inspectOpts = {colors: true, depth: null}

const inspect = (what) => {
  console.log(util.inspect(what, inspectOpts))
}

function gzip (buffer) {
  return new Promise((resolve, reject) => {
    zlib.gzip(buffer, (err, gzBuffer) => {
      if (err) {
        reject(err)
      } else {
        resolve(gzBuffer)
      }
    })
  })
}

function unGzip (buffer) {
  return new Promise((resolve, reject) => {
    zlib.gunzip(buffer, (err, gzBuffer) => {
      if (err) {
        reject(err)
      } else {
        resolve(gzBuffer)
      }
    })
  })
}

function deflate (buffer) {
  return new Promise((resolve, reject) => {
    zlib.deflate(buffer, (err, deflateBuffer) => {
      if (err) {
        reject(err)
      } else {
        resolve(deflateBuffer)
      }
    })
  })
}

const CE = {
  upper: 'Content-Encoding',
  lower: 'content-encoding',
  re: /Content-Encoding:\s(.*)\r\n/gi
}

const http2MethRe = /:method:\s(.*)\r\n/gi
const methProto = /([A-Z]+)\s[^\s]+\s([^\r]+)/gi

function getContentEncoding (headers, headersText) {
  if (headers) {
    if (headers[CE.upper]) {
      return headers[CE.upper]
    } else if (headers[CE.lower]) {
      return headers[CE.lower]
    } else if (headersText) {
      return CE.re.exec(headersText)
    }
  } else if (headersText) {
    return CE.re.exec(headersText)
  }

  return undefined
}

function getMapProxy (oObject) {
  return new Proxy(oObject, {
    set (target, key, value) {
      if (!target[key]) {
        target[key] = []
      }
      target[key].push(value)
      return true
    },
    get (target, key) {
      let v = target[key]
      if (v === undefined || v === null) {
        target[key] = []
      }
      return target[key]
    }
  })
}

class CapturedRequest {
  constructor (info, noHttp2 = false) {
    this.noHttp2 = noHttp2
    if (noHttp2) {
      this.protocol = 'HTTP/1.1'
    }
    this.requestId = info.requestId
    if (info.redirectResponse !== undefined && info.redirectResponse !== null) {
      this.redirectResponse = info.redirectResponse
    }
    if (info.request) {
      this.url = info.request.url
      this.headers = info.request.headers
      this.method = info.request.method
      if (info.request.postData !== undefined && info.request.postData !== null) {
        this.postData = info.request.postData
      }
    } else if (info.response) {
      if (!this.url) {
        this.url = info.response.url
      }
      this.res = {
        url: info.response.url,
        status: info.response.status,
        statusText: info.response.statusText,
        headers: info.response.headers,
        headersText: info.response.headersText,
        requestHeaders: info.response.requestHeaders,
        requestHeadersText: info.response.requestHeadersText,
        protocol: info.response.protocol || 'HTTP/1.1'
      }
      if (info.response.requestHeaders) {
        if (!this.headers) {
          this.headers = info.response.requestHeaders
        }
        let method = this.method || info.response.requestHeaders[':method']
        if (method && method !== '') {
          this.method = method
        } else if (info.response.requestHeadersText) {
          let httpString = info.response.requestHeadersText.substr(0, info.response.requestHeadersText.indexOf('\r\n'))
          if (httpString) {
            let httpStringParts = httpString.split(' ')
            if (httpStringParts) {
              this.method = httpStringParts[0]
            }
          }
        }
      } else if (info.response.requestHeadersText && !this.headers) {
        // let headArray = info.response.requestHeadersText.split('\r\n')
        // let nhead = {}
        // let len = headArray.length
        // let i = 0
        // for(; i < len; ++i) {
        //
        //   let [hk,kv] = headArray[i].split(':')
        // }
      }
    }
  }

  addMaybeRedirect (info, reqMap) {
    if (info.redirectResponse) {
      if (this.redirectResponse) {
        if (Array.isArray(this.redirectResponse)) {
          this.redirectResponse.push({
            url: info.redirectResponse.url,
            status: info.redirectResponse.status,
            statusText: info.redirectResponse.statusText,
            headers: info.redirectResponse.headers,
            headersText: info.redirectResponse.headersText,
            requestHeaders: info.redirectResponse.requestHeaders || info.headers,
            requestHeadersText: info.redirectResponse.requestHeadersText,
            method: info.redirectResponse.method || info.request.method,
            protocol: info.redirectResponse.protocol
          })
        } else {
          let oldRR = this.redirectResponse
          this.redirectResponse = [oldRR, {
            url: info.redirectResponse.url,
            status: info.redirectResponse.status,
            statusText: info.redirectResponse.statusText,
            headers: info.redirectResponse.headers,
            headersText: info.redirectResponse.headersText,
            requestHeaders: info.redirectResponse.requestHeaders || info.headers,
            requestHeadersText: info.redirectResponse.requestHeadersText,
            method: info.redirectResponse.method || info.request.method,
            protocol: info.redirectResponse.protocol
          }]
        }
      }
    } else {
      console.log('blah')
    }
  }

  addResponse (info) {
    if (info.response.requestHeadersText) {
      // console.log(info.response.requestHeadersText)
      let it = info.response.requestHeadersText.substr(0, info.response.requestHeadersText.indexOf('\r\n'))
      let [meth, _, proto] = it.split(' ')
      console.log(meth, proto)
    } else if (info.response.requestHeaders) {
      console.log(info.response.requestHeaders)
      console.log(info.response.protocol)
    }
  }
}

async function doIt () {
  const dumped = await fs.readJSON('raw.json')
  let len = dumped.length
  let i = 0
  let rq
  let res
  let ce
  const map = new Map()
  const mapP = getMapProxy(map)
  for (; i < len; ++i) {
    rq = dumped[i]
    if (rq.request) {
      if (!map.has(rq.requestId)) {
        map.set(rq.requestId, new CapturedRequest(rq))
      } else {
        map.get(rq.requestId).addMaybeRedirect(rq)
      }
    } else {
      if (!map.has(rq.requestId)) {
        map.set(rq.requestId, new CapturedRequest(rq))
      } else {
        map.get(rq.requestId).addResponse(rq)
      }
    }
  }
  // inspect(map)
}

doIt()
  .catch(error => {
    console.error(error)
  })
  .then(() => {
    console.log('done')
  })
