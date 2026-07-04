#!/bin/sh
set -e

node scripts/docker-migrate.mjs
exec npx next start -H 0.0.0.0 -p 3000
