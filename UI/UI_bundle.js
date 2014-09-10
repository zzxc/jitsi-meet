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
        var videospace = $('#videospace');

        var chatSize = (ContactList.isVisible()) ? [0, 0] : Chat.getChatSize();
        var videospaceWidth = window.innerWidth - chatSize[0];
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

        if (ContactList.isVisible()) {
            videospace.animate({right: chatSize[0],
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

            $('#contactlist').hide("slide", { direction: "right",
                                            queue: false,
                                            duration: 500});
        }
        else {
            // Undock the toolbar when the chat is shown and if we're in a 
            // video mode.
            if (VideoLayout.isLargeVideoVisible())
                Toolbar.dockToolbar(false);

            videospace.animate({right: chatSize[0],
                                width: videospaceWidth,
                                height: videospaceHeight},
                               {queue: false,
                                duration: 500,
                                complete: function () {
                                    contactlist.trigger('shown');
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

            $('#contactlist').show("slide", { direction: "right",
                                            queue: false,
                                            duration: 500});
        }
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

module.exports = ContactList;

},{"./VideoLayout.js":6}],2:[function(require,module,exports){
var Toolbar = (function (my) {
    var INITIAL_TOOLBAR_TIMEOUT = 20000;
    var TOOLBAR_TIMEOUT = INITIAL_TOOLBAR_TIMEOUT;

    var toolbarTimeout = null;

    /**
     * Opens the lock room dialog.
     */
    my.openLockDialog = function () {
        // Only the focus is able to set a shared key.
        if (focus === null) {
            if (sharedKey)
                $.prompt("This conversation is currently protected by"
                        + " a shared secret key.",
                    {
                        title: "Secret key",
                        persistent: false
                    }
                );
            else
                $.prompt("This conversation isn't currently protected by"
                        + " a secret key. Only the owner of the conference"
                        + " could set a shared key.",
                    {
                        title: "Secret key",
                        persistent: false
                    }
                );
        } else {
            if (sharedKey) {
                $.prompt("Are you sure you would like to remove your secret key?",
                    {
                        title: "Remove secret key",
                        persistent: false,
                        buttons: { "Remove": true, "Cancel": false},
                        defaultButton: 1,
                        submit: function (e, v, m, f) {
                            if (v) {
                                setSharedKey('');
                                lockRoom(false);
                            }
                        }
                    }
                );
            } else {
                $.prompt('<h2>Set a secret key to lock your room</h2>' +
                         '<input id="lockKey" type="text" placeholder="your shared key" autofocus>',
                    {
                        persistent: false,
                        buttons: { "Save": true, "Cancel": false},
                        defaultButton: 1,
                        loaded: function (event) {
                            document.getElementById('lockKey').focus();
                        },
                        submit: function (e, v, m, f) {
                            if (v) {
                                var lockKey = document.getElementById('lockKey');
    
                                if (lockKey.value) {
                                    setSharedKey(Util.escapeHtml(lockKey.value));
                                    lockRoom(true);
                                }
                            }
                        }
                    }
                );
            }
        }
    };

    /**
     * Opens the invite link dialog.
     */
    my.openLinkDialog = function () {
        var inviteLink;
        if (roomUrl == null)
            inviteLink = "Your conference is currently being created...";
        else
            inviteLink = encodeURI(roomUrl);

        $.prompt('<input id="inviteLinkRef" type="text" value="' +
                inviteLink + '" onclick="this.select();" readonly>',
                {
                    title: "Share this link with everyone you want to invite",
                    persistent: false,
                    buttons: { "Invite": true, "Cancel": false},
                    defaultButton: 1,
                    loaded: function (event) {
                        if (roomUrl)
                            document.getElementById('inviteLinkRef').select();
                        else
                            document.getElementById('jqi_state0_buttonInvite')
                                .disabled = true;
                    },
                    submit: function (e, v, m, f) {
                        if (v) {
                            if (roomUrl) {
                                inviteParticipants();
                            }
                        }
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
        if (sharedKey && sharedKey.length > 0)
            sharedKeyText
                = "This conference is password protected. Please use the "
                    + "following pin when joining:%0D%0A%0D%0A"
                    + sharedKey + "%0D%0A%0D%0A";

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

        if (window.localStorage.displayname)
            body += "%0D%0A%0D%0A" + window.localStorage.displayname;

        window.open("mailto:?subject=" + subject + "&body=" + body, '_blank');
    }

    /**
     * Opens the settings dialog.
     */
    my.openSettingsDialog = function () {
        $.prompt('<h2>Configure your conference</h2>' +
            '<input type="checkbox" id="initMuted"> Participants join muted<br/>' +
            '<input type="checkbox" id="requireNicknames"> Require nicknames<br/><br/>' +
            'Set a secret key to lock your room: <input id="lockKey" type="text" placeholder="your shared key" autofocus>',
            {
                persistent: false,
                buttons: { "Save": true, "Cancel": false},
                defaultButton: 1,
                loaded: function (event) {
                    document.getElementById('lockKey').focus();
                },
                submit: function (e, v, m, f) {
                    if (v) {
                        if ($('#initMuted').is(":checked")) {
                            // it is checked
                        }
    
                        if ($('#requireNicknames').is(":checked")) {
                            // it is checked
                        }
                        /*
                        var lockKey = document.getElementById('lockKey');
    
                        if (lockKey.value)
                        {
                            setSharedKey(lockKey.value);
                            lockRoom(true);
                        }
                        */
                    }
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
     * Shows the main toolbar.
     */
    my.showToolbar = function() {
        if (!$('#header').is(':visible')) {
            $('#header').show("slide", { direction: "up", duration: 300});
            $('#subject').animate({top: "+=40"}, 300);

            if (toolbarTimeout) {
                clearTimeout(toolbarTimeout);
                toolbarTimeout = null;
            }
            toolbarTimeout = setTimeout(hideToolbar, TOOLBAR_TIMEOUT);
            TOOLBAR_TIMEOUT = 4000;
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
     * Docks/undocks the toolbar.
     *
     * @param isDock indicates what operation to perform
     */
    my.dockToolbar = function(isDock) {
        if (isDock) {
            // First make sure the toolbar is shown.
            if (!$('#header').is(':visible')) {
                Toolbar.showToolbar();
            }

            // Then clear the time out, to dock the toolbar.
            if (toolbarTimeout) {
                clearTimeout(toolbarTimeout);
                toolbarTimeout = null;
            }
        }
        else {
            if (!$('#header').is(':visible')) {
                Toolbar.showToolbar();
            }
            else {
                toolbarTimeout = setTimeout(hideToolbar, TOOLBAR_TIMEOUT);
            }
        }
    };

    /**
     * Updates the lock button state.
     */
    my.updateLockButton = function() {
        buttonClick("#lockIcon", "icon-security icon-security-locked");
    };

    /**
     * Hides the toolbar.
     */
    var hideToolbar = function () {
        var isToolbarHover = false;
        $('#header').find('*').each(function () {
            var id = $(this).attr('id');
            if ($("#" + id + ":hover").length > 0) {
                isToolbarHover = true;
            }
        });

        clearTimeout(toolbarTimeout);
        toolbarTimeout = null;

        if (!isToolbarHover) {
            $('#header').hide("slide", { direction: "up", duration: 300});
            $('#subject').animate({top: "-=40"}, 300);
        }
        else {
            toolbarTimeout = setTimeout(hideToolbar, TOOLBAR_TIMEOUT);
        }
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
    my.showSipCallButton = function (show)
    {
        if (config.hosts.call_control && show)
        {
            $('#sipCallButton').css({display: "inline"});
        }
        else
        {
            $('#sipCallButton').css({display: "none"});
        }
    };

    return my;
}(Toolbar || {}));

module.exports = Toolbar;

},{}],3:[function(require,module,exports){
var UIService = require("./UIService");
var VideoLayout = require("./VideoLayout.js");
var AudioLevels = require("./audiolevels/AudioLevels.js");
var Prezi = require("./prezi/Prezi.js");
var Etherpad = require("./etherpad/Etherpad.js");
var Chat = require("./chat/Chat.js");
var StreamEventTypes = require("../service/RTC/StreamEventTypes.js");

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

    UIActivatorProto.start = function () {
        // By default we use camera
        getVideoSize = VideoLayout.getCameraVideoSize;
        getVideoPosition = VideoLayout.getCameraVideoPosition;
        $('body').popover({ selector: '[data-toggle=popover]',
            trigger: 'click hover'});
        VideoLayout.resizeLargeVideoContainer();
        registerListeners();
        bindEvents();
        setupAudioLevels();
        setupPrezi();
        setupEtherpad();


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
                currentVideoWidth = this.videoWidth;
                currentVideoHeight = this.videoHeight;
                VideoLayout.positionLarge(currentVideoWidth, currentVideoHeight);
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
                isFullScreen = document.fullScreen ||
                    document.mozFullScreen ||
                    document.webkitIsFullScreen;

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

    return UIActivatorProto;
}();

module.exports = UIActivator;


},{"../service/RTC/StreamEventTypes.js":15,"./UIService":4,"./VideoLayout.js":6,"./audiolevels/AudioLevels.js":7,"./chat/Chat.js":9,"./etherpad/Etherpad.js":11,"./prezi/Prezi.js":12}],4:[function(require,module,exports){
var AudioLevels = require("./audiolevels/AudioLevels.js");
var Etherpad = require("./etherpad/Etherpad.js");
var VideoLayout = require("./VideoLayout.js");
var Toolbar = require("./Toolbar.js");

var UIService = function() {
    /**
     * Updates the room invite url.
     */
    function updateRoomUrl(newRoomUrl) {
        roomUrl = newRoomUrl;

        // If the invite dialog has been already opened we update the information.
        var inviteLink = document.getElementById('inviteLinkRef');
        if (inviteLink) {
            inviteLink.value = roomUrl;
            inviteLink.select();
            document.getElementById('jqi_state0_buttonInvite').disabled = false;
        }
    }

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

    UIServiceProto.prototype.onMucJoined = function (jid, info, noMember) {
        updateRoomUrl(window.location.href);
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
        Toolbar.showToolbar();

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
                focus.makeConference(Object.keys(connection.emuc.members));
                Toolbar.showRecordingButton(true);
            } else {
                console.log('invite', jid, 'into conference');
                focus.addNewParticipant(jid);
            }
        }
        else if (sharedKey) {
            Toolbar.updateLockButton();
        }
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

    return UIServiceProto;
}();
module.exports = UIService;
},{"./Toolbar.js":2,"./VideoLayout.js":6,"./audiolevels/AudioLevels.js":7,"./etherpad/Etherpad.js":11}],5:[function(require,module,exports){
var Chat = require("./chat/Chat.js");
var ContactList = require("./ContactList.js");

var UIUtil = (function (my) {

    /**
     * Returns the available video width.
     */
    my.getAvailableVideoWidth = function () {
        var chatspaceWidth
            = (Chat.isVisible() || ContactList.isVisible())
            ? $('#chatspace').width()
            : 0;

        return window.innerWidth - chatspaceWidth;
    };

    return my;

})(UIUtil || {});


//module.exports = {
//    getAvailableVideoWidth: function () {
//        var chatspaceWidth
//            = (Chat.isVisible() || ContactList.isVisible())
//            ? $('#chatspace').width()
//            : 0;
//
//        return window.innerWidth - chatspaceWidth;
//    }
//}

module.exports = UIUtil;
//module.exports = "Aaaaaaaaaaa";
},{"./ContactList.js":1,"./chat/Chat.js":9}],6:[function(require,module,exports){
var dep =
{
    "RTCBrowserType": function(){ return require("../service/RTC/RTCBrowserType.js")},
    "UIService": function(){ return require("./UIService.js")},
    "UIActivator": function(){ return require("./UIActivator.js")},
    "Chat": function(){ return require("./chat/Chat")},
    "UIUtil": function(){ return require("./UIUtil.js")}
}

var VideoLayout = (function (my) {
    var preMuted = false;
    var currentDominantSpeaker = null;
    var lastNCount = config.channelLastN;
    var lastNEndpointsCache = [];
    var browser = null;
    /**
     * Currently focused video "src"(displayed in large video).
     * @type {String}
     */
    my.focusedVideoSrc = null;

    function attachMediaStream(element, stream) {
        if(browser == null)
        {
            browser = dep.UIService().getBrowserType();
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

        dep.UIService().updateAudioLevelCanvas();

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

            var isVisible = $('#largeVideo').is(':visible');

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
                var isDesktop = isVideoSrcDesktop(newSrc);
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
        ContactList.ensureAddContact(peerJid);

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
        dep.UIService().updateAudioLevelCanvas(peerJid);

        return container;
    };

    /**
     * Creates an audio or video stream element.
     */
    my.createStreamElement = function (sid, stream) {
        var isVideo = stream.getVideoTracks().length > 0;

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
                attachMediaStream(sel, stream);

                if (isVideo)
                    waitForRemoteVideo(sel, thessrc, stream);
            }

            stream.onended = function () {
                console.log('stream ended', this);

                VideoLayout.removeRemoteStreamElement(stream, container);

                if (peerJid)
                    ContactList.removeContact(peerJid);
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
        var defaultRemoteDisplayName = "Speaker";

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
                    $('#' + videoSpanId + '_name').text(defaultRemoteDisplayName);
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
                nameSpan.innerText = defaultRemoteDisplayName;
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
                        if (nickname !== name) {
                            nickname = name;
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
           videoWidth = currentVideoWidth;
       if (!videoHeight)
           videoHeight = currentVideoHeight;

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
            videoWidth = currentVideoWidth;
        if (!videoHeight)
            videoHeight = currentVideoHeight;

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
        var isFullScreen = document.fullScreen ||
            document.mozFullScreen ||
            document.webkitIsFullScreen;
        if (isFullScreen)
            videoSpaceHeight = window.innerHeight;

        var horizontalIndent = (videoSpaceWidth - videoWidth) / 2;
        var verticalIndent = (videoSpaceHeight - videoHeight) / 2;

        return [horizontalIndent, verticalIndent];
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
        if (resourceJid !== currentDominantSpeaker)
            currentDominantSpeaker = resourceJid;
        else
            return;

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

                            attachMediaStream(sel, mediaStream.stream);
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
           attachMediaStream(selector, stream); // FIXME: why do i have to do this for FF?

            // FIXME: add a class that will associate peer Jid, video.src, it's ssrc and video type
            //        in order to get rid of too many maps
            if (ssrc && selector.attr('src')) {
                videoSrcToSsrc[selector.attr('src')] = ssrc;
            } else {
                console.warn("No ssrc given for video", selector);
            }

            videoActive([selector]);
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

    //document events setup
    $(document).bind('presence.status.muc', function (event, jid, info, pres) {

        VideoLayout.setPresenceStatus(
                'participant_' + Strophe.getResourceFromJid(jid), info.status);

    });

    return my;
}(VideoLayout || {}));

module.exports = VideoLayout;

},{"../service/RTC/RTCBrowserType.js":14,"./UIActivator.js":3,"./UIService.js":4,"./UIUtil.js":5,"./chat/Chat":9}],7:[function(require,module,exports){
var CanvasUtil = require("./CanvasUtil.js");

/**
 * The audio Levels plugin.
 */
var AudioLevels = (function(my) {
    var CANVAS_EXTRA = 104;
    var CANVAS_RADIUS = 7;
    var SHADOW_COLOR = '#00ccff';
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
            audioLevelCanvas.style.bottom = "-" + CANVAS_EXTRA/2 + "px";
            audioLevelCanvas.style.left = "-" + CANVAS_EXTRA/2 + "px";
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
        audioLevelCanvas.width = thumbnailWidth + CANVAS_EXTRA;
        audioLevelCanvas.height = thumbnailHeight + CANVAS_EXTRA;
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
                                            CANVAS_EXTRA/2, CANVAS_EXTRA/2,
                                            canvas.width - CANVAS_EXTRA,
                                            canvas.height - CANVAS_EXTRA,
                                            CANVAS_RADIUS,
                                            SHADOW_COLOR,
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
            shadowLevel = Math.round(CANVAS_EXTRA/2*(audioLevel/0.3));
        }
        else if (audioLevel <= 0.6) {
            shadowLevel = Math.round(CANVAS_EXTRA/2*((audioLevel - 0.3) / 0.3));
        }
        else {
            shadowLevel = Math.round(CANVAS_EXTRA/2*((audioLevel - 0.6) / 0.4));
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
            if (canvas.width !== width + CANVAS_EXTRA) {
                canvas.width = width + CANVAS_EXTRA;
                resized = true;
            }

            if (canvas.heigh !== height + CANVAS_EXTRA) {
                canvas.height = height + CANVAS_EXTRA;
                resized = true;
            }
        });

        if (resized)
            Object.keys(audioLevelCanvasCache).forEach(function (resourceJid) {
                audioLevelCanvasCache[resourceJid].width
                    = width + CANVAS_EXTRA;
                audioLevelCanvasCache[resourceJid].height
                    = height + CANVAS_EXTRA;
            });
    });

    return my;

})(AudioLevels || {});

module.exports = AudioLevels;

},{"./CanvasUtil.js":8}],8:[function(require,module,exports){
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
        if (storedDisplayName) {
            nickname = storedDisplayName;

            Chat.setChatConversationMode(true);
        }

        $('#nickinput').keydown(function (event) {
            if (event.keyCode === 13) {
                event.preventDefault();
                var val = Util.escapeHtml(this.value);
                this.value = '';
                if (!nickname) {
                    nickname = val;
                    window.localStorage.displayname = nickname;
                    //this should be changed
                    connection.emuc.addDisplayNameToPresence(nickname);
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
                    connection.emuc.sendMessage(message, nickname);
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
        var videospace = $('#videospace');

        var chatSize = (chatspace.is(":visible")) ? [0, 0] : Chat.getChatSize();
        var videospaceWidth = window.innerWidth - chatSize[0];
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

        if (chatspace.is(":visible")) {
            videospace.animate({right: chatSize[0],
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

            $('#chatspace').hide("slide", { direction: "right",
                                            queue: false,
                                            duration: 500});
        }
        else {
            // Undock the toolbar when the chat is shown and if we're in a
            // video mode.
            if (VideoLayout.isLargeVideoVisible())
                Toolbar.dockToolbar(false);

            videospace.animate({right: chatSize[0],
                                width: videospaceWidth,
                                height: videospaceHeight},
                               {queue: false,
                                duration: 500,
                                complete: function () {
                                    scrollChatToBottom();
                                    chatspace.trigger('shown');
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

            $('#chatspace').show("slide", { direction: "right",
                                            queue: false,
                                            duration: 500});
        }

        // Request the focus in the nickname field or the chat input field.
        if ($('#nickname').css('visibility') === 'visible')
            $('#nickinput').focus();
        else {
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

            Toolbar.dockToolbar(true);

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

},{"./Replacement.js":10}],10:[function(require,module,exports){
function Replacement()
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

    /**
     * Processes links and smileys in "body"
     */
    Replacement.processReplacements = function(body)
    {
        //make links clickable
        body = linkify(body);

        //add smileys
        body = smilify(body);

        return body;
    }

    /**
     * Finds and replaces all links in the links in "body"
     * with their <a href=""></a>
     */
    Replacement.linkify = function(inputText)
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
}

module.exports = Replacement;




},{}],11:[function(require,module,exports){
/* global $, config, Prezi, Util, connection, setLargeVideoVisible, dockToolbar */
var Prezi = require("../prezi/Prezi.js");
//var UIUtil = require("../UIUtil.js");

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
                    Toolbar.dockToolbar(true);
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
                        Toolbar.dockToolbar(false);
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
},{"../prezi/Prezi.js":12}],12:[function(require,module,exports){
var PreziPlayer = require("./PreziPlayer.js");
var UIUtil = require("../UIUtil.js");

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
                    Toolbar.dockToolbar(true);
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
                        Toolbar.dockToolbar(false);
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
            $.prompt("Are you sure you would like to remove your Prezi?",
                    {
                    title: "Remove Prezi",
                    buttons: { "Remove": true, "Cancel": false},
                    defaultButton: 1,
                    submit: function(e,v,m,f){
                    if(v)
                    {
                        connection.emuc.removePreziFromPresence();
                        connection.emuc.sendPresence();
                    }
                }
            });
        }
        else if (preziPlayer != null) {
            $.prompt("Another participant is already sharing a Prezi." +
                    "This conference allows only one Prezi at a time.",
                     {
                     title: "Share a Prezi",
                     buttons: { "Ok": true},
                     defaultButton: 0,
                     submit: function(e,v,m,f){
                        $.prompt.close();
                     }
                     });
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

            var myPrompt = jQuery.prompt(openPreziState);

            myPrompt.on('impromptu:loaded', function(e) {
                        document.getElementById('preziUrl').focus();
                        });
            myPrompt.on('impromptu:statechanged', function(e) {
                        document.getElementById('preziUrl').focus();
                        });
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
},{"../UIUtil.js":5,"./PreziPlayer.js":13}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
var RTCBrowserType = {
    RTC_BROWSER_CHROME: "rtc_browser.chrome",

    RTC_BROWSER_FIREFOX: "rtc_browser.firefox"
};

module.exports = RTCBrowserType;
},{}],15:[function(require,module,exports){
var StreamEventTypes = {
    EVENT_TYPE_LOCAL_CREATED: "stream.local_created",

    EVENT_TYPE_LOCAL_ENDED: "stream.local_ended",

    EVENT_TYPE_REMOTE_CREATED: "stream.remote_created",

    EVENT_TYPE_REMOTE_ENDED: "stream.remote_ended"
};

module.exports = StreamEventTypes;
},{}]},{},[3])(3)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9Db250YWN0TGlzdC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL1Rvb2xiYXIuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9VSUFjdGl2YXRvci5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL1VJU2VydmljZS5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL1VJVXRpbC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL1ZpZGVvTGF5b3V0LmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvYXVkaW9sZXZlbHMvQXVkaW9MZXZlbHMuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9hdWRpb2xldmVscy9DYW52YXNVdGlsLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvY2hhdC9DaGF0LmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvY2hhdC9SZXBsYWNlbWVudC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL2V0aGVycGFkL0V0aGVycGFkLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvcHJlemkvUHJlemkuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9wcmV6aS9QcmV6aVBsYXllci5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L3NlcnZpY2UvUlRDL1JUQ0Jyb3dzZXJUeXBlLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvc2VydmljZS9SVEMvU3RyZWFtRXZlbnRUeXBlcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ24rQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcllBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBWaWRlb0xheW91dCA9IHJlcXVpcmUoXCIuL1ZpZGVvTGF5b3V0LmpzXCIpO1xuXG4vKipcbiAqIENvbnRhY3QgbGlzdC5cbiAqL1xudmFyIENvbnRhY3RMaXN0ID0gKGZ1bmN0aW9uIChteSkge1xuICAgIC8qKlxuICAgICAqIEluZGljYXRlcyBpZiB0aGUgY2hhdCBpcyBjdXJyZW50bHkgdmlzaWJsZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gPHR0PnRydWU8L3R0PiBpZiB0aGUgY2hhdCBpcyBjdXJyZW50bHkgdmlzaWJsZSwgPHR0PmZhbHNlPC90dD4gLVxuICAgICAqIG90aGVyd2lzZVxuICAgICAqL1xuICAgIG15LmlzVmlzaWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICQoJyNjb250YWN0bGlzdCcpLmlzKFwiOnZpc2libGVcIik7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYSBjb250YWN0IGZvciB0aGUgZ2l2ZW4gcGVlckppZCBpZiBzdWNoIGRvZXNuJ3QgeWV0IGV4aXN0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHBlZXJKaWQgdGhlIHBlZXJKaWQgY29ycmVzcG9uZGluZyB0byB0aGUgY29udGFjdFxuICAgICAqL1xuICAgIG15LmVuc3VyZUFkZENvbnRhY3QgPSBmdW5jdGlvbihwZWVySmlkKSB7XG4gICAgICAgIHZhciByZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHBlZXJKaWQpO1xuXG4gICAgICAgIHZhciBjb250YWN0ID0gJCgnI2NvbnRhY3RsaXN0PnVsPmxpW2lkPVwiJyArIHJlc291cmNlSmlkICsgJ1wiXScpO1xuXG4gICAgICAgIGlmICghY29udGFjdCB8fCBjb250YWN0Lmxlbmd0aCA8PSAwKVxuICAgICAgICAgICAgQ29udGFjdExpc3QuYWRkQ29udGFjdChwZWVySmlkKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQWRkcyBhIGNvbnRhY3QgZm9yIHRoZSBnaXZlbiBwZWVyIGppZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBwZWVySmlkIHRoZSBqaWQgb2YgdGhlIGNvbnRhY3QgdG8gYWRkXG4gICAgICovXG4gICAgbXkuYWRkQ29udGFjdCA9IGZ1bmN0aW9uKHBlZXJKaWQpIHtcbiAgICAgICAgdmFyIHJlc291cmNlSmlkID0gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQocGVlckppZCk7XG5cbiAgICAgICAgdmFyIGNvbnRhY3RsaXN0ID0gJCgnI2NvbnRhY3RsaXN0PnVsJyk7XG5cbiAgICAgICAgdmFyIG5ld0NvbnRhY3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuICAgICAgICBuZXdDb250YWN0LmlkID0gcmVzb3VyY2VKaWQ7XG5cbiAgICAgICAgbmV3Q29udGFjdC5hcHBlbmRDaGlsZChjcmVhdGVBdmF0YXIoKSk7XG4gICAgICAgIG5ld0NvbnRhY3QuYXBwZW5kQ2hpbGQoY3JlYXRlRGlzcGxheU5hbWVQYXJhZ3JhcGgoXCJQYXJ0aWNpcGFudFwiKSk7XG5cbiAgICAgICAgdmFyIGNsRWxlbWVudCA9IGNvbnRhY3RsaXN0LmdldCgwKTtcblxuICAgICAgICBpZiAocmVzb3VyY2VKaWQgPT09IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQpXG4gICAgICAgICAgICAmJiAkKCcjY29udGFjdGxpc3Q+dWwgLnRpdGxlJylbMF0ubmV4dFNpYmxpbmcubmV4dFNpYmxpbmcpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNsRWxlbWVudC5pbnNlcnRCZWZvcmUobmV3Q29udGFjdCxcbiAgICAgICAgICAgICAgICAgICAgJCgnI2NvbnRhY3RsaXN0PnVsIC50aXRsZScpWzBdLm5leHRTaWJsaW5nLm5leHRTaWJsaW5nKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNsRWxlbWVudC5hcHBlbmRDaGlsZChuZXdDb250YWN0KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGEgY29udGFjdCBmb3IgdGhlIGdpdmVuIHBlZXIgamlkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHBlZXJKaWQgdGhlIHBlZXJKaWQgY29ycmVzcG9uZGluZyB0byB0aGUgY29udGFjdCB0byByZW1vdmVcbiAgICAgKi9cbiAgICBteS5yZW1vdmVDb250YWN0ID0gZnVuY3Rpb24ocGVlckppZCkge1xuICAgICAgICB2YXIgcmVzb3VyY2VKaWQgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChwZWVySmlkKTtcblxuICAgICAgICB2YXIgY29udGFjdCA9ICQoJyNjb250YWN0bGlzdD51bD5saVtpZD1cIicgKyByZXNvdXJjZUppZCArICdcIl0nKTtcblxuICAgICAgICBpZiAoY29udGFjdCAmJiBjb250YWN0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBjb250YWN0bGlzdCA9ICQoJyNjb250YWN0bGlzdD51bCcpO1xuXG4gICAgICAgICAgICBjb250YWN0bGlzdC5nZXQoMCkucmVtb3ZlQ2hpbGQoY29udGFjdC5nZXQoMCkpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIE9wZW5zIC8gY2xvc2VzIHRoZSBjb250YWN0IGxpc3QgYXJlYS5cbiAgICAgKi9cbiAgICBteS50b2dnbGVDb250YWN0TGlzdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNvbnRhY3RsaXN0ID0gJCgnI2NvbnRhY3RsaXN0Jyk7XG4gICAgICAgIHZhciB2aWRlb3NwYWNlID0gJCgnI3ZpZGVvc3BhY2UnKTtcblxuICAgICAgICB2YXIgY2hhdFNpemUgPSAoQ29udGFjdExpc3QuaXNWaXNpYmxlKCkpID8gWzAsIDBdIDogQ2hhdC5nZXRDaGF0U2l6ZSgpO1xuICAgICAgICB2YXIgdmlkZW9zcGFjZVdpZHRoID0gd2luZG93LmlubmVyV2lkdGggLSBjaGF0U2l6ZVswXTtcbiAgICAgICAgdmFyIHZpZGVvc3BhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIHZhciB2aWRlb1NpemVcbiAgICAgICAgICAgID0gZ2V0VmlkZW9TaXplKG51bGwsIG51bGwsIHZpZGVvc3BhY2VXaWR0aCwgdmlkZW9zcGFjZUhlaWdodCk7XG4gICAgICAgIHZhciB2aWRlb1dpZHRoID0gdmlkZW9TaXplWzBdO1xuICAgICAgICB2YXIgdmlkZW9IZWlnaHQgPSB2aWRlb1NpemVbMV07XG4gICAgICAgIHZhciB2aWRlb1Bvc2l0aW9uID0gZ2V0VmlkZW9Qb3NpdGlvbih2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb3NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb3NwYWNlSGVpZ2h0KTtcbiAgICAgICAgdmFyIGhvcml6b250YWxJbmRlbnQgPSB2aWRlb1Bvc2l0aW9uWzBdO1xuICAgICAgICB2YXIgdmVydGljYWxJbmRlbnQgPSB2aWRlb1Bvc2l0aW9uWzFdO1xuXG4gICAgICAgIHZhciB0aHVtYm5haWxTaXplID0gVmlkZW9MYXlvdXQuY2FsY3VsYXRlVGh1bWJuYWlsU2l6ZSh2aWRlb3NwYWNlV2lkdGgpO1xuICAgICAgICB2YXIgdGh1bWJuYWlsc1dpZHRoID0gdGh1bWJuYWlsU2l6ZVswXTtcbiAgICAgICAgdmFyIHRodW1ibmFpbHNIZWlnaHQgPSB0aHVtYm5haWxTaXplWzFdO1xuXG4gICAgICAgIGlmIChDb250YWN0TGlzdC5pc1Zpc2libGUoKSkge1xuICAgICAgICAgICAgdmlkZW9zcGFjZS5hbmltYXRlKHtyaWdodDogY2hhdFNpemVbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiB2aWRlb3NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogdmlkZW9zcGFjZUhlaWdodH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDB9KTtcblxuICAgICAgICAgICAgJCgnI3JlbW90ZVZpZGVvcycpLmFuaW1hdGUoe2hlaWdodDogdGh1bWJuYWlsc0hlaWdodH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3F1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwfSk7XG5cbiAgICAgICAgICAgICQoJyNyZW1vdGVWaWRlb3M+c3BhbicpLmFuaW1hdGUoe2hlaWdodDogdGh1bWJuYWlsc0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHRodW1ibmFpbHNXaWR0aH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicmVtb3RldmlkZW8ucmVzaXplZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbdGh1bWJuYWlsc1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGh1bWJuYWlsc0hlaWdodF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9fSk7XG5cbiAgICAgICAgICAgICQoJyNsYXJnZVZpZGVvQ29udGFpbmVyJykuYW5pbWF0ZSh7IHdpZHRoOiB2aWRlb3NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZpZGVvc3BhY2VIZWlnaHR9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3F1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5hbmltYXRlKHsgIHdpZHRoOiB2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9wOiB2ZXJ0aWNhbEluZGVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3R0b206IHZlcnRpY2FsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQ6IGhvcml6b250YWxJbmRlbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IGhvcml6b250YWxJbmRlbnR9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgICBxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgJCgnI2NvbnRhY3RsaXN0JykuaGlkZShcInNsaWRlXCIsIHsgZGlyZWN0aW9uOiBcInJpZ2h0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gVW5kb2NrIHRoZSB0b29sYmFyIHdoZW4gdGhlIGNoYXQgaXMgc2hvd24gYW5kIGlmIHdlJ3JlIGluIGEgXG4gICAgICAgICAgICAvLyB2aWRlbyBtb2RlLlxuICAgICAgICAgICAgaWYgKFZpZGVvTGF5b3V0LmlzTGFyZ2VWaWRlb1Zpc2libGUoKSlcbiAgICAgICAgICAgICAgICBUb29sYmFyLmRvY2tUb29sYmFyKGZhbHNlKTtcblxuICAgICAgICAgICAgdmlkZW9zcGFjZS5hbmltYXRlKHtyaWdodDogY2hhdFNpemVbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiB2aWRlb3NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogdmlkZW9zcGFjZUhlaWdodH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3F1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhY3RsaXN0LnRyaWdnZXIoJ3Nob3duJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgJCgnI3JlbW90ZVZpZGVvcycpLmFuaW1hdGUoe2hlaWdodDogdGh1bWJuYWlsc0hlaWdodH0sXG4gICAgICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDB9KTtcblxuICAgICAgICAgICAgJCgnI3JlbW90ZVZpZGVvcz5zcGFuJykuYW5pbWF0ZSh7aGVpZ2h0OiB0aHVtYm5haWxzSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHRodW1ibmFpbHNXaWR0aH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJyZW1vdGV2aWRlby5yZXNpemVkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbdGh1bWJuYWlsc1dpZHRoLCB0aHVtYm5haWxzSGVpZ2h0XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9fSk7XG5cbiAgICAgICAgICAgICQoJyNsYXJnZVZpZGVvQ29udGFpbmVyJykuYW5pbWF0ZSh7IHdpZHRoOiB2aWRlb3NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZpZGVvc3BhY2VIZWlnaHR9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3F1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5hbmltYXRlKHsgIHdpZHRoOiB2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9wOiB2ZXJ0aWNhbEluZGVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3R0b206IHZlcnRpY2FsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQ6IGhvcml6b250YWxJbmRlbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IGhvcml6b250YWxJbmRlbnR9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgJCgnI2NvbnRhY3RsaXN0Jykuc2hvdyhcInNsaWRlXCIsIHsgZGlyZWN0aW9uOiBcInJpZ2h0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgdGhlIGF2YXRhciBlbGVtZW50LlxuICAgICAqIFxuICAgICAqIEByZXR1cm4gdGhlIG5ld2x5IGNyZWF0ZWQgYXZhdGFyIGVsZW1lbnRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVBdmF0YXIoKSB7XG4gICAgICAgIHZhciBhdmF0YXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpJyk7XG4gICAgICAgIGF2YXRhci5jbGFzc05hbWUgPSBcImljb24tYXZhdGFyIGF2YXRhclwiO1xuXG4gICAgICAgIHJldHVybiBhdmF0YXI7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgdGhlIGRpc3BsYXkgbmFtZSBwYXJhZ3JhcGguXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGlzcGxheU5hbWUgdGhlIGRpc3BsYXkgbmFtZSB0byBzZXRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVEaXNwbGF5TmFtZVBhcmFncmFwaChkaXNwbGF5TmFtZSkge1xuICAgICAgICB2YXIgcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcbiAgICAgICAgcC5pbm5lckhUTUwgPSBkaXNwbGF5TmFtZTtcblxuICAgICAgICByZXR1cm4gcDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSW5kaWNhdGVzIHRoYXQgdGhlIGRpc3BsYXkgbmFtZSBoYXMgY2hhbmdlZC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCAgICdkaXNwbGF5bmFtZWNoYW5nZWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKGV2ZW50LCBwZWVySmlkLCBkaXNwbGF5TmFtZSkge1xuICAgICAgICBpZiAocGVlckppZCA9PT0gJ2xvY2FsVmlkZW9Db250YWluZXInKVxuICAgICAgICAgICAgcGVlckppZCA9IGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQ7XG5cbiAgICAgICAgdmFyIHJlc291cmNlSmlkID0gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQocGVlckppZCk7XG5cbiAgICAgICAgdmFyIGNvbnRhY3ROYW1lID0gJCgnI2NvbnRhY3RsaXN0ICMnICsgcmVzb3VyY2VKaWQgKyAnPnAnKTtcblxuICAgICAgICBpZiAoY29udGFjdE5hbWUgJiYgZGlzcGxheU5hbWUgJiYgZGlzcGxheU5hbWUubGVuZ3RoID4gMClcbiAgICAgICAgICAgIGNvbnRhY3ROYW1lLmh0bWwoZGlzcGxheU5hbWUpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG15O1xufShDb250YWN0TGlzdCB8fCB7fSkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRhY3RMaXN0O1xuIiwidmFyIFRvb2xiYXIgPSAoZnVuY3Rpb24gKG15KSB7XG4gICAgdmFyIElOSVRJQUxfVE9PTEJBUl9USU1FT1VUID0gMjAwMDA7XG4gICAgdmFyIFRPT0xCQVJfVElNRU9VVCA9IElOSVRJQUxfVE9PTEJBUl9USU1FT1VUO1xuXG4gICAgdmFyIHRvb2xiYXJUaW1lb3V0ID0gbnVsbDtcblxuICAgIC8qKlxuICAgICAqIE9wZW5zIHRoZSBsb2NrIHJvb20gZGlhbG9nLlxuICAgICAqL1xuICAgIG15Lm9wZW5Mb2NrRGlhbG9nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBPbmx5IHRoZSBmb2N1cyBpcyBhYmxlIHRvIHNldCBhIHNoYXJlZCBrZXkuXG4gICAgICAgIGlmIChmb2N1cyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKHNoYXJlZEtleSlcbiAgICAgICAgICAgICAgICAkLnByb21wdChcIlRoaXMgY29udmVyc2F0aW9uIGlzIGN1cnJlbnRseSBwcm90ZWN0ZWQgYnlcIlxuICAgICAgICAgICAgICAgICAgICAgICAgKyBcIiBhIHNoYXJlZCBzZWNyZXQga2V5LlwiLFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCJTZWNyZXQga2V5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBwZXJzaXN0ZW50OiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAkLnByb21wdChcIlRoaXMgY29udmVyc2F0aW9uIGlzbid0IGN1cnJlbnRseSBwcm90ZWN0ZWQgYnlcIlxuICAgICAgICAgICAgICAgICAgICAgICAgKyBcIiBhIHNlY3JldCBrZXkuIE9ubHkgdGhlIG93bmVyIG9mIHRoZSBjb25mZXJlbmNlXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICsgXCIgY291bGQgc2V0IGEgc2hhcmVkIGtleS5cIixcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IFwiU2VjcmV0IGtleVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGVyc2lzdGVudDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoc2hhcmVkS2V5KSB7XG4gICAgICAgICAgICAgICAgJC5wcm9tcHQoXCJBcmUgeW91IHN1cmUgeW91IHdvdWxkIGxpa2UgdG8gcmVtb3ZlIHlvdXIgc2VjcmV0IGtleT9cIixcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IFwiUmVtb3ZlIHNlY3JldCBrZXlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlcnNpc3RlbnQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgYnV0dG9uczogeyBcIlJlbW92ZVwiOiB0cnVlLCBcIkNhbmNlbFwiOiBmYWxzZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0QnV0dG9uOiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3VibWl0OiBmdW5jdGlvbiAoZSwgdiwgbSwgZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldFNoYXJlZEtleSgnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2tSb29tKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkLnByb21wdCgnPGgyPlNldCBhIHNlY3JldCBrZXkgdG8gbG9jayB5b3VyIHJvb208L2gyPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICc8aW5wdXQgaWQ9XCJsb2NrS2V5XCIgdHlwZT1cInRleHRcIiBwbGFjZWhvbGRlcj1cInlvdXIgc2hhcmVkIGtleVwiIGF1dG9mb2N1cz4nLFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwZXJzaXN0ZW50OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1dHRvbnM6IHsgXCJTYXZlXCI6IHRydWUsIFwiQ2FuY2VsXCI6IGZhbHNlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRCdXR0b246IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2FkZWQ6IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsb2NrS2V5JykuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWJtaXQ6IGZ1bmN0aW9uIChlLCB2LCBtLCBmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxvY2tLZXkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9ja0tleScpO1xuICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobG9ja0tleS52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0U2hhcmVkS2V5KFV0aWwuZXNjYXBlSHRtbChsb2NrS2V5LnZhbHVlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NrUm9vbSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogT3BlbnMgdGhlIGludml0ZSBsaW5rIGRpYWxvZy5cbiAgICAgKi9cbiAgICBteS5vcGVuTGlua0RpYWxvZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGludml0ZUxpbms7XG4gICAgICAgIGlmIChyb29tVXJsID09IG51bGwpXG4gICAgICAgICAgICBpbnZpdGVMaW5rID0gXCJZb3VyIGNvbmZlcmVuY2UgaXMgY3VycmVudGx5IGJlaW5nIGNyZWF0ZWQuLi5cIjtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgaW52aXRlTGluayA9IGVuY29kZVVSSShyb29tVXJsKTtcblxuICAgICAgICAkLnByb21wdCgnPGlucHV0IGlkPVwiaW52aXRlTGlua1JlZlwiIHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCInICtcbiAgICAgICAgICAgICAgICBpbnZpdGVMaW5rICsgJ1wiIG9uY2xpY2s9XCJ0aGlzLnNlbGVjdCgpO1wiIHJlYWRvbmx5PicsXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCJTaGFyZSB0aGlzIGxpbmsgd2l0aCBldmVyeW9uZSB5b3Ugd2FudCB0byBpbnZpdGVcIixcbiAgICAgICAgICAgICAgICAgICAgcGVyc2lzdGVudDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGJ1dHRvbnM6IHsgXCJJbnZpdGVcIjogdHJ1ZSwgXCJDYW5jZWxcIjogZmFsc2V9LFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0QnV0dG9uOiAxLFxuICAgICAgICAgICAgICAgICAgICBsb2FkZWQ6IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJvb21VcmwpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ludml0ZUxpbmtSZWYnKS5zZWxlY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanFpX3N0YXRlMF9idXR0b25JbnZpdGUnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzdWJtaXQ6IGZ1bmN0aW9uIChlLCB2LCBtLCBmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyb29tVXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludml0ZVBhcnRpY2lwYW50cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEludml0ZSBwYXJ0aWNpcGFudHMgdG8gY29uZmVyZW5jZS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpbnZpdGVQYXJ0aWNpcGFudHMoKSB7XG4gICAgICAgIGlmIChyb29tVXJsID09IG51bGwpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgdmFyIHNoYXJlZEtleVRleHQgPSBcIlwiO1xuICAgICAgICBpZiAoc2hhcmVkS2V5ICYmIHNoYXJlZEtleS5sZW5ndGggPiAwKVxuICAgICAgICAgICAgc2hhcmVkS2V5VGV4dFxuICAgICAgICAgICAgICAgID0gXCJUaGlzIGNvbmZlcmVuY2UgaXMgcGFzc3dvcmQgcHJvdGVjdGVkLiBQbGVhc2UgdXNlIHRoZSBcIlxuICAgICAgICAgICAgICAgICAgICArIFwiZm9sbG93aW5nIHBpbiB3aGVuIGpvaW5pbmc6JTBEJTBBJTBEJTBBXCJcbiAgICAgICAgICAgICAgICAgICAgKyBzaGFyZWRLZXkgKyBcIiUwRCUwQSUwRCUwQVwiO1xuXG4gICAgICAgIHZhciBjb25mZXJlbmNlTmFtZSA9IHJvb21Vcmwuc3Vic3RyaW5nKHJvb21VcmwubGFzdEluZGV4T2YoJy8nKSArIDEpO1xuICAgICAgICB2YXIgc3ViamVjdCA9IFwiSW52aXRhdGlvbiB0byBhIEppdHNpIE1lZXQgKFwiICsgY29uZmVyZW5jZU5hbWUgKyBcIilcIjtcbiAgICAgICAgdmFyIGJvZHkgPSBcIkhleSB0aGVyZSwgSSUyN2QgbGlrZSB0byBpbnZpdGUgeW91IHRvIGEgSml0c2kgTWVldFwiICtcbiAgICAgICAgICAgICAgICAgICAgXCIgY29uZmVyZW5jZSBJJTI3dmUganVzdCBzZXQgdXAuJTBEJTBBJTBEJTBBXCIgK1xuICAgICAgICAgICAgICAgICAgICBcIlBsZWFzZSBjbGljayBvbiB0aGUgZm9sbG93aW5nIGxpbmsgaW4gb3JkZXJcIiArXG4gICAgICAgICAgICAgICAgICAgIFwiIHRvIGpvaW4gdGhlIGNvbmZlcmVuY2UuJTBEJTBBJTBEJTBBXCIgK1xuICAgICAgICAgICAgICAgICAgICByb29tVXJsICtcbiAgICAgICAgICAgICAgICAgICAgXCIlMEQlMEElMEQlMEFcIiArXG4gICAgICAgICAgICAgICAgICAgIHNoYXJlZEtleVRleHQgK1xuICAgICAgICAgICAgICAgICAgICBcIk5vdGUgdGhhdCBKaXRzaSBNZWV0IGlzIGN1cnJlbnRseSBvbmx5IHN1cHBvcnRlZCBieSBDaHJvbWl1bSxcIiArXG4gICAgICAgICAgICAgICAgICAgIFwiIEdvb2dsZSBDaHJvbWUgYW5kIE9wZXJhLCBzbyB5b3UgbmVlZFwiICtcbiAgICAgICAgICAgICAgICAgICAgXCIgdG8gYmUgdXNpbmcgb25lIG9mIHRoZXNlIGJyb3dzZXJzLiUwRCUwQSUwRCUwQVwiICtcbiAgICAgICAgICAgICAgICAgICAgXCJUYWxrIHRvIHlvdSBpbiBhIHNlYyFcIjtcblxuICAgICAgICBpZiAod2luZG93LmxvY2FsU3RvcmFnZS5kaXNwbGF5bmFtZSlcbiAgICAgICAgICAgIGJvZHkgKz0gXCIlMEQlMEElMEQlMEFcIiArIHdpbmRvdy5sb2NhbFN0b3JhZ2UuZGlzcGxheW5hbWU7XG5cbiAgICAgICAgd2luZG93Lm9wZW4oXCJtYWlsdG86P3N1YmplY3Q9XCIgKyBzdWJqZWN0ICsgXCImYm9keT1cIiArIGJvZHksICdfYmxhbmsnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBPcGVucyB0aGUgc2V0dGluZ3MgZGlhbG9nLlxuICAgICAqL1xuICAgIG15Lm9wZW5TZXR0aW5nc0RpYWxvZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJC5wcm9tcHQoJzxoMj5Db25maWd1cmUgeW91ciBjb25mZXJlbmNlPC9oMj4nICtcbiAgICAgICAgICAgICc8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgaWQ9XCJpbml0TXV0ZWRcIj4gUGFydGljaXBhbnRzIGpvaW4gbXV0ZWQ8YnIvPicgK1xuICAgICAgICAgICAgJzxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBpZD1cInJlcXVpcmVOaWNrbmFtZXNcIj4gUmVxdWlyZSBuaWNrbmFtZXM8YnIvPjxici8+JyArXG4gICAgICAgICAgICAnU2V0IGEgc2VjcmV0IGtleSB0byBsb2NrIHlvdXIgcm9vbTogPGlucHV0IGlkPVwibG9ja0tleVwiIHR5cGU9XCJ0ZXh0XCIgcGxhY2Vob2xkZXI9XCJ5b3VyIHNoYXJlZCBrZXlcIiBhdXRvZm9jdXM+JyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBwZXJzaXN0ZW50OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBidXR0b25zOiB7IFwiU2F2ZVwiOiB0cnVlLCBcIkNhbmNlbFwiOiBmYWxzZX0sXG4gICAgICAgICAgICAgICAgZGVmYXVsdEJ1dHRvbjogMSxcbiAgICAgICAgICAgICAgICBsb2FkZWQ6IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9ja0tleScpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzdWJtaXQ6IGZ1bmN0aW9uIChlLCB2LCBtLCBmKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJCgnI2luaXRNdXRlZCcpLmlzKFwiOmNoZWNrZWRcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpdCBpcyBjaGVja2VkXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJCgnI3JlcXVpcmVOaWNrbmFtZXMnKS5pcyhcIjpjaGVja2VkXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaXQgaXMgY2hlY2tlZFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsb2NrS2V5ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2tLZXknKTtcbiAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsb2NrS2V5LnZhbHVlKVxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldFNoYXJlZEtleShsb2NrS2V5LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NrUm9vbSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlIGFwcGxpY2F0aW9uIGluIGFuZCBvdXQgb2YgZnVsbCBzY3JlZW4gbW9kZVxuICAgICAqIChhLmsuYS4gcHJlc2VudGF0aW9uIG1vZGUgaW4gQ2hyb21lKS5cbiAgICAgKi9cbiAgICBteS50b2dnbGVGdWxsU2NyZWVuID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBmc0VsZW1lbnQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG5cbiAgICAgICAgaWYgKCFkb2N1bWVudC5tb3pGdWxsU2NyZWVuICYmICFkb2N1bWVudC53ZWJraXRJc0Z1bGxTY3JlZW4pIHtcbiAgICAgICAgICAgIC8vRW50ZXIgRnVsbCBTY3JlZW5cbiAgICAgICAgICAgIGlmIChmc0VsZW1lbnQubW96UmVxdWVzdEZ1bGxTY3JlZW4pIHtcbiAgICAgICAgICAgICAgICBmc0VsZW1lbnQubW96UmVxdWVzdEZ1bGxTY3JlZW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGZzRWxlbWVudC53ZWJraXRSZXF1ZXN0RnVsbFNjcmVlbihFbGVtZW50LkFMTE9XX0tFWUJPQVJEX0lOUFVUKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vRXhpdCBGdWxsIFNjcmVlblxuICAgICAgICAgICAgaWYgKGRvY3VtZW50Lm1vekNhbmNlbEZ1bGxTY3JlZW4pIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5tb3pDYW5jZWxGdWxsU2NyZWVuKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LndlYmtpdENhbmNlbEZ1bGxTY3JlZW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTaG93cyB0aGUgbWFpbiB0b29sYmFyLlxuICAgICAqL1xuICAgIG15LnNob3dUb29sYmFyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICghJCgnI2hlYWRlcicpLmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICAgICAgICAkKCcjaGVhZGVyJykuc2hvdyhcInNsaWRlXCIsIHsgZGlyZWN0aW9uOiBcInVwXCIsIGR1cmF0aW9uOiAzMDB9KTtcbiAgICAgICAgICAgICQoJyNzdWJqZWN0JykuYW5pbWF0ZSh7dG9wOiBcIis9NDBcIn0sIDMwMCk7XG5cbiAgICAgICAgICAgIGlmICh0b29sYmFyVGltZW91dCkge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0b29sYmFyVGltZW91dCk7XG4gICAgICAgICAgICAgICAgdG9vbGJhclRpbWVvdXQgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdG9vbGJhclRpbWVvdXQgPSBzZXRUaW1lb3V0KGhpZGVUb29sYmFyLCBUT09MQkFSX1RJTUVPVVQpO1xuICAgICAgICAgICAgVE9PTEJBUl9USU1FT1VUID0gNDAwMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmb2N1cyAhPSBudWxsKVxuICAgICAgICB7XG4vLyAgICAgICAgICAgIFRPRE86IEVuYWJsZSBzZXR0aW5ncyBmdW5jdGlvbmFsaXR5LiBOZWVkIHRvIHVuY29tbWVudCB0aGUgc2V0dGluZ3MgYnV0dG9uIGluIGluZGV4Lmh0bWwuXG4vLyAgICAgICAgICAgICQoJyNzZXR0aW5nc0J1dHRvbicpLmNzcyh7dmlzaWJpbGl0eTpcInZpc2libGVcIn0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2hvdy9oaWRlIGRlc2t0b3Agc2hhcmluZyBidXR0b25cbiAgICAgICAgc2hvd0Rlc2t0b3BTaGFyaW5nQnV0dG9uKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIERvY2tzL3VuZG9ja3MgdGhlIHRvb2xiYXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaXNEb2NrIGluZGljYXRlcyB3aGF0IG9wZXJhdGlvbiB0byBwZXJmb3JtXG4gICAgICovXG4gICAgbXkuZG9ja1Rvb2xiYXIgPSBmdW5jdGlvbihpc0RvY2spIHtcbiAgICAgICAgaWYgKGlzRG9jaykge1xuICAgICAgICAgICAgLy8gRmlyc3QgbWFrZSBzdXJlIHRoZSB0b29sYmFyIGlzIHNob3duLlxuICAgICAgICAgICAgaWYgKCEkKCcjaGVhZGVyJykuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICAgICBUb29sYmFyLnNob3dUb29sYmFyKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRoZW4gY2xlYXIgdGhlIHRpbWUgb3V0LCB0byBkb2NrIHRoZSB0b29sYmFyLlxuICAgICAgICAgICAgaWYgKHRvb2xiYXJUaW1lb3V0KSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRvb2xiYXJUaW1lb3V0KTtcbiAgICAgICAgICAgICAgICB0b29sYmFyVGltZW91dCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAoISQoJyNoZWFkZXInKS5pcygnOnZpc2libGUnKSkge1xuICAgICAgICAgICAgICAgIFRvb2xiYXIuc2hvd1Rvb2xiYXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRvb2xiYXJUaW1lb3V0ID0gc2V0VGltZW91dChoaWRlVG9vbGJhciwgVE9PTEJBUl9USU1FT1VUKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBsb2NrIGJ1dHRvbiBzdGF0ZS5cbiAgICAgKi9cbiAgICBteS51cGRhdGVMb2NrQnV0dG9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGJ1dHRvbkNsaWNrKFwiI2xvY2tJY29uXCIsIFwiaWNvbi1zZWN1cml0eSBpY29uLXNlY3VyaXR5LWxvY2tlZFwiKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSGlkZXMgdGhlIHRvb2xiYXIuXG4gICAgICovXG4gICAgdmFyIGhpZGVUb29sYmFyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaXNUb29sYmFySG92ZXIgPSBmYWxzZTtcbiAgICAgICAgJCgnI2hlYWRlcicpLmZpbmQoJyonKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBpZCA9ICQodGhpcykuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmICgkKFwiI1wiICsgaWQgKyBcIjpob3ZlclwiKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaXNUb29sYmFySG92ZXIgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBjbGVhclRpbWVvdXQodG9vbGJhclRpbWVvdXQpO1xuICAgICAgICB0b29sYmFyVGltZW91dCA9IG51bGw7XG5cbiAgICAgICAgaWYgKCFpc1Rvb2xiYXJIb3Zlcikge1xuICAgICAgICAgICAgJCgnI2hlYWRlcicpLmhpZGUoXCJzbGlkZVwiLCB7IGRpcmVjdGlvbjogXCJ1cFwiLCBkdXJhdGlvbjogMzAwfSk7XG4gICAgICAgICAgICAkKCcjc3ViamVjdCcpLmFuaW1hdGUoe3RvcDogXCItPTQwXCJ9LCAzMDApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdG9vbGJhclRpbWVvdXQgPSBzZXRUaW1lb3V0KGhpZGVUb29sYmFyLCBUT09MQkFSX1RJTUVPVVQpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vIFNob3dzIG9yIGhpZGVzIHRoZSAncmVjb3JkaW5nJyBidXR0b24uXG4gICAgbXkuc2hvd1JlY29yZGluZ0J1dHRvbiA9IGZ1bmN0aW9uIChzaG93KSB7XG4gICAgICAgIGlmICghY29uZmlnLmVuYWJsZVJlY29yZGluZykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNob3cpIHtcbiAgICAgICAgICAgICQoJyNyZWNvcmRpbmcnKS5jc3Moe2Rpc3BsYXk6IFwiaW5saW5lXCJ9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICQoJyNyZWNvcmRpbmcnKS5jc3Moe2Rpc3BsYXk6IFwibm9uZVwifSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gVG9nZ2xlIHRoZSBzdGF0ZSBvZiB0aGUgcmVjb3JkaW5nIGJ1dHRvblxuICAgIG15LnRvZ2dsZVJlY29yZGluZ0J1dHRvblN0YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICQoJyNyZWNvcmRCdXR0b24nKS50b2dnbGVDbGFzcygnYWN0aXZlJyk7XG4gICAgfTtcblxuICAgIC8vIFNob3dzIG9yIGhpZGVzIFNJUCBjYWxscyBidXR0b25cbiAgICBteS5zaG93U2lwQ2FsbEJ1dHRvbiA9IGZ1bmN0aW9uIChzaG93KVxuICAgIHtcbiAgICAgICAgaWYgKGNvbmZpZy5ob3N0cy5jYWxsX2NvbnRyb2wgJiYgc2hvdylcbiAgICAgICAge1xuICAgICAgICAgICAgJCgnI3NpcENhbGxCdXR0b24nKS5jc3Moe2Rpc3BsYXk6IFwiaW5saW5lXCJ9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgIHtcbiAgICAgICAgICAgICQoJyNzaXBDYWxsQnV0dG9uJykuY3NzKHtkaXNwbGF5OiBcIm5vbmVcIn0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBteTtcbn0oVG9vbGJhciB8fCB7fSkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRvb2xiYXI7XG4iLCJ2YXIgVUlTZXJ2aWNlID0gcmVxdWlyZShcIi4vVUlTZXJ2aWNlXCIpO1xudmFyIFZpZGVvTGF5b3V0ID0gcmVxdWlyZShcIi4vVmlkZW9MYXlvdXQuanNcIik7XG52YXIgQXVkaW9MZXZlbHMgPSByZXF1aXJlKFwiLi9hdWRpb2xldmVscy9BdWRpb0xldmVscy5qc1wiKTtcbnZhciBQcmV6aSA9IHJlcXVpcmUoXCIuL3ByZXppL1ByZXppLmpzXCIpO1xudmFyIEV0aGVycGFkID0gcmVxdWlyZShcIi4vZXRoZXJwYWQvRXRoZXJwYWQuanNcIik7XG52YXIgQ2hhdCA9IHJlcXVpcmUoXCIuL2NoYXQvQ2hhdC5qc1wiKTtcbnZhciBTdHJlYW1FdmVudFR5cGVzID0gcmVxdWlyZShcIi4uL3NlcnZpY2UvUlRDL1N0cmVhbUV2ZW50VHlwZXMuanNcIik7XG5cbnZhciBVSUFjdGl2YXRvciA9IGZ1bmN0aW9uKClcbntcbiAgICB2YXIgdWlTZXJ2aWNlID0gbnVsbDtcbiAgICBmdW5jdGlvbiBVSUFjdGl2YXRvclByb3RvKClcbiAgICB7XG5cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXR1cFByZXppKClcbiAgICB7XG4gICAgICAgICQoXCIjdG9vbGJhcl9wcmV6aVwiKS5jbGljayhmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIFByZXppLm9wZW5QcmV6aURpYWxvZygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkKFwiI3JlbG9hZFByZXNlbnRhdGlvbkxpbmtcIikuY2xpY2soZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICBQcmV6aS5yZWxvYWRQcmVzZW50YXRpb24oKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXR1cEV0aGVycGFkKClcbiAgICB7XG4gICAgICAgICQoXCIjdG9vbGJhcl9ldGhlcnBhZFwiKS5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBFdGhlcnBhZC50b2dnbGVFdGhlcnBhZCgwKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXR1cEF1ZGlvTGV2ZWxzKCkge1xuICAgICAgICBTdGF0aXN0aWNzQWN0aXZhdG9yLmFkZEF1ZGlvTGV2ZWxMaXN0ZW5lcihBdWRpb0xldmVscy51cGRhdGVBdWRpb0xldmVsKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXR1cENoYXQoKVxuICAgIHtcbiAgICAgICAgQ2hhdC5pbml0KCk7XG4gICAgICAgICQoXCIjdG9vbGJhcl9jaGF0XCIpLmNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIENoYXQudG9nZ2xlQ2hhdCgpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldHVwVmlkZW9MYXlvdXRFdmVudHMoKVxuICAgIHtcblxuICAgICAgICAkKGRvY3VtZW50KS5iaW5kKCdjYWxsYWN0aXZlLmppbmdsZScsIGZ1bmN0aW9uIChldmVudCwgdmlkZW9lbGVtLCBzaWQpIHtcbiAgICAgICAgICAgIGlmICh2aWRlb2VsZW0uYXR0cignaWQnKS5pbmRleE9mKCdtaXhlZG1zbGFiZWwnKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAvLyBpZ25vcmUgbWl4ZWRtc2xhYmVsYTAgYW5kIHYwXG4gICAgICAgICAgICAgICAgdmlkZW9lbGVtLnNob3coKTtcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5yZXNpemVUaHVtYm5haWxzKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGxhcmdlIHZpZGVvIHRvIHRoZSBsYXN0IGFkZGVkIHZpZGVvIG9ubHkgaWYgdGhlcmUncyBub1xuICAgICAgICAgICAgICAgIC8vIGN1cnJlbnQgYWN0aXZlIG9yIGZvY3VzZWQgc3BlYWtlci5cbiAgICAgICAgICAgICAgICBpZiAoIVZpZGVvTGF5b3V0LmZvY3VzZWRWaWRlb1NyYyAmJiAhVmlkZW9MYXlvdXQuZ2V0RG9taW5hbnRTcGVha2VyUmVzb3VyY2VKaWQoKSlcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQudXBkYXRlTGFyZ2VWaWRlbyh2aWRlb2VsZW0uYXR0cignc3JjJyksIDEpO1xuXG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0ZvY3VzSW5kaWNhdG9yKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIFVJQWN0aXZhdG9yUHJvdG8uc3RhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIEJ5IGRlZmF1bHQgd2UgdXNlIGNhbWVyYVxuICAgICAgICBnZXRWaWRlb1NpemUgPSBWaWRlb0xheW91dC5nZXRDYW1lcmFWaWRlb1NpemU7XG4gICAgICAgIGdldFZpZGVvUG9zaXRpb24gPSBWaWRlb0xheW91dC5nZXRDYW1lcmFWaWRlb1Bvc2l0aW9uO1xuICAgICAgICAkKCdib2R5JykucG9wb3Zlcih7IHNlbGVjdG9yOiAnW2RhdGEtdG9nZ2xlPXBvcG92ZXJdJyxcbiAgICAgICAgICAgIHRyaWdnZXI6ICdjbGljayBob3Zlcid9KTtcbiAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplTGFyZ2VWaWRlb0NvbnRhaW5lcigpO1xuICAgICAgICByZWdpc3Rlckxpc3RlbmVycygpO1xuICAgICAgICBiaW5kRXZlbnRzKCk7XG4gICAgICAgIHNldHVwQXVkaW9MZXZlbHMoKTtcbiAgICAgICAgc2V0dXBQcmV6aSgpO1xuICAgICAgICBzZXR1cEV0aGVycGFkKCk7XG5cblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlZ2lzdGVyTGlzdGVuZXJzKCkge1xuICAgICAgICBSVENBY3RpdmF0b3IuYWRkU3RyZWFtTGlzdGVuZXIoZnVuY3Rpb24gKHN0cmVhbSkge1xuICAgICAgICAgICAgc3dpdGNoIChzdHJlYW0udHlwZSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwiYXVkaW9cIjpcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuY2hhbmdlTG9jYWxBdWRpbyhzdHJlYW0uZ2V0T3JpZ2luYWxTdHJlYW0oKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJ2aWRlb1wiOlxuICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5jaGFuZ2VMb2NhbFZpZGVvKHN0cmVhbS5nZXRPcmlnaW5hbFN0cmVhbSgpLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcImRlc2t0b3BcIjpcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuY2hhbmdlTG9jYWxWaWRlbyhzdHJlYW0sICFpc1VzaW5nU2NyZWVuU3RyZWFtKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIFN0cmVhbUV2ZW50VHlwZXMuRVZFTlRfVFlQRV9MT0NBTF9DUkVBVEVEKTtcblxuICAgICAgICBSVENBY3RpdmF0b3IuYWRkU3RyZWFtTGlzdGVuZXIoZnVuY3Rpb24gKHN0cmVhbSkge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQub25SZW1vdGVTdHJlYW1BZGRlZChzdHJlYW0pO1xuICAgICAgICB9LCBTdHJlYW1FdmVudFR5cGVzLkVWRU5UX1RZUEVfUkVNT1RFX0NSRUFURUQpO1xuICAgICAgICAvLyBMaXN0ZW4gZm9yIGxhcmdlIHZpZGVvIHNpemUgdXBkYXRlc1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbGFyZ2VWaWRlbycpXG4gICAgICAgICAgICAuYWRkRXZlbnRMaXN0ZW5lcignbG9hZGVkbWV0YWRhdGEnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRWaWRlb1dpZHRoID0gdGhpcy52aWRlb1dpZHRoO1xuICAgICAgICAgICAgICAgIGN1cnJlbnRWaWRlb0hlaWdodCA9IHRoaXMudmlkZW9IZWlnaHQ7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQucG9zaXRpb25MYXJnZShjdXJyZW50VmlkZW9XaWR0aCwgY3VycmVudFZpZGVvSGVpZ2h0KTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cbiAgICBmdW5jdGlvbiBiaW5kRXZlbnRzKClcbiAgICB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXNpemVzIGFuZCByZXBvc2l0aW9ucyB2aWRlb3MgaW4gZnVsbCBzY3JlZW4gbW9kZS5cbiAgICAgICAgICovXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCd3ZWJraXRmdWxsc2NyZWVuY2hhbmdlIG1vemZ1bGxzY3JlZW5jaGFuZ2UgZnVsbHNjcmVlbmNoYW5nZScsXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplTGFyZ2VWaWRlb0NvbnRhaW5lcigpO1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnBvc2l0aW9uTGFyZ2UoKTtcbiAgICAgICAgICAgICAgICBpc0Z1bGxTY3JlZW4gPSBkb2N1bWVudC5mdWxsU2NyZWVuIHx8XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50Lm1vekZ1bGxTY3JlZW4gfHxcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQud2Via2l0SXNGdWxsU2NyZWVuO1xuXG4gICAgICAgICAgICAgICAgaWYgKGlzRnVsbFNjcmVlbikge1xuICAgICAgICAgICAgICAgICAgICBzZXRWaWV3KFwiZnVsbHNjcmVlblwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFZpZXcoXCJkZWZhdWx0XCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICAkKHdpbmRvdykucmVzaXplKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZUxhcmdlVmlkZW9Db250YWluZXIoKTtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LnBvc2l0aW9uTGFyZ2UoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgVUlBY3RpdmF0b3JQcm90by5nZXRSVENTZXJ2aWNlID0gZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgcmV0dXJuIFJUQ0FjdGl2YXRvci5nZXRSVENTZXJ2aWNlKCk7XG4gICAgfVxuXG4gICAgVUlBY3RpdmF0b3JQcm90by5nZXRVSVNlcnZpY2UgPSBmdW5jdGlvbigpXG4gICAge1xuICAgICAgICBpZih1aVNlcnZpY2UgPT0gbnVsbClcbiAgICAgICAge1xuICAgICAgICAgICAgdWlTZXJ2aWNlID0gbmV3IFVJU2VydmljZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1aVNlcnZpY2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIFVJQWN0aXZhdG9yUHJvdG87XG59KCk7XG5cbm1vZHVsZS5leHBvcnRzID0gVUlBY3RpdmF0b3I7XG5cbiIsInZhciBBdWRpb0xldmVscyA9IHJlcXVpcmUoXCIuL2F1ZGlvbGV2ZWxzL0F1ZGlvTGV2ZWxzLmpzXCIpO1xudmFyIEV0aGVycGFkID0gcmVxdWlyZShcIi4vZXRoZXJwYWQvRXRoZXJwYWQuanNcIik7XG52YXIgVmlkZW9MYXlvdXQgPSByZXF1aXJlKFwiLi9WaWRlb0xheW91dC5qc1wiKTtcbnZhciBUb29sYmFyID0gcmVxdWlyZShcIi4vVG9vbGJhci5qc1wiKTtcblxudmFyIFVJU2VydmljZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIHJvb20gaW52aXRlIHVybC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiB1cGRhdGVSb29tVXJsKG5ld1Jvb21VcmwpIHtcbiAgICAgICAgcm9vbVVybCA9IG5ld1Jvb21Vcmw7XG5cbiAgICAgICAgLy8gSWYgdGhlIGludml0ZSBkaWFsb2cgaGFzIGJlZW4gYWxyZWFkeSBvcGVuZWQgd2UgdXBkYXRlIHRoZSBpbmZvcm1hdGlvbi5cbiAgICAgICAgdmFyIGludml0ZUxpbmsgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaW52aXRlTGlua1JlZicpO1xuICAgICAgICBpZiAoaW52aXRlTGluaykge1xuICAgICAgICAgICAgaW52aXRlTGluay52YWx1ZSA9IHJvb21Vcmw7XG4gICAgICAgICAgICBpbnZpdGVMaW5rLnNlbGVjdCgpO1xuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pxaV9zdGF0ZTBfYnV0dG9uSW52aXRlJykuZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIFVJU2VydmljZVByb3RvKCkge1xuXG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLnVwZGF0ZUF1ZGlvTGV2ZWxDYW52YXMgPSBmdW5jdGlvbiAocGVlckppZCkge1xuICAgICAgICBBdWRpb0xldmVscy51cGRhdGVBdWRpb0xldmVsQ2FudmFzKHBlZXJKaWQpO1xuICAgIH1cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5pbml0RXRoZXJwYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIEV0aGVycGFkLmluaXQoKTtcbiAgICB9XG5cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5jaGVja0NoYW5nZUxhcmdlVmlkZW8gPSBmdW5jdGlvbiAocmVtb3ZlZFZpZGVvU3JjKSB7XG4gICAgICAgIFZpZGVvTGF5b3V0LmNoZWNrQ2hhbmdlTGFyZ2VWaWRlbyhyZW1vdmVkVmlkZW9TcmMpO1xuICAgIH1cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5vbk11Y0pvaW5lZCA9IGZ1bmN0aW9uIChqaWQsIGluZm8sIG5vTWVtYmVyKSB7XG4gICAgICAgIHVwZGF0ZVJvb21Vcmwod2luZG93LmxvY2F0aW9uLmhyZWYpO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9jYWxOaWNrJykuYXBwZW5kQ2hpbGQoXG4gICAgICAgICAgICBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpICsgJyAobWUpJylcbiAgICAgICAgKTtcblxuICAgICAgICBpZiAobm9NZW1iZXJzKSB7XG4gICAgICAgICAgICBUb29sYmFyLnNob3dTaXBDYWxsQnV0dG9uKHRydWUpO1xuICAgICAgICAgICAgVG9vbGJhci5zaG93UmVjb3JkaW5nQnV0dG9uKGZhbHNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghZm9jdXMpIHtcbiAgICAgICAgICAgIFRvb2xiYXIuc2hvd1NpcENhbGxCdXR0b24oZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZvY3VzICYmIGNvbmZpZy5ldGhlcnBhZF9iYXNlKSB7XG4gICAgICAgICAgICB0aGlzLmluaXRFdGhlcnBhZCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0ZvY3VzSW5kaWNhdG9yKCk7XG5cbiAgICAgICAgLy8gQWRkIG15c2VsZiB0byB0aGUgY29udGFjdCBsaXN0LlxuICAgICAgICBDb250YWN0TGlzdC5hZGRDb250YWN0KGppZCk7XG5cbiAgICAgICAgLy8gT25jZSB3ZSd2ZSBqb2luZWQgdGhlIG11YyBzaG93IHRoZSB0b29sYmFyXG4gICAgICAgIFRvb2xiYXIuc2hvd1Rvb2xiYXIoKTtcblxuICAgICAgICBpZiAoaW5mby5kaXNwbGF5TmFtZSlcbiAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2Rpc3BsYXluYW1lY2hhbmdlZCcsXG4gICAgICAgICAgICAgICAgWydsb2NhbFZpZGVvQ29udGFpbmVyJywgaW5mby5kaXNwbGF5TmFtZSArICcgKG1lKSddKTtcbiAgICB9XG5cbiAgICBVSVNlcnZpY2VQcm90by5wcm90b3R5cGUub25NdWNFbnRlcmVkID0gZnVuY3Rpb24gKGppZCwgaW5mbywgcHJlcykge1xuICAgICAgICBjb25zb2xlLmxvZygnZW50ZXJlZCcsIGppZCwgaW5mbyk7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ2lzIGZvY3VzPycgKyBmb2N1cyA/ICd0cnVlJyA6ICdmYWxzZScpO1xuXG4gICAgICAgIC8vIEFkZCBQZWVyJ3MgY29udGFpbmVyXG4gICAgICAgIFZpZGVvTGF5b3V0LmVuc3VyZVBlZXJDb250YWluZXJFeGlzdHMoamlkKTtcblxuICAgICAgICBpZiAoZm9jdXMgIT09IG51bGwpIHtcbiAgICAgICAgICAgIC8vIEZJWE1FOiB0aGlzIHNob3VsZCBwcmVwYXJlIHRoZSB2aWRlb1xuICAgICAgICAgICAgaWYgKGZvY3VzLmNvbmZpZCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdtYWtlIG5ldyBjb25mZXJlbmNlIHdpdGgnLCBqaWQpO1xuICAgICAgICAgICAgICAgIGZvY3VzLm1ha2VDb25mZXJlbmNlKE9iamVjdC5rZXlzKGNvbm5lY3Rpb24uZW11Yy5tZW1iZXJzKSk7XG4gICAgICAgICAgICAgICAgVG9vbGJhci5zaG93UmVjb3JkaW5nQnV0dG9uKHRydWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnaW52aXRlJywgamlkLCAnaW50byBjb25mZXJlbmNlJyk7XG4gICAgICAgICAgICAgICAgZm9jdXMuYWRkTmV3UGFydGljaXBhbnQoamlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzaGFyZWRLZXkpIHtcbiAgICAgICAgICAgIFRvb2xiYXIudXBkYXRlTG9ja0J1dHRvbigpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLm9uTXVjTGVmdCA9IGZ1bmN0aW9uKGppZClcbiAgICB7XG4gICAgICAgIC8vIE5lZWQgdG8gY2FsbCB0aGlzIHdpdGggYSBzbGlnaHQgZGVsYXksIG90aGVyd2lzZSB0aGUgZWxlbWVudCBjb3VsZG4ndCBiZVxuICAgICAgICAvLyBmb3VuZCBmb3Igc29tZSByZWFzb24uXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcbiAgICAgICAgICAgICAgICAgICAgJ3BhcnRpY2lwYW50XycgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpKTtcbiAgICAgICAgICAgIGlmIChjb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBoaWRlIGhlcmUsIHdhaXQgZm9yIHZpZGVvIHRvIGNsb3NlIGJlZm9yZSByZW1vdmluZ1xuICAgICAgICAgICAgICAgICQoY29udGFpbmVyKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplVGh1bWJuYWlscygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAxMCk7XG5cbiAgICAgICAgLy8gVW5sb2NrIGxhcmdlIHZpZGVvXG4gICAgICAgIGlmIChWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmIChnZXRKaWRGcm9tVmlkZW9TcmMoVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjKSA9PT0gamlkKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIkZvY3VzZWQgdmlkZW8gb3duZXIgaGFzIGxlZnQgdGhlIGNvbmZlcmVuY2VcIik7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgfVxuICAgIFxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS51cGRhdGVCdXR0b25zID0gZnVuY3Rpb24gKHJlY29yZGluZywgc2lwKSB7XG4gICAgICAgIGlmKHJlY29yZGluZyAhPSBudWxsKVxuICAgICAgICB7XG4gICAgICAgICAgICBUb29sYmFyLnNob3dSZWNvcmRpbmdCdXR0b24ocmVjb3JkaW5nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHNpcCAhPSBudWxsKVxuICAgICAgICB7XG4gICAgICAgICAgICBUb29sYmFyLnNob3dTaXBDYWxsQnV0dG9uKHNpcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gVUlTZXJ2aWNlUHJvdG87XG59KCk7XG5tb2R1bGUuZXhwb3J0cyA9IFVJU2VydmljZTsiLCJ2YXIgQ2hhdCA9IHJlcXVpcmUoXCIuL2NoYXQvQ2hhdC5qc1wiKTtcbnZhciBDb250YWN0TGlzdCA9IHJlcXVpcmUoXCIuL0NvbnRhY3RMaXN0LmpzXCIpO1xuXG52YXIgVUlVdGlsID0gKGZ1bmN0aW9uIChteSkge1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgYXZhaWxhYmxlIHZpZGVvIHdpZHRoLlxuICAgICAqL1xuICAgIG15LmdldEF2YWlsYWJsZVZpZGVvV2lkdGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjaGF0c3BhY2VXaWR0aFxuICAgICAgICAgICAgPSAoQ2hhdC5pc1Zpc2libGUoKSB8fCBDb250YWN0TGlzdC5pc1Zpc2libGUoKSlcbiAgICAgICAgICAgID8gJCgnI2NoYXRzcGFjZScpLndpZHRoKClcbiAgICAgICAgICAgIDogMDtcblxuICAgICAgICByZXR1cm4gd2luZG93LmlubmVyV2lkdGggLSBjaGF0c3BhY2VXaWR0aDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIG15O1xuXG59KShVSVV0aWwgfHwge30pO1xuXG5cbi8vbW9kdWxlLmV4cG9ydHMgPSB7XG4vLyAgICBnZXRBdmFpbGFibGVWaWRlb1dpZHRoOiBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgdmFyIGNoYXRzcGFjZVdpZHRoXG4vLyAgICAgICAgICAgID0gKENoYXQuaXNWaXNpYmxlKCkgfHwgQ29udGFjdExpc3QuaXNWaXNpYmxlKCkpXG4vLyAgICAgICAgICAgID8gJCgnI2NoYXRzcGFjZScpLndpZHRoKClcbi8vICAgICAgICAgICAgOiAwO1xuLy9cbi8vICAgICAgICByZXR1cm4gd2luZG93LmlubmVyV2lkdGggLSBjaGF0c3BhY2VXaWR0aDtcbi8vICAgIH1cbi8vfVxuXG5tb2R1bGUuZXhwb3J0cyA9IFVJVXRpbDtcbi8vbW9kdWxlLmV4cG9ydHMgPSBcIkFhYWFhYWFhYWFhXCI7IiwidmFyIGRlcCA9XG57XG4gICAgXCJSVENCcm93c2VyVHlwZVwiOiBmdW5jdGlvbigpeyByZXR1cm4gcmVxdWlyZShcIi4uL3NlcnZpY2UvUlRDL1JUQ0Jyb3dzZXJUeXBlLmpzXCIpfSxcbiAgICBcIlVJU2VydmljZVwiOiBmdW5jdGlvbigpeyByZXR1cm4gcmVxdWlyZShcIi4vVUlTZXJ2aWNlLmpzXCIpfSxcbiAgICBcIlVJQWN0aXZhdG9yXCI6IGZ1bmN0aW9uKCl7IHJldHVybiByZXF1aXJlKFwiLi9VSUFjdGl2YXRvci5qc1wiKX0sXG4gICAgXCJDaGF0XCI6IGZ1bmN0aW9uKCl7IHJldHVybiByZXF1aXJlKFwiLi9jaGF0L0NoYXRcIil9LFxuICAgIFwiVUlVdGlsXCI6IGZ1bmN0aW9uKCl7IHJldHVybiByZXF1aXJlKFwiLi9VSVV0aWwuanNcIil9XG59XG5cbnZhciBWaWRlb0xheW91dCA9IChmdW5jdGlvbiAobXkpIHtcbiAgICB2YXIgcHJlTXV0ZWQgPSBmYWxzZTtcbiAgICB2YXIgY3VycmVudERvbWluYW50U3BlYWtlciA9IG51bGw7XG4gICAgdmFyIGxhc3ROQ291bnQgPSBjb25maWcuY2hhbm5lbExhc3ROO1xuICAgIHZhciBsYXN0TkVuZHBvaW50c0NhY2hlID0gW107XG4gICAgdmFyIGJyb3dzZXIgPSBudWxsO1xuICAgIC8qKlxuICAgICAqIEN1cnJlbnRseSBmb2N1c2VkIHZpZGVvIFwic3JjXCIoZGlzcGxheWVkIGluIGxhcmdlIHZpZGVvKS5cbiAgICAgKiBAdHlwZSB7U3RyaW5nfVxuICAgICAqL1xuICAgIG15LmZvY3VzZWRWaWRlb1NyYyA9IG51bGw7XG5cbiAgICBmdW5jdGlvbiBhdHRhY2hNZWRpYVN0cmVhbShlbGVtZW50LCBzdHJlYW0pIHtcbiAgICAgICAgaWYoYnJvd3NlciA9PSBudWxsKVxuICAgICAgICB7XG4gICAgICAgICAgICBicm93c2VyID0gZGVwLlVJU2VydmljZSgpLmdldEJyb3dzZXJUeXBlKCk7XG4gICAgICAgIH1cbiAgICAgICAgc3dpdGNoIChicm93c2VyKVxuICAgICAgICB7XG4gICAgICAgICAgICBjYXNlIGRlcC5SVENCcm93c2VyVHlwZSgpLlJUQ19CUk9XU0VSX0NIUk9NRTpcbiAgICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoJ3NyYycsIHdlYmtpdFVSTC5jcmVhdGVPYmplY3RVUkwoc3RyZWFtKSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGRlcC5SVENCcm93c2VyVHlwZSgpLlJUQ19CUk9XU0VSX0ZJUkVGT1g6XG4gICAgICAgICAgICAgICAgZWxlbWVudFswXS5tb3pTcmNPYmplY3QgPSBzdHJlYW07XG4gICAgICAgICAgICAgICAgZWxlbWVudFswXS5wbGF5KCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVW5rbm93biBicm93c2VyLlwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG15LmNoYW5nZUxvY2FsQXVkaW8gPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgICAgY29ubmVjdGlvbi5qaW5nbGUubG9jYWxBdWRpbyA9IHN0cmVhbTtcblxuICAgICAgICBhdHRhY2hNZWRpYVN0cmVhbSgkKCcjbG9jYWxBdWRpbycpLCBzdHJlYW0pO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9jYWxBdWRpbycpLmF1dG9wbGF5ID0gdHJ1ZTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2FsQXVkaW8nKS52b2x1bWUgPSAwO1xuICAgICAgICBpZiAocHJlTXV0ZWQpIHtcbiAgICAgICAgICAgIHRvZ2dsZUF1ZGlvKCk7XG4gICAgICAgICAgICBwcmVNdXRlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIG15LmNoYW5nZUxvY2FsVmlkZW8gPSBmdW5jdGlvbihzdHJlYW0sIGZsaXBYKSB7XG4gICAgICAgIGNvbm5lY3Rpb24uamluZ2xlLmxvY2FsVmlkZW8gPSBzdHJlYW07XG5cbiAgICAgICAgdmFyIGxvY2FsVmlkZW8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd2aWRlbycpO1xuICAgICAgICBsb2NhbFZpZGVvLmlkID0gJ2xvY2FsVmlkZW9fJyArIHN0cmVhbS5pZDtcbiAgICAgICAgbG9jYWxWaWRlby5hdXRvcGxheSA9IHRydWU7XG4gICAgICAgIGxvY2FsVmlkZW8udm9sdW1lID0gMDsgLy8gaXMgaXQgcmVxdWlyZWQgaWYgYXVkaW8gaXMgc2VwYXJhdGVkID9cbiAgICAgICAgbG9jYWxWaWRlby5vbmNvbnRleHRtZW51ID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gZmFsc2U7IH07XG5cbiAgICAgICAgdmFyIGxvY2FsVmlkZW9Db250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9jYWxWaWRlb1dyYXBwZXInKTtcbiAgICAgICAgbG9jYWxWaWRlb0NvbnRhaW5lci5hcHBlbmRDaGlsZChsb2NhbFZpZGVvKTtcblxuICAgICAgICAvLyBTZXQgZGVmYXVsdCBkaXNwbGF5IG5hbWUuXG4gICAgICAgIHNldERpc3BsYXlOYW1lKCdsb2NhbFZpZGVvQ29udGFpbmVyJyk7XG5cbiAgICAgICAgZGVwLlVJU2VydmljZSgpLnVwZGF0ZUF1ZGlvTGV2ZWxDYW52YXMoKTtcblxuICAgICAgICB2YXIgbG9jYWxWaWRlb1NlbGVjdG9yID0gJCgnIycgKyBsb2NhbFZpZGVvLmlkKTtcbiAgICAgICAgLy8gQWRkIGNsaWNrIGhhbmRsZXIgdG8gYm90aCB2aWRlbyBhbmQgdmlkZW8gd3JhcHBlciBlbGVtZW50cyBpbiBjYXNlXG4gICAgICAgIC8vIHRoZXJlJ3Mgbm8gdmlkZW8uXG4gICAgICAgIGxvY2FsVmlkZW9TZWxlY3Rvci5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5oYW5kbGVWaWRlb1RodW1iQ2xpY2tlZChsb2NhbFZpZGVvLnNyYyk7XG4gICAgICAgIH0pO1xuICAgICAgICAkKCcjbG9jYWxWaWRlb0NvbnRhaW5lcicpLmNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmhhbmRsZVZpZGVvVGh1bWJDbGlja2VkKGxvY2FsVmlkZW8uc3JjKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGhvdmVyIGhhbmRsZXJcbiAgICAgICAgJCgnI2xvY2FsVmlkZW9Db250YWluZXInKS5ob3ZlcihcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dEaXNwbGF5TmFtZSgnbG9jYWxWaWRlb0NvbnRhaW5lcicsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmICghVmlkZW9MYXlvdXQuaXNMYXJnZVZpZGVvVmlzaWJsZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICB8fCBsb2NhbFZpZGVvLnNyYyAhPT0gJCgnI2xhcmdlVmlkZW8nKS5hdHRyKCdzcmMnKSlcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0Rpc3BsYXlOYW1lKCdsb2NhbFZpZGVvQ29udGFpbmVyJywgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICAvLyBBZGQgc3RyZWFtIGVuZGVkIGhhbmRsZXJcbiAgICAgICAgc3RyZWFtLm9uZW5kZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBsb2NhbFZpZGVvQ29udGFpbmVyLnJlbW92ZUNoaWxkKGxvY2FsVmlkZW8pO1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQudXBkYXRlUmVtb3ZlZFZpZGVvKGxvY2FsVmlkZW8uc3JjKTtcbiAgICAgICAgfTtcbiAgICAgICAgLy8gRmxpcCB2aWRlbyB4IGF4aXMgaWYgbmVlZGVkXG4gICAgICAgIGZsaXBYTG9jYWxWaWRlbyA9IGZsaXBYO1xuICAgICAgICBpZiAoZmxpcFgpIHtcbiAgICAgICAgICAgIGxvY2FsVmlkZW9TZWxlY3Rvci5hZGRDbGFzcyhcImZsaXBWaWRlb1hcIik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQXR0YWNoIFdlYlJUQyBzdHJlYW1cbiAgICAgICAgYXR0YWNoTWVkaWFTdHJlYW0obG9jYWxWaWRlb1NlbGVjdG9yLCBzdHJlYW0pO1xuXG4gICAgICAgIGxvY2FsVmlkZW9TcmMgPSBsb2NhbFZpZGVvLnNyYztcblxuICAgICAgICBWaWRlb0xheW91dC51cGRhdGVMYXJnZVZpZGVvKGxvY2FsVmlkZW9TcmMsIDApO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgcmVtb3ZlZCB2aWRlbyBpcyBjdXJyZW50bHkgZGlzcGxheWVkIGFuZCB0cmllcyB0byBkaXNwbGF5XG4gICAgICogYW5vdGhlciBvbmUgaW5zdGVhZC5cbiAgICAgKiBAcGFyYW0gcmVtb3ZlZFZpZGVvU3JjIHNyYyBzdHJlYW0gaWRlbnRpZmllciBvZiB0aGUgdmlkZW8uXG4gICAgICovXG4gICAgbXkudXBkYXRlUmVtb3ZlZFZpZGVvID0gZnVuY3Rpb24ocmVtb3ZlZFZpZGVvU3JjKSB7XG4gICAgICAgIGlmIChyZW1vdmVkVmlkZW9TcmMgPT09ICQoJyNsYXJnZVZpZGVvJykuYXR0cignc3JjJykpIHtcbiAgICAgICAgICAgIC8vIHRoaXMgaXMgY3VycmVudGx5IGRpc3BsYXllZCBhcyBsYXJnZVxuICAgICAgICAgICAgLy8gcGljayB0aGUgbGFzdCB2aXNpYmxlIHZpZGVvIGluIHRoZSByb3dcbiAgICAgICAgICAgIC8vIGlmIG5vYm9keSBlbHNlIGlzIGxlZnQsIHRoaXMgcGlja3MgdGhlIGxvY2FsIHZpZGVvXG4gICAgICAgICAgICB2YXIgcGlja1xuICAgICAgICAgICAgICAgID0gJCgnI3JlbW90ZVZpZGVvcz5zcGFuW2lkIT1cIm1peGVkc3RyZWFtXCJdOnZpc2libGU6bGFzdD52aWRlbycpXG4gICAgICAgICAgICAgICAgICAgIC5nZXQoMCk7XG5cbiAgICAgICAgICAgIGlmICghcGljaykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIkxhc3QgdmlzaWJsZSB2aWRlbyBubyBsb25nZXIgZXhpc3RzXCIpO1xuICAgICAgICAgICAgICAgIHBpY2sgPSAkKCcjcmVtb3RlVmlkZW9zPnNwYW5baWQhPVwibWl4ZWRzdHJlYW1cIl0+dmlkZW8nKS5nZXQoMCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIXBpY2sgfHwgIXBpY2suc3JjKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRyeSBsb2NhbCB2aWRlb1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oXCJGYWxsYmFjayB0byBsb2NhbCB2aWRlby4uLlwiKTtcbiAgICAgICAgICAgICAgICAgICAgcGljayA9ICQoJyNyZW1vdGVWaWRlb3M+c3Bhbj5zcGFuPnZpZGVvJykuZ2V0KDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gbXV0ZSBpZiBsb2NhbHZpZGVvXG4gICAgICAgICAgICBpZiAocGljaykge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8ocGljay5zcmMsIHBpY2sudm9sdW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiRmFpbGVkIHRvIGVsZWN0IGxhcmdlIHZpZGVvXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIGxhcmdlIHZpZGVvIHdpdGggdGhlIGdpdmVuIG5ldyB2aWRlbyBzb3VyY2UuXG4gICAgICovXG4gICAgbXkudXBkYXRlTGFyZ2VWaWRlbyA9IGZ1bmN0aW9uKG5ld1NyYywgdm9sKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdob3ZlciBpbicsIG5ld1NyYyk7XG5cbiAgICAgICAgaWYgKCQoJyNsYXJnZVZpZGVvJykuYXR0cignc3JjJykgIT0gbmV3U3JjKSB7XG5cbiAgICAgICAgICAgIHZhciBpc1Zpc2libGUgPSAkKCcjbGFyZ2VWaWRlbycpLmlzKCc6dmlzaWJsZScpO1xuXG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlbycpLmZhZGVPdXQoMzAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9sZFNyYyA9ICQodGhpcykuYXR0cignc3JjJyk7XG5cbiAgICAgICAgICAgICAgICAkKHRoaXMpLmF0dHIoJ3NyYycsIG5ld1NyYyk7XG5cbiAgICAgICAgICAgICAgICAvLyBTY3JlZW4gc3RyZWFtIGlzIGFscmVhZHkgcm90YXRlZFxuICAgICAgICAgICAgICAgIHZhciBmbGlwWCA9IChuZXdTcmMgPT09IGxvY2FsVmlkZW9TcmMpICYmIGZsaXBYTG9jYWxWaWRlbztcblxuICAgICAgICAgICAgICAgIHZhciB2aWRlb1RyYW5zZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsYXJnZVZpZGVvJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc3R5bGUud2Via2l0VHJhbnNmb3JtO1xuXG4gICAgICAgICAgICAgICAgaWYgKGZsaXBYICYmIHZpZGVvVHJhbnNmb3JtICE9PSAnc2NhbGVYKC0xKScpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xhcmdlVmlkZW8nKS5zdHlsZS53ZWJraXRUcmFuc2Zvcm1cbiAgICAgICAgICAgICAgICAgICAgICAgID0gXCJzY2FsZVgoLTEpXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKCFmbGlwWCAmJiB2aWRlb1RyYW5zZm9ybSA9PT0gJ3NjYWxlWCgtMSknKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsYXJnZVZpZGVvJykuc3R5bGUud2Via2l0VHJhbnNmb3JtXG4gICAgICAgICAgICAgICAgICAgICAgICA9IFwibm9uZVwiO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIENoYW5nZSB0aGUgd2F5IHdlJ2xsIGJlIG1lYXN1cmluZyBhbmQgcG9zaXRpb25pbmcgbGFyZ2UgdmlkZW9cbiAgICAgICAgICAgICAgICB2YXIgaXNEZXNrdG9wID0gaXNWaWRlb1NyY0Rlc2t0b3AobmV3U3JjKTtcbiAgICAgICAgICAgICAgICBnZXRWaWRlb1NpemUgPSBpc0Rlc2t0b3BcbiAgICAgICAgICAgICAgICAgICAgPyBnZXREZXNrdG9wVmlkZW9TaXplXG4gICAgICAgICAgICAgICAgICAgIDogVmlkZW9MYXlvdXQuZ2V0Q2FtZXJhVmlkZW9TaXplO1xuICAgICAgICAgICAgICAgIGdldFZpZGVvUG9zaXRpb24gPSBpc0Rlc2t0b3BcbiAgICAgICAgICAgICAgICAgICAgPyBnZXREZXNrdG9wVmlkZW9Qb3NpdGlvblxuICAgICAgICAgICAgICAgICAgICA6IFZpZGVvTGF5b3V0LmdldENhbWVyYVZpZGVvUG9zaXRpb247XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNWaXNpYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgaWYgdGhlIGxhcmdlIHZpZGVvIGlzIGN1cnJlbnRseSB2aXNpYmxlLlxuICAgICAgICAgICAgICAgICAgICAvLyBEaXNhYmxlIHByZXZpb3VzIGRvbWluYW50IHNwZWFrZXIgdmlkZW8uXG4gICAgICAgICAgICAgICAgICAgIHZhciBvbGRKaWQgPSBnZXRKaWRGcm9tVmlkZW9TcmMob2xkU3JjKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9sZEppZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG9sZFJlc291cmNlSmlkID0gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQob2xkSmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LmVuYWJsZURvbWluYW50U3BlYWtlcihvbGRSZXNvdXJjZUppZCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRW5hYmxlIG5ldyBkb21pbmFudCBzcGVha2VyIGluIHRoZSByZW1vdGUgdmlkZW9zIHNlY3Rpb24uXG4gICAgICAgICAgICAgICAgICAgIHZhciB1c2VySmlkID0gZ2V0SmlkRnJvbVZpZGVvU3JjKG5ld1NyYyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1c2VySmlkKVxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzb3VyY2VKaWQgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZCh1c2VySmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LmVuYWJsZURvbWluYW50U3BlYWtlcihyZXNvdXJjZUppZCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmZhZGVJbigzMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YgdGhlIHZpZGVvIGhvcml6b250YWwgYW5kIHZlcnRpY2FsIGluZGVudHMuXG4gICAgICogQ2VudGVycyBob3Jpem9udGFsbHkgYW5kIHRvcCBhbGlnbnMgdmVydGljYWxseS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gYW4gYXJyYXkgd2l0aCAyIGVsZW1lbnRzLCB0aGUgaG9yaXpvbnRhbCBpbmRlbnQgYW5kIHRoZSB2ZXJ0aWNhbFxuICAgICAqIGluZGVudFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldERlc2t0b3BWaWRlb1Bvc2l0aW9uKHZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VIZWlnaHQpIHtcblxuICAgICAgICB2YXIgaG9yaXpvbnRhbEluZGVudCA9ICh2aWRlb1NwYWNlV2lkdGggLSB2aWRlb1dpZHRoKSAvIDI7XG5cbiAgICAgICAgdmFyIHZlcnRpY2FsSW5kZW50ID0gMDsvLyBUb3AgYWxpZ25lZFxuXG4gICAgICAgIHJldHVybiBbaG9yaXpvbnRhbEluZGVudCwgdmVydGljYWxJbmRlbnRdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB2aWRlbyBpZGVudGlmaWVkIGJ5IGdpdmVuIHNyYyBpcyBkZXNrdG9wIHN0cmVhbS5cbiAgICAgKiBAcGFyYW0gdmlkZW9TcmMgZWcuXG4gICAgICogYmxvYjpodHRwcyUzQS8vcGF3ZWwuaml0c2kubmV0LzlhNDZlMGJkLTEzMWUtNGQxOC05YzE0LWE5MjY0ZThkYjM5NVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzVmlkZW9TcmNEZXNrdG9wKHZpZGVvU3JjKSB7XG4gICAgICAgIC8vIEZJWE1FOiBmaXggdGhpcyBtYXBwaW5nIG1lc3MuLi5cbiAgICAgICAgLy8gZmlndXJlIG91dCBpZiBsYXJnZSB2aWRlbyBpcyBkZXNrdG9wIHN0cmVhbSBvciBqdXN0IGEgY2FtZXJhXG4gICAgICAgIHZhciBpc0Rlc2t0b3AgPSBmYWxzZTtcbiAgICAgICAgaWYgKGxvY2FsVmlkZW9TcmMgPT09IHZpZGVvU3JjKSB7XG4gICAgICAgICAgICAvLyBsb2NhbCB2aWRlb1xuICAgICAgICAgICAgaXNEZXNrdG9wID0gaXNVc2luZ1NjcmVlblN0cmVhbTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIERvIHdlIGhhdmUgYXNzb2NpYXRpb25zLi4uXG4gICAgICAgICAgICB2YXIgdmlkZW9Tc3JjID0gdmlkZW9TcmNUb1NzcmNbdmlkZW9TcmNdO1xuICAgICAgICAgICAgaWYgKHZpZGVvU3NyYykge1xuICAgICAgICAgICAgICAgIHZhciB2aWRlb1R5cGUgPSBzc3JjMnZpZGVvVHlwZVt2aWRlb1NzcmNdO1xuICAgICAgICAgICAgICAgIGlmICh2aWRlb1R5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmluYWxseSB0aGVyZS4uLlxuICAgICAgICAgICAgICAgICAgICBpc0Rlc2t0b3AgPSB2aWRlb1R5cGUgPT09ICdzY3JlZW4nO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJObyB2aWRlbyB0eXBlIGZvciBzc3JjOiBcIiArIHZpZGVvU3NyYyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiTm8gc3NyYyBmb3Igc3JjOiBcIiArIHZpZGVvU3JjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaXNEZXNrdG9wO1xuICAgIH1cblxuXG4gICAgbXkuaGFuZGxlVmlkZW9UaHVtYkNsaWNrZWQgPSBmdW5jdGlvbih2aWRlb1NyYykge1xuICAgICAgICAvLyBSZXN0b3JlIHN0eWxlIGZvciBwcmV2aW91c2x5IGZvY3VzZWQgdmlkZW9cbiAgICAgICAgdmFyIGZvY3VzSmlkID0gZ2V0SmlkRnJvbVZpZGVvU3JjKFZpZGVvTGF5b3V0LmZvY3VzZWRWaWRlb1NyYyk7XG4gICAgICAgIHZhciBvbGRDb250YWluZXIgPSBnZXRQYXJ0aWNpcGFudENvbnRhaW5lcihmb2N1c0ppZCk7XG5cbiAgICAgICAgaWYgKG9sZENvbnRhaW5lcikge1xuICAgICAgICAgICAgb2xkQ29udGFpbmVyLnJlbW92ZUNsYXNzKFwidmlkZW9Db250YWluZXJGb2N1c2VkXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVW5sb2NrIGN1cnJlbnQgZm9jdXNlZC4gXG4gICAgICAgIGlmIChWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMgPT09IHZpZGVvU3JjKVxuICAgICAgICB7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMgPSBudWxsO1xuICAgICAgICAgICAgdmFyIGRvbWluYW50U3BlYWtlclZpZGVvID0gbnVsbDtcbiAgICAgICAgICAgIC8vIEVuYWJsZSB0aGUgY3VycmVudGx5IHNldCBkb21pbmFudCBzcGVha2VyLlxuICAgICAgICAgICAgaWYgKGN1cnJlbnREb21pbmFudFNwZWFrZXIpIHtcbiAgICAgICAgICAgICAgICBkb21pbmFudFNwZWFrZXJWaWRlb1xuICAgICAgICAgICAgICAgICAgICA9ICQoJyNwYXJ0aWNpcGFudF8nICsgY3VycmVudERvbWluYW50U3BlYWtlciArICc+dmlkZW8nKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmdldCgwKTtcblxuICAgICAgICAgICAgICAgIGlmIChkb21pbmFudFNwZWFrZXJWaWRlbykge1xuICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC51cGRhdGVMYXJnZVZpZGVvKGRvbWluYW50U3BlYWtlclZpZGVvLnNyYywgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBMb2NrIG5ldyB2aWRlb1xuICAgICAgICBWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMgPSB2aWRlb1NyYztcblxuICAgICAgICAvLyBVcGRhdGUgZm9jdXNlZC9waW5uZWQgaW50ZXJmYWNlLlxuICAgICAgICB2YXIgdXNlckppZCA9IGdldEppZEZyb21WaWRlb1NyYyh2aWRlb1NyYyk7XG4gICAgICAgIGlmICh1c2VySmlkKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgY29udGFpbmVyID0gZ2V0UGFydGljaXBhbnRDb250YWluZXIodXNlckppZCk7XG4gICAgICAgICAgICBjb250YWluZXIuYWRkQ2xhc3MoXCJ2aWRlb0NvbnRhaW5lckZvY3VzZWRcIik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUcmlnZ2VycyBhIFwidmlkZW8uc2VsZWN0ZWRcIiBldmVudC4gVGhlIFwiZmFsc2VcIiBwYXJhbWV0ZXIgaW5kaWNhdGVzXG4gICAgICAgIC8vIHRoaXMgaXNuJ3QgYSBwcmV6aS5cbiAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcihcInZpZGVvLnNlbGVjdGVkXCIsIFtmYWxzZV0pO1xuXG4gICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8odmlkZW9TcmMsIDEpO1xuXG4gICAgICAgICQoJ2F1ZGlvJykuZWFjaChmdW5jdGlvbiAoaWR4LCBlbCkge1xuICAgICAgICAgICAgaWYgKGVsLmlkLmluZGV4T2YoJ21peGVkbXNsYWJlbCcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIGVsLnZvbHVtZSA9IDA7XG4gICAgICAgICAgICAgICAgZWwudm9sdW1lID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFBvc2l0aW9ucyB0aGUgbGFyZ2UgdmlkZW8uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmlkZW9XaWR0aCB0aGUgc3RyZWFtIHZpZGVvIHdpZHRoXG4gICAgICogQHBhcmFtIHZpZGVvSGVpZ2h0IHRoZSBzdHJlYW0gdmlkZW8gaGVpZ2h0XG4gICAgICovXG4gICAgbXkucG9zaXRpb25MYXJnZSA9IGZ1bmN0aW9uICh2aWRlb1dpZHRoLCB2aWRlb0hlaWdodCkge1xuICAgICAgICB2YXIgdmlkZW9TcGFjZVdpZHRoID0gJCgnI3ZpZGVvc3BhY2UnKS53aWR0aCgpO1xuICAgICAgICB2YXIgdmlkZW9TcGFjZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcblxuICAgICAgICB2YXIgdmlkZW9TaXplID0gZ2V0VmlkZW9TaXplKHZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VIZWlnaHQpO1xuXG4gICAgICAgIHZhciBsYXJnZVZpZGVvV2lkdGggPSB2aWRlb1NpemVbMF07XG4gICAgICAgIHZhciBsYXJnZVZpZGVvSGVpZ2h0ID0gdmlkZW9TaXplWzFdO1xuXG4gICAgICAgIHZhciB2aWRlb1Bvc2l0aW9uID0gZ2V0VmlkZW9Qb3NpdGlvbihsYXJnZVZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXJnZVZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZUhlaWdodCk7XG5cbiAgICAgICAgdmFyIGhvcml6b250YWxJbmRlbnQgPSB2aWRlb1Bvc2l0aW9uWzBdO1xuICAgICAgICB2YXIgdmVydGljYWxJbmRlbnQgPSB2aWRlb1Bvc2l0aW9uWzFdO1xuXG4gICAgICAgIHBvc2l0aW9uVmlkZW8oJCgnI2xhcmdlVmlkZW8nKSxcbiAgICAgICAgICAgICAgICAgICAgICBsYXJnZVZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgbGFyZ2VWaWRlb0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICBob3Jpem9udGFsSW5kZW50LCB2ZXJ0aWNhbEluZGVudCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3dzL2hpZGVzIHRoZSBsYXJnZSB2aWRlby5cbiAgICAgKi9cbiAgICBteS5zZXRMYXJnZVZpZGVvVmlzaWJsZSA9IGZ1bmN0aW9uKGlzVmlzaWJsZSkge1xuICAgICAgICB2YXIgbGFyZ2VWaWRlb0ppZCA9IGdldEppZEZyb21WaWRlb1NyYygkKCcjbGFyZ2VWaWRlbycpLmF0dHIoJ3NyYycpKTtcbiAgICAgICAgdmFyIHJlc291cmNlSmlkID0gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQobGFyZ2VWaWRlb0ppZCk7XG5cbiAgICAgICAgaWYgKGlzVmlzaWJsZSkge1xuICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5jc3Moe3Zpc2liaWxpdHk6ICd2aXNpYmxlJ30pO1xuICAgICAgICAgICAgJCgnLndhdGVybWFyaycpLmNzcyh7dmlzaWJpbGl0eTogJ3Zpc2libGUnfSk7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5lbmFibGVEb21pbmFudFNwZWFrZXIocmVzb3VyY2VKaWQsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5jc3Moe3Zpc2liaWxpdHk6ICdoaWRkZW4nfSk7XG4gICAgICAgICAgICAkKCcud2F0ZXJtYXJrJykuY3NzKHt2aXNpYmlsaXR5OiAnaGlkZGVuJ30pO1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuZW5hYmxlRG9taW5hbnRTcGVha2VyKHJlc291cmNlSmlkLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSW5kaWNhdGVzIGlmIHRoZSBsYXJnZSB2aWRlbyBpcyBjdXJyZW50bHkgdmlzaWJsZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gPHR0PnRydWU8L3R0PiBpZiB2aXNpYmxlLCA8dHQ+ZmFsc2U8L3R0PiAtIG90aGVyd2lzZVxuICAgICAqL1xuICAgIG15LmlzTGFyZ2VWaWRlb1Zpc2libGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICQoJyNsYXJnZVZpZGVvJykuaXMoJzp2aXNpYmxlJyk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiBjb250YWluZXIgZm9yIHBhcnRpY2lwYW50IGlkZW50aWZpZWQgYnkgZ2l2ZW4gcGVlckppZCBleGlzdHNcbiAgICAgKiBpbiB0aGUgZG9jdW1lbnQgYW5kIGNyZWF0ZXMgaXQgZXZlbnR1YWxseS5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0gcGVlckppZCBwZWVyIEppZCB0byBjaGVjay5cbiAgICAgKiBcbiAgICAgKiBAcmV0dXJuIFJldHVybnMgPHR0PnRydWU8L3R0PiBpZiB0aGUgcGVlciBjb250YWluZXIgZXhpc3RzLFxuICAgICAqIDx0dD5mYWxzZTwvdHQ+IC0gb3RoZXJ3aXNlXG4gICAgICovXG4gICAgbXkuZW5zdXJlUGVlckNvbnRhaW5lckV4aXN0cyA9IGZ1bmN0aW9uKHBlZXJKaWQpIHtcbiAgICAgICAgQ29udGFjdExpc3QuZW5zdXJlQWRkQ29udGFjdChwZWVySmlkKTtcblxuICAgICAgICB2YXIgcmVzb3VyY2VKaWQgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChwZWVySmlkKTtcblxuICAgICAgICB2YXIgdmlkZW9TcGFuSWQgPSAncGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkO1xuXG4gICAgICAgIGlmICgkKCcjJyArIHZpZGVvU3BhbklkKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGVyZSdzIGJlZW4gYSBmb2N1cyBjaGFuZ2UsIG1ha2Ugc3VyZSB3ZSBhZGQgZm9jdXMgcmVsYXRlZFxuICAgICAgICAgICAgLy8gaW50ZXJmYWNlISFcbiAgICAgICAgICAgIGlmIChmb2N1cyAmJiAkKCcjcmVtb3RlX3BvcHVwbWVudV8nICsgcmVzb3VyY2VKaWQpLmxlbmd0aCA8PSAwKVxuICAgICAgICAgICAgICAgIGFkZFJlbW90ZVZpZGVvTWVudSggcGVlckppZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHZpZGVvU3BhbklkKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgY29udGFpbmVyXG4gICAgICAgICAgICAgICAgPSBWaWRlb0xheW91dC5hZGRSZW1vdGVWaWRlb0NvbnRhaW5lcihwZWVySmlkLCB2aWRlb1NwYW5JZCk7XG5cbiAgICAgICAgICAgIC8vIFNldCBkZWZhdWx0IGRpc3BsYXkgbmFtZS5cbiAgICAgICAgICAgIHNldERpc3BsYXlOYW1lKHZpZGVvU3BhbklkKTtcblxuICAgICAgICAgICAgdmFyIG5pY2tmaWVsZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIG5pY2tmaWVsZC5jbGFzc05hbWUgPSBcIm5pY2tcIjtcbiAgICAgICAgICAgIG5pY2tmaWVsZC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShyZXNvdXJjZUppZCkpO1xuICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKG5pY2tmaWVsZCk7XG5cbiAgICAgICAgICAgIC8vIEluIGNhc2UgdGhpcyBpcyBub3QgY3VycmVudGx5IGluIHRoZSBsYXN0IG4gd2UgZG9uJ3Qgc2hvdyBpdC5cbiAgICAgICAgICAgIGlmIChsYXN0TkNvdW50XG4gICAgICAgICAgICAgICAgJiYgbGFzdE5Db3VudCA+IDBcbiAgICAgICAgICAgICAgICAmJiAkKCcjcmVtb3RlVmlkZW9zPnNwYW4nKS5sZW5ndGggPj0gbGFzdE5Db3VudCArIDIpIHtcbiAgICAgICAgICAgICAgICBzaG93UGVlckNvbnRhaW5lcihyZXNvdXJjZUppZCwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZVRodW1ibmFpbHMoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBteS5hZGRSZW1vdGVWaWRlb0NvbnRhaW5lciA9IGZ1bmN0aW9uKHBlZXJKaWQsIHNwYW5JZCkge1xuICAgICAgICB2YXIgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICBjb250YWluZXIuaWQgPSBzcGFuSWQ7XG4gICAgICAgIGNvbnRhaW5lci5jbGFzc05hbWUgPSAndmlkZW9jb250YWluZXInO1xuICAgICAgICB2YXIgcmVtb3RlcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZW1vdGVWaWRlb3MnKTtcblxuICAgICAgICAvLyBJZiB0aGUgcGVlckppZCBpcyBudWxsIHRoZW4gdGhpcyB2aWRlbyBzcGFuIGNvdWxkbid0IGJlIGRpcmVjdGx5XG4gICAgICAgIC8vIGFzc29jaWF0ZWQgd2l0aCBhIHBhcnRpY2lwYW50ICh0aGlzIGNvdWxkIGhhcHBlbiBpbiB0aGUgY2FzZSBvZiBwcmV6aSkuXG4gICAgICAgIGlmIChmb2N1cyAmJiBwZWVySmlkICE9IG51bGwpXG4gICAgICAgICAgICBhZGRSZW1vdGVWaWRlb01lbnUocGVlckppZCwgY29udGFpbmVyKTtcblxuICAgICAgICByZW1vdGVzLmFwcGVuZENoaWxkKGNvbnRhaW5lcik7XG4gICAgICAgIGRlcC5VSVNlcnZpY2UoKS51cGRhdGVBdWRpb0xldmVsQ2FudmFzKHBlZXJKaWQpO1xuXG4gICAgICAgIHJldHVybiBjb250YWluZXI7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYXVkaW8gb3IgdmlkZW8gc3RyZWFtIGVsZW1lbnQuXG4gICAgICovXG4gICAgbXkuY3JlYXRlU3RyZWFtRWxlbWVudCA9IGZ1bmN0aW9uIChzaWQsIHN0cmVhbSkge1xuICAgICAgICB2YXIgaXNWaWRlbyA9IHN0cmVhbS5nZXRWaWRlb1RyYWNrcygpLmxlbmd0aCA+IDA7XG5cbiAgICAgICAgdmFyIGVsZW1lbnQgPSBpc1ZpZGVvXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3ZpZGVvJylcbiAgICAgICAgICAgICAgICAgICAgICAgIDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYXVkaW8nKTtcbiAgICAgICAgdmFyIGlkID0gKGlzVmlkZW8gPyAncmVtb3RlVmlkZW9fJyA6ICdyZW1vdGVBdWRpb18nKVxuICAgICAgICAgICAgICAgICAgICArIHNpZCArICdfJyArIHN0cmVhbS5pZDtcblxuICAgICAgICBlbGVtZW50LmlkID0gaWQ7XG4gICAgICAgIGVsZW1lbnQuYXV0b3BsYXkgPSB0cnVlO1xuICAgICAgICBlbGVtZW50Lm9uY29udGV4dG1lbnUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBmYWxzZTsgfTtcblxuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9O1xuXG4gICAgbXkuYWRkUmVtb3RlU3RyZWFtRWxlbWVudFxuICAgICAgICA9IGZ1bmN0aW9uIChjb250YWluZXIsIHNpZCwgc3RyZWFtLCBwZWVySmlkLCB0aGVzc3JjKSB7XG4gICAgICAgIHZhciBuZXdFbGVtZW50SWQgPSBudWxsO1xuXG4gICAgICAgIHZhciBpc1ZpZGVvID0gc3RyZWFtLmdldFZpZGVvVHJhY2tzKCkubGVuZ3RoID4gMDtcblxuICAgICAgICBpZiAoY29udGFpbmVyKSB7XG4gICAgICAgICAgICB2YXIgc3RyZWFtRWxlbWVudCA9IFZpZGVvTGF5b3V0LmNyZWF0ZVN0cmVhbUVsZW1lbnQoc2lkLCBzdHJlYW0pO1xuICAgICAgICAgICAgbmV3RWxlbWVudElkID0gc3RyZWFtRWxlbWVudC5pZDtcblxuICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHN0cmVhbUVsZW1lbnQpO1xuXG4gICAgICAgICAgICB2YXIgc2VsID0gJCgnIycgKyBuZXdFbGVtZW50SWQpO1xuICAgICAgICAgICAgc2VsLmhpZGUoKTtcblxuICAgICAgICAgICAgLy8gSWYgdGhlIGNvbnRhaW5lciBpcyBjdXJyZW50bHkgdmlzaWJsZSB3ZSBhdHRhY2ggdGhlIHN0cmVhbS5cbiAgICAgICAgICAgIGlmICghaXNWaWRlb1xuICAgICAgICAgICAgICAgIHx8IChjb250YWluZXIub2Zmc2V0UGFyZW50ICE9PSBudWxsICYmIGlzVmlkZW8pKSB7XG4gICAgICAgICAgICAgICAgYXR0YWNoTWVkaWFTdHJlYW0oc2VsLCBzdHJlYW0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKGlzVmlkZW8pXG4gICAgICAgICAgICAgICAgICAgIHdhaXRGb3JSZW1vdGVWaWRlbyhzZWwsIHRoZXNzcmMsIHN0cmVhbSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHN0cmVhbS5vbmVuZGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdHJlYW0gZW5kZWQnLCB0aGlzKTtcblxuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnJlbW92ZVJlbW90ZVN0cmVhbUVsZW1lbnQoc3RyZWFtLCBjb250YWluZXIpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHBlZXJKaWQpXG4gICAgICAgICAgICAgICAgICAgIENvbnRhY3RMaXN0LnJlbW92ZUNvbnRhY3QocGVlckppZCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBBZGQgY2xpY2sgaGFuZGxlci5cbiAgICAgICAgICAgIGNvbnRhaW5lci5vbmNsaWNrID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgKiBGSVhNRSBJdCB0dXJucyBvdXQgdGhhdCB2aWRlb1RodW1iIG1heSBub3QgZXhpc3QgKGlmIHRoZXJlIGlzXG4gICAgICAgICAgICAgICAgICogbm8gYWN0dWFsIHZpZGVvKS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB2YXIgdmlkZW9UaHVtYiA9ICQoJyMnICsgY29udGFpbmVyLmlkICsgJz52aWRlbycpLmdldCgwKTtcblxuICAgICAgICAgICAgICAgIGlmICh2aWRlb1RodW1iKVxuICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5oYW5kbGVWaWRlb1RodW1iQ2xpY2tlZCh2aWRlb1RodW1iLnNyYyk7XG5cbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIEFkZCBob3ZlciBoYW5kbGVyXG4gICAgICAgICAgICAkKGNvbnRhaW5lcikuaG92ZXIoXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dEaXNwbGF5TmFtZShjb250YWluZXIuaWQsIHRydWUpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2aWRlb1NyYyA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkKCcjJyArIGNvbnRhaW5lci5pZCArICc+dmlkZW8nKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICYmICQoJyMnICsgY29udGFpbmVyLmlkICsgJz52aWRlbycpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3JjID0gJCgnIycgKyBjb250YWluZXIuaWQgKyAnPnZpZGVvJykuZ2V0KDApLnNyYztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHRoZSB2aWRlbyBoYXMgYmVlbiBcInBpbm5lZFwiIGJ5IHRoZSB1c2VyIHdlIHdhbnQgdG9cbiAgICAgICAgICAgICAgICAgICAgLy8ga2VlcCB0aGUgZGlzcGxheSBuYW1lIG9uIHBsYWNlLlxuICAgICAgICAgICAgICAgICAgICBpZiAoIVZpZGVvTGF5b3V0LmlzTGFyZ2VWaWRlb1Zpc2libGUoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IHZpZGVvU3JjICE9PSAkKCcjbGFyZ2VWaWRlbycpLmF0dHIoJ3NyYycpKVxuICAgICAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0Rpc3BsYXlOYW1lKGNvbnRhaW5lci5pZCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3RWxlbWVudElkO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIHRoZSByZW1vdGUgc3RyZWFtIGVsZW1lbnQgY29ycmVzcG9uZGluZyB0byB0aGUgZ2l2ZW4gc3RyZWFtIGFuZFxuICAgICAqIHBhcmVudCBjb250YWluZXIuXG4gICAgICogXG4gICAgICogQHBhcmFtIHN0cmVhbSB0aGUgc3RyZWFtXG4gICAgICogQHBhcmFtIGNvbnRhaW5lclxuICAgICAqL1xuICAgIG15LnJlbW92ZVJlbW90ZVN0cmVhbUVsZW1lbnQgPSBmdW5jdGlvbiAoc3RyZWFtLCBjb250YWluZXIpIHtcbiAgICAgICAgaWYgKCFjb250YWluZXIpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgdmFyIHNlbGVjdCA9IG51bGw7XG4gICAgICAgIHZhciByZW1vdmVkVmlkZW9TcmMgPSBudWxsO1xuICAgICAgICBpZiAoc3RyZWFtLmdldFZpZGVvVHJhY2tzKCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgc2VsZWN0ID0gJCgnIycgKyBjb250YWluZXIuaWQgKyAnPnZpZGVvJyk7XG4gICAgICAgICAgICByZW1vdmVkVmlkZW9TcmMgPSBzZWxlY3QuZ2V0KDApLnNyYztcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBzZWxlY3QgPSAkKCcjJyArIGNvbnRhaW5lci5pZCArICc+YXVkaW8nKTtcblxuICAgICAgICAvLyBSZW1vdmUgdmlkZW8gc291cmNlIGZyb20gdGhlIG1hcHBpbmcuXG4gICAgICAgIGRlbGV0ZSB2aWRlb1NyY1RvU3NyY1tyZW1vdmVkVmlkZW9TcmNdO1xuXG4gICAgICAgIC8vIE1hcmsgdmlkZW8gYXMgcmVtb3ZlZCB0byBjYW5jZWwgd2FpdGluZyBsb29wKGlmIHZpZGVvIGlzIHJlbW92ZWRcbiAgICAgICAgLy8gYmVmb3JlIGhhcyBzdGFydGVkKVxuICAgICAgICBzZWxlY3QucmVtb3ZlZCA9IHRydWU7XG4gICAgICAgIHNlbGVjdC5yZW1vdmUoKTtcblxuICAgICAgICB2YXIgYXVkaW9Db3VudCA9ICQoJyMnICsgY29udGFpbmVyLmlkICsgJz5hdWRpbycpLmxlbmd0aDtcbiAgICAgICAgdmFyIHZpZGVvQ291bnQgPSAkKCcjJyArIGNvbnRhaW5lci5pZCArICc+dmlkZW8nKS5sZW5ndGg7XG5cbiAgICAgICAgaWYgKCFhdWRpb0NvdW50ICYmICF2aWRlb0NvdW50KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlbW92ZSB3aG9sZSB1c2VyXCIsIGNvbnRhaW5lci5pZCk7XG4gICAgICAgICAgICAvLyBSZW1vdmUgd2hvbGUgY29udGFpbmVyXG4gICAgICAgICAgICBjb250YWluZXIucmVtb3ZlKCk7XG4gICAgICAgICAgICBVdGlsLnBsYXlTb3VuZE5vdGlmaWNhdGlvbigndXNlckxlZnQnKTtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZVRodW1ibmFpbHMoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZW1vdmVkVmlkZW9TcmMpXG4gICAgICAgICAgICBWaWRlb0xheW91dC51cGRhdGVSZW1vdmVkVmlkZW8ocmVtb3ZlZFZpZGVvU3JjKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2hvdy9oaWRlIHBlZXIgY29udGFpbmVyIGZvciB0aGUgZ2l2ZW4gcmVzb3VyY2VKaWQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2hvd1BlZXJDb250YWluZXIocmVzb3VyY2VKaWQsIGlzU2hvdykge1xuICAgICAgICB2YXIgcGVlckNvbnRhaW5lciA9ICQoJyNwYXJ0aWNpcGFudF8nICsgcmVzb3VyY2VKaWQpO1xuXG4gICAgICAgIGlmICghcGVlckNvbnRhaW5lcilcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBpZiAoIXBlZXJDb250YWluZXIuaXMoJzp2aXNpYmxlJykgJiYgaXNTaG93KVxuICAgICAgICAgICAgcGVlckNvbnRhaW5lci5zaG93KCk7XG4gICAgICAgIGVsc2UgaWYgKHBlZXJDb250YWluZXIuaXMoJzp2aXNpYmxlJykgJiYgIWlzU2hvdylcbiAgICAgICAgICAgIHBlZXJDb250YWluZXIuaGlkZSgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBkaXNwbGF5IG5hbWUgZm9yIHRoZSBnaXZlbiB2aWRlbyBzcGFuIGlkLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNldERpc3BsYXlOYW1lKHZpZGVvU3BhbklkLCBkaXNwbGF5TmFtZSkge1xuICAgICAgICB2YXIgbmFtZVNwYW4gPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5zcGFuLmRpc3BsYXluYW1lJyk7XG4gICAgICAgIHZhciBkZWZhdWx0TG9jYWxEaXNwbGF5TmFtZSA9IFwiTWVcIjtcbiAgICAgICAgdmFyIGRlZmF1bHRSZW1vdGVEaXNwbGF5TmFtZSA9IFwiU3BlYWtlclwiO1xuXG4gICAgICAgIC8vIElmIHdlIGFscmVhZHkgaGF2ZSBhIGRpc3BsYXkgbmFtZSBmb3IgdGhpcyB2aWRlby5cbiAgICAgICAgaWYgKG5hbWVTcGFuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBuYW1lU3BhbkVsZW1lbnQgPSBuYW1lU3Bhbi5nZXQoMCk7XG5cbiAgICAgICAgICAgIGlmIChuYW1lU3BhbkVsZW1lbnQuaWQgPT09ICdsb2NhbERpc3BsYXlOYW1lJyAmJlxuICAgICAgICAgICAgICAgICQoJyNsb2NhbERpc3BsYXlOYW1lJykudGV4dCgpICE9PSBkaXNwbGF5TmFtZSkge1xuICAgICAgICAgICAgICAgIGlmIChkaXNwbGF5TmFtZSAmJiBkaXNwbGF5TmFtZS5sZW5ndGggPiAwKVxuICAgICAgICAgICAgICAgICAgICAkKCcjbG9jYWxEaXNwbGF5TmFtZScpLnRleHQoZGlzcGxheU5hbWUgKyAnIChtZSknKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICQoJyNsb2NhbERpc3BsYXlOYW1lJykudGV4dChkZWZhdWx0TG9jYWxEaXNwbGF5TmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChkaXNwbGF5TmFtZSAmJiBkaXNwbGF5TmFtZS5sZW5ndGggPiAwKVxuICAgICAgICAgICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkICsgJ19uYW1lJykudGV4dChkaXNwbGF5TmFtZSk7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkICsgJ19uYW1lJykudGV4dChkZWZhdWx0UmVtb3RlRGlzcGxheU5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGVkaXRCdXR0b24gPSBudWxsO1xuXG4gICAgICAgICAgICBuYW1lU3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIG5hbWVTcGFuLmNsYXNzTmFtZSA9ICdkaXNwbGF5bmFtZSc7XG4gICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkKVswXS5hcHBlbmRDaGlsZChuYW1lU3Bhbik7XG5cbiAgICAgICAgICAgIGlmICh2aWRlb1NwYW5JZCA9PT0gJ2xvY2FsVmlkZW9Db250YWluZXInKSB7XG4gICAgICAgICAgICAgICAgZWRpdEJ1dHRvbiA9IGNyZWF0ZUVkaXREaXNwbGF5TmFtZUJ1dHRvbigpO1xuICAgICAgICAgICAgICAgIG5hbWVTcGFuLmlubmVyVGV4dCA9IGRlZmF1bHRMb2NhbERpc3BsYXlOYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbmFtZVNwYW4uaW5uZXJUZXh0ID0gZGVmYXVsdFJlbW90ZURpc3BsYXlOYW1lO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZGlzcGxheU5hbWUgJiYgZGlzcGxheU5hbWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIG5hbWVTcGFuLmlubmVyVGV4dCA9IGRpc3BsYXlOYW1lO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWVkaXRCdXR0b24pIHtcbiAgICAgICAgICAgICAgICBuYW1lU3Bhbi5pZCA9IHZpZGVvU3BhbklkICsgJ19uYW1lJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbmFtZVNwYW4uaWQgPSAnbG9jYWxEaXNwbGF5TmFtZSc7XG4gICAgICAgICAgICAgICAgJCgnIycgKyB2aWRlb1NwYW5JZClbMF0uYXBwZW5kQ2hpbGQoZWRpdEJ1dHRvbik7XG5cbiAgICAgICAgICAgICAgICB2YXIgZWRpdGFibGVUZXh0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICAgICAgICAgICAgICBlZGl0YWJsZVRleHQuY2xhc3NOYW1lID0gJ2Rpc3BsYXluYW1lJztcbiAgICAgICAgICAgICAgICBlZGl0YWJsZVRleHQuaWQgPSAnZWRpdERpc3BsYXlOYW1lJztcblxuICAgICAgICAgICAgICAgIGlmIChkaXNwbGF5TmFtZSAmJiBkaXNwbGF5TmFtZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgZWRpdGFibGVUZXh0LnZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICA9IGRpc3BsYXlOYW1lLnN1YnN0cmluZygwLCBkaXNwbGF5TmFtZS5pbmRleE9mKCcgKG1lKScpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBlZGl0YWJsZVRleHQuc2V0QXR0cmlidXRlKCdzdHlsZScsICdkaXNwbGF5Om5vbmU7Jyk7XG4gICAgICAgICAgICAgICAgZWRpdGFibGVUZXh0LnNldEF0dHJpYnV0ZSgncGxhY2Vob2xkZXInLCAnZXguIEphbmUgUGluaycpO1xuICAgICAgICAgICAgICAgICQoJyMnICsgdmlkZW9TcGFuSWQpWzBdLmFwcGVuZENoaWxkKGVkaXRhYmxlVGV4dCk7XG5cbiAgICAgICAgICAgICAgICAkKCcjbG9jYWxWaWRlb0NvbnRhaW5lciAuZGlzcGxheW5hbWUnKVxuICAgICAgICAgICAgICAgICAgICAuYmluZChcImNsaWNrXCIsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAkKCcjbG9jYWxEaXNwbGF5TmFtZScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2VkaXREaXNwbGF5TmFtZScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2VkaXREaXNwbGF5TmFtZScpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNlZGl0RGlzcGxheU5hbWUnKS5zZWxlY3QoKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgaW5wdXREaXNwbGF5TmFtZUhhbmRsZXIgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5pY2tuYW1lICE9PSBuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmlja25hbWUgPSBuYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UuZGlzcGxheW5hbWUgPSBuaWNrbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuYWRkRGlzcGxheU5hbWVUb1ByZXNlbmNlKG5pY2tuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuc2VuZFByZXNlbmNlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXAuQ2hhdCgpLnNldENoYXRDb252ZXJzYXRpb25Nb2RlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoISQoJyNsb2NhbERpc3BsYXlOYW1lJykuaXMoXCI6dmlzaWJsZVwiKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuaWNrbmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI2xvY2FsRGlzcGxheU5hbWUnKS50ZXh0KG5pY2tuYW1lICsgXCIgKG1lKVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNsb2NhbERpc3BsYXlOYW1lJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50ZXh0KGRlZmF1bHRMb2NhbERpc3BsYXlOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjbG9jYWxEaXNwbGF5TmFtZScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgJCgnI2VkaXREaXNwbGF5TmFtZScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAkKCcjZWRpdERpc3BsYXlOYW1lJykub25lKFwiZm9jdXNvdXRcIiwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0RGlzcGxheU5hbWVIYW5kbGVyKHRoaXMudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAkKCcjZWRpdERpc3BsYXlOYW1lJykub24oJ2tleWRvd24nLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXREaXNwbGF5TmFtZUhhbmRsZXIodGhpcy52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3dzL2hpZGVzIHRoZSBkaXNwbGF5IG5hbWUgb24gdGhlIHJlbW90ZSB2aWRlby5cbiAgICAgKiBAcGFyYW0gdmlkZW9TcGFuSWQgdGhlIGlkZW50aWZpZXIgb2YgdGhlIHZpZGVvIHNwYW4gZWxlbWVudFxuICAgICAqIEBwYXJhbSBpc1Nob3cgaW5kaWNhdGVzIGlmIHRoZSBkaXNwbGF5IG5hbWUgc2hvdWxkIGJlIHNob3duIG9yIGhpZGRlblxuICAgICAqL1xuICAgIG15LnNob3dEaXNwbGF5TmFtZSA9IGZ1bmN0aW9uKHZpZGVvU3BhbklkLCBpc1Nob3cpIHtcbiAgICAgICAgdmFyIG5hbWVTcGFuID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+c3Bhbi5kaXNwbGF5bmFtZScpLmdldCgwKTtcbiAgICAgICAgaWYgKGlzU2hvdykge1xuICAgICAgICAgICAgaWYgKG5hbWVTcGFuICYmIG5hbWVTcGFuLmlubmVySFRNTCAmJiBuYW1lU3Bhbi5pbm5lckhUTUwubGVuZ3RoKSBcbiAgICAgICAgICAgICAgICBuYW1lU3Bhbi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImRpc3BsYXk6aW5saW5lLWJsb2NrO1wiKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmIChuYW1lU3BhbilcbiAgICAgICAgICAgICAgICBuYW1lU3Bhbi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImRpc3BsYXk6bm9uZTtcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2hvd3MgdGhlIHByZXNlbmNlIHN0YXR1cyBtZXNzYWdlIGZvciB0aGUgZ2l2ZW4gdmlkZW8uXG4gICAgICovXG4gICAgbXkuc2V0UHJlc2VuY2VTdGF0dXMgPSBmdW5jdGlvbiAodmlkZW9TcGFuSWQsIHN0YXR1c01zZykge1xuXG4gICAgICAgIGlmICghJCgnIycgKyB2aWRlb1NwYW5JZCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBObyBjb250YWluZXJcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzdGF0dXNTcGFuID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+c3Bhbi5zdGF0dXMnKTtcbiAgICAgICAgaWYgKCFzdGF0dXNTcGFuLmxlbmd0aCkge1xuICAgICAgICAgICAgLy9BZGQgc3RhdHVzIHNwYW5cbiAgICAgICAgICAgIHN0YXR1c1NwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICBzdGF0dXNTcGFuLmNsYXNzTmFtZSA9ICdzdGF0dXMnO1xuICAgICAgICAgICAgc3RhdHVzU3Bhbi5pZCA9IHZpZGVvU3BhbklkICsgJ19zdGF0dXMnO1xuICAgICAgICAgICAgJCgnIycgKyB2aWRlb1NwYW5JZClbMF0uYXBwZW5kQ2hpbGQoc3RhdHVzU3Bhbik7XG5cbiAgICAgICAgICAgIHN0YXR1c1NwYW4gPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5zcGFuLnN0YXR1cycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGlzcGxheSBzdGF0dXNcbiAgICAgICAgaWYgKHN0YXR1c01zZyAmJiBzdGF0dXNNc2cubGVuZ3RoKSB7XG4gICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkICsgJ19zdGF0dXMnKS50ZXh0KHN0YXR1c01zZyk7XG4gICAgICAgICAgICBzdGF0dXNTcGFuLmdldCgwKS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImRpc3BsYXk6aW5saW5lLWJsb2NrO1wiKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGVcbiAgICAgICAgICAgIHN0YXR1c1NwYW4uZ2V0KDApLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTpub25lO1wiKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBhIHZpc3VhbCBpbmRpY2F0b3IgZm9yIHRoZSBmb2N1cyBvZiB0aGUgY29uZmVyZW5jZS5cbiAgICAgKiBDdXJyZW50bHkgaWYgd2UncmUgbm90IHRoZSBvd25lciBvZiB0aGUgY29uZmVyZW5jZSB3ZSBvYnRhaW4gdGhlIGZvY3VzXG4gICAgICogZnJvbSB0aGUgY29ubmVjdGlvbi5qaW5nbGUuc2Vzc2lvbnMuXG4gICAgICovXG4gICAgbXkuc2hvd0ZvY3VzSW5kaWNhdG9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChmb2N1cyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdmFyIGluZGljYXRvclNwYW4gPSAkKCcjbG9jYWxWaWRlb0NvbnRhaW5lciAuZm9jdXNpbmRpY2F0b3InKTtcblxuICAgICAgICAgICAgaWYgKGluZGljYXRvclNwYW4uY2hpbGRyZW4oKS5sZW5ndGggPT09IDApXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY3JlYXRlRm9jdXNJbmRpY2F0b3JFbGVtZW50KGluZGljYXRvclNwYW5bMF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKE9iamVjdC5rZXlzKGNvbm5lY3Rpb24uamluZ2xlLnNlc3Npb25zKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBJZiB3ZSdyZSBvbmx5IGEgcGFydGljaXBhbnQgdGhlIGZvY3VzIHdpbGwgYmUgdGhlIG9ubHkgc2Vzc2lvbiB3ZSBoYXZlLlxuICAgICAgICAgICAgdmFyIHNlc3Npb25cbiAgICAgICAgICAgICAgICA9IGNvbm5lY3Rpb24uamluZ2xlLnNlc3Npb25zXG4gICAgICAgICAgICAgICAgICAgIFtPYmplY3Qua2V5cyhjb25uZWN0aW9uLmppbmdsZS5zZXNzaW9ucylbMF1dO1xuICAgICAgICAgICAgdmFyIGZvY3VzSWRcbiAgICAgICAgICAgICAgICA9ICdwYXJ0aWNpcGFudF8nICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoc2Vzc2lvbi5wZWVyamlkKTtcblxuICAgICAgICAgICAgdmFyIGZvY3VzQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZm9jdXNJZCk7XG4gICAgICAgICAgICBpZiAoIWZvY3VzQ29udGFpbmVyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIk5vIGZvY3VzIGNvbnRhaW5lciFcIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGluZGljYXRvclNwYW4gPSAkKCcjJyArIGZvY3VzSWQgKyAnIC5mb2N1c2luZGljYXRvcicpO1xuXG4gICAgICAgICAgICBpZiAoIWluZGljYXRvclNwYW4gfHwgaW5kaWNhdG9yU3Bhbi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBpbmRpY2F0b3JTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgICAgIGluZGljYXRvclNwYW4uY2xhc3NOYW1lID0gJ2ZvY3VzaW5kaWNhdG9yJztcblxuICAgICAgICAgICAgICAgIGZvY3VzQ29udGFpbmVyLmFwcGVuZENoaWxkKGluZGljYXRvclNwYW4pO1xuXG4gICAgICAgICAgICAgICAgY3JlYXRlRm9jdXNJbmRpY2F0b3JFbGVtZW50KGluZGljYXRvclNwYW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3dzIHZpZGVvIG11dGVkIGluZGljYXRvciBvdmVyIHNtYWxsIHZpZGVvcy5cbiAgICAgKi9cbiAgICBteS5zaG93VmlkZW9JbmRpY2F0b3IgPSBmdW5jdGlvbih2aWRlb1NwYW5JZCwgaXNNdXRlZCkge1xuICAgICAgICB2YXIgdmlkZW9NdXRlZFNwYW4gPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5zcGFuLnZpZGVvTXV0ZWQnKTtcblxuICAgICAgICBpZiAoaXNNdXRlZCA9PT0gJ2ZhbHNlJykge1xuICAgICAgICAgICAgaWYgKHZpZGVvTXV0ZWRTcGFuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB2aWRlb011dGVkU3Bhbi5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBhdWRpb011dGVkU3BhbiA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPnNwYW4uYXVkaW9NdXRlZCcpO1xuXG4gICAgICAgICAgICB2aWRlb011dGVkU3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIHZpZGVvTXV0ZWRTcGFuLmNsYXNzTmFtZSA9ICd2aWRlb011dGVkJztcbiAgICAgICAgICAgIGlmIChhdWRpb011dGVkU3Bhbikge1xuICAgICAgICAgICAgICAgIHZpZGVvTXV0ZWRTcGFuLnJpZ2h0ID0gJzMwcHgnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJCgnIycgKyB2aWRlb1NwYW5JZClbMF0uYXBwZW5kQ2hpbGQodmlkZW9NdXRlZFNwYW4pO1xuXG4gICAgICAgICAgICB2YXIgbXV0ZWRJbmRpY2F0b3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpJyk7XG4gICAgICAgICAgICBtdXRlZEluZGljYXRvci5jbGFzc05hbWUgPSAnaWNvbi1jYW1lcmEtZGlzYWJsZWQnO1xuICAgICAgICAgICAgVXRpbC5zZXRUb29sdGlwKG11dGVkSW5kaWNhdG9yLFxuICAgICAgICAgICAgICAgICAgICBcIlBhcnRpY2lwYW50IGhhczxici8+c3RvcHBlZCB0aGUgY2FtZXJhLlwiLFxuICAgICAgICAgICAgICAgICAgICBcInRvcFwiKTtcbiAgICAgICAgICAgIHZpZGVvTXV0ZWRTcGFuLmFwcGVuZENoaWxkKG11dGVkSW5kaWNhdG9yKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBhdWRpbyBtdXRlZCBpbmRpY2F0b3Igb3ZlciBzbWFsbCB2aWRlb3MuXG4gICAgICovXG4gICAgbXkuc2hvd0F1ZGlvSW5kaWNhdG9yID0gZnVuY3Rpb24odmlkZW9TcGFuSWQsIGlzTXV0ZWQpIHtcbiAgICAgICAgdmFyIGF1ZGlvTXV0ZWRTcGFuID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+c3Bhbi5hdWRpb011dGVkJyk7XG5cbiAgICAgICAgaWYgKGlzTXV0ZWQgPT09ICdmYWxzZScpIHtcbiAgICAgICAgICAgIGlmIChhdWRpb011dGVkU3Bhbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgYXVkaW9NdXRlZFNwYW4ucmVtb3ZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgdmlkZW9NdXRlZFNwYW4gPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5zcGFuLnZpZGVvTXV0ZWQnKTtcblxuICAgICAgICAgICAgYXVkaW9NdXRlZFNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICBhdWRpb011dGVkU3Bhbi5jbGFzc05hbWUgPSAnYXVkaW9NdXRlZCc7XG4gICAgICAgICAgICBVdGlsLnNldFRvb2x0aXAoYXVkaW9NdXRlZFNwYW4sXG4gICAgICAgICAgICAgICAgICAgIFwiUGFydGljaXBhbnQgaXMgbXV0ZWRcIixcbiAgICAgICAgICAgICAgICAgICAgXCJ0b3BcIik7XG5cbiAgICAgICAgICAgIGlmICh2aWRlb011dGVkU3Bhbikge1xuICAgICAgICAgICAgICAgIGF1ZGlvTXV0ZWRTcGFuLnJpZ2h0ID0gJzMwcHgnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJCgnIycgKyB2aWRlb1NwYW5JZClbMF0uYXBwZW5kQ2hpbGQoYXVkaW9NdXRlZFNwYW4pO1xuXG4gICAgICAgICAgICB2YXIgbXV0ZWRJbmRpY2F0b3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpJyk7XG4gICAgICAgICAgICBtdXRlZEluZGljYXRvci5jbGFzc05hbWUgPSAnaWNvbi1taWMtZGlzYWJsZWQnO1xuICAgICAgICAgICAgYXVkaW9NdXRlZFNwYW4uYXBwZW5kQ2hpbGQobXV0ZWRJbmRpY2F0b3IpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlc2l6ZXMgdGhlIGxhcmdlIHZpZGVvIGNvbnRhaW5lci5cbiAgICAgKi9cbiAgICBteS5yZXNpemVMYXJnZVZpZGVvQ29udGFpbmVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBkZXAuQ2hhdCgpLnJlc2l6ZUNoYXQoKTtcbiAgICAgICAgdmFyIGF2YWlsYWJsZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgdmFyIGF2YWlsYWJsZVdpZHRoID0gZGVwLlVJVXRpbCgpLmdldEF2YWlsYWJsZVZpZGVvV2lkdGgoKTtcbiAgICAgICAgaWYgKGF2YWlsYWJsZVdpZHRoIDwgMCB8fCBhdmFpbGFibGVIZWlnaHQgPCAwKSByZXR1cm47XG5cbiAgICAgICAgJCgnI3ZpZGVvc3BhY2UnKS53aWR0aChhdmFpbGFibGVXaWR0aCk7XG4gICAgICAgICQoJyN2aWRlb3NwYWNlJykuaGVpZ2h0KGF2YWlsYWJsZUhlaWdodCk7XG4gICAgICAgICQoJyNsYXJnZVZpZGVvQ29udGFpbmVyJykud2lkdGgoYXZhaWxhYmxlV2lkdGgpO1xuICAgICAgICAkKCcjbGFyZ2VWaWRlb0NvbnRhaW5lcicpLmhlaWdodChhdmFpbGFibGVIZWlnaHQpO1xuXG4gICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZVRodW1ibmFpbHMoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVzaXplcyB0aHVtYm5haWxzLlxuICAgICAqL1xuICAgIG15LnJlc2l6ZVRodW1ibmFpbHMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHZpZGVvU3BhY2VXaWR0aCA9ICQoJyNyZW1vdGVWaWRlb3MnKS53aWR0aCgpO1xuXG4gICAgICAgIHZhciB0aHVtYm5haWxTaXplID0gVmlkZW9MYXlvdXQuY2FsY3VsYXRlVGh1bWJuYWlsU2l6ZSh2aWRlb1NwYWNlV2lkdGgpO1xuICAgICAgICB2YXIgd2lkdGggPSB0aHVtYm5haWxTaXplWzBdO1xuICAgICAgICB2YXIgaGVpZ2h0ID0gdGh1bWJuYWlsU2l6ZVsxXTtcblxuICAgICAgICAvLyBzaXplIHZpZGVvcyBzbyB0aGF0IHdoaWxlIGtlZXBpbmcgQVIgYW5kIG1heCBoZWlnaHQsIHdlIGhhdmUgYVxuICAgICAgICAvLyBuaWNlIGZpdFxuICAgICAgICAkKCcjcmVtb3RlVmlkZW9zJykuaGVpZ2h0KGhlaWdodCk7XG4gICAgICAgICQoJyNyZW1vdGVWaWRlb3M+c3BhbicpLndpZHRoKHdpZHRoKTtcbiAgICAgICAgJCgnI3JlbW90ZVZpZGVvcz5zcGFuJykuaGVpZ2h0KGhlaWdodCk7XG5cbiAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcihcInJlbW90ZXZpZGVvLnJlc2l6ZWRcIiwgW3dpZHRoLCBoZWlnaHRdKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRW5hYmxlcyB0aGUgZG9taW5hbnQgc3BlYWtlciBVSS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSByZXNvdXJjZUppZCB0aGUgamlkIGluZGljYXRpbmcgdGhlIHZpZGVvIGVsZW1lbnQgdG9cbiAgICAgKiBhY3RpdmF0ZS9kZWFjdGl2YXRlXG4gICAgICogQHBhcmFtIGlzRW5hYmxlIGluZGljYXRlcyBpZiB0aGUgZG9taW5hbnQgc3BlYWtlciBzaG91bGQgYmUgZW5hYmxlZCBvclxuICAgICAqIGRpc2FibGVkXG4gICAgICovXG4gICAgbXkuZW5hYmxlRG9taW5hbnRTcGVha2VyID0gZnVuY3Rpb24ocmVzb3VyY2VKaWQsIGlzRW5hYmxlKSB7XG4gICAgICAgIHZhciBkaXNwbGF5TmFtZSA9IHJlc291cmNlSmlkO1xuICAgICAgICB2YXIgbmFtZVNwYW4gPSAkKCcjcGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkICsgJz5zcGFuLmRpc3BsYXluYW1lJyk7XG4gICAgICAgIGlmIChuYW1lU3Bhbi5sZW5ndGggPiAwKVxuICAgICAgICAgICAgZGlzcGxheU5hbWUgPSBuYW1lU3Bhbi50ZXh0KCk7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJVSSBlbmFibGUgZG9taW5hbnQgc3BlYWtlclwiLFxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5TmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VKaWQsXG4gICAgICAgICAgICAgICAgICAgIGlzRW5hYmxlKTtcblxuICAgICAgICB2YXIgdmlkZW9TcGFuSWQgPSBudWxsO1xuICAgICAgICB2YXIgdmlkZW9Db250YWluZXJJZCA9IG51bGw7XG4gICAgICAgIGlmIChyZXNvdXJjZUppZFxuICAgICAgICAgICAgICAgID09PSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChjb25uZWN0aW9uLmVtdWMubXlyb29tamlkKSkge1xuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAnbG9jYWxWaWRlb1dyYXBwZXInO1xuICAgICAgICAgICAgdmlkZW9Db250YWluZXJJZCA9ICdsb2NhbFZpZGVvQ29udGFpbmVyJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZpZGVvU3BhbklkID0gJ3BhcnRpY2lwYW50XycgKyByZXNvdXJjZUppZDtcbiAgICAgICAgICAgIHZpZGVvQ29udGFpbmVySWQgPSB2aWRlb1NwYW5JZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHZpZGVvU3BhbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHZpZGVvQ29udGFpbmVySWQpO1xuXG4gICAgICAgIGlmICghdmlkZW9TcGFuKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiTm8gdmlkZW8gZWxlbWVudCBmb3IgamlkXCIsIHJlc291cmNlSmlkKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB2aWRlbyA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPnZpZGVvJyk7XG5cbiAgICAgICAgaWYgKHZpZGVvICYmIHZpZGVvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmIChpc0VuYWJsZSkge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dEaXNwbGF5TmFtZSh2aWRlb0NvbnRhaW5lcklkLCB0cnVlKTtcblxuICAgICAgICAgICAgICAgIGlmICghdmlkZW9TcGFuLmNsYXNzTGlzdC5jb250YWlucyhcImRvbWluYW50c3BlYWtlclwiKSlcbiAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFuLmNsYXNzTGlzdC5hZGQoXCJkb21pbmFudHNwZWFrZXJcIik7XG5cbiAgICAgICAgICAgICAgICB2aWRlby5jc3Moe3Zpc2liaWxpdHk6ICdoaWRkZW4nfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zaG93RGlzcGxheU5hbWUodmlkZW9Db250YWluZXJJZCwgZmFsc2UpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHZpZGVvU3Bhbi5jbGFzc0xpc3QuY29udGFpbnMoXCJkb21pbmFudHNwZWFrZXJcIikpXG4gICAgICAgICAgICAgICAgICAgIHZpZGVvU3Bhbi5jbGFzc0xpc3QucmVtb3ZlKFwiZG9taW5hbnRzcGVha2VyXCIpO1xuXG4gICAgICAgICAgICAgICAgdmlkZW8uY3NzKHt2aXNpYmlsaXR5OiAndmlzaWJsZSd9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBzZWxlY3RvciBvZiB2aWRlbyB0aHVtYm5haWwgY29udGFpbmVyIGZvciB0aGUgdXNlciBpZGVudGlmaWVkIGJ5XG4gICAgICogZ2l2ZW4gPHR0PnVzZXJKaWQ8L3R0PlxuICAgICAqIEBwYXJhbSB1c2VySmlkIHVzZXIncyBKaWQgZm9yIHdob20gd2Ugd2FudCB0byBnZXQgdGhlIHZpZGVvIGNvbnRhaW5lci5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRQYXJ0aWNpcGFudENvbnRhaW5lcih1c2VySmlkKVxuICAgIHtcbiAgICAgICAgaWYgKCF1c2VySmlkKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG5cbiAgICAgICAgaWYgKHVzZXJKaWQgPT09IGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQpXG4gICAgICAgICAgICByZXR1cm4gJChcIiNsb2NhbFZpZGVvQ29udGFpbmVyXCIpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gJChcIiNwYXJ0aWNpcGFudF9cIiArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHVzZXJKaWQpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBzaXplIGFuZCBwb3NpdGlvbiBvZiB0aGUgZ2l2ZW4gdmlkZW8gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB2aWRlbyB0aGUgdmlkZW8gZWxlbWVudCB0byBwb3NpdGlvblxuICAgICAqIEBwYXJhbSB3aWR0aCB0aGUgZGVzaXJlZCB2aWRlbyB3aWR0aFxuICAgICAqIEBwYXJhbSBoZWlnaHQgdGhlIGRlc2lyZWQgdmlkZW8gaGVpZ2h0XG4gICAgICogQHBhcmFtIGhvcml6b250YWxJbmRlbnQgdGhlIGxlZnQgYW5kIHJpZ2h0IGluZGVudFxuICAgICAqIEBwYXJhbSB2ZXJ0aWNhbEluZGVudCB0aGUgdG9wIGFuZCBib3R0b20gaW5kZW50XG4gICAgICovXG4gICAgZnVuY3Rpb24gcG9zaXRpb25WaWRlbyh2aWRlbyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgaG9yaXpvbnRhbEluZGVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRpY2FsSW5kZW50KSB7XG4gICAgICAgIHZpZGVvLndpZHRoKHdpZHRoKTtcbiAgICAgICAgdmlkZW8uaGVpZ2h0KGhlaWdodCk7XG4gICAgICAgIHZpZGVvLmNzcyh7ICB0b3A6IHZlcnRpY2FsSW5kZW50ICsgJ3B4JyxcbiAgICAgICAgICAgICAgICAgICAgIGJvdHRvbTogdmVydGljYWxJbmRlbnQgKyAncHgnLFxuICAgICAgICAgICAgICAgICAgICAgbGVmdDogaG9yaXpvbnRhbEluZGVudCArICdweCcsXG4gICAgICAgICAgICAgICAgICAgICByaWdodDogaG9yaXpvbnRhbEluZGVudCArICdweCd9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSB0aHVtYm5haWwgc2l6ZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB2aWRlb1NwYWNlV2lkdGggdGhlIHdpZHRoIG9mIHRoZSB2aWRlbyBzcGFjZVxuICAgICAqL1xuICAgIG15LmNhbGN1bGF0ZVRodW1ibmFpbFNpemUgPSBmdW5jdGlvbiAodmlkZW9TcGFjZVdpZHRoKSB7XG4gICAgICAgIC8vIENhbGN1bGF0ZSB0aGUgYXZhaWxhYmxlIGhlaWdodCwgd2hpY2ggaXMgdGhlIGlubmVyIHdpbmRvdyBoZWlnaHQgbWludXNcbiAgICAgICAvLyAzOXB4IGZvciB0aGUgaGVhZGVyIG1pbnVzIDJweCBmb3IgdGhlIGRlbGltaXRlciBsaW5lcyBvbiB0aGUgdG9wIGFuZFxuICAgICAgIC8vIGJvdHRvbSBvZiB0aGUgbGFyZ2UgdmlkZW8sIG1pbnVzIHRoZSAzNnB4IHNwYWNlIGluc2lkZSB0aGUgcmVtb3RlVmlkZW9zXG4gICAgICAgLy8gY29udGFpbmVyIHVzZWQgZm9yIGhpZ2hsaWdodGluZyBzaGFkb3cuXG4gICAgICAgdmFyIGF2YWlsYWJsZUhlaWdodCA9IDEwMDtcblxuICAgICAgIHZhciBudW12aWRzID0gMDtcbiAgICAgICBpZiAobGFzdE5Db3VudCAmJiBsYXN0TkNvdW50ID4gMClcbiAgICAgICAgICAgbnVtdmlkcyA9IGxhc3ROQ291bnQgKyAxO1xuICAgICAgIGVsc2VcbiAgICAgICAgICAgbnVtdmlkcyA9ICQoJyNyZW1vdGVWaWRlb3M+c3Bhbjp2aXNpYmxlJykubGVuZ3RoO1xuXG4gICAgICAgLy8gUmVtb3ZlIHRoZSAzcHggYm9yZGVycyBhcnJvdW5kIHZpZGVvcyBhbmQgYm9yZGVyIGFyb3VuZCB0aGUgcmVtb3RlXG4gICAgICAgLy8gdmlkZW9zIGFyZWFcbiAgICAgICB2YXIgYXZhaWxhYmxlV2luV2lkdGggPSB2aWRlb1NwYWNlV2lkdGggLSAyICogMyAqIG51bXZpZHMgLSA3MDtcblxuICAgICAgIHZhciBhdmFpbGFibGVXaWR0aCA9IGF2YWlsYWJsZVdpbldpZHRoIC8gbnVtdmlkcztcbiAgICAgICB2YXIgYXNwZWN0UmF0aW8gPSAxNi4wIC8gOS4wO1xuICAgICAgIHZhciBtYXhIZWlnaHQgPSBNYXRoLm1pbigxNjAsIGF2YWlsYWJsZUhlaWdodCk7XG4gICAgICAgYXZhaWxhYmxlSGVpZ2h0ID0gTWF0aC5taW4obWF4SGVpZ2h0LCBhdmFpbGFibGVXaWR0aCAvIGFzcGVjdFJhdGlvKTtcbiAgICAgICBpZiAoYXZhaWxhYmxlSGVpZ2h0IDwgYXZhaWxhYmxlV2lkdGggLyBhc3BlY3RSYXRpbykge1xuICAgICAgICAgICBhdmFpbGFibGVXaWR0aCA9IE1hdGguZmxvb3IoYXZhaWxhYmxlSGVpZ2h0ICogYXNwZWN0UmF0aW8pO1xuICAgICAgIH1cblxuICAgICAgIHJldHVybiBbYXZhaWxhYmxlV2lkdGgsIGF2YWlsYWJsZUhlaWdodF07XG4gICB9O1xuXG4gICAvKipcbiAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YgdGhlIHZpZGVvIGRpbWVuc2lvbnMsIHNvIHRoYXQgaXQga2VlcHMgaXQncyBhc3BlY3RcbiAgICAqIHJhdGlvIGFuZCBmaXRzIGF2YWlsYWJsZSBhcmVhIHdpdGggaXQncyBsYXJnZXIgZGltZW5zaW9uLiBUaGlzIG1ldGhvZFxuICAgICogZW5zdXJlcyB0aGF0IHdob2xlIHZpZGVvIHdpbGwgYmUgdmlzaWJsZSBhbmQgY2FuIGxlYXZlIGVtcHR5IGFyZWFzLlxuICAgICpcbiAgICAqIEByZXR1cm4gYW4gYXJyYXkgd2l0aCAyIGVsZW1lbnRzLCB0aGUgdmlkZW8gd2lkdGggYW5kIHRoZSB2aWRlbyBoZWlnaHRcbiAgICAqL1xuICAgZnVuY3Rpb24gZ2V0RGVza3RvcFZpZGVvU2l6ZSh2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlSGVpZ2h0KSB7XG4gICAgICAgaWYgKCF2aWRlb1dpZHRoKVxuICAgICAgICAgICB2aWRlb1dpZHRoID0gY3VycmVudFZpZGVvV2lkdGg7XG4gICAgICAgaWYgKCF2aWRlb0hlaWdodClcbiAgICAgICAgICAgdmlkZW9IZWlnaHQgPSBjdXJyZW50VmlkZW9IZWlnaHQ7XG5cbiAgICAgICB2YXIgYXNwZWN0UmF0aW8gPSB2aWRlb1dpZHRoIC8gdmlkZW9IZWlnaHQ7XG5cbiAgICAgICB2YXIgYXZhaWxhYmxlV2lkdGggPSBNYXRoLm1heCh2aWRlb1dpZHRoLCB2aWRlb1NwYWNlV2lkdGgpO1xuICAgICAgIHZhciBhdmFpbGFibGVIZWlnaHQgPSBNYXRoLm1heCh2aWRlb0hlaWdodCwgdmlkZW9TcGFjZUhlaWdodCk7XG5cbiAgICAgICB2aWRlb1NwYWNlSGVpZ2h0IC09ICQoJyNyZW1vdGVWaWRlb3MnKS5vdXRlckhlaWdodCgpO1xuXG4gICAgICAgaWYgKGF2YWlsYWJsZVdpZHRoIC8gYXNwZWN0UmF0aW8gPj0gdmlkZW9TcGFjZUhlaWdodClcbiAgICAgICB7XG4gICAgICAgICAgIGF2YWlsYWJsZUhlaWdodCA9IHZpZGVvU3BhY2VIZWlnaHQ7XG4gICAgICAgICAgIGF2YWlsYWJsZVdpZHRoID0gYXZhaWxhYmxlSGVpZ2h0ICogYXNwZWN0UmF0aW87XG4gICAgICAgfVxuXG4gICAgICAgaWYgKGF2YWlsYWJsZUhlaWdodCAqIGFzcGVjdFJhdGlvID49IHZpZGVvU3BhY2VXaWR0aClcbiAgICAgICB7XG4gICAgICAgICAgIGF2YWlsYWJsZVdpZHRoID0gdmlkZW9TcGFjZVdpZHRoO1xuICAgICAgICAgICBhdmFpbGFibGVIZWlnaHQgPSBhdmFpbGFibGVXaWR0aCAvIGFzcGVjdFJhdGlvO1xuICAgICAgIH1cblxuICAgICAgIHJldHVybiBbYXZhaWxhYmxlV2lkdGgsIGF2YWlsYWJsZUhlaWdodF07XG4gICB9XG5cblxuLyoqXG4gICAgICogUmV0dXJucyBhbiBhcnJheSBvZiB0aGUgdmlkZW8gZGltZW5zaW9ucywgc28gdGhhdCBpdCBjb3ZlcnMgdGhlIHNjcmVlbi5cbiAgICAgKiBJdCBsZWF2ZXMgbm8gZW1wdHkgYXJlYXMsIGJ1dCBzb21lIHBhcnRzIG9mIHRoZSB2aWRlbyBtaWdodCBub3QgYmUgdmlzaWJsZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gYW4gYXJyYXkgd2l0aCAyIGVsZW1lbnRzLCB0aGUgdmlkZW8gd2lkdGggYW5kIHRoZSB2aWRlbyBoZWlnaHRcbiAgICAgKi9cbiAgICBteS5nZXRDYW1lcmFWaWRlb1NpemUgPSBmdW5jdGlvbih2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlSGVpZ2h0KSB7XG4gICAgICAgIGlmICghdmlkZW9XaWR0aClcbiAgICAgICAgICAgIHZpZGVvV2lkdGggPSBjdXJyZW50VmlkZW9XaWR0aDtcbiAgICAgICAgaWYgKCF2aWRlb0hlaWdodClcbiAgICAgICAgICAgIHZpZGVvSGVpZ2h0ID0gY3VycmVudFZpZGVvSGVpZ2h0O1xuXG4gICAgICAgIHZhciBhc3BlY3RSYXRpbyA9IHZpZGVvV2lkdGggLyB2aWRlb0hlaWdodDtcblxuICAgICAgICB2YXIgYXZhaWxhYmxlV2lkdGggPSBNYXRoLm1heCh2aWRlb1dpZHRoLCB2aWRlb1NwYWNlV2lkdGgpO1xuICAgICAgICB2YXIgYXZhaWxhYmxlSGVpZ2h0ID0gTWF0aC5tYXgodmlkZW9IZWlnaHQsIHZpZGVvU3BhY2VIZWlnaHQpO1xuXG4gICAgICAgIGlmIChhdmFpbGFibGVXaWR0aCAvIGFzcGVjdFJhdGlvIDwgdmlkZW9TcGFjZUhlaWdodCkge1xuICAgICAgICAgICAgYXZhaWxhYmxlSGVpZ2h0ID0gdmlkZW9TcGFjZUhlaWdodDtcbiAgICAgICAgICAgIGF2YWlsYWJsZVdpZHRoID0gYXZhaWxhYmxlSGVpZ2h0ICogYXNwZWN0UmF0aW87XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYXZhaWxhYmxlSGVpZ2h0ICogYXNwZWN0UmF0aW8gPCB2aWRlb1NwYWNlV2lkdGgpIHtcbiAgICAgICAgICAgIGF2YWlsYWJsZVdpZHRoID0gdmlkZW9TcGFjZVdpZHRoO1xuICAgICAgICAgICAgYXZhaWxhYmxlSGVpZ2h0ID0gYXZhaWxhYmxlV2lkdGggLyBhc3BlY3RSYXRpbztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBbYXZhaWxhYmxlV2lkdGgsIGF2YWlsYWJsZUhlaWdodF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhbiBhcnJheSBvZiB0aGUgdmlkZW8gaG9yaXpvbnRhbCBhbmQgdmVydGljYWwgaW5kZW50cyxcbiAgICAgKiBzbyB0aGF0IGlmIGZpdHMgaXRzIHBhcmVudC5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gYW4gYXJyYXkgd2l0aCAyIGVsZW1lbnRzLCB0aGUgaG9yaXpvbnRhbCBpbmRlbnQgYW5kIHRoZSB2ZXJ0aWNhbFxuICAgICAqIGluZGVudFxuICAgICAqL1xuICAgIG15LmdldENhbWVyYVZpZGVvUG9zaXRpb24gPSBmdW5jdGlvbih2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlSGVpZ2h0KSB7XG4gICAgICAgIC8vIFBhcmVudCBoZWlnaHQgaXNuJ3QgY29tcGxldGVseSBjYWxjdWxhdGVkIHdoZW4gd2UgcG9zaXRpb24gdGhlIHZpZGVvIGluXG4gICAgICAgIC8vIGZ1bGwgc2NyZWVuIG1vZGUgYW5kIHRoaXMgaXMgd2h5IHdlIHVzZSB0aGUgc2NyZWVuIGhlaWdodCBpbiB0aGlzIGNhc2UuXG4gICAgICAgIC8vIE5lZWQgdG8gdGhpbmsgaXQgZnVydGhlciBhdCBzb21lIHBvaW50IGFuZCBpbXBsZW1lbnQgaXQgcHJvcGVybHkuXG4gICAgICAgIHZhciBpc0Z1bGxTY3JlZW4gPSBkb2N1bWVudC5mdWxsU2NyZWVuIHx8XG4gICAgICAgICAgICBkb2N1bWVudC5tb3pGdWxsU2NyZWVuIHx8XG4gICAgICAgICAgICBkb2N1bWVudC53ZWJraXRJc0Z1bGxTY3JlZW47XG4gICAgICAgIGlmIChpc0Z1bGxTY3JlZW4pXG4gICAgICAgICAgICB2aWRlb1NwYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuXG4gICAgICAgIHZhciBob3Jpem9udGFsSW5kZW50ID0gKHZpZGVvU3BhY2VXaWR0aCAtIHZpZGVvV2lkdGgpIC8gMjtcbiAgICAgICAgdmFyIHZlcnRpY2FsSW5kZW50ID0gKHZpZGVvU3BhY2VIZWlnaHQgLSB2aWRlb0hlaWdodCkgLyAyO1xuXG4gICAgICAgIHJldHVybiBbaG9yaXpvbnRhbEluZGVudCwgdmVydGljYWxJbmRlbnRdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgdGhlIGVkaXQgZGlzcGxheSBuYW1lIGJ1dHRvbi5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHRoZSBlZGl0IGJ1dHRvblxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZUVkaXREaXNwbGF5TmFtZUJ1dHRvbigpIHtcbiAgICAgICAgdmFyIGVkaXRCdXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgIGVkaXRCdXR0b24uY2xhc3NOYW1lID0gJ2Rpc3BsYXluYW1lJztcbiAgICAgICAgVXRpbC5zZXRUb29sdGlwKGVkaXRCdXR0b24sXG4gICAgICAgICAgICAgICAgICAgICAgICAnQ2xpY2sgdG8gZWRpdCB5b3VyPGJyLz5kaXNwbGF5IG5hbWUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0b3BcIik7XG4gICAgICAgIGVkaXRCdXR0b24uaW5uZXJIVE1MID0gJzxpIGNsYXNzPVwiZmEgZmEtcGVuY2lsXCI+PC9pPic7XG5cbiAgICAgICAgcmV0dXJuIGVkaXRCdXR0b247XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyB0aGUgZWxlbWVudCBpbmRpY2F0aW5nIHRoZSBmb2N1cyBvZiB0aGUgY29uZmVyZW5jZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYXJlbnRFbGVtZW50IHRoZSBwYXJlbnQgZWxlbWVudCB3aGVyZSB0aGUgZm9jdXMgaW5kaWNhdG9yIHdpbGxcbiAgICAgKiBiZSBhZGRlZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZUZvY3VzSW5kaWNhdG9yRWxlbWVudChwYXJlbnRFbGVtZW50KSB7XG4gICAgICAgIHZhciBmb2N1c0luZGljYXRvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2knKTtcbiAgICAgICAgZm9jdXNJbmRpY2F0b3IuY2xhc3NOYW1lID0gJ2ZhIGZhLXN0YXInO1xuICAgICAgICBwYXJlbnRFbGVtZW50LmFwcGVuZENoaWxkKGZvY3VzSW5kaWNhdG9yKTtcblxuICAgICAgICBVdGlsLnNldFRvb2x0aXAocGFyZW50RWxlbWVudCxcbiAgICAgICAgICAgICAgICBcIlRoZSBvd25lciBvZjxici8+dGhpcyBjb25mZXJlbmNlXCIsXG4gICAgICAgICAgICAgICAgXCJ0b3BcIik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgcmVtb3RlIHZpZGVvIG1lbnUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gamlkIHRoZSBqaWQgaW5kaWNhdGluZyB0aGUgdmlkZW8gZm9yIHdoaWNoIHdlJ3JlIGFkZGluZyBhIG1lbnUuXG4gICAgICogQHBhcmFtIGlzTXV0ZWQgaW5kaWNhdGVzIHRoZSBjdXJyZW50IG11dGUgc3RhdGVcbiAgICAgKi9cbiAgICBteS51cGRhdGVSZW1vdGVWaWRlb01lbnUgPSBmdW5jdGlvbihqaWQsIGlzTXV0ZWQpIHtcbiAgICAgICAgdmFyIG11dGVNZW51SXRlbVxuICAgICAgICAgICAgPSAkKCcjcmVtb3RlX3BvcHVwbWVudV8nXG4gICAgICAgICAgICAgICAgICAgICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKVxuICAgICAgICAgICAgICAgICAgICArICc+bGk+YS5tdXRlbGluaycpO1xuXG4gICAgICAgIHZhciBtdXRlZEluZGljYXRvciA9IFwiPGkgY2xhc3M9J2ljb24tbWljLWRpc2FibGVkJz48L2k+XCI7XG5cbiAgICAgICAgaWYgKG11dGVNZW51SXRlbS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHZhciBtdXRlTGluayA9IG11dGVNZW51SXRlbS5nZXQoMCk7XG5cbiAgICAgICAgICAgIGlmIChpc011dGVkID09PSAndHJ1ZScpIHtcbiAgICAgICAgICAgICAgICBtdXRlTGluay5pbm5lckhUTUwgPSBtdXRlZEluZGljYXRvciArICcgTXV0ZWQnO1xuICAgICAgICAgICAgICAgIG11dGVMaW5rLmNsYXNzTmFtZSA9ICdtdXRlbGluayBkaXNhYmxlZCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBtdXRlTGluay5pbm5lckhUTUwgPSBtdXRlZEluZGljYXRvciArICcgTXV0ZSc7XG4gICAgICAgICAgICAgICAgbXV0ZUxpbmsuY2xhc3NOYW1lID0gJ211dGVsaW5rJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBjdXJyZW50IGRvbWluYW50IHNwZWFrZXIgcmVzb3VyY2UgamlkLlxuICAgICAqL1xuICAgIG15LmdldERvbWluYW50U3BlYWtlclJlc291cmNlSmlkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gY3VycmVudERvbWluYW50U3BlYWtlcjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgY29ycmVzcG9uZGluZyByZXNvdXJjZSBqaWQgdG8gdGhlIGdpdmVuIHBlZXIgY29udGFpbmVyXG4gICAgICogRE9NIGVsZW1lbnQuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHRoZSBjb3JyZXNwb25kaW5nIHJlc291cmNlIGppZCB0byB0aGUgZ2l2ZW4gcGVlciBjb250YWluZXJcbiAgICAgKiBET00gZWxlbWVudFxuICAgICAqL1xuICAgIG15LmdldFBlZXJDb250YWluZXJSZXNvdXJjZUppZCA9IGZ1bmN0aW9uIChjb250YWluZXJFbGVtZW50KSB7XG4gICAgICAgIHZhciBpID0gY29udGFpbmVyRWxlbWVudC5pZC5pbmRleE9mKCdwYXJ0aWNpcGFudF8nKTtcblxuICAgICAgICBpZiAoaSA+PSAwKVxuICAgICAgICAgICAgcmV0dXJuIGNvbnRhaW5lckVsZW1lbnQuaWQuc3Vic3RyaW5nKGkgKyAxMik7IFxuICAgIH07XG5cbiAgICBteS5vblJlbW90ZVN0cmVhbUFkZGVkID0gZnVuY3Rpb24gKHN0cmVhbSkge1xuICAgICAgICB2YXIgY29udGFpbmVyO1xuICAgICAgICB2YXIgcmVtb3RlcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZW1vdGVWaWRlb3MnKTtcblxuICAgICAgICBpZiAoc3RyZWFtLnBlZXJqaWQpIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmVuc3VyZVBlZXJDb250YWluZXJFeGlzdHMoc3RyZWFtLnBlZXJqaWQpO1xuXG4gICAgICAgICAgICBjb250YWluZXIgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXG4gICAgICAgICAgICAgICAgICAgICdwYXJ0aWNpcGFudF8nICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoc3RyZWFtLnBlZXJqaWQpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChzdHJlYW0uc3RyZWFtLmlkICE9PSAnbWl4ZWRtc2xhYmVsJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoICAnY2FuIG5vdCBhc3NvY2lhdGUgc3RyZWFtJyxcbiAgICAgICAgICAgICAgICAgICAgc3RyZWFtLnN0cmVhbS5pZCxcbiAgICAgICAgICAgICAgICAgICAgJ3dpdGggYSBwYXJ0aWNpcGFudCcpO1xuICAgICAgICAgICAgICAgIC8vIFdlIGRvbid0IHdhbnQgdG8gYWRkIGl0IGhlcmUgc2luY2UgaXQgd2lsbCBjYXVzZSB0cm91Ymxlc1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZJWE1FOiBmb3IgdGhlIG1peGVkIG1zIHdlIGRvbnQgbmVlZCBhIHZpZGVvIC0tIGN1cnJlbnRseVxuICAgICAgICAgICAgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgY29udGFpbmVyLmlkID0gJ21peGVkc3RyZWFtJztcbiAgICAgICAgICAgIGNvbnRhaW5lci5jbGFzc05hbWUgPSAndmlkZW9jb250YWluZXInO1xuICAgICAgICAgICAgcmVtb3Rlcy5hcHBlbmRDaGlsZChjb250YWluZXIpO1xuICAgICAgICAgICAgVXRpbC5wbGF5U291bmROb3RpZmljYXRpb24oJ3VzZXJKb2luZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb250YWluZXIpIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmFkZFJlbW90ZVN0cmVhbUVsZW1lbnQoIGNvbnRhaW5lcixcbiAgICAgICAgICAgICAgICBzdHJlYW0uc2lkLFxuICAgICAgICAgICAgICAgIHN0cmVhbS5zdHJlYW0sXG4gICAgICAgICAgICAgICAgc3RyZWFtLnBlZXJqaWQsXG4gICAgICAgICAgICAgICAgc3RyZWFtLnNzcmMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWRkcyB0aGUgcmVtb3RlIHZpZGVvIG1lbnUgZWxlbWVudCBmb3IgdGhlIGdpdmVuIDx0dD5qaWQ8L3R0PiBpbiB0aGVcbiAgICAgKiBnaXZlbiA8dHQ+cGFyZW50RWxlbWVudDwvdHQ+LlxuICAgICAqXG4gICAgICogQHBhcmFtIGppZCB0aGUgamlkIGluZGljYXRpbmcgdGhlIHZpZGVvIGZvciB3aGljaCB3ZSdyZSBhZGRpbmcgYSBtZW51LlxuICAgICAqIEBwYXJhbSBwYXJlbnRFbGVtZW50IHRoZSBwYXJlbnQgZWxlbWVudCB3aGVyZSB0aGlzIG1lbnUgd2lsbCBiZSBhZGRlZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGFkZFJlbW90ZVZpZGVvTWVudShqaWQsIHBhcmVudEVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHNwYW5FbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICBzcGFuRWxlbWVudC5jbGFzc05hbWUgPSAncmVtb3RldmlkZW9tZW51JztcblxuICAgICAgICBwYXJlbnRFbGVtZW50LmFwcGVuZENoaWxkKHNwYW5FbGVtZW50KTtcblxuICAgICAgICB2YXIgbWVudUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpJyk7XG4gICAgICAgIG1lbnVFbGVtZW50LmNsYXNzTmFtZSA9ICdmYSBmYS1hbmdsZS1kb3duJztcbiAgICAgICAgbWVudUVsZW1lbnQudGl0bGUgPSAnUmVtb3RlIHVzZXIgY29udHJvbHMnO1xuICAgICAgICBzcGFuRWxlbWVudC5hcHBlbmRDaGlsZChtZW51RWxlbWVudCk7XG5cbi8vICAgICAgICA8dWwgY2xhc3M9XCJwb3B1cG1lbnVcIj5cbi8vICAgICAgICA8bGk+PGEgaHJlZj1cIiNcIj5NdXRlPC9hPjwvbGk+XG4vLyAgICAgICAgPGxpPjxhIGhyZWY9XCIjXCI+RWplY3Q8L2E+PC9saT5cbi8vICAgICAgICA8L3VsPlxuICAgICAgICB2YXIgcG9wdXBtZW51RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3VsJyk7XG4gICAgICAgIHBvcHVwbWVudUVsZW1lbnQuY2xhc3NOYW1lID0gJ3BvcHVwbWVudSc7XG4gICAgICAgIHBvcHVwbWVudUVsZW1lbnQuaWRcbiAgICAgICAgICAgID0gJ3JlbW90ZV9wb3B1cG1lbnVfJyArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGppZCk7XG4gICAgICAgIHNwYW5FbGVtZW50LmFwcGVuZENoaWxkKHBvcHVwbWVudUVsZW1lbnQpO1xuXG4gICAgICAgIHZhciBtdXRlTWVudUl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuICAgICAgICB2YXIgbXV0ZUxpbmtJdGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuXG4gICAgICAgIHZhciBtdXRlZEluZGljYXRvciA9IFwiPGkgY2xhc3M9J2ljb24tbWljLWRpc2FibGVkJz48L2k+XCI7XG5cbiAgICAgICAgaWYgKCFtdXRlZEF1ZGlvc1tqaWRdKSB7XG4gICAgICAgICAgICBtdXRlTGlua0l0ZW0uaW5uZXJIVE1MID0gbXV0ZWRJbmRpY2F0b3IgKyAnTXV0ZSc7XG4gICAgICAgICAgICBtdXRlTGlua0l0ZW0uY2xhc3NOYW1lID0gJ211dGVsaW5rJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG11dGVMaW5rSXRlbS5pbm5lckhUTUwgPSBtdXRlZEluZGljYXRvciArICcgTXV0ZWQnO1xuICAgICAgICAgICAgbXV0ZUxpbmtJdGVtLmNsYXNzTmFtZSA9ICdtdXRlbGluayBkaXNhYmxlZCc7XG4gICAgICAgIH1cblxuICAgICAgICBtdXRlTGlua0l0ZW0ub25jbGljayA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKS5hdHRyKCdkaXNhYmxlZCcpICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaXNNdXRlID0gIW11dGVkQXVkaW9zW2ppZF07XG4gICAgICAgICAgICBjb25uZWN0aW9uLm1vZGVyYXRlLnNldE11dGUoamlkLCBpc011dGUpO1xuICAgICAgICAgICAgcG9wdXBtZW51RWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ2Rpc3BsYXk6bm9uZTsnKTtcblxuICAgICAgICAgICAgaWYgKGlzTXV0ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5uZXJIVE1MID0gbXV0ZWRJbmRpY2F0b3IgKyAnIE11dGVkJztcbiAgICAgICAgICAgICAgICB0aGlzLmNsYXNzTmFtZSA9ICdtdXRlbGluayBkaXNhYmxlZCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlubmVySFRNTCA9IG11dGVkSW5kaWNhdG9yICsgJyBNdXRlJztcbiAgICAgICAgICAgICAgICB0aGlzLmNsYXNzTmFtZSA9ICdtdXRlbGluayc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgbXV0ZU1lbnVJdGVtLmFwcGVuZENoaWxkKG11dGVMaW5rSXRlbSk7XG4gICAgICAgIHBvcHVwbWVudUVsZW1lbnQuYXBwZW5kQ2hpbGQobXV0ZU1lbnVJdGVtKTtcblxuICAgICAgICB2YXIgZWplY3RJbmRpY2F0b3IgPSBcIjxpIGNsYXNzPSdmYSBmYS1lamVjdCc+PC9pPlwiO1xuXG4gICAgICAgIHZhciBlamVjdE1lbnVJdGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcbiAgICAgICAgdmFyIGVqZWN0TGlua0l0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgIGVqZWN0TGlua0l0ZW0uaW5uZXJIVE1MID0gZWplY3RJbmRpY2F0b3IgKyAnIEtpY2sgb3V0JztcbiAgICAgICAgZWplY3RMaW5rSXRlbS5vbmNsaWNrID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGNvbm5lY3Rpb24ubW9kZXJhdGUuZWplY3QoamlkKTtcbiAgICAgICAgICAgIHBvcHVwbWVudUVsZW1lbnQuc2V0QXR0cmlidXRlKCdzdHlsZScsICdkaXNwbGF5Om5vbmU7Jyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgZWplY3RNZW51SXRlbS5hcHBlbmRDaGlsZChlamVjdExpbmtJdGVtKTtcbiAgICAgICAgcG9wdXBtZW51RWxlbWVudC5hcHBlbmRDaGlsZChlamVjdE1lbnVJdGVtKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBPbiBhdWRpbyBtdXRlZCBldmVudC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdhdWRpb211dGVkLm11YycsIGZ1bmN0aW9uIChldmVudCwgamlkLCBpc011dGVkKSB7XG4gICAgICAgIHZhciB2aWRlb1NwYW5JZCA9IG51bGw7XG4gICAgICAgIGlmIChqaWQgPT09IGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQpIHtcbiAgICAgICAgICAgIHZpZGVvU3BhbklkID0gJ2xvY2FsVmlkZW9Db250YWluZXInO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuZW5zdXJlUGVlckNvbnRhaW5lckV4aXN0cyhqaWQpO1xuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAncGFydGljaXBhbnRfJyArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGppZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZm9jdXMpIHtcbiAgICAgICAgICAgIG11dGVkQXVkaW9zW2ppZF0gPSBpc011dGVkO1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQudXBkYXRlUmVtb3RlVmlkZW9NZW51KGppZCwgaXNNdXRlZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodmlkZW9TcGFuSWQpXG4gICAgICAgICAgICBWaWRlb0xheW91dC5zaG93QXVkaW9JbmRpY2F0b3IodmlkZW9TcGFuSWQsIGlzTXV0ZWQpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogT24gdmlkZW8gbXV0ZWQgZXZlbnQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgndmlkZW9tdXRlZC5tdWMnLCBmdW5jdGlvbiAoZXZlbnQsIGppZCwgaXNNdXRlZCkge1xuICAgICAgICB2YXIgdmlkZW9TcGFuSWQgPSBudWxsO1xuICAgICAgICBpZiAoamlkID09PSBjb25uZWN0aW9uLmVtdWMubXlyb29tamlkKSB7XG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdsb2NhbFZpZGVvQ29udGFpbmVyJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmVuc3VyZVBlZXJDb250YWluZXJFeGlzdHMoamlkKTtcbiAgICAgICAgICAgIHZpZGVvU3BhbklkID0gJ3BhcnRpY2lwYW50XycgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZpZGVvU3BhbklkKVxuICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd1ZpZGVvSW5kaWNhdG9yKHZpZGVvU3BhbklkLCBpc011dGVkKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIERpc3BsYXkgbmFtZSBjaGFuZ2VkLlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ2Rpc3BsYXluYW1lY2hhbmdlZCcsXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChldmVudCwgamlkLCBkaXNwbGF5TmFtZSwgc3RhdHVzKSB7XG4gICAgICAgIGlmIChqaWQgPT09ICdsb2NhbFZpZGVvQ29udGFpbmVyJ1xuICAgICAgICAgICAgfHwgamlkID09PSBjb25uZWN0aW9uLmVtdWMubXlyb29tamlkKSB7XG4gICAgICAgICAgICBzZXREaXNwbGF5TmFtZSgnbG9jYWxWaWRlb0NvbnRhaW5lcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNwbGF5TmFtZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5lbnN1cmVQZWVyQ29udGFpbmVyRXhpc3RzKGppZCk7XG5cbiAgICAgICAgICAgIHNldERpc3BsYXlOYW1lKFxuICAgICAgICAgICAgICAgICdwYXJ0aWNpcGFudF8nICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKSxcbiAgICAgICAgICAgICAgICBkaXNwbGF5TmFtZSxcbiAgICAgICAgICAgICAgICBzdGF0dXMpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBPbiBkb21pbmFudCBzcGVha2VyIGNoYW5nZWQgZXZlbnQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgnZG9taW5hbnRzcGVha2VyY2hhbmdlZCcsIGZ1bmN0aW9uIChldmVudCwgcmVzb3VyY2VKaWQpIHtcbiAgICAgICAgLy8gV2UgaWdub3JlIGxvY2FsIHVzZXIgZXZlbnRzLlxuICAgICAgICBpZiAocmVzb3VyY2VKaWRcbiAgICAgICAgICAgICAgICA9PT0gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZCkpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgLy8gVXBkYXRlIHRoZSBjdXJyZW50IGRvbWluYW50IHNwZWFrZXIuXG4gICAgICAgIGlmIChyZXNvdXJjZUppZCAhPT0gY3VycmVudERvbWluYW50U3BlYWtlcilcbiAgICAgICAgICAgIGN1cnJlbnREb21pbmFudFNwZWFrZXIgPSByZXNvdXJjZUppZDtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIC8vIE9idGFpbiBjb250YWluZXIgZm9yIG5ldyBkb21pbmFudCBzcGVha2VyLlxuICAgICAgICB2YXIgY29udGFpbmVyICA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFxuICAgICAgICAgICAgICAgICdwYXJ0aWNpcGFudF8nICsgcmVzb3VyY2VKaWQpO1xuXG4gICAgICAgIC8vIExvY2FsIHZpZGVvIHdpbGwgbm90IGhhdmUgY29udGFpbmVyIGZvdW5kLCBidXQgdGhhdCdzIG9rXG4gICAgICAgIC8vIHNpbmNlIHdlIGRvbid0IHdhbnQgdG8gc3dpdGNoIHRvIGxvY2FsIHZpZGVvLlxuICAgICAgICBpZiAoY29udGFpbmVyICYmICFWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciB2aWRlbyA9IGNvbnRhaW5lci5nZXRFbGVtZW50c0J5VGFnTmFtZShcInZpZGVvXCIpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGxhcmdlIHZpZGVvIGlmIHRoZSB2aWRlbyBzb3VyY2UgaXMgYWxyZWFkeSBhdmFpbGFibGUsXG4gICAgICAgICAgICAvLyBvdGhlcndpc2Ugd2FpdCBmb3IgdGhlIFwidmlkZW9hY3RpdmUuamluZ2xlXCIgZXZlbnQuXG4gICAgICAgICAgICBpZiAodmlkZW8ubGVuZ3RoICYmIHZpZGVvWzBdLmN1cnJlbnRUaW1lID4gMClcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC51cGRhdGVMYXJnZVZpZGVvKHZpZGVvWzBdLnNyYyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIE9uIGxhc3QgTiBjaGFuZ2UgZXZlbnQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZXZlbnQgdGhlIGV2ZW50IHRoYXQgbm90aWZpZWQgdXNcbiAgICAgKiBAcGFyYW0gbGFzdE5FbmRwb2ludHMgdGhlIGxpc3Qgb2YgbGFzdCBOIGVuZHBvaW50c1xuICAgICAqIEBwYXJhbSBlbmRwb2ludHNFbnRlcmluZ0xhc3ROIHRoZSBsaXN0IGN1cnJlbnRseSBlbnRlcmluZyBsYXN0IE5cbiAgICAgKiBlbmRwb2ludHNcbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdsYXN0bmNoYW5nZWQnLCBmdW5jdGlvbiAoIGV2ZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFzdE5FbmRwb2ludHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmRwb2ludHNFbnRlcmluZ0xhc3ROLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyZWFtKSB7XG4gICAgICAgIGlmIChsYXN0TkNvdW50ICE9PSBsYXN0TkVuZHBvaW50cy5sZW5ndGgpXG4gICAgICAgICAgICBsYXN0TkNvdW50ID0gbGFzdE5FbmRwb2ludHMubGVuZ3RoO1xuXG4gICAgICAgIGxhc3RORW5kcG9pbnRzQ2FjaGUgPSBsYXN0TkVuZHBvaW50cztcblxuICAgICAgICAkKCcjcmVtb3RlVmlkZW9zPnNwYW4nKS5lYWNoKGZ1bmN0aW9uKCBpbmRleCwgZWxlbWVudCApIHtcbiAgICAgICAgICAgIHZhciByZXNvdXJjZUppZCA9IFZpZGVvTGF5b3V0LmdldFBlZXJDb250YWluZXJSZXNvdXJjZUppZChlbGVtZW50KTtcblxuICAgICAgICAgICAgaWYgKHJlc291cmNlSmlkXG4gICAgICAgICAgICAgICAgJiYgbGFzdE5FbmRwb2ludHMubGVuZ3RoID4gMFxuICAgICAgICAgICAgICAgICYmIGxhc3RORW5kcG9pbnRzLmluZGV4T2YocmVzb3VyY2VKaWQpIDwgMCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVtb3ZlIGZyb20gbGFzdCBOXCIsIHJlc291cmNlSmlkKTtcbiAgICAgICAgICAgICAgICBzaG93UGVlckNvbnRhaW5lcihyZXNvdXJjZUppZCwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIWVuZHBvaW50c0VudGVyaW5nTGFzdE4gfHwgZW5kcG9pbnRzRW50ZXJpbmdMYXN0Ti5sZW5ndGggPCAwKVxuICAgICAgICAgICAgZW5kcG9pbnRzRW50ZXJpbmdMYXN0TiA9IGxhc3RORW5kcG9pbnRzO1xuXG4gICAgICAgIGlmIChlbmRwb2ludHNFbnRlcmluZ0xhc3ROICYmIGVuZHBvaW50c0VudGVyaW5nTGFzdE4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZW5kcG9pbnRzRW50ZXJpbmdMYXN0Ti5mb3JFYWNoKGZ1bmN0aW9uIChyZXNvdXJjZUppZCkge1xuXG4gICAgICAgICAgICAgICAgaWYgKCEkKCcjcGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkKS5pcygnOnZpc2libGUnKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkFkZCB0byBsYXN0IE5cIiwgcmVzb3VyY2VKaWQpO1xuICAgICAgICAgICAgICAgICAgICBzaG93UGVlckNvbnRhaW5lcihyZXNvdXJjZUppZCwgdHJ1ZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgZGVwLlVJQWN0aXZhdG9yKCkuZ2V0UlRDU2VydmljZSgpLnJlbW90ZVN0cmVhbXMuc29tZShmdW5jdGlvbiAobWVkaWFTdHJlYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZWRpYVN0cmVhbS5wZWVyamlkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQobWVkaWFTdHJlYW0ucGVlcmppZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPT09IHJlc291cmNlSmlkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgbWVkaWFTdHJlYW0udHlwZSA9PT0gbWVkaWFTdHJlYW0uVklERU9fVFlQRSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzZWwgPSAkKCcjcGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkICsgJz52aWRlbycpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0YWNoTWVkaWFTdHJlYW0oc2VsLCBtZWRpYVN0cmVhbS5zdHJlYW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdhaXRGb3JSZW1vdGVWaWRlbyhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lZGlhU3RyZWFtLnNzcmMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZWRpYVN0cmVhbS5zdHJlYW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gd2FpdEZvclJlbW90ZVZpZGVvKHNlbGVjdG9yLCBzc3JjLCBzdHJlYW0pIHtcbiAgICAgICAgaWYgKHNlbGVjdG9yLnJlbW92ZWQgfHwgIXNlbGVjdG9yLnBhcmVudCgpLmlzKFwiOnZpc2libGVcIikpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcIk1lZGlhIHJlbW92ZWQgYmVmb3JlIGhhZCBzdGFydGVkXCIsIHNlbGVjdG9yKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdHJlYW0uaWQgPT09ICdtaXhlZG1zbGFiZWwnKSByZXR1cm47XG5cbiAgICAgICAgaWYgKHNlbGVjdG9yWzBdLmN1cnJlbnRUaW1lID4gMCkge1xuICAgICAgICAgICBhdHRhY2hNZWRpYVN0cmVhbShzZWxlY3Rvciwgc3RyZWFtKTsgLy8gRklYTUU6IHdoeSBkbyBpIGhhdmUgdG8gZG8gdGhpcyBmb3IgRkY/XG5cbiAgICAgICAgICAgIC8vIEZJWE1FOiBhZGQgYSBjbGFzcyB0aGF0IHdpbGwgYXNzb2NpYXRlIHBlZXIgSmlkLCB2aWRlby5zcmMsIGl0J3Mgc3NyYyBhbmQgdmlkZW8gdHlwZVxuICAgICAgICAgICAgLy8gICAgICAgIGluIG9yZGVyIHRvIGdldCByaWQgb2YgdG9vIG1hbnkgbWFwc1xuICAgICAgICAgICAgaWYgKHNzcmMgJiYgc2VsZWN0b3IuYXR0cignc3JjJykpIHtcbiAgICAgICAgICAgICAgICB2aWRlb1NyY1RvU3NyY1tzZWxlY3Rvci5hdHRyKCdzcmMnKV0gPSBzc3JjO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJObyBzc3JjIGdpdmVuIGZvciB2aWRlb1wiLCBzZWxlY3Rvcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZpZGVvQWN0aXZlKFtzZWxlY3Rvcl0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgd2FpdEZvclJlbW90ZVZpZGVvKHNlbGVjdG9yLCBzc3JjLCBzdHJlYW0pO1xuICAgICAgICAgICAgfSwgMjUwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHZpZGVvQWN0aXZlKHZpZGVvZWxlbSkge1xuICAgICAgICBpZiAodmlkZW9lbGVtLmF0dHIoJ2lkJykuaW5kZXhPZignbWl4ZWRtc2xhYmVsJykgPT09IC0xKSB7XG4gICAgICAgICAgICAvLyBpZ25vcmUgbWl4ZWRtc2xhYmVsYTAgYW5kIHYwXG5cbiAgICAgICAgICAgIHZpZGVvZWxlbS5zaG93KCk7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5yZXNpemVUaHVtYm5haWxzKCk7XG5cbiAgICAgICAgICAgIHZhciB2aWRlb1BhcmVudCA9IHZpZGVvZWxlbS5wYXJlbnQoKTtcbiAgICAgICAgICAgIHZhciBwYXJlbnRSZXNvdXJjZUppZCA9IG51bGw7XG4gICAgICAgICAgICBpZiAodmlkZW9QYXJlbnQpXG4gICAgICAgICAgICAgICAgcGFyZW50UmVzb3VyY2VKaWRcbiAgICAgICAgICAgICAgICAgICAgPSBWaWRlb0xheW91dC5nZXRQZWVyQ29udGFpbmVyUmVzb3VyY2VKaWQodmlkZW9QYXJlbnRbMF0pO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGxhcmdlIHZpZGVvIHRvIHRoZSBsYXN0IGFkZGVkIHZpZGVvIG9ubHkgaWYgdGhlcmUncyBub1xuICAgICAgICAgICAgLy8gY3VycmVudCBkb21pbmFudCBvciBmb2N1c2VkIHNwZWFrZXIgb3IgdXBkYXRlIGl0IHRvIHRoZSBjdXJyZW50XG4gICAgICAgICAgICAvLyBkb21pbmFudCBzcGVha2VyLlxuICAgICAgICAgICAgaWYgKCghVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjICYmICFWaWRlb0xheW91dC5nZXREb21pbmFudFNwZWFrZXJSZXNvdXJjZUppZCgpKVxuICAgICAgICAgICAgICAgIHx8IChwYXJlbnRSZXNvdXJjZUppZFxuICAgICAgICAgICAgICAgICYmIFZpZGVvTGF5b3V0LmdldERvbWluYW50U3BlYWtlclJlc291cmNlSmlkKClcbiAgICAgICAgICAgICAgICAgICAgPT09IHBhcmVudFJlc291cmNlSmlkKSkge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8odmlkZW9lbGVtLmF0dHIoJ3NyYycpLCAxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0ZvY3VzSW5kaWNhdG9yKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy9kb2N1bWVudCBldmVudHMgc2V0dXBcbiAgICAkKGRvY3VtZW50KS5iaW5kKCdwcmVzZW5jZS5zdGF0dXMubXVjJywgZnVuY3Rpb24gKGV2ZW50LCBqaWQsIGluZm8sIHByZXMpIHtcblxuICAgICAgICBWaWRlb0xheW91dC5zZXRQcmVzZW5jZVN0YXR1cyhcbiAgICAgICAgICAgICAgICAncGFydGljaXBhbnRfJyArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGppZCksIGluZm8uc3RhdHVzKTtcblxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG15O1xufShWaWRlb0xheW91dCB8fCB7fSkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZGVvTGF5b3V0O1xuIiwidmFyIENhbnZhc1V0aWwgPSByZXF1aXJlKFwiLi9DYW52YXNVdGlsLmpzXCIpO1xuXG4vKipcbiAqIFRoZSBhdWRpbyBMZXZlbHMgcGx1Z2luLlxuICovXG52YXIgQXVkaW9MZXZlbHMgPSAoZnVuY3Rpb24obXkpIHtcbiAgICB2YXIgQ0FOVkFTX0VYVFJBID0gMTA0O1xuICAgIHZhciBDQU5WQVNfUkFESVVTID0gNztcbiAgICB2YXIgU0hBRE9XX0NPTE9SID0gJyMwMGNjZmYnO1xuICAgIHZhciBhdWRpb0xldmVsQ2FudmFzQ2FjaGUgPSB7fTtcblxuICAgIG15LkxPQ0FMX0xFVkVMID0gJ2xvY2FsJztcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIGF1ZGlvIGxldmVsIGNhbnZhcyBmb3IgdGhlIGdpdmVuIHBlZXJKaWQuIElmIHRoZSBjYW52YXNcbiAgICAgKiBkaWRuJ3QgZXhpc3Qgd2UgY3JlYXRlIGl0LlxuICAgICAqL1xuICAgIG15LnVwZGF0ZUF1ZGlvTGV2ZWxDYW52YXMgPSBmdW5jdGlvbiAocGVlckppZCkge1xuICAgICAgICB2YXIgcmVzb3VyY2VKaWQgPSBudWxsO1xuICAgICAgICB2YXIgdmlkZW9TcGFuSWQgPSBudWxsO1xuICAgICAgICBpZiAoIXBlZXJKaWQpXG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdsb2NhbFZpZGVvQ29udGFpbmVyJztcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHBlZXJKaWQpO1xuXG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdwYXJ0aWNpcGFudF8nICsgcmVzb3VyY2VKaWQ7XG4gICAgICAgIH1cblxuICAgICAgICB2aWRlb1NwYW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh2aWRlb1NwYW5JZCk7XG5cbiAgICAgICAgaWYgKCF2aWRlb1NwYW4pIHtcbiAgICAgICAgICAgIGlmIChyZXNvdXJjZUppZClcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiTm8gdmlkZW8gZWxlbWVudCBmb3IgamlkXCIsIHJlc291cmNlSmlkKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiTm8gdmlkZW8gZWxlbWVudCBmb3IgbG9jYWwgdmlkZW8uXCIpO1xuXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYXVkaW9MZXZlbENhbnZhcyA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPmNhbnZhcycpO1xuXG4gICAgICAgIHZhciB2aWRlb1NwYWNlV2lkdGggPSAkKCcjcmVtb3RlVmlkZW9zJykud2lkdGgoKTtcbiAgICAgICAgdmFyIHRodW1ibmFpbFNpemVcbiAgICAgICAgICAgID0gVmlkZW9MYXlvdXQuY2FsY3VsYXRlVGh1bWJuYWlsU2l6ZSh2aWRlb1NwYWNlV2lkdGgpO1xuICAgICAgICB2YXIgdGh1bWJuYWlsV2lkdGggPSB0aHVtYm5haWxTaXplWzBdO1xuICAgICAgICB2YXIgdGh1bWJuYWlsSGVpZ2h0ID0gdGh1bWJuYWlsU2l6ZVsxXTtcblxuICAgICAgICBpZiAoIWF1ZGlvTGV2ZWxDYW52YXMgfHwgYXVkaW9MZXZlbENhbnZhcy5sZW5ndGggPT09IDApIHtcblxuICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhcy5jbGFzc05hbWUgPSBcImF1ZGlvbGV2ZWxcIjtcbiAgICAgICAgICAgIGF1ZGlvTGV2ZWxDYW52YXMuc3R5bGUuYm90dG9tID0gXCItXCIgKyBDQU5WQVNfRVhUUkEvMiArIFwicHhcIjtcbiAgICAgICAgICAgIGF1ZGlvTGV2ZWxDYW52YXMuc3R5bGUubGVmdCA9IFwiLVwiICsgQ0FOVkFTX0VYVFJBLzIgKyBcInB4XCI7XG4gICAgICAgICAgICByZXNpemVBdWRpb0xldmVsQ2FudmFzKCBhdWRpb0xldmVsQ2FudmFzLFxuICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgdGh1bWJuYWlsSGVpZ2h0KTtcblxuICAgICAgICAgICAgdmlkZW9TcGFuLmFwcGVuZENoaWxkKGF1ZGlvTGV2ZWxDYW52YXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhcyA9IGF1ZGlvTGV2ZWxDYW52YXMuZ2V0KDApO1xuXG4gICAgICAgICAgICByZXNpemVBdWRpb0xldmVsQ2FudmFzKCBhdWRpb0xldmVsQ2FudmFzLFxuICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgdGh1bWJuYWlsSGVpZ2h0KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBhdWRpbyBsZXZlbCBVSSBmb3IgdGhlIGdpdmVuIHJlc291cmNlSmlkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHJlc291cmNlSmlkIHRoZSByZXNvdXJjZSBqaWQgaW5kaWNhdGluZyB0aGUgdmlkZW8gZWxlbWVudCBmb3JcbiAgICAgKiB3aGljaCB3ZSBkcmF3IHRoZSBhdWRpbyBsZXZlbFxuICAgICAqIEBwYXJhbSBhdWRpb0xldmVsIHRoZSBuZXdBdWRpbyBsZXZlbCB0byByZW5kZXJcbiAgICAgKi9cbiAgICBteS51cGRhdGVBdWRpb0xldmVsID0gZnVuY3Rpb24gKHJlc291cmNlSmlkLCBhdWRpb0xldmVsKSB7XG4gICAgICAgIGRyYXdBdWRpb0xldmVsQ2FudmFzKHJlc291cmNlSmlkLCBhdWRpb0xldmVsKTtcblxuICAgICAgICB2YXIgdmlkZW9TcGFuSWQgPSBnZXRWaWRlb1NwYW5JZChyZXNvdXJjZUppZCk7XG5cbiAgICAgICAgdmFyIGF1ZGlvTGV2ZWxDYW52YXMgPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5jYW52YXMnKS5nZXQoMCk7XG5cbiAgICAgICAgaWYgKCFhdWRpb0xldmVsQ2FudmFzKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHZhciBkcmF3Q29udGV4dCA9IGF1ZGlvTGV2ZWxDYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgICAgICB2YXIgY2FudmFzQ2FjaGUgPSBhdWRpb0xldmVsQ2FudmFzQ2FjaGVbcmVzb3VyY2VKaWRdO1xuXG4gICAgICAgIGRyYXdDb250ZXh0LmNsZWFyUmVjdCAoMCwgMCxcbiAgICAgICAgICAgICAgICBhdWRpb0xldmVsQ2FudmFzLndpZHRoLCBhdWRpb0xldmVsQ2FudmFzLmhlaWdodCk7XG4gICAgICAgIGRyYXdDb250ZXh0LmRyYXdJbWFnZShjYW52YXNDYWNoZSwgMCwgMCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlc2l6ZXMgdGhlIGdpdmVuIGF1ZGlvIGxldmVsIGNhbnZhcyB0byBtYXRjaCB0aGUgZ2l2ZW4gdGh1bWJuYWlsIHNpemUuXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVzaXplQXVkaW9MZXZlbENhbnZhcyhhdWRpb0xldmVsQ2FudmFzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGh1bWJuYWlsV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxIZWlnaHQpIHtcbiAgICAgICAgYXVkaW9MZXZlbENhbnZhcy53aWR0aCA9IHRodW1ibmFpbFdpZHRoICsgQ0FOVkFTX0VYVFJBO1xuICAgICAgICBhdWRpb0xldmVsQ2FudmFzLmhlaWdodCA9IHRodW1ibmFpbEhlaWdodCArIENBTlZBU19FWFRSQTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRHJhd3MgdGhlIGF1ZGlvIGxldmVsIGNhbnZhcyBpbnRvIHRoZSBjYWNoZWQgY2FudmFzIG9iamVjdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSByZXNvdXJjZUppZCB0aGUgcmVzb3VyY2UgamlkIGluZGljYXRpbmcgdGhlIHZpZGVvIGVsZW1lbnQgZm9yXG4gICAgICogd2hpY2ggd2UgZHJhdyB0aGUgYXVkaW8gbGV2ZWxcbiAgICAgKiBAcGFyYW0gYXVkaW9MZXZlbCB0aGUgbmV3QXVkaW8gbGV2ZWwgdG8gcmVuZGVyXG4gICAgICovXG4gICAgZnVuY3Rpb24gZHJhd0F1ZGlvTGV2ZWxDYW52YXMocmVzb3VyY2VKaWQsIGF1ZGlvTGV2ZWwpIHtcbiAgICAgICAgaWYgKCFhdWRpb0xldmVsQ2FudmFzQ2FjaGVbcmVzb3VyY2VKaWRdKSB7XG5cbiAgICAgICAgICAgIHZhciB2aWRlb1NwYW5JZCA9IGdldFZpZGVvU3BhbklkKHJlc291cmNlSmlkKTtcblxuICAgICAgICAgICAgdmFyIGF1ZGlvTGV2ZWxDYW52YXNPcmlnID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+Y2FudmFzJykuZ2V0KDApO1xuXG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgICogRklYTUUgVGVzdGluZyBoYXMgc2hvd24gdGhhdCBhdWRpb0xldmVsQ2FudmFzT3JpZyBtYXkgbm90IGV4aXN0LlxuICAgICAgICAgICAgICogSW4gc3VjaCBhIGNhc2UsIHRoZSBtZXRob2QgQ2FudmFzVXRpbC5jbG9uZUNhbnZhcyBtYXkgdGhyb3cgYW5cbiAgICAgICAgICAgICAqIGVycm9yLiBTaW5jZSBhdWRpbyBsZXZlbHMgYXJlIGZyZXF1ZW50bHkgdXBkYXRlZCwgdGhlIGVycm9ycyBoYXZlXG4gICAgICAgICAgICAgKiBiZWVuIG9ic2VydmVkIHRvIHBpbGUgaW50byB0aGUgY29uc29sZSwgc3RyYWluIHRoZSBDUFUuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlmIChhdWRpb0xldmVsQ2FudmFzT3JpZylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBhdWRpb0xldmVsQ2FudmFzQ2FjaGVbcmVzb3VyY2VKaWRdXG4gICAgICAgICAgICAgICAgICAgID0gQ2FudmFzVXRpbC5jbG9uZUNhbnZhcyhhdWRpb0xldmVsQ2FudmFzT3JpZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY2FudmFzID0gYXVkaW9MZXZlbENhbnZhc0NhY2hlW3Jlc291cmNlSmlkXTtcblxuICAgICAgICBpZiAoIWNhbnZhcylcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICB2YXIgZHJhd0NvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgICAgICBkcmF3Q29udGV4dC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcblxuICAgICAgICB2YXIgc2hhZG93TGV2ZWwgPSBnZXRTaGFkb3dMZXZlbChhdWRpb0xldmVsKTtcblxuICAgICAgICBpZiAoc2hhZG93TGV2ZWwgPiAwKVxuICAgICAgICAgICAgLy8gZHJhd0NvbnRleHQsIHgsIHksIHcsIGgsIHIsIHNoYWRvd0NvbG9yLCBzaGFkb3dMZXZlbFxuICAgICAgICAgICAgQ2FudmFzVXRpbC5kcmF3Um91bmRSZWN0R2xvdyggICBkcmF3Q29udGV4dCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQ0FOVkFTX0VYVFJBLzIsIENBTlZBU19FWFRSQS8yLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYW52YXMud2lkdGggLSBDQU5WQVNfRVhUUkEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbnZhcy5oZWlnaHQgLSBDQU5WQVNfRVhUUkEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENBTlZBU19SQURJVVMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNIQURPV19DT0xPUixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2hhZG93TGV2ZWwpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBzaGFkb3cvZ2xvdyBsZXZlbCBmb3IgdGhlIGdpdmVuIGF1ZGlvIGxldmVsLlxuICAgICAqXG4gICAgICogQHBhcmFtIGF1ZGlvTGV2ZWwgdGhlIGF1ZGlvIGxldmVsIGZyb20gd2hpY2ggd2UgZGV0ZXJtaW5lIHRoZSBzaGFkb3dcbiAgICAgKiBsZXZlbFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFNoYWRvd0xldmVsIChhdWRpb0xldmVsKSB7XG4gICAgICAgIHZhciBzaGFkb3dMZXZlbCA9IDA7XG5cbiAgICAgICAgaWYgKGF1ZGlvTGV2ZWwgPD0gMC4zKSB7XG4gICAgICAgICAgICBzaGFkb3dMZXZlbCA9IE1hdGgucm91bmQoQ0FOVkFTX0VYVFJBLzIqKGF1ZGlvTGV2ZWwvMC4zKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoYXVkaW9MZXZlbCA8PSAwLjYpIHtcbiAgICAgICAgICAgIHNoYWRvd0xldmVsID0gTWF0aC5yb3VuZChDQU5WQVNfRVhUUkEvMiooKGF1ZGlvTGV2ZWwgLSAwLjMpIC8gMC4zKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzaGFkb3dMZXZlbCA9IE1hdGgucm91bmQoQ0FOVkFTX0VYVFJBLzIqKChhdWRpb0xldmVsIC0gMC42KSAvIDAuNCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzaGFkb3dMZXZlbDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgdmlkZW8gc3BhbiBpZCBjb3JyZXNwb25kaW5nIHRvIHRoZSBnaXZlbiByZXNvdXJjZUppZCBvciBsb2NhbFxuICAgICAqIHVzZXIuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0VmlkZW9TcGFuSWQocmVzb3VyY2VKaWQpIHtcbiAgICAgICAgdmFyIHZpZGVvU3BhbklkID0gbnVsbDtcbiAgICAgICAgaWYgKHJlc291cmNlSmlkID09PSBTdGF0aXN0aWNzQWN0aXZhdG9yLkxPQ0FMX0pJRClcbiAgICAgICAgICAgIHZpZGVvU3BhbklkID0gJ2xvY2FsVmlkZW9Db250YWluZXInO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdwYXJ0aWNpcGFudF8nICsgcmVzb3VyY2VKaWQ7XG5cbiAgICAgICAgcmV0dXJuIHZpZGVvU3BhbklkO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBJbmRpY2F0ZXMgdGhhdCB0aGUgcmVtb3RlIHZpZGVvIGhhcyBiZWVuIHJlc2l6ZWQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgncmVtb3RldmlkZW8ucmVzaXplZCcsIGZ1bmN0aW9uIChldmVudCwgd2lkdGgsIGhlaWdodCkge1xuICAgICAgICB2YXIgcmVzaXplZCA9IGZhbHNlO1xuICAgICAgICAkKCcjcmVtb3RlVmlkZW9zPnNwYW4+Y2FudmFzJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBjYW52YXMgPSAkKHRoaXMpLmdldCgwKTtcbiAgICAgICAgICAgIGlmIChjYW52YXMud2lkdGggIT09IHdpZHRoICsgQ0FOVkFTX0VYVFJBKSB7XG4gICAgICAgICAgICAgICAgY2FudmFzLndpZHRoID0gd2lkdGggKyBDQU5WQVNfRVhUUkE7XG4gICAgICAgICAgICAgICAgcmVzaXplZCA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjYW52YXMuaGVpZ2ggIT09IGhlaWdodCArIENBTlZBU19FWFRSQSkge1xuICAgICAgICAgICAgICAgIGNhbnZhcy5oZWlnaHQgPSBoZWlnaHQgKyBDQU5WQVNfRVhUUkE7XG4gICAgICAgICAgICAgICAgcmVzaXplZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChyZXNpemVkKVxuICAgICAgICAgICAgT2JqZWN0LmtleXMoYXVkaW9MZXZlbENhbnZhc0NhY2hlKS5mb3JFYWNoKGZ1bmN0aW9uIChyZXNvdXJjZUppZCkge1xuICAgICAgICAgICAgICAgIGF1ZGlvTGV2ZWxDYW52YXNDYWNoZVtyZXNvdXJjZUppZF0ud2lkdGhcbiAgICAgICAgICAgICAgICAgICAgPSB3aWR0aCArIENBTlZBU19FWFRSQTtcbiAgICAgICAgICAgICAgICBhdWRpb0xldmVsQ2FudmFzQ2FjaGVbcmVzb3VyY2VKaWRdLmhlaWdodFxuICAgICAgICAgICAgICAgICAgICA9IGhlaWdodCArIENBTlZBU19FWFRSQTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG15O1xuXG59KShBdWRpb0xldmVscyB8fCB7fSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQXVkaW9MZXZlbHM7XG4iLCIvKipcbiAqIFV0aWxpdHkgY2xhc3MgZm9yIGRyYXdpbmcgY2FudmFzIHNoYXBlcy5cbiAqL1xudmFyIENhbnZhc1V0aWwgPSAoZnVuY3Rpb24obXkpIHtcblxuICAgIC8qKlxuICAgICAqIERyYXdzIGEgcm91bmQgcmVjdGFuZ2xlIHdpdGggYSBnbG93LiBUaGUgZ2xvd1dpZHRoIGluZGljYXRlcyB0aGUgZGVwdGhcbiAgICAgKiBvZiB0aGUgZ2xvdy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBkcmF3Q29udGV4dCB0aGUgY29udGV4dCBvZiB0aGUgY2FudmFzIHRvIGRyYXcgdG9cbiAgICAgKiBAcGFyYW0geCB0aGUgeCBjb29yZGluYXRlIG9mIHRoZSByb3VuZCByZWN0YW5nbGVcbiAgICAgKiBAcGFyYW0geSB0aGUgeSBjb29yZGluYXRlIG9mIHRoZSByb3VuZCByZWN0YW5nbGVcbiAgICAgKiBAcGFyYW0gdyB0aGUgd2lkdGggb2YgdGhlIHJvdW5kIHJlY3RhbmdsZVxuICAgICAqIEBwYXJhbSBoIHRoZSBoZWlnaHQgb2YgdGhlIHJvdW5kIHJlY3RhbmdsZVxuICAgICAqIEBwYXJhbSBnbG93Q29sb3IgdGhlIGNvbG9yIG9mIHRoZSBnbG93XG4gICAgICogQHBhcmFtIGdsb3dXaWR0aCB0aGUgd2lkdGggb2YgdGhlIGdsb3dcbiAgICAgKi9cbiAgICBteS5kcmF3Um91bmRSZWN0R2xvd1xuICAgICAgICA9IGZ1bmN0aW9uKGRyYXdDb250ZXh0LCB4LCB5LCB3LCBoLCByLCBnbG93Q29sb3IsIGdsb3dXaWR0aCkge1xuXG4gICAgICAgIC8vIFNhdmUgdGhlIHByZXZpb3VzIHN0YXRlIG9mIHRoZSBjb250ZXh0LlxuICAgICAgICBkcmF3Q29udGV4dC5zYXZlKCk7XG5cbiAgICAgICAgaWYgKHcgPCAyICogcikgciA9IHcgLyAyO1xuICAgICAgICBpZiAoaCA8IDIgKiByKSByID0gaCAvIDI7XG5cbiAgICAgICAgLy8gRHJhdyBhIHJvdW5kIHJlY3RhbmdsZS5cbiAgICAgICAgZHJhd0NvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgIGRyYXdDb250ZXh0Lm1vdmVUbyh4K3IsIHkpO1xuICAgICAgICBkcmF3Q29udGV4dC5hcmNUbyh4K3csIHksICAgeCt3LCB5K2gsIHIpO1xuICAgICAgICBkcmF3Q29udGV4dC5hcmNUbyh4K3csIHkraCwgeCwgICB5K2gsIHIpO1xuICAgICAgICBkcmF3Q29udGV4dC5hcmNUbyh4LCAgIHkraCwgeCwgICB5LCAgIHIpO1xuICAgICAgICBkcmF3Q29udGV4dC5hcmNUbyh4LCAgIHksICAgeCt3LCB5LCAgIHIpO1xuICAgICAgICBkcmF3Q29udGV4dC5jbG9zZVBhdGgoKTtcblxuICAgICAgICAvLyBBZGQgYSBzaGFkb3cgYXJvdW5kIHRoZSByZWN0YW5nbGVcbiAgICAgICAgZHJhd0NvbnRleHQuc2hhZG93Q29sb3IgPSBnbG93Q29sb3I7XG4gICAgICAgIGRyYXdDb250ZXh0LnNoYWRvd0JsdXIgPSBnbG93V2lkdGg7XG4gICAgICAgIGRyYXdDb250ZXh0LnNoYWRvd09mZnNldFggPSAwO1xuICAgICAgICBkcmF3Q29udGV4dC5zaGFkb3dPZmZzZXRZID0gMDtcblxuICAgICAgICAvLyBGaWxsIHRoZSBzaGFwZS5cbiAgICAgICAgZHJhd0NvbnRleHQuZmlsbCgpO1xuXG4gICAgICAgIGRyYXdDb250ZXh0LnNhdmUoKTtcblxuICAgICAgICBkcmF3Q29udGV4dC5yZXN0b3JlKCk7XG5cbi8vICAgICAgMSkgVW5jb21tZW50IHRoaXMgbGluZSB0byB1c2UgQ29tcG9zaXRlIE9wZXJhdGlvbiwgd2hpY2ggaXMgZG9pbmcgdGhlXG4vLyAgICAgIHNhbWUgYXMgdGhlIGNsaXAgZnVuY3Rpb24gYmVsb3cgYW5kIGlzIGFsc28gYW50aWFsaWFzaW5nIHRoZSByb3VuZFxuLy8gICAgICBib3JkZXIsIGJ1dCBpcyBzYWlkIHRvIGJlIGxlc3MgZmFzdCBwZXJmb3JtYW5jZSB3aXNlLlxuXG4vLyAgICAgIGRyYXdDb250ZXh0Lmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbj0nZGVzdGluYXRpb24tb3V0JztcblxuICAgICAgICBkcmF3Q29udGV4dC5iZWdpblBhdGgoKTtcbiAgICAgICAgZHJhd0NvbnRleHQubW92ZVRvKHgrciwgeSk7XG4gICAgICAgIGRyYXdDb250ZXh0LmFyY1RvKHgrdywgeSwgICB4K3csIHkraCwgcik7XG4gICAgICAgIGRyYXdDb250ZXh0LmFyY1RvKHgrdywgeStoLCB4LCAgIHkraCwgcik7XG4gICAgICAgIGRyYXdDb250ZXh0LmFyY1RvKHgsICAgeStoLCB4LCAgIHksICAgcik7XG4gICAgICAgIGRyYXdDb250ZXh0LmFyY1RvKHgsICAgeSwgICB4K3csIHksICAgcik7XG4gICAgICAgIGRyYXdDb250ZXh0LmNsb3NlUGF0aCgpO1xuXG4vLyAgICAgIDIpIFVuY29tbWVudCB0aGlzIGxpbmUgdG8gdXNlIENvbXBvc2l0ZSBPcGVyYXRpb24sIHdoaWNoIGlzIGRvaW5nIHRoZVxuLy8gICAgICBzYW1lIGFzIHRoZSBjbGlwIGZ1bmN0aW9uIGJlbG93IGFuZCBpcyBhbHNvIGFudGlhbGlhc2luZyB0aGUgcm91bmRcbi8vICAgICAgYm9yZGVyLCBidXQgaXMgc2FpZCB0byBiZSBsZXNzIGZhc3QgcGVyZm9ybWFuY2Ugd2lzZS5cblxuLy8gICAgICBkcmF3Q29udGV4dC5maWxsKCk7XG5cbiAgICAgICAgLy8gQ29tbWVudCB0aGVzZSB0d28gbGluZXMgaWYgY2hvb3NpbmcgdG8gZG8gdGhlIHNhbWUgd2l0aCBjb21wb3NpdGVcbiAgICAgICAgLy8gb3BlcmF0aW9uIGFib3ZlIDEgYW5kIDIuXG4gICAgICAgIGRyYXdDb250ZXh0LmNsaXAoKTtcbiAgICAgICAgZHJhd0NvbnRleHQuY2xlYXJSZWN0KDAsIDAsIDI3NywgMjAwKTtcblxuICAgICAgICAvLyBSZXN0b3JlIHRoZSBwcmV2aW91cyBjb250ZXh0IHN0YXRlLlxuICAgICAgICBkcmF3Q29udGV4dC5yZXN0b3JlKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENsb25lcyB0aGUgZ2l2ZW4gY2FudmFzLlxuICAgICAqXG4gICAgICogQHJldHVybiB0aGUgbmV3IGNsb25lZCBjYW52YXMuXG4gICAgICovXG4gICAgbXkuY2xvbmVDYW52YXMgPSBmdW5jdGlvbiAob2xkQ2FudmFzKSB7XG4gICAgICAgIC8qXG4gICAgICAgICAqIEZJWE1FIFRlc3RpbmcgaGFzIHNob3duIHRoYXQgb2xkQ2FudmFzIG1heSBub3QgZXhpc3QuIEluIHN1Y2ggYSBjYXNlLFxuICAgICAgICAgKiB0aGUgbWV0aG9kIENhbnZhc1V0aWwuY2xvbmVDYW52YXMgbWF5IHRocm93IGFuIGVycm9yLiBTaW5jZSBhdWRpb1xuICAgICAgICAgKiBsZXZlbHMgYXJlIGZyZXF1ZW50bHkgdXBkYXRlZCwgdGhlIGVycm9ycyBoYXZlIGJlZW4gb2JzZXJ2ZWQgdG8gcGlsZVxuICAgICAgICAgKiBpbnRvIHRoZSBjb25zb2xlLCBzdHJhaW4gdGhlIENQVS5cbiAgICAgICAgICovXG4gICAgICAgIGlmICghb2xkQ2FudmFzKVxuICAgICAgICAgICAgcmV0dXJuIG9sZENhbnZhcztcblxuICAgICAgICAvL2NyZWF0ZSBhIG5ldyBjYW52YXNcbiAgICAgICAgdmFyIG5ld0NhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgICAgICB2YXIgY29udGV4dCA9IG5ld0NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgICAgIC8vc2V0IGRpbWVuc2lvbnNcbiAgICAgICAgbmV3Q2FudmFzLndpZHRoID0gb2xkQ2FudmFzLndpZHRoO1xuICAgICAgICBuZXdDYW52YXMuaGVpZ2h0ID0gb2xkQ2FudmFzLmhlaWdodDtcblxuICAgICAgICAvL2FwcGx5IHRoZSBvbGQgY2FudmFzIHRvIHRoZSBuZXcgb25lXG4gICAgICAgIGNvbnRleHQuZHJhd0ltYWdlKG9sZENhbnZhcywgMCwgMCk7XG5cbiAgICAgICAgLy9yZXR1cm4gdGhlIG5ldyBjYW52YXNcbiAgICAgICAgcmV0dXJuIG5ld0NhbnZhcztcbiAgICB9O1xuXG4gICAgcmV0dXJuIG15O1xufSkoQ2FudmFzVXRpbCB8fCB7fSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FudmFzVXRpbDtcbiIsIi8qIGdsb2JhbCAkLCBVdGlsLCBjb25uZWN0aW9uLCBuaWNrbmFtZTp0cnVlLCBnZXRWaWRlb1NpemUsIGdldFZpZGVvUG9zaXRpb24sIHNob3dUb29sYmFyLCBwcm9jZXNzUmVwbGFjZW1lbnRzICovXG5cbnZhciBSZXBsYWNlbWVudCA9IHJlcXVpcmUoXCIuL1JlcGxhY2VtZW50LmpzXCIpO1xuLyoqXG4gKiBDaGF0IHJlbGF0ZWQgdXNlciBpbnRlcmZhY2UuXG4gKi9cbnZhciBDaGF0ID0gKGZ1bmN0aW9uIChteSkge1xuICAgIHZhciBub3RpZmljYXRpb25JbnRlcnZhbCA9IGZhbHNlO1xuICAgIHZhciB1bnJlYWRNZXNzYWdlcyA9IDA7XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyBjaGF0IHJlbGF0ZWQgaW50ZXJmYWNlLlxuICAgICAqL1xuICAgIG15LmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzdG9yZWREaXNwbGF5TmFtZSA9IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZGlzcGxheW5hbWU7XG4gICAgICAgIGlmIChzdG9yZWREaXNwbGF5TmFtZSkge1xuICAgICAgICAgICAgbmlja25hbWUgPSBzdG9yZWREaXNwbGF5TmFtZTtcblxuICAgICAgICAgICAgQ2hhdC5zZXRDaGF0Q29udmVyc2F0aW9uTW9kZSh0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgICQoJyNuaWNraW5wdXQnKS5rZXlkb3duKGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzKSB7XG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICB2YXIgdmFsID0gVXRpbC5lc2NhcGVIdG1sKHRoaXMudmFsdWUpO1xuICAgICAgICAgICAgICAgIHRoaXMudmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgICBpZiAoIW5pY2tuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIG5pY2tuYW1lID0gdmFsO1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLmRpc3BsYXluYW1lID0gbmlja25hbWU7XG4gICAgICAgICAgICAgICAgICAgIC8vdGhpcyBzaG91bGQgYmUgY2hhbmdlZFxuICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuYWRkRGlzcGxheU5hbWVUb1ByZXNlbmNlKG5pY2tuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgY29ubmVjdGlvbi5lbXVjLnNlbmRQcmVzZW5jZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIENoYXQuc2V0Q2hhdENvbnZlcnNhdGlvbk1vZGUodHJ1ZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgnI3VzZXJtc2cnKS5rZXlkb3duKGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzKSB7XG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLnZhbHVlO1xuICAgICAgICAgICAgICAgICQoJyN1c2VybXNnJykudmFsKCcnKS50cmlnZ2VyKCdhdXRvc2l6ZS5yZXNpemUnKTtcbiAgICAgICAgICAgICAgICB0aGlzLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgdmFyIGNvbW1hbmQgPSBuZXcgQ29tbWFuZHNQcm9jZXNzb3IodmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmKGNvbW1hbmQuaXNDb21tYW5kKCkpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBjb21tYW5kLnByb2Nlc3NDb21tYW5kKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIC8vdGhpcyBzaG91bGQgYmUgY2hhbmdlZFxuICAgICAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZSA9IFV0aWwuZXNjYXBlSHRtbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Yy5zZW5kTWVzc2FnZShtZXNzYWdlLCBuaWNrbmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgb25UZXh0QXJlYVJlc2l6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJlc2l6ZUNoYXRDb252ZXJzYXRpb24oKTtcbiAgICAgICAgICAgIHNjcm9sbENoYXRUb0JvdHRvbSgpO1xuICAgICAgICB9O1xuICAgICAgICAkKCcjdXNlcm1zZycpLmF1dG9zaXplKHtjYWxsYmFjazogb25UZXh0QXJlYVJlc2l6ZX0pO1xuXG4gICAgICAgICQoXCIjY2hhdHNwYWNlXCIpLmJpbmQoXCJzaG93blwiLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHVucmVhZE1lc3NhZ2VzID0gMDtcbiAgICAgICAgICAgICAgICBzZXRWaXN1YWxOb3RpZmljYXRpb24oZmFsc2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFwcGVuZHMgdGhlIGdpdmVuIG1lc3NhZ2UgdG8gdGhlIGNoYXQgY29udmVyc2F0aW9uLlxuICAgICAqL1xuICAgIG15LnVwZGF0ZUNoYXRDb252ZXJzYXRpb24gPSBmdW5jdGlvbiAoZnJvbSwgZGlzcGxheU5hbWUsIG1lc3NhZ2UpIHtcbiAgICAgICAgdmFyIGRpdkNsYXNzTmFtZSA9ICcnO1xuXG4gICAgICAgIGlmIChjb25uZWN0aW9uLmVtdWMubXlyb29tamlkID09PSBmcm9tKSB7XG4gICAgICAgICAgICBkaXZDbGFzc05hbWUgPSBcImxvY2FsdXNlclwiO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZGl2Q2xhc3NOYW1lID0gXCJyZW1vdGV1c2VyXCI7XG5cbiAgICAgICAgICAgIGlmICghQ2hhdC5pc1Zpc2libGUoKSkge1xuICAgICAgICAgICAgICAgIHVucmVhZE1lc3NhZ2VzKys7XG4gICAgICAgICAgICAgICAgVXRpbC5wbGF5U291bmROb3RpZmljYXRpb24oJ2NoYXROb3RpZmljYXRpb24nKTtcbiAgICAgICAgICAgICAgICBzZXRWaXN1YWxOb3RpZmljYXRpb24odHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvL3JlcGxhY2UgbGlua3MgYW5kIHNtaWxleXNcbiAgICAgICAgdmFyIGVzY01lc3NhZ2UgPSBVdGlsLmVzY2FwZUh0bWwobWVzc2FnZSk7XG4gICAgICAgIHZhciBlc2NEaXNwbGF5TmFtZSA9IFV0aWwuZXNjYXBlSHRtbChkaXNwbGF5TmFtZSk7XG4gICAgICAgIG1lc3NhZ2UgPSBSZXBsYWNlbWVudC5wcm9jZXNzUmVwbGFjZW1lbnRzKGVzY01lc3NhZ2UpO1xuXG4gICAgICAgICQoJyNjaGF0Y29udmVyc2F0aW9uJykuYXBwZW5kKCc8ZGl2IGNsYXNzPVwiJyArIGRpdkNsYXNzTmFtZSArICdcIj48Yj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXNjRGlzcGxheU5hbWUgKyAnOiA8L2I+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgKyAnPC9kaXY+Jyk7XG4gICAgICAgICQoJyNjaGF0Y29udmVyc2F0aW9uJykuYW5pbWF0ZShcbiAgICAgICAgICAgICAgICB7IHNjcm9sbFRvcDogJCgnI2NoYXRjb252ZXJzYXRpb24nKVswXS5zY3JvbGxIZWlnaHR9LCAxMDAwKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQXBwZW5kcyBlcnJvciBtZXNzYWdlIHRvIHRoZSBjb252ZXJzYXRpb25cbiAgICAgKiBAcGFyYW0gZXJyb3JNZXNzYWdlIHRoZSByZWNlaXZlZCBlcnJvciBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSBvcmlnaW5hbFRleHQgdGhlIG9yaWdpbmFsIG1lc3NhZ2UuXG4gICAgICovXG4gICAgbXkuY2hhdEFkZEVycm9yID0gZnVuY3Rpb24oZXJyb3JNZXNzYWdlLCBvcmlnaW5hbFRleHQpXG4gICAge1xuICAgICAgICBlcnJvck1lc3NhZ2UgPSBVdGlsLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgb3JpZ2luYWxUZXh0ID0gVXRpbC5lc2NhcGVIdG1sKG9yaWdpbmFsVGV4dCk7XG5cbiAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKS5hcHBlbmQoJzxkaXYgY2xhc3M9XCJlcnJvck1lc3NhZ2VcIj48Yj5FcnJvcjogPC9iPidcbiAgICAgICAgICAgICsgJ1lvdXIgbWVzc2FnZScgKyAob3JpZ2luYWxUZXh0PyAoJyBcXFwiJysgb3JpZ2luYWxUZXh0ICsgJ1xcXCInKSA6IFwiXCIpXG4gICAgICAgICAgICArICcgd2FzIG5vdCBzZW50LicgKyAoZXJyb3JNZXNzYWdlPyAoJyBSZWFzb246ICcgKyBlcnJvck1lc3NhZ2UpIDogJycpXG4gICAgICAgICAgICArICAnPC9kaXY+Jyk7XG4gICAgICAgICQoJyNjaGF0Y29udmVyc2F0aW9uJykuYW5pbWF0ZShcbiAgICAgICAgICAgIHsgc2Nyb2xsVG9wOiAkKCcjY2hhdGNvbnZlcnNhdGlvbicpWzBdLnNjcm9sbEhlaWdodH0sIDEwMDApO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBzdWJqZWN0IHRvIHRoZSBVSVxuICAgICAqIEBwYXJhbSBzdWJqZWN0IHRoZSBzdWJqZWN0XG4gICAgICovXG4gICAgbXkuY2hhdFNldFN1YmplY3QgPSBmdW5jdGlvbihzdWJqZWN0KVxuICAgIHtcbiAgICAgICAgaWYoc3ViamVjdClcbiAgICAgICAgICAgIHN1YmplY3QgPSBzdWJqZWN0LnRyaW0oKTtcbiAgICAgICAgJCgnI3N1YmplY3QnKS5odG1sKFJlcGxhY2VtZW50LmxpbmtpZnkoVXRpbC5lc2NhcGVIdG1sKHN1YmplY3QpKSk7XG4gICAgICAgIGlmKHN1YmplY3QgPT0gXCJcIilcbiAgICAgICAge1xuICAgICAgICAgICAgJChcIiNzdWJqZWN0XCIpLmNzcyh7ZGlzcGxheTogXCJub25lXCJ9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgIHtcbiAgICAgICAgICAgICQoXCIjc3ViamVjdFwiKS5jc3Moe2Rpc3BsYXk6IFwiYmxvY2tcIn0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIE9wZW5zIC8gY2xvc2VzIHRoZSBjaGF0IGFyZWEuXG4gICAgICovXG4gICAgbXkudG9nZ2xlQ2hhdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNoYXRzcGFjZSA9ICQoJyNjaGF0c3BhY2UnKTtcbiAgICAgICAgdmFyIHZpZGVvc3BhY2UgPSAkKCcjdmlkZW9zcGFjZScpO1xuXG4gICAgICAgIHZhciBjaGF0U2l6ZSA9IChjaGF0c3BhY2UuaXMoXCI6dmlzaWJsZVwiKSkgPyBbMCwgMF0gOiBDaGF0LmdldENoYXRTaXplKCk7XG4gICAgICAgIHZhciB2aWRlb3NwYWNlV2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aCAtIGNoYXRTaXplWzBdO1xuICAgICAgICB2YXIgdmlkZW9zcGFjZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgdmFyIHZpZGVvU2l6ZVxuICAgICAgICAgICAgPSBnZXRWaWRlb1NpemUobnVsbCwgbnVsbCwgdmlkZW9zcGFjZVdpZHRoLCB2aWRlb3NwYWNlSGVpZ2h0KTtcbiAgICAgICAgdmFyIHZpZGVvV2lkdGggPSB2aWRlb1NpemVbMF07XG4gICAgICAgIHZhciB2aWRlb0hlaWdodCA9IHZpZGVvU2l6ZVsxXTtcbiAgICAgICAgdmFyIHZpZGVvUG9zaXRpb24gPSBnZXRWaWRlb1Bvc2l0aW9uKHZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvc3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvc3BhY2VIZWlnaHQpO1xuICAgICAgICB2YXIgaG9yaXpvbnRhbEluZGVudCA9IHZpZGVvUG9zaXRpb25bMF07XG4gICAgICAgIHZhciB2ZXJ0aWNhbEluZGVudCA9IHZpZGVvUG9zaXRpb25bMV07XG5cbiAgICAgICAgdmFyIHRodW1ibmFpbFNpemUgPSBWaWRlb0xheW91dC5jYWxjdWxhdGVUaHVtYm5haWxTaXplKHZpZGVvc3BhY2VXaWR0aCk7XG4gICAgICAgIHZhciB0aHVtYm5haWxzV2lkdGggPSB0aHVtYm5haWxTaXplWzBdO1xuICAgICAgICB2YXIgdGh1bWJuYWlsc0hlaWdodCA9IHRodW1ibmFpbFNpemVbMV07XG5cbiAgICAgICAgaWYgKGNoYXRzcGFjZS5pcyhcIjp2aXNpYmxlXCIpKSB7XG4gICAgICAgICAgICB2aWRlb3NwYWNlLmFuaW1hdGUoe3JpZ2h0OiBjaGF0U2l6ZVswXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHZpZGVvc3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB2aWRlb3NwYWNlSGVpZ2h0fSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3F1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMH0pO1xuXG4gICAgICAgICAgICAkKCcjcmVtb3RlVmlkZW9zJykuYW5pbWF0ZSh7aGVpZ2h0OiB0aHVtYm5haWxzSGVpZ2h0fSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDB9KTtcblxuICAgICAgICAgICAgJCgnI3JlbW90ZVZpZGVvcz5zcGFuJykuYW5pbWF0ZSh7aGVpZ2h0OiB0aHVtYm5haWxzSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogdGh1bWJuYWlsc1dpZHRofSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3F1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJyZW1vdGV2aWRlby5yZXNpemVkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt0aHVtYm5haWxzV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxzSGVpZ2h0XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH19KTtcblxuICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW9Db250YWluZXInKS5hbmltYXRlKHsgd2lkdGg6IHZpZGVvc3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogdmlkZW9zcGFjZUhlaWdodH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlbycpLmFuaW1hdGUoeyAgd2lkdGg6IHZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB2aWRlb0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b3A6IHZlcnRpY2FsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvdHRvbTogdmVydGljYWxJbmRlbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDogaG9yaXpvbnRhbEluZGVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByaWdodDogaG9yaXpvbnRhbEluZGVudH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyAgIHF1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAkKCcjY2hhdHNwYWNlJykuaGlkZShcInNsaWRlXCIsIHsgZGlyZWN0aW9uOiBcInJpZ2h0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gVW5kb2NrIHRoZSB0b29sYmFyIHdoZW4gdGhlIGNoYXQgaXMgc2hvd24gYW5kIGlmIHdlJ3JlIGluIGFcbiAgICAgICAgICAgIC8vIHZpZGVvIG1vZGUuXG4gICAgICAgICAgICBpZiAoVmlkZW9MYXlvdXQuaXNMYXJnZVZpZGVvVmlzaWJsZSgpKVxuICAgICAgICAgICAgICAgIFRvb2xiYXIuZG9ja1Rvb2xiYXIoZmFsc2UpO1xuXG4gICAgICAgICAgICB2aWRlb3NwYWNlLmFuaW1hdGUoe3JpZ2h0OiBjaGF0U2l6ZVswXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHZpZGVvc3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB2aWRlb3NwYWNlSGVpZ2h0fSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ2hhdFRvQm90dG9tKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGF0c3BhY2UudHJpZ2dlcignc2hvd24nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAkKCcjcmVtb3RlVmlkZW9zJykuYW5pbWF0ZSh7aGVpZ2h0OiB0aHVtYm5haWxzSGVpZ2h0fSxcbiAgICAgICAgICAgICAgICAgICAge3F1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMH0pO1xuXG4gICAgICAgICAgICAkKCcjcmVtb3RlVmlkZW9zPnNwYW4nKS5hbmltYXRlKHtoZWlnaHQ6IHRodW1ibmFpbHNIZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogdGh1bWJuYWlsc1dpZHRofSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInJlbW90ZXZpZGVvLnJlc2l6ZWRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt0aHVtYm5haWxzV2lkdGgsIHRodW1ibmFpbHNIZWlnaHRdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH19KTtcblxuICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW9Db250YWluZXInKS5hbmltYXRlKHsgd2lkdGg6IHZpZGVvc3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogdmlkZW9zcGFjZUhlaWdodH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlbycpLmFuaW1hdGUoeyAgd2lkdGg6IHZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB2aWRlb0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b3A6IHZlcnRpY2FsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvdHRvbTogdmVydGljYWxJbmRlbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDogaG9yaXpvbnRhbEluZGVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByaWdodDogaG9yaXpvbnRhbEluZGVudH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3F1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAkKCcjY2hhdHNwYWNlJykuc2hvdyhcInNsaWRlXCIsIHsgZGlyZWN0aW9uOiBcInJpZ2h0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVxdWVzdCB0aGUgZm9jdXMgaW4gdGhlIG5pY2tuYW1lIGZpZWxkIG9yIHRoZSBjaGF0IGlucHV0IGZpZWxkLlxuICAgICAgICBpZiAoJCgnI25pY2tuYW1lJykuY3NzKCd2aXNpYmlsaXR5JykgPT09ICd2aXNpYmxlJylcbiAgICAgICAgICAgICQoJyNuaWNraW5wdXQnKS5mb2N1cygpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICQoJyN1c2VybXNnJykuZm9jdXMoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBjaGF0IGNvbnZlcnNhdGlvbiBtb2RlLlxuICAgICAqL1xuICAgIG15LnNldENoYXRDb252ZXJzYXRpb25Nb2RlID0gZnVuY3Rpb24gKGlzQ29udmVyc2F0aW9uTW9kZSkge1xuICAgICAgICBpZiAoaXNDb252ZXJzYXRpb25Nb2RlKSB7XG4gICAgICAgICAgICAkKCcjbmlja25hbWUnKS5jc3Moe3Zpc2liaWxpdHk6ICdoaWRkZW4nfSk7XG4gICAgICAgICAgICAkKCcjY2hhdGNvbnZlcnNhdGlvbicpLmNzcyh7dmlzaWJpbGl0eTogJ3Zpc2libGUnfSk7XG4gICAgICAgICAgICAkKCcjdXNlcm1zZycpLmNzcyh7dmlzaWJpbGl0eTogJ3Zpc2libGUnfSk7XG4gICAgICAgICAgICAkKCcjdXNlcm1zZycpLmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVzaXplcyB0aGUgY2hhdCBhcmVhLlxuICAgICAqL1xuICAgIG15LnJlc2l6ZUNoYXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjaGF0U2l6ZSA9IENoYXQuZ2V0Q2hhdFNpemUoKTtcblxuICAgICAgICAkKCcjY2hhdHNwYWNlJykud2lkdGgoY2hhdFNpemVbMF0pO1xuICAgICAgICAkKCcjY2hhdHNwYWNlJykuaGVpZ2h0KGNoYXRTaXplWzFdKTtcblxuICAgICAgICByZXNpemVDaGF0Q29udmVyc2F0aW9uKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHNpemUgb2YgdGhlIGNoYXQuXG4gICAgICovXG4gICAgbXkuZ2V0Q2hhdFNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBhdmFpbGFibGVIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIHZhciBhdmFpbGFibGVXaWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoO1xuXG4gICAgICAgIHZhciBjaGF0V2lkdGggPSAyMDA7XG4gICAgICAgIGlmIChhdmFpbGFibGVXaWR0aCAqIDAuMiA8IDIwMClcbiAgICAgICAgICAgIGNoYXRXaWR0aCA9IGF2YWlsYWJsZVdpZHRoICogMC4yO1xuXG4gICAgICAgIHJldHVybiBbY2hhdFdpZHRoLCBhdmFpbGFibGVIZWlnaHRdO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBJbmRpY2F0ZXMgaWYgdGhlIGNoYXQgaXMgY3VycmVudGx5IHZpc2libGUuXG4gICAgICovXG4gICAgbXkuaXNWaXNpYmxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJCgnI2NoYXRzcGFjZScpLmlzKFwiOnZpc2libGVcIik7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlc2l6ZXMgdGhlIGNoYXQgY29udmVyc2F0aW9uLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJlc2l6ZUNoYXRDb252ZXJzYXRpb24oKSB7XG4gICAgICAgIHZhciB1c2VybXNnU3R5bGVIZWlnaHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInVzZXJtc2dcIikuc3R5bGUuaGVpZ2h0O1xuICAgICAgICB2YXIgdXNlcm1zZ0hlaWdodCA9IHVzZXJtc2dTdHlsZUhlaWdodFxuICAgICAgICAgICAgLnN1YnN0cmluZygwLCB1c2VybXNnU3R5bGVIZWlnaHQuaW5kZXhPZigncHgnKSk7XG5cbiAgICAgICAgJCgnI3VzZXJtc2cnKS53aWR0aCgkKCcjY2hhdHNwYWNlJykud2lkdGgoKSAtIDEwKTtcbiAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKS53aWR0aCgkKCcjY2hhdHNwYWNlJykud2lkdGgoKSAtIDEwKTtcbiAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKVxuICAgICAgICAgICAgLmhlaWdodCh3aW5kb3cuaW5uZXJIZWlnaHQgLSAxMCAtIHBhcnNlSW50KHVzZXJtc2dIZWlnaHQpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTaG93cy9oaWRlcyBhIHZpc3VhbCBub3RpZmljYXRpb24sIGluZGljYXRpbmcgdGhhdCBhIG1lc3NhZ2UgaGFzIGFycml2ZWQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2V0VmlzdWFsTm90aWZpY2F0aW9uKHNob3cpIHtcbiAgICAgICAgdmFyIHVucmVhZE1zZ0VsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndW5yZWFkTWVzc2FnZXMnKTtcblxuICAgICAgICB2YXIgZ2xvd2VyID0gJCgnI2NoYXRCdXR0b24nKTtcblxuICAgICAgICBpZiAodW5yZWFkTWVzc2FnZXMpIHtcbiAgICAgICAgICAgIHVucmVhZE1zZ0VsZW1lbnQuaW5uZXJIVE1MID0gdW5yZWFkTWVzc2FnZXMudG9TdHJpbmcoKTtcblxuICAgICAgICAgICAgVG9vbGJhci5kb2NrVG9vbGJhcih0cnVlKTtcblxuICAgICAgICAgICAgdmFyIGNoYXRCdXR0b25FbGVtZW50XG4gICAgICAgICAgICAgICAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hhdEJ1dHRvbicpLnBhcmVudE5vZGU7XG4gICAgICAgICAgICB2YXIgbGVmdEluZGVudCA9IChVdGlsLmdldFRleHRXaWR0aChjaGF0QnV0dG9uRWxlbWVudCkgLVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVXRpbC5nZXRUZXh0V2lkdGgodW5yZWFkTXNnRWxlbWVudCkpIC8gMjtcbiAgICAgICAgICAgIHZhciB0b3BJbmRlbnQgPSAoVXRpbC5nZXRUZXh0SGVpZ2h0KGNoYXRCdXR0b25FbGVtZW50KSAtXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFV0aWwuZ2V0VGV4dEhlaWdodCh1bnJlYWRNc2dFbGVtZW50KSkgLyAyIC0gMztcblxuICAgICAgICAgICAgdW5yZWFkTXNnRWxlbWVudC5zZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgICAgICAgICdzdHlsZScsXG4gICAgICAgICAgICAgICAgICAgICd0b3A6JyArIHRvcEluZGVudCArXG4gICAgICAgICAgICAgICAgICAgICc7IGxlZnQ6JyArIGxlZnRJbmRlbnQgKyAnOycpO1xuXG4gICAgICAgICAgICBpZiAoIWdsb3dlci5oYXNDbGFzcygnaWNvbi1jaGF0LXNpbXBsZScpKSB7XG4gICAgICAgICAgICAgICAgZ2xvd2VyLnJlbW92ZUNsYXNzKCdpY29uLWNoYXQnKTtcbiAgICAgICAgICAgICAgICBnbG93ZXIuYWRkQ2xhc3MoJ2ljb24tY2hhdC1zaW1wbGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHVucmVhZE1zZ0VsZW1lbnQuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgICAgICBnbG93ZXIucmVtb3ZlQ2xhc3MoJ2ljb24tY2hhdC1zaW1wbGUnKTtcbiAgICAgICAgICAgIGdsb3dlci5hZGRDbGFzcygnaWNvbi1jaGF0Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc2hvdyAmJiAhbm90aWZpY2F0aW9uSW50ZXJ2YWwpIHtcbiAgICAgICAgICAgIG5vdGlmaWNhdGlvbkludGVydmFsID0gd2luZG93LnNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBnbG93ZXIudG9nZ2xlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfSwgODAwKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghc2hvdyAmJiBub3RpZmljYXRpb25JbnRlcnZhbCkge1xuICAgICAgICAgICAgd2luZG93LmNsZWFySW50ZXJ2YWwobm90aWZpY2F0aW9uSW50ZXJ2YWwpO1xuICAgICAgICAgICAgbm90aWZpY2F0aW9uSW50ZXJ2YWwgPSBmYWxzZTtcbiAgICAgICAgICAgIGdsb3dlci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTY3JvbGxzIGNoYXQgdG8gdGhlIGJvdHRvbS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzY3JvbGxDaGF0VG9Cb3R0b20oKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKS5zY3JvbGxUb3AoXG4gICAgICAgICAgICAgICAgICAgICQoJyNjaGF0Y29udmVyc2F0aW9uJylbMF0uc2Nyb2xsSGVpZ2h0KTtcbiAgICAgICAgfSwgNSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG15O1xufShDaGF0IHx8IHt9KSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2hhdDtcbiIsImZ1bmN0aW9uIFJlcGxhY2VtZW50KClcbntcbiAgICAvKipcbiAgICAgKiBSZXBsYWNlcyBjb21tb24gc21pbGV5IHN0cmluZ3Mgd2l0aCBpbWFnZXNcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzbWlsaWZ5KGJvZHkpXG4gICAge1xuICAgICAgICBpZighYm9keSlcbiAgICAgICAgICAgIHJldHVybiBib2R5O1xuXG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyg6XFwofDpcXChcXCh8Oi1cXChcXCh8Oi1cXCh8XFwoc2FkXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxKyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChhbmdyeVxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MisgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoblxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MysgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oOi1cXClcXCl8OlxcKVxcKXw7LVxcKVxcKXw7XFwpXFwpfFxcKGxvbFxcKXw6LUR8OkR8Oy1EfDtEKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXk0KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyg7LVxcKFxcKHw7XFwoXFwofDstXFwofDtcXCh8OidcXCh8OictXFwofDp+LVxcKHw6flxcKHxcXCh1cHNldFxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5NSsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oPDN8Jmx0OzN8XFwoTFxcKXxcXChsXFwpfFxcKEhcXCl8XFwoaFxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5NisgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoYW5nZWxcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTcrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKGJvbWJcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTgrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKGNodWNrbGVcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTkrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKHlcXCl8XFwoWVxcKXxcXChva1xcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MTArIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKDstXFwpfDtcXCl8Oi1cXCl8OlxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MTErIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKGJsdXNoXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxMisgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oOi1cXCp8OlxcKnxcXChraXNzXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxMysgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoc2VhcmNoXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxNCsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwod2F2ZVxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MTUrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKGNsYXBcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTE2KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChzaWNrXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxNysgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oOi1QfDpQfDotcHw6cCkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MTgrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKDotXFwwfFxcKHNob2NrZWRcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTE5KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChvb3BzXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkyMCsgXCI+XCIpO1xuXG4gICAgICAgIHJldHVybiBib2R5O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFByb2Nlc3NlcyBsaW5rcyBhbmQgc21pbGV5cyBpbiBcImJvZHlcIlxuICAgICAqL1xuICAgIFJlcGxhY2VtZW50LnByb2Nlc3NSZXBsYWNlbWVudHMgPSBmdW5jdGlvbihib2R5KVxuICAgIHtcbiAgICAgICAgLy9tYWtlIGxpbmtzIGNsaWNrYWJsZVxuICAgICAgICBib2R5ID0gbGlua2lmeShib2R5KTtcblxuICAgICAgICAvL2FkZCBzbWlsZXlzXG4gICAgICAgIGJvZHkgPSBzbWlsaWZ5KGJvZHkpO1xuXG4gICAgICAgIHJldHVybiBib2R5O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZpbmRzIGFuZCByZXBsYWNlcyBhbGwgbGlua3MgaW4gdGhlIGxpbmtzIGluIFwiYm9keVwiXG4gICAgICogd2l0aCB0aGVpciA8YSBocmVmPVwiXCI+PC9hPlxuICAgICAqL1xuICAgIFJlcGxhY2VtZW50LmxpbmtpZnkgPSBmdW5jdGlvbihpbnB1dFRleHQpXG4gICAge1xuICAgICAgICB2YXIgcmVwbGFjZWRUZXh0LCByZXBsYWNlUGF0dGVybjEsIHJlcGxhY2VQYXR0ZXJuMiwgcmVwbGFjZVBhdHRlcm4zO1xuXG4gICAgICAgIC8vVVJMcyBzdGFydGluZyB3aXRoIGh0dHA6Ly8sIGh0dHBzOi8vLCBvciBmdHA6Ly9cbiAgICAgICAgcmVwbGFjZVBhdHRlcm4xID0gLyhcXGIoaHR0cHM/fGZ0cCk6XFwvXFwvWy1BLVowLTkrJkAjXFwvJT89fl98ITosLjtdKlstQS1aMC05KyZAI1xcLyU9fl98XSkvZ2ltO1xuICAgICAgICByZXBsYWNlZFRleHQgPSBpbnB1dFRleHQucmVwbGFjZShyZXBsYWNlUGF0dGVybjEsICc8YSBocmVmPVwiJDFcIiB0YXJnZXQ9XCJfYmxhbmtcIj4kMTwvYT4nKTtcblxuICAgICAgICAvL1VSTHMgc3RhcnRpbmcgd2l0aCBcInd3dy5cIiAod2l0aG91dCAvLyBiZWZvcmUgaXQsIG9yIGl0J2QgcmUtbGluayB0aGUgb25lcyBkb25lIGFib3ZlKS5cbiAgICAgICAgcmVwbGFjZVBhdHRlcm4yID0gLyhefFteXFwvXSkod3d3XFwuW1xcU10rKFxcYnwkKSkvZ2ltO1xuICAgICAgICByZXBsYWNlZFRleHQgPSByZXBsYWNlZFRleHQucmVwbGFjZShyZXBsYWNlUGF0dGVybjIsICckMTxhIGhyZWY9XCJodHRwOi8vJDJcIiB0YXJnZXQ9XCJfYmxhbmtcIj4kMjwvYT4nKTtcblxuICAgICAgICAvL0NoYW5nZSBlbWFpbCBhZGRyZXNzZXMgdG8gbWFpbHRvOjogbGlua3MuXG4gICAgICAgIHJlcGxhY2VQYXR0ZXJuMyA9IC8oKFthLXpBLVowLTlcXC1cXF9cXC5dKStAW2EtekEtWlxcX10rPyhcXC5bYS16QS1aXXsyLDZ9KSspL2dpbTtcbiAgICAgICAgcmVwbGFjZWRUZXh0ID0gcmVwbGFjZWRUZXh0LnJlcGxhY2UocmVwbGFjZVBhdHRlcm4zLCAnPGEgaHJlZj1cIm1haWx0bzokMVwiPiQxPC9hPicpO1xuXG4gICAgICAgIHJldHVybiByZXBsYWNlZFRleHQ7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlcGxhY2VtZW50O1xuXG5cblxuIiwiLyogZ2xvYmFsICQsIGNvbmZpZywgUHJlemksIFV0aWwsIGNvbm5lY3Rpb24sIHNldExhcmdlVmlkZW9WaXNpYmxlLCBkb2NrVG9vbGJhciAqL1xudmFyIFByZXppID0gcmVxdWlyZShcIi4uL3ByZXppL1ByZXppLmpzXCIpO1xuLy92YXIgVUlVdGlsID0gcmVxdWlyZShcIi4uL1VJVXRpbC5qc1wiKTtcblxudmFyIEV0aGVycGFkID0gKGZ1bmN0aW9uIChteSkge1xuICAgIHZhciBldGhlcnBhZE5hbWUgPSBudWxsO1xuICAgIHZhciBldGhlcnBhZElGcmFtZSA9IG51bGw7XG4gICAgdmFyIGRvbWFpbiA9IG51bGw7XG4gICAgdmFyIG9wdGlvbnMgPSBcIj9zaG93Q29udHJvbHM9dHJ1ZSZzaG93Q2hhdD1mYWxzZSZzaG93TGluZU51bWJlcnM9dHJ1ZSZ1c2VNb25vc3BhY2VGb250PWZhbHNlXCI7XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgZXRoZXJwYWQuXG4gICAgICovXG4gICAgbXkuaW5pdCA9IGZ1bmN0aW9uIChuYW1lKSB7XG5cbiAgICAgICAgaWYgKGNvbmZpZy5ldGhlcnBhZF9iYXNlICYmICFldGhlcnBhZE5hbWUpIHtcblxuICAgICAgICAgICAgZG9tYWluID0gY29uZmlnLmV0aGVycGFkX2Jhc2U7XG5cbiAgICAgICAgICAgIGlmICghbmFtZSkge1xuICAgICAgICAgICAgICAgIC8vIEluIGNhc2Ugd2UncmUgdGhlIGZvY3VzIHdlIGdlbmVyYXRlIHRoZSBuYW1lLlxuICAgICAgICAgICAgICAgIGV0aGVycGFkTmFtZSA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdfJyArIChuZXcgRGF0ZSgpLmdldFRpbWUoKSkudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICBzaGFyZUV0aGVycGFkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgZXRoZXJwYWROYW1lID0gbmFtZTtcblxuICAgICAgICAgICAgZW5hYmxlRXRoZXJwYWRCdXR0b24oKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBPcGVucy9oaWRlcyB0aGUgRXRoZXJwYWQuXG4gICAgICovXG4gICAgbXkudG9nZ2xlRXRoZXJwYWQgPSBmdW5jdGlvbiAoaXNQcmVzZW50YXRpb24pIHtcbiAgICAgICAgaWYgKCFldGhlcnBhZElGcmFtZSlcbiAgICAgICAgICAgIGNyZWF0ZUlGcmFtZSgpO1xuXG4gICAgICAgIHZhciBsYXJnZVZpZGVvID0gbnVsbDtcbiAgICAgICAgaWYgKFByZXppLmlzUHJlc2VudGF0aW9uVmlzaWJsZSgpKVxuICAgICAgICAgICAgbGFyZ2VWaWRlbyA9ICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJyk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGxhcmdlVmlkZW8gPSAkKCcjbGFyZ2VWaWRlbycpO1xuXG4gICAgICAgIGlmICgkKCcjZXRoZXJwYWQ+aWZyYW1lJykuY3NzKCd2aXNpYmlsaXR5JykgPT09ICdoaWRkZW4nKSB7XG4gICAgICAgICAgICBsYXJnZVZpZGVvLmZhZGVPdXQoMzAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKFByZXppLmlzUHJlc2VudGF0aW9uVmlzaWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGxhcmdlVmlkZW8uY3NzKHtvcGFjaXR5OiAnMCd9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zZXRMYXJnZVZpZGVvVmlzaWJsZShmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIFRvb2xiYXIuZG9ja1Rvb2xiYXIodHJ1ZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJCgnI2V0aGVycGFkPmlmcmFtZScpLmZhZGVJbigzMDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5iYWNrZ3JvdW5kID0gJyNlZWVlZWUnO1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXRoZXJwYWQ+aWZyYW1lJykuY3NzKHt2aXNpYmlsaXR5OiAndmlzaWJsZSd9KTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V0aGVycGFkJykuY3NzKHt6SW5kZXg6IDJ9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCQoJyNldGhlcnBhZD5pZnJhbWUnKSkge1xuICAgICAgICAgICAgJCgnI2V0aGVycGFkPmlmcmFtZScpLmZhZGVPdXQoMzAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgJCgnI2V0aGVycGFkPmlmcmFtZScpLmNzcyh7dmlzaWJpbGl0eTogJ2hpZGRlbid9KTtcbiAgICAgICAgICAgICAgICAkKCcjZXRoZXJwYWQnKS5jc3Moe3pJbmRleDogMH0pO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuc3R5bGUuYmFja2dyb3VuZCA9ICdibGFjayc7XG4gICAgICAgICAgICAgICAgaWYgKCFpc1ByZXNlbnRhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAkKCcjbGFyZ2VWaWRlbycpLmZhZGVJbigzMDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNldExhcmdlVmlkZW9WaXNpYmxlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgVG9vbGJhci5kb2NrVG9vbGJhcihmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJlc2l6ZSgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXNpemVzIHRoZSBldGhlcnBhZC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiByZXNpemUoKSB7XG4gICAgICAgIGlmICgkKCcjZXRoZXJwYWQ+aWZyYW1lJykubGVuZ3RoKSB7XG4gICAgICAgICAgICB2YXIgcmVtb3RlVmlkZW9zID0gJCgnI3JlbW90ZVZpZGVvcycpO1xuICAgICAgICAgICAgdmFyIGF2YWlsYWJsZUhlaWdodFxuICAgICAgICAgICAgICAgID0gd2luZG93LmlubmVySGVpZ2h0IC0gcmVtb3RlVmlkZW9zLm91dGVySGVpZ2h0KCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhVSVV0aWwpO1xuICAgICAgICAgICAgdmFyIGF2YWlsYWJsZVdpZHRoID0gVUlVdGlsLmdldEF2YWlsYWJsZVZpZGVvV2lkdGgoKTtcblxuICAgICAgICAgICAgJCgnI2V0aGVycGFkPmlmcmFtZScpLndpZHRoKGF2YWlsYWJsZVdpZHRoKTtcbiAgICAgICAgICAgICQoJyNldGhlcnBhZD5pZnJhbWUnKS5oZWlnaHQoYXZhaWxhYmxlSGVpZ2h0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNoYXJlcyB0aGUgRXRoZXJwYWQgbmFtZSB3aXRoIG90aGVyIHBhcnRpY2lwYW50cy5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzaGFyZUV0aGVycGFkKCkge1xuICAgICAgICBjb25uZWN0aW9uLmVtdWMuYWRkRXRoZXJwYWRUb1ByZXNlbmNlKGV0aGVycGFkTmFtZSk7XG4gICAgICAgIGNvbm5lY3Rpb24uZW11Yy5zZW5kUHJlc2VuY2UoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIHRoZSBFdGhlcnBhZCBidXR0b24gYW5kIGFkZHMgaXQgdG8gdGhlIHRvb2xiYXIuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZW5hYmxlRXRoZXJwYWRCdXR0b24oKSB7XG4gICAgICAgIGlmICghJCgnI2V0aGVycGFkQnV0dG9uJykuaXMoXCI6dmlzaWJsZVwiKSlcbiAgICAgICAgICAgICQoJyNldGhlcnBhZEJ1dHRvbicpLmNzcyh7ZGlzcGxheTogJ2lubGluZS1ibG9jayd9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIHRoZSBJRnJhbWUgZm9yIHRoZSBldGhlcnBhZC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVJRnJhbWUoKSB7XG4gICAgICAgIGV0aGVycGFkSUZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG4gICAgICAgIGV0aGVycGFkSUZyYW1lLnNyYyA9IGRvbWFpbiArIGV0aGVycGFkTmFtZSArIG9wdGlvbnM7XG4gICAgICAgIGV0aGVycGFkSUZyYW1lLmZyYW1lQm9yZGVyID0gMDtcbiAgICAgICAgZXRoZXJwYWRJRnJhbWUuc2Nyb2xsaW5nID0gXCJub1wiO1xuICAgICAgICBldGhlcnBhZElGcmFtZS53aWR0aCA9ICQoJyNsYXJnZVZpZGVvQ29udGFpbmVyJykud2lkdGgoKSB8fCA2NDA7XG4gICAgICAgIGV0aGVycGFkSUZyYW1lLmhlaWdodCA9ICQoJyNsYXJnZVZpZGVvQ29udGFpbmVyJykuaGVpZ2h0KCkgfHwgNDgwO1xuICAgICAgICBldGhlcnBhZElGcmFtZS5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ3Zpc2liaWxpdHk6IGhpZGRlbjsnKTtcblxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZXRoZXJwYWQnKS5hcHBlbmRDaGlsZChldGhlcnBhZElGcmFtZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogT24gRXRoZXJwYWQgYWRkZWQgdG8gbXVjLlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ2V0aGVycGFkYWRkZWQubXVjJywgZnVuY3Rpb24gKGV2ZW50LCBqaWQsIGV0aGVycGFkTmFtZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkV0aGVycGFkIGFkZGVkXCIsIGV0aGVycGFkTmFtZSk7XG4gICAgICAgIGlmIChjb25maWcuZXRoZXJwYWRfYmFzZSAmJiAhZm9jdXMpIHtcbiAgICAgICAgICAgIEV0aGVycGFkLmluaXQoZXRoZXJwYWROYW1lKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogT24gZm9jdXMgY2hhbmdlZCBldmVudC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdmb2N1c2VjaGFuZ2VkLm11YycsIGZ1bmN0aW9uIChldmVudCwgZm9jdXMpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJGb2N1cyBjaGFuZ2VkXCIpO1xuICAgICAgICBpZiAoY29uZmlnLmV0aGVycGFkX2Jhc2UpXG4gICAgICAgICAgICBzaGFyZUV0aGVycGFkKCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBPbiB2aWRlbyBzZWxlY3RlZCBldmVudC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCd2aWRlby5zZWxlY3RlZCcsIGZ1bmN0aW9uIChldmVudCwgaXNQcmVzZW50YXRpb24pIHtcbiAgICAgICAgaWYgKCFjb25maWcuZXRoZXJwYWRfYmFzZSlcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBpZiAoZXRoZXJwYWRJRnJhbWUgJiYgZXRoZXJwYWRJRnJhbWUuc3R5bGUudmlzaWJpbGl0eSAhPT0gJ2hpZGRlbicpXG4gICAgICAgICAgICBFdGhlcnBhZC50b2dnbGVFdGhlcnBhZChpc1ByZXNlbnRhdGlvbik7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBSZXNpemVzIHRoZSBldGhlcnBhZCwgd2hlbiB0aGUgd2luZG93IGlzIHJlc2l6ZWQuXG4gICAgICovXG4gICAgJCh3aW5kb3cpLnJlc2l6ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlc2l6ZSgpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG15O1xufShFdGhlcnBhZCB8fCB7fSkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV0aGVycGFkOyIsInZhciBQcmV6aVBsYXllciA9IHJlcXVpcmUoXCIuL1ByZXppUGxheWVyLmpzXCIpO1xudmFyIFVJVXRpbCA9IHJlcXVpcmUoXCIuLi9VSVV0aWwuanNcIik7XG5cbnZhciBQcmV6aSA9IChmdW5jdGlvbiAobXkpIHtcbiAgICB2YXIgcHJlemlQbGF5ZXIgPSBudWxsO1xuXG4gICAgLyoqXG4gICAgICogUmVsb2FkcyB0aGUgY3VycmVudCBwcmVzZW50YXRpb24uXG4gICAgICovXG4gICAgbXkucmVsb2FkUHJlc2VudGF0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBpZnJhbWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChwcmV6aVBsYXllci5vcHRpb25zLnByZXppSWQpO1xuICAgICAgICBpZnJhbWUuc3JjID0gaWZyYW1lLnNyYztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2hvd3MvaGlkZXMgYSBwcmVzZW50YXRpb24uXG4gICAgICovXG4gICAgbXkuc2V0UHJlc2VudGF0aW9uVmlzaWJsZSA9IGZ1bmN0aW9uICh2aXNpYmxlKSB7XG4gICAgICAgIGlmICh2aXNpYmxlKSB7XG4gICAgICAgICAgICAvLyBUcmlnZ2VyIHRoZSB2aWRlby5zZWxlY3RlZCBldmVudCB0byBpbmRpY2F0ZSBhIGNoYW5nZSBpbiB0aGVcbiAgICAgICAgICAgIC8vIGxhcmdlIHZpZGVvLlxuICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcihcInZpZGVvLnNlbGVjdGVkXCIsIFt0cnVlXSk7XG5cbiAgICAgICAgICAgICQoJyNsYXJnZVZpZGVvJykuZmFkZU91dCgzMDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zZXRMYXJnZVZpZGVvVmlzaWJsZShmYWxzZSk7XG4gICAgICAgICAgICAgICAgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS5mYWRlSW4oMzAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS5jc3Moe29wYWNpdHk6JzEnfSk7XG4gICAgICAgICAgICAgICAgICAgIFRvb2xiYXIuZG9ja1Rvb2xiYXIodHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmICgkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLmNzcygnb3BhY2l0eScpID09ICcxJykge1xuICAgICAgICAgICAgICAgICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykuZmFkZU91dCgzMDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS5jc3Moe29wYWNpdHk6JzAnfSk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNyZWxvYWRQcmVzZW50YXRpb24nKS5jc3Moe2Rpc3BsYXk6J25vbmUnfSk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNsYXJnZVZpZGVvJykuZmFkZUluKDMwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zZXRMYXJnZVZpZGVvVmlzaWJsZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFRvb2xiYXIuZG9ja1Rvb2xiYXIoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIDx0dD50cnVlPC90dD4gaWYgdGhlIHByZXNlbnRhdGlvbiBpcyB2aXNpYmxlLCA8dHQ+ZmFsc2U8L3R0PiAtXG4gICAgICogb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIG15LmlzUHJlc2VudGF0aW9uVmlzaWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICgkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpICE9IG51bGxcbiAgICAgICAgICAgICAgICAmJiAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLmNzcygnb3BhY2l0eScpID09IDEpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBPcGVucyB0aGUgUHJlemkgZGlhbG9nLCBmcm9tIHdoaWNoIHRoZSB1c2VyIGNvdWxkIGNob29zZSBhIHByZXNlbnRhdGlvblxuICAgICAqIHRvIGxvYWQuXG4gICAgICovXG4gICAgbXkub3BlblByZXppRGlhbG9nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBteXByZXppID0gY29ubmVjdGlvbi5lbXVjLmdldFByZXppKGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQpO1xuICAgICAgICBpZiAobXlwcmV6aSkge1xuICAgICAgICAgICAgJC5wcm9tcHQoXCJBcmUgeW91IHN1cmUgeW91IHdvdWxkIGxpa2UgdG8gcmVtb3ZlIHlvdXIgUHJlemk/XCIsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6IFwiUmVtb3ZlIFByZXppXCIsXG4gICAgICAgICAgICAgICAgICAgIGJ1dHRvbnM6IHsgXCJSZW1vdmVcIjogdHJ1ZSwgXCJDYW5jZWxcIjogZmFsc2V9LFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0QnV0dG9uOiAxLFxuICAgICAgICAgICAgICAgICAgICBzdWJtaXQ6IGZ1bmN0aW9uKGUsdixtLGYpe1xuICAgICAgICAgICAgICAgICAgICBpZih2KVxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMucmVtb3ZlUHJlemlGcm9tUHJlc2VuY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Yy5zZW5kUHJlc2VuY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHByZXppUGxheWVyICE9IG51bGwpIHtcbiAgICAgICAgICAgICQucHJvbXB0KFwiQW5vdGhlciBwYXJ0aWNpcGFudCBpcyBhbHJlYWR5IHNoYXJpbmcgYSBQcmV6aS5cIiArXG4gICAgICAgICAgICAgICAgICAgIFwiVGhpcyBjb25mZXJlbmNlIGFsbG93cyBvbmx5IG9uZSBQcmV6aSBhdCBhIHRpbWUuXCIsXG4gICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCJTaGFyZSBhIFByZXppXCIsXG4gICAgICAgICAgICAgICAgICAgICBidXR0b25zOiB7IFwiT2tcIjogdHJ1ZX0sXG4gICAgICAgICAgICAgICAgICAgICBkZWZhdWx0QnV0dG9uOiAwLFxuICAgICAgICAgICAgICAgICAgICAgc3VibWl0OiBmdW5jdGlvbihlLHYsbSxmKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICQucHJvbXB0LmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBvcGVuUHJlemlTdGF0ZSA9IHtcbiAgICAgICAgICAgIHN0YXRlMDoge1xuICAgICAgICAgICAgICAgIGh0bWw6ICAgJzxoMj5TaGFyZSBhIFByZXppPC9oMj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICc8aW5wdXQgaWQ9XCJwcmV6aVVybFwiIHR5cGU9XCJ0ZXh0XCIgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAncGxhY2Vob2xkZXI9XCJlLmcuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2h0dHA6Ly9wcmV6aS5jb20vd3o3dmhqeWNsN2U2L215LXByZXppXCIgYXV0b2ZvY3VzPicsXG4gICAgICAgICAgICAgICAgcGVyc2lzdGVudDogZmFsc2UsXG4gICAgICAgICAgICAgICAgYnV0dG9uczogeyBcIlNoYXJlXCI6IHRydWUgLCBcIkNhbmNlbFwiOiBmYWxzZX0sXG4gICAgICAgICAgICAgICAgZGVmYXVsdEJ1dHRvbjogMSxcbiAgICAgICAgICAgICAgICBzdWJtaXQ6IGZ1bmN0aW9uKGUsdixtLGYpe1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmKHYpXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwcmV6aVVybCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcmV6aVVybCcpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJlemlVcmwudmFsdWUpXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHVybFZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID0gZW5jb2RlVVJJKFV0aWwuZXNjYXBlSHRtbChwcmV6aVVybC52YWx1ZSkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVybFZhbHVlLmluZGV4T2YoJ2h0dHA6Ly9wcmV6aS5jb20vJykgIT0gMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAmJiB1cmxWYWx1ZS5pbmRleE9mKCdodHRwczovL3ByZXppLmNvbS8nKSAhPSAwKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJC5wcm9tcHQuZ29Ub1N0YXRlKCdzdGF0ZTEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHByZXNJZFRtcCA9IHVybFZhbHVlLnN1YnN0cmluZyhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmxWYWx1ZS5pbmRleE9mKFwicHJlemkuY29tL1wiKSArIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0FscGhhbnVtZXJpYyhwcmVzSWRUbXApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgcHJlc0lkVG1wLmluZGV4T2YoJy8nKSA8IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQucHJvbXB0LmdvVG9TdGF0ZSgnc3RhdGUxJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmVtdWNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYWRkUHJlemlUb1ByZXNlbmNlKHVybFZhbHVlLCAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Yy5zZW5kUHJlc2VuY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQucHJvbXB0LmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgJC5wcm9tcHQuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3RhdGUxOiB7XG4gICAgICAgICAgICAgICAgaHRtbDogICAnPGgyPlNoYXJlIGEgUHJlemk8L2gyPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ1BsZWFzZSBwcm92aWRlIGEgY29ycmVjdCBwcmV6aSBsaW5rLicsXG4gICAgICAgICAgICAgICAgcGVyc2lzdGVudDogZmFsc2UsXG4gICAgICAgICAgICAgICAgYnV0dG9uczogeyBcIkJhY2tcIjogdHJ1ZSwgXCJDYW5jZWxcIjogZmFsc2UgfSxcbiAgICAgICAgICAgICAgICBkZWZhdWx0QnV0dG9uOiAxLFxuICAgICAgICAgICAgICAgIHN1Ym1pdDpmdW5jdGlvbihlLHYsbSxmKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYodj09MClcbiAgICAgICAgICAgICAgICAgICAgICAgICQucHJvbXB0LmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICQucHJvbXB0LmdvVG9TdGF0ZSgnc3RhdGUwJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIG15UHJvbXB0ID0galF1ZXJ5LnByb21wdChvcGVuUHJlemlTdGF0ZSk7XG5cbiAgICAgICAgICAgIG15UHJvbXB0Lm9uKCdpbXByb21wdHU6bG9hZGVkJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByZXppVXJsJykuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbXlQcm9tcHQub24oJ2ltcHJvbXB0dTpzdGF0ZWNoYW5nZWQnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJlemlVcmwnKS5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQSBuZXcgcHJlc2VudGF0aW9uIGhhcyBiZWVuIGFkZGVkLlxuICAgICAqIFxuICAgICAqIEBwYXJhbSBldmVudCB0aGUgZXZlbnQgaW5kaWNhdGluZyB0aGUgYWRkIG9mIGEgcHJlc2VudGF0aW9uXG4gICAgICogQHBhcmFtIGppZCB0aGUgamlkIGZyb20gd2hpY2ggdGhlIHByZXNlbnRhdGlvbiB3YXMgYWRkZWRcbiAgICAgKiBAcGFyYW0gcHJlc1VybCB1cmwgb2YgdGhlIHByZXNlbnRhdGlvblxuICAgICAqIEBwYXJhbSBjdXJyZW50U2xpZGUgdGhlIGN1cnJlbnQgc2xpZGUgdG8gd2hpY2ggd2Ugc2hvdWxkIG1vdmVcbiAgICAgKi9cbiAgICB2YXIgcHJlc2VudGF0aW9uQWRkZWQgPSBmdW5jdGlvbihldmVudCwgamlkLCBwcmVzVXJsLCBjdXJyZW50U2xpZGUpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJwcmVzZW50YXRpb24gYWRkZWRcIiwgcHJlc1VybCk7XG5cbiAgICAgICAgdmFyIHByZXNJZCA9IGdldFByZXNlbnRhdGlvbklkKHByZXNVcmwpO1xuXG4gICAgICAgIHZhciBlbGVtZW50SWQgPSAncGFydGljaXBhbnRfJ1xuICAgICAgICAgICAgICAgICAgICAgICAgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpXG4gICAgICAgICAgICAgICAgICAgICAgICArICdfJyArIHByZXNJZDtcblxuICAgICAgICAvLyBXZSBleHBsaWNpdGx5IGRvbid0IHNwZWNpZnkgdGhlIHBlZXIgamlkIGhlcmUsIGJlY2F1c2Ugd2UgZG9uJ3Qgd2FudFxuICAgICAgICAvLyB0aGlzIHZpZGVvIHRvIGJlIGRlYWx0IHdpdGggYXMgYSBwZWVyIHJlbGF0ZWQgb25lIChmb3IgZXhhbXBsZSB3ZVxuICAgICAgICAvLyBkb24ndCB3YW50IHRvIHNob3cgYSBtdXRlL2tpY2sgbWVudSBmb3IgdGhpcyBvbmUsIGV0Yy4pLlxuICAgICAgICBWaWRlb0xheW91dC5hZGRSZW1vdGVWaWRlb0NvbnRhaW5lcihudWxsLCBlbGVtZW50SWQpO1xuICAgICAgICBWaWRlb0xheW91dC5yZXNpemVUaHVtYm5haWxzKCk7XG5cbiAgICAgICAgdmFyIGNvbnRyb2xzRW5hYmxlZCA9IGZhbHNlO1xuICAgICAgICBpZiAoamlkID09PSBjb25uZWN0aW9uLmVtdWMubXlyb29tamlkKVxuICAgICAgICAgICAgY29udHJvbHNFbmFibGVkID0gdHJ1ZTtcblxuICAgICAgICBQcmV6aS5zZXRQcmVzZW50YXRpb25WaXNpYmxlKHRydWUpO1xuICAgICAgICAkKCcjbGFyZ2VWaWRlb0NvbnRhaW5lcicpLmhvdmVyKFxuICAgICAgICAgICAgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKFByZXppLmlzUHJlc2VudGF0aW9uVmlzaWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWxvYWRCdXR0b25SaWdodCA9IHdpbmRvdy5pbm5lcldpZHRoXG4gICAgICAgICAgICAgICAgICAgICAgICAtICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykub2Zmc2V0KCkubGVmdFxuICAgICAgICAgICAgICAgICAgICAgICAgLSAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLndpZHRoKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgJCgnI3JlbG9hZFByZXNlbnRhdGlvbicpLmNzcyh7ICByaWdodDogcmVsb2FkQnV0dG9uUmlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGxheTonaW5saW5lLWJsb2NrJ30pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIVByZXppLmlzUHJlc2VudGF0aW9uVmlzaWJsZSgpKVxuICAgICAgICAgICAgICAgICAgICAkKCcjcmVsb2FkUHJlc2VudGF0aW9uJykuY3NzKHtkaXNwbGF5Oidub25lJ30pO1xuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZSA9IGV2ZW50LnRvRWxlbWVudCB8fCBldmVudC5yZWxhdGVkVGFyZ2V0O1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChlICYmIGUuaWQgIT0gJ3JlbG9hZFByZXNlbnRhdGlvbicgJiYgZS5pZCAhPSAnaGVhZGVyJylcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJyNyZWxvYWRQcmVzZW50YXRpb24nKS5jc3Moe2Rpc3BsYXk6J25vbmUnfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgcHJlemlQbGF5ZXIgPSBuZXcgUHJlemlQbGF5ZXIoXG4gICAgICAgICAgICAgICAgICAgICdwcmVzZW50YXRpb24nLFxuICAgICAgICAgICAgICAgICAgICB7cHJlemlJZDogcHJlc0lkLFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogZ2V0UHJlc2VudGF0aW9uV2lkdGgoKSxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBnZXRQcmVzZW50YXRpb25IZWloZ3QoKSxcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbHM6IGNvbnRyb2xzRW5hYmxlZCxcbiAgICAgICAgICAgICAgICAgICAgZGVidWc6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS5hdHRyKCdpZCcsIHByZXppUGxheWVyLm9wdGlvbnMucHJlemlJZCk7XG5cbiAgICAgICAgcHJlemlQbGF5ZXIub24oUHJlemlQbGF5ZXIuRVZFTlRfU1RBVFVTLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJwcmV6aSBzdGF0dXNcIiwgZXZlbnQudmFsdWUpO1xuICAgICAgICAgICAgaWYgKGV2ZW50LnZhbHVlID09IFByZXppUGxheWVyLlNUQVRVU19DT05URU5UX1JFQURZKSB7XG4gICAgICAgICAgICAgICAgaWYgKGppZCAhPSBjb25uZWN0aW9uLmVtdWMubXlyb29tamlkKVxuICAgICAgICAgICAgICAgICAgICBwcmV6aVBsYXllci5mbHlUb1N0ZXAoY3VycmVudFNsaWRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcHJlemlQbGF5ZXIub24oUHJlemlQbGF5ZXIuRVZFTlRfQ1VSUkVOVF9TVEVQLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJldmVudCB2YWx1ZVwiLCBldmVudC52YWx1ZSk7XG4gICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuYWRkQ3VycmVudFNsaWRlVG9QcmVzZW5jZShldmVudC52YWx1ZSk7XG4gICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuc2VuZFByZXNlbmNlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoXCIjXCIgKyBlbGVtZW50SWQpLmNzcyggJ2JhY2tncm91bmQtaW1hZ2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAndXJsKC4uL2ltYWdlcy9hdmF0YXJwcmV6aS5wbmcpJyk7XG4gICAgICAgICQoXCIjXCIgKyBlbGVtZW50SWQpLmNsaWNrKFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFByZXppLnNldFByZXNlbnRhdGlvblZpc2libGUodHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEEgcHJlc2VudGF0aW9uIGhhcyBiZWVuIHJlbW92ZWQuXG4gICAgICogXG4gICAgICogQHBhcmFtIGV2ZW50IHRoZSBldmVudCBpbmRpY2F0aW5nIHRoZSByZW1vdmUgb2YgYSBwcmVzZW50YXRpb25cbiAgICAgKiBAcGFyYW0gamlkIHRoZSBqaWQgZm9yIHdoaWNoIHRoZSBwcmVzZW50YXRpb24gd2FzIHJlbW92ZWRcbiAgICAgKiBAcGFyYW0gdGhlIHVybCBvZiB0aGUgcHJlc2VudGF0aW9uXG4gICAgICovXG4gICAgdmFyIHByZXNlbnRhdGlvblJlbW92ZWQgPSBmdW5jdGlvbiAoZXZlbnQsIGppZCwgcHJlc1VybCkge1xuICAgICAgICBjb25zb2xlLmxvZygncHJlc2VudGF0aW9uIHJlbW92ZWQnLCBwcmVzVXJsKTtcbiAgICAgICAgdmFyIHByZXNJZCA9IGdldFByZXNlbnRhdGlvbklkKHByZXNVcmwpO1xuICAgICAgICBQcmV6aS5zZXRQcmVzZW50YXRpb25WaXNpYmxlKGZhbHNlKTtcbiAgICAgICAgJCgnI3BhcnRpY2lwYW50XydcbiAgICAgICAgICAgICAgICArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGppZClcbiAgICAgICAgICAgICAgICArICdfJyArIHByZXNJZCkucmVtb3ZlKCk7XG4gICAgICAgICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykucmVtb3ZlKCk7XG4gICAgICAgIGlmIChwcmV6aVBsYXllciAhPSBudWxsKSB7XG4gICAgICAgICAgICBwcmV6aVBsYXllci5kZXN0cm95KCk7XG4gICAgICAgICAgICBwcmV6aVBsYXllciA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSW5kaWNhdGVzIGlmIHRoZSBnaXZlbiBzdHJpbmcgaXMgYW4gYWxwaGFudW1lcmljIHN0cmluZy5cbiAgICAgKiBOb3RlIHRoYXQgc29tZSBzcGVjaWFsIGNoYXJhY3RlcnMgYXJlIGFsc28gYWxsb3dlZCAoLSwgXyAsIC8sICYsID8sID0sIDspIGZvciB0aGVcbiAgICAgKiBwdXJwb3NlIG9mIGNoZWNraW5nIFVSSXMuXG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNBbHBoYW51bWVyaWModW5zYWZlVGV4dCkge1xuICAgICAgICB2YXIgcmVnZXggPSAvXlthLXowLTktX1xcLyZcXD89O10rJC9pO1xuICAgICAgICByZXR1cm4gcmVnZXgudGVzdCh1bnNhZmVUZXh0KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBwcmVzZW50YXRpb24gaWQgZnJvbSB0aGUgZ2l2ZW4gdXJsLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFByZXNlbnRhdGlvbklkIChwcmVzVXJsKSB7XG4gICAgICAgIHZhciBwcmVzSWRUbXAgPSBwcmVzVXJsLnN1YnN0cmluZyhwcmVzVXJsLmluZGV4T2YoXCJwcmV6aS5jb20vXCIpICsgMTApO1xuICAgICAgICByZXR1cm4gcHJlc0lkVG1wLnN1YnN0cmluZygwLCBwcmVzSWRUbXAuaW5kZXhPZignLycpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBwcmVzZW50YXRpb24gd2lkdGguXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UHJlc2VudGF0aW9uV2lkdGgoKSB7XG4gICAgICAgIHZhciBhdmFpbGFibGVXaWR0aCA9IFVJVXRpbC5nZXRBdmFpbGFibGVWaWRlb1dpZHRoKCk7XG4gICAgICAgIHZhciBhdmFpbGFibGVIZWlnaHQgPSBnZXRQcmVzZW50YXRpb25IZWloZ3QoKTtcblxuICAgICAgICB2YXIgYXNwZWN0UmF0aW8gPSAxNi4wIC8gOS4wO1xuICAgICAgICBpZiAoYXZhaWxhYmxlSGVpZ2h0IDwgYXZhaWxhYmxlV2lkdGggLyBhc3BlY3RSYXRpbykge1xuICAgICAgICAgICAgYXZhaWxhYmxlV2lkdGggPSBNYXRoLmZsb29yKGF2YWlsYWJsZUhlaWdodCAqIGFzcGVjdFJhdGlvKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXZhaWxhYmxlV2lkdGg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgcHJlc2VudGF0aW9uIGhlaWdodC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRQcmVzZW50YXRpb25IZWloZ3QoKSB7XG4gICAgICAgIHZhciByZW1vdGVWaWRlb3MgPSAkKCcjcmVtb3RlVmlkZW9zJyk7XG4gICAgICAgIHJldHVybiB3aW5kb3cuaW5uZXJIZWlnaHQgLSByZW1vdGVWaWRlb3Mub3V0ZXJIZWlnaHQoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXNpemVzIHRoZSBwcmVzZW50YXRpb24gaWZyYW1lLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJlc2l6ZSgpIHtcbiAgICAgICAgaWYgKCQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykpIHtcbiAgICAgICAgICAgICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykud2lkdGgoZ2V0UHJlc2VudGF0aW9uV2lkdGgoKSk7XG4gICAgICAgICAgICAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLmhlaWdodChnZXRQcmVzZW50YXRpb25IZWloZ3QoKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQcmVzZW50YXRpb24gaGFzIGJlZW4gcmVtb3ZlZC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdwcmVzZW50YXRpb25yZW1vdmVkLm11YycsIHByZXNlbnRhdGlvblJlbW92ZWQpO1xuXG4gICAgLyoqXG4gICAgICogUHJlc2VudGF0aW9uIGhhcyBiZWVuIGFkZGVkLlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ3ByZXNlbnRhdGlvbmFkZGVkLm11YycsIHByZXNlbnRhdGlvbkFkZGVkKTtcblxuICAgIC8qXG4gICAgICogSW5kaWNhdGVzIHByZXNlbnRhdGlvbiBzbGlkZSBjaGFuZ2UuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgnZ290b3NsaWRlLm11YycsIGZ1bmN0aW9uIChldmVudCwgamlkLCBwcmVzVXJsLCBjdXJyZW50KSB7XG4gICAgICAgIGlmIChwcmV6aVBsYXllciAmJiBwcmV6aVBsYXllci5nZXRDdXJyZW50U3RlcCgpICE9IGN1cnJlbnQpIHtcbiAgICAgICAgICAgIHByZXppUGxheWVyLmZseVRvU3RlcChjdXJyZW50KTtcblxuICAgICAgICAgICAgdmFyIGFuaW1hdGlvblN0ZXBzQXJyYXkgPSBwcmV6aVBsYXllci5nZXRBbmltYXRpb25Db3VudE9uU3RlcHMoKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFyc2VJbnQoYW5pbWF0aW9uU3RlcHNBcnJheVtjdXJyZW50XSk7IGkrKykge1xuICAgICAgICAgICAgICAgIHByZXppUGxheWVyLmZseVRvU3RlcChjdXJyZW50LCBpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogT24gdmlkZW8gc2VsZWN0ZWQgZXZlbnQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgndmlkZW8uc2VsZWN0ZWQnLCBmdW5jdGlvbiAoZXZlbnQsIGlzUHJlc2VudGF0aW9uKSB7XG4gICAgICAgIGlmICghaXNQcmVzZW50YXRpb24gJiYgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKSlcbiAgICAgICAgICAgIFByZXppLnNldFByZXNlbnRhdGlvblZpc2libGUoZmFsc2UpO1xuICAgIH0pO1xuXG4gICAgJCh3aW5kb3cpLnJlc2l6ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlc2l6ZSgpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG15O1xufShQcmV6aSB8fCB7fSkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByZXppOyIsIm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBfX2JpbmQgPSBmdW5jdGlvbihmbiwgbWUpeyByZXR1cm4gZnVuY3Rpb24oKXsgcmV0dXJuIGZuLmFwcGx5KG1lLCBhcmd1bWVudHMpOyB9OyB9O1xuXG4gICAgdmFyIFByZXppUGxheWVyID0gKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIFByZXppUGxheWVyLkFQSV9WRVJTSU9OID0gMTtcbiAgICAgICAgUHJlemlQbGF5ZXIuQ1VSUkVOVF9TVEVQID0gJ2N1cnJlbnRTdGVwJztcbiAgICAgICAgUHJlemlQbGF5ZXIuQ1VSUkVOVF9BTklNQVRJT05fU1RFUCA9ICdjdXJyZW50QW5pbWF0aW9uU3RlcCc7XG4gICAgICAgIFByZXppUGxheWVyLkNVUlJFTlRfT0JKRUNUID0gJ2N1cnJlbnRPYmplY3QnO1xuICAgICAgICBQcmV6aVBsYXllci5TVEFUVVNfTE9BRElORyA9ICdsb2FkaW5nJztcbiAgICAgICAgUHJlemlQbGF5ZXIuU1RBVFVTX1JFQURZID0gJ3JlYWR5JztcbiAgICAgICAgUHJlemlQbGF5ZXIuU1RBVFVTX0NPTlRFTlRfUkVBRFkgPSAnY29udGVudHJlYWR5JztcbiAgICAgICAgUHJlemlQbGF5ZXIuRVZFTlRfQ1VSUkVOVF9TVEVQID0gXCJjdXJyZW50U3RlcENoYW5nZVwiO1xuICAgICAgICBQcmV6aVBsYXllci5FVkVOVF9DVVJSRU5UX0FOSU1BVElPTl9TVEVQID0gXCJjdXJyZW50QW5pbWF0aW9uU3RlcENoYW5nZVwiO1xuICAgICAgICBQcmV6aVBsYXllci5FVkVOVF9DVVJSRU5UX09CSkVDVCA9IFwiY3VycmVudE9iamVjdENoYW5nZVwiO1xuICAgICAgICBQcmV6aVBsYXllci5FVkVOVF9TVEFUVVMgPSBcInN0YXR1c0NoYW5nZVwiO1xuICAgICAgICBQcmV6aVBsYXllci5FVkVOVF9QTEFZSU5HID0gXCJpc0F1dG9QbGF5aW5nQ2hhbmdlXCI7XG4gICAgICAgIFByZXppUGxheWVyLkVWRU5UX0lTX01PVklORyA9IFwiaXNNb3ZpbmdDaGFuZ2VcIjtcbiAgICAgICAgUHJlemlQbGF5ZXIuZG9tYWluID0gXCJodHRwczovL3ByZXppLmNvbVwiO1xuICAgICAgICBQcmV6aVBsYXllci5wYXRoID0gXCIvcGxheWVyL1wiO1xuICAgICAgICBQcmV6aVBsYXllci5wbGF5ZXJzID0ge307XG4gICAgICAgIFByZXppUGxheWVyLmJpbmRlZF9tZXRob2RzID0gWydjaGFuZ2VzSGFuZGxlciddO1xuXG4gICAgICAgIFByZXppUGxheWVyLmNyZWF0ZU11bHRpcGxlUGxheWVycyA9IGZ1bmN0aW9uKG9wdGlvbkFycmF5KXtcbiAgICAgICAgICAgIGZvcih2YXIgaT0wOyBpPG9wdGlvbkFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9wdGlvblNldCA9IG9wdGlvbkFycmF5W2ldO1xuICAgICAgICAgICAgICAgIG5ldyBQcmV6aVBsYXllcihvcHRpb25TZXQuaWQsIG9wdGlvblNldCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLm1lc3NhZ2VSZWNlaXZlZCA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgICAgIHZhciBtZXNzYWdlLCBpdGVtLCBwbGF5ZXI7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBKU09OLnBhcnNlKGV2ZW50LmRhdGEpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmlkICYmIChwbGF5ZXIgPSBQcmV6aVBsYXllci5wbGF5ZXJzW21lc3NhZ2UuaWRdKSl7XG4gICAgICAgICAgICAgICAgaWYgKHBsYXllci5vcHRpb25zLmRlYnVnID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb25zb2xlICYmIGNvbnNvbGUubG9nKSBjb25zb2xlLmxvZygncmVjZWl2ZWQnLCBtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJjaGFuZ2VzXCIpe1xuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuY2hhbmdlc0hhbmRsZXIobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxwbGF5ZXIuY2FsbGJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0gPSBwbGF5ZXIuY2FsbGJhY2tzW2ldO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSAmJiBtZXNzYWdlLnR5cGUgPT09IGl0ZW0uZXZlbnQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5jYWxsYmFjayhtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBQcmV6aVBsYXllcihpZCwgb3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIHBhcmFtcywgcGFyYW1TdHJpbmcgPSBcIlwiLCBfdGhpcyA9IHRoaXM7XG4gICAgICAgICAgICBpZiAoUHJlemlQbGF5ZXIucGxheWVyc1tpZF0pe1xuICAgICAgICAgICAgICAgIFByZXppUGxheWVyLnBsYXllcnNbaWRdLmRlc3Ryb3koKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvcih2YXIgaT0wOyBpPFByZXppUGxheWVyLmJpbmRlZF9tZXRob2RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1ldGhvZF9uYW1lID0gUHJlemlQbGF5ZXIuYmluZGVkX21ldGhvZHNbaV07XG4gICAgICAgICAgICAgICAgX3RoaXNbbWV0aG9kX25hbWVdID0gX19iaW5kKF90aGlzW21ldGhvZF9uYW1lXSwgX3RoaXMpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICAgICAgICAgIHRoaXMudmFsdWVzID0geydzdGF0dXMnOiBQcmV6aVBsYXllci5TVEFUVVNfTE9BRElOR307XG4gICAgICAgICAgICB0aGlzLnZhbHVlc1tQcmV6aVBsYXllci5DVVJSRU5UX1NURVBdID0gMDtcbiAgICAgICAgICAgIHRoaXMudmFsdWVzW1ByZXppUGxheWVyLkNVUlJFTlRfQU5JTUFUSU9OX1NURVBdID0gMDtcbiAgICAgICAgICAgIHRoaXMudmFsdWVzW1ByZXppUGxheWVyLkNVUlJFTlRfT0JKRUNUXSA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrcyA9IFtdO1xuICAgICAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICAgICAgdGhpcy5lbWJlZFRvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xuICAgICAgICAgICAgaWYgKCF0aGlzLmVtYmVkVG8pIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBcIlRoZSBlbGVtZW50IGlkIGlzIG5vdCBhdmFpbGFibGUuXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmlmcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lmcmFtZScpO1xuICAgICAgICAgICAgcGFyYW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbmFtZTogJ29pZCcsIHZhbHVlOiBvcHRpb25zLnByZXppSWQgfSxcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdleHBsb3JhYmxlJywgdmFsdWU6IG9wdGlvbnMuZXhwbG9yYWJsZSA/IDEgOiAwIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnY29udHJvbHMnLCB2YWx1ZTogb3B0aW9ucy5jb250cm9scyA/IDEgOiAwIH1cbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBmb3IodmFyIGk9MDsgaTxwYXJhbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgcGFyYW0gPSBwYXJhbXNbaV07XG4gICAgICAgICAgICAgICAgcGFyYW1TdHJpbmcgKz0gKGk9PT0wID8gXCI/XCIgOiBcIiZcIikgKyBwYXJhbS5uYW1lICsgXCI9XCIgKyBwYXJhbS52YWx1ZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLmlmcmFtZS5zcmMgPSBQcmV6aVBsYXllci5kb21haW4gKyBQcmV6aVBsYXllci5wYXRoICsgcGFyYW1TdHJpbmc7XG4gICAgICAgICAgICB0aGlzLmlmcmFtZS5mcmFtZUJvcmRlciA9IDA7XG4gICAgICAgICAgICB0aGlzLmlmcmFtZS5zY3JvbGxpbmcgPSBcIm5vXCI7XG4gICAgICAgICAgICB0aGlzLmlmcmFtZS53aWR0aCA9IG9wdGlvbnMud2lkdGggfHwgNjQwO1xuICAgICAgICAgICAgdGhpcy5pZnJhbWUuaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgfHwgNDgwO1xuICAgICAgICAgICAgdGhpcy5lbWJlZFRvLmlubmVySFRNTCA9ICcnO1xuICAgICAgICAgICAgLy8gSklUU0k6IElOIENBU0UgU09NRVRISU5HIEdPRVMgV1JPTkcuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHRoaXMuZW1iZWRUby5hcHBlbmRDaGlsZCh0aGlzLmlmcmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDQVRDSCBFUlJPUlwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSklUU0k6IEluY3JlYXNlIGludGVydmFsIGZyb20gMjAwIHRvIDUwMCwgd2hpY2ggZml4ZXMgcHJlemlcbiAgICAgICAgICAgIC8vIGNyYXNoZXMgZm9yIHVzLlxuICAgICAgICAgICAgdGhpcy5pbml0UG9sbEludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBfdGhpcy5zZW5kTWVzc2FnZSh7J2FjdGlvbic6ICdpbml0J30pO1xuICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIFByZXppUGxheWVyLnBsYXllcnNbaWRdID0gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5jaGFuZ2VzSGFuZGxlciA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHZhciBrZXksIHZhbHVlLCBqLCBpdGVtO1xuICAgICAgICAgICAgaWYgKHRoaXMuaW5pdFBvbGxJbnRlcnZhbCkge1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5pbml0UG9sbEludGVydmFsKTtcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRQb2xsSW50ZXJ2YWwgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoa2V5IGluIG1lc3NhZ2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmRhdGEuaGFzT3duUHJvcGVydHkoa2V5KSl7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gbWVzc2FnZS5kYXRhW2tleV07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmFsdWVzW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChqPTA7IGo8dGhpcy5jYWxsYmFja3MubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0gPSB0aGlzLmNhbGxiYWNrc1tqXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtICYmIGl0ZW0uZXZlbnQgPT09IGtleSArIFwiQ2hhbmdlXCIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uY2FsbGJhY2soe3R5cGU6IGl0ZW0uZXZlbnQsIHZhbHVlOiB2YWx1ZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pbml0UG9sbEludGVydmFsKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLmluaXRQb2xsSW50ZXJ2YWwpO1xuICAgICAgICAgICAgICAgIHRoaXMuaW5pdFBvbGxJbnRlcnZhbCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5lbWJlZFRvLmlubmVySFRNTCA9ICcnO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5zZW5kTWVzc2FnZSA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuZGVidWcgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29uc29sZSAmJiBjb25zb2xlLmxvZykgY29uc29sZS5sb2coJ3NlbnQnLCBtZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1lc3NhZ2UudmVyc2lvbiA9IFByZXppUGxheWVyLkFQSV9WRVJTSU9OO1xuICAgICAgICAgICAgbWVzc2FnZS5pZCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pZnJhbWUuY29udGVudFdpbmRvdy5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeShtZXNzYWdlKSwgJyonKTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUubmV4dFN0ZXAgPSAvKiBuZXh0U3RlcCBpcyBERVBSRUNBVEVEICovXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5mbHlUb05leHRTdGVwID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgJ2FjdGlvbic6ICdwcmVzZW50JyxcbiAgICAgICAgICAgICAgICAnZGF0YSc6IFsnbW92ZVRvTmV4dFN0ZXAnXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLnByZXZpb3VzU3RlcCA9IC8qIHByZXZpb3VzU3RlcCBpcyBERVBSRUNBVEVEICovXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5mbHlUb1ByZXZpb3VzU3RlcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgICdhY3Rpb24nOiAncHJlc2VudCcsXG4gICAgICAgICAgICAgICAgJ2RhdGEnOiBbJ21vdmVUb1ByZXZTdGVwJ11cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS50b1N0ZXAgPSAvKiB0b1N0ZXAgaXMgREVQUkVDQVRFRCAqL1xuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZmx5VG9TdGVwID0gZnVuY3Rpb24oc3RlcCwgYW5pbWF0aW9uX3N0ZXApIHtcbiAgICAgICAgICAgIHZhciBvYmogPSB0aGlzO1xuICAgICAgICAgICAgLy8gY2hlY2sgYW5pbWF0aW9uX3N0ZXBcbiAgICAgICAgICAgIGlmIChhbmltYXRpb25fc3RlcCA+IDAgJiZcbiAgICAgICAgICAgICAgICBvYmoudmFsdWVzLmFuaW1hdGlvbkNvdW50T25TdGVwcyAmJlxuICAgICAgICAgICAgICAgIG9iai52YWx1ZXMuYW5pbWF0aW9uQ291bnRPblN0ZXBzW3N0ZXBdIDw9IGFuaW1hdGlvbl9zdGVwKSB7XG4gICAgICAgICAgICAgICAgYW5pbWF0aW9uX3N0ZXAgPSBvYmoudmFsdWVzLmFuaW1hdGlvbkNvdW50T25TdGVwc1tzdGVwXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGp1bXAgdG8gYW5pbWF0aW9uIHN0ZXBzIGJ5IGNhbGxpbmcgZmx5VG9OZXh0U3RlcCgpXG4gICAgICAgICAgICBmdW5jdGlvbiBkb0FuaW1hdGlvblN0ZXBzKCkge1xuICAgICAgICAgICAgICAgIGlmIChvYmoudmFsdWVzLmlzTW92aW5nID09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChkb0FuaW1hdGlvblN0ZXBzLCAxMDApOyAvLyB3YWl0IHVudGlsIHRoZSBmbGlnaHQgZW5kc1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHdoaWxlIChhbmltYXRpb25fc3RlcC0tID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBvYmouZmx5VG9OZXh0U3RlcCgpOyAvLyBkbyB0aGUgYW5pbWF0aW9uIHN0ZXBzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2V0VGltZW91dChkb0FuaW1hdGlvblN0ZXBzLCAyMDApOyAvLyAyMDBtcyBpcyB0aGUgaW50ZXJuYWwgXCJyZXBvcnRpbmdcIiB0aW1lXG4gICAgICAgICAgICAvLyBqdW1wIHRvIHRoZSBzdGVwXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgJ2FjdGlvbic6ICdwcmVzZW50JyxcbiAgICAgICAgICAgICAgICAnZGF0YSc6IFsnbW92ZVRvU3RlcCcsIHN0ZXBdXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUudG9PYmplY3QgPSAvKiB0b09iamVjdCBpcyBERVBSRUNBVEVEICovXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5mbHlUb09iamVjdCA9IGZ1bmN0aW9uKG9iamVjdElkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgJ2FjdGlvbic6ICdwcmVzZW50JyxcbiAgICAgICAgICAgICAgICAnZGF0YSc6IFsnbW92ZVRvT2JqZWN0Jywgb2JqZWN0SWRdXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGRlZmF1bHREZWxheSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgICdhY3Rpb24nOiAncHJlc2VudCcsXG4gICAgICAgICAgICAgICAgJ2RhdGEnOiBbJ3N0YXJ0QXV0b1BsYXknLCBkZWZhdWx0RGVsYXldXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgICdhY3Rpb24nOiAncHJlc2VudCcsXG4gICAgICAgICAgICAgICAgJ2RhdGEnOiBbJ3N0b3BBdXRvUGxheSddXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbihkZWZhdWx0RGVsYXkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAnYWN0aW9uJzogJ3ByZXNlbnQnLFxuICAgICAgICAgICAgICAgICdkYXRhJzogWydwYXVzZUF1dG9QbGF5JywgZGVmYXVsdERlbGF5XVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmdldEN1cnJlbnRTdGVwID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXMuY3VycmVudFN0ZXA7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmdldEN1cnJlbnRBbmltYXRpb25TdGVwID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXMuY3VycmVudEFuaW1hdGlvblN0ZXA7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmdldEN1cnJlbnRPYmplY3QgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlcy5jdXJyZW50T2JqZWN0O1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5nZXRTdGF0dXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlcy5zdGF0dXM7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmlzUGxheWluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzLmlzQXV0b1BsYXlpbmc7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmdldFN0ZXBDb3VudCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzLnN0ZXBDb3VudDtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZ2V0QW5pbWF0aW9uQ291bnRPblN0ZXBzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXMuYW5pbWF0aW9uQ291bnRPblN0ZXBzO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5nZXRUaXRsZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzLnRpdGxlO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5zZXREaW1lbnNpb25zID0gZnVuY3Rpb24oZGltcykge1xuICAgICAgICAgICAgZm9yICh2YXIgcGFyYW1ldGVyIGluIGRpbXMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlmcmFtZVtwYXJhbWV0ZXJdID0gZGltc1twYXJhbWV0ZXJdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmdldERpbWVuc2lvbnMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgd2lkdGg6IHBhcnNlSW50KHRoaXMuaWZyYW1lLndpZHRoLCAxMCksXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBwYXJzZUludCh0aGlzLmlmcmFtZS5oZWlnaHQsIDEwKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24oZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrcy5wdXNoKHtcbiAgICAgICAgICAgICAgICBldmVudDogZXZlbnQsXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24oZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgaiwgaXRlbTtcbiAgICAgICAgICAgIGlmIChldmVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jYWxsYmFja3MgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGogPSB0aGlzLmNhbGxiYWNrcy5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAoai0tKSB7XG4gICAgICAgICAgICAgICAgaXRlbSA9IHRoaXMuY2FsbGJhY2tzW2pdO1xuICAgICAgICAgICAgICAgIGlmIChpdGVtICYmIGl0ZW0uZXZlbnQgPT09IGV2ZW50ICYmIChjYWxsYmFjayA9PT0gdW5kZWZpbmVkIHx8IGl0ZW0uY2FsbGJhY2sgPT09IGNhbGxiYWNrKSl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tzLnNwbGljZShqLCAxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIFByZXppUGxheWVyLm1lc3NhZ2VSZWNlaXZlZCwgZmFsc2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2luZG93LmF0dGFjaEV2ZW50KCdvbm1lc3NhZ2UnLCBQcmV6aVBsYXllci5tZXNzYWdlUmVjZWl2ZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFByZXppUGxheWVyO1xuXG4gICAgfSkoKTtcblxuICAgIHJldHVybiBQcmV6aVBsYXllcjtcbn0pKCk7XG4iLCJ2YXIgUlRDQnJvd3NlclR5cGUgPSB7XG4gICAgUlRDX0JST1dTRVJfQ0hST01FOiBcInJ0Y19icm93c2VyLmNocm9tZVwiLFxuXG4gICAgUlRDX0JST1dTRVJfRklSRUZPWDogXCJydGNfYnJvd3Nlci5maXJlZm94XCJcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUlRDQnJvd3NlclR5cGU7IiwidmFyIFN0cmVhbUV2ZW50VHlwZXMgPSB7XG4gICAgRVZFTlRfVFlQRV9MT0NBTF9DUkVBVEVEOiBcInN0cmVhbS5sb2NhbF9jcmVhdGVkXCIsXG5cbiAgICBFVkVOVF9UWVBFX0xPQ0FMX0VOREVEOiBcInN0cmVhbS5sb2NhbF9lbmRlZFwiLFxuXG4gICAgRVZFTlRfVFlQRV9SRU1PVEVfQ1JFQVRFRDogXCJzdHJlYW0ucmVtb3RlX2NyZWF0ZWRcIixcblxuICAgIEVWRU5UX1RZUEVfUkVNT1RFX0VOREVEOiBcInN0cmVhbS5yZW1vdGVfZW5kZWRcIlxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdHJlYW1FdmVudFR5cGVzOyJdfQ==
