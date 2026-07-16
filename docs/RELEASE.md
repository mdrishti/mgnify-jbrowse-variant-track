# Release and Publish Guide

How to release and publish `mgnify-jbrowse` to npm.

---

## Prerequisites

1. **npm account** – You must be a maintainer of the [mgnify-jbrowse](https://www.npmjs.com/package/mgnify-jbrowse) package on npm.
2. **NPM_TOKEN** – Create an [npm access token](https://www.npmjs.com/settings/~/tokens) with "Automation" or "Publish" scope.

---

## Option A: GitHub Actions (manual trigger)

Both CI and Publish workflows are **manual only** – no automatic triggers on push or release.

### 1. Add NPM_TOKEN to GitHub

1. Go to your repo → **Settings** → **Secrets and variables** → **Actions**
2. Add a secret: **NPM_TOKEN** = your npm access token

### 2. Release and publish

1. Bump version in `package.json`:

   ```bash
   npm version patch   # 0.1.2 → 0.1.3
   # or
   npm version minor   # 0.1.2 → 0.2.0
   # or
   npm version major   # 0.1.2 → 1.0.0
   ```

2. Push the version commit:

   ```bash
   git push origin main
   ```

3. Manually trigger the publish workflow:
   - Go to **Actions** → **Publish to npm** → **Run workflow**
   - Click **Run workflow**
   - The workflow builds and publishes to npm

### 3. Run CI manually

To verify build and tests without publishing:

- Go to **Actions** → **CI** → **Run workflow**

---

## Option B: Manual publish (local)

```bash
# 1. Bump version
npm version patch

# 2. Build
npm run build

# 3. Login to npm (if not already)
npm login

# 4. Publish
npm publish --access public
```

---

## Checklist before release

- [ ] Version bumped in `package.json`
- [ ] `npm run build` succeeds
- [ ] `npm test` passes (or `--passWithNoTests` if no tests)
- [ ] README and docs are up to date
- [ ] Changelog updated (if you maintain one)

---

## Troubleshooting

| Issue                      | Solution                                                               |
| -------------------------- | ---------------------------------------------------------------------- |
| `403 Forbidden` on publish | Check NPM_TOKEN has publish scope; verify you're a package maintainer  |
| `402 Payment required`     | Package name may be taken; use `--access public` for unscoped packages |
| Version already exists     | Bump version in package.json; npm rejects duplicate versions           |
| Build fails in CI          | Run `npm run build` locally; fix any TypeScript or build errors        |

---

## Workflows

| Workflow           | Trigger     | Purpose        |
| ------------------ | ----------- | -------------- |
| **CI**             | Manual only | Build, test    |
| **Publish to npm** | Manual only | Publish to npm |
