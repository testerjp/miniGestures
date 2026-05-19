/*
 *  Copyright (C) 2013  AJ Ribeiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
colorCodes={"red":"ff3300","green":"008000","blue":"00008B",
                            "yellow":"FFFF00",
                            "pastel pink":"FFB6C1","pastel blue":"AEC6CF",
                            "pastel green":"B5EAD7","pastel yellow":"FDFD96",
                            "pastel purple":"C3B1E1","pastel orange":"FFB347"}

colorNames={"ff3300":"red","008000":"green","00008B":"blue",
                            "FFFF00":"yellow",
                            "FFB6C1":"pastel pink","AEC6CF":"pastel blue",
                            "B5EAD7":"pastel green","FDFD96":"pastel yellow",
                            "C3B1E1":"pastel purple","FFB347":"pastel orange"}

defaultGests={"L":"back","R":"forward","DR":"closetab","U":"scrolltop","D":"scrollbottom"}

// Ordered list of gesture actions. `cmd` is the stable storage/message key
// used by background.js; `msg` is the i18n key for the displayed label.
// The display order matches the gesture table on the options page.
var GESTURE_ACTIONS = [
    {cmd:"back",         msg:"actionBack"},
    {cmd:"forward",      msg:"actionForward"},
    {cmd:"reload",       msg:"actionReload"},
    {cmd:"stop",         msg:"actionStop"},
    {cmd:"newtab",       msg:"actionNewtab"},
    {cmd:"closetab",     msg:"actionClosetab"},
    {cmd:"closeback",    msg:"actionCloseback"},
    {cmd:"closeall",     msg:"actionCloseall"},
    {cmd:"reloadall",    msg:"actionReloadall"},
    {cmd:"nexttab",      msg:"actionNexttab"},
    {cmd:"prevtab",      msg:"actionPrevtab"},
    {cmd:"scrolltop",    msg:"actionScrolltop"},
    {cmd:"scrollbottom", msg:"actionScrollbottom"},
    {cmd:"lasttab",      msg:"actionLasttab"},
]

var SYSTEM_KEYS = new Set(["colorCode", "width", "opacity", "trail", "lasturl", "gestureButton"]);

// Look up a localized string; fall back to the supplied English text (or the
// key itself) so the page stays usable even if a message is missing.
function msg(key, fallback)
{
    var s = chrome.i18n.getMessage(key)
    return s ? s : (fallback != null ? fallback : key)
}

// Replace the text of every [data-i18n] element in the static HTML with its
// localized string, and set the document language/direction for the locale.
function localizeHtml()
{
    var nodes = document.querySelectorAll('[data-i18n]')
    for(var i = 0; i < nodes.length; i++) {
        var text = chrome.i18n.getMessage(nodes[i].getAttribute('data-i18n'))
        if(text) nodes[i].textContent = text
    }
    var dir = chrome.i18n.getMessage('@@bidi_dir')
    if(dir) document.documentElement.setAttribute('dir', dir)
    var locale = chrome.i18n.getMessage('@@ui_locale')
    if(locale) document.documentElement.setAttribute('lang', locale.replace('_', '-'))
}

function invertHash(hash)
{
    inv = {}
    for(key in hash)
        inv[hash[key]] = key
    return inv
}

function normalizeHex(s)
{
    if(typeof s !== 'string') return null
    var t = s.trim()
    if(t.charAt(0) === '#') t = t.substring(1)
    if(/^[0-9a-fA-F]{3}$/.test(t))
        t = t.charAt(0)+t.charAt(0)+t.charAt(1)+t.charAt(1)+t.charAt(2)+t.charAt(2)
    if(/^[0-9a-fA-F]{6}$/.test(t)) return t
    return null
}

function updateColorPreview()
{
    var preview = document.getElementById("colorPreview")
    if(!preview) return
    var hex = normalizeHex(document.getElementById("colorCode").value)
    preview.style.backgroundColor = hex ? "#"+hex : "transparent"
}

function fillTableRows(gests)
{
    var div = document.getElementById("gestureTab")
    for(var i = 0; i < GESTURE_ACTIONS.length; i++)
    {
        var action = GESTURE_ACTIONS[i]
        var tr = div.insertRow(div.rows.length)
        // The command code is stored on the row so save_options() can recover
        // it without depending on the (now localized) label text.
        tr.dataset.cmd = action.cmd
        var td = document.createElement('td')
        td.appendChild(document.createTextNode(msg(action.msg)))
        tr.appendChild(td)
        td = document.createElement('td')
        var inp = document.createElement('input')
        inp.type = 'text'
        // Restrict the field to the four direction letters: a value with any
        // other character fails this pattern, so the field matches :invalid
        // and CSS keeps a red shadow on it. The character stays visible -- it
        // is just not saved (see save_options()).
        inp.pattern = '[UDLRudlr]*'
        // Show any previously stored gesture upper-cased, so an entry saved as
        // lower-case displays consistently with how it is matched at runtime.
        if(gests[action.cmd])
            inp.value = String(gests[action.cmd]).toUpperCase()
        inp.addEventListener('input', scheduleSave)
        td.align = 'center'
        tr.appendChild(td)
        td.appendChild(inp)
    }
}

// Auto-save: settings are persisted automatically a short moment after the
// last change, so there is no save button to press. The debounce coalesces
// rapid changes (slider drags, typing) into a single storage write.
var SAVE_DELAY_MS = 400;
var saveTimer = null;

function scheduleSave()
{
    if(saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function() {
        saveTimer = null;
        save_options();
    }, SAVE_DELAY_MS);
}

var statusTimer = null;

// Show a status message under the settings, then clear it after a moment.
// A successful auto-save is silent -- this is used only for the invalid-color
// warning. Passing an empty string clears the line immediately. Uses
// textContent so message-catalog strings are always rendered as plain text.
function showStatus(text)
{
    var status = document.getElementById("status");
    if(!status) return;
    if(statusTimer) clearTimeout(statusTimer);
    status.textContent = text || "";
    if(text)
        statusTimer = setTimeout(function() { status.textContent = ""; }, 1500);
}

function save_options()
{
    var width_input = document.getElementById("width");
    var opacity_input = document.getElementById("opacity");
    var gb_select = document.getElementById("gestureButton");

    var data = {
        width: width_input.value,
        opacity: opacity_input.value,
        trail: document.getElementById('trail').checked,
        gestureButton: gb_select.children[gb_select.selectedIndex].value
    };

    // The trail color is only written once it parses to a valid hex code.
    // While the field is mid-edit it is often incomplete, so the previously
    // stored color is kept rather than overwritten -- the other settings
    // still save regardless.
    var hex = normalizeHex(document.getElementById("colorCode").value);
    if(hex)
        data.colorCode = hex;

    var toRemove = [];
    var inputs = document.getElementsByTagName('input');
    for(var i = 0; i < inputs.length; i++)
    {
        var row = inputs[i].parentElement ? inputs[i].parentElement.parentElement : null;
        var cmdKey = (row && row.dataset) ? row.dataset.cmd : null;
        if(!cmdKey) continue;
        // Gesture strings are stored upper-cased so case is irrelevant: the
        // recognizer in mouseTrack.js only emits upper-case direction letters,
        // so a lower-cased entry would otherwise never match.
        if(inputs[i].value.length > 0)
        {
            // A field holding a character outside U/D/L/R fails its pattern;
            // like an invalid color it skips only its own write, keeping the
            // previously stored mapping, while the other settings still save.
            if(!inputs[i].validity.patternMismatch)
                data[cmdKey] = inputs[i].value.toUpperCase();
        }
        else
            toRemove.push(cmdKey);
    }

    chrome.storage.local.set(data, function() {
        // A successful save is silent; only an unusable color is surfaced.
        showStatus(hex ? "" : msg("statusInvalidColor"));
    });

    if(toRemove.length > 0)
        chrome.storage.local.remove(toRemove);
}

// Attach the debounced auto-save to every settings control. <select> and
// checkbox inputs settle on 'change'; text and range inputs stream updates
// on 'input'. Listening for both on every control is harmless -- the debounce
// coalesces the events into one save. Gesture-row inputs are wired separately
// in fillTableRows() as each row is created.
function wireAutoSave()
{
    var ids = ["gestureButton", "trail", "color", "colorCode", "width", "opacity"];
    for(var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if(!el) continue;
        el.addEventListener('change', scheduleSave);
        el.addEventListener('input', scheduleSave);
    }
}

function lookupColorName(hex)
{
    if(!hex) return null;
    return colorNames[hex] || colorNames[hex.toLowerCase()] || colorNames[hex.toUpperCase()] || null;
}

function setSelectValue(select, value)
{
    for(var i = 0; i < select.options.length; i++) {
        if(select.options[i].value == value) {
            select.selectedIndex = i;
            return true;
        }
    }
    return false;
}

function wireColorControls()
{
    var select = document.getElementById("color");
    var code_input = document.getElementById("colorCode");
    if(!select || !code_input) return;

    select.addEventListener('change', function() {
        var v = select.value;
        if(v !== "custom" && colorCodes[v]) {
            code_input.value = "#" + colorCodes[v];
            updateColorPreview();
        }
    });

    code_input.addEventListener('input', function() {
        var hex = normalizeHex(code_input.value);
        var name = lookupColorName(hex);
        setSelectValue(select, name || "custom");
        updateColorPreview();
    });
}

// Enable or disable the trail-appearance subsection (color, width, opacity) to
// match the "Show Gesture Trails" checkbox. With trails off these controls have
// no visible effect, so they are disabled and their rows dimmed via CSS.
function updateTrailControls()
{
    var enabled = document.getElementById("trail").checked;
    var ids = ["color", "colorCode", "width", "opacity"];
    for(var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if(el) el.disabled = !enabled;
    }
    var rows = document.querySelectorAll("tr.trailSub");
    for(var j = 0; j < rows.length; j++)
        rows[j].classList.toggle("disabled", !enabled);
}

function loadInfo()
{
    localizeHtml();
    wireColorControls();
    wireAutoSave();

    chrome.storage.local.get(null, function(items) {
        var select, value, i, child;

        var code_input = document.getElementById("colorCode");
        var storedHex = normalizeHex(items.colorCode);
        if(!storedHex) storedHex = colorCodes["pastel blue"];
        code_input.value = "#" + storedHex;
        updateColorPreview();

        select = document.getElementById("color");
        value = lookupColorName(storedHex) || "custom";
        setSelectValue(select, value);

        var width_input = document.getElementById("width");
        value = items.width;
        if(!value) value = 7;
        width_input.value = value;
        document.getElementById("widthValue").textContent = width_input.value;
        width_input.addEventListener('input', function() {
            document.getElementById("widthValue").textContent = width_input.value;
        });

        var opacity_input = document.getElementById("opacity");
        value = items.opacity;
        if(!value) value = 75;
        opacity_input.value = value;
        document.getElementById("opacityValue").textContent = opacity_input.value;
        opacity_input.addEventListener('input', function() {
            document.getElementById("opacityValue").textContent = opacity_input.value;
        });

        document.getElementById('trail').checked = (items.trail !== false);
        document.getElementById('trail').addEventListener('change', updateTrailControls);
        updateTrailControls();

        select = document.getElementById("gestureButton");
        value = items.gestureButton || "right";
        for(i = 0; i < select.children.length; i++) {
            child = select.children[i];
            if(child.value == value) {
                child.selected = true;
                break;
            }
        }

        var gests = {};
        for(var key in items) {
            if(!SYSTEM_KEYS.has(key) && !/^\d+$/.test(key))
                gests[key] = items[key];
        }
        if(Object.keys(gests).length == 0)
            gests = invertHash(defaultGests);
        fillTableRows(gests);
    });
}

document.addEventListener('DOMContentLoaded', loadInfo);
