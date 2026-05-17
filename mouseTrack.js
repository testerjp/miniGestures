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

var rmousedown=false, moved=false
var trail=false, gestureButton="right"
// event.which codes for each selectable trigger button.
var BUTTON_WHICH = {left:1, middle:2, right:3}
var mx,my,nx,ny,lx,ly,phi
var move="", omove=""
var pi =3.14159
// Right-button mode on Linux: contextmenu fires on mousedown (before we know
// whether this press is a gesture), so the first right-press is suppressed and
// a plain right-click arms this flag to let the *next* right-click show the
// native menu.
var menuArmed=false
var canvas, myGests, ginv
var link, ls, myColor="AEC6CF", myWidth=7, myOpacity=75
var loaded=false
var link=null

function invertHash(hash)
{
    inv = {}
    for(key in hash)
        inv[hash[key]] = key
    return inv
}

function toCssColor(c)
{
    if(typeof c !== 'string' || c.length === 0) return 'red'
    if(c.charAt(0) === '#') return c
    if(/^[0-9a-fA-F]{6}$/.test(c)) return '#' + c
    if(/^[0-9a-fA-F]{3}$/.test(c)) return '#' + c
    return c
}

// chrome.runtime becomes invalidated when the extension is reloaded, updated,
// or disabled while content scripts are still alive in open tabs. Calls to
// chrome.runtime.sendMessage then throw "Extension context invalidated."
// Guard every send so the gesture handlers stay quiet in that state.
function safeSendMessage(message, callback)
{
    try {
        if(!chrome.runtime || !chrome.runtime.id) return
        chrome.runtime.sendMessage(message, callback)
    } catch(e) {
    }
}

function createCanvas()
{
    // Size the canvas to the viewport (not the full document) and pin it with
    // position:fixed. On very long pages, scrollWidth*scrollHeight can exceed
    // Chrome's max canvas area, causing the bitmap to fail to allocate and the
    // overlay to render as an opaque white block that blanks the page.
    var vw = window.innerWidth
    var vh = window.innerHeight
    canvas = document.createElement('canvas');
    canvas.id = "gestCanvas"
    canvas.width = vw
    canvas.height = vh
    canvas.style.width = vw + "px"
    canvas.style.height = vh + "px"
    canvas.style.left="0px";
    canvas.style.top="0px";
    canvas.style.overflow = 'visible';
    canvas.style.position = 'fixed';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex="10000"
}
function draw(x,y){
    var ctx = document.getElementById('gestCanvas').getContext('2d');
    ctx.beginPath();
    ctx.strokeStyle = toCssColor(myColor)
    ctx.lineWidth = myWidth
    ctx.globalAlpha = Math.max(0, Math.min(100, Number(myOpacity) || 100)) / 100
    ctx.moveTo(lx,ly);
    ctx.lineTo(x,y);
    ctx.stroke()
    lx=x
    ly=y
}

// Reset all in-progress gesture state and remove the trail overlay. Called when
// a gesture is interrupted before its mouseup arrives — e.g. on Linux the
// native context menu opens on mousedown and swallows the matching mouseup,
// which would otherwise leave rmousedown stuck true and keep drawing the trail.
function cancelGesture()
{
    rmousedown = false
    moved = false
    move = ""
    omove = ""
    var cvs = document.getElementById('gestCanvas')
    if(cvs && cvs.parentNode)
        cvs.parentNode.removeChild(cvs)
}

document.onmousedown = function(event){
    var gestureWhich = BUTTON_WHICH[gestureButton] || 3;

    if(event.which != gestureWhich) return;

    rmousedown = true
    if(gestureButton === "middle"){
        // Chrome on Linux normally blurs the focused editable when a middle-click
        // lands outside it; that blur is what stops the X11 primary-selection paste
        // on mouseup. The preventDefault() below would otherwise suppress that blur
        // and leave the focused form to receive the paste, so reproduce it here.
        var ae = document.activeElement
        var aeEditable = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)
        if(aeEditable && ae !== event.target && !(ae.contains && ae.contains(event.target))){
            ae.blur()
        }
        event.preventDefault()
    }

    if(! loaded){
        loadOptions()
        loaded=true
    }
    my = event.clientX;
    mx = event.clientY;
    lx = my
    ly = mx
    move = ""
    omove=""
    moved=false
    // Walk up to the nearest ancestor <a href="…"> instead of only checking
    // event.target and its direct parent. The old two-step check threw when
    // event.target was <html> (parentElement === null) and also missed anchors
    // whose click target was a deeply-nested child (e.g. <a><span><svg></svg></span></a>).
    var t = event.target
    var anchor = (t && t.closest) ? t.closest('a[href]') : null
    link = anchor ? anchor.href : null
};

document.onmousemove = function(event)
{
    //track the mouse if we are holding the right button
    if(rmousedown)
    {
        ny = event.clientX;
        nx = event.clientY;
        var r = Math.sqrt(Math.pow(nx-mx,2)+Math.pow(ny-my,2))
        if(r > 16)
        {
            phi = Math.atan2(ny-my,nx-mx)
            if(phi < 0) phi += 2.*pi
            if(phi >= pi/4. && phi < 3.*pi/4.)
                var tmove="R"
            else if(phi >= 3.*pi/4. && phi < 5.*pi/4.)
                var tmove="U"
            else if(phi >= 5.*pi/4. && phi < 7.*pi/4.)
                var tmove="L"
            else if(phi >= 7.*pi/4. || phi < pi/4.)
                var tmove="D"
            if(tmove != omove)
            {
                move += tmove
                omove = tmove
            }
            if(moved == false)
            {
                // console.log('making canvas')
                createCanvas()
                document.body.appendChild(canvas);
            }
            moved=true
            console.log('indraw'+trail)

            if(trail){
                console.log('draw')
                draw(ny,nx)
            }

            mx = nx
            my = ny
        }
    }
};


