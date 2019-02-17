/**
 * Copyright 2017-2019 John Berlin <n0tan3rd@gmail.com>. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @desc An array of arguments used when launching Chrome.
 * @see {https://peter.sh/experiments/chromium-command-line-switches/}
 * @see {https://cs.chromium.org/chromium/src/chrome/common/chrome_switches.cc}
 * @type {string[]}
 */
module.exports = [
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--disable-ipc-flooding-protection',
  '--enable-features=NetworkService,NetworkServiceInProcess,brotli-encoding,AwaitOptimization',
  '--disable-client-side-phishing-detection',
  '--disable-default-apps',
  '--disable-extensions',
  '--disable-popup-blocking',
  '--disable-hang-monitor',
  '--disable-prompt-on-repost',
  '--disable-sync',
  '--disable-domain-reliability',
  '--disable-infobars',
  '--disable-features=site-per-process,TranslateUI,LazyFrameLoading',
  '--disable-breakpad',
  '--disable-backing-store-limit',
  '--metrics-recording-only',
  '--no-first-run',
  '--safebrowsing-disable-auto-update',
  '--password-store=basic',
  '--use-mock-keychain',
  '--mute-audio',
  '--autoplay-policy=no-user-gesture-required',
  '--enable-automation',
  '--window-size=1920,1080'
]
