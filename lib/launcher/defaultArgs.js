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
  '--autoplay-policy=no-user-gesture-required',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-backing-store-limit',
  '--disable-breakpad',
  '--disable-client-side-phishing-detection',
  '--disable-default-apps',
  '--disable-domain-reliability',
  '--disable-extensions',
  '--disable-features=site-per-process,TranslateUI,LazyFrameLoading,LazyImageLoading',
  '--disable-gpu-process-crash-limit',
  '--disable-hang-monitor',
  '--disable-infobars',
  '--disable-ipc-flooding-protection',
  '--disable-popup-blocking',
  '--disable-prompt-on-repost',
  '--disable-renderer-backgrounding',
  '--disable-sync',
  '--enable-automation',
  '--enable-features=NetworkService,NetworkServiceInProcess,brotli-encoding',
  '--metrics-recording-only',
  '--mute-audio',
  '--no-default-browser-check',
  '--no-first-run',
  '--no-pings',
  '--no-user-gesture-required',
  '--safebrowsing-disable-auto-update'
]
