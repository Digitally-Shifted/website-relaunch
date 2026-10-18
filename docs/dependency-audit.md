# Dependency audit process — website relaunch

This document defines the audit cadence for the dependencies of this
repository. It covers security scanning, outdated packages, and the plan to
apply updates safely. Owner: DIG-77. Related: docs/deploy-process.md (deploy
checks and rollback), docs/release-process.md (releases),
docs/security-review.md (launch gate), docs/analytics-setup.md (analytics
setup).

## What counts as a dependency

| Kind | Items | Where it lives |
| --- | --- | --- |
| GitHub Actions | actions/checkout, actions/configure-pages, actions/upload-pages-artifact, actions/deploy-pages | .github/workflows/ |
| Runner image | ubuntu-latest (GitHub-managed) | .github/workflows/ |
| External runtime script | Google gtag.js on www.googletagmanager.com | analytics/ds-analytics.js |
| Build tools | bash, GNU coreutils, tar, sha256sum, python3 (local preview only) | scripts/build-site.sh |
| Platform services | GitHub Pages, GA4 (Google-managed) | hosting; docs/analytics-setup.md |

There is no npm or other package manifest today. When a manifest lands, add
its ecosystem to .github/dependabot.yml. Update the tables in this document
in the same change.

## Cadence

| Cadence | Work | Where it runs | Evidence |
| --- | --- | --- | --- |
| Weekly, automatic | Dependabot opens update PRs for actions | Dependabot | PRs on this repository |
| Weekly, automatic | Dependency audit run: external script inventory, action version drift | Audit workflow, Mondays 09:00 UTC | workflow run |
| Monthly, first full week | Review audit findings and Dependabot alerts. Apply class B and class C updates. | Maintainer or DevOps agent | New audit log row |
| Quarterly | Read runner image and platform release notes. Re-test one staging rollback. | Maintainer or DevOps agent | New audit log row |
| On demand | A security advisory or an upstream incident touches a dependency we use. | Who sees it | Immediate class A patch |

Commands for the monthly review:

```sh
gh api repos/Digitally-Shifted/website-relaunch/dependabot/alerts
gh run list -R Digitally-Shifted/website-relaunch --workflow "Dependency audit" --limit 4
```

## Security scanning

- Dependabot alerts are on for this repository. Verified on 2026-10-18
  (HTTP 204 from `repos/.../vulnerability-alerts`).
- The weekly audit run re-checks the external script inventory. A new or
  unreachable script fails the run.
- Dependabot watches GitHub Actions versions and opens update PRs weekly.
- Runner images and GitHub Pages are GitHub-managed. Their advisories land in
  the GitHub changelog. The quarterly review reads them.

## Outdated packages

- The audit run compares each pinned action major with the latest release. A
  newer major is a WARN finding. WARN findings go to the monthly review.
- Dependabot groups minor and patch updates into one PR. Major upgrades stay
  one change each.

## Patch classes

| Class | Meaning | Service level | Approval |
| --- | --- | --- | --- |
| A | Security fix for a dependency we use | Critical or high: 48 hours. Medium: 14 days. Low: 30 days. | None for staging. Production release keeps its required reviewer. |
| B | Patch and minor updates | Bundle at the monthly review | None |
| C | Major version upgrade | Next monthly review, one change per action | Read the release notes before merge |
| D | New or changed external runtime script | Before it serves | Maintainer approval in the PR |

Class C rule: read the action release notes. Confirm no breaking change for
our usage. Keep one action per merge, so a bad upgrade is easy to revert.
Exception: several official `actions/*` upgrades may ship together when each
is a major-only bump and the staging deploy plus audit run pass.

## Safe patching plan

Every dependency change follows the same path:

1. Make the change on a branch. Use `main` directly only for class A.
2. Run the build checks locally:

   ```sh
   bash scripts/build-site.sh /tmp/site-check
   ```

3. Merge to `main`. The staging deploy runs the same checks and publishes.
4. Confirm the build marker on
   https://digitally-shifted.github.io/website-relaunch/ shows the new commit.
5. Do one browser check when page behavior can change.
6. Add one row to the audit log below.

Rollback: staging uses `scripts/rollback-staging.sh`. Production dispatches
`deploy-production.yml` with the previous `prod-*` tag. Full steps:
docs/deploy-process.md.

A dependency change that fails staging twice needs a revert first. Analyze
the cause after the revert.

## Adding a dependency

Before a new dependency enters the build or the pages:

1. Name the maintainer and the license.
2. Prefer a verified-creator GitHub action, or a vendored script with zero
   runtime dependencies.
3. Pin third-party actions to a full commit SHA. Add a comment with the
   version. Official `actions/*` keep their major tag.
4. Add new external script hosts to scripts/dependency-audit.sh.
5. Update the inventory table above in the same PR.

## Audit log

Append one row per review or incident. Do not rewrite old rows.

| Date | Cadence | Change or finding | Result | Evidence |
| --- | --- | --- | --- | --- |
| 2026-10-18 | setup | Process defined. Dependabot config and weekly audit workflow added. | PASS | DIG-77 |

## One-time setup (done)

- .github/dependabot.yml on `main`: weekly github-actions updates.
- Dependabot alerts: on for public repositories. Verified 2026-10-18.
- Audit workflow: schedule Mondays 09:00 UTC, plus manual runs.
