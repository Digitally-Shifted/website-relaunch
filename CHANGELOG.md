# Changelog

All notable changes to this site are documented in this file.

The format is based on Keep a Changelog 1.1.0, and this project adheres to
Semantic Versioning. Versions apply to production releases; staging builds
are identified by commit SHA (docs/release-process.md).

## [Unreleased]

### Added

- Blog index page at `/blog/` that lists the four blog topics (DIG-92, AC-009).

### Fixed

- The skip link now moves keyboard focus into the page content (DIG-92, AC-007).
- Blog topic and service detail pages use ink links on light grounds; the
  previous accent links failed the 4.5:1 text contrast minimum (DIG-92, AC-006).
- Keyboard focus on mobile now rests above the fixed action bar, never under
  it (DIG-92, AC-008).
- Section headings carry ids, so every `aria-labelledby` section label
  resolves to its heading (DIG-92, AC-010).
- The mobile action bar is a navigation landmark named "Quick actions"
  (DIG-92, AC-011).
- Interactive card hover borders use grey-500, which meets the 3:1 non-text
  contrast minimum on both grounds (DIG-92, AC-012).
- Smooth scrolling is disabled for users who prefer reduced motion.
