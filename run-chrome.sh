#!/usr/bin/env bash

remoteDebugPort=9222
chromeBinary="google-chrome-beta"


if [ "$1" = "headless" ]; then
   $chromeBinary --headless --disable-gpu --remote-debugging-port=${remoteDebugPort}
else
   $chromeBinary --remote-debugging-port=${remoteDebugPort}
fi