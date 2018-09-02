# Crawl Configuration

### Fields
Squidwarc uses `json` for its crawl configuration files and a

```
{
    use: string
    mode: string
    depth: int
    headless: bool
    seeds: [string] | path
    script: path
    warc: {
      naming: string
      output: path
      append: bool
    }
    connect: {
      host: string
      port: string
      launch: bool
    }
    crawlControl: {
      globalWait: int,
      inflightIdle: int
      navWait: int
      numInflight: int
    }
}
```