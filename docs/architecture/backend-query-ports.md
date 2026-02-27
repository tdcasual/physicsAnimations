# Backend Query Ports

- `itemsQueryRepo` is the only read-query dependency for items read paths.
- `taxonomyQueryRepo` is the only dynamic taxonomy/catalog read-query dependency.
- App composition root (`server/app.js`) builds repos from storage adapter.
- Business services/routes must not inspect `store.stateDbQuery` directly.

## Why

- Reduces storage implementation leakage into domain/service code.
- Enables swapping SQL/memory/mock implementations via one adapter boundary.

## Current Implementations

- Store adapter: `server/ports/queryRepos.js`
- SQLite source: `server/lib/stateDb/*`
