const fs = require('fs-extra')
const zlib = require('zlib')
const Promise = require('bluebird')
const util = require('util')
const uuid = require('uuid/v1')
const url = require('url')
const brotli = require('./node-warc/node_modules/iltorb').compress
const URL = url.URL

const inspectOpts = {colors: true, depth: null}

const inspect = (what) => {
  console.log(util.inspect(what, inspectOpts))
}

function noContainHTTP2 (headersText) {
  let index = headersText.indexOf('HTTP/1.1')
  if (index === -1) {
    index = headersText.indexOf('DATA')
  }
  return index === -1 ? headersText.indexOf('HTTP/1.0') !== -1 : true
}

class ReqStringer {
  constructor (noHTTP2) {
    this._noHTTP2 = noHTTP2
    this._DATA = 'DATA'
    this._HTTP10 = 'HTTP/1.0'
    this._HTTP11 = 'HTTP/1.1'
    this._replayProtocols = new Set([this._HTTP11, this._DATA, this._HTTP10])
  }

  headtNoHTTP2 (headersText) {
    let index = headersText.indexOf(this._HTTP11)
    if (index === -1) {
      index = headersText.indexOf(this._DATA)
    }
    return index === -1 ? headersText.indexOf(this._HTTP10) !== -1 : true
  }

  requestHeadersString (req, res) {
    if (res.requestHeadersText) {
      if (this._noHTTP2) {
        if (res.protocol) {
          if (this._replayProtocols.has(res.protocol)) {
            console.log('no http2', res.requestHeadersText)
          } else {
            console.log('yes http2')
          }
        } else {
          if (this.headtNoHTTP2(res.requestHeadersText)) {
            console.log('no http2', res.requestHeadersText)
          } else {
            console.log('yes http2')
          }
        }
      } else {

      }
    } else if (res.requestHeaders) {

    }
  }
}

async function doIt () {
  const dumped = await fs.readJSON('rawF3.json')
  let len = dumped.length
  let i = 0
  let rq
  // let res
  // let ce
  // // const map = new Map()
  let noHTTP2 = true
  const notHTTP2 = new Set(['HTTP/1.0', 'HTTP/1.1', 'DATA'])
  while (i < len) {
    rq = dumped[i]
    // console.log(rq.redirectResponse)
    if (rq.redirectResponse) {
      console.log('redir')
      let redir
      let isMultiRedirect = Array.isArray(rq.redirectResponse)
      if (isMultiRedirect) {
        redir = rq.redirectResponse.shift()
      } else {
        redir = rq.redirectResponse
      }
      if (redir.requestHeadersText) {
        if (noHTTP2) {
          if (redir.protocol) {
            if (notHTTP2.has(redir.protocol)) {
              console.log('no http2', redir.requestHeadersText)
            } else {
              console.log('yes http2')
            }
          } else {
            if (noContainHTTP2(redir.requestHeadersText)) {
              console.log('no http2', redir.requestHeadersText)
            } else {
              console.log('yes http2')
            }
          }
        } else {

        }
      } else if (redir.requestHeaders) {

      }

      // console.log(redir.requestHeaders)
      // console.log(redir.requestHeadersText)
      console.log('----------')
    } else {
      switch (rq.method) {
        case 'POST':
          if (rq.res) {
            console.log('post')
            let isMultiRes = Array.isArray(rq.res)
            let res
            if (isMultiRes) {
              res = rq.res.shift()
            } else {
              res = rq.res
            }
            if (res.requestHeadersText) {
              if (noHTTP2) {
                if (res.protocol) {
                  if (notHTTP2.has(res.protocol)) {
                    console.log('no http2', res.requestHeadersText)
                  } else {
                    console.log('yes http2')
                  }
                } else {
                  if (noContainHTTP2(res.requestHeadersText)) {
                    console.log('no http2', res.requestHeadersText)
                  } else {
                    console.log('yes http2')
                  }
                }
              } else {

              }
            } else if (res.requestHeaders) {

            }
          }
          break
        case 'GET':
          if (rq.res) {
            console.log('get')
            let isMultiRes = Array.isArray(rq.res)
            let res
            if (isMultiRes) {
              res = rq.res.shift()
            } else {
              res = rq.res
            }
            if (res.requestHeadersText) {
              if (noHTTP2) {
                if (res.protocol) {
                  if (notHTTP2.has(res.protocol)) {
                    console.log('no http2', res.requestHeadersText)
                  } else {
                    console.log('yes http2')
                  }
                } else {
                  if (noContainHTTP2(res.requestHeadersText)) {
                    console.log('no http2', res.requestHeadersText)
                  } else {
                    console.log('yes http2')
                  }
                }
              } else {

              }
            } else if (res.requestHeaders) {

            }
          }
          break
        case 'OPTIONS':
          console.log('opts')
          break
        default:
          if (
            (rq.headers === null || rq.headers === undefined) &&
            (rq.method === null || rq.method === undefined) &&
            (rq.url === null || rq.url === undefined) &&
            (rq.res !== null || rq.res !== undefined)
          ) {
            console.log('only res')
          } else {
            console.log('other')
          }
          break
      }
    }
    i++
  }
  // for (let it of map) {
  //   console.log(it)
  // }
}

doIt()
  .catch(error => {
    console.error(error)
  })
  .then(() => {
    console.log('done')
  })
