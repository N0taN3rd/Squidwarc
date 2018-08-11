module.exports = async function (page) {
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