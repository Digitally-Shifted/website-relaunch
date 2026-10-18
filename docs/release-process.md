# Release process — website relaunch

This document gives the version rules, changelog rules, tags, and rollback
steps for production releases of the site. Owner: DIG-78. Related: DIG-64
(`docs/deploy-process.md`, deploy commands and checks), DIG-20 (go-live and
production hosting).

The deploy process and the release process are separate:

- `docs/deploy-process.md` covers how a build moves to an environment.
- This document covers version numbers, the changelog, tags, and rollback.

Staging has no versions. Every push to `main` deploys. The commit SHA is the
identity of a staging build. Versions, the changelog, and release tags apply
to production releases only.

## Versions (semver)

Production releases use semantic versioning (semver). Tags have this format:

```text
vMAJOR.MINOR.PATCH        example: v1.4.2
```

| Part | Increase when the release ... |
| --- | --- |
| MAJOR | Removes or renames pages or URLs, or changes the brand or the site structure |
| MINOR | Adds a page, a section, or a feature such as new analytics conversion events |
| PATCH | Fixes copy, links, or styles with no structural change |

Rules:

- The first production release at go-live (DIG-20) gets the version `v1.0.0`.
- Before go-live, production runs make release artifacts only. They get no
  version tags.
- Tag only commits on `main`.
- Release only commits that staging has served.
- Give each version tag to one commit. Do not move or reuse a version tag.
- Always pass the version tag as the workflow ref. Do not release from the
  default `main` ref.

## Changelog

The file `CHANGELOG.md` at the repository root is the record of released
versions. Use the Keep a Changelog 1.1.0 format:
<https://keepachangelog.com/en/1.1.0/>.

- Create `CHANGELOG.md` with the first production release.
- Give each version a section with the release date. Put the newest version
  at the top.
- Group entries under `Added`, `Changed`, and `Fixed`. Add a
  `Rolled back` group for rollbacks.
- Reference the DIG issue of each change.
- Put each change in `## [Unreleased]` in the same commit or pull request
  as the change.
- At release time, change the `Unreleased` heading to the version and the
  date.

## Tags

Each production release puts two tags on the released commit:

| Tag | Who makes it | Purpose |
| --- | --- | --- |
| `vMAJOR.MINOR.PATCH` | The releaser, before the release run | The version of the site content |
| `prod-<short-sha>-<YYYYMMDD-HHMMSS>` | The `deploy-production.yml` workflow, on every production run | The audit tag of the exact deployed build; also the GitHub release name |

The version tag names the content. The `prod-*` tag names the deployment
event. A rollback uses the old version tag as the workflow ref. The workflow
then makes a new `prod-*` tag, so the deployment history stays complete.

The release artifact name contains the short commit SHA, for example
`site-1a2b3c4.tar.gz`. The release notes contain the released ref, so the
version shows there when you release from a version tag.

## Release steps

Do the steps in this order.

1. Confirm that the latest staging deploy passed and that the staging URL
   serves the commit to release.
2. Finish the `Unreleased` section in `CHANGELOG.md` with the version and
   the date. Merge that change to `main`. Wait for the staging deploy of
   that merge.
3. Tag the release commit:

   ```sh
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   git push origin vX.Y.Z
   ```

4. Start the production workflow from the version tag:

   ```sh
   gh workflow run deploy-production.yml -R Digitally-Shifted/website-relaunch -f ref=vX.Y.Z
   ```

5. A reviewer approves the run in the GitHub UI. The person who starts
   the run must not approve it. GitHub denied self-approval in the DIG-64
   test. UI path: Actions → Production release → the waiting run → Review
   deployments → Approve and deploy.
6. The workflow builds the site, runs the checks, and packages the archive
   with a `sha256` file. The workflow pushes the `prod-*` tag and creates
   the GitHub release with the artifacts.
7. Record the release. See "Release record" below.

## Check a release

Run these checks after every production release:

- `gh release view <prod-tag>` shows the release, the commit, and the
  artifacts.
- Download the artifact and the checksum file into one directory. Then run:

  ```sh
  sha256sum -c site-<short-sha>.tar.gz.sha256
  ```

- After go-live (DIG-20), the production host serves the build. Confirm that
  the build marker shows the released commit.

## Rollback

Roll back by deploying a previous build again. Do not rebuild an old commit
and expect the same bytes. The build puts the commit SHA and the build time
into the output. Two builds of one commit are different.

### Roll back staging

Use the rollback script. Details are in `docs/deploy-process.md`:

```sh
bash scripts/rollback-staging.sh            # back one successful deploy
bash scripts/rollback-staging.sh <run-id>   # back to a specific run
```

Confirm that the staging URL serves the earlier commit. Staging rollbacks
get no version and no changelog entry. If the bad change must stay rolled
back, undo it on `main` with `git revert` and push.

### Roll back production

1. Find the last good version tag or its `prod-*` tag:

   ```sh
   git fetch --tags origin
   git tag -l 'v*' 'prod-*' --sort=-creatordate
   ```

2. Start the production workflow with that ref:

   ```sh
   gh workflow run deploy-production.yml -R Digitally-Shifted/website-relaunch -f ref=<previous-prod-tag-or-vX.Y.Z>
   ```

3. A reviewer approves again. The approval gate applies to rollbacks.
4. The workflow makes a new `prod-*` tag and a new GitHub release for the
   same commit. The site content returns to the previous version. The
   deployment history stays complete.
5. Record the rollback in `CHANGELOG.md` under `Unreleased`. Give the
   version that you rolled back from, the version that you restored, and
   the reason.
6. After go-live, confirm that the host serves the rollback build.

Fix forward after a rollback: correct the bad change on `main`. Verify the
correction on staging. Release a new PATCH or MINOR version. Do not use the
failed version number again.

## Release record

Keep one record per production release. Add it to the release notes or to
the issue thread of the release:

- Version tag and released commit SHA
- `prod-*` tag and workflow run link
- Name of the person who approved the run
- Artifact name and `sha256` checksum
- For a rollback: the target tag and the reason

## Current state (2026-10-18)

- Staging deploys run and pass. See the verification log in
  `docs/deploy-process.md`.
- No production release has run yet. The DIG-64 test exercised the
  production path only to the approval gate.
- The production hosting upload arrives at go-live (DIG-20). Until then, the
  GitHub release artifact is the production deliverable.
- `CHANGELOG.md` starts with the first production release.
