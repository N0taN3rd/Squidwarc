/**
 * @external {Page} https://pptr.dev/#?product=Puppeteer&version=v1.7.0&show=api-class-page
 * @param {Page} page
 * @return {Promise<void>}
 */
module.exports = async function (page) {
  await page.evaluate(async function () {
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
  })
  await page.$$eval('*[srcset]', async ss => {
    const noop = () => {}
    const doFetch = url => fetch(url).catch(noop)
    const found = []
    const srcsetSplit = /\s*(\S*\s+[\d.]+[wx]),|(?:\s*,(?:\s+|(?=https?:)))/
    for (let i = 0; i < ss.length; i++) {
      const srcset = ss[i].srcset
      const values = srcset.split(srcsetSplit).filter(Boolean)
      for (let j = 0; j < values.length; j++) {
        const value = values[j].trim()
        if (value.length > 0) {
          const url = value.split(' ')[0]
          found.push(url)
          await doFetch(url)
        }
      }
    }
    return found
  })
}
