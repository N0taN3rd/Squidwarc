# Crawl Configuration
Squidwarc uses `json` file format for its crawl configuration.

The full schema of the configuration file is displayed below, however not all fields are required.
```
{
    use: string
    mode: string
    depth: int
    headless: bool
    seeds: [string] | string
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
      executable: string
    }
    crawlControl: {
      globalWait: int,
      inflightIdle: int
      navWait: int
      numInflight: int
    }
}
```

## Required fields

### seeds
The only field required bu Squidwarc is the `seeds` field for obvious reasons.

If any field is left out besides the `seeds` field Squidwarc will either use the default values, listed below,
or set the field to a correct value based on the values of other fields.

The value of this field can be either an array of string (URLs) or a path to an JSON file containing the array of seed URLs

## Optional fields

### use
Should Squidwarc use Chrome/Chromium directly or via puppeteer.

When this field is `chrome` (default value) then either Chrome/Chromium must be installed and usable.

If the value of this field is `puppeteer` then Chrome/Chromium is not required to be installed,
Squidwarc will ensure a usable version of Chromium is automatically downloaded and used.

If the value of the [script field](#script) is set and the script it points to contains a valid function this value
is set to `puppeteer`.

-  values: `chrome` or `puppeteer`
-  default: `chrome`

---

### mode
The mode this crawl is to be operating in.
-   default: page-only

#### page-only
Preserve the only the page, no links are followed
- values: `page-only` or `po`

#### page-same-domain
`page-only` mode plus all links found on the page that are on the same domain as the page
- values: `page-same-domain` or `psd`


#### page-all-links
`page-only` mode plus all links found on the page
- values: `page-all-links` or `pal`

---

### depth
The depth of this crawl (how many pages out from a starting seed should be crawled)
-   default: 1

---

### headless
Should the browser launched and used by Squidwarc be in headless mode
-   default: true

---

### script
A path to script (js file) to be executed per page, causes the value of [`use`](#use) to be set to `puppeteer`.

The js file the `script` field points to is expected to export a single `async function` that accepts one argument:
```js
module.exports = async function (page) { .... }
```
Because Squidwarc requires the file to be a Node.js module that exports a single `async function`,
the script has full access to the [Node.js API](https://nodejs.org/dist/latest-v10.x/docs/api/).

When Squidwarc executes this function, Squidwarc will pass it the [puppeteer Page](https://pptr.dev/#?product=Puppeteer&version=v1.7.0&show=api-class-page)
object for the page being crawled.

Squidwarc will then wait for the Promise returned by the function to resolve and the network to idle before WARC generation begins.

An example script is provided called [userFns.js](https://github.com/N0taN3rd/Squidwarc/blob/master/userFns.js) found in the root of this project.

**Squidwarc is not responsible for ill-behaved scripts**

---

### warc

Options for how the crawls WARCs should be created

#### naming

The naming scheme to be used for WARC generation

Scheme url
- warcs will be created named `[url crawled]-datetime`.warc
- and `append = true` warcs will be created named `[first crawled url]-datetime`.warc

The only other value accepted is a file name to be used, this will cause [append](#append) to be set to true.

Squidwarc will ensure the URLs used apart of filenames will be a valid file name.

- default: url


#### output
Path to the directory the WARCs are to be created in

-   default: current working directory


#### append
Should Squidwarc create a single WARC file for the crawl or a WARC file per page crawled
-   default: false

---

### connect
Information about how to connect to or launch Chrome/Chromium

#### host
The host name the browsers CDP endpoint is listing on
-   default: localhost


#### port
The port number the browsers CDP endpoint is listing on
-   default: 9222

#### launch
Should Squidwarc launch and manage the browser or connect to an already running instance.

If this value is set to true and [executable](#executable) is not set, Squidwarc will attempt to find a usable executable
when [use](#use) = `chrome`.

-  default: true

#### executable
Path to the browser executable or command to be used to launch the browser

If this value is set and [launch](#launch) is `true`, Squidwarc will use this value rather than attempting to find
an usable executable.

#### userDataDir
Path to a user data directory to be used rather than a temporary one.

This field is useful when you want to preserve a page that is behind authentication and
you are already signed in and view that page using your local version of Chrome/Chromium.

It is recommended to use the full path to the user data directory to ensure 100% usability.

On Linux the default location is in ~/.config:
- [Chrome Stable] ~/.config/google-chrome
- [Chrome Beta] ~/.config/google-chrome-beta
- [Chrome Dev] ~/.config/google-chrome-unstable
- [Chromium] ~/.config/chromium

On macOS the default location is in the Application Support folder:
- [Chrome] ~/Library/Application Support/Google/Chrome
- [Chrome Canary] ~/Library/Application Support/Google/Chrome Canary
- [Chromium] ~/Library/Application Support/Chromium


On Windows the default location is in the local app data folder:
- [Chrome] %LOCALAPPDATA%\Google\Chrome\User Data
- [Chrome Canary] %LOCALAPPDATA%\Google\Chrome SxS\User Data
- [Chromium] %LOCALAPPDATA%\Chromium\User Data

---

### crawlControl
Options for fine tuning the crawl


#### globalWait
Maximum amount of time, in milliseconds, that Squidwarc should wait
before generating a WARC and moving to the next URL.
-   default: 60000

#### numInflight

The number of inflight requests (requests with no response) that should
exist before starting the inflightIdle timer.
-   default: 2



#### inflightIdle

Amount of time, in milliseconds, that should elapse when there are only
numInflight requests for network idle to be determined.
-   default: 1000


#### navWait
Maximum amount of time, in milliseconds, that Squidwarc should wait for
indication that the browser has navigated to the page being crawled.
-   default: 8000







