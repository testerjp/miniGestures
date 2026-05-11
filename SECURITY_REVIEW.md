# Security Review

- Target: miniGestures (Manifest V3 Chrome extension)
- Date: 2026-05-11
- Commit reviewed: `a6208f3` (branch: `add-pastel-colors`)
- Focus: Spyware-like behavior — in particular, whether browsing history, URLs, or user input are silently transmitted to external servers

## Conclusion

**No code that exfiltrates browsing history, URLs, keystrokes, or other personal data to any external server was found.** None of the indicators commonly seen in compromised gesture extensions (tracking SDKs, outbound POSTs, obfuscated beacons) are present. The current implementation can be considered safe.

## Verification Steps and Findings

### 1. Network APIs — none in use

The extension scripts were grepped with the following regex:

```
fetch\(|XMLHttpRequest|WebSocket|sendBeacon|navigator\.
```

No matches in `background.js`, `mouseTrack.js`, `options.js`, or `coin.js`. The only `http(s)://` strings found are GNU GPL license URLs inside comments.

### 2. manifest.json — minimal permissions

```json
"permissions": ["tabs", "storage"]
```

- `tabs`: required for tab actions (open / close / switch)
- `storage`: required to persist settings and gesture mappings
- No `host_permissions` declared
- No `webRequest`, `cookies`, `history`, or `webNavigation` permissions — i.e. no permissions that could be repurposed to exfiltrate data or read browsing history
- `content_scripts.matches: ["<all_urls>"]` only controls where the script is injected; it grants no outbound network capability

### 3. URL handling — local storage only

`background.js:30-35` stores `tab.url` on tab updates, but the destination is `chrome.storage.local` (browser-local storage). No external transmission occurs. This exists to support the "reopen last closed tab" (`lasttab`) feature: `chrome.tabs.onRemoved` (`background.js:19-27`) saves the URL of the closed tab to `lasturl` and removes the per-tab entry.

Note: `x[kk] += tab.url` evaluates to `"undefined" + URL`, and the prefix is later stripped with `.slice(9, ...)`. This is a bug-looking pattern, but it is not a data-leak risk.

### 4. Dynamic code execution — none

No usage of `eval(`, `new Function(`, or string-form `setTimeout` / `setInterval`. There is no path that could execute an obfuscated payload fetched at runtime.

### 5. Bundled jQuery 1.9.1 (`jquery.js`)

- Verified to be the upstream original (jQuery Foundation, MIT)
- The only call from extension code is `mouseTrack.js:199` `$('#target').rmousedown(which=3)`, which is effectively a no-op. `ajax`, `getJSON`, `load`, etc. are never invoked
- The 2013 build does have known XSS issues (e.g. in `$.html()`), but they are not exercised here
- Removal is recommended for dependency hygiene, not because of an active exploit path

### 6. External resources in `options.html`

| Location | Content | Assessment |
| --- | --- | --- |
| `options.html:108` `<form action="https://www.paypal.com/cgi-bin/webscr">` | PayPal donation form | Only submitted when the user explicitly clicks the donate button |
| `options.html:123` `<img src="https://www.paypalobjects.com/en_US/i/scr/pixel.gif">` | Standard PayPal 1×1 image | Fires a GET to PayPal **only when the options page is opened**. Not an ad/tracking pixel, but it is an external request |
| `coin.js` (loaded via `<script src="coin.js">`) | Injects CSS for Bitcoin donate buttons | No `.bitcoinate` element exists on the page; effectively dead code. No outbound network activity |

### 7. Content script (`mouseTrack.js`) behavior

- Reads mouse coordinates (`event.pageX/Y`), converts movement vectors to U/D/L/R via `Math.atan2`, and forwards recognized gestures to the background script via `chrome.runtime.sendMessage`
- `chrome.runtime` is an internal extension channel — it does not perform any network transmission
- No keylogging, no reading of form values, no access to `document.cookie` / `localStorage` / `sessionStorage`

## Optional Cleanup Suggestions

Not strictly required for security, but recommended for hygiene:

1. Remove the PayPal 1×1 pixel `<img>` at `options.html:123` — eliminates the only external request triggered by opening the options page
2. Remove the unused `jquery.js` and the `$('#target').rmousedown(...)` call at `mouseTrack.js:199` — drops a dated library with known (currently unreachable) XSS issues
3. Stop loading the unused `coin.js` from `options.html:23` — dead-code removal

## Overall Assessment

- No spyware-like behavior detected (no silent transmission of user data, no tracking, no obfuscated outbound traffic)
- Requested permissions are minimal relative to the feature set
- The only external network activity that can occur is the PayPal-hosted image load when a user voluntarily opens the options page, and it is not an identifier-bearing beacon

The extension is judged safe to use as-is.
