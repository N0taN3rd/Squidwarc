const fs = require('fs-extra')
const Frontier = require('./lib/frontier')
const mode = require('./lib/frontier/modes').cmodePSD

async function doIt () {
  const links = await fs.readJSON('links.json')
  const frontier = new Frontier()
  frontier.init({
    url: 'https://www.reuters.com/',
    depth: 1,
    mode
  })
  while (!frontier.exhausted()) {
    console.log(frontier.next())
    frontier.process(links)
  }
}

doIt().catch(error => console.error(error))

// console.log(require(usrScriptP))
