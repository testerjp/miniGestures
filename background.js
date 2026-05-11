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


chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    var x = tabId.toString();
    chrome.storage.local.get(x, function(items) {
        if (items[x]) {
            chrome.storage.local.set({"lasturl": items[x].slice(9, items[x].length)}, function() {});
        }
        chrome.storage.local.remove(x, function() {});
    });
});


chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    var kk = tabId.toString();
    var x = {};
    x[kk] += tab.url;
    chrome.storage.local.set(x, function() {});
});


var SYSTEM_KEYS = new Set(["colorCode", "width", "rocker", "trail", "lasturl", "gestureButton"]);

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.msg == "newtab") {
        chrome.tabs.create({});
        sendResponse({resp: "tab open"});

    } else if (request.msg == "closetab") {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.remove(tabs[0].id);
        });
        sendResponse({resp: "tab closed"});

    } else if (request.msg == "colorCode") {
        chrome.storage.local.get("colorCode", function(items) {
            sendResponse({resp: items.colorCode});
        });
        return true;

    } else if (request.msg == "width") {
        chrome.storage.local.get("width", function(items) {
            sendResponse({resp: items.width});
        });
        return true;

    } else if (request.msg == "gests") {
        chrome.storage.local.get(null, function(items) {
            var gests = {};
            for (var key in items) {
                if (!SYSTEM_KEYS.has(key) && !/^\d+$/.test(key))
                    gests[key] = items[key];
            }
            sendResponse({resp: gests});
        });
        return true;

    } else if (request.msg == "rocker") {
        chrome.storage.local.get("rocker", function(items) {
            sendResponse({resp: items.rocker});
        });
        return true;

    } else if (request.msg == "trail") {
        chrome.storage.local.get("trail", function(items) {
            sendResponse({resp: items.trail});
        });
        return true;

    } else if (request.msg == "gestureButton") {
        chrome.storage.local.get("gestureButton", function(items) {
            sendResponse({resp: items.gestureButton || "right"});
        });
        return true;

    } else if (request.msg == "lasttab") {
        chrome.storage.local.get("lasturl", function(result) {
            chrome.tabs.create({url: result.lasturl});
        });
        sendResponse({resp: "tab opened"});

    } else if (request.msg == "reloadall") {
        chrome.tabs.query({currentWindow: true}, function(tabs) {
            for (var i = 0; i < tabs.length; i++)
                chrome.tabs.update(tabs[i].id, {url: tabs[i].url});
        });
        sendResponse({resp: "tabs reloaded"});

    } else if (request.msg == "nexttab") {
        chrome.tabs.query({active: true, currentWindow: true}, function(activeTabs) {
            chrome.tabs.query({currentWindow: true}, function(tabs) {
                for (var i = 0; i < tabs.length; i++) {
                    if (tabs[i].id == activeTabs[0].id) {
                        var next = (i == tabs.length - 1) ? 0 : i + 1;
                        chrome.tabs.update(tabs[next].id, {active: true});
                        break;
                    }
                }
            });
        });
        sendResponse({resp: "tab switched"});

    } else if (request.msg == "prevtab") {
        chrome.tabs.query({active: true, currentWindow: true}, function(activeTabs) {
            chrome.tabs.query({currentWindow: true}, function(tabs) {
                for (var i = 0; i < tabs.length; i++) {
                    if (tabs[i].id == activeTabs[0].id) {
                        var prev = (i == 0) ? tabs.length - 1 : i - 1;
                        chrome.tabs.update(tabs[prev].id, {active: true});
                        break;
                    }
                }
            });
        });
        sendResponse({resp: "tab switched"});

    } else if (request.msg == "closeback") {
        chrome.tabs.query({active: true, currentWindow: true}, function(activeTabs) {
            chrome.tabs.query({currentWindow: true}, function(tabs) {
                for (var i = 0; i < tabs.length; i++) {
                    if (tabs[i].id != activeTabs[0].id)
                        chrome.tabs.remove(tabs[i].id);
                }
            });
        });
        sendResponse({resp: "background closed"});

    } else if (request.msg == "closeall") {
        chrome.tabs.query({currentWindow: true}, function(tabs) {
            for (var i = 0; i < tabs.length; i++)
                chrome.tabs.remove(tabs[i].id);
        });
        sendResponse({resp: "tabs closed"});

    } else {
        sendResponse({resp: "probs"});
    }
});
