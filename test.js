const fs = require('fs-extra')
const Frontier = require('./lib/crawler/frontier')

async function doIt () {
  const frontier = new Frontier()
  frontier.init({
    url: 'https://www.reuters.com/',
    depth: 1,
    mode: Symbol.for('page-same-domain')
  })
  console.log(frontier.next())
  // console.log(await Config.loadConfig('conf.json'))
  const links = await fs.readJSON('seed.json')
  frontier.process(links)
  console.log(frontier)
  console.log(frontier.next())

}

doIt().catch(error => console.error(error))

// console.log(require(usrScriptP))