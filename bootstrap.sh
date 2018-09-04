#!/usr/bin/env bash

git submodule init
git submodule update
npm install
cd node-warc
npm install
