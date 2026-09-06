# Vendored SRD source data

Snapshots consumed by `scripts/gen-srd-items.ts` (`npm run gen:items`). Committed so
generation works offline / in CI.

| File                           | Upstream path                         | Items |
| ------------------------------ | ------------------------------------- | ----- |
| `5e-SRD-Equipment-2024.json`   | `src/2024/en/5e-SRD-Equipment.json`   | 182   |
| `5e-SRD-Magic-Items-2024.json` | `src/2024/en/5e-SRD-Magic-Items.json` | 262   |

- **Source repo:** https://github.com/5e-bits/5e-database
- **Commit:** see `.source-commit`
- **Content licence:** D&D SRD 5.2.1, © Wizards of the Coast LLC, released under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode). The attribution
  notice lives in `src/lib/licenses.ts` (`SRD_ATTRIBUTION`) and the generated
  `src/lib/sources/magic-items.ts` header.

## Refreshing

```
# from a checkout of 5e-bits/5e-database, or via raw.githubusercontent.com
curl -o 5e-SRD-Equipment-2024.json   .../src/2024/en/5e-SRD-Equipment.json
curl -o 5e-SRD-Magic-Items-2024.json .../src/2024/en/5e-SRD-Magic-Items.json
# record the commit you pulled from
echo <commit-sha> > .source-commit
npm run gen:items && npm run typecheck && npm run test
```
