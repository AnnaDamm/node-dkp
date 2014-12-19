#!/bin/sh
nodeCmd=$(command -v nodejs || command -v node)
exec "$nodeCmd" node_modules/.bin/r.js -o public/js-dev/app.build.js
