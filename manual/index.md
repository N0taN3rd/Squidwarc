<p align="center">
<img alt="Squidwarc" src="https://github.com/N0taN3rd/Squidwarc/blob/master/meta/logo.png?raw=true" width="30%">
</p>

# Squidwarc Features
- User scripting api
-

**Squidwarc** aims to address the need for a high fidelity crawler akin to Heritrix while still being easy enough for the personal archivist to setup and use.

**Squidwarc** does not seek (at the moment) to dethrone Heritrix as the queen of wide archival crawls rather
seeks to address Heritrix's short comings namely:
- No JavaScript execution
- Everything is plain text
- Requiring configuration to know how to preserve the web
- Setup time and technical knowledge required of its users

For more information about this see
- [Adapting the Hypercube Model to Archive Deferred Representations and Their Descendants](https://arxiv.org/abs/1601.05142)
- [2012-10-10: Zombies in the Archives](http://ws-dl.blogspot.ca/2012/10/2012-10-10-zombies-in-archives.html)
- [2013-11-28: Replaying the SOPA Protest](http://ws-dl.blogspot.ca/2013/11/2013-11-28-replaying-sopa-protest.html)
- [2015-06-26: PhantomJS+VisualEvent or Selenium for Web Archiving?](http://ws-dl.blogspot.ca/2015/06/2015-06-26-phantomjsvisualevent-or.html)

**Squidwarc** is built using Node.js and [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface).

If you are unable to install Node on your system
then **Squidwarc** highly recommends [WARCreate](http://warcreate.com/) or [WAIL](https://github.com/N0taN3rd/wail/releases).
WARCreate did this first and if it had not **Squidwarc** would not exist :two_hearts:

If recording the web is what you seek, **Squidwarc** highly recommends [Webrecorder](https://webrecorder.io/).


# Out Of The Box Crawls
### Page Only
Preserve the page such that there is no difference when replaying the page from viewing the page in a web browser at preservation time

### Page + Same Domain Links
Page Only option plus preserve all links found on the page that are on the same domain as the page

### Page + All internal and external links
Page + Same Domain Link option plus all links from other domains

#### Crawls Operate In Terms Of A Composite memento
A *memento* is an archived copy of a web resource [RFC 7089](http://www.rfc-editor.org/info/rfc7089).  The datetime when the copy was archived is called its *Memento-Datetime*.  A *composite memento* is a root resource such as an HTML web page and all of the embedded resources (images, CSS, etc.) required for a complete presentation.

More information about this terminology can be found via [ws-dl.blogspot.com](http://ws-dl.blogspot.com/search?q=composite)

The mode set is currently applied to the initial seed list and any discovered seeds have ```page-only``` applied to them

The application of the mode to the discovered seed is discussed in feature request [#13](https://github.com/N0taN3rd/Squidwarc/issues/13)

# Usage

Run `npm install` or `yarn` before continuing in order to install the dependencies for this project.

Once the dependencies have been installed you can execute `$ ./run-crawler.sh -c conf.json` or `$ node index.js -c conf.json` to start crawling!

Note that when using the provided `conf.json`, Squidwarc will automatically launch Chrome for you.

If you wish for Squidwarc to connect to an already running instance of Chrome please set `connect.launch` to false and ensure that the already running Chrome instance was launched using the `--remote-debugging-port=<port>` argument.

More information about the arguments Squidwarc is expecting can be viewed using `-h` or `--help`.

### Config file
The `config.json` file example below is provided for you without annotations as the annotations (comments) are not valid `json`

```js
{
  "mode": "page-only", // the mode you wish to crawl using
  "depth": 1, // how many hops out do you wish to crawl

  // the crawls starting points
  "seeds": [
    "https://www.reuters.com/"
  ],

  "warc": {
    "naming": "url" // currently this is the only option supported do not change.....
  },

  // Chrome instance we are to connect to is running on host, port.
  // must match --remote-debugging-port=<port> set when Squidwarc is connecting to an already running instance of  Chrome.
  // localhost is default host when only setting --remote-debugging-port
  "connect": {
    "launch": true, // if you want Squidward to attempt to launch the version of Chrome already on your system or not
    "host": "localhost",
    "port": 9222
  },

  // time is in milliseconds
  "crawlControl": {
    "globalWait": 60000, // maximum time spent visiting a page
    "inflightIdle": 1000, // how long to wait for until network idle is determined when there are only `numInflight` (no response recieved) requests
    "numInflight": 2, // when there are only N inflight (no response recieved) requests start network idle count down
    "navWait": 8000 // wait at maxium 8s for Chrome to navigate to a page
  }
}
```
[![JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)
