#!/bin/sh
set -eu
npm run serve -- --subtitles-path=${1:-/dev/stdin}
