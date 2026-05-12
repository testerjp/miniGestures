# Security Review

- Target: miniGestures (Manifest V3 Chrome extension, with Firefox MV3 manifest entry)
- Date: 2026-05-12
- Commit reviewed: `558e664` (branch: `reorganize-changelog-by-pr`)
- Previous review: `a6208f3` (2026-05-11); this revision re-verifies all findings against HEAD and covers the changes merged since then.
- Focus: Spyware-like behavior — in particular, whether browsing history, URLs, or user input are silently transmitted to external servers.

> **Reviewer disclaimer.** This audit was performed by Claude (Opus 4.7) via static source reading and `grep` only. It is **not** a complete or formal security audit — no dynamic analysis, fuzzing, runtime instrumentation, or human expert review was carried out. Findings should be treated as a best-effort code skim and independently re-verified before being relied on.

## Conclusion

**No code that exfiltrates browsing history, URLs, keystrokes, or other personal data to any external server was found.** The indicators commonly seen in compromised gesture extensions (tracking SDKs, outbound POSTs, obfuscated beacons) are absent. All changes merged since the previous review are security-neutral. The current implementation can be considered safe, within the scope of this static review.

## Verification Steps and Findings

### 1. Network APIs — none in use

The extension scripts were grepped with:

```
fetch\(|XMLHttpRequest|WebSocket|sendBeacon|navigator\.|EventSource|importScripts
```

No matches in `background.js`, `mouseTrack.js`, `options.js`, or `coin.js`. The only `http(s)://` literals are GNU GPL license URLs inside comments and the two PayPal URLs in `options.html` (see §6).

### 2. manifest.json — minimal permissions

```json
"manifest_version": 3,
"permissions": ["tabs", "storage"]
```

- `tabs`: required for tab actions (open / close / switch)
- `storage`: required to persist settings and gesture mappings
- No `host_permissions` declared
- No `webRequest`, `cookies`, `history`, or `webNavigation` permissions — i.e. no permissions that could be repurposed to exfiltrate data or read browsing history
- `content_scripts.matches: ["<all_urls>"]` only controls where the script is injected; it grants no outbound network capability
- The newly added `browser_specific_settings.gecko` block (Firefox MV3 support) is metadata only — it declares the extension's Gecko ID and `strict_min_version`, and grants no additional capabilities

### 3. URL handling — local storage only

`background.js:30-35` stores `tab.url` on tab updates, but the destination is `chrome.storage.local` (browser-local storage). No external transmission occurs. This exists to support the "reopen last closed tab" (`lasttab`) feature: `chrome.tabs.onRemoved` (`background.js:19-27`) saves the URL of the closed tab to `lasturl` and removes the per-tab entry.

Note: `x[kk] += tab.url` evaluates to `"undefined" + URL`, and the prefix is later stripped with `.slice(9, ...)`. This is a bug-looking pattern, but it is not a data-leak risk.

### 4. Dynamic code execution — none

No usage of `eval(`, `new Function(`, string-form `setTimeout` / `setInterval`, or `importScripts`. There is no path that could execute an obfuscated payload fetched at runtime.

### 5. Bundled jQuery 1.9.1 (`jquery.js`)

