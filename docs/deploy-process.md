# Deploy process — website relaunch

This document gives the commands, checks, and rollback steps for the staging
and production deploy paths. Owner: DIG-64. Related: DIG-15, DIG-16 (page
implementation), DIG-20 (go-live), DIG-78 (release process,
`docs/release-process.md`).

## Environments

| Environment | Where it serves | How it updates |
| --- | --- | --- |
| Staging | https://digitally-shifted.github.io/website-relaunch/ | Automatically on every push to `main` |
| Production | GitHub release artifacts (hosting upload configured at go-live, DIG-20) | Manual workflow, needs a reviewer approval |

Staging always shows the current state of `main`. Production is a separate
path: a run waits until a required reviewer approves it in the GitHub UI.

## Deploy to staging

1. Merge or push your change to `main`.
2. The `Deploy staging` workflow starts on its own. Watch it:

   ```sh
   gh run watch -R Digitally-Shifted/website-relaunch <run-id>
   ```

3. Confirm the staging URL serves the new commit:

   ```sh
   curl -fsS https://digitally-shifted.github.io/website-relaunch/ | grep "Deployed build"
   ```

The page shows a build marker with the commit SHA, build time, and
environment. The marker is the fastest proof of which build the URL serves.

One-command path from a checkout on `main`:

```sh
bash scripts/deploy-staging.sh
```

## Checks

Every deploy runs `scripts/build-site.sh`, which fails the deploy when:

- the output `index.html` is missing or empty,
- an unreplaced build placeholder stays in the output,
- a local `href` or `src` in `index.html` points to a file the output does
  not contain.

After each staging deploy, do one browser check: open the staging URL and
confirm the build marker shows the expected commit.

## Promote to production (manual approval step)

Production releases do not run from pushes. A person starts them, and GitHub
pauses the run until a required reviewer approves it. The approval happens in
the GitHub Actions run page (Actions → Production release → the waiting run →
Review deployments → Approve and deploy).

Before approval, the reviewer confirms the security review passed for this
ref. The checklist and the evidence rules live in `docs/security-review.md`
(DIG-75).

1. Choose the commit or tag to release.
2. Start the release:

   ```sh
   gh workflow run deploy-production.yml -R Digitally-Shifted/website-relaunch -f ref=<sha-or-tag>
   ```

3. A reviewer approves the run in the GitHub UI. Without approval the run
   waits and deploys nothing.
4. After approval the workflow builds the site, runs the checks, attaches the
   site archive to a GitHub release, and pushes a `prod-*` tag.
5. At go-live (DIG-20), add the hosting upload step for the production host.
   Until then the release artifact is the production deliverable.

## Roll back staging

Rerun an earlier successful deploy. GitHub redeploys that run's original
commit. No new commit is needed:

```sh
bash scripts/rollback-staging.sh            # go back one successful deploy
bash scripts/rollback-staging.sh <run-id>   # go back to a specific run
```

Confirm the rollback: the build marker on the staging URL must show the
earlier commit SHA.

The next push to `main` deploys that commit again. If the bad change must
stay rolled back, revert it on `main` too:

```sh
git revert <bad-commit>
git push origin main
```

## Roll back production

Dispatch the production workflow again with the previous `prod-*` tag:

```sh
gh workflow run deploy-production.yml -R Digitally-Shifted/website-relaunch -f ref=<previous-prod-tag>
```

The approval gate applies again. The new release and tag record the rollback.

## One-time setup (already done)

- Repository: `Digitally-Shifted/website-relaunch` (public).
- GitHub Pages is enabled with the "GitHub Actions" build source, so
  `actions/deploy-pages` publishes the staging site.
- The `production` environment has a required reviewer, so production runs
  wait for a person before they start.

## Verification log

Recorded on 2026-10-18 by the DIG-64 setup run. Each step below was executed
against the live repository.

| # | Step | Evidence | Result |
| --- | --- | --- | --- |
| 1 | Push scaffold to `main`; staging workflow runs | Run `39149499789`, commit `c0c3290`, build `2026-10-18T17:25:22Z` | PASS |
| 2 | Staging URL reachable and serves the build | `curl` showed commit `c0c3290`; browser screenshot `staging-initial.png` | PASS |
| 3 | Push a test change; staging updates | Run `39149663121`, commit `de86e4f`, build `2026-10-18T17:27:29Z` | PASS |
| 4 | Browser check shows the test change on the staging URL | Screenshot `staging-test-change.png` shows the test banner and commit `de86e4f` | PASS |
| 5 | Roll back with `scripts/rollback-staging.sh` | Rerun of `39149499789`, build `2026-10-18T17:28:25Z`, staging serves `c0c3290` again | PASS |
| 6 | Browser check shows the earlier build again | Screenshot `staging-rolled-back.png` shows commit `c0c3290`, test banner gone | PASS |
| 7 | Production workflow waits for reviewer approval | Run `39149826134` stayed `waiting`; API self-approval denied (404); run cancelled with no release or tag | PASS |

Run links:

- Staging scaffold deploy: https://github.com/Digitally-Shifted/website-relaunch/actions/runs/39149499789
- Staging test-change deploy: https://github.com/Digitally-Shifted/website-relaunch/actions/runs/39149663121
- Production approval-gate test (waiting, then cancelled): https://github.com/Digitally-Shifted/website-relaunch/actions/runs/39149826134
