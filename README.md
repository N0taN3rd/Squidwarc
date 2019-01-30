<p align="center">
<img alt="Squidwarc" src="https://github.com/N0taN3rd/Squidwarc/blob/master/meta/logo.png?raw=true" width="30%">
</p>

**Squidwarc** is a high fidelity, user scriptable, archival crawler that uses Chrome or Chromium with or without a head.

**Squidwarc** aims to address the need for a high fidelity crawler akin to Heritrix while still being easy enough for the personal archivist to setup and use.

**Squidwarc** does not seek (at the moment) to dethrone Heritrix as the queen of wide archival crawls rather
seeks to address Heritrix's shortcomings namely:
- No JavaScript execution
- Everything is plain text
- Requiring configuration to know how to preserve the web
- Setup time and technical knowledge required of its users

For more information about this see
- [Adapting the Hypercube Model to Archive Deferred Representations and Their Descendants](https://arxiv.org/abs/1601.05142)
- [2012-10-10: Zombies in the Archives](http://ws-dl.blogspot.com/2012/10/2012-10-10-zombies-in-archives.html)
- [2013-11-28: Replaying the SOPA Protest](http://ws-dl.blogspot.com/2013/11/2013-11-28-replaying-sopa-protest.html)
- [2015-06-26: PhantomJS+VisualEvent or Selenium for Web Archiving?](http://ws-dl.blogspot.com/2015/06/2015-06-26-phantomjsvisualevent-or.html)

**Squidwarc** is built using Node.js, [node-warc](https://github.com/N0taN3rd/node-warc), and [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface).

If running a crawler through the commandline is not your thing, then **Squidwarc** highly recommends [warcworker](https://github.com/peterk/warcworker),
a web front end for **Squidwarc** by [@peterk](https://github.com/peterk).

If you are unable to install Node on your system but have docker, then you can use the provided docker file or compose file.

If you have neither then **Squidwarc** highly recommends [WARCreate](http://warcreate.com/) or [WAIL](https://github.com/N0taN3rd/wail/releases).
WARCreate did this first and if it had not **Squidwarc** would not exist :two_hearts:

If recording the web is what you seek, **Squidwarc** highly recommends [Webrecorder](https://webrecorder.io/).

# Out Of The Box Crawls
### Page Only
Preserve the only the page, no links are followed

### Page + Same Domain Links
Page Only option plus preserve all links found on the page that are on the same domain as the page

### Page + All internal and external links
Page + Same Domain Link option plus all links from other domains

# Usage

**Squidwarc** uses a bootstrapping script to install dependencies. First, get the latest version from source:

```
$ git clone https://github.com/N0taN3rd/Squidwarc
$ cd Squidwarc
```
Then run the [bootstrapping script](https://github.com/N0taN3rd/Squidwarc/blob/master/bootstrap.sh) to install the dependencies:
```
$ ./bootstrap.sh
```

Once the dependencies have been installed you can start a pre-configured (but customizable) crawl with either:

```
$ ./run-crawler.sh -c conf.json
```
or:
```
$ node index.js -c conf.json
```


### Config file
The `config.json` file example below is provided for you without annotations as the annotations (comments) are not valid `json`


For more detailed  information about the crawl configuration file and its field please consult the [manual](https://n0tan3rd.github.io/Squidwarc/) available online.

```js
{
  "mode": "page-only", // the mode you wish to crawl using
  "depth": 1, // how many hops out do you wish to crawl

  // path to the script you want Squidwarc to run per page. See `userFns.js` for more information
  "script": "./userFns.js",
  // the crawls starting points
  "seeds": [
    "https://www.instagram.com/visit_berlin/"
  ],

  "warc": {
    "naming": "url" // currently this is the only option supported do not change.....
    "append": false // do you want this crawl to use a save all preserved data to a single WARC or WARC per page
  },

  // Chrome instance we are to connect to is running on host, port.
  // must match --remote-debugging-port=<port> set when Squidwarc is connecting to an already running instance of  Chrome.
  // localhost is default host when only setting --remote-debugging-port
  "connect": {
    "launch": true, // if you want Squidwarc to attempt to launch the version of Chrome already on your system or not
    "host": "localhost",
    "port": 9222
  },

  // time is in milliseconds
  "crawlControl": {
    "globalWait": 60000, // maximum time spent visiting a page
    "inflightIdle": 1000, // how long to wait for until network idle is determined when there are only `numInflight` (no response recieved) requests
    "numInflight": 2, // when there are only N inflight (no response recieved) requests start network idle count down
    "navWait": 8000 // wait at maximum 8 seconds for Chrome to navigate to a page
  }
}
```


[![JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)
