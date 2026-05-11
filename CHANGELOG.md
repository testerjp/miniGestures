# Changelog

All notable changes to miniGestures will be documented in this file.

## [Unreleased]

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
