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

const fs = require('fs-extra')
const Promise = require('bluebird')
const Path = require('path')
const uuid = require('uuid/v1')
const S = require('string')
const EventEmitter = require('eventemitter3')
const {
  warcHeader,
  warcHeaderContent,
  warcRequestHeader,
  warcResponseHeader,
  warcMetadataHeader,
  recordSeparator,
  CRLF
} = require('./warcFields')

class WARCWriter extends EventEmitter {
  constructor (noHTTP2 = false) {
    super()
    this._warcOutStream = null
    this._lastError = null
    this._swapper = S('')
    this._rid = null
    this._now = null
    this._fileName = null
    this._noHTTP2 = noHTTP2
    this._onFinish = this._onFinish.bind(this)
    this._onError = this._onError.bind(this)
  }

  turnHTTP2InToHTTP11 () {
    this._noHTTP2 = true
  }

  keepHTTP2 () {
    this._noHTTP2 = false
  }

  initWARC (warcPath, appending = false) {
    if (appending) {
      this._warcOutStream = fs.createWriteStream(warcPath, {flags: 'a'})
    } else {
      this._warcOutStream = fs.createWriteStream(warcPath)
    }
    this._warcOutStream.on('finish', this._onFinish)
    this._warcOutStream.on('error', this._onError)
    let now = new Date().toISOString()
    this._now = now.substr(0, now.indexOf('.')) + 'Z'
    this._rid = uuid()
    this._fileName = Path.basename(warcPath)
  }

  /**
   * @desc Write out the WARC-Type: info records
   * @param {string} version
   * @param {string} isPartOfV
   * @param {string} warcInfoDescription
   * @param {string} ua user agent
   * @return {Promise.<void>}
   */
  writeWarcInfoRecord (version, isPartOfV, warcInfoDescription, ua) {
    this._swapper.setValue(warcHeaderContent)
    let whct = this._swapper.template({version, isPartOfV, warcInfoDescription, ua}).s
    let whc = Buffer.from(`${CRLF}${whct}${CRLF}`, 'utf8')
    let wh = Buffer.from(this._swapper.setValue(warcHeader).template({
      fileName: this._fileName,
      now: this._now,
      len: whc.length,
      rid: this._rid
    }).s, 'utf8')
    return this.writeRecordBlock(wh, whc, recordSeparator)
  }

  /**
   * @desc Write WARC-Type: metadata for outlinks
   * @param {string} targetURI
   * @param {string} outlinks
   * @return {Promise.<void>}
   */
  writeWarcMetadataOutlinks (targetURI, outlinks) {
    let wmhc = Buffer.from(`${CRLF}${outlinks}${CRLF}`, 'utf8')
    let wmh = Buffer.from(this._swapper.setValue(warcMetadataHeader).template({
      targetURI,
      now: this._now,
      len: wmhc.length,
      concurrentTo: this._rid,
      rid: uuid()
    }).s, 'utf8')
    return this.writeRecordBlock(wmh, wmhc, recordSeparator)
  }

  /**
   * @desc Write A Request Record
   * @param {string} targetURI
   * @param {string} httpHeaderString
   * @param {string|Buffer?} requestData
   * @return {Promise.<void>}
   */
  writeRequestRecord (targetURI, httpHeaderString, requestData) {
    this._swapper.setValue(warcRequestHeader)
    let reqHeadContentBuffer
    if (requestData !== null && requestData !== undefined) {
      reqHeadContentBuffer = Buffer.from(`${CRLF}${httpHeaderString}${requestData}${CRLF}`, 'utf8')
    } else {
      reqHeadContentBuffer = Buffer.from(`${CRLF}${httpHeaderString}`, 'utf8')
    }
    let reqWHeader = this._swapper.template({
      targetURI,
      concurrentTo: this._rid,
      now: this._now,
      rid: uuid(),
      len: reqHeadContentBuffer.length
    }).s
    return this.writeRecordBlock(reqWHeader, reqHeadContentBuffer, recordSeparator)
  }

  /**
   * @desc Write A Response Record
   * @param {string} targetURI
   * @param {string} httpHeaderString
   * @param {string|Buffer?} responseData
   * @return {Promise.<void>}
   */
  writeResponseRecord (targetURI, httpHeaderString, responseData) {
    this._swapper.setValue(warcRequestHeader)
    let resHeaderContentBuffer = Buffer.from(`${CRLF}${httpHeaderString}`, 'utf8')
    let resDataLen = responseData ? responseData.length : 0
    let respWHeader = this._swapper.setValue(warcResponseHeader).template({
      targetURI,
      now: this._now,
      rid: uuid(),
      len: resHeaderContentBuffer.length + resDataLen
    }).s
    if (responseData !== null && responseData !== undefined) {
      return this.writeRecordBlock(respWHeader, resHeaderContentBuffer, responseData, CRLF, recordSeparator)
    } else {
      return this.writeRecordBlock(respWHeader, resHeaderContentBuffer, CRLF, recordSeparator)
    }
  }

  /**
   * @desc Write arbitrary number of items to the WARC
   * @param {*} recordParts
   * @return {Promise.<void>}
   */
  writeRecordBlock (...recordParts) {
    return new Promise((resolve, reject) => {
      let dataIter = recordParts[Symbol.iterator]()
      this._doWrite(dataIter, resolve, reject)
    })
  }

  end () {
    if (this._warcOutStream) {
      this._warcOutStream.end()
    }
  }

  /**
   *
   * @param {Symbol.iterator} dataIter
   * @param resolve
   * @param reject
   * @private
   */
  _doWrite (dataIter, resolve, reject) {
    let next = dataIter.next()
    if (!next.done) {
      this._warcOutStream.write(next.value, 'utf8', this._doWrite.bind(this, dataIter, resolve, reject))
    } else {
      resolve()
    }
  }

  _onFinish () {
    let le = this._lastError
    this._lastError = null
    this._warcOutStream.destroy()
    this._warcOutStream = null
    this._rid = null
    this._now = null
    this._fileName = null
    if (le) {
      this.emit('finished', le)
    } else {
      this.emit('finished')
    }
  }

  _onError (err) {
    this._lastError = err
    this.emit('error', err)
  }
}

module.exports = WARCWriter
