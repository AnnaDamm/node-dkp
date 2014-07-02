#!/bin/bash

sass --watch .:../public/css --cache-location '/tmp/sass-cache' --style 'compressed' --poll
