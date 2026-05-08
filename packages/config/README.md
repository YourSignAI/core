# `@yoursign/config`

Shared developer config: ESLint, Prettier, TypeScript base extensions.

Each app/package extends from here:

```jsonc
// apps/*/tsconfig.json
{ "extends": "../../tsconfig.base.json" }

// apps/*/eslint.config.mjs
import config from "@yoursign/config/eslint";
export default config;
```

## Status

Stub. Phase 0.
