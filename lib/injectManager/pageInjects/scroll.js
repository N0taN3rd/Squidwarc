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
