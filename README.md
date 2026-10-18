# Website relaunch

Engineering home for the new Digitally Shifted website. This repository starts
as a deploy-flow scaffold: page implementation lands through DIG-15 and
DIG-16.

- Deploy process, checks, and rollback: `docs/deploy-process.md`
- Security review checklist (launch gate): `docs/security-review.md`
- Dependency audit cadence: `docs/dependency-audit.md`
- Staging URL: https://digitally-shifted.github.io/website-relaunch/
- Staging deploys automatically on every push to `main`.
- Production releases are separate and need a manual approval step.

## Local preview

```sh
bash scripts/build-site.sh site
python3 -m http.server 8080 --directory site
# open http://localhost:8080/
```
