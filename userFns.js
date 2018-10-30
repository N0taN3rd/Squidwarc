/**
 * @external {Page} https://pptr.dev/#?product=Puppeteer&version=v1.7.0&show=api-class-page
 * @param {Page} page
 * @return {Promise<void>}
 */
module.exports = async function (page) {
  // scrolls the page until the page cannot be scrolled
  // some more or we have scrolled 20 times and fetches all the srcset values
  let scrolled = 0
  for (; scrolled < 20; ++scrolled) {
    let canScrollMore = await page.evaluate(async function () {
      window.SEEN = window.SEEN || new Set()
      const noop = () => {}
      const srcsetSplit = /\s*(\S*\s+[\d.]+[wx]),|(?:\s*,(?:\s+|(?=https?:)))/
      const ss = document.querySelectorAll('*[srcset]')
      const fetches = []
      for (let i = 0; i < ss.length; i++) {
        const srcset = ss[i].srcset
        const values = srcset.split(srcsetSplit).filter(Boolean)
        for (let j = 0; j < values.length; j++) {
          const value = values[j].trim()
          if (value.length > 0) {
            const url = value.split(' ')[0]
            if (!window.SEEN.has(url)) {
              window.SEEN.add(url)
              fetches.push(fetch(url).catch(noop))
            }
          }
        }
      }
      window.scrollBy(0, 500)
      await Promise.all(fetches)
      return (
        window.scrollY + window.innerHeight <
        Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
      )
    })
    if (!canScrollMore) break
    await new Promise(r => setTimeout(r, 1000))
  }
}
