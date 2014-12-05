var BottomToolbar = require("./toolbars/BottomToolbar");
var Toolbar = require("./toolbars/Toolbar");

var KeyboardShortcut = (function(my) {
    //maps keycode to character, id of popover for given function and function
    var shortcuts = {
        67: {
            character: "C",
            id: "toggleChatPopover",
            function: BottomToolbar.toggleChat
        },
        70: {
            character: "F",
            id: "filmstripPopover",
            function: BottomToolbar.toggleFilmStrip
        },
        77: {
            character: "M",
            id: "mutePopover",
            function: Toolbar.toggleAudio
        },
        84: {
            character: "T",
            function: function() {
                if(!require("../RTC/RTCService").localAudio.isMuted()) {
                    Toolbar.toggleAudio();
                }
            }
        },
        86: {
            character: "V",
            id: "toggleVideoPopover",
            function: Toolbar.toggleVideo
        }
    };

    window.onkeyup = function(e) {
        var keycode = e.which;
        if(!($(":focus").is("input[type=text]") || $(":focus").is("input[type=password]") || $(":focus").is("textarea"))) {
            if (typeof shortcuts[keycode] === "object") {
                shortcuts[keycode].function();
            } else if (keycode >= "0".charCodeAt(0) && keycode <= "9".charCodeAt(0)) {
                var remoteVideos = $(".videocontainer:not(#mixedstream)"),
                    videoWanted = keycode - "0".charCodeAt(0) + 1;
                if (remoteVideos.length > videoWanted) {
                    remoteVideos[videoWanted].click();
                }
            }
          //esc while the smileys are visible hides them
        } else if (keycode === 27 && $('#smileysContainer').is(':visible')) {
            Chat.toggleSmileys();
        }
    };

    window.onkeydown = function(e) {
        if(!($(":focus").is("input[type=text]") || $(":focus").is("input[type=password]") || $(":focus").is("textarea"))) {
            if(e.which === "T".charCodeAt(0)) {
                if(require("../RTC/RTCService").localAudio.isMuted()) {
                    Toolbar.toggleAudio();
                }
            }
        }
    };
    
    /**
     *  
     * @param id indicates the popover associated with the shortcut
     * @returns {string} the keyboard shortcut used for the id given
     */
    my.getShortcut = function(id) {
        for(var keycode in shortcuts) {
            if(shortcuts.hasOwnProperty(keycode)) {
                if (shortcuts[keycode].id === id) {
                    return " (" + shortcuts[keycode].character + ")";
                }
            }
        }
        return "";
    };

    my.init = function () {
        $('body').popover({ selector: '[data-toggle=popover]',
            trigger: 'click hover',
            content: function() {
                return this.getAttribute("content") +
                    KeyboardShortcut.getShortcut(this.getAttribute("shortcut"));
            }
        });
    }
    return my;
}(KeyboardShortcut || {}));

module.exports = KeyboardShortcut;
