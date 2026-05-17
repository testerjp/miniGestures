# Security Review

- Target: miniGestures (Manifest V3 Chrome extension, with Firefox MV3 manifest entry)
- Date: 2026-05-17
- Commit reviewed: `10aac4f` (current `master` HEAD)
- Focus: Spyware-like behavior — in particular, whether browsing history, URLs, or user input are silently transmitted to external servers.

> **Reviewer disclaimer.** This audit was performed by Claude (Opus 4.7) via static source reading and `grep` only. It is **not** a complete or formal security audit — no dynamic analysis, fuzzing, runtime instrumentation, or human expert review was carried out. Findings should be treated as a best-effort code skim and independently re-verified before being relied on.

## Conclusion

**No code that exfiltrates browsing history, URLs, keystrokes, or other personal data to any external server was found.** The indicators commonly seen in compromised gesture extensions (tracking SDKs, outbound POSTs, obfuscated beacons) are absent. The current implementation can be considered safe, within the scope of this static review.

## Verification Steps and Findings

### 1. Network APIs — none in use

The extension scripts were grepped with:

```
fetch\(|XMLHttpRequest|WebSocket|sendBeacon|navigator\.|EventSource|importScripts
```

No matches in `background.js`, `mouseTrack.js`, or `options.js`. The only `http(s)://` literals are GNU GPL license URLs inside comments and the PayPal donation form `action` URL in `options.html` (see §5).

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
- The `browser_specific_settings.gecko` block (Firefox MV3 support) and the `default_locale`, `minimum_chrome_version`, and `options_page` keys are metadata or declarative settings only — they declare the Gecko ID, version floors, default locale, and options page, and grant no additional capabilities

### 3. URL handling — local storage only

`background.js:30-35` stores `tab.url` on tab updates, but the destination is `chrome.storage.local` (browser-local storage). No external transmission occurs. This exists to support the "reopen last closed tab" (`lasttab`) feature: `chrome.tabs.onRemoved` (`background.js:19-27`) saves the URL of the closed tab to `lasturl` and removes the per-tab entry.

Note: `x[kk] += tab.url` evaluates to `"undefined" + URL`, and the prefix is later stripped with `.slice(9, ...)`. This is a bug-looking pattern, but it is not a data-leak risk.

### 4. Dynamic code execution — none

No usage of `eval(`, `new Function(`, string-form `setTimeout` / `setInterval`, or `importScripts`. There is no path that could execute an obfuscated payload fetched at runtime.

### 5. External resources in `options.html`

| Location | Content | Assessment |
| --- | --- | --- |
| `options.html:131` `<form action="https://www.paypal.com/cgi-bin/webscr">` | PayPal donation form | Only submitted when the user explicitly clicks the donate button — no request is made on page load |

No other external URLs are referenced from `options.html`. The unused jQuery bundle, the dead-code `coin.js` Bitcoin tip helper, and the PayPal 1×1 image that previously fired on page load were all removed in PR #23, eliminating every passive (non-user-initiated) outbound request from the options page.

### 6. Content script (`mouseTrack.js`) behavior

- Reads mouse coordinates (`event.clientX/Y`), converts movement vectors to U/D/L/R via `Math.atan2`, and forwards recognized gestures to the background script via `chrome.runtime.sendMessage`
- `chrome.runtime` is an internal extension channel — it does not perform any network transmission
- `safeSendMessage` (`mouseTrack.js:56-63`) is a defensive try/catch wrapper that guards against the "Extension context invalidated" exception when the extension is reloaded while content scripts are still alive in tabs. Failure mode: messages are silently dropped. No data leakage
- The middle-click branch (`mouseTrack.js:120-131`, `205-210`, `333-337`) only calls `event.preventDefault()` and, in one narrow case, `ae.blur()` on the focused editable to suppress an X11 primary-selection paste. No form values are read, no data is captured or transmitted
- The left-button branch (`mouseTrack.js:345-365`) only calls `event.preventDefault()` / `event.stopPropagation()` on `selectstart`, `dragstart`, and `click` so a left-drag gesture does not select text or activate the link it started on. No data is read or transmitted
- `window.open(link)` at `mouseTrack.js:263` opens an `href` read from the element the user gestured on. The URL comes from the page DOM the user is already viewing and the navigation is user-initiated, so it is not a data-exfiltration path
- No keylogging, no reading of form values, no access to `document.cookie` / `localStorage` / `sessionStorage`

### 7. Custom hex color input — input validation

The options page accepts an arbitrary hex code via a text input.

- `options.js:84-93` `normalizeHex` strips an optional leading `#`, expands 3-digit shorthand, and accepts only values matching `/^[0-9a-fA-F]{6}$/`; everything else returns `null` and `save_options` refuses to persist
- `options.js:100` writes `preview.style.backgroundColor = "#" + hex` only after that validation, so the value can never contain `;`, `url(…)`, or other CSS injection vectors
- `mouseTrack.js:43-50` `toCssColor` applies the same regex constraint before the value reaches `ctx.strokeStyle`

The `innerHTML` writes in `options.js:134, 135, 166, 167` set either the empty string `""` or a status message resolved through `msg("statusInvalidColor")` / `msg("statusSaved")`. `msg()` (`options.js:55-59`) returns `chrome.i18n.getMessage(key)`, which reads from the extension-bundled `_locales/<locale>/messages.json` catalogs — developer-authored static resources, not user-controlled input. No user-controlled data reaches these writes, so they do not introduce XSS.

## Overall Assessment

- No spyware-like behavior detected (no silent transmission of user data, no tracking, no obfuscated outbound traffic)
- Requested permissions are minimal relative to the feature set
- No passive external network activity occurs on page load anywhere in the extension. The only outbound request the extension can make is the user-initiated PayPal donation form submission, which fires only after the user explicitly clicks the donate button

Within the scope of this static review, the extension is judged safe to use as-is. As noted in the disclaimer at the top, this is not a substitute for a formal audit.
