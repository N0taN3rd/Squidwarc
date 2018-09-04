/*
 Squidwarc  Copyright (C) 2017-present  John Berlin <n0tan3rd@gmail.com>

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

/**
 * @desc Function that disables the setting of window event handlers onbeforeunload and onunload and
 * disables the usage of window.alert, window.confirm, and window.prompt.
 *
 * This is done to ensure that they can not be used crawler traps.
 */
module.exports = function noNaughtyJS () {
  Object.defineProperty(window, 'onbeforeunload', {
    configurable: false,
    writeable: false,
    value: function () {}
  })
  Object.defineProperty(window, 'onunload', {
    configurable: false,
    writeable: false,
    value: function () {}
  })
  window.alert = function () {}
  window.confirm = function () {}
  window.prompt = function () {}

  /*
    We no bot I swear! See
    https://github.com/paulirish/headless-cat-n-mouse
    https://antoinevastel.com/bot%20detection/2018/01/17/detect-chrome-headless-v2.html
  */

  /* eslint-disable */

  if (!window.chrome) {
    const installer = { install() {} }
    window.chrome = {
      app: { isInstalled: false },
      webstore: {
        onInstallStageChanged: {},
        onDownloadProgress: {},
        install(url, onSuccess, onFailure) {
          installer.install(url, onSuccess, onFailure)
        }
      },
      csi() {},
      loadTimes() {}
    }
  }

  if (!window.chrome.runtime) {
    window.chrome.runtime = {
      PlatformOs: {
        MAC: 'mac',
        WIN: 'win',
        ANDROID: 'android',
        CROS: 'cros',
        LINUX: 'linux',
        OPENBSD: 'openbsd'
      },
      PlatformArch: {
        ARM: 'arm',
        X86_32: 'x86-32',
        X86_64: 'x86-64',
        MIPS: 'mips',
        MIPS64: 'mips64'
      },
      PlatformNaclArch: {
        ARM: 'arm',
        X86_32: 'x86-32',
        X86_64: 'x86-64',
        MIPS: 'mips',
        MIPS64: 'mips64'
      },
      RequestUpdateCheckStatus: {
        THROTTLED: 'throttled',
        NO_UPDATE: 'no_update',
        UPDATE_AVAILABLE: 'update_available'
      },
      OnInstalledReason: {
        INSTALL: 'install',
        UPDATE: 'update',
        CHROME_UPDATE: 'chrome_update',
        SHARED_MODULE_UPDATE: 'shared_module_update'
      },
      OnRestartRequiredReason: {
        APP_UPDATE: 'app_update',
        OS_UPDATE: 'os_update',
        PERIODIC: 'periodic'
      },
      connect: function() {}.bind(function() {}),
      sendMessage: function() {}.bind(function() {})
    }
  }

  if (HTMLIFrameElement.prototype.__lookupGetter__('contentWindow') == null) {
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
      get: function() {
        return window
      }
    })
  }

  if ((navigator.plugins || []).length === 0) {
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5]
    })
  }

  if ((navigator.languages || []).length === 0) {
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en']
    })
  }
  /* eslint-enable */
}
