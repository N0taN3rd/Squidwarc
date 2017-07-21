/*
 Squidwarc  Copyright (C) 2017  John Berlin <n0tan3rd@gmail.com>

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
const CDP = require('chrome-remote-interface')
const Promise = require('bluebird')

async function clickViaLoop () {
  const client = await CDP()
  process.on('exit', function () {
    if (client) client.close()
  })
  const {Runtime, Page, Network, DOM, Debugger, Input} = client
  try {
    await Promise.all([
      Runtime.enable(),
      Debugger.enable(),
      DOM.enable(),
      Page.enable(),
      Network.enable()
    ])
  } catch (err) {
    console.error(err)
  }

  let seedUrl = 'https://reacttraining.com/react-router/web/guides/quick-start'
  console.log(`\nI will be issuing click events as if a\nuser clicked on the page at ${seedUrl}\n`)
  console.log('Doing so by starting at screen position x = 0 and y = 0 then')
  console.log('incrementing x by 15 each step then for y = 0 to clientHeight moving down by 5\n')
  console.log('I will be disallowing navigation away from this page')
  console.log('This page is entirely controlled with React and React Router')
  console.log('Be sure to watch the navigation bar of Chrome')
  console.log('\nApplying slight delay so that you can ready this text\n')
  await Promise.delay(10000)
  let goto = await Page.navigate({url: seedUrl})
  console.log('\nPage navigated', goto)
  await Page.loadEventFired()
  console.log('\nPage loaded')
  await Page.setControlNavigations({enabled: true})
  Page.navigationRequested((args) => {
    if (args.url === 'about:blank') {
      Page.processNavigation({navigationId: args.navigationId, response: 'Proceed'}, (err, response) => {
      })
    }
    console.log(`Page wants to navigate to ${args.url}`)
    Page.processNavigation({navigationId: args.navigationId, response: 'CancelAndIgnore'}, (err, response) => {
      console.log(`We disallowed nav to ${args.url}\nChrome responded with: error ${err}`, err ? response : '')
    })
  })
  let lm
  let vv
  let ch
  let cw
  try {
    lm = await Page.getLayoutMetrics()
    vv = lm.visualViewport
  } catch (error) {
    console.error(error)
  }
  ch = vv.clientHeight
  cw = vv.clientWidth
  console.log(`\nWe will be clicking down and across with\nin the client width of ${cw} and client height of ${ch}`)
  for (let x = 0; x < cw; x += 15) {
    for (let y = 0; y < ch; y += 5) {
      try {
        await Input.dispatchMouseEvent({x, y, type: 'mousePressed', button: 'left', clickCount: 1})
        await Input.dispatchMouseEvent({x, y, type: 'mouseReleased', button: 'left', clickCount: 1})
      } catch (error) {
        console.error(error)
      }
    }
  }
  console.log('Finished Clicking\n')
  console.log('Going to about:/blank before next example')
  console.log('\n\n\n')
  await Page.navigate({url: 'about:blank'})
  await Promise.delay(3000)
  await client.close()
}

function clickByFindingClickListeners () {
  CDP(async client => {
    process.on('exit', function () {
      if (client) client.close()
    })
    const {Runtime, Console, Page, Network, DOM, Debugger, DOMDebugger, Input} = client

    try {
      await Promise.all([
        Runtime.enable(),
        Debugger.enable(),
        DOM.enable(),
        Page.enable()
      ])
    } catch (err) {
      console.error(err)
    }
    let seedUrl = 'https://reacttraining.com/react-router/web/guides/quick-start'
    console.log(`I will be clicking all the DOM elements\nwith a click listener at ${seedUrl}`)
    console.log('\nDoing so by determining if each DOM node has a click listeners\n')
    console.log('I will be disallowing navigation away from this page')
    console.log('This page is entirely controlled with React and React Router')
    console.log('Be sure to watch the navigation bar of Chrome')
    console.log('\nApplying slight delay so that you can ready this text\n')
    await Promise.delay(7000)
    Page.navigate({url: seedUrl}, (...args) => {
      console.log('Page navigated', ...args)
    })

    Page.loadEventFired(async (info) => {
      await Page.setControlNavigations({enabled: true})
      Page.navigationRequested((args) => {
        console.log(`Page wants to navigate to ${args.url}`)
        Page.processNavigation({navigationId: args.navigationId, response: 'CancelAndIgnore'}, (err, response) => {
          console.log(`We disallowed nav to ${args.url}`)
        })
      })
      let haveClickListeners = []
      let noClickListeners = []
      console.log('\nGetting a flattened representation of the DOM including Shadow Dom and Iframes ')
      let flat = await DOM.getFlattenedDocument({depth: -1, pierce: true})
      flat.nodes = flat.nodes.reverse()
      let len = flat.nodes.length
      console.log(`Determining if ${len} DOM nodes have click listeners\n`)
      console.log('\nApplying slight delay so that you can ready this text\n')
      await Promise.delay(5000)
      let i = 0
      for (; i < len; ++i) {
        let elm = flat.nodes[i]
        let resolvedNode, maybeListeners
        try {
          resolvedNode = await DOM.resolveNode({nodeId: elm.nodeId})
          maybeListeners = await DOMDebugger.getEventListeners({objectId: resolvedNode.object.objectId})
        } catch (error) {
          console.error(error)
          continue
        }
        let evLen = maybeListeners.listeners.length
        if (evLen > 0) {
          let j = 0
          let found = false
          for (; j < evLen; ++j) {
            if (maybeListeners.listeners[j].type === 'click') {
              found = true
              break
            }
          }
          if (found) {
            // console.log(elm.attributes.pop())
            if (elm.nodeName === 'A') {
              console.log(`Found <a href="${elm.attributes.pop()}"> with a click listener`)
            } else {
              console.log(`Node ${elm.nodeName} has a click listener`)
            }
            haveClickListeners.push({elem: elm, remoteElem: resolvedNode})
          } else {
            noClickListeners.push(resolvedNode.object.objectId)
          }
        } else {
          noClickListeners.push(resolvedNode.object.objectId)
        }
      }
      i = 0
      len = noClickListeners.length
      console.log(`\nThere were ${len} DOM nodes that did not have click listeners\n`)
      let releaseRemoteObjects = []
      for (; i < len; ++i) {
        releaseRemoteObjects.push(Runtime.releaseObject({objectId: noClickListeners[i]}))
      }
      console.log('Releasing the remote references to them')
      try {
        await Promise.all(releaseRemoteObjects)
      } catch (error) {
        console.error(error)
      }
      let clickP = []
      i = haveClickListeners.length - 1
      len = 0
      console.log(`There were ${haveClickListeners.length} DOM nodes that did have click listeners`)

      const functionDeclaration = 'function () { this.click(); }'
      console.log('Preparing to click them all')
      for (; i >= len; --i) {
        // console.log(haveClickListeners[i])
        let nn = haveClickListeners[i].elem.nodeName
        if (nn === '#document' || nn === 'BODY') {
          continue
        }
        clickP.push(Runtime.callFunctionOn({
          objectId: haveClickListeners[i].remoteElem.object.objectId,
          silent: true,
          functionDeclaration
        }))
      }

      console.log('\nInitiate clicking')
      clickP.forEach(async prom => {
        try {
          await prom
        } catch (error) {
          console.log(error)
        }
      })

      console.log('\nFinished Clicking')
      console.log('Laters')
      await client.close()
    })



  }).on('error', (err) => {
    // cannot connect to the remote endpoint
    console.error(err)
  })
}

clickViaLoop()
  .then(() => {
    process.stdout.write('\033c')
    clickByFindingClickListeners()
  })
  .catch(error => {
    console.log(error)
  })
