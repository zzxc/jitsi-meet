!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.UIActivator=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var VideoLayout = require("./VideoLayout.js");

/**
 * Contact list.
 */
var ContactList = (function (my) {
    /**
     * Indicates if the chat is currently visible.
     *
     * @return <tt>true</tt> if the chat is currently visible, <tt>false</tt> -
     * otherwise
     */
    my.isVisible = function () {
        return $('#contactlist').is(":visible");
    };

    /**
     * Adds a contact for the given peerJid if such doesn't yet exist.
     *
     * @param peerJid the peerJid corresponding to the contact
     */
    my.ensureAddContact = function(peerJid) {
        var resourceJid = Strophe.getResourceFromJid(peerJid);

        var contact = $('#contactlist>ul>li[id="' + resourceJid + '"]');

        if (!contact || contact.length <= 0)
            ContactList.addContact(peerJid);
    };

    /**
     * Adds a contact for the given peer jid.
     *
     * @param peerJid the jid of the contact to add
     */
    my.addContact = function(peerJid) {
        var resourceJid = Strophe.getResourceFromJid(peerJid);

        var contactlist = $('#contactlist>ul');

        var newContact = document.createElement('li');
        newContact.id = resourceJid;

        newContact.appendChild(createAvatar());
        newContact.appendChild(createDisplayNameParagraph("Participant"));

        var clElement = contactlist.get(0);

        if (resourceJid === Strophe.getResourceFromJid(XMPPActivator.getMyJID())
            && $('#contactlist>ul .title')[0].nextSibling.nextSibling)
        {
            clElement.insertBefore(newContact,
                    $('#contactlist>ul .title')[0].nextSibling.nextSibling);
        }
        else {
            clElement.appendChild(newContact);
        }
    };

    /**
     * Removes a contact for the given peer jid.
     *
     * @param peerJid the peerJid corresponding to the contact to remove
     */
    my.removeContact = function(peerJid) {
        var resourceJid = Strophe.getResourceFromJid(peerJid);

        var contact = $('#contactlist>ul>li[id="' + resourceJid + '"]');

        if (contact && contact.length > 0) {
            var contactlist = $('#contactlist>ul');

            contactlist.get(0).removeChild(contact.get(0));
        }
    };

    /**
     * Opens / closes the contact list area.
     */
    my.toggleContactList = function () {
        var contactlist = $('#contactlist');

        var chatSize = (ContactList.isVisible()) ? [0, 0] : ContactList.getContactListSize();
        VideoLayout.resizeVideoSpace(contactlist, chatSize, ContactList.isVisible());
    };

    /**
     * Returns the size of the chat.
     */
    my.getContactListSize = function () {
        var availableHeight = window.innerHeight;
        var availableWidth = window.innerWidth;

        var chatWidth = 200;
        if (availableWidth * 0.2 < 200)
            chatWidth = availableWidth * 0.2;

        return [chatWidth, availableHeight];
    };

    /**
     * Creates the avatar element.
     *
     * @return the newly created avatar element
     */
    function createAvatar() {
        var avatar = document.createElement('i');
        avatar.className = "icon-avatar avatar";

        return avatar;
    };

    /**
     * Creates the display name paragraph.
     *
     * @param displayName the display name to set
     */
    function createDisplayNameParagraph(displayName) {
        var p = document.createElement('p');
        p.innerHTML = displayName;

        return p;
    };

    /**
     * Indicates that the display name has changed.
     */
    my.onDisplayNameChanged =
                        function (peerJid, displayName) {
        if (peerJid === 'localVideoContainer')
            peerJid = XMPPActivator.getMyJID();

        var resourceJid = Strophe.getResourceFromJid(peerJid);

        var contactName = $('#contactlist #' + resourceJid + '>p');

        if (contactName && displayName && displayName.length > 0)
            contactName.html(displayName);
    };

    return my;
}(ContactList || {}));
module.exports = ContactList
},{"./VideoLayout.js":5}],2:[function(require,module,exports){
var UIService = require("./UIService");
var VideoLayout = require("./VideoLayout.js");
var AudioLevels = require("./audiolevels/AudioLevels.js");
var Prezi = require("./prezi/Prezi.js");
var Etherpad = require("./etherpad/Etherpad.js");
var Chat = require("./chat/Chat.js");
var StreamEventTypes = require("../service/RTC/StreamEventTypes.js");
var Toolbar = require("./toolbars/toolbar");
var ToolbarToggler = require("./toolbars/toolbar_toggler");
var BottomToolbar = require("./toolbars/BottomToolbar");
var KeyboardShortcut = require("./keyboard_shortcut");
var XMPPEvents = require("../service/xmpp/XMPPEvents");

var UIActivator = function()
{
    var uiService = null;
    function UIActivatorProto()
    {

    }

    function setupPrezi()
    {
        $("#toolbar_prezi").click(function()
        {
            Prezi.openPreziDialog();
        });

        $("#reloadPresentationLink").click(function()
        {
            Prezi.reloadPresentation();
        })
    }

    function setupEtherpad()
    {
        $("#toolbar_etherpad").click(function () {
            Etherpad.toggleEtherpad(0);
        })
    }

    function setupAudioLevels() {
        StatisticsActivator.addAudioLevelListener(AudioLevels.updateAudioLevel);
    }

    function setupChat()
    {
        Chat.init();
        $("#toolbar_chat").click(function () {
            Chat.toggleChat();
        })
    }

    function setupVideoLayoutEvents()
    {

        $(document).bind('callactive.jingle', function (event, videoelem, sid) {
            if (videoelem.attr('id').indexOf('mixedmslabel') === -1) {
                // ignore mixedmslabela0 and v0
                videoelem.show();
                VideoLayout.resizeThumbnails();

                // Update the large video to the last added video only if there's no
                // current active or focused speaker.
                if (!VideoLayout.focusedVideoSrc && !VideoLayout.getDominantSpeakerResourceJid())
                    VideoLayout.updateLargeVideo(videoelem.attr('src'), 1);

                VideoLayout.showFocusIndicator();
            }
        });
    }

    function setupToolbars() {
        Toolbar.init();
        BottomToolbar.init();
    }

    UIActivatorProto.start = function () {
        $('body').popover({ selector: '[data-toggle=popover]',
            trigger: 'click hover'});
        VideoLayout.resizeLargeVideoContainer();
        $("#videospace").mousemove(function () {
            return ToolbarToggler.showToolbar();
        });
        // Set the defaults for prompt dialogs.
        jQuery.prompt.setDefaults({persistent: false});

        KeyboardShortcut.init();
        registerListeners();
        bindEvents();
        setupAudioLevels();
        setupVideoLayoutEvents();
        setupPrezi();
        setupEtherpad();
        setupToolbars();
        setupChat();

        document.title = brand.appName;

        $("#downloadlog").click(function (event) {
            dump(event.target);
        });

        if(config.enableWelcomePage && window.location.pathname == "/" &&
            (!window.localStorage.welcomePageDisabled || window.localStorage.welcomePageDisabled == "false"))
        {
            $("#videoconference_page").hide();
            var setupWelcomePage = require("./WelcomePage");
            setupWelcomePage();

            return;
        }

        $("#welcome_page").hide();

        if (!$('#settings').is(':visible')) {
            console.log('init');
            init();
        } else {
            loginInfo.onsubmit = function (e) {
                if (e.preventDefault) e.preventDefault();
                $('#settings').hide();
                init();
            };
        }

    }

    UIActivatorProto.stop = function () {
        uiService.dispose();
        uiService = null;
    }


    /**
     * Populates the log data
     */
    function populateData() {
        var data = XMPPActivator.getJingleData();
        var metadata = {};
        metadata.time = new Date();
        metadata.url = window.location.href;
        metadata.ua = navigator.userAgent;
        var logger = XMPPActivator.getLogger();
        if (logger) {
            metadata.xmpp = logger.log;
        }
        data.metadata = metadata;
        return data;
    }

    function dump(elem, filename) {
        elem = elem.parentNode;
        elem.download = filename || 'meetlog.json';
        elem.href = 'data:application/json;charset=utf-8,\n';
        var data = populateData();
        elem.href += encodeURIComponent(JSON.stringify(data, null, '  '));
        return false;
    }

    function registerListeners() {
        RTCActivator.addStreamListener(function (stream) {
            switch (stream.type)
            {
                case "audio":
                    VideoLayout.changeLocalAudio(stream.getOriginalStream());
                    break;
                case "video":
                    VideoLayout.changeLocalVideo(stream.getOriginalStream(), true);
                    break;
                case "desktop":
                    VideoLayout.changeLocalVideo(stream, !isUsingScreenStream);
                    break;
            }
        }, StreamEventTypes.EVENT_TYPE_LOCAL_CREATED);

        RTCActivator.addStreamListener(function (stream) {
            VideoLayout.onRemoteStreamAdded(stream);
        }, StreamEventTypes.EVENT_TYPE_REMOTE_CREATED);
        XMPPActivator.addListener(XMPPEvents.DISPLAY_NAME_CHANGED,
            function (peerJid, displayName, status) {
                uiService.onDisplayNameChanged(peerJid, displayName, status);
            });

        // Listen for large video size updates
        document.getElementById('largeVideo')
            .addEventListener('loadedmetadata', function (e) {
                VideoLayout.currentVideoWidth = this.videoWidth;
                VideoLayout.currentVideoHeight = this.videoHeight;
                VideoLayout.positionLarge(VideoLayout.currentVideoWidth,
                    VideoLayout.currentVideoHeight);
            });

    }

    function bindEvents()
    {
        /**
         * Resizes and repositions videos in full screen mode.
         */
        $(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange',
            function () {
                VideoLayout.resizeLargeVideoContainer();
                VideoLayout.positionLarge();
                var isFullScreen = VideoLayout.isFullScreen();

                if (isFullScreen) {
                    setView("fullscreen");
                }
                else {
                    setView("default");
                }
            }
        );

        $(window).resize(function () {
            VideoLayout.resizeLargeVideoContainer();
            VideoLayout.positionLarge();
        });
    }

    /**
     * Sets the current view.
     */
    function setView(viewName) {
//    if (viewName == "fullscreen") {
//        document.getElementById('videolayout_fullscreen').disabled  = false;
//        document.getElementById('videolayout_default').disabled  = true;
//    }
//    else {
//        document.getElementById('videolayout_default').disabled  = false;
//        document.getElementById('videolayout_fullscreen').disabled  = true;
//    }
    }

    UIActivatorProto.getRTCService = function()
    {
        return RTCActivator.getRTCService();
    }

    UIActivatorProto.getUIService = function()
    {
        if(uiService == null)
        {
            uiService = new UIService();
        }
        return uiService;
    }

    UIActivatorProto.chatAddError = function(errorMessage, originalText)
    {
        return Chat.chatAddError(errorMessage, originalText);
    }

    UIActivatorProto.chatSetSubject = function(text)
    {
        return Chat.chatSetSubject(text);
    }

    UIActivatorProto.updateChatConversation = function (from, displayName, message) {
        return Chat.updateChatConversation(from, displayName, message);
    }


    UIActivatorProto.addNicknameListener = function(listener)
    {

    }

    return UIActivatorProto;
}();

module.exports = UIActivator;


},{"../service/RTC/StreamEventTypes.js":22,"../service/xmpp/XMPPEvents":23,"./UIService":3,"./VideoLayout.js":5,"./WelcomePage":6,"./audiolevels/AudioLevels.js":7,"./chat/Chat.js":9,"./etherpad/Etherpad.js":12,"./keyboard_shortcut":13,"./prezi/Prezi.js":14,"./toolbars/BottomToolbar":17,"./toolbars/toolbar":19,"./toolbars/toolbar_toggler":20}],3:[function(require,module,exports){
var AudioLevels = require("./audiolevels/AudioLevels.js");
var Etherpad = require("./etherpad/Etherpad.js");
var VideoLayout = require("./VideoLayout.js");
var Toolbar = require("./toolbars/toolbar.js");
var ToolbarToggler = require("./toolbars/toolbar_toggler.js");
var ContactList = require("./ContactList");
var EventEmitter = require("events");

var UIService = function() {

    var eventEmitter = new EventEmitter();

    var nickname = null;

    var roomName = null;

    function UIServiceProto() {
    }

    UIServiceProto.prototype.updateAudioLevelCanvas = function (peerJid) {
        AudioLevels.updateAudioLevelCanvas(peerJid);
    }

    UIServiceProto.prototype.initEtherpad = function () {
        Etherpad.init();
    }


    UIServiceProto.prototype.checkChangeLargeVideo = function (removedVideoSrc) {
        VideoLayout.checkChangeLargeVideo(removedVideoSrc);
    }

    UIServiceProto.prototype.onMucJoined = function (jid, info, noMembers) {
        Toolbar.updateRoomUrl(window.location.href);
        document.getElementById('localNick').appendChild(
            document.createTextNode(Strophe.getResourceFromJid(jid) + ' (me)')
        );

        if (noMembers) {
            Toolbar.showSipCallButton(true);
            Toolbar.showRecordingButton(false);
        }

        if (!XMPPActivator.isFocus()) {
            Toolbar.showSipCallButton(false);
        }

        if (XMPPActivator.isFocus() && config.etherpad_base) {
            this.initEtherpad();
        }

        VideoLayout.showFocusIndicator();

        // Add myself to the contact list.
        ContactList.addContact(jid);

        // Once we've joined the muc show the toolbar
        ToolbarToggler.showToolbar();

        if (info.displayName)
            this.onDisplayNameChanged(
                'localVideoContainer', info.displayName + ' (me)');
    }

    UIServiceProto.prototype.onDisplayNameChanged = function (peerJid, displayName, status) {
        VideoLayout.onDisplayNameChanged(peerJid, displayName, status);
        ContactList.onDisplayNameChanged(peerJid, displayName);
    };

    UIServiceProto.prototype.onMucEntered = function (jid, info, pres, newConference) {
        console.log('entered', jid, info);

        // Add Peer's container
        VideoLayout.ensurePeerContainerExists(jid);

        if(newConference)
        {
            console.log('make new conference with', jid);
            Toolbar.showRecordingButton(true);
        }
        else if (Toolbar.sharedKey) {
            Toolbar.updateLockButton();
        }
    }

    UIServiceProto.prototype.onMucPresenceStatus = function ( jid, info, pres) {
        VideoLayout.setPresenceStatus(
                'participant_' + Strophe.getResourceFromJid(jid), info.status);
    }

    UIServiceProto.prototype.onMucLeft = function(jid)
    {
        // Need to call this with a slight delay, otherwise the element couldn't be
        // found for some reason.
        window.setTimeout(function () {
            var container = document.getElementById(
                    'participant_' + Strophe.getResourceFromJid(jid));
            if (container) {
                // hide here, wait for video to close before removing
                $(container).hide();
                VideoLayout.resizeThumbnails();
            }
        }, 10);

        // Unlock large video
        if (VideoLayout.focusedVideoSrc)
        {
            if (VideoLayout.getJidFromVideoSrc(VideoLayout.focusedVideoSrc) === jid)
            {
                console.info("Focused video owner has left the conference");
                VideoLayout.focusedVideoSrc = null;
            }
        }

    };

    UIServiceProto.prototype.showVideoForJID = function (jid) {
        var el = $('#participant_'  + jid + '>video');
        el.show();
    }

    UIServiceProto.prototype.hideVideoForJID = function (jid) {
        var el = $('#participant_'  + jid + '>video');
        el.hide();
    }

    UIServiceProto.prototype.getSelectedJID = function () {
        var largeVideoSrc = $('#largeVideo').attr('src');
        return VideoLayout.getJidFromVideoSrc(largeVideoSrc);
    }
    
    UIServiceProto.prototype.updateButtons = function (recording, sip) {
        if(recording != null)
        {
            Toolbar.showRecordingButton(recording);
        }

        if(sip != null)
        {
            Toolbar.showSipCallButton(sip);
        }
    }

    UIServiceProto.prototype.toggleAudio = function()
    {
        Toolbar.toggleAudio();
    };

    UIServiceProto.prototype.getCredentials = function () {
        var credentials = {};
        credentials.jid = document.getElementById('jid').value
            || config.hosts.anonymousdomain
            || config.hosts.domain || window.location.hostname;

        credentials.bosh = document.getElementById('boshURL').value || config.bosh || '/http-bind';
        credentials.password = document.getElementById('password').value;
        return credentials;
    }

    UIServiceProto.prototype.addNicknameListener = function (listener) {
        eventEmitter.on("nick_changed", listener);
        eventEmitter.emit("nick_changed", nickname);

    }

    UIServiceProto.prototype.removeNicknameListener = function (listener) {
        eventEmitter.removeListener("nick_changed", listener);
    }

    UIServiceProto.prototype.dispose = function()
    {
        eventEmitter.removeAllListeners("statistics.audioLevel");
    }

    UIServiceProto.prototype.setNickname = function(value)
    {
        nickname = value;
        eventEmitter.emit("nick_changed", value);
    }

    UIServiceProto.prototype.getNickname = function () {
        return nickname;
    }

    UIServiceProto.prototype.generateRoomName = function (authenticatedUser) {
        var roomnode = null;
        var path = window.location.pathname;
        var roomjid;

        // determinde the room node from the url
        // TODO: just the roomnode or the whole bare jid?
        if (config.getroomnode && typeof config.getroomnode === 'function') {
            // custom function might be responsible for doing the pushstate
            roomnode = config.getroomnode(path);
        } else {
            /* fall back to default strategy
             * this is making assumptions about how the URL->room mapping happens.
             * It currently assumes deployment at root, with a rewrite like the
             * following one (for nginx):
             location ~ ^/([a-zA-Z0-9]+)$ {
             rewrite ^/(.*)$ / break;
             }
             */
            if (path.length > 1) {
                roomnode = path.substr(1).toLowerCase();
            } else {
                var word = RoomNameGenerator.generateRoomWithoutSeparator(3);
                roomnode = word.toLowerCase();

                window.history.pushState('VideoChat',
                        'Room: ' + word, window.location.pathname + word);
            }
        }

        roomName = roomnode + '@' + config.hosts.muc;

        var roomjid = roomName;
        var tmpJid = XMPPActivator.getOwnJIDNode();

        if (config.useNicks) {
            var nick = window.prompt('Your nickname (optional)');
            if (nick) {
                roomjid += '/' + nick;
            } else {
                roomjid += '/' + tmpJid;
            }
        } else {
            if(!authenticatedUser)
                tmpJid = tmpJid.substr(0, 8);

            roomjid += '/' + tmpJid;
        }
        return roomjid;
    }

    UIServiceProto.prototype.getRoomName = function()
    {
        return roomName;
    }

    UIServiceProto.prototype.showLoginPopup = function (callback) {
        console.log('password is required');

        messageHandler.openTwoButtonDialog(null,
                '<h2>Password required</h2>' +
                '<input id="passwordrequired.username" type="text" placeholder="user@domain.net" autofocus>' +
                '<input id="passwordrequired.password" type="password" placeholder="user password">',
            true,
            "Ok",
            function (e, v, m, f) {
                if (v) {
                    var username = document.getElementById('passwordrequired.username');
                    var password = document.getElementById('passwordrequired.password');

                    if (username.value !== null && password.value != null) {
                        callback(username.value, password.value);
                    }
                }
            },
            function (event) {
                document.getElementById('passwordrequired.username').focus();
            }
        );
    }

    UIServiceProto.prototype.disableConnect = function()
    {
        document.getElementById('connect').disabled = true;
    }

    UIServiceProto.prototype.showLockPopup = function (jid, callback) {
        console.log('on password required', jid);

        messageHandler.openTwoButtonDialog(null,
                '<h2>Password required</h2>' +
                '<input id="lockKey" type="text" placeholder="shared key" autofocus>',
            true,
            "Ok",
            function (e, v, m, f) {
                if (v) {
                    var lockKey = document.getElementById('lockKey');
                    if (lockKey.value !== null) {
                        setSharedKey(lockKey.value);
                        callback(jid, lockKey.value)
                    }
                }
            },
            function (event) {
                document.getElementById('lockKey').focus();
            }
        );
    }


    return UIServiceProto;
}();
module.exports = UIService;
},{"./ContactList":1,"./VideoLayout.js":5,"./audiolevels/AudioLevels.js":7,"./etherpad/Etherpad.js":12,"./toolbars/toolbar.js":19,"./toolbars/toolbar_toggler.js":20,"events":25}],4:[function(require,module,exports){

var UIUtil = (function (my) {

    /**
     * Returns the available video width.
     */
    my.getAvailableVideoWidth = function () {
        var chatspaceWidth
            = $('#chatspace').is(":visible")
            ? $('#chatspace').width()
            : 0;

        return window.innerWidth - chatspaceWidth;
    };

    /**
     * Changes the style class of the element given by id.
     */
    my.buttonClick = function (id, classname) {
        $(id).toggleClass(classname); // add the class to the clicked element
    };

    return my;

})(UIUtil || {});

module.exports = UIUtil;
},{}],5:[function(require,module,exports){
var dep =
{
    "RTCBrowserType": function(){ return require("../service/RTC/RTCBrowserType.js")},
    "UIActivator": function(){ return require("./UIActivator.js")},
    "Chat": function(){ return require("./chat/Chat")},
    "UIUtil": function(){ return require("./UIUtil.js")},
    "ContactList": function(){ return require("./ContactList")},
    "Toolbar": function(){ return require("./toolbars/toolbar_toggler")}
}

var VideoLayout = (function (my) {
    var currentDominantSpeaker = null;
    var lastNCount = config.channelLastN;
    var lastNEndpointsCache = [];
    var largeVideoNewSrc = '';
    var browser = null;
    var flipXLocalVideo = true;
    my.currentVideoWidth = null;
    my.currentVideoHeight = null;
    var localVideoSrc = null;
    var videoSrcToSsrc = {};

    var mutedAudios = {};
    /**
     * Currently focused video "src"(displayed in large video).
     * @type {String}
     */
    my.focusedVideoSrc = null;

    function attachMediaStream(element, stream) {
        if(browser == null)
        {
            browser = dep.UIActivator().getRTCService().getBrowserType();
        }
        switch (browser)
        {
            case dep.RTCBrowserType().RTC_BROWSER_CHROME:
                element.attr('src', webkitURL.createObjectURL(stream));
                break;
            case dep.RTCBrowserType().RTC_BROWSER_FIREFOX:
                element[0].mozSrcObject = stream;
                element[0].play();
                break;
            default:
                console.log("Unknown browser.");
        }
    }

    my.changeLocalAudio = function(stream) {
        attachMediaStream($('#localAudio'), stream);
        document.getElementById('localAudio').autoplay = true;
        document.getElementById('localAudio').volume = 0;
        if (dep.Toolbar().preMuted) {
            dep.Toolbar().toggleAudio();
            dep.Toolbar().preMuted = false;
        }
    };

    my.changeLocalVideo = function(stream, flipX) {
        var localVideo = document.createElement('video');
        localVideo.id = 'localVideo_' + stream.id;
        localVideo.autoplay = true;
        localVideo.volume = 0; // is it required if audio is separated ?
        localVideo.oncontextmenu = function () { return false; };

        var localVideoContainer = document.getElementById('localVideoWrapper');
        localVideoContainer.appendChild(localVideo);

        // Set default display name.
        setDisplayName('localVideoContainer');

        dep.UIActivator().getUIService().updateAudioLevelCanvas();

        var localVideoSelector = $('#' + localVideo.id);
        // Add click handler to both video and video wrapper elements in case
        // there's no video.
        localVideoSelector.click(function () {
            VideoLayout.handleVideoThumbClicked(localVideo.src);
        });
        $('#localVideoContainer').click(function () {
            VideoLayout.handleVideoThumbClicked(localVideo.src);
        });

        // Add hover handler
        $('#localVideoContainer').hover(
            function() {
                VideoLayout.showDisplayName('localVideoContainer', true);
            },
            function() {
                if (!VideoLayout.isLargeVideoVisible()
                        || localVideo.src !== $('#largeVideo').attr('src'))
                    VideoLayout.showDisplayName('localVideoContainer', false);
            }
        );
        // Add stream ended handler
        stream.onended = function () {
            localVideoContainer.removeChild(localVideo);
            VideoLayout.updateRemovedVideo(localVideo.src);
        };
        // Flip video x axis if needed
        flipXLocalVideo = flipX;
        if (flipX) {
            localVideoSelector.addClass("flipVideoX");
        }
        // Attach WebRTC stream
        attachMediaStream(localVideoSelector, stream);

        localVideoSrc = localVideo.src;

        VideoLayout.updateLargeVideo(localVideoSrc, 0);
    };

    /**
     * Checks if removed video is currently displayed and tries to display
     * another one instead.
     * @param removedVideoSrc src stream identifier of the video.
     */
    my.updateRemovedVideo = function(removedVideoSrc) {
        if (removedVideoSrc === $('#largeVideo').attr('src')) {
            // this is currently displayed as large
            // pick the last visible video in the row
            // if nobody else is left, this picks the local video
            var pick
                = $('#remoteVideos>span[id!="mixedstream"]:visible:last>video')
                    .get(0);

            if (!pick) {
                console.info("Last visible video no longer exists");
                pick = $('#remoteVideos>span[id!="mixedstream"]>video').get(0);

                if (!pick || !pick.src) {
                    // Try local video
                    console.info("Fallback to local video...");
                    pick = $('#remoteVideos>span>span>video').get(0);
                }
            }

            // mute if localvideo
            if (pick) {
                VideoLayout.updateLargeVideo(pick.src, pick.volume);
            } else {
                console.warn("Failed to elect large video");
            }
        }
    };

    /**
     * Returns the JID of the user to whom given <tt>videoSrc</tt> belongs.
     * @param videoSrc the video "src" identifier.
     * @returns {null | String} the JID of the user to whom given <tt>videoSrc</tt>
     *                   belongs.
     */
    my.getJidFromVideoSrc = function(videoSrc)
    {
        if (videoSrc === localVideoSrc)
            return XMPPActivator.getMyJID();

        var ssrc = videoSrcToSsrc[videoSrc];
        if (!ssrc)
        {
            return null;
        }
        return XMPPActivator.getJIDFromSSRC(ssrc);
    }
    /**
     * Updates the large video with the given new video source.
     */
    my.updateLargeVideo = function(newSrc, vol) {
        console.log('hover in', newSrc);

        if ($('#largeVideo').attr('src') != newSrc) {
            largeVideoNewSrc = newSrc;

            var isVisible = $('#largeVideo').is(':visible');

            // we need this here because after the fade the videoSrc may have
            // changed.
            var isDesktop = isVideoSrcDesktop(newSrc);

            var userJid = VideoLayout.getJidFromVideoSrc(newSrc);
            // we want the notification to trigger even if userJid is undefined,
            // or null.
            $(document).trigger("selectedendpointchanged", [userJid]);

            $('#largeVideo').fadeOut(300, function () {
                var oldSrc = $(this).attr('src');

                $(this).attr('src', newSrc);

                // Screen stream is already rotated
                var flipX = (newSrc === localVideoSrc) && flipXLocalVideo;

                var videoTransform = document.getElementById('largeVideo')
                                        .style.webkitTransform;

                if (flipX && videoTransform !== 'scaleX(-1)') {
                    document.getElementById('largeVideo').style.webkitTransform
                        = "scaleX(-1)";
                }
                else if (!flipX && videoTransform === 'scaleX(-1)') {
                    document.getElementById('largeVideo').style.webkitTransform
                        = "none";
                }

                // Change the way we'll be measuring and positioning large video

                getVideoSize = isDesktop
                    ? getDesktopVideoSize
                    : VideoLayout.getCameraVideoSize;
                getVideoPosition = isDesktop
                    ? getDesktopVideoPosition
                    : VideoLayout.getCameraVideoPosition;

                if (isVisible) {
                    // Only if the large video is currently visible.
                    // Disable previous dominant speaker video.
                    var oldJid = VideoLayout.getJidFromVideoSrc(oldSrc);
                    if (oldJid) {
                        var oldResourceJid = Strophe.getResourceFromJid(oldJid);
                        VideoLayout.enableDominantSpeaker(oldResourceJid, false);
                    }

                    // Enable new dominant speaker in the remote videos section.
                    var userJid = VideoLayout.getJidFromVideoSrc(newSrc);
                    if (userJid)
                    {
                        var resourceJid = Strophe.getResourceFromJid(userJid);
                        VideoLayout.enableDominantSpeaker(resourceJid, true);
                    }

                    $(this).fadeIn(300);
                }
            });
        }
    };

    /**
     * Returns an array of the video horizontal and vertical indents.
     * Centers horizontally and top aligns vertically.
     *
     * @return an array with 2 elements, the horizontal indent and the vertical
     * indent
     */
    function getDesktopVideoPosition(videoWidth,
                                     videoHeight,
                                     videoSpaceWidth,
                                     videoSpaceHeight) {

        var horizontalIndent = (videoSpaceWidth - videoWidth) / 2;

        var verticalIndent = 0;// Top aligned

        return [horizontalIndent, verticalIndent];
    }

    /**
     * Checks if video identified by given src is desktop stream.
     * @param videoSrc eg.
     * blob:https%3A//pawel.jitsi.net/9a46e0bd-131e-4d18-9c14-a9264e8db395
     * @returns {boolean}
     */
    function isVideoSrcDesktop(videoSrc) {
        // FIXME: fix this mapping mess...
        // figure out if large video is desktop stream or just a camera
        var isDesktop = false;
        if (localVideoSrc === videoSrc) {
            // local video
            isDesktop = isUsingScreenStream;
        } else {
            // Do we have associations...
            var videoSsrc = videoSrcToSsrc[videoSrc];
            if (videoSsrc) {
                var videoType = XMPPActivator.getVideoTypeFromSSRC(videoSsrc);
                if (videoType) {
                    // Finally there...
                    isDesktop = videoType === 'screen';
                } else {
                    console.error("No video type for ssrc: " + videoSsrc);
                }
            } else {
                console.error("No ssrc for src: " + videoSrc);
            }
        }
        return isDesktop;
    }


    my.handleVideoThumbClicked = function(videoSrc) {
        // Restore style for previously focused video
        var focusJid = VideoLayout.getJidFromVideoSrc(VideoLayout.focusedVideoSrc);
        var oldContainer = getParticipantContainer(focusJid);

        if (oldContainer) {
            oldContainer.removeClass("videoContainerFocused");
        }

        // Unlock current focused. 
        if (VideoLayout.focusedVideoSrc === videoSrc)
        {
            VideoLayout.focusedVideoSrc = null;
            var dominantSpeakerVideo = null;
            // Enable the currently set dominant speaker.
            if (currentDominantSpeaker) {
                dominantSpeakerVideo
                    = $('#participant_' + currentDominantSpeaker + '>video')
                        .get(0);

                if (dominantSpeakerVideo) {
                    VideoLayout.updateLargeVideo(dominantSpeakerVideo.src, 1);
                }
            }

            return;
        }

        // Lock new video
        VideoLayout.focusedVideoSrc = videoSrc;

        // Update focused/pinned interface.
        var userJid = VideoLayout.getJidFromVideoSrc(videoSrc);
        if (userJid)
        {
            var container = getParticipantContainer(userJid);
            container.addClass("videoContainerFocused");
        }

        // Triggers a "video.selected" event. The "false" parameter indicates
        // this isn't a prezi.
        $(document).trigger("video.selected", [false]);

        VideoLayout.updateLargeVideo(videoSrc, 1);

        $('audio').each(function (idx, el) {
            if (el.id.indexOf('mixedmslabel') !== -1) {
                el.volume = 0;
                el.volume = 1;
            }
        });
    };

    /**
     * Positions the large video.
     *
     * @param videoWidth the stream video width
     * @param videoHeight the stream video height
     */
    my.positionLarge = function (videoWidth, videoHeight) {
        var videoSpaceWidth = $('#videospace').width();
        var videoSpaceHeight = window.innerHeight;

        var videoSize = getVideoSize(videoWidth,
                                     videoHeight,
                                     videoSpaceWidth,
                                     videoSpaceHeight);

        var largeVideoWidth = videoSize[0];
        var largeVideoHeight = videoSize[1];

        var videoPosition = getVideoPosition(largeVideoWidth,
                                             largeVideoHeight,
                                             videoSpaceWidth,
                                             videoSpaceHeight);

        var horizontalIndent = videoPosition[0];
        var verticalIndent = videoPosition[1];

        positionVideo($('#largeVideo'),
                      largeVideoWidth,
                      largeVideoHeight,
                      horizontalIndent, verticalIndent);
    };

    /**
     * Shows/hides the large video.
     */
    my.setLargeVideoVisible = function(isVisible) {
        var largeVideoJid = VideoLayout.getJidFromVideoSrc($('#largeVideo').attr('src'));
        var resourceJid = Strophe.getResourceFromJid(largeVideoJid);

        if (isVisible) {
            $('#largeVideo').css({visibility: 'visible'});
            $('.watermark').css({visibility: 'visible'});
            VideoLayout.enableDominantSpeaker(resourceJid, true);
        }
        else {
            $('#largeVideo').css({visibility: 'hidden'});
            $('.watermark').css({visibility: 'hidden'});
            VideoLayout.enableDominantSpeaker(resourceJid, false);
        }
    };

    /**
     * Indicates if the large video is currently visible.
     *
     * @return <tt>true</tt> if visible, <tt>false</tt> - otherwise
     */
    my.isLargeVideoVisible = function() {
        return $('#largeVideo').is(':visible');
    };

    /**
     * Checks if container for participant identified by given peerJid exists
     * in the document and creates it eventually.
     * 
     * @param peerJid peer Jid to check.
     * 
     * @return Returns <tt>true</tt> if the peer container exists,
     * <tt>false</tt> - otherwise
     */
    my.ensurePeerContainerExists = function(peerJid) {
        dep.ContactList().ensureAddContact(peerJid);

        var resourceJid = Strophe.getResourceFromJid(peerJid);

        var videoSpanId = 'participant_' + resourceJid;

        if ($('#' + videoSpanId).length > 0) {
            // If there's been a focus change, make sure we add focus related
            // interface!!
            if (XMPPActivator.isFocus() && $('#remote_popupmenu_' + resourceJid).length <= 0)
                addRemoteVideoMenu( peerJid,
                                    document.getElementById(videoSpanId));
        }
        else {
            var container
                = VideoLayout.addRemoteVideoContainer(peerJid, videoSpanId);

            // Set default display name.
            setDisplayName(videoSpanId);

            var nickfield = document.createElement('span');
            nickfield.className = "nick";
            nickfield.appendChild(document.createTextNode(resourceJid));
            container.appendChild(nickfield);

            // In case this is not currently in the last n we don't show it.
            if (lastNCount
                && lastNCount > 0
                && $('#remoteVideos>span').length >= lastNCount + 2) {
                showPeerContainer(resourceJid, false);
            }
            else
                VideoLayout.resizeThumbnails();
        }
    };

    my.addRemoteVideoContainer = function(peerJid, spanId) {
        var container = document.createElement('span');
        container.id = spanId;
        container.className = 'videocontainer';
        var remotes = document.getElementById('remoteVideos');

        // If the peerJid is null then this video span couldn't be directly
        // associated with a participant (this could happen in the case of prezi).
        if (XMPPActivator.isFocus() && peerJid != null)
            addRemoteVideoMenu(peerJid, container);

        remotes.appendChild(container);
        dep.UIActivator().getUIService().updateAudioLevelCanvas(peerJid);

        return container;
    };

    /**
     * Creates an audio or video stream element.
     */
    my.createStreamElement = function (sid, stream) {
        var isVideo = stream.getVideoTracks().length > 0;

        if(isVideo)
        {
            console.trace(stream);
        }
        var element = isVideo
                        ? document.createElement('video')
                        : document.createElement('audio');
        var id = (isVideo ? 'remoteVideo_' : 'remoteAudio_')
                    + sid + '_' + stream.id;

        element.id = id;
        element.autoplay = true;
        element.oncontextmenu = function () { return false; };

        return element;
    };

    my.addRemoteStreamElement
        = function (container, sid, stream, peerJid, thessrc) {
        var newElementId = null;

        var isVideo = stream.getVideoTracks().length > 0;

        if (container) {
            var streamElement = VideoLayout.createStreamElement(sid, stream);
            newElementId = streamElement.id;

            container.appendChild(streamElement);

            var sel = $('#' + newElementId);
            sel.hide();

            // If the container is currently visible we attach the stream.
            if (!isVideo
                || (container.offsetParent !== null && isVideo)) {
//<<<<<<< HEAD:UI/videolayout.js
//                attachMediaStream(sel, stream);
//=======
                var simulcast = new Simulcast();
                var videoStream = simulcast.getReceivingVideoStream(stream);
                attachMediaStream(sel, videoStream);
//>>>>>>> master:videolayout.js

                if (isVideo)
                    waitForRemoteVideo(sel, thessrc, stream);
            }

            stream.onended = function () {
                console.log('stream ended', this);

                VideoLayout.removeRemoteStreamElement(stream, container);

                if (peerJid)
                    dep.ContactList().removeContact(peerJid);
            };

            // Add click handler.
            container.onclick = function (event) {
                /*
                 * FIXME It turns out that videoThumb may not exist (if there is
                 * no actual video).
                 */
                var videoThumb = $('#' + container.id + '>video').get(0);

                if (videoThumb)
                    VideoLayout.handleVideoThumbClicked(videoThumb.src);

                event.preventDefault();
                return false;
            };

            // Add hover handler
            $(container).hover(
                function() {
                    VideoLayout.showDisplayName(container.id, true);
                },
                function() {
                    var videoSrc = null;
                    if ($('#' + container.id + '>video')
                            && $('#' + container.id + '>video').length > 0) {
                        videoSrc = $('#' + container.id + '>video').get(0).src;
                    }

                    // If the video has been "pinned" by the user we want to
                    // keep the display name on place.
                    if (!VideoLayout.isLargeVideoVisible()
                            || videoSrc !== $('#largeVideo').attr('src'))
                        VideoLayout.showDisplayName(container.id, false);
                }
            );
        }

        return newElementId;
    };

    /**
     * Removes the remote stream element corresponding to the given stream and
     * parent container.
     * 
     * @param stream the stream
     * @param container
     */
    my.removeRemoteStreamElement = function (stream, container) {
        if (!container)
            return;

        var select = null;
        var removedVideoSrc = null;
        if (stream.getVideoTracks().length > 0) {
            select = $('#' + container.id + '>video');
            removedVideoSrc = select.get(0).src;
        }
        else
            select = $('#' + container.id + '>audio');

        // Remove video source from the mapping.
        delete videoSrcToSsrc[removedVideoSrc];

        // Mark video as removed to cancel waiting loop(if video is removed
        // before has started)
        select.removed = true;
        select.remove();

        var audioCount = $('#' + container.id + '>audio').length;
        var videoCount = $('#' + container.id + '>video').length;

        if (!audioCount && !videoCount) {
            console.log("Remove whole user", container.id);
            // Remove whole container
            container.remove();
            Util.playSoundNotification('userLeft');
            VideoLayout.resizeThumbnails();
        }

        if (removedVideoSrc)
            VideoLayout.updateRemovedVideo(removedVideoSrc);
    };

    /**
     * Show/hide peer container for the given resourceJid.
     */
    function showPeerContainer(resourceJid, isShow) {
        var peerContainer = $('#participant_' + resourceJid);

        if (!peerContainer)
            return;

        if (!peerContainer.is(':visible') && isShow)
            peerContainer.show();
        else if (peerContainer.is(':visible') && !isShow)
            peerContainer.hide();
    };

    /**
     * Sets the display name for the given video span id.
     */
    function setDisplayName(videoSpanId, displayName) {
        var nameSpan = $('#' + videoSpanId + '>span.displayname');
        var defaultLocalDisplayName = "Me";

        // If we already have a display name for this video.
        if (nameSpan.length > 0) {
            var nameSpanElement = nameSpan.get(0);

            if (nameSpanElement.id === 'localDisplayName' &&
                $('#localDisplayName').text() !== displayName) {
                if (displayName && displayName.length > 0)
                    $('#localDisplayName').text(displayName + ' (me)');
                else
                    $('#localDisplayName').text(defaultLocalDisplayName);
            } else {
                if (displayName && displayName.length > 0)
                    $('#' + videoSpanId + '_name').text(displayName);
                else
                    $('#' + videoSpanId + '_name').text(interfaceConfig.DEFAULT_REMOTE_DISPLAY_NAME);
            }
        } else {
            var editButton = null;

            nameSpan = document.createElement('span');
            nameSpan.className = 'displayname';
            $('#' + videoSpanId)[0].appendChild(nameSpan);

            if (videoSpanId === 'localVideoContainer') {
                editButton = createEditDisplayNameButton();
                nameSpan.innerText = defaultLocalDisplayName;
            }
            else {
                nameSpan.innerText = interfaceConfig.DEFAULT_REMOTE_DISPLAY_NAME;
            }

            if (displayName && displayName.length > 0) {
                nameSpan.innerText = displayName;
            }

            if (!editButton) {
                nameSpan.id = videoSpanId + '_name';
            } else {
                nameSpan.id = 'localDisplayName';
                $('#' + videoSpanId)[0].appendChild(editButton);

                var editableText = document.createElement('input');
                editableText.className = 'displayname';
                editableText.type = 'text';
                editableText.id = 'editDisplayName';

                if (displayName && displayName.length) {
                    editableText.value
                        = displayName.substring(0, displayName.indexOf(' (me)'));
                }

                editableText.setAttribute('style', 'display:none;');
                editableText.setAttribute('placeholder', 'ex. Jane Pink');
                $('#' + videoSpanId)[0].appendChild(editableText);

                $('#localVideoContainer .displayname')
                    .bind("click", function (e) {

                    e.preventDefault();
                    $('#localDisplayName').hide();
                    $('#editDisplayName').show();
                    $('#editDisplayName').focus();
                    $('#editDisplayName').select();

                    var inputDisplayNameHandler = function (name) {
                        var nickname = dep.UIActivator().getUIService().getNickname();
                        if (nickname !== name) {
                            dep.UIActivator().getUIService().setNickname(name);
                            nickname  = name;
                            window.localStorage.displayname = nickname;
                            XMPPActivator.addToPresence("displayName", nickname);

                            dep.Chat().setChatConversationMode(true);
                        }

                        if (!$('#localDisplayName').is(":visible")) {
                            if (nickname)
                                $('#localDisplayName').text(nickname + " (me)");
                            else
                                $('#localDisplayName')
                                    .text(defaultLocalDisplayName);
                            $('#localDisplayName').show();
                        }

                        $('#editDisplayName').hide();
                    };

                    $('#editDisplayName').one("focusout", function (e) {
                        inputDisplayNameHandler(this.value);
                    });

                    $('#editDisplayName').on('keydown', function (e) {
                        if (e.keyCode === 13) {
                            e.preventDefault();
                            inputDisplayNameHandler(this.value);
                        }
                    });
                });
            }
        }
    };

    /**
     * Shows/hides the display name on the remote video.
     * @param videoSpanId the identifier of the video span element
     * @param isShow indicates if the display name should be shown or hidden
     */
    my.showDisplayName = function(videoSpanId, isShow) {
        var nameSpan = $('#' + videoSpanId + '>span.displayname').get(0);
        if (isShow) {
            if (nameSpan && nameSpan.innerHTML && nameSpan.innerHTML.length) 
                nameSpan.setAttribute("style", "display:inline-block;");
        }
        else {
            if (nameSpan)
                nameSpan.setAttribute("style", "display:none;");
        }
    };

    /**
     * Shows the presence status message for the given video.
     */
    my.setPresenceStatus = function (videoSpanId, statusMsg) {

        if (!$('#' + videoSpanId).length) {
            // No container
            return;
        }

        var statusSpan = $('#' + videoSpanId + '>span.status');
        if (!statusSpan.length) {
            //Add status span
            statusSpan = document.createElement('span');
            statusSpan.className = 'status';
            statusSpan.id = videoSpanId + '_status';
            $('#' + videoSpanId)[0].appendChild(statusSpan);

            statusSpan = $('#' + videoSpanId + '>span.status');
        }

        // Display status
        if (statusMsg && statusMsg.length) {
            $('#' + videoSpanId + '_status').text(statusMsg);
            statusSpan.get(0).setAttribute("style", "display:inline-block;");
        }
        else {
            // Hide
            statusSpan.get(0).setAttribute("style", "display:none;");
        }
    };

    /**
     * Shows a visual indicator for the focus of the conference.
     * Currently if we're not the owner of the conference we obtain the focus
     * from the connection.jingle.sessions.
     */
    my.showFocusIndicator = function() {
        if (XMPPActivator.isFocus()) {
            var indicatorSpan = $('#localVideoContainer .focusindicator');

            if (indicatorSpan.children().length === 0)
            {
                createFocusIndicatorElement(indicatorSpan[0]);
            }
        }
        else
        {
            // If we're only a participant the focus will be the only session we have.
            var focusJID = XMPPActivator.getFocusJID();
            if(focusJID == null)
                return;
            var focusId
                = 'participant_' + focusJID;

            var focusContainer = document.getElementById(focusId);
            if (!focusContainer) {
                console.error("No focus container!");
                return;
            }
            var indicatorSpan = $('#' + focusId + ' .focusindicator');

            if (!indicatorSpan || indicatorSpan.length === 0) {
                indicatorSpan = document.createElement('span');
                indicatorSpan.className = 'focusindicator';

                focusContainer.appendChild(indicatorSpan);

                createFocusIndicatorElement(indicatorSpan);
            }
        }
    };

    /**
     * Shows video muted indicator over small videos.
     */
    my.showVideoIndicator = function(videoSpanId, isMuted) {
        var videoMutedSpan = $('#' + videoSpanId + '>span.videoMuted');

        if (isMuted === 'false') {
            if (videoMutedSpan.length > 0) {
                videoMutedSpan.remove();
            }
        }
        else {
            var audioMutedSpan = $('#' + videoSpanId + '>span.audioMuted');

            videoMutedSpan = document.createElement('span');
            videoMutedSpan.className = 'videoMuted';
            if (audioMutedSpan) {
                videoMutedSpan.right = '30px';
            }
            $('#' + videoSpanId)[0].appendChild(videoMutedSpan);

            var mutedIndicator = document.createElement('i');
            mutedIndicator.className = 'icon-camera-disabled';
            Util.setTooltip(mutedIndicator,
                    "Participant has<br/>stopped the camera.",
                    "top");
            videoMutedSpan.appendChild(mutedIndicator);
        }
    };

    /**
     * Shows audio muted indicator over small videos.
     */
    my.showAudioIndicator = function(videoSpanId, isMuted) {
        var audioMutedSpan = $('#' + videoSpanId + '>span.audioMuted');

        if (isMuted === 'false') {
            if (audioMutedSpan.length > 0) {
                audioMutedSpan.popover('hide');
                audioMutedSpan.remove();
            }
        }
        else {
            var videoMutedSpan = $('#' + videoSpanId + '>span.videoMuted');

            audioMutedSpan = document.createElement('span');
            audioMutedSpan.className = 'audioMuted';
            Util.setTooltip(audioMutedSpan,
                    "Participant is muted",
                    "top");

            if (videoMutedSpan) {
                audioMutedSpan.right = '30px';
            }
            $('#' + videoSpanId)[0].appendChild(audioMutedSpan);

            var mutedIndicator = document.createElement('i');
            mutedIndicator.className = 'icon-mic-disabled';
            audioMutedSpan.appendChild(mutedIndicator);
        }
    };

    /**
     * Resizes the large video container.
     */
    my.resizeLargeVideoContainer = function () {
        dep.Chat().resizeChat();
        var availableHeight = window.innerHeight;
        var availableWidth = dep.UIUtil().getAvailableVideoWidth();
        if (availableWidth < 0 || availableHeight < 0) return;

        $('#videospace').width(availableWidth);
        $('#videospace').height(availableHeight);
        $('#largeVideoContainer').width(availableWidth);
        $('#largeVideoContainer').height(availableHeight);

        VideoLayout.resizeThumbnails();
    };

    /**
     * Resizes thumbnails.
     */
    my.resizeThumbnails = function() {
        var videoSpaceWidth = $('#remoteVideos').width();

        var thumbnailSize = VideoLayout.calculateThumbnailSize(videoSpaceWidth);
        var width = thumbnailSize[0];
        var height = thumbnailSize[1];

        // size videos so that while keeping AR and max height, we have a
        // nice fit
        $('#remoteVideos').height(height);
        $('#remoteVideos>span').width(width);
        $('#remoteVideos>span').height(height);

        $(document).trigger("remotevideo.resized", [width, height]);
    };

    /**
     * Enables the dominant speaker UI.
     *
     * @param resourceJid the jid indicating the video element to
     * activate/deactivate
     * @param isEnable indicates if the dominant speaker should be enabled or
     * disabled
     */
    my.enableDominantSpeaker = function(resourceJid, isEnable) {
        var displayName = resourceJid;
        var nameSpan = $('#participant_' + resourceJid + '>span.displayname');
        if (nameSpan.length > 0)
            displayName = nameSpan.text();

        console.log("UI enable dominant speaker",
                    displayName,
                    resourceJid,
                    isEnable);

        var videoSpanId = null;
        var videoContainerId = null;
        if (resourceJid
                === Strophe.getResourceFromJid(XMPPActivator.getMyJID())) {
            videoSpanId = 'localVideoWrapper';
            videoContainerId = 'localVideoContainer';
        }
        else {
            videoSpanId = 'participant_' + resourceJid;
            videoContainerId = videoSpanId;
        }

        videoSpan = document.getElementById(videoContainerId);

        if (!videoSpan) {
            console.error("No video element for jid", resourceJid);
            return;
        }

        var video = $('#' + videoSpanId + '>video');

        if (video && video.length > 0) {
            if (isEnable) {
                VideoLayout.showDisplayName(videoContainerId, true);

                if (!videoSpan.classList.contains("dominantspeaker"))
                    videoSpan.classList.add("dominantspeaker");

                video.css({visibility: 'hidden'});
            }
            else {
                VideoLayout.showDisplayName(videoContainerId, false);

                if (videoSpan.classList.contains("dominantspeaker"))
                    videoSpan.classList.remove("dominantspeaker");

                video.css({visibility: 'visible'});
            }
        }
    };

    /**
     * Gets the selector of video thumbnail container for the user identified by
     * given <tt>userJid</tt>
     * @param userJid user's Jid for whom we want to get the video container.
     */
    function getParticipantContainer(userJid)
    {
        if (!userJid)
            return null;

        if (userJid === XMPPActivator.getMyJID())
            return $("#localVideoContainer");
        else
            return $("#participant_" + Strophe.getResourceFromJid(userJid));
    }

    /**
     * Sets the size and position of the given video element.
     *
     * @param video the video element to position
     * @param width the desired video width
     * @param height the desired video height
     * @param horizontalIndent the left and right indent
     * @param verticalIndent the top and bottom indent
     */
    function positionVideo(video,
                           width,
                           height,
                           horizontalIndent,
                           verticalIndent) {
        video.width(width);
        video.height(height);
        video.css({  top: verticalIndent + 'px',
                     bottom: verticalIndent + 'px',
                     left: horizontalIndent + 'px',
                     right: horizontalIndent + 'px'});
    }

    /**
     * Calculates the thumbnail size.
     *
     * @param videoSpaceWidth the width of the video space
     */
    my.calculateThumbnailSize = function (videoSpaceWidth) {
        // Calculate the available height, which is the inner window height minus
       // 39px for the header minus 2px for the delimiter lines on the top and
       // bottom of the large video, minus the 36px space inside the remoteVideos
       // container used for highlighting shadow.
       var availableHeight = 100;

       var numvids = 0;
       if (lastNCount && lastNCount > 0)
           numvids = lastNCount + 1;
       else
           numvids = $('#remoteVideos>span:visible').length;

       // Remove the 3px borders arround videos and border around the remote
       // videos area
       var availableWinWidth = videoSpaceWidth - 2 * 3 * numvids - 70;

       var availableWidth = availableWinWidth / numvids;
       var aspectRatio = 16.0 / 9.0;
       var maxHeight = Math.min(160, availableHeight);
       availableHeight = Math.min(maxHeight, availableWidth / aspectRatio);
       if (availableHeight < availableWidth / aspectRatio) {
           availableWidth = Math.floor(availableHeight * aspectRatio);
       }

       return [availableWidth, availableHeight];
   };

   /**
    * Returns an array of the video dimensions, so that it keeps it's aspect
    * ratio and fits available area with it's larger dimension. This method
    * ensures that whole video will be visible and can leave empty areas.
    *
    * @return an array with 2 elements, the video width and the video height
    */
   function getDesktopVideoSize(videoWidth,
                                videoHeight,
                                videoSpaceWidth,
                                videoSpaceHeight) {
       if (!videoWidth)
           videoWidth = VideoLayout.currentVideoWidth;
       if (!videoHeight)
           videoHeight = VideoLayout.currentVideoHeight;

       var aspectRatio = videoWidth / videoHeight;

       var availableWidth = Math.max(videoWidth, videoSpaceWidth);
       var availableHeight = Math.max(videoHeight, videoSpaceHeight);

       videoSpaceHeight -= $('#remoteVideos').outerHeight();

       if (availableWidth / aspectRatio >= videoSpaceHeight)
       {
           availableHeight = videoSpaceHeight;
           availableWidth = availableHeight * aspectRatio;
       }

       if (availableHeight * aspectRatio >= videoSpaceWidth)
       {
           availableWidth = videoSpaceWidth;
           availableHeight = availableWidth / aspectRatio;
       }

       return [availableWidth, availableHeight];
   }


/**
     * Returns an array of the video dimensions, so that it covers the screen.
     * It leaves no empty areas, but some parts of the video might not be visible.
     *
     * @return an array with 2 elements, the video width and the video height
     */
    my.getCameraVideoSize = function(videoWidth,
                                videoHeight,
                                videoSpaceWidth,
                                videoSpaceHeight) {
        if (!videoWidth)
            videoWidth = VideoLayout.currentVideoWidth;
        if (!videoHeight)
            videoHeight = VideoLayout.currentVideoHeight;

        var aspectRatio = videoWidth / videoHeight;

        var availableWidth = Math.max(videoWidth, videoSpaceWidth);
        var availableHeight = Math.max(videoHeight, videoSpaceHeight);

        if (availableWidth / aspectRatio < videoSpaceHeight) {
            availableHeight = videoSpaceHeight;
            availableWidth = availableHeight * aspectRatio;
        }

        if (availableHeight * aspectRatio < videoSpaceWidth) {
            availableWidth = videoSpaceWidth;
            availableHeight = availableWidth / aspectRatio;
        }

        return [availableWidth, availableHeight];
    }

    /**
     * Returns an array of the video horizontal and vertical indents,
     * so that if fits its parent.
     *
     * @return an array with 2 elements, the horizontal indent and the vertical
     * indent
     */
    my.getCameraVideoPosition = function(videoWidth,
                                    videoHeight,
                                    videoSpaceWidth,
                                    videoSpaceHeight) {
        // Parent height isn't completely calculated when we position the video in
        // full screen mode and this is why we use the screen height in this case.
        // Need to think it further at some point and implement it properly.
        var isFullScreen = VideoLayout.isFullScreen();
        if (isFullScreen)
            videoSpaceHeight = window.innerHeight;

        var horizontalIndent = (videoSpaceWidth - videoWidth) / 2;
        var verticalIndent = (videoSpaceHeight - videoHeight) / 2;

        return [horizontalIndent, verticalIndent];
    }

    /**
     * Method used to get large video position.
     * @type {function ()}
     */
    var getVideoPosition = my.getCameraVideoPosition;

    /**
     * Method used to calculate large video size.
     * @type {function ()}
     */
    var getVideoSize = my.getCameraVideoSize;

    my.isFullScreen = function()
    {
        return document.fullScreen ||
            document.mozFullScreen ||
            document.webkitIsFullScreen;
    }

    /**
     * Creates the edit display name button.
     *
     * @returns the edit button
     */
    function createEditDisplayNameButton() {
        var editButton = document.createElement('a');
        editButton.className = 'displayname';
        Util.setTooltip(editButton,
                        'Click to edit your<br/>display name',
                        "top");
        editButton.innerHTML = '<i class="fa fa-pencil"></i>';

        return editButton;
    }

    /**
     * Creates the element indicating the focus of the conference.
     *
     * @param parentElement the parent element where the focus indicator will
     * be added
     */
    function createFocusIndicatorElement(parentElement) {
        var focusIndicator = document.createElement('i');
        focusIndicator.className = 'fa fa-star';
        parentElement.appendChild(focusIndicator);

        Util.setTooltip(parentElement,
                "The owner of<br/>this conference",
                "top");
    }

    /**
     * Updates the remote video menu.
     *
     * @param jid the jid indicating the video for which we're adding a menu.
     * @param isMuted indicates the current mute state
     */
    my.updateRemoteVideoMenu = function(jid, isMuted) {
        var muteMenuItem
            = $('#remote_popupmenu_'
                    + Strophe.getResourceFromJid(jid)
                    + '>li>a.mutelink');

        var mutedIndicator = "<i class='icon-mic-disabled'></i>";

        if (muteMenuItem.length) {
            var muteLink = muteMenuItem.get(0);

            if (isMuted === 'true') {
                muteLink.innerHTML = mutedIndicator + ' Muted';
                muteLink.className = 'mutelink disabled';
            }
            else {
                muteLink.innerHTML = mutedIndicator + ' Mute';
                muteLink.className = 'mutelink';
            }
        }
    };

    /**
     * Returns the current dominant speaker resource jid.
     */
    my.getDominantSpeakerResourceJid = function () {
        return currentDominantSpeaker;
    };

    /**
     * Returns the corresponding resource jid to the given peer container
     * DOM element.
     *
     * @return the corresponding resource jid to the given peer container
     * DOM element
     */
    my.getPeerContainerResourceJid = function (containerElement) {
        var i = containerElement.id.indexOf('participant_');

        if (i >= 0)
            return containerElement.id.substring(i + 12); 
    };

    my.onRemoteStreamAdded = function (stream) {
        var container;
        var remotes = document.getElementById('remoteVideos');

        if (stream.peerjid) {
            VideoLayout.ensurePeerContainerExists(stream.peerjid);

            container  = document.getElementById(
                    'participant_' + Strophe.getResourceFromJid(stream.peerjid));
        } else {
            if (stream.stream.id !== 'mixedmslabel') {
                console.error(  'can not associate stream',
                    stream.stream.id,
                    'with a participant');
                // We don't want to add it here since it will cause troubles
                return;
            }
            // FIXME: for the mixed ms we dont need a video -- currently
            container = document.createElement('span');
            container.id = 'mixedstream';
            container.className = 'videocontainer';
            remotes.appendChild(container);
            Util.playSoundNotification('userJoined');
        }

        if (container) {
            VideoLayout.addRemoteStreamElement( container,
                stream.sid,
                stream.stream,
                stream.peerjid,
                stream.ssrc);
        }
    }

    /**
     * Adds the remote video menu element for the given <tt>jid</tt> in the
     * given <tt>parentElement</tt>.
     *
     * @param jid the jid indicating the video for which we're adding a menu.
     * @param parentElement the parent element where this menu will be added
     */
    function addRemoteVideoMenu(jid, parentElement) {
        var spanElement = document.createElement('span');
        spanElement.className = 'remotevideomenu';

        parentElement.appendChild(spanElement);

        var menuElement = document.createElement('i');
        menuElement.className = 'fa fa-angle-down';
        menuElement.title = 'Remote user controls';
        spanElement.appendChild(menuElement);

//        <ul class="popupmenu">
//        <li><a href="#">Mute</a></li>
//        <li><a href="#">Eject</a></li>
//        </ul>
        var popupmenuElement = document.createElement('ul');
        popupmenuElement.className = 'popupmenu';
        popupmenuElement.id
            = 'remote_popupmenu_' + Strophe.getResourceFromJid(jid);
        spanElement.appendChild(popupmenuElement);

        var muteMenuItem = document.createElement('li');
        var muteLinkItem = document.createElement('a');

        var mutedIndicator = "<i class='icon-mic-disabled'></i>";

        if (!mutedAudios[jid]) {
            muteLinkItem.innerHTML = mutedIndicator + 'Mute';
            muteLinkItem.className = 'mutelink';
        }
        else {
            muteLinkItem.innerHTML = mutedIndicator + ' Muted';
            muteLinkItem.className = 'mutelink disabled';
        }

        muteLinkItem.onclick = function(){
            if ($(this).attr('disabled') != undefined) {
                event.preventDefault();
            }
            var isMute = !mutedAudios[jid];
            XMPPActivator.setMute(jid, isMute);
            popupmenuElement.setAttribute('style', 'display:none;');

            if (isMute) {
                this.innerHTML = mutedIndicator + ' Muted';
                this.className = 'mutelink disabled';
            }
            else {
                this.innerHTML = mutedIndicator + ' Mute';
                this.className = 'mutelink';
            }
        };

        muteMenuItem.appendChild(muteLinkItem);
        popupmenuElement.appendChild(muteMenuItem);

        var ejectIndicator = "<i class='fa fa-eject'></i>";

        var ejectMenuItem = document.createElement('li');
        var ejectLinkItem = document.createElement('a');
        ejectLinkItem.innerHTML = ejectIndicator + ' Kick out';
        ejectLinkItem.onclick = function(){
            XMPPActivator.eject(jid);
            popupmenuElement.setAttribute('style', 'display:none;');
        };

        ejectMenuItem.appendChild(ejectLinkItem);
        popupmenuElement.appendChild(ejectMenuItem);
    }

    /**
     * On audio muted event.
     */
    $(document).bind('audiomuted.muc', function (event, jid, isMuted) {
        var videoSpanId = null;
        if (jid === XMPPActivator.getMyJID()) {
            videoSpanId = 'localVideoContainer';
        } else {
            VideoLayout.ensurePeerContainerExists(jid);
            videoSpanId = 'participant_' + Strophe.getResourceFromJid(jid);
        }

        if (XMPPActivator.isFocus()) {
            mutedAudios[jid] = isMuted;
            VideoLayout.updateRemoteVideoMenu(jid, isMuted);
        }

        if (videoSpanId)
            VideoLayout.showAudioIndicator(videoSpanId, isMuted);
    });

    /**
     * On video muted event.
     */
    $(document).bind('videomuted.muc', function (event, jid, isMuted) {
        var videoSpanId = null;
        if (jid === XMPPActivator.getMyJID()) {
            videoSpanId = 'localVideoContainer';
        } else {
            VideoLayout.ensurePeerContainerExists(jid);
            videoSpanId = 'participant_' + Strophe.getResourceFromJid(jid);
        }

        if (videoSpanId)
            VideoLayout.showVideoIndicator(videoSpanId, isMuted);
    });

    /**
     * Display name changed.
     */
    my.onDisplayNameChanged =
                    function (jid, displayName, status) {
        if (jid === 'localVideoContainer'
            || jid === XMPPActivator.getMyJID()) {
            setDisplayName('localVideoContainer',
                           displayName);
        } else {
            VideoLayout.ensurePeerContainerExists(jid);

            setDisplayName(
                'participant_' + Strophe.getResourceFromJid(jid),
                displayName,
                status);
        }
    };

    /**
     * On dominant speaker changed event.
     */
    $(document).bind('dominantspeakerchanged', function (event, resourceJid) {
        // We ignore local user events.
        if (resourceJid
                === Strophe.getResourceFromJid(XMPPActivator.getMyJID()))
            return;

        // Update the current dominant speaker.
        if (resourceJid !== currentDominantSpeaker) {
            var oldSpeakerVideoSpanId = "participant_" + currentDominantSpeaker,
                newSpeakerVideoSpanId = "participant_" + resourceJid;
            if($("#" + oldSpeakerVideoSpanId + ">span.displayname").text() ===
                interfaceConfig.DEFAULT_DOMINANT_SPEAKER_DISPLAY_NAME) {
                setDisplayName(oldSpeakerVideoSpanId, null);
            }
            if($("#" + newSpeakerVideoSpanId + ">span.displayname").text() ===
                interfaceConfig.DEFAULT_REMOTE_DISPLAY_NAME) {
                setDisplayName(newSpeakerVideoSpanId,
                    interfaceConfig.DEFAULT_DOMINANT_SPEAKER_DISPLAY_NAME);
            }
            currentDominantSpeaker = resourceJid;
        } else {
            return;
        }

        // Obtain container for new dominant speaker.
        var container  = document.getElementById(
                'participant_' + resourceJid);

        // Local video will not have container found, but that's ok
        // since we don't want to switch to local video.
        if (container && !VideoLayout.focusedVideoSrc)
        {
            var video = container.getElementsByTagName("video");

            // Update the large video if the video source is already available,
            // otherwise wait for the "videoactive.jingle" event.
            if (video.length && video[0].currentTime > 0)
                VideoLayout.updateLargeVideo(video[0].src);
        }
    });

    /**
     * On last N change event.
     *
     * @param event the event that notified us
     * @param lastNEndpoints the list of last N endpoints
     * @param endpointsEnteringLastN the list currently entering last N
     * endpoints
     */
    $(document).bind('lastnchanged', function ( event,
                                                lastNEndpoints,
                                                endpointsEnteringLastN,
                                                stream) {
        if (lastNCount !== lastNEndpoints.length)
            lastNCount = lastNEndpoints.length;

        lastNEndpointsCache = lastNEndpoints;

        $('#remoteVideos>span').each(function( index, element ) {
            var resourceJid = VideoLayout.getPeerContainerResourceJid(element);

            if (resourceJid
                && lastNEndpoints.length > 0
                && lastNEndpoints.indexOf(resourceJid) < 0) {
                console.log("Remove from last N", resourceJid);
                showPeerContainer(resourceJid, false);
            }
        });

        if (!endpointsEnteringLastN || endpointsEnteringLastN.length < 0)
            endpointsEnteringLastN = lastNEndpoints;

        if (endpointsEnteringLastN && endpointsEnteringLastN.length > 0) {
            endpointsEnteringLastN.forEach(function (resourceJid) {

                if (!$('#participant_' + resourceJid).is(':visible')) {
                    console.log("Add to last N", resourceJid);
                    showPeerContainer(resourceJid, true);

                    dep.UIActivator().getRTCService().remoteStreams.some(function (mediaStream) {
                        if (mediaStream.peerjid
                            && Strophe.getResourceFromJid(mediaStream.peerjid)
                                === resourceJid
                            && mediaStream.type === mediaStream.VIDEO_TYPE) {
                            var sel = $('#participant_' + resourceJid + '>video');

//<<<<<<< HEAD:UI/videolayout.js
//                            attachMediaStream(sel, mediaStream.stream);
//=======
                            var simulcast = new Simulcast();
                            var videoStream = simulcast.getReceivingVideoStream(mediaStream.stream);
                            attachMediaStream(sel, videoStream);
//>>>>>>> master:videolayout.js
                            waitForRemoteVideo(
                                    sel,
                                    mediaStream.ssrc,
                                    mediaStream.stream);
                            return true;
                        }
                    });
                }
            });
        }
    });

    function waitForRemoteVideo(selector, ssrc, stream) {
        if (selector.removed || !selector.parent().is(":visible")) {
            console.warn("Media removed before had started", selector);
            return;
        }

        if (stream.id === 'mixedmslabel') return;

        if (selector[0].currentTime > 0) {
            var simulcast = new Simulcast();
            var videoStream = simulcast.getReceivingVideoStream(stream);
            attachMediaStream(selector, videoStream); // FIXME: why do i have to do this for FF?

            // FIXME: add a class that will associate peer Jid, video.src, it's ssrc and video type
            //        in order to get rid of too many maps
            if (ssrc && selector.attr('src')) {
                videoSrcToSsrc[selector.attr('src')] = ssrc;
            } else {
                console.warn("No ssrc given for video", selector);
            }

            videoActive(selector);
        } else {
            setTimeout(function () {
                waitForRemoteVideo(selector, ssrc, stream);
            }, 250);
        }
    }

    function videoActive(videoelem) {
        if (videoelem.attr('id').indexOf('mixedmslabel') === -1) {
            // ignore mixedmslabela0 and v0

            videoelem.show();
            VideoLayout.resizeThumbnails();

            var videoParent = videoelem.parent();
            var parentResourceJid = null;
            if (videoParent)
                parentResourceJid
                    = VideoLayout.getPeerContainerResourceJid(videoParent[0]);

            // Update the large video to the last added video only if there's no
            // current dominant or focused speaker or update it to the current
            // dominant speaker.
            if ((!VideoLayout.focusedVideoSrc && !VideoLayout.getDominantSpeakerResourceJid())
                || (parentResourceJid
                && VideoLayout.getDominantSpeakerResourceJid()
                    === parentResourceJid)) {
                VideoLayout.updateLargeVideo(videoelem.attr('src'), 1);
            }

            VideoLayout.showFocusIndicator();
        }
    };

    my.resizeVideoSpace = function(rightColumnEl, rightColumnSize, isVisible)
    {
        var videospace = $('#videospace');

        var videospaceWidth = window.innerWidth - rightColumnSize[0];
        var videospaceHeight = window.innerHeight;
        var videoSize
            = getVideoSize(null, null, videospaceWidth, videospaceHeight);
        var videoWidth = videoSize[0];
        var videoHeight = videoSize[1];
        var videoPosition = getVideoPosition(videoWidth,
            videoHeight,
            videospaceWidth,
            videospaceHeight);
        var horizontalIndent = videoPosition[0];
        var verticalIndent = videoPosition[1];

        var thumbnailSize = VideoLayout.calculateThumbnailSize(videospaceWidth);
        var thumbnailsWidth = thumbnailSize[0];
        var thumbnailsHeight = thumbnailSize[1];

        if (isVisible) {
            videospace.animate({right: rightColumnSize[0],
                    width: videospaceWidth,
                    height: videospaceHeight},
                {queue: false,
                    duration: 500});

            $('#remoteVideos').animate({height: thumbnailsHeight},
                {queue: false,
                    duration: 500});

            $('#remoteVideos>span').animate({height: thumbnailsHeight,
                    width: thumbnailsWidth},
                {queue: false,
                    duration: 500,
                    complete: function() {
                        $(document).trigger(
                            "remotevideo.resized",
                            [thumbnailsWidth,
                                thumbnailsHeight]);
                    }});

            $('#largeVideoContainer').animate({ width: videospaceWidth,
                    height: videospaceHeight},
                {queue: false,
                    duration: 500
                });

            $('#largeVideo').animate({  width: videoWidth,
                    height: videoHeight,
                    top: verticalIndent,
                    bottom: verticalIndent,
                    left: horizontalIndent,
                    right: horizontalIndent},
                {   queue: false,
                    duration: 500
                });

            rightColumnEl.hide("slide", { direction: "right",
                queue: false,
                duration: 500});
        }
        else {
            // Undock the toolbar when the chat is shown and if we're in a
            // video mode.
            if (VideoLayout.isLargeVideoVisible())
                dep.Toolbar().dockToolbar(false);

            videospace.animate({right: rightColumnSize[0],
                    width: videospaceWidth,
                    height: videospaceHeight},
                {queue: false,
                    duration: 500,
                    complete: function () {
                        rightColumnEl.trigger('shown');
                    }
                });

            $('#remoteVideos').animate({height: thumbnailsHeight},
                {queue: false,
                    duration: 500});

            $('#remoteVideos>span').animate({height: thumbnailsHeight,
                    width: thumbnailsWidth},
                {queue: false,
                    duration: 500,
                    complete: function() {
                        $(document).trigger(
                            "remotevideo.resized",
                            [thumbnailsWidth, thumbnailsHeight]);
                    }});

            $('#largeVideoContainer').animate({ width: videospaceWidth,
                    height: videospaceHeight},
                {queue: false,
                    duration: 500
                });

            $('#largeVideo').animate({  width: videoWidth,
                    height: videoHeight,
                    top: verticalIndent,
                    bottom: verticalIndent,
                    left: horizontalIndent,
                    right: horizontalIndent},
                {queue: false,
                    duration: 500
                });

            rightColumnEl.show("slide", { direction: "right",
                queue: false,
                duration: 500});
        }
    }

    $(document).bind('simulcastlayerstarted', function(event) {
        var localVideoSelector = $('#' + 'localVideo_' +
            dep.UIActivator().getRTCService().localVideo.getOriginalStream().localVideo.id);
        var simulcast = new Simulcast();
        var stream = simulcast.getLocalVideoStream();

        // Attach WebRTC stream
        attachMediaStream(localVideoSelector, stream);

        localVideoSrc = $(localVideoSelector).attr('src');
    });

    $(document).bind('simulcastlayerstopped', function(event) {
        var localVideoSelector = $('#' + 'localVideo_' +
            dep.UIActivator().getRTCService().localVideo.getOriginalStream().localVideo.id);
        var simulcast = new Simulcast();
        var stream = simulcast.getLocalVideoStream();

        // Attach WebRTC stream
        attachMediaStream(localVideoSelector, stream);

        localVideoSrc = $(localVideoSelector).attr('src');
    });

    /**
     * On simulcast layers changed event.
     */
    $(document).bind('simulcastlayerschanged', function (event, endpointSimulcastLayers) {
        var simulcast = new Simulcast();
        endpointSimulcastLayers.forEach(function (esl) {

            var primarySSRC = esl.simulcastLayer.primarySSRC;
            var msid = simulcast.getRemoteVideoStreamIdBySSRC(primarySSRC);

            // Get session and stream from msid.
            var session, electedStream;
            var i, j, k;


            var remoteStreams = RTCActivator.getRTCService().remoteStreams;
            var remoteStream;

            if (remoteStreams) {
                for (j = 0; j < remoteStreams.length; j++) {
                    remoteStream = remoteStreams[j];

                    if (electedStream) {
                        // stream found, stop.
                        break;
                    }
                    var tracks = remoteStream.getOriginalStream().getVideoTracks();
                    if (tracks) {
                        for (k = 0; k < tracks.length; k++) {
                            var track = tracks[k];

                            if (msid === [remoteStream.id, track.id].join(' ')) {
                                electedStream = new webkitMediaStream([track]);
                                // stream found, stop.
                                break;
                            }
                        }
                    }
                }
            }

            if (electedStream) {
                console.info('Switching simulcast substream.');

                var msidParts = msid.split(' ');
                var selRemoteVideo = $(['#', 'remoteVideo_', remoteStream.sid, '_', msidParts[0]].join(''));

                var updateLargeVideo = (XMPPActivator.getJIDFromSSRC(videoSrcToSsrc[selRemoteVideo.attr('src')])
                    == XMPPActivator.getJIDFromSSRC(videoSrcToSsrc[largeVideoNewSrc]));
                var updateFocusedVideoSrc = (selRemoteVideo.attr('src') == focusedVideoSrc);

                var electedStreamUrl = webkitURL.createObjectURL(electedStream);
                selRemoteVideo.attr('src', electedStreamUrl);
                videoSrcToSsrc[selRemoteVideo.attr('src')] = primarySSRC;

                if (updateLargeVideo) {
                    VideoLayout.updateLargeVideo(electedStreamUrl);
                }

                if (updateFocusedVideoSrc) {
                    focusedVideoSrc = electedStreamUrl;
                }

            } else {
                console.error('Could not find a stream or a session.');
            }
        });
    });

    return my;
}(VideoLayout || {}));

module.exports = VideoLayout;

},{"../service/RTC/RTCBrowserType.js":21,"./ContactList":1,"./UIActivator.js":2,"./UIUtil.js":4,"./chat/Chat":9,"./toolbars/toolbar_toggler":20}],6:[function(require,module,exports){
var updateTimeout;
var animateTimeout;
var RoomNameGenerator = require("../util/roomname_generator");

function setupWelcomePage() {
    $("#domain_name").text(window.location.protocol + "//" + window.location.host + "/");
    $("span[name='appName']").text(brand.appName);
    $("#enter_room_button").click(function()
    {
        enter_room();
    });

    $("#enter_room_field").keydown(function (event) {
        if (event.keyCode === 13) {
            enter_room();
        }
    });

    $("#reload_roomname").click(function () {
        clearTimeout(updateTimeout);
        clearTimeout(animateTimeout);
        update_roomname();
    });

    $("#disable_welcome").click(function () {
        window.localStorage.welcomePageDisabled = $("#disable_welcome").is(":checked");
    });

    update_roomname();
};

function enter_room()
{
    var val = $("#enter_room_field").val();
    if(!val)
        val = $("#enter_room_field").attr("room_name");
    window.location.pathname = "/" + val;
}

function animate(word) {
    var currentVal = $("#enter_room_field").attr("placeholder");
    $("#enter_room_field").attr("placeholder", currentVal + word.substr(0, 1));
    animateTimeout = setTimeout(function() {
        animate(word.substring(1, word.length))
    }, 70);
}


function update_roomname()
{
    var word = RoomNameGenerator.generateRoomWithoutSeparator();
    $("#enter_room_field").attr("room_name", word);
    $("#enter_room_field").attr("placeholder", "");
    animate(word);
    updateTimeout = setTimeout(update_roomname, 10000);

}

module.exports = setupWelcomePage();

},{"../util/roomname_generator":24}],7:[function(require,module,exports){
var VideoLayout = require("../VideoLayout");
var CanvasUtil = require("./CanvasUtil.js");

/**
 * The audio Levels plugin.
 */
var AudioLevels = (function(my) {
    var audioLevelCanvasCache = {};

    my.LOCAL_LEVEL = 'local';

    /**
     * Updates the audio level canvas for the given peerJid. If the canvas
     * didn't exist we create it.
     */
    my.updateAudioLevelCanvas = function (peerJid) {
        var resourceJid = null;
        var videoSpanId = null;
        if (!peerJid)
            videoSpanId = 'localVideoContainer';
        else {
            resourceJid = Strophe.getResourceFromJid(peerJid);

            videoSpanId = 'participant_' + resourceJid;
        }

        videoSpan = document.getElementById(videoSpanId);

        if (!videoSpan) {
            if (resourceJid)
                console.error("No video element for jid", resourceJid);
            else
                console.error("No video element for local video.");

            return;
        }

        var audioLevelCanvas = $('#' + videoSpanId + '>canvas');

        var videoSpaceWidth = $('#remoteVideos').width();
        var thumbnailSize
            = VideoLayout.calculateThumbnailSize(videoSpaceWidth);
        var thumbnailWidth = thumbnailSize[0];
        var thumbnailHeight = thumbnailSize[1];

        if (!audioLevelCanvas || audioLevelCanvas.length === 0) {

            audioLevelCanvas = document.createElement('canvas');
            audioLevelCanvas.className = "audiolevel";
            audioLevelCanvas.style.bottom = "-" + interfaceConfig.CANVAS_EXTRA/2 + "px";
            audioLevelCanvas.style.left = "-" + interfaceConfig.CANVAS_EXTRA/2 + "px";
            resizeAudioLevelCanvas( audioLevelCanvas,
                    thumbnailWidth,
                    thumbnailHeight);

            videoSpan.appendChild(audioLevelCanvas);
        } else {
            audioLevelCanvas = audioLevelCanvas.get(0);

            resizeAudioLevelCanvas( audioLevelCanvas,
                    thumbnailWidth,
                    thumbnailHeight);
        }
    };

    /**
     * Updates the audio level UI for the given resourceJid.
     *
     * @param resourceJid the resource jid indicating the video element for
     * which we draw the audio level
     * @param audioLevel the newAudio level to render
     */
    my.updateAudioLevel = function (resourceJid, audioLevel) {
        drawAudioLevelCanvas(resourceJid, audioLevel);

        var videoSpanId = getVideoSpanId(resourceJid);

        var audioLevelCanvas = $('#' + videoSpanId + '>canvas').get(0);

        if (!audioLevelCanvas)
            return;

        var drawContext = audioLevelCanvas.getContext('2d');

        var canvasCache = audioLevelCanvasCache[resourceJid];

        drawContext.clearRect (0, 0,
                audioLevelCanvas.width, audioLevelCanvas.height);
        drawContext.drawImage(canvasCache, 0, 0);
    };

    /**
     * Resizes the given audio level canvas to match the given thumbnail size.
     */
    function resizeAudioLevelCanvas(audioLevelCanvas,
                                    thumbnailWidth,
                                    thumbnailHeight) {
        audioLevelCanvas.width = thumbnailWidth + interfaceConfig.CANVAS_EXTRA;
        audioLevelCanvas.height = thumbnailHeight + interfaceConfig.CANVAS_EXTRA;
    };

    /**
     * Draws the audio level canvas into the cached canvas object.
     *
     * @param resourceJid the resource jid indicating the video element for
     * which we draw the audio level
     * @param audioLevel the newAudio level to render
     */
    function drawAudioLevelCanvas(resourceJid, audioLevel) {
        if (!audioLevelCanvasCache[resourceJid]) {

            var videoSpanId = getVideoSpanId(resourceJid);

            var audioLevelCanvasOrig = $('#' + videoSpanId + '>canvas').get(0);

            /*
             * FIXME Testing has shown that audioLevelCanvasOrig may not exist.
             * In such a case, the method CanvasUtil.cloneCanvas may throw an
             * error. Since audio levels are frequently updated, the errors have
             * been observed to pile into the console, strain the CPU.
             */
            if (audioLevelCanvasOrig)
            {
                audioLevelCanvasCache[resourceJid]
                    = CanvasUtil.cloneCanvas(audioLevelCanvasOrig);
            }
        }

        var canvas = audioLevelCanvasCache[resourceJid];

        if (!canvas)
            return;

        var drawContext = canvas.getContext('2d');

        drawContext.clearRect(0, 0, canvas.width, canvas.height);

        var shadowLevel = getShadowLevel(audioLevel);

        if (shadowLevel > 0)
            // drawContext, x, y, w, h, r, shadowColor, shadowLevel
            CanvasUtil.drawRoundRectGlow(   drawContext,
                interfaceConfig.CANVAS_EXTRA/2, interfaceConfig.CANVAS_EXTRA/2,
                canvas.width - interfaceConfig.CANVAS_EXTRA,
                canvas.height - interfaceConfig.CANVAS_EXTRA,
                interfaceConfig.CANVAS_RADIUS,
                interfaceConfig.SHADOW_COLOR,
                shadowLevel);
    };

    /**
     * Returns the shadow/glow level for the given audio level.
     *
     * @param audioLevel the audio level from which we determine the shadow
     * level
     */
    function getShadowLevel (audioLevel) {
        var shadowLevel = 0;

        if (audioLevel <= 0.3) {
            shadowLevel = Math.round(interfaceConfig.CANVAS_EXTRA/2*(audioLevel/0.3));
        }
        else if (audioLevel <= 0.6) {
            shadowLevel = Math.round(interfaceConfig.CANVAS_EXTRA/2*((audioLevel - 0.3) / 0.3));
        }
        else {
            shadowLevel = Math.round(interfaceConfig.CANVAS_EXTRA/2*((audioLevel - 0.6) / 0.4));
        }
        return shadowLevel;
    };

    /**
     * Returns the video span id corresponding to the given resourceJid or local
     * user.
     */
    function getVideoSpanId(resourceJid) {
        var videoSpanId = null;
        if (resourceJid === StatisticsActivator.LOCAL_JID)
            videoSpanId = 'localVideoContainer';
        else
            videoSpanId = 'participant_' + resourceJid;

        return videoSpanId;
    };

    /**
     * Indicates that the remote video has been resized.
     */
    $(document).bind('remotevideo.resized', function (event, width, height) {
        var resized = false;
        $('#remoteVideos>span>canvas').each(function() {
            var canvas = $(this).get(0);
            if (canvas.width !== width + interfaceConfig.CANVAS_EXTRA) {
                canvas.width = width + interfaceConfig.CANVAS_EXTRA;
                resized = true;
            }

            if (canvas.heigh !== height + interfaceConfig.CANVAS_EXTRA) {
                canvas.height = height + interfaceConfig.CANVAS_EXTRA;
                resized = true;
            }
        });

        if (resized)
            Object.keys(audioLevelCanvasCache).forEach(function (resourceJid) {
                audioLevelCanvasCache[resourceJid].width
                    = width + interfaceConfig.CANVAS_EXTRA;
                audioLevelCanvasCache[resourceJid].height
                    = height + interfaceConfig.CANVAS_EXTRA;
            });
    });

    return my;

})(AudioLevels || {});

module.exports = AudioLevels;

},{"../VideoLayout":5,"./CanvasUtil.js":8}],8:[function(require,module,exports){
/**
 * Utility class for drawing canvas shapes.
 */
var CanvasUtil = (function(my) {

    /**
     * Draws a round rectangle with a glow. The glowWidth indicates the depth
     * of the glow.
     *
     * @param drawContext the context of the canvas to draw to
     * @param x the x coordinate of the round rectangle
     * @param y the y coordinate of the round rectangle
     * @param w the width of the round rectangle
     * @param h the height of the round rectangle
     * @param glowColor the color of the glow
     * @param glowWidth the width of the glow
     */
    my.drawRoundRectGlow
        = function(drawContext, x, y, w, h, r, glowColor, glowWidth) {

        // Save the previous state of the context.
        drawContext.save();

        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;

        // Draw a round rectangle.
        drawContext.beginPath();
        drawContext.moveTo(x+r, y);
        drawContext.arcTo(x+w, y,   x+w, y+h, r);
        drawContext.arcTo(x+w, y+h, x,   y+h, r);
        drawContext.arcTo(x,   y+h, x,   y,   r);
        drawContext.arcTo(x,   y,   x+w, y,   r);
        drawContext.closePath();

        // Add a shadow around the rectangle
        drawContext.shadowColor = glowColor;
        drawContext.shadowBlur = glowWidth;
        drawContext.shadowOffsetX = 0;
        drawContext.shadowOffsetY = 0;

        // Fill the shape.
        drawContext.fill();

        drawContext.save();

        drawContext.restore();

//      1) Uncomment this line to use Composite Operation, which is doing the
//      same as the clip function below and is also antialiasing the round
//      border, but is said to be less fast performance wise.

//      drawContext.globalCompositeOperation='destination-out';

        drawContext.beginPath();
        drawContext.moveTo(x+r, y);
        drawContext.arcTo(x+w, y,   x+w, y+h, r);
        drawContext.arcTo(x+w, y+h, x,   y+h, r);
        drawContext.arcTo(x,   y+h, x,   y,   r);
        drawContext.arcTo(x,   y,   x+w, y,   r);
        drawContext.closePath();

//      2) Uncomment this line to use Composite Operation, which is doing the
//      same as the clip function below and is also antialiasing the round
//      border, but is said to be less fast performance wise.

//      drawContext.fill();

        // Comment these two lines if choosing to do the same with composite
        // operation above 1 and 2.
        drawContext.clip();
        drawContext.clearRect(0, 0, 277, 200);

        // Restore the previous context state.
        drawContext.restore();
    };

    /**
     * Clones the given canvas.
     *
     * @return the new cloned canvas.
     */
    my.cloneCanvas = function (oldCanvas) {
        /*
         * FIXME Testing has shown that oldCanvas may not exist. In such a case,
         * the method CanvasUtil.cloneCanvas may throw an error. Since audio
         * levels are frequently updated, the errors have been observed to pile
         * into the console, strain the CPU.
         */
        if (!oldCanvas)
            return oldCanvas;

        //create a new canvas
        var newCanvas = document.createElement('canvas');
        var context = newCanvas.getContext('2d');

        //set dimensions
        newCanvas.width = oldCanvas.width;
        newCanvas.height = oldCanvas.height;

        //apply the old canvas to the new one
        context.drawImage(oldCanvas, 0, 0);

        //return the new canvas
        return newCanvas;
    };

    return my;
})(CanvasUtil || {});

module.exports = CanvasUtil;

},{}],9:[function(require,module,exports){
/* global $, Util, connection, nickname:true, getVideoSize, getVideoPosition, showToolbar, processReplacements */
var Replacement = require("./Replacement.js");
var dep = {
    "VideoLayout": function(){ return require("../VideoLayout")},
    "Toolbar": function(){return require("../toolbars/Toolbar")},
    "UIActivator": function () {
        return require("../UIActivator");
    }
};
/**
 * Chat related user interface.
 */
var Chat = (function (my) {
    var notificationInterval = false;
    var unreadMessages = 0;

    /**
     * Initializes chat related interface.
     */
    my.init = function () {
        var storedDisplayName = window.localStorage.displayname;
        var nickname = null;
        if (storedDisplayName) {
            dep.UIActivator().getUIService().setNickname(storedDisplayName);
            nickname = storedDisplayName;
            Chat.setChatConversationMode(true);
        }

        $('#nickinput').keydown(function (event) {
            if (event.keyCode === 13) {
                event.preventDefault();
                var val = Util.escapeHtml(this.value);
                this.value = '';
                if (!dep.UIActivator().getUIService().getNickname()) {
                    dep.UIActivator().getUIService().setNickname(val);
                    window.localStorage.displayname = val;
                    //this should be changed
                    XMPPActivator.addToPresence("displayName", val);
                    Chat.setChatConversationMode(true);

                    return;
                }
            }
        });

        $('#usermsg').keydown(function (event) {
            if (event.keyCode === 13) {
                event.preventDefault();
                var value = this.value;
                $('#usermsg').val('').trigger('autosize.resize');
                this.focus();
                var command = new CommandsProcessor(value);
                if(command.isCommand())
                {
                    command.processCommand();
                }
                else
                {
                    //this should be changed
                    var message = Util.escapeHtml(value);
                    XMPPActivator.sendMessage(message, dep.UIActivator().getUIService().getNickname());
                }
            }
        });

        var onTextAreaResize = function () {
            resizeChatConversation();
            scrollChatToBottom();
        };
        $('#usermsg').autosize({callback: onTextAreaResize});

        $("#chatspace").bind("shown",
            function () {
                scrollChatToBottom();
                unreadMessages = 0;
                setVisualNotification(false);
            });
    };

    /**
     * Appends the given message to the chat conversation.
     */
    my.updateChatConversation = function (from, displayName, message) {
        var divClassName = '';

        if (XMPPActivator.getMyJID() === from) {
            divClassName = "localuser";
        }
        else {
            divClassName = "remoteuser";

            if (!Chat.isVisible()) {
                unreadMessages++;
                Util.playSoundNotification('chatNotification');
                setVisualNotification(true);
            }
        }

        //replace links and smileys
        var escMessage = Util.escapeHtml(message);
        var escDisplayName = Util.escapeHtml(displayName);
        message = Replacement.processReplacements(escMessage);

        $('#chatconversation').append('<div class="' + divClassName + '"><b>' +
                                      escDisplayName + ': </b>' +
                                      message + '</div>');
        $('#chatconversation').animate(
                { scrollTop: $('#chatconversation')[0].scrollHeight}, 1000);
    };

    /**
     * Appends error message to the conversation
     * @param errorMessage the received error message.
     * @param originalText the original message.
     */
    my.chatAddError = function(errorMessage, originalText)
    {
        errorMessage = Util.escapeHtml(errorMessage);
        originalText = Util.escapeHtml(originalText);

        $('#chatconversation').append('<div class="errorMessage"><b>Error: </b>'
            + 'Your message' + (originalText? (' \"'+ originalText + '\"') : "")
            + ' was not sent.' + (errorMessage? (' Reason: ' + errorMessage) : '')
            +  '</div>');
        $('#chatconversation').animate(
            { scrollTop: $('#chatconversation')[0].scrollHeight}, 1000);
    };

    /**
     * Sets the subject to the UI
     * @param subject the subject
     */
    my.chatSetSubject = function(subject)
    {
        if(subject)
            subject = subject.trim();
        $('#subject').html(Replacement.linkify(Util.escapeHtml(subject)));
        if(subject == "")
        {
            $("#subject").css({display: "none"});
        }
        else
        {
            $("#subject").css({display: "block"});
        }
    };

    /**
     * Opens / closes the chat area.
     */
    my.toggleChat = function () {

        var chatspace = $('#chatspace');

        var chatSize = (chatspace.is(":visible")) ? [0, 0] : Chat.getChatSize();
        dep.VideoLayout().resizeVideoSpace(chatspace, chatSize, chatspace.is(":visible"));

        // Fix me: Should be called as callback of show animation

        // Request the focus in the nickname field or the chat input field.
        if ($('#nickname').css('visibility') === 'visible') {
            $('#nickinput').focus();
        } else {
            $('#usermsg').focus();
        }
    };

    /**
     * Sets the chat conversation mode.
     */
    my.setChatConversationMode = function (isConversationMode) {
        if (isConversationMode) {
            $('#nickname').css({visibility: 'hidden'});
            $('#chatconversation').css({visibility: 'visible'});
            $('#usermsg').css({visibility: 'visible'});
            $('#usermsg').focus();
        }
    };

    /**
     * Resizes the chat area.
     */
    my.resizeChat = function () {
        var chatSize = Chat.getChatSize();

        $('#chatspace').width(chatSize[0]);
        $('#chatspace').height(chatSize[1]);

        resizeChatConversation();
    };

    /**
     * Returns the size of the chat.
     */
    my.getChatSize = function () {
        var availableHeight = window.innerHeight;
        var availableWidth = window.innerWidth;

        var chatWidth = 200;
        if (availableWidth * 0.2 < 200)
            chatWidth = availableWidth * 0.2;

        return [chatWidth, availableHeight];
    };

    /**
     * Indicates if the chat is currently visible.
     */
    my.isVisible = function () {
        return $('#chatspace').is(":visible");
    };

    /**
     * Resizes the chat conversation.
     */
    function resizeChatConversation() {
        var usermsgStyleHeight = document.getElementById("usermsg").style.height;
        var usermsgHeight = usermsgStyleHeight
            .substring(0, usermsgStyleHeight.indexOf('px'));

        $('#usermsg').width($('#chatspace').width() - 10);
        $('#chatconversation').width($('#chatspace').width() - 10);
        $('#chatconversation')
            .height(window.innerHeight - 10 - parseInt(usermsgHeight));
    }

    /**
     * Shows/hides a visual notification, indicating that a message has arrived.
     */
    function setVisualNotification(show) {
        var unreadMsgElement = document.getElementById('unreadMessages');

        var glower = $('#chatButton');

        if (unreadMessages) {
            unreadMsgElement.innerHTML = unreadMessages.toString();

            dep.Toolbar().dockToolbar(true);

            var chatButtonElement
                = document.getElementById('chatButton').parentNode;
            var leftIndent = (Util.getTextWidth(chatButtonElement) -
                              Util.getTextWidth(unreadMsgElement)) / 2;
            var topIndent = (Util.getTextHeight(chatButtonElement) -
                             Util.getTextHeight(unreadMsgElement)) / 2 - 3;

            unreadMsgElement.setAttribute(
                    'style',
                    'top:' + topIndent +
                    '; left:' + leftIndent + ';');

            if (!glower.hasClass('icon-chat-simple')) {
                glower.removeClass('icon-chat');
                glower.addClass('icon-chat-simple');
            }
        }
        else {
            unreadMsgElement.innerHTML = '';
            glower.removeClass('icon-chat-simple');
            glower.addClass('icon-chat');
        }

        if (show && !notificationInterval) {
            notificationInterval = window.setInterval(function () {
                glower.toggleClass('active');
            }, 800);
        }
        else if (!show && notificationInterval) {
            window.clearInterval(notificationInterval);
            notificationInterval = false;
            glower.removeClass('active');
        }
    }

    /**
     * Scrolls chat to the bottom.
     */
    function scrollChatToBottom() {
        setTimeout(function () {
            $('#chatconversation').scrollTop(
                    $('#chatconversation')[0].scrollHeight);
        }, 5);
    }

    return my;
}(Chat || {}));

module.exports = Chat;

},{"../UIActivator":2,"../VideoLayout":5,"../toolbars/Toolbar":18,"./Replacement.js":10}],10:[function(require,module,exports){

var Replacement = function()
{
    /**
     * Replaces common smiley strings with images
     */
    function smilify(body)
    {
        if(!body)
            return body;

        body = body.replace(/(:\(|:\(\(|:-\(\(|:-\(|\(sad\))/gi, "<img src="+smiley1+ ">");
        body = body.replace(/(\(angry\))/gi, "<img src="+smiley2+ ">");
        body = body.replace(/(\(n\))/gi, "<img src="+smiley3+ ">");
        body = body.replace(/(:-\)\)|:\)\)|;-\)\)|;\)\)|\(lol\)|:-D|:D|;-D|;D)/gi, "<img src="+smiley4+ ">");
        body = body.replace(/(;-\(\(|;\(\(|;-\(|;\(|:'\(|:'-\(|:~-\(|:~\(|\(upset\))/gi, "<img src="+smiley5+ ">");
        body = body.replace(/(<3|&lt;3|\(L\)|\(l\)|\(H\)|\(h\))/gi, "<img src="+smiley6+ ">");
        body = body.replace(/(\(angel\))/gi, "<img src="+smiley7+ ">");
        body = body.replace(/(\(bomb\))/gi, "<img src="+smiley8+ ">");
        body = body.replace(/(\(chuckle\))/gi, "<img src="+smiley9+ ">");
        body = body.replace(/(\(y\)|\(Y\)|\(ok\))/gi, "<img src="+smiley10+ ">");
        body = body.replace(/(;-\)|;\)|:-\)|:\))/gi, "<img src="+smiley11+ ">");
        body = body.replace(/(\(blush\))/gi, "<img src="+smiley12+ ">");
        body = body.replace(/(:-\*|:\*|\(kiss\))/gi, "<img src="+smiley13+ ">");
        body = body.replace(/(\(search\))/gi, "<img src="+smiley14+ ">");
        body = body.replace(/(\(wave\))/gi, "<img src="+smiley15+ ">");
        body = body.replace(/(\(clap\))/gi, "<img src="+smiley16+ ">");
        body = body.replace(/(\(sick\))/gi, "<img src="+smiley17+ ">");
        body = body.replace(/(:-P|:P|:-p|:p)/gi, "<img src="+smiley18+ ">");
        body = body.replace(/(:-\0|\(shocked\))/gi, "<img src="+smiley19+ ">");
        body = body.replace(/(\(oops\))/gi, "<img src="+smiley20+ ">");

        return body;
    }

    function ReplacementProto() {

    }

    /**
     * Processes links and smileys in "body"
     */
    ReplacementProto.processReplacements = function(body)
    {
        //make links clickable
        body = ReplacementProto.linkify(body);

        //add smileys
        body = smilify(body);

        return body;
    }

    /**
     * Finds and replaces all links in the links in "body"
     * with their <a href=""></a>
     */
    ReplacementProto.linkify = function(inputText)
    {
        var replacedText, replacePattern1, replacePattern2, replacePattern3;

        //URLs starting with http://, https://, or ftp://
        replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
        replacedText = inputText.replace(replacePattern1, '<a href="$1" target="_blank">$1</a>');

        //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
        replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
        replacedText = replacedText.replace(replacePattern2, '$1<a href="http://$2" target="_blank">$2</a>');

        //Change email addresses to mailto:: links.
        replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
        replacedText = replacedText.replace(replacePattern3, '<a href="mailto:$1">$1</a>');

        return replacedText;
    }
    return ReplacementProto;
}();

module.exports = Replacement;




},{}],11:[function(require,module,exports){
module.exports=require(9)
},{"../UIActivator":2,"../VideoLayout":5,"../toolbars/Toolbar":18,"./Replacement.js":10}],12:[function(require,module,exports){
/* global $, config, Prezi, Util, connection, setLargeVideoVisible, dockToolbar */
var Prezi = require("../prezi/Prezi.js");
var UIUtil = require("../UIUtil.js");
var ToolbarToggler = require("../toolbars/toolbar_toggler");

var Etherpad = (function (my) {
    var etherpadName = null;
    var etherpadIFrame = null;
    var domain = null;
    var options = "?showControls=true&showChat=false&showLineNumbers=true&useMonospaceFont=false";

    /**
     * Initializes the etherpad.
     */
    my.init = function (name) {

        if (config.etherpad_base && !etherpadName) {

            domain = config.etherpad_base;

            if (!name) {
                // In case we're the focus we generate the name.
                etherpadName = Math.random().toString(36).substring(7) +
                                '_' + (new Date().getTime()).toString();
                shareEtherpad();
            }
            else
                etherpadName = name;

            enableEtherpadButton();
        }
    };

    /**
     * Opens/hides the Etherpad.
     */
    my.toggleEtherpad = function (isPresentation) {
        if (!etherpadIFrame)
            createIFrame();

        var largeVideo = null;
        if (Prezi.isPresentationVisible())
            largeVideo = $('#presentation>iframe');
        else
            largeVideo = $('#largeVideo');

        if ($('#etherpad>iframe').css('visibility') === 'hidden') {
            largeVideo.fadeOut(300, function () {
                if (Prezi.isPresentationVisible()) {
                    largeVideo.css({opacity: '0'});
                } else {
                    VideoLayout.setLargeVideoVisible(false);
                    ToolbarToggler.dockToolbar(true);
                }

                $('#etherpad>iframe').fadeIn(300, function () {
                    document.body.style.background = '#eeeeee';
                    $('#etherpad>iframe').css({visibility: 'visible'});
                    $('#etherpad').css({zIndex: 2});
                });
            });
        }
        else if ($('#etherpad>iframe')) {
            $('#etherpad>iframe').fadeOut(300, function () {
                $('#etherpad>iframe').css({visibility: 'hidden'});
                $('#etherpad').css({zIndex: 0});
                document.body.style.background = 'black';
                if (!isPresentation) {
                    $('#largeVideo').fadeIn(300, function () {
                        VideoLayout.setLargeVideoVisible(true);
                        ToolbarToggler.dockToolbar(false);
                    });
                }
            });
        }
        resize();
    };

    /**
     * Resizes the etherpad.
     */
    function resize() {
        if ($('#etherpad>iframe').length) {
            var remoteVideos = $('#remoteVideos');
            var availableHeight
                = window.innerHeight - remoteVideos.outerHeight();
            console.log(UIUtil);
            var availableWidth = UIUtil.getAvailableVideoWidth();

            $('#etherpad>iframe').width(availableWidth);
            $('#etherpad>iframe').height(availableHeight);
        }
    }

    /**
     * Shares the Etherpad name with other participants.
     */
    function shareEtherpad() {
        XMPPActivator.addToPresence("etherpad", etherpadName);
    }

    /**
     * Creates the Etherpad button and adds it to the toolbar.
     */
    function enableEtherpadButton() {
        if (!$('#etherpadButton').is(":visible"))
            $('#etherpadButton').css({display: 'inline-block'});
    }

    /**
     * Creates the IFrame for the etherpad.
     */
    function createIFrame() {
        etherpadIFrame = document.createElement('iframe');
        etherpadIFrame.src = domain + etherpadName + options;
        etherpadIFrame.frameBorder = 0;
        etherpadIFrame.scrolling = "no";
        etherpadIFrame.width = $('#largeVideoContainer').width() || 640;
        etherpadIFrame.height = $('#largeVideoContainer').height() || 480;
        etherpadIFrame.setAttribute('style', 'visibility: hidden;');

        document.getElementById('etherpad').appendChild(etherpadIFrame);
    }

    /**
     * On Etherpad added to muc.
     */
    $(document).bind('etherpadadded.muc', function (event, jid, etherpadName) {
        console.log("Etherpad added", etherpadName);
        if (config.etherpad_base && !XMPPActivator.isFocus()) {
            Etherpad.init(etherpadName);
        }
    });

    /**
     * On focus changed event.
     */
    $(document).bind('focusechanged.muc', function (event, focus) {
        console.log("Focus changed");
        if (config.etherpad_base)
            shareEtherpad();
    });

    /**
     * On video selected event.
     */
    $(document).bind('video.selected', function (event, isPresentation) {
        if (!config.etherpad_base)
            return;

        if (etherpadIFrame && etherpadIFrame.style.visibility !== 'hidden')
            Etherpad.toggleEtherpad(isPresentation);
    });

    /**
     * Resizes the etherpad, when the window is resized.
     */
    $(window).resize(function () {
        resize();
    });

    return my;
}(Etherpad || {}));

module.exports = Etherpad;

},{"../UIUtil.js":4,"../prezi/Prezi.js":14,"../toolbars/toolbar_toggler":20}],13:[function(require,module,exports){
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
                if(!RTCActivator.getRTCService().localAudio.isMuted()) {
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
        if(!($(":focus").is("input[type=text]") || $(":focus").is("textarea"))) {
            var keycode = e.which;
            if (typeof shortcuts[keycode] === "object") {
                shortcuts[keycode].function();
            } else if (keycode >= "0".charCodeAt(0) && keycode <= "9".charCodeAt(0)) {
                var remoteVideos = $(".videocontainer:not(#mixedstream)"),
                    videoWanted = keycode - "0".charCodeAt(0) + 1;
                if (remoteVideos.length > videoWanted) {
                    remoteVideos[videoWanted].click();
                }
            }
        }
    };

    window.onkeydown = function(e) {
        if($("#chatspace").css("display") === "none") {
            if(e.which === "T".charCodeAt(0)) {
                if(RTCActivator.getRTCService().localAudio.isMuted()) {
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

},{"./toolbars/BottomToolbar":17,"./toolbars/Toolbar":18}],14:[function(require,module,exports){
var PreziPlayer = require("./PreziPlayer.js");
var UIUtil = require("../UIUtil.js");
var ToolbarToggler = require("../toolbars/toolbar_toggler");

var Prezi = (function (my) {
    var preziPlayer = null;

    /**
     * Reloads the current presentation.
     */
    my.reloadPresentation = function() {
        var iframe = document.getElementById(preziPlayer.options.preziId);
        iframe.src = iframe.src;
    };

    /**
     * Shows/hides a presentation.
     */
    my.setPresentationVisible = function (visible) {
        if (visible) {
            // Trigger the video.selected event to indicate a change in the
            // large video.
            $(document).trigger("video.selected", [true]);

            $('#largeVideo').fadeOut(300, function () {
                VideoLayout.setLargeVideoVisible(false);
                $('#presentation>iframe').fadeIn(300, function() {
                    $('#presentation>iframe').css({opacity:'1'});
                    ToolbarToggler.dockToolbar(true);
                });
            });
        }
        else {
            if ($('#presentation>iframe').css('opacity') == '1') {
                $('#presentation>iframe').fadeOut(300, function () {
                    $('#presentation>iframe').css({opacity:'0'});
                    $('#reloadPresentation').css({display:'none'});
                    $('#largeVideo').fadeIn(300, function() {
                        VideoLayout.setLargeVideoVisible(true);
                        ToolbarToggler.dockToolbar(false);
                    });
                });
            }
        }
    };

    /**
     * Returns <tt>true</tt> if the presentation is visible, <tt>false</tt> -
     * otherwise.
     */
    my.isPresentationVisible = function () {
        return ($('#presentation>iframe') != null
                && $('#presentation>iframe').css('opacity') == 1);
    };

    /**
     * Opens the Prezi dialog, from which the user could choose a presentation
     * to load.
     */
    my.openPreziDialog = function() {
        var myprezi = XMPPActivator.getPrezi();
        if (myprezi) {
            messageHandler.openTwoButtonDialog("Remove Prezi",
                "Are you sure you would like to remove your Prezi?",
                false,
                "Remove",
                function(e,v,m,f) {
                    if(v) {
                        XMPPActivator.removeFromPresence("prezi");
                    }
                }
            );
        }
        else if (preziPlayer != null) {
            messageHandler.openTwoButtonDialog("Share a Prezi",
                "Another participant is already sharing a Prezi." +
                    "This conference allows only one Prezi at a time.",
                false,
                "Ok",
                function(e,v,m,f) {
                    $.prompt.close();
                }
            );
        }
        else {
            var openPreziState = {
                state0: {
                    html:   '<h2>Share a Prezi</h2>' +
                            '<input id="preziUrl" type="text" ' +
                            'placeholder="e.g. ' +
                            'http://prezi.com/wz7vhjycl7e6/my-prezi" autofocus>',
                    persistent: false,
                    buttons: { "Share": true , "Cancel": false},
                    defaultButton: 1,
                    submit: function(e,v,m,f){
                        e.preventDefault();
                        if(v)
                        {
                            var preziUrl = document.getElementById('preziUrl');

                            if (preziUrl.value)
                            {
                                var urlValue
                                    = encodeURI(Util.escapeHtml(preziUrl.value));

                                if (urlValue.indexOf('http://prezi.com/') != 0
                                    && urlValue.indexOf('https://prezi.com/') != 0)
                                {
                                    $.prompt.goToState('state1');
                                    return false;
                                }
                                else {
                                    var presIdTmp = urlValue.substring(
                                            urlValue.indexOf("prezi.com/") + 10);
                                    if (!isAlphanumeric(presIdTmp)
                                            || presIdTmp.indexOf('/') < 2) {
                                        $.prompt.goToState('state1');
                                        return false;
                                    }
                                    else {

                                        XMPPActivator.addToPresence("prezi", urlValue);
                                        $.prompt.close();
                                    }
                                }
                            }
                        }
                        else
                            $.prompt.close();
                    }
                },
                state1: {
                    html:   '<h2>Share a Prezi</h2>' +
                            'Please provide a correct prezi link.',
                    persistent: false,
                    buttons: { "Back": true, "Cancel": false },
                    defaultButton: 1,
                    submit:function(e,v,m,f) {
                        e.preventDefault();
                        if(v==0)
                            $.prompt.close();
                        else
                            $.prompt.goToState('state0');
                    }
                }
            };
            var focusPreziUrl =  function(e) {
                    document.getElementById('preziUrl').focus();
                };
            messageHandler.openDialogWithStates(openPreziState, focusPreziUrl, focusPreziUrl);
        }
    };

    /**
     * A new presentation has been added.
     * 
     * @param event the event indicating the add of a presentation
     * @param jid the jid from which the presentation was added
     * @param presUrl url of the presentation
     * @param currentSlide the current slide to which we should move
     */
    var presentationAdded = function(event, jid, presUrl, currentSlide) {
        console.log("presentation added", presUrl);

        var presId = getPresentationId(presUrl);

        var elementId = 'participant_'
                        + Strophe.getResourceFromJid(jid)
                        + '_' + presId;

        // We explicitly don't specify the peer jid here, because we don't want
        // this video to be dealt with as a peer related one (for example we
        // don't want to show a mute/kick menu for this one, etc.).
        VideoLayout.addRemoteVideoContainer(null, elementId);
        VideoLayout.resizeThumbnails();

        var controlsEnabled = false;
        if (jid === XMPPActivator.getMyJID())
            controlsEnabled = true;

        Prezi.setPresentationVisible(true);
        $('#largeVideoContainer').hover(
            function (event) {
                if (Prezi.isPresentationVisible()) {
                    var reloadButtonRight = window.innerWidth
                        - $('#presentation>iframe').offset().left
                        - $('#presentation>iframe').width();

                    $('#reloadPresentation').css({  right: reloadButtonRight,
                                                    display:'inline-block'});
                }
            },
            function (event) {
                if (!Prezi.isPresentationVisible())
                    $('#reloadPresentation').css({display:'none'});
                else {
                    var e = event.toElement || event.relatedTarget;

                    if (e && e.id != 'reloadPresentation' && e.id != 'header')
                        $('#reloadPresentation').css({display:'none'});
                }
            });

        preziPlayer = new PreziPlayer(
                    'presentation',
                    {preziId: presId,
                    width: getPresentationWidth(),
                    height: getPresentationHeihgt(),
                    controls: controlsEnabled,
                    debug: true
                    });

        $('#presentation>iframe').attr('id', preziPlayer.options.preziId);

        preziPlayer.on(PreziPlayer.EVENT_STATUS, function(event) {
            console.log("prezi status", event.value);
            if (event.value == PreziPlayer.STATUS_CONTENT_READY) {
                if (jid != XMPPActivator.getMyJID())
                    preziPlayer.flyToStep(currentSlide);
            }
        });

        preziPlayer.on(PreziPlayer.EVENT_CURRENT_STEP, function(event) {
            console.log("event value", event.value);
            XMPPActivator.addToPresence("preziSlide", event.value);
        });

        $("#" + elementId).css( 'background-image',
                                'url(../images/avatarprezi.png)');
        $("#" + elementId).click(
            function () {
                Prezi.setPresentationVisible(true);
            }
        );
    };

    /**
     * A presentation has been removed.
     * 
     * @param event the event indicating the remove of a presentation
     * @param jid the jid for which the presentation was removed
     * @param the url of the presentation
     */
    var presentationRemoved = function (event, jid, presUrl) {
        console.log('presentation removed', presUrl);
        var presId = getPresentationId(presUrl);
        Prezi.setPresentationVisible(false);
        $('#participant_'
                + Strophe.getResourceFromJid(jid)
                + '_' + presId).remove();
        $('#presentation>iframe').remove();
        if (preziPlayer != null) {
            preziPlayer.destroy();
            preziPlayer = null;
        }
    };

    /**
     * Indicates if the given string is an alphanumeric string.
     * Note that some special characters are also allowed (-, _ , /, &, ?, =, ;) for the
     * purpose of checking URIs.
     */
    function isAlphanumeric(unsafeText) {
        var regex = /^[a-z0-9-_\/&\?=;]+$/i;
        return regex.test(unsafeText);
    }

    /**
     * Returns the presentation id from the given url.
     */
    function getPresentationId (presUrl) {
        var presIdTmp = presUrl.substring(presUrl.indexOf("prezi.com/") + 10);
        return presIdTmp.substring(0, presIdTmp.indexOf('/'));
    }

    /**
     * Returns the presentation width.
     */
    function getPresentationWidth() {
        var availableWidth = UIUtil.getAvailableVideoWidth();
        var availableHeight = getPresentationHeihgt();

        var aspectRatio = 16.0 / 9.0;
        if (availableHeight < availableWidth / aspectRatio) {
            availableWidth = Math.floor(availableHeight * aspectRatio);
        }
        return availableWidth;
    }

    /**
     * Returns the presentation height.
     */
    function getPresentationHeihgt() {
        var remoteVideos = $('#remoteVideos');
        return window.innerHeight - remoteVideos.outerHeight();
    }

    /**
     * Resizes the presentation iframe.
     */
    function resize() {
        if ($('#presentation>iframe')) {
            $('#presentation>iframe').width(getPresentationWidth());
            $('#presentation>iframe').height(getPresentationHeihgt());
        }
    }

    /**
     * Presentation has been removed.
     */
    $(document).bind('presentationremoved.muc', presentationRemoved);

    /**
     * Presentation has been added.
     */
    $(document).bind('presentationadded.muc', presentationAdded);

    /*
     * Indicates presentation slide change.
     */
    $(document).bind('gotoslide.muc', function (event, jid, presUrl, current) {
        if (preziPlayer && preziPlayer.getCurrentStep() != current) {
            preziPlayer.flyToStep(current);

            var animationStepsArray = preziPlayer.getAnimationCountOnSteps();
            for (var i = 0; i < parseInt(animationStepsArray[current]); i++) {
                preziPlayer.flyToStep(current, i);
            }
        }
    });

    /**
     * On video selected event.
     */
    $(document).bind('video.selected', function (event, isPresentation) {
        if (!isPresentation && $('#presentation>iframe'))
            Prezi.setPresentationVisible(false);
    });

    $(window).resize(function () {
        resize();
    });

    return my;
}(Prezi || {}));

module.exports = Prezi;

},{"../UIUtil.js":4,"../toolbars/toolbar_toggler":20,"./PreziPlayer.js":15}],15:[function(require,module,exports){
module.exports = (function() {
    "use strict";
    var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

    var PreziPlayer = (function() {

        PreziPlayer.API_VERSION = 1;
        PreziPlayer.CURRENT_STEP = 'currentStep';
        PreziPlayer.CURRENT_ANIMATION_STEP = 'currentAnimationStep';
        PreziPlayer.CURRENT_OBJECT = 'currentObject';
        PreziPlayer.STATUS_LOADING = 'loading';
        PreziPlayer.STATUS_READY = 'ready';
        PreziPlayer.STATUS_CONTENT_READY = 'contentready';
        PreziPlayer.EVENT_CURRENT_STEP = "currentStepChange";
        PreziPlayer.EVENT_CURRENT_ANIMATION_STEP = "currentAnimationStepChange";
        PreziPlayer.EVENT_CURRENT_OBJECT = "currentObjectChange";
        PreziPlayer.EVENT_STATUS = "statusChange";
        PreziPlayer.EVENT_PLAYING = "isAutoPlayingChange";
        PreziPlayer.EVENT_IS_MOVING = "isMovingChange";
        PreziPlayer.domain = "https://prezi.com";
        PreziPlayer.path = "/player/";
        PreziPlayer.players = {};
        PreziPlayer.binded_methods = ['changesHandler'];

        PreziPlayer.createMultiplePlayers = function(optionArray){
            for(var i=0; i<optionArray.length; i++) {
                var optionSet = optionArray[i];
                new PreziPlayer(optionSet.id, optionSet);
            };
        };

        PreziPlayer.messageReceived = function(event){
            var message, item, player;
            try {
                message = JSON.parse(event.data);
            } catch (e) {}
            if (message.id && (player = PreziPlayer.players[message.id])){
                if (player.options.debug === true) {
                    if (console && console.log) console.log('received', message);
                }
                if (message.type === "changes"){
                    player.changesHandler(message);
                }
                for (var i=0; i<player.callbacks.length; i++) {
                    item = player.callbacks[i];
                    if (item && message.type === item.event){
                        item.callback(message);
                    }
                }
            }
        };

        function PreziPlayer(id, options) {
            var params, paramString = "", _this = this;
            if (PreziPlayer.players[id]){
                PreziPlayer.players[id].destroy();
            }
            for(var i=0; i<PreziPlayer.binded_methods.length; i++) {
                var method_name = PreziPlayer.binded_methods[i];
                _this[method_name] = __bind(_this[method_name], _this);
            };
            options = options || {};
            this.options = options;
            this.values = {'status': PreziPlayer.STATUS_LOADING};
            this.values[PreziPlayer.CURRENT_STEP] = 0;
            this.values[PreziPlayer.CURRENT_ANIMATION_STEP] = 0;
            this.values[PreziPlayer.CURRENT_OBJECT] = null;
            this.callbacks = [];
            this.id = id;
            this.embedTo = document.getElementById(id);
            if (!this.embedTo) {
                throw "The element id is not available.";
            }
            this.iframe = document.createElement('iframe');
            params = [
                { name: 'oid', value: options.preziId },
                { name: 'explorable', value: options.explorable ? 1 : 0 },
                { name: 'controls', value: options.controls ? 1 : 0 }
            ];
            for(var i=0; i<params.length; i++) {
                var param = params[i];
                paramString += (i===0 ? "?" : "&") + param.name + "=" + param.value;
            };
            this.iframe.src = PreziPlayer.domain + PreziPlayer.path + paramString;
            this.iframe.frameBorder = 0;
            this.iframe.scrolling = "no";
            this.iframe.width = options.width || 640;
            this.iframe.height = options.height || 480;
            this.embedTo.innerHTML = '';
            // JITSI: IN CASE SOMETHING GOES WRONG.
            try {
                this.embedTo.appendChild(this.iframe);
            }
            catch (err) {
                console.log("CATCH ERROR");
            }

            // JITSI: Increase interval from 200 to 500, which fixes prezi
            // crashes for us.
            this.initPollInterval = setInterval(function(){
                _this.sendMessage({'action': 'init'});
            }, 500);
            PreziPlayer.players[id] = this;
        }

        PreziPlayer.prototype.changesHandler = function(message) {
            var key, value, j, item;
            if (this.initPollInterval) {
                clearInterval(this.initPollInterval);
                this.initPollInterval = false;
            }
            for (key in message.data) {
                if (message.data.hasOwnProperty(key)){
                    value = message.data[key];
                    this.values[key] = value;
                    for (j=0; j<this.callbacks.length; j++) {
                        item = this.callbacks[j];
                        if (item && item.event === key + "Change"){
                            item.callback({type: item.event, value: value});
                        }
                    }
                }
            }
        };

        PreziPlayer.prototype.destroy = function() {
            if (this.initPollInterval) {
                clearInterval(this.initPollInterval);
                this.initPollInterval = false;
            }
            this.embedTo.innerHTML = '';
        };

        PreziPlayer.prototype.sendMessage = function(message) {
            if (this.options.debug === true) {
                if (console && console.log) console.log('sent', message);
            }
            message.version = PreziPlayer.API_VERSION;
            message.id = this.id;
            return this.iframe.contentWindow.postMessage(JSON.stringify(message), '*');
        };

        PreziPlayer.prototype.nextStep = /* nextStep is DEPRECATED */
        PreziPlayer.prototype.flyToNextStep = function() {
            return this.sendMessage({
                'action': 'present',
                'data': ['moveToNextStep']
            });
        };

        PreziPlayer.prototype.previousStep = /* previousStep is DEPRECATED */
        PreziPlayer.prototype.flyToPreviousStep = function() {
            return this.sendMessage({
                'action': 'present',
                'data': ['moveToPrevStep']
            });
        };

        PreziPlayer.prototype.toStep = /* toStep is DEPRECATED */
        PreziPlayer.prototype.flyToStep = function(step, animation_step) {
            var obj = this;
            // check animation_step
            if (animation_step > 0 &&
                obj.values.animationCountOnSteps &&
                obj.values.animationCountOnSteps[step] <= animation_step) {
                animation_step = obj.values.animationCountOnSteps[step];
            }
            // jump to animation steps by calling flyToNextStep()
            function doAnimationSteps() {
                if (obj.values.isMoving == true) {
                    setTimeout(doAnimationSteps, 100); // wait until the flight ends
                    return;
                }
                while (animation_step-- > 0) {
                    obj.flyToNextStep(); // do the animation steps
                }
            }
            setTimeout(doAnimationSteps, 200); // 200ms is the internal "reporting" time
            // jump to the step
            return this.sendMessage({
                'action': 'present',
                'data': ['moveToStep', step]
            });
        };

        PreziPlayer.prototype.toObject = /* toObject is DEPRECATED */
        PreziPlayer.prototype.flyToObject = function(objectId) {
            return this.sendMessage({
                'action': 'present',
                'data': ['moveToObject', objectId]
            });
        };

        PreziPlayer.prototype.play = function(defaultDelay) {
            return this.sendMessage({
                'action': 'present',
                'data': ['startAutoPlay', defaultDelay]
            });
        };

        PreziPlayer.prototype.stop = function() {
            return this.sendMessage({
                'action': 'present',
                'data': ['stopAutoPlay']
            });
        };

        PreziPlayer.prototype.pause = function(defaultDelay) {
            return this.sendMessage({
                'action': 'present',
                'data': ['pauseAutoPlay', defaultDelay]
            });
        };

        PreziPlayer.prototype.getCurrentStep = function() {
            return this.values.currentStep;
        };

        PreziPlayer.prototype.getCurrentAnimationStep = function() {
            return this.values.currentAnimationStep;
        };

        PreziPlayer.prototype.getCurrentObject = function() {
            return this.values.currentObject;
        };

        PreziPlayer.prototype.getStatus = function() {
            return this.values.status;
        };

        PreziPlayer.prototype.isPlaying = function() {
            return this.values.isAutoPlaying;
        };

        PreziPlayer.prototype.getStepCount = function() {
            return this.values.stepCount;
        };

        PreziPlayer.prototype.getAnimationCountOnSteps = function() {
            return this.values.animationCountOnSteps;
        };

        PreziPlayer.prototype.getTitle = function() {
            return this.values.title;
        };

        PreziPlayer.prototype.setDimensions = function(dims) {
            for (var parameter in dims) {
                this.iframe[parameter] = dims[parameter];
            }
        }

        PreziPlayer.prototype.getDimensions = function() {
            return {
                width: parseInt(this.iframe.width, 10),
                height: parseInt(this.iframe.height, 10)
            }
        }

        PreziPlayer.prototype.on = function(event, callback) {
            this.callbacks.push({
                event: event,
                callback: callback
            });
        };

        PreziPlayer.prototype.off = function(event, callback) {
            var j, item;
            if (event === undefined) {
                this.callbacks = [];
            }
            j = this.callbacks.length;
            while (j--) {
                item = this.callbacks[j];
                if (item && item.event === event && (callback === undefined || item.callback === callback)){
                    this.callbacks.splice(j, 1);
                }
            }
        };

        if (window.addEventListener) {
            window.addEventListener('message', PreziPlayer.messageReceived, false);
        } else {
            window.attachEvent('onmessage', PreziPlayer.messageReceived);
        }

        return PreziPlayer;

    })();

    return PreziPlayer;
})();

},{}],16:[function(require,module,exports){
module.exports=require(14)
},{"../UIUtil.js":4,"../toolbars/toolbar_toggler":20,"./PreziPlayer.js":15}],17:[function(require,module,exports){
var ContactList = require("./../ContactList.js");
var Chat = require("./../chat/chat.js");
var buttonClick = require("../UIUtil").buttonClick;

var BottomToolbar = (function (my) {

    var buttonHandlers = {
        "bottomtoolbar_button_chat": function()
        {
            return BottomToolbar.toggleChat();
        },
        "bottomtoolbar_button_contact": function () {
            return BottomToolbar.toggleContactList();
        },
        "bottomtoolbar_button_filmstrip": function () {
            return BottomToolbar.toggleFilmStrip();
        }
    };

    my.init = function () {
        for(var k in buttonHandlers)
            $("#" + k).click(buttonHandlers[k]);
    }
    my.toggleChat = function() {
        if (ContactList.isVisible()) {
            buttonClick("#contactListButton", "active");
            ContactList.toggleContactList();
        }

        buttonClick("#chatBottomButton", "active");

        Chat.toggleChat();
    };

    my.toggleContactList = function() {
        if (Chat.isVisible()) {
            buttonClick("#chatBottomButton", "active");
            Chat.toggleChat();
        }

        buttonClick("#contactListButton", "active");

        ContactList.toggleContactList();
    };

    my.toggleFilmStrip = function() {
        var filmstrip = $("#remoteVideos");
        filmstrip.toggleClass("hidden");
    };


    $(document).bind("remotevideo.resized", function (event, width, height) {
        var bottom = (height - $('#bottomToolbar').outerHeight())/2 + 18;

        $('#bottomToolbar').css({bottom: bottom + 'px'});
    });

    return my;
}(BottomToolbar || {}));

module.exports = BottomToolbar;

},{"../UIUtil":4,"./../ContactList.js":1,"./../chat/chat.js":11}],18:[function(require,module,exports){
var BottomToolbar = require("./BottomToolbar");
var Prezi = require("./../prezi/prezi");
var Etherpad = require("./../etherpad/Etherpad");
var buttonClick = require("../UIUtil").buttonClick;

var Toolbar = (function (my) {

    var toolbarTimeout = null;

    var roomUrl = null;

    var recordingToken = '';

    var buttonHandlers = {
        "toolbar_button_mute": function () {
            return Toolbar.toggleAudio();
        },
        "toolbar_button_camera": function () {
            buttonClick("#video", "icon-camera icon-camera-disabled");
            return toggleVideo();
        },
        "toolbar_button_record": function () {
            return toggleRecording();
        }
        ,
        "toolbar_button_security": function () {
            return Toolbar.openLockDialog();
        },
        "toolbar_button_link": function () {
            return Toolbar.openLinkDialog();
        },
        "toolbar_button_chat": function () {
            return BottomToolbar.toggleChat();
        },
        "toolbar_button_prezi": function () {
            return Prezi.openPreziDialog();
        },
        "toolbar_button_etherpad": function () {
            return Etherpad.toggleEtherpad(0);
        },
        "toolbar_button_desktopsharing": function () {
            return toggleScreenSharing();
        },
        "toolbar_button_fullScreen": function()
        {
            buttonClick("#fullScreen", "icon-full-screen icon-exit-full-screen");
            return Toolbar.toggleFullScreen();
        },
        "toolbar_button_sip": function () {
            return callSipButtonClicked();
        },
        "toolbar_button_hangup": function () {
            return hangup();
        }
    }

    my.sharedKey = '';
    my.preMuted = false;

    function setRecordingToken(token) {
        recordingToken = token;
    }

    function callSipButtonClicked()
    {
        messageHandler.openTwoButtonDialog(null,
                '<h2>Enter SIP number</h2>' +
                '<input id="sipNumber" type="text"' +
                ' value="' + config.defaultSipNumber + '" autofocus>',
            false,
            "Dial",
            function (e, v, m, f) {
                if (v) {
                    var numberInput = document.getElementById('sipNumber');
                    if (numberInput.value) {
                        XMPPActivator.sipDial(
                            numberInput.value, 'fromnumber', UIActivator.getUIService().getRoomName());
                    }
                }
            },
            function (event) {
                document.getElementById('sipNumber').focus();
            }
        );
    }


    // Starts or stops the recording for the conference.
    function toggleRecording() {
        if(!XMPPActivator.isFocus())
        {
            console.log('non-focus: not enabling recording');
            return;
        }

        XMPPActivator.setRecording(
            recordingToken,
            function (state, oldState) {
                console.log("New recording state: ", state);
                if (state == oldState) //failed to change, reset the token because it might have been wrong
                {
                    Toolbar.toggleRecordingButtonState();
                    setRecordingToken(null);
                }
                else
                {
                    Toolbar.toggleRecordingButtonState();
                }
            },function() {
                if (!recordingToken) {
                    messageHandler.openTwoButtonDialog(null,
                            '<h2>Enter recording token</h2>' +
                            '<input id="recordingToken" type="text" placeholder="token" autofocus>',
                        false,
                        "Save",
                        function (e, v, m, f) {
                            if (v) {
                                var token = document.getElementById('recordingToken');

                                if (token.value) {
                                    setRecordingToken(Util.escapeHtml(token.value));
                                    toggleRecording();
                                }
                            }
                        },
                        function (event) {
                            document.getElementById('recordingToken').focus();
                        }
                    );

                }
            }
        );


    }

    function hangup() {
        XMPPActivator.disposeConference(false, function () {
            var buttons = {};
            if(config.enableWelcomePage)
            {
                setTimeout(function()
                {
                    window.localStorage.welcomePageDisabled = false;
                    window.location.pathname = "/";
                }, 10000);

            }

            $.prompt("Session Terminated",
                {
                    title: "You hung up the call",
                    persistent: true,
                    buttons: {
                        "Join again": true
                    },
                    closeText: '',
                    submit: function(event, value, message, formVals)
                    {
                        window.location.reload();
                        return false;
                    }

                }
            );
        }, true);


    }

    /**
     * Sets the shared key.
     */
    my.setSharedKey = function(sKey) {
        Toolbar.sharedKey = sKey;
    }

    /**
     * Locks / unlocks the room.
     */
    function lockRoom(lock) {
        var key = '';
        if (lock)
            key = Toolbar.sharedKey;

        XMPPActivator.lockRoom(key);

        Toolbar.updateLockButton();
    }

    //sets onclick handlers
    my.init = function () {
        for(var k in buttonHandlers)
            $("#" + k).click(buttonHandlers[k]);
    }


    my.changeToolbarVideoIcon = function (isMuted) {
        if (isMuted) {
            $('#video').removeClass("icon-camera");
            $('#video').addClass("icon-camera icon-camera-disabled");
        } else {
            $('#video').removeClass("icon-camera icon-camera-disabled");
            $('#video').addClass("icon-camera");
        }
    }

    my.toggleVideo = function () {
        buttonClick("#video", "icon-camera icon-camera-disabled");

        XMPPActivator.toggleVideoMute(
            function (isMuted) {
                Toolbar.changeToolbarVideoIcon(isMuted);

            }
        );
    }

    /**
     * Mutes / unmutes audio for the local participant.
     */
    my.toggleAudio = function () {
        if (!(RTCActivator.getRTCService().localAudio)) {
            Toolbar.preMuted = true;
            // We still click the button.
            buttonClick("#mute", "icon-microphone icon-mic-disabled");
            return;
        }

        XMPPActivator.toggleAudioMute(function () {
            buttonClick("#mute", "icon-microphone icon-mic-disabled");
        });

    }

    /**
     * Opens the lock room dialog.
     */
    my.openLockDialog = function () {
        // Only the focus is able to set a shared key.
        if (!XMPPActivator.isFocus()) {
            if (Toolbar.sharedKey) {
                messageHandler.openMessageDialog(null,
                        "This conversation is currently protected by" +
                        " a shared secret key.",
                    false,
                    "Secret key");
            } else {
                messageHandler.openMessageDialog(null,
                    "This conversation isn't currently protected by" +
                        " a secret key. Only the owner of the conference" +
                        " could set a shared key.",
                    false,
                    "Secret key");
            }
        } else {
            if (Toolbar.sharedKey) {
                messageHandler.openTwoButtonDialog(null,
                    "Are you sure you would like to remove your secret key?",
                    false,
                    "Remove",
                    function (e, v) {
                        if (v) {
                            Toolbar.setSharedKey('');
                            lockRoom(false);
                        }
                    });
            } else {
                messageHandler.openTwoButtonDialog(null,
                    '<h2>Set a secret key to lock your room</h2>' +
                        '<input id="lockKey" type="text"' +
                        'placeholder="your shared key" autofocus>',
                    false,
                    "Save",
                    function (e, v) {
                        if (v) {
                            var lockKey = document.getElementById('lockKey');

                            if (lockKey.value) {
                                Toolbar.setSharedKey(Util.escapeHtml(lockKey.value));
                                lockRoom(true);
                            }
                        }
                    },
                    function () {
                        document.getElementById('lockKey').focus();
                    }
                );
            }
        }
    };

    /**
     * Updates the room invite url.
     */
    my.updateRoomUrl = function(newRoomUrl) {
        roomUrl = newRoomUrl;

        // If the invite dialog has been already opened we update the information.
        var inviteLink = document.getElementById('inviteLinkRef');
        if (inviteLink) {
            inviteLink.value = roomUrl;
            inviteLink.select();
            document.getElementById('jqi_state0_buttonInvite').disabled = false;
        }
    }

    /**
     * Opens the invite link dialog.
     */
    my.openLinkDialog = function () {
        var inviteLink;
        if (roomUrl == null) {
            inviteLink = "Your conference is currently being created...";
        } else {
            inviteLink = encodeURI(roomUrl);
        }
        messageHandler.openTwoButtonDialog(
            "Share this link with everyone you want to invite",
            '<input id="inviteLinkRef" type="text" value="' +
                inviteLink + '" onclick="this.select();" readonly>',
            false,
            "Invite",
            function (e, v) {
                if (v) {
                    if (roomUrl) {
                        inviteParticipants();
                    }
                }
            },
            function () {
                if (roomUrl) {
                    document.getElementById('inviteLinkRef').select();
                } else {
                    document.getElementById('jqi_state0_buttonInvite')
                        .disabled = true;
                }
            }
        );
    };

    /**
     * Invite participants to conference.
     */
    function inviteParticipants() {
        if (roomUrl == null)
            return;

        var sharedKeyText = "";
        if (Toolbar.sharedKey && Toolbar.sharedKey.length > 0) {
            sharedKeyText =
                "This conference is password protected. Please use the " +
                "following pin when joining:%0D%0A%0D%0A" +
                    Toolbar.sharedKey + "%0D%0A%0D%0A";
        }

        var conferenceName = roomUrl.substring(roomUrl.lastIndexOf('/') + 1);
        var subject = "Invitation to a Jitsi Meet (" + conferenceName + ")";
        var body = "Hey there, I%27d like to invite you to a Jitsi Meet" +
                    " conference I%27ve just set up.%0D%0A%0D%0A" +
                    "Please click on the following link in order" +
                    " to join the conference.%0D%0A%0D%0A" +
                    roomUrl +
                    "%0D%0A%0D%0A" +
                    sharedKeyText +
                    "Note that Jitsi Meet is currently only supported by Chromium," +
                    " Google Chrome and Opera, so you need" +
                    " to be using one of these browsers.%0D%0A%0D%0A" +
                    "Talk to you in a sec!";

        if (window.localStorage.displayname) {
            body += "%0D%0A%0D%0A" + window.localStorage.displayname;
        }

        window.open("mailto:?subject=" + subject + "&body=" + body, '_blank');
    }

    /**
     * Opens the settings dialog.
     */
    my.openSettingsDialog = function () {
        messageHandler.openTwoButtonDialog(
            '<h2>Configure your conference</h2>' +
                '<input type="checkbox" id="initMuted">' +
                'Participants join muted<br/>' +
                '<input type="checkbox" id="requireNicknames">' +
                'Require nicknames<br/><br/>' +
                'Set a secret key to lock your room:' +
                '<input id="lockKey" type="text" placeholder="your shared key"' +
                'autofocus>',
            null,
            false,
            "Save",
            function () {
                document.getElementById('lockKey').focus();
            },
            function (e, v) {
                if (v) {
                    if ($('#initMuted').is(":checked")) {
                        // it is checked
                    }

                    if ($('#requireNicknames').is(":checked")) {
                        // it is checked
                    }
                    /*
                    var lockKey = document.getElementById('lockKey');

                    if (lockKey.value) {
                        setSharedKey(lockKey.value);
                        lockRoom(true);
                    }
                    */
                }
            }
        );
    };

    /**
     * Toggles the application in and out of full screen mode
     * (a.k.a. presentation mode in Chrome).
     */
    my.toggleFullScreen = function() {
        var fsElement = document.documentElement;

        if (!document.mozFullScreen && !document.webkitIsFullScreen) {
            //Enter Full Screen
            if (fsElement.mozRequestFullScreen) {
                fsElement.mozRequestFullScreen();
            }
            else {
                fsElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
            }
        } else {
            //Exit Full Screen
            if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else {
                document.webkitCancelFullScreen();
            }
        }
    };
    /**
     * Updates the lock button state.
     */
    my.updateLockButton = function() {
        buttonClick("#lockIcon", "icon-security icon-security-locked");
    };

    // Shows or hides the 'recording' button.
    my.showRecordingButton = function (show) {
        if (!config.enableRecording) {
            return;
        }

        if (show) {
            $('#recording').css({display: "inline"});
        }
        else {
            $('#recording').css({display: "none"});
        }
    };

    // Toggle the state of the recording button
    my.toggleRecordingButtonState = function() {
        $('#recordButton').toggleClass('active');
    };

    // Shows or hides SIP calls button
    my.showSipCallButton = function(show){
        if (config.hosts.call_control && show) {
            $('#sipCallButton').css({display: "inline"});
        } else {
            $('#sipCallButton').css({display: "none"});
        }
    };

    return my;
}(Toolbar || {}));

module.exports = Toolbar;

},{"../UIUtil":4,"./../etherpad/Etherpad":12,"./../prezi/prezi":16,"./BottomToolbar":17}],19:[function(require,module,exports){
module.exports=require(18)
},{"../UIUtil":4,"./../etherpad/Etherpad":12,"./../prezi/prezi":16,"./BottomToolbar":17}],20:[function(require,module,exports){
var Toolbar = require("./toolbar");

var ToolbarToggler = (function(my) {
    var toolbarTimeoutObject,
        toolbarTimeout = interfaceConfig.INITIAL_TOOLBAR_TIMEOUT;

    /**
     * Shows the main toolbar.
     */
    my.showToolbar = function() {
        var header = $("#header"),
            bottomToolbar = $("#bottomToolbar");
        if (!header.is(':visible') || !bottomToolbar.is(":visible")) {
            header.show("slide", { direction: "up", duration: 300});
            $('#subject').animate({top: "+=40"}, 300);
            if(!bottomToolbar.is(":visible")) {
                bottomToolbar.show("slide", {direction: "right",duration: 300});
            }

            if (toolbarTimeoutObject) {
                clearTimeout(toolbarTimeoutObject);
                toolbarTimeoutObject = null;
            }
            toolbarTimeoutObject = setTimeout(hideToolbar, toolbarTimeout);
            toolbarTimeout = interfaceConfig.TOOLBAR_TIMEOUT;
        }

        if (XMPPActivator.isFocus())
        {
//            TODO: Enable settings functionality. Need to uncomment the settings button in index.html.
//            $('#settingsButton').css({visibility:"visible"});
        }

        // Show/hide desktop sharing button
        showDesktopSharingButton();
    };

    /**
     * Hides the toolbar.
     */
    var hideToolbar = function () {
        var header = $("#header"),
            bottomToolbar = $("#bottomToolbar");
        var isToolbarHover = false;
        header.find('*').each(function () {
            var id = $(this).attr('id');
            if ($("#" + id + ":hover").length > 0) {
                isToolbarHover = true;
            }
        });
        if($("#bottomToolbar:hover").length > 0) {
                isToolbarHover = true;
        }

        clearTimeout(toolbarTimeoutObject);
        toolbarTimeoutObject = null;

        if (!isToolbarHover) {
            header.hide("slide", { direction: "up", duration: 300});
            $('#subject').animate({top: "-=40"}, 300);
            if($("#remoteVideos").hasClass("hidden")) {
                bottomToolbar.hide("slide", {direction: "right", duration: 300});
            }
        }
        else {
            toolbarTimeoutObject = setTimeout(hideToolbar, toolbarTimeout);
        }
    };


    /**
     * Docks/undocks the toolbar.
     *
     * @param isDock indicates what operation to perform
     */
    my.dockToolbar = function(isDock) {
        if (isDock) {
            // First make sure the toolbar is shown.
            if (!$('#header').is(':visible')) {
                ToolbarToggler.showToolbar();
            }

            // Then clear the time out, to dock the toolbar.
            if (toolbarTimeoutObject) {
                clearTimeout(toolbarTimeoutObject);
                toolbarTimeoutObject = null;
            }
        }
        else {
            if (!$('#header').is(':visible')) {
                ToolbarToggler.showToolbar();
            }
            else {
                toolbarTimeoutObject = setTimeout(hideToolbar, toolbarTimeout);
            }
        }
    };


    return my;
}(ToolbarToggler || {}));

module.exports = ToolbarToggler;

},{"./toolbar":19}],21:[function(require,module,exports){
var RTCBrowserType = {
    RTC_BROWSER_CHROME: "rtc_browser.chrome",

    RTC_BROWSER_FIREFOX: "rtc_browser.firefox"
};

module.exports = RTCBrowserType;
},{}],22:[function(require,module,exports){
var StreamEventTypes = {
    EVENT_TYPE_LOCAL_CREATED: "stream.local_created",

    EVENT_TYPE_LOCAL_ENDED: "stream.local_ended",

    EVENT_TYPE_REMOTE_CREATED: "stream.remote_created",

    EVENT_TYPE_REMOTE_ENDED: "stream.remote_ended"
};

module.exports = StreamEventTypes;
},{}],23:[function(require,module,exports){
/**
 * Created by hristo on 10/29/14.
 */
var XMPPEvents = {
    CONFERENCE_CERATED: "xmpp.conferenceCreated.jingle",
    CALL_TERMINATED: "xmpp.callterminated.jingle",
    CALL_INCOMING: "xmpp.callincoming.jingle",
    DISPOSE_CONFERENCE: "xmpp.dispoce_confernce",
    DISPLAY_NAME_CHANGED: "xmpp.display_name_changed"

};
module.exports = XMPPEvents;
},{}],24:[function(require,module,exports){
var RoomNameGenerator = function(my) {


    /**
     * Constructs new RoomNameGenerator object.
     * @constructor constructs new RoomNameGenerator object.
     */
    function RoomNameGeneratorProto()
    {

    }

    /**
     * Default separator the words in the room name
     * @type {string}
     */
    var DEFAULT_SEPARATOR = "-";

    /**
     * Default number of words in the room name.
     * @type {number}
     */
    var NUMBER_OF_WORDS = 3;


    /**
     * The list with words.
     * @type {string[]}
     */
    var words = [
        "definite", "indefinite", "articles", "name", "preposition", "help", "very", "to", "through", "and", "just",
        "a", "form", "in", "sentence", "is", "great", "it", "think", "you", "say", "that", "help", "he", "low", "was",
        "line", "for", "differ", "on", "turn", "are", "cause", "with", "much", "as", "mean", "before", "his", "move",
        "they", "right", "be", "boy", "at", "old", "one", "too", "have", "same", "this", "tell", "from", "does", "or",
        "set", "had", "three", "by", "want", "hot", "air", "word", "well", "but", "also", "what", "play", "some", "small",
        "we", "end", "can", "put", "out", "home", "other", "read", "were", "hand", "all", "port", "there", "large",
        "when", "spell", "up", "add", "use", "even", "your", "land", "how", "here", "said", "must", "an", "big", "each",
        "high", "she", "such", "which", "follow", "do", "act", "their", "why", "time", "ask", "if", "men", "will", "change",
        "way", "went", "about", "light", "many", "kind", "then", "off", "them", "need", "write", "house", "would",
        "picture", "like", "try", "so", "us", "these", "again", "her", "animal", "long", "point", "make", "mother",
        "thing", "world", "see", "near", "him", "build", "two", "self", "has", "earth", "look", "father", "more", "head",
        "day", "stand", "could", "own", "go", "page", "come", "should", "did", "country", "number", "found", "sound",
        "answer", "no", "school", "most", "grow", "people", "study", "my", "still", "over", "learn", "know", "plant",
        "water", "cover", "than", "food", "call", "sun", "first", "four", "who", "between", "may", "state", "down",
        "keep", "side", "eye", "been", "never", "now", "last", "find", "let", "any", "thought", "new", "city", "work",
        "tree", "part", "cross", "take", "farm", "get", "hard", "place", "start", "made", "might", "live", "story",
        "where", "saw", "after", "far", "back", "sea", "little", "draw", "only", "left", "round", "late", "man", "run",
        "year", "don't", "came", "while", "show", "press", "every", "close", "good", "night", "me", "real", "give",
        "life", "our", "few", "under", "north", "open", "ten", "seem", "simple", "together", "several", "next", "vowel",
        "white", "toward", "children", "war", "begin", "lay", "got", "against", "walk", "pattern", "example", "slow",
        "ease", "center", "paper", "love", "group", "person", "always", "money", "music", "serve", "those", "appear",
        "both", "road", "mark", "map", "often", "rain", "letter", "rule", "until", "govern", "mile", "pull", "river",
        "cold", "car", "notice", "feet", "voice", "care", "unit", "second", "power", "book", "town", "carry", "fine",
        "took", "certain", "science", "fly", "eat", "fall", "room", "lead", "friend", "cry", "began", "dark", "idea",
        "machine", "fish", "note", "mountain", "wait", "stop", "plan", "once", "figure", "base", "star", "hear", "box",
        "horse", "noun", "cut", "field", "sure", "rest", "watch", "correct", "color", "able", "face", "pound", "wood",
        "done", "main", "beauty", "enough", "drive", "plain", "stood", "girl", "contain", "usual", "front", "young",
        "teach", "ready", "week", "above", "final", "ever", "gave", "red", "green", "list", "oh", "though", "quick",
        "feel", "develop", "talk", "ocean", "bird", "warm", "soon", "free", "body", "minute", "dog", "strong", "family",
        "special", "direct", "mind", "pose", "behind", "leave", "clear", "song", "tail", "measure", "produce", "door",
        "fact", "product", "street", "black", "inch", "short", "multiply", "numeral", "nothing", "class", "course", "wind",
        "stay", "question", "wheel", "happen", "full", "complete", "force", "ship", "blue", "area", "object", "half",
        "decide", "rock", "surface", "order", "deep", "fire", "moon", "south", "island", "problem", "foot", "piece",
        "system", "told", "busy", "knew", "test", "pass", "record", "since", "boat", "top", "common", "whole", "gold",
        "king", "possible", "space", "plane", "heard", "stead", "best", "dry", "hour", "wonder", "better", "laugh",
        "true", "thousand", "during", "ago", "hundred", "ran", "five", "check", "remember", "game", "step", "shape",
        "early", "equate", "hold", "hot", "west", "miss", "ground", "brought", "interest", "heat", "reach", "snow",
        "fast", "tire", "verb", "bring", "sing", "yes", "listen", "distant", "six", "fill", "table", "east", "travel",
        "paint", "less", "language", "morning", "among", "grand", "cat", "ball", "century", "yet", "consider", "wave",
        "type", "drop", "law", "heart", "bit", "am", "coast", "present", "copy", "heavy", "phrase", "dance", "silent",
        "engine", "tall", "position", "sand", "arm", "soil", "wide", "roll", "sail", "temperature", "material", "finger",
        "size", "industry", "vary", "value", "settle", "fight", "speak", "lie", "weight", "beat", "general", "excite",
        "ice", "natural", "matter", "view", "circle", "sense", "pair", "ear", "include", "else", "divide", "quite",
        "syllable", "broke", "felt", "case", "perhaps", "middle", "pick", "kill", "sudden", "son", "count", "lake",
        "square", "moment", "reason", "scale", "length", "loud", "represent", "spring", "art", "observe", "subject",
        "child", "region", "straight", "energy", "consonant", "hunt", "nation", "probable", "dictionary", "bed", "milk",
        "brother", "speed", "egg", "method", "ride", "organ", "cell", "pay", "believe", "age", "fraction", "section",
        "forest", "dress", "sit", "cloud", "race", "surprise", "window", "quiet", "store", "stone", "summer", "tiny",
        "train", "climb", "sleep", "cool", "prove", "design", "lone", "poor", "leg", "lot", "exercise", "experiment",
        "wall", "bottom", "catch", "key", "mount", "iron", "wish", "single", "sky", "stick", "board", "flat", "joy",
        "twenty", "winter", "skin", "sat", "smile", "written", "crease", "wild", "hole", "instrument", "trade", "kept",
        "melody", "glass", "trip", "grass", "office", "cow", "receive", "job", "row", "edge", "mouth", "sign", "exact",
        "visit", "symbol", "past", "die", "soft", "least", "fun", "trouble", "bright", "shout", "gas", "except",
        "weather", "wrote", "month", "seed", "million", "tone", "bear", "join", "finish", "suggest", "happy", "clean",
        "hope", "break", "flower", "lady", "clothe", "yard", "strange", "rise", "gone", "bad", "jump", "blow", "baby",
        "oil", "eight", "blood", "village", "touch", "meet", "grew", "root", "cent", "buy", "mix", "raise", "team",
        "solve", "wire", "metal", "cost", "whether", "lost", "push", "brown", "seven", "wear", "paragraph", "garden",
        "third", "equal", "shall", "sent", "held", "choose", "hair", "fell", "describe", "fit", "cook", "flow", "floor",
        "fair", "either", "bank", "result", "collect", "burn", "save", "hill", "control", "safe", "decimal", "rank",
        "word", "reference", "gentle", "truck", "woman", "noise", "captain", "level",
        "practice", "chance", "separate", "gather", "difficult", "shop", "doctor", "stretch", "please", "throw",
        "protect", "shine", "noon", "property", "whose", "column", "locate", "molecule", "ring", "select", "character",
        "wrong", "insect", "gray", "caught", "repeat", "period", "require", "indicate", "broad", "radio", "prepare",
        "spoke", "salt", "atom", "nose", "human", "plural", "history", "anger", "effect", "claim", "electric",
        "continent", "expect", "oxygen", "crop", "sugar", "modern", "death", "element", "pretty", "hit", "skill",
        "student", "women", "corner", "season", "party", "solution", "supply", "magnet", "bone", "silver", "rail",
        "thank", "imagine", "branch", "provide", "match", "agree", "suffix", "thus", "especially", "capital", "fig",
        "won't", "afraid", "chair", "huge", "danger", "sister", "fruit", "steel", "rich", "discuss", "thick", "forward",
        "soldier", "similar", "process", "guide", "operate", "experience", "guess", "score", "necessary", "apple",
        "sharp", "bought", "wing", "led", "create", "pitch", "neighbor", "coat", "wash", "mass", "bat", "card", "rather",
        "band", "crowd", "rope", "corn", "slip", "compare", "win", "poem", "dream", "string", "evening", "bell",
        "condition", "depend", "feed", "meat", "tool", "rub", "total", "tube", "basic", "famous", "smell", "dollar",
        "valley", "stream", "nor", "fear", "double", "sight", "seat", "thin", "arrive", "triangle", "master", "planet",
        "track", "hurry", "parent", "chief", "shore", "colony", "division", "clock", "sheet", "mine", "substance", "tie",
        "favor", "enter", "connect", "major", "post", "fresh", "spend", "search", "chord", "send", "fat", "yellow",
        "glad", "gun", "original", "allow", "share", "print", "station", "dead", "dad", "spot", "bread", "desert",
        "charge", "suit", "proper", "current", "bar", "lift", "offer", "rose", "segment", "continue", "slave", "block",
        "duck", "chart", "instant", "hat", "market", "sell", "degree", "success", "populate", "company", "chick",
        "subtract", "dear", "event", "enemy", "particular", "reply", "deal", "drink", "swim", "occur", "term", "support",
        "opposite", "speech", "wife", "nature", "shoe", "range", "shoulder", "steam", "spread", "motion", "arrange",
        "path", "camp", "liquid", "invent", "log", "cotton", "meant", "born", "quotient", "determine", "teeth", "quart",
        "shell", "nine", "neck", "fancy", "fan", "football"
    ];

    /**
     * Returns random word from the array of words.
     * @returns {string} random word from the array of words.
     */
    function generateWord()
    {
        return words[Math.floor(Math.random() * words.length)];
    }

    /**
     * Generates new room name.
     * @param separator the separator for the words.
     * @param number_of_words number of words in the room name
     * @returns {string} the room name
     */
    RoomNameGeneratorProto.generateRoom = function(separator, number_of_words)
    {
        if(!separator)
            separator = DEFAULT_SEPARATOR;
        if(!number_of_words)
            number_of_words = NUMBER_OF_WORDS;
        var name = "";
        for(var i = 0; i<number_of_words; i++)
            name += ((i != 0)? separator : "") + generateWord();
        return name;
    }

    /**
     * Generates new room name.
     * @param number_of_words number of words in the room name
     * @returns {string} the room name
     */
    RoomNameGeneratorProto.generateRoomWithoutSeparator = function(number_of_words)
    {
        if(!number_of_words)
            number_of_words = NUMBER_OF_WORDS;
        var name = "";
        for(var i = 0; i<number_of_words; i++) {
            var word = generateWord();
            word = word.substring(0, 1).toUpperCase() + word.substring(1, word.length);
            name += word ;
        }
        return name;
    }

    return RoomNameGeneratorProto;
}();


},{}],25:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}]},{},[2])(2)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9Db250YWN0TGlzdC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL1VJQWN0aXZhdG9yLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvVUlTZXJ2aWNlLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvVUlVdGlsLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvVmlkZW9MYXlvdXQuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9XZWxjb21lUGFnZS5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL2F1ZGlvbGV2ZWxzL0F1ZGlvTGV2ZWxzLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvYXVkaW9sZXZlbHMvQ2FudmFzVXRpbC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL2NoYXQvQ2hhdC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL2NoYXQvUmVwbGFjZW1lbnQuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9ldGhlcnBhZC9FdGhlcnBhZC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL2tleWJvYXJkX3Nob3J0Y3V0LmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvcHJlemkvUHJlemkuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9wcmV6aS9QcmV6aVBsYXllci5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL3Rvb2xiYXJzL0JvdHRvbVRvb2xiYXIuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS90b29sYmFycy9Ub29sYmFyLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvdG9vbGJhcnMvdG9vbGJhcl90b2dnbGVyLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvc2VydmljZS9SVEMvUlRDQnJvd3NlclR5cGUuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9zZXJ2aWNlL1JUQy9TdHJlYW1FdmVudFR5cGVzLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvc2VydmljZS94bXBwL1hNUFBFdmVudHMuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC91dGlsL3Jvb21uYW1lX2dlbmVyYXRvci5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDek5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3BTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNsZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBWaWRlb0xheW91dCA9IHJlcXVpcmUoXCIuL1ZpZGVvTGF5b3V0LmpzXCIpO1xuXG4vKipcbiAqIENvbnRhY3QgbGlzdC5cbiAqL1xudmFyIENvbnRhY3RMaXN0ID0gKGZ1bmN0aW9uIChteSkge1xuICAgIC8qKlxuICAgICAqIEluZGljYXRlcyBpZiB0aGUgY2hhdCBpcyBjdXJyZW50bHkgdmlzaWJsZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gPHR0PnRydWU8L3R0PiBpZiB0aGUgY2hhdCBpcyBjdXJyZW50bHkgdmlzaWJsZSwgPHR0PmZhbHNlPC90dD4gLVxuICAgICAqIG90aGVyd2lzZVxuICAgICAqL1xuICAgIG15LmlzVmlzaWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICQoJyNjb250YWN0bGlzdCcpLmlzKFwiOnZpc2libGVcIik7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYSBjb250YWN0IGZvciB0aGUgZ2l2ZW4gcGVlckppZCBpZiBzdWNoIGRvZXNuJ3QgeWV0IGV4aXN0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHBlZXJKaWQgdGhlIHBlZXJKaWQgY29ycmVzcG9uZGluZyB0byB0aGUgY29udGFjdFxuICAgICAqL1xuICAgIG15LmVuc3VyZUFkZENvbnRhY3QgPSBmdW5jdGlvbihwZWVySmlkKSB7XG4gICAgICAgIHZhciByZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHBlZXJKaWQpO1xuXG4gICAgICAgIHZhciBjb250YWN0ID0gJCgnI2NvbnRhY3RsaXN0PnVsPmxpW2lkPVwiJyArIHJlc291cmNlSmlkICsgJ1wiXScpO1xuXG4gICAgICAgIGlmICghY29udGFjdCB8fCBjb250YWN0Lmxlbmd0aCA8PSAwKVxuICAgICAgICAgICAgQ29udGFjdExpc3QuYWRkQ29udGFjdChwZWVySmlkKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQWRkcyBhIGNvbnRhY3QgZm9yIHRoZSBnaXZlbiBwZWVyIGppZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBwZWVySmlkIHRoZSBqaWQgb2YgdGhlIGNvbnRhY3QgdG8gYWRkXG4gICAgICovXG4gICAgbXkuYWRkQ29udGFjdCA9IGZ1bmN0aW9uKHBlZXJKaWQpIHtcbiAgICAgICAgdmFyIHJlc291cmNlSmlkID0gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQocGVlckppZCk7XG5cbiAgICAgICAgdmFyIGNvbnRhY3RsaXN0ID0gJCgnI2NvbnRhY3RsaXN0PnVsJyk7XG5cbiAgICAgICAgdmFyIG5ld0NvbnRhY3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuICAgICAgICBuZXdDb250YWN0LmlkID0gcmVzb3VyY2VKaWQ7XG5cbiAgICAgICAgbmV3Q29udGFjdC5hcHBlbmRDaGlsZChjcmVhdGVBdmF0YXIoKSk7XG4gICAgICAgIG5ld0NvbnRhY3QuYXBwZW5kQ2hpbGQoY3JlYXRlRGlzcGxheU5hbWVQYXJhZ3JhcGgoXCJQYXJ0aWNpcGFudFwiKSk7XG5cbiAgICAgICAgdmFyIGNsRWxlbWVudCA9IGNvbnRhY3RsaXN0LmdldCgwKTtcblxuICAgICAgICBpZiAocmVzb3VyY2VKaWQgPT09IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKFhNUFBBY3RpdmF0b3IuZ2V0TXlKSUQoKSlcbiAgICAgICAgICAgICYmICQoJyNjb250YWN0bGlzdD51bCAudGl0bGUnKVswXS5uZXh0U2libGluZy5uZXh0U2libGluZylcbiAgICAgICAge1xuICAgICAgICAgICAgY2xFbGVtZW50Lmluc2VydEJlZm9yZShuZXdDb250YWN0LFxuICAgICAgICAgICAgICAgICAgICAkKCcjY29udGFjdGxpc3Q+dWwgLnRpdGxlJylbMF0ubmV4dFNpYmxpbmcubmV4dFNpYmxpbmcpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY2xFbGVtZW50LmFwcGVuZENoaWxkKG5ld0NvbnRhY3QpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYSBjb250YWN0IGZvciB0aGUgZ2l2ZW4gcGVlciBqaWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGVlckppZCB0aGUgcGVlckppZCBjb3JyZXNwb25kaW5nIHRvIHRoZSBjb250YWN0IHRvIHJlbW92ZVxuICAgICAqL1xuICAgIG15LnJlbW92ZUNvbnRhY3QgPSBmdW5jdGlvbihwZWVySmlkKSB7XG4gICAgICAgIHZhciByZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHBlZXJKaWQpO1xuXG4gICAgICAgIHZhciBjb250YWN0ID0gJCgnI2NvbnRhY3RsaXN0PnVsPmxpW2lkPVwiJyArIHJlc291cmNlSmlkICsgJ1wiXScpO1xuXG4gICAgICAgIGlmIChjb250YWN0ICYmIGNvbnRhY3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdmFyIGNvbnRhY3RsaXN0ID0gJCgnI2NvbnRhY3RsaXN0PnVsJyk7XG5cbiAgICAgICAgICAgIGNvbnRhY3RsaXN0LmdldCgwKS5yZW1vdmVDaGlsZChjb250YWN0LmdldCgwKSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogT3BlbnMgLyBjbG9zZXMgdGhlIGNvbnRhY3QgbGlzdCBhcmVhLlxuICAgICAqL1xuICAgIG15LnRvZ2dsZUNvbnRhY3RMaXN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY29udGFjdGxpc3QgPSAkKCcjY29udGFjdGxpc3QnKTtcblxuICAgICAgICB2YXIgY2hhdFNpemUgPSAoQ29udGFjdExpc3QuaXNWaXNpYmxlKCkpID8gWzAsIDBdIDogQ29udGFjdExpc3QuZ2V0Q29udGFjdExpc3RTaXplKCk7XG4gICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZVZpZGVvU3BhY2UoY29udGFjdGxpc3QsIGNoYXRTaXplLCBDb250YWN0TGlzdC5pc1Zpc2libGUoKSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHNpemUgb2YgdGhlIGNoYXQuXG4gICAgICovXG4gICAgbXkuZ2V0Q29udGFjdExpc3RTaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYXZhaWxhYmxlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICB2YXIgYXZhaWxhYmxlV2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aDtcblxuICAgICAgICB2YXIgY2hhdFdpZHRoID0gMjAwO1xuICAgICAgICBpZiAoYXZhaWxhYmxlV2lkdGggKiAwLjIgPCAyMDApXG4gICAgICAgICAgICBjaGF0V2lkdGggPSBhdmFpbGFibGVXaWR0aCAqIDAuMjtcblxuICAgICAgICByZXR1cm4gW2NoYXRXaWR0aCwgYXZhaWxhYmxlSGVpZ2h0XTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyB0aGUgYXZhdGFyIGVsZW1lbnQuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHRoZSBuZXdseSBjcmVhdGVkIGF2YXRhciBlbGVtZW50XG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlQXZhdGFyKCkge1xuICAgICAgICB2YXIgYXZhdGFyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaScpO1xuICAgICAgICBhdmF0YXIuY2xhc3NOYW1lID0gXCJpY29uLWF2YXRhciBhdmF0YXJcIjtcblxuICAgICAgICByZXR1cm4gYXZhdGFyO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIHRoZSBkaXNwbGF5IG5hbWUgcGFyYWdyYXBoLlxuICAgICAqXG4gICAgICogQHBhcmFtIGRpc3BsYXlOYW1lIHRoZSBkaXNwbGF5IG5hbWUgdG8gc2V0XG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlRGlzcGxheU5hbWVQYXJhZ3JhcGgoZGlzcGxheU5hbWUpIHtcbiAgICAgICAgdmFyIHAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG4gICAgICAgIHAuaW5uZXJIVE1MID0gZGlzcGxheU5hbWU7XG5cbiAgICAgICAgcmV0dXJuIHA7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEluZGljYXRlcyB0aGF0IHRoZSBkaXNwbGF5IG5hbWUgaGFzIGNoYW5nZWQuXG4gICAgICovXG4gICAgbXkub25EaXNwbGF5TmFtZUNoYW5nZWQgPVxuICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKHBlZXJKaWQsIGRpc3BsYXlOYW1lKSB7XG4gICAgICAgIGlmIChwZWVySmlkID09PSAnbG9jYWxWaWRlb0NvbnRhaW5lcicpXG4gICAgICAgICAgICBwZWVySmlkID0gWE1QUEFjdGl2YXRvci5nZXRNeUpJRCgpO1xuXG4gICAgICAgIHZhciByZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHBlZXJKaWQpO1xuXG4gICAgICAgIHZhciBjb250YWN0TmFtZSA9ICQoJyNjb250YWN0bGlzdCAjJyArIHJlc291cmNlSmlkICsgJz5wJyk7XG5cbiAgICAgICAgaWYgKGNvbnRhY3ROYW1lICYmIGRpc3BsYXlOYW1lICYmIGRpc3BsYXlOYW1lLmxlbmd0aCA+IDApXG4gICAgICAgICAgICBjb250YWN0TmFtZS5odG1sKGRpc3BsYXlOYW1lKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIG15O1xufShDb250YWN0TGlzdCB8fCB7fSkpO1xubW9kdWxlLmV4cG9ydHMgPSBDb250YWN0TGlzdCIsInZhciBVSVNlcnZpY2UgPSByZXF1aXJlKFwiLi9VSVNlcnZpY2VcIik7XG52YXIgVmlkZW9MYXlvdXQgPSByZXF1aXJlKFwiLi9WaWRlb0xheW91dC5qc1wiKTtcbnZhciBBdWRpb0xldmVscyA9IHJlcXVpcmUoXCIuL2F1ZGlvbGV2ZWxzL0F1ZGlvTGV2ZWxzLmpzXCIpO1xudmFyIFByZXppID0gcmVxdWlyZShcIi4vcHJlemkvUHJlemkuanNcIik7XG52YXIgRXRoZXJwYWQgPSByZXF1aXJlKFwiLi9ldGhlcnBhZC9FdGhlcnBhZC5qc1wiKTtcbnZhciBDaGF0ID0gcmVxdWlyZShcIi4vY2hhdC9DaGF0LmpzXCIpO1xudmFyIFN0cmVhbUV2ZW50VHlwZXMgPSByZXF1aXJlKFwiLi4vc2VydmljZS9SVEMvU3RyZWFtRXZlbnRUeXBlcy5qc1wiKTtcbnZhciBUb29sYmFyID0gcmVxdWlyZShcIi4vdG9vbGJhcnMvdG9vbGJhclwiKTtcbnZhciBUb29sYmFyVG9nZ2xlciA9IHJlcXVpcmUoXCIuL3Rvb2xiYXJzL3Rvb2xiYXJfdG9nZ2xlclwiKTtcbnZhciBCb3R0b21Ub29sYmFyID0gcmVxdWlyZShcIi4vdG9vbGJhcnMvQm90dG9tVG9vbGJhclwiKTtcbnZhciBLZXlib2FyZFNob3J0Y3V0ID0gcmVxdWlyZShcIi4va2V5Ym9hcmRfc2hvcnRjdXRcIik7XG52YXIgWE1QUEV2ZW50cyA9IHJlcXVpcmUoXCIuLi9zZXJ2aWNlL3htcHAvWE1QUEV2ZW50c1wiKTtcblxudmFyIFVJQWN0aXZhdG9yID0gZnVuY3Rpb24oKVxue1xuICAgIHZhciB1aVNlcnZpY2UgPSBudWxsO1xuICAgIGZ1bmN0aW9uIFVJQWN0aXZhdG9yUHJvdG8oKVxuICAgIHtcblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldHVwUHJlemkoKVxuICAgIHtcbiAgICAgICAgJChcIiN0b29sYmFyX3ByZXppXCIpLmNsaWNrKGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgUHJlemkub3BlblByZXppRGlhbG9nKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoXCIjcmVsb2FkUHJlc2VudGF0aW9uTGlua1wiKS5jbGljayhmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIFByZXppLnJlbG9hZFByZXNlbnRhdGlvbigpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldHVwRXRoZXJwYWQoKVxuICAgIHtcbiAgICAgICAgJChcIiN0b29sYmFyX2V0aGVycGFkXCIpLmNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIEV0aGVycGFkLnRvZ2dsZUV0aGVycGFkKDApO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldHVwQXVkaW9MZXZlbHMoKSB7XG4gICAgICAgIFN0YXRpc3RpY3NBY3RpdmF0b3IuYWRkQXVkaW9MZXZlbExpc3RlbmVyKEF1ZGlvTGV2ZWxzLnVwZGF0ZUF1ZGlvTGV2ZWwpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldHVwQ2hhdCgpXG4gICAge1xuICAgICAgICBDaGF0LmluaXQoKTtcbiAgICAgICAgJChcIiN0b29sYmFyX2NoYXRcIikuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgQ2hhdC50b2dnbGVDaGF0KCk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0dXBWaWRlb0xheW91dEV2ZW50cygpXG4gICAge1xuXG4gICAgICAgICQoZG9jdW1lbnQpLmJpbmQoJ2NhbGxhY3RpdmUuamluZ2xlJywgZnVuY3Rpb24gKGV2ZW50LCB2aWRlb2VsZW0sIHNpZCkge1xuICAgICAgICAgICAgaWYgKHZpZGVvZWxlbS5hdHRyKCdpZCcpLmluZGV4T2YoJ21peGVkbXNsYWJlbCcpID09PSAtMSkge1xuICAgICAgICAgICAgICAgIC8vIGlnbm9yZSBtaXhlZG1zbGFiZWxhMCBhbmQgdjBcbiAgICAgICAgICAgICAgICB2aWRlb2VsZW0uc2hvdygpO1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZVRodW1ibmFpbHMoKTtcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgbGFyZ2UgdmlkZW8gdG8gdGhlIGxhc3QgYWRkZWQgdmlkZW8gb25seSBpZiB0aGVyZSdzIG5vXG4gICAgICAgICAgICAgICAgLy8gY3VycmVudCBhY3RpdmUgb3IgZm9jdXNlZCBzcGVha2VyLlxuICAgICAgICAgICAgICAgIGlmICghVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjICYmICFWaWRlb0xheW91dC5nZXREb21pbmFudFNwZWFrZXJSZXNvdXJjZUppZCgpKVxuICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC51cGRhdGVMYXJnZVZpZGVvKHZpZGVvZWxlbS5hdHRyKCdzcmMnKSwgMSk7XG5cbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zaG93Rm9jdXNJbmRpY2F0b3IoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0dXBUb29sYmFycygpIHtcbiAgICAgICAgVG9vbGJhci5pbml0KCk7XG4gICAgICAgIEJvdHRvbVRvb2xiYXIuaW5pdCgpO1xuICAgIH1cblxuICAgIFVJQWN0aXZhdG9yUHJvdG8uc3RhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICQoJ2JvZHknKS5wb3BvdmVyKHsgc2VsZWN0b3I6ICdbZGF0YS10b2dnbGU9cG9wb3Zlcl0nLFxuICAgICAgICAgICAgdHJpZ2dlcjogJ2NsaWNrIGhvdmVyJ30pO1xuICAgICAgICBWaWRlb0xheW91dC5yZXNpemVMYXJnZVZpZGVvQ29udGFpbmVyKCk7XG4gICAgICAgICQoXCIjdmlkZW9zcGFjZVwiKS5tb3VzZW1vdmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIFRvb2xiYXJUb2dnbGVyLnNob3dUb29sYmFyKCk7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBTZXQgdGhlIGRlZmF1bHRzIGZvciBwcm9tcHQgZGlhbG9ncy5cbiAgICAgICAgalF1ZXJ5LnByb21wdC5zZXREZWZhdWx0cyh7cGVyc2lzdGVudDogZmFsc2V9KTtcblxuICAgICAgICBLZXlib2FyZFNob3J0Y3V0LmluaXQoKTtcbiAgICAgICAgcmVnaXN0ZXJMaXN0ZW5lcnMoKTtcbiAgICAgICAgYmluZEV2ZW50cygpO1xuICAgICAgICBzZXR1cEF1ZGlvTGV2ZWxzKCk7XG4gICAgICAgIHNldHVwVmlkZW9MYXlvdXRFdmVudHMoKTtcbiAgICAgICAgc2V0dXBQcmV6aSgpO1xuICAgICAgICBzZXR1cEV0aGVycGFkKCk7XG4gICAgICAgIHNldHVwVG9vbGJhcnMoKTtcbiAgICAgICAgc2V0dXBDaGF0KCk7XG5cbiAgICAgICAgZG9jdW1lbnQudGl0bGUgPSBicmFuZC5hcHBOYW1lO1xuXG4gICAgICAgICQoXCIjZG93bmxvYWRsb2dcIikuY2xpY2soZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBkdW1wKGV2ZW50LnRhcmdldCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmKGNvbmZpZy5lbmFibGVXZWxjb21lUGFnZSAmJiB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgPT0gXCIvXCIgJiZcbiAgICAgICAgICAgICghd2luZG93LmxvY2FsU3RvcmFnZS53ZWxjb21lUGFnZURpc2FibGVkIHx8IHdpbmRvdy5sb2NhbFN0b3JhZ2Uud2VsY29tZVBhZ2VEaXNhYmxlZCA9PSBcImZhbHNlXCIpKVxuICAgICAgICB7XG4gICAgICAgICAgICAkKFwiI3ZpZGVvY29uZmVyZW5jZV9wYWdlXCIpLmhpZGUoKTtcbiAgICAgICAgICAgIHZhciBzZXR1cFdlbGNvbWVQYWdlID0gcmVxdWlyZShcIi4vV2VsY29tZVBhZ2VcIik7XG4gICAgICAgICAgICBzZXR1cFdlbGNvbWVQYWdlKCk7XG5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgICQoXCIjd2VsY29tZV9wYWdlXCIpLmhpZGUoKTtcblxuICAgICAgICBpZiAoISQoJyNzZXR0aW5ncycpLmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnaW5pdCcpO1xuICAgICAgICAgICAgaW5pdCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9naW5JbmZvLm9uc3VibWl0ID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZS5wcmV2ZW50RGVmYXVsdCkgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICQoJyNzZXR0aW5ncycpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBpbml0KCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBVSUFjdGl2YXRvclByb3RvLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHVpU2VydmljZS5kaXNwb3NlKCk7XG4gICAgICAgIHVpU2VydmljZSA9IG51bGw7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZXMgdGhlIGxvZyBkYXRhXG4gICAgICovXG4gICAgZnVuY3Rpb24gcG9wdWxhdGVEYXRhKCkge1xuICAgICAgICB2YXIgZGF0YSA9IFhNUFBBY3RpdmF0b3IuZ2V0SmluZ2xlRGF0YSgpO1xuICAgICAgICB2YXIgbWV0YWRhdGEgPSB7fTtcbiAgICAgICAgbWV0YWRhdGEudGltZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgIG1ldGFkYXRhLnVybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmO1xuICAgICAgICBtZXRhZGF0YS51YSA9IG5hdmlnYXRvci51c2VyQWdlbnQ7XG4gICAgICAgIHZhciBsb2dnZXIgPSBYTVBQQWN0aXZhdG9yLmdldExvZ2dlcigpO1xuICAgICAgICBpZiAobG9nZ2VyKSB7XG4gICAgICAgICAgICBtZXRhZGF0YS54bXBwID0gbG9nZ2VyLmxvZztcbiAgICAgICAgfVxuICAgICAgICBkYXRhLm1ldGFkYXRhID0gbWV0YWRhdGE7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGR1bXAoZWxlbSwgZmlsZW5hbWUpIHtcbiAgICAgICAgZWxlbSA9IGVsZW0ucGFyZW50Tm9kZTtcbiAgICAgICAgZWxlbS5kb3dubG9hZCA9IGZpbGVuYW1lIHx8ICdtZWV0bG9nLmpzb24nO1xuICAgICAgICBlbGVtLmhyZWYgPSAnZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTgsXFxuJztcbiAgICAgICAgdmFyIGRhdGEgPSBwb3B1bGF0ZURhdGEoKTtcbiAgICAgICAgZWxlbS5ocmVmICs9IGVuY29kZVVSSUNvbXBvbmVudChKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCAnICAnKSk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZWdpc3Rlckxpc3RlbmVycygpIHtcbiAgICAgICAgUlRDQWN0aXZhdG9yLmFkZFN0cmVhbUxpc3RlbmVyKGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgICAgIHN3aXRjaCAoc3RyZWFtLnR5cGUpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY2FzZSBcImF1ZGlvXCI6XG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LmNoYW5nZUxvY2FsQXVkaW8oc3RyZWFtLmdldE9yaWdpbmFsU3RyZWFtKCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwidmlkZW9cIjpcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuY2hhbmdlTG9jYWxWaWRlbyhzdHJlYW0uZ2V0T3JpZ2luYWxTdHJlYW0oKSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJkZXNrdG9wXCI6XG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LmNoYW5nZUxvY2FsVmlkZW8oc3RyZWFtLCAhaXNVc2luZ1NjcmVlblN0cmVhbSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBTdHJlYW1FdmVudFR5cGVzLkVWRU5UX1RZUEVfTE9DQUxfQ1JFQVRFRCk7XG5cbiAgICAgICAgUlRDQWN0aXZhdG9yLmFkZFN0cmVhbUxpc3RlbmVyKGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0Lm9uUmVtb3RlU3RyZWFtQWRkZWQoc3RyZWFtKTtcbiAgICAgICAgfSwgU3RyZWFtRXZlbnRUeXBlcy5FVkVOVF9UWVBFX1JFTU9URV9DUkVBVEVEKTtcbiAgICAgICAgWE1QUEFjdGl2YXRvci5hZGRMaXN0ZW5lcihYTVBQRXZlbnRzLkRJU1BMQVlfTkFNRV9DSEFOR0VELFxuICAgICAgICAgICAgZnVuY3Rpb24gKHBlZXJKaWQsIGRpc3BsYXlOYW1lLCBzdGF0dXMpIHtcbiAgICAgICAgICAgICAgICB1aVNlcnZpY2Uub25EaXNwbGF5TmFtZUNoYW5nZWQocGVlckppZCwgZGlzcGxheU5hbWUsIHN0YXR1cyk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBMaXN0ZW4gZm9yIGxhcmdlIHZpZGVvIHNpemUgdXBkYXRlc1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbGFyZ2VWaWRlbycpXG4gICAgICAgICAgICAuYWRkRXZlbnRMaXN0ZW5lcignbG9hZGVkbWV0YWRhdGEnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LmN1cnJlbnRWaWRlb1dpZHRoID0gdGhpcy52aWRlb1dpZHRoO1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LmN1cnJlbnRWaWRlb0hlaWdodCA9IHRoaXMudmlkZW9IZWlnaHQ7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQucG9zaXRpb25MYXJnZShWaWRlb0xheW91dC5jdXJyZW50VmlkZW9XaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuY3VycmVudFZpZGVvSGVpZ2h0KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYmluZEV2ZW50cygpXG4gICAge1xuICAgICAgICAvKipcbiAgICAgICAgICogUmVzaXplcyBhbmQgcmVwb3NpdGlvbnMgdmlkZW9zIGluIGZ1bGwgc2NyZWVuIG1vZGUuXG4gICAgICAgICAqL1xuICAgICAgICAkKGRvY3VtZW50KS5vbignd2Via2l0ZnVsbHNjcmVlbmNoYW5nZSBtb3pmdWxsc2NyZWVuY2hhbmdlIGZ1bGxzY3JlZW5jaGFuZ2UnLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZUxhcmdlVmlkZW9Db250YWluZXIoKTtcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5wb3NpdGlvbkxhcmdlKCk7XG4gICAgICAgICAgICAgICAgdmFyIGlzRnVsbFNjcmVlbiA9IFZpZGVvTGF5b3V0LmlzRnVsbFNjcmVlbigpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGlzRnVsbFNjcmVlbikge1xuICAgICAgICAgICAgICAgICAgICBzZXRWaWV3KFwiZnVsbHNjcmVlblwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFZpZXcoXCJkZWZhdWx0XCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICAkKHdpbmRvdykucmVzaXplKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZUxhcmdlVmlkZW9Db250YWluZXIoKTtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LnBvc2l0aW9uTGFyZ2UoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgY3VycmVudCB2aWV3LlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNldFZpZXcodmlld05hbWUpIHtcbi8vICAgIGlmICh2aWV3TmFtZSA9PSBcImZ1bGxzY3JlZW5cIikge1xuLy8gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd2aWRlb2xheW91dF9mdWxsc2NyZWVuJykuZGlzYWJsZWQgID0gZmFsc2U7XG4vLyAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ZpZGVvbGF5b3V0X2RlZmF1bHQnKS5kaXNhYmxlZCAgPSB0cnVlO1xuLy8gICAgfVxuLy8gICAgZWxzZSB7XG4vLyAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ZpZGVvbGF5b3V0X2RlZmF1bHQnKS5kaXNhYmxlZCAgPSBmYWxzZTtcbi8vICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndmlkZW9sYXlvdXRfZnVsbHNjcmVlbicpLmRpc2FibGVkICA9IHRydWU7XG4vLyAgICB9XG4gICAgfVxuXG4gICAgVUlBY3RpdmF0b3JQcm90by5nZXRSVENTZXJ2aWNlID0gZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgcmV0dXJuIFJUQ0FjdGl2YXRvci5nZXRSVENTZXJ2aWNlKCk7XG4gICAgfVxuXG4gICAgVUlBY3RpdmF0b3JQcm90by5nZXRVSVNlcnZpY2UgPSBmdW5jdGlvbigpXG4gICAge1xuICAgICAgICBpZih1aVNlcnZpY2UgPT0gbnVsbClcbiAgICAgICAge1xuICAgICAgICAgICAgdWlTZXJ2aWNlID0gbmV3IFVJU2VydmljZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1aVNlcnZpY2U7XG4gICAgfVxuXG4gICAgVUlBY3RpdmF0b3JQcm90by5jaGF0QWRkRXJyb3IgPSBmdW5jdGlvbihlcnJvck1lc3NhZ2UsIG9yaWdpbmFsVGV4dClcbiAgICB7XG4gICAgICAgIHJldHVybiBDaGF0LmNoYXRBZGRFcnJvcihlcnJvck1lc3NhZ2UsIG9yaWdpbmFsVGV4dCk7XG4gICAgfVxuXG4gICAgVUlBY3RpdmF0b3JQcm90by5jaGF0U2V0U3ViamVjdCA9IGZ1bmN0aW9uKHRleHQpXG4gICAge1xuICAgICAgICByZXR1cm4gQ2hhdC5jaGF0U2V0U3ViamVjdCh0ZXh0KTtcbiAgICB9XG5cbiAgICBVSUFjdGl2YXRvclByb3RvLnVwZGF0ZUNoYXRDb252ZXJzYXRpb24gPSBmdW5jdGlvbiAoZnJvbSwgZGlzcGxheU5hbWUsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIENoYXQudXBkYXRlQ2hhdENvbnZlcnNhdGlvbihmcm9tLCBkaXNwbGF5TmFtZSwgbWVzc2FnZSk7XG4gICAgfVxuXG5cbiAgICBVSUFjdGl2YXRvclByb3RvLmFkZE5pY2tuYW1lTGlzdGVuZXIgPSBmdW5jdGlvbihsaXN0ZW5lcilcbiAgICB7XG5cbiAgICB9XG5cbiAgICByZXR1cm4gVUlBY3RpdmF0b3JQcm90bztcbn0oKTtcblxubW9kdWxlLmV4cG9ydHMgPSBVSUFjdGl2YXRvcjtcblxuIiwidmFyIEF1ZGlvTGV2ZWxzID0gcmVxdWlyZShcIi4vYXVkaW9sZXZlbHMvQXVkaW9MZXZlbHMuanNcIik7XG52YXIgRXRoZXJwYWQgPSByZXF1aXJlKFwiLi9ldGhlcnBhZC9FdGhlcnBhZC5qc1wiKTtcbnZhciBWaWRlb0xheW91dCA9IHJlcXVpcmUoXCIuL1ZpZGVvTGF5b3V0LmpzXCIpO1xudmFyIFRvb2xiYXIgPSByZXF1aXJlKFwiLi90b29sYmFycy90b29sYmFyLmpzXCIpO1xudmFyIFRvb2xiYXJUb2dnbGVyID0gcmVxdWlyZShcIi4vdG9vbGJhcnMvdG9vbGJhcl90b2dnbGVyLmpzXCIpO1xudmFyIENvbnRhY3RMaXN0ID0gcmVxdWlyZShcIi4vQ29udGFjdExpc3RcIik7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKTtcblxudmFyIFVJU2VydmljZSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIGV2ZW50RW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICAgIHZhciBuaWNrbmFtZSA9IG51bGw7XG5cbiAgICB2YXIgcm9vbU5hbWUgPSBudWxsO1xuXG4gICAgZnVuY3Rpb24gVUlTZXJ2aWNlUHJvdG8oKSB7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLnVwZGF0ZUF1ZGlvTGV2ZWxDYW52YXMgPSBmdW5jdGlvbiAocGVlckppZCkge1xuICAgICAgICBBdWRpb0xldmVscy51cGRhdGVBdWRpb0xldmVsQ2FudmFzKHBlZXJKaWQpO1xuICAgIH1cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5pbml0RXRoZXJwYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIEV0aGVycGFkLmluaXQoKTtcbiAgICB9XG5cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5jaGVja0NoYW5nZUxhcmdlVmlkZW8gPSBmdW5jdGlvbiAocmVtb3ZlZFZpZGVvU3JjKSB7XG4gICAgICAgIFZpZGVvTGF5b3V0LmNoZWNrQ2hhbmdlTGFyZ2VWaWRlbyhyZW1vdmVkVmlkZW9TcmMpO1xuICAgIH1cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5vbk11Y0pvaW5lZCA9IGZ1bmN0aW9uIChqaWQsIGluZm8sIG5vTWVtYmVycykge1xuICAgICAgICBUb29sYmFyLnVwZGF0ZVJvb21Vcmwod2luZG93LmxvY2F0aW9uLmhyZWYpO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9jYWxOaWNrJykuYXBwZW5kQ2hpbGQoXG4gICAgICAgICAgICBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpICsgJyAobWUpJylcbiAgICAgICAgKTtcblxuICAgICAgICBpZiAobm9NZW1iZXJzKSB7XG4gICAgICAgICAgICBUb29sYmFyLnNob3dTaXBDYWxsQnV0dG9uKHRydWUpO1xuICAgICAgICAgICAgVG9vbGJhci5zaG93UmVjb3JkaW5nQnV0dG9uKGZhbHNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghWE1QUEFjdGl2YXRvci5pc0ZvY3VzKCkpIHtcbiAgICAgICAgICAgIFRvb2xiYXIuc2hvd1NpcENhbGxCdXR0b24oZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKFhNUFBBY3RpdmF0b3IuaXNGb2N1cygpICYmIGNvbmZpZy5ldGhlcnBhZF9iYXNlKSB7XG4gICAgICAgICAgICB0aGlzLmluaXRFdGhlcnBhZCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0ZvY3VzSW5kaWNhdG9yKCk7XG5cbiAgICAgICAgLy8gQWRkIG15c2VsZiB0byB0aGUgY29udGFjdCBsaXN0LlxuICAgICAgICBDb250YWN0TGlzdC5hZGRDb250YWN0KGppZCk7XG5cbiAgICAgICAgLy8gT25jZSB3ZSd2ZSBqb2luZWQgdGhlIG11YyBzaG93IHRoZSB0b29sYmFyXG4gICAgICAgIFRvb2xiYXJUb2dnbGVyLnNob3dUb29sYmFyKCk7XG5cbiAgICAgICAgaWYgKGluZm8uZGlzcGxheU5hbWUpXG4gICAgICAgICAgICB0aGlzLm9uRGlzcGxheU5hbWVDaGFuZ2VkKFxuICAgICAgICAgICAgICAgICdsb2NhbFZpZGVvQ29udGFpbmVyJywgaW5mby5kaXNwbGF5TmFtZSArICcgKG1lKScpO1xuICAgIH1cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5vbkRpc3BsYXlOYW1lQ2hhbmdlZCA9IGZ1bmN0aW9uIChwZWVySmlkLCBkaXNwbGF5TmFtZSwgc3RhdHVzKSB7XG4gICAgICAgIFZpZGVvTGF5b3V0Lm9uRGlzcGxheU5hbWVDaGFuZ2VkKHBlZXJKaWQsIGRpc3BsYXlOYW1lLCBzdGF0dXMpO1xuICAgICAgICBDb250YWN0TGlzdC5vbkRpc3BsYXlOYW1lQ2hhbmdlZChwZWVySmlkLCBkaXNwbGF5TmFtZSk7XG4gICAgfTtcblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5vbk11Y0VudGVyZWQgPSBmdW5jdGlvbiAoamlkLCBpbmZvLCBwcmVzLCBuZXdDb25mZXJlbmNlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdlbnRlcmVkJywgamlkLCBpbmZvKTtcblxuICAgICAgICAvLyBBZGQgUGVlcidzIGNvbnRhaW5lclxuICAgICAgICBWaWRlb0xheW91dC5lbnN1cmVQZWVyQ29udGFpbmVyRXhpc3RzKGppZCk7XG5cbiAgICAgICAgaWYobmV3Q29uZmVyZW5jZSlcbiAgICAgICAge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ21ha2UgbmV3IGNvbmZlcmVuY2Ugd2l0aCcsIGppZCk7XG4gICAgICAgICAgICBUb29sYmFyLnNob3dSZWNvcmRpbmdCdXR0b24odHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoVG9vbGJhci5zaGFyZWRLZXkpIHtcbiAgICAgICAgICAgIFRvb2xiYXIudXBkYXRlTG9ja0J1dHRvbigpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLm9uTXVjUHJlc2VuY2VTdGF0dXMgPSBmdW5jdGlvbiAoIGppZCwgaW5mbywgcHJlcykge1xuICAgICAgICBWaWRlb0xheW91dC5zZXRQcmVzZW5jZVN0YXR1cyhcbiAgICAgICAgICAgICAgICAncGFydGljaXBhbnRfJyArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGppZCksIGluZm8uc3RhdHVzKTtcbiAgICB9XG5cbiAgICBVSVNlcnZpY2VQcm90by5wcm90b3R5cGUub25NdWNMZWZ0ID0gZnVuY3Rpb24oamlkKVxuICAgIHtcbiAgICAgICAgLy8gTmVlZCB0byBjYWxsIHRoaXMgd2l0aCBhIHNsaWdodCBkZWxheSwgb3RoZXJ3aXNlIHRoZSBlbGVtZW50IGNvdWxkbid0IGJlXG4gICAgICAgIC8vIGZvdW5kIGZvciBzb21lIHJlYXNvbi5cbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFxuICAgICAgICAgICAgICAgICAgICAncGFydGljaXBhbnRfJyArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGppZCkpO1xuICAgICAgICAgICAgaWYgKGNvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgIC8vIGhpZGUgaGVyZSwgd2FpdCBmb3IgdmlkZW8gdG8gY2xvc2UgYmVmb3JlIHJlbW92aW5nXG4gICAgICAgICAgICAgICAgJChjb250YWluZXIpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5yZXNpemVUaHVtYm5haWxzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIDEwKTtcblxuICAgICAgICAvLyBVbmxvY2sgbGFyZ2UgdmlkZW9cbiAgICAgICAgaWYgKFZpZGVvTGF5b3V0LmZvY3VzZWRWaWRlb1NyYylcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKFZpZGVvTGF5b3V0LmdldEppZEZyb21WaWRlb1NyYyhWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMpID09PSBqaWQpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKFwiRm9jdXNlZCB2aWRlbyBvd25lciBoYXMgbGVmdCB0aGUgY29uZmVyZW5jZVwiKTtcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLnNob3dWaWRlb0ZvckpJRCA9IGZ1bmN0aW9uIChqaWQpIHtcbiAgICAgICAgdmFyIGVsID0gJCgnI3BhcnRpY2lwYW50XycgICsgamlkICsgJz52aWRlbycpO1xuICAgICAgICBlbC5zaG93KCk7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLmhpZGVWaWRlb0ZvckpJRCA9IGZ1bmN0aW9uIChqaWQpIHtcbiAgICAgICAgdmFyIGVsID0gJCgnI3BhcnRpY2lwYW50XycgICsgamlkICsgJz52aWRlbycpO1xuICAgICAgICBlbC5oaWRlKCk7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLmdldFNlbGVjdGVkSklEID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbGFyZ2VWaWRlb1NyYyA9ICQoJyNsYXJnZVZpZGVvJykuYXR0cignc3JjJyk7XG4gICAgICAgIHJldHVybiBWaWRlb0xheW91dC5nZXRKaWRGcm9tVmlkZW9TcmMobGFyZ2VWaWRlb1NyYyk7XG4gICAgfVxuICAgIFxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS51cGRhdGVCdXR0b25zID0gZnVuY3Rpb24gKHJlY29yZGluZywgc2lwKSB7XG4gICAgICAgIGlmKHJlY29yZGluZyAhPSBudWxsKVxuICAgICAgICB7XG4gICAgICAgICAgICBUb29sYmFyLnNob3dSZWNvcmRpbmdCdXR0b24ocmVjb3JkaW5nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHNpcCAhPSBudWxsKVxuICAgICAgICB7XG4gICAgICAgICAgICBUb29sYmFyLnNob3dTaXBDYWxsQnV0dG9uKHNpcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBVSVNlcnZpY2VQcm90by5wcm90b3R5cGUudG9nZ2xlQXVkaW8gPSBmdW5jdGlvbigpXG4gICAge1xuICAgICAgICBUb29sYmFyLnRvZ2dsZUF1ZGlvKCk7XG4gICAgfTtcblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5nZXRDcmVkZW50aWFscyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNyZWRlbnRpYWxzID0ge307XG4gICAgICAgIGNyZWRlbnRpYWxzLmppZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqaWQnKS52YWx1ZVxuICAgICAgICAgICAgfHwgY29uZmlnLmhvc3RzLmFub255bW91c2RvbWFpblxuICAgICAgICAgICAgfHwgY29uZmlnLmhvc3RzLmRvbWFpbiB8fCB3aW5kb3cubG9jYXRpb24uaG9zdG5hbWU7XG5cbiAgICAgICAgY3JlZGVudGlhbHMuYm9zaCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdib3NoVVJMJykudmFsdWUgfHwgY29uZmlnLmJvc2ggfHwgJy9odHRwLWJpbmQnO1xuICAgICAgICBjcmVkZW50aWFscy5wYXNzd29yZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwYXNzd29yZCcpLnZhbHVlO1xuICAgICAgICByZXR1cm4gY3JlZGVudGlhbHM7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLmFkZE5pY2tuYW1lTGlzdGVuZXIgPSBmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgZXZlbnRFbWl0dGVyLm9uKFwibmlja19jaGFuZ2VkXCIsIGxpc3RlbmVyKTtcbiAgICAgICAgZXZlbnRFbWl0dGVyLmVtaXQoXCJuaWNrX2NoYW5nZWRcIiwgbmlja25hbWUpO1xuXG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLnJlbW92ZU5pY2tuYW1lTGlzdGVuZXIgPSBmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgZXZlbnRFbWl0dGVyLnJlbW92ZUxpc3RlbmVyKFwibmlja19jaGFuZ2VkXCIsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICBVSVNlcnZpY2VQcm90by5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIGV2ZW50RW1pdHRlci5yZW1vdmVBbGxMaXN0ZW5lcnMoXCJzdGF0aXN0aWNzLmF1ZGlvTGV2ZWxcIik7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLnNldE5pY2tuYW1lID0gZnVuY3Rpb24odmFsdWUpXG4gICAge1xuICAgICAgICBuaWNrbmFtZSA9IHZhbHVlO1xuICAgICAgICBldmVudEVtaXR0ZXIuZW1pdChcIm5pY2tfY2hhbmdlZFwiLCB2YWx1ZSk7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLmdldE5pY2tuYW1lID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmlja25hbWU7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLmdlbmVyYXRlUm9vbU5hbWUgPSBmdW5jdGlvbiAoYXV0aGVudGljYXRlZFVzZXIpIHtcbiAgICAgICAgdmFyIHJvb21ub2RlID0gbnVsbDtcbiAgICAgICAgdmFyIHBhdGggPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWU7XG4gICAgICAgIHZhciByb29tamlkO1xuXG4gICAgICAgIC8vIGRldGVybWluZGUgdGhlIHJvb20gbm9kZSBmcm9tIHRoZSB1cmxcbiAgICAgICAgLy8gVE9ETzoganVzdCB0aGUgcm9vbW5vZGUgb3IgdGhlIHdob2xlIGJhcmUgamlkP1xuICAgICAgICBpZiAoY29uZmlnLmdldHJvb21ub2RlICYmIHR5cGVvZiBjb25maWcuZ2V0cm9vbW5vZGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIC8vIGN1c3RvbSBmdW5jdGlvbiBtaWdodCBiZSByZXNwb25zaWJsZSBmb3IgZG9pbmcgdGhlIHB1c2hzdGF0ZVxuICAgICAgICAgICAgcm9vbW5vZGUgPSBjb25maWcuZ2V0cm9vbW5vZGUocGF0aCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvKiBmYWxsIGJhY2sgdG8gZGVmYXVsdCBzdHJhdGVneVxuICAgICAgICAgICAgICogdGhpcyBpcyBtYWtpbmcgYXNzdW1wdGlvbnMgYWJvdXQgaG93IHRoZSBVUkwtPnJvb20gbWFwcGluZyBoYXBwZW5zLlxuICAgICAgICAgICAgICogSXQgY3VycmVudGx5IGFzc3VtZXMgZGVwbG95bWVudCBhdCByb290LCB3aXRoIGEgcmV3cml0ZSBsaWtlIHRoZVxuICAgICAgICAgICAgICogZm9sbG93aW5nIG9uZSAoZm9yIG5naW54KTpcbiAgICAgICAgICAgICBsb2NhdGlvbiB+IF4vKFthLXpBLVowLTldKykkIHtcbiAgICAgICAgICAgICByZXdyaXRlIF4vKC4qKSQgLyBicmVhaztcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlmIChwYXRoLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICByb29tbm9kZSA9IHBhdGguc3Vic3RyKDEpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciB3b3JkID0gUm9vbU5hbWVHZW5lcmF0b3IuZ2VuZXJhdGVSb29tV2l0aG91dFNlcGFyYXRvcigzKTtcbiAgICAgICAgICAgICAgICByb29tbm9kZSA9IHdvcmQudG9Mb3dlckNhc2UoKTtcblxuICAgICAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSgnVmlkZW9DaGF0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdSb29tOiAnICsgd29yZCwgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lICsgd29yZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByb29tTmFtZSA9IHJvb21ub2RlICsgJ0AnICsgY29uZmlnLmhvc3RzLm11YztcblxuICAgICAgICB2YXIgcm9vbWppZCA9IHJvb21OYW1lO1xuICAgICAgICB2YXIgdG1wSmlkID0gWE1QUEFjdGl2YXRvci5nZXRPd25KSUROb2RlKCk7XG5cbiAgICAgICAgaWYgKGNvbmZpZy51c2VOaWNrcykge1xuICAgICAgICAgICAgdmFyIG5pY2sgPSB3aW5kb3cucHJvbXB0KCdZb3VyIG5pY2tuYW1lIChvcHRpb25hbCknKTtcbiAgICAgICAgICAgIGlmIChuaWNrKSB7XG4gICAgICAgICAgICAgICAgcm9vbWppZCArPSAnLycgKyBuaWNrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByb29tamlkICs9ICcvJyArIHRtcEppZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmKCFhdXRoZW50aWNhdGVkVXNlcilcbiAgICAgICAgICAgICAgICB0bXBKaWQgPSB0bXBKaWQuc3Vic3RyKDAsIDgpO1xuXG4gICAgICAgICAgICByb29tamlkICs9ICcvJyArIHRtcEppZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcm9vbWppZDtcbiAgICB9XG5cbiAgICBVSVNlcnZpY2VQcm90by5wcm90b3R5cGUuZ2V0Um9vbU5hbWUgPSBmdW5jdGlvbigpXG4gICAge1xuICAgICAgICByZXR1cm4gcm9vbU5hbWU7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLnNob3dMb2dpblBvcHVwID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdwYXNzd29yZCBpcyByZXF1aXJlZCcpO1xuXG4gICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5Ud29CdXR0b25EaWFsb2cobnVsbCxcbiAgICAgICAgICAgICAgICAnPGgyPlBhc3N3b3JkIHJlcXVpcmVkPC9oMj4nICtcbiAgICAgICAgICAgICAgICAnPGlucHV0IGlkPVwicGFzc3dvcmRyZXF1aXJlZC51c2VybmFtZVwiIHR5cGU9XCJ0ZXh0XCIgcGxhY2Vob2xkZXI9XCJ1c2VyQGRvbWFpbi5uZXRcIiBhdXRvZm9jdXM+JyArXG4gICAgICAgICAgICAgICAgJzxpbnB1dCBpZD1cInBhc3N3b3JkcmVxdWlyZWQucGFzc3dvcmRcIiB0eXBlPVwicGFzc3dvcmRcIiBwbGFjZWhvbGRlcj1cInVzZXIgcGFzc3dvcmRcIj4nLFxuICAgICAgICAgICAgdHJ1ZSxcbiAgICAgICAgICAgIFwiT2tcIixcbiAgICAgICAgICAgIGZ1bmN0aW9uIChlLCB2LCBtLCBmKSB7XG4gICAgICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHVzZXJuYW1lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Bhc3N3b3JkcmVxdWlyZWQudXNlcm5hbWUnKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhc3N3b3JkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Bhc3N3b3JkcmVxdWlyZWQucGFzc3dvcmQnKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAodXNlcm5hbWUudmFsdWUgIT09IG51bGwgJiYgcGFzc3dvcmQudmFsdWUgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sodXNlcm5hbWUudmFsdWUsIHBhc3N3b3JkLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGFzc3dvcmRyZXF1aXJlZC51c2VybmFtZScpLmZvY3VzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLmRpc2FibGVDb25uZWN0ID0gZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Nvbm5lY3QnKS5kaXNhYmxlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLnNob3dMb2NrUG9wdXAgPSBmdW5jdGlvbiAoamlkLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zb2xlLmxvZygnb24gcGFzc3dvcmQgcmVxdWlyZWQnLCBqaWQpO1xuXG4gICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5Ud29CdXR0b25EaWFsb2cobnVsbCxcbiAgICAgICAgICAgICAgICAnPGgyPlBhc3N3b3JkIHJlcXVpcmVkPC9oMj4nICtcbiAgICAgICAgICAgICAgICAnPGlucHV0IGlkPVwibG9ja0tleVwiIHR5cGU9XCJ0ZXh0XCIgcGxhY2Vob2xkZXI9XCJzaGFyZWQga2V5XCIgYXV0b2ZvY3VzPicsXG4gICAgICAgICAgICB0cnVlLFxuICAgICAgICAgICAgXCJPa1wiLFxuICAgICAgICAgICAgZnVuY3Rpb24gKGUsIHYsIG0sIGYpIHtcbiAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbG9ja0tleSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsb2NrS2V5Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsb2NrS2V5LnZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRTaGFyZWRLZXkobG9ja0tleS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhqaWQsIGxvY2tLZXkudmFsdWUpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2tLZXknKS5mb2N1cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cblxuXG4gICAgcmV0dXJuIFVJU2VydmljZVByb3RvO1xufSgpO1xubW9kdWxlLmV4cG9ydHMgPSBVSVNlcnZpY2U7IiwiXG52YXIgVUlVdGlsID0gKGZ1bmN0aW9uIChteSkge1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgYXZhaWxhYmxlIHZpZGVvIHdpZHRoLlxuICAgICAqL1xuICAgIG15LmdldEF2YWlsYWJsZVZpZGVvV2lkdGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjaGF0c3BhY2VXaWR0aFxuICAgICAgICAgICAgPSAkKCcjY2hhdHNwYWNlJykuaXMoXCI6dmlzaWJsZVwiKVxuICAgICAgICAgICAgPyAkKCcjY2hhdHNwYWNlJykud2lkdGgoKVxuICAgICAgICAgICAgOiAwO1xuXG4gICAgICAgIHJldHVybiB3aW5kb3cuaW5uZXJXaWR0aCAtIGNoYXRzcGFjZVdpZHRoO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDaGFuZ2VzIHRoZSBzdHlsZSBjbGFzcyBvZiB0aGUgZWxlbWVudCBnaXZlbiBieSBpZC5cbiAgICAgKi9cbiAgICBteS5idXR0b25DbGljayA9IGZ1bmN0aW9uIChpZCwgY2xhc3NuYW1lKSB7XG4gICAgICAgICQoaWQpLnRvZ2dsZUNsYXNzKGNsYXNzbmFtZSk7IC8vIGFkZCB0aGUgY2xhc3MgdG8gdGhlIGNsaWNrZWQgZWxlbWVudFxuICAgIH07XG5cbiAgICByZXR1cm4gbXk7XG5cbn0pKFVJVXRpbCB8fCB7fSk7XG5cbm1vZHVsZS5leHBvcnRzID0gVUlVdGlsOyIsInZhciBkZXAgPVxue1xuICAgIFwiUlRDQnJvd3NlclR5cGVcIjogZnVuY3Rpb24oKXsgcmV0dXJuIHJlcXVpcmUoXCIuLi9zZXJ2aWNlL1JUQy9SVENCcm93c2VyVHlwZS5qc1wiKX0sXG4gICAgXCJVSUFjdGl2YXRvclwiOiBmdW5jdGlvbigpeyByZXR1cm4gcmVxdWlyZShcIi4vVUlBY3RpdmF0b3IuanNcIil9LFxuICAgIFwiQ2hhdFwiOiBmdW5jdGlvbigpeyByZXR1cm4gcmVxdWlyZShcIi4vY2hhdC9DaGF0XCIpfSxcbiAgICBcIlVJVXRpbFwiOiBmdW5jdGlvbigpeyByZXR1cm4gcmVxdWlyZShcIi4vVUlVdGlsLmpzXCIpfSxcbiAgICBcIkNvbnRhY3RMaXN0XCI6IGZ1bmN0aW9uKCl7IHJldHVybiByZXF1aXJlKFwiLi9Db250YWN0TGlzdFwiKX0sXG4gICAgXCJUb29sYmFyXCI6IGZ1bmN0aW9uKCl7IHJldHVybiByZXF1aXJlKFwiLi90b29sYmFycy90b29sYmFyX3RvZ2dsZXJcIil9XG59XG5cbnZhciBWaWRlb0xheW91dCA9IChmdW5jdGlvbiAobXkpIHtcbiAgICB2YXIgY3VycmVudERvbWluYW50U3BlYWtlciA9IG51bGw7XG4gICAgdmFyIGxhc3ROQ291bnQgPSBjb25maWcuY2hhbm5lbExhc3ROO1xuICAgIHZhciBsYXN0TkVuZHBvaW50c0NhY2hlID0gW107XG4gICAgdmFyIGxhcmdlVmlkZW9OZXdTcmMgPSAnJztcbiAgICB2YXIgYnJvd3NlciA9IG51bGw7XG4gICAgdmFyIGZsaXBYTG9jYWxWaWRlbyA9IHRydWU7XG4gICAgbXkuY3VycmVudFZpZGVvV2lkdGggPSBudWxsO1xuICAgIG15LmN1cnJlbnRWaWRlb0hlaWdodCA9IG51bGw7XG4gICAgdmFyIGxvY2FsVmlkZW9TcmMgPSBudWxsO1xuICAgIHZhciB2aWRlb1NyY1RvU3NyYyA9IHt9O1xuXG4gICAgdmFyIG11dGVkQXVkaW9zID0ge307XG4gICAgLyoqXG4gICAgICogQ3VycmVudGx5IGZvY3VzZWQgdmlkZW8gXCJzcmNcIihkaXNwbGF5ZWQgaW4gbGFyZ2UgdmlkZW8pLlxuICAgICAqIEB0eXBlIHtTdHJpbmd9XG4gICAgICovXG4gICAgbXkuZm9jdXNlZFZpZGVvU3JjID0gbnVsbDtcblxuICAgIGZ1bmN0aW9uIGF0dGFjaE1lZGlhU3RyZWFtKGVsZW1lbnQsIHN0cmVhbSkge1xuICAgICAgICBpZihicm93c2VyID09IG51bGwpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGJyb3dzZXIgPSBkZXAuVUlBY3RpdmF0b3IoKS5nZXRSVENTZXJ2aWNlKCkuZ2V0QnJvd3NlclR5cGUoKTtcbiAgICAgICAgfVxuICAgICAgICBzd2l0Y2ggKGJyb3dzZXIpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNhc2UgZGVwLlJUQ0Jyb3dzZXJUeXBlKCkuUlRDX0JST1dTRVJfQ0hST01FOlxuICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cignc3JjJywgd2Via2l0VVJMLmNyZWF0ZU9iamVjdFVSTChzdHJlYW0pKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgZGVwLlJUQ0Jyb3dzZXJUeXBlKCkuUlRDX0JST1dTRVJfRklSRUZPWDpcbiAgICAgICAgICAgICAgICBlbGVtZW50WzBdLm1velNyY09iamVjdCA9IHN0cmVhbTtcbiAgICAgICAgICAgICAgICBlbGVtZW50WzBdLnBsYXkoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJVbmtub3duIGJyb3dzZXIuXCIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbXkuY2hhbmdlTG9jYWxBdWRpbyA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgICBhdHRhY2hNZWRpYVN0cmVhbSgkKCcjbG9jYWxBdWRpbycpLCBzdHJlYW0pO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9jYWxBdWRpbycpLmF1dG9wbGF5ID0gdHJ1ZTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2FsQXVkaW8nKS52b2x1bWUgPSAwO1xuICAgICAgICBpZiAoZGVwLlRvb2xiYXIoKS5wcmVNdXRlZCkge1xuICAgICAgICAgICAgZGVwLlRvb2xiYXIoKS50b2dnbGVBdWRpbygpO1xuICAgICAgICAgICAgZGVwLlRvb2xiYXIoKS5wcmVNdXRlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIG15LmNoYW5nZUxvY2FsVmlkZW8gPSBmdW5jdGlvbihzdHJlYW0sIGZsaXBYKSB7XG4gICAgICAgIHZhciBsb2NhbFZpZGVvID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndmlkZW8nKTtcbiAgICAgICAgbG9jYWxWaWRlby5pZCA9ICdsb2NhbFZpZGVvXycgKyBzdHJlYW0uaWQ7XG4gICAgICAgIGxvY2FsVmlkZW8uYXV0b3BsYXkgPSB0cnVlO1xuICAgICAgICBsb2NhbFZpZGVvLnZvbHVtZSA9IDA7IC8vIGlzIGl0IHJlcXVpcmVkIGlmIGF1ZGlvIGlzIHNlcGFyYXRlZCA/XG4gICAgICAgIGxvY2FsVmlkZW8ub25jb250ZXh0bWVudSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGZhbHNlOyB9O1xuXG4gICAgICAgIHZhciBsb2NhbFZpZGVvQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2FsVmlkZW9XcmFwcGVyJyk7XG4gICAgICAgIGxvY2FsVmlkZW9Db250YWluZXIuYXBwZW5kQ2hpbGQobG9jYWxWaWRlbyk7XG5cbiAgICAgICAgLy8gU2V0IGRlZmF1bHQgZGlzcGxheSBuYW1lLlxuICAgICAgICBzZXREaXNwbGF5TmFtZSgnbG9jYWxWaWRlb0NvbnRhaW5lcicpO1xuXG4gICAgICAgIGRlcC5VSUFjdGl2YXRvcigpLmdldFVJU2VydmljZSgpLnVwZGF0ZUF1ZGlvTGV2ZWxDYW52YXMoKTtcblxuICAgICAgICB2YXIgbG9jYWxWaWRlb1NlbGVjdG9yID0gJCgnIycgKyBsb2NhbFZpZGVvLmlkKTtcbiAgICAgICAgLy8gQWRkIGNsaWNrIGhhbmRsZXIgdG8gYm90aCB2aWRlbyBhbmQgdmlkZW8gd3JhcHBlciBlbGVtZW50cyBpbiBjYXNlXG4gICAgICAgIC8vIHRoZXJlJ3Mgbm8gdmlkZW8uXG4gICAgICAgIGxvY2FsVmlkZW9TZWxlY3Rvci5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5oYW5kbGVWaWRlb1RodW1iQ2xpY2tlZChsb2NhbFZpZGVvLnNyYyk7XG4gICAgICAgIH0pO1xuICAgICAgICAkKCcjbG9jYWxWaWRlb0NvbnRhaW5lcicpLmNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmhhbmRsZVZpZGVvVGh1bWJDbGlja2VkKGxvY2FsVmlkZW8uc3JjKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGhvdmVyIGhhbmRsZXJcbiAgICAgICAgJCgnI2xvY2FsVmlkZW9Db250YWluZXInKS5ob3ZlcihcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dEaXNwbGF5TmFtZSgnbG9jYWxWaWRlb0NvbnRhaW5lcicsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmICghVmlkZW9MYXlvdXQuaXNMYXJnZVZpZGVvVmlzaWJsZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICB8fCBsb2NhbFZpZGVvLnNyYyAhPT0gJCgnI2xhcmdlVmlkZW8nKS5hdHRyKCdzcmMnKSlcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0Rpc3BsYXlOYW1lKCdsb2NhbFZpZGVvQ29udGFpbmVyJywgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICAvLyBBZGQgc3RyZWFtIGVuZGVkIGhhbmRsZXJcbiAgICAgICAgc3RyZWFtLm9uZW5kZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBsb2NhbFZpZGVvQ29udGFpbmVyLnJlbW92ZUNoaWxkKGxvY2FsVmlkZW8pO1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQudXBkYXRlUmVtb3ZlZFZpZGVvKGxvY2FsVmlkZW8uc3JjKTtcbiAgICAgICAgfTtcbiAgICAgICAgLy8gRmxpcCB2aWRlbyB4IGF4aXMgaWYgbmVlZGVkXG4gICAgICAgIGZsaXBYTG9jYWxWaWRlbyA9IGZsaXBYO1xuICAgICAgICBpZiAoZmxpcFgpIHtcbiAgICAgICAgICAgIGxvY2FsVmlkZW9TZWxlY3Rvci5hZGRDbGFzcyhcImZsaXBWaWRlb1hcIik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQXR0YWNoIFdlYlJUQyBzdHJlYW1cbiAgICAgICAgYXR0YWNoTWVkaWFTdHJlYW0obG9jYWxWaWRlb1NlbGVjdG9yLCBzdHJlYW0pO1xuXG4gICAgICAgIGxvY2FsVmlkZW9TcmMgPSBsb2NhbFZpZGVvLnNyYztcblxuICAgICAgICBWaWRlb0xheW91dC51cGRhdGVMYXJnZVZpZGVvKGxvY2FsVmlkZW9TcmMsIDApO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgcmVtb3ZlZCB2aWRlbyBpcyBjdXJyZW50bHkgZGlzcGxheWVkIGFuZCB0cmllcyB0byBkaXNwbGF5XG4gICAgICogYW5vdGhlciBvbmUgaW5zdGVhZC5cbiAgICAgKiBAcGFyYW0gcmVtb3ZlZFZpZGVvU3JjIHNyYyBzdHJlYW0gaWRlbnRpZmllciBvZiB0aGUgdmlkZW8uXG4gICAgICovXG4gICAgbXkudXBkYXRlUmVtb3ZlZFZpZGVvID0gZnVuY3Rpb24ocmVtb3ZlZFZpZGVvU3JjKSB7XG4gICAgICAgIGlmIChyZW1vdmVkVmlkZW9TcmMgPT09ICQoJyNsYXJnZVZpZGVvJykuYXR0cignc3JjJykpIHtcbiAgICAgICAgICAgIC8vIHRoaXMgaXMgY3VycmVudGx5IGRpc3BsYXllZCBhcyBsYXJnZVxuICAgICAgICAgICAgLy8gcGljayB0aGUgbGFzdCB2aXNpYmxlIHZpZGVvIGluIHRoZSByb3dcbiAgICAgICAgICAgIC8vIGlmIG5vYm9keSBlbHNlIGlzIGxlZnQsIHRoaXMgcGlja3MgdGhlIGxvY2FsIHZpZGVvXG4gICAgICAgICAgICB2YXIgcGlja1xuICAgICAgICAgICAgICAgID0gJCgnI3JlbW90ZVZpZGVvcz5zcGFuW2lkIT1cIm1peGVkc3RyZWFtXCJdOnZpc2libGU6bGFzdD52aWRlbycpXG4gICAgICAgICAgICAgICAgICAgIC5nZXQoMCk7XG5cbiAgICAgICAgICAgIGlmICghcGljaykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIkxhc3QgdmlzaWJsZSB2aWRlbyBubyBsb25nZXIgZXhpc3RzXCIpO1xuICAgICAgICAgICAgICAgIHBpY2sgPSAkKCcjcmVtb3RlVmlkZW9zPnNwYW5baWQhPVwibWl4ZWRzdHJlYW1cIl0+dmlkZW8nKS5nZXQoMCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIXBpY2sgfHwgIXBpY2suc3JjKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRyeSBsb2NhbCB2aWRlb1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oXCJGYWxsYmFjayB0byBsb2NhbCB2aWRlby4uLlwiKTtcbiAgICAgICAgICAgICAgICAgICAgcGljayA9ICQoJyNyZW1vdGVWaWRlb3M+c3Bhbj5zcGFuPnZpZGVvJykuZ2V0KDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gbXV0ZSBpZiBsb2NhbHZpZGVvXG4gICAgICAgICAgICBpZiAocGljaykge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8ocGljay5zcmMsIHBpY2sudm9sdW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiRmFpbGVkIHRvIGVsZWN0IGxhcmdlIHZpZGVvXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIEpJRCBvZiB0aGUgdXNlciB0byB3aG9tIGdpdmVuIDx0dD52aWRlb1NyYzwvdHQ+IGJlbG9uZ3MuXG4gICAgICogQHBhcmFtIHZpZGVvU3JjIHRoZSB2aWRlbyBcInNyY1wiIGlkZW50aWZpZXIuXG4gICAgICogQHJldHVybnMge251bGwgfCBTdHJpbmd9IHRoZSBKSUQgb2YgdGhlIHVzZXIgdG8gd2hvbSBnaXZlbiA8dHQ+dmlkZW9TcmM8L3R0PlxuICAgICAqICAgICAgICAgICAgICAgICAgIGJlbG9uZ3MuXG4gICAgICovXG4gICAgbXkuZ2V0SmlkRnJvbVZpZGVvU3JjID0gZnVuY3Rpb24odmlkZW9TcmMpXG4gICAge1xuICAgICAgICBpZiAodmlkZW9TcmMgPT09IGxvY2FsVmlkZW9TcmMpXG4gICAgICAgICAgICByZXR1cm4gWE1QUEFjdGl2YXRvci5nZXRNeUpJRCgpO1xuXG4gICAgICAgIHZhciBzc3JjID0gdmlkZW9TcmNUb1NzcmNbdmlkZW9TcmNdO1xuICAgICAgICBpZiAoIXNzcmMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBYTVBQQWN0aXZhdG9yLmdldEpJREZyb21TU1JDKHNzcmMpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBsYXJnZSB2aWRlbyB3aXRoIHRoZSBnaXZlbiBuZXcgdmlkZW8gc291cmNlLlxuICAgICAqL1xuICAgIG15LnVwZGF0ZUxhcmdlVmlkZW8gPSBmdW5jdGlvbihuZXdTcmMsIHZvbCkge1xuICAgICAgICBjb25zb2xlLmxvZygnaG92ZXIgaW4nLCBuZXdTcmMpO1xuXG4gICAgICAgIGlmICgkKCcjbGFyZ2VWaWRlbycpLmF0dHIoJ3NyYycpICE9IG5ld1NyYykge1xuICAgICAgICAgICAgbGFyZ2VWaWRlb05ld1NyYyA9IG5ld1NyYztcblxuICAgICAgICAgICAgdmFyIGlzVmlzaWJsZSA9ICQoJyNsYXJnZVZpZGVvJykuaXMoJzp2aXNpYmxlJyk7XG5cbiAgICAgICAgICAgIC8vIHdlIG5lZWQgdGhpcyBoZXJlIGJlY2F1c2UgYWZ0ZXIgdGhlIGZhZGUgdGhlIHZpZGVvU3JjIG1heSBoYXZlXG4gICAgICAgICAgICAvLyBjaGFuZ2VkLlxuICAgICAgICAgICAgdmFyIGlzRGVza3RvcCA9IGlzVmlkZW9TcmNEZXNrdG9wKG5ld1NyYyk7XG5cbiAgICAgICAgICAgIHZhciB1c2VySmlkID0gVmlkZW9MYXlvdXQuZ2V0SmlkRnJvbVZpZGVvU3JjKG5ld1NyYyk7XG4gICAgICAgICAgICAvLyB3ZSB3YW50IHRoZSBub3RpZmljYXRpb24gdG8gdHJpZ2dlciBldmVuIGlmIHVzZXJKaWQgaXMgdW5kZWZpbmVkLFxuICAgICAgICAgICAgLy8gb3IgbnVsbC5cbiAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoXCJzZWxlY3RlZGVuZHBvaW50Y2hhbmdlZFwiLCBbdXNlckppZF0pO1xuXG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlbycpLmZhZGVPdXQoMzAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9sZFNyYyA9ICQodGhpcykuYXR0cignc3JjJyk7XG5cbiAgICAgICAgICAgICAgICAkKHRoaXMpLmF0dHIoJ3NyYycsIG5ld1NyYyk7XG5cbiAgICAgICAgICAgICAgICAvLyBTY3JlZW4gc3RyZWFtIGlzIGFscmVhZHkgcm90YXRlZFxuICAgICAgICAgICAgICAgIHZhciBmbGlwWCA9IChuZXdTcmMgPT09IGxvY2FsVmlkZW9TcmMpICYmIGZsaXBYTG9jYWxWaWRlbztcblxuICAgICAgICAgICAgICAgIHZhciB2aWRlb1RyYW5zZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsYXJnZVZpZGVvJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc3R5bGUud2Via2l0VHJhbnNmb3JtO1xuXG4gICAgICAgICAgICAgICAgaWYgKGZsaXBYICYmIHZpZGVvVHJhbnNmb3JtICE9PSAnc2NhbGVYKC0xKScpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xhcmdlVmlkZW8nKS5zdHlsZS53ZWJraXRUcmFuc2Zvcm1cbiAgICAgICAgICAgICAgICAgICAgICAgID0gXCJzY2FsZVgoLTEpXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKCFmbGlwWCAmJiB2aWRlb1RyYW5zZm9ybSA9PT0gJ3NjYWxlWCgtMSknKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsYXJnZVZpZGVvJykuc3R5bGUud2Via2l0VHJhbnNmb3JtXG4gICAgICAgICAgICAgICAgICAgICAgICA9IFwibm9uZVwiO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIENoYW5nZSB0aGUgd2F5IHdlJ2xsIGJlIG1lYXN1cmluZyBhbmQgcG9zaXRpb25pbmcgbGFyZ2UgdmlkZW9cblxuICAgICAgICAgICAgICAgIGdldFZpZGVvU2l6ZSA9IGlzRGVza3RvcFxuICAgICAgICAgICAgICAgICAgICA/IGdldERlc2t0b3BWaWRlb1NpemVcbiAgICAgICAgICAgICAgICAgICAgOiBWaWRlb0xheW91dC5nZXRDYW1lcmFWaWRlb1NpemU7XG4gICAgICAgICAgICAgICAgZ2V0VmlkZW9Qb3NpdGlvbiA9IGlzRGVza3RvcFxuICAgICAgICAgICAgICAgICAgICA/IGdldERlc2t0b3BWaWRlb1Bvc2l0aW9uXG4gICAgICAgICAgICAgICAgICAgIDogVmlkZW9MYXlvdXQuZ2V0Q2FtZXJhVmlkZW9Qb3NpdGlvbjtcblxuICAgICAgICAgICAgICAgIGlmIChpc1Zpc2libGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSBpZiB0aGUgbGFyZ2UgdmlkZW8gaXMgY3VycmVudGx5IHZpc2libGUuXG4gICAgICAgICAgICAgICAgICAgIC8vIERpc2FibGUgcHJldmlvdXMgZG9taW5hbnQgc3BlYWtlciB2aWRlby5cbiAgICAgICAgICAgICAgICAgICAgdmFyIG9sZEppZCA9IFZpZGVvTGF5b3V0LmdldEppZEZyb21WaWRlb1NyYyhvbGRTcmMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAob2xkSmlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgb2xkUmVzb3VyY2VKaWQgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChvbGRKaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuZW5hYmxlRG9taW5hbnRTcGVha2VyKG9sZFJlc291cmNlSmlkLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBFbmFibGUgbmV3IGRvbWluYW50IHNwZWFrZXIgaW4gdGhlIHJlbW90ZSB2aWRlb3Mgc2VjdGlvbi5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHVzZXJKaWQgPSBWaWRlb0xheW91dC5nZXRKaWRGcm9tVmlkZW9TcmMobmV3U3JjKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVzZXJKaWQpXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHVzZXJKaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuZW5hYmxlRG9taW5hbnRTcGVha2VyKHJlc291cmNlSmlkLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICQodGhpcykuZmFkZUluKDMwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhbiBhcnJheSBvZiB0aGUgdmlkZW8gaG9yaXpvbnRhbCBhbmQgdmVydGljYWwgaW5kZW50cy5cbiAgICAgKiBDZW50ZXJzIGhvcml6b250YWxseSBhbmQgdG9wIGFsaWducyB2ZXJ0aWNhbGx5LlxuICAgICAqXG4gICAgICogQHJldHVybiBhbiBhcnJheSB3aXRoIDIgZWxlbWVudHMsIHRoZSBob3Jpem9udGFsIGluZGVudCBhbmQgdGhlIHZlcnRpY2FsXG4gICAgICogaW5kZW50XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0RGVza3RvcFZpZGVvUG9zaXRpb24odmlkZW9XaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZUhlaWdodCkge1xuXG4gICAgICAgIHZhciBob3Jpem9udGFsSW5kZW50ID0gKHZpZGVvU3BhY2VXaWR0aCAtIHZpZGVvV2lkdGgpIC8gMjtcblxuICAgICAgICB2YXIgdmVydGljYWxJbmRlbnQgPSAwOy8vIFRvcCBhbGlnbmVkXG5cbiAgICAgICAgcmV0dXJuIFtob3Jpem9udGFsSW5kZW50LCB2ZXJ0aWNhbEluZGVudF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHZpZGVvIGlkZW50aWZpZWQgYnkgZ2l2ZW4gc3JjIGlzIGRlc2t0b3Agc3RyZWFtLlxuICAgICAqIEBwYXJhbSB2aWRlb1NyYyBlZy5cbiAgICAgKiBibG9iOmh0dHBzJTNBLy9wYXdlbC5qaXRzaS5uZXQvOWE0NmUwYmQtMTMxZS00ZDE4LTljMTQtYTkyNjRlOGRiMzk1XG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNWaWRlb1NyY0Rlc2t0b3AodmlkZW9TcmMpIHtcbiAgICAgICAgLy8gRklYTUU6IGZpeCB0aGlzIG1hcHBpbmcgbWVzcy4uLlxuICAgICAgICAvLyBmaWd1cmUgb3V0IGlmIGxhcmdlIHZpZGVvIGlzIGRlc2t0b3Agc3RyZWFtIG9yIGp1c3QgYSBjYW1lcmFcbiAgICAgICAgdmFyIGlzRGVza3RvcCA9IGZhbHNlO1xuICAgICAgICBpZiAobG9jYWxWaWRlb1NyYyA9PT0gdmlkZW9TcmMpIHtcbiAgICAgICAgICAgIC8vIGxvY2FsIHZpZGVvXG4gICAgICAgICAgICBpc0Rlc2t0b3AgPSBpc1VzaW5nU2NyZWVuU3RyZWFtO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRG8gd2UgaGF2ZSBhc3NvY2lhdGlvbnMuLi5cbiAgICAgICAgICAgIHZhciB2aWRlb1NzcmMgPSB2aWRlb1NyY1RvU3NyY1t2aWRlb1NyY107XG4gICAgICAgICAgICBpZiAodmlkZW9Tc3JjKSB7XG4gICAgICAgICAgICAgICAgdmFyIHZpZGVvVHlwZSA9IFhNUFBBY3RpdmF0b3IuZ2V0VmlkZW9UeXBlRnJvbVNTUkModmlkZW9Tc3JjKTtcbiAgICAgICAgICAgICAgICBpZiAodmlkZW9UeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZpbmFsbHkgdGhlcmUuLi5cbiAgICAgICAgICAgICAgICAgICAgaXNEZXNrdG9wID0gdmlkZW9UeXBlID09PSAnc2NyZWVuJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiTm8gdmlkZW8gdHlwZSBmb3Igc3NyYzogXCIgKyB2aWRlb1NzcmMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIk5vIHNzcmMgZm9yIHNyYzogXCIgKyB2aWRlb1NyYyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGlzRGVza3RvcDtcbiAgICB9XG5cblxuICAgIG15LmhhbmRsZVZpZGVvVGh1bWJDbGlja2VkID0gZnVuY3Rpb24odmlkZW9TcmMpIHtcbiAgICAgICAgLy8gUmVzdG9yZSBzdHlsZSBmb3IgcHJldmlvdXNseSBmb2N1c2VkIHZpZGVvXG4gICAgICAgIHZhciBmb2N1c0ppZCA9IFZpZGVvTGF5b3V0LmdldEppZEZyb21WaWRlb1NyYyhWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMpO1xuICAgICAgICB2YXIgb2xkQ29udGFpbmVyID0gZ2V0UGFydGljaXBhbnRDb250YWluZXIoZm9jdXNKaWQpO1xuXG4gICAgICAgIGlmIChvbGRDb250YWluZXIpIHtcbiAgICAgICAgICAgIG9sZENvbnRhaW5lci5yZW1vdmVDbGFzcyhcInZpZGVvQ29udGFpbmVyRm9jdXNlZFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVubG9jayBjdXJyZW50IGZvY3VzZWQuIFxuICAgICAgICBpZiAoVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjID09PSB2aWRlb1NyYylcbiAgICAgICAge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjID0gbnVsbDtcbiAgICAgICAgICAgIHZhciBkb21pbmFudFNwZWFrZXJWaWRlbyA9IG51bGw7XG4gICAgICAgICAgICAvLyBFbmFibGUgdGhlIGN1cnJlbnRseSBzZXQgZG9taW5hbnQgc3BlYWtlci5cbiAgICAgICAgICAgIGlmIChjdXJyZW50RG9taW5hbnRTcGVha2VyKSB7XG4gICAgICAgICAgICAgICAgZG9taW5hbnRTcGVha2VyVmlkZW9cbiAgICAgICAgICAgICAgICAgICAgPSAkKCcjcGFydGljaXBhbnRfJyArIGN1cnJlbnREb21pbmFudFNwZWFrZXIgKyAnPnZpZGVvJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5nZXQoMCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZG9taW5hbnRTcGVha2VyVmlkZW8pIHtcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQudXBkYXRlTGFyZ2VWaWRlbyhkb21pbmFudFNwZWFrZXJWaWRlby5zcmMsIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTG9jayBuZXcgdmlkZW9cbiAgICAgICAgVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjID0gdmlkZW9TcmM7XG5cbiAgICAgICAgLy8gVXBkYXRlIGZvY3VzZWQvcGlubmVkIGludGVyZmFjZS5cbiAgICAgICAgdmFyIHVzZXJKaWQgPSBWaWRlb0xheW91dC5nZXRKaWRGcm9tVmlkZW9TcmModmlkZW9TcmMpO1xuICAgICAgICBpZiAodXNlckppZClcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIGNvbnRhaW5lciA9IGdldFBhcnRpY2lwYW50Q29udGFpbmVyKHVzZXJKaWQpO1xuICAgICAgICAgICAgY29udGFpbmVyLmFkZENsYXNzKFwidmlkZW9Db250YWluZXJGb2N1c2VkXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHJpZ2dlcnMgYSBcInZpZGVvLnNlbGVjdGVkXCIgZXZlbnQuIFRoZSBcImZhbHNlXCIgcGFyYW1ldGVyIGluZGljYXRlc1xuICAgICAgICAvLyB0aGlzIGlzbid0IGEgcHJlemkuXG4gICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoXCJ2aWRlby5zZWxlY3RlZFwiLCBbZmFsc2VdKTtcblxuICAgICAgICBWaWRlb0xheW91dC51cGRhdGVMYXJnZVZpZGVvKHZpZGVvU3JjLCAxKTtcblxuICAgICAgICAkKCdhdWRpbycpLmVhY2goZnVuY3Rpb24gKGlkeCwgZWwpIHtcbiAgICAgICAgICAgIGlmIChlbC5pZC5pbmRleE9mKCdtaXhlZG1zbGFiZWwnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBlbC52b2x1bWUgPSAwO1xuICAgICAgICAgICAgICAgIGVsLnZvbHVtZSA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBQb3NpdGlvbnMgdGhlIGxhcmdlIHZpZGVvLlxuICAgICAqXG4gICAgICogQHBhcmFtIHZpZGVvV2lkdGggdGhlIHN0cmVhbSB2aWRlbyB3aWR0aFxuICAgICAqIEBwYXJhbSB2aWRlb0hlaWdodCB0aGUgc3RyZWFtIHZpZGVvIGhlaWdodFxuICAgICAqL1xuICAgIG15LnBvc2l0aW9uTGFyZ2UgPSBmdW5jdGlvbiAodmlkZW9XaWR0aCwgdmlkZW9IZWlnaHQpIHtcbiAgICAgICAgdmFyIHZpZGVvU3BhY2VXaWR0aCA9ICQoJyN2aWRlb3NwYWNlJykud2lkdGgoKTtcbiAgICAgICAgdmFyIHZpZGVvU3BhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG5cbiAgICAgICAgdmFyIHZpZGVvU2l6ZSA9IGdldFZpZGVvU2l6ZSh2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlSGVpZ2h0KTtcblxuICAgICAgICB2YXIgbGFyZ2VWaWRlb1dpZHRoID0gdmlkZW9TaXplWzBdO1xuICAgICAgICB2YXIgbGFyZ2VWaWRlb0hlaWdodCA9IHZpZGVvU2l6ZVsxXTtcblxuICAgICAgICB2YXIgdmlkZW9Qb3NpdGlvbiA9IGdldFZpZGVvUG9zaXRpb24obGFyZ2VWaWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFyZ2VWaWRlb0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VIZWlnaHQpO1xuXG4gICAgICAgIHZhciBob3Jpem9udGFsSW5kZW50ID0gdmlkZW9Qb3NpdGlvblswXTtcbiAgICAgICAgdmFyIHZlcnRpY2FsSW5kZW50ID0gdmlkZW9Qb3NpdGlvblsxXTtcblxuICAgICAgICBwb3NpdGlvblZpZGVvKCQoJyNsYXJnZVZpZGVvJyksXG4gICAgICAgICAgICAgICAgICAgICAgbGFyZ2VWaWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgIGxhcmdlVmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgaG9yaXpvbnRhbEluZGVudCwgdmVydGljYWxJbmRlbnQpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTaG93cy9oaWRlcyB0aGUgbGFyZ2UgdmlkZW8uXG4gICAgICovXG4gICAgbXkuc2V0TGFyZ2VWaWRlb1Zpc2libGUgPSBmdW5jdGlvbihpc1Zpc2libGUpIHtcbiAgICAgICAgdmFyIGxhcmdlVmlkZW9KaWQgPSBWaWRlb0xheW91dC5nZXRKaWRGcm9tVmlkZW9TcmMoJCgnI2xhcmdlVmlkZW8nKS5hdHRyKCdzcmMnKSk7XG4gICAgICAgIHZhciByZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGxhcmdlVmlkZW9KaWQpO1xuXG4gICAgICAgIGlmIChpc1Zpc2libGUpIHtcbiAgICAgICAgICAgICQoJyNsYXJnZVZpZGVvJykuY3NzKHt2aXNpYmlsaXR5OiAndmlzaWJsZSd9KTtcbiAgICAgICAgICAgICQoJy53YXRlcm1hcmsnKS5jc3Moe3Zpc2liaWxpdHk6ICd2aXNpYmxlJ30pO1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuZW5hYmxlRG9taW5hbnRTcGVha2VyKHJlc291cmNlSmlkLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICQoJyNsYXJnZVZpZGVvJykuY3NzKHt2aXNpYmlsaXR5OiAnaGlkZGVuJ30pO1xuICAgICAgICAgICAgJCgnLndhdGVybWFyaycpLmNzcyh7dmlzaWJpbGl0eTogJ2hpZGRlbid9KTtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmVuYWJsZURvbWluYW50U3BlYWtlcihyZXNvdXJjZUppZCwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEluZGljYXRlcyBpZiB0aGUgbGFyZ2UgdmlkZW8gaXMgY3VycmVudGx5IHZpc2libGUuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIDx0dD50cnVlPC90dD4gaWYgdmlzaWJsZSwgPHR0PmZhbHNlPC90dD4gLSBvdGhlcndpc2VcbiAgICAgKi9cbiAgICBteS5pc0xhcmdlVmlkZW9WaXNpYmxlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAkKCcjbGFyZ2VWaWRlbycpLmlzKCc6dmlzaWJsZScpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgY29udGFpbmVyIGZvciBwYXJ0aWNpcGFudCBpZGVudGlmaWVkIGJ5IGdpdmVuIHBlZXJKaWQgZXhpc3RzXG4gICAgICogaW4gdGhlIGRvY3VtZW50IGFuZCBjcmVhdGVzIGl0IGV2ZW50dWFsbHkuXG4gICAgICogXG4gICAgICogQHBhcmFtIHBlZXJKaWQgcGVlciBKaWQgdG8gY2hlY2suXG4gICAgICogXG4gICAgICogQHJldHVybiBSZXR1cm5zIDx0dD50cnVlPC90dD4gaWYgdGhlIHBlZXIgY29udGFpbmVyIGV4aXN0cyxcbiAgICAgKiA8dHQ+ZmFsc2U8L3R0PiAtIG90aGVyd2lzZVxuICAgICAqL1xuICAgIG15LmVuc3VyZVBlZXJDb250YWluZXJFeGlzdHMgPSBmdW5jdGlvbihwZWVySmlkKSB7XG4gICAgICAgIGRlcC5Db250YWN0TGlzdCgpLmVuc3VyZUFkZENvbnRhY3QocGVlckppZCk7XG5cbiAgICAgICAgdmFyIHJlc291cmNlSmlkID0gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQocGVlckppZCk7XG5cbiAgICAgICAgdmFyIHZpZGVvU3BhbklkID0gJ3BhcnRpY2lwYW50XycgKyByZXNvdXJjZUppZDtcblxuICAgICAgICBpZiAoJCgnIycgKyB2aWRlb1NwYW5JZCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gSWYgdGhlcmUncyBiZWVuIGEgZm9jdXMgY2hhbmdlLCBtYWtlIHN1cmUgd2UgYWRkIGZvY3VzIHJlbGF0ZWRcbiAgICAgICAgICAgIC8vIGludGVyZmFjZSEhXG4gICAgICAgICAgICBpZiAoWE1QUEFjdGl2YXRvci5pc0ZvY3VzKCkgJiYgJCgnI3JlbW90ZV9wb3B1cG1lbnVfJyArIHJlc291cmNlSmlkKS5sZW5ndGggPD0gMClcbiAgICAgICAgICAgICAgICBhZGRSZW1vdGVWaWRlb01lbnUoIHBlZXJKaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh2aWRlb1NwYW5JZCkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGNvbnRhaW5lclxuICAgICAgICAgICAgICAgID0gVmlkZW9MYXlvdXQuYWRkUmVtb3RlVmlkZW9Db250YWluZXIocGVlckppZCwgdmlkZW9TcGFuSWQpO1xuXG4gICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCBkaXNwbGF5IG5hbWUuXG4gICAgICAgICAgICBzZXREaXNwbGF5TmFtZSh2aWRlb1NwYW5JZCk7XG5cbiAgICAgICAgICAgIHZhciBuaWNrZmllbGQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICBuaWNrZmllbGQuY2xhc3NOYW1lID0gXCJuaWNrXCI7XG4gICAgICAgICAgICBuaWNrZmllbGQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUocmVzb3VyY2VKaWQpKTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChuaWNrZmllbGQpO1xuXG4gICAgICAgICAgICAvLyBJbiBjYXNlIHRoaXMgaXMgbm90IGN1cnJlbnRseSBpbiB0aGUgbGFzdCBuIHdlIGRvbid0IHNob3cgaXQuXG4gICAgICAgICAgICBpZiAobGFzdE5Db3VudFxuICAgICAgICAgICAgICAgICYmIGxhc3ROQ291bnQgPiAwXG4gICAgICAgICAgICAgICAgJiYgJCgnI3JlbW90ZVZpZGVvcz5zcGFuJykubGVuZ3RoID49IGxhc3ROQ291bnQgKyAyKSB7XG4gICAgICAgICAgICAgICAgc2hvd1BlZXJDb250YWluZXIocmVzb3VyY2VKaWQsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5yZXNpemVUaHVtYm5haWxzKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgbXkuYWRkUmVtb3RlVmlkZW9Db250YWluZXIgPSBmdW5jdGlvbihwZWVySmlkLCBzcGFuSWQpIHtcbiAgICAgICAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgY29udGFpbmVyLmlkID0gc3BhbklkO1xuICAgICAgICBjb250YWluZXIuY2xhc3NOYW1lID0gJ3ZpZGVvY29udGFpbmVyJztcbiAgICAgICAgdmFyIHJlbW90ZXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVtb3RlVmlkZW9zJyk7XG5cbiAgICAgICAgLy8gSWYgdGhlIHBlZXJKaWQgaXMgbnVsbCB0aGVuIHRoaXMgdmlkZW8gc3BhbiBjb3VsZG4ndCBiZSBkaXJlY3RseVxuICAgICAgICAvLyBhc3NvY2lhdGVkIHdpdGggYSBwYXJ0aWNpcGFudCAodGhpcyBjb3VsZCBoYXBwZW4gaW4gdGhlIGNhc2Ugb2YgcHJlemkpLlxuICAgICAgICBpZiAoWE1QUEFjdGl2YXRvci5pc0ZvY3VzKCkgJiYgcGVlckppZCAhPSBudWxsKVxuICAgICAgICAgICAgYWRkUmVtb3RlVmlkZW9NZW51KHBlZXJKaWQsIGNvbnRhaW5lcik7XG5cbiAgICAgICAgcmVtb3Rlcy5hcHBlbmRDaGlsZChjb250YWluZXIpO1xuICAgICAgICBkZXAuVUlBY3RpdmF0b3IoKS5nZXRVSVNlcnZpY2UoKS51cGRhdGVBdWRpb0xldmVsQ2FudmFzKHBlZXJKaWQpO1xuXG4gICAgICAgIHJldHVybiBjb250YWluZXI7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYXVkaW8gb3IgdmlkZW8gc3RyZWFtIGVsZW1lbnQuXG4gICAgICovXG4gICAgbXkuY3JlYXRlU3RyZWFtRWxlbWVudCA9IGZ1bmN0aW9uIChzaWQsIHN0cmVhbSkge1xuICAgICAgICB2YXIgaXNWaWRlbyA9IHN0cmVhbS5nZXRWaWRlb1RyYWNrcygpLmxlbmd0aCA+IDA7XG5cbiAgICAgICAgaWYoaXNWaWRlbylcbiAgICAgICAge1xuICAgICAgICAgICAgY29uc29sZS50cmFjZShzdHJlYW0pO1xuICAgICAgICB9XG4gICAgICAgIHZhciBlbGVtZW50ID0gaXNWaWRlb1xuICAgICAgICAgICAgICAgICAgICAgICAgPyBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd2aWRlbycpXG4gICAgICAgICAgICAgICAgICAgICAgICA6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2F1ZGlvJyk7XG4gICAgICAgIHZhciBpZCA9IChpc1ZpZGVvID8gJ3JlbW90ZVZpZGVvXycgOiAncmVtb3RlQXVkaW9fJylcbiAgICAgICAgICAgICAgICAgICAgKyBzaWQgKyAnXycgKyBzdHJlYW0uaWQ7XG5cbiAgICAgICAgZWxlbWVudC5pZCA9IGlkO1xuICAgICAgICBlbGVtZW50LmF1dG9wbGF5ID0gdHJ1ZTtcbiAgICAgICAgZWxlbWVudC5vbmNvbnRleHRtZW51ID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gZmFsc2U7IH07XG5cbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgfTtcblxuICAgIG15LmFkZFJlbW90ZVN0cmVhbUVsZW1lbnRcbiAgICAgICAgPSBmdW5jdGlvbiAoY29udGFpbmVyLCBzaWQsIHN0cmVhbSwgcGVlckppZCwgdGhlc3NyYykge1xuICAgICAgICB2YXIgbmV3RWxlbWVudElkID0gbnVsbDtcblxuICAgICAgICB2YXIgaXNWaWRlbyA9IHN0cmVhbS5nZXRWaWRlb1RyYWNrcygpLmxlbmd0aCA+IDA7XG5cbiAgICAgICAgaWYgKGNvbnRhaW5lcikge1xuICAgICAgICAgICAgdmFyIHN0cmVhbUVsZW1lbnQgPSBWaWRlb0xheW91dC5jcmVhdGVTdHJlYW1FbGVtZW50KHNpZCwgc3RyZWFtKTtcbiAgICAgICAgICAgIG5ld0VsZW1lbnRJZCA9IHN0cmVhbUVsZW1lbnQuaWQ7XG5cbiAgICAgICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChzdHJlYW1FbGVtZW50KTtcblxuICAgICAgICAgICAgdmFyIHNlbCA9ICQoJyMnICsgbmV3RWxlbWVudElkKTtcbiAgICAgICAgICAgIHNlbC5oaWRlKCk7XG5cbiAgICAgICAgICAgIC8vIElmIHRoZSBjb250YWluZXIgaXMgY3VycmVudGx5IHZpc2libGUgd2UgYXR0YWNoIHRoZSBzdHJlYW0uXG4gICAgICAgICAgICBpZiAoIWlzVmlkZW9cbiAgICAgICAgICAgICAgICB8fCAoY29udGFpbmVyLm9mZnNldFBhcmVudCAhPT0gbnVsbCAmJiBpc1ZpZGVvKSkge1xuLy88PDw8PDw8IEhFQUQ6VUkvdmlkZW9sYXlvdXQuanNcbi8vICAgICAgICAgICAgICAgIGF0dGFjaE1lZGlhU3RyZWFtKHNlbCwgc3RyZWFtKTtcbi8vPT09PT09PVxuICAgICAgICAgICAgICAgIHZhciBzaW11bGNhc3QgPSBuZXcgU2ltdWxjYXN0KCk7XG4gICAgICAgICAgICAgICAgdmFyIHZpZGVvU3RyZWFtID0gc2ltdWxjYXN0LmdldFJlY2VpdmluZ1ZpZGVvU3RyZWFtKHN0cmVhbSk7XG4gICAgICAgICAgICAgICAgYXR0YWNoTWVkaWFTdHJlYW0oc2VsLCB2aWRlb1N0cmVhbSk7XG4vLz4+Pj4+Pj4gbWFzdGVyOnZpZGVvbGF5b3V0LmpzXG5cbiAgICAgICAgICAgICAgICBpZiAoaXNWaWRlbylcbiAgICAgICAgICAgICAgICAgICAgd2FpdEZvclJlbW90ZVZpZGVvKHNlbCwgdGhlc3NyYywgc3RyZWFtKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3RyZWFtLm9uZW5kZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3N0cmVhbSBlbmRlZCcsIHRoaXMpO1xuXG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQucmVtb3ZlUmVtb3RlU3RyZWFtRWxlbWVudChzdHJlYW0sIGNvbnRhaW5lcik7XG5cbiAgICAgICAgICAgICAgICBpZiAocGVlckppZClcbiAgICAgICAgICAgICAgICAgICAgZGVwLkNvbnRhY3RMaXN0KCkucmVtb3ZlQ29udGFjdChwZWVySmlkKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIEFkZCBjbGljayBoYW5kbGVyLlxuICAgICAgICAgICAgY29udGFpbmVyLm9uY2xpY2sgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAqIEZJWE1FIEl0IHR1cm5zIG91dCB0aGF0IHZpZGVvVGh1bWIgbWF5IG5vdCBleGlzdCAoaWYgdGhlcmUgaXNcbiAgICAgICAgICAgICAgICAgKiBubyBhY3R1YWwgdmlkZW8pLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHZhciB2aWRlb1RodW1iID0gJCgnIycgKyBjb250YWluZXIuaWQgKyAnPnZpZGVvJykuZ2V0KDApO1xuXG4gICAgICAgICAgICAgICAgaWYgKHZpZGVvVGh1bWIpXG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LmhhbmRsZVZpZGVvVGh1bWJDbGlja2VkKHZpZGVvVGh1bWIuc3JjKTtcblxuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gQWRkIGhvdmVyIGhhbmRsZXJcbiAgICAgICAgICAgICQoY29udGFpbmVyKS5ob3ZlcihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0Rpc3BsYXlOYW1lKGNvbnRhaW5lci5pZCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZpZGVvU3JjID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQoJyMnICsgY29udGFpbmVyLmlkICsgJz52aWRlbycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgJCgnIycgKyBjb250YWluZXIuaWQgKyAnPnZpZGVvJykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcmMgPSAkKCcjJyArIGNvbnRhaW5lci5pZCArICc+dmlkZW8nKS5nZXQoMCkuc3JjO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIHZpZGVvIGhhcyBiZWVuIFwicGlubmVkXCIgYnkgdGhlIHVzZXIgd2Ugd2FudCB0b1xuICAgICAgICAgICAgICAgICAgICAvLyBrZWVwIHRoZSBkaXNwbGF5IG5hbWUgb24gcGxhY2UuXG4gICAgICAgICAgICAgICAgICAgIGlmICghVmlkZW9MYXlvdXQuaXNMYXJnZVZpZGVvVmlzaWJsZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgdmlkZW9TcmMgIT09ICQoJyNsYXJnZVZpZGVvJykuYXR0cignc3JjJykpXG4gICAgICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zaG93RGlzcGxheU5hbWUoY29udGFpbmVyLmlkLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXdFbGVtZW50SWQ7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgdGhlIHJlbW90ZSBzdHJlYW0gZWxlbWVudCBjb3JyZXNwb25kaW5nIHRvIHRoZSBnaXZlbiBzdHJlYW0gYW5kXG4gICAgICogcGFyZW50IGNvbnRhaW5lci5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0gc3RyZWFtIHRoZSBzdHJlYW1cbiAgICAgKiBAcGFyYW0gY29udGFpbmVyXG4gICAgICovXG4gICAgbXkucmVtb3ZlUmVtb3RlU3RyZWFtRWxlbWVudCA9IGZ1bmN0aW9uIChzdHJlYW0sIGNvbnRhaW5lcikge1xuICAgICAgICBpZiAoIWNvbnRhaW5lcilcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICB2YXIgc2VsZWN0ID0gbnVsbDtcbiAgICAgICAgdmFyIHJlbW92ZWRWaWRlb1NyYyA9IG51bGw7XG4gICAgICAgIGlmIChzdHJlYW0uZ2V0VmlkZW9UcmFja3MoKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBzZWxlY3QgPSAkKCcjJyArIGNvbnRhaW5lci5pZCArICc+dmlkZW8nKTtcbiAgICAgICAgICAgIHJlbW92ZWRWaWRlb1NyYyA9IHNlbGVjdC5nZXQoMCkuc3JjO1xuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHNlbGVjdCA9ICQoJyMnICsgY29udGFpbmVyLmlkICsgJz5hdWRpbycpO1xuXG4gICAgICAgIC8vIFJlbW92ZSB2aWRlbyBzb3VyY2UgZnJvbSB0aGUgbWFwcGluZy5cbiAgICAgICAgZGVsZXRlIHZpZGVvU3JjVG9Tc3JjW3JlbW92ZWRWaWRlb1NyY107XG5cbiAgICAgICAgLy8gTWFyayB2aWRlbyBhcyByZW1vdmVkIHRvIGNhbmNlbCB3YWl0aW5nIGxvb3AoaWYgdmlkZW8gaXMgcmVtb3ZlZFxuICAgICAgICAvLyBiZWZvcmUgaGFzIHN0YXJ0ZWQpXG4gICAgICAgIHNlbGVjdC5yZW1vdmVkID0gdHJ1ZTtcbiAgICAgICAgc2VsZWN0LnJlbW92ZSgpO1xuXG4gICAgICAgIHZhciBhdWRpb0NvdW50ID0gJCgnIycgKyBjb250YWluZXIuaWQgKyAnPmF1ZGlvJykubGVuZ3RoO1xuICAgICAgICB2YXIgdmlkZW9Db3VudCA9ICQoJyMnICsgY29udGFpbmVyLmlkICsgJz52aWRlbycpLmxlbmd0aDtcblxuICAgICAgICBpZiAoIWF1ZGlvQ291bnQgJiYgIXZpZGVvQ291bnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVtb3ZlIHdob2xlIHVzZXJcIiwgY29udGFpbmVyLmlkKTtcbiAgICAgICAgICAgIC8vIFJlbW92ZSB3aG9sZSBjb250YWluZXJcbiAgICAgICAgICAgIGNvbnRhaW5lci5yZW1vdmUoKTtcbiAgICAgICAgICAgIFV0aWwucGxheVNvdW5kTm90aWZpY2F0aW9uKCd1c2VyTGVmdCcpO1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplVGh1bWJuYWlscygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlbW92ZWRWaWRlb1NyYylcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZVJlbW92ZWRWaWRlbyhyZW1vdmVkVmlkZW9TcmMpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTaG93L2hpZGUgcGVlciBjb250YWluZXIgZm9yIHRoZSBnaXZlbiByZXNvdXJjZUppZC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzaG93UGVlckNvbnRhaW5lcihyZXNvdXJjZUppZCwgaXNTaG93KSB7XG4gICAgICAgIHZhciBwZWVyQ29udGFpbmVyID0gJCgnI3BhcnRpY2lwYW50XycgKyByZXNvdXJjZUppZCk7XG5cbiAgICAgICAgaWYgKCFwZWVyQ29udGFpbmVyKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIGlmICghcGVlckNvbnRhaW5lci5pcygnOnZpc2libGUnKSAmJiBpc1Nob3cpXG4gICAgICAgICAgICBwZWVyQ29udGFpbmVyLnNob3coKTtcbiAgICAgICAgZWxzZSBpZiAocGVlckNvbnRhaW5lci5pcygnOnZpc2libGUnKSAmJiAhaXNTaG93KVxuICAgICAgICAgICAgcGVlckNvbnRhaW5lci5oaWRlKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGRpc3BsYXkgbmFtZSBmb3IgdGhlIGdpdmVuIHZpZGVvIHNwYW4gaWQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2V0RGlzcGxheU5hbWUodmlkZW9TcGFuSWQsIGRpc3BsYXlOYW1lKSB7XG4gICAgICAgIHZhciBuYW1lU3BhbiA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPnNwYW4uZGlzcGxheW5hbWUnKTtcbiAgICAgICAgdmFyIGRlZmF1bHRMb2NhbERpc3BsYXlOYW1lID0gXCJNZVwiO1xuXG4gICAgICAgIC8vIElmIHdlIGFscmVhZHkgaGF2ZSBhIGRpc3BsYXkgbmFtZSBmb3IgdGhpcyB2aWRlby5cbiAgICAgICAgaWYgKG5hbWVTcGFuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBuYW1lU3BhbkVsZW1lbnQgPSBuYW1lU3Bhbi5nZXQoMCk7XG5cbiAgICAgICAgICAgIGlmIChuYW1lU3BhbkVsZW1lbnQuaWQgPT09ICdsb2NhbERpc3BsYXlOYW1lJyAmJlxuICAgICAgICAgICAgICAgICQoJyNsb2NhbERpc3BsYXlOYW1lJykudGV4dCgpICE9PSBkaXNwbGF5TmFtZSkge1xuICAgICAgICAgICAgICAgIGlmIChkaXNwbGF5TmFtZSAmJiBkaXNwbGF5TmFtZS5sZW5ndGggPiAwKVxuICAgICAgICAgICAgICAgICAgICAkKCcjbG9jYWxEaXNwbGF5TmFtZScpLnRleHQoZGlzcGxheU5hbWUgKyAnIChtZSknKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICQoJyNsb2NhbERpc3BsYXlOYW1lJykudGV4dChkZWZhdWx0TG9jYWxEaXNwbGF5TmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChkaXNwbGF5TmFtZSAmJiBkaXNwbGF5TmFtZS5sZW5ndGggPiAwKVxuICAgICAgICAgICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkICsgJ19uYW1lJykudGV4dChkaXNwbGF5TmFtZSk7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkICsgJ19uYW1lJykudGV4dChpbnRlcmZhY2VDb25maWcuREVGQVVMVF9SRU1PVEVfRElTUExBWV9OQU1FKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBlZGl0QnV0dG9uID0gbnVsbDtcblxuICAgICAgICAgICAgbmFtZVNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICBuYW1lU3Bhbi5jbGFzc05hbWUgPSAnZGlzcGxheW5hbWUnO1xuICAgICAgICAgICAgJCgnIycgKyB2aWRlb1NwYW5JZClbMF0uYXBwZW5kQ2hpbGQobmFtZVNwYW4pO1xuXG4gICAgICAgICAgICBpZiAodmlkZW9TcGFuSWQgPT09ICdsb2NhbFZpZGVvQ29udGFpbmVyJykge1xuICAgICAgICAgICAgICAgIGVkaXRCdXR0b24gPSBjcmVhdGVFZGl0RGlzcGxheU5hbWVCdXR0b24oKTtcbiAgICAgICAgICAgICAgICBuYW1lU3Bhbi5pbm5lclRleHQgPSBkZWZhdWx0TG9jYWxEaXNwbGF5TmFtZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG5hbWVTcGFuLmlubmVyVGV4dCA9IGludGVyZmFjZUNvbmZpZy5ERUZBVUxUX1JFTU9URV9ESVNQTEFZX05BTUU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChkaXNwbGF5TmFtZSAmJiBkaXNwbGF5TmFtZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgbmFtZVNwYW4uaW5uZXJUZXh0ID0gZGlzcGxheU5hbWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZWRpdEJ1dHRvbikge1xuICAgICAgICAgICAgICAgIG5hbWVTcGFuLmlkID0gdmlkZW9TcGFuSWQgKyAnX25hbWUnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBuYW1lU3Bhbi5pZCA9ICdsb2NhbERpc3BsYXlOYW1lJztcbiAgICAgICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkKVswXS5hcHBlbmRDaGlsZChlZGl0QnV0dG9uKTtcblxuICAgICAgICAgICAgICAgIHZhciBlZGl0YWJsZVRleHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgICAgICAgICAgICAgIGVkaXRhYmxlVGV4dC5jbGFzc05hbWUgPSAnZGlzcGxheW5hbWUnO1xuICAgICAgICAgICAgICAgIGVkaXRhYmxlVGV4dC50eXBlID0gJ3RleHQnO1xuICAgICAgICAgICAgICAgIGVkaXRhYmxlVGV4dC5pZCA9ICdlZGl0RGlzcGxheU5hbWUnO1xuXG4gICAgICAgICAgICAgICAgaWYgKGRpc3BsYXlOYW1lICYmIGRpc3BsYXlOYW1lLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBlZGl0YWJsZVRleHQudmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgID0gZGlzcGxheU5hbWUuc3Vic3RyaW5nKDAsIGRpc3BsYXlOYW1lLmluZGV4T2YoJyAobWUpJykpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGVkaXRhYmxlVGV4dC5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ2Rpc3BsYXk6bm9uZTsnKTtcbiAgICAgICAgICAgICAgICBlZGl0YWJsZVRleHQuc2V0QXR0cmlidXRlKCdwbGFjZWhvbGRlcicsICdleC4gSmFuZSBQaW5rJyk7XG4gICAgICAgICAgICAgICAgJCgnIycgKyB2aWRlb1NwYW5JZClbMF0uYXBwZW5kQ2hpbGQoZWRpdGFibGVUZXh0KTtcblxuICAgICAgICAgICAgICAgICQoJyNsb2NhbFZpZGVvQ29udGFpbmVyIC5kaXNwbGF5bmFtZScpXG4gICAgICAgICAgICAgICAgICAgIC5iaW5kKFwiY2xpY2tcIiwgZnVuY3Rpb24gKGUpIHtcblxuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNsb2NhbERpc3BsYXlOYW1lJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkKCcjZWRpdERpc3BsYXlOYW1lJykuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkKCcjZWRpdERpc3BsYXlOYW1lJykuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2VkaXREaXNwbGF5TmFtZScpLnNlbGVjdCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBpbnB1dERpc3BsYXlOYW1lSGFuZGxlciA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmlja25hbWUgPSBkZXAuVUlBY3RpdmF0b3IoKS5nZXRVSVNlcnZpY2UoKS5nZXROaWNrbmFtZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5pY2tuYW1lICE9PSBuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVwLlVJQWN0aXZhdG9yKCkuZ2V0VUlTZXJ2aWNlKCkuc2V0Tmlja25hbWUobmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmlja25hbWUgID0gbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLmRpc3BsYXluYW1lID0gbmlja25hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgWE1QUEFjdGl2YXRvci5hZGRUb1ByZXNlbmNlKFwiZGlzcGxheU5hbWVcIiwgbmlja25hbWUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVwLkNoYXQoKS5zZXRDaGF0Q29udmVyc2F0aW9uTW9kZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEkKCcjbG9jYWxEaXNwbGF5TmFtZScpLmlzKFwiOnZpc2libGVcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmlja25hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNsb2NhbERpc3BsYXlOYW1lJykudGV4dChuaWNrbmFtZSArIFwiIChtZSlcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjbG9jYWxEaXNwbGF5TmFtZScpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGV4dChkZWZhdWx0TG9jYWxEaXNwbGF5TmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI2xvY2FsRGlzcGxheU5hbWUnKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICQoJyNlZGl0RGlzcGxheU5hbWUnKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgJCgnI2VkaXREaXNwbGF5TmFtZScpLm9uZShcImZvY3Vzb3V0XCIsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dERpc3BsYXlOYW1lSGFuZGxlcih0aGlzLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgJCgnI2VkaXREaXNwbGF5TmFtZScpLm9uKCdrZXlkb3duJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0RGlzcGxheU5hbWVIYW5kbGVyKHRoaXMudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTaG93cy9oaWRlcyB0aGUgZGlzcGxheSBuYW1lIG9uIHRoZSByZW1vdGUgdmlkZW8uXG4gICAgICogQHBhcmFtIHZpZGVvU3BhbklkIHRoZSBpZGVudGlmaWVyIG9mIHRoZSB2aWRlbyBzcGFuIGVsZW1lbnRcbiAgICAgKiBAcGFyYW0gaXNTaG93IGluZGljYXRlcyBpZiB0aGUgZGlzcGxheSBuYW1lIHNob3VsZCBiZSBzaG93biBvciBoaWRkZW5cbiAgICAgKi9cbiAgICBteS5zaG93RGlzcGxheU5hbWUgPSBmdW5jdGlvbih2aWRlb1NwYW5JZCwgaXNTaG93KSB7XG4gICAgICAgIHZhciBuYW1lU3BhbiA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPnNwYW4uZGlzcGxheW5hbWUnKS5nZXQoMCk7XG4gICAgICAgIGlmIChpc1Nob3cpIHtcbiAgICAgICAgICAgIGlmIChuYW1lU3BhbiAmJiBuYW1lU3Bhbi5pbm5lckhUTUwgJiYgbmFtZVNwYW4uaW5uZXJIVE1MLmxlbmd0aCkgXG4gICAgICAgICAgICAgICAgbmFtZVNwYW4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJkaXNwbGF5OmlubGluZS1ibG9jaztcIik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAobmFtZVNwYW4pXG4gICAgICAgICAgICAgICAgbmFtZVNwYW4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJkaXNwbGF5Om5vbmU7XCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3dzIHRoZSBwcmVzZW5jZSBzdGF0dXMgbWVzc2FnZSBmb3IgdGhlIGdpdmVuIHZpZGVvLlxuICAgICAqL1xuICAgIG15LnNldFByZXNlbmNlU3RhdHVzID0gZnVuY3Rpb24gKHZpZGVvU3BhbklkLCBzdGF0dXNNc2cpIHtcblxuICAgICAgICBpZiAoISQoJyMnICsgdmlkZW9TcGFuSWQpLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gTm8gY29udGFpbmVyXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc3RhdHVzU3BhbiA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPnNwYW4uc3RhdHVzJyk7XG4gICAgICAgIGlmICghc3RhdHVzU3Bhbi5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vQWRkIHN0YXR1cyBzcGFuXG4gICAgICAgICAgICBzdGF0dXNTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgc3RhdHVzU3Bhbi5jbGFzc05hbWUgPSAnc3RhdHVzJztcbiAgICAgICAgICAgIHN0YXR1c1NwYW4uaWQgPSB2aWRlb1NwYW5JZCArICdfc3RhdHVzJztcbiAgICAgICAgICAgICQoJyMnICsgdmlkZW9TcGFuSWQpWzBdLmFwcGVuZENoaWxkKHN0YXR1c1NwYW4pO1xuXG4gICAgICAgICAgICBzdGF0dXNTcGFuID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+c3Bhbi5zdGF0dXMnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERpc3BsYXkgc3RhdHVzXG4gICAgICAgIGlmIChzdGF0dXNNc2cgJiYgc3RhdHVzTXNnLmxlbmd0aCkge1xuICAgICAgICAgICAgJCgnIycgKyB2aWRlb1NwYW5JZCArICdfc3RhdHVzJykudGV4dChzdGF0dXNNc2cpO1xuICAgICAgICAgICAgc3RhdHVzU3Bhbi5nZXQoMCkuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJkaXNwbGF5OmlubGluZS1ibG9jaztcIik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlXG4gICAgICAgICAgICBzdGF0dXNTcGFuLmdldCgwKS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImRpc3BsYXk6bm9uZTtcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2hvd3MgYSB2aXN1YWwgaW5kaWNhdG9yIGZvciB0aGUgZm9jdXMgb2YgdGhlIGNvbmZlcmVuY2UuXG4gICAgICogQ3VycmVudGx5IGlmIHdlJ3JlIG5vdCB0aGUgb3duZXIgb2YgdGhlIGNvbmZlcmVuY2Ugd2Ugb2J0YWluIHRoZSBmb2N1c1xuICAgICAqIGZyb20gdGhlIGNvbm5lY3Rpb24uamluZ2xlLnNlc3Npb25zLlxuICAgICAqL1xuICAgIG15LnNob3dGb2N1c0luZGljYXRvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoWE1QUEFjdGl2YXRvci5pc0ZvY3VzKCkpIHtcbiAgICAgICAgICAgIHZhciBpbmRpY2F0b3JTcGFuID0gJCgnI2xvY2FsVmlkZW9Db250YWluZXIgLmZvY3VzaW5kaWNhdG9yJyk7XG5cbiAgICAgICAgICAgIGlmIChpbmRpY2F0b3JTcGFuLmNoaWxkcmVuKCkubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNyZWF0ZUZvY3VzSW5kaWNhdG9yRWxlbWVudChpbmRpY2F0b3JTcGFuWzBdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgIHtcbiAgICAgICAgICAgIC8vIElmIHdlJ3JlIG9ubHkgYSBwYXJ0aWNpcGFudCB0aGUgZm9jdXMgd2lsbCBiZSB0aGUgb25seSBzZXNzaW9uIHdlIGhhdmUuXG4gICAgICAgICAgICB2YXIgZm9jdXNKSUQgPSBYTVBQQWN0aXZhdG9yLmdldEZvY3VzSklEKCk7XG4gICAgICAgICAgICBpZihmb2N1c0pJRCA9PSBudWxsKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIHZhciBmb2N1c0lkXG4gICAgICAgICAgICAgICAgPSAncGFydGljaXBhbnRfJyArIGZvY3VzSklEO1xuXG4gICAgICAgICAgICB2YXIgZm9jdXNDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChmb2N1c0lkKTtcbiAgICAgICAgICAgIGlmICghZm9jdXNDb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiTm8gZm9jdXMgY29udGFpbmVyIVwiKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaW5kaWNhdG9yU3BhbiA9ICQoJyMnICsgZm9jdXNJZCArICcgLmZvY3VzaW5kaWNhdG9yJyk7XG5cbiAgICAgICAgICAgIGlmICghaW5kaWNhdG9yU3BhbiB8fCBpbmRpY2F0b3JTcGFuLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGluZGljYXRvclNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICAgICAgaW5kaWNhdG9yU3Bhbi5jbGFzc05hbWUgPSAnZm9jdXNpbmRpY2F0b3InO1xuXG4gICAgICAgICAgICAgICAgZm9jdXNDb250YWluZXIuYXBwZW5kQ2hpbGQoaW5kaWNhdG9yU3Bhbik7XG5cbiAgICAgICAgICAgICAgICBjcmVhdGVGb2N1c0luZGljYXRvckVsZW1lbnQoaW5kaWNhdG9yU3Bhbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2hvd3MgdmlkZW8gbXV0ZWQgaW5kaWNhdG9yIG92ZXIgc21hbGwgdmlkZW9zLlxuICAgICAqL1xuICAgIG15LnNob3dWaWRlb0luZGljYXRvciA9IGZ1bmN0aW9uKHZpZGVvU3BhbklkLCBpc011dGVkKSB7XG4gICAgICAgIHZhciB2aWRlb011dGVkU3BhbiA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPnNwYW4udmlkZW9NdXRlZCcpO1xuXG4gICAgICAgIGlmIChpc011dGVkID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgICBpZiAodmlkZW9NdXRlZFNwYW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHZpZGVvTXV0ZWRTcGFuLnJlbW92ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGF1ZGlvTXV0ZWRTcGFuID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+c3Bhbi5hdWRpb011dGVkJyk7XG5cbiAgICAgICAgICAgIHZpZGVvTXV0ZWRTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgdmlkZW9NdXRlZFNwYW4uY2xhc3NOYW1lID0gJ3ZpZGVvTXV0ZWQnO1xuICAgICAgICAgICAgaWYgKGF1ZGlvTXV0ZWRTcGFuKSB7XG4gICAgICAgICAgICAgICAgdmlkZW9NdXRlZFNwYW4ucmlnaHQgPSAnMzBweCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkKVswXS5hcHBlbmRDaGlsZCh2aWRlb011dGVkU3Bhbik7XG5cbiAgICAgICAgICAgIHZhciBtdXRlZEluZGljYXRvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2knKTtcbiAgICAgICAgICAgIG11dGVkSW5kaWNhdG9yLmNsYXNzTmFtZSA9ICdpY29uLWNhbWVyYS1kaXNhYmxlZCc7XG4gICAgICAgICAgICBVdGlsLnNldFRvb2x0aXAobXV0ZWRJbmRpY2F0b3IsXG4gICAgICAgICAgICAgICAgICAgIFwiUGFydGljaXBhbnQgaGFzPGJyLz5zdG9wcGVkIHRoZSBjYW1lcmEuXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidG9wXCIpO1xuICAgICAgICAgICAgdmlkZW9NdXRlZFNwYW4uYXBwZW5kQ2hpbGQobXV0ZWRJbmRpY2F0b3IpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3dzIGF1ZGlvIG11dGVkIGluZGljYXRvciBvdmVyIHNtYWxsIHZpZGVvcy5cbiAgICAgKi9cbiAgICBteS5zaG93QXVkaW9JbmRpY2F0b3IgPSBmdW5jdGlvbih2aWRlb1NwYW5JZCwgaXNNdXRlZCkge1xuICAgICAgICB2YXIgYXVkaW9NdXRlZFNwYW4gPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5zcGFuLmF1ZGlvTXV0ZWQnKTtcblxuICAgICAgICBpZiAoaXNNdXRlZCA9PT0gJ2ZhbHNlJykge1xuICAgICAgICAgICAgaWYgKGF1ZGlvTXV0ZWRTcGFuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBhdWRpb011dGVkU3Bhbi5wb3BvdmVyKCdoaWRlJyk7XG4gICAgICAgICAgICAgICAgYXVkaW9NdXRlZFNwYW4ucmVtb3ZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgdmlkZW9NdXRlZFNwYW4gPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5zcGFuLnZpZGVvTXV0ZWQnKTtcblxuICAgICAgICAgICAgYXVkaW9NdXRlZFNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICBhdWRpb011dGVkU3Bhbi5jbGFzc05hbWUgPSAnYXVkaW9NdXRlZCc7XG4gICAgICAgICAgICBVdGlsLnNldFRvb2x0aXAoYXVkaW9NdXRlZFNwYW4sXG4gICAgICAgICAgICAgICAgICAgIFwiUGFydGljaXBhbnQgaXMgbXV0ZWRcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ0b3BcIik7XG5cbiAgICAgICAgICAgIGlmICh2aWRlb011dGVkU3Bhbikge1xuICAgICAgICAgICAgICAgIGF1ZGlvTXV0ZWRTcGFuLnJpZ2h0ID0gJzMwcHgnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJCgnIycgKyB2aWRlb1NwYW5JZClbMF0uYXBwZW5kQ2hpbGQoYXVkaW9NdXRlZFNwYW4pO1xuXG4gICAgICAgICAgICB2YXIgbXV0ZWRJbmRpY2F0b3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpJyk7XG4gICAgICAgICAgICBtdXRlZEluZGljYXRvci5jbGFzc05hbWUgPSAnaWNvbi1taWMtZGlzYWJsZWQnO1xuICAgICAgICAgICAgYXVkaW9NdXRlZFNwYW4uYXBwZW5kQ2hpbGQobXV0ZWRJbmRpY2F0b3IpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlc2l6ZXMgdGhlIGxhcmdlIHZpZGVvIGNvbnRhaW5lci5cbiAgICAgKi9cbiAgICBteS5yZXNpemVMYXJnZVZpZGVvQ29udGFpbmVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBkZXAuQ2hhdCgpLnJlc2l6ZUNoYXQoKTtcbiAgICAgICAgdmFyIGF2YWlsYWJsZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgdmFyIGF2YWlsYWJsZVdpZHRoID0gZGVwLlVJVXRpbCgpLmdldEF2YWlsYWJsZVZpZGVvV2lkdGgoKTtcbiAgICAgICAgaWYgKGF2YWlsYWJsZVdpZHRoIDwgMCB8fCBhdmFpbGFibGVIZWlnaHQgPCAwKSByZXR1cm47XG5cbiAgICAgICAgJCgnI3ZpZGVvc3BhY2UnKS53aWR0aChhdmFpbGFibGVXaWR0aCk7XG4gICAgICAgICQoJyN2aWRlb3NwYWNlJykuaGVpZ2h0KGF2YWlsYWJsZUhlaWdodCk7XG4gICAgICAgICQoJyNsYXJnZVZpZGVvQ29udGFpbmVyJykud2lkdGgoYXZhaWxhYmxlV2lkdGgpO1xuICAgICAgICAkKCcjbGFyZ2VWaWRlb0NvbnRhaW5lcicpLmhlaWdodChhdmFpbGFibGVIZWlnaHQpO1xuXG4gICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZVRodW1ibmFpbHMoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVzaXplcyB0aHVtYm5haWxzLlxuICAgICAqL1xuICAgIG15LnJlc2l6ZVRodW1ibmFpbHMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHZpZGVvU3BhY2VXaWR0aCA9ICQoJyNyZW1vdGVWaWRlb3MnKS53aWR0aCgpO1xuXG4gICAgICAgIHZhciB0aHVtYm5haWxTaXplID0gVmlkZW9MYXlvdXQuY2FsY3VsYXRlVGh1bWJuYWlsU2l6ZSh2aWRlb1NwYWNlV2lkdGgpO1xuICAgICAgICB2YXIgd2lkdGggPSB0aHVtYm5haWxTaXplWzBdO1xuICAgICAgICB2YXIgaGVpZ2h0ID0gdGh1bWJuYWlsU2l6ZVsxXTtcblxuICAgICAgICAvLyBzaXplIHZpZGVvcyBzbyB0aGF0IHdoaWxlIGtlZXBpbmcgQVIgYW5kIG1heCBoZWlnaHQsIHdlIGhhdmUgYVxuICAgICAgICAvLyBuaWNlIGZpdFxuICAgICAgICAkKCcjcmVtb3RlVmlkZW9zJykuaGVpZ2h0KGhlaWdodCk7XG4gICAgICAgICQoJyNyZW1vdGVWaWRlb3M+c3BhbicpLndpZHRoKHdpZHRoKTtcbiAgICAgICAgJCgnI3JlbW90ZVZpZGVvcz5zcGFuJykuaGVpZ2h0KGhlaWdodCk7XG5cbiAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcihcInJlbW90ZXZpZGVvLnJlc2l6ZWRcIiwgW3dpZHRoLCBoZWlnaHRdKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRW5hYmxlcyB0aGUgZG9taW5hbnQgc3BlYWtlciBVSS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSByZXNvdXJjZUppZCB0aGUgamlkIGluZGljYXRpbmcgdGhlIHZpZGVvIGVsZW1lbnQgdG9cbiAgICAgKiBhY3RpdmF0ZS9kZWFjdGl2YXRlXG4gICAgICogQHBhcmFtIGlzRW5hYmxlIGluZGljYXRlcyBpZiB0aGUgZG9taW5hbnQgc3BlYWtlciBzaG91bGQgYmUgZW5hYmxlZCBvclxuICAgICAqIGRpc2FibGVkXG4gICAgICovXG4gICAgbXkuZW5hYmxlRG9taW5hbnRTcGVha2VyID0gZnVuY3Rpb24ocmVzb3VyY2VKaWQsIGlzRW5hYmxlKSB7XG4gICAgICAgIHZhciBkaXNwbGF5TmFtZSA9IHJlc291cmNlSmlkO1xuICAgICAgICB2YXIgbmFtZVNwYW4gPSAkKCcjcGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkICsgJz5zcGFuLmRpc3BsYXluYW1lJyk7XG4gICAgICAgIGlmIChuYW1lU3Bhbi5sZW5ndGggPiAwKVxuICAgICAgICAgICAgZGlzcGxheU5hbWUgPSBuYW1lU3Bhbi50ZXh0KCk7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJVSSBlbmFibGUgZG9taW5hbnQgc3BlYWtlclwiLFxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5TmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VKaWQsXG4gICAgICAgICAgICAgICAgICAgIGlzRW5hYmxlKTtcblxuICAgICAgICB2YXIgdmlkZW9TcGFuSWQgPSBudWxsO1xuICAgICAgICB2YXIgdmlkZW9Db250YWluZXJJZCA9IG51bGw7XG4gICAgICAgIGlmIChyZXNvdXJjZUppZFxuICAgICAgICAgICAgICAgID09PSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChYTVBQQWN0aXZhdG9yLmdldE15SklEKCkpKSB7XG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdsb2NhbFZpZGVvV3JhcHBlcic7XG4gICAgICAgICAgICB2aWRlb0NvbnRhaW5lcklkID0gJ2xvY2FsVmlkZW9Db250YWluZXInO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAncGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkO1xuICAgICAgICAgICAgdmlkZW9Db250YWluZXJJZCA9IHZpZGVvU3BhbklkO1xuICAgICAgICB9XG5cbiAgICAgICAgdmlkZW9TcGFuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodmlkZW9Db250YWluZXJJZCk7XG5cbiAgICAgICAgaWYgKCF2aWRlb1NwYW4pIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJObyB2aWRlbyBlbGVtZW50IGZvciBqaWRcIiwgcmVzb3VyY2VKaWQpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHZpZGVvID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+dmlkZW8nKTtcblxuICAgICAgICBpZiAodmlkZW8gJiYgdmlkZW8ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKGlzRW5hYmxlKSB7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0Rpc3BsYXlOYW1lKHZpZGVvQ29udGFpbmVySWQsIHRydWUpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCF2aWRlb1NwYW4uY2xhc3NMaXN0LmNvbnRhaW5zKFwiZG9taW5hbnRzcGVha2VyXCIpKVxuICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYW4uY2xhc3NMaXN0LmFkZChcImRvbWluYW50c3BlYWtlclwiKTtcblxuICAgICAgICAgICAgICAgIHZpZGVvLmNzcyh7dmlzaWJpbGl0eTogJ2hpZGRlbid9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dEaXNwbGF5TmFtZSh2aWRlb0NvbnRhaW5lcklkLCBmYWxzZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAodmlkZW9TcGFuLmNsYXNzTGlzdC5jb250YWlucyhcImRvbWluYW50c3BlYWtlclwiKSlcbiAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFuLmNsYXNzTGlzdC5yZW1vdmUoXCJkb21pbmFudHNwZWFrZXJcIik7XG5cbiAgICAgICAgICAgICAgICB2aWRlby5jc3Moe3Zpc2liaWxpdHk6ICd2aXNpYmxlJ30pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIHNlbGVjdG9yIG9mIHZpZGVvIHRodW1ibmFpbCBjb250YWluZXIgZm9yIHRoZSB1c2VyIGlkZW50aWZpZWQgYnlcbiAgICAgKiBnaXZlbiA8dHQ+dXNlckppZDwvdHQ+XG4gICAgICogQHBhcmFtIHVzZXJKaWQgdXNlcidzIEppZCBmb3Igd2hvbSB3ZSB3YW50IHRvIGdldCB0aGUgdmlkZW8gY29udGFpbmVyLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFBhcnRpY2lwYW50Q29udGFpbmVyKHVzZXJKaWQpXG4gICAge1xuICAgICAgICBpZiAoIXVzZXJKaWQpXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgICBpZiAodXNlckppZCA9PT0gWE1QUEFjdGl2YXRvci5nZXRNeUpJRCgpKVxuICAgICAgICAgICAgcmV0dXJuICQoXCIjbG9jYWxWaWRlb0NvbnRhaW5lclwiKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuICQoXCIjcGFydGljaXBhbnRfXCIgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZCh1c2VySmlkKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgc2l6ZSBhbmQgcG9zaXRpb24gb2YgdGhlIGdpdmVuIHZpZGVvIGVsZW1lbnQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmlkZW8gdGhlIHZpZGVvIGVsZW1lbnQgdG8gcG9zaXRpb25cbiAgICAgKiBAcGFyYW0gd2lkdGggdGhlIGRlc2lyZWQgdmlkZW8gd2lkdGhcbiAgICAgKiBAcGFyYW0gaGVpZ2h0IHRoZSBkZXNpcmVkIHZpZGVvIGhlaWdodFxuICAgICAqIEBwYXJhbSBob3Jpem9udGFsSW5kZW50IHRoZSBsZWZ0IGFuZCByaWdodCBpbmRlbnRcbiAgICAgKiBAcGFyYW0gdmVydGljYWxJbmRlbnQgdGhlIHRvcCBhbmQgYm90dG9tIGluZGVudFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHBvc2l0aW9uVmlkZW8odmlkZW8sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvcml6b250YWxJbmRlbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJ0aWNhbEluZGVudCkge1xuICAgICAgICB2aWRlby53aWR0aCh3aWR0aCk7XG4gICAgICAgIHZpZGVvLmhlaWdodChoZWlnaHQpO1xuICAgICAgICB2aWRlby5jc3MoeyAgdG9wOiB2ZXJ0aWNhbEluZGVudCArICdweCcsXG4gICAgICAgICAgICAgICAgICAgICBib3R0b206IHZlcnRpY2FsSW5kZW50ICsgJ3B4JyxcbiAgICAgICAgICAgICAgICAgICAgIGxlZnQ6IGhvcml6b250YWxJbmRlbnQgKyAncHgnLFxuICAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IGhvcml6b250YWxJbmRlbnQgKyAncHgnfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgdGh1bWJuYWlsIHNpemUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmlkZW9TcGFjZVdpZHRoIHRoZSB3aWR0aCBvZiB0aGUgdmlkZW8gc3BhY2VcbiAgICAgKi9cbiAgICBteS5jYWxjdWxhdGVUaHVtYm5haWxTaXplID0gZnVuY3Rpb24gKHZpZGVvU3BhY2VXaWR0aCkge1xuICAgICAgICAvLyBDYWxjdWxhdGUgdGhlIGF2YWlsYWJsZSBoZWlnaHQsIHdoaWNoIGlzIHRoZSBpbm5lciB3aW5kb3cgaGVpZ2h0IG1pbnVzXG4gICAgICAgLy8gMzlweCBmb3IgdGhlIGhlYWRlciBtaW51cyAycHggZm9yIHRoZSBkZWxpbWl0ZXIgbGluZXMgb24gdGhlIHRvcCBhbmRcbiAgICAgICAvLyBib3R0b20gb2YgdGhlIGxhcmdlIHZpZGVvLCBtaW51cyB0aGUgMzZweCBzcGFjZSBpbnNpZGUgdGhlIHJlbW90ZVZpZGVvc1xuICAgICAgIC8vIGNvbnRhaW5lciB1c2VkIGZvciBoaWdobGlnaHRpbmcgc2hhZG93LlxuICAgICAgIHZhciBhdmFpbGFibGVIZWlnaHQgPSAxMDA7XG5cbiAgICAgICB2YXIgbnVtdmlkcyA9IDA7XG4gICAgICAgaWYgKGxhc3ROQ291bnQgJiYgbGFzdE5Db3VudCA+IDApXG4gICAgICAgICAgIG51bXZpZHMgPSBsYXN0TkNvdW50ICsgMTtcbiAgICAgICBlbHNlXG4gICAgICAgICAgIG51bXZpZHMgPSAkKCcjcmVtb3RlVmlkZW9zPnNwYW46dmlzaWJsZScpLmxlbmd0aDtcblxuICAgICAgIC8vIFJlbW92ZSB0aGUgM3B4IGJvcmRlcnMgYXJyb3VuZCB2aWRlb3MgYW5kIGJvcmRlciBhcm91bmQgdGhlIHJlbW90ZVxuICAgICAgIC8vIHZpZGVvcyBhcmVhXG4gICAgICAgdmFyIGF2YWlsYWJsZVdpbldpZHRoID0gdmlkZW9TcGFjZVdpZHRoIC0gMiAqIDMgKiBudW12aWRzIC0gNzA7XG5cbiAgICAgICB2YXIgYXZhaWxhYmxlV2lkdGggPSBhdmFpbGFibGVXaW5XaWR0aCAvIG51bXZpZHM7XG4gICAgICAgdmFyIGFzcGVjdFJhdGlvID0gMTYuMCAvIDkuMDtcbiAgICAgICB2YXIgbWF4SGVpZ2h0ID0gTWF0aC5taW4oMTYwLCBhdmFpbGFibGVIZWlnaHQpO1xuICAgICAgIGF2YWlsYWJsZUhlaWdodCA9IE1hdGgubWluKG1heEhlaWdodCwgYXZhaWxhYmxlV2lkdGggLyBhc3BlY3RSYXRpbyk7XG4gICAgICAgaWYgKGF2YWlsYWJsZUhlaWdodCA8IGF2YWlsYWJsZVdpZHRoIC8gYXNwZWN0UmF0aW8pIHtcbiAgICAgICAgICAgYXZhaWxhYmxlV2lkdGggPSBNYXRoLmZsb29yKGF2YWlsYWJsZUhlaWdodCAqIGFzcGVjdFJhdGlvKTtcbiAgICAgICB9XG5cbiAgICAgICByZXR1cm4gW2F2YWlsYWJsZVdpZHRoLCBhdmFpbGFibGVIZWlnaHRdO1xuICAgfTtcblxuICAgLyoqXG4gICAgKiBSZXR1cm5zIGFuIGFycmF5IG9mIHRoZSB2aWRlbyBkaW1lbnNpb25zLCBzbyB0aGF0IGl0IGtlZXBzIGl0J3MgYXNwZWN0XG4gICAgKiByYXRpbyBhbmQgZml0cyBhdmFpbGFibGUgYXJlYSB3aXRoIGl0J3MgbGFyZ2VyIGRpbWVuc2lvbi4gVGhpcyBtZXRob2RcbiAgICAqIGVuc3VyZXMgdGhhdCB3aG9sZSB2aWRlbyB3aWxsIGJlIHZpc2libGUgYW5kIGNhbiBsZWF2ZSBlbXB0eSBhcmVhcy5cbiAgICAqXG4gICAgKiBAcmV0dXJuIGFuIGFycmF5IHdpdGggMiBlbGVtZW50cywgdGhlIHZpZGVvIHdpZHRoIGFuZCB0aGUgdmlkZW8gaGVpZ2h0XG4gICAgKi9cbiAgIGZ1bmN0aW9uIGdldERlc2t0b3BWaWRlb1NpemUodmlkZW9XaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZUhlaWdodCkge1xuICAgICAgIGlmICghdmlkZW9XaWR0aClcbiAgICAgICAgICAgdmlkZW9XaWR0aCA9IFZpZGVvTGF5b3V0LmN1cnJlbnRWaWRlb1dpZHRoO1xuICAgICAgIGlmICghdmlkZW9IZWlnaHQpXG4gICAgICAgICAgIHZpZGVvSGVpZ2h0ID0gVmlkZW9MYXlvdXQuY3VycmVudFZpZGVvSGVpZ2h0O1xuXG4gICAgICAgdmFyIGFzcGVjdFJhdGlvID0gdmlkZW9XaWR0aCAvIHZpZGVvSGVpZ2h0O1xuXG4gICAgICAgdmFyIGF2YWlsYWJsZVdpZHRoID0gTWF0aC5tYXgodmlkZW9XaWR0aCwgdmlkZW9TcGFjZVdpZHRoKTtcbiAgICAgICB2YXIgYXZhaWxhYmxlSGVpZ2h0ID0gTWF0aC5tYXgodmlkZW9IZWlnaHQsIHZpZGVvU3BhY2VIZWlnaHQpO1xuXG4gICAgICAgdmlkZW9TcGFjZUhlaWdodCAtPSAkKCcjcmVtb3RlVmlkZW9zJykub3V0ZXJIZWlnaHQoKTtcblxuICAgICAgIGlmIChhdmFpbGFibGVXaWR0aCAvIGFzcGVjdFJhdGlvID49IHZpZGVvU3BhY2VIZWlnaHQpXG4gICAgICAge1xuICAgICAgICAgICBhdmFpbGFibGVIZWlnaHQgPSB2aWRlb1NwYWNlSGVpZ2h0O1xuICAgICAgICAgICBhdmFpbGFibGVXaWR0aCA9IGF2YWlsYWJsZUhlaWdodCAqIGFzcGVjdFJhdGlvO1xuICAgICAgIH1cblxuICAgICAgIGlmIChhdmFpbGFibGVIZWlnaHQgKiBhc3BlY3RSYXRpbyA+PSB2aWRlb1NwYWNlV2lkdGgpXG4gICAgICAge1xuICAgICAgICAgICBhdmFpbGFibGVXaWR0aCA9IHZpZGVvU3BhY2VXaWR0aDtcbiAgICAgICAgICAgYXZhaWxhYmxlSGVpZ2h0ID0gYXZhaWxhYmxlV2lkdGggLyBhc3BlY3RSYXRpbztcbiAgICAgICB9XG5cbiAgICAgICByZXR1cm4gW2F2YWlsYWJsZVdpZHRoLCBhdmFpbGFibGVIZWlnaHRdO1xuICAgfVxuXG5cbi8qKlxuICAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YgdGhlIHZpZGVvIGRpbWVuc2lvbnMsIHNvIHRoYXQgaXQgY292ZXJzIHRoZSBzY3JlZW4uXG4gICAgICogSXQgbGVhdmVzIG5vIGVtcHR5IGFyZWFzLCBidXQgc29tZSBwYXJ0cyBvZiB0aGUgdmlkZW8gbWlnaHQgbm90IGJlIHZpc2libGUuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIGFuIGFycmF5IHdpdGggMiBlbGVtZW50cywgdGhlIHZpZGVvIHdpZHRoIGFuZCB0aGUgdmlkZW8gaGVpZ2h0XG4gICAgICovXG4gICAgbXkuZ2V0Q2FtZXJhVmlkZW9TaXplID0gZnVuY3Rpb24odmlkZW9XaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZUhlaWdodCkge1xuICAgICAgICBpZiAoIXZpZGVvV2lkdGgpXG4gICAgICAgICAgICB2aWRlb1dpZHRoID0gVmlkZW9MYXlvdXQuY3VycmVudFZpZGVvV2lkdGg7XG4gICAgICAgIGlmICghdmlkZW9IZWlnaHQpXG4gICAgICAgICAgICB2aWRlb0hlaWdodCA9IFZpZGVvTGF5b3V0LmN1cnJlbnRWaWRlb0hlaWdodDtcblxuICAgICAgICB2YXIgYXNwZWN0UmF0aW8gPSB2aWRlb1dpZHRoIC8gdmlkZW9IZWlnaHQ7XG5cbiAgICAgICAgdmFyIGF2YWlsYWJsZVdpZHRoID0gTWF0aC5tYXgodmlkZW9XaWR0aCwgdmlkZW9TcGFjZVdpZHRoKTtcbiAgICAgICAgdmFyIGF2YWlsYWJsZUhlaWdodCA9IE1hdGgubWF4KHZpZGVvSGVpZ2h0LCB2aWRlb1NwYWNlSGVpZ2h0KTtcblxuICAgICAgICBpZiAoYXZhaWxhYmxlV2lkdGggLyBhc3BlY3RSYXRpbyA8IHZpZGVvU3BhY2VIZWlnaHQpIHtcbiAgICAgICAgICAgIGF2YWlsYWJsZUhlaWdodCA9IHZpZGVvU3BhY2VIZWlnaHQ7XG4gICAgICAgICAgICBhdmFpbGFibGVXaWR0aCA9IGF2YWlsYWJsZUhlaWdodCAqIGFzcGVjdFJhdGlvO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGF2YWlsYWJsZUhlaWdodCAqIGFzcGVjdFJhdGlvIDwgdmlkZW9TcGFjZVdpZHRoKSB7XG4gICAgICAgICAgICBhdmFpbGFibGVXaWR0aCA9IHZpZGVvU3BhY2VXaWR0aDtcbiAgICAgICAgICAgIGF2YWlsYWJsZUhlaWdodCA9IGF2YWlsYWJsZVdpZHRoIC8gYXNwZWN0UmF0aW87XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gW2F2YWlsYWJsZVdpZHRoLCBhdmFpbGFibGVIZWlnaHRdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YgdGhlIHZpZGVvIGhvcml6b250YWwgYW5kIHZlcnRpY2FsIGluZGVudHMsXG4gICAgICogc28gdGhhdCBpZiBmaXRzIGl0cyBwYXJlbnQuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIGFuIGFycmF5IHdpdGggMiBlbGVtZW50cywgdGhlIGhvcml6b250YWwgaW5kZW50IGFuZCB0aGUgdmVydGljYWxcbiAgICAgKiBpbmRlbnRcbiAgICAgKi9cbiAgICBteS5nZXRDYW1lcmFWaWRlb1Bvc2l0aW9uID0gZnVuY3Rpb24odmlkZW9XaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZUhlaWdodCkge1xuICAgICAgICAvLyBQYXJlbnQgaGVpZ2h0IGlzbid0IGNvbXBsZXRlbHkgY2FsY3VsYXRlZCB3aGVuIHdlIHBvc2l0aW9uIHRoZSB2aWRlbyBpblxuICAgICAgICAvLyBmdWxsIHNjcmVlbiBtb2RlIGFuZCB0aGlzIGlzIHdoeSB3ZSB1c2UgdGhlIHNjcmVlbiBoZWlnaHQgaW4gdGhpcyBjYXNlLlxuICAgICAgICAvLyBOZWVkIHRvIHRoaW5rIGl0IGZ1cnRoZXIgYXQgc29tZSBwb2ludCBhbmQgaW1wbGVtZW50IGl0IHByb3Blcmx5LlxuICAgICAgICB2YXIgaXNGdWxsU2NyZWVuID0gVmlkZW9MYXlvdXQuaXNGdWxsU2NyZWVuKCk7XG4gICAgICAgIGlmIChpc0Z1bGxTY3JlZW4pXG4gICAgICAgICAgICB2aWRlb1NwYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuXG4gICAgICAgIHZhciBob3Jpem9udGFsSW5kZW50ID0gKHZpZGVvU3BhY2VXaWR0aCAtIHZpZGVvV2lkdGgpIC8gMjtcbiAgICAgICAgdmFyIHZlcnRpY2FsSW5kZW50ID0gKHZpZGVvU3BhY2VIZWlnaHQgLSB2aWRlb0hlaWdodCkgLyAyO1xuXG4gICAgICAgIHJldHVybiBbaG9yaXpvbnRhbEluZGVudCwgdmVydGljYWxJbmRlbnRdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1ldGhvZCB1c2VkIHRvIGdldCBsYXJnZSB2aWRlbyBwb3NpdGlvbi5cbiAgICAgKiBAdHlwZSB7ZnVuY3Rpb24gKCl9XG4gICAgICovXG4gICAgdmFyIGdldFZpZGVvUG9zaXRpb24gPSBteS5nZXRDYW1lcmFWaWRlb1Bvc2l0aW9uO1xuXG4gICAgLyoqXG4gICAgICogTWV0aG9kIHVzZWQgdG8gY2FsY3VsYXRlIGxhcmdlIHZpZGVvIHNpemUuXG4gICAgICogQHR5cGUge2Z1bmN0aW9uICgpfVxuICAgICAqL1xuICAgIHZhciBnZXRWaWRlb1NpemUgPSBteS5nZXRDYW1lcmFWaWRlb1NpemU7XG5cbiAgICBteS5pc0Z1bGxTY3JlZW4gPSBmdW5jdGlvbigpXG4gICAge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQuZnVsbFNjcmVlbiB8fFxuICAgICAgICAgICAgZG9jdW1lbnQubW96RnVsbFNjcmVlbiB8fFxuICAgICAgICAgICAgZG9jdW1lbnQud2Via2l0SXNGdWxsU2NyZWVuO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgdGhlIGVkaXQgZGlzcGxheSBuYW1lIGJ1dHRvbi5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHRoZSBlZGl0IGJ1dHRvblxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZUVkaXREaXNwbGF5TmFtZUJ1dHRvbigpIHtcbiAgICAgICAgdmFyIGVkaXRCdXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgIGVkaXRCdXR0b24uY2xhc3NOYW1lID0gJ2Rpc3BsYXluYW1lJztcbiAgICAgICAgVXRpbC5zZXRUb29sdGlwKGVkaXRCdXR0b24sXG4gICAgICAgICAgICAgICAgICAgICAgICAnQ2xpY2sgdG8gZWRpdCB5b3VyPGJyLz5kaXNwbGF5IG5hbWUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0b3BcIik7XG4gICAgICAgIGVkaXRCdXR0b24uaW5uZXJIVE1MID0gJzxpIGNsYXNzPVwiZmEgZmEtcGVuY2lsXCI+PC9pPic7XG5cbiAgICAgICAgcmV0dXJuIGVkaXRCdXR0b247XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyB0aGUgZWxlbWVudCBpbmRpY2F0aW5nIHRoZSBmb2N1cyBvZiB0aGUgY29uZmVyZW5jZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYXJlbnRFbGVtZW50IHRoZSBwYXJlbnQgZWxlbWVudCB3aGVyZSB0aGUgZm9jdXMgaW5kaWNhdG9yIHdpbGxcbiAgICAgKiBiZSBhZGRlZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZUZvY3VzSW5kaWNhdG9yRWxlbWVudChwYXJlbnRFbGVtZW50KSB7XG4gICAgICAgIHZhciBmb2N1c0luZGljYXRvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2knKTtcbiAgICAgICAgZm9jdXNJbmRpY2F0b3IuY2xhc3NOYW1lID0gJ2ZhIGZhLXN0YXInO1xuICAgICAgICBwYXJlbnRFbGVtZW50LmFwcGVuZENoaWxkKGZvY3VzSW5kaWNhdG9yKTtcblxuICAgICAgICBVdGlsLnNldFRvb2x0aXAocGFyZW50RWxlbWVudCxcbiAgICAgICAgICAgICAgICBcIlRoZSBvd25lciBvZjxici8+dGhpcyBjb25mZXJlbmNlXCIsXG4gICAgICAgICAgICAgICAgXCJ0b3BcIik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgcmVtb3RlIHZpZGVvIG1lbnUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gamlkIHRoZSBqaWQgaW5kaWNhdGluZyB0aGUgdmlkZW8gZm9yIHdoaWNoIHdlJ3JlIGFkZGluZyBhIG1lbnUuXG4gICAgICogQHBhcmFtIGlzTXV0ZWQgaW5kaWNhdGVzIHRoZSBjdXJyZW50IG11dGUgc3RhdGVcbiAgICAgKi9cbiAgICBteS51cGRhdGVSZW1vdGVWaWRlb01lbnUgPSBmdW5jdGlvbihqaWQsIGlzTXV0ZWQpIHtcbiAgICAgICAgdmFyIG11dGVNZW51SXRlbVxuICAgICAgICAgICAgPSAkKCcjcmVtb3RlX3BvcHVwbWVudV8nXG4gICAgICAgICAgICAgICAgICAgICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKVxuICAgICAgICAgICAgICAgICAgICArICc+bGk+YS5tdXRlbGluaycpO1xuXG4gICAgICAgIHZhciBtdXRlZEluZGljYXRvciA9IFwiPGkgY2xhc3M9J2ljb24tbWljLWRpc2FibGVkJz48L2k+XCI7XG5cbiAgICAgICAgaWYgKG11dGVNZW51SXRlbS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHZhciBtdXRlTGluayA9IG11dGVNZW51SXRlbS5nZXQoMCk7XG5cbiAgICAgICAgICAgIGlmIChpc011dGVkID09PSAndHJ1ZScpIHtcbiAgICAgICAgICAgICAgICBtdXRlTGluay5pbm5lckhUTUwgPSBtdXRlZEluZGljYXRvciArICcgTXV0ZWQnO1xuICAgICAgICAgICAgICAgIG11dGVMaW5rLmNsYXNzTmFtZSA9ICdtdXRlbGluayBkaXNhYmxlZCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBtdXRlTGluay5pbm5lckhUTUwgPSBtdXRlZEluZGljYXRvciArICcgTXV0ZSc7XG4gICAgICAgICAgICAgICAgbXV0ZUxpbmsuY2xhc3NOYW1lID0gJ211dGVsaW5rJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBjdXJyZW50IGRvbWluYW50IHNwZWFrZXIgcmVzb3VyY2UgamlkLlxuICAgICAqL1xuICAgIG15LmdldERvbWluYW50U3BlYWtlclJlc291cmNlSmlkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gY3VycmVudERvbWluYW50U3BlYWtlcjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgY29ycmVzcG9uZGluZyByZXNvdXJjZSBqaWQgdG8gdGhlIGdpdmVuIHBlZXIgY29udGFpbmVyXG4gICAgICogRE9NIGVsZW1lbnQuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHRoZSBjb3JyZXNwb25kaW5nIHJlc291cmNlIGppZCB0byB0aGUgZ2l2ZW4gcGVlciBjb250YWluZXJcbiAgICAgKiBET00gZWxlbWVudFxuICAgICAqL1xuICAgIG15LmdldFBlZXJDb250YWluZXJSZXNvdXJjZUppZCA9IGZ1bmN0aW9uIChjb250YWluZXJFbGVtZW50KSB7XG4gICAgICAgIHZhciBpID0gY29udGFpbmVyRWxlbWVudC5pZC5pbmRleE9mKCdwYXJ0aWNpcGFudF8nKTtcblxuICAgICAgICBpZiAoaSA+PSAwKVxuICAgICAgICAgICAgcmV0dXJuIGNvbnRhaW5lckVsZW1lbnQuaWQuc3Vic3RyaW5nKGkgKyAxMik7IFxuICAgIH07XG5cbiAgICBteS5vblJlbW90ZVN0cmVhbUFkZGVkID0gZnVuY3Rpb24gKHN0cmVhbSkge1xuICAgICAgICB2YXIgY29udGFpbmVyO1xuICAgICAgICB2YXIgcmVtb3RlcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZW1vdGVWaWRlb3MnKTtcblxuICAgICAgICBpZiAoc3RyZWFtLnBlZXJqaWQpIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmVuc3VyZVBlZXJDb250YWluZXJFeGlzdHMoc3RyZWFtLnBlZXJqaWQpO1xuXG4gICAgICAgICAgICBjb250YWluZXIgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXG4gICAgICAgICAgICAgICAgICAgICdwYXJ0aWNpcGFudF8nICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoc3RyZWFtLnBlZXJqaWQpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChzdHJlYW0uc3RyZWFtLmlkICE9PSAnbWl4ZWRtc2xhYmVsJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoICAnY2FuIG5vdCBhc3NvY2lhdGUgc3RyZWFtJyxcbiAgICAgICAgICAgICAgICAgICAgc3RyZWFtLnN0cmVhbS5pZCxcbiAgICAgICAgICAgICAgICAgICAgJ3dpdGggYSBwYXJ0aWNpcGFudCcpO1xuICAgICAgICAgICAgICAgIC8vIFdlIGRvbid0IHdhbnQgdG8gYWRkIGl0IGhlcmUgc2luY2UgaXQgd2lsbCBjYXVzZSB0cm91Ymxlc1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZJWE1FOiBmb3IgdGhlIG1peGVkIG1zIHdlIGRvbnQgbmVlZCBhIHZpZGVvIC0tIGN1cnJlbnRseVxuICAgICAgICAgICAgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgY29udGFpbmVyLmlkID0gJ21peGVkc3RyZWFtJztcbiAgICAgICAgICAgIGNvbnRhaW5lci5jbGFzc05hbWUgPSAndmlkZW9jb250YWluZXInO1xuICAgICAgICAgICAgcmVtb3Rlcy5hcHBlbmRDaGlsZChjb250YWluZXIpO1xuICAgICAgICAgICAgVXRpbC5wbGF5U291bmROb3RpZmljYXRpb24oJ3VzZXJKb2luZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb250YWluZXIpIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmFkZFJlbW90ZVN0cmVhbUVsZW1lbnQoIGNvbnRhaW5lcixcbiAgICAgICAgICAgICAgICBzdHJlYW0uc2lkLFxuICAgICAgICAgICAgICAgIHN0cmVhbS5zdHJlYW0sXG4gICAgICAgICAgICAgICAgc3RyZWFtLnBlZXJqaWQsXG4gICAgICAgICAgICAgICAgc3RyZWFtLnNzcmMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWRkcyB0aGUgcmVtb3RlIHZpZGVvIG1lbnUgZWxlbWVudCBmb3IgdGhlIGdpdmVuIDx0dD5qaWQ8L3R0PiBpbiB0aGVcbiAgICAgKiBnaXZlbiA8dHQ+cGFyZW50RWxlbWVudDwvdHQ+LlxuICAgICAqXG4gICAgICogQHBhcmFtIGppZCB0aGUgamlkIGluZGljYXRpbmcgdGhlIHZpZGVvIGZvciB3aGljaCB3ZSdyZSBhZGRpbmcgYSBtZW51LlxuICAgICAqIEBwYXJhbSBwYXJlbnRFbGVtZW50IHRoZSBwYXJlbnQgZWxlbWVudCB3aGVyZSB0aGlzIG1lbnUgd2lsbCBiZSBhZGRlZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGFkZFJlbW90ZVZpZGVvTWVudShqaWQsIHBhcmVudEVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHNwYW5FbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICBzcGFuRWxlbWVudC5jbGFzc05hbWUgPSAncmVtb3RldmlkZW9tZW51JztcblxuICAgICAgICBwYXJlbnRFbGVtZW50LmFwcGVuZENoaWxkKHNwYW5FbGVtZW50KTtcblxuICAgICAgICB2YXIgbWVudUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpJyk7XG4gICAgICAgIG1lbnVFbGVtZW50LmNsYXNzTmFtZSA9ICdmYSBmYS1hbmdsZS1kb3duJztcbiAgICAgICAgbWVudUVsZW1lbnQudGl0bGUgPSAnUmVtb3RlIHVzZXIgY29udHJvbHMnO1xuICAgICAgICBzcGFuRWxlbWVudC5hcHBlbmRDaGlsZChtZW51RWxlbWVudCk7XG5cbi8vICAgICAgICA8dWwgY2xhc3M9XCJwb3B1cG1lbnVcIj5cbi8vICAgICAgICA8bGk+PGEgaHJlZj1cIiNcIj5NdXRlPC9hPjwvbGk+XG4vLyAgICAgICAgPGxpPjxhIGhyZWY9XCIjXCI+RWplY3Q8L2E+PC9saT5cbi8vICAgICAgICA8L3VsPlxuICAgICAgICB2YXIgcG9wdXBtZW51RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3VsJyk7XG4gICAgICAgIHBvcHVwbWVudUVsZW1lbnQuY2xhc3NOYW1lID0gJ3BvcHVwbWVudSc7XG4gICAgICAgIHBvcHVwbWVudUVsZW1lbnQuaWRcbiAgICAgICAgICAgID0gJ3JlbW90ZV9wb3B1cG1lbnVfJyArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGppZCk7XG4gICAgICAgIHNwYW5FbGVtZW50LmFwcGVuZENoaWxkKHBvcHVwbWVudUVsZW1lbnQpO1xuXG4gICAgICAgIHZhciBtdXRlTWVudUl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuICAgICAgICB2YXIgbXV0ZUxpbmtJdGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuXG4gICAgICAgIHZhciBtdXRlZEluZGljYXRvciA9IFwiPGkgY2xhc3M9J2ljb24tbWljLWRpc2FibGVkJz48L2k+XCI7XG5cbiAgICAgICAgaWYgKCFtdXRlZEF1ZGlvc1tqaWRdKSB7XG4gICAgICAgICAgICBtdXRlTGlua0l0ZW0uaW5uZXJIVE1MID0gbXV0ZWRJbmRpY2F0b3IgKyAnTXV0ZSc7XG4gICAgICAgICAgICBtdXRlTGlua0l0ZW0uY2xhc3NOYW1lID0gJ211dGVsaW5rJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG11dGVMaW5rSXRlbS5pbm5lckhUTUwgPSBtdXRlZEluZGljYXRvciArICcgTXV0ZWQnO1xuICAgICAgICAgICAgbXV0ZUxpbmtJdGVtLmNsYXNzTmFtZSA9ICdtdXRlbGluayBkaXNhYmxlZCc7XG4gICAgICAgIH1cblxuICAgICAgICBtdXRlTGlua0l0ZW0ub25jbGljayA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKS5hdHRyKCdkaXNhYmxlZCcpICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaXNNdXRlID0gIW11dGVkQXVkaW9zW2ppZF07XG4gICAgICAgICAgICBYTVBQQWN0aXZhdG9yLnNldE11dGUoamlkLCBpc011dGUpO1xuICAgICAgICAgICAgcG9wdXBtZW51RWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ2Rpc3BsYXk6bm9uZTsnKTtcblxuICAgICAgICAgICAgaWYgKGlzTXV0ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5uZXJIVE1MID0gbXV0ZWRJbmRpY2F0b3IgKyAnIE11dGVkJztcbiAgICAgICAgICAgICAgICB0aGlzLmNsYXNzTmFtZSA9ICdtdXRlbGluayBkaXNhYmxlZCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlubmVySFRNTCA9IG11dGVkSW5kaWNhdG9yICsgJyBNdXRlJztcbiAgICAgICAgICAgICAgICB0aGlzLmNsYXNzTmFtZSA9ICdtdXRlbGluayc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgbXV0ZU1lbnVJdGVtLmFwcGVuZENoaWxkKG11dGVMaW5rSXRlbSk7XG4gICAgICAgIHBvcHVwbWVudUVsZW1lbnQuYXBwZW5kQ2hpbGQobXV0ZU1lbnVJdGVtKTtcblxuICAgICAgICB2YXIgZWplY3RJbmRpY2F0b3IgPSBcIjxpIGNsYXNzPSdmYSBmYS1lamVjdCc+PC9pPlwiO1xuXG4gICAgICAgIHZhciBlamVjdE1lbnVJdGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcbiAgICAgICAgdmFyIGVqZWN0TGlua0l0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgIGVqZWN0TGlua0l0ZW0uaW5uZXJIVE1MID0gZWplY3RJbmRpY2F0b3IgKyAnIEtpY2sgb3V0JztcbiAgICAgICAgZWplY3RMaW5rSXRlbS5vbmNsaWNrID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIFhNUFBBY3RpdmF0b3IuZWplY3QoamlkKTtcbiAgICAgICAgICAgIHBvcHVwbWVudUVsZW1lbnQuc2V0QXR0cmlidXRlKCdzdHlsZScsICdkaXNwbGF5Om5vbmU7Jyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgZWplY3RNZW51SXRlbS5hcHBlbmRDaGlsZChlamVjdExpbmtJdGVtKTtcbiAgICAgICAgcG9wdXBtZW51RWxlbWVudC5hcHBlbmRDaGlsZChlamVjdE1lbnVJdGVtKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBPbiBhdWRpbyBtdXRlZCBldmVudC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdhdWRpb211dGVkLm11YycsIGZ1bmN0aW9uIChldmVudCwgamlkLCBpc011dGVkKSB7XG4gICAgICAgIHZhciB2aWRlb1NwYW5JZCA9IG51bGw7XG4gICAgICAgIGlmIChqaWQgPT09IFhNUFBBY3RpdmF0b3IuZ2V0TXlKSUQoKSkge1xuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAnbG9jYWxWaWRlb0NvbnRhaW5lcic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5lbnN1cmVQZWVyQ29udGFpbmVyRXhpc3RzKGppZCk7XG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdwYXJ0aWNpcGFudF8nICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChYTVBQQWN0aXZhdG9yLmlzRm9jdXMoKSkge1xuICAgICAgICAgICAgbXV0ZWRBdWRpb3NbamlkXSA9IGlzTXV0ZWQ7XG4gICAgICAgICAgICBWaWRlb0xheW91dC51cGRhdGVSZW1vdGVWaWRlb01lbnUoamlkLCBpc011dGVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2aWRlb1NwYW5JZClcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dBdWRpb0luZGljYXRvcih2aWRlb1NwYW5JZCwgaXNNdXRlZCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBPbiB2aWRlbyBtdXRlZCBldmVudC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCd2aWRlb211dGVkLm11YycsIGZ1bmN0aW9uIChldmVudCwgamlkLCBpc011dGVkKSB7XG4gICAgICAgIHZhciB2aWRlb1NwYW5JZCA9IG51bGw7XG4gICAgICAgIGlmIChqaWQgPT09IFhNUFBBY3RpdmF0b3IuZ2V0TXlKSUQoKSkge1xuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAnbG9jYWxWaWRlb0NvbnRhaW5lcic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5lbnN1cmVQZWVyQ29udGFpbmVyRXhpc3RzKGppZCk7XG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdwYXJ0aWNpcGFudF8nICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2aWRlb1NwYW5JZClcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dWaWRlb0luZGljYXRvcih2aWRlb1NwYW5JZCwgaXNNdXRlZCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBEaXNwbGF5IG5hbWUgY2hhbmdlZC5cbiAgICAgKi9cbiAgICBteS5vbkRpc3BsYXlOYW1lQ2hhbmdlZCA9XG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChqaWQsIGRpc3BsYXlOYW1lLCBzdGF0dXMpIHtcbiAgICAgICAgaWYgKGppZCA9PT0gJ2xvY2FsVmlkZW9Db250YWluZXInXG4gICAgICAgICAgICB8fCBqaWQgPT09IFhNUFBBY3RpdmF0b3IuZ2V0TXlKSUQoKSkge1xuICAgICAgICAgICAgc2V0RGlzcGxheU5hbWUoJ2xvY2FsVmlkZW9Db250YWluZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGxheU5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuZW5zdXJlUGVlckNvbnRhaW5lckV4aXN0cyhqaWQpO1xuXG4gICAgICAgICAgICBzZXREaXNwbGF5TmFtZShcbiAgICAgICAgICAgICAgICAncGFydGljaXBhbnRfJyArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGppZCksXG4gICAgICAgICAgICAgICAgZGlzcGxheU5hbWUsXG4gICAgICAgICAgICAgICAgc3RhdHVzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBPbiBkb21pbmFudCBzcGVha2VyIGNoYW5nZWQgZXZlbnQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgnZG9taW5hbnRzcGVha2VyY2hhbmdlZCcsIGZ1bmN0aW9uIChldmVudCwgcmVzb3VyY2VKaWQpIHtcbiAgICAgICAgLy8gV2UgaWdub3JlIGxvY2FsIHVzZXIgZXZlbnRzLlxuICAgICAgICBpZiAocmVzb3VyY2VKaWRcbiAgICAgICAgICAgICAgICA9PT0gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoWE1QUEFjdGl2YXRvci5nZXRNeUpJRCgpKSlcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAvLyBVcGRhdGUgdGhlIGN1cnJlbnQgZG9taW5hbnQgc3BlYWtlci5cbiAgICAgICAgaWYgKHJlc291cmNlSmlkICE9PSBjdXJyZW50RG9taW5hbnRTcGVha2VyKSB7XG4gICAgICAgICAgICB2YXIgb2xkU3BlYWtlclZpZGVvU3BhbklkID0gXCJwYXJ0aWNpcGFudF9cIiArIGN1cnJlbnREb21pbmFudFNwZWFrZXIsXG4gICAgICAgICAgICAgICAgbmV3U3BlYWtlclZpZGVvU3BhbklkID0gXCJwYXJ0aWNpcGFudF9cIiArIHJlc291cmNlSmlkO1xuICAgICAgICAgICAgaWYoJChcIiNcIiArIG9sZFNwZWFrZXJWaWRlb1NwYW5JZCArIFwiPnNwYW4uZGlzcGxheW5hbWVcIikudGV4dCgpID09PVxuICAgICAgICAgICAgICAgIGludGVyZmFjZUNvbmZpZy5ERUZBVUxUX0RPTUlOQU5UX1NQRUFLRVJfRElTUExBWV9OQU1FKSB7XG4gICAgICAgICAgICAgICAgc2V0RGlzcGxheU5hbWUob2xkU3BlYWtlclZpZGVvU3BhbklkLCBudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKCQoXCIjXCIgKyBuZXdTcGVha2VyVmlkZW9TcGFuSWQgKyBcIj5zcGFuLmRpc3BsYXluYW1lXCIpLnRleHQoKSA9PT1cbiAgICAgICAgICAgICAgICBpbnRlcmZhY2VDb25maWcuREVGQVVMVF9SRU1PVEVfRElTUExBWV9OQU1FKSB7XG4gICAgICAgICAgICAgICAgc2V0RGlzcGxheU5hbWUobmV3U3BlYWtlclZpZGVvU3BhbklkLFxuICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2VDb25maWcuREVGQVVMVF9ET01JTkFOVF9TUEVBS0VSX0RJU1BMQVlfTkFNRSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdXJyZW50RG9taW5hbnRTcGVha2VyID0gcmVzb3VyY2VKaWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBPYnRhaW4gY29udGFpbmVyIGZvciBuZXcgZG9taW5hbnQgc3BlYWtlci5cbiAgICAgICAgdmFyIGNvbnRhaW5lciAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcbiAgICAgICAgICAgICAgICAncGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkKTtcblxuICAgICAgICAvLyBMb2NhbCB2aWRlbyB3aWxsIG5vdCBoYXZlIGNvbnRhaW5lciBmb3VuZCwgYnV0IHRoYXQncyBva1xuICAgICAgICAvLyBzaW5jZSB3ZSBkb24ndCB3YW50IHRvIHN3aXRjaCB0byBsb2NhbCB2aWRlby5cbiAgICAgICAgaWYgKGNvbnRhaW5lciAmJiAhVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgdmlkZW8gPSBjb250YWluZXIuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJ2aWRlb1wiKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBsYXJnZSB2aWRlbyBpZiB0aGUgdmlkZW8gc291cmNlIGlzIGFscmVhZHkgYXZhaWxhYmxlLFxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIHdhaXQgZm9yIHRoZSBcInZpZGVvYWN0aXZlLmppbmdsZVwiIGV2ZW50LlxuICAgICAgICAgICAgaWYgKHZpZGVvLmxlbmd0aCAmJiB2aWRlb1swXS5jdXJyZW50VGltZSA+IDApXG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQudXBkYXRlTGFyZ2VWaWRlbyh2aWRlb1swXS5zcmMpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBPbiBsYXN0IE4gY2hhbmdlIGV2ZW50LlxuICAgICAqXG4gICAgICogQHBhcmFtIGV2ZW50IHRoZSBldmVudCB0aGF0IG5vdGlmaWVkIHVzXG4gICAgICogQHBhcmFtIGxhc3RORW5kcG9pbnRzIHRoZSBsaXN0IG9mIGxhc3QgTiBlbmRwb2ludHNcbiAgICAgKiBAcGFyYW0gZW5kcG9pbnRzRW50ZXJpbmdMYXN0TiB0aGUgbGlzdCBjdXJyZW50bHkgZW50ZXJpbmcgbGFzdCBOXG4gICAgICogZW5kcG9pbnRzXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgnbGFzdG5jaGFuZ2VkJywgZnVuY3Rpb24gKCBldmVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RORW5kcG9pbnRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kcG9pbnRzRW50ZXJpbmdMYXN0TixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cmVhbSkge1xuICAgICAgICBpZiAobGFzdE5Db3VudCAhPT0gbGFzdE5FbmRwb2ludHMubGVuZ3RoKVxuICAgICAgICAgICAgbGFzdE5Db3VudCA9IGxhc3RORW5kcG9pbnRzLmxlbmd0aDtcblxuICAgICAgICBsYXN0TkVuZHBvaW50c0NhY2hlID0gbGFzdE5FbmRwb2ludHM7XG5cbiAgICAgICAgJCgnI3JlbW90ZVZpZGVvcz5zcGFuJykuZWFjaChmdW5jdGlvbiggaW5kZXgsIGVsZW1lbnQgKSB7XG4gICAgICAgICAgICB2YXIgcmVzb3VyY2VKaWQgPSBWaWRlb0xheW91dC5nZXRQZWVyQ29udGFpbmVyUmVzb3VyY2VKaWQoZWxlbWVudCk7XG5cbiAgICAgICAgICAgIGlmIChyZXNvdXJjZUppZFxuICAgICAgICAgICAgICAgICYmIGxhc3RORW5kcG9pbnRzLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICAgICAmJiBsYXN0TkVuZHBvaW50cy5pbmRleE9mKHJlc291cmNlSmlkKSA8IDApIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlbW92ZSBmcm9tIGxhc3QgTlwiLCByZXNvdXJjZUppZCk7XG4gICAgICAgICAgICAgICAgc2hvd1BlZXJDb250YWluZXIocmVzb3VyY2VKaWQsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCFlbmRwb2ludHNFbnRlcmluZ0xhc3ROIHx8IGVuZHBvaW50c0VudGVyaW5nTGFzdE4ubGVuZ3RoIDwgMClcbiAgICAgICAgICAgIGVuZHBvaW50c0VudGVyaW5nTGFzdE4gPSBsYXN0TkVuZHBvaW50cztcblxuICAgICAgICBpZiAoZW5kcG9pbnRzRW50ZXJpbmdMYXN0TiAmJiBlbmRwb2ludHNFbnRlcmluZ0xhc3ROLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGVuZHBvaW50c0VudGVyaW5nTGFzdE4uZm9yRWFjaChmdW5jdGlvbiAocmVzb3VyY2VKaWQpIHtcblxuICAgICAgICAgICAgICAgIGlmICghJCgnI3BhcnRpY2lwYW50XycgKyByZXNvdXJjZUppZCkuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJBZGQgdG8gbGFzdCBOXCIsIHJlc291cmNlSmlkKTtcbiAgICAgICAgICAgICAgICAgICAgc2hvd1BlZXJDb250YWluZXIocmVzb3VyY2VKaWQsIHRydWUpO1xuXG4gICAgICAgICAgICAgICAgICAgIGRlcC5VSUFjdGl2YXRvcigpLmdldFJUQ1NlcnZpY2UoKS5yZW1vdGVTdHJlYW1zLnNvbWUoZnVuY3Rpb24gKG1lZGlhU3RyZWFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVkaWFTdHJlYW0ucGVlcmppZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICYmIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKG1lZGlhU3RyZWFtLnBlZXJqaWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID09PSByZXNvdXJjZUppZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICYmIG1lZGlhU3RyZWFtLnR5cGUgPT09IG1lZGlhU3RyZWFtLlZJREVPX1RZUEUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2VsID0gJCgnI3BhcnRpY2lwYW50XycgKyByZXNvdXJjZUppZCArICc+dmlkZW8nKTtcblxuLy88PDw8PDw8IEhFQUQ6VUkvdmlkZW9sYXlvdXQuanNcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dGFjaE1lZGlhU3RyZWFtKHNlbCwgbWVkaWFTdHJlYW0uc3RyZWFtKTtcbi8vPT09PT09PVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzaW11bGNhc3QgPSBuZXcgU2ltdWxjYXN0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZpZGVvU3RyZWFtID0gc2ltdWxjYXN0LmdldFJlY2VpdmluZ1ZpZGVvU3RyZWFtKG1lZGlhU3RyZWFtLnN0cmVhbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0YWNoTWVkaWFTdHJlYW0oc2VsLCB2aWRlb1N0cmVhbSk7XG4vLz4+Pj4+Pj4gbWFzdGVyOnZpZGVvbGF5b3V0LmpzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2FpdEZvclJlbW90ZVZpZGVvKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVkaWFTdHJlYW0uc3NyYyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lZGlhU3RyZWFtLnN0cmVhbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiB3YWl0Rm9yUmVtb3RlVmlkZW8oc2VsZWN0b3IsIHNzcmMsIHN0cmVhbSkge1xuICAgICAgICBpZiAoc2VsZWN0b3IucmVtb3ZlZCB8fCAhc2VsZWN0b3IucGFyZW50KCkuaXMoXCI6dmlzaWJsZVwiKSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKFwiTWVkaWEgcmVtb3ZlZCBiZWZvcmUgaGFkIHN0YXJ0ZWRcIiwgc2VsZWN0b3IpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN0cmVhbS5pZCA9PT0gJ21peGVkbXNsYWJlbCcpIHJldHVybjtcblxuICAgICAgICBpZiAoc2VsZWN0b3JbMF0uY3VycmVudFRpbWUgPiAwKSB7XG4gICAgICAgICAgICB2YXIgc2ltdWxjYXN0ID0gbmV3IFNpbXVsY2FzdCgpO1xuICAgICAgICAgICAgdmFyIHZpZGVvU3RyZWFtID0gc2ltdWxjYXN0LmdldFJlY2VpdmluZ1ZpZGVvU3RyZWFtKHN0cmVhbSk7XG4gICAgICAgICAgICBhdHRhY2hNZWRpYVN0cmVhbShzZWxlY3RvciwgdmlkZW9TdHJlYW0pOyAvLyBGSVhNRTogd2h5IGRvIGkgaGF2ZSB0byBkbyB0aGlzIGZvciBGRj9cblxuICAgICAgICAgICAgLy8gRklYTUU6IGFkZCBhIGNsYXNzIHRoYXQgd2lsbCBhc3NvY2lhdGUgcGVlciBKaWQsIHZpZGVvLnNyYywgaXQncyBzc3JjIGFuZCB2aWRlbyB0eXBlXG4gICAgICAgICAgICAvLyAgICAgICAgaW4gb3JkZXIgdG8gZ2V0IHJpZCBvZiB0b28gbWFueSBtYXBzXG4gICAgICAgICAgICBpZiAoc3NyYyAmJiBzZWxlY3Rvci5hdHRyKCdzcmMnKSkge1xuICAgICAgICAgICAgICAgIHZpZGVvU3JjVG9Tc3JjW3NlbGVjdG9yLmF0dHIoJ3NyYycpXSA9IHNzcmM7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIk5vIHNzcmMgZ2l2ZW4gZm9yIHZpZGVvXCIsIHNlbGVjdG9yKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmlkZW9BY3RpdmUoc2VsZWN0b3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgd2FpdEZvclJlbW90ZVZpZGVvKHNlbGVjdG9yLCBzc3JjLCBzdHJlYW0pO1xuICAgICAgICAgICAgfSwgMjUwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHZpZGVvQWN0aXZlKHZpZGVvZWxlbSkge1xuICAgICAgICBpZiAodmlkZW9lbGVtLmF0dHIoJ2lkJykuaW5kZXhPZignbWl4ZWRtc2xhYmVsJykgPT09IC0xKSB7XG4gICAgICAgICAgICAvLyBpZ25vcmUgbWl4ZWRtc2xhYmVsYTAgYW5kIHYwXG5cbiAgICAgICAgICAgIHZpZGVvZWxlbS5zaG93KCk7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5yZXNpemVUaHVtYm5haWxzKCk7XG5cbiAgICAgICAgICAgIHZhciB2aWRlb1BhcmVudCA9IHZpZGVvZWxlbS5wYXJlbnQoKTtcbiAgICAgICAgICAgIHZhciBwYXJlbnRSZXNvdXJjZUppZCA9IG51bGw7XG4gICAgICAgICAgICBpZiAodmlkZW9QYXJlbnQpXG4gICAgICAgICAgICAgICAgcGFyZW50UmVzb3VyY2VKaWRcbiAgICAgICAgICAgICAgICAgICAgPSBWaWRlb0xheW91dC5nZXRQZWVyQ29udGFpbmVyUmVzb3VyY2VKaWQodmlkZW9QYXJlbnRbMF0pO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGxhcmdlIHZpZGVvIHRvIHRoZSBsYXN0IGFkZGVkIHZpZGVvIG9ubHkgaWYgdGhlcmUncyBub1xuICAgICAgICAgICAgLy8gY3VycmVudCBkb21pbmFudCBvciBmb2N1c2VkIHNwZWFrZXIgb3IgdXBkYXRlIGl0IHRvIHRoZSBjdXJyZW50XG4gICAgICAgICAgICAvLyBkb21pbmFudCBzcGVha2VyLlxuICAgICAgICAgICAgaWYgKCghVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjICYmICFWaWRlb0xheW91dC5nZXREb21pbmFudFNwZWFrZXJSZXNvdXJjZUppZCgpKVxuICAgICAgICAgICAgICAgIHx8IChwYXJlbnRSZXNvdXJjZUppZFxuICAgICAgICAgICAgICAgICYmIFZpZGVvTGF5b3V0LmdldERvbWluYW50U3BlYWtlclJlc291cmNlSmlkKClcbiAgICAgICAgICAgICAgICAgICAgPT09IHBhcmVudFJlc291cmNlSmlkKSkge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8odmlkZW9lbGVtLmF0dHIoJ3NyYycpLCAxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0ZvY3VzSW5kaWNhdG9yKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgbXkucmVzaXplVmlkZW9TcGFjZSA9IGZ1bmN0aW9uKHJpZ2h0Q29sdW1uRWwsIHJpZ2h0Q29sdW1uU2l6ZSwgaXNWaXNpYmxlKVxuICAgIHtcbiAgICAgICAgdmFyIHZpZGVvc3BhY2UgPSAkKCcjdmlkZW9zcGFjZScpO1xuXG4gICAgICAgIHZhciB2aWRlb3NwYWNlV2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aCAtIHJpZ2h0Q29sdW1uU2l6ZVswXTtcbiAgICAgICAgdmFyIHZpZGVvc3BhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIHZhciB2aWRlb1NpemVcbiAgICAgICAgICAgID0gZ2V0VmlkZW9TaXplKG51bGwsIG51bGwsIHZpZGVvc3BhY2VXaWR0aCwgdmlkZW9zcGFjZUhlaWdodCk7XG4gICAgICAgIHZhciB2aWRlb1dpZHRoID0gdmlkZW9TaXplWzBdO1xuICAgICAgICB2YXIgdmlkZW9IZWlnaHQgPSB2aWRlb1NpemVbMV07XG4gICAgICAgIHZhciB2aWRlb1Bvc2l0aW9uID0gZ2V0VmlkZW9Qb3NpdGlvbih2aWRlb1dpZHRoLFxuICAgICAgICAgICAgdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICB2aWRlb3NwYWNlV2lkdGgsXG4gICAgICAgICAgICB2aWRlb3NwYWNlSGVpZ2h0KTtcbiAgICAgICAgdmFyIGhvcml6b250YWxJbmRlbnQgPSB2aWRlb1Bvc2l0aW9uWzBdO1xuICAgICAgICB2YXIgdmVydGljYWxJbmRlbnQgPSB2aWRlb1Bvc2l0aW9uWzFdO1xuXG4gICAgICAgIHZhciB0aHVtYm5haWxTaXplID0gVmlkZW9MYXlvdXQuY2FsY3VsYXRlVGh1bWJuYWlsU2l6ZSh2aWRlb3NwYWNlV2lkdGgpO1xuICAgICAgICB2YXIgdGh1bWJuYWlsc1dpZHRoID0gdGh1bWJuYWlsU2l6ZVswXTtcbiAgICAgICAgdmFyIHRodW1ibmFpbHNIZWlnaHQgPSB0aHVtYm5haWxTaXplWzFdO1xuXG4gICAgICAgIGlmIChpc1Zpc2libGUpIHtcbiAgICAgICAgICAgIHZpZGVvc3BhY2UuYW5pbWF0ZSh7cmlnaHQ6IHJpZ2h0Q29sdW1uU2l6ZVswXSxcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHZpZGVvc3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB2aWRlb3NwYWNlSGVpZ2h0fSxcbiAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwfSk7XG5cbiAgICAgICAgICAgICQoJyNyZW1vdGVWaWRlb3MnKS5hbmltYXRlKHtoZWlnaHQ6IHRodW1ibmFpbHNIZWlnaHR9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDB9KTtcblxuICAgICAgICAgICAgJCgnI3JlbW90ZVZpZGVvcz5zcGFuJykuYW5pbWF0ZSh7aGVpZ2h0OiB0aHVtYm5haWxzSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogdGh1bWJuYWlsc1dpZHRofSxcbiAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicmVtb3RldmlkZW8ucmVzaXplZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt0aHVtYm5haWxzV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRodW1ibmFpbHNIZWlnaHRdKTtcbiAgICAgICAgICAgICAgICAgICAgfX0pO1xuXG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlb0NvbnRhaW5lcicpLmFuaW1hdGUoeyB3aWR0aDogdmlkZW9zcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZpZGVvc3BhY2VIZWlnaHR9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDBcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5hbmltYXRlKHsgIHdpZHRoOiB2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB0b3A6IHZlcnRpY2FsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICBib3R0b206IHZlcnRpY2FsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiBob3Jpem9udGFsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICByaWdodDogaG9yaXpvbnRhbEluZGVudH0sXG4gICAgICAgICAgICAgICAgeyAgIHF1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMFxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByaWdodENvbHVtbkVsLmhpZGUoXCJzbGlkZVwiLCB7IGRpcmVjdGlvbjogXCJyaWdodFwiLFxuICAgICAgICAgICAgICAgIHF1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBVbmRvY2sgdGhlIHRvb2xiYXIgd2hlbiB0aGUgY2hhdCBpcyBzaG93biBhbmQgaWYgd2UncmUgaW4gYVxuICAgICAgICAgICAgLy8gdmlkZW8gbW9kZS5cbiAgICAgICAgICAgIGlmIChWaWRlb0xheW91dC5pc0xhcmdlVmlkZW9WaXNpYmxlKCkpXG4gICAgICAgICAgICAgICAgZGVwLlRvb2xiYXIoKS5kb2NrVG9vbGJhcihmYWxzZSk7XG5cbiAgICAgICAgICAgIHZpZGVvc3BhY2UuYW5pbWF0ZSh7cmlnaHQ6IHJpZ2h0Q29sdW1uU2l6ZVswXSxcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHZpZGVvc3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB2aWRlb3NwYWNlSGVpZ2h0fSxcbiAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHRDb2x1bW5FbC50cmlnZ2VyKCdzaG93bicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICQoJyNyZW1vdGVWaWRlb3MnKS5hbmltYXRlKHtoZWlnaHQ6IHRodW1ibmFpbHNIZWlnaHR9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDB9KTtcblxuICAgICAgICAgICAgJCgnI3JlbW90ZVZpZGVvcz5zcGFuJykuYW5pbWF0ZSh7aGVpZ2h0OiB0aHVtYm5haWxzSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogdGh1bWJuYWlsc1dpZHRofSxcbiAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicmVtb3RldmlkZW8ucmVzaXplZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt0aHVtYm5haWxzV2lkdGgsIHRodW1ibmFpbHNIZWlnaHRdKTtcbiAgICAgICAgICAgICAgICAgICAgfX0pO1xuXG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlb0NvbnRhaW5lcicpLmFuaW1hdGUoeyB3aWR0aDogdmlkZW9zcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZpZGVvc3BhY2VIZWlnaHR9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDBcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5hbmltYXRlKHsgIHdpZHRoOiB2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB0b3A6IHZlcnRpY2FsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICBib3R0b206IHZlcnRpY2FsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiBob3Jpem9udGFsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICByaWdodDogaG9yaXpvbnRhbEluZGVudH0sXG4gICAgICAgICAgICAgICAge3F1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMFxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByaWdodENvbHVtbkVsLnNob3coXCJzbGlkZVwiLCB7IGRpcmVjdGlvbjogXCJyaWdodFwiLFxuICAgICAgICAgICAgICAgIHF1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdzaW11bGNhc3RsYXllcnN0YXJ0ZWQnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICB2YXIgbG9jYWxWaWRlb1NlbGVjdG9yID0gJCgnIycgKyAnbG9jYWxWaWRlb18nICtcbiAgICAgICAgICAgIGRlcC5VSUFjdGl2YXRvcigpLmdldFJUQ1NlcnZpY2UoKS5sb2NhbFZpZGVvLmdldE9yaWdpbmFsU3RyZWFtKCkubG9jYWxWaWRlby5pZCk7XG4gICAgICAgIHZhciBzaW11bGNhc3QgPSBuZXcgU2ltdWxjYXN0KCk7XG4gICAgICAgIHZhciBzdHJlYW0gPSBzaW11bGNhc3QuZ2V0TG9jYWxWaWRlb1N0cmVhbSgpO1xuXG4gICAgICAgIC8vIEF0dGFjaCBXZWJSVEMgc3RyZWFtXG4gICAgICAgIGF0dGFjaE1lZGlhU3RyZWFtKGxvY2FsVmlkZW9TZWxlY3Rvciwgc3RyZWFtKTtcblxuICAgICAgICBsb2NhbFZpZGVvU3JjID0gJChsb2NhbFZpZGVvU2VsZWN0b3IpLmF0dHIoJ3NyYycpO1xuICAgIH0pO1xuXG4gICAgJChkb2N1bWVudCkuYmluZCgnc2ltdWxjYXN0bGF5ZXJzdG9wcGVkJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgdmFyIGxvY2FsVmlkZW9TZWxlY3RvciA9ICQoJyMnICsgJ2xvY2FsVmlkZW9fJyArXG4gICAgICAgICAgICBkZXAuVUlBY3RpdmF0b3IoKS5nZXRSVENTZXJ2aWNlKCkubG9jYWxWaWRlby5nZXRPcmlnaW5hbFN0cmVhbSgpLmxvY2FsVmlkZW8uaWQpO1xuICAgICAgICB2YXIgc2ltdWxjYXN0ID0gbmV3IFNpbXVsY2FzdCgpO1xuICAgICAgICB2YXIgc3RyZWFtID0gc2ltdWxjYXN0LmdldExvY2FsVmlkZW9TdHJlYW0oKTtcblxuICAgICAgICAvLyBBdHRhY2ggV2ViUlRDIHN0cmVhbVxuICAgICAgICBhdHRhY2hNZWRpYVN0cmVhbShsb2NhbFZpZGVvU2VsZWN0b3IsIHN0cmVhbSk7XG5cbiAgICAgICAgbG9jYWxWaWRlb1NyYyA9ICQobG9jYWxWaWRlb1NlbGVjdG9yKS5hdHRyKCdzcmMnKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIE9uIHNpbXVsY2FzdCBsYXllcnMgY2hhbmdlZCBldmVudC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdzaW11bGNhc3RsYXllcnNjaGFuZ2VkJywgZnVuY3Rpb24gKGV2ZW50LCBlbmRwb2ludFNpbXVsY2FzdExheWVycykge1xuICAgICAgICB2YXIgc2ltdWxjYXN0ID0gbmV3IFNpbXVsY2FzdCgpO1xuICAgICAgICBlbmRwb2ludFNpbXVsY2FzdExheWVycy5mb3JFYWNoKGZ1bmN0aW9uIChlc2wpIHtcblxuICAgICAgICAgICAgdmFyIHByaW1hcnlTU1JDID0gZXNsLnNpbXVsY2FzdExheWVyLnByaW1hcnlTU1JDO1xuICAgICAgICAgICAgdmFyIG1zaWQgPSBzaW11bGNhc3QuZ2V0UmVtb3RlVmlkZW9TdHJlYW1JZEJ5U1NSQyhwcmltYXJ5U1NSQyk7XG5cbiAgICAgICAgICAgIC8vIEdldCBzZXNzaW9uIGFuZCBzdHJlYW0gZnJvbSBtc2lkLlxuICAgICAgICAgICAgdmFyIHNlc3Npb24sIGVsZWN0ZWRTdHJlYW07XG4gICAgICAgICAgICB2YXIgaSwgaiwgaztcblxuXG4gICAgICAgICAgICB2YXIgcmVtb3RlU3RyZWFtcyA9IFJUQ0FjdGl2YXRvci5nZXRSVENTZXJ2aWNlKCkucmVtb3RlU3RyZWFtcztcbiAgICAgICAgICAgIHZhciByZW1vdGVTdHJlYW07XG5cbiAgICAgICAgICAgIGlmIChyZW1vdGVTdHJlYW1zKSB7XG4gICAgICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IHJlbW90ZVN0cmVhbXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgcmVtb3RlU3RyZWFtID0gcmVtb3RlU3RyZWFtc1tqXTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlY3RlZFN0cmVhbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc3RyZWFtIGZvdW5kLCBzdG9wLlxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdmFyIHRyYWNrcyA9IHJlbW90ZVN0cmVhbS5nZXRPcmlnaW5hbFN0cmVhbSgpLmdldFZpZGVvVHJhY2tzKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0cmFja3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoayA9IDA7IGsgPCB0cmFja3MubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdHJhY2sgPSB0cmFja3Nba107XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobXNpZCA9PT0gW3JlbW90ZVN0cmVhbS5pZCwgdHJhY2suaWRdLmpvaW4oJyAnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVjdGVkU3RyZWFtID0gbmV3IHdlYmtpdE1lZGlhU3RyZWFtKFt0cmFja10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzdHJlYW0gZm91bmQsIHN0b3AuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGVsZWN0ZWRTdHJlYW0pIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oJ1N3aXRjaGluZyBzaW11bGNhc3Qgc3Vic3RyZWFtLicpO1xuXG4gICAgICAgICAgICAgICAgdmFyIG1zaWRQYXJ0cyA9IG1zaWQuc3BsaXQoJyAnKTtcbiAgICAgICAgICAgICAgICB2YXIgc2VsUmVtb3RlVmlkZW8gPSAkKFsnIycsICdyZW1vdGVWaWRlb18nLCByZW1vdGVTdHJlYW0uc2lkLCAnXycsIG1zaWRQYXJ0c1swXV0uam9pbignJykpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHVwZGF0ZUxhcmdlVmlkZW8gPSAoWE1QUEFjdGl2YXRvci5nZXRKSURGcm9tU1NSQyh2aWRlb1NyY1RvU3NyY1tzZWxSZW1vdGVWaWRlby5hdHRyKCdzcmMnKV0pXG4gICAgICAgICAgICAgICAgICAgID09IFhNUFBBY3RpdmF0b3IuZ2V0SklERnJvbVNTUkModmlkZW9TcmNUb1NzcmNbbGFyZ2VWaWRlb05ld1NyY10pKTtcbiAgICAgICAgICAgICAgICB2YXIgdXBkYXRlRm9jdXNlZFZpZGVvU3JjID0gKHNlbFJlbW90ZVZpZGVvLmF0dHIoJ3NyYycpID09IGZvY3VzZWRWaWRlb1NyYyk7XG5cbiAgICAgICAgICAgICAgICB2YXIgZWxlY3RlZFN0cmVhbVVybCA9IHdlYmtpdFVSTC5jcmVhdGVPYmplY3RVUkwoZWxlY3RlZFN0cmVhbSk7XG4gICAgICAgICAgICAgICAgc2VsUmVtb3RlVmlkZW8uYXR0cignc3JjJywgZWxlY3RlZFN0cmVhbVVybCk7XG4gICAgICAgICAgICAgICAgdmlkZW9TcmNUb1NzcmNbc2VsUmVtb3RlVmlkZW8uYXR0cignc3JjJyldID0gcHJpbWFyeVNTUkM7XG5cbiAgICAgICAgICAgICAgICBpZiAodXBkYXRlTGFyZ2VWaWRlbykge1xuICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC51cGRhdGVMYXJnZVZpZGVvKGVsZWN0ZWRTdHJlYW1VcmwpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICh1cGRhdGVGb2N1c2VkVmlkZW9TcmMpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9jdXNlZFZpZGVvU3JjID0gZWxlY3RlZFN0cmVhbVVybDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQ291bGQgbm90IGZpbmQgYSBzdHJlYW0gb3IgYSBzZXNzaW9uLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBteTtcbn0oVmlkZW9MYXlvdXQgfHwge30pKTtcblxubW9kdWxlLmV4cG9ydHMgPSBWaWRlb0xheW91dDtcbiIsInZhciB1cGRhdGVUaW1lb3V0O1xudmFyIGFuaW1hdGVUaW1lb3V0O1xudmFyIFJvb21OYW1lR2VuZXJhdG9yID0gcmVxdWlyZShcIi4uL3V0aWwvcm9vbW5hbWVfZ2VuZXJhdG9yXCIpO1xuXG5mdW5jdGlvbiBzZXR1cFdlbGNvbWVQYWdlKCkge1xuICAgICQoXCIjZG9tYWluX25hbWVcIikudGV4dCh3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyB3aW5kb3cubG9jYXRpb24uaG9zdCArIFwiL1wiKTtcbiAgICAkKFwic3BhbltuYW1lPSdhcHBOYW1lJ11cIikudGV4dChicmFuZC5hcHBOYW1lKTtcbiAgICAkKFwiI2VudGVyX3Jvb21fYnV0dG9uXCIpLmNsaWNrKGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIGVudGVyX3Jvb20oKTtcbiAgICB9KTtcblxuICAgICQoXCIjZW50ZXJfcm9vbV9maWVsZFwiKS5rZXlkb3duKGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcbiAgICAgICAgICAgIGVudGVyX3Jvb20oKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgJChcIiNyZWxvYWRfcm9vbW5hbWVcIikuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodXBkYXRlVGltZW91dCk7XG4gICAgICAgIGNsZWFyVGltZW91dChhbmltYXRlVGltZW91dCk7XG4gICAgICAgIHVwZGF0ZV9yb29tbmFtZSgpO1xuICAgIH0pO1xuXG4gICAgJChcIiNkaXNhYmxlX3dlbGNvbWVcIikuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLndlbGNvbWVQYWdlRGlzYWJsZWQgPSAkKFwiI2Rpc2FibGVfd2VsY29tZVwiKS5pcyhcIjpjaGVja2VkXCIpO1xuICAgIH0pO1xuXG4gICAgdXBkYXRlX3Jvb21uYW1lKCk7XG59O1xuXG5mdW5jdGlvbiBlbnRlcl9yb29tKClcbntcbiAgICB2YXIgdmFsID0gJChcIiNlbnRlcl9yb29tX2ZpZWxkXCIpLnZhbCgpO1xuICAgIGlmKCF2YWwpXG4gICAgICAgIHZhbCA9ICQoXCIjZW50ZXJfcm9vbV9maWVsZFwiKS5hdHRyKFwicm9vbV9uYW1lXCIpO1xuICAgIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSA9IFwiL1wiICsgdmFsO1xufVxuXG5mdW5jdGlvbiBhbmltYXRlKHdvcmQpIHtcbiAgICB2YXIgY3VycmVudFZhbCA9ICQoXCIjZW50ZXJfcm9vbV9maWVsZFwiKS5hdHRyKFwicGxhY2Vob2xkZXJcIik7XG4gICAgJChcIiNlbnRlcl9yb29tX2ZpZWxkXCIpLmF0dHIoXCJwbGFjZWhvbGRlclwiLCBjdXJyZW50VmFsICsgd29yZC5zdWJzdHIoMCwgMSkpO1xuICAgIGFuaW1hdGVUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgYW5pbWF0ZSh3b3JkLnN1YnN0cmluZygxLCB3b3JkLmxlbmd0aCkpXG4gICAgfSwgNzApO1xufVxuXG5cbmZ1bmN0aW9uIHVwZGF0ZV9yb29tbmFtZSgpXG57XG4gICAgdmFyIHdvcmQgPSBSb29tTmFtZUdlbmVyYXRvci5nZW5lcmF0ZVJvb21XaXRob3V0U2VwYXJhdG9yKCk7XG4gICAgJChcIiNlbnRlcl9yb29tX2ZpZWxkXCIpLmF0dHIoXCJyb29tX25hbWVcIiwgd29yZCk7XG4gICAgJChcIiNlbnRlcl9yb29tX2ZpZWxkXCIpLmF0dHIoXCJwbGFjZWhvbGRlclwiLCBcIlwiKTtcbiAgICBhbmltYXRlKHdvcmQpO1xuICAgIHVwZGF0ZVRpbWVvdXQgPSBzZXRUaW1lb3V0KHVwZGF0ZV9yb29tbmFtZSwgMTAwMDApO1xuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2V0dXBXZWxjb21lUGFnZSgpO1xuIiwidmFyIFZpZGVvTGF5b3V0ID0gcmVxdWlyZShcIi4uL1ZpZGVvTGF5b3V0XCIpO1xudmFyIENhbnZhc1V0aWwgPSByZXF1aXJlKFwiLi9DYW52YXNVdGlsLmpzXCIpO1xuXG4vKipcbiAqIFRoZSBhdWRpbyBMZXZlbHMgcGx1Z2luLlxuICovXG52YXIgQXVkaW9MZXZlbHMgPSAoZnVuY3Rpb24obXkpIHtcbiAgICB2YXIgYXVkaW9MZXZlbENhbnZhc0NhY2hlID0ge307XG5cbiAgICBteS5MT0NBTF9MRVZFTCA9ICdsb2NhbCc7XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBhdWRpbyBsZXZlbCBjYW52YXMgZm9yIHRoZSBnaXZlbiBwZWVySmlkLiBJZiB0aGUgY2FudmFzXG4gICAgICogZGlkbid0IGV4aXN0IHdlIGNyZWF0ZSBpdC5cbiAgICAgKi9cbiAgICBteS51cGRhdGVBdWRpb0xldmVsQ2FudmFzID0gZnVuY3Rpb24gKHBlZXJKaWQpIHtcbiAgICAgICAgdmFyIHJlc291cmNlSmlkID0gbnVsbDtcbiAgICAgICAgdmFyIHZpZGVvU3BhbklkID0gbnVsbDtcbiAgICAgICAgaWYgKCFwZWVySmlkKVxuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAnbG9jYWxWaWRlb0NvbnRhaW5lcic7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVzb3VyY2VKaWQgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChwZWVySmlkKTtcblxuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAncGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkO1xuICAgICAgICB9XG5cbiAgICAgICAgdmlkZW9TcGFuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodmlkZW9TcGFuSWQpO1xuXG4gICAgICAgIGlmICghdmlkZW9TcGFuKSB7XG4gICAgICAgICAgICBpZiAocmVzb3VyY2VKaWQpXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIk5vIHZpZGVvIGVsZW1lbnQgZm9yIGppZFwiLCByZXNvdXJjZUppZCk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIk5vIHZpZGVvIGVsZW1lbnQgZm9yIGxvY2FsIHZpZGVvLlwiKTtcblxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGF1ZGlvTGV2ZWxDYW52YXMgPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5jYW52YXMnKTtcblxuICAgICAgICB2YXIgdmlkZW9TcGFjZVdpZHRoID0gJCgnI3JlbW90ZVZpZGVvcycpLndpZHRoKCk7XG4gICAgICAgIHZhciB0aHVtYm5haWxTaXplXG4gICAgICAgICAgICA9IFZpZGVvTGF5b3V0LmNhbGN1bGF0ZVRodW1ibmFpbFNpemUodmlkZW9TcGFjZVdpZHRoKTtcbiAgICAgICAgdmFyIHRodW1ibmFpbFdpZHRoID0gdGh1bWJuYWlsU2l6ZVswXTtcbiAgICAgICAgdmFyIHRodW1ibmFpbEhlaWdodCA9IHRodW1ibmFpbFNpemVbMV07XG5cbiAgICAgICAgaWYgKCFhdWRpb0xldmVsQ2FudmFzIHx8IGF1ZGlvTGV2ZWxDYW52YXMubGVuZ3RoID09PSAwKSB7XG5cbiAgICAgICAgICAgIGF1ZGlvTGV2ZWxDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgICAgIGF1ZGlvTGV2ZWxDYW52YXMuY2xhc3NOYW1lID0gXCJhdWRpb2xldmVsXCI7XG4gICAgICAgICAgICBhdWRpb0xldmVsQ2FudmFzLnN0eWxlLmJvdHRvbSA9IFwiLVwiICsgaW50ZXJmYWNlQ29uZmlnLkNBTlZBU19FWFRSQS8yICsgXCJweFwiO1xuICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhcy5zdHlsZS5sZWZ0ID0gXCItXCIgKyBpbnRlcmZhY2VDb25maWcuQ0FOVkFTX0VYVFJBLzIgKyBcInB4XCI7XG4gICAgICAgICAgICByZXNpemVBdWRpb0xldmVsQ2FudmFzKCBhdWRpb0xldmVsQ2FudmFzLFxuICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgdGh1bWJuYWlsSGVpZ2h0KTtcblxuICAgICAgICAgICAgdmlkZW9TcGFuLmFwcGVuZENoaWxkKGF1ZGlvTGV2ZWxDYW52YXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhcyA9IGF1ZGlvTGV2ZWxDYW52YXMuZ2V0KDApO1xuXG4gICAgICAgICAgICByZXNpemVBdWRpb0xldmVsQ2FudmFzKCBhdWRpb0xldmVsQ2FudmFzLFxuICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgdGh1bWJuYWlsSGVpZ2h0KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBhdWRpbyBsZXZlbCBVSSBmb3IgdGhlIGdpdmVuIHJlc291cmNlSmlkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHJlc291cmNlSmlkIHRoZSByZXNvdXJjZSBqaWQgaW5kaWNhdGluZyB0aGUgdmlkZW8gZWxlbWVudCBmb3JcbiAgICAgKiB3aGljaCB3ZSBkcmF3IHRoZSBhdWRpbyBsZXZlbFxuICAgICAqIEBwYXJhbSBhdWRpb0xldmVsIHRoZSBuZXdBdWRpbyBsZXZlbCB0byByZW5kZXJcbiAgICAgKi9cbiAgICBteS51cGRhdGVBdWRpb0xldmVsID0gZnVuY3Rpb24gKHJlc291cmNlSmlkLCBhdWRpb0xldmVsKSB7XG4gICAgICAgIGRyYXdBdWRpb0xldmVsQ2FudmFzKHJlc291cmNlSmlkLCBhdWRpb0xldmVsKTtcblxuICAgICAgICB2YXIgdmlkZW9TcGFuSWQgPSBnZXRWaWRlb1NwYW5JZChyZXNvdXJjZUppZCk7XG5cbiAgICAgICAgdmFyIGF1ZGlvTGV2ZWxDYW52YXMgPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5jYW52YXMnKS5nZXQoMCk7XG5cbiAgICAgICAgaWYgKCFhdWRpb0xldmVsQ2FudmFzKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHZhciBkcmF3Q29udGV4dCA9IGF1ZGlvTGV2ZWxDYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgICAgICB2YXIgY2FudmFzQ2FjaGUgPSBhdWRpb0xldmVsQ2FudmFzQ2FjaGVbcmVzb3VyY2VKaWRdO1xuXG4gICAgICAgIGRyYXdDb250ZXh0LmNsZWFyUmVjdCAoMCwgMCxcbiAgICAgICAgICAgICAgICBhdWRpb0xldmVsQ2FudmFzLndpZHRoLCBhdWRpb0xldmVsQ2FudmFzLmhlaWdodCk7XG4gICAgICAgIGRyYXdDb250ZXh0LmRyYXdJbWFnZShjYW52YXNDYWNoZSwgMCwgMCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlc2l6ZXMgdGhlIGdpdmVuIGF1ZGlvIGxldmVsIGNhbnZhcyB0byBtYXRjaCB0aGUgZ2l2ZW4gdGh1bWJuYWlsIHNpemUuXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVzaXplQXVkaW9MZXZlbENhbnZhcyhhdWRpb0xldmVsQ2FudmFzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGh1bWJuYWlsV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxIZWlnaHQpIHtcbiAgICAgICAgYXVkaW9MZXZlbENhbnZhcy53aWR0aCA9IHRodW1ibmFpbFdpZHRoICsgaW50ZXJmYWNlQ29uZmlnLkNBTlZBU19FWFRSQTtcbiAgICAgICAgYXVkaW9MZXZlbENhbnZhcy5oZWlnaHQgPSB0aHVtYm5haWxIZWlnaHQgKyBpbnRlcmZhY2VDb25maWcuQ0FOVkFTX0VYVFJBO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBEcmF3cyB0aGUgYXVkaW8gbGV2ZWwgY2FudmFzIGludG8gdGhlIGNhY2hlZCBjYW52YXMgb2JqZWN0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHJlc291cmNlSmlkIHRoZSByZXNvdXJjZSBqaWQgaW5kaWNhdGluZyB0aGUgdmlkZW8gZWxlbWVudCBmb3JcbiAgICAgKiB3aGljaCB3ZSBkcmF3IHRoZSBhdWRpbyBsZXZlbFxuICAgICAqIEBwYXJhbSBhdWRpb0xldmVsIHRoZSBuZXdBdWRpbyBsZXZlbCB0byByZW5kZXJcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBkcmF3QXVkaW9MZXZlbENhbnZhcyhyZXNvdXJjZUppZCwgYXVkaW9MZXZlbCkge1xuICAgICAgICBpZiAoIWF1ZGlvTGV2ZWxDYW52YXNDYWNoZVtyZXNvdXJjZUppZF0pIHtcblxuICAgICAgICAgICAgdmFyIHZpZGVvU3BhbklkID0gZ2V0VmlkZW9TcGFuSWQocmVzb3VyY2VKaWQpO1xuXG4gICAgICAgICAgICB2YXIgYXVkaW9MZXZlbENhbnZhc09yaWcgPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5jYW52YXMnKS5nZXQoMCk7XG5cbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgKiBGSVhNRSBUZXN0aW5nIGhhcyBzaG93biB0aGF0IGF1ZGlvTGV2ZWxDYW52YXNPcmlnIG1heSBub3QgZXhpc3QuXG4gICAgICAgICAgICAgKiBJbiBzdWNoIGEgY2FzZSwgdGhlIG1ldGhvZCBDYW52YXNVdGlsLmNsb25lQ2FudmFzIG1heSB0aHJvdyBhblxuICAgICAgICAgICAgICogZXJyb3IuIFNpbmNlIGF1ZGlvIGxldmVscyBhcmUgZnJlcXVlbnRseSB1cGRhdGVkLCB0aGUgZXJyb3JzIGhhdmVcbiAgICAgICAgICAgICAqIGJlZW4gb2JzZXJ2ZWQgdG8gcGlsZSBpbnRvIHRoZSBjb25zb2xlLCBzdHJhaW4gdGhlIENQVS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaWYgKGF1ZGlvTGV2ZWxDYW52YXNPcmlnKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGF1ZGlvTGV2ZWxDYW52YXNDYWNoZVtyZXNvdXJjZUppZF1cbiAgICAgICAgICAgICAgICAgICAgPSBDYW52YXNVdGlsLmNsb25lQ2FudmFzKGF1ZGlvTGV2ZWxDYW52YXNPcmlnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjYW52YXMgPSBhdWRpb0xldmVsQ2FudmFzQ2FjaGVbcmVzb3VyY2VKaWRdO1xuXG4gICAgICAgIGlmICghY2FudmFzKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHZhciBkcmF3Q29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgICAgIGRyYXdDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuXG4gICAgICAgIHZhciBzaGFkb3dMZXZlbCA9IGdldFNoYWRvd0xldmVsKGF1ZGlvTGV2ZWwpO1xuXG4gICAgICAgIGlmIChzaGFkb3dMZXZlbCA+IDApXG4gICAgICAgICAgICAvLyBkcmF3Q29udGV4dCwgeCwgeSwgdywgaCwgciwgc2hhZG93Q29sb3IsIHNoYWRvd0xldmVsXG4gICAgICAgICAgICBDYW52YXNVdGlsLmRyYXdSb3VuZFJlY3RHbG93KCAgIGRyYXdDb250ZXh0LFxuICAgICAgICAgICAgICAgIGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkEvMiwgaW50ZXJmYWNlQ29uZmlnLkNBTlZBU19FWFRSQS8yLFxuICAgICAgICAgICAgICAgIGNhbnZhcy53aWR0aCAtIGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkEsXG4gICAgICAgICAgICAgICAgY2FudmFzLmhlaWdodCAtIGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkEsXG4gICAgICAgICAgICAgICAgaW50ZXJmYWNlQ29uZmlnLkNBTlZBU19SQURJVVMsXG4gICAgICAgICAgICAgICAgaW50ZXJmYWNlQ29uZmlnLlNIQURPV19DT0xPUixcbiAgICAgICAgICAgICAgICBzaGFkb3dMZXZlbCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHNoYWRvdy9nbG93IGxldmVsIGZvciB0aGUgZ2l2ZW4gYXVkaW8gbGV2ZWwuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXVkaW9MZXZlbCB0aGUgYXVkaW8gbGV2ZWwgZnJvbSB3aGljaCB3ZSBkZXRlcm1pbmUgdGhlIHNoYWRvd1xuICAgICAqIGxldmVsXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0U2hhZG93TGV2ZWwgKGF1ZGlvTGV2ZWwpIHtcbiAgICAgICAgdmFyIHNoYWRvd0xldmVsID0gMDtcblxuICAgICAgICBpZiAoYXVkaW9MZXZlbCA8PSAwLjMpIHtcbiAgICAgICAgICAgIHNoYWRvd0xldmVsID0gTWF0aC5yb3VuZChpbnRlcmZhY2VDb25maWcuQ0FOVkFTX0VYVFJBLzIqKGF1ZGlvTGV2ZWwvMC4zKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoYXVkaW9MZXZlbCA8PSAwLjYpIHtcbiAgICAgICAgICAgIHNoYWRvd0xldmVsID0gTWF0aC5yb3VuZChpbnRlcmZhY2VDb25maWcuQ0FOVkFTX0VYVFJBLzIqKChhdWRpb0xldmVsIC0gMC4zKSAvIDAuMykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc2hhZG93TGV2ZWwgPSBNYXRoLnJvdW5kKGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkEvMiooKGF1ZGlvTGV2ZWwgLSAwLjYpIC8gMC40KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNoYWRvd0xldmVsO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSB2aWRlbyBzcGFuIGlkIGNvcnJlc3BvbmRpbmcgdG8gdGhlIGdpdmVuIHJlc291cmNlSmlkIG9yIGxvY2FsXG4gICAgICogdXNlci5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRWaWRlb1NwYW5JZChyZXNvdXJjZUppZCkge1xuICAgICAgICB2YXIgdmlkZW9TcGFuSWQgPSBudWxsO1xuICAgICAgICBpZiAocmVzb3VyY2VKaWQgPT09IFN0YXRpc3RpY3NBY3RpdmF0b3IuTE9DQUxfSklEKVxuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAnbG9jYWxWaWRlb0NvbnRhaW5lcic7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHZpZGVvU3BhbklkID0gJ3BhcnRpY2lwYW50XycgKyByZXNvdXJjZUppZDtcblxuICAgICAgICByZXR1cm4gdmlkZW9TcGFuSWQ7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEluZGljYXRlcyB0aGF0IHRoZSByZW1vdGUgdmlkZW8gaGFzIGJlZW4gcmVzaXplZC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdyZW1vdGV2aWRlby5yZXNpemVkJywgZnVuY3Rpb24gKGV2ZW50LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHZhciByZXNpemVkID0gZmFsc2U7XG4gICAgICAgICQoJyNyZW1vdGVWaWRlb3M+c3Bhbj5jYW52YXMnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGNhbnZhcyA9ICQodGhpcykuZ2V0KDApO1xuICAgICAgICAgICAgaWYgKGNhbnZhcy53aWR0aCAhPT0gd2lkdGggKyBpbnRlcmZhY2VDb25maWcuQ0FOVkFTX0VYVFJBKSB7XG4gICAgICAgICAgICAgICAgY2FudmFzLndpZHRoID0gd2lkdGggKyBpbnRlcmZhY2VDb25maWcuQ0FOVkFTX0VYVFJBO1xuICAgICAgICAgICAgICAgIHJlc2l6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY2FudmFzLmhlaWdoICE9PSBoZWlnaHQgKyBpbnRlcmZhY2VDb25maWcuQ0FOVkFTX0VYVFJBKSB7XG4gICAgICAgICAgICAgICAgY2FudmFzLmhlaWdodCA9IGhlaWdodCArIGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkE7XG4gICAgICAgICAgICAgICAgcmVzaXplZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChyZXNpemVkKVxuICAgICAgICAgICAgT2JqZWN0LmtleXMoYXVkaW9MZXZlbENhbnZhc0NhY2hlKS5mb3JFYWNoKGZ1bmN0aW9uIChyZXNvdXJjZUppZCkge1xuICAgICAgICAgICAgICAgIGF1ZGlvTGV2ZWxDYW52YXNDYWNoZVtyZXNvdXJjZUppZF0ud2lkdGhcbiAgICAgICAgICAgICAgICAgICAgPSB3aWR0aCArIGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkE7XG4gICAgICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhc0NhY2hlW3Jlc291cmNlSmlkXS5oZWlnaHRcbiAgICAgICAgICAgICAgICAgICAgPSBoZWlnaHQgKyBpbnRlcmZhY2VDb25maWcuQ0FOVkFTX0VYVFJBO1xuICAgICAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbXk7XG5cbn0pKEF1ZGlvTGV2ZWxzIHx8IHt9KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBdWRpb0xldmVscztcbiIsIi8qKlxuICogVXRpbGl0eSBjbGFzcyBmb3IgZHJhd2luZyBjYW52YXMgc2hhcGVzLlxuICovXG52YXIgQ2FudmFzVXRpbCA9IChmdW5jdGlvbihteSkge1xuXG4gICAgLyoqXG4gICAgICogRHJhd3MgYSByb3VuZCByZWN0YW5nbGUgd2l0aCBhIGdsb3cuIFRoZSBnbG93V2lkdGggaW5kaWNhdGVzIHRoZSBkZXB0aFxuICAgICAqIG9mIHRoZSBnbG93LlxuICAgICAqXG4gICAgICogQHBhcmFtIGRyYXdDb250ZXh0IHRoZSBjb250ZXh0IG9mIHRoZSBjYW52YXMgdG8gZHJhdyB0b1xuICAgICAqIEBwYXJhbSB4IHRoZSB4IGNvb3JkaW5hdGUgb2YgdGhlIHJvdW5kIHJlY3RhbmdsZVxuICAgICAqIEBwYXJhbSB5IHRoZSB5IGNvb3JkaW5hdGUgb2YgdGhlIHJvdW5kIHJlY3RhbmdsZVxuICAgICAqIEBwYXJhbSB3IHRoZSB3aWR0aCBvZiB0aGUgcm91bmQgcmVjdGFuZ2xlXG4gICAgICogQHBhcmFtIGggdGhlIGhlaWdodCBvZiB0aGUgcm91bmQgcmVjdGFuZ2xlXG4gICAgICogQHBhcmFtIGdsb3dDb2xvciB0aGUgY29sb3Igb2YgdGhlIGdsb3dcbiAgICAgKiBAcGFyYW0gZ2xvd1dpZHRoIHRoZSB3aWR0aCBvZiB0aGUgZ2xvd1xuICAgICAqL1xuICAgIG15LmRyYXdSb3VuZFJlY3RHbG93XG4gICAgICAgID0gZnVuY3Rpb24oZHJhd0NvbnRleHQsIHgsIHksIHcsIGgsIHIsIGdsb3dDb2xvciwgZ2xvd1dpZHRoKSB7XG5cbiAgICAgICAgLy8gU2F2ZSB0aGUgcHJldmlvdXMgc3RhdGUgb2YgdGhlIGNvbnRleHQuXG4gICAgICAgIGRyYXdDb250ZXh0LnNhdmUoKTtcblxuICAgICAgICBpZiAodyA8IDIgKiByKSByID0gdyAvIDI7XG4gICAgICAgIGlmIChoIDwgMiAqIHIpIHIgPSBoIC8gMjtcblxuICAgICAgICAvLyBEcmF3IGEgcm91bmQgcmVjdGFuZ2xlLlxuICAgICAgICBkcmF3Q29udGV4dC5iZWdpblBhdGgoKTtcbiAgICAgICAgZHJhd0NvbnRleHQubW92ZVRvKHgrciwgeSk7XG4gICAgICAgIGRyYXdDb250ZXh0LmFyY1RvKHgrdywgeSwgICB4K3csIHkraCwgcik7XG4gICAgICAgIGRyYXdDb250ZXh0LmFyY1RvKHgrdywgeStoLCB4LCAgIHkraCwgcik7XG4gICAgICAgIGRyYXdDb250ZXh0LmFyY1RvKHgsICAgeStoLCB4LCAgIHksICAgcik7XG4gICAgICAgIGRyYXdDb250ZXh0LmFyY1RvKHgsICAgeSwgICB4K3csIHksICAgcik7XG4gICAgICAgIGRyYXdDb250ZXh0LmNsb3NlUGF0aCgpO1xuXG4gICAgICAgIC8vIEFkZCBhIHNoYWRvdyBhcm91bmQgdGhlIHJlY3RhbmdsZVxuICAgICAgICBkcmF3Q29udGV4dC5zaGFkb3dDb2xvciA9IGdsb3dDb2xvcjtcbiAgICAgICAgZHJhd0NvbnRleHQuc2hhZG93Qmx1ciA9IGdsb3dXaWR0aDtcbiAgICAgICAgZHJhd0NvbnRleHQuc2hhZG93T2Zmc2V0WCA9IDA7XG4gICAgICAgIGRyYXdDb250ZXh0LnNoYWRvd09mZnNldFkgPSAwO1xuXG4gICAgICAgIC8vIEZpbGwgdGhlIHNoYXBlLlxuICAgICAgICBkcmF3Q29udGV4dC5maWxsKCk7XG5cbiAgICAgICAgZHJhd0NvbnRleHQuc2F2ZSgpO1xuXG4gICAgICAgIGRyYXdDb250ZXh0LnJlc3RvcmUoKTtcblxuLy8gICAgICAxKSBVbmNvbW1lbnQgdGhpcyBsaW5lIHRvIHVzZSBDb21wb3NpdGUgT3BlcmF0aW9uLCB3aGljaCBpcyBkb2luZyB0aGVcbi8vICAgICAgc2FtZSBhcyB0aGUgY2xpcCBmdW5jdGlvbiBiZWxvdyBhbmQgaXMgYWxzbyBhbnRpYWxpYXNpbmcgdGhlIHJvdW5kXG4vLyAgICAgIGJvcmRlciwgYnV0IGlzIHNhaWQgdG8gYmUgbGVzcyBmYXN0IHBlcmZvcm1hbmNlIHdpc2UuXG5cbi8vICAgICAgZHJhd0NvbnRleHQuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uPSdkZXN0aW5hdGlvbi1vdXQnO1xuXG4gICAgICAgIGRyYXdDb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICBkcmF3Q29udGV4dC5tb3ZlVG8oeCtyLCB5KTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCt3LCB5LCAgIHgrdywgeStoLCByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCt3LCB5K2gsIHgsICAgeStoLCByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCwgICB5K2gsIHgsICAgeSwgICByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCwgICB5LCAgIHgrdywgeSwgICByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuY2xvc2VQYXRoKCk7XG5cbi8vICAgICAgMikgVW5jb21tZW50IHRoaXMgbGluZSB0byB1c2UgQ29tcG9zaXRlIE9wZXJhdGlvbiwgd2hpY2ggaXMgZG9pbmcgdGhlXG4vLyAgICAgIHNhbWUgYXMgdGhlIGNsaXAgZnVuY3Rpb24gYmVsb3cgYW5kIGlzIGFsc28gYW50aWFsaWFzaW5nIHRoZSByb3VuZFxuLy8gICAgICBib3JkZXIsIGJ1dCBpcyBzYWlkIHRvIGJlIGxlc3MgZmFzdCBwZXJmb3JtYW5jZSB3aXNlLlxuXG4vLyAgICAgIGRyYXdDb250ZXh0LmZpbGwoKTtcblxuICAgICAgICAvLyBDb21tZW50IHRoZXNlIHR3byBsaW5lcyBpZiBjaG9vc2luZyB0byBkbyB0aGUgc2FtZSB3aXRoIGNvbXBvc2l0ZVxuICAgICAgICAvLyBvcGVyYXRpb24gYWJvdmUgMSBhbmQgMi5cbiAgICAgICAgZHJhd0NvbnRleHQuY2xpcCgpO1xuICAgICAgICBkcmF3Q29udGV4dC5jbGVhclJlY3QoMCwgMCwgMjc3LCAyMDApO1xuXG4gICAgICAgIC8vIFJlc3RvcmUgdGhlIHByZXZpb3VzIGNvbnRleHQgc3RhdGUuXG4gICAgICAgIGRyYXdDb250ZXh0LnJlc3RvcmUoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2xvbmVzIHRoZSBnaXZlbiBjYW52YXMuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHRoZSBuZXcgY2xvbmVkIGNhbnZhcy5cbiAgICAgKi9cbiAgICBteS5jbG9uZUNhbnZhcyA9IGZ1bmN0aW9uIChvbGRDYW52YXMpIHtcbiAgICAgICAgLypcbiAgICAgICAgICogRklYTUUgVGVzdGluZyBoYXMgc2hvd24gdGhhdCBvbGRDYW52YXMgbWF5IG5vdCBleGlzdC4gSW4gc3VjaCBhIGNhc2UsXG4gICAgICAgICAqIHRoZSBtZXRob2QgQ2FudmFzVXRpbC5jbG9uZUNhbnZhcyBtYXkgdGhyb3cgYW4gZXJyb3IuIFNpbmNlIGF1ZGlvXG4gICAgICAgICAqIGxldmVscyBhcmUgZnJlcXVlbnRseSB1cGRhdGVkLCB0aGUgZXJyb3JzIGhhdmUgYmVlbiBvYnNlcnZlZCB0byBwaWxlXG4gICAgICAgICAqIGludG8gdGhlIGNvbnNvbGUsIHN0cmFpbiB0aGUgQ1BVLlxuICAgICAgICAgKi9cbiAgICAgICAgaWYgKCFvbGRDYW52YXMpXG4gICAgICAgICAgICByZXR1cm4gb2xkQ2FudmFzO1xuXG4gICAgICAgIC8vY3JlYXRlIGEgbmV3IGNhbnZhc1xuICAgICAgICB2YXIgbmV3Q2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgIHZhciBjb250ZXh0ID0gbmV3Q2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbiAgICAgICAgLy9zZXQgZGltZW5zaW9uc1xuICAgICAgICBuZXdDYW52YXMud2lkdGggPSBvbGRDYW52YXMud2lkdGg7XG4gICAgICAgIG5ld0NhbnZhcy5oZWlnaHQgPSBvbGRDYW52YXMuaGVpZ2h0O1xuXG4gICAgICAgIC8vYXBwbHkgdGhlIG9sZCBjYW52YXMgdG8gdGhlIG5ldyBvbmVcbiAgICAgICAgY29udGV4dC5kcmF3SW1hZ2Uob2xkQ2FudmFzLCAwLCAwKTtcblxuICAgICAgICAvL3JldHVybiB0aGUgbmV3IGNhbnZhc1xuICAgICAgICByZXR1cm4gbmV3Q2FudmFzO1xuICAgIH07XG5cbiAgICByZXR1cm4gbXk7XG59KShDYW52YXNVdGlsIHx8IHt9KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYW52YXNVdGlsO1xuIiwiLyogZ2xvYmFsICQsIFV0aWwsIGNvbm5lY3Rpb24sIG5pY2tuYW1lOnRydWUsIGdldFZpZGVvU2l6ZSwgZ2V0VmlkZW9Qb3NpdGlvbiwgc2hvd1Rvb2xiYXIsIHByb2Nlc3NSZXBsYWNlbWVudHMgKi9cbnZhciBSZXBsYWNlbWVudCA9IHJlcXVpcmUoXCIuL1JlcGxhY2VtZW50LmpzXCIpO1xudmFyIGRlcCA9IHtcbiAgICBcIlZpZGVvTGF5b3V0XCI6IGZ1bmN0aW9uKCl7IHJldHVybiByZXF1aXJlKFwiLi4vVmlkZW9MYXlvdXRcIil9LFxuICAgIFwiVG9vbGJhclwiOiBmdW5jdGlvbigpe3JldHVybiByZXF1aXJlKFwiLi4vdG9vbGJhcnMvVG9vbGJhclwiKX0sXG4gICAgXCJVSUFjdGl2YXRvclwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiByZXF1aXJlKFwiLi4vVUlBY3RpdmF0b3JcIik7XG4gICAgfVxufTtcbi8qKlxuICogQ2hhdCByZWxhdGVkIHVzZXIgaW50ZXJmYWNlLlxuICovXG52YXIgQ2hhdCA9IChmdW5jdGlvbiAobXkpIHtcbiAgICB2YXIgbm90aWZpY2F0aW9uSW50ZXJ2YWwgPSBmYWxzZTtcbiAgICB2YXIgdW5yZWFkTWVzc2FnZXMgPSAwO1xuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgY2hhdCByZWxhdGVkIGludGVyZmFjZS5cbiAgICAgKi9cbiAgICBteS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc3RvcmVkRGlzcGxheU5hbWUgPSB3aW5kb3cubG9jYWxTdG9yYWdlLmRpc3BsYXluYW1lO1xuICAgICAgICB2YXIgbmlja25hbWUgPSBudWxsO1xuICAgICAgICBpZiAoc3RvcmVkRGlzcGxheU5hbWUpIHtcbiAgICAgICAgICAgIGRlcC5VSUFjdGl2YXRvcigpLmdldFVJU2VydmljZSgpLnNldE5pY2tuYW1lKHN0b3JlZERpc3BsYXlOYW1lKTtcbiAgICAgICAgICAgIG5pY2tuYW1lID0gc3RvcmVkRGlzcGxheU5hbWU7XG4gICAgICAgICAgICBDaGF0LnNldENoYXRDb252ZXJzYXRpb25Nb2RlKHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgJCgnI25pY2tpbnB1dCcpLmtleWRvd24oZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHZhciB2YWwgPSBVdGlsLmVzY2FwZUh0bWwodGhpcy52YWx1ZSk7XG4gICAgICAgICAgICAgICAgdGhpcy52YWx1ZSA9ICcnO1xuICAgICAgICAgICAgICAgIGlmICghZGVwLlVJQWN0aXZhdG9yKCkuZ2V0VUlTZXJ2aWNlKCkuZ2V0Tmlja25hbWUoKSkge1xuICAgICAgICAgICAgICAgICAgICBkZXAuVUlBY3RpdmF0b3IoKS5nZXRVSVNlcnZpY2UoKS5zZXROaWNrbmFtZSh2YWwpO1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLmRpc3BsYXluYW1lID0gdmFsO1xuICAgICAgICAgICAgICAgICAgICAvL3RoaXMgc2hvdWxkIGJlIGNoYW5nZWRcbiAgICAgICAgICAgICAgICAgICAgWE1QUEFjdGl2YXRvci5hZGRUb1ByZXNlbmNlKFwiZGlzcGxheU5hbWVcIiwgdmFsKTtcbiAgICAgICAgICAgICAgICAgICAgQ2hhdC5zZXRDaGF0Q29udmVyc2F0aW9uTW9kZSh0cnVlKTtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkKCcjdXNlcm1zZycpLmtleWRvd24oZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IHRoaXMudmFsdWU7XG4gICAgICAgICAgICAgICAgJCgnI3VzZXJtc2cnKS52YWwoJycpLnRyaWdnZXIoJ2F1dG9zaXplLnJlc2l6ZScpO1xuICAgICAgICAgICAgICAgIHRoaXMuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICB2YXIgY29tbWFuZCA9IG5ldyBDb21tYW5kc1Byb2Nlc3Nvcih2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYoY29tbWFuZC5pc0NvbW1hbmQoKSlcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmQucHJvY2Vzc0NvbW1hbmQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgLy90aGlzIHNob3VsZCBiZSBjaGFuZ2VkXG4gICAgICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlID0gVXRpbC5lc2NhcGVIdG1sKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgWE1QUEFjdGl2YXRvci5zZW5kTWVzc2FnZShtZXNzYWdlLCBkZXAuVUlBY3RpdmF0b3IoKS5nZXRVSVNlcnZpY2UoKS5nZXROaWNrbmFtZSgpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBvblRleHRBcmVhUmVzaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmVzaXplQ2hhdENvbnZlcnNhdGlvbigpO1xuICAgICAgICAgICAgc2Nyb2xsQ2hhdFRvQm90dG9tKCk7XG4gICAgICAgIH07XG4gICAgICAgICQoJyN1c2VybXNnJykuYXV0b3NpemUoe2NhbGxiYWNrOiBvblRleHRBcmVhUmVzaXplfSk7XG5cbiAgICAgICAgJChcIiNjaGF0c3BhY2VcIikuYmluZChcInNob3duXCIsXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2Nyb2xsQ2hhdFRvQm90dG9tKCk7XG4gICAgICAgICAgICAgICAgdW5yZWFkTWVzc2FnZXMgPSAwO1xuICAgICAgICAgICAgICAgIHNldFZpc3VhbE5vdGlmaWNhdGlvbihmYWxzZSk7XG4gICAgICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQXBwZW5kcyB0aGUgZ2l2ZW4gbWVzc2FnZSB0byB0aGUgY2hhdCBjb252ZXJzYXRpb24uXG4gICAgICovXG4gICAgbXkudXBkYXRlQ2hhdENvbnZlcnNhdGlvbiA9IGZ1bmN0aW9uIChmcm9tLCBkaXNwbGF5TmFtZSwgbWVzc2FnZSkge1xuICAgICAgICB2YXIgZGl2Q2xhc3NOYW1lID0gJyc7XG5cbiAgICAgICAgaWYgKFhNUFBBY3RpdmF0b3IuZ2V0TXlKSUQoKSA9PT0gZnJvbSkge1xuICAgICAgICAgICAgZGl2Q2xhc3NOYW1lID0gXCJsb2NhbHVzZXJcIjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGRpdkNsYXNzTmFtZSA9IFwicmVtb3RldXNlclwiO1xuXG4gICAgICAgICAgICBpZiAoIUNoYXQuaXNWaXNpYmxlKCkpIHtcbiAgICAgICAgICAgICAgICB1bnJlYWRNZXNzYWdlcysrO1xuICAgICAgICAgICAgICAgIFV0aWwucGxheVNvdW5kTm90aWZpY2F0aW9uKCdjaGF0Tm90aWZpY2F0aW9uJyk7XG4gICAgICAgICAgICAgICAgc2V0VmlzdWFsTm90aWZpY2F0aW9uKHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy9yZXBsYWNlIGxpbmtzIGFuZCBzbWlsZXlzXG4gICAgICAgIHZhciBlc2NNZXNzYWdlID0gVXRpbC5lc2NhcGVIdG1sKG1lc3NhZ2UpO1xuICAgICAgICB2YXIgZXNjRGlzcGxheU5hbWUgPSBVdGlsLmVzY2FwZUh0bWwoZGlzcGxheU5hbWUpO1xuICAgICAgICBtZXNzYWdlID0gUmVwbGFjZW1lbnQucHJvY2Vzc1JlcGxhY2VtZW50cyhlc2NNZXNzYWdlKTtcblxuICAgICAgICAkKCcjY2hhdGNvbnZlcnNhdGlvbicpLmFwcGVuZCgnPGRpdiBjbGFzcz1cIicgKyBkaXZDbGFzc05hbWUgKyAnXCI+PGI+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVzY0Rpc3BsYXlOYW1lICsgJzogPC9iPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICsgJzwvZGl2PicpO1xuICAgICAgICAkKCcjY2hhdGNvbnZlcnNhdGlvbicpLmFuaW1hdGUoXG4gICAgICAgICAgICAgICAgeyBzY3JvbGxUb3A6ICQoJyNjaGF0Y29udmVyc2F0aW9uJylbMF0uc2Nyb2xsSGVpZ2h0fSwgMTAwMCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFwcGVuZHMgZXJyb3IgbWVzc2FnZSB0byB0aGUgY29udmVyc2F0aW9uXG4gICAgICogQHBhcmFtIGVycm9yTWVzc2FnZSB0aGUgcmVjZWl2ZWQgZXJyb3IgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0gb3JpZ2luYWxUZXh0IHRoZSBvcmlnaW5hbCBtZXNzYWdlLlxuICAgICAqL1xuICAgIG15LmNoYXRBZGRFcnJvciA9IGZ1bmN0aW9uKGVycm9yTWVzc2FnZSwgb3JpZ2luYWxUZXh0KVxuICAgIHtcbiAgICAgICAgZXJyb3JNZXNzYWdlID0gVXRpbC5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSk7XG4gICAgICAgIG9yaWdpbmFsVGV4dCA9IFV0aWwuZXNjYXBlSHRtbChvcmlnaW5hbFRleHQpO1xuXG4gICAgICAgICQoJyNjaGF0Y29udmVyc2F0aW9uJykuYXBwZW5kKCc8ZGl2IGNsYXNzPVwiZXJyb3JNZXNzYWdlXCI+PGI+RXJyb3I6IDwvYj4nXG4gICAgICAgICAgICArICdZb3VyIG1lc3NhZ2UnICsgKG9yaWdpbmFsVGV4dD8gKCcgXFxcIicrIG9yaWdpbmFsVGV4dCArICdcXFwiJykgOiBcIlwiKVxuICAgICAgICAgICAgKyAnIHdhcyBub3Qgc2VudC4nICsgKGVycm9yTWVzc2FnZT8gKCcgUmVhc29uOiAnICsgZXJyb3JNZXNzYWdlKSA6ICcnKVxuICAgICAgICAgICAgKyAgJzwvZGl2PicpO1xuICAgICAgICAkKCcjY2hhdGNvbnZlcnNhdGlvbicpLmFuaW1hdGUoXG4gICAgICAgICAgICB7IHNjcm9sbFRvcDogJCgnI2NoYXRjb252ZXJzYXRpb24nKVswXS5zY3JvbGxIZWlnaHR9LCAxMDAwKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgc3ViamVjdCB0byB0aGUgVUlcbiAgICAgKiBAcGFyYW0gc3ViamVjdCB0aGUgc3ViamVjdFxuICAgICAqL1xuICAgIG15LmNoYXRTZXRTdWJqZWN0ID0gZnVuY3Rpb24oc3ViamVjdClcbiAgICB7XG4gICAgICAgIGlmKHN1YmplY3QpXG4gICAgICAgICAgICBzdWJqZWN0ID0gc3ViamVjdC50cmltKCk7XG4gICAgICAgICQoJyNzdWJqZWN0JykuaHRtbChSZXBsYWNlbWVudC5saW5raWZ5KFV0aWwuZXNjYXBlSHRtbChzdWJqZWN0KSkpO1xuICAgICAgICBpZihzdWJqZWN0ID09IFwiXCIpXG4gICAgICAgIHtcbiAgICAgICAgICAgICQoXCIjc3ViamVjdFwiKS5jc3Moe2Rpc3BsYXk6IFwibm9uZVwifSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZVxuICAgICAgICB7XG4gICAgICAgICAgICAkKFwiI3N1YmplY3RcIikuY3NzKHtkaXNwbGF5OiBcImJsb2NrXCJ9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBPcGVucyAvIGNsb3NlcyB0aGUgY2hhdCBhcmVhLlxuICAgICAqL1xuICAgIG15LnRvZ2dsZUNoYXQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgdmFyIGNoYXRzcGFjZSA9ICQoJyNjaGF0c3BhY2UnKTtcblxuICAgICAgICB2YXIgY2hhdFNpemUgPSAoY2hhdHNwYWNlLmlzKFwiOnZpc2libGVcIikpID8gWzAsIDBdIDogQ2hhdC5nZXRDaGF0U2l6ZSgpO1xuICAgICAgICBkZXAuVmlkZW9MYXlvdXQoKS5yZXNpemVWaWRlb1NwYWNlKGNoYXRzcGFjZSwgY2hhdFNpemUsIGNoYXRzcGFjZS5pcyhcIjp2aXNpYmxlXCIpKTtcblxuICAgICAgICAvLyBGaXggbWU6IFNob3VsZCBiZSBjYWxsZWQgYXMgY2FsbGJhY2sgb2Ygc2hvdyBhbmltYXRpb25cblxuICAgICAgICAvLyBSZXF1ZXN0IHRoZSBmb2N1cyBpbiB0aGUgbmlja25hbWUgZmllbGQgb3IgdGhlIGNoYXQgaW5wdXQgZmllbGQuXG4gICAgICAgIGlmICgkKCcjbmlja25hbWUnKS5jc3MoJ3Zpc2liaWxpdHknKSA9PT0gJ3Zpc2libGUnKSB7XG4gICAgICAgICAgICAkKCcjbmlja2lucHV0JykuZm9jdXMoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJyN1c2VybXNnJykuZm9jdXMoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBjaGF0IGNvbnZlcnNhdGlvbiBtb2RlLlxuICAgICAqL1xuICAgIG15LnNldENoYXRDb252ZXJzYXRpb25Nb2RlID0gZnVuY3Rpb24gKGlzQ29udmVyc2F0aW9uTW9kZSkge1xuICAgICAgICBpZiAoaXNDb252ZXJzYXRpb25Nb2RlKSB7XG4gICAgICAgICAgICAkKCcjbmlja25hbWUnKS5jc3Moe3Zpc2liaWxpdHk6ICdoaWRkZW4nfSk7XG4gICAgICAgICAgICAkKCcjY2hhdGNvbnZlcnNhdGlvbicpLmNzcyh7dmlzaWJpbGl0eTogJ3Zpc2libGUnfSk7XG4gICAgICAgICAgICAkKCcjdXNlcm1zZycpLmNzcyh7dmlzaWJpbGl0eTogJ3Zpc2libGUnfSk7XG4gICAgICAgICAgICAkKCcjdXNlcm1zZycpLmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVzaXplcyB0aGUgY2hhdCBhcmVhLlxuICAgICAqL1xuICAgIG15LnJlc2l6ZUNoYXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjaGF0U2l6ZSA9IENoYXQuZ2V0Q2hhdFNpemUoKTtcblxuICAgICAgICAkKCcjY2hhdHNwYWNlJykud2lkdGgoY2hhdFNpemVbMF0pO1xuICAgICAgICAkKCcjY2hhdHNwYWNlJykuaGVpZ2h0KGNoYXRTaXplWzFdKTtcblxuICAgICAgICByZXNpemVDaGF0Q29udmVyc2F0aW9uKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHNpemUgb2YgdGhlIGNoYXQuXG4gICAgICovXG4gICAgbXkuZ2V0Q2hhdFNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBhdmFpbGFibGVIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIHZhciBhdmFpbGFibGVXaWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoO1xuXG4gICAgICAgIHZhciBjaGF0V2lkdGggPSAyMDA7XG4gICAgICAgIGlmIChhdmFpbGFibGVXaWR0aCAqIDAuMiA8IDIwMClcbiAgICAgICAgICAgIGNoYXRXaWR0aCA9IGF2YWlsYWJsZVdpZHRoICogMC4yO1xuXG4gICAgICAgIHJldHVybiBbY2hhdFdpZHRoLCBhdmFpbGFibGVIZWlnaHRdO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBJbmRpY2F0ZXMgaWYgdGhlIGNoYXQgaXMgY3VycmVudGx5IHZpc2libGUuXG4gICAgICovXG4gICAgbXkuaXNWaXNpYmxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJCgnI2NoYXRzcGFjZScpLmlzKFwiOnZpc2libGVcIik7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlc2l6ZXMgdGhlIGNoYXQgY29udmVyc2F0aW9uLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJlc2l6ZUNoYXRDb252ZXJzYXRpb24oKSB7XG4gICAgICAgIHZhciB1c2VybXNnU3R5bGVIZWlnaHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInVzZXJtc2dcIikuc3R5bGUuaGVpZ2h0O1xuICAgICAgICB2YXIgdXNlcm1zZ0hlaWdodCA9IHVzZXJtc2dTdHlsZUhlaWdodFxuICAgICAgICAgICAgLnN1YnN0cmluZygwLCB1c2VybXNnU3R5bGVIZWlnaHQuaW5kZXhPZigncHgnKSk7XG5cbiAgICAgICAgJCgnI3VzZXJtc2cnKS53aWR0aCgkKCcjY2hhdHNwYWNlJykud2lkdGgoKSAtIDEwKTtcbiAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKS53aWR0aCgkKCcjY2hhdHNwYWNlJykud2lkdGgoKSAtIDEwKTtcbiAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKVxuICAgICAgICAgICAgLmhlaWdodCh3aW5kb3cuaW5uZXJIZWlnaHQgLSAxMCAtIHBhcnNlSW50KHVzZXJtc2dIZWlnaHQpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTaG93cy9oaWRlcyBhIHZpc3VhbCBub3RpZmljYXRpb24sIGluZGljYXRpbmcgdGhhdCBhIG1lc3NhZ2UgaGFzIGFycml2ZWQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2V0VmlzdWFsTm90aWZpY2F0aW9uKHNob3cpIHtcbiAgICAgICAgdmFyIHVucmVhZE1zZ0VsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndW5yZWFkTWVzc2FnZXMnKTtcblxuICAgICAgICB2YXIgZ2xvd2VyID0gJCgnI2NoYXRCdXR0b24nKTtcblxuICAgICAgICBpZiAodW5yZWFkTWVzc2FnZXMpIHtcbiAgICAgICAgICAgIHVucmVhZE1zZ0VsZW1lbnQuaW5uZXJIVE1MID0gdW5yZWFkTWVzc2FnZXMudG9TdHJpbmcoKTtcblxuICAgICAgICAgICAgZGVwLlRvb2xiYXIoKS5kb2NrVG9vbGJhcih0cnVlKTtcblxuICAgICAgICAgICAgdmFyIGNoYXRCdXR0b25FbGVtZW50XG4gICAgICAgICAgICAgICAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hhdEJ1dHRvbicpLnBhcmVudE5vZGU7XG4gICAgICAgICAgICB2YXIgbGVmdEluZGVudCA9IChVdGlsLmdldFRleHRXaWR0aChjaGF0QnV0dG9uRWxlbWVudCkgLVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVXRpbC5nZXRUZXh0V2lkdGgodW5yZWFkTXNnRWxlbWVudCkpIC8gMjtcbiAgICAgICAgICAgIHZhciB0b3BJbmRlbnQgPSAoVXRpbC5nZXRUZXh0SGVpZ2h0KGNoYXRCdXR0b25FbGVtZW50KSAtXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFV0aWwuZ2V0VGV4dEhlaWdodCh1bnJlYWRNc2dFbGVtZW50KSkgLyAyIC0gMztcblxuICAgICAgICAgICAgdW5yZWFkTXNnRWxlbWVudC5zZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgICAgICAgICdzdHlsZScsXG4gICAgICAgICAgICAgICAgICAgICd0b3A6JyArIHRvcEluZGVudCArXG4gICAgICAgICAgICAgICAgICAgICc7IGxlZnQ6JyArIGxlZnRJbmRlbnQgKyAnOycpO1xuXG4gICAgICAgICAgICBpZiAoIWdsb3dlci5oYXNDbGFzcygnaWNvbi1jaGF0LXNpbXBsZScpKSB7XG4gICAgICAgICAgICAgICAgZ2xvd2VyLnJlbW92ZUNsYXNzKCdpY29uLWNoYXQnKTtcbiAgICAgICAgICAgICAgICBnbG93ZXIuYWRkQ2xhc3MoJ2ljb24tY2hhdC1zaW1wbGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHVucmVhZE1zZ0VsZW1lbnQuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgICAgICBnbG93ZXIucmVtb3ZlQ2xhc3MoJ2ljb24tY2hhdC1zaW1wbGUnKTtcbiAgICAgICAgICAgIGdsb3dlci5hZGRDbGFzcygnaWNvbi1jaGF0Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc2hvdyAmJiAhbm90aWZpY2F0aW9uSW50ZXJ2YWwpIHtcbiAgICAgICAgICAgIG5vdGlmaWNhdGlvbkludGVydmFsID0gd2luZG93LnNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBnbG93ZXIudG9nZ2xlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfSwgODAwKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghc2hvdyAmJiBub3RpZmljYXRpb25JbnRlcnZhbCkge1xuICAgICAgICAgICAgd2luZG93LmNsZWFySW50ZXJ2YWwobm90aWZpY2F0aW9uSW50ZXJ2YWwpO1xuICAgICAgICAgICAgbm90aWZpY2F0aW9uSW50ZXJ2YWwgPSBmYWxzZTtcbiAgICAgICAgICAgIGdsb3dlci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTY3JvbGxzIGNoYXQgdG8gdGhlIGJvdHRvbS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzY3JvbGxDaGF0VG9Cb3R0b20oKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKS5zY3JvbGxUb3AoXG4gICAgICAgICAgICAgICAgICAgICQoJyNjaGF0Y29udmVyc2F0aW9uJylbMF0uc2Nyb2xsSGVpZ2h0KTtcbiAgICAgICAgfSwgNSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG15O1xufShDaGF0IHx8IHt9KSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2hhdDtcbiIsIlxudmFyIFJlcGxhY2VtZW50ID0gZnVuY3Rpb24oKVxue1xuICAgIC8qKlxuICAgICAqIFJlcGxhY2VzIGNvbW1vbiBzbWlsZXkgc3RyaW5ncyB3aXRoIGltYWdlc1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNtaWxpZnkoYm9keSlcbiAgICB7XG4gICAgICAgIGlmKCFib2R5KVxuICAgICAgICAgICAgcmV0dXJuIGJvZHk7XG5cbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKDpcXCh8OlxcKFxcKHw6LVxcKFxcKHw6LVxcKHxcXChzYWRcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTErIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKGFuZ3J5XFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkyKyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChuXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkzKyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyg6LVxcKVxcKXw6XFwpXFwpfDstXFwpXFwpfDtcXClcXCl8XFwobG9sXFwpfDotRHw6RHw7LUR8O0QpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTQrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKDstXFwoXFwofDtcXChcXCh8Oy1cXCh8O1xcKHw6J1xcKHw6Jy1cXCh8On4tXFwofDp+XFwofFxcKHVwc2V0XFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXk1KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyg8M3wmbHQ7M3xcXChMXFwpfFxcKGxcXCl8XFwoSFxcKXxcXChoXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXk2KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChhbmdlbFxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5NysgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoYm9tYlxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5OCsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoY2h1Y2tsZVxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5OSsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoeVxcKXxcXChZXFwpfFxcKG9rXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxMCsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oOy1cXCl8O1xcKXw6LVxcKXw6XFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxMSsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoYmx1c2hcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTEyKyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyg6LVxcKnw6XFwqfFxcKGtpc3NcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTEzKyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChzZWFyY2hcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTE0KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXCh3YXZlXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxNSsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoY2xhcFxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MTYrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKHNpY2tcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTE3KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyg6LVB8OlB8Oi1wfDpwKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxOCsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oOi1cXDB8XFwoc2hvY2tlZFxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MTkrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKG9vcHNcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTIwKyBcIj5cIik7XG5cbiAgICAgICAgcmV0dXJuIGJvZHk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gUmVwbGFjZW1lbnRQcm90bygpIHtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFByb2Nlc3NlcyBsaW5rcyBhbmQgc21pbGV5cyBpbiBcImJvZHlcIlxuICAgICAqL1xuICAgIFJlcGxhY2VtZW50UHJvdG8ucHJvY2Vzc1JlcGxhY2VtZW50cyA9IGZ1bmN0aW9uKGJvZHkpXG4gICAge1xuICAgICAgICAvL21ha2UgbGlua3MgY2xpY2thYmxlXG4gICAgICAgIGJvZHkgPSBSZXBsYWNlbWVudFByb3RvLmxpbmtpZnkoYm9keSk7XG5cbiAgICAgICAgLy9hZGQgc21pbGV5c1xuICAgICAgICBib2R5ID0gc21pbGlmeShib2R5KTtcblxuICAgICAgICByZXR1cm4gYm9keTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaW5kcyBhbmQgcmVwbGFjZXMgYWxsIGxpbmtzIGluIHRoZSBsaW5rcyBpbiBcImJvZHlcIlxuICAgICAqIHdpdGggdGhlaXIgPGEgaHJlZj1cIlwiPjwvYT5cbiAgICAgKi9cbiAgICBSZXBsYWNlbWVudFByb3RvLmxpbmtpZnkgPSBmdW5jdGlvbihpbnB1dFRleHQpXG4gICAge1xuICAgICAgICB2YXIgcmVwbGFjZWRUZXh0LCByZXBsYWNlUGF0dGVybjEsIHJlcGxhY2VQYXR0ZXJuMiwgcmVwbGFjZVBhdHRlcm4zO1xuXG4gICAgICAgIC8vVVJMcyBzdGFydGluZyB3aXRoIGh0dHA6Ly8sIGh0dHBzOi8vLCBvciBmdHA6Ly9cbiAgICAgICAgcmVwbGFjZVBhdHRlcm4xID0gLyhcXGIoaHR0cHM/fGZ0cCk6XFwvXFwvWy1BLVowLTkrJkAjXFwvJT89fl98ITosLjtdKlstQS1aMC05KyZAI1xcLyU9fl98XSkvZ2ltO1xuICAgICAgICByZXBsYWNlZFRleHQgPSBpbnB1dFRleHQucmVwbGFjZShyZXBsYWNlUGF0dGVybjEsICc8YSBocmVmPVwiJDFcIiB0YXJnZXQ9XCJfYmxhbmtcIj4kMTwvYT4nKTtcblxuICAgICAgICAvL1VSTHMgc3RhcnRpbmcgd2l0aCBcInd3dy5cIiAod2l0aG91dCAvLyBiZWZvcmUgaXQsIG9yIGl0J2QgcmUtbGluayB0aGUgb25lcyBkb25lIGFib3ZlKS5cbiAgICAgICAgcmVwbGFjZVBhdHRlcm4yID0gLyhefFteXFwvXSkod3d3XFwuW1xcU10rKFxcYnwkKSkvZ2ltO1xuICAgICAgICByZXBsYWNlZFRleHQgPSByZXBsYWNlZFRleHQucmVwbGFjZShyZXBsYWNlUGF0dGVybjIsICckMTxhIGhyZWY9XCJodHRwOi8vJDJcIiB0YXJnZXQ9XCJfYmxhbmtcIj4kMjwvYT4nKTtcblxuICAgICAgICAvL0NoYW5nZSBlbWFpbCBhZGRyZXNzZXMgdG8gbWFpbHRvOjogbGlua3MuXG4gICAgICAgIHJlcGxhY2VQYXR0ZXJuMyA9IC8oKFthLXpBLVowLTlcXC1cXF9cXC5dKStAW2EtekEtWlxcX10rPyhcXC5bYS16QS1aXXsyLDZ9KSspL2dpbTtcbiAgICAgICAgcmVwbGFjZWRUZXh0ID0gcmVwbGFjZWRUZXh0LnJlcGxhY2UocmVwbGFjZVBhdHRlcm4zLCAnPGEgaHJlZj1cIm1haWx0bzokMVwiPiQxPC9hPicpO1xuXG4gICAgICAgIHJldHVybiByZXBsYWNlZFRleHQ7XG4gICAgfVxuICAgIHJldHVybiBSZXBsYWNlbWVudFByb3RvO1xufSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlcGxhY2VtZW50O1xuXG5cblxuIiwiLyogZ2xvYmFsICQsIGNvbmZpZywgUHJlemksIFV0aWwsIGNvbm5lY3Rpb24sIHNldExhcmdlVmlkZW9WaXNpYmxlLCBkb2NrVG9vbGJhciAqL1xudmFyIFByZXppID0gcmVxdWlyZShcIi4uL3ByZXppL1ByZXppLmpzXCIpO1xudmFyIFVJVXRpbCA9IHJlcXVpcmUoXCIuLi9VSVV0aWwuanNcIik7XG52YXIgVG9vbGJhclRvZ2dsZXIgPSByZXF1aXJlKFwiLi4vdG9vbGJhcnMvdG9vbGJhcl90b2dnbGVyXCIpO1xuXG52YXIgRXRoZXJwYWQgPSAoZnVuY3Rpb24gKG15KSB7XG4gICAgdmFyIGV0aGVycGFkTmFtZSA9IG51bGw7XG4gICAgdmFyIGV0aGVycGFkSUZyYW1lID0gbnVsbDtcbiAgICB2YXIgZG9tYWluID0gbnVsbDtcbiAgICB2YXIgb3B0aW9ucyA9IFwiP3Nob3dDb250cm9scz10cnVlJnNob3dDaGF0PWZhbHNlJnNob3dMaW5lTnVtYmVycz10cnVlJnVzZU1vbm9zcGFjZUZvbnQ9ZmFsc2VcIjtcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBldGhlcnBhZC5cbiAgICAgKi9cbiAgICBteS5pbml0ID0gZnVuY3Rpb24gKG5hbWUpIHtcblxuICAgICAgICBpZiAoY29uZmlnLmV0aGVycGFkX2Jhc2UgJiYgIWV0aGVycGFkTmFtZSkge1xuXG4gICAgICAgICAgICBkb21haW4gPSBjb25maWcuZXRoZXJwYWRfYmFzZTtcblxuICAgICAgICAgICAgaWYgKCFuYW1lKSB7XG4gICAgICAgICAgICAgICAgLy8gSW4gY2FzZSB3ZSdyZSB0aGUgZm9jdXMgd2UgZ2VuZXJhdGUgdGhlIG5hbWUuXG4gICAgICAgICAgICAgICAgZXRoZXJwYWROYW1lID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ18nICsgKG5ldyBEYXRlKCkuZ2V0VGltZSgpKS50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgIHNoYXJlRXRoZXJwYWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBldGhlcnBhZE5hbWUgPSBuYW1lO1xuXG4gICAgICAgICAgICBlbmFibGVFdGhlcnBhZEJ1dHRvbigpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIE9wZW5zL2hpZGVzIHRoZSBFdGhlcnBhZC5cbiAgICAgKi9cbiAgICBteS50b2dnbGVFdGhlcnBhZCA9IGZ1bmN0aW9uIChpc1ByZXNlbnRhdGlvbikge1xuICAgICAgICBpZiAoIWV0aGVycGFkSUZyYW1lKVxuICAgICAgICAgICAgY3JlYXRlSUZyYW1lKCk7XG5cbiAgICAgICAgdmFyIGxhcmdlVmlkZW8gPSBudWxsO1xuICAgICAgICBpZiAoUHJlemkuaXNQcmVzZW50YXRpb25WaXNpYmxlKCkpXG4gICAgICAgICAgICBsYXJnZVZpZGVvID0gJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgbGFyZ2VWaWRlbyA9ICQoJyNsYXJnZVZpZGVvJyk7XG5cbiAgICAgICAgaWYgKCQoJyNldGhlcnBhZD5pZnJhbWUnKS5jc3MoJ3Zpc2liaWxpdHknKSA9PT0gJ2hpZGRlbicpIHtcbiAgICAgICAgICAgIGxhcmdlVmlkZW8uZmFkZU91dCgzMDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoUHJlemkuaXNQcmVzZW50YXRpb25WaXNpYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGFyZ2VWaWRlby5jc3Moe29wYWNpdHk6ICcwJ30pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNldExhcmdlVmlkZW9WaXNpYmxlKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgVG9vbGJhclRvZ2dsZXIuZG9ja1Rvb2xiYXIodHJ1ZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJCgnI2V0aGVycGFkPmlmcmFtZScpLmZhZGVJbigzMDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5iYWNrZ3JvdW5kID0gJyNlZWVlZWUnO1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXRoZXJwYWQ+aWZyYW1lJykuY3NzKHt2aXNpYmlsaXR5OiAndmlzaWJsZSd9KTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V0aGVycGFkJykuY3NzKHt6SW5kZXg6IDJ9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCQoJyNldGhlcnBhZD5pZnJhbWUnKSkge1xuICAgICAgICAgICAgJCgnI2V0aGVycGFkPmlmcmFtZScpLmZhZGVPdXQoMzAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgJCgnI2V0aGVycGFkPmlmcmFtZScpLmNzcyh7dmlzaWJpbGl0eTogJ2hpZGRlbid9KTtcbiAgICAgICAgICAgICAgICAkKCcjZXRoZXJwYWQnKS5jc3Moe3pJbmRleDogMH0pO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuc3R5bGUuYmFja2dyb3VuZCA9ICdibGFjayc7XG4gICAgICAgICAgICAgICAgaWYgKCFpc1ByZXNlbnRhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAkKCcjbGFyZ2VWaWRlbycpLmZhZGVJbigzMDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNldExhcmdlVmlkZW9WaXNpYmxlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgVG9vbGJhclRvZ2dsZXIuZG9ja1Rvb2xiYXIoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXNpemUoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVzaXplcyB0aGUgZXRoZXJwYWQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVzaXplKCkge1xuICAgICAgICBpZiAoJCgnI2V0aGVycGFkPmlmcmFtZScpLmxlbmd0aCkge1xuICAgICAgICAgICAgdmFyIHJlbW90ZVZpZGVvcyA9ICQoJyNyZW1vdGVWaWRlb3MnKTtcbiAgICAgICAgICAgIHZhciBhdmFpbGFibGVIZWlnaHRcbiAgICAgICAgICAgICAgICA9IHdpbmRvdy5pbm5lckhlaWdodCAtIHJlbW90ZVZpZGVvcy5vdXRlckhlaWdodCgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coVUlVdGlsKTtcbiAgICAgICAgICAgIHZhciBhdmFpbGFibGVXaWR0aCA9IFVJVXRpbC5nZXRBdmFpbGFibGVWaWRlb1dpZHRoKCk7XG5cbiAgICAgICAgICAgICQoJyNldGhlcnBhZD5pZnJhbWUnKS53aWR0aChhdmFpbGFibGVXaWR0aCk7XG4gICAgICAgICAgICAkKCcjZXRoZXJwYWQ+aWZyYW1lJykuaGVpZ2h0KGF2YWlsYWJsZUhlaWdodCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTaGFyZXMgdGhlIEV0aGVycGFkIG5hbWUgd2l0aCBvdGhlciBwYXJ0aWNpcGFudHMuXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2hhcmVFdGhlcnBhZCgpIHtcbiAgICAgICAgWE1QUEFjdGl2YXRvci5hZGRUb1ByZXNlbmNlKFwiZXRoZXJwYWRcIiwgZXRoZXJwYWROYW1lKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIHRoZSBFdGhlcnBhZCBidXR0b24gYW5kIGFkZHMgaXQgdG8gdGhlIHRvb2xiYXIuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZW5hYmxlRXRoZXJwYWRCdXR0b24oKSB7XG4gICAgICAgIGlmICghJCgnI2V0aGVycGFkQnV0dG9uJykuaXMoXCI6dmlzaWJsZVwiKSlcbiAgICAgICAgICAgICQoJyNldGhlcnBhZEJ1dHRvbicpLmNzcyh7ZGlzcGxheTogJ2lubGluZS1ibG9jayd9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIHRoZSBJRnJhbWUgZm9yIHRoZSBldGhlcnBhZC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVJRnJhbWUoKSB7XG4gICAgICAgIGV0aGVycGFkSUZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG4gICAgICAgIGV0aGVycGFkSUZyYW1lLnNyYyA9IGRvbWFpbiArIGV0aGVycGFkTmFtZSArIG9wdGlvbnM7XG4gICAgICAgIGV0aGVycGFkSUZyYW1lLmZyYW1lQm9yZGVyID0gMDtcbiAgICAgICAgZXRoZXJwYWRJRnJhbWUuc2Nyb2xsaW5nID0gXCJub1wiO1xuICAgICAgICBldGhlcnBhZElGcmFtZS53aWR0aCA9ICQoJyNsYXJnZVZpZGVvQ29udGFpbmVyJykud2lkdGgoKSB8fCA2NDA7XG4gICAgICAgIGV0aGVycGFkSUZyYW1lLmhlaWdodCA9ICQoJyNsYXJnZVZpZGVvQ29udGFpbmVyJykuaGVpZ2h0KCkgfHwgNDgwO1xuICAgICAgICBldGhlcnBhZElGcmFtZS5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ3Zpc2liaWxpdHk6IGhpZGRlbjsnKTtcblxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZXRoZXJwYWQnKS5hcHBlbmRDaGlsZChldGhlcnBhZElGcmFtZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogT24gRXRoZXJwYWQgYWRkZWQgdG8gbXVjLlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ2V0aGVycGFkYWRkZWQubXVjJywgZnVuY3Rpb24gKGV2ZW50LCBqaWQsIGV0aGVycGFkTmFtZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkV0aGVycGFkIGFkZGVkXCIsIGV0aGVycGFkTmFtZSk7XG4gICAgICAgIGlmIChjb25maWcuZXRoZXJwYWRfYmFzZSAmJiAhWE1QUEFjdGl2YXRvci5pc0ZvY3VzKCkpIHtcbiAgICAgICAgICAgIEV0aGVycGFkLmluaXQoZXRoZXJwYWROYW1lKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogT24gZm9jdXMgY2hhbmdlZCBldmVudC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdmb2N1c2VjaGFuZ2VkLm11YycsIGZ1bmN0aW9uIChldmVudCwgZm9jdXMpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJGb2N1cyBjaGFuZ2VkXCIpO1xuICAgICAgICBpZiAoY29uZmlnLmV0aGVycGFkX2Jhc2UpXG4gICAgICAgICAgICBzaGFyZUV0aGVycGFkKCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBPbiB2aWRlbyBzZWxlY3RlZCBldmVudC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCd2aWRlby5zZWxlY3RlZCcsIGZ1bmN0aW9uIChldmVudCwgaXNQcmVzZW50YXRpb24pIHtcbiAgICAgICAgaWYgKCFjb25maWcuZXRoZXJwYWRfYmFzZSlcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBpZiAoZXRoZXJwYWRJRnJhbWUgJiYgZXRoZXJwYWRJRnJhbWUuc3R5bGUudmlzaWJpbGl0eSAhPT0gJ2hpZGRlbicpXG4gICAgICAgICAgICBFdGhlcnBhZC50b2dnbGVFdGhlcnBhZChpc1ByZXNlbnRhdGlvbik7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBSZXNpemVzIHRoZSBldGhlcnBhZCwgd2hlbiB0aGUgd2luZG93IGlzIHJlc2l6ZWQuXG4gICAgICovXG4gICAgJCh3aW5kb3cpLnJlc2l6ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlc2l6ZSgpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG15O1xufShFdGhlcnBhZCB8fCB7fSkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV0aGVycGFkO1xuIiwidmFyIEJvdHRvbVRvb2xiYXIgPSByZXF1aXJlKFwiLi90b29sYmFycy9Cb3R0b21Ub29sYmFyXCIpO1xudmFyIFRvb2xiYXIgPSByZXF1aXJlKFwiLi90b29sYmFycy9Ub29sYmFyXCIpO1xuXG52YXIgS2V5Ym9hcmRTaG9ydGN1dCA9IChmdW5jdGlvbihteSkge1xuICAgIC8vbWFwcyBrZXljb2RlIHRvIGNoYXJhY3RlciwgaWQgb2YgcG9wb3ZlciBmb3IgZ2l2ZW4gZnVuY3Rpb24gYW5kIGZ1bmN0aW9uXG4gICAgdmFyIHNob3J0Y3V0cyA9IHtcbiAgICAgICAgNjc6IHtcbiAgICAgICAgICAgIGNoYXJhY3RlcjogXCJDXCIsXG4gICAgICAgICAgICBpZDogXCJ0b2dnbGVDaGF0UG9wb3ZlclwiLFxuICAgICAgICAgICAgZnVuY3Rpb246IEJvdHRvbVRvb2xiYXIudG9nZ2xlQ2hhdFxuICAgICAgICB9LFxuICAgICAgICA3MDoge1xuICAgICAgICAgICAgY2hhcmFjdGVyOiBcIkZcIixcbiAgICAgICAgICAgIGlkOiBcImZpbG1zdHJpcFBvcG92ZXJcIixcbiAgICAgICAgICAgIGZ1bmN0aW9uOiBCb3R0b21Ub29sYmFyLnRvZ2dsZUZpbG1TdHJpcFxuICAgICAgICB9LFxuICAgICAgICA3Nzoge1xuICAgICAgICAgICAgY2hhcmFjdGVyOiBcIk1cIixcbiAgICAgICAgICAgIGlkOiBcIm11dGVQb3BvdmVyXCIsXG4gICAgICAgICAgICBmdW5jdGlvbjogVG9vbGJhci50b2dnbGVBdWRpb1xuICAgICAgICB9LFxuICAgICAgICA4NDoge1xuICAgICAgICAgICAgY2hhcmFjdGVyOiBcIlRcIixcbiAgICAgICAgICAgIGZ1bmN0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZighUlRDQWN0aXZhdG9yLmdldFJUQ1NlcnZpY2UoKS5sb2NhbEF1ZGlvLmlzTXV0ZWQoKSkge1xuICAgICAgICAgICAgICAgICAgICBUb29sYmFyLnRvZ2dsZUF1ZGlvKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICA4Njoge1xuICAgICAgICAgICAgY2hhcmFjdGVyOiBcIlZcIixcbiAgICAgICAgICAgIGlkOiBcInRvZ2dsZVZpZGVvUG9wb3ZlclwiLFxuICAgICAgICAgICAgZnVuY3Rpb246IFRvb2xiYXIudG9nZ2xlVmlkZW9cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB3aW5kb3cub25rZXl1cCA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYoISgkKFwiOmZvY3VzXCIpLmlzKFwiaW5wdXRbdHlwZT10ZXh0XVwiKSB8fCAkKFwiOmZvY3VzXCIpLmlzKFwidGV4dGFyZWFcIikpKSB7XG4gICAgICAgICAgICB2YXIga2V5Y29kZSA9IGUud2hpY2g7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHNob3J0Y3V0c1trZXljb2RlXSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgIHNob3J0Y3V0c1trZXljb2RlXS5mdW5jdGlvbigpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChrZXljb2RlID49IFwiMFwiLmNoYXJDb2RlQXQoMCkgJiYga2V5Y29kZSA8PSBcIjlcIi5jaGFyQ29kZUF0KDApKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlbW90ZVZpZGVvcyA9ICQoXCIudmlkZW9jb250YWluZXI6bm90KCNtaXhlZHN0cmVhbSlcIiksXG4gICAgICAgICAgICAgICAgICAgIHZpZGVvV2FudGVkID0ga2V5Y29kZSAtIFwiMFwiLmNoYXJDb2RlQXQoMCkgKyAxO1xuICAgICAgICAgICAgICAgIGlmIChyZW1vdGVWaWRlb3MubGVuZ3RoID4gdmlkZW9XYW50ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVtb3RlVmlkZW9zW3ZpZGVvV2FudGVkXS5jbGljaygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB3aW5kb3cub25rZXlkb3duID0gZnVuY3Rpb24oZSkge1xuICAgICAgICBpZigkKFwiI2NoYXRzcGFjZVwiKS5jc3MoXCJkaXNwbGF5XCIpID09PSBcIm5vbmVcIikge1xuICAgICAgICAgICAgaWYoZS53aGljaCA9PT0gXCJUXCIuY2hhckNvZGVBdCgwKSkge1xuICAgICAgICAgICAgICAgIGlmKFJUQ0FjdGl2YXRvci5nZXRSVENTZXJ2aWNlKCkubG9jYWxBdWRpby5pc011dGVkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgVG9vbGJhci50b2dnbGVBdWRpbygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogIFxuICAgICAqIEBwYXJhbSBpZCBpbmRpY2F0ZXMgdGhlIHBvcG92ZXIgYXNzb2NpYXRlZCB3aXRoIHRoZSBzaG9ydGN1dFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IHRoZSBrZXlib2FyZCBzaG9ydGN1dCB1c2VkIGZvciB0aGUgaWQgZ2l2ZW5cbiAgICAgKi9cbiAgICBteS5nZXRTaG9ydGN1dCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIGZvcih2YXIga2V5Y29kZSBpbiBzaG9ydGN1dHMpIHtcbiAgICAgICAgICAgIGlmKHNob3J0Y3V0cy5oYXNPd25Qcm9wZXJ0eShrZXljb2RlKSkge1xuICAgICAgICAgICAgICAgIGlmIChzaG9ydGN1dHNba2V5Y29kZV0uaWQgPT09IGlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIiAoXCIgKyBzaG9ydGN1dHNba2V5Y29kZV0uY2hhcmFjdGVyICsgXCIpXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBcIlwiO1xuICAgIH07XG5cbiAgICBteS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAkKCdib2R5JykucG9wb3Zlcih7IHNlbGVjdG9yOiAnW2RhdGEtdG9nZ2xlPXBvcG92ZXJdJyxcbiAgICAgICAgICAgIHRyaWdnZXI6ICdjbGljayBob3ZlcicsXG4gICAgICAgICAgICBjb250ZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoXCJjb250ZW50XCIpICtcbiAgICAgICAgICAgICAgICAgICAgS2V5Ym9hcmRTaG9ydGN1dC5nZXRTaG9ydGN1dCh0aGlzLmdldEF0dHJpYnV0ZShcInNob3J0Y3V0XCIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBteTtcbn0oS2V5Ym9hcmRTaG9ydGN1dCB8fCB7fSkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEtleWJvYXJkU2hvcnRjdXQ7XG4iLCJ2YXIgUHJlemlQbGF5ZXIgPSByZXF1aXJlKFwiLi9QcmV6aVBsYXllci5qc1wiKTtcbnZhciBVSVV0aWwgPSByZXF1aXJlKFwiLi4vVUlVdGlsLmpzXCIpO1xudmFyIFRvb2xiYXJUb2dnbGVyID0gcmVxdWlyZShcIi4uL3Rvb2xiYXJzL3Rvb2xiYXJfdG9nZ2xlclwiKTtcblxudmFyIFByZXppID0gKGZ1bmN0aW9uIChteSkge1xuICAgIHZhciBwcmV6aVBsYXllciA9IG51bGw7XG5cbiAgICAvKipcbiAgICAgKiBSZWxvYWRzIHRoZSBjdXJyZW50IHByZXNlbnRhdGlvbi5cbiAgICAgKi9cbiAgICBteS5yZWxvYWRQcmVzZW50YXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGlmcmFtZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHByZXppUGxheWVyLm9wdGlvbnMucHJlemlJZCk7XG4gICAgICAgIGlmcmFtZS5zcmMgPSBpZnJhbWUuc3JjO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTaG93cy9oaWRlcyBhIHByZXNlbnRhdGlvbi5cbiAgICAgKi9cbiAgICBteS5zZXRQcmVzZW50YXRpb25WaXNpYmxlID0gZnVuY3Rpb24gKHZpc2libGUpIHtcbiAgICAgICAgaWYgKHZpc2libGUpIHtcbiAgICAgICAgICAgIC8vIFRyaWdnZXIgdGhlIHZpZGVvLnNlbGVjdGVkIGV2ZW50IHRvIGluZGljYXRlIGEgY2hhbmdlIGluIHRoZVxuICAgICAgICAgICAgLy8gbGFyZ2UgdmlkZW8uXG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKFwidmlkZW8uc2VsZWN0ZWRcIiwgW3RydWVdKTtcblxuICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5mYWRlT3V0KDMwMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNldExhcmdlVmlkZW9WaXNpYmxlKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLmZhZGVJbigzMDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLmNzcyh7b3BhY2l0eTonMSd9KTtcbiAgICAgICAgICAgICAgICAgICAgVG9vbGJhclRvZ2dsZXIuZG9ja1Rvb2xiYXIodHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmICgkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLmNzcygnb3BhY2l0eScpID09ICcxJykge1xuICAgICAgICAgICAgICAgICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykuZmFkZU91dCgzMDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS5jc3Moe29wYWNpdHk6JzAnfSk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNyZWxvYWRQcmVzZW50YXRpb24nKS5jc3Moe2Rpc3BsYXk6J25vbmUnfSk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNsYXJnZVZpZGVvJykuZmFkZUluKDMwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zZXRMYXJnZVZpZGVvVmlzaWJsZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFRvb2xiYXJUb2dnbGVyLmRvY2tUb29sYmFyKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyA8dHQ+dHJ1ZTwvdHQ+IGlmIHRoZSBwcmVzZW50YXRpb24gaXMgdmlzaWJsZSwgPHR0PmZhbHNlPC90dD4gLVxuICAgICAqIG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBteS5pc1ByZXNlbnRhdGlvblZpc2libGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAoJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKSAhPSBudWxsXG4gICAgICAgICAgICAgICAgJiYgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS5jc3MoJ29wYWNpdHknKSA9PSAxKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogT3BlbnMgdGhlIFByZXppIGRpYWxvZywgZnJvbSB3aGljaCB0aGUgdXNlciBjb3VsZCBjaG9vc2UgYSBwcmVzZW50YXRpb25cbiAgICAgKiB0byBsb2FkLlxuICAgICAqL1xuICAgIG15Lm9wZW5QcmV6aURpYWxvZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXlwcmV6aSA9IFhNUFBBY3RpdmF0b3IuZ2V0UHJlemkoKTtcbiAgICAgICAgaWYgKG15cHJlemkpIHtcbiAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5Ud29CdXR0b25EaWFsb2coXCJSZW1vdmUgUHJlemlcIixcbiAgICAgICAgICAgICAgICBcIkFyZSB5b3Ugc3VyZSB5b3Ugd291bGQgbGlrZSB0byByZW1vdmUgeW91ciBQcmV6aT9cIixcbiAgICAgICAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICAgICAgICBcIlJlbW92ZVwiLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGUsdixtLGYpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodikge1xuICAgICAgICAgICAgICAgICAgICAgICAgWE1QUEFjdGl2YXRvci5yZW1vdmVGcm9tUHJlc2VuY2UoXCJwcmV6aVwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocHJlemlQbGF5ZXIgIT0gbnVsbCkge1xuICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIub3BlblR3b0J1dHRvbkRpYWxvZyhcIlNoYXJlIGEgUHJlemlcIixcbiAgICAgICAgICAgICAgICBcIkFub3RoZXIgcGFydGljaXBhbnQgaXMgYWxyZWFkeSBzaGFyaW5nIGEgUHJlemkuXCIgK1xuICAgICAgICAgICAgICAgICAgICBcIlRoaXMgY29uZmVyZW5jZSBhbGxvd3Mgb25seSBvbmUgUHJlemkgYXQgYSB0aW1lLlwiLFxuICAgICAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgICAgIFwiT2tcIixcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihlLHYsbSxmKSB7XG4gICAgICAgICAgICAgICAgICAgICQucHJvbXB0LmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBvcGVuUHJlemlTdGF0ZSA9IHtcbiAgICAgICAgICAgICAgICBzdGF0ZTA6IHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogICAnPGgyPlNoYXJlIGEgUHJlemk8L2gyPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICc8aW5wdXQgaWQ9XCJwcmV6aVVybFwiIHR5cGU9XCJ0ZXh0XCIgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3BsYWNlaG9sZGVyPVwiZS5nLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnaHR0cDovL3ByZXppLmNvbS93ejd2aGp5Y2w3ZTYvbXktcHJlemlcIiBhdXRvZm9jdXM+JyxcbiAgICAgICAgICAgICAgICAgICAgcGVyc2lzdGVudDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGJ1dHRvbnM6IHsgXCJTaGFyZVwiOiB0cnVlICwgXCJDYW5jZWxcIjogZmFsc2V9LFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0QnV0dG9uOiAxLFxuICAgICAgICAgICAgICAgICAgICBzdWJtaXQ6IGZ1bmN0aW9uKGUsdixtLGYpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYodilcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcHJlemlVcmwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJlemlVcmwnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmV6aVVybC52YWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1cmxWYWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPSBlbmNvZGVVUkkoVXRpbC5lc2NhcGVIdG1sKHByZXppVXJsLnZhbHVlKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVybFZhbHVlLmluZGV4T2YoJ2h0dHA6Ly9wcmV6aS5jb20vJykgIT0gMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgdXJsVmFsdWUuaW5kZXhPZignaHR0cHM6Ly9wcmV6aS5jb20vJykgIT0gMClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJC5wcm9tcHQuZ29Ub1N0YXRlKCdzdGF0ZTEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwcmVzSWRUbXAgPSB1cmxWYWx1ZS5zdWJzdHJpbmcoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybFZhbHVlLmluZGV4T2YoXCJwcmV6aS5jb20vXCIpICsgMTApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0FscGhhbnVtZXJpYyhwcmVzSWRUbXApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IHByZXNJZFRtcC5pbmRleE9mKCcvJykgPCAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJC5wcm9tcHQuZ29Ub1N0YXRlKCdzdGF0ZTEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFhNUFBBY3RpdmF0b3IuYWRkVG9QcmVzZW5jZShcInByZXppXCIsIHVybFZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkLnByb21wdC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQucHJvbXB0LmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHN0YXRlMToge1xuICAgICAgICAgICAgICAgICAgICBodG1sOiAgICc8aDI+U2hhcmUgYSBQcmV6aTwvaDI+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1BsZWFzZSBwcm92aWRlIGEgY29ycmVjdCBwcmV6aSBsaW5rLicsXG4gICAgICAgICAgICAgICAgICAgIHBlcnNpc3RlbnQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBidXR0b25zOiB7IFwiQmFja1wiOiB0cnVlLCBcIkNhbmNlbFwiOiBmYWxzZSB9LFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0QnV0dG9uOiAxLFxuICAgICAgICAgICAgICAgICAgICBzdWJtaXQ6ZnVuY3Rpb24oZSx2LG0sZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYodj09MClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkLnByb21wdC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQucHJvbXB0LmdvVG9TdGF0ZSgnc3RhdGUwJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIGZvY3VzUHJlemlVcmwgPSAgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJlemlVcmwnKS5mb2N1cygpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5vcGVuRGlhbG9nV2l0aFN0YXRlcyhvcGVuUHJlemlTdGF0ZSwgZm9jdXNQcmV6aVVybCwgZm9jdXNQcmV6aVVybCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQSBuZXcgcHJlc2VudGF0aW9uIGhhcyBiZWVuIGFkZGVkLlxuICAgICAqIFxuICAgICAqIEBwYXJhbSBldmVudCB0aGUgZXZlbnQgaW5kaWNhdGluZyB0aGUgYWRkIG9mIGEgcHJlc2VudGF0aW9uXG4gICAgICogQHBhcmFtIGppZCB0aGUgamlkIGZyb20gd2hpY2ggdGhlIHByZXNlbnRhdGlvbiB3YXMgYWRkZWRcbiAgICAgKiBAcGFyYW0gcHJlc1VybCB1cmwgb2YgdGhlIHByZXNlbnRhdGlvblxuICAgICAqIEBwYXJhbSBjdXJyZW50U2xpZGUgdGhlIGN1cnJlbnQgc2xpZGUgdG8gd2hpY2ggd2Ugc2hvdWxkIG1vdmVcbiAgICAgKi9cbiAgICB2YXIgcHJlc2VudGF0aW9uQWRkZWQgPSBmdW5jdGlvbihldmVudCwgamlkLCBwcmVzVXJsLCBjdXJyZW50U2xpZGUpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJwcmVzZW50YXRpb24gYWRkZWRcIiwgcHJlc1VybCk7XG5cbiAgICAgICAgdmFyIHByZXNJZCA9IGdldFByZXNlbnRhdGlvbklkKHByZXNVcmwpO1xuXG4gICAgICAgIHZhciBlbGVtZW50SWQgPSAncGFydGljaXBhbnRfJ1xuICAgICAgICAgICAgICAgICAgICAgICAgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpXG4gICAgICAgICAgICAgICAgICAgICAgICArICdfJyArIHByZXNJZDtcblxuICAgICAgICAvLyBXZSBleHBsaWNpdGx5IGRvbid0IHNwZWNpZnkgdGhlIHBlZXIgamlkIGhlcmUsIGJlY2F1c2Ugd2UgZG9uJ3Qgd2FudFxuICAgICAgICAvLyB0aGlzIHZpZGVvIHRvIGJlIGRlYWx0IHdpdGggYXMgYSBwZWVyIHJlbGF0ZWQgb25lIChmb3IgZXhhbXBsZSB3ZVxuICAgICAgICAvLyBkb24ndCB3YW50IHRvIHNob3cgYSBtdXRlL2tpY2sgbWVudSBmb3IgdGhpcyBvbmUsIGV0Yy4pLlxuICAgICAgICBWaWRlb0xheW91dC5hZGRSZW1vdGVWaWRlb0NvbnRhaW5lcihudWxsLCBlbGVtZW50SWQpO1xuICAgICAgICBWaWRlb0xheW91dC5yZXNpemVUaHVtYm5haWxzKCk7XG5cbiAgICAgICAgdmFyIGNvbnRyb2xzRW5hYmxlZCA9IGZhbHNlO1xuICAgICAgICBpZiAoamlkID09PSBYTVBQQWN0aXZhdG9yLmdldE15SklEKCkpXG4gICAgICAgICAgICBjb250cm9sc0VuYWJsZWQgPSB0cnVlO1xuXG4gICAgICAgIFByZXppLnNldFByZXNlbnRhdGlvblZpc2libGUodHJ1ZSk7XG4gICAgICAgICQoJyNsYXJnZVZpZGVvQ29udGFpbmVyJykuaG92ZXIoXG4gICAgICAgICAgICBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoUHJlemkuaXNQcmVzZW50YXRpb25WaXNpYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlbG9hZEJ1dHRvblJpZ2h0ID0gd2luZG93LmlubmVyV2lkdGhcbiAgICAgICAgICAgICAgICAgICAgICAgIC0gJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS5vZmZzZXQoKS5sZWZ0XG4gICAgICAgICAgICAgICAgICAgICAgICAtICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykud2lkdGgoKTtcblxuICAgICAgICAgICAgICAgICAgICAkKCcjcmVsb2FkUHJlc2VudGF0aW9uJykuY3NzKHsgIHJpZ2h0OiByZWxvYWRCdXR0b25SaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNwbGF5OidpbmxpbmUtYmxvY2snfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIGlmICghUHJlemkuaXNQcmVzZW50YXRpb25WaXNpYmxlKCkpXG4gICAgICAgICAgICAgICAgICAgICQoJyNyZWxvYWRQcmVzZW50YXRpb24nKS5jc3Moe2Rpc3BsYXk6J25vbmUnfSk7XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlID0gZXZlbnQudG9FbGVtZW50IHx8IGV2ZW50LnJlbGF0ZWRUYXJnZXQ7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGUgJiYgZS5pZCAhPSAncmVsb2FkUHJlc2VudGF0aW9uJyAmJiBlLmlkICE9ICdoZWFkZXInKVxuICAgICAgICAgICAgICAgICAgICAgICAgJCgnI3JlbG9hZFByZXNlbnRhdGlvbicpLmNzcyh7ZGlzcGxheTonbm9uZSd9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBwcmV6aVBsYXllciA9IG5ldyBQcmV6aVBsYXllcihcbiAgICAgICAgICAgICAgICAgICAgJ3ByZXNlbnRhdGlvbicsXG4gICAgICAgICAgICAgICAgICAgIHtwcmV6aUlkOiBwcmVzSWQsXG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiBnZXRQcmVzZW50YXRpb25XaWR0aCgpLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IGdldFByZXNlbnRhdGlvbkhlaWhndCgpLFxuICAgICAgICAgICAgICAgICAgICBjb250cm9sczogY29udHJvbHNFbmFibGVkLFxuICAgICAgICAgICAgICAgICAgICBkZWJ1ZzogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLmF0dHIoJ2lkJywgcHJlemlQbGF5ZXIub3B0aW9ucy5wcmV6aUlkKTtcblxuICAgICAgICBwcmV6aVBsYXllci5vbihQcmV6aVBsYXllci5FVkVOVF9TVEFUVVMsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInByZXppIHN0YXR1c1wiLCBldmVudC52YWx1ZSk7XG4gICAgICAgICAgICBpZiAoZXZlbnQudmFsdWUgPT0gUHJlemlQbGF5ZXIuU1RBVFVTX0NPTlRFTlRfUkVBRFkpIHtcbiAgICAgICAgICAgICAgICBpZiAoamlkICE9IFhNUFBBY3RpdmF0b3IuZ2V0TXlKSUQoKSlcbiAgICAgICAgICAgICAgICAgICAgcHJlemlQbGF5ZXIuZmx5VG9TdGVwKGN1cnJlbnRTbGlkZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHByZXppUGxheWVyLm9uKFByZXppUGxheWVyLkVWRU5UX0NVUlJFTlRfU1RFUCwgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZXZlbnQgdmFsdWVcIiwgZXZlbnQudmFsdWUpO1xuICAgICAgICAgICAgWE1QUEFjdGl2YXRvci5hZGRUb1ByZXNlbmNlKFwicHJlemlTbGlkZVwiLCBldmVudC52YWx1ZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoXCIjXCIgKyBlbGVtZW50SWQpLmNzcyggJ2JhY2tncm91bmQtaW1hZ2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAndXJsKC4uL2ltYWdlcy9hdmF0YXJwcmV6aS5wbmcpJyk7XG4gICAgICAgICQoXCIjXCIgKyBlbGVtZW50SWQpLmNsaWNrKFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFByZXppLnNldFByZXNlbnRhdGlvblZpc2libGUodHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEEgcHJlc2VudGF0aW9uIGhhcyBiZWVuIHJlbW92ZWQuXG4gICAgICogXG4gICAgICogQHBhcmFtIGV2ZW50IHRoZSBldmVudCBpbmRpY2F0aW5nIHRoZSByZW1vdmUgb2YgYSBwcmVzZW50YXRpb25cbiAgICAgKiBAcGFyYW0gamlkIHRoZSBqaWQgZm9yIHdoaWNoIHRoZSBwcmVzZW50YXRpb24gd2FzIHJlbW92ZWRcbiAgICAgKiBAcGFyYW0gdGhlIHVybCBvZiB0aGUgcHJlc2VudGF0aW9uXG4gICAgICovXG4gICAgdmFyIHByZXNlbnRhdGlvblJlbW92ZWQgPSBmdW5jdGlvbiAoZXZlbnQsIGppZCwgcHJlc1VybCkge1xuICAgICAgICBjb25zb2xlLmxvZygncHJlc2VudGF0aW9uIHJlbW92ZWQnLCBwcmVzVXJsKTtcbiAgICAgICAgdmFyIHByZXNJZCA9IGdldFByZXNlbnRhdGlvbklkKHByZXNVcmwpO1xuICAgICAgICBQcmV6aS5zZXRQcmVzZW50YXRpb25WaXNpYmxlKGZhbHNlKTtcbiAgICAgICAgJCgnI3BhcnRpY2lwYW50XydcbiAgICAgICAgICAgICAgICArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGppZClcbiAgICAgICAgICAgICAgICArICdfJyArIHByZXNJZCkucmVtb3ZlKCk7XG4gICAgICAgICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykucmVtb3ZlKCk7XG4gICAgICAgIGlmIChwcmV6aVBsYXllciAhPSBudWxsKSB7XG4gICAgICAgICAgICBwcmV6aVBsYXllci5kZXN0cm95KCk7XG4gICAgICAgICAgICBwcmV6aVBsYXllciA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSW5kaWNhdGVzIGlmIHRoZSBnaXZlbiBzdHJpbmcgaXMgYW4gYWxwaGFudW1lcmljIHN0cmluZy5cbiAgICAgKiBOb3RlIHRoYXQgc29tZSBzcGVjaWFsIGNoYXJhY3RlcnMgYXJlIGFsc28gYWxsb3dlZCAoLSwgXyAsIC8sICYsID8sID0sIDspIGZvciB0aGVcbiAgICAgKiBwdXJwb3NlIG9mIGNoZWNraW5nIFVSSXMuXG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNBbHBoYW51bWVyaWModW5zYWZlVGV4dCkge1xuICAgICAgICB2YXIgcmVnZXggPSAvXlthLXowLTktX1xcLyZcXD89O10rJC9pO1xuICAgICAgICByZXR1cm4gcmVnZXgudGVzdCh1bnNhZmVUZXh0KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBwcmVzZW50YXRpb24gaWQgZnJvbSB0aGUgZ2l2ZW4gdXJsLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFByZXNlbnRhdGlvbklkIChwcmVzVXJsKSB7XG4gICAgICAgIHZhciBwcmVzSWRUbXAgPSBwcmVzVXJsLnN1YnN0cmluZyhwcmVzVXJsLmluZGV4T2YoXCJwcmV6aS5jb20vXCIpICsgMTApO1xuICAgICAgICByZXR1cm4gcHJlc0lkVG1wLnN1YnN0cmluZygwLCBwcmVzSWRUbXAuaW5kZXhPZignLycpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBwcmVzZW50YXRpb24gd2lkdGguXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UHJlc2VudGF0aW9uV2lkdGgoKSB7XG4gICAgICAgIHZhciBhdmFpbGFibGVXaWR0aCA9IFVJVXRpbC5nZXRBdmFpbGFibGVWaWRlb1dpZHRoKCk7XG4gICAgICAgIHZhciBhdmFpbGFibGVIZWlnaHQgPSBnZXRQcmVzZW50YXRpb25IZWloZ3QoKTtcblxuICAgICAgICB2YXIgYXNwZWN0UmF0aW8gPSAxNi4wIC8gOS4wO1xuICAgICAgICBpZiAoYXZhaWxhYmxlSGVpZ2h0IDwgYXZhaWxhYmxlV2lkdGggLyBhc3BlY3RSYXRpbykge1xuICAgICAgICAgICAgYXZhaWxhYmxlV2lkdGggPSBNYXRoLmZsb29yKGF2YWlsYWJsZUhlaWdodCAqIGFzcGVjdFJhdGlvKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXZhaWxhYmxlV2lkdGg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgcHJlc2VudGF0aW9uIGhlaWdodC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRQcmVzZW50YXRpb25IZWloZ3QoKSB7XG4gICAgICAgIHZhciByZW1vdGVWaWRlb3MgPSAkKCcjcmVtb3RlVmlkZW9zJyk7XG4gICAgICAgIHJldHVybiB3aW5kb3cuaW5uZXJIZWlnaHQgLSByZW1vdGVWaWRlb3Mub3V0ZXJIZWlnaHQoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXNpemVzIHRoZSBwcmVzZW50YXRpb24gaWZyYW1lLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJlc2l6ZSgpIHtcbiAgICAgICAgaWYgKCQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykpIHtcbiAgICAgICAgICAgICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykud2lkdGgoZ2V0UHJlc2VudGF0aW9uV2lkdGgoKSk7XG4gICAgICAgICAgICAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLmhlaWdodChnZXRQcmVzZW50YXRpb25IZWloZ3QoKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQcmVzZW50YXRpb24gaGFzIGJlZW4gcmVtb3ZlZC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdwcmVzZW50YXRpb25yZW1vdmVkLm11YycsIHByZXNlbnRhdGlvblJlbW92ZWQpO1xuXG4gICAgLyoqXG4gICAgICogUHJlc2VudGF0aW9uIGhhcyBiZWVuIGFkZGVkLlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ3ByZXNlbnRhdGlvbmFkZGVkLm11YycsIHByZXNlbnRhdGlvbkFkZGVkKTtcblxuICAgIC8qXG4gICAgICogSW5kaWNhdGVzIHByZXNlbnRhdGlvbiBzbGlkZSBjaGFuZ2UuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgnZ290b3NsaWRlLm11YycsIGZ1bmN0aW9uIChldmVudCwgamlkLCBwcmVzVXJsLCBjdXJyZW50KSB7XG4gICAgICAgIGlmIChwcmV6aVBsYXllciAmJiBwcmV6aVBsYXllci5nZXRDdXJyZW50U3RlcCgpICE9IGN1cnJlbnQpIHtcbiAgICAgICAgICAgIHByZXppUGxheWVyLmZseVRvU3RlcChjdXJyZW50KTtcblxuICAgICAgICAgICAgdmFyIGFuaW1hdGlvblN0ZXBzQXJyYXkgPSBwcmV6aVBsYXllci5nZXRBbmltYXRpb25Db3VudE9uU3RlcHMoKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFyc2VJbnQoYW5pbWF0aW9uU3RlcHNBcnJheVtjdXJyZW50XSk7IGkrKykge1xuICAgICAgICAgICAgICAgIHByZXppUGxheWVyLmZseVRvU3RlcChjdXJyZW50LCBpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogT24gdmlkZW8gc2VsZWN0ZWQgZXZlbnQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgndmlkZW8uc2VsZWN0ZWQnLCBmdW5jdGlvbiAoZXZlbnQsIGlzUHJlc2VudGF0aW9uKSB7XG4gICAgICAgIGlmICghaXNQcmVzZW50YXRpb24gJiYgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKSlcbiAgICAgICAgICAgIFByZXppLnNldFByZXNlbnRhdGlvblZpc2libGUoZmFsc2UpO1xuICAgIH0pO1xuXG4gICAgJCh3aW5kb3cpLnJlc2l6ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlc2l6ZSgpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG15O1xufShQcmV6aSB8fCB7fSkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByZXppO1xuIiwibW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgdmFyIF9fYmluZCA9IGZ1bmN0aW9uKGZuLCBtZSl7IHJldHVybiBmdW5jdGlvbigpeyByZXR1cm4gZm4uYXBwbHkobWUsIGFyZ3VtZW50cyk7IH07IH07XG5cbiAgICB2YXIgUHJlemlQbGF5ZXIgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgUHJlemlQbGF5ZXIuQVBJX1ZFUlNJT04gPSAxO1xuICAgICAgICBQcmV6aVBsYXllci5DVVJSRU5UX1NURVAgPSAnY3VycmVudFN0ZXAnO1xuICAgICAgICBQcmV6aVBsYXllci5DVVJSRU5UX0FOSU1BVElPTl9TVEVQID0gJ2N1cnJlbnRBbmltYXRpb25TdGVwJztcbiAgICAgICAgUHJlemlQbGF5ZXIuQ1VSUkVOVF9PQkpFQ1QgPSAnY3VycmVudE9iamVjdCc7XG4gICAgICAgIFByZXppUGxheWVyLlNUQVRVU19MT0FESU5HID0gJ2xvYWRpbmcnO1xuICAgICAgICBQcmV6aVBsYXllci5TVEFUVVNfUkVBRFkgPSAncmVhZHknO1xuICAgICAgICBQcmV6aVBsYXllci5TVEFUVVNfQ09OVEVOVF9SRUFEWSA9ICdjb250ZW50cmVhZHknO1xuICAgICAgICBQcmV6aVBsYXllci5FVkVOVF9DVVJSRU5UX1NURVAgPSBcImN1cnJlbnRTdGVwQ2hhbmdlXCI7XG4gICAgICAgIFByZXppUGxheWVyLkVWRU5UX0NVUlJFTlRfQU5JTUFUSU9OX1NURVAgPSBcImN1cnJlbnRBbmltYXRpb25TdGVwQ2hhbmdlXCI7XG4gICAgICAgIFByZXppUGxheWVyLkVWRU5UX0NVUlJFTlRfT0JKRUNUID0gXCJjdXJyZW50T2JqZWN0Q2hhbmdlXCI7XG4gICAgICAgIFByZXppUGxheWVyLkVWRU5UX1NUQVRVUyA9IFwic3RhdHVzQ2hhbmdlXCI7XG4gICAgICAgIFByZXppUGxheWVyLkVWRU5UX1BMQVlJTkcgPSBcImlzQXV0b1BsYXlpbmdDaGFuZ2VcIjtcbiAgICAgICAgUHJlemlQbGF5ZXIuRVZFTlRfSVNfTU9WSU5HID0gXCJpc01vdmluZ0NoYW5nZVwiO1xuICAgICAgICBQcmV6aVBsYXllci5kb21haW4gPSBcImh0dHBzOi8vcHJlemkuY29tXCI7XG4gICAgICAgIFByZXppUGxheWVyLnBhdGggPSBcIi9wbGF5ZXIvXCI7XG4gICAgICAgIFByZXppUGxheWVyLnBsYXllcnMgPSB7fTtcbiAgICAgICAgUHJlemlQbGF5ZXIuYmluZGVkX21ldGhvZHMgPSBbJ2NoYW5nZXNIYW5kbGVyJ107XG5cbiAgICAgICAgUHJlemlQbGF5ZXIuY3JlYXRlTXVsdGlwbGVQbGF5ZXJzID0gZnVuY3Rpb24ob3B0aW9uQXJyYXkpe1xuICAgICAgICAgICAgZm9yKHZhciBpPTA7IGk8b3B0aW9uQXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgb3B0aW9uU2V0ID0gb3B0aW9uQXJyYXlbaV07XG4gICAgICAgICAgICAgICAgbmV3IFByZXppUGxheWVyKG9wdGlvblNldC5pZCwgb3B0aW9uU2V0KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIubWVzc2FnZVJlY2VpdmVkID0gZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgICAgICAgdmFyIG1lc3NhZ2UsIGl0ZW0sIHBsYXllcjtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IEpTT04ucGFyc2UoZXZlbnQuZGF0YSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuaWQgJiYgKHBsYXllciA9IFByZXppUGxheWVyLnBsYXllcnNbbWVzc2FnZS5pZF0pKXtcbiAgICAgICAgICAgICAgICBpZiAocGxheWVyLm9wdGlvbnMuZGVidWcgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnNvbGUgJiYgY29uc29sZS5sb2cpIGNvbnNvbGUubG9nKCdyZWNlaXZlZCcsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS50eXBlID09PSBcImNoYW5nZXNcIil7XG4gICAgICAgICAgICAgICAgICAgIHBsYXllci5jaGFuZ2VzSGFuZGxlcihtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPHBsYXllci5jYWxsYmFja3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbSA9IHBsYXllci5jYWxsYmFja3NbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtICYmIG1lc3NhZ2UudHlwZSA9PT0gaXRlbS5ldmVudCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLmNhbGxiYWNrKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIFByZXppUGxheWVyKGlkLCBvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgcGFyYW1zLCBwYXJhbVN0cmluZyA9IFwiXCIsIF90aGlzID0gdGhpcztcbiAgICAgICAgICAgIGlmIChQcmV6aVBsYXllci5wbGF5ZXJzW2lkXSl7XG4gICAgICAgICAgICAgICAgUHJlemlQbGF5ZXIucGxheWVyc1tpZF0uZGVzdHJveSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yKHZhciBpPTA7IGk8UHJlemlQbGF5ZXIuYmluZGVkX21ldGhvZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgbWV0aG9kX25hbWUgPSBQcmV6aVBsYXllci5iaW5kZWRfbWV0aG9kc1tpXTtcbiAgICAgICAgICAgICAgICBfdGhpc1ttZXRob2RfbmFtZV0gPSBfX2JpbmQoX3RoaXNbbWV0aG9kX25hbWVdLCBfdGhpcyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgICAgICAgICAgdGhpcy52YWx1ZXMgPSB7J3N0YXR1cyc6IFByZXppUGxheWVyLlNUQVRVU19MT0FESU5HfTtcbiAgICAgICAgICAgIHRoaXMudmFsdWVzW1ByZXppUGxheWVyLkNVUlJFTlRfU1RFUF0gPSAwO1xuICAgICAgICAgICAgdGhpcy52YWx1ZXNbUHJlemlQbGF5ZXIuQ1VSUkVOVF9BTklNQVRJT05fU1RFUF0gPSAwO1xuICAgICAgICAgICAgdGhpcy52YWx1ZXNbUHJlemlQbGF5ZXIuQ1VSUkVOVF9PQkpFQ1RdID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tzID0gW107XG4gICAgICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgICAgICB0aGlzLmVtYmVkVG8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZW1iZWRUbykge1xuICAgICAgICAgICAgICAgIHRocm93IFwiVGhlIGVsZW1lbnQgaWQgaXMgbm90IGF2YWlsYWJsZS5cIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuaWZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG4gICAgICAgICAgICBwYXJhbXMgPSBbXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnb2lkJywgdmFsdWU6IG9wdGlvbnMucHJlemlJZCB9LFxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2V4cGxvcmFibGUnLCB2YWx1ZTogb3B0aW9ucy5leHBsb3JhYmxlID8gMSA6IDAgfSxcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdjb250cm9scycsIHZhbHVlOiBvcHRpb25zLmNvbnRyb2xzID8gMSA6IDAgfVxuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIGZvcih2YXIgaT0wOyBpPHBhcmFtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBwYXJhbSA9IHBhcmFtc1tpXTtcbiAgICAgICAgICAgICAgICBwYXJhbVN0cmluZyArPSAoaT09PTAgPyBcIj9cIiA6IFwiJlwiKSArIHBhcmFtLm5hbWUgKyBcIj1cIiArIHBhcmFtLnZhbHVlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMuaWZyYW1lLnNyYyA9IFByZXppUGxheWVyLmRvbWFpbiArIFByZXppUGxheWVyLnBhdGggKyBwYXJhbVN0cmluZztcbiAgICAgICAgICAgIHRoaXMuaWZyYW1lLmZyYW1lQm9yZGVyID0gMDtcbiAgICAgICAgICAgIHRoaXMuaWZyYW1lLnNjcm9sbGluZyA9IFwibm9cIjtcbiAgICAgICAgICAgIHRoaXMuaWZyYW1lLndpZHRoID0gb3B0aW9ucy53aWR0aCB8fCA2NDA7XG4gICAgICAgICAgICB0aGlzLmlmcmFtZS5oZWlnaHQgPSBvcHRpb25zLmhlaWdodCB8fCA0ODA7XG4gICAgICAgICAgICB0aGlzLmVtYmVkVG8uaW5uZXJIVE1MID0gJyc7XG4gICAgICAgICAgICAvLyBKSVRTSTogSU4gQ0FTRSBTT01FVEhJTkcgR09FUyBXUk9ORy5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdGhpcy5lbWJlZFRvLmFwcGVuZENoaWxkKHRoaXMuaWZyYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNBVENIIEVSUk9SXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBKSVRTSTogSW5jcmVhc2UgaW50ZXJ2YWwgZnJvbSAyMDAgdG8gNTAwLCB3aGljaCBmaXhlcyBwcmV6aVxuICAgICAgICAgICAgLy8gY3Jhc2hlcyBmb3IgdXMuXG4gICAgICAgICAgICB0aGlzLmluaXRQb2xsSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIF90aGlzLnNlbmRNZXNzYWdlKHsnYWN0aW9uJzogJ2luaXQnfSk7XG4gICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgUHJlemlQbGF5ZXIucGxheWVyc1tpZF0gPSB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmNoYW5nZXNIYW5kbGVyID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICAgICAgICAgICAgdmFyIGtleSwgdmFsdWUsIGosIGl0ZW07XG4gICAgICAgICAgICBpZiAodGhpcy5pbml0UG9sbEludGVydmFsKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLmluaXRQb2xsSW50ZXJ2YWwpO1xuICAgICAgICAgICAgICAgIHRoaXMuaW5pdFBvbGxJbnRlcnZhbCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChrZXkgaW4gbWVzc2FnZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuZGF0YS5oYXNPd25Qcm9wZXJ0eShrZXkpKXtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBtZXNzYWdlLmRhdGFba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy52YWx1ZXNba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGo9MDsgajx0aGlzLmNhbGxiYWNrcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbSA9IHRoaXMuY2FsbGJhY2tzW2pdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0gJiYgaXRlbS5ldmVudCA9PT0ga2V5ICsgXCJDaGFuZ2VcIil7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5jYWxsYmFjayh7dHlwZTogaXRlbS5ldmVudCwgdmFsdWU6IHZhbHVlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmluaXRQb2xsSW50ZXJ2YWwpIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMuaW5pdFBvbGxJbnRlcnZhbCk7XG4gICAgICAgICAgICAgICAgdGhpcy5pbml0UG9sbEludGVydmFsID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmVtYmVkVG8uaW5uZXJIVE1MID0gJyc7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLnNlbmRNZXNzYWdlID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5kZWJ1ZyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChjb25zb2xlICYmIGNvbnNvbGUubG9nKSBjb25zb2xlLmxvZygnc2VudCcsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWVzc2FnZS52ZXJzaW9uID0gUHJlemlQbGF5ZXIuQVBJX1ZFUlNJT047XG4gICAgICAgICAgICBtZXNzYWdlLmlkID0gdGhpcy5pZDtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlmcmFtZS5jb250ZW50V2luZG93LnBvc3RNZXNzYWdlKEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpLCAnKicpO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5uZXh0U3RlcCA9IC8qIG5leHRTdGVwIGlzIERFUFJFQ0FURUQgKi9cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmZseVRvTmV4dFN0ZXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAnYWN0aW9uJzogJ3ByZXNlbnQnLFxuICAgICAgICAgICAgICAgICdkYXRhJzogWydtb3ZlVG9OZXh0U3RlcCddXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUucHJldmlvdXNTdGVwID0gLyogcHJldmlvdXNTdGVwIGlzIERFUFJFQ0FURUQgKi9cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmZseVRvUHJldmlvdXNTdGVwID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgJ2FjdGlvbic6ICdwcmVzZW50JyxcbiAgICAgICAgICAgICAgICAnZGF0YSc6IFsnbW92ZVRvUHJldlN0ZXAnXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLnRvU3RlcCA9IC8qIHRvU3RlcCBpcyBERVBSRUNBVEVEICovXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5mbHlUb1N0ZXAgPSBmdW5jdGlvbihzdGVwLCBhbmltYXRpb25fc3RlcCkge1xuICAgICAgICAgICAgdmFyIG9iaiA9IHRoaXM7XG4gICAgICAgICAgICAvLyBjaGVjayBhbmltYXRpb25fc3RlcFxuICAgICAgICAgICAgaWYgKGFuaW1hdGlvbl9zdGVwID4gMCAmJlxuICAgICAgICAgICAgICAgIG9iai52YWx1ZXMuYW5pbWF0aW9uQ291bnRPblN0ZXBzICYmXG4gICAgICAgICAgICAgICAgb2JqLnZhbHVlcy5hbmltYXRpb25Db3VudE9uU3RlcHNbc3RlcF0gPD0gYW5pbWF0aW9uX3N0ZXApIHtcbiAgICAgICAgICAgICAgICBhbmltYXRpb25fc3RlcCA9IG9iai52YWx1ZXMuYW5pbWF0aW9uQ291bnRPblN0ZXBzW3N0ZXBdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8ganVtcCB0byBhbmltYXRpb24gc3RlcHMgYnkgY2FsbGluZyBmbHlUb05leHRTdGVwKClcbiAgICAgICAgICAgIGZ1bmN0aW9uIGRvQW5pbWF0aW9uU3RlcHMoKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iai52YWx1ZXMuaXNNb3ZpbmcgPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGRvQW5pbWF0aW9uU3RlcHMsIDEwMCk7IC8vIHdhaXQgdW50aWwgdGhlIGZsaWdodCBlbmRzXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgd2hpbGUgKGFuaW1hdGlvbl9zdGVwLS0gPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG9iai5mbHlUb05leHRTdGVwKCk7IC8vIGRvIHRoZSBhbmltYXRpb24gc3RlcHNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGRvQW5pbWF0aW9uU3RlcHMsIDIwMCk7IC8vIDIwMG1zIGlzIHRoZSBpbnRlcm5hbCBcInJlcG9ydGluZ1wiIHRpbWVcbiAgICAgICAgICAgIC8vIGp1bXAgdG8gdGhlIHN0ZXBcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAnYWN0aW9uJzogJ3ByZXNlbnQnLFxuICAgICAgICAgICAgICAgICdkYXRhJzogWydtb3ZlVG9TdGVwJywgc3RlcF1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS50b09iamVjdCA9IC8qIHRvT2JqZWN0IGlzIERFUFJFQ0FURUQgKi9cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmZseVRvT2JqZWN0ID0gZnVuY3Rpb24ob2JqZWN0SWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAnYWN0aW9uJzogJ3ByZXNlbnQnLFxuICAgICAgICAgICAgICAgICdkYXRhJzogWydtb3ZlVG9PYmplY3QnLCBvYmplY3RJZF1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5wbGF5ID0gZnVuY3Rpb24oZGVmYXVsdERlbGF5KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgJ2FjdGlvbic6ICdwcmVzZW50JyxcbiAgICAgICAgICAgICAgICAnZGF0YSc6IFsnc3RhcnRBdXRvUGxheScsIGRlZmF1bHREZWxheV1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgJ2FjdGlvbic6ICdwcmVzZW50JyxcbiAgICAgICAgICAgICAgICAnZGF0YSc6IFsnc3RvcEF1dG9QbGF5J11cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKGRlZmF1bHREZWxheSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgICdhY3Rpb24nOiAncHJlc2VudCcsXG4gICAgICAgICAgICAgICAgJ2RhdGEnOiBbJ3BhdXNlQXV0b1BsYXknLCBkZWZhdWx0RGVsYXldXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZ2V0Q3VycmVudFN0ZXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlcy5jdXJyZW50U3RlcDtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZ2V0Q3VycmVudEFuaW1hdGlvblN0ZXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlcy5jdXJyZW50QW5pbWF0aW9uU3RlcDtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZ2V0Q3VycmVudE9iamVjdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzLmN1cnJlbnRPYmplY3Q7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmdldFN0YXR1cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzLnN0YXR1cztcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuaXNQbGF5aW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXMuaXNBdXRvUGxheWluZztcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZ2V0U3RlcENvdW50ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXMuc3RlcENvdW50O1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5nZXRBbmltYXRpb25Db3VudE9uU3RlcHMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlcy5hbmltYXRpb25Db3VudE9uU3RlcHM7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmdldFRpdGxlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXMudGl0bGU7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLnNldERpbWVuc2lvbnMgPSBmdW5jdGlvbihkaW1zKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBwYXJhbWV0ZXIgaW4gZGltcykge1xuICAgICAgICAgICAgICAgIHRoaXMuaWZyYW1lW3BhcmFtZXRlcl0gPSBkaW1zW3BhcmFtZXRlcl07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZ2V0RGltZW5zaW9ucyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB3aWR0aDogcGFyc2VJbnQodGhpcy5pZnJhbWUud2lkdGgsIDEwKSxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IHBhcnNlSW50KHRoaXMuaWZyYW1lLmhlaWdodCwgMTApXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUub24gPSBmdW5jdGlvbihldmVudCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tzLnB1c2goe1xuICAgICAgICAgICAgICAgIGV2ZW50OiBldmVudCxcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogY2FsbGJhY2tcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbihldmVudCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBqLCBpdGVtO1xuICAgICAgICAgICAgaWYgKGV2ZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhbGxiYWNrcyA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaiA9IHRoaXMuY2FsbGJhY2tzLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlIChqLS0pIHtcbiAgICAgICAgICAgICAgICBpdGVtID0gdGhpcy5jYWxsYmFja3Nbal07XG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0gJiYgaXRlbS5ldmVudCA9PT0gZXZlbnQgJiYgKGNhbGxiYWNrID09PSB1bmRlZmluZWQgfHwgaXRlbS5jYWxsYmFjayA9PT0gY2FsbGJhY2spKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jYWxsYmFja3Muc3BsaWNlKGosIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAod2luZG93LmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgUHJlemlQbGF5ZXIubWVzc2FnZVJlY2VpdmVkLCBmYWxzZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3aW5kb3cuYXR0YWNoRXZlbnQoJ29ubWVzc2FnZScsIFByZXppUGxheWVyLm1lc3NhZ2VSZWNlaXZlZCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gUHJlemlQbGF5ZXI7XG5cbiAgICB9KSgpO1xuXG4gICAgcmV0dXJuIFByZXppUGxheWVyO1xufSkoKTtcbiIsInZhciBDb250YWN0TGlzdCA9IHJlcXVpcmUoXCIuLy4uL0NvbnRhY3RMaXN0LmpzXCIpO1xudmFyIENoYXQgPSByZXF1aXJlKFwiLi8uLi9jaGF0L2NoYXQuanNcIik7XG52YXIgYnV0dG9uQ2xpY2sgPSByZXF1aXJlKFwiLi4vVUlVdGlsXCIpLmJ1dHRvbkNsaWNrO1xuXG52YXIgQm90dG9tVG9vbGJhciA9IChmdW5jdGlvbiAobXkpIHtcblxuICAgIHZhciBidXR0b25IYW5kbGVycyA9IHtcbiAgICAgICAgXCJib3R0b210b29sYmFyX2J1dHRvbl9jaGF0XCI6IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuIEJvdHRvbVRvb2xiYXIudG9nZ2xlQ2hhdCgpO1xuICAgICAgICB9LFxuICAgICAgICBcImJvdHRvbXRvb2xiYXJfYnV0dG9uX2NvbnRhY3RcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIEJvdHRvbVRvb2xiYXIudG9nZ2xlQ29udGFjdExpc3QoKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJib3R0b210b29sYmFyX2J1dHRvbl9maWxtc3RyaXBcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIEJvdHRvbVRvb2xiYXIudG9nZ2xlRmlsbVN0cmlwKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgbXkuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZm9yKHZhciBrIGluIGJ1dHRvbkhhbmRsZXJzKVxuICAgICAgICAgICAgJChcIiNcIiArIGspLmNsaWNrKGJ1dHRvbkhhbmRsZXJzW2tdKTtcbiAgICB9XG4gICAgbXkudG9nZ2xlQ2hhdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoQ29udGFjdExpc3QuaXNWaXNpYmxlKCkpIHtcbiAgICAgICAgICAgIGJ1dHRvbkNsaWNrKFwiI2NvbnRhY3RMaXN0QnV0dG9uXCIsIFwiYWN0aXZlXCIpO1xuICAgICAgICAgICAgQ29udGFjdExpc3QudG9nZ2xlQ29udGFjdExpc3QoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGJ1dHRvbkNsaWNrKFwiI2NoYXRCb3R0b21CdXR0b25cIiwgXCJhY3RpdmVcIik7XG5cbiAgICAgICAgQ2hhdC50b2dnbGVDaGF0KCk7XG4gICAgfTtcblxuICAgIG15LnRvZ2dsZUNvbnRhY3RMaXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChDaGF0LmlzVmlzaWJsZSgpKSB7XG4gICAgICAgICAgICBidXR0b25DbGljayhcIiNjaGF0Qm90dG9tQnV0dG9uXCIsIFwiYWN0aXZlXCIpO1xuICAgICAgICAgICAgQ2hhdC50b2dnbGVDaGF0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBidXR0b25DbGljayhcIiNjb250YWN0TGlzdEJ1dHRvblwiLCBcImFjdGl2ZVwiKTtcblxuICAgICAgICBDb250YWN0TGlzdC50b2dnbGVDb250YWN0TGlzdCgpO1xuICAgIH07XG5cbiAgICBteS50b2dnbGVGaWxtU3RyaXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGZpbG1zdHJpcCA9ICQoXCIjcmVtb3RlVmlkZW9zXCIpO1xuICAgICAgICBmaWxtc3RyaXAudG9nZ2xlQ2xhc3MoXCJoaWRkZW5cIik7XG4gICAgfTtcblxuXG4gICAgJChkb2N1bWVudCkuYmluZChcInJlbW90ZXZpZGVvLnJlc2l6ZWRcIiwgZnVuY3Rpb24gKGV2ZW50LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHZhciBib3R0b20gPSAoaGVpZ2h0IC0gJCgnI2JvdHRvbVRvb2xiYXInKS5vdXRlckhlaWdodCgpKS8yICsgMTg7XG5cbiAgICAgICAgJCgnI2JvdHRvbVRvb2xiYXInKS5jc3Moe2JvdHRvbTogYm90dG9tICsgJ3B4J30pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG15O1xufShCb3R0b21Ub29sYmFyIHx8IHt9KSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQm90dG9tVG9vbGJhcjtcbiIsInZhciBCb3R0b21Ub29sYmFyID0gcmVxdWlyZShcIi4vQm90dG9tVG9vbGJhclwiKTtcbnZhciBQcmV6aSA9IHJlcXVpcmUoXCIuLy4uL3ByZXppL3ByZXppXCIpO1xudmFyIEV0aGVycGFkID0gcmVxdWlyZShcIi4vLi4vZXRoZXJwYWQvRXRoZXJwYWRcIik7XG52YXIgYnV0dG9uQ2xpY2sgPSByZXF1aXJlKFwiLi4vVUlVdGlsXCIpLmJ1dHRvbkNsaWNrO1xuXG52YXIgVG9vbGJhciA9IChmdW5jdGlvbiAobXkpIHtcblxuICAgIHZhciB0b29sYmFyVGltZW91dCA9IG51bGw7XG5cbiAgICB2YXIgcm9vbVVybCA9IG51bGw7XG5cbiAgICB2YXIgcmVjb3JkaW5nVG9rZW4gPSAnJztcblxuICAgIHZhciBidXR0b25IYW5kbGVycyA9IHtcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9tdXRlXCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBUb29sYmFyLnRvZ2dsZUF1ZGlvKCk7XG4gICAgICAgIH0sXG4gICAgICAgIFwidG9vbGJhcl9idXR0b25fY2FtZXJhXCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGJ1dHRvbkNsaWNrKFwiI3ZpZGVvXCIsIFwiaWNvbi1jYW1lcmEgaWNvbi1jYW1lcmEtZGlzYWJsZWRcIik7XG4gICAgICAgICAgICByZXR1cm4gdG9nZ2xlVmlkZW8oKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9yZWNvcmRcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRvZ2dsZVJlY29yZGluZygpO1xuICAgICAgICB9XG4gICAgICAgICxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9zZWN1cml0eVwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gVG9vbGJhci5vcGVuTG9ja0RpYWxvZygpO1xuICAgICAgICB9LFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX2xpbmtcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIFRvb2xiYXIub3BlbkxpbmtEaWFsb2coKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9jaGF0XCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBCb3R0b21Ub29sYmFyLnRvZ2dsZUNoYXQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9wcmV6aVwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gUHJlemkub3BlblByZXppRGlhbG9nKCk7XG4gICAgICAgIH0sXG4gICAgICAgIFwidG9vbGJhcl9idXR0b25fZXRoZXJwYWRcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIEV0aGVycGFkLnRvZ2dsZUV0aGVycGFkKDApO1xuICAgICAgICB9LFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX2Rlc2t0b3BzaGFyaW5nXCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0b2dnbGVTY3JlZW5TaGFyaW5nKCk7XG4gICAgICAgIH0sXG4gICAgICAgIFwidG9vbGJhcl9idXR0b25fZnVsbFNjcmVlblwiOiBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGJ1dHRvbkNsaWNrKFwiI2Z1bGxTY3JlZW5cIiwgXCJpY29uLWZ1bGwtc2NyZWVuIGljb24tZXhpdC1mdWxsLXNjcmVlblwiKTtcbiAgICAgICAgICAgIHJldHVybiBUb29sYmFyLnRvZ2dsZUZ1bGxTY3JlZW4oKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9zaXBcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxTaXBCdXR0b25DbGlja2VkKCk7XG4gICAgICAgIH0sXG4gICAgICAgIFwidG9vbGJhcl9idXR0b25faGFuZ3VwXCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBoYW5ndXAoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG15LnNoYXJlZEtleSA9ICcnO1xuICAgIG15LnByZU11dGVkID0gZmFsc2U7XG5cbiAgICBmdW5jdGlvbiBzZXRSZWNvcmRpbmdUb2tlbih0b2tlbikge1xuICAgICAgICByZWNvcmRpbmdUb2tlbiA9IHRva2VuO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhbGxTaXBCdXR0b25DbGlja2VkKClcbiAgICB7XG4gICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5Ud29CdXR0b25EaWFsb2cobnVsbCxcbiAgICAgICAgICAgICAgICAnPGgyPkVudGVyIFNJUCBudW1iZXI8L2gyPicgK1xuICAgICAgICAgICAgICAgICc8aW5wdXQgaWQ9XCJzaXBOdW1iZXJcIiB0eXBlPVwidGV4dFwiJyArXG4gICAgICAgICAgICAgICAgJyB2YWx1ZT1cIicgKyBjb25maWcuZGVmYXVsdFNpcE51bWJlciArICdcIiBhdXRvZm9jdXM+JyxcbiAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgXCJEaWFsXCIsXG4gICAgICAgICAgICBmdW5jdGlvbiAoZSwgdiwgbSwgZikge1xuICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBudW1iZXJJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaXBOdW1iZXInKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG51bWJlcklucHV0LnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBYTVBQQWN0aXZhdG9yLnNpcERpYWwoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVySW5wdXQudmFsdWUsICdmcm9tbnVtYmVyJywgVUlBY3RpdmF0b3IuZ2V0VUlTZXJ2aWNlKCkuZ2V0Um9vbU5hbWUoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NpcE51bWJlcicpLmZvY3VzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfVxuXG5cbiAgICAvLyBTdGFydHMgb3Igc3RvcHMgdGhlIHJlY29yZGluZyBmb3IgdGhlIGNvbmZlcmVuY2UuXG4gICAgZnVuY3Rpb24gdG9nZ2xlUmVjb3JkaW5nKCkge1xuICAgICAgICBpZighWE1QUEFjdGl2YXRvci5pc0ZvY3VzKCkpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdub24tZm9jdXM6IG5vdCBlbmFibGluZyByZWNvcmRpbmcnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIFhNUFBBY3RpdmF0b3Iuc2V0UmVjb3JkaW5nKFxuICAgICAgICAgICAgcmVjb3JkaW5nVG9rZW4sXG4gICAgICAgICAgICBmdW5jdGlvbiAoc3RhdGUsIG9sZFN0YXRlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJOZXcgcmVjb3JkaW5nIHN0YXRlOiBcIiwgc3RhdGUpO1xuICAgICAgICAgICAgICAgIGlmIChzdGF0ZSA9PSBvbGRTdGF0ZSkgLy9mYWlsZWQgdG8gY2hhbmdlLCByZXNldCB0aGUgdG9rZW4gYmVjYXVzZSBpdCBtaWdodCBoYXZlIGJlZW4gd3JvbmdcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFRvb2xiYXIudG9nZ2xlUmVjb3JkaW5nQnV0dG9uU3RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgc2V0UmVjb3JkaW5nVG9rZW4obnVsbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFRvb2xiYXIudG9nZ2xlUmVjb3JkaW5nQnV0dG9uU3RhdGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmICghcmVjb3JkaW5nVG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIub3BlblR3b0J1dHRvbkRpYWxvZyhudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICc8aDI+RW50ZXIgcmVjb3JkaW5nIHRva2VuPC9oMj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPGlucHV0IGlkPVwicmVjb3JkaW5nVG9rZW5cIiB0eXBlPVwidGV4dFwiIHBsYWNlaG9sZGVyPVwidG9rZW5cIiBhdXRvZm9jdXM+JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJTYXZlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZSwgdiwgbSwgZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0b2tlbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZWNvcmRpbmdUb2tlbicpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0b2tlbi52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0UmVjb3JkaW5nVG9rZW4oVXRpbC5lc2NhcGVIdG1sKHRva2VuLnZhbHVlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVSZWNvcmRpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVjb3JkaW5nVG9rZW4nKS5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuXG5cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoYW5ndXAoKSB7XG4gICAgICAgIFhNUFBBY3RpdmF0b3IuZGlzcG9zZUNvbmZlcmVuY2UoZmFsc2UsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBidXR0b25zID0ge307XG4gICAgICAgICAgICBpZihjb25maWcuZW5hYmxlV2VsY29tZVBhZ2UpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLndlbGNvbWVQYWdlRGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lID0gXCIvXCI7XG4gICAgICAgICAgICAgICAgfSwgMTAwMDApO1xuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICQucHJvbXB0KFwiU2Vzc2lvbiBUZXJtaW5hdGVkXCIsXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCJZb3UgaHVuZyB1cCB0aGUgY2FsbFwiLFxuICAgICAgICAgICAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBidXR0b25zOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcIkpvaW4gYWdhaW5cIjogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBjbG9zZVRleHQ6ICcnLFxuICAgICAgICAgICAgICAgICAgICBzdWJtaXQ6IGZ1bmN0aW9uKGV2ZW50LCB2YWx1ZSwgbWVzc2FnZSwgZm9ybVZhbHMpXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSwgdHJ1ZSk7XG5cblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIHNoYXJlZCBrZXkuXG4gICAgICovXG4gICAgbXkuc2V0U2hhcmVkS2V5ID0gZnVuY3Rpb24oc0tleSkge1xuICAgICAgICBUb29sYmFyLnNoYXJlZEtleSA9IHNLZXk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTG9ja3MgLyB1bmxvY2tzIHRoZSByb29tLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvY2tSb29tKGxvY2spIHtcbiAgICAgICAgdmFyIGtleSA9ICcnO1xuICAgICAgICBpZiAobG9jaylcbiAgICAgICAgICAgIGtleSA9IFRvb2xiYXIuc2hhcmVkS2V5O1xuXG4gICAgICAgIFhNUFBBY3RpdmF0b3IubG9ja1Jvb20oa2V5KTtcblxuICAgICAgICBUb29sYmFyLnVwZGF0ZUxvY2tCdXR0b24oKTtcbiAgICB9XG5cbiAgICAvL3NldHMgb25jbGljayBoYW5kbGVyc1xuICAgIG15LmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZvcih2YXIgayBpbiBidXR0b25IYW5kbGVycylcbiAgICAgICAgICAgICQoXCIjXCIgKyBrKS5jbGljayhidXR0b25IYW5kbGVyc1trXSk7XG4gICAgfVxuXG5cbiAgICBteS5jaGFuZ2VUb29sYmFyVmlkZW9JY29uID0gZnVuY3Rpb24gKGlzTXV0ZWQpIHtcbiAgICAgICAgaWYgKGlzTXV0ZWQpIHtcbiAgICAgICAgICAgICQoJyN2aWRlbycpLnJlbW92ZUNsYXNzKFwiaWNvbi1jYW1lcmFcIik7XG4gICAgICAgICAgICAkKCcjdmlkZW8nKS5hZGRDbGFzcyhcImljb24tY2FtZXJhIGljb24tY2FtZXJhLWRpc2FibGVkXCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnI3ZpZGVvJykucmVtb3ZlQ2xhc3MoXCJpY29uLWNhbWVyYSBpY29uLWNhbWVyYS1kaXNhYmxlZFwiKTtcbiAgICAgICAgICAgICQoJyN2aWRlbycpLmFkZENsYXNzKFwiaWNvbi1jYW1lcmFcIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBteS50b2dnbGVWaWRlbyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgYnV0dG9uQ2xpY2soXCIjdmlkZW9cIiwgXCJpY29uLWNhbWVyYSBpY29uLWNhbWVyYS1kaXNhYmxlZFwiKTtcblxuICAgICAgICBYTVBQQWN0aXZhdG9yLnRvZ2dsZVZpZGVvTXV0ZShcbiAgICAgICAgICAgIGZ1bmN0aW9uIChpc011dGVkKSB7XG4gICAgICAgICAgICAgICAgVG9vbGJhci5jaGFuZ2VUb29sYmFyVmlkZW9JY29uKGlzTXV0ZWQpO1xuXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTXV0ZXMgLyB1bm11dGVzIGF1ZGlvIGZvciB0aGUgbG9jYWwgcGFydGljaXBhbnQuXG4gICAgICovXG4gICAgbXkudG9nZ2xlQXVkaW8gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghKFJUQ0FjdGl2YXRvci5nZXRSVENTZXJ2aWNlKCkubG9jYWxBdWRpbykpIHtcbiAgICAgICAgICAgIFRvb2xiYXIucHJlTXV0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgLy8gV2Ugc3RpbGwgY2xpY2sgdGhlIGJ1dHRvbi5cbiAgICAgICAgICAgIGJ1dHRvbkNsaWNrKFwiI211dGVcIiwgXCJpY29uLW1pY3JvcGhvbmUgaWNvbi1taWMtZGlzYWJsZWRcIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBYTVBQQWN0aXZhdG9yLnRvZ2dsZUF1ZGlvTXV0ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBidXR0b25DbGljayhcIiNtdXRlXCIsIFwiaWNvbi1taWNyb3Bob25lIGljb24tbWljLWRpc2FibGVkXCIpO1xuICAgICAgICB9KTtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE9wZW5zIHRoZSBsb2NrIHJvb20gZGlhbG9nLlxuICAgICAqL1xuICAgIG15Lm9wZW5Mb2NrRGlhbG9nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBPbmx5IHRoZSBmb2N1cyBpcyBhYmxlIHRvIHNldCBhIHNoYXJlZCBrZXkuXG4gICAgICAgIGlmICghWE1QUEFjdGl2YXRvci5pc0ZvY3VzKCkpIHtcbiAgICAgICAgICAgIGlmIChUb29sYmFyLnNoYXJlZEtleSkge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5NZXNzYWdlRGlhbG9nKG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBcIlRoaXMgY29udmVyc2F0aW9uIGlzIGN1cnJlbnRseSBwcm90ZWN0ZWQgYnlcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICBcIiBhIHNoYXJlZCBzZWNyZXQga2V5LlwiLFxuICAgICAgICAgICAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgXCJTZWNyZXQga2V5XCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5vcGVuTWVzc2FnZURpYWxvZyhudWxsLFxuICAgICAgICAgICAgICAgICAgICBcIlRoaXMgY29udmVyc2F0aW9uIGlzbid0IGN1cnJlbnRseSBwcm90ZWN0ZWQgYnlcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICBcIiBhIHNlY3JldCBrZXkuIE9ubHkgdGhlIG93bmVyIG9mIHRoZSBjb25mZXJlbmNlXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgXCIgY291bGQgc2V0IGEgc2hhcmVkIGtleS5cIixcbiAgICAgICAgICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIFwiU2VjcmV0IGtleVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChUb29sYmFyLnNoYXJlZEtleSkge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5Ud29CdXR0b25EaWFsb2cobnVsbCxcbiAgICAgICAgICAgICAgICAgICAgXCJBcmUgeW91IHN1cmUgeW91IHdvdWxkIGxpa2UgdG8gcmVtb3ZlIHlvdXIgc2VjcmV0IGtleT9cIixcbiAgICAgICAgICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIFwiUmVtb3ZlXCIsXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlLCB2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFRvb2xiYXIuc2V0U2hhcmVkS2V5KCcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NrUm9vbShmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5vcGVuVHdvQnV0dG9uRGlhbG9nKG51bGwsXG4gICAgICAgICAgICAgICAgICAgICc8aDI+U2V0IGEgc2VjcmV0IGtleSB0byBsb2NrIHlvdXIgcm9vbTwvaDI+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnPGlucHV0IGlkPVwibG9ja0tleVwiIHR5cGU9XCJ0ZXh0XCInICtcbiAgICAgICAgICAgICAgICAgICAgICAgICdwbGFjZWhvbGRlcj1cInlvdXIgc2hhcmVkIGtleVwiIGF1dG9mb2N1cz4nLFxuICAgICAgICAgICAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgXCJTYXZlXCIsXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlLCB2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsb2NrS2V5ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2tLZXknKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsb2NrS2V5LnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFRvb2xiYXIuc2V0U2hhcmVkS2V5KFV0aWwuZXNjYXBlSHRtbChsb2NrS2V5LnZhbHVlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2tSb29tKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2tLZXknKS5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSByb29tIGludml0ZSB1cmwuXG4gICAgICovXG4gICAgbXkudXBkYXRlUm9vbVVybCA9IGZ1bmN0aW9uKG5ld1Jvb21VcmwpIHtcbiAgICAgICAgcm9vbVVybCA9IG5ld1Jvb21Vcmw7XG5cbiAgICAgICAgLy8gSWYgdGhlIGludml0ZSBkaWFsb2cgaGFzIGJlZW4gYWxyZWFkeSBvcGVuZWQgd2UgdXBkYXRlIHRoZSBpbmZvcm1hdGlvbi5cbiAgICAgICAgdmFyIGludml0ZUxpbmsgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaW52aXRlTGlua1JlZicpO1xuICAgICAgICBpZiAoaW52aXRlTGluaykge1xuICAgICAgICAgICAgaW52aXRlTGluay52YWx1ZSA9IHJvb21Vcmw7XG4gICAgICAgICAgICBpbnZpdGVMaW5rLnNlbGVjdCgpO1xuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pxaV9zdGF0ZTBfYnV0dG9uSW52aXRlJykuZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE9wZW5zIHRoZSBpbnZpdGUgbGluayBkaWFsb2cuXG4gICAgICovXG4gICAgbXkub3BlbkxpbmtEaWFsb2cgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpbnZpdGVMaW5rO1xuICAgICAgICBpZiAocm9vbVVybCA9PSBudWxsKSB7XG4gICAgICAgICAgICBpbnZpdGVMaW5rID0gXCJZb3VyIGNvbmZlcmVuY2UgaXMgY3VycmVudGx5IGJlaW5nIGNyZWF0ZWQuLi5cIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGludml0ZUxpbmsgPSBlbmNvZGVVUkkocm9vbVVybCk7XG4gICAgICAgIH1cbiAgICAgICAgbWVzc2FnZUhhbmRsZXIub3BlblR3b0J1dHRvbkRpYWxvZyhcbiAgICAgICAgICAgIFwiU2hhcmUgdGhpcyBsaW5rIHdpdGggZXZlcnlvbmUgeW91IHdhbnQgdG8gaW52aXRlXCIsXG4gICAgICAgICAgICAnPGlucHV0IGlkPVwiaW52aXRlTGlua1JlZlwiIHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCInICtcbiAgICAgICAgICAgICAgICBpbnZpdGVMaW5rICsgJ1wiIG9uY2xpY2s9XCJ0aGlzLnNlbGVjdCgpO1wiIHJlYWRvbmx5PicsXG4gICAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICAgIFwiSW52aXRlXCIsXG4gICAgICAgICAgICBmdW5jdGlvbiAoZSwgdikge1xuICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyb29tVXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnZpdGVQYXJ0aWNpcGFudHMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJvb21VcmwpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ludml0ZUxpbmtSZWYnKS5zZWxlY3QoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanFpX3N0YXRlMF9idXR0b25JbnZpdGUnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEludml0ZSBwYXJ0aWNpcGFudHMgdG8gY29uZmVyZW5jZS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpbnZpdGVQYXJ0aWNpcGFudHMoKSB7XG4gICAgICAgIGlmIChyb29tVXJsID09IG51bGwpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgdmFyIHNoYXJlZEtleVRleHQgPSBcIlwiO1xuICAgICAgICBpZiAoVG9vbGJhci5zaGFyZWRLZXkgJiYgVG9vbGJhci5zaGFyZWRLZXkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgc2hhcmVkS2V5VGV4dCA9XG4gICAgICAgICAgICAgICAgXCJUaGlzIGNvbmZlcmVuY2UgaXMgcGFzc3dvcmQgcHJvdGVjdGVkLiBQbGVhc2UgdXNlIHRoZSBcIiArXG4gICAgICAgICAgICAgICAgXCJmb2xsb3dpbmcgcGluIHdoZW4gam9pbmluZzolMEQlMEElMEQlMEFcIiArXG4gICAgICAgICAgICAgICAgICAgIFRvb2xiYXIuc2hhcmVkS2V5ICsgXCIlMEQlMEElMEQlMEFcIjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjb25mZXJlbmNlTmFtZSA9IHJvb21Vcmwuc3Vic3RyaW5nKHJvb21VcmwubGFzdEluZGV4T2YoJy8nKSArIDEpO1xuICAgICAgICB2YXIgc3ViamVjdCA9IFwiSW52aXRhdGlvbiB0byBhIEppdHNpIE1lZXQgKFwiICsgY29uZmVyZW5jZU5hbWUgKyBcIilcIjtcbiAgICAgICAgdmFyIGJvZHkgPSBcIkhleSB0aGVyZSwgSSUyN2QgbGlrZSB0byBpbnZpdGUgeW91IHRvIGEgSml0c2kgTWVldFwiICtcbiAgICAgICAgICAgICAgICAgICAgXCIgY29uZmVyZW5jZSBJJTI3dmUganVzdCBzZXQgdXAuJTBEJTBBJTBEJTBBXCIgK1xuICAgICAgICAgICAgICAgICAgICBcIlBsZWFzZSBjbGljayBvbiB0aGUgZm9sbG93aW5nIGxpbmsgaW4gb3JkZXJcIiArXG4gICAgICAgICAgICAgICAgICAgIFwiIHRvIGpvaW4gdGhlIGNvbmZlcmVuY2UuJTBEJTBBJTBEJTBBXCIgK1xuICAgICAgICAgICAgICAgICAgICByb29tVXJsICtcbiAgICAgICAgICAgICAgICAgICAgXCIlMEQlMEElMEQlMEFcIiArXG4gICAgICAgICAgICAgICAgICAgIHNoYXJlZEtleVRleHQgK1xuICAgICAgICAgICAgICAgICAgICBcIk5vdGUgdGhhdCBKaXRzaSBNZWV0IGlzIGN1cnJlbnRseSBvbmx5IHN1cHBvcnRlZCBieSBDaHJvbWl1bSxcIiArXG4gICAgICAgICAgICAgICAgICAgIFwiIEdvb2dsZSBDaHJvbWUgYW5kIE9wZXJhLCBzbyB5b3UgbmVlZFwiICtcbiAgICAgICAgICAgICAgICAgICAgXCIgdG8gYmUgdXNpbmcgb25lIG9mIHRoZXNlIGJyb3dzZXJzLiUwRCUwQSUwRCUwQVwiICtcbiAgICAgICAgICAgICAgICAgICAgXCJUYWxrIHRvIHlvdSBpbiBhIHNlYyFcIjtcblxuICAgICAgICBpZiAod2luZG93LmxvY2FsU3RvcmFnZS5kaXNwbGF5bmFtZSkge1xuICAgICAgICAgICAgYm9keSArPSBcIiUwRCUwQSUwRCUwQVwiICsgd2luZG93LmxvY2FsU3RvcmFnZS5kaXNwbGF5bmFtZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdpbmRvdy5vcGVuKFwibWFpbHRvOj9zdWJqZWN0PVwiICsgc3ViamVjdCArIFwiJmJvZHk9XCIgKyBib2R5LCAnX2JsYW5rJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogT3BlbnMgdGhlIHNldHRpbmdzIGRpYWxvZy5cbiAgICAgKi9cbiAgICBteS5vcGVuU2V0dGluZ3NEaWFsb2cgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5Ud29CdXR0b25EaWFsb2coXG4gICAgICAgICAgICAnPGgyPkNvbmZpZ3VyZSB5b3VyIGNvbmZlcmVuY2U8L2gyPicgK1xuICAgICAgICAgICAgICAgICc8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgaWQ9XCJpbml0TXV0ZWRcIj4nICtcbiAgICAgICAgICAgICAgICAnUGFydGljaXBhbnRzIGpvaW4gbXV0ZWQ8YnIvPicgK1xuICAgICAgICAgICAgICAgICc8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgaWQ9XCJyZXF1aXJlTmlja25hbWVzXCI+JyArXG4gICAgICAgICAgICAgICAgJ1JlcXVpcmUgbmlja25hbWVzPGJyLz48YnIvPicgK1xuICAgICAgICAgICAgICAgICdTZXQgYSBzZWNyZXQga2V5IHRvIGxvY2sgeW91ciByb29tOicgK1xuICAgICAgICAgICAgICAgICc8aW5wdXQgaWQ9XCJsb2NrS2V5XCIgdHlwZT1cInRleHRcIiBwbGFjZWhvbGRlcj1cInlvdXIgc2hhcmVkIGtleVwiJyArXG4gICAgICAgICAgICAgICAgJ2F1dG9mb2N1cz4nLFxuICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgXCJTYXZlXCIsXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2tLZXknKS5mb2N1cygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChlLCB2KSB7XG4gICAgICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQoJyNpbml0TXV0ZWQnKS5pcyhcIjpjaGVja2VkXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpdCBpcyBjaGVja2VkXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoJCgnI3JlcXVpcmVOaWNrbmFtZXMnKS5pcyhcIjpjaGVja2VkXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpdCBpcyBjaGVja2VkXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxvY2tLZXkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9ja0tleScpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChsb2NrS2V5LnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRTaGFyZWRLZXkobG9ja0tleS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NrUm9vbSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB0aGUgYXBwbGljYXRpb24gaW4gYW5kIG91dCBvZiBmdWxsIHNjcmVlbiBtb2RlXG4gICAgICogKGEuay5hLiBwcmVzZW50YXRpb24gbW9kZSBpbiBDaHJvbWUpLlxuICAgICAqL1xuICAgIG15LnRvZ2dsZUZ1bGxTY3JlZW4gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGZzRWxlbWVudCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcblxuICAgICAgICBpZiAoIWRvY3VtZW50Lm1vekZ1bGxTY3JlZW4gJiYgIWRvY3VtZW50LndlYmtpdElzRnVsbFNjcmVlbikge1xuICAgICAgICAgICAgLy9FbnRlciBGdWxsIFNjcmVlblxuICAgICAgICAgICAgaWYgKGZzRWxlbWVudC5tb3pSZXF1ZXN0RnVsbFNjcmVlbikge1xuICAgICAgICAgICAgICAgIGZzRWxlbWVudC5tb3pSZXF1ZXN0RnVsbFNjcmVlbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZnNFbGVtZW50LndlYmtpdFJlcXVlc3RGdWxsU2NyZWVuKEVsZW1lbnQuQUxMT1dfS0VZQk9BUkRfSU5QVVQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy9FeGl0IEZ1bGwgU2NyZWVuXG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQubW96Q2FuY2VsRnVsbFNjcmVlbikge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50Lm1vekNhbmNlbEZ1bGxTY3JlZW4oKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQud2Via2l0Q2FuY2VsRnVsbFNjcmVlbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBsb2NrIGJ1dHRvbiBzdGF0ZS5cbiAgICAgKi9cbiAgICBteS51cGRhdGVMb2NrQnV0dG9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGJ1dHRvbkNsaWNrKFwiI2xvY2tJY29uXCIsIFwiaWNvbi1zZWN1cml0eSBpY29uLXNlY3VyaXR5LWxvY2tlZFwiKTtcbiAgICB9O1xuXG4gICAgLy8gU2hvd3Mgb3IgaGlkZXMgdGhlICdyZWNvcmRpbmcnIGJ1dHRvbi5cbiAgICBteS5zaG93UmVjb3JkaW5nQnV0dG9uID0gZnVuY3Rpb24gKHNob3cpIHtcbiAgICAgICAgaWYgKCFjb25maWcuZW5hYmxlUmVjb3JkaW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc2hvdykge1xuICAgICAgICAgICAgJCgnI3JlY29yZGluZycpLmNzcyh7ZGlzcGxheTogXCJpbmxpbmVcIn0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgJCgnI3JlY29yZGluZycpLmNzcyh7ZGlzcGxheTogXCJub25lXCJ9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBUb2dnbGUgdGhlIHN0YXRlIG9mIHRoZSByZWNvcmRpbmcgYnV0dG9uXG4gICAgbXkudG9nZ2xlUmVjb3JkaW5nQnV0dG9uU3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJCgnI3JlY29yZEJ1dHRvbicpLnRvZ2dsZUNsYXNzKCdhY3RpdmUnKTtcbiAgICB9O1xuXG4gICAgLy8gU2hvd3Mgb3IgaGlkZXMgU0lQIGNhbGxzIGJ1dHRvblxuICAgIG15LnNob3dTaXBDYWxsQnV0dG9uID0gZnVuY3Rpb24oc2hvdyl7XG4gICAgICAgIGlmIChjb25maWcuaG9zdHMuY2FsbF9jb250cm9sICYmIHNob3cpIHtcbiAgICAgICAgICAgICQoJyNzaXBDYWxsQnV0dG9uJykuY3NzKHtkaXNwbGF5OiBcImlubGluZVwifSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjc2lwQ2FsbEJ1dHRvbicpLmNzcyh7ZGlzcGxheTogXCJub25lXCJ9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gbXk7XG59KFRvb2xiYXIgfHwge30pKTtcblxubW9kdWxlLmV4cG9ydHMgPSBUb29sYmFyO1xuIiwidmFyIFRvb2xiYXIgPSByZXF1aXJlKFwiLi90b29sYmFyXCIpO1xuXG52YXIgVG9vbGJhclRvZ2dsZXIgPSAoZnVuY3Rpb24obXkpIHtcbiAgICB2YXIgdG9vbGJhclRpbWVvdXRPYmplY3QsXG4gICAgICAgIHRvb2xiYXJUaW1lb3V0ID0gaW50ZXJmYWNlQ29uZmlnLklOSVRJQUxfVE9PTEJBUl9USU1FT1VUO1xuXG4gICAgLyoqXG4gICAgICogU2hvd3MgdGhlIG1haW4gdG9vbGJhci5cbiAgICAgKi9cbiAgICBteS5zaG93VG9vbGJhciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgaGVhZGVyID0gJChcIiNoZWFkZXJcIiksXG4gICAgICAgICAgICBib3R0b21Ub29sYmFyID0gJChcIiNib3R0b21Ub29sYmFyXCIpO1xuICAgICAgICBpZiAoIWhlYWRlci5pcygnOnZpc2libGUnKSB8fCAhYm90dG9tVG9vbGJhci5pcyhcIjp2aXNpYmxlXCIpKSB7XG4gICAgICAgICAgICBoZWFkZXIuc2hvdyhcInNsaWRlXCIsIHsgZGlyZWN0aW9uOiBcInVwXCIsIGR1cmF0aW9uOiAzMDB9KTtcbiAgICAgICAgICAgICQoJyNzdWJqZWN0JykuYW5pbWF0ZSh7dG9wOiBcIis9NDBcIn0sIDMwMCk7XG4gICAgICAgICAgICBpZighYm90dG9tVG9vbGJhci5pcyhcIjp2aXNpYmxlXCIpKSB7XG4gICAgICAgICAgICAgICAgYm90dG9tVG9vbGJhci5zaG93KFwic2xpZGVcIiwge2RpcmVjdGlvbjogXCJyaWdodFwiLGR1cmF0aW9uOiAzMDB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRvb2xiYXJUaW1lb3V0T2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRvb2xiYXJUaW1lb3V0T2JqZWN0KTtcbiAgICAgICAgICAgICAgICB0b29sYmFyVGltZW91dE9iamVjdCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0b29sYmFyVGltZW91dE9iamVjdCA9IHNldFRpbWVvdXQoaGlkZVRvb2xiYXIsIHRvb2xiYXJUaW1lb3V0KTtcbiAgICAgICAgICAgIHRvb2xiYXJUaW1lb3V0ID0gaW50ZXJmYWNlQ29uZmlnLlRPT0xCQVJfVElNRU9VVDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChYTVBQQWN0aXZhdG9yLmlzRm9jdXMoKSlcbiAgICAgICAge1xuLy8gICAgICAgICAgICBUT0RPOiBFbmFibGUgc2V0dGluZ3MgZnVuY3Rpb25hbGl0eS4gTmVlZCB0byB1bmNvbW1lbnQgdGhlIHNldHRpbmdzIGJ1dHRvbiBpbiBpbmRleC5odG1sLlxuLy8gICAgICAgICAgICAkKCcjc2V0dGluZ3NCdXR0b24nKS5jc3Moe3Zpc2liaWxpdHk6XCJ2aXNpYmxlXCJ9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNob3cvaGlkZSBkZXNrdG9wIHNoYXJpbmcgYnV0dG9uXG4gICAgICAgIHNob3dEZXNrdG9wU2hhcmluZ0J1dHRvbigpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBIaWRlcyB0aGUgdG9vbGJhci5cbiAgICAgKi9cbiAgICB2YXIgaGlkZVRvb2xiYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBoZWFkZXIgPSAkKFwiI2hlYWRlclwiKSxcbiAgICAgICAgICAgIGJvdHRvbVRvb2xiYXIgPSAkKFwiI2JvdHRvbVRvb2xiYXJcIik7XG4gICAgICAgIHZhciBpc1Rvb2xiYXJIb3ZlciA9IGZhbHNlO1xuICAgICAgICBoZWFkZXIuZmluZCgnKicpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGlkID0gJCh0aGlzKS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgaWYgKCQoXCIjXCIgKyBpZCArIFwiOmhvdmVyXCIpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBpc1Rvb2xiYXJIb3ZlciA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZigkKFwiI2JvdHRvbVRvb2xiYXI6aG92ZXJcIikubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGlzVG9vbGJhckhvdmVyID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNsZWFyVGltZW91dCh0b29sYmFyVGltZW91dE9iamVjdCk7XG4gICAgICAgIHRvb2xiYXJUaW1lb3V0T2JqZWN0ID0gbnVsbDtcblxuICAgICAgICBpZiAoIWlzVG9vbGJhckhvdmVyKSB7XG4gICAgICAgICAgICBoZWFkZXIuaGlkZShcInNsaWRlXCIsIHsgZGlyZWN0aW9uOiBcInVwXCIsIGR1cmF0aW9uOiAzMDB9KTtcbiAgICAgICAgICAgICQoJyNzdWJqZWN0JykuYW5pbWF0ZSh7dG9wOiBcIi09NDBcIn0sIDMwMCk7XG4gICAgICAgICAgICBpZigkKFwiI3JlbW90ZVZpZGVvc1wiKS5oYXNDbGFzcyhcImhpZGRlblwiKSkge1xuICAgICAgICAgICAgICAgIGJvdHRvbVRvb2xiYXIuaGlkZShcInNsaWRlXCIsIHtkaXJlY3Rpb246IFwicmlnaHRcIiwgZHVyYXRpb246IDMwMH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdG9vbGJhclRpbWVvdXRPYmplY3QgPSBzZXRUaW1lb3V0KGhpZGVUb29sYmFyLCB0b29sYmFyVGltZW91dCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICAvKipcbiAgICAgKiBEb2Nrcy91bmRvY2tzIHRoZSB0b29sYmFyLlxuICAgICAqXG4gICAgICogQHBhcmFtIGlzRG9jayBpbmRpY2F0ZXMgd2hhdCBvcGVyYXRpb24gdG8gcGVyZm9ybVxuICAgICAqL1xuICAgIG15LmRvY2tUb29sYmFyID0gZnVuY3Rpb24oaXNEb2NrKSB7XG4gICAgICAgIGlmIChpc0RvY2spIHtcbiAgICAgICAgICAgIC8vIEZpcnN0IG1ha2Ugc3VyZSB0aGUgdG9vbGJhciBpcyBzaG93bi5cbiAgICAgICAgICAgIGlmICghJCgnI2hlYWRlcicpLmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICAgICAgICAgICAgVG9vbGJhclRvZ2dsZXIuc2hvd1Rvb2xiYXIoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVGhlbiBjbGVhciB0aGUgdGltZSBvdXQsIHRvIGRvY2sgdGhlIHRvb2xiYXIuXG4gICAgICAgICAgICBpZiAodG9vbGJhclRpbWVvdXRPYmplY3QpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodG9vbGJhclRpbWVvdXRPYmplY3QpO1xuICAgICAgICAgICAgICAgIHRvb2xiYXJUaW1lb3V0T2JqZWN0ID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmICghJCgnI2hlYWRlcicpLmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICAgICAgICAgICAgVG9vbGJhclRvZ2dsZXIuc2hvd1Rvb2xiYXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRvb2xiYXJUaW1lb3V0T2JqZWN0ID0gc2V0VGltZW91dChoaWRlVG9vbGJhciwgdG9vbGJhclRpbWVvdXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgcmV0dXJuIG15O1xufShUb29sYmFyVG9nZ2xlciB8fCB7fSkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRvb2xiYXJUb2dnbGVyO1xuIiwidmFyIFJUQ0Jyb3dzZXJUeXBlID0ge1xuICAgIFJUQ19CUk9XU0VSX0NIUk9NRTogXCJydGNfYnJvd3Nlci5jaHJvbWVcIixcblxuICAgIFJUQ19CUk9XU0VSX0ZJUkVGT1g6IFwicnRjX2Jyb3dzZXIuZmlyZWZveFwiXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJUQ0Jyb3dzZXJUeXBlOyIsInZhciBTdHJlYW1FdmVudFR5cGVzID0ge1xuICAgIEVWRU5UX1RZUEVfTE9DQUxfQ1JFQVRFRDogXCJzdHJlYW0ubG9jYWxfY3JlYXRlZFwiLFxuXG4gICAgRVZFTlRfVFlQRV9MT0NBTF9FTkRFRDogXCJzdHJlYW0ubG9jYWxfZW5kZWRcIixcblxuICAgIEVWRU5UX1RZUEVfUkVNT1RFX0NSRUFURUQ6IFwic3RyZWFtLnJlbW90ZV9jcmVhdGVkXCIsXG5cbiAgICBFVkVOVF9UWVBFX1JFTU9URV9FTkRFRDogXCJzdHJlYW0ucmVtb3RlX2VuZGVkXCJcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3RyZWFtRXZlbnRUeXBlczsiLCIvKipcbiAqIENyZWF0ZWQgYnkgaHJpc3RvIG9uIDEwLzI5LzE0LlxuICovXG52YXIgWE1QUEV2ZW50cyA9IHtcbiAgICBDT05GRVJFTkNFX0NFUkFURUQ6IFwieG1wcC5jb25mZXJlbmNlQ3JlYXRlZC5qaW5nbGVcIixcbiAgICBDQUxMX1RFUk1JTkFURUQ6IFwieG1wcC5jYWxsdGVybWluYXRlZC5qaW5nbGVcIixcbiAgICBDQUxMX0lOQ09NSU5HOiBcInhtcHAuY2FsbGluY29taW5nLmppbmdsZVwiLFxuICAgIERJU1BPU0VfQ09ORkVSRU5DRTogXCJ4bXBwLmRpc3BvY2VfY29uZmVybmNlXCIsXG4gICAgRElTUExBWV9OQU1FX0NIQU5HRUQ6IFwieG1wcC5kaXNwbGF5X25hbWVfY2hhbmdlZFwiXG5cbn07XG5tb2R1bGUuZXhwb3J0cyA9IFhNUFBFdmVudHM7IiwidmFyIFJvb21OYW1lR2VuZXJhdG9yID0gZnVuY3Rpb24obXkpIHtcblxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBuZXcgUm9vbU5hbWVHZW5lcmF0b3Igb2JqZWN0LlxuICAgICAqIEBjb25zdHJ1Y3RvciBjb25zdHJ1Y3RzIG5ldyBSb29tTmFtZUdlbmVyYXRvciBvYmplY3QuXG4gICAgICovXG4gICAgZnVuY3Rpb24gUm9vbU5hbWVHZW5lcmF0b3JQcm90bygpXG4gICAge1xuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBzZXBhcmF0b3IgdGhlIHdvcmRzIGluIHRoZSByb29tIG5hbWVcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIHZhciBERUZBVUxUX1NFUEFSQVRPUiA9IFwiLVwiO1xuXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBudW1iZXIgb2Ygd29yZHMgaW4gdGhlIHJvb20gbmFtZS5cbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIHZhciBOVU1CRVJfT0ZfV09SRFMgPSAzO1xuXG5cbiAgICAvKipcbiAgICAgKiBUaGUgbGlzdCB3aXRoIHdvcmRzLlxuICAgICAqIEB0eXBlIHtzdHJpbmdbXX1cbiAgICAgKi9cbiAgICB2YXIgd29yZHMgPSBbXG4gICAgICAgIFwiZGVmaW5pdGVcIiwgXCJpbmRlZmluaXRlXCIsIFwiYXJ0aWNsZXNcIiwgXCJuYW1lXCIsIFwicHJlcG9zaXRpb25cIiwgXCJoZWxwXCIsIFwidmVyeVwiLCBcInRvXCIsIFwidGhyb3VnaFwiLCBcImFuZFwiLCBcImp1c3RcIixcbiAgICAgICAgXCJhXCIsIFwiZm9ybVwiLCBcImluXCIsIFwic2VudGVuY2VcIiwgXCJpc1wiLCBcImdyZWF0XCIsIFwiaXRcIiwgXCJ0aGlua1wiLCBcInlvdVwiLCBcInNheVwiLCBcInRoYXRcIiwgXCJoZWxwXCIsIFwiaGVcIiwgXCJsb3dcIiwgXCJ3YXNcIixcbiAgICAgICAgXCJsaW5lXCIsIFwiZm9yXCIsIFwiZGlmZmVyXCIsIFwib25cIiwgXCJ0dXJuXCIsIFwiYXJlXCIsIFwiY2F1c2VcIiwgXCJ3aXRoXCIsIFwibXVjaFwiLCBcImFzXCIsIFwibWVhblwiLCBcImJlZm9yZVwiLCBcImhpc1wiLCBcIm1vdmVcIixcbiAgICAgICAgXCJ0aGV5XCIsIFwicmlnaHRcIiwgXCJiZVwiLCBcImJveVwiLCBcImF0XCIsIFwib2xkXCIsIFwib25lXCIsIFwidG9vXCIsIFwiaGF2ZVwiLCBcInNhbWVcIiwgXCJ0aGlzXCIsIFwidGVsbFwiLCBcImZyb21cIiwgXCJkb2VzXCIsIFwib3JcIixcbiAgICAgICAgXCJzZXRcIiwgXCJoYWRcIiwgXCJ0aHJlZVwiLCBcImJ5XCIsIFwid2FudFwiLCBcImhvdFwiLCBcImFpclwiLCBcIndvcmRcIiwgXCJ3ZWxsXCIsIFwiYnV0XCIsIFwiYWxzb1wiLCBcIndoYXRcIiwgXCJwbGF5XCIsIFwic29tZVwiLCBcInNtYWxsXCIsXG4gICAgICAgIFwid2VcIiwgXCJlbmRcIiwgXCJjYW5cIiwgXCJwdXRcIiwgXCJvdXRcIiwgXCJob21lXCIsIFwib3RoZXJcIiwgXCJyZWFkXCIsIFwid2VyZVwiLCBcImhhbmRcIiwgXCJhbGxcIiwgXCJwb3J0XCIsIFwidGhlcmVcIiwgXCJsYXJnZVwiLFxuICAgICAgICBcIndoZW5cIiwgXCJzcGVsbFwiLCBcInVwXCIsIFwiYWRkXCIsIFwidXNlXCIsIFwiZXZlblwiLCBcInlvdXJcIiwgXCJsYW5kXCIsIFwiaG93XCIsIFwiaGVyZVwiLCBcInNhaWRcIiwgXCJtdXN0XCIsIFwiYW5cIiwgXCJiaWdcIiwgXCJlYWNoXCIsXG4gICAgICAgIFwiaGlnaFwiLCBcInNoZVwiLCBcInN1Y2hcIiwgXCJ3aGljaFwiLCBcImZvbGxvd1wiLCBcImRvXCIsIFwiYWN0XCIsIFwidGhlaXJcIiwgXCJ3aHlcIiwgXCJ0aW1lXCIsIFwiYXNrXCIsIFwiaWZcIiwgXCJtZW5cIiwgXCJ3aWxsXCIsIFwiY2hhbmdlXCIsXG4gICAgICAgIFwid2F5XCIsIFwid2VudFwiLCBcImFib3V0XCIsIFwibGlnaHRcIiwgXCJtYW55XCIsIFwia2luZFwiLCBcInRoZW5cIiwgXCJvZmZcIiwgXCJ0aGVtXCIsIFwibmVlZFwiLCBcIndyaXRlXCIsIFwiaG91c2VcIiwgXCJ3b3VsZFwiLFxuICAgICAgICBcInBpY3R1cmVcIiwgXCJsaWtlXCIsIFwidHJ5XCIsIFwic29cIiwgXCJ1c1wiLCBcInRoZXNlXCIsIFwiYWdhaW5cIiwgXCJoZXJcIiwgXCJhbmltYWxcIiwgXCJsb25nXCIsIFwicG9pbnRcIiwgXCJtYWtlXCIsIFwibW90aGVyXCIsXG4gICAgICAgIFwidGhpbmdcIiwgXCJ3b3JsZFwiLCBcInNlZVwiLCBcIm5lYXJcIiwgXCJoaW1cIiwgXCJidWlsZFwiLCBcInR3b1wiLCBcInNlbGZcIiwgXCJoYXNcIiwgXCJlYXJ0aFwiLCBcImxvb2tcIiwgXCJmYXRoZXJcIiwgXCJtb3JlXCIsIFwiaGVhZFwiLFxuICAgICAgICBcImRheVwiLCBcInN0YW5kXCIsIFwiY291bGRcIiwgXCJvd25cIiwgXCJnb1wiLCBcInBhZ2VcIiwgXCJjb21lXCIsIFwic2hvdWxkXCIsIFwiZGlkXCIsIFwiY291bnRyeVwiLCBcIm51bWJlclwiLCBcImZvdW5kXCIsIFwic291bmRcIixcbiAgICAgICAgXCJhbnN3ZXJcIiwgXCJub1wiLCBcInNjaG9vbFwiLCBcIm1vc3RcIiwgXCJncm93XCIsIFwicGVvcGxlXCIsIFwic3R1ZHlcIiwgXCJteVwiLCBcInN0aWxsXCIsIFwib3ZlclwiLCBcImxlYXJuXCIsIFwia25vd1wiLCBcInBsYW50XCIsXG4gICAgICAgIFwid2F0ZXJcIiwgXCJjb3ZlclwiLCBcInRoYW5cIiwgXCJmb29kXCIsIFwiY2FsbFwiLCBcInN1blwiLCBcImZpcnN0XCIsIFwiZm91clwiLCBcIndob1wiLCBcImJldHdlZW5cIiwgXCJtYXlcIiwgXCJzdGF0ZVwiLCBcImRvd25cIixcbiAgICAgICAgXCJrZWVwXCIsIFwic2lkZVwiLCBcImV5ZVwiLCBcImJlZW5cIiwgXCJuZXZlclwiLCBcIm5vd1wiLCBcImxhc3RcIiwgXCJmaW5kXCIsIFwibGV0XCIsIFwiYW55XCIsIFwidGhvdWdodFwiLCBcIm5ld1wiLCBcImNpdHlcIiwgXCJ3b3JrXCIsXG4gICAgICAgIFwidHJlZVwiLCBcInBhcnRcIiwgXCJjcm9zc1wiLCBcInRha2VcIiwgXCJmYXJtXCIsIFwiZ2V0XCIsIFwiaGFyZFwiLCBcInBsYWNlXCIsIFwic3RhcnRcIiwgXCJtYWRlXCIsIFwibWlnaHRcIiwgXCJsaXZlXCIsIFwic3RvcnlcIixcbiAgICAgICAgXCJ3aGVyZVwiLCBcInNhd1wiLCBcImFmdGVyXCIsIFwiZmFyXCIsIFwiYmFja1wiLCBcInNlYVwiLCBcImxpdHRsZVwiLCBcImRyYXdcIiwgXCJvbmx5XCIsIFwibGVmdFwiLCBcInJvdW5kXCIsIFwibGF0ZVwiLCBcIm1hblwiLCBcInJ1blwiLFxuICAgICAgICBcInllYXJcIiwgXCJkb24ndFwiLCBcImNhbWVcIiwgXCJ3aGlsZVwiLCBcInNob3dcIiwgXCJwcmVzc1wiLCBcImV2ZXJ5XCIsIFwiY2xvc2VcIiwgXCJnb29kXCIsIFwibmlnaHRcIiwgXCJtZVwiLCBcInJlYWxcIiwgXCJnaXZlXCIsXG4gICAgICAgIFwibGlmZVwiLCBcIm91clwiLCBcImZld1wiLCBcInVuZGVyXCIsIFwibm9ydGhcIiwgXCJvcGVuXCIsIFwidGVuXCIsIFwic2VlbVwiLCBcInNpbXBsZVwiLCBcInRvZ2V0aGVyXCIsIFwic2V2ZXJhbFwiLCBcIm5leHRcIiwgXCJ2b3dlbFwiLFxuICAgICAgICBcIndoaXRlXCIsIFwidG93YXJkXCIsIFwiY2hpbGRyZW5cIiwgXCJ3YXJcIiwgXCJiZWdpblwiLCBcImxheVwiLCBcImdvdFwiLCBcImFnYWluc3RcIiwgXCJ3YWxrXCIsIFwicGF0dGVyblwiLCBcImV4YW1wbGVcIiwgXCJzbG93XCIsXG4gICAgICAgIFwiZWFzZVwiLCBcImNlbnRlclwiLCBcInBhcGVyXCIsIFwibG92ZVwiLCBcImdyb3VwXCIsIFwicGVyc29uXCIsIFwiYWx3YXlzXCIsIFwibW9uZXlcIiwgXCJtdXNpY1wiLCBcInNlcnZlXCIsIFwidGhvc2VcIiwgXCJhcHBlYXJcIixcbiAgICAgICAgXCJib3RoXCIsIFwicm9hZFwiLCBcIm1hcmtcIiwgXCJtYXBcIiwgXCJvZnRlblwiLCBcInJhaW5cIiwgXCJsZXR0ZXJcIiwgXCJydWxlXCIsIFwidW50aWxcIiwgXCJnb3Zlcm5cIiwgXCJtaWxlXCIsIFwicHVsbFwiLCBcInJpdmVyXCIsXG4gICAgICAgIFwiY29sZFwiLCBcImNhclwiLCBcIm5vdGljZVwiLCBcImZlZXRcIiwgXCJ2b2ljZVwiLCBcImNhcmVcIiwgXCJ1bml0XCIsIFwic2Vjb25kXCIsIFwicG93ZXJcIiwgXCJib29rXCIsIFwidG93blwiLCBcImNhcnJ5XCIsIFwiZmluZVwiLFxuICAgICAgICBcInRvb2tcIiwgXCJjZXJ0YWluXCIsIFwic2NpZW5jZVwiLCBcImZseVwiLCBcImVhdFwiLCBcImZhbGxcIiwgXCJyb29tXCIsIFwibGVhZFwiLCBcImZyaWVuZFwiLCBcImNyeVwiLCBcImJlZ2FuXCIsIFwiZGFya1wiLCBcImlkZWFcIixcbiAgICAgICAgXCJtYWNoaW5lXCIsIFwiZmlzaFwiLCBcIm5vdGVcIiwgXCJtb3VudGFpblwiLCBcIndhaXRcIiwgXCJzdG9wXCIsIFwicGxhblwiLCBcIm9uY2VcIiwgXCJmaWd1cmVcIiwgXCJiYXNlXCIsIFwic3RhclwiLCBcImhlYXJcIiwgXCJib3hcIixcbiAgICAgICAgXCJob3JzZVwiLCBcIm5vdW5cIiwgXCJjdXRcIiwgXCJmaWVsZFwiLCBcInN1cmVcIiwgXCJyZXN0XCIsIFwid2F0Y2hcIiwgXCJjb3JyZWN0XCIsIFwiY29sb3JcIiwgXCJhYmxlXCIsIFwiZmFjZVwiLCBcInBvdW5kXCIsIFwid29vZFwiLFxuICAgICAgICBcImRvbmVcIiwgXCJtYWluXCIsIFwiYmVhdXR5XCIsIFwiZW5vdWdoXCIsIFwiZHJpdmVcIiwgXCJwbGFpblwiLCBcInN0b29kXCIsIFwiZ2lybFwiLCBcImNvbnRhaW5cIiwgXCJ1c3VhbFwiLCBcImZyb250XCIsIFwieW91bmdcIixcbiAgICAgICAgXCJ0ZWFjaFwiLCBcInJlYWR5XCIsIFwid2Vla1wiLCBcImFib3ZlXCIsIFwiZmluYWxcIiwgXCJldmVyXCIsIFwiZ2F2ZVwiLCBcInJlZFwiLCBcImdyZWVuXCIsIFwibGlzdFwiLCBcIm9oXCIsIFwidGhvdWdoXCIsIFwicXVpY2tcIixcbiAgICAgICAgXCJmZWVsXCIsIFwiZGV2ZWxvcFwiLCBcInRhbGtcIiwgXCJvY2VhblwiLCBcImJpcmRcIiwgXCJ3YXJtXCIsIFwic29vblwiLCBcImZyZWVcIiwgXCJib2R5XCIsIFwibWludXRlXCIsIFwiZG9nXCIsIFwic3Ryb25nXCIsIFwiZmFtaWx5XCIsXG4gICAgICAgIFwic3BlY2lhbFwiLCBcImRpcmVjdFwiLCBcIm1pbmRcIiwgXCJwb3NlXCIsIFwiYmVoaW5kXCIsIFwibGVhdmVcIiwgXCJjbGVhclwiLCBcInNvbmdcIiwgXCJ0YWlsXCIsIFwibWVhc3VyZVwiLCBcInByb2R1Y2VcIiwgXCJkb29yXCIsXG4gICAgICAgIFwiZmFjdFwiLCBcInByb2R1Y3RcIiwgXCJzdHJlZXRcIiwgXCJibGFja1wiLCBcImluY2hcIiwgXCJzaG9ydFwiLCBcIm11bHRpcGx5XCIsIFwibnVtZXJhbFwiLCBcIm5vdGhpbmdcIiwgXCJjbGFzc1wiLCBcImNvdXJzZVwiLCBcIndpbmRcIixcbiAgICAgICAgXCJzdGF5XCIsIFwicXVlc3Rpb25cIiwgXCJ3aGVlbFwiLCBcImhhcHBlblwiLCBcImZ1bGxcIiwgXCJjb21wbGV0ZVwiLCBcImZvcmNlXCIsIFwic2hpcFwiLCBcImJsdWVcIiwgXCJhcmVhXCIsIFwib2JqZWN0XCIsIFwiaGFsZlwiLFxuICAgICAgICBcImRlY2lkZVwiLCBcInJvY2tcIiwgXCJzdXJmYWNlXCIsIFwib3JkZXJcIiwgXCJkZWVwXCIsIFwiZmlyZVwiLCBcIm1vb25cIiwgXCJzb3V0aFwiLCBcImlzbGFuZFwiLCBcInByb2JsZW1cIiwgXCJmb290XCIsIFwicGllY2VcIixcbiAgICAgICAgXCJzeXN0ZW1cIiwgXCJ0b2xkXCIsIFwiYnVzeVwiLCBcImtuZXdcIiwgXCJ0ZXN0XCIsIFwicGFzc1wiLCBcInJlY29yZFwiLCBcInNpbmNlXCIsIFwiYm9hdFwiLCBcInRvcFwiLCBcImNvbW1vblwiLCBcIndob2xlXCIsIFwiZ29sZFwiLFxuICAgICAgICBcImtpbmdcIiwgXCJwb3NzaWJsZVwiLCBcInNwYWNlXCIsIFwicGxhbmVcIiwgXCJoZWFyZFwiLCBcInN0ZWFkXCIsIFwiYmVzdFwiLCBcImRyeVwiLCBcImhvdXJcIiwgXCJ3b25kZXJcIiwgXCJiZXR0ZXJcIiwgXCJsYXVnaFwiLFxuICAgICAgICBcInRydWVcIiwgXCJ0aG91c2FuZFwiLCBcImR1cmluZ1wiLCBcImFnb1wiLCBcImh1bmRyZWRcIiwgXCJyYW5cIiwgXCJmaXZlXCIsIFwiY2hlY2tcIiwgXCJyZW1lbWJlclwiLCBcImdhbWVcIiwgXCJzdGVwXCIsIFwic2hhcGVcIixcbiAgICAgICAgXCJlYXJseVwiLCBcImVxdWF0ZVwiLCBcImhvbGRcIiwgXCJob3RcIiwgXCJ3ZXN0XCIsIFwibWlzc1wiLCBcImdyb3VuZFwiLCBcImJyb3VnaHRcIiwgXCJpbnRlcmVzdFwiLCBcImhlYXRcIiwgXCJyZWFjaFwiLCBcInNub3dcIixcbiAgICAgICAgXCJmYXN0XCIsIFwidGlyZVwiLCBcInZlcmJcIiwgXCJicmluZ1wiLCBcInNpbmdcIiwgXCJ5ZXNcIiwgXCJsaXN0ZW5cIiwgXCJkaXN0YW50XCIsIFwic2l4XCIsIFwiZmlsbFwiLCBcInRhYmxlXCIsIFwiZWFzdFwiLCBcInRyYXZlbFwiLFxuICAgICAgICBcInBhaW50XCIsIFwibGVzc1wiLCBcImxhbmd1YWdlXCIsIFwibW9ybmluZ1wiLCBcImFtb25nXCIsIFwiZ3JhbmRcIiwgXCJjYXRcIiwgXCJiYWxsXCIsIFwiY2VudHVyeVwiLCBcInlldFwiLCBcImNvbnNpZGVyXCIsIFwid2F2ZVwiLFxuICAgICAgICBcInR5cGVcIiwgXCJkcm9wXCIsIFwibGF3XCIsIFwiaGVhcnRcIiwgXCJiaXRcIiwgXCJhbVwiLCBcImNvYXN0XCIsIFwicHJlc2VudFwiLCBcImNvcHlcIiwgXCJoZWF2eVwiLCBcInBocmFzZVwiLCBcImRhbmNlXCIsIFwic2lsZW50XCIsXG4gICAgICAgIFwiZW5naW5lXCIsIFwidGFsbFwiLCBcInBvc2l0aW9uXCIsIFwic2FuZFwiLCBcImFybVwiLCBcInNvaWxcIiwgXCJ3aWRlXCIsIFwicm9sbFwiLCBcInNhaWxcIiwgXCJ0ZW1wZXJhdHVyZVwiLCBcIm1hdGVyaWFsXCIsIFwiZmluZ2VyXCIsXG4gICAgICAgIFwic2l6ZVwiLCBcImluZHVzdHJ5XCIsIFwidmFyeVwiLCBcInZhbHVlXCIsIFwic2V0dGxlXCIsIFwiZmlnaHRcIiwgXCJzcGVha1wiLCBcImxpZVwiLCBcIndlaWdodFwiLCBcImJlYXRcIiwgXCJnZW5lcmFsXCIsIFwiZXhjaXRlXCIsXG4gICAgICAgIFwiaWNlXCIsIFwibmF0dXJhbFwiLCBcIm1hdHRlclwiLCBcInZpZXdcIiwgXCJjaXJjbGVcIiwgXCJzZW5zZVwiLCBcInBhaXJcIiwgXCJlYXJcIiwgXCJpbmNsdWRlXCIsIFwiZWxzZVwiLCBcImRpdmlkZVwiLCBcInF1aXRlXCIsXG4gICAgICAgIFwic3lsbGFibGVcIiwgXCJicm9rZVwiLCBcImZlbHRcIiwgXCJjYXNlXCIsIFwicGVyaGFwc1wiLCBcIm1pZGRsZVwiLCBcInBpY2tcIiwgXCJraWxsXCIsIFwic3VkZGVuXCIsIFwic29uXCIsIFwiY291bnRcIiwgXCJsYWtlXCIsXG4gICAgICAgIFwic3F1YXJlXCIsIFwibW9tZW50XCIsIFwicmVhc29uXCIsIFwic2NhbGVcIiwgXCJsZW5ndGhcIiwgXCJsb3VkXCIsIFwicmVwcmVzZW50XCIsIFwic3ByaW5nXCIsIFwiYXJ0XCIsIFwib2JzZXJ2ZVwiLCBcInN1YmplY3RcIixcbiAgICAgICAgXCJjaGlsZFwiLCBcInJlZ2lvblwiLCBcInN0cmFpZ2h0XCIsIFwiZW5lcmd5XCIsIFwiY29uc29uYW50XCIsIFwiaHVudFwiLCBcIm5hdGlvblwiLCBcInByb2JhYmxlXCIsIFwiZGljdGlvbmFyeVwiLCBcImJlZFwiLCBcIm1pbGtcIixcbiAgICAgICAgXCJicm90aGVyXCIsIFwic3BlZWRcIiwgXCJlZ2dcIiwgXCJtZXRob2RcIiwgXCJyaWRlXCIsIFwib3JnYW5cIiwgXCJjZWxsXCIsIFwicGF5XCIsIFwiYmVsaWV2ZVwiLCBcImFnZVwiLCBcImZyYWN0aW9uXCIsIFwic2VjdGlvblwiLFxuICAgICAgICBcImZvcmVzdFwiLCBcImRyZXNzXCIsIFwic2l0XCIsIFwiY2xvdWRcIiwgXCJyYWNlXCIsIFwic3VycHJpc2VcIiwgXCJ3aW5kb3dcIiwgXCJxdWlldFwiLCBcInN0b3JlXCIsIFwic3RvbmVcIiwgXCJzdW1tZXJcIiwgXCJ0aW55XCIsXG4gICAgICAgIFwidHJhaW5cIiwgXCJjbGltYlwiLCBcInNsZWVwXCIsIFwiY29vbFwiLCBcInByb3ZlXCIsIFwiZGVzaWduXCIsIFwibG9uZVwiLCBcInBvb3JcIiwgXCJsZWdcIiwgXCJsb3RcIiwgXCJleGVyY2lzZVwiLCBcImV4cGVyaW1lbnRcIixcbiAgICAgICAgXCJ3YWxsXCIsIFwiYm90dG9tXCIsIFwiY2F0Y2hcIiwgXCJrZXlcIiwgXCJtb3VudFwiLCBcImlyb25cIiwgXCJ3aXNoXCIsIFwic2luZ2xlXCIsIFwic2t5XCIsIFwic3RpY2tcIiwgXCJib2FyZFwiLCBcImZsYXRcIiwgXCJqb3lcIixcbiAgICAgICAgXCJ0d2VudHlcIiwgXCJ3aW50ZXJcIiwgXCJza2luXCIsIFwic2F0XCIsIFwic21pbGVcIiwgXCJ3cml0dGVuXCIsIFwiY3JlYXNlXCIsIFwid2lsZFwiLCBcImhvbGVcIiwgXCJpbnN0cnVtZW50XCIsIFwidHJhZGVcIiwgXCJrZXB0XCIsXG4gICAgICAgIFwibWVsb2R5XCIsIFwiZ2xhc3NcIiwgXCJ0cmlwXCIsIFwiZ3Jhc3NcIiwgXCJvZmZpY2VcIiwgXCJjb3dcIiwgXCJyZWNlaXZlXCIsIFwiam9iXCIsIFwicm93XCIsIFwiZWRnZVwiLCBcIm1vdXRoXCIsIFwic2lnblwiLCBcImV4YWN0XCIsXG4gICAgICAgIFwidmlzaXRcIiwgXCJzeW1ib2xcIiwgXCJwYXN0XCIsIFwiZGllXCIsIFwic29mdFwiLCBcImxlYXN0XCIsIFwiZnVuXCIsIFwidHJvdWJsZVwiLCBcImJyaWdodFwiLCBcInNob3V0XCIsIFwiZ2FzXCIsIFwiZXhjZXB0XCIsXG4gICAgICAgIFwid2VhdGhlclwiLCBcIndyb3RlXCIsIFwibW9udGhcIiwgXCJzZWVkXCIsIFwibWlsbGlvblwiLCBcInRvbmVcIiwgXCJiZWFyXCIsIFwiam9pblwiLCBcImZpbmlzaFwiLCBcInN1Z2dlc3RcIiwgXCJoYXBweVwiLCBcImNsZWFuXCIsXG4gICAgICAgIFwiaG9wZVwiLCBcImJyZWFrXCIsIFwiZmxvd2VyXCIsIFwibGFkeVwiLCBcImNsb3RoZVwiLCBcInlhcmRcIiwgXCJzdHJhbmdlXCIsIFwicmlzZVwiLCBcImdvbmVcIiwgXCJiYWRcIiwgXCJqdW1wXCIsIFwiYmxvd1wiLCBcImJhYnlcIixcbiAgICAgICAgXCJvaWxcIiwgXCJlaWdodFwiLCBcImJsb29kXCIsIFwidmlsbGFnZVwiLCBcInRvdWNoXCIsIFwibWVldFwiLCBcImdyZXdcIiwgXCJyb290XCIsIFwiY2VudFwiLCBcImJ1eVwiLCBcIm1peFwiLCBcInJhaXNlXCIsIFwidGVhbVwiLFxuICAgICAgICBcInNvbHZlXCIsIFwid2lyZVwiLCBcIm1ldGFsXCIsIFwiY29zdFwiLCBcIndoZXRoZXJcIiwgXCJsb3N0XCIsIFwicHVzaFwiLCBcImJyb3duXCIsIFwic2V2ZW5cIiwgXCJ3ZWFyXCIsIFwicGFyYWdyYXBoXCIsIFwiZ2FyZGVuXCIsXG4gICAgICAgIFwidGhpcmRcIiwgXCJlcXVhbFwiLCBcInNoYWxsXCIsIFwic2VudFwiLCBcImhlbGRcIiwgXCJjaG9vc2VcIiwgXCJoYWlyXCIsIFwiZmVsbFwiLCBcImRlc2NyaWJlXCIsIFwiZml0XCIsIFwiY29va1wiLCBcImZsb3dcIiwgXCJmbG9vclwiLFxuICAgICAgICBcImZhaXJcIiwgXCJlaXRoZXJcIiwgXCJiYW5rXCIsIFwicmVzdWx0XCIsIFwiY29sbGVjdFwiLCBcImJ1cm5cIiwgXCJzYXZlXCIsIFwiaGlsbFwiLCBcImNvbnRyb2xcIiwgXCJzYWZlXCIsIFwiZGVjaW1hbFwiLCBcInJhbmtcIixcbiAgICAgICAgXCJ3b3JkXCIsIFwicmVmZXJlbmNlXCIsIFwiZ2VudGxlXCIsIFwidHJ1Y2tcIiwgXCJ3b21hblwiLCBcIm5vaXNlXCIsIFwiY2FwdGFpblwiLCBcImxldmVsXCIsXG4gICAgICAgIFwicHJhY3RpY2VcIiwgXCJjaGFuY2VcIiwgXCJzZXBhcmF0ZVwiLCBcImdhdGhlclwiLCBcImRpZmZpY3VsdFwiLCBcInNob3BcIiwgXCJkb2N0b3JcIiwgXCJzdHJldGNoXCIsIFwicGxlYXNlXCIsIFwidGhyb3dcIixcbiAgICAgICAgXCJwcm90ZWN0XCIsIFwic2hpbmVcIiwgXCJub29uXCIsIFwicHJvcGVydHlcIiwgXCJ3aG9zZVwiLCBcImNvbHVtblwiLCBcImxvY2F0ZVwiLCBcIm1vbGVjdWxlXCIsIFwicmluZ1wiLCBcInNlbGVjdFwiLCBcImNoYXJhY3RlclwiLFxuICAgICAgICBcIndyb25nXCIsIFwiaW5zZWN0XCIsIFwiZ3JheVwiLCBcImNhdWdodFwiLCBcInJlcGVhdFwiLCBcInBlcmlvZFwiLCBcInJlcXVpcmVcIiwgXCJpbmRpY2F0ZVwiLCBcImJyb2FkXCIsIFwicmFkaW9cIiwgXCJwcmVwYXJlXCIsXG4gICAgICAgIFwic3Bva2VcIiwgXCJzYWx0XCIsIFwiYXRvbVwiLCBcIm5vc2VcIiwgXCJodW1hblwiLCBcInBsdXJhbFwiLCBcImhpc3RvcnlcIiwgXCJhbmdlclwiLCBcImVmZmVjdFwiLCBcImNsYWltXCIsIFwiZWxlY3RyaWNcIixcbiAgICAgICAgXCJjb250aW5lbnRcIiwgXCJleHBlY3RcIiwgXCJveHlnZW5cIiwgXCJjcm9wXCIsIFwic3VnYXJcIiwgXCJtb2Rlcm5cIiwgXCJkZWF0aFwiLCBcImVsZW1lbnRcIiwgXCJwcmV0dHlcIiwgXCJoaXRcIiwgXCJza2lsbFwiLFxuICAgICAgICBcInN0dWRlbnRcIiwgXCJ3b21lblwiLCBcImNvcm5lclwiLCBcInNlYXNvblwiLCBcInBhcnR5XCIsIFwic29sdXRpb25cIiwgXCJzdXBwbHlcIiwgXCJtYWduZXRcIiwgXCJib25lXCIsIFwic2lsdmVyXCIsIFwicmFpbFwiLFxuICAgICAgICBcInRoYW5rXCIsIFwiaW1hZ2luZVwiLCBcImJyYW5jaFwiLCBcInByb3ZpZGVcIiwgXCJtYXRjaFwiLCBcImFncmVlXCIsIFwic3VmZml4XCIsIFwidGh1c1wiLCBcImVzcGVjaWFsbHlcIiwgXCJjYXBpdGFsXCIsIFwiZmlnXCIsXG4gICAgICAgIFwid29uJ3RcIiwgXCJhZnJhaWRcIiwgXCJjaGFpclwiLCBcImh1Z2VcIiwgXCJkYW5nZXJcIiwgXCJzaXN0ZXJcIiwgXCJmcnVpdFwiLCBcInN0ZWVsXCIsIFwicmljaFwiLCBcImRpc2N1c3NcIiwgXCJ0aGlja1wiLCBcImZvcndhcmRcIixcbiAgICAgICAgXCJzb2xkaWVyXCIsIFwic2ltaWxhclwiLCBcInByb2Nlc3NcIiwgXCJndWlkZVwiLCBcIm9wZXJhdGVcIiwgXCJleHBlcmllbmNlXCIsIFwiZ3Vlc3NcIiwgXCJzY29yZVwiLCBcIm5lY2Vzc2FyeVwiLCBcImFwcGxlXCIsXG4gICAgICAgIFwic2hhcnBcIiwgXCJib3VnaHRcIiwgXCJ3aW5nXCIsIFwibGVkXCIsIFwiY3JlYXRlXCIsIFwicGl0Y2hcIiwgXCJuZWlnaGJvclwiLCBcImNvYXRcIiwgXCJ3YXNoXCIsIFwibWFzc1wiLCBcImJhdFwiLCBcImNhcmRcIiwgXCJyYXRoZXJcIixcbiAgICAgICAgXCJiYW5kXCIsIFwiY3Jvd2RcIiwgXCJyb3BlXCIsIFwiY29yblwiLCBcInNsaXBcIiwgXCJjb21wYXJlXCIsIFwid2luXCIsIFwicG9lbVwiLCBcImRyZWFtXCIsIFwic3RyaW5nXCIsIFwiZXZlbmluZ1wiLCBcImJlbGxcIixcbiAgICAgICAgXCJjb25kaXRpb25cIiwgXCJkZXBlbmRcIiwgXCJmZWVkXCIsIFwibWVhdFwiLCBcInRvb2xcIiwgXCJydWJcIiwgXCJ0b3RhbFwiLCBcInR1YmVcIiwgXCJiYXNpY1wiLCBcImZhbW91c1wiLCBcInNtZWxsXCIsIFwiZG9sbGFyXCIsXG4gICAgICAgIFwidmFsbGV5XCIsIFwic3RyZWFtXCIsIFwibm9yXCIsIFwiZmVhclwiLCBcImRvdWJsZVwiLCBcInNpZ2h0XCIsIFwic2VhdFwiLCBcInRoaW5cIiwgXCJhcnJpdmVcIiwgXCJ0cmlhbmdsZVwiLCBcIm1hc3RlclwiLCBcInBsYW5ldFwiLFxuICAgICAgICBcInRyYWNrXCIsIFwiaHVycnlcIiwgXCJwYXJlbnRcIiwgXCJjaGllZlwiLCBcInNob3JlXCIsIFwiY29sb255XCIsIFwiZGl2aXNpb25cIiwgXCJjbG9ja1wiLCBcInNoZWV0XCIsIFwibWluZVwiLCBcInN1YnN0YW5jZVwiLCBcInRpZVwiLFxuICAgICAgICBcImZhdm9yXCIsIFwiZW50ZXJcIiwgXCJjb25uZWN0XCIsIFwibWFqb3JcIiwgXCJwb3N0XCIsIFwiZnJlc2hcIiwgXCJzcGVuZFwiLCBcInNlYXJjaFwiLCBcImNob3JkXCIsIFwic2VuZFwiLCBcImZhdFwiLCBcInllbGxvd1wiLFxuICAgICAgICBcImdsYWRcIiwgXCJndW5cIiwgXCJvcmlnaW5hbFwiLCBcImFsbG93XCIsIFwic2hhcmVcIiwgXCJwcmludFwiLCBcInN0YXRpb25cIiwgXCJkZWFkXCIsIFwiZGFkXCIsIFwic3BvdFwiLCBcImJyZWFkXCIsIFwiZGVzZXJ0XCIsXG4gICAgICAgIFwiY2hhcmdlXCIsIFwic3VpdFwiLCBcInByb3BlclwiLCBcImN1cnJlbnRcIiwgXCJiYXJcIiwgXCJsaWZ0XCIsIFwib2ZmZXJcIiwgXCJyb3NlXCIsIFwic2VnbWVudFwiLCBcImNvbnRpbnVlXCIsIFwic2xhdmVcIiwgXCJibG9ja1wiLFxuICAgICAgICBcImR1Y2tcIiwgXCJjaGFydFwiLCBcImluc3RhbnRcIiwgXCJoYXRcIiwgXCJtYXJrZXRcIiwgXCJzZWxsXCIsIFwiZGVncmVlXCIsIFwic3VjY2Vzc1wiLCBcInBvcHVsYXRlXCIsIFwiY29tcGFueVwiLCBcImNoaWNrXCIsXG4gICAgICAgIFwic3VidHJhY3RcIiwgXCJkZWFyXCIsIFwiZXZlbnRcIiwgXCJlbmVteVwiLCBcInBhcnRpY3VsYXJcIiwgXCJyZXBseVwiLCBcImRlYWxcIiwgXCJkcmlua1wiLCBcInN3aW1cIiwgXCJvY2N1clwiLCBcInRlcm1cIiwgXCJzdXBwb3J0XCIsXG4gICAgICAgIFwib3Bwb3NpdGVcIiwgXCJzcGVlY2hcIiwgXCJ3aWZlXCIsIFwibmF0dXJlXCIsIFwic2hvZVwiLCBcInJhbmdlXCIsIFwic2hvdWxkZXJcIiwgXCJzdGVhbVwiLCBcInNwcmVhZFwiLCBcIm1vdGlvblwiLCBcImFycmFuZ2VcIixcbiAgICAgICAgXCJwYXRoXCIsIFwiY2FtcFwiLCBcImxpcXVpZFwiLCBcImludmVudFwiLCBcImxvZ1wiLCBcImNvdHRvblwiLCBcIm1lYW50XCIsIFwiYm9yblwiLCBcInF1b3RpZW50XCIsIFwiZGV0ZXJtaW5lXCIsIFwidGVldGhcIiwgXCJxdWFydFwiLFxuICAgICAgICBcInNoZWxsXCIsIFwibmluZVwiLCBcIm5lY2tcIiwgXCJmYW5jeVwiLCBcImZhblwiLCBcImZvb3RiYWxsXCJcbiAgICBdO1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyByYW5kb20gd29yZCBmcm9tIHRoZSBhcnJheSBvZiB3b3Jkcy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSByYW5kb20gd29yZCBmcm9tIHRoZSBhcnJheSBvZiB3b3Jkcy5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZW5lcmF0ZVdvcmQoKVxuICAgIHtcbiAgICAgICAgcmV0dXJuIHdvcmRzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHdvcmRzLmxlbmd0aCldO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlcyBuZXcgcm9vbSBuYW1lLlxuICAgICAqIEBwYXJhbSBzZXBhcmF0b3IgdGhlIHNlcGFyYXRvciBmb3IgdGhlIHdvcmRzLlxuICAgICAqIEBwYXJhbSBudW1iZXJfb2Zfd29yZHMgbnVtYmVyIG9mIHdvcmRzIGluIHRoZSByb29tIG5hbWVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSB0aGUgcm9vbSBuYW1lXG4gICAgICovXG4gICAgUm9vbU5hbWVHZW5lcmF0b3JQcm90by5nZW5lcmF0ZVJvb20gPSBmdW5jdGlvbihzZXBhcmF0b3IsIG51bWJlcl9vZl93b3JkcylcbiAgICB7XG4gICAgICAgIGlmKCFzZXBhcmF0b3IpXG4gICAgICAgICAgICBzZXBhcmF0b3IgPSBERUZBVUxUX1NFUEFSQVRPUjtcbiAgICAgICAgaWYoIW51bWJlcl9vZl93b3JkcylcbiAgICAgICAgICAgIG51bWJlcl9vZl93b3JkcyA9IE5VTUJFUl9PRl9XT1JEUztcbiAgICAgICAgdmFyIG5hbWUgPSBcIlwiO1xuICAgICAgICBmb3IodmFyIGkgPSAwOyBpPG51bWJlcl9vZl93b3JkczsgaSsrKVxuICAgICAgICAgICAgbmFtZSArPSAoKGkgIT0gMCk/IHNlcGFyYXRvciA6IFwiXCIpICsgZ2VuZXJhdGVXb3JkKCk7XG4gICAgICAgIHJldHVybiBuYW1lO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlcyBuZXcgcm9vbSBuYW1lLlxuICAgICAqIEBwYXJhbSBudW1iZXJfb2Zfd29yZHMgbnVtYmVyIG9mIHdvcmRzIGluIHRoZSByb29tIG5hbWVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSB0aGUgcm9vbSBuYW1lXG4gICAgICovXG4gICAgUm9vbU5hbWVHZW5lcmF0b3JQcm90by5nZW5lcmF0ZVJvb21XaXRob3V0U2VwYXJhdG9yID0gZnVuY3Rpb24obnVtYmVyX29mX3dvcmRzKVxuICAgIHtcbiAgICAgICAgaWYoIW51bWJlcl9vZl93b3JkcylcbiAgICAgICAgICAgIG51bWJlcl9vZl93b3JkcyA9IE5VTUJFUl9PRl9XT1JEUztcbiAgICAgICAgdmFyIG5hbWUgPSBcIlwiO1xuICAgICAgICBmb3IodmFyIGkgPSAwOyBpPG51bWJlcl9vZl93b3JkczsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgd29yZCA9IGdlbmVyYXRlV29yZCgpO1xuICAgICAgICAgICAgd29yZCA9IHdvcmQuc3Vic3RyaW5nKDAsIDEpLnRvVXBwZXJDYXNlKCkgKyB3b3JkLnN1YnN0cmluZygxLCB3b3JkLmxlbmd0aCk7XG4gICAgICAgICAgICBuYW1lICs9IHdvcmQgO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuYW1lO1xuICAgIH1cblxuICAgIHJldHVybiBSb29tTmFtZUdlbmVyYXRvclByb3RvO1xufSgpO1xuXG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iXX0=
