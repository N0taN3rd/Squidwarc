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
 * @desc Function that is injected into every frame of the page being crawled that starts scrolling the page
 * once the `load` event has been fired a maximum of 20 times or until no more scroll can be done
 */
exports.scrollOnLoad = function scrollOnLoad () {
  let scrollingTO = 2000
  let lastScrolled
  let scrollerInterval
  window.addEventListener('load', () => {
    lastScrolled = Date.now()
    let scrollCount = 0
    let maxScroll = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    )

    scrollerInterval = setInterval(() => {
      let scrollPos = window.scrollY + window.innerHeight
      if (scrollCount < 20) {
        maxScroll = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        )
        scrollCount += 1
      }
      if (scrollPos < maxScroll) {
        window.scrollBy(0, 200)
        lastScrolled = Date.now()
      } else if (!lastScrolled || Date.now() - lastScrolled > scrollingTO) {
        if (scrollerInterval === undefined) {
          return
        }
        clearInterval(scrollerInterval)
        scrollerInterval = undefined
      } else if (scrollPos >= maxScroll) {
        clearInterval(scrollerInterval)
        scrollerInterval = undefined
      }
    }, 200)
  })
}

/**
 * @desc Function that scrolls the page/frame injected into a maximum of 20 times or until no more scroll can be done
 * @returns {Promise<void>}
 */
exports.scrollPage = async function scrollPage () {
  let scrollingTO = 2000
  let lastScrolled = Date.now()
  let scrollCount = 0
  let maxScroll = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight
  )
  await new Promise((resolve, reject) => {
    let scrollerInterval = setInterval(() => {
      let scrollPos = window.scrollY + window.innerHeight
      if (scrollCount < 20) {
        maxScroll = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        )
        scrollCount += 1
      }
      if (scrollPos < maxScroll) {
        window.scrollBy(0, 200)
        lastScrolled = Date.now()
      } else if (!lastScrolled || Date.now() - lastScrolled > scrollingTO) {
        if (scrollerInterval === undefined) {
          return
        }
        clearInterval(scrollerInterval)
        scrollerInterval = undefined
        resolve()
      } else if (scrollPos >= maxScroll) {
        clearInterval(scrollerInterval)
        scrollerInterval = undefined
        resolve()
      }
    }, 200)
  })
}
