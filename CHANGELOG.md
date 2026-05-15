# Changelog

All notable changes to miniGestures, one entry per pull request (newest first). Pre-PR history is preserved at the bottom.

## 2026-05-15 — [#PR](url) Document Chrome warning about `background.scripts`
- Added a short note under README "Install on Chrome": after loading, `chrome://extensions/` shows a warning about the `background.scripts` key in `manifest.json` (kept for Firefox compatibility, ignored by Chrome at runtime). To silence it, delete the `"scripts": ["background.js"]` line.

## 2026-05-15 — [#31](https://github.com/testerjp/miniGestures/pull/31) Consolidate Chrome and Firefox into a single manifest.json
- Combined `manifest.json` and `manifest.firefox.json` into one `manifest.json` that loads cleanly on both Chrome and Firefox. `background` now lists both `service_worker` (used by Chrome) and `scripts` (used by Firefox), the [pattern documented by MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background) as the recommended cross-browser MV3 form.
- This reverses the split introduced by [#26](https://github.com/testerjp/miniGestures/pull/26). At the time, Chrome MV3 rejected any manifest that contained `background.scripts` (`'background.scripts' requires manifest version of 2 or lower`), so the workaround was to keep a separate `manifest.firefox.json` and `cp` it over before loading in Firefox. Current Chrome (verified on Chrome 121+) accepts the combined form and silently uses `service_worker`, so the workaround is no longer needed.
- Added `minimum_chrome_version: "121"` to mirror the existing `browser_specific_settings.gecko.strict_min_version: "121.0"`, so the supported floor is consistent across both browsers.
- Deleted `manifest.firefox.json` and the README "Why two manifests?" / Packaging guidance. Firefox install instructions now simply load `manifest.json` directly via `about:debugging` — no `cp` step.

## 2026-05-12 — [#30](https://github.com/testerjp/miniGestures/pull/30) Refresh stale descriptions in CLAUDE.md
- `CLAUDE.md` Project Overview said "Manifest V2", contradicting `manifest.json` (`manifest_version: 3`), the rest of the same file (the Architecture / Key Implementation Details sections already describe a service worker and MV3 message passing), and PR [#1](https://github.com/testerjp/miniGestures/pull/1) which migrated the extension to MV3. Corrected to "Manifest V3".
- `CLAUDE.md` Architecture section described `background.js` as using `chrome.extension` APIs and persisting settings to `localStorage`, and `options.js` as saving to `localStorage`. PR [#1](https://github.com/testerjp/miniGestures/pull/1) replaced both with `chrome.runtime` and `chrome.storage.local`; the source is grep-clean of `chrome.extension` and `localStorage` today. Updated the descriptions to match.
- `CLAUDE.md` Changelog section still instructed to add entries under `## [Unreleased]` and move them to a dated section on commit. PR [#21](https://github.com/testerjp/miniGestures/pull/21) dropped the `[Unreleased]` section in favor of a flat newest-first list of `## YYYY-MM-DD — [#PR](url) Title` entries. Rewrote the guidance to reflect the current format (and noted the "fill in PR number after PR creation" follow-up pattern used by recent PRs).
- `CLAUDE.md` is read by humans as well as coding agents, so the stale lines risked misleading both.

## 2026-05-12 — [#29](https://github.com/testerjp/miniGestures/pull/29) Fix null parentElement crash on right-click
- Fixed `Uncaught TypeError: Cannot read properties of null (reading 'href')` thrown from `mouseTrack.js` `document.onmousedown` when right-clicking on `<html>` margin/padding (e.g. `github.com/.../tags` right rail). The old code reached `event.target.parentElement.href` even when `event.target` was the root element with no parent.
- Replaced the two-step `event.target.href` / `event.target.parentElement.href` check with `event.target.closest('a[href]')`, which walks up to the nearest ancestor anchor. Side benefit: deeply nested click targets inside an `<a>` (such as GitHub's `<a><span><svg></svg></span></a>` icon links) now correctly resolve the anchor instead of silently missing it.

## 2026-05-12 — [#27](https://github.com/testerjp/miniGestures/pull/27) Bump version to 1.5.0
- Bumped `manifest.json` and `manifest.firefox.json` from `1.4` to `1.5.0` to mark the post-MV3 / Firefox-support / security-review cleanup batch (PRs [#1](https://github.com/testerjp/miniGestures/pull/1)–[#26](https://github.com/testerjp/miniGestures/pull/26)) as a released milestone, verified working on both Chrome and Firefox.
- Switched the manifest `version` field from the 2-segment `1.4` to 3-segment SemVer (`MAJOR.MINOR.PATCH`); subsequent patch releases will be `1.5.1`, `1.5.2`, etc.
- Tagged on GitHub as [`v1.5.0`](https://github.com/testerjp/miniGestures/releases/tag/v1.5.0) and published as a GitHub Release.

## 2026-05-12 — [#26](https://github.com/testerjp/miniGestures/pull/26) Fix Firefox load error by splitting the manifest
- Firefox no longer fails to load the extension with `background.service_worker is currently disabled. Add background.scripts.`.
- Added a separate `manifest.firefox.json` that uses `background.scripts: ["background.js"]` instead of `background.service_worker`. Firefox users now `cp manifest.firefox.json manifest.json` before loading via `about:debugging`; `git restore manifest.json` reverts to the Chrome version.
- Resolves the [#10](https://github.com/testerjp/miniGestures/pull/10) → [#15](https://github.com/testerjp/miniGestures/pull/15) pendulum: combining both fields breaks Chrome MV3 (rejects with `'background.scripts' requires manifest version of 2 or lower`), but Firefox 121+ keeps `service_worker` disabled by default behind the `extensions.backgroundServiceWorkerEnabled` pref. `browser_specific_settings.gecko` cannot override `background`, so a single shared manifest is not possible.
- Documented a "Packaging" subsection in README: delete the unused manifest file before producing a `.crx` (Chrome) or `.xpi` (Firefox) so the package does not carry a dead duplicate. Harmless at runtime but cleaner.

## 2026-05-12 — [#25](https://github.com/testerjp/miniGestures/pull/25) Remove unused leftover files
- Deleted `recfib.py`, a Python 2 recursive Fibonacci script accidentally committed in 2014 alongside an unrelated extension change. Python is not executed by the browser; the file was pure dead weight.
- Deleted `x_icon.png`, an unused PNG present since the 2013 first commit. Not referenced by `manifest.json` (no `icons` / `action` / `web_accessible_resources` field) or by any HTML/JS/CSS, and Chrome/Firefox do not auto-load extension files by filename, so removing it has no runtime effect.

## 2026-05-12 — [#24](https://github.com/testerjp/miniGestures/pull/24) Re-anchor security review to post-cleanup HEAD
- Re-anchored `SECURITY_REVIEW.md` to the post-cleanup HEAD (`554763b`): bumped the `Commit reviewed` line, removed the standalone jQuery section, dropped the PayPal pixel and `coin.js` rows from the external-resources table, fixed the §1 grep target list and the §6→§5 cross-reference, renumbered the remaining sections, and updated Overall Assessment to note that no passive external network activity remains on page load.

## 2026-05-12 — [#23](https://github.com/testerjp/miniGestures/pull/23) Apply optional cleanup from security review
- Deleted the unused `jquery.js` bundle and dropped it from `manifest.json` content_scripts. No jQuery callers remain in extension code, so the 2013-era XSS sinks are no longer shipped to every page.
- Deleted the unused `coin.js` and its `<script>` include from `options.html`. The script injected CSS for `.bitcoinate` elements, but no such elements exist in the repo — it was dead code.
- Removed the PayPal 1×1 tracking pixel `<img>` from the donate `<form>` in `options.html`. The donate button still submits to PayPal as before; this eliminates the only external network request triggered by opening the options page.
- Dropped the now-obsolete "Optional Cleanup Suggestions" section from `SECURITY_REVIEW.md`.

## 2026-05-12 — [#22](https://github.com/testerjp/miniGestures/pull/22) Refresh security review against HEAD
- Re-ran the static security review against the current HEAD (commit `558e664`) and rewrote `SECURITY_REVIEW.md`.
- Added a top-of-doc disclaimer that the audit was performed by Claude (Opus 4.7) via source reading and `grep`, and is not a formal or complete audit.
- Conclusion unchanged: no exfiltration, minimal permissions, safe to use within the scope of the static review.

## 2026-05-12 — [#21](https://github.com/testerjp/miniGestures/pull/21) Reorganize CHANGELOG by PR
- Restructured `CHANGELOG.md` so every entry is one pull request, sorted newest first, with a uniform `日付 — #PR 見出し` heading and 2–4 line body.
- Dropped the `[Unreleased]` section (no versioned releases are cut for this project).
- Preserved the 2013–2014 pre-PR history at the bottom; recorded the master-direct fix `049b461` as its own entry.

## 2026-05-12 — [#20](https://github.com/testerjp/miniGestures/pull/20) Remove rocker gestures
- Removed rocker gestures (right+left / left+right click combos) and the "Rocker Gestures On" checkbox on the options page.
- Inherited from the Opera-era design; conflicts with modern web apps that repurpose right-click, and the checkbox did nothing when the trigger was set to "middle".
- Cleared the `rocker` storage key from `SYSTEM_KEYS`; existing stored values become harmless dead data.

## 2026-05-12 — [#19](https://github.com/testerjp/miniGestures/pull/19) Add custom color code input
- Added a hex color input (`#rgb` / `#rrggbb`) alongside the existing preset dropdown.
- Selecting a preset auto-fills the hex field; typing a hex value selects "custom" (or the matching preset). A swatch shows a live preview.
- Invalid hex codes are rejected at save with an inline error message.

## 2026-05-12 — [#18](https://github.com/testerjp/miniGestures/pull/18) Fix "Extension context invalidated" errors
- Suppressed `Extension context invalidated.` console spam in open tabs after the extension is reloaded, auto-updated, or disabled/re-enabled.
- Routed every `chrome.runtime.sendMessage` through a `safeSendMessage` helper that checks `chrome.runtime.id` and swallows the synchronous throw.
- Reloading the affected tab restores full functionality as before.

## 2026-05-12 — [#17](https://github.com/testerjp/miniGestures/pull/17) Fix middle-click X11 primary paste
- Middle-click no longer leaks the X11 primary selection into the focused form on Linux Chrome when the gesture button is "middle".
- Plain middle-click outside an editable now blurs the focused editable so the paste has no target; middle-button release after a gesture (`moved === true`) calls `preventDefault()` on `mouseup`.
- Plain middle-clicks inside an editable still paste as Chrome would by default.

## 2026-05-12 — [#16](https://github.com/testerjp/miniGestures/pull/16) Fix stray jQuery `rmousedown` TypeError
- Right-click without a gesture no longer throws `TypeError: $(...).rmousedown is not a function`.
- Removed a stray `$('#target').rmousedown(which=3)` call (`.rmousedown` was never a jQuery method — a typo/stub from the 2014 rocker code).
- The line was dead code: the preceding `--suppress` already lets the next `contextmenu` through, so the browser menu still appears.

## 2026-05-12 — [#15](https://github.com/testerjp/miniGestures/pull/15) Fix Chrome manifest load error
- `manifest.json` no longer fails to load in Chrome with `'background.scripts' requires manifest version of 2 or lower`.
- Removed the `background.scripts` field that had been added for Firefox; Chrome MV3 rejects the whole manifest when it is present.
- Firefox 121+ supports `background.service_worker` in MV3, so the single-field form works for both browsers.

## 2026-05-12 — [#14](https://github.com/testerjp/miniGestures/pull/14) Fix overlay blanking long pages
- Gesture overlay no longer blanks the page on very long documents (e.g. 5ch threads).
- Canvas is now sized to the viewport (`window.innerWidth × innerHeight`) with `position: fixed`, so `scrollWidth × scrollHeight` can no longer exceed Chrome's max canvas area.
- Drawing/tracking coordinates switched from `pageX/Y` to `clientX/Y`, and `pointer-events: none` was added so the overlay never intercepts clicks.

## 2026-05-12 — [#13](https://github.com/testerjp/miniGestures/pull/13) Document PR/commit language rule
- `CLAUDE.md`: PR titles, descriptions, commit messages, and review comments must be written in English even if the conversation is in Japanese.

## 2026-05-12 — [#12](https://github.com/testerjp/miniGestures/pull/12) Fix middle-click link open
- Middle-click on a link now opens it in a new tab when the gesture button is set to "middle".
- The `auxclick` handler now only suppresses the browser default when a gesture was actually drawn (`moved === true`); simple middle-clicks pass through to the browser.

## 2026-05-11 — [#11](https://github.com/testerjp/miniGestures/pull/11) Add README
- Added `README.md` documenting fork status, Chrome/Firefox install steps, a summary of the Opus 4.7-performed security review, GPL v3 licensing, and credit to the original author.

## 2026-05-11 — [#10](https://github.com/testerjp/miniGestures/pull/10) Add Firefox support
- `manifest.json`: added `browser_specific_settings.gecko` (id `minigestures@local`, `strict_min_version` 121.0).
- No JavaScript changes required — `chrome.*` works as a compatibility alias in Firefox, and `background.js` has no DOM/`window` dependency so it runs in either context.

## 2026-05-11 — [#9](https://github.com/testerjp/miniGestures/pull/9) Add security review
- Added `SECURITY_REVIEW.md` verifying that the extension does not transmit browsing history, URLs, keystrokes, or other personal data to external servers.
- Includes scope, methodology, per-area findings, and optional cleanup suggestions.

## 2026-05-11 — [#8](https://github.com/testerjp/miniGestures/pull/8) Add pastel color options
- Added six pastel trail colors: pink (`#FFB6C1`), blue (`#AEC6CF`), green (`#B5EAD7`), yellow (`#FDFD96`), purple (`#C3B1E1`), and orange (`#FFB347`).

## 2026-05-11 — [#7](https://github.com/testerjp/miniGestures/pull/7) Add gesture opacity slider
- Added a Gesture Opacity slider (5%–100% in 5% steps) on the options page.
- Applies `globalAlpha` to the trail stroke. Default 100% (fully opaque).

## 2026-05-11 — [#6](https://github.com/testerjp/miniGestures/pull/6) Widen gesture width slider
- Replaced the 1–5 Gesture Width dropdown with a 1–20 slider and live value display.

## 2026-05-11 — [#5](https://github.com/testerjp/miniGestures/pull/5) Robust gesture trail color
- Normalized color values through a new `toCssColor()` helper that handles hex codes with/without `#`, CSS color names, and missing storage values.
- Guarded `myColor` against being overwritten with `undefined` when storage is empty.
- Supersedes the earlier `049b461` direct fix.

## 2026-05-11 — `049b461` (direct commit to master)
- Fix gesture trail color always rendering as black; hex color codes were missing the `#` prefix when passed to canvas `strokeStyle`.
- Later replaced by the more general normalization in [#5](https://github.com/testerjp/miniGestures/pull/5).

## 2026-05-11 — [#4](https://github.com/testerjp/miniGestures/pull/4) Add Git workflow policy
- `CLAUDE.md`: always create a new branch before starting work; never commit directly to `master`; open a PR when work is complete.

## 2026-05-11 — [#3](https://github.com/testerjp/miniGestures/pull/3) Add middle mouse button support
- Added middle mouse button as a configurable gesture trigger (default: right button).
- Middle button prevents browser auto-scroll and middle-click link-open behavior while a gesture is in progress.

## 2026-05-11 — [#2](https://github.com/testerjp/miniGestures/pull/2) Add changelog
- Added `CHANGELOG.md` and the policy to update it on every change.

## 2026-05-11 — [#1](https://github.com/testerjp/miniGestures/pull/1) Migrate to Manifest V3
- Replaced `background.html` / the persistent background page with a service worker (`background.js`).
- Replaced `chrome.extension` APIs with `chrome.tabs` and `chrome.runtime`; replaced `localStorage` with `chrome.storage.local` for settings.
- Updated `manifest.json` to `"manifest_version": 3`, and message passing to use async responses with `return true`.

## Pre-PR history

- 2014-03-19 — Added "open link in new tab" gesture.
- 2014-03-15 — Added rocker gestures (later removed in [#20](https://github.com/testerjp/miniGestures/pull/20)).
- 2014-03-14 — Added "reopen last closed tab" functionality.
- 2013-11-17 — Fixed canvas overlay rendering.
- 2013-03-04 — General stability improvements and code cleanup.
- 2013-03-02 — Improved options page behavior; removed unnecessary files.
- 2013-03-01 — Added settings persistence and the options page (`options.html` / `options.js`).
- 2013-02-28 — Added MIT License and "reload page" gesture; smoother gesture trail drawing.
- 2013-02-27 — Initial working implementation: gesture recognition (`Math.atan2`), canvas overlay, back / forward / new tab / close tab, context menu suppression.
