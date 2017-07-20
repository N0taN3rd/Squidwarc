/*
 Control Chrome Headless  Copyright (C) 2017  John Berlin <n0tan3rd@gmail.com>

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 Control Chrome Headless is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this Control Chrome Headless.  If not, see <http://www.gnu.org/licenses/>
 */

class CapturedRequest {
  constructor (req) {
    this.requestId = req.requestId
    this.url = req.request.url
    this.headers = req.request.headers
    this.method = req.request.method
    if (req.request.redirectResponse !== undefined && req.request.redirectResponse !== null) {
      this.redirectResponse = req.request.redirectResponse
    }
    if (req.request.postData !== undefined && req.request.postData !== null) {
      this.postData = req.request.postData
    }
  }

  addResponse (res) {
    this.resStatus = res.response.status
    this.resStatusText = res.response.statusText
    this.resHeaders = res.response.headers
    if (res.response.headersText !== undefined && res.response.headersText !== null) {
      this.resHeadersText = res.response.headersText
    }
    if (res.response.requestHeaders !== undefined && res.response.requestHeaders !== null) {
      this.resRequestHeaders = res.response.headersText
    }
    if (res.response.requestHeadersText !== undefined && res.response.requestHeadersText !== null) {
      this.resRequestHeadersText = res.response.requestHeadersText
    }
    if (res.response.protocol !== undefined && res.response.protocol !== null) {
      this.resProtocol = res.response.protocol
    }
  }
}

module.exports = CapturedRequest
