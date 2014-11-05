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
var KeyboardShortcut = require("./keyboard_shortcuts");
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


},{"../service/RTC/StreamEventTypes.js":22,"../service/xmpp/XMPPEvents":23,"./UIService":3,"./VideoLayout.js":5,"./WelcomePage":6,"./audiolevels/AudioLevels.js":7,"./chat/Chat.js":9,"./etherpad/Etherpad.js":12,"./keyboard_shortcuts":13,"./prezi/Prezi.js":14,"./toolbars/BottomToolbar":17,"./toolbars/toolbar":19,"./toolbars/toolbar_toggler":20}],3:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9Db250YWN0TGlzdC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL1VJQWN0aXZhdG9yLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvVUlTZXJ2aWNlLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvVUlVdGlsLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvVmlkZW9MYXlvdXQuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9XZWxjb21lUGFnZS5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL2F1ZGlvbGV2ZWxzL0F1ZGlvTGV2ZWxzLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvYXVkaW9sZXZlbHMvQ2FudmFzVXRpbC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL2NoYXQvQ2hhdC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL2NoYXQvUmVwbGFjZW1lbnQuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9ldGhlcnBhZC9FdGhlcnBhZC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL2tleWJvYXJkX3Nob3J0Y3V0cy5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL3ByZXppL1ByZXppLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvcHJlemkvUHJlemlQbGF5ZXIuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS90b29sYmFycy9Cb3R0b21Ub29sYmFyLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvdG9vbGJhcnMvVG9vbGJhci5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL3Rvb2xiYXJzL3Rvb2xiYXJfdG9nZ2xlci5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L3NlcnZpY2UvUlRDL1JUQ0Jyb3dzZXJUeXBlLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvc2VydmljZS9SVEMvU3RyZWFtRXZlbnRUeXBlcy5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L3NlcnZpY2UveG1wcC9YTVBQRXZlbnRzLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvdXRpbC9yb29tbmFtZV9nZW5lcmF0b3IuanMiLCIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzd2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNwU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbGVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgVmlkZW9MYXlvdXQgPSByZXF1aXJlKFwiLi9WaWRlb0xheW91dC5qc1wiKTtcblxuLyoqXG4gKiBDb250YWN0IGxpc3QuXG4gKi9cbnZhciBDb250YWN0TGlzdCA9IChmdW5jdGlvbiAobXkpIHtcbiAgICAvKipcbiAgICAgKiBJbmRpY2F0ZXMgaWYgdGhlIGNoYXQgaXMgY3VycmVudGx5IHZpc2libGUuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIDx0dD50cnVlPC90dD4gaWYgdGhlIGNoYXQgaXMgY3VycmVudGx5IHZpc2libGUsIDx0dD5mYWxzZTwvdHQ+IC1cbiAgICAgKiBvdGhlcndpc2VcbiAgICAgKi9cbiAgICBteS5pc1Zpc2libGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkKCcjY29udGFjdGxpc3QnKS5pcyhcIjp2aXNpYmxlXCIpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBZGRzIGEgY29udGFjdCBmb3IgdGhlIGdpdmVuIHBlZXJKaWQgaWYgc3VjaCBkb2Vzbid0IHlldCBleGlzdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBwZWVySmlkIHRoZSBwZWVySmlkIGNvcnJlc3BvbmRpbmcgdG8gdGhlIGNvbnRhY3RcbiAgICAgKi9cbiAgICBteS5lbnN1cmVBZGRDb250YWN0ID0gZnVuY3Rpb24ocGVlckppZCkge1xuICAgICAgICB2YXIgcmVzb3VyY2VKaWQgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChwZWVySmlkKTtcblxuICAgICAgICB2YXIgY29udGFjdCA9ICQoJyNjb250YWN0bGlzdD51bD5saVtpZD1cIicgKyByZXNvdXJjZUppZCArICdcIl0nKTtcblxuICAgICAgICBpZiAoIWNvbnRhY3QgfHwgY29udGFjdC5sZW5ndGggPD0gMClcbiAgICAgICAgICAgIENvbnRhY3RMaXN0LmFkZENvbnRhY3QocGVlckppZCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYSBjb250YWN0IGZvciB0aGUgZ2l2ZW4gcGVlciBqaWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGVlckppZCB0aGUgamlkIG9mIHRoZSBjb250YWN0IHRvIGFkZFxuICAgICAqL1xuICAgIG15LmFkZENvbnRhY3QgPSBmdW5jdGlvbihwZWVySmlkKSB7XG4gICAgICAgIHZhciByZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHBlZXJKaWQpO1xuXG4gICAgICAgIHZhciBjb250YWN0bGlzdCA9ICQoJyNjb250YWN0bGlzdD51bCcpO1xuXG4gICAgICAgIHZhciBuZXdDb250YWN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcbiAgICAgICAgbmV3Q29udGFjdC5pZCA9IHJlc291cmNlSmlkO1xuXG4gICAgICAgIG5ld0NvbnRhY3QuYXBwZW5kQ2hpbGQoY3JlYXRlQXZhdGFyKCkpO1xuICAgICAgICBuZXdDb250YWN0LmFwcGVuZENoaWxkKGNyZWF0ZURpc3BsYXlOYW1lUGFyYWdyYXBoKFwiUGFydGljaXBhbnRcIikpO1xuXG4gICAgICAgIHZhciBjbEVsZW1lbnQgPSBjb250YWN0bGlzdC5nZXQoMCk7XG5cbiAgICAgICAgaWYgKHJlc291cmNlSmlkID09PSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChYTVBQQWN0aXZhdG9yLmdldE15SklEKCkpXG4gICAgICAgICAgICAmJiAkKCcjY29udGFjdGxpc3Q+dWwgLnRpdGxlJylbMF0ubmV4dFNpYmxpbmcubmV4dFNpYmxpbmcpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNsRWxlbWVudC5pbnNlcnRCZWZvcmUobmV3Q29udGFjdCxcbiAgICAgICAgICAgICAgICAgICAgJCgnI2NvbnRhY3RsaXN0PnVsIC50aXRsZScpWzBdLm5leHRTaWJsaW5nLm5leHRTaWJsaW5nKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNsRWxlbWVudC5hcHBlbmRDaGlsZChuZXdDb250YWN0KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGEgY29udGFjdCBmb3IgdGhlIGdpdmVuIHBlZXIgamlkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHBlZXJKaWQgdGhlIHBlZXJKaWQgY29ycmVzcG9uZGluZyB0byB0aGUgY29udGFjdCB0byByZW1vdmVcbiAgICAgKi9cbiAgICBteS5yZW1vdmVDb250YWN0ID0gZnVuY3Rpb24ocGVlckppZCkge1xuICAgICAgICB2YXIgcmVzb3VyY2VKaWQgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChwZWVySmlkKTtcblxuICAgICAgICB2YXIgY29udGFjdCA9ICQoJyNjb250YWN0bGlzdD51bD5saVtpZD1cIicgKyByZXNvdXJjZUppZCArICdcIl0nKTtcblxuICAgICAgICBpZiAoY29udGFjdCAmJiBjb250YWN0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBjb250YWN0bGlzdCA9ICQoJyNjb250YWN0bGlzdD51bCcpO1xuXG4gICAgICAgICAgICBjb250YWN0bGlzdC5nZXQoMCkucmVtb3ZlQ2hpbGQoY29udGFjdC5nZXQoMCkpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIE9wZW5zIC8gY2xvc2VzIHRoZSBjb250YWN0IGxpc3QgYXJlYS5cbiAgICAgKi9cbiAgICBteS50b2dnbGVDb250YWN0TGlzdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNvbnRhY3RsaXN0ID0gJCgnI2NvbnRhY3RsaXN0Jyk7XG5cbiAgICAgICAgdmFyIGNoYXRTaXplID0gKENvbnRhY3RMaXN0LmlzVmlzaWJsZSgpKSA/IFswLCAwXSA6IENvbnRhY3RMaXN0LmdldENvbnRhY3RMaXN0U2l6ZSgpO1xuICAgICAgICBWaWRlb0xheW91dC5yZXNpemVWaWRlb1NwYWNlKGNvbnRhY3RsaXN0LCBjaGF0U2l6ZSwgQ29udGFjdExpc3QuaXNWaXNpYmxlKCkpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBzaXplIG9mIHRoZSBjaGF0LlxuICAgICAqL1xuICAgIG15LmdldENvbnRhY3RMaXN0U2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGF2YWlsYWJsZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgdmFyIGF2YWlsYWJsZVdpZHRoID0gd2luZG93LmlubmVyV2lkdGg7XG5cbiAgICAgICAgdmFyIGNoYXRXaWR0aCA9IDIwMDtcbiAgICAgICAgaWYgKGF2YWlsYWJsZVdpZHRoICogMC4yIDwgMjAwKVxuICAgICAgICAgICAgY2hhdFdpZHRoID0gYXZhaWxhYmxlV2lkdGggKiAwLjI7XG5cbiAgICAgICAgcmV0dXJuIFtjaGF0V2lkdGgsIGF2YWlsYWJsZUhlaWdodF07XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgdGhlIGF2YXRhciBlbGVtZW50LlxuICAgICAqXG4gICAgICogQHJldHVybiB0aGUgbmV3bHkgY3JlYXRlZCBhdmF0YXIgZWxlbWVudFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZUF2YXRhcigpIHtcbiAgICAgICAgdmFyIGF2YXRhciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2knKTtcbiAgICAgICAgYXZhdGFyLmNsYXNzTmFtZSA9IFwiaWNvbi1hdmF0YXIgYXZhdGFyXCI7XG5cbiAgICAgICAgcmV0dXJuIGF2YXRhcjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyB0aGUgZGlzcGxheSBuYW1lIHBhcmFncmFwaC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBkaXNwbGF5TmFtZSB0aGUgZGlzcGxheSBuYW1lIHRvIHNldFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZURpc3BsYXlOYW1lUGFyYWdyYXBoKGRpc3BsYXlOYW1lKSB7XG4gICAgICAgIHZhciBwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuICAgICAgICBwLmlubmVySFRNTCA9IGRpc3BsYXlOYW1lO1xuXG4gICAgICAgIHJldHVybiBwO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBJbmRpY2F0ZXMgdGhhdCB0aGUgZGlzcGxheSBuYW1lIGhhcyBjaGFuZ2VkLlxuICAgICAqL1xuICAgIG15Lm9uRGlzcGxheU5hbWVDaGFuZ2VkID1cbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChwZWVySmlkLCBkaXNwbGF5TmFtZSkge1xuICAgICAgICBpZiAocGVlckppZCA9PT0gJ2xvY2FsVmlkZW9Db250YWluZXInKVxuICAgICAgICAgICAgcGVlckppZCA9IFhNUFBBY3RpdmF0b3IuZ2V0TXlKSUQoKTtcblxuICAgICAgICB2YXIgcmVzb3VyY2VKaWQgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChwZWVySmlkKTtcblxuICAgICAgICB2YXIgY29udGFjdE5hbWUgPSAkKCcjY29udGFjdGxpc3QgIycgKyByZXNvdXJjZUppZCArICc+cCcpO1xuXG4gICAgICAgIGlmIChjb250YWN0TmFtZSAmJiBkaXNwbGF5TmFtZSAmJiBkaXNwbGF5TmFtZS5sZW5ndGggPiAwKVxuICAgICAgICAgICAgY29udGFjdE5hbWUuaHRtbChkaXNwbGF5TmFtZSk7XG4gICAgfTtcblxuICAgIHJldHVybiBteTtcbn0oQ29udGFjdExpc3QgfHwge30pKTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGFjdExpc3QiLCJ2YXIgVUlTZXJ2aWNlID0gcmVxdWlyZShcIi4vVUlTZXJ2aWNlXCIpO1xudmFyIFZpZGVvTGF5b3V0ID0gcmVxdWlyZShcIi4vVmlkZW9MYXlvdXQuanNcIik7XG52YXIgQXVkaW9MZXZlbHMgPSByZXF1aXJlKFwiLi9hdWRpb2xldmVscy9BdWRpb0xldmVscy5qc1wiKTtcbnZhciBQcmV6aSA9IHJlcXVpcmUoXCIuL3ByZXppL1ByZXppLmpzXCIpO1xudmFyIEV0aGVycGFkID0gcmVxdWlyZShcIi4vZXRoZXJwYWQvRXRoZXJwYWQuanNcIik7XG52YXIgQ2hhdCA9IHJlcXVpcmUoXCIuL2NoYXQvQ2hhdC5qc1wiKTtcbnZhciBTdHJlYW1FdmVudFR5cGVzID0gcmVxdWlyZShcIi4uL3NlcnZpY2UvUlRDL1N0cmVhbUV2ZW50VHlwZXMuanNcIik7XG52YXIgVG9vbGJhciA9IHJlcXVpcmUoXCIuL3Rvb2xiYXJzL3Rvb2xiYXJcIik7XG52YXIgVG9vbGJhclRvZ2dsZXIgPSByZXF1aXJlKFwiLi90b29sYmFycy90b29sYmFyX3RvZ2dsZXJcIik7XG52YXIgQm90dG9tVG9vbGJhciA9IHJlcXVpcmUoXCIuL3Rvb2xiYXJzL0JvdHRvbVRvb2xiYXJcIik7XG52YXIgS2V5Ym9hcmRTaG9ydGN1dCA9IHJlcXVpcmUoXCIuL2tleWJvYXJkX3Nob3J0Y3V0c1wiKTtcbnZhciBYTVBQRXZlbnRzID0gcmVxdWlyZShcIi4uL3NlcnZpY2UveG1wcC9YTVBQRXZlbnRzXCIpO1xuXG52YXIgVUlBY3RpdmF0b3IgPSBmdW5jdGlvbigpXG57XG4gICAgdmFyIHVpU2VydmljZSA9IG51bGw7XG4gICAgZnVuY3Rpb24gVUlBY3RpdmF0b3JQcm90bygpXG4gICAge1xuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0dXBQcmV6aSgpXG4gICAge1xuICAgICAgICAkKFwiI3Rvb2xiYXJfcHJlemlcIikuY2xpY2soZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICBQcmV6aS5vcGVuUHJlemlEaWFsb2coKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJChcIiNyZWxvYWRQcmVzZW50YXRpb25MaW5rXCIpLmNsaWNrKGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgUHJlemkucmVsb2FkUHJlc2VudGF0aW9uKCk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0dXBFdGhlcnBhZCgpXG4gICAge1xuICAgICAgICAkKFwiI3Rvb2xiYXJfZXRoZXJwYWRcIikuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgRXRoZXJwYWQudG9nZ2xlRXRoZXJwYWQoMCk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0dXBBdWRpb0xldmVscygpIHtcbiAgICAgICAgU3RhdGlzdGljc0FjdGl2YXRvci5hZGRBdWRpb0xldmVsTGlzdGVuZXIoQXVkaW9MZXZlbHMudXBkYXRlQXVkaW9MZXZlbCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0dXBDaGF0KClcbiAgICB7XG4gICAgICAgIENoYXQuaW5pdCgpO1xuICAgICAgICAkKFwiI3Rvb2xiYXJfY2hhdFwiKS5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBDaGF0LnRvZ2dsZUNoYXQoKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXR1cFZpZGVvTGF5b3V0RXZlbnRzKClcbiAgICB7XG5cbiAgICAgICAgJChkb2N1bWVudCkuYmluZCgnY2FsbGFjdGl2ZS5qaW5nbGUnLCBmdW5jdGlvbiAoZXZlbnQsIHZpZGVvZWxlbSwgc2lkKSB7XG4gICAgICAgICAgICBpZiAodmlkZW9lbGVtLmF0dHIoJ2lkJykuaW5kZXhPZignbWl4ZWRtc2xhYmVsJykgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgLy8gaWdub3JlIG1peGVkbXNsYWJlbGEwIGFuZCB2MFxuICAgICAgICAgICAgICAgIHZpZGVvZWxlbS5zaG93KCk7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplVGh1bWJuYWlscygpO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBsYXJnZSB2aWRlbyB0byB0aGUgbGFzdCBhZGRlZCB2aWRlbyBvbmx5IGlmIHRoZXJlJ3Mgbm9cbiAgICAgICAgICAgICAgICAvLyBjdXJyZW50IGFjdGl2ZSBvciBmb2N1c2VkIHNwZWFrZXIuXG4gICAgICAgICAgICAgICAgaWYgKCFWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMgJiYgIVZpZGVvTGF5b3V0LmdldERvbWluYW50U3BlYWtlclJlc291cmNlSmlkKCkpXG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8odmlkZW9lbGVtLmF0dHIoJ3NyYycpLCAxKTtcblxuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dGb2N1c0luZGljYXRvcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXR1cFRvb2xiYXJzKCkge1xuICAgICAgICBUb29sYmFyLmluaXQoKTtcbiAgICAgICAgQm90dG9tVG9vbGJhci5pbml0KCk7XG4gICAgfVxuXG4gICAgVUlBY3RpdmF0b3JQcm90by5zdGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJCgnYm9keScpLnBvcG92ZXIoeyBzZWxlY3RvcjogJ1tkYXRhLXRvZ2dsZT1wb3BvdmVyXScsXG4gICAgICAgICAgICB0cmlnZ2VyOiAnY2xpY2sgaG92ZXInfSk7XG4gICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZUxhcmdlVmlkZW9Db250YWluZXIoKTtcbiAgICAgICAgJChcIiN2aWRlb3NwYWNlXCIpLm1vdXNlbW92ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gVG9vbGJhclRvZ2dsZXIuc2hvd1Rvb2xiYXIoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIFNldCB0aGUgZGVmYXVsdHMgZm9yIHByb21wdCBkaWFsb2dzLlxuICAgICAgICBqUXVlcnkucHJvbXB0LnNldERlZmF1bHRzKHtwZXJzaXN0ZW50OiBmYWxzZX0pO1xuXG4gICAgICAgIEtleWJvYXJkU2hvcnRjdXQuaW5pdCgpO1xuICAgICAgICByZWdpc3Rlckxpc3RlbmVycygpO1xuICAgICAgICBiaW5kRXZlbnRzKCk7XG4gICAgICAgIHNldHVwQXVkaW9MZXZlbHMoKTtcbiAgICAgICAgc2V0dXBWaWRlb0xheW91dEV2ZW50cygpO1xuICAgICAgICBzZXR1cFByZXppKCk7XG4gICAgICAgIHNldHVwRXRoZXJwYWQoKTtcbiAgICAgICAgc2V0dXBUb29sYmFycygpO1xuICAgICAgICBzZXR1cENoYXQoKTtcblxuICAgICAgICBkb2N1bWVudC50aXRsZSA9IGJyYW5kLmFwcE5hbWU7XG5cbiAgICAgICAgJChcIiNkb3dubG9hZGxvZ1wiKS5jbGljayhmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGR1bXAoZXZlbnQudGFyZ2V0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYoY29uZmlnLmVuYWJsZVdlbGNvbWVQYWdlICYmIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSA9PSBcIi9cIiAmJlxuICAgICAgICAgICAgKCF3aW5kb3cubG9jYWxTdG9yYWdlLndlbGNvbWVQYWdlRGlzYWJsZWQgfHwgd2luZG93LmxvY2FsU3RvcmFnZS53ZWxjb21lUGFnZURpc2FibGVkID09IFwiZmFsc2VcIikpXG4gICAgICAgIHtcbiAgICAgICAgICAgICQoXCIjdmlkZW9jb25mZXJlbmNlX3BhZ2VcIikuaGlkZSgpO1xuICAgICAgICAgICAgdmFyIHNldHVwV2VsY29tZVBhZ2UgPSByZXF1aXJlKFwiLi9XZWxjb21lUGFnZVwiKTtcbiAgICAgICAgICAgIHNldHVwV2VsY29tZVBhZ2UoKTtcblxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgJChcIiN3ZWxjb21lX3BhZ2VcIikuaGlkZSgpO1xuXG4gICAgICAgIGlmICghJCgnI3NldHRpbmdzJykuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdpbml0Jyk7XG4gICAgICAgICAgICBpbml0KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2dpbkluZm8ub25zdWJtaXQgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGlmIChlLnByZXZlbnREZWZhdWx0KSBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgJCgnI3NldHRpbmdzJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgIGluaXQoKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIFVJQWN0aXZhdG9yUHJvdG8uc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdWlTZXJ2aWNlLmRpc3Bvc2UoKTtcbiAgICAgICAgdWlTZXJ2aWNlID0gbnVsbDtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlcyB0aGUgbG9nIGRhdGFcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBwb3B1bGF0ZURhdGEoKSB7XG4gICAgICAgIHZhciBkYXRhID0gWE1QUEFjdGl2YXRvci5nZXRKaW5nbGVEYXRhKCk7XG4gICAgICAgIHZhciBtZXRhZGF0YSA9IHt9O1xuICAgICAgICBtZXRhZGF0YS50aW1lID0gbmV3IERhdGUoKTtcbiAgICAgICAgbWV0YWRhdGEudXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWY7XG4gICAgICAgIG1ldGFkYXRhLnVhID0gbmF2aWdhdG9yLnVzZXJBZ2VudDtcbiAgICAgICAgdmFyIGxvZ2dlciA9IFhNUFBBY3RpdmF0b3IuZ2V0TG9nZ2VyKCk7XG4gICAgICAgIGlmIChsb2dnZXIpIHtcbiAgICAgICAgICAgIG1ldGFkYXRhLnhtcHAgPSBsb2dnZXIubG9nO1xuICAgICAgICB9XG4gICAgICAgIGRhdGEubWV0YWRhdGEgPSBtZXRhZGF0YTtcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZHVtcChlbGVtLCBmaWxlbmFtZSkge1xuICAgICAgICBlbGVtID0gZWxlbS5wYXJlbnROb2RlO1xuICAgICAgICBlbGVtLmRvd25sb2FkID0gZmlsZW5hbWUgfHwgJ21lZXRsb2cuanNvbic7XG4gICAgICAgIGVsZW0uaHJlZiA9ICdkYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtOCxcXG4nO1xuICAgICAgICB2YXIgZGF0YSA9IHBvcHVsYXRlRGF0YSgpO1xuICAgICAgICBlbGVtLmhyZWYgKz0gZW5jb2RlVVJJQ29tcG9uZW50KEpTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsICcgICcpKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlZ2lzdGVyTGlzdGVuZXJzKCkge1xuICAgICAgICBSVENBY3RpdmF0b3IuYWRkU3RyZWFtTGlzdGVuZXIoZnVuY3Rpb24gKHN0cmVhbSkge1xuICAgICAgICAgICAgc3dpdGNoIChzdHJlYW0udHlwZSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwiYXVkaW9cIjpcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuY2hhbmdlTG9jYWxBdWRpbyhzdHJlYW0uZ2V0T3JpZ2luYWxTdHJlYW0oKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJ2aWRlb1wiOlxuICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5jaGFuZ2VMb2NhbFZpZGVvKHN0cmVhbS5nZXRPcmlnaW5hbFN0cmVhbSgpLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcImRlc2t0b3BcIjpcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuY2hhbmdlTG9jYWxWaWRlbyhzdHJlYW0sICFpc1VzaW5nU2NyZWVuU3RyZWFtKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIFN0cmVhbUV2ZW50VHlwZXMuRVZFTlRfVFlQRV9MT0NBTF9DUkVBVEVEKTtcblxuICAgICAgICBSVENBY3RpdmF0b3IuYWRkU3RyZWFtTGlzdGVuZXIoZnVuY3Rpb24gKHN0cmVhbSkge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQub25SZW1vdGVTdHJlYW1BZGRlZChzdHJlYW0pO1xuICAgICAgICB9LCBTdHJlYW1FdmVudFR5cGVzLkVWRU5UX1RZUEVfUkVNT1RFX0NSRUFURUQpO1xuICAgICAgICBYTVBQQWN0aXZhdG9yLmFkZExpc3RlbmVyKFhNUFBFdmVudHMuRElTUExBWV9OQU1FX0NIQU5HRUQsXG4gICAgICAgICAgICBmdW5jdGlvbiAocGVlckppZCwgZGlzcGxheU5hbWUsIHN0YXR1cykge1xuICAgICAgICAgICAgICAgIHVpU2VydmljZS5vbkRpc3BsYXlOYW1lQ2hhbmdlZChwZWVySmlkLCBkaXNwbGF5TmFtZSwgc3RhdHVzKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIExpc3RlbiBmb3IgbGFyZ2UgdmlkZW8gc2l6ZSB1cGRhdGVzXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsYXJnZVZpZGVvJylcbiAgICAgICAgICAgIC5hZGRFdmVudExpc3RlbmVyKCdsb2FkZWRtZXRhZGF0YScsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuY3VycmVudFZpZGVvV2lkdGggPSB0aGlzLnZpZGVvV2lkdGg7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuY3VycmVudFZpZGVvSGVpZ2h0ID0gdGhpcy52aWRlb0hlaWdodDtcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5wb3NpdGlvbkxhcmdlKFZpZGVvTGF5b3V0LmN1cnJlbnRWaWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5jdXJyZW50VmlkZW9IZWlnaHQpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBiaW5kRXZlbnRzKClcbiAgICB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXNpemVzIGFuZCByZXBvc2l0aW9ucyB2aWRlb3MgaW4gZnVsbCBzY3JlZW4gbW9kZS5cbiAgICAgICAgICovXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCd3ZWJraXRmdWxsc2NyZWVuY2hhbmdlIG1vemZ1bGxzY3JlZW5jaGFuZ2UgZnVsbHNjcmVlbmNoYW5nZScsXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplTGFyZ2VWaWRlb0NvbnRhaW5lcigpO1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnBvc2l0aW9uTGFyZ2UoKTtcbiAgICAgICAgICAgICAgICB2YXIgaXNGdWxsU2NyZWVuID0gVmlkZW9MYXlvdXQuaXNGdWxsU2NyZWVuKCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNGdWxsU2NyZWVuKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFZpZXcoXCJmdWxsc2NyZWVuXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0VmlldyhcImRlZmF1bHRcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgICQod2luZG93KS5yZXNpemUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplTGFyZ2VWaWRlb0NvbnRhaW5lcigpO1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQucG9zaXRpb25MYXJnZSgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBjdXJyZW50IHZpZXcuXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2V0Vmlldyh2aWV3TmFtZSkge1xuLy8gICAgaWYgKHZpZXdOYW1lID09IFwiZnVsbHNjcmVlblwiKSB7XG4vLyAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ZpZGVvbGF5b3V0X2Z1bGxzY3JlZW4nKS5kaXNhYmxlZCAgPSBmYWxzZTtcbi8vICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndmlkZW9sYXlvdXRfZGVmYXVsdCcpLmRpc2FibGVkICA9IHRydWU7XG4vLyAgICB9XG4vLyAgICBlbHNlIHtcbi8vICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndmlkZW9sYXlvdXRfZGVmYXVsdCcpLmRpc2FibGVkICA9IGZhbHNlO1xuLy8gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd2aWRlb2xheW91dF9mdWxsc2NyZWVuJykuZGlzYWJsZWQgID0gdHJ1ZTtcbi8vICAgIH1cbiAgICB9XG5cbiAgICBVSUFjdGl2YXRvclByb3RvLmdldFJUQ1NlcnZpY2UgPSBmdW5jdGlvbigpXG4gICAge1xuICAgICAgICByZXR1cm4gUlRDQWN0aXZhdG9yLmdldFJUQ1NlcnZpY2UoKTtcbiAgICB9XG5cbiAgICBVSUFjdGl2YXRvclByb3RvLmdldFVJU2VydmljZSA9IGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIGlmKHVpU2VydmljZSA9PSBudWxsKVxuICAgICAgICB7XG4gICAgICAgICAgICB1aVNlcnZpY2UgPSBuZXcgVUlTZXJ2aWNlKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVpU2VydmljZTtcbiAgICB9XG5cbiAgICBVSUFjdGl2YXRvclByb3RvLmNoYXRBZGRFcnJvciA9IGZ1bmN0aW9uKGVycm9yTWVzc2FnZSwgb3JpZ2luYWxUZXh0KVxuICAgIHtcbiAgICAgICAgcmV0dXJuIENoYXQuY2hhdEFkZEVycm9yKGVycm9yTWVzc2FnZSwgb3JpZ2luYWxUZXh0KTtcbiAgICB9XG5cbiAgICBVSUFjdGl2YXRvclByb3RvLmNoYXRTZXRTdWJqZWN0ID0gZnVuY3Rpb24odGV4dClcbiAgICB7XG4gICAgICAgIHJldHVybiBDaGF0LmNoYXRTZXRTdWJqZWN0KHRleHQpO1xuICAgIH1cblxuICAgIFVJQWN0aXZhdG9yUHJvdG8udXBkYXRlQ2hhdENvbnZlcnNhdGlvbiA9IGZ1bmN0aW9uIChmcm9tLCBkaXNwbGF5TmFtZSwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gQ2hhdC51cGRhdGVDaGF0Q29udmVyc2F0aW9uKGZyb20sIGRpc3BsYXlOYW1lLCBtZXNzYWdlKTtcbiAgICB9XG5cblxuICAgIFVJQWN0aXZhdG9yUHJvdG8uYWRkTmlja25hbWVMaXN0ZW5lciA9IGZ1bmN0aW9uKGxpc3RlbmVyKVxuICAgIHtcblxuICAgIH1cblxuICAgIHJldHVybiBVSUFjdGl2YXRvclByb3RvO1xufSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFVJQWN0aXZhdG9yO1xuXG4iLCJ2YXIgQXVkaW9MZXZlbHMgPSByZXF1aXJlKFwiLi9hdWRpb2xldmVscy9BdWRpb0xldmVscy5qc1wiKTtcbnZhciBFdGhlcnBhZCA9IHJlcXVpcmUoXCIuL2V0aGVycGFkL0V0aGVycGFkLmpzXCIpO1xudmFyIFZpZGVvTGF5b3V0ID0gcmVxdWlyZShcIi4vVmlkZW9MYXlvdXQuanNcIik7XG52YXIgVG9vbGJhciA9IHJlcXVpcmUoXCIuL3Rvb2xiYXJzL3Rvb2xiYXIuanNcIik7XG52YXIgVG9vbGJhclRvZ2dsZXIgPSByZXF1aXJlKFwiLi90b29sYmFycy90b29sYmFyX3RvZ2dsZXIuanNcIik7XG52YXIgQ29udGFjdExpc3QgPSByZXF1aXJlKFwiLi9Db250YWN0TGlzdFwiKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpO1xuXG52YXIgVUlTZXJ2aWNlID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgZXZlbnRFbWl0dGVyID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gICAgdmFyIG5pY2tuYW1lID0gbnVsbDtcblxuICAgIHZhciByb29tTmFtZSA9IG51bGw7XG5cbiAgICBmdW5jdGlvbiBVSVNlcnZpY2VQcm90bygpIHtcbiAgICB9XG5cbiAgICBVSVNlcnZpY2VQcm90by5wcm90b3R5cGUudXBkYXRlQXVkaW9MZXZlbENhbnZhcyA9IGZ1bmN0aW9uIChwZWVySmlkKSB7XG4gICAgICAgIEF1ZGlvTGV2ZWxzLnVwZGF0ZUF1ZGlvTGV2ZWxDYW52YXMocGVlckppZCk7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLmluaXRFdGhlcnBhZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgRXRoZXJwYWQuaW5pdCgpO1xuICAgIH1cblxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLmNoZWNrQ2hhbmdlTGFyZ2VWaWRlbyA9IGZ1bmN0aW9uIChyZW1vdmVkVmlkZW9TcmMpIHtcbiAgICAgICAgVmlkZW9MYXlvdXQuY2hlY2tDaGFuZ2VMYXJnZVZpZGVvKHJlbW92ZWRWaWRlb1NyYyk7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLm9uTXVjSm9pbmVkID0gZnVuY3Rpb24gKGppZCwgaW5mbywgbm9NZW1iZXJzKSB7XG4gICAgICAgIFRvb2xiYXIudXBkYXRlUm9vbVVybCh3aW5kb3cubG9jYXRpb24uaHJlZik7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsb2NhbE5pY2snKS5hcHBlbmRDaGlsZChcbiAgICAgICAgICAgIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGppZCkgKyAnIChtZSknKVxuICAgICAgICApO1xuXG4gICAgICAgIGlmIChub01lbWJlcnMpIHtcbiAgICAgICAgICAgIFRvb2xiYXIuc2hvd1NpcENhbGxCdXR0b24odHJ1ZSk7XG4gICAgICAgICAgICBUb29sYmFyLnNob3dSZWNvcmRpbmdCdXR0b24oZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFYTVBQQWN0aXZhdG9yLmlzRm9jdXMoKSkge1xuICAgICAgICAgICAgVG9vbGJhci5zaG93U2lwQ2FsbEJ1dHRvbihmYWxzZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoWE1QUEFjdGl2YXRvci5pc0ZvY3VzKCkgJiYgY29uZmlnLmV0aGVycGFkX2Jhc2UpIHtcbiAgICAgICAgICAgIHRoaXMuaW5pdEV0aGVycGFkKCk7XG4gICAgICAgIH1cblxuICAgICAgICBWaWRlb0xheW91dC5zaG93Rm9jdXNJbmRpY2F0b3IoKTtcblxuICAgICAgICAvLyBBZGQgbXlzZWxmIHRvIHRoZSBjb250YWN0IGxpc3QuXG4gICAgICAgIENvbnRhY3RMaXN0LmFkZENvbnRhY3QoamlkKTtcblxuICAgICAgICAvLyBPbmNlIHdlJ3ZlIGpvaW5lZCB0aGUgbXVjIHNob3cgdGhlIHRvb2xiYXJcbiAgICAgICAgVG9vbGJhclRvZ2dsZXIuc2hvd1Rvb2xiYXIoKTtcblxuICAgICAgICBpZiAoaW5mby5kaXNwbGF5TmFtZSlcbiAgICAgICAgICAgIHRoaXMub25EaXNwbGF5TmFtZUNoYW5nZWQoXG4gICAgICAgICAgICAgICAgJ2xvY2FsVmlkZW9Db250YWluZXInLCBpbmZvLmRpc3BsYXlOYW1lICsgJyAobWUpJyk7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLm9uRGlzcGxheU5hbWVDaGFuZ2VkID0gZnVuY3Rpb24gKHBlZXJKaWQsIGRpc3BsYXlOYW1lLCBzdGF0dXMpIHtcbiAgICAgICAgVmlkZW9MYXlvdXQub25EaXNwbGF5TmFtZUNoYW5nZWQocGVlckppZCwgZGlzcGxheU5hbWUsIHN0YXR1cyk7XG4gICAgICAgIENvbnRhY3RMaXN0Lm9uRGlzcGxheU5hbWVDaGFuZ2VkKHBlZXJKaWQsIGRpc3BsYXlOYW1lKTtcbiAgICB9O1xuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLm9uTXVjRW50ZXJlZCA9IGZ1bmN0aW9uIChqaWQsIGluZm8sIHByZXMsIG5ld0NvbmZlcmVuY2UpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2VudGVyZWQnLCBqaWQsIGluZm8pO1xuXG4gICAgICAgIC8vIEFkZCBQZWVyJ3MgY29udGFpbmVyXG4gICAgICAgIFZpZGVvTGF5b3V0LmVuc3VyZVBlZXJDb250YWluZXJFeGlzdHMoamlkKTtcblxuICAgICAgICBpZihuZXdDb25mZXJlbmNlKVxuICAgICAgICB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnbWFrZSBuZXcgY29uZmVyZW5jZSB3aXRoJywgamlkKTtcbiAgICAgICAgICAgIFRvb2xiYXIuc2hvd1JlY29yZGluZ0J1dHRvbih0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChUb29sYmFyLnNoYXJlZEtleSkge1xuICAgICAgICAgICAgVG9vbGJhci51cGRhdGVMb2NrQnV0dG9uKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBVSVNlcnZpY2VQcm90by5wcm90b3R5cGUub25NdWNQcmVzZW5jZVN0YXR1cyA9IGZ1bmN0aW9uICggamlkLCBpbmZvLCBwcmVzKSB7XG4gICAgICAgIFZpZGVvTGF5b3V0LnNldFByZXNlbmNlU3RhdHVzKFxuICAgICAgICAgICAgICAgICdwYXJ0aWNpcGFudF8nICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKSwgaW5mby5zdGF0dXMpO1xuICAgIH1cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5vbk11Y0xlZnQgPSBmdW5jdGlvbihqaWQpXG4gICAge1xuICAgICAgICAvLyBOZWVkIHRvIGNhbGwgdGhpcyB3aXRoIGEgc2xpZ2h0IGRlbGF5LCBvdGhlcndpc2UgdGhlIGVsZW1lbnQgY291bGRuJ3QgYmVcbiAgICAgICAgLy8gZm91bmQgZm9yIHNvbWUgcmVhc29uLlxuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXG4gICAgICAgICAgICAgICAgICAgICdwYXJ0aWNpcGFudF8nICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKSk7XG4gICAgICAgICAgICBpZiAoY29udGFpbmVyKSB7XG4gICAgICAgICAgICAgICAgLy8gaGlkZSBoZXJlLCB3YWl0IGZvciB2aWRlbyB0byBjbG9zZSBiZWZvcmUgcmVtb3ZpbmdcbiAgICAgICAgICAgICAgICAkKGNvbnRhaW5lcikuaGlkZSgpO1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZVRodW1ibmFpbHMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMTApO1xuXG4gICAgICAgIC8vIFVubG9jayBsYXJnZSB2aWRlb1xuICAgICAgICBpZiAoVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoVmlkZW9MYXlvdXQuZ2V0SmlkRnJvbVZpZGVvU3JjKFZpZGVvTGF5b3V0LmZvY3VzZWRWaWRlb1NyYykgPT09IGppZClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oXCJGb2N1c2VkIHZpZGVvIG93bmVyIGhhcyBsZWZ0IHRoZSBjb25mZXJlbmNlXCIpO1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LmZvY3VzZWRWaWRlb1NyYyA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBVSVNlcnZpY2VQcm90by5wcm90b3R5cGUuc2hvd1ZpZGVvRm9ySklEID0gZnVuY3Rpb24gKGppZCkge1xuICAgICAgICB2YXIgZWwgPSAkKCcjcGFydGljaXBhbnRfJyAgKyBqaWQgKyAnPnZpZGVvJyk7XG4gICAgICAgIGVsLnNob3coKTtcbiAgICB9XG5cbiAgICBVSVNlcnZpY2VQcm90by5wcm90b3R5cGUuaGlkZVZpZGVvRm9ySklEID0gZnVuY3Rpb24gKGppZCkge1xuICAgICAgICB2YXIgZWwgPSAkKCcjcGFydGljaXBhbnRfJyAgKyBqaWQgKyAnPnZpZGVvJyk7XG4gICAgICAgIGVsLmhpZGUoKTtcbiAgICB9XG5cbiAgICBVSVNlcnZpY2VQcm90by5wcm90b3R5cGUuZ2V0U2VsZWN0ZWRKSUQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBsYXJnZVZpZGVvU3JjID0gJCgnI2xhcmdlVmlkZW8nKS5hdHRyKCdzcmMnKTtcbiAgICAgICAgcmV0dXJuIFZpZGVvTGF5b3V0LmdldEppZEZyb21WaWRlb1NyYyhsYXJnZVZpZGVvU3JjKTtcbiAgICB9XG4gICAgXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLnVwZGF0ZUJ1dHRvbnMgPSBmdW5jdGlvbiAocmVjb3JkaW5nLCBzaXApIHtcbiAgICAgICAgaWYocmVjb3JkaW5nICE9IG51bGwpXG4gICAgICAgIHtcbiAgICAgICAgICAgIFRvb2xiYXIuc2hvd1JlY29yZGluZ0J1dHRvbihyZWNvcmRpbmcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoc2lwICE9IG51bGwpXG4gICAgICAgIHtcbiAgICAgICAgICAgIFRvb2xiYXIuc2hvd1NpcENhbGxCdXR0b24oc2lwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS50b2dnbGVBdWRpbyA9IGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIFRvb2xiYXIudG9nZ2xlQXVkaW8oKTtcbiAgICB9O1xuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLmdldENyZWRlbnRpYWxzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY3JlZGVudGlhbHMgPSB7fTtcbiAgICAgICAgY3JlZGVudGlhbHMuamlkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ppZCcpLnZhbHVlXG4gICAgICAgICAgICB8fCBjb25maWcuaG9zdHMuYW5vbnltb3VzZG9tYWluXG4gICAgICAgICAgICB8fCBjb25maWcuaG9zdHMuZG9tYWluIHx8IHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZTtcblxuICAgICAgICBjcmVkZW50aWFscy5ib3NoID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Jvc2hVUkwnKS52YWx1ZSB8fCBjb25maWcuYm9zaCB8fCAnL2h0dHAtYmluZCc7XG4gICAgICAgIGNyZWRlbnRpYWxzLnBhc3N3b3JkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Bhc3N3b3JkJykudmFsdWU7XG4gICAgICAgIHJldHVybiBjcmVkZW50aWFscztcbiAgICB9XG5cbiAgICBVSVNlcnZpY2VQcm90by5wcm90b3R5cGUuYWRkTmlja25hbWVMaXN0ZW5lciA9IGZ1bmN0aW9uIChsaXN0ZW5lcikge1xuICAgICAgICBldmVudEVtaXR0ZXIub24oXCJuaWNrX2NoYW5nZWRcIiwgbGlzdGVuZXIpO1xuICAgICAgICBldmVudEVtaXR0ZXIuZW1pdChcIm5pY2tfY2hhbmdlZFwiLCBuaWNrbmFtZSk7XG5cbiAgICB9XG5cbiAgICBVSVNlcnZpY2VQcm90by5wcm90b3R5cGUucmVtb3ZlTmlja25hbWVMaXN0ZW5lciA9IGZ1bmN0aW9uIChsaXN0ZW5lcikge1xuICAgICAgICBldmVudEVtaXR0ZXIucmVtb3ZlTGlzdGVuZXIoXCJuaWNrX2NoYW5nZWRcIiwgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5kaXNwb3NlID0gZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgZXZlbnRFbWl0dGVyLnJlbW92ZUFsbExpc3RlbmVycyhcInN0YXRpc3RpY3MuYXVkaW9MZXZlbFwiKTtcbiAgICB9XG5cbiAgICBVSVNlcnZpY2VQcm90by5wcm90b3R5cGUuc2V0Tmlja25hbWUgPSBmdW5jdGlvbih2YWx1ZSlcbiAgICB7XG4gICAgICAgIG5pY2tuYW1lID0gdmFsdWU7XG4gICAgICAgIGV2ZW50RW1pdHRlci5lbWl0KFwibmlja19jaGFuZ2VkXCIsIHZhbHVlKTtcbiAgICB9XG5cbiAgICBVSVNlcnZpY2VQcm90by5wcm90b3R5cGUuZ2V0Tmlja25hbWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuaWNrbmFtZTtcbiAgICB9XG5cbiAgICBVSVNlcnZpY2VQcm90by5wcm90b3R5cGUuZ2VuZXJhdGVSb29tTmFtZSA9IGZ1bmN0aW9uIChhdXRoZW50aWNhdGVkVXNlcikge1xuICAgICAgICB2YXIgcm9vbW5vZGUgPSBudWxsO1xuICAgICAgICB2YXIgcGF0aCA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZTtcbiAgICAgICAgdmFyIHJvb21qaWQ7XG5cbiAgICAgICAgLy8gZGV0ZXJtaW5kZSB0aGUgcm9vbSBub2RlIGZyb20gdGhlIHVybFxuICAgICAgICAvLyBUT0RPOiBqdXN0IHRoZSByb29tbm9kZSBvciB0aGUgd2hvbGUgYmFyZSBqaWQ/XG4gICAgICAgIGlmIChjb25maWcuZ2V0cm9vbW5vZGUgJiYgdHlwZW9mIGNvbmZpZy5nZXRyb29tbm9kZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgLy8gY3VzdG9tIGZ1bmN0aW9uIG1pZ2h0IGJlIHJlc3BvbnNpYmxlIGZvciBkb2luZyB0aGUgcHVzaHN0YXRlXG4gICAgICAgICAgICByb29tbm9kZSA9IGNvbmZpZy5nZXRyb29tbm9kZShwYXRoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8qIGZhbGwgYmFjayB0byBkZWZhdWx0IHN0cmF0ZWd5XG4gICAgICAgICAgICAgKiB0aGlzIGlzIG1ha2luZyBhc3N1bXB0aW9ucyBhYm91dCBob3cgdGhlIFVSTC0+cm9vbSBtYXBwaW5nIGhhcHBlbnMuXG4gICAgICAgICAgICAgKiBJdCBjdXJyZW50bHkgYXNzdW1lcyBkZXBsb3ltZW50IGF0IHJvb3QsIHdpdGggYSByZXdyaXRlIGxpa2UgdGhlXG4gICAgICAgICAgICAgKiBmb2xsb3dpbmcgb25lIChmb3IgbmdpbngpOlxuICAgICAgICAgICAgIGxvY2F0aW9uIH4gXi8oW2EtekEtWjAtOV0rKSQge1xuICAgICAgICAgICAgIHJld3JpdGUgXi8oLiopJCAvIGJyZWFrO1xuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaWYgKHBhdGgubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIHJvb21ub2RlID0gcGF0aC5zdWJzdHIoMSkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIHdvcmQgPSBSb29tTmFtZUdlbmVyYXRvci5nZW5lcmF0ZVJvb21XaXRob3V0U2VwYXJhdG9yKDMpO1xuICAgICAgICAgICAgICAgIHJvb21ub2RlID0gd29yZC50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKCdWaWRlb0NoYXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1Jvb206ICcgKyB3b3JkLCB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgKyB3b3JkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJvb21OYW1lID0gcm9vbW5vZGUgKyAnQCcgKyBjb25maWcuaG9zdHMubXVjO1xuXG4gICAgICAgIHZhciByb29tamlkID0gcm9vbU5hbWU7XG4gICAgICAgIHZhciB0bXBKaWQgPSBYTVBQQWN0aXZhdG9yLmdldE93bkpJRE5vZGUoKTtcblxuICAgICAgICBpZiAoY29uZmlnLnVzZU5pY2tzKSB7XG4gICAgICAgICAgICB2YXIgbmljayA9IHdpbmRvdy5wcm9tcHQoJ1lvdXIgbmlja25hbWUgKG9wdGlvbmFsKScpO1xuICAgICAgICAgICAgaWYgKG5pY2spIHtcbiAgICAgICAgICAgICAgICByb29tamlkICs9ICcvJyArIG5pY2s7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJvb21qaWQgKz0gJy8nICsgdG1wSmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYoIWF1dGhlbnRpY2F0ZWRVc2VyKVxuICAgICAgICAgICAgICAgIHRtcEppZCA9IHRtcEppZC5zdWJzdHIoMCwgOCk7XG5cbiAgICAgICAgICAgIHJvb21qaWQgKz0gJy8nICsgdG1wSmlkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByb29tamlkO1xuICAgIH1cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5nZXRSb29tTmFtZSA9IGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIHJldHVybiByb29tTmFtZTtcbiAgICB9XG5cbiAgICBVSVNlcnZpY2VQcm90by5wcm90b3R5cGUuc2hvd0xvZ2luUG9wdXAgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3Bhc3N3b3JkIGlzIHJlcXVpcmVkJyk7XG5cbiAgICAgICAgbWVzc2FnZUhhbmRsZXIub3BlblR3b0J1dHRvbkRpYWxvZyhudWxsLFxuICAgICAgICAgICAgICAgICc8aDI+UGFzc3dvcmQgcmVxdWlyZWQ8L2gyPicgK1xuICAgICAgICAgICAgICAgICc8aW5wdXQgaWQ9XCJwYXNzd29yZHJlcXVpcmVkLnVzZXJuYW1lXCIgdHlwZT1cInRleHRcIiBwbGFjZWhvbGRlcj1cInVzZXJAZG9tYWluLm5ldFwiIGF1dG9mb2N1cz4nICtcbiAgICAgICAgICAgICAgICAnPGlucHV0IGlkPVwicGFzc3dvcmRyZXF1aXJlZC5wYXNzd29yZFwiIHR5cGU9XCJwYXNzd29yZFwiIHBsYWNlaG9sZGVyPVwidXNlciBwYXNzd29yZFwiPicsXG4gICAgICAgICAgICB0cnVlLFxuICAgICAgICAgICAgXCJPa1wiLFxuICAgICAgICAgICAgZnVuY3Rpb24gKGUsIHYsIG0sIGYpIHtcbiAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdXNlcm5hbWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGFzc3dvcmRyZXF1aXJlZC51c2VybmFtZScpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgcGFzc3dvcmQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGFzc3dvcmRyZXF1aXJlZC5wYXNzd29yZCcpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICh1c2VybmFtZS52YWx1ZSAhPT0gbnVsbCAmJiBwYXNzd29yZC52YWx1ZSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh1c2VybmFtZS52YWx1ZSwgcGFzc3dvcmQudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwYXNzd29yZHJlcXVpcmVkLnVzZXJuYW1lJykuZm9jdXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBVSVNlcnZpY2VQcm90by5wcm90b3R5cGUuZGlzYWJsZUNvbm5lY3QgPSBmdW5jdGlvbigpXG4gICAge1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29ubmVjdCcpLmRpc2FibGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBVSVNlcnZpY2VQcm90by5wcm90b3R5cGUuc2hvd0xvY2tQb3B1cCA9IGZ1bmN0aW9uIChqaWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdvbiBwYXNzd29yZCByZXF1aXJlZCcsIGppZCk7XG5cbiAgICAgICAgbWVzc2FnZUhhbmRsZXIub3BlblR3b0J1dHRvbkRpYWxvZyhudWxsLFxuICAgICAgICAgICAgICAgICc8aDI+UGFzc3dvcmQgcmVxdWlyZWQ8L2gyPicgK1xuICAgICAgICAgICAgICAgICc8aW5wdXQgaWQ9XCJsb2NrS2V5XCIgdHlwZT1cInRleHRcIiBwbGFjZWhvbGRlcj1cInNoYXJlZCBrZXlcIiBhdXRvZm9jdXM+JyxcbiAgICAgICAgICAgIHRydWUsXG4gICAgICAgICAgICBcIk9rXCIsXG4gICAgICAgICAgICBmdW5jdGlvbiAoZSwgdiwgbSwgZikge1xuICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsb2NrS2V5ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2tLZXknKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxvY2tLZXkudmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFNoYXJlZEtleShsb2NrS2V5LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGppZCwgbG9ja0tleS52YWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9ja0tleScpLmZvY3VzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfVxuXG5cbiAgICByZXR1cm4gVUlTZXJ2aWNlUHJvdG87XG59KCk7XG5tb2R1bGUuZXhwb3J0cyA9IFVJU2VydmljZTsiLCJcbnZhciBVSVV0aWwgPSAoZnVuY3Rpb24gKG15KSB7XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBhdmFpbGFibGUgdmlkZW8gd2lkdGguXG4gICAgICovXG4gICAgbXkuZ2V0QXZhaWxhYmxlVmlkZW9XaWR0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNoYXRzcGFjZVdpZHRoXG4gICAgICAgICAgICA9ICQoJyNjaGF0c3BhY2UnKS5pcyhcIjp2aXNpYmxlXCIpXG4gICAgICAgICAgICA/ICQoJyNjaGF0c3BhY2UnKS53aWR0aCgpXG4gICAgICAgICAgICA6IDA7XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbm5lcldpZHRoIC0gY2hhdHNwYWNlV2lkdGg7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENoYW5nZXMgdGhlIHN0eWxlIGNsYXNzIG9mIHRoZSBlbGVtZW50IGdpdmVuIGJ5IGlkLlxuICAgICAqL1xuICAgIG15LmJ1dHRvbkNsaWNrID0gZnVuY3Rpb24gKGlkLCBjbGFzc25hbWUpIHtcbiAgICAgICAgJChpZCkudG9nZ2xlQ2xhc3MoY2xhc3NuYW1lKTsgLy8gYWRkIHRoZSBjbGFzcyB0byB0aGUgY2xpY2tlZCBlbGVtZW50XG4gICAgfTtcblxuICAgIHJldHVybiBteTtcblxufSkoVUlVdGlsIHx8IHt9KTtcblxubW9kdWxlLmV4cG9ydHMgPSBVSVV0aWw7IiwidmFyIGRlcCA9XG57XG4gICAgXCJSVENCcm93c2VyVHlwZVwiOiBmdW5jdGlvbigpeyByZXR1cm4gcmVxdWlyZShcIi4uL3NlcnZpY2UvUlRDL1JUQ0Jyb3dzZXJUeXBlLmpzXCIpfSxcbiAgICBcIlVJQWN0aXZhdG9yXCI6IGZ1bmN0aW9uKCl7IHJldHVybiByZXF1aXJlKFwiLi9VSUFjdGl2YXRvci5qc1wiKX0sXG4gICAgXCJDaGF0XCI6IGZ1bmN0aW9uKCl7IHJldHVybiByZXF1aXJlKFwiLi9jaGF0L0NoYXRcIil9LFxuICAgIFwiVUlVdGlsXCI6IGZ1bmN0aW9uKCl7IHJldHVybiByZXF1aXJlKFwiLi9VSVV0aWwuanNcIil9LFxuICAgIFwiQ29udGFjdExpc3RcIjogZnVuY3Rpb24oKXsgcmV0dXJuIHJlcXVpcmUoXCIuL0NvbnRhY3RMaXN0XCIpfSxcbiAgICBcIlRvb2xiYXJcIjogZnVuY3Rpb24oKXsgcmV0dXJuIHJlcXVpcmUoXCIuL3Rvb2xiYXJzL3Rvb2xiYXJfdG9nZ2xlclwiKX1cbn1cblxudmFyIFZpZGVvTGF5b3V0ID0gKGZ1bmN0aW9uIChteSkge1xuICAgIHZhciBjdXJyZW50RG9taW5hbnRTcGVha2VyID0gbnVsbDtcbiAgICB2YXIgbGFzdE5Db3VudCA9IGNvbmZpZy5jaGFubmVsTGFzdE47XG4gICAgdmFyIGxhc3RORW5kcG9pbnRzQ2FjaGUgPSBbXTtcbiAgICB2YXIgbGFyZ2VWaWRlb05ld1NyYyA9ICcnO1xuICAgIHZhciBicm93c2VyID0gbnVsbDtcbiAgICB2YXIgZmxpcFhMb2NhbFZpZGVvID0gdHJ1ZTtcbiAgICBteS5jdXJyZW50VmlkZW9XaWR0aCA9IG51bGw7XG4gICAgbXkuY3VycmVudFZpZGVvSGVpZ2h0ID0gbnVsbDtcbiAgICB2YXIgbG9jYWxWaWRlb1NyYyA9IG51bGw7XG4gICAgdmFyIHZpZGVvU3JjVG9Tc3JjID0ge307XG5cbiAgICB2YXIgbXV0ZWRBdWRpb3MgPSB7fTtcbiAgICAvKipcbiAgICAgKiBDdXJyZW50bHkgZm9jdXNlZCB2aWRlbyBcInNyY1wiKGRpc3BsYXllZCBpbiBsYXJnZSB2aWRlbykuXG4gICAgICogQHR5cGUge1N0cmluZ31cbiAgICAgKi9cbiAgICBteS5mb2N1c2VkVmlkZW9TcmMgPSBudWxsO1xuXG4gICAgZnVuY3Rpb24gYXR0YWNoTWVkaWFTdHJlYW0oZWxlbWVudCwgc3RyZWFtKSB7XG4gICAgICAgIGlmKGJyb3dzZXIgPT0gbnVsbClcbiAgICAgICAge1xuICAgICAgICAgICAgYnJvd3NlciA9IGRlcC5VSUFjdGl2YXRvcigpLmdldFJUQ1NlcnZpY2UoKS5nZXRCcm93c2VyVHlwZSgpO1xuICAgICAgICB9XG4gICAgICAgIHN3aXRjaCAoYnJvd3NlcilcbiAgICAgICAge1xuICAgICAgICAgICAgY2FzZSBkZXAuUlRDQnJvd3NlclR5cGUoKS5SVENfQlJPV1NFUl9DSFJPTUU6XG4gICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKCdzcmMnLCB3ZWJraXRVUkwuY3JlYXRlT2JqZWN0VVJMKHN0cmVhbSkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBkZXAuUlRDQnJvd3NlclR5cGUoKS5SVENfQlJPV1NFUl9GSVJFRk9YOlxuICAgICAgICAgICAgICAgIGVsZW1lbnRbMF0ubW96U3JjT2JqZWN0ID0gc3RyZWFtO1xuICAgICAgICAgICAgICAgIGVsZW1lbnRbMF0ucGxheSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlVua25vd24gYnJvd3Nlci5cIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBteS5jaGFuZ2VMb2NhbEF1ZGlvID0gZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgICAgIGF0dGFjaE1lZGlhU3RyZWFtKCQoJyNsb2NhbEF1ZGlvJyksIHN0cmVhbSk7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsb2NhbEF1ZGlvJykuYXV0b3BsYXkgPSB0cnVlO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9jYWxBdWRpbycpLnZvbHVtZSA9IDA7XG4gICAgICAgIGlmIChkZXAuVG9vbGJhcigpLnByZU11dGVkKSB7XG4gICAgICAgICAgICBkZXAuVG9vbGJhcigpLnRvZ2dsZUF1ZGlvKCk7XG4gICAgICAgICAgICBkZXAuVG9vbGJhcigpLnByZU11dGVkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgbXkuY2hhbmdlTG9jYWxWaWRlbyA9IGZ1bmN0aW9uKHN0cmVhbSwgZmxpcFgpIHtcbiAgICAgICAgdmFyIGxvY2FsVmlkZW8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd2aWRlbycpO1xuICAgICAgICBsb2NhbFZpZGVvLmlkID0gJ2xvY2FsVmlkZW9fJyArIHN0cmVhbS5pZDtcbiAgICAgICAgbG9jYWxWaWRlby5hdXRvcGxheSA9IHRydWU7XG4gICAgICAgIGxvY2FsVmlkZW8udm9sdW1lID0gMDsgLy8gaXMgaXQgcmVxdWlyZWQgaWYgYXVkaW8gaXMgc2VwYXJhdGVkID9cbiAgICAgICAgbG9jYWxWaWRlby5vbmNvbnRleHRtZW51ID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gZmFsc2U7IH07XG5cbiAgICAgICAgdmFyIGxvY2FsVmlkZW9Db250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9jYWxWaWRlb1dyYXBwZXInKTtcbiAgICAgICAgbG9jYWxWaWRlb0NvbnRhaW5lci5hcHBlbmRDaGlsZChsb2NhbFZpZGVvKTtcblxuICAgICAgICAvLyBTZXQgZGVmYXVsdCBkaXNwbGF5IG5hbWUuXG4gICAgICAgIHNldERpc3BsYXlOYW1lKCdsb2NhbFZpZGVvQ29udGFpbmVyJyk7XG5cbiAgICAgICAgZGVwLlVJQWN0aXZhdG9yKCkuZ2V0VUlTZXJ2aWNlKCkudXBkYXRlQXVkaW9MZXZlbENhbnZhcygpO1xuXG4gICAgICAgIHZhciBsb2NhbFZpZGVvU2VsZWN0b3IgPSAkKCcjJyArIGxvY2FsVmlkZW8uaWQpO1xuICAgICAgICAvLyBBZGQgY2xpY2sgaGFuZGxlciB0byBib3RoIHZpZGVvIGFuZCB2aWRlbyB3cmFwcGVyIGVsZW1lbnRzIGluIGNhc2VcbiAgICAgICAgLy8gdGhlcmUncyBubyB2aWRlby5cbiAgICAgICAgbG9jYWxWaWRlb1NlbGVjdG9yLmNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmhhbmRsZVZpZGVvVGh1bWJDbGlja2VkKGxvY2FsVmlkZW8uc3JjKTtcbiAgICAgICAgfSk7XG4gICAgICAgICQoJyNsb2NhbFZpZGVvQ29udGFpbmVyJykuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuaGFuZGxlVmlkZW9UaHVtYkNsaWNrZWQobG9jYWxWaWRlby5zcmMpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgaG92ZXIgaGFuZGxlclxuICAgICAgICAkKCcjbG9jYWxWaWRlb0NvbnRhaW5lcicpLmhvdmVyKFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0Rpc3BsYXlOYW1lKCdsb2NhbFZpZGVvQ29udGFpbmVyJywgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFWaWRlb0xheW91dC5pc0xhcmdlVmlkZW9WaXNpYmxlKClcbiAgICAgICAgICAgICAgICAgICAgICAgIHx8IGxvY2FsVmlkZW8uc3JjICE9PSAkKCcjbGFyZ2VWaWRlbycpLmF0dHIoJ3NyYycpKVxuICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zaG93RGlzcGxheU5hbWUoJ2xvY2FsVmlkZW9Db250YWluZXInLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIC8vIEFkZCBzdHJlYW0gZW5kZWQgaGFuZGxlclxuICAgICAgICBzdHJlYW0ub25lbmRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGxvY2FsVmlkZW9Db250YWluZXIucmVtb3ZlQ2hpbGQobG9jYWxWaWRlbyk7XG4gICAgICAgICAgICBWaWRlb0xheW91dC51cGRhdGVSZW1vdmVkVmlkZW8obG9jYWxWaWRlby5zcmMpO1xuICAgICAgICB9O1xuICAgICAgICAvLyBGbGlwIHZpZGVvIHggYXhpcyBpZiBuZWVkZWRcbiAgICAgICAgZmxpcFhMb2NhbFZpZGVvID0gZmxpcFg7XG4gICAgICAgIGlmIChmbGlwWCkge1xuICAgICAgICAgICAgbG9jYWxWaWRlb1NlbGVjdG9yLmFkZENsYXNzKFwiZmxpcFZpZGVvWFwiKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBBdHRhY2ggV2ViUlRDIHN0cmVhbVxuICAgICAgICBhdHRhY2hNZWRpYVN0cmVhbShsb2NhbFZpZGVvU2VsZWN0b3IsIHN0cmVhbSk7XG5cbiAgICAgICAgbG9jYWxWaWRlb1NyYyA9IGxvY2FsVmlkZW8uc3JjO1xuXG4gICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8obG9jYWxWaWRlb1NyYywgMCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiByZW1vdmVkIHZpZGVvIGlzIGN1cnJlbnRseSBkaXNwbGF5ZWQgYW5kIHRyaWVzIHRvIGRpc3BsYXlcbiAgICAgKiBhbm90aGVyIG9uZSBpbnN0ZWFkLlxuICAgICAqIEBwYXJhbSByZW1vdmVkVmlkZW9TcmMgc3JjIHN0cmVhbSBpZGVudGlmaWVyIG9mIHRoZSB2aWRlby5cbiAgICAgKi9cbiAgICBteS51cGRhdGVSZW1vdmVkVmlkZW8gPSBmdW5jdGlvbihyZW1vdmVkVmlkZW9TcmMpIHtcbiAgICAgICAgaWYgKHJlbW92ZWRWaWRlb1NyYyA9PT0gJCgnI2xhcmdlVmlkZW8nKS5hdHRyKCdzcmMnKSkge1xuICAgICAgICAgICAgLy8gdGhpcyBpcyBjdXJyZW50bHkgZGlzcGxheWVkIGFzIGxhcmdlXG4gICAgICAgICAgICAvLyBwaWNrIHRoZSBsYXN0IHZpc2libGUgdmlkZW8gaW4gdGhlIHJvd1xuICAgICAgICAgICAgLy8gaWYgbm9ib2R5IGVsc2UgaXMgbGVmdCwgdGhpcyBwaWNrcyB0aGUgbG9jYWwgdmlkZW9cbiAgICAgICAgICAgIHZhciBwaWNrXG4gICAgICAgICAgICAgICAgPSAkKCcjcmVtb3RlVmlkZW9zPnNwYW5baWQhPVwibWl4ZWRzdHJlYW1cIl06dmlzaWJsZTpsYXN0PnZpZGVvJylcbiAgICAgICAgICAgICAgICAgICAgLmdldCgwKTtcblxuICAgICAgICAgICAgaWYgKCFwaWNrKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKFwiTGFzdCB2aXNpYmxlIHZpZGVvIG5vIGxvbmdlciBleGlzdHNcIik7XG4gICAgICAgICAgICAgICAgcGljayA9ICQoJyNyZW1vdGVWaWRlb3M+c3BhbltpZCE9XCJtaXhlZHN0cmVhbVwiXT52aWRlbycpLmdldCgwKTtcblxuICAgICAgICAgICAgICAgIGlmICghcGljayB8fCAhcGljay5zcmMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IGxvY2FsIHZpZGVvXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIkZhbGxiYWNrIHRvIGxvY2FsIHZpZGVvLi4uXCIpO1xuICAgICAgICAgICAgICAgICAgICBwaWNrID0gJCgnI3JlbW90ZVZpZGVvcz5zcGFuPnNwYW4+dmlkZW8nKS5nZXQoMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBtdXRlIGlmIGxvY2FsdmlkZW9cbiAgICAgICAgICAgIGlmIChwaWNrKSB7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQudXBkYXRlTGFyZ2VWaWRlbyhwaWNrLnNyYywgcGljay52b2x1bWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gZWxlY3QgbGFyZ2UgdmlkZW9cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgSklEIG9mIHRoZSB1c2VyIHRvIHdob20gZ2l2ZW4gPHR0PnZpZGVvU3JjPC90dD4gYmVsb25ncy5cbiAgICAgKiBAcGFyYW0gdmlkZW9TcmMgdGhlIHZpZGVvIFwic3JjXCIgaWRlbnRpZmllci5cbiAgICAgKiBAcmV0dXJucyB7bnVsbCB8IFN0cmluZ30gdGhlIEpJRCBvZiB0aGUgdXNlciB0byB3aG9tIGdpdmVuIDx0dD52aWRlb1NyYzwvdHQ+XG4gICAgICogICAgICAgICAgICAgICAgICAgYmVsb25ncy5cbiAgICAgKi9cbiAgICBteS5nZXRKaWRGcm9tVmlkZW9TcmMgPSBmdW5jdGlvbih2aWRlb1NyYylcbiAgICB7XG4gICAgICAgIGlmICh2aWRlb1NyYyA9PT0gbG9jYWxWaWRlb1NyYylcbiAgICAgICAgICAgIHJldHVybiBYTVBQQWN0aXZhdG9yLmdldE15SklEKCk7XG5cbiAgICAgICAgdmFyIHNzcmMgPSB2aWRlb1NyY1RvU3NyY1t2aWRlb1NyY107XG4gICAgICAgIGlmICghc3NyYylcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFhNUFBBY3RpdmF0b3IuZ2V0SklERnJvbVNTUkMoc3NyYyk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIGxhcmdlIHZpZGVvIHdpdGggdGhlIGdpdmVuIG5ldyB2aWRlbyBzb3VyY2UuXG4gICAgICovXG4gICAgbXkudXBkYXRlTGFyZ2VWaWRlbyA9IGZ1bmN0aW9uKG5ld1NyYywgdm9sKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdob3ZlciBpbicsIG5ld1NyYyk7XG5cbiAgICAgICAgaWYgKCQoJyNsYXJnZVZpZGVvJykuYXR0cignc3JjJykgIT0gbmV3U3JjKSB7XG4gICAgICAgICAgICBsYXJnZVZpZGVvTmV3U3JjID0gbmV3U3JjO1xuXG4gICAgICAgICAgICB2YXIgaXNWaXNpYmxlID0gJCgnI2xhcmdlVmlkZW8nKS5pcygnOnZpc2libGUnKTtcblxuICAgICAgICAgICAgLy8gd2UgbmVlZCB0aGlzIGhlcmUgYmVjYXVzZSBhZnRlciB0aGUgZmFkZSB0aGUgdmlkZW9TcmMgbWF5IGhhdmVcbiAgICAgICAgICAgIC8vIGNoYW5nZWQuXG4gICAgICAgICAgICB2YXIgaXNEZXNrdG9wID0gaXNWaWRlb1NyY0Rlc2t0b3AobmV3U3JjKTtcblxuICAgICAgICAgICAgdmFyIHVzZXJKaWQgPSBWaWRlb0xheW91dC5nZXRKaWRGcm9tVmlkZW9TcmMobmV3U3JjKTtcbiAgICAgICAgICAgIC8vIHdlIHdhbnQgdGhlIG5vdGlmaWNhdGlvbiB0byB0cmlnZ2VyIGV2ZW4gaWYgdXNlckppZCBpcyB1bmRlZmluZWQsXG4gICAgICAgICAgICAvLyBvciBudWxsLlxuICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcihcInNlbGVjdGVkZW5kcG9pbnRjaGFuZ2VkXCIsIFt1c2VySmlkXSk7XG5cbiAgICAgICAgICAgICQoJyNsYXJnZVZpZGVvJykuZmFkZU91dCgzMDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgb2xkU3JjID0gJCh0aGlzKS5hdHRyKCdzcmMnKTtcblxuICAgICAgICAgICAgICAgICQodGhpcykuYXR0cignc3JjJywgbmV3U3JjKTtcblxuICAgICAgICAgICAgICAgIC8vIFNjcmVlbiBzdHJlYW0gaXMgYWxyZWFkeSByb3RhdGVkXG4gICAgICAgICAgICAgICAgdmFyIGZsaXBYID0gKG5ld1NyYyA9PT0gbG9jYWxWaWRlb1NyYykgJiYgZmxpcFhMb2NhbFZpZGVvO1xuXG4gICAgICAgICAgICAgICAgdmFyIHZpZGVvVHJhbnNmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xhcmdlVmlkZW8nKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5zdHlsZS53ZWJraXRUcmFuc2Zvcm07XG5cbiAgICAgICAgICAgICAgICBpZiAoZmxpcFggJiYgdmlkZW9UcmFuc2Zvcm0gIT09ICdzY2FsZVgoLTEpJykge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbGFyZ2VWaWRlbycpLnN0eWxlLndlYmtpdFRyYW5zZm9ybVxuICAgICAgICAgICAgICAgICAgICAgICAgPSBcInNjYWxlWCgtMSlcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoIWZsaXBYICYmIHZpZGVvVHJhbnNmb3JtID09PSAnc2NhbGVYKC0xKScpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xhcmdlVmlkZW8nKS5zdHlsZS53ZWJraXRUcmFuc2Zvcm1cbiAgICAgICAgICAgICAgICAgICAgICAgID0gXCJub25lXCI7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQ2hhbmdlIHRoZSB3YXkgd2UnbGwgYmUgbWVhc3VyaW5nIGFuZCBwb3NpdGlvbmluZyBsYXJnZSB2aWRlb1xuXG4gICAgICAgICAgICAgICAgZ2V0VmlkZW9TaXplID0gaXNEZXNrdG9wXG4gICAgICAgICAgICAgICAgICAgID8gZ2V0RGVza3RvcFZpZGVvU2l6ZVxuICAgICAgICAgICAgICAgICAgICA6IFZpZGVvTGF5b3V0LmdldENhbWVyYVZpZGVvU2l6ZTtcbiAgICAgICAgICAgICAgICBnZXRWaWRlb1Bvc2l0aW9uID0gaXNEZXNrdG9wXG4gICAgICAgICAgICAgICAgICAgID8gZ2V0RGVza3RvcFZpZGVvUG9zaXRpb25cbiAgICAgICAgICAgICAgICAgICAgOiBWaWRlb0xheW91dC5nZXRDYW1lcmFWaWRlb1Bvc2l0aW9uO1xuXG4gICAgICAgICAgICAgICAgaWYgKGlzVmlzaWJsZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IGlmIHRoZSBsYXJnZSB2aWRlbyBpcyBjdXJyZW50bHkgdmlzaWJsZS5cbiAgICAgICAgICAgICAgICAgICAgLy8gRGlzYWJsZSBwcmV2aW91cyBkb21pbmFudCBzcGVha2VyIHZpZGVvLlxuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkSmlkID0gVmlkZW9MYXlvdXQuZ2V0SmlkRnJvbVZpZGVvU3JjKG9sZFNyYyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvbGRKaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvbGRSZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKG9sZEppZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5lbmFibGVEb21pbmFudFNwZWFrZXIob2xkUmVzb3VyY2VKaWQsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIEVuYWJsZSBuZXcgZG9taW5hbnQgc3BlYWtlciBpbiB0aGUgcmVtb3RlIHZpZGVvcyBzZWN0aW9uLlxuICAgICAgICAgICAgICAgICAgICB2YXIgdXNlckppZCA9IFZpZGVvTGF5b3V0LmdldEppZEZyb21WaWRlb1NyYyhuZXdTcmMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodXNlckppZClcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc291cmNlSmlkID0gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQodXNlckppZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5lbmFibGVEb21pbmFudFNwZWFrZXIocmVzb3VyY2VKaWQsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5mYWRlSW4oMzAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGFuIGFycmF5IG9mIHRoZSB2aWRlbyBob3Jpem9udGFsIGFuZCB2ZXJ0aWNhbCBpbmRlbnRzLlxuICAgICAqIENlbnRlcnMgaG9yaXpvbnRhbGx5IGFuZCB0b3AgYWxpZ25zIHZlcnRpY2FsbHkuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIGFuIGFycmF5IHdpdGggMiBlbGVtZW50cywgdGhlIGhvcml6b250YWwgaW5kZW50IGFuZCB0aGUgdmVydGljYWxcbiAgICAgKiBpbmRlbnRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXREZXNrdG9wVmlkZW9Qb3NpdGlvbih2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlSGVpZ2h0KSB7XG5cbiAgICAgICAgdmFyIGhvcml6b250YWxJbmRlbnQgPSAodmlkZW9TcGFjZVdpZHRoIC0gdmlkZW9XaWR0aCkgLyAyO1xuXG4gICAgICAgIHZhciB2ZXJ0aWNhbEluZGVudCA9IDA7Ly8gVG9wIGFsaWduZWRcblxuICAgICAgICByZXR1cm4gW2hvcml6b250YWxJbmRlbnQsIHZlcnRpY2FsSW5kZW50XTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdmlkZW8gaWRlbnRpZmllZCBieSBnaXZlbiBzcmMgaXMgZGVza3RvcCBzdHJlYW0uXG4gICAgICogQHBhcmFtIHZpZGVvU3JjIGVnLlxuICAgICAqIGJsb2I6aHR0cHMlM0EvL3Bhd2VsLmppdHNpLm5ldC85YTQ2ZTBiZC0xMzFlLTRkMTgtOWMxNC1hOTI2NGU4ZGIzOTVcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc1ZpZGVvU3JjRGVza3RvcCh2aWRlb1NyYykge1xuICAgICAgICAvLyBGSVhNRTogZml4IHRoaXMgbWFwcGluZyBtZXNzLi4uXG4gICAgICAgIC8vIGZpZ3VyZSBvdXQgaWYgbGFyZ2UgdmlkZW8gaXMgZGVza3RvcCBzdHJlYW0gb3IganVzdCBhIGNhbWVyYVxuICAgICAgICB2YXIgaXNEZXNrdG9wID0gZmFsc2U7XG4gICAgICAgIGlmIChsb2NhbFZpZGVvU3JjID09PSB2aWRlb1NyYykge1xuICAgICAgICAgICAgLy8gbG9jYWwgdmlkZW9cbiAgICAgICAgICAgIGlzRGVza3RvcCA9IGlzVXNpbmdTY3JlZW5TdHJlYW07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBEbyB3ZSBoYXZlIGFzc29jaWF0aW9ucy4uLlxuICAgICAgICAgICAgdmFyIHZpZGVvU3NyYyA9IHZpZGVvU3JjVG9Tc3JjW3ZpZGVvU3JjXTtcbiAgICAgICAgICAgIGlmICh2aWRlb1NzcmMpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmlkZW9UeXBlID0gWE1QUEFjdGl2YXRvci5nZXRWaWRlb1R5cGVGcm9tU1NSQyh2aWRlb1NzcmMpO1xuICAgICAgICAgICAgICAgIGlmICh2aWRlb1R5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmluYWxseSB0aGVyZS4uLlxuICAgICAgICAgICAgICAgICAgICBpc0Rlc2t0b3AgPSB2aWRlb1R5cGUgPT09ICdzY3JlZW4nO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJObyB2aWRlbyB0eXBlIGZvciBzc3JjOiBcIiArIHZpZGVvU3NyYyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiTm8gc3NyYyBmb3Igc3JjOiBcIiArIHZpZGVvU3JjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaXNEZXNrdG9wO1xuICAgIH1cblxuXG4gICAgbXkuaGFuZGxlVmlkZW9UaHVtYkNsaWNrZWQgPSBmdW5jdGlvbih2aWRlb1NyYykge1xuICAgICAgICAvLyBSZXN0b3JlIHN0eWxlIGZvciBwcmV2aW91c2x5IGZvY3VzZWQgdmlkZW9cbiAgICAgICAgdmFyIGZvY3VzSmlkID0gVmlkZW9MYXlvdXQuZ2V0SmlkRnJvbVZpZGVvU3JjKFZpZGVvTGF5b3V0LmZvY3VzZWRWaWRlb1NyYyk7XG4gICAgICAgIHZhciBvbGRDb250YWluZXIgPSBnZXRQYXJ0aWNpcGFudENvbnRhaW5lcihmb2N1c0ppZCk7XG5cbiAgICAgICAgaWYgKG9sZENvbnRhaW5lcikge1xuICAgICAgICAgICAgb2xkQ29udGFpbmVyLnJlbW92ZUNsYXNzKFwidmlkZW9Db250YWluZXJGb2N1c2VkXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVW5sb2NrIGN1cnJlbnQgZm9jdXNlZC4gXG4gICAgICAgIGlmIChWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMgPT09IHZpZGVvU3JjKVxuICAgICAgICB7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMgPSBudWxsO1xuICAgICAgICAgICAgdmFyIGRvbWluYW50U3BlYWtlclZpZGVvID0gbnVsbDtcbiAgICAgICAgICAgIC8vIEVuYWJsZSB0aGUgY3VycmVudGx5IHNldCBkb21pbmFudCBzcGVha2VyLlxuICAgICAgICAgICAgaWYgKGN1cnJlbnREb21pbmFudFNwZWFrZXIpIHtcbiAgICAgICAgICAgICAgICBkb21pbmFudFNwZWFrZXJWaWRlb1xuICAgICAgICAgICAgICAgICAgICA9ICQoJyNwYXJ0aWNpcGFudF8nICsgY3VycmVudERvbWluYW50U3BlYWtlciArICc+dmlkZW8nKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmdldCgwKTtcblxuICAgICAgICAgICAgICAgIGlmIChkb21pbmFudFNwZWFrZXJWaWRlbykge1xuICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC51cGRhdGVMYXJnZVZpZGVvKGRvbWluYW50U3BlYWtlclZpZGVvLnNyYywgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBMb2NrIG5ldyB2aWRlb1xuICAgICAgICBWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMgPSB2aWRlb1NyYztcblxuICAgICAgICAvLyBVcGRhdGUgZm9jdXNlZC9waW5uZWQgaW50ZXJmYWNlLlxuICAgICAgICB2YXIgdXNlckppZCA9IFZpZGVvTGF5b3V0LmdldEppZEZyb21WaWRlb1NyYyh2aWRlb1NyYyk7XG4gICAgICAgIGlmICh1c2VySmlkKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgY29udGFpbmVyID0gZ2V0UGFydGljaXBhbnRDb250YWluZXIodXNlckppZCk7XG4gICAgICAgICAgICBjb250YWluZXIuYWRkQ2xhc3MoXCJ2aWRlb0NvbnRhaW5lckZvY3VzZWRcIik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUcmlnZ2VycyBhIFwidmlkZW8uc2VsZWN0ZWRcIiBldmVudC4gVGhlIFwiZmFsc2VcIiBwYXJhbWV0ZXIgaW5kaWNhdGVzXG4gICAgICAgIC8vIHRoaXMgaXNuJ3QgYSBwcmV6aS5cbiAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcihcInZpZGVvLnNlbGVjdGVkXCIsIFtmYWxzZV0pO1xuXG4gICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8odmlkZW9TcmMsIDEpO1xuXG4gICAgICAgICQoJ2F1ZGlvJykuZWFjaChmdW5jdGlvbiAoaWR4LCBlbCkge1xuICAgICAgICAgICAgaWYgKGVsLmlkLmluZGV4T2YoJ21peGVkbXNsYWJlbCcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIGVsLnZvbHVtZSA9IDA7XG4gICAgICAgICAgICAgICAgZWwudm9sdW1lID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFBvc2l0aW9ucyB0aGUgbGFyZ2UgdmlkZW8uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmlkZW9XaWR0aCB0aGUgc3RyZWFtIHZpZGVvIHdpZHRoXG4gICAgICogQHBhcmFtIHZpZGVvSGVpZ2h0IHRoZSBzdHJlYW0gdmlkZW8gaGVpZ2h0XG4gICAgICovXG4gICAgbXkucG9zaXRpb25MYXJnZSA9IGZ1bmN0aW9uICh2aWRlb1dpZHRoLCB2aWRlb0hlaWdodCkge1xuICAgICAgICB2YXIgdmlkZW9TcGFjZVdpZHRoID0gJCgnI3ZpZGVvc3BhY2UnKS53aWR0aCgpO1xuICAgICAgICB2YXIgdmlkZW9TcGFjZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcblxuICAgICAgICB2YXIgdmlkZW9TaXplID0gZ2V0VmlkZW9TaXplKHZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VIZWlnaHQpO1xuXG4gICAgICAgIHZhciBsYXJnZVZpZGVvV2lkdGggPSB2aWRlb1NpemVbMF07XG4gICAgICAgIHZhciBsYXJnZVZpZGVvSGVpZ2h0ID0gdmlkZW9TaXplWzFdO1xuXG4gICAgICAgIHZhciB2aWRlb1Bvc2l0aW9uID0gZ2V0VmlkZW9Qb3NpdGlvbihsYXJnZVZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXJnZVZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZUhlaWdodCk7XG5cbiAgICAgICAgdmFyIGhvcml6b250YWxJbmRlbnQgPSB2aWRlb1Bvc2l0aW9uWzBdO1xuICAgICAgICB2YXIgdmVydGljYWxJbmRlbnQgPSB2aWRlb1Bvc2l0aW9uWzFdO1xuXG4gICAgICAgIHBvc2l0aW9uVmlkZW8oJCgnI2xhcmdlVmlkZW8nKSxcbiAgICAgICAgICAgICAgICAgICAgICBsYXJnZVZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgbGFyZ2VWaWRlb0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICBob3Jpem9udGFsSW5kZW50LCB2ZXJ0aWNhbEluZGVudCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3dzL2hpZGVzIHRoZSBsYXJnZSB2aWRlby5cbiAgICAgKi9cbiAgICBteS5zZXRMYXJnZVZpZGVvVmlzaWJsZSA9IGZ1bmN0aW9uKGlzVmlzaWJsZSkge1xuICAgICAgICB2YXIgbGFyZ2VWaWRlb0ppZCA9IFZpZGVvTGF5b3V0LmdldEppZEZyb21WaWRlb1NyYygkKCcjbGFyZ2VWaWRlbycpLmF0dHIoJ3NyYycpKTtcbiAgICAgICAgdmFyIHJlc291cmNlSmlkID0gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQobGFyZ2VWaWRlb0ppZCk7XG5cbiAgICAgICAgaWYgKGlzVmlzaWJsZSkge1xuICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5jc3Moe3Zpc2liaWxpdHk6ICd2aXNpYmxlJ30pO1xuICAgICAgICAgICAgJCgnLndhdGVybWFyaycpLmNzcyh7dmlzaWJpbGl0eTogJ3Zpc2libGUnfSk7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5lbmFibGVEb21pbmFudFNwZWFrZXIocmVzb3VyY2VKaWQsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5jc3Moe3Zpc2liaWxpdHk6ICdoaWRkZW4nfSk7XG4gICAgICAgICAgICAkKCcud2F0ZXJtYXJrJykuY3NzKHt2aXNpYmlsaXR5OiAnaGlkZGVuJ30pO1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuZW5hYmxlRG9taW5hbnRTcGVha2VyKHJlc291cmNlSmlkLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSW5kaWNhdGVzIGlmIHRoZSBsYXJnZSB2aWRlbyBpcyBjdXJyZW50bHkgdmlzaWJsZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gPHR0PnRydWU8L3R0PiBpZiB2aXNpYmxlLCA8dHQ+ZmFsc2U8L3R0PiAtIG90aGVyd2lzZVxuICAgICAqL1xuICAgIG15LmlzTGFyZ2VWaWRlb1Zpc2libGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICQoJyNsYXJnZVZpZGVvJykuaXMoJzp2aXNpYmxlJyk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiBjb250YWluZXIgZm9yIHBhcnRpY2lwYW50IGlkZW50aWZpZWQgYnkgZ2l2ZW4gcGVlckppZCBleGlzdHNcbiAgICAgKiBpbiB0aGUgZG9jdW1lbnQgYW5kIGNyZWF0ZXMgaXQgZXZlbnR1YWxseS5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0gcGVlckppZCBwZWVyIEppZCB0byBjaGVjay5cbiAgICAgKiBcbiAgICAgKiBAcmV0dXJuIFJldHVybnMgPHR0PnRydWU8L3R0PiBpZiB0aGUgcGVlciBjb250YWluZXIgZXhpc3RzLFxuICAgICAqIDx0dD5mYWxzZTwvdHQ+IC0gb3RoZXJ3aXNlXG4gICAgICovXG4gICAgbXkuZW5zdXJlUGVlckNvbnRhaW5lckV4aXN0cyA9IGZ1bmN0aW9uKHBlZXJKaWQpIHtcbiAgICAgICAgZGVwLkNvbnRhY3RMaXN0KCkuZW5zdXJlQWRkQ29udGFjdChwZWVySmlkKTtcblxuICAgICAgICB2YXIgcmVzb3VyY2VKaWQgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChwZWVySmlkKTtcblxuICAgICAgICB2YXIgdmlkZW9TcGFuSWQgPSAncGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkO1xuXG4gICAgICAgIGlmICgkKCcjJyArIHZpZGVvU3BhbklkKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGVyZSdzIGJlZW4gYSBmb2N1cyBjaGFuZ2UsIG1ha2Ugc3VyZSB3ZSBhZGQgZm9jdXMgcmVsYXRlZFxuICAgICAgICAgICAgLy8gaW50ZXJmYWNlISFcbiAgICAgICAgICAgIGlmIChYTVBQQWN0aXZhdG9yLmlzRm9jdXMoKSAmJiAkKCcjcmVtb3RlX3BvcHVwbWVudV8nICsgcmVzb3VyY2VKaWQpLmxlbmd0aCA8PSAwKVxuICAgICAgICAgICAgICAgIGFkZFJlbW90ZVZpZGVvTWVudSggcGVlckppZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHZpZGVvU3BhbklkKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgY29udGFpbmVyXG4gICAgICAgICAgICAgICAgPSBWaWRlb0xheW91dC5hZGRSZW1vdGVWaWRlb0NvbnRhaW5lcihwZWVySmlkLCB2aWRlb1NwYW5JZCk7XG5cbiAgICAgICAgICAgIC8vIFNldCBkZWZhdWx0IGRpc3BsYXkgbmFtZS5cbiAgICAgICAgICAgIHNldERpc3BsYXlOYW1lKHZpZGVvU3BhbklkKTtcblxuICAgICAgICAgICAgdmFyIG5pY2tmaWVsZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIG5pY2tmaWVsZC5jbGFzc05hbWUgPSBcIm5pY2tcIjtcbiAgICAgICAgICAgIG5pY2tmaWVsZC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShyZXNvdXJjZUppZCkpO1xuICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKG5pY2tmaWVsZCk7XG5cbiAgICAgICAgICAgIC8vIEluIGNhc2UgdGhpcyBpcyBub3QgY3VycmVudGx5IGluIHRoZSBsYXN0IG4gd2UgZG9uJ3Qgc2hvdyBpdC5cbiAgICAgICAgICAgIGlmIChsYXN0TkNvdW50XG4gICAgICAgICAgICAgICAgJiYgbGFzdE5Db3VudCA+IDBcbiAgICAgICAgICAgICAgICAmJiAkKCcjcmVtb3RlVmlkZW9zPnNwYW4nKS5sZW5ndGggPj0gbGFzdE5Db3VudCArIDIpIHtcbiAgICAgICAgICAgICAgICBzaG93UGVlckNvbnRhaW5lcihyZXNvdXJjZUppZCwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZVRodW1ibmFpbHMoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBteS5hZGRSZW1vdGVWaWRlb0NvbnRhaW5lciA9IGZ1bmN0aW9uKHBlZXJKaWQsIHNwYW5JZCkge1xuICAgICAgICB2YXIgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICBjb250YWluZXIuaWQgPSBzcGFuSWQ7XG4gICAgICAgIGNvbnRhaW5lci5jbGFzc05hbWUgPSAndmlkZW9jb250YWluZXInO1xuICAgICAgICB2YXIgcmVtb3RlcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZW1vdGVWaWRlb3MnKTtcblxuICAgICAgICAvLyBJZiB0aGUgcGVlckppZCBpcyBudWxsIHRoZW4gdGhpcyB2aWRlbyBzcGFuIGNvdWxkbid0IGJlIGRpcmVjdGx5XG4gICAgICAgIC8vIGFzc29jaWF0ZWQgd2l0aCBhIHBhcnRpY2lwYW50ICh0aGlzIGNvdWxkIGhhcHBlbiBpbiB0aGUgY2FzZSBvZiBwcmV6aSkuXG4gICAgICAgIGlmIChYTVBQQWN0aXZhdG9yLmlzRm9jdXMoKSAmJiBwZWVySmlkICE9IG51bGwpXG4gICAgICAgICAgICBhZGRSZW1vdGVWaWRlb01lbnUocGVlckppZCwgY29udGFpbmVyKTtcblxuICAgICAgICByZW1vdGVzLmFwcGVuZENoaWxkKGNvbnRhaW5lcik7XG4gICAgICAgIGRlcC5VSUFjdGl2YXRvcigpLmdldFVJU2VydmljZSgpLnVwZGF0ZUF1ZGlvTGV2ZWxDYW52YXMocGVlckppZCk7XG5cbiAgICAgICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBhdWRpbyBvciB2aWRlbyBzdHJlYW0gZWxlbWVudC5cbiAgICAgKi9cbiAgICBteS5jcmVhdGVTdHJlYW1FbGVtZW50ID0gZnVuY3Rpb24gKHNpZCwgc3RyZWFtKSB7XG4gICAgICAgIHZhciBpc1ZpZGVvID0gc3RyZWFtLmdldFZpZGVvVHJhY2tzKCkubGVuZ3RoID4gMDtcblxuICAgICAgICBpZihpc1ZpZGVvKVxuICAgICAgICB7XG4gICAgICAgICAgICBjb25zb2xlLnRyYWNlKHN0cmVhbSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGVsZW1lbnQgPSBpc1ZpZGVvXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3ZpZGVvJylcbiAgICAgICAgICAgICAgICAgICAgICAgIDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYXVkaW8nKTtcbiAgICAgICAgdmFyIGlkID0gKGlzVmlkZW8gPyAncmVtb3RlVmlkZW9fJyA6ICdyZW1vdGVBdWRpb18nKVxuICAgICAgICAgICAgICAgICAgICArIHNpZCArICdfJyArIHN0cmVhbS5pZDtcblxuICAgICAgICBlbGVtZW50LmlkID0gaWQ7XG4gICAgICAgIGVsZW1lbnQuYXV0b3BsYXkgPSB0cnVlO1xuICAgICAgICBlbGVtZW50Lm9uY29udGV4dG1lbnUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBmYWxzZTsgfTtcblxuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9O1xuXG4gICAgbXkuYWRkUmVtb3RlU3RyZWFtRWxlbWVudFxuICAgICAgICA9IGZ1bmN0aW9uIChjb250YWluZXIsIHNpZCwgc3RyZWFtLCBwZWVySmlkLCB0aGVzc3JjKSB7XG4gICAgICAgIHZhciBuZXdFbGVtZW50SWQgPSBudWxsO1xuXG4gICAgICAgIHZhciBpc1ZpZGVvID0gc3RyZWFtLmdldFZpZGVvVHJhY2tzKCkubGVuZ3RoID4gMDtcblxuICAgICAgICBpZiAoY29udGFpbmVyKSB7XG4gICAgICAgICAgICB2YXIgc3RyZWFtRWxlbWVudCA9IFZpZGVvTGF5b3V0LmNyZWF0ZVN0cmVhbUVsZW1lbnQoc2lkLCBzdHJlYW0pO1xuICAgICAgICAgICAgbmV3RWxlbWVudElkID0gc3RyZWFtRWxlbWVudC5pZDtcblxuICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHN0cmVhbUVsZW1lbnQpO1xuXG4gICAgICAgICAgICB2YXIgc2VsID0gJCgnIycgKyBuZXdFbGVtZW50SWQpO1xuICAgICAgICAgICAgc2VsLmhpZGUoKTtcblxuICAgICAgICAgICAgLy8gSWYgdGhlIGNvbnRhaW5lciBpcyBjdXJyZW50bHkgdmlzaWJsZSB3ZSBhdHRhY2ggdGhlIHN0cmVhbS5cbiAgICAgICAgICAgIGlmICghaXNWaWRlb1xuICAgICAgICAgICAgICAgIHx8IChjb250YWluZXIub2Zmc2V0UGFyZW50ICE9PSBudWxsICYmIGlzVmlkZW8pKSB7XG4vLzw8PDw8PDwgSEVBRDpVSS92aWRlb2xheW91dC5qc1xuLy8gICAgICAgICAgICAgICAgYXR0YWNoTWVkaWFTdHJlYW0oc2VsLCBzdHJlYW0pO1xuLy89PT09PT09XG4gICAgICAgICAgICAgICAgdmFyIHNpbXVsY2FzdCA9IG5ldyBTaW11bGNhc3QoKTtcbiAgICAgICAgICAgICAgICB2YXIgdmlkZW9TdHJlYW0gPSBzaW11bGNhc3QuZ2V0UmVjZWl2aW5nVmlkZW9TdHJlYW0oc3RyZWFtKTtcbiAgICAgICAgICAgICAgICBhdHRhY2hNZWRpYVN0cmVhbShzZWwsIHZpZGVvU3RyZWFtKTtcbi8vPj4+Pj4+PiBtYXN0ZXI6dmlkZW9sYXlvdXQuanNcblxuICAgICAgICAgICAgICAgIGlmIChpc1ZpZGVvKVxuICAgICAgICAgICAgICAgICAgICB3YWl0Rm9yUmVtb3RlVmlkZW8oc2VsLCB0aGVzc3JjLCBzdHJlYW0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzdHJlYW0ub25lbmRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc3RyZWFtIGVuZGVkJywgdGhpcyk7XG5cbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5yZW1vdmVSZW1vdGVTdHJlYW1FbGVtZW50KHN0cmVhbSwgY29udGFpbmVyKTtcblxuICAgICAgICAgICAgICAgIGlmIChwZWVySmlkKVxuICAgICAgICAgICAgICAgICAgICBkZXAuQ29udGFjdExpc3QoKS5yZW1vdmVDb250YWN0KHBlZXJKaWQpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gQWRkIGNsaWNrIGhhbmRsZXIuXG4gICAgICAgICAgICBjb250YWluZXIub25jbGljayA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICogRklYTUUgSXQgdHVybnMgb3V0IHRoYXQgdmlkZW9UaHVtYiBtYXkgbm90IGV4aXN0IChpZiB0aGVyZSBpc1xuICAgICAgICAgICAgICAgICAqIG5vIGFjdHVhbCB2aWRlbykuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgdmFyIHZpZGVvVGh1bWIgPSAkKCcjJyArIGNvbnRhaW5lci5pZCArICc+dmlkZW8nKS5nZXQoMCk7XG5cbiAgICAgICAgICAgICAgICBpZiAodmlkZW9UaHVtYilcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuaGFuZGxlVmlkZW9UaHVtYkNsaWNrZWQodmlkZW9UaHVtYi5zcmMpO1xuXG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBBZGQgaG92ZXIgaGFuZGxlclxuICAgICAgICAgICAgJChjb250YWluZXIpLmhvdmVyKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zaG93RGlzcGxheU5hbWUoY29udGFpbmVyLmlkLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmlkZW9TcmMgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJCgnIycgKyBjb250YWluZXIuaWQgKyAnPnZpZGVvJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAmJiAkKCcjJyArIGNvbnRhaW5lci5pZCArICc+dmlkZW8nKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NyYyA9ICQoJyMnICsgY29udGFpbmVyLmlkICsgJz52aWRlbycpLmdldCgwKS5zcmM7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgdmlkZW8gaGFzIGJlZW4gXCJwaW5uZWRcIiBieSB0aGUgdXNlciB3ZSB3YW50IHRvXG4gICAgICAgICAgICAgICAgICAgIC8vIGtlZXAgdGhlIGRpc3BsYXkgbmFtZSBvbiBwbGFjZS5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFWaWRlb0xheW91dC5pc0xhcmdlVmlkZW9WaXNpYmxlKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCB2aWRlb1NyYyAhPT0gJCgnI2xhcmdlVmlkZW8nKS5hdHRyKCdzcmMnKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dEaXNwbGF5TmFtZShjb250YWluZXIuaWQsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5ld0VsZW1lbnRJZDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyB0aGUgcmVtb3RlIHN0cmVhbSBlbGVtZW50IGNvcnJlc3BvbmRpbmcgdG8gdGhlIGdpdmVuIHN0cmVhbSBhbmRcbiAgICAgKiBwYXJlbnQgY29udGFpbmVyLlxuICAgICAqIFxuICAgICAqIEBwYXJhbSBzdHJlYW0gdGhlIHN0cmVhbVxuICAgICAqIEBwYXJhbSBjb250YWluZXJcbiAgICAgKi9cbiAgICBteS5yZW1vdmVSZW1vdGVTdHJlYW1FbGVtZW50ID0gZnVuY3Rpb24gKHN0cmVhbSwgY29udGFpbmVyKSB7XG4gICAgICAgIGlmICghY29udGFpbmVyKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHZhciBzZWxlY3QgPSBudWxsO1xuICAgICAgICB2YXIgcmVtb3ZlZFZpZGVvU3JjID0gbnVsbDtcbiAgICAgICAgaWYgKHN0cmVhbS5nZXRWaWRlb1RyYWNrcygpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHNlbGVjdCA9ICQoJyMnICsgY29udGFpbmVyLmlkICsgJz52aWRlbycpO1xuICAgICAgICAgICAgcmVtb3ZlZFZpZGVvU3JjID0gc2VsZWN0LmdldCgwKS5zcmM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgc2VsZWN0ID0gJCgnIycgKyBjb250YWluZXIuaWQgKyAnPmF1ZGlvJyk7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHZpZGVvIHNvdXJjZSBmcm9tIHRoZSBtYXBwaW5nLlxuICAgICAgICBkZWxldGUgdmlkZW9TcmNUb1NzcmNbcmVtb3ZlZFZpZGVvU3JjXTtcblxuICAgICAgICAvLyBNYXJrIHZpZGVvIGFzIHJlbW92ZWQgdG8gY2FuY2VsIHdhaXRpbmcgbG9vcChpZiB2aWRlbyBpcyByZW1vdmVkXG4gICAgICAgIC8vIGJlZm9yZSBoYXMgc3RhcnRlZClcbiAgICAgICAgc2VsZWN0LnJlbW92ZWQgPSB0cnVlO1xuICAgICAgICBzZWxlY3QucmVtb3ZlKCk7XG5cbiAgICAgICAgdmFyIGF1ZGlvQ291bnQgPSAkKCcjJyArIGNvbnRhaW5lci5pZCArICc+YXVkaW8nKS5sZW5ndGg7XG4gICAgICAgIHZhciB2aWRlb0NvdW50ID0gJCgnIycgKyBjb250YWluZXIuaWQgKyAnPnZpZGVvJykubGVuZ3RoO1xuXG4gICAgICAgIGlmICghYXVkaW9Db3VudCAmJiAhdmlkZW9Db3VudCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJSZW1vdmUgd2hvbGUgdXNlclwiLCBjb250YWluZXIuaWQpO1xuICAgICAgICAgICAgLy8gUmVtb3ZlIHdob2xlIGNvbnRhaW5lclxuICAgICAgICAgICAgY29udGFpbmVyLnJlbW92ZSgpO1xuICAgICAgICAgICAgVXRpbC5wbGF5U291bmROb3RpZmljYXRpb24oJ3VzZXJMZWZ0Jyk7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5yZXNpemVUaHVtYm5haWxzKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVtb3ZlZFZpZGVvU3JjKVxuICAgICAgICAgICAgVmlkZW9MYXlvdXQudXBkYXRlUmVtb3ZlZFZpZGVvKHJlbW92ZWRWaWRlb1NyYyk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3cvaGlkZSBwZWVyIGNvbnRhaW5lciBmb3IgdGhlIGdpdmVuIHJlc291cmNlSmlkLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNob3dQZWVyQ29udGFpbmVyKHJlc291cmNlSmlkLCBpc1Nob3cpIHtcbiAgICAgICAgdmFyIHBlZXJDb250YWluZXIgPSAkKCcjcGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkKTtcblxuICAgICAgICBpZiAoIXBlZXJDb250YWluZXIpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgaWYgKCFwZWVyQ29udGFpbmVyLmlzKCc6dmlzaWJsZScpICYmIGlzU2hvdylcbiAgICAgICAgICAgIHBlZXJDb250YWluZXIuc2hvdygpO1xuICAgICAgICBlbHNlIGlmIChwZWVyQ29udGFpbmVyLmlzKCc6dmlzaWJsZScpICYmICFpc1Nob3cpXG4gICAgICAgICAgICBwZWVyQ29udGFpbmVyLmhpZGUoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgZGlzcGxheSBuYW1lIGZvciB0aGUgZ2l2ZW4gdmlkZW8gc3BhbiBpZC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzZXREaXNwbGF5TmFtZSh2aWRlb1NwYW5JZCwgZGlzcGxheU5hbWUpIHtcbiAgICAgICAgdmFyIG5hbWVTcGFuID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+c3Bhbi5kaXNwbGF5bmFtZScpO1xuICAgICAgICB2YXIgZGVmYXVsdExvY2FsRGlzcGxheU5hbWUgPSBcIk1lXCI7XG5cbiAgICAgICAgLy8gSWYgd2UgYWxyZWFkeSBoYXZlIGEgZGlzcGxheSBuYW1lIGZvciB0aGlzIHZpZGVvLlxuICAgICAgICBpZiAobmFtZVNwYW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdmFyIG5hbWVTcGFuRWxlbWVudCA9IG5hbWVTcGFuLmdldCgwKTtcblxuICAgICAgICAgICAgaWYgKG5hbWVTcGFuRWxlbWVudC5pZCA9PT0gJ2xvY2FsRGlzcGxheU5hbWUnICYmXG4gICAgICAgICAgICAgICAgJCgnI2xvY2FsRGlzcGxheU5hbWUnKS50ZXh0KCkgIT09IGRpc3BsYXlOYW1lKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRpc3BsYXlOYW1lICYmIGRpc3BsYXlOYW1lLmxlbmd0aCA+IDApXG4gICAgICAgICAgICAgICAgICAgICQoJyNsb2NhbERpc3BsYXlOYW1lJykudGV4dChkaXNwbGF5TmFtZSArICcgKG1lKScpO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgJCgnI2xvY2FsRGlzcGxheU5hbWUnKS50ZXh0KGRlZmF1bHRMb2NhbERpc3BsYXlOYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGRpc3BsYXlOYW1lICYmIGRpc3BsYXlOYW1lLmxlbmd0aCA+IDApXG4gICAgICAgICAgICAgICAgICAgICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnX25hbWUnKS50ZXh0KGRpc3BsYXlOYW1lKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnX25hbWUnKS50ZXh0KGludGVyZmFjZUNvbmZpZy5ERUZBVUxUX1JFTU9URV9ESVNQTEFZX05BTUUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGVkaXRCdXR0b24gPSBudWxsO1xuXG4gICAgICAgICAgICBuYW1lU3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIG5hbWVTcGFuLmNsYXNzTmFtZSA9ICdkaXNwbGF5bmFtZSc7XG4gICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkKVswXS5hcHBlbmRDaGlsZChuYW1lU3Bhbik7XG5cbiAgICAgICAgICAgIGlmICh2aWRlb1NwYW5JZCA9PT0gJ2xvY2FsVmlkZW9Db250YWluZXInKSB7XG4gICAgICAgICAgICAgICAgZWRpdEJ1dHRvbiA9IGNyZWF0ZUVkaXREaXNwbGF5TmFtZUJ1dHRvbigpO1xuICAgICAgICAgICAgICAgIG5hbWVTcGFuLmlubmVyVGV4dCA9IGRlZmF1bHRMb2NhbERpc3BsYXlOYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbmFtZVNwYW4uaW5uZXJUZXh0ID0gaW50ZXJmYWNlQ29uZmlnLkRFRkFVTFRfUkVNT1RFX0RJU1BMQVlfTkFNRTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGRpc3BsYXlOYW1lICYmIGRpc3BsYXlOYW1lLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBuYW1lU3Bhbi5pbm5lclRleHQgPSBkaXNwbGF5TmFtZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFlZGl0QnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgbmFtZVNwYW4uaWQgPSB2aWRlb1NwYW5JZCArICdfbmFtZSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5hbWVTcGFuLmlkID0gJ2xvY2FsRGlzcGxheU5hbWUnO1xuICAgICAgICAgICAgICAgICQoJyMnICsgdmlkZW9TcGFuSWQpWzBdLmFwcGVuZENoaWxkKGVkaXRCdXR0b24pO1xuXG4gICAgICAgICAgICAgICAgdmFyIGVkaXRhYmxlVGV4dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgZWRpdGFibGVUZXh0LmNsYXNzTmFtZSA9ICdkaXNwbGF5bmFtZSc7XG4gICAgICAgICAgICAgICAgZWRpdGFibGVUZXh0LnR5cGUgPSAndGV4dCc7XG4gICAgICAgICAgICAgICAgZWRpdGFibGVUZXh0LmlkID0gJ2VkaXREaXNwbGF5TmFtZSc7XG5cbiAgICAgICAgICAgICAgICBpZiAoZGlzcGxheU5hbWUgJiYgZGlzcGxheU5hbWUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGVkaXRhYmxlVGV4dC52YWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgPSBkaXNwbGF5TmFtZS5zdWJzdHJpbmcoMCwgZGlzcGxheU5hbWUuaW5kZXhPZignIChtZSknKSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZWRpdGFibGVUZXh0LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnZGlzcGxheTpub25lOycpO1xuICAgICAgICAgICAgICAgIGVkaXRhYmxlVGV4dC5zZXRBdHRyaWJ1dGUoJ3BsYWNlaG9sZGVyJywgJ2V4LiBKYW5lIFBpbmsnKTtcbiAgICAgICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkKVswXS5hcHBlbmRDaGlsZChlZGl0YWJsZVRleHQpO1xuXG4gICAgICAgICAgICAgICAgJCgnI2xvY2FsVmlkZW9Db250YWluZXIgLmRpc3BsYXluYW1lJylcbiAgICAgICAgICAgICAgICAgICAgLmJpbmQoXCJjbGlja1wiLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2xvY2FsRGlzcGxheU5hbWUnKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNlZGl0RGlzcGxheU5hbWUnKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNlZGl0RGlzcGxheU5hbWUnKS5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICAkKCcjZWRpdERpc3BsYXlOYW1lJykuc2VsZWN0KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGlucHV0RGlzcGxheU5hbWVIYW5kbGVyID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuaWNrbmFtZSA9IGRlcC5VSUFjdGl2YXRvcigpLmdldFVJU2VydmljZSgpLmdldE5pY2tuYW1lKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmlja25hbWUgIT09IG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXAuVUlBY3RpdmF0b3IoKS5nZXRVSVNlcnZpY2UoKS5zZXROaWNrbmFtZShuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuaWNrbmFtZSAgPSBuYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UuZGlzcGxheW5hbWUgPSBuaWNrbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBYTVBQQWN0aXZhdG9yLmFkZFRvUHJlc2VuY2UoXCJkaXNwbGF5TmFtZVwiLCBuaWNrbmFtZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXAuQ2hhdCgpLnNldENoYXRDb252ZXJzYXRpb25Nb2RlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoISQoJyNsb2NhbERpc3BsYXlOYW1lJykuaXMoXCI6dmlzaWJsZVwiKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuaWNrbmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI2xvY2FsRGlzcGxheU5hbWUnKS50ZXh0KG5pY2tuYW1lICsgXCIgKG1lKVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNsb2NhbERpc3BsYXlOYW1lJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50ZXh0KGRlZmF1bHRMb2NhbERpc3BsYXlOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjbG9jYWxEaXNwbGF5TmFtZScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgJCgnI2VkaXREaXNwbGF5TmFtZScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAkKCcjZWRpdERpc3BsYXlOYW1lJykub25lKFwiZm9jdXNvdXRcIiwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0RGlzcGxheU5hbWVIYW5kbGVyKHRoaXMudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAkKCcjZWRpdERpc3BsYXlOYW1lJykub24oJ2tleWRvd24nLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXREaXNwbGF5TmFtZUhhbmRsZXIodGhpcy52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3dzL2hpZGVzIHRoZSBkaXNwbGF5IG5hbWUgb24gdGhlIHJlbW90ZSB2aWRlby5cbiAgICAgKiBAcGFyYW0gdmlkZW9TcGFuSWQgdGhlIGlkZW50aWZpZXIgb2YgdGhlIHZpZGVvIHNwYW4gZWxlbWVudFxuICAgICAqIEBwYXJhbSBpc1Nob3cgaW5kaWNhdGVzIGlmIHRoZSBkaXNwbGF5IG5hbWUgc2hvdWxkIGJlIHNob3duIG9yIGhpZGRlblxuICAgICAqL1xuICAgIG15LnNob3dEaXNwbGF5TmFtZSA9IGZ1bmN0aW9uKHZpZGVvU3BhbklkLCBpc1Nob3cpIHtcbiAgICAgICAgdmFyIG5hbWVTcGFuID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+c3Bhbi5kaXNwbGF5bmFtZScpLmdldCgwKTtcbiAgICAgICAgaWYgKGlzU2hvdykge1xuICAgICAgICAgICAgaWYgKG5hbWVTcGFuICYmIG5hbWVTcGFuLmlubmVySFRNTCAmJiBuYW1lU3Bhbi5pbm5lckhUTUwubGVuZ3RoKSBcbiAgICAgICAgICAgICAgICBuYW1lU3Bhbi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImRpc3BsYXk6aW5saW5lLWJsb2NrO1wiKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmIChuYW1lU3BhbilcbiAgICAgICAgICAgICAgICBuYW1lU3Bhbi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImRpc3BsYXk6bm9uZTtcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2hvd3MgdGhlIHByZXNlbmNlIHN0YXR1cyBtZXNzYWdlIGZvciB0aGUgZ2l2ZW4gdmlkZW8uXG4gICAgICovXG4gICAgbXkuc2V0UHJlc2VuY2VTdGF0dXMgPSBmdW5jdGlvbiAodmlkZW9TcGFuSWQsIHN0YXR1c01zZykge1xuXG4gICAgICAgIGlmICghJCgnIycgKyB2aWRlb1NwYW5JZCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBObyBjb250YWluZXJcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzdGF0dXNTcGFuID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+c3Bhbi5zdGF0dXMnKTtcbiAgICAgICAgaWYgKCFzdGF0dXNTcGFuLmxlbmd0aCkge1xuICAgICAgICAgICAgLy9BZGQgc3RhdHVzIHNwYW5cbiAgICAgICAgICAgIHN0YXR1c1NwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICBzdGF0dXNTcGFuLmNsYXNzTmFtZSA9ICdzdGF0dXMnO1xuICAgICAgICAgICAgc3RhdHVzU3Bhbi5pZCA9IHZpZGVvU3BhbklkICsgJ19zdGF0dXMnO1xuICAgICAgICAgICAgJCgnIycgKyB2aWRlb1NwYW5JZClbMF0uYXBwZW5kQ2hpbGQoc3RhdHVzU3Bhbik7XG5cbiAgICAgICAgICAgIHN0YXR1c1NwYW4gPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5zcGFuLnN0YXR1cycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGlzcGxheSBzdGF0dXNcbiAgICAgICAgaWYgKHN0YXR1c01zZyAmJiBzdGF0dXNNc2cubGVuZ3RoKSB7XG4gICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkICsgJ19zdGF0dXMnKS50ZXh0KHN0YXR1c01zZyk7XG4gICAgICAgICAgICBzdGF0dXNTcGFuLmdldCgwKS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImRpc3BsYXk6aW5saW5lLWJsb2NrO1wiKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGVcbiAgICAgICAgICAgIHN0YXR1c1NwYW4uZ2V0KDApLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTpub25lO1wiKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBhIHZpc3VhbCBpbmRpY2F0b3IgZm9yIHRoZSBmb2N1cyBvZiB0aGUgY29uZmVyZW5jZS5cbiAgICAgKiBDdXJyZW50bHkgaWYgd2UncmUgbm90IHRoZSBvd25lciBvZiB0aGUgY29uZmVyZW5jZSB3ZSBvYnRhaW4gdGhlIGZvY3VzXG4gICAgICogZnJvbSB0aGUgY29ubmVjdGlvbi5qaW5nbGUuc2Vzc2lvbnMuXG4gICAgICovXG4gICAgbXkuc2hvd0ZvY3VzSW5kaWNhdG9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChYTVBQQWN0aXZhdG9yLmlzRm9jdXMoKSkge1xuICAgICAgICAgICAgdmFyIGluZGljYXRvclNwYW4gPSAkKCcjbG9jYWxWaWRlb0NvbnRhaW5lciAuZm9jdXNpbmRpY2F0b3InKTtcblxuICAgICAgICAgICAgaWYgKGluZGljYXRvclNwYW4uY2hpbGRyZW4oKS5sZW5ndGggPT09IDApXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY3JlYXRlRm9jdXNJbmRpY2F0b3JFbGVtZW50KGluZGljYXRvclNwYW5bMF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAge1xuICAgICAgICAgICAgLy8gSWYgd2UncmUgb25seSBhIHBhcnRpY2lwYW50IHRoZSBmb2N1cyB3aWxsIGJlIHRoZSBvbmx5IHNlc3Npb24gd2UgaGF2ZS5cbiAgICAgICAgICAgIHZhciBmb2N1c0pJRCA9IFhNUFBBY3RpdmF0b3IuZ2V0Rm9jdXNKSUQoKTtcbiAgICAgICAgICAgIGlmKGZvY3VzSklEID09IG51bGwpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgdmFyIGZvY3VzSWRcbiAgICAgICAgICAgICAgICA9ICdwYXJ0aWNpcGFudF8nICsgZm9jdXNKSUQ7XG5cbiAgICAgICAgICAgIHZhciBmb2N1c0NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGZvY3VzSWQpO1xuICAgICAgICAgICAgaWYgKCFmb2N1c0NvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJObyBmb2N1cyBjb250YWluZXIhXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpbmRpY2F0b3JTcGFuID0gJCgnIycgKyBmb2N1c0lkICsgJyAuZm9jdXNpbmRpY2F0b3InKTtcblxuICAgICAgICAgICAgaWYgKCFpbmRpY2F0b3JTcGFuIHx8IGluZGljYXRvclNwYW4ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgaW5kaWNhdG9yU3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgICAgICBpbmRpY2F0b3JTcGFuLmNsYXNzTmFtZSA9ICdmb2N1c2luZGljYXRvcic7XG5cbiAgICAgICAgICAgICAgICBmb2N1c0NvbnRhaW5lci5hcHBlbmRDaGlsZChpbmRpY2F0b3JTcGFuKTtcblxuICAgICAgICAgICAgICAgIGNyZWF0ZUZvY3VzSW5kaWNhdG9yRWxlbWVudChpbmRpY2F0b3JTcGFuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTaG93cyB2aWRlbyBtdXRlZCBpbmRpY2F0b3Igb3ZlciBzbWFsbCB2aWRlb3MuXG4gICAgICovXG4gICAgbXkuc2hvd1ZpZGVvSW5kaWNhdG9yID0gZnVuY3Rpb24odmlkZW9TcGFuSWQsIGlzTXV0ZWQpIHtcbiAgICAgICAgdmFyIHZpZGVvTXV0ZWRTcGFuID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+c3Bhbi52aWRlb011dGVkJyk7XG5cbiAgICAgICAgaWYgKGlzTXV0ZWQgPT09ICdmYWxzZScpIHtcbiAgICAgICAgICAgIGlmICh2aWRlb011dGVkU3Bhbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdmlkZW9NdXRlZFNwYW4ucmVtb3ZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgYXVkaW9NdXRlZFNwYW4gPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5zcGFuLmF1ZGlvTXV0ZWQnKTtcblxuICAgICAgICAgICAgdmlkZW9NdXRlZFNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICB2aWRlb011dGVkU3Bhbi5jbGFzc05hbWUgPSAndmlkZW9NdXRlZCc7XG4gICAgICAgICAgICBpZiAoYXVkaW9NdXRlZFNwYW4pIHtcbiAgICAgICAgICAgICAgICB2aWRlb011dGVkU3Bhbi5yaWdodCA9ICczMHB4JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQoJyMnICsgdmlkZW9TcGFuSWQpWzBdLmFwcGVuZENoaWxkKHZpZGVvTXV0ZWRTcGFuKTtcblxuICAgICAgICAgICAgdmFyIG11dGVkSW5kaWNhdG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaScpO1xuICAgICAgICAgICAgbXV0ZWRJbmRpY2F0b3IuY2xhc3NOYW1lID0gJ2ljb24tY2FtZXJhLWRpc2FibGVkJztcbiAgICAgICAgICAgIFV0aWwuc2V0VG9vbHRpcChtdXRlZEluZGljYXRvcixcbiAgICAgICAgICAgICAgICAgICAgXCJQYXJ0aWNpcGFudCBoYXM8YnIvPnN0b3BwZWQgdGhlIGNhbWVyYS5cIixcbiAgICAgICAgICAgICAgICAgICAgXCJ0b3BcIik7XG4gICAgICAgICAgICB2aWRlb011dGVkU3Bhbi5hcHBlbmRDaGlsZChtdXRlZEluZGljYXRvcik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2hvd3MgYXVkaW8gbXV0ZWQgaW5kaWNhdG9yIG92ZXIgc21hbGwgdmlkZW9zLlxuICAgICAqL1xuICAgIG15LnNob3dBdWRpb0luZGljYXRvciA9IGZ1bmN0aW9uKHZpZGVvU3BhbklkLCBpc011dGVkKSB7XG4gICAgICAgIHZhciBhdWRpb011dGVkU3BhbiA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPnNwYW4uYXVkaW9NdXRlZCcpO1xuXG4gICAgICAgIGlmIChpc011dGVkID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgICBpZiAoYXVkaW9NdXRlZFNwYW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGF1ZGlvTXV0ZWRTcGFuLnBvcG92ZXIoJ2hpZGUnKTtcbiAgICAgICAgICAgICAgICBhdWRpb011dGVkU3Bhbi5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciB2aWRlb011dGVkU3BhbiA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPnNwYW4udmlkZW9NdXRlZCcpO1xuXG4gICAgICAgICAgICBhdWRpb011dGVkU3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIGF1ZGlvTXV0ZWRTcGFuLmNsYXNzTmFtZSA9ICdhdWRpb011dGVkJztcbiAgICAgICAgICAgIFV0aWwuc2V0VG9vbHRpcChhdWRpb011dGVkU3BhbixcbiAgICAgICAgICAgICAgICAgICAgXCJQYXJ0aWNpcGFudCBpcyBtdXRlZFwiLFxuICAgICAgICAgICAgICAgICAgICBcInRvcFwiKTtcblxuICAgICAgICAgICAgaWYgKHZpZGVvTXV0ZWRTcGFuKSB7XG4gICAgICAgICAgICAgICAgYXVkaW9NdXRlZFNwYW4ucmlnaHQgPSAnMzBweCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkKVswXS5hcHBlbmRDaGlsZChhdWRpb011dGVkU3Bhbik7XG5cbiAgICAgICAgICAgIHZhciBtdXRlZEluZGljYXRvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2knKTtcbiAgICAgICAgICAgIG11dGVkSW5kaWNhdG9yLmNsYXNzTmFtZSA9ICdpY29uLW1pYy1kaXNhYmxlZCc7XG4gICAgICAgICAgICBhdWRpb011dGVkU3Bhbi5hcHBlbmRDaGlsZChtdXRlZEluZGljYXRvcik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVzaXplcyB0aGUgbGFyZ2UgdmlkZW8gY29udGFpbmVyLlxuICAgICAqL1xuICAgIG15LnJlc2l6ZUxhcmdlVmlkZW9Db250YWluZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGRlcC5DaGF0KCkucmVzaXplQ2hhdCgpO1xuICAgICAgICB2YXIgYXZhaWxhYmxlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICB2YXIgYXZhaWxhYmxlV2lkdGggPSBkZXAuVUlVdGlsKCkuZ2V0QXZhaWxhYmxlVmlkZW9XaWR0aCgpO1xuICAgICAgICBpZiAoYXZhaWxhYmxlV2lkdGggPCAwIHx8IGF2YWlsYWJsZUhlaWdodCA8IDApIHJldHVybjtcblxuICAgICAgICAkKCcjdmlkZW9zcGFjZScpLndpZHRoKGF2YWlsYWJsZVdpZHRoKTtcbiAgICAgICAgJCgnI3ZpZGVvc3BhY2UnKS5oZWlnaHQoYXZhaWxhYmxlSGVpZ2h0KTtcbiAgICAgICAgJCgnI2xhcmdlVmlkZW9Db250YWluZXInKS53aWR0aChhdmFpbGFibGVXaWR0aCk7XG4gICAgICAgICQoJyNsYXJnZVZpZGVvQ29udGFpbmVyJykuaGVpZ2h0KGF2YWlsYWJsZUhlaWdodCk7XG5cbiAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplVGh1bWJuYWlscygpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXNpemVzIHRodW1ibmFpbHMuXG4gICAgICovXG4gICAgbXkucmVzaXplVGh1bWJuYWlscyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmlkZW9TcGFjZVdpZHRoID0gJCgnI3JlbW90ZVZpZGVvcycpLndpZHRoKCk7XG5cbiAgICAgICAgdmFyIHRodW1ibmFpbFNpemUgPSBWaWRlb0xheW91dC5jYWxjdWxhdGVUaHVtYm5haWxTaXplKHZpZGVvU3BhY2VXaWR0aCk7XG4gICAgICAgIHZhciB3aWR0aCA9IHRodW1ibmFpbFNpemVbMF07XG4gICAgICAgIHZhciBoZWlnaHQgPSB0aHVtYm5haWxTaXplWzFdO1xuXG4gICAgICAgIC8vIHNpemUgdmlkZW9zIHNvIHRoYXQgd2hpbGUga2VlcGluZyBBUiBhbmQgbWF4IGhlaWdodCwgd2UgaGF2ZSBhXG4gICAgICAgIC8vIG5pY2UgZml0XG4gICAgICAgICQoJyNyZW1vdGVWaWRlb3MnKS5oZWlnaHQoaGVpZ2h0KTtcbiAgICAgICAgJCgnI3JlbW90ZVZpZGVvcz5zcGFuJykud2lkdGgod2lkdGgpO1xuICAgICAgICAkKCcjcmVtb3RlVmlkZW9zPnNwYW4nKS5oZWlnaHQoaGVpZ2h0KTtcblxuICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKFwicmVtb3RldmlkZW8ucmVzaXplZFwiLCBbd2lkdGgsIGhlaWdodF0pO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBFbmFibGVzIHRoZSBkb21pbmFudCBzcGVha2VyIFVJLlxuICAgICAqXG4gICAgICogQHBhcmFtIHJlc291cmNlSmlkIHRoZSBqaWQgaW5kaWNhdGluZyB0aGUgdmlkZW8gZWxlbWVudCB0b1xuICAgICAqIGFjdGl2YXRlL2RlYWN0aXZhdGVcbiAgICAgKiBAcGFyYW0gaXNFbmFibGUgaW5kaWNhdGVzIGlmIHRoZSBkb21pbmFudCBzcGVha2VyIHNob3VsZCBiZSBlbmFibGVkIG9yXG4gICAgICogZGlzYWJsZWRcbiAgICAgKi9cbiAgICBteS5lbmFibGVEb21pbmFudFNwZWFrZXIgPSBmdW5jdGlvbihyZXNvdXJjZUppZCwgaXNFbmFibGUpIHtcbiAgICAgICAgdmFyIGRpc3BsYXlOYW1lID0gcmVzb3VyY2VKaWQ7XG4gICAgICAgIHZhciBuYW1lU3BhbiA9ICQoJyNwYXJ0aWNpcGFudF8nICsgcmVzb3VyY2VKaWQgKyAnPnNwYW4uZGlzcGxheW5hbWUnKTtcbiAgICAgICAgaWYgKG5hbWVTcGFuLmxlbmd0aCA+IDApXG4gICAgICAgICAgICBkaXNwbGF5TmFtZSA9IG5hbWVTcGFuLnRleHQoKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIlVJIGVuYWJsZSBkb21pbmFudCBzcGVha2VyXCIsXG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lLFxuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZUppZCxcbiAgICAgICAgICAgICAgICAgICAgaXNFbmFibGUpO1xuXG4gICAgICAgIHZhciB2aWRlb1NwYW5JZCA9IG51bGw7XG4gICAgICAgIHZhciB2aWRlb0NvbnRhaW5lcklkID0gbnVsbDtcbiAgICAgICAgaWYgKHJlc291cmNlSmlkXG4gICAgICAgICAgICAgICAgPT09IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKFhNUFBBY3RpdmF0b3IuZ2V0TXlKSUQoKSkpIHtcbiAgICAgICAgICAgIHZpZGVvU3BhbklkID0gJ2xvY2FsVmlkZW9XcmFwcGVyJztcbiAgICAgICAgICAgIHZpZGVvQ29udGFpbmVySWQgPSAnbG9jYWxWaWRlb0NvbnRhaW5lcic7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdwYXJ0aWNpcGFudF8nICsgcmVzb3VyY2VKaWQ7XG4gICAgICAgICAgICB2aWRlb0NvbnRhaW5lcklkID0gdmlkZW9TcGFuSWQ7XG4gICAgICAgIH1cblxuICAgICAgICB2aWRlb1NwYW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh2aWRlb0NvbnRhaW5lcklkKTtcblxuICAgICAgICBpZiAoIXZpZGVvU3Bhbikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIk5vIHZpZGVvIGVsZW1lbnQgZm9yIGppZFwiLCByZXNvdXJjZUppZCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdmlkZW8gPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz52aWRlbycpO1xuXG4gICAgICAgIGlmICh2aWRlbyAmJiB2aWRlby5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAoaXNFbmFibGUpIHtcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zaG93RGlzcGxheU5hbWUodmlkZW9Db250YWluZXJJZCwgdHJ1ZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIXZpZGVvU3Bhbi5jbGFzc0xpc3QuY29udGFpbnMoXCJkb21pbmFudHNwZWFrZXJcIikpXG4gICAgICAgICAgICAgICAgICAgIHZpZGVvU3Bhbi5jbGFzc0xpc3QuYWRkKFwiZG9taW5hbnRzcGVha2VyXCIpO1xuXG4gICAgICAgICAgICAgICAgdmlkZW8uY3NzKHt2aXNpYmlsaXR5OiAnaGlkZGVuJ30pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0Rpc3BsYXlOYW1lKHZpZGVvQ29udGFpbmVySWQsIGZhbHNlKTtcblxuICAgICAgICAgICAgICAgIGlmICh2aWRlb1NwYW4uY2xhc3NMaXN0LmNvbnRhaW5zKFwiZG9taW5hbnRzcGVha2VyXCIpKVxuICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYW4uY2xhc3NMaXN0LnJlbW92ZShcImRvbWluYW50c3BlYWtlclwiKTtcblxuICAgICAgICAgICAgICAgIHZpZGVvLmNzcyh7dmlzaWJpbGl0eTogJ3Zpc2libGUnfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgc2VsZWN0b3Igb2YgdmlkZW8gdGh1bWJuYWlsIGNvbnRhaW5lciBmb3IgdGhlIHVzZXIgaWRlbnRpZmllZCBieVxuICAgICAqIGdpdmVuIDx0dD51c2VySmlkPC90dD5cbiAgICAgKiBAcGFyYW0gdXNlckppZCB1c2VyJ3MgSmlkIGZvciB3aG9tIHdlIHdhbnQgdG8gZ2V0IHRoZSB2aWRlbyBjb250YWluZXIuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UGFydGljaXBhbnRDb250YWluZXIodXNlckppZClcbiAgICB7XG4gICAgICAgIGlmICghdXNlckppZClcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuXG4gICAgICAgIGlmICh1c2VySmlkID09PSBYTVBQQWN0aXZhdG9yLmdldE15SklEKCkpXG4gICAgICAgICAgICByZXR1cm4gJChcIiNsb2NhbFZpZGVvQ29udGFpbmVyXCIpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gJChcIiNwYXJ0aWNpcGFudF9cIiArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHVzZXJKaWQpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBzaXplIGFuZCBwb3NpdGlvbiBvZiB0aGUgZ2l2ZW4gdmlkZW8gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB2aWRlbyB0aGUgdmlkZW8gZWxlbWVudCB0byBwb3NpdGlvblxuICAgICAqIEBwYXJhbSB3aWR0aCB0aGUgZGVzaXJlZCB2aWRlbyB3aWR0aFxuICAgICAqIEBwYXJhbSBoZWlnaHQgdGhlIGRlc2lyZWQgdmlkZW8gaGVpZ2h0XG4gICAgICogQHBhcmFtIGhvcml6b250YWxJbmRlbnQgdGhlIGxlZnQgYW5kIHJpZ2h0IGluZGVudFxuICAgICAqIEBwYXJhbSB2ZXJ0aWNhbEluZGVudCB0aGUgdG9wIGFuZCBib3R0b20gaW5kZW50XG4gICAgICovXG4gICAgZnVuY3Rpb24gcG9zaXRpb25WaWRlbyh2aWRlbyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgaG9yaXpvbnRhbEluZGVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRpY2FsSW5kZW50KSB7XG4gICAgICAgIHZpZGVvLndpZHRoKHdpZHRoKTtcbiAgICAgICAgdmlkZW8uaGVpZ2h0KGhlaWdodCk7XG4gICAgICAgIHZpZGVvLmNzcyh7ICB0b3A6IHZlcnRpY2FsSW5kZW50ICsgJ3B4JyxcbiAgICAgICAgICAgICAgICAgICAgIGJvdHRvbTogdmVydGljYWxJbmRlbnQgKyAncHgnLFxuICAgICAgICAgICAgICAgICAgICAgbGVmdDogaG9yaXpvbnRhbEluZGVudCArICdweCcsXG4gICAgICAgICAgICAgICAgICAgICByaWdodDogaG9yaXpvbnRhbEluZGVudCArICdweCd9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSB0aHVtYm5haWwgc2l6ZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB2aWRlb1NwYWNlV2lkdGggdGhlIHdpZHRoIG9mIHRoZSB2aWRlbyBzcGFjZVxuICAgICAqL1xuICAgIG15LmNhbGN1bGF0ZVRodW1ibmFpbFNpemUgPSBmdW5jdGlvbiAodmlkZW9TcGFjZVdpZHRoKSB7XG4gICAgICAgIC8vIENhbGN1bGF0ZSB0aGUgYXZhaWxhYmxlIGhlaWdodCwgd2hpY2ggaXMgdGhlIGlubmVyIHdpbmRvdyBoZWlnaHQgbWludXNcbiAgICAgICAvLyAzOXB4IGZvciB0aGUgaGVhZGVyIG1pbnVzIDJweCBmb3IgdGhlIGRlbGltaXRlciBsaW5lcyBvbiB0aGUgdG9wIGFuZFxuICAgICAgIC8vIGJvdHRvbSBvZiB0aGUgbGFyZ2UgdmlkZW8sIG1pbnVzIHRoZSAzNnB4IHNwYWNlIGluc2lkZSB0aGUgcmVtb3RlVmlkZW9zXG4gICAgICAgLy8gY29udGFpbmVyIHVzZWQgZm9yIGhpZ2hsaWdodGluZyBzaGFkb3cuXG4gICAgICAgdmFyIGF2YWlsYWJsZUhlaWdodCA9IDEwMDtcblxuICAgICAgIHZhciBudW12aWRzID0gMDtcbiAgICAgICBpZiAobGFzdE5Db3VudCAmJiBsYXN0TkNvdW50ID4gMClcbiAgICAgICAgICAgbnVtdmlkcyA9IGxhc3ROQ291bnQgKyAxO1xuICAgICAgIGVsc2VcbiAgICAgICAgICAgbnVtdmlkcyA9ICQoJyNyZW1vdGVWaWRlb3M+c3Bhbjp2aXNpYmxlJykubGVuZ3RoO1xuXG4gICAgICAgLy8gUmVtb3ZlIHRoZSAzcHggYm9yZGVycyBhcnJvdW5kIHZpZGVvcyBhbmQgYm9yZGVyIGFyb3VuZCB0aGUgcmVtb3RlXG4gICAgICAgLy8gdmlkZW9zIGFyZWFcbiAgICAgICB2YXIgYXZhaWxhYmxlV2luV2lkdGggPSB2aWRlb1NwYWNlV2lkdGggLSAyICogMyAqIG51bXZpZHMgLSA3MDtcblxuICAgICAgIHZhciBhdmFpbGFibGVXaWR0aCA9IGF2YWlsYWJsZVdpbldpZHRoIC8gbnVtdmlkcztcbiAgICAgICB2YXIgYXNwZWN0UmF0aW8gPSAxNi4wIC8gOS4wO1xuICAgICAgIHZhciBtYXhIZWlnaHQgPSBNYXRoLm1pbigxNjAsIGF2YWlsYWJsZUhlaWdodCk7XG4gICAgICAgYXZhaWxhYmxlSGVpZ2h0ID0gTWF0aC5taW4obWF4SGVpZ2h0LCBhdmFpbGFibGVXaWR0aCAvIGFzcGVjdFJhdGlvKTtcbiAgICAgICBpZiAoYXZhaWxhYmxlSGVpZ2h0IDwgYXZhaWxhYmxlV2lkdGggLyBhc3BlY3RSYXRpbykge1xuICAgICAgICAgICBhdmFpbGFibGVXaWR0aCA9IE1hdGguZmxvb3IoYXZhaWxhYmxlSGVpZ2h0ICogYXNwZWN0UmF0aW8pO1xuICAgICAgIH1cblxuICAgICAgIHJldHVybiBbYXZhaWxhYmxlV2lkdGgsIGF2YWlsYWJsZUhlaWdodF07XG4gICB9O1xuXG4gICAvKipcbiAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YgdGhlIHZpZGVvIGRpbWVuc2lvbnMsIHNvIHRoYXQgaXQga2VlcHMgaXQncyBhc3BlY3RcbiAgICAqIHJhdGlvIGFuZCBmaXRzIGF2YWlsYWJsZSBhcmVhIHdpdGggaXQncyBsYXJnZXIgZGltZW5zaW9uLiBUaGlzIG1ldGhvZFxuICAgICogZW5zdXJlcyB0aGF0IHdob2xlIHZpZGVvIHdpbGwgYmUgdmlzaWJsZSBhbmQgY2FuIGxlYXZlIGVtcHR5IGFyZWFzLlxuICAgICpcbiAgICAqIEByZXR1cm4gYW4gYXJyYXkgd2l0aCAyIGVsZW1lbnRzLCB0aGUgdmlkZW8gd2lkdGggYW5kIHRoZSB2aWRlbyBoZWlnaHRcbiAgICAqL1xuICAgZnVuY3Rpb24gZ2V0RGVza3RvcFZpZGVvU2l6ZSh2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlSGVpZ2h0KSB7XG4gICAgICAgaWYgKCF2aWRlb1dpZHRoKVxuICAgICAgICAgICB2aWRlb1dpZHRoID0gVmlkZW9MYXlvdXQuY3VycmVudFZpZGVvV2lkdGg7XG4gICAgICAgaWYgKCF2aWRlb0hlaWdodClcbiAgICAgICAgICAgdmlkZW9IZWlnaHQgPSBWaWRlb0xheW91dC5jdXJyZW50VmlkZW9IZWlnaHQ7XG5cbiAgICAgICB2YXIgYXNwZWN0UmF0aW8gPSB2aWRlb1dpZHRoIC8gdmlkZW9IZWlnaHQ7XG5cbiAgICAgICB2YXIgYXZhaWxhYmxlV2lkdGggPSBNYXRoLm1heCh2aWRlb1dpZHRoLCB2aWRlb1NwYWNlV2lkdGgpO1xuICAgICAgIHZhciBhdmFpbGFibGVIZWlnaHQgPSBNYXRoLm1heCh2aWRlb0hlaWdodCwgdmlkZW9TcGFjZUhlaWdodCk7XG5cbiAgICAgICB2aWRlb1NwYWNlSGVpZ2h0IC09ICQoJyNyZW1vdGVWaWRlb3MnKS5vdXRlckhlaWdodCgpO1xuXG4gICAgICAgaWYgKGF2YWlsYWJsZVdpZHRoIC8gYXNwZWN0UmF0aW8gPj0gdmlkZW9TcGFjZUhlaWdodClcbiAgICAgICB7XG4gICAgICAgICAgIGF2YWlsYWJsZUhlaWdodCA9IHZpZGVvU3BhY2VIZWlnaHQ7XG4gICAgICAgICAgIGF2YWlsYWJsZVdpZHRoID0gYXZhaWxhYmxlSGVpZ2h0ICogYXNwZWN0UmF0aW87XG4gICAgICAgfVxuXG4gICAgICAgaWYgKGF2YWlsYWJsZUhlaWdodCAqIGFzcGVjdFJhdGlvID49IHZpZGVvU3BhY2VXaWR0aClcbiAgICAgICB7XG4gICAgICAgICAgIGF2YWlsYWJsZVdpZHRoID0gdmlkZW9TcGFjZVdpZHRoO1xuICAgICAgICAgICBhdmFpbGFibGVIZWlnaHQgPSBhdmFpbGFibGVXaWR0aCAvIGFzcGVjdFJhdGlvO1xuICAgICAgIH1cblxuICAgICAgIHJldHVybiBbYXZhaWxhYmxlV2lkdGgsIGF2YWlsYWJsZUhlaWdodF07XG4gICB9XG5cblxuLyoqXG4gICAgICogUmV0dXJucyBhbiBhcnJheSBvZiB0aGUgdmlkZW8gZGltZW5zaW9ucywgc28gdGhhdCBpdCBjb3ZlcnMgdGhlIHNjcmVlbi5cbiAgICAgKiBJdCBsZWF2ZXMgbm8gZW1wdHkgYXJlYXMsIGJ1dCBzb21lIHBhcnRzIG9mIHRoZSB2aWRlbyBtaWdodCBub3QgYmUgdmlzaWJsZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gYW4gYXJyYXkgd2l0aCAyIGVsZW1lbnRzLCB0aGUgdmlkZW8gd2lkdGggYW5kIHRoZSB2aWRlbyBoZWlnaHRcbiAgICAgKi9cbiAgICBteS5nZXRDYW1lcmFWaWRlb1NpemUgPSBmdW5jdGlvbih2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlSGVpZ2h0KSB7XG4gICAgICAgIGlmICghdmlkZW9XaWR0aClcbiAgICAgICAgICAgIHZpZGVvV2lkdGggPSBWaWRlb0xheW91dC5jdXJyZW50VmlkZW9XaWR0aDtcbiAgICAgICAgaWYgKCF2aWRlb0hlaWdodClcbiAgICAgICAgICAgIHZpZGVvSGVpZ2h0ID0gVmlkZW9MYXlvdXQuY3VycmVudFZpZGVvSGVpZ2h0O1xuXG4gICAgICAgIHZhciBhc3BlY3RSYXRpbyA9IHZpZGVvV2lkdGggLyB2aWRlb0hlaWdodDtcblxuICAgICAgICB2YXIgYXZhaWxhYmxlV2lkdGggPSBNYXRoLm1heCh2aWRlb1dpZHRoLCB2aWRlb1NwYWNlV2lkdGgpO1xuICAgICAgICB2YXIgYXZhaWxhYmxlSGVpZ2h0ID0gTWF0aC5tYXgodmlkZW9IZWlnaHQsIHZpZGVvU3BhY2VIZWlnaHQpO1xuXG4gICAgICAgIGlmIChhdmFpbGFibGVXaWR0aCAvIGFzcGVjdFJhdGlvIDwgdmlkZW9TcGFjZUhlaWdodCkge1xuICAgICAgICAgICAgYXZhaWxhYmxlSGVpZ2h0ID0gdmlkZW9TcGFjZUhlaWdodDtcbiAgICAgICAgICAgIGF2YWlsYWJsZVdpZHRoID0gYXZhaWxhYmxlSGVpZ2h0ICogYXNwZWN0UmF0aW87XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYXZhaWxhYmxlSGVpZ2h0ICogYXNwZWN0UmF0aW8gPCB2aWRlb1NwYWNlV2lkdGgpIHtcbiAgICAgICAgICAgIGF2YWlsYWJsZVdpZHRoID0gdmlkZW9TcGFjZVdpZHRoO1xuICAgICAgICAgICAgYXZhaWxhYmxlSGVpZ2h0ID0gYXZhaWxhYmxlV2lkdGggLyBhc3BlY3RSYXRpbztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBbYXZhaWxhYmxlV2lkdGgsIGF2YWlsYWJsZUhlaWdodF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhbiBhcnJheSBvZiB0aGUgdmlkZW8gaG9yaXpvbnRhbCBhbmQgdmVydGljYWwgaW5kZW50cyxcbiAgICAgKiBzbyB0aGF0IGlmIGZpdHMgaXRzIHBhcmVudC5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gYW4gYXJyYXkgd2l0aCAyIGVsZW1lbnRzLCB0aGUgaG9yaXpvbnRhbCBpbmRlbnQgYW5kIHRoZSB2ZXJ0aWNhbFxuICAgICAqIGluZGVudFxuICAgICAqL1xuICAgIG15LmdldENhbWVyYVZpZGVvUG9zaXRpb24gPSBmdW5jdGlvbih2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlSGVpZ2h0KSB7XG4gICAgICAgIC8vIFBhcmVudCBoZWlnaHQgaXNuJ3QgY29tcGxldGVseSBjYWxjdWxhdGVkIHdoZW4gd2UgcG9zaXRpb24gdGhlIHZpZGVvIGluXG4gICAgICAgIC8vIGZ1bGwgc2NyZWVuIG1vZGUgYW5kIHRoaXMgaXMgd2h5IHdlIHVzZSB0aGUgc2NyZWVuIGhlaWdodCBpbiB0aGlzIGNhc2UuXG4gICAgICAgIC8vIE5lZWQgdG8gdGhpbmsgaXQgZnVydGhlciBhdCBzb21lIHBvaW50IGFuZCBpbXBsZW1lbnQgaXQgcHJvcGVybHkuXG4gICAgICAgIHZhciBpc0Z1bGxTY3JlZW4gPSBWaWRlb0xheW91dC5pc0Z1bGxTY3JlZW4oKTtcbiAgICAgICAgaWYgKGlzRnVsbFNjcmVlbilcbiAgICAgICAgICAgIHZpZGVvU3BhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG5cbiAgICAgICAgdmFyIGhvcml6b250YWxJbmRlbnQgPSAodmlkZW9TcGFjZVdpZHRoIC0gdmlkZW9XaWR0aCkgLyAyO1xuICAgICAgICB2YXIgdmVydGljYWxJbmRlbnQgPSAodmlkZW9TcGFjZUhlaWdodCAtIHZpZGVvSGVpZ2h0KSAvIDI7XG5cbiAgICAgICAgcmV0dXJuIFtob3Jpem9udGFsSW5kZW50LCB2ZXJ0aWNhbEluZGVudF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWV0aG9kIHVzZWQgdG8gZ2V0IGxhcmdlIHZpZGVvIHBvc2l0aW9uLlxuICAgICAqIEB0eXBlIHtmdW5jdGlvbiAoKX1cbiAgICAgKi9cbiAgICB2YXIgZ2V0VmlkZW9Qb3NpdGlvbiA9IG15LmdldENhbWVyYVZpZGVvUG9zaXRpb247XG5cbiAgICAvKipcbiAgICAgKiBNZXRob2QgdXNlZCB0byBjYWxjdWxhdGUgbGFyZ2UgdmlkZW8gc2l6ZS5cbiAgICAgKiBAdHlwZSB7ZnVuY3Rpb24gKCl9XG4gICAgICovXG4gICAgdmFyIGdldFZpZGVvU2l6ZSA9IG15LmdldENhbWVyYVZpZGVvU2l6ZTtcblxuICAgIG15LmlzRnVsbFNjcmVlbiA9IGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5mdWxsU2NyZWVuIHx8XG4gICAgICAgICAgICBkb2N1bWVudC5tb3pGdWxsU2NyZWVuIHx8XG4gICAgICAgICAgICBkb2N1bWVudC53ZWJraXRJc0Z1bGxTY3JlZW47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyB0aGUgZWRpdCBkaXNwbGF5IG5hbWUgYnV0dG9uLlxuICAgICAqXG4gICAgICogQHJldHVybnMgdGhlIGVkaXQgYnV0dG9uXG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlRWRpdERpc3BsYXlOYW1lQnV0dG9uKCkge1xuICAgICAgICB2YXIgZWRpdEJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgZWRpdEJ1dHRvbi5jbGFzc05hbWUgPSAnZGlzcGxheW5hbWUnO1xuICAgICAgICBVdGlsLnNldFRvb2x0aXAoZWRpdEJ1dHRvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICdDbGljayB0byBlZGl0IHlvdXI8YnIvPmRpc3BsYXkgbmFtZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInRvcFwiKTtcbiAgICAgICAgZWRpdEJ1dHRvbi5pbm5lckhUTUwgPSAnPGkgY2xhc3M9XCJmYSBmYS1wZW5jaWxcIj48L2k+JztcblxuICAgICAgICByZXR1cm4gZWRpdEJ1dHRvbjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIHRoZSBlbGVtZW50IGluZGljYXRpbmcgdGhlIGZvY3VzIG9mIHRoZSBjb25mZXJlbmNlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHBhcmVudEVsZW1lbnQgdGhlIHBhcmVudCBlbGVtZW50IHdoZXJlIHRoZSBmb2N1cyBpbmRpY2F0b3Igd2lsbFxuICAgICAqIGJlIGFkZGVkXG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlRm9jdXNJbmRpY2F0b3JFbGVtZW50KHBhcmVudEVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGZvY3VzSW5kaWNhdG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaScpO1xuICAgICAgICBmb2N1c0luZGljYXRvci5jbGFzc05hbWUgPSAnZmEgZmEtc3Rhcic7XG4gICAgICAgIHBhcmVudEVsZW1lbnQuYXBwZW5kQ2hpbGQoZm9jdXNJbmRpY2F0b3IpO1xuXG4gICAgICAgIFV0aWwuc2V0VG9vbHRpcChwYXJlbnRFbGVtZW50LFxuICAgICAgICAgICAgICAgIFwiVGhlIG93bmVyIG9mPGJyLz50aGlzIGNvbmZlcmVuY2VcIixcbiAgICAgICAgICAgICAgICBcInRvcFwiKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSByZW1vdGUgdmlkZW8gbWVudS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBqaWQgdGhlIGppZCBpbmRpY2F0aW5nIHRoZSB2aWRlbyBmb3Igd2hpY2ggd2UncmUgYWRkaW5nIGEgbWVudS5cbiAgICAgKiBAcGFyYW0gaXNNdXRlZCBpbmRpY2F0ZXMgdGhlIGN1cnJlbnQgbXV0ZSBzdGF0ZVxuICAgICAqL1xuICAgIG15LnVwZGF0ZVJlbW90ZVZpZGVvTWVudSA9IGZ1bmN0aW9uKGppZCwgaXNNdXRlZCkge1xuICAgICAgICB2YXIgbXV0ZU1lbnVJdGVtXG4gICAgICAgICAgICA9ICQoJyNyZW1vdGVfcG9wdXBtZW51XydcbiAgICAgICAgICAgICAgICAgICAgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpXG4gICAgICAgICAgICAgICAgICAgICsgJz5saT5hLm11dGVsaW5rJyk7XG5cbiAgICAgICAgdmFyIG11dGVkSW5kaWNhdG9yID0gXCI8aSBjbGFzcz0naWNvbi1taWMtZGlzYWJsZWQnPjwvaT5cIjtcblxuICAgICAgICBpZiAobXV0ZU1lbnVJdGVtLmxlbmd0aCkge1xuICAgICAgICAgICAgdmFyIG11dGVMaW5rID0gbXV0ZU1lbnVJdGVtLmdldCgwKTtcblxuICAgICAgICAgICAgaWYgKGlzTXV0ZWQgPT09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgIG11dGVMaW5rLmlubmVySFRNTCA9IG11dGVkSW5kaWNhdG9yICsgJyBNdXRlZCc7XG4gICAgICAgICAgICAgICAgbXV0ZUxpbmsuY2xhc3NOYW1lID0gJ211dGVsaW5rIGRpc2FibGVkJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG11dGVMaW5rLmlubmVySFRNTCA9IG11dGVkSW5kaWNhdG9yICsgJyBNdXRlJztcbiAgICAgICAgICAgICAgICBtdXRlTGluay5jbGFzc05hbWUgPSAnbXV0ZWxpbmsnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGN1cnJlbnQgZG9taW5hbnQgc3BlYWtlciByZXNvdXJjZSBqaWQuXG4gICAgICovXG4gICAgbXkuZ2V0RG9taW5hbnRTcGVha2VyUmVzb3VyY2VKaWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBjdXJyZW50RG9taW5hbnRTcGVha2VyO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBjb3JyZXNwb25kaW5nIHJlc291cmNlIGppZCB0byB0aGUgZ2l2ZW4gcGVlciBjb250YWluZXJcbiAgICAgKiBET00gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gdGhlIGNvcnJlc3BvbmRpbmcgcmVzb3VyY2UgamlkIHRvIHRoZSBnaXZlbiBwZWVyIGNvbnRhaW5lclxuICAgICAqIERPTSBlbGVtZW50XG4gICAgICovXG4gICAgbXkuZ2V0UGVlckNvbnRhaW5lclJlc291cmNlSmlkID0gZnVuY3Rpb24gKGNvbnRhaW5lckVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGkgPSBjb250YWluZXJFbGVtZW50LmlkLmluZGV4T2YoJ3BhcnRpY2lwYW50XycpO1xuXG4gICAgICAgIGlmIChpID49IDApXG4gICAgICAgICAgICByZXR1cm4gY29udGFpbmVyRWxlbWVudC5pZC5zdWJzdHJpbmcoaSArIDEyKTsgXG4gICAgfTtcblxuICAgIG15Lm9uUmVtb3RlU3RyZWFtQWRkZWQgPSBmdW5jdGlvbiAoc3RyZWFtKSB7XG4gICAgICAgIHZhciBjb250YWluZXI7XG4gICAgICAgIHZhciByZW1vdGVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JlbW90ZVZpZGVvcycpO1xuXG4gICAgICAgIGlmIChzdHJlYW0ucGVlcmppZCkge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuZW5zdXJlUGVlckNvbnRhaW5lckV4aXN0cyhzdHJlYW0ucGVlcmppZCk7XG5cbiAgICAgICAgICAgIGNvbnRhaW5lciAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcbiAgICAgICAgICAgICAgICAgICAgJ3BhcnRpY2lwYW50XycgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChzdHJlYW0ucGVlcmppZCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHN0cmVhbS5zdHJlYW0uaWQgIT09ICdtaXhlZG1zbGFiZWwnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvciggICdjYW4gbm90IGFzc29jaWF0ZSBzdHJlYW0nLFxuICAgICAgICAgICAgICAgICAgICBzdHJlYW0uc3RyZWFtLmlkLFxuICAgICAgICAgICAgICAgICAgICAnd2l0aCBhIHBhcnRpY2lwYW50Jyk7XG4gICAgICAgICAgICAgICAgLy8gV2UgZG9uJ3Qgd2FudCB0byBhZGQgaXQgaGVyZSBzaW5jZSBpdCB3aWxsIGNhdXNlIHRyb3VibGVzXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRklYTUU6IGZvciB0aGUgbWl4ZWQgbXMgd2UgZG9udCBuZWVkIGEgdmlkZW8gLS0gY3VycmVudGx5XG4gICAgICAgICAgICBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICBjb250YWluZXIuaWQgPSAnbWl4ZWRzdHJlYW0nO1xuICAgICAgICAgICAgY29udGFpbmVyLmNsYXNzTmFtZSA9ICd2aWRlb2NvbnRhaW5lcic7XG4gICAgICAgICAgICByZW1vdGVzLmFwcGVuZENoaWxkKGNvbnRhaW5lcik7XG4gICAgICAgICAgICBVdGlsLnBsYXlTb3VuZE5vdGlmaWNhdGlvbigndXNlckpvaW5lZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbnRhaW5lcikge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuYWRkUmVtb3RlU3RyZWFtRWxlbWVudCggY29udGFpbmVyLFxuICAgICAgICAgICAgICAgIHN0cmVhbS5zaWQsXG4gICAgICAgICAgICAgICAgc3RyZWFtLnN0cmVhbSxcbiAgICAgICAgICAgICAgICBzdHJlYW0ucGVlcmppZCxcbiAgICAgICAgICAgICAgICBzdHJlYW0uc3NyYyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBZGRzIHRoZSByZW1vdGUgdmlkZW8gbWVudSBlbGVtZW50IGZvciB0aGUgZ2l2ZW4gPHR0PmppZDwvdHQ+IGluIHRoZVxuICAgICAqIGdpdmVuIDx0dD5wYXJlbnRFbGVtZW50PC90dD4uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gamlkIHRoZSBqaWQgaW5kaWNhdGluZyB0aGUgdmlkZW8gZm9yIHdoaWNoIHdlJ3JlIGFkZGluZyBhIG1lbnUuXG4gICAgICogQHBhcmFtIHBhcmVudEVsZW1lbnQgdGhlIHBhcmVudCBlbGVtZW50IHdoZXJlIHRoaXMgbWVudSB3aWxsIGJlIGFkZGVkXG4gICAgICovXG4gICAgZnVuY3Rpb24gYWRkUmVtb3RlVmlkZW9NZW51KGppZCwgcGFyZW50RWxlbWVudCkge1xuICAgICAgICB2YXIgc3BhbkVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgIHNwYW5FbGVtZW50LmNsYXNzTmFtZSA9ICdyZW1vdGV2aWRlb21lbnUnO1xuXG4gICAgICAgIHBhcmVudEVsZW1lbnQuYXBwZW5kQ2hpbGQoc3BhbkVsZW1lbnQpO1xuXG4gICAgICAgIHZhciBtZW51RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2knKTtcbiAgICAgICAgbWVudUVsZW1lbnQuY2xhc3NOYW1lID0gJ2ZhIGZhLWFuZ2xlLWRvd24nO1xuICAgICAgICBtZW51RWxlbWVudC50aXRsZSA9ICdSZW1vdGUgdXNlciBjb250cm9scyc7XG4gICAgICAgIHNwYW5FbGVtZW50LmFwcGVuZENoaWxkKG1lbnVFbGVtZW50KTtcblxuLy8gICAgICAgIDx1bCBjbGFzcz1cInBvcHVwbWVudVwiPlxuLy8gICAgICAgIDxsaT48YSBocmVmPVwiI1wiPk11dGU8L2E+PC9saT5cbi8vICAgICAgICA8bGk+PGEgaHJlZj1cIiNcIj5FamVjdDwvYT48L2xpPlxuLy8gICAgICAgIDwvdWw+XG4gICAgICAgIHZhciBwb3B1cG1lbnVFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndWwnKTtcbiAgICAgICAgcG9wdXBtZW51RWxlbWVudC5jbGFzc05hbWUgPSAncG9wdXBtZW51JztcbiAgICAgICAgcG9wdXBtZW51RWxlbWVudC5pZFxuICAgICAgICAgICAgPSAncmVtb3RlX3BvcHVwbWVudV8nICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKTtcbiAgICAgICAgc3BhbkVsZW1lbnQuYXBwZW5kQ2hpbGQocG9wdXBtZW51RWxlbWVudCk7XG5cbiAgICAgICAgdmFyIG11dGVNZW51SXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gICAgICAgIHZhciBtdXRlTGlua0l0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG5cbiAgICAgICAgdmFyIG11dGVkSW5kaWNhdG9yID0gXCI8aSBjbGFzcz0naWNvbi1taWMtZGlzYWJsZWQnPjwvaT5cIjtcblxuICAgICAgICBpZiAoIW11dGVkQXVkaW9zW2ppZF0pIHtcbiAgICAgICAgICAgIG11dGVMaW5rSXRlbS5pbm5lckhUTUwgPSBtdXRlZEluZGljYXRvciArICdNdXRlJztcbiAgICAgICAgICAgIG11dGVMaW5rSXRlbS5jbGFzc05hbWUgPSAnbXV0ZWxpbmsnO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbXV0ZUxpbmtJdGVtLmlubmVySFRNTCA9IG11dGVkSW5kaWNhdG9yICsgJyBNdXRlZCc7XG4gICAgICAgICAgICBtdXRlTGlua0l0ZW0uY2xhc3NOYW1lID0gJ211dGVsaW5rIGRpc2FibGVkJztcbiAgICAgICAgfVxuXG4gICAgICAgIG11dGVMaW5rSXRlbS5vbmNsaWNrID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGlmICgkKHRoaXMpLmF0dHIoJ2Rpc2FibGVkJykgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpc011dGUgPSAhbXV0ZWRBdWRpb3NbamlkXTtcbiAgICAgICAgICAgIFhNUFBBY3RpdmF0b3Iuc2V0TXV0ZShqaWQsIGlzTXV0ZSk7XG4gICAgICAgICAgICBwb3B1cG1lbnVFbGVtZW50LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnZGlzcGxheTpub25lOycpO1xuXG4gICAgICAgICAgICBpZiAoaXNNdXRlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbm5lckhUTUwgPSBtdXRlZEluZGljYXRvciArICcgTXV0ZWQnO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xhc3NOYW1lID0gJ211dGVsaW5rIGRpc2FibGVkJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5uZXJIVE1MID0gbXV0ZWRJbmRpY2F0b3IgKyAnIE11dGUnO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xhc3NOYW1lID0gJ211dGVsaW5rJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBtdXRlTWVudUl0ZW0uYXBwZW5kQ2hpbGQobXV0ZUxpbmtJdGVtKTtcbiAgICAgICAgcG9wdXBtZW51RWxlbWVudC5hcHBlbmRDaGlsZChtdXRlTWVudUl0ZW0pO1xuXG4gICAgICAgIHZhciBlamVjdEluZGljYXRvciA9IFwiPGkgY2xhc3M9J2ZhIGZhLWVqZWN0Jz48L2k+XCI7XG5cbiAgICAgICAgdmFyIGVqZWN0TWVudUl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuICAgICAgICB2YXIgZWplY3RMaW5rSXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgZWplY3RMaW5rSXRlbS5pbm5lckhUTUwgPSBlamVjdEluZGljYXRvciArICcgS2ljayBvdXQnO1xuICAgICAgICBlamVjdExpbmtJdGVtLm9uY2xpY2sgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgWE1QUEFjdGl2YXRvci5lamVjdChqaWQpO1xuICAgICAgICAgICAgcG9wdXBtZW51RWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ2Rpc3BsYXk6bm9uZTsnKTtcbiAgICAgICAgfTtcblxuICAgICAgICBlamVjdE1lbnVJdGVtLmFwcGVuZENoaWxkKGVqZWN0TGlua0l0ZW0pO1xuICAgICAgICBwb3B1cG1lbnVFbGVtZW50LmFwcGVuZENoaWxkKGVqZWN0TWVudUl0ZW0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE9uIGF1ZGlvIG11dGVkIGV2ZW50LlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ2F1ZGlvbXV0ZWQubXVjJywgZnVuY3Rpb24gKGV2ZW50LCBqaWQsIGlzTXV0ZWQpIHtcbiAgICAgICAgdmFyIHZpZGVvU3BhbklkID0gbnVsbDtcbiAgICAgICAgaWYgKGppZCA9PT0gWE1QUEFjdGl2YXRvci5nZXRNeUpJRCgpKSB7XG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdsb2NhbFZpZGVvQ29udGFpbmVyJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmVuc3VyZVBlZXJDb250YWluZXJFeGlzdHMoamlkKTtcbiAgICAgICAgICAgIHZpZGVvU3BhbklkID0gJ3BhcnRpY2lwYW50XycgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKFhNUFBBY3RpdmF0b3IuaXNGb2N1cygpKSB7XG4gICAgICAgICAgICBtdXRlZEF1ZGlvc1tqaWRdID0gaXNNdXRlZDtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZVJlbW90ZVZpZGVvTWVudShqaWQsIGlzTXV0ZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZpZGVvU3BhbklkKVxuICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0F1ZGlvSW5kaWNhdG9yKHZpZGVvU3BhbklkLCBpc011dGVkKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIE9uIHZpZGVvIG11dGVkIGV2ZW50LlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ3ZpZGVvbXV0ZWQubXVjJywgZnVuY3Rpb24gKGV2ZW50LCBqaWQsIGlzTXV0ZWQpIHtcbiAgICAgICAgdmFyIHZpZGVvU3BhbklkID0gbnVsbDtcbiAgICAgICAgaWYgKGppZCA9PT0gWE1QUEFjdGl2YXRvci5nZXRNeUpJRCgpKSB7XG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdsb2NhbFZpZGVvQ29udGFpbmVyJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmVuc3VyZVBlZXJDb250YWluZXJFeGlzdHMoamlkKTtcbiAgICAgICAgICAgIHZpZGVvU3BhbklkID0gJ3BhcnRpY2lwYW50XycgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZpZGVvU3BhbklkKVxuICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd1ZpZGVvSW5kaWNhdG9yKHZpZGVvU3BhbklkLCBpc011dGVkKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIERpc3BsYXkgbmFtZSBjaGFuZ2VkLlxuICAgICAqL1xuICAgIG15Lm9uRGlzcGxheU5hbWVDaGFuZ2VkID1cbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKGppZCwgZGlzcGxheU5hbWUsIHN0YXR1cykge1xuICAgICAgICBpZiAoamlkID09PSAnbG9jYWxWaWRlb0NvbnRhaW5lcidcbiAgICAgICAgICAgIHx8IGppZCA9PT0gWE1QUEFjdGl2YXRvci5nZXRNeUpJRCgpKSB7XG4gICAgICAgICAgICBzZXREaXNwbGF5TmFtZSgnbG9jYWxWaWRlb0NvbnRhaW5lcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNwbGF5TmFtZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5lbnN1cmVQZWVyQ29udGFpbmVyRXhpc3RzKGppZCk7XG5cbiAgICAgICAgICAgIHNldERpc3BsYXlOYW1lKFxuICAgICAgICAgICAgICAgICdwYXJ0aWNpcGFudF8nICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKSxcbiAgICAgICAgICAgICAgICBkaXNwbGF5TmFtZSxcbiAgICAgICAgICAgICAgICBzdGF0dXMpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIE9uIGRvbWluYW50IHNwZWFrZXIgY2hhbmdlZCBldmVudC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdkb21pbmFudHNwZWFrZXJjaGFuZ2VkJywgZnVuY3Rpb24gKGV2ZW50LCByZXNvdXJjZUppZCkge1xuICAgICAgICAvLyBXZSBpZ25vcmUgbG9jYWwgdXNlciBldmVudHMuXG4gICAgICAgIGlmIChyZXNvdXJjZUppZFxuICAgICAgICAgICAgICAgID09PSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChYTVBQQWN0aXZhdG9yLmdldE15SklEKCkpKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgY3VycmVudCBkb21pbmFudCBzcGVha2VyLlxuICAgICAgICBpZiAocmVzb3VyY2VKaWQgIT09IGN1cnJlbnREb21pbmFudFNwZWFrZXIpIHtcbiAgICAgICAgICAgIHZhciBvbGRTcGVha2VyVmlkZW9TcGFuSWQgPSBcInBhcnRpY2lwYW50X1wiICsgY3VycmVudERvbWluYW50U3BlYWtlcixcbiAgICAgICAgICAgICAgICBuZXdTcGVha2VyVmlkZW9TcGFuSWQgPSBcInBhcnRpY2lwYW50X1wiICsgcmVzb3VyY2VKaWQ7XG4gICAgICAgICAgICBpZigkKFwiI1wiICsgb2xkU3BlYWtlclZpZGVvU3BhbklkICsgXCI+c3Bhbi5kaXNwbGF5bmFtZVwiKS50ZXh0KCkgPT09XG4gICAgICAgICAgICAgICAgaW50ZXJmYWNlQ29uZmlnLkRFRkFVTFRfRE9NSU5BTlRfU1BFQUtFUl9ESVNQTEFZX05BTUUpIHtcbiAgICAgICAgICAgICAgICBzZXREaXNwbGF5TmFtZShvbGRTcGVha2VyVmlkZW9TcGFuSWQsIG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYoJChcIiNcIiArIG5ld1NwZWFrZXJWaWRlb1NwYW5JZCArIFwiPnNwYW4uZGlzcGxheW5hbWVcIikudGV4dCgpID09PVxuICAgICAgICAgICAgICAgIGludGVyZmFjZUNvbmZpZy5ERUZBVUxUX1JFTU9URV9ESVNQTEFZX05BTUUpIHtcbiAgICAgICAgICAgICAgICBzZXREaXNwbGF5TmFtZShuZXdTcGVha2VyVmlkZW9TcGFuSWQsXG4gICAgICAgICAgICAgICAgICAgIGludGVyZmFjZUNvbmZpZy5ERUZBVUxUX0RPTUlOQU5UX1NQRUFLRVJfRElTUExBWV9OQU1FKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGN1cnJlbnREb21pbmFudFNwZWFrZXIgPSByZXNvdXJjZUppZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE9idGFpbiBjb250YWluZXIgZm9yIG5ldyBkb21pbmFudCBzcGVha2VyLlxuICAgICAgICB2YXIgY29udGFpbmVyICA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFxuICAgICAgICAgICAgICAgICdwYXJ0aWNpcGFudF8nICsgcmVzb3VyY2VKaWQpO1xuXG4gICAgICAgIC8vIExvY2FsIHZpZGVvIHdpbGwgbm90IGhhdmUgY29udGFpbmVyIGZvdW5kLCBidXQgdGhhdCdzIG9rXG4gICAgICAgIC8vIHNpbmNlIHdlIGRvbid0IHdhbnQgdG8gc3dpdGNoIHRvIGxvY2FsIHZpZGVvLlxuICAgICAgICBpZiAoY29udGFpbmVyICYmICFWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciB2aWRlbyA9IGNvbnRhaW5lci5nZXRFbGVtZW50c0J5VGFnTmFtZShcInZpZGVvXCIpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGxhcmdlIHZpZGVvIGlmIHRoZSB2aWRlbyBzb3VyY2UgaXMgYWxyZWFkeSBhdmFpbGFibGUsXG4gICAgICAgICAgICAvLyBvdGhlcndpc2Ugd2FpdCBmb3IgdGhlIFwidmlkZW9hY3RpdmUuamluZ2xlXCIgZXZlbnQuXG4gICAgICAgICAgICBpZiAodmlkZW8ubGVuZ3RoICYmIHZpZGVvWzBdLmN1cnJlbnRUaW1lID4gMClcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC51cGRhdGVMYXJnZVZpZGVvKHZpZGVvWzBdLnNyYyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIE9uIGxhc3QgTiBjaGFuZ2UgZXZlbnQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZXZlbnQgdGhlIGV2ZW50IHRoYXQgbm90aWZpZWQgdXNcbiAgICAgKiBAcGFyYW0gbGFzdE5FbmRwb2ludHMgdGhlIGxpc3Qgb2YgbGFzdCBOIGVuZHBvaW50c1xuICAgICAqIEBwYXJhbSBlbmRwb2ludHNFbnRlcmluZ0xhc3ROIHRoZSBsaXN0IGN1cnJlbnRseSBlbnRlcmluZyBsYXN0IE5cbiAgICAgKiBlbmRwb2ludHNcbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdsYXN0bmNoYW5nZWQnLCBmdW5jdGlvbiAoIGV2ZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFzdE5FbmRwb2ludHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmRwb2ludHNFbnRlcmluZ0xhc3ROLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyZWFtKSB7XG4gICAgICAgIGlmIChsYXN0TkNvdW50ICE9PSBsYXN0TkVuZHBvaW50cy5sZW5ndGgpXG4gICAgICAgICAgICBsYXN0TkNvdW50ID0gbGFzdE5FbmRwb2ludHMubGVuZ3RoO1xuXG4gICAgICAgIGxhc3RORW5kcG9pbnRzQ2FjaGUgPSBsYXN0TkVuZHBvaW50cztcblxuICAgICAgICAkKCcjcmVtb3RlVmlkZW9zPnNwYW4nKS5lYWNoKGZ1bmN0aW9uKCBpbmRleCwgZWxlbWVudCApIHtcbiAgICAgICAgICAgIHZhciByZXNvdXJjZUppZCA9IFZpZGVvTGF5b3V0LmdldFBlZXJDb250YWluZXJSZXNvdXJjZUppZChlbGVtZW50KTtcblxuICAgICAgICAgICAgaWYgKHJlc291cmNlSmlkXG4gICAgICAgICAgICAgICAgJiYgbGFzdE5FbmRwb2ludHMubGVuZ3RoID4gMFxuICAgICAgICAgICAgICAgICYmIGxhc3RORW5kcG9pbnRzLmluZGV4T2YocmVzb3VyY2VKaWQpIDwgMCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVtb3ZlIGZyb20gbGFzdCBOXCIsIHJlc291cmNlSmlkKTtcbiAgICAgICAgICAgICAgICBzaG93UGVlckNvbnRhaW5lcihyZXNvdXJjZUppZCwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIWVuZHBvaW50c0VudGVyaW5nTGFzdE4gfHwgZW5kcG9pbnRzRW50ZXJpbmdMYXN0Ti5sZW5ndGggPCAwKVxuICAgICAgICAgICAgZW5kcG9pbnRzRW50ZXJpbmdMYXN0TiA9IGxhc3RORW5kcG9pbnRzO1xuXG4gICAgICAgIGlmIChlbmRwb2ludHNFbnRlcmluZ0xhc3ROICYmIGVuZHBvaW50c0VudGVyaW5nTGFzdE4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZW5kcG9pbnRzRW50ZXJpbmdMYXN0Ti5mb3JFYWNoKGZ1bmN0aW9uIChyZXNvdXJjZUppZCkge1xuXG4gICAgICAgICAgICAgICAgaWYgKCEkKCcjcGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkKS5pcygnOnZpc2libGUnKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkFkZCB0byBsYXN0IE5cIiwgcmVzb3VyY2VKaWQpO1xuICAgICAgICAgICAgICAgICAgICBzaG93UGVlckNvbnRhaW5lcihyZXNvdXJjZUppZCwgdHJ1ZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgZGVwLlVJQWN0aXZhdG9yKCkuZ2V0UlRDU2VydmljZSgpLnJlbW90ZVN0cmVhbXMuc29tZShmdW5jdGlvbiAobWVkaWFTdHJlYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZWRpYVN0cmVhbS5wZWVyamlkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQobWVkaWFTdHJlYW0ucGVlcmppZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPT09IHJlc291cmNlSmlkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgbWVkaWFTdHJlYW0udHlwZSA9PT0gbWVkaWFTdHJlYW0uVklERU9fVFlQRSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzZWwgPSAkKCcjcGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkICsgJz52aWRlbycpO1xuXG4vLzw8PDw8PDwgSEVBRDpVSS92aWRlb2xheW91dC5qc1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0YWNoTWVkaWFTdHJlYW0oc2VsLCBtZWRpYVN0cmVhbS5zdHJlYW0pO1xuLy89PT09PT09XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNpbXVsY2FzdCA9IG5ldyBTaW11bGNhc3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmlkZW9TdHJlYW0gPSBzaW11bGNhc3QuZ2V0UmVjZWl2aW5nVmlkZW9TdHJlYW0obWVkaWFTdHJlYW0uc3RyZWFtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRhY2hNZWRpYVN0cmVhbShzZWwsIHZpZGVvU3RyZWFtKTtcbi8vPj4+Pj4+PiBtYXN0ZXI6dmlkZW9sYXlvdXQuanNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YWl0Rm9yUmVtb3RlVmlkZW8oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZWRpYVN0cmVhbS5zc3JjLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVkaWFTdHJlYW0uc3RyZWFtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIHdhaXRGb3JSZW1vdGVWaWRlbyhzZWxlY3Rvciwgc3NyYywgc3RyZWFtKSB7XG4gICAgICAgIGlmIChzZWxlY3Rvci5yZW1vdmVkIHx8ICFzZWxlY3Rvci5wYXJlbnQoKS5pcyhcIjp2aXNpYmxlXCIpKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCJNZWRpYSByZW1vdmVkIGJlZm9yZSBoYWQgc3RhcnRlZFwiLCBzZWxlY3Rvcik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3RyZWFtLmlkID09PSAnbWl4ZWRtc2xhYmVsJykgcmV0dXJuO1xuXG4gICAgICAgIGlmIChzZWxlY3RvclswXS5jdXJyZW50VGltZSA+IDApIHtcbiAgICAgICAgICAgIHZhciBzaW11bGNhc3QgPSBuZXcgU2ltdWxjYXN0KCk7XG4gICAgICAgICAgICB2YXIgdmlkZW9TdHJlYW0gPSBzaW11bGNhc3QuZ2V0UmVjZWl2aW5nVmlkZW9TdHJlYW0oc3RyZWFtKTtcbiAgICAgICAgICAgIGF0dGFjaE1lZGlhU3RyZWFtKHNlbGVjdG9yLCB2aWRlb1N0cmVhbSk7IC8vIEZJWE1FOiB3aHkgZG8gaSBoYXZlIHRvIGRvIHRoaXMgZm9yIEZGP1xuXG4gICAgICAgICAgICAvLyBGSVhNRTogYWRkIGEgY2xhc3MgdGhhdCB3aWxsIGFzc29jaWF0ZSBwZWVyIEppZCwgdmlkZW8uc3JjLCBpdCdzIHNzcmMgYW5kIHZpZGVvIHR5cGVcbiAgICAgICAgICAgIC8vICAgICAgICBpbiBvcmRlciB0byBnZXQgcmlkIG9mIHRvbyBtYW55IG1hcHNcbiAgICAgICAgICAgIGlmIChzc3JjICYmIHNlbGVjdG9yLmF0dHIoJ3NyYycpKSB7XG4gICAgICAgICAgICAgICAgdmlkZW9TcmNUb1NzcmNbc2VsZWN0b3IuYXR0cignc3JjJyldID0gc3NyYztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiTm8gc3NyYyBnaXZlbiBmb3IgdmlkZW9cIiwgc2VsZWN0b3IpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2aWRlb0FjdGl2ZShzZWxlY3Rvcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB3YWl0Rm9yUmVtb3RlVmlkZW8oc2VsZWN0b3IsIHNzcmMsIHN0cmVhbSk7XG4gICAgICAgICAgICB9LCAyNTApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdmlkZW9BY3RpdmUodmlkZW9lbGVtKSB7XG4gICAgICAgIGlmICh2aWRlb2VsZW0uYXR0cignaWQnKS5pbmRleE9mKCdtaXhlZG1zbGFiZWwnKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIC8vIGlnbm9yZSBtaXhlZG1zbGFiZWxhMCBhbmQgdjBcblxuICAgICAgICAgICAgdmlkZW9lbGVtLnNob3coKTtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZVRodW1ibmFpbHMoKTtcblxuICAgICAgICAgICAgdmFyIHZpZGVvUGFyZW50ID0gdmlkZW9lbGVtLnBhcmVudCgpO1xuICAgICAgICAgICAgdmFyIHBhcmVudFJlc291cmNlSmlkID0gbnVsbDtcbiAgICAgICAgICAgIGlmICh2aWRlb1BhcmVudClcbiAgICAgICAgICAgICAgICBwYXJlbnRSZXNvdXJjZUppZFxuICAgICAgICAgICAgICAgICAgICA9IFZpZGVvTGF5b3V0LmdldFBlZXJDb250YWluZXJSZXNvdXJjZUppZCh2aWRlb1BhcmVudFswXSk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgbGFyZ2UgdmlkZW8gdG8gdGhlIGxhc3QgYWRkZWQgdmlkZW8gb25seSBpZiB0aGVyZSdzIG5vXG4gICAgICAgICAgICAvLyBjdXJyZW50IGRvbWluYW50IG9yIGZvY3VzZWQgc3BlYWtlciBvciB1cGRhdGUgaXQgdG8gdGhlIGN1cnJlbnRcbiAgICAgICAgICAgIC8vIGRvbWluYW50IHNwZWFrZXIuXG4gICAgICAgICAgICBpZiAoKCFWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMgJiYgIVZpZGVvTGF5b3V0LmdldERvbWluYW50U3BlYWtlclJlc291cmNlSmlkKCkpXG4gICAgICAgICAgICAgICAgfHwgKHBhcmVudFJlc291cmNlSmlkXG4gICAgICAgICAgICAgICAgJiYgVmlkZW9MYXlvdXQuZ2V0RG9taW5hbnRTcGVha2VyUmVzb3VyY2VKaWQoKVxuICAgICAgICAgICAgICAgICAgICA9PT0gcGFyZW50UmVzb3VyY2VKaWQpKSB7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQudXBkYXRlTGFyZ2VWaWRlbyh2aWRlb2VsZW0uYXR0cignc3JjJyksIDEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBWaWRlb0xheW91dC5zaG93Rm9jdXNJbmRpY2F0b3IoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBteS5yZXNpemVWaWRlb1NwYWNlID0gZnVuY3Rpb24ocmlnaHRDb2x1bW5FbCwgcmlnaHRDb2x1bW5TaXplLCBpc1Zpc2libGUpXG4gICAge1xuICAgICAgICB2YXIgdmlkZW9zcGFjZSA9ICQoJyN2aWRlb3NwYWNlJyk7XG5cbiAgICAgICAgdmFyIHZpZGVvc3BhY2VXaWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoIC0gcmlnaHRDb2x1bW5TaXplWzBdO1xuICAgICAgICB2YXIgdmlkZW9zcGFjZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgdmFyIHZpZGVvU2l6ZVxuICAgICAgICAgICAgPSBnZXRWaWRlb1NpemUobnVsbCwgbnVsbCwgdmlkZW9zcGFjZVdpZHRoLCB2aWRlb3NwYWNlSGVpZ2h0KTtcbiAgICAgICAgdmFyIHZpZGVvV2lkdGggPSB2aWRlb1NpemVbMF07XG4gICAgICAgIHZhciB2aWRlb0hlaWdodCA9IHZpZGVvU2l6ZVsxXTtcbiAgICAgICAgdmFyIHZpZGVvUG9zaXRpb24gPSBnZXRWaWRlb1Bvc2l0aW9uKHZpZGVvV2lkdGgsXG4gICAgICAgICAgICB2aWRlb0hlaWdodCxcbiAgICAgICAgICAgIHZpZGVvc3BhY2VXaWR0aCxcbiAgICAgICAgICAgIHZpZGVvc3BhY2VIZWlnaHQpO1xuICAgICAgICB2YXIgaG9yaXpvbnRhbEluZGVudCA9IHZpZGVvUG9zaXRpb25bMF07XG4gICAgICAgIHZhciB2ZXJ0aWNhbEluZGVudCA9IHZpZGVvUG9zaXRpb25bMV07XG5cbiAgICAgICAgdmFyIHRodW1ibmFpbFNpemUgPSBWaWRlb0xheW91dC5jYWxjdWxhdGVUaHVtYm5haWxTaXplKHZpZGVvc3BhY2VXaWR0aCk7XG4gICAgICAgIHZhciB0aHVtYm5haWxzV2lkdGggPSB0aHVtYm5haWxTaXplWzBdO1xuICAgICAgICB2YXIgdGh1bWJuYWlsc0hlaWdodCA9IHRodW1ibmFpbFNpemVbMV07XG5cbiAgICAgICAgaWYgKGlzVmlzaWJsZSkge1xuICAgICAgICAgICAgdmlkZW9zcGFjZS5hbmltYXRlKHtyaWdodDogcmlnaHRDb2x1bW5TaXplWzBdLFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogdmlkZW9zcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZpZGVvc3BhY2VIZWlnaHR9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDB9KTtcblxuICAgICAgICAgICAgJCgnI3JlbW90ZVZpZGVvcycpLmFuaW1hdGUoe2hlaWdodDogdGh1bWJuYWlsc0hlaWdodH0sXG4gICAgICAgICAgICAgICAge3F1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMH0pO1xuXG4gICAgICAgICAgICAkKCcjcmVtb3RlVmlkZW9zPnNwYW4nKS5hbmltYXRlKHtoZWlnaHQ6IHRodW1ibmFpbHNIZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiB0aHVtYm5haWxzV2lkdGh9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDAsXG4gICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJyZW1vdGV2aWRlby5yZXNpemVkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgW3RodW1ibmFpbHNXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGh1bWJuYWlsc0hlaWdodF0pO1xuICAgICAgICAgICAgICAgICAgICB9fSk7XG5cbiAgICAgICAgICAgICQoJyNsYXJnZVZpZGVvQ29udGFpbmVyJykuYW5pbWF0ZSh7IHdpZHRoOiB2aWRlb3NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogdmlkZW9zcGFjZUhlaWdodH0sXG4gICAgICAgICAgICAgICAge3F1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMFxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlbycpLmFuaW1hdGUoeyAgd2lkdGg6IHZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgIHRvcDogdmVydGljYWxJbmRlbnQsXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbTogdmVydGljYWxJbmRlbnQsXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IGhvcml6b250YWxJbmRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiBob3Jpem9udGFsSW5kZW50fSxcbiAgICAgICAgICAgICAgICB7ICAgcXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJpZ2h0Q29sdW1uRWwuaGlkZShcInNsaWRlXCIsIHsgZGlyZWN0aW9uOiBcInJpZ2h0XCIsXG4gICAgICAgICAgICAgICAgcXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIFVuZG9jayB0aGUgdG9vbGJhciB3aGVuIHRoZSBjaGF0IGlzIHNob3duIGFuZCBpZiB3ZSdyZSBpbiBhXG4gICAgICAgICAgICAvLyB2aWRlbyBtb2RlLlxuICAgICAgICAgICAgaWYgKFZpZGVvTGF5b3V0LmlzTGFyZ2VWaWRlb1Zpc2libGUoKSlcbiAgICAgICAgICAgICAgICBkZXAuVG9vbGJhcigpLmRvY2tUb29sYmFyKGZhbHNlKTtcblxuICAgICAgICAgICAgdmlkZW9zcGFjZS5hbmltYXRlKHtyaWdodDogcmlnaHRDb2x1bW5TaXplWzBdLFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogdmlkZW9zcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZpZGVvc3BhY2VIZWlnaHR9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDAsXG4gICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByaWdodENvbHVtbkVsLnRyaWdnZXIoJ3Nob3duJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgJCgnI3JlbW90ZVZpZGVvcycpLmFuaW1hdGUoe2hlaWdodDogdGh1bWJuYWlsc0hlaWdodH0sXG4gICAgICAgICAgICAgICAge3F1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMH0pO1xuXG4gICAgICAgICAgICAkKCcjcmVtb3RlVmlkZW9zPnNwYW4nKS5hbmltYXRlKHtoZWlnaHQ6IHRodW1ibmFpbHNIZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiB0aHVtYm5haWxzV2lkdGh9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDAsXG4gICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJyZW1vdGV2aWRlby5yZXNpemVkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgW3RodW1ibmFpbHNXaWR0aCwgdGh1bWJuYWlsc0hlaWdodF0pO1xuICAgICAgICAgICAgICAgICAgICB9fSk7XG5cbiAgICAgICAgICAgICQoJyNsYXJnZVZpZGVvQ29udGFpbmVyJykuYW5pbWF0ZSh7IHdpZHRoOiB2aWRlb3NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogdmlkZW9zcGFjZUhlaWdodH0sXG4gICAgICAgICAgICAgICAge3F1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMFxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlbycpLmFuaW1hdGUoeyAgd2lkdGg6IHZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgIHRvcDogdmVydGljYWxJbmRlbnQsXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbTogdmVydGljYWxJbmRlbnQsXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IGhvcml6b250YWxJbmRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiBob3Jpem9udGFsSW5kZW50fSxcbiAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJpZ2h0Q29sdW1uRWwuc2hvdyhcInNsaWRlXCIsIHsgZGlyZWN0aW9uOiBcInJpZ2h0XCIsXG4gICAgICAgICAgICAgICAgcXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgICQoZG9jdW1lbnQpLmJpbmQoJ3NpbXVsY2FzdGxheWVyc3RhcnRlZCcsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIHZhciBsb2NhbFZpZGVvU2VsZWN0b3IgPSAkKCcjJyArICdsb2NhbFZpZGVvXycgK1xuICAgICAgICAgICAgZGVwLlVJQWN0aXZhdG9yKCkuZ2V0UlRDU2VydmljZSgpLmxvY2FsVmlkZW8uZ2V0T3JpZ2luYWxTdHJlYW0oKS5sb2NhbFZpZGVvLmlkKTtcbiAgICAgICAgdmFyIHNpbXVsY2FzdCA9IG5ldyBTaW11bGNhc3QoKTtcbiAgICAgICAgdmFyIHN0cmVhbSA9IHNpbXVsY2FzdC5nZXRMb2NhbFZpZGVvU3RyZWFtKCk7XG5cbiAgICAgICAgLy8gQXR0YWNoIFdlYlJUQyBzdHJlYW1cbiAgICAgICAgYXR0YWNoTWVkaWFTdHJlYW0obG9jYWxWaWRlb1NlbGVjdG9yLCBzdHJlYW0pO1xuXG4gICAgICAgIGxvY2FsVmlkZW9TcmMgPSAkKGxvY2FsVmlkZW9TZWxlY3RvcikuYXR0cignc3JjJyk7XG4gICAgfSk7XG5cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdzaW11bGNhc3RsYXllcnN0b3BwZWQnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICB2YXIgbG9jYWxWaWRlb1NlbGVjdG9yID0gJCgnIycgKyAnbG9jYWxWaWRlb18nICtcbiAgICAgICAgICAgIGRlcC5VSUFjdGl2YXRvcigpLmdldFJUQ1NlcnZpY2UoKS5sb2NhbFZpZGVvLmdldE9yaWdpbmFsU3RyZWFtKCkubG9jYWxWaWRlby5pZCk7XG4gICAgICAgIHZhciBzaW11bGNhc3QgPSBuZXcgU2ltdWxjYXN0KCk7XG4gICAgICAgIHZhciBzdHJlYW0gPSBzaW11bGNhc3QuZ2V0TG9jYWxWaWRlb1N0cmVhbSgpO1xuXG4gICAgICAgIC8vIEF0dGFjaCBXZWJSVEMgc3RyZWFtXG4gICAgICAgIGF0dGFjaE1lZGlhU3RyZWFtKGxvY2FsVmlkZW9TZWxlY3Rvciwgc3RyZWFtKTtcblxuICAgICAgICBsb2NhbFZpZGVvU3JjID0gJChsb2NhbFZpZGVvU2VsZWN0b3IpLmF0dHIoJ3NyYycpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogT24gc2ltdWxjYXN0IGxheWVycyBjaGFuZ2VkIGV2ZW50LlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ3NpbXVsY2FzdGxheWVyc2NoYW5nZWQnLCBmdW5jdGlvbiAoZXZlbnQsIGVuZHBvaW50U2ltdWxjYXN0TGF5ZXJzKSB7XG4gICAgICAgIHZhciBzaW11bGNhc3QgPSBuZXcgU2ltdWxjYXN0KCk7XG4gICAgICAgIGVuZHBvaW50U2ltdWxjYXN0TGF5ZXJzLmZvckVhY2goZnVuY3Rpb24gKGVzbCkge1xuXG4gICAgICAgICAgICB2YXIgcHJpbWFyeVNTUkMgPSBlc2wuc2ltdWxjYXN0TGF5ZXIucHJpbWFyeVNTUkM7XG4gICAgICAgICAgICB2YXIgbXNpZCA9IHNpbXVsY2FzdC5nZXRSZW1vdGVWaWRlb1N0cmVhbUlkQnlTU1JDKHByaW1hcnlTU1JDKTtcblxuICAgICAgICAgICAgLy8gR2V0IHNlc3Npb24gYW5kIHN0cmVhbSBmcm9tIG1zaWQuXG4gICAgICAgICAgICB2YXIgc2Vzc2lvbiwgZWxlY3RlZFN0cmVhbTtcbiAgICAgICAgICAgIHZhciBpLCBqLCBrO1xuXG5cbiAgICAgICAgICAgIHZhciByZW1vdGVTdHJlYW1zID0gUlRDQWN0aXZhdG9yLmdldFJUQ1NlcnZpY2UoKS5yZW1vdGVTdHJlYW1zO1xuICAgICAgICAgICAgdmFyIHJlbW90ZVN0cmVhbTtcblxuICAgICAgICAgICAgaWYgKHJlbW90ZVN0cmVhbXMpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgcmVtb3RlU3RyZWFtcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICByZW1vdGVTdHJlYW0gPSByZW1vdGVTdHJlYW1zW2pdO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVjdGVkU3RyZWFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzdHJlYW0gZm91bmQsIHN0b3AuXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB2YXIgdHJhY2tzID0gcmVtb3RlU3RyZWFtLmdldE9yaWdpbmFsU3RyZWFtKCkuZ2V0VmlkZW9UcmFja3MoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRyYWNrcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChrID0gMDsgayA8IHRyYWNrcy5sZW5ndGg7IGsrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0cmFjayA9IHRyYWNrc1trXTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtc2lkID09PSBbcmVtb3RlU3RyZWFtLmlkLCB0cmFjay5pZF0uam9pbignICcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZWN0ZWRTdHJlYW0gPSBuZXcgd2Via2l0TWVkaWFTdHJlYW0oW3RyYWNrXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHN0cmVhbSBmb3VuZCwgc3RvcC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZWxlY3RlZFN0cmVhbSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnU3dpdGNoaW5nIHNpbXVsY2FzdCBzdWJzdHJlYW0uJyk7XG5cbiAgICAgICAgICAgICAgICB2YXIgbXNpZFBhcnRzID0gbXNpZC5zcGxpdCgnICcpO1xuICAgICAgICAgICAgICAgIHZhciBzZWxSZW1vdGVWaWRlbyA9ICQoWycjJywgJ3JlbW90ZVZpZGVvXycsIHJlbW90ZVN0cmVhbS5zaWQsICdfJywgbXNpZFBhcnRzWzBdXS5qb2luKCcnKSk7XG5cbiAgICAgICAgICAgICAgICB2YXIgdXBkYXRlTGFyZ2VWaWRlbyA9IChYTVBQQWN0aXZhdG9yLmdldEpJREZyb21TU1JDKHZpZGVvU3JjVG9Tc3JjW3NlbFJlbW90ZVZpZGVvLmF0dHIoJ3NyYycpXSlcbiAgICAgICAgICAgICAgICAgICAgPT0gWE1QUEFjdGl2YXRvci5nZXRKSURGcm9tU1NSQyh2aWRlb1NyY1RvU3NyY1tsYXJnZVZpZGVvTmV3U3JjXSkpO1xuICAgICAgICAgICAgICAgIHZhciB1cGRhdGVGb2N1c2VkVmlkZW9TcmMgPSAoc2VsUmVtb3RlVmlkZW8uYXR0cignc3JjJykgPT0gZm9jdXNlZFZpZGVvU3JjKTtcblxuICAgICAgICAgICAgICAgIHZhciBlbGVjdGVkU3RyZWFtVXJsID0gd2Via2l0VVJMLmNyZWF0ZU9iamVjdFVSTChlbGVjdGVkU3RyZWFtKTtcbiAgICAgICAgICAgICAgICBzZWxSZW1vdGVWaWRlby5hdHRyKCdzcmMnLCBlbGVjdGVkU3RyZWFtVXJsKTtcbiAgICAgICAgICAgICAgICB2aWRlb1NyY1RvU3NyY1tzZWxSZW1vdGVWaWRlby5hdHRyKCdzcmMnKV0gPSBwcmltYXJ5U1NSQztcblxuICAgICAgICAgICAgICAgIGlmICh1cGRhdGVMYXJnZVZpZGVvKSB7XG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8oZWxlY3RlZFN0cmVhbVVybCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHVwZGF0ZUZvY3VzZWRWaWRlb1NyYykge1xuICAgICAgICAgICAgICAgICAgICBmb2N1c2VkVmlkZW9TcmMgPSBlbGVjdGVkU3RyZWFtVXJsO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdDb3VsZCBub3QgZmluZCBhIHN0cmVhbSBvciBhIHNlc3Npb24uJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG15O1xufShWaWRlb0xheW91dCB8fCB7fSkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZGVvTGF5b3V0O1xuIiwidmFyIHVwZGF0ZVRpbWVvdXQ7XG52YXIgYW5pbWF0ZVRpbWVvdXQ7XG52YXIgUm9vbU5hbWVHZW5lcmF0b3IgPSByZXF1aXJlKFwiLi4vdXRpbC9yb29tbmFtZV9nZW5lcmF0b3JcIik7XG5cbmZ1bmN0aW9uIHNldHVwV2VsY29tZVBhZ2UoKSB7XG4gICAgJChcIiNkb21haW5fbmFtZVwiKS50ZXh0KHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArIFwiLy9cIiArIHdpbmRvdy5sb2NhdGlvbi5ob3N0ICsgXCIvXCIpO1xuICAgICQoXCJzcGFuW25hbWU9J2FwcE5hbWUnXVwiKS50ZXh0KGJyYW5kLmFwcE5hbWUpO1xuICAgICQoXCIjZW50ZXJfcm9vbV9idXR0b25cIikuY2xpY2soZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgZW50ZXJfcm9vbSgpO1xuICAgIH0pO1xuXG4gICAgJChcIiNlbnRlcl9yb29tX2ZpZWxkXCIpLmtleWRvd24oZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xuICAgICAgICAgICAgZW50ZXJfcm9vbSgpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAkKFwiI3JlbG9hZF9yb29tbmFtZVwiKS5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh1cGRhdGVUaW1lb3V0KTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KGFuaW1hdGVUaW1lb3V0KTtcbiAgICAgICAgdXBkYXRlX3Jvb21uYW1lKCk7XG4gICAgfSk7XG5cbiAgICAkKFwiI2Rpc2FibGVfd2VsY29tZVwiKS5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uud2VsY29tZVBhZ2VEaXNhYmxlZCA9ICQoXCIjZGlzYWJsZV93ZWxjb21lXCIpLmlzKFwiOmNoZWNrZWRcIik7XG4gICAgfSk7XG5cbiAgICB1cGRhdGVfcm9vbW5hbWUoKTtcbn07XG5cbmZ1bmN0aW9uIGVudGVyX3Jvb20oKVxue1xuICAgIHZhciB2YWwgPSAkKFwiI2VudGVyX3Jvb21fZmllbGRcIikudmFsKCk7XG4gICAgaWYoIXZhbClcbiAgICAgICAgdmFsID0gJChcIiNlbnRlcl9yb29tX2ZpZWxkXCIpLmF0dHIoXCJyb29tX25hbWVcIik7XG4gICAgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lID0gXCIvXCIgKyB2YWw7XG59XG5cbmZ1bmN0aW9uIGFuaW1hdGUod29yZCkge1xuICAgIHZhciBjdXJyZW50VmFsID0gJChcIiNlbnRlcl9yb29tX2ZpZWxkXCIpLmF0dHIoXCJwbGFjZWhvbGRlclwiKTtcbiAgICAkKFwiI2VudGVyX3Jvb21fZmllbGRcIikuYXR0cihcInBsYWNlaG9sZGVyXCIsIGN1cnJlbnRWYWwgKyB3b3JkLnN1YnN0cigwLCAxKSk7XG4gICAgYW5pbWF0ZVRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBhbmltYXRlKHdvcmQuc3Vic3RyaW5nKDEsIHdvcmQubGVuZ3RoKSlcbiAgICB9LCA3MCk7XG59XG5cblxuZnVuY3Rpb24gdXBkYXRlX3Jvb21uYW1lKClcbntcbiAgICB2YXIgd29yZCA9IFJvb21OYW1lR2VuZXJhdG9yLmdlbmVyYXRlUm9vbVdpdGhvdXRTZXBhcmF0b3IoKTtcbiAgICAkKFwiI2VudGVyX3Jvb21fZmllbGRcIikuYXR0cihcInJvb21fbmFtZVwiLCB3b3JkKTtcbiAgICAkKFwiI2VudGVyX3Jvb21fZmllbGRcIikuYXR0cihcInBsYWNlaG9sZGVyXCIsIFwiXCIpO1xuICAgIGFuaW1hdGUod29yZCk7XG4gICAgdXBkYXRlVGltZW91dCA9IHNldFRpbWVvdXQodXBkYXRlX3Jvb21uYW1lLCAxMDAwMCk7XG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZXR1cFdlbGNvbWVQYWdlKCk7XG4iLCJ2YXIgVmlkZW9MYXlvdXQgPSByZXF1aXJlKFwiLi4vVmlkZW9MYXlvdXRcIik7XG52YXIgQ2FudmFzVXRpbCA9IHJlcXVpcmUoXCIuL0NhbnZhc1V0aWwuanNcIik7XG5cbi8qKlxuICogVGhlIGF1ZGlvIExldmVscyBwbHVnaW4uXG4gKi9cbnZhciBBdWRpb0xldmVscyA9IChmdW5jdGlvbihteSkge1xuICAgIHZhciBhdWRpb0xldmVsQ2FudmFzQ2FjaGUgPSB7fTtcblxuICAgIG15LkxPQ0FMX0xFVkVMID0gJ2xvY2FsJztcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIGF1ZGlvIGxldmVsIGNhbnZhcyBmb3IgdGhlIGdpdmVuIHBlZXJKaWQuIElmIHRoZSBjYW52YXNcbiAgICAgKiBkaWRuJ3QgZXhpc3Qgd2UgY3JlYXRlIGl0LlxuICAgICAqL1xuICAgIG15LnVwZGF0ZUF1ZGlvTGV2ZWxDYW52YXMgPSBmdW5jdGlvbiAocGVlckppZCkge1xuICAgICAgICB2YXIgcmVzb3VyY2VKaWQgPSBudWxsO1xuICAgICAgICB2YXIgdmlkZW9TcGFuSWQgPSBudWxsO1xuICAgICAgICBpZiAoIXBlZXJKaWQpXG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdsb2NhbFZpZGVvQ29udGFpbmVyJztcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHBlZXJKaWQpO1xuXG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdwYXJ0aWNpcGFudF8nICsgcmVzb3VyY2VKaWQ7XG4gICAgICAgIH1cblxuICAgICAgICB2aWRlb1NwYW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh2aWRlb1NwYW5JZCk7XG5cbiAgICAgICAgaWYgKCF2aWRlb1NwYW4pIHtcbiAgICAgICAgICAgIGlmIChyZXNvdXJjZUppZClcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiTm8gdmlkZW8gZWxlbWVudCBmb3IgamlkXCIsIHJlc291cmNlSmlkKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiTm8gdmlkZW8gZWxlbWVudCBmb3IgbG9jYWwgdmlkZW8uXCIpO1xuXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYXVkaW9MZXZlbENhbnZhcyA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPmNhbnZhcycpO1xuXG4gICAgICAgIHZhciB2aWRlb1NwYWNlV2lkdGggPSAkKCcjcmVtb3RlVmlkZW9zJykud2lkdGgoKTtcbiAgICAgICAgdmFyIHRodW1ibmFpbFNpemVcbiAgICAgICAgICAgID0gVmlkZW9MYXlvdXQuY2FsY3VsYXRlVGh1bWJuYWlsU2l6ZSh2aWRlb1NwYWNlV2lkdGgpO1xuICAgICAgICB2YXIgdGh1bWJuYWlsV2lkdGggPSB0aHVtYm5haWxTaXplWzBdO1xuICAgICAgICB2YXIgdGh1bWJuYWlsSGVpZ2h0ID0gdGh1bWJuYWlsU2l6ZVsxXTtcblxuICAgICAgICBpZiAoIWF1ZGlvTGV2ZWxDYW52YXMgfHwgYXVkaW9MZXZlbENhbnZhcy5sZW5ndGggPT09IDApIHtcblxuICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhcy5jbGFzc05hbWUgPSBcImF1ZGlvbGV2ZWxcIjtcbiAgICAgICAgICAgIGF1ZGlvTGV2ZWxDYW52YXMuc3R5bGUuYm90dG9tID0gXCItXCIgKyBpbnRlcmZhY2VDb25maWcuQ0FOVkFTX0VYVFJBLzIgKyBcInB4XCI7XG4gICAgICAgICAgICBhdWRpb0xldmVsQ2FudmFzLnN0eWxlLmxlZnQgPSBcIi1cIiArIGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkEvMiArIFwicHhcIjtcbiAgICAgICAgICAgIHJlc2l6ZUF1ZGlvTGV2ZWxDYW52YXMoIGF1ZGlvTGV2ZWxDYW52YXMsXG4gICAgICAgICAgICAgICAgICAgIHRodW1ibmFpbFdpZHRoLFxuICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxIZWlnaHQpO1xuXG4gICAgICAgICAgICB2aWRlb1NwYW4uYXBwZW5kQ2hpbGQoYXVkaW9MZXZlbENhbnZhcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhdWRpb0xldmVsQ2FudmFzID0gYXVkaW9MZXZlbENhbnZhcy5nZXQoMCk7XG5cbiAgICAgICAgICAgIHJlc2l6ZUF1ZGlvTGV2ZWxDYW52YXMoIGF1ZGlvTGV2ZWxDYW52YXMsXG4gICAgICAgICAgICAgICAgICAgIHRodW1ibmFpbFdpZHRoLFxuICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxIZWlnaHQpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIGF1ZGlvIGxldmVsIFVJIGZvciB0aGUgZ2l2ZW4gcmVzb3VyY2VKaWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVzb3VyY2VKaWQgdGhlIHJlc291cmNlIGppZCBpbmRpY2F0aW5nIHRoZSB2aWRlbyBlbGVtZW50IGZvclxuICAgICAqIHdoaWNoIHdlIGRyYXcgdGhlIGF1ZGlvIGxldmVsXG4gICAgICogQHBhcmFtIGF1ZGlvTGV2ZWwgdGhlIG5ld0F1ZGlvIGxldmVsIHRvIHJlbmRlclxuICAgICAqL1xuICAgIG15LnVwZGF0ZUF1ZGlvTGV2ZWwgPSBmdW5jdGlvbiAocmVzb3VyY2VKaWQsIGF1ZGlvTGV2ZWwpIHtcbiAgICAgICAgZHJhd0F1ZGlvTGV2ZWxDYW52YXMocmVzb3VyY2VKaWQsIGF1ZGlvTGV2ZWwpO1xuXG4gICAgICAgIHZhciB2aWRlb1NwYW5JZCA9IGdldFZpZGVvU3BhbklkKHJlc291cmNlSmlkKTtcblxuICAgICAgICB2YXIgYXVkaW9MZXZlbENhbnZhcyA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPmNhbnZhcycpLmdldCgwKTtcblxuICAgICAgICBpZiAoIWF1ZGlvTGV2ZWxDYW52YXMpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgdmFyIGRyYXdDb250ZXh0ID0gYXVkaW9MZXZlbENhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgICAgIHZhciBjYW52YXNDYWNoZSA9IGF1ZGlvTGV2ZWxDYW52YXNDYWNoZVtyZXNvdXJjZUppZF07XG5cbiAgICAgICAgZHJhd0NvbnRleHQuY2xlYXJSZWN0ICgwLCAwLFxuICAgICAgICAgICAgICAgIGF1ZGlvTGV2ZWxDYW52YXMud2lkdGgsIGF1ZGlvTGV2ZWxDYW52YXMuaGVpZ2h0KTtcbiAgICAgICAgZHJhd0NvbnRleHQuZHJhd0ltYWdlKGNhbnZhc0NhY2hlLCAwLCAwKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVzaXplcyB0aGUgZ2l2ZW4gYXVkaW8gbGV2ZWwgY2FudmFzIHRvIG1hdGNoIHRoZSBnaXZlbiB0aHVtYm5haWwgc2l6ZS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiByZXNpemVBdWRpb0xldmVsQ2FudmFzKGF1ZGlvTGV2ZWxDYW52YXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRodW1ibmFpbEhlaWdodCkge1xuICAgICAgICBhdWRpb0xldmVsQ2FudmFzLndpZHRoID0gdGh1bWJuYWlsV2lkdGggKyBpbnRlcmZhY2VDb25maWcuQ0FOVkFTX0VYVFJBO1xuICAgICAgICBhdWRpb0xldmVsQ2FudmFzLmhlaWdodCA9IHRodW1ibmFpbEhlaWdodCArIGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkE7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIERyYXdzIHRoZSBhdWRpbyBsZXZlbCBjYW52YXMgaW50byB0aGUgY2FjaGVkIGNhbnZhcyBvYmplY3QuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVzb3VyY2VKaWQgdGhlIHJlc291cmNlIGppZCBpbmRpY2F0aW5nIHRoZSB2aWRlbyBlbGVtZW50IGZvclxuICAgICAqIHdoaWNoIHdlIGRyYXcgdGhlIGF1ZGlvIGxldmVsXG4gICAgICogQHBhcmFtIGF1ZGlvTGV2ZWwgdGhlIG5ld0F1ZGlvIGxldmVsIHRvIHJlbmRlclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGRyYXdBdWRpb0xldmVsQ2FudmFzKHJlc291cmNlSmlkLCBhdWRpb0xldmVsKSB7XG4gICAgICAgIGlmICghYXVkaW9MZXZlbENhbnZhc0NhY2hlW3Jlc291cmNlSmlkXSkge1xuXG4gICAgICAgICAgICB2YXIgdmlkZW9TcGFuSWQgPSBnZXRWaWRlb1NwYW5JZChyZXNvdXJjZUppZCk7XG5cbiAgICAgICAgICAgIHZhciBhdWRpb0xldmVsQ2FudmFzT3JpZyA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPmNhbnZhcycpLmdldCgwKTtcblxuICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAqIEZJWE1FIFRlc3RpbmcgaGFzIHNob3duIHRoYXQgYXVkaW9MZXZlbENhbnZhc09yaWcgbWF5IG5vdCBleGlzdC5cbiAgICAgICAgICAgICAqIEluIHN1Y2ggYSBjYXNlLCB0aGUgbWV0aG9kIENhbnZhc1V0aWwuY2xvbmVDYW52YXMgbWF5IHRocm93IGFuXG4gICAgICAgICAgICAgKiBlcnJvci4gU2luY2UgYXVkaW8gbGV2ZWxzIGFyZSBmcmVxdWVudGx5IHVwZGF0ZWQsIHRoZSBlcnJvcnMgaGF2ZVxuICAgICAgICAgICAgICogYmVlbiBvYnNlcnZlZCB0byBwaWxlIGludG8gdGhlIGNvbnNvbGUsIHN0cmFpbiB0aGUgQ1BVLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpZiAoYXVkaW9MZXZlbENhbnZhc09yaWcpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhc0NhY2hlW3Jlc291cmNlSmlkXVxuICAgICAgICAgICAgICAgICAgICA9IENhbnZhc1V0aWwuY2xvbmVDYW52YXMoYXVkaW9MZXZlbENhbnZhc09yaWcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNhbnZhcyA9IGF1ZGlvTGV2ZWxDYW52YXNDYWNoZVtyZXNvdXJjZUppZF07XG5cbiAgICAgICAgaWYgKCFjYW52YXMpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgdmFyIGRyYXdDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbiAgICAgICAgZHJhd0NvbnRleHQuY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XG5cbiAgICAgICAgdmFyIHNoYWRvd0xldmVsID0gZ2V0U2hhZG93TGV2ZWwoYXVkaW9MZXZlbCk7XG5cbiAgICAgICAgaWYgKHNoYWRvd0xldmVsID4gMClcbiAgICAgICAgICAgIC8vIGRyYXdDb250ZXh0LCB4LCB5LCB3LCBoLCByLCBzaGFkb3dDb2xvciwgc2hhZG93TGV2ZWxcbiAgICAgICAgICAgIENhbnZhc1V0aWwuZHJhd1JvdW5kUmVjdEdsb3coICAgZHJhd0NvbnRleHQsXG4gICAgICAgICAgICAgICAgaW50ZXJmYWNlQ29uZmlnLkNBTlZBU19FWFRSQS8yLCBpbnRlcmZhY2VDb25maWcuQ0FOVkFTX0VYVFJBLzIsXG4gICAgICAgICAgICAgICAgY2FudmFzLndpZHRoIC0gaW50ZXJmYWNlQ29uZmlnLkNBTlZBU19FWFRSQSxcbiAgICAgICAgICAgICAgICBjYW52YXMuaGVpZ2h0IC0gaW50ZXJmYWNlQ29uZmlnLkNBTlZBU19FWFRSQSxcbiAgICAgICAgICAgICAgICBpbnRlcmZhY2VDb25maWcuQ0FOVkFTX1JBRElVUyxcbiAgICAgICAgICAgICAgICBpbnRlcmZhY2VDb25maWcuU0hBRE9XX0NPTE9SLFxuICAgICAgICAgICAgICAgIHNoYWRvd0xldmVsKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgc2hhZG93L2dsb3cgbGV2ZWwgZm9yIHRoZSBnaXZlbiBhdWRpbyBsZXZlbC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdWRpb0xldmVsIHRoZSBhdWRpbyBsZXZlbCBmcm9tIHdoaWNoIHdlIGRldGVybWluZSB0aGUgc2hhZG93XG4gICAgICogbGV2ZWxcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRTaGFkb3dMZXZlbCAoYXVkaW9MZXZlbCkge1xuICAgICAgICB2YXIgc2hhZG93TGV2ZWwgPSAwO1xuXG4gICAgICAgIGlmIChhdWRpb0xldmVsIDw9IDAuMykge1xuICAgICAgICAgICAgc2hhZG93TGV2ZWwgPSBNYXRoLnJvdW5kKGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkEvMiooYXVkaW9MZXZlbC8wLjMpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChhdWRpb0xldmVsIDw9IDAuNikge1xuICAgICAgICAgICAgc2hhZG93TGV2ZWwgPSBNYXRoLnJvdW5kKGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkEvMiooKGF1ZGlvTGV2ZWwgLSAwLjMpIC8gMC4zKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzaGFkb3dMZXZlbCA9IE1hdGgucm91bmQoaW50ZXJmYWNlQ29uZmlnLkNBTlZBU19FWFRSQS8yKigoYXVkaW9MZXZlbCAtIDAuNikgLyAwLjQpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2hhZG93TGV2ZWw7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHZpZGVvIHNwYW4gaWQgY29ycmVzcG9uZGluZyB0byB0aGUgZ2l2ZW4gcmVzb3VyY2VKaWQgb3IgbG9jYWxcbiAgICAgKiB1c2VyLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFZpZGVvU3BhbklkKHJlc291cmNlSmlkKSB7XG4gICAgICAgIHZhciB2aWRlb1NwYW5JZCA9IG51bGw7XG4gICAgICAgIGlmIChyZXNvdXJjZUppZCA9PT0gU3RhdGlzdGljc0FjdGl2YXRvci5MT0NBTF9KSUQpXG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdsb2NhbFZpZGVvQ29udGFpbmVyJztcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAncGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkO1xuXG4gICAgICAgIHJldHVybiB2aWRlb1NwYW5JZDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSW5kaWNhdGVzIHRoYXQgdGhlIHJlbW90ZSB2aWRlbyBoYXMgYmVlbiByZXNpemVkLlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ3JlbW90ZXZpZGVvLnJlc2l6ZWQnLCBmdW5jdGlvbiAoZXZlbnQsIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgdmFyIHJlc2l6ZWQgPSBmYWxzZTtcbiAgICAgICAgJCgnI3JlbW90ZVZpZGVvcz5zcGFuPmNhbnZhcycpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgY2FudmFzID0gJCh0aGlzKS5nZXQoMCk7XG4gICAgICAgICAgICBpZiAoY2FudmFzLndpZHRoICE9PSB3aWR0aCArIGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkEpIHtcbiAgICAgICAgICAgICAgICBjYW52YXMud2lkdGggPSB3aWR0aCArIGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkE7XG4gICAgICAgICAgICAgICAgcmVzaXplZCA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjYW52YXMuaGVpZ2ggIT09IGhlaWdodCArIGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkEpIHtcbiAgICAgICAgICAgICAgICBjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0ICsgaW50ZXJmYWNlQ29uZmlnLkNBTlZBU19FWFRSQTtcbiAgICAgICAgICAgICAgICByZXNpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHJlc2l6ZWQpXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhhdWRpb0xldmVsQ2FudmFzQ2FjaGUpLmZvckVhY2goZnVuY3Rpb24gKHJlc291cmNlSmlkKSB7XG4gICAgICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhc0NhY2hlW3Jlc291cmNlSmlkXS53aWR0aFxuICAgICAgICAgICAgICAgICAgICA9IHdpZHRoICsgaW50ZXJmYWNlQ29uZmlnLkNBTlZBU19FWFRSQTtcbiAgICAgICAgICAgICAgICBhdWRpb0xldmVsQ2FudmFzQ2FjaGVbcmVzb3VyY2VKaWRdLmhlaWdodFxuICAgICAgICAgICAgICAgICAgICA9IGhlaWdodCArIGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkE7XG4gICAgICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBteTtcblxufSkoQXVkaW9MZXZlbHMgfHwge30pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEF1ZGlvTGV2ZWxzO1xuIiwiLyoqXG4gKiBVdGlsaXR5IGNsYXNzIGZvciBkcmF3aW5nIGNhbnZhcyBzaGFwZXMuXG4gKi9cbnZhciBDYW52YXNVdGlsID0gKGZ1bmN0aW9uKG15KSB7XG5cbiAgICAvKipcbiAgICAgKiBEcmF3cyBhIHJvdW5kIHJlY3RhbmdsZSB3aXRoIGEgZ2xvdy4gVGhlIGdsb3dXaWR0aCBpbmRpY2F0ZXMgdGhlIGRlcHRoXG4gICAgICogb2YgdGhlIGdsb3cuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZHJhd0NvbnRleHQgdGhlIGNvbnRleHQgb2YgdGhlIGNhbnZhcyB0byBkcmF3IHRvXG4gICAgICogQHBhcmFtIHggdGhlIHggY29vcmRpbmF0ZSBvZiB0aGUgcm91bmQgcmVjdGFuZ2xlXG4gICAgICogQHBhcmFtIHkgdGhlIHkgY29vcmRpbmF0ZSBvZiB0aGUgcm91bmQgcmVjdGFuZ2xlXG4gICAgICogQHBhcmFtIHcgdGhlIHdpZHRoIG9mIHRoZSByb3VuZCByZWN0YW5nbGVcbiAgICAgKiBAcGFyYW0gaCB0aGUgaGVpZ2h0IG9mIHRoZSByb3VuZCByZWN0YW5nbGVcbiAgICAgKiBAcGFyYW0gZ2xvd0NvbG9yIHRoZSBjb2xvciBvZiB0aGUgZ2xvd1xuICAgICAqIEBwYXJhbSBnbG93V2lkdGggdGhlIHdpZHRoIG9mIHRoZSBnbG93XG4gICAgICovXG4gICAgbXkuZHJhd1JvdW5kUmVjdEdsb3dcbiAgICAgICAgPSBmdW5jdGlvbihkcmF3Q29udGV4dCwgeCwgeSwgdywgaCwgciwgZ2xvd0NvbG9yLCBnbG93V2lkdGgpIHtcblxuICAgICAgICAvLyBTYXZlIHRoZSBwcmV2aW91cyBzdGF0ZSBvZiB0aGUgY29udGV4dC5cbiAgICAgICAgZHJhd0NvbnRleHQuc2F2ZSgpO1xuXG4gICAgICAgIGlmICh3IDwgMiAqIHIpIHIgPSB3IC8gMjtcbiAgICAgICAgaWYgKGggPCAyICogcikgciA9IGggLyAyO1xuXG4gICAgICAgIC8vIERyYXcgYSByb3VuZCByZWN0YW5nbGUuXG4gICAgICAgIGRyYXdDb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICBkcmF3Q29udGV4dC5tb3ZlVG8oeCtyLCB5KTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCt3LCB5LCAgIHgrdywgeStoLCByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCt3LCB5K2gsIHgsICAgeStoLCByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCwgICB5K2gsIHgsICAgeSwgICByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCwgICB5LCAgIHgrdywgeSwgICByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuY2xvc2VQYXRoKCk7XG5cbiAgICAgICAgLy8gQWRkIGEgc2hhZG93IGFyb3VuZCB0aGUgcmVjdGFuZ2xlXG4gICAgICAgIGRyYXdDb250ZXh0LnNoYWRvd0NvbG9yID0gZ2xvd0NvbG9yO1xuICAgICAgICBkcmF3Q29udGV4dC5zaGFkb3dCbHVyID0gZ2xvd1dpZHRoO1xuICAgICAgICBkcmF3Q29udGV4dC5zaGFkb3dPZmZzZXRYID0gMDtcbiAgICAgICAgZHJhd0NvbnRleHQuc2hhZG93T2Zmc2V0WSA9IDA7XG5cbiAgICAgICAgLy8gRmlsbCB0aGUgc2hhcGUuXG4gICAgICAgIGRyYXdDb250ZXh0LmZpbGwoKTtcblxuICAgICAgICBkcmF3Q29udGV4dC5zYXZlKCk7XG5cbiAgICAgICAgZHJhd0NvbnRleHQucmVzdG9yZSgpO1xuXG4vLyAgICAgIDEpIFVuY29tbWVudCB0aGlzIGxpbmUgdG8gdXNlIENvbXBvc2l0ZSBPcGVyYXRpb24sIHdoaWNoIGlzIGRvaW5nIHRoZVxuLy8gICAgICBzYW1lIGFzIHRoZSBjbGlwIGZ1bmN0aW9uIGJlbG93IGFuZCBpcyBhbHNvIGFudGlhbGlhc2luZyB0aGUgcm91bmRcbi8vICAgICAgYm9yZGVyLCBidXQgaXMgc2FpZCB0byBiZSBsZXNzIGZhc3QgcGVyZm9ybWFuY2Ugd2lzZS5cblxuLy8gICAgICBkcmF3Q29udGV4dC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249J2Rlc3RpbmF0aW9uLW91dCc7XG5cbiAgICAgICAgZHJhd0NvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgIGRyYXdDb250ZXh0Lm1vdmVUbyh4K3IsIHkpO1xuICAgICAgICBkcmF3Q29udGV4dC5hcmNUbyh4K3csIHksICAgeCt3LCB5K2gsIHIpO1xuICAgICAgICBkcmF3Q29udGV4dC5hcmNUbyh4K3csIHkraCwgeCwgICB5K2gsIHIpO1xuICAgICAgICBkcmF3Q29udGV4dC5hcmNUbyh4LCAgIHkraCwgeCwgICB5LCAgIHIpO1xuICAgICAgICBkcmF3Q29udGV4dC5hcmNUbyh4LCAgIHksICAgeCt3LCB5LCAgIHIpO1xuICAgICAgICBkcmF3Q29udGV4dC5jbG9zZVBhdGgoKTtcblxuLy8gICAgICAyKSBVbmNvbW1lbnQgdGhpcyBsaW5lIHRvIHVzZSBDb21wb3NpdGUgT3BlcmF0aW9uLCB3aGljaCBpcyBkb2luZyB0aGVcbi8vICAgICAgc2FtZSBhcyB0aGUgY2xpcCBmdW5jdGlvbiBiZWxvdyBhbmQgaXMgYWxzbyBhbnRpYWxpYXNpbmcgdGhlIHJvdW5kXG4vLyAgICAgIGJvcmRlciwgYnV0IGlzIHNhaWQgdG8gYmUgbGVzcyBmYXN0IHBlcmZvcm1hbmNlIHdpc2UuXG5cbi8vICAgICAgZHJhd0NvbnRleHQuZmlsbCgpO1xuXG4gICAgICAgIC8vIENvbW1lbnQgdGhlc2UgdHdvIGxpbmVzIGlmIGNob29zaW5nIHRvIGRvIHRoZSBzYW1lIHdpdGggY29tcG9zaXRlXG4gICAgICAgIC8vIG9wZXJhdGlvbiBhYm92ZSAxIGFuZCAyLlxuICAgICAgICBkcmF3Q29udGV4dC5jbGlwKCk7XG4gICAgICAgIGRyYXdDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCAyNzcsIDIwMCk7XG5cbiAgICAgICAgLy8gUmVzdG9yZSB0aGUgcHJldmlvdXMgY29udGV4dCBzdGF0ZS5cbiAgICAgICAgZHJhd0NvbnRleHQucmVzdG9yZSgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDbG9uZXMgdGhlIGdpdmVuIGNhbnZhcy5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gdGhlIG5ldyBjbG9uZWQgY2FudmFzLlxuICAgICAqL1xuICAgIG15LmNsb25lQ2FudmFzID0gZnVuY3Rpb24gKG9sZENhbnZhcykge1xuICAgICAgICAvKlxuICAgICAgICAgKiBGSVhNRSBUZXN0aW5nIGhhcyBzaG93biB0aGF0IG9sZENhbnZhcyBtYXkgbm90IGV4aXN0LiBJbiBzdWNoIGEgY2FzZSxcbiAgICAgICAgICogdGhlIG1ldGhvZCBDYW52YXNVdGlsLmNsb25lQ2FudmFzIG1heSB0aHJvdyBhbiBlcnJvci4gU2luY2UgYXVkaW9cbiAgICAgICAgICogbGV2ZWxzIGFyZSBmcmVxdWVudGx5IHVwZGF0ZWQsIHRoZSBlcnJvcnMgaGF2ZSBiZWVuIG9ic2VydmVkIHRvIHBpbGVcbiAgICAgICAgICogaW50byB0aGUgY29uc29sZSwgc3RyYWluIHRoZSBDUFUuXG4gICAgICAgICAqL1xuICAgICAgICBpZiAoIW9sZENhbnZhcylcbiAgICAgICAgICAgIHJldHVybiBvbGRDYW52YXM7XG5cbiAgICAgICAgLy9jcmVhdGUgYSBuZXcgY2FudmFzXG4gICAgICAgIHZhciBuZXdDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgdmFyIGNvbnRleHQgPSBuZXdDYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgICAgICAvL3NldCBkaW1lbnNpb25zXG4gICAgICAgIG5ld0NhbnZhcy53aWR0aCA9IG9sZENhbnZhcy53aWR0aDtcbiAgICAgICAgbmV3Q2FudmFzLmhlaWdodCA9IG9sZENhbnZhcy5oZWlnaHQ7XG5cbiAgICAgICAgLy9hcHBseSB0aGUgb2xkIGNhbnZhcyB0byB0aGUgbmV3IG9uZVxuICAgICAgICBjb250ZXh0LmRyYXdJbWFnZShvbGRDYW52YXMsIDAsIDApO1xuXG4gICAgICAgIC8vcmV0dXJuIHRoZSBuZXcgY2FudmFzXG4gICAgICAgIHJldHVybiBuZXdDYW52YXM7XG4gICAgfTtcblxuICAgIHJldHVybiBteTtcbn0pKENhbnZhc1V0aWwgfHwge30pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbnZhc1V0aWw7XG4iLCIvKiBnbG9iYWwgJCwgVXRpbCwgY29ubmVjdGlvbiwgbmlja25hbWU6dHJ1ZSwgZ2V0VmlkZW9TaXplLCBnZXRWaWRlb1Bvc2l0aW9uLCBzaG93VG9vbGJhciwgcHJvY2Vzc1JlcGxhY2VtZW50cyAqL1xudmFyIFJlcGxhY2VtZW50ID0gcmVxdWlyZShcIi4vUmVwbGFjZW1lbnQuanNcIik7XG52YXIgZGVwID0ge1xuICAgIFwiVmlkZW9MYXlvdXRcIjogZnVuY3Rpb24oKXsgcmV0dXJuIHJlcXVpcmUoXCIuLi9WaWRlb0xheW91dFwiKX0sXG4gICAgXCJUb29sYmFyXCI6IGZ1bmN0aW9uKCl7cmV0dXJuIHJlcXVpcmUoXCIuLi90b29sYmFycy9Ub29sYmFyXCIpfSxcbiAgICBcIlVJQWN0aXZhdG9yXCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHJlcXVpcmUoXCIuLi9VSUFjdGl2YXRvclwiKTtcbiAgICB9XG59O1xuLyoqXG4gKiBDaGF0IHJlbGF0ZWQgdXNlciBpbnRlcmZhY2UuXG4gKi9cbnZhciBDaGF0ID0gKGZ1bmN0aW9uIChteSkge1xuICAgIHZhciBub3RpZmljYXRpb25JbnRlcnZhbCA9IGZhbHNlO1xuICAgIHZhciB1bnJlYWRNZXNzYWdlcyA9IDA7XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyBjaGF0IHJlbGF0ZWQgaW50ZXJmYWNlLlxuICAgICAqL1xuICAgIG15LmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzdG9yZWREaXNwbGF5TmFtZSA9IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZGlzcGxheW5hbWU7XG4gICAgICAgIHZhciBuaWNrbmFtZSA9IG51bGw7XG4gICAgICAgIGlmIChzdG9yZWREaXNwbGF5TmFtZSkge1xuICAgICAgICAgICAgZGVwLlVJQWN0aXZhdG9yKCkuZ2V0VUlTZXJ2aWNlKCkuc2V0Tmlja25hbWUoc3RvcmVkRGlzcGxheU5hbWUpO1xuICAgICAgICAgICAgbmlja25hbWUgPSBzdG9yZWREaXNwbGF5TmFtZTtcbiAgICAgICAgICAgIENoYXQuc2V0Q2hhdENvbnZlcnNhdGlvbk1vZGUodHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAkKCcjbmlja2lucHV0Jykua2V5ZG93bihmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgdmFyIHZhbCA9IFV0aWwuZXNjYXBlSHRtbCh0aGlzLnZhbHVlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnZhbHVlID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKCFkZXAuVUlBY3RpdmF0b3IoKS5nZXRVSVNlcnZpY2UoKS5nZXROaWNrbmFtZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlcC5VSUFjdGl2YXRvcigpLmdldFVJU2VydmljZSgpLnNldE5pY2tuYW1lKHZhbCk7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UuZGlzcGxheW5hbWUgPSB2YWw7XG4gICAgICAgICAgICAgICAgICAgIC8vdGhpcyBzaG91bGQgYmUgY2hhbmdlZFxuICAgICAgICAgICAgICAgICAgICBYTVBQQWN0aXZhdG9yLmFkZFRvUHJlc2VuY2UoXCJkaXNwbGF5TmFtZVwiLCB2YWwpO1xuICAgICAgICAgICAgICAgICAgICBDaGF0LnNldENoYXRDb252ZXJzYXRpb25Nb2RlKHRydWUpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJyN1c2VybXNnJykua2V5ZG93bihmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gdGhpcy52YWx1ZTtcbiAgICAgICAgICAgICAgICAkKCcjdXNlcm1zZycpLnZhbCgnJykudHJpZ2dlcignYXV0b3NpemUucmVzaXplJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5mb2N1cygpO1xuICAgICAgICAgICAgICAgIHZhciBjb21tYW5kID0gbmV3IENvbW1hbmRzUHJvY2Vzc29yKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZihjb21tYW5kLmlzQ29tbWFuZCgpKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZC5wcm9jZXNzQ29tbWFuZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAvL3RoaXMgc2hvdWxkIGJlIGNoYW5nZWRcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBVdGlsLmVzY2FwZUh0bWwodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBYTVBQQWN0aXZhdG9yLnNlbmRNZXNzYWdlKG1lc3NhZ2UsIGRlcC5VSUFjdGl2YXRvcigpLmdldFVJU2VydmljZSgpLmdldE5pY2tuYW1lKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIG9uVGV4dEFyZWFSZXNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXNpemVDaGF0Q29udmVyc2F0aW9uKCk7XG4gICAgICAgICAgICBzY3JvbGxDaGF0VG9Cb3R0b20oKTtcbiAgICAgICAgfTtcbiAgICAgICAgJCgnI3VzZXJtc2cnKS5hdXRvc2l6ZSh7Y2FsbGJhY2s6IG9uVGV4dEFyZWFSZXNpemV9KTtcblxuICAgICAgICAkKFwiI2NoYXRzcGFjZVwiKS5iaW5kKFwic2hvd25cIixcbiAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY3JvbGxDaGF0VG9Cb3R0b20oKTtcbiAgICAgICAgICAgICAgICB1bnJlYWRNZXNzYWdlcyA9IDA7XG4gICAgICAgICAgICAgICAgc2V0VmlzdWFsTm90aWZpY2F0aW9uKGZhbHNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBcHBlbmRzIHRoZSBnaXZlbiBtZXNzYWdlIHRvIHRoZSBjaGF0IGNvbnZlcnNhdGlvbi5cbiAgICAgKi9cbiAgICBteS51cGRhdGVDaGF0Q29udmVyc2F0aW9uID0gZnVuY3Rpb24gKGZyb20sIGRpc3BsYXlOYW1lLCBtZXNzYWdlKSB7XG4gICAgICAgIHZhciBkaXZDbGFzc05hbWUgPSAnJztcblxuICAgICAgICBpZiAoWE1QUEFjdGl2YXRvci5nZXRNeUpJRCgpID09PSBmcm9tKSB7XG4gICAgICAgICAgICBkaXZDbGFzc05hbWUgPSBcImxvY2FsdXNlclwiO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZGl2Q2xhc3NOYW1lID0gXCJyZW1vdGV1c2VyXCI7XG5cbiAgICAgICAgICAgIGlmICghQ2hhdC5pc1Zpc2libGUoKSkge1xuICAgICAgICAgICAgICAgIHVucmVhZE1lc3NhZ2VzKys7XG4gICAgICAgICAgICAgICAgVXRpbC5wbGF5U291bmROb3RpZmljYXRpb24oJ2NoYXROb3RpZmljYXRpb24nKTtcbiAgICAgICAgICAgICAgICBzZXRWaXN1YWxOb3RpZmljYXRpb24odHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvL3JlcGxhY2UgbGlua3MgYW5kIHNtaWxleXNcbiAgICAgICAgdmFyIGVzY01lc3NhZ2UgPSBVdGlsLmVzY2FwZUh0bWwobWVzc2FnZSk7XG4gICAgICAgIHZhciBlc2NEaXNwbGF5TmFtZSA9IFV0aWwuZXNjYXBlSHRtbChkaXNwbGF5TmFtZSk7XG4gICAgICAgIG1lc3NhZ2UgPSBSZXBsYWNlbWVudC5wcm9jZXNzUmVwbGFjZW1lbnRzKGVzY01lc3NhZ2UpO1xuXG4gICAgICAgICQoJyNjaGF0Y29udmVyc2F0aW9uJykuYXBwZW5kKCc8ZGl2IGNsYXNzPVwiJyArIGRpdkNsYXNzTmFtZSArICdcIj48Yj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXNjRGlzcGxheU5hbWUgKyAnOiA8L2I+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgKyAnPC9kaXY+Jyk7XG4gICAgICAgICQoJyNjaGF0Y29udmVyc2F0aW9uJykuYW5pbWF0ZShcbiAgICAgICAgICAgICAgICB7IHNjcm9sbFRvcDogJCgnI2NoYXRjb252ZXJzYXRpb24nKVswXS5zY3JvbGxIZWlnaHR9LCAxMDAwKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQXBwZW5kcyBlcnJvciBtZXNzYWdlIHRvIHRoZSBjb252ZXJzYXRpb25cbiAgICAgKiBAcGFyYW0gZXJyb3JNZXNzYWdlIHRoZSByZWNlaXZlZCBlcnJvciBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSBvcmlnaW5hbFRleHQgdGhlIG9yaWdpbmFsIG1lc3NhZ2UuXG4gICAgICovXG4gICAgbXkuY2hhdEFkZEVycm9yID0gZnVuY3Rpb24oZXJyb3JNZXNzYWdlLCBvcmlnaW5hbFRleHQpXG4gICAge1xuICAgICAgICBlcnJvck1lc3NhZ2UgPSBVdGlsLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgb3JpZ2luYWxUZXh0ID0gVXRpbC5lc2NhcGVIdG1sKG9yaWdpbmFsVGV4dCk7XG5cbiAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKS5hcHBlbmQoJzxkaXYgY2xhc3M9XCJlcnJvck1lc3NhZ2VcIj48Yj5FcnJvcjogPC9iPidcbiAgICAgICAgICAgICsgJ1lvdXIgbWVzc2FnZScgKyAob3JpZ2luYWxUZXh0PyAoJyBcXFwiJysgb3JpZ2luYWxUZXh0ICsgJ1xcXCInKSA6IFwiXCIpXG4gICAgICAgICAgICArICcgd2FzIG5vdCBzZW50LicgKyAoZXJyb3JNZXNzYWdlPyAoJyBSZWFzb246ICcgKyBlcnJvck1lc3NhZ2UpIDogJycpXG4gICAgICAgICAgICArICAnPC9kaXY+Jyk7XG4gICAgICAgICQoJyNjaGF0Y29udmVyc2F0aW9uJykuYW5pbWF0ZShcbiAgICAgICAgICAgIHsgc2Nyb2xsVG9wOiAkKCcjY2hhdGNvbnZlcnNhdGlvbicpWzBdLnNjcm9sbEhlaWdodH0sIDEwMDApO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBzdWJqZWN0IHRvIHRoZSBVSVxuICAgICAqIEBwYXJhbSBzdWJqZWN0IHRoZSBzdWJqZWN0XG4gICAgICovXG4gICAgbXkuY2hhdFNldFN1YmplY3QgPSBmdW5jdGlvbihzdWJqZWN0KVxuICAgIHtcbiAgICAgICAgaWYoc3ViamVjdClcbiAgICAgICAgICAgIHN1YmplY3QgPSBzdWJqZWN0LnRyaW0oKTtcbiAgICAgICAgJCgnI3N1YmplY3QnKS5odG1sKFJlcGxhY2VtZW50LmxpbmtpZnkoVXRpbC5lc2NhcGVIdG1sKHN1YmplY3QpKSk7XG4gICAgICAgIGlmKHN1YmplY3QgPT0gXCJcIilcbiAgICAgICAge1xuICAgICAgICAgICAgJChcIiNzdWJqZWN0XCIpLmNzcyh7ZGlzcGxheTogXCJub25lXCJ9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgIHtcbiAgICAgICAgICAgICQoXCIjc3ViamVjdFwiKS5jc3Moe2Rpc3BsYXk6IFwiYmxvY2tcIn0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIE9wZW5zIC8gY2xvc2VzIHRoZSBjaGF0IGFyZWEuXG4gICAgICovXG4gICAgbXkudG9nZ2xlQ2hhdCA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICB2YXIgY2hhdHNwYWNlID0gJCgnI2NoYXRzcGFjZScpO1xuXG4gICAgICAgIHZhciBjaGF0U2l6ZSA9IChjaGF0c3BhY2UuaXMoXCI6dmlzaWJsZVwiKSkgPyBbMCwgMF0gOiBDaGF0LmdldENoYXRTaXplKCk7XG4gICAgICAgIGRlcC5WaWRlb0xheW91dCgpLnJlc2l6ZVZpZGVvU3BhY2UoY2hhdHNwYWNlLCBjaGF0U2l6ZSwgY2hhdHNwYWNlLmlzKFwiOnZpc2libGVcIikpO1xuXG4gICAgICAgIC8vIEZpeCBtZTogU2hvdWxkIGJlIGNhbGxlZCBhcyBjYWxsYmFjayBvZiBzaG93IGFuaW1hdGlvblxuXG4gICAgICAgIC8vIFJlcXVlc3QgdGhlIGZvY3VzIGluIHRoZSBuaWNrbmFtZSBmaWVsZCBvciB0aGUgY2hhdCBpbnB1dCBmaWVsZC5cbiAgICAgICAgaWYgKCQoJyNuaWNrbmFtZScpLmNzcygndmlzaWJpbGl0eScpID09PSAndmlzaWJsZScpIHtcbiAgICAgICAgICAgICQoJyNuaWNraW5wdXQnKS5mb2N1cygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnI3VzZXJtc2cnKS5mb2N1cygpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGNoYXQgY29udmVyc2F0aW9uIG1vZGUuXG4gICAgICovXG4gICAgbXkuc2V0Q2hhdENvbnZlcnNhdGlvbk1vZGUgPSBmdW5jdGlvbiAoaXNDb252ZXJzYXRpb25Nb2RlKSB7XG4gICAgICAgIGlmIChpc0NvbnZlcnNhdGlvbk1vZGUpIHtcbiAgICAgICAgICAgICQoJyNuaWNrbmFtZScpLmNzcyh7dmlzaWJpbGl0eTogJ2hpZGRlbid9KTtcbiAgICAgICAgICAgICQoJyNjaGF0Y29udmVyc2F0aW9uJykuY3NzKHt2aXNpYmlsaXR5OiAndmlzaWJsZSd9KTtcbiAgICAgICAgICAgICQoJyN1c2VybXNnJykuY3NzKHt2aXNpYmlsaXR5OiAndmlzaWJsZSd9KTtcbiAgICAgICAgICAgICQoJyN1c2VybXNnJykuZm9jdXMoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXNpemVzIHRoZSBjaGF0IGFyZWEuXG4gICAgICovXG4gICAgbXkucmVzaXplQ2hhdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNoYXRTaXplID0gQ2hhdC5nZXRDaGF0U2l6ZSgpO1xuXG4gICAgICAgICQoJyNjaGF0c3BhY2UnKS53aWR0aChjaGF0U2l6ZVswXSk7XG4gICAgICAgICQoJyNjaGF0c3BhY2UnKS5oZWlnaHQoY2hhdFNpemVbMV0pO1xuXG4gICAgICAgIHJlc2l6ZUNoYXRDb252ZXJzYXRpb24oKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgc2l6ZSBvZiB0aGUgY2hhdC5cbiAgICAgKi9cbiAgICBteS5nZXRDaGF0U2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGF2YWlsYWJsZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgdmFyIGF2YWlsYWJsZVdpZHRoID0gd2luZG93LmlubmVyV2lkdGg7XG5cbiAgICAgICAgdmFyIGNoYXRXaWR0aCA9IDIwMDtcbiAgICAgICAgaWYgKGF2YWlsYWJsZVdpZHRoICogMC4yIDwgMjAwKVxuICAgICAgICAgICAgY2hhdFdpZHRoID0gYXZhaWxhYmxlV2lkdGggKiAwLjI7XG5cbiAgICAgICAgcmV0dXJuIFtjaGF0V2lkdGgsIGF2YWlsYWJsZUhlaWdodF07XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEluZGljYXRlcyBpZiB0aGUgY2hhdCBpcyBjdXJyZW50bHkgdmlzaWJsZS5cbiAgICAgKi9cbiAgICBteS5pc1Zpc2libGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkKCcjY2hhdHNwYWNlJykuaXMoXCI6dmlzaWJsZVwiKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVzaXplcyB0aGUgY2hhdCBjb252ZXJzYXRpb24uXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVzaXplQ2hhdENvbnZlcnNhdGlvbigpIHtcbiAgICAgICAgdmFyIHVzZXJtc2dTdHlsZUhlaWdodCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidXNlcm1zZ1wiKS5zdHlsZS5oZWlnaHQ7XG4gICAgICAgIHZhciB1c2VybXNnSGVpZ2h0ID0gdXNlcm1zZ1N0eWxlSGVpZ2h0XG4gICAgICAgICAgICAuc3Vic3RyaW5nKDAsIHVzZXJtc2dTdHlsZUhlaWdodC5pbmRleE9mKCdweCcpKTtcblxuICAgICAgICAkKCcjdXNlcm1zZycpLndpZHRoKCQoJyNjaGF0c3BhY2UnKS53aWR0aCgpIC0gMTApO1xuICAgICAgICAkKCcjY2hhdGNvbnZlcnNhdGlvbicpLndpZHRoKCQoJyNjaGF0c3BhY2UnKS53aWR0aCgpIC0gMTApO1xuICAgICAgICAkKCcjY2hhdGNvbnZlcnNhdGlvbicpXG4gICAgICAgICAgICAuaGVpZ2h0KHdpbmRvdy5pbm5lckhlaWdodCAtIDEwIC0gcGFyc2VJbnQodXNlcm1zZ0hlaWdodCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNob3dzL2hpZGVzIGEgdmlzdWFsIG5vdGlmaWNhdGlvbiwgaW5kaWNhdGluZyB0aGF0IGEgbWVzc2FnZSBoYXMgYXJyaXZlZC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzZXRWaXN1YWxOb3RpZmljYXRpb24oc2hvdykge1xuICAgICAgICB2YXIgdW5yZWFkTXNnRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd1bnJlYWRNZXNzYWdlcycpO1xuXG4gICAgICAgIHZhciBnbG93ZXIgPSAkKCcjY2hhdEJ1dHRvbicpO1xuXG4gICAgICAgIGlmICh1bnJlYWRNZXNzYWdlcykge1xuICAgICAgICAgICAgdW5yZWFkTXNnRWxlbWVudC5pbm5lckhUTUwgPSB1bnJlYWRNZXNzYWdlcy50b1N0cmluZygpO1xuXG4gICAgICAgICAgICBkZXAuVG9vbGJhcigpLmRvY2tUb29sYmFyKHRydWUpO1xuXG4gICAgICAgICAgICB2YXIgY2hhdEJ1dHRvbkVsZW1lbnRcbiAgICAgICAgICAgICAgICA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGF0QnV0dG9uJykucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIHZhciBsZWZ0SW5kZW50ID0gKFV0aWwuZ2V0VGV4dFdpZHRoKGNoYXRCdXR0b25FbGVtZW50KSAtXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBVdGlsLmdldFRleHRXaWR0aCh1bnJlYWRNc2dFbGVtZW50KSkgLyAyO1xuICAgICAgICAgICAgdmFyIHRvcEluZGVudCA9IChVdGlsLmdldFRleHRIZWlnaHQoY2hhdEJ1dHRvbkVsZW1lbnQpIC1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVXRpbC5nZXRUZXh0SGVpZ2h0KHVucmVhZE1zZ0VsZW1lbnQpKSAvIDIgLSAzO1xuXG4gICAgICAgICAgICB1bnJlYWRNc2dFbGVtZW50LnNldEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgICAgICAgJ3N0eWxlJyxcbiAgICAgICAgICAgICAgICAgICAgJ3RvcDonICsgdG9wSW5kZW50ICtcbiAgICAgICAgICAgICAgICAgICAgJzsgbGVmdDonICsgbGVmdEluZGVudCArICc7Jyk7XG5cbiAgICAgICAgICAgIGlmICghZ2xvd2VyLmhhc0NsYXNzKCdpY29uLWNoYXQtc2ltcGxlJykpIHtcbiAgICAgICAgICAgICAgICBnbG93ZXIucmVtb3ZlQ2xhc3MoJ2ljb24tY2hhdCcpO1xuICAgICAgICAgICAgICAgIGdsb3dlci5hZGRDbGFzcygnaWNvbi1jaGF0LXNpbXBsZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdW5yZWFkTXNnRWxlbWVudC5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgICAgIGdsb3dlci5yZW1vdmVDbGFzcygnaWNvbi1jaGF0LXNpbXBsZScpO1xuICAgICAgICAgICAgZ2xvd2VyLmFkZENsYXNzKCdpY29uLWNoYXQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzaG93ICYmICFub3RpZmljYXRpb25JbnRlcnZhbCkge1xuICAgICAgICAgICAgbm90aWZpY2F0aW9uSW50ZXJ2YWwgPSB3aW5kb3cuc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGdsb3dlci50b2dnbGVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9LCA4MDApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCFzaG93ICYmIG5vdGlmaWNhdGlvbkludGVydmFsKSB7XG4gICAgICAgICAgICB3aW5kb3cuY2xlYXJJbnRlcnZhbChub3RpZmljYXRpb25JbnRlcnZhbCk7XG4gICAgICAgICAgICBub3RpZmljYXRpb25JbnRlcnZhbCA9IGZhbHNlO1xuICAgICAgICAgICAgZ2xvd2VyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNjcm9sbHMgY2hhdCB0byB0aGUgYm90dG9tLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNjcm9sbENoYXRUb0JvdHRvbSgpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkKCcjY2hhdGNvbnZlcnNhdGlvbicpLnNjcm9sbFRvcChcbiAgICAgICAgICAgICAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKVswXS5zY3JvbGxIZWlnaHQpO1xuICAgICAgICB9LCA1KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbXk7XG59KENoYXQgfHwge30pKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDaGF0O1xuIiwiXG52YXIgUmVwbGFjZW1lbnQgPSBmdW5jdGlvbigpXG57XG4gICAgLyoqXG4gICAgICogUmVwbGFjZXMgY29tbW9uIHNtaWxleSBzdHJpbmdzIHdpdGggaW1hZ2VzXG4gICAgICovXG4gICAgZnVuY3Rpb24gc21pbGlmeShib2R5KVxuICAgIHtcbiAgICAgICAgaWYoIWJvZHkpXG4gICAgICAgICAgICByZXR1cm4gYm9keTtcblxuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oOlxcKHw6XFwoXFwofDotXFwoXFwofDotXFwofFxcKHNhZFxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MSsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoYW5ncnlcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTIrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKG5cXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTMrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKDotXFwpXFwpfDpcXClcXCl8Oy1cXClcXCl8O1xcKVxcKXxcXChsb2xcXCl8Oi1EfDpEfDstRHw7RCkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5NCsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oOy1cXChcXCh8O1xcKFxcKHw7LVxcKHw7XFwofDonXFwofDonLVxcKHw6fi1cXCh8On5cXCh8XFwodXBzZXRcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTUrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKDwzfCZsdDszfFxcKExcXCl8XFwobFxcKXxcXChIXFwpfFxcKGhcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTYrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKGFuZ2VsXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXk3KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChib21iXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXk4KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChjaHVja2xlXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXk5KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXCh5XFwpfFxcKFlcXCl8XFwob2tcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTEwKyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyg7LVxcKXw7XFwpfDotXFwpfDpcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTExKyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChibHVzaFxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MTIrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKDotXFwqfDpcXCp8XFwoa2lzc1xcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MTMrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKHNlYXJjaFxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MTQrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKHdhdmVcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTE1KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChjbGFwXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxNisgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoc2lja1xcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MTcrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKDotUHw6UHw6LXB8OnApL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTE4KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyg6LVxcMHxcXChzaG9ja2VkXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxOSsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwob29wc1xcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MjArIFwiPlwiKTtcblxuICAgICAgICByZXR1cm4gYm9keTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBSZXBsYWNlbWVudFByb3RvKCkge1xuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUHJvY2Vzc2VzIGxpbmtzIGFuZCBzbWlsZXlzIGluIFwiYm9keVwiXG4gICAgICovXG4gICAgUmVwbGFjZW1lbnRQcm90by5wcm9jZXNzUmVwbGFjZW1lbnRzID0gZnVuY3Rpb24oYm9keSlcbiAgICB7XG4gICAgICAgIC8vbWFrZSBsaW5rcyBjbGlja2FibGVcbiAgICAgICAgYm9keSA9IFJlcGxhY2VtZW50UHJvdG8ubGlua2lmeShib2R5KTtcblxuICAgICAgICAvL2FkZCBzbWlsZXlzXG4gICAgICAgIGJvZHkgPSBzbWlsaWZ5KGJvZHkpO1xuXG4gICAgICAgIHJldHVybiBib2R5O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZpbmRzIGFuZCByZXBsYWNlcyBhbGwgbGlua3MgaW4gdGhlIGxpbmtzIGluIFwiYm9keVwiXG4gICAgICogd2l0aCB0aGVpciA8YSBocmVmPVwiXCI+PC9hPlxuICAgICAqL1xuICAgIFJlcGxhY2VtZW50UHJvdG8ubGlua2lmeSA9IGZ1bmN0aW9uKGlucHV0VGV4dClcbiAgICB7XG4gICAgICAgIHZhciByZXBsYWNlZFRleHQsIHJlcGxhY2VQYXR0ZXJuMSwgcmVwbGFjZVBhdHRlcm4yLCByZXBsYWNlUGF0dGVybjM7XG5cbiAgICAgICAgLy9VUkxzIHN0YXJ0aW5nIHdpdGggaHR0cDovLywgaHR0cHM6Ly8sIG9yIGZ0cDovL1xuICAgICAgICByZXBsYWNlUGF0dGVybjEgPSAvKFxcYihodHRwcz98ZnRwKTpcXC9cXC9bLUEtWjAtOSsmQCNcXC8lPz1+X3whOiwuO10qWy1BLVowLTkrJkAjXFwvJT1+X3xdKS9naW07XG4gICAgICAgIHJlcGxhY2VkVGV4dCA9IGlucHV0VGV4dC5yZXBsYWNlKHJlcGxhY2VQYXR0ZXJuMSwgJzxhIGhyZWY9XCIkMVwiIHRhcmdldD1cIl9ibGFua1wiPiQxPC9hPicpO1xuXG4gICAgICAgIC8vVVJMcyBzdGFydGluZyB3aXRoIFwid3d3LlwiICh3aXRob3V0IC8vIGJlZm9yZSBpdCwgb3IgaXQnZCByZS1saW5rIHRoZSBvbmVzIGRvbmUgYWJvdmUpLlxuICAgICAgICByZXBsYWNlUGF0dGVybjIgPSAvKF58W15cXC9dKSh3d3dcXC5bXFxTXSsoXFxifCQpKS9naW07XG4gICAgICAgIHJlcGxhY2VkVGV4dCA9IHJlcGxhY2VkVGV4dC5yZXBsYWNlKHJlcGxhY2VQYXR0ZXJuMiwgJyQxPGEgaHJlZj1cImh0dHA6Ly8kMlwiIHRhcmdldD1cIl9ibGFua1wiPiQyPC9hPicpO1xuXG4gICAgICAgIC8vQ2hhbmdlIGVtYWlsIGFkZHJlc3NlcyB0byBtYWlsdG86OiBsaW5rcy5cbiAgICAgICAgcmVwbGFjZVBhdHRlcm4zID0gLygoW2EtekEtWjAtOVxcLVxcX1xcLl0pK0BbYS16QS1aXFxfXSs/KFxcLlthLXpBLVpdezIsNn0pKykvZ2ltO1xuICAgICAgICByZXBsYWNlZFRleHQgPSByZXBsYWNlZFRleHQucmVwbGFjZShyZXBsYWNlUGF0dGVybjMsICc8YSBocmVmPVwibWFpbHRvOiQxXCI+JDE8L2E+Jyk7XG5cbiAgICAgICAgcmV0dXJuIHJlcGxhY2VkVGV4dDtcbiAgICB9XG4gICAgcmV0dXJuIFJlcGxhY2VtZW50UHJvdG87XG59KCk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVwbGFjZW1lbnQ7XG5cblxuXG4iLCIvKiBnbG9iYWwgJCwgY29uZmlnLCBQcmV6aSwgVXRpbCwgY29ubmVjdGlvbiwgc2V0TGFyZ2VWaWRlb1Zpc2libGUsIGRvY2tUb29sYmFyICovXG52YXIgUHJlemkgPSByZXF1aXJlKFwiLi4vcHJlemkvUHJlemkuanNcIik7XG52YXIgVUlVdGlsID0gcmVxdWlyZShcIi4uL1VJVXRpbC5qc1wiKTtcbnZhciBUb29sYmFyVG9nZ2xlciA9IHJlcXVpcmUoXCIuLi90b29sYmFycy90b29sYmFyX3RvZ2dsZXJcIik7XG5cbnZhciBFdGhlcnBhZCA9IChmdW5jdGlvbiAobXkpIHtcbiAgICB2YXIgZXRoZXJwYWROYW1lID0gbnVsbDtcbiAgICB2YXIgZXRoZXJwYWRJRnJhbWUgPSBudWxsO1xuICAgIHZhciBkb21haW4gPSBudWxsO1xuICAgIHZhciBvcHRpb25zID0gXCI/c2hvd0NvbnRyb2xzPXRydWUmc2hvd0NoYXQ9ZmFsc2Umc2hvd0xpbmVOdW1iZXJzPXRydWUmdXNlTW9ub3NwYWNlRm9udD1mYWxzZVwiO1xuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGV0aGVycGFkLlxuICAgICAqL1xuICAgIG15LmluaXQgPSBmdW5jdGlvbiAobmFtZSkge1xuXG4gICAgICAgIGlmIChjb25maWcuZXRoZXJwYWRfYmFzZSAmJiAhZXRoZXJwYWROYW1lKSB7XG5cbiAgICAgICAgICAgIGRvbWFpbiA9IGNvbmZpZy5ldGhlcnBhZF9iYXNlO1xuXG4gICAgICAgICAgICBpZiAoIW5hbWUpIHtcbiAgICAgICAgICAgICAgICAvLyBJbiBjYXNlIHdlJ3JlIHRoZSBmb2N1cyB3ZSBnZW5lcmF0ZSB0aGUgbmFtZS5cbiAgICAgICAgICAgICAgICBldGhlcnBhZE5hbWUgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNykgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnXycgKyAobmV3IERhdGUoKS5nZXRUaW1lKCkpLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgc2hhcmVFdGhlcnBhZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIGV0aGVycGFkTmFtZSA9IG5hbWU7XG5cbiAgICAgICAgICAgIGVuYWJsZUV0aGVycGFkQnV0dG9uKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogT3BlbnMvaGlkZXMgdGhlIEV0aGVycGFkLlxuICAgICAqL1xuICAgIG15LnRvZ2dsZUV0aGVycGFkID0gZnVuY3Rpb24gKGlzUHJlc2VudGF0aW9uKSB7XG4gICAgICAgIGlmICghZXRoZXJwYWRJRnJhbWUpXG4gICAgICAgICAgICBjcmVhdGVJRnJhbWUoKTtcblxuICAgICAgICB2YXIgbGFyZ2VWaWRlbyA9IG51bGw7XG4gICAgICAgIGlmIChQcmV6aS5pc1ByZXNlbnRhdGlvblZpc2libGUoKSlcbiAgICAgICAgICAgIGxhcmdlVmlkZW8gPSAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBsYXJnZVZpZGVvID0gJCgnI2xhcmdlVmlkZW8nKTtcblxuICAgICAgICBpZiAoJCgnI2V0aGVycGFkPmlmcmFtZScpLmNzcygndmlzaWJpbGl0eScpID09PSAnaGlkZGVuJykge1xuICAgICAgICAgICAgbGFyZ2VWaWRlby5mYWRlT3V0KDMwMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChQcmV6aS5pc1ByZXNlbnRhdGlvblZpc2libGUoKSkge1xuICAgICAgICAgICAgICAgICAgICBsYXJnZVZpZGVvLmNzcyh7b3BhY2l0eTogJzAnfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2V0TGFyZ2VWaWRlb1Zpc2libGUoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBUb29sYmFyVG9nZ2xlci5kb2NrVG9vbGJhcih0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkKCcjZXRoZXJwYWQ+aWZyYW1lJykuZmFkZUluKDMwMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLmJhY2tncm91bmQgPSAnI2VlZWVlZSc7XG4gICAgICAgICAgICAgICAgICAgICQoJyNldGhlcnBhZD5pZnJhbWUnKS5jc3Moe3Zpc2liaWxpdHk6ICd2aXNpYmxlJ30pO1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXRoZXJwYWQnKS5jc3Moe3pJbmRleDogMn0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoJCgnI2V0aGVycGFkPmlmcmFtZScpKSB7XG4gICAgICAgICAgICAkKCcjZXRoZXJwYWQ+aWZyYW1lJykuZmFkZU91dCgzMDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAkKCcjZXRoZXJwYWQ+aWZyYW1lJykuY3NzKHt2aXNpYmlsaXR5OiAnaGlkZGVuJ30pO1xuICAgICAgICAgICAgICAgICQoJyNldGhlcnBhZCcpLmNzcyh7ekluZGV4OiAwfSk7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5iYWNrZ3JvdW5kID0gJ2JsYWNrJztcbiAgICAgICAgICAgICAgICBpZiAoIWlzUHJlc2VudGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNsYXJnZVZpZGVvJykuZmFkZUluKDMwMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2V0TGFyZ2VWaWRlb1Zpc2libGUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBUb29sYmFyVG9nZ2xlci5kb2NrVG9vbGJhcihmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJlc2l6ZSgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXNpemVzIHRoZSBldGhlcnBhZC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiByZXNpemUoKSB7XG4gICAgICAgIGlmICgkKCcjZXRoZXJwYWQ+aWZyYW1lJykubGVuZ3RoKSB7XG4gICAgICAgICAgICB2YXIgcmVtb3RlVmlkZW9zID0gJCgnI3JlbW90ZVZpZGVvcycpO1xuICAgICAgICAgICAgdmFyIGF2YWlsYWJsZUhlaWdodFxuICAgICAgICAgICAgICAgID0gd2luZG93LmlubmVySGVpZ2h0IC0gcmVtb3RlVmlkZW9zLm91dGVySGVpZ2h0KCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhVSVV0aWwpO1xuICAgICAgICAgICAgdmFyIGF2YWlsYWJsZVdpZHRoID0gVUlVdGlsLmdldEF2YWlsYWJsZVZpZGVvV2lkdGgoKTtcblxuICAgICAgICAgICAgJCgnI2V0aGVycGFkPmlmcmFtZScpLndpZHRoKGF2YWlsYWJsZVdpZHRoKTtcbiAgICAgICAgICAgICQoJyNldGhlcnBhZD5pZnJhbWUnKS5oZWlnaHQoYXZhaWxhYmxlSGVpZ2h0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNoYXJlcyB0aGUgRXRoZXJwYWQgbmFtZSB3aXRoIG90aGVyIHBhcnRpY2lwYW50cy5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzaGFyZUV0aGVycGFkKCkge1xuICAgICAgICBYTVBQQWN0aXZhdG9yLmFkZFRvUHJlc2VuY2UoXCJldGhlcnBhZFwiLCBldGhlcnBhZE5hbWUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgdGhlIEV0aGVycGFkIGJ1dHRvbiBhbmQgYWRkcyBpdCB0byB0aGUgdG9vbGJhci5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBlbmFibGVFdGhlcnBhZEJ1dHRvbigpIHtcbiAgICAgICAgaWYgKCEkKCcjZXRoZXJwYWRCdXR0b24nKS5pcyhcIjp2aXNpYmxlXCIpKVxuICAgICAgICAgICAgJCgnI2V0aGVycGFkQnV0dG9uJykuY3NzKHtkaXNwbGF5OiAnaW5saW5lLWJsb2NrJ30pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgdGhlIElGcmFtZSBmb3IgdGhlIGV0aGVycGFkLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZUlGcmFtZSgpIHtcbiAgICAgICAgZXRoZXJwYWRJRnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcbiAgICAgICAgZXRoZXJwYWRJRnJhbWUuc3JjID0gZG9tYWluICsgZXRoZXJwYWROYW1lICsgb3B0aW9ucztcbiAgICAgICAgZXRoZXJwYWRJRnJhbWUuZnJhbWVCb3JkZXIgPSAwO1xuICAgICAgICBldGhlcnBhZElGcmFtZS5zY3JvbGxpbmcgPSBcIm5vXCI7XG4gICAgICAgIGV0aGVycGFkSUZyYW1lLndpZHRoID0gJCgnI2xhcmdlVmlkZW9Db250YWluZXInKS53aWR0aCgpIHx8IDY0MDtcbiAgICAgICAgZXRoZXJwYWRJRnJhbWUuaGVpZ2h0ID0gJCgnI2xhcmdlVmlkZW9Db250YWluZXInKS5oZWlnaHQoKSB8fCA0ODA7XG4gICAgICAgIGV0aGVycGFkSUZyYW1lLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAndmlzaWJpbGl0eTogaGlkZGVuOycpO1xuXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdldGhlcnBhZCcpLmFwcGVuZENoaWxkKGV0aGVycGFkSUZyYW1lKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBPbiBFdGhlcnBhZCBhZGRlZCB0byBtdWMuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgnZXRoZXJwYWRhZGRlZC5tdWMnLCBmdW5jdGlvbiAoZXZlbnQsIGppZCwgZXRoZXJwYWROYW1lKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRXRoZXJwYWQgYWRkZWRcIiwgZXRoZXJwYWROYW1lKTtcbiAgICAgICAgaWYgKGNvbmZpZy5ldGhlcnBhZF9iYXNlICYmICFYTVBQQWN0aXZhdG9yLmlzRm9jdXMoKSkge1xuICAgICAgICAgICAgRXRoZXJwYWQuaW5pdChldGhlcnBhZE5hbWUpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBPbiBmb2N1cyBjaGFuZ2VkIGV2ZW50LlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ2ZvY3VzZWNoYW5nZWQubXVjJywgZnVuY3Rpb24gKGV2ZW50LCBmb2N1cykge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkZvY3VzIGNoYW5nZWRcIik7XG4gICAgICAgIGlmIChjb25maWcuZXRoZXJwYWRfYmFzZSlcbiAgICAgICAgICAgIHNoYXJlRXRoZXJwYWQoKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIE9uIHZpZGVvIHNlbGVjdGVkIGV2ZW50LlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ3ZpZGVvLnNlbGVjdGVkJywgZnVuY3Rpb24gKGV2ZW50LCBpc1ByZXNlbnRhdGlvbikge1xuICAgICAgICBpZiAoIWNvbmZpZy5ldGhlcnBhZF9iYXNlKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIGlmIChldGhlcnBhZElGcmFtZSAmJiBldGhlcnBhZElGcmFtZS5zdHlsZS52aXNpYmlsaXR5ICE9PSAnaGlkZGVuJylcbiAgICAgICAgICAgIEV0aGVycGFkLnRvZ2dsZUV0aGVycGFkKGlzUHJlc2VudGF0aW9uKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFJlc2l6ZXMgdGhlIGV0aGVycGFkLCB3aGVuIHRoZSB3aW5kb3cgaXMgcmVzaXplZC5cbiAgICAgKi9cbiAgICAkKHdpbmRvdykucmVzaXplKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmVzaXplKCk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbXk7XG59KEV0aGVycGFkIHx8IHt9KSk7XG5cbm1vZHVsZS5leHBvcnRzID0gRXRoZXJwYWQ7XG4iLCJ2YXIgQm90dG9tVG9vbGJhciA9IHJlcXVpcmUoXCIuL3Rvb2xiYXJzL0JvdHRvbVRvb2xiYXJcIik7XG52YXIgVG9vbGJhciA9IHJlcXVpcmUoXCIuL3Rvb2xiYXJzL1Rvb2xiYXJcIik7XG5cbnZhciBLZXlib2FyZFNob3J0Y3V0ID0gKGZ1bmN0aW9uKG15KSB7XG4gICAgLy9tYXBzIGtleWNvZGUgdG8gY2hhcmFjdGVyLCBpZCBvZiBwb3BvdmVyIGZvciBnaXZlbiBmdW5jdGlvbiBhbmQgZnVuY3Rpb25cbiAgICB2YXIgc2hvcnRjdXRzID0ge1xuICAgICAgICA2Nzoge1xuICAgICAgICAgICAgY2hhcmFjdGVyOiBcIkNcIixcbiAgICAgICAgICAgIGlkOiBcInRvZ2dsZUNoYXRQb3BvdmVyXCIsXG4gICAgICAgICAgICBmdW5jdGlvbjogQm90dG9tVG9vbGJhci50b2dnbGVDaGF0XG4gICAgICAgIH0sXG4gICAgICAgIDcwOiB7XG4gICAgICAgICAgICBjaGFyYWN0ZXI6IFwiRlwiLFxuICAgICAgICAgICAgaWQ6IFwiZmlsbXN0cmlwUG9wb3ZlclwiLFxuICAgICAgICAgICAgZnVuY3Rpb246IEJvdHRvbVRvb2xiYXIudG9nZ2xlRmlsbVN0cmlwXG4gICAgICAgIH0sXG4gICAgICAgIDc3OiB7XG4gICAgICAgICAgICBjaGFyYWN0ZXI6IFwiTVwiLFxuICAgICAgICAgICAgaWQ6IFwibXV0ZVBvcG92ZXJcIixcbiAgICAgICAgICAgIGZ1bmN0aW9uOiBUb29sYmFyLnRvZ2dsZUF1ZGlvXG4gICAgICAgIH0sXG4gICAgICAgIDg0OiB7XG4gICAgICAgICAgICBjaGFyYWN0ZXI6IFwiVFwiLFxuICAgICAgICAgICAgZnVuY3Rpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmKCFSVENBY3RpdmF0b3IuZ2V0UlRDU2VydmljZSgpLmxvY2FsQXVkaW8uaXNNdXRlZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgIFRvb2xiYXIudG9nZ2xlQXVkaW8oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIDg2OiB7XG4gICAgICAgICAgICBjaGFyYWN0ZXI6IFwiVlwiLFxuICAgICAgICAgICAgaWQ6IFwidG9nZ2xlVmlkZW9Qb3BvdmVyXCIsXG4gICAgICAgICAgICBmdW5jdGlvbjogVG9vbGJhci50b2dnbGVWaWRlb1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHdpbmRvdy5vbmtleXVwID0gZnVuY3Rpb24oZSkge1xuICAgICAgICBpZighKCQoXCI6Zm9jdXNcIikuaXMoXCJpbnB1dFt0eXBlPXRleHRdXCIpIHx8ICQoXCI6Zm9jdXNcIikuaXMoXCJ0ZXh0YXJlYVwiKSkpIHtcbiAgICAgICAgICAgIHZhciBrZXljb2RlID0gZS53aGljaDtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc2hvcnRjdXRzW2tleWNvZGVdID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAgICAgc2hvcnRjdXRzW2tleWNvZGVdLmZ1bmN0aW9uKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGtleWNvZGUgPj0gXCIwXCIuY2hhckNvZGVBdCgwKSAmJiBrZXljb2RlIDw9IFwiOVwiLmNoYXJDb2RlQXQoMCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVtb3RlVmlkZW9zID0gJChcIi52aWRlb2NvbnRhaW5lcjpub3QoI21peGVkc3RyZWFtKVwiKSxcbiAgICAgICAgICAgICAgICAgICAgdmlkZW9XYW50ZWQgPSBrZXljb2RlIC0gXCIwXCIuY2hhckNvZGVBdCgwKSArIDE7XG4gICAgICAgICAgICAgICAgaWYgKHJlbW90ZVZpZGVvcy5sZW5ndGggPiB2aWRlb1dhbnRlZCkge1xuICAgICAgICAgICAgICAgICAgICByZW1vdGVWaWRlb3NbdmlkZW9XYW50ZWRdLmNsaWNrKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHdpbmRvdy5vbmtleWRvd24gPSBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmKCQoXCIjY2hhdHNwYWNlXCIpLmNzcyhcImRpc3BsYXlcIikgPT09IFwibm9uZVwiKSB7XG4gICAgICAgICAgICBpZihlLndoaWNoID09PSBcIlRcIi5jaGFyQ29kZUF0KDApKSB7XG4gICAgICAgICAgICAgICAgaWYoUlRDQWN0aXZhdG9yLmdldFJUQ1NlcnZpY2UoKS5sb2NhbEF1ZGlvLmlzTXV0ZWQoKSkge1xuICAgICAgICAgICAgICAgICAgICBUb29sYmFyLnRvZ2dsZUF1ZGlvKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiAgXG4gICAgICogQHBhcmFtIGlkIGluZGljYXRlcyB0aGUgcG9wb3ZlciBhc3NvY2lhdGVkIHdpdGggdGhlIHNob3J0Y3V0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gdGhlIGtleWJvYXJkIHNob3J0Y3V0IHVzZWQgZm9yIHRoZSBpZCBnaXZlblxuICAgICAqL1xuICAgIG15LmdldFNob3J0Y3V0ID0gZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgZm9yKHZhciBrZXljb2RlIGluIHNob3J0Y3V0cykge1xuICAgICAgICAgICAgaWYoc2hvcnRjdXRzLmhhc093blByb3BlcnR5KGtleWNvZGUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNob3J0Y3V0c1trZXljb2RlXS5pZCA9PT0gaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiIChcIiArIHNob3J0Y3V0c1trZXljb2RlXS5jaGFyYWN0ZXIgKyBcIilcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfTtcblxuICAgIG15LmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICQoJ2JvZHknKS5wb3BvdmVyKHsgc2VsZWN0b3I6ICdbZGF0YS10b2dnbGU9cG9wb3Zlcl0nLFxuICAgICAgICAgICAgdHJpZ2dlcjogJ2NsaWNrIGhvdmVyJyxcbiAgICAgICAgICAgIGNvbnRlbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZShcImNvbnRlbnRcIikgK1xuICAgICAgICAgICAgICAgICAgICBLZXlib2FyZFNob3J0Y3V0LmdldFNob3J0Y3V0KHRoaXMuZ2V0QXR0cmlidXRlKFwic2hvcnRjdXRcIikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG15O1xufShLZXlib2FyZFNob3J0Y3V0IHx8IHt9KSk7XG5cbm1vZHVsZS5leHBvcnRzID0gS2V5Ym9hcmRTaG9ydGN1dDtcbiIsInZhciBQcmV6aVBsYXllciA9IHJlcXVpcmUoXCIuL1ByZXppUGxheWVyLmpzXCIpO1xudmFyIFVJVXRpbCA9IHJlcXVpcmUoXCIuLi9VSVV0aWwuanNcIik7XG52YXIgVG9vbGJhclRvZ2dsZXIgPSByZXF1aXJlKFwiLi4vdG9vbGJhcnMvdG9vbGJhcl90b2dnbGVyXCIpO1xuXG52YXIgUHJlemkgPSAoZnVuY3Rpb24gKG15KSB7XG4gICAgdmFyIHByZXppUGxheWVyID0gbnVsbDtcblxuICAgIC8qKlxuICAgICAqIFJlbG9hZHMgdGhlIGN1cnJlbnQgcHJlc2VudGF0aW9uLlxuICAgICAqL1xuICAgIG15LnJlbG9hZFByZXNlbnRhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgaWZyYW1lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQocHJlemlQbGF5ZXIub3B0aW9ucy5wcmV6aUlkKTtcbiAgICAgICAgaWZyYW1lLnNyYyA9IGlmcmFtZS5zcmM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3dzL2hpZGVzIGEgcHJlc2VudGF0aW9uLlxuICAgICAqL1xuICAgIG15LnNldFByZXNlbnRhdGlvblZpc2libGUgPSBmdW5jdGlvbiAodmlzaWJsZSkge1xuICAgICAgICBpZiAodmlzaWJsZSkge1xuICAgICAgICAgICAgLy8gVHJpZ2dlciB0aGUgdmlkZW8uc2VsZWN0ZWQgZXZlbnQgdG8gaW5kaWNhdGUgYSBjaGFuZ2UgaW4gdGhlXG4gICAgICAgICAgICAvLyBsYXJnZSB2aWRlby5cbiAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoXCJ2aWRlby5zZWxlY3RlZFwiLCBbdHJ1ZV0pO1xuXG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlbycpLmZhZGVPdXQoMzAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2V0TGFyZ2VWaWRlb1Zpc2libGUoZmFsc2UpO1xuICAgICAgICAgICAgICAgICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykuZmFkZUluKDMwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykuY3NzKHtvcGFjaXR5OicxJ30pO1xuICAgICAgICAgICAgICAgICAgICBUb29sYmFyVG9nZ2xlci5kb2NrVG9vbGJhcih0cnVlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKCQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykuY3NzKCdvcGFjaXR5JykgPT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS5mYWRlT3V0KDMwMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLmNzcyh7b3BhY2l0eTonMCd9KTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI3JlbG9hZFByZXNlbnRhdGlvbicpLmNzcyh7ZGlzcGxheTonbm9uZSd9KTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5mYWRlSW4oMzAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNldExhcmdlVmlkZW9WaXNpYmxlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgVG9vbGJhclRvZ2dsZXIuZG9ja1Rvb2xiYXIoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIDx0dD50cnVlPC90dD4gaWYgdGhlIHByZXNlbnRhdGlvbiBpcyB2aXNpYmxlLCA8dHQ+ZmFsc2U8L3R0PiAtXG4gICAgICogb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIG15LmlzUHJlc2VudGF0aW9uVmlzaWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICgkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpICE9IG51bGxcbiAgICAgICAgICAgICAgICAmJiAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLmNzcygnb3BhY2l0eScpID09IDEpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBPcGVucyB0aGUgUHJlemkgZGlhbG9nLCBmcm9tIHdoaWNoIHRoZSB1c2VyIGNvdWxkIGNob29zZSBhIHByZXNlbnRhdGlvblxuICAgICAqIHRvIGxvYWQuXG4gICAgICovXG4gICAgbXkub3BlblByZXppRGlhbG9nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBteXByZXppID0gWE1QUEFjdGl2YXRvci5nZXRQcmV6aSgpO1xuICAgICAgICBpZiAobXlwcmV6aSkge1xuICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIub3BlblR3b0J1dHRvbkRpYWxvZyhcIlJlbW92ZSBQcmV6aVwiLFxuICAgICAgICAgICAgICAgIFwiQXJlIHlvdSBzdXJlIHlvdSB3b3VsZCBsaWtlIHRvIHJlbW92ZSB5b3VyIFByZXppP1wiLFxuICAgICAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgICAgIFwiUmVtb3ZlXCIsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oZSx2LG0sZikge1xuICAgICAgICAgICAgICAgICAgICBpZih2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBYTVBQQWN0aXZhdG9yLnJlbW92ZUZyb21QcmVzZW5jZShcInByZXppXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChwcmV6aVBsYXllciAhPSBudWxsKSB7XG4gICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5vcGVuVHdvQnV0dG9uRGlhbG9nKFwiU2hhcmUgYSBQcmV6aVwiLFxuICAgICAgICAgICAgICAgIFwiQW5vdGhlciBwYXJ0aWNpcGFudCBpcyBhbHJlYWR5IHNoYXJpbmcgYSBQcmV6aS5cIiArXG4gICAgICAgICAgICAgICAgICAgIFwiVGhpcyBjb25mZXJlbmNlIGFsbG93cyBvbmx5IG9uZSBQcmV6aSBhdCBhIHRpbWUuXCIsXG4gICAgICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICAgICAgXCJPa1wiLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGUsdixtLGYpIHtcbiAgICAgICAgICAgICAgICAgICAgJC5wcm9tcHQuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIG9wZW5QcmV6aVN0YXRlID0ge1xuICAgICAgICAgICAgICAgIHN0YXRlMDoge1xuICAgICAgICAgICAgICAgICAgICBodG1sOiAgICc8aDI+U2hhcmUgYSBQcmV6aTwvaDI+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJzxpbnB1dCBpZD1cInByZXppVXJsXCIgdHlwZT1cInRleHRcIiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAncGxhY2Vob2xkZXI9XCJlLmcuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdodHRwOi8vcHJlemkuY29tL3d6N3ZoanljbDdlNi9teS1wcmV6aVwiIGF1dG9mb2N1cz4nLFxuICAgICAgICAgICAgICAgICAgICBwZXJzaXN0ZW50OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9uczogeyBcIlNoYXJlXCI6IHRydWUgLCBcIkNhbmNlbFwiOiBmYWxzZX0sXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRCdXR0b246IDEsXG4gICAgICAgICAgICAgICAgICAgIHN1Ym1pdDogZnVuY3Rpb24oZSx2LG0sZil7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih2KVxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwcmV6aVVybCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcmV6aVVybCcpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZXppVXJsLnZhbHVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHVybFZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA9IGVuY29kZVVSSShVdGlsLmVzY2FwZUh0bWwocHJlemlVcmwudmFsdWUpKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodXJsVmFsdWUuaW5kZXhPZignaHR0cDovL3ByZXppLmNvbS8nKSAhPSAwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAmJiB1cmxWYWx1ZS5pbmRleE9mKCdodHRwczovL3ByZXppLmNvbS8nKSAhPSAwKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkLnByb21wdC5nb1RvU3RhdGUoJ3N0YXRlMScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHByZXNJZFRtcCA9IHVybFZhbHVlLnN1YnN0cmluZyhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsVmFsdWUuaW5kZXhPZihcInByZXppLmNvbS9cIikgKyAxMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzQWxwaGFudW1lcmljKHByZXNJZFRtcClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgcHJlc0lkVG1wLmluZGV4T2YoJy8nKSA8IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkLnByb21wdC5nb1RvU3RhdGUoJ3N0YXRlMScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgWE1QUEFjdGl2YXRvci5hZGRUb1ByZXNlbmNlKFwicHJlemlcIiwgdXJsVmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQucHJvbXB0LmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJC5wcm9tcHQuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc3RhdGUxOiB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWw6ICAgJzxoMj5TaGFyZSBhIFByZXppPC9oMj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnUGxlYXNlIHByb3ZpZGUgYSBjb3JyZWN0IHByZXppIGxpbmsuJyxcbiAgICAgICAgICAgICAgICAgICAgcGVyc2lzdGVudDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGJ1dHRvbnM6IHsgXCJCYWNrXCI6IHRydWUsIFwiQ2FuY2VsXCI6IGZhbHNlIH0sXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRCdXR0b246IDEsXG4gICAgICAgICAgICAgICAgICAgIHN1Ym1pdDpmdW5jdGlvbihlLHYsbSxmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih2PT0wKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQucHJvbXB0LmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJC5wcm9tcHQuZ29Ub1N0YXRlKCdzdGF0ZTAnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgZm9jdXNQcmV6aVVybCA9ICBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcmV6aVVybCcpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5EaWFsb2dXaXRoU3RhdGVzKG9wZW5QcmV6aVN0YXRlLCBmb2N1c1ByZXppVXJsLCBmb2N1c1ByZXppVXJsKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBIG5ldyBwcmVzZW50YXRpb24gaGFzIGJlZW4gYWRkZWQuXG4gICAgICogXG4gICAgICogQHBhcmFtIGV2ZW50IHRoZSBldmVudCBpbmRpY2F0aW5nIHRoZSBhZGQgb2YgYSBwcmVzZW50YXRpb25cbiAgICAgKiBAcGFyYW0gamlkIHRoZSBqaWQgZnJvbSB3aGljaCB0aGUgcHJlc2VudGF0aW9uIHdhcyBhZGRlZFxuICAgICAqIEBwYXJhbSBwcmVzVXJsIHVybCBvZiB0aGUgcHJlc2VudGF0aW9uXG4gICAgICogQHBhcmFtIGN1cnJlbnRTbGlkZSB0aGUgY3VycmVudCBzbGlkZSB0byB3aGljaCB3ZSBzaG91bGQgbW92ZVxuICAgICAqL1xuICAgIHZhciBwcmVzZW50YXRpb25BZGRlZCA9IGZ1bmN0aW9uKGV2ZW50LCBqaWQsIHByZXNVcmwsIGN1cnJlbnRTbGlkZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInByZXNlbnRhdGlvbiBhZGRlZFwiLCBwcmVzVXJsKTtcblxuICAgICAgICB2YXIgcHJlc0lkID0gZ2V0UHJlc2VudGF0aW9uSWQocHJlc1VybCk7XG5cbiAgICAgICAgdmFyIGVsZW1lbnRJZCA9ICdwYXJ0aWNpcGFudF8nXG4gICAgICAgICAgICAgICAgICAgICAgICArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGppZClcbiAgICAgICAgICAgICAgICAgICAgICAgICsgJ18nICsgcHJlc0lkO1xuXG4gICAgICAgIC8vIFdlIGV4cGxpY2l0bHkgZG9uJ3Qgc3BlY2lmeSB0aGUgcGVlciBqaWQgaGVyZSwgYmVjYXVzZSB3ZSBkb24ndCB3YW50XG4gICAgICAgIC8vIHRoaXMgdmlkZW8gdG8gYmUgZGVhbHQgd2l0aCBhcyBhIHBlZXIgcmVsYXRlZCBvbmUgKGZvciBleGFtcGxlIHdlXG4gICAgICAgIC8vIGRvbid0IHdhbnQgdG8gc2hvdyBhIG11dGUva2ljayBtZW51IGZvciB0aGlzIG9uZSwgZXRjLikuXG4gICAgICAgIFZpZGVvTGF5b3V0LmFkZFJlbW90ZVZpZGVvQ29udGFpbmVyKG51bGwsIGVsZW1lbnRJZCk7XG4gICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZVRodW1ibmFpbHMoKTtcblxuICAgICAgICB2YXIgY29udHJvbHNFbmFibGVkID0gZmFsc2U7XG4gICAgICAgIGlmIChqaWQgPT09IFhNUFBBY3RpdmF0b3IuZ2V0TXlKSUQoKSlcbiAgICAgICAgICAgIGNvbnRyb2xzRW5hYmxlZCA9IHRydWU7XG5cbiAgICAgICAgUHJlemkuc2V0UHJlc2VudGF0aW9uVmlzaWJsZSh0cnVlKTtcbiAgICAgICAgJCgnI2xhcmdlVmlkZW9Db250YWluZXInKS5ob3ZlcihcbiAgICAgICAgICAgIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIGlmIChQcmV6aS5pc1ByZXNlbnRhdGlvblZpc2libGUoKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVsb2FkQnV0dG9uUmlnaHQgPSB3aW5kb3cuaW5uZXJXaWR0aFxuICAgICAgICAgICAgICAgICAgICAgICAgLSAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLm9mZnNldCgpLmxlZnRcbiAgICAgICAgICAgICAgICAgICAgICAgIC0gJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS53aWR0aCgpO1xuXG4gICAgICAgICAgICAgICAgICAgICQoJyNyZWxvYWRQcmVzZW50YXRpb24nKS5jc3MoeyAgcmlnaHQ6IHJlbG9hZEJ1dHRvblJpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc3BsYXk6J2lubGluZS1ibG9jayd9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKCFQcmV6aS5pc1ByZXNlbnRhdGlvblZpc2libGUoKSlcbiAgICAgICAgICAgICAgICAgICAgJCgnI3JlbG9hZFByZXNlbnRhdGlvbicpLmNzcyh7ZGlzcGxheTonbm9uZSd9KTtcbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGUgPSBldmVudC50b0VsZW1lbnQgfHwgZXZlbnQucmVsYXRlZFRhcmdldDtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoZSAmJiBlLmlkICE9ICdyZWxvYWRQcmVzZW50YXRpb24nICYmIGUuaWQgIT0gJ2hlYWRlcicpXG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcjcmVsb2FkUHJlc2VudGF0aW9uJykuY3NzKHtkaXNwbGF5Oidub25lJ30pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIHByZXppUGxheWVyID0gbmV3IFByZXppUGxheWVyKFxuICAgICAgICAgICAgICAgICAgICAncHJlc2VudGF0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAge3ByZXppSWQ6IHByZXNJZCxcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGdldFByZXNlbnRhdGlvbldpZHRoKCksXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogZ2V0UHJlc2VudGF0aW9uSGVpaGd0KCksXG4gICAgICAgICAgICAgICAgICAgIGNvbnRyb2xzOiBjb250cm9sc0VuYWJsZWQsXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykuYXR0cignaWQnLCBwcmV6aVBsYXllci5vcHRpb25zLnByZXppSWQpO1xuXG4gICAgICAgIHByZXppUGxheWVyLm9uKFByZXppUGxheWVyLkVWRU5UX1NUQVRVUywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicHJlemkgc3RhdHVzXCIsIGV2ZW50LnZhbHVlKTtcbiAgICAgICAgICAgIGlmIChldmVudC52YWx1ZSA9PSBQcmV6aVBsYXllci5TVEFUVVNfQ09OVEVOVF9SRUFEWSkge1xuICAgICAgICAgICAgICAgIGlmIChqaWQgIT0gWE1QUEFjdGl2YXRvci5nZXRNeUpJRCgpKVxuICAgICAgICAgICAgICAgICAgICBwcmV6aVBsYXllci5mbHlUb1N0ZXAoY3VycmVudFNsaWRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcHJlemlQbGF5ZXIub24oUHJlemlQbGF5ZXIuRVZFTlRfQ1VSUkVOVF9TVEVQLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJldmVudCB2YWx1ZVwiLCBldmVudC52YWx1ZSk7XG4gICAgICAgICAgICBYTVBQQWN0aXZhdG9yLmFkZFRvUHJlc2VuY2UoXCJwcmV6aVNsaWRlXCIsIGV2ZW50LnZhbHVlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJChcIiNcIiArIGVsZW1lbnRJZCkuY3NzKCAnYmFja2dyb3VuZC1pbWFnZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICd1cmwoLi4vaW1hZ2VzL2F2YXRhcnByZXppLnBuZyknKTtcbiAgICAgICAgJChcIiNcIiArIGVsZW1lbnRJZCkuY2xpY2soXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgUHJlemkuc2V0UHJlc2VudGF0aW9uVmlzaWJsZSh0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQSBwcmVzZW50YXRpb24gaGFzIGJlZW4gcmVtb3ZlZC5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0gZXZlbnQgdGhlIGV2ZW50IGluZGljYXRpbmcgdGhlIHJlbW92ZSBvZiBhIHByZXNlbnRhdGlvblxuICAgICAqIEBwYXJhbSBqaWQgdGhlIGppZCBmb3Igd2hpY2ggdGhlIHByZXNlbnRhdGlvbiB3YXMgcmVtb3ZlZFxuICAgICAqIEBwYXJhbSB0aGUgdXJsIG9mIHRoZSBwcmVzZW50YXRpb25cbiAgICAgKi9cbiAgICB2YXIgcHJlc2VudGF0aW9uUmVtb3ZlZCA9IGZ1bmN0aW9uIChldmVudCwgamlkLCBwcmVzVXJsKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdwcmVzZW50YXRpb24gcmVtb3ZlZCcsIHByZXNVcmwpO1xuICAgICAgICB2YXIgcHJlc0lkID0gZ2V0UHJlc2VudGF0aW9uSWQocHJlc1VybCk7XG4gICAgICAgIFByZXppLnNldFByZXNlbnRhdGlvblZpc2libGUoZmFsc2UpO1xuICAgICAgICAkKCcjcGFydGljaXBhbnRfJ1xuICAgICAgICAgICAgICAgICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKVxuICAgICAgICAgICAgICAgICsgJ18nICsgcHJlc0lkKS5yZW1vdmUoKTtcbiAgICAgICAgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS5yZW1vdmUoKTtcbiAgICAgICAgaWYgKHByZXppUGxheWVyICE9IG51bGwpIHtcbiAgICAgICAgICAgIHByZXppUGxheWVyLmRlc3Ryb3koKTtcbiAgICAgICAgICAgIHByZXppUGxheWVyID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBJbmRpY2F0ZXMgaWYgdGhlIGdpdmVuIHN0cmluZyBpcyBhbiBhbHBoYW51bWVyaWMgc3RyaW5nLlxuICAgICAqIE5vdGUgdGhhdCBzb21lIHNwZWNpYWwgY2hhcmFjdGVycyBhcmUgYWxzbyBhbGxvd2VkICgtLCBfICwgLywgJiwgPywgPSwgOykgZm9yIHRoZVxuICAgICAqIHB1cnBvc2Ugb2YgY2hlY2tpbmcgVVJJcy5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc0FscGhhbnVtZXJpYyh1bnNhZmVUZXh0KSB7XG4gICAgICAgIHZhciByZWdleCA9IC9eW2EtejAtOS1fXFwvJlxcPz07XSskL2k7XG4gICAgICAgIHJldHVybiByZWdleC50ZXN0KHVuc2FmZVRleHQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHByZXNlbnRhdGlvbiBpZCBmcm9tIHRoZSBnaXZlbiB1cmwuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UHJlc2VudGF0aW9uSWQgKHByZXNVcmwpIHtcbiAgICAgICAgdmFyIHByZXNJZFRtcCA9IHByZXNVcmwuc3Vic3RyaW5nKHByZXNVcmwuaW5kZXhPZihcInByZXppLmNvbS9cIikgKyAxMCk7XG4gICAgICAgIHJldHVybiBwcmVzSWRUbXAuc3Vic3RyaW5nKDAsIHByZXNJZFRtcC5pbmRleE9mKCcvJykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHByZXNlbnRhdGlvbiB3aWR0aC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRQcmVzZW50YXRpb25XaWR0aCgpIHtcbiAgICAgICAgdmFyIGF2YWlsYWJsZVdpZHRoID0gVUlVdGlsLmdldEF2YWlsYWJsZVZpZGVvV2lkdGgoKTtcbiAgICAgICAgdmFyIGF2YWlsYWJsZUhlaWdodCA9IGdldFByZXNlbnRhdGlvbkhlaWhndCgpO1xuXG4gICAgICAgIHZhciBhc3BlY3RSYXRpbyA9IDE2LjAgLyA5LjA7XG4gICAgICAgIGlmIChhdmFpbGFibGVIZWlnaHQgPCBhdmFpbGFibGVXaWR0aCAvIGFzcGVjdFJhdGlvKSB7XG4gICAgICAgICAgICBhdmFpbGFibGVXaWR0aCA9IE1hdGguZmxvb3IoYXZhaWxhYmxlSGVpZ2h0ICogYXNwZWN0UmF0aW8pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhdmFpbGFibGVXaWR0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBwcmVzZW50YXRpb24gaGVpZ2h0LlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFByZXNlbnRhdGlvbkhlaWhndCgpIHtcbiAgICAgICAgdmFyIHJlbW90ZVZpZGVvcyA9ICQoJyNyZW1vdGVWaWRlb3MnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbm5lckhlaWdodCAtIHJlbW90ZVZpZGVvcy5vdXRlckhlaWdodCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlc2l6ZXMgdGhlIHByZXNlbnRhdGlvbiBpZnJhbWUuXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVzaXplKCkge1xuICAgICAgICBpZiAoJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKSkge1xuICAgICAgICAgICAgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS53aWR0aChnZXRQcmVzZW50YXRpb25XaWR0aCgpKTtcbiAgICAgICAgICAgICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykuaGVpZ2h0KGdldFByZXNlbnRhdGlvbkhlaWhndCgpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFByZXNlbnRhdGlvbiBoYXMgYmVlbiByZW1vdmVkLlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ3ByZXNlbnRhdGlvbnJlbW92ZWQubXVjJywgcHJlc2VudGF0aW9uUmVtb3ZlZCk7XG5cbiAgICAvKipcbiAgICAgKiBQcmVzZW50YXRpb24gaGFzIGJlZW4gYWRkZWQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgncHJlc2VudGF0aW9uYWRkZWQubXVjJywgcHJlc2VudGF0aW9uQWRkZWQpO1xuXG4gICAgLypcbiAgICAgKiBJbmRpY2F0ZXMgcHJlc2VudGF0aW9uIHNsaWRlIGNoYW5nZS5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdnb3Rvc2xpZGUubXVjJywgZnVuY3Rpb24gKGV2ZW50LCBqaWQsIHByZXNVcmwsIGN1cnJlbnQpIHtcbiAgICAgICAgaWYgKHByZXppUGxheWVyICYmIHByZXppUGxheWVyLmdldEN1cnJlbnRTdGVwKCkgIT0gY3VycmVudCkge1xuICAgICAgICAgICAgcHJlemlQbGF5ZXIuZmx5VG9TdGVwKGN1cnJlbnQpO1xuXG4gICAgICAgICAgICB2YXIgYW5pbWF0aW9uU3RlcHNBcnJheSA9IHByZXppUGxheWVyLmdldEFuaW1hdGlvbkNvdW50T25TdGVwcygpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJzZUludChhbmltYXRpb25TdGVwc0FycmF5W2N1cnJlbnRdKTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcHJlemlQbGF5ZXIuZmx5VG9TdGVwKGN1cnJlbnQsIGkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBPbiB2aWRlbyBzZWxlY3RlZCBldmVudC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCd2aWRlby5zZWxlY3RlZCcsIGZ1bmN0aW9uIChldmVudCwgaXNQcmVzZW50YXRpb24pIHtcbiAgICAgICAgaWYgKCFpc1ByZXNlbnRhdGlvbiAmJiAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpKVxuICAgICAgICAgICAgUHJlemkuc2V0UHJlc2VudGF0aW9uVmlzaWJsZShmYWxzZSk7XG4gICAgfSk7XG5cbiAgICAkKHdpbmRvdykucmVzaXplKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmVzaXplKCk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbXk7XG59KFByZXppIHx8IHt9KSk7XG5cbm1vZHVsZS5leHBvcnRzID0gUHJlemk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB2YXIgX19iaW5kID0gZnVuY3Rpb24oZm4sIG1lKXsgcmV0dXJuIGZ1bmN0aW9uKCl7IHJldHVybiBmbi5hcHBseShtZSwgYXJndW1lbnRzKTsgfTsgfTtcblxuICAgIHZhciBQcmV6aVBsYXllciA9IChmdW5jdGlvbigpIHtcblxuICAgICAgICBQcmV6aVBsYXllci5BUElfVkVSU0lPTiA9IDE7XG4gICAgICAgIFByZXppUGxheWVyLkNVUlJFTlRfU1RFUCA9ICdjdXJyZW50U3RlcCc7XG4gICAgICAgIFByZXppUGxheWVyLkNVUlJFTlRfQU5JTUFUSU9OX1NURVAgPSAnY3VycmVudEFuaW1hdGlvblN0ZXAnO1xuICAgICAgICBQcmV6aVBsYXllci5DVVJSRU5UX09CSkVDVCA9ICdjdXJyZW50T2JqZWN0JztcbiAgICAgICAgUHJlemlQbGF5ZXIuU1RBVFVTX0xPQURJTkcgPSAnbG9hZGluZyc7XG4gICAgICAgIFByZXppUGxheWVyLlNUQVRVU19SRUFEWSA9ICdyZWFkeSc7XG4gICAgICAgIFByZXppUGxheWVyLlNUQVRVU19DT05URU5UX1JFQURZID0gJ2NvbnRlbnRyZWFkeSc7XG4gICAgICAgIFByZXppUGxheWVyLkVWRU5UX0NVUlJFTlRfU1RFUCA9IFwiY3VycmVudFN0ZXBDaGFuZ2VcIjtcbiAgICAgICAgUHJlemlQbGF5ZXIuRVZFTlRfQ1VSUkVOVF9BTklNQVRJT05fU1RFUCA9IFwiY3VycmVudEFuaW1hdGlvblN0ZXBDaGFuZ2VcIjtcbiAgICAgICAgUHJlemlQbGF5ZXIuRVZFTlRfQ1VSUkVOVF9PQkpFQ1QgPSBcImN1cnJlbnRPYmplY3RDaGFuZ2VcIjtcbiAgICAgICAgUHJlemlQbGF5ZXIuRVZFTlRfU1RBVFVTID0gXCJzdGF0dXNDaGFuZ2VcIjtcbiAgICAgICAgUHJlemlQbGF5ZXIuRVZFTlRfUExBWUlORyA9IFwiaXNBdXRvUGxheWluZ0NoYW5nZVwiO1xuICAgICAgICBQcmV6aVBsYXllci5FVkVOVF9JU19NT1ZJTkcgPSBcImlzTW92aW5nQ2hhbmdlXCI7XG4gICAgICAgIFByZXppUGxheWVyLmRvbWFpbiA9IFwiaHR0cHM6Ly9wcmV6aS5jb21cIjtcbiAgICAgICAgUHJlemlQbGF5ZXIucGF0aCA9IFwiL3BsYXllci9cIjtcbiAgICAgICAgUHJlemlQbGF5ZXIucGxheWVycyA9IHt9O1xuICAgICAgICBQcmV6aVBsYXllci5iaW5kZWRfbWV0aG9kcyA9IFsnY2hhbmdlc0hhbmRsZXInXTtcblxuICAgICAgICBQcmV6aVBsYXllci5jcmVhdGVNdWx0aXBsZVBsYXllcnMgPSBmdW5jdGlvbihvcHRpb25BcnJheSl7XG4gICAgICAgICAgICBmb3IodmFyIGk9MDsgaTxvcHRpb25BcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBvcHRpb25TZXQgPSBvcHRpb25BcnJheVtpXTtcbiAgICAgICAgICAgICAgICBuZXcgUHJlemlQbGF5ZXIob3B0aW9uU2V0LmlkLCBvcHRpb25TZXQpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5tZXNzYWdlUmVjZWl2ZWQgPSBmdW5jdGlvbihldmVudCl7XG4gICAgICAgICAgICB2YXIgbWVzc2FnZSwgaXRlbSwgcGxheWVyO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gSlNPTi5wYXJzZShldmVudC5kYXRhKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5pZCAmJiAocGxheWVyID0gUHJlemlQbGF5ZXIucGxheWVyc1ttZXNzYWdlLmlkXSkpe1xuICAgICAgICAgICAgICAgIGlmIChwbGF5ZXIub3B0aW9ucy5kZWJ1ZyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29uc29sZSAmJiBjb25zb2xlLmxvZykgY29uc29sZS5sb2coJ3JlY2VpdmVkJywgbWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiY2hhbmdlc1wiKXtcbiAgICAgICAgICAgICAgICAgICAgcGxheWVyLmNoYW5nZXNIYW5kbGVyKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8cGxheWVyLmNhbGxiYWNrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpdGVtID0gcGxheWVyLmNhbGxiYWNrc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0gJiYgbWVzc2FnZS50eXBlID09PSBpdGVtLmV2ZW50KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uY2FsbGJhY2sobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gUHJlemlQbGF5ZXIoaWQsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciBwYXJhbXMsIHBhcmFtU3RyaW5nID0gXCJcIiwgX3RoaXMgPSB0aGlzO1xuICAgICAgICAgICAgaWYgKFByZXppUGxheWVyLnBsYXllcnNbaWRdKXtcbiAgICAgICAgICAgICAgICBQcmV6aVBsYXllci5wbGF5ZXJzW2lkXS5kZXN0cm95KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IodmFyIGk9MDsgaTxQcmV6aVBsYXllci5iaW5kZWRfbWV0aG9kcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBtZXRob2RfbmFtZSA9IFByZXppUGxheWVyLmJpbmRlZF9tZXRob2RzW2ldO1xuICAgICAgICAgICAgICAgIF90aGlzW21ldGhvZF9uYW1lXSA9IF9fYmluZChfdGhpc1ttZXRob2RfbmFtZV0sIF90aGlzKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgICAgICAgICB0aGlzLnZhbHVlcyA9IHsnc3RhdHVzJzogUHJlemlQbGF5ZXIuU1RBVFVTX0xPQURJTkd9O1xuICAgICAgICAgICAgdGhpcy52YWx1ZXNbUHJlemlQbGF5ZXIuQ1VSUkVOVF9TVEVQXSA9IDA7XG4gICAgICAgICAgICB0aGlzLnZhbHVlc1tQcmV6aVBsYXllci5DVVJSRU5UX0FOSU1BVElPTl9TVEVQXSA9IDA7XG4gICAgICAgICAgICB0aGlzLnZhbHVlc1tQcmV6aVBsYXllci5DVVJSRU5UX09CSkVDVF0gPSBudWxsO1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFja3MgPSBbXTtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgICAgIHRoaXMuZW1iZWRUbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcbiAgICAgICAgICAgIGlmICghdGhpcy5lbWJlZFRvKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgXCJUaGUgZWxlbWVudCBpZCBpcyBub3QgYXZhaWxhYmxlLlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5pZnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcbiAgICAgICAgICAgIHBhcmFtcyA9IFtcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdvaWQnLCB2YWx1ZTogb3B0aW9ucy5wcmV6aUlkIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZXhwbG9yYWJsZScsIHZhbHVlOiBvcHRpb25zLmV4cGxvcmFibGUgPyAxIDogMCB9LFxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2NvbnRyb2xzJywgdmFsdWU6IG9wdGlvbnMuY29udHJvbHMgPyAxIDogMCB9XG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgZm9yKHZhciBpPTA7IGk8cGFyYW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtID0gcGFyYW1zW2ldO1xuICAgICAgICAgICAgICAgIHBhcmFtU3RyaW5nICs9IChpPT09MCA/IFwiP1wiIDogXCImXCIpICsgcGFyYW0ubmFtZSArIFwiPVwiICsgcGFyYW0udmFsdWU7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5pZnJhbWUuc3JjID0gUHJlemlQbGF5ZXIuZG9tYWluICsgUHJlemlQbGF5ZXIucGF0aCArIHBhcmFtU3RyaW5nO1xuICAgICAgICAgICAgdGhpcy5pZnJhbWUuZnJhbWVCb3JkZXIgPSAwO1xuICAgICAgICAgICAgdGhpcy5pZnJhbWUuc2Nyb2xsaW5nID0gXCJub1wiO1xuICAgICAgICAgICAgdGhpcy5pZnJhbWUud2lkdGggPSBvcHRpb25zLndpZHRoIHx8IDY0MDtcbiAgICAgICAgICAgIHRoaXMuaWZyYW1lLmhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0IHx8IDQ4MDtcbiAgICAgICAgICAgIHRoaXMuZW1iZWRUby5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgICAgIC8vIEpJVFNJOiBJTiBDQVNFIFNPTUVUSElORyBHT0VTIFdST05HLlxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0aGlzLmVtYmVkVG8uYXBwZW5kQ2hpbGQodGhpcy5pZnJhbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ0FUQ0ggRVJST1JcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEpJVFNJOiBJbmNyZWFzZSBpbnRlcnZhbCBmcm9tIDIwMCB0byA1MDAsIHdoaWNoIGZpeGVzIHByZXppXG4gICAgICAgICAgICAvLyBjcmFzaGVzIGZvciB1cy5cbiAgICAgICAgICAgIHRoaXMuaW5pdFBvbGxJbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgX3RoaXMuc2VuZE1lc3NhZ2UoeydhY3Rpb24nOiAnaW5pdCd9KTtcbiAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICBQcmV6aVBsYXllci5wbGF5ZXJzW2lkXSA9IHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuY2hhbmdlc0hhbmRsZXIgPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgICAgICAgICB2YXIga2V5LCB2YWx1ZSwgaiwgaXRlbTtcbiAgICAgICAgICAgIGlmICh0aGlzLmluaXRQb2xsSW50ZXJ2YWwpIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMuaW5pdFBvbGxJbnRlcnZhbCk7XG4gICAgICAgICAgICAgICAgdGhpcy5pbml0UG9sbEludGVydmFsID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGtleSBpbiBtZXNzYWdlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5kYXRhLmhhc093blByb3BlcnR5KGtleSkpe1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG1lc3NhZ2UuZGF0YVtrZXldO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnZhbHVlc1trZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaj0wOyBqPHRoaXMuY2FsbGJhY2tzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtID0gdGhpcy5jYWxsYmFja3Nbal07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLmV2ZW50ID09PSBrZXkgKyBcIkNoYW5nZVwiKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLmNhbGxiYWNrKHt0eXBlOiBpdGVtLmV2ZW50LCB2YWx1ZTogdmFsdWV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaW5pdFBvbGxJbnRlcnZhbCkge1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5pbml0UG9sbEludGVydmFsKTtcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRQb2xsSW50ZXJ2YWwgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZW1iZWRUby5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuc2VuZE1lc3NhZ2UgPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLmRlYnVnID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbnNvbGUgJiYgY29uc29sZS5sb2cpIGNvbnNvbGUubG9nKCdzZW50JywgbWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtZXNzYWdlLnZlcnNpb24gPSBQcmV6aVBsYXllci5BUElfVkVSU0lPTjtcbiAgICAgICAgICAgIG1lc3NhZ2UuaWQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaWZyYW1lLmNvbnRlbnRXaW5kb3cucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkobWVzc2FnZSksICcqJyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLm5leHRTdGVwID0gLyogbmV4dFN0ZXAgaXMgREVQUkVDQVRFRCAqL1xuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZmx5VG9OZXh0U3RlcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgICdhY3Rpb24nOiAncHJlc2VudCcsXG4gICAgICAgICAgICAgICAgJ2RhdGEnOiBbJ21vdmVUb05leHRTdGVwJ11cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5wcmV2aW91c1N0ZXAgPSAvKiBwcmV2aW91c1N0ZXAgaXMgREVQUkVDQVRFRCAqL1xuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZmx5VG9QcmV2aW91c1N0ZXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAnYWN0aW9uJzogJ3ByZXNlbnQnLFxuICAgICAgICAgICAgICAgICdkYXRhJzogWydtb3ZlVG9QcmV2U3RlcCddXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUudG9TdGVwID0gLyogdG9TdGVwIGlzIERFUFJFQ0FURUQgKi9cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmZseVRvU3RlcCA9IGZ1bmN0aW9uKHN0ZXAsIGFuaW1hdGlvbl9zdGVwKSB7XG4gICAgICAgICAgICB2YXIgb2JqID0gdGhpcztcbiAgICAgICAgICAgIC8vIGNoZWNrIGFuaW1hdGlvbl9zdGVwXG4gICAgICAgICAgICBpZiAoYW5pbWF0aW9uX3N0ZXAgPiAwICYmXG4gICAgICAgICAgICAgICAgb2JqLnZhbHVlcy5hbmltYXRpb25Db3VudE9uU3RlcHMgJiZcbiAgICAgICAgICAgICAgICBvYmoudmFsdWVzLmFuaW1hdGlvbkNvdW50T25TdGVwc1tzdGVwXSA8PSBhbmltYXRpb25fc3RlcCkge1xuICAgICAgICAgICAgICAgIGFuaW1hdGlvbl9zdGVwID0gb2JqLnZhbHVlcy5hbmltYXRpb25Db3VudE9uU3RlcHNbc3RlcF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBqdW1wIHRvIGFuaW1hdGlvbiBzdGVwcyBieSBjYWxsaW5nIGZseVRvTmV4dFN0ZXAoKVxuICAgICAgICAgICAgZnVuY3Rpb24gZG9BbmltYXRpb25TdGVwcygpIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqLnZhbHVlcy5pc01vdmluZyA9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZG9BbmltYXRpb25TdGVwcywgMTAwKTsgLy8gd2FpdCB1bnRpbCB0aGUgZmxpZ2h0IGVuZHNcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB3aGlsZSAoYW5pbWF0aW9uX3N0ZXAtLSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgb2JqLmZseVRvTmV4dFN0ZXAoKTsgLy8gZG8gdGhlIGFuaW1hdGlvbiBzdGVwc1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNldFRpbWVvdXQoZG9BbmltYXRpb25TdGVwcywgMjAwKTsgLy8gMjAwbXMgaXMgdGhlIGludGVybmFsIFwicmVwb3J0aW5nXCIgdGltZVxuICAgICAgICAgICAgLy8ganVtcCB0byB0aGUgc3RlcFxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgICdhY3Rpb24nOiAncHJlc2VudCcsXG4gICAgICAgICAgICAgICAgJ2RhdGEnOiBbJ21vdmVUb1N0ZXAnLCBzdGVwXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLnRvT2JqZWN0ID0gLyogdG9PYmplY3QgaXMgREVQUkVDQVRFRCAqL1xuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZmx5VG9PYmplY3QgPSBmdW5jdGlvbihvYmplY3RJZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgICdhY3Rpb24nOiAncHJlc2VudCcsXG4gICAgICAgICAgICAgICAgJ2RhdGEnOiBbJ21vdmVUb09iamVjdCcsIG9iamVjdElkXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWZhdWx0RGVsYXkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAnYWN0aW9uJzogJ3ByZXNlbnQnLFxuICAgICAgICAgICAgICAgICdkYXRhJzogWydzdGFydEF1dG9QbGF5JywgZGVmYXVsdERlbGF5XVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAnYWN0aW9uJzogJ3ByZXNlbnQnLFxuICAgICAgICAgICAgICAgICdkYXRhJzogWydzdG9wQXV0b1BsYXknXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oZGVmYXVsdERlbGF5KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgJ2FjdGlvbic6ICdwcmVzZW50JyxcbiAgICAgICAgICAgICAgICAnZGF0YSc6IFsncGF1c2VBdXRvUGxheScsIGRlZmF1bHREZWxheV1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5nZXRDdXJyZW50U3RlcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzLmN1cnJlbnRTdGVwO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5nZXRDdXJyZW50QW5pbWF0aW9uU3RlcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzLmN1cnJlbnRBbmltYXRpb25TdGVwO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5nZXRDdXJyZW50T2JqZWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXMuY3VycmVudE9iamVjdDtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZ2V0U3RhdHVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXMuc3RhdHVzO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5pc1BsYXlpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlcy5pc0F1dG9QbGF5aW5nO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5nZXRTdGVwQ291bnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlcy5zdGVwQ291bnQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmdldEFuaW1hdGlvbkNvdW50T25TdGVwcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzLmFuaW1hdGlvbkNvdW50T25TdGVwcztcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZ2V0VGl0bGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlcy50aXRsZTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuc2V0RGltZW5zaW9ucyA9IGZ1bmN0aW9uKGRpbXMpIHtcbiAgICAgICAgICAgIGZvciAodmFyIHBhcmFtZXRlciBpbiBkaW1zKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pZnJhbWVbcGFyYW1ldGVyXSA9IGRpbXNbcGFyYW1ldGVyXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5nZXREaW1lbnNpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHdpZHRoOiBwYXJzZUludCh0aGlzLmlmcmFtZS53aWR0aCwgMTApLFxuICAgICAgICAgICAgICAgIGhlaWdodDogcGFyc2VJbnQodGhpcy5pZnJhbWUuaGVpZ2h0LCAxMClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKGV2ZW50LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFja3MucHVzaCh7XG4gICAgICAgICAgICAgICAgZXZlbnQ6IGV2ZW50LFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uKGV2ZW50LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIGosIGl0ZW07XG4gICAgICAgICAgICBpZiAoZXZlbnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tzID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBqID0gdGhpcy5jYWxsYmFja3MubGVuZ3RoO1xuICAgICAgICAgICAgd2hpbGUgKGotLSkge1xuICAgICAgICAgICAgICAgIGl0ZW0gPSB0aGlzLmNhbGxiYWNrc1tqXTtcbiAgICAgICAgICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLmV2ZW50ID09PSBldmVudCAmJiAoY2FsbGJhY2sgPT09IHVuZGVmaW5lZCB8fCBpdGVtLmNhbGxiYWNrID09PSBjYWxsYmFjaykpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbGxiYWNrcy5zcGxpY2UoaiwgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBQcmV6aVBsYXllci5tZXNzYWdlUmVjZWl2ZWQsIGZhbHNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdpbmRvdy5hdHRhY2hFdmVudCgnb25tZXNzYWdlJywgUHJlemlQbGF5ZXIubWVzc2FnZVJlY2VpdmVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBQcmV6aVBsYXllcjtcblxuICAgIH0pKCk7XG5cbiAgICByZXR1cm4gUHJlemlQbGF5ZXI7XG59KSgpO1xuIiwidmFyIENvbnRhY3RMaXN0ID0gcmVxdWlyZShcIi4vLi4vQ29udGFjdExpc3QuanNcIik7XG52YXIgQ2hhdCA9IHJlcXVpcmUoXCIuLy4uL2NoYXQvY2hhdC5qc1wiKTtcbnZhciBidXR0b25DbGljayA9IHJlcXVpcmUoXCIuLi9VSVV0aWxcIikuYnV0dG9uQ2xpY2s7XG5cbnZhciBCb3R0b21Ub29sYmFyID0gKGZ1bmN0aW9uIChteSkge1xuXG4gICAgdmFyIGJ1dHRvbkhhbmRsZXJzID0ge1xuICAgICAgICBcImJvdHRvbXRvb2xiYXJfYnV0dG9uX2NoYXRcIjogZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gQm90dG9tVG9vbGJhci50b2dnbGVDaGF0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIFwiYm90dG9tdG9vbGJhcl9idXR0b25fY29udGFjdFwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gQm90dG9tVG9vbGJhci50b2dnbGVDb250YWN0TGlzdCgpO1xuICAgICAgICB9LFxuICAgICAgICBcImJvdHRvbXRvb2xiYXJfYnV0dG9uX2ZpbG1zdHJpcFwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gQm90dG9tVG9vbGJhci50b2dnbGVGaWxtU3RyaXAoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBteS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBmb3IodmFyIGsgaW4gYnV0dG9uSGFuZGxlcnMpXG4gICAgICAgICAgICAkKFwiI1wiICsgaykuY2xpY2soYnV0dG9uSGFuZGxlcnNba10pO1xuICAgIH1cbiAgICBteS50b2dnbGVDaGF0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChDb250YWN0TGlzdC5pc1Zpc2libGUoKSkge1xuICAgICAgICAgICAgYnV0dG9uQ2xpY2soXCIjY29udGFjdExpc3RCdXR0b25cIiwgXCJhY3RpdmVcIik7XG4gICAgICAgICAgICBDb250YWN0TGlzdC50b2dnbGVDb250YWN0TGlzdCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgYnV0dG9uQ2xpY2soXCIjY2hhdEJvdHRvbUJ1dHRvblwiLCBcImFjdGl2ZVwiKTtcblxuICAgICAgICBDaGF0LnRvZ2dsZUNoYXQoKTtcbiAgICB9O1xuXG4gICAgbXkudG9nZ2xlQ29udGFjdExpc3QgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKENoYXQuaXNWaXNpYmxlKCkpIHtcbiAgICAgICAgICAgIGJ1dHRvbkNsaWNrKFwiI2NoYXRCb3R0b21CdXR0b25cIiwgXCJhY3RpdmVcIik7XG4gICAgICAgICAgICBDaGF0LnRvZ2dsZUNoYXQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGJ1dHRvbkNsaWNrKFwiI2NvbnRhY3RMaXN0QnV0dG9uXCIsIFwiYWN0aXZlXCIpO1xuXG4gICAgICAgIENvbnRhY3RMaXN0LnRvZ2dsZUNvbnRhY3RMaXN0KCk7XG4gICAgfTtcblxuICAgIG15LnRvZ2dsZUZpbG1TdHJpcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZmlsbXN0cmlwID0gJChcIiNyZW1vdGVWaWRlb3NcIik7XG4gICAgICAgIGZpbG1zdHJpcC50b2dnbGVDbGFzcyhcImhpZGRlblwiKTtcbiAgICB9O1xuXG5cbiAgICAkKGRvY3VtZW50KS5iaW5kKFwicmVtb3RldmlkZW8ucmVzaXplZFwiLCBmdW5jdGlvbiAoZXZlbnQsIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgdmFyIGJvdHRvbSA9IChoZWlnaHQgLSAkKCcjYm90dG9tVG9vbGJhcicpLm91dGVySGVpZ2h0KCkpLzIgKyAxODtcblxuICAgICAgICAkKCcjYm90dG9tVG9vbGJhcicpLmNzcyh7Ym90dG9tOiBib3R0b20gKyAncHgnfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbXk7XG59KEJvdHRvbVRvb2xiYXIgfHwge30pKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCb3R0b21Ub29sYmFyO1xuIiwidmFyIEJvdHRvbVRvb2xiYXIgPSByZXF1aXJlKFwiLi9Cb3R0b21Ub29sYmFyXCIpO1xudmFyIFByZXppID0gcmVxdWlyZShcIi4vLi4vcHJlemkvcHJlemlcIik7XG52YXIgRXRoZXJwYWQgPSByZXF1aXJlKFwiLi8uLi9ldGhlcnBhZC9FdGhlcnBhZFwiKTtcbnZhciBidXR0b25DbGljayA9IHJlcXVpcmUoXCIuLi9VSVV0aWxcIikuYnV0dG9uQ2xpY2s7XG5cbnZhciBUb29sYmFyID0gKGZ1bmN0aW9uIChteSkge1xuXG4gICAgdmFyIHRvb2xiYXJUaW1lb3V0ID0gbnVsbDtcblxuICAgIHZhciByb29tVXJsID0gbnVsbDtcblxuICAgIHZhciByZWNvcmRpbmdUb2tlbiA9ICcnO1xuXG4gICAgdmFyIGJ1dHRvbkhhbmRsZXJzID0ge1xuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX211dGVcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIFRvb2xiYXIudG9nZ2xlQXVkaW8oKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9jYW1lcmFcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYnV0dG9uQ2xpY2soXCIjdmlkZW9cIiwgXCJpY29uLWNhbWVyYSBpY29uLWNhbWVyYS1kaXNhYmxlZFwiKTtcbiAgICAgICAgICAgIHJldHVybiB0b2dnbGVWaWRlbygpO1xuICAgICAgICB9LFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX3JlY29yZFwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9nZ2xlUmVjb3JkaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgLFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX3NlY3VyaXR5XCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBUb29sYmFyLm9wZW5Mb2NrRGlhbG9nKCk7XG4gICAgICAgIH0sXG4gICAgICAgIFwidG9vbGJhcl9idXR0b25fbGlua1wiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gVG9vbGJhci5vcGVuTGlua0RpYWxvZygpO1xuICAgICAgICB9LFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX2NoYXRcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIEJvdHRvbVRvb2xiYXIudG9nZ2xlQ2hhdCgpO1xuICAgICAgICB9LFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX3ByZXppXCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBQcmV6aS5vcGVuUHJlemlEaWFsb2coKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9ldGhlcnBhZFwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gRXRoZXJwYWQudG9nZ2xlRXRoZXJwYWQoMCk7XG4gICAgICAgIH0sXG4gICAgICAgIFwidG9vbGJhcl9idXR0b25fZGVza3RvcHNoYXJpbmdcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRvZ2dsZVNjcmVlblNoYXJpbmcoKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9mdWxsU2NyZWVuXCI6IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgYnV0dG9uQ2xpY2soXCIjZnVsbFNjcmVlblwiLCBcImljb24tZnVsbC1zY3JlZW4gaWNvbi1leGl0LWZ1bGwtc2NyZWVuXCIpO1xuICAgICAgICAgICAgcmV0dXJuIFRvb2xiYXIudG9nZ2xlRnVsbFNjcmVlbigpO1xuICAgICAgICB9LFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX3NpcFwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbFNpcEJ1dHRvbkNsaWNrZWQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9oYW5ndXBcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGhhbmd1cCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbXkuc2hhcmVkS2V5ID0gJyc7XG4gICAgbXkucHJlTXV0ZWQgPSBmYWxzZTtcblxuICAgIGZ1bmN0aW9uIHNldFJlY29yZGluZ1Rva2VuKHRva2VuKSB7XG4gICAgICAgIHJlY29yZGluZ1Rva2VuID0gdG9rZW47XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FsbFNpcEJ1dHRvbkNsaWNrZWQoKVxuICAgIHtcbiAgICAgICAgbWVzc2FnZUhhbmRsZXIub3BlblR3b0J1dHRvbkRpYWxvZyhudWxsLFxuICAgICAgICAgICAgICAgICc8aDI+RW50ZXIgU0lQIG51bWJlcjwvaDI+JyArXG4gICAgICAgICAgICAgICAgJzxpbnB1dCBpZD1cInNpcE51bWJlclwiIHR5cGU9XCJ0ZXh0XCInICtcbiAgICAgICAgICAgICAgICAnIHZhbHVlPVwiJyArIGNvbmZpZy5kZWZhdWx0U2lwTnVtYmVyICsgJ1wiIGF1dG9mb2N1cz4nLFxuICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICBcIkRpYWxcIixcbiAgICAgICAgICAgIGZ1bmN0aW9uIChlLCB2LCBtLCBmKSB7XG4gICAgICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG51bWJlcklucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NpcE51bWJlcicpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobnVtYmVySW5wdXQudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFhNUFBBY3RpdmF0b3Iuc2lwRGlhbChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBudW1iZXJJbnB1dC52YWx1ZSwgJ2Zyb21udW1iZXInLCBVSUFjdGl2YXRvci5nZXRVSVNlcnZpY2UoKS5nZXRSb29tTmFtZSgpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2lwTnVtYmVyJykuZm9jdXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG5cblxuICAgIC8vIFN0YXJ0cyBvciBzdG9wcyB0aGUgcmVjb3JkaW5nIGZvciB0aGUgY29uZmVyZW5jZS5cbiAgICBmdW5jdGlvbiB0b2dnbGVSZWNvcmRpbmcoKSB7XG4gICAgICAgIGlmKCFYTVBQQWN0aXZhdG9yLmlzRm9jdXMoKSlcbiAgICAgICAge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ25vbi1mb2N1czogbm90IGVuYWJsaW5nIHJlY29yZGluZycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgWE1QUEFjdGl2YXRvci5zZXRSZWNvcmRpbmcoXG4gICAgICAgICAgICByZWNvcmRpbmdUb2tlbixcbiAgICAgICAgICAgIGZ1bmN0aW9uIChzdGF0ZSwgb2xkU3RhdGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIk5ldyByZWNvcmRpbmcgc3RhdGU6IFwiLCBzdGF0ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlID09IG9sZFN0YXRlKSAvL2ZhaWxlZCB0byBjaGFuZ2UsIHJlc2V0IHRoZSB0b2tlbiBiZWNhdXNlIGl0IG1pZ2h0IGhhdmUgYmVlbiB3cm9uZ1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgVG9vbGJhci50b2dnbGVSZWNvcmRpbmdCdXR0b25TdGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICBzZXRSZWNvcmRpbmdUb2tlbihudWxsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgVG9vbGJhci50b2dnbGVSZWNvcmRpbmdCdXR0b25TdGF0ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFyZWNvcmRpbmdUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5vcGVuVHdvQnV0dG9uRGlhbG9nKG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJzxoMj5FbnRlciByZWNvcmRpbmcgdG9rZW48L2gyPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICc8aW5wdXQgaWQ9XCJyZWNvcmRpbmdUb2tlblwiIHR5cGU9XCJ0ZXh0XCIgcGxhY2Vob2xkZXI9XCJ0b2tlblwiIGF1dG9mb2N1cz4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBcIlNhdmVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlLCB2LCBtLCBmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRva2VuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JlY29yZGluZ1Rva2VuJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRva2VuLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRSZWNvcmRpbmdUb2tlbihVdGlsLmVzY2FwZUh0bWwodG9rZW4udmFsdWUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvZ2dsZVJlY29yZGluZygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZWNvcmRpbmdUb2tlbicpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG5cblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhhbmd1cCgpIHtcbiAgICAgICAgWE1QUEFjdGl2YXRvci5kaXNwb3NlQ29uZmVyZW5jZShmYWxzZSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGJ1dHRvbnMgPSB7fTtcbiAgICAgICAgICAgIGlmKGNvbmZpZy5lbmFibGVXZWxjb21lUGFnZSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uud2VsY29tZVBhZ2VEaXNhYmxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgPSBcIi9cIjtcbiAgICAgICAgICAgICAgICB9LCAxMDAwMCk7XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJC5wcm9tcHQoXCJTZXNzaW9uIFRlcm1pbmF0ZWRcIixcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIllvdSBodW5nIHVwIHRoZSBjYWxsXCIsXG4gICAgICAgICAgICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGJ1dHRvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiSm9pbiBhZ2FpblwiOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGNsb3NlVGV4dDogJycsXG4gICAgICAgICAgICAgICAgICAgIHN1Ym1pdDogZnVuY3Rpb24oZXZlbnQsIHZhbHVlLCBtZXNzYWdlLCBmb3JtVmFscylcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9LCB0cnVlKTtcblxuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgc2hhcmVkIGtleS5cbiAgICAgKi9cbiAgICBteS5zZXRTaGFyZWRLZXkgPSBmdW5jdGlvbihzS2V5KSB7XG4gICAgICAgIFRvb2xiYXIuc2hhcmVkS2V5ID0gc0tleTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMb2NrcyAvIHVubG9ja3MgdGhlIHJvb20uXG4gICAgICovXG4gICAgZnVuY3Rpb24gbG9ja1Jvb20obG9jaykge1xuICAgICAgICB2YXIga2V5ID0gJyc7XG4gICAgICAgIGlmIChsb2NrKVxuICAgICAgICAgICAga2V5ID0gVG9vbGJhci5zaGFyZWRLZXk7XG5cbiAgICAgICAgWE1QUEFjdGl2YXRvci5sb2NrUm9vbShrZXkpO1xuXG4gICAgICAgIFRvb2xiYXIudXBkYXRlTG9ja0J1dHRvbigpO1xuICAgIH1cblxuICAgIC8vc2V0cyBvbmNsaWNrIGhhbmRsZXJzXG4gICAgbXkuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZm9yKHZhciBrIGluIGJ1dHRvbkhhbmRsZXJzKVxuICAgICAgICAgICAgJChcIiNcIiArIGspLmNsaWNrKGJ1dHRvbkhhbmRsZXJzW2tdKTtcbiAgICB9XG5cblxuICAgIG15LmNoYW5nZVRvb2xiYXJWaWRlb0ljb24gPSBmdW5jdGlvbiAoaXNNdXRlZCkge1xuICAgICAgICBpZiAoaXNNdXRlZCkge1xuICAgICAgICAgICAgJCgnI3ZpZGVvJykucmVtb3ZlQ2xhc3MoXCJpY29uLWNhbWVyYVwiKTtcbiAgICAgICAgICAgICQoJyN2aWRlbycpLmFkZENsYXNzKFwiaWNvbi1jYW1lcmEgaWNvbi1jYW1lcmEtZGlzYWJsZWRcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjdmlkZW8nKS5yZW1vdmVDbGFzcyhcImljb24tY2FtZXJhIGljb24tY2FtZXJhLWRpc2FibGVkXCIpO1xuICAgICAgICAgICAgJCgnI3ZpZGVvJykuYWRkQ2xhc3MoXCJpY29uLWNhbWVyYVwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG15LnRvZ2dsZVZpZGVvID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBidXR0b25DbGljayhcIiN2aWRlb1wiLCBcImljb24tY2FtZXJhIGljb24tY2FtZXJhLWRpc2FibGVkXCIpO1xuXG4gICAgICAgIFhNUFBBY3RpdmF0b3IudG9nZ2xlVmlkZW9NdXRlKFxuICAgICAgICAgICAgZnVuY3Rpb24gKGlzTXV0ZWQpIHtcbiAgICAgICAgICAgICAgICBUb29sYmFyLmNoYW5nZVRvb2xiYXJWaWRlb0ljb24oaXNNdXRlZCk7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNdXRlcyAvIHVubXV0ZXMgYXVkaW8gZm9yIHRoZSBsb2NhbCBwYXJ0aWNpcGFudC5cbiAgICAgKi9cbiAgICBteS50b2dnbGVBdWRpbyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCEoUlRDQWN0aXZhdG9yLmdldFJUQ1NlcnZpY2UoKS5sb2NhbEF1ZGlvKSkge1xuICAgICAgICAgICAgVG9vbGJhci5wcmVNdXRlZCA9IHRydWU7XG4gICAgICAgICAgICAvLyBXZSBzdGlsbCBjbGljayB0aGUgYnV0dG9uLlxuICAgICAgICAgICAgYnV0dG9uQ2xpY2soXCIjbXV0ZVwiLCBcImljb24tbWljcm9waG9uZSBpY29uLW1pYy1kaXNhYmxlZFwiKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIFhNUFBBY3RpdmF0b3IudG9nZ2xlQXVkaW9NdXRlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGJ1dHRvbkNsaWNrKFwiI211dGVcIiwgXCJpY29uLW1pY3JvcGhvbmUgaWNvbi1taWMtZGlzYWJsZWRcIik7XG4gICAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogT3BlbnMgdGhlIGxvY2sgcm9vbSBkaWFsb2cuXG4gICAgICovXG4gICAgbXkub3BlbkxvY2tEaWFsb2cgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIE9ubHkgdGhlIGZvY3VzIGlzIGFibGUgdG8gc2V0IGEgc2hhcmVkIGtleS5cbiAgICAgICAgaWYgKCFYTVBQQWN0aXZhdG9yLmlzRm9jdXMoKSkge1xuICAgICAgICAgICAgaWYgKFRvb2xiYXIuc2hhcmVkS2V5KSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIub3Blbk1lc3NhZ2VEaWFsb2cobnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiVGhpcyBjb252ZXJzYXRpb24gaXMgY3VycmVudGx5IHByb3RlY3RlZCBieVwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiIGEgc2hhcmVkIHNlY3JldCBrZXkuXCIsXG4gICAgICAgICAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBcIlNlY3JldCBrZXlcIik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5NZXNzYWdlRGlhbG9nKG51bGwsXG4gICAgICAgICAgICAgICAgICAgIFwiVGhpcyBjb252ZXJzYXRpb24gaXNuJ3QgY3VycmVudGx5IHByb3RlY3RlZCBieVwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiIGEgc2VjcmV0IGtleS4gT25seSB0aGUgb3duZXIgb2YgdGhlIGNvbmZlcmVuY2VcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICBcIiBjb3VsZCBzZXQgYSBzaGFyZWQga2V5LlwiLFxuICAgICAgICAgICAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgXCJTZWNyZXQga2V5XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKFRvb2xiYXIuc2hhcmVkS2V5KSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIub3BlblR3b0J1dHRvbkRpYWxvZyhudWxsLFxuICAgICAgICAgICAgICAgICAgICBcIkFyZSB5b3Ugc3VyZSB5b3Ugd291bGQgbGlrZSB0byByZW1vdmUgeW91ciBzZWNyZXQga2V5P1wiLFxuICAgICAgICAgICAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgXCJSZW1vdmVcIixcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKGUsIHYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVG9vbGJhci5zZXRTaGFyZWRLZXkoJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2tSb29tKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5Ud29CdXR0b25EaWFsb2cobnVsbCxcbiAgICAgICAgICAgICAgICAgICAgJzxoMj5TZXQgYSBzZWNyZXQga2V5IHRvIGxvY2sgeW91ciByb29tPC9oMj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICc8aW5wdXQgaWQ9XCJsb2NrS2V5XCIgdHlwZT1cInRleHRcIicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ3BsYWNlaG9sZGVyPVwieW91ciBzaGFyZWQga2V5XCIgYXV0b2ZvY3VzPicsXG4gICAgICAgICAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBcIlNhdmVcIixcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKGUsIHYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxvY2tLZXkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9ja0tleScpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxvY2tLZXkudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVG9vbGJhci5zZXRTaGFyZWRLZXkoVXRpbC5lc2NhcGVIdG1sKGxvY2tLZXkudmFsdWUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9ja1Jvb20odHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9ja0tleScpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIHJvb20gaW52aXRlIHVybC5cbiAgICAgKi9cbiAgICBteS51cGRhdGVSb29tVXJsID0gZnVuY3Rpb24obmV3Um9vbVVybCkge1xuICAgICAgICByb29tVXJsID0gbmV3Um9vbVVybDtcblxuICAgICAgICAvLyBJZiB0aGUgaW52aXRlIGRpYWxvZyBoYXMgYmVlbiBhbHJlYWR5IG9wZW5lZCB3ZSB1cGRhdGUgdGhlIGluZm9ybWF0aW9uLlxuICAgICAgICB2YXIgaW52aXRlTGluayA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpbnZpdGVMaW5rUmVmJyk7XG4gICAgICAgIGlmIChpbnZpdGVMaW5rKSB7XG4gICAgICAgICAgICBpbnZpdGVMaW5rLnZhbHVlID0gcm9vbVVybDtcbiAgICAgICAgICAgIGludml0ZUxpbmsuc2VsZWN0KCk7XG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanFpX3N0YXRlMF9idXR0b25JbnZpdGUnKS5kaXNhYmxlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogT3BlbnMgdGhlIGludml0ZSBsaW5rIGRpYWxvZy5cbiAgICAgKi9cbiAgICBteS5vcGVuTGlua0RpYWxvZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGludml0ZUxpbms7XG4gICAgICAgIGlmIChyb29tVXJsID09IG51bGwpIHtcbiAgICAgICAgICAgIGludml0ZUxpbmsgPSBcIllvdXIgY29uZmVyZW5jZSBpcyBjdXJyZW50bHkgYmVpbmcgY3JlYXRlZC4uLlwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW52aXRlTGluayA9IGVuY29kZVVSSShyb29tVXJsKTtcbiAgICAgICAgfVxuICAgICAgICBtZXNzYWdlSGFuZGxlci5vcGVuVHdvQnV0dG9uRGlhbG9nKFxuICAgICAgICAgICAgXCJTaGFyZSB0aGlzIGxpbmsgd2l0aCBldmVyeW9uZSB5b3Ugd2FudCB0byBpbnZpdGVcIixcbiAgICAgICAgICAgICc8aW5wdXQgaWQ9XCJpbnZpdGVMaW5rUmVmXCIgdHlwZT1cInRleHRcIiB2YWx1ZT1cIicgK1xuICAgICAgICAgICAgICAgIGludml0ZUxpbmsgKyAnXCIgb25jbGljaz1cInRoaXMuc2VsZWN0KCk7XCIgcmVhZG9ubHk+JyxcbiAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgXCJJbnZpdGVcIixcbiAgICAgICAgICAgIGZ1bmN0aW9uIChlLCB2KSB7XG4gICAgICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJvb21VcmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludml0ZVBhcnRpY2lwYW50cygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAocm9vbVVybCkge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaW52aXRlTGlua1JlZicpLnNlbGVjdCgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcWlfc3RhdGUwX2J1dHRvbkludml0ZScpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSW52aXRlIHBhcnRpY2lwYW50cyB0byBjb25mZXJlbmNlLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGludml0ZVBhcnRpY2lwYW50cygpIHtcbiAgICAgICAgaWYgKHJvb21VcmwgPT0gbnVsbClcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICB2YXIgc2hhcmVkS2V5VGV4dCA9IFwiXCI7XG4gICAgICAgIGlmIChUb29sYmFyLnNoYXJlZEtleSAmJiBUb29sYmFyLnNoYXJlZEtleS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBzaGFyZWRLZXlUZXh0ID1cbiAgICAgICAgICAgICAgICBcIlRoaXMgY29uZmVyZW5jZSBpcyBwYXNzd29yZCBwcm90ZWN0ZWQuIFBsZWFzZSB1c2UgdGhlIFwiICtcbiAgICAgICAgICAgICAgICBcImZvbGxvd2luZyBwaW4gd2hlbiBqb2luaW5nOiUwRCUwQSUwRCUwQVwiICtcbiAgICAgICAgICAgICAgICAgICAgVG9vbGJhci5zaGFyZWRLZXkgKyBcIiUwRCUwQSUwRCUwQVwiO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNvbmZlcmVuY2VOYW1lID0gcm9vbVVybC5zdWJzdHJpbmcocm9vbVVybC5sYXN0SW5kZXhPZignLycpICsgMSk7XG4gICAgICAgIHZhciBzdWJqZWN0ID0gXCJJbnZpdGF0aW9uIHRvIGEgSml0c2kgTWVldCAoXCIgKyBjb25mZXJlbmNlTmFtZSArIFwiKVwiO1xuICAgICAgICB2YXIgYm9keSA9IFwiSGV5IHRoZXJlLCBJJTI3ZCBsaWtlIHRvIGludml0ZSB5b3UgdG8gYSBKaXRzaSBNZWV0XCIgK1xuICAgICAgICAgICAgICAgICAgICBcIiBjb25mZXJlbmNlIEklMjd2ZSBqdXN0IHNldCB1cC4lMEQlMEElMEQlMEFcIiArXG4gICAgICAgICAgICAgICAgICAgIFwiUGxlYXNlIGNsaWNrIG9uIHRoZSBmb2xsb3dpbmcgbGluayBpbiBvcmRlclwiICtcbiAgICAgICAgICAgICAgICAgICAgXCIgdG8gam9pbiB0aGUgY29uZmVyZW5jZS4lMEQlMEElMEQlMEFcIiArXG4gICAgICAgICAgICAgICAgICAgIHJvb21VcmwgK1xuICAgICAgICAgICAgICAgICAgICBcIiUwRCUwQSUwRCUwQVwiICtcbiAgICAgICAgICAgICAgICAgICAgc2hhcmVkS2V5VGV4dCArXG4gICAgICAgICAgICAgICAgICAgIFwiTm90ZSB0aGF0IEppdHNpIE1lZXQgaXMgY3VycmVudGx5IG9ubHkgc3VwcG9ydGVkIGJ5IENocm9taXVtLFwiICtcbiAgICAgICAgICAgICAgICAgICAgXCIgR29vZ2xlIENocm9tZSBhbmQgT3BlcmEsIHNvIHlvdSBuZWVkXCIgK1xuICAgICAgICAgICAgICAgICAgICBcIiB0byBiZSB1c2luZyBvbmUgb2YgdGhlc2UgYnJvd3NlcnMuJTBEJTBBJTBEJTBBXCIgK1xuICAgICAgICAgICAgICAgICAgICBcIlRhbGsgdG8geW91IGluIGEgc2VjIVwiO1xuXG4gICAgICAgIGlmICh3aW5kb3cubG9jYWxTdG9yYWdlLmRpc3BsYXluYW1lKSB7XG4gICAgICAgICAgICBib2R5ICs9IFwiJTBEJTBBJTBEJTBBXCIgKyB3aW5kb3cubG9jYWxTdG9yYWdlLmRpc3BsYXluYW1lO1xuICAgICAgICB9XG5cbiAgICAgICAgd2luZG93Lm9wZW4oXCJtYWlsdG86P3N1YmplY3Q9XCIgKyBzdWJqZWN0ICsgXCImYm9keT1cIiArIGJvZHksICdfYmxhbmsnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBPcGVucyB0aGUgc2V0dGluZ3MgZGlhbG9nLlxuICAgICAqL1xuICAgIG15Lm9wZW5TZXR0aW5nc0RpYWxvZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbWVzc2FnZUhhbmRsZXIub3BlblR3b0J1dHRvbkRpYWxvZyhcbiAgICAgICAgICAgICc8aDI+Q29uZmlndXJlIHlvdXIgY29uZmVyZW5jZTwvaDI+JyArXG4gICAgICAgICAgICAgICAgJzxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBpZD1cImluaXRNdXRlZFwiPicgK1xuICAgICAgICAgICAgICAgICdQYXJ0aWNpcGFudHMgam9pbiBtdXRlZDxici8+JyArXG4gICAgICAgICAgICAgICAgJzxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBpZD1cInJlcXVpcmVOaWNrbmFtZXNcIj4nICtcbiAgICAgICAgICAgICAgICAnUmVxdWlyZSBuaWNrbmFtZXM8YnIvPjxici8+JyArXG4gICAgICAgICAgICAgICAgJ1NldCBhIHNlY3JldCBrZXkgdG8gbG9jayB5b3VyIHJvb206JyArXG4gICAgICAgICAgICAgICAgJzxpbnB1dCBpZD1cImxvY2tLZXlcIiB0eXBlPVwidGV4dFwiIHBsYWNlaG9sZGVyPVwieW91ciBzaGFyZWQga2V5XCInICtcbiAgICAgICAgICAgICAgICAnYXV0b2ZvY3VzPicsXG4gICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICBcIlNhdmVcIixcbiAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9ja0tleScpLmZvY3VzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKGUsIHYpIHtcbiAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoJCgnI2luaXRNdXRlZCcpLmlzKFwiOmNoZWNrZWRcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGl0IGlzIGNoZWNrZWRcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICgkKCcjcmVxdWlyZU5pY2tuYW1lcycpLmlzKFwiOmNoZWNrZWRcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGl0IGlzIGNoZWNrZWRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICB2YXIgbG9ja0tleSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsb2NrS2V5Jyk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGxvY2tLZXkudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFNoYXJlZEtleShsb2NrS2V5LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2tSb29tKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGVzIHRoZSBhcHBsaWNhdGlvbiBpbiBhbmQgb3V0IG9mIGZ1bGwgc2NyZWVuIG1vZGVcbiAgICAgKiAoYS5rLmEuIHByZXNlbnRhdGlvbiBtb2RlIGluIENocm9tZSkuXG4gICAgICovXG4gICAgbXkudG9nZ2xlRnVsbFNjcmVlbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZnNFbGVtZW50ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuXG4gICAgICAgIGlmICghZG9jdW1lbnQubW96RnVsbFNjcmVlbiAmJiAhZG9jdW1lbnQud2Via2l0SXNGdWxsU2NyZWVuKSB7XG4gICAgICAgICAgICAvL0VudGVyIEZ1bGwgU2NyZWVuXG4gICAgICAgICAgICBpZiAoZnNFbGVtZW50Lm1velJlcXVlc3RGdWxsU2NyZWVuKSB7XG4gICAgICAgICAgICAgICAgZnNFbGVtZW50Lm1velJlcXVlc3RGdWxsU2NyZWVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBmc0VsZW1lbnQud2Via2l0UmVxdWVzdEZ1bGxTY3JlZW4oRWxlbWVudC5BTExPV19LRVlCT0FSRF9JTlBVVCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvL0V4aXQgRnVsbCBTY3JlZW5cbiAgICAgICAgICAgIGlmIChkb2N1bWVudC5tb3pDYW5jZWxGdWxsU2NyZWVuKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQubW96Q2FuY2VsRnVsbFNjcmVlbigpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC53ZWJraXRDYW5jZWxGdWxsU2NyZWVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIGxvY2sgYnV0dG9uIHN0YXRlLlxuICAgICAqL1xuICAgIG15LnVwZGF0ZUxvY2tCdXR0b24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgYnV0dG9uQ2xpY2soXCIjbG9ja0ljb25cIiwgXCJpY29uLXNlY3VyaXR5IGljb24tc2VjdXJpdHktbG9ja2VkXCIpO1xuICAgIH07XG5cbiAgICAvLyBTaG93cyBvciBoaWRlcyB0aGUgJ3JlY29yZGluZycgYnV0dG9uLlxuICAgIG15LnNob3dSZWNvcmRpbmdCdXR0b24gPSBmdW5jdGlvbiAoc2hvdykge1xuICAgICAgICBpZiAoIWNvbmZpZy5lbmFibGVSZWNvcmRpbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzaG93KSB7XG4gICAgICAgICAgICAkKCcjcmVjb3JkaW5nJykuY3NzKHtkaXNwbGF5OiBcImlubGluZVwifSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAkKCcjcmVjb3JkaW5nJykuY3NzKHtkaXNwbGF5OiBcIm5vbmVcIn0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vIFRvZ2dsZSB0aGUgc3RhdGUgb2YgdGhlIHJlY29yZGluZyBidXR0b25cbiAgICBteS50b2dnbGVSZWNvcmRpbmdCdXR0b25TdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkKCcjcmVjb3JkQnV0dG9uJykudG9nZ2xlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgIH07XG5cbiAgICAvLyBTaG93cyBvciBoaWRlcyBTSVAgY2FsbHMgYnV0dG9uXG4gICAgbXkuc2hvd1NpcENhbGxCdXR0b24gPSBmdW5jdGlvbihzaG93KXtcbiAgICAgICAgaWYgKGNvbmZpZy5ob3N0cy5jYWxsX2NvbnRyb2wgJiYgc2hvdykge1xuICAgICAgICAgICAgJCgnI3NpcENhbGxCdXR0b24nKS5jc3Moe2Rpc3BsYXk6IFwiaW5saW5lXCJ9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJyNzaXBDYWxsQnV0dG9uJykuY3NzKHtkaXNwbGF5OiBcIm5vbmVcIn0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBteTtcbn0oVG9vbGJhciB8fCB7fSkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRvb2xiYXI7XG4iLCJ2YXIgVG9vbGJhciA9IHJlcXVpcmUoXCIuL3Rvb2xiYXJcIik7XG5cbnZhciBUb29sYmFyVG9nZ2xlciA9IChmdW5jdGlvbihteSkge1xuICAgIHZhciB0b29sYmFyVGltZW91dE9iamVjdCxcbiAgICAgICAgdG9vbGJhclRpbWVvdXQgPSBpbnRlcmZhY2VDb25maWcuSU5JVElBTF9UT09MQkFSX1RJTUVPVVQ7XG5cbiAgICAvKipcbiAgICAgKiBTaG93cyB0aGUgbWFpbiB0b29sYmFyLlxuICAgICAqL1xuICAgIG15LnNob3dUb29sYmFyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBoZWFkZXIgPSAkKFwiI2hlYWRlclwiKSxcbiAgICAgICAgICAgIGJvdHRvbVRvb2xiYXIgPSAkKFwiI2JvdHRvbVRvb2xiYXJcIik7XG4gICAgICAgIGlmICghaGVhZGVyLmlzKCc6dmlzaWJsZScpIHx8ICFib3R0b21Ub29sYmFyLmlzKFwiOnZpc2libGVcIikpIHtcbiAgICAgICAgICAgIGhlYWRlci5zaG93KFwic2xpZGVcIiwgeyBkaXJlY3Rpb246IFwidXBcIiwgZHVyYXRpb246IDMwMH0pO1xuICAgICAgICAgICAgJCgnI3N1YmplY3QnKS5hbmltYXRlKHt0b3A6IFwiKz00MFwifSwgMzAwKTtcbiAgICAgICAgICAgIGlmKCFib3R0b21Ub29sYmFyLmlzKFwiOnZpc2libGVcIikpIHtcbiAgICAgICAgICAgICAgICBib3R0b21Ub29sYmFyLnNob3coXCJzbGlkZVwiLCB7ZGlyZWN0aW9uOiBcInJpZ2h0XCIsZHVyYXRpb246IDMwMH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodG9vbGJhclRpbWVvdXRPYmplY3QpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodG9vbGJhclRpbWVvdXRPYmplY3QpO1xuICAgICAgICAgICAgICAgIHRvb2xiYXJUaW1lb3V0T2JqZWN0ID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRvb2xiYXJUaW1lb3V0T2JqZWN0ID0gc2V0VGltZW91dChoaWRlVG9vbGJhciwgdG9vbGJhclRpbWVvdXQpO1xuICAgICAgICAgICAgdG9vbGJhclRpbWVvdXQgPSBpbnRlcmZhY2VDb25maWcuVE9PTEJBUl9USU1FT1VUO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKFhNUFBBY3RpdmF0b3IuaXNGb2N1cygpKVxuICAgICAgICB7XG4vLyAgICAgICAgICAgIFRPRE86IEVuYWJsZSBzZXR0aW5ncyBmdW5jdGlvbmFsaXR5LiBOZWVkIHRvIHVuY29tbWVudCB0aGUgc2V0dGluZ3MgYnV0dG9uIGluIGluZGV4Lmh0bWwuXG4vLyAgICAgICAgICAgICQoJyNzZXR0aW5nc0J1dHRvbicpLmNzcyh7dmlzaWJpbGl0eTpcInZpc2libGVcIn0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2hvdy9oaWRlIGRlc2t0b3Agc2hhcmluZyBidXR0b25cbiAgICAgICAgc2hvd0Rlc2t0b3BTaGFyaW5nQnV0dG9uKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEhpZGVzIHRoZSB0b29sYmFyLlxuICAgICAqL1xuICAgIHZhciBoaWRlVG9vbGJhciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGhlYWRlciA9ICQoXCIjaGVhZGVyXCIpLFxuICAgICAgICAgICAgYm90dG9tVG9vbGJhciA9ICQoXCIjYm90dG9tVG9vbGJhclwiKTtcbiAgICAgICAgdmFyIGlzVG9vbGJhckhvdmVyID0gZmFsc2U7XG4gICAgICAgIGhlYWRlci5maW5kKCcqJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgaWQgPSAkKHRoaXMpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBpZiAoJChcIiNcIiArIGlkICsgXCI6aG92ZXJcIikubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGlzVG9vbGJhckhvdmVyID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmKCQoXCIjYm90dG9tVG9vbGJhcjpob3ZlclwiKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaXNUb29sYmFySG92ZXIgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY2xlYXJUaW1lb3V0KHRvb2xiYXJUaW1lb3V0T2JqZWN0KTtcbiAgICAgICAgdG9vbGJhclRpbWVvdXRPYmplY3QgPSBudWxsO1xuXG4gICAgICAgIGlmICghaXNUb29sYmFySG92ZXIpIHtcbiAgICAgICAgICAgIGhlYWRlci5oaWRlKFwic2xpZGVcIiwgeyBkaXJlY3Rpb246IFwidXBcIiwgZHVyYXRpb246IDMwMH0pO1xuICAgICAgICAgICAgJCgnI3N1YmplY3QnKS5hbmltYXRlKHt0b3A6IFwiLT00MFwifSwgMzAwKTtcbiAgICAgICAgICAgIGlmKCQoXCIjcmVtb3RlVmlkZW9zXCIpLmhhc0NsYXNzKFwiaGlkZGVuXCIpKSB7XG4gICAgICAgICAgICAgICAgYm90dG9tVG9vbGJhci5oaWRlKFwic2xpZGVcIiwge2RpcmVjdGlvbjogXCJyaWdodFwiLCBkdXJhdGlvbjogMzAwfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0b29sYmFyVGltZW91dE9iamVjdCA9IHNldFRpbWVvdXQoaGlkZVRvb2xiYXIsIHRvb2xiYXJUaW1lb3V0KTtcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIC8qKlxuICAgICAqIERvY2tzL3VuZG9ja3MgdGhlIHRvb2xiYXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaXNEb2NrIGluZGljYXRlcyB3aGF0IG9wZXJhdGlvbiB0byBwZXJmb3JtXG4gICAgICovXG4gICAgbXkuZG9ja1Rvb2xiYXIgPSBmdW5jdGlvbihpc0RvY2spIHtcbiAgICAgICAgaWYgKGlzRG9jaykge1xuICAgICAgICAgICAgLy8gRmlyc3QgbWFrZSBzdXJlIHRoZSB0b29sYmFyIGlzIHNob3duLlxuICAgICAgICAgICAgaWYgKCEkKCcjaGVhZGVyJykuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICAgICBUb29sYmFyVG9nZ2xlci5zaG93VG9vbGJhcigpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUaGVuIGNsZWFyIHRoZSB0aW1lIG91dCwgdG8gZG9jayB0aGUgdG9vbGJhci5cbiAgICAgICAgICAgIGlmICh0b29sYmFyVGltZW91dE9iamVjdCkge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0b29sYmFyVGltZW91dE9iamVjdCk7XG4gICAgICAgICAgICAgICAgdG9vbGJhclRpbWVvdXRPYmplY3QgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKCEkKCcjaGVhZGVyJykuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICAgICBUb29sYmFyVG9nZ2xlci5zaG93VG9vbGJhcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdG9vbGJhclRpbWVvdXRPYmplY3QgPSBzZXRUaW1lb3V0KGhpZGVUb29sYmFyLCB0b29sYmFyVGltZW91dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICByZXR1cm4gbXk7XG59KFRvb2xiYXJUb2dnbGVyIHx8IHt9KSk7XG5cbm1vZHVsZS5leHBvcnRzID0gVG9vbGJhclRvZ2dsZXI7XG4iLCJ2YXIgUlRDQnJvd3NlclR5cGUgPSB7XG4gICAgUlRDX0JST1dTRVJfQ0hST01FOiBcInJ0Y19icm93c2VyLmNocm9tZVwiLFxuXG4gICAgUlRDX0JST1dTRVJfRklSRUZPWDogXCJydGNfYnJvd3Nlci5maXJlZm94XCJcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUlRDQnJvd3NlclR5cGU7IiwidmFyIFN0cmVhbUV2ZW50VHlwZXMgPSB7XG4gICAgRVZFTlRfVFlQRV9MT0NBTF9DUkVBVEVEOiBcInN0cmVhbS5sb2NhbF9jcmVhdGVkXCIsXG5cbiAgICBFVkVOVF9UWVBFX0xPQ0FMX0VOREVEOiBcInN0cmVhbS5sb2NhbF9lbmRlZFwiLFxuXG4gICAgRVZFTlRfVFlQRV9SRU1PVEVfQ1JFQVRFRDogXCJzdHJlYW0ucmVtb3RlX2NyZWF0ZWRcIixcblxuICAgIEVWRU5UX1RZUEVfUkVNT1RFX0VOREVEOiBcInN0cmVhbS5yZW1vdGVfZW5kZWRcIlxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdHJlYW1FdmVudFR5cGVzOyIsIi8qKlxuICogQ3JlYXRlZCBieSBocmlzdG8gb24gMTAvMjkvMTQuXG4gKi9cbnZhciBYTVBQRXZlbnRzID0ge1xuICAgIENPTkZFUkVOQ0VfQ0VSQVRFRDogXCJ4bXBwLmNvbmZlcmVuY2VDcmVhdGVkLmppbmdsZVwiLFxuICAgIENBTExfVEVSTUlOQVRFRDogXCJ4bXBwLmNhbGx0ZXJtaW5hdGVkLmppbmdsZVwiLFxuICAgIENBTExfSU5DT01JTkc6IFwieG1wcC5jYWxsaW5jb21pbmcuamluZ2xlXCIsXG4gICAgRElTUE9TRV9DT05GRVJFTkNFOiBcInhtcHAuZGlzcG9jZV9jb25mZXJuY2VcIixcbiAgICBESVNQTEFZX05BTUVfQ0hBTkdFRDogXCJ4bXBwLmRpc3BsYXlfbmFtZV9jaGFuZ2VkXCJcblxufTtcbm1vZHVsZS5leHBvcnRzID0gWE1QUEV2ZW50czsiLCJ2YXIgUm9vbU5hbWVHZW5lcmF0b3IgPSBmdW5jdGlvbihteSkge1xuXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIG5ldyBSb29tTmFtZUdlbmVyYXRvciBvYmplY3QuXG4gICAgICogQGNvbnN0cnVjdG9yIGNvbnN0cnVjdHMgbmV3IFJvb21OYW1lR2VuZXJhdG9yIG9iamVjdC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBSb29tTmFtZUdlbmVyYXRvclByb3RvKClcbiAgICB7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IHNlcGFyYXRvciB0aGUgd29yZHMgaW4gdGhlIHJvb20gbmFtZVxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgdmFyIERFRkFVTFRfU0VQQVJBVE9SID0gXCItXCI7XG5cbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IG51bWJlciBvZiB3b3JkcyBpbiB0aGUgcm9vbSBuYW1lLlxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgdmFyIE5VTUJFUl9PRl9XT1JEUyA9IDM7XG5cblxuICAgIC8qKlxuICAgICAqIFRoZSBsaXN0IHdpdGggd29yZHMuXG4gICAgICogQHR5cGUge3N0cmluZ1tdfVxuICAgICAqL1xuICAgIHZhciB3b3JkcyA9IFtcbiAgICAgICAgXCJkZWZpbml0ZVwiLCBcImluZGVmaW5pdGVcIiwgXCJhcnRpY2xlc1wiLCBcIm5hbWVcIiwgXCJwcmVwb3NpdGlvblwiLCBcImhlbHBcIiwgXCJ2ZXJ5XCIsIFwidG9cIiwgXCJ0aHJvdWdoXCIsIFwiYW5kXCIsIFwianVzdFwiLFxuICAgICAgICBcImFcIiwgXCJmb3JtXCIsIFwiaW5cIiwgXCJzZW50ZW5jZVwiLCBcImlzXCIsIFwiZ3JlYXRcIiwgXCJpdFwiLCBcInRoaW5rXCIsIFwieW91XCIsIFwic2F5XCIsIFwidGhhdFwiLCBcImhlbHBcIiwgXCJoZVwiLCBcImxvd1wiLCBcIndhc1wiLFxuICAgICAgICBcImxpbmVcIiwgXCJmb3JcIiwgXCJkaWZmZXJcIiwgXCJvblwiLCBcInR1cm5cIiwgXCJhcmVcIiwgXCJjYXVzZVwiLCBcIndpdGhcIiwgXCJtdWNoXCIsIFwiYXNcIiwgXCJtZWFuXCIsIFwiYmVmb3JlXCIsIFwiaGlzXCIsIFwibW92ZVwiLFxuICAgICAgICBcInRoZXlcIiwgXCJyaWdodFwiLCBcImJlXCIsIFwiYm95XCIsIFwiYXRcIiwgXCJvbGRcIiwgXCJvbmVcIiwgXCJ0b29cIiwgXCJoYXZlXCIsIFwic2FtZVwiLCBcInRoaXNcIiwgXCJ0ZWxsXCIsIFwiZnJvbVwiLCBcImRvZXNcIiwgXCJvclwiLFxuICAgICAgICBcInNldFwiLCBcImhhZFwiLCBcInRocmVlXCIsIFwiYnlcIiwgXCJ3YW50XCIsIFwiaG90XCIsIFwiYWlyXCIsIFwid29yZFwiLCBcIndlbGxcIiwgXCJidXRcIiwgXCJhbHNvXCIsIFwid2hhdFwiLCBcInBsYXlcIiwgXCJzb21lXCIsIFwic21hbGxcIixcbiAgICAgICAgXCJ3ZVwiLCBcImVuZFwiLCBcImNhblwiLCBcInB1dFwiLCBcIm91dFwiLCBcImhvbWVcIiwgXCJvdGhlclwiLCBcInJlYWRcIiwgXCJ3ZXJlXCIsIFwiaGFuZFwiLCBcImFsbFwiLCBcInBvcnRcIiwgXCJ0aGVyZVwiLCBcImxhcmdlXCIsXG4gICAgICAgIFwid2hlblwiLCBcInNwZWxsXCIsIFwidXBcIiwgXCJhZGRcIiwgXCJ1c2VcIiwgXCJldmVuXCIsIFwieW91clwiLCBcImxhbmRcIiwgXCJob3dcIiwgXCJoZXJlXCIsIFwic2FpZFwiLCBcIm11c3RcIiwgXCJhblwiLCBcImJpZ1wiLCBcImVhY2hcIixcbiAgICAgICAgXCJoaWdoXCIsIFwic2hlXCIsIFwic3VjaFwiLCBcIndoaWNoXCIsIFwiZm9sbG93XCIsIFwiZG9cIiwgXCJhY3RcIiwgXCJ0aGVpclwiLCBcIndoeVwiLCBcInRpbWVcIiwgXCJhc2tcIiwgXCJpZlwiLCBcIm1lblwiLCBcIndpbGxcIiwgXCJjaGFuZ2VcIixcbiAgICAgICAgXCJ3YXlcIiwgXCJ3ZW50XCIsIFwiYWJvdXRcIiwgXCJsaWdodFwiLCBcIm1hbnlcIiwgXCJraW5kXCIsIFwidGhlblwiLCBcIm9mZlwiLCBcInRoZW1cIiwgXCJuZWVkXCIsIFwid3JpdGVcIiwgXCJob3VzZVwiLCBcIndvdWxkXCIsXG4gICAgICAgIFwicGljdHVyZVwiLCBcImxpa2VcIiwgXCJ0cnlcIiwgXCJzb1wiLCBcInVzXCIsIFwidGhlc2VcIiwgXCJhZ2FpblwiLCBcImhlclwiLCBcImFuaW1hbFwiLCBcImxvbmdcIiwgXCJwb2ludFwiLCBcIm1ha2VcIiwgXCJtb3RoZXJcIixcbiAgICAgICAgXCJ0aGluZ1wiLCBcIndvcmxkXCIsIFwic2VlXCIsIFwibmVhclwiLCBcImhpbVwiLCBcImJ1aWxkXCIsIFwidHdvXCIsIFwic2VsZlwiLCBcImhhc1wiLCBcImVhcnRoXCIsIFwibG9va1wiLCBcImZhdGhlclwiLCBcIm1vcmVcIiwgXCJoZWFkXCIsXG4gICAgICAgIFwiZGF5XCIsIFwic3RhbmRcIiwgXCJjb3VsZFwiLCBcIm93blwiLCBcImdvXCIsIFwicGFnZVwiLCBcImNvbWVcIiwgXCJzaG91bGRcIiwgXCJkaWRcIiwgXCJjb3VudHJ5XCIsIFwibnVtYmVyXCIsIFwiZm91bmRcIiwgXCJzb3VuZFwiLFxuICAgICAgICBcImFuc3dlclwiLCBcIm5vXCIsIFwic2Nob29sXCIsIFwibW9zdFwiLCBcImdyb3dcIiwgXCJwZW9wbGVcIiwgXCJzdHVkeVwiLCBcIm15XCIsIFwic3RpbGxcIiwgXCJvdmVyXCIsIFwibGVhcm5cIiwgXCJrbm93XCIsIFwicGxhbnRcIixcbiAgICAgICAgXCJ3YXRlclwiLCBcImNvdmVyXCIsIFwidGhhblwiLCBcImZvb2RcIiwgXCJjYWxsXCIsIFwic3VuXCIsIFwiZmlyc3RcIiwgXCJmb3VyXCIsIFwid2hvXCIsIFwiYmV0d2VlblwiLCBcIm1heVwiLCBcInN0YXRlXCIsIFwiZG93blwiLFxuICAgICAgICBcImtlZXBcIiwgXCJzaWRlXCIsIFwiZXllXCIsIFwiYmVlblwiLCBcIm5ldmVyXCIsIFwibm93XCIsIFwibGFzdFwiLCBcImZpbmRcIiwgXCJsZXRcIiwgXCJhbnlcIiwgXCJ0aG91Z2h0XCIsIFwibmV3XCIsIFwiY2l0eVwiLCBcIndvcmtcIixcbiAgICAgICAgXCJ0cmVlXCIsIFwicGFydFwiLCBcImNyb3NzXCIsIFwidGFrZVwiLCBcImZhcm1cIiwgXCJnZXRcIiwgXCJoYXJkXCIsIFwicGxhY2VcIiwgXCJzdGFydFwiLCBcIm1hZGVcIiwgXCJtaWdodFwiLCBcImxpdmVcIiwgXCJzdG9yeVwiLFxuICAgICAgICBcIndoZXJlXCIsIFwic2F3XCIsIFwiYWZ0ZXJcIiwgXCJmYXJcIiwgXCJiYWNrXCIsIFwic2VhXCIsIFwibGl0dGxlXCIsIFwiZHJhd1wiLCBcIm9ubHlcIiwgXCJsZWZ0XCIsIFwicm91bmRcIiwgXCJsYXRlXCIsIFwibWFuXCIsIFwicnVuXCIsXG4gICAgICAgIFwieWVhclwiLCBcImRvbid0XCIsIFwiY2FtZVwiLCBcIndoaWxlXCIsIFwic2hvd1wiLCBcInByZXNzXCIsIFwiZXZlcnlcIiwgXCJjbG9zZVwiLCBcImdvb2RcIiwgXCJuaWdodFwiLCBcIm1lXCIsIFwicmVhbFwiLCBcImdpdmVcIixcbiAgICAgICAgXCJsaWZlXCIsIFwib3VyXCIsIFwiZmV3XCIsIFwidW5kZXJcIiwgXCJub3J0aFwiLCBcIm9wZW5cIiwgXCJ0ZW5cIiwgXCJzZWVtXCIsIFwic2ltcGxlXCIsIFwidG9nZXRoZXJcIiwgXCJzZXZlcmFsXCIsIFwibmV4dFwiLCBcInZvd2VsXCIsXG4gICAgICAgIFwid2hpdGVcIiwgXCJ0b3dhcmRcIiwgXCJjaGlsZHJlblwiLCBcIndhclwiLCBcImJlZ2luXCIsIFwibGF5XCIsIFwiZ290XCIsIFwiYWdhaW5zdFwiLCBcIndhbGtcIiwgXCJwYXR0ZXJuXCIsIFwiZXhhbXBsZVwiLCBcInNsb3dcIixcbiAgICAgICAgXCJlYXNlXCIsIFwiY2VudGVyXCIsIFwicGFwZXJcIiwgXCJsb3ZlXCIsIFwiZ3JvdXBcIiwgXCJwZXJzb25cIiwgXCJhbHdheXNcIiwgXCJtb25leVwiLCBcIm11c2ljXCIsIFwic2VydmVcIiwgXCJ0aG9zZVwiLCBcImFwcGVhclwiLFxuICAgICAgICBcImJvdGhcIiwgXCJyb2FkXCIsIFwibWFya1wiLCBcIm1hcFwiLCBcIm9mdGVuXCIsIFwicmFpblwiLCBcImxldHRlclwiLCBcInJ1bGVcIiwgXCJ1bnRpbFwiLCBcImdvdmVyblwiLCBcIm1pbGVcIiwgXCJwdWxsXCIsIFwicml2ZXJcIixcbiAgICAgICAgXCJjb2xkXCIsIFwiY2FyXCIsIFwibm90aWNlXCIsIFwiZmVldFwiLCBcInZvaWNlXCIsIFwiY2FyZVwiLCBcInVuaXRcIiwgXCJzZWNvbmRcIiwgXCJwb3dlclwiLCBcImJvb2tcIiwgXCJ0b3duXCIsIFwiY2FycnlcIiwgXCJmaW5lXCIsXG4gICAgICAgIFwidG9va1wiLCBcImNlcnRhaW5cIiwgXCJzY2llbmNlXCIsIFwiZmx5XCIsIFwiZWF0XCIsIFwiZmFsbFwiLCBcInJvb21cIiwgXCJsZWFkXCIsIFwiZnJpZW5kXCIsIFwiY3J5XCIsIFwiYmVnYW5cIiwgXCJkYXJrXCIsIFwiaWRlYVwiLFxuICAgICAgICBcIm1hY2hpbmVcIiwgXCJmaXNoXCIsIFwibm90ZVwiLCBcIm1vdW50YWluXCIsIFwid2FpdFwiLCBcInN0b3BcIiwgXCJwbGFuXCIsIFwib25jZVwiLCBcImZpZ3VyZVwiLCBcImJhc2VcIiwgXCJzdGFyXCIsIFwiaGVhclwiLCBcImJveFwiLFxuICAgICAgICBcImhvcnNlXCIsIFwibm91blwiLCBcImN1dFwiLCBcImZpZWxkXCIsIFwic3VyZVwiLCBcInJlc3RcIiwgXCJ3YXRjaFwiLCBcImNvcnJlY3RcIiwgXCJjb2xvclwiLCBcImFibGVcIiwgXCJmYWNlXCIsIFwicG91bmRcIiwgXCJ3b29kXCIsXG4gICAgICAgIFwiZG9uZVwiLCBcIm1haW5cIiwgXCJiZWF1dHlcIiwgXCJlbm91Z2hcIiwgXCJkcml2ZVwiLCBcInBsYWluXCIsIFwic3Rvb2RcIiwgXCJnaXJsXCIsIFwiY29udGFpblwiLCBcInVzdWFsXCIsIFwiZnJvbnRcIiwgXCJ5b3VuZ1wiLFxuICAgICAgICBcInRlYWNoXCIsIFwicmVhZHlcIiwgXCJ3ZWVrXCIsIFwiYWJvdmVcIiwgXCJmaW5hbFwiLCBcImV2ZXJcIiwgXCJnYXZlXCIsIFwicmVkXCIsIFwiZ3JlZW5cIiwgXCJsaXN0XCIsIFwib2hcIiwgXCJ0aG91Z2hcIiwgXCJxdWlja1wiLFxuICAgICAgICBcImZlZWxcIiwgXCJkZXZlbG9wXCIsIFwidGFsa1wiLCBcIm9jZWFuXCIsIFwiYmlyZFwiLCBcIndhcm1cIiwgXCJzb29uXCIsIFwiZnJlZVwiLCBcImJvZHlcIiwgXCJtaW51dGVcIiwgXCJkb2dcIiwgXCJzdHJvbmdcIiwgXCJmYW1pbHlcIixcbiAgICAgICAgXCJzcGVjaWFsXCIsIFwiZGlyZWN0XCIsIFwibWluZFwiLCBcInBvc2VcIiwgXCJiZWhpbmRcIiwgXCJsZWF2ZVwiLCBcImNsZWFyXCIsIFwic29uZ1wiLCBcInRhaWxcIiwgXCJtZWFzdXJlXCIsIFwicHJvZHVjZVwiLCBcImRvb3JcIixcbiAgICAgICAgXCJmYWN0XCIsIFwicHJvZHVjdFwiLCBcInN0cmVldFwiLCBcImJsYWNrXCIsIFwiaW5jaFwiLCBcInNob3J0XCIsIFwibXVsdGlwbHlcIiwgXCJudW1lcmFsXCIsIFwibm90aGluZ1wiLCBcImNsYXNzXCIsIFwiY291cnNlXCIsIFwid2luZFwiLFxuICAgICAgICBcInN0YXlcIiwgXCJxdWVzdGlvblwiLCBcIndoZWVsXCIsIFwiaGFwcGVuXCIsIFwiZnVsbFwiLCBcImNvbXBsZXRlXCIsIFwiZm9yY2VcIiwgXCJzaGlwXCIsIFwiYmx1ZVwiLCBcImFyZWFcIiwgXCJvYmplY3RcIiwgXCJoYWxmXCIsXG4gICAgICAgIFwiZGVjaWRlXCIsIFwicm9ja1wiLCBcInN1cmZhY2VcIiwgXCJvcmRlclwiLCBcImRlZXBcIiwgXCJmaXJlXCIsIFwibW9vblwiLCBcInNvdXRoXCIsIFwiaXNsYW5kXCIsIFwicHJvYmxlbVwiLCBcImZvb3RcIiwgXCJwaWVjZVwiLFxuICAgICAgICBcInN5c3RlbVwiLCBcInRvbGRcIiwgXCJidXN5XCIsIFwia25ld1wiLCBcInRlc3RcIiwgXCJwYXNzXCIsIFwicmVjb3JkXCIsIFwic2luY2VcIiwgXCJib2F0XCIsIFwidG9wXCIsIFwiY29tbW9uXCIsIFwid2hvbGVcIiwgXCJnb2xkXCIsXG4gICAgICAgIFwia2luZ1wiLCBcInBvc3NpYmxlXCIsIFwic3BhY2VcIiwgXCJwbGFuZVwiLCBcImhlYXJkXCIsIFwic3RlYWRcIiwgXCJiZXN0XCIsIFwiZHJ5XCIsIFwiaG91clwiLCBcIndvbmRlclwiLCBcImJldHRlclwiLCBcImxhdWdoXCIsXG4gICAgICAgIFwidHJ1ZVwiLCBcInRob3VzYW5kXCIsIFwiZHVyaW5nXCIsIFwiYWdvXCIsIFwiaHVuZHJlZFwiLCBcInJhblwiLCBcImZpdmVcIiwgXCJjaGVja1wiLCBcInJlbWVtYmVyXCIsIFwiZ2FtZVwiLCBcInN0ZXBcIiwgXCJzaGFwZVwiLFxuICAgICAgICBcImVhcmx5XCIsIFwiZXF1YXRlXCIsIFwiaG9sZFwiLCBcImhvdFwiLCBcIndlc3RcIiwgXCJtaXNzXCIsIFwiZ3JvdW5kXCIsIFwiYnJvdWdodFwiLCBcImludGVyZXN0XCIsIFwiaGVhdFwiLCBcInJlYWNoXCIsIFwic25vd1wiLFxuICAgICAgICBcImZhc3RcIiwgXCJ0aXJlXCIsIFwidmVyYlwiLCBcImJyaW5nXCIsIFwic2luZ1wiLCBcInllc1wiLCBcImxpc3RlblwiLCBcImRpc3RhbnRcIiwgXCJzaXhcIiwgXCJmaWxsXCIsIFwidGFibGVcIiwgXCJlYXN0XCIsIFwidHJhdmVsXCIsXG4gICAgICAgIFwicGFpbnRcIiwgXCJsZXNzXCIsIFwibGFuZ3VhZ2VcIiwgXCJtb3JuaW5nXCIsIFwiYW1vbmdcIiwgXCJncmFuZFwiLCBcImNhdFwiLCBcImJhbGxcIiwgXCJjZW50dXJ5XCIsIFwieWV0XCIsIFwiY29uc2lkZXJcIiwgXCJ3YXZlXCIsXG4gICAgICAgIFwidHlwZVwiLCBcImRyb3BcIiwgXCJsYXdcIiwgXCJoZWFydFwiLCBcImJpdFwiLCBcImFtXCIsIFwiY29hc3RcIiwgXCJwcmVzZW50XCIsIFwiY29weVwiLCBcImhlYXZ5XCIsIFwicGhyYXNlXCIsIFwiZGFuY2VcIiwgXCJzaWxlbnRcIixcbiAgICAgICAgXCJlbmdpbmVcIiwgXCJ0YWxsXCIsIFwicG9zaXRpb25cIiwgXCJzYW5kXCIsIFwiYXJtXCIsIFwic29pbFwiLCBcIndpZGVcIiwgXCJyb2xsXCIsIFwic2FpbFwiLCBcInRlbXBlcmF0dXJlXCIsIFwibWF0ZXJpYWxcIiwgXCJmaW5nZXJcIixcbiAgICAgICAgXCJzaXplXCIsIFwiaW5kdXN0cnlcIiwgXCJ2YXJ5XCIsIFwidmFsdWVcIiwgXCJzZXR0bGVcIiwgXCJmaWdodFwiLCBcInNwZWFrXCIsIFwibGllXCIsIFwid2VpZ2h0XCIsIFwiYmVhdFwiLCBcImdlbmVyYWxcIiwgXCJleGNpdGVcIixcbiAgICAgICAgXCJpY2VcIiwgXCJuYXR1cmFsXCIsIFwibWF0dGVyXCIsIFwidmlld1wiLCBcImNpcmNsZVwiLCBcInNlbnNlXCIsIFwicGFpclwiLCBcImVhclwiLCBcImluY2x1ZGVcIiwgXCJlbHNlXCIsIFwiZGl2aWRlXCIsIFwicXVpdGVcIixcbiAgICAgICAgXCJzeWxsYWJsZVwiLCBcImJyb2tlXCIsIFwiZmVsdFwiLCBcImNhc2VcIiwgXCJwZXJoYXBzXCIsIFwibWlkZGxlXCIsIFwicGlja1wiLCBcImtpbGxcIiwgXCJzdWRkZW5cIiwgXCJzb25cIiwgXCJjb3VudFwiLCBcImxha2VcIixcbiAgICAgICAgXCJzcXVhcmVcIiwgXCJtb21lbnRcIiwgXCJyZWFzb25cIiwgXCJzY2FsZVwiLCBcImxlbmd0aFwiLCBcImxvdWRcIiwgXCJyZXByZXNlbnRcIiwgXCJzcHJpbmdcIiwgXCJhcnRcIiwgXCJvYnNlcnZlXCIsIFwic3ViamVjdFwiLFxuICAgICAgICBcImNoaWxkXCIsIFwicmVnaW9uXCIsIFwic3RyYWlnaHRcIiwgXCJlbmVyZ3lcIiwgXCJjb25zb25hbnRcIiwgXCJodW50XCIsIFwibmF0aW9uXCIsIFwicHJvYmFibGVcIiwgXCJkaWN0aW9uYXJ5XCIsIFwiYmVkXCIsIFwibWlsa1wiLFxuICAgICAgICBcImJyb3RoZXJcIiwgXCJzcGVlZFwiLCBcImVnZ1wiLCBcIm1ldGhvZFwiLCBcInJpZGVcIiwgXCJvcmdhblwiLCBcImNlbGxcIiwgXCJwYXlcIiwgXCJiZWxpZXZlXCIsIFwiYWdlXCIsIFwiZnJhY3Rpb25cIiwgXCJzZWN0aW9uXCIsXG4gICAgICAgIFwiZm9yZXN0XCIsIFwiZHJlc3NcIiwgXCJzaXRcIiwgXCJjbG91ZFwiLCBcInJhY2VcIiwgXCJzdXJwcmlzZVwiLCBcIndpbmRvd1wiLCBcInF1aWV0XCIsIFwic3RvcmVcIiwgXCJzdG9uZVwiLCBcInN1bW1lclwiLCBcInRpbnlcIixcbiAgICAgICAgXCJ0cmFpblwiLCBcImNsaW1iXCIsIFwic2xlZXBcIiwgXCJjb29sXCIsIFwicHJvdmVcIiwgXCJkZXNpZ25cIiwgXCJsb25lXCIsIFwicG9vclwiLCBcImxlZ1wiLCBcImxvdFwiLCBcImV4ZXJjaXNlXCIsIFwiZXhwZXJpbWVudFwiLFxuICAgICAgICBcIndhbGxcIiwgXCJib3R0b21cIiwgXCJjYXRjaFwiLCBcImtleVwiLCBcIm1vdW50XCIsIFwiaXJvblwiLCBcIndpc2hcIiwgXCJzaW5nbGVcIiwgXCJza3lcIiwgXCJzdGlja1wiLCBcImJvYXJkXCIsIFwiZmxhdFwiLCBcImpveVwiLFxuICAgICAgICBcInR3ZW50eVwiLCBcIndpbnRlclwiLCBcInNraW5cIiwgXCJzYXRcIiwgXCJzbWlsZVwiLCBcIndyaXR0ZW5cIiwgXCJjcmVhc2VcIiwgXCJ3aWxkXCIsIFwiaG9sZVwiLCBcImluc3RydW1lbnRcIiwgXCJ0cmFkZVwiLCBcImtlcHRcIixcbiAgICAgICAgXCJtZWxvZHlcIiwgXCJnbGFzc1wiLCBcInRyaXBcIiwgXCJncmFzc1wiLCBcIm9mZmljZVwiLCBcImNvd1wiLCBcInJlY2VpdmVcIiwgXCJqb2JcIiwgXCJyb3dcIiwgXCJlZGdlXCIsIFwibW91dGhcIiwgXCJzaWduXCIsIFwiZXhhY3RcIixcbiAgICAgICAgXCJ2aXNpdFwiLCBcInN5bWJvbFwiLCBcInBhc3RcIiwgXCJkaWVcIiwgXCJzb2Z0XCIsIFwibGVhc3RcIiwgXCJmdW5cIiwgXCJ0cm91YmxlXCIsIFwiYnJpZ2h0XCIsIFwic2hvdXRcIiwgXCJnYXNcIiwgXCJleGNlcHRcIixcbiAgICAgICAgXCJ3ZWF0aGVyXCIsIFwid3JvdGVcIiwgXCJtb250aFwiLCBcInNlZWRcIiwgXCJtaWxsaW9uXCIsIFwidG9uZVwiLCBcImJlYXJcIiwgXCJqb2luXCIsIFwiZmluaXNoXCIsIFwic3VnZ2VzdFwiLCBcImhhcHB5XCIsIFwiY2xlYW5cIixcbiAgICAgICAgXCJob3BlXCIsIFwiYnJlYWtcIiwgXCJmbG93ZXJcIiwgXCJsYWR5XCIsIFwiY2xvdGhlXCIsIFwieWFyZFwiLCBcInN0cmFuZ2VcIiwgXCJyaXNlXCIsIFwiZ29uZVwiLCBcImJhZFwiLCBcImp1bXBcIiwgXCJibG93XCIsIFwiYmFieVwiLFxuICAgICAgICBcIm9pbFwiLCBcImVpZ2h0XCIsIFwiYmxvb2RcIiwgXCJ2aWxsYWdlXCIsIFwidG91Y2hcIiwgXCJtZWV0XCIsIFwiZ3Jld1wiLCBcInJvb3RcIiwgXCJjZW50XCIsIFwiYnV5XCIsIFwibWl4XCIsIFwicmFpc2VcIiwgXCJ0ZWFtXCIsXG4gICAgICAgIFwic29sdmVcIiwgXCJ3aXJlXCIsIFwibWV0YWxcIiwgXCJjb3N0XCIsIFwid2hldGhlclwiLCBcImxvc3RcIiwgXCJwdXNoXCIsIFwiYnJvd25cIiwgXCJzZXZlblwiLCBcIndlYXJcIiwgXCJwYXJhZ3JhcGhcIiwgXCJnYXJkZW5cIixcbiAgICAgICAgXCJ0aGlyZFwiLCBcImVxdWFsXCIsIFwic2hhbGxcIiwgXCJzZW50XCIsIFwiaGVsZFwiLCBcImNob29zZVwiLCBcImhhaXJcIiwgXCJmZWxsXCIsIFwiZGVzY3JpYmVcIiwgXCJmaXRcIiwgXCJjb29rXCIsIFwiZmxvd1wiLCBcImZsb29yXCIsXG4gICAgICAgIFwiZmFpclwiLCBcImVpdGhlclwiLCBcImJhbmtcIiwgXCJyZXN1bHRcIiwgXCJjb2xsZWN0XCIsIFwiYnVyblwiLCBcInNhdmVcIiwgXCJoaWxsXCIsIFwiY29udHJvbFwiLCBcInNhZmVcIiwgXCJkZWNpbWFsXCIsIFwicmFua1wiLFxuICAgICAgICBcIndvcmRcIiwgXCJyZWZlcmVuY2VcIiwgXCJnZW50bGVcIiwgXCJ0cnVja1wiLCBcIndvbWFuXCIsIFwibm9pc2VcIiwgXCJjYXB0YWluXCIsIFwibGV2ZWxcIixcbiAgICAgICAgXCJwcmFjdGljZVwiLCBcImNoYW5jZVwiLCBcInNlcGFyYXRlXCIsIFwiZ2F0aGVyXCIsIFwiZGlmZmljdWx0XCIsIFwic2hvcFwiLCBcImRvY3RvclwiLCBcInN0cmV0Y2hcIiwgXCJwbGVhc2VcIiwgXCJ0aHJvd1wiLFxuICAgICAgICBcInByb3RlY3RcIiwgXCJzaGluZVwiLCBcIm5vb25cIiwgXCJwcm9wZXJ0eVwiLCBcIndob3NlXCIsIFwiY29sdW1uXCIsIFwibG9jYXRlXCIsIFwibW9sZWN1bGVcIiwgXCJyaW5nXCIsIFwic2VsZWN0XCIsIFwiY2hhcmFjdGVyXCIsXG4gICAgICAgIFwid3JvbmdcIiwgXCJpbnNlY3RcIiwgXCJncmF5XCIsIFwiY2F1Z2h0XCIsIFwicmVwZWF0XCIsIFwicGVyaW9kXCIsIFwicmVxdWlyZVwiLCBcImluZGljYXRlXCIsIFwiYnJvYWRcIiwgXCJyYWRpb1wiLCBcInByZXBhcmVcIixcbiAgICAgICAgXCJzcG9rZVwiLCBcInNhbHRcIiwgXCJhdG9tXCIsIFwibm9zZVwiLCBcImh1bWFuXCIsIFwicGx1cmFsXCIsIFwiaGlzdG9yeVwiLCBcImFuZ2VyXCIsIFwiZWZmZWN0XCIsIFwiY2xhaW1cIiwgXCJlbGVjdHJpY1wiLFxuICAgICAgICBcImNvbnRpbmVudFwiLCBcImV4cGVjdFwiLCBcIm94eWdlblwiLCBcImNyb3BcIiwgXCJzdWdhclwiLCBcIm1vZGVyblwiLCBcImRlYXRoXCIsIFwiZWxlbWVudFwiLCBcInByZXR0eVwiLCBcImhpdFwiLCBcInNraWxsXCIsXG4gICAgICAgIFwic3R1ZGVudFwiLCBcIndvbWVuXCIsIFwiY29ybmVyXCIsIFwic2Vhc29uXCIsIFwicGFydHlcIiwgXCJzb2x1dGlvblwiLCBcInN1cHBseVwiLCBcIm1hZ25ldFwiLCBcImJvbmVcIiwgXCJzaWx2ZXJcIiwgXCJyYWlsXCIsXG4gICAgICAgIFwidGhhbmtcIiwgXCJpbWFnaW5lXCIsIFwiYnJhbmNoXCIsIFwicHJvdmlkZVwiLCBcIm1hdGNoXCIsIFwiYWdyZWVcIiwgXCJzdWZmaXhcIiwgXCJ0aHVzXCIsIFwiZXNwZWNpYWxseVwiLCBcImNhcGl0YWxcIiwgXCJmaWdcIixcbiAgICAgICAgXCJ3b24ndFwiLCBcImFmcmFpZFwiLCBcImNoYWlyXCIsIFwiaHVnZVwiLCBcImRhbmdlclwiLCBcInNpc3RlclwiLCBcImZydWl0XCIsIFwic3RlZWxcIiwgXCJyaWNoXCIsIFwiZGlzY3Vzc1wiLCBcInRoaWNrXCIsIFwiZm9yd2FyZFwiLFxuICAgICAgICBcInNvbGRpZXJcIiwgXCJzaW1pbGFyXCIsIFwicHJvY2Vzc1wiLCBcImd1aWRlXCIsIFwib3BlcmF0ZVwiLCBcImV4cGVyaWVuY2VcIiwgXCJndWVzc1wiLCBcInNjb3JlXCIsIFwibmVjZXNzYXJ5XCIsIFwiYXBwbGVcIixcbiAgICAgICAgXCJzaGFycFwiLCBcImJvdWdodFwiLCBcIndpbmdcIiwgXCJsZWRcIiwgXCJjcmVhdGVcIiwgXCJwaXRjaFwiLCBcIm5laWdoYm9yXCIsIFwiY29hdFwiLCBcIndhc2hcIiwgXCJtYXNzXCIsIFwiYmF0XCIsIFwiY2FyZFwiLCBcInJhdGhlclwiLFxuICAgICAgICBcImJhbmRcIiwgXCJjcm93ZFwiLCBcInJvcGVcIiwgXCJjb3JuXCIsIFwic2xpcFwiLCBcImNvbXBhcmVcIiwgXCJ3aW5cIiwgXCJwb2VtXCIsIFwiZHJlYW1cIiwgXCJzdHJpbmdcIiwgXCJldmVuaW5nXCIsIFwiYmVsbFwiLFxuICAgICAgICBcImNvbmRpdGlvblwiLCBcImRlcGVuZFwiLCBcImZlZWRcIiwgXCJtZWF0XCIsIFwidG9vbFwiLCBcInJ1YlwiLCBcInRvdGFsXCIsIFwidHViZVwiLCBcImJhc2ljXCIsIFwiZmFtb3VzXCIsIFwic21lbGxcIiwgXCJkb2xsYXJcIixcbiAgICAgICAgXCJ2YWxsZXlcIiwgXCJzdHJlYW1cIiwgXCJub3JcIiwgXCJmZWFyXCIsIFwiZG91YmxlXCIsIFwic2lnaHRcIiwgXCJzZWF0XCIsIFwidGhpblwiLCBcImFycml2ZVwiLCBcInRyaWFuZ2xlXCIsIFwibWFzdGVyXCIsIFwicGxhbmV0XCIsXG4gICAgICAgIFwidHJhY2tcIiwgXCJodXJyeVwiLCBcInBhcmVudFwiLCBcImNoaWVmXCIsIFwic2hvcmVcIiwgXCJjb2xvbnlcIiwgXCJkaXZpc2lvblwiLCBcImNsb2NrXCIsIFwic2hlZXRcIiwgXCJtaW5lXCIsIFwic3Vic3RhbmNlXCIsIFwidGllXCIsXG4gICAgICAgIFwiZmF2b3JcIiwgXCJlbnRlclwiLCBcImNvbm5lY3RcIiwgXCJtYWpvclwiLCBcInBvc3RcIiwgXCJmcmVzaFwiLCBcInNwZW5kXCIsIFwic2VhcmNoXCIsIFwiY2hvcmRcIiwgXCJzZW5kXCIsIFwiZmF0XCIsIFwieWVsbG93XCIsXG4gICAgICAgIFwiZ2xhZFwiLCBcImd1blwiLCBcIm9yaWdpbmFsXCIsIFwiYWxsb3dcIiwgXCJzaGFyZVwiLCBcInByaW50XCIsIFwic3RhdGlvblwiLCBcImRlYWRcIiwgXCJkYWRcIiwgXCJzcG90XCIsIFwiYnJlYWRcIiwgXCJkZXNlcnRcIixcbiAgICAgICAgXCJjaGFyZ2VcIiwgXCJzdWl0XCIsIFwicHJvcGVyXCIsIFwiY3VycmVudFwiLCBcImJhclwiLCBcImxpZnRcIiwgXCJvZmZlclwiLCBcInJvc2VcIiwgXCJzZWdtZW50XCIsIFwiY29udGludWVcIiwgXCJzbGF2ZVwiLCBcImJsb2NrXCIsXG4gICAgICAgIFwiZHVja1wiLCBcImNoYXJ0XCIsIFwiaW5zdGFudFwiLCBcImhhdFwiLCBcIm1hcmtldFwiLCBcInNlbGxcIiwgXCJkZWdyZWVcIiwgXCJzdWNjZXNzXCIsIFwicG9wdWxhdGVcIiwgXCJjb21wYW55XCIsIFwiY2hpY2tcIixcbiAgICAgICAgXCJzdWJ0cmFjdFwiLCBcImRlYXJcIiwgXCJldmVudFwiLCBcImVuZW15XCIsIFwicGFydGljdWxhclwiLCBcInJlcGx5XCIsIFwiZGVhbFwiLCBcImRyaW5rXCIsIFwic3dpbVwiLCBcIm9jY3VyXCIsIFwidGVybVwiLCBcInN1cHBvcnRcIixcbiAgICAgICAgXCJvcHBvc2l0ZVwiLCBcInNwZWVjaFwiLCBcIndpZmVcIiwgXCJuYXR1cmVcIiwgXCJzaG9lXCIsIFwicmFuZ2VcIiwgXCJzaG91bGRlclwiLCBcInN0ZWFtXCIsIFwic3ByZWFkXCIsIFwibW90aW9uXCIsIFwiYXJyYW5nZVwiLFxuICAgICAgICBcInBhdGhcIiwgXCJjYW1wXCIsIFwibGlxdWlkXCIsIFwiaW52ZW50XCIsIFwibG9nXCIsIFwiY290dG9uXCIsIFwibWVhbnRcIiwgXCJib3JuXCIsIFwicXVvdGllbnRcIiwgXCJkZXRlcm1pbmVcIiwgXCJ0ZWV0aFwiLCBcInF1YXJ0XCIsXG4gICAgICAgIFwic2hlbGxcIiwgXCJuaW5lXCIsIFwibmVja1wiLCBcImZhbmN5XCIsIFwiZmFuXCIsIFwiZm9vdGJhbGxcIlxuICAgIF07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHJhbmRvbSB3b3JkIGZyb20gdGhlIGFycmF5IG9mIHdvcmRzLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IHJhbmRvbSB3b3JkIGZyb20gdGhlIGFycmF5IG9mIHdvcmRzLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdlbmVyYXRlV29yZCgpXG4gICAge1xuICAgICAgICByZXR1cm4gd29yZHNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogd29yZHMubGVuZ3RoKV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGVzIG5ldyByb29tIG5hbWUuXG4gICAgICogQHBhcmFtIHNlcGFyYXRvciB0aGUgc2VwYXJhdG9yIGZvciB0aGUgd29yZHMuXG4gICAgICogQHBhcmFtIG51bWJlcl9vZl93b3JkcyBudW1iZXIgb2Ygd29yZHMgaW4gdGhlIHJvb20gbmFtZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IHRoZSByb29tIG5hbWVcbiAgICAgKi9cbiAgICBSb29tTmFtZUdlbmVyYXRvclByb3RvLmdlbmVyYXRlUm9vbSA9IGZ1bmN0aW9uKHNlcGFyYXRvciwgbnVtYmVyX29mX3dvcmRzKVxuICAgIHtcbiAgICAgICAgaWYoIXNlcGFyYXRvcilcbiAgICAgICAgICAgIHNlcGFyYXRvciA9IERFRkFVTFRfU0VQQVJBVE9SO1xuICAgICAgICBpZighbnVtYmVyX29mX3dvcmRzKVxuICAgICAgICAgICAgbnVtYmVyX29mX3dvcmRzID0gTlVNQkVSX09GX1dPUkRTO1xuICAgICAgICB2YXIgbmFtZSA9IFwiXCI7XG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGk8bnVtYmVyX29mX3dvcmRzOyBpKyspXG4gICAgICAgICAgICBuYW1lICs9ICgoaSAhPSAwKT8gc2VwYXJhdG9yIDogXCJcIikgKyBnZW5lcmF0ZVdvcmQoKTtcbiAgICAgICAgcmV0dXJuIG5hbWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGVzIG5ldyByb29tIG5hbWUuXG4gICAgICogQHBhcmFtIG51bWJlcl9vZl93b3JkcyBudW1iZXIgb2Ygd29yZHMgaW4gdGhlIHJvb20gbmFtZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IHRoZSByb29tIG5hbWVcbiAgICAgKi9cbiAgICBSb29tTmFtZUdlbmVyYXRvclByb3RvLmdlbmVyYXRlUm9vbVdpdGhvdXRTZXBhcmF0b3IgPSBmdW5jdGlvbihudW1iZXJfb2Zfd29yZHMpXG4gICAge1xuICAgICAgICBpZighbnVtYmVyX29mX3dvcmRzKVxuICAgICAgICAgICAgbnVtYmVyX29mX3dvcmRzID0gTlVNQkVSX09GX1dPUkRTO1xuICAgICAgICB2YXIgbmFtZSA9IFwiXCI7XG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGk8bnVtYmVyX29mX3dvcmRzOyBpKyspIHtcbiAgICAgICAgICAgIHZhciB3b3JkID0gZ2VuZXJhdGVXb3JkKCk7XG4gICAgICAgICAgICB3b3JkID0gd29yZC5zdWJzdHJpbmcoMCwgMSkudG9VcHBlckNhc2UoKSArIHdvcmQuc3Vic3RyaW5nKDEsIHdvcmQubGVuZ3RoKTtcbiAgICAgICAgICAgIG5hbWUgKz0gd29yZCA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5hbWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIFJvb21OYW1lR2VuZXJhdG9yUHJvdG87XG59KCk7XG5cbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiJdfQ==