document.onmouseup = function(event)
{
    var gestureWhich = BUTTON_WHICH[gestureButton] || 3;

    //gesture button release
    if(event.which == gestureWhich){
        if(gestureButton === "middle" && moved){
            // Cancel Chrome's X11 primary-selection paste on mouseup when a gesture
            // was drawn. Plain middle-clicks (moved===false) fall through so Chrome's
            // default paste still fires inside editables.
            event.preventDefault()
        }
        // rmousedown is already false here if the gesture was cancelled —
        // e.g. the context menu opened and consumed this press's mouseup.
        var gestureWasLive = rmousedown
        rmousedown=false
        if(moved){
            cvs = document.getElementById('gestCanvas')
            if(cvs)
            {
                document.body.removeChild(canvas)
                cvs.width = cvs.width;
            }
            exeFunc()
        }
        else if(gestureButton === "right" && gestureWasLive){
            // Plain right-click whose menu we suppressed: arm the next
            // contextmenu so a second right-click brings the menu up (Linux).
            menuArmed = true
        }
    }
};

function exeFunc()
{
    // console.log('exeFunc '+move)
    if(ginv[move])
    {
        action = ginv[move]
        if(action == "back")
        {
            window.history.back()
        }
        else if(action == "forward")
        {
            window.history.forward()
        }
        else if(action == "newtab")
        {
            if(link == null){
                safeSendMessage({msg: "newtab"},
                    function(response)
                    {
                        if(response != null)
                            console.log(response.resp);
                        else
                        {
                            console.log('problem executing open tab')
                            if(chrome.runtime && chrome.runtime.lastError)
                                console.log(chrome.runtime.lastError.message)
                        }
                    });
            }
            else{
                window.open(link)
            }
        }
        else if(action == "closetab"){
            safeSendMessage({msg: "closetab"});
        }
        else if(action == "lasttab"){
            safeSendMessage({msg: "lasttab"});
        }
        else if(action == "reloadall"){
            safeSendMessage({msg: "reloadall"});
        }

        else if(action == "closeall"){
            safeSendMessage({msg: "closeall"});
        }

        else if(action == "nexttab") {
            safeSendMessage({msg: "nexttab"});
        }

        else if(action == "prevtab"){
            safeSendMessage({msg: "prevtab"});
        }

        else if(action == "closeback"){
            safeSendMessage({msg: "closeback"});
        }


        else if(action == "scrolltop") 
            window.scrollTo(0,0)

        else if(action == "scrollbottom") 
            window.scrollTo(0,document.body.scrollHeight)

        else if(action == "reload")
            window.location.reload()

        else if(action == "stop")
            window.stop()

    }
}


document.oncontextmenu = function()
{
    if(gestureButton !== "right") return true;

    // Windows fires contextmenu after mouseup, so rmousedown is already false
    // and `moved` reliably tells a gesture from a plain click: show the native
    // menu only when no gesture was drawn. (menuArmed is unused on Windows.)
    if(!rmousedown)
        return !moved;

    // Linux fires contextmenu on mousedown, before we know whether this press
    // will become a gesture, so we cannot decide from `moved`. Suppress this
    // press; a plain right-click arms menuArmed on mouseup so the *next*
    // right-click brings the menu up.
    if(menuArmed){
        menuArmed = false
        // The native menu is about to open and will swallow this press's
        // mouseup; drop the gesture state now so the trail can't get stuck.
        cancelGesture()
        return true
    }
    return false
};

document.addEventListener('auxclick', function(event){
    if(event.which == 2 && gestureButton === "middle" && moved){
        event.preventDefault()
    }
}, true);

// Left-button gesture mode: a left-drag is a gesture, so while the left
// trigger button is held the browser's text selection and native image/link
// dragging are suppressed — otherwise selection extends under the trail and a
// drag on an image/link hijacks the move events so the gesture never tracks.
// A plain left-click (press and release with no drag) fires neither event, so
// ordinary clicking is unaffected. Gated on "left" so right/middle are unchanged.
document.addEventListener('selectstart', function(event){
    if(rmousedown && gestureButton === "left")
        event.preventDefault()
}, true);

document.addEventListener('dragstart', function(event){
    if(rmousedown && gestureButton === "left")
        event.preventDefault()
}, true);

document.addEventListener('click', function(event){
    // A left-button gesture ends with a mouseup the browser pairs into a click;
    // swallow it (capture phase) so the gesture can't also activate the link or
    // button it started on. `moved` stays true from the gesture's mouseup until
    // the next mousedown clears it, so a plain click (moved===false) is never
    // affected.
    if(gestureButton === "left" && moved){
        event.preventDefault()
        event.stopPropagation()
    }
}, true);

function loadOptions(name)
{
    safeSendMessage({msg: "colorCode"},
        function(response) {
            if(response && response.resp){
                myColor = response.resp
            }
        });
    safeSendMessage({msg: "width"},
        function(response) {
            if(response){
                myWidth = response.resp
            }
        });
    safeSendMessage({msg: "opacity"},
        function(response) {
            if(response && response.resp){
                myOpacity = response.resp
            }
        });
    safeSendMessage({msg: "gests"},
        function(response)
        {
            if(response)
                myGests = response.resp
            ginv = invertHash(myGests)
        });

    safeSendMessage({msg: "trail"},
        function(response)
        {
            trail = (response && response.resp === true);
        });

    safeSendMessage({msg: "gestureButton"},
        function(response)
        {
            if(response && response.resp)
                gestureButton = response.resp;
        });
}

document.addEventListener('DOMContentLoaded', loadOptions);
