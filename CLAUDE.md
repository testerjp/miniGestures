# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

miniGestures is a Chrome browser extension (Manifest V3) that enables mouse gesture-based tab and browser navigation. Users hold the trigger button (right-click by default; middle or left are also selectable) and draw gestures to trigger actions like back/forward, new tab, close tab, etc.

## Loading the Extension

No build step required. To install locally:
1. Open `chrome://extensions/` in Chrome
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory

To package as `.crx`: use Chrome's "Pack extension" button on the extensions page.

## Architecture

Three main scripts communicate via Chrome's message passing:

- **`mouseTrack.js`** — Content script injected into every page (`document_start`, `all_frames`). Tracks the configured trigger button (right, middle, or left, via the `BUTTON_WHICH` table), draws the gesture trail on a canvas overlay (z-index 10000), detects gesture direction sequences using `Math.atan2`, and sends recognized gestures to the background script.

- **`background.js`** — Service worker that receives messages from `mouseTrack.js` and executes tab/browser actions (open tab, close tab, navigate back/forward, etc.) via the `chrome.tabs` and `chrome.runtime` APIs. Also manages configuration persistence in `chrome.storage.local` and tracks the last closed tab URL for the "reopen closed tab" feature.

- **`options.js` + `options.html`** — Settings page where users configure the trigger button, the trail color/width/opacity, and the gesture-to-action mappings. Settings are saved to `chrome.storage.local`. The page is localized via Chrome's built-in i18n (`_locales/<locale>/messages.json`).

## Key Implementation Details

- **Gesture recognition:** Movement vectors are bucketed into U/D/L/R using `Math.atan2` angle thresholds. Sequences like "L", "LU", "DR" map to actions.
- **Context menu suppression:** In right-button mode, `mouseTrack.js`'s `oncontextmenu` handler decides whether to show the native menu. Windows fires `contextmenu` after `mouseup`, so `moved` distinguishes a gesture from a plain right-click. Linux fires it on `mousedown`, so the press is suppressed and a `menuArmed` flag lets the *next* right-click bring the menu up. `cancelGesture()` resets in-progress gesture state when the menu is allowed to open (the menu swallows the gesture's `mouseup`, which would otherwise leave the trail stuck).
- **Message passing:** Uses `chrome.runtime.sendMessage` / `chrome.runtime.onMessage` (Manifest V3). Async responses (colorCode, width, opacity, gests, trail, gestureButton) require `return true` in the listener to keep the channel open.
- **Settings storage:** All settings (`colorCode`, `width`, `opacity`, `trail`, `gestureButton`, gesture mappings) are stored in `chrome.storage.local`. `SYSTEM_KEYS` in both `background.js` and `options.js` identifies non-gesture keys so gesture mappings can be extracted from the flat storage object. Values are stored as their native types (booleans as `true`/`false`, not strings).
- **Localization:** The options page is translated through Chrome's i18n. `options.js` swaps the text of every `[data-i18n]` element on load from `_locales/<locale>/messages.json` (27 locales, with `default_locale: "en"` as the fallback). Gesture-table rows store the action's command code in a `data-cmd` attribute so saving still works once the labels are localized.

## Git Workflow

- Always create a new branch before starting any work. Never commit directly to `master`.
- Branch names should describe the change (e.g. `fix-color-rendering`, `add-middle-button-support`).
- When work is complete, create a PR targeting `master`.
- Write PR titles, descriptions, and review comments in English (not Japanese), even if the conversation with the user is in Japanese.

## Changelog

- Always update `CHANGELOG.md` when making changes, in addition to any PR description.
- One entry per PR, newest first. Use the heading format `## YYYY-MM-DD — [#PR](url) Title`. No `[Unreleased]` section — entries are dated and PR-linked from the start (the PR number can be filled in with a follow-up commit after the PR is opened).

## Code Style

- All comments must be written in English.

## Implementation Principles

- Keep the implementation simple. Prefer the smallest change that solves the problem; reuse what the platform already provides (browser-native validation messages, built-in i18n, etc.) instead of building a parallel mechanism. If a custom UI would duplicate something the browser already shows, drop the custom UI.
