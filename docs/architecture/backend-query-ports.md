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

## Post-Split Module Boundaries (2026-02-27)

### Library Service

- Facade/orchestrator: `server/services/library/libraryService.js`
- Domain services:
  - `server/services/library/assetsService.js`
  - `server/services/library/foldersService.js`
  - `server/services/library/embedProfilesService.js`
  - `server/services/library/viewerRenderService.js`
- Core helpers:
  - `server/services/library/core/normalizers.js`
  - `server/services/library/core/embedProfileSync.js`

Rule:
- `libraryService.js` only wires dependencies and re-exports stable API names.
- New business logic should go into the domain service file, not the facade.

### State DB

- Facade/orchestrator entry: `server/lib/stateDb.js`
- Store assembly: `server/lib/stateDb/storeFactory.js`
- SQLite mirror engine: `server/lib/stateDb/sqliteMirror.js`
- Shared mirror helpers: `server/lib/stateDb/mirrorHelpers.js`

Rule:
- `stateDb.js` keeps export surface only (`createStateDbStore`, `normalizeStateDbMode`).
- Shared parsing/normalization logic must live in `mirrorHelpers.js`, not duplicated in `sqliteMirror.js` or callers.

## Maintenance Guardrails

- Size target: `server/services/library/*.js` should stay under ~500 LOC per file.
- Size target: `server/lib/stateDb.js` should remain orchestration-only (small facade).
- Contract guard:
  - Keep `createLibraryService` method surface stable.
  - Keep `createStateDbStore` return shape `{ store, info }` stable.
