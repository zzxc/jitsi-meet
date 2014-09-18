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
        // By default we use camera
        getVideoSize = VideoLayout.getCameraVideoSize;
        getVideoPosition = VideoLayout.getCameraVideoPosition;
        $('body').popover({ selector: '[data-toggle=popover]',
            trigger: 'click hover'});
        VideoLayout.resizeLargeVideoContainer();
        $("#videospace").mousemove(function () {
            return ToolbarToggler.showToolbar();
        });
        KeyboardShortcut.init();
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


},{"../service/RTC/StreamEventTypes.js":21,"./UIService":3,"./VideoLayout.js":5,"./audiolevels/AudioLevels.js":6,"./chat/Chat.js":8,"./etherpad/Etherpad.js":11,"./keyboard_shortcut":12,"./prezi/Prezi.js":13,"./toolbars/BottomToolbar":16,"./toolbars/toolbar":18,"./toolbars/toolbar_toggler":19}],3:[function(require,module,exports){
var AudioLevels = require("./audiolevels/AudioLevels.js");
var Etherpad = require("./etherpad/Etherpad.js");
var VideoLayout = require("./VideoLayout.js");
var Toolbar = require("./toolbars/toolbar.js");
var ToolbarToggler = require("./toolbars/toolbar_toggler.js");
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
},{"./ContactList":1,"./VideoLayout.js":5,"./audiolevels/AudioLevels.js":6,"./etherpad/Etherpad.js":11,"./toolbars/toolbar.js":18,"./toolbars/toolbar_toggler.js":19}],4:[function(require,module,exports){

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
    var defaultRemoteDisplayName = "Fellow Jitster";
    var defaultDominantSpeakerDisplayName = "Speaker";
    var lastNCount = config.channelLastN;
    var lastNEndpointsCache = [];
    var largeVideoNewSrc = '';
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
        if (resourceJid !== currentDominantSpeaker) {
            var oldSpeakerVideoSpanId = "participant_" + currentDominantSpeaker,
                newSpeakerVideoSpanId = "participant_" + resourceJid;
            if($("#" + oldSpeakerVideoSpanId + ">span.displayname").text() === defaultDominantSpeakerDisplayName) {
                setDisplayName(oldSpeakerVideoSpanId, null);
            }
            if($("#" + newSpeakerVideoSpanId + ">span.displayname").text() === defaultRemoteDisplayName) {
                setDisplayName(newSpeakerVideoSpanId, defaultDominantSpeakerDisplayName);
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
        RTC.attachMediaStream(localVideoSelector, stream);

        localVideoSrc = $(localVideoSelector).attr('src');
    });

    $(document).bind('simulcastlayerstopped', function(event) {
        var localVideoSelector = $('#' + 'localVideo_' + connection.jingle.localVideo.id);
        var simulcast = new Simulcast();
        var stream = simulcast.getLocalVideoStream();

        // Attach WebRTC stream
        RTC.attachMediaStream(localVideoSelector, stream);

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

},{"../service/RTC/RTCBrowserType.js":20,"./ContactList":1,"./UIActivator.js":2,"./UIUtil.js":4,"./chat/Chat":8,"./toolbars/toolbar_toggler":19}],6:[function(require,module,exports){
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

},{"../VideoLayout":5,"./CanvasUtil.js":7}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
/* global $, Util, connection, nickname:true, getVideoSize, getVideoPosition, showToolbar, processReplacements */
var Replacement = require("./Replacement.js");
var dep = {
    "VideoLayout": function(){ return require("../VideoLayout")},
    "Toolbar": function(){return require("../toolbars/Toolbar")}
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

},{"../VideoLayout":5,"../toolbars/Toolbar":17,"./Replacement.js":9}],9:[function(require,module,exports){

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




},{}],10:[function(require,module,exports){
module.exports=require(8)
},{"../VideoLayout":5,"../toolbars/Toolbar":17,"./Replacement.js":9}],11:[function(require,module,exports){
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

},{"../UIUtil.js":4,"../prezi/Prezi.js":13,"../toolbars/toolbar_toggler":19}],12:[function(require,module,exports){
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

},{"./toolbars/BottomToolbar":16}],13:[function(require,module,exports){
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

},{"../UIUtil.js":4,"../toolbars/toolbar_toggler":19,"./PreziPlayer.js":14}],14:[function(require,module,exports){
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
},{"../UIUtil.js":4,"../toolbars/toolbar_toggler":19,"./PreziPlayer.js":14}],16:[function(require,module,exports){
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

},{"./../ContactList.js":1,"./../chat/chat.js":10}],17:[function(require,module,exports){
var BottomToolbar = require("./BottomToolbar");
var Prezi = require("./../prezi/prezi");
var Etherpad = require("./../etherpad/Etherpad");

var Toolbar = (function (my) {

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

    /**
     * Locks / unlocks the room.
     */
    function lockRoom(lock) {
        if (lock)
            connection.emuc.lockRoom(sharedKey);
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
            if (sharedKey) {
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
            if (sharedKey) {
                messageHandler.openTwoButtonDialog(null,
                    "Are you sure you would like to remove your secret key?",
                    false,
                    "Remove",
                    function (e, v) {
                        if (v) {
                            setSharedKey('');
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
                                setSharedKey(Util.escapeHtml(lockKey.value));
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
        if (sharedKey && sharedKey.length > 0) {
            sharedKeyText =
                "This conference is password protected. Please use the " +
                "following pin when joining:%0D%0A%0D%0A" +
                sharedKey + "%0D%0A%0D%0A";
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

},{"./../etherpad/Etherpad":11,"./../prezi/prezi":15,"./BottomToolbar":16}],18:[function(require,module,exports){
module.exports=require(17)
},{"./../etherpad/Etherpad":11,"./../prezi/prezi":15,"./BottomToolbar":16}],19:[function(require,module,exports){
var Toolbar = require("./toolbar");

var ToolbarToggler = (function(my) {
    var INITIAL_TOOLBAR_TIMEOUT = 20000;
    var TOOLBAR_TIMEOUT = INITIAL_TOOLBAR_TIMEOUT;
    var toolbarTimeout;

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
                bottomToolbar.show("slide", {direction: "right",cduration: 300});
            }

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

        clearTimeout(toolbarTimeout);
        toolbarTimeout = null;

        if (!isToolbarHover) {
            header.hide("slide", { direction: "up", duration: 300});
            $('#subject').animate({top: "-=40"}, 300);
            if(!$("#remoteVideos").is(":visible")) {
                bottomToolbar.hide("slide", {direction: "right", cduration: 300});
            }
        }
        else {
            toolbarTimeout = setTimeout(hideToolbar, TOOLBAR_TIMEOUT);
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
            if (toolbarTimeout) {
                clearTimeout(toolbarTimeout);
                toolbarTimeout = null;
            }
        }
        else {
            if (!$('#header').is(':visible')) {
                ToolbarToggler.showToolbar();
            }
            else {
                toolbarTimeout = setTimeout(hideToolbar, TOOLBAR_TIMEOUT);
            }
        }
    };


    return my;
}(ToolbarToggler || {}));

module.exports = ToolbarToggler;
},{"./toolbar":18}],20:[function(require,module,exports){
var RTCBrowserType = {
    RTC_BROWSER_CHROME: "rtc_browser.chrome",

    RTC_BROWSER_FIREFOX: "rtc_browser.firefox"
};

module.exports = RTCBrowserType;
},{}],21:[function(require,module,exports){
var StreamEventTypes = {
    EVENT_TYPE_LOCAL_CREATED: "stream.local_created",

    EVENT_TYPE_LOCAL_ENDED: "stream.local_ended",

    EVENT_TYPE_REMOTE_CREATED: "stream.remote_created",

    EVENT_TYPE_REMOTE_ENDED: "stream.remote_ended"
};

module.exports = StreamEventTypes;
},{}]},{},[2])(2)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9Db250YWN0TGlzdC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL1VJQWN0aXZhdG9yLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvVUlTZXJ2aWNlLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvVUlVdGlsLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvVmlkZW9MYXlvdXQuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9hdWRpb2xldmVscy9BdWRpb0xldmVscy5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL2F1ZGlvbGV2ZWxzL0NhbnZhc1V0aWwuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9jaGF0L0NoYXQuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9jaGF0L1JlcGxhY2VtZW50LmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvZXRoZXJwYWQvRXRoZXJwYWQuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9rZXlib2FyZF9zaG9ydGN1dC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL3ByZXppL1ByZXppLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvcHJlemkvUHJlemlQbGF5ZXIuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS90b29sYmFycy9Cb3R0b21Ub29sYmFyLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvdG9vbGJhcnMvVG9vbGJhci5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL3Rvb2xiYXJzL3Rvb2xiYXJfdG9nZ2xlci5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L3NlcnZpY2UvUlRDL1JUQ0Jyb3dzZXJUeXBlLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvc2VydmljZS9SVEMvU3RyZWFtRXZlbnRUeXBlcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1dERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNU5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDcFNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDN1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIFZpZGVvTGF5b3V0ID0gcmVxdWlyZShcIi4vVmlkZW9MYXlvdXQuanNcIik7XG5cbi8qKlxuICogQ29udGFjdCBsaXN0LlxuICovXG52YXIgQ29udGFjdExpc3QgPSAoZnVuY3Rpb24gKG15KSB7XG4gICAgLyoqXG4gICAgICogSW5kaWNhdGVzIGlmIHRoZSBjaGF0IGlzIGN1cnJlbnRseSB2aXNpYmxlLlxuICAgICAqXG4gICAgICogQHJldHVybiA8dHQ+dHJ1ZTwvdHQ+IGlmIHRoZSBjaGF0IGlzIGN1cnJlbnRseSB2aXNpYmxlLCA8dHQ+ZmFsc2U8L3R0PiAtXG4gICAgICogb3RoZXJ3aXNlXG4gICAgICovXG4gICAgbXkuaXNWaXNpYmxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJCgnI2NvbnRhY3RsaXN0JykuaXMoXCI6dmlzaWJsZVwiKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQWRkcyBhIGNvbnRhY3QgZm9yIHRoZSBnaXZlbiBwZWVySmlkIGlmIHN1Y2ggZG9lc24ndCB5ZXQgZXhpc3QuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGVlckppZCB0aGUgcGVlckppZCBjb3JyZXNwb25kaW5nIHRvIHRoZSBjb250YWN0XG4gICAgICovXG4gICAgbXkuZW5zdXJlQWRkQ29udGFjdCA9IGZ1bmN0aW9uKHBlZXJKaWQpIHtcbiAgICAgICAgdmFyIHJlc291cmNlSmlkID0gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQocGVlckppZCk7XG5cbiAgICAgICAgdmFyIGNvbnRhY3QgPSAkKCcjY29udGFjdGxpc3Q+dWw+bGlbaWQ9XCInICsgcmVzb3VyY2VKaWQgKyAnXCJdJyk7XG5cbiAgICAgICAgaWYgKCFjb250YWN0IHx8IGNvbnRhY3QubGVuZ3RoIDw9IDApXG4gICAgICAgICAgICBDb250YWN0TGlzdC5hZGRDb250YWN0KHBlZXJKaWQpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBZGRzIGEgY29udGFjdCBmb3IgdGhlIGdpdmVuIHBlZXIgamlkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHBlZXJKaWQgdGhlIGppZCBvZiB0aGUgY29udGFjdCB0byBhZGRcbiAgICAgKi9cbiAgICBteS5hZGRDb250YWN0ID0gZnVuY3Rpb24ocGVlckppZCkge1xuICAgICAgICB2YXIgcmVzb3VyY2VKaWQgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChwZWVySmlkKTtcblxuICAgICAgICB2YXIgY29udGFjdGxpc3QgPSAkKCcjY29udGFjdGxpc3Q+dWwnKTtcblxuICAgICAgICB2YXIgbmV3Q29udGFjdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gICAgICAgIG5ld0NvbnRhY3QuaWQgPSByZXNvdXJjZUppZDtcblxuICAgICAgICBuZXdDb250YWN0LmFwcGVuZENoaWxkKGNyZWF0ZUF2YXRhcigpKTtcbiAgICAgICAgbmV3Q29udGFjdC5hcHBlbmRDaGlsZChjcmVhdGVEaXNwbGF5TmFtZVBhcmFncmFwaChcIlBhcnRpY2lwYW50XCIpKTtcblxuICAgICAgICB2YXIgY2xFbGVtZW50ID0gY29udGFjdGxpc3QuZ2V0KDApO1xuXG4gICAgICAgIGlmIChyZXNvdXJjZUppZCA9PT0gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZClcbiAgICAgICAgICAgICYmICQoJyNjb250YWN0bGlzdD51bCAudGl0bGUnKVswXS5uZXh0U2libGluZy5uZXh0U2libGluZylcbiAgICAgICAge1xuICAgICAgICAgICAgY2xFbGVtZW50Lmluc2VydEJlZm9yZShuZXdDb250YWN0LFxuICAgICAgICAgICAgICAgICAgICAkKCcjY29udGFjdGxpc3Q+dWwgLnRpdGxlJylbMF0ubmV4dFNpYmxpbmcubmV4dFNpYmxpbmcpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY2xFbGVtZW50LmFwcGVuZENoaWxkKG5ld0NvbnRhY3QpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYSBjb250YWN0IGZvciB0aGUgZ2l2ZW4gcGVlciBqaWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGVlckppZCB0aGUgcGVlckppZCBjb3JyZXNwb25kaW5nIHRvIHRoZSBjb250YWN0IHRvIHJlbW92ZVxuICAgICAqL1xuICAgIG15LnJlbW92ZUNvbnRhY3QgPSBmdW5jdGlvbihwZWVySmlkKSB7XG4gICAgICAgIHZhciByZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHBlZXJKaWQpO1xuXG4gICAgICAgIHZhciBjb250YWN0ID0gJCgnI2NvbnRhY3RsaXN0PnVsPmxpW2lkPVwiJyArIHJlc291cmNlSmlkICsgJ1wiXScpO1xuXG4gICAgICAgIGlmIChjb250YWN0ICYmIGNvbnRhY3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdmFyIGNvbnRhY3RsaXN0ID0gJCgnI2NvbnRhY3RsaXN0PnVsJyk7XG5cbiAgICAgICAgICAgIGNvbnRhY3RsaXN0LmdldCgwKS5yZW1vdmVDaGlsZChjb250YWN0LmdldCgwKSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogT3BlbnMgLyBjbG9zZXMgdGhlIGNvbnRhY3QgbGlzdCBhcmVhLlxuICAgICAqL1xuICAgIG15LnRvZ2dsZUNvbnRhY3RMaXN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY29udGFjdGxpc3QgPSAkKCcjY29udGFjdGxpc3QnKTtcblxuICAgICAgICB2YXIgY2hhdFNpemUgPSAoQ29udGFjdExpc3QuaXNWaXNpYmxlKCkpID8gWzAsIDBdIDogQ29udGFjdExpc3QuZ2V0Q29udGFjdExpc3RTaXplKCk7XG4gICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZVZpZGVvU3BhY2UoY29udGFjdGxpc3QsIGNoYXRTaXplLCBDb250YWN0TGlzdC5pc1Zpc2libGUoKSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHNpemUgb2YgdGhlIGNoYXQuXG4gICAgICovXG4gICAgbXkuZ2V0Q29udGFjdExpc3RTaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYXZhaWxhYmxlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICB2YXIgYXZhaWxhYmxlV2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aDtcblxuICAgICAgICB2YXIgY2hhdFdpZHRoID0gMjAwO1xuICAgICAgICBpZiAoYXZhaWxhYmxlV2lkdGggKiAwLjIgPCAyMDApXG4gICAgICAgICAgICBjaGF0V2lkdGggPSBhdmFpbGFibGVXaWR0aCAqIDAuMjtcblxuICAgICAgICByZXR1cm4gW2NoYXRXaWR0aCwgYXZhaWxhYmxlSGVpZ2h0XTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyB0aGUgYXZhdGFyIGVsZW1lbnQuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHRoZSBuZXdseSBjcmVhdGVkIGF2YXRhciBlbGVtZW50XG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlQXZhdGFyKCkge1xuICAgICAgICB2YXIgYXZhdGFyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaScpO1xuICAgICAgICBhdmF0YXIuY2xhc3NOYW1lID0gXCJpY29uLWF2YXRhciBhdmF0YXJcIjtcblxuICAgICAgICByZXR1cm4gYXZhdGFyO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIHRoZSBkaXNwbGF5IG5hbWUgcGFyYWdyYXBoLlxuICAgICAqXG4gICAgICogQHBhcmFtIGRpc3BsYXlOYW1lIHRoZSBkaXNwbGF5IG5hbWUgdG8gc2V0XG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlRGlzcGxheU5hbWVQYXJhZ3JhcGgoZGlzcGxheU5hbWUpIHtcbiAgICAgICAgdmFyIHAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG4gICAgICAgIHAuaW5uZXJIVE1MID0gZGlzcGxheU5hbWU7XG5cbiAgICAgICAgcmV0dXJuIHA7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEluZGljYXRlcyB0aGF0IHRoZSBkaXNwbGF5IG5hbWUgaGFzIGNoYW5nZWQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCggICAnZGlzcGxheW5hbWVjaGFuZ2VkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChldmVudCwgcGVlckppZCwgZGlzcGxheU5hbWUpIHtcbiAgICAgICAgaWYgKHBlZXJKaWQgPT09ICdsb2NhbFZpZGVvQ29udGFpbmVyJylcbiAgICAgICAgICAgIHBlZXJKaWQgPSBjb25uZWN0aW9uLmVtdWMubXlyb29tamlkO1xuXG4gICAgICAgIHZhciByZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHBlZXJKaWQpO1xuXG4gICAgICAgIHZhciBjb250YWN0TmFtZSA9ICQoJyNjb250YWN0bGlzdCAjJyArIHJlc291cmNlSmlkICsgJz5wJyk7XG5cbiAgICAgICAgaWYgKGNvbnRhY3ROYW1lICYmIGRpc3BsYXlOYW1lICYmIGRpc3BsYXlOYW1lLmxlbmd0aCA+IDApXG4gICAgICAgICAgICBjb250YWN0TmFtZS5odG1sKGRpc3BsYXlOYW1lKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBteTtcbn0oQ29udGFjdExpc3QgfHwge30pKTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGFjdExpc3QiLCJ2YXIgVUlTZXJ2aWNlID0gcmVxdWlyZShcIi4vVUlTZXJ2aWNlXCIpO1xudmFyIFZpZGVvTGF5b3V0ID0gcmVxdWlyZShcIi4vVmlkZW9MYXlvdXQuanNcIik7XG52YXIgQXVkaW9MZXZlbHMgPSByZXF1aXJlKFwiLi9hdWRpb2xldmVscy9BdWRpb0xldmVscy5qc1wiKTtcbnZhciBQcmV6aSA9IHJlcXVpcmUoXCIuL3ByZXppL1ByZXppLmpzXCIpO1xudmFyIEV0aGVycGFkID0gcmVxdWlyZShcIi4vZXRoZXJwYWQvRXRoZXJwYWQuanNcIik7XG52YXIgQ2hhdCA9IHJlcXVpcmUoXCIuL2NoYXQvQ2hhdC5qc1wiKTtcbnZhciBTdHJlYW1FdmVudFR5cGVzID0gcmVxdWlyZShcIi4uL3NlcnZpY2UvUlRDL1N0cmVhbUV2ZW50VHlwZXMuanNcIik7XG52YXIgVG9vbGJhciA9IHJlcXVpcmUoXCIuL3Rvb2xiYXJzL3Rvb2xiYXJcIik7XG52YXIgVG9vbGJhclRvZ2dsZXIgPSByZXF1aXJlKFwiLi90b29sYmFycy90b29sYmFyX3RvZ2dsZXJcIik7XG52YXIgQm90dG9tVG9vbGJhciA9IHJlcXVpcmUoXCIuL3Rvb2xiYXJzL0JvdHRvbVRvb2xiYXJcIik7XG52YXIgS2V5Ym9hcmRTaG9ydGN1dCA9IHJlcXVpcmUoXCIuL2tleWJvYXJkX3Nob3J0Y3V0XCIpO1xuXG52YXIgVUlBY3RpdmF0b3IgPSBmdW5jdGlvbigpXG57XG4gICAgdmFyIHVpU2VydmljZSA9IG51bGw7XG4gICAgZnVuY3Rpb24gVUlBY3RpdmF0b3JQcm90bygpXG4gICAge1xuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0dXBQcmV6aSgpXG4gICAge1xuICAgICAgICAkKFwiI3Rvb2xiYXJfcHJlemlcIikuY2xpY2soZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICBQcmV6aS5vcGVuUHJlemlEaWFsb2coKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJChcIiNyZWxvYWRQcmVzZW50YXRpb25MaW5rXCIpLmNsaWNrKGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgUHJlemkucmVsb2FkUHJlc2VudGF0aW9uKCk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0dXBFdGhlcnBhZCgpXG4gICAge1xuICAgICAgICAkKFwiI3Rvb2xiYXJfZXRoZXJwYWRcIikuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgRXRoZXJwYWQudG9nZ2xlRXRoZXJwYWQoMCk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0dXBBdWRpb0xldmVscygpIHtcbiAgICAgICAgU3RhdGlzdGljc0FjdGl2YXRvci5hZGRBdWRpb0xldmVsTGlzdGVuZXIoQXVkaW9MZXZlbHMudXBkYXRlQXVkaW9MZXZlbCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0dXBDaGF0KClcbiAgICB7XG4gICAgICAgIENoYXQuaW5pdCgpO1xuICAgICAgICAkKFwiI3Rvb2xiYXJfY2hhdFwiKS5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBDaGF0LnRvZ2dsZUNoYXQoKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXR1cFZpZGVvTGF5b3V0RXZlbnRzKClcbiAgICB7XG5cbiAgICAgICAgJChkb2N1bWVudCkuYmluZCgnY2FsbGFjdGl2ZS5qaW5nbGUnLCBmdW5jdGlvbiAoZXZlbnQsIHZpZGVvZWxlbSwgc2lkKSB7XG4gICAgICAgICAgICBpZiAodmlkZW9lbGVtLmF0dHIoJ2lkJykuaW5kZXhPZignbWl4ZWRtc2xhYmVsJykgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgLy8gaWdub3JlIG1peGVkbXNsYWJlbGEwIGFuZCB2MFxuICAgICAgICAgICAgICAgIHZpZGVvZWxlbS5zaG93KCk7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplVGh1bWJuYWlscygpO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBsYXJnZSB2aWRlbyB0byB0aGUgbGFzdCBhZGRlZCB2aWRlbyBvbmx5IGlmIHRoZXJlJ3Mgbm9cbiAgICAgICAgICAgICAgICAvLyBjdXJyZW50IGFjdGl2ZSBvciBmb2N1c2VkIHNwZWFrZXIuXG4gICAgICAgICAgICAgICAgaWYgKCFWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMgJiYgIVZpZGVvTGF5b3V0LmdldERvbWluYW50U3BlYWtlclJlc291cmNlSmlkKCkpXG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8odmlkZW9lbGVtLmF0dHIoJ3NyYycpLCAxKTtcblxuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dGb2N1c0luZGljYXRvcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXR1cFRvb2xiYXJzKCkge1xuICAgICAgICBUb29sYmFyLmluaXQoKTtcbiAgICAgICAgQm90dG9tVG9vbGJhci5pbml0KCk7XG4gICAgfVxuXG4gICAgVUlBY3RpdmF0b3JQcm90by5zdGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gQnkgZGVmYXVsdCB3ZSB1c2UgY2FtZXJhXG4gICAgICAgIGdldFZpZGVvU2l6ZSA9IFZpZGVvTGF5b3V0LmdldENhbWVyYVZpZGVvU2l6ZTtcbiAgICAgICAgZ2V0VmlkZW9Qb3NpdGlvbiA9IFZpZGVvTGF5b3V0LmdldENhbWVyYVZpZGVvUG9zaXRpb247XG4gICAgICAgICQoJ2JvZHknKS5wb3BvdmVyKHsgc2VsZWN0b3I6ICdbZGF0YS10b2dnbGU9cG9wb3Zlcl0nLFxuICAgICAgICAgICAgdHJpZ2dlcjogJ2NsaWNrIGhvdmVyJ30pO1xuICAgICAgICBWaWRlb0xheW91dC5yZXNpemVMYXJnZVZpZGVvQ29udGFpbmVyKCk7XG4gICAgICAgICQoXCIjdmlkZW9zcGFjZVwiKS5tb3VzZW1vdmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIFRvb2xiYXJUb2dnbGVyLnNob3dUb29sYmFyKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBLZXlib2FyZFNob3J0Y3V0LmluaXQoKTtcbiAgICAgICAgcmVnaXN0ZXJMaXN0ZW5lcnMoKTtcbiAgICAgICAgYmluZEV2ZW50cygpO1xuICAgICAgICBzZXR1cEF1ZGlvTGV2ZWxzKCk7XG4gICAgICAgIHNldHVwVmlkZW9MYXlvdXRFdmVudHMoKTtcbiAgICAgICAgc2V0dXBQcmV6aSgpO1xuICAgICAgICBzZXR1cEV0aGVycGFkKCk7XG4gICAgICAgIHNldHVwVG9vbGJhcnMoKTtcbiAgICAgICAgc2V0dXBDaGF0KClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZWdpc3Rlckxpc3RlbmVycygpIHtcbiAgICAgICAgUlRDQWN0aXZhdG9yLmFkZFN0cmVhbUxpc3RlbmVyKGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgICAgIHN3aXRjaCAoc3RyZWFtLnR5cGUpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY2FzZSBcImF1ZGlvXCI6XG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LmNoYW5nZUxvY2FsQXVkaW8oc3RyZWFtLmdldE9yaWdpbmFsU3RyZWFtKCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwidmlkZW9cIjpcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuY2hhbmdlTG9jYWxWaWRlbyhzdHJlYW0uZ2V0T3JpZ2luYWxTdHJlYW0oKSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJkZXNrdG9wXCI6XG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LmNoYW5nZUxvY2FsVmlkZW8oc3RyZWFtLCAhaXNVc2luZ1NjcmVlblN0cmVhbSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBTdHJlYW1FdmVudFR5cGVzLkVWRU5UX1RZUEVfTE9DQUxfQ1JFQVRFRCk7XG5cbiAgICAgICAgUlRDQWN0aXZhdG9yLmFkZFN0cmVhbUxpc3RlbmVyKGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0Lm9uUmVtb3RlU3RyZWFtQWRkZWQoc3RyZWFtKTtcbiAgICAgICAgfSwgU3RyZWFtRXZlbnRUeXBlcy5FVkVOVF9UWVBFX1JFTU9URV9DUkVBVEVEKTtcbiAgICAgICAgLy8gTGlzdGVuIGZvciBsYXJnZSB2aWRlbyBzaXplIHVwZGF0ZXNcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xhcmdlVmlkZW8nKVxuICAgICAgICAgICAgLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50VmlkZW9XaWR0aCA9IHRoaXMudmlkZW9XaWR0aDtcbiAgICAgICAgICAgICAgICBjdXJyZW50VmlkZW9IZWlnaHQgPSB0aGlzLnZpZGVvSGVpZ2h0O1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnBvc2l0aW9uTGFyZ2UoY3VycmVudFZpZGVvV2lkdGgsIGN1cnJlbnRWaWRlb0hlaWdodCk7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gYmluZEV2ZW50cygpXG4gICAge1xuICAgICAgICAvKipcbiAgICAgICAgICogUmVzaXplcyBhbmQgcmVwb3NpdGlvbnMgdmlkZW9zIGluIGZ1bGwgc2NyZWVuIG1vZGUuXG4gICAgICAgICAqL1xuICAgICAgICAkKGRvY3VtZW50KS5vbignd2Via2l0ZnVsbHNjcmVlbmNoYW5nZSBtb3pmdWxsc2NyZWVuY2hhbmdlIGZ1bGxzY3JlZW5jaGFuZ2UnLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZUxhcmdlVmlkZW9Db250YWluZXIoKTtcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5wb3NpdGlvbkxhcmdlKCk7XG4gICAgICAgICAgICAgICAgaXNGdWxsU2NyZWVuID0gZG9jdW1lbnQuZnVsbFNjcmVlbiB8fFxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5tb3pGdWxsU2NyZWVuIHx8XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LndlYmtpdElzRnVsbFNjcmVlbjtcblxuICAgICAgICAgICAgICAgIGlmIChpc0Z1bGxTY3JlZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0VmlldyhcImZ1bGxzY3JlZW5cIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZXRWaWV3KFwiZGVmYXVsdFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICAgICAgJCh3aW5kb3cpLnJlc2l6ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5yZXNpemVMYXJnZVZpZGVvQ29udGFpbmVyKCk7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5wb3NpdGlvbkxhcmdlKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIFVJQWN0aXZhdG9yUHJvdG8uZ2V0UlRDU2VydmljZSA9IGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIHJldHVybiBSVENBY3RpdmF0b3IuZ2V0UlRDU2VydmljZSgpO1xuICAgIH1cblxuICAgIFVJQWN0aXZhdG9yUHJvdG8uZ2V0VUlTZXJ2aWNlID0gZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgaWYodWlTZXJ2aWNlID09IG51bGwpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHVpU2VydmljZSA9IG5ldyBVSVNlcnZpY2UoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdWlTZXJ2aWNlO1xuICAgIH1cblxuICAgIFVJQWN0aXZhdG9yUHJvdG8uY2hhdEFkZEVycm9yID0gZnVuY3Rpb24oZXJyb3JNZXNzYWdlLCBvcmlnaW5hbFRleHQpXG4gICAge1xuICAgICAgICByZXR1cm4gQ2hhdC5jaGF0QWRkRXJyb3IoZXJyb3JNZXNzYWdlLCBvcmlnaW5hbFRleHQpO1xuICAgIH1cblxuICAgIFVJQWN0aXZhdG9yUHJvdG8uY2hhdFNldFN1YmplY3QgPSBmdW5jdGlvbih0ZXh0KVxuICAgIHtcbiAgICAgICAgcmV0dXJuIENoYXQuY2hhdFNldFN1YmplY3QodGV4dCk7XG4gICAgfVxuXG4gICAgVUlBY3RpdmF0b3JQcm90by51cGRhdGVDaGF0Q29udmVyc2F0aW9uID0gZnVuY3Rpb24gKGZyb20sIGRpc3BsYXlOYW1lLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiBDaGF0LnVwZGF0ZUNoYXRDb252ZXJzYXRpb24oZnJvbSwgZGlzcGxheU5hbWUsIG1lc3NhZ2UpO1xuICAgIH1cblxuXG4gICAgcmV0dXJuIFVJQWN0aXZhdG9yUHJvdG87XG59KCk7XG5cbm1vZHVsZS5leHBvcnRzID0gVUlBY3RpdmF0b3I7XG5cbiIsInZhciBBdWRpb0xldmVscyA9IHJlcXVpcmUoXCIuL2F1ZGlvbGV2ZWxzL0F1ZGlvTGV2ZWxzLmpzXCIpO1xudmFyIEV0aGVycGFkID0gcmVxdWlyZShcIi4vZXRoZXJwYWQvRXRoZXJwYWQuanNcIik7XG52YXIgVmlkZW9MYXlvdXQgPSByZXF1aXJlKFwiLi9WaWRlb0xheW91dC5qc1wiKTtcbnZhciBUb29sYmFyID0gcmVxdWlyZShcIi4vdG9vbGJhcnMvdG9vbGJhci5qc1wiKTtcbnZhciBUb29sYmFyVG9nZ2xlciA9IHJlcXVpcmUoXCIuL3Rvb2xiYXJzL3Rvb2xiYXJfdG9nZ2xlci5qc1wiKTtcbnZhciBDb250YWN0TGlzdCA9IHJlcXVpcmUoXCIuL0NvbnRhY3RMaXN0XCIpO1xuXG52YXIgVUlTZXJ2aWNlID0gZnVuY3Rpb24oKSB7XG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgcm9vbSBpbnZpdGUgdXJsLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHVwZGF0ZVJvb21VcmwobmV3Um9vbVVybCkge1xuICAgICAgICByb29tVXJsID0gbmV3Um9vbVVybDtcblxuICAgICAgICAvLyBJZiB0aGUgaW52aXRlIGRpYWxvZyBoYXMgYmVlbiBhbHJlYWR5IG9wZW5lZCB3ZSB1cGRhdGUgdGhlIGluZm9ybWF0aW9uLlxuICAgICAgICB2YXIgaW52aXRlTGluayA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpbnZpdGVMaW5rUmVmJyk7XG4gICAgICAgIGlmIChpbnZpdGVMaW5rKSB7XG4gICAgICAgICAgICBpbnZpdGVMaW5rLnZhbHVlID0gcm9vbVVybDtcbiAgICAgICAgICAgIGludml0ZUxpbmsuc2VsZWN0KCk7XG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanFpX3N0YXRlMF9idXR0b25JbnZpdGUnKS5kaXNhYmxlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gVUlTZXJ2aWNlUHJvdG8oKSB7XG5cbiAgICB9XG5cbiAgICBVSVNlcnZpY2VQcm90by5wcm90b3R5cGUudXBkYXRlQXVkaW9MZXZlbENhbnZhcyA9IGZ1bmN0aW9uIChwZWVySmlkKSB7XG4gICAgICAgIEF1ZGlvTGV2ZWxzLnVwZGF0ZUF1ZGlvTGV2ZWxDYW52YXMocGVlckppZCk7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLmluaXRFdGhlcnBhZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgRXRoZXJwYWQuaW5pdCgpO1xuICAgIH1cblxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLmNoZWNrQ2hhbmdlTGFyZ2VWaWRlbyA9IGZ1bmN0aW9uIChyZW1vdmVkVmlkZW9TcmMpIHtcbiAgICAgICAgVmlkZW9MYXlvdXQuY2hlY2tDaGFuZ2VMYXJnZVZpZGVvKHJlbW92ZWRWaWRlb1NyYyk7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLm9uTXVjSm9pbmVkID0gZnVuY3Rpb24gKGppZCwgaW5mbywgbm9NZW1iZXJzKSB7XG4gICAgICAgIHVwZGF0ZVJvb21Vcmwod2luZG93LmxvY2F0aW9uLmhyZWYpO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9jYWxOaWNrJykuYXBwZW5kQ2hpbGQoXG4gICAgICAgICAgICBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpICsgJyAobWUpJylcbiAgICAgICAgKTtcblxuICAgICAgICBpZiAobm9NZW1iZXJzKSB7XG4gICAgICAgICAgICBUb29sYmFyLnNob3dTaXBDYWxsQnV0dG9uKHRydWUpO1xuICAgICAgICAgICAgVG9vbGJhci5zaG93UmVjb3JkaW5nQnV0dG9uKGZhbHNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghZm9jdXMpIHtcbiAgICAgICAgICAgIFRvb2xiYXIuc2hvd1NpcENhbGxCdXR0b24oZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZvY3VzICYmIGNvbmZpZy5ldGhlcnBhZF9iYXNlKSB7XG4gICAgICAgICAgICB0aGlzLmluaXRFdGhlcnBhZCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0ZvY3VzSW5kaWNhdG9yKCk7XG5cbiAgICAgICAgLy8gQWRkIG15c2VsZiB0byB0aGUgY29udGFjdCBsaXN0LlxuICAgICAgICBDb250YWN0TGlzdC5hZGRDb250YWN0KGppZCk7XG5cbiAgICAgICAgLy8gT25jZSB3ZSd2ZSBqb2luZWQgdGhlIG11YyBzaG93IHRoZSB0b29sYmFyXG4gICAgICAgIFRvb2xiYXJUb2dnbGVyLnNob3dUb29sYmFyKCk7XG5cbiAgICAgICAgaWYgKGluZm8uZGlzcGxheU5hbWUpXG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdkaXNwbGF5bmFtZWNoYW5nZWQnLFxuICAgICAgICAgICAgICAgIFsnbG9jYWxWaWRlb0NvbnRhaW5lcicsIGluZm8uZGlzcGxheU5hbWUgKyAnIChtZSknXSk7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLm9uTXVjRW50ZXJlZCA9IGZ1bmN0aW9uIChqaWQsIGluZm8sIHByZXMpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2VudGVyZWQnLCBqaWQsIGluZm8pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdpcyBmb2N1cz8nICsgZm9jdXMgPyAndHJ1ZScgOiAnZmFsc2UnKTtcblxuICAgICAgICAvLyBBZGQgUGVlcidzIGNvbnRhaW5lclxuICAgICAgICBWaWRlb0xheW91dC5lbnN1cmVQZWVyQ29udGFpbmVyRXhpc3RzKGppZCk7XG5cbiAgICAgICAgaWYgKGZvY3VzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAvLyBGSVhNRTogdGhpcyBzaG91bGQgcHJlcGFyZSB0aGUgdmlkZW9cbiAgICAgICAgICAgIGlmIChmb2N1cy5jb25maWQgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbWFrZSBuZXcgY29uZmVyZW5jZSB3aXRoJywgamlkKTtcbiAgICAgICAgICAgICAgICBmb2N1cy5tYWtlQ29uZmVyZW5jZShPYmplY3Qua2V5cyhjb25uZWN0aW9uLmVtdWMubWVtYmVycykpO1xuICAgICAgICAgICAgICAgIFRvb2xiYXIuc2hvd1JlY29yZGluZ0J1dHRvbih0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2ludml0ZScsIGppZCwgJ2ludG8gY29uZmVyZW5jZScpO1xuICAgICAgICAgICAgICAgIGZvY3VzLmFkZE5ld1BhcnRpY2lwYW50KGppZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc2hhcmVkS2V5KSB7XG4gICAgICAgICAgICBUb29sYmFyLnVwZGF0ZUxvY2tCdXR0b24oKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5vbk11Y1ByZXNlbmNlU3RhdHVzID0gZnVuY3Rpb24gKCBqaWQsIGluZm8sIHByZXMpIHtcbiAgICAgICAgVmlkZW9MYXlvdXQuc2V0UHJlc2VuY2VTdGF0dXMoXG4gICAgICAgICAgICAgICAgJ3BhcnRpY2lwYW50XycgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpLCBpbmZvLnN0YXR1cyk7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLm9uTXVjTGVmdCA9IGZ1bmN0aW9uKGppZClcbiAgICB7XG4gICAgICAgIC8vIE5lZWQgdG8gY2FsbCB0aGlzIHdpdGggYSBzbGlnaHQgZGVsYXksIG90aGVyd2lzZSB0aGUgZWxlbWVudCBjb3VsZG4ndCBiZVxuICAgICAgICAvLyBmb3VuZCBmb3Igc29tZSByZWFzb24uXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcbiAgICAgICAgICAgICAgICAgICAgJ3BhcnRpY2lwYW50XycgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpKTtcbiAgICAgICAgICAgIGlmIChjb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBoaWRlIGhlcmUsIHdhaXQgZm9yIHZpZGVvIHRvIGNsb3NlIGJlZm9yZSByZW1vdmluZ1xuICAgICAgICAgICAgICAgICQoY29udGFpbmVyKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplVGh1bWJuYWlscygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAxMCk7XG5cbiAgICAgICAgLy8gVW5sb2NrIGxhcmdlIHZpZGVvXG4gICAgICAgIGlmIChWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmIChnZXRKaWRGcm9tVmlkZW9TcmMoVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjKSA9PT0gamlkKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIkZvY3VzZWQgdmlkZW8gb3duZXIgaGFzIGxlZnQgdGhlIGNvbmZlcmVuY2VcIik7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgfVxuICAgIFxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS51cGRhdGVCdXR0b25zID0gZnVuY3Rpb24gKHJlY29yZGluZywgc2lwKSB7XG4gICAgICAgIGlmKHJlY29yZGluZyAhPSBudWxsKVxuICAgICAgICB7XG4gICAgICAgICAgICBUb29sYmFyLnNob3dSZWNvcmRpbmdCdXR0b24ocmVjb3JkaW5nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHNpcCAhPSBudWxsKVxuICAgICAgICB7XG4gICAgICAgICAgICBUb29sYmFyLnNob3dTaXBDYWxsQnV0dG9uKHNpcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gVUlTZXJ2aWNlUHJvdG87XG59KCk7XG5tb2R1bGUuZXhwb3J0cyA9IFVJU2VydmljZTsiLCJcbnZhciBVSVV0aWwgPSAoZnVuY3Rpb24gKG15KSB7XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBhdmFpbGFibGUgdmlkZW8gd2lkdGguXG4gICAgICovXG4gICAgbXkuZ2V0QXZhaWxhYmxlVmlkZW9XaWR0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNoYXRzcGFjZVdpZHRoXG4gICAgICAgICAgICA9ICQoJyNjaGF0c3BhY2UnKS5pcyhcIjp2aXNpYmxlXCIpXG4gICAgICAgICAgICA/ICQoJyNjaGF0c3BhY2UnKS53aWR0aCgpXG4gICAgICAgICAgICA6IDA7XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbm5lcldpZHRoIC0gY2hhdHNwYWNlV2lkdGg7XG4gICAgfTtcblxuICAgIHJldHVybiBteTtcblxufSkoVUlVdGlsIHx8IHt9KTtcblxubW9kdWxlLmV4cG9ydHMgPSBVSVV0aWw7IiwidmFyIGRlcCA9XG57XG4gICAgXCJSVENCcm93c2VyVHlwZVwiOiBmdW5jdGlvbigpeyByZXR1cm4gcmVxdWlyZShcIi4uL3NlcnZpY2UvUlRDL1JUQ0Jyb3dzZXJUeXBlLmpzXCIpfSxcbiAgICBcIlVJQWN0aXZhdG9yXCI6IGZ1bmN0aW9uKCl7IHJldHVybiByZXF1aXJlKFwiLi9VSUFjdGl2YXRvci5qc1wiKX0sXG4gICAgXCJDaGF0XCI6IGZ1bmN0aW9uKCl7IHJldHVybiByZXF1aXJlKFwiLi9jaGF0L0NoYXRcIil9LFxuICAgIFwiVUlVdGlsXCI6IGZ1bmN0aW9uKCl7IHJldHVybiByZXF1aXJlKFwiLi9VSVV0aWwuanNcIil9LFxuICAgIFwiQ29udGFjdExpc3RcIjogZnVuY3Rpb24oKXsgcmV0dXJuIHJlcXVpcmUoXCIuL0NvbnRhY3RMaXN0XCIpfSxcbiAgICBcIlRvb2xiYXJcIjogZnVuY3Rpb24oKXsgcmV0dXJuIHJlcXVpcmUoXCIuL3Rvb2xiYXJzL3Rvb2xiYXJfdG9nZ2xlclwiKX1cbn1cblxudmFyIFZpZGVvTGF5b3V0ID0gKGZ1bmN0aW9uIChteSkge1xuICAgIHZhciBwcmVNdXRlZCA9IGZhbHNlO1xuICAgIHZhciBjdXJyZW50RG9taW5hbnRTcGVha2VyID0gbnVsbDtcbiAgICB2YXIgZGVmYXVsdFJlbW90ZURpc3BsYXlOYW1lID0gXCJGZWxsb3cgSml0c3RlclwiO1xuICAgIHZhciBkZWZhdWx0RG9taW5hbnRTcGVha2VyRGlzcGxheU5hbWUgPSBcIlNwZWFrZXJcIjtcbiAgICB2YXIgbGFzdE5Db3VudCA9IGNvbmZpZy5jaGFubmVsTGFzdE47XG4gICAgdmFyIGxhc3RORW5kcG9pbnRzQ2FjaGUgPSBbXTtcbiAgICB2YXIgbGFyZ2VWaWRlb05ld1NyYyA9ICcnO1xuICAgIHZhciBicm93c2VyID0gbnVsbDtcbiAgICAvKipcbiAgICAgKiBDdXJyZW50bHkgZm9jdXNlZCB2aWRlbyBcInNyY1wiKGRpc3BsYXllZCBpbiBsYXJnZSB2aWRlbykuXG4gICAgICogQHR5cGUge1N0cmluZ31cbiAgICAgKi9cbiAgICBteS5mb2N1c2VkVmlkZW9TcmMgPSBudWxsO1xuXG4gICAgZnVuY3Rpb24gYXR0YWNoTWVkaWFTdHJlYW0oZWxlbWVudCwgc3RyZWFtKSB7XG4gICAgICAgIGlmKGJyb3dzZXIgPT0gbnVsbClcbiAgICAgICAge1xuICAgICAgICAgICAgYnJvd3NlciA9IGRlcC5VSUFjdGl2YXRvcigpLmdldFJUQ1NlcnZpY2UoKS5nZXRCcm93c2VyVHlwZSgpO1xuICAgICAgICB9XG4gICAgICAgIHN3aXRjaCAoYnJvd3NlcilcbiAgICAgICAge1xuICAgICAgICAgICAgY2FzZSBkZXAuUlRDQnJvd3NlclR5cGUoKS5SVENfQlJPV1NFUl9DSFJPTUU6XG4gICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKCdzcmMnLCB3ZWJraXRVUkwuY3JlYXRlT2JqZWN0VVJMKHN0cmVhbSkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBkZXAuUlRDQnJvd3NlclR5cGUoKS5SVENfQlJPV1NFUl9GSVJFRk9YOlxuICAgICAgICAgICAgICAgIGVsZW1lbnRbMF0ubW96U3JjT2JqZWN0ID0gc3RyZWFtO1xuICAgICAgICAgICAgICAgIGVsZW1lbnRbMF0ucGxheSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlVua25vd24gYnJvd3Nlci5cIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBteS5jaGFuZ2VMb2NhbEF1ZGlvID0gZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgICAgIGNvbm5lY3Rpb24uamluZ2xlLmxvY2FsQXVkaW8gPSBzdHJlYW07XG5cbiAgICAgICAgYXR0YWNoTWVkaWFTdHJlYW0oJCgnI2xvY2FsQXVkaW8nKSwgc3RyZWFtKTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2FsQXVkaW8nKS5hdXRvcGxheSA9IHRydWU7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsb2NhbEF1ZGlvJykudm9sdW1lID0gMDtcbiAgICAgICAgaWYgKHByZU11dGVkKSB7XG4gICAgICAgICAgICB0b2dnbGVBdWRpbygpO1xuICAgICAgICAgICAgcHJlTXV0ZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBteS5jaGFuZ2VMb2NhbFZpZGVvID0gZnVuY3Rpb24oc3RyZWFtLCBmbGlwWCkge1xuICAgICAgICBjb25uZWN0aW9uLmppbmdsZS5sb2NhbFZpZGVvID0gc3RyZWFtO1xuXG4gICAgICAgIHZhciBsb2NhbFZpZGVvID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndmlkZW8nKTtcbiAgICAgICAgbG9jYWxWaWRlby5pZCA9ICdsb2NhbFZpZGVvXycgKyBzdHJlYW0uaWQ7XG4gICAgICAgIGxvY2FsVmlkZW8uYXV0b3BsYXkgPSB0cnVlO1xuICAgICAgICBsb2NhbFZpZGVvLnZvbHVtZSA9IDA7IC8vIGlzIGl0IHJlcXVpcmVkIGlmIGF1ZGlvIGlzIHNlcGFyYXRlZCA/XG4gICAgICAgIGxvY2FsVmlkZW8ub25jb250ZXh0bWVudSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGZhbHNlOyB9O1xuXG4gICAgICAgIHZhciBsb2NhbFZpZGVvQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2FsVmlkZW9XcmFwcGVyJyk7XG4gICAgICAgIGxvY2FsVmlkZW9Db250YWluZXIuYXBwZW5kQ2hpbGQobG9jYWxWaWRlbyk7XG5cbiAgICAgICAgLy8gU2V0IGRlZmF1bHQgZGlzcGxheSBuYW1lLlxuICAgICAgICBzZXREaXNwbGF5TmFtZSgnbG9jYWxWaWRlb0NvbnRhaW5lcicpO1xuXG4gICAgICAgIGRlcC5VSUFjdGl2YXRvcigpLmdldFVJU2VydmljZSgpLnVwZGF0ZUF1ZGlvTGV2ZWxDYW52YXMoKTtcblxuICAgICAgICB2YXIgbG9jYWxWaWRlb1NlbGVjdG9yID0gJCgnIycgKyBsb2NhbFZpZGVvLmlkKTtcbiAgICAgICAgLy8gQWRkIGNsaWNrIGhhbmRsZXIgdG8gYm90aCB2aWRlbyBhbmQgdmlkZW8gd3JhcHBlciBlbGVtZW50cyBpbiBjYXNlXG4gICAgICAgIC8vIHRoZXJlJ3Mgbm8gdmlkZW8uXG4gICAgICAgIGxvY2FsVmlkZW9TZWxlY3Rvci5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5oYW5kbGVWaWRlb1RodW1iQ2xpY2tlZChsb2NhbFZpZGVvLnNyYyk7XG4gICAgICAgIH0pO1xuICAgICAgICAkKCcjbG9jYWxWaWRlb0NvbnRhaW5lcicpLmNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmhhbmRsZVZpZGVvVGh1bWJDbGlja2VkKGxvY2FsVmlkZW8uc3JjKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGhvdmVyIGhhbmRsZXJcbiAgICAgICAgJCgnI2xvY2FsVmlkZW9Db250YWluZXInKS5ob3ZlcihcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dEaXNwbGF5TmFtZSgnbG9jYWxWaWRlb0NvbnRhaW5lcicsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmICghVmlkZW9MYXlvdXQuaXNMYXJnZVZpZGVvVmlzaWJsZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICB8fCBsb2NhbFZpZGVvLnNyYyAhPT0gJCgnI2xhcmdlVmlkZW8nKS5hdHRyKCdzcmMnKSlcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0Rpc3BsYXlOYW1lKCdsb2NhbFZpZGVvQ29udGFpbmVyJywgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICAvLyBBZGQgc3RyZWFtIGVuZGVkIGhhbmRsZXJcbiAgICAgICAgc3RyZWFtLm9uZW5kZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBsb2NhbFZpZGVvQ29udGFpbmVyLnJlbW92ZUNoaWxkKGxvY2FsVmlkZW8pO1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQudXBkYXRlUmVtb3ZlZFZpZGVvKGxvY2FsVmlkZW8uc3JjKTtcbiAgICAgICAgfTtcbiAgICAgICAgLy8gRmxpcCB2aWRlbyB4IGF4aXMgaWYgbmVlZGVkXG4gICAgICAgIGZsaXBYTG9jYWxWaWRlbyA9IGZsaXBYO1xuICAgICAgICBpZiAoZmxpcFgpIHtcbiAgICAgICAgICAgIGxvY2FsVmlkZW9TZWxlY3Rvci5hZGRDbGFzcyhcImZsaXBWaWRlb1hcIik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQXR0YWNoIFdlYlJUQyBzdHJlYW1cbiAgICAgICAgYXR0YWNoTWVkaWFTdHJlYW0obG9jYWxWaWRlb1NlbGVjdG9yLCBzdHJlYW0pO1xuXG4gICAgICAgIGxvY2FsVmlkZW9TcmMgPSBsb2NhbFZpZGVvLnNyYztcblxuICAgICAgICBWaWRlb0xheW91dC51cGRhdGVMYXJnZVZpZGVvKGxvY2FsVmlkZW9TcmMsIDApO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgcmVtb3ZlZCB2aWRlbyBpcyBjdXJyZW50bHkgZGlzcGxheWVkIGFuZCB0cmllcyB0byBkaXNwbGF5XG4gICAgICogYW5vdGhlciBvbmUgaW5zdGVhZC5cbiAgICAgKiBAcGFyYW0gcmVtb3ZlZFZpZGVvU3JjIHNyYyBzdHJlYW0gaWRlbnRpZmllciBvZiB0aGUgdmlkZW8uXG4gICAgICovXG4gICAgbXkudXBkYXRlUmVtb3ZlZFZpZGVvID0gZnVuY3Rpb24ocmVtb3ZlZFZpZGVvU3JjKSB7XG4gICAgICAgIGlmIChyZW1vdmVkVmlkZW9TcmMgPT09ICQoJyNsYXJnZVZpZGVvJykuYXR0cignc3JjJykpIHtcbiAgICAgICAgICAgIC8vIHRoaXMgaXMgY3VycmVudGx5IGRpc3BsYXllZCBhcyBsYXJnZVxuICAgICAgICAgICAgLy8gcGljayB0aGUgbGFzdCB2aXNpYmxlIHZpZGVvIGluIHRoZSByb3dcbiAgICAgICAgICAgIC8vIGlmIG5vYm9keSBlbHNlIGlzIGxlZnQsIHRoaXMgcGlja3MgdGhlIGxvY2FsIHZpZGVvXG4gICAgICAgICAgICB2YXIgcGlja1xuICAgICAgICAgICAgICAgID0gJCgnI3JlbW90ZVZpZGVvcz5zcGFuW2lkIT1cIm1peGVkc3RyZWFtXCJdOnZpc2libGU6bGFzdD52aWRlbycpXG4gICAgICAgICAgICAgICAgICAgIC5nZXQoMCk7XG5cbiAgICAgICAgICAgIGlmICghcGljaykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIkxhc3QgdmlzaWJsZSB2aWRlbyBubyBsb25nZXIgZXhpc3RzXCIpO1xuICAgICAgICAgICAgICAgIHBpY2sgPSAkKCcjcmVtb3RlVmlkZW9zPnNwYW5baWQhPVwibWl4ZWRzdHJlYW1cIl0+dmlkZW8nKS5nZXQoMCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIXBpY2sgfHwgIXBpY2suc3JjKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRyeSBsb2NhbCB2aWRlb1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oXCJGYWxsYmFjayB0byBsb2NhbCB2aWRlby4uLlwiKTtcbiAgICAgICAgICAgICAgICAgICAgcGljayA9ICQoJyNyZW1vdGVWaWRlb3M+c3Bhbj5zcGFuPnZpZGVvJykuZ2V0KDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gbXV0ZSBpZiBsb2NhbHZpZGVvXG4gICAgICAgICAgICBpZiAocGljaykge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8ocGljay5zcmMsIHBpY2sudm9sdW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiRmFpbGVkIHRvIGVsZWN0IGxhcmdlIHZpZGVvXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIGxhcmdlIHZpZGVvIHdpdGggdGhlIGdpdmVuIG5ldyB2aWRlbyBzb3VyY2UuXG4gICAgICovXG4gICAgbXkudXBkYXRlTGFyZ2VWaWRlbyA9IGZ1bmN0aW9uKG5ld1NyYywgdm9sKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdob3ZlciBpbicsIG5ld1NyYyk7XG5cbiAgICAgICAgaWYgKCQoJyNsYXJnZVZpZGVvJykuYXR0cignc3JjJykgIT0gbmV3U3JjKSB7XG4gICAgICAgICAgICBsYXJnZVZpZGVvTmV3U3JjID0gbmV3U3JjO1xuXG4gICAgICAgICAgICB2YXIgaXNWaXNpYmxlID0gJCgnI2xhcmdlVmlkZW8nKS5pcygnOnZpc2libGUnKTtcblxuICAgICAgICAgICAgLy8gd2UgbmVlZCB0aGlzIGhlcmUgYmVjYXVzZSBhZnRlciB0aGUgZmFkZSB0aGUgdmlkZW9TcmMgbWF5IGhhdmVcbiAgICAgICAgICAgIC8vIGNoYW5nZWQuXG4gICAgICAgICAgICB2YXIgaXNEZXNrdG9wID0gaXNWaWRlb1NyY0Rlc2t0b3AobmV3U3JjKTtcblxuICAgICAgICAgICAgdmFyIHVzZXJKaWQgPSBnZXRKaWRGcm9tVmlkZW9TcmMobmV3U3JjKTtcbiAgICAgICAgICAgIC8vIHdlIHdhbnQgdGhlIG5vdGlmaWNhdGlvbiB0byB0cmlnZ2VyIGV2ZW4gaWYgdXNlckppZCBpcyB1bmRlZmluZWQsXG4gICAgICAgICAgICAvLyBvciBudWxsLlxuICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcihcInNlbGVjdGVkZW5kcG9pbnRjaGFuZ2VkXCIsIFt1c2VySmlkXSk7XG5cbiAgICAgICAgICAgICQoJyNsYXJnZVZpZGVvJykuZmFkZU91dCgzMDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgb2xkU3JjID0gJCh0aGlzKS5hdHRyKCdzcmMnKTtcblxuICAgICAgICAgICAgICAgICQodGhpcykuYXR0cignc3JjJywgbmV3U3JjKTtcblxuICAgICAgICAgICAgICAgIC8vIFNjcmVlbiBzdHJlYW0gaXMgYWxyZWFkeSByb3RhdGVkXG4gICAgICAgICAgICAgICAgdmFyIGZsaXBYID0gKG5ld1NyYyA9PT0gbG9jYWxWaWRlb1NyYykgJiYgZmxpcFhMb2NhbFZpZGVvO1xuXG4gICAgICAgICAgICAgICAgdmFyIHZpZGVvVHJhbnNmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xhcmdlVmlkZW8nKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5zdHlsZS53ZWJraXRUcmFuc2Zvcm07XG5cbiAgICAgICAgICAgICAgICBpZiAoZmxpcFggJiYgdmlkZW9UcmFuc2Zvcm0gIT09ICdzY2FsZVgoLTEpJykge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbGFyZ2VWaWRlbycpLnN0eWxlLndlYmtpdFRyYW5zZm9ybVxuICAgICAgICAgICAgICAgICAgICAgICAgPSBcInNjYWxlWCgtMSlcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoIWZsaXBYICYmIHZpZGVvVHJhbnNmb3JtID09PSAnc2NhbGVYKC0xKScpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xhcmdlVmlkZW8nKS5zdHlsZS53ZWJraXRUcmFuc2Zvcm1cbiAgICAgICAgICAgICAgICAgICAgICAgID0gXCJub25lXCI7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQ2hhbmdlIHRoZSB3YXkgd2UnbGwgYmUgbWVhc3VyaW5nIGFuZCBwb3NpdGlvbmluZyBsYXJnZSB2aWRlb1xuXG4gICAgICAgICAgICAgICAgZ2V0VmlkZW9TaXplID0gaXNEZXNrdG9wXG4gICAgICAgICAgICAgICAgICAgID8gZ2V0RGVza3RvcFZpZGVvU2l6ZVxuICAgICAgICAgICAgICAgICAgICA6IFZpZGVvTGF5b3V0LmdldENhbWVyYVZpZGVvU2l6ZTtcbiAgICAgICAgICAgICAgICBnZXRWaWRlb1Bvc2l0aW9uID0gaXNEZXNrdG9wXG4gICAgICAgICAgICAgICAgICAgID8gZ2V0RGVza3RvcFZpZGVvUG9zaXRpb25cbiAgICAgICAgICAgICAgICAgICAgOiBWaWRlb0xheW91dC5nZXRDYW1lcmFWaWRlb1Bvc2l0aW9uO1xuXG4gICAgICAgICAgICAgICAgaWYgKGlzVmlzaWJsZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IGlmIHRoZSBsYXJnZSB2aWRlbyBpcyBjdXJyZW50bHkgdmlzaWJsZS5cbiAgICAgICAgICAgICAgICAgICAgLy8gRGlzYWJsZSBwcmV2aW91cyBkb21pbmFudCBzcGVha2VyIHZpZGVvLlxuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkSmlkID0gZ2V0SmlkRnJvbVZpZGVvU3JjKG9sZFNyYyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvbGRKaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvbGRSZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKG9sZEppZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5lbmFibGVEb21pbmFudFNwZWFrZXIob2xkUmVzb3VyY2VKaWQsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIEVuYWJsZSBuZXcgZG9taW5hbnQgc3BlYWtlciBpbiB0aGUgcmVtb3RlIHZpZGVvcyBzZWN0aW9uLlxuICAgICAgICAgICAgICAgICAgICB2YXIgdXNlckppZCA9IGdldEppZEZyb21WaWRlb1NyYyhuZXdTcmMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodXNlckppZClcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc291cmNlSmlkID0gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQodXNlckppZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5lbmFibGVEb21pbmFudFNwZWFrZXIocmVzb3VyY2VKaWQsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5mYWRlSW4oMzAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGFuIGFycmF5IG9mIHRoZSB2aWRlbyBob3Jpem9udGFsIGFuZCB2ZXJ0aWNhbCBpbmRlbnRzLlxuICAgICAqIENlbnRlcnMgaG9yaXpvbnRhbGx5IGFuZCB0b3AgYWxpZ25zIHZlcnRpY2FsbHkuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIGFuIGFycmF5IHdpdGggMiBlbGVtZW50cywgdGhlIGhvcml6b250YWwgaW5kZW50IGFuZCB0aGUgdmVydGljYWxcbiAgICAgKiBpbmRlbnRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXREZXNrdG9wVmlkZW9Qb3NpdGlvbih2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlSGVpZ2h0KSB7XG5cbiAgICAgICAgdmFyIGhvcml6b250YWxJbmRlbnQgPSAodmlkZW9TcGFjZVdpZHRoIC0gdmlkZW9XaWR0aCkgLyAyO1xuXG4gICAgICAgIHZhciB2ZXJ0aWNhbEluZGVudCA9IDA7Ly8gVG9wIGFsaWduZWRcblxuICAgICAgICByZXR1cm4gW2hvcml6b250YWxJbmRlbnQsIHZlcnRpY2FsSW5kZW50XTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdmlkZW8gaWRlbnRpZmllZCBieSBnaXZlbiBzcmMgaXMgZGVza3RvcCBzdHJlYW0uXG4gICAgICogQHBhcmFtIHZpZGVvU3JjIGVnLlxuICAgICAqIGJsb2I6aHR0cHMlM0EvL3Bhd2VsLmppdHNpLm5ldC85YTQ2ZTBiZC0xMzFlLTRkMTgtOWMxNC1hOTI2NGU4ZGIzOTVcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc1ZpZGVvU3JjRGVza3RvcCh2aWRlb1NyYykge1xuICAgICAgICAvLyBGSVhNRTogZml4IHRoaXMgbWFwcGluZyBtZXNzLi4uXG4gICAgICAgIC8vIGZpZ3VyZSBvdXQgaWYgbGFyZ2UgdmlkZW8gaXMgZGVza3RvcCBzdHJlYW0gb3IganVzdCBhIGNhbWVyYVxuICAgICAgICB2YXIgaXNEZXNrdG9wID0gZmFsc2U7XG4gICAgICAgIGlmIChsb2NhbFZpZGVvU3JjID09PSB2aWRlb1NyYykge1xuICAgICAgICAgICAgLy8gbG9jYWwgdmlkZW9cbiAgICAgICAgICAgIGlzRGVza3RvcCA9IGlzVXNpbmdTY3JlZW5TdHJlYW07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBEbyB3ZSBoYXZlIGFzc29jaWF0aW9ucy4uLlxuICAgICAgICAgICAgdmFyIHZpZGVvU3NyYyA9IHZpZGVvU3JjVG9Tc3JjW3ZpZGVvU3JjXTtcbiAgICAgICAgICAgIGlmICh2aWRlb1NzcmMpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmlkZW9UeXBlID0gc3NyYzJ2aWRlb1R5cGVbdmlkZW9Tc3JjXTtcbiAgICAgICAgICAgICAgICBpZiAodmlkZW9UeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZpbmFsbHkgdGhlcmUuLi5cbiAgICAgICAgICAgICAgICAgICAgaXNEZXNrdG9wID0gdmlkZW9UeXBlID09PSAnc2NyZWVuJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiTm8gdmlkZW8gdHlwZSBmb3Igc3NyYzogXCIgKyB2aWRlb1NzcmMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIk5vIHNzcmMgZm9yIHNyYzogXCIgKyB2aWRlb1NyYyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGlzRGVza3RvcDtcbiAgICB9XG5cblxuICAgIG15LmhhbmRsZVZpZGVvVGh1bWJDbGlja2VkID0gZnVuY3Rpb24odmlkZW9TcmMpIHtcbiAgICAgICAgLy8gUmVzdG9yZSBzdHlsZSBmb3IgcHJldmlvdXNseSBmb2N1c2VkIHZpZGVvXG4gICAgICAgIHZhciBmb2N1c0ppZCA9IGdldEppZEZyb21WaWRlb1NyYyhWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMpO1xuICAgICAgICB2YXIgb2xkQ29udGFpbmVyID0gZ2V0UGFydGljaXBhbnRDb250YWluZXIoZm9jdXNKaWQpO1xuXG4gICAgICAgIGlmIChvbGRDb250YWluZXIpIHtcbiAgICAgICAgICAgIG9sZENvbnRhaW5lci5yZW1vdmVDbGFzcyhcInZpZGVvQ29udGFpbmVyRm9jdXNlZFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVubG9jayBjdXJyZW50IGZvY3VzZWQuIFxuICAgICAgICBpZiAoVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjID09PSB2aWRlb1NyYylcbiAgICAgICAge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjID0gbnVsbDtcbiAgICAgICAgICAgIHZhciBkb21pbmFudFNwZWFrZXJWaWRlbyA9IG51bGw7XG4gICAgICAgICAgICAvLyBFbmFibGUgdGhlIGN1cnJlbnRseSBzZXQgZG9taW5hbnQgc3BlYWtlci5cbiAgICAgICAgICAgIGlmIChjdXJyZW50RG9taW5hbnRTcGVha2VyKSB7XG4gICAgICAgICAgICAgICAgZG9taW5hbnRTcGVha2VyVmlkZW9cbiAgICAgICAgICAgICAgICAgICAgPSAkKCcjcGFydGljaXBhbnRfJyArIGN1cnJlbnREb21pbmFudFNwZWFrZXIgKyAnPnZpZGVvJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5nZXQoMCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZG9taW5hbnRTcGVha2VyVmlkZW8pIHtcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQudXBkYXRlTGFyZ2VWaWRlbyhkb21pbmFudFNwZWFrZXJWaWRlby5zcmMsIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTG9jayBuZXcgdmlkZW9cbiAgICAgICAgVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjID0gdmlkZW9TcmM7XG5cbiAgICAgICAgLy8gVXBkYXRlIGZvY3VzZWQvcGlubmVkIGludGVyZmFjZS5cbiAgICAgICAgdmFyIHVzZXJKaWQgPSBnZXRKaWRGcm9tVmlkZW9TcmModmlkZW9TcmMpO1xuICAgICAgICBpZiAodXNlckppZClcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIGNvbnRhaW5lciA9IGdldFBhcnRpY2lwYW50Q29udGFpbmVyKHVzZXJKaWQpO1xuICAgICAgICAgICAgY29udGFpbmVyLmFkZENsYXNzKFwidmlkZW9Db250YWluZXJGb2N1c2VkXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHJpZ2dlcnMgYSBcInZpZGVvLnNlbGVjdGVkXCIgZXZlbnQuIFRoZSBcImZhbHNlXCIgcGFyYW1ldGVyIGluZGljYXRlc1xuICAgICAgICAvLyB0aGlzIGlzbid0IGEgcHJlemkuXG4gICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoXCJ2aWRlby5zZWxlY3RlZFwiLCBbZmFsc2VdKTtcblxuICAgICAgICBWaWRlb0xheW91dC51cGRhdGVMYXJnZVZpZGVvKHZpZGVvU3JjLCAxKTtcblxuICAgICAgICAkKCdhdWRpbycpLmVhY2goZnVuY3Rpb24gKGlkeCwgZWwpIHtcbiAgICAgICAgICAgIGlmIChlbC5pZC5pbmRleE9mKCdtaXhlZG1zbGFiZWwnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBlbC52b2x1bWUgPSAwO1xuICAgICAgICAgICAgICAgIGVsLnZvbHVtZSA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBQb3NpdGlvbnMgdGhlIGxhcmdlIHZpZGVvLlxuICAgICAqXG4gICAgICogQHBhcmFtIHZpZGVvV2lkdGggdGhlIHN0cmVhbSB2aWRlbyB3aWR0aFxuICAgICAqIEBwYXJhbSB2aWRlb0hlaWdodCB0aGUgc3RyZWFtIHZpZGVvIGhlaWdodFxuICAgICAqL1xuICAgIG15LnBvc2l0aW9uTGFyZ2UgPSBmdW5jdGlvbiAodmlkZW9XaWR0aCwgdmlkZW9IZWlnaHQpIHtcbiAgICAgICAgdmFyIHZpZGVvU3BhY2VXaWR0aCA9ICQoJyN2aWRlb3NwYWNlJykud2lkdGgoKTtcbiAgICAgICAgdmFyIHZpZGVvU3BhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG5cbiAgICAgICAgdmFyIHZpZGVvU2l6ZSA9IGdldFZpZGVvU2l6ZSh2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlSGVpZ2h0KTtcblxuICAgICAgICB2YXIgbGFyZ2VWaWRlb1dpZHRoID0gdmlkZW9TaXplWzBdO1xuICAgICAgICB2YXIgbGFyZ2VWaWRlb0hlaWdodCA9IHZpZGVvU2l6ZVsxXTtcblxuICAgICAgICB2YXIgdmlkZW9Qb3NpdGlvbiA9IGdldFZpZGVvUG9zaXRpb24obGFyZ2VWaWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFyZ2VWaWRlb0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VIZWlnaHQpO1xuXG4gICAgICAgIHZhciBob3Jpem9udGFsSW5kZW50ID0gdmlkZW9Qb3NpdGlvblswXTtcbiAgICAgICAgdmFyIHZlcnRpY2FsSW5kZW50ID0gdmlkZW9Qb3NpdGlvblsxXTtcblxuICAgICAgICBwb3NpdGlvblZpZGVvKCQoJyNsYXJnZVZpZGVvJyksXG4gICAgICAgICAgICAgICAgICAgICAgbGFyZ2VWaWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgIGxhcmdlVmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgaG9yaXpvbnRhbEluZGVudCwgdmVydGljYWxJbmRlbnQpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTaG93cy9oaWRlcyB0aGUgbGFyZ2UgdmlkZW8uXG4gICAgICovXG4gICAgbXkuc2V0TGFyZ2VWaWRlb1Zpc2libGUgPSBmdW5jdGlvbihpc1Zpc2libGUpIHtcbiAgICAgICAgdmFyIGxhcmdlVmlkZW9KaWQgPSBnZXRKaWRGcm9tVmlkZW9TcmMoJCgnI2xhcmdlVmlkZW8nKS5hdHRyKCdzcmMnKSk7XG4gICAgICAgIHZhciByZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGxhcmdlVmlkZW9KaWQpO1xuXG4gICAgICAgIGlmIChpc1Zpc2libGUpIHtcbiAgICAgICAgICAgICQoJyNsYXJnZVZpZGVvJykuY3NzKHt2aXNpYmlsaXR5OiAndmlzaWJsZSd9KTtcbiAgICAgICAgICAgICQoJy53YXRlcm1hcmsnKS5jc3Moe3Zpc2liaWxpdHk6ICd2aXNpYmxlJ30pO1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuZW5hYmxlRG9taW5hbnRTcGVha2VyKHJlc291cmNlSmlkLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICQoJyNsYXJnZVZpZGVvJykuY3NzKHt2aXNpYmlsaXR5OiAnaGlkZGVuJ30pO1xuICAgICAgICAgICAgJCgnLndhdGVybWFyaycpLmNzcyh7dmlzaWJpbGl0eTogJ2hpZGRlbid9KTtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmVuYWJsZURvbWluYW50U3BlYWtlcihyZXNvdXJjZUppZCwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEluZGljYXRlcyBpZiB0aGUgbGFyZ2UgdmlkZW8gaXMgY3VycmVudGx5IHZpc2libGUuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIDx0dD50cnVlPC90dD4gaWYgdmlzaWJsZSwgPHR0PmZhbHNlPC90dD4gLSBvdGhlcndpc2VcbiAgICAgKi9cbiAgICBteS5pc0xhcmdlVmlkZW9WaXNpYmxlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAkKCcjbGFyZ2VWaWRlbycpLmlzKCc6dmlzaWJsZScpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgY29udGFpbmVyIGZvciBwYXJ0aWNpcGFudCBpZGVudGlmaWVkIGJ5IGdpdmVuIHBlZXJKaWQgZXhpc3RzXG4gICAgICogaW4gdGhlIGRvY3VtZW50IGFuZCBjcmVhdGVzIGl0IGV2ZW50dWFsbHkuXG4gICAgICogXG4gICAgICogQHBhcmFtIHBlZXJKaWQgcGVlciBKaWQgdG8gY2hlY2suXG4gICAgICogXG4gICAgICogQHJldHVybiBSZXR1cm5zIDx0dD50cnVlPC90dD4gaWYgdGhlIHBlZXIgY29udGFpbmVyIGV4aXN0cyxcbiAgICAgKiA8dHQ+ZmFsc2U8L3R0PiAtIG90aGVyd2lzZVxuICAgICAqL1xuICAgIG15LmVuc3VyZVBlZXJDb250YWluZXJFeGlzdHMgPSBmdW5jdGlvbihwZWVySmlkKSB7XG4gICAgICAgIGRlcC5Db250YWN0TGlzdCgpLmVuc3VyZUFkZENvbnRhY3QocGVlckppZCk7XG5cbiAgICAgICAgdmFyIHJlc291cmNlSmlkID0gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQocGVlckppZCk7XG5cbiAgICAgICAgdmFyIHZpZGVvU3BhbklkID0gJ3BhcnRpY2lwYW50XycgKyByZXNvdXJjZUppZDtcblxuICAgICAgICBpZiAoJCgnIycgKyB2aWRlb1NwYW5JZCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gSWYgdGhlcmUncyBiZWVuIGEgZm9jdXMgY2hhbmdlLCBtYWtlIHN1cmUgd2UgYWRkIGZvY3VzIHJlbGF0ZWRcbiAgICAgICAgICAgIC8vIGludGVyZmFjZSEhXG4gICAgICAgICAgICBpZiAoZm9jdXMgJiYgJCgnI3JlbW90ZV9wb3B1cG1lbnVfJyArIHJlc291cmNlSmlkKS5sZW5ndGggPD0gMClcbiAgICAgICAgICAgICAgICBhZGRSZW1vdGVWaWRlb01lbnUoIHBlZXJKaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh2aWRlb1NwYW5JZCkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGNvbnRhaW5lclxuICAgICAgICAgICAgICAgID0gVmlkZW9MYXlvdXQuYWRkUmVtb3RlVmlkZW9Db250YWluZXIocGVlckppZCwgdmlkZW9TcGFuSWQpO1xuXG4gICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCBkaXNwbGF5IG5hbWUuXG4gICAgICAgICAgICBzZXREaXNwbGF5TmFtZSh2aWRlb1NwYW5JZCk7XG5cbiAgICAgICAgICAgIHZhciBuaWNrZmllbGQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICBuaWNrZmllbGQuY2xhc3NOYW1lID0gXCJuaWNrXCI7XG4gICAgICAgICAgICBuaWNrZmllbGQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUocmVzb3VyY2VKaWQpKTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChuaWNrZmllbGQpO1xuXG4gICAgICAgICAgICAvLyBJbiBjYXNlIHRoaXMgaXMgbm90IGN1cnJlbnRseSBpbiB0aGUgbGFzdCBuIHdlIGRvbid0IHNob3cgaXQuXG4gICAgICAgICAgICBpZiAobGFzdE5Db3VudFxuICAgICAgICAgICAgICAgICYmIGxhc3ROQ291bnQgPiAwXG4gICAgICAgICAgICAgICAgJiYgJCgnI3JlbW90ZVZpZGVvcz5zcGFuJykubGVuZ3RoID49IGxhc3ROQ291bnQgKyAyKSB7XG4gICAgICAgICAgICAgICAgc2hvd1BlZXJDb250YWluZXIocmVzb3VyY2VKaWQsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5yZXNpemVUaHVtYm5haWxzKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgbXkuYWRkUmVtb3RlVmlkZW9Db250YWluZXIgPSBmdW5jdGlvbihwZWVySmlkLCBzcGFuSWQpIHtcbiAgICAgICAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgY29udGFpbmVyLmlkID0gc3BhbklkO1xuICAgICAgICBjb250YWluZXIuY2xhc3NOYW1lID0gJ3ZpZGVvY29udGFpbmVyJztcbiAgICAgICAgdmFyIHJlbW90ZXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVtb3RlVmlkZW9zJyk7XG5cbiAgICAgICAgLy8gSWYgdGhlIHBlZXJKaWQgaXMgbnVsbCB0aGVuIHRoaXMgdmlkZW8gc3BhbiBjb3VsZG4ndCBiZSBkaXJlY3RseVxuICAgICAgICAvLyBhc3NvY2lhdGVkIHdpdGggYSBwYXJ0aWNpcGFudCAodGhpcyBjb3VsZCBoYXBwZW4gaW4gdGhlIGNhc2Ugb2YgcHJlemkpLlxuICAgICAgICBpZiAoZm9jdXMgJiYgcGVlckppZCAhPSBudWxsKVxuICAgICAgICAgICAgYWRkUmVtb3RlVmlkZW9NZW51KHBlZXJKaWQsIGNvbnRhaW5lcik7XG5cbiAgICAgICAgcmVtb3Rlcy5hcHBlbmRDaGlsZChjb250YWluZXIpO1xuICAgICAgICBkZXAuVUlBY3RpdmF0b3IoKS5nZXRVSVNlcnZpY2UoKS51cGRhdGVBdWRpb0xldmVsQ2FudmFzKHBlZXJKaWQpO1xuXG4gICAgICAgIHJldHVybiBjb250YWluZXI7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYXVkaW8gb3IgdmlkZW8gc3RyZWFtIGVsZW1lbnQuXG4gICAgICovXG4gICAgbXkuY3JlYXRlU3RyZWFtRWxlbWVudCA9IGZ1bmN0aW9uIChzaWQsIHN0cmVhbSkge1xuICAgICAgICB2YXIgaXNWaWRlbyA9IHN0cmVhbS5nZXRWaWRlb1RyYWNrcygpLmxlbmd0aCA+IDA7XG5cbiAgICAgICAgaWYoaXNWaWRlbylcbiAgICAgICAge1xuICAgICAgICAgICAgY29uc29sZS50cmFjZShzdHJlYW0pO1xuICAgICAgICB9XG4gICAgICAgIHZhciBlbGVtZW50ID0gaXNWaWRlb1xuICAgICAgICAgICAgICAgICAgICAgICAgPyBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd2aWRlbycpXG4gICAgICAgICAgICAgICAgICAgICAgICA6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2F1ZGlvJyk7XG4gICAgICAgIHZhciBpZCA9IChpc1ZpZGVvID8gJ3JlbW90ZVZpZGVvXycgOiAncmVtb3RlQXVkaW9fJylcbiAgICAgICAgICAgICAgICAgICAgKyBzaWQgKyAnXycgKyBzdHJlYW0uaWQ7XG5cbiAgICAgICAgZWxlbWVudC5pZCA9IGlkO1xuICAgICAgICBlbGVtZW50LmF1dG9wbGF5ID0gdHJ1ZTtcbiAgICAgICAgZWxlbWVudC5vbmNvbnRleHRtZW51ID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gZmFsc2U7IH07XG5cbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgfTtcblxuICAgIG15LmFkZFJlbW90ZVN0cmVhbUVsZW1lbnRcbiAgICAgICAgPSBmdW5jdGlvbiAoY29udGFpbmVyLCBzaWQsIHN0cmVhbSwgcGVlckppZCwgdGhlc3NyYykge1xuICAgICAgICB2YXIgbmV3RWxlbWVudElkID0gbnVsbDtcblxuICAgICAgICB2YXIgaXNWaWRlbyA9IHN0cmVhbS5nZXRWaWRlb1RyYWNrcygpLmxlbmd0aCA+IDA7XG5cbiAgICAgICAgaWYgKGNvbnRhaW5lcikge1xuICAgICAgICAgICAgdmFyIHN0cmVhbUVsZW1lbnQgPSBWaWRlb0xheW91dC5jcmVhdGVTdHJlYW1FbGVtZW50KHNpZCwgc3RyZWFtKTtcbiAgICAgICAgICAgIG5ld0VsZW1lbnRJZCA9IHN0cmVhbUVsZW1lbnQuaWQ7XG5cbiAgICAgICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChzdHJlYW1FbGVtZW50KTtcblxuICAgICAgICAgICAgdmFyIHNlbCA9ICQoJyMnICsgbmV3RWxlbWVudElkKTtcbiAgICAgICAgICAgIHNlbC5oaWRlKCk7XG5cbiAgICAgICAgICAgIC8vIElmIHRoZSBjb250YWluZXIgaXMgY3VycmVudGx5IHZpc2libGUgd2UgYXR0YWNoIHRoZSBzdHJlYW0uXG4gICAgICAgICAgICBpZiAoIWlzVmlkZW9cbiAgICAgICAgICAgICAgICB8fCAoY29udGFpbmVyLm9mZnNldFBhcmVudCAhPT0gbnVsbCAmJiBpc1ZpZGVvKSkge1xuLy88PDw8PDw8IEhFQUQ6VUkvdmlkZW9sYXlvdXQuanNcbi8vICAgICAgICAgICAgICAgIGF0dGFjaE1lZGlhU3RyZWFtKHNlbCwgc3RyZWFtKTtcbi8vPT09PT09PVxuICAgICAgICAgICAgICAgIHZhciBzaW11bGNhc3QgPSBuZXcgU2ltdWxjYXN0KCk7XG4gICAgICAgICAgICAgICAgdmFyIHZpZGVvU3RyZWFtID0gc2ltdWxjYXN0LmdldFJlY2VpdmluZ1ZpZGVvU3RyZWFtKHN0cmVhbSk7XG4gICAgICAgICAgICAgICAgYXR0YWNoTWVkaWFTdHJlYW0oc2VsLCB2aWRlb1N0cmVhbSk7XG4vLz4+Pj4+Pj4gbWFzdGVyOnZpZGVvbGF5b3V0LmpzXG5cbiAgICAgICAgICAgICAgICBpZiAoaXNWaWRlbylcbiAgICAgICAgICAgICAgICAgICAgd2FpdEZvclJlbW90ZVZpZGVvKHNlbCwgdGhlc3NyYywgc3RyZWFtKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3RyZWFtLm9uZW5kZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3N0cmVhbSBlbmRlZCcsIHRoaXMpO1xuXG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQucmVtb3ZlUmVtb3RlU3RyZWFtRWxlbWVudChzdHJlYW0sIGNvbnRhaW5lcik7XG5cbiAgICAgICAgICAgICAgICBpZiAocGVlckppZClcbiAgICAgICAgICAgICAgICAgICAgZGVwLkNvbnRhY3RMaXN0KCkucmVtb3ZlQ29udGFjdChwZWVySmlkKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIEFkZCBjbGljayBoYW5kbGVyLlxuICAgICAgICAgICAgY29udGFpbmVyLm9uY2xpY2sgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAqIEZJWE1FIEl0IHR1cm5zIG91dCB0aGF0IHZpZGVvVGh1bWIgbWF5IG5vdCBleGlzdCAoaWYgdGhlcmUgaXNcbiAgICAgICAgICAgICAgICAgKiBubyBhY3R1YWwgdmlkZW8pLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHZhciB2aWRlb1RodW1iID0gJCgnIycgKyBjb250YWluZXIuaWQgKyAnPnZpZGVvJykuZ2V0KDApO1xuXG4gICAgICAgICAgICAgICAgaWYgKHZpZGVvVGh1bWIpXG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LmhhbmRsZVZpZGVvVGh1bWJDbGlja2VkKHZpZGVvVGh1bWIuc3JjKTtcblxuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gQWRkIGhvdmVyIGhhbmRsZXJcbiAgICAgICAgICAgICQoY29udGFpbmVyKS5ob3ZlcihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0Rpc3BsYXlOYW1lKGNvbnRhaW5lci5pZCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZpZGVvU3JjID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQoJyMnICsgY29udGFpbmVyLmlkICsgJz52aWRlbycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgJCgnIycgKyBjb250YWluZXIuaWQgKyAnPnZpZGVvJykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcmMgPSAkKCcjJyArIGNvbnRhaW5lci5pZCArICc+dmlkZW8nKS5nZXQoMCkuc3JjO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIHZpZGVvIGhhcyBiZWVuIFwicGlubmVkXCIgYnkgdGhlIHVzZXIgd2Ugd2FudCB0b1xuICAgICAgICAgICAgICAgICAgICAvLyBrZWVwIHRoZSBkaXNwbGF5IG5hbWUgb24gcGxhY2UuXG4gICAgICAgICAgICAgICAgICAgIGlmICghVmlkZW9MYXlvdXQuaXNMYXJnZVZpZGVvVmlzaWJsZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgdmlkZW9TcmMgIT09ICQoJyNsYXJnZVZpZGVvJykuYXR0cignc3JjJykpXG4gICAgICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zaG93RGlzcGxheU5hbWUoY29udGFpbmVyLmlkLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXdFbGVtZW50SWQ7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgdGhlIHJlbW90ZSBzdHJlYW0gZWxlbWVudCBjb3JyZXNwb25kaW5nIHRvIHRoZSBnaXZlbiBzdHJlYW0gYW5kXG4gICAgICogcGFyZW50IGNvbnRhaW5lci5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0gc3RyZWFtIHRoZSBzdHJlYW1cbiAgICAgKiBAcGFyYW0gY29udGFpbmVyXG4gICAgICovXG4gICAgbXkucmVtb3ZlUmVtb3RlU3RyZWFtRWxlbWVudCA9IGZ1bmN0aW9uIChzdHJlYW0sIGNvbnRhaW5lcikge1xuICAgICAgICBpZiAoIWNvbnRhaW5lcilcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICB2YXIgc2VsZWN0ID0gbnVsbDtcbiAgICAgICAgdmFyIHJlbW92ZWRWaWRlb1NyYyA9IG51bGw7XG4gICAgICAgIGlmIChzdHJlYW0uZ2V0VmlkZW9UcmFja3MoKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBzZWxlY3QgPSAkKCcjJyArIGNvbnRhaW5lci5pZCArICc+dmlkZW8nKTtcbiAgICAgICAgICAgIHJlbW92ZWRWaWRlb1NyYyA9IHNlbGVjdC5nZXQoMCkuc3JjO1xuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHNlbGVjdCA9ICQoJyMnICsgY29udGFpbmVyLmlkICsgJz5hdWRpbycpO1xuXG4gICAgICAgIC8vIFJlbW92ZSB2aWRlbyBzb3VyY2UgZnJvbSB0aGUgbWFwcGluZy5cbiAgICAgICAgZGVsZXRlIHZpZGVvU3JjVG9Tc3JjW3JlbW92ZWRWaWRlb1NyY107XG5cbiAgICAgICAgLy8gTWFyayB2aWRlbyBhcyByZW1vdmVkIHRvIGNhbmNlbCB3YWl0aW5nIGxvb3AoaWYgdmlkZW8gaXMgcmVtb3ZlZFxuICAgICAgICAvLyBiZWZvcmUgaGFzIHN0YXJ0ZWQpXG4gICAgICAgIHNlbGVjdC5yZW1vdmVkID0gdHJ1ZTtcbiAgICAgICAgc2VsZWN0LnJlbW92ZSgpO1xuXG4gICAgICAgIHZhciBhdWRpb0NvdW50ID0gJCgnIycgKyBjb250YWluZXIuaWQgKyAnPmF1ZGlvJykubGVuZ3RoO1xuICAgICAgICB2YXIgdmlkZW9Db3VudCA9ICQoJyMnICsgY29udGFpbmVyLmlkICsgJz52aWRlbycpLmxlbmd0aDtcblxuICAgICAgICBpZiAoIWF1ZGlvQ291bnQgJiYgIXZpZGVvQ291bnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVtb3ZlIHdob2xlIHVzZXJcIiwgY29udGFpbmVyLmlkKTtcbiAgICAgICAgICAgIC8vIFJlbW92ZSB3aG9sZSBjb250YWluZXJcbiAgICAgICAgICAgIGNvbnRhaW5lci5yZW1vdmUoKTtcbiAgICAgICAgICAgIFV0aWwucGxheVNvdW5kTm90aWZpY2F0aW9uKCd1c2VyTGVmdCcpO1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplVGh1bWJuYWlscygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlbW92ZWRWaWRlb1NyYylcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZVJlbW92ZWRWaWRlbyhyZW1vdmVkVmlkZW9TcmMpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTaG93L2hpZGUgcGVlciBjb250YWluZXIgZm9yIHRoZSBnaXZlbiByZXNvdXJjZUppZC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzaG93UGVlckNvbnRhaW5lcihyZXNvdXJjZUppZCwgaXNTaG93KSB7XG4gICAgICAgIHZhciBwZWVyQ29udGFpbmVyID0gJCgnI3BhcnRpY2lwYW50XycgKyByZXNvdXJjZUppZCk7XG5cbiAgICAgICAgaWYgKCFwZWVyQ29udGFpbmVyKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIGlmICghcGVlckNvbnRhaW5lci5pcygnOnZpc2libGUnKSAmJiBpc1Nob3cpXG4gICAgICAgICAgICBwZWVyQ29udGFpbmVyLnNob3coKTtcbiAgICAgICAgZWxzZSBpZiAocGVlckNvbnRhaW5lci5pcygnOnZpc2libGUnKSAmJiAhaXNTaG93KVxuICAgICAgICAgICAgcGVlckNvbnRhaW5lci5oaWRlKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGRpc3BsYXkgbmFtZSBmb3IgdGhlIGdpdmVuIHZpZGVvIHNwYW4gaWQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2V0RGlzcGxheU5hbWUodmlkZW9TcGFuSWQsIGRpc3BsYXlOYW1lKSB7XG4gICAgICAgIHZhciBuYW1lU3BhbiA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPnNwYW4uZGlzcGxheW5hbWUnKTtcbiAgICAgICAgdmFyIGRlZmF1bHRMb2NhbERpc3BsYXlOYW1lID0gXCJNZVwiO1xuXG4gICAgICAgIC8vIElmIHdlIGFscmVhZHkgaGF2ZSBhIGRpc3BsYXkgbmFtZSBmb3IgdGhpcyB2aWRlby5cbiAgICAgICAgaWYgKG5hbWVTcGFuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBuYW1lU3BhbkVsZW1lbnQgPSBuYW1lU3Bhbi5nZXQoMCk7XG5cbiAgICAgICAgICAgIGlmIChuYW1lU3BhbkVsZW1lbnQuaWQgPT09ICdsb2NhbERpc3BsYXlOYW1lJyAmJlxuICAgICAgICAgICAgICAgICQoJyNsb2NhbERpc3BsYXlOYW1lJykudGV4dCgpICE9PSBkaXNwbGF5TmFtZSkge1xuICAgICAgICAgICAgICAgIGlmIChkaXNwbGF5TmFtZSAmJiBkaXNwbGF5TmFtZS5sZW5ndGggPiAwKVxuICAgICAgICAgICAgICAgICAgICAkKCcjbG9jYWxEaXNwbGF5TmFtZScpLnRleHQoZGlzcGxheU5hbWUgKyAnIChtZSknKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICQoJyNsb2NhbERpc3BsYXlOYW1lJykudGV4dChkZWZhdWx0TG9jYWxEaXNwbGF5TmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChkaXNwbGF5TmFtZSAmJiBkaXNwbGF5TmFtZS5sZW5ndGggPiAwKVxuICAgICAgICAgICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkICsgJ19uYW1lJykudGV4dChkaXNwbGF5TmFtZSk7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkICsgJ19uYW1lJykudGV4dChkZWZhdWx0UmVtb3RlRGlzcGxheU5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGVkaXRCdXR0b24gPSBudWxsO1xuXG4gICAgICAgICAgICBuYW1lU3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIG5hbWVTcGFuLmNsYXNzTmFtZSA9ICdkaXNwbGF5bmFtZSc7XG4gICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkKVswXS5hcHBlbmRDaGlsZChuYW1lU3Bhbik7XG5cbiAgICAgICAgICAgIGlmICh2aWRlb1NwYW5JZCA9PT0gJ2xvY2FsVmlkZW9Db250YWluZXInKSB7XG4gICAgICAgICAgICAgICAgZWRpdEJ1dHRvbiA9IGNyZWF0ZUVkaXREaXNwbGF5TmFtZUJ1dHRvbigpO1xuICAgICAgICAgICAgICAgIG5hbWVTcGFuLmlubmVyVGV4dCA9IGRlZmF1bHRMb2NhbERpc3BsYXlOYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbmFtZVNwYW4uaW5uZXJUZXh0ID0gZGVmYXVsdFJlbW90ZURpc3BsYXlOYW1lO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZGlzcGxheU5hbWUgJiYgZGlzcGxheU5hbWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIG5hbWVTcGFuLmlubmVyVGV4dCA9IGRpc3BsYXlOYW1lO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWVkaXRCdXR0b24pIHtcbiAgICAgICAgICAgICAgICBuYW1lU3Bhbi5pZCA9IHZpZGVvU3BhbklkICsgJ19uYW1lJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbmFtZVNwYW4uaWQgPSAnbG9jYWxEaXNwbGF5TmFtZSc7XG4gICAgICAgICAgICAgICAgJCgnIycgKyB2aWRlb1NwYW5JZClbMF0uYXBwZW5kQ2hpbGQoZWRpdEJ1dHRvbik7XG5cbiAgICAgICAgICAgICAgICB2YXIgZWRpdGFibGVUZXh0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICAgICAgICAgICAgICBlZGl0YWJsZVRleHQuY2xhc3NOYW1lID0gJ2Rpc3BsYXluYW1lJztcbiAgICAgICAgICAgICAgICBlZGl0YWJsZVRleHQudHlwZSA9ICd0ZXh0JztcbiAgICAgICAgICAgICAgICBlZGl0YWJsZVRleHQuaWQgPSAnZWRpdERpc3BsYXlOYW1lJztcblxuICAgICAgICAgICAgICAgIGlmIChkaXNwbGF5TmFtZSAmJiBkaXNwbGF5TmFtZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgZWRpdGFibGVUZXh0LnZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICA9IGRpc3BsYXlOYW1lLnN1YnN0cmluZygwLCBkaXNwbGF5TmFtZS5pbmRleE9mKCcgKG1lKScpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBlZGl0YWJsZVRleHQuc2V0QXR0cmlidXRlKCdzdHlsZScsICdkaXNwbGF5Om5vbmU7Jyk7XG4gICAgICAgICAgICAgICAgZWRpdGFibGVUZXh0LnNldEF0dHJpYnV0ZSgncGxhY2Vob2xkZXInLCAnZXguIEphbmUgUGluaycpO1xuICAgICAgICAgICAgICAgICQoJyMnICsgdmlkZW9TcGFuSWQpWzBdLmFwcGVuZENoaWxkKGVkaXRhYmxlVGV4dCk7XG5cbiAgICAgICAgICAgICAgICAkKCcjbG9jYWxWaWRlb0NvbnRhaW5lciAuZGlzcGxheW5hbWUnKVxuICAgICAgICAgICAgICAgICAgICAuYmluZChcImNsaWNrXCIsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAkKCcjbG9jYWxEaXNwbGF5TmFtZScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2VkaXREaXNwbGF5TmFtZScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2VkaXREaXNwbGF5TmFtZScpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNlZGl0RGlzcGxheU5hbWUnKS5zZWxlY3QoKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgaW5wdXREaXNwbGF5TmFtZUhhbmRsZXIgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5pY2tuYW1lICE9PSBuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmlja25hbWUgPSBuYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UuZGlzcGxheW5hbWUgPSBuaWNrbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuYWRkRGlzcGxheU5hbWVUb1ByZXNlbmNlKG5pY2tuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuc2VuZFByZXNlbmNlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXAuQ2hhdCgpLnNldENoYXRDb252ZXJzYXRpb25Nb2RlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoISQoJyNsb2NhbERpc3BsYXlOYW1lJykuaXMoXCI6dmlzaWJsZVwiKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuaWNrbmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI2xvY2FsRGlzcGxheU5hbWUnKS50ZXh0KG5pY2tuYW1lICsgXCIgKG1lKVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNsb2NhbERpc3BsYXlOYW1lJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50ZXh0KGRlZmF1bHRMb2NhbERpc3BsYXlOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjbG9jYWxEaXNwbGF5TmFtZScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgJCgnI2VkaXREaXNwbGF5TmFtZScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAkKCcjZWRpdERpc3BsYXlOYW1lJykub25lKFwiZm9jdXNvdXRcIiwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0RGlzcGxheU5hbWVIYW5kbGVyKHRoaXMudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAkKCcjZWRpdERpc3BsYXlOYW1lJykub24oJ2tleWRvd24nLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXREaXNwbGF5TmFtZUhhbmRsZXIodGhpcy52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3dzL2hpZGVzIHRoZSBkaXNwbGF5IG5hbWUgb24gdGhlIHJlbW90ZSB2aWRlby5cbiAgICAgKiBAcGFyYW0gdmlkZW9TcGFuSWQgdGhlIGlkZW50aWZpZXIgb2YgdGhlIHZpZGVvIHNwYW4gZWxlbWVudFxuICAgICAqIEBwYXJhbSBpc1Nob3cgaW5kaWNhdGVzIGlmIHRoZSBkaXNwbGF5IG5hbWUgc2hvdWxkIGJlIHNob3duIG9yIGhpZGRlblxuICAgICAqL1xuICAgIG15LnNob3dEaXNwbGF5TmFtZSA9IGZ1bmN0aW9uKHZpZGVvU3BhbklkLCBpc1Nob3cpIHtcbiAgICAgICAgdmFyIG5hbWVTcGFuID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+c3Bhbi5kaXNwbGF5bmFtZScpLmdldCgwKTtcbiAgICAgICAgaWYgKGlzU2hvdykge1xuICAgICAgICAgICAgaWYgKG5hbWVTcGFuICYmIG5hbWVTcGFuLmlubmVySFRNTCAmJiBuYW1lU3Bhbi5pbm5lckhUTUwubGVuZ3RoKSBcbiAgICAgICAgICAgICAgICBuYW1lU3Bhbi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImRpc3BsYXk6aW5saW5lLWJsb2NrO1wiKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmIChuYW1lU3BhbilcbiAgICAgICAgICAgICAgICBuYW1lU3Bhbi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImRpc3BsYXk6bm9uZTtcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2hvd3MgdGhlIHByZXNlbmNlIHN0YXR1cyBtZXNzYWdlIGZvciB0aGUgZ2l2ZW4gdmlkZW8uXG4gICAgICovXG4gICAgbXkuc2V0UHJlc2VuY2VTdGF0dXMgPSBmdW5jdGlvbiAodmlkZW9TcGFuSWQsIHN0YXR1c01zZykge1xuXG4gICAgICAgIGlmICghJCgnIycgKyB2aWRlb1NwYW5JZCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBObyBjb250YWluZXJcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzdGF0dXNTcGFuID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+c3Bhbi5zdGF0dXMnKTtcbiAgICAgICAgaWYgKCFzdGF0dXNTcGFuLmxlbmd0aCkge1xuICAgICAgICAgICAgLy9BZGQgc3RhdHVzIHNwYW5cbiAgICAgICAgICAgIHN0YXR1c1NwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICBzdGF0dXNTcGFuLmNsYXNzTmFtZSA9ICdzdGF0dXMnO1xuICAgICAgICAgICAgc3RhdHVzU3Bhbi5pZCA9IHZpZGVvU3BhbklkICsgJ19zdGF0dXMnO1xuICAgICAgICAgICAgJCgnIycgKyB2aWRlb1NwYW5JZClbMF0uYXBwZW5kQ2hpbGQoc3RhdHVzU3Bhbik7XG5cbiAgICAgICAgICAgIHN0YXR1c1NwYW4gPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5zcGFuLnN0YXR1cycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGlzcGxheSBzdGF0dXNcbiAgICAgICAgaWYgKHN0YXR1c01zZyAmJiBzdGF0dXNNc2cubGVuZ3RoKSB7XG4gICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkICsgJ19zdGF0dXMnKS50ZXh0KHN0YXR1c01zZyk7XG4gICAgICAgICAgICBzdGF0dXNTcGFuLmdldCgwKS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImRpc3BsYXk6aW5saW5lLWJsb2NrO1wiKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGVcbiAgICAgICAgICAgIHN0YXR1c1NwYW4uZ2V0KDApLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTpub25lO1wiKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBhIHZpc3VhbCBpbmRpY2F0b3IgZm9yIHRoZSBmb2N1cyBvZiB0aGUgY29uZmVyZW5jZS5cbiAgICAgKiBDdXJyZW50bHkgaWYgd2UncmUgbm90IHRoZSBvd25lciBvZiB0aGUgY29uZmVyZW5jZSB3ZSBvYnRhaW4gdGhlIGZvY3VzXG4gICAgICogZnJvbSB0aGUgY29ubmVjdGlvbi5qaW5nbGUuc2Vzc2lvbnMuXG4gICAgICovXG4gICAgbXkuc2hvd0ZvY3VzSW5kaWNhdG9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChmb2N1cyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdmFyIGluZGljYXRvclNwYW4gPSAkKCcjbG9jYWxWaWRlb0NvbnRhaW5lciAuZm9jdXNpbmRpY2F0b3InKTtcblxuICAgICAgICAgICAgaWYgKGluZGljYXRvclNwYW4uY2hpbGRyZW4oKS5sZW5ndGggPT09IDApXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY3JlYXRlRm9jdXNJbmRpY2F0b3JFbGVtZW50KGluZGljYXRvclNwYW5bMF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKE9iamVjdC5rZXlzKGNvbm5lY3Rpb24uamluZ2xlLnNlc3Npb25zKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBJZiB3ZSdyZSBvbmx5IGEgcGFydGljaXBhbnQgdGhlIGZvY3VzIHdpbGwgYmUgdGhlIG9ubHkgc2Vzc2lvbiB3ZSBoYXZlLlxuICAgICAgICAgICAgdmFyIHNlc3Npb25cbiAgICAgICAgICAgICAgICA9IGNvbm5lY3Rpb24uamluZ2xlLnNlc3Npb25zXG4gICAgICAgICAgICAgICAgICAgIFtPYmplY3Qua2V5cyhjb25uZWN0aW9uLmppbmdsZS5zZXNzaW9ucylbMF1dO1xuICAgICAgICAgICAgdmFyIGZvY3VzSWRcbiAgICAgICAgICAgICAgICA9ICdwYXJ0aWNpcGFudF8nICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoc2Vzc2lvbi5wZWVyamlkKTtcblxuICAgICAgICAgICAgdmFyIGZvY3VzQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZm9jdXNJZCk7XG4gICAgICAgICAgICBpZiAoIWZvY3VzQ29udGFpbmVyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIk5vIGZvY3VzIGNvbnRhaW5lciFcIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGluZGljYXRvclNwYW4gPSAkKCcjJyArIGZvY3VzSWQgKyAnIC5mb2N1c2luZGljYXRvcicpO1xuXG4gICAgICAgICAgICBpZiAoIWluZGljYXRvclNwYW4gfHwgaW5kaWNhdG9yU3Bhbi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBpbmRpY2F0b3JTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgICAgIGluZGljYXRvclNwYW4uY2xhc3NOYW1lID0gJ2ZvY3VzaW5kaWNhdG9yJztcblxuICAgICAgICAgICAgICAgIGZvY3VzQ29udGFpbmVyLmFwcGVuZENoaWxkKGluZGljYXRvclNwYW4pO1xuXG4gICAgICAgICAgICAgICAgY3JlYXRlRm9jdXNJbmRpY2F0b3JFbGVtZW50KGluZGljYXRvclNwYW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3dzIHZpZGVvIG11dGVkIGluZGljYXRvciBvdmVyIHNtYWxsIHZpZGVvcy5cbiAgICAgKi9cbiAgICBteS5zaG93VmlkZW9JbmRpY2F0b3IgPSBmdW5jdGlvbih2aWRlb1NwYW5JZCwgaXNNdXRlZCkge1xuICAgICAgICB2YXIgdmlkZW9NdXRlZFNwYW4gPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5zcGFuLnZpZGVvTXV0ZWQnKTtcblxuICAgICAgICBpZiAoaXNNdXRlZCA9PT0gJ2ZhbHNlJykge1xuICAgICAgICAgICAgaWYgKHZpZGVvTXV0ZWRTcGFuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB2aWRlb011dGVkU3Bhbi5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBhdWRpb011dGVkU3BhbiA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPnNwYW4uYXVkaW9NdXRlZCcpO1xuXG4gICAgICAgICAgICB2aWRlb011dGVkU3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIHZpZGVvTXV0ZWRTcGFuLmNsYXNzTmFtZSA9ICd2aWRlb011dGVkJztcbiAgICAgICAgICAgIGlmIChhdWRpb011dGVkU3Bhbikge1xuICAgICAgICAgICAgICAgIHZpZGVvTXV0ZWRTcGFuLnJpZ2h0ID0gJzMwcHgnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJCgnIycgKyB2aWRlb1NwYW5JZClbMF0uYXBwZW5kQ2hpbGQodmlkZW9NdXRlZFNwYW4pO1xuXG4gICAgICAgICAgICB2YXIgbXV0ZWRJbmRpY2F0b3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpJyk7XG4gICAgICAgICAgICBtdXRlZEluZGljYXRvci5jbGFzc05hbWUgPSAnaWNvbi1jYW1lcmEtZGlzYWJsZWQnO1xuICAgICAgICAgICAgVXRpbC5zZXRUb29sdGlwKG11dGVkSW5kaWNhdG9yLFxuICAgICAgICAgICAgICAgICAgICBcIlBhcnRpY2lwYW50IGhhczxici8+c3RvcHBlZCB0aGUgY2FtZXJhLlwiLFxuICAgICAgICAgICAgICAgICAgICBcInRvcFwiKTtcbiAgICAgICAgICAgIHZpZGVvTXV0ZWRTcGFuLmFwcGVuZENoaWxkKG11dGVkSW5kaWNhdG9yKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTaG93cyBhdWRpbyBtdXRlZCBpbmRpY2F0b3Igb3ZlciBzbWFsbCB2aWRlb3MuXG4gICAgICovXG4gICAgbXkuc2hvd0F1ZGlvSW5kaWNhdG9yID0gZnVuY3Rpb24odmlkZW9TcGFuSWQsIGlzTXV0ZWQpIHtcbiAgICAgICAgdmFyIGF1ZGlvTXV0ZWRTcGFuID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+c3Bhbi5hdWRpb011dGVkJyk7XG5cbiAgICAgICAgaWYgKGlzTXV0ZWQgPT09ICdmYWxzZScpIHtcbiAgICAgICAgICAgIGlmIChhdWRpb011dGVkU3Bhbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgYXVkaW9NdXRlZFNwYW4ucG9wb3ZlcignaGlkZScpO1xuICAgICAgICAgICAgICAgIGF1ZGlvTXV0ZWRTcGFuLnJlbW92ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHZpZGVvTXV0ZWRTcGFuID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+c3Bhbi52aWRlb011dGVkJyk7XG5cbiAgICAgICAgICAgIGF1ZGlvTXV0ZWRTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgYXVkaW9NdXRlZFNwYW4uY2xhc3NOYW1lID0gJ2F1ZGlvTXV0ZWQnO1xuICAgICAgICAgICAgVXRpbC5zZXRUb29sdGlwKGF1ZGlvTXV0ZWRTcGFuLFxuICAgICAgICAgICAgICAgICAgICBcIlBhcnRpY2lwYW50IGlzIG11dGVkXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidG9wXCIpO1xuXG4gICAgICAgICAgICBpZiAodmlkZW9NdXRlZFNwYW4pIHtcbiAgICAgICAgICAgICAgICBhdWRpb011dGVkU3Bhbi5yaWdodCA9ICczMHB4JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQoJyMnICsgdmlkZW9TcGFuSWQpWzBdLmFwcGVuZENoaWxkKGF1ZGlvTXV0ZWRTcGFuKTtcblxuICAgICAgICAgICAgdmFyIG11dGVkSW5kaWNhdG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaScpO1xuICAgICAgICAgICAgbXV0ZWRJbmRpY2F0b3IuY2xhc3NOYW1lID0gJ2ljb24tbWljLWRpc2FibGVkJztcbiAgICAgICAgICAgIGF1ZGlvTXV0ZWRTcGFuLmFwcGVuZENoaWxkKG11dGVkSW5kaWNhdG9yKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXNpemVzIHRoZSBsYXJnZSB2aWRlbyBjb250YWluZXIuXG4gICAgICovXG4gICAgbXkucmVzaXplTGFyZ2VWaWRlb0NvbnRhaW5lciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZGVwLkNoYXQoKS5yZXNpemVDaGF0KCk7XG4gICAgICAgIHZhciBhdmFpbGFibGVIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIHZhciBhdmFpbGFibGVXaWR0aCA9IGRlcC5VSVV0aWwoKS5nZXRBdmFpbGFibGVWaWRlb1dpZHRoKCk7XG4gICAgICAgIGlmIChhdmFpbGFibGVXaWR0aCA8IDAgfHwgYXZhaWxhYmxlSGVpZ2h0IDwgMCkgcmV0dXJuO1xuXG4gICAgICAgICQoJyN2aWRlb3NwYWNlJykud2lkdGgoYXZhaWxhYmxlV2lkdGgpO1xuICAgICAgICAkKCcjdmlkZW9zcGFjZScpLmhlaWdodChhdmFpbGFibGVIZWlnaHQpO1xuICAgICAgICAkKCcjbGFyZ2VWaWRlb0NvbnRhaW5lcicpLndpZHRoKGF2YWlsYWJsZVdpZHRoKTtcbiAgICAgICAgJCgnI2xhcmdlVmlkZW9Db250YWluZXInKS5oZWlnaHQoYXZhaWxhYmxlSGVpZ2h0KTtcblxuICAgICAgICBWaWRlb0xheW91dC5yZXNpemVUaHVtYm5haWxzKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlc2l6ZXMgdGh1bWJuYWlscy5cbiAgICAgKi9cbiAgICBteS5yZXNpemVUaHVtYm5haWxzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2aWRlb1NwYWNlV2lkdGggPSAkKCcjcmVtb3RlVmlkZW9zJykud2lkdGgoKTtcblxuICAgICAgICB2YXIgdGh1bWJuYWlsU2l6ZSA9IFZpZGVvTGF5b3V0LmNhbGN1bGF0ZVRodW1ibmFpbFNpemUodmlkZW9TcGFjZVdpZHRoKTtcbiAgICAgICAgdmFyIHdpZHRoID0gdGh1bWJuYWlsU2l6ZVswXTtcbiAgICAgICAgdmFyIGhlaWdodCA9IHRodW1ibmFpbFNpemVbMV07XG5cbiAgICAgICAgLy8gc2l6ZSB2aWRlb3Mgc28gdGhhdCB3aGlsZSBrZWVwaW5nIEFSIGFuZCBtYXggaGVpZ2h0LCB3ZSBoYXZlIGFcbiAgICAgICAgLy8gbmljZSBmaXRcbiAgICAgICAgJCgnI3JlbW90ZVZpZGVvcycpLmhlaWdodChoZWlnaHQpO1xuICAgICAgICAkKCcjcmVtb3RlVmlkZW9zPnNwYW4nKS53aWR0aCh3aWR0aCk7XG4gICAgICAgICQoJyNyZW1vdGVWaWRlb3M+c3BhbicpLmhlaWdodChoZWlnaHQpO1xuXG4gICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoXCJyZW1vdGV2aWRlby5yZXNpemVkXCIsIFt3aWR0aCwgaGVpZ2h0XSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEVuYWJsZXMgdGhlIGRvbWluYW50IHNwZWFrZXIgVUkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVzb3VyY2VKaWQgdGhlIGppZCBpbmRpY2F0aW5nIHRoZSB2aWRlbyBlbGVtZW50IHRvXG4gICAgICogYWN0aXZhdGUvZGVhY3RpdmF0ZVxuICAgICAqIEBwYXJhbSBpc0VuYWJsZSBpbmRpY2F0ZXMgaWYgdGhlIGRvbWluYW50IHNwZWFrZXIgc2hvdWxkIGJlIGVuYWJsZWQgb3JcbiAgICAgKiBkaXNhYmxlZFxuICAgICAqL1xuICAgIG15LmVuYWJsZURvbWluYW50U3BlYWtlciA9IGZ1bmN0aW9uKHJlc291cmNlSmlkLCBpc0VuYWJsZSkge1xuICAgICAgICB2YXIgZGlzcGxheU5hbWUgPSByZXNvdXJjZUppZDtcbiAgICAgICAgdmFyIG5hbWVTcGFuID0gJCgnI3BhcnRpY2lwYW50XycgKyByZXNvdXJjZUppZCArICc+c3Bhbi5kaXNwbGF5bmFtZScpO1xuICAgICAgICBpZiAobmFtZVNwYW4ubGVuZ3RoID4gMClcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lID0gbmFtZVNwYW4udGV4dCgpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVUkgZW5hYmxlIGRvbWluYW50IHNwZWFrZXJcIixcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheU5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHJlc291cmNlSmlkLFxuICAgICAgICAgICAgICAgICAgICBpc0VuYWJsZSk7XG5cbiAgICAgICAgdmFyIHZpZGVvU3BhbklkID0gbnVsbDtcbiAgICAgICAgdmFyIHZpZGVvQ29udGFpbmVySWQgPSBudWxsO1xuICAgICAgICBpZiAocmVzb3VyY2VKaWRcbiAgICAgICAgICAgICAgICA9PT0gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZCkpIHtcbiAgICAgICAgICAgIHZpZGVvU3BhbklkID0gJ2xvY2FsVmlkZW9XcmFwcGVyJztcbiAgICAgICAgICAgIHZpZGVvQ29udGFpbmVySWQgPSAnbG9jYWxWaWRlb0NvbnRhaW5lcic7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdwYXJ0aWNpcGFudF8nICsgcmVzb3VyY2VKaWQ7XG4gICAgICAgICAgICB2aWRlb0NvbnRhaW5lcklkID0gdmlkZW9TcGFuSWQ7XG4gICAgICAgIH1cblxuICAgICAgICB2aWRlb1NwYW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh2aWRlb0NvbnRhaW5lcklkKTtcblxuICAgICAgICBpZiAoIXZpZGVvU3Bhbikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIk5vIHZpZGVvIGVsZW1lbnQgZm9yIGppZFwiLCByZXNvdXJjZUppZCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdmlkZW8gPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz52aWRlbycpO1xuXG4gICAgICAgIGlmICh2aWRlbyAmJiB2aWRlby5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAoaXNFbmFibGUpIHtcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zaG93RGlzcGxheU5hbWUodmlkZW9Db250YWluZXJJZCwgdHJ1ZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIXZpZGVvU3Bhbi5jbGFzc0xpc3QuY29udGFpbnMoXCJkb21pbmFudHNwZWFrZXJcIikpXG4gICAgICAgICAgICAgICAgICAgIHZpZGVvU3Bhbi5jbGFzc0xpc3QuYWRkKFwiZG9taW5hbnRzcGVha2VyXCIpO1xuXG4gICAgICAgICAgICAgICAgdmlkZW8uY3NzKHt2aXNpYmlsaXR5OiAnaGlkZGVuJ30pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0Rpc3BsYXlOYW1lKHZpZGVvQ29udGFpbmVySWQsIGZhbHNlKTtcblxuICAgICAgICAgICAgICAgIGlmICh2aWRlb1NwYW4uY2xhc3NMaXN0LmNvbnRhaW5zKFwiZG9taW5hbnRzcGVha2VyXCIpKVxuICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYW4uY2xhc3NMaXN0LnJlbW92ZShcImRvbWluYW50c3BlYWtlclwiKTtcblxuICAgICAgICAgICAgICAgIHZpZGVvLmNzcyh7dmlzaWJpbGl0eTogJ3Zpc2libGUnfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgc2VsZWN0b3Igb2YgdmlkZW8gdGh1bWJuYWlsIGNvbnRhaW5lciBmb3IgdGhlIHVzZXIgaWRlbnRpZmllZCBieVxuICAgICAqIGdpdmVuIDx0dD51c2VySmlkPC90dD5cbiAgICAgKiBAcGFyYW0gdXNlckppZCB1c2VyJ3MgSmlkIGZvciB3aG9tIHdlIHdhbnQgdG8gZ2V0IHRoZSB2aWRlbyBjb250YWluZXIuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UGFydGljaXBhbnRDb250YWluZXIodXNlckppZClcbiAgICB7XG4gICAgICAgIGlmICghdXNlckppZClcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuXG4gICAgICAgIGlmICh1c2VySmlkID09PSBjb25uZWN0aW9uLmVtdWMubXlyb29tamlkKVxuICAgICAgICAgICAgcmV0dXJuICQoXCIjbG9jYWxWaWRlb0NvbnRhaW5lclwiKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuICQoXCIjcGFydGljaXBhbnRfXCIgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZCh1c2VySmlkKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgc2l6ZSBhbmQgcG9zaXRpb24gb2YgdGhlIGdpdmVuIHZpZGVvIGVsZW1lbnQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmlkZW8gdGhlIHZpZGVvIGVsZW1lbnQgdG8gcG9zaXRpb25cbiAgICAgKiBAcGFyYW0gd2lkdGggdGhlIGRlc2lyZWQgdmlkZW8gd2lkdGhcbiAgICAgKiBAcGFyYW0gaGVpZ2h0IHRoZSBkZXNpcmVkIHZpZGVvIGhlaWdodFxuICAgICAqIEBwYXJhbSBob3Jpem9udGFsSW5kZW50IHRoZSBsZWZ0IGFuZCByaWdodCBpbmRlbnRcbiAgICAgKiBAcGFyYW0gdmVydGljYWxJbmRlbnQgdGhlIHRvcCBhbmQgYm90dG9tIGluZGVudFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHBvc2l0aW9uVmlkZW8odmlkZW8sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvcml6b250YWxJbmRlbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJ0aWNhbEluZGVudCkge1xuICAgICAgICB2aWRlby53aWR0aCh3aWR0aCk7XG4gICAgICAgIHZpZGVvLmhlaWdodChoZWlnaHQpO1xuICAgICAgICB2aWRlby5jc3MoeyAgdG9wOiB2ZXJ0aWNhbEluZGVudCArICdweCcsXG4gICAgICAgICAgICAgICAgICAgICBib3R0b206IHZlcnRpY2FsSW5kZW50ICsgJ3B4JyxcbiAgICAgICAgICAgICAgICAgICAgIGxlZnQ6IGhvcml6b250YWxJbmRlbnQgKyAncHgnLFxuICAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IGhvcml6b250YWxJbmRlbnQgKyAncHgnfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyB0aGUgdGh1bWJuYWlsIHNpemUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmlkZW9TcGFjZVdpZHRoIHRoZSB3aWR0aCBvZiB0aGUgdmlkZW8gc3BhY2VcbiAgICAgKi9cbiAgICBteS5jYWxjdWxhdGVUaHVtYm5haWxTaXplID0gZnVuY3Rpb24gKHZpZGVvU3BhY2VXaWR0aCkge1xuICAgICAgICAvLyBDYWxjdWxhdGUgdGhlIGF2YWlsYWJsZSBoZWlnaHQsIHdoaWNoIGlzIHRoZSBpbm5lciB3aW5kb3cgaGVpZ2h0IG1pbnVzXG4gICAgICAgLy8gMzlweCBmb3IgdGhlIGhlYWRlciBtaW51cyAycHggZm9yIHRoZSBkZWxpbWl0ZXIgbGluZXMgb24gdGhlIHRvcCBhbmRcbiAgICAgICAvLyBib3R0b20gb2YgdGhlIGxhcmdlIHZpZGVvLCBtaW51cyB0aGUgMzZweCBzcGFjZSBpbnNpZGUgdGhlIHJlbW90ZVZpZGVvc1xuICAgICAgIC8vIGNvbnRhaW5lciB1c2VkIGZvciBoaWdobGlnaHRpbmcgc2hhZG93LlxuICAgICAgIHZhciBhdmFpbGFibGVIZWlnaHQgPSAxMDA7XG5cbiAgICAgICB2YXIgbnVtdmlkcyA9IDA7XG4gICAgICAgaWYgKGxhc3ROQ291bnQgJiYgbGFzdE5Db3VudCA+IDApXG4gICAgICAgICAgIG51bXZpZHMgPSBsYXN0TkNvdW50ICsgMTtcbiAgICAgICBlbHNlXG4gICAgICAgICAgIG51bXZpZHMgPSAkKCcjcmVtb3RlVmlkZW9zPnNwYW46dmlzaWJsZScpLmxlbmd0aDtcblxuICAgICAgIC8vIFJlbW92ZSB0aGUgM3B4IGJvcmRlcnMgYXJyb3VuZCB2aWRlb3MgYW5kIGJvcmRlciBhcm91bmQgdGhlIHJlbW90ZVxuICAgICAgIC8vIHZpZGVvcyBhcmVhXG4gICAgICAgdmFyIGF2YWlsYWJsZVdpbldpZHRoID0gdmlkZW9TcGFjZVdpZHRoIC0gMiAqIDMgKiBudW12aWRzIC0gNzA7XG5cbiAgICAgICB2YXIgYXZhaWxhYmxlV2lkdGggPSBhdmFpbGFibGVXaW5XaWR0aCAvIG51bXZpZHM7XG4gICAgICAgdmFyIGFzcGVjdFJhdGlvID0gMTYuMCAvIDkuMDtcbiAgICAgICB2YXIgbWF4SGVpZ2h0ID0gTWF0aC5taW4oMTYwLCBhdmFpbGFibGVIZWlnaHQpO1xuICAgICAgIGF2YWlsYWJsZUhlaWdodCA9IE1hdGgubWluKG1heEhlaWdodCwgYXZhaWxhYmxlV2lkdGggLyBhc3BlY3RSYXRpbyk7XG4gICAgICAgaWYgKGF2YWlsYWJsZUhlaWdodCA8IGF2YWlsYWJsZVdpZHRoIC8gYXNwZWN0UmF0aW8pIHtcbiAgICAgICAgICAgYXZhaWxhYmxlV2lkdGggPSBNYXRoLmZsb29yKGF2YWlsYWJsZUhlaWdodCAqIGFzcGVjdFJhdGlvKTtcbiAgICAgICB9XG5cbiAgICAgICByZXR1cm4gW2F2YWlsYWJsZVdpZHRoLCBhdmFpbGFibGVIZWlnaHRdO1xuICAgfTtcblxuICAgLyoqXG4gICAgKiBSZXR1cm5zIGFuIGFycmF5IG9mIHRoZSB2aWRlbyBkaW1lbnNpb25zLCBzbyB0aGF0IGl0IGtlZXBzIGl0J3MgYXNwZWN0XG4gICAgKiByYXRpbyBhbmQgZml0cyBhdmFpbGFibGUgYXJlYSB3aXRoIGl0J3MgbGFyZ2VyIGRpbWVuc2lvbi4gVGhpcyBtZXRob2RcbiAgICAqIGVuc3VyZXMgdGhhdCB3aG9sZSB2aWRlbyB3aWxsIGJlIHZpc2libGUgYW5kIGNhbiBsZWF2ZSBlbXB0eSBhcmVhcy5cbiAgICAqXG4gICAgKiBAcmV0dXJuIGFuIGFycmF5IHdpdGggMiBlbGVtZW50cywgdGhlIHZpZGVvIHdpZHRoIGFuZCB0aGUgdmlkZW8gaGVpZ2h0XG4gICAgKi9cbiAgIGZ1bmN0aW9uIGdldERlc2t0b3BWaWRlb1NpemUodmlkZW9XaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZUhlaWdodCkge1xuICAgICAgIGlmICghdmlkZW9XaWR0aClcbiAgICAgICAgICAgdmlkZW9XaWR0aCA9IGN1cnJlbnRWaWRlb1dpZHRoO1xuICAgICAgIGlmICghdmlkZW9IZWlnaHQpXG4gICAgICAgICAgIHZpZGVvSGVpZ2h0ID0gY3VycmVudFZpZGVvSGVpZ2h0O1xuXG4gICAgICAgdmFyIGFzcGVjdFJhdGlvID0gdmlkZW9XaWR0aCAvIHZpZGVvSGVpZ2h0O1xuXG4gICAgICAgdmFyIGF2YWlsYWJsZVdpZHRoID0gTWF0aC5tYXgodmlkZW9XaWR0aCwgdmlkZW9TcGFjZVdpZHRoKTtcbiAgICAgICB2YXIgYXZhaWxhYmxlSGVpZ2h0ID0gTWF0aC5tYXgodmlkZW9IZWlnaHQsIHZpZGVvU3BhY2VIZWlnaHQpO1xuXG4gICAgICAgdmlkZW9TcGFjZUhlaWdodCAtPSAkKCcjcmVtb3RlVmlkZW9zJykub3V0ZXJIZWlnaHQoKTtcblxuICAgICAgIGlmIChhdmFpbGFibGVXaWR0aCAvIGFzcGVjdFJhdGlvID49IHZpZGVvU3BhY2VIZWlnaHQpXG4gICAgICAge1xuICAgICAgICAgICBhdmFpbGFibGVIZWlnaHQgPSB2aWRlb1NwYWNlSGVpZ2h0O1xuICAgICAgICAgICBhdmFpbGFibGVXaWR0aCA9IGF2YWlsYWJsZUhlaWdodCAqIGFzcGVjdFJhdGlvO1xuICAgICAgIH1cblxuICAgICAgIGlmIChhdmFpbGFibGVIZWlnaHQgKiBhc3BlY3RSYXRpbyA+PSB2aWRlb1NwYWNlV2lkdGgpXG4gICAgICAge1xuICAgICAgICAgICBhdmFpbGFibGVXaWR0aCA9IHZpZGVvU3BhY2VXaWR0aDtcbiAgICAgICAgICAgYXZhaWxhYmxlSGVpZ2h0ID0gYXZhaWxhYmxlV2lkdGggLyBhc3BlY3RSYXRpbztcbiAgICAgICB9XG5cbiAgICAgICByZXR1cm4gW2F2YWlsYWJsZVdpZHRoLCBhdmFpbGFibGVIZWlnaHRdO1xuICAgfVxuXG5cbi8qKlxuICAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YgdGhlIHZpZGVvIGRpbWVuc2lvbnMsIHNvIHRoYXQgaXQgY292ZXJzIHRoZSBzY3JlZW4uXG4gICAgICogSXQgbGVhdmVzIG5vIGVtcHR5IGFyZWFzLCBidXQgc29tZSBwYXJ0cyBvZiB0aGUgdmlkZW8gbWlnaHQgbm90IGJlIHZpc2libGUuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIGFuIGFycmF5IHdpdGggMiBlbGVtZW50cywgdGhlIHZpZGVvIHdpZHRoIGFuZCB0aGUgdmlkZW8gaGVpZ2h0XG4gICAgICovXG4gICAgbXkuZ2V0Q2FtZXJhVmlkZW9TaXplID0gZnVuY3Rpb24odmlkZW9XaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZUhlaWdodCkge1xuICAgICAgICBpZiAoIXZpZGVvV2lkdGgpXG4gICAgICAgICAgICB2aWRlb1dpZHRoID0gY3VycmVudFZpZGVvV2lkdGg7XG4gICAgICAgIGlmICghdmlkZW9IZWlnaHQpXG4gICAgICAgICAgICB2aWRlb0hlaWdodCA9IGN1cnJlbnRWaWRlb0hlaWdodDtcblxuICAgICAgICB2YXIgYXNwZWN0UmF0aW8gPSB2aWRlb1dpZHRoIC8gdmlkZW9IZWlnaHQ7XG5cbiAgICAgICAgdmFyIGF2YWlsYWJsZVdpZHRoID0gTWF0aC5tYXgodmlkZW9XaWR0aCwgdmlkZW9TcGFjZVdpZHRoKTtcbiAgICAgICAgdmFyIGF2YWlsYWJsZUhlaWdodCA9IE1hdGgubWF4KHZpZGVvSGVpZ2h0LCB2aWRlb1NwYWNlSGVpZ2h0KTtcblxuICAgICAgICBpZiAoYXZhaWxhYmxlV2lkdGggLyBhc3BlY3RSYXRpbyA8IHZpZGVvU3BhY2VIZWlnaHQpIHtcbiAgICAgICAgICAgIGF2YWlsYWJsZUhlaWdodCA9IHZpZGVvU3BhY2VIZWlnaHQ7XG4gICAgICAgICAgICBhdmFpbGFibGVXaWR0aCA9IGF2YWlsYWJsZUhlaWdodCAqIGFzcGVjdFJhdGlvO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGF2YWlsYWJsZUhlaWdodCAqIGFzcGVjdFJhdGlvIDwgdmlkZW9TcGFjZVdpZHRoKSB7XG4gICAgICAgICAgICBhdmFpbGFibGVXaWR0aCA9IHZpZGVvU3BhY2VXaWR0aDtcbiAgICAgICAgICAgIGF2YWlsYWJsZUhlaWdodCA9IGF2YWlsYWJsZVdpZHRoIC8gYXNwZWN0UmF0aW87XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gW2F2YWlsYWJsZVdpZHRoLCBhdmFpbGFibGVIZWlnaHRdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YgdGhlIHZpZGVvIGhvcml6b250YWwgYW5kIHZlcnRpY2FsIGluZGVudHMsXG4gICAgICogc28gdGhhdCBpZiBmaXRzIGl0cyBwYXJlbnQuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIGFuIGFycmF5IHdpdGggMiBlbGVtZW50cywgdGhlIGhvcml6b250YWwgaW5kZW50IGFuZCB0aGUgdmVydGljYWxcbiAgICAgKiBpbmRlbnRcbiAgICAgKi9cbiAgICBteS5nZXRDYW1lcmFWaWRlb1Bvc2l0aW9uID0gZnVuY3Rpb24odmlkZW9XaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZUhlaWdodCkge1xuICAgICAgICAvLyBQYXJlbnQgaGVpZ2h0IGlzbid0IGNvbXBsZXRlbHkgY2FsY3VsYXRlZCB3aGVuIHdlIHBvc2l0aW9uIHRoZSB2aWRlbyBpblxuICAgICAgICAvLyBmdWxsIHNjcmVlbiBtb2RlIGFuZCB0aGlzIGlzIHdoeSB3ZSB1c2UgdGhlIHNjcmVlbiBoZWlnaHQgaW4gdGhpcyBjYXNlLlxuICAgICAgICAvLyBOZWVkIHRvIHRoaW5rIGl0IGZ1cnRoZXIgYXQgc29tZSBwb2ludCBhbmQgaW1wbGVtZW50IGl0IHByb3Blcmx5LlxuICAgICAgICB2YXIgaXNGdWxsU2NyZWVuID0gZG9jdW1lbnQuZnVsbFNjcmVlbiB8fFxuICAgICAgICAgICAgZG9jdW1lbnQubW96RnVsbFNjcmVlbiB8fFxuICAgICAgICAgICAgZG9jdW1lbnQud2Via2l0SXNGdWxsU2NyZWVuO1xuICAgICAgICBpZiAoaXNGdWxsU2NyZWVuKVxuICAgICAgICAgICAgdmlkZW9TcGFjZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcblxuICAgICAgICB2YXIgaG9yaXpvbnRhbEluZGVudCA9ICh2aWRlb1NwYWNlV2lkdGggLSB2aWRlb1dpZHRoKSAvIDI7XG4gICAgICAgIHZhciB2ZXJ0aWNhbEluZGVudCA9ICh2aWRlb1NwYWNlSGVpZ2h0IC0gdmlkZW9IZWlnaHQpIC8gMjtcblxuICAgICAgICByZXR1cm4gW2hvcml6b250YWxJbmRlbnQsIHZlcnRpY2FsSW5kZW50XTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIHRoZSBlZGl0IGRpc3BsYXkgbmFtZSBidXR0b24uXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB0aGUgZWRpdCBidXR0b25cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVFZGl0RGlzcGxheU5hbWVCdXR0b24oKSB7XG4gICAgICAgIHZhciBlZGl0QnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICBlZGl0QnV0dG9uLmNsYXNzTmFtZSA9ICdkaXNwbGF5bmFtZSc7XG4gICAgICAgIFV0aWwuc2V0VG9vbHRpcChlZGl0QnV0dG9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0NsaWNrIHRvIGVkaXQgeW91cjxici8+ZGlzcGxheSBuYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidG9wXCIpO1xuICAgICAgICBlZGl0QnV0dG9uLmlubmVySFRNTCA9ICc8aSBjbGFzcz1cImZhIGZhLXBlbmNpbFwiPjwvaT4nO1xuXG4gICAgICAgIHJldHVybiBlZGl0QnV0dG9uO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgdGhlIGVsZW1lbnQgaW5kaWNhdGluZyB0aGUgZm9jdXMgb2YgdGhlIGNvbmZlcmVuY2UuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGFyZW50RWxlbWVudCB0aGUgcGFyZW50IGVsZW1lbnQgd2hlcmUgdGhlIGZvY3VzIGluZGljYXRvciB3aWxsXG4gICAgICogYmUgYWRkZWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVGb2N1c0luZGljYXRvckVsZW1lbnQocGFyZW50RWxlbWVudCkge1xuICAgICAgICB2YXIgZm9jdXNJbmRpY2F0b3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpJyk7XG4gICAgICAgIGZvY3VzSW5kaWNhdG9yLmNsYXNzTmFtZSA9ICdmYSBmYS1zdGFyJztcbiAgICAgICAgcGFyZW50RWxlbWVudC5hcHBlbmRDaGlsZChmb2N1c0luZGljYXRvcik7XG5cbiAgICAgICAgVXRpbC5zZXRUb29sdGlwKHBhcmVudEVsZW1lbnQsXG4gICAgICAgICAgICAgICAgXCJUaGUgb3duZXIgb2Y8YnIvPnRoaXMgY29uZmVyZW5jZVwiLFxuICAgICAgICAgICAgICAgIFwidG9wXCIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIHJlbW90ZSB2aWRlbyBtZW51LlxuICAgICAqXG4gICAgICogQHBhcmFtIGppZCB0aGUgamlkIGluZGljYXRpbmcgdGhlIHZpZGVvIGZvciB3aGljaCB3ZSdyZSBhZGRpbmcgYSBtZW51LlxuICAgICAqIEBwYXJhbSBpc011dGVkIGluZGljYXRlcyB0aGUgY3VycmVudCBtdXRlIHN0YXRlXG4gICAgICovXG4gICAgbXkudXBkYXRlUmVtb3RlVmlkZW9NZW51ID0gZnVuY3Rpb24oamlkLCBpc011dGVkKSB7XG4gICAgICAgIHZhciBtdXRlTWVudUl0ZW1cbiAgICAgICAgICAgID0gJCgnI3JlbW90ZV9wb3B1cG1lbnVfJ1xuICAgICAgICAgICAgICAgICAgICArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGppZClcbiAgICAgICAgICAgICAgICAgICAgKyAnPmxpPmEubXV0ZWxpbmsnKTtcblxuICAgICAgICB2YXIgbXV0ZWRJbmRpY2F0b3IgPSBcIjxpIGNsYXNzPSdpY29uLW1pYy1kaXNhYmxlZCc+PC9pPlwiO1xuXG4gICAgICAgIGlmIChtdXRlTWVudUl0ZW0ubGVuZ3RoKSB7XG4gICAgICAgICAgICB2YXIgbXV0ZUxpbmsgPSBtdXRlTWVudUl0ZW0uZ2V0KDApO1xuXG4gICAgICAgICAgICBpZiAoaXNNdXRlZCA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgICAgICAgbXV0ZUxpbmsuaW5uZXJIVE1MID0gbXV0ZWRJbmRpY2F0b3IgKyAnIE11dGVkJztcbiAgICAgICAgICAgICAgICBtdXRlTGluay5jbGFzc05hbWUgPSAnbXV0ZWxpbmsgZGlzYWJsZWQnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbXV0ZUxpbmsuaW5uZXJIVE1MID0gbXV0ZWRJbmRpY2F0b3IgKyAnIE11dGUnO1xuICAgICAgICAgICAgICAgIG11dGVMaW5rLmNsYXNzTmFtZSA9ICdtdXRlbGluayc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgY3VycmVudCBkb21pbmFudCBzcGVha2VyIHJlc291cmNlIGppZC5cbiAgICAgKi9cbiAgICBteS5nZXREb21pbmFudFNwZWFrZXJSZXNvdXJjZUppZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGN1cnJlbnREb21pbmFudFNwZWFrZXI7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGNvcnJlc3BvbmRpbmcgcmVzb3VyY2UgamlkIHRvIHRoZSBnaXZlbiBwZWVyIGNvbnRhaW5lclxuICAgICAqIERPTSBlbGVtZW50LlxuICAgICAqXG4gICAgICogQHJldHVybiB0aGUgY29ycmVzcG9uZGluZyByZXNvdXJjZSBqaWQgdG8gdGhlIGdpdmVuIHBlZXIgY29udGFpbmVyXG4gICAgICogRE9NIGVsZW1lbnRcbiAgICAgKi9cbiAgICBteS5nZXRQZWVyQ29udGFpbmVyUmVzb3VyY2VKaWQgPSBmdW5jdGlvbiAoY29udGFpbmVyRWxlbWVudCkge1xuICAgICAgICB2YXIgaSA9IGNvbnRhaW5lckVsZW1lbnQuaWQuaW5kZXhPZigncGFydGljaXBhbnRfJyk7XG5cbiAgICAgICAgaWYgKGkgPj0gMClcbiAgICAgICAgICAgIHJldHVybiBjb250YWluZXJFbGVtZW50LmlkLnN1YnN0cmluZyhpICsgMTIpOyBcbiAgICB9O1xuXG4gICAgbXkub25SZW1vdGVTdHJlYW1BZGRlZCA9IGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgdmFyIGNvbnRhaW5lcjtcbiAgICAgICAgdmFyIHJlbW90ZXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVtb3RlVmlkZW9zJyk7XG5cbiAgICAgICAgaWYgKHN0cmVhbS5wZWVyamlkKSB7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5lbnN1cmVQZWVyQ29udGFpbmVyRXhpc3RzKHN0cmVhbS5wZWVyamlkKTtcblxuICAgICAgICAgICAgY29udGFpbmVyICA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFxuICAgICAgICAgICAgICAgICAgICAncGFydGljaXBhbnRfJyArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHN0cmVhbS5wZWVyamlkKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoc3RyZWFtLnN0cmVhbS5pZCAhPT0gJ21peGVkbXNsYWJlbCcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCAgJ2NhbiBub3QgYXNzb2NpYXRlIHN0cmVhbScsXG4gICAgICAgICAgICAgICAgICAgIHN0cmVhbS5zdHJlYW0uaWQsXG4gICAgICAgICAgICAgICAgICAgICd3aXRoIGEgcGFydGljaXBhbnQnKTtcbiAgICAgICAgICAgICAgICAvLyBXZSBkb24ndCB3YW50IHRvIGFkZCBpdCBoZXJlIHNpbmNlIGl0IHdpbGwgY2F1c2UgdHJvdWJsZXNcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBGSVhNRTogZm9yIHRoZSBtaXhlZCBtcyB3ZSBkb250IG5lZWQgYSB2aWRlbyAtLSBjdXJyZW50bHlcbiAgICAgICAgICAgIGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5pZCA9ICdtaXhlZHN0cmVhbSc7XG4gICAgICAgICAgICBjb250YWluZXIuY2xhc3NOYW1lID0gJ3ZpZGVvY29udGFpbmVyJztcbiAgICAgICAgICAgIHJlbW90ZXMuYXBwZW5kQ2hpbGQoY29udGFpbmVyKTtcbiAgICAgICAgICAgIFV0aWwucGxheVNvdW5kTm90aWZpY2F0aW9uKCd1c2VySm9pbmVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29udGFpbmVyKSB7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5hZGRSZW1vdGVTdHJlYW1FbGVtZW50KCBjb250YWluZXIsXG4gICAgICAgICAgICAgICAgc3RyZWFtLnNpZCxcbiAgICAgICAgICAgICAgICBzdHJlYW0uc3RyZWFtLFxuICAgICAgICAgICAgICAgIHN0cmVhbS5wZWVyamlkLFxuICAgICAgICAgICAgICAgIHN0cmVhbS5zc3JjKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZHMgdGhlIHJlbW90ZSB2aWRlbyBtZW51IGVsZW1lbnQgZm9yIHRoZSBnaXZlbiA8dHQ+amlkPC90dD4gaW4gdGhlXG4gICAgICogZ2l2ZW4gPHR0PnBhcmVudEVsZW1lbnQ8L3R0Pi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBqaWQgdGhlIGppZCBpbmRpY2F0aW5nIHRoZSB2aWRlbyBmb3Igd2hpY2ggd2UncmUgYWRkaW5nIGEgbWVudS5cbiAgICAgKiBAcGFyYW0gcGFyZW50RWxlbWVudCB0aGUgcGFyZW50IGVsZW1lbnQgd2hlcmUgdGhpcyBtZW51IHdpbGwgYmUgYWRkZWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBhZGRSZW1vdGVWaWRlb01lbnUoamlkLCBwYXJlbnRFbGVtZW50KSB7XG4gICAgICAgIHZhciBzcGFuRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgc3BhbkVsZW1lbnQuY2xhc3NOYW1lID0gJ3JlbW90ZXZpZGVvbWVudSc7XG5cbiAgICAgICAgcGFyZW50RWxlbWVudC5hcHBlbmRDaGlsZChzcGFuRWxlbWVudCk7XG5cbiAgICAgICAgdmFyIG1lbnVFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaScpO1xuICAgICAgICBtZW51RWxlbWVudC5jbGFzc05hbWUgPSAnZmEgZmEtYW5nbGUtZG93bic7XG4gICAgICAgIG1lbnVFbGVtZW50LnRpdGxlID0gJ1JlbW90ZSB1c2VyIGNvbnRyb2xzJztcbiAgICAgICAgc3BhbkVsZW1lbnQuYXBwZW5kQ2hpbGQobWVudUVsZW1lbnQpO1xuXG4vLyAgICAgICAgPHVsIGNsYXNzPVwicG9wdXBtZW51XCI+XG4vLyAgICAgICAgPGxpPjxhIGhyZWY9XCIjXCI+TXV0ZTwvYT48L2xpPlxuLy8gICAgICAgIDxsaT48YSBocmVmPVwiI1wiPkVqZWN0PC9hPjwvbGk+XG4vLyAgICAgICAgPC91bD5cbiAgICAgICAgdmFyIHBvcHVwbWVudUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd1bCcpO1xuICAgICAgICBwb3B1cG1lbnVFbGVtZW50LmNsYXNzTmFtZSA9ICdwb3B1cG1lbnUnO1xuICAgICAgICBwb3B1cG1lbnVFbGVtZW50LmlkXG4gICAgICAgICAgICA9ICdyZW1vdGVfcG9wdXBtZW51XycgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpO1xuICAgICAgICBzcGFuRWxlbWVudC5hcHBlbmRDaGlsZChwb3B1cG1lbnVFbGVtZW50KTtcblxuICAgICAgICB2YXIgbXV0ZU1lbnVJdGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcbiAgICAgICAgdmFyIG11dGVMaW5rSXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcblxuICAgICAgICB2YXIgbXV0ZWRJbmRpY2F0b3IgPSBcIjxpIGNsYXNzPSdpY29uLW1pYy1kaXNhYmxlZCc+PC9pPlwiO1xuXG4gICAgICAgIGlmICghbXV0ZWRBdWRpb3NbamlkXSkge1xuICAgICAgICAgICAgbXV0ZUxpbmtJdGVtLmlubmVySFRNTCA9IG11dGVkSW5kaWNhdG9yICsgJ011dGUnO1xuICAgICAgICAgICAgbXV0ZUxpbmtJdGVtLmNsYXNzTmFtZSA9ICdtdXRlbGluayc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBtdXRlTGlua0l0ZW0uaW5uZXJIVE1MID0gbXV0ZWRJbmRpY2F0b3IgKyAnIE11dGVkJztcbiAgICAgICAgICAgIG11dGVMaW5rSXRlbS5jbGFzc05hbWUgPSAnbXV0ZWxpbmsgZGlzYWJsZWQnO1xuICAgICAgICB9XG5cbiAgICAgICAgbXV0ZUxpbmtJdGVtLm9uY2xpY2sgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgaWYgKCQodGhpcykuYXR0cignZGlzYWJsZWQnKSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGlzTXV0ZSA9ICFtdXRlZEF1ZGlvc1tqaWRdO1xuICAgICAgICAgICAgY29ubmVjdGlvbi5tb2RlcmF0ZS5zZXRNdXRlKGppZCwgaXNNdXRlKTtcbiAgICAgICAgICAgIHBvcHVwbWVudUVsZW1lbnQuc2V0QXR0cmlidXRlKCdzdHlsZScsICdkaXNwbGF5Om5vbmU7Jyk7XG5cbiAgICAgICAgICAgIGlmIChpc011dGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlubmVySFRNTCA9IG11dGVkSW5kaWNhdG9yICsgJyBNdXRlZCc7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGFzc05hbWUgPSAnbXV0ZWxpbmsgZGlzYWJsZWQnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbm5lckhUTUwgPSBtdXRlZEluZGljYXRvciArICcgTXV0ZSc7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGFzc05hbWUgPSAnbXV0ZWxpbmsnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIG11dGVNZW51SXRlbS5hcHBlbmRDaGlsZChtdXRlTGlua0l0ZW0pO1xuICAgICAgICBwb3B1cG1lbnVFbGVtZW50LmFwcGVuZENoaWxkKG11dGVNZW51SXRlbSk7XG5cbiAgICAgICAgdmFyIGVqZWN0SW5kaWNhdG9yID0gXCI8aSBjbGFzcz0nZmEgZmEtZWplY3QnPjwvaT5cIjtcblxuICAgICAgICB2YXIgZWplY3RNZW51SXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gICAgICAgIHZhciBlamVjdExpbmtJdGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICBlamVjdExpbmtJdGVtLmlubmVySFRNTCA9IGVqZWN0SW5kaWNhdG9yICsgJyBLaWNrIG91dCc7XG4gICAgICAgIGVqZWN0TGlua0l0ZW0ub25jbGljayA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBjb25uZWN0aW9uLm1vZGVyYXRlLmVqZWN0KGppZCk7XG4gICAgICAgICAgICBwb3B1cG1lbnVFbGVtZW50LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnZGlzcGxheTpub25lOycpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGVqZWN0TWVudUl0ZW0uYXBwZW5kQ2hpbGQoZWplY3RMaW5rSXRlbSk7XG4gICAgICAgIHBvcHVwbWVudUVsZW1lbnQuYXBwZW5kQ2hpbGQoZWplY3RNZW51SXRlbSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogT24gYXVkaW8gbXV0ZWQgZXZlbnQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgnYXVkaW9tdXRlZC5tdWMnLCBmdW5jdGlvbiAoZXZlbnQsIGppZCwgaXNNdXRlZCkge1xuICAgICAgICB2YXIgdmlkZW9TcGFuSWQgPSBudWxsO1xuICAgICAgICBpZiAoamlkID09PSBjb25uZWN0aW9uLmVtdWMubXlyb29tamlkKSB7XG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdsb2NhbFZpZGVvQ29udGFpbmVyJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmVuc3VyZVBlZXJDb250YWluZXJFeGlzdHMoamlkKTtcbiAgICAgICAgICAgIHZpZGVvU3BhbklkID0gJ3BhcnRpY2lwYW50XycgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZvY3VzKSB7XG4gICAgICAgICAgICBtdXRlZEF1ZGlvc1tqaWRdID0gaXNNdXRlZDtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZVJlbW90ZVZpZGVvTWVudShqaWQsIGlzTXV0ZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZpZGVvU3BhbklkKVxuICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0F1ZGlvSW5kaWNhdG9yKHZpZGVvU3BhbklkLCBpc011dGVkKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIE9uIHZpZGVvIG11dGVkIGV2ZW50LlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ3ZpZGVvbXV0ZWQubXVjJywgZnVuY3Rpb24gKGV2ZW50LCBqaWQsIGlzTXV0ZWQpIHtcbiAgICAgICAgdmFyIHZpZGVvU3BhbklkID0gbnVsbDtcbiAgICAgICAgaWYgKGppZCA9PT0gY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZCkge1xuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAnbG9jYWxWaWRlb0NvbnRhaW5lcic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5lbnN1cmVQZWVyQ29udGFpbmVyRXhpc3RzKGppZCk7XG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdwYXJ0aWNpcGFudF8nICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2aWRlb1NwYW5JZClcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dWaWRlb0luZGljYXRvcih2aWRlb1NwYW5JZCwgaXNNdXRlZCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBEaXNwbGF5IG5hbWUgY2hhbmdlZC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdkaXNwbGF5bmFtZWNoYW5nZWQnLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZXZlbnQsIGppZCwgZGlzcGxheU5hbWUsIHN0YXR1cykge1xuICAgICAgICBpZiAoamlkID09PSAnbG9jYWxWaWRlb0NvbnRhaW5lcidcbiAgICAgICAgICAgIHx8IGppZCA9PT0gY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZCkge1xuICAgICAgICAgICAgc2V0RGlzcGxheU5hbWUoJ2xvY2FsVmlkZW9Db250YWluZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGxheU5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuZW5zdXJlUGVlckNvbnRhaW5lckV4aXN0cyhqaWQpO1xuXG4gICAgICAgICAgICBzZXREaXNwbGF5TmFtZShcbiAgICAgICAgICAgICAgICAncGFydGljaXBhbnRfJyArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGppZCksXG4gICAgICAgICAgICAgICAgZGlzcGxheU5hbWUsXG4gICAgICAgICAgICAgICAgc3RhdHVzKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogT24gZG9taW5hbnQgc3BlYWtlciBjaGFuZ2VkIGV2ZW50LlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ2RvbWluYW50c3BlYWtlcmNoYW5nZWQnLCBmdW5jdGlvbiAoZXZlbnQsIHJlc291cmNlSmlkKSB7XG4gICAgICAgIC8vIFdlIGlnbm9yZSBsb2NhbCB1c2VyIGV2ZW50cy5cbiAgICAgICAgaWYgKHJlc291cmNlSmlkXG4gICAgICAgICAgICAgICAgPT09IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQpKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgY3VycmVudCBkb21pbmFudCBzcGVha2VyLlxuICAgICAgICBpZiAocmVzb3VyY2VKaWQgIT09IGN1cnJlbnREb21pbmFudFNwZWFrZXIpIHtcbiAgICAgICAgICAgIHZhciBvbGRTcGVha2VyVmlkZW9TcGFuSWQgPSBcInBhcnRpY2lwYW50X1wiICsgY3VycmVudERvbWluYW50U3BlYWtlcixcbiAgICAgICAgICAgICAgICBuZXdTcGVha2VyVmlkZW9TcGFuSWQgPSBcInBhcnRpY2lwYW50X1wiICsgcmVzb3VyY2VKaWQ7XG4gICAgICAgICAgICBpZigkKFwiI1wiICsgb2xkU3BlYWtlclZpZGVvU3BhbklkICsgXCI+c3Bhbi5kaXNwbGF5bmFtZVwiKS50ZXh0KCkgPT09IGRlZmF1bHREb21pbmFudFNwZWFrZXJEaXNwbGF5TmFtZSkge1xuICAgICAgICAgICAgICAgIHNldERpc3BsYXlOYW1lKG9sZFNwZWFrZXJWaWRlb1NwYW5JZCwgbnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZigkKFwiI1wiICsgbmV3U3BlYWtlclZpZGVvU3BhbklkICsgXCI+c3Bhbi5kaXNwbGF5bmFtZVwiKS50ZXh0KCkgPT09IGRlZmF1bHRSZW1vdGVEaXNwbGF5TmFtZSkge1xuICAgICAgICAgICAgICAgIHNldERpc3BsYXlOYW1lKG5ld1NwZWFrZXJWaWRlb1NwYW5JZCwgZGVmYXVsdERvbWluYW50U3BlYWtlckRpc3BsYXlOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGN1cnJlbnREb21pbmFudFNwZWFrZXIgPSByZXNvdXJjZUppZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE9idGFpbiBjb250YWluZXIgZm9yIG5ldyBkb21pbmFudCBzcGVha2VyLlxuICAgICAgICB2YXIgY29udGFpbmVyICA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFxuICAgICAgICAgICAgICAgICdwYXJ0aWNpcGFudF8nICsgcmVzb3VyY2VKaWQpO1xuXG4gICAgICAgIC8vIExvY2FsIHZpZGVvIHdpbGwgbm90IGhhdmUgY29udGFpbmVyIGZvdW5kLCBidXQgdGhhdCdzIG9rXG4gICAgICAgIC8vIHNpbmNlIHdlIGRvbid0IHdhbnQgdG8gc3dpdGNoIHRvIGxvY2FsIHZpZGVvLlxuICAgICAgICBpZiAoY29udGFpbmVyICYmICFWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciB2aWRlbyA9IGNvbnRhaW5lci5nZXRFbGVtZW50c0J5VGFnTmFtZShcInZpZGVvXCIpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGxhcmdlIHZpZGVvIGlmIHRoZSB2aWRlbyBzb3VyY2UgaXMgYWxyZWFkeSBhdmFpbGFibGUsXG4gICAgICAgICAgICAvLyBvdGhlcndpc2Ugd2FpdCBmb3IgdGhlIFwidmlkZW9hY3RpdmUuamluZ2xlXCIgZXZlbnQuXG4gICAgICAgICAgICBpZiAodmlkZW8ubGVuZ3RoICYmIHZpZGVvWzBdLmN1cnJlbnRUaW1lID4gMClcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC51cGRhdGVMYXJnZVZpZGVvKHZpZGVvWzBdLnNyYyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIE9uIGxhc3QgTiBjaGFuZ2UgZXZlbnQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZXZlbnQgdGhlIGV2ZW50IHRoYXQgbm90aWZpZWQgdXNcbiAgICAgKiBAcGFyYW0gbGFzdE5FbmRwb2ludHMgdGhlIGxpc3Qgb2YgbGFzdCBOIGVuZHBvaW50c1xuICAgICAqIEBwYXJhbSBlbmRwb2ludHNFbnRlcmluZ0xhc3ROIHRoZSBsaXN0IGN1cnJlbnRseSBlbnRlcmluZyBsYXN0IE5cbiAgICAgKiBlbmRwb2ludHNcbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdsYXN0bmNoYW5nZWQnLCBmdW5jdGlvbiAoIGV2ZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFzdE5FbmRwb2ludHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmRwb2ludHNFbnRlcmluZ0xhc3ROLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyZWFtKSB7XG4gICAgICAgIGlmIChsYXN0TkNvdW50ICE9PSBsYXN0TkVuZHBvaW50cy5sZW5ndGgpXG4gICAgICAgICAgICBsYXN0TkNvdW50ID0gbGFzdE5FbmRwb2ludHMubGVuZ3RoO1xuXG4gICAgICAgIGxhc3RORW5kcG9pbnRzQ2FjaGUgPSBsYXN0TkVuZHBvaW50cztcblxuICAgICAgICAkKCcjcmVtb3RlVmlkZW9zPnNwYW4nKS5lYWNoKGZ1bmN0aW9uKCBpbmRleCwgZWxlbWVudCApIHtcbiAgICAgICAgICAgIHZhciByZXNvdXJjZUppZCA9IFZpZGVvTGF5b3V0LmdldFBlZXJDb250YWluZXJSZXNvdXJjZUppZChlbGVtZW50KTtcblxuICAgICAgICAgICAgaWYgKHJlc291cmNlSmlkXG4gICAgICAgICAgICAgICAgJiYgbGFzdE5FbmRwb2ludHMubGVuZ3RoID4gMFxuICAgICAgICAgICAgICAgICYmIGxhc3RORW5kcG9pbnRzLmluZGV4T2YocmVzb3VyY2VKaWQpIDwgMCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVtb3ZlIGZyb20gbGFzdCBOXCIsIHJlc291cmNlSmlkKTtcbiAgICAgICAgICAgICAgICBzaG93UGVlckNvbnRhaW5lcihyZXNvdXJjZUppZCwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIWVuZHBvaW50c0VudGVyaW5nTGFzdE4gfHwgZW5kcG9pbnRzRW50ZXJpbmdMYXN0Ti5sZW5ndGggPCAwKVxuICAgICAgICAgICAgZW5kcG9pbnRzRW50ZXJpbmdMYXN0TiA9IGxhc3RORW5kcG9pbnRzO1xuXG4gICAgICAgIGlmIChlbmRwb2ludHNFbnRlcmluZ0xhc3ROICYmIGVuZHBvaW50c0VudGVyaW5nTGFzdE4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZW5kcG9pbnRzRW50ZXJpbmdMYXN0Ti5mb3JFYWNoKGZ1bmN0aW9uIChyZXNvdXJjZUppZCkge1xuXG4gICAgICAgICAgICAgICAgaWYgKCEkKCcjcGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkKS5pcygnOnZpc2libGUnKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkFkZCB0byBsYXN0IE5cIiwgcmVzb3VyY2VKaWQpO1xuICAgICAgICAgICAgICAgICAgICBzaG93UGVlckNvbnRhaW5lcihyZXNvdXJjZUppZCwgdHJ1ZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgZGVwLlVJQWN0aXZhdG9yKCkuZ2V0UlRDU2VydmljZSgpLnJlbW90ZVN0cmVhbXMuc29tZShmdW5jdGlvbiAobWVkaWFTdHJlYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZWRpYVN0cmVhbS5wZWVyamlkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQobWVkaWFTdHJlYW0ucGVlcmppZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPT09IHJlc291cmNlSmlkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgbWVkaWFTdHJlYW0udHlwZSA9PT0gbWVkaWFTdHJlYW0uVklERU9fVFlQRSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzZWwgPSAkKCcjcGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkICsgJz52aWRlbycpO1xuXG4vLzw8PDw8PDwgSEVBRDpVSS92aWRlb2xheW91dC5qc1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0YWNoTWVkaWFTdHJlYW0oc2VsLCBtZWRpYVN0cmVhbS5zdHJlYW0pO1xuLy89PT09PT09XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNpbXVsY2FzdCA9IG5ldyBTaW11bGNhc3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmlkZW9TdHJlYW0gPSBzaW11bGNhc3QuZ2V0UmVjZWl2aW5nVmlkZW9TdHJlYW0obWVkaWFTdHJlYW0uc3RyZWFtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRhY2hNZWRpYVN0cmVhbShzZWwsIHZpZGVvU3RyZWFtKTtcbi8vPj4+Pj4+PiBtYXN0ZXI6dmlkZW9sYXlvdXQuanNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YWl0Rm9yUmVtb3RlVmlkZW8oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZWRpYVN0cmVhbS5zc3JjLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVkaWFTdHJlYW0uc3RyZWFtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIHdhaXRGb3JSZW1vdGVWaWRlbyhzZWxlY3Rvciwgc3NyYywgc3RyZWFtKSB7XG4gICAgICAgIGlmIChzZWxlY3Rvci5yZW1vdmVkIHx8ICFzZWxlY3Rvci5wYXJlbnQoKS5pcyhcIjp2aXNpYmxlXCIpKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCJNZWRpYSByZW1vdmVkIGJlZm9yZSBoYWQgc3RhcnRlZFwiLCBzZWxlY3Rvcik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3RyZWFtLmlkID09PSAnbWl4ZWRtc2xhYmVsJykgcmV0dXJuO1xuXG4gICAgICAgIGlmIChzZWxlY3RvclswXS5jdXJyZW50VGltZSA+IDApIHtcbiAgICAgICAgICAgIHZhciBzaW11bGNhc3QgPSBuZXcgU2ltdWxjYXN0KCk7XG4gICAgICAgICAgICB2YXIgdmlkZW9TdHJlYW0gPSBzaW11bGNhc3QuZ2V0UmVjZWl2aW5nVmlkZW9TdHJlYW0oc3RyZWFtKTtcbiAgICAgICAgICAgIGF0dGFjaE1lZGlhU3RyZWFtKHNlbGVjdG9yLCB2aWRlb1N0cmVhbSk7IC8vIEZJWE1FOiB3aHkgZG8gaSBoYXZlIHRvIGRvIHRoaXMgZm9yIEZGP1xuXG4gICAgICAgICAgICAvLyBGSVhNRTogYWRkIGEgY2xhc3MgdGhhdCB3aWxsIGFzc29jaWF0ZSBwZWVyIEppZCwgdmlkZW8uc3JjLCBpdCdzIHNzcmMgYW5kIHZpZGVvIHR5cGVcbiAgICAgICAgICAgIC8vICAgICAgICBpbiBvcmRlciB0byBnZXQgcmlkIG9mIHRvbyBtYW55IG1hcHNcbiAgICAgICAgICAgIGlmIChzc3JjICYmIHNlbGVjdG9yLmF0dHIoJ3NyYycpKSB7XG4gICAgICAgICAgICAgICAgdmlkZW9TcmNUb1NzcmNbc2VsZWN0b3IuYXR0cignc3JjJyldID0gc3NyYztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiTm8gc3NyYyBnaXZlbiBmb3IgdmlkZW9cIiwgc2VsZWN0b3IpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2aWRlb0FjdGl2ZShzZWxlY3Rvcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB3YWl0Rm9yUmVtb3RlVmlkZW8oc2VsZWN0b3IsIHNzcmMsIHN0cmVhbSk7XG4gICAgICAgICAgICB9LCAyNTApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdmlkZW9BY3RpdmUodmlkZW9lbGVtKSB7XG4gICAgICAgIGlmICh2aWRlb2VsZW0uYXR0cignaWQnKS5pbmRleE9mKCdtaXhlZG1zbGFiZWwnKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIC8vIGlnbm9yZSBtaXhlZG1zbGFiZWxhMCBhbmQgdjBcblxuICAgICAgICAgICAgdmlkZW9lbGVtLnNob3coKTtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZVRodW1ibmFpbHMoKTtcblxuICAgICAgICAgICAgdmFyIHZpZGVvUGFyZW50ID0gdmlkZW9lbGVtLnBhcmVudCgpO1xuICAgICAgICAgICAgdmFyIHBhcmVudFJlc291cmNlSmlkID0gbnVsbDtcbiAgICAgICAgICAgIGlmICh2aWRlb1BhcmVudClcbiAgICAgICAgICAgICAgICBwYXJlbnRSZXNvdXJjZUppZFxuICAgICAgICAgICAgICAgICAgICA9IFZpZGVvTGF5b3V0LmdldFBlZXJDb250YWluZXJSZXNvdXJjZUppZCh2aWRlb1BhcmVudFswXSk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgbGFyZ2UgdmlkZW8gdG8gdGhlIGxhc3QgYWRkZWQgdmlkZW8gb25seSBpZiB0aGVyZSdzIG5vXG4gICAgICAgICAgICAvLyBjdXJyZW50IGRvbWluYW50IG9yIGZvY3VzZWQgc3BlYWtlciBvciB1cGRhdGUgaXQgdG8gdGhlIGN1cnJlbnRcbiAgICAgICAgICAgIC8vIGRvbWluYW50IHNwZWFrZXIuXG4gICAgICAgICAgICBpZiAoKCFWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMgJiYgIVZpZGVvTGF5b3V0LmdldERvbWluYW50U3BlYWtlclJlc291cmNlSmlkKCkpXG4gICAgICAgICAgICAgICAgfHwgKHBhcmVudFJlc291cmNlSmlkXG4gICAgICAgICAgICAgICAgJiYgVmlkZW9MYXlvdXQuZ2V0RG9taW5hbnRTcGVha2VyUmVzb3VyY2VKaWQoKVxuICAgICAgICAgICAgICAgICAgICA9PT0gcGFyZW50UmVzb3VyY2VKaWQpKSB7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQudXBkYXRlTGFyZ2VWaWRlbyh2aWRlb2VsZW0uYXR0cignc3JjJyksIDEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBWaWRlb0xheW91dC5zaG93Rm9jdXNJbmRpY2F0b3IoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBteS5yZXNpemVWaWRlb1NwYWNlID0gZnVuY3Rpb24ocmlnaHRDb2x1bW5FbCwgcmlnaHRDb2x1bW5TaXplLCBpc1Zpc2libGUpXG4gICAge1xuICAgICAgICB2YXIgdmlkZW9zcGFjZSA9ICQoJyN2aWRlb3NwYWNlJyk7XG5cbiAgICAgICAgdmFyIHZpZGVvc3BhY2VXaWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoIC0gcmlnaHRDb2x1bW5TaXplWzBdO1xuICAgICAgICB2YXIgdmlkZW9zcGFjZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgdmFyIHZpZGVvU2l6ZVxuICAgICAgICAgICAgPSBnZXRWaWRlb1NpemUobnVsbCwgbnVsbCwgdmlkZW9zcGFjZVdpZHRoLCB2aWRlb3NwYWNlSGVpZ2h0KTtcbiAgICAgICAgdmFyIHZpZGVvV2lkdGggPSB2aWRlb1NpemVbMF07XG4gICAgICAgIHZhciB2aWRlb0hlaWdodCA9IHZpZGVvU2l6ZVsxXTtcbiAgICAgICAgdmFyIHZpZGVvUG9zaXRpb24gPSBnZXRWaWRlb1Bvc2l0aW9uKHZpZGVvV2lkdGgsXG4gICAgICAgICAgICB2aWRlb0hlaWdodCxcbiAgICAgICAgICAgIHZpZGVvc3BhY2VXaWR0aCxcbiAgICAgICAgICAgIHZpZGVvc3BhY2VIZWlnaHQpO1xuICAgICAgICB2YXIgaG9yaXpvbnRhbEluZGVudCA9IHZpZGVvUG9zaXRpb25bMF07XG4gICAgICAgIHZhciB2ZXJ0aWNhbEluZGVudCA9IHZpZGVvUG9zaXRpb25bMV07XG5cbiAgICAgICAgdmFyIHRodW1ibmFpbFNpemUgPSBWaWRlb0xheW91dC5jYWxjdWxhdGVUaHVtYm5haWxTaXplKHZpZGVvc3BhY2VXaWR0aCk7XG4gICAgICAgIHZhciB0aHVtYm5haWxzV2lkdGggPSB0aHVtYm5haWxTaXplWzBdO1xuICAgICAgICB2YXIgdGh1bWJuYWlsc0hlaWdodCA9IHRodW1ibmFpbFNpemVbMV07XG5cbiAgICAgICAgaWYgKGlzVmlzaWJsZSkge1xuICAgICAgICAgICAgdmlkZW9zcGFjZS5hbmltYXRlKHtyaWdodDogcmlnaHRDb2x1bW5TaXplWzBdLFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogdmlkZW9zcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZpZGVvc3BhY2VIZWlnaHR9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDB9KTtcblxuICAgICAgICAgICAgJCgnI3JlbW90ZVZpZGVvcycpLmFuaW1hdGUoe2hlaWdodDogdGh1bWJuYWlsc0hlaWdodH0sXG4gICAgICAgICAgICAgICAge3F1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMH0pO1xuXG4gICAgICAgICAgICAkKCcjcmVtb3RlVmlkZW9zPnNwYW4nKS5hbmltYXRlKHtoZWlnaHQ6IHRodW1ibmFpbHNIZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiB0aHVtYm5haWxzV2lkdGh9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDAsXG4gICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJyZW1vdGV2aWRlby5yZXNpemVkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgW3RodW1ibmFpbHNXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGh1bWJuYWlsc0hlaWdodF0pO1xuICAgICAgICAgICAgICAgICAgICB9fSk7XG5cbiAgICAgICAgICAgICQoJyNsYXJnZVZpZGVvQ29udGFpbmVyJykuYW5pbWF0ZSh7IHdpZHRoOiB2aWRlb3NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogdmlkZW9zcGFjZUhlaWdodH0sXG4gICAgICAgICAgICAgICAge3F1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMFxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlbycpLmFuaW1hdGUoeyAgd2lkdGg6IHZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgIHRvcDogdmVydGljYWxJbmRlbnQsXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbTogdmVydGljYWxJbmRlbnQsXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IGhvcml6b250YWxJbmRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiBob3Jpem9udGFsSW5kZW50fSxcbiAgICAgICAgICAgICAgICB7ICAgcXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJpZ2h0Q29sdW1uRWwuaGlkZShcInNsaWRlXCIsIHsgZGlyZWN0aW9uOiBcInJpZ2h0XCIsXG4gICAgICAgICAgICAgICAgcXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIFVuZG9jayB0aGUgdG9vbGJhciB3aGVuIHRoZSBjaGF0IGlzIHNob3duIGFuZCBpZiB3ZSdyZSBpbiBhXG4gICAgICAgICAgICAvLyB2aWRlbyBtb2RlLlxuICAgICAgICAgICAgaWYgKFZpZGVvTGF5b3V0LmlzTGFyZ2VWaWRlb1Zpc2libGUoKSlcbiAgICAgICAgICAgICAgICBkZXAuVG9vbGJhcigpLmRvY2tUb29sYmFyKGZhbHNlKTtcblxuICAgICAgICAgICAgdmlkZW9zcGFjZS5hbmltYXRlKHtyaWdodDogcmlnaHRDb2x1bW5TaXplWzBdLFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogdmlkZW9zcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZpZGVvc3BhY2VIZWlnaHR9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDAsXG4gICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByaWdodENvbHVtbkVsLnRyaWdnZXIoJ3Nob3duJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgJCgnI3JlbW90ZVZpZGVvcycpLmFuaW1hdGUoe2hlaWdodDogdGh1bWJuYWlsc0hlaWdodH0sXG4gICAgICAgICAgICAgICAge3F1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMH0pO1xuXG4gICAgICAgICAgICAkKCcjcmVtb3RlVmlkZW9zPnNwYW4nKS5hbmltYXRlKHtoZWlnaHQ6IHRodW1ibmFpbHNIZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiB0aHVtYm5haWxzV2lkdGh9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDAsXG4gICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJyZW1vdGV2aWRlby5yZXNpemVkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgW3RodW1ibmFpbHNXaWR0aCwgdGh1bWJuYWlsc0hlaWdodF0pO1xuICAgICAgICAgICAgICAgICAgICB9fSk7XG5cbiAgICAgICAgICAgICQoJyNsYXJnZVZpZGVvQ29udGFpbmVyJykuYW5pbWF0ZSh7IHdpZHRoOiB2aWRlb3NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogdmlkZW9zcGFjZUhlaWdodH0sXG4gICAgICAgICAgICAgICAge3F1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMFxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlbycpLmFuaW1hdGUoeyAgd2lkdGg6IHZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgIHRvcDogdmVydGljYWxJbmRlbnQsXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbTogdmVydGljYWxJbmRlbnQsXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IGhvcml6b250YWxJbmRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiBob3Jpem9udGFsSW5kZW50fSxcbiAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJpZ2h0Q29sdW1uRWwuc2hvdyhcInNsaWRlXCIsIHsgZGlyZWN0aW9uOiBcInJpZ2h0XCIsXG4gICAgICAgICAgICAgICAgcXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgICQoZG9jdW1lbnQpLmJpbmQoJ3NpbXVsY2FzdGxheWVyc3RhcnRlZCcsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIHZhciBsb2NhbFZpZGVvU2VsZWN0b3IgPSAkKCcjJyArICdsb2NhbFZpZGVvXycgKyBjb25uZWN0aW9uLmppbmdsZS5sb2NhbFZpZGVvLmlkKTtcbiAgICAgICAgdmFyIHNpbXVsY2FzdCA9IG5ldyBTaW11bGNhc3QoKTtcbiAgICAgICAgdmFyIHN0cmVhbSA9IHNpbXVsY2FzdC5nZXRMb2NhbFZpZGVvU3RyZWFtKCk7XG5cbiAgICAgICAgLy8gQXR0YWNoIFdlYlJUQyBzdHJlYW1cbiAgICAgICAgUlRDLmF0dGFjaE1lZGlhU3RyZWFtKGxvY2FsVmlkZW9TZWxlY3Rvciwgc3RyZWFtKTtcblxuICAgICAgICBsb2NhbFZpZGVvU3JjID0gJChsb2NhbFZpZGVvU2VsZWN0b3IpLmF0dHIoJ3NyYycpO1xuICAgIH0pO1xuXG4gICAgJChkb2N1bWVudCkuYmluZCgnc2ltdWxjYXN0bGF5ZXJzdG9wcGVkJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgdmFyIGxvY2FsVmlkZW9TZWxlY3RvciA9ICQoJyMnICsgJ2xvY2FsVmlkZW9fJyArIGNvbm5lY3Rpb24uamluZ2xlLmxvY2FsVmlkZW8uaWQpO1xuICAgICAgICB2YXIgc2ltdWxjYXN0ID0gbmV3IFNpbXVsY2FzdCgpO1xuICAgICAgICB2YXIgc3RyZWFtID0gc2ltdWxjYXN0LmdldExvY2FsVmlkZW9TdHJlYW0oKTtcblxuICAgICAgICAvLyBBdHRhY2ggV2ViUlRDIHN0cmVhbVxuICAgICAgICBSVEMuYXR0YWNoTWVkaWFTdHJlYW0obG9jYWxWaWRlb1NlbGVjdG9yLCBzdHJlYW0pO1xuXG4gICAgICAgIGxvY2FsVmlkZW9TcmMgPSAkKGxvY2FsVmlkZW9TZWxlY3RvcikuYXR0cignc3JjJyk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBPbiBzaW11bGNhc3QgbGF5ZXJzIGNoYW5nZWQgZXZlbnQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgnc2ltdWxjYXN0bGF5ZXJzY2hhbmdlZCcsIGZ1bmN0aW9uIChldmVudCwgZW5kcG9pbnRTaW11bGNhc3RMYXllcnMpIHtcbiAgICAgICAgdmFyIHNpbXVsY2FzdCA9IG5ldyBTaW11bGNhc3QoKTtcbiAgICAgICAgZW5kcG9pbnRTaW11bGNhc3RMYXllcnMuZm9yRWFjaChmdW5jdGlvbiAoZXNsKSB7XG5cbiAgICAgICAgICAgIHZhciBwcmltYXJ5U1NSQyA9IGVzbC5zaW11bGNhc3RMYXllci5wcmltYXJ5U1NSQztcbiAgICAgICAgICAgIHZhciBtc2lkID0gc2ltdWxjYXN0LmdldFJlbW90ZVZpZGVvU3RyZWFtSWRCeVNTUkMocHJpbWFyeVNTUkMpO1xuXG4gICAgICAgICAgICAvLyBHZXQgc2Vzc2lvbiBhbmQgc3RyZWFtIGZyb20gbXNpZC5cbiAgICAgICAgICAgIHZhciBzZXNzaW9uLCBlbGVjdGVkU3RyZWFtO1xuICAgICAgICAgICAgdmFyIGksIGosIGs7XG4gICAgICAgICAgICBpZiAoY29ubmVjdGlvbi5qaW5nbGUpIHtcbiAgICAgICAgICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGNvbm5lY3Rpb24uamluZ2xlLnNlc3Npb25zKTtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2lkID0ga2V5c1tpXTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlY3RlZFN0cmVhbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc3RyZWFtIGZvdW5kLCBzdG9wLlxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBzZXNzaW9uID0gY29ubmVjdGlvbi5qaW5nbGUuc2Vzc2lvbnNbc2lkXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlc3Npb24ucmVtb3RlU3RyZWFtcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IHNlc3Npb24ucmVtb3RlU3RyZWFtcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZW1vdGVTdHJlYW0gPSBzZXNzaW9uLnJlbW90ZVN0cmVhbXNbal07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWxlY3RlZFN0cmVhbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzdHJlYW0gZm91bmQsIHN0b3AuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdHJhY2tzID0gcmVtb3RlU3RyZWFtLmdldFZpZGVvVHJhY2tzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRyYWNrcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGsgPSAwOyBrIDwgdHJhY2tzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdHJhY2sgPSB0cmFja3Nba107XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtc2lkID09PSBbcmVtb3RlU3RyZWFtLmlkLCB0cmFjay5pZF0uam9pbignICcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlY3RlZFN0cmVhbSA9IG5ldyB3ZWJraXRNZWRpYVN0cmVhbShbdHJhY2tdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzdHJlYW0gZm91bmQsIHN0b3AuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzZXNzaW9uICYmIGVsZWN0ZWRTdHJlYW0pIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oJ1N3aXRjaGluZyBzaW11bGNhc3Qgc3Vic3RyZWFtLicpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhbZXNsLCBwcmltYXJ5U1NSQywgbXNpZCwgc2Vzc2lvbiwgZWxlY3RlZFN0cmVhbV0pO1xuXG4gICAgICAgICAgICAgICAgdmFyIG1zaWRQYXJ0cyA9IG1zaWQuc3BsaXQoJyAnKTtcbiAgICAgICAgICAgICAgICB2YXIgc2VsUmVtb3RlVmlkZW8gPSAkKFsnIycsICdyZW1vdGVWaWRlb18nLCBzZXNzaW9uLnNpZCwgJ18nLCBtc2lkUGFydHNbMF1dLmpvaW4oJycpKTtcblxuICAgICAgICAgICAgICAgIHZhciB1cGRhdGVMYXJnZVZpZGVvID0gKHNzcmMyamlkW3ZpZGVvU3JjVG9Tc3JjW3NlbFJlbW90ZVZpZGVvLmF0dHIoJ3NyYycpXV1cbiAgICAgICAgICAgICAgICAgICAgPT0gc3NyYzJqaWRbdmlkZW9TcmNUb1NzcmNbbGFyZ2VWaWRlb05ld1NyY11dKTtcbiAgICAgICAgICAgICAgICB2YXIgdXBkYXRlRm9jdXNlZFZpZGVvU3JjID0gKHNlbFJlbW90ZVZpZGVvLmF0dHIoJ3NyYycpID09IGZvY3VzZWRWaWRlb1NyYyk7XG5cbiAgICAgICAgICAgICAgICB2YXIgZWxlY3RlZFN0cmVhbVVybCA9IHdlYmtpdFVSTC5jcmVhdGVPYmplY3RVUkwoZWxlY3RlZFN0cmVhbSk7XG4gICAgICAgICAgICAgICAgc2VsUmVtb3RlVmlkZW8uYXR0cignc3JjJywgZWxlY3RlZFN0cmVhbVVybCk7XG4gICAgICAgICAgICAgICAgdmlkZW9TcmNUb1NzcmNbc2VsUmVtb3RlVmlkZW8uYXR0cignc3JjJyldID0gcHJpbWFyeVNTUkM7XG5cbiAgICAgICAgICAgICAgICBpZiAodXBkYXRlTGFyZ2VWaWRlbykge1xuICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC51cGRhdGVMYXJnZVZpZGVvKGVsZWN0ZWRTdHJlYW1VcmwpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICh1cGRhdGVGb2N1c2VkVmlkZW9TcmMpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9jdXNlZFZpZGVvU3JjID0gZWxlY3RlZFN0cmVhbVVybDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQ291bGQgbm90IGZpbmQgYSBzdHJlYW0gb3IgYSBzZXNzaW9uLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBteTtcbn0oVmlkZW9MYXlvdXQgfHwge30pKTtcblxubW9kdWxlLmV4cG9ydHMgPSBWaWRlb0xheW91dDtcbiIsInZhciBWaWRlb0xheW91dCA9IHJlcXVpcmUoXCIuLi9WaWRlb0xheW91dFwiKTtcbnZhciBDYW52YXNVdGlsID0gcmVxdWlyZShcIi4vQ2FudmFzVXRpbC5qc1wiKTtcblxuLyoqXG4gKiBUaGUgYXVkaW8gTGV2ZWxzIHBsdWdpbi5cbiAqL1xudmFyIEF1ZGlvTGV2ZWxzID0gKGZ1bmN0aW9uKG15KSB7XG4gICAgdmFyIENBTlZBU19FWFRSQSA9IDEwNDtcbiAgICB2YXIgQ0FOVkFTX1JBRElVUyA9IDc7XG4gICAgdmFyIFNIQURPV19DT0xPUiA9ICcjMDBjY2ZmJztcbiAgICB2YXIgYXVkaW9MZXZlbENhbnZhc0NhY2hlID0ge307XG5cbiAgICBteS5MT0NBTF9MRVZFTCA9ICdsb2NhbCc7XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBhdWRpbyBsZXZlbCBjYW52YXMgZm9yIHRoZSBnaXZlbiBwZWVySmlkLiBJZiB0aGUgY2FudmFzXG4gICAgICogZGlkbid0IGV4aXN0IHdlIGNyZWF0ZSBpdC5cbiAgICAgKi9cbiAgICBteS51cGRhdGVBdWRpb0xldmVsQ2FudmFzID0gZnVuY3Rpb24gKHBlZXJKaWQpIHtcbiAgICAgICAgdmFyIHJlc291cmNlSmlkID0gbnVsbDtcbiAgICAgICAgdmFyIHZpZGVvU3BhbklkID0gbnVsbDtcbiAgICAgICAgaWYgKCFwZWVySmlkKVxuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAnbG9jYWxWaWRlb0NvbnRhaW5lcic7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVzb3VyY2VKaWQgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChwZWVySmlkKTtcblxuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAncGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkO1xuICAgICAgICB9XG5cbiAgICAgICAgdmlkZW9TcGFuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodmlkZW9TcGFuSWQpO1xuXG4gICAgICAgIGlmICghdmlkZW9TcGFuKSB7XG4gICAgICAgICAgICBpZiAocmVzb3VyY2VKaWQpXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIk5vIHZpZGVvIGVsZW1lbnQgZm9yIGppZFwiLCByZXNvdXJjZUppZCk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIk5vIHZpZGVvIGVsZW1lbnQgZm9yIGxvY2FsIHZpZGVvLlwiKTtcblxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGF1ZGlvTGV2ZWxDYW52YXMgPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5jYW52YXMnKTtcblxuICAgICAgICB2YXIgdmlkZW9TcGFjZVdpZHRoID0gJCgnI3JlbW90ZVZpZGVvcycpLndpZHRoKCk7XG4gICAgICAgIHZhciB0aHVtYm5haWxTaXplXG4gICAgICAgICAgICA9IFZpZGVvTGF5b3V0LmNhbGN1bGF0ZVRodW1ibmFpbFNpemUodmlkZW9TcGFjZVdpZHRoKTtcbiAgICAgICAgdmFyIHRodW1ibmFpbFdpZHRoID0gdGh1bWJuYWlsU2l6ZVswXTtcbiAgICAgICAgdmFyIHRodW1ibmFpbEhlaWdodCA9IHRodW1ibmFpbFNpemVbMV07XG5cbiAgICAgICAgaWYgKCFhdWRpb0xldmVsQ2FudmFzIHx8IGF1ZGlvTGV2ZWxDYW52YXMubGVuZ3RoID09PSAwKSB7XG5cbiAgICAgICAgICAgIGF1ZGlvTGV2ZWxDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgICAgIGF1ZGlvTGV2ZWxDYW52YXMuY2xhc3NOYW1lID0gXCJhdWRpb2xldmVsXCI7XG4gICAgICAgICAgICBhdWRpb0xldmVsQ2FudmFzLnN0eWxlLmJvdHRvbSA9IFwiLVwiICsgQ0FOVkFTX0VYVFJBLzIgKyBcInB4XCI7XG4gICAgICAgICAgICBhdWRpb0xldmVsQ2FudmFzLnN0eWxlLmxlZnQgPSBcIi1cIiArIENBTlZBU19FWFRSQS8yICsgXCJweFwiO1xuICAgICAgICAgICAgcmVzaXplQXVkaW9MZXZlbENhbnZhcyggYXVkaW9MZXZlbENhbnZhcyxcbiAgICAgICAgICAgICAgICAgICAgdGh1bWJuYWlsV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgIHRodW1ibmFpbEhlaWdodCk7XG5cbiAgICAgICAgICAgIHZpZGVvU3Bhbi5hcHBlbmRDaGlsZChhdWRpb0xldmVsQ2FudmFzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGF1ZGlvTGV2ZWxDYW52YXMgPSBhdWRpb0xldmVsQ2FudmFzLmdldCgwKTtcblxuICAgICAgICAgICAgcmVzaXplQXVkaW9MZXZlbENhbnZhcyggYXVkaW9MZXZlbENhbnZhcyxcbiAgICAgICAgICAgICAgICAgICAgdGh1bWJuYWlsV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgIHRodW1ibmFpbEhlaWdodCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgYXVkaW8gbGV2ZWwgVUkgZm9yIHRoZSBnaXZlbiByZXNvdXJjZUppZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSByZXNvdXJjZUppZCB0aGUgcmVzb3VyY2UgamlkIGluZGljYXRpbmcgdGhlIHZpZGVvIGVsZW1lbnQgZm9yXG4gICAgICogd2hpY2ggd2UgZHJhdyB0aGUgYXVkaW8gbGV2ZWxcbiAgICAgKiBAcGFyYW0gYXVkaW9MZXZlbCB0aGUgbmV3QXVkaW8gbGV2ZWwgdG8gcmVuZGVyXG4gICAgICovXG4gICAgbXkudXBkYXRlQXVkaW9MZXZlbCA9IGZ1bmN0aW9uIChyZXNvdXJjZUppZCwgYXVkaW9MZXZlbCkge1xuICAgICAgICBkcmF3QXVkaW9MZXZlbENhbnZhcyhyZXNvdXJjZUppZCwgYXVkaW9MZXZlbCk7XG5cbiAgICAgICAgdmFyIHZpZGVvU3BhbklkID0gZ2V0VmlkZW9TcGFuSWQocmVzb3VyY2VKaWQpO1xuXG4gICAgICAgIHZhciBhdWRpb0xldmVsQ2FudmFzID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+Y2FudmFzJykuZ2V0KDApO1xuXG4gICAgICAgIGlmICghYXVkaW9MZXZlbENhbnZhcylcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICB2YXIgZHJhd0NvbnRleHQgPSBhdWRpb0xldmVsQ2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbiAgICAgICAgdmFyIGNhbnZhc0NhY2hlID0gYXVkaW9MZXZlbENhbnZhc0NhY2hlW3Jlc291cmNlSmlkXTtcblxuICAgICAgICBkcmF3Q29udGV4dC5jbGVhclJlY3QgKDAsIDAsXG4gICAgICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhcy53aWR0aCwgYXVkaW9MZXZlbENhbnZhcy5oZWlnaHQpO1xuICAgICAgICBkcmF3Q29udGV4dC5kcmF3SW1hZ2UoY2FudmFzQ2FjaGUsIDAsIDApO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXNpemVzIHRoZSBnaXZlbiBhdWRpbyBsZXZlbCBjYW52YXMgdG8gbWF0Y2ggdGhlIGdpdmVuIHRodW1ibmFpbCBzaXplLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJlc2l6ZUF1ZGlvTGV2ZWxDYW52YXMoYXVkaW9MZXZlbENhbnZhcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRodW1ibmFpbFdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGh1bWJuYWlsSGVpZ2h0KSB7XG4gICAgICAgIGF1ZGlvTGV2ZWxDYW52YXMud2lkdGggPSB0aHVtYm5haWxXaWR0aCArIENBTlZBU19FWFRSQTtcbiAgICAgICAgYXVkaW9MZXZlbENhbnZhcy5oZWlnaHQgPSB0aHVtYm5haWxIZWlnaHQgKyBDQU5WQVNfRVhUUkE7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIERyYXdzIHRoZSBhdWRpbyBsZXZlbCBjYW52YXMgaW50byB0aGUgY2FjaGVkIGNhbnZhcyBvYmplY3QuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVzb3VyY2VKaWQgdGhlIHJlc291cmNlIGppZCBpbmRpY2F0aW5nIHRoZSB2aWRlbyBlbGVtZW50IGZvclxuICAgICAqIHdoaWNoIHdlIGRyYXcgdGhlIGF1ZGlvIGxldmVsXG4gICAgICogQHBhcmFtIGF1ZGlvTGV2ZWwgdGhlIG5ld0F1ZGlvIGxldmVsIHRvIHJlbmRlclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGRyYXdBdWRpb0xldmVsQ2FudmFzKHJlc291cmNlSmlkLCBhdWRpb0xldmVsKSB7XG4gICAgICAgIGlmICghYXVkaW9MZXZlbENhbnZhc0NhY2hlW3Jlc291cmNlSmlkXSkge1xuXG4gICAgICAgICAgICB2YXIgdmlkZW9TcGFuSWQgPSBnZXRWaWRlb1NwYW5JZChyZXNvdXJjZUppZCk7XG5cbiAgICAgICAgICAgIHZhciBhdWRpb0xldmVsQ2FudmFzT3JpZyA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPmNhbnZhcycpLmdldCgwKTtcblxuICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAqIEZJWE1FIFRlc3RpbmcgaGFzIHNob3duIHRoYXQgYXVkaW9MZXZlbENhbnZhc09yaWcgbWF5IG5vdCBleGlzdC5cbiAgICAgICAgICAgICAqIEluIHN1Y2ggYSBjYXNlLCB0aGUgbWV0aG9kIENhbnZhc1V0aWwuY2xvbmVDYW52YXMgbWF5IHRocm93IGFuXG4gICAgICAgICAgICAgKiBlcnJvci4gU2luY2UgYXVkaW8gbGV2ZWxzIGFyZSBmcmVxdWVudGx5IHVwZGF0ZWQsIHRoZSBlcnJvcnMgaGF2ZVxuICAgICAgICAgICAgICogYmVlbiBvYnNlcnZlZCB0byBwaWxlIGludG8gdGhlIGNvbnNvbGUsIHN0cmFpbiB0aGUgQ1BVLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpZiAoYXVkaW9MZXZlbENhbnZhc09yaWcpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhc0NhY2hlW3Jlc291cmNlSmlkXVxuICAgICAgICAgICAgICAgICAgICA9IENhbnZhc1V0aWwuY2xvbmVDYW52YXMoYXVkaW9MZXZlbENhbnZhc09yaWcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNhbnZhcyA9IGF1ZGlvTGV2ZWxDYW52YXNDYWNoZVtyZXNvdXJjZUppZF07XG5cbiAgICAgICAgaWYgKCFjYW52YXMpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgdmFyIGRyYXdDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbiAgICAgICAgZHJhd0NvbnRleHQuY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XG5cbiAgICAgICAgdmFyIHNoYWRvd0xldmVsID0gZ2V0U2hhZG93TGV2ZWwoYXVkaW9MZXZlbCk7XG5cbiAgICAgICAgaWYgKHNoYWRvd0xldmVsID4gMClcbiAgICAgICAgICAgIC8vIGRyYXdDb250ZXh0LCB4LCB5LCB3LCBoLCByLCBzaGFkb3dDb2xvciwgc2hhZG93TGV2ZWxcbiAgICAgICAgICAgIENhbnZhc1V0aWwuZHJhd1JvdW5kUmVjdEdsb3coICAgZHJhd0NvbnRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENBTlZBU19FWFRSQS8yLCBDQU5WQVNfRVhUUkEvMixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FudmFzLndpZHRoIC0gQ0FOVkFTX0VYVFJBLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYW52YXMuaGVpZ2h0IC0gQ0FOVkFTX0VYVFJBLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBDQU5WQVNfUkFESVVTLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBTSEFET1dfQ09MT1IsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNoYWRvd0xldmVsKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgc2hhZG93L2dsb3cgbGV2ZWwgZm9yIHRoZSBnaXZlbiBhdWRpbyBsZXZlbC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdWRpb0xldmVsIHRoZSBhdWRpbyBsZXZlbCBmcm9tIHdoaWNoIHdlIGRldGVybWluZSB0aGUgc2hhZG93XG4gICAgICogbGV2ZWxcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRTaGFkb3dMZXZlbCAoYXVkaW9MZXZlbCkge1xuICAgICAgICB2YXIgc2hhZG93TGV2ZWwgPSAwO1xuXG4gICAgICAgIGlmIChhdWRpb0xldmVsIDw9IDAuMykge1xuICAgICAgICAgICAgc2hhZG93TGV2ZWwgPSBNYXRoLnJvdW5kKENBTlZBU19FWFRSQS8yKihhdWRpb0xldmVsLzAuMykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGF1ZGlvTGV2ZWwgPD0gMC42KSB7XG4gICAgICAgICAgICBzaGFkb3dMZXZlbCA9IE1hdGgucm91bmQoQ0FOVkFTX0VYVFJBLzIqKChhdWRpb0xldmVsIC0gMC4zKSAvIDAuMykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc2hhZG93TGV2ZWwgPSBNYXRoLnJvdW5kKENBTlZBU19FWFRSQS8yKigoYXVkaW9MZXZlbCAtIDAuNikgLyAwLjQpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2hhZG93TGV2ZWw7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHZpZGVvIHNwYW4gaWQgY29ycmVzcG9uZGluZyB0byB0aGUgZ2l2ZW4gcmVzb3VyY2VKaWQgb3IgbG9jYWxcbiAgICAgKiB1c2VyLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFZpZGVvU3BhbklkKHJlc291cmNlSmlkKSB7XG4gICAgICAgIHZhciB2aWRlb1NwYW5JZCA9IG51bGw7XG4gICAgICAgIGlmIChyZXNvdXJjZUppZCA9PT0gU3RhdGlzdGljc0FjdGl2YXRvci5MT0NBTF9KSUQpXG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdsb2NhbFZpZGVvQ29udGFpbmVyJztcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAncGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkO1xuXG4gICAgICAgIHJldHVybiB2aWRlb1NwYW5JZDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSW5kaWNhdGVzIHRoYXQgdGhlIHJlbW90ZSB2aWRlbyBoYXMgYmVlbiByZXNpemVkLlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ3JlbW90ZXZpZGVvLnJlc2l6ZWQnLCBmdW5jdGlvbiAoZXZlbnQsIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgdmFyIHJlc2l6ZWQgPSBmYWxzZTtcbiAgICAgICAgJCgnI3JlbW90ZVZpZGVvcz5zcGFuPmNhbnZhcycpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgY2FudmFzID0gJCh0aGlzKS5nZXQoMCk7XG4gICAgICAgICAgICBpZiAoY2FudmFzLndpZHRoICE9PSB3aWR0aCArIENBTlZBU19FWFRSQSkge1xuICAgICAgICAgICAgICAgIGNhbnZhcy53aWR0aCA9IHdpZHRoICsgQ0FOVkFTX0VYVFJBO1xuICAgICAgICAgICAgICAgIHJlc2l6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY2FudmFzLmhlaWdoICE9PSBoZWlnaHQgKyBDQU5WQVNfRVhUUkEpIHtcbiAgICAgICAgICAgICAgICBjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0ICsgQ0FOVkFTX0VYVFJBO1xuICAgICAgICAgICAgICAgIHJlc2l6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAocmVzaXplZClcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGF1ZGlvTGV2ZWxDYW52YXNDYWNoZSkuZm9yRWFjaChmdW5jdGlvbiAocmVzb3VyY2VKaWQpIHtcbiAgICAgICAgICAgICAgICBhdWRpb0xldmVsQ2FudmFzQ2FjaGVbcmVzb3VyY2VKaWRdLndpZHRoXG4gICAgICAgICAgICAgICAgICAgID0gd2lkdGggKyBDQU5WQVNfRVhUUkE7XG4gICAgICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhc0NhY2hlW3Jlc291cmNlSmlkXS5oZWlnaHRcbiAgICAgICAgICAgICAgICAgICAgPSBoZWlnaHQgKyBDQU5WQVNfRVhUUkE7XG4gICAgICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBteTtcblxufSkoQXVkaW9MZXZlbHMgfHwge30pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEF1ZGlvTGV2ZWxzO1xuIiwiLyoqXG4gKiBVdGlsaXR5IGNsYXNzIGZvciBkcmF3aW5nIGNhbnZhcyBzaGFwZXMuXG4gKi9cbnZhciBDYW52YXNVdGlsID0gKGZ1bmN0aW9uKG15KSB7XG5cbiAgICAvKipcbiAgICAgKiBEcmF3cyBhIHJvdW5kIHJlY3RhbmdsZSB3aXRoIGEgZ2xvdy4gVGhlIGdsb3dXaWR0aCBpbmRpY2F0ZXMgdGhlIGRlcHRoXG4gICAgICogb2YgdGhlIGdsb3cuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZHJhd0NvbnRleHQgdGhlIGNvbnRleHQgb2YgdGhlIGNhbnZhcyB0byBkcmF3IHRvXG4gICAgICogQHBhcmFtIHggdGhlIHggY29vcmRpbmF0ZSBvZiB0aGUgcm91bmQgcmVjdGFuZ2xlXG4gICAgICogQHBhcmFtIHkgdGhlIHkgY29vcmRpbmF0ZSBvZiB0aGUgcm91bmQgcmVjdGFuZ2xlXG4gICAgICogQHBhcmFtIHcgdGhlIHdpZHRoIG9mIHRoZSByb3VuZCByZWN0YW5nbGVcbiAgICAgKiBAcGFyYW0gaCB0aGUgaGVpZ2h0IG9mIHRoZSByb3VuZCByZWN0YW5nbGVcbiAgICAgKiBAcGFyYW0gZ2xvd0NvbG9yIHRoZSBjb2xvciBvZiB0aGUgZ2xvd1xuICAgICAqIEBwYXJhbSBnbG93V2lkdGggdGhlIHdpZHRoIG9mIHRoZSBnbG93XG4gICAgICovXG4gICAgbXkuZHJhd1JvdW5kUmVjdEdsb3dcbiAgICAgICAgPSBmdW5jdGlvbihkcmF3Q29udGV4dCwgeCwgeSwgdywgaCwgciwgZ2xvd0NvbG9yLCBnbG93V2lkdGgpIHtcblxuICAgICAgICAvLyBTYXZlIHRoZSBwcmV2aW91cyBzdGF0ZSBvZiB0aGUgY29udGV4dC5cbiAgICAgICAgZHJhd0NvbnRleHQuc2F2ZSgpO1xuXG4gICAgICAgIGlmICh3IDwgMiAqIHIpIHIgPSB3IC8gMjtcbiAgICAgICAgaWYgKGggPCAyICogcikgciA9IGggLyAyO1xuXG4gICAgICAgIC8vIERyYXcgYSByb3VuZCByZWN0YW5nbGUuXG4gICAgICAgIGRyYXdDb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICBkcmF3Q29udGV4dC5tb3ZlVG8oeCtyLCB5KTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCt3LCB5LCAgIHgrdywgeStoLCByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCt3LCB5K2gsIHgsICAgeStoLCByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCwgICB5K2gsIHgsICAgeSwgICByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCwgICB5LCAgIHgrdywgeSwgICByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuY2xvc2VQYXRoKCk7XG5cbiAgICAgICAgLy8gQWRkIGEgc2hhZG93IGFyb3VuZCB0aGUgcmVjdGFuZ2xlXG4gICAgICAgIGRyYXdDb250ZXh0LnNoYWRvd0NvbG9yID0gZ2xvd0NvbG9yO1xuICAgICAgICBkcmF3Q29udGV4dC5zaGFkb3dCbHVyID0gZ2xvd1dpZHRoO1xuICAgICAgICBkcmF3Q29udGV4dC5zaGFkb3dPZmZzZXRYID0gMDtcbiAgICAgICAgZHJhd0NvbnRleHQuc2hhZG93T2Zmc2V0WSA9IDA7XG5cbiAgICAgICAgLy8gRmlsbCB0aGUgc2hhcGUuXG4gICAgICAgIGRyYXdDb250ZXh0LmZpbGwoKTtcblxuICAgICAgICBkcmF3Q29udGV4dC5zYXZlKCk7XG5cbiAgICAgICAgZHJhd0NvbnRleHQucmVzdG9yZSgpO1xuXG4vLyAgICAgIDEpIFVuY29tbWVudCB0aGlzIGxpbmUgdG8gdXNlIENvbXBvc2l0ZSBPcGVyYXRpb24sIHdoaWNoIGlzIGRvaW5nIHRoZVxuLy8gICAgICBzYW1lIGFzIHRoZSBjbGlwIGZ1bmN0aW9uIGJlbG93IGFuZCBpcyBhbHNvIGFudGlhbGlhc2luZyB0aGUgcm91bmRcbi8vICAgICAgYm9yZGVyLCBidXQgaXMgc2FpZCB0byBiZSBsZXNzIGZhc3QgcGVyZm9ybWFuY2Ugd2lzZS5cblxuLy8gICAgICBkcmF3Q29udGV4dC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb249J2Rlc3RpbmF0aW9uLW91dCc7XG5cbiAgICAgICAgZHJhd0NvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgIGRyYXdDb250ZXh0Lm1vdmVUbyh4K3IsIHkpO1xuICAgICAgICBkcmF3Q29udGV4dC5hcmNUbyh4K3csIHksICAgeCt3LCB5K2gsIHIpO1xuICAgICAgICBkcmF3Q29udGV4dC5hcmNUbyh4K3csIHkraCwgeCwgICB5K2gsIHIpO1xuICAgICAgICBkcmF3Q29udGV4dC5hcmNUbyh4LCAgIHkraCwgeCwgICB5LCAgIHIpO1xuICAgICAgICBkcmF3Q29udGV4dC5hcmNUbyh4LCAgIHksICAgeCt3LCB5LCAgIHIpO1xuICAgICAgICBkcmF3Q29udGV4dC5jbG9zZVBhdGgoKTtcblxuLy8gICAgICAyKSBVbmNvbW1lbnQgdGhpcyBsaW5lIHRvIHVzZSBDb21wb3NpdGUgT3BlcmF0aW9uLCB3aGljaCBpcyBkb2luZyB0aGVcbi8vICAgICAgc2FtZSBhcyB0aGUgY2xpcCBmdW5jdGlvbiBiZWxvdyBhbmQgaXMgYWxzbyBhbnRpYWxpYXNpbmcgdGhlIHJvdW5kXG4vLyAgICAgIGJvcmRlciwgYnV0IGlzIHNhaWQgdG8gYmUgbGVzcyBmYXN0IHBlcmZvcm1hbmNlIHdpc2UuXG5cbi8vICAgICAgZHJhd0NvbnRleHQuZmlsbCgpO1xuXG4gICAgICAgIC8vIENvbW1lbnQgdGhlc2UgdHdvIGxpbmVzIGlmIGNob29zaW5nIHRvIGRvIHRoZSBzYW1lIHdpdGggY29tcG9zaXRlXG4gICAgICAgIC8vIG9wZXJhdGlvbiBhYm92ZSAxIGFuZCAyLlxuICAgICAgICBkcmF3Q29udGV4dC5jbGlwKCk7XG4gICAgICAgIGRyYXdDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCAyNzcsIDIwMCk7XG5cbiAgICAgICAgLy8gUmVzdG9yZSB0aGUgcHJldmlvdXMgY29udGV4dCBzdGF0ZS5cbiAgICAgICAgZHJhd0NvbnRleHQucmVzdG9yZSgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDbG9uZXMgdGhlIGdpdmVuIGNhbnZhcy5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gdGhlIG5ldyBjbG9uZWQgY2FudmFzLlxuICAgICAqL1xuICAgIG15LmNsb25lQ2FudmFzID0gZnVuY3Rpb24gKG9sZENhbnZhcykge1xuICAgICAgICAvKlxuICAgICAgICAgKiBGSVhNRSBUZXN0aW5nIGhhcyBzaG93biB0aGF0IG9sZENhbnZhcyBtYXkgbm90IGV4aXN0LiBJbiBzdWNoIGEgY2FzZSxcbiAgICAgICAgICogdGhlIG1ldGhvZCBDYW52YXNVdGlsLmNsb25lQ2FudmFzIG1heSB0aHJvdyBhbiBlcnJvci4gU2luY2UgYXVkaW9cbiAgICAgICAgICogbGV2ZWxzIGFyZSBmcmVxdWVudGx5IHVwZGF0ZWQsIHRoZSBlcnJvcnMgaGF2ZSBiZWVuIG9ic2VydmVkIHRvIHBpbGVcbiAgICAgICAgICogaW50byB0aGUgY29uc29sZSwgc3RyYWluIHRoZSBDUFUuXG4gICAgICAgICAqL1xuICAgICAgICBpZiAoIW9sZENhbnZhcylcbiAgICAgICAgICAgIHJldHVybiBvbGRDYW52YXM7XG5cbiAgICAgICAgLy9jcmVhdGUgYSBuZXcgY2FudmFzXG4gICAgICAgIHZhciBuZXdDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgdmFyIGNvbnRleHQgPSBuZXdDYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgICAgICAvL3NldCBkaW1lbnNpb25zXG4gICAgICAgIG5ld0NhbnZhcy53aWR0aCA9IG9sZENhbnZhcy53aWR0aDtcbiAgICAgICAgbmV3Q2FudmFzLmhlaWdodCA9IG9sZENhbnZhcy5oZWlnaHQ7XG5cbiAgICAgICAgLy9hcHBseSB0aGUgb2xkIGNhbnZhcyB0byB0aGUgbmV3IG9uZVxuICAgICAgICBjb250ZXh0LmRyYXdJbWFnZShvbGRDYW52YXMsIDAsIDApO1xuXG4gICAgICAgIC8vcmV0dXJuIHRoZSBuZXcgY2FudmFzXG4gICAgICAgIHJldHVybiBuZXdDYW52YXM7XG4gICAgfTtcblxuICAgIHJldHVybiBteTtcbn0pKENhbnZhc1V0aWwgfHwge30pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbnZhc1V0aWw7XG4iLCIvKiBnbG9iYWwgJCwgVXRpbCwgY29ubmVjdGlvbiwgbmlja25hbWU6dHJ1ZSwgZ2V0VmlkZW9TaXplLCBnZXRWaWRlb1Bvc2l0aW9uLCBzaG93VG9vbGJhciwgcHJvY2Vzc1JlcGxhY2VtZW50cyAqL1xudmFyIFJlcGxhY2VtZW50ID0gcmVxdWlyZShcIi4vUmVwbGFjZW1lbnQuanNcIik7XG52YXIgZGVwID0ge1xuICAgIFwiVmlkZW9MYXlvdXRcIjogZnVuY3Rpb24oKXsgcmV0dXJuIHJlcXVpcmUoXCIuLi9WaWRlb0xheW91dFwiKX0sXG4gICAgXCJUb29sYmFyXCI6IGZ1bmN0aW9uKCl7cmV0dXJuIHJlcXVpcmUoXCIuLi90b29sYmFycy9Ub29sYmFyXCIpfVxufTtcbi8qKlxuICogQ2hhdCByZWxhdGVkIHVzZXIgaW50ZXJmYWNlLlxuICovXG52YXIgQ2hhdCA9IChmdW5jdGlvbiAobXkpIHtcbiAgICB2YXIgbm90aWZpY2F0aW9uSW50ZXJ2YWwgPSBmYWxzZTtcbiAgICB2YXIgdW5yZWFkTWVzc2FnZXMgPSAwO1xuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgY2hhdCByZWxhdGVkIGludGVyZmFjZS5cbiAgICAgKi9cbiAgICBteS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc3RvcmVkRGlzcGxheU5hbWUgPSB3aW5kb3cubG9jYWxTdG9yYWdlLmRpc3BsYXluYW1lO1xuICAgICAgICBpZiAoc3RvcmVkRGlzcGxheU5hbWUpIHtcbiAgICAgICAgICAgIG5pY2tuYW1lID0gc3RvcmVkRGlzcGxheU5hbWU7XG5cbiAgICAgICAgICAgIENoYXQuc2V0Q2hhdENvbnZlcnNhdGlvbk1vZGUodHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAkKCcjbmlja2lucHV0Jykua2V5ZG93bihmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgdmFyIHZhbCA9IFV0aWwuZXNjYXBlSHRtbCh0aGlzLnZhbHVlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnZhbHVlID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKCFuaWNrbmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBuaWNrbmFtZSA9IHZhbDtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5kaXNwbGF5bmFtZSA9IG5pY2tuYW1lO1xuICAgICAgICAgICAgICAgICAgICAvL3RoaXMgc2hvdWxkIGJlIGNoYW5nZWRcbiAgICAgICAgICAgICAgICAgICAgY29ubmVjdGlvbi5lbXVjLmFkZERpc3BsYXlOYW1lVG9QcmVzZW5jZShuaWNrbmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Yy5zZW5kUHJlc2VuY2UoKTtcblxuICAgICAgICAgICAgICAgICAgICBDaGF0LnNldENoYXRDb252ZXJzYXRpb25Nb2RlKHRydWUpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJyN1c2VybXNnJykua2V5ZG93bihmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gdGhpcy52YWx1ZTtcbiAgICAgICAgICAgICAgICAkKCcjdXNlcm1zZycpLnZhbCgnJykudHJpZ2dlcignYXV0b3NpemUucmVzaXplJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5mb2N1cygpO1xuICAgICAgICAgICAgICAgIHZhciBjb21tYW5kID0gbmV3IENvbW1hbmRzUHJvY2Vzc29yKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZihjb21tYW5kLmlzQ29tbWFuZCgpKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZC5wcm9jZXNzQ29tbWFuZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAvL3RoaXMgc2hvdWxkIGJlIGNoYW5nZWRcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBVdGlsLmVzY2FwZUh0bWwodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuc2VuZE1lc3NhZ2UobWVzc2FnZSwgbmlja25hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIG9uVGV4dEFyZWFSZXNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXNpemVDaGF0Q29udmVyc2F0aW9uKCk7XG4gICAgICAgICAgICBzY3JvbGxDaGF0VG9Cb3R0b20oKTtcbiAgICAgICAgfTtcbiAgICAgICAgJCgnI3VzZXJtc2cnKS5hdXRvc2l6ZSh7Y2FsbGJhY2s6IG9uVGV4dEFyZWFSZXNpemV9KTtcblxuICAgICAgICAkKFwiI2NoYXRzcGFjZVwiKS5iaW5kKFwic2hvd25cIixcbiAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY3JvbGxDaGF0VG9Cb3R0b20oKTtcbiAgICAgICAgICAgICAgICB1bnJlYWRNZXNzYWdlcyA9IDA7XG4gICAgICAgICAgICAgICAgc2V0VmlzdWFsTm90aWZpY2F0aW9uKGZhbHNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBcHBlbmRzIHRoZSBnaXZlbiBtZXNzYWdlIHRvIHRoZSBjaGF0IGNvbnZlcnNhdGlvbi5cbiAgICAgKi9cbiAgICBteS51cGRhdGVDaGF0Q29udmVyc2F0aW9uID0gZnVuY3Rpb24gKGZyb20sIGRpc3BsYXlOYW1lLCBtZXNzYWdlKSB7XG4gICAgICAgIHZhciBkaXZDbGFzc05hbWUgPSAnJztcblxuICAgICAgICBpZiAoY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZCA9PT0gZnJvbSkge1xuICAgICAgICAgICAgZGl2Q2xhc3NOYW1lID0gXCJsb2NhbHVzZXJcIjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGRpdkNsYXNzTmFtZSA9IFwicmVtb3RldXNlclwiO1xuXG4gICAgICAgICAgICBpZiAoIUNoYXQuaXNWaXNpYmxlKCkpIHtcbiAgICAgICAgICAgICAgICB1bnJlYWRNZXNzYWdlcysrO1xuICAgICAgICAgICAgICAgIFV0aWwucGxheVNvdW5kTm90aWZpY2F0aW9uKCdjaGF0Tm90aWZpY2F0aW9uJyk7XG4gICAgICAgICAgICAgICAgc2V0VmlzdWFsTm90aWZpY2F0aW9uKHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy9yZXBsYWNlIGxpbmtzIGFuZCBzbWlsZXlzXG4gICAgICAgIHZhciBlc2NNZXNzYWdlID0gVXRpbC5lc2NhcGVIdG1sKG1lc3NhZ2UpO1xuICAgICAgICB2YXIgZXNjRGlzcGxheU5hbWUgPSBVdGlsLmVzY2FwZUh0bWwoZGlzcGxheU5hbWUpO1xuICAgICAgICBtZXNzYWdlID0gUmVwbGFjZW1lbnQucHJvY2Vzc1JlcGxhY2VtZW50cyhlc2NNZXNzYWdlKTtcblxuICAgICAgICAkKCcjY2hhdGNvbnZlcnNhdGlvbicpLmFwcGVuZCgnPGRpdiBjbGFzcz1cIicgKyBkaXZDbGFzc05hbWUgKyAnXCI+PGI+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVzY0Rpc3BsYXlOYW1lICsgJzogPC9iPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICsgJzwvZGl2PicpO1xuICAgICAgICAkKCcjY2hhdGNvbnZlcnNhdGlvbicpLmFuaW1hdGUoXG4gICAgICAgICAgICAgICAgeyBzY3JvbGxUb3A6ICQoJyNjaGF0Y29udmVyc2F0aW9uJylbMF0uc2Nyb2xsSGVpZ2h0fSwgMTAwMCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFwcGVuZHMgZXJyb3IgbWVzc2FnZSB0byB0aGUgY29udmVyc2F0aW9uXG4gICAgICogQHBhcmFtIGVycm9yTWVzc2FnZSB0aGUgcmVjZWl2ZWQgZXJyb3IgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0gb3JpZ2luYWxUZXh0IHRoZSBvcmlnaW5hbCBtZXNzYWdlLlxuICAgICAqL1xuICAgIG15LmNoYXRBZGRFcnJvciA9IGZ1bmN0aW9uKGVycm9yTWVzc2FnZSwgb3JpZ2luYWxUZXh0KVxuICAgIHtcbiAgICAgICAgZXJyb3JNZXNzYWdlID0gVXRpbC5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSk7XG4gICAgICAgIG9yaWdpbmFsVGV4dCA9IFV0aWwuZXNjYXBlSHRtbChvcmlnaW5hbFRleHQpO1xuXG4gICAgICAgICQoJyNjaGF0Y29udmVyc2F0aW9uJykuYXBwZW5kKCc8ZGl2IGNsYXNzPVwiZXJyb3JNZXNzYWdlXCI+PGI+RXJyb3I6IDwvYj4nXG4gICAgICAgICAgICArICdZb3VyIG1lc3NhZ2UnICsgKG9yaWdpbmFsVGV4dD8gKCcgXFxcIicrIG9yaWdpbmFsVGV4dCArICdcXFwiJykgOiBcIlwiKVxuICAgICAgICAgICAgKyAnIHdhcyBub3Qgc2VudC4nICsgKGVycm9yTWVzc2FnZT8gKCcgUmVhc29uOiAnICsgZXJyb3JNZXNzYWdlKSA6ICcnKVxuICAgICAgICAgICAgKyAgJzwvZGl2PicpO1xuICAgICAgICAkKCcjY2hhdGNvbnZlcnNhdGlvbicpLmFuaW1hdGUoXG4gICAgICAgICAgICB7IHNjcm9sbFRvcDogJCgnI2NoYXRjb252ZXJzYXRpb24nKVswXS5zY3JvbGxIZWlnaHR9LCAxMDAwKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgc3ViamVjdCB0byB0aGUgVUlcbiAgICAgKiBAcGFyYW0gc3ViamVjdCB0aGUgc3ViamVjdFxuICAgICAqL1xuICAgIG15LmNoYXRTZXRTdWJqZWN0ID0gZnVuY3Rpb24oc3ViamVjdClcbiAgICB7XG4gICAgICAgIGlmKHN1YmplY3QpXG4gICAgICAgICAgICBzdWJqZWN0ID0gc3ViamVjdC50cmltKCk7XG4gICAgICAgICQoJyNzdWJqZWN0JykuaHRtbChSZXBsYWNlbWVudC5saW5raWZ5KFV0aWwuZXNjYXBlSHRtbChzdWJqZWN0KSkpO1xuICAgICAgICBpZihzdWJqZWN0ID09IFwiXCIpXG4gICAgICAgIHtcbiAgICAgICAgICAgICQoXCIjc3ViamVjdFwiKS5jc3Moe2Rpc3BsYXk6IFwibm9uZVwifSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZVxuICAgICAgICB7XG4gICAgICAgICAgICAkKFwiI3N1YmplY3RcIikuY3NzKHtkaXNwbGF5OiBcImJsb2NrXCJ9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBPcGVucyAvIGNsb3NlcyB0aGUgY2hhdCBhcmVhLlxuICAgICAqL1xuICAgIG15LnRvZ2dsZUNoYXQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgdmFyIGNoYXRzcGFjZSA9ICQoJyNjaGF0c3BhY2UnKTtcblxuICAgICAgICB2YXIgY2hhdFNpemUgPSAoY2hhdHNwYWNlLmlzKFwiOnZpc2libGVcIikpID8gWzAsIDBdIDogQ2hhdC5nZXRDaGF0U2l6ZSgpO1xuICAgICAgICBkZXAuVmlkZW9MYXlvdXQoKS5yZXNpemVWaWRlb1NwYWNlKGNoYXRzcGFjZSwgY2hhdFNpemUsIGNoYXRzcGFjZS5pcyhcIjp2aXNpYmxlXCIpKTtcblxuICAgICAgICAvLyBGaXggbWU6IFNob3VsZCBiZSBjYWxsZWQgYXMgY2FsbGJhY2sgb2Ygc2hvdyBhbmltYXRpb25cblxuICAgICAgICAvLyBSZXF1ZXN0IHRoZSBmb2N1cyBpbiB0aGUgbmlja25hbWUgZmllbGQgb3IgdGhlIGNoYXQgaW5wdXQgZmllbGQuXG4gICAgICAgIGlmICgkKCcjbmlja25hbWUnKS5jc3MoJ3Zpc2liaWxpdHknKSA9PT0gJ3Zpc2libGUnKSB7XG4gICAgICAgICAgICAkKCcjbmlja2lucHV0JykuZm9jdXMoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJyN1c2VybXNnJykuZm9jdXMoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBjaGF0IGNvbnZlcnNhdGlvbiBtb2RlLlxuICAgICAqL1xuICAgIG15LnNldENoYXRDb252ZXJzYXRpb25Nb2RlID0gZnVuY3Rpb24gKGlzQ29udmVyc2F0aW9uTW9kZSkge1xuICAgICAgICBpZiAoaXNDb252ZXJzYXRpb25Nb2RlKSB7XG4gICAgICAgICAgICAkKCcjbmlja25hbWUnKS5jc3Moe3Zpc2liaWxpdHk6ICdoaWRkZW4nfSk7XG4gICAgICAgICAgICAkKCcjY2hhdGNvbnZlcnNhdGlvbicpLmNzcyh7dmlzaWJpbGl0eTogJ3Zpc2libGUnfSk7XG4gICAgICAgICAgICAkKCcjdXNlcm1zZycpLmNzcyh7dmlzaWJpbGl0eTogJ3Zpc2libGUnfSk7XG4gICAgICAgICAgICAkKCcjdXNlcm1zZycpLmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVzaXplcyB0aGUgY2hhdCBhcmVhLlxuICAgICAqL1xuICAgIG15LnJlc2l6ZUNoYXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjaGF0U2l6ZSA9IENoYXQuZ2V0Q2hhdFNpemUoKTtcblxuICAgICAgICAkKCcjY2hhdHNwYWNlJykud2lkdGgoY2hhdFNpemVbMF0pO1xuICAgICAgICAkKCcjY2hhdHNwYWNlJykuaGVpZ2h0KGNoYXRTaXplWzFdKTtcblxuICAgICAgICByZXNpemVDaGF0Q29udmVyc2F0aW9uKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHNpemUgb2YgdGhlIGNoYXQuXG4gICAgICovXG4gICAgbXkuZ2V0Q2hhdFNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBhdmFpbGFibGVIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIHZhciBhdmFpbGFibGVXaWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoO1xuXG4gICAgICAgIHZhciBjaGF0V2lkdGggPSAyMDA7XG4gICAgICAgIGlmIChhdmFpbGFibGVXaWR0aCAqIDAuMiA8IDIwMClcbiAgICAgICAgICAgIGNoYXRXaWR0aCA9IGF2YWlsYWJsZVdpZHRoICogMC4yO1xuXG4gICAgICAgIHJldHVybiBbY2hhdFdpZHRoLCBhdmFpbGFibGVIZWlnaHRdO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBJbmRpY2F0ZXMgaWYgdGhlIGNoYXQgaXMgY3VycmVudGx5IHZpc2libGUuXG4gICAgICovXG4gICAgbXkuaXNWaXNpYmxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJCgnI2NoYXRzcGFjZScpLmlzKFwiOnZpc2libGVcIik7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlc2l6ZXMgdGhlIGNoYXQgY29udmVyc2F0aW9uLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJlc2l6ZUNoYXRDb252ZXJzYXRpb24oKSB7XG4gICAgICAgIHZhciB1c2VybXNnU3R5bGVIZWlnaHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInVzZXJtc2dcIikuc3R5bGUuaGVpZ2h0O1xuICAgICAgICB2YXIgdXNlcm1zZ0hlaWdodCA9IHVzZXJtc2dTdHlsZUhlaWdodFxuICAgICAgICAgICAgLnN1YnN0cmluZygwLCB1c2VybXNnU3R5bGVIZWlnaHQuaW5kZXhPZigncHgnKSk7XG5cbiAgICAgICAgJCgnI3VzZXJtc2cnKS53aWR0aCgkKCcjY2hhdHNwYWNlJykud2lkdGgoKSAtIDEwKTtcbiAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKS53aWR0aCgkKCcjY2hhdHNwYWNlJykud2lkdGgoKSAtIDEwKTtcbiAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKVxuICAgICAgICAgICAgLmhlaWdodCh3aW5kb3cuaW5uZXJIZWlnaHQgLSAxMCAtIHBhcnNlSW50KHVzZXJtc2dIZWlnaHQpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTaG93cy9oaWRlcyBhIHZpc3VhbCBub3RpZmljYXRpb24sIGluZGljYXRpbmcgdGhhdCBhIG1lc3NhZ2UgaGFzIGFycml2ZWQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2V0VmlzdWFsTm90aWZpY2F0aW9uKHNob3cpIHtcbiAgICAgICAgdmFyIHVucmVhZE1zZ0VsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndW5yZWFkTWVzc2FnZXMnKTtcblxuICAgICAgICB2YXIgZ2xvd2VyID0gJCgnI2NoYXRCdXR0b24nKTtcblxuICAgICAgICBpZiAodW5yZWFkTWVzc2FnZXMpIHtcbiAgICAgICAgICAgIHVucmVhZE1zZ0VsZW1lbnQuaW5uZXJIVE1MID0gdW5yZWFkTWVzc2FnZXMudG9TdHJpbmcoKTtcblxuICAgICAgICAgICAgZGVwLlRvb2xiYXIoKS5kb2NrVG9vbGJhcih0cnVlKTtcblxuICAgICAgICAgICAgdmFyIGNoYXRCdXR0b25FbGVtZW50XG4gICAgICAgICAgICAgICAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hhdEJ1dHRvbicpLnBhcmVudE5vZGU7XG4gICAgICAgICAgICB2YXIgbGVmdEluZGVudCA9IChVdGlsLmdldFRleHRXaWR0aChjaGF0QnV0dG9uRWxlbWVudCkgLVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVXRpbC5nZXRUZXh0V2lkdGgodW5yZWFkTXNnRWxlbWVudCkpIC8gMjtcbiAgICAgICAgICAgIHZhciB0b3BJbmRlbnQgPSAoVXRpbC5nZXRUZXh0SGVpZ2h0KGNoYXRCdXR0b25FbGVtZW50KSAtXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFV0aWwuZ2V0VGV4dEhlaWdodCh1bnJlYWRNc2dFbGVtZW50KSkgLyAyIC0gMztcblxuICAgICAgICAgICAgdW5yZWFkTXNnRWxlbWVudC5zZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgICAgICAgICdzdHlsZScsXG4gICAgICAgICAgICAgICAgICAgICd0b3A6JyArIHRvcEluZGVudCArXG4gICAgICAgICAgICAgICAgICAgICc7IGxlZnQ6JyArIGxlZnRJbmRlbnQgKyAnOycpO1xuXG4gICAgICAgICAgICBpZiAoIWdsb3dlci5oYXNDbGFzcygnaWNvbi1jaGF0LXNpbXBsZScpKSB7XG4gICAgICAgICAgICAgICAgZ2xvd2VyLnJlbW92ZUNsYXNzKCdpY29uLWNoYXQnKTtcbiAgICAgICAgICAgICAgICBnbG93ZXIuYWRkQ2xhc3MoJ2ljb24tY2hhdC1zaW1wbGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHVucmVhZE1zZ0VsZW1lbnQuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgICAgICBnbG93ZXIucmVtb3ZlQ2xhc3MoJ2ljb24tY2hhdC1zaW1wbGUnKTtcbiAgICAgICAgICAgIGdsb3dlci5hZGRDbGFzcygnaWNvbi1jaGF0Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc2hvdyAmJiAhbm90aWZpY2F0aW9uSW50ZXJ2YWwpIHtcbiAgICAgICAgICAgIG5vdGlmaWNhdGlvbkludGVydmFsID0gd2luZG93LnNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBnbG93ZXIudG9nZ2xlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfSwgODAwKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghc2hvdyAmJiBub3RpZmljYXRpb25JbnRlcnZhbCkge1xuICAgICAgICAgICAgd2luZG93LmNsZWFySW50ZXJ2YWwobm90aWZpY2F0aW9uSW50ZXJ2YWwpO1xuICAgICAgICAgICAgbm90aWZpY2F0aW9uSW50ZXJ2YWwgPSBmYWxzZTtcbiAgICAgICAgICAgIGdsb3dlci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTY3JvbGxzIGNoYXQgdG8gdGhlIGJvdHRvbS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzY3JvbGxDaGF0VG9Cb3R0b20oKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKS5zY3JvbGxUb3AoXG4gICAgICAgICAgICAgICAgICAgICQoJyNjaGF0Y29udmVyc2F0aW9uJylbMF0uc2Nyb2xsSGVpZ2h0KTtcbiAgICAgICAgfSwgNSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG15O1xufShDaGF0IHx8IHt9KSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2hhdDtcbiIsIlxudmFyIFJlcGxhY2VtZW50ID0gZnVuY3Rpb24oKVxue1xuICAgIC8qKlxuICAgICAqIFJlcGxhY2VzIGNvbW1vbiBzbWlsZXkgc3RyaW5ncyB3aXRoIGltYWdlc1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNtaWxpZnkoYm9keSlcbiAgICB7XG4gICAgICAgIGlmKCFib2R5KVxuICAgICAgICAgICAgcmV0dXJuIGJvZHk7XG5cbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKDpcXCh8OlxcKFxcKHw6LVxcKFxcKHw6LVxcKHxcXChzYWRcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTErIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKGFuZ3J5XFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkyKyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChuXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkzKyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyg6LVxcKVxcKXw6XFwpXFwpfDstXFwpXFwpfDtcXClcXCl8XFwobG9sXFwpfDotRHw6RHw7LUR8O0QpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTQrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKDstXFwoXFwofDtcXChcXCh8Oy1cXCh8O1xcKHw6J1xcKHw6Jy1cXCh8On4tXFwofDp+XFwofFxcKHVwc2V0XFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXk1KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyg8M3wmbHQ7M3xcXChMXFwpfFxcKGxcXCl8XFwoSFxcKXxcXChoXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXk2KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChhbmdlbFxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5NysgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoYm9tYlxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5OCsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoY2h1Y2tsZVxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5OSsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoeVxcKXxcXChZXFwpfFxcKG9rXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxMCsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oOy1cXCl8O1xcKXw6LVxcKXw6XFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxMSsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoYmx1c2hcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTEyKyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyg6LVxcKnw6XFwqfFxcKGtpc3NcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTEzKyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChzZWFyY2hcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTE0KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXCh3YXZlXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxNSsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoY2xhcFxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MTYrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKHNpY2tcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTE3KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyg6LVB8OlB8Oi1wfDpwKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxOCsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oOi1cXDB8XFwoc2hvY2tlZFxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MTkrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKG9vcHNcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTIwKyBcIj5cIik7XG5cbiAgICAgICAgcmV0dXJuIGJvZHk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gUmVwbGFjZW1lbnRQcm90bygpIHtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFByb2Nlc3NlcyBsaW5rcyBhbmQgc21pbGV5cyBpbiBcImJvZHlcIlxuICAgICAqL1xuICAgIFJlcGxhY2VtZW50UHJvdG8ucHJvY2Vzc1JlcGxhY2VtZW50cyA9IGZ1bmN0aW9uKGJvZHkpXG4gICAge1xuICAgICAgICAvL21ha2UgbGlua3MgY2xpY2thYmxlXG4gICAgICAgIGJvZHkgPSBSZXBsYWNlbWVudFByb3RvLmxpbmtpZnkoYm9keSk7XG5cbiAgICAgICAgLy9hZGQgc21pbGV5c1xuICAgICAgICBib2R5ID0gc21pbGlmeShib2R5KTtcblxuICAgICAgICByZXR1cm4gYm9keTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaW5kcyBhbmQgcmVwbGFjZXMgYWxsIGxpbmtzIGluIHRoZSBsaW5rcyBpbiBcImJvZHlcIlxuICAgICAqIHdpdGggdGhlaXIgPGEgaHJlZj1cIlwiPjwvYT5cbiAgICAgKi9cbiAgICBSZXBsYWNlbWVudFByb3RvLmxpbmtpZnkgPSBmdW5jdGlvbihpbnB1dFRleHQpXG4gICAge1xuICAgICAgICB2YXIgcmVwbGFjZWRUZXh0LCByZXBsYWNlUGF0dGVybjEsIHJlcGxhY2VQYXR0ZXJuMiwgcmVwbGFjZVBhdHRlcm4zO1xuXG4gICAgICAgIC8vVVJMcyBzdGFydGluZyB3aXRoIGh0dHA6Ly8sIGh0dHBzOi8vLCBvciBmdHA6Ly9cbiAgICAgICAgcmVwbGFjZVBhdHRlcm4xID0gLyhcXGIoaHR0cHM/fGZ0cCk6XFwvXFwvWy1BLVowLTkrJkAjXFwvJT89fl98ITosLjtdKlstQS1aMC05KyZAI1xcLyU9fl98XSkvZ2ltO1xuICAgICAgICByZXBsYWNlZFRleHQgPSBpbnB1dFRleHQucmVwbGFjZShyZXBsYWNlUGF0dGVybjEsICc8YSBocmVmPVwiJDFcIiB0YXJnZXQ9XCJfYmxhbmtcIj4kMTwvYT4nKTtcblxuICAgICAgICAvL1VSTHMgc3RhcnRpbmcgd2l0aCBcInd3dy5cIiAod2l0aG91dCAvLyBiZWZvcmUgaXQsIG9yIGl0J2QgcmUtbGluayB0aGUgb25lcyBkb25lIGFib3ZlKS5cbiAgICAgICAgcmVwbGFjZVBhdHRlcm4yID0gLyhefFteXFwvXSkod3d3XFwuW1xcU10rKFxcYnwkKSkvZ2ltO1xuICAgICAgICByZXBsYWNlZFRleHQgPSByZXBsYWNlZFRleHQucmVwbGFjZShyZXBsYWNlUGF0dGVybjIsICckMTxhIGhyZWY9XCJodHRwOi8vJDJcIiB0YXJnZXQ9XCJfYmxhbmtcIj4kMjwvYT4nKTtcblxuICAgICAgICAvL0NoYW5nZSBlbWFpbCBhZGRyZXNzZXMgdG8gbWFpbHRvOjogbGlua3MuXG4gICAgICAgIHJlcGxhY2VQYXR0ZXJuMyA9IC8oKFthLXpBLVowLTlcXC1cXF9cXC5dKStAW2EtekEtWlxcX10rPyhcXC5bYS16QS1aXXsyLDZ9KSspL2dpbTtcbiAgICAgICAgcmVwbGFjZWRUZXh0ID0gcmVwbGFjZWRUZXh0LnJlcGxhY2UocmVwbGFjZVBhdHRlcm4zLCAnPGEgaHJlZj1cIm1haWx0bzokMVwiPiQxPC9hPicpO1xuXG4gICAgICAgIHJldHVybiByZXBsYWNlZFRleHQ7XG4gICAgfVxuICAgIHJldHVybiBSZXBsYWNlbWVudFByb3RvO1xufSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlcGxhY2VtZW50O1xuXG5cblxuIiwiLyogZ2xvYmFsICQsIGNvbmZpZywgUHJlemksIFV0aWwsIGNvbm5lY3Rpb24sIHNldExhcmdlVmlkZW9WaXNpYmxlLCBkb2NrVG9vbGJhciAqL1xudmFyIFByZXppID0gcmVxdWlyZShcIi4uL3ByZXppL1ByZXppLmpzXCIpO1xudmFyIFVJVXRpbCA9IHJlcXVpcmUoXCIuLi9VSVV0aWwuanNcIik7XG52YXIgVG9vbGJhclRvZ2dsZXIgPSByZXF1aXJlKFwiLi4vdG9vbGJhcnMvdG9vbGJhcl90b2dnbGVyXCIpO1xuXG52YXIgRXRoZXJwYWQgPSAoZnVuY3Rpb24gKG15KSB7XG4gICAgdmFyIGV0aGVycGFkTmFtZSA9IG51bGw7XG4gICAgdmFyIGV0aGVycGFkSUZyYW1lID0gbnVsbDtcbiAgICB2YXIgZG9tYWluID0gbnVsbDtcbiAgICB2YXIgb3B0aW9ucyA9IFwiP3Nob3dDb250cm9scz10cnVlJnNob3dDaGF0PWZhbHNlJnNob3dMaW5lTnVtYmVycz10cnVlJnVzZU1vbm9zcGFjZUZvbnQ9ZmFsc2VcIjtcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBldGhlcnBhZC5cbiAgICAgKi9cbiAgICBteS5pbml0ID0gZnVuY3Rpb24gKG5hbWUpIHtcblxuICAgICAgICBpZiAoY29uZmlnLmV0aGVycGFkX2Jhc2UgJiYgIWV0aGVycGFkTmFtZSkge1xuXG4gICAgICAgICAgICBkb21haW4gPSBjb25maWcuZXRoZXJwYWRfYmFzZTtcblxuICAgICAgICAgICAgaWYgKCFuYW1lKSB7XG4gICAgICAgICAgICAgICAgLy8gSW4gY2FzZSB3ZSdyZSB0aGUgZm9jdXMgd2UgZ2VuZXJhdGUgdGhlIG5hbWUuXG4gICAgICAgICAgICAgICAgZXRoZXJwYWROYW1lID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ18nICsgKG5ldyBEYXRlKCkuZ2V0VGltZSgpKS50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgIHNoYXJlRXRoZXJwYWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBldGhlcnBhZE5hbWUgPSBuYW1lO1xuXG4gICAgICAgICAgICBlbmFibGVFdGhlcnBhZEJ1dHRvbigpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIE9wZW5zL2hpZGVzIHRoZSBFdGhlcnBhZC5cbiAgICAgKi9cbiAgICBteS50b2dnbGVFdGhlcnBhZCA9IGZ1bmN0aW9uIChpc1ByZXNlbnRhdGlvbikge1xuICAgICAgICBpZiAoIWV0aGVycGFkSUZyYW1lKVxuICAgICAgICAgICAgY3JlYXRlSUZyYW1lKCk7XG5cbiAgICAgICAgdmFyIGxhcmdlVmlkZW8gPSBudWxsO1xuICAgICAgICBpZiAoUHJlemkuaXNQcmVzZW50YXRpb25WaXNpYmxlKCkpXG4gICAgICAgICAgICBsYXJnZVZpZGVvID0gJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgbGFyZ2VWaWRlbyA9ICQoJyNsYXJnZVZpZGVvJyk7XG5cbiAgICAgICAgaWYgKCQoJyNldGhlcnBhZD5pZnJhbWUnKS5jc3MoJ3Zpc2liaWxpdHknKSA9PT0gJ2hpZGRlbicpIHtcbiAgICAgICAgICAgIGxhcmdlVmlkZW8uZmFkZU91dCgzMDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoUHJlemkuaXNQcmVzZW50YXRpb25WaXNpYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGFyZ2VWaWRlby5jc3Moe29wYWNpdHk6ICcwJ30pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNldExhcmdlVmlkZW9WaXNpYmxlKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgVG9vbGJhclRvZ2dsZXIuZG9ja1Rvb2xiYXIodHJ1ZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJCgnI2V0aGVycGFkPmlmcmFtZScpLmZhZGVJbigzMDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5iYWNrZ3JvdW5kID0gJyNlZWVlZWUnO1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXRoZXJwYWQ+aWZyYW1lJykuY3NzKHt2aXNpYmlsaXR5OiAndmlzaWJsZSd9KTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V0aGVycGFkJykuY3NzKHt6SW5kZXg6IDJ9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCQoJyNldGhlcnBhZD5pZnJhbWUnKSkge1xuICAgICAgICAgICAgJCgnI2V0aGVycGFkPmlmcmFtZScpLmZhZGVPdXQoMzAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgJCgnI2V0aGVycGFkPmlmcmFtZScpLmNzcyh7dmlzaWJpbGl0eTogJ2hpZGRlbid9KTtcbiAgICAgICAgICAgICAgICAkKCcjZXRoZXJwYWQnKS5jc3Moe3pJbmRleDogMH0pO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuc3R5bGUuYmFja2dyb3VuZCA9ICdibGFjayc7XG4gICAgICAgICAgICAgICAgaWYgKCFpc1ByZXNlbnRhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAkKCcjbGFyZ2VWaWRlbycpLmZhZGVJbigzMDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNldExhcmdlVmlkZW9WaXNpYmxlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgVG9vbGJhclRvZ2dsZXIuZG9ja1Rvb2xiYXIoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXNpemUoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVzaXplcyB0aGUgZXRoZXJwYWQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVzaXplKCkge1xuICAgICAgICBpZiAoJCgnI2V0aGVycGFkPmlmcmFtZScpLmxlbmd0aCkge1xuICAgICAgICAgICAgdmFyIHJlbW90ZVZpZGVvcyA9ICQoJyNyZW1vdGVWaWRlb3MnKTtcbiAgICAgICAgICAgIHZhciBhdmFpbGFibGVIZWlnaHRcbiAgICAgICAgICAgICAgICA9IHdpbmRvdy5pbm5lckhlaWdodCAtIHJlbW90ZVZpZGVvcy5vdXRlckhlaWdodCgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coVUlVdGlsKTtcbiAgICAgICAgICAgIHZhciBhdmFpbGFibGVXaWR0aCA9IFVJVXRpbC5nZXRBdmFpbGFibGVWaWRlb1dpZHRoKCk7XG5cbiAgICAgICAgICAgICQoJyNldGhlcnBhZD5pZnJhbWUnKS53aWR0aChhdmFpbGFibGVXaWR0aCk7XG4gICAgICAgICAgICAkKCcjZXRoZXJwYWQ+aWZyYW1lJykuaGVpZ2h0KGF2YWlsYWJsZUhlaWdodCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTaGFyZXMgdGhlIEV0aGVycGFkIG5hbWUgd2l0aCBvdGhlciBwYXJ0aWNpcGFudHMuXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2hhcmVFdGhlcnBhZCgpIHtcbiAgICAgICAgY29ubmVjdGlvbi5lbXVjLmFkZEV0aGVycGFkVG9QcmVzZW5jZShldGhlcnBhZE5hbWUpO1xuICAgICAgICBjb25uZWN0aW9uLmVtdWMuc2VuZFByZXNlbmNlKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyB0aGUgRXRoZXJwYWQgYnV0dG9uIGFuZCBhZGRzIGl0IHRvIHRoZSB0b29sYmFyLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGVuYWJsZUV0aGVycGFkQnV0dG9uKCkge1xuICAgICAgICBpZiAoISQoJyNldGhlcnBhZEJ1dHRvbicpLmlzKFwiOnZpc2libGVcIikpXG4gICAgICAgICAgICAkKCcjZXRoZXJwYWRCdXR0b24nKS5jc3Moe2Rpc3BsYXk6ICdpbmxpbmUtYmxvY2snfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyB0aGUgSUZyYW1lIGZvciB0aGUgZXRoZXJwYWQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlSUZyYW1lKCkge1xuICAgICAgICBldGhlcnBhZElGcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lmcmFtZScpO1xuICAgICAgICBldGhlcnBhZElGcmFtZS5zcmMgPSBkb21haW4gKyBldGhlcnBhZE5hbWUgKyBvcHRpb25zO1xuICAgICAgICBldGhlcnBhZElGcmFtZS5mcmFtZUJvcmRlciA9IDA7XG4gICAgICAgIGV0aGVycGFkSUZyYW1lLnNjcm9sbGluZyA9IFwibm9cIjtcbiAgICAgICAgZXRoZXJwYWRJRnJhbWUud2lkdGggPSAkKCcjbGFyZ2VWaWRlb0NvbnRhaW5lcicpLndpZHRoKCkgfHwgNjQwO1xuICAgICAgICBldGhlcnBhZElGcmFtZS5oZWlnaHQgPSAkKCcjbGFyZ2VWaWRlb0NvbnRhaW5lcicpLmhlaWdodCgpIHx8IDQ4MDtcbiAgICAgICAgZXRoZXJwYWRJRnJhbWUuc2V0QXR0cmlidXRlKCdzdHlsZScsICd2aXNpYmlsaXR5OiBoaWRkZW47Jyk7XG5cbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2V0aGVycGFkJykuYXBwZW5kQ2hpbGQoZXRoZXJwYWRJRnJhbWUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE9uIEV0aGVycGFkIGFkZGVkIHRvIG11Yy5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdldGhlcnBhZGFkZGVkLm11YycsIGZ1bmN0aW9uIChldmVudCwgamlkLCBldGhlcnBhZE5hbWUpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJFdGhlcnBhZCBhZGRlZFwiLCBldGhlcnBhZE5hbWUpO1xuICAgICAgICBpZiAoY29uZmlnLmV0aGVycGFkX2Jhc2UgJiYgIWZvY3VzKSB7XG4gICAgICAgICAgICBFdGhlcnBhZC5pbml0KGV0aGVycGFkTmFtZSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIE9uIGZvY3VzIGNoYW5nZWQgZXZlbnQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgnZm9jdXNlY2hhbmdlZC5tdWMnLCBmdW5jdGlvbiAoZXZlbnQsIGZvY3VzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRm9jdXMgY2hhbmdlZFwiKTtcbiAgICAgICAgaWYgKGNvbmZpZy5ldGhlcnBhZF9iYXNlKVxuICAgICAgICAgICAgc2hhcmVFdGhlcnBhZCgpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogT24gdmlkZW8gc2VsZWN0ZWQgZXZlbnQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgndmlkZW8uc2VsZWN0ZWQnLCBmdW5jdGlvbiAoZXZlbnQsIGlzUHJlc2VudGF0aW9uKSB7XG4gICAgICAgIGlmICghY29uZmlnLmV0aGVycGFkX2Jhc2UpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgaWYgKGV0aGVycGFkSUZyYW1lICYmIGV0aGVycGFkSUZyYW1lLnN0eWxlLnZpc2liaWxpdHkgIT09ICdoaWRkZW4nKVxuICAgICAgICAgICAgRXRoZXJwYWQudG9nZ2xlRXRoZXJwYWQoaXNQcmVzZW50YXRpb24pO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogUmVzaXplcyB0aGUgZXRoZXJwYWQsIHdoZW4gdGhlIHdpbmRvdyBpcyByZXNpemVkLlxuICAgICAqL1xuICAgICQod2luZG93KS5yZXNpemUoZnVuY3Rpb24gKCkge1xuICAgICAgICByZXNpemUoKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBteTtcbn0oRXRoZXJwYWQgfHwge30pKTtcblxubW9kdWxlLmV4cG9ydHMgPSBFdGhlcnBhZDtcbiIsInZhciBCb3R0b21Ub29sYmFyID0gcmVxdWlyZShcIi4vdG9vbGJhcnMvQm90dG9tVG9vbGJhclwiKTtcblxudmFyIEtleWJvYXJkU2hvcnRjdXQgPSAoZnVuY3Rpb24obXkpIHtcbiAgICAvL21hcHMga2V5Y29kZSB0byBjaGFyYWN0ZXIsIGlkIG9mIHBvcG92ZXIgZm9yIGdpdmVuIGZ1bmN0aW9uIGFuZCBmdW5jdGlvblxuICAgIHZhciBzaG9ydGN1dHMgPSB7XG4gICAgICAgIDY3OiB7XG4gICAgICAgICAgICBjaGFyYWN0ZXI6IFwiQ1wiLFxuICAgICAgICAgICAgaWQ6IFwidG9nZ2xlQ2hhdFBvcG92ZXJcIixcbiAgICAgICAgICAgIGZ1bmN0aW9uOiBCb3R0b21Ub29sYmFyLnRvZ2dsZUNoYXRcbiAgICAgICAgfSxcbiAgICAgICAgNzA6IHtcbiAgICAgICAgICAgIGNoYXJhY3RlcjogXCJGXCIsXG4gICAgICAgICAgICBpZDogXCJmaWxtc3RyaXBQb3BvdmVyXCIsXG4gICAgICAgICAgICBmdW5jdGlvbjogQm90dG9tVG9vbGJhci50b2dnbGVGaWxtU3RyaXBcbiAgICAgICAgfSxcbiAgICAgICAgNzc6IHtcbiAgICAgICAgICAgIGNoYXJhY3RlcjogXCJNXCIsXG4gICAgICAgICAgICBpZDogXCJtdXRlUG9wb3ZlclwiLFxuICAgICAgICAgICAgZnVuY3Rpb246IHRvZ2dsZUF1ZGlvXG4gICAgICAgIH0sXG4gICAgICAgIDg0OiB7XG4gICAgICAgICAgICBjaGFyYWN0ZXI6IFwiVFwiLFxuICAgICAgICAgICAgZnVuY3Rpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmKCFpc0F1ZGlvTXV0ZWQoKSkge1xuICAgICAgICAgICAgICAgICAgICB0b2dnbGVBdWRpbygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgODY6IHtcbiAgICAgICAgICAgIGNoYXJhY3RlcjogXCJWXCIsXG4gICAgICAgICAgICBpZDogXCJ0b2dnbGVWaWRlb1BvcG92ZXJcIixcbiAgICAgICAgICAgIGZ1bmN0aW9uOiB0b2dnbGVWaWRlb1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHdpbmRvdy5vbmtleXVwID0gZnVuY3Rpb24oZSkge1xuICAgICAgICBpZighKCQoXCI6Zm9jdXNcIikuaXMoXCJpbnB1dFt0eXBlPXRleHRdXCIpIHx8ICQoXCI6Zm9jdXNcIikuaXMoXCJ0ZXh0YXJlYVwiKSkpIHtcbiAgICAgICAgICAgIHZhciBrZXljb2RlID0gZS53aGljaDtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc2hvcnRjdXRzW2tleWNvZGVdID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAgICAgc2hvcnRjdXRzW2tleWNvZGVdLmZ1bmN0aW9uKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGtleWNvZGUgPj0gXCIwXCIuY2hhckNvZGVBdCgwKSAmJiBrZXljb2RlIDw9IFwiOVwiLmNoYXJDb2RlQXQoMCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVtb3RlVmlkZW9zID0gJChcIi52aWRlb2NvbnRhaW5lcjpub3QoI21peGVkc3RyZWFtKVwiKSxcbiAgICAgICAgICAgICAgICAgICAgdmlkZW9XYW50ZWQgPSBrZXljb2RlIC0gXCIwXCIuY2hhckNvZGVBdCgwKSArIDE7XG4gICAgICAgICAgICAgICAgaWYgKHJlbW90ZVZpZGVvcy5sZW5ndGggPiB2aWRlb1dhbnRlZCkge1xuICAgICAgICAgICAgICAgICAgICByZW1vdGVWaWRlb3NbdmlkZW9XYW50ZWRdLmNsaWNrKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHdpbmRvdy5vbmtleWRvd24gPSBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmKCQoXCIjY2hhdHNwYWNlXCIpLmNzcyhcImRpc3BsYXlcIikgPT09IFwibm9uZVwiKSB7XG4gICAgICAgICAgICBpZihlLndoaWNoID09PSBcIlRcIi5jaGFyQ29kZUF0KDApKSB7XG4gICAgICAgICAgICAgICAgaWYoaXNBdWRpb011dGVkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9nZ2xlQXVkaW8oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqICBcbiAgICAgKiBAcGFyYW0gaWQgaW5kaWNhdGVzIHRoZSBwb3BvdmVyIGFzc29jaWF0ZWQgd2l0aCB0aGUgc2hvcnRjdXRcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSB0aGUga2V5Ym9hcmQgc2hvcnRjdXQgdXNlZCBmb3IgdGhlIGlkIGdpdmVuXG4gICAgICovXG4gICAgbXkuZ2V0U2hvcnRjdXQgPSBmdW5jdGlvbihpZCkge1xuICAgICAgICBmb3IodmFyIGtleWNvZGUgaW4gc2hvcnRjdXRzKSB7XG4gICAgICAgICAgICBpZihzaG9ydGN1dHMuaGFzT3duUHJvcGVydHkoa2V5Y29kZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2hvcnRjdXRzW2tleWNvZGVdLmlkID09PSBpZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCIgKFwiICsgc2hvcnRjdXRzW2tleWNvZGVdLmNoYXJhY3RlciArIFwiKVwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gXCJcIjtcbiAgICB9O1xuXG4gICAgbXkuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJCgnYm9keScpLnBvcG92ZXIoeyBzZWxlY3RvcjogJ1tkYXRhLXRvZ2dsZT1wb3BvdmVyXScsXG4gICAgICAgICAgICB0cmlnZ2VyOiAnY2xpY2sgaG92ZXInLFxuICAgICAgICAgICAgY29udGVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKFwiY29udGVudFwiKSArXG4gICAgICAgICAgICAgICAgICAgIEtleWJvYXJkU2hvcnRjdXQuZ2V0U2hvcnRjdXQodGhpcy5nZXRBdHRyaWJ1dGUoXCJzaG9ydGN1dFwiKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gbXk7XG59KEtleWJvYXJkU2hvcnRjdXQgfHwge30pKTtcblxubW9kdWxlLmV4cG9ydHMgPSBLZXlib2FyZFNob3J0Y3V0O1xuIiwidmFyIFByZXppUGxheWVyID0gcmVxdWlyZShcIi4vUHJlemlQbGF5ZXIuanNcIik7XG52YXIgVUlVdGlsID0gcmVxdWlyZShcIi4uL1VJVXRpbC5qc1wiKTtcbnZhciBUb29sYmFyVG9nZ2xlciA9IHJlcXVpcmUoXCIuLi90b29sYmFycy90b29sYmFyX3RvZ2dsZXJcIik7XG5cbnZhciBQcmV6aSA9IChmdW5jdGlvbiAobXkpIHtcbiAgICB2YXIgcHJlemlQbGF5ZXIgPSBudWxsO1xuXG4gICAgLyoqXG4gICAgICogUmVsb2FkcyB0aGUgY3VycmVudCBwcmVzZW50YXRpb24uXG4gICAgICovXG4gICAgbXkucmVsb2FkUHJlc2VudGF0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBpZnJhbWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChwcmV6aVBsYXllci5vcHRpb25zLnByZXppSWQpO1xuICAgICAgICBpZnJhbWUuc3JjID0gaWZyYW1lLnNyYztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2hvd3MvaGlkZXMgYSBwcmVzZW50YXRpb24uXG4gICAgICovXG4gICAgbXkuc2V0UHJlc2VudGF0aW9uVmlzaWJsZSA9IGZ1bmN0aW9uICh2aXNpYmxlKSB7XG4gICAgICAgIGlmICh2aXNpYmxlKSB7XG4gICAgICAgICAgICAvLyBUcmlnZ2VyIHRoZSB2aWRlby5zZWxlY3RlZCBldmVudCB0byBpbmRpY2F0ZSBhIGNoYW5nZSBpbiB0aGVcbiAgICAgICAgICAgIC8vIGxhcmdlIHZpZGVvLlxuICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcihcInZpZGVvLnNlbGVjdGVkXCIsIFt0cnVlXSk7XG5cbiAgICAgICAgICAgICQoJyNsYXJnZVZpZGVvJykuZmFkZU91dCgzMDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zZXRMYXJnZVZpZGVvVmlzaWJsZShmYWxzZSk7XG4gICAgICAgICAgICAgICAgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS5mYWRlSW4oMzAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS5jc3Moe29wYWNpdHk6JzEnfSk7XG4gICAgICAgICAgICAgICAgICAgIFRvb2xiYXJUb2dnbGVyLmRvY2tUb29sYmFyKHRydWUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAoJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS5jc3MoJ29wYWNpdHknKSA9PSAnMScpIHtcbiAgICAgICAgICAgICAgICAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLmZhZGVPdXQoMzAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykuY3NzKHtvcGFjaXR5OicwJ30pO1xuICAgICAgICAgICAgICAgICAgICAkKCcjcmVsb2FkUHJlc2VudGF0aW9uJykuY3NzKHtkaXNwbGF5Oidub25lJ30pO1xuICAgICAgICAgICAgICAgICAgICAkKCcjbGFyZ2VWaWRlbycpLmZhZGVJbigzMDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2V0TGFyZ2VWaWRlb1Zpc2libGUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBUb29sYmFyVG9nZ2xlci5kb2NrVG9vbGJhcihmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgPHR0PnRydWU8L3R0PiBpZiB0aGUgcHJlc2VudGF0aW9uIGlzIHZpc2libGUsIDx0dD5mYWxzZTwvdHQ+IC1cbiAgICAgKiBvdGhlcndpc2UuXG4gICAgICovXG4gICAgbXkuaXNQcmVzZW50YXRpb25WaXNpYmxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gKCQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykgIT0gbnVsbFxuICAgICAgICAgICAgICAgICYmICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykuY3NzKCdvcGFjaXR5JykgPT0gMSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIE9wZW5zIHRoZSBQcmV6aSBkaWFsb2csIGZyb20gd2hpY2ggdGhlIHVzZXIgY291bGQgY2hvb3NlIGEgcHJlc2VudGF0aW9uXG4gICAgICogdG8gbG9hZC5cbiAgICAgKi9cbiAgICBteS5vcGVuUHJlemlEaWFsb2cgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG15cHJlemkgPSBjb25uZWN0aW9uLmVtdWMuZ2V0UHJlemkoY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZCk7XG4gICAgICAgIGlmIChteXByZXppKSB7XG4gICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5vcGVuVHdvQnV0dG9uRGlhbG9nKFwiUmVtb3ZlIFByZXppXCIsXG4gICAgICAgICAgICAgICAgXCJBcmUgeW91IHN1cmUgeW91IHdvdWxkIGxpa2UgdG8gcmVtb3ZlIHlvdXIgUHJlemk/XCIsXG4gICAgICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICAgICAgXCJSZW1vdmVcIixcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihlLHYsbSxmKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Yy5yZW1vdmVQcmV6aUZyb21QcmVzZW5jZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGlvbi5lbXVjLnNlbmRQcmVzZW5jZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChwcmV6aVBsYXllciAhPSBudWxsKSB7XG4gICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5vcGVuVHdvQnV0dG9uRGlhbG9nKFwiU2hhcmUgYSBQcmV6aVwiLFxuICAgICAgICAgICAgICAgIFwiQW5vdGhlciBwYXJ0aWNpcGFudCBpcyBhbHJlYWR5IHNoYXJpbmcgYSBQcmV6aS5cIiArXG4gICAgICAgICAgICAgICAgICAgIFwiVGhpcyBjb25mZXJlbmNlIGFsbG93cyBvbmx5IG9uZSBQcmV6aSBhdCBhIHRpbWUuXCIsXG4gICAgICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICAgICAgXCJPa1wiLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGUsdixtLGYpIHtcbiAgICAgICAgICAgICAgICAgICAgJC5wcm9tcHQuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIG9wZW5QcmV6aVN0YXRlID0ge1xuICAgICAgICAgICAgICAgIHN0YXRlMDoge1xuICAgICAgICAgICAgICAgICAgICBodG1sOiAgICc8aDI+U2hhcmUgYSBQcmV6aTwvaDI+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJzxpbnB1dCBpZD1cInByZXppVXJsXCIgdHlwZT1cInRleHRcIiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAncGxhY2Vob2xkZXI9XCJlLmcuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdodHRwOi8vcHJlemkuY29tL3d6N3ZoanljbDdlNi9teS1wcmV6aVwiIGF1dG9mb2N1cz4nLFxuICAgICAgICAgICAgICAgICAgICBwZXJzaXN0ZW50OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9uczogeyBcIlNoYXJlXCI6IHRydWUgLCBcIkNhbmNlbFwiOiBmYWxzZX0sXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRCdXR0b246IDEsXG4gICAgICAgICAgICAgICAgICAgIHN1Ym1pdDogZnVuY3Rpb24oZSx2LG0sZil7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih2KVxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwcmV6aVVybCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcmV6aVVybCcpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZXppVXJsLnZhbHVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHVybFZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA9IGVuY29kZVVSSShVdGlsLmVzY2FwZUh0bWwocHJlemlVcmwudmFsdWUpKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodXJsVmFsdWUuaW5kZXhPZignaHR0cDovL3ByZXppLmNvbS8nKSAhPSAwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAmJiB1cmxWYWx1ZS5pbmRleE9mKCdodHRwczovL3ByZXppLmNvbS8nKSAhPSAwKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkLnByb21wdC5nb1RvU3RhdGUoJ3N0YXRlMScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHByZXNJZFRtcCA9IHVybFZhbHVlLnN1YnN0cmluZyhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsVmFsdWUuaW5kZXhPZihcInByZXppLmNvbS9cIikgKyAxMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzQWxwaGFudW1lcmljKHByZXNJZFRtcClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgcHJlc0lkVG1wLmluZGV4T2YoJy8nKSA8IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkLnByb21wdC5nb1RvU3RhdGUoJ3N0YXRlMScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Y1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYWRkUHJlemlUb1ByZXNlbmNlKHVybFZhbHVlLCAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuc2VuZFByZXNlbmNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJC5wcm9tcHQuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkLnByb21wdC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzdGF0ZTE6IHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogICAnPGgyPlNoYXJlIGEgUHJlemk8L2gyPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdQbGVhc2UgcHJvdmlkZSBhIGNvcnJlY3QgcHJlemkgbGluay4nLFxuICAgICAgICAgICAgICAgICAgICBwZXJzaXN0ZW50OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9uczogeyBcIkJhY2tcIjogdHJ1ZSwgXCJDYW5jZWxcIjogZmFsc2UgfSxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdEJ1dHRvbjogMSxcbiAgICAgICAgICAgICAgICAgICAgc3VibWl0OmZ1bmN0aW9uKGUsdixtLGYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHY9PTApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJC5wcm9tcHQuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkLnByb21wdC5nb1RvU3RhdGUoJ3N0YXRlMCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciBmb2N1c1ByZXppVXJsID0gIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByZXppVXJsJykuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIub3BlbkRpYWxvZ1dpdGhTdGF0ZXMob3BlblByZXppU3RhdGUsIGZvY3VzUHJlemlVcmwsIGZvY3VzUHJlemlVcmwpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEEgbmV3IHByZXNlbnRhdGlvbiBoYXMgYmVlbiBhZGRlZC5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0gZXZlbnQgdGhlIGV2ZW50IGluZGljYXRpbmcgdGhlIGFkZCBvZiBhIHByZXNlbnRhdGlvblxuICAgICAqIEBwYXJhbSBqaWQgdGhlIGppZCBmcm9tIHdoaWNoIHRoZSBwcmVzZW50YXRpb24gd2FzIGFkZGVkXG4gICAgICogQHBhcmFtIHByZXNVcmwgdXJsIG9mIHRoZSBwcmVzZW50YXRpb25cbiAgICAgKiBAcGFyYW0gY3VycmVudFNsaWRlIHRoZSBjdXJyZW50IHNsaWRlIHRvIHdoaWNoIHdlIHNob3VsZCBtb3ZlXG4gICAgICovXG4gICAgdmFyIHByZXNlbnRhdGlvbkFkZGVkID0gZnVuY3Rpb24oZXZlbnQsIGppZCwgcHJlc1VybCwgY3VycmVudFNsaWRlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwicHJlc2VudGF0aW9uIGFkZGVkXCIsIHByZXNVcmwpO1xuXG4gICAgICAgIHZhciBwcmVzSWQgPSBnZXRQcmVzZW50YXRpb25JZChwcmVzVXJsKTtcblxuICAgICAgICB2YXIgZWxlbWVudElkID0gJ3BhcnRpY2lwYW50XydcbiAgICAgICAgICAgICAgICAgICAgICAgICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKVxuICAgICAgICAgICAgICAgICAgICAgICAgKyAnXycgKyBwcmVzSWQ7XG5cbiAgICAgICAgLy8gV2UgZXhwbGljaXRseSBkb24ndCBzcGVjaWZ5IHRoZSBwZWVyIGppZCBoZXJlLCBiZWNhdXNlIHdlIGRvbid0IHdhbnRcbiAgICAgICAgLy8gdGhpcyB2aWRlbyB0byBiZSBkZWFsdCB3aXRoIGFzIGEgcGVlciByZWxhdGVkIG9uZSAoZm9yIGV4YW1wbGUgd2VcbiAgICAgICAgLy8gZG9uJ3Qgd2FudCB0byBzaG93IGEgbXV0ZS9raWNrIG1lbnUgZm9yIHRoaXMgb25lLCBldGMuKS5cbiAgICAgICAgVmlkZW9MYXlvdXQuYWRkUmVtb3RlVmlkZW9Db250YWluZXIobnVsbCwgZWxlbWVudElkKTtcbiAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplVGh1bWJuYWlscygpO1xuXG4gICAgICAgIHZhciBjb250cm9sc0VuYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgaWYgKGppZCA9PT0gY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZClcbiAgICAgICAgICAgIGNvbnRyb2xzRW5hYmxlZCA9IHRydWU7XG5cbiAgICAgICAgUHJlemkuc2V0UHJlc2VudGF0aW9uVmlzaWJsZSh0cnVlKTtcbiAgICAgICAgJCgnI2xhcmdlVmlkZW9Db250YWluZXInKS5ob3ZlcihcbiAgICAgICAgICAgIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIGlmIChQcmV6aS5pc1ByZXNlbnRhdGlvblZpc2libGUoKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVsb2FkQnV0dG9uUmlnaHQgPSB3aW5kb3cuaW5uZXJXaWR0aFxuICAgICAgICAgICAgICAgICAgICAgICAgLSAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLm9mZnNldCgpLmxlZnRcbiAgICAgICAgICAgICAgICAgICAgICAgIC0gJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS53aWR0aCgpO1xuXG4gICAgICAgICAgICAgICAgICAgICQoJyNyZWxvYWRQcmVzZW50YXRpb24nKS5jc3MoeyAgcmlnaHQ6IHJlbG9hZEJ1dHRvblJpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc3BsYXk6J2lubGluZS1ibG9jayd9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKCFQcmV6aS5pc1ByZXNlbnRhdGlvblZpc2libGUoKSlcbiAgICAgICAgICAgICAgICAgICAgJCgnI3JlbG9hZFByZXNlbnRhdGlvbicpLmNzcyh7ZGlzcGxheTonbm9uZSd9KTtcbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGUgPSBldmVudC50b0VsZW1lbnQgfHwgZXZlbnQucmVsYXRlZFRhcmdldDtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoZSAmJiBlLmlkICE9ICdyZWxvYWRQcmVzZW50YXRpb24nICYmIGUuaWQgIT0gJ2hlYWRlcicpXG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcjcmVsb2FkUHJlc2VudGF0aW9uJykuY3NzKHtkaXNwbGF5Oidub25lJ30pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIHByZXppUGxheWVyID0gbmV3IFByZXppUGxheWVyKFxuICAgICAgICAgICAgICAgICAgICAncHJlc2VudGF0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAge3ByZXppSWQ6IHByZXNJZCxcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGdldFByZXNlbnRhdGlvbldpZHRoKCksXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogZ2V0UHJlc2VudGF0aW9uSGVpaGd0KCksXG4gICAgICAgICAgICAgICAgICAgIGNvbnRyb2xzOiBjb250cm9sc0VuYWJsZWQsXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykuYXR0cignaWQnLCBwcmV6aVBsYXllci5vcHRpb25zLnByZXppSWQpO1xuXG4gICAgICAgIHByZXppUGxheWVyLm9uKFByZXppUGxheWVyLkVWRU5UX1NUQVRVUywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicHJlemkgc3RhdHVzXCIsIGV2ZW50LnZhbHVlKTtcbiAgICAgICAgICAgIGlmIChldmVudC52YWx1ZSA9PSBQcmV6aVBsYXllci5TVEFUVVNfQ09OVEVOVF9SRUFEWSkge1xuICAgICAgICAgICAgICAgIGlmIChqaWQgIT0gY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZClcbiAgICAgICAgICAgICAgICAgICAgcHJlemlQbGF5ZXIuZmx5VG9TdGVwKGN1cnJlbnRTbGlkZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHByZXppUGxheWVyLm9uKFByZXppUGxheWVyLkVWRU5UX0NVUlJFTlRfU1RFUCwgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZXZlbnQgdmFsdWVcIiwgZXZlbnQudmFsdWUpO1xuICAgICAgICAgICAgY29ubmVjdGlvbi5lbXVjLmFkZEN1cnJlbnRTbGlkZVRvUHJlc2VuY2UoZXZlbnQudmFsdWUpO1xuICAgICAgICAgICAgY29ubmVjdGlvbi5lbXVjLnNlbmRQcmVzZW5jZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkKFwiI1wiICsgZWxlbWVudElkKS5jc3MoICdiYWNrZ3JvdW5kLWltYWdlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3VybCguLi9pbWFnZXMvYXZhdGFycHJlemkucG5nKScpO1xuICAgICAgICAkKFwiI1wiICsgZWxlbWVudElkKS5jbGljayhcbiAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBQcmV6aS5zZXRQcmVzZW50YXRpb25WaXNpYmxlKHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBIHByZXNlbnRhdGlvbiBoYXMgYmVlbiByZW1vdmVkLlxuICAgICAqIFxuICAgICAqIEBwYXJhbSBldmVudCB0aGUgZXZlbnQgaW5kaWNhdGluZyB0aGUgcmVtb3ZlIG9mIGEgcHJlc2VudGF0aW9uXG4gICAgICogQHBhcmFtIGppZCB0aGUgamlkIGZvciB3aGljaCB0aGUgcHJlc2VudGF0aW9uIHdhcyByZW1vdmVkXG4gICAgICogQHBhcmFtIHRoZSB1cmwgb2YgdGhlIHByZXNlbnRhdGlvblxuICAgICAqL1xuICAgIHZhciBwcmVzZW50YXRpb25SZW1vdmVkID0gZnVuY3Rpb24gKGV2ZW50LCBqaWQsIHByZXNVcmwpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3ByZXNlbnRhdGlvbiByZW1vdmVkJywgcHJlc1VybCk7XG4gICAgICAgIHZhciBwcmVzSWQgPSBnZXRQcmVzZW50YXRpb25JZChwcmVzVXJsKTtcbiAgICAgICAgUHJlemkuc2V0UHJlc2VudGF0aW9uVmlzaWJsZShmYWxzZSk7XG4gICAgICAgICQoJyNwYXJ0aWNpcGFudF8nXG4gICAgICAgICAgICAgICAgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpXG4gICAgICAgICAgICAgICAgKyAnXycgKyBwcmVzSWQpLnJlbW92ZSgpO1xuICAgICAgICAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLnJlbW92ZSgpO1xuICAgICAgICBpZiAocHJlemlQbGF5ZXIgIT0gbnVsbCkge1xuICAgICAgICAgICAgcHJlemlQbGF5ZXIuZGVzdHJveSgpO1xuICAgICAgICAgICAgcHJlemlQbGF5ZXIgPSBudWxsO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEluZGljYXRlcyBpZiB0aGUgZ2l2ZW4gc3RyaW5nIGlzIGFuIGFscGhhbnVtZXJpYyBzdHJpbmcuXG4gICAgICogTm90ZSB0aGF0IHNvbWUgc3BlY2lhbCBjaGFyYWN0ZXJzIGFyZSBhbHNvIGFsbG93ZWQgKC0sIF8gLCAvLCAmLCA/LCA9LCA7KSBmb3IgdGhlXG4gICAgICogcHVycG9zZSBvZiBjaGVja2luZyBVUklzLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzQWxwaGFudW1lcmljKHVuc2FmZVRleHQpIHtcbiAgICAgICAgdmFyIHJlZ2V4ID0gL15bYS16MC05LV9cXC8mXFw/PTtdKyQvaTtcbiAgICAgICAgcmV0dXJuIHJlZ2V4LnRlc3QodW5zYWZlVGV4dCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgcHJlc2VudGF0aW9uIGlkIGZyb20gdGhlIGdpdmVuIHVybC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRQcmVzZW50YXRpb25JZCAocHJlc1VybCkge1xuICAgICAgICB2YXIgcHJlc0lkVG1wID0gcHJlc1VybC5zdWJzdHJpbmcocHJlc1VybC5pbmRleE9mKFwicHJlemkuY29tL1wiKSArIDEwKTtcbiAgICAgICAgcmV0dXJuIHByZXNJZFRtcC5zdWJzdHJpbmcoMCwgcHJlc0lkVG1wLmluZGV4T2YoJy8nKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgcHJlc2VudGF0aW9uIHdpZHRoLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFByZXNlbnRhdGlvbldpZHRoKCkge1xuICAgICAgICB2YXIgYXZhaWxhYmxlV2lkdGggPSBVSVV0aWwuZ2V0QXZhaWxhYmxlVmlkZW9XaWR0aCgpO1xuICAgICAgICB2YXIgYXZhaWxhYmxlSGVpZ2h0ID0gZ2V0UHJlc2VudGF0aW9uSGVpaGd0KCk7XG5cbiAgICAgICAgdmFyIGFzcGVjdFJhdGlvID0gMTYuMCAvIDkuMDtcbiAgICAgICAgaWYgKGF2YWlsYWJsZUhlaWdodCA8IGF2YWlsYWJsZVdpZHRoIC8gYXNwZWN0UmF0aW8pIHtcbiAgICAgICAgICAgIGF2YWlsYWJsZVdpZHRoID0gTWF0aC5mbG9vcihhdmFpbGFibGVIZWlnaHQgKiBhc3BlY3RSYXRpbyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGF2YWlsYWJsZVdpZHRoO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHByZXNlbnRhdGlvbiBoZWlnaHQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UHJlc2VudGF0aW9uSGVpaGd0KCkge1xuICAgICAgICB2YXIgcmVtb3RlVmlkZW9zID0gJCgnI3JlbW90ZVZpZGVvcycpO1xuICAgICAgICByZXR1cm4gd2luZG93LmlubmVySGVpZ2h0IC0gcmVtb3RlVmlkZW9zLm91dGVySGVpZ2h0KCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVzaXplcyB0aGUgcHJlc2VudGF0aW9uIGlmcmFtZS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiByZXNpemUoKSB7XG4gICAgICAgIGlmICgkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpKSB7XG4gICAgICAgICAgICAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLndpZHRoKGdldFByZXNlbnRhdGlvbldpZHRoKCkpO1xuICAgICAgICAgICAgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS5oZWlnaHQoZ2V0UHJlc2VudGF0aW9uSGVpaGd0KCkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUHJlc2VudGF0aW9uIGhhcyBiZWVuIHJlbW92ZWQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgncHJlc2VudGF0aW9ucmVtb3ZlZC5tdWMnLCBwcmVzZW50YXRpb25SZW1vdmVkKTtcblxuICAgIC8qKlxuICAgICAqIFByZXNlbnRhdGlvbiBoYXMgYmVlbiBhZGRlZC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdwcmVzZW50YXRpb25hZGRlZC5tdWMnLCBwcmVzZW50YXRpb25BZGRlZCk7XG5cbiAgICAvKlxuICAgICAqIEluZGljYXRlcyBwcmVzZW50YXRpb24gc2xpZGUgY2hhbmdlLlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ2dvdG9zbGlkZS5tdWMnLCBmdW5jdGlvbiAoZXZlbnQsIGppZCwgcHJlc1VybCwgY3VycmVudCkge1xuICAgICAgICBpZiAocHJlemlQbGF5ZXIgJiYgcHJlemlQbGF5ZXIuZ2V0Q3VycmVudFN0ZXAoKSAhPSBjdXJyZW50KSB7XG4gICAgICAgICAgICBwcmV6aVBsYXllci5mbHlUb1N0ZXAoY3VycmVudCk7XG5cbiAgICAgICAgICAgIHZhciBhbmltYXRpb25TdGVwc0FycmF5ID0gcHJlemlQbGF5ZXIuZ2V0QW5pbWF0aW9uQ291bnRPblN0ZXBzKCk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnNlSW50KGFuaW1hdGlvblN0ZXBzQXJyYXlbY3VycmVudF0pOyBpKyspIHtcbiAgICAgICAgICAgICAgICBwcmV6aVBsYXllci5mbHlUb1N0ZXAoY3VycmVudCwgaSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIE9uIHZpZGVvIHNlbGVjdGVkIGV2ZW50LlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ3ZpZGVvLnNlbGVjdGVkJywgZnVuY3Rpb24gKGV2ZW50LCBpc1ByZXNlbnRhdGlvbikge1xuICAgICAgICBpZiAoIWlzUHJlc2VudGF0aW9uICYmICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykpXG4gICAgICAgICAgICBQcmV6aS5zZXRQcmVzZW50YXRpb25WaXNpYmxlKGZhbHNlKTtcbiAgICB9KTtcblxuICAgICQod2luZG93KS5yZXNpemUoZnVuY3Rpb24gKCkge1xuICAgICAgICByZXNpemUoKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBteTtcbn0oUHJlemkgfHwge30pKTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcmV6aTtcbiIsIm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBfX2JpbmQgPSBmdW5jdGlvbihmbiwgbWUpeyByZXR1cm4gZnVuY3Rpb24oKXsgcmV0dXJuIGZuLmFwcGx5KG1lLCBhcmd1bWVudHMpOyB9OyB9O1xuXG4gICAgdmFyIFByZXppUGxheWVyID0gKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIFByZXppUGxheWVyLkFQSV9WRVJTSU9OID0gMTtcbiAgICAgICAgUHJlemlQbGF5ZXIuQ1VSUkVOVF9TVEVQID0gJ2N1cnJlbnRTdGVwJztcbiAgICAgICAgUHJlemlQbGF5ZXIuQ1VSUkVOVF9BTklNQVRJT05fU1RFUCA9ICdjdXJyZW50QW5pbWF0aW9uU3RlcCc7XG4gICAgICAgIFByZXppUGxheWVyLkNVUlJFTlRfT0JKRUNUID0gJ2N1cnJlbnRPYmplY3QnO1xuICAgICAgICBQcmV6aVBsYXllci5TVEFUVVNfTE9BRElORyA9ICdsb2FkaW5nJztcbiAgICAgICAgUHJlemlQbGF5ZXIuU1RBVFVTX1JFQURZID0gJ3JlYWR5JztcbiAgICAgICAgUHJlemlQbGF5ZXIuU1RBVFVTX0NPTlRFTlRfUkVBRFkgPSAnY29udGVudHJlYWR5JztcbiAgICAgICAgUHJlemlQbGF5ZXIuRVZFTlRfQ1VSUkVOVF9TVEVQID0gXCJjdXJyZW50U3RlcENoYW5nZVwiO1xuICAgICAgICBQcmV6aVBsYXllci5FVkVOVF9DVVJSRU5UX0FOSU1BVElPTl9TVEVQID0gXCJjdXJyZW50QW5pbWF0aW9uU3RlcENoYW5nZVwiO1xuICAgICAgICBQcmV6aVBsYXllci5FVkVOVF9DVVJSRU5UX09CSkVDVCA9IFwiY3VycmVudE9iamVjdENoYW5nZVwiO1xuICAgICAgICBQcmV6aVBsYXllci5FVkVOVF9TVEFUVVMgPSBcInN0YXR1c0NoYW5nZVwiO1xuICAgICAgICBQcmV6aVBsYXllci5FVkVOVF9QTEFZSU5HID0gXCJpc0F1dG9QbGF5aW5nQ2hhbmdlXCI7XG4gICAgICAgIFByZXppUGxheWVyLkVWRU5UX0lTX01PVklORyA9IFwiaXNNb3ZpbmdDaGFuZ2VcIjtcbiAgICAgICAgUHJlemlQbGF5ZXIuZG9tYWluID0gXCJodHRwczovL3ByZXppLmNvbVwiO1xuICAgICAgICBQcmV6aVBsYXllci5wYXRoID0gXCIvcGxheWVyL1wiO1xuICAgICAgICBQcmV6aVBsYXllci5wbGF5ZXJzID0ge307XG4gICAgICAgIFByZXppUGxheWVyLmJpbmRlZF9tZXRob2RzID0gWydjaGFuZ2VzSGFuZGxlciddO1xuXG4gICAgICAgIFByZXppUGxheWVyLmNyZWF0ZU11bHRpcGxlUGxheWVycyA9IGZ1bmN0aW9uKG9wdGlvbkFycmF5KXtcbiAgICAgICAgICAgIGZvcih2YXIgaT0wOyBpPG9wdGlvbkFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9wdGlvblNldCA9IG9wdGlvbkFycmF5W2ldO1xuICAgICAgICAgICAgICAgIG5ldyBQcmV6aVBsYXllcihvcHRpb25TZXQuaWQsIG9wdGlvblNldCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLm1lc3NhZ2VSZWNlaXZlZCA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgICAgIHZhciBtZXNzYWdlLCBpdGVtLCBwbGF5ZXI7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBKU09OLnBhcnNlKGV2ZW50LmRhdGEpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmlkICYmIChwbGF5ZXIgPSBQcmV6aVBsYXllci5wbGF5ZXJzW21lc3NhZ2UuaWRdKSl7XG4gICAgICAgICAgICAgICAgaWYgKHBsYXllci5vcHRpb25zLmRlYnVnID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb25zb2xlICYmIGNvbnNvbGUubG9nKSBjb25zb2xlLmxvZygncmVjZWl2ZWQnLCBtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJjaGFuZ2VzXCIpe1xuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuY2hhbmdlc0hhbmRsZXIobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxwbGF5ZXIuY2FsbGJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0gPSBwbGF5ZXIuY2FsbGJhY2tzW2ldO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSAmJiBtZXNzYWdlLnR5cGUgPT09IGl0ZW0uZXZlbnQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5jYWxsYmFjayhtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBQcmV6aVBsYXllcihpZCwgb3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIHBhcmFtcywgcGFyYW1TdHJpbmcgPSBcIlwiLCBfdGhpcyA9IHRoaXM7XG4gICAgICAgICAgICBpZiAoUHJlemlQbGF5ZXIucGxheWVyc1tpZF0pe1xuICAgICAgICAgICAgICAgIFByZXppUGxheWVyLnBsYXllcnNbaWRdLmRlc3Ryb3koKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvcih2YXIgaT0wOyBpPFByZXppUGxheWVyLmJpbmRlZF9tZXRob2RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1ldGhvZF9uYW1lID0gUHJlemlQbGF5ZXIuYmluZGVkX21ldGhvZHNbaV07XG4gICAgICAgICAgICAgICAgX3RoaXNbbWV0aG9kX25hbWVdID0gX19iaW5kKF90aGlzW21ldGhvZF9uYW1lXSwgX3RoaXMpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICAgICAgICAgIHRoaXMudmFsdWVzID0geydzdGF0dXMnOiBQcmV6aVBsYXllci5TVEFUVVNfTE9BRElOR307XG4gICAgICAgICAgICB0aGlzLnZhbHVlc1tQcmV6aVBsYXllci5DVVJSRU5UX1NURVBdID0gMDtcbiAgICAgICAgICAgIHRoaXMudmFsdWVzW1ByZXppUGxheWVyLkNVUlJFTlRfQU5JTUFUSU9OX1NURVBdID0gMDtcbiAgICAgICAgICAgIHRoaXMudmFsdWVzW1ByZXppUGxheWVyLkNVUlJFTlRfT0JKRUNUXSA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrcyA9IFtdO1xuICAgICAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICAgICAgdGhpcy5lbWJlZFRvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xuICAgICAgICAgICAgaWYgKCF0aGlzLmVtYmVkVG8pIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBcIlRoZSBlbGVtZW50IGlkIGlzIG5vdCBhdmFpbGFibGUuXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmlmcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lmcmFtZScpO1xuICAgICAgICAgICAgcGFyYW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbmFtZTogJ29pZCcsIHZhbHVlOiBvcHRpb25zLnByZXppSWQgfSxcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdleHBsb3JhYmxlJywgdmFsdWU6IG9wdGlvbnMuZXhwbG9yYWJsZSA/IDEgOiAwIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnY29udHJvbHMnLCB2YWx1ZTogb3B0aW9ucy5jb250cm9scyA/IDEgOiAwIH1cbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBmb3IodmFyIGk9MDsgaTxwYXJhbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgcGFyYW0gPSBwYXJhbXNbaV07XG4gICAgICAgICAgICAgICAgcGFyYW1TdHJpbmcgKz0gKGk9PT0wID8gXCI/XCIgOiBcIiZcIikgKyBwYXJhbS5uYW1lICsgXCI9XCIgKyBwYXJhbS52YWx1ZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLmlmcmFtZS5zcmMgPSBQcmV6aVBsYXllci5kb21haW4gKyBQcmV6aVBsYXllci5wYXRoICsgcGFyYW1TdHJpbmc7XG4gICAgICAgICAgICB0aGlzLmlmcmFtZS5mcmFtZUJvcmRlciA9IDA7XG4gICAgICAgICAgICB0aGlzLmlmcmFtZS5zY3JvbGxpbmcgPSBcIm5vXCI7XG4gICAgICAgICAgICB0aGlzLmlmcmFtZS53aWR0aCA9IG9wdGlvbnMud2lkdGggfHwgNjQwO1xuICAgICAgICAgICAgdGhpcy5pZnJhbWUuaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgfHwgNDgwO1xuICAgICAgICAgICAgdGhpcy5lbWJlZFRvLmlubmVySFRNTCA9ICcnO1xuICAgICAgICAgICAgLy8gSklUU0k6IElOIENBU0UgU09NRVRISU5HIEdPRVMgV1JPTkcuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHRoaXMuZW1iZWRUby5hcHBlbmRDaGlsZCh0aGlzLmlmcmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDQVRDSCBFUlJPUlwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSklUU0k6IEluY3JlYXNlIGludGVydmFsIGZyb20gMjAwIHRvIDUwMCwgd2hpY2ggZml4ZXMgcHJlemlcbiAgICAgICAgICAgIC8vIGNyYXNoZXMgZm9yIHVzLlxuICAgICAgICAgICAgdGhpcy5pbml0UG9sbEludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBfdGhpcy5zZW5kTWVzc2FnZSh7J2FjdGlvbic6ICdpbml0J30pO1xuICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIFByZXppUGxheWVyLnBsYXllcnNbaWRdID0gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5jaGFuZ2VzSGFuZGxlciA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHZhciBrZXksIHZhbHVlLCBqLCBpdGVtO1xuICAgICAgICAgICAgaWYgKHRoaXMuaW5pdFBvbGxJbnRlcnZhbCkge1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5pbml0UG9sbEludGVydmFsKTtcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRQb2xsSW50ZXJ2YWwgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoa2V5IGluIG1lc3NhZ2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmRhdGEuaGFzT3duUHJvcGVydHkoa2V5KSl7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gbWVzc2FnZS5kYXRhW2tleV07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmFsdWVzW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChqPTA7IGo8dGhpcy5jYWxsYmFja3MubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0gPSB0aGlzLmNhbGxiYWNrc1tqXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtICYmIGl0ZW0uZXZlbnQgPT09IGtleSArIFwiQ2hhbmdlXCIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uY2FsbGJhY2soe3R5cGU6IGl0ZW0uZXZlbnQsIHZhbHVlOiB2YWx1ZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pbml0UG9sbEludGVydmFsKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLmluaXRQb2xsSW50ZXJ2YWwpO1xuICAgICAgICAgICAgICAgIHRoaXMuaW5pdFBvbGxJbnRlcnZhbCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5lbWJlZFRvLmlubmVySFRNTCA9ICcnO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5zZW5kTWVzc2FnZSA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuZGVidWcgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29uc29sZSAmJiBjb25zb2xlLmxvZykgY29uc29sZS5sb2coJ3NlbnQnLCBtZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1lc3NhZ2UudmVyc2lvbiA9IFByZXppUGxheWVyLkFQSV9WRVJTSU9OO1xuICAgICAgICAgICAgbWVzc2FnZS5pZCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pZnJhbWUuY29udGVudFdpbmRvdy5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeShtZXNzYWdlKSwgJyonKTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUubmV4dFN0ZXAgPSAvKiBuZXh0U3RlcCBpcyBERVBSRUNBVEVEICovXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5mbHlUb05leHRTdGVwID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgJ2FjdGlvbic6ICdwcmVzZW50JyxcbiAgICAgICAgICAgICAgICAnZGF0YSc6IFsnbW92ZVRvTmV4dFN0ZXAnXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLnByZXZpb3VzU3RlcCA9IC8qIHByZXZpb3VzU3RlcCBpcyBERVBSRUNBVEVEICovXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5mbHlUb1ByZXZpb3VzU3RlcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgICdhY3Rpb24nOiAncHJlc2VudCcsXG4gICAgICAgICAgICAgICAgJ2RhdGEnOiBbJ21vdmVUb1ByZXZTdGVwJ11cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS50b1N0ZXAgPSAvKiB0b1N0ZXAgaXMgREVQUkVDQVRFRCAqL1xuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZmx5VG9TdGVwID0gZnVuY3Rpb24oc3RlcCwgYW5pbWF0aW9uX3N0ZXApIHtcbiAgICAgICAgICAgIHZhciBvYmogPSB0aGlzO1xuICAgICAgICAgICAgLy8gY2hlY2sgYW5pbWF0aW9uX3N0ZXBcbiAgICAgICAgICAgIGlmIChhbmltYXRpb25fc3RlcCA+IDAgJiZcbiAgICAgICAgICAgICAgICBvYmoudmFsdWVzLmFuaW1hdGlvbkNvdW50T25TdGVwcyAmJlxuICAgICAgICAgICAgICAgIG9iai52YWx1ZXMuYW5pbWF0aW9uQ291bnRPblN0ZXBzW3N0ZXBdIDw9IGFuaW1hdGlvbl9zdGVwKSB7XG4gICAgICAgICAgICAgICAgYW5pbWF0aW9uX3N0ZXAgPSBvYmoudmFsdWVzLmFuaW1hdGlvbkNvdW50T25TdGVwc1tzdGVwXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGp1bXAgdG8gYW5pbWF0aW9uIHN0ZXBzIGJ5IGNhbGxpbmcgZmx5VG9OZXh0U3RlcCgpXG4gICAgICAgICAgICBmdW5jdGlvbiBkb0FuaW1hdGlvblN0ZXBzKCkge1xuICAgICAgICAgICAgICAgIGlmIChvYmoudmFsdWVzLmlzTW92aW5nID09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChkb0FuaW1hdGlvblN0ZXBzLCAxMDApOyAvLyB3YWl0IHVudGlsIHRoZSBmbGlnaHQgZW5kc1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHdoaWxlIChhbmltYXRpb25fc3RlcC0tID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBvYmouZmx5VG9OZXh0U3RlcCgpOyAvLyBkbyB0aGUgYW5pbWF0aW9uIHN0ZXBzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2V0VGltZW91dChkb0FuaW1hdGlvblN0ZXBzLCAyMDApOyAvLyAyMDBtcyBpcyB0aGUgaW50ZXJuYWwgXCJyZXBvcnRpbmdcIiB0aW1lXG4gICAgICAgICAgICAvLyBqdW1wIHRvIHRoZSBzdGVwXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgJ2FjdGlvbic6ICdwcmVzZW50JyxcbiAgICAgICAgICAgICAgICAnZGF0YSc6IFsnbW92ZVRvU3RlcCcsIHN0ZXBdXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUudG9PYmplY3QgPSAvKiB0b09iamVjdCBpcyBERVBSRUNBVEVEICovXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5mbHlUb09iamVjdCA9IGZ1bmN0aW9uKG9iamVjdElkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgJ2FjdGlvbic6ICdwcmVzZW50JyxcbiAgICAgICAgICAgICAgICAnZGF0YSc6IFsnbW92ZVRvT2JqZWN0Jywgb2JqZWN0SWRdXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGRlZmF1bHREZWxheSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgICdhY3Rpb24nOiAncHJlc2VudCcsXG4gICAgICAgICAgICAgICAgJ2RhdGEnOiBbJ3N0YXJ0QXV0b1BsYXknLCBkZWZhdWx0RGVsYXldXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgICdhY3Rpb24nOiAncHJlc2VudCcsXG4gICAgICAgICAgICAgICAgJ2RhdGEnOiBbJ3N0b3BBdXRvUGxheSddXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbihkZWZhdWx0RGVsYXkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAnYWN0aW9uJzogJ3ByZXNlbnQnLFxuICAgICAgICAgICAgICAgICdkYXRhJzogWydwYXVzZUF1dG9QbGF5JywgZGVmYXVsdERlbGF5XVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmdldEN1cnJlbnRTdGVwID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXMuY3VycmVudFN0ZXA7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmdldEN1cnJlbnRBbmltYXRpb25TdGVwID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXMuY3VycmVudEFuaW1hdGlvblN0ZXA7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmdldEN1cnJlbnRPYmplY3QgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlcy5jdXJyZW50T2JqZWN0O1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5nZXRTdGF0dXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlcy5zdGF0dXM7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmlzUGxheWluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzLmlzQXV0b1BsYXlpbmc7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmdldFN0ZXBDb3VudCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzLnN0ZXBDb3VudDtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZ2V0QW5pbWF0aW9uQ291bnRPblN0ZXBzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXMuYW5pbWF0aW9uQ291bnRPblN0ZXBzO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5nZXRUaXRsZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzLnRpdGxlO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5zZXREaW1lbnNpb25zID0gZnVuY3Rpb24oZGltcykge1xuICAgICAgICAgICAgZm9yICh2YXIgcGFyYW1ldGVyIGluIGRpbXMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlmcmFtZVtwYXJhbWV0ZXJdID0gZGltc1twYXJhbWV0ZXJdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmdldERpbWVuc2lvbnMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgd2lkdGg6IHBhcnNlSW50KHRoaXMuaWZyYW1lLndpZHRoLCAxMCksXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBwYXJzZUludCh0aGlzLmlmcmFtZS5oZWlnaHQsIDEwKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24oZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrcy5wdXNoKHtcbiAgICAgICAgICAgICAgICBldmVudDogZXZlbnQsXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24oZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgaiwgaXRlbTtcbiAgICAgICAgICAgIGlmIChldmVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jYWxsYmFja3MgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGogPSB0aGlzLmNhbGxiYWNrcy5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAoai0tKSB7XG4gICAgICAgICAgICAgICAgaXRlbSA9IHRoaXMuY2FsbGJhY2tzW2pdO1xuICAgICAgICAgICAgICAgIGlmIChpdGVtICYmIGl0ZW0uZXZlbnQgPT09IGV2ZW50ICYmIChjYWxsYmFjayA9PT0gdW5kZWZpbmVkIHx8IGl0ZW0uY2FsbGJhY2sgPT09IGNhbGxiYWNrKSl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tzLnNwbGljZShqLCAxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIFByZXppUGxheWVyLm1lc3NhZ2VSZWNlaXZlZCwgZmFsc2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2luZG93LmF0dGFjaEV2ZW50KCdvbm1lc3NhZ2UnLCBQcmV6aVBsYXllci5tZXNzYWdlUmVjZWl2ZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFByZXppUGxheWVyO1xuXG4gICAgfSkoKTtcblxuICAgIHJldHVybiBQcmV6aVBsYXllcjtcbn0pKCk7XG4iLCJ2YXIgQ29udGFjdExpc3QgPSByZXF1aXJlKFwiLi8uLi9Db250YWN0TGlzdC5qc1wiKTtcbnZhciBDaGF0ID0gcmVxdWlyZShcIi4vLi4vY2hhdC9jaGF0LmpzXCIpO1xuXG52YXIgQm90dG9tVG9vbGJhciA9IChmdW5jdGlvbiAobXkpIHtcblxuICAgIHZhciBidXR0b25IYW5kbGVycyA9IHtcbiAgICAgICAgXCJib3R0b210b29sYmFyX2J1dHRvbl9jaGF0XCI6IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuIEJvdHRvbVRvb2xiYXIudG9nZ2xlQ2hhdCgpO1xuICAgICAgICB9LFxuICAgICAgICBcImJvdHRvbXRvb2xiYXJfYnV0dG9uX2NvbnRhY3RcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIEJvdHRvbVRvb2xiYXIudG9nZ2xlQ29udGFjdExpc3QoKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJib3R0b210b29sYmFyX2J1dHRvbl9maWxtc3RyaXBcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIEJvdHRvbVRvb2xiYXIudG9nZ2xlRmlsbVN0cmlwKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgbXkuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZm9yKHZhciBrIGluIGJ1dHRvbkhhbmRsZXJzKVxuICAgICAgICAgICAgJChcIiNcIiArIGspLmNsaWNrKGJ1dHRvbkhhbmRsZXJzW2tdKTtcbiAgICB9XG4gICAgbXkudG9nZ2xlQ2hhdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoQ29udGFjdExpc3QuaXNWaXNpYmxlKCkpIHtcbiAgICAgICAgICAgIGJ1dHRvbkNsaWNrKFwiI2NvbnRhY3RMaXN0QnV0dG9uXCIsIFwiYWN0aXZlXCIpO1xuICAgICAgICAgICAgQ29udGFjdExpc3QudG9nZ2xlQ29udGFjdExpc3QoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGJ1dHRvbkNsaWNrKFwiI2NoYXRCb3R0b21CdXR0b25cIiwgXCJhY3RpdmVcIik7XG5cbiAgICAgICAgQ2hhdC50b2dnbGVDaGF0KCk7XG4gICAgfTtcblxuICAgIG15LnRvZ2dsZUNvbnRhY3RMaXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChDaGF0LmlzVmlzaWJsZSgpKSB7XG4gICAgICAgICAgICBidXR0b25DbGljayhcIiNjaGF0Qm90dG9tQnV0dG9uXCIsIFwiYWN0aXZlXCIpO1xuICAgICAgICAgICAgQ2hhdC50b2dnbGVDaGF0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBidXR0b25DbGljayhcIiNjb250YWN0TGlzdEJ1dHRvblwiLCBcImFjdGl2ZVwiKTtcblxuICAgICAgICBDb250YWN0TGlzdC50b2dnbGVDb250YWN0TGlzdCgpO1xuICAgIH07XG5cbiAgICBteS50b2dnbGVGaWxtU3RyaXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGZpbG1zdHJpcCA9ICQoXCIjcmVtb3RlVmlkZW9zXCIpO1xuICAgICAgICBmaWxtc3RyaXAudG9nZ2xlQ2xhc3MoXCJoaWRkZW5cIik7XG4gICAgfTtcblxuXG4gICAgJChkb2N1bWVudCkuYmluZChcInJlbW90ZXZpZGVvLnJlc2l6ZWRcIiwgZnVuY3Rpb24gKGV2ZW50LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHZhciBib3R0b20gPSAoaGVpZ2h0IC0gJCgnI2JvdHRvbVRvb2xiYXInKS5vdXRlckhlaWdodCgpKS8yICsgMTg7XG5cbiAgICAgICAgJCgnI2JvdHRvbVRvb2xiYXInKS5jc3Moe2JvdHRvbTogYm90dG9tICsgJ3B4J30pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG15O1xufShCb3R0b21Ub29sYmFyIHx8IHt9KSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQm90dG9tVG9vbGJhcjtcbiIsInZhciBCb3R0b21Ub29sYmFyID0gcmVxdWlyZShcIi4vQm90dG9tVG9vbGJhclwiKTtcbnZhciBQcmV6aSA9IHJlcXVpcmUoXCIuLy4uL3ByZXppL3ByZXppXCIpO1xudmFyIEV0aGVycGFkID0gcmVxdWlyZShcIi4vLi4vZXRoZXJwYWQvRXRoZXJwYWRcIik7XG5cbnZhciBUb29sYmFyID0gKGZ1bmN0aW9uIChteSkge1xuXG4gICAgdmFyIHRvb2xiYXJUaW1lb3V0ID0gbnVsbDtcblxuICAgIHZhciBidXR0b25IYW5kbGVycyA9IHtcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9tdXRlXCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0b2dnbGVBdWRpbygpO1xuICAgICAgICB9LFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX2NhbWVyYVwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBidXR0b25DbGljayhcIiN2aWRlb1wiLCBcImljb24tY2FtZXJhIGljb24tY2FtZXJhLWRpc2FibGVkXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHRvZ2dsZVZpZGVvKCk7XG4gICAgICAgIH0sXG4gICAgICAgIFwidG9vbGJhcl9idXR0b25fcmVjb3JkXCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0b2dnbGVSZWNvcmRpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICAsXG4gICAgICAgIFwidG9vbGJhcl9idXR0b25fc2VjdXJpdHlcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIFRvb2xiYXIub3BlbkxvY2tEaWFsb2coKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9saW5rXCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBUb29sYmFyLm9wZW5MaW5rRGlhbG9nKCk7XG4gICAgICAgIH0sXG4gICAgICAgIFwidG9vbGJhcl9idXR0b25fY2hhdFwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gQm90dG9tVG9vbGJhci50b2dnbGVDaGF0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIFwidG9vbGJhcl9idXR0b25fcHJlemlcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIFByZXppLm9wZW5QcmV6aURpYWxvZygpO1xuICAgICAgICB9LFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX2V0aGVycGFkXCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBFdGhlcnBhZC50b2dnbGVFdGhlcnBhZCgwKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9kZXNrdG9wc2hhcmluZ1wiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9nZ2xlU2NyZWVuU2hhcmluZygpO1xuICAgICAgICB9LFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX2Z1bGxTY3JlZW5cIjogZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICBidXR0b25DbGljayhcIiNmdWxsU2NyZWVuXCIsIFwiaWNvbi1mdWxsLXNjcmVlbiBpY29uLWV4aXQtZnVsbC1zY3JlZW5cIik7XG4gICAgICAgICAgICByZXR1cm4gVG9vbGJhci50b2dnbGVGdWxsU2NyZWVuKCk7XG4gICAgICAgIH0sXG4gICAgICAgIFwidG9vbGJhcl9idXR0b25fc2lwXCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsU2lwQnV0dG9uQ2xpY2tlZCgpO1xuICAgICAgICB9LFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX2hhbmd1cFwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gaGFuZ3VwKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTdGFydHMgb3Igc3RvcHMgdGhlIHJlY29yZGluZyBmb3IgdGhlIGNvbmZlcmVuY2UuXG4gICAgZnVuY3Rpb24gdG9nZ2xlUmVjb3JkaW5nKCkge1xuICAgICAgICBpZiAoZm9jdXMgPT09IG51bGwgfHwgZm9jdXMuY29uZmlkID09PSBudWxsKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnbm9uLWZvY3VzLCBvciBjb25mZXJlbmNlIG5vdCB5ZXQgb3JnYW5pemVkOiBub3QgZW5hYmxpbmcgcmVjb3JkaW5nJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXJlY29yZGluZ1Rva2VuKVxuICAgICAgICB7XG4gICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5vcGVuVHdvQnV0dG9uRGlhbG9nKG51bGwsXG4gICAgICAgICAgICAgICAgICAgICc8aDI+RW50ZXIgcmVjb3JkaW5nIHRva2VuPC9oMj4nICtcbiAgICAgICAgICAgICAgICAgICAgJzxpbnB1dCBpZD1cInJlY29yZGluZ1Rva2VuXCIgdHlwZT1cInRleHRcIiBwbGFjZWhvbGRlcj1cInRva2VuXCIgYXV0b2ZvY3VzPicsXG4gICAgICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICAgICAgXCJTYXZlXCIsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKGUsIHYsIG0sIGYpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0b2tlbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZWNvcmRpbmdUb2tlbicpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodG9rZW4udmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRSZWNvcmRpbmdUb2tlbihVdGlsLmVzY2FwZUh0bWwodG9rZW4udmFsdWUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVSZWNvcmRpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZWNvcmRpbmdUb2tlbicpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG9sZFN0YXRlID0gZm9jdXMucmVjb3JkaW5nRW5hYmxlZDtcbiAgICAgICAgVG9vbGJhci50b2dnbGVSZWNvcmRpbmdCdXR0b25TdGF0ZSgpO1xuICAgICAgICBmb2N1cy5zZXRSZWNvcmRpbmcoIW9sZFN0YXRlLFxuICAgICAgICAgICAgcmVjb3JkaW5nVG9rZW4sXG4gICAgICAgICAgICBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIk5ldyByZWNvcmRpbmcgc3RhdGU6IFwiLCBzdGF0ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlID09IG9sZFN0YXRlKSAvL2ZhaWxlZCB0byBjaGFuZ2UsIHJlc2V0IHRoZSB0b2tlbiBiZWNhdXNlIGl0IG1pZ2h0IGhhdmUgYmVlbiB3cm9uZ1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgVG9vbGJhci50b2dnbGVSZWNvcmRpbmdCdXR0b25TdGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICBzZXRSZWNvcmRpbmdUb2tlbihudWxsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG5cblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvY2tzIC8gdW5sb2NrcyB0aGUgcm9vbS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsb2NrUm9vbShsb2NrKSB7XG4gICAgICAgIGlmIChsb2NrKVxuICAgICAgICAgICAgY29ubmVjdGlvbi5lbXVjLmxvY2tSb29tKHNoYXJlZEtleSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Yy5sb2NrUm9vbSgnJyk7XG5cbiAgICAgICAgVG9vbGJhci51cGRhdGVMb2NrQnV0dG9uKCk7XG4gICAgfVxuXG4gICAgLy9zZXRzIG9uY2xpY2sgaGFuZGxlcnNcbiAgICBteS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBmb3IodmFyIGsgaW4gYnV0dG9uSGFuZGxlcnMpXG4gICAgICAgICAgICAkKFwiI1wiICsgaykuY2xpY2soYnV0dG9uSGFuZGxlcnNba10pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE9wZW5zIHRoZSBsb2NrIHJvb20gZGlhbG9nLlxuICAgICAqL1xuICAgIG15Lm9wZW5Mb2NrRGlhbG9nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBPbmx5IHRoZSBmb2N1cyBpcyBhYmxlIHRvIHNldCBhIHNoYXJlZCBrZXkuXG4gICAgICAgIGlmIChmb2N1cyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKHNoYXJlZEtleSkge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5NZXNzYWdlRGlhbG9nKG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBcIlRoaXMgY29udmVyc2F0aW9uIGlzIGN1cnJlbnRseSBwcm90ZWN0ZWQgYnlcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICBcIiBhIHNoYXJlZCBzZWNyZXQga2V5LlwiLFxuICAgICAgICAgICAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgXCJTZWNyZXQga2V5XCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5vcGVuTWVzc2FnZURpYWxvZyhudWxsLFxuICAgICAgICAgICAgICAgICAgICBcIlRoaXMgY29udmVyc2F0aW9uIGlzbid0IGN1cnJlbnRseSBwcm90ZWN0ZWQgYnlcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICBcIiBhIHNlY3JldCBrZXkuIE9ubHkgdGhlIG93bmVyIG9mIHRoZSBjb25mZXJlbmNlXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgXCIgY291bGQgc2V0IGEgc2hhcmVkIGtleS5cIixcbiAgICAgICAgICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIFwiU2VjcmV0IGtleVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChzaGFyZWRLZXkpIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5vcGVuVHdvQnV0dG9uRGlhbG9nKG51bGwsXG4gICAgICAgICAgICAgICAgICAgIFwiQXJlIHlvdSBzdXJlIHlvdSB3b3VsZCBsaWtlIHRvIHJlbW92ZSB5b3VyIHNlY3JldCBrZXk/XCIsXG4gICAgICAgICAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBcIlJlbW92ZVwiLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZSwgdikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRTaGFyZWRLZXkoJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2tSb29tKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5Ud29CdXR0b25EaWFsb2cobnVsbCxcbiAgICAgICAgICAgICAgICAgICAgJzxoMj5TZXQgYSBzZWNyZXQga2V5IHRvIGxvY2sgeW91ciByb29tPC9oMj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICc8aW5wdXQgaWQ9XCJsb2NrS2V5XCIgdHlwZT1cInRleHRcIicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ3BsYWNlaG9sZGVyPVwieW91ciBzaGFyZWQga2V5XCIgYXV0b2ZvY3VzPicsXG4gICAgICAgICAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBcIlNhdmVcIixcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKGUsIHYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxvY2tLZXkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9ja0tleScpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxvY2tLZXkudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0U2hhcmVkS2V5KFV0aWwuZXNjYXBlSHRtbChsb2NrS2V5LnZhbHVlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2tSb29tKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2tLZXknKS5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBPcGVucyB0aGUgaW52aXRlIGxpbmsgZGlhbG9nLlxuICAgICAqL1xuICAgIG15Lm9wZW5MaW5rRGlhbG9nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaW52aXRlTGluaztcbiAgICAgICAgaWYgKHJvb21VcmwgPT0gbnVsbCkge1xuICAgICAgICAgICAgaW52aXRlTGluayA9IFwiWW91ciBjb25mZXJlbmNlIGlzIGN1cnJlbnRseSBiZWluZyBjcmVhdGVkLi4uXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbnZpdGVMaW5rID0gZW5jb2RlVVJJKHJvb21VcmwpO1xuICAgICAgICB9XG4gICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5Ud29CdXR0b25EaWFsb2coXG4gICAgICAgICAgICBcIlNoYXJlIHRoaXMgbGluayB3aXRoIGV2ZXJ5b25lIHlvdSB3YW50IHRvIGludml0ZVwiLFxuICAgICAgICAgICAgJzxpbnB1dCBpZD1cImludml0ZUxpbmtSZWZcIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwiJyArXG4gICAgICAgICAgICAgICAgaW52aXRlTGluayArICdcIiBvbmNsaWNrPVwidGhpcy5zZWxlY3QoKTtcIiByZWFkb25seT4nLFxuICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICBcIkludml0ZVwiLFxuICAgICAgICAgICAgZnVuY3Rpb24gKGUsIHYpIHtcbiAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICBpZiAocm9vbVVybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW52aXRlUGFydGljaXBhbnRzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChyb29tVXJsKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpbnZpdGVMaW5rUmVmJykuc2VsZWN0KCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pxaV9zdGF0ZTBfYnV0dG9uSW52aXRlJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5kaXNhYmxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBJbnZpdGUgcGFydGljaXBhbnRzIHRvIGNvbmZlcmVuY2UuXG4gICAgICovXG4gICAgZnVuY3Rpb24gaW52aXRlUGFydGljaXBhbnRzKCkge1xuICAgICAgICBpZiAocm9vbVVybCA9PSBudWxsKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHZhciBzaGFyZWRLZXlUZXh0ID0gXCJcIjtcbiAgICAgICAgaWYgKHNoYXJlZEtleSAmJiBzaGFyZWRLZXkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgc2hhcmVkS2V5VGV4dCA9XG4gICAgICAgICAgICAgICAgXCJUaGlzIGNvbmZlcmVuY2UgaXMgcGFzc3dvcmQgcHJvdGVjdGVkLiBQbGVhc2UgdXNlIHRoZSBcIiArXG4gICAgICAgICAgICAgICAgXCJmb2xsb3dpbmcgcGluIHdoZW4gam9pbmluZzolMEQlMEElMEQlMEFcIiArXG4gICAgICAgICAgICAgICAgc2hhcmVkS2V5ICsgXCIlMEQlMEElMEQlMEFcIjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjb25mZXJlbmNlTmFtZSA9IHJvb21Vcmwuc3Vic3RyaW5nKHJvb21VcmwubGFzdEluZGV4T2YoJy8nKSArIDEpO1xuICAgICAgICB2YXIgc3ViamVjdCA9IFwiSW52aXRhdGlvbiB0byBhIEppdHNpIE1lZXQgKFwiICsgY29uZmVyZW5jZU5hbWUgKyBcIilcIjtcbiAgICAgICAgdmFyIGJvZHkgPSBcIkhleSB0aGVyZSwgSSUyN2QgbGlrZSB0byBpbnZpdGUgeW91IHRvIGEgSml0c2kgTWVldFwiICtcbiAgICAgICAgICAgICAgICAgICAgXCIgY29uZmVyZW5jZSBJJTI3dmUganVzdCBzZXQgdXAuJTBEJTBBJTBEJTBBXCIgK1xuICAgICAgICAgICAgICAgICAgICBcIlBsZWFzZSBjbGljayBvbiB0aGUgZm9sbG93aW5nIGxpbmsgaW4gb3JkZXJcIiArXG4gICAgICAgICAgICAgICAgICAgIFwiIHRvIGpvaW4gdGhlIGNvbmZlcmVuY2UuJTBEJTBBJTBEJTBBXCIgK1xuICAgICAgICAgICAgICAgICAgICByb29tVXJsICtcbiAgICAgICAgICAgICAgICAgICAgXCIlMEQlMEElMEQlMEFcIiArXG4gICAgICAgICAgICAgICAgICAgIHNoYXJlZEtleVRleHQgK1xuICAgICAgICAgICAgICAgICAgICBcIk5vdGUgdGhhdCBKaXRzaSBNZWV0IGlzIGN1cnJlbnRseSBvbmx5IHN1cHBvcnRlZCBieSBDaHJvbWl1bSxcIiArXG4gICAgICAgICAgICAgICAgICAgIFwiIEdvb2dsZSBDaHJvbWUgYW5kIE9wZXJhLCBzbyB5b3UgbmVlZFwiICtcbiAgICAgICAgICAgICAgICAgICAgXCIgdG8gYmUgdXNpbmcgb25lIG9mIHRoZXNlIGJyb3dzZXJzLiUwRCUwQSUwRCUwQVwiICtcbiAgICAgICAgICAgICAgICAgICAgXCJUYWxrIHRvIHlvdSBpbiBhIHNlYyFcIjtcblxuICAgICAgICBpZiAod2luZG93LmxvY2FsU3RvcmFnZS5kaXNwbGF5bmFtZSkge1xuICAgICAgICAgICAgYm9keSArPSBcIiUwRCUwQSUwRCUwQVwiICsgd2luZG93LmxvY2FsU3RvcmFnZS5kaXNwbGF5bmFtZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdpbmRvdy5vcGVuKFwibWFpbHRvOj9zdWJqZWN0PVwiICsgc3ViamVjdCArIFwiJmJvZHk9XCIgKyBib2R5LCAnX2JsYW5rJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogT3BlbnMgdGhlIHNldHRpbmdzIGRpYWxvZy5cbiAgICAgKi9cbiAgICBteS5vcGVuU2V0dGluZ3NEaWFsb2cgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5Ud29CdXR0b25EaWFsb2coXG4gICAgICAgICAgICAnPGgyPkNvbmZpZ3VyZSB5b3VyIGNvbmZlcmVuY2U8L2gyPicgK1xuICAgICAgICAgICAgICAgICc8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgaWQ9XCJpbml0TXV0ZWRcIj4nICtcbiAgICAgICAgICAgICAgICAnUGFydGljaXBhbnRzIGpvaW4gbXV0ZWQ8YnIvPicgK1xuICAgICAgICAgICAgICAgICc8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgaWQ9XCJyZXF1aXJlTmlja25hbWVzXCI+JyArXG4gICAgICAgICAgICAgICAgJ1JlcXVpcmUgbmlja25hbWVzPGJyLz48YnIvPicgK1xuICAgICAgICAgICAgICAgICdTZXQgYSBzZWNyZXQga2V5IHRvIGxvY2sgeW91ciByb29tOicgK1xuICAgICAgICAgICAgICAgICc8aW5wdXQgaWQ9XCJsb2NrS2V5XCIgdHlwZT1cInRleHRcIiBwbGFjZWhvbGRlcj1cInlvdXIgc2hhcmVkIGtleVwiJyArXG4gICAgICAgICAgICAgICAgJ2F1dG9mb2N1cz4nLFxuICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgXCJTYXZlXCIsXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2tLZXknKS5mb2N1cygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChlLCB2KSB7XG4gICAgICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQoJyNpbml0TXV0ZWQnKS5pcyhcIjpjaGVja2VkXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpdCBpcyBjaGVja2VkXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoJCgnI3JlcXVpcmVOaWNrbmFtZXMnKS5pcyhcIjpjaGVja2VkXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpdCBpcyBjaGVja2VkXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxvY2tLZXkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9ja0tleScpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChsb2NrS2V5LnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRTaGFyZWRLZXkobG9ja0tleS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NrUm9vbSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB0aGUgYXBwbGljYXRpb24gaW4gYW5kIG91dCBvZiBmdWxsIHNjcmVlbiBtb2RlXG4gICAgICogKGEuay5hLiBwcmVzZW50YXRpb24gbW9kZSBpbiBDaHJvbWUpLlxuICAgICAqL1xuICAgIG15LnRvZ2dsZUZ1bGxTY3JlZW4gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGZzRWxlbWVudCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcblxuICAgICAgICBpZiAoIWRvY3VtZW50Lm1vekZ1bGxTY3JlZW4gJiYgIWRvY3VtZW50LndlYmtpdElzRnVsbFNjcmVlbikge1xuICAgICAgICAgICAgLy9FbnRlciBGdWxsIFNjcmVlblxuICAgICAgICAgICAgaWYgKGZzRWxlbWVudC5tb3pSZXF1ZXN0RnVsbFNjcmVlbikge1xuICAgICAgICAgICAgICAgIGZzRWxlbWVudC5tb3pSZXF1ZXN0RnVsbFNjcmVlbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZnNFbGVtZW50LndlYmtpdFJlcXVlc3RGdWxsU2NyZWVuKEVsZW1lbnQuQUxMT1dfS0VZQk9BUkRfSU5QVVQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy9FeGl0IEZ1bGwgU2NyZWVuXG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQubW96Q2FuY2VsRnVsbFNjcmVlbikge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50Lm1vekNhbmNlbEZ1bGxTY3JlZW4oKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQud2Via2l0Q2FuY2VsRnVsbFNjcmVlbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBsb2NrIGJ1dHRvbiBzdGF0ZS5cbiAgICAgKi9cbiAgICBteS51cGRhdGVMb2NrQnV0dG9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGJ1dHRvbkNsaWNrKFwiI2xvY2tJY29uXCIsIFwiaWNvbi1zZWN1cml0eSBpY29uLXNlY3VyaXR5LWxvY2tlZFwiKTtcbiAgICB9O1xuXG4gICAgLy8gU2hvd3Mgb3IgaGlkZXMgdGhlICdyZWNvcmRpbmcnIGJ1dHRvbi5cbiAgICBteS5zaG93UmVjb3JkaW5nQnV0dG9uID0gZnVuY3Rpb24gKHNob3cpIHtcbiAgICAgICAgaWYgKCFjb25maWcuZW5hYmxlUmVjb3JkaW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc2hvdykge1xuICAgICAgICAgICAgJCgnI3JlY29yZGluZycpLmNzcyh7ZGlzcGxheTogXCJpbmxpbmVcIn0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgJCgnI3JlY29yZGluZycpLmNzcyh7ZGlzcGxheTogXCJub25lXCJ9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBUb2dnbGUgdGhlIHN0YXRlIG9mIHRoZSByZWNvcmRpbmcgYnV0dG9uXG4gICAgbXkudG9nZ2xlUmVjb3JkaW5nQnV0dG9uU3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJCgnI3JlY29yZEJ1dHRvbicpLnRvZ2dsZUNsYXNzKCdhY3RpdmUnKTtcbiAgICB9O1xuXG4gICAgLy8gU2hvd3Mgb3IgaGlkZXMgU0lQIGNhbGxzIGJ1dHRvblxuICAgIG15LnNob3dTaXBDYWxsQnV0dG9uID0gZnVuY3Rpb24oc2hvdyl7XG4gICAgICAgIGlmIChjb25maWcuaG9zdHMuY2FsbF9jb250cm9sICYmIHNob3cpIHtcbiAgICAgICAgICAgICQoJyNzaXBDYWxsQnV0dG9uJykuY3NzKHtkaXNwbGF5OiBcImlubGluZVwifSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjc2lwQ2FsbEJ1dHRvbicpLmNzcyh7ZGlzcGxheTogXCJub25lXCJ9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gbXk7XG59KFRvb2xiYXIgfHwge30pKTtcblxubW9kdWxlLmV4cG9ydHMgPSBUb29sYmFyO1xuIiwidmFyIFRvb2xiYXIgPSByZXF1aXJlKFwiLi90b29sYmFyXCIpO1xuXG52YXIgVG9vbGJhclRvZ2dsZXIgPSAoZnVuY3Rpb24obXkpIHtcbiAgICB2YXIgSU5JVElBTF9UT09MQkFSX1RJTUVPVVQgPSAyMDAwMDtcbiAgICB2YXIgVE9PTEJBUl9USU1FT1VUID0gSU5JVElBTF9UT09MQkFSX1RJTUVPVVQ7XG4gICAgdmFyIHRvb2xiYXJUaW1lb3V0O1xuXG4gICAgLyoqXG4gICAgICogU2hvd3MgdGhlIG1haW4gdG9vbGJhci5cbiAgICAgKi9cbiAgICBteS5zaG93VG9vbGJhciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgaGVhZGVyID0gJChcIiNoZWFkZXJcIiksXG4gICAgICAgICAgICBib3R0b21Ub29sYmFyID0gJChcIiNib3R0b21Ub29sYmFyXCIpO1xuICAgICAgICBpZiAoIWhlYWRlci5pcygnOnZpc2libGUnKSB8fCAhYm90dG9tVG9vbGJhci5pcyhcIjp2aXNpYmxlXCIpKSB7XG4gICAgICAgICAgICBoZWFkZXIuc2hvdyhcInNsaWRlXCIsIHsgZGlyZWN0aW9uOiBcInVwXCIsIGR1cmF0aW9uOiAzMDB9KTtcbiAgICAgICAgICAgICQoJyNzdWJqZWN0JykuYW5pbWF0ZSh7dG9wOiBcIis9NDBcIn0sIDMwMCk7XG4gICAgICAgICAgICBpZighYm90dG9tVG9vbGJhci5pcyhcIjp2aXNpYmxlXCIpKSB7XG4gICAgICAgICAgICAgICAgYm90dG9tVG9vbGJhci5zaG93KFwic2xpZGVcIiwge2RpcmVjdGlvbjogXCJyaWdodFwiLGNkdXJhdGlvbjogMzAwfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0b29sYmFyVGltZW91dCkge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0b29sYmFyVGltZW91dCk7XG4gICAgICAgICAgICAgICAgdG9vbGJhclRpbWVvdXQgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdG9vbGJhclRpbWVvdXQgPSBzZXRUaW1lb3V0KGhpZGVUb29sYmFyLCBUT09MQkFSX1RJTUVPVVQpO1xuICAgICAgICAgICAgVE9PTEJBUl9USU1FT1VUID0gNDAwMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmb2N1cyAhPSBudWxsKVxuICAgICAgICB7XG4vLyAgICAgICAgICAgIFRPRE86IEVuYWJsZSBzZXR0aW5ncyBmdW5jdGlvbmFsaXR5LiBOZWVkIHRvIHVuY29tbWVudCB0aGUgc2V0dGluZ3MgYnV0dG9uIGluIGluZGV4Lmh0bWwuXG4vLyAgICAgICAgICAgICQoJyNzZXR0aW5nc0J1dHRvbicpLmNzcyh7dmlzaWJpbGl0eTpcInZpc2libGVcIn0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2hvdy9oaWRlIGRlc2t0b3Agc2hhcmluZyBidXR0b25cbiAgICAgICAgc2hvd0Rlc2t0b3BTaGFyaW5nQnV0dG9uKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEhpZGVzIHRoZSB0b29sYmFyLlxuICAgICAqL1xuICAgIHZhciBoaWRlVG9vbGJhciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGhlYWRlciA9ICQoXCIjaGVhZGVyXCIpLFxuICAgICAgICAgICAgYm90dG9tVG9vbGJhciA9ICQoXCIjYm90dG9tVG9vbGJhclwiKTtcbiAgICAgICAgdmFyIGlzVG9vbGJhckhvdmVyID0gZmFsc2U7XG4gICAgICAgIGhlYWRlci5maW5kKCcqJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgaWQgPSAkKHRoaXMpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBpZiAoJChcIiNcIiArIGlkICsgXCI6aG92ZXJcIikubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGlzVG9vbGJhckhvdmVyID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmKCQoXCIjYm90dG9tVG9vbGJhcjpob3ZlclwiKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaXNUb29sYmFySG92ZXIgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY2xlYXJUaW1lb3V0KHRvb2xiYXJUaW1lb3V0KTtcbiAgICAgICAgdG9vbGJhclRpbWVvdXQgPSBudWxsO1xuXG4gICAgICAgIGlmICghaXNUb29sYmFySG92ZXIpIHtcbiAgICAgICAgICAgIGhlYWRlci5oaWRlKFwic2xpZGVcIiwgeyBkaXJlY3Rpb246IFwidXBcIiwgZHVyYXRpb246IDMwMH0pO1xuICAgICAgICAgICAgJCgnI3N1YmplY3QnKS5hbmltYXRlKHt0b3A6IFwiLT00MFwifSwgMzAwKTtcbiAgICAgICAgICAgIGlmKCEkKFwiI3JlbW90ZVZpZGVvc1wiKS5pcyhcIjp2aXNpYmxlXCIpKSB7XG4gICAgICAgICAgICAgICAgYm90dG9tVG9vbGJhci5oaWRlKFwic2xpZGVcIiwge2RpcmVjdGlvbjogXCJyaWdodFwiLCBjZHVyYXRpb246IDMwMH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdG9vbGJhclRpbWVvdXQgPSBzZXRUaW1lb3V0KGhpZGVUb29sYmFyLCBUT09MQkFSX1RJTUVPVVQpO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgLyoqXG4gICAgICogRG9ja3MvdW5kb2NrcyB0aGUgdG9vbGJhci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBpc0RvY2sgaW5kaWNhdGVzIHdoYXQgb3BlcmF0aW9uIHRvIHBlcmZvcm1cbiAgICAgKi9cbiAgICBteS5kb2NrVG9vbGJhciA9IGZ1bmN0aW9uKGlzRG9jaykge1xuICAgICAgICBpZiAoaXNEb2NrKSB7XG4gICAgICAgICAgICAvLyBGaXJzdCBtYWtlIHN1cmUgdGhlIHRvb2xiYXIgaXMgc2hvd24uXG4gICAgICAgICAgICBpZiAoISQoJyNoZWFkZXInKS5pcygnOnZpc2libGUnKSkge1xuICAgICAgICAgICAgICAgIFRvb2xiYXJUb2dnbGVyLnNob3dUb29sYmFyKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRoZW4gY2xlYXIgdGhlIHRpbWUgb3V0LCB0byBkb2NrIHRoZSB0b29sYmFyLlxuICAgICAgICAgICAgaWYgKHRvb2xiYXJUaW1lb3V0KSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRvb2xiYXJUaW1lb3V0KTtcbiAgICAgICAgICAgICAgICB0b29sYmFyVGltZW91dCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAoISQoJyNoZWFkZXInKS5pcygnOnZpc2libGUnKSkge1xuICAgICAgICAgICAgICAgIFRvb2xiYXJUb2dnbGVyLnNob3dUb29sYmFyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0b29sYmFyVGltZW91dCA9IHNldFRpbWVvdXQoaGlkZVRvb2xiYXIsIFRPT0xCQVJfVElNRU9VVCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICByZXR1cm4gbXk7XG59KFRvb2xiYXJUb2dnbGVyIHx8IHt9KSk7XG5cbm1vZHVsZS5leHBvcnRzID0gVG9vbGJhclRvZ2dsZXI7IiwidmFyIFJUQ0Jyb3dzZXJUeXBlID0ge1xuICAgIFJUQ19CUk9XU0VSX0NIUk9NRTogXCJydGNfYnJvd3Nlci5jaHJvbWVcIixcblxuICAgIFJUQ19CUk9XU0VSX0ZJUkVGT1g6IFwicnRjX2Jyb3dzZXIuZmlyZWZveFwiXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJUQ0Jyb3dzZXJUeXBlOyIsInZhciBTdHJlYW1FdmVudFR5cGVzID0ge1xuICAgIEVWRU5UX1RZUEVfTE9DQUxfQ1JFQVRFRDogXCJzdHJlYW0ubG9jYWxfY3JlYXRlZFwiLFxuXG4gICAgRVZFTlRfVFlQRV9MT0NBTF9FTkRFRDogXCJzdHJlYW0ubG9jYWxfZW5kZWRcIixcblxuICAgIEVWRU5UX1RZUEVfUkVNT1RFX0NSRUFURUQ6IFwic3RyZWFtLnJlbW90ZV9jcmVhdGVkXCIsXG5cbiAgICBFVkVOVF9UWVBFX1JFTU9URV9FTkRFRDogXCJzdHJlYW0ucmVtb3RlX2VuZGVkXCJcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3RyZWFtRXZlbnRUeXBlczsiXX0=
