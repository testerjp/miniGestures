# Changelog

All notable changes to miniGestures will be documented in this file.

## [Unreleased]

### Added
- Custom gesture trail color via hex input (`#rgb` / `#rrggbb`) on the options page, alongside the existing preset dropdown. Selecting a preset auto-fills the hex field; typing a hex value selects "custom" in the dropdown (or the matching preset). A small swatch shows a live preview. Invalid codes are rejected at save with an inline message.
- `README.md`: documents fork status, Chrome/Firefox install steps, an Opus 4.7-performed security review summary, GPL v3 license, and credit to the original author.
- Firefox compatibility: added `browser_specific_settings.gecko` to `manifest.json` (id `minigestures@local`, `strict_min_version` 121.0). No JavaScript changes required — the `chrome.*` namespace works as a compatibility alias in Firefox, and `background.js` has no DOM/`window` dependency so it runs in either context.
- `SECURITY_REVIEW.md`: documents a source-level review verifying that the extension does not transmit browsing history, URLs, keystrokes, or other personal data to external servers. Includes scope, methodology, per-area findings, and optional cleanup suggestions.
- Pastel color options for the gesture trail: pastel pink (`#FFB6C1`), pastel blue (`#AEC6CF`), pastel green (`#B5EAD7`), pastel yellow (`#FDFD96`), pastel purple (`#C3B1E1`), and pastel orange (`#FFB347`).
- Gesture Opacity setting: slider (5%–100% in 5% steps) on the options page that applies `globalAlpha` to the trail stroke. Default 100% (fully opaque).

### Changed
- Gesture Width setting is now a slider (range 1–20) with a live value display, replacing the 1–5 dropdown.

### Removed
- Rocker gestures (right-button + left-click for back, left-button + right-click for forward) and the associated "Rocker Gestures On" checkbox on the options page. Inherited from the Opera-era design where the right mouse button was treated as a gesture trigger first and a context-menu trigger second; in modern web apps that repurpose the right-click menu, occupying both buttons for navigation is intrusive. The feature also only worked when the trigger button was set to "right", leaving users on the middle-button setting with a UI checkbox that did nothing. Removed `rocker` / `rocked` state in `mouseTrack.js`, the `exeRock()` function, the rocker message handler in `background.js`, the rocker checkbox in `options.html`, and `rocker` from `SYSTEM_KEYS` in both `background.js` and `options.js`. The `rocker` storage key is no longer read or written; existing stored values become harmless dead data.

### Fixed
- "Extension context invalidated." console errors after the extension is reloaded, auto-updated, or disabled/re-enabled while pages are still open. The content script now routes every `chrome.runtime.sendMessage` through a `safeSendMessage` helper that checks `chrome.runtime.id` and swallows the synchronous throw. Gesture handlers stay quiet in invalidated tabs instead of spamming the console; reloading the affected tab restores full functionality as before.
- Middle-click no longer leaks the X11 primary selection into the focused form on Linux Chrome when the gesture button is set to "middle". Two cases: (1) plain middle-click outside a focused editable now blurs that editable (replicating Chrome's natural behavior, which our `mousedown` `preventDefault()` had been suppressing), so the subsequent mouseup paste has no target; (2) middle-button release after a drawn gesture (`moved === true`) calls `event.preventDefault()` on `mouseup` to cancel the paste. Plain middle-clicks inside an editable still paste as Chrome would by default.
- Right-click without a gesture no longer throws `TypeError: $(...).rmousedown is not a function` in the page console. Removed a stray `$('#target').rmousedown(which=3)` call in `mouseTrack.js` (`.rmousedown` is not a jQuery method — it was a typo/stub introduced with rocker gestures in 2014). The line was dead code: the preceding `--suppress` already lets the next `contextmenu` event through, so the browser's context menu still appears as expected.
- `manifest.json` no longer fails to load in Chrome with `'background.scripts' requires manifest version of 2 or lower`. Removed the `background.scripts` field that had been added for Firefox; Chrome MV3 rejects the entire manifest when this field is present (it does not silently ignore it). Firefox 121+ supports `background.service_worker` in MV3, so the single-field form works for both browsers.
- Gesture overlay no longer blanks the page on very long documents (e.g. 5ch threads). The canvas is now sized to the viewport (`window.innerWidth × innerHeight`) with `position: fixed`, so `scrollWidth × scrollHeight` can no longer exceed Chrome's max canvas area and fail to allocate (which previously rendered the overlay as an opaque white block). Drawing/tracking coordinates switched from `pageX/Y` to `clientX/Y` to match the fixed canvas, and `pointer-events: none` was added so the overlay never intercepts clicks.
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
