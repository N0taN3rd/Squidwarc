<p align="center">
<img alt="Squidwarc" src="https://github.com/N0taN3rd/Squidwarc/blob/master/meta/logo.png?raw=true" width="30%">
</p>

**Squidwarc** is a high fidelity archival crawler that uses Chrome or Chrome Headless. **Squidwarc** aims to address the need for a high fidelity crawler akin to Heritrix while still being easy enough for the personal archivist to setup and use.

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

If recording the web is what you seek **Squidwarc** highly recommends [Webrecorder](https://webrecorder.io/).


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

There are two shell scripts provided to help you use the project at the current stage.

### run-chrome.sh   
You can change the variable `chromeBinary` to point to the Chrome command to use,
that is to launch Chrome via.

The value for `chromeBinary` is initially set to `google-chrome-beta`

The `remoteDebugPort` variable is used for `--remote-debugging-port=<port>`

Chrome versions 59 (stable) or 60 (beta) are actively tested on Ubuntu 16.04. Chrome version 60 is currently used and known to work well :+1:  

Chrome versions less than 59 Headless will not work. Windows is not supported yet (as of version 59).

No testing is done on canary or google-chrome-unstable so your millage may vary
if you use these versions.

Takes one argument `headless` if you wish to use Chrome headless otherwise runs Chrome with a head :grinning:

For more information see [Google web dev updates](https://developers.google.com/web/updates/2017/04/headless-chrome).

### run-crawler.sh
Once Chrome has been started you can use `run-crawler.sh`  passing it `-c <path-to-config.json>`

More information can be retrieved by using `-h` or `--help`

Or if you want to use node directly 

`node --harmony index.js -c <path-to-config.json>`

The `config.json` file example below is provided beside the two shell scripts without annotations as the annotations (comments) are not valid `json`

```js
{
  // supports page-only, page-same-domain, page-all-links
  // crawl only the page, crawl the page and all same domain links,
  // and crawl page and all links. In terms of a composite memento
  "mode": "page-same-domain",
 
 // an array of seeds or a single seed
  "seeds": [
    "http://acid.matkelly.com"
  ],
  
  "warc": {
    "naming": "url", // currently this is the only option supported do not change.....
    "output": "path" // where do you want the WARCs to be placed. optional defaults to cwd
  },
  
  // Chrome is an HTTP/2 capable browser since v49, Firefox since v52 http://caniuse.com/#search=http2
  // No known replay system can replay archived HTTP/2 request/responses  
  "noHTTP2": true, // optional defaults to false
  
   // Chrome instance we are to connect to is running on host, port.  
  // must match --remote-debugging-port=<port> set when launching chrome.
  // localhost is default host when only setting --remote-debugging-port
  "connect": {
    "host": "localhost",
    "port": 9222
  },
  
  // time is in milliseconds
  "timeouts": {
    // wait at maxium 8s for Chrome to navigate to a page
    "navigationTimeout": 8000,
    // wait 7 seconds after page load
    "waitAfterLoad": 7000
  },
  
 // optional auto scrolling of the page. same feature as webrecorders auto-scroll page
 // time is in milliseconds and indicates the duration of the scroll
 // in proportion to page size. Higher values means longer smooth scrolling, shorter values means faster smooth scroll
 "scroll": 4000
}
```
[![JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)
