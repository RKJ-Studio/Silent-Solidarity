---
name: Orval schema collision fix
description: How to avoid TS2308 duplicate export errors when Orval generates Zod schemas and TypeScript types with the same name
---

## Rule

Never name a component schema `<OperationIdPascal>Body` (collides with auto-generated Zod body schema), and also avoid naming response schemas anything that Orval might auto-generate a Zod schema for using the same name.

The specific case that tripped us: `AdminLoginResponse` (component schema for the `adminLogin` operation's response) collided because Orval generated both a Zod schema named `AdminLoginResponse` in `generated/api.ts` AND a TypeScript type in `generated/types/adminLoginResponse.ts`. Both are re-exported from `lib/api-zod/src/index.ts` via `export *`, causing TS2308.

**Why:** Orval generates Zod schemas for response schemas of operations, not just body schemas. Any component schema whose name matches an auto-generated Orval export name will collide.

**How to apply:** Rename response schemas to entity-shaped names that don't follow the `<OperationIdPascal>Response` pattern (e.g. `AuthToken` instead of `AdminLoginResponse`). Run codegen and check `pnpm run typecheck:libs` passes before continuing.
