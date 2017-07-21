#!/usr/bin/env bash

remoteDebugPort=9222
chromeBinary="google-chrome-beta"


case $OSTYPE in darwin*) 
  chromeBinary=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
esac

chromeVersion=$("$chromeBinary" --version | grep -oE "\d{1,4}" | head -n1)

if [ "$1" = "headless" ]; then
   "$chromeBinary" --headless --disable-gpu --remote-debugging-port=${remoteDebugPort}
else
   "$chromeBinary" --remote-debugging-port=${remoteDebugPort}
fi