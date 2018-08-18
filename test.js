const puppeteer = require('puppeteer')
const fs = require('fs-extra')
const {URL} = require('url')
const mime = require('mime')
const Path = require('path')
const { Page } = require('puppeteer/lib/Page')
const { TimeoutError } = require('puppeteer/lib/Errors')
const outLinks = require('./lib/injectManager/pageInjects/collectLinks').outLinks

const url = 'https://www.reuters.com/'
const waits = { waitUntil: 'networkidle2' }

async function doIt () {
  const discoveredLinks = await fs.readJSON('discovered.json')
  let i = discoveredLinks.links.length
  while (i--) {
    const {href} = discoveredLinks.links[i]
    const type = mime.getType(href)
    console.log()
  }
}

doIt().catch(error => console.error(error))

// console.log(require(usrScriptP))