- Verified to be the upstream original (jQuery Foundation, MIT)
- The previous review noted a single call at `mouseTrack.js:199` (`$('#target').rmousedown(which=3)`). That call has since been removed (commit `5e2ac0c`, PR #16), so **jQuery is now entirely unreferenced from extension code**
- `ajax`, `getJSON`, `load`, etc. are never invoked
- The 2013 build still has known XSS issues (e.g. in `$.html()`), but they are not exercised
- Removal of the unused `jquery.js` file is recommended for dependency hygiene, not because of an active exploit path

### 6. External resources in `options.html`

| Location | Content | Assessment |
| --- | --- | --- |
| `options.html:104` `<form action="https://www.paypal.com/cgi-bin/webscr">` | PayPal donation form | Only submitted when the user explicitly clicks the donate button |
| `options.html:119` `<img src="https://www.paypalobjects.com/en_US/i/scr/pixel.gif">` | Standard PayPal 1×1 image | Fires a GET to PayPal **only when the options page is opened**. Not an ad/tracking pixel, but it is an external request |
| `coin.js` (loaded via `<script src="coin.js">`) | Injects static CSS for Bitcoin donate buttons into a newly-created `<style>` via `innerHTML` | No `.bitcoinate` element exists on the page; effectively dead code. The `innerHTML` payload is a static literal string with no user-controlled data. No outbound network activity |

### 7. Content script (`mouseTrack.js`) behavior

- Reads mouse coordinates (`event.clientX/Y`), converts movement vectors to U/D/L/R via `Math.atan2`, and forwards recognized gestures to the background script via `chrome.runtime.sendMessage`
- `chrome.runtime` is an internal extension channel — it does not perform any network transmission
- `safeSendMessage` (`mouseTrack.js:50-57`) is a defensive try/catch wrapper that guards against the "Extension context invalidated" exception when the extension is reloaded while content scripts are still alive in tabs. Failure mode: messages are silently dropped. No data leakage
- The middle-click branch (`mouseTrack.js:99-110`, `185-211`, `301-305`) only calls `event.preventDefault()` and, in one narrow case, `ae.blur()` on the focused editable to suppress an X11 primary-selection paste. No form values are read, no data is captured or transmitted
- `window.open(link)` at `mouseTrack.js:244` opens an `href` read from the element the user gestured on. The URL comes from the page DOM the user is already viewing and the navigation is user-initiated, so it is not a data-exfiltration path
- No keylogging, no reading of form values, no access to `document.cookie` / `localStorage` / `sessionStorage`

### 8. Custom hex color input (PR #19) — input validation

The options page now accepts an arbitrary hex code via a text input.

- `options.js:51-60` `normalizeHex` strips an optional leading `#`, expands 3-digit shorthand, and accepts only values matching `/^[0-9a-fA-F]{6}$/`; everything else returns `null` and `save_options` refuses to persist
- `options.js:67` writes `preview.style.backgroundColor = "#" + hex` only after that validation, so the value can never contain `;`, `url(…)`, or other CSS injection vectors
- `mouseTrack.js:37-44` `toCssColor` applies the same regex constraint before the value reaches `ctx.strokeStyle`

The `innerHTML` writes in `options.js:98, 99, 130, 131` use only static literal strings (`"Invalid color code: use #rgb or #rrggbb"`, `"Configuration Saved"`, `""`) — no user-controlled data flows into them, so they do not introduce XSS.

### 9. Changes reviewed since `a6208f3`

The following PRs landed between the previous review commit and HEAD. Each has been re-read; all are security-neutral:

| PR | Subject | Notes |
| --- | --- | --- |
| #10 | Firefox MV3 support | Manifest-only change; adds `browser_specific_settings.gecko`. No new capability. |
| #14 | Canvas blank-on-long-pages fix | Sizes the overlay canvas to the viewport. Local DOM only. |
| #15 | Manifest service_worker fix | Replaces the legacy `background.scripts` array with `background.service_worker`. No new permission. |
| #16 | Stray jQuery call removed | Eliminates the only remaining jQuery invocation; reduces residual XSS surface from the bundled library. |
| #17 | Middle-click X11 primary-paste fix | Adds `event.preventDefault()` and a targeted `blur()`. Does not read or transmit data. |
| #18 | `safeSendMessage` guard | Wraps `chrome.runtime.sendMessage` in a try/catch and a context-validity check. Defensive only. |
| #19 | Custom hex color input | Both write sites are protected by the `normalizeHex` / `toCssColor` regex (see §8). |
| #20 | Remove rocker gestures | Pure deletion; removes code rather than adding capability. |

## Optional Cleanup Suggestions

Not strictly required for security, but recommended for hygiene:

1. Remove the PayPal 1×1 pixel `<img>` at `options.html:119` — eliminates the only external request triggered by opening the options page
2. Delete the unused `jquery.js` and drop it from `content_scripts.js` in `manifest.json` — the last in-code call site was removed in PR #16, so the file is now dead weight that still carries 2013-era XSS issues in unreached sinks
3. Stop loading the unused `coin.js` from `options.html:23` — dead-code removal

## Overall Assessment

- No spyware-like behavior detected (no silent transmission of user data, no tracking, no obfuscated outbound traffic)
- Requested permissions are minimal relative to the feature set
- The only external network activity that can occur is the PayPal-hosted image load when a user voluntarily opens the options page, and it is not an identifier-bearing beacon

Within the scope of this static review, the extension is judged safe to use as-is. As noted in the disclaimer at the top, this is not a substitute for a formal audit.
