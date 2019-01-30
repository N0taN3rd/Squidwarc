# Squidwarc
## Features
- High fidelity web archiving
- [User scriptable](manual/configuration.html#script)
- Designed for the personal archivist and power users alike
- No browser available no problem
- Lightweight and simple setup + configuration

# About
**Squidwarc** is a high fidelity, user scriptable, archival crawler that uses Chrome or Chromium with or without a head.

**Squidwarc** aims to address the need for a high fidelity crawler akin to Heritrix while still being easy enough for the personal archivist to setup and use.

For more information about this see
- [Adapting the Hypercube Model to Archive Deferred Representations and Their Descendants](https://arxiv.org/abs/1601.05142)
- [2012-10-10: Zombies in the Archives](http://ws-dl.blogspot.com/2012/10/2012-10-10-zombies-in-archives.html)
- [2013-11-28: Replaying the SOPA Protest](http://ws-dl.blogspot.com/2013/11/2013-11-28-replaying-sopa-protest.html)
- [2015-06-26: PhantomJS+VisualEvent or Selenium for Web Archiving?](http://ws-dl.blogspot.com/2015/06/2015-06-26-phantomjsvisualevent-or.html)

# Quick Start
Requirements: [Node.js](https://nodejs.org/en/)

If Docker is more your thing, then Squidwarc provides a docker and docker-compose file for your use.


```shell
git clone https://github.com/N0taN3rd/Squidwarc.git

cd Squidwarc

./bootstrap.sh

./run-crawl.sh -c conf.json
```
To learn about how to configure crawls see the [Crawl Configuration](manual/configuration.html) section of this manual.

If running a crawler through the commandline is not your thing, you can use [warcworker](https://github.com/peterk/warcworker),
a dockerized web front end for Squidwarc by [@peterk](https://github.com/peterk).
