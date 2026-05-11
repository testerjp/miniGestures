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
                            "yellow":"FFFF00"}

colorNames={"ff3300":"red","008000":"green","00008B":"blue",
                            "FFFF00":"yellow"}

defaultGests={"U":"newtab","R":"forward","L":"back","UD":"closetab"}

commandTrans={"History Back":"back","History Forward":"forward",
                            "Reload":"reload","Stop Loading":"stop",
                            "Open New Tab":"newtab","Close Current Tab":"closetab",
                            "Close Background Tabs":"closeback","Close Window":"closeall",
                            "Reload All Tabs":"reloadall",
                            "Next Tab":"nexttab","Previous Tab":"prevtab",
                            "Scroll to Top":"scrolltop", "Scroll to Bottom":"scrollbottom",
                            "Re-open Last Closed Tab":"lasttab",
                            }

var SYSTEM_KEYS = new Set(["colorCode", "width", "rocker", "trail", "lasturl", "gestureButton"]);

function invertHash(hash)
{
    inv = {}
    for(key in hash)
        inv[hash[key]] = key
    return inv
}

function fillTableRows(gests)
{
    var key,div,tr,td,inp
    div = document.getElementById("optsTab");
    for(key in commandTrans)
    {
        tr=div.insertRow(div.rows.length)
        td=document.createElement('td')
        td.appendChild(document.createTextNode(key))
        tr.appendChild(td)
        td=document.createElement('td')
        inp=document.createElement('input')
        inp.type='text'
        if(gests[commandTrans[key]])
            inp.value=gests[commandTrans[key]]
        td.align='center'
        tr.appendChild(td)
        td.appendChild(inp)
    }
}

function save_options()
{
    var select, value

    select = document.getElementById("color");
    value = select.children[select.selectedIndex].value;

    var width_select = document.getElementById("width");

    var gb_select = document.getElementById("gestureButton");

    var data = {
        colorCode: colorCodes[value],
        width: width_select.children[width_select.selectedIndex].value,
        rocker: document.getElementById('rocker').checked,
        trail: document.getElementById('trail').checked,
        gestureButton: gb_select.children[gb_select.selectedIndex].value
    };

    var toRemove = [];
    var inputs = document.getElementsByTagName('input');
    for(var i = 0; i < inputs.length; i++)
    {
        var s = inputs[i].parentElement.parentElement.children[0].textContent;
        var cmdKey = commandTrans[s];
        if(!cmdKey) continue;
        if(inputs[i].value.length > 0)
            data[cmdKey] = inputs[i].value;
        else
            toRemove.push(cmdKey);
    }

    chrome.storage.local.set(data, function() {
        var status = document.getElementById("status");
        status.innerHTML = "Configuration Saved";
        setTimeout(function() { status.innerHTML = ""; }, 750);
    });

    if(toRemove.length > 0)
        chrome.storage.local.remove(toRemove);
}

function loadInfo()
{
    chrome.storage.local.get(null, function(items) {
        var select, value, i, child;

        select = document.getElementById("color");
        value = colorNames[items.colorCode];
        if(!value) value = "red";
        for(i = 0; i < select.children.length; i++) {
            child = select.children[i];
            if(child.value == value) {
                child.selected = "true";
                break;
            }
        }

        select = document.getElementById("width");
        value = items.width;
        if(!value) value = 3;
        for(i = 0; i < select.children.length; i++) {
            child = select.children[i];
            if(child.value == value) {
                child.selected = "true";
                break;
            }
        }

        document.getElementById('rocker').checked = (items.rocker !== false);
        document.getElementById('trail').checked = (items.trail !== false);

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
document.querySelector('#save').addEventListener('click', save_options);
