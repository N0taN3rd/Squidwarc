class TopHandler {
  constructor (collectorRef, messages) {
    this.found = {
      outlinks: '',
      links: [],
      totalChildren: 0
    }
    this.collectorRef = collectorRef
    this.messages = messages
    this.done = null
    this.childSources = []
    this.childFrames = 0
    this.countingChildren = true
    this.to = null
    this.toStop = false
    this.go = this.go.bind(this)
    this.helloFromFrame = this.helloFromFrame.bind(this)
    this.finished = this.finished.bind(this)
  }

  prWhenDone () {
    return new Promise((resolve) => {
      this.done = resolve
    })
  }

  go () {
    this.countingChildren = false
    this.found.totalChildren = this.childFrames
    const cs = this.childSources
    for (let i = 0; i < cs.length; ++i) {
      let c = cs[i]
      if (c && c.postMessage) {
        c.postMessage({type: this.messages.outlinkcollect}, '*')
      }
    }
    this.to = setTimeout(this.finished, 25000)
  }

  helloFromFrame (e) {
    if (e.data) {
      if (
        e.data.type === this.messages.indicateIsChild &&
        e.origin &&
        e.origin !== 'null' &&
        this.countingChildren
      ) {
        this.childFrames += 1
        this.childSources.push(e.source)
      } else if (e.data.type === this.messages.outlinkgot) {
        this.found.outlinks += e.data.outlinks.outlinks
        this.found.links = this.found.links.concat(e.data.outlinks.links)
        this.childFrames -= 1
        if (this.childFrames === 0 && !this.toStop) {
          this.finished()
        }
      }
    }
  }

  finished () {
    if (this.to) {
      clearTimeout(this.to)
    }
    this.to = null
    this.toStop = true
    const {links, outlinks, location} = this.collectorRef.extractLinks()
    this.found.outlinks += outlinks
    this.found.location = location
    this.found.links = this.found.links.concat(links)
    this.done(this.found)
  }
}

module.exports = TopHandler
