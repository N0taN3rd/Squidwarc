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
  '--disable-breakpad',
  '--disable-sync',
  '--disable-translate',
  '--disable-domain-reliability',
  '--disable-renderer-backgrounding',
  '--disable-infobars',
  '--disable-translate',
  '--disable-features=site-per-process',
  '--metrics-recording-only',
  '--no-first-run',
  '--safebrowsing-disable-auto-update',
  '--password-store=basic',
  '--use-mock-keychain',
  '--mute-audio',
  '--autoplay-policy=no-user-gesture-required',
  '--window-size=1920,1080'
]
