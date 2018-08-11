function scrollOnLoad () {
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
      if (scrollCount < 15) {
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

function scrollPage () {
  let scrollingTO = 2000
  let lastScrolled = Date.now()
  let scrollCount = 0
  let maxScroll = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight
  )

  let scrollerInterval = setInterval(() => {
    let scrollPos = window.scrollY + window.innerHeight
    if (scrollCount < 15) {
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
}

module.exports = {
  scrollOnLoad,
  scrollPage
}
