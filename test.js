const fs = require('fs-extra')
const runPromise = require('./lib/runPromise')
const util = require('util')
const cp = require('child_process')
const PC = require('./lib/crawler/puppeteer')

async function inner (args) {
  const crawler = new PC()
  await crawler.init()
}

function makeRunnable (runnable) {
  return function () {
    return runPromise(runnable.apply(this, arguments))
  }
}

const it = makeRunnable(inner)

it('conf.json')
