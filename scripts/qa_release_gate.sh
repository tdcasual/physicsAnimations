#!/usr/bin/env bash
set -euo pipefail

npm test
npm --prefix frontend run test
npm run typecheck:frontend
npm run build:frontend
npm run smoke:spa-public
npm run smoke:spa-admin
npm run smoke:spa-admin-write
npm run smoke:spa-library-admin
