#!/usr/bin/env bash

git submodule init
git submodule update
yarn install
cd node-warc
yarn install
cd ..