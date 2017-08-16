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

const oldHTTPStatuses = new Set(['HTTP/1.0', 'HTTP/1.1'])

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
    }

    if (info.response) {
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
        protocol: this._correctProtocol(info.redirectResponse.protocol),
        encoding: getContentEncoding(info.response.headers, info.response.headersText)
      }

      if (!this.headers) {
        if (info.response.requestHeaders) {
          this.headers = info.response.requestHeaders
        } else if (info.response.requestHeadersText) {
          let head = {}
          let headArray = info.response.requestHeadersText.split('\r\n')
          let len = headArray.length - 2 // contains two trailing CRLF
          let i = 1
          let headSplit
          for (; i < len; ++i) {
            headSplit = headArray[i].split(': ')
            head[headSplit[0]] = headSplit[1]
          }
          this.headers = head
          let httpStringParts = headArray[0].split(' ')
          this.method = this.method || httpStringParts[0]
          this.protocol = this.protocol || this._correctProtocol(httpStringParts[2])
        }
      }

      if (!this.method) {
        if (info.response.requestHeaders) {
          let method = info.response.requestHeaders[':method']
          if (method && method !== '') {
            this.method = method
          } else if (info.response.requestHeadersText) {
            this._methProtoFromReqHeadText(info.response.requestHeadersText)
          }
        } else if (info.response.requestHeadersText) {
          this._methProtoFromReqHeadText(info.response.requestHeadersText)
        }
      }
    }
  }

  _correctProtocol (oldProtocol) {
    let newProtocol = oldProtocol.toUpperCase()
    if (this.noHttp2) {
      return oldHTTPStatuses.has(newProtocol) ? newProtocol : 'HTTP/1.1'
    }
    return newProtocol
  }

  _methProtoFromReqHeadText (requestHeadersText) {
    let httpString = requestHeadersText.substr(0, requestHeadersText.indexOf('\r\n'))
    if (httpString) {
      let httpStringParts = httpString.split(' ')
      if (httpStringParts) {
        this.method = httpStringParts[0]
        if (!this.protocol) {
          this.protocol = this._correctProtocol(httpStringParts[2])
        }
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
            requestHeaders: info.redirectResponse.requestHeaders || info.request.headers,
            requestHeadersText: info.redirectResponse.requestHeadersText,
            method: info.redirectResponse.method || info.request.method,
            protocol: this._correctProtocol(info.redirectResponse.protocol)
          })
        } else {
          let oldRR = this.redirectResponse
          this.redirectResponse = [oldRR, {
            url: info.redirectResponse.url,
            status: info.redirectResponse.status,
            statusText: info.redirectResponse.statusText,
            headers: info.redirectResponse.headers,
            headersText: info.redirectResponse.headersText,
            requestHeaders: info.redirectResponse.requestHeaders || info.request.headers,
            requestHeadersText: info.redirectResponse.requestHeadersText,
            method: info.redirectResponse.method || info.request.method,
            protocol: this._correctProtocol(info.redirectResponse.protocol)
          }]
        }
      }
    } else if (
      (this.headers === null || this.headers === undefined) &&
      (this.method === null || this.method === undefined) &&
      (this.url === null || this.url === undefined) &&
      (this.res !== null && this.res !== undefined)
    ) {
      // we found you!
      this.url = info.request.url
      this.headers = info.request.headers
      this.method = info.request.method
      if (info.request.postData !== undefined && info.request.postData !== null) {
        this.postData = info.request.postData
      }
      if (info.response) {
        this.addResponse(info)
      }
    } else {
      reqMap.set(`${info.requestId}${uuid()}`, new CapturedRequest(info, this.noHttp2))
    }
  }

  addResponse (info) {
    if (this.res) {
      if (Array.isArray(this.res)) {
        this.res.push({
          url: info.response.url,
          status: info.response.status,
          statusText: info.response.statusText,
          headers: info.response.headers,
          headersText: info.response.headersText,
          requestHeaders: info.response.requestHeaders,
          requestHeadersText: info.response.requestHeadersText,
          protocol: this._correctProtocol(info.response.protocol),
          encoding: getContentEncoding(info.response.headers, info.response.headersText)
        })
      } else {
        let oldRes = this.res
        this.res = [oldRes, {
          url: info.response.url,
          status: info.response.status,
          statusText: info.response.statusText,
          headers: info.response.headers,
          headersText: info.response.headersText,
          requestHeaders: info.response.requestHeaders,
          requestHeadersText: info.response.requestHeadersText,
          protocol: this._correctProtocol(info.response.protocol),
          encoding: getContentEncoding(info.response.headers, info.response.headersText)
        }]
      }
    } else {
      this.res = {
        url: info.response.url,
        status: info.response.status,
        statusText: info.response.statusText,
        headers: info.response.headers,
        headersText: info.response.headersText,
        requestHeaders: info.response.requestHeaders,
        requestHeadersText: info.response.requestHeadersText,
        protocol: this._correctProtocol(info.response.protocol),
        encoding: getContentEncoding(info.response.headers, info.response.headersText)
      }
    }
  }

  toJSON () {

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
  for (; i < len; ++i) {
    rq = dumped[i]
    if (rq.request) {
      if (!map.has(rq.requestId)) {
        map.set(rq.requestId, new CapturedRequest(rq))
      } else {
        map.get(rq.requestId).addMaybeRedirect(rq,map)
      }
    } else {
      if (!map.has(rq.requestId)) {
        map.set(rq.requestId, new CapturedRequest(rq))
      } else {
        map.get(rq.requestId).addResponse(rq)
      }
    }
  }
  inspect(map)
}

doIt()
  .catch(error => {
    console.error(error)
  })
  .then(() => {
    console.log('done')
  })
