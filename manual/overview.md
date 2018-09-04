# Installation
Requirements: [Node.js](https://nodejs.org/en/)

```shell
git clone https://github.com/N0taN3rd/Squidwarc.git

cd Squidwarc

./boostrap.sh
```

If Docker is more your thing, then Squidwarc provides docker and compose file for your use.

# Usage

To launch a crawl you can execute either
- `./run-crawler.sh -c conf.json`
- `node index.js -c conf.json`

Docker usage:

Modify `volumes` field of the included docker-compose file to a local directory and place the crawl configuration file in it.

Please set the `warc` sub-field `output` to `./warcs` and then execute `docker-compose up` to launch the crawl!

For more information about the configuration file, please see the [Crawl Configuration](configuration.html) section of this manual.

# Out Of The Box Crawls
### Page Only
Preserve the only the page, no links are followed

### Page + Same Domain Links
Page Only option plus preserve all links found on the page that are on the same domain as the page

### Page + Links
Page + Same Domain Link option plus all links from other domains

For more information about the configuring a crawl using one of these modes, please see the description for the
[mode](configuration.html#mode) field of a crawls config file.

