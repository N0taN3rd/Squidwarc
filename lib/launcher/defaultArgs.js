// https://peter.sh/experiments/chromium-command-line-switches/
// https://cs.chromium.org/chromium/src/chrome/common/chrome_switches.cc

module.exports = [
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-client-side-phishing-detection',
  '--disable-default-apps',
  '--disable-extensions',
  '--disable-hang-monitor',
  '--disable-prompt-on-repost',
  '--disable-sync',
  '--disable-translate',
  '--metrics-recording-only',
  '--no-first-run',
  '--safebrowsing-disable-auto-update',
  '--password-store=basic',
  '--use-mock-keychain',
  '--mute-audio',
  '--window-size=1920,1080',
  '--disable-domain-reliability', // no Domain Reliability Monitoring
  '--disable-renderer-backgrounding',
  '--disable-infobars',
  '--disable-translate'
]
