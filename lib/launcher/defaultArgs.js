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

// https://peter.sh/experiments/chromium-command-line-switches/
// https://cs.chromium.org/chromium/src/chrome/common/chrome_switches.cc
/**
 * @desc An array of arguments used when launching Chrome.
 * @see {https://peter.sh/experiments/chromium-command-line-switches/}
 * @see {https://cs.chromium.org/chromium/src/chrome/common/chrome_switches.cc}
 * @type {string[]}
 */
module.exports = [
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-client-side-phishing-detection',
  '--disable-default-apps',
  '--disable-extensions',
  '--disable-hang-monitor',
  '--disable-prompt-on-repost',
  '--disable-breakpad',
  '--disable-sync',
  '--disable-translate',
  '--disable-domain-reliability',
  '--disable-renderer-backgrounding',
  '--disable-infobars',
  '--disable-translate',
  '--disable-features=site-per-process',
  '--metrics-recording-only',
  '--no-first-run',
  '--safebrowsing-disable-auto-update',
  '--password-store=basic',
  '--use-mock-keychain',
  '--mute-audio',
  '--autoplay-policy=no-user-gesture-required',
  '--window-size=1920,1080'
]
