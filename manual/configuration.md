# Crawl Configuration

### Fields

Squidwarc uses `json` for its crawl configuration files and seedList files.

The schema of the allowed values of the configuration file is displayed below
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
      isPartOf: string
      infoDescription: string
    }
    connect: {
      host: string
      port: string
      launch: bool
      userDataDir: string
      executable: string | path
    }
    crawlControl: {
      globalWait: int,
      inflightIdle: int
      navWait: int
      numInflight: int
    }
}
```
