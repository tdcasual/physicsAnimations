#!/usr/bin/env bash
set -euo pipefail

npm run guard:file-size
npm run guard:security
npm run build:frontend
npm test
npm --prefix frontend run test
npm run typecheck:frontend
npm run smoke:spa-public
npm run smoke:spa-admin
npm run smoke:spa-admin-write
npm run smoke:spa-library-admin
