# Changelog

All notable changes to miniGestures will be documented in this file.

## [Unreleased]

### Added
- `README.md`: documents fork status, Chrome/Firefox install steps, an Opus 4.7-performed security review summary, GPL v3 license, and credit to the original author.
- Firefox compatibility: added `browser_specific_settings.gecko` to `manifest.json` (id `minigestures@local`, `strict_min_version` 121.0) and added `background.scripts` alongside `background.service_worker` (Firefox uses `scripts` for its event-page background since `service_worker` is gated/disabled by default in many releases; Chrome uses `service_worker` and ignores `scripts`). No JavaScript changes required — the `chrome.*` namespace works as a compatibility alias in Firefox, and `background.js` has no DOM/`window` dependency so it runs in either context.
- `SECURITY_REVIEW.md`: documents a source-level review verifying that the extension does not transmit browsing history, URLs, keystrokes, or other personal data to external servers. Includes scope, methodology, per-area findings, and optional cleanup suggestions.
- Pastel color options for the gesture trail: pastel pink (`#FFB6C1`), pastel blue (`#AEC6CF`), pastel green (`#B5EAD7`), pastel yellow (`#FDFD96`), pastel purple (`#C3B1E1`), and pastel orange (`#FFB347`).
- Gesture Opacity setting: slider (5%–100% in 5% steps) on the options page that applies `globalAlpha` to the trail stroke. Default 100% (fully opaque).

### Changed
- Gesture Width setting is now a slider (range 1–20) with a live value display, replacing the 1–5 dropdown.

### Fixed
- Middle-click on a link no longer fails to open the link in a new tab when the gesture button is set to "middle". The `auxclick` handler now only suppresses the browser default when a gesture was actually drawn (`moved === true`), so simple middle-clicks pass through to the browser.
- Gesture trail color robustness: normalize color values through a `toCssColor()` helper that handles hex codes with/without `#`, CSS color names, and missing storage values. Guards `myColor` against being overwritten with `undefined` when storage is empty.

### Fixed
- Gesture trail color always rendered as black; hex color codes were missing the `#` prefix when passed to canvas `strokeStyle`

### Added
- Middle mouse button support for gesture activation; configurable in options (default: right button)
  - Middle button prevents browser auto-scroll and middle-click link-open behavior during gestures
  - Rocker gestures (left+right click) remain right-button based regardless of this setting

## [2026-05-11]

### Changed
- Migrated extension from Manifest V2 to Manifest V3
  - Replaced `background.html` / persistent background page with a service worker (`background.js`)
  - Replaced `chrome.extension` APIs with `chrome.tabs` and `chrome.runtime`
  - Replaced `localStorage` with `chrome.storage.local` for settings persistence
  - Updated `manifest.json` to `"manifest_version": 3`
  - Updated message passing to use async responses with `return true`
  - Updated `options.js` to read/write settings via `chrome.storage.local`

## [2014-03-19]

### Added
- Open link in new tab gesture

## [2014-03-15]

### Added
- Rocker gestures (simultaneous left+right mouse button combinations)

## [2014-03-14]

### Added
- Reopen last closed tab functionality

## [2013-11-17]

### Fixed
- Canvas overlay rendering issue

## [2013-03-04]

### Changed
- General stability improvements and code cleanup

## [2013-03-02]

### Changed
- Improved options page behavior
- Removed unnecessary files

## [2013-03-01]

### Added
- Configuration/settings persistence
- Options page (`options.html` / `options.js`) for customizing trail color, width, and gesture mappings

## [2013-02-28]

### Added
- MIT License (`LICENSE.txt`)
- Reload page gesture

### Changed
- Smoother gesture trail drawing

## [2013-02-27]

### Added
- Initial working implementation
  - Mouse gesture recognition via `Math.atan2` direction bucketing
  - Canvas overlay for gesture trail visualization
  - Back / Forward / New tab / Close tab gestures
  - Context menu suppression during gesture tracking
  - Chrome extension manifest and background script
