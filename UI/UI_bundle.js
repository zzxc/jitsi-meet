!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.UIActivator=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var ContactList = require("./ContactList.js");
var Chat = require("./chat/Chat.js");

var BottomToolbar = (function (my) {

    var buttonHandlers = {
        "bottomtoolbar_button_chat": function()
        {
            return BottomToolbar.toggleChat();
        },
        "bottomtoolbar_button_contact": function () {
            return BottomToolbar.toggleContactList();
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


    $(document).bind("remotevideo.resized", function (event, width, height) {
        var bottom = (height - $('#bottomToolbar').outerHeight())/2 + 18;

        $('#bottomToolbar').css({bottom: bottom + 'px'});
    });

    return my;
}(BottomToolbar || {}));

module.exports = BottomToolbar;

},{"./ContactList.js":2,"./chat/Chat.js":10}],2:[function(require,module,exports){
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

module.exports = ContactList;

},{"./VideoLayout.js":7}],3:[function(require,module,exports){
var BottomToolbar = require("./BottomToolbar");
var Prezi = require("./prezi/prezi");
var Etherpad = require("./etherpad/Etherpad");

var Toolbar = (function (my) {
    var INITIAL_TOOLBAR_TIMEOUT = 20000;
    var TOOLBAR_TIMEOUT = INITIAL_TOOLBAR_TIMEOUT;

    var toolbarTimeout = null;

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

},{"./BottomToolbar":1,"./etherpad/Etherpad":12,"./prezi/prezi":15}],4:[function(require,module,exports){
var UIService = require("./UIService");
var VideoLayout = require("./VideoLayout.js");
var AudioLevels = require("./audiolevels/AudioLevels.js");
var Prezi = require("./prezi/Prezi.js");
var Etherpad = require("./etherpad/Etherpad.js");
var Chat = require("./chat/Chat.js");
var StreamEventTypes = require("../service/RTC/StreamEventTypes.js");
var Toolbar = require("./toolbar");
var BottomToolbar = require("./BottomToolbar");

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
        // By default we use camera
        getVideoSize = VideoLayout.getCameraVideoSize;
        getVideoPosition = VideoLayout.getCameraVideoPosition;
        $('body').popover({ selector: '[data-toggle=popover]',
            trigger: 'click hover'});
        VideoLayout.resizeLargeVideoContainer();
        $("#videospace").mousemove(function () {
            return Toolbar.showToolbar();
        });
        registerListeners();
        bindEvents();
        setupAudioLevels();
        setupVideoLayoutEvents();
        setupPrezi();
        setupEtherpad();
        setupToolbars();
        setupChat()
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


    return UIActivatorProto;
}();

module.exports = UIActivator;


},{"../service/RTC/StreamEventTypes.js":18,"./BottomToolbar":1,"./UIService":5,"./VideoLayout.js":7,"./audiolevels/AudioLevels.js":8,"./chat/Chat.js":10,"./etherpad/Etherpad.js":12,"./prezi/Prezi.js":13,"./toolbar":16}],5:[function(require,module,exports){
var AudioLevels = require("./audiolevels/AudioLevels.js");
var Etherpad = require("./etherpad/Etherpad.js");
var VideoLayout = require("./VideoLayout.js");
var Toolbar = require("./Toolbar.js");
var ContactList = require("./ContactList");

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

    UIServiceProto.prototype.onMucJoined = function (jid, info, noMembers) {
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

    return UIServiceProto;
}();
module.exports = UIService;
},{"./ContactList":2,"./Toolbar.js":3,"./VideoLayout.js":7,"./audiolevels/AudioLevels.js":8,"./etherpad/Etherpad.js":12}],6:[function(require,module,exports){

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
},{}],7:[function(require,module,exports){
var dep =
{
    "RTCBrowserType": function(){ return require("../service/RTC/RTCBrowserType.js")},
    "UIActivator": function(){ return require("./UIActivator.js")},
    "Chat": function(){ return require("./chat/Chat")},
    "UIUtil": function(){ return require("./UIUtil.js")},
    "ContactList": function(){ return require("./ContactList")},
    "Toolbar": function(){ return require("./Toolbar")}
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
                attachMediaStream(sel, stream);

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

    return my;
}(VideoLayout || {}));

module.exports = VideoLayout;

},{"../service/RTC/RTCBrowserType.js":17,"./ContactList":2,"./Toolbar":3,"./UIActivator.js":4,"./UIUtil.js":6,"./chat/Chat":10}],8:[function(require,module,exports){
var VideoLayout = require("../VideoLayout");
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

},{"../VideoLayout":7,"./CanvasUtil.js":9}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
/* global $, Util, connection, nickname:true, getVideoSize, getVideoPosition, showToolbar, processReplacements */
var Replacement = require("./Replacement.js");
var dep = {
    "VideoLayout": function(){ return require("../VideoLayout")},
    "Toolbar": function(){return require("../Toolbar")}
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

},{"../Toolbar":3,"../VideoLayout":7,"./Replacement.js":11}],11:[function(require,module,exports){

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




},{}],12:[function(require,module,exports){
/* global $, config, Prezi, Util, connection, setLargeVideoVisible, dockToolbar */
var Prezi = require("../prezi/Prezi.js");
var UIUtil = require("../UIUtil.js");

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
},{"../UIUtil.js":6,"../prezi/Prezi.js":13}],13:[function(require,module,exports){
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
},{"../UIUtil.js":6,"./PreziPlayer.js":14}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
module.exports=require(13)
},{"../UIUtil.js":6,"./PreziPlayer.js":14}],16:[function(require,module,exports){
module.exports=require(3)
},{"./BottomToolbar":1,"./etherpad/Etherpad":12,"./prezi/prezi":15}],17:[function(require,module,exports){
var RTCBrowserType = {
    RTC_BROWSER_CHROME: "rtc_browser.chrome",

    RTC_BROWSER_FIREFOX: "rtc_browser.firefox"
};

module.exports = RTCBrowserType;
},{}],18:[function(require,module,exports){
var StreamEventTypes = {
    EVENT_TYPE_LOCAL_CREATED: "stream.local_created",

    EVENT_TYPE_LOCAL_ENDED: "stream.local_ended",

    EVENT_TYPE_REMOTE_CREATED: "stream.remote_created",

    EVENT_TYPE_REMOTE_ENDED: "stream.remote_ended"
};

module.exports = StreamEventTypes;
},{}]},{},[4])(4)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9Cb3R0b21Ub29sYmFyLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvQ29udGFjdExpc3QuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9Ub29sYmFyLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvVUlBY3RpdmF0b3IuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9VSVNlcnZpY2UuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9VSVV0aWwuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9WaWRlb0xheW91dC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL2F1ZGlvbGV2ZWxzL0F1ZGlvTGV2ZWxzLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvYXVkaW9sZXZlbHMvQ2FudmFzVXRpbC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL2NoYXQvQ2hhdC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL2NoYXQvUmVwbGFjZW1lbnQuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9ldGhlcnBhZC9FdGhlcnBhZC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL3ByZXppL1ByZXppLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvcHJlemkvUHJlemlQbGF5ZXIuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9zZXJ2aWNlL1JUQy9SVENCcm93c2VyVHlwZS5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L3NlcnZpY2UvUlRDL1N0cmVhbUV2ZW50VHlwZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbmxEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7O0FDcFNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIENvbnRhY3RMaXN0ID0gcmVxdWlyZShcIi4vQ29udGFjdExpc3QuanNcIik7XG52YXIgQ2hhdCA9IHJlcXVpcmUoXCIuL2NoYXQvQ2hhdC5qc1wiKTtcblxudmFyIEJvdHRvbVRvb2xiYXIgPSAoZnVuY3Rpb24gKG15KSB7XG5cbiAgICB2YXIgYnV0dG9uSGFuZGxlcnMgPSB7XG4gICAgICAgIFwiYm90dG9tdG9vbGJhcl9idXR0b25fY2hhdFwiOiBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiBCb3R0b21Ub29sYmFyLnRvZ2dsZUNoYXQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJib3R0b210b29sYmFyX2J1dHRvbl9jb250YWN0XCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBCb3R0b21Ub29sYmFyLnRvZ2dsZUNvbnRhY3RMaXN0KCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgbXkuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZm9yKHZhciBrIGluIGJ1dHRvbkhhbmRsZXJzKVxuICAgICAgICAgICAgJChcIiNcIiArIGspLmNsaWNrKGJ1dHRvbkhhbmRsZXJzW2tdKTtcbiAgICB9XG4gICAgbXkudG9nZ2xlQ2hhdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoQ29udGFjdExpc3QuaXNWaXNpYmxlKCkpIHtcbiAgICAgICAgICAgIGJ1dHRvbkNsaWNrKFwiI2NvbnRhY3RMaXN0QnV0dG9uXCIsIFwiYWN0aXZlXCIpO1xuICAgICAgICAgICAgQ29udGFjdExpc3QudG9nZ2xlQ29udGFjdExpc3QoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGJ1dHRvbkNsaWNrKFwiI2NoYXRCb3R0b21CdXR0b25cIiwgXCJhY3RpdmVcIik7XG5cbiAgICAgICAgQ2hhdC50b2dnbGVDaGF0KCk7XG4gICAgfTtcblxuICAgIG15LnRvZ2dsZUNvbnRhY3RMaXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChDaGF0LmlzVmlzaWJsZSgpKSB7XG4gICAgICAgICAgICBidXR0b25DbGljayhcIiNjaGF0Qm90dG9tQnV0dG9uXCIsIFwiYWN0aXZlXCIpO1xuICAgICAgICAgICAgQ2hhdC50b2dnbGVDaGF0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBidXR0b25DbGljayhcIiNjb250YWN0TGlzdEJ1dHRvblwiLCBcImFjdGl2ZVwiKTtcblxuICAgICAgICBDb250YWN0TGlzdC50b2dnbGVDb250YWN0TGlzdCgpO1xuICAgIH07XG5cblxuICAgICQoZG9jdW1lbnQpLmJpbmQoXCJyZW1vdGV2aWRlby5yZXNpemVkXCIsIGZ1bmN0aW9uIChldmVudCwgd2lkdGgsIGhlaWdodCkge1xuICAgICAgICB2YXIgYm90dG9tID0gKGhlaWdodCAtICQoJyNib3R0b21Ub29sYmFyJykub3V0ZXJIZWlnaHQoKSkvMiArIDE4O1xuXG4gICAgICAgICQoJyNib3R0b21Ub29sYmFyJykuY3NzKHtib3R0b206IGJvdHRvbSArICdweCd9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBteTtcbn0oQm90dG9tVG9vbGJhciB8fCB7fSkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJvdHRvbVRvb2xiYXI7XG4iLCJ2YXIgVmlkZW9MYXlvdXQgPSByZXF1aXJlKFwiLi9WaWRlb0xheW91dC5qc1wiKTtcblxuLyoqXG4gKiBDb250YWN0IGxpc3QuXG4gKi9cbnZhciBDb250YWN0TGlzdCA9IChmdW5jdGlvbiAobXkpIHtcbiAgICAvKipcbiAgICAgKiBJbmRpY2F0ZXMgaWYgdGhlIGNoYXQgaXMgY3VycmVudGx5IHZpc2libGUuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIDx0dD50cnVlPC90dD4gaWYgdGhlIGNoYXQgaXMgY3VycmVudGx5IHZpc2libGUsIDx0dD5mYWxzZTwvdHQ+IC1cbiAgICAgKiBvdGhlcndpc2VcbiAgICAgKi9cbiAgICBteS5pc1Zpc2libGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkKCcjY29udGFjdGxpc3QnKS5pcyhcIjp2aXNpYmxlXCIpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBZGRzIGEgY29udGFjdCBmb3IgdGhlIGdpdmVuIHBlZXJKaWQgaWYgc3VjaCBkb2Vzbid0IHlldCBleGlzdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBwZWVySmlkIHRoZSBwZWVySmlkIGNvcnJlc3BvbmRpbmcgdG8gdGhlIGNvbnRhY3RcbiAgICAgKi9cbiAgICBteS5lbnN1cmVBZGRDb250YWN0ID0gZnVuY3Rpb24ocGVlckppZCkge1xuICAgICAgICB2YXIgcmVzb3VyY2VKaWQgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChwZWVySmlkKTtcblxuICAgICAgICB2YXIgY29udGFjdCA9ICQoJyNjb250YWN0bGlzdD51bD5saVtpZD1cIicgKyByZXNvdXJjZUppZCArICdcIl0nKTtcblxuICAgICAgICBpZiAoIWNvbnRhY3QgfHwgY29udGFjdC5sZW5ndGggPD0gMClcbiAgICAgICAgICAgIENvbnRhY3RMaXN0LmFkZENvbnRhY3QocGVlckppZCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYSBjb250YWN0IGZvciB0aGUgZ2l2ZW4gcGVlciBqaWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGVlckppZCB0aGUgamlkIG9mIHRoZSBjb250YWN0IHRvIGFkZFxuICAgICAqL1xuICAgIG15LmFkZENvbnRhY3QgPSBmdW5jdGlvbihwZWVySmlkKSB7XG4gICAgICAgIHZhciByZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHBlZXJKaWQpO1xuXG4gICAgICAgIHZhciBjb250YWN0bGlzdCA9ICQoJyNjb250YWN0bGlzdD51bCcpO1xuXG4gICAgICAgIHZhciBuZXdDb250YWN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcbiAgICAgICAgbmV3Q29udGFjdC5pZCA9IHJlc291cmNlSmlkO1xuXG4gICAgICAgIG5ld0NvbnRhY3QuYXBwZW5kQ2hpbGQoY3JlYXRlQXZhdGFyKCkpO1xuICAgICAgICBuZXdDb250YWN0LmFwcGVuZENoaWxkKGNyZWF0ZURpc3BsYXlOYW1lUGFyYWdyYXBoKFwiUGFydGljaXBhbnRcIikpO1xuXG4gICAgICAgIHZhciBjbEVsZW1lbnQgPSBjb250YWN0bGlzdC5nZXQoMCk7XG5cbiAgICAgICAgaWYgKHJlc291cmNlSmlkID09PSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChjb25uZWN0aW9uLmVtdWMubXlyb29tamlkKVxuICAgICAgICAgICAgJiYgJCgnI2NvbnRhY3RsaXN0PnVsIC50aXRsZScpWzBdLm5leHRTaWJsaW5nLm5leHRTaWJsaW5nKVxuICAgICAgICB7XG4gICAgICAgICAgICBjbEVsZW1lbnQuaW5zZXJ0QmVmb3JlKG5ld0NvbnRhY3QsXG4gICAgICAgICAgICAgICAgICAgICQoJyNjb250YWN0bGlzdD51bCAudGl0bGUnKVswXS5uZXh0U2libGluZy5uZXh0U2libGluZyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjbEVsZW1lbnQuYXBwZW5kQ2hpbGQobmV3Q29udGFjdCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBhIGNvbnRhY3QgZm9yIHRoZSBnaXZlbiBwZWVyIGppZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBwZWVySmlkIHRoZSBwZWVySmlkIGNvcnJlc3BvbmRpbmcgdG8gdGhlIGNvbnRhY3QgdG8gcmVtb3ZlXG4gICAgICovXG4gICAgbXkucmVtb3ZlQ29udGFjdCA9IGZ1bmN0aW9uKHBlZXJKaWQpIHtcbiAgICAgICAgdmFyIHJlc291cmNlSmlkID0gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQocGVlckppZCk7XG5cbiAgICAgICAgdmFyIGNvbnRhY3QgPSAkKCcjY29udGFjdGxpc3Q+dWw+bGlbaWQ9XCInICsgcmVzb3VyY2VKaWQgKyAnXCJdJyk7XG5cbiAgICAgICAgaWYgKGNvbnRhY3QgJiYgY29udGFjdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YXIgY29udGFjdGxpc3QgPSAkKCcjY29udGFjdGxpc3Q+dWwnKTtcblxuICAgICAgICAgICAgY29udGFjdGxpc3QuZ2V0KDApLnJlbW92ZUNoaWxkKGNvbnRhY3QuZ2V0KDApKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBPcGVucyAvIGNsb3NlcyB0aGUgY29udGFjdCBsaXN0IGFyZWEuXG4gICAgICovXG4gICAgbXkudG9nZ2xlQ29udGFjdExpc3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjb250YWN0bGlzdCA9ICQoJyNjb250YWN0bGlzdCcpO1xuXG4gICAgICAgIHZhciBjaGF0U2l6ZSA9IChDb250YWN0TGlzdC5pc1Zpc2libGUoKSkgPyBbMCwgMF0gOiBDb250YWN0TGlzdC5nZXRDb250YWN0TGlzdFNpemUoKTtcbiAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplVmlkZW9TcGFjZShjb250YWN0bGlzdCwgY2hhdFNpemUsIENvbnRhY3RMaXN0LmlzVmlzaWJsZSgpKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgc2l6ZSBvZiB0aGUgY2hhdC5cbiAgICAgKi9cbiAgICBteS5nZXRDb250YWN0TGlzdFNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBhdmFpbGFibGVIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIHZhciBhdmFpbGFibGVXaWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoO1xuXG4gICAgICAgIHZhciBjaGF0V2lkdGggPSAyMDA7XG4gICAgICAgIGlmIChhdmFpbGFibGVXaWR0aCAqIDAuMiA8IDIwMClcbiAgICAgICAgICAgIGNoYXRXaWR0aCA9IGF2YWlsYWJsZVdpZHRoICogMC4yO1xuXG4gICAgICAgIHJldHVybiBbY2hhdFdpZHRoLCBhdmFpbGFibGVIZWlnaHRdO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIHRoZSBhdmF0YXIgZWxlbWVudC5cbiAgICAgKiBcbiAgICAgKiBAcmV0dXJuIHRoZSBuZXdseSBjcmVhdGVkIGF2YXRhciBlbGVtZW50XG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlQXZhdGFyKCkge1xuICAgICAgICB2YXIgYXZhdGFyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaScpO1xuICAgICAgICBhdmF0YXIuY2xhc3NOYW1lID0gXCJpY29uLWF2YXRhciBhdmF0YXJcIjtcblxuICAgICAgICByZXR1cm4gYXZhdGFyO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIHRoZSBkaXNwbGF5IG5hbWUgcGFyYWdyYXBoLlxuICAgICAqXG4gICAgICogQHBhcmFtIGRpc3BsYXlOYW1lIHRoZSBkaXNwbGF5IG5hbWUgdG8gc2V0XG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlRGlzcGxheU5hbWVQYXJhZ3JhcGgoZGlzcGxheU5hbWUpIHtcbiAgICAgICAgdmFyIHAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG4gICAgICAgIHAuaW5uZXJIVE1MID0gZGlzcGxheU5hbWU7XG5cbiAgICAgICAgcmV0dXJuIHA7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEluZGljYXRlcyB0aGF0IHRoZSBkaXNwbGF5IG5hbWUgaGFzIGNoYW5nZWQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCggICAnZGlzcGxheW5hbWVjaGFuZ2VkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChldmVudCwgcGVlckppZCwgZGlzcGxheU5hbWUpIHtcbiAgICAgICAgaWYgKHBlZXJKaWQgPT09ICdsb2NhbFZpZGVvQ29udGFpbmVyJylcbiAgICAgICAgICAgIHBlZXJKaWQgPSBjb25uZWN0aW9uLmVtdWMubXlyb29tamlkO1xuXG4gICAgICAgIHZhciByZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHBlZXJKaWQpO1xuXG4gICAgICAgIHZhciBjb250YWN0TmFtZSA9ICQoJyNjb250YWN0bGlzdCAjJyArIHJlc291cmNlSmlkICsgJz5wJyk7XG5cbiAgICAgICAgaWYgKGNvbnRhY3ROYW1lICYmIGRpc3BsYXlOYW1lICYmIGRpc3BsYXlOYW1lLmxlbmd0aCA+IDApXG4gICAgICAgICAgICBjb250YWN0TmFtZS5odG1sKGRpc3BsYXlOYW1lKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBteTtcbn0oQ29udGFjdExpc3QgfHwge30pKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb250YWN0TGlzdDtcbiIsInZhciBCb3R0b21Ub29sYmFyID0gcmVxdWlyZShcIi4vQm90dG9tVG9vbGJhclwiKTtcbnZhciBQcmV6aSA9IHJlcXVpcmUoXCIuL3ByZXppL3ByZXppXCIpO1xudmFyIEV0aGVycGFkID0gcmVxdWlyZShcIi4vZXRoZXJwYWQvRXRoZXJwYWRcIik7XG5cbnZhciBUb29sYmFyID0gKGZ1bmN0aW9uIChteSkge1xuICAgIHZhciBJTklUSUFMX1RPT0xCQVJfVElNRU9VVCA9IDIwMDAwO1xuICAgIHZhciBUT09MQkFSX1RJTUVPVVQgPSBJTklUSUFMX1RPT0xCQVJfVElNRU9VVDtcblxuICAgIHZhciB0b29sYmFyVGltZW91dCA9IG51bGw7XG5cbiAgICB2YXIgYnV0dG9uSGFuZGxlcnMgPSB7XG4gICAgICAgIFwidG9vbGJhcl9idXR0b25fbXV0ZVwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9nZ2xlQXVkaW8oKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9jYW1lcmFcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYnV0dG9uQ2xpY2soXCIjdmlkZW9cIiwgXCJpY29uLWNhbWVyYSBpY29uLWNhbWVyYS1kaXNhYmxlZFwiKTtcbiAgICAgICAgICAgIHJldHVybiB0b2dnbGVWaWRlbygpO1xuICAgICAgICB9LFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX3JlY29yZFwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9nZ2xlUmVjb3JkaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgLFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX3NlY3VyaXR5XCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBUb29sYmFyLm9wZW5Mb2NrRGlhbG9nKCk7XG4gICAgICAgIH0sXG4gICAgICAgIFwidG9vbGJhcl9idXR0b25fbGlua1wiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gVG9vbGJhci5vcGVuTGlua0RpYWxvZygpO1xuICAgICAgICB9LFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX2NoYXRcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIEJvdHRvbVRvb2xiYXIudG9nZ2xlQ2hhdCgpO1xuICAgICAgICB9LFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX3ByZXppXCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBQcmV6aS5vcGVuUHJlemlEaWFsb2coKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9ldGhlcnBhZFwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gRXRoZXJwYWQudG9nZ2xlRXRoZXJwYWQoMCk7XG4gICAgICAgIH0sXG4gICAgICAgIFwidG9vbGJhcl9idXR0b25fZGVza3RvcHNoYXJpbmdcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRvZ2dsZVNjcmVlblNoYXJpbmcoKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9mdWxsU2NyZWVuXCI6IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgYnV0dG9uQ2xpY2soXCIjZnVsbFNjcmVlblwiLCBcImljb24tZnVsbC1zY3JlZW4gaWNvbi1leGl0LWZ1bGwtc2NyZWVuXCIpO1xuICAgICAgICAgICAgcmV0dXJuIFRvb2xiYXIudG9nZ2xlRnVsbFNjcmVlbigpO1xuICAgICAgICB9LFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX3NpcFwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbFNpcEJ1dHRvbkNsaWNrZWQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9oYW5ndXBcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGhhbmd1cCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vc2V0cyBvbmNsaWNrIGhhbmRsZXJzXG4gICAgbXkuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZm9yKHZhciBrIGluIGJ1dHRvbkhhbmRsZXJzKVxuICAgICAgICAgICAgJChcIiNcIiArIGspLmNsaWNrKGJ1dHRvbkhhbmRsZXJzW2tdKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBPcGVucyB0aGUgbG9jayByb29tIGRpYWxvZy5cbiAgICAgKi9cbiAgICBteS5vcGVuTG9ja0RpYWxvZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gT25seSB0aGUgZm9jdXMgaXMgYWJsZSB0byBzZXQgYSBzaGFyZWQga2V5LlxuICAgICAgICBpZiAoZm9jdXMgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChzaGFyZWRLZXkpXG4gICAgICAgICAgICAgICAgJC5wcm9tcHQoXCJUaGlzIGNvbnZlcnNhdGlvbiBpcyBjdXJyZW50bHkgcHJvdGVjdGVkIGJ5XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICsgXCIgYSBzaGFyZWQgc2VjcmV0IGtleS5cIixcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IFwiU2VjcmV0IGtleVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGVyc2lzdGVudDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgJC5wcm9tcHQoXCJUaGlzIGNvbnZlcnNhdGlvbiBpc24ndCBjdXJyZW50bHkgcHJvdGVjdGVkIGJ5XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICsgXCIgYSBzZWNyZXQga2V5LiBPbmx5IHRoZSBvd25lciBvZiB0aGUgY29uZmVyZW5jZVwiXG4gICAgICAgICAgICAgICAgICAgICAgICArIFwiIGNvdWxkIHNldCBhIHNoYXJlZCBrZXkuXCIsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIlNlY3JldCBrZXlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlcnNpc3RlbnQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHNoYXJlZEtleSkge1xuICAgICAgICAgICAgICAgICQucHJvbXB0KFwiQXJlIHlvdSBzdXJlIHlvdSB3b3VsZCBsaWtlIHRvIHJlbW92ZSB5b3VyIHNlY3JldCBrZXk/XCIsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIlJlbW92ZSBzZWNyZXQga2V5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBwZXJzaXN0ZW50OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1dHRvbnM6IHsgXCJSZW1vdmVcIjogdHJ1ZSwgXCJDYW5jZWxcIjogZmFsc2V9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdEJ1dHRvbjogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Ym1pdDogZnVuY3Rpb24gKGUsIHYsIG0sIGYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRTaGFyZWRLZXkoJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NrUm9vbShmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJC5wcm9tcHQoJzxoMj5TZXQgYSBzZWNyZXQga2V5IHRvIGxvY2sgeW91ciByb29tPC9oMj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAnPGlucHV0IGlkPVwibG9ja0tleVwiIHR5cGU9XCJ0ZXh0XCIgcGxhY2Vob2xkZXI9XCJ5b3VyIHNoYXJlZCBrZXlcIiBhdXRvZm9jdXM+JyxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVyc2lzdGVudDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBidXR0b25zOiB7IFwiU2F2ZVwiOiB0cnVlLCBcIkNhbmNlbFwiOiBmYWxzZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0QnV0dG9uOiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgbG9hZGVkOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9ja0tleScpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgc3VibWl0OiBmdW5jdGlvbiAoZSwgdiwgbSwgZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsb2NrS2V5ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2tLZXknKTtcbiAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxvY2tLZXkudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldFNoYXJlZEtleShVdGlsLmVzY2FwZUh0bWwobG9ja0tleS52YWx1ZSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9ja1Jvb20odHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIE9wZW5zIHRoZSBpbnZpdGUgbGluayBkaWFsb2cuXG4gICAgICovXG4gICAgbXkub3BlbkxpbmtEaWFsb2cgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpbnZpdGVMaW5rO1xuICAgICAgICBpZiAocm9vbVVybCA9PSBudWxsKVxuICAgICAgICAgICAgaW52aXRlTGluayA9IFwiWW91ciBjb25mZXJlbmNlIGlzIGN1cnJlbnRseSBiZWluZyBjcmVhdGVkLi4uXCI7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGludml0ZUxpbmsgPSBlbmNvZGVVUkkocm9vbVVybCk7XG5cbiAgICAgICAgJC5wcm9tcHQoJzxpbnB1dCBpZD1cImludml0ZUxpbmtSZWZcIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwiJyArXG4gICAgICAgICAgICAgICAgaW52aXRlTGluayArICdcIiBvbmNsaWNrPVwidGhpcy5zZWxlY3QoKTtcIiByZWFkb25seT4nLFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6IFwiU2hhcmUgdGhpcyBsaW5rIHdpdGggZXZlcnlvbmUgeW91IHdhbnQgdG8gaW52aXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIHBlcnNpc3RlbnQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBidXR0b25zOiB7IFwiSW52aXRlXCI6IHRydWUsIFwiQ2FuY2VsXCI6IGZhbHNlfSxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdEJ1dHRvbjogMSxcbiAgICAgICAgICAgICAgICAgICAgbG9hZGVkOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyb29tVXJsKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpbnZpdGVMaW5rUmVmJykuc2VsZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pxaV9zdGF0ZTBfYnV0dG9uSW52aXRlJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgc3VibWl0OiBmdW5jdGlvbiAoZSwgdiwgbSwgZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocm9vbVVybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnZpdGVQYXJ0aWNpcGFudHMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBJbnZpdGUgcGFydGljaXBhbnRzIHRvIGNvbmZlcmVuY2UuXG4gICAgICovXG4gICAgZnVuY3Rpb24gaW52aXRlUGFydGljaXBhbnRzKCkge1xuICAgICAgICBpZiAocm9vbVVybCA9PSBudWxsKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHZhciBzaGFyZWRLZXlUZXh0ID0gXCJcIjtcbiAgICAgICAgaWYgKHNoYXJlZEtleSAmJiBzaGFyZWRLZXkubGVuZ3RoID4gMClcbiAgICAgICAgICAgIHNoYXJlZEtleVRleHRcbiAgICAgICAgICAgICAgICA9IFwiVGhpcyBjb25mZXJlbmNlIGlzIHBhc3N3b3JkIHByb3RlY3RlZC4gUGxlYXNlIHVzZSB0aGUgXCJcbiAgICAgICAgICAgICAgICAgICAgKyBcImZvbGxvd2luZyBwaW4gd2hlbiBqb2luaW5nOiUwRCUwQSUwRCUwQVwiXG4gICAgICAgICAgICAgICAgICAgICsgc2hhcmVkS2V5ICsgXCIlMEQlMEElMEQlMEFcIjtcblxuICAgICAgICB2YXIgY29uZmVyZW5jZU5hbWUgPSByb29tVXJsLnN1YnN0cmluZyhyb29tVXJsLmxhc3RJbmRleE9mKCcvJykgKyAxKTtcbiAgICAgICAgdmFyIHN1YmplY3QgPSBcIkludml0YXRpb24gdG8gYSBKaXRzaSBNZWV0IChcIiArIGNvbmZlcmVuY2VOYW1lICsgXCIpXCI7XG4gICAgICAgIHZhciBib2R5ID0gXCJIZXkgdGhlcmUsIEklMjdkIGxpa2UgdG8gaW52aXRlIHlvdSB0byBhIEppdHNpIE1lZXRcIiArXG4gICAgICAgICAgICAgICAgICAgIFwiIGNvbmZlcmVuY2UgSSUyN3ZlIGp1c3Qgc2V0IHVwLiUwRCUwQSUwRCUwQVwiICtcbiAgICAgICAgICAgICAgICAgICAgXCJQbGVhc2UgY2xpY2sgb24gdGhlIGZvbGxvd2luZyBsaW5rIGluIG9yZGVyXCIgK1xuICAgICAgICAgICAgICAgICAgICBcIiB0byBqb2luIHRoZSBjb25mZXJlbmNlLiUwRCUwQSUwRCUwQVwiICtcbiAgICAgICAgICAgICAgICAgICAgcm9vbVVybCArXG4gICAgICAgICAgICAgICAgICAgIFwiJTBEJTBBJTBEJTBBXCIgK1xuICAgICAgICAgICAgICAgICAgICBzaGFyZWRLZXlUZXh0ICtcbiAgICAgICAgICAgICAgICAgICAgXCJOb3RlIHRoYXQgSml0c2kgTWVldCBpcyBjdXJyZW50bHkgb25seSBzdXBwb3J0ZWQgYnkgQ2hyb21pdW0sXCIgK1xuICAgICAgICAgICAgICAgICAgICBcIiBHb29nbGUgQ2hyb21lIGFuZCBPcGVyYSwgc28geW91IG5lZWRcIiArXG4gICAgICAgICAgICAgICAgICAgIFwiIHRvIGJlIHVzaW5nIG9uZSBvZiB0aGVzZSBicm93c2Vycy4lMEQlMEElMEQlMEFcIiArXG4gICAgICAgICAgICAgICAgICAgIFwiVGFsayB0byB5b3UgaW4gYSBzZWMhXCI7XG5cbiAgICAgICAgaWYgKHdpbmRvdy5sb2NhbFN0b3JhZ2UuZGlzcGxheW5hbWUpXG4gICAgICAgICAgICBib2R5ICs9IFwiJTBEJTBBJTBEJTBBXCIgKyB3aW5kb3cubG9jYWxTdG9yYWdlLmRpc3BsYXluYW1lO1xuXG4gICAgICAgIHdpbmRvdy5vcGVuKFwibWFpbHRvOj9zdWJqZWN0PVwiICsgc3ViamVjdCArIFwiJmJvZHk9XCIgKyBib2R5LCAnX2JsYW5rJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogT3BlbnMgdGhlIHNldHRpbmdzIGRpYWxvZy5cbiAgICAgKi9cbiAgICBteS5vcGVuU2V0dGluZ3NEaWFsb2cgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICQucHJvbXB0KCc8aDI+Q29uZmlndXJlIHlvdXIgY29uZmVyZW5jZTwvaDI+JyArXG4gICAgICAgICAgICAnPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGlkPVwiaW5pdE11dGVkXCI+IFBhcnRpY2lwYW50cyBqb2luIG11dGVkPGJyLz4nICtcbiAgICAgICAgICAgICc8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgaWQ9XCJyZXF1aXJlTmlja25hbWVzXCI+IFJlcXVpcmUgbmlja25hbWVzPGJyLz48YnIvPicgK1xuICAgICAgICAgICAgJ1NldCBhIHNlY3JldCBrZXkgdG8gbG9jayB5b3VyIHJvb206IDxpbnB1dCBpZD1cImxvY2tLZXlcIiB0eXBlPVwidGV4dFwiIHBsYWNlaG9sZGVyPVwieW91ciBzaGFyZWQga2V5XCIgYXV0b2ZvY3VzPicsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcGVyc2lzdGVudDogZmFsc2UsXG4gICAgICAgICAgICAgICAgYnV0dG9uczogeyBcIlNhdmVcIjogdHJ1ZSwgXCJDYW5jZWxcIjogZmFsc2V9LFxuICAgICAgICAgICAgICAgIGRlZmF1bHRCdXR0b246IDEsXG4gICAgICAgICAgICAgICAgbG9hZGVkOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2tLZXknKS5mb2N1cygpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc3VibWl0OiBmdW5jdGlvbiAoZSwgdiwgbSwgZikge1xuICAgICAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCQoJyNpbml0TXV0ZWQnKS5pcyhcIjpjaGVja2VkXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaXQgaXMgY2hlY2tlZFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCQoJyNyZXF1aXJlTmlja25hbWVzJykuaXMoXCI6Y2hlY2tlZFwiKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGl0IGlzIGNoZWNrZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbG9ja0tleSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsb2NrS2V5Jyk7XG4gICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobG9ja0tleS52YWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRTaGFyZWRLZXkobG9ja0tleS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9ja1Jvb20odHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGVzIHRoZSBhcHBsaWNhdGlvbiBpbiBhbmQgb3V0IG9mIGZ1bGwgc2NyZWVuIG1vZGVcbiAgICAgKiAoYS5rLmEuIHByZXNlbnRhdGlvbiBtb2RlIGluIENocm9tZSkuXG4gICAgICovXG4gICAgbXkudG9nZ2xlRnVsbFNjcmVlbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZnNFbGVtZW50ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuXG4gICAgICAgIGlmICghZG9jdW1lbnQubW96RnVsbFNjcmVlbiAmJiAhZG9jdW1lbnQud2Via2l0SXNGdWxsU2NyZWVuKSB7XG4gICAgICAgICAgICAvL0VudGVyIEZ1bGwgU2NyZWVuXG4gICAgICAgICAgICBpZiAoZnNFbGVtZW50Lm1velJlcXVlc3RGdWxsU2NyZWVuKSB7XG4gICAgICAgICAgICAgICAgZnNFbGVtZW50Lm1velJlcXVlc3RGdWxsU2NyZWVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBmc0VsZW1lbnQud2Via2l0UmVxdWVzdEZ1bGxTY3JlZW4oRWxlbWVudC5BTExPV19LRVlCT0FSRF9JTlBVVCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvL0V4aXQgRnVsbCBTY3JlZW5cbiAgICAgICAgICAgIGlmIChkb2N1bWVudC5tb3pDYW5jZWxGdWxsU2NyZWVuKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQubW96Q2FuY2VsRnVsbFNjcmVlbigpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC53ZWJraXRDYW5jZWxGdWxsU2NyZWVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2hvd3MgdGhlIG1haW4gdG9vbGJhci5cbiAgICAgKi9cbiAgICBteS5zaG93VG9vbGJhciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoISQoJyNoZWFkZXInKS5pcygnOnZpc2libGUnKSkge1xuICAgICAgICAgICAgJCgnI2hlYWRlcicpLnNob3coXCJzbGlkZVwiLCB7IGRpcmVjdGlvbjogXCJ1cFwiLCBkdXJhdGlvbjogMzAwfSk7XG4gICAgICAgICAgICAkKCcjc3ViamVjdCcpLmFuaW1hdGUoe3RvcDogXCIrPTQwXCJ9LCAzMDApO1xuXG4gICAgICAgICAgICBpZiAodG9vbGJhclRpbWVvdXQpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodG9vbGJhclRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIHRvb2xiYXJUaW1lb3V0ID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRvb2xiYXJUaW1lb3V0ID0gc2V0VGltZW91dChoaWRlVG9vbGJhciwgVE9PTEJBUl9USU1FT1VUKTtcbiAgICAgICAgICAgIFRPT0xCQVJfVElNRU9VVCA9IDQwMDA7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZm9jdXMgIT0gbnVsbClcbiAgICAgICAge1xuLy8gICAgICAgICAgICBUT0RPOiBFbmFibGUgc2V0dGluZ3MgZnVuY3Rpb25hbGl0eS4gTmVlZCB0byB1bmNvbW1lbnQgdGhlIHNldHRpbmdzIGJ1dHRvbiBpbiBpbmRleC5odG1sLlxuLy8gICAgICAgICAgICAkKCcjc2V0dGluZ3NCdXR0b24nKS5jc3Moe3Zpc2liaWxpdHk6XCJ2aXNpYmxlXCJ9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNob3cvaGlkZSBkZXNrdG9wIHNoYXJpbmcgYnV0dG9uXG4gICAgICAgIHNob3dEZXNrdG9wU2hhcmluZ0J1dHRvbigpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBEb2Nrcy91bmRvY2tzIHRoZSB0b29sYmFyLlxuICAgICAqXG4gICAgICogQHBhcmFtIGlzRG9jayBpbmRpY2F0ZXMgd2hhdCBvcGVyYXRpb24gdG8gcGVyZm9ybVxuICAgICAqL1xuICAgIG15LmRvY2tUb29sYmFyID0gZnVuY3Rpb24oaXNEb2NrKSB7XG4gICAgICAgIGlmIChpc0RvY2spIHtcbiAgICAgICAgICAgIC8vIEZpcnN0IG1ha2Ugc3VyZSB0aGUgdG9vbGJhciBpcyBzaG93bi5cbiAgICAgICAgICAgIGlmICghJCgnI2hlYWRlcicpLmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICAgICAgICAgICAgVG9vbGJhci5zaG93VG9vbGJhcigpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUaGVuIGNsZWFyIHRoZSB0aW1lIG91dCwgdG8gZG9jayB0aGUgdG9vbGJhci5cbiAgICAgICAgICAgIGlmICh0b29sYmFyVGltZW91dCkge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0b29sYmFyVGltZW91dCk7XG4gICAgICAgICAgICAgICAgdG9vbGJhclRpbWVvdXQgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKCEkKCcjaGVhZGVyJykuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICAgICBUb29sYmFyLnNob3dUb29sYmFyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0b29sYmFyVGltZW91dCA9IHNldFRpbWVvdXQoaGlkZVRvb2xiYXIsIFRPT0xCQVJfVElNRU9VVCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgbG9jayBidXR0b24gc3RhdGUuXG4gICAgICovXG4gICAgbXkudXBkYXRlTG9ja0J1dHRvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBidXR0b25DbGljayhcIiNsb2NrSWNvblwiLCBcImljb24tc2VjdXJpdHkgaWNvbi1zZWN1cml0eS1sb2NrZWRcIik7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEhpZGVzIHRoZSB0b29sYmFyLlxuICAgICAqL1xuICAgIHZhciBoaWRlVG9vbGJhciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGlzVG9vbGJhckhvdmVyID0gZmFsc2U7XG4gICAgICAgICQoJyNoZWFkZXInKS5maW5kKCcqJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgaWQgPSAkKHRoaXMpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBpZiAoJChcIiNcIiArIGlkICsgXCI6aG92ZXJcIikubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGlzVG9vbGJhckhvdmVyID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2xlYXJUaW1lb3V0KHRvb2xiYXJUaW1lb3V0KTtcbiAgICAgICAgdG9vbGJhclRpbWVvdXQgPSBudWxsO1xuXG4gICAgICAgIGlmICghaXNUb29sYmFySG92ZXIpIHtcbiAgICAgICAgICAgICQoJyNoZWFkZXInKS5oaWRlKFwic2xpZGVcIiwgeyBkaXJlY3Rpb246IFwidXBcIiwgZHVyYXRpb246IDMwMH0pO1xuICAgICAgICAgICAgJCgnI3N1YmplY3QnKS5hbmltYXRlKHt0b3A6IFwiLT00MFwifSwgMzAwKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRvb2xiYXJUaW1lb3V0ID0gc2V0VGltZW91dChoaWRlVG9vbGJhciwgVE9PTEJBUl9USU1FT1VUKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBTaG93cyBvciBoaWRlcyB0aGUgJ3JlY29yZGluZycgYnV0dG9uLlxuICAgIG15LnNob3dSZWNvcmRpbmdCdXR0b24gPSBmdW5jdGlvbiAoc2hvdykge1xuICAgICAgICBpZiAoIWNvbmZpZy5lbmFibGVSZWNvcmRpbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzaG93KSB7XG4gICAgICAgICAgICAkKCcjcmVjb3JkaW5nJykuY3NzKHtkaXNwbGF5OiBcImlubGluZVwifSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAkKCcjcmVjb3JkaW5nJykuY3NzKHtkaXNwbGF5OiBcIm5vbmVcIn0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vIFRvZ2dsZSB0aGUgc3RhdGUgb2YgdGhlIHJlY29yZGluZyBidXR0b25cbiAgICBteS50b2dnbGVSZWNvcmRpbmdCdXR0b25TdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkKCcjcmVjb3JkQnV0dG9uJykudG9nZ2xlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgIH07XG5cbiAgICAvLyBTaG93cyBvciBoaWRlcyBTSVAgY2FsbHMgYnV0dG9uXG4gICAgbXkuc2hvd1NpcENhbGxCdXR0b24gPSBmdW5jdGlvbiAoc2hvdylcbiAgICB7XG4gICAgICAgIGlmIChjb25maWcuaG9zdHMuY2FsbF9jb250cm9sICYmIHNob3cpXG4gICAgICAgIHtcbiAgICAgICAgICAgICQoJyNzaXBDYWxsQnV0dG9uJykuY3NzKHtkaXNwbGF5OiBcImlubGluZVwifSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZVxuICAgICAgICB7XG4gICAgICAgICAgICAkKCcjc2lwQ2FsbEJ1dHRvbicpLmNzcyh7ZGlzcGxheTogXCJub25lXCJ9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gbXk7XG59KFRvb2xiYXIgfHwge30pKTtcblxubW9kdWxlLmV4cG9ydHMgPSBUb29sYmFyO1xuIiwidmFyIFVJU2VydmljZSA9IHJlcXVpcmUoXCIuL1VJU2VydmljZVwiKTtcbnZhciBWaWRlb0xheW91dCA9IHJlcXVpcmUoXCIuL1ZpZGVvTGF5b3V0LmpzXCIpO1xudmFyIEF1ZGlvTGV2ZWxzID0gcmVxdWlyZShcIi4vYXVkaW9sZXZlbHMvQXVkaW9MZXZlbHMuanNcIik7XG52YXIgUHJlemkgPSByZXF1aXJlKFwiLi9wcmV6aS9QcmV6aS5qc1wiKTtcbnZhciBFdGhlcnBhZCA9IHJlcXVpcmUoXCIuL2V0aGVycGFkL0V0aGVycGFkLmpzXCIpO1xudmFyIENoYXQgPSByZXF1aXJlKFwiLi9jaGF0L0NoYXQuanNcIik7XG52YXIgU3RyZWFtRXZlbnRUeXBlcyA9IHJlcXVpcmUoXCIuLi9zZXJ2aWNlL1JUQy9TdHJlYW1FdmVudFR5cGVzLmpzXCIpO1xudmFyIFRvb2xiYXIgPSByZXF1aXJlKFwiLi90b29sYmFyXCIpO1xudmFyIEJvdHRvbVRvb2xiYXIgPSByZXF1aXJlKFwiLi9Cb3R0b21Ub29sYmFyXCIpO1xuXG52YXIgVUlBY3RpdmF0b3IgPSBmdW5jdGlvbigpXG57XG4gICAgdmFyIHVpU2VydmljZSA9IG51bGw7XG4gICAgZnVuY3Rpb24gVUlBY3RpdmF0b3JQcm90bygpXG4gICAge1xuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0dXBQcmV6aSgpXG4gICAge1xuICAgICAgICAkKFwiI3Rvb2xiYXJfcHJlemlcIikuY2xpY2soZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICBQcmV6aS5vcGVuUHJlemlEaWFsb2coKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJChcIiNyZWxvYWRQcmVzZW50YXRpb25MaW5rXCIpLmNsaWNrKGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgUHJlemkucmVsb2FkUHJlc2VudGF0aW9uKCk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0dXBFdGhlcnBhZCgpXG4gICAge1xuICAgICAgICAkKFwiI3Rvb2xiYXJfZXRoZXJwYWRcIikuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgRXRoZXJwYWQudG9nZ2xlRXRoZXJwYWQoMCk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0dXBBdWRpb0xldmVscygpIHtcbiAgICAgICAgU3RhdGlzdGljc0FjdGl2YXRvci5hZGRBdWRpb0xldmVsTGlzdGVuZXIoQXVkaW9MZXZlbHMudXBkYXRlQXVkaW9MZXZlbCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0dXBDaGF0KClcbiAgICB7XG4gICAgICAgIENoYXQuaW5pdCgpO1xuICAgICAgICAkKFwiI3Rvb2xiYXJfY2hhdFwiKS5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBDaGF0LnRvZ2dsZUNoYXQoKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXR1cFZpZGVvTGF5b3V0RXZlbnRzKClcbiAgICB7XG5cbiAgICAgICAgJChkb2N1bWVudCkuYmluZCgnY2FsbGFjdGl2ZS5qaW5nbGUnLCBmdW5jdGlvbiAoZXZlbnQsIHZpZGVvZWxlbSwgc2lkKSB7XG4gICAgICAgICAgICBpZiAodmlkZW9lbGVtLmF0dHIoJ2lkJykuaW5kZXhPZignbWl4ZWRtc2xhYmVsJykgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgLy8gaWdub3JlIG1peGVkbXNsYWJlbGEwIGFuZCB2MFxuICAgICAgICAgICAgICAgIHZpZGVvZWxlbS5zaG93KCk7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplVGh1bWJuYWlscygpO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBsYXJnZSB2aWRlbyB0byB0aGUgbGFzdCBhZGRlZCB2aWRlbyBvbmx5IGlmIHRoZXJlJ3Mgbm9cbiAgICAgICAgICAgICAgICAvLyBjdXJyZW50IGFjdGl2ZSBvciBmb2N1c2VkIHNwZWFrZXIuXG4gICAgICAgICAgICAgICAgaWYgKCFWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMgJiYgIVZpZGVvTGF5b3V0LmdldERvbWluYW50U3BlYWtlclJlc291cmNlSmlkKCkpXG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8odmlkZW9lbGVtLmF0dHIoJ3NyYycpLCAxKTtcblxuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dGb2N1c0luZGljYXRvcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXR1cFRvb2xiYXJzKCkge1xuICAgICAgICBUb29sYmFyLmluaXQoKTtcbiAgICAgICAgQm90dG9tVG9vbGJhci5pbml0KCk7XG4gICAgfVxuXG4gICAgVUlBY3RpdmF0b3JQcm90by5zdGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gQnkgZGVmYXVsdCB3ZSB1c2UgY2FtZXJhXG4gICAgICAgIGdldFZpZGVvU2l6ZSA9IFZpZGVvTGF5b3V0LmdldENhbWVyYVZpZGVvU2l6ZTtcbiAgICAgICAgZ2V0VmlkZW9Qb3NpdGlvbiA9IFZpZGVvTGF5b3V0LmdldENhbWVyYVZpZGVvUG9zaXRpb247XG4gICAgICAgICQoJ2JvZHknKS5wb3BvdmVyKHsgc2VsZWN0b3I6ICdbZGF0YS10b2dnbGU9cG9wb3Zlcl0nLFxuICAgICAgICAgICAgdHJpZ2dlcjogJ2NsaWNrIGhvdmVyJ30pO1xuICAgICAgICBWaWRlb0xheW91dC5yZXNpemVMYXJnZVZpZGVvQ29udGFpbmVyKCk7XG4gICAgICAgICQoXCIjdmlkZW9zcGFjZVwiKS5tb3VzZW1vdmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIFRvb2xiYXIuc2hvd1Rvb2xiYXIoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJlZ2lzdGVyTGlzdGVuZXJzKCk7XG4gICAgICAgIGJpbmRFdmVudHMoKTtcbiAgICAgICAgc2V0dXBBdWRpb0xldmVscygpO1xuICAgICAgICBzZXR1cFZpZGVvTGF5b3V0RXZlbnRzKCk7XG4gICAgICAgIHNldHVwUHJlemkoKTtcbiAgICAgICAgc2V0dXBFdGhlcnBhZCgpO1xuICAgICAgICBzZXR1cFRvb2xiYXJzKCk7XG4gICAgICAgIHNldHVwQ2hhdCgpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVnaXN0ZXJMaXN0ZW5lcnMoKSB7XG4gICAgICAgIFJUQ0FjdGl2YXRvci5hZGRTdHJlYW1MaXN0ZW5lcihmdW5jdGlvbiAoc3RyZWFtKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHN0cmVhbS50eXBlKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNhc2UgXCJhdWRpb1wiOlxuICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5jaGFuZ2VMb2NhbEF1ZGlvKHN0cmVhbS5nZXRPcmlnaW5hbFN0cmVhbSgpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcInZpZGVvXCI6XG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LmNoYW5nZUxvY2FsVmlkZW8oc3RyZWFtLmdldE9yaWdpbmFsU3RyZWFtKCksIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVza3RvcFwiOlxuICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5jaGFuZ2VMb2NhbFZpZGVvKHN0cmVhbSwgIWlzVXNpbmdTY3JlZW5TdHJlYW0pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgU3RyZWFtRXZlbnRUeXBlcy5FVkVOVF9UWVBFX0xPQ0FMX0NSRUFURUQpO1xuXG4gICAgICAgIFJUQ0FjdGl2YXRvci5hZGRTdHJlYW1MaXN0ZW5lcihmdW5jdGlvbiAoc3RyZWFtKSB7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5vblJlbW90ZVN0cmVhbUFkZGVkKHN0cmVhbSk7XG4gICAgICAgIH0sIFN0cmVhbUV2ZW50VHlwZXMuRVZFTlRfVFlQRV9SRU1PVEVfQ1JFQVRFRCk7XG4gICAgICAgIC8vIExpc3RlbiBmb3IgbGFyZ2UgdmlkZW8gc2l6ZSB1cGRhdGVzXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsYXJnZVZpZGVvJylcbiAgICAgICAgICAgIC5hZGRFdmVudExpc3RlbmVyKCdsb2FkZWRtZXRhZGF0YScsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFZpZGVvV2lkdGggPSB0aGlzLnZpZGVvV2lkdGg7XG4gICAgICAgICAgICAgICAgY3VycmVudFZpZGVvSGVpZ2h0ID0gdGhpcy52aWRlb0hlaWdodDtcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5wb3NpdGlvbkxhcmdlKGN1cnJlbnRWaWRlb1dpZHRoLCBjdXJyZW50VmlkZW9IZWlnaHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGJpbmRFdmVudHMoKVxuICAgIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlc2l6ZXMgYW5kIHJlcG9zaXRpb25zIHZpZGVvcyBpbiBmdWxsIHNjcmVlbiBtb2RlLlxuICAgICAgICAgKi9cbiAgICAgICAgJChkb2N1bWVudCkub24oJ3dlYmtpdGZ1bGxzY3JlZW5jaGFuZ2UgbW96ZnVsbHNjcmVlbmNoYW5nZSBmdWxsc2NyZWVuY2hhbmdlJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5yZXNpemVMYXJnZVZpZGVvQ29udGFpbmVyKCk7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQucG9zaXRpb25MYXJnZSgpO1xuICAgICAgICAgICAgICAgIGlzRnVsbFNjcmVlbiA9IGRvY3VtZW50LmZ1bGxTY3JlZW4gfHxcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQubW96RnVsbFNjcmVlbiB8fFxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC53ZWJraXRJc0Z1bGxTY3JlZW47XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNGdWxsU2NyZWVuKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFZpZXcoXCJmdWxsc2NyZWVuXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0VmlldyhcImRlZmF1bHRcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgICQod2luZG93KS5yZXNpemUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplTGFyZ2VWaWRlb0NvbnRhaW5lcigpO1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQucG9zaXRpb25MYXJnZSgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBVSUFjdGl2YXRvclByb3RvLmdldFJUQ1NlcnZpY2UgPSBmdW5jdGlvbigpXG4gICAge1xuICAgICAgICByZXR1cm4gUlRDQWN0aXZhdG9yLmdldFJUQ1NlcnZpY2UoKTtcbiAgICB9XG5cbiAgICBVSUFjdGl2YXRvclByb3RvLmdldFVJU2VydmljZSA9IGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIGlmKHVpU2VydmljZSA9PSBudWxsKVxuICAgICAgICB7XG4gICAgICAgICAgICB1aVNlcnZpY2UgPSBuZXcgVUlTZXJ2aWNlKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVpU2VydmljZTtcbiAgICB9XG5cbiAgICBVSUFjdGl2YXRvclByb3RvLmNoYXRBZGRFcnJvciA9IGZ1bmN0aW9uKGVycm9yTWVzc2FnZSwgb3JpZ2luYWxUZXh0KVxuICAgIHtcbiAgICAgICAgcmV0dXJuIENoYXQuY2hhdEFkZEVycm9yKGVycm9yTWVzc2FnZSwgb3JpZ2luYWxUZXh0KTtcbiAgICB9XG5cbiAgICBVSUFjdGl2YXRvclByb3RvLmNoYXRTZXRTdWJqZWN0ID0gZnVuY3Rpb24odGV4dClcbiAgICB7XG4gICAgICAgIHJldHVybiBDaGF0LmNoYXRTZXRTdWJqZWN0KHRleHQpO1xuICAgIH1cblxuICAgIFVJQWN0aXZhdG9yUHJvdG8udXBkYXRlQ2hhdENvbnZlcnNhdGlvbiA9IGZ1bmN0aW9uIChmcm9tLCBkaXNwbGF5TmFtZSwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gQ2hhdC51cGRhdGVDaGF0Q29udmVyc2F0aW9uKGZyb20sIGRpc3BsYXlOYW1lLCBtZXNzYWdlKTtcbiAgICB9XG5cblxuICAgIHJldHVybiBVSUFjdGl2YXRvclByb3RvO1xufSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFVJQWN0aXZhdG9yO1xuXG4iLCJ2YXIgQXVkaW9MZXZlbHMgPSByZXF1aXJlKFwiLi9hdWRpb2xldmVscy9BdWRpb0xldmVscy5qc1wiKTtcbnZhciBFdGhlcnBhZCA9IHJlcXVpcmUoXCIuL2V0aGVycGFkL0V0aGVycGFkLmpzXCIpO1xudmFyIFZpZGVvTGF5b3V0ID0gcmVxdWlyZShcIi4vVmlkZW9MYXlvdXQuanNcIik7XG52YXIgVG9vbGJhciA9IHJlcXVpcmUoXCIuL1Rvb2xiYXIuanNcIik7XG52YXIgQ29udGFjdExpc3QgPSByZXF1aXJlKFwiLi9Db250YWN0TGlzdFwiKTtcblxudmFyIFVJU2VydmljZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIHJvb20gaW52aXRlIHVybC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiB1cGRhdGVSb29tVXJsKG5ld1Jvb21VcmwpIHtcbiAgICAgICAgcm9vbVVybCA9IG5ld1Jvb21Vcmw7XG5cbiAgICAgICAgLy8gSWYgdGhlIGludml0ZSBkaWFsb2cgaGFzIGJlZW4gYWxyZWFkeSBvcGVuZWQgd2UgdXBkYXRlIHRoZSBpbmZvcm1hdGlvbi5cbiAgICAgICAgdmFyIGludml0ZUxpbmsgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaW52aXRlTGlua1JlZicpO1xuICAgICAgICBpZiAoaW52aXRlTGluaykge1xuICAgICAgICAgICAgaW52aXRlTGluay52YWx1ZSA9IHJvb21Vcmw7XG4gICAgICAgICAgICBpbnZpdGVMaW5rLnNlbGVjdCgpO1xuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pxaV9zdGF0ZTBfYnV0dG9uSW52aXRlJykuZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIFVJU2VydmljZVByb3RvKCkge1xuXG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLnVwZGF0ZUF1ZGlvTGV2ZWxDYW52YXMgPSBmdW5jdGlvbiAocGVlckppZCkge1xuICAgICAgICBBdWRpb0xldmVscy51cGRhdGVBdWRpb0xldmVsQ2FudmFzKHBlZXJKaWQpO1xuICAgIH1cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5pbml0RXRoZXJwYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIEV0aGVycGFkLmluaXQoKTtcbiAgICB9XG5cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5jaGVja0NoYW5nZUxhcmdlVmlkZW8gPSBmdW5jdGlvbiAocmVtb3ZlZFZpZGVvU3JjKSB7XG4gICAgICAgIFZpZGVvTGF5b3V0LmNoZWNrQ2hhbmdlTGFyZ2VWaWRlbyhyZW1vdmVkVmlkZW9TcmMpO1xuICAgIH1cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5vbk11Y0pvaW5lZCA9IGZ1bmN0aW9uIChqaWQsIGluZm8sIG5vTWVtYmVycykge1xuICAgICAgICB1cGRhdGVSb29tVXJsKHdpbmRvdy5sb2NhdGlvbi5ocmVmKTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2FsTmljaycpLmFwcGVuZENoaWxkKFxuICAgICAgICAgICAgZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKSArICcgKG1lKScpXG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKG5vTWVtYmVycykge1xuICAgICAgICAgICAgVG9vbGJhci5zaG93U2lwQ2FsbEJ1dHRvbih0cnVlKTtcbiAgICAgICAgICAgIFRvb2xiYXIuc2hvd1JlY29yZGluZ0J1dHRvbihmYWxzZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWZvY3VzKSB7XG4gICAgICAgICAgICBUb29sYmFyLnNob3dTaXBDYWxsQnV0dG9uKGZhbHNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmb2N1cyAmJiBjb25maWcuZXRoZXJwYWRfYmFzZSkge1xuICAgICAgICAgICAgdGhpcy5pbml0RXRoZXJwYWQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIFZpZGVvTGF5b3V0LnNob3dGb2N1c0luZGljYXRvcigpO1xuXG4gICAgICAgIC8vIEFkZCBteXNlbGYgdG8gdGhlIGNvbnRhY3QgbGlzdC5cbiAgICAgICAgQ29udGFjdExpc3QuYWRkQ29udGFjdChqaWQpO1xuXG4gICAgICAgIC8vIE9uY2Ugd2UndmUgam9pbmVkIHRoZSBtdWMgc2hvdyB0aGUgdG9vbGJhclxuICAgICAgICBUb29sYmFyLnNob3dUb29sYmFyKCk7XG5cbiAgICAgICAgaWYgKGluZm8uZGlzcGxheU5hbWUpXG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdkaXNwbGF5bmFtZWNoYW5nZWQnLFxuICAgICAgICAgICAgICAgIFsnbG9jYWxWaWRlb0NvbnRhaW5lcicsIGluZm8uZGlzcGxheU5hbWUgKyAnIChtZSknXSk7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLm9uTXVjRW50ZXJlZCA9IGZ1bmN0aW9uIChqaWQsIGluZm8sIHByZXMpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2VudGVyZWQnLCBqaWQsIGluZm8pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdpcyBmb2N1cz8nICsgZm9jdXMgPyAndHJ1ZScgOiAnZmFsc2UnKTtcblxuICAgICAgICAvLyBBZGQgUGVlcidzIGNvbnRhaW5lclxuICAgICAgICBWaWRlb0xheW91dC5lbnN1cmVQZWVyQ29udGFpbmVyRXhpc3RzKGppZCk7XG5cbiAgICAgICAgaWYgKGZvY3VzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAvLyBGSVhNRTogdGhpcyBzaG91bGQgcHJlcGFyZSB0aGUgdmlkZW9cbiAgICAgICAgICAgIGlmIChmb2N1cy5jb25maWQgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbWFrZSBuZXcgY29uZmVyZW5jZSB3aXRoJywgamlkKTtcbiAgICAgICAgICAgICAgICBmb2N1cy5tYWtlQ29uZmVyZW5jZShPYmplY3Qua2V5cyhjb25uZWN0aW9uLmVtdWMubWVtYmVycykpO1xuICAgICAgICAgICAgICAgIFRvb2xiYXIuc2hvd1JlY29yZGluZ0J1dHRvbih0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2ludml0ZScsIGppZCwgJ2ludG8gY29uZmVyZW5jZScpO1xuICAgICAgICAgICAgICAgIGZvY3VzLmFkZE5ld1BhcnRpY2lwYW50KGppZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc2hhcmVkS2V5KSB7XG4gICAgICAgICAgICBUb29sYmFyLnVwZGF0ZUxvY2tCdXR0b24oKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5vbk11Y1ByZXNlbmNlU3RhdHVzID0gZnVuY3Rpb24gKCBqaWQsIGluZm8sIHByZXMpIHtcbiAgICAgICAgVmlkZW9MYXlvdXQuc2V0UHJlc2VuY2VTdGF0dXMoXG4gICAgICAgICAgICAgICAgJ3BhcnRpY2lwYW50XycgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpLCBpbmZvLnN0YXR1cyk7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLm9uTXVjTGVmdCA9IGZ1bmN0aW9uKGppZClcbiAgICB7XG4gICAgICAgIC8vIE5lZWQgdG8gY2FsbCB0aGlzIHdpdGggYSBzbGlnaHQgZGVsYXksIG90aGVyd2lzZSB0aGUgZWxlbWVudCBjb3VsZG4ndCBiZVxuICAgICAgICAvLyBmb3VuZCBmb3Igc29tZSByZWFzb24uXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcbiAgICAgICAgICAgICAgICAgICAgJ3BhcnRpY2lwYW50XycgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpKTtcbiAgICAgICAgICAgIGlmIChjb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBoaWRlIGhlcmUsIHdhaXQgZm9yIHZpZGVvIHRvIGNsb3NlIGJlZm9yZSByZW1vdmluZ1xuICAgICAgICAgICAgICAgICQoY29udGFpbmVyKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplVGh1bWJuYWlscygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAxMCk7XG5cbiAgICAgICAgLy8gVW5sb2NrIGxhcmdlIHZpZGVvXG4gICAgICAgIGlmIChWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmIChnZXRKaWRGcm9tVmlkZW9TcmMoVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjKSA9PT0gamlkKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIkZvY3VzZWQgdmlkZW8gb3duZXIgaGFzIGxlZnQgdGhlIGNvbmZlcmVuY2VcIik7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgfVxuICAgIFxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS51cGRhdGVCdXR0b25zID0gZnVuY3Rpb24gKHJlY29yZGluZywgc2lwKSB7XG4gICAgICAgIGlmKHJlY29yZGluZyAhPSBudWxsKVxuICAgICAgICB7XG4gICAgICAgICAgICBUb29sYmFyLnNob3dSZWNvcmRpbmdCdXR0b24ocmVjb3JkaW5nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHNpcCAhPSBudWxsKVxuICAgICAgICB7XG4gICAgICAgICAgICBUb29sYmFyLnNob3dTaXBDYWxsQnV0dG9uKHNpcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gVUlTZXJ2aWNlUHJvdG87XG59KCk7XG5tb2R1bGUuZXhwb3J0cyA9IFVJU2VydmljZTsiLCJcbnZhciBVSVV0aWwgPSAoZnVuY3Rpb24gKG15KSB7XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBhdmFpbGFibGUgdmlkZW8gd2lkdGguXG4gICAgICovXG4gICAgbXkuZ2V0QXZhaWxhYmxlVmlkZW9XaWR0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNoYXRzcGFjZVdpZHRoXG4gICAgICAgICAgICA9ICQoJyNjaGF0c3BhY2UnKS5pcyhcIjp2aXNpYmxlXCIpXG4gICAgICAgICAgICA/ICQoJyNjaGF0c3BhY2UnKS53aWR0aCgpXG4gICAgICAgICAgICA6IDA7XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbm5lcldpZHRoIC0gY2hhdHNwYWNlV2lkdGg7XG4gICAgfTtcblxuICAgIHJldHVybiBteTtcblxufSkoVUlVdGlsIHx8IHt9KTtcblxubW9kdWxlLmV4cG9ydHMgPSBVSVV0aWw7IiwidmFyIGRlcCA9XG57XG4gICAgXCJSVENCcm93c2VyVHlwZVwiOiBmdW5jdGlvbigpeyByZXR1cm4gcmVxdWlyZShcIi4uL3NlcnZpY2UvUlRDL1JUQ0Jyb3dzZXJUeXBlLmpzXCIpfSxcbiAgICBcIlVJQWN0aXZhdG9yXCI6IGZ1bmN0aW9uKCl7IHJldHVybiByZXF1aXJlKFwiLi9VSUFjdGl2YXRvci5qc1wiKX0sXG4gICAgXCJDaGF0XCI6IGZ1bmN0aW9uKCl7IHJldHVybiByZXF1aXJlKFwiLi9jaGF0L0NoYXRcIil9LFxuICAgIFwiVUlVdGlsXCI6IGZ1bmN0aW9uKCl7IHJldHVybiByZXF1aXJlKFwiLi9VSVV0aWwuanNcIil9LFxuICAgIFwiQ29udGFjdExpc3RcIjogZnVuY3Rpb24oKXsgcmV0dXJuIHJlcXVpcmUoXCIuL0NvbnRhY3RMaXN0XCIpfSxcbiAgICBcIlRvb2xiYXJcIjogZnVuY3Rpb24oKXsgcmV0dXJuIHJlcXVpcmUoXCIuL1Rvb2xiYXJcIil9XG59XG5cbnZhciBWaWRlb0xheW91dCA9IChmdW5jdGlvbiAobXkpIHtcbiAgICB2YXIgcHJlTXV0ZWQgPSBmYWxzZTtcbiAgICB2YXIgY3VycmVudERvbWluYW50U3BlYWtlciA9IG51bGw7XG4gICAgdmFyIGxhc3ROQ291bnQgPSBjb25maWcuY2hhbm5lbExhc3ROO1xuICAgIHZhciBsYXN0TkVuZHBvaW50c0NhY2hlID0gW107XG4gICAgdmFyIGJyb3dzZXIgPSBudWxsO1xuICAgIC8qKlxuICAgICAqIEN1cnJlbnRseSBmb2N1c2VkIHZpZGVvIFwic3JjXCIoZGlzcGxheWVkIGluIGxhcmdlIHZpZGVvKS5cbiAgICAgKiBAdHlwZSB7U3RyaW5nfVxuICAgICAqL1xuICAgIG15LmZvY3VzZWRWaWRlb1NyYyA9IG51bGw7XG5cbiAgICBmdW5jdGlvbiBhdHRhY2hNZWRpYVN0cmVhbShlbGVtZW50LCBzdHJlYW0pIHtcbiAgICAgICAgaWYoYnJvd3NlciA9PSBudWxsKVxuICAgICAgICB7XG4gICAgICAgICAgICBicm93c2VyID0gZGVwLlVJQWN0aXZhdG9yKCkuZ2V0UlRDU2VydmljZSgpLmdldEJyb3dzZXJUeXBlKCk7XG4gICAgICAgIH1cbiAgICAgICAgc3dpdGNoIChicm93c2VyKVxuICAgICAgICB7XG4gICAgICAgICAgICBjYXNlIGRlcC5SVENCcm93c2VyVHlwZSgpLlJUQ19CUk9XU0VSX0NIUk9NRTpcbiAgICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoJ3NyYycsIHdlYmtpdFVSTC5jcmVhdGVPYmplY3RVUkwoc3RyZWFtKSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGRlcC5SVENCcm93c2VyVHlwZSgpLlJUQ19CUk9XU0VSX0ZJUkVGT1g6XG4gICAgICAgICAgICAgICAgZWxlbWVudFswXS5tb3pTcmNPYmplY3QgPSBzdHJlYW07XG4gICAgICAgICAgICAgICAgZWxlbWVudFswXS5wbGF5KCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVW5rbm93biBicm93c2VyLlwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG15LmNoYW5nZUxvY2FsQXVkaW8gPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgICAgY29ubmVjdGlvbi5qaW5nbGUubG9jYWxBdWRpbyA9IHN0cmVhbTtcblxuICAgICAgICBhdHRhY2hNZWRpYVN0cmVhbSgkKCcjbG9jYWxBdWRpbycpLCBzdHJlYW0pO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9jYWxBdWRpbycpLmF1dG9wbGF5ID0gdHJ1ZTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2FsQXVkaW8nKS52b2x1bWUgPSAwO1xuICAgICAgICBpZiAocHJlTXV0ZWQpIHtcbiAgICAgICAgICAgIHRvZ2dsZUF1ZGlvKCk7XG4gICAgICAgICAgICBwcmVNdXRlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIG15LmNoYW5nZUxvY2FsVmlkZW8gPSBmdW5jdGlvbihzdHJlYW0sIGZsaXBYKSB7XG4gICAgICAgIGNvbm5lY3Rpb24uamluZ2xlLmxvY2FsVmlkZW8gPSBzdHJlYW07XG5cbiAgICAgICAgdmFyIGxvY2FsVmlkZW8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd2aWRlbycpO1xuICAgICAgICBsb2NhbFZpZGVvLmlkID0gJ2xvY2FsVmlkZW9fJyArIHN0cmVhbS5pZDtcbiAgICAgICAgbG9jYWxWaWRlby5hdXRvcGxheSA9IHRydWU7XG4gICAgICAgIGxvY2FsVmlkZW8udm9sdW1lID0gMDsgLy8gaXMgaXQgcmVxdWlyZWQgaWYgYXVkaW8gaXMgc2VwYXJhdGVkID9cbiAgICAgICAgbG9jYWxWaWRlby5vbmNvbnRleHRtZW51ID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gZmFsc2U7IH07XG5cbiAgICAgICAgdmFyIGxvY2FsVmlkZW9Db250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9jYWxWaWRlb1dyYXBwZXInKTtcbiAgICAgICAgbG9jYWxWaWRlb0NvbnRhaW5lci5hcHBlbmRDaGlsZChsb2NhbFZpZGVvKTtcblxuICAgICAgICAvLyBTZXQgZGVmYXVsdCBkaXNwbGF5IG5hbWUuXG4gICAgICAgIHNldERpc3BsYXlOYW1lKCdsb2NhbFZpZGVvQ29udGFpbmVyJyk7XG5cbiAgICAgICAgZGVwLlVJQWN0aXZhdG9yKCkuZ2V0VUlTZXJ2aWNlKCkudXBkYXRlQXVkaW9MZXZlbENhbnZhcygpO1xuXG4gICAgICAgIHZhciBsb2NhbFZpZGVvU2VsZWN0b3IgPSAkKCcjJyArIGxvY2FsVmlkZW8uaWQpO1xuICAgICAgICAvLyBBZGQgY2xpY2sgaGFuZGxlciB0byBib3RoIHZpZGVvIGFuZCB2aWRlbyB3cmFwcGVyIGVsZW1lbnRzIGluIGNhc2VcbiAgICAgICAgLy8gdGhlcmUncyBubyB2aWRlby5cbiAgICAgICAgbG9jYWxWaWRlb1NlbGVjdG9yLmNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmhhbmRsZVZpZGVvVGh1bWJDbGlja2VkKGxvY2FsVmlkZW8uc3JjKTtcbiAgICAgICAgfSk7XG4gICAgICAgICQoJyNsb2NhbFZpZGVvQ29udGFpbmVyJykuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuaGFuZGxlVmlkZW9UaHVtYkNsaWNrZWQobG9jYWxWaWRlby5zcmMpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgaG92ZXIgaGFuZGxlclxuICAgICAgICAkKCcjbG9jYWxWaWRlb0NvbnRhaW5lcicpLmhvdmVyKFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0Rpc3BsYXlOYW1lKCdsb2NhbFZpZGVvQ29udGFpbmVyJywgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFWaWRlb0xheW91dC5pc0xhcmdlVmlkZW9WaXNpYmxlKClcbiAgICAgICAgICAgICAgICAgICAgICAgIHx8IGxvY2FsVmlkZW8uc3JjICE9PSAkKCcjbGFyZ2VWaWRlbycpLmF0dHIoJ3NyYycpKVxuICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zaG93RGlzcGxheU5hbWUoJ2xvY2FsVmlkZW9Db250YWluZXInLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIC8vIEFkZCBzdHJlYW0gZW5kZWQgaGFuZGxlclxuICAgICAgICBzdHJlYW0ub25lbmRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGxvY2FsVmlkZW9Db250YWluZXIucmVtb3ZlQ2hpbGQobG9jYWxWaWRlbyk7XG4gICAgICAgICAgICBWaWRlb0xheW91dC51cGRhdGVSZW1vdmVkVmlkZW8obG9jYWxWaWRlby5zcmMpO1xuICAgICAgICB9O1xuICAgICAgICAvLyBGbGlwIHZpZGVvIHggYXhpcyBpZiBuZWVkZWRcbiAgICAgICAgZmxpcFhMb2NhbFZpZGVvID0gZmxpcFg7XG4gICAgICAgIGlmIChmbGlwWCkge1xuICAgICAgICAgICAgbG9jYWxWaWRlb1NlbGVjdG9yLmFkZENsYXNzKFwiZmxpcFZpZGVvWFwiKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBBdHRhY2ggV2ViUlRDIHN0cmVhbVxuICAgICAgICBhdHRhY2hNZWRpYVN0cmVhbShsb2NhbFZpZGVvU2VsZWN0b3IsIHN0cmVhbSk7XG5cbiAgICAgICAgbG9jYWxWaWRlb1NyYyA9IGxvY2FsVmlkZW8uc3JjO1xuXG4gICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8obG9jYWxWaWRlb1NyYywgMCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiByZW1vdmVkIHZpZGVvIGlzIGN1cnJlbnRseSBkaXNwbGF5ZWQgYW5kIHRyaWVzIHRvIGRpc3BsYXlcbiAgICAgKiBhbm90aGVyIG9uZSBpbnN0ZWFkLlxuICAgICAqIEBwYXJhbSByZW1vdmVkVmlkZW9TcmMgc3JjIHN0cmVhbSBpZGVudGlmaWVyIG9mIHRoZSB2aWRlby5cbiAgICAgKi9cbiAgICBteS51cGRhdGVSZW1vdmVkVmlkZW8gPSBmdW5jdGlvbihyZW1vdmVkVmlkZW9TcmMpIHtcbiAgICAgICAgaWYgKHJlbW92ZWRWaWRlb1NyYyA9PT0gJCgnI2xhcmdlVmlkZW8nKS5hdHRyKCdzcmMnKSkge1xuICAgICAgICAgICAgLy8gdGhpcyBpcyBjdXJyZW50bHkgZGlzcGxheWVkIGFzIGxhcmdlXG4gICAgICAgICAgICAvLyBwaWNrIHRoZSBsYXN0IHZpc2libGUgdmlkZW8gaW4gdGhlIHJvd1xuICAgICAgICAgICAgLy8gaWYgbm9ib2R5IGVsc2UgaXMgbGVmdCwgdGhpcyBwaWNrcyB0aGUgbG9jYWwgdmlkZW9cbiAgICAgICAgICAgIHZhciBwaWNrXG4gICAgICAgICAgICAgICAgPSAkKCcjcmVtb3RlVmlkZW9zPnNwYW5baWQhPVwibWl4ZWRzdHJlYW1cIl06dmlzaWJsZTpsYXN0PnZpZGVvJylcbiAgICAgICAgICAgICAgICAgICAgLmdldCgwKTtcblxuICAgICAgICAgICAgaWYgKCFwaWNrKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKFwiTGFzdCB2aXNpYmxlIHZpZGVvIG5vIGxvbmdlciBleGlzdHNcIik7XG4gICAgICAgICAgICAgICAgcGljayA9ICQoJyNyZW1vdGVWaWRlb3M+c3BhbltpZCE9XCJtaXhlZHN0cmVhbVwiXT52aWRlbycpLmdldCgwKTtcblxuICAgICAgICAgICAgICAgIGlmICghcGljayB8fCAhcGljay5zcmMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IGxvY2FsIHZpZGVvXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIkZhbGxiYWNrIHRvIGxvY2FsIHZpZGVvLi4uXCIpO1xuICAgICAgICAgICAgICAgICAgICBwaWNrID0gJCgnI3JlbW90ZVZpZGVvcz5zcGFuPnNwYW4+dmlkZW8nKS5nZXQoMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBtdXRlIGlmIGxvY2FsdmlkZW9cbiAgICAgICAgICAgIGlmIChwaWNrKSB7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQudXBkYXRlTGFyZ2VWaWRlbyhwaWNrLnNyYywgcGljay52b2x1bWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gZWxlY3QgbGFyZ2UgdmlkZW9cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgbGFyZ2UgdmlkZW8gd2l0aCB0aGUgZ2l2ZW4gbmV3IHZpZGVvIHNvdXJjZS5cbiAgICAgKi9cbiAgICBteS51cGRhdGVMYXJnZVZpZGVvID0gZnVuY3Rpb24obmV3U3JjLCB2b2wpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2hvdmVyIGluJywgbmV3U3JjKTtcblxuICAgICAgICBpZiAoJCgnI2xhcmdlVmlkZW8nKS5hdHRyKCdzcmMnKSAhPSBuZXdTcmMpIHtcblxuICAgICAgICAgICAgdmFyIGlzVmlzaWJsZSA9ICQoJyNsYXJnZVZpZGVvJykuaXMoJzp2aXNpYmxlJyk7XG5cbiAgICAgICAgICAgICQoJyNsYXJnZVZpZGVvJykuZmFkZU91dCgzMDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgb2xkU3JjID0gJCh0aGlzKS5hdHRyKCdzcmMnKTtcblxuICAgICAgICAgICAgICAgICQodGhpcykuYXR0cignc3JjJywgbmV3U3JjKTtcblxuICAgICAgICAgICAgICAgIC8vIFNjcmVlbiBzdHJlYW0gaXMgYWxyZWFkeSByb3RhdGVkXG4gICAgICAgICAgICAgICAgdmFyIGZsaXBYID0gKG5ld1NyYyA9PT0gbG9jYWxWaWRlb1NyYykgJiYgZmxpcFhMb2NhbFZpZGVvO1xuXG4gICAgICAgICAgICAgICAgdmFyIHZpZGVvVHJhbnNmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xhcmdlVmlkZW8nKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5zdHlsZS53ZWJraXRUcmFuc2Zvcm07XG5cbiAgICAgICAgICAgICAgICBpZiAoZmxpcFggJiYgdmlkZW9UcmFuc2Zvcm0gIT09ICdzY2FsZVgoLTEpJykge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbGFyZ2VWaWRlbycpLnN0eWxlLndlYmtpdFRyYW5zZm9ybVxuICAgICAgICAgICAgICAgICAgICAgICAgPSBcInNjYWxlWCgtMSlcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoIWZsaXBYICYmIHZpZGVvVHJhbnNmb3JtID09PSAnc2NhbGVYKC0xKScpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xhcmdlVmlkZW8nKS5zdHlsZS53ZWJraXRUcmFuc2Zvcm1cbiAgICAgICAgICAgICAgICAgICAgICAgID0gXCJub25lXCI7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQ2hhbmdlIHRoZSB3YXkgd2UnbGwgYmUgbWVhc3VyaW5nIGFuZCBwb3NpdGlvbmluZyBsYXJnZSB2aWRlb1xuICAgICAgICAgICAgICAgIHZhciBpc0Rlc2t0b3AgPSBpc1ZpZGVvU3JjRGVza3RvcChuZXdTcmMpO1xuICAgICAgICAgICAgICAgIGdldFZpZGVvU2l6ZSA9IGlzRGVza3RvcFxuICAgICAgICAgICAgICAgICAgICA/IGdldERlc2t0b3BWaWRlb1NpemVcbiAgICAgICAgICAgICAgICAgICAgOiBWaWRlb0xheW91dC5nZXRDYW1lcmFWaWRlb1NpemU7XG4gICAgICAgICAgICAgICAgZ2V0VmlkZW9Qb3NpdGlvbiA9IGlzRGVza3RvcFxuICAgICAgICAgICAgICAgICAgICA/IGdldERlc2t0b3BWaWRlb1Bvc2l0aW9uXG4gICAgICAgICAgICAgICAgICAgIDogVmlkZW9MYXlvdXQuZ2V0Q2FtZXJhVmlkZW9Qb3NpdGlvbjtcblxuICAgICAgICAgICAgICAgIGlmIChpc1Zpc2libGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSBpZiB0aGUgbGFyZ2UgdmlkZW8gaXMgY3VycmVudGx5IHZpc2libGUuXG4gICAgICAgICAgICAgICAgICAgIC8vIERpc2FibGUgcHJldmlvdXMgZG9taW5hbnQgc3BlYWtlciB2aWRlby5cbiAgICAgICAgICAgICAgICAgICAgdmFyIG9sZEppZCA9IGdldEppZEZyb21WaWRlb1NyYyhvbGRTcmMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAob2xkSmlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgb2xkUmVzb3VyY2VKaWQgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChvbGRKaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuZW5hYmxlRG9taW5hbnRTcGVha2VyKG9sZFJlc291cmNlSmlkLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBFbmFibGUgbmV3IGRvbWluYW50IHNwZWFrZXIgaW4gdGhlIHJlbW90ZSB2aWRlb3Mgc2VjdGlvbi5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHVzZXJKaWQgPSBnZXRKaWRGcm9tVmlkZW9TcmMobmV3U3JjKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVzZXJKaWQpXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHVzZXJKaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuZW5hYmxlRG9taW5hbnRTcGVha2VyKHJlc291cmNlSmlkLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICQodGhpcykuZmFkZUluKDMwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhbiBhcnJheSBvZiB0aGUgdmlkZW8gaG9yaXpvbnRhbCBhbmQgdmVydGljYWwgaW5kZW50cy5cbiAgICAgKiBDZW50ZXJzIGhvcml6b250YWxseSBhbmQgdG9wIGFsaWducyB2ZXJ0aWNhbGx5LlxuICAgICAqXG4gICAgICogQHJldHVybiBhbiBhcnJheSB3aXRoIDIgZWxlbWVudHMsIHRoZSBob3Jpem9udGFsIGluZGVudCBhbmQgdGhlIHZlcnRpY2FsXG4gICAgICogaW5kZW50XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0RGVza3RvcFZpZGVvUG9zaXRpb24odmlkZW9XaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZUhlaWdodCkge1xuXG4gICAgICAgIHZhciBob3Jpem9udGFsSW5kZW50ID0gKHZpZGVvU3BhY2VXaWR0aCAtIHZpZGVvV2lkdGgpIC8gMjtcblxuICAgICAgICB2YXIgdmVydGljYWxJbmRlbnQgPSAwOy8vIFRvcCBhbGlnbmVkXG5cbiAgICAgICAgcmV0dXJuIFtob3Jpem9udGFsSW5kZW50LCB2ZXJ0aWNhbEluZGVudF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHZpZGVvIGlkZW50aWZpZWQgYnkgZ2l2ZW4gc3JjIGlzIGRlc2t0b3Agc3RyZWFtLlxuICAgICAqIEBwYXJhbSB2aWRlb1NyYyBlZy5cbiAgICAgKiBibG9iOmh0dHBzJTNBLy9wYXdlbC5qaXRzaS5uZXQvOWE0NmUwYmQtMTMxZS00ZDE4LTljMTQtYTkyNjRlOGRiMzk1XG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNWaWRlb1NyY0Rlc2t0b3AodmlkZW9TcmMpIHtcbiAgICAgICAgLy8gRklYTUU6IGZpeCB0aGlzIG1hcHBpbmcgbWVzcy4uLlxuICAgICAgICAvLyBmaWd1cmUgb3V0IGlmIGxhcmdlIHZpZGVvIGlzIGRlc2t0b3Agc3RyZWFtIG9yIGp1c3QgYSBjYW1lcmFcbiAgICAgICAgdmFyIGlzRGVza3RvcCA9IGZhbHNlO1xuICAgICAgICBpZiAobG9jYWxWaWRlb1NyYyA9PT0gdmlkZW9TcmMpIHtcbiAgICAgICAgICAgIC8vIGxvY2FsIHZpZGVvXG4gICAgICAgICAgICBpc0Rlc2t0b3AgPSBpc1VzaW5nU2NyZWVuU3RyZWFtO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRG8gd2UgaGF2ZSBhc3NvY2lhdGlvbnMuLi5cbiAgICAgICAgICAgIHZhciB2aWRlb1NzcmMgPSB2aWRlb1NyY1RvU3NyY1t2aWRlb1NyY107XG4gICAgICAgICAgICBpZiAodmlkZW9Tc3JjKSB7XG4gICAgICAgICAgICAgICAgdmFyIHZpZGVvVHlwZSA9IHNzcmMydmlkZW9UeXBlW3ZpZGVvU3NyY107XG4gICAgICAgICAgICAgICAgaWYgKHZpZGVvVHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBGaW5hbGx5IHRoZXJlLi4uXG4gICAgICAgICAgICAgICAgICAgIGlzRGVza3RvcCA9IHZpZGVvVHlwZSA9PT0gJ3NjcmVlbic7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIk5vIHZpZGVvIHR5cGUgZm9yIHNzcmM6IFwiICsgdmlkZW9Tc3JjKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJObyBzc3JjIGZvciBzcmM6IFwiICsgdmlkZW9TcmMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpc0Rlc2t0b3A7XG4gICAgfVxuXG5cbiAgICBteS5oYW5kbGVWaWRlb1RodW1iQ2xpY2tlZCA9IGZ1bmN0aW9uKHZpZGVvU3JjKSB7XG4gICAgICAgIC8vIFJlc3RvcmUgc3R5bGUgZm9yIHByZXZpb3VzbHkgZm9jdXNlZCB2aWRlb1xuICAgICAgICB2YXIgZm9jdXNKaWQgPSBnZXRKaWRGcm9tVmlkZW9TcmMoVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjKTtcbiAgICAgICAgdmFyIG9sZENvbnRhaW5lciA9IGdldFBhcnRpY2lwYW50Q29udGFpbmVyKGZvY3VzSmlkKTtcblxuICAgICAgICBpZiAob2xkQ29udGFpbmVyKSB7XG4gICAgICAgICAgICBvbGRDb250YWluZXIucmVtb3ZlQ2xhc3MoXCJ2aWRlb0NvbnRhaW5lckZvY3VzZWRcIik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVbmxvY2sgY3VycmVudCBmb2N1c2VkLiBcbiAgICAgICAgaWYgKFZpZGVvTGF5b3V0LmZvY3VzZWRWaWRlb1NyYyA9PT0gdmlkZW9TcmMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmZvY3VzZWRWaWRlb1NyYyA9IG51bGw7XG4gICAgICAgICAgICB2YXIgZG9taW5hbnRTcGVha2VyVmlkZW8gPSBudWxsO1xuICAgICAgICAgICAgLy8gRW5hYmxlIHRoZSBjdXJyZW50bHkgc2V0IGRvbWluYW50IHNwZWFrZXIuXG4gICAgICAgICAgICBpZiAoY3VycmVudERvbWluYW50U3BlYWtlcikge1xuICAgICAgICAgICAgICAgIGRvbWluYW50U3BlYWtlclZpZGVvXG4gICAgICAgICAgICAgICAgICAgID0gJCgnI3BhcnRpY2lwYW50XycgKyBjdXJyZW50RG9taW5hbnRTcGVha2VyICsgJz52aWRlbycpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZ2V0KDApO1xuXG4gICAgICAgICAgICAgICAgaWYgKGRvbWluYW50U3BlYWtlclZpZGVvKSB7XG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8oZG9taW5hbnRTcGVha2VyVmlkZW8uc3JjLCAxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIExvY2sgbmV3IHZpZGVvXG4gICAgICAgIFZpZGVvTGF5b3V0LmZvY3VzZWRWaWRlb1NyYyA9IHZpZGVvU3JjO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBmb2N1c2VkL3Bpbm5lZCBpbnRlcmZhY2UuXG4gICAgICAgIHZhciB1c2VySmlkID0gZ2V0SmlkRnJvbVZpZGVvU3JjKHZpZGVvU3JjKTtcbiAgICAgICAgaWYgKHVzZXJKaWQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBjb250YWluZXIgPSBnZXRQYXJ0aWNpcGFudENvbnRhaW5lcih1c2VySmlkKTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5hZGRDbGFzcyhcInZpZGVvQ29udGFpbmVyRm9jdXNlZFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXJzIGEgXCJ2aWRlby5zZWxlY3RlZFwiIGV2ZW50LiBUaGUgXCJmYWxzZVwiIHBhcmFtZXRlciBpbmRpY2F0ZXNcbiAgICAgICAgLy8gdGhpcyBpc24ndCBhIHByZXppLlxuICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKFwidmlkZW8uc2VsZWN0ZWRcIiwgW2ZhbHNlXSk7XG5cbiAgICAgICAgVmlkZW9MYXlvdXQudXBkYXRlTGFyZ2VWaWRlbyh2aWRlb1NyYywgMSk7XG5cbiAgICAgICAgJCgnYXVkaW8nKS5lYWNoKGZ1bmN0aW9uIChpZHgsIGVsKSB7XG4gICAgICAgICAgICBpZiAoZWwuaWQuaW5kZXhPZignbWl4ZWRtc2xhYmVsJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgZWwudm9sdW1lID0gMDtcbiAgICAgICAgICAgICAgICBlbC52b2x1bWUgPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUG9zaXRpb25zIHRoZSBsYXJnZSB2aWRlby5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB2aWRlb1dpZHRoIHRoZSBzdHJlYW0gdmlkZW8gd2lkdGhcbiAgICAgKiBAcGFyYW0gdmlkZW9IZWlnaHQgdGhlIHN0cmVhbSB2aWRlbyBoZWlnaHRcbiAgICAgKi9cbiAgICBteS5wb3NpdGlvbkxhcmdlID0gZnVuY3Rpb24gKHZpZGVvV2lkdGgsIHZpZGVvSGVpZ2h0KSB7XG4gICAgICAgIHZhciB2aWRlb1NwYWNlV2lkdGggPSAkKCcjdmlkZW9zcGFjZScpLndpZHRoKCk7XG4gICAgICAgIHZhciB2aWRlb1NwYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuXG4gICAgICAgIHZhciB2aWRlb1NpemUgPSBnZXRWaWRlb1NpemUodmlkZW9XaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZUhlaWdodCk7XG5cbiAgICAgICAgdmFyIGxhcmdlVmlkZW9XaWR0aCA9IHZpZGVvU2l6ZVswXTtcbiAgICAgICAgdmFyIGxhcmdlVmlkZW9IZWlnaHQgPSB2aWRlb1NpemVbMV07XG5cbiAgICAgICAgdmFyIHZpZGVvUG9zaXRpb24gPSBnZXRWaWRlb1Bvc2l0aW9uKGxhcmdlVmlkZW9XaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhcmdlVmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlSGVpZ2h0KTtcblxuICAgICAgICB2YXIgaG9yaXpvbnRhbEluZGVudCA9IHZpZGVvUG9zaXRpb25bMF07XG4gICAgICAgIHZhciB2ZXJ0aWNhbEluZGVudCA9IHZpZGVvUG9zaXRpb25bMV07XG5cbiAgICAgICAgcG9zaXRpb25WaWRlbygkKCcjbGFyZ2VWaWRlbycpLFxuICAgICAgICAgICAgICAgICAgICAgIGxhcmdlVmlkZW9XaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICBsYXJnZVZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgIGhvcml6b250YWxJbmRlbnQsIHZlcnRpY2FsSW5kZW50KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2hvd3MvaGlkZXMgdGhlIGxhcmdlIHZpZGVvLlxuICAgICAqL1xuICAgIG15LnNldExhcmdlVmlkZW9WaXNpYmxlID0gZnVuY3Rpb24oaXNWaXNpYmxlKSB7XG4gICAgICAgIHZhciBsYXJnZVZpZGVvSmlkID0gZ2V0SmlkRnJvbVZpZGVvU3JjKCQoJyNsYXJnZVZpZGVvJykuYXR0cignc3JjJykpO1xuICAgICAgICB2YXIgcmVzb3VyY2VKaWQgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChsYXJnZVZpZGVvSmlkKTtcblxuICAgICAgICBpZiAoaXNWaXNpYmxlKSB7XG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlbycpLmNzcyh7dmlzaWJpbGl0eTogJ3Zpc2libGUnfSk7XG4gICAgICAgICAgICAkKCcud2F0ZXJtYXJrJykuY3NzKHt2aXNpYmlsaXR5OiAndmlzaWJsZSd9KTtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmVuYWJsZURvbWluYW50U3BlYWtlcihyZXNvdXJjZUppZCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlbycpLmNzcyh7dmlzaWJpbGl0eTogJ2hpZGRlbid9KTtcbiAgICAgICAgICAgICQoJy53YXRlcm1hcmsnKS5jc3Moe3Zpc2liaWxpdHk6ICdoaWRkZW4nfSk7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5lbmFibGVEb21pbmFudFNwZWFrZXIocmVzb3VyY2VKaWQsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBJbmRpY2F0ZXMgaWYgdGhlIGxhcmdlIHZpZGVvIGlzIGN1cnJlbnRseSB2aXNpYmxlLlxuICAgICAqXG4gICAgICogQHJldHVybiA8dHQ+dHJ1ZTwvdHQ+IGlmIHZpc2libGUsIDx0dD5mYWxzZTwvdHQ+IC0gb3RoZXJ3aXNlXG4gICAgICovXG4gICAgbXkuaXNMYXJnZVZpZGVvVmlzaWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gJCgnI2xhcmdlVmlkZW8nKS5pcygnOnZpc2libGUnKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIGNvbnRhaW5lciBmb3IgcGFydGljaXBhbnQgaWRlbnRpZmllZCBieSBnaXZlbiBwZWVySmlkIGV4aXN0c1xuICAgICAqIGluIHRoZSBkb2N1bWVudCBhbmQgY3JlYXRlcyBpdCBldmVudHVhbGx5LlxuICAgICAqIFxuICAgICAqIEBwYXJhbSBwZWVySmlkIHBlZXIgSmlkIHRvIGNoZWNrLlxuICAgICAqIFxuICAgICAqIEByZXR1cm4gUmV0dXJucyA8dHQ+dHJ1ZTwvdHQ+IGlmIHRoZSBwZWVyIGNvbnRhaW5lciBleGlzdHMsXG4gICAgICogPHR0PmZhbHNlPC90dD4gLSBvdGhlcndpc2VcbiAgICAgKi9cbiAgICBteS5lbnN1cmVQZWVyQ29udGFpbmVyRXhpc3RzID0gZnVuY3Rpb24ocGVlckppZCkge1xuICAgICAgICBkZXAuQ29udGFjdExpc3QoKS5lbnN1cmVBZGRDb250YWN0KHBlZXJKaWQpO1xuXG4gICAgICAgIHZhciByZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHBlZXJKaWQpO1xuXG4gICAgICAgIHZhciB2aWRlb1NwYW5JZCA9ICdwYXJ0aWNpcGFudF8nICsgcmVzb3VyY2VKaWQ7XG5cbiAgICAgICAgaWYgKCQoJyMnICsgdmlkZW9TcGFuSWQpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIElmIHRoZXJlJ3MgYmVlbiBhIGZvY3VzIGNoYW5nZSwgbWFrZSBzdXJlIHdlIGFkZCBmb2N1cyByZWxhdGVkXG4gICAgICAgICAgICAvLyBpbnRlcmZhY2UhIVxuICAgICAgICAgICAgaWYgKGZvY3VzICYmICQoJyNyZW1vdGVfcG9wdXBtZW51XycgKyByZXNvdXJjZUppZCkubGVuZ3RoIDw9IDApXG4gICAgICAgICAgICAgICAgYWRkUmVtb3RlVmlkZW9NZW51KCBwZWVySmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodmlkZW9TcGFuSWQpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBjb250YWluZXJcbiAgICAgICAgICAgICAgICA9IFZpZGVvTGF5b3V0LmFkZFJlbW90ZVZpZGVvQ29udGFpbmVyKHBlZXJKaWQsIHZpZGVvU3BhbklkKTtcblxuICAgICAgICAgICAgLy8gU2V0IGRlZmF1bHQgZGlzcGxheSBuYW1lLlxuICAgICAgICAgICAgc2V0RGlzcGxheU5hbWUodmlkZW9TcGFuSWQpO1xuXG4gICAgICAgICAgICB2YXIgbmlja2ZpZWxkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgbmlja2ZpZWxkLmNsYXNzTmFtZSA9IFwibmlja1wiO1xuICAgICAgICAgICAgbmlja2ZpZWxkLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHJlc291cmNlSmlkKSk7XG4gICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQobmlja2ZpZWxkKTtcblxuICAgICAgICAgICAgLy8gSW4gY2FzZSB0aGlzIGlzIG5vdCBjdXJyZW50bHkgaW4gdGhlIGxhc3QgbiB3ZSBkb24ndCBzaG93IGl0LlxuICAgICAgICAgICAgaWYgKGxhc3ROQ291bnRcbiAgICAgICAgICAgICAgICAmJiBsYXN0TkNvdW50ID4gMFxuICAgICAgICAgICAgICAgICYmICQoJyNyZW1vdGVWaWRlb3M+c3BhbicpLmxlbmd0aCA+PSBsYXN0TkNvdW50ICsgMikge1xuICAgICAgICAgICAgICAgIHNob3dQZWVyQ29udGFpbmVyKHJlc291cmNlSmlkLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplVGh1bWJuYWlscygpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIG15LmFkZFJlbW90ZVZpZGVvQ29udGFpbmVyID0gZnVuY3Rpb24ocGVlckppZCwgc3BhbklkKSB7XG4gICAgICAgIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgIGNvbnRhaW5lci5pZCA9IHNwYW5JZDtcbiAgICAgICAgY29udGFpbmVyLmNsYXNzTmFtZSA9ICd2aWRlb2NvbnRhaW5lcic7XG4gICAgICAgIHZhciByZW1vdGVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JlbW90ZVZpZGVvcycpO1xuXG4gICAgICAgIC8vIElmIHRoZSBwZWVySmlkIGlzIG51bGwgdGhlbiB0aGlzIHZpZGVvIHNwYW4gY291bGRuJ3QgYmUgZGlyZWN0bHlcbiAgICAgICAgLy8gYXNzb2NpYXRlZCB3aXRoIGEgcGFydGljaXBhbnQgKHRoaXMgY291bGQgaGFwcGVuIGluIHRoZSBjYXNlIG9mIHByZXppKS5cbiAgICAgICAgaWYgKGZvY3VzICYmIHBlZXJKaWQgIT0gbnVsbClcbiAgICAgICAgICAgIGFkZFJlbW90ZVZpZGVvTWVudShwZWVySmlkLCBjb250YWluZXIpO1xuXG4gICAgICAgIHJlbW90ZXMuYXBwZW5kQ2hpbGQoY29udGFpbmVyKTtcbiAgICAgICAgZGVwLlVJQWN0aXZhdG9yKCkuZ2V0VUlTZXJ2aWNlKCkudXBkYXRlQXVkaW9MZXZlbENhbnZhcyhwZWVySmlkKTtcblxuICAgICAgICByZXR1cm4gY29udGFpbmVyO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGF1ZGlvIG9yIHZpZGVvIHN0cmVhbSBlbGVtZW50LlxuICAgICAqL1xuICAgIG15LmNyZWF0ZVN0cmVhbUVsZW1lbnQgPSBmdW5jdGlvbiAoc2lkLCBzdHJlYW0pIHtcbiAgICAgICAgdmFyIGlzVmlkZW8gPSBzdHJlYW0uZ2V0VmlkZW9UcmFja3MoKS5sZW5ndGggPiAwO1xuXG4gICAgICAgIGlmKGlzVmlkZW8pXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbnNvbGUudHJhY2Uoc3RyZWFtKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZWxlbWVudCA9IGlzVmlkZW9cbiAgICAgICAgICAgICAgICAgICAgICAgID8gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndmlkZW8nKVxuICAgICAgICAgICAgICAgICAgICAgICAgOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhdWRpbycpO1xuICAgICAgICB2YXIgaWQgPSAoaXNWaWRlbyA/ICdyZW1vdGVWaWRlb18nIDogJ3JlbW90ZUF1ZGlvXycpXG4gICAgICAgICAgICAgICAgICAgICsgc2lkICsgJ18nICsgc3RyZWFtLmlkO1xuXG4gICAgICAgIGVsZW1lbnQuaWQgPSBpZDtcbiAgICAgICAgZWxlbWVudC5hdXRvcGxheSA9IHRydWU7XG4gICAgICAgIGVsZW1lbnQub25jb250ZXh0bWVudSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGZhbHNlOyB9O1xuXG4gICAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH07XG5cbiAgICBteS5hZGRSZW1vdGVTdHJlYW1FbGVtZW50XG4gICAgICAgID0gZnVuY3Rpb24gKGNvbnRhaW5lciwgc2lkLCBzdHJlYW0sIHBlZXJKaWQsIHRoZXNzcmMpIHtcbiAgICAgICAgdmFyIG5ld0VsZW1lbnRJZCA9IG51bGw7XG5cbiAgICAgICAgdmFyIGlzVmlkZW8gPSBzdHJlYW0uZ2V0VmlkZW9UcmFja3MoKS5sZW5ndGggPiAwO1xuXG4gICAgICAgIGlmIChjb250YWluZXIpIHtcbiAgICAgICAgICAgIHZhciBzdHJlYW1FbGVtZW50ID0gVmlkZW9MYXlvdXQuY3JlYXRlU3RyZWFtRWxlbWVudChzaWQsIHN0cmVhbSk7XG4gICAgICAgICAgICBuZXdFbGVtZW50SWQgPSBzdHJlYW1FbGVtZW50LmlkO1xuXG4gICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoc3RyZWFtRWxlbWVudCk7XG5cbiAgICAgICAgICAgIHZhciBzZWwgPSAkKCcjJyArIG5ld0VsZW1lbnRJZCk7XG4gICAgICAgICAgICBzZWwuaGlkZSgpO1xuXG4gICAgICAgICAgICAvLyBJZiB0aGUgY29udGFpbmVyIGlzIGN1cnJlbnRseSB2aXNpYmxlIHdlIGF0dGFjaCB0aGUgc3RyZWFtLlxuICAgICAgICAgICAgaWYgKCFpc1ZpZGVvXG4gICAgICAgICAgICAgICAgfHwgKGNvbnRhaW5lci5vZmZzZXRQYXJlbnQgIT09IG51bGwgJiYgaXNWaWRlbykpIHtcbiAgICAgICAgICAgICAgICBhdHRhY2hNZWRpYVN0cmVhbShzZWwsIHN0cmVhbSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNWaWRlbylcbiAgICAgICAgICAgICAgICAgICAgd2FpdEZvclJlbW90ZVZpZGVvKHNlbCwgdGhlc3NyYywgc3RyZWFtKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3RyZWFtLm9uZW5kZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3N0cmVhbSBlbmRlZCcsIHRoaXMpO1xuXG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQucmVtb3ZlUmVtb3RlU3RyZWFtRWxlbWVudChzdHJlYW0sIGNvbnRhaW5lcik7XG5cbiAgICAgICAgICAgICAgICBpZiAocGVlckppZClcbiAgICAgICAgICAgICAgICAgICAgZGVwLkNvbnRhY3RMaXN0KCkucmVtb3ZlQ29udGFjdChwZWVySmlkKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIEFkZCBjbGljayBoYW5kbGVyLlxuICAgICAgICAgICAgY29udGFpbmVyLm9uY2xpY2sgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAqIEZJWE1FIEl0IHR1cm5zIG91dCB0aGF0IHZpZGVvVGh1bWIgbWF5IG5vdCBleGlzdCAoaWYgdGhlcmUgaXNcbiAgICAgICAgICAgICAgICAgKiBubyBhY3R1YWwgdmlkZW8pLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHZhciB2aWRlb1RodW1iID0gJCgnIycgKyBjb250YWluZXIuaWQgKyAnPnZpZGVvJykuZ2V0KDApO1xuXG4gICAgICAgICAgICAgICAgaWYgKHZpZGVvVGh1bWIpXG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LmhhbmRsZVZpZGVvVGh1bWJDbGlja2VkKHZpZGVvVGh1bWIuc3JjKTtcblxuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gQWRkIGhvdmVyIGhhbmRsZXJcbiAgICAgICAgICAgICQoY29udGFpbmVyKS5ob3ZlcihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0Rpc3BsYXlOYW1lKGNvbnRhaW5lci5pZCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZpZGVvU3JjID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQoJyMnICsgY29udGFpbmVyLmlkICsgJz52aWRlbycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgJCgnIycgKyBjb250YWluZXIuaWQgKyAnPnZpZGVvJykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcmMgPSAkKCcjJyArIGNvbnRhaW5lci5pZCArICc+dmlkZW8nKS5nZXQoMCkuc3JjO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIHZpZGVvIGhhcyBiZWVuIFwicGlubmVkXCIgYnkgdGhlIHVzZXIgd2Ugd2FudCB0b1xuICAgICAgICAgICAgICAgICAgICAvLyBrZWVwIHRoZSBkaXNwbGF5IG5hbWUgb24gcGxhY2UuXG4gICAgICAgICAgICAgICAgICAgIGlmICghVmlkZW9MYXlvdXQuaXNMYXJnZVZpZGVvVmlzaWJsZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgdmlkZW9TcmMgIT09ICQoJyNsYXJnZVZpZGVvJykuYXR0cignc3JjJykpXG4gICAgICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zaG93RGlzcGxheU5hbWUoY29udGFpbmVyLmlkLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXdFbGVtZW50SWQ7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgdGhlIHJlbW90ZSBzdHJlYW0gZWxlbWVudCBjb3JyZXNwb25kaW5nIHRvIHRoZSBnaXZlbiBzdHJlYW0gYW5kXG4gICAgICogcGFyZW50IGNvbnRhaW5lci5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0gc3RyZWFtIHRoZSBzdHJlYW1cbiAgICAgKiBAcGFyYW0gY29udGFpbmVyXG4gICAgICovXG4gICAgbXkucmVtb3ZlUmVtb3RlU3RyZWFtRWxlbWVudCA9IGZ1bmN0aW9uIChzdHJlYW0sIGNvbnRhaW5lcikge1xuICAgICAgICBpZiAoIWNvbnRhaW5lcilcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICB2YXIgc2VsZWN0ID0gbnVsbDtcbiAgICAgICAgdmFyIHJlbW92ZWRWaWRlb1NyYyA9IG51bGw7XG4gICAgICAgIGlmIChzdHJlYW0uZ2V0VmlkZW9UcmFja3MoKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBzZWxlY3QgPSAkKCcjJyArIGNvbnRhaW5lci5pZCArICc+dmlkZW8nKTtcbiAgICAgICAgICAgIHJlbW92ZWRWaWRlb1NyYyA9IHNlbGVjdC5nZXQoMCkuc3JjO1xuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHNlbGVjdCA9ICQoJyMnICsgY29udGFpbmVyLmlkICsgJz5hdWRpbycpO1xuXG4gICAgICAgIC8vIFJlbW92ZSB2aWRlbyBzb3VyY2UgZnJvbSB0aGUgbWFwcGluZy5cbiAgICAgICAgZGVsZXRlIHZpZGVvU3JjVG9Tc3JjW3JlbW92ZWRWaWRlb1NyY107XG5cbiAgICAgICAgLy8gTWFyayB2aWRlbyBhcyByZW1vdmVkIHRvIGNhbmNlbCB3YWl0aW5nIGxvb3AoaWYgdmlkZW8gaXMgcmVtb3ZlZFxuICAgICAgICAvLyBiZWZvcmUgaGFzIHN0YXJ0ZWQpXG4gICAgICAgIHNlbGVjdC5yZW1vdmVkID0gdHJ1ZTtcbiAgICAgICAgc2VsZWN0LnJlbW92ZSgpO1xuXG4gICAgICAgIHZhciBhdWRpb0NvdW50ID0gJCgnIycgKyBjb250YWluZXIuaWQgKyAnPmF1ZGlvJykubGVuZ3RoO1xuICAgICAgICB2YXIgdmlkZW9Db3VudCA9ICQoJyMnICsgY29udGFpbmVyLmlkICsgJz52aWRlbycpLmxlbmd0aDtcblxuICAgICAgICBpZiAoIWF1ZGlvQ291bnQgJiYgIXZpZGVvQ291bnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVtb3ZlIHdob2xlIHVzZXJcIiwgY29udGFpbmVyLmlkKTtcbiAgICAgICAgICAgIC8vIFJlbW92ZSB3aG9sZSBjb250YWluZXJcbiAgICAgICAgICAgIGNvbnRhaW5lci5yZW1vdmUoKTtcbiAgICAgICAgICAgIFV0aWwucGxheVNvdW5kTm90aWZpY2F0aW9uKCd1c2VyTGVmdCcpO1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplVGh1bWJuYWlscygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlbW92ZWRWaWRlb1NyYylcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZVJlbW92ZWRWaWRlbyhyZW1vdmVkVmlkZW9TcmMpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTaG93L2hpZGUgcGVlciBjb250YWluZXIgZm9yIHRoZSBnaXZlbiByZXNvdXJjZUppZC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzaG93UGVlckNvbnRhaW5lcihyZXNvdXJjZUppZCwgaXNTaG93KSB7XG4gICAgICAgIHZhciBwZWVyQ29udGFpbmVyID0gJCgnI3BhcnRpY2lwYW50XycgKyByZXNvdXJjZUppZCk7XG5cbiAgICAgICAgaWYgKCFwZWVyQ29udGFpbmVyKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIGlmICghcGVlckNvbnRhaW5lci5pcygnOnZpc2libGUnKSAmJiBpc1Nob3cpXG4gICAgICAgICAgICBwZWVyQ29udGFpbmVyLnNob3coKTtcbiAgICAgICAgZWxzZSBpZiAocGVlckNvbnRhaW5lci5pcygnOnZpc2libGUnKSAmJiAhaXNTaG93KVxuICAgICAgICAgICAgcGVlckNvbnRhaW5lci5oaWRlKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGRpc3BsYXkgbmFtZSBmb3IgdGhlIGdpdmVuIHZpZGVvIHNwYW4gaWQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2V0RGlzcGxheU5hbWUodmlkZW9TcGFuSWQsIGRpc3BsYXlOYW1lKSB7XG4gICAgICAgIHZhciBuYW1lU3BhbiA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPnNwYW4uZGlzcGxheW5hbWUnKTtcbiAgICAgICAgdmFyIGRlZmF1bHRMb2NhbERpc3BsYXlOYW1lID0gXCJNZVwiO1xuICAgICAgICB2YXIgZGVmYXVsdFJlbW90ZURpc3BsYXlOYW1lID0gXCJTcGVha2VyXCI7XG5cbiAgICAgICAgLy8gSWYgd2UgYWxyZWFkeSBoYXZlIGEgZGlzcGxheSBuYW1lIGZvciB0aGlzIHZpZGVvLlxuICAgICAgICBpZiAobmFtZVNwYW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdmFyIG5hbWVTcGFuRWxlbWVudCA9IG5hbWVTcGFuLmdldCgwKTtcblxuICAgICAgICAgICAgaWYgKG5hbWVTcGFuRWxlbWVudC5pZCA9PT0gJ2xvY2FsRGlzcGxheU5hbWUnICYmXG4gICAgICAgICAgICAgICAgJCgnI2xvY2FsRGlzcGxheU5hbWUnKS50ZXh0KCkgIT09IGRpc3BsYXlOYW1lKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRpc3BsYXlOYW1lICYmIGRpc3BsYXlOYW1lLmxlbmd0aCA+IDApXG4gICAgICAgICAgICAgICAgICAgICQoJyNsb2NhbERpc3BsYXlOYW1lJykudGV4dChkaXNwbGF5TmFtZSArICcgKG1lKScpO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgJCgnI2xvY2FsRGlzcGxheU5hbWUnKS50ZXh0KGRlZmF1bHRMb2NhbERpc3BsYXlOYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGRpc3BsYXlOYW1lICYmIGRpc3BsYXlOYW1lLmxlbmd0aCA+IDApXG4gICAgICAgICAgICAgICAgICAgICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnX25hbWUnKS50ZXh0KGRpc3BsYXlOYW1lKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnX25hbWUnKS50ZXh0KGRlZmF1bHRSZW1vdGVEaXNwbGF5TmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgZWRpdEJ1dHRvbiA9IG51bGw7XG5cbiAgICAgICAgICAgIG5hbWVTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgbmFtZVNwYW4uY2xhc3NOYW1lID0gJ2Rpc3BsYXluYW1lJztcbiAgICAgICAgICAgICQoJyMnICsgdmlkZW9TcGFuSWQpWzBdLmFwcGVuZENoaWxkKG5hbWVTcGFuKTtcblxuICAgICAgICAgICAgaWYgKHZpZGVvU3BhbklkID09PSAnbG9jYWxWaWRlb0NvbnRhaW5lcicpIHtcbiAgICAgICAgICAgICAgICBlZGl0QnV0dG9uID0gY3JlYXRlRWRpdERpc3BsYXlOYW1lQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgbmFtZVNwYW4uaW5uZXJUZXh0ID0gZGVmYXVsdExvY2FsRGlzcGxheU5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBuYW1lU3Bhbi5pbm5lclRleHQgPSBkZWZhdWx0UmVtb3RlRGlzcGxheU5hbWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChkaXNwbGF5TmFtZSAmJiBkaXNwbGF5TmFtZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgbmFtZVNwYW4uaW5uZXJUZXh0ID0gZGlzcGxheU5hbWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZWRpdEJ1dHRvbikge1xuICAgICAgICAgICAgICAgIG5hbWVTcGFuLmlkID0gdmlkZW9TcGFuSWQgKyAnX25hbWUnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBuYW1lU3Bhbi5pZCA9ICdsb2NhbERpc3BsYXlOYW1lJztcbiAgICAgICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkKVswXS5hcHBlbmRDaGlsZChlZGl0QnV0dG9uKTtcblxuICAgICAgICAgICAgICAgIHZhciBlZGl0YWJsZVRleHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgICAgICAgICAgICAgIGVkaXRhYmxlVGV4dC5jbGFzc05hbWUgPSAnZGlzcGxheW5hbWUnO1xuICAgICAgICAgICAgICAgIGVkaXRhYmxlVGV4dC5pZCA9ICdlZGl0RGlzcGxheU5hbWUnO1xuXG4gICAgICAgICAgICAgICAgaWYgKGRpc3BsYXlOYW1lICYmIGRpc3BsYXlOYW1lLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBlZGl0YWJsZVRleHQudmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgID0gZGlzcGxheU5hbWUuc3Vic3RyaW5nKDAsIGRpc3BsYXlOYW1lLmluZGV4T2YoJyAobWUpJykpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGVkaXRhYmxlVGV4dC5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ2Rpc3BsYXk6bm9uZTsnKTtcbiAgICAgICAgICAgICAgICBlZGl0YWJsZVRleHQuc2V0QXR0cmlidXRlKCdwbGFjZWhvbGRlcicsICdleC4gSmFuZSBQaW5rJyk7XG4gICAgICAgICAgICAgICAgJCgnIycgKyB2aWRlb1NwYW5JZClbMF0uYXBwZW5kQ2hpbGQoZWRpdGFibGVUZXh0KTtcblxuICAgICAgICAgICAgICAgICQoJyNsb2NhbFZpZGVvQ29udGFpbmVyIC5kaXNwbGF5bmFtZScpXG4gICAgICAgICAgICAgICAgICAgIC5iaW5kKFwiY2xpY2tcIiwgZnVuY3Rpb24gKGUpIHtcblxuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNsb2NhbERpc3BsYXlOYW1lJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkKCcjZWRpdERpc3BsYXlOYW1lJykuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkKCcjZWRpdERpc3BsYXlOYW1lJykuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2VkaXREaXNwbGF5TmFtZScpLnNlbGVjdCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBpbnB1dERpc3BsYXlOYW1lSGFuZGxlciA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmlja25hbWUgIT09IG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuaWNrbmFtZSA9IG5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5kaXNwbGF5bmFtZSA9IG5pY2tuYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Yy5hZGREaXNwbGF5TmFtZVRvUHJlc2VuY2Uobmlja25hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Yy5zZW5kUHJlc2VuY2UoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlcC5DaGF0KCkuc2V0Q2hhdENvbnZlcnNhdGlvbk1vZGUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghJCgnI2xvY2FsRGlzcGxheU5hbWUnKS5pcyhcIjp2aXNpYmxlXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5pY2tuYW1lKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjbG9jYWxEaXNwbGF5TmFtZScpLnRleHQobmlja25hbWUgKyBcIiAobWUpXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI2xvY2FsRGlzcGxheU5hbWUnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRleHQoZGVmYXVsdExvY2FsRGlzcGxheU5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNsb2NhbERpc3BsYXlOYW1lJykuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcjZWRpdERpc3BsYXlOYW1lJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICQoJyNlZGl0RGlzcGxheU5hbWUnKS5vbmUoXCJmb2N1c291dFwiLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXREaXNwbGF5TmFtZUhhbmRsZXIodGhpcy52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICQoJyNlZGl0RGlzcGxheU5hbWUnKS5vbigna2V5ZG93bicsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxMykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dERpc3BsYXlOYW1lSGFuZGxlcih0aGlzLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2hvd3MvaGlkZXMgdGhlIGRpc3BsYXkgbmFtZSBvbiB0aGUgcmVtb3RlIHZpZGVvLlxuICAgICAqIEBwYXJhbSB2aWRlb1NwYW5JZCB0aGUgaWRlbnRpZmllciBvZiB0aGUgdmlkZW8gc3BhbiBlbGVtZW50XG4gICAgICogQHBhcmFtIGlzU2hvdyBpbmRpY2F0ZXMgaWYgdGhlIGRpc3BsYXkgbmFtZSBzaG91bGQgYmUgc2hvd24gb3IgaGlkZGVuXG4gICAgICovXG4gICAgbXkuc2hvd0Rpc3BsYXlOYW1lID0gZnVuY3Rpb24odmlkZW9TcGFuSWQsIGlzU2hvdykge1xuICAgICAgICB2YXIgbmFtZVNwYW4gPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5zcGFuLmRpc3BsYXluYW1lJykuZ2V0KDApO1xuICAgICAgICBpZiAoaXNTaG93KSB7XG4gICAgICAgICAgICBpZiAobmFtZVNwYW4gJiYgbmFtZVNwYW4uaW5uZXJIVE1MICYmIG5hbWVTcGFuLmlubmVySFRNTC5sZW5ndGgpIFxuICAgICAgICAgICAgICAgIG5hbWVTcGFuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTppbmxpbmUtYmxvY2s7XCIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKG5hbWVTcGFuKVxuICAgICAgICAgICAgICAgIG5hbWVTcGFuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTpub25lO1wiKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTaG93cyB0aGUgcHJlc2VuY2Ugc3RhdHVzIG1lc3NhZ2UgZm9yIHRoZSBnaXZlbiB2aWRlby5cbiAgICAgKi9cbiAgICBteS5zZXRQcmVzZW5jZVN0YXR1cyA9IGZ1bmN0aW9uICh2aWRlb1NwYW5JZCwgc3RhdHVzTXNnKSB7XG5cbiAgICAgICAgaWYgKCEkKCcjJyArIHZpZGVvU3BhbklkKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIE5vIGNvbnRhaW5lclxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHN0YXR1c1NwYW4gPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5zcGFuLnN0YXR1cycpO1xuICAgICAgICBpZiAoIXN0YXR1c1NwYW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAvL0FkZCBzdGF0dXMgc3BhblxuICAgICAgICAgICAgc3RhdHVzU3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIHN0YXR1c1NwYW4uY2xhc3NOYW1lID0gJ3N0YXR1cyc7XG4gICAgICAgICAgICBzdGF0dXNTcGFuLmlkID0gdmlkZW9TcGFuSWQgKyAnX3N0YXR1cyc7XG4gICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkKVswXS5hcHBlbmRDaGlsZChzdGF0dXNTcGFuKTtcblxuICAgICAgICAgICAgc3RhdHVzU3BhbiA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPnNwYW4uc3RhdHVzJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEaXNwbGF5IHN0YXR1c1xuICAgICAgICBpZiAoc3RhdHVzTXNnICYmIHN0YXR1c01zZy5sZW5ndGgpIHtcbiAgICAgICAgICAgICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnX3N0YXR1cycpLnRleHQoc3RhdHVzTXNnKTtcbiAgICAgICAgICAgIHN0YXR1c1NwYW4uZ2V0KDApLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTppbmxpbmUtYmxvY2s7XCIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZVxuICAgICAgICAgICAgc3RhdHVzU3Bhbi5nZXQoMCkuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJkaXNwbGF5Om5vbmU7XCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3dzIGEgdmlzdWFsIGluZGljYXRvciBmb3IgdGhlIGZvY3VzIG9mIHRoZSBjb25mZXJlbmNlLlxuICAgICAqIEN1cnJlbnRseSBpZiB3ZSdyZSBub3QgdGhlIG93bmVyIG9mIHRoZSBjb25mZXJlbmNlIHdlIG9idGFpbiB0aGUgZm9jdXNcbiAgICAgKiBmcm9tIHRoZSBjb25uZWN0aW9uLmppbmdsZS5zZXNzaW9ucy5cbiAgICAgKi9cbiAgICBteS5zaG93Rm9jdXNJbmRpY2F0b3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKGZvY3VzICE9PSBudWxsKSB7XG4gICAgICAgICAgICB2YXIgaW5kaWNhdG9yU3BhbiA9ICQoJyNsb2NhbFZpZGVvQ29udGFpbmVyIC5mb2N1c2luZGljYXRvcicpO1xuXG4gICAgICAgICAgICBpZiAoaW5kaWNhdG9yU3Bhbi5jaGlsZHJlbigpLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjcmVhdGVGb2N1c0luZGljYXRvckVsZW1lbnQoaW5kaWNhdG9yU3BhblswXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoT2JqZWN0LmtleXMoY29ubmVjdGlvbi5qaW5nbGUuc2Vzc2lvbnMpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIElmIHdlJ3JlIG9ubHkgYSBwYXJ0aWNpcGFudCB0aGUgZm9jdXMgd2lsbCBiZSB0aGUgb25seSBzZXNzaW9uIHdlIGhhdmUuXG4gICAgICAgICAgICB2YXIgc2Vzc2lvblxuICAgICAgICAgICAgICAgID0gY29ubmVjdGlvbi5qaW5nbGUuc2Vzc2lvbnNcbiAgICAgICAgICAgICAgICAgICAgW09iamVjdC5rZXlzKGNvbm5lY3Rpb24uamluZ2xlLnNlc3Npb25zKVswXV07XG4gICAgICAgICAgICB2YXIgZm9jdXNJZFxuICAgICAgICAgICAgICAgID0gJ3BhcnRpY2lwYW50XycgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChzZXNzaW9uLnBlZXJqaWQpO1xuXG4gICAgICAgICAgICB2YXIgZm9jdXNDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChmb2N1c0lkKTtcbiAgICAgICAgICAgIGlmICghZm9jdXNDb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiTm8gZm9jdXMgY29udGFpbmVyIVwiKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaW5kaWNhdG9yU3BhbiA9ICQoJyMnICsgZm9jdXNJZCArICcgLmZvY3VzaW5kaWNhdG9yJyk7XG5cbiAgICAgICAgICAgIGlmICghaW5kaWNhdG9yU3BhbiB8fCBpbmRpY2F0b3JTcGFuLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGluZGljYXRvclNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICAgICAgaW5kaWNhdG9yU3Bhbi5jbGFzc05hbWUgPSAnZm9jdXNpbmRpY2F0b3InO1xuXG4gICAgICAgICAgICAgICAgZm9jdXNDb250YWluZXIuYXBwZW5kQ2hpbGQoaW5kaWNhdG9yU3Bhbik7XG5cbiAgICAgICAgICAgICAgICBjcmVhdGVGb2N1c0luZGljYXRvckVsZW1lbnQoaW5kaWNhdG9yU3Bhbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2hvd3MgdmlkZW8gbXV0ZWQgaW5kaWNhdG9yIG92ZXIgc21hbGwgdmlkZW9zLlxuICAgICAqL1xuICAgIG15LnNob3dWaWRlb0luZGljYXRvciA9IGZ1bmN0aW9uKHZpZGVvU3BhbklkLCBpc011dGVkKSB7XG4gICAgICAgIHZhciB2aWRlb011dGVkU3BhbiA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPnNwYW4udmlkZW9NdXRlZCcpO1xuXG4gICAgICAgIGlmIChpc011dGVkID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgICBpZiAodmlkZW9NdXRlZFNwYW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHZpZGVvTXV0ZWRTcGFuLnJlbW92ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGF1ZGlvTXV0ZWRTcGFuID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+c3Bhbi5hdWRpb011dGVkJyk7XG5cbiAgICAgICAgICAgIHZpZGVvTXV0ZWRTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgdmlkZW9NdXRlZFNwYW4uY2xhc3NOYW1lID0gJ3ZpZGVvTXV0ZWQnO1xuICAgICAgICAgICAgaWYgKGF1ZGlvTXV0ZWRTcGFuKSB7XG4gICAgICAgICAgICAgICAgdmlkZW9NdXRlZFNwYW4ucmlnaHQgPSAnMzBweCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkKVswXS5hcHBlbmRDaGlsZCh2aWRlb011dGVkU3Bhbik7XG5cbiAgICAgICAgICAgIHZhciBtdXRlZEluZGljYXRvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2knKTtcbiAgICAgICAgICAgIG11dGVkSW5kaWNhdG9yLmNsYXNzTmFtZSA9ICdpY29uLWNhbWVyYS1kaXNhYmxlZCc7XG4gICAgICAgICAgICBVdGlsLnNldFRvb2x0aXAobXV0ZWRJbmRpY2F0b3IsXG4gICAgICAgICAgICAgICAgICAgIFwiUGFydGljaXBhbnQgaGFzPGJyLz5zdG9wcGVkIHRoZSBjYW1lcmEuXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidG9wXCIpO1xuICAgICAgICAgICAgdmlkZW9NdXRlZFNwYW4uYXBwZW5kQ2hpbGQobXV0ZWRJbmRpY2F0b3IpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3dzIGF1ZGlvIG11dGVkIGluZGljYXRvciBvdmVyIHNtYWxsIHZpZGVvcy5cbiAgICAgKi9cbiAgICBteS5zaG93QXVkaW9JbmRpY2F0b3IgPSBmdW5jdGlvbih2aWRlb1NwYW5JZCwgaXNNdXRlZCkge1xuICAgICAgICB2YXIgYXVkaW9NdXRlZFNwYW4gPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5zcGFuLmF1ZGlvTXV0ZWQnKTtcblxuICAgICAgICBpZiAoaXNNdXRlZCA9PT0gJ2ZhbHNlJykge1xuICAgICAgICAgICAgaWYgKGF1ZGlvTXV0ZWRTcGFuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBhdWRpb011dGVkU3Bhbi5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciB2aWRlb011dGVkU3BhbiA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPnNwYW4udmlkZW9NdXRlZCcpO1xuXG4gICAgICAgICAgICBhdWRpb011dGVkU3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIGF1ZGlvTXV0ZWRTcGFuLmNsYXNzTmFtZSA9ICdhdWRpb011dGVkJztcbiAgICAgICAgICAgIFV0aWwuc2V0VG9vbHRpcChhdWRpb011dGVkU3BhbixcbiAgICAgICAgICAgICAgICAgICAgXCJQYXJ0aWNpcGFudCBpcyBtdXRlZFwiLFxuICAgICAgICAgICAgICAgICAgICBcInRvcFwiKTtcblxuICAgICAgICAgICAgaWYgKHZpZGVvTXV0ZWRTcGFuKSB7XG4gICAgICAgICAgICAgICAgYXVkaW9NdXRlZFNwYW4ucmlnaHQgPSAnMzBweCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkKVswXS5hcHBlbmRDaGlsZChhdWRpb011dGVkU3Bhbik7XG5cbiAgICAgICAgICAgIHZhciBtdXRlZEluZGljYXRvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2knKTtcbiAgICAgICAgICAgIG11dGVkSW5kaWNhdG9yLmNsYXNzTmFtZSA9ICdpY29uLW1pYy1kaXNhYmxlZCc7XG4gICAgICAgICAgICBhdWRpb011dGVkU3Bhbi5hcHBlbmRDaGlsZChtdXRlZEluZGljYXRvcik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVzaXplcyB0aGUgbGFyZ2UgdmlkZW8gY29udGFpbmVyLlxuICAgICAqL1xuICAgIG15LnJlc2l6ZUxhcmdlVmlkZW9Db250YWluZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGRlcC5DaGF0KCkucmVzaXplQ2hhdCgpO1xuICAgICAgICB2YXIgYXZhaWxhYmxlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICB2YXIgYXZhaWxhYmxlV2lkdGggPSBkZXAuVUlVdGlsKCkuZ2V0QXZhaWxhYmxlVmlkZW9XaWR0aCgpO1xuICAgICAgICBpZiAoYXZhaWxhYmxlV2lkdGggPCAwIHx8IGF2YWlsYWJsZUhlaWdodCA8IDApIHJldHVybjtcblxuICAgICAgICAkKCcjdmlkZW9zcGFjZScpLndpZHRoKGF2YWlsYWJsZVdpZHRoKTtcbiAgICAgICAgJCgnI3ZpZGVvc3BhY2UnKS5oZWlnaHQoYXZhaWxhYmxlSGVpZ2h0KTtcbiAgICAgICAgJCgnI2xhcmdlVmlkZW9Db250YWluZXInKS53aWR0aChhdmFpbGFibGVXaWR0aCk7XG4gICAgICAgICQoJyNsYXJnZVZpZGVvQ29udGFpbmVyJykuaGVpZ2h0KGF2YWlsYWJsZUhlaWdodCk7XG5cbiAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplVGh1bWJuYWlscygpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXNpemVzIHRodW1ibmFpbHMuXG4gICAgICovXG4gICAgbXkucmVzaXplVGh1bWJuYWlscyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmlkZW9TcGFjZVdpZHRoID0gJCgnI3JlbW90ZVZpZGVvcycpLndpZHRoKCk7XG5cbiAgICAgICAgdmFyIHRodW1ibmFpbFNpemUgPSBWaWRlb0xheW91dC5jYWxjdWxhdGVUaHVtYm5haWxTaXplKHZpZGVvU3BhY2VXaWR0aCk7XG4gICAgICAgIHZhciB3aWR0aCA9IHRodW1ibmFpbFNpemVbMF07XG4gICAgICAgIHZhciBoZWlnaHQgPSB0aHVtYm5haWxTaXplWzFdO1xuXG4gICAgICAgIC8vIHNpemUgdmlkZW9zIHNvIHRoYXQgd2hpbGUga2VlcGluZyBBUiBhbmQgbWF4IGhlaWdodCwgd2UgaGF2ZSBhXG4gICAgICAgIC8vIG5pY2UgZml0XG4gICAgICAgICQoJyNyZW1vdGVWaWRlb3MnKS5oZWlnaHQoaGVpZ2h0KTtcbiAgICAgICAgJCgnI3JlbW90ZVZpZGVvcz5zcGFuJykud2lkdGgod2lkdGgpO1xuICAgICAgICAkKCcjcmVtb3RlVmlkZW9zPnNwYW4nKS5oZWlnaHQoaGVpZ2h0KTtcblxuICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKFwicmVtb3RldmlkZW8ucmVzaXplZFwiLCBbd2lkdGgsIGhlaWdodF0pO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBFbmFibGVzIHRoZSBkb21pbmFudCBzcGVha2VyIFVJLlxuICAgICAqXG4gICAgICogQHBhcmFtIHJlc291cmNlSmlkIHRoZSBqaWQgaW5kaWNhdGluZyB0aGUgdmlkZW8gZWxlbWVudCB0b1xuICAgICAqIGFjdGl2YXRlL2RlYWN0aXZhdGVcbiAgICAgKiBAcGFyYW0gaXNFbmFibGUgaW5kaWNhdGVzIGlmIHRoZSBkb21pbmFudCBzcGVha2VyIHNob3VsZCBiZSBlbmFibGVkIG9yXG4gICAgICogZGlzYWJsZWRcbiAgICAgKi9cbiAgICBteS5lbmFibGVEb21pbmFudFNwZWFrZXIgPSBmdW5jdGlvbihyZXNvdXJjZUppZCwgaXNFbmFibGUpIHtcbiAgICAgICAgdmFyIGRpc3BsYXlOYW1lID0gcmVzb3VyY2VKaWQ7XG4gICAgICAgIHZhciBuYW1lU3BhbiA9ICQoJyNwYXJ0aWNpcGFudF8nICsgcmVzb3VyY2VKaWQgKyAnPnNwYW4uZGlzcGxheW5hbWUnKTtcbiAgICAgICAgaWYgKG5hbWVTcGFuLmxlbmd0aCA+IDApXG4gICAgICAgICAgICBkaXNwbGF5TmFtZSA9IG5hbWVTcGFuLnRleHQoKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIlVJIGVuYWJsZSBkb21pbmFudCBzcGVha2VyXCIsXG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lLFxuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZUppZCxcbiAgICAgICAgICAgICAgICAgICAgaXNFbmFibGUpO1xuXG4gICAgICAgIHZhciB2aWRlb1NwYW5JZCA9IG51bGw7XG4gICAgICAgIHZhciB2aWRlb0NvbnRhaW5lcklkID0gbnVsbDtcbiAgICAgICAgaWYgKHJlc291cmNlSmlkXG4gICAgICAgICAgICAgICAgPT09IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQpKSB7XG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdsb2NhbFZpZGVvV3JhcHBlcic7XG4gICAgICAgICAgICB2aWRlb0NvbnRhaW5lcklkID0gJ2xvY2FsVmlkZW9Db250YWluZXInO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAncGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkO1xuICAgICAgICAgICAgdmlkZW9Db250YWluZXJJZCA9IHZpZGVvU3BhbklkO1xuICAgICAgICB9XG5cbiAgICAgICAgdmlkZW9TcGFuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodmlkZW9Db250YWluZXJJZCk7XG5cbiAgICAgICAgaWYgKCF2aWRlb1NwYW4pIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJObyB2aWRlbyBlbGVtZW50IGZvciBqaWRcIiwgcmVzb3VyY2VKaWQpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHZpZGVvID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+dmlkZW8nKTtcblxuICAgICAgICBpZiAodmlkZW8gJiYgdmlkZW8ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKGlzRW5hYmxlKSB7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0Rpc3BsYXlOYW1lKHZpZGVvQ29udGFpbmVySWQsIHRydWUpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCF2aWRlb1NwYW4uY2xhc3NMaXN0LmNvbnRhaW5zKFwiZG9taW5hbnRzcGVha2VyXCIpKVxuICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYW4uY2xhc3NMaXN0LmFkZChcImRvbWluYW50c3BlYWtlclwiKTtcblxuICAgICAgICAgICAgICAgIHZpZGVvLmNzcyh7dmlzaWJpbGl0eTogJ2hpZGRlbid9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dEaXNwbGF5TmFtZSh2aWRlb0NvbnRhaW5lcklkLCBmYWxzZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAodmlkZW9TcGFuLmNsYXNzTGlzdC5jb250YWlucyhcImRvbWluYW50c3BlYWtlclwiKSlcbiAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFuLmNsYXNzTGlzdC5yZW1vdmUoXCJkb21pbmFudHNwZWFrZXJcIik7XG5cbiAgICAgICAgICAgICAgICB2aWRlby5jc3Moe3Zpc2liaWxpdHk6ICd2aXNpYmxlJ30pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIHNlbGVjdG9yIG9mIHZpZGVvIHRodW1ibmFpbCBjb250YWluZXIgZm9yIHRoZSB1c2VyIGlkZW50aWZpZWQgYnlcbiAgICAgKiBnaXZlbiA8dHQ+dXNlckppZDwvdHQ+XG4gICAgICogQHBhcmFtIHVzZXJKaWQgdXNlcidzIEppZCBmb3Igd2hvbSB3ZSB3YW50IHRvIGdldCB0aGUgdmlkZW8gY29udGFpbmVyLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFBhcnRpY2lwYW50Q29udGFpbmVyKHVzZXJKaWQpXG4gICAge1xuICAgICAgICBpZiAoIXVzZXJKaWQpXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgICBpZiAodXNlckppZCA9PT0gY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZClcbiAgICAgICAgICAgIHJldHVybiAkKFwiI2xvY2FsVmlkZW9Db250YWluZXJcIik7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiAkKFwiI3BhcnRpY2lwYW50X1wiICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQodXNlckppZCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIHNpemUgYW5kIHBvc2l0aW9uIG9mIHRoZSBnaXZlbiB2aWRlbyBlbGVtZW50LlxuICAgICAqXG4gICAgICogQHBhcmFtIHZpZGVvIHRoZSB2aWRlbyBlbGVtZW50IHRvIHBvc2l0aW9uXG4gICAgICogQHBhcmFtIHdpZHRoIHRoZSBkZXNpcmVkIHZpZGVvIHdpZHRoXG4gICAgICogQHBhcmFtIGhlaWdodCB0aGUgZGVzaXJlZCB2aWRlbyBoZWlnaHRcbiAgICAgKiBAcGFyYW0gaG9yaXpvbnRhbEluZGVudCB0aGUgbGVmdCBhbmQgcmlnaHQgaW5kZW50XG4gICAgICogQHBhcmFtIHZlcnRpY2FsSW5kZW50IHRoZSB0b3AgYW5kIGJvdHRvbSBpbmRlbnRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBwb3NpdGlvblZpZGVvKHZpZGVvLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBob3Jpem9udGFsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVydGljYWxJbmRlbnQpIHtcbiAgICAgICAgdmlkZW8ud2lkdGgod2lkdGgpO1xuICAgICAgICB2aWRlby5oZWlnaHQoaGVpZ2h0KTtcbiAgICAgICAgdmlkZW8uY3NzKHsgIHRvcDogdmVydGljYWxJbmRlbnQgKyAncHgnLFxuICAgICAgICAgICAgICAgICAgICAgYm90dG9tOiB2ZXJ0aWNhbEluZGVudCArICdweCcsXG4gICAgICAgICAgICAgICAgICAgICBsZWZ0OiBob3Jpem9udGFsSW5kZW50ICsgJ3B4JyxcbiAgICAgICAgICAgICAgICAgICAgIHJpZ2h0OiBob3Jpem9udGFsSW5kZW50ICsgJ3B4J30pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIHRodW1ibmFpbCBzaXplLlxuICAgICAqXG4gICAgICogQHBhcmFtIHZpZGVvU3BhY2VXaWR0aCB0aGUgd2lkdGggb2YgdGhlIHZpZGVvIHNwYWNlXG4gICAgICovXG4gICAgbXkuY2FsY3VsYXRlVGh1bWJuYWlsU2l6ZSA9IGZ1bmN0aW9uICh2aWRlb1NwYWNlV2lkdGgpIHtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRoZSBhdmFpbGFibGUgaGVpZ2h0LCB3aGljaCBpcyB0aGUgaW5uZXIgd2luZG93IGhlaWdodCBtaW51c1xuICAgICAgIC8vIDM5cHggZm9yIHRoZSBoZWFkZXIgbWludXMgMnB4IGZvciB0aGUgZGVsaW1pdGVyIGxpbmVzIG9uIHRoZSB0b3AgYW5kXG4gICAgICAgLy8gYm90dG9tIG9mIHRoZSBsYXJnZSB2aWRlbywgbWludXMgdGhlIDM2cHggc3BhY2UgaW5zaWRlIHRoZSByZW1vdGVWaWRlb3NcbiAgICAgICAvLyBjb250YWluZXIgdXNlZCBmb3IgaGlnaGxpZ2h0aW5nIHNoYWRvdy5cbiAgICAgICB2YXIgYXZhaWxhYmxlSGVpZ2h0ID0gMTAwO1xuXG4gICAgICAgdmFyIG51bXZpZHMgPSAwO1xuICAgICAgIGlmIChsYXN0TkNvdW50ICYmIGxhc3ROQ291bnQgPiAwKVxuICAgICAgICAgICBudW12aWRzID0gbGFzdE5Db3VudCArIDE7XG4gICAgICAgZWxzZVxuICAgICAgICAgICBudW12aWRzID0gJCgnI3JlbW90ZVZpZGVvcz5zcGFuOnZpc2libGUnKS5sZW5ndGg7XG5cbiAgICAgICAvLyBSZW1vdmUgdGhlIDNweCBib3JkZXJzIGFycm91bmQgdmlkZW9zIGFuZCBib3JkZXIgYXJvdW5kIHRoZSByZW1vdGVcbiAgICAgICAvLyB2aWRlb3MgYXJlYVxuICAgICAgIHZhciBhdmFpbGFibGVXaW5XaWR0aCA9IHZpZGVvU3BhY2VXaWR0aCAtIDIgKiAzICogbnVtdmlkcyAtIDcwO1xuXG4gICAgICAgdmFyIGF2YWlsYWJsZVdpZHRoID0gYXZhaWxhYmxlV2luV2lkdGggLyBudW12aWRzO1xuICAgICAgIHZhciBhc3BlY3RSYXRpbyA9IDE2LjAgLyA5LjA7XG4gICAgICAgdmFyIG1heEhlaWdodCA9IE1hdGgubWluKDE2MCwgYXZhaWxhYmxlSGVpZ2h0KTtcbiAgICAgICBhdmFpbGFibGVIZWlnaHQgPSBNYXRoLm1pbihtYXhIZWlnaHQsIGF2YWlsYWJsZVdpZHRoIC8gYXNwZWN0UmF0aW8pO1xuICAgICAgIGlmIChhdmFpbGFibGVIZWlnaHQgPCBhdmFpbGFibGVXaWR0aCAvIGFzcGVjdFJhdGlvKSB7XG4gICAgICAgICAgIGF2YWlsYWJsZVdpZHRoID0gTWF0aC5mbG9vcihhdmFpbGFibGVIZWlnaHQgKiBhc3BlY3RSYXRpbyk7XG4gICAgICAgfVxuXG4gICAgICAgcmV0dXJuIFthdmFpbGFibGVXaWR0aCwgYXZhaWxhYmxlSGVpZ2h0XTtcbiAgIH07XG5cbiAgIC8qKlxuICAgICogUmV0dXJucyBhbiBhcnJheSBvZiB0aGUgdmlkZW8gZGltZW5zaW9ucywgc28gdGhhdCBpdCBrZWVwcyBpdCdzIGFzcGVjdFxuICAgICogcmF0aW8gYW5kIGZpdHMgYXZhaWxhYmxlIGFyZWEgd2l0aCBpdCdzIGxhcmdlciBkaW1lbnNpb24uIFRoaXMgbWV0aG9kXG4gICAgKiBlbnN1cmVzIHRoYXQgd2hvbGUgdmlkZW8gd2lsbCBiZSB2aXNpYmxlIGFuZCBjYW4gbGVhdmUgZW1wdHkgYXJlYXMuXG4gICAgKlxuICAgICogQHJldHVybiBhbiBhcnJheSB3aXRoIDIgZWxlbWVudHMsIHRoZSB2aWRlbyB3aWR0aCBhbmQgdGhlIHZpZGVvIGhlaWdodFxuICAgICovXG4gICBmdW5jdGlvbiBnZXREZXNrdG9wVmlkZW9TaXplKHZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VIZWlnaHQpIHtcbiAgICAgICBpZiAoIXZpZGVvV2lkdGgpXG4gICAgICAgICAgIHZpZGVvV2lkdGggPSBjdXJyZW50VmlkZW9XaWR0aDtcbiAgICAgICBpZiAoIXZpZGVvSGVpZ2h0KVxuICAgICAgICAgICB2aWRlb0hlaWdodCA9IGN1cnJlbnRWaWRlb0hlaWdodDtcblxuICAgICAgIHZhciBhc3BlY3RSYXRpbyA9IHZpZGVvV2lkdGggLyB2aWRlb0hlaWdodDtcblxuICAgICAgIHZhciBhdmFpbGFibGVXaWR0aCA9IE1hdGgubWF4KHZpZGVvV2lkdGgsIHZpZGVvU3BhY2VXaWR0aCk7XG4gICAgICAgdmFyIGF2YWlsYWJsZUhlaWdodCA9IE1hdGgubWF4KHZpZGVvSGVpZ2h0LCB2aWRlb1NwYWNlSGVpZ2h0KTtcblxuICAgICAgIHZpZGVvU3BhY2VIZWlnaHQgLT0gJCgnI3JlbW90ZVZpZGVvcycpLm91dGVySGVpZ2h0KCk7XG5cbiAgICAgICBpZiAoYXZhaWxhYmxlV2lkdGggLyBhc3BlY3RSYXRpbyA+PSB2aWRlb1NwYWNlSGVpZ2h0KVxuICAgICAgIHtcbiAgICAgICAgICAgYXZhaWxhYmxlSGVpZ2h0ID0gdmlkZW9TcGFjZUhlaWdodDtcbiAgICAgICAgICAgYXZhaWxhYmxlV2lkdGggPSBhdmFpbGFibGVIZWlnaHQgKiBhc3BlY3RSYXRpbztcbiAgICAgICB9XG5cbiAgICAgICBpZiAoYXZhaWxhYmxlSGVpZ2h0ICogYXNwZWN0UmF0aW8gPj0gdmlkZW9TcGFjZVdpZHRoKVxuICAgICAgIHtcbiAgICAgICAgICAgYXZhaWxhYmxlV2lkdGggPSB2aWRlb1NwYWNlV2lkdGg7XG4gICAgICAgICAgIGF2YWlsYWJsZUhlaWdodCA9IGF2YWlsYWJsZVdpZHRoIC8gYXNwZWN0UmF0aW87XG4gICAgICAgfVxuXG4gICAgICAgcmV0dXJuIFthdmFpbGFibGVXaWR0aCwgYXZhaWxhYmxlSGVpZ2h0XTtcbiAgIH1cblxuXG4vKipcbiAgICAgKiBSZXR1cm5zIGFuIGFycmF5IG9mIHRoZSB2aWRlbyBkaW1lbnNpb25zLCBzbyB0aGF0IGl0IGNvdmVycyB0aGUgc2NyZWVuLlxuICAgICAqIEl0IGxlYXZlcyBubyBlbXB0eSBhcmVhcywgYnV0IHNvbWUgcGFydHMgb2YgdGhlIHZpZGVvIG1pZ2h0IG5vdCBiZSB2aXNpYmxlLlxuICAgICAqXG4gICAgICogQHJldHVybiBhbiBhcnJheSB3aXRoIDIgZWxlbWVudHMsIHRoZSB2aWRlbyB3aWR0aCBhbmQgdGhlIHZpZGVvIGhlaWdodFxuICAgICAqL1xuICAgIG15LmdldENhbWVyYVZpZGVvU2l6ZSA9IGZ1bmN0aW9uKHZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VIZWlnaHQpIHtcbiAgICAgICAgaWYgKCF2aWRlb1dpZHRoKVxuICAgICAgICAgICAgdmlkZW9XaWR0aCA9IGN1cnJlbnRWaWRlb1dpZHRoO1xuICAgICAgICBpZiAoIXZpZGVvSGVpZ2h0KVxuICAgICAgICAgICAgdmlkZW9IZWlnaHQgPSBjdXJyZW50VmlkZW9IZWlnaHQ7XG5cbiAgICAgICAgdmFyIGFzcGVjdFJhdGlvID0gdmlkZW9XaWR0aCAvIHZpZGVvSGVpZ2h0O1xuXG4gICAgICAgIHZhciBhdmFpbGFibGVXaWR0aCA9IE1hdGgubWF4KHZpZGVvV2lkdGgsIHZpZGVvU3BhY2VXaWR0aCk7XG4gICAgICAgIHZhciBhdmFpbGFibGVIZWlnaHQgPSBNYXRoLm1heCh2aWRlb0hlaWdodCwgdmlkZW9TcGFjZUhlaWdodCk7XG5cbiAgICAgICAgaWYgKGF2YWlsYWJsZVdpZHRoIC8gYXNwZWN0UmF0aW8gPCB2aWRlb1NwYWNlSGVpZ2h0KSB7XG4gICAgICAgICAgICBhdmFpbGFibGVIZWlnaHQgPSB2aWRlb1NwYWNlSGVpZ2h0O1xuICAgICAgICAgICAgYXZhaWxhYmxlV2lkdGggPSBhdmFpbGFibGVIZWlnaHQgKiBhc3BlY3RSYXRpbztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhdmFpbGFibGVIZWlnaHQgKiBhc3BlY3RSYXRpbyA8IHZpZGVvU3BhY2VXaWR0aCkge1xuICAgICAgICAgICAgYXZhaWxhYmxlV2lkdGggPSB2aWRlb1NwYWNlV2lkdGg7XG4gICAgICAgICAgICBhdmFpbGFibGVIZWlnaHQgPSBhdmFpbGFibGVXaWR0aCAvIGFzcGVjdFJhdGlvO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFthdmFpbGFibGVXaWR0aCwgYXZhaWxhYmxlSGVpZ2h0XTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGFuIGFycmF5IG9mIHRoZSB2aWRlbyBob3Jpem9udGFsIGFuZCB2ZXJ0aWNhbCBpbmRlbnRzLFxuICAgICAqIHNvIHRoYXQgaWYgZml0cyBpdHMgcGFyZW50LlxuICAgICAqXG4gICAgICogQHJldHVybiBhbiBhcnJheSB3aXRoIDIgZWxlbWVudHMsIHRoZSBob3Jpem9udGFsIGluZGVudCBhbmQgdGhlIHZlcnRpY2FsXG4gICAgICogaW5kZW50XG4gICAgICovXG4gICAgbXkuZ2V0Q2FtZXJhVmlkZW9Qb3NpdGlvbiA9IGZ1bmN0aW9uKHZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VIZWlnaHQpIHtcbiAgICAgICAgLy8gUGFyZW50IGhlaWdodCBpc24ndCBjb21wbGV0ZWx5IGNhbGN1bGF0ZWQgd2hlbiB3ZSBwb3NpdGlvbiB0aGUgdmlkZW8gaW5cbiAgICAgICAgLy8gZnVsbCBzY3JlZW4gbW9kZSBhbmQgdGhpcyBpcyB3aHkgd2UgdXNlIHRoZSBzY3JlZW4gaGVpZ2h0IGluIHRoaXMgY2FzZS5cbiAgICAgICAgLy8gTmVlZCB0byB0aGluayBpdCBmdXJ0aGVyIGF0IHNvbWUgcG9pbnQgYW5kIGltcGxlbWVudCBpdCBwcm9wZXJseS5cbiAgICAgICAgdmFyIGlzRnVsbFNjcmVlbiA9IGRvY3VtZW50LmZ1bGxTY3JlZW4gfHxcbiAgICAgICAgICAgIGRvY3VtZW50Lm1vekZ1bGxTY3JlZW4gfHxcbiAgICAgICAgICAgIGRvY3VtZW50LndlYmtpdElzRnVsbFNjcmVlbjtcbiAgICAgICAgaWYgKGlzRnVsbFNjcmVlbilcbiAgICAgICAgICAgIHZpZGVvU3BhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG5cbiAgICAgICAgdmFyIGhvcml6b250YWxJbmRlbnQgPSAodmlkZW9TcGFjZVdpZHRoIC0gdmlkZW9XaWR0aCkgLyAyO1xuICAgICAgICB2YXIgdmVydGljYWxJbmRlbnQgPSAodmlkZW9TcGFjZUhlaWdodCAtIHZpZGVvSGVpZ2h0KSAvIDI7XG5cbiAgICAgICAgcmV0dXJuIFtob3Jpem9udGFsSW5kZW50LCB2ZXJ0aWNhbEluZGVudF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyB0aGUgZWRpdCBkaXNwbGF5IG5hbWUgYnV0dG9uLlxuICAgICAqXG4gICAgICogQHJldHVybnMgdGhlIGVkaXQgYnV0dG9uXG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlRWRpdERpc3BsYXlOYW1lQnV0dG9uKCkge1xuICAgICAgICB2YXIgZWRpdEJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgZWRpdEJ1dHRvbi5jbGFzc05hbWUgPSAnZGlzcGxheW5hbWUnO1xuICAgICAgICBVdGlsLnNldFRvb2x0aXAoZWRpdEJ1dHRvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICdDbGljayB0byBlZGl0IHlvdXI8YnIvPmRpc3BsYXkgbmFtZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInRvcFwiKTtcbiAgICAgICAgZWRpdEJ1dHRvbi5pbm5lckhUTUwgPSAnPGkgY2xhc3M9XCJmYSBmYS1wZW5jaWxcIj48L2k+JztcblxuICAgICAgICByZXR1cm4gZWRpdEJ1dHRvbjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIHRoZSBlbGVtZW50IGluZGljYXRpbmcgdGhlIGZvY3VzIG9mIHRoZSBjb25mZXJlbmNlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHBhcmVudEVsZW1lbnQgdGhlIHBhcmVudCBlbGVtZW50IHdoZXJlIHRoZSBmb2N1cyBpbmRpY2F0b3Igd2lsbFxuICAgICAqIGJlIGFkZGVkXG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlRm9jdXNJbmRpY2F0b3JFbGVtZW50KHBhcmVudEVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGZvY3VzSW5kaWNhdG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaScpO1xuICAgICAgICBmb2N1c0luZGljYXRvci5jbGFzc05hbWUgPSAnZmEgZmEtc3Rhcic7XG4gICAgICAgIHBhcmVudEVsZW1lbnQuYXBwZW5kQ2hpbGQoZm9jdXNJbmRpY2F0b3IpO1xuXG4gICAgICAgIFV0aWwuc2V0VG9vbHRpcChwYXJlbnRFbGVtZW50LFxuICAgICAgICAgICAgICAgIFwiVGhlIG93bmVyIG9mPGJyLz50aGlzIGNvbmZlcmVuY2VcIixcbiAgICAgICAgICAgICAgICBcInRvcFwiKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSByZW1vdGUgdmlkZW8gbWVudS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBqaWQgdGhlIGppZCBpbmRpY2F0aW5nIHRoZSB2aWRlbyBmb3Igd2hpY2ggd2UncmUgYWRkaW5nIGEgbWVudS5cbiAgICAgKiBAcGFyYW0gaXNNdXRlZCBpbmRpY2F0ZXMgdGhlIGN1cnJlbnQgbXV0ZSBzdGF0ZVxuICAgICAqL1xuICAgIG15LnVwZGF0ZVJlbW90ZVZpZGVvTWVudSA9IGZ1bmN0aW9uKGppZCwgaXNNdXRlZCkge1xuICAgICAgICB2YXIgbXV0ZU1lbnVJdGVtXG4gICAgICAgICAgICA9ICQoJyNyZW1vdGVfcG9wdXBtZW51XydcbiAgICAgICAgICAgICAgICAgICAgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpXG4gICAgICAgICAgICAgICAgICAgICsgJz5saT5hLm11dGVsaW5rJyk7XG5cbiAgICAgICAgdmFyIG11dGVkSW5kaWNhdG9yID0gXCI8aSBjbGFzcz0naWNvbi1taWMtZGlzYWJsZWQnPjwvaT5cIjtcblxuICAgICAgICBpZiAobXV0ZU1lbnVJdGVtLmxlbmd0aCkge1xuICAgICAgICAgICAgdmFyIG11dGVMaW5rID0gbXV0ZU1lbnVJdGVtLmdldCgwKTtcblxuICAgICAgICAgICAgaWYgKGlzTXV0ZWQgPT09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgIG11dGVMaW5rLmlubmVySFRNTCA9IG11dGVkSW5kaWNhdG9yICsgJyBNdXRlZCc7XG4gICAgICAgICAgICAgICAgbXV0ZUxpbmsuY2xhc3NOYW1lID0gJ211dGVsaW5rIGRpc2FibGVkJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG11dGVMaW5rLmlubmVySFRNTCA9IG11dGVkSW5kaWNhdG9yICsgJyBNdXRlJztcbiAgICAgICAgICAgICAgICBtdXRlTGluay5jbGFzc05hbWUgPSAnbXV0ZWxpbmsnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGN1cnJlbnQgZG9taW5hbnQgc3BlYWtlciByZXNvdXJjZSBqaWQuXG4gICAgICovXG4gICAgbXkuZ2V0RG9taW5hbnRTcGVha2VyUmVzb3VyY2VKaWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBjdXJyZW50RG9taW5hbnRTcGVha2VyO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBjb3JyZXNwb25kaW5nIHJlc291cmNlIGppZCB0byB0aGUgZ2l2ZW4gcGVlciBjb250YWluZXJcbiAgICAgKiBET00gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gdGhlIGNvcnJlc3BvbmRpbmcgcmVzb3VyY2UgamlkIHRvIHRoZSBnaXZlbiBwZWVyIGNvbnRhaW5lclxuICAgICAqIERPTSBlbGVtZW50XG4gICAgICovXG4gICAgbXkuZ2V0UGVlckNvbnRhaW5lclJlc291cmNlSmlkID0gZnVuY3Rpb24gKGNvbnRhaW5lckVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGkgPSBjb250YWluZXJFbGVtZW50LmlkLmluZGV4T2YoJ3BhcnRpY2lwYW50XycpO1xuXG4gICAgICAgIGlmIChpID49IDApXG4gICAgICAgICAgICByZXR1cm4gY29udGFpbmVyRWxlbWVudC5pZC5zdWJzdHJpbmcoaSArIDEyKTsgXG4gICAgfTtcblxuICAgIG15Lm9uUmVtb3RlU3RyZWFtQWRkZWQgPSBmdW5jdGlvbiAoc3RyZWFtKSB7XG4gICAgICAgIHZhciBjb250YWluZXI7XG4gICAgICAgIHZhciByZW1vdGVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JlbW90ZVZpZGVvcycpO1xuXG4gICAgICAgIGlmIChzdHJlYW0ucGVlcmppZCkge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuZW5zdXJlUGVlckNvbnRhaW5lckV4aXN0cyhzdHJlYW0ucGVlcmppZCk7XG5cbiAgICAgICAgICAgIGNvbnRhaW5lciAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcbiAgICAgICAgICAgICAgICAgICAgJ3BhcnRpY2lwYW50XycgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChzdHJlYW0ucGVlcmppZCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHN0cmVhbS5zdHJlYW0uaWQgIT09ICdtaXhlZG1zbGFiZWwnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvciggICdjYW4gbm90IGFzc29jaWF0ZSBzdHJlYW0nLFxuICAgICAgICAgICAgICAgICAgICBzdHJlYW0uc3RyZWFtLmlkLFxuICAgICAgICAgICAgICAgICAgICAnd2l0aCBhIHBhcnRpY2lwYW50Jyk7XG4gICAgICAgICAgICAgICAgLy8gV2UgZG9uJ3Qgd2FudCB0byBhZGQgaXQgaGVyZSBzaW5jZSBpdCB3aWxsIGNhdXNlIHRyb3VibGVzXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRklYTUU6IGZvciB0aGUgbWl4ZWQgbXMgd2UgZG9udCBuZWVkIGEgdmlkZW8gLS0gY3VycmVudGx5XG4gICAgICAgICAgICBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICBjb250YWluZXIuaWQgPSAnbWl4ZWRzdHJlYW0nO1xuICAgICAgICAgICAgY29udGFpbmVyLmNsYXNzTmFtZSA9ICd2aWRlb2NvbnRhaW5lcic7XG4gICAgICAgICAgICByZW1vdGVzLmFwcGVuZENoaWxkKGNvbnRhaW5lcik7XG4gICAgICAgICAgICBVdGlsLnBsYXlTb3VuZE5vdGlmaWNhdGlvbigndXNlckpvaW5lZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbnRhaW5lcikge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuYWRkUmVtb3RlU3RyZWFtRWxlbWVudCggY29udGFpbmVyLFxuICAgICAgICAgICAgICAgIHN0cmVhbS5zaWQsXG4gICAgICAgICAgICAgICAgc3RyZWFtLnN0cmVhbSxcbiAgICAgICAgICAgICAgICBzdHJlYW0ucGVlcmppZCxcbiAgICAgICAgICAgICAgICBzdHJlYW0uc3NyYyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBZGRzIHRoZSByZW1vdGUgdmlkZW8gbWVudSBlbGVtZW50IGZvciB0aGUgZ2l2ZW4gPHR0PmppZDwvdHQ+IGluIHRoZVxuICAgICAqIGdpdmVuIDx0dD5wYXJlbnRFbGVtZW50PC90dD4uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gamlkIHRoZSBqaWQgaW5kaWNhdGluZyB0aGUgdmlkZW8gZm9yIHdoaWNoIHdlJ3JlIGFkZGluZyBhIG1lbnUuXG4gICAgICogQHBhcmFtIHBhcmVudEVsZW1lbnQgdGhlIHBhcmVudCBlbGVtZW50IHdoZXJlIHRoaXMgbWVudSB3aWxsIGJlIGFkZGVkXG4gICAgICovXG4gICAgZnVuY3Rpb24gYWRkUmVtb3RlVmlkZW9NZW51KGppZCwgcGFyZW50RWxlbWVudCkge1xuICAgICAgICB2YXIgc3BhbkVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgIHNwYW5FbGVtZW50LmNsYXNzTmFtZSA9ICdyZW1vdGV2aWRlb21lbnUnO1xuXG4gICAgICAgIHBhcmVudEVsZW1lbnQuYXBwZW5kQ2hpbGQoc3BhbkVsZW1lbnQpO1xuXG4gICAgICAgIHZhciBtZW51RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2knKTtcbiAgICAgICAgbWVudUVsZW1lbnQuY2xhc3NOYW1lID0gJ2ZhIGZhLWFuZ2xlLWRvd24nO1xuICAgICAgICBtZW51RWxlbWVudC50aXRsZSA9ICdSZW1vdGUgdXNlciBjb250cm9scyc7XG4gICAgICAgIHNwYW5FbGVtZW50LmFwcGVuZENoaWxkKG1lbnVFbGVtZW50KTtcblxuLy8gICAgICAgIDx1bCBjbGFzcz1cInBvcHVwbWVudVwiPlxuLy8gICAgICAgIDxsaT48YSBocmVmPVwiI1wiPk11dGU8L2E+PC9saT5cbi8vICAgICAgICA8bGk+PGEgaHJlZj1cIiNcIj5FamVjdDwvYT48L2xpPlxuLy8gICAgICAgIDwvdWw+XG4gICAgICAgIHZhciBwb3B1cG1lbnVFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndWwnKTtcbiAgICAgICAgcG9wdXBtZW51RWxlbWVudC5jbGFzc05hbWUgPSAncG9wdXBtZW51JztcbiAgICAgICAgcG9wdXBtZW51RWxlbWVudC5pZFxuICAgICAgICAgICAgPSAncmVtb3RlX3BvcHVwbWVudV8nICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKTtcbiAgICAgICAgc3BhbkVsZW1lbnQuYXBwZW5kQ2hpbGQocG9wdXBtZW51RWxlbWVudCk7XG5cbiAgICAgICAgdmFyIG11dGVNZW51SXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gICAgICAgIHZhciBtdXRlTGlua0l0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG5cbiAgICAgICAgdmFyIG11dGVkSW5kaWNhdG9yID0gXCI8aSBjbGFzcz0naWNvbi1taWMtZGlzYWJsZWQnPjwvaT5cIjtcblxuICAgICAgICBpZiAoIW11dGVkQXVkaW9zW2ppZF0pIHtcbiAgICAgICAgICAgIG11dGVMaW5rSXRlbS5pbm5lckhUTUwgPSBtdXRlZEluZGljYXRvciArICdNdXRlJztcbiAgICAgICAgICAgIG11dGVMaW5rSXRlbS5jbGFzc05hbWUgPSAnbXV0ZWxpbmsnO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbXV0ZUxpbmtJdGVtLmlubmVySFRNTCA9IG11dGVkSW5kaWNhdG9yICsgJyBNdXRlZCc7XG4gICAgICAgICAgICBtdXRlTGlua0l0ZW0uY2xhc3NOYW1lID0gJ211dGVsaW5rIGRpc2FibGVkJztcbiAgICAgICAgfVxuXG4gICAgICAgIG11dGVMaW5rSXRlbS5vbmNsaWNrID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGlmICgkKHRoaXMpLmF0dHIoJ2Rpc2FibGVkJykgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpc011dGUgPSAhbXV0ZWRBdWRpb3NbamlkXTtcbiAgICAgICAgICAgIGNvbm5lY3Rpb24ubW9kZXJhdGUuc2V0TXV0ZShqaWQsIGlzTXV0ZSk7XG4gICAgICAgICAgICBwb3B1cG1lbnVFbGVtZW50LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnZGlzcGxheTpub25lOycpO1xuXG4gICAgICAgICAgICBpZiAoaXNNdXRlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbm5lckhUTUwgPSBtdXRlZEluZGljYXRvciArICcgTXV0ZWQnO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xhc3NOYW1lID0gJ211dGVsaW5rIGRpc2FibGVkJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5uZXJIVE1MID0gbXV0ZWRJbmRpY2F0b3IgKyAnIE11dGUnO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xhc3NOYW1lID0gJ211dGVsaW5rJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBtdXRlTWVudUl0ZW0uYXBwZW5kQ2hpbGQobXV0ZUxpbmtJdGVtKTtcbiAgICAgICAgcG9wdXBtZW51RWxlbWVudC5hcHBlbmRDaGlsZChtdXRlTWVudUl0ZW0pO1xuXG4gICAgICAgIHZhciBlamVjdEluZGljYXRvciA9IFwiPGkgY2xhc3M9J2ZhIGZhLWVqZWN0Jz48L2k+XCI7XG5cbiAgICAgICAgdmFyIGVqZWN0TWVudUl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuICAgICAgICB2YXIgZWplY3RMaW5rSXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgZWplY3RMaW5rSXRlbS5pbm5lckhUTUwgPSBlamVjdEluZGljYXRvciArICcgS2ljayBvdXQnO1xuICAgICAgICBlamVjdExpbmtJdGVtLm9uY2xpY2sgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgY29ubmVjdGlvbi5tb2RlcmF0ZS5lamVjdChqaWQpO1xuICAgICAgICAgICAgcG9wdXBtZW51RWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ2Rpc3BsYXk6bm9uZTsnKTtcbiAgICAgICAgfTtcblxuICAgICAgICBlamVjdE1lbnVJdGVtLmFwcGVuZENoaWxkKGVqZWN0TGlua0l0ZW0pO1xuICAgICAgICBwb3B1cG1lbnVFbGVtZW50LmFwcGVuZENoaWxkKGVqZWN0TWVudUl0ZW0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE9uIGF1ZGlvIG11dGVkIGV2ZW50LlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ2F1ZGlvbXV0ZWQubXVjJywgZnVuY3Rpb24gKGV2ZW50LCBqaWQsIGlzTXV0ZWQpIHtcbiAgICAgICAgdmFyIHZpZGVvU3BhbklkID0gbnVsbDtcbiAgICAgICAgaWYgKGppZCA9PT0gY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZCkge1xuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAnbG9jYWxWaWRlb0NvbnRhaW5lcic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5lbnN1cmVQZWVyQ29udGFpbmVyRXhpc3RzKGppZCk7XG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdwYXJ0aWNpcGFudF8nICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmb2N1cykge1xuICAgICAgICAgICAgbXV0ZWRBdWRpb3NbamlkXSA9IGlzTXV0ZWQ7XG4gICAgICAgICAgICBWaWRlb0xheW91dC51cGRhdGVSZW1vdGVWaWRlb01lbnUoamlkLCBpc011dGVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2aWRlb1NwYW5JZClcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dBdWRpb0luZGljYXRvcih2aWRlb1NwYW5JZCwgaXNNdXRlZCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBPbiB2aWRlbyBtdXRlZCBldmVudC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCd2aWRlb211dGVkLm11YycsIGZ1bmN0aW9uIChldmVudCwgamlkLCBpc011dGVkKSB7XG4gICAgICAgIHZhciB2aWRlb1NwYW5JZCA9IG51bGw7XG4gICAgICAgIGlmIChqaWQgPT09IGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQpIHtcbiAgICAgICAgICAgIHZpZGVvU3BhbklkID0gJ2xvY2FsVmlkZW9Db250YWluZXInO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuZW5zdXJlUGVlckNvbnRhaW5lckV4aXN0cyhqaWQpO1xuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAncGFydGljaXBhbnRfJyArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGppZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodmlkZW9TcGFuSWQpXG4gICAgICAgICAgICBWaWRlb0xheW91dC5zaG93VmlkZW9JbmRpY2F0b3IodmlkZW9TcGFuSWQsIGlzTXV0ZWQpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogRGlzcGxheSBuYW1lIGNoYW5nZWQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgnZGlzcGxheW5hbWVjaGFuZ2VkJyxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKGV2ZW50LCBqaWQsIGRpc3BsYXlOYW1lLCBzdGF0dXMpIHtcbiAgICAgICAgaWYgKGppZCA9PT0gJ2xvY2FsVmlkZW9Db250YWluZXInXG4gICAgICAgICAgICB8fCBqaWQgPT09IGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQpIHtcbiAgICAgICAgICAgIHNldERpc3BsYXlOYW1lKCdsb2NhbFZpZGVvQ29udGFpbmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmVuc3VyZVBlZXJDb250YWluZXJFeGlzdHMoamlkKTtcblxuICAgICAgICAgICAgc2V0RGlzcGxheU5hbWUoXG4gICAgICAgICAgICAgICAgJ3BhcnRpY2lwYW50XycgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lLFxuICAgICAgICAgICAgICAgIHN0YXR1cyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIE9uIGRvbWluYW50IHNwZWFrZXIgY2hhbmdlZCBldmVudC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdkb21pbmFudHNwZWFrZXJjaGFuZ2VkJywgZnVuY3Rpb24gKGV2ZW50LCByZXNvdXJjZUppZCkge1xuICAgICAgICAvLyBXZSBpZ25vcmUgbG9jYWwgdXNlciBldmVudHMuXG4gICAgICAgIGlmIChyZXNvdXJjZUppZFxuICAgICAgICAgICAgICAgID09PSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChjb25uZWN0aW9uLmVtdWMubXlyb29tamlkKSlcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAvLyBVcGRhdGUgdGhlIGN1cnJlbnQgZG9taW5hbnQgc3BlYWtlci5cbiAgICAgICAgaWYgKHJlc291cmNlSmlkICE9PSBjdXJyZW50RG9taW5hbnRTcGVha2VyKVxuICAgICAgICAgICAgY3VycmVudERvbWluYW50U3BlYWtlciA9IHJlc291cmNlSmlkO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgLy8gT2J0YWluIGNvbnRhaW5lciBmb3IgbmV3IGRvbWluYW50IHNwZWFrZXIuXG4gICAgICAgIHZhciBjb250YWluZXIgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXG4gICAgICAgICAgICAgICAgJ3BhcnRpY2lwYW50XycgKyByZXNvdXJjZUppZCk7XG5cbiAgICAgICAgLy8gTG9jYWwgdmlkZW8gd2lsbCBub3QgaGF2ZSBjb250YWluZXIgZm91bmQsIGJ1dCB0aGF0J3Mgb2tcbiAgICAgICAgLy8gc2luY2Ugd2UgZG9uJ3Qgd2FudCB0byBzd2l0Y2ggdG8gbG9jYWwgdmlkZW8uXG4gICAgICAgIGlmIChjb250YWluZXIgJiYgIVZpZGVvTGF5b3V0LmZvY3VzZWRWaWRlb1NyYylcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHZpZGVvID0gY29udGFpbmVyLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwidmlkZW9cIik7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgbGFyZ2UgdmlkZW8gaWYgdGhlIHZpZGVvIHNvdXJjZSBpcyBhbHJlYWR5IGF2YWlsYWJsZSxcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSB3YWl0IGZvciB0aGUgXCJ2aWRlb2FjdGl2ZS5qaW5nbGVcIiBldmVudC5cbiAgICAgICAgICAgIGlmICh2aWRlby5sZW5ndGggJiYgdmlkZW9bMF0uY3VycmVudFRpbWUgPiAwKVxuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8odmlkZW9bMF0uc3JjKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogT24gbGFzdCBOIGNoYW5nZSBldmVudC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBldmVudCB0aGUgZXZlbnQgdGhhdCBub3RpZmllZCB1c1xuICAgICAqIEBwYXJhbSBsYXN0TkVuZHBvaW50cyB0aGUgbGlzdCBvZiBsYXN0IE4gZW5kcG9pbnRzXG4gICAgICogQHBhcmFtIGVuZHBvaW50c0VudGVyaW5nTGFzdE4gdGhlIGxpc3QgY3VycmVudGx5IGVudGVyaW5nIGxhc3QgTlxuICAgICAqIGVuZHBvaW50c1xuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ2xhc3RuY2hhbmdlZCcsIGZ1bmN0aW9uICggZXZlbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXN0TkVuZHBvaW50cyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZHBvaW50c0VudGVyaW5nTGFzdE4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJlYW0pIHtcbiAgICAgICAgaWYgKGxhc3ROQ291bnQgIT09IGxhc3RORW5kcG9pbnRzLmxlbmd0aClcbiAgICAgICAgICAgIGxhc3ROQ291bnQgPSBsYXN0TkVuZHBvaW50cy5sZW5ndGg7XG5cbiAgICAgICAgbGFzdE5FbmRwb2ludHNDYWNoZSA9IGxhc3RORW5kcG9pbnRzO1xuXG4gICAgICAgICQoJyNyZW1vdGVWaWRlb3M+c3BhbicpLmVhY2goZnVuY3Rpb24oIGluZGV4LCBlbGVtZW50ICkge1xuICAgICAgICAgICAgdmFyIHJlc291cmNlSmlkID0gVmlkZW9MYXlvdXQuZ2V0UGVlckNvbnRhaW5lclJlc291cmNlSmlkKGVsZW1lbnQpO1xuXG4gICAgICAgICAgICBpZiAocmVzb3VyY2VKaWRcbiAgICAgICAgICAgICAgICAmJiBsYXN0TkVuZHBvaW50cy5sZW5ndGggPiAwXG4gICAgICAgICAgICAgICAgJiYgbGFzdE5FbmRwb2ludHMuaW5kZXhPZihyZXNvdXJjZUppZCkgPCAwKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJSZW1vdmUgZnJvbSBsYXN0IE5cIiwgcmVzb3VyY2VKaWQpO1xuICAgICAgICAgICAgICAgIHNob3dQZWVyQ29udGFpbmVyKHJlc291cmNlSmlkLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghZW5kcG9pbnRzRW50ZXJpbmdMYXN0TiB8fCBlbmRwb2ludHNFbnRlcmluZ0xhc3ROLmxlbmd0aCA8IDApXG4gICAgICAgICAgICBlbmRwb2ludHNFbnRlcmluZ0xhc3ROID0gbGFzdE5FbmRwb2ludHM7XG5cbiAgICAgICAgaWYgKGVuZHBvaW50c0VudGVyaW5nTGFzdE4gJiYgZW5kcG9pbnRzRW50ZXJpbmdMYXN0Ti5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBlbmRwb2ludHNFbnRlcmluZ0xhc3ROLmZvckVhY2goZnVuY3Rpb24gKHJlc291cmNlSmlkKSB7XG5cbiAgICAgICAgICAgICAgICBpZiAoISQoJyNwYXJ0aWNpcGFudF8nICsgcmVzb3VyY2VKaWQpLmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQWRkIHRvIGxhc3QgTlwiLCByZXNvdXJjZUppZCk7XG4gICAgICAgICAgICAgICAgICAgIHNob3dQZWVyQ29udGFpbmVyKHJlc291cmNlSmlkLCB0cnVlKTtcblxuICAgICAgICAgICAgICAgICAgICBkZXAuVUlBY3RpdmF0b3IoKS5nZXRSVENTZXJ2aWNlKCkucmVtb3RlU3RyZWFtcy5zb21lKGZ1bmN0aW9uIChtZWRpYVN0cmVhbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lZGlhU3RyZWFtLnBlZXJqaWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAmJiBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChtZWRpYVN0cmVhbS5wZWVyamlkKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA9PT0gcmVzb3VyY2VKaWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAmJiBtZWRpYVN0cmVhbS50eXBlID09PSBtZWRpYVN0cmVhbS5WSURFT19UWVBFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNlbCA9ICQoJyNwYXJ0aWNpcGFudF8nICsgcmVzb3VyY2VKaWQgKyAnPnZpZGVvJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRhY2hNZWRpYVN0cmVhbShzZWwsIG1lZGlhU3RyZWFtLnN0cmVhbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2FpdEZvclJlbW90ZVZpZGVvKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVkaWFTdHJlYW0uc3NyYyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lZGlhU3RyZWFtLnN0cmVhbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiB3YWl0Rm9yUmVtb3RlVmlkZW8oc2VsZWN0b3IsIHNzcmMsIHN0cmVhbSkge1xuICAgICAgICBpZiAoc2VsZWN0b3IucmVtb3ZlZCB8fCAhc2VsZWN0b3IucGFyZW50KCkuaXMoXCI6dmlzaWJsZVwiKSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKFwiTWVkaWEgcmVtb3ZlZCBiZWZvcmUgaGFkIHN0YXJ0ZWRcIiwgc2VsZWN0b3IpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN0cmVhbS5pZCA9PT0gJ21peGVkbXNsYWJlbCcpIHJldHVybjtcblxuICAgICAgICBpZiAoc2VsZWN0b3JbMF0uY3VycmVudFRpbWUgPiAwKSB7XG4gICAgICAgICAgIGF0dGFjaE1lZGlhU3RyZWFtKHNlbGVjdG9yLCBzdHJlYW0pOyAvLyBGSVhNRTogd2h5IGRvIGkgaGF2ZSB0byBkbyB0aGlzIGZvciBGRj9cblxuICAgICAgICAgICAgLy8gRklYTUU6IGFkZCBhIGNsYXNzIHRoYXQgd2lsbCBhc3NvY2lhdGUgcGVlciBKaWQsIHZpZGVvLnNyYywgaXQncyBzc3JjIGFuZCB2aWRlbyB0eXBlXG4gICAgICAgICAgICAvLyAgICAgICAgaW4gb3JkZXIgdG8gZ2V0IHJpZCBvZiB0b28gbWFueSBtYXBzXG4gICAgICAgICAgICBpZiAoc3NyYyAmJiBzZWxlY3Rvci5hdHRyKCdzcmMnKSkge1xuICAgICAgICAgICAgICAgIHZpZGVvU3JjVG9Tc3JjW3NlbGVjdG9yLmF0dHIoJ3NyYycpXSA9IHNzcmM7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIk5vIHNzcmMgZ2l2ZW4gZm9yIHZpZGVvXCIsIHNlbGVjdG9yKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmlkZW9BY3RpdmUoc2VsZWN0b3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgd2FpdEZvclJlbW90ZVZpZGVvKHNlbGVjdG9yLCBzc3JjLCBzdHJlYW0pO1xuICAgICAgICAgICAgfSwgMjUwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHZpZGVvQWN0aXZlKHZpZGVvZWxlbSkge1xuICAgICAgICBpZiAodmlkZW9lbGVtLmF0dHIoJ2lkJykuaW5kZXhPZignbWl4ZWRtc2xhYmVsJykgPT09IC0xKSB7XG4gICAgICAgICAgICAvLyBpZ25vcmUgbWl4ZWRtc2xhYmVsYTAgYW5kIHYwXG5cbiAgICAgICAgICAgIHZpZGVvZWxlbS5zaG93KCk7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5yZXNpemVUaHVtYm5haWxzKCk7XG5cbiAgICAgICAgICAgIHZhciB2aWRlb1BhcmVudCA9IHZpZGVvZWxlbS5wYXJlbnQoKTtcbiAgICAgICAgICAgIHZhciBwYXJlbnRSZXNvdXJjZUppZCA9IG51bGw7XG4gICAgICAgICAgICBpZiAodmlkZW9QYXJlbnQpXG4gICAgICAgICAgICAgICAgcGFyZW50UmVzb3VyY2VKaWRcbiAgICAgICAgICAgICAgICAgICAgPSBWaWRlb0xheW91dC5nZXRQZWVyQ29udGFpbmVyUmVzb3VyY2VKaWQodmlkZW9QYXJlbnRbMF0pO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGxhcmdlIHZpZGVvIHRvIHRoZSBsYXN0IGFkZGVkIHZpZGVvIG9ubHkgaWYgdGhlcmUncyBub1xuICAgICAgICAgICAgLy8gY3VycmVudCBkb21pbmFudCBvciBmb2N1c2VkIHNwZWFrZXIgb3IgdXBkYXRlIGl0IHRvIHRoZSBjdXJyZW50XG4gICAgICAgICAgICAvLyBkb21pbmFudCBzcGVha2VyLlxuICAgICAgICAgICAgaWYgKCghVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjICYmICFWaWRlb0xheW91dC5nZXREb21pbmFudFNwZWFrZXJSZXNvdXJjZUppZCgpKVxuICAgICAgICAgICAgICAgIHx8IChwYXJlbnRSZXNvdXJjZUppZFxuICAgICAgICAgICAgICAgICYmIFZpZGVvTGF5b3V0LmdldERvbWluYW50U3BlYWtlclJlc291cmNlSmlkKClcbiAgICAgICAgICAgICAgICAgICAgPT09IHBhcmVudFJlc291cmNlSmlkKSkge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8odmlkZW9lbGVtLmF0dHIoJ3NyYycpLCAxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0ZvY3VzSW5kaWNhdG9yKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgbXkucmVzaXplVmlkZW9TcGFjZSA9IGZ1bmN0aW9uKHJpZ2h0Q29sdW1uRWwsIHJpZ2h0Q29sdW1uU2l6ZSwgaXNWaXNpYmxlKVxuICAgIHtcbiAgICAgICAgdmFyIHZpZGVvc3BhY2UgPSAkKCcjdmlkZW9zcGFjZScpO1xuXG4gICAgICAgIHZhciB2aWRlb3NwYWNlV2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aCAtIHJpZ2h0Q29sdW1uU2l6ZVswXTtcbiAgICAgICAgdmFyIHZpZGVvc3BhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIHZhciB2aWRlb1NpemVcbiAgICAgICAgICAgID0gZ2V0VmlkZW9TaXplKG51bGwsIG51bGwsIHZpZGVvc3BhY2VXaWR0aCwgdmlkZW9zcGFjZUhlaWdodCk7XG4gICAgICAgIHZhciB2aWRlb1dpZHRoID0gdmlkZW9TaXplWzBdO1xuICAgICAgICB2YXIgdmlkZW9IZWlnaHQgPSB2aWRlb1NpemVbMV07XG4gICAgICAgIHZhciB2aWRlb1Bvc2l0aW9uID0gZ2V0VmlkZW9Qb3NpdGlvbih2aWRlb1dpZHRoLFxuICAgICAgICAgICAgdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICB2aWRlb3NwYWNlV2lkdGgsXG4gICAgICAgICAgICB2aWRlb3NwYWNlSGVpZ2h0KTtcbiAgICAgICAgdmFyIGhvcml6b250YWxJbmRlbnQgPSB2aWRlb1Bvc2l0aW9uWzBdO1xuICAgICAgICB2YXIgdmVydGljYWxJbmRlbnQgPSB2aWRlb1Bvc2l0aW9uWzFdO1xuXG4gICAgICAgIHZhciB0aHVtYm5haWxTaXplID0gVmlkZW9MYXlvdXQuY2FsY3VsYXRlVGh1bWJuYWlsU2l6ZSh2aWRlb3NwYWNlV2lkdGgpO1xuICAgICAgICB2YXIgdGh1bWJuYWlsc1dpZHRoID0gdGh1bWJuYWlsU2l6ZVswXTtcbiAgICAgICAgdmFyIHRodW1ibmFpbHNIZWlnaHQgPSB0aHVtYm5haWxTaXplWzFdO1xuXG4gICAgICAgIGlmIChpc1Zpc2libGUpIHtcbiAgICAgICAgICAgIHZpZGVvc3BhY2UuYW5pbWF0ZSh7cmlnaHQ6IHJpZ2h0Q29sdW1uU2l6ZVswXSxcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHZpZGVvc3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB2aWRlb3NwYWNlSGVpZ2h0fSxcbiAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwfSk7XG5cbiAgICAgICAgICAgICQoJyNyZW1vdGVWaWRlb3MnKS5hbmltYXRlKHtoZWlnaHQ6IHRodW1ibmFpbHNIZWlnaHR9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDB9KTtcblxuICAgICAgICAgICAgJCgnI3JlbW90ZVZpZGVvcz5zcGFuJykuYW5pbWF0ZSh7aGVpZ2h0OiB0aHVtYm5haWxzSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogdGh1bWJuYWlsc1dpZHRofSxcbiAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicmVtb3RldmlkZW8ucmVzaXplZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt0aHVtYm5haWxzV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRodW1ibmFpbHNIZWlnaHRdKTtcbiAgICAgICAgICAgICAgICAgICAgfX0pO1xuXG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlb0NvbnRhaW5lcicpLmFuaW1hdGUoeyB3aWR0aDogdmlkZW9zcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZpZGVvc3BhY2VIZWlnaHR9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDBcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5hbmltYXRlKHsgIHdpZHRoOiB2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB0b3A6IHZlcnRpY2FsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICBib3R0b206IHZlcnRpY2FsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiBob3Jpem9udGFsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICByaWdodDogaG9yaXpvbnRhbEluZGVudH0sXG4gICAgICAgICAgICAgICAgeyAgIHF1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMFxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByaWdodENvbHVtbkVsLmhpZGUoXCJzbGlkZVwiLCB7IGRpcmVjdGlvbjogXCJyaWdodFwiLFxuICAgICAgICAgICAgICAgIHF1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBVbmRvY2sgdGhlIHRvb2xiYXIgd2hlbiB0aGUgY2hhdCBpcyBzaG93biBhbmQgaWYgd2UncmUgaW4gYVxuICAgICAgICAgICAgLy8gdmlkZW8gbW9kZS5cbiAgICAgICAgICAgIGlmIChWaWRlb0xheW91dC5pc0xhcmdlVmlkZW9WaXNpYmxlKCkpXG4gICAgICAgICAgICAgICAgZGVwLlRvb2xiYXIoKS5kb2NrVG9vbGJhcihmYWxzZSk7XG5cbiAgICAgICAgICAgIHZpZGVvc3BhY2UuYW5pbWF0ZSh7cmlnaHQ6IHJpZ2h0Q29sdW1uU2l6ZVswXSxcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHZpZGVvc3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB2aWRlb3NwYWNlSGVpZ2h0fSxcbiAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHRDb2x1bW5FbC50cmlnZ2VyKCdzaG93bicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICQoJyNyZW1vdGVWaWRlb3MnKS5hbmltYXRlKHtoZWlnaHQ6IHRodW1ibmFpbHNIZWlnaHR9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDB9KTtcblxuICAgICAgICAgICAgJCgnI3JlbW90ZVZpZGVvcz5zcGFuJykuYW5pbWF0ZSh7aGVpZ2h0OiB0aHVtYm5haWxzSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogdGh1bWJuYWlsc1dpZHRofSxcbiAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicmVtb3RldmlkZW8ucmVzaXplZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt0aHVtYm5haWxzV2lkdGgsIHRodW1ibmFpbHNIZWlnaHRdKTtcbiAgICAgICAgICAgICAgICAgICAgfX0pO1xuXG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlb0NvbnRhaW5lcicpLmFuaW1hdGUoeyB3aWR0aDogdmlkZW9zcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZpZGVvc3BhY2VIZWlnaHR9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDBcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5hbmltYXRlKHsgIHdpZHRoOiB2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB0b3A6IHZlcnRpY2FsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICBib3R0b206IHZlcnRpY2FsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiBob3Jpem9udGFsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICByaWdodDogaG9yaXpvbnRhbEluZGVudH0sXG4gICAgICAgICAgICAgICAge3F1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMFxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByaWdodENvbHVtbkVsLnNob3coXCJzbGlkZVwiLCB7IGRpcmVjdGlvbjogXCJyaWdodFwiLFxuICAgICAgICAgICAgICAgIHF1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbXk7XG59KFZpZGVvTGF5b3V0IHx8IHt9KSk7XG5cbm1vZHVsZS5leHBvcnRzID0gVmlkZW9MYXlvdXQ7XG4iLCJ2YXIgVmlkZW9MYXlvdXQgPSByZXF1aXJlKFwiLi4vVmlkZW9MYXlvdXRcIik7XG52YXIgQ2FudmFzVXRpbCA9IHJlcXVpcmUoXCIuL0NhbnZhc1V0aWwuanNcIik7XG5cbi8qKlxuICogVGhlIGF1ZGlvIExldmVscyBwbHVnaW4uXG4gKi9cbnZhciBBdWRpb0xldmVscyA9IChmdW5jdGlvbihteSkge1xuICAgIHZhciBDQU5WQVNfRVhUUkEgPSAxMDQ7XG4gICAgdmFyIENBTlZBU19SQURJVVMgPSA3O1xuICAgIHZhciBTSEFET1dfQ09MT1IgPSAnIzAwY2NmZic7XG4gICAgdmFyIGF1ZGlvTGV2ZWxDYW52YXNDYWNoZSA9IHt9O1xuXG4gICAgbXkuTE9DQUxfTEVWRUwgPSAnbG9jYWwnO1xuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgYXVkaW8gbGV2ZWwgY2FudmFzIGZvciB0aGUgZ2l2ZW4gcGVlckppZC4gSWYgdGhlIGNhbnZhc1xuICAgICAqIGRpZG4ndCBleGlzdCB3ZSBjcmVhdGUgaXQuXG4gICAgICovXG4gICAgbXkudXBkYXRlQXVkaW9MZXZlbENhbnZhcyA9IGZ1bmN0aW9uIChwZWVySmlkKSB7XG4gICAgICAgIHZhciByZXNvdXJjZUppZCA9IG51bGw7XG4gICAgICAgIHZhciB2aWRlb1NwYW5JZCA9IG51bGw7XG4gICAgICAgIGlmICghcGVlckppZClcbiAgICAgICAgICAgIHZpZGVvU3BhbklkID0gJ2xvY2FsVmlkZW9Db250YWluZXInO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlc291cmNlSmlkID0gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQocGVlckppZCk7XG5cbiAgICAgICAgICAgIHZpZGVvU3BhbklkID0gJ3BhcnRpY2lwYW50XycgKyByZXNvdXJjZUppZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHZpZGVvU3BhbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHZpZGVvU3BhbklkKTtcblxuICAgICAgICBpZiAoIXZpZGVvU3Bhbikge1xuICAgICAgICAgICAgaWYgKHJlc291cmNlSmlkKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJObyB2aWRlbyBlbGVtZW50IGZvciBqaWRcIiwgcmVzb3VyY2VKaWQpO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJObyB2aWRlbyBlbGVtZW50IGZvciBsb2NhbCB2aWRlby5cIik7XG5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBhdWRpb0xldmVsQ2FudmFzID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+Y2FudmFzJyk7XG5cbiAgICAgICAgdmFyIHZpZGVvU3BhY2VXaWR0aCA9ICQoJyNyZW1vdGVWaWRlb3MnKS53aWR0aCgpO1xuICAgICAgICB2YXIgdGh1bWJuYWlsU2l6ZVxuICAgICAgICAgICAgPSBWaWRlb0xheW91dC5jYWxjdWxhdGVUaHVtYm5haWxTaXplKHZpZGVvU3BhY2VXaWR0aCk7XG4gICAgICAgIHZhciB0aHVtYm5haWxXaWR0aCA9IHRodW1ibmFpbFNpemVbMF07XG4gICAgICAgIHZhciB0aHVtYm5haWxIZWlnaHQgPSB0aHVtYm5haWxTaXplWzFdO1xuXG4gICAgICAgIGlmICghYXVkaW9MZXZlbENhbnZhcyB8fCBhdWRpb0xldmVsQ2FudmFzLmxlbmd0aCA9PT0gMCkge1xuXG4gICAgICAgICAgICBhdWRpb0xldmVsQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgICAgICBhdWRpb0xldmVsQ2FudmFzLmNsYXNzTmFtZSA9IFwiYXVkaW9sZXZlbFwiO1xuICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhcy5zdHlsZS5ib3R0b20gPSBcIi1cIiArIENBTlZBU19FWFRSQS8yICsgXCJweFwiO1xuICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhcy5zdHlsZS5sZWZ0ID0gXCItXCIgKyBDQU5WQVNfRVhUUkEvMiArIFwicHhcIjtcbiAgICAgICAgICAgIHJlc2l6ZUF1ZGlvTGV2ZWxDYW52YXMoIGF1ZGlvTGV2ZWxDYW52YXMsXG4gICAgICAgICAgICAgICAgICAgIHRodW1ibmFpbFdpZHRoLFxuICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxIZWlnaHQpO1xuXG4gICAgICAgICAgICB2aWRlb1NwYW4uYXBwZW5kQ2hpbGQoYXVkaW9MZXZlbENhbnZhcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhdWRpb0xldmVsQ2FudmFzID0gYXVkaW9MZXZlbENhbnZhcy5nZXQoMCk7XG5cbiAgICAgICAgICAgIHJlc2l6ZUF1ZGlvTGV2ZWxDYW52YXMoIGF1ZGlvTGV2ZWxDYW52YXMsXG4gICAgICAgICAgICAgICAgICAgIHRodW1ibmFpbFdpZHRoLFxuICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxIZWlnaHQpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIGF1ZGlvIGxldmVsIFVJIGZvciB0aGUgZ2l2ZW4gcmVzb3VyY2VKaWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVzb3VyY2VKaWQgdGhlIHJlc291cmNlIGppZCBpbmRpY2F0aW5nIHRoZSB2aWRlbyBlbGVtZW50IGZvclxuICAgICAqIHdoaWNoIHdlIGRyYXcgdGhlIGF1ZGlvIGxldmVsXG4gICAgICogQHBhcmFtIGF1ZGlvTGV2ZWwgdGhlIG5ld0F1ZGlvIGxldmVsIHRvIHJlbmRlclxuICAgICAqL1xuICAgIG15LnVwZGF0ZUF1ZGlvTGV2ZWwgPSBmdW5jdGlvbiAocmVzb3VyY2VKaWQsIGF1ZGlvTGV2ZWwpIHtcbiAgICAgICAgZHJhd0F1ZGlvTGV2ZWxDYW52YXMocmVzb3VyY2VKaWQsIGF1ZGlvTGV2ZWwpO1xuXG4gICAgICAgIHZhciB2aWRlb1NwYW5JZCA9IGdldFZpZGVvU3BhbklkKHJlc291cmNlSmlkKTtcblxuICAgICAgICB2YXIgYXVkaW9MZXZlbENhbnZhcyA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPmNhbnZhcycpLmdldCgwKTtcblxuICAgICAgICBpZiAoIWF1ZGlvTGV2ZWxDYW52YXMpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgdmFyIGRyYXdDb250ZXh0ID0gYXVkaW9MZXZlbENhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgICAgIHZhciBjYW52YXNDYWNoZSA9IGF1ZGlvTGV2ZWxDYW52YXNDYWNoZVtyZXNvdXJjZUppZF07XG5cbiAgICAgICAgZHJhd0NvbnRleHQuY2xlYXJSZWN0ICgwLCAwLFxuICAgICAgICAgICAgICAgIGF1ZGlvTGV2ZWxDYW52YXMud2lkdGgsIGF1ZGlvTGV2ZWxDYW52YXMuaGVpZ2h0KTtcbiAgICAgICAgZHJhd0NvbnRleHQuZHJhd0ltYWdlKGNhbnZhc0NhY2hlLCAwLCAwKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVzaXplcyB0aGUgZ2l2ZW4gYXVkaW8gbGV2ZWwgY2FudmFzIHRvIG1hdGNoIHRoZSBnaXZlbiB0aHVtYm5haWwgc2l6ZS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiByZXNpemVBdWRpb0xldmVsQ2FudmFzKGF1ZGlvTGV2ZWxDYW52YXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRodW1ibmFpbEhlaWdodCkge1xuICAgICAgICBhdWRpb0xldmVsQ2FudmFzLndpZHRoID0gdGh1bWJuYWlsV2lkdGggKyBDQU5WQVNfRVhUUkE7XG4gICAgICAgIGF1ZGlvTGV2ZWxDYW52YXMuaGVpZ2h0ID0gdGh1bWJuYWlsSGVpZ2h0ICsgQ0FOVkFTX0VYVFJBO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBEcmF3cyB0aGUgYXVkaW8gbGV2ZWwgY2FudmFzIGludG8gdGhlIGNhY2hlZCBjYW52YXMgb2JqZWN0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHJlc291cmNlSmlkIHRoZSByZXNvdXJjZSBqaWQgaW5kaWNhdGluZyB0aGUgdmlkZW8gZWxlbWVudCBmb3JcbiAgICAgKiB3aGljaCB3ZSBkcmF3IHRoZSBhdWRpbyBsZXZlbFxuICAgICAqIEBwYXJhbSBhdWRpb0xldmVsIHRoZSBuZXdBdWRpbyBsZXZlbCB0byByZW5kZXJcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBkcmF3QXVkaW9MZXZlbENhbnZhcyhyZXNvdXJjZUppZCwgYXVkaW9MZXZlbCkge1xuICAgICAgICBpZiAoIWF1ZGlvTGV2ZWxDYW52YXNDYWNoZVtyZXNvdXJjZUppZF0pIHtcblxuICAgICAgICAgICAgdmFyIHZpZGVvU3BhbklkID0gZ2V0VmlkZW9TcGFuSWQocmVzb3VyY2VKaWQpO1xuXG4gICAgICAgICAgICB2YXIgYXVkaW9MZXZlbENhbnZhc09yaWcgPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5jYW52YXMnKS5nZXQoMCk7XG5cbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgKiBGSVhNRSBUZXN0aW5nIGhhcyBzaG93biB0aGF0IGF1ZGlvTGV2ZWxDYW52YXNPcmlnIG1heSBub3QgZXhpc3QuXG4gICAgICAgICAgICAgKiBJbiBzdWNoIGEgY2FzZSwgdGhlIG1ldGhvZCBDYW52YXNVdGlsLmNsb25lQ2FudmFzIG1heSB0aHJvdyBhblxuICAgICAgICAgICAgICogZXJyb3IuIFNpbmNlIGF1ZGlvIGxldmVscyBhcmUgZnJlcXVlbnRseSB1cGRhdGVkLCB0aGUgZXJyb3JzIGhhdmVcbiAgICAgICAgICAgICAqIGJlZW4gb2JzZXJ2ZWQgdG8gcGlsZSBpbnRvIHRoZSBjb25zb2xlLCBzdHJhaW4gdGhlIENQVS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaWYgKGF1ZGlvTGV2ZWxDYW52YXNPcmlnKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGF1ZGlvTGV2ZWxDYW52YXNDYWNoZVtyZXNvdXJjZUppZF1cbiAgICAgICAgICAgICAgICAgICAgPSBDYW52YXNVdGlsLmNsb25lQ2FudmFzKGF1ZGlvTGV2ZWxDYW52YXNPcmlnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjYW52YXMgPSBhdWRpb0xldmVsQ2FudmFzQ2FjaGVbcmVzb3VyY2VKaWRdO1xuXG4gICAgICAgIGlmICghY2FudmFzKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHZhciBkcmF3Q29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgICAgIGRyYXdDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuXG4gICAgICAgIHZhciBzaGFkb3dMZXZlbCA9IGdldFNoYWRvd0xldmVsKGF1ZGlvTGV2ZWwpO1xuXG4gICAgICAgIGlmIChzaGFkb3dMZXZlbCA+IDApXG4gICAgICAgICAgICAvLyBkcmF3Q29udGV4dCwgeCwgeSwgdywgaCwgciwgc2hhZG93Q29sb3IsIHNoYWRvd0xldmVsXG4gICAgICAgICAgICBDYW52YXNVdGlsLmRyYXdSb3VuZFJlY3RHbG93KCAgIGRyYXdDb250ZXh0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBDQU5WQVNfRVhUUkEvMiwgQ0FOVkFTX0VYVFJBLzIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbnZhcy53aWR0aCAtIENBTlZBU19FWFRSQSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FudmFzLmhlaWdodCAtIENBTlZBU19FWFRSQSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQ0FOVkFTX1JBRElVUyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgU0hBRE9XX0NPTE9SLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaGFkb3dMZXZlbCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHNoYWRvdy9nbG93IGxldmVsIGZvciB0aGUgZ2l2ZW4gYXVkaW8gbGV2ZWwuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXVkaW9MZXZlbCB0aGUgYXVkaW8gbGV2ZWwgZnJvbSB3aGljaCB3ZSBkZXRlcm1pbmUgdGhlIHNoYWRvd1xuICAgICAqIGxldmVsXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0U2hhZG93TGV2ZWwgKGF1ZGlvTGV2ZWwpIHtcbiAgICAgICAgdmFyIHNoYWRvd0xldmVsID0gMDtcblxuICAgICAgICBpZiAoYXVkaW9MZXZlbCA8PSAwLjMpIHtcbiAgICAgICAgICAgIHNoYWRvd0xldmVsID0gTWF0aC5yb3VuZChDQU5WQVNfRVhUUkEvMiooYXVkaW9MZXZlbC8wLjMpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChhdWRpb0xldmVsIDw9IDAuNikge1xuICAgICAgICAgICAgc2hhZG93TGV2ZWwgPSBNYXRoLnJvdW5kKENBTlZBU19FWFRSQS8yKigoYXVkaW9MZXZlbCAtIDAuMykgLyAwLjMpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHNoYWRvd0xldmVsID0gTWF0aC5yb3VuZChDQU5WQVNfRVhUUkEvMiooKGF1ZGlvTGV2ZWwgLSAwLjYpIC8gMC40KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNoYWRvd0xldmVsO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSB2aWRlbyBzcGFuIGlkIGNvcnJlc3BvbmRpbmcgdG8gdGhlIGdpdmVuIHJlc291cmNlSmlkIG9yIGxvY2FsXG4gICAgICogdXNlci5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRWaWRlb1NwYW5JZChyZXNvdXJjZUppZCkge1xuICAgICAgICB2YXIgdmlkZW9TcGFuSWQgPSBudWxsO1xuICAgICAgICBpZiAocmVzb3VyY2VKaWQgPT09IFN0YXRpc3RpY3NBY3RpdmF0b3IuTE9DQUxfSklEKVxuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAnbG9jYWxWaWRlb0NvbnRhaW5lcic7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHZpZGVvU3BhbklkID0gJ3BhcnRpY2lwYW50XycgKyByZXNvdXJjZUppZDtcblxuICAgICAgICByZXR1cm4gdmlkZW9TcGFuSWQ7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEluZGljYXRlcyB0aGF0IHRoZSByZW1vdGUgdmlkZW8gaGFzIGJlZW4gcmVzaXplZC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdyZW1vdGV2aWRlby5yZXNpemVkJywgZnVuY3Rpb24gKGV2ZW50LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHZhciByZXNpemVkID0gZmFsc2U7XG4gICAgICAgICQoJyNyZW1vdGVWaWRlb3M+c3Bhbj5jYW52YXMnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGNhbnZhcyA9ICQodGhpcykuZ2V0KDApO1xuICAgICAgICAgICAgaWYgKGNhbnZhcy53aWR0aCAhPT0gd2lkdGggKyBDQU5WQVNfRVhUUkEpIHtcbiAgICAgICAgICAgICAgICBjYW52YXMud2lkdGggPSB3aWR0aCArIENBTlZBU19FWFRSQTtcbiAgICAgICAgICAgICAgICByZXNpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGNhbnZhcy5oZWlnaCAhPT0gaGVpZ2h0ICsgQ0FOVkFTX0VYVFJBKSB7XG4gICAgICAgICAgICAgICAgY2FudmFzLmhlaWdodCA9IGhlaWdodCArIENBTlZBU19FWFRSQTtcbiAgICAgICAgICAgICAgICByZXNpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHJlc2l6ZWQpXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhhdWRpb0xldmVsQ2FudmFzQ2FjaGUpLmZvckVhY2goZnVuY3Rpb24gKHJlc291cmNlSmlkKSB7XG4gICAgICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhc0NhY2hlW3Jlc291cmNlSmlkXS53aWR0aFxuICAgICAgICAgICAgICAgICAgICA9IHdpZHRoICsgQ0FOVkFTX0VYVFJBO1xuICAgICAgICAgICAgICAgIGF1ZGlvTGV2ZWxDYW52YXNDYWNoZVtyZXNvdXJjZUppZF0uaGVpZ2h0XG4gICAgICAgICAgICAgICAgICAgID0gaGVpZ2h0ICsgQ0FOVkFTX0VYVFJBO1xuICAgICAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbXk7XG5cbn0pKEF1ZGlvTGV2ZWxzIHx8IHt9KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBdWRpb0xldmVscztcbiIsIi8qKlxuICogVXRpbGl0eSBjbGFzcyBmb3IgZHJhd2luZyBjYW52YXMgc2hhcGVzLlxuICovXG52YXIgQ2FudmFzVXRpbCA9IChmdW5jdGlvbihteSkge1xuXG4gICAgLyoqXG4gICAgICogRHJhd3MgYSByb3VuZCByZWN0YW5nbGUgd2l0aCBhIGdsb3cuIFRoZSBnbG93V2lkdGggaW5kaWNhdGVzIHRoZSBkZXB0aFxuICAgICAqIG9mIHRoZSBnbG93LlxuICAgICAqXG4gICAgICogQHBhcmFtIGRyYXdDb250ZXh0IHRoZSBjb250ZXh0IG9mIHRoZSBjYW52YXMgdG8gZHJhdyB0b1xuICAgICAqIEBwYXJhbSB4IHRoZSB4IGNvb3JkaW5hdGUgb2YgdGhlIHJvdW5kIHJlY3RhbmdsZVxuICAgICAqIEBwYXJhbSB5IHRoZSB5IGNvb3JkaW5hdGUgb2YgdGhlIHJvdW5kIHJlY3RhbmdsZVxuICAgICAqIEBwYXJhbSB3IHRoZSB3aWR0aCBvZiB0aGUgcm91bmQgcmVjdGFuZ2xlXG4gICAgICogQHBhcmFtIGggdGhlIGhlaWdodCBvZiB0aGUgcm91bmQgcmVjdGFuZ2xlXG4gICAgICogQHBhcmFtIGdsb3dDb2xvciB0aGUgY29sb3Igb2YgdGhlIGdsb3dcbiAgICAgKiBAcGFyYW0gZ2xvd1dpZHRoIHRoZSB3aWR0aCBvZiB0aGUgZ2xvd1xuICAgICAqL1xuICAgIG15LmRyYXdSb3VuZFJlY3RHbG93XG4gICAgICAgID0gZnVuY3Rpb24oZHJhd0NvbnRleHQsIHgsIHksIHcsIGgsIHIsIGdsb3dDb2xvciwgZ2xvd1dpZHRoKSB7XG5cbiAgICAgICAgLy8gU2F2ZSB0aGUgcHJldmlvdXMgc3RhdGUgb2YgdGhlIGNvbnRleHQuXG4gICAgICAgIGRyYXdDb250ZXh0LnNhdmUoKTtcblxuICAgICAgICBpZiAodyA8IDIgKiByKSByID0gdyAvIDI7XG4gICAgICAgIGlmIChoIDwgMiAqIHIpIHIgPSBoIC8gMjtcblxuICAgICAgICAvLyBEcmF3IGEgcm91bmQgcmVjdGFuZ2xlLlxuICAgICAgICBkcmF3Q29udGV4dC5iZWdpblBhdGgoKTtcbiAgICAgICAgZHJhd0NvbnRleHQubW92ZVRvKHgrciwgeSk7XG4gICAgICAgIGRyYXdDb250ZXh0LmFyY1RvKHgrdywgeSwgICB4K3csIHkraCwgcik7XG4gICAgICAgIGRyYXdDb250ZXh0LmFyY1RvKHgrdywgeStoLCB4LCAgIHkraCwgcik7XG4gICAgICAgIGRyYXdDb250ZXh0LmFyY1RvKHgsICAgeStoLCB4LCAgIHksICAgcik7XG4gICAgICAgIGRyYXdDb250ZXh0LmFyY1RvKHgsICAgeSwgICB4K3csIHksICAgcik7XG4gICAgICAgIGRyYXdDb250ZXh0LmNsb3NlUGF0aCgpO1xuXG4gICAgICAgIC8vIEFkZCBhIHNoYWRvdyBhcm91bmQgdGhlIHJlY3RhbmdsZVxuICAgICAgICBkcmF3Q29udGV4dC5zaGFkb3dDb2xvciA9IGdsb3dDb2xvcjtcbiAgICAgICAgZHJhd0NvbnRleHQuc2hhZG93Qmx1ciA9IGdsb3dXaWR0aDtcbiAgICAgICAgZHJhd0NvbnRleHQuc2hhZG93T2Zmc2V0WCA9IDA7XG4gICAgICAgIGRyYXdDb250ZXh0LnNoYWRvd09mZnNldFkgPSAwO1xuXG4gICAgICAgIC8vIEZpbGwgdGhlIHNoYXBlLlxuICAgICAgICBkcmF3Q29udGV4dC5maWxsKCk7XG5cbiAgICAgICAgZHJhd0NvbnRleHQuc2F2ZSgpO1xuXG4gICAgICAgIGRyYXdDb250ZXh0LnJlc3RvcmUoKTtcblxuLy8gICAgICAxKSBVbmNvbW1lbnQgdGhpcyBsaW5lIHRvIHVzZSBDb21wb3NpdGUgT3BlcmF0aW9uLCB3aGljaCBpcyBkb2luZyB0aGVcbi8vICAgICAgc2FtZSBhcyB0aGUgY2xpcCBmdW5jdGlvbiBiZWxvdyBhbmQgaXMgYWxzbyBhbnRpYWxpYXNpbmcgdGhlIHJvdW5kXG4vLyAgICAgIGJvcmRlciwgYnV0IGlzIHNhaWQgdG8gYmUgbGVzcyBmYXN0IHBlcmZvcm1hbmNlIHdpc2UuXG5cbi8vICAgICAgZHJhd0NvbnRleHQuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uPSdkZXN0aW5hdGlvbi1vdXQnO1xuXG4gICAgICAgIGRyYXdDb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICBkcmF3Q29udGV4dC5tb3ZlVG8oeCtyLCB5KTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCt3LCB5LCAgIHgrdywgeStoLCByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCt3LCB5K2gsIHgsICAgeStoLCByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCwgICB5K2gsIHgsICAgeSwgICByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCwgICB5LCAgIHgrdywgeSwgICByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuY2xvc2VQYXRoKCk7XG5cbi8vICAgICAgMikgVW5jb21tZW50IHRoaXMgbGluZSB0byB1c2UgQ29tcG9zaXRlIE9wZXJhdGlvbiwgd2hpY2ggaXMgZG9pbmcgdGhlXG4vLyAgICAgIHNhbWUgYXMgdGhlIGNsaXAgZnVuY3Rpb24gYmVsb3cgYW5kIGlzIGFsc28gYW50aWFsaWFzaW5nIHRoZSByb3VuZFxuLy8gICAgICBib3JkZXIsIGJ1dCBpcyBzYWlkIHRvIGJlIGxlc3MgZmFzdCBwZXJmb3JtYW5jZSB3aXNlLlxuXG4vLyAgICAgIGRyYXdDb250ZXh0LmZpbGwoKTtcblxuICAgICAgICAvLyBDb21tZW50IHRoZXNlIHR3byBsaW5lcyBpZiBjaG9vc2luZyB0byBkbyB0aGUgc2FtZSB3aXRoIGNvbXBvc2l0ZVxuICAgICAgICAvLyBvcGVyYXRpb24gYWJvdmUgMSBhbmQgMi5cbiAgICAgICAgZHJhd0NvbnRleHQuY2xpcCgpO1xuICAgICAgICBkcmF3Q29udGV4dC5jbGVhclJlY3QoMCwgMCwgMjc3LCAyMDApO1xuXG4gICAgICAgIC8vIFJlc3RvcmUgdGhlIHByZXZpb3VzIGNvbnRleHQgc3RhdGUuXG4gICAgICAgIGRyYXdDb250ZXh0LnJlc3RvcmUoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2xvbmVzIHRoZSBnaXZlbiBjYW52YXMuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHRoZSBuZXcgY2xvbmVkIGNhbnZhcy5cbiAgICAgKi9cbiAgICBteS5jbG9uZUNhbnZhcyA9IGZ1bmN0aW9uIChvbGRDYW52YXMpIHtcbiAgICAgICAgLypcbiAgICAgICAgICogRklYTUUgVGVzdGluZyBoYXMgc2hvd24gdGhhdCBvbGRDYW52YXMgbWF5IG5vdCBleGlzdC4gSW4gc3VjaCBhIGNhc2UsXG4gICAgICAgICAqIHRoZSBtZXRob2QgQ2FudmFzVXRpbC5jbG9uZUNhbnZhcyBtYXkgdGhyb3cgYW4gZXJyb3IuIFNpbmNlIGF1ZGlvXG4gICAgICAgICAqIGxldmVscyBhcmUgZnJlcXVlbnRseSB1cGRhdGVkLCB0aGUgZXJyb3JzIGhhdmUgYmVlbiBvYnNlcnZlZCB0byBwaWxlXG4gICAgICAgICAqIGludG8gdGhlIGNvbnNvbGUsIHN0cmFpbiB0aGUgQ1BVLlxuICAgICAgICAgKi9cbiAgICAgICAgaWYgKCFvbGRDYW52YXMpXG4gICAgICAgICAgICByZXR1cm4gb2xkQ2FudmFzO1xuXG4gICAgICAgIC8vY3JlYXRlIGEgbmV3IGNhbnZhc1xuICAgICAgICB2YXIgbmV3Q2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgIHZhciBjb250ZXh0ID0gbmV3Q2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbiAgICAgICAgLy9zZXQgZGltZW5zaW9uc1xuICAgICAgICBuZXdDYW52YXMud2lkdGggPSBvbGRDYW52YXMud2lkdGg7XG4gICAgICAgIG5ld0NhbnZhcy5oZWlnaHQgPSBvbGRDYW52YXMuaGVpZ2h0O1xuXG4gICAgICAgIC8vYXBwbHkgdGhlIG9sZCBjYW52YXMgdG8gdGhlIG5ldyBvbmVcbiAgICAgICAgY29udGV4dC5kcmF3SW1hZ2Uob2xkQ2FudmFzLCAwLCAwKTtcblxuICAgICAgICAvL3JldHVybiB0aGUgbmV3IGNhbnZhc1xuICAgICAgICByZXR1cm4gbmV3Q2FudmFzO1xuICAgIH07XG5cbiAgICByZXR1cm4gbXk7XG59KShDYW52YXNVdGlsIHx8IHt9KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYW52YXNVdGlsO1xuIiwiLyogZ2xvYmFsICQsIFV0aWwsIGNvbm5lY3Rpb24sIG5pY2tuYW1lOnRydWUsIGdldFZpZGVvU2l6ZSwgZ2V0VmlkZW9Qb3NpdGlvbiwgc2hvd1Rvb2xiYXIsIHByb2Nlc3NSZXBsYWNlbWVudHMgKi9cbnZhciBSZXBsYWNlbWVudCA9IHJlcXVpcmUoXCIuL1JlcGxhY2VtZW50LmpzXCIpO1xudmFyIGRlcCA9IHtcbiAgICBcIlZpZGVvTGF5b3V0XCI6IGZ1bmN0aW9uKCl7IHJldHVybiByZXF1aXJlKFwiLi4vVmlkZW9MYXlvdXRcIil9LFxuICAgIFwiVG9vbGJhclwiOiBmdW5jdGlvbigpe3JldHVybiByZXF1aXJlKFwiLi4vVG9vbGJhclwiKX1cbn07XG4vKipcbiAqIENoYXQgcmVsYXRlZCB1c2VyIGludGVyZmFjZS5cbiAqL1xudmFyIENoYXQgPSAoZnVuY3Rpb24gKG15KSB7XG4gICAgdmFyIG5vdGlmaWNhdGlvbkludGVydmFsID0gZmFsc2U7XG4gICAgdmFyIHVucmVhZE1lc3NhZ2VzID0gMDtcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIGNoYXQgcmVsYXRlZCBpbnRlcmZhY2UuXG4gICAgICovXG4gICAgbXkuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHN0b3JlZERpc3BsYXlOYW1lID0gd2luZG93LmxvY2FsU3RvcmFnZS5kaXNwbGF5bmFtZTtcbiAgICAgICAgaWYgKHN0b3JlZERpc3BsYXlOYW1lKSB7XG4gICAgICAgICAgICBuaWNrbmFtZSA9IHN0b3JlZERpc3BsYXlOYW1lO1xuXG4gICAgICAgICAgICBDaGF0LnNldENoYXRDb252ZXJzYXRpb25Nb2RlKHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgJCgnI25pY2tpbnB1dCcpLmtleWRvd24oZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHZhciB2YWwgPSBVdGlsLmVzY2FwZUh0bWwodGhpcy52YWx1ZSk7XG4gICAgICAgICAgICAgICAgdGhpcy52YWx1ZSA9ICcnO1xuICAgICAgICAgICAgICAgIGlmICghbmlja25hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbmlja25hbWUgPSB2YWw7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UuZGlzcGxheW5hbWUgPSBuaWNrbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgLy90aGlzIHNob3VsZCBiZSBjaGFuZ2VkXG4gICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Yy5hZGREaXNwbGF5TmFtZVRvUHJlc2VuY2Uobmlja25hbWUpO1xuICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuc2VuZFByZXNlbmNlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgQ2hhdC5zZXRDaGF0Q29udmVyc2F0aW9uTW9kZSh0cnVlKTtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkKCcjdXNlcm1zZycpLmtleWRvd24oZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IHRoaXMudmFsdWU7XG4gICAgICAgICAgICAgICAgJCgnI3VzZXJtc2cnKS52YWwoJycpLnRyaWdnZXIoJ2F1dG9zaXplLnJlc2l6ZScpO1xuICAgICAgICAgICAgICAgIHRoaXMuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICB2YXIgY29tbWFuZCA9IG5ldyBDb21tYW5kc1Byb2Nlc3Nvcih2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYoY29tbWFuZC5pc0NvbW1hbmQoKSlcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmQucHJvY2Vzc0NvbW1hbmQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgLy90aGlzIHNob3VsZCBiZSBjaGFuZ2VkXG4gICAgICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlID0gVXRpbC5lc2NhcGVIdG1sKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgY29ubmVjdGlvbi5lbXVjLnNlbmRNZXNzYWdlKG1lc3NhZ2UsIG5pY2tuYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBvblRleHRBcmVhUmVzaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmVzaXplQ2hhdENvbnZlcnNhdGlvbigpO1xuICAgICAgICAgICAgc2Nyb2xsQ2hhdFRvQm90dG9tKCk7XG4gICAgICAgIH07XG4gICAgICAgICQoJyN1c2VybXNnJykuYXV0b3NpemUoe2NhbGxiYWNrOiBvblRleHRBcmVhUmVzaXplfSk7XG5cbiAgICAgICAgJChcIiNjaGF0c3BhY2VcIikuYmluZChcInNob3duXCIsXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2Nyb2xsQ2hhdFRvQm90dG9tKCk7XG4gICAgICAgICAgICAgICAgdW5yZWFkTWVzc2FnZXMgPSAwO1xuICAgICAgICAgICAgICAgIHNldFZpc3VhbE5vdGlmaWNhdGlvbihmYWxzZSk7XG4gICAgICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQXBwZW5kcyB0aGUgZ2l2ZW4gbWVzc2FnZSB0byB0aGUgY2hhdCBjb252ZXJzYXRpb24uXG4gICAgICovXG4gICAgbXkudXBkYXRlQ2hhdENvbnZlcnNhdGlvbiA9IGZ1bmN0aW9uIChmcm9tLCBkaXNwbGF5TmFtZSwgbWVzc2FnZSkge1xuICAgICAgICB2YXIgZGl2Q2xhc3NOYW1lID0gJyc7XG5cbiAgICAgICAgaWYgKGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQgPT09IGZyb20pIHtcbiAgICAgICAgICAgIGRpdkNsYXNzTmFtZSA9IFwibG9jYWx1c2VyXCI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkaXZDbGFzc05hbWUgPSBcInJlbW90ZXVzZXJcIjtcblxuICAgICAgICAgICAgaWYgKCFDaGF0LmlzVmlzaWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgdW5yZWFkTWVzc2FnZXMrKztcbiAgICAgICAgICAgICAgICBVdGlsLnBsYXlTb3VuZE5vdGlmaWNhdGlvbignY2hhdE5vdGlmaWNhdGlvbicpO1xuICAgICAgICAgICAgICAgIHNldFZpc3VhbE5vdGlmaWNhdGlvbih0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vcmVwbGFjZSBsaW5rcyBhbmQgc21pbGV5c1xuICAgICAgICB2YXIgZXNjTWVzc2FnZSA9IFV0aWwuZXNjYXBlSHRtbChtZXNzYWdlKTtcbiAgICAgICAgdmFyIGVzY0Rpc3BsYXlOYW1lID0gVXRpbC5lc2NhcGVIdG1sKGRpc3BsYXlOYW1lKTtcbiAgICAgICAgbWVzc2FnZSA9IFJlcGxhY2VtZW50LnByb2Nlc3NSZXBsYWNlbWVudHMoZXNjTWVzc2FnZSk7XG5cbiAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKS5hcHBlbmQoJzxkaXYgY2xhc3M9XCInICsgZGl2Q2xhc3NOYW1lICsgJ1wiPjxiPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlc2NEaXNwbGF5TmFtZSArICc6IDwvYj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSArICc8L2Rpdj4nKTtcbiAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKS5hbmltYXRlKFxuICAgICAgICAgICAgICAgIHsgc2Nyb2xsVG9wOiAkKCcjY2hhdGNvbnZlcnNhdGlvbicpWzBdLnNjcm9sbEhlaWdodH0sIDEwMDApO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBcHBlbmRzIGVycm9yIG1lc3NhZ2UgdG8gdGhlIGNvbnZlcnNhdGlvblxuICAgICAqIEBwYXJhbSBlcnJvck1lc3NhZ2UgdGhlIHJlY2VpdmVkIGVycm9yIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIG9yaWdpbmFsVGV4dCB0aGUgb3JpZ2luYWwgbWVzc2FnZS5cbiAgICAgKi9cbiAgICBteS5jaGF0QWRkRXJyb3IgPSBmdW5jdGlvbihlcnJvck1lc3NhZ2UsIG9yaWdpbmFsVGV4dClcbiAgICB7XG4gICAgICAgIGVycm9yTWVzc2FnZSA9IFV0aWwuZXNjYXBlSHRtbChlcnJvck1lc3NhZ2UpO1xuICAgICAgICBvcmlnaW5hbFRleHQgPSBVdGlsLmVzY2FwZUh0bWwob3JpZ2luYWxUZXh0KTtcblxuICAgICAgICAkKCcjY2hhdGNvbnZlcnNhdGlvbicpLmFwcGVuZCgnPGRpdiBjbGFzcz1cImVycm9yTWVzc2FnZVwiPjxiPkVycm9yOiA8L2I+J1xuICAgICAgICAgICAgKyAnWW91ciBtZXNzYWdlJyArIChvcmlnaW5hbFRleHQ/ICgnIFxcXCInKyBvcmlnaW5hbFRleHQgKyAnXFxcIicpIDogXCJcIilcbiAgICAgICAgICAgICsgJyB3YXMgbm90IHNlbnQuJyArIChlcnJvck1lc3NhZ2U/ICgnIFJlYXNvbjogJyArIGVycm9yTWVzc2FnZSkgOiAnJylcbiAgICAgICAgICAgICsgICc8L2Rpdj4nKTtcbiAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKS5hbmltYXRlKFxuICAgICAgICAgICAgeyBzY3JvbGxUb3A6ICQoJyNjaGF0Y29udmVyc2F0aW9uJylbMF0uc2Nyb2xsSGVpZ2h0fSwgMTAwMCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIHN1YmplY3QgdG8gdGhlIFVJXG4gICAgICogQHBhcmFtIHN1YmplY3QgdGhlIHN1YmplY3RcbiAgICAgKi9cbiAgICBteS5jaGF0U2V0U3ViamVjdCA9IGZ1bmN0aW9uKHN1YmplY3QpXG4gICAge1xuICAgICAgICBpZihzdWJqZWN0KVxuICAgICAgICAgICAgc3ViamVjdCA9IHN1YmplY3QudHJpbSgpO1xuICAgICAgICAkKCcjc3ViamVjdCcpLmh0bWwoUmVwbGFjZW1lbnQubGlua2lmeShVdGlsLmVzY2FwZUh0bWwoc3ViamVjdCkpKTtcbiAgICAgICAgaWYoc3ViamVjdCA9PSBcIlwiKVxuICAgICAgICB7XG4gICAgICAgICAgICAkKFwiI3N1YmplY3RcIikuY3NzKHtkaXNwbGF5OiBcIm5vbmVcIn0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAge1xuICAgICAgICAgICAgJChcIiNzdWJqZWN0XCIpLmNzcyh7ZGlzcGxheTogXCJibG9ja1wifSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogT3BlbnMgLyBjbG9zZXMgdGhlIGNoYXQgYXJlYS5cbiAgICAgKi9cbiAgICBteS50b2dnbGVDaGF0ID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHZhciBjaGF0c3BhY2UgPSAkKCcjY2hhdHNwYWNlJyk7XG5cbiAgICAgICAgdmFyIGNoYXRTaXplID0gKGNoYXRzcGFjZS5pcyhcIjp2aXNpYmxlXCIpKSA/IFswLCAwXSA6IENoYXQuZ2V0Q2hhdFNpemUoKTtcbiAgICAgICAgZGVwLlZpZGVvTGF5b3V0KCkucmVzaXplVmlkZW9TcGFjZShjaGF0c3BhY2UsIGNoYXRTaXplLCBjaGF0c3BhY2UuaXMoXCI6dmlzaWJsZVwiKSk7XG5cbiAgICAgICAgLy8gUmVxdWVzdCB0aGUgZm9jdXMgaW4gdGhlIG5pY2tuYW1lIGZpZWxkIG9yIHRoZSBjaGF0IGlucHV0IGZpZWxkLlxuICAgICAgICBpZiAoJCgnI25pY2tuYW1lJykuY3NzKCd2aXNpYmlsaXR5JykgPT09ICd2aXNpYmxlJylcbiAgICAgICAgICAgICQoJyNuaWNraW5wdXQnKS5mb2N1cygpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICQoJyN1c2VybXNnJykuZm9jdXMoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBjaGF0IGNvbnZlcnNhdGlvbiBtb2RlLlxuICAgICAqL1xuICAgIG15LnNldENoYXRDb252ZXJzYXRpb25Nb2RlID0gZnVuY3Rpb24gKGlzQ29udmVyc2F0aW9uTW9kZSkge1xuICAgICAgICBpZiAoaXNDb252ZXJzYXRpb25Nb2RlKSB7XG4gICAgICAgICAgICAkKCcjbmlja25hbWUnKS5jc3Moe3Zpc2liaWxpdHk6ICdoaWRkZW4nfSk7XG4gICAgICAgICAgICAkKCcjY2hhdGNvbnZlcnNhdGlvbicpLmNzcyh7dmlzaWJpbGl0eTogJ3Zpc2libGUnfSk7XG4gICAgICAgICAgICAkKCcjdXNlcm1zZycpLmNzcyh7dmlzaWJpbGl0eTogJ3Zpc2libGUnfSk7XG4gICAgICAgICAgICAkKCcjdXNlcm1zZycpLmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVzaXplcyB0aGUgY2hhdCBhcmVhLlxuICAgICAqL1xuICAgIG15LnJlc2l6ZUNoYXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjaGF0U2l6ZSA9IENoYXQuZ2V0Q2hhdFNpemUoKTtcblxuICAgICAgICAkKCcjY2hhdHNwYWNlJykud2lkdGgoY2hhdFNpemVbMF0pO1xuICAgICAgICAkKCcjY2hhdHNwYWNlJykuaGVpZ2h0KGNoYXRTaXplWzFdKTtcblxuICAgICAgICByZXNpemVDaGF0Q29udmVyc2F0aW9uKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHNpemUgb2YgdGhlIGNoYXQuXG4gICAgICovXG4gICAgbXkuZ2V0Q2hhdFNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBhdmFpbGFibGVIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIHZhciBhdmFpbGFibGVXaWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoO1xuXG4gICAgICAgIHZhciBjaGF0V2lkdGggPSAyMDA7XG4gICAgICAgIGlmIChhdmFpbGFibGVXaWR0aCAqIDAuMiA8IDIwMClcbiAgICAgICAgICAgIGNoYXRXaWR0aCA9IGF2YWlsYWJsZVdpZHRoICogMC4yO1xuXG4gICAgICAgIHJldHVybiBbY2hhdFdpZHRoLCBhdmFpbGFibGVIZWlnaHRdO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBJbmRpY2F0ZXMgaWYgdGhlIGNoYXQgaXMgY3VycmVudGx5IHZpc2libGUuXG4gICAgICovXG4gICAgbXkuaXNWaXNpYmxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJCgnI2NoYXRzcGFjZScpLmlzKFwiOnZpc2libGVcIik7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlc2l6ZXMgdGhlIGNoYXQgY29udmVyc2F0aW9uLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJlc2l6ZUNoYXRDb252ZXJzYXRpb24oKSB7XG4gICAgICAgIHZhciB1c2VybXNnU3R5bGVIZWlnaHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInVzZXJtc2dcIikuc3R5bGUuaGVpZ2h0O1xuICAgICAgICB2YXIgdXNlcm1zZ0hlaWdodCA9IHVzZXJtc2dTdHlsZUhlaWdodFxuICAgICAgICAgICAgLnN1YnN0cmluZygwLCB1c2VybXNnU3R5bGVIZWlnaHQuaW5kZXhPZigncHgnKSk7XG5cbiAgICAgICAgJCgnI3VzZXJtc2cnKS53aWR0aCgkKCcjY2hhdHNwYWNlJykud2lkdGgoKSAtIDEwKTtcbiAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKS53aWR0aCgkKCcjY2hhdHNwYWNlJykud2lkdGgoKSAtIDEwKTtcbiAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKVxuICAgICAgICAgICAgLmhlaWdodCh3aW5kb3cuaW5uZXJIZWlnaHQgLSAxMCAtIHBhcnNlSW50KHVzZXJtc2dIZWlnaHQpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTaG93cy9oaWRlcyBhIHZpc3VhbCBub3RpZmljYXRpb24sIGluZGljYXRpbmcgdGhhdCBhIG1lc3NhZ2UgaGFzIGFycml2ZWQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2V0VmlzdWFsTm90aWZpY2F0aW9uKHNob3cpIHtcbiAgICAgICAgdmFyIHVucmVhZE1zZ0VsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndW5yZWFkTWVzc2FnZXMnKTtcblxuICAgICAgICB2YXIgZ2xvd2VyID0gJCgnI2NoYXRCdXR0b24nKTtcblxuICAgICAgICBpZiAodW5yZWFkTWVzc2FnZXMpIHtcbiAgICAgICAgICAgIHVucmVhZE1zZ0VsZW1lbnQuaW5uZXJIVE1MID0gdW5yZWFkTWVzc2FnZXMudG9TdHJpbmcoKTtcblxuICAgICAgICAgICAgZGVwLlRvb2xiYXIoKS5kb2NrVG9vbGJhcih0cnVlKTtcblxuICAgICAgICAgICAgdmFyIGNoYXRCdXR0b25FbGVtZW50XG4gICAgICAgICAgICAgICAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hhdEJ1dHRvbicpLnBhcmVudE5vZGU7XG4gICAgICAgICAgICB2YXIgbGVmdEluZGVudCA9IChVdGlsLmdldFRleHRXaWR0aChjaGF0QnV0dG9uRWxlbWVudCkgLVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVXRpbC5nZXRUZXh0V2lkdGgodW5yZWFkTXNnRWxlbWVudCkpIC8gMjtcbiAgICAgICAgICAgIHZhciB0b3BJbmRlbnQgPSAoVXRpbC5nZXRUZXh0SGVpZ2h0KGNoYXRCdXR0b25FbGVtZW50KSAtXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFV0aWwuZ2V0VGV4dEhlaWdodCh1bnJlYWRNc2dFbGVtZW50KSkgLyAyIC0gMztcblxuICAgICAgICAgICAgdW5yZWFkTXNnRWxlbWVudC5zZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgICAgICAgICdzdHlsZScsXG4gICAgICAgICAgICAgICAgICAgICd0b3A6JyArIHRvcEluZGVudCArXG4gICAgICAgICAgICAgICAgICAgICc7IGxlZnQ6JyArIGxlZnRJbmRlbnQgKyAnOycpO1xuXG4gICAgICAgICAgICBpZiAoIWdsb3dlci5oYXNDbGFzcygnaWNvbi1jaGF0LXNpbXBsZScpKSB7XG4gICAgICAgICAgICAgICAgZ2xvd2VyLnJlbW92ZUNsYXNzKCdpY29uLWNoYXQnKTtcbiAgICAgICAgICAgICAgICBnbG93ZXIuYWRkQ2xhc3MoJ2ljb24tY2hhdC1zaW1wbGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHVucmVhZE1zZ0VsZW1lbnQuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgICAgICBnbG93ZXIucmVtb3ZlQ2xhc3MoJ2ljb24tY2hhdC1zaW1wbGUnKTtcbiAgICAgICAgICAgIGdsb3dlci5hZGRDbGFzcygnaWNvbi1jaGF0Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc2hvdyAmJiAhbm90aWZpY2F0aW9uSW50ZXJ2YWwpIHtcbiAgICAgICAgICAgIG5vdGlmaWNhdGlvbkludGVydmFsID0gd2luZG93LnNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBnbG93ZXIudG9nZ2xlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfSwgODAwKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghc2hvdyAmJiBub3RpZmljYXRpb25JbnRlcnZhbCkge1xuICAgICAgICAgICAgd2luZG93LmNsZWFySW50ZXJ2YWwobm90aWZpY2F0aW9uSW50ZXJ2YWwpO1xuICAgICAgICAgICAgbm90aWZpY2F0aW9uSW50ZXJ2YWwgPSBmYWxzZTtcbiAgICAgICAgICAgIGdsb3dlci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTY3JvbGxzIGNoYXQgdG8gdGhlIGJvdHRvbS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzY3JvbGxDaGF0VG9Cb3R0b20oKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKS5zY3JvbGxUb3AoXG4gICAgICAgICAgICAgICAgICAgICQoJyNjaGF0Y29udmVyc2F0aW9uJylbMF0uc2Nyb2xsSGVpZ2h0KTtcbiAgICAgICAgfSwgNSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG15O1xufShDaGF0IHx8IHt9KSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2hhdDtcbiIsIlxudmFyIFJlcGxhY2VtZW50ID0gZnVuY3Rpb24oKVxue1xuICAgIC8qKlxuICAgICAqIFJlcGxhY2VzIGNvbW1vbiBzbWlsZXkgc3RyaW5ncyB3aXRoIGltYWdlc1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNtaWxpZnkoYm9keSlcbiAgICB7XG4gICAgICAgIGlmKCFib2R5KVxuICAgICAgICAgICAgcmV0dXJuIGJvZHk7XG5cbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKDpcXCh8OlxcKFxcKHw6LVxcKFxcKHw6LVxcKHxcXChzYWRcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTErIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKGFuZ3J5XFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkyKyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChuXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkzKyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyg6LVxcKVxcKXw6XFwpXFwpfDstXFwpXFwpfDtcXClcXCl8XFwobG9sXFwpfDotRHw6RHw7LUR8O0QpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTQrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKDstXFwoXFwofDtcXChcXCh8Oy1cXCh8O1xcKHw6J1xcKHw6Jy1cXCh8On4tXFwofDp+XFwofFxcKHVwc2V0XFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXk1KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyg8M3wmbHQ7M3xcXChMXFwpfFxcKGxcXCl8XFwoSFxcKXxcXChoXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXk2KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChhbmdlbFxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5NysgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoYm9tYlxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5OCsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoY2h1Y2tsZVxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5OSsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoeVxcKXxcXChZXFwpfFxcKG9rXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxMCsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oOy1cXCl8O1xcKXw6LVxcKXw6XFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxMSsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoYmx1c2hcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTEyKyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyg6LVxcKnw6XFwqfFxcKGtpc3NcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTEzKyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChzZWFyY2hcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTE0KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXCh3YXZlXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxNSsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoY2xhcFxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MTYrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKHNpY2tcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTE3KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyg6LVB8OlB8Oi1wfDpwKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxOCsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oOi1cXDB8XFwoc2hvY2tlZFxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MTkrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKG9vcHNcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTIwKyBcIj5cIik7XG5cbiAgICAgICAgcmV0dXJuIGJvZHk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gUmVwbGFjZW1lbnRQcm90bygpIHtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFByb2Nlc3NlcyBsaW5rcyBhbmQgc21pbGV5cyBpbiBcImJvZHlcIlxuICAgICAqL1xuICAgIFJlcGxhY2VtZW50UHJvdG8ucHJvY2Vzc1JlcGxhY2VtZW50cyA9IGZ1bmN0aW9uKGJvZHkpXG4gICAge1xuICAgICAgICAvL21ha2UgbGlua3MgY2xpY2thYmxlXG4gICAgICAgIGJvZHkgPSBSZXBsYWNlbWVudFByb3RvLmxpbmtpZnkoYm9keSk7XG5cbiAgICAgICAgLy9hZGQgc21pbGV5c1xuICAgICAgICBib2R5ID0gc21pbGlmeShib2R5KTtcblxuICAgICAgICByZXR1cm4gYm9keTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaW5kcyBhbmQgcmVwbGFjZXMgYWxsIGxpbmtzIGluIHRoZSBsaW5rcyBpbiBcImJvZHlcIlxuICAgICAqIHdpdGggdGhlaXIgPGEgaHJlZj1cIlwiPjwvYT5cbiAgICAgKi9cbiAgICBSZXBsYWNlbWVudFByb3RvLmxpbmtpZnkgPSBmdW5jdGlvbihpbnB1dFRleHQpXG4gICAge1xuICAgICAgICB2YXIgcmVwbGFjZWRUZXh0LCByZXBsYWNlUGF0dGVybjEsIHJlcGxhY2VQYXR0ZXJuMiwgcmVwbGFjZVBhdHRlcm4zO1xuXG4gICAgICAgIC8vVVJMcyBzdGFydGluZyB3aXRoIGh0dHA6Ly8sIGh0dHBzOi8vLCBvciBmdHA6Ly9cbiAgICAgICAgcmVwbGFjZVBhdHRlcm4xID0gLyhcXGIoaHR0cHM/fGZ0cCk6XFwvXFwvWy1BLVowLTkrJkAjXFwvJT89fl98ITosLjtdKlstQS1aMC05KyZAI1xcLyU9fl98XSkvZ2ltO1xuICAgICAgICByZXBsYWNlZFRleHQgPSBpbnB1dFRleHQucmVwbGFjZShyZXBsYWNlUGF0dGVybjEsICc8YSBocmVmPVwiJDFcIiB0YXJnZXQ9XCJfYmxhbmtcIj4kMTwvYT4nKTtcblxuICAgICAgICAvL1VSTHMgc3RhcnRpbmcgd2l0aCBcInd3dy5cIiAod2l0aG91dCAvLyBiZWZvcmUgaXQsIG9yIGl0J2QgcmUtbGluayB0aGUgb25lcyBkb25lIGFib3ZlKS5cbiAgICAgICAgcmVwbGFjZVBhdHRlcm4yID0gLyhefFteXFwvXSkod3d3XFwuW1xcU10rKFxcYnwkKSkvZ2ltO1xuICAgICAgICByZXBsYWNlZFRleHQgPSByZXBsYWNlZFRleHQucmVwbGFjZShyZXBsYWNlUGF0dGVybjIsICckMTxhIGhyZWY9XCJodHRwOi8vJDJcIiB0YXJnZXQ9XCJfYmxhbmtcIj4kMjwvYT4nKTtcblxuICAgICAgICAvL0NoYW5nZSBlbWFpbCBhZGRyZXNzZXMgdG8gbWFpbHRvOjogbGlua3MuXG4gICAgICAgIHJlcGxhY2VQYXR0ZXJuMyA9IC8oKFthLXpBLVowLTlcXC1cXF9cXC5dKStAW2EtekEtWlxcX10rPyhcXC5bYS16QS1aXXsyLDZ9KSspL2dpbTtcbiAgICAgICAgcmVwbGFjZWRUZXh0ID0gcmVwbGFjZWRUZXh0LnJlcGxhY2UocmVwbGFjZVBhdHRlcm4zLCAnPGEgaHJlZj1cIm1haWx0bzokMVwiPiQxPC9hPicpO1xuXG4gICAgICAgIHJldHVybiByZXBsYWNlZFRleHQ7XG4gICAgfVxuICAgIHJldHVybiBSZXBsYWNlbWVudFByb3RvO1xufSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlcGxhY2VtZW50O1xuXG5cblxuIiwiLyogZ2xvYmFsICQsIGNvbmZpZywgUHJlemksIFV0aWwsIGNvbm5lY3Rpb24sIHNldExhcmdlVmlkZW9WaXNpYmxlLCBkb2NrVG9vbGJhciAqL1xudmFyIFByZXppID0gcmVxdWlyZShcIi4uL3ByZXppL1ByZXppLmpzXCIpO1xudmFyIFVJVXRpbCA9IHJlcXVpcmUoXCIuLi9VSVV0aWwuanNcIik7XG5cbnZhciBFdGhlcnBhZCA9IChmdW5jdGlvbiAobXkpIHtcbiAgICB2YXIgZXRoZXJwYWROYW1lID0gbnVsbDtcbiAgICB2YXIgZXRoZXJwYWRJRnJhbWUgPSBudWxsO1xuICAgIHZhciBkb21haW4gPSBudWxsO1xuICAgIHZhciBvcHRpb25zID0gXCI/c2hvd0NvbnRyb2xzPXRydWUmc2hvd0NoYXQ9ZmFsc2Umc2hvd0xpbmVOdW1iZXJzPXRydWUmdXNlTW9ub3NwYWNlRm9udD1mYWxzZVwiO1xuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGV0aGVycGFkLlxuICAgICAqL1xuICAgIG15LmluaXQgPSBmdW5jdGlvbiAobmFtZSkge1xuXG4gICAgICAgIGlmIChjb25maWcuZXRoZXJwYWRfYmFzZSAmJiAhZXRoZXJwYWROYW1lKSB7XG5cbiAgICAgICAgICAgIGRvbWFpbiA9IGNvbmZpZy5ldGhlcnBhZF9iYXNlO1xuXG4gICAgICAgICAgICBpZiAoIW5hbWUpIHtcbiAgICAgICAgICAgICAgICAvLyBJbiBjYXNlIHdlJ3JlIHRoZSBmb2N1cyB3ZSBnZW5lcmF0ZSB0aGUgbmFtZS5cbiAgICAgICAgICAgICAgICBldGhlcnBhZE5hbWUgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNykgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnXycgKyAobmV3IERhdGUoKS5nZXRUaW1lKCkpLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgc2hhcmVFdGhlcnBhZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIGV0aGVycGFkTmFtZSA9IG5hbWU7XG5cbiAgICAgICAgICAgIGVuYWJsZUV0aGVycGFkQnV0dG9uKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogT3BlbnMvaGlkZXMgdGhlIEV0aGVycGFkLlxuICAgICAqL1xuICAgIG15LnRvZ2dsZUV0aGVycGFkID0gZnVuY3Rpb24gKGlzUHJlc2VudGF0aW9uKSB7XG4gICAgICAgIGlmICghZXRoZXJwYWRJRnJhbWUpXG4gICAgICAgICAgICBjcmVhdGVJRnJhbWUoKTtcblxuICAgICAgICB2YXIgbGFyZ2VWaWRlbyA9IG51bGw7XG4gICAgICAgIGlmIChQcmV6aS5pc1ByZXNlbnRhdGlvblZpc2libGUoKSlcbiAgICAgICAgICAgIGxhcmdlVmlkZW8gPSAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBsYXJnZVZpZGVvID0gJCgnI2xhcmdlVmlkZW8nKTtcblxuICAgICAgICBpZiAoJCgnI2V0aGVycGFkPmlmcmFtZScpLmNzcygndmlzaWJpbGl0eScpID09PSAnaGlkZGVuJykge1xuICAgICAgICAgICAgbGFyZ2VWaWRlby5mYWRlT3V0KDMwMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChQcmV6aS5pc1ByZXNlbnRhdGlvblZpc2libGUoKSkge1xuICAgICAgICAgICAgICAgICAgICBsYXJnZVZpZGVvLmNzcyh7b3BhY2l0eTogJzAnfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2V0TGFyZ2VWaWRlb1Zpc2libGUoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBUb29sYmFyLmRvY2tUb29sYmFyKHRydWUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICQoJyNldGhlcnBhZD5pZnJhbWUnKS5mYWRlSW4oMzAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuc3R5bGUuYmFja2dyb3VuZCA9ICcjZWVlZWVlJztcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V0aGVycGFkPmlmcmFtZScpLmNzcyh7dmlzaWJpbGl0eTogJ3Zpc2libGUnfSk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNldGhlcnBhZCcpLmNzcyh7ekluZGV4OiAyfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICgkKCcjZXRoZXJwYWQ+aWZyYW1lJykpIHtcbiAgICAgICAgICAgICQoJyNldGhlcnBhZD5pZnJhbWUnKS5mYWRlT3V0KDMwMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICQoJyNldGhlcnBhZD5pZnJhbWUnKS5jc3Moe3Zpc2liaWxpdHk6ICdoaWRkZW4nfSk7XG4gICAgICAgICAgICAgICAgJCgnI2V0aGVycGFkJykuY3NzKHt6SW5kZXg6IDB9KTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLmJhY2tncm91bmQgPSAnYmxhY2snO1xuICAgICAgICAgICAgICAgIGlmICghaXNQcmVzZW50YXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5mYWRlSW4oMzAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zZXRMYXJnZVZpZGVvVmlzaWJsZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFRvb2xiYXIuZG9ja1Rvb2xiYXIoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXNpemUoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVzaXplcyB0aGUgZXRoZXJwYWQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVzaXplKCkge1xuICAgICAgICBpZiAoJCgnI2V0aGVycGFkPmlmcmFtZScpLmxlbmd0aCkge1xuICAgICAgICAgICAgdmFyIHJlbW90ZVZpZGVvcyA9ICQoJyNyZW1vdGVWaWRlb3MnKTtcbiAgICAgICAgICAgIHZhciBhdmFpbGFibGVIZWlnaHRcbiAgICAgICAgICAgICAgICA9IHdpbmRvdy5pbm5lckhlaWdodCAtIHJlbW90ZVZpZGVvcy5vdXRlckhlaWdodCgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coVUlVdGlsKTtcbiAgICAgICAgICAgIHZhciBhdmFpbGFibGVXaWR0aCA9IFVJVXRpbC5nZXRBdmFpbGFibGVWaWRlb1dpZHRoKCk7XG5cbiAgICAgICAgICAgICQoJyNldGhlcnBhZD5pZnJhbWUnKS53aWR0aChhdmFpbGFibGVXaWR0aCk7XG4gICAgICAgICAgICAkKCcjZXRoZXJwYWQ+aWZyYW1lJykuaGVpZ2h0KGF2YWlsYWJsZUhlaWdodCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTaGFyZXMgdGhlIEV0aGVycGFkIG5hbWUgd2l0aCBvdGhlciBwYXJ0aWNpcGFudHMuXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2hhcmVFdGhlcnBhZCgpIHtcbiAgICAgICAgY29ubmVjdGlvbi5lbXVjLmFkZEV0aGVycGFkVG9QcmVzZW5jZShldGhlcnBhZE5hbWUpO1xuICAgICAgICBjb25uZWN0aW9uLmVtdWMuc2VuZFByZXNlbmNlKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyB0aGUgRXRoZXJwYWQgYnV0dG9uIGFuZCBhZGRzIGl0IHRvIHRoZSB0b29sYmFyLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGVuYWJsZUV0aGVycGFkQnV0dG9uKCkge1xuICAgICAgICBpZiAoISQoJyNldGhlcnBhZEJ1dHRvbicpLmlzKFwiOnZpc2libGVcIikpXG4gICAgICAgICAgICAkKCcjZXRoZXJwYWRCdXR0b24nKS5jc3Moe2Rpc3BsYXk6ICdpbmxpbmUtYmxvY2snfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyB0aGUgSUZyYW1lIGZvciB0aGUgZXRoZXJwYWQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlSUZyYW1lKCkge1xuICAgICAgICBldGhlcnBhZElGcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lmcmFtZScpO1xuICAgICAgICBldGhlcnBhZElGcmFtZS5zcmMgPSBkb21haW4gKyBldGhlcnBhZE5hbWUgKyBvcHRpb25zO1xuICAgICAgICBldGhlcnBhZElGcmFtZS5mcmFtZUJvcmRlciA9IDA7XG4gICAgICAgIGV0aGVycGFkSUZyYW1lLnNjcm9sbGluZyA9IFwibm9cIjtcbiAgICAgICAgZXRoZXJwYWRJRnJhbWUud2lkdGggPSAkKCcjbGFyZ2VWaWRlb0NvbnRhaW5lcicpLndpZHRoKCkgfHwgNjQwO1xuICAgICAgICBldGhlcnBhZElGcmFtZS5oZWlnaHQgPSAkKCcjbGFyZ2VWaWRlb0NvbnRhaW5lcicpLmhlaWdodCgpIHx8IDQ4MDtcbiAgICAgICAgZXRoZXJwYWRJRnJhbWUuc2V0QXR0cmlidXRlKCdzdHlsZScsICd2aXNpYmlsaXR5OiBoaWRkZW47Jyk7XG5cbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2V0aGVycGFkJykuYXBwZW5kQ2hpbGQoZXRoZXJwYWRJRnJhbWUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE9uIEV0aGVycGFkIGFkZGVkIHRvIG11Yy5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdldGhlcnBhZGFkZGVkLm11YycsIGZ1bmN0aW9uIChldmVudCwgamlkLCBldGhlcnBhZE5hbWUpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJFdGhlcnBhZCBhZGRlZFwiLCBldGhlcnBhZE5hbWUpO1xuICAgICAgICBpZiAoY29uZmlnLmV0aGVycGFkX2Jhc2UgJiYgIWZvY3VzKSB7XG4gICAgICAgICAgICBFdGhlcnBhZC5pbml0KGV0aGVycGFkTmFtZSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIE9uIGZvY3VzIGNoYW5nZWQgZXZlbnQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgnZm9jdXNlY2hhbmdlZC5tdWMnLCBmdW5jdGlvbiAoZXZlbnQsIGZvY3VzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRm9jdXMgY2hhbmdlZFwiKTtcbiAgICAgICAgaWYgKGNvbmZpZy5ldGhlcnBhZF9iYXNlKVxuICAgICAgICAgICAgc2hhcmVFdGhlcnBhZCgpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogT24gdmlkZW8gc2VsZWN0ZWQgZXZlbnQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgndmlkZW8uc2VsZWN0ZWQnLCBmdW5jdGlvbiAoZXZlbnQsIGlzUHJlc2VudGF0aW9uKSB7XG4gICAgICAgIGlmICghY29uZmlnLmV0aGVycGFkX2Jhc2UpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgaWYgKGV0aGVycGFkSUZyYW1lICYmIGV0aGVycGFkSUZyYW1lLnN0eWxlLnZpc2liaWxpdHkgIT09ICdoaWRkZW4nKVxuICAgICAgICAgICAgRXRoZXJwYWQudG9nZ2xlRXRoZXJwYWQoaXNQcmVzZW50YXRpb24pO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogUmVzaXplcyB0aGUgZXRoZXJwYWQsIHdoZW4gdGhlIHdpbmRvdyBpcyByZXNpemVkLlxuICAgICAqL1xuICAgICQod2luZG93KS5yZXNpemUoZnVuY3Rpb24gKCkge1xuICAgICAgICByZXNpemUoKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBteTtcbn0oRXRoZXJwYWQgfHwge30pKTtcblxubW9kdWxlLmV4cG9ydHMgPSBFdGhlcnBhZDsiLCJ2YXIgUHJlemlQbGF5ZXIgPSByZXF1aXJlKFwiLi9QcmV6aVBsYXllci5qc1wiKTtcbnZhciBVSVV0aWwgPSByZXF1aXJlKFwiLi4vVUlVdGlsLmpzXCIpO1xuXG52YXIgUHJlemkgPSAoZnVuY3Rpb24gKG15KSB7XG4gICAgdmFyIHByZXppUGxheWVyID0gbnVsbDtcblxuICAgIC8qKlxuICAgICAqIFJlbG9hZHMgdGhlIGN1cnJlbnQgcHJlc2VudGF0aW9uLlxuICAgICAqL1xuICAgIG15LnJlbG9hZFByZXNlbnRhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgaWZyYW1lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQocHJlemlQbGF5ZXIub3B0aW9ucy5wcmV6aUlkKTtcbiAgICAgICAgaWZyYW1lLnNyYyA9IGlmcmFtZS5zcmM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3dzL2hpZGVzIGEgcHJlc2VudGF0aW9uLlxuICAgICAqL1xuICAgIG15LnNldFByZXNlbnRhdGlvblZpc2libGUgPSBmdW5jdGlvbiAodmlzaWJsZSkge1xuICAgICAgICBpZiAodmlzaWJsZSkge1xuICAgICAgICAgICAgLy8gVHJpZ2dlciB0aGUgdmlkZW8uc2VsZWN0ZWQgZXZlbnQgdG8gaW5kaWNhdGUgYSBjaGFuZ2UgaW4gdGhlXG4gICAgICAgICAgICAvLyBsYXJnZSB2aWRlby5cbiAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoXCJ2aWRlby5zZWxlY3RlZFwiLCBbdHJ1ZV0pO1xuXG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlbycpLmZhZGVPdXQoMzAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2V0TGFyZ2VWaWRlb1Zpc2libGUoZmFsc2UpO1xuICAgICAgICAgICAgICAgICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykuZmFkZUluKDMwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykuY3NzKHtvcGFjaXR5OicxJ30pO1xuICAgICAgICAgICAgICAgICAgICBUb29sYmFyLmRvY2tUb29sYmFyKHRydWUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAoJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS5jc3MoJ29wYWNpdHknKSA9PSAnMScpIHtcbiAgICAgICAgICAgICAgICAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLmZhZGVPdXQoMzAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykuY3NzKHtvcGFjaXR5OicwJ30pO1xuICAgICAgICAgICAgICAgICAgICAkKCcjcmVsb2FkUHJlc2VudGF0aW9uJykuY3NzKHtkaXNwbGF5Oidub25lJ30pO1xuICAgICAgICAgICAgICAgICAgICAkKCcjbGFyZ2VWaWRlbycpLmZhZGVJbigzMDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2V0TGFyZ2VWaWRlb1Zpc2libGUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBUb29sYmFyLmRvY2tUb29sYmFyKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyA8dHQ+dHJ1ZTwvdHQ+IGlmIHRoZSBwcmVzZW50YXRpb24gaXMgdmlzaWJsZSwgPHR0PmZhbHNlPC90dD4gLVxuICAgICAqIG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBteS5pc1ByZXNlbnRhdGlvblZpc2libGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAoJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKSAhPSBudWxsXG4gICAgICAgICAgICAgICAgJiYgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS5jc3MoJ29wYWNpdHknKSA9PSAxKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogT3BlbnMgdGhlIFByZXppIGRpYWxvZywgZnJvbSB3aGljaCB0aGUgdXNlciBjb3VsZCBjaG9vc2UgYSBwcmVzZW50YXRpb25cbiAgICAgKiB0byBsb2FkLlxuICAgICAqL1xuICAgIG15Lm9wZW5QcmV6aURpYWxvZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXlwcmV6aSA9IGNvbm5lY3Rpb24uZW11Yy5nZXRQcmV6aShjb25uZWN0aW9uLmVtdWMubXlyb29tamlkKTtcbiAgICAgICAgaWYgKG15cHJlemkpIHtcbiAgICAgICAgICAgICQucHJvbXB0KFwiQXJlIHlvdSBzdXJlIHlvdSB3b3VsZCBsaWtlIHRvIHJlbW92ZSB5b3VyIFByZXppP1wiLFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIlJlbW92ZSBQcmV6aVwiLFxuICAgICAgICAgICAgICAgICAgICBidXR0b25zOiB7IFwiUmVtb3ZlXCI6IHRydWUsIFwiQ2FuY2VsXCI6IGZhbHNlfSxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdEJ1dHRvbjogMSxcbiAgICAgICAgICAgICAgICAgICAgc3VibWl0OiBmdW5jdGlvbihlLHYsbSxmKXtcbiAgICAgICAgICAgICAgICAgICAgaWYodilcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGlvbi5lbXVjLnJlbW92ZVByZXppRnJvbVByZXNlbmNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuc2VuZFByZXNlbmNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChwcmV6aVBsYXllciAhPSBudWxsKSB7XG4gICAgICAgICAgICAkLnByb21wdChcIkFub3RoZXIgcGFydGljaXBhbnQgaXMgYWxyZWFkeSBzaGFyaW5nIGEgUHJlemkuXCIgK1xuICAgICAgICAgICAgICAgICAgICBcIlRoaXMgY29uZmVyZW5jZSBhbGxvd3Mgb25seSBvbmUgUHJlemkgYXQgYSB0aW1lLlwiLFxuICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IFwiU2hhcmUgYSBQcmV6aVwiLFxuICAgICAgICAgICAgICAgICAgICAgYnV0dG9uczogeyBcIk9rXCI6IHRydWV9LFxuICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdEJ1dHRvbjogMCxcbiAgICAgICAgICAgICAgICAgICAgIHN1Ym1pdDogZnVuY3Rpb24oZSx2LG0sZil7XG4gICAgICAgICAgICAgICAgICAgICAgICAkLnByb21wdC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgb3BlblByZXppU3RhdGUgPSB7XG4gICAgICAgICAgICBzdGF0ZTA6IHtcbiAgICAgICAgICAgICAgICBodG1sOiAgICc8aDI+U2hhcmUgYSBQcmV6aTwvaDI+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnPGlucHV0IGlkPVwicHJlemlVcmxcIiB0eXBlPVwidGV4dFwiICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ3BsYWNlaG9sZGVyPVwiZS5nLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICdodHRwOi8vcHJlemkuY29tL3d6N3ZoanljbDdlNi9teS1wcmV6aVwiIGF1dG9mb2N1cz4nLFxuICAgICAgICAgICAgICAgIHBlcnNpc3RlbnQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGJ1dHRvbnM6IHsgXCJTaGFyZVwiOiB0cnVlICwgXCJDYW5jZWxcIjogZmFsc2V9LFxuICAgICAgICAgICAgICAgIGRlZmF1bHRCdXR0b246IDEsXG4gICAgICAgICAgICAgICAgc3VibWl0OiBmdW5jdGlvbihlLHYsbSxmKXtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBpZih2KVxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcHJlemlVcmwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJlemlVcmwnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZXppVXJsLnZhbHVlKVxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1cmxWYWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA9IGVuY29kZVVSSShVdGlsLmVzY2FwZUh0bWwocHJlemlVcmwudmFsdWUpKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh1cmxWYWx1ZS5pbmRleE9mKCdodHRwOi8vcHJlemkuY29tLycpICE9IDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgdXJsVmFsdWUuaW5kZXhPZignaHR0cHM6Ly9wcmV6aS5jb20vJykgIT0gMClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQucHJvbXB0LmdvVG9TdGF0ZSgnc3RhdGUxJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwcmVzSWRUbXAgPSB1cmxWYWx1ZS5zdWJzdHJpbmcoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsVmFsdWUuaW5kZXhPZihcInByZXppLmNvbS9cIikgKyAxMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXNBbHBoYW51bWVyaWMocHJlc0lkVG1wKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IHByZXNJZFRtcC5pbmRleE9mKCcvJykgPCAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkLnByb21wdC5nb1RvU3RhdGUoJ3N0YXRlMScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGlvbi5lbXVjXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFkZFByZXppVG9QcmVzZW5jZSh1cmxWYWx1ZSwgMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuc2VuZFByZXNlbmNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkLnByb21wdC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICQucHJvbXB0LmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN0YXRlMToge1xuICAgICAgICAgICAgICAgIGh0bWw6ICAgJzxoMj5TaGFyZSBhIFByZXppPC9oMj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICdQbGVhc2UgcHJvdmlkZSBhIGNvcnJlY3QgcHJlemkgbGluay4nLFxuICAgICAgICAgICAgICAgIHBlcnNpc3RlbnQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGJ1dHRvbnM6IHsgXCJCYWNrXCI6IHRydWUsIFwiQ2FuY2VsXCI6IGZhbHNlIH0sXG4gICAgICAgICAgICAgICAgZGVmYXVsdEJ1dHRvbjogMSxcbiAgICAgICAgICAgICAgICBzdWJtaXQ6ZnVuY3Rpb24oZSx2LG0sZikge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmKHY9PTApXG4gICAgICAgICAgICAgICAgICAgICAgICAkLnByb21wdC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAkLnByb21wdC5nb1RvU3RhdGUoJ3N0YXRlMCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBteVByb21wdCA9IGpRdWVyeS5wcm9tcHQob3BlblByZXppU3RhdGUpO1xuXG4gICAgICAgICAgICBteVByb21wdC5vbignaW1wcm9tcHR1OmxvYWRlZCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcmV6aVVybCcpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIG15UHJvbXB0Lm9uKCdpbXByb21wdHU6c3RhdGVjaGFuZ2VkJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByZXppVXJsJykuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEEgbmV3IHByZXNlbnRhdGlvbiBoYXMgYmVlbiBhZGRlZC5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0gZXZlbnQgdGhlIGV2ZW50IGluZGljYXRpbmcgdGhlIGFkZCBvZiBhIHByZXNlbnRhdGlvblxuICAgICAqIEBwYXJhbSBqaWQgdGhlIGppZCBmcm9tIHdoaWNoIHRoZSBwcmVzZW50YXRpb24gd2FzIGFkZGVkXG4gICAgICogQHBhcmFtIHByZXNVcmwgdXJsIG9mIHRoZSBwcmVzZW50YXRpb25cbiAgICAgKiBAcGFyYW0gY3VycmVudFNsaWRlIHRoZSBjdXJyZW50IHNsaWRlIHRvIHdoaWNoIHdlIHNob3VsZCBtb3ZlXG4gICAgICovXG4gICAgdmFyIHByZXNlbnRhdGlvbkFkZGVkID0gZnVuY3Rpb24oZXZlbnQsIGppZCwgcHJlc1VybCwgY3VycmVudFNsaWRlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwicHJlc2VudGF0aW9uIGFkZGVkXCIsIHByZXNVcmwpO1xuXG4gICAgICAgIHZhciBwcmVzSWQgPSBnZXRQcmVzZW50YXRpb25JZChwcmVzVXJsKTtcblxuICAgICAgICB2YXIgZWxlbWVudElkID0gJ3BhcnRpY2lwYW50XydcbiAgICAgICAgICAgICAgICAgICAgICAgICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKVxuICAgICAgICAgICAgICAgICAgICAgICAgKyAnXycgKyBwcmVzSWQ7XG5cbiAgICAgICAgLy8gV2UgZXhwbGljaXRseSBkb24ndCBzcGVjaWZ5IHRoZSBwZWVyIGppZCBoZXJlLCBiZWNhdXNlIHdlIGRvbid0IHdhbnRcbiAgICAgICAgLy8gdGhpcyB2aWRlbyB0byBiZSBkZWFsdCB3aXRoIGFzIGEgcGVlciByZWxhdGVkIG9uZSAoZm9yIGV4YW1wbGUgd2VcbiAgICAgICAgLy8gZG9uJ3Qgd2FudCB0byBzaG93IGEgbXV0ZS9raWNrIG1lbnUgZm9yIHRoaXMgb25lLCBldGMuKS5cbiAgICAgICAgVmlkZW9MYXlvdXQuYWRkUmVtb3RlVmlkZW9Db250YWluZXIobnVsbCwgZWxlbWVudElkKTtcbiAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplVGh1bWJuYWlscygpO1xuXG4gICAgICAgIHZhciBjb250cm9sc0VuYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgaWYgKGppZCA9PT0gY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZClcbiAgICAgICAgICAgIGNvbnRyb2xzRW5hYmxlZCA9IHRydWU7XG5cbiAgICAgICAgUHJlemkuc2V0UHJlc2VudGF0aW9uVmlzaWJsZSh0cnVlKTtcbiAgICAgICAgJCgnI2xhcmdlVmlkZW9Db250YWluZXInKS5ob3ZlcihcbiAgICAgICAgICAgIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIGlmIChQcmV6aS5pc1ByZXNlbnRhdGlvblZpc2libGUoKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVsb2FkQnV0dG9uUmlnaHQgPSB3aW5kb3cuaW5uZXJXaWR0aFxuICAgICAgICAgICAgICAgICAgICAgICAgLSAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLm9mZnNldCgpLmxlZnRcbiAgICAgICAgICAgICAgICAgICAgICAgIC0gJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS53aWR0aCgpO1xuXG4gICAgICAgICAgICAgICAgICAgICQoJyNyZWxvYWRQcmVzZW50YXRpb24nKS5jc3MoeyAgcmlnaHQ6IHJlbG9hZEJ1dHRvblJpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc3BsYXk6J2lubGluZS1ibG9jayd9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKCFQcmV6aS5pc1ByZXNlbnRhdGlvblZpc2libGUoKSlcbiAgICAgICAgICAgICAgICAgICAgJCgnI3JlbG9hZFByZXNlbnRhdGlvbicpLmNzcyh7ZGlzcGxheTonbm9uZSd9KTtcbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGUgPSBldmVudC50b0VsZW1lbnQgfHwgZXZlbnQucmVsYXRlZFRhcmdldDtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoZSAmJiBlLmlkICE9ICdyZWxvYWRQcmVzZW50YXRpb24nICYmIGUuaWQgIT0gJ2hlYWRlcicpXG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcjcmVsb2FkUHJlc2VudGF0aW9uJykuY3NzKHtkaXNwbGF5Oidub25lJ30pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIHByZXppUGxheWVyID0gbmV3IFByZXppUGxheWVyKFxuICAgICAgICAgICAgICAgICAgICAncHJlc2VudGF0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAge3ByZXppSWQ6IHByZXNJZCxcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGdldFByZXNlbnRhdGlvbldpZHRoKCksXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogZ2V0UHJlc2VudGF0aW9uSGVpaGd0KCksXG4gICAgICAgICAgICAgICAgICAgIGNvbnRyb2xzOiBjb250cm9sc0VuYWJsZWQsXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykuYXR0cignaWQnLCBwcmV6aVBsYXllci5vcHRpb25zLnByZXppSWQpO1xuXG4gICAgICAgIHByZXppUGxheWVyLm9uKFByZXppUGxheWVyLkVWRU5UX1NUQVRVUywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicHJlemkgc3RhdHVzXCIsIGV2ZW50LnZhbHVlKTtcbiAgICAgICAgICAgIGlmIChldmVudC52YWx1ZSA9PSBQcmV6aVBsYXllci5TVEFUVVNfQ09OVEVOVF9SRUFEWSkge1xuICAgICAgICAgICAgICAgIGlmIChqaWQgIT0gY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZClcbiAgICAgICAgICAgICAgICAgICAgcHJlemlQbGF5ZXIuZmx5VG9TdGVwKGN1cnJlbnRTbGlkZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHByZXppUGxheWVyLm9uKFByZXppUGxheWVyLkVWRU5UX0NVUlJFTlRfU1RFUCwgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZXZlbnQgdmFsdWVcIiwgZXZlbnQudmFsdWUpO1xuICAgICAgICAgICAgY29ubmVjdGlvbi5lbXVjLmFkZEN1cnJlbnRTbGlkZVRvUHJlc2VuY2UoZXZlbnQudmFsdWUpO1xuICAgICAgICAgICAgY29ubmVjdGlvbi5lbXVjLnNlbmRQcmVzZW5jZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkKFwiI1wiICsgZWxlbWVudElkKS5jc3MoICdiYWNrZ3JvdW5kLWltYWdlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3VybCguLi9pbWFnZXMvYXZhdGFycHJlemkucG5nKScpO1xuICAgICAgICAkKFwiI1wiICsgZWxlbWVudElkKS5jbGljayhcbiAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBQcmV6aS5zZXRQcmVzZW50YXRpb25WaXNpYmxlKHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBIHByZXNlbnRhdGlvbiBoYXMgYmVlbiByZW1vdmVkLlxuICAgICAqIFxuICAgICAqIEBwYXJhbSBldmVudCB0aGUgZXZlbnQgaW5kaWNhdGluZyB0aGUgcmVtb3ZlIG9mIGEgcHJlc2VudGF0aW9uXG4gICAgICogQHBhcmFtIGppZCB0aGUgamlkIGZvciB3aGljaCB0aGUgcHJlc2VudGF0aW9uIHdhcyByZW1vdmVkXG4gICAgICogQHBhcmFtIHRoZSB1cmwgb2YgdGhlIHByZXNlbnRhdGlvblxuICAgICAqL1xuICAgIHZhciBwcmVzZW50YXRpb25SZW1vdmVkID0gZnVuY3Rpb24gKGV2ZW50LCBqaWQsIHByZXNVcmwpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3ByZXNlbnRhdGlvbiByZW1vdmVkJywgcHJlc1VybCk7XG4gICAgICAgIHZhciBwcmVzSWQgPSBnZXRQcmVzZW50YXRpb25JZChwcmVzVXJsKTtcbiAgICAgICAgUHJlemkuc2V0UHJlc2VudGF0aW9uVmlzaWJsZShmYWxzZSk7XG4gICAgICAgICQoJyNwYXJ0aWNpcGFudF8nXG4gICAgICAgICAgICAgICAgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpXG4gICAgICAgICAgICAgICAgKyAnXycgKyBwcmVzSWQpLnJlbW92ZSgpO1xuICAgICAgICAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLnJlbW92ZSgpO1xuICAgICAgICBpZiAocHJlemlQbGF5ZXIgIT0gbnVsbCkge1xuICAgICAgICAgICAgcHJlemlQbGF5ZXIuZGVzdHJveSgpO1xuICAgICAgICAgICAgcHJlemlQbGF5ZXIgPSBudWxsO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEluZGljYXRlcyBpZiB0aGUgZ2l2ZW4gc3RyaW5nIGlzIGFuIGFscGhhbnVtZXJpYyBzdHJpbmcuXG4gICAgICogTm90ZSB0aGF0IHNvbWUgc3BlY2lhbCBjaGFyYWN0ZXJzIGFyZSBhbHNvIGFsbG93ZWQgKC0sIF8gLCAvLCAmLCA/LCA9LCA7KSBmb3IgdGhlXG4gICAgICogcHVycG9zZSBvZiBjaGVja2luZyBVUklzLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzQWxwaGFudW1lcmljKHVuc2FmZVRleHQpIHtcbiAgICAgICAgdmFyIHJlZ2V4ID0gL15bYS16MC05LV9cXC8mXFw/PTtdKyQvaTtcbiAgICAgICAgcmV0dXJuIHJlZ2V4LnRlc3QodW5zYWZlVGV4dCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgcHJlc2VudGF0aW9uIGlkIGZyb20gdGhlIGdpdmVuIHVybC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRQcmVzZW50YXRpb25JZCAocHJlc1VybCkge1xuICAgICAgICB2YXIgcHJlc0lkVG1wID0gcHJlc1VybC5zdWJzdHJpbmcocHJlc1VybC5pbmRleE9mKFwicHJlemkuY29tL1wiKSArIDEwKTtcbiAgICAgICAgcmV0dXJuIHByZXNJZFRtcC5zdWJzdHJpbmcoMCwgcHJlc0lkVG1wLmluZGV4T2YoJy8nKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgcHJlc2VudGF0aW9uIHdpZHRoLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFByZXNlbnRhdGlvbldpZHRoKCkge1xuICAgICAgICB2YXIgYXZhaWxhYmxlV2lkdGggPSBVSVV0aWwuZ2V0QXZhaWxhYmxlVmlkZW9XaWR0aCgpO1xuICAgICAgICB2YXIgYXZhaWxhYmxlSGVpZ2h0ID0gZ2V0UHJlc2VudGF0aW9uSGVpaGd0KCk7XG5cbiAgICAgICAgdmFyIGFzcGVjdFJhdGlvID0gMTYuMCAvIDkuMDtcbiAgICAgICAgaWYgKGF2YWlsYWJsZUhlaWdodCA8IGF2YWlsYWJsZVdpZHRoIC8gYXNwZWN0UmF0aW8pIHtcbiAgICAgICAgICAgIGF2YWlsYWJsZVdpZHRoID0gTWF0aC5mbG9vcihhdmFpbGFibGVIZWlnaHQgKiBhc3BlY3RSYXRpbyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGF2YWlsYWJsZVdpZHRoO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHByZXNlbnRhdGlvbiBoZWlnaHQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UHJlc2VudGF0aW9uSGVpaGd0KCkge1xuICAgICAgICB2YXIgcmVtb3RlVmlkZW9zID0gJCgnI3JlbW90ZVZpZGVvcycpO1xuICAgICAgICByZXR1cm4gd2luZG93LmlubmVySGVpZ2h0IC0gcmVtb3RlVmlkZW9zLm91dGVySGVpZ2h0KCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVzaXplcyB0aGUgcHJlc2VudGF0aW9uIGlmcmFtZS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiByZXNpemUoKSB7XG4gICAgICAgIGlmICgkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpKSB7XG4gICAgICAgICAgICAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLndpZHRoKGdldFByZXNlbnRhdGlvbldpZHRoKCkpO1xuICAgICAgICAgICAgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS5oZWlnaHQoZ2V0UHJlc2VudGF0aW9uSGVpaGd0KCkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUHJlc2VudGF0aW9uIGhhcyBiZWVuIHJlbW92ZWQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgncHJlc2VudGF0aW9ucmVtb3ZlZC5tdWMnLCBwcmVzZW50YXRpb25SZW1vdmVkKTtcblxuICAgIC8qKlxuICAgICAqIFByZXNlbnRhdGlvbiBoYXMgYmVlbiBhZGRlZC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdwcmVzZW50YXRpb25hZGRlZC5tdWMnLCBwcmVzZW50YXRpb25BZGRlZCk7XG5cbiAgICAvKlxuICAgICAqIEluZGljYXRlcyBwcmVzZW50YXRpb24gc2xpZGUgY2hhbmdlLlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ2dvdG9zbGlkZS5tdWMnLCBmdW5jdGlvbiAoZXZlbnQsIGppZCwgcHJlc1VybCwgY3VycmVudCkge1xuICAgICAgICBpZiAocHJlemlQbGF5ZXIgJiYgcHJlemlQbGF5ZXIuZ2V0Q3VycmVudFN0ZXAoKSAhPSBjdXJyZW50KSB7XG4gICAgICAgICAgICBwcmV6aVBsYXllci5mbHlUb1N0ZXAoY3VycmVudCk7XG5cbiAgICAgICAgICAgIHZhciBhbmltYXRpb25TdGVwc0FycmF5ID0gcHJlemlQbGF5ZXIuZ2V0QW5pbWF0aW9uQ291bnRPblN0ZXBzKCk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnNlSW50KGFuaW1hdGlvblN0ZXBzQXJyYXlbY3VycmVudF0pOyBpKyspIHtcbiAgICAgICAgICAgICAgICBwcmV6aVBsYXllci5mbHlUb1N0ZXAoY3VycmVudCwgaSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIE9uIHZpZGVvIHNlbGVjdGVkIGV2ZW50LlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ3ZpZGVvLnNlbGVjdGVkJywgZnVuY3Rpb24gKGV2ZW50LCBpc1ByZXNlbnRhdGlvbikge1xuICAgICAgICBpZiAoIWlzUHJlc2VudGF0aW9uICYmICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykpXG4gICAgICAgICAgICBQcmV6aS5zZXRQcmVzZW50YXRpb25WaXNpYmxlKGZhbHNlKTtcbiAgICB9KTtcblxuICAgICQod2luZG93KS5yZXNpemUoZnVuY3Rpb24gKCkge1xuICAgICAgICByZXNpemUoKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBteTtcbn0oUHJlemkgfHwge30pKTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcmV6aTsiLCJtb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB2YXIgX19iaW5kID0gZnVuY3Rpb24oZm4sIG1lKXsgcmV0dXJuIGZ1bmN0aW9uKCl7IHJldHVybiBmbi5hcHBseShtZSwgYXJndW1lbnRzKTsgfTsgfTtcblxuICAgIHZhciBQcmV6aVBsYXllciA9IChmdW5jdGlvbigpIHtcblxuICAgICAgICBQcmV6aVBsYXllci5BUElfVkVSU0lPTiA9IDE7XG4gICAgICAgIFByZXppUGxheWVyLkNVUlJFTlRfU1RFUCA9ICdjdXJyZW50U3RlcCc7XG4gICAgICAgIFByZXppUGxheWVyLkNVUlJFTlRfQU5JTUFUSU9OX1NURVAgPSAnY3VycmVudEFuaW1hdGlvblN0ZXAnO1xuICAgICAgICBQcmV6aVBsYXllci5DVVJSRU5UX09CSkVDVCA9ICdjdXJyZW50T2JqZWN0JztcbiAgICAgICAgUHJlemlQbGF5ZXIuU1RBVFVTX0xPQURJTkcgPSAnbG9hZGluZyc7XG4gICAgICAgIFByZXppUGxheWVyLlNUQVRVU19SRUFEWSA9ICdyZWFkeSc7XG4gICAgICAgIFByZXppUGxheWVyLlNUQVRVU19DT05URU5UX1JFQURZID0gJ2NvbnRlbnRyZWFkeSc7XG4gICAgICAgIFByZXppUGxheWVyLkVWRU5UX0NVUlJFTlRfU1RFUCA9IFwiY3VycmVudFN0ZXBDaGFuZ2VcIjtcbiAgICAgICAgUHJlemlQbGF5ZXIuRVZFTlRfQ1VSUkVOVF9BTklNQVRJT05fU1RFUCA9IFwiY3VycmVudEFuaW1hdGlvblN0ZXBDaGFuZ2VcIjtcbiAgICAgICAgUHJlemlQbGF5ZXIuRVZFTlRfQ1VSUkVOVF9PQkpFQ1QgPSBcImN1cnJlbnRPYmplY3RDaGFuZ2VcIjtcbiAgICAgICAgUHJlemlQbGF5ZXIuRVZFTlRfU1RBVFVTID0gXCJzdGF0dXNDaGFuZ2VcIjtcbiAgICAgICAgUHJlemlQbGF5ZXIuRVZFTlRfUExBWUlORyA9IFwiaXNBdXRvUGxheWluZ0NoYW5nZVwiO1xuICAgICAgICBQcmV6aVBsYXllci5FVkVOVF9JU19NT1ZJTkcgPSBcImlzTW92aW5nQ2hhbmdlXCI7XG4gICAgICAgIFByZXppUGxheWVyLmRvbWFpbiA9IFwiaHR0cHM6Ly9wcmV6aS5jb21cIjtcbiAgICAgICAgUHJlemlQbGF5ZXIucGF0aCA9IFwiL3BsYXllci9cIjtcbiAgICAgICAgUHJlemlQbGF5ZXIucGxheWVycyA9IHt9O1xuICAgICAgICBQcmV6aVBsYXllci5iaW5kZWRfbWV0aG9kcyA9IFsnY2hhbmdlc0hhbmRsZXInXTtcblxuICAgICAgICBQcmV6aVBsYXllci5jcmVhdGVNdWx0aXBsZVBsYXllcnMgPSBmdW5jdGlvbihvcHRpb25BcnJheSl7XG4gICAgICAgICAgICBmb3IodmFyIGk9MDsgaTxvcHRpb25BcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBvcHRpb25TZXQgPSBvcHRpb25BcnJheVtpXTtcbiAgICAgICAgICAgICAgICBuZXcgUHJlemlQbGF5ZXIob3B0aW9uU2V0LmlkLCBvcHRpb25TZXQpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5tZXNzYWdlUmVjZWl2ZWQgPSBmdW5jdGlvbihldmVudCl7XG4gICAgICAgICAgICB2YXIgbWVzc2FnZSwgaXRlbSwgcGxheWVyO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gSlNPTi5wYXJzZShldmVudC5kYXRhKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5pZCAmJiAocGxheWVyID0gUHJlemlQbGF5ZXIucGxheWVyc1ttZXNzYWdlLmlkXSkpe1xuICAgICAgICAgICAgICAgIGlmIChwbGF5ZXIub3B0aW9ucy5kZWJ1ZyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29uc29sZSAmJiBjb25zb2xlLmxvZykgY29uc29sZS5sb2coJ3JlY2VpdmVkJywgbWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiY2hhbmdlc1wiKXtcbiAgICAgICAgICAgICAgICAgICAgcGxheWVyLmNoYW5nZXNIYW5kbGVyKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8cGxheWVyLmNhbGxiYWNrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpdGVtID0gcGxheWVyLmNhbGxiYWNrc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0gJiYgbWVzc2FnZS50eXBlID09PSBpdGVtLmV2ZW50KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uY2FsbGJhY2sobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gUHJlemlQbGF5ZXIoaWQsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciBwYXJhbXMsIHBhcmFtU3RyaW5nID0gXCJcIiwgX3RoaXMgPSB0aGlzO1xuICAgICAgICAgICAgaWYgKFByZXppUGxheWVyLnBsYXllcnNbaWRdKXtcbiAgICAgICAgICAgICAgICBQcmV6aVBsYXllci5wbGF5ZXJzW2lkXS5kZXN0cm95KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IodmFyIGk9MDsgaTxQcmV6aVBsYXllci5iaW5kZWRfbWV0aG9kcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBtZXRob2RfbmFtZSA9IFByZXppUGxheWVyLmJpbmRlZF9tZXRob2RzW2ldO1xuICAgICAgICAgICAgICAgIF90aGlzW21ldGhvZF9uYW1lXSA9IF9fYmluZChfdGhpc1ttZXRob2RfbmFtZV0sIF90aGlzKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgICAgICAgICB0aGlzLnZhbHVlcyA9IHsnc3RhdHVzJzogUHJlemlQbGF5ZXIuU1RBVFVTX0xPQURJTkd9O1xuICAgICAgICAgICAgdGhpcy52YWx1ZXNbUHJlemlQbGF5ZXIuQ1VSUkVOVF9TVEVQXSA9IDA7XG4gICAgICAgICAgICB0aGlzLnZhbHVlc1tQcmV6aVBsYXllci5DVVJSRU5UX0FOSU1BVElPTl9TVEVQXSA9IDA7XG4gICAgICAgICAgICB0aGlzLnZhbHVlc1tQcmV6aVBsYXllci5DVVJSRU5UX09CSkVDVF0gPSBudWxsO1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFja3MgPSBbXTtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgICAgIHRoaXMuZW1iZWRUbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcbiAgICAgICAgICAgIGlmICghdGhpcy5lbWJlZFRvKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgXCJUaGUgZWxlbWVudCBpZCBpcyBub3QgYXZhaWxhYmxlLlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5pZnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcbiAgICAgICAgICAgIHBhcmFtcyA9IFtcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdvaWQnLCB2YWx1ZTogb3B0aW9ucy5wcmV6aUlkIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZXhwbG9yYWJsZScsIHZhbHVlOiBvcHRpb25zLmV4cGxvcmFibGUgPyAxIDogMCB9LFxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2NvbnRyb2xzJywgdmFsdWU6IG9wdGlvbnMuY29udHJvbHMgPyAxIDogMCB9XG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgZm9yKHZhciBpPTA7IGk8cGFyYW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtID0gcGFyYW1zW2ldO1xuICAgICAgICAgICAgICAgIHBhcmFtU3RyaW5nICs9IChpPT09MCA/IFwiP1wiIDogXCImXCIpICsgcGFyYW0ubmFtZSArIFwiPVwiICsgcGFyYW0udmFsdWU7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5pZnJhbWUuc3JjID0gUHJlemlQbGF5ZXIuZG9tYWluICsgUHJlemlQbGF5ZXIucGF0aCArIHBhcmFtU3RyaW5nO1xuICAgICAgICAgICAgdGhpcy5pZnJhbWUuZnJhbWVCb3JkZXIgPSAwO1xuICAgICAgICAgICAgdGhpcy5pZnJhbWUuc2Nyb2xsaW5nID0gXCJub1wiO1xuICAgICAgICAgICAgdGhpcy5pZnJhbWUud2lkdGggPSBvcHRpb25zLndpZHRoIHx8IDY0MDtcbiAgICAgICAgICAgIHRoaXMuaWZyYW1lLmhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0IHx8IDQ4MDtcbiAgICAgICAgICAgIHRoaXMuZW1iZWRUby5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgICAgIC8vIEpJVFNJOiBJTiBDQVNFIFNPTUVUSElORyBHT0VTIFdST05HLlxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0aGlzLmVtYmVkVG8uYXBwZW5kQ2hpbGQodGhpcy5pZnJhbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ0FUQ0ggRVJST1JcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEpJVFNJOiBJbmNyZWFzZSBpbnRlcnZhbCBmcm9tIDIwMCB0byA1MDAsIHdoaWNoIGZpeGVzIHByZXppXG4gICAgICAgICAgICAvLyBjcmFzaGVzIGZvciB1cy5cbiAgICAgICAgICAgIHRoaXMuaW5pdFBvbGxJbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgX3RoaXMuc2VuZE1lc3NhZ2UoeydhY3Rpb24nOiAnaW5pdCd9KTtcbiAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICBQcmV6aVBsYXllci5wbGF5ZXJzW2lkXSA9IHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuY2hhbmdlc0hhbmRsZXIgPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgICAgICAgICB2YXIga2V5LCB2YWx1ZSwgaiwgaXRlbTtcbiAgICAgICAgICAgIGlmICh0aGlzLmluaXRQb2xsSW50ZXJ2YWwpIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMuaW5pdFBvbGxJbnRlcnZhbCk7XG4gICAgICAgICAgICAgICAgdGhpcy5pbml0UG9sbEludGVydmFsID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGtleSBpbiBtZXNzYWdlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5kYXRhLmhhc093blByb3BlcnR5KGtleSkpe1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG1lc3NhZ2UuZGF0YVtrZXldO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnZhbHVlc1trZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaj0wOyBqPHRoaXMuY2FsbGJhY2tzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtID0gdGhpcy5jYWxsYmFja3Nbal07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLmV2ZW50ID09PSBrZXkgKyBcIkNoYW5nZVwiKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLmNhbGxiYWNrKHt0eXBlOiBpdGVtLmV2ZW50LCB2YWx1ZTogdmFsdWV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaW5pdFBvbGxJbnRlcnZhbCkge1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5pbml0UG9sbEludGVydmFsKTtcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRQb2xsSW50ZXJ2YWwgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZW1iZWRUby5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuc2VuZE1lc3NhZ2UgPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLmRlYnVnID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbnNvbGUgJiYgY29uc29sZS5sb2cpIGNvbnNvbGUubG9nKCdzZW50JywgbWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtZXNzYWdlLnZlcnNpb24gPSBQcmV6aVBsYXllci5BUElfVkVSU0lPTjtcbiAgICAgICAgICAgIG1lc3NhZ2UuaWQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaWZyYW1lLmNvbnRlbnRXaW5kb3cucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkobWVzc2FnZSksICcqJyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLm5leHRTdGVwID0gLyogbmV4dFN0ZXAgaXMgREVQUkVDQVRFRCAqL1xuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZmx5VG9OZXh0U3RlcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgICdhY3Rpb24nOiAncHJlc2VudCcsXG4gICAgICAgICAgICAgICAgJ2RhdGEnOiBbJ21vdmVUb05leHRTdGVwJ11cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5wcmV2aW91c1N0ZXAgPSAvKiBwcmV2aW91c1N0ZXAgaXMgREVQUkVDQVRFRCAqL1xuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZmx5VG9QcmV2aW91c1N0ZXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAnYWN0aW9uJzogJ3ByZXNlbnQnLFxuICAgICAgICAgICAgICAgICdkYXRhJzogWydtb3ZlVG9QcmV2U3RlcCddXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUudG9TdGVwID0gLyogdG9TdGVwIGlzIERFUFJFQ0FURUQgKi9cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmZseVRvU3RlcCA9IGZ1bmN0aW9uKHN0ZXAsIGFuaW1hdGlvbl9zdGVwKSB7XG4gICAgICAgICAgICB2YXIgb2JqID0gdGhpcztcbiAgICAgICAgICAgIC8vIGNoZWNrIGFuaW1hdGlvbl9zdGVwXG4gICAgICAgICAgICBpZiAoYW5pbWF0aW9uX3N0ZXAgPiAwICYmXG4gICAgICAgICAgICAgICAgb2JqLnZhbHVlcy5hbmltYXRpb25Db3VudE9uU3RlcHMgJiZcbiAgICAgICAgICAgICAgICBvYmoudmFsdWVzLmFuaW1hdGlvbkNvdW50T25TdGVwc1tzdGVwXSA8PSBhbmltYXRpb25fc3RlcCkge1xuICAgICAgICAgICAgICAgIGFuaW1hdGlvbl9zdGVwID0gb2JqLnZhbHVlcy5hbmltYXRpb25Db3VudE9uU3RlcHNbc3RlcF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBqdW1wIHRvIGFuaW1hdGlvbiBzdGVwcyBieSBjYWxsaW5nIGZseVRvTmV4dFN0ZXAoKVxuICAgICAgICAgICAgZnVuY3Rpb24gZG9BbmltYXRpb25TdGVwcygpIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqLnZhbHVlcy5pc01vdmluZyA9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZG9BbmltYXRpb25TdGVwcywgMTAwKTsgLy8gd2FpdCB1bnRpbCB0aGUgZmxpZ2h0IGVuZHNcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB3aGlsZSAoYW5pbWF0aW9uX3N0ZXAtLSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgb2JqLmZseVRvTmV4dFN0ZXAoKTsgLy8gZG8gdGhlIGFuaW1hdGlvbiBzdGVwc1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNldFRpbWVvdXQoZG9BbmltYXRpb25TdGVwcywgMjAwKTsgLy8gMjAwbXMgaXMgdGhlIGludGVybmFsIFwicmVwb3J0aW5nXCIgdGltZVxuICAgICAgICAgICAgLy8ganVtcCB0byB0aGUgc3RlcFxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgICdhY3Rpb24nOiAncHJlc2VudCcsXG4gICAgICAgICAgICAgICAgJ2RhdGEnOiBbJ21vdmVUb1N0ZXAnLCBzdGVwXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLnRvT2JqZWN0ID0gLyogdG9PYmplY3QgaXMgREVQUkVDQVRFRCAqL1xuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZmx5VG9PYmplY3QgPSBmdW5jdGlvbihvYmplY3RJZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgICdhY3Rpb24nOiAncHJlc2VudCcsXG4gICAgICAgICAgICAgICAgJ2RhdGEnOiBbJ21vdmVUb09iamVjdCcsIG9iamVjdElkXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWZhdWx0RGVsYXkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAnYWN0aW9uJzogJ3ByZXNlbnQnLFxuICAgICAgICAgICAgICAgICdkYXRhJzogWydzdGFydEF1dG9QbGF5JywgZGVmYXVsdERlbGF5XVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAnYWN0aW9uJzogJ3ByZXNlbnQnLFxuICAgICAgICAgICAgICAgICdkYXRhJzogWydzdG9wQXV0b1BsYXknXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oZGVmYXVsdERlbGF5KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgJ2FjdGlvbic6ICdwcmVzZW50JyxcbiAgICAgICAgICAgICAgICAnZGF0YSc6IFsncGF1c2VBdXRvUGxheScsIGRlZmF1bHREZWxheV1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5nZXRDdXJyZW50U3RlcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzLmN1cnJlbnRTdGVwO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5nZXRDdXJyZW50QW5pbWF0aW9uU3RlcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzLmN1cnJlbnRBbmltYXRpb25TdGVwO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5nZXRDdXJyZW50T2JqZWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXMuY3VycmVudE9iamVjdDtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZ2V0U3RhdHVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXMuc3RhdHVzO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5pc1BsYXlpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlcy5pc0F1dG9QbGF5aW5nO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5nZXRTdGVwQ291bnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlcy5zdGVwQ291bnQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmdldEFuaW1hdGlvbkNvdW50T25TdGVwcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzLmFuaW1hdGlvbkNvdW50T25TdGVwcztcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZ2V0VGl0bGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlcy50aXRsZTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuc2V0RGltZW5zaW9ucyA9IGZ1bmN0aW9uKGRpbXMpIHtcbiAgICAgICAgICAgIGZvciAodmFyIHBhcmFtZXRlciBpbiBkaW1zKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pZnJhbWVbcGFyYW1ldGVyXSA9IGRpbXNbcGFyYW1ldGVyXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5nZXREaW1lbnNpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHdpZHRoOiBwYXJzZUludCh0aGlzLmlmcmFtZS53aWR0aCwgMTApLFxuICAgICAgICAgICAgICAgIGhlaWdodDogcGFyc2VJbnQodGhpcy5pZnJhbWUuaGVpZ2h0LCAxMClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKGV2ZW50LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFja3MucHVzaCh7XG4gICAgICAgICAgICAgICAgZXZlbnQ6IGV2ZW50LFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uKGV2ZW50LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIGosIGl0ZW07XG4gICAgICAgICAgICBpZiAoZXZlbnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tzID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBqID0gdGhpcy5jYWxsYmFja3MubGVuZ3RoO1xuICAgICAgICAgICAgd2hpbGUgKGotLSkge1xuICAgICAgICAgICAgICAgIGl0ZW0gPSB0aGlzLmNhbGxiYWNrc1tqXTtcbiAgICAgICAgICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLmV2ZW50ID09PSBldmVudCAmJiAoY2FsbGJhY2sgPT09IHVuZGVmaW5lZCB8fCBpdGVtLmNhbGxiYWNrID09PSBjYWxsYmFjaykpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbGxiYWNrcy5zcGxpY2UoaiwgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBQcmV6aVBsYXllci5tZXNzYWdlUmVjZWl2ZWQsIGZhbHNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdpbmRvdy5hdHRhY2hFdmVudCgnb25tZXNzYWdlJywgUHJlemlQbGF5ZXIubWVzc2FnZVJlY2VpdmVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBQcmV6aVBsYXllcjtcblxuICAgIH0pKCk7XG5cbiAgICByZXR1cm4gUHJlemlQbGF5ZXI7XG59KSgpO1xuIiwidmFyIFJUQ0Jyb3dzZXJUeXBlID0ge1xuICAgIFJUQ19CUk9XU0VSX0NIUk9NRTogXCJydGNfYnJvd3Nlci5jaHJvbWVcIixcblxuICAgIFJUQ19CUk9XU0VSX0ZJUkVGT1g6IFwicnRjX2Jyb3dzZXIuZmlyZWZveFwiXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJUQ0Jyb3dzZXJUeXBlOyIsInZhciBTdHJlYW1FdmVudFR5cGVzID0ge1xuICAgIEVWRU5UX1RZUEVfTE9DQUxfQ1JFQVRFRDogXCJzdHJlYW0ubG9jYWxfY3JlYXRlZFwiLFxuXG4gICAgRVZFTlRfVFlQRV9MT0NBTF9FTkRFRDogXCJzdHJlYW0ubG9jYWxfZW5kZWRcIixcblxuICAgIEVWRU5UX1RZUEVfUkVNT1RFX0NSRUFURUQ6IFwic3RyZWFtLnJlbW90ZV9jcmVhdGVkXCIsXG5cbiAgICBFVkVOVF9UWVBFX1JFTU9URV9FTkRFRDogXCJzdHJlYW0ucmVtb3RlX2VuZGVkXCJcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3RyZWFtRXZlbnRUeXBlczsiXX0=
