/*
 Squidwarc  Copyright (C) 2017  John Berlin <n0tan3rd@gmail.com>

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 Squidwarc is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this Squidwarc.  If not, see <http://www.gnu.org/licenses/>
 */

const uuid = require('uuid/v1')

/**
 * @extends Map
 * An Exotic Class :)
 */
class RequestMonitorBase extends Map {
  constructor (network) {
    super()
    this._capture = true
    this._requestWillBeSent = this._requestWillBeSent.bind(this)
    this._responseReceived = this._responseReceived.bind(this)
    this._set = this.set.bind(this)

    this.set = () => {
      console.log('you fell for the trap!!! You cant add values to me, only I can :)')
    }
    network.requestWillBeSent(this._requestWillBeSent)
    network.responseReceived(this._responseReceived)
  }

  /**
   * @desc Sets an internal flag to begin capturing network requests
   * @param {boolean} [clear = true] clear the any previous captured requests
   * defaults to true
   */
  startCapturing (clear = true) {
    if (clear) {
      this.clear()
    }
    this._capture = true
  }

  /**
   * @desc Sets an internal flag to stop the capturing network requests
   */
  stopCapturing () {
    this._capture = false
  }

  /**
   * @desc
   * @param {Object} info
   * @private
   */
  _requestWillBeSent (info) {
    if (this._capture) {
      if (this.has(info.requestId)) {
        if (info.redirectResponse) {
          if (this.get(info.requestId).redirectResponse) {
            let cr = this.get(info.requestId)
            if (Array.isArray(cr.redirectResponse)) {
              cr.redirectResponse.push({
                url: info.redirectResponse.url,
                status: info.redirectResponse.status,
                statusText: info.redirectResponse.statusText,
                headers: info.redirectResponse.headers,
                headersText: info.redirectResponse.headersText,
                requestHeaders: info.redirectResponse.requestHeaders || info.headers,
                requestHeadersText: info.redirectResponse.requestHeadersText,
                method: info.redirectResponse.method,
                protocol: info.redirectResponse.protocol
              })
              this._set(info.requestId, cr)
            } else {
              let oldRR = cr.redirectResponse
              cr.redirectResponse = [oldRR, {
                url: info.redirectResponse.url,
                status: info.redirectResponse.status,
                statusText: info.redirectResponse.statusText,
                headers: info.redirectResponse.headers,
                headersText: info.redirectResponse.headersText,
                requestHeaders: info.redirectResponse.requestHeaders || info.headers,
                requestHeadersText: info.redirectResponse.requestHeadersText,
                method: info.redirectResponse.method,
                protocol: info.redirectResponse.protocol
              }]
              this._set(info.requestId, cr)
            }
          } else {
            this.get(info.requestId).redirectResponse = {
              url: info.redirectResponse.url,
              status: info.redirectResponse.status,
              statusText: info.redirectResponse.statusText,
              headers: info.redirectResponse.headers,
              headersText: info.redirectResponse.headersText,
              requestHeaders: info.redirectResponse.requestHeaders || info.headers,
              requestHeadersText: info.redirectResponse.requestHeadersText,
              method: info.redirectResponse.method,
              protocol: info.redirectResponse.protocol
            }
          }
        } else {
          // was double request currently seems like a bug
          // only happens when chrome is angry with us
          // docs state that RequestId is unique and if
          // redirect response is not on the object
          // this should never happen or does it ????
          let maybeRes = this.get(info.requestId)
          if (
            (maybeRes.headers === null || maybeRes.headers === undefined) &&
            (maybeRes.method === null || maybeRes.method === undefined) &&
            (maybeRes.url === null || maybeRes.url === undefined) &&
            (maybeRes.res !== null || maybeRes.res !== undefined)
          ) {
            // we found you!
            maybeRes.url = info.request.url
            maybeRes.headers = info.request.headers
            maybeRes.method = info.request.method
            if (info.request.postData !== undefined && info.request.postData !== null) {
              maybeRes.postData = info.request.postData
            }
            this._set(info.requestId, maybeRes)
          } else {
            let captured = {
              requestId: info.requestId,
              url: info.request.url,
              headers: info.request.headers,
              method: info.request.method
            }
            if (info.redirectResponse !== undefined && info.redirectResponse !== null) {
              captured.redirectResponse = info.redirectResponse
            }
            if (info.request.postData !== undefined && info.request.postData !== null) {
              captured.postData = info.request.postData
            }
            this._set(`${info.requestId}${uuid()}`, captured)
          }
        }
      } else {
        let captured = {
          requestId: info.requestId,
          url: info.request.url,
          headers: info.request.headers,
          method: info.request.method
        }
        if (info.redirectResponse !== undefined && info.redirectResponse !== null) {
          captured.redirectResponse = info.redirectResponse
        }
        if (info.request.postData !== undefined && info.request.postData !== null) {
          captured.postData = info.request.postData
        }
        this._set(info.requestId, captured)
      }
    }
  }

  _responseReceived (info) {
    if (this._capture) {
      if (!this.has(info.requestId)) {
        let captured = {
          res: {
            url: info.response.url,
            status: info.response.status,
            statusText: info.response.statusText,
            headers: info.response.headers,
            headersText: info.response.headersText,
            requestHeaders: info.response.requestHeaders,
            requestHeadersText: info.response.requestHeadersText,
            protocol: info.response.protocol
          },
          requestId: info.requestId
        }
        if (captured.res.requestHeaders !== null && captured.res.requestHeaders !== undefined) {
          let method = captured.res.requestHeaders[':method']
          if (method && method !== '') {
            // http2 why you do this to me
            captured.headers = captured.res.requestHeaders
            captured.url = captured.res.url
            captured.method = method
          }
        }
        this._set(info.requestId, captured)
      } else {
        let res = this.get(info.requestId).res
        if (res) {
          if (Array.isArray(res)) {
            this.get(info.requestId).res.push({
              url: info.response.url,
              status: info.response.status,
              statusText: info.response.statusText,
              headers: info.response.headers,
              headersText: info.response.headersText,
              requestHeaders: info.response.requestHeaders,
              requestHeadersText: info.response.requestHeadersText,
              protocol: info.response.protocol
            })
          } else {
            this.get(info.requestId).res = [res, {
              url: info.response.url,
              status: info.response.status,
              statusText: info.response.statusText,
              headers: info.response.headers,
              headersText: info.response.headersText,
              requestHeaders: info.response.requestHeaders,
              requestHeadersText: info.response.requestHeadersText,
              protocol: info.response.protocol
            }]
          }
        } else {
          this.get(info.requestId).res = {
            url: info.response.url,
            status: info.response.status,
            statusText: info.response.statusText,
            headers: info.response.headers,
            headersText: info.response.headersText,
            requestHeaders: info.response.requestHeaders,
            requestHeadersText: info.response.requestHeadersText,
            protocol: info.response.protocol
          }
        }
      }
    }
  }
}

module.exports = RequestMonitorBase
