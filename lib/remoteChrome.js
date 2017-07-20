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

const CDP = require('chrome-remote-interface')
const EventEmitter = require('eventemitter3')

module.exports = class RemoteChrome extends EventEmitter {
  constructor () {
    super()
    this._connected = this._connected.bind(this)
    this.init = this.init.bind(this)
    this._client = null
    this._autoClose = false
  }

  init () {
    CDP(this._connected)
      .on('error', (err) => {
        this.emit('error', err)
      })
      .on('disconnect', () => {
        this.emit('disconnected')
      })
  }

  shutdown (...args) {
    return this._client.close(...args)
  }

  _connected (client) {
    this._client = client
    this.emit('connected', client)
  }

  _enableAutoClose () {
    if (!this._autoClose) {
      process.on('exit', () => {
        if (this._client) {
          this._client.close()
        }
      })
    }
    this._autoClose = true
    return this
  }

  static withAutoClose () {
    return new RemoteChrome()._enableAutoClose()
  }

  static Protocol (...args) {
    return CDP.Protocol(...args)
  }

  static List (...args) {
    return CDP.List(...args)
  }

  static New (...args) {
    return CDP.New(...args)
  }

  static Activate (...args) {
    return CDP.Activate(...args)
  }

  static Close (...args) {
    return CDP.Close(...args)
  }

  static Version (...args) {
    return CDP.Version(...args)
  }
}
/*
 module.exports.listTabs = devtools.List;
 module.exports.spawnTab = devtools.New;
 module.exports.closeTab = devtools.Close;

 module.exports.Protocol = devtools.Protocol;
 module.exports.List = devtools.List;
 module.exports.New = devtools.New;
 module.exports.Activate = devtools.Activate;
 module.exports.Close = devtools.Close;
 module.exports.Version = devtools.Version;
 */
