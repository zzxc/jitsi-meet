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

        if (resourceJid === Strophe.getResourceFromJid(connection.emuc.myroomjid)
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
    $(document).bind(   'displaynamechanged',
                        function (event, peerJid, displayName) {
        if (peerJid === 'localVideoContainer')
            peerJid = connection.emuc.myroomjid;

        var resourceJid = Strophe.getResourceFromJid(peerJid);

        var contactName = $('#contactlist #' + resourceJid + '>p');

        if (contactName && displayName && displayName.length > 0)
            contactName.html(displayName);
    });

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


},{"../service/RTC/StreamEventTypes.js":22,"./UIService":3,"./VideoLayout.js":5,"./WelcomePage":6,"./audiolevels/AudioLevels.js":7,"./chat/Chat.js":9,"./etherpad/Etherpad.js":12,"./keyboard_shortcut":13,"./prezi/Prezi.js":14,"./toolbars/BottomToolbar":17,"./toolbars/toolbar":19,"./toolbars/toolbar_toggler":20}],3:[function(require,module,exports){
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

        if (!focus) {
            Toolbar.showSipCallButton(false);
        }

        if (focus && config.etherpad_base) {
            this.initEtherpad();
        }

        VideoLayout.showFocusIndicator();

        // Add myself to the contact list.
        ContactList.addContact(jid);

        // Once we've joined the muc show the toolbar
        ToolbarToggler.showToolbar();

        if (info.displayName)
            $(document).trigger('displaynamechanged',
                ['localVideoContainer', info.displayName + ' (me)']);
    }

    UIServiceProto.prototype.onMucEntered = function (jid, info, pres) {
        console.log('entered', jid, info);

        console.log('is focus?' + focus ? 'true' : 'false');

        // Add Peer's container
        VideoLayout.ensurePeerContainerExists(jid);

        if (focus !== null) {
            // FIXME: this should prepare the video
            if (focus.confid === null) {
                console.log('make new conference with', jid);
                Toolbar.showRecordingButton(true);
            }
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
            if (getJidFromVideoSrc(VideoLayout.focusedVideoSrc) === jid)
            {
                console.info("Focused video owner has left the conference");
                VideoLayout.focusedVideoSrc = null;
            }
        }

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

        if (config.useNicks) {
            var nick = window.prompt('Your nickname (optional)');
            if (nick) {
                roomjid += '/' + nick;
            } else {
                roomjid += '/' + Strophe.getNodeFromJid(connection.jid);
            }
        } else {

            var tmpJid = Strophe.getNodeFromJid(connection.jid);

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
},{"./ContactList":1,"./VideoLayout.js":5,"./audiolevels/AudioLevels.js":7,"./etherpad/Etherpad.js":12,"./toolbars/toolbar.js":19,"./toolbars/toolbar_toggler.js":20,"events":24}],4:[function(require,module,exports){

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
    var preMuted = false;
    var currentDominantSpeaker = null;
    var lastNCount = config.channelLastN;
    var lastNEndpointsCache = [];
    var largeVideoNewSrc = '';
    var browser = null;
    var flipXLocalVideo = true;
    my.currentVideoWidth = null;
    my.currentVideoHeight = null;

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
        connection.jingle.localAudio = stream;

        attachMediaStream($('#localAudio'), stream);
        document.getElementById('localAudio').autoplay = true;
        document.getElementById('localAudio').volume = 0;
        if (preMuted) {
            toggleAudio();
            preMuted = false;
        }
    };

    my.changeLocalVideo = function(stream, flipX) {
        connection.jingle.localVideo = stream;

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

            var userJid = getJidFromVideoSrc(newSrc);
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
                    var oldJid = getJidFromVideoSrc(oldSrc);
                    if (oldJid) {
                        var oldResourceJid = Strophe.getResourceFromJid(oldJid);
                        VideoLayout.enableDominantSpeaker(oldResourceJid, false);
                    }

                    // Enable new dominant speaker in the remote videos section.
                    var userJid = getJidFromVideoSrc(newSrc);
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
                var videoType = ssrc2videoType[videoSsrc];
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
        var focusJid = getJidFromVideoSrc(VideoLayout.focusedVideoSrc);
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
        var userJid = getJidFromVideoSrc(videoSrc);
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
        var largeVideoJid = getJidFromVideoSrc($('#largeVideo').attr('src'));
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
            if (focus && $('#remote_popupmenu_' + resourceJid).length <= 0)
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
        if (focus && peerJid != null)
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
                            connection.emuc.addDisplayNameToPresence(nickname);
                            connection.emuc.sendPresence();

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
        if (focus !== null) {
            var indicatorSpan = $('#localVideoContainer .focusindicator');

            if (indicatorSpan.children().length === 0)
            {
                createFocusIndicatorElement(indicatorSpan[0]);
            }
        }
        else if (Object.keys(connection.jingle.sessions).length > 0) {
            // If we're only a participant the focus will be the only session we have.
            var session
                = connection.jingle.sessions
                    [Object.keys(connection.jingle.sessions)[0]];
            var focusId
                = 'participant_' + Strophe.getResourceFromJid(session.peerjid);

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
                === Strophe.getResourceFromJid(connection.emuc.myroomjid)) {
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

        if (userJid === connection.emuc.myroomjid)
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
            connection.moderate.setMute(jid, isMute);
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
            connection.moderate.eject(jid);
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
        if (jid === connection.emuc.myroomjid) {
            videoSpanId = 'localVideoContainer';
        } else {
            VideoLayout.ensurePeerContainerExists(jid);
            videoSpanId = 'participant_' + Strophe.getResourceFromJid(jid);
        }

        if (focus) {
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
        if (jid === connection.emuc.myroomjid) {
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
    $(document).bind('displaynamechanged',
                    function (event, jid, displayName, status) {
        if (jid === 'localVideoContainer'
            || jid === connection.emuc.myroomjid) {
            setDisplayName('localVideoContainer',
                           displayName);
        } else {
            VideoLayout.ensurePeerContainerExists(jid);

            setDisplayName(
                'participant_' + Strophe.getResourceFromJid(jid),
                displayName,
                status);
        }
    });

    /**
     * On dominant speaker changed event.
     */
    $(document).bind('dominantspeakerchanged', function (event, resourceJid) {
        // We ignore local user events.
        if (resourceJid
                === Strophe.getResourceFromJid(connection.emuc.myroomjid))
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
        var localVideoSelector = $('#' + 'localVideo_' + connection.jingle.localVideo.id);
        var simulcast = new Simulcast();
        var stream = simulcast.getLocalVideoStream();

        // Attach WebRTC stream
        attachMediaStream(localVideoSelector, stream);

        localVideoSrc = $(localVideoSelector).attr('src');
    });

    $(document).bind('simulcastlayerstopped', function(event) {
        var localVideoSelector = $('#' + 'localVideo_' + connection.jingle.localVideo.id);
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
            if (connection.jingle) {
                var keys = Object.keys(connection.jingle.sessions);
                for (i = 0; i < keys.length; i++) {
                    var sid = keys[i];

                    if (electedStream) {
                        // stream found, stop.
                        break;
                    }

                    session = connection.jingle.sessions[sid];
                    if (session.remoteStreams) {
                        for (j = 0; j < session.remoteStreams.length; j++) {
                            var remoteStream = session.remoteStreams[j];

                            if (electedStream) {
                                // stream found, stop.
                                break;
                            }
                            var tracks = remoteStream.getVideoTracks();
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
                }
            }

            if (session && electedStream) {
                console.info('Switching simulcast substream.');
                console.info([esl, primarySSRC, msid, session, electedStream]);

                var msidParts = msid.split(' ');
                var selRemoteVideo = $(['#', 'remoteVideo_', session.sid, '_', msidParts[0]].join(''));

                var updateLargeVideo = (ssrc2jid[videoSrcToSsrc[selRemoteVideo.attr('src')]]
                    == ssrc2jid[videoSrcToSsrc[largeVideoNewSrc]]);
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

},{"../util/roomname_generator":23}],7:[function(require,module,exports){
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
                    connection.emuc.addDisplayNameToPresence(val);
                    connection.emuc.sendPresence();

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
                    connection.emuc.sendMessage(message, dep.UIActivator().getUIService().getNickname());
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

        if (connection.emuc.myroomjid === from) {
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
        connection.emuc.addEtherpadToPresence(etherpadName);
        connection.emuc.sendPresence();
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
        if (config.etherpad_base && !focus) {
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
            function: toggleAudio
        },
        84: {
            character: "T",
            function: function() {
                if(!isAudioMuted()) {
                    toggleAudio();
                }
            }
        },
        86: {
            character: "V",
            id: "toggleVideoPopover",
            function: toggleVideo
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
                if(isAudioMuted()) {
                    toggleAudio();
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

},{"./toolbars/BottomToolbar":17}],14:[function(require,module,exports){
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
        var myprezi = connection.emuc.getPrezi(connection.emuc.myroomjid);
        if (myprezi) {
            messageHandler.openTwoButtonDialog("Remove Prezi",
                "Are you sure you would like to remove your Prezi?",
                false,
                "Remove",
                function(e,v,m,f) {
                    if(v) {
                        connection.emuc.removePreziFromPresence();
                        connection.emuc.sendPresence();
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
                                        connection.emuc
                                            .addPreziToPresence(urlValue, 0);
                                        connection.emuc.sendPresence();
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
        if (jid === connection.emuc.myroomjid)
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
                if (jid != connection.emuc.myroomjid)
                    preziPlayer.flyToStep(currentSlide);
            }
        });

        preziPlayer.on(PreziPlayer.EVENT_CURRENT_STEP, function(event) {
            console.log("event value", event.value);
            connection.emuc.addCurrentSlideToPresence(event.value);
            connection.emuc.sendPresence();
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

},{"./../ContactList.js":1,"./../chat/chat.js":11}],18:[function(require,module,exports){
var BottomToolbar = require("./BottomToolbar");
var Prezi = require("./../prezi/prezi");
var Etherpad = require("./../etherpad/Etherpad");

var Toolbar = (function (my) {

    var toolbarTimeout = null;

    var roomUrl = null;

    var buttonHandlers = {
        "toolbar_button_mute": function () {
            return toggleAudio();
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
                        connection.rayo.dial(
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
        if (focus === null || focus.confid === null) {
            console.log('non-focus, or conference not yet organized: not enabling recording');
            return;
        }

        if (!recordingToken)
        {
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

            return;
        }

        var oldState = focus.recordingEnabled;
        Toolbar.toggleRecordingButtonState();
        focus.setRecording(!oldState,
            recordingToken,
            function (state) {
                console.log("New recording state: ", state);
                if (state == oldState) //failed to change, reset the token because it might have been wrong
                {
                    Toolbar.toggleRecordingButtonState();
                    setRecordingToken(null);
                }
            }
        );


    }

    function hangup() {
        disposeConference();
        connection.emuc.doLeave();
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
        if (lock)
            connection.emuc.lockRoom(Toolbar.sharedKey);
        else
            connection.emuc.lockRoom('');

        Toolbar.updateLockButton();
    }

    //sets onclick handlers
    my.init = function () {
        for(var k in buttonHandlers)
            $("#" + k).click(buttonHandlers[k]);
    }

    /**
     * Opens the lock room dialog.
     */
    my.openLockDialog = function () {
        // Only the focus is able to set a shared key.
        if (focus === null) {
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

},{"./../etherpad/Etherpad":12,"./../prezi/prezi":16,"./BottomToolbar":17}],19:[function(require,module,exports){
module.exports=require(18)
},{"./../etherpad/Etherpad":12,"./../prezi/prezi":16,"./BottomToolbar":17}],20:[function(require,module,exports){
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

        if (focus != null)
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


},{}],24:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9Db250YWN0TGlzdC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL1VJQWN0aXZhdG9yLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvVUlTZXJ2aWNlLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvVUlVdGlsLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvVmlkZW9MYXlvdXQuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9XZWxjb21lUGFnZS5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL2F1ZGlvbGV2ZWxzL0F1ZGlvTGV2ZWxzLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvYXVkaW9sZXZlbHMvQ2FudmFzVXRpbC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL2NoYXQvQ2hhdC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL2NoYXQvUmVwbGFjZW1lbnQuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9ldGhlcnBhZC9FdGhlcnBhZC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL2tleWJvYXJkX3Nob3J0Y3V0LmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvcHJlemkvUHJlemkuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9wcmV6aS9QcmV6aVBsYXllci5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL3Rvb2xiYXJzL0JvdHRvbVRvb2xiYXIuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS90b29sYmFycy9Ub29sYmFyLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvdG9vbGJhcnMvdG9vbGJhcl90b2dnbGVyLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvc2VydmljZS9SVEMvUlRDQnJvd3NlclR5cGUuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9zZXJ2aWNlL1JUQy9TdHJlYW1FdmVudFR5cGVzLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvdXRpbC9yb29tbmFtZV9nZW5lcmF0b3IuanMiLCIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3J2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDcFNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDcGJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBWaWRlb0xheW91dCA9IHJlcXVpcmUoXCIuL1ZpZGVvTGF5b3V0LmpzXCIpO1xuXG4vKipcbiAqIENvbnRhY3QgbGlzdC5cbiAqL1xudmFyIENvbnRhY3RMaXN0ID0gKGZ1bmN0aW9uIChteSkge1xuICAgIC8qKlxuICAgICAqIEluZGljYXRlcyBpZiB0aGUgY2hhdCBpcyBjdXJyZW50bHkgdmlzaWJsZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gPHR0PnRydWU8L3R0PiBpZiB0aGUgY2hhdCBpcyBjdXJyZW50bHkgdmlzaWJsZSwgPHR0PmZhbHNlPC90dD4gLVxuICAgICAqIG90aGVyd2lzZVxuICAgICAqL1xuICAgIG15LmlzVmlzaWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICQoJyNjb250YWN0bGlzdCcpLmlzKFwiOnZpc2libGVcIik7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYSBjb250YWN0IGZvciB0aGUgZ2l2ZW4gcGVlckppZCBpZiBzdWNoIGRvZXNuJ3QgeWV0IGV4aXN0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHBlZXJKaWQgdGhlIHBlZXJKaWQgY29ycmVzcG9uZGluZyB0byB0aGUgY29udGFjdFxuICAgICAqL1xuICAgIG15LmVuc3VyZUFkZENvbnRhY3QgPSBmdW5jdGlvbihwZWVySmlkKSB7XG4gICAgICAgIHZhciByZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHBlZXJKaWQpO1xuXG4gICAgICAgIHZhciBjb250YWN0ID0gJCgnI2NvbnRhY3RsaXN0PnVsPmxpW2lkPVwiJyArIHJlc291cmNlSmlkICsgJ1wiXScpO1xuXG4gICAgICAgIGlmICghY29udGFjdCB8fCBjb250YWN0Lmxlbmd0aCA8PSAwKVxuICAgICAgICAgICAgQ29udGFjdExpc3QuYWRkQ29udGFjdChwZWVySmlkKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQWRkcyBhIGNvbnRhY3QgZm9yIHRoZSBnaXZlbiBwZWVyIGppZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBwZWVySmlkIHRoZSBqaWQgb2YgdGhlIGNvbnRhY3QgdG8gYWRkXG4gICAgICovXG4gICAgbXkuYWRkQ29udGFjdCA9IGZ1bmN0aW9uKHBlZXJKaWQpIHtcbiAgICAgICAgdmFyIHJlc291cmNlSmlkID0gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQocGVlckppZCk7XG5cbiAgICAgICAgdmFyIGNvbnRhY3RsaXN0ID0gJCgnI2NvbnRhY3RsaXN0PnVsJyk7XG5cbiAgICAgICAgdmFyIG5ld0NvbnRhY3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuICAgICAgICBuZXdDb250YWN0LmlkID0gcmVzb3VyY2VKaWQ7XG5cbiAgICAgICAgbmV3Q29udGFjdC5hcHBlbmRDaGlsZChjcmVhdGVBdmF0YXIoKSk7XG4gICAgICAgIG5ld0NvbnRhY3QuYXBwZW5kQ2hpbGQoY3JlYXRlRGlzcGxheU5hbWVQYXJhZ3JhcGgoXCJQYXJ0aWNpcGFudFwiKSk7XG5cbiAgICAgICAgdmFyIGNsRWxlbWVudCA9IGNvbnRhY3RsaXN0LmdldCgwKTtcblxuICAgICAgICBpZiAocmVzb3VyY2VKaWQgPT09IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQpXG4gICAgICAgICAgICAmJiAkKCcjY29udGFjdGxpc3Q+dWwgLnRpdGxlJylbMF0ubmV4dFNpYmxpbmcubmV4dFNpYmxpbmcpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNsRWxlbWVudC5pbnNlcnRCZWZvcmUobmV3Q29udGFjdCxcbiAgICAgICAgICAgICAgICAgICAgJCgnI2NvbnRhY3RsaXN0PnVsIC50aXRsZScpWzBdLm5leHRTaWJsaW5nLm5leHRTaWJsaW5nKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNsRWxlbWVudC5hcHBlbmRDaGlsZChuZXdDb250YWN0KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGEgY29udGFjdCBmb3IgdGhlIGdpdmVuIHBlZXIgamlkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHBlZXJKaWQgdGhlIHBlZXJKaWQgY29ycmVzcG9uZGluZyB0byB0aGUgY29udGFjdCB0byByZW1vdmVcbiAgICAgKi9cbiAgICBteS5yZW1vdmVDb250YWN0ID0gZnVuY3Rpb24ocGVlckppZCkge1xuICAgICAgICB2YXIgcmVzb3VyY2VKaWQgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChwZWVySmlkKTtcblxuICAgICAgICB2YXIgY29udGFjdCA9ICQoJyNjb250YWN0bGlzdD51bD5saVtpZD1cIicgKyByZXNvdXJjZUppZCArICdcIl0nKTtcblxuICAgICAgICBpZiAoY29udGFjdCAmJiBjb250YWN0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBjb250YWN0bGlzdCA9ICQoJyNjb250YWN0bGlzdD51bCcpO1xuXG4gICAgICAgICAgICBjb250YWN0bGlzdC5nZXQoMCkucmVtb3ZlQ2hpbGQoY29udGFjdC5nZXQoMCkpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIE9wZW5zIC8gY2xvc2VzIHRoZSBjb250YWN0IGxpc3QgYXJlYS5cbiAgICAgKi9cbiAgICBteS50b2dnbGVDb250YWN0TGlzdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNvbnRhY3RsaXN0ID0gJCgnI2NvbnRhY3RsaXN0Jyk7XG5cbiAgICAgICAgdmFyIGNoYXRTaXplID0gKENvbnRhY3RMaXN0LmlzVmlzaWJsZSgpKSA/IFswLCAwXSA6IENvbnRhY3RMaXN0LmdldENvbnRhY3RMaXN0U2l6ZSgpO1xuICAgICAgICBWaWRlb0xheW91dC5yZXNpemVWaWRlb1NwYWNlKGNvbnRhY3RsaXN0LCBjaGF0U2l6ZSwgQ29udGFjdExpc3QuaXNWaXNpYmxlKCkpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBzaXplIG9mIHRoZSBjaGF0LlxuICAgICAqL1xuICAgIG15LmdldENvbnRhY3RMaXN0U2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGF2YWlsYWJsZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgdmFyIGF2YWlsYWJsZVdpZHRoID0gd2luZG93LmlubmVyV2lkdGg7XG5cbiAgICAgICAgdmFyIGNoYXRXaWR0aCA9IDIwMDtcbiAgICAgICAgaWYgKGF2YWlsYWJsZVdpZHRoICogMC4yIDwgMjAwKVxuICAgICAgICAgICAgY2hhdFdpZHRoID0gYXZhaWxhYmxlV2lkdGggKiAwLjI7XG5cbiAgICAgICAgcmV0dXJuIFtjaGF0V2lkdGgsIGF2YWlsYWJsZUhlaWdodF07XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgdGhlIGF2YXRhciBlbGVtZW50LlxuICAgICAqXG4gICAgICogQHJldHVybiB0aGUgbmV3bHkgY3JlYXRlZCBhdmF0YXIgZWxlbWVudFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZUF2YXRhcigpIHtcbiAgICAgICAgdmFyIGF2YXRhciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2knKTtcbiAgICAgICAgYXZhdGFyLmNsYXNzTmFtZSA9IFwiaWNvbi1hdmF0YXIgYXZhdGFyXCI7XG5cbiAgICAgICAgcmV0dXJuIGF2YXRhcjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyB0aGUgZGlzcGxheSBuYW1lIHBhcmFncmFwaC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBkaXNwbGF5TmFtZSB0aGUgZGlzcGxheSBuYW1lIHRvIHNldFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZURpc3BsYXlOYW1lUGFyYWdyYXBoKGRpc3BsYXlOYW1lKSB7XG4gICAgICAgIHZhciBwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuICAgICAgICBwLmlubmVySFRNTCA9IGRpc3BsYXlOYW1lO1xuXG4gICAgICAgIHJldHVybiBwO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBJbmRpY2F0ZXMgdGhhdCB0aGUgZGlzcGxheSBuYW1lIGhhcyBjaGFuZ2VkLlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoICAgJ2Rpc3BsYXluYW1lY2hhbmdlZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZXZlbnQsIHBlZXJKaWQsIGRpc3BsYXlOYW1lKSB7XG4gICAgICAgIGlmIChwZWVySmlkID09PSAnbG9jYWxWaWRlb0NvbnRhaW5lcicpXG4gICAgICAgICAgICBwZWVySmlkID0gY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZDtcblxuICAgICAgICB2YXIgcmVzb3VyY2VKaWQgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChwZWVySmlkKTtcblxuICAgICAgICB2YXIgY29udGFjdE5hbWUgPSAkKCcjY29udGFjdGxpc3QgIycgKyByZXNvdXJjZUppZCArICc+cCcpO1xuXG4gICAgICAgIGlmIChjb250YWN0TmFtZSAmJiBkaXNwbGF5TmFtZSAmJiBkaXNwbGF5TmFtZS5sZW5ndGggPiAwKVxuICAgICAgICAgICAgY29udGFjdE5hbWUuaHRtbChkaXNwbGF5TmFtZSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbXk7XG59KENvbnRhY3RMaXN0IHx8IHt9KSk7XG5tb2R1bGUuZXhwb3J0cyA9IENvbnRhY3RMaXN0IiwidmFyIFVJU2VydmljZSA9IHJlcXVpcmUoXCIuL1VJU2VydmljZVwiKTtcbnZhciBWaWRlb0xheW91dCA9IHJlcXVpcmUoXCIuL1ZpZGVvTGF5b3V0LmpzXCIpO1xudmFyIEF1ZGlvTGV2ZWxzID0gcmVxdWlyZShcIi4vYXVkaW9sZXZlbHMvQXVkaW9MZXZlbHMuanNcIik7XG52YXIgUHJlemkgPSByZXF1aXJlKFwiLi9wcmV6aS9QcmV6aS5qc1wiKTtcbnZhciBFdGhlcnBhZCA9IHJlcXVpcmUoXCIuL2V0aGVycGFkL0V0aGVycGFkLmpzXCIpO1xudmFyIENoYXQgPSByZXF1aXJlKFwiLi9jaGF0L0NoYXQuanNcIik7XG52YXIgU3RyZWFtRXZlbnRUeXBlcyA9IHJlcXVpcmUoXCIuLi9zZXJ2aWNlL1JUQy9TdHJlYW1FdmVudFR5cGVzLmpzXCIpO1xudmFyIFRvb2xiYXIgPSByZXF1aXJlKFwiLi90b29sYmFycy90b29sYmFyXCIpO1xudmFyIFRvb2xiYXJUb2dnbGVyID0gcmVxdWlyZShcIi4vdG9vbGJhcnMvdG9vbGJhcl90b2dnbGVyXCIpO1xudmFyIEJvdHRvbVRvb2xiYXIgPSByZXF1aXJlKFwiLi90b29sYmFycy9Cb3R0b21Ub29sYmFyXCIpO1xudmFyIEtleWJvYXJkU2hvcnRjdXQgPSByZXF1aXJlKFwiLi9rZXlib2FyZF9zaG9ydGN1dFwiKTtcblxudmFyIFVJQWN0aXZhdG9yID0gZnVuY3Rpb24oKVxue1xuICAgIHZhciB1aVNlcnZpY2UgPSBudWxsO1xuICAgIGZ1bmN0aW9uIFVJQWN0aXZhdG9yUHJvdG8oKVxuICAgIHtcblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldHVwUHJlemkoKVxuICAgIHtcbiAgICAgICAgJChcIiN0b29sYmFyX3ByZXppXCIpLmNsaWNrKGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgUHJlemkub3BlblByZXppRGlhbG9nKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoXCIjcmVsb2FkUHJlc2VudGF0aW9uTGlua1wiKS5jbGljayhmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIFByZXppLnJlbG9hZFByZXNlbnRhdGlvbigpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldHVwRXRoZXJwYWQoKVxuICAgIHtcbiAgICAgICAgJChcIiN0b29sYmFyX2V0aGVycGFkXCIpLmNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIEV0aGVycGFkLnRvZ2dsZUV0aGVycGFkKDApO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldHVwQXVkaW9MZXZlbHMoKSB7XG4gICAgICAgIFN0YXRpc3RpY3NBY3RpdmF0b3IuYWRkQXVkaW9MZXZlbExpc3RlbmVyKEF1ZGlvTGV2ZWxzLnVwZGF0ZUF1ZGlvTGV2ZWwpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldHVwQ2hhdCgpXG4gICAge1xuICAgICAgICBDaGF0LmluaXQoKTtcbiAgICAgICAgJChcIiN0b29sYmFyX2NoYXRcIikuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgQ2hhdC50b2dnbGVDaGF0KCk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0dXBWaWRlb0xheW91dEV2ZW50cygpXG4gICAge1xuXG4gICAgICAgICQoZG9jdW1lbnQpLmJpbmQoJ2NhbGxhY3RpdmUuamluZ2xlJywgZnVuY3Rpb24gKGV2ZW50LCB2aWRlb2VsZW0sIHNpZCkge1xuICAgICAgICAgICAgaWYgKHZpZGVvZWxlbS5hdHRyKCdpZCcpLmluZGV4T2YoJ21peGVkbXNsYWJlbCcpID09PSAtMSkge1xuICAgICAgICAgICAgICAgIC8vIGlnbm9yZSBtaXhlZG1zbGFiZWxhMCBhbmQgdjBcbiAgICAgICAgICAgICAgICB2aWRlb2VsZW0uc2hvdygpO1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZVRodW1ibmFpbHMoKTtcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgbGFyZ2UgdmlkZW8gdG8gdGhlIGxhc3QgYWRkZWQgdmlkZW8gb25seSBpZiB0aGVyZSdzIG5vXG4gICAgICAgICAgICAgICAgLy8gY3VycmVudCBhY3RpdmUgb3IgZm9jdXNlZCBzcGVha2VyLlxuICAgICAgICAgICAgICAgIGlmICghVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjICYmICFWaWRlb0xheW91dC5nZXREb21pbmFudFNwZWFrZXJSZXNvdXJjZUppZCgpKVxuICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC51cGRhdGVMYXJnZVZpZGVvKHZpZGVvZWxlbS5hdHRyKCdzcmMnKSwgMSk7XG5cbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zaG93Rm9jdXNJbmRpY2F0b3IoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0dXBUb29sYmFycygpIHtcbiAgICAgICAgVG9vbGJhci5pbml0KCk7XG4gICAgICAgIEJvdHRvbVRvb2xiYXIuaW5pdCgpO1xuICAgIH1cblxuICAgIFVJQWN0aXZhdG9yUHJvdG8uc3RhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICQoJ2JvZHknKS5wb3BvdmVyKHsgc2VsZWN0b3I6ICdbZGF0YS10b2dnbGU9cG9wb3Zlcl0nLFxuICAgICAgICAgICAgdHJpZ2dlcjogJ2NsaWNrIGhvdmVyJ30pO1xuICAgICAgICBWaWRlb0xheW91dC5yZXNpemVMYXJnZVZpZGVvQ29udGFpbmVyKCk7XG4gICAgICAgICQoXCIjdmlkZW9zcGFjZVwiKS5tb3VzZW1vdmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIFRvb2xiYXJUb2dnbGVyLnNob3dUb29sYmFyKCk7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBTZXQgdGhlIGRlZmF1bHRzIGZvciBwcm9tcHQgZGlhbG9ncy5cbiAgICAgICAgalF1ZXJ5LnByb21wdC5zZXREZWZhdWx0cyh7cGVyc2lzdGVudDogZmFsc2V9KTtcblxuICAgICAgICBLZXlib2FyZFNob3J0Y3V0LmluaXQoKTtcbiAgICAgICAgcmVnaXN0ZXJMaXN0ZW5lcnMoKTtcbiAgICAgICAgYmluZEV2ZW50cygpO1xuICAgICAgICBzZXR1cEF1ZGlvTGV2ZWxzKCk7XG4gICAgICAgIHNldHVwVmlkZW9MYXlvdXRFdmVudHMoKTtcbiAgICAgICAgc2V0dXBQcmV6aSgpO1xuICAgICAgICBzZXR1cEV0aGVycGFkKCk7XG4gICAgICAgIHNldHVwVG9vbGJhcnMoKTtcbiAgICAgICAgc2V0dXBDaGF0KCk7XG5cbiAgICAgICAgZG9jdW1lbnQudGl0bGUgPSBicmFuZC5hcHBOYW1lO1xuXG4gICAgICAgICQoXCIjZG93bmxvYWRsb2dcIikuY2xpY2soZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBkdW1wKGV2ZW50LnRhcmdldCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmKGNvbmZpZy5lbmFibGVXZWxjb21lUGFnZSAmJiB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgPT0gXCIvXCIgJiZcbiAgICAgICAgICAgICghd2luZG93LmxvY2FsU3RvcmFnZS53ZWxjb21lUGFnZURpc2FibGVkIHx8IHdpbmRvdy5sb2NhbFN0b3JhZ2Uud2VsY29tZVBhZ2VEaXNhYmxlZCA9PSBcImZhbHNlXCIpKVxuICAgICAgICB7XG4gICAgICAgICAgICAkKFwiI3ZpZGVvY29uZmVyZW5jZV9wYWdlXCIpLmhpZGUoKTtcbiAgICAgICAgICAgIHZhciBzZXR1cFdlbGNvbWVQYWdlID0gcmVxdWlyZShcIi4vV2VsY29tZVBhZ2VcIik7XG4gICAgICAgICAgICBzZXR1cFdlbGNvbWVQYWdlKCk7XG5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgICQoXCIjd2VsY29tZV9wYWdlXCIpLmhpZGUoKTtcblxuICAgICAgICBpZiAoISQoJyNzZXR0aW5ncycpLmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnaW5pdCcpO1xuICAgICAgICAgICAgaW5pdCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9naW5JbmZvLm9uc3VibWl0ID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZS5wcmV2ZW50RGVmYXVsdCkgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICQoJyNzZXR0aW5ncycpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBpbml0KCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBVSUFjdGl2YXRvclByb3RvLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHVpU2VydmljZS5kaXNwb3NlKCk7XG4gICAgICAgIHVpU2VydmljZSA9IG51bGw7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZXMgdGhlIGxvZyBkYXRhXG4gICAgICovXG4gICAgZnVuY3Rpb24gcG9wdWxhdGVEYXRhKCkge1xuICAgICAgICB2YXIgZGF0YSA9IFhNUFBBY3RpdmF0b3IuZ2V0SmluZ2xlRGF0YSgpO1xuICAgICAgICB2YXIgbWV0YWRhdGEgPSB7fTtcbiAgICAgICAgbWV0YWRhdGEudGltZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgIG1ldGFkYXRhLnVybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmO1xuICAgICAgICBtZXRhZGF0YS51YSA9IG5hdmlnYXRvci51c2VyQWdlbnQ7XG4gICAgICAgIHZhciBsb2dnZXIgPSBYTVBQQWN0aXZhdG9yLmdldExvZ2dlcigpO1xuICAgICAgICBpZiAobG9nZ2VyKSB7XG4gICAgICAgICAgICBtZXRhZGF0YS54bXBwID0gbG9nZ2VyLmxvZztcbiAgICAgICAgfVxuICAgICAgICBkYXRhLm1ldGFkYXRhID0gbWV0YWRhdGE7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGR1bXAoZWxlbSwgZmlsZW5hbWUpIHtcbiAgICAgICAgZWxlbSA9IGVsZW0ucGFyZW50Tm9kZTtcbiAgICAgICAgZWxlbS5kb3dubG9hZCA9IGZpbGVuYW1lIHx8ICdtZWV0bG9nLmpzb24nO1xuICAgICAgICBlbGVtLmhyZWYgPSAnZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTgsXFxuJztcbiAgICAgICAgdmFyIGRhdGEgPSBwb3B1bGF0ZURhdGEoKTtcbiAgICAgICAgZWxlbS5ocmVmICs9IGVuY29kZVVSSUNvbXBvbmVudChKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCAnICAnKSk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZWdpc3Rlckxpc3RlbmVycygpIHtcbiAgICAgICAgUlRDQWN0aXZhdG9yLmFkZFN0cmVhbUxpc3RlbmVyKGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgICAgIHN3aXRjaCAoc3RyZWFtLnR5cGUpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY2FzZSBcImF1ZGlvXCI6XG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LmNoYW5nZUxvY2FsQXVkaW8oc3RyZWFtLmdldE9yaWdpbmFsU3RyZWFtKCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwidmlkZW9cIjpcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuY2hhbmdlTG9jYWxWaWRlbyhzdHJlYW0uZ2V0T3JpZ2luYWxTdHJlYW0oKSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJkZXNrdG9wXCI6XG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LmNoYW5nZUxvY2FsVmlkZW8oc3RyZWFtLCAhaXNVc2luZ1NjcmVlblN0cmVhbSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBTdHJlYW1FdmVudFR5cGVzLkVWRU5UX1RZUEVfTE9DQUxfQ1JFQVRFRCk7XG5cbiAgICAgICAgUlRDQWN0aXZhdG9yLmFkZFN0cmVhbUxpc3RlbmVyKGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0Lm9uUmVtb3RlU3RyZWFtQWRkZWQoc3RyZWFtKTtcbiAgICAgICAgfSwgU3RyZWFtRXZlbnRUeXBlcy5FVkVOVF9UWVBFX1JFTU9URV9DUkVBVEVEKTtcblxuICAgICAgICAvLyBMaXN0ZW4gZm9yIGxhcmdlIHZpZGVvIHNpemUgdXBkYXRlc1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbGFyZ2VWaWRlbycpXG4gICAgICAgICAgICAuYWRkRXZlbnRMaXN0ZW5lcignbG9hZGVkbWV0YWRhdGEnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LmN1cnJlbnRWaWRlb1dpZHRoID0gdGhpcy52aWRlb1dpZHRoO1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LmN1cnJlbnRWaWRlb0hlaWdodCA9IHRoaXMudmlkZW9IZWlnaHQ7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQucG9zaXRpb25MYXJnZShWaWRlb0xheW91dC5jdXJyZW50VmlkZW9XaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuY3VycmVudFZpZGVvSGVpZ2h0KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYmluZEV2ZW50cygpXG4gICAge1xuICAgICAgICAvKipcbiAgICAgICAgICogUmVzaXplcyBhbmQgcmVwb3NpdGlvbnMgdmlkZW9zIGluIGZ1bGwgc2NyZWVuIG1vZGUuXG4gICAgICAgICAqL1xuICAgICAgICAkKGRvY3VtZW50KS5vbignd2Via2l0ZnVsbHNjcmVlbmNoYW5nZSBtb3pmdWxsc2NyZWVuY2hhbmdlIGZ1bGxzY3JlZW5jaGFuZ2UnLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZUxhcmdlVmlkZW9Db250YWluZXIoKTtcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5wb3NpdGlvbkxhcmdlKCk7XG4gICAgICAgICAgICAgICAgdmFyIGlzRnVsbFNjcmVlbiA9IFZpZGVvTGF5b3V0LmlzRnVsbFNjcmVlbigpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGlzRnVsbFNjcmVlbikge1xuICAgICAgICAgICAgICAgICAgICBzZXRWaWV3KFwiZnVsbHNjcmVlblwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFZpZXcoXCJkZWZhdWx0XCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICAkKHdpbmRvdykucmVzaXplKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZUxhcmdlVmlkZW9Db250YWluZXIoKTtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LnBvc2l0aW9uTGFyZ2UoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgY3VycmVudCB2aWV3LlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNldFZpZXcodmlld05hbWUpIHtcbi8vICAgIGlmICh2aWV3TmFtZSA9PSBcImZ1bGxzY3JlZW5cIikge1xuLy8gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd2aWRlb2xheW91dF9mdWxsc2NyZWVuJykuZGlzYWJsZWQgID0gZmFsc2U7XG4vLyAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ZpZGVvbGF5b3V0X2RlZmF1bHQnKS5kaXNhYmxlZCAgPSB0cnVlO1xuLy8gICAgfVxuLy8gICAgZWxzZSB7XG4vLyAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ZpZGVvbGF5b3V0X2RlZmF1bHQnKS5kaXNhYmxlZCAgPSBmYWxzZTtcbi8vICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndmlkZW9sYXlvdXRfZnVsbHNjcmVlbicpLmRpc2FibGVkICA9IHRydWU7XG4vLyAgICB9XG4gICAgfVxuXG4gICAgVUlBY3RpdmF0b3JQcm90by5nZXRSVENTZXJ2aWNlID0gZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgcmV0dXJuIFJUQ0FjdGl2YXRvci5nZXRSVENTZXJ2aWNlKCk7XG4gICAgfVxuXG4gICAgVUlBY3RpdmF0b3JQcm90by5nZXRVSVNlcnZpY2UgPSBmdW5jdGlvbigpXG4gICAge1xuICAgICAgICBpZih1aVNlcnZpY2UgPT0gbnVsbClcbiAgICAgICAge1xuICAgICAgICAgICAgdWlTZXJ2aWNlID0gbmV3IFVJU2VydmljZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1aVNlcnZpY2U7XG4gICAgfVxuXG4gICAgVUlBY3RpdmF0b3JQcm90by5jaGF0QWRkRXJyb3IgPSBmdW5jdGlvbihlcnJvck1lc3NhZ2UsIG9yaWdpbmFsVGV4dClcbiAgICB7XG4gICAgICAgIHJldHVybiBDaGF0LmNoYXRBZGRFcnJvcihlcnJvck1lc3NhZ2UsIG9yaWdpbmFsVGV4dCk7XG4gICAgfVxuXG4gICAgVUlBY3RpdmF0b3JQcm90by5jaGF0U2V0U3ViamVjdCA9IGZ1bmN0aW9uKHRleHQpXG4gICAge1xuICAgICAgICByZXR1cm4gQ2hhdC5jaGF0U2V0U3ViamVjdCh0ZXh0KTtcbiAgICB9XG5cbiAgICBVSUFjdGl2YXRvclByb3RvLnVwZGF0ZUNoYXRDb252ZXJzYXRpb24gPSBmdW5jdGlvbiAoZnJvbSwgZGlzcGxheU5hbWUsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIENoYXQudXBkYXRlQ2hhdENvbnZlcnNhdGlvbihmcm9tLCBkaXNwbGF5TmFtZSwgbWVzc2FnZSk7XG4gICAgfVxuXG5cbiAgICBVSUFjdGl2YXRvclByb3RvLmFkZE5pY2tuYW1lTGlzdGVuZXIgPSBmdW5jdGlvbihsaXN0ZW5lcilcbiAgICB7XG5cbiAgICB9XG5cbiAgICByZXR1cm4gVUlBY3RpdmF0b3JQcm90bztcbn0oKTtcblxubW9kdWxlLmV4cG9ydHMgPSBVSUFjdGl2YXRvcjtcblxuIiwidmFyIEF1ZGlvTGV2ZWxzID0gcmVxdWlyZShcIi4vYXVkaW9sZXZlbHMvQXVkaW9MZXZlbHMuanNcIik7XG52YXIgRXRoZXJwYWQgPSByZXF1aXJlKFwiLi9ldGhlcnBhZC9FdGhlcnBhZC5qc1wiKTtcbnZhciBWaWRlb0xheW91dCA9IHJlcXVpcmUoXCIuL1ZpZGVvTGF5b3V0LmpzXCIpO1xudmFyIFRvb2xiYXIgPSByZXF1aXJlKFwiLi90b29sYmFycy90b29sYmFyLmpzXCIpO1xudmFyIFRvb2xiYXJUb2dnbGVyID0gcmVxdWlyZShcIi4vdG9vbGJhcnMvdG9vbGJhcl90b2dnbGVyLmpzXCIpO1xudmFyIENvbnRhY3RMaXN0ID0gcmVxdWlyZShcIi4vQ29udGFjdExpc3RcIik7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKTtcblxudmFyIFVJU2VydmljZSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIGV2ZW50RW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICAgIHZhciBuaWNrbmFtZSA9IG51bGw7XG5cbiAgICB2YXIgcm9vbU5hbWUgPSBudWxsO1xuXG4gICAgZnVuY3Rpb24gVUlTZXJ2aWNlUHJvdG8oKSB7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLnVwZGF0ZUF1ZGlvTGV2ZWxDYW52YXMgPSBmdW5jdGlvbiAocGVlckppZCkge1xuICAgICAgICBBdWRpb0xldmVscy51cGRhdGVBdWRpb0xldmVsQ2FudmFzKHBlZXJKaWQpO1xuICAgIH1cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5pbml0RXRoZXJwYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIEV0aGVycGFkLmluaXQoKTtcbiAgICB9XG5cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5jaGVja0NoYW5nZUxhcmdlVmlkZW8gPSBmdW5jdGlvbiAocmVtb3ZlZFZpZGVvU3JjKSB7XG4gICAgICAgIFZpZGVvTGF5b3V0LmNoZWNrQ2hhbmdlTGFyZ2VWaWRlbyhyZW1vdmVkVmlkZW9TcmMpO1xuICAgIH1cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5vbk11Y0pvaW5lZCA9IGZ1bmN0aW9uIChqaWQsIGluZm8sIG5vTWVtYmVycykge1xuICAgICAgICBUb29sYmFyLnVwZGF0ZVJvb21Vcmwod2luZG93LmxvY2F0aW9uLmhyZWYpO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9jYWxOaWNrJykuYXBwZW5kQ2hpbGQoXG4gICAgICAgICAgICBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpICsgJyAobWUpJylcbiAgICAgICAgKTtcblxuICAgICAgICBpZiAobm9NZW1iZXJzKSB7XG4gICAgICAgICAgICBUb29sYmFyLnNob3dTaXBDYWxsQnV0dG9uKHRydWUpO1xuICAgICAgICAgICAgVG9vbGJhci5zaG93UmVjb3JkaW5nQnV0dG9uKGZhbHNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghZm9jdXMpIHtcbiAgICAgICAgICAgIFRvb2xiYXIuc2hvd1NpcENhbGxCdXR0b24oZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZvY3VzICYmIGNvbmZpZy5ldGhlcnBhZF9iYXNlKSB7XG4gICAgICAgICAgICB0aGlzLmluaXRFdGhlcnBhZCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0ZvY3VzSW5kaWNhdG9yKCk7XG5cbiAgICAgICAgLy8gQWRkIG15c2VsZiB0byB0aGUgY29udGFjdCBsaXN0LlxuICAgICAgICBDb250YWN0TGlzdC5hZGRDb250YWN0KGppZCk7XG5cbiAgICAgICAgLy8gT25jZSB3ZSd2ZSBqb2luZWQgdGhlIG11YyBzaG93IHRoZSB0b29sYmFyXG4gICAgICAgIFRvb2xiYXJUb2dnbGVyLnNob3dUb29sYmFyKCk7XG5cbiAgICAgICAgaWYgKGluZm8uZGlzcGxheU5hbWUpXG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdkaXNwbGF5bmFtZWNoYW5nZWQnLFxuICAgICAgICAgICAgICAgIFsnbG9jYWxWaWRlb0NvbnRhaW5lcicsIGluZm8uZGlzcGxheU5hbWUgKyAnIChtZSknXSk7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLm9uTXVjRW50ZXJlZCA9IGZ1bmN0aW9uIChqaWQsIGluZm8sIHByZXMpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2VudGVyZWQnLCBqaWQsIGluZm8pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdpcyBmb2N1cz8nICsgZm9jdXMgPyAndHJ1ZScgOiAnZmFsc2UnKTtcblxuICAgICAgICAvLyBBZGQgUGVlcidzIGNvbnRhaW5lclxuICAgICAgICBWaWRlb0xheW91dC5lbnN1cmVQZWVyQ29udGFpbmVyRXhpc3RzKGppZCk7XG5cbiAgICAgICAgaWYgKGZvY3VzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAvLyBGSVhNRTogdGhpcyBzaG91bGQgcHJlcGFyZSB0aGUgdmlkZW9cbiAgICAgICAgICAgIGlmIChmb2N1cy5jb25maWQgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbWFrZSBuZXcgY29uZmVyZW5jZSB3aXRoJywgamlkKTtcbiAgICAgICAgICAgICAgICBUb29sYmFyLnNob3dSZWNvcmRpbmdCdXR0b24odHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoVG9vbGJhci5zaGFyZWRLZXkpIHtcbiAgICAgICAgICAgIFRvb2xiYXIudXBkYXRlTG9ja0J1dHRvbigpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLm9uTXVjUHJlc2VuY2VTdGF0dXMgPSBmdW5jdGlvbiAoIGppZCwgaW5mbywgcHJlcykge1xuICAgICAgICBWaWRlb0xheW91dC5zZXRQcmVzZW5jZVN0YXR1cyhcbiAgICAgICAgICAgICAgICAncGFydGljaXBhbnRfJyArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGppZCksIGluZm8uc3RhdHVzKTtcbiAgICB9XG5cbiAgICBVSVNlcnZpY2VQcm90by5wcm90b3R5cGUub25NdWNMZWZ0ID0gZnVuY3Rpb24oamlkKVxuICAgIHtcbiAgICAgICAgLy8gTmVlZCB0byBjYWxsIHRoaXMgd2l0aCBhIHNsaWdodCBkZWxheSwgb3RoZXJ3aXNlIHRoZSBlbGVtZW50IGNvdWxkbid0IGJlXG4gICAgICAgIC8vIGZvdW5kIGZvciBzb21lIHJlYXNvbi5cbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFxuICAgICAgICAgICAgICAgICAgICAncGFydGljaXBhbnRfJyArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGppZCkpO1xuICAgICAgICAgICAgaWYgKGNvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgIC8vIGhpZGUgaGVyZSwgd2FpdCBmb3IgdmlkZW8gdG8gY2xvc2UgYmVmb3JlIHJlbW92aW5nXG4gICAgICAgICAgICAgICAgJChjb250YWluZXIpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5yZXNpemVUaHVtYm5haWxzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIDEwKTtcblxuICAgICAgICAvLyBVbmxvY2sgbGFyZ2UgdmlkZW9cbiAgICAgICAgaWYgKFZpZGVvTGF5b3V0LmZvY3VzZWRWaWRlb1NyYylcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKGdldEppZEZyb21WaWRlb1NyYyhWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMpID09PSBqaWQpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKFwiRm9jdXNlZCB2aWRlbyBvd25lciBoYXMgbGVmdCB0aGUgY29uZmVyZW5jZVwiKTtcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICB9XG4gICAgXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLnVwZGF0ZUJ1dHRvbnMgPSBmdW5jdGlvbiAocmVjb3JkaW5nLCBzaXApIHtcbiAgICAgICAgaWYocmVjb3JkaW5nICE9IG51bGwpXG4gICAgICAgIHtcbiAgICAgICAgICAgIFRvb2xiYXIuc2hvd1JlY29yZGluZ0J1dHRvbihyZWNvcmRpbmcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoc2lwICE9IG51bGwpXG4gICAgICAgIHtcbiAgICAgICAgICAgIFRvb2xiYXIuc2hvd1NpcENhbGxCdXR0b24oc2lwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5nZXRDcmVkZW50aWFscyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNyZWRlbnRpYWxzID0ge307XG4gICAgICAgIGNyZWRlbnRpYWxzLmppZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqaWQnKS52YWx1ZVxuICAgICAgICAgICAgfHwgY29uZmlnLmhvc3RzLmFub255bW91c2RvbWFpblxuICAgICAgICAgICAgfHwgY29uZmlnLmhvc3RzLmRvbWFpbiB8fCB3aW5kb3cubG9jYXRpb24uaG9zdG5hbWU7XG5cbiAgICAgICAgY3JlZGVudGlhbHMuYm9zaCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdib3NoVVJMJykudmFsdWUgfHwgY29uZmlnLmJvc2ggfHwgJy9odHRwLWJpbmQnO1xuICAgICAgICBjcmVkZW50aWFscy5wYXNzd29yZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwYXNzd29yZCcpLnZhbHVlO1xuICAgICAgICByZXR1cm4gY3JlZGVudGlhbHM7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLmFkZE5pY2tuYW1lTGlzdGVuZXIgPSBmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgZXZlbnRFbWl0dGVyLm9uKFwibmlja19jaGFuZ2VkXCIsIGxpc3RlbmVyKTtcbiAgICAgICAgZXZlbnRFbWl0dGVyLmVtaXQoXCJuaWNrX2NoYW5nZWRcIiwgbmlja25hbWUpO1xuXG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLnJlbW92ZU5pY2tuYW1lTGlzdGVuZXIgPSBmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgZXZlbnRFbWl0dGVyLnJlbW92ZUxpc3RlbmVyKFwibmlja19jaGFuZ2VkXCIsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICBVSVNlcnZpY2VQcm90by5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIGV2ZW50RW1pdHRlci5yZW1vdmVBbGxMaXN0ZW5lcnMoXCJzdGF0aXN0aWNzLmF1ZGlvTGV2ZWxcIik7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLnNldE5pY2tuYW1lID0gZnVuY3Rpb24odmFsdWUpXG4gICAge1xuICAgICAgICBuaWNrbmFtZSA9IHZhbHVlO1xuICAgICAgICBldmVudEVtaXR0ZXIuZW1pdChcIm5pY2tfY2hhbmdlZFwiLCB2YWx1ZSk7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLmdldE5pY2tuYW1lID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmlja25hbWU7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLmdlbmVyYXRlUm9vbU5hbWUgPSBmdW5jdGlvbiAoYXV0aGVudGljYXRlZFVzZXIpIHtcbiAgICAgICAgdmFyIHJvb21ub2RlID0gbnVsbDtcbiAgICAgICAgdmFyIHBhdGggPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWU7XG4gICAgICAgIHZhciByb29tamlkO1xuXG4gICAgICAgIC8vIGRldGVybWluZGUgdGhlIHJvb20gbm9kZSBmcm9tIHRoZSB1cmxcbiAgICAgICAgLy8gVE9ETzoganVzdCB0aGUgcm9vbW5vZGUgb3IgdGhlIHdob2xlIGJhcmUgamlkP1xuICAgICAgICBpZiAoY29uZmlnLmdldHJvb21ub2RlICYmIHR5cGVvZiBjb25maWcuZ2V0cm9vbW5vZGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIC8vIGN1c3RvbSBmdW5jdGlvbiBtaWdodCBiZSByZXNwb25zaWJsZSBmb3IgZG9pbmcgdGhlIHB1c2hzdGF0ZVxuICAgICAgICAgICAgcm9vbW5vZGUgPSBjb25maWcuZ2V0cm9vbW5vZGUocGF0aCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvKiBmYWxsIGJhY2sgdG8gZGVmYXVsdCBzdHJhdGVneVxuICAgICAgICAgICAgICogdGhpcyBpcyBtYWtpbmcgYXNzdW1wdGlvbnMgYWJvdXQgaG93IHRoZSBVUkwtPnJvb20gbWFwcGluZyBoYXBwZW5zLlxuICAgICAgICAgICAgICogSXQgY3VycmVudGx5IGFzc3VtZXMgZGVwbG95bWVudCBhdCByb290LCB3aXRoIGEgcmV3cml0ZSBsaWtlIHRoZVxuICAgICAgICAgICAgICogZm9sbG93aW5nIG9uZSAoZm9yIG5naW54KTpcbiAgICAgICAgICAgICBsb2NhdGlvbiB+IF4vKFthLXpBLVowLTldKykkIHtcbiAgICAgICAgICAgICByZXdyaXRlIF4vKC4qKSQgLyBicmVhaztcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlmIChwYXRoLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICByb29tbm9kZSA9IHBhdGguc3Vic3RyKDEpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciB3b3JkID0gUm9vbU5hbWVHZW5lcmF0b3IuZ2VuZXJhdGVSb29tV2l0aG91dFNlcGFyYXRvcigzKTtcbiAgICAgICAgICAgICAgICByb29tbm9kZSA9IHdvcmQudG9Mb3dlckNhc2UoKTtcblxuICAgICAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSgnVmlkZW9DaGF0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdSb29tOiAnICsgd29yZCwgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lICsgd29yZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByb29tTmFtZSA9IHJvb21ub2RlICsgJ0AnICsgY29uZmlnLmhvc3RzLm11YztcblxuICAgICAgICB2YXIgcm9vbWppZCA9IHJvb21OYW1lO1xuXG4gICAgICAgIGlmIChjb25maWcudXNlTmlja3MpIHtcbiAgICAgICAgICAgIHZhciBuaWNrID0gd2luZG93LnByb21wdCgnWW91ciBuaWNrbmFtZSAob3B0aW9uYWwpJyk7XG4gICAgICAgICAgICBpZiAobmljaykge1xuICAgICAgICAgICAgICAgIHJvb21qaWQgKz0gJy8nICsgbmljaztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcm9vbWppZCArPSAnLycgKyBTdHJvcGhlLmdldE5vZGVGcm9tSmlkKGNvbm5lY3Rpb24uamlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgdmFyIHRtcEppZCA9IFN0cm9waGUuZ2V0Tm9kZUZyb21KaWQoY29ubmVjdGlvbi5qaWQpO1xuXG4gICAgICAgICAgICBpZighYXV0aGVudGljYXRlZFVzZXIpXG4gICAgICAgICAgICAgICAgdG1wSmlkID0gdG1wSmlkLnN1YnN0cigwLCA4KTtcblxuICAgICAgICAgICAgcm9vbWppZCArPSAnLycgKyB0bXBKaWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJvb21qaWQ7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLmdldFJvb21OYW1lID0gZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgcmV0dXJuIHJvb21OYW1lO1xuICAgIH1cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5zaG93TG9naW5Qb3B1cCA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICBjb25zb2xlLmxvZygncGFzc3dvcmQgaXMgcmVxdWlyZWQnKTtcblxuICAgICAgICBtZXNzYWdlSGFuZGxlci5vcGVuVHdvQnV0dG9uRGlhbG9nKG51bGwsXG4gICAgICAgICAgICAgICAgJzxoMj5QYXNzd29yZCByZXF1aXJlZDwvaDI+JyArXG4gICAgICAgICAgICAgICAgJzxpbnB1dCBpZD1cInBhc3N3b3JkcmVxdWlyZWQudXNlcm5hbWVcIiB0eXBlPVwidGV4dFwiIHBsYWNlaG9sZGVyPVwidXNlckBkb21haW4ubmV0XCIgYXV0b2ZvY3VzPicgK1xuICAgICAgICAgICAgICAgICc8aW5wdXQgaWQ9XCJwYXNzd29yZHJlcXVpcmVkLnBhc3N3b3JkXCIgdHlwZT1cInBhc3N3b3JkXCIgcGxhY2Vob2xkZXI9XCJ1c2VyIHBhc3N3b3JkXCI+JyxcbiAgICAgICAgICAgIHRydWUsXG4gICAgICAgICAgICBcIk9rXCIsXG4gICAgICAgICAgICBmdW5jdGlvbiAoZSwgdiwgbSwgZikge1xuICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB1c2VybmFtZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwYXNzd29yZHJlcXVpcmVkLnVzZXJuYW1lJyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXNzd29yZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwYXNzd29yZHJlcXVpcmVkLnBhc3N3b3JkJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHVzZXJuYW1lLnZhbHVlICE9PSBudWxsICYmIHBhc3N3b3JkLnZhbHVlICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHVzZXJuYW1lLnZhbHVlLCBwYXNzd29yZC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Bhc3N3b3JkcmVxdWlyZWQudXNlcm5hbWUnKS5mb2N1cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5kaXNhYmxlQ29ubmVjdCA9IGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb25uZWN0JykuZGlzYWJsZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5zaG93TG9ja1BvcHVwID0gZnVuY3Rpb24gKGppZCwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc29sZS5sb2coJ29uIHBhc3N3b3JkIHJlcXVpcmVkJywgamlkKTtcblxuICAgICAgICBtZXNzYWdlSGFuZGxlci5vcGVuVHdvQnV0dG9uRGlhbG9nKG51bGwsXG4gICAgICAgICAgICAgICAgJzxoMj5QYXNzd29yZCByZXF1aXJlZDwvaDI+JyArXG4gICAgICAgICAgICAgICAgJzxpbnB1dCBpZD1cImxvY2tLZXlcIiB0eXBlPVwidGV4dFwiIHBsYWNlaG9sZGVyPVwic2hhcmVkIGtleVwiIGF1dG9mb2N1cz4nLFxuICAgICAgICAgICAgdHJ1ZSxcbiAgICAgICAgICAgIFwiT2tcIixcbiAgICAgICAgICAgIGZ1bmN0aW9uIChlLCB2LCBtLCBmKSB7XG4gICAgICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxvY2tLZXkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9ja0tleScpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobG9ja0tleS52YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0U2hhcmVkS2V5KGxvY2tLZXkudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soamlkLCBsb2NrS2V5LnZhbHVlKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsb2NrS2V5JykuZm9jdXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG5cblxuICAgIHJldHVybiBVSVNlcnZpY2VQcm90bztcbn0oKTtcbm1vZHVsZS5leHBvcnRzID0gVUlTZXJ2aWNlOyIsIlxudmFyIFVJVXRpbCA9IChmdW5jdGlvbiAobXkpIHtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGF2YWlsYWJsZSB2aWRlbyB3aWR0aC5cbiAgICAgKi9cbiAgICBteS5nZXRBdmFpbGFibGVWaWRlb1dpZHRoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY2hhdHNwYWNlV2lkdGhcbiAgICAgICAgICAgID0gJCgnI2NoYXRzcGFjZScpLmlzKFwiOnZpc2libGVcIilcbiAgICAgICAgICAgID8gJCgnI2NoYXRzcGFjZScpLndpZHRoKClcbiAgICAgICAgICAgIDogMDtcblxuICAgICAgICByZXR1cm4gd2luZG93LmlubmVyV2lkdGggLSBjaGF0c3BhY2VXaWR0aDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIG15O1xuXG59KShVSVV0aWwgfHwge30pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFVJVXRpbDsiLCJ2YXIgZGVwID1cbntcbiAgICBcIlJUQ0Jyb3dzZXJUeXBlXCI6IGZ1bmN0aW9uKCl7IHJldHVybiByZXF1aXJlKFwiLi4vc2VydmljZS9SVEMvUlRDQnJvd3NlclR5cGUuanNcIil9LFxuICAgIFwiVUlBY3RpdmF0b3JcIjogZnVuY3Rpb24oKXsgcmV0dXJuIHJlcXVpcmUoXCIuL1VJQWN0aXZhdG9yLmpzXCIpfSxcbiAgICBcIkNoYXRcIjogZnVuY3Rpb24oKXsgcmV0dXJuIHJlcXVpcmUoXCIuL2NoYXQvQ2hhdFwiKX0sXG4gICAgXCJVSVV0aWxcIjogZnVuY3Rpb24oKXsgcmV0dXJuIHJlcXVpcmUoXCIuL1VJVXRpbC5qc1wiKX0sXG4gICAgXCJDb250YWN0TGlzdFwiOiBmdW5jdGlvbigpeyByZXR1cm4gcmVxdWlyZShcIi4vQ29udGFjdExpc3RcIil9LFxuICAgIFwiVG9vbGJhclwiOiBmdW5jdGlvbigpeyByZXR1cm4gcmVxdWlyZShcIi4vdG9vbGJhcnMvdG9vbGJhcl90b2dnbGVyXCIpfVxufVxuXG52YXIgVmlkZW9MYXlvdXQgPSAoZnVuY3Rpb24gKG15KSB7XG4gICAgdmFyIHByZU11dGVkID0gZmFsc2U7XG4gICAgdmFyIGN1cnJlbnREb21pbmFudFNwZWFrZXIgPSBudWxsO1xuICAgIHZhciBsYXN0TkNvdW50ID0gY29uZmlnLmNoYW5uZWxMYXN0TjtcbiAgICB2YXIgbGFzdE5FbmRwb2ludHNDYWNoZSA9IFtdO1xuICAgIHZhciBsYXJnZVZpZGVvTmV3U3JjID0gJyc7XG4gICAgdmFyIGJyb3dzZXIgPSBudWxsO1xuICAgIHZhciBmbGlwWExvY2FsVmlkZW8gPSB0cnVlO1xuICAgIG15LmN1cnJlbnRWaWRlb1dpZHRoID0gbnVsbDtcbiAgICBteS5jdXJyZW50VmlkZW9IZWlnaHQgPSBudWxsO1xuXG4gICAgdmFyIG11dGVkQXVkaW9zID0ge307XG4gICAgLyoqXG4gICAgICogQ3VycmVudGx5IGZvY3VzZWQgdmlkZW8gXCJzcmNcIihkaXNwbGF5ZWQgaW4gbGFyZ2UgdmlkZW8pLlxuICAgICAqIEB0eXBlIHtTdHJpbmd9XG4gICAgICovXG4gICAgbXkuZm9jdXNlZFZpZGVvU3JjID0gbnVsbDtcblxuICAgIGZ1bmN0aW9uIGF0dGFjaE1lZGlhU3RyZWFtKGVsZW1lbnQsIHN0cmVhbSkge1xuICAgICAgICBpZihicm93c2VyID09IG51bGwpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGJyb3dzZXIgPSBkZXAuVUlBY3RpdmF0b3IoKS5nZXRSVENTZXJ2aWNlKCkuZ2V0QnJvd3NlclR5cGUoKTtcbiAgICAgICAgfVxuICAgICAgICBzd2l0Y2ggKGJyb3dzZXIpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNhc2UgZGVwLlJUQ0Jyb3dzZXJUeXBlKCkuUlRDX0JST1dTRVJfQ0hST01FOlxuICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cignc3JjJywgd2Via2l0VVJMLmNyZWF0ZU9iamVjdFVSTChzdHJlYW0pKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgZGVwLlJUQ0Jyb3dzZXJUeXBlKCkuUlRDX0JST1dTRVJfRklSRUZPWDpcbiAgICAgICAgICAgICAgICBlbGVtZW50WzBdLm1velNyY09iamVjdCA9IHN0cmVhbTtcbiAgICAgICAgICAgICAgICBlbGVtZW50WzBdLnBsYXkoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJVbmtub3duIGJyb3dzZXIuXCIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbXkuY2hhbmdlTG9jYWxBdWRpbyA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgICBjb25uZWN0aW9uLmppbmdsZS5sb2NhbEF1ZGlvID0gc3RyZWFtO1xuXG4gICAgICAgIGF0dGFjaE1lZGlhU3RyZWFtKCQoJyNsb2NhbEF1ZGlvJyksIHN0cmVhbSk7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsb2NhbEF1ZGlvJykuYXV0b3BsYXkgPSB0cnVlO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9jYWxBdWRpbycpLnZvbHVtZSA9IDA7XG4gICAgICAgIGlmIChwcmVNdXRlZCkge1xuICAgICAgICAgICAgdG9nZ2xlQXVkaW8oKTtcbiAgICAgICAgICAgIHByZU11dGVkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgbXkuY2hhbmdlTG9jYWxWaWRlbyA9IGZ1bmN0aW9uKHN0cmVhbSwgZmxpcFgpIHtcbiAgICAgICAgY29ubmVjdGlvbi5qaW5nbGUubG9jYWxWaWRlbyA9IHN0cmVhbTtcblxuICAgICAgICB2YXIgbG9jYWxWaWRlbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3ZpZGVvJyk7XG4gICAgICAgIGxvY2FsVmlkZW8uaWQgPSAnbG9jYWxWaWRlb18nICsgc3RyZWFtLmlkO1xuICAgICAgICBsb2NhbFZpZGVvLmF1dG9wbGF5ID0gdHJ1ZTtcbiAgICAgICAgbG9jYWxWaWRlby52b2x1bWUgPSAwOyAvLyBpcyBpdCByZXF1aXJlZCBpZiBhdWRpbyBpcyBzZXBhcmF0ZWQgP1xuICAgICAgICBsb2NhbFZpZGVvLm9uY29udGV4dG1lbnUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBmYWxzZTsgfTtcblxuICAgICAgICB2YXIgbG9jYWxWaWRlb0NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsb2NhbFZpZGVvV3JhcHBlcicpO1xuICAgICAgICBsb2NhbFZpZGVvQ29udGFpbmVyLmFwcGVuZENoaWxkKGxvY2FsVmlkZW8pO1xuXG4gICAgICAgIC8vIFNldCBkZWZhdWx0IGRpc3BsYXkgbmFtZS5cbiAgICAgICAgc2V0RGlzcGxheU5hbWUoJ2xvY2FsVmlkZW9Db250YWluZXInKTtcblxuICAgICAgICBkZXAuVUlBY3RpdmF0b3IoKS5nZXRVSVNlcnZpY2UoKS51cGRhdGVBdWRpb0xldmVsQ2FudmFzKCk7XG5cbiAgICAgICAgdmFyIGxvY2FsVmlkZW9TZWxlY3RvciA9ICQoJyMnICsgbG9jYWxWaWRlby5pZCk7XG4gICAgICAgIC8vIEFkZCBjbGljayBoYW5kbGVyIHRvIGJvdGggdmlkZW8gYW5kIHZpZGVvIHdyYXBwZXIgZWxlbWVudHMgaW4gY2FzZVxuICAgICAgICAvLyB0aGVyZSdzIG5vIHZpZGVvLlxuICAgICAgICBsb2NhbFZpZGVvU2VsZWN0b3IuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuaGFuZGxlVmlkZW9UaHVtYkNsaWNrZWQobG9jYWxWaWRlby5zcmMpO1xuICAgICAgICB9KTtcbiAgICAgICAgJCgnI2xvY2FsVmlkZW9Db250YWluZXInKS5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5oYW5kbGVWaWRlb1RodW1iQ2xpY2tlZChsb2NhbFZpZGVvLnNyYyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBob3ZlciBoYW5kbGVyXG4gICAgICAgICQoJyNsb2NhbFZpZGVvQ29udGFpbmVyJykuaG92ZXIoXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zaG93RGlzcGxheU5hbWUoJ2xvY2FsVmlkZW9Db250YWluZXInLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiAoIVZpZGVvTGF5b3V0LmlzTGFyZ2VWaWRlb1Zpc2libGUoKVxuICAgICAgICAgICAgICAgICAgICAgICAgfHwgbG9jYWxWaWRlby5zcmMgIT09ICQoJyNsYXJnZVZpZGVvJykuYXR0cignc3JjJykpXG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dEaXNwbGF5TmFtZSgnbG9jYWxWaWRlb0NvbnRhaW5lcicsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgLy8gQWRkIHN0cmVhbSBlbmRlZCBoYW5kbGVyXG4gICAgICAgIHN0cmVhbS5vbmVuZGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgbG9jYWxWaWRlb0NvbnRhaW5lci5yZW1vdmVDaGlsZChsb2NhbFZpZGVvKTtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZVJlbW92ZWRWaWRlbyhsb2NhbFZpZGVvLnNyYyk7XG4gICAgICAgIH07XG4gICAgICAgIC8vIEZsaXAgdmlkZW8geCBheGlzIGlmIG5lZWRlZFxuICAgICAgICBmbGlwWExvY2FsVmlkZW8gPSBmbGlwWDtcbiAgICAgICAgaWYgKGZsaXBYKSB7XG4gICAgICAgICAgICBsb2NhbFZpZGVvU2VsZWN0b3IuYWRkQ2xhc3MoXCJmbGlwVmlkZW9YXCIpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEF0dGFjaCBXZWJSVEMgc3RyZWFtXG4gICAgICAgIGF0dGFjaE1lZGlhU3RyZWFtKGxvY2FsVmlkZW9TZWxlY3Rvciwgc3RyZWFtKTtcblxuICAgICAgICBsb2NhbFZpZGVvU3JjID0gbG9jYWxWaWRlby5zcmM7XG5cbiAgICAgICAgVmlkZW9MYXlvdXQudXBkYXRlTGFyZ2VWaWRlbyhsb2NhbFZpZGVvU3JjLCAwKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHJlbW92ZWQgdmlkZW8gaXMgY3VycmVudGx5IGRpc3BsYXllZCBhbmQgdHJpZXMgdG8gZGlzcGxheVxuICAgICAqIGFub3RoZXIgb25lIGluc3RlYWQuXG4gICAgICogQHBhcmFtIHJlbW92ZWRWaWRlb1NyYyBzcmMgc3RyZWFtIGlkZW50aWZpZXIgb2YgdGhlIHZpZGVvLlxuICAgICAqL1xuICAgIG15LnVwZGF0ZVJlbW92ZWRWaWRlbyA9IGZ1bmN0aW9uKHJlbW92ZWRWaWRlb1NyYykge1xuICAgICAgICBpZiAocmVtb3ZlZFZpZGVvU3JjID09PSAkKCcjbGFyZ2VWaWRlbycpLmF0dHIoJ3NyYycpKSB7XG4gICAgICAgICAgICAvLyB0aGlzIGlzIGN1cnJlbnRseSBkaXNwbGF5ZWQgYXMgbGFyZ2VcbiAgICAgICAgICAgIC8vIHBpY2sgdGhlIGxhc3QgdmlzaWJsZSB2aWRlbyBpbiB0aGUgcm93XG4gICAgICAgICAgICAvLyBpZiBub2JvZHkgZWxzZSBpcyBsZWZ0LCB0aGlzIHBpY2tzIHRoZSBsb2NhbCB2aWRlb1xuICAgICAgICAgICAgdmFyIHBpY2tcbiAgICAgICAgICAgICAgICA9ICQoJyNyZW1vdGVWaWRlb3M+c3BhbltpZCE9XCJtaXhlZHN0cmVhbVwiXTp2aXNpYmxlOmxhc3Q+dmlkZW8nKVxuICAgICAgICAgICAgICAgICAgICAuZ2V0KDApO1xuXG4gICAgICAgICAgICBpZiAoIXBpY2spIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oXCJMYXN0IHZpc2libGUgdmlkZW8gbm8gbG9uZ2VyIGV4aXN0c1wiKTtcbiAgICAgICAgICAgICAgICBwaWNrID0gJCgnI3JlbW90ZVZpZGVvcz5zcGFuW2lkIT1cIm1peGVkc3RyZWFtXCJdPnZpZGVvJykuZ2V0KDApO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFwaWNrIHx8ICFwaWNrLnNyYykge1xuICAgICAgICAgICAgICAgICAgICAvLyBUcnkgbG9jYWwgdmlkZW9cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKFwiRmFsbGJhY2sgdG8gbG9jYWwgdmlkZW8uLi5cIik7XG4gICAgICAgICAgICAgICAgICAgIHBpY2sgPSAkKCcjcmVtb3RlVmlkZW9zPnNwYW4+c3Bhbj52aWRlbycpLmdldCgwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIG11dGUgaWYgbG9jYWx2aWRlb1xuICAgICAgICAgICAgaWYgKHBpY2spIHtcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC51cGRhdGVMYXJnZVZpZGVvKHBpY2suc3JjLCBwaWNrLnZvbHVtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkZhaWxlZCB0byBlbGVjdCBsYXJnZSB2aWRlb1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBsYXJnZSB2aWRlbyB3aXRoIHRoZSBnaXZlbiBuZXcgdmlkZW8gc291cmNlLlxuICAgICAqL1xuICAgIG15LnVwZGF0ZUxhcmdlVmlkZW8gPSBmdW5jdGlvbihuZXdTcmMsIHZvbCkge1xuICAgICAgICBjb25zb2xlLmxvZygnaG92ZXIgaW4nLCBuZXdTcmMpO1xuXG4gICAgICAgIGlmICgkKCcjbGFyZ2VWaWRlbycpLmF0dHIoJ3NyYycpICE9IG5ld1NyYykge1xuICAgICAgICAgICAgbGFyZ2VWaWRlb05ld1NyYyA9IG5ld1NyYztcblxuICAgICAgICAgICAgdmFyIGlzVmlzaWJsZSA9ICQoJyNsYXJnZVZpZGVvJykuaXMoJzp2aXNpYmxlJyk7XG5cbiAgICAgICAgICAgIC8vIHdlIG5lZWQgdGhpcyBoZXJlIGJlY2F1c2UgYWZ0ZXIgdGhlIGZhZGUgdGhlIHZpZGVvU3JjIG1heSBoYXZlXG4gICAgICAgICAgICAvLyBjaGFuZ2VkLlxuICAgICAgICAgICAgdmFyIGlzRGVza3RvcCA9IGlzVmlkZW9TcmNEZXNrdG9wKG5ld1NyYyk7XG5cbiAgICAgICAgICAgIHZhciB1c2VySmlkID0gZ2V0SmlkRnJvbVZpZGVvU3JjKG5ld1NyYyk7XG4gICAgICAgICAgICAvLyB3ZSB3YW50IHRoZSBub3RpZmljYXRpb24gdG8gdHJpZ2dlciBldmVuIGlmIHVzZXJKaWQgaXMgdW5kZWZpbmVkLFxuICAgICAgICAgICAgLy8gb3IgbnVsbC5cbiAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoXCJzZWxlY3RlZGVuZHBvaW50Y2hhbmdlZFwiLCBbdXNlckppZF0pO1xuXG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlbycpLmZhZGVPdXQoMzAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9sZFNyYyA9ICQodGhpcykuYXR0cignc3JjJyk7XG5cbiAgICAgICAgICAgICAgICAkKHRoaXMpLmF0dHIoJ3NyYycsIG5ld1NyYyk7XG5cbiAgICAgICAgICAgICAgICAvLyBTY3JlZW4gc3RyZWFtIGlzIGFscmVhZHkgcm90YXRlZFxuICAgICAgICAgICAgICAgIHZhciBmbGlwWCA9IChuZXdTcmMgPT09IGxvY2FsVmlkZW9TcmMpICYmIGZsaXBYTG9jYWxWaWRlbztcblxuICAgICAgICAgICAgICAgIHZhciB2aWRlb1RyYW5zZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsYXJnZVZpZGVvJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc3R5bGUud2Via2l0VHJhbnNmb3JtO1xuXG4gICAgICAgICAgICAgICAgaWYgKGZsaXBYICYmIHZpZGVvVHJhbnNmb3JtICE9PSAnc2NhbGVYKC0xKScpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xhcmdlVmlkZW8nKS5zdHlsZS53ZWJraXRUcmFuc2Zvcm1cbiAgICAgICAgICAgICAgICAgICAgICAgID0gXCJzY2FsZVgoLTEpXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKCFmbGlwWCAmJiB2aWRlb1RyYW5zZm9ybSA9PT0gJ3NjYWxlWCgtMSknKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsYXJnZVZpZGVvJykuc3R5bGUud2Via2l0VHJhbnNmb3JtXG4gICAgICAgICAgICAgICAgICAgICAgICA9IFwibm9uZVwiO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIENoYW5nZSB0aGUgd2F5IHdlJ2xsIGJlIG1lYXN1cmluZyBhbmQgcG9zaXRpb25pbmcgbGFyZ2UgdmlkZW9cblxuICAgICAgICAgICAgICAgIGdldFZpZGVvU2l6ZSA9IGlzRGVza3RvcFxuICAgICAgICAgICAgICAgICAgICA/IGdldERlc2t0b3BWaWRlb1NpemVcbiAgICAgICAgICAgICAgICAgICAgOiBWaWRlb0xheW91dC5nZXRDYW1lcmFWaWRlb1NpemU7XG4gICAgICAgICAgICAgICAgZ2V0VmlkZW9Qb3NpdGlvbiA9IGlzRGVza3RvcFxuICAgICAgICAgICAgICAgICAgICA/IGdldERlc2t0b3BWaWRlb1Bvc2l0aW9uXG4gICAgICAgICAgICAgICAgICAgIDogVmlkZW9MYXlvdXQuZ2V0Q2FtZXJhVmlkZW9Qb3NpdGlvbjtcblxuICAgICAgICAgICAgICAgIGlmIChpc1Zpc2libGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSBpZiB0aGUgbGFyZ2UgdmlkZW8gaXMgY3VycmVudGx5IHZpc2libGUuXG4gICAgICAgICAgICAgICAgICAgIC8vIERpc2FibGUgcHJldmlvdXMgZG9taW5hbnQgc3BlYWtlciB2aWRlby5cbiAgICAgICAgICAgICAgICAgICAgdmFyIG9sZEppZCA9IGdldEppZEZyb21WaWRlb1NyYyhvbGRTcmMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAob2xkSmlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgb2xkUmVzb3VyY2VKaWQgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChvbGRKaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuZW5hYmxlRG9taW5hbnRTcGVha2VyKG9sZFJlc291cmNlSmlkLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBFbmFibGUgbmV3IGRvbWluYW50IHNwZWFrZXIgaW4gdGhlIHJlbW90ZSB2aWRlb3Mgc2VjdGlvbi5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHVzZXJKaWQgPSBnZXRKaWRGcm9tVmlkZW9TcmMobmV3U3JjKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVzZXJKaWQpXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHVzZXJKaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuZW5hYmxlRG9taW5hbnRTcGVha2VyKHJlc291cmNlSmlkLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICQodGhpcykuZmFkZUluKDMwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhbiBhcnJheSBvZiB0aGUgdmlkZW8gaG9yaXpvbnRhbCBhbmQgdmVydGljYWwgaW5kZW50cy5cbiAgICAgKiBDZW50ZXJzIGhvcml6b250YWxseSBhbmQgdG9wIGFsaWducyB2ZXJ0aWNhbGx5LlxuICAgICAqXG4gICAgICogQHJldHVybiBhbiBhcnJheSB3aXRoIDIgZWxlbWVudHMsIHRoZSBob3Jpem9udGFsIGluZGVudCBhbmQgdGhlIHZlcnRpY2FsXG4gICAgICogaW5kZW50XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0RGVza3RvcFZpZGVvUG9zaXRpb24odmlkZW9XaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZUhlaWdodCkge1xuXG4gICAgICAgIHZhciBob3Jpem9udGFsSW5kZW50ID0gKHZpZGVvU3BhY2VXaWR0aCAtIHZpZGVvV2lkdGgpIC8gMjtcblxuICAgICAgICB2YXIgdmVydGljYWxJbmRlbnQgPSAwOy8vIFRvcCBhbGlnbmVkXG5cbiAgICAgICAgcmV0dXJuIFtob3Jpem9udGFsSW5kZW50LCB2ZXJ0aWNhbEluZGVudF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHZpZGVvIGlkZW50aWZpZWQgYnkgZ2l2ZW4gc3JjIGlzIGRlc2t0b3Agc3RyZWFtLlxuICAgICAqIEBwYXJhbSB2aWRlb1NyYyBlZy5cbiAgICAgKiBibG9iOmh0dHBzJTNBLy9wYXdlbC5qaXRzaS5uZXQvOWE0NmUwYmQtMTMxZS00ZDE4LTljMTQtYTkyNjRlOGRiMzk1XG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNWaWRlb1NyY0Rlc2t0b3AodmlkZW9TcmMpIHtcbiAgICAgICAgLy8gRklYTUU6IGZpeCB0aGlzIG1hcHBpbmcgbWVzcy4uLlxuICAgICAgICAvLyBmaWd1cmUgb3V0IGlmIGxhcmdlIHZpZGVvIGlzIGRlc2t0b3Agc3RyZWFtIG9yIGp1c3QgYSBjYW1lcmFcbiAgICAgICAgdmFyIGlzRGVza3RvcCA9IGZhbHNlO1xuICAgICAgICBpZiAobG9jYWxWaWRlb1NyYyA9PT0gdmlkZW9TcmMpIHtcbiAgICAgICAgICAgIC8vIGxvY2FsIHZpZGVvXG4gICAgICAgICAgICBpc0Rlc2t0b3AgPSBpc1VzaW5nU2NyZWVuU3RyZWFtO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRG8gd2UgaGF2ZSBhc3NvY2lhdGlvbnMuLi5cbiAgICAgICAgICAgIHZhciB2aWRlb1NzcmMgPSB2aWRlb1NyY1RvU3NyY1t2aWRlb1NyY107XG4gICAgICAgICAgICBpZiAodmlkZW9Tc3JjKSB7XG4gICAgICAgICAgICAgICAgdmFyIHZpZGVvVHlwZSA9IHNzcmMydmlkZW9UeXBlW3ZpZGVvU3NyY107XG4gICAgICAgICAgICAgICAgaWYgKHZpZGVvVHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBGaW5hbGx5IHRoZXJlLi4uXG4gICAgICAgICAgICAgICAgICAgIGlzRGVza3RvcCA9IHZpZGVvVHlwZSA9PT0gJ3NjcmVlbic7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIk5vIHZpZGVvIHR5cGUgZm9yIHNzcmM6IFwiICsgdmlkZW9Tc3JjKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJObyBzc3JjIGZvciBzcmM6IFwiICsgdmlkZW9TcmMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpc0Rlc2t0b3A7XG4gICAgfVxuXG5cbiAgICBteS5oYW5kbGVWaWRlb1RodW1iQ2xpY2tlZCA9IGZ1bmN0aW9uKHZpZGVvU3JjKSB7XG4gICAgICAgIC8vIFJlc3RvcmUgc3R5bGUgZm9yIHByZXZpb3VzbHkgZm9jdXNlZCB2aWRlb1xuICAgICAgICB2YXIgZm9jdXNKaWQgPSBnZXRKaWRGcm9tVmlkZW9TcmMoVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjKTtcbiAgICAgICAgdmFyIG9sZENvbnRhaW5lciA9IGdldFBhcnRpY2lwYW50Q29udGFpbmVyKGZvY3VzSmlkKTtcblxuICAgICAgICBpZiAob2xkQ29udGFpbmVyKSB7XG4gICAgICAgICAgICBvbGRDb250YWluZXIucmVtb3ZlQ2xhc3MoXCJ2aWRlb0NvbnRhaW5lckZvY3VzZWRcIik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVbmxvY2sgY3VycmVudCBmb2N1c2VkLiBcbiAgICAgICAgaWYgKFZpZGVvTGF5b3V0LmZvY3VzZWRWaWRlb1NyYyA9PT0gdmlkZW9TcmMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmZvY3VzZWRWaWRlb1NyYyA9IG51bGw7XG4gICAgICAgICAgICB2YXIgZG9taW5hbnRTcGVha2VyVmlkZW8gPSBudWxsO1xuICAgICAgICAgICAgLy8gRW5hYmxlIHRoZSBjdXJyZW50bHkgc2V0IGRvbWluYW50IHNwZWFrZXIuXG4gICAgICAgICAgICBpZiAoY3VycmVudERvbWluYW50U3BlYWtlcikge1xuICAgICAgICAgICAgICAgIGRvbWluYW50U3BlYWtlclZpZGVvXG4gICAgICAgICAgICAgICAgICAgID0gJCgnI3BhcnRpY2lwYW50XycgKyBjdXJyZW50RG9taW5hbnRTcGVha2VyICsgJz52aWRlbycpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZ2V0KDApO1xuXG4gICAgICAgICAgICAgICAgaWYgKGRvbWluYW50U3BlYWtlclZpZGVvKSB7XG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8oZG9taW5hbnRTcGVha2VyVmlkZW8uc3JjLCAxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIExvY2sgbmV3IHZpZGVvXG4gICAgICAgIFZpZGVvTGF5b3V0LmZvY3VzZWRWaWRlb1NyYyA9IHZpZGVvU3JjO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBmb2N1c2VkL3Bpbm5lZCBpbnRlcmZhY2UuXG4gICAgICAgIHZhciB1c2VySmlkID0gZ2V0SmlkRnJvbVZpZGVvU3JjKHZpZGVvU3JjKTtcbiAgICAgICAgaWYgKHVzZXJKaWQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBjb250YWluZXIgPSBnZXRQYXJ0aWNpcGFudENvbnRhaW5lcih1c2VySmlkKTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5hZGRDbGFzcyhcInZpZGVvQ29udGFpbmVyRm9jdXNlZFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXJzIGEgXCJ2aWRlby5zZWxlY3RlZFwiIGV2ZW50LiBUaGUgXCJmYWxzZVwiIHBhcmFtZXRlciBpbmRpY2F0ZXNcbiAgICAgICAgLy8gdGhpcyBpc24ndCBhIHByZXppLlxuICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKFwidmlkZW8uc2VsZWN0ZWRcIiwgW2ZhbHNlXSk7XG5cbiAgICAgICAgVmlkZW9MYXlvdXQudXBkYXRlTGFyZ2VWaWRlbyh2aWRlb1NyYywgMSk7XG5cbiAgICAgICAgJCgnYXVkaW8nKS5lYWNoKGZ1bmN0aW9uIChpZHgsIGVsKSB7XG4gICAgICAgICAgICBpZiAoZWwuaWQuaW5kZXhPZignbWl4ZWRtc2xhYmVsJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgZWwudm9sdW1lID0gMDtcbiAgICAgICAgICAgICAgICBlbC52b2x1bWUgPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUG9zaXRpb25zIHRoZSBsYXJnZSB2aWRlby5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB2aWRlb1dpZHRoIHRoZSBzdHJlYW0gdmlkZW8gd2lkdGhcbiAgICAgKiBAcGFyYW0gdmlkZW9IZWlnaHQgdGhlIHN0cmVhbSB2aWRlbyBoZWlnaHRcbiAgICAgKi9cbiAgICBteS5wb3NpdGlvbkxhcmdlID0gZnVuY3Rpb24gKHZpZGVvV2lkdGgsIHZpZGVvSGVpZ2h0KSB7XG4gICAgICAgIHZhciB2aWRlb1NwYWNlV2lkdGggPSAkKCcjdmlkZW9zcGFjZScpLndpZHRoKCk7XG4gICAgICAgIHZhciB2aWRlb1NwYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuXG4gICAgICAgIHZhciB2aWRlb1NpemUgPSBnZXRWaWRlb1NpemUodmlkZW9XaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZUhlaWdodCk7XG5cbiAgICAgICAgdmFyIGxhcmdlVmlkZW9XaWR0aCA9IHZpZGVvU2l6ZVswXTtcbiAgICAgICAgdmFyIGxhcmdlVmlkZW9IZWlnaHQgPSB2aWRlb1NpemVbMV07XG5cbiAgICAgICAgdmFyIHZpZGVvUG9zaXRpb24gPSBnZXRWaWRlb1Bvc2l0aW9uKGxhcmdlVmlkZW9XaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhcmdlVmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlSGVpZ2h0KTtcblxuICAgICAgICB2YXIgaG9yaXpvbnRhbEluZGVudCA9IHZpZGVvUG9zaXRpb25bMF07XG4gICAgICAgIHZhciB2ZXJ0aWNhbEluZGVudCA9IHZpZGVvUG9zaXRpb25bMV07XG5cbiAgICAgICAgcG9zaXRpb25WaWRlbygkKCcjbGFyZ2VWaWRlbycpLFxuICAgICAgICAgICAgICAgICAgICAgIGxhcmdlVmlkZW9XaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICBsYXJnZVZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgIGhvcml6b250YWxJbmRlbnQsIHZlcnRpY2FsSW5kZW50KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2hvd3MvaGlkZXMgdGhlIGxhcmdlIHZpZGVvLlxuICAgICAqL1xuICAgIG15LnNldExhcmdlVmlkZW9WaXNpYmxlID0gZnVuY3Rpb24oaXNWaXNpYmxlKSB7XG4gICAgICAgIHZhciBsYXJnZVZpZGVvSmlkID0gZ2V0SmlkRnJvbVZpZGVvU3JjKCQoJyNsYXJnZVZpZGVvJykuYXR0cignc3JjJykpO1xuICAgICAgICB2YXIgcmVzb3VyY2VKaWQgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChsYXJnZVZpZGVvSmlkKTtcblxuICAgICAgICBpZiAoaXNWaXNpYmxlKSB7XG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlbycpLmNzcyh7dmlzaWJpbGl0eTogJ3Zpc2libGUnfSk7XG4gICAgICAgICAgICAkKCcud2F0ZXJtYXJrJykuY3NzKHt2aXNpYmlsaXR5OiAndmlzaWJsZSd9KTtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmVuYWJsZURvbWluYW50U3BlYWtlcihyZXNvdXJjZUppZCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlbycpLmNzcyh7dmlzaWJpbGl0eTogJ2hpZGRlbid9KTtcbiAgICAgICAgICAgICQoJy53YXRlcm1hcmsnKS5jc3Moe3Zpc2liaWxpdHk6ICdoaWRkZW4nfSk7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5lbmFibGVEb21pbmFudFNwZWFrZXIocmVzb3VyY2VKaWQsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBJbmRpY2F0ZXMgaWYgdGhlIGxhcmdlIHZpZGVvIGlzIGN1cnJlbnRseSB2aXNpYmxlLlxuICAgICAqXG4gICAgICogQHJldHVybiA8dHQ+dHJ1ZTwvdHQ+IGlmIHZpc2libGUsIDx0dD5mYWxzZTwvdHQ+IC0gb3RoZXJ3aXNlXG4gICAgICovXG4gICAgbXkuaXNMYXJnZVZpZGVvVmlzaWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gJCgnI2xhcmdlVmlkZW8nKS5pcygnOnZpc2libGUnKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIGNvbnRhaW5lciBmb3IgcGFydGljaXBhbnQgaWRlbnRpZmllZCBieSBnaXZlbiBwZWVySmlkIGV4aXN0c1xuICAgICAqIGluIHRoZSBkb2N1bWVudCBhbmQgY3JlYXRlcyBpdCBldmVudHVhbGx5LlxuICAgICAqIFxuICAgICAqIEBwYXJhbSBwZWVySmlkIHBlZXIgSmlkIHRvIGNoZWNrLlxuICAgICAqIFxuICAgICAqIEByZXR1cm4gUmV0dXJucyA8dHQ+dHJ1ZTwvdHQ+IGlmIHRoZSBwZWVyIGNvbnRhaW5lciBleGlzdHMsXG4gICAgICogPHR0PmZhbHNlPC90dD4gLSBvdGhlcndpc2VcbiAgICAgKi9cbiAgICBteS5lbnN1cmVQZWVyQ29udGFpbmVyRXhpc3RzID0gZnVuY3Rpb24ocGVlckppZCkge1xuICAgICAgICBkZXAuQ29udGFjdExpc3QoKS5lbnN1cmVBZGRDb250YWN0KHBlZXJKaWQpO1xuXG4gICAgICAgIHZhciByZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHBlZXJKaWQpO1xuXG4gICAgICAgIHZhciB2aWRlb1NwYW5JZCA9ICdwYXJ0aWNpcGFudF8nICsgcmVzb3VyY2VKaWQ7XG5cbiAgICAgICAgaWYgKCQoJyMnICsgdmlkZW9TcGFuSWQpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIElmIHRoZXJlJ3MgYmVlbiBhIGZvY3VzIGNoYW5nZSwgbWFrZSBzdXJlIHdlIGFkZCBmb2N1cyByZWxhdGVkXG4gICAgICAgICAgICAvLyBpbnRlcmZhY2UhIVxuICAgICAgICAgICAgaWYgKGZvY3VzICYmICQoJyNyZW1vdGVfcG9wdXBtZW51XycgKyByZXNvdXJjZUppZCkubGVuZ3RoIDw9IDApXG4gICAgICAgICAgICAgICAgYWRkUmVtb3RlVmlkZW9NZW51KCBwZWVySmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodmlkZW9TcGFuSWQpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBjb250YWluZXJcbiAgICAgICAgICAgICAgICA9IFZpZGVvTGF5b3V0LmFkZFJlbW90ZVZpZGVvQ29udGFpbmVyKHBlZXJKaWQsIHZpZGVvU3BhbklkKTtcblxuICAgICAgICAgICAgLy8gU2V0IGRlZmF1bHQgZGlzcGxheSBuYW1lLlxuICAgICAgICAgICAgc2V0RGlzcGxheU5hbWUodmlkZW9TcGFuSWQpO1xuXG4gICAgICAgICAgICB2YXIgbmlja2ZpZWxkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgbmlja2ZpZWxkLmNsYXNzTmFtZSA9IFwibmlja1wiO1xuICAgICAgICAgICAgbmlja2ZpZWxkLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHJlc291cmNlSmlkKSk7XG4gICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQobmlja2ZpZWxkKTtcblxuICAgICAgICAgICAgLy8gSW4gY2FzZSB0aGlzIGlzIG5vdCBjdXJyZW50bHkgaW4gdGhlIGxhc3QgbiB3ZSBkb24ndCBzaG93IGl0LlxuICAgICAgICAgICAgaWYgKGxhc3ROQ291bnRcbiAgICAgICAgICAgICAgICAmJiBsYXN0TkNvdW50ID4gMFxuICAgICAgICAgICAgICAgICYmICQoJyNyZW1vdGVWaWRlb3M+c3BhbicpLmxlbmd0aCA+PSBsYXN0TkNvdW50ICsgMikge1xuICAgICAgICAgICAgICAgIHNob3dQZWVyQ29udGFpbmVyKHJlc291cmNlSmlkLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplVGh1bWJuYWlscygpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIG15LmFkZFJlbW90ZVZpZGVvQ29udGFpbmVyID0gZnVuY3Rpb24ocGVlckppZCwgc3BhbklkKSB7XG4gICAgICAgIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgIGNvbnRhaW5lci5pZCA9IHNwYW5JZDtcbiAgICAgICAgY29udGFpbmVyLmNsYXNzTmFtZSA9ICd2aWRlb2NvbnRhaW5lcic7XG4gICAgICAgIHZhciByZW1vdGVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JlbW90ZVZpZGVvcycpO1xuXG4gICAgICAgIC8vIElmIHRoZSBwZWVySmlkIGlzIG51bGwgdGhlbiB0aGlzIHZpZGVvIHNwYW4gY291bGRuJ3QgYmUgZGlyZWN0bHlcbiAgICAgICAgLy8gYXNzb2NpYXRlZCB3aXRoIGEgcGFydGljaXBhbnQgKHRoaXMgY291bGQgaGFwcGVuIGluIHRoZSBjYXNlIG9mIHByZXppKS5cbiAgICAgICAgaWYgKGZvY3VzICYmIHBlZXJKaWQgIT0gbnVsbClcbiAgICAgICAgICAgIGFkZFJlbW90ZVZpZGVvTWVudShwZWVySmlkLCBjb250YWluZXIpO1xuXG4gICAgICAgIHJlbW90ZXMuYXBwZW5kQ2hpbGQoY29udGFpbmVyKTtcbiAgICAgICAgZGVwLlVJQWN0aXZhdG9yKCkuZ2V0VUlTZXJ2aWNlKCkudXBkYXRlQXVkaW9MZXZlbENhbnZhcyhwZWVySmlkKTtcblxuICAgICAgICByZXR1cm4gY29udGFpbmVyO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGF1ZGlvIG9yIHZpZGVvIHN0cmVhbSBlbGVtZW50LlxuICAgICAqL1xuICAgIG15LmNyZWF0ZVN0cmVhbUVsZW1lbnQgPSBmdW5jdGlvbiAoc2lkLCBzdHJlYW0pIHtcbiAgICAgICAgdmFyIGlzVmlkZW8gPSBzdHJlYW0uZ2V0VmlkZW9UcmFja3MoKS5sZW5ndGggPiAwO1xuXG4gICAgICAgIGlmKGlzVmlkZW8pXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbnNvbGUudHJhY2Uoc3RyZWFtKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZWxlbWVudCA9IGlzVmlkZW9cbiAgICAgICAgICAgICAgICAgICAgICAgID8gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndmlkZW8nKVxuICAgICAgICAgICAgICAgICAgICAgICAgOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhdWRpbycpO1xuICAgICAgICB2YXIgaWQgPSAoaXNWaWRlbyA/ICdyZW1vdGVWaWRlb18nIDogJ3JlbW90ZUF1ZGlvXycpXG4gICAgICAgICAgICAgICAgICAgICsgc2lkICsgJ18nICsgc3RyZWFtLmlkO1xuXG4gICAgICAgIGVsZW1lbnQuaWQgPSBpZDtcbiAgICAgICAgZWxlbWVudC5hdXRvcGxheSA9IHRydWU7XG4gICAgICAgIGVsZW1lbnQub25jb250ZXh0bWVudSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGZhbHNlOyB9O1xuXG4gICAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH07XG5cbiAgICBteS5hZGRSZW1vdGVTdHJlYW1FbGVtZW50XG4gICAgICAgID0gZnVuY3Rpb24gKGNvbnRhaW5lciwgc2lkLCBzdHJlYW0sIHBlZXJKaWQsIHRoZXNzcmMpIHtcbiAgICAgICAgdmFyIG5ld0VsZW1lbnRJZCA9IG51bGw7XG5cbiAgICAgICAgdmFyIGlzVmlkZW8gPSBzdHJlYW0uZ2V0VmlkZW9UcmFja3MoKS5sZW5ndGggPiAwO1xuXG4gICAgICAgIGlmIChjb250YWluZXIpIHtcbiAgICAgICAgICAgIHZhciBzdHJlYW1FbGVtZW50ID0gVmlkZW9MYXlvdXQuY3JlYXRlU3RyZWFtRWxlbWVudChzaWQsIHN0cmVhbSk7XG4gICAgICAgICAgICBuZXdFbGVtZW50SWQgPSBzdHJlYW1FbGVtZW50LmlkO1xuXG4gICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoc3RyZWFtRWxlbWVudCk7XG5cbiAgICAgICAgICAgIHZhciBzZWwgPSAkKCcjJyArIG5ld0VsZW1lbnRJZCk7XG4gICAgICAgICAgICBzZWwuaGlkZSgpO1xuXG4gICAgICAgICAgICAvLyBJZiB0aGUgY29udGFpbmVyIGlzIGN1cnJlbnRseSB2aXNpYmxlIHdlIGF0dGFjaCB0aGUgc3RyZWFtLlxuICAgICAgICAgICAgaWYgKCFpc1ZpZGVvXG4gICAgICAgICAgICAgICAgfHwgKGNvbnRhaW5lci5vZmZzZXRQYXJlbnQgIT09IG51bGwgJiYgaXNWaWRlbykpIHtcbi8vPDw8PDw8PCBIRUFEOlVJL3ZpZGVvbGF5b3V0LmpzXG4vLyAgICAgICAgICAgICAgICBhdHRhY2hNZWRpYVN0cmVhbShzZWwsIHN0cmVhbSk7XG4vLz09PT09PT1cbiAgICAgICAgICAgICAgICB2YXIgc2ltdWxjYXN0ID0gbmV3IFNpbXVsY2FzdCgpO1xuICAgICAgICAgICAgICAgIHZhciB2aWRlb1N0cmVhbSA9IHNpbXVsY2FzdC5nZXRSZWNlaXZpbmdWaWRlb1N0cmVhbShzdHJlYW0pO1xuICAgICAgICAgICAgICAgIGF0dGFjaE1lZGlhU3RyZWFtKHNlbCwgdmlkZW9TdHJlYW0pO1xuLy8+Pj4+Pj4+IG1hc3Rlcjp2aWRlb2xheW91dC5qc1xuXG4gICAgICAgICAgICAgICAgaWYgKGlzVmlkZW8pXG4gICAgICAgICAgICAgICAgICAgIHdhaXRGb3JSZW1vdGVWaWRlbyhzZWwsIHRoZXNzcmMsIHN0cmVhbSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHN0cmVhbS5vbmVuZGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdHJlYW0gZW5kZWQnLCB0aGlzKTtcblxuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnJlbW92ZVJlbW90ZVN0cmVhbUVsZW1lbnQoc3RyZWFtLCBjb250YWluZXIpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHBlZXJKaWQpXG4gICAgICAgICAgICAgICAgICAgIGRlcC5Db250YWN0TGlzdCgpLnJlbW92ZUNvbnRhY3QocGVlckppZCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBBZGQgY2xpY2sgaGFuZGxlci5cbiAgICAgICAgICAgIGNvbnRhaW5lci5vbmNsaWNrID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgKiBGSVhNRSBJdCB0dXJucyBvdXQgdGhhdCB2aWRlb1RodW1iIG1heSBub3QgZXhpc3QgKGlmIHRoZXJlIGlzXG4gICAgICAgICAgICAgICAgICogbm8gYWN0dWFsIHZpZGVvKS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB2YXIgdmlkZW9UaHVtYiA9ICQoJyMnICsgY29udGFpbmVyLmlkICsgJz52aWRlbycpLmdldCgwKTtcblxuICAgICAgICAgICAgICAgIGlmICh2aWRlb1RodW1iKVxuICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5oYW5kbGVWaWRlb1RodW1iQ2xpY2tlZCh2aWRlb1RodW1iLnNyYyk7XG5cbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIEFkZCBob3ZlciBoYW5kbGVyXG4gICAgICAgICAgICAkKGNvbnRhaW5lcikuaG92ZXIoXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dEaXNwbGF5TmFtZShjb250YWluZXIuaWQsIHRydWUpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2aWRlb1NyYyA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkKCcjJyArIGNvbnRhaW5lci5pZCArICc+dmlkZW8nKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICYmICQoJyMnICsgY29udGFpbmVyLmlkICsgJz52aWRlbycpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3JjID0gJCgnIycgKyBjb250YWluZXIuaWQgKyAnPnZpZGVvJykuZ2V0KDApLnNyYztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHRoZSB2aWRlbyBoYXMgYmVlbiBcInBpbm5lZFwiIGJ5IHRoZSB1c2VyIHdlIHdhbnQgdG9cbiAgICAgICAgICAgICAgICAgICAgLy8ga2VlcCB0aGUgZGlzcGxheSBuYW1lIG9uIHBsYWNlLlxuICAgICAgICAgICAgICAgICAgICBpZiAoIVZpZGVvTGF5b3V0LmlzTGFyZ2VWaWRlb1Zpc2libGUoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IHZpZGVvU3JjICE9PSAkKCcjbGFyZ2VWaWRlbycpLmF0dHIoJ3NyYycpKVxuICAgICAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0Rpc3BsYXlOYW1lKGNvbnRhaW5lci5pZCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3RWxlbWVudElkO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIHRoZSByZW1vdGUgc3RyZWFtIGVsZW1lbnQgY29ycmVzcG9uZGluZyB0byB0aGUgZ2l2ZW4gc3RyZWFtIGFuZFxuICAgICAqIHBhcmVudCBjb250YWluZXIuXG4gICAgICogXG4gICAgICogQHBhcmFtIHN0cmVhbSB0aGUgc3RyZWFtXG4gICAgICogQHBhcmFtIGNvbnRhaW5lclxuICAgICAqL1xuICAgIG15LnJlbW92ZVJlbW90ZVN0cmVhbUVsZW1lbnQgPSBmdW5jdGlvbiAoc3RyZWFtLCBjb250YWluZXIpIHtcbiAgICAgICAgaWYgKCFjb250YWluZXIpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgdmFyIHNlbGVjdCA9IG51bGw7XG4gICAgICAgIHZhciByZW1vdmVkVmlkZW9TcmMgPSBudWxsO1xuICAgICAgICBpZiAoc3RyZWFtLmdldFZpZGVvVHJhY2tzKCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgc2VsZWN0ID0gJCgnIycgKyBjb250YWluZXIuaWQgKyAnPnZpZGVvJyk7XG4gICAgICAgICAgICByZW1vdmVkVmlkZW9TcmMgPSBzZWxlY3QuZ2V0KDApLnNyYztcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBzZWxlY3QgPSAkKCcjJyArIGNvbnRhaW5lci5pZCArICc+YXVkaW8nKTtcblxuICAgICAgICAvLyBSZW1vdmUgdmlkZW8gc291cmNlIGZyb20gdGhlIG1hcHBpbmcuXG4gICAgICAgIGRlbGV0ZSB2aWRlb1NyY1RvU3NyY1tyZW1vdmVkVmlkZW9TcmNdO1xuXG4gICAgICAgIC8vIE1hcmsgdmlkZW8gYXMgcmVtb3ZlZCB0byBjYW5jZWwgd2FpdGluZyBsb29wKGlmIHZpZGVvIGlzIHJlbW92ZWRcbiAgICAgICAgLy8gYmVmb3JlIGhhcyBzdGFydGVkKVxuICAgICAgICBzZWxlY3QucmVtb3ZlZCA9IHRydWU7XG4gICAgICAgIHNlbGVjdC5yZW1vdmUoKTtcblxuICAgICAgICB2YXIgYXVkaW9Db3VudCA9ICQoJyMnICsgY29udGFpbmVyLmlkICsgJz5hdWRpbycpLmxlbmd0aDtcbiAgICAgICAgdmFyIHZpZGVvQ291bnQgPSAkKCcjJyArIGNvbnRhaW5lci5pZCArICc+dmlkZW8nKS5sZW5ndGg7XG5cbiAgICAgICAgaWYgKCFhdWRpb0NvdW50ICYmICF2aWRlb0NvdW50KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlbW92ZSB3aG9sZSB1c2VyXCIsIGNvbnRhaW5lci5pZCk7XG4gICAgICAgICAgICAvLyBSZW1vdmUgd2hvbGUgY29udGFpbmVyXG4gICAgICAgICAgICBjb250YWluZXIucmVtb3ZlKCk7XG4gICAgICAgICAgICBVdGlsLnBsYXlTb3VuZE5vdGlmaWNhdGlvbigndXNlckxlZnQnKTtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZVRodW1ibmFpbHMoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZW1vdmVkVmlkZW9TcmMpXG4gICAgICAgICAgICBWaWRlb0xheW91dC51cGRhdGVSZW1vdmVkVmlkZW8ocmVtb3ZlZFZpZGVvU3JjKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2hvdy9oaWRlIHBlZXIgY29udGFpbmVyIGZvciB0aGUgZ2l2ZW4gcmVzb3VyY2VKaWQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2hvd1BlZXJDb250YWluZXIocmVzb3VyY2VKaWQsIGlzU2hvdykge1xuICAgICAgICB2YXIgcGVlckNvbnRhaW5lciA9ICQoJyNwYXJ0aWNpcGFudF8nICsgcmVzb3VyY2VKaWQpO1xuXG4gICAgICAgIGlmICghcGVlckNvbnRhaW5lcilcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBpZiAoIXBlZXJDb250YWluZXIuaXMoJzp2aXNpYmxlJykgJiYgaXNTaG93KVxuICAgICAgICAgICAgcGVlckNvbnRhaW5lci5zaG93KCk7XG4gICAgICAgIGVsc2UgaWYgKHBlZXJDb250YWluZXIuaXMoJzp2aXNpYmxlJykgJiYgIWlzU2hvdylcbiAgICAgICAgICAgIHBlZXJDb250YWluZXIuaGlkZSgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBkaXNwbGF5IG5hbWUgZm9yIHRoZSBnaXZlbiB2aWRlbyBzcGFuIGlkLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNldERpc3BsYXlOYW1lKHZpZGVvU3BhbklkLCBkaXNwbGF5TmFtZSkge1xuICAgICAgICB2YXIgbmFtZVNwYW4gPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5zcGFuLmRpc3BsYXluYW1lJyk7XG4gICAgICAgIHZhciBkZWZhdWx0TG9jYWxEaXNwbGF5TmFtZSA9IFwiTWVcIjtcblxuICAgICAgICAvLyBJZiB3ZSBhbHJlYWR5IGhhdmUgYSBkaXNwbGF5IG5hbWUgZm9yIHRoaXMgdmlkZW8uXG4gICAgICAgIGlmIChuYW1lU3Bhbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YXIgbmFtZVNwYW5FbGVtZW50ID0gbmFtZVNwYW4uZ2V0KDApO1xuXG4gICAgICAgICAgICBpZiAobmFtZVNwYW5FbGVtZW50LmlkID09PSAnbG9jYWxEaXNwbGF5TmFtZScgJiZcbiAgICAgICAgICAgICAgICAkKCcjbG9jYWxEaXNwbGF5TmFtZScpLnRleHQoKSAhPT0gZGlzcGxheU5hbWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGlzcGxheU5hbWUgJiYgZGlzcGxheU5hbWUubGVuZ3RoID4gMClcbiAgICAgICAgICAgICAgICAgICAgJCgnI2xvY2FsRGlzcGxheU5hbWUnKS50ZXh0KGRpc3BsYXlOYW1lICsgJyAobWUpJyk7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAkKCcjbG9jYWxEaXNwbGF5TmFtZScpLnRleHQoZGVmYXVsdExvY2FsRGlzcGxheU5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoZGlzcGxheU5hbWUgJiYgZGlzcGxheU5hbWUubGVuZ3RoID4gMClcbiAgICAgICAgICAgICAgICAgICAgJCgnIycgKyB2aWRlb1NwYW5JZCArICdfbmFtZScpLnRleHQoZGlzcGxheU5hbWUpO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgJCgnIycgKyB2aWRlb1NwYW5JZCArICdfbmFtZScpLnRleHQoaW50ZXJmYWNlQ29uZmlnLkRFRkFVTFRfUkVNT1RFX0RJU1BMQVlfTkFNRSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgZWRpdEJ1dHRvbiA9IG51bGw7XG5cbiAgICAgICAgICAgIG5hbWVTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgbmFtZVNwYW4uY2xhc3NOYW1lID0gJ2Rpc3BsYXluYW1lJztcbiAgICAgICAgICAgICQoJyMnICsgdmlkZW9TcGFuSWQpWzBdLmFwcGVuZENoaWxkKG5hbWVTcGFuKTtcblxuICAgICAgICAgICAgaWYgKHZpZGVvU3BhbklkID09PSAnbG9jYWxWaWRlb0NvbnRhaW5lcicpIHtcbiAgICAgICAgICAgICAgICBlZGl0QnV0dG9uID0gY3JlYXRlRWRpdERpc3BsYXlOYW1lQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgbmFtZVNwYW4uaW5uZXJUZXh0ID0gZGVmYXVsdExvY2FsRGlzcGxheU5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBuYW1lU3Bhbi5pbm5lclRleHQgPSBpbnRlcmZhY2VDb25maWcuREVGQVVMVF9SRU1PVEVfRElTUExBWV9OQU1FO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZGlzcGxheU5hbWUgJiYgZGlzcGxheU5hbWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIG5hbWVTcGFuLmlubmVyVGV4dCA9IGRpc3BsYXlOYW1lO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWVkaXRCdXR0b24pIHtcbiAgICAgICAgICAgICAgICBuYW1lU3Bhbi5pZCA9IHZpZGVvU3BhbklkICsgJ19uYW1lJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbmFtZVNwYW4uaWQgPSAnbG9jYWxEaXNwbGF5TmFtZSc7XG4gICAgICAgICAgICAgICAgJCgnIycgKyB2aWRlb1NwYW5JZClbMF0uYXBwZW5kQ2hpbGQoZWRpdEJ1dHRvbik7XG5cbiAgICAgICAgICAgICAgICB2YXIgZWRpdGFibGVUZXh0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICAgICAgICAgICAgICBlZGl0YWJsZVRleHQuY2xhc3NOYW1lID0gJ2Rpc3BsYXluYW1lJztcbiAgICAgICAgICAgICAgICBlZGl0YWJsZVRleHQudHlwZSA9ICd0ZXh0JztcbiAgICAgICAgICAgICAgICBlZGl0YWJsZVRleHQuaWQgPSAnZWRpdERpc3BsYXlOYW1lJztcblxuICAgICAgICAgICAgICAgIGlmIChkaXNwbGF5TmFtZSAmJiBkaXNwbGF5TmFtZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgZWRpdGFibGVUZXh0LnZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICA9IGRpc3BsYXlOYW1lLnN1YnN0cmluZygwLCBkaXNwbGF5TmFtZS5pbmRleE9mKCcgKG1lKScpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBlZGl0YWJsZVRleHQuc2V0QXR0cmlidXRlKCdzdHlsZScsICdkaXNwbGF5Om5vbmU7Jyk7XG4gICAgICAgICAgICAgICAgZWRpdGFibGVUZXh0LnNldEF0dHJpYnV0ZSgncGxhY2Vob2xkZXInLCAnZXguIEphbmUgUGluaycpO1xuICAgICAgICAgICAgICAgICQoJyMnICsgdmlkZW9TcGFuSWQpWzBdLmFwcGVuZENoaWxkKGVkaXRhYmxlVGV4dCk7XG5cbiAgICAgICAgICAgICAgICAkKCcjbG9jYWxWaWRlb0NvbnRhaW5lciAuZGlzcGxheW5hbWUnKVxuICAgICAgICAgICAgICAgICAgICAuYmluZChcImNsaWNrXCIsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAkKCcjbG9jYWxEaXNwbGF5TmFtZScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2VkaXREaXNwbGF5TmFtZScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2VkaXREaXNwbGF5TmFtZScpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNlZGl0RGlzcGxheU5hbWUnKS5zZWxlY3QoKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgaW5wdXREaXNwbGF5TmFtZUhhbmRsZXIgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5pY2tuYW1lID0gZGVwLlVJQWN0aXZhdG9yKCkuZ2V0VUlTZXJ2aWNlKCkuZ2V0Tmlja25hbWUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuaWNrbmFtZSAhPT0gbmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlcC5VSUFjdGl2YXRvcigpLmdldFVJU2VydmljZSgpLnNldE5pY2tuYW1lKG5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5pY2tuYW1lICA9IG5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5kaXNwbGF5bmFtZSA9IG5pY2tuYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Yy5hZGREaXNwbGF5TmFtZVRvUHJlc2VuY2Uobmlja25hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Yy5zZW5kUHJlc2VuY2UoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlcC5DaGF0KCkuc2V0Q2hhdENvbnZlcnNhdGlvbk1vZGUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghJCgnI2xvY2FsRGlzcGxheU5hbWUnKS5pcyhcIjp2aXNpYmxlXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5pY2tuYW1lKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjbG9jYWxEaXNwbGF5TmFtZScpLnRleHQobmlja25hbWUgKyBcIiAobWUpXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI2xvY2FsRGlzcGxheU5hbWUnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRleHQoZGVmYXVsdExvY2FsRGlzcGxheU5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNsb2NhbERpc3BsYXlOYW1lJykuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcjZWRpdERpc3BsYXlOYW1lJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICQoJyNlZGl0RGlzcGxheU5hbWUnKS5vbmUoXCJmb2N1c291dFwiLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXREaXNwbGF5TmFtZUhhbmRsZXIodGhpcy52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICQoJyNlZGl0RGlzcGxheU5hbWUnKS5vbigna2V5ZG93bicsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxMykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dERpc3BsYXlOYW1lSGFuZGxlcih0aGlzLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2hvd3MvaGlkZXMgdGhlIGRpc3BsYXkgbmFtZSBvbiB0aGUgcmVtb3RlIHZpZGVvLlxuICAgICAqIEBwYXJhbSB2aWRlb1NwYW5JZCB0aGUgaWRlbnRpZmllciBvZiB0aGUgdmlkZW8gc3BhbiBlbGVtZW50XG4gICAgICogQHBhcmFtIGlzU2hvdyBpbmRpY2F0ZXMgaWYgdGhlIGRpc3BsYXkgbmFtZSBzaG91bGQgYmUgc2hvd24gb3IgaGlkZGVuXG4gICAgICovXG4gICAgbXkuc2hvd0Rpc3BsYXlOYW1lID0gZnVuY3Rpb24odmlkZW9TcGFuSWQsIGlzU2hvdykge1xuICAgICAgICB2YXIgbmFtZVNwYW4gPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5zcGFuLmRpc3BsYXluYW1lJykuZ2V0KDApO1xuICAgICAgICBpZiAoaXNTaG93KSB7XG4gICAgICAgICAgICBpZiAobmFtZVNwYW4gJiYgbmFtZVNwYW4uaW5uZXJIVE1MICYmIG5hbWVTcGFuLmlubmVySFRNTC5sZW5ndGgpIFxuICAgICAgICAgICAgICAgIG5hbWVTcGFuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTppbmxpbmUtYmxvY2s7XCIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKG5hbWVTcGFuKVxuICAgICAgICAgICAgICAgIG5hbWVTcGFuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTpub25lO1wiKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTaG93cyB0aGUgcHJlc2VuY2Ugc3RhdHVzIG1lc3NhZ2UgZm9yIHRoZSBnaXZlbiB2aWRlby5cbiAgICAgKi9cbiAgICBteS5zZXRQcmVzZW5jZVN0YXR1cyA9IGZ1bmN0aW9uICh2aWRlb1NwYW5JZCwgc3RhdHVzTXNnKSB7XG5cbiAgICAgICAgaWYgKCEkKCcjJyArIHZpZGVvU3BhbklkKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIE5vIGNvbnRhaW5lclxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHN0YXR1c1NwYW4gPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5zcGFuLnN0YXR1cycpO1xuICAgICAgICBpZiAoIXN0YXR1c1NwYW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAvL0FkZCBzdGF0dXMgc3BhblxuICAgICAgICAgICAgc3RhdHVzU3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIHN0YXR1c1NwYW4uY2xhc3NOYW1lID0gJ3N0YXR1cyc7XG4gICAgICAgICAgICBzdGF0dXNTcGFuLmlkID0gdmlkZW9TcGFuSWQgKyAnX3N0YXR1cyc7XG4gICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkKVswXS5hcHBlbmRDaGlsZChzdGF0dXNTcGFuKTtcblxuICAgICAgICAgICAgc3RhdHVzU3BhbiA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPnNwYW4uc3RhdHVzJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEaXNwbGF5IHN0YXR1c1xuICAgICAgICBpZiAoc3RhdHVzTXNnICYmIHN0YXR1c01zZy5sZW5ndGgpIHtcbiAgICAgICAgICAgICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnX3N0YXR1cycpLnRleHQoc3RhdHVzTXNnKTtcbiAgICAgICAgICAgIHN0YXR1c1NwYW4uZ2V0KDApLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTppbmxpbmUtYmxvY2s7XCIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZVxuICAgICAgICAgICAgc3RhdHVzU3Bhbi5nZXQoMCkuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJkaXNwbGF5Om5vbmU7XCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3dzIGEgdmlzdWFsIGluZGljYXRvciBmb3IgdGhlIGZvY3VzIG9mIHRoZSBjb25mZXJlbmNlLlxuICAgICAqIEN1cnJlbnRseSBpZiB3ZSdyZSBub3QgdGhlIG93bmVyIG9mIHRoZSBjb25mZXJlbmNlIHdlIG9idGFpbiB0aGUgZm9jdXNcbiAgICAgKiBmcm9tIHRoZSBjb25uZWN0aW9uLmppbmdsZS5zZXNzaW9ucy5cbiAgICAgKi9cbiAgICBteS5zaG93Rm9jdXNJbmRpY2F0b3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKGZvY3VzICE9PSBudWxsKSB7XG4gICAgICAgICAgICB2YXIgaW5kaWNhdG9yU3BhbiA9ICQoJyNsb2NhbFZpZGVvQ29udGFpbmVyIC5mb2N1c2luZGljYXRvcicpO1xuXG4gICAgICAgICAgICBpZiAoaW5kaWNhdG9yU3Bhbi5jaGlsZHJlbigpLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjcmVhdGVGb2N1c0luZGljYXRvckVsZW1lbnQoaW5kaWNhdG9yU3BhblswXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoT2JqZWN0LmtleXMoY29ubmVjdGlvbi5qaW5nbGUuc2Vzc2lvbnMpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIElmIHdlJ3JlIG9ubHkgYSBwYXJ0aWNpcGFudCB0aGUgZm9jdXMgd2lsbCBiZSB0aGUgb25seSBzZXNzaW9uIHdlIGhhdmUuXG4gICAgICAgICAgICB2YXIgc2Vzc2lvblxuICAgICAgICAgICAgICAgID0gY29ubmVjdGlvbi5qaW5nbGUuc2Vzc2lvbnNcbiAgICAgICAgICAgICAgICAgICAgW09iamVjdC5rZXlzKGNvbm5lY3Rpb24uamluZ2xlLnNlc3Npb25zKVswXV07XG4gICAgICAgICAgICB2YXIgZm9jdXNJZFxuICAgICAgICAgICAgICAgID0gJ3BhcnRpY2lwYW50XycgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChzZXNzaW9uLnBlZXJqaWQpO1xuXG4gICAgICAgICAgICB2YXIgZm9jdXNDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChmb2N1c0lkKTtcbiAgICAgICAgICAgIGlmICghZm9jdXNDb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiTm8gZm9jdXMgY29udGFpbmVyIVwiKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaW5kaWNhdG9yU3BhbiA9ICQoJyMnICsgZm9jdXNJZCArICcgLmZvY3VzaW5kaWNhdG9yJyk7XG5cbiAgICAgICAgICAgIGlmICghaW5kaWNhdG9yU3BhbiB8fCBpbmRpY2F0b3JTcGFuLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGluZGljYXRvclNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICAgICAgaW5kaWNhdG9yU3Bhbi5jbGFzc05hbWUgPSAnZm9jdXNpbmRpY2F0b3InO1xuXG4gICAgICAgICAgICAgICAgZm9jdXNDb250YWluZXIuYXBwZW5kQ2hpbGQoaW5kaWNhdG9yU3Bhbik7XG5cbiAgICAgICAgICAgICAgICBjcmVhdGVGb2N1c0luZGljYXRvckVsZW1lbnQoaW5kaWNhdG9yU3Bhbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2hvd3MgdmlkZW8gbXV0ZWQgaW5kaWNhdG9yIG92ZXIgc21hbGwgdmlkZW9zLlxuICAgICAqL1xuICAgIG15LnNob3dWaWRlb0luZGljYXRvciA9IGZ1bmN0aW9uKHZpZGVvU3BhbklkLCBpc011dGVkKSB7XG4gICAgICAgIHZhciB2aWRlb011dGVkU3BhbiA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPnNwYW4udmlkZW9NdXRlZCcpO1xuXG4gICAgICAgIGlmIChpc011dGVkID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgICBpZiAodmlkZW9NdXRlZFNwYW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHZpZGVvTXV0ZWRTcGFuLnJlbW92ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGF1ZGlvTXV0ZWRTcGFuID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+c3Bhbi5hdWRpb011dGVkJyk7XG5cbiAgICAgICAgICAgIHZpZGVvTXV0ZWRTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgdmlkZW9NdXRlZFNwYW4uY2xhc3NOYW1lID0gJ3ZpZGVvTXV0ZWQnO1xuICAgICAgICAgICAgaWYgKGF1ZGlvTXV0ZWRTcGFuKSB7XG4gICAgICAgICAgICAgICAgdmlkZW9NdXRlZFNwYW4ucmlnaHQgPSAnMzBweCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkKVswXS5hcHBlbmRDaGlsZCh2aWRlb011dGVkU3Bhbik7XG5cbiAgICAgICAgICAgIHZhciBtdXRlZEluZGljYXRvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2knKTtcbiAgICAgICAgICAgIG11dGVkSW5kaWNhdG9yLmNsYXNzTmFtZSA9ICdpY29uLWNhbWVyYS1kaXNhYmxlZCc7XG4gICAgICAgICAgICBVdGlsLnNldFRvb2x0aXAobXV0ZWRJbmRpY2F0b3IsXG4gICAgICAgICAgICAgICAgICAgIFwiUGFydGljaXBhbnQgaGFzPGJyLz5zdG9wcGVkIHRoZSBjYW1lcmEuXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidG9wXCIpO1xuICAgICAgICAgICAgdmlkZW9NdXRlZFNwYW4uYXBwZW5kQ2hpbGQobXV0ZWRJbmRpY2F0b3IpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3dzIGF1ZGlvIG11dGVkIGluZGljYXRvciBvdmVyIHNtYWxsIHZpZGVvcy5cbiAgICAgKi9cbiAgICBteS5zaG93QXVkaW9JbmRpY2F0b3IgPSBmdW5jdGlvbih2aWRlb1NwYW5JZCwgaXNNdXRlZCkge1xuICAgICAgICB2YXIgYXVkaW9NdXRlZFNwYW4gPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5zcGFuLmF1ZGlvTXV0ZWQnKTtcblxuICAgICAgICBpZiAoaXNNdXRlZCA9PT0gJ2ZhbHNlJykge1xuICAgICAgICAgICAgaWYgKGF1ZGlvTXV0ZWRTcGFuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBhdWRpb011dGVkU3Bhbi5wb3BvdmVyKCdoaWRlJyk7XG4gICAgICAgICAgICAgICAgYXVkaW9NdXRlZFNwYW4ucmVtb3ZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgdmlkZW9NdXRlZFNwYW4gPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5zcGFuLnZpZGVvTXV0ZWQnKTtcblxuICAgICAgICAgICAgYXVkaW9NdXRlZFNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICBhdWRpb011dGVkU3Bhbi5jbGFzc05hbWUgPSAnYXVkaW9NdXRlZCc7XG4gICAgICAgICAgICBVdGlsLnNldFRvb2x0aXAoYXVkaW9NdXRlZFNwYW4sXG4gICAgICAgICAgICAgICAgICAgIFwiUGFydGljaXBhbnQgaXMgbXV0ZWRcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ0b3BcIik7XG5cbiAgICAgICAgICAgIGlmICh2aWRlb011dGVkU3Bhbikge1xuICAgICAgICAgICAgICAgIGF1ZGlvTXV0ZWRTcGFuLnJpZ2h0ID0gJzMwcHgnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJCgnIycgKyB2aWRlb1NwYW5JZClbMF0uYXBwZW5kQ2hpbGQoYXVkaW9NdXRlZFNwYW4pO1xuXG4gICAgICAgICAgICB2YXIgbXV0ZWRJbmRpY2F0b3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpJyk7XG4gICAgICAgICAgICBtdXRlZEluZGljYXRvci5jbGFzc05hbWUgPSAnaWNvbi1taWMtZGlzYWJsZWQnO1xuICAgICAgICAgICAgYXVkaW9NdXRlZFNwYW4uYXBwZW5kQ2hpbGQobXV0ZWRJbmRpY2F0b3IpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlc2l6ZXMgdGhlIGxhcmdlIHZpZGVvIGNvbnRhaW5lci5cbiAgICAgKi9cbiAgICBteS5yZXNpemVMYXJnZVZpZGVvQ29udGFpbmVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBkZXAuQ2hhdCgpLnJlc2l6ZUNoYXQoKTtcbiAgICAgICAgdmFyIGF2YWlsYWJsZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgdmFyIGF2YWlsYWJsZVdpZHRoID0gZGVwLlVJVXRpbCgpLmdldEF2YWlsYWJsZVZpZGVvV2lkdGgoKTtcbiAgICAgICAgaWYgKGF2YWlsYWJsZVdpZHRoIDwgMCB8fCBhdmFpbGFibGVIZWlnaHQgPCAwKSByZXR1cm47XG5cbiAgICAgICAgJCgnI3ZpZGVvc3BhY2UnKS53aWR0aChhdmFpbGFibGVXaWR0aCk7XG4gICAgICAgICQoJyN2aWRlb3NwYWNlJykuaGVpZ2h0KGF2YWlsYWJsZUhlaWdodCk7XG4gICAgICAgICQoJyNsYXJnZVZpZGVvQ29udGFpbmVyJykud2lkdGgoYXZhaWxhYmxlV2lkdGgpO1xuICAgICAgICAkKCcjbGFyZ2VWaWRlb0NvbnRhaW5lcicpLmhlaWdodChhdmFpbGFibGVIZWlnaHQpO1xuXG4gICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZVRodW1ibmFpbHMoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVzaXplcyB0aHVtYm5haWxzLlxuICAgICAqL1xuICAgIG15LnJlc2l6ZVRodW1ibmFpbHMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHZpZGVvU3BhY2VXaWR0aCA9ICQoJyNyZW1vdGVWaWRlb3MnKS53aWR0aCgpO1xuXG4gICAgICAgIHZhciB0aHVtYm5haWxTaXplID0gVmlkZW9MYXlvdXQuY2FsY3VsYXRlVGh1bWJuYWlsU2l6ZSh2aWRlb1NwYWNlV2lkdGgpO1xuICAgICAgICB2YXIgd2lkdGggPSB0aHVtYm5haWxTaXplWzBdO1xuICAgICAgICB2YXIgaGVpZ2h0ID0gdGh1bWJuYWlsU2l6ZVsxXTtcblxuICAgICAgICAvLyBzaXplIHZpZGVvcyBzbyB0aGF0IHdoaWxlIGtlZXBpbmcgQVIgYW5kIG1heCBoZWlnaHQsIHdlIGhhdmUgYVxuICAgICAgICAvLyBuaWNlIGZpdFxuICAgICAgICAkKCcjcmVtb3RlVmlkZW9zJykuaGVpZ2h0KGhlaWdodCk7XG4gICAgICAgICQoJyNyZW1vdGVWaWRlb3M+c3BhbicpLndpZHRoKHdpZHRoKTtcbiAgICAgICAgJCgnI3JlbW90ZVZpZGVvcz5zcGFuJykuaGVpZ2h0KGhlaWdodCk7XG5cbiAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcihcInJlbW90ZXZpZGVvLnJlc2l6ZWRcIiwgW3dpZHRoLCBoZWlnaHRdKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRW5hYmxlcyB0aGUgZG9taW5hbnQgc3BlYWtlciBVSS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSByZXNvdXJjZUppZCB0aGUgamlkIGluZGljYXRpbmcgdGhlIHZpZGVvIGVsZW1lbnQgdG9cbiAgICAgKiBhY3RpdmF0ZS9kZWFjdGl2YXRlXG4gICAgICogQHBhcmFtIGlzRW5hYmxlIGluZGljYXRlcyBpZiB0aGUgZG9taW5hbnQgc3BlYWtlciBzaG91bGQgYmUgZW5hYmxlZCBvclxuICAgICAqIGRpc2FibGVkXG4gICAgICovXG4gICAgbXkuZW5hYmxlRG9taW5hbnRTcGVha2VyID0gZnVuY3Rpb24ocmVzb3VyY2VKaWQsIGlzRW5hYmxlKSB7XG4gICAgICAgIHZhciBkaXNwbGF5TmFtZSA9IHJlc291cmNlSmlkO1xuICAgICAgICB2YXIgbmFtZVNwYW4gPSAkKCcjcGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkICsgJz5zcGFuLmRpc3BsYXluYW1lJyk7XG4gICAgICAgIGlmIChuYW1lU3Bhbi5sZW5ndGggPiAwKVxuICAgICAgICAgICAgZGlzcGxheU5hbWUgPSBuYW1lU3Bhbi50ZXh0KCk7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJVSSBlbmFibGUgZG9taW5hbnQgc3BlYWtlclwiLFxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5TmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VKaWQsXG4gICAgICAgICAgICAgICAgICAgIGlzRW5hYmxlKTtcblxuICAgICAgICB2YXIgdmlkZW9TcGFuSWQgPSBudWxsO1xuICAgICAgICB2YXIgdmlkZW9Db250YWluZXJJZCA9IG51bGw7XG4gICAgICAgIGlmIChyZXNvdXJjZUppZFxuICAgICAgICAgICAgICAgID09PSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChjb25uZWN0aW9uLmVtdWMubXlyb29tamlkKSkge1xuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAnbG9jYWxWaWRlb1dyYXBwZXInO1xuICAgICAgICAgICAgdmlkZW9Db250YWluZXJJZCA9ICdsb2NhbFZpZGVvQ29udGFpbmVyJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZpZGVvU3BhbklkID0gJ3BhcnRpY2lwYW50XycgKyByZXNvdXJjZUppZDtcbiAgICAgICAgICAgIHZpZGVvQ29udGFpbmVySWQgPSB2aWRlb1NwYW5JZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHZpZGVvU3BhbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHZpZGVvQ29udGFpbmVySWQpO1xuXG4gICAgICAgIGlmICghdmlkZW9TcGFuKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiTm8gdmlkZW8gZWxlbWVudCBmb3IgamlkXCIsIHJlc291cmNlSmlkKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB2aWRlbyA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPnZpZGVvJyk7XG5cbiAgICAgICAgaWYgKHZpZGVvICYmIHZpZGVvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmIChpc0VuYWJsZSkge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dEaXNwbGF5TmFtZSh2aWRlb0NvbnRhaW5lcklkLCB0cnVlKTtcblxuICAgICAgICAgICAgICAgIGlmICghdmlkZW9TcGFuLmNsYXNzTGlzdC5jb250YWlucyhcImRvbWluYW50c3BlYWtlclwiKSlcbiAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFuLmNsYXNzTGlzdC5hZGQoXCJkb21pbmFudHNwZWFrZXJcIik7XG5cbiAgICAgICAgICAgICAgICB2aWRlby5jc3Moe3Zpc2liaWxpdHk6ICdoaWRkZW4nfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zaG93RGlzcGxheU5hbWUodmlkZW9Db250YWluZXJJZCwgZmFsc2UpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHZpZGVvU3Bhbi5jbGFzc0xpc3QuY29udGFpbnMoXCJkb21pbmFudHNwZWFrZXJcIikpXG4gICAgICAgICAgICAgICAgICAgIHZpZGVvU3Bhbi5jbGFzc0xpc3QucmVtb3ZlKFwiZG9taW5hbnRzcGVha2VyXCIpO1xuXG4gICAgICAgICAgICAgICAgdmlkZW8uY3NzKHt2aXNpYmlsaXR5OiAndmlzaWJsZSd9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBzZWxlY3RvciBvZiB2aWRlbyB0aHVtYm5haWwgY29udGFpbmVyIGZvciB0aGUgdXNlciBpZGVudGlmaWVkIGJ5XG4gICAgICogZ2l2ZW4gPHR0PnVzZXJKaWQ8L3R0PlxuICAgICAqIEBwYXJhbSB1c2VySmlkIHVzZXIncyBKaWQgZm9yIHdob20gd2Ugd2FudCB0byBnZXQgdGhlIHZpZGVvIGNvbnRhaW5lci5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRQYXJ0aWNpcGFudENvbnRhaW5lcih1c2VySmlkKVxuICAgIHtcbiAgICAgICAgaWYgKCF1c2VySmlkKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG5cbiAgICAgICAgaWYgKHVzZXJKaWQgPT09IGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQpXG4gICAgICAgICAgICByZXR1cm4gJChcIiNsb2NhbFZpZGVvQ29udGFpbmVyXCIpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gJChcIiNwYXJ0aWNpcGFudF9cIiArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHVzZXJKaWQpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBzaXplIGFuZCBwb3NpdGlvbiBvZiB0aGUgZ2l2ZW4gdmlkZW8gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB2aWRlbyB0aGUgdmlkZW8gZWxlbWVudCB0byBwb3NpdGlvblxuICAgICAqIEBwYXJhbSB3aWR0aCB0aGUgZGVzaXJlZCB2aWRlbyB3aWR0aFxuICAgICAqIEBwYXJhbSBoZWlnaHQgdGhlIGRlc2lyZWQgdmlkZW8gaGVpZ2h0XG4gICAgICogQHBhcmFtIGhvcml6b250YWxJbmRlbnQgdGhlIGxlZnQgYW5kIHJpZ2h0IGluZGVudFxuICAgICAqIEBwYXJhbSB2ZXJ0aWNhbEluZGVudCB0aGUgdG9wIGFuZCBib3R0b20gaW5kZW50XG4gICAgICovXG4gICAgZnVuY3Rpb24gcG9zaXRpb25WaWRlbyh2aWRlbyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgaG9yaXpvbnRhbEluZGVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRpY2FsSW5kZW50KSB7XG4gICAgICAgIHZpZGVvLndpZHRoKHdpZHRoKTtcbiAgICAgICAgdmlkZW8uaGVpZ2h0KGhlaWdodCk7XG4gICAgICAgIHZpZGVvLmNzcyh7ICB0b3A6IHZlcnRpY2FsSW5kZW50ICsgJ3B4JyxcbiAgICAgICAgICAgICAgICAgICAgIGJvdHRvbTogdmVydGljYWxJbmRlbnQgKyAncHgnLFxuICAgICAgICAgICAgICAgICAgICAgbGVmdDogaG9yaXpvbnRhbEluZGVudCArICdweCcsXG4gICAgICAgICAgICAgICAgICAgICByaWdodDogaG9yaXpvbnRhbEluZGVudCArICdweCd9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSB0aHVtYm5haWwgc2l6ZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB2aWRlb1NwYWNlV2lkdGggdGhlIHdpZHRoIG9mIHRoZSB2aWRlbyBzcGFjZVxuICAgICAqL1xuICAgIG15LmNhbGN1bGF0ZVRodW1ibmFpbFNpemUgPSBmdW5jdGlvbiAodmlkZW9TcGFjZVdpZHRoKSB7XG4gICAgICAgIC8vIENhbGN1bGF0ZSB0aGUgYXZhaWxhYmxlIGhlaWdodCwgd2hpY2ggaXMgdGhlIGlubmVyIHdpbmRvdyBoZWlnaHQgbWludXNcbiAgICAgICAvLyAzOXB4IGZvciB0aGUgaGVhZGVyIG1pbnVzIDJweCBmb3IgdGhlIGRlbGltaXRlciBsaW5lcyBvbiB0aGUgdG9wIGFuZFxuICAgICAgIC8vIGJvdHRvbSBvZiB0aGUgbGFyZ2UgdmlkZW8sIG1pbnVzIHRoZSAzNnB4IHNwYWNlIGluc2lkZSB0aGUgcmVtb3RlVmlkZW9zXG4gICAgICAgLy8gY29udGFpbmVyIHVzZWQgZm9yIGhpZ2hsaWdodGluZyBzaGFkb3cuXG4gICAgICAgdmFyIGF2YWlsYWJsZUhlaWdodCA9IDEwMDtcblxuICAgICAgIHZhciBudW12aWRzID0gMDtcbiAgICAgICBpZiAobGFzdE5Db3VudCAmJiBsYXN0TkNvdW50ID4gMClcbiAgICAgICAgICAgbnVtdmlkcyA9IGxhc3ROQ291bnQgKyAxO1xuICAgICAgIGVsc2VcbiAgICAgICAgICAgbnVtdmlkcyA9ICQoJyNyZW1vdGVWaWRlb3M+c3Bhbjp2aXNpYmxlJykubGVuZ3RoO1xuXG4gICAgICAgLy8gUmVtb3ZlIHRoZSAzcHggYm9yZGVycyBhcnJvdW5kIHZpZGVvcyBhbmQgYm9yZGVyIGFyb3VuZCB0aGUgcmVtb3RlXG4gICAgICAgLy8gdmlkZW9zIGFyZWFcbiAgICAgICB2YXIgYXZhaWxhYmxlV2luV2lkdGggPSB2aWRlb1NwYWNlV2lkdGggLSAyICogMyAqIG51bXZpZHMgLSA3MDtcblxuICAgICAgIHZhciBhdmFpbGFibGVXaWR0aCA9IGF2YWlsYWJsZVdpbldpZHRoIC8gbnVtdmlkcztcbiAgICAgICB2YXIgYXNwZWN0UmF0aW8gPSAxNi4wIC8gOS4wO1xuICAgICAgIHZhciBtYXhIZWlnaHQgPSBNYXRoLm1pbigxNjAsIGF2YWlsYWJsZUhlaWdodCk7XG4gICAgICAgYXZhaWxhYmxlSGVpZ2h0ID0gTWF0aC5taW4obWF4SGVpZ2h0LCBhdmFpbGFibGVXaWR0aCAvIGFzcGVjdFJhdGlvKTtcbiAgICAgICBpZiAoYXZhaWxhYmxlSGVpZ2h0IDwgYXZhaWxhYmxlV2lkdGggLyBhc3BlY3RSYXRpbykge1xuICAgICAgICAgICBhdmFpbGFibGVXaWR0aCA9IE1hdGguZmxvb3IoYXZhaWxhYmxlSGVpZ2h0ICogYXNwZWN0UmF0aW8pO1xuICAgICAgIH1cblxuICAgICAgIHJldHVybiBbYXZhaWxhYmxlV2lkdGgsIGF2YWlsYWJsZUhlaWdodF07XG4gICB9O1xuXG4gICAvKipcbiAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YgdGhlIHZpZGVvIGRpbWVuc2lvbnMsIHNvIHRoYXQgaXQga2VlcHMgaXQncyBhc3BlY3RcbiAgICAqIHJhdGlvIGFuZCBmaXRzIGF2YWlsYWJsZSBhcmVhIHdpdGggaXQncyBsYXJnZXIgZGltZW5zaW9uLiBUaGlzIG1ldGhvZFxuICAgICogZW5zdXJlcyB0aGF0IHdob2xlIHZpZGVvIHdpbGwgYmUgdmlzaWJsZSBhbmQgY2FuIGxlYXZlIGVtcHR5IGFyZWFzLlxuICAgICpcbiAgICAqIEByZXR1cm4gYW4gYXJyYXkgd2l0aCAyIGVsZW1lbnRzLCB0aGUgdmlkZW8gd2lkdGggYW5kIHRoZSB2aWRlbyBoZWlnaHRcbiAgICAqL1xuICAgZnVuY3Rpb24gZ2V0RGVza3RvcFZpZGVvU2l6ZSh2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlSGVpZ2h0KSB7XG4gICAgICAgaWYgKCF2aWRlb1dpZHRoKVxuICAgICAgICAgICB2aWRlb1dpZHRoID0gVmlkZW9MYXlvdXQuY3VycmVudFZpZGVvV2lkdGg7XG4gICAgICAgaWYgKCF2aWRlb0hlaWdodClcbiAgICAgICAgICAgdmlkZW9IZWlnaHQgPSBWaWRlb0xheW91dC5jdXJyZW50VmlkZW9IZWlnaHQ7XG5cbiAgICAgICB2YXIgYXNwZWN0UmF0aW8gPSB2aWRlb1dpZHRoIC8gdmlkZW9IZWlnaHQ7XG5cbiAgICAgICB2YXIgYXZhaWxhYmxlV2lkdGggPSBNYXRoLm1heCh2aWRlb1dpZHRoLCB2aWRlb1NwYWNlV2lkdGgpO1xuICAgICAgIHZhciBhdmFpbGFibGVIZWlnaHQgPSBNYXRoLm1heCh2aWRlb0hlaWdodCwgdmlkZW9TcGFjZUhlaWdodCk7XG5cbiAgICAgICB2aWRlb1NwYWNlSGVpZ2h0IC09ICQoJyNyZW1vdGVWaWRlb3MnKS5vdXRlckhlaWdodCgpO1xuXG4gICAgICAgaWYgKGF2YWlsYWJsZVdpZHRoIC8gYXNwZWN0UmF0aW8gPj0gdmlkZW9TcGFjZUhlaWdodClcbiAgICAgICB7XG4gICAgICAgICAgIGF2YWlsYWJsZUhlaWdodCA9IHZpZGVvU3BhY2VIZWlnaHQ7XG4gICAgICAgICAgIGF2YWlsYWJsZVdpZHRoID0gYXZhaWxhYmxlSGVpZ2h0ICogYXNwZWN0UmF0aW87XG4gICAgICAgfVxuXG4gICAgICAgaWYgKGF2YWlsYWJsZUhlaWdodCAqIGFzcGVjdFJhdGlvID49IHZpZGVvU3BhY2VXaWR0aClcbiAgICAgICB7XG4gICAgICAgICAgIGF2YWlsYWJsZVdpZHRoID0gdmlkZW9TcGFjZVdpZHRoO1xuICAgICAgICAgICBhdmFpbGFibGVIZWlnaHQgPSBhdmFpbGFibGVXaWR0aCAvIGFzcGVjdFJhdGlvO1xuICAgICAgIH1cblxuICAgICAgIHJldHVybiBbYXZhaWxhYmxlV2lkdGgsIGF2YWlsYWJsZUhlaWdodF07XG4gICB9XG5cblxuLyoqXG4gICAgICogUmV0dXJucyBhbiBhcnJheSBvZiB0aGUgdmlkZW8gZGltZW5zaW9ucywgc28gdGhhdCBpdCBjb3ZlcnMgdGhlIHNjcmVlbi5cbiAgICAgKiBJdCBsZWF2ZXMgbm8gZW1wdHkgYXJlYXMsIGJ1dCBzb21lIHBhcnRzIG9mIHRoZSB2aWRlbyBtaWdodCBub3QgYmUgdmlzaWJsZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gYW4gYXJyYXkgd2l0aCAyIGVsZW1lbnRzLCB0aGUgdmlkZW8gd2lkdGggYW5kIHRoZSB2aWRlbyBoZWlnaHRcbiAgICAgKi9cbiAgICBteS5nZXRDYW1lcmFWaWRlb1NpemUgPSBmdW5jdGlvbih2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlSGVpZ2h0KSB7XG4gICAgICAgIGlmICghdmlkZW9XaWR0aClcbiAgICAgICAgICAgIHZpZGVvV2lkdGggPSBWaWRlb0xheW91dC5jdXJyZW50VmlkZW9XaWR0aDtcbiAgICAgICAgaWYgKCF2aWRlb0hlaWdodClcbiAgICAgICAgICAgIHZpZGVvSGVpZ2h0ID0gVmlkZW9MYXlvdXQuY3VycmVudFZpZGVvSGVpZ2h0O1xuXG4gICAgICAgIHZhciBhc3BlY3RSYXRpbyA9IHZpZGVvV2lkdGggLyB2aWRlb0hlaWdodDtcblxuICAgICAgICB2YXIgYXZhaWxhYmxlV2lkdGggPSBNYXRoLm1heCh2aWRlb1dpZHRoLCB2aWRlb1NwYWNlV2lkdGgpO1xuICAgICAgICB2YXIgYXZhaWxhYmxlSGVpZ2h0ID0gTWF0aC5tYXgodmlkZW9IZWlnaHQsIHZpZGVvU3BhY2VIZWlnaHQpO1xuXG4gICAgICAgIGlmIChhdmFpbGFibGVXaWR0aCAvIGFzcGVjdFJhdGlvIDwgdmlkZW9TcGFjZUhlaWdodCkge1xuICAgICAgICAgICAgYXZhaWxhYmxlSGVpZ2h0ID0gdmlkZW9TcGFjZUhlaWdodDtcbiAgICAgICAgICAgIGF2YWlsYWJsZVdpZHRoID0gYXZhaWxhYmxlSGVpZ2h0ICogYXNwZWN0UmF0aW87XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYXZhaWxhYmxlSGVpZ2h0ICogYXNwZWN0UmF0aW8gPCB2aWRlb1NwYWNlV2lkdGgpIHtcbiAgICAgICAgICAgIGF2YWlsYWJsZVdpZHRoID0gdmlkZW9TcGFjZVdpZHRoO1xuICAgICAgICAgICAgYXZhaWxhYmxlSGVpZ2h0ID0gYXZhaWxhYmxlV2lkdGggLyBhc3BlY3RSYXRpbztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBbYXZhaWxhYmxlV2lkdGgsIGF2YWlsYWJsZUhlaWdodF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhbiBhcnJheSBvZiB0aGUgdmlkZW8gaG9yaXpvbnRhbCBhbmQgdmVydGljYWwgaW5kZW50cyxcbiAgICAgKiBzbyB0aGF0IGlmIGZpdHMgaXRzIHBhcmVudC5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gYW4gYXJyYXkgd2l0aCAyIGVsZW1lbnRzLCB0aGUgaG9yaXpvbnRhbCBpbmRlbnQgYW5kIHRoZSB2ZXJ0aWNhbFxuICAgICAqIGluZGVudFxuICAgICAqL1xuICAgIG15LmdldENhbWVyYVZpZGVvUG9zaXRpb24gPSBmdW5jdGlvbih2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlSGVpZ2h0KSB7XG4gICAgICAgIC8vIFBhcmVudCBoZWlnaHQgaXNuJ3QgY29tcGxldGVseSBjYWxjdWxhdGVkIHdoZW4gd2UgcG9zaXRpb24gdGhlIHZpZGVvIGluXG4gICAgICAgIC8vIGZ1bGwgc2NyZWVuIG1vZGUgYW5kIHRoaXMgaXMgd2h5IHdlIHVzZSB0aGUgc2NyZWVuIGhlaWdodCBpbiB0aGlzIGNhc2UuXG4gICAgICAgIC8vIE5lZWQgdG8gdGhpbmsgaXQgZnVydGhlciBhdCBzb21lIHBvaW50IGFuZCBpbXBsZW1lbnQgaXQgcHJvcGVybHkuXG4gICAgICAgIHZhciBpc0Z1bGxTY3JlZW4gPSBWaWRlb0xheW91dC5pc0Z1bGxTY3JlZW4oKTtcbiAgICAgICAgaWYgKGlzRnVsbFNjcmVlbilcbiAgICAgICAgICAgIHZpZGVvU3BhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG5cbiAgICAgICAgdmFyIGhvcml6b250YWxJbmRlbnQgPSAodmlkZW9TcGFjZVdpZHRoIC0gdmlkZW9XaWR0aCkgLyAyO1xuICAgICAgICB2YXIgdmVydGljYWxJbmRlbnQgPSAodmlkZW9TcGFjZUhlaWdodCAtIHZpZGVvSGVpZ2h0KSAvIDI7XG5cbiAgICAgICAgcmV0dXJuIFtob3Jpem9udGFsSW5kZW50LCB2ZXJ0aWNhbEluZGVudF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWV0aG9kIHVzZWQgdG8gZ2V0IGxhcmdlIHZpZGVvIHBvc2l0aW9uLlxuICAgICAqIEB0eXBlIHtmdW5jdGlvbiAoKX1cbiAgICAgKi9cbiAgICB2YXIgZ2V0VmlkZW9Qb3NpdGlvbiA9IG15LmdldENhbWVyYVZpZGVvUG9zaXRpb247XG5cbiAgICAvKipcbiAgICAgKiBNZXRob2QgdXNlZCB0byBjYWxjdWxhdGUgbGFyZ2UgdmlkZW8gc2l6ZS5cbiAgICAgKiBAdHlwZSB7ZnVuY3Rpb24gKCl9XG4gICAgICovXG4gICAgdmFyIGdldFZpZGVvU2l6ZSA9IG15LmdldENhbWVyYVZpZGVvU2l6ZTtcblxuICAgIG15LmlzRnVsbFNjcmVlbiA9IGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5mdWxsU2NyZWVuIHx8XG4gICAgICAgICAgICBkb2N1bWVudC5tb3pGdWxsU2NyZWVuIHx8XG4gICAgICAgICAgICBkb2N1bWVudC53ZWJraXRJc0Z1bGxTY3JlZW47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyB0aGUgZWRpdCBkaXNwbGF5IG5hbWUgYnV0dG9uLlxuICAgICAqXG4gICAgICogQHJldHVybnMgdGhlIGVkaXQgYnV0dG9uXG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlRWRpdERpc3BsYXlOYW1lQnV0dG9uKCkge1xuICAgICAgICB2YXIgZWRpdEJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgZWRpdEJ1dHRvbi5jbGFzc05hbWUgPSAnZGlzcGxheW5hbWUnO1xuICAgICAgICBVdGlsLnNldFRvb2x0aXAoZWRpdEJ1dHRvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICdDbGljayB0byBlZGl0IHlvdXI8YnIvPmRpc3BsYXkgbmFtZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInRvcFwiKTtcbiAgICAgICAgZWRpdEJ1dHRvbi5pbm5lckhUTUwgPSAnPGkgY2xhc3M9XCJmYSBmYS1wZW5jaWxcIj48L2k+JztcblxuICAgICAgICByZXR1cm4gZWRpdEJ1dHRvbjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIHRoZSBlbGVtZW50IGluZGljYXRpbmcgdGhlIGZvY3VzIG9mIHRoZSBjb25mZXJlbmNlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHBhcmVudEVsZW1lbnQgdGhlIHBhcmVudCBlbGVtZW50IHdoZXJlIHRoZSBmb2N1cyBpbmRpY2F0b3Igd2lsbFxuICAgICAqIGJlIGFkZGVkXG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlRm9jdXNJbmRpY2F0b3JFbGVtZW50KHBhcmVudEVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGZvY3VzSW5kaWNhdG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaScpO1xuICAgICAgICBmb2N1c0luZGljYXRvci5jbGFzc05hbWUgPSAnZmEgZmEtc3Rhcic7XG4gICAgICAgIHBhcmVudEVsZW1lbnQuYXBwZW5kQ2hpbGQoZm9jdXNJbmRpY2F0b3IpO1xuXG4gICAgICAgIFV0aWwuc2V0VG9vbHRpcChwYXJlbnRFbGVtZW50LFxuICAgICAgICAgICAgICAgIFwiVGhlIG93bmVyIG9mPGJyLz50aGlzIGNvbmZlcmVuY2VcIixcbiAgICAgICAgICAgICAgICBcInRvcFwiKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSByZW1vdGUgdmlkZW8gbWVudS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBqaWQgdGhlIGppZCBpbmRpY2F0aW5nIHRoZSB2aWRlbyBmb3Igd2hpY2ggd2UncmUgYWRkaW5nIGEgbWVudS5cbiAgICAgKiBAcGFyYW0gaXNNdXRlZCBpbmRpY2F0ZXMgdGhlIGN1cnJlbnQgbXV0ZSBzdGF0ZVxuICAgICAqL1xuICAgIG15LnVwZGF0ZVJlbW90ZVZpZGVvTWVudSA9IGZ1bmN0aW9uKGppZCwgaXNNdXRlZCkge1xuICAgICAgICB2YXIgbXV0ZU1lbnVJdGVtXG4gICAgICAgICAgICA9ICQoJyNyZW1vdGVfcG9wdXBtZW51XydcbiAgICAgICAgICAgICAgICAgICAgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpXG4gICAgICAgICAgICAgICAgICAgICsgJz5saT5hLm11dGVsaW5rJyk7XG5cbiAgICAgICAgdmFyIG11dGVkSW5kaWNhdG9yID0gXCI8aSBjbGFzcz0naWNvbi1taWMtZGlzYWJsZWQnPjwvaT5cIjtcblxuICAgICAgICBpZiAobXV0ZU1lbnVJdGVtLmxlbmd0aCkge1xuICAgICAgICAgICAgdmFyIG11dGVMaW5rID0gbXV0ZU1lbnVJdGVtLmdldCgwKTtcblxuICAgICAgICAgICAgaWYgKGlzTXV0ZWQgPT09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgIG11dGVMaW5rLmlubmVySFRNTCA9IG11dGVkSW5kaWNhdG9yICsgJyBNdXRlZCc7XG4gICAgICAgICAgICAgICAgbXV0ZUxpbmsuY2xhc3NOYW1lID0gJ211dGVsaW5rIGRpc2FibGVkJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG11dGVMaW5rLmlubmVySFRNTCA9IG11dGVkSW5kaWNhdG9yICsgJyBNdXRlJztcbiAgICAgICAgICAgICAgICBtdXRlTGluay5jbGFzc05hbWUgPSAnbXV0ZWxpbmsnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGN1cnJlbnQgZG9taW5hbnQgc3BlYWtlciByZXNvdXJjZSBqaWQuXG4gICAgICovXG4gICAgbXkuZ2V0RG9taW5hbnRTcGVha2VyUmVzb3VyY2VKaWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBjdXJyZW50RG9taW5hbnRTcGVha2VyO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBjb3JyZXNwb25kaW5nIHJlc291cmNlIGppZCB0byB0aGUgZ2l2ZW4gcGVlciBjb250YWluZXJcbiAgICAgKiBET00gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gdGhlIGNvcnJlc3BvbmRpbmcgcmVzb3VyY2UgamlkIHRvIHRoZSBnaXZlbiBwZWVyIGNvbnRhaW5lclxuICAgICAqIERPTSBlbGVtZW50XG4gICAgICovXG4gICAgbXkuZ2V0UGVlckNvbnRhaW5lclJlc291cmNlSmlkID0gZnVuY3Rpb24gKGNvbnRhaW5lckVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGkgPSBjb250YWluZXJFbGVtZW50LmlkLmluZGV4T2YoJ3BhcnRpY2lwYW50XycpO1xuXG4gICAgICAgIGlmIChpID49IDApXG4gICAgICAgICAgICByZXR1cm4gY29udGFpbmVyRWxlbWVudC5pZC5zdWJzdHJpbmcoaSArIDEyKTsgXG4gICAgfTtcblxuICAgIG15Lm9uUmVtb3RlU3RyZWFtQWRkZWQgPSBmdW5jdGlvbiAoc3RyZWFtKSB7XG4gICAgICAgIHZhciBjb250YWluZXI7XG4gICAgICAgIHZhciByZW1vdGVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JlbW90ZVZpZGVvcycpO1xuXG4gICAgICAgIGlmIChzdHJlYW0ucGVlcmppZCkge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuZW5zdXJlUGVlckNvbnRhaW5lckV4aXN0cyhzdHJlYW0ucGVlcmppZCk7XG5cbiAgICAgICAgICAgIGNvbnRhaW5lciAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcbiAgICAgICAgICAgICAgICAgICAgJ3BhcnRpY2lwYW50XycgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChzdHJlYW0ucGVlcmppZCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHN0cmVhbS5zdHJlYW0uaWQgIT09ICdtaXhlZG1zbGFiZWwnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvciggICdjYW4gbm90IGFzc29jaWF0ZSBzdHJlYW0nLFxuICAgICAgICAgICAgICAgICAgICBzdHJlYW0uc3RyZWFtLmlkLFxuICAgICAgICAgICAgICAgICAgICAnd2l0aCBhIHBhcnRpY2lwYW50Jyk7XG4gICAgICAgICAgICAgICAgLy8gV2UgZG9uJ3Qgd2FudCB0byBhZGQgaXQgaGVyZSBzaW5jZSBpdCB3aWxsIGNhdXNlIHRyb3VibGVzXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRklYTUU6IGZvciB0aGUgbWl4ZWQgbXMgd2UgZG9udCBuZWVkIGEgdmlkZW8gLS0gY3VycmVudGx5XG4gICAgICAgICAgICBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICBjb250YWluZXIuaWQgPSAnbWl4ZWRzdHJlYW0nO1xuICAgICAgICAgICAgY29udGFpbmVyLmNsYXNzTmFtZSA9ICd2aWRlb2NvbnRhaW5lcic7XG4gICAgICAgICAgICByZW1vdGVzLmFwcGVuZENoaWxkKGNvbnRhaW5lcik7XG4gICAgICAgICAgICBVdGlsLnBsYXlTb3VuZE5vdGlmaWNhdGlvbigndXNlckpvaW5lZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbnRhaW5lcikge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuYWRkUmVtb3RlU3RyZWFtRWxlbWVudCggY29udGFpbmVyLFxuICAgICAgICAgICAgICAgIHN0cmVhbS5zaWQsXG4gICAgICAgICAgICAgICAgc3RyZWFtLnN0cmVhbSxcbiAgICAgICAgICAgICAgICBzdHJlYW0ucGVlcmppZCxcbiAgICAgICAgICAgICAgICBzdHJlYW0uc3NyYyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBZGRzIHRoZSByZW1vdGUgdmlkZW8gbWVudSBlbGVtZW50IGZvciB0aGUgZ2l2ZW4gPHR0PmppZDwvdHQ+IGluIHRoZVxuICAgICAqIGdpdmVuIDx0dD5wYXJlbnRFbGVtZW50PC90dD4uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gamlkIHRoZSBqaWQgaW5kaWNhdGluZyB0aGUgdmlkZW8gZm9yIHdoaWNoIHdlJ3JlIGFkZGluZyBhIG1lbnUuXG4gICAgICogQHBhcmFtIHBhcmVudEVsZW1lbnQgdGhlIHBhcmVudCBlbGVtZW50IHdoZXJlIHRoaXMgbWVudSB3aWxsIGJlIGFkZGVkXG4gICAgICovXG4gICAgZnVuY3Rpb24gYWRkUmVtb3RlVmlkZW9NZW51KGppZCwgcGFyZW50RWxlbWVudCkge1xuICAgICAgICB2YXIgc3BhbkVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgIHNwYW5FbGVtZW50LmNsYXNzTmFtZSA9ICdyZW1vdGV2aWRlb21lbnUnO1xuXG4gICAgICAgIHBhcmVudEVsZW1lbnQuYXBwZW5kQ2hpbGQoc3BhbkVsZW1lbnQpO1xuXG4gICAgICAgIHZhciBtZW51RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2knKTtcbiAgICAgICAgbWVudUVsZW1lbnQuY2xhc3NOYW1lID0gJ2ZhIGZhLWFuZ2xlLWRvd24nO1xuICAgICAgICBtZW51RWxlbWVudC50aXRsZSA9ICdSZW1vdGUgdXNlciBjb250cm9scyc7XG4gICAgICAgIHNwYW5FbGVtZW50LmFwcGVuZENoaWxkKG1lbnVFbGVtZW50KTtcblxuLy8gICAgICAgIDx1bCBjbGFzcz1cInBvcHVwbWVudVwiPlxuLy8gICAgICAgIDxsaT48YSBocmVmPVwiI1wiPk11dGU8L2E+PC9saT5cbi8vICAgICAgICA8bGk+PGEgaHJlZj1cIiNcIj5FamVjdDwvYT48L2xpPlxuLy8gICAgICAgIDwvdWw+XG4gICAgICAgIHZhciBwb3B1cG1lbnVFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndWwnKTtcbiAgICAgICAgcG9wdXBtZW51RWxlbWVudC5jbGFzc05hbWUgPSAncG9wdXBtZW51JztcbiAgICAgICAgcG9wdXBtZW51RWxlbWVudC5pZFxuICAgICAgICAgICAgPSAncmVtb3RlX3BvcHVwbWVudV8nICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKTtcbiAgICAgICAgc3BhbkVsZW1lbnQuYXBwZW5kQ2hpbGQocG9wdXBtZW51RWxlbWVudCk7XG5cbiAgICAgICAgdmFyIG11dGVNZW51SXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gICAgICAgIHZhciBtdXRlTGlua0l0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG5cbiAgICAgICAgdmFyIG11dGVkSW5kaWNhdG9yID0gXCI8aSBjbGFzcz0naWNvbi1taWMtZGlzYWJsZWQnPjwvaT5cIjtcblxuICAgICAgICBpZiAoIW11dGVkQXVkaW9zW2ppZF0pIHtcbiAgICAgICAgICAgIG11dGVMaW5rSXRlbS5pbm5lckhUTUwgPSBtdXRlZEluZGljYXRvciArICdNdXRlJztcbiAgICAgICAgICAgIG11dGVMaW5rSXRlbS5jbGFzc05hbWUgPSAnbXV0ZWxpbmsnO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbXV0ZUxpbmtJdGVtLmlubmVySFRNTCA9IG11dGVkSW5kaWNhdG9yICsgJyBNdXRlZCc7XG4gICAgICAgICAgICBtdXRlTGlua0l0ZW0uY2xhc3NOYW1lID0gJ211dGVsaW5rIGRpc2FibGVkJztcbiAgICAgICAgfVxuXG4gICAgICAgIG11dGVMaW5rSXRlbS5vbmNsaWNrID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGlmICgkKHRoaXMpLmF0dHIoJ2Rpc2FibGVkJykgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpc011dGUgPSAhbXV0ZWRBdWRpb3NbamlkXTtcbiAgICAgICAgICAgIGNvbm5lY3Rpb24ubW9kZXJhdGUuc2V0TXV0ZShqaWQsIGlzTXV0ZSk7XG4gICAgICAgICAgICBwb3B1cG1lbnVFbGVtZW50LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnZGlzcGxheTpub25lOycpO1xuXG4gICAgICAgICAgICBpZiAoaXNNdXRlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbm5lckhUTUwgPSBtdXRlZEluZGljYXRvciArICcgTXV0ZWQnO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xhc3NOYW1lID0gJ211dGVsaW5rIGRpc2FibGVkJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5uZXJIVE1MID0gbXV0ZWRJbmRpY2F0b3IgKyAnIE11dGUnO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xhc3NOYW1lID0gJ211dGVsaW5rJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBtdXRlTWVudUl0ZW0uYXBwZW5kQ2hpbGQobXV0ZUxpbmtJdGVtKTtcbiAgICAgICAgcG9wdXBtZW51RWxlbWVudC5hcHBlbmRDaGlsZChtdXRlTWVudUl0ZW0pO1xuXG4gICAgICAgIHZhciBlamVjdEluZGljYXRvciA9IFwiPGkgY2xhc3M9J2ZhIGZhLWVqZWN0Jz48L2k+XCI7XG5cbiAgICAgICAgdmFyIGVqZWN0TWVudUl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuICAgICAgICB2YXIgZWplY3RMaW5rSXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgZWplY3RMaW5rSXRlbS5pbm5lckhUTUwgPSBlamVjdEluZGljYXRvciArICcgS2ljayBvdXQnO1xuICAgICAgICBlamVjdExpbmtJdGVtLm9uY2xpY2sgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgY29ubmVjdGlvbi5tb2RlcmF0ZS5lamVjdChqaWQpO1xuICAgICAgICAgICAgcG9wdXBtZW51RWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ2Rpc3BsYXk6bm9uZTsnKTtcbiAgICAgICAgfTtcblxuICAgICAgICBlamVjdE1lbnVJdGVtLmFwcGVuZENoaWxkKGVqZWN0TGlua0l0ZW0pO1xuICAgICAgICBwb3B1cG1lbnVFbGVtZW50LmFwcGVuZENoaWxkKGVqZWN0TWVudUl0ZW0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE9uIGF1ZGlvIG11dGVkIGV2ZW50LlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ2F1ZGlvbXV0ZWQubXVjJywgZnVuY3Rpb24gKGV2ZW50LCBqaWQsIGlzTXV0ZWQpIHtcbiAgICAgICAgdmFyIHZpZGVvU3BhbklkID0gbnVsbDtcbiAgICAgICAgaWYgKGppZCA9PT0gY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZCkge1xuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAnbG9jYWxWaWRlb0NvbnRhaW5lcic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5lbnN1cmVQZWVyQ29udGFpbmVyRXhpc3RzKGppZCk7XG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdwYXJ0aWNpcGFudF8nICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmb2N1cykge1xuICAgICAgICAgICAgbXV0ZWRBdWRpb3NbamlkXSA9IGlzTXV0ZWQ7XG4gICAgICAgICAgICBWaWRlb0xheW91dC51cGRhdGVSZW1vdGVWaWRlb01lbnUoamlkLCBpc011dGVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2aWRlb1NwYW5JZClcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dBdWRpb0luZGljYXRvcih2aWRlb1NwYW5JZCwgaXNNdXRlZCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBPbiB2aWRlbyBtdXRlZCBldmVudC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCd2aWRlb211dGVkLm11YycsIGZ1bmN0aW9uIChldmVudCwgamlkLCBpc011dGVkKSB7XG4gICAgICAgIHZhciB2aWRlb1NwYW5JZCA9IG51bGw7XG4gICAgICAgIGlmIChqaWQgPT09IGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQpIHtcbiAgICAgICAgICAgIHZpZGVvU3BhbklkID0gJ2xvY2FsVmlkZW9Db250YWluZXInO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuZW5zdXJlUGVlckNvbnRhaW5lckV4aXN0cyhqaWQpO1xuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAncGFydGljaXBhbnRfJyArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGppZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodmlkZW9TcGFuSWQpXG4gICAgICAgICAgICBWaWRlb0xheW91dC5zaG93VmlkZW9JbmRpY2F0b3IodmlkZW9TcGFuSWQsIGlzTXV0ZWQpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogRGlzcGxheSBuYW1lIGNoYW5nZWQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgnZGlzcGxheW5hbWVjaGFuZ2VkJyxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKGV2ZW50LCBqaWQsIGRpc3BsYXlOYW1lLCBzdGF0dXMpIHtcbiAgICAgICAgaWYgKGppZCA9PT0gJ2xvY2FsVmlkZW9Db250YWluZXInXG4gICAgICAgICAgICB8fCBqaWQgPT09IGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQpIHtcbiAgICAgICAgICAgIHNldERpc3BsYXlOYW1lKCdsb2NhbFZpZGVvQ29udGFpbmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmVuc3VyZVBlZXJDb250YWluZXJFeGlzdHMoamlkKTtcblxuICAgICAgICAgICAgc2V0RGlzcGxheU5hbWUoXG4gICAgICAgICAgICAgICAgJ3BhcnRpY2lwYW50XycgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lLFxuICAgICAgICAgICAgICAgIHN0YXR1cyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIE9uIGRvbWluYW50IHNwZWFrZXIgY2hhbmdlZCBldmVudC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdkb21pbmFudHNwZWFrZXJjaGFuZ2VkJywgZnVuY3Rpb24gKGV2ZW50LCByZXNvdXJjZUppZCkge1xuICAgICAgICAvLyBXZSBpZ25vcmUgbG9jYWwgdXNlciBldmVudHMuXG4gICAgICAgIGlmIChyZXNvdXJjZUppZFxuICAgICAgICAgICAgICAgID09PSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChjb25uZWN0aW9uLmVtdWMubXlyb29tamlkKSlcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAvLyBVcGRhdGUgdGhlIGN1cnJlbnQgZG9taW5hbnQgc3BlYWtlci5cbiAgICAgICAgaWYgKHJlc291cmNlSmlkICE9PSBjdXJyZW50RG9taW5hbnRTcGVha2VyKSB7XG4gICAgICAgICAgICB2YXIgb2xkU3BlYWtlclZpZGVvU3BhbklkID0gXCJwYXJ0aWNpcGFudF9cIiArIGN1cnJlbnREb21pbmFudFNwZWFrZXIsXG4gICAgICAgICAgICAgICAgbmV3U3BlYWtlclZpZGVvU3BhbklkID0gXCJwYXJ0aWNpcGFudF9cIiArIHJlc291cmNlSmlkO1xuICAgICAgICAgICAgaWYoJChcIiNcIiArIG9sZFNwZWFrZXJWaWRlb1NwYW5JZCArIFwiPnNwYW4uZGlzcGxheW5hbWVcIikudGV4dCgpID09PVxuICAgICAgICAgICAgICAgIGludGVyZmFjZUNvbmZpZy5ERUZBVUxUX0RPTUlOQU5UX1NQRUFLRVJfRElTUExBWV9OQU1FKSB7XG4gICAgICAgICAgICAgICAgc2V0RGlzcGxheU5hbWUob2xkU3BlYWtlclZpZGVvU3BhbklkLCBudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKCQoXCIjXCIgKyBuZXdTcGVha2VyVmlkZW9TcGFuSWQgKyBcIj5zcGFuLmRpc3BsYXluYW1lXCIpLnRleHQoKSA9PT1cbiAgICAgICAgICAgICAgICBpbnRlcmZhY2VDb25maWcuREVGQVVMVF9SRU1PVEVfRElTUExBWV9OQU1FKSB7XG4gICAgICAgICAgICAgICAgc2V0RGlzcGxheU5hbWUobmV3U3BlYWtlclZpZGVvU3BhbklkLFxuICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2VDb25maWcuREVGQVVMVF9ET01JTkFOVF9TUEVBS0VSX0RJU1BMQVlfTkFNRSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdXJyZW50RG9taW5hbnRTcGVha2VyID0gcmVzb3VyY2VKaWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBPYnRhaW4gY29udGFpbmVyIGZvciBuZXcgZG9taW5hbnQgc3BlYWtlci5cbiAgICAgICAgdmFyIGNvbnRhaW5lciAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcbiAgICAgICAgICAgICAgICAncGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkKTtcblxuICAgICAgICAvLyBMb2NhbCB2aWRlbyB3aWxsIG5vdCBoYXZlIGNvbnRhaW5lciBmb3VuZCwgYnV0IHRoYXQncyBva1xuICAgICAgICAvLyBzaW5jZSB3ZSBkb24ndCB3YW50IHRvIHN3aXRjaCB0byBsb2NhbCB2aWRlby5cbiAgICAgICAgaWYgKGNvbnRhaW5lciAmJiAhVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgdmlkZW8gPSBjb250YWluZXIuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJ2aWRlb1wiKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBsYXJnZSB2aWRlbyBpZiB0aGUgdmlkZW8gc291cmNlIGlzIGFscmVhZHkgYXZhaWxhYmxlLFxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIHdhaXQgZm9yIHRoZSBcInZpZGVvYWN0aXZlLmppbmdsZVwiIGV2ZW50LlxuICAgICAgICAgICAgaWYgKHZpZGVvLmxlbmd0aCAmJiB2aWRlb1swXS5jdXJyZW50VGltZSA+IDApXG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQudXBkYXRlTGFyZ2VWaWRlbyh2aWRlb1swXS5zcmMpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBPbiBsYXN0IE4gY2hhbmdlIGV2ZW50LlxuICAgICAqXG4gICAgICogQHBhcmFtIGV2ZW50IHRoZSBldmVudCB0aGF0IG5vdGlmaWVkIHVzXG4gICAgICogQHBhcmFtIGxhc3RORW5kcG9pbnRzIHRoZSBsaXN0IG9mIGxhc3QgTiBlbmRwb2ludHNcbiAgICAgKiBAcGFyYW0gZW5kcG9pbnRzRW50ZXJpbmdMYXN0TiB0aGUgbGlzdCBjdXJyZW50bHkgZW50ZXJpbmcgbGFzdCBOXG4gICAgICogZW5kcG9pbnRzXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgnbGFzdG5jaGFuZ2VkJywgZnVuY3Rpb24gKCBldmVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RORW5kcG9pbnRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kcG9pbnRzRW50ZXJpbmdMYXN0TixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cmVhbSkge1xuICAgICAgICBpZiAobGFzdE5Db3VudCAhPT0gbGFzdE5FbmRwb2ludHMubGVuZ3RoKVxuICAgICAgICAgICAgbGFzdE5Db3VudCA9IGxhc3RORW5kcG9pbnRzLmxlbmd0aDtcblxuICAgICAgICBsYXN0TkVuZHBvaW50c0NhY2hlID0gbGFzdE5FbmRwb2ludHM7XG5cbiAgICAgICAgJCgnI3JlbW90ZVZpZGVvcz5zcGFuJykuZWFjaChmdW5jdGlvbiggaW5kZXgsIGVsZW1lbnQgKSB7XG4gICAgICAgICAgICB2YXIgcmVzb3VyY2VKaWQgPSBWaWRlb0xheW91dC5nZXRQZWVyQ29udGFpbmVyUmVzb3VyY2VKaWQoZWxlbWVudCk7XG5cbiAgICAgICAgICAgIGlmIChyZXNvdXJjZUppZFxuICAgICAgICAgICAgICAgICYmIGxhc3RORW5kcG9pbnRzLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICAgICAmJiBsYXN0TkVuZHBvaW50cy5pbmRleE9mKHJlc291cmNlSmlkKSA8IDApIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlbW92ZSBmcm9tIGxhc3QgTlwiLCByZXNvdXJjZUppZCk7XG4gICAgICAgICAgICAgICAgc2hvd1BlZXJDb250YWluZXIocmVzb3VyY2VKaWQsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCFlbmRwb2ludHNFbnRlcmluZ0xhc3ROIHx8IGVuZHBvaW50c0VudGVyaW5nTGFzdE4ubGVuZ3RoIDwgMClcbiAgICAgICAgICAgIGVuZHBvaW50c0VudGVyaW5nTGFzdE4gPSBsYXN0TkVuZHBvaW50cztcblxuICAgICAgICBpZiAoZW5kcG9pbnRzRW50ZXJpbmdMYXN0TiAmJiBlbmRwb2ludHNFbnRlcmluZ0xhc3ROLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGVuZHBvaW50c0VudGVyaW5nTGFzdE4uZm9yRWFjaChmdW5jdGlvbiAocmVzb3VyY2VKaWQpIHtcblxuICAgICAgICAgICAgICAgIGlmICghJCgnI3BhcnRpY2lwYW50XycgKyByZXNvdXJjZUppZCkuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJBZGQgdG8gbGFzdCBOXCIsIHJlc291cmNlSmlkKTtcbiAgICAgICAgICAgICAgICAgICAgc2hvd1BlZXJDb250YWluZXIocmVzb3VyY2VKaWQsIHRydWUpO1xuXG4gICAgICAgICAgICAgICAgICAgIGRlcC5VSUFjdGl2YXRvcigpLmdldFJUQ1NlcnZpY2UoKS5yZW1vdGVTdHJlYW1zLnNvbWUoZnVuY3Rpb24gKG1lZGlhU3RyZWFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVkaWFTdHJlYW0ucGVlcmppZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICYmIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKG1lZGlhU3RyZWFtLnBlZXJqaWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID09PSByZXNvdXJjZUppZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICYmIG1lZGlhU3RyZWFtLnR5cGUgPT09IG1lZGlhU3RyZWFtLlZJREVPX1RZUEUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2VsID0gJCgnI3BhcnRpY2lwYW50XycgKyByZXNvdXJjZUppZCArICc+dmlkZW8nKTtcblxuLy88PDw8PDw8IEhFQUQ6VUkvdmlkZW9sYXlvdXQuanNcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dGFjaE1lZGlhU3RyZWFtKHNlbCwgbWVkaWFTdHJlYW0uc3RyZWFtKTtcbi8vPT09PT09PVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzaW11bGNhc3QgPSBuZXcgU2ltdWxjYXN0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZpZGVvU3RyZWFtID0gc2ltdWxjYXN0LmdldFJlY2VpdmluZ1ZpZGVvU3RyZWFtKG1lZGlhU3RyZWFtLnN0cmVhbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0YWNoTWVkaWFTdHJlYW0oc2VsLCB2aWRlb1N0cmVhbSk7XG4vLz4+Pj4+Pj4gbWFzdGVyOnZpZGVvbGF5b3V0LmpzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2FpdEZvclJlbW90ZVZpZGVvKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVkaWFTdHJlYW0uc3NyYyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lZGlhU3RyZWFtLnN0cmVhbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiB3YWl0Rm9yUmVtb3RlVmlkZW8oc2VsZWN0b3IsIHNzcmMsIHN0cmVhbSkge1xuICAgICAgICBpZiAoc2VsZWN0b3IucmVtb3ZlZCB8fCAhc2VsZWN0b3IucGFyZW50KCkuaXMoXCI6dmlzaWJsZVwiKSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKFwiTWVkaWEgcmVtb3ZlZCBiZWZvcmUgaGFkIHN0YXJ0ZWRcIiwgc2VsZWN0b3IpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN0cmVhbS5pZCA9PT0gJ21peGVkbXNsYWJlbCcpIHJldHVybjtcblxuICAgICAgICBpZiAoc2VsZWN0b3JbMF0uY3VycmVudFRpbWUgPiAwKSB7XG4gICAgICAgICAgICB2YXIgc2ltdWxjYXN0ID0gbmV3IFNpbXVsY2FzdCgpO1xuICAgICAgICAgICAgdmFyIHZpZGVvU3RyZWFtID0gc2ltdWxjYXN0LmdldFJlY2VpdmluZ1ZpZGVvU3RyZWFtKHN0cmVhbSk7XG4gICAgICAgICAgICBhdHRhY2hNZWRpYVN0cmVhbShzZWxlY3RvciwgdmlkZW9TdHJlYW0pOyAvLyBGSVhNRTogd2h5IGRvIGkgaGF2ZSB0byBkbyB0aGlzIGZvciBGRj9cblxuICAgICAgICAgICAgLy8gRklYTUU6IGFkZCBhIGNsYXNzIHRoYXQgd2lsbCBhc3NvY2lhdGUgcGVlciBKaWQsIHZpZGVvLnNyYywgaXQncyBzc3JjIGFuZCB2aWRlbyB0eXBlXG4gICAgICAgICAgICAvLyAgICAgICAgaW4gb3JkZXIgdG8gZ2V0IHJpZCBvZiB0b28gbWFueSBtYXBzXG4gICAgICAgICAgICBpZiAoc3NyYyAmJiBzZWxlY3Rvci5hdHRyKCdzcmMnKSkge1xuICAgICAgICAgICAgICAgIHZpZGVvU3JjVG9Tc3JjW3NlbGVjdG9yLmF0dHIoJ3NyYycpXSA9IHNzcmM7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIk5vIHNzcmMgZ2l2ZW4gZm9yIHZpZGVvXCIsIHNlbGVjdG9yKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmlkZW9BY3RpdmUoc2VsZWN0b3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgd2FpdEZvclJlbW90ZVZpZGVvKHNlbGVjdG9yLCBzc3JjLCBzdHJlYW0pO1xuICAgICAgICAgICAgfSwgMjUwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHZpZGVvQWN0aXZlKHZpZGVvZWxlbSkge1xuICAgICAgICBpZiAodmlkZW9lbGVtLmF0dHIoJ2lkJykuaW5kZXhPZignbWl4ZWRtc2xhYmVsJykgPT09IC0xKSB7XG4gICAgICAgICAgICAvLyBpZ25vcmUgbWl4ZWRtc2xhYmVsYTAgYW5kIHYwXG5cbiAgICAgICAgICAgIHZpZGVvZWxlbS5zaG93KCk7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5yZXNpemVUaHVtYm5haWxzKCk7XG5cbiAgICAgICAgICAgIHZhciB2aWRlb1BhcmVudCA9IHZpZGVvZWxlbS5wYXJlbnQoKTtcbiAgICAgICAgICAgIHZhciBwYXJlbnRSZXNvdXJjZUppZCA9IG51bGw7XG4gICAgICAgICAgICBpZiAodmlkZW9QYXJlbnQpXG4gICAgICAgICAgICAgICAgcGFyZW50UmVzb3VyY2VKaWRcbiAgICAgICAgICAgICAgICAgICAgPSBWaWRlb0xheW91dC5nZXRQZWVyQ29udGFpbmVyUmVzb3VyY2VKaWQodmlkZW9QYXJlbnRbMF0pO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGxhcmdlIHZpZGVvIHRvIHRoZSBsYXN0IGFkZGVkIHZpZGVvIG9ubHkgaWYgdGhlcmUncyBub1xuICAgICAgICAgICAgLy8gY3VycmVudCBkb21pbmFudCBvciBmb2N1c2VkIHNwZWFrZXIgb3IgdXBkYXRlIGl0IHRvIHRoZSBjdXJyZW50XG4gICAgICAgICAgICAvLyBkb21pbmFudCBzcGVha2VyLlxuICAgICAgICAgICAgaWYgKCghVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjICYmICFWaWRlb0xheW91dC5nZXREb21pbmFudFNwZWFrZXJSZXNvdXJjZUppZCgpKVxuICAgICAgICAgICAgICAgIHx8IChwYXJlbnRSZXNvdXJjZUppZFxuICAgICAgICAgICAgICAgICYmIFZpZGVvTGF5b3V0LmdldERvbWluYW50U3BlYWtlclJlc291cmNlSmlkKClcbiAgICAgICAgICAgICAgICAgICAgPT09IHBhcmVudFJlc291cmNlSmlkKSkge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8odmlkZW9lbGVtLmF0dHIoJ3NyYycpLCAxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0ZvY3VzSW5kaWNhdG9yKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgbXkucmVzaXplVmlkZW9TcGFjZSA9IGZ1bmN0aW9uKHJpZ2h0Q29sdW1uRWwsIHJpZ2h0Q29sdW1uU2l6ZSwgaXNWaXNpYmxlKVxuICAgIHtcbiAgICAgICAgdmFyIHZpZGVvc3BhY2UgPSAkKCcjdmlkZW9zcGFjZScpO1xuXG4gICAgICAgIHZhciB2aWRlb3NwYWNlV2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aCAtIHJpZ2h0Q29sdW1uU2l6ZVswXTtcbiAgICAgICAgdmFyIHZpZGVvc3BhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIHZhciB2aWRlb1NpemVcbiAgICAgICAgICAgID0gZ2V0VmlkZW9TaXplKG51bGwsIG51bGwsIHZpZGVvc3BhY2VXaWR0aCwgdmlkZW9zcGFjZUhlaWdodCk7XG4gICAgICAgIHZhciB2aWRlb1dpZHRoID0gdmlkZW9TaXplWzBdO1xuICAgICAgICB2YXIgdmlkZW9IZWlnaHQgPSB2aWRlb1NpemVbMV07XG4gICAgICAgIHZhciB2aWRlb1Bvc2l0aW9uID0gZ2V0VmlkZW9Qb3NpdGlvbih2aWRlb1dpZHRoLFxuICAgICAgICAgICAgdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICB2aWRlb3NwYWNlV2lkdGgsXG4gICAgICAgICAgICB2aWRlb3NwYWNlSGVpZ2h0KTtcbiAgICAgICAgdmFyIGhvcml6b250YWxJbmRlbnQgPSB2aWRlb1Bvc2l0aW9uWzBdO1xuICAgICAgICB2YXIgdmVydGljYWxJbmRlbnQgPSB2aWRlb1Bvc2l0aW9uWzFdO1xuXG4gICAgICAgIHZhciB0aHVtYm5haWxTaXplID0gVmlkZW9MYXlvdXQuY2FsY3VsYXRlVGh1bWJuYWlsU2l6ZSh2aWRlb3NwYWNlV2lkdGgpO1xuICAgICAgICB2YXIgdGh1bWJuYWlsc1dpZHRoID0gdGh1bWJuYWlsU2l6ZVswXTtcbiAgICAgICAgdmFyIHRodW1ibmFpbHNIZWlnaHQgPSB0aHVtYm5haWxTaXplWzFdO1xuXG4gICAgICAgIGlmIChpc1Zpc2libGUpIHtcbiAgICAgICAgICAgIHZpZGVvc3BhY2UuYW5pbWF0ZSh7cmlnaHQ6IHJpZ2h0Q29sdW1uU2l6ZVswXSxcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHZpZGVvc3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB2aWRlb3NwYWNlSGVpZ2h0fSxcbiAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwfSk7XG5cbiAgICAgICAgICAgICQoJyNyZW1vdGVWaWRlb3MnKS5hbmltYXRlKHtoZWlnaHQ6IHRodW1ibmFpbHNIZWlnaHR9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDB9KTtcblxuICAgICAgICAgICAgJCgnI3JlbW90ZVZpZGVvcz5zcGFuJykuYW5pbWF0ZSh7aGVpZ2h0OiB0aHVtYm5haWxzSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogdGh1bWJuYWlsc1dpZHRofSxcbiAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicmVtb3RldmlkZW8ucmVzaXplZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt0aHVtYm5haWxzV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRodW1ibmFpbHNIZWlnaHRdKTtcbiAgICAgICAgICAgICAgICAgICAgfX0pO1xuXG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlb0NvbnRhaW5lcicpLmFuaW1hdGUoeyB3aWR0aDogdmlkZW9zcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZpZGVvc3BhY2VIZWlnaHR9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDBcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5hbmltYXRlKHsgIHdpZHRoOiB2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB0b3A6IHZlcnRpY2FsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICBib3R0b206IHZlcnRpY2FsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiBob3Jpem9udGFsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICByaWdodDogaG9yaXpvbnRhbEluZGVudH0sXG4gICAgICAgICAgICAgICAgeyAgIHF1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMFxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByaWdodENvbHVtbkVsLmhpZGUoXCJzbGlkZVwiLCB7IGRpcmVjdGlvbjogXCJyaWdodFwiLFxuICAgICAgICAgICAgICAgIHF1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBVbmRvY2sgdGhlIHRvb2xiYXIgd2hlbiB0aGUgY2hhdCBpcyBzaG93biBhbmQgaWYgd2UncmUgaW4gYVxuICAgICAgICAgICAgLy8gdmlkZW8gbW9kZS5cbiAgICAgICAgICAgIGlmIChWaWRlb0xheW91dC5pc0xhcmdlVmlkZW9WaXNpYmxlKCkpXG4gICAgICAgICAgICAgICAgZGVwLlRvb2xiYXIoKS5kb2NrVG9vbGJhcihmYWxzZSk7XG5cbiAgICAgICAgICAgIHZpZGVvc3BhY2UuYW5pbWF0ZSh7cmlnaHQ6IHJpZ2h0Q29sdW1uU2l6ZVswXSxcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHZpZGVvc3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB2aWRlb3NwYWNlSGVpZ2h0fSxcbiAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHRDb2x1bW5FbC50cmlnZ2VyKCdzaG93bicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICQoJyNyZW1vdGVWaWRlb3MnKS5hbmltYXRlKHtoZWlnaHQ6IHRodW1ibmFpbHNIZWlnaHR9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDB9KTtcblxuICAgICAgICAgICAgJCgnI3JlbW90ZVZpZGVvcz5zcGFuJykuYW5pbWF0ZSh7aGVpZ2h0OiB0aHVtYm5haWxzSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogdGh1bWJuYWlsc1dpZHRofSxcbiAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicmVtb3RldmlkZW8ucmVzaXplZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt0aHVtYm5haWxzV2lkdGgsIHRodW1ibmFpbHNIZWlnaHRdKTtcbiAgICAgICAgICAgICAgICAgICAgfX0pO1xuXG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlb0NvbnRhaW5lcicpLmFuaW1hdGUoeyB3aWR0aDogdmlkZW9zcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZpZGVvc3BhY2VIZWlnaHR9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDBcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5hbmltYXRlKHsgIHdpZHRoOiB2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB0b3A6IHZlcnRpY2FsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICBib3R0b206IHZlcnRpY2FsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiBob3Jpem9udGFsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICByaWdodDogaG9yaXpvbnRhbEluZGVudH0sXG4gICAgICAgICAgICAgICAge3F1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMFxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByaWdodENvbHVtbkVsLnNob3coXCJzbGlkZVwiLCB7IGRpcmVjdGlvbjogXCJyaWdodFwiLFxuICAgICAgICAgICAgICAgIHF1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdzaW11bGNhc3RsYXllcnN0YXJ0ZWQnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICB2YXIgbG9jYWxWaWRlb1NlbGVjdG9yID0gJCgnIycgKyAnbG9jYWxWaWRlb18nICsgY29ubmVjdGlvbi5qaW5nbGUubG9jYWxWaWRlby5pZCk7XG4gICAgICAgIHZhciBzaW11bGNhc3QgPSBuZXcgU2ltdWxjYXN0KCk7XG4gICAgICAgIHZhciBzdHJlYW0gPSBzaW11bGNhc3QuZ2V0TG9jYWxWaWRlb1N0cmVhbSgpO1xuXG4gICAgICAgIC8vIEF0dGFjaCBXZWJSVEMgc3RyZWFtXG4gICAgICAgIGF0dGFjaE1lZGlhU3RyZWFtKGxvY2FsVmlkZW9TZWxlY3Rvciwgc3RyZWFtKTtcblxuICAgICAgICBsb2NhbFZpZGVvU3JjID0gJChsb2NhbFZpZGVvU2VsZWN0b3IpLmF0dHIoJ3NyYycpO1xuICAgIH0pO1xuXG4gICAgJChkb2N1bWVudCkuYmluZCgnc2ltdWxjYXN0bGF5ZXJzdG9wcGVkJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgdmFyIGxvY2FsVmlkZW9TZWxlY3RvciA9ICQoJyMnICsgJ2xvY2FsVmlkZW9fJyArIGNvbm5lY3Rpb24uamluZ2xlLmxvY2FsVmlkZW8uaWQpO1xuICAgICAgICB2YXIgc2ltdWxjYXN0ID0gbmV3IFNpbXVsY2FzdCgpO1xuICAgICAgICB2YXIgc3RyZWFtID0gc2ltdWxjYXN0LmdldExvY2FsVmlkZW9TdHJlYW0oKTtcblxuICAgICAgICAvLyBBdHRhY2ggV2ViUlRDIHN0cmVhbVxuICAgICAgICBhdHRhY2hNZWRpYVN0cmVhbShsb2NhbFZpZGVvU2VsZWN0b3IsIHN0cmVhbSk7XG5cbiAgICAgICAgbG9jYWxWaWRlb1NyYyA9ICQobG9jYWxWaWRlb1NlbGVjdG9yKS5hdHRyKCdzcmMnKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIE9uIHNpbXVsY2FzdCBsYXllcnMgY2hhbmdlZCBldmVudC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdzaW11bGNhc3RsYXllcnNjaGFuZ2VkJywgZnVuY3Rpb24gKGV2ZW50LCBlbmRwb2ludFNpbXVsY2FzdExheWVycykge1xuICAgICAgICB2YXIgc2ltdWxjYXN0ID0gbmV3IFNpbXVsY2FzdCgpO1xuICAgICAgICBlbmRwb2ludFNpbXVsY2FzdExheWVycy5mb3JFYWNoKGZ1bmN0aW9uIChlc2wpIHtcblxuICAgICAgICAgICAgdmFyIHByaW1hcnlTU1JDID0gZXNsLnNpbXVsY2FzdExheWVyLnByaW1hcnlTU1JDO1xuICAgICAgICAgICAgdmFyIG1zaWQgPSBzaW11bGNhc3QuZ2V0UmVtb3RlVmlkZW9TdHJlYW1JZEJ5U1NSQyhwcmltYXJ5U1NSQyk7XG5cbiAgICAgICAgICAgIC8vIEdldCBzZXNzaW9uIGFuZCBzdHJlYW0gZnJvbSBtc2lkLlxuICAgICAgICAgICAgdmFyIHNlc3Npb24sIGVsZWN0ZWRTdHJlYW07XG4gICAgICAgICAgICB2YXIgaSwgaiwgaztcbiAgICAgICAgICAgIGlmIChjb25uZWN0aW9uLmppbmdsZSkge1xuICAgICAgICAgICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoY29ubmVjdGlvbi5qaW5nbGUuc2Vzc2lvbnMpO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzaWQgPSBrZXlzW2ldO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVjdGVkU3RyZWFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzdHJlYW0gZm91bmQsIHN0b3AuXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb24gPSBjb25uZWN0aW9uLmppbmdsZS5zZXNzaW9uc1tzaWRdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5yZW1vdGVTdHJlYW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgc2Vzc2lvbi5yZW1vdGVTdHJlYW1zLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlbW90ZVN0cmVhbSA9IHNlc3Npb24ucmVtb3RlU3RyZWFtc1tqXTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVjdGVkU3RyZWFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHN0cmVhbSBmb3VuZCwgc3RvcC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0cmFja3MgPSByZW1vdGVTdHJlYW0uZ2V0VmlkZW9UcmFja3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodHJhY2tzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoayA9IDA7IGsgPCB0cmFja3MubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0cmFjayA9IHRyYWNrc1trXTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1zaWQgPT09IFtyZW1vdGVTdHJlYW0uaWQsIHRyYWNrLmlkXS5qb2luKCcgJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVjdGVkU3RyZWFtID0gbmV3IHdlYmtpdE1lZGlhU3RyZWFtKFt0cmFja10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHN0cmVhbSBmb3VuZCwgc3RvcC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHNlc3Npb24gJiYgZWxlY3RlZFN0cmVhbSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnU3dpdGNoaW5nIHNpbXVsY2FzdCBzdWJzdHJlYW0uJyk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKFtlc2wsIHByaW1hcnlTU1JDLCBtc2lkLCBzZXNzaW9uLCBlbGVjdGVkU3RyZWFtXSk7XG5cbiAgICAgICAgICAgICAgICB2YXIgbXNpZFBhcnRzID0gbXNpZC5zcGxpdCgnICcpO1xuICAgICAgICAgICAgICAgIHZhciBzZWxSZW1vdGVWaWRlbyA9ICQoWycjJywgJ3JlbW90ZVZpZGVvXycsIHNlc3Npb24uc2lkLCAnXycsIG1zaWRQYXJ0c1swXV0uam9pbignJykpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHVwZGF0ZUxhcmdlVmlkZW8gPSAoc3NyYzJqaWRbdmlkZW9TcmNUb1NzcmNbc2VsUmVtb3RlVmlkZW8uYXR0cignc3JjJyldXVxuICAgICAgICAgICAgICAgICAgICA9PSBzc3JjMmppZFt2aWRlb1NyY1RvU3NyY1tsYXJnZVZpZGVvTmV3U3JjXV0pO1xuICAgICAgICAgICAgICAgIHZhciB1cGRhdGVGb2N1c2VkVmlkZW9TcmMgPSAoc2VsUmVtb3RlVmlkZW8uYXR0cignc3JjJykgPT0gZm9jdXNlZFZpZGVvU3JjKTtcblxuICAgICAgICAgICAgICAgIHZhciBlbGVjdGVkU3RyZWFtVXJsID0gd2Via2l0VVJMLmNyZWF0ZU9iamVjdFVSTChlbGVjdGVkU3RyZWFtKTtcbiAgICAgICAgICAgICAgICBzZWxSZW1vdGVWaWRlby5hdHRyKCdzcmMnLCBlbGVjdGVkU3RyZWFtVXJsKTtcbiAgICAgICAgICAgICAgICB2aWRlb1NyY1RvU3NyY1tzZWxSZW1vdGVWaWRlby5hdHRyKCdzcmMnKV0gPSBwcmltYXJ5U1NSQztcblxuICAgICAgICAgICAgICAgIGlmICh1cGRhdGVMYXJnZVZpZGVvKSB7XG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8oZWxlY3RlZFN0cmVhbVVybCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHVwZGF0ZUZvY3VzZWRWaWRlb1NyYykge1xuICAgICAgICAgICAgICAgICAgICBmb2N1c2VkVmlkZW9TcmMgPSBlbGVjdGVkU3RyZWFtVXJsO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdDb3VsZCBub3QgZmluZCBhIHN0cmVhbSBvciBhIHNlc3Npb24uJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG15O1xufShWaWRlb0xheW91dCB8fCB7fSkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZGVvTGF5b3V0O1xuIiwidmFyIHVwZGF0ZVRpbWVvdXQ7XG52YXIgYW5pbWF0ZVRpbWVvdXQ7XG52YXIgUm9vbU5hbWVHZW5lcmF0b3IgPSByZXF1aXJlKFwiLi4vdXRpbC9yb29tbmFtZV9nZW5lcmF0b3JcIik7XG5cbmZ1bmN0aW9uIHNldHVwV2VsY29tZVBhZ2UoKSB7XG4gICAgJChcIiNkb21haW5fbmFtZVwiKS50ZXh0KHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArIFwiLy9cIiArIHdpbmRvdy5sb2NhdGlvbi5ob3N0ICsgXCIvXCIpO1xuICAgICQoXCJzcGFuW25hbWU9J2FwcE5hbWUnXVwiKS50ZXh0KGJyYW5kLmFwcE5hbWUpO1xuICAgICQoXCIjZW50ZXJfcm9vbV9idXR0b25cIikuY2xpY2soZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgZW50ZXJfcm9vbSgpO1xuICAgIH0pO1xuXG4gICAgJChcIiNlbnRlcl9yb29tX2ZpZWxkXCIpLmtleWRvd24oZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xuICAgICAgICAgICAgZW50ZXJfcm9vbSgpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAkKFwiI3JlbG9hZF9yb29tbmFtZVwiKS5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh1cGRhdGVUaW1lb3V0KTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KGFuaW1hdGVUaW1lb3V0KTtcbiAgICAgICAgdXBkYXRlX3Jvb21uYW1lKCk7XG4gICAgfSk7XG5cbiAgICAkKFwiI2Rpc2FibGVfd2VsY29tZVwiKS5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uud2VsY29tZVBhZ2VEaXNhYmxlZCA9ICQoXCIjZGlzYWJsZV93ZWxjb21lXCIpLmlzKFwiOmNoZWNrZWRcIik7XG4gICAgfSk7XG5cbiAgICB1cGRhdGVfcm9vbW5hbWUoKTtcbn07XG5cbmZ1bmN0aW9uIGVudGVyX3Jvb20oKVxue1xuICAgIHZhciB2YWwgPSAkKFwiI2VudGVyX3Jvb21fZmllbGRcIikudmFsKCk7XG4gICAgaWYoIXZhbClcbiAgICAgICAgdmFsID0gJChcIiNlbnRlcl9yb29tX2ZpZWxkXCIpLmF0dHIoXCJyb29tX25hbWVcIik7XG4gICAgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lID0gXCIvXCIgKyB2YWw7XG59XG5cbmZ1bmN0aW9uIGFuaW1hdGUod29yZCkge1xuICAgIHZhciBjdXJyZW50VmFsID0gJChcIiNlbnRlcl9yb29tX2ZpZWxkXCIpLmF0dHIoXCJwbGFjZWhvbGRlclwiKTtcbiAgICAkKFwiI2VudGVyX3Jvb21fZmllbGRcIikuYXR0cihcInBsYWNlaG9sZGVyXCIsIGN1cnJlbnRWYWwgKyB3b3JkLnN1YnN0cigwLCAxKSk7XG4gICAgYW5pbWF0ZVRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBhbmltYXRlKHdvcmQuc3Vic3RyaW5nKDEsIHdvcmQubGVuZ3RoKSlcbiAgICB9LCA3MCk7XG59XG5cblxuZnVuY3Rpb24gdXBkYXRlX3Jvb21uYW1lKClcbntcbiAgICB2YXIgd29yZCA9IFJvb21OYW1lR2VuZXJhdG9yLmdlbmVyYXRlUm9vbVdpdGhvdXRTZXBhcmF0b3IoKTtcbiAgICAkKFwiI2VudGVyX3Jvb21fZmllbGRcIikuYXR0cihcInJvb21fbmFtZVwiLCB3b3JkKTtcbiAgICAkKFwiI2VudGVyX3Jvb21fZmllbGRcIikuYXR0cihcInBsYWNlaG9sZGVyXCIsIFwiXCIpO1xuICAgIGFuaW1hdGUod29yZCk7XG4gICAgdXBkYXRlVGltZW91dCA9IHNldFRpbWVvdXQodXBkYXRlX3Jvb21uYW1lLCAxMDAwMCk7XG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZXR1cFdlbGNvbWVQYWdlKCk7XG4iLCJ2YXIgVmlkZW9MYXlvdXQgPSByZXF1aXJlKFwiLi4vVmlkZW9MYXlvdXRcIik7XG52YXIgQ2FudmFzVXRpbCA9IHJlcXVpcmUoXCIuL0NhbnZhc1V0aWwuanNcIik7XG5cbi8qKlxuICogVGhlIGF1ZGlvIExldmVscyBwbHVnaW4uXG4gKi9cbnZhciBBdWRpb0xldmVscyA9IChmdW5jdGlvbihteSkge1xuICAgIHZhciBhdWRpb0xldmVsQ2FudmFzQ2FjaGUgPSB7fTtcblxuICAgIG15LkxPQ0FMX0xFVkVMID0gJ2xvY2FsJztcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIGF1ZGlvIGxldmVsIGNhbnZhcyBmb3IgdGhlIGdpdmVuIHBlZXJKaWQuIElmIHRoZSBjYW52YXNcbiAgICAgKiBkaWRuJ3QgZXhpc3Qgd2UgY3JlYXRlIGl0LlxuICAgICAqL1xuICAgIG15LnVwZGF0ZUF1ZGlvTGV2ZWxDYW52YXMgPSBmdW5jdGlvbiAocGVlckppZCkge1xuICAgICAgICB2YXIgcmVzb3VyY2VKaWQgPSBudWxsO1xuICAgICAgICB2YXIgdmlkZW9TcGFuSWQgPSBudWxsO1xuICAgICAgICBpZiAoIXBlZXJKaWQpXG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdsb2NhbFZpZGVvQ29udGFpbmVyJztcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHBlZXJKaWQpO1xuXG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdwYXJ0aWNpcGFudF8nICsgcmVzb3VyY2VKaWQ7XG4gICAgICAgIH1cblxuICAgICAgICB2aWRlb1NwYW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh2aWRlb1NwYW5JZCk7XG5cbiAgICAgICAgaWYgKCF2aWRlb1NwYW4pIHtcbiAgICAgICAgICAgIGlmIChyZXNvdXJjZUppZClcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiTm8gdmlkZW8gZWxlbWVudCBmb3IgamlkXCIsIHJlc291cmNlSmlkKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiTm8gdmlkZW8gZWxlbWVudCBmb3IgbG9jYWwgdmlkZW8uXCIpO1xuXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYXVkaW9MZXZlbENhbnZhcyA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPmNhbnZhcycpO1xuXG4gICAgICAgIHZhciB2aWRlb1NwYWNlV2lkdGggPSAkKCcjcmVtb3RlVmlkZW9zJykud2lkdGgoKTtcbiAgICAgICAgdmFyIHRodW1ibmFpbFNpemVcbiAgICAgICAgICAgID0gVmlkZW9MYXlvdXQuY2FsY3VsYXRlVGh1bWJuYWlsU2l6ZSh2aWRlb1NwYWNlV2lkdGgpO1xuICAgICAgICB2YXIgdGh1bWJuYWlsV2lkdGggPSB0aHVtYm5haWxTaXplWzBdO1xuICAgICAgICB2YXIgdGh1bWJuYWlsSGVpZ2h0ID0gdGh1bWJuYWlsU2l6ZVsxXTtcblxuICAgICAgICBpZiAoIWF1ZGlvTGV2ZWxDYW52YXMgfHwgYXVkaW9MZXZlbENhbnZhcy5sZW5ndGggPT09IDApIHtcblxuICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhcy5jbGFzc05hbWUgPSBcImF1ZGlvbGV2ZWxcIjtcbiAgICAgICAgICAgIGF1ZGlvTGV2ZWxDYW52YXMuc3R5bGUuYm90dG9tID0gXCItXCIgKyBpbnRlcmZhY2VDb25maWcuQ0FOVkFTX0VYVFJBLzIgKyBcInB4XCI7XG4gICAgICAgICAgICBhdWRpb0xldmVsQ2FudmFzLnN0eWxlLmxlZnQgPSBcIi1cIiArIGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkEvMiArIFwicHhcIjtcbiAgICAgICAgICAgIHJlc2l6ZUF1ZGlvTGV2ZWxDYW52YXMoIGF1ZGlvTGV2ZWxDYW52YXMsXG4gICAgICAgICAgICAgICAgICAgIHRodW1ibmFpbFdpZHRoLFxuICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxIZWlnaHQpO1xuXG4gICAgICAgICAgICB2aWRlb1NwYW4uYXBwZW5kQ2hpbGQoYXVkaW9MZXZlbENhbnZhcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhdWRpb0xldmVsQ2FudmFzID0gYXVkaW9MZXZlbENhbnZhcy5nZXQoMCk7XG5cbiAgICAgICAgICAgIHJlc2l6ZUF1ZGlvTGV2ZWxDYW52YXMoIGF1ZGlvTGV2ZWxDYW52YXMsXG4gICAgICAgICAgICAgICAgICAgIHRodW1ibmFpbFdpZHRoLFxuICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxIZWlnaHQpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIGF1ZGlvIGxldmVsIFVJIGZvciB0aGUgZ2l2ZW4gcmVzb3VyY2VKaWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVzb3VyY2VKaWQgdGhlIHJlc291cmNlIGppZCBpbmRpY2F0aW5nIHRoZSB2aWRlbyBlbGVtZW50IGZvclxuICAgICAqIHdoaWNoIHdlIGRyYXcgdGhlIGF1ZGlvIGxldmVsXG4gICAgICogQHBhcmFtIGF1ZGlvTGV2ZWwgdGhlIG5ld0F1ZGlvIGxldmVsIHRvIHJlbmRlclxuICAgICAqL1xuICAgIG15LnVwZGF0ZUF1ZGlvTGV2ZWwgPSBmdW5jdGlvbiAocmVzb3VyY2VKaWQsIGF1ZGlvTGV2ZWwpIHtcbiAgICAgICAgZHJhd0F1ZGlvTGV2ZWxDYW52YXMocmVzb3VyY2VKaWQsIGF1ZGlvTGV2ZWwpO1xuXG4gICAgICAgIHZhciB2aWRlb1NwYW5JZCA9IGdldFZpZGVvU3BhbklkKHJlc291cmNlSmlkKTtcblxuICAgICAgICB2YXIgYXVkaW9MZXZlbENhbnZhcyA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPmNhbnZhcycpLmdldCgwKTtcblxuICAgICAgICBpZiAoIWF1ZGlvTGV2ZWxDYW52YXMpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgdmFyIGRyYXdDb250ZXh0ID0gYXVkaW9MZXZlbENhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgICAgIHZhciBjYW52YXNDYWNoZSA9IGF1ZGlvTGV2ZWxDYW52YXNDYWNoZVtyZXNvdXJjZUppZF07XG5cbiAgICAgICAgZHJhd0NvbnRleHQuY2xlYXJSZWN0ICgwLCAwLFxuICAgICAgICAgICAgICAgIGF1ZGlvTGV2ZWxDYW52YXMud2lkdGgsIGF1ZGlvTGV2ZWxDYW52YXMuaGVpZ2h0KTtcbiAgICAgICAgZHJhd0NvbnRleHQuZHJhd0ltYWdlKGNhbnZhc0NhY2hlLCAwLCAwKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVzaXplcyB0aGUgZ2l2ZW4gYXVkaW8gbGV2ZWwgY2FudmFzIHRvIG1hdGNoIHRoZSBnaXZlbiB0aHVtYm5haWwgc2l6ZS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiByZXNpemVBdWRpb0xldmVsQ2FudmFzKGF1ZGlvTGV2ZWxDYW52YXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRodW1ibmFpbEhlaWdodCkge1xuICAgICAgICBhdWRpb0xldmVsQ2FudmFzLndpZHRoID0gdGh1bWJuYWlsV2lkdGggKyBpbnRlcmZhY2VDb25maWcuQ0FOVkFTX0VYVFJBO1xuICAgICAgICBhdWRpb0xldmVsQ2FudmFzLmhlaWdodCA9IHRodW1ibmFpbEhlaWdodCArIGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkE7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIERyYXdzIHRoZSBhdWRpbyBsZXZlbCBjYW52YXMgaW50byB0aGUgY2FjaGVkIGNhbnZhcyBvYmplY3QuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVzb3VyY2VKaWQgdGhlIHJlc291cmNlIGppZCBpbmRpY2F0aW5nIHRoZSB2aWRlbyBlbGVtZW50IGZvclxuICAgICAqIHdoaWNoIHdlIGRyYXcgdGhlIGF1ZGlvIGxldmVsXG4gICAgICogQHBhcmFtIGF1ZGlvTGV2ZWwgdGhlIG5ld0F1ZGlvIGxldmVsIHRvIHJlbmRlclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGRyYXdBdWRpb0xldmVsQ2FudmFzKHJlc291cmNlSmlkLCBhdWRpb0xldmVsKSB7XG4gICAgICAgIGlmICghYXVkaW9MZXZlbENhbnZhc0NhY2hlW3Jlc291cmNlSmlkXSkge1xuXG4gICAgICAgICAgICB2YXIgdmlkZW9TcGFuSWQgPSBnZXRWaWRlb1NwYW5JZChyZXNvdXJjZUppZCk7XG5cbiAgICAgICAgICAgIHZhciBhdWRpb0xldmVsQ2FudmFzT3JpZyA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPmNhbnZhcycpLmdldCgwKTtcblxuICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAqIEZJWE1FIFRlc3RpbmcgaGFzIHNob3duIHRoYXQgYXVkaW9MZXZlbENhbnZhc09yaWcgbWF5IG5vdCBleGlzdC5cbiAgICAgICAgICAgICAqIEluIHN1Y2ggYSBjYXNlLCB0aGUgbWV0aG9kIENhbnZhc1V0aWwuY2xvbmVDYW52YXMgbWF5IHRocm93IGFuXG4gICAgICAgICAgICAgKiBlcnJvci4gU2luY2UgYXVkaW8gbGV2ZWxzIGFyZSBmcmVxdWVudGx5IHVwZGF0ZWQsIHRoZSBlcnJvcnMgaGF2ZVxuICAgICAgICAgICAgICogYmVlbiBvYnNlcnZlZCB0byBwaWxlIGludG8gdGhlIGNvbnNvbGUsIHN0cmFpbiB0aGUgQ1BVLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpZiAoYXVkaW9MZXZlbENhbnZhc09yaWcpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhc0NhY2hlW3Jlc291cmNlSmlkXVxuICAgICAgICAgICAgICAgICAgICA9IENhbnZhc1V0aWwuY2xvbmVDYW52YXMoYXVkaW9MZXZlbENhbnZhc09yaWcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNhbnZhcyA9IGF1ZGlvTGV2ZWxDYW52YXNDYWNoZVtyZXNvdXJjZUppZF07XG5cbiAgICAgICAgaWYgKCFjYW52YXMpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgdmFyIGRyYXdDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbiAgICAgICAgZHJhd0NvbnRleHQuY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XG5cbiAgICAgICAgdmFyIHNoYWRvd0xldmVsID0gZ2V0U2hhZG93TGV2ZWwoYXVkaW9MZXZlbCk7XG5cbiAgICAgICAgaWYgKHNoYWRvd0xldmVsID4gMClcbiAgICAgICAgICAgIC8vIGRyYXdDb250ZXh0LCB4LCB5LCB3LCBoLCByLCBzaGFkb3dDb2xvciwgc2hhZG93TGV2ZWxcbiAgICAgICAgICAgIENhbnZhc1V0aWwuZHJhd1JvdW5kUmVjdEdsb3coICAgZHJhd0NvbnRleHQsXG4gICAgICAgICAgICAgICAgaW50ZXJmYWNlQ29uZmlnLkNBTlZBU19FWFRSQS8yLCBpbnRlcmZhY2VDb25maWcuQ0FOVkFTX0VYVFJBLzIsXG4gICAgICAgICAgICAgICAgY2FudmFzLndpZHRoIC0gaW50ZXJmYWNlQ29uZmlnLkNBTlZBU19FWFRSQSxcbiAgICAgICAgICAgICAgICBjYW52YXMuaGVpZ2h0IC0gaW50ZXJmYWNlQ29uZmlnLkNBTlZBU19FWFRSQSxcbiAgICAgICAgICAgICAgICBpbnRlcmZhY2VDb25maWcuQ0FOVkFTX1JBRElVUyxcbiAgICAgICAgICAgICAgICBpbnRlcmZhY2VDb25maWcuU0hBRE9XX0NPTE9SLFxuICAgICAgICAgICAgICAgIHNoYWRvd0xldmVsKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgc2hhZG93L2dsb3cgbGV2ZWwgZm9yIHRoZSBnaXZlbiBhdWRpbyBsZXZlbC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdWRpb0xldmVsIHRoZSBhdWRpbyBsZXZlbCBmcm9tIHdoaWNoIHdlIGRldGVybWluZSB0aGUgc2hhZG93XG4gICAgICogbGV2ZWxcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRTaGFkb3dMZXZlbCAoYXVkaW9MZXZlbCkge1xuICAgICAgICB2YXIgc2hhZG93TGV2ZWwgPSAwO1xuXG4gICAgICAgIGlmIChhdWRpb0xldmVsIDw9IDAuMykge1xuICAgICAgICAgICAgc2hhZG93TGV2ZWwgPSBNYXRoLnJvdW5kKGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkEvMiooYXVkaW9MZXZlbC8wLjMpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChhdWRpb0xldmVsIDw9IDAuNikge1xuICAgICAgICAgICAgc2hhZG93TGV2ZWwgPSBNYXRoLnJvdW5kKGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkEvMiooKGF1ZGlvTGV2ZWwgLSAwLjMpIC8gMC4zKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzaGFkb3dMZXZlbCA9IE1hdGgucm91bmQoaW50ZXJmYWNlQ29uZmlnLkNBTlZBU19FWFRSQS8yKigoYXVkaW9MZXZlbCAtIDAuNikgLyAwLjQpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2hhZG93TGV2ZWw7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHZpZGVvIHNwYW4gaWQgY29ycmVzcG9uZGluZyB0byB0aGUgZ2l2ZW4gcmVzb3VyY2VKaWQgb3IgbG9jYWxcbiAgICAgKiB1c2VyLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFZpZGVvU3BhbklkKHJlc291cmNlSmlkKSB7XG4gICAgICAgIHZhciB2aWRlb1NwYW5JZCA9IG51bGw7XG4gICAgICAgIGlmIChyZXNvdXJjZUppZCA9PT0gU3RhdGlzdGljc0FjdGl2YXRvci5MT0NBTF9KSUQpXG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdsb2NhbFZpZGVvQ29udGFpbmVyJztcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAncGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkO1xuXG4gICAgICAgIHJldHVybiB2aWRlb1NwYW5JZDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSW5kaWNhdGVzIHRoYXQgdGhlIHJlbW90ZSB2aWRlbyBoYXMgYmVlbiByZXNpemVkLlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ3JlbW90ZXZpZGVvLnJlc2l6ZWQnLCBmdW5jdGlvbiAoZXZlbnQsIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgdmFyIHJlc2l6ZWQgPSBmYWxzZTtcbiAgICAgICAgJCgnI3JlbW90ZVZpZGVvcz5zcGFuPmNhbnZhcycpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgY2FudmFzID0gJCh0aGlzKS5nZXQoMCk7XG4gICAgICAgICAgICBpZiAoY2FudmFzLndpZHRoICE9PSB3aWR0aCArIGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkEpIHtcbiAgICAgICAgICAgICAgICBjYW52YXMud2lkdGggPSB3aWR0aCArIGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkE7XG4gICAgICAgICAgICAgICAgcmVzaXplZCA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjYW52YXMuaGVpZ2ggIT09IGhlaWdodCArIGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkEpIHtcbiAgICAgICAgICAgICAgICBjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0ICsgaW50ZXJmYWNlQ29uZmlnLkNBTlZBU19FWFRSQTtcbiAgICAgICAgICAgICAgICByZXNpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHJlc2l6ZWQpXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhhdWRpb0xldmVsQ2FudmFzQ2FjaGUpLmZvckVhY2goZnVuY3Rpb24gKHJlc291cmNlSmlkKSB7XG4gICAgICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhc0NhY2hlW3Jlc291cmNlSmlkXS53aWR0aFxuICAgICAgICAgICAgICAgICAgICA9IHdpZHRoICsgaW50ZXJmYWNlQ29uZmlnLkNBTlZBU19FWFRSQTtcbiAgICAgICAgICAgICAgICBhdWRpb0xldmVsQ2FudmFzQ2FjaGVbcmVzb3VyY2VKaWRdLmhlaWdodFxuICAgICAgICAgICAgICAgICAgICA9IGhlaWdodCArIGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkE7XG4gICAgICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBteTtcblxufSkoQXVkaW9MZXZlbHMgfHwge30pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEF1ZGlvTGV2ZWxzO1xuIiwiLyoqXG4gKiBVdGlsaXR5IGNsYXNzIGZvciBkcmF3aW5nIGNhbnZhcyBzaGFwZXMuXG4gKi9cbnZhciBDYW52YXNVdGlsID0gKGZ1bmN0aW9uKG15KSB7XG5cbiAgICAvKipcbiAgICAgKiBEcmF3cyBhIHJvdW5kIHJlY3RhbmdsZSB3aXRoIGEgZ2xvdy4gVGhlIGdsb3dXaWR0aCBpbmRpY2F0ZXMgdGhlIGRlcHRoXG4gICAgICogb2YgdGhlIGdsb3cuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZHJhd0NvbnRleHQgdGhlIGNvbnRleHQgb2YgdGhlIGNhbnZhcyB0byBkcmF3IHRvXG4gICAgICogQHBhcmFtIHggdGhlIHggY29vcmRpbmF0ZSBvZiB0aGUgcm91bmQgcmVjdGFuZ2xlXG4gICAgICogQHBhcmFtIHkgdGhlIHkgY29vcmRpbmF0ZSBvZiB0aGUgcm91bmQgcmVjdGFuZ2xlXG4gICAgICogQHBhcmFtIHcgdGhlIHdpZHRoIG9mIHRoZSByb3VuZCByZWN0YW5nbGVcbiAgICAgKiBAcGFyYW0gaCB0aGUgaGVpZ2h0IG9mIHRoZSByb3VuZCByZWN0YW5nbGVcbiAgICAgKiBAcGFyYW0gZ2xvd0NvbG9yIHRoZSBjb2xvciBvZiB0aGUgZ2xvd1xuICAgICAqIEBwYXJhbSBnbG93V2lkdGggdGhlIHdpZHRoIG9mIHRoZSBnbG93XG4gICAgICovXG4gICAgbXkuZHJhd1JvdW5kUmVjdEdsb3dcbiAgICAgICAgPSBmdW5jdGlvbihkcmF3Q29udGV4dCwgeCwgeSwgdywgaCwgciwgZ2xvd0NvbG9yLCBnbG93V2lkdGgpIHtcblxuICAgICAgICAvLyBTYXZlIHRoZSBwcmV2aW91cyBzdGF0ZSBvZiB0aGUgY29udGV4dC5cbiAgICAgICAgZHJhd0NvbnRleHQuc2F2ZSgpO1xuXG4gICAgICAgIGlmICh3IDwgMiAqIHIpIHIgPSB3IC8gMjtcbiAgICAgICAgaWYgKGggPCAyICogcikgciA9IGggLyAyO1xuXG4gICAgICAgIC8vIERyYXcgYSByb3VuZCByZWN0YW5nbGUuXG4gICAgICAgIGRyYXdDb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICBkcmF3Q29udGV4dC5tb3ZlVG8oeCtyLCB5KTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCt3LCB5LCAgIHgrdywgeStoLCByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCt3LCB5K2gsIHgsICAgeStoLCByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCwgICB5K2gsIHgsICAgeSwgICByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCwgICB5LCAgIHgrdywgeSwgICByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuY2xvc2VQYXRoKCk7XG5cbiAgICAgICAgLy8gQWRkIGEgc2hhZG93IGFyb3VuZCB0aGUgcmVjdGFuZ2xlXG4gICAgICAgIGRyYXdDb250ZXh0LnNoYWRvd0NvbG9yID0gZ2xvd0NvbG9yO1xuICAgICAgICBkcmF3Q29udGV4dC5zaGFkb3dCbHVyID0gZ2xvd1dpZHRoO1xuICAgICAgICBkcmF3Q29udGV4dC5zaGFkb3dPZmZzZXRYID0gMDtcbiAgICAgICAgZHJhd0NvbnRleHQuc2hhZG93T2Zmc2V0WSA9IDA7XG5cbiAgICAgICAgLy8gRmlsbCB0aGUgc2hhcGUuXG4gICAgICAgIGRyYXdDb250ZXh0LmZpbGwoKTtcblxuICAgICAgICBkcmF3Q29udGV4dC5zYXZlKCk7XG5cbiAgICAgICAgZHJhd0NvbnRleHQucmVzdG9yZSgpO1xuXG4vLyAgICAgIDEpIFVuY29tbWVudCB0aGlzIGxpbmUgdG8gdXNlIENvbXBvc2l0ZSBPcGVyYXRpb24sIHdoaWNoIGlzIGRvaW5nIHRoZVxuLy8gICAgICBzYW1lIGFzIHRoZSBjbGlwIGZ1bmN0aW9uIGJlbG93IGFuZCBpcyBhbHNvIGFudGlhbGlhc2luZyB0aGUgcm91bmRcbi8vICAgICAgYm9yZGVyLCBidXQgaXMgc2FpZCB0byBiZSBsZXNzIGZhc3QgcGVyZm9ybWFuY2Ugd2lzZS5cblxuLy8gICAgICBkcmF3Q29udGV4dC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249J2Rlc3RpbmF0aW9uLW91dCc7XG5cbiAgICAgICAgZHJhd0NvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgIGRyYXdDb250ZXh0Lm1vdmVUbyh4K3IsIHkpO1xuICAgICAgICBkcmF3Q29udGV4dC5hcmNUbyh4K3csIHksICAgeCt3LCB5K2gsIHIpO1xuICAgICAgICBkcmF3Q29udGV4dC5hcmNUbyh4K3csIHkraCwgeCwgICB5K2gsIHIpO1xuICAgICAgICBkcmF3Q29udGV4dC5hcmNUbyh4LCAgIHkraCwgeCwgICB5LCAgIHIpO1xuICAgICAgICBkcmF3Q29udGV4dC5hcmNUbyh4LCAgIHksICAgeCt3LCB5LCAgIHIpO1xuICAgICAgICBkcmF3Q29udGV4dC5jbG9zZVBhdGgoKTtcblxuLy8gICAgICAyKSBVbmNvbW1lbnQgdGhpcyBsaW5lIHRvIHVzZSBDb21wb3NpdGUgT3BlcmF0aW9uLCB3aGljaCBpcyBkb2luZyB0aGVcbi8vICAgICAgc2FtZSBhcyB0aGUgY2xpcCBmdW5jdGlvbiBiZWxvdyBhbmQgaXMgYWxzbyBhbnRpYWxpYXNpbmcgdGhlIHJvdW5kXG4vLyAgICAgIGJvcmRlciwgYnV0IGlzIHNhaWQgdG8gYmUgbGVzcyBmYXN0IHBlcmZvcm1hbmNlIHdpc2UuXG5cbi8vICAgICAgZHJhd0NvbnRleHQuZmlsbCgpO1xuXG4gICAgICAgIC8vIENvbW1lbnQgdGhlc2UgdHdvIGxpbmVzIGlmIGNob29zaW5nIHRvIGRvIHRoZSBzYW1lIHdpdGggY29tcG9zaXRlXG4gICAgICAgIC8vIG9wZXJhdGlvbiBhYm92ZSAxIGFuZCAyLlxuICAgICAgICBkcmF3Q29udGV4dC5jbGlwKCk7XG4gICAgICAgIGRyYXdDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCAyNzcsIDIwMCk7XG5cbiAgICAgICAgLy8gUmVzdG9yZSB0aGUgcHJldmlvdXMgY29udGV4dCBzdGF0ZS5cbiAgICAgICAgZHJhd0NvbnRleHQucmVzdG9yZSgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDbG9uZXMgdGhlIGdpdmVuIGNhbnZhcy5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gdGhlIG5ldyBjbG9uZWQgY2FudmFzLlxuICAgICAqL1xuICAgIG15LmNsb25lQ2FudmFzID0gZnVuY3Rpb24gKG9sZENhbnZhcykge1xuICAgICAgICAvKlxuICAgICAgICAgKiBGSVhNRSBUZXN0aW5nIGhhcyBzaG93biB0aGF0IG9sZENhbnZhcyBtYXkgbm90IGV4aXN0LiBJbiBzdWNoIGEgY2FzZSxcbiAgICAgICAgICogdGhlIG1ldGhvZCBDYW52YXNVdGlsLmNsb25lQ2FudmFzIG1heSB0aHJvdyBhbiBlcnJvci4gU2luY2UgYXVkaW9cbiAgICAgICAgICogbGV2ZWxzIGFyZSBmcmVxdWVudGx5IHVwZGF0ZWQsIHRoZSBlcnJvcnMgaGF2ZSBiZWVuIG9ic2VydmVkIHRvIHBpbGVcbiAgICAgICAgICogaW50byB0aGUgY29uc29sZSwgc3RyYWluIHRoZSBDUFUuXG4gICAgICAgICAqL1xuICAgICAgICBpZiAoIW9sZENhbnZhcylcbiAgICAgICAgICAgIHJldHVybiBvbGRDYW52YXM7XG5cbiAgICAgICAgLy9jcmVhdGUgYSBuZXcgY2FudmFzXG4gICAgICAgIHZhciBuZXdDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgdmFyIGNvbnRleHQgPSBuZXdDYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgICAgICAvL3NldCBkaW1lbnNpb25zXG4gICAgICAgIG5ld0NhbnZhcy53aWR0aCA9IG9sZENhbnZhcy53aWR0aDtcbiAgICAgICAgbmV3Q2FudmFzLmhlaWdodCA9IG9sZENhbnZhcy5oZWlnaHQ7XG5cbiAgICAgICAgLy9hcHBseSB0aGUgb2xkIGNhbnZhcyB0byB0aGUgbmV3IG9uZVxuICAgICAgICBjb250ZXh0LmRyYXdJbWFnZShvbGRDYW52YXMsIDAsIDApO1xuXG4gICAgICAgIC8vcmV0dXJuIHRoZSBuZXcgY2FudmFzXG4gICAgICAgIHJldHVybiBuZXdDYW52YXM7XG4gICAgfTtcblxuICAgIHJldHVybiBteTtcbn0pKENhbnZhc1V0aWwgfHwge30pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbnZhc1V0aWw7XG4iLCIvKiBnbG9iYWwgJCwgVXRpbCwgY29ubmVjdGlvbiwgbmlja25hbWU6dHJ1ZSwgZ2V0VmlkZW9TaXplLCBnZXRWaWRlb1Bvc2l0aW9uLCBzaG93VG9vbGJhciwgcHJvY2Vzc1JlcGxhY2VtZW50cyAqL1xudmFyIFJlcGxhY2VtZW50ID0gcmVxdWlyZShcIi4vUmVwbGFjZW1lbnQuanNcIik7XG52YXIgZGVwID0ge1xuICAgIFwiVmlkZW9MYXlvdXRcIjogZnVuY3Rpb24oKXsgcmV0dXJuIHJlcXVpcmUoXCIuLi9WaWRlb0xheW91dFwiKX0sXG4gICAgXCJUb29sYmFyXCI6IGZ1bmN0aW9uKCl7cmV0dXJuIHJlcXVpcmUoXCIuLi90b29sYmFycy9Ub29sYmFyXCIpfSxcbiAgICBcIlVJQWN0aXZhdG9yXCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHJlcXVpcmUoXCIuLi9VSUFjdGl2YXRvclwiKTtcbiAgICB9XG59O1xuLyoqXG4gKiBDaGF0IHJlbGF0ZWQgdXNlciBpbnRlcmZhY2UuXG4gKi9cbnZhciBDaGF0ID0gKGZ1bmN0aW9uIChteSkge1xuICAgIHZhciBub3RpZmljYXRpb25JbnRlcnZhbCA9IGZhbHNlO1xuICAgIHZhciB1bnJlYWRNZXNzYWdlcyA9IDA7XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyBjaGF0IHJlbGF0ZWQgaW50ZXJmYWNlLlxuICAgICAqL1xuICAgIG15LmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzdG9yZWREaXNwbGF5TmFtZSA9IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZGlzcGxheW5hbWU7XG4gICAgICAgIHZhciBuaWNrbmFtZSA9IG51bGw7XG4gICAgICAgIGlmIChzdG9yZWREaXNwbGF5TmFtZSkge1xuICAgICAgICAgICAgZGVwLlVJQWN0aXZhdG9yKCkuZ2V0VUlTZXJ2aWNlKCkuc2V0Tmlja25hbWUoc3RvcmVkRGlzcGxheU5hbWUpO1xuICAgICAgICAgICAgbmlja25hbWUgPSBzdG9yZWREaXNwbGF5TmFtZTtcbiAgICAgICAgICAgIENoYXQuc2V0Q2hhdENvbnZlcnNhdGlvbk1vZGUodHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAkKCcjbmlja2lucHV0Jykua2V5ZG93bihmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgdmFyIHZhbCA9IFV0aWwuZXNjYXBlSHRtbCh0aGlzLnZhbHVlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnZhbHVlID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKCFkZXAuVUlBY3RpdmF0b3IoKS5nZXRVSVNlcnZpY2UoKS5nZXROaWNrbmFtZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlcC5VSUFjdGl2YXRvcigpLmdldFVJU2VydmljZSgpLnNldE5pY2tuYW1lKHZhbCk7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UuZGlzcGxheW5hbWUgPSB2YWw7XG4gICAgICAgICAgICAgICAgICAgIC8vdGhpcyBzaG91bGQgYmUgY2hhbmdlZFxuICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuYWRkRGlzcGxheU5hbWVUb1ByZXNlbmNlKHZhbCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Yy5zZW5kUHJlc2VuY2UoKTtcblxuICAgICAgICAgICAgICAgICAgICBDaGF0LnNldENoYXRDb252ZXJzYXRpb25Nb2RlKHRydWUpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJyN1c2VybXNnJykua2V5ZG93bihmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gdGhpcy52YWx1ZTtcbiAgICAgICAgICAgICAgICAkKCcjdXNlcm1zZycpLnZhbCgnJykudHJpZ2dlcignYXV0b3NpemUucmVzaXplJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5mb2N1cygpO1xuICAgICAgICAgICAgICAgIHZhciBjb21tYW5kID0gbmV3IENvbW1hbmRzUHJvY2Vzc29yKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZihjb21tYW5kLmlzQ29tbWFuZCgpKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZC5wcm9jZXNzQ29tbWFuZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAvL3RoaXMgc2hvdWxkIGJlIGNoYW5nZWRcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBVdGlsLmVzY2FwZUh0bWwodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuc2VuZE1lc3NhZ2UobWVzc2FnZSwgZGVwLlVJQWN0aXZhdG9yKCkuZ2V0VUlTZXJ2aWNlKCkuZ2V0Tmlja25hbWUoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgb25UZXh0QXJlYVJlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJlc2l6ZUNoYXRDb252ZXJzYXRpb24oKTtcbiAgICAgICAgICAgIHNjcm9sbENoYXRUb0JvdHRvbSgpO1xuICAgICAgICB9O1xuICAgICAgICAkKCcjdXNlcm1zZycpLmF1dG9zaXplKHtjYWxsYmFjazogb25UZXh0QXJlYVJlc2l6ZX0pO1xuXG4gICAgICAgICQoXCIjY2hhdHNwYWNlXCIpLmJpbmQoXCJzaG93blwiLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjcm9sbENoYXRUb0JvdHRvbSgpO1xuICAgICAgICAgICAgICAgIHVucmVhZE1lc3NhZ2VzID0gMDtcbiAgICAgICAgICAgICAgICBzZXRWaXN1YWxOb3RpZmljYXRpb24oZmFsc2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFwcGVuZHMgdGhlIGdpdmVuIG1lc3NhZ2UgdG8gdGhlIGNoYXQgY29udmVyc2F0aW9uLlxuICAgICAqL1xuICAgIG15LnVwZGF0ZUNoYXRDb252ZXJzYXRpb24gPSBmdW5jdGlvbiAoZnJvbSwgZGlzcGxheU5hbWUsIG1lc3NhZ2UpIHtcbiAgICAgICAgdmFyIGRpdkNsYXNzTmFtZSA9ICcnO1xuXG4gICAgICAgIGlmIChjb25uZWN0aW9uLmVtdWMubXlyb29tamlkID09PSBmcm9tKSB7XG4gICAgICAgICAgICBkaXZDbGFzc05hbWUgPSBcImxvY2FsdXNlclwiO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZGl2Q2xhc3NOYW1lID0gXCJyZW1vdGV1c2VyXCI7XG5cbiAgICAgICAgICAgIGlmICghQ2hhdC5pc1Zpc2libGUoKSkge1xuICAgICAgICAgICAgICAgIHVucmVhZE1lc3NhZ2VzKys7XG4gICAgICAgICAgICAgICAgVXRpbC5wbGF5U291bmROb3RpZmljYXRpb24oJ2NoYXROb3RpZmljYXRpb24nKTtcbiAgICAgICAgICAgICAgICBzZXRWaXN1YWxOb3RpZmljYXRpb24odHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvL3JlcGxhY2UgbGlua3MgYW5kIHNtaWxleXNcbiAgICAgICAgdmFyIGVzY01lc3NhZ2UgPSBVdGlsLmVzY2FwZUh0bWwobWVzc2FnZSk7XG4gICAgICAgIHZhciBlc2NEaXNwbGF5TmFtZSA9IFV0aWwuZXNjYXBlSHRtbChkaXNwbGF5TmFtZSk7XG4gICAgICAgIG1lc3NhZ2UgPSBSZXBsYWNlbWVudC5wcm9jZXNzUmVwbGFjZW1lbnRzKGVzY01lc3NhZ2UpO1xuXG4gICAgICAgICQoJyNjaGF0Y29udmVyc2F0aW9uJykuYXBwZW5kKCc8ZGl2IGNsYXNzPVwiJyArIGRpdkNsYXNzTmFtZSArICdcIj48Yj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXNjRGlzcGxheU5hbWUgKyAnOiA8L2I+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgKyAnPC9kaXY+Jyk7XG4gICAgICAgICQoJyNjaGF0Y29udmVyc2F0aW9uJykuYW5pbWF0ZShcbiAgICAgICAgICAgICAgICB7IHNjcm9sbFRvcDogJCgnI2NoYXRjb252ZXJzYXRpb24nKVswXS5zY3JvbGxIZWlnaHR9LCAxMDAwKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQXBwZW5kcyBlcnJvciBtZXNzYWdlIHRvIHRoZSBjb252ZXJzYXRpb25cbiAgICAgKiBAcGFyYW0gZXJyb3JNZXNzYWdlIHRoZSByZWNlaXZlZCBlcnJvciBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSBvcmlnaW5hbFRleHQgdGhlIG9yaWdpbmFsIG1lc3NhZ2UuXG4gICAgICovXG4gICAgbXkuY2hhdEFkZEVycm9yID0gZnVuY3Rpb24oZXJyb3JNZXNzYWdlLCBvcmlnaW5hbFRleHQpXG4gICAge1xuICAgICAgICBlcnJvck1lc3NhZ2UgPSBVdGlsLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgb3JpZ2luYWxUZXh0ID0gVXRpbC5lc2NhcGVIdG1sKG9yaWdpbmFsVGV4dCk7XG5cbiAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKS5hcHBlbmQoJzxkaXYgY2xhc3M9XCJlcnJvck1lc3NhZ2VcIj48Yj5FcnJvcjogPC9iPidcbiAgICAgICAgICAgICsgJ1lvdXIgbWVzc2FnZScgKyAob3JpZ2luYWxUZXh0PyAoJyBcXFwiJysgb3JpZ2luYWxUZXh0ICsgJ1xcXCInKSA6IFwiXCIpXG4gICAgICAgICAgICArICcgd2FzIG5vdCBzZW50LicgKyAoZXJyb3JNZXNzYWdlPyAoJyBSZWFzb246ICcgKyBlcnJvck1lc3NhZ2UpIDogJycpXG4gICAgICAgICAgICArICAnPC9kaXY+Jyk7XG4gICAgICAgICQoJyNjaGF0Y29udmVyc2F0aW9uJykuYW5pbWF0ZShcbiAgICAgICAgICAgIHsgc2Nyb2xsVG9wOiAkKCcjY2hhdGNvbnZlcnNhdGlvbicpWzBdLnNjcm9sbEhlaWdodH0sIDEwMDApO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBzdWJqZWN0IHRvIHRoZSBVSVxuICAgICAqIEBwYXJhbSBzdWJqZWN0IHRoZSBzdWJqZWN0XG4gICAgICovXG4gICAgbXkuY2hhdFNldFN1YmplY3QgPSBmdW5jdGlvbihzdWJqZWN0KVxuICAgIHtcbiAgICAgICAgaWYoc3ViamVjdClcbiAgICAgICAgICAgIHN1YmplY3QgPSBzdWJqZWN0LnRyaW0oKTtcbiAgICAgICAgJCgnI3N1YmplY3QnKS5odG1sKFJlcGxhY2VtZW50LmxpbmtpZnkoVXRpbC5lc2NhcGVIdG1sKHN1YmplY3QpKSk7XG4gICAgICAgIGlmKHN1YmplY3QgPT0gXCJcIilcbiAgICAgICAge1xuICAgICAgICAgICAgJChcIiNzdWJqZWN0XCIpLmNzcyh7ZGlzcGxheTogXCJub25lXCJ9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgIHtcbiAgICAgICAgICAgICQoXCIjc3ViamVjdFwiKS5jc3Moe2Rpc3BsYXk6IFwiYmxvY2tcIn0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIE9wZW5zIC8gY2xvc2VzIHRoZSBjaGF0IGFyZWEuXG4gICAgICovXG4gICAgbXkudG9nZ2xlQ2hhdCA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICB2YXIgY2hhdHNwYWNlID0gJCgnI2NoYXRzcGFjZScpO1xuXG4gICAgICAgIHZhciBjaGF0U2l6ZSA9IChjaGF0c3BhY2UuaXMoXCI6dmlzaWJsZVwiKSkgPyBbMCwgMF0gOiBDaGF0LmdldENoYXRTaXplKCk7XG4gICAgICAgIGRlcC5WaWRlb0xheW91dCgpLnJlc2l6ZVZpZGVvU3BhY2UoY2hhdHNwYWNlLCBjaGF0U2l6ZSwgY2hhdHNwYWNlLmlzKFwiOnZpc2libGVcIikpO1xuXG4gICAgICAgIC8vIEZpeCBtZTogU2hvdWxkIGJlIGNhbGxlZCBhcyBjYWxsYmFjayBvZiBzaG93IGFuaW1hdGlvblxuXG4gICAgICAgIC8vIFJlcXVlc3QgdGhlIGZvY3VzIGluIHRoZSBuaWNrbmFtZSBmaWVsZCBvciB0aGUgY2hhdCBpbnB1dCBmaWVsZC5cbiAgICAgICAgaWYgKCQoJyNuaWNrbmFtZScpLmNzcygndmlzaWJpbGl0eScpID09PSAndmlzaWJsZScpIHtcbiAgICAgICAgICAgICQoJyNuaWNraW5wdXQnKS5mb2N1cygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnI3VzZXJtc2cnKS5mb2N1cygpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGNoYXQgY29udmVyc2F0aW9uIG1vZGUuXG4gICAgICovXG4gICAgbXkuc2V0Q2hhdENvbnZlcnNhdGlvbk1vZGUgPSBmdW5jdGlvbiAoaXNDb252ZXJzYXRpb25Nb2RlKSB7XG4gICAgICAgIGlmIChpc0NvbnZlcnNhdGlvbk1vZGUpIHtcbiAgICAgICAgICAgICQoJyNuaWNrbmFtZScpLmNzcyh7dmlzaWJpbGl0eTogJ2hpZGRlbid9KTtcbiAgICAgICAgICAgICQoJyNjaGF0Y29udmVyc2F0aW9uJykuY3NzKHt2aXNpYmlsaXR5OiAndmlzaWJsZSd9KTtcbiAgICAgICAgICAgICQoJyN1c2VybXNnJykuY3NzKHt2aXNpYmlsaXR5OiAndmlzaWJsZSd9KTtcbiAgICAgICAgICAgICQoJyN1c2VybXNnJykuZm9jdXMoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXNpemVzIHRoZSBjaGF0IGFyZWEuXG4gICAgICovXG4gICAgbXkucmVzaXplQ2hhdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNoYXRTaXplID0gQ2hhdC5nZXRDaGF0U2l6ZSgpO1xuXG4gICAgICAgICQoJyNjaGF0c3BhY2UnKS53aWR0aChjaGF0U2l6ZVswXSk7XG4gICAgICAgICQoJyNjaGF0c3BhY2UnKS5oZWlnaHQoY2hhdFNpemVbMV0pO1xuXG4gICAgICAgIHJlc2l6ZUNoYXRDb252ZXJzYXRpb24oKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgc2l6ZSBvZiB0aGUgY2hhdC5cbiAgICAgKi9cbiAgICBteS5nZXRDaGF0U2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGF2YWlsYWJsZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgdmFyIGF2YWlsYWJsZVdpZHRoID0gd2luZG93LmlubmVyV2lkdGg7XG5cbiAgICAgICAgdmFyIGNoYXRXaWR0aCA9IDIwMDtcbiAgICAgICAgaWYgKGF2YWlsYWJsZVdpZHRoICogMC4yIDwgMjAwKVxuICAgICAgICAgICAgY2hhdFdpZHRoID0gYXZhaWxhYmxlV2lkdGggKiAwLjI7XG5cbiAgICAgICAgcmV0dXJuIFtjaGF0V2lkdGgsIGF2YWlsYWJsZUhlaWdodF07XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEluZGljYXRlcyBpZiB0aGUgY2hhdCBpcyBjdXJyZW50bHkgdmlzaWJsZS5cbiAgICAgKi9cbiAgICBteS5pc1Zpc2libGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkKCcjY2hhdHNwYWNlJykuaXMoXCI6dmlzaWJsZVwiKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVzaXplcyB0aGUgY2hhdCBjb252ZXJzYXRpb24uXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVzaXplQ2hhdENvbnZlcnNhdGlvbigpIHtcbiAgICAgICAgdmFyIHVzZXJtc2dTdHlsZUhlaWdodCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidXNlcm1zZ1wiKS5zdHlsZS5oZWlnaHQ7XG4gICAgICAgIHZhciB1c2VybXNnSGVpZ2h0ID0gdXNlcm1zZ1N0eWxlSGVpZ2h0XG4gICAgICAgICAgICAuc3Vic3RyaW5nKDAsIHVzZXJtc2dTdHlsZUhlaWdodC5pbmRleE9mKCdweCcpKTtcblxuICAgICAgICAkKCcjdXNlcm1zZycpLndpZHRoKCQoJyNjaGF0c3BhY2UnKS53aWR0aCgpIC0gMTApO1xuICAgICAgICAkKCcjY2hhdGNvbnZlcnNhdGlvbicpLndpZHRoKCQoJyNjaGF0c3BhY2UnKS53aWR0aCgpIC0gMTApO1xuICAgICAgICAkKCcjY2hhdGNvbnZlcnNhdGlvbicpXG4gICAgICAgICAgICAuaGVpZ2h0KHdpbmRvdy5pbm5lckhlaWdodCAtIDEwIC0gcGFyc2VJbnQodXNlcm1zZ0hlaWdodCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNob3dzL2hpZGVzIGEgdmlzdWFsIG5vdGlmaWNhdGlvbiwgaW5kaWNhdGluZyB0aGF0IGEgbWVzc2FnZSBoYXMgYXJyaXZlZC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzZXRWaXN1YWxOb3RpZmljYXRpb24oc2hvdykge1xuICAgICAgICB2YXIgdW5yZWFkTXNnRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd1bnJlYWRNZXNzYWdlcycpO1xuXG4gICAgICAgIHZhciBnbG93ZXIgPSAkKCcjY2hhdEJ1dHRvbicpO1xuXG4gICAgICAgIGlmICh1bnJlYWRNZXNzYWdlcykge1xuICAgICAgICAgICAgdW5yZWFkTXNnRWxlbWVudC5pbm5lckhUTUwgPSB1bnJlYWRNZXNzYWdlcy50b1N0cmluZygpO1xuXG4gICAgICAgICAgICBkZXAuVG9vbGJhcigpLmRvY2tUb29sYmFyKHRydWUpO1xuXG4gICAgICAgICAgICB2YXIgY2hhdEJ1dHRvbkVsZW1lbnRcbiAgICAgICAgICAgICAgICA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGF0QnV0dG9uJykucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIHZhciBsZWZ0SW5kZW50ID0gKFV0aWwuZ2V0VGV4dFdpZHRoKGNoYXRCdXR0b25FbGVtZW50KSAtXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBVdGlsLmdldFRleHRXaWR0aCh1bnJlYWRNc2dFbGVtZW50KSkgLyAyO1xuICAgICAgICAgICAgdmFyIHRvcEluZGVudCA9IChVdGlsLmdldFRleHRIZWlnaHQoY2hhdEJ1dHRvbkVsZW1lbnQpIC1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVXRpbC5nZXRUZXh0SGVpZ2h0KHVucmVhZE1zZ0VsZW1lbnQpKSAvIDIgLSAzO1xuXG4gICAgICAgICAgICB1bnJlYWRNc2dFbGVtZW50LnNldEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgICAgICAgJ3N0eWxlJyxcbiAgICAgICAgICAgICAgICAgICAgJ3RvcDonICsgdG9wSW5kZW50ICtcbiAgICAgICAgICAgICAgICAgICAgJzsgbGVmdDonICsgbGVmdEluZGVudCArICc7Jyk7XG5cbiAgICAgICAgICAgIGlmICghZ2xvd2VyLmhhc0NsYXNzKCdpY29uLWNoYXQtc2ltcGxlJykpIHtcbiAgICAgICAgICAgICAgICBnbG93ZXIucmVtb3ZlQ2xhc3MoJ2ljb24tY2hhdCcpO1xuICAgICAgICAgICAgICAgIGdsb3dlci5hZGRDbGFzcygnaWNvbi1jaGF0LXNpbXBsZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdW5yZWFkTXNnRWxlbWVudC5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgICAgIGdsb3dlci5yZW1vdmVDbGFzcygnaWNvbi1jaGF0LXNpbXBsZScpO1xuICAgICAgICAgICAgZ2xvd2VyLmFkZENsYXNzKCdpY29uLWNoYXQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzaG93ICYmICFub3RpZmljYXRpb25JbnRlcnZhbCkge1xuICAgICAgICAgICAgbm90aWZpY2F0aW9uSW50ZXJ2YWwgPSB3aW5kb3cuc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGdsb3dlci50b2dnbGVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9LCA4MDApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCFzaG93ICYmIG5vdGlmaWNhdGlvbkludGVydmFsKSB7XG4gICAgICAgICAgICB3aW5kb3cuY2xlYXJJbnRlcnZhbChub3RpZmljYXRpb25JbnRlcnZhbCk7XG4gICAgICAgICAgICBub3RpZmljYXRpb25JbnRlcnZhbCA9IGZhbHNlO1xuICAgICAgICAgICAgZ2xvd2VyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNjcm9sbHMgY2hhdCB0byB0aGUgYm90dG9tLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNjcm9sbENoYXRUb0JvdHRvbSgpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkKCcjY2hhdGNvbnZlcnNhdGlvbicpLnNjcm9sbFRvcChcbiAgICAgICAgICAgICAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKVswXS5zY3JvbGxIZWlnaHQpO1xuICAgICAgICB9LCA1KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbXk7XG59KENoYXQgfHwge30pKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDaGF0O1xuIiwiXG52YXIgUmVwbGFjZW1lbnQgPSBmdW5jdGlvbigpXG57XG4gICAgLyoqXG4gICAgICogUmVwbGFjZXMgY29tbW9uIHNtaWxleSBzdHJpbmdzIHdpdGggaW1hZ2VzXG4gICAgICovXG4gICAgZnVuY3Rpb24gc21pbGlmeShib2R5KVxuICAgIHtcbiAgICAgICAgaWYoIWJvZHkpXG4gICAgICAgICAgICByZXR1cm4gYm9keTtcblxuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oOlxcKHw6XFwoXFwofDotXFwoXFwofDotXFwofFxcKHNhZFxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MSsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoYW5ncnlcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTIrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKG5cXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTMrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKDotXFwpXFwpfDpcXClcXCl8Oy1cXClcXCl8O1xcKVxcKXxcXChsb2xcXCl8Oi1EfDpEfDstRHw7RCkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5NCsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oOy1cXChcXCh8O1xcKFxcKHw7LVxcKHw7XFwofDonXFwofDonLVxcKHw6fi1cXCh8On5cXCh8XFwodXBzZXRcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTUrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKDwzfCZsdDszfFxcKExcXCl8XFwobFxcKXxcXChIXFwpfFxcKGhcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTYrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKGFuZ2VsXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXk3KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChib21iXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXk4KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChjaHVja2xlXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXk5KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXCh5XFwpfFxcKFlcXCl8XFwob2tcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTEwKyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyg7LVxcKXw7XFwpfDotXFwpfDpcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTExKyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChibHVzaFxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MTIrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKDotXFwqfDpcXCp8XFwoa2lzc1xcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MTMrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKHNlYXJjaFxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MTQrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKHdhdmVcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTE1KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChjbGFwXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxNisgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoc2lja1xcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MTcrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKDotUHw6UHw6LXB8OnApL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTE4KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyg6LVxcMHxcXChzaG9ja2VkXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxOSsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwob29wc1xcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MjArIFwiPlwiKTtcblxuICAgICAgICByZXR1cm4gYm9keTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBSZXBsYWNlbWVudFByb3RvKCkge1xuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUHJvY2Vzc2VzIGxpbmtzIGFuZCBzbWlsZXlzIGluIFwiYm9keVwiXG4gICAgICovXG4gICAgUmVwbGFjZW1lbnRQcm90by5wcm9jZXNzUmVwbGFjZW1lbnRzID0gZnVuY3Rpb24oYm9keSlcbiAgICB7XG4gICAgICAgIC8vbWFrZSBsaW5rcyBjbGlja2FibGVcbiAgICAgICAgYm9keSA9IFJlcGxhY2VtZW50UHJvdG8ubGlua2lmeShib2R5KTtcblxuICAgICAgICAvL2FkZCBzbWlsZXlzXG4gICAgICAgIGJvZHkgPSBzbWlsaWZ5KGJvZHkpO1xuXG4gICAgICAgIHJldHVybiBib2R5O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZpbmRzIGFuZCByZXBsYWNlcyBhbGwgbGlua3MgaW4gdGhlIGxpbmtzIGluIFwiYm9keVwiXG4gICAgICogd2l0aCB0aGVpciA8YSBocmVmPVwiXCI+PC9hPlxuICAgICAqL1xuICAgIFJlcGxhY2VtZW50UHJvdG8ubGlua2lmeSA9IGZ1bmN0aW9uKGlucHV0VGV4dClcbiAgICB7XG4gICAgICAgIHZhciByZXBsYWNlZFRleHQsIHJlcGxhY2VQYXR0ZXJuMSwgcmVwbGFjZVBhdHRlcm4yLCByZXBsYWNlUGF0dGVybjM7XG5cbiAgICAgICAgLy9VUkxzIHN0YXJ0aW5nIHdpdGggaHR0cDovLywgaHR0cHM6Ly8sIG9yIGZ0cDovL1xuICAgICAgICByZXBsYWNlUGF0dGVybjEgPSAvKFxcYihodHRwcz98ZnRwKTpcXC9cXC9bLUEtWjAtOSsmQCNcXC8lPz1+X3whOiwuO10qWy1BLVowLTkrJkAjXFwvJT1+X3xdKS9naW07XG4gICAgICAgIHJlcGxhY2VkVGV4dCA9IGlucHV0VGV4dC5yZXBsYWNlKHJlcGxhY2VQYXR0ZXJuMSwgJzxhIGhyZWY9XCIkMVwiIHRhcmdldD1cIl9ibGFua1wiPiQxPC9hPicpO1xuXG4gICAgICAgIC8vVVJMcyBzdGFydGluZyB3aXRoIFwid3d3LlwiICh3aXRob3V0IC8vIGJlZm9yZSBpdCwgb3IgaXQnZCByZS1saW5rIHRoZSBvbmVzIGRvbmUgYWJvdmUpLlxuICAgICAgICByZXBsYWNlUGF0dGVybjIgPSAvKF58W15cXC9dKSh3d3dcXC5bXFxTXSsoXFxifCQpKS9naW07XG4gICAgICAgIHJlcGxhY2VkVGV4dCA9IHJlcGxhY2VkVGV4dC5yZXBsYWNlKHJlcGxhY2VQYXR0ZXJuMiwgJyQxPGEgaHJlZj1cImh0dHA6Ly8kMlwiIHRhcmdldD1cIl9ibGFua1wiPiQyPC9hPicpO1xuXG4gICAgICAgIC8vQ2hhbmdlIGVtYWlsIGFkZHJlc3NlcyB0byBtYWlsdG86OiBsaW5rcy5cbiAgICAgICAgcmVwbGFjZVBhdHRlcm4zID0gLygoW2EtekEtWjAtOVxcLVxcX1xcLl0pK0BbYS16QS1aXFxfXSs/KFxcLlthLXpBLVpdezIsNn0pKykvZ2ltO1xuICAgICAgICByZXBsYWNlZFRleHQgPSByZXBsYWNlZFRleHQucmVwbGFjZShyZXBsYWNlUGF0dGVybjMsICc8YSBocmVmPVwibWFpbHRvOiQxXCI+JDE8L2E+Jyk7XG5cbiAgICAgICAgcmV0dXJuIHJlcGxhY2VkVGV4dDtcbiAgICB9XG4gICAgcmV0dXJuIFJlcGxhY2VtZW50UHJvdG87XG59KCk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVwbGFjZW1lbnQ7XG5cblxuXG4iLCIvKiBnbG9iYWwgJCwgY29uZmlnLCBQcmV6aSwgVXRpbCwgY29ubmVjdGlvbiwgc2V0TGFyZ2VWaWRlb1Zpc2libGUsIGRvY2tUb29sYmFyICovXG52YXIgUHJlemkgPSByZXF1aXJlKFwiLi4vcHJlemkvUHJlemkuanNcIik7XG52YXIgVUlVdGlsID0gcmVxdWlyZShcIi4uL1VJVXRpbC5qc1wiKTtcbnZhciBUb29sYmFyVG9nZ2xlciA9IHJlcXVpcmUoXCIuLi90b29sYmFycy90b29sYmFyX3RvZ2dsZXJcIik7XG5cbnZhciBFdGhlcnBhZCA9IChmdW5jdGlvbiAobXkpIHtcbiAgICB2YXIgZXRoZXJwYWROYW1lID0gbnVsbDtcbiAgICB2YXIgZXRoZXJwYWRJRnJhbWUgPSBudWxsO1xuICAgIHZhciBkb21haW4gPSBudWxsO1xuICAgIHZhciBvcHRpb25zID0gXCI/c2hvd0NvbnRyb2xzPXRydWUmc2hvd0NoYXQ9ZmFsc2Umc2hvd0xpbmVOdW1iZXJzPXRydWUmdXNlTW9ub3NwYWNlRm9udD1mYWxzZVwiO1xuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGV0aGVycGFkLlxuICAgICAqL1xuICAgIG15LmluaXQgPSBmdW5jdGlvbiAobmFtZSkge1xuXG4gICAgICAgIGlmIChjb25maWcuZXRoZXJwYWRfYmFzZSAmJiAhZXRoZXJwYWROYW1lKSB7XG5cbiAgICAgICAgICAgIGRvbWFpbiA9IGNvbmZpZy5ldGhlcnBhZF9iYXNlO1xuXG4gICAgICAgICAgICBpZiAoIW5hbWUpIHtcbiAgICAgICAgICAgICAgICAvLyBJbiBjYXNlIHdlJ3JlIHRoZSBmb2N1cyB3ZSBnZW5lcmF0ZSB0aGUgbmFtZS5cbiAgICAgICAgICAgICAgICBldGhlcnBhZE5hbWUgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNykgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnXycgKyAobmV3IERhdGUoKS5nZXRUaW1lKCkpLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgc2hhcmVFdGhlcnBhZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIGV0aGVycGFkTmFtZSA9IG5hbWU7XG5cbiAgICAgICAgICAgIGVuYWJsZUV0aGVycGFkQnV0dG9uKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogT3BlbnMvaGlkZXMgdGhlIEV0aGVycGFkLlxuICAgICAqL1xuICAgIG15LnRvZ2dsZUV0aGVycGFkID0gZnVuY3Rpb24gKGlzUHJlc2VudGF0aW9uKSB7XG4gICAgICAgIGlmICghZXRoZXJwYWRJRnJhbWUpXG4gICAgICAgICAgICBjcmVhdGVJRnJhbWUoKTtcblxuICAgICAgICB2YXIgbGFyZ2VWaWRlbyA9IG51bGw7XG4gICAgICAgIGlmIChQcmV6aS5pc1ByZXNlbnRhdGlvblZpc2libGUoKSlcbiAgICAgICAgICAgIGxhcmdlVmlkZW8gPSAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBsYXJnZVZpZGVvID0gJCgnI2xhcmdlVmlkZW8nKTtcblxuICAgICAgICBpZiAoJCgnI2V0aGVycGFkPmlmcmFtZScpLmNzcygndmlzaWJpbGl0eScpID09PSAnaGlkZGVuJykge1xuICAgICAgICAgICAgbGFyZ2VWaWRlby5mYWRlT3V0KDMwMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChQcmV6aS5pc1ByZXNlbnRhdGlvblZpc2libGUoKSkge1xuICAgICAgICAgICAgICAgICAgICBsYXJnZVZpZGVvLmNzcyh7b3BhY2l0eTogJzAnfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2V0TGFyZ2VWaWRlb1Zpc2libGUoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBUb29sYmFyVG9nZ2xlci5kb2NrVG9vbGJhcih0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkKCcjZXRoZXJwYWQ+aWZyYW1lJykuZmFkZUluKDMwMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLmJhY2tncm91bmQgPSAnI2VlZWVlZSc7XG4gICAgICAgICAgICAgICAgICAgICQoJyNldGhlcnBhZD5pZnJhbWUnKS5jc3Moe3Zpc2liaWxpdHk6ICd2aXNpYmxlJ30pO1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXRoZXJwYWQnKS5jc3Moe3pJbmRleDogMn0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoJCgnI2V0aGVycGFkPmlmcmFtZScpKSB7XG4gICAgICAgICAgICAkKCcjZXRoZXJwYWQ+aWZyYW1lJykuZmFkZU91dCgzMDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAkKCcjZXRoZXJwYWQ+aWZyYW1lJykuY3NzKHt2aXNpYmlsaXR5OiAnaGlkZGVuJ30pO1xuICAgICAgICAgICAgICAgICQoJyNldGhlcnBhZCcpLmNzcyh7ekluZGV4OiAwfSk7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5iYWNrZ3JvdW5kID0gJ2JsYWNrJztcbiAgICAgICAgICAgICAgICBpZiAoIWlzUHJlc2VudGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNsYXJnZVZpZGVvJykuZmFkZUluKDMwMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2V0TGFyZ2VWaWRlb1Zpc2libGUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBUb29sYmFyVG9nZ2xlci5kb2NrVG9vbGJhcihmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJlc2l6ZSgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXNpemVzIHRoZSBldGhlcnBhZC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiByZXNpemUoKSB7XG4gICAgICAgIGlmICgkKCcjZXRoZXJwYWQ+aWZyYW1lJykubGVuZ3RoKSB7XG4gICAgICAgICAgICB2YXIgcmVtb3RlVmlkZW9zID0gJCgnI3JlbW90ZVZpZGVvcycpO1xuICAgICAgICAgICAgdmFyIGF2YWlsYWJsZUhlaWdodFxuICAgICAgICAgICAgICAgID0gd2luZG93LmlubmVySGVpZ2h0IC0gcmVtb3RlVmlkZW9zLm91dGVySGVpZ2h0KCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhVSVV0aWwpO1xuICAgICAgICAgICAgdmFyIGF2YWlsYWJsZVdpZHRoID0gVUlVdGlsLmdldEF2YWlsYWJsZVZpZGVvV2lkdGgoKTtcblxuICAgICAgICAgICAgJCgnI2V0aGVycGFkPmlmcmFtZScpLndpZHRoKGF2YWlsYWJsZVdpZHRoKTtcbiAgICAgICAgICAgICQoJyNldGhlcnBhZD5pZnJhbWUnKS5oZWlnaHQoYXZhaWxhYmxlSGVpZ2h0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNoYXJlcyB0aGUgRXRoZXJwYWQgbmFtZSB3aXRoIG90aGVyIHBhcnRpY2lwYW50cy5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzaGFyZUV0aGVycGFkKCkge1xuICAgICAgICBjb25uZWN0aW9uLmVtdWMuYWRkRXRoZXJwYWRUb1ByZXNlbmNlKGV0aGVycGFkTmFtZSk7XG4gICAgICAgIGNvbm5lY3Rpb24uZW11Yy5zZW5kUHJlc2VuY2UoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIHRoZSBFdGhlcnBhZCBidXR0b24gYW5kIGFkZHMgaXQgdG8gdGhlIHRvb2xiYXIuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZW5hYmxlRXRoZXJwYWRCdXR0b24oKSB7XG4gICAgICAgIGlmICghJCgnI2V0aGVycGFkQnV0dG9uJykuaXMoXCI6dmlzaWJsZVwiKSlcbiAgICAgICAgICAgICQoJyNldGhlcnBhZEJ1dHRvbicpLmNzcyh7ZGlzcGxheTogJ2lubGluZS1ibG9jayd9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIHRoZSBJRnJhbWUgZm9yIHRoZSBldGhlcnBhZC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVJRnJhbWUoKSB7XG4gICAgICAgIGV0aGVycGFkSUZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG4gICAgICAgIGV0aGVycGFkSUZyYW1lLnNyYyA9IGRvbWFpbiArIGV0aGVycGFkTmFtZSArIG9wdGlvbnM7XG4gICAgICAgIGV0aGVycGFkSUZyYW1lLmZyYW1lQm9yZGVyID0gMDtcbiAgICAgICAgZXRoZXJwYWRJRnJhbWUuc2Nyb2xsaW5nID0gXCJub1wiO1xuICAgICAgICBldGhlcnBhZElGcmFtZS53aWR0aCA9ICQoJyNsYXJnZVZpZGVvQ29udGFpbmVyJykud2lkdGgoKSB8fCA2NDA7XG4gICAgICAgIGV0aGVycGFkSUZyYW1lLmhlaWdodCA9ICQoJyNsYXJnZVZpZGVvQ29udGFpbmVyJykuaGVpZ2h0KCkgfHwgNDgwO1xuICAgICAgICBldGhlcnBhZElGcmFtZS5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ3Zpc2liaWxpdHk6IGhpZGRlbjsnKTtcblxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZXRoZXJwYWQnKS5hcHBlbmRDaGlsZChldGhlcnBhZElGcmFtZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogT24gRXRoZXJwYWQgYWRkZWQgdG8gbXVjLlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ2V0aGVycGFkYWRkZWQubXVjJywgZnVuY3Rpb24gKGV2ZW50LCBqaWQsIGV0aGVycGFkTmFtZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkV0aGVycGFkIGFkZGVkXCIsIGV0aGVycGFkTmFtZSk7XG4gICAgICAgIGlmIChjb25maWcuZXRoZXJwYWRfYmFzZSAmJiAhZm9jdXMpIHtcbiAgICAgICAgICAgIEV0aGVycGFkLmluaXQoZXRoZXJwYWROYW1lKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogT24gZm9jdXMgY2hhbmdlZCBldmVudC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdmb2N1c2VjaGFuZ2VkLm11YycsIGZ1bmN0aW9uIChldmVudCwgZm9jdXMpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJGb2N1cyBjaGFuZ2VkXCIpO1xuICAgICAgICBpZiAoY29uZmlnLmV0aGVycGFkX2Jhc2UpXG4gICAgICAgICAgICBzaGFyZUV0aGVycGFkKCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBPbiB2aWRlbyBzZWxlY3RlZCBldmVudC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCd2aWRlby5zZWxlY3RlZCcsIGZ1bmN0aW9uIChldmVudCwgaXNQcmVzZW50YXRpb24pIHtcbiAgICAgICAgaWYgKCFjb25maWcuZXRoZXJwYWRfYmFzZSlcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBpZiAoZXRoZXJwYWRJRnJhbWUgJiYgZXRoZXJwYWRJRnJhbWUuc3R5bGUudmlzaWJpbGl0eSAhPT0gJ2hpZGRlbicpXG4gICAgICAgICAgICBFdGhlcnBhZC50b2dnbGVFdGhlcnBhZChpc1ByZXNlbnRhdGlvbik7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBSZXNpemVzIHRoZSBldGhlcnBhZCwgd2hlbiB0aGUgd2luZG93IGlzIHJlc2l6ZWQuXG4gICAgICovXG4gICAgJCh3aW5kb3cpLnJlc2l6ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlc2l6ZSgpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG15O1xufShFdGhlcnBhZCB8fCB7fSkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV0aGVycGFkO1xuIiwidmFyIEJvdHRvbVRvb2xiYXIgPSByZXF1aXJlKFwiLi90b29sYmFycy9Cb3R0b21Ub29sYmFyXCIpO1xuXG52YXIgS2V5Ym9hcmRTaG9ydGN1dCA9IChmdW5jdGlvbihteSkge1xuICAgIC8vbWFwcyBrZXljb2RlIHRvIGNoYXJhY3RlciwgaWQgb2YgcG9wb3ZlciBmb3IgZ2l2ZW4gZnVuY3Rpb24gYW5kIGZ1bmN0aW9uXG4gICAgdmFyIHNob3J0Y3V0cyA9IHtcbiAgICAgICAgNjc6IHtcbiAgICAgICAgICAgIGNoYXJhY3RlcjogXCJDXCIsXG4gICAgICAgICAgICBpZDogXCJ0b2dnbGVDaGF0UG9wb3ZlclwiLFxuICAgICAgICAgICAgZnVuY3Rpb246IEJvdHRvbVRvb2xiYXIudG9nZ2xlQ2hhdFxuICAgICAgICB9LFxuICAgICAgICA3MDoge1xuICAgICAgICAgICAgY2hhcmFjdGVyOiBcIkZcIixcbiAgICAgICAgICAgIGlkOiBcImZpbG1zdHJpcFBvcG92ZXJcIixcbiAgICAgICAgICAgIGZ1bmN0aW9uOiBCb3R0b21Ub29sYmFyLnRvZ2dsZUZpbG1TdHJpcFxuICAgICAgICB9LFxuICAgICAgICA3Nzoge1xuICAgICAgICAgICAgY2hhcmFjdGVyOiBcIk1cIixcbiAgICAgICAgICAgIGlkOiBcIm11dGVQb3BvdmVyXCIsXG4gICAgICAgICAgICBmdW5jdGlvbjogdG9nZ2xlQXVkaW9cbiAgICAgICAgfSxcbiAgICAgICAgODQ6IHtcbiAgICAgICAgICAgIGNoYXJhY3RlcjogXCJUXCIsXG4gICAgICAgICAgICBmdW5jdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYoIWlzQXVkaW9NdXRlZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvZ2dsZUF1ZGlvKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICA4Njoge1xuICAgICAgICAgICAgY2hhcmFjdGVyOiBcIlZcIixcbiAgICAgICAgICAgIGlkOiBcInRvZ2dsZVZpZGVvUG9wb3ZlclwiLFxuICAgICAgICAgICAgZnVuY3Rpb246IHRvZ2dsZVZpZGVvXG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgd2luZG93Lm9ua2V5dXAgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmKCEoJChcIjpmb2N1c1wiKS5pcyhcImlucHV0W3R5cGU9dGV4dF1cIikgfHwgJChcIjpmb2N1c1wiKS5pcyhcInRleHRhcmVhXCIpKSkge1xuICAgICAgICAgICAgdmFyIGtleWNvZGUgPSBlLndoaWNoO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzaG9ydGN1dHNba2V5Y29kZV0gPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgICAgICBzaG9ydGN1dHNba2V5Y29kZV0uZnVuY3Rpb24oKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5Y29kZSA+PSBcIjBcIi5jaGFyQ29kZUF0KDApICYmIGtleWNvZGUgPD0gXCI5XCIuY2hhckNvZGVBdCgwKSkge1xuICAgICAgICAgICAgICAgIHZhciByZW1vdGVWaWRlb3MgPSAkKFwiLnZpZGVvY29udGFpbmVyOm5vdCgjbWl4ZWRzdHJlYW0pXCIpLFxuICAgICAgICAgICAgICAgICAgICB2aWRlb1dhbnRlZCA9IGtleWNvZGUgLSBcIjBcIi5jaGFyQ29kZUF0KDApICsgMTtcbiAgICAgICAgICAgICAgICBpZiAocmVtb3RlVmlkZW9zLmxlbmd0aCA+IHZpZGVvV2FudGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlbW90ZVZpZGVvc1t2aWRlb1dhbnRlZF0uY2xpY2soKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgd2luZG93Lm9ua2V5ZG93biA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYoJChcIiNjaGF0c3BhY2VcIikuY3NzKFwiZGlzcGxheVwiKSA9PT0gXCJub25lXCIpIHtcbiAgICAgICAgICAgIGlmKGUud2hpY2ggPT09IFwiVFwiLmNoYXJDb2RlQXQoMCkpIHtcbiAgICAgICAgICAgICAgICBpZihpc0F1ZGlvTXV0ZWQoKSkge1xuICAgICAgICAgICAgICAgICAgICB0b2dnbGVBdWRpbygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogIFxuICAgICAqIEBwYXJhbSBpZCBpbmRpY2F0ZXMgdGhlIHBvcG92ZXIgYXNzb2NpYXRlZCB3aXRoIHRoZSBzaG9ydGN1dFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IHRoZSBrZXlib2FyZCBzaG9ydGN1dCB1c2VkIGZvciB0aGUgaWQgZ2l2ZW5cbiAgICAgKi9cbiAgICBteS5nZXRTaG9ydGN1dCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIGZvcih2YXIga2V5Y29kZSBpbiBzaG9ydGN1dHMpIHtcbiAgICAgICAgICAgIGlmKHNob3J0Y3V0cy5oYXNPd25Qcm9wZXJ0eShrZXljb2RlKSkge1xuICAgICAgICAgICAgICAgIGlmIChzaG9ydGN1dHNba2V5Y29kZV0uaWQgPT09IGlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIiAoXCIgKyBzaG9ydGN1dHNba2V5Y29kZV0uY2hhcmFjdGVyICsgXCIpXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBcIlwiO1xuICAgIH07XG5cbiAgICBteS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAkKCdib2R5JykucG9wb3Zlcih7IHNlbGVjdG9yOiAnW2RhdGEtdG9nZ2xlPXBvcG92ZXJdJyxcbiAgICAgICAgICAgIHRyaWdnZXI6ICdjbGljayBob3ZlcicsXG4gICAgICAgICAgICBjb250ZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoXCJjb250ZW50XCIpICtcbiAgICAgICAgICAgICAgICAgICAgS2V5Ym9hcmRTaG9ydGN1dC5nZXRTaG9ydGN1dCh0aGlzLmdldEF0dHJpYnV0ZShcInNob3J0Y3V0XCIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBteTtcbn0oS2V5Ym9hcmRTaG9ydGN1dCB8fCB7fSkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEtleWJvYXJkU2hvcnRjdXQ7XG4iLCJ2YXIgUHJlemlQbGF5ZXIgPSByZXF1aXJlKFwiLi9QcmV6aVBsYXllci5qc1wiKTtcbnZhciBVSVV0aWwgPSByZXF1aXJlKFwiLi4vVUlVdGlsLmpzXCIpO1xudmFyIFRvb2xiYXJUb2dnbGVyID0gcmVxdWlyZShcIi4uL3Rvb2xiYXJzL3Rvb2xiYXJfdG9nZ2xlclwiKTtcblxudmFyIFByZXppID0gKGZ1bmN0aW9uIChteSkge1xuICAgIHZhciBwcmV6aVBsYXllciA9IG51bGw7XG5cbiAgICAvKipcbiAgICAgKiBSZWxvYWRzIHRoZSBjdXJyZW50IHByZXNlbnRhdGlvbi5cbiAgICAgKi9cbiAgICBteS5yZWxvYWRQcmVzZW50YXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGlmcmFtZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHByZXppUGxheWVyLm9wdGlvbnMucHJlemlJZCk7XG4gICAgICAgIGlmcmFtZS5zcmMgPSBpZnJhbWUuc3JjO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTaG93cy9oaWRlcyBhIHByZXNlbnRhdGlvbi5cbiAgICAgKi9cbiAgICBteS5zZXRQcmVzZW50YXRpb25WaXNpYmxlID0gZnVuY3Rpb24gKHZpc2libGUpIHtcbiAgICAgICAgaWYgKHZpc2libGUpIHtcbiAgICAgICAgICAgIC8vIFRyaWdnZXIgdGhlIHZpZGVvLnNlbGVjdGVkIGV2ZW50IHRvIGluZGljYXRlIGEgY2hhbmdlIGluIHRoZVxuICAgICAgICAgICAgLy8gbGFyZ2UgdmlkZW8uXG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKFwidmlkZW8uc2VsZWN0ZWRcIiwgW3RydWVdKTtcblxuICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5mYWRlT3V0KDMwMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNldExhcmdlVmlkZW9WaXNpYmxlKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLmZhZGVJbigzMDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLmNzcyh7b3BhY2l0eTonMSd9KTtcbiAgICAgICAgICAgICAgICAgICAgVG9vbGJhclRvZ2dsZXIuZG9ja1Rvb2xiYXIodHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmICgkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLmNzcygnb3BhY2l0eScpID09ICcxJykge1xuICAgICAgICAgICAgICAgICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykuZmFkZU91dCgzMDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS5jc3Moe29wYWNpdHk6JzAnfSk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNyZWxvYWRQcmVzZW50YXRpb24nKS5jc3Moe2Rpc3BsYXk6J25vbmUnfSk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNsYXJnZVZpZGVvJykuZmFkZUluKDMwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zZXRMYXJnZVZpZGVvVmlzaWJsZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFRvb2xiYXJUb2dnbGVyLmRvY2tUb29sYmFyKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyA8dHQ+dHJ1ZTwvdHQ+IGlmIHRoZSBwcmVzZW50YXRpb24gaXMgdmlzaWJsZSwgPHR0PmZhbHNlPC90dD4gLVxuICAgICAqIG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBteS5pc1ByZXNlbnRhdGlvblZpc2libGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAoJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKSAhPSBudWxsXG4gICAgICAgICAgICAgICAgJiYgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS5jc3MoJ29wYWNpdHknKSA9PSAxKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogT3BlbnMgdGhlIFByZXppIGRpYWxvZywgZnJvbSB3aGljaCB0aGUgdXNlciBjb3VsZCBjaG9vc2UgYSBwcmVzZW50YXRpb25cbiAgICAgKiB0byBsb2FkLlxuICAgICAqL1xuICAgIG15Lm9wZW5QcmV6aURpYWxvZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXlwcmV6aSA9IGNvbm5lY3Rpb24uZW11Yy5nZXRQcmV6aShjb25uZWN0aW9uLmVtdWMubXlyb29tamlkKTtcbiAgICAgICAgaWYgKG15cHJlemkpIHtcbiAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5Ud29CdXR0b25EaWFsb2coXCJSZW1vdmUgUHJlemlcIixcbiAgICAgICAgICAgICAgICBcIkFyZSB5b3Ugc3VyZSB5b3Ugd291bGQgbGlrZSB0byByZW1vdmUgeW91ciBQcmV6aT9cIixcbiAgICAgICAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICAgICAgICBcIlJlbW92ZVwiLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGUsdixtLGYpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGlvbi5lbXVjLnJlbW92ZVByZXppRnJvbVByZXNlbmNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuc2VuZFByZXNlbmNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHByZXppUGxheWVyICE9IG51bGwpIHtcbiAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5Ud29CdXR0b25EaWFsb2coXCJTaGFyZSBhIFByZXppXCIsXG4gICAgICAgICAgICAgICAgXCJBbm90aGVyIHBhcnRpY2lwYW50IGlzIGFscmVhZHkgc2hhcmluZyBhIFByZXppLlwiICtcbiAgICAgICAgICAgICAgICAgICAgXCJUaGlzIGNvbmZlcmVuY2UgYWxsb3dzIG9ubHkgb25lIFByZXppIGF0IGEgdGltZS5cIixcbiAgICAgICAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICAgICAgICBcIk9rXCIsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oZSx2LG0sZikge1xuICAgICAgICAgICAgICAgICAgICAkLnByb21wdC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgb3BlblByZXppU3RhdGUgPSB7XG4gICAgICAgICAgICAgICAgc3RhdGUwOiB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWw6ICAgJzxoMj5TaGFyZSBhIFByZXppPC9oMj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPGlucHV0IGlkPVwicHJlemlVcmxcIiB0eXBlPVwidGV4dFwiICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdwbGFjZWhvbGRlcj1cImUuZy4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2h0dHA6Ly9wcmV6aS5jb20vd3o3dmhqeWNsN2U2L215LXByZXppXCIgYXV0b2ZvY3VzPicsXG4gICAgICAgICAgICAgICAgICAgIHBlcnNpc3RlbnQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBidXR0b25zOiB7IFwiU2hhcmVcIjogdHJ1ZSAsIFwiQ2FuY2VsXCI6IGZhbHNlfSxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdEJ1dHRvbjogMSxcbiAgICAgICAgICAgICAgICAgICAgc3VibWl0OiBmdW5jdGlvbihlLHYsbSxmKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHYpXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHByZXppVXJsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByZXppVXJsJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJlemlVcmwudmFsdWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdXJsVmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID0gZW5jb2RlVVJJKFV0aWwuZXNjYXBlSHRtbChwcmV6aVVybC52YWx1ZSkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh1cmxWYWx1ZS5pbmRleE9mKCdodHRwOi8vcHJlemkuY29tLycpICE9IDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICYmIHVybFZhbHVlLmluZGV4T2YoJ2h0dHBzOi8vcHJlemkuY29tLycpICE9IDApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQucHJvbXB0LmdvVG9TdGF0ZSgnc3RhdGUxJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcHJlc0lkVG1wID0gdXJsVmFsdWUuc3Vic3RyaW5nKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmxWYWx1ZS5pbmRleE9mKFwicHJlemkuY29tL1wiKSArIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXNBbHBoYW51bWVyaWMocHJlc0lkVG1wKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCBwcmVzSWRUbXAuaW5kZXhPZignLycpIDwgMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQucHJvbXB0LmdvVG9TdGF0ZSgnc3RhdGUxJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGlvbi5lbXVjXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRQcmV6aVRvUHJlc2VuY2UodXJsVmFsdWUsIDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Yy5zZW5kUHJlc2VuY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkLnByb21wdC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQucHJvbXB0LmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHN0YXRlMToge1xuICAgICAgICAgICAgICAgICAgICBodG1sOiAgICc8aDI+U2hhcmUgYSBQcmV6aTwvaDI+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1BsZWFzZSBwcm92aWRlIGEgY29ycmVjdCBwcmV6aSBsaW5rLicsXG4gICAgICAgICAgICAgICAgICAgIHBlcnNpc3RlbnQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBidXR0b25zOiB7IFwiQmFja1wiOiB0cnVlLCBcIkNhbmNlbFwiOiBmYWxzZSB9LFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0QnV0dG9uOiAxLFxuICAgICAgICAgICAgICAgICAgICBzdWJtaXQ6ZnVuY3Rpb24oZSx2LG0sZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYodj09MClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkLnByb21wdC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQucHJvbXB0LmdvVG9TdGF0ZSgnc3RhdGUwJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIGZvY3VzUHJlemlVcmwgPSAgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJlemlVcmwnKS5mb2N1cygpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5vcGVuRGlhbG9nV2l0aFN0YXRlcyhvcGVuUHJlemlTdGF0ZSwgZm9jdXNQcmV6aVVybCwgZm9jdXNQcmV6aVVybCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQSBuZXcgcHJlc2VudGF0aW9uIGhhcyBiZWVuIGFkZGVkLlxuICAgICAqIFxuICAgICAqIEBwYXJhbSBldmVudCB0aGUgZXZlbnQgaW5kaWNhdGluZyB0aGUgYWRkIG9mIGEgcHJlc2VudGF0aW9uXG4gICAgICogQHBhcmFtIGppZCB0aGUgamlkIGZyb20gd2hpY2ggdGhlIHByZXNlbnRhdGlvbiB3YXMgYWRkZWRcbiAgICAgKiBAcGFyYW0gcHJlc1VybCB1cmwgb2YgdGhlIHByZXNlbnRhdGlvblxuICAgICAqIEBwYXJhbSBjdXJyZW50U2xpZGUgdGhlIGN1cnJlbnQgc2xpZGUgdG8gd2hpY2ggd2Ugc2hvdWxkIG1vdmVcbiAgICAgKi9cbiAgICB2YXIgcHJlc2VudGF0aW9uQWRkZWQgPSBmdW5jdGlvbihldmVudCwgamlkLCBwcmVzVXJsLCBjdXJyZW50U2xpZGUpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJwcmVzZW50YXRpb24gYWRkZWRcIiwgcHJlc1VybCk7XG5cbiAgICAgICAgdmFyIHByZXNJZCA9IGdldFByZXNlbnRhdGlvbklkKHByZXNVcmwpO1xuXG4gICAgICAgIHZhciBlbGVtZW50SWQgPSAncGFydGljaXBhbnRfJ1xuICAgICAgICAgICAgICAgICAgICAgICAgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpXG4gICAgICAgICAgICAgICAgICAgICAgICArICdfJyArIHByZXNJZDtcblxuICAgICAgICAvLyBXZSBleHBsaWNpdGx5IGRvbid0IHNwZWNpZnkgdGhlIHBlZXIgamlkIGhlcmUsIGJlY2F1c2Ugd2UgZG9uJ3Qgd2FudFxuICAgICAgICAvLyB0aGlzIHZpZGVvIHRvIGJlIGRlYWx0IHdpdGggYXMgYSBwZWVyIHJlbGF0ZWQgb25lIChmb3IgZXhhbXBsZSB3ZVxuICAgICAgICAvLyBkb24ndCB3YW50IHRvIHNob3cgYSBtdXRlL2tpY2sgbWVudSBmb3IgdGhpcyBvbmUsIGV0Yy4pLlxuICAgICAgICBWaWRlb0xheW91dC5hZGRSZW1vdGVWaWRlb0NvbnRhaW5lcihudWxsLCBlbGVtZW50SWQpO1xuICAgICAgICBWaWRlb0xheW91dC5yZXNpemVUaHVtYm5haWxzKCk7XG5cbiAgICAgICAgdmFyIGNvbnRyb2xzRW5hYmxlZCA9IGZhbHNlO1xuICAgICAgICBpZiAoamlkID09PSBjb25uZWN0aW9uLmVtdWMubXlyb29tamlkKVxuICAgICAgICAgICAgY29udHJvbHNFbmFibGVkID0gdHJ1ZTtcblxuICAgICAgICBQcmV6aS5zZXRQcmVzZW50YXRpb25WaXNpYmxlKHRydWUpO1xuICAgICAgICAkKCcjbGFyZ2VWaWRlb0NvbnRhaW5lcicpLmhvdmVyKFxuICAgICAgICAgICAgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKFByZXppLmlzUHJlc2VudGF0aW9uVmlzaWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWxvYWRCdXR0b25SaWdodCA9IHdpbmRvdy5pbm5lcldpZHRoXG4gICAgICAgICAgICAgICAgICAgICAgICAtICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykub2Zmc2V0KCkubGVmdFxuICAgICAgICAgICAgICAgICAgICAgICAgLSAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLndpZHRoKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgJCgnI3JlbG9hZFByZXNlbnRhdGlvbicpLmNzcyh7ICByaWdodDogcmVsb2FkQnV0dG9uUmlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGxheTonaW5saW5lLWJsb2NrJ30pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIVByZXppLmlzUHJlc2VudGF0aW9uVmlzaWJsZSgpKVxuICAgICAgICAgICAgICAgICAgICAkKCcjcmVsb2FkUHJlc2VudGF0aW9uJykuY3NzKHtkaXNwbGF5Oidub25lJ30pO1xuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZSA9IGV2ZW50LnRvRWxlbWVudCB8fCBldmVudC5yZWxhdGVkVGFyZ2V0O1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChlICYmIGUuaWQgIT0gJ3JlbG9hZFByZXNlbnRhdGlvbicgJiYgZS5pZCAhPSAnaGVhZGVyJylcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJyNyZWxvYWRQcmVzZW50YXRpb24nKS5jc3Moe2Rpc3BsYXk6J25vbmUnfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgcHJlemlQbGF5ZXIgPSBuZXcgUHJlemlQbGF5ZXIoXG4gICAgICAgICAgICAgICAgICAgICdwcmVzZW50YXRpb24nLFxuICAgICAgICAgICAgICAgICAgICB7cHJlemlJZDogcHJlc0lkLFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogZ2V0UHJlc2VudGF0aW9uV2lkdGgoKSxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBnZXRQcmVzZW50YXRpb25IZWloZ3QoKSxcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbHM6IGNvbnRyb2xzRW5hYmxlZCxcbiAgICAgICAgICAgICAgICAgICAgZGVidWc6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS5hdHRyKCdpZCcsIHByZXppUGxheWVyLm9wdGlvbnMucHJlemlJZCk7XG5cbiAgICAgICAgcHJlemlQbGF5ZXIub24oUHJlemlQbGF5ZXIuRVZFTlRfU1RBVFVTLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJwcmV6aSBzdGF0dXNcIiwgZXZlbnQudmFsdWUpO1xuICAgICAgICAgICAgaWYgKGV2ZW50LnZhbHVlID09IFByZXppUGxheWVyLlNUQVRVU19DT05URU5UX1JFQURZKSB7XG4gICAgICAgICAgICAgICAgaWYgKGppZCAhPSBjb25uZWN0aW9uLmVtdWMubXlyb29tamlkKVxuICAgICAgICAgICAgICAgICAgICBwcmV6aVBsYXllci5mbHlUb1N0ZXAoY3VycmVudFNsaWRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcHJlemlQbGF5ZXIub24oUHJlemlQbGF5ZXIuRVZFTlRfQ1VSUkVOVF9TVEVQLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJldmVudCB2YWx1ZVwiLCBldmVudC52YWx1ZSk7XG4gICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuYWRkQ3VycmVudFNsaWRlVG9QcmVzZW5jZShldmVudC52YWx1ZSk7XG4gICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuc2VuZFByZXNlbmNlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoXCIjXCIgKyBlbGVtZW50SWQpLmNzcyggJ2JhY2tncm91bmQtaW1hZ2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAndXJsKC4uL2ltYWdlcy9hdmF0YXJwcmV6aS5wbmcpJyk7XG4gICAgICAgICQoXCIjXCIgKyBlbGVtZW50SWQpLmNsaWNrKFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFByZXppLnNldFByZXNlbnRhdGlvblZpc2libGUodHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEEgcHJlc2VudGF0aW9uIGhhcyBiZWVuIHJlbW92ZWQuXG4gICAgICogXG4gICAgICogQHBhcmFtIGV2ZW50IHRoZSBldmVudCBpbmRpY2F0aW5nIHRoZSByZW1vdmUgb2YgYSBwcmVzZW50YXRpb25cbiAgICAgKiBAcGFyYW0gamlkIHRoZSBqaWQgZm9yIHdoaWNoIHRoZSBwcmVzZW50YXRpb24gd2FzIHJlbW92ZWRcbiAgICAgKiBAcGFyYW0gdGhlIHVybCBvZiB0aGUgcHJlc2VudGF0aW9uXG4gICAgICovXG4gICAgdmFyIHByZXNlbnRhdGlvblJlbW92ZWQgPSBmdW5jdGlvbiAoZXZlbnQsIGppZCwgcHJlc1VybCkge1xuICAgICAgICBjb25zb2xlLmxvZygncHJlc2VudGF0aW9uIHJlbW92ZWQnLCBwcmVzVXJsKTtcbiAgICAgICAgdmFyIHByZXNJZCA9IGdldFByZXNlbnRhdGlvbklkKHByZXNVcmwpO1xuICAgICAgICBQcmV6aS5zZXRQcmVzZW50YXRpb25WaXNpYmxlKGZhbHNlKTtcbiAgICAgICAgJCgnI3BhcnRpY2lwYW50XydcbiAgICAgICAgICAgICAgICArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGppZClcbiAgICAgICAgICAgICAgICArICdfJyArIHByZXNJZCkucmVtb3ZlKCk7XG4gICAgICAgICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykucmVtb3ZlKCk7XG4gICAgICAgIGlmIChwcmV6aVBsYXllciAhPSBudWxsKSB7XG4gICAgICAgICAgICBwcmV6aVBsYXllci5kZXN0cm95KCk7XG4gICAgICAgICAgICBwcmV6aVBsYXllciA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSW5kaWNhdGVzIGlmIHRoZSBnaXZlbiBzdHJpbmcgaXMgYW4gYWxwaGFudW1lcmljIHN0cmluZy5cbiAgICAgKiBOb3RlIHRoYXQgc29tZSBzcGVjaWFsIGNoYXJhY3RlcnMgYXJlIGFsc28gYWxsb3dlZCAoLSwgXyAsIC8sICYsID8sID0sIDspIGZvciB0aGVcbiAgICAgKiBwdXJwb3NlIG9mIGNoZWNraW5nIFVSSXMuXG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNBbHBoYW51bWVyaWModW5zYWZlVGV4dCkge1xuICAgICAgICB2YXIgcmVnZXggPSAvXlthLXowLTktX1xcLyZcXD89O10rJC9pO1xuICAgICAgICByZXR1cm4gcmVnZXgudGVzdCh1bnNhZmVUZXh0KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBwcmVzZW50YXRpb24gaWQgZnJvbSB0aGUgZ2l2ZW4gdXJsLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFByZXNlbnRhdGlvbklkIChwcmVzVXJsKSB7XG4gICAgICAgIHZhciBwcmVzSWRUbXAgPSBwcmVzVXJsLnN1YnN0cmluZyhwcmVzVXJsLmluZGV4T2YoXCJwcmV6aS5jb20vXCIpICsgMTApO1xuICAgICAgICByZXR1cm4gcHJlc0lkVG1wLnN1YnN0cmluZygwLCBwcmVzSWRUbXAuaW5kZXhPZignLycpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBwcmVzZW50YXRpb24gd2lkdGguXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UHJlc2VudGF0aW9uV2lkdGgoKSB7XG4gICAgICAgIHZhciBhdmFpbGFibGVXaWR0aCA9IFVJVXRpbC5nZXRBdmFpbGFibGVWaWRlb1dpZHRoKCk7XG4gICAgICAgIHZhciBhdmFpbGFibGVIZWlnaHQgPSBnZXRQcmVzZW50YXRpb25IZWloZ3QoKTtcblxuICAgICAgICB2YXIgYXNwZWN0UmF0aW8gPSAxNi4wIC8gOS4wO1xuICAgICAgICBpZiAoYXZhaWxhYmxlSGVpZ2h0IDwgYXZhaWxhYmxlV2lkdGggLyBhc3BlY3RSYXRpbykge1xuICAgICAgICAgICAgYXZhaWxhYmxlV2lkdGggPSBNYXRoLmZsb29yKGF2YWlsYWJsZUhlaWdodCAqIGFzcGVjdFJhdGlvKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXZhaWxhYmxlV2lkdGg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgcHJlc2VudGF0aW9uIGhlaWdodC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRQcmVzZW50YXRpb25IZWloZ3QoKSB7XG4gICAgICAgIHZhciByZW1vdGVWaWRlb3MgPSAkKCcjcmVtb3RlVmlkZW9zJyk7XG4gICAgICAgIHJldHVybiB3aW5kb3cuaW5uZXJIZWlnaHQgLSByZW1vdGVWaWRlb3Mub3V0ZXJIZWlnaHQoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXNpemVzIHRoZSBwcmVzZW50YXRpb24gaWZyYW1lLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJlc2l6ZSgpIHtcbiAgICAgICAgaWYgKCQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykpIHtcbiAgICAgICAgICAgICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykud2lkdGgoZ2V0UHJlc2VudGF0aW9uV2lkdGgoKSk7XG4gICAgICAgICAgICAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLmhlaWdodChnZXRQcmVzZW50YXRpb25IZWloZ3QoKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQcmVzZW50YXRpb24gaGFzIGJlZW4gcmVtb3ZlZC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdwcmVzZW50YXRpb25yZW1vdmVkLm11YycsIHByZXNlbnRhdGlvblJlbW92ZWQpO1xuXG4gICAgLyoqXG4gICAgICogUHJlc2VudGF0aW9uIGhhcyBiZWVuIGFkZGVkLlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ3ByZXNlbnRhdGlvbmFkZGVkLm11YycsIHByZXNlbnRhdGlvbkFkZGVkKTtcblxuICAgIC8qXG4gICAgICogSW5kaWNhdGVzIHByZXNlbnRhdGlvbiBzbGlkZSBjaGFuZ2UuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgnZ290b3NsaWRlLm11YycsIGZ1bmN0aW9uIChldmVudCwgamlkLCBwcmVzVXJsLCBjdXJyZW50KSB7XG4gICAgICAgIGlmIChwcmV6aVBsYXllciAmJiBwcmV6aVBsYXllci5nZXRDdXJyZW50U3RlcCgpICE9IGN1cnJlbnQpIHtcbiAgICAgICAgICAgIHByZXppUGxheWVyLmZseVRvU3RlcChjdXJyZW50KTtcblxuICAgICAgICAgICAgdmFyIGFuaW1hdGlvblN0ZXBzQXJyYXkgPSBwcmV6aVBsYXllci5nZXRBbmltYXRpb25Db3VudE9uU3RlcHMoKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFyc2VJbnQoYW5pbWF0aW9uU3RlcHNBcnJheVtjdXJyZW50XSk7IGkrKykge1xuICAgICAgICAgICAgICAgIHByZXppUGxheWVyLmZseVRvU3RlcChjdXJyZW50LCBpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogT24gdmlkZW8gc2VsZWN0ZWQgZXZlbnQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgndmlkZW8uc2VsZWN0ZWQnLCBmdW5jdGlvbiAoZXZlbnQsIGlzUHJlc2VudGF0aW9uKSB7XG4gICAgICAgIGlmICghaXNQcmVzZW50YXRpb24gJiYgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKSlcbiAgICAgICAgICAgIFByZXppLnNldFByZXNlbnRhdGlvblZpc2libGUoZmFsc2UpO1xuICAgIH0pO1xuXG4gICAgJCh3aW5kb3cpLnJlc2l6ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlc2l6ZSgpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG15O1xufShQcmV6aSB8fCB7fSkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByZXppO1xuIiwibW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgdmFyIF9fYmluZCA9IGZ1bmN0aW9uKGZuLCBtZSl7IHJldHVybiBmdW5jdGlvbigpeyByZXR1cm4gZm4uYXBwbHkobWUsIGFyZ3VtZW50cyk7IH07IH07XG5cbiAgICB2YXIgUHJlemlQbGF5ZXIgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgUHJlemlQbGF5ZXIuQVBJX1ZFUlNJT04gPSAxO1xuICAgICAgICBQcmV6aVBsYXllci5DVVJSRU5UX1NURVAgPSAnY3VycmVudFN0ZXAnO1xuICAgICAgICBQcmV6aVBsYXllci5DVVJSRU5UX0FOSU1BVElPTl9TVEVQID0gJ2N1cnJlbnRBbmltYXRpb25TdGVwJztcbiAgICAgICAgUHJlemlQbGF5ZXIuQ1VSUkVOVF9PQkpFQ1QgPSAnY3VycmVudE9iamVjdCc7XG4gICAgICAgIFByZXppUGxheWVyLlNUQVRVU19MT0FESU5HID0gJ2xvYWRpbmcnO1xuICAgICAgICBQcmV6aVBsYXllci5TVEFUVVNfUkVBRFkgPSAncmVhZHknO1xuICAgICAgICBQcmV6aVBsYXllci5TVEFUVVNfQ09OVEVOVF9SRUFEWSA9ICdjb250ZW50cmVhZHknO1xuICAgICAgICBQcmV6aVBsYXllci5FVkVOVF9DVVJSRU5UX1NURVAgPSBcImN1cnJlbnRTdGVwQ2hhbmdlXCI7XG4gICAgICAgIFByZXppUGxheWVyLkVWRU5UX0NVUlJFTlRfQU5JTUFUSU9OX1NURVAgPSBcImN1cnJlbnRBbmltYXRpb25TdGVwQ2hhbmdlXCI7XG4gICAgICAgIFByZXppUGxheWVyLkVWRU5UX0NVUlJFTlRfT0JKRUNUID0gXCJjdXJyZW50T2JqZWN0Q2hhbmdlXCI7XG4gICAgICAgIFByZXppUGxheWVyLkVWRU5UX1NUQVRVUyA9IFwic3RhdHVzQ2hhbmdlXCI7XG4gICAgICAgIFByZXppUGxheWVyLkVWRU5UX1BMQVlJTkcgPSBcImlzQXV0b1BsYXlpbmdDaGFuZ2VcIjtcbiAgICAgICAgUHJlemlQbGF5ZXIuRVZFTlRfSVNfTU9WSU5HID0gXCJpc01vdmluZ0NoYW5nZVwiO1xuICAgICAgICBQcmV6aVBsYXllci5kb21haW4gPSBcImh0dHBzOi8vcHJlemkuY29tXCI7XG4gICAgICAgIFByZXppUGxheWVyLnBhdGggPSBcIi9wbGF5ZXIvXCI7XG4gICAgICAgIFByZXppUGxheWVyLnBsYXllcnMgPSB7fTtcbiAgICAgICAgUHJlemlQbGF5ZXIuYmluZGVkX21ldGhvZHMgPSBbJ2NoYW5nZXNIYW5kbGVyJ107XG5cbiAgICAgICAgUHJlemlQbGF5ZXIuY3JlYXRlTXVsdGlwbGVQbGF5ZXJzID0gZnVuY3Rpb24ob3B0aW9uQXJyYXkpe1xuICAgICAgICAgICAgZm9yKHZhciBpPTA7IGk8b3B0aW9uQXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgb3B0aW9uU2V0ID0gb3B0aW9uQXJyYXlbaV07XG4gICAgICAgICAgICAgICAgbmV3IFByZXppUGxheWVyKG9wdGlvblNldC5pZCwgb3B0aW9uU2V0KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIubWVzc2FnZVJlY2VpdmVkID0gZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgICAgICAgdmFyIG1lc3NhZ2UsIGl0ZW0sIHBsYXllcjtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IEpTT04ucGFyc2UoZXZlbnQuZGF0YSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuaWQgJiYgKHBsYXllciA9IFByZXppUGxheWVyLnBsYXllcnNbbWVzc2FnZS5pZF0pKXtcbiAgICAgICAgICAgICAgICBpZiAocGxheWVyLm9wdGlvbnMuZGVidWcgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnNvbGUgJiYgY29uc29sZS5sb2cpIGNvbnNvbGUubG9nKCdyZWNlaXZlZCcsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS50eXBlID09PSBcImNoYW5nZXNcIil7XG4gICAgICAgICAgICAgICAgICAgIHBsYXllci5jaGFuZ2VzSGFuZGxlcihtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPHBsYXllci5jYWxsYmFja3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbSA9IHBsYXllci5jYWxsYmFja3NbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtICYmIG1lc3NhZ2UudHlwZSA9PT0gaXRlbS5ldmVudCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLmNhbGxiYWNrKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIFByZXppUGxheWVyKGlkLCBvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgcGFyYW1zLCBwYXJhbVN0cmluZyA9IFwiXCIsIF90aGlzID0gdGhpcztcbiAgICAgICAgICAgIGlmIChQcmV6aVBsYXllci5wbGF5ZXJzW2lkXSl7XG4gICAgICAgICAgICAgICAgUHJlemlQbGF5ZXIucGxheWVyc1tpZF0uZGVzdHJveSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yKHZhciBpPTA7IGk8UHJlemlQbGF5ZXIuYmluZGVkX21ldGhvZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgbWV0aG9kX25hbWUgPSBQcmV6aVBsYXllci5iaW5kZWRfbWV0aG9kc1tpXTtcbiAgICAgICAgICAgICAgICBfdGhpc1ttZXRob2RfbmFtZV0gPSBfX2JpbmQoX3RoaXNbbWV0aG9kX25hbWVdLCBfdGhpcyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgICAgICAgICAgdGhpcy52YWx1ZXMgPSB7J3N0YXR1cyc6IFByZXppUGxheWVyLlNUQVRVU19MT0FESU5HfTtcbiAgICAgICAgICAgIHRoaXMudmFsdWVzW1ByZXppUGxheWVyLkNVUlJFTlRfU1RFUF0gPSAwO1xuICAgICAgICAgICAgdGhpcy52YWx1ZXNbUHJlemlQbGF5ZXIuQ1VSUkVOVF9BTklNQVRJT05fU1RFUF0gPSAwO1xuICAgICAgICAgICAgdGhpcy52YWx1ZXNbUHJlemlQbGF5ZXIuQ1VSUkVOVF9PQkpFQ1RdID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tzID0gW107XG4gICAgICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgICAgICB0aGlzLmVtYmVkVG8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZW1iZWRUbykge1xuICAgICAgICAgICAgICAgIHRocm93IFwiVGhlIGVsZW1lbnQgaWQgaXMgbm90IGF2YWlsYWJsZS5cIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuaWZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG4gICAgICAgICAgICBwYXJhbXMgPSBbXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnb2lkJywgdmFsdWU6IG9wdGlvbnMucHJlemlJZCB9LFxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2V4cGxvcmFibGUnLCB2YWx1ZTogb3B0aW9ucy5leHBsb3JhYmxlID8gMSA6IDAgfSxcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdjb250cm9scycsIHZhbHVlOiBvcHRpb25zLmNvbnRyb2xzID8gMSA6IDAgfVxuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIGZvcih2YXIgaT0wOyBpPHBhcmFtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBwYXJhbSA9IHBhcmFtc1tpXTtcbiAgICAgICAgICAgICAgICBwYXJhbVN0cmluZyArPSAoaT09PTAgPyBcIj9cIiA6IFwiJlwiKSArIHBhcmFtLm5hbWUgKyBcIj1cIiArIHBhcmFtLnZhbHVlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMuaWZyYW1lLnNyYyA9IFByZXppUGxheWVyLmRvbWFpbiArIFByZXppUGxheWVyLnBhdGggKyBwYXJhbVN0cmluZztcbiAgICAgICAgICAgIHRoaXMuaWZyYW1lLmZyYW1lQm9yZGVyID0gMDtcbiAgICAgICAgICAgIHRoaXMuaWZyYW1lLnNjcm9sbGluZyA9IFwibm9cIjtcbiAgICAgICAgICAgIHRoaXMuaWZyYW1lLndpZHRoID0gb3B0aW9ucy53aWR0aCB8fCA2NDA7XG4gICAgICAgICAgICB0aGlzLmlmcmFtZS5oZWlnaHQgPSBvcHRpb25zLmhlaWdodCB8fCA0ODA7XG4gICAgICAgICAgICB0aGlzLmVtYmVkVG8uaW5uZXJIVE1MID0gJyc7XG4gICAgICAgICAgICAvLyBKSVRTSTogSU4gQ0FTRSBTT01FVEhJTkcgR09FUyBXUk9ORy5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdGhpcy5lbWJlZFRvLmFwcGVuZENoaWxkKHRoaXMuaWZyYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNBVENIIEVSUk9SXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBKSVRTSTogSW5jcmVhc2UgaW50ZXJ2YWwgZnJvbSAyMDAgdG8gNTAwLCB3aGljaCBmaXhlcyBwcmV6aVxuICAgICAgICAgICAgLy8gY3Jhc2hlcyBmb3IgdXMuXG4gICAgICAgICAgICB0aGlzLmluaXRQb2xsSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIF90aGlzLnNlbmRNZXNzYWdlKHsnYWN0aW9uJzogJ2luaXQnfSk7XG4gICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgUHJlemlQbGF5ZXIucGxheWVyc1tpZF0gPSB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmNoYW5nZXNIYW5kbGVyID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICAgICAgICAgICAgdmFyIGtleSwgdmFsdWUsIGosIGl0ZW07XG4gICAgICAgICAgICBpZiAodGhpcy5pbml0UG9sbEludGVydmFsKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLmluaXRQb2xsSW50ZXJ2YWwpO1xuICAgICAgICAgICAgICAgIHRoaXMuaW5pdFBvbGxJbnRlcnZhbCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChrZXkgaW4gbWVzc2FnZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuZGF0YS5oYXNPd25Qcm9wZXJ0eShrZXkpKXtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBtZXNzYWdlLmRhdGFba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy52YWx1ZXNba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGo9MDsgajx0aGlzLmNhbGxiYWNrcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbSA9IHRoaXMuY2FsbGJhY2tzW2pdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0gJiYgaXRlbS5ldmVudCA9PT0ga2V5ICsgXCJDaGFuZ2VcIil7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5jYWxsYmFjayh7dHlwZTogaXRlbS5ldmVudCwgdmFsdWU6IHZhbHVlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmluaXRQb2xsSW50ZXJ2YWwpIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMuaW5pdFBvbGxJbnRlcnZhbCk7XG4gICAgICAgICAgICAgICAgdGhpcy5pbml0UG9sbEludGVydmFsID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmVtYmVkVG8uaW5uZXJIVE1MID0gJyc7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLnNlbmRNZXNzYWdlID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5kZWJ1ZyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChjb25zb2xlICYmIGNvbnNvbGUubG9nKSBjb25zb2xlLmxvZygnc2VudCcsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWVzc2FnZS52ZXJzaW9uID0gUHJlemlQbGF5ZXIuQVBJX1ZFUlNJT047XG4gICAgICAgICAgICBtZXNzYWdlLmlkID0gdGhpcy5pZDtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlmcmFtZS5jb250ZW50V2luZG93LnBvc3RNZXNzYWdlKEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpLCAnKicpO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5uZXh0U3RlcCA9IC8qIG5leHRTdGVwIGlzIERFUFJFQ0FURUQgKi9cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmZseVRvTmV4dFN0ZXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAnYWN0aW9uJzogJ3ByZXNlbnQnLFxuICAgICAgICAgICAgICAgICdkYXRhJzogWydtb3ZlVG9OZXh0U3RlcCddXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUucHJldmlvdXNTdGVwID0gLyogcHJldmlvdXNTdGVwIGlzIERFUFJFQ0FURUQgKi9cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmZseVRvUHJldmlvdXNTdGVwID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgJ2FjdGlvbic6ICdwcmVzZW50JyxcbiAgICAgICAgICAgICAgICAnZGF0YSc6IFsnbW92ZVRvUHJldlN0ZXAnXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLnRvU3RlcCA9IC8qIHRvU3RlcCBpcyBERVBSRUNBVEVEICovXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5mbHlUb1N0ZXAgPSBmdW5jdGlvbihzdGVwLCBhbmltYXRpb25fc3RlcCkge1xuICAgICAgICAgICAgdmFyIG9iaiA9IHRoaXM7XG4gICAgICAgICAgICAvLyBjaGVjayBhbmltYXRpb25fc3RlcFxuICAgICAgICAgICAgaWYgKGFuaW1hdGlvbl9zdGVwID4gMCAmJlxuICAgICAgICAgICAgICAgIG9iai52YWx1ZXMuYW5pbWF0aW9uQ291bnRPblN0ZXBzICYmXG4gICAgICAgICAgICAgICAgb2JqLnZhbHVlcy5hbmltYXRpb25Db3VudE9uU3RlcHNbc3RlcF0gPD0gYW5pbWF0aW9uX3N0ZXApIHtcbiAgICAgICAgICAgICAgICBhbmltYXRpb25fc3RlcCA9IG9iai52YWx1ZXMuYW5pbWF0aW9uQ291bnRPblN0ZXBzW3N0ZXBdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8ganVtcCB0byBhbmltYXRpb24gc3RlcHMgYnkgY2FsbGluZyBmbHlUb05leHRTdGVwKClcbiAgICAgICAgICAgIGZ1bmN0aW9uIGRvQW5pbWF0aW9uU3RlcHMoKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iai52YWx1ZXMuaXNNb3ZpbmcgPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGRvQW5pbWF0aW9uU3RlcHMsIDEwMCk7IC8vIHdhaXQgdW50aWwgdGhlIGZsaWdodCBlbmRzXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgd2hpbGUgKGFuaW1hdGlvbl9zdGVwLS0gPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG9iai5mbHlUb05leHRTdGVwKCk7IC8vIGRvIHRoZSBhbmltYXRpb24gc3RlcHNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGRvQW5pbWF0aW9uU3RlcHMsIDIwMCk7IC8vIDIwMG1zIGlzIHRoZSBpbnRlcm5hbCBcInJlcG9ydGluZ1wiIHRpbWVcbiAgICAgICAgICAgIC8vIGp1bXAgdG8gdGhlIHN0ZXBcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAnYWN0aW9uJzogJ3ByZXNlbnQnLFxuICAgICAgICAgICAgICAgICdkYXRhJzogWydtb3ZlVG9TdGVwJywgc3RlcF1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS50b09iamVjdCA9IC8qIHRvT2JqZWN0IGlzIERFUFJFQ0FURUQgKi9cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmZseVRvT2JqZWN0ID0gZnVuY3Rpb24ob2JqZWN0SWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAnYWN0aW9uJzogJ3ByZXNlbnQnLFxuICAgICAgICAgICAgICAgICdkYXRhJzogWydtb3ZlVG9PYmplY3QnLCBvYmplY3RJZF1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5wbGF5ID0gZnVuY3Rpb24oZGVmYXVsdERlbGF5KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgJ2FjdGlvbic6ICdwcmVzZW50JyxcbiAgICAgICAgICAgICAgICAnZGF0YSc6IFsnc3RhcnRBdXRvUGxheScsIGRlZmF1bHREZWxheV1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgJ2FjdGlvbic6ICdwcmVzZW50JyxcbiAgICAgICAgICAgICAgICAnZGF0YSc6IFsnc3RvcEF1dG9QbGF5J11cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKGRlZmF1bHREZWxheSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgICdhY3Rpb24nOiAncHJlc2VudCcsXG4gICAgICAgICAgICAgICAgJ2RhdGEnOiBbJ3BhdXNlQXV0b1BsYXknLCBkZWZhdWx0RGVsYXldXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZ2V0Q3VycmVudFN0ZXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlcy5jdXJyZW50U3RlcDtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZ2V0Q3VycmVudEFuaW1hdGlvblN0ZXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlcy5jdXJyZW50QW5pbWF0aW9uU3RlcDtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZ2V0Q3VycmVudE9iamVjdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzLmN1cnJlbnRPYmplY3Q7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmdldFN0YXR1cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzLnN0YXR1cztcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuaXNQbGF5aW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXMuaXNBdXRvUGxheWluZztcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZ2V0U3RlcENvdW50ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXMuc3RlcENvdW50O1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5nZXRBbmltYXRpb25Db3VudE9uU3RlcHMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlcy5hbmltYXRpb25Db3VudE9uU3RlcHM7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmdldFRpdGxlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXMudGl0bGU7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLnNldERpbWVuc2lvbnMgPSBmdW5jdGlvbihkaW1zKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBwYXJhbWV0ZXIgaW4gZGltcykge1xuICAgICAgICAgICAgICAgIHRoaXMuaWZyYW1lW3BhcmFtZXRlcl0gPSBkaW1zW3BhcmFtZXRlcl07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZ2V0RGltZW5zaW9ucyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB3aWR0aDogcGFyc2VJbnQodGhpcy5pZnJhbWUud2lkdGgsIDEwKSxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IHBhcnNlSW50KHRoaXMuaWZyYW1lLmhlaWdodCwgMTApXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUub24gPSBmdW5jdGlvbihldmVudCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tzLnB1c2goe1xuICAgICAgICAgICAgICAgIGV2ZW50OiBldmVudCxcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogY2FsbGJhY2tcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbihldmVudCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBqLCBpdGVtO1xuICAgICAgICAgICAgaWYgKGV2ZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhbGxiYWNrcyA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaiA9IHRoaXMuY2FsbGJhY2tzLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlIChqLS0pIHtcbiAgICAgICAgICAgICAgICBpdGVtID0gdGhpcy5jYWxsYmFja3Nbal07XG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0gJiYgaXRlbS5ldmVudCA9PT0gZXZlbnQgJiYgKGNhbGxiYWNrID09PSB1bmRlZmluZWQgfHwgaXRlbS5jYWxsYmFjayA9PT0gY2FsbGJhY2spKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jYWxsYmFja3Muc3BsaWNlKGosIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAod2luZG93LmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgUHJlemlQbGF5ZXIubWVzc2FnZVJlY2VpdmVkLCBmYWxzZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3aW5kb3cuYXR0YWNoRXZlbnQoJ29ubWVzc2FnZScsIFByZXppUGxheWVyLm1lc3NhZ2VSZWNlaXZlZCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gUHJlemlQbGF5ZXI7XG5cbiAgICB9KSgpO1xuXG4gICAgcmV0dXJuIFByZXppUGxheWVyO1xufSkoKTtcbiIsInZhciBDb250YWN0TGlzdCA9IHJlcXVpcmUoXCIuLy4uL0NvbnRhY3RMaXN0LmpzXCIpO1xudmFyIENoYXQgPSByZXF1aXJlKFwiLi8uLi9jaGF0L2NoYXQuanNcIik7XG5cbnZhciBCb3R0b21Ub29sYmFyID0gKGZ1bmN0aW9uIChteSkge1xuXG4gICAgdmFyIGJ1dHRvbkhhbmRsZXJzID0ge1xuICAgICAgICBcImJvdHRvbXRvb2xiYXJfYnV0dG9uX2NoYXRcIjogZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gQm90dG9tVG9vbGJhci50b2dnbGVDaGF0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIFwiYm90dG9tdG9vbGJhcl9idXR0b25fY29udGFjdFwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gQm90dG9tVG9vbGJhci50b2dnbGVDb250YWN0TGlzdCgpO1xuICAgICAgICB9LFxuICAgICAgICBcImJvdHRvbXRvb2xiYXJfYnV0dG9uX2ZpbG1zdHJpcFwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gQm90dG9tVG9vbGJhci50b2dnbGVGaWxtU3RyaXAoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBteS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBmb3IodmFyIGsgaW4gYnV0dG9uSGFuZGxlcnMpXG4gICAgICAgICAgICAkKFwiI1wiICsgaykuY2xpY2soYnV0dG9uSGFuZGxlcnNba10pO1xuICAgIH1cbiAgICBteS50b2dnbGVDaGF0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChDb250YWN0TGlzdC5pc1Zpc2libGUoKSkge1xuICAgICAgICAgICAgYnV0dG9uQ2xpY2soXCIjY29udGFjdExpc3RCdXR0b25cIiwgXCJhY3RpdmVcIik7XG4gICAgICAgICAgICBDb250YWN0TGlzdC50b2dnbGVDb250YWN0TGlzdCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgYnV0dG9uQ2xpY2soXCIjY2hhdEJvdHRvbUJ1dHRvblwiLCBcImFjdGl2ZVwiKTtcblxuICAgICAgICBDaGF0LnRvZ2dsZUNoYXQoKTtcbiAgICB9O1xuXG4gICAgbXkudG9nZ2xlQ29udGFjdExpc3QgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKENoYXQuaXNWaXNpYmxlKCkpIHtcbiAgICAgICAgICAgIGJ1dHRvbkNsaWNrKFwiI2NoYXRCb3R0b21CdXR0b25cIiwgXCJhY3RpdmVcIik7XG4gICAgICAgICAgICBDaGF0LnRvZ2dsZUNoYXQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGJ1dHRvbkNsaWNrKFwiI2NvbnRhY3RMaXN0QnV0dG9uXCIsIFwiYWN0aXZlXCIpO1xuXG4gICAgICAgIENvbnRhY3RMaXN0LnRvZ2dsZUNvbnRhY3RMaXN0KCk7XG4gICAgfTtcblxuICAgIG15LnRvZ2dsZUZpbG1TdHJpcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZmlsbXN0cmlwID0gJChcIiNyZW1vdGVWaWRlb3NcIik7XG4gICAgICAgIGZpbG1zdHJpcC50b2dnbGVDbGFzcyhcImhpZGRlblwiKTtcbiAgICB9O1xuXG5cbiAgICAkKGRvY3VtZW50KS5iaW5kKFwicmVtb3RldmlkZW8ucmVzaXplZFwiLCBmdW5jdGlvbiAoZXZlbnQsIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgdmFyIGJvdHRvbSA9IChoZWlnaHQgLSAkKCcjYm90dG9tVG9vbGJhcicpLm91dGVySGVpZ2h0KCkpLzIgKyAxODtcblxuICAgICAgICAkKCcjYm90dG9tVG9vbGJhcicpLmNzcyh7Ym90dG9tOiBib3R0b20gKyAncHgnfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbXk7XG59KEJvdHRvbVRvb2xiYXIgfHwge30pKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCb3R0b21Ub29sYmFyO1xuIiwidmFyIEJvdHRvbVRvb2xiYXIgPSByZXF1aXJlKFwiLi9Cb3R0b21Ub29sYmFyXCIpO1xudmFyIFByZXppID0gcmVxdWlyZShcIi4vLi4vcHJlemkvcHJlemlcIik7XG52YXIgRXRoZXJwYWQgPSByZXF1aXJlKFwiLi8uLi9ldGhlcnBhZC9FdGhlcnBhZFwiKTtcblxudmFyIFRvb2xiYXIgPSAoZnVuY3Rpb24gKG15KSB7XG5cbiAgICB2YXIgdG9vbGJhclRpbWVvdXQgPSBudWxsO1xuXG4gICAgdmFyIHJvb21VcmwgPSBudWxsO1xuXG4gICAgdmFyIGJ1dHRvbkhhbmRsZXJzID0ge1xuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX211dGVcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRvZ2dsZUF1ZGlvKCk7XG4gICAgICAgIH0sXG4gICAgICAgIFwidG9vbGJhcl9idXR0b25fY2FtZXJhXCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGJ1dHRvbkNsaWNrKFwiI3ZpZGVvXCIsIFwiaWNvbi1jYW1lcmEgaWNvbi1jYW1lcmEtZGlzYWJsZWRcIik7XG4gICAgICAgICAgICByZXR1cm4gdG9nZ2xlVmlkZW8oKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9yZWNvcmRcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRvZ2dsZVJlY29yZGluZygpO1xuICAgICAgICB9XG4gICAgICAgICxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9zZWN1cml0eVwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gVG9vbGJhci5vcGVuTG9ja0RpYWxvZygpO1xuICAgICAgICB9LFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX2xpbmtcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIFRvb2xiYXIub3BlbkxpbmtEaWFsb2coKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9jaGF0XCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBCb3R0b21Ub29sYmFyLnRvZ2dsZUNoYXQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9wcmV6aVwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gUHJlemkub3BlblByZXppRGlhbG9nKCk7XG4gICAgICAgIH0sXG4gICAgICAgIFwidG9vbGJhcl9idXR0b25fZXRoZXJwYWRcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIEV0aGVycGFkLnRvZ2dsZUV0aGVycGFkKDApO1xuICAgICAgICB9LFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX2Rlc2t0b3BzaGFyaW5nXCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0b2dnbGVTY3JlZW5TaGFyaW5nKCk7XG4gICAgICAgIH0sXG4gICAgICAgIFwidG9vbGJhcl9idXR0b25fZnVsbFNjcmVlblwiOiBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGJ1dHRvbkNsaWNrKFwiI2Z1bGxTY3JlZW5cIiwgXCJpY29uLWZ1bGwtc2NyZWVuIGljb24tZXhpdC1mdWxsLXNjcmVlblwiKTtcbiAgICAgICAgICAgIHJldHVybiBUb29sYmFyLnRvZ2dsZUZ1bGxTY3JlZW4oKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9zaXBcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxTaXBCdXR0b25DbGlja2VkKCk7XG4gICAgICAgIH0sXG4gICAgICAgIFwidG9vbGJhcl9idXR0b25faGFuZ3VwXCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBoYW5ndXAoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG15LnNoYXJlZEtleSA9ICcnO1xuXG4gICAgZnVuY3Rpb24gc2V0UmVjb3JkaW5nVG9rZW4odG9rZW4pIHtcbiAgICAgICAgcmVjb3JkaW5nVG9rZW4gPSB0b2tlbjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjYWxsU2lwQnV0dG9uQ2xpY2tlZCgpXG4gICAge1xuICAgICAgICBtZXNzYWdlSGFuZGxlci5vcGVuVHdvQnV0dG9uRGlhbG9nKG51bGwsXG4gICAgICAgICAgICAgICAgJzxoMj5FbnRlciBTSVAgbnVtYmVyPC9oMj4nICtcbiAgICAgICAgICAgICAgICAnPGlucHV0IGlkPVwic2lwTnVtYmVyXCIgdHlwZT1cInRleHRcIicgK1xuICAgICAgICAgICAgICAgICcgdmFsdWU9XCInICsgY29uZmlnLmRlZmF1bHRTaXBOdW1iZXIgKyAnXCIgYXV0b2ZvY3VzPicsXG4gICAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICAgIFwiRGlhbFwiLFxuICAgICAgICAgICAgZnVuY3Rpb24gKGUsIHYsIG0sIGYpIHtcbiAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbnVtYmVySW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2lwTnVtYmVyJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChudW1iZXJJbnB1dC52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGlvbi5yYXlvLmRpYWwoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVySW5wdXQudmFsdWUsICdmcm9tbnVtYmVyJywgVUlBY3RpdmF0b3IuZ2V0VUlTZXJ2aWNlKCkuZ2V0Um9vbU5hbWUoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NpcE51bWJlcicpLmZvY3VzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfVxuXG5cbiAgICAvLyBTdGFydHMgb3Igc3RvcHMgdGhlIHJlY29yZGluZyBmb3IgdGhlIGNvbmZlcmVuY2UuXG4gICAgZnVuY3Rpb24gdG9nZ2xlUmVjb3JkaW5nKCkge1xuICAgICAgICBpZiAoZm9jdXMgPT09IG51bGwgfHwgZm9jdXMuY29uZmlkID09PSBudWxsKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnbm9uLWZvY3VzLCBvciBjb25mZXJlbmNlIG5vdCB5ZXQgb3JnYW5pemVkOiBub3QgZW5hYmxpbmcgcmVjb3JkaW5nJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXJlY29yZGluZ1Rva2VuKVxuICAgICAgICB7XG4gICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5vcGVuVHdvQnV0dG9uRGlhbG9nKG51bGwsXG4gICAgICAgICAgICAgICAgICAgICc8aDI+RW50ZXIgcmVjb3JkaW5nIHRva2VuPC9oMj4nICtcbiAgICAgICAgICAgICAgICAgICAgJzxpbnB1dCBpZD1cInJlY29yZGluZ1Rva2VuXCIgdHlwZT1cInRleHRcIiBwbGFjZWhvbGRlcj1cInRva2VuXCIgYXV0b2ZvY3VzPicsXG4gICAgICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICAgICAgXCJTYXZlXCIsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKGUsIHYsIG0sIGYpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0b2tlbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZWNvcmRpbmdUb2tlbicpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodG9rZW4udmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRSZWNvcmRpbmdUb2tlbihVdGlsLmVzY2FwZUh0bWwodG9rZW4udmFsdWUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVSZWNvcmRpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZWNvcmRpbmdUb2tlbicpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG9sZFN0YXRlID0gZm9jdXMucmVjb3JkaW5nRW5hYmxlZDtcbiAgICAgICAgVG9vbGJhci50b2dnbGVSZWNvcmRpbmdCdXR0b25TdGF0ZSgpO1xuICAgICAgICBmb2N1cy5zZXRSZWNvcmRpbmcoIW9sZFN0YXRlLFxuICAgICAgICAgICAgcmVjb3JkaW5nVG9rZW4sXG4gICAgICAgICAgICBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIk5ldyByZWNvcmRpbmcgc3RhdGU6IFwiLCBzdGF0ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlID09IG9sZFN0YXRlKSAvL2ZhaWxlZCB0byBjaGFuZ2UsIHJlc2V0IHRoZSB0b2tlbiBiZWNhdXNlIGl0IG1pZ2h0IGhhdmUgYmVlbiB3cm9uZ1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgVG9vbGJhci50b2dnbGVSZWNvcmRpbmdCdXR0b25TdGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICBzZXRSZWNvcmRpbmdUb2tlbihudWxsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG5cblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhhbmd1cCgpIHtcbiAgICAgICAgZGlzcG9zZUNvbmZlcmVuY2UoKTtcbiAgICAgICAgY29ubmVjdGlvbi5lbXVjLmRvTGVhdmUoKTtcbiAgICAgICAgdmFyIGJ1dHRvbnMgPSB7fTtcbiAgICAgICAgaWYoY29uZmlnLmVuYWJsZVdlbGNvbWVQYWdlKVxuICAgICAgICB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLndlbGNvbWVQYWdlRGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgPSBcIi9cIjtcbiAgICAgICAgICAgIH0sIDEwMDAwKTtcblxuICAgICAgICB9XG5cbiAgICAgICAgJC5wcm9tcHQoXCJTZXNzaW9uIFRlcm1pbmF0ZWRcIixcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0aXRsZTogXCJZb3UgaHVuZyB1cCB0aGUgY2FsbFwiLFxuICAgICAgICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgICAgICAgYnV0dG9uczoge1xuICAgICAgICAgICAgICAgICAgICBcIkpvaW4gYWdhaW5cIjogdHJ1ZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY2xvc2VUZXh0OiAnJyxcbiAgICAgICAgICAgICAgICBzdWJtaXQ6IGZ1bmN0aW9uKGV2ZW50LCB2YWx1ZSwgbWVzc2FnZSwgZm9ybVZhbHMpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIHNoYXJlZCBrZXkuXG4gICAgICovXG4gICAgbXkuc2V0U2hhcmVkS2V5ID0gZnVuY3Rpb24oc0tleSkge1xuICAgICAgICBUb29sYmFyLnNoYXJlZEtleSA9IHNLZXk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTG9ja3MgLyB1bmxvY2tzIHRoZSByb29tLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvY2tSb29tKGxvY2spIHtcbiAgICAgICAgaWYgKGxvY2spXG4gICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMubG9ja1Jvb20oVG9vbGJhci5zaGFyZWRLZXkpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMubG9ja1Jvb20oJycpO1xuXG4gICAgICAgIFRvb2xiYXIudXBkYXRlTG9ja0J1dHRvbigpO1xuICAgIH1cblxuICAgIC8vc2V0cyBvbmNsaWNrIGhhbmRsZXJzXG4gICAgbXkuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZm9yKHZhciBrIGluIGJ1dHRvbkhhbmRsZXJzKVxuICAgICAgICAgICAgJChcIiNcIiArIGspLmNsaWNrKGJ1dHRvbkhhbmRsZXJzW2tdKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBPcGVucyB0aGUgbG9jayByb29tIGRpYWxvZy5cbiAgICAgKi9cbiAgICBteS5vcGVuTG9ja0RpYWxvZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gT25seSB0aGUgZm9jdXMgaXMgYWJsZSB0byBzZXQgYSBzaGFyZWQga2V5LlxuICAgICAgICBpZiAoZm9jdXMgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChUb29sYmFyLnNoYXJlZEtleSkge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5NZXNzYWdlRGlhbG9nKG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBcIlRoaXMgY29udmVyc2F0aW9uIGlzIGN1cnJlbnRseSBwcm90ZWN0ZWQgYnlcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICBcIiBhIHNoYXJlZCBzZWNyZXQga2V5LlwiLFxuICAgICAgICAgICAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgXCJTZWNyZXQga2V5XCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5vcGVuTWVzc2FnZURpYWxvZyhudWxsLFxuICAgICAgICAgICAgICAgICAgICBcIlRoaXMgY29udmVyc2F0aW9uIGlzbid0IGN1cnJlbnRseSBwcm90ZWN0ZWQgYnlcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICBcIiBhIHNlY3JldCBrZXkuIE9ubHkgdGhlIG93bmVyIG9mIHRoZSBjb25mZXJlbmNlXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgXCIgY291bGQgc2V0IGEgc2hhcmVkIGtleS5cIixcbiAgICAgICAgICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIFwiU2VjcmV0IGtleVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChUb29sYmFyLnNoYXJlZEtleSkge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5Ud29CdXR0b25EaWFsb2cobnVsbCxcbiAgICAgICAgICAgICAgICAgICAgXCJBcmUgeW91IHN1cmUgeW91IHdvdWxkIGxpa2UgdG8gcmVtb3ZlIHlvdXIgc2VjcmV0IGtleT9cIixcbiAgICAgICAgICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIFwiUmVtb3ZlXCIsXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlLCB2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFRvb2xiYXIuc2V0U2hhcmVkS2V5KCcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NrUm9vbShmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5vcGVuVHdvQnV0dG9uRGlhbG9nKG51bGwsXG4gICAgICAgICAgICAgICAgICAgICc8aDI+U2V0IGEgc2VjcmV0IGtleSB0byBsb2NrIHlvdXIgcm9vbTwvaDI+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnPGlucHV0IGlkPVwibG9ja0tleVwiIHR5cGU9XCJ0ZXh0XCInICtcbiAgICAgICAgICAgICAgICAgICAgICAgICdwbGFjZWhvbGRlcj1cInlvdXIgc2hhcmVkIGtleVwiIGF1dG9mb2N1cz4nLFxuICAgICAgICAgICAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgXCJTYXZlXCIsXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlLCB2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsb2NrS2V5ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2tLZXknKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsb2NrS2V5LnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFRvb2xiYXIuc2V0U2hhcmVkS2V5KFV0aWwuZXNjYXBlSHRtbChsb2NrS2V5LnZhbHVlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2tSb29tKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2tLZXknKS5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSByb29tIGludml0ZSB1cmwuXG4gICAgICovXG4gICAgbXkudXBkYXRlUm9vbVVybCA9IGZ1bmN0aW9uKG5ld1Jvb21VcmwpIHtcbiAgICAgICAgcm9vbVVybCA9IG5ld1Jvb21Vcmw7XG5cbiAgICAgICAgLy8gSWYgdGhlIGludml0ZSBkaWFsb2cgaGFzIGJlZW4gYWxyZWFkeSBvcGVuZWQgd2UgdXBkYXRlIHRoZSBpbmZvcm1hdGlvbi5cbiAgICAgICAgdmFyIGludml0ZUxpbmsgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaW52aXRlTGlua1JlZicpO1xuICAgICAgICBpZiAoaW52aXRlTGluaykge1xuICAgICAgICAgICAgaW52aXRlTGluay52YWx1ZSA9IHJvb21Vcmw7XG4gICAgICAgICAgICBpbnZpdGVMaW5rLnNlbGVjdCgpO1xuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pxaV9zdGF0ZTBfYnV0dG9uSW52aXRlJykuZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE9wZW5zIHRoZSBpbnZpdGUgbGluayBkaWFsb2cuXG4gICAgICovXG4gICAgbXkub3BlbkxpbmtEaWFsb2cgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpbnZpdGVMaW5rO1xuICAgICAgICBpZiAocm9vbVVybCA9PSBudWxsKSB7XG4gICAgICAgICAgICBpbnZpdGVMaW5rID0gXCJZb3VyIGNvbmZlcmVuY2UgaXMgY3VycmVudGx5IGJlaW5nIGNyZWF0ZWQuLi5cIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGludml0ZUxpbmsgPSBlbmNvZGVVUkkocm9vbVVybCk7XG4gICAgICAgIH1cbiAgICAgICAgbWVzc2FnZUhhbmRsZXIub3BlblR3b0J1dHRvbkRpYWxvZyhcbiAgICAgICAgICAgIFwiU2hhcmUgdGhpcyBsaW5rIHdpdGggZXZlcnlvbmUgeW91IHdhbnQgdG8gaW52aXRlXCIsXG4gICAgICAgICAgICAnPGlucHV0IGlkPVwiaW52aXRlTGlua1JlZlwiIHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCInICtcbiAgICAgICAgICAgICAgICBpbnZpdGVMaW5rICsgJ1wiIG9uY2xpY2s9XCJ0aGlzLnNlbGVjdCgpO1wiIHJlYWRvbmx5PicsXG4gICAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICAgIFwiSW52aXRlXCIsXG4gICAgICAgICAgICBmdW5jdGlvbiAoZSwgdikge1xuICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyb29tVXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnZpdGVQYXJ0aWNpcGFudHMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJvb21VcmwpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ludml0ZUxpbmtSZWYnKS5zZWxlY3QoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanFpX3N0YXRlMF9idXR0b25JbnZpdGUnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEludml0ZSBwYXJ0aWNpcGFudHMgdG8gY29uZmVyZW5jZS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpbnZpdGVQYXJ0aWNpcGFudHMoKSB7XG4gICAgICAgIGlmIChyb29tVXJsID09IG51bGwpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgdmFyIHNoYXJlZEtleVRleHQgPSBcIlwiO1xuICAgICAgICBpZiAoVG9vbGJhci5zaGFyZWRLZXkgJiYgVG9vbGJhci5zaGFyZWRLZXkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgc2hhcmVkS2V5VGV4dCA9XG4gICAgICAgICAgICAgICAgXCJUaGlzIGNvbmZlcmVuY2UgaXMgcGFzc3dvcmQgcHJvdGVjdGVkLiBQbGVhc2UgdXNlIHRoZSBcIiArXG4gICAgICAgICAgICAgICAgXCJmb2xsb3dpbmcgcGluIHdoZW4gam9pbmluZzolMEQlMEElMEQlMEFcIiArXG4gICAgICAgICAgICAgICAgICAgIFRvb2xiYXIuc2hhcmVkS2V5ICsgXCIlMEQlMEElMEQlMEFcIjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjb25mZXJlbmNlTmFtZSA9IHJvb21Vcmwuc3Vic3RyaW5nKHJvb21VcmwubGFzdEluZGV4T2YoJy8nKSArIDEpO1xuICAgICAgICB2YXIgc3ViamVjdCA9IFwiSW52aXRhdGlvbiB0byBhIEppdHNpIE1lZXQgKFwiICsgY29uZmVyZW5jZU5hbWUgKyBcIilcIjtcbiAgICAgICAgdmFyIGJvZHkgPSBcIkhleSB0aGVyZSwgSSUyN2QgbGlrZSB0byBpbnZpdGUgeW91IHRvIGEgSml0c2kgTWVldFwiICtcbiAgICAgICAgICAgICAgICAgICAgXCIgY29uZmVyZW5jZSBJJTI3dmUganVzdCBzZXQgdXAuJTBEJTBBJTBEJTBBXCIgK1xuICAgICAgICAgICAgICAgICAgICBcIlBsZWFzZSBjbGljayBvbiB0aGUgZm9sbG93aW5nIGxpbmsgaW4gb3JkZXJcIiArXG4gICAgICAgICAgICAgICAgICAgIFwiIHRvIGpvaW4gdGhlIGNvbmZlcmVuY2UuJTBEJTBBJTBEJTBBXCIgK1xuICAgICAgICAgICAgICAgICAgICByb29tVXJsICtcbiAgICAgICAgICAgICAgICAgICAgXCIlMEQlMEElMEQlMEFcIiArXG4gICAgICAgICAgICAgICAgICAgIHNoYXJlZEtleVRleHQgK1xuICAgICAgICAgICAgICAgICAgICBcIk5vdGUgdGhhdCBKaXRzaSBNZWV0IGlzIGN1cnJlbnRseSBvbmx5IHN1cHBvcnRlZCBieSBDaHJvbWl1bSxcIiArXG4gICAgICAgICAgICAgICAgICAgIFwiIEdvb2dsZSBDaHJvbWUgYW5kIE9wZXJhLCBzbyB5b3UgbmVlZFwiICtcbiAgICAgICAgICAgICAgICAgICAgXCIgdG8gYmUgdXNpbmcgb25lIG9mIHRoZXNlIGJyb3dzZXJzLiUwRCUwQSUwRCUwQVwiICtcbiAgICAgICAgICAgICAgICAgICAgXCJUYWxrIHRvIHlvdSBpbiBhIHNlYyFcIjtcblxuICAgICAgICBpZiAod2luZG93LmxvY2FsU3RvcmFnZS5kaXNwbGF5bmFtZSkge1xuICAgICAgICAgICAgYm9keSArPSBcIiUwRCUwQSUwRCUwQVwiICsgd2luZG93LmxvY2FsU3RvcmFnZS5kaXNwbGF5bmFtZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdpbmRvdy5vcGVuKFwibWFpbHRvOj9zdWJqZWN0PVwiICsgc3ViamVjdCArIFwiJmJvZHk9XCIgKyBib2R5LCAnX2JsYW5rJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogT3BlbnMgdGhlIHNldHRpbmdzIGRpYWxvZy5cbiAgICAgKi9cbiAgICBteS5vcGVuU2V0dGluZ3NEaWFsb2cgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5Ud29CdXR0b25EaWFsb2coXG4gICAgICAgICAgICAnPGgyPkNvbmZpZ3VyZSB5b3VyIGNvbmZlcmVuY2U8L2gyPicgK1xuICAgICAgICAgICAgICAgICc8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgaWQ9XCJpbml0TXV0ZWRcIj4nICtcbiAgICAgICAgICAgICAgICAnUGFydGljaXBhbnRzIGpvaW4gbXV0ZWQ8YnIvPicgK1xuICAgICAgICAgICAgICAgICc8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgaWQ9XCJyZXF1aXJlTmlja25hbWVzXCI+JyArXG4gICAgICAgICAgICAgICAgJ1JlcXVpcmUgbmlja25hbWVzPGJyLz48YnIvPicgK1xuICAgICAgICAgICAgICAgICdTZXQgYSBzZWNyZXQga2V5IHRvIGxvY2sgeW91ciByb29tOicgK1xuICAgICAgICAgICAgICAgICc8aW5wdXQgaWQ9XCJsb2NrS2V5XCIgdHlwZT1cInRleHRcIiBwbGFjZWhvbGRlcj1cInlvdXIgc2hhcmVkIGtleVwiJyArXG4gICAgICAgICAgICAgICAgJ2F1dG9mb2N1cz4nLFxuICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgXCJTYXZlXCIsXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2tLZXknKS5mb2N1cygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChlLCB2KSB7XG4gICAgICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQoJyNpbml0TXV0ZWQnKS5pcyhcIjpjaGVja2VkXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpdCBpcyBjaGVja2VkXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoJCgnI3JlcXVpcmVOaWNrbmFtZXMnKS5pcyhcIjpjaGVja2VkXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpdCBpcyBjaGVja2VkXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxvY2tLZXkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9ja0tleScpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChsb2NrS2V5LnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRTaGFyZWRLZXkobG9ja0tleS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NrUm9vbSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB0aGUgYXBwbGljYXRpb24gaW4gYW5kIG91dCBvZiBmdWxsIHNjcmVlbiBtb2RlXG4gICAgICogKGEuay5hLiBwcmVzZW50YXRpb24gbW9kZSBpbiBDaHJvbWUpLlxuICAgICAqL1xuICAgIG15LnRvZ2dsZUZ1bGxTY3JlZW4gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGZzRWxlbWVudCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcblxuICAgICAgICBpZiAoIWRvY3VtZW50Lm1vekZ1bGxTY3JlZW4gJiYgIWRvY3VtZW50LndlYmtpdElzRnVsbFNjcmVlbikge1xuICAgICAgICAgICAgLy9FbnRlciBGdWxsIFNjcmVlblxuICAgICAgICAgICAgaWYgKGZzRWxlbWVudC5tb3pSZXF1ZXN0RnVsbFNjcmVlbikge1xuICAgICAgICAgICAgICAgIGZzRWxlbWVudC5tb3pSZXF1ZXN0RnVsbFNjcmVlbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZnNFbGVtZW50LndlYmtpdFJlcXVlc3RGdWxsU2NyZWVuKEVsZW1lbnQuQUxMT1dfS0VZQk9BUkRfSU5QVVQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy9FeGl0IEZ1bGwgU2NyZWVuXG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQubW96Q2FuY2VsRnVsbFNjcmVlbikge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50Lm1vekNhbmNlbEZ1bGxTY3JlZW4oKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQud2Via2l0Q2FuY2VsRnVsbFNjcmVlbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBsb2NrIGJ1dHRvbiBzdGF0ZS5cbiAgICAgKi9cbiAgICBteS51cGRhdGVMb2NrQnV0dG9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGJ1dHRvbkNsaWNrKFwiI2xvY2tJY29uXCIsIFwiaWNvbi1zZWN1cml0eSBpY29uLXNlY3VyaXR5LWxvY2tlZFwiKTtcbiAgICB9O1xuXG4gICAgLy8gU2hvd3Mgb3IgaGlkZXMgdGhlICdyZWNvcmRpbmcnIGJ1dHRvbi5cbiAgICBteS5zaG93UmVjb3JkaW5nQnV0dG9uID0gZnVuY3Rpb24gKHNob3cpIHtcbiAgICAgICAgaWYgKCFjb25maWcuZW5hYmxlUmVjb3JkaW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc2hvdykge1xuICAgICAgICAgICAgJCgnI3JlY29yZGluZycpLmNzcyh7ZGlzcGxheTogXCJpbmxpbmVcIn0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgJCgnI3JlY29yZGluZycpLmNzcyh7ZGlzcGxheTogXCJub25lXCJ9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBUb2dnbGUgdGhlIHN0YXRlIG9mIHRoZSByZWNvcmRpbmcgYnV0dG9uXG4gICAgbXkudG9nZ2xlUmVjb3JkaW5nQnV0dG9uU3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJCgnI3JlY29yZEJ1dHRvbicpLnRvZ2dsZUNsYXNzKCdhY3RpdmUnKTtcbiAgICB9O1xuXG4gICAgLy8gU2hvd3Mgb3IgaGlkZXMgU0lQIGNhbGxzIGJ1dHRvblxuICAgIG15LnNob3dTaXBDYWxsQnV0dG9uID0gZnVuY3Rpb24oc2hvdyl7XG4gICAgICAgIGlmIChjb25maWcuaG9zdHMuY2FsbF9jb250cm9sICYmIHNob3cpIHtcbiAgICAgICAgICAgICQoJyNzaXBDYWxsQnV0dG9uJykuY3NzKHtkaXNwbGF5OiBcImlubGluZVwifSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjc2lwQ2FsbEJ1dHRvbicpLmNzcyh7ZGlzcGxheTogXCJub25lXCJ9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gbXk7XG59KFRvb2xiYXIgfHwge30pKTtcblxubW9kdWxlLmV4cG9ydHMgPSBUb29sYmFyO1xuIiwidmFyIFRvb2xiYXIgPSByZXF1aXJlKFwiLi90b29sYmFyXCIpO1xuXG52YXIgVG9vbGJhclRvZ2dsZXIgPSAoZnVuY3Rpb24obXkpIHtcbiAgICB2YXIgdG9vbGJhclRpbWVvdXRPYmplY3QsXG4gICAgICAgIHRvb2xiYXJUaW1lb3V0ID0gaW50ZXJmYWNlQ29uZmlnLklOSVRJQUxfVE9PTEJBUl9USU1FT1VUO1xuXG4gICAgLyoqXG4gICAgICogU2hvd3MgdGhlIG1haW4gdG9vbGJhci5cbiAgICAgKi9cbiAgICBteS5zaG93VG9vbGJhciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgaGVhZGVyID0gJChcIiNoZWFkZXJcIiksXG4gICAgICAgICAgICBib3R0b21Ub29sYmFyID0gJChcIiNib3R0b21Ub29sYmFyXCIpO1xuICAgICAgICBpZiAoIWhlYWRlci5pcygnOnZpc2libGUnKSB8fCAhYm90dG9tVG9vbGJhci5pcyhcIjp2aXNpYmxlXCIpKSB7XG4gICAgICAgICAgICBoZWFkZXIuc2hvdyhcInNsaWRlXCIsIHsgZGlyZWN0aW9uOiBcInVwXCIsIGR1cmF0aW9uOiAzMDB9KTtcbiAgICAgICAgICAgICQoJyNzdWJqZWN0JykuYW5pbWF0ZSh7dG9wOiBcIis9NDBcIn0sIDMwMCk7XG4gICAgICAgICAgICBpZighYm90dG9tVG9vbGJhci5pcyhcIjp2aXNpYmxlXCIpKSB7XG4gICAgICAgICAgICAgICAgYm90dG9tVG9vbGJhci5zaG93KFwic2xpZGVcIiwge2RpcmVjdGlvbjogXCJyaWdodFwiLGR1cmF0aW9uOiAzMDB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRvb2xiYXJUaW1lb3V0T2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRvb2xiYXJUaW1lb3V0T2JqZWN0KTtcbiAgICAgICAgICAgICAgICB0b29sYmFyVGltZW91dE9iamVjdCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0b29sYmFyVGltZW91dE9iamVjdCA9IHNldFRpbWVvdXQoaGlkZVRvb2xiYXIsIHRvb2xiYXJUaW1lb3V0KTtcbiAgICAgICAgICAgIHRvb2xiYXJUaW1lb3V0ID0gaW50ZXJmYWNlQ29uZmlnLlRPT0xCQVJfVElNRU9VVDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmb2N1cyAhPSBudWxsKVxuICAgICAgICB7XG4vLyAgICAgICAgICAgIFRPRE86IEVuYWJsZSBzZXR0aW5ncyBmdW5jdGlvbmFsaXR5LiBOZWVkIHRvIHVuY29tbWVudCB0aGUgc2V0dGluZ3MgYnV0dG9uIGluIGluZGV4Lmh0bWwuXG4vLyAgICAgICAgICAgICQoJyNzZXR0aW5nc0J1dHRvbicpLmNzcyh7dmlzaWJpbGl0eTpcInZpc2libGVcIn0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2hvdy9oaWRlIGRlc2t0b3Agc2hhcmluZyBidXR0b25cbiAgICAgICAgc2hvd0Rlc2t0b3BTaGFyaW5nQnV0dG9uKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEhpZGVzIHRoZSB0b29sYmFyLlxuICAgICAqL1xuICAgIHZhciBoaWRlVG9vbGJhciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGhlYWRlciA9ICQoXCIjaGVhZGVyXCIpLFxuICAgICAgICAgICAgYm90dG9tVG9vbGJhciA9ICQoXCIjYm90dG9tVG9vbGJhclwiKTtcbiAgICAgICAgdmFyIGlzVG9vbGJhckhvdmVyID0gZmFsc2U7XG4gICAgICAgIGhlYWRlci5maW5kKCcqJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgaWQgPSAkKHRoaXMpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBpZiAoJChcIiNcIiArIGlkICsgXCI6aG92ZXJcIikubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGlzVG9vbGJhckhvdmVyID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmKCQoXCIjYm90dG9tVG9vbGJhcjpob3ZlclwiKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaXNUb29sYmFySG92ZXIgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY2xlYXJUaW1lb3V0KHRvb2xiYXJUaW1lb3V0T2JqZWN0KTtcbiAgICAgICAgdG9vbGJhclRpbWVvdXRPYmplY3QgPSBudWxsO1xuXG4gICAgICAgIGlmICghaXNUb29sYmFySG92ZXIpIHtcbiAgICAgICAgICAgIGhlYWRlci5oaWRlKFwic2xpZGVcIiwgeyBkaXJlY3Rpb246IFwidXBcIiwgZHVyYXRpb246IDMwMH0pO1xuICAgICAgICAgICAgJCgnI3N1YmplY3QnKS5hbmltYXRlKHt0b3A6IFwiLT00MFwifSwgMzAwKTtcbiAgICAgICAgICAgIGlmKCQoXCIjcmVtb3RlVmlkZW9zXCIpLmhhc0NsYXNzKFwiaGlkZGVuXCIpKSB7XG4gICAgICAgICAgICAgICAgYm90dG9tVG9vbGJhci5oaWRlKFwic2xpZGVcIiwge2RpcmVjdGlvbjogXCJyaWdodFwiLCBkdXJhdGlvbjogMzAwfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0b29sYmFyVGltZW91dE9iamVjdCA9IHNldFRpbWVvdXQoaGlkZVRvb2xiYXIsIHRvb2xiYXJUaW1lb3V0KTtcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIC8qKlxuICAgICAqIERvY2tzL3VuZG9ja3MgdGhlIHRvb2xiYXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaXNEb2NrIGluZGljYXRlcyB3aGF0IG9wZXJhdGlvbiB0byBwZXJmb3JtXG4gICAgICovXG4gICAgbXkuZG9ja1Rvb2xiYXIgPSBmdW5jdGlvbihpc0RvY2spIHtcbiAgICAgICAgaWYgKGlzRG9jaykge1xuICAgICAgICAgICAgLy8gRmlyc3QgbWFrZSBzdXJlIHRoZSB0b29sYmFyIGlzIHNob3duLlxuICAgICAgICAgICAgaWYgKCEkKCcjaGVhZGVyJykuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICAgICBUb29sYmFyVG9nZ2xlci5zaG93VG9vbGJhcigpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUaGVuIGNsZWFyIHRoZSB0aW1lIG91dCwgdG8gZG9jayB0aGUgdG9vbGJhci5cbiAgICAgICAgICAgIGlmICh0b29sYmFyVGltZW91dE9iamVjdCkge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0b29sYmFyVGltZW91dE9iamVjdCk7XG4gICAgICAgICAgICAgICAgdG9vbGJhclRpbWVvdXRPYmplY3QgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKCEkKCcjaGVhZGVyJykuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICAgICBUb29sYmFyVG9nZ2xlci5zaG93VG9vbGJhcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdG9vbGJhclRpbWVvdXRPYmplY3QgPSBzZXRUaW1lb3V0KGhpZGVUb29sYmFyLCB0b29sYmFyVGltZW91dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICByZXR1cm4gbXk7XG59KFRvb2xiYXJUb2dnbGVyIHx8IHt9KSk7XG5cbm1vZHVsZS5leHBvcnRzID0gVG9vbGJhclRvZ2dsZXI7XG4iLCJ2YXIgUlRDQnJvd3NlclR5cGUgPSB7XG4gICAgUlRDX0JST1dTRVJfQ0hST01FOiBcInJ0Y19icm93c2VyLmNocm9tZVwiLFxuXG4gICAgUlRDX0JST1dTRVJfRklSRUZPWDogXCJydGNfYnJvd3Nlci5maXJlZm94XCJcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUlRDQnJvd3NlclR5cGU7IiwidmFyIFN0cmVhbUV2ZW50VHlwZXMgPSB7XG4gICAgRVZFTlRfVFlQRV9MT0NBTF9DUkVBVEVEOiBcInN0cmVhbS5sb2NhbF9jcmVhdGVkXCIsXG5cbiAgICBFVkVOVF9UWVBFX0xPQ0FMX0VOREVEOiBcInN0cmVhbS5sb2NhbF9lbmRlZFwiLFxuXG4gICAgRVZFTlRfVFlQRV9SRU1PVEVfQ1JFQVRFRDogXCJzdHJlYW0ucmVtb3RlX2NyZWF0ZWRcIixcblxuICAgIEVWRU5UX1RZUEVfUkVNT1RFX0VOREVEOiBcInN0cmVhbS5yZW1vdGVfZW5kZWRcIlxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdHJlYW1FdmVudFR5cGVzOyIsInZhciBSb29tTmFtZUdlbmVyYXRvciA9IGZ1bmN0aW9uKG15KSB7XG5cblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgbmV3IFJvb21OYW1lR2VuZXJhdG9yIG9iamVjdC5cbiAgICAgKiBAY29uc3RydWN0b3IgY29uc3RydWN0cyBuZXcgUm9vbU5hbWVHZW5lcmF0b3Igb2JqZWN0LlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIFJvb21OYW1lR2VuZXJhdG9yUHJvdG8oKVxuICAgIHtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgc2VwYXJhdG9yIHRoZSB3b3JkcyBpbiB0aGUgcm9vbSBuYW1lXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICB2YXIgREVGQVVMVF9TRVBBUkFUT1IgPSBcIi1cIjtcblxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgbnVtYmVyIG9mIHdvcmRzIGluIHRoZSByb29tIG5hbWUuXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICB2YXIgTlVNQkVSX09GX1dPUkRTID0gMztcblxuXG4gICAgLyoqXG4gICAgICogVGhlIGxpc3Qgd2l0aCB3b3Jkcy5cbiAgICAgKiBAdHlwZSB7c3RyaW5nW119XG4gICAgICovXG4gICAgdmFyIHdvcmRzID0gW1xuICAgICAgICBcImRlZmluaXRlXCIsIFwiaW5kZWZpbml0ZVwiLCBcImFydGljbGVzXCIsIFwibmFtZVwiLCBcInByZXBvc2l0aW9uXCIsIFwiaGVscFwiLCBcInZlcnlcIiwgXCJ0b1wiLCBcInRocm91Z2hcIiwgXCJhbmRcIiwgXCJqdXN0XCIsXG4gICAgICAgIFwiYVwiLCBcImZvcm1cIiwgXCJpblwiLCBcInNlbnRlbmNlXCIsIFwiaXNcIiwgXCJncmVhdFwiLCBcIml0XCIsIFwidGhpbmtcIiwgXCJ5b3VcIiwgXCJzYXlcIiwgXCJ0aGF0XCIsIFwiaGVscFwiLCBcImhlXCIsIFwibG93XCIsIFwid2FzXCIsXG4gICAgICAgIFwibGluZVwiLCBcImZvclwiLCBcImRpZmZlclwiLCBcIm9uXCIsIFwidHVyblwiLCBcImFyZVwiLCBcImNhdXNlXCIsIFwid2l0aFwiLCBcIm11Y2hcIiwgXCJhc1wiLCBcIm1lYW5cIiwgXCJiZWZvcmVcIiwgXCJoaXNcIiwgXCJtb3ZlXCIsXG4gICAgICAgIFwidGhleVwiLCBcInJpZ2h0XCIsIFwiYmVcIiwgXCJib3lcIiwgXCJhdFwiLCBcIm9sZFwiLCBcIm9uZVwiLCBcInRvb1wiLCBcImhhdmVcIiwgXCJzYW1lXCIsIFwidGhpc1wiLCBcInRlbGxcIiwgXCJmcm9tXCIsIFwiZG9lc1wiLCBcIm9yXCIsXG4gICAgICAgIFwic2V0XCIsIFwiaGFkXCIsIFwidGhyZWVcIiwgXCJieVwiLCBcIndhbnRcIiwgXCJob3RcIiwgXCJhaXJcIiwgXCJ3b3JkXCIsIFwid2VsbFwiLCBcImJ1dFwiLCBcImFsc29cIiwgXCJ3aGF0XCIsIFwicGxheVwiLCBcInNvbWVcIiwgXCJzbWFsbFwiLFxuICAgICAgICBcIndlXCIsIFwiZW5kXCIsIFwiY2FuXCIsIFwicHV0XCIsIFwib3V0XCIsIFwiaG9tZVwiLCBcIm90aGVyXCIsIFwicmVhZFwiLCBcIndlcmVcIiwgXCJoYW5kXCIsIFwiYWxsXCIsIFwicG9ydFwiLCBcInRoZXJlXCIsIFwibGFyZ2VcIixcbiAgICAgICAgXCJ3aGVuXCIsIFwic3BlbGxcIiwgXCJ1cFwiLCBcImFkZFwiLCBcInVzZVwiLCBcImV2ZW5cIiwgXCJ5b3VyXCIsIFwibGFuZFwiLCBcImhvd1wiLCBcImhlcmVcIiwgXCJzYWlkXCIsIFwibXVzdFwiLCBcImFuXCIsIFwiYmlnXCIsIFwiZWFjaFwiLFxuICAgICAgICBcImhpZ2hcIiwgXCJzaGVcIiwgXCJzdWNoXCIsIFwid2hpY2hcIiwgXCJmb2xsb3dcIiwgXCJkb1wiLCBcImFjdFwiLCBcInRoZWlyXCIsIFwid2h5XCIsIFwidGltZVwiLCBcImFza1wiLCBcImlmXCIsIFwibWVuXCIsIFwid2lsbFwiLCBcImNoYW5nZVwiLFxuICAgICAgICBcIndheVwiLCBcIndlbnRcIiwgXCJhYm91dFwiLCBcImxpZ2h0XCIsIFwibWFueVwiLCBcImtpbmRcIiwgXCJ0aGVuXCIsIFwib2ZmXCIsIFwidGhlbVwiLCBcIm5lZWRcIiwgXCJ3cml0ZVwiLCBcImhvdXNlXCIsIFwid291bGRcIixcbiAgICAgICAgXCJwaWN0dXJlXCIsIFwibGlrZVwiLCBcInRyeVwiLCBcInNvXCIsIFwidXNcIiwgXCJ0aGVzZVwiLCBcImFnYWluXCIsIFwiaGVyXCIsIFwiYW5pbWFsXCIsIFwibG9uZ1wiLCBcInBvaW50XCIsIFwibWFrZVwiLCBcIm1vdGhlclwiLFxuICAgICAgICBcInRoaW5nXCIsIFwid29ybGRcIiwgXCJzZWVcIiwgXCJuZWFyXCIsIFwiaGltXCIsIFwiYnVpbGRcIiwgXCJ0d29cIiwgXCJzZWxmXCIsIFwiaGFzXCIsIFwiZWFydGhcIiwgXCJsb29rXCIsIFwiZmF0aGVyXCIsIFwibW9yZVwiLCBcImhlYWRcIixcbiAgICAgICAgXCJkYXlcIiwgXCJzdGFuZFwiLCBcImNvdWxkXCIsIFwib3duXCIsIFwiZ29cIiwgXCJwYWdlXCIsIFwiY29tZVwiLCBcInNob3VsZFwiLCBcImRpZFwiLCBcImNvdW50cnlcIiwgXCJudW1iZXJcIiwgXCJmb3VuZFwiLCBcInNvdW5kXCIsXG4gICAgICAgIFwiYW5zd2VyXCIsIFwibm9cIiwgXCJzY2hvb2xcIiwgXCJtb3N0XCIsIFwiZ3Jvd1wiLCBcInBlb3BsZVwiLCBcInN0dWR5XCIsIFwibXlcIiwgXCJzdGlsbFwiLCBcIm92ZXJcIiwgXCJsZWFyblwiLCBcImtub3dcIiwgXCJwbGFudFwiLFxuICAgICAgICBcIndhdGVyXCIsIFwiY292ZXJcIiwgXCJ0aGFuXCIsIFwiZm9vZFwiLCBcImNhbGxcIiwgXCJzdW5cIiwgXCJmaXJzdFwiLCBcImZvdXJcIiwgXCJ3aG9cIiwgXCJiZXR3ZWVuXCIsIFwibWF5XCIsIFwic3RhdGVcIiwgXCJkb3duXCIsXG4gICAgICAgIFwia2VlcFwiLCBcInNpZGVcIiwgXCJleWVcIiwgXCJiZWVuXCIsIFwibmV2ZXJcIiwgXCJub3dcIiwgXCJsYXN0XCIsIFwiZmluZFwiLCBcImxldFwiLCBcImFueVwiLCBcInRob3VnaHRcIiwgXCJuZXdcIiwgXCJjaXR5XCIsIFwid29ya1wiLFxuICAgICAgICBcInRyZWVcIiwgXCJwYXJ0XCIsIFwiY3Jvc3NcIiwgXCJ0YWtlXCIsIFwiZmFybVwiLCBcImdldFwiLCBcImhhcmRcIiwgXCJwbGFjZVwiLCBcInN0YXJ0XCIsIFwibWFkZVwiLCBcIm1pZ2h0XCIsIFwibGl2ZVwiLCBcInN0b3J5XCIsXG4gICAgICAgIFwid2hlcmVcIiwgXCJzYXdcIiwgXCJhZnRlclwiLCBcImZhclwiLCBcImJhY2tcIiwgXCJzZWFcIiwgXCJsaXR0bGVcIiwgXCJkcmF3XCIsIFwib25seVwiLCBcImxlZnRcIiwgXCJyb3VuZFwiLCBcImxhdGVcIiwgXCJtYW5cIiwgXCJydW5cIixcbiAgICAgICAgXCJ5ZWFyXCIsIFwiZG9uJ3RcIiwgXCJjYW1lXCIsIFwid2hpbGVcIiwgXCJzaG93XCIsIFwicHJlc3NcIiwgXCJldmVyeVwiLCBcImNsb3NlXCIsIFwiZ29vZFwiLCBcIm5pZ2h0XCIsIFwibWVcIiwgXCJyZWFsXCIsIFwiZ2l2ZVwiLFxuICAgICAgICBcImxpZmVcIiwgXCJvdXJcIiwgXCJmZXdcIiwgXCJ1bmRlclwiLCBcIm5vcnRoXCIsIFwib3BlblwiLCBcInRlblwiLCBcInNlZW1cIiwgXCJzaW1wbGVcIiwgXCJ0b2dldGhlclwiLCBcInNldmVyYWxcIiwgXCJuZXh0XCIsIFwidm93ZWxcIixcbiAgICAgICAgXCJ3aGl0ZVwiLCBcInRvd2FyZFwiLCBcImNoaWxkcmVuXCIsIFwid2FyXCIsIFwiYmVnaW5cIiwgXCJsYXlcIiwgXCJnb3RcIiwgXCJhZ2FpbnN0XCIsIFwid2Fsa1wiLCBcInBhdHRlcm5cIiwgXCJleGFtcGxlXCIsIFwic2xvd1wiLFxuICAgICAgICBcImVhc2VcIiwgXCJjZW50ZXJcIiwgXCJwYXBlclwiLCBcImxvdmVcIiwgXCJncm91cFwiLCBcInBlcnNvblwiLCBcImFsd2F5c1wiLCBcIm1vbmV5XCIsIFwibXVzaWNcIiwgXCJzZXJ2ZVwiLCBcInRob3NlXCIsIFwiYXBwZWFyXCIsXG4gICAgICAgIFwiYm90aFwiLCBcInJvYWRcIiwgXCJtYXJrXCIsIFwibWFwXCIsIFwib2Z0ZW5cIiwgXCJyYWluXCIsIFwibGV0dGVyXCIsIFwicnVsZVwiLCBcInVudGlsXCIsIFwiZ292ZXJuXCIsIFwibWlsZVwiLCBcInB1bGxcIiwgXCJyaXZlclwiLFxuICAgICAgICBcImNvbGRcIiwgXCJjYXJcIiwgXCJub3RpY2VcIiwgXCJmZWV0XCIsIFwidm9pY2VcIiwgXCJjYXJlXCIsIFwidW5pdFwiLCBcInNlY29uZFwiLCBcInBvd2VyXCIsIFwiYm9va1wiLCBcInRvd25cIiwgXCJjYXJyeVwiLCBcImZpbmVcIixcbiAgICAgICAgXCJ0b29rXCIsIFwiY2VydGFpblwiLCBcInNjaWVuY2VcIiwgXCJmbHlcIiwgXCJlYXRcIiwgXCJmYWxsXCIsIFwicm9vbVwiLCBcImxlYWRcIiwgXCJmcmllbmRcIiwgXCJjcnlcIiwgXCJiZWdhblwiLCBcImRhcmtcIiwgXCJpZGVhXCIsXG4gICAgICAgIFwibWFjaGluZVwiLCBcImZpc2hcIiwgXCJub3RlXCIsIFwibW91bnRhaW5cIiwgXCJ3YWl0XCIsIFwic3RvcFwiLCBcInBsYW5cIiwgXCJvbmNlXCIsIFwiZmlndXJlXCIsIFwiYmFzZVwiLCBcInN0YXJcIiwgXCJoZWFyXCIsIFwiYm94XCIsXG4gICAgICAgIFwiaG9yc2VcIiwgXCJub3VuXCIsIFwiY3V0XCIsIFwiZmllbGRcIiwgXCJzdXJlXCIsIFwicmVzdFwiLCBcIndhdGNoXCIsIFwiY29ycmVjdFwiLCBcImNvbG9yXCIsIFwiYWJsZVwiLCBcImZhY2VcIiwgXCJwb3VuZFwiLCBcIndvb2RcIixcbiAgICAgICAgXCJkb25lXCIsIFwibWFpblwiLCBcImJlYXV0eVwiLCBcImVub3VnaFwiLCBcImRyaXZlXCIsIFwicGxhaW5cIiwgXCJzdG9vZFwiLCBcImdpcmxcIiwgXCJjb250YWluXCIsIFwidXN1YWxcIiwgXCJmcm9udFwiLCBcInlvdW5nXCIsXG4gICAgICAgIFwidGVhY2hcIiwgXCJyZWFkeVwiLCBcIndlZWtcIiwgXCJhYm92ZVwiLCBcImZpbmFsXCIsIFwiZXZlclwiLCBcImdhdmVcIiwgXCJyZWRcIiwgXCJncmVlblwiLCBcImxpc3RcIiwgXCJvaFwiLCBcInRob3VnaFwiLCBcInF1aWNrXCIsXG4gICAgICAgIFwiZmVlbFwiLCBcImRldmVsb3BcIiwgXCJ0YWxrXCIsIFwib2NlYW5cIiwgXCJiaXJkXCIsIFwid2FybVwiLCBcInNvb25cIiwgXCJmcmVlXCIsIFwiYm9keVwiLCBcIm1pbnV0ZVwiLCBcImRvZ1wiLCBcInN0cm9uZ1wiLCBcImZhbWlseVwiLFxuICAgICAgICBcInNwZWNpYWxcIiwgXCJkaXJlY3RcIiwgXCJtaW5kXCIsIFwicG9zZVwiLCBcImJlaGluZFwiLCBcImxlYXZlXCIsIFwiY2xlYXJcIiwgXCJzb25nXCIsIFwidGFpbFwiLCBcIm1lYXN1cmVcIiwgXCJwcm9kdWNlXCIsIFwiZG9vclwiLFxuICAgICAgICBcImZhY3RcIiwgXCJwcm9kdWN0XCIsIFwic3RyZWV0XCIsIFwiYmxhY2tcIiwgXCJpbmNoXCIsIFwic2hvcnRcIiwgXCJtdWx0aXBseVwiLCBcIm51bWVyYWxcIiwgXCJub3RoaW5nXCIsIFwiY2xhc3NcIiwgXCJjb3Vyc2VcIiwgXCJ3aW5kXCIsXG4gICAgICAgIFwic3RheVwiLCBcInF1ZXN0aW9uXCIsIFwid2hlZWxcIiwgXCJoYXBwZW5cIiwgXCJmdWxsXCIsIFwiY29tcGxldGVcIiwgXCJmb3JjZVwiLCBcInNoaXBcIiwgXCJibHVlXCIsIFwiYXJlYVwiLCBcIm9iamVjdFwiLCBcImhhbGZcIixcbiAgICAgICAgXCJkZWNpZGVcIiwgXCJyb2NrXCIsIFwic3VyZmFjZVwiLCBcIm9yZGVyXCIsIFwiZGVlcFwiLCBcImZpcmVcIiwgXCJtb29uXCIsIFwic291dGhcIiwgXCJpc2xhbmRcIiwgXCJwcm9ibGVtXCIsIFwiZm9vdFwiLCBcInBpZWNlXCIsXG4gICAgICAgIFwic3lzdGVtXCIsIFwidG9sZFwiLCBcImJ1c3lcIiwgXCJrbmV3XCIsIFwidGVzdFwiLCBcInBhc3NcIiwgXCJyZWNvcmRcIiwgXCJzaW5jZVwiLCBcImJvYXRcIiwgXCJ0b3BcIiwgXCJjb21tb25cIiwgXCJ3aG9sZVwiLCBcImdvbGRcIixcbiAgICAgICAgXCJraW5nXCIsIFwicG9zc2libGVcIiwgXCJzcGFjZVwiLCBcInBsYW5lXCIsIFwiaGVhcmRcIiwgXCJzdGVhZFwiLCBcImJlc3RcIiwgXCJkcnlcIiwgXCJob3VyXCIsIFwid29uZGVyXCIsIFwiYmV0dGVyXCIsIFwibGF1Z2hcIixcbiAgICAgICAgXCJ0cnVlXCIsIFwidGhvdXNhbmRcIiwgXCJkdXJpbmdcIiwgXCJhZ29cIiwgXCJodW5kcmVkXCIsIFwicmFuXCIsIFwiZml2ZVwiLCBcImNoZWNrXCIsIFwicmVtZW1iZXJcIiwgXCJnYW1lXCIsIFwic3RlcFwiLCBcInNoYXBlXCIsXG4gICAgICAgIFwiZWFybHlcIiwgXCJlcXVhdGVcIiwgXCJob2xkXCIsIFwiaG90XCIsIFwid2VzdFwiLCBcIm1pc3NcIiwgXCJncm91bmRcIiwgXCJicm91Z2h0XCIsIFwiaW50ZXJlc3RcIiwgXCJoZWF0XCIsIFwicmVhY2hcIiwgXCJzbm93XCIsXG4gICAgICAgIFwiZmFzdFwiLCBcInRpcmVcIiwgXCJ2ZXJiXCIsIFwiYnJpbmdcIiwgXCJzaW5nXCIsIFwieWVzXCIsIFwibGlzdGVuXCIsIFwiZGlzdGFudFwiLCBcInNpeFwiLCBcImZpbGxcIiwgXCJ0YWJsZVwiLCBcImVhc3RcIiwgXCJ0cmF2ZWxcIixcbiAgICAgICAgXCJwYWludFwiLCBcImxlc3NcIiwgXCJsYW5ndWFnZVwiLCBcIm1vcm5pbmdcIiwgXCJhbW9uZ1wiLCBcImdyYW5kXCIsIFwiY2F0XCIsIFwiYmFsbFwiLCBcImNlbnR1cnlcIiwgXCJ5ZXRcIiwgXCJjb25zaWRlclwiLCBcIndhdmVcIixcbiAgICAgICAgXCJ0eXBlXCIsIFwiZHJvcFwiLCBcImxhd1wiLCBcImhlYXJ0XCIsIFwiYml0XCIsIFwiYW1cIiwgXCJjb2FzdFwiLCBcInByZXNlbnRcIiwgXCJjb3B5XCIsIFwiaGVhdnlcIiwgXCJwaHJhc2VcIiwgXCJkYW5jZVwiLCBcInNpbGVudFwiLFxuICAgICAgICBcImVuZ2luZVwiLCBcInRhbGxcIiwgXCJwb3NpdGlvblwiLCBcInNhbmRcIiwgXCJhcm1cIiwgXCJzb2lsXCIsIFwid2lkZVwiLCBcInJvbGxcIiwgXCJzYWlsXCIsIFwidGVtcGVyYXR1cmVcIiwgXCJtYXRlcmlhbFwiLCBcImZpbmdlclwiLFxuICAgICAgICBcInNpemVcIiwgXCJpbmR1c3RyeVwiLCBcInZhcnlcIiwgXCJ2YWx1ZVwiLCBcInNldHRsZVwiLCBcImZpZ2h0XCIsIFwic3BlYWtcIiwgXCJsaWVcIiwgXCJ3ZWlnaHRcIiwgXCJiZWF0XCIsIFwiZ2VuZXJhbFwiLCBcImV4Y2l0ZVwiLFxuICAgICAgICBcImljZVwiLCBcIm5hdHVyYWxcIiwgXCJtYXR0ZXJcIiwgXCJ2aWV3XCIsIFwiY2lyY2xlXCIsIFwic2Vuc2VcIiwgXCJwYWlyXCIsIFwiZWFyXCIsIFwiaW5jbHVkZVwiLCBcImVsc2VcIiwgXCJkaXZpZGVcIiwgXCJxdWl0ZVwiLFxuICAgICAgICBcInN5bGxhYmxlXCIsIFwiYnJva2VcIiwgXCJmZWx0XCIsIFwiY2FzZVwiLCBcInBlcmhhcHNcIiwgXCJtaWRkbGVcIiwgXCJwaWNrXCIsIFwia2lsbFwiLCBcInN1ZGRlblwiLCBcInNvblwiLCBcImNvdW50XCIsIFwibGFrZVwiLFxuICAgICAgICBcInNxdWFyZVwiLCBcIm1vbWVudFwiLCBcInJlYXNvblwiLCBcInNjYWxlXCIsIFwibGVuZ3RoXCIsIFwibG91ZFwiLCBcInJlcHJlc2VudFwiLCBcInNwcmluZ1wiLCBcImFydFwiLCBcIm9ic2VydmVcIiwgXCJzdWJqZWN0XCIsXG4gICAgICAgIFwiY2hpbGRcIiwgXCJyZWdpb25cIiwgXCJzdHJhaWdodFwiLCBcImVuZXJneVwiLCBcImNvbnNvbmFudFwiLCBcImh1bnRcIiwgXCJuYXRpb25cIiwgXCJwcm9iYWJsZVwiLCBcImRpY3Rpb25hcnlcIiwgXCJiZWRcIiwgXCJtaWxrXCIsXG4gICAgICAgIFwiYnJvdGhlclwiLCBcInNwZWVkXCIsIFwiZWdnXCIsIFwibWV0aG9kXCIsIFwicmlkZVwiLCBcIm9yZ2FuXCIsIFwiY2VsbFwiLCBcInBheVwiLCBcImJlbGlldmVcIiwgXCJhZ2VcIiwgXCJmcmFjdGlvblwiLCBcInNlY3Rpb25cIixcbiAgICAgICAgXCJmb3Jlc3RcIiwgXCJkcmVzc1wiLCBcInNpdFwiLCBcImNsb3VkXCIsIFwicmFjZVwiLCBcInN1cnByaXNlXCIsIFwid2luZG93XCIsIFwicXVpZXRcIiwgXCJzdG9yZVwiLCBcInN0b25lXCIsIFwic3VtbWVyXCIsIFwidGlueVwiLFxuICAgICAgICBcInRyYWluXCIsIFwiY2xpbWJcIiwgXCJzbGVlcFwiLCBcImNvb2xcIiwgXCJwcm92ZVwiLCBcImRlc2lnblwiLCBcImxvbmVcIiwgXCJwb29yXCIsIFwibGVnXCIsIFwibG90XCIsIFwiZXhlcmNpc2VcIiwgXCJleHBlcmltZW50XCIsXG4gICAgICAgIFwid2FsbFwiLCBcImJvdHRvbVwiLCBcImNhdGNoXCIsIFwia2V5XCIsIFwibW91bnRcIiwgXCJpcm9uXCIsIFwid2lzaFwiLCBcInNpbmdsZVwiLCBcInNreVwiLCBcInN0aWNrXCIsIFwiYm9hcmRcIiwgXCJmbGF0XCIsIFwiam95XCIsXG4gICAgICAgIFwidHdlbnR5XCIsIFwid2ludGVyXCIsIFwic2tpblwiLCBcInNhdFwiLCBcInNtaWxlXCIsIFwid3JpdHRlblwiLCBcImNyZWFzZVwiLCBcIndpbGRcIiwgXCJob2xlXCIsIFwiaW5zdHJ1bWVudFwiLCBcInRyYWRlXCIsIFwia2VwdFwiLFxuICAgICAgICBcIm1lbG9keVwiLCBcImdsYXNzXCIsIFwidHJpcFwiLCBcImdyYXNzXCIsIFwib2ZmaWNlXCIsIFwiY293XCIsIFwicmVjZWl2ZVwiLCBcImpvYlwiLCBcInJvd1wiLCBcImVkZ2VcIiwgXCJtb3V0aFwiLCBcInNpZ25cIiwgXCJleGFjdFwiLFxuICAgICAgICBcInZpc2l0XCIsIFwic3ltYm9sXCIsIFwicGFzdFwiLCBcImRpZVwiLCBcInNvZnRcIiwgXCJsZWFzdFwiLCBcImZ1blwiLCBcInRyb3VibGVcIiwgXCJicmlnaHRcIiwgXCJzaG91dFwiLCBcImdhc1wiLCBcImV4Y2VwdFwiLFxuICAgICAgICBcIndlYXRoZXJcIiwgXCJ3cm90ZVwiLCBcIm1vbnRoXCIsIFwic2VlZFwiLCBcIm1pbGxpb25cIiwgXCJ0b25lXCIsIFwiYmVhclwiLCBcImpvaW5cIiwgXCJmaW5pc2hcIiwgXCJzdWdnZXN0XCIsIFwiaGFwcHlcIiwgXCJjbGVhblwiLFxuICAgICAgICBcImhvcGVcIiwgXCJicmVha1wiLCBcImZsb3dlclwiLCBcImxhZHlcIiwgXCJjbG90aGVcIiwgXCJ5YXJkXCIsIFwic3RyYW5nZVwiLCBcInJpc2VcIiwgXCJnb25lXCIsIFwiYmFkXCIsIFwianVtcFwiLCBcImJsb3dcIiwgXCJiYWJ5XCIsXG4gICAgICAgIFwib2lsXCIsIFwiZWlnaHRcIiwgXCJibG9vZFwiLCBcInZpbGxhZ2VcIiwgXCJ0b3VjaFwiLCBcIm1lZXRcIiwgXCJncmV3XCIsIFwicm9vdFwiLCBcImNlbnRcIiwgXCJidXlcIiwgXCJtaXhcIiwgXCJyYWlzZVwiLCBcInRlYW1cIixcbiAgICAgICAgXCJzb2x2ZVwiLCBcIndpcmVcIiwgXCJtZXRhbFwiLCBcImNvc3RcIiwgXCJ3aGV0aGVyXCIsIFwibG9zdFwiLCBcInB1c2hcIiwgXCJicm93blwiLCBcInNldmVuXCIsIFwid2VhclwiLCBcInBhcmFncmFwaFwiLCBcImdhcmRlblwiLFxuICAgICAgICBcInRoaXJkXCIsIFwiZXF1YWxcIiwgXCJzaGFsbFwiLCBcInNlbnRcIiwgXCJoZWxkXCIsIFwiY2hvb3NlXCIsIFwiaGFpclwiLCBcImZlbGxcIiwgXCJkZXNjcmliZVwiLCBcImZpdFwiLCBcImNvb2tcIiwgXCJmbG93XCIsIFwiZmxvb3JcIixcbiAgICAgICAgXCJmYWlyXCIsIFwiZWl0aGVyXCIsIFwiYmFua1wiLCBcInJlc3VsdFwiLCBcImNvbGxlY3RcIiwgXCJidXJuXCIsIFwic2F2ZVwiLCBcImhpbGxcIiwgXCJjb250cm9sXCIsIFwic2FmZVwiLCBcImRlY2ltYWxcIiwgXCJyYW5rXCIsXG4gICAgICAgIFwid29yZFwiLCBcInJlZmVyZW5jZVwiLCBcImdlbnRsZVwiLCBcInRydWNrXCIsIFwid29tYW5cIiwgXCJub2lzZVwiLCBcImNhcHRhaW5cIiwgXCJsZXZlbFwiLFxuICAgICAgICBcInByYWN0aWNlXCIsIFwiY2hhbmNlXCIsIFwic2VwYXJhdGVcIiwgXCJnYXRoZXJcIiwgXCJkaWZmaWN1bHRcIiwgXCJzaG9wXCIsIFwiZG9jdG9yXCIsIFwic3RyZXRjaFwiLCBcInBsZWFzZVwiLCBcInRocm93XCIsXG4gICAgICAgIFwicHJvdGVjdFwiLCBcInNoaW5lXCIsIFwibm9vblwiLCBcInByb3BlcnR5XCIsIFwid2hvc2VcIiwgXCJjb2x1bW5cIiwgXCJsb2NhdGVcIiwgXCJtb2xlY3VsZVwiLCBcInJpbmdcIiwgXCJzZWxlY3RcIiwgXCJjaGFyYWN0ZXJcIixcbiAgICAgICAgXCJ3cm9uZ1wiLCBcImluc2VjdFwiLCBcImdyYXlcIiwgXCJjYXVnaHRcIiwgXCJyZXBlYXRcIiwgXCJwZXJpb2RcIiwgXCJyZXF1aXJlXCIsIFwiaW5kaWNhdGVcIiwgXCJicm9hZFwiLCBcInJhZGlvXCIsIFwicHJlcGFyZVwiLFxuICAgICAgICBcInNwb2tlXCIsIFwic2FsdFwiLCBcImF0b21cIiwgXCJub3NlXCIsIFwiaHVtYW5cIiwgXCJwbHVyYWxcIiwgXCJoaXN0b3J5XCIsIFwiYW5nZXJcIiwgXCJlZmZlY3RcIiwgXCJjbGFpbVwiLCBcImVsZWN0cmljXCIsXG4gICAgICAgIFwiY29udGluZW50XCIsIFwiZXhwZWN0XCIsIFwib3h5Z2VuXCIsIFwiY3JvcFwiLCBcInN1Z2FyXCIsIFwibW9kZXJuXCIsIFwiZGVhdGhcIiwgXCJlbGVtZW50XCIsIFwicHJldHR5XCIsIFwiaGl0XCIsIFwic2tpbGxcIixcbiAgICAgICAgXCJzdHVkZW50XCIsIFwid29tZW5cIiwgXCJjb3JuZXJcIiwgXCJzZWFzb25cIiwgXCJwYXJ0eVwiLCBcInNvbHV0aW9uXCIsIFwic3VwcGx5XCIsIFwibWFnbmV0XCIsIFwiYm9uZVwiLCBcInNpbHZlclwiLCBcInJhaWxcIixcbiAgICAgICAgXCJ0aGFua1wiLCBcImltYWdpbmVcIiwgXCJicmFuY2hcIiwgXCJwcm92aWRlXCIsIFwibWF0Y2hcIiwgXCJhZ3JlZVwiLCBcInN1ZmZpeFwiLCBcInRodXNcIiwgXCJlc3BlY2lhbGx5XCIsIFwiY2FwaXRhbFwiLCBcImZpZ1wiLFxuICAgICAgICBcIndvbid0XCIsIFwiYWZyYWlkXCIsIFwiY2hhaXJcIiwgXCJodWdlXCIsIFwiZGFuZ2VyXCIsIFwic2lzdGVyXCIsIFwiZnJ1aXRcIiwgXCJzdGVlbFwiLCBcInJpY2hcIiwgXCJkaXNjdXNzXCIsIFwidGhpY2tcIiwgXCJmb3J3YXJkXCIsXG4gICAgICAgIFwic29sZGllclwiLCBcInNpbWlsYXJcIiwgXCJwcm9jZXNzXCIsIFwiZ3VpZGVcIiwgXCJvcGVyYXRlXCIsIFwiZXhwZXJpZW5jZVwiLCBcImd1ZXNzXCIsIFwic2NvcmVcIiwgXCJuZWNlc3NhcnlcIiwgXCJhcHBsZVwiLFxuICAgICAgICBcInNoYXJwXCIsIFwiYm91Z2h0XCIsIFwid2luZ1wiLCBcImxlZFwiLCBcImNyZWF0ZVwiLCBcInBpdGNoXCIsIFwibmVpZ2hib3JcIiwgXCJjb2F0XCIsIFwid2FzaFwiLCBcIm1hc3NcIiwgXCJiYXRcIiwgXCJjYXJkXCIsIFwicmF0aGVyXCIsXG4gICAgICAgIFwiYmFuZFwiLCBcImNyb3dkXCIsIFwicm9wZVwiLCBcImNvcm5cIiwgXCJzbGlwXCIsIFwiY29tcGFyZVwiLCBcIndpblwiLCBcInBvZW1cIiwgXCJkcmVhbVwiLCBcInN0cmluZ1wiLCBcImV2ZW5pbmdcIiwgXCJiZWxsXCIsXG4gICAgICAgIFwiY29uZGl0aW9uXCIsIFwiZGVwZW5kXCIsIFwiZmVlZFwiLCBcIm1lYXRcIiwgXCJ0b29sXCIsIFwicnViXCIsIFwidG90YWxcIiwgXCJ0dWJlXCIsIFwiYmFzaWNcIiwgXCJmYW1vdXNcIiwgXCJzbWVsbFwiLCBcImRvbGxhclwiLFxuICAgICAgICBcInZhbGxleVwiLCBcInN0cmVhbVwiLCBcIm5vclwiLCBcImZlYXJcIiwgXCJkb3VibGVcIiwgXCJzaWdodFwiLCBcInNlYXRcIiwgXCJ0aGluXCIsIFwiYXJyaXZlXCIsIFwidHJpYW5nbGVcIiwgXCJtYXN0ZXJcIiwgXCJwbGFuZXRcIixcbiAgICAgICAgXCJ0cmFja1wiLCBcImh1cnJ5XCIsIFwicGFyZW50XCIsIFwiY2hpZWZcIiwgXCJzaG9yZVwiLCBcImNvbG9ueVwiLCBcImRpdmlzaW9uXCIsIFwiY2xvY2tcIiwgXCJzaGVldFwiLCBcIm1pbmVcIiwgXCJzdWJzdGFuY2VcIiwgXCJ0aWVcIixcbiAgICAgICAgXCJmYXZvclwiLCBcImVudGVyXCIsIFwiY29ubmVjdFwiLCBcIm1ham9yXCIsIFwicG9zdFwiLCBcImZyZXNoXCIsIFwic3BlbmRcIiwgXCJzZWFyY2hcIiwgXCJjaG9yZFwiLCBcInNlbmRcIiwgXCJmYXRcIiwgXCJ5ZWxsb3dcIixcbiAgICAgICAgXCJnbGFkXCIsIFwiZ3VuXCIsIFwib3JpZ2luYWxcIiwgXCJhbGxvd1wiLCBcInNoYXJlXCIsIFwicHJpbnRcIiwgXCJzdGF0aW9uXCIsIFwiZGVhZFwiLCBcImRhZFwiLCBcInNwb3RcIiwgXCJicmVhZFwiLCBcImRlc2VydFwiLFxuICAgICAgICBcImNoYXJnZVwiLCBcInN1aXRcIiwgXCJwcm9wZXJcIiwgXCJjdXJyZW50XCIsIFwiYmFyXCIsIFwibGlmdFwiLCBcIm9mZmVyXCIsIFwicm9zZVwiLCBcInNlZ21lbnRcIiwgXCJjb250aW51ZVwiLCBcInNsYXZlXCIsIFwiYmxvY2tcIixcbiAgICAgICAgXCJkdWNrXCIsIFwiY2hhcnRcIiwgXCJpbnN0YW50XCIsIFwiaGF0XCIsIFwibWFya2V0XCIsIFwic2VsbFwiLCBcImRlZ3JlZVwiLCBcInN1Y2Nlc3NcIiwgXCJwb3B1bGF0ZVwiLCBcImNvbXBhbnlcIiwgXCJjaGlja1wiLFxuICAgICAgICBcInN1YnRyYWN0XCIsIFwiZGVhclwiLCBcImV2ZW50XCIsIFwiZW5lbXlcIiwgXCJwYXJ0aWN1bGFyXCIsIFwicmVwbHlcIiwgXCJkZWFsXCIsIFwiZHJpbmtcIiwgXCJzd2ltXCIsIFwib2NjdXJcIiwgXCJ0ZXJtXCIsIFwic3VwcG9ydFwiLFxuICAgICAgICBcIm9wcG9zaXRlXCIsIFwic3BlZWNoXCIsIFwid2lmZVwiLCBcIm5hdHVyZVwiLCBcInNob2VcIiwgXCJyYW5nZVwiLCBcInNob3VsZGVyXCIsIFwic3RlYW1cIiwgXCJzcHJlYWRcIiwgXCJtb3Rpb25cIiwgXCJhcnJhbmdlXCIsXG4gICAgICAgIFwicGF0aFwiLCBcImNhbXBcIiwgXCJsaXF1aWRcIiwgXCJpbnZlbnRcIiwgXCJsb2dcIiwgXCJjb3R0b25cIiwgXCJtZWFudFwiLCBcImJvcm5cIiwgXCJxdW90aWVudFwiLCBcImRldGVybWluZVwiLCBcInRlZXRoXCIsIFwicXVhcnRcIixcbiAgICAgICAgXCJzaGVsbFwiLCBcIm5pbmVcIiwgXCJuZWNrXCIsIFwiZmFuY3lcIiwgXCJmYW5cIiwgXCJmb290YmFsbFwiXG4gICAgXTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgcmFuZG9tIHdvcmQgZnJvbSB0aGUgYXJyYXkgb2Ygd29yZHMuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gcmFuZG9tIHdvcmQgZnJvbSB0aGUgYXJyYXkgb2Ygd29yZHMuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2VuZXJhdGVXb3JkKClcbiAgICB7XG4gICAgICAgIHJldHVybiB3b3Jkc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB3b3Jkcy5sZW5ndGgpXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZXMgbmV3IHJvb20gbmFtZS5cbiAgICAgKiBAcGFyYW0gc2VwYXJhdG9yIHRoZSBzZXBhcmF0b3IgZm9yIHRoZSB3b3Jkcy5cbiAgICAgKiBAcGFyYW0gbnVtYmVyX29mX3dvcmRzIG51bWJlciBvZiB3b3JkcyBpbiB0aGUgcm9vbSBuYW1lXG4gICAgICogQHJldHVybnMge3N0cmluZ30gdGhlIHJvb20gbmFtZVxuICAgICAqL1xuICAgIFJvb21OYW1lR2VuZXJhdG9yUHJvdG8uZ2VuZXJhdGVSb29tID0gZnVuY3Rpb24oc2VwYXJhdG9yLCBudW1iZXJfb2Zfd29yZHMpXG4gICAge1xuICAgICAgICBpZighc2VwYXJhdG9yKVxuICAgICAgICAgICAgc2VwYXJhdG9yID0gREVGQVVMVF9TRVBBUkFUT1I7XG4gICAgICAgIGlmKCFudW1iZXJfb2Zfd29yZHMpXG4gICAgICAgICAgICBudW1iZXJfb2Zfd29yZHMgPSBOVU1CRVJfT0ZfV09SRFM7XG4gICAgICAgIHZhciBuYW1lID0gXCJcIjtcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaTxudW1iZXJfb2Zfd29yZHM7IGkrKylcbiAgICAgICAgICAgIG5hbWUgKz0gKChpICE9IDApPyBzZXBhcmF0b3IgOiBcIlwiKSArIGdlbmVyYXRlV29yZCgpO1xuICAgICAgICByZXR1cm4gbmFtZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZXMgbmV3IHJvb20gbmFtZS5cbiAgICAgKiBAcGFyYW0gbnVtYmVyX29mX3dvcmRzIG51bWJlciBvZiB3b3JkcyBpbiB0aGUgcm9vbSBuYW1lXG4gICAgICogQHJldHVybnMge3N0cmluZ30gdGhlIHJvb20gbmFtZVxuICAgICAqL1xuICAgIFJvb21OYW1lR2VuZXJhdG9yUHJvdG8uZ2VuZXJhdGVSb29tV2l0aG91dFNlcGFyYXRvciA9IGZ1bmN0aW9uKG51bWJlcl9vZl93b3JkcylcbiAgICB7XG4gICAgICAgIGlmKCFudW1iZXJfb2Zfd29yZHMpXG4gICAgICAgICAgICBudW1iZXJfb2Zfd29yZHMgPSBOVU1CRVJfT0ZfV09SRFM7XG4gICAgICAgIHZhciBuYW1lID0gXCJcIjtcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaTxudW1iZXJfb2Zfd29yZHM7IGkrKykge1xuICAgICAgICAgICAgdmFyIHdvcmQgPSBnZW5lcmF0ZVdvcmQoKTtcbiAgICAgICAgICAgIHdvcmQgPSB3b3JkLnN1YnN0cmluZygwLCAxKS50b1VwcGVyQ2FzZSgpICsgd29yZC5zdWJzdHJpbmcoMSwgd29yZC5sZW5ndGgpO1xuICAgICAgICAgICAgbmFtZSArPSB3b3JkIDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmFtZTtcbiAgICB9XG5cbiAgICByZXR1cm4gUm9vbU5hbWVHZW5lcmF0b3JQcm90bztcbn0oKTtcblxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIl19
