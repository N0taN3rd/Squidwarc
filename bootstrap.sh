#!/usr/bin/env bash

install () {
    if hash yarn 2>/dev/null; then
      yarn install
    else
      npm install
    fi
}

install

