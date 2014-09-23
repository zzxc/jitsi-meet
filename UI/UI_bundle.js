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
                Toolbar.showRecordingButton(true);
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
    var lastNCount = config.channelLastN;
    var lastNEndpointsCache = [];
    var largeVideoNewSrc = '';
    var browser = null;
    var flipXLocalVideo = true;

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

},{"../service/RTC/RTCBrowserType.js":20,"./ContactList":1,"./UIActivator.js":2,"./UIUtil.js":4,"./chat/Chat":8,"./toolbars/toolbar_toggler":19}],6:[function(require,module,exports){
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

    function hangup() {
        disposeConference();
        sessionTerminated = true;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9Db250YWN0TGlzdC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL1VJQWN0aXZhdG9yLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvVUlTZXJ2aWNlLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvVUlVdGlsLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvVmlkZW9MYXlvdXQuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9hdWRpb2xldmVscy9BdWRpb0xldmVscy5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL2F1ZGlvbGV2ZWxzL0NhbnZhc1V0aWwuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9jaGF0L0NoYXQuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9jaGF0L1JlcGxhY2VtZW50LmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvZXRoZXJwYWQvRXRoZXJwYWQuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS9rZXlib2FyZF9zaG9ydGN1dC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL3ByZXppL1ByZXppLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvcHJlemkvUHJlemlQbGF5ZXIuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9VSS90b29sYmFycy9Cb3R0b21Ub29sYmFyLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvVUkvdG9vbGJhcnMvVG9vbGJhci5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1VJL3Rvb2xiYXJzL3Rvb2xiYXJfdG9nZ2xlci5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L3NlcnZpY2UvUlRDL1JUQ0Jyb3dzZXJUeXBlLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvc2VydmljZS9SVEMvU3RyZWFtRXZlbnRUeXBlcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaHVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3BTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDL1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIFZpZGVvTGF5b3V0ID0gcmVxdWlyZShcIi4vVmlkZW9MYXlvdXQuanNcIik7XG5cbi8qKlxuICogQ29udGFjdCBsaXN0LlxuICovXG52YXIgQ29udGFjdExpc3QgPSAoZnVuY3Rpb24gKG15KSB7XG4gICAgLyoqXG4gICAgICogSW5kaWNhdGVzIGlmIHRoZSBjaGF0IGlzIGN1cnJlbnRseSB2aXNpYmxlLlxuICAgICAqXG4gICAgICogQHJldHVybiA8dHQ+dHJ1ZTwvdHQ+IGlmIHRoZSBjaGF0IGlzIGN1cnJlbnRseSB2aXNpYmxlLCA8dHQ+ZmFsc2U8L3R0PiAtXG4gICAgICogb3RoZXJ3aXNlXG4gICAgICovXG4gICAgbXkuaXNWaXNpYmxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJCgnI2NvbnRhY3RsaXN0JykuaXMoXCI6dmlzaWJsZVwiKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQWRkcyBhIGNvbnRhY3QgZm9yIHRoZSBnaXZlbiBwZWVySmlkIGlmIHN1Y2ggZG9lc24ndCB5ZXQgZXhpc3QuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGVlckppZCB0aGUgcGVlckppZCBjb3JyZXNwb25kaW5nIHRvIHRoZSBjb250YWN0XG4gICAgICovXG4gICAgbXkuZW5zdXJlQWRkQ29udGFjdCA9IGZ1bmN0aW9uKHBlZXJKaWQpIHtcbiAgICAgICAgdmFyIHJlc291cmNlSmlkID0gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQocGVlckppZCk7XG5cbiAgICAgICAgdmFyIGNvbnRhY3QgPSAkKCcjY29udGFjdGxpc3Q+dWw+bGlbaWQ9XCInICsgcmVzb3VyY2VKaWQgKyAnXCJdJyk7XG5cbiAgICAgICAgaWYgKCFjb250YWN0IHx8IGNvbnRhY3QubGVuZ3RoIDw9IDApXG4gICAgICAgICAgICBDb250YWN0TGlzdC5hZGRDb250YWN0KHBlZXJKaWQpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBZGRzIGEgY29udGFjdCBmb3IgdGhlIGdpdmVuIHBlZXIgamlkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHBlZXJKaWQgdGhlIGppZCBvZiB0aGUgY29udGFjdCB0byBhZGRcbiAgICAgKi9cbiAgICBteS5hZGRDb250YWN0ID0gZnVuY3Rpb24ocGVlckppZCkge1xuICAgICAgICB2YXIgcmVzb3VyY2VKaWQgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChwZWVySmlkKTtcblxuICAgICAgICB2YXIgY29udGFjdGxpc3QgPSAkKCcjY29udGFjdGxpc3Q+dWwnKTtcblxuICAgICAgICB2YXIgbmV3Q29udGFjdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gICAgICAgIG5ld0NvbnRhY3QuaWQgPSByZXNvdXJjZUppZDtcblxuICAgICAgICBuZXdDb250YWN0LmFwcGVuZENoaWxkKGNyZWF0ZUF2YXRhcigpKTtcbiAgICAgICAgbmV3Q29udGFjdC5hcHBlbmRDaGlsZChjcmVhdGVEaXNwbGF5TmFtZVBhcmFncmFwaChcIlBhcnRpY2lwYW50XCIpKTtcblxuICAgICAgICB2YXIgY2xFbGVtZW50ID0gY29udGFjdGxpc3QuZ2V0KDApO1xuXG4gICAgICAgIGlmIChyZXNvdXJjZUppZCA9PT0gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZClcbiAgICAgICAgICAgICYmICQoJyNjb250YWN0bGlzdD51bCAudGl0bGUnKVswXS5uZXh0U2libGluZy5uZXh0U2libGluZylcbiAgICAgICAge1xuICAgICAgICAgICAgY2xFbGVtZW50Lmluc2VydEJlZm9yZShuZXdDb250YWN0LFxuICAgICAgICAgICAgICAgICAgICAkKCcjY29udGFjdGxpc3Q+dWwgLnRpdGxlJylbMF0ubmV4dFNpYmxpbmcubmV4dFNpYmxpbmcpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY2xFbGVtZW50LmFwcGVuZENoaWxkKG5ld0NvbnRhY3QpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYSBjb250YWN0IGZvciB0aGUgZ2l2ZW4gcGVlciBqaWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGVlckppZCB0aGUgcGVlckppZCBjb3JyZXNwb25kaW5nIHRvIHRoZSBjb250YWN0IHRvIHJlbW92ZVxuICAgICAqL1xuICAgIG15LnJlbW92ZUNvbnRhY3QgPSBmdW5jdGlvbihwZWVySmlkKSB7XG4gICAgICAgIHZhciByZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHBlZXJKaWQpO1xuXG4gICAgICAgIHZhciBjb250YWN0ID0gJCgnI2NvbnRhY3RsaXN0PnVsPmxpW2lkPVwiJyArIHJlc291cmNlSmlkICsgJ1wiXScpO1xuXG4gICAgICAgIGlmIChjb250YWN0ICYmIGNvbnRhY3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdmFyIGNvbnRhY3RsaXN0ID0gJCgnI2NvbnRhY3RsaXN0PnVsJyk7XG5cbiAgICAgICAgICAgIGNvbnRhY3RsaXN0LmdldCgwKS5yZW1vdmVDaGlsZChjb250YWN0LmdldCgwKSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogT3BlbnMgLyBjbG9zZXMgdGhlIGNvbnRhY3QgbGlzdCBhcmVhLlxuICAgICAqL1xuICAgIG15LnRvZ2dsZUNvbnRhY3RMaXN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY29udGFjdGxpc3QgPSAkKCcjY29udGFjdGxpc3QnKTtcblxuICAgICAgICB2YXIgY2hhdFNpemUgPSAoQ29udGFjdExpc3QuaXNWaXNpYmxlKCkpID8gWzAsIDBdIDogQ29udGFjdExpc3QuZ2V0Q29udGFjdExpc3RTaXplKCk7XG4gICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZVZpZGVvU3BhY2UoY29udGFjdGxpc3QsIGNoYXRTaXplLCBDb250YWN0TGlzdC5pc1Zpc2libGUoKSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHNpemUgb2YgdGhlIGNoYXQuXG4gICAgICovXG4gICAgbXkuZ2V0Q29udGFjdExpc3RTaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYXZhaWxhYmxlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICB2YXIgYXZhaWxhYmxlV2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aDtcblxuICAgICAgICB2YXIgY2hhdFdpZHRoID0gMjAwO1xuICAgICAgICBpZiAoYXZhaWxhYmxlV2lkdGggKiAwLjIgPCAyMDApXG4gICAgICAgICAgICBjaGF0V2lkdGggPSBhdmFpbGFibGVXaWR0aCAqIDAuMjtcblxuICAgICAgICByZXR1cm4gW2NoYXRXaWR0aCwgYXZhaWxhYmxlSGVpZ2h0XTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyB0aGUgYXZhdGFyIGVsZW1lbnQuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHRoZSBuZXdseSBjcmVhdGVkIGF2YXRhciBlbGVtZW50XG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlQXZhdGFyKCkge1xuICAgICAgICB2YXIgYXZhdGFyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaScpO1xuICAgICAgICBhdmF0YXIuY2xhc3NOYW1lID0gXCJpY29uLWF2YXRhciBhdmF0YXJcIjtcblxuICAgICAgICByZXR1cm4gYXZhdGFyO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIHRoZSBkaXNwbGF5IG5hbWUgcGFyYWdyYXBoLlxuICAgICAqXG4gICAgICogQHBhcmFtIGRpc3BsYXlOYW1lIHRoZSBkaXNwbGF5IG5hbWUgdG8gc2V0XG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlRGlzcGxheU5hbWVQYXJhZ3JhcGgoZGlzcGxheU5hbWUpIHtcbiAgICAgICAgdmFyIHAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG4gICAgICAgIHAuaW5uZXJIVE1MID0gZGlzcGxheU5hbWU7XG5cbiAgICAgICAgcmV0dXJuIHA7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEluZGljYXRlcyB0aGF0IHRoZSBkaXNwbGF5IG5hbWUgaGFzIGNoYW5nZWQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCggICAnZGlzcGxheW5hbWVjaGFuZ2VkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChldmVudCwgcGVlckppZCwgZGlzcGxheU5hbWUpIHtcbiAgICAgICAgaWYgKHBlZXJKaWQgPT09ICdsb2NhbFZpZGVvQ29udGFpbmVyJylcbiAgICAgICAgICAgIHBlZXJKaWQgPSBjb25uZWN0aW9uLmVtdWMubXlyb29tamlkO1xuXG4gICAgICAgIHZhciByZXNvdXJjZUppZCA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHBlZXJKaWQpO1xuXG4gICAgICAgIHZhciBjb250YWN0TmFtZSA9ICQoJyNjb250YWN0bGlzdCAjJyArIHJlc291cmNlSmlkICsgJz5wJyk7XG5cbiAgICAgICAgaWYgKGNvbnRhY3ROYW1lICYmIGRpc3BsYXlOYW1lICYmIGRpc3BsYXlOYW1lLmxlbmd0aCA+IDApXG4gICAgICAgICAgICBjb250YWN0TmFtZS5odG1sKGRpc3BsYXlOYW1lKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBteTtcbn0oQ29udGFjdExpc3QgfHwge30pKTtcbm1vZHVsZS5leHBvcnRzID0gQ29udGFjdExpc3QiLCJ2YXIgVUlTZXJ2aWNlID0gcmVxdWlyZShcIi4vVUlTZXJ2aWNlXCIpO1xudmFyIFZpZGVvTGF5b3V0ID0gcmVxdWlyZShcIi4vVmlkZW9MYXlvdXQuanNcIik7XG52YXIgQXVkaW9MZXZlbHMgPSByZXF1aXJlKFwiLi9hdWRpb2xldmVscy9BdWRpb0xldmVscy5qc1wiKTtcbnZhciBQcmV6aSA9IHJlcXVpcmUoXCIuL3ByZXppL1ByZXppLmpzXCIpO1xudmFyIEV0aGVycGFkID0gcmVxdWlyZShcIi4vZXRoZXJwYWQvRXRoZXJwYWQuanNcIik7XG52YXIgQ2hhdCA9IHJlcXVpcmUoXCIuL2NoYXQvQ2hhdC5qc1wiKTtcbnZhciBTdHJlYW1FdmVudFR5cGVzID0gcmVxdWlyZShcIi4uL3NlcnZpY2UvUlRDL1N0cmVhbUV2ZW50VHlwZXMuanNcIik7XG52YXIgVG9vbGJhciA9IHJlcXVpcmUoXCIuL3Rvb2xiYXJzL3Rvb2xiYXJcIik7XG52YXIgVG9vbGJhclRvZ2dsZXIgPSByZXF1aXJlKFwiLi90b29sYmFycy90b29sYmFyX3RvZ2dsZXJcIik7XG52YXIgQm90dG9tVG9vbGJhciA9IHJlcXVpcmUoXCIuL3Rvb2xiYXJzL0JvdHRvbVRvb2xiYXJcIik7XG52YXIgS2V5Ym9hcmRTaG9ydGN1dCA9IHJlcXVpcmUoXCIuL2tleWJvYXJkX3Nob3J0Y3V0XCIpO1xuXG52YXIgVUlBY3RpdmF0b3IgPSBmdW5jdGlvbigpXG57XG4gICAgdmFyIHVpU2VydmljZSA9IG51bGw7XG4gICAgZnVuY3Rpb24gVUlBY3RpdmF0b3JQcm90bygpXG4gICAge1xuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0dXBQcmV6aSgpXG4gICAge1xuICAgICAgICAkKFwiI3Rvb2xiYXJfcHJlemlcIikuY2xpY2soZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICBQcmV6aS5vcGVuUHJlemlEaWFsb2coKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJChcIiNyZWxvYWRQcmVzZW50YXRpb25MaW5rXCIpLmNsaWNrKGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgUHJlemkucmVsb2FkUHJlc2VudGF0aW9uKCk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0dXBFdGhlcnBhZCgpXG4gICAge1xuICAgICAgICAkKFwiI3Rvb2xiYXJfZXRoZXJwYWRcIikuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgRXRoZXJwYWQudG9nZ2xlRXRoZXJwYWQoMCk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0dXBBdWRpb0xldmVscygpIHtcbiAgICAgICAgU3RhdGlzdGljc0FjdGl2YXRvci5hZGRBdWRpb0xldmVsTGlzdGVuZXIoQXVkaW9MZXZlbHMudXBkYXRlQXVkaW9MZXZlbCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0dXBDaGF0KClcbiAgICB7XG4gICAgICAgIENoYXQuaW5pdCgpO1xuICAgICAgICAkKFwiI3Rvb2xiYXJfY2hhdFwiKS5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBDaGF0LnRvZ2dsZUNoYXQoKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXR1cFZpZGVvTGF5b3V0RXZlbnRzKClcbiAgICB7XG5cbiAgICAgICAgJChkb2N1bWVudCkuYmluZCgnY2FsbGFjdGl2ZS5qaW5nbGUnLCBmdW5jdGlvbiAoZXZlbnQsIHZpZGVvZWxlbSwgc2lkKSB7XG4gICAgICAgICAgICBpZiAodmlkZW9lbGVtLmF0dHIoJ2lkJykuaW5kZXhPZignbWl4ZWRtc2xhYmVsJykgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgLy8gaWdub3JlIG1peGVkbXNsYWJlbGEwIGFuZCB2MFxuICAgICAgICAgICAgICAgIHZpZGVvZWxlbS5zaG93KCk7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplVGh1bWJuYWlscygpO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBsYXJnZSB2aWRlbyB0byB0aGUgbGFzdCBhZGRlZCB2aWRlbyBvbmx5IGlmIHRoZXJlJ3Mgbm9cbiAgICAgICAgICAgICAgICAvLyBjdXJyZW50IGFjdGl2ZSBvciBmb2N1c2VkIHNwZWFrZXIuXG4gICAgICAgICAgICAgICAgaWYgKCFWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMgJiYgIVZpZGVvTGF5b3V0LmdldERvbWluYW50U3BlYWtlclJlc291cmNlSmlkKCkpXG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8odmlkZW9lbGVtLmF0dHIoJ3NyYycpLCAxKTtcblxuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dGb2N1c0luZGljYXRvcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXR1cFRvb2xiYXJzKCkge1xuICAgICAgICBUb29sYmFyLmluaXQoKTtcbiAgICAgICAgQm90dG9tVG9vbGJhci5pbml0KCk7XG4gICAgfVxuXG4gICAgVUlBY3RpdmF0b3JQcm90by5zdGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gQnkgZGVmYXVsdCB3ZSB1c2UgY2FtZXJhXG4gICAgICAgIGdldFZpZGVvU2l6ZSA9IFZpZGVvTGF5b3V0LmdldENhbWVyYVZpZGVvU2l6ZTtcbiAgICAgICAgZ2V0VmlkZW9Qb3NpdGlvbiA9IFZpZGVvTGF5b3V0LmdldENhbWVyYVZpZGVvUG9zaXRpb247XG4gICAgICAgICQoJ2JvZHknKS5wb3BvdmVyKHsgc2VsZWN0b3I6ICdbZGF0YS10b2dnbGU9cG9wb3Zlcl0nLFxuICAgICAgICAgICAgdHJpZ2dlcjogJ2NsaWNrIGhvdmVyJ30pO1xuICAgICAgICBWaWRlb0xheW91dC5yZXNpemVMYXJnZVZpZGVvQ29udGFpbmVyKCk7XG4gICAgICAgICQoXCIjdmlkZW9zcGFjZVwiKS5tb3VzZW1vdmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIFRvb2xiYXJUb2dnbGVyLnNob3dUb29sYmFyKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBLZXlib2FyZFNob3J0Y3V0LmluaXQoKTtcbiAgICAgICAgcmVnaXN0ZXJMaXN0ZW5lcnMoKTtcbiAgICAgICAgYmluZEV2ZW50cygpO1xuICAgICAgICBzZXR1cEF1ZGlvTGV2ZWxzKCk7XG4gICAgICAgIHNldHVwVmlkZW9MYXlvdXRFdmVudHMoKTtcbiAgICAgICAgc2V0dXBQcmV6aSgpO1xuICAgICAgICBzZXR1cEV0aGVycGFkKCk7XG4gICAgICAgIHNldHVwVG9vbGJhcnMoKTtcbiAgICAgICAgc2V0dXBDaGF0KClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZWdpc3Rlckxpc3RlbmVycygpIHtcbiAgICAgICAgUlRDQWN0aXZhdG9yLmFkZFN0cmVhbUxpc3RlbmVyKGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgICAgIHN3aXRjaCAoc3RyZWFtLnR5cGUpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY2FzZSBcImF1ZGlvXCI6XG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LmNoYW5nZUxvY2FsQXVkaW8oc3RyZWFtLmdldE9yaWdpbmFsU3RyZWFtKCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwidmlkZW9cIjpcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuY2hhbmdlTG9jYWxWaWRlbyhzdHJlYW0uZ2V0T3JpZ2luYWxTdHJlYW0oKSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJkZXNrdG9wXCI6XG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LmNoYW5nZUxvY2FsVmlkZW8oc3RyZWFtLCAhaXNVc2luZ1NjcmVlblN0cmVhbSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBTdHJlYW1FdmVudFR5cGVzLkVWRU5UX1RZUEVfTE9DQUxfQ1JFQVRFRCk7XG5cbiAgICAgICAgUlRDQWN0aXZhdG9yLmFkZFN0cmVhbUxpc3RlbmVyKGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0Lm9uUmVtb3RlU3RyZWFtQWRkZWQoc3RyZWFtKTtcbiAgICAgICAgfSwgU3RyZWFtRXZlbnRUeXBlcy5FVkVOVF9UWVBFX1JFTU9URV9DUkVBVEVEKTtcbiAgICAgICAgLy8gTGlzdGVuIGZvciBsYXJnZSB2aWRlbyBzaXplIHVwZGF0ZXNcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xhcmdlVmlkZW8nKVxuICAgICAgICAgICAgLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50VmlkZW9XaWR0aCA9IHRoaXMudmlkZW9XaWR0aDtcbiAgICAgICAgICAgICAgICBjdXJyZW50VmlkZW9IZWlnaHQgPSB0aGlzLnZpZGVvSGVpZ2h0O1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnBvc2l0aW9uTGFyZ2UoY3VycmVudFZpZGVvV2lkdGgsIGN1cnJlbnRWaWRlb0hlaWdodCk7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gYmluZEV2ZW50cygpXG4gICAge1xuICAgICAgICAvKipcbiAgICAgICAgICogUmVzaXplcyBhbmQgcmVwb3NpdGlvbnMgdmlkZW9zIGluIGZ1bGwgc2NyZWVuIG1vZGUuXG4gICAgICAgICAqL1xuICAgICAgICAkKGRvY3VtZW50KS5vbignd2Via2l0ZnVsbHNjcmVlbmNoYW5nZSBtb3pmdWxsc2NyZWVuY2hhbmdlIGZ1bGxzY3JlZW5jaGFuZ2UnLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZUxhcmdlVmlkZW9Db250YWluZXIoKTtcbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5wb3NpdGlvbkxhcmdlKCk7XG4gICAgICAgICAgICAgICAgaXNGdWxsU2NyZWVuID0gZG9jdW1lbnQuZnVsbFNjcmVlbiB8fFxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5tb3pGdWxsU2NyZWVuIHx8XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LndlYmtpdElzRnVsbFNjcmVlbjtcblxuICAgICAgICAgICAgICAgIGlmIChpc0Z1bGxTY3JlZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0VmlldyhcImZ1bGxzY3JlZW5cIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZXRWaWV3KFwiZGVmYXVsdFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICAgICAgJCh3aW5kb3cpLnJlc2l6ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5yZXNpemVMYXJnZVZpZGVvQ29udGFpbmVyKCk7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5wb3NpdGlvbkxhcmdlKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGN1cnJlbnQgdmlldy5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzZXRWaWV3KHZpZXdOYW1lKSB7XG4vLyAgICBpZiAodmlld05hbWUgPT0gXCJmdWxsc2NyZWVuXCIpIHtcbi8vICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndmlkZW9sYXlvdXRfZnVsbHNjcmVlbicpLmRpc2FibGVkICA9IGZhbHNlO1xuLy8gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd2aWRlb2xheW91dF9kZWZhdWx0JykuZGlzYWJsZWQgID0gdHJ1ZTtcbi8vICAgIH1cbi8vICAgIGVsc2Uge1xuLy8gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd2aWRlb2xheW91dF9kZWZhdWx0JykuZGlzYWJsZWQgID0gZmFsc2U7XG4vLyAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ZpZGVvbGF5b3V0X2Z1bGxzY3JlZW4nKS5kaXNhYmxlZCAgPSB0cnVlO1xuLy8gICAgfVxuICAgIH1cblxuICAgIFVJQWN0aXZhdG9yUHJvdG8uZ2V0UlRDU2VydmljZSA9IGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIHJldHVybiBSVENBY3RpdmF0b3IuZ2V0UlRDU2VydmljZSgpO1xuICAgIH1cblxuICAgIFVJQWN0aXZhdG9yUHJvdG8uZ2V0VUlTZXJ2aWNlID0gZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgaWYodWlTZXJ2aWNlID09IG51bGwpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHVpU2VydmljZSA9IG5ldyBVSVNlcnZpY2UoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdWlTZXJ2aWNlO1xuICAgIH1cblxuICAgIFVJQWN0aXZhdG9yUHJvdG8uY2hhdEFkZEVycm9yID0gZnVuY3Rpb24oZXJyb3JNZXNzYWdlLCBvcmlnaW5hbFRleHQpXG4gICAge1xuICAgICAgICByZXR1cm4gQ2hhdC5jaGF0QWRkRXJyb3IoZXJyb3JNZXNzYWdlLCBvcmlnaW5hbFRleHQpO1xuICAgIH1cblxuICAgIFVJQWN0aXZhdG9yUHJvdG8uY2hhdFNldFN1YmplY3QgPSBmdW5jdGlvbih0ZXh0KVxuICAgIHtcbiAgICAgICAgcmV0dXJuIENoYXQuY2hhdFNldFN1YmplY3QodGV4dCk7XG4gICAgfVxuXG4gICAgVUlBY3RpdmF0b3JQcm90by51cGRhdGVDaGF0Q29udmVyc2F0aW9uID0gZnVuY3Rpb24gKGZyb20sIGRpc3BsYXlOYW1lLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiBDaGF0LnVwZGF0ZUNoYXRDb252ZXJzYXRpb24oZnJvbSwgZGlzcGxheU5hbWUsIG1lc3NhZ2UpO1xuICAgIH1cblxuXG4gICAgcmV0dXJuIFVJQWN0aXZhdG9yUHJvdG87XG59KCk7XG5cbm1vZHVsZS5leHBvcnRzID0gVUlBY3RpdmF0b3I7XG5cbiIsInZhciBBdWRpb0xldmVscyA9IHJlcXVpcmUoXCIuL2F1ZGlvbGV2ZWxzL0F1ZGlvTGV2ZWxzLmpzXCIpO1xudmFyIEV0aGVycGFkID0gcmVxdWlyZShcIi4vZXRoZXJwYWQvRXRoZXJwYWQuanNcIik7XG52YXIgVmlkZW9MYXlvdXQgPSByZXF1aXJlKFwiLi9WaWRlb0xheW91dC5qc1wiKTtcbnZhciBUb29sYmFyID0gcmVxdWlyZShcIi4vdG9vbGJhcnMvdG9vbGJhci5qc1wiKTtcbnZhciBUb29sYmFyVG9nZ2xlciA9IHJlcXVpcmUoXCIuL3Rvb2xiYXJzL3Rvb2xiYXJfdG9nZ2xlci5qc1wiKTtcbnZhciBDb250YWN0TGlzdCA9IHJlcXVpcmUoXCIuL0NvbnRhY3RMaXN0XCIpO1xuXG52YXIgVUlTZXJ2aWNlID0gZnVuY3Rpb24oKSB7XG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgcm9vbSBpbnZpdGUgdXJsLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHVwZGF0ZVJvb21VcmwobmV3Um9vbVVybCkge1xuICAgICAgICByb29tVXJsID0gbmV3Um9vbVVybDtcblxuICAgICAgICAvLyBJZiB0aGUgaW52aXRlIGRpYWxvZyBoYXMgYmVlbiBhbHJlYWR5IG9wZW5lZCB3ZSB1cGRhdGUgdGhlIGluZm9ybWF0aW9uLlxuICAgICAgICB2YXIgaW52aXRlTGluayA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpbnZpdGVMaW5rUmVmJyk7XG4gICAgICAgIGlmIChpbnZpdGVMaW5rKSB7XG4gICAgICAgICAgICBpbnZpdGVMaW5rLnZhbHVlID0gcm9vbVVybDtcbiAgICAgICAgICAgIGludml0ZUxpbmsuc2VsZWN0KCk7XG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanFpX3N0YXRlMF9idXR0b25JbnZpdGUnKS5kaXNhYmxlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gVUlTZXJ2aWNlUHJvdG8oKSB7XG5cbiAgICB9XG5cbiAgICBVSVNlcnZpY2VQcm90by5wcm90b3R5cGUudXBkYXRlQXVkaW9MZXZlbENhbnZhcyA9IGZ1bmN0aW9uIChwZWVySmlkKSB7XG4gICAgICAgIEF1ZGlvTGV2ZWxzLnVwZGF0ZUF1ZGlvTGV2ZWxDYW52YXMocGVlckppZCk7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLmluaXRFdGhlcnBhZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgRXRoZXJwYWQuaW5pdCgpO1xuICAgIH1cblxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLmNoZWNrQ2hhbmdlTGFyZ2VWaWRlbyA9IGZ1bmN0aW9uIChyZW1vdmVkVmlkZW9TcmMpIHtcbiAgICAgICAgVmlkZW9MYXlvdXQuY2hlY2tDaGFuZ2VMYXJnZVZpZGVvKHJlbW92ZWRWaWRlb1NyYyk7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLm9uTXVjSm9pbmVkID0gZnVuY3Rpb24gKGppZCwgaW5mbywgbm9NZW1iZXJzKSB7XG4gICAgICAgIHVwZGF0ZVJvb21Vcmwod2luZG93LmxvY2F0aW9uLmhyZWYpO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9jYWxOaWNrJykuYXBwZW5kQ2hpbGQoXG4gICAgICAgICAgICBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpICsgJyAobWUpJylcbiAgICAgICAgKTtcblxuICAgICAgICBpZiAobm9NZW1iZXJzKSB7XG4gICAgICAgICAgICBUb29sYmFyLnNob3dTaXBDYWxsQnV0dG9uKHRydWUpO1xuICAgICAgICAgICAgVG9vbGJhci5zaG93UmVjb3JkaW5nQnV0dG9uKGZhbHNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghZm9jdXMpIHtcbiAgICAgICAgICAgIFRvb2xiYXIuc2hvd1NpcENhbGxCdXR0b24oZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZvY3VzICYmIGNvbmZpZy5ldGhlcnBhZF9iYXNlKSB7XG4gICAgICAgICAgICB0aGlzLmluaXRFdGhlcnBhZCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0ZvY3VzSW5kaWNhdG9yKCk7XG5cbiAgICAgICAgLy8gQWRkIG15c2VsZiB0byB0aGUgY29udGFjdCBsaXN0LlxuICAgICAgICBDb250YWN0TGlzdC5hZGRDb250YWN0KGppZCk7XG5cbiAgICAgICAgLy8gT25jZSB3ZSd2ZSBqb2luZWQgdGhlIG11YyBzaG93IHRoZSB0b29sYmFyXG4gICAgICAgIFRvb2xiYXJUb2dnbGVyLnNob3dUb29sYmFyKCk7XG5cbiAgICAgICAgaWYgKGluZm8uZGlzcGxheU5hbWUpXG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdkaXNwbGF5bmFtZWNoYW5nZWQnLFxuICAgICAgICAgICAgICAgIFsnbG9jYWxWaWRlb0NvbnRhaW5lcicsIGluZm8uZGlzcGxheU5hbWUgKyAnIChtZSknXSk7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLm9uTXVjRW50ZXJlZCA9IGZ1bmN0aW9uIChqaWQsIGluZm8sIHByZXMpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2VudGVyZWQnLCBqaWQsIGluZm8pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdpcyBmb2N1cz8nICsgZm9jdXMgPyAndHJ1ZScgOiAnZmFsc2UnKTtcblxuICAgICAgICAvLyBBZGQgUGVlcidzIGNvbnRhaW5lclxuICAgICAgICBWaWRlb0xheW91dC5lbnN1cmVQZWVyQ29udGFpbmVyRXhpc3RzKGppZCk7XG5cbiAgICAgICAgaWYgKGZvY3VzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAvLyBGSVhNRTogdGhpcyBzaG91bGQgcHJlcGFyZSB0aGUgdmlkZW9cbiAgICAgICAgICAgIGlmIChmb2N1cy5jb25maWQgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbWFrZSBuZXcgY29uZmVyZW5jZSB3aXRoJywgamlkKTtcbiAgICAgICAgICAgICAgICBUb29sYmFyLnNob3dSZWNvcmRpbmdCdXR0b24odHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc2hhcmVkS2V5KSB7XG4gICAgICAgICAgICBUb29sYmFyLnVwZGF0ZUxvY2tCdXR0b24oKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS5vbk11Y1ByZXNlbmNlU3RhdHVzID0gZnVuY3Rpb24gKCBqaWQsIGluZm8sIHByZXMpIHtcbiAgICAgICAgVmlkZW9MYXlvdXQuc2V0UHJlc2VuY2VTdGF0dXMoXG4gICAgICAgICAgICAgICAgJ3BhcnRpY2lwYW50XycgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpLCBpbmZvLnN0YXR1cyk7XG4gICAgfVxuXG4gICAgVUlTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLm9uTXVjTGVmdCA9IGZ1bmN0aW9uKGppZClcbiAgICB7XG4gICAgICAgIC8vIE5lZWQgdG8gY2FsbCB0aGlzIHdpdGggYSBzbGlnaHQgZGVsYXksIG90aGVyd2lzZSB0aGUgZWxlbWVudCBjb3VsZG4ndCBiZVxuICAgICAgICAvLyBmb3VuZCBmb3Igc29tZSByZWFzb24uXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcbiAgICAgICAgICAgICAgICAgICAgJ3BhcnRpY2lwYW50XycgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpKTtcbiAgICAgICAgICAgIGlmIChjb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBoaWRlIGhlcmUsIHdhaXQgZm9yIHZpZGVvIHRvIGNsb3NlIGJlZm9yZSByZW1vdmluZ1xuICAgICAgICAgICAgICAgICQoY29udGFpbmVyKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplVGh1bWJuYWlscygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAxMCk7XG5cbiAgICAgICAgLy8gVW5sb2NrIGxhcmdlIHZpZGVvXG4gICAgICAgIGlmIChWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmIChnZXRKaWRGcm9tVmlkZW9TcmMoVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjKSA9PT0gamlkKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIkZvY3VzZWQgdmlkZW8gb3duZXIgaGFzIGxlZnQgdGhlIGNvbmZlcmVuY2VcIik7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgfVxuICAgIFxuICAgIFVJU2VydmljZVByb3RvLnByb3RvdHlwZS51cGRhdGVCdXR0b25zID0gZnVuY3Rpb24gKHJlY29yZGluZywgc2lwKSB7XG4gICAgICAgIGlmKHJlY29yZGluZyAhPSBudWxsKVxuICAgICAgICB7XG4gICAgICAgICAgICBUb29sYmFyLnNob3dSZWNvcmRpbmdCdXR0b24ocmVjb3JkaW5nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHNpcCAhPSBudWxsKVxuICAgICAgICB7XG4gICAgICAgICAgICBUb29sYmFyLnNob3dTaXBDYWxsQnV0dG9uKHNpcCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gVUlTZXJ2aWNlUHJvdG87XG59KCk7XG5tb2R1bGUuZXhwb3J0cyA9IFVJU2VydmljZTsiLCJcbnZhciBVSVV0aWwgPSAoZnVuY3Rpb24gKG15KSB7XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBhdmFpbGFibGUgdmlkZW8gd2lkdGguXG4gICAgICovXG4gICAgbXkuZ2V0QXZhaWxhYmxlVmlkZW9XaWR0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNoYXRzcGFjZVdpZHRoXG4gICAgICAgICAgICA9ICQoJyNjaGF0c3BhY2UnKS5pcyhcIjp2aXNpYmxlXCIpXG4gICAgICAgICAgICA/ICQoJyNjaGF0c3BhY2UnKS53aWR0aCgpXG4gICAgICAgICAgICA6IDA7XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbm5lcldpZHRoIC0gY2hhdHNwYWNlV2lkdGg7XG4gICAgfTtcblxuICAgIHJldHVybiBteTtcblxufSkoVUlVdGlsIHx8IHt9KTtcblxubW9kdWxlLmV4cG9ydHMgPSBVSVV0aWw7IiwidmFyIGRlcCA9XG57XG4gICAgXCJSVENCcm93c2VyVHlwZVwiOiBmdW5jdGlvbigpeyByZXR1cm4gcmVxdWlyZShcIi4uL3NlcnZpY2UvUlRDL1JUQ0Jyb3dzZXJUeXBlLmpzXCIpfSxcbiAgICBcIlVJQWN0aXZhdG9yXCI6IGZ1bmN0aW9uKCl7IHJldHVybiByZXF1aXJlKFwiLi9VSUFjdGl2YXRvci5qc1wiKX0sXG4gICAgXCJDaGF0XCI6IGZ1bmN0aW9uKCl7IHJldHVybiByZXF1aXJlKFwiLi9jaGF0L0NoYXRcIil9LFxuICAgIFwiVUlVdGlsXCI6IGZ1bmN0aW9uKCl7IHJldHVybiByZXF1aXJlKFwiLi9VSVV0aWwuanNcIil9LFxuICAgIFwiQ29udGFjdExpc3RcIjogZnVuY3Rpb24oKXsgcmV0dXJuIHJlcXVpcmUoXCIuL0NvbnRhY3RMaXN0XCIpfSxcbiAgICBcIlRvb2xiYXJcIjogZnVuY3Rpb24oKXsgcmV0dXJuIHJlcXVpcmUoXCIuL3Rvb2xiYXJzL3Rvb2xiYXJfdG9nZ2xlclwiKX1cbn1cblxudmFyIFZpZGVvTGF5b3V0ID0gKGZ1bmN0aW9uIChteSkge1xuICAgIHZhciBwcmVNdXRlZCA9IGZhbHNlO1xuICAgIHZhciBjdXJyZW50RG9taW5hbnRTcGVha2VyID0gbnVsbDtcbiAgICB2YXIgbGFzdE5Db3VudCA9IGNvbmZpZy5jaGFubmVsTGFzdE47XG4gICAgdmFyIGxhc3RORW5kcG9pbnRzQ2FjaGUgPSBbXTtcbiAgICB2YXIgbGFyZ2VWaWRlb05ld1NyYyA9ICcnO1xuICAgIHZhciBicm93c2VyID0gbnVsbDtcbiAgICB2YXIgZmxpcFhMb2NhbFZpZGVvID0gdHJ1ZTtcblxuICAgIHZhciBtdXRlZEF1ZGlvcyA9IHt9O1xuICAgIC8qKlxuICAgICAqIEN1cnJlbnRseSBmb2N1c2VkIHZpZGVvIFwic3JjXCIoZGlzcGxheWVkIGluIGxhcmdlIHZpZGVvKS5cbiAgICAgKiBAdHlwZSB7U3RyaW5nfVxuICAgICAqL1xuICAgIG15LmZvY3VzZWRWaWRlb1NyYyA9IG51bGw7XG5cbiAgICBmdW5jdGlvbiBhdHRhY2hNZWRpYVN0cmVhbShlbGVtZW50LCBzdHJlYW0pIHtcbiAgICAgICAgaWYoYnJvd3NlciA9PSBudWxsKVxuICAgICAgICB7XG4gICAgICAgICAgICBicm93c2VyID0gZGVwLlVJQWN0aXZhdG9yKCkuZ2V0UlRDU2VydmljZSgpLmdldEJyb3dzZXJUeXBlKCk7XG4gICAgICAgIH1cbiAgICAgICAgc3dpdGNoIChicm93c2VyKVxuICAgICAgICB7XG4gICAgICAgICAgICBjYXNlIGRlcC5SVENCcm93c2VyVHlwZSgpLlJUQ19CUk9XU0VSX0NIUk9NRTpcbiAgICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoJ3NyYycsIHdlYmtpdFVSTC5jcmVhdGVPYmplY3RVUkwoc3RyZWFtKSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGRlcC5SVENCcm93c2VyVHlwZSgpLlJUQ19CUk9XU0VSX0ZJUkVGT1g6XG4gICAgICAgICAgICAgICAgZWxlbWVudFswXS5tb3pTcmNPYmplY3QgPSBzdHJlYW07XG4gICAgICAgICAgICAgICAgZWxlbWVudFswXS5wbGF5KCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVW5rbm93biBicm93c2VyLlwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG15LmNoYW5nZUxvY2FsQXVkaW8gPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgICAgY29ubmVjdGlvbi5qaW5nbGUubG9jYWxBdWRpbyA9IHN0cmVhbTtcblxuICAgICAgICBhdHRhY2hNZWRpYVN0cmVhbSgkKCcjbG9jYWxBdWRpbycpLCBzdHJlYW0pO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9jYWxBdWRpbycpLmF1dG9wbGF5ID0gdHJ1ZTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2FsQXVkaW8nKS52b2x1bWUgPSAwO1xuICAgICAgICBpZiAocHJlTXV0ZWQpIHtcbiAgICAgICAgICAgIHRvZ2dsZUF1ZGlvKCk7XG4gICAgICAgICAgICBwcmVNdXRlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIG15LmNoYW5nZUxvY2FsVmlkZW8gPSBmdW5jdGlvbihzdHJlYW0sIGZsaXBYKSB7XG4gICAgICAgIGNvbm5lY3Rpb24uamluZ2xlLmxvY2FsVmlkZW8gPSBzdHJlYW07XG5cbiAgICAgICAgdmFyIGxvY2FsVmlkZW8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd2aWRlbycpO1xuICAgICAgICBsb2NhbFZpZGVvLmlkID0gJ2xvY2FsVmlkZW9fJyArIHN0cmVhbS5pZDtcbiAgICAgICAgbG9jYWxWaWRlby5hdXRvcGxheSA9IHRydWU7XG4gICAgICAgIGxvY2FsVmlkZW8udm9sdW1lID0gMDsgLy8gaXMgaXQgcmVxdWlyZWQgaWYgYXVkaW8gaXMgc2VwYXJhdGVkID9cbiAgICAgICAgbG9jYWxWaWRlby5vbmNvbnRleHRtZW51ID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gZmFsc2U7IH07XG5cbiAgICAgICAgdmFyIGxvY2FsVmlkZW9Db250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9jYWxWaWRlb1dyYXBwZXInKTtcbiAgICAgICAgbG9jYWxWaWRlb0NvbnRhaW5lci5hcHBlbmRDaGlsZChsb2NhbFZpZGVvKTtcblxuICAgICAgICAvLyBTZXQgZGVmYXVsdCBkaXNwbGF5IG5hbWUuXG4gICAgICAgIHNldERpc3BsYXlOYW1lKCdsb2NhbFZpZGVvQ29udGFpbmVyJyk7XG5cbiAgICAgICAgZGVwLlVJQWN0aXZhdG9yKCkuZ2V0VUlTZXJ2aWNlKCkudXBkYXRlQXVkaW9MZXZlbENhbnZhcygpO1xuXG4gICAgICAgIHZhciBsb2NhbFZpZGVvU2VsZWN0b3IgPSAkKCcjJyArIGxvY2FsVmlkZW8uaWQpO1xuICAgICAgICAvLyBBZGQgY2xpY2sgaGFuZGxlciB0byBib3RoIHZpZGVvIGFuZCB2aWRlbyB3cmFwcGVyIGVsZW1lbnRzIGluIGNhc2VcbiAgICAgICAgLy8gdGhlcmUncyBubyB2aWRlby5cbiAgICAgICAgbG9jYWxWaWRlb1NlbGVjdG9yLmNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmhhbmRsZVZpZGVvVGh1bWJDbGlja2VkKGxvY2FsVmlkZW8uc3JjKTtcbiAgICAgICAgfSk7XG4gICAgICAgICQoJyNsb2NhbFZpZGVvQ29udGFpbmVyJykuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuaGFuZGxlVmlkZW9UaHVtYkNsaWNrZWQobG9jYWxWaWRlby5zcmMpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgaG92ZXIgaGFuZGxlclxuICAgICAgICAkKCcjbG9jYWxWaWRlb0NvbnRhaW5lcicpLmhvdmVyKFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0Rpc3BsYXlOYW1lKCdsb2NhbFZpZGVvQ29udGFpbmVyJywgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFWaWRlb0xheW91dC5pc0xhcmdlVmlkZW9WaXNpYmxlKClcbiAgICAgICAgICAgICAgICAgICAgICAgIHx8IGxvY2FsVmlkZW8uc3JjICE9PSAkKCcjbGFyZ2VWaWRlbycpLmF0dHIoJ3NyYycpKVxuICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zaG93RGlzcGxheU5hbWUoJ2xvY2FsVmlkZW9Db250YWluZXInLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIC8vIEFkZCBzdHJlYW0gZW5kZWQgaGFuZGxlclxuICAgICAgICBzdHJlYW0ub25lbmRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGxvY2FsVmlkZW9Db250YWluZXIucmVtb3ZlQ2hpbGQobG9jYWxWaWRlbyk7XG4gICAgICAgICAgICBWaWRlb0xheW91dC51cGRhdGVSZW1vdmVkVmlkZW8obG9jYWxWaWRlby5zcmMpO1xuICAgICAgICB9O1xuICAgICAgICAvLyBGbGlwIHZpZGVvIHggYXhpcyBpZiBuZWVkZWRcbiAgICAgICAgZmxpcFhMb2NhbFZpZGVvID0gZmxpcFg7XG4gICAgICAgIGlmIChmbGlwWCkge1xuICAgICAgICAgICAgbG9jYWxWaWRlb1NlbGVjdG9yLmFkZENsYXNzKFwiZmxpcFZpZGVvWFwiKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBBdHRhY2ggV2ViUlRDIHN0cmVhbVxuICAgICAgICBhdHRhY2hNZWRpYVN0cmVhbShsb2NhbFZpZGVvU2VsZWN0b3IsIHN0cmVhbSk7XG5cbiAgICAgICAgbG9jYWxWaWRlb1NyYyA9IGxvY2FsVmlkZW8uc3JjO1xuXG4gICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8obG9jYWxWaWRlb1NyYywgMCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiByZW1vdmVkIHZpZGVvIGlzIGN1cnJlbnRseSBkaXNwbGF5ZWQgYW5kIHRyaWVzIHRvIGRpc3BsYXlcbiAgICAgKiBhbm90aGVyIG9uZSBpbnN0ZWFkLlxuICAgICAqIEBwYXJhbSByZW1vdmVkVmlkZW9TcmMgc3JjIHN0cmVhbSBpZGVudGlmaWVyIG9mIHRoZSB2aWRlby5cbiAgICAgKi9cbiAgICBteS51cGRhdGVSZW1vdmVkVmlkZW8gPSBmdW5jdGlvbihyZW1vdmVkVmlkZW9TcmMpIHtcbiAgICAgICAgaWYgKHJlbW92ZWRWaWRlb1NyYyA9PT0gJCgnI2xhcmdlVmlkZW8nKS5hdHRyKCdzcmMnKSkge1xuICAgICAgICAgICAgLy8gdGhpcyBpcyBjdXJyZW50bHkgZGlzcGxheWVkIGFzIGxhcmdlXG4gICAgICAgICAgICAvLyBwaWNrIHRoZSBsYXN0IHZpc2libGUgdmlkZW8gaW4gdGhlIHJvd1xuICAgICAgICAgICAgLy8gaWYgbm9ib2R5IGVsc2UgaXMgbGVmdCwgdGhpcyBwaWNrcyB0aGUgbG9jYWwgdmlkZW9cbiAgICAgICAgICAgIHZhciBwaWNrXG4gICAgICAgICAgICAgICAgPSAkKCcjcmVtb3RlVmlkZW9zPnNwYW5baWQhPVwibWl4ZWRzdHJlYW1cIl06dmlzaWJsZTpsYXN0PnZpZGVvJylcbiAgICAgICAgICAgICAgICAgICAgLmdldCgwKTtcblxuICAgICAgICAgICAgaWYgKCFwaWNrKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKFwiTGFzdCB2aXNpYmxlIHZpZGVvIG5vIGxvbmdlciBleGlzdHNcIik7XG4gICAgICAgICAgICAgICAgcGljayA9ICQoJyNyZW1vdGVWaWRlb3M+c3BhbltpZCE9XCJtaXhlZHN0cmVhbVwiXT52aWRlbycpLmdldCgwKTtcblxuICAgICAgICAgICAgICAgIGlmICghcGljayB8fCAhcGljay5zcmMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IGxvY2FsIHZpZGVvXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIkZhbGxiYWNrIHRvIGxvY2FsIHZpZGVvLi4uXCIpO1xuICAgICAgICAgICAgICAgICAgICBwaWNrID0gJCgnI3JlbW90ZVZpZGVvcz5zcGFuPnNwYW4+dmlkZW8nKS5nZXQoMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBtdXRlIGlmIGxvY2FsdmlkZW9cbiAgICAgICAgICAgIGlmIChwaWNrKSB7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQudXBkYXRlTGFyZ2VWaWRlbyhwaWNrLnNyYywgcGljay52b2x1bWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gZWxlY3QgbGFyZ2UgdmlkZW9cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgbGFyZ2UgdmlkZW8gd2l0aCB0aGUgZ2l2ZW4gbmV3IHZpZGVvIHNvdXJjZS5cbiAgICAgKi9cbiAgICBteS51cGRhdGVMYXJnZVZpZGVvID0gZnVuY3Rpb24obmV3U3JjLCB2b2wpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2hvdmVyIGluJywgbmV3U3JjKTtcblxuICAgICAgICBpZiAoJCgnI2xhcmdlVmlkZW8nKS5hdHRyKCdzcmMnKSAhPSBuZXdTcmMpIHtcbiAgICAgICAgICAgIGxhcmdlVmlkZW9OZXdTcmMgPSBuZXdTcmM7XG5cbiAgICAgICAgICAgIHZhciBpc1Zpc2libGUgPSAkKCcjbGFyZ2VWaWRlbycpLmlzKCc6dmlzaWJsZScpO1xuXG4gICAgICAgICAgICAvLyB3ZSBuZWVkIHRoaXMgaGVyZSBiZWNhdXNlIGFmdGVyIHRoZSBmYWRlIHRoZSB2aWRlb1NyYyBtYXkgaGF2ZVxuICAgICAgICAgICAgLy8gY2hhbmdlZC5cbiAgICAgICAgICAgIHZhciBpc0Rlc2t0b3AgPSBpc1ZpZGVvU3JjRGVza3RvcChuZXdTcmMpO1xuXG4gICAgICAgICAgICB2YXIgdXNlckppZCA9IGdldEppZEZyb21WaWRlb1NyYyhuZXdTcmMpO1xuICAgICAgICAgICAgLy8gd2Ugd2FudCB0aGUgbm90aWZpY2F0aW9uIHRvIHRyaWdnZXIgZXZlbiBpZiB1c2VySmlkIGlzIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8vIG9yIG51bGwuXG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKFwic2VsZWN0ZWRlbmRwb2ludGNoYW5nZWRcIiwgW3VzZXJKaWRdKTtcblxuICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5mYWRlT3V0KDMwMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBvbGRTcmMgPSAkKHRoaXMpLmF0dHIoJ3NyYycpO1xuXG4gICAgICAgICAgICAgICAgJCh0aGlzKS5hdHRyKCdzcmMnLCBuZXdTcmMpO1xuXG4gICAgICAgICAgICAgICAgLy8gU2NyZWVuIHN0cmVhbSBpcyBhbHJlYWR5IHJvdGF0ZWRcbiAgICAgICAgICAgICAgICB2YXIgZmxpcFggPSAobmV3U3JjID09PSBsb2NhbFZpZGVvU3JjKSAmJiBmbGlwWExvY2FsVmlkZW87XG5cbiAgICAgICAgICAgICAgICB2YXIgdmlkZW9UcmFuc2Zvcm0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbGFyZ2VWaWRlbycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnN0eWxlLndlYmtpdFRyYW5zZm9ybTtcblxuICAgICAgICAgICAgICAgIGlmIChmbGlwWCAmJiB2aWRlb1RyYW5zZm9ybSAhPT0gJ3NjYWxlWCgtMSknKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsYXJnZVZpZGVvJykuc3R5bGUud2Via2l0VHJhbnNmb3JtXG4gICAgICAgICAgICAgICAgICAgICAgICA9IFwic2NhbGVYKC0xKVwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmICghZmxpcFggJiYgdmlkZW9UcmFuc2Zvcm0gPT09ICdzY2FsZVgoLTEpJykge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbGFyZ2VWaWRlbycpLnN0eWxlLndlYmtpdFRyYW5zZm9ybVxuICAgICAgICAgICAgICAgICAgICAgICAgPSBcIm5vbmVcIjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBDaGFuZ2UgdGhlIHdheSB3ZSdsbCBiZSBtZWFzdXJpbmcgYW5kIHBvc2l0aW9uaW5nIGxhcmdlIHZpZGVvXG5cbiAgICAgICAgICAgICAgICBnZXRWaWRlb1NpemUgPSBpc0Rlc2t0b3BcbiAgICAgICAgICAgICAgICAgICAgPyBnZXREZXNrdG9wVmlkZW9TaXplXG4gICAgICAgICAgICAgICAgICAgIDogVmlkZW9MYXlvdXQuZ2V0Q2FtZXJhVmlkZW9TaXplO1xuICAgICAgICAgICAgICAgIGdldFZpZGVvUG9zaXRpb24gPSBpc0Rlc2t0b3BcbiAgICAgICAgICAgICAgICAgICAgPyBnZXREZXNrdG9wVmlkZW9Qb3NpdGlvblxuICAgICAgICAgICAgICAgICAgICA6IFZpZGVvTGF5b3V0LmdldENhbWVyYVZpZGVvUG9zaXRpb247XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNWaXNpYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgaWYgdGhlIGxhcmdlIHZpZGVvIGlzIGN1cnJlbnRseSB2aXNpYmxlLlxuICAgICAgICAgICAgICAgICAgICAvLyBEaXNhYmxlIHByZXZpb3VzIGRvbWluYW50IHNwZWFrZXIgdmlkZW8uXG4gICAgICAgICAgICAgICAgICAgIHZhciBvbGRKaWQgPSBnZXRKaWRGcm9tVmlkZW9TcmMob2xkU3JjKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9sZEppZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG9sZFJlc291cmNlSmlkID0gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQob2xkSmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LmVuYWJsZURvbWluYW50U3BlYWtlcihvbGRSZXNvdXJjZUppZCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRW5hYmxlIG5ldyBkb21pbmFudCBzcGVha2VyIGluIHRoZSByZW1vdGUgdmlkZW9zIHNlY3Rpb24uXG4gICAgICAgICAgICAgICAgICAgIHZhciB1c2VySmlkID0gZ2V0SmlkRnJvbVZpZGVvU3JjKG5ld1NyYyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1c2VySmlkKVxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzb3VyY2VKaWQgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZCh1c2VySmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LmVuYWJsZURvbWluYW50U3BlYWtlcihyZXNvdXJjZUppZCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmZhZGVJbigzMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YgdGhlIHZpZGVvIGhvcml6b250YWwgYW5kIHZlcnRpY2FsIGluZGVudHMuXG4gICAgICogQ2VudGVycyBob3Jpem9udGFsbHkgYW5kIHRvcCBhbGlnbnMgdmVydGljYWxseS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gYW4gYXJyYXkgd2l0aCAyIGVsZW1lbnRzLCB0aGUgaG9yaXpvbnRhbCBpbmRlbnQgYW5kIHRoZSB2ZXJ0aWNhbFxuICAgICAqIGluZGVudFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldERlc2t0b3BWaWRlb1Bvc2l0aW9uKHZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VIZWlnaHQpIHtcblxuICAgICAgICB2YXIgaG9yaXpvbnRhbEluZGVudCA9ICh2aWRlb1NwYWNlV2lkdGggLSB2aWRlb1dpZHRoKSAvIDI7XG5cbiAgICAgICAgdmFyIHZlcnRpY2FsSW5kZW50ID0gMDsvLyBUb3AgYWxpZ25lZFxuXG4gICAgICAgIHJldHVybiBbaG9yaXpvbnRhbEluZGVudCwgdmVydGljYWxJbmRlbnRdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB2aWRlbyBpZGVudGlmaWVkIGJ5IGdpdmVuIHNyYyBpcyBkZXNrdG9wIHN0cmVhbS5cbiAgICAgKiBAcGFyYW0gdmlkZW9TcmMgZWcuXG4gICAgICogYmxvYjpodHRwcyUzQS8vcGF3ZWwuaml0c2kubmV0LzlhNDZlMGJkLTEzMWUtNGQxOC05YzE0LWE5MjY0ZThkYjM5NVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzVmlkZW9TcmNEZXNrdG9wKHZpZGVvU3JjKSB7XG4gICAgICAgIC8vIEZJWE1FOiBmaXggdGhpcyBtYXBwaW5nIG1lc3MuLi5cbiAgICAgICAgLy8gZmlndXJlIG91dCBpZiBsYXJnZSB2aWRlbyBpcyBkZXNrdG9wIHN0cmVhbSBvciBqdXN0IGEgY2FtZXJhXG4gICAgICAgIHZhciBpc0Rlc2t0b3AgPSBmYWxzZTtcbiAgICAgICAgaWYgKGxvY2FsVmlkZW9TcmMgPT09IHZpZGVvU3JjKSB7XG4gICAgICAgICAgICAvLyBsb2NhbCB2aWRlb1xuICAgICAgICAgICAgaXNEZXNrdG9wID0gaXNVc2luZ1NjcmVlblN0cmVhbTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIERvIHdlIGhhdmUgYXNzb2NpYXRpb25zLi4uXG4gICAgICAgICAgICB2YXIgdmlkZW9Tc3JjID0gdmlkZW9TcmNUb1NzcmNbdmlkZW9TcmNdO1xuICAgICAgICAgICAgaWYgKHZpZGVvU3NyYykge1xuICAgICAgICAgICAgICAgIHZhciB2aWRlb1R5cGUgPSBzc3JjMnZpZGVvVHlwZVt2aWRlb1NzcmNdO1xuICAgICAgICAgICAgICAgIGlmICh2aWRlb1R5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmluYWxseSB0aGVyZS4uLlxuICAgICAgICAgICAgICAgICAgICBpc0Rlc2t0b3AgPSB2aWRlb1R5cGUgPT09ICdzY3JlZW4nO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJObyB2aWRlbyB0eXBlIGZvciBzc3JjOiBcIiArIHZpZGVvU3NyYyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiTm8gc3NyYyBmb3Igc3JjOiBcIiArIHZpZGVvU3JjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaXNEZXNrdG9wO1xuICAgIH1cblxuXG4gICAgbXkuaGFuZGxlVmlkZW9UaHVtYkNsaWNrZWQgPSBmdW5jdGlvbih2aWRlb1NyYykge1xuICAgICAgICAvLyBSZXN0b3JlIHN0eWxlIGZvciBwcmV2aW91c2x5IGZvY3VzZWQgdmlkZW9cbiAgICAgICAgdmFyIGZvY3VzSmlkID0gZ2V0SmlkRnJvbVZpZGVvU3JjKFZpZGVvTGF5b3V0LmZvY3VzZWRWaWRlb1NyYyk7XG4gICAgICAgIHZhciBvbGRDb250YWluZXIgPSBnZXRQYXJ0aWNpcGFudENvbnRhaW5lcihmb2N1c0ppZCk7XG5cbiAgICAgICAgaWYgKG9sZENvbnRhaW5lcikge1xuICAgICAgICAgICAgb2xkQ29udGFpbmVyLnJlbW92ZUNsYXNzKFwidmlkZW9Db250YWluZXJGb2N1c2VkXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVW5sb2NrIGN1cnJlbnQgZm9jdXNlZC4gXG4gICAgICAgIGlmIChWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMgPT09IHZpZGVvU3JjKVxuICAgICAgICB7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMgPSBudWxsO1xuICAgICAgICAgICAgdmFyIGRvbWluYW50U3BlYWtlclZpZGVvID0gbnVsbDtcbiAgICAgICAgICAgIC8vIEVuYWJsZSB0aGUgY3VycmVudGx5IHNldCBkb21pbmFudCBzcGVha2VyLlxuICAgICAgICAgICAgaWYgKGN1cnJlbnREb21pbmFudFNwZWFrZXIpIHtcbiAgICAgICAgICAgICAgICBkb21pbmFudFNwZWFrZXJWaWRlb1xuICAgICAgICAgICAgICAgICAgICA9ICQoJyNwYXJ0aWNpcGFudF8nICsgY3VycmVudERvbWluYW50U3BlYWtlciArICc+dmlkZW8nKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmdldCgwKTtcblxuICAgICAgICAgICAgICAgIGlmIChkb21pbmFudFNwZWFrZXJWaWRlbykge1xuICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC51cGRhdGVMYXJnZVZpZGVvKGRvbWluYW50U3BlYWtlclZpZGVvLnNyYywgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBMb2NrIG5ldyB2aWRlb1xuICAgICAgICBWaWRlb0xheW91dC5mb2N1c2VkVmlkZW9TcmMgPSB2aWRlb1NyYztcblxuICAgICAgICAvLyBVcGRhdGUgZm9jdXNlZC9waW5uZWQgaW50ZXJmYWNlLlxuICAgICAgICB2YXIgdXNlckppZCA9IGdldEppZEZyb21WaWRlb1NyYyh2aWRlb1NyYyk7XG4gICAgICAgIGlmICh1c2VySmlkKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgY29udGFpbmVyID0gZ2V0UGFydGljaXBhbnRDb250YWluZXIodXNlckppZCk7XG4gICAgICAgICAgICBjb250YWluZXIuYWRkQ2xhc3MoXCJ2aWRlb0NvbnRhaW5lckZvY3VzZWRcIik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUcmlnZ2VycyBhIFwidmlkZW8uc2VsZWN0ZWRcIiBldmVudC4gVGhlIFwiZmFsc2VcIiBwYXJhbWV0ZXIgaW5kaWNhdGVzXG4gICAgICAgIC8vIHRoaXMgaXNuJ3QgYSBwcmV6aS5cbiAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcihcInZpZGVvLnNlbGVjdGVkXCIsIFtmYWxzZV0pO1xuXG4gICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8odmlkZW9TcmMsIDEpO1xuXG4gICAgICAgICQoJ2F1ZGlvJykuZWFjaChmdW5jdGlvbiAoaWR4LCBlbCkge1xuICAgICAgICAgICAgaWYgKGVsLmlkLmluZGV4T2YoJ21peGVkbXNsYWJlbCcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIGVsLnZvbHVtZSA9IDA7XG4gICAgICAgICAgICAgICAgZWwudm9sdW1lID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFBvc2l0aW9ucyB0aGUgbGFyZ2UgdmlkZW8uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmlkZW9XaWR0aCB0aGUgc3RyZWFtIHZpZGVvIHdpZHRoXG4gICAgICogQHBhcmFtIHZpZGVvSGVpZ2h0IHRoZSBzdHJlYW0gdmlkZW8gaGVpZ2h0XG4gICAgICovXG4gICAgbXkucG9zaXRpb25MYXJnZSA9IGZ1bmN0aW9uICh2aWRlb1dpZHRoLCB2aWRlb0hlaWdodCkge1xuICAgICAgICB2YXIgdmlkZW9TcGFjZVdpZHRoID0gJCgnI3ZpZGVvc3BhY2UnKS53aWR0aCgpO1xuICAgICAgICB2YXIgdmlkZW9TcGFjZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcblxuICAgICAgICB2YXIgdmlkZW9TaXplID0gZ2V0VmlkZW9TaXplKHZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VIZWlnaHQpO1xuXG4gICAgICAgIHZhciBsYXJnZVZpZGVvV2lkdGggPSB2aWRlb1NpemVbMF07XG4gICAgICAgIHZhciBsYXJnZVZpZGVvSGVpZ2h0ID0gdmlkZW9TaXplWzFdO1xuXG4gICAgICAgIHZhciB2aWRlb1Bvc2l0aW9uID0gZ2V0VmlkZW9Qb3NpdGlvbihsYXJnZVZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXJnZVZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFjZUhlaWdodCk7XG5cbiAgICAgICAgdmFyIGhvcml6b250YWxJbmRlbnQgPSB2aWRlb1Bvc2l0aW9uWzBdO1xuICAgICAgICB2YXIgdmVydGljYWxJbmRlbnQgPSB2aWRlb1Bvc2l0aW9uWzFdO1xuXG4gICAgICAgIHBvc2l0aW9uVmlkZW8oJCgnI2xhcmdlVmlkZW8nKSxcbiAgICAgICAgICAgICAgICAgICAgICBsYXJnZVZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgbGFyZ2VWaWRlb0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICBob3Jpem9udGFsSW5kZW50LCB2ZXJ0aWNhbEluZGVudCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3dzL2hpZGVzIHRoZSBsYXJnZSB2aWRlby5cbiAgICAgKi9cbiAgICBteS5zZXRMYXJnZVZpZGVvVmlzaWJsZSA9IGZ1bmN0aW9uKGlzVmlzaWJsZSkge1xuICAgICAgICB2YXIgbGFyZ2VWaWRlb0ppZCA9IGdldEppZEZyb21WaWRlb1NyYygkKCcjbGFyZ2VWaWRlbycpLmF0dHIoJ3NyYycpKTtcbiAgICAgICAgdmFyIHJlc291cmNlSmlkID0gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQobGFyZ2VWaWRlb0ppZCk7XG5cbiAgICAgICAgaWYgKGlzVmlzaWJsZSkge1xuICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5jc3Moe3Zpc2liaWxpdHk6ICd2aXNpYmxlJ30pO1xuICAgICAgICAgICAgJCgnLndhdGVybWFyaycpLmNzcyh7dmlzaWJpbGl0eTogJ3Zpc2libGUnfSk7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5lbmFibGVEb21pbmFudFNwZWFrZXIocmVzb3VyY2VKaWQsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5jc3Moe3Zpc2liaWxpdHk6ICdoaWRkZW4nfSk7XG4gICAgICAgICAgICAkKCcud2F0ZXJtYXJrJykuY3NzKHt2aXNpYmlsaXR5OiAnaGlkZGVuJ30pO1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuZW5hYmxlRG9taW5hbnRTcGVha2VyKHJlc291cmNlSmlkLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSW5kaWNhdGVzIGlmIHRoZSBsYXJnZSB2aWRlbyBpcyBjdXJyZW50bHkgdmlzaWJsZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gPHR0PnRydWU8L3R0PiBpZiB2aXNpYmxlLCA8dHQ+ZmFsc2U8L3R0PiAtIG90aGVyd2lzZVxuICAgICAqL1xuICAgIG15LmlzTGFyZ2VWaWRlb1Zpc2libGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICQoJyNsYXJnZVZpZGVvJykuaXMoJzp2aXNpYmxlJyk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiBjb250YWluZXIgZm9yIHBhcnRpY2lwYW50IGlkZW50aWZpZWQgYnkgZ2l2ZW4gcGVlckppZCBleGlzdHNcbiAgICAgKiBpbiB0aGUgZG9jdW1lbnQgYW5kIGNyZWF0ZXMgaXQgZXZlbnR1YWxseS5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0gcGVlckppZCBwZWVyIEppZCB0byBjaGVjay5cbiAgICAgKiBcbiAgICAgKiBAcmV0dXJuIFJldHVybnMgPHR0PnRydWU8L3R0PiBpZiB0aGUgcGVlciBjb250YWluZXIgZXhpc3RzLFxuICAgICAqIDx0dD5mYWxzZTwvdHQ+IC0gb3RoZXJ3aXNlXG4gICAgICovXG4gICAgbXkuZW5zdXJlUGVlckNvbnRhaW5lckV4aXN0cyA9IGZ1bmN0aW9uKHBlZXJKaWQpIHtcbiAgICAgICAgZGVwLkNvbnRhY3RMaXN0KCkuZW5zdXJlQWRkQ29udGFjdChwZWVySmlkKTtcblxuICAgICAgICB2YXIgcmVzb3VyY2VKaWQgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChwZWVySmlkKTtcblxuICAgICAgICB2YXIgdmlkZW9TcGFuSWQgPSAncGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkO1xuXG4gICAgICAgIGlmICgkKCcjJyArIHZpZGVvU3BhbklkKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGVyZSdzIGJlZW4gYSBmb2N1cyBjaGFuZ2UsIG1ha2Ugc3VyZSB3ZSBhZGQgZm9jdXMgcmVsYXRlZFxuICAgICAgICAgICAgLy8gaW50ZXJmYWNlISFcbiAgICAgICAgICAgIGlmIChmb2N1cyAmJiAkKCcjcmVtb3RlX3BvcHVwbWVudV8nICsgcmVzb3VyY2VKaWQpLmxlbmd0aCA8PSAwKVxuICAgICAgICAgICAgICAgIGFkZFJlbW90ZVZpZGVvTWVudSggcGVlckppZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHZpZGVvU3BhbklkKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgY29udGFpbmVyXG4gICAgICAgICAgICAgICAgPSBWaWRlb0xheW91dC5hZGRSZW1vdGVWaWRlb0NvbnRhaW5lcihwZWVySmlkLCB2aWRlb1NwYW5JZCk7XG5cbiAgICAgICAgICAgIC8vIFNldCBkZWZhdWx0IGRpc3BsYXkgbmFtZS5cbiAgICAgICAgICAgIHNldERpc3BsYXlOYW1lKHZpZGVvU3BhbklkKTtcblxuICAgICAgICAgICAgdmFyIG5pY2tmaWVsZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIG5pY2tmaWVsZC5jbGFzc05hbWUgPSBcIm5pY2tcIjtcbiAgICAgICAgICAgIG5pY2tmaWVsZC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShyZXNvdXJjZUppZCkpO1xuICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKG5pY2tmaWVsZCk7XG5cbiAgICAgICAgICAgIC8vIEluIGNhc2UgdGhpcyBpcyBub3QgY3VycmVudGx5IGluIHRoZSBsYXN0IG4gd2UgZG9uJ3Qgc2hvdyBpdC5cbiAgICAgICAgICAgIGlmIChsYXN0TkNvdW50XG4gICAgICAgICAgICAgICAgJiYgbGFzdE5Db3VudCA+IDBcbiAgICAgICAgICAgICAgICAmJiAkKCcjcmVtb3RlVmlkZW9zPnNwYW4nKS5sZW5ndGggPj0gbGFzdE5Db3VudCArIDIpIHtcbiAgICAgICAgICAgICAgICBzaG93UGVlckNvbnRhaW5lcihyZXNvdXJjZUppZCwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZVRodW1ibmFpbHMoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBteS5hZGRSZW1vdGVWaWRlb0NvbnRhaW5lciA9IGZ1bmN0aW9uKHBlZXJKaWQsIHNwYW5JZCkge1xuICAgICAgICB2YXIgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICBjb250YWluZXIuaWQgPSBzcGFuSWQ7XG4gICAgICAgIGNvbnRhaW5lci5jbGFzc05hbWUgPSAndmlkZW9jb250YWluZXInO1xuICAgICAgICB2YXIgcmVtb3RlcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZW1vdGVWaWRlb3MnKTtcblxuICAgICAgICAvLyBJZiB0aGUgcGVlckppZCBpcyBudWxsIHRoZW4gdGhpcyB2aWRlbyBzcGFuIGNvdWxkbid0IGJlIGRpcmVjdGx5XG4gICAgICAgIC8vIGFzc29jaWF0ZWQgd2l0aCBhIHBhcnRpY2lwYW50ICh0aGlzIGNvdWxkIGhhcHBlbiBpbiB0aGUgY2FzZSBvZiBwcmV6aSkuXG4gICAgICAgIGlmIChmb2N1cyAmJiBwZWVySmlkICE9IG51bGwpXG4gICAgICAgICAgICBhZGRSZW1vdGVWaWRlb01lbnUocGVlckppZCwgY29udGFpbmVyKTtcblxuICAgICAgICByZW1vdGVzLmFwcGVuZENoaWxkKGNvbnRhaW5lcik7XG4gICAgICAgIGRlcC5VSUFjdGl2YXRvcigpLmdldFVJU2VydmljZSgpLnVwZGF0ZUF1ZGlvTGV2ZWxDYW52YXMocGVlckppZCk7XG5cbiAgICAgICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBhdWRpbyBvciB2aWRlbyBzdHJlYW0gZWxlbWVudC5cbiAgICAgKi9cbiAgICBteS5jcmVhdGVTdHJlYW1FbGVtZW50ID0gZnVuY3Rpb24gKHNpZCwgc3RyZWFtKSB7XG4gICAgICAgIHZhciBpc1ZpZGVvID0gc3RyZWFtLmdldFZpZGVvVHJhY2tzKCkubGVuZ3RoID4gMDtcblxuICAgICAgICBpZihpc1ZpZGVvKVxuICAgICAgICB7XG4gICAgICAgICAgICBjb25zb2xlLnRyYWNlKHN0cmVhbSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGVsZW1lbnQgPSBpc1ZpZGVvXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3ZpZGVvJylcbiAgICAgICAgICAgICAgICAgICAgICAgIDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYXVkaW8nKTtcbiAgICAgICAgdmFyIGlkID0gKGlzVmlkZW8gPyAncmVtb3RlVmlkZW9fJyA6ICdyZW1vdGVBdWRpb18nKVxuICAgICAgICAgICAgICAgICAgICArIHNpZCArICdfJyArIHN0cmVhbS5pZDtcblxuICAgICAgICBlbGVtZW50LmlkID0gaWQ7XG4gICAgICAgIGVsZW1lbnQuYXV0b3BsYXkgPSB0cnVlO1xuICAgICAgICBlbGVtZW50Lm9uY29udGV4dG1lbnUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBmYWxzZTsgfTtcblxuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9O1xuXG4gICAgbXkuYWRkUmVtb3RlU3RyZWFtRWxlbWVudFxuICAgICAgICA9IGZ1bmN0aW9uIChjb250YWluZXIsIHNpZCwgc3RyZWFtLCBwZWVySmlkLCB0aGVzc3JjKSB7XG4gICAgICAgIHZhciBuZXdFbGVtZW50SWQgPSBudWxsO1xuXG4gICAgICAgIHZhciBpc1ZpZGVvID0gc3RyZWFtLmdldFZpZGVvVHJhY2tzKCkubGVuZ3RoID4gMDtcblxuICAgICAgICBpZiAoY29udGFpbmVyKSB7XG4gICAgICAgICAgICB2YXIgc3RyZWFtRWxlbWVudCA9IFZpZGVvTGF5b3V0LmNyZWF0ZVN0cmVhbUVsZW1lbnQoc2lkLCBzdHJlYW0pO1xuICAgICAgICAgICAgbmV3RWxlbWVudElkID0gc3RyZWFtRWxlbWVudC5pZDtcblxuICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHN0cmVhbUVsZW1lbnQpO1xuXG4gICAgICAgICAgICB2YXIgc2VsID0gJCgnIycgKyBuZXdFbGVtZW50SWQpO1xuICAgICAgICAgICAgc2VsLmhpZGUoKTtcblxuICAgICAgICAgICAgLy8gSWYgdGhlIGNvbnRhaW5lciBpcyBjdXJyZW50bHkgdmlzaWJsZSB3ZSBhdHRhY2ggdGhlIHN0cmVhbS5cbiAgICAgICAgICAgIGlmICghaXNWaWRlb1xuICAgICAgICAgICAgICAgIHx8IChjb250YWluZXIub2Zmc2V0UGFyZW50ICE9PSBudWxsICYmIGlzVmlkZW8pKSB7XG4vLzw8PDw8PDwgSEVBRDpVSS92aWRlb2xheW91dC5qc1xuLy8gICAgICAgICAgICAgICAgYXR0YWNoTWVkaWFTdHJlYW0oc2VsLCBzdHJlYW0pO1xuLy89PT09PT09XG4gICAgICAgICAgICAgICAgdmFyIHNpbXVsY2FzdCA9IG5ldyBTaW11bGNhc3QoKTtcbiAgICAgICAgICAgICAgICB2YXIgdmlkZW9TdHJlYW0gPSBzaW11bGNhc3QuZ2V0UmVjZWl2aW5nVmlkZW9TdHJlYW0oc3RyZWFtKTtcbiAgICAgICAgICAgICAgICBhdHRhY2hNZWRpYVN0cmVhbShzZWwsIHZpZGVvU3RyZWFtKTtcbi8vPj4+Pj4+PiBtYXN0ZXI6dmlkZW9sYXlvdXQuanNcblxuICAgICAgICAgICAgICAgIGlmIChpc1ZpZGVvKVxuICAgICAgICAgICAgICAgICAgICB3YWl0Rm9yUmVtb3RlVmlkZW8oc2VsLCB0aGVzc3JjLCBzdHJlYW0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzdHJlYW0ub25lbmRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc3RyZWFtIGVuZGVkJywgdGhpcyk7XG5cbiAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5yZW1vdmVSZW1vdGVTdHJlYW1FbGVtZW50KHN0cmVhbSwgY29udGFpbmVyKTtcblxuICAgICAgICAgICAgICAgIGlmIChwZWVySmlkKVxuICAgICAgICAgICAgICAgICAgICBkZXAuQ29udGFjdExpc3QoKS5yZW1vdmVDb250YWN0KHBlZXJKaWQpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gQWRkIGNsaWNrIGhhbmRsZXIuXG4gICAgICAgICAgICBjb250YWluZXIub25jbGljayA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICogRklYTUUgSXQgdHVybnMgb3V0IHRoYXQgdmlkZW9UaHVtYiBtYXkgbm90IGV4aXN0IChpZiB0aGVyZSBpc1xuICAgICAgICAgICAgICAgICAqIG5vIGFjdHVhbCB2aWRlbykuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgdmFyIHZpZGVvVGh1bWIgPSAkKCcjJyArIGNvbnRhaW5lci5pZCArICc+dmlkZW8nKS5nZXQoMCk7XG5cbiAgICAgICAgICAgICAgICBpZiAodmlkZW9UaHVtYilcbiAgICAgICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuaGFuZGxlVmlkZW9UaHVtYkNsaWNrZWQodmlkZW9UaHVtYi5zcmMpO1xuXG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBBZGQgaG92ZXIgaGFuZGxlclxuICAgICAgICAgICAgJChjb250YWluZXIpLmhvdmVyKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zaG93RGlzcGxheU5hbWUoY29udGFpbmVyLmlkLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmlkZW9TcmMgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJCgnIycgKyBjb250YWluZXIuaWQgKyAnPnZpZGVvJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAmJiAkKCcjJyArIGNvbnRhaW5lci5pZCArICc+dmlkZW8nKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NyYyA9ICQoJyMnICsgY29udGFpbmVyLmlkICsgJz52aWRlbycpLmdldCgwKS5zcmM7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgdmlkZW8gaGFzIGJlZW4gXCJwaW5uZWRcIiBieSB0aGUgdXNlciB3ZSB3YW50IHRvXG4gICAgICAgICAgICAgICAgICAgIC8vIGtlZXAgdGhlIGRpc3BsYXkgbmFtZSBvbiBwbGFjZS5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFWaWRlb0xheW91dC5pc0xhcmdlVmlkZW9WaXNpYmxlKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCB2aWRlb1NyYyAhPT0gJCgnI2xhcmdlVmlkZW8nKS5hdHRyKCdzcmMnKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dEaXNwbGF5TmFtZShjb250YWluZXIuaWQsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5ld0VsZW1lbnRJZDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyB0aGUgcmVtb3RlIHN0cmVhbSBlbGVtZW50IGNvcnJlc3BvbmRpbmcgdG8gdGhlIGdpdmVuIHN0cmVhbSBhbmRcbiAgICAgKiBwYXJlbnQgY29udGFpbmVyLlxuICAgICAqIFxuICAgICAqIEBwYXJhbSBzdHJlYW0gdGhlIHN0cmVhbVxuICAgICAqIEBwYXJhbSBjb250YWluZXJcbiAgICAgKi9cbiAgICBteS5yZW1vdmVSZW1vdGVTdHJlYW1FbGVtZW50ID0gZnVuY3Rpb24gKHN0cmVhbSwgY29udGFpbmVyKSB7XG4gICAgICAgIGlmICghY29udGFpbmVyKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHZhciBzZWxlY3QgPSBudWxsO1xuICAgICAgICB2YXIgcmVtb3ZlZFZpZGVvU3JjID0gbnVsbDtcbiAgICAgICAgaWYgKHN0cmVhbS5nZXRWaWRlb1RyYWNrcygpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHNlbGVjdCA9ICQoJyMnICsgY29udGFpbmVyLmlkICsgJz52aWRlbycpO1xuICAgICAgICAgICAgcmVtb3ZlZFZpZGVvU3JjID0gc2VsZWN0LmdldCgwKS5zcmM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgc2VsZWN0ID0gJCgnIycgKyBjb250YWluZXIuaWQgKyAnPmF1ZGlvJyk7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHZpZGVvIHNvdXJjZSBmcm9tIHRoZSBtYXBwaW5nLlxuICAgICAgICBkZWxldGUgdmlkZW9TcmNUb1NzcmNbcmVtb3ZlZFZpZGVvU3JjXTtcblxuICAgICAgICAvLyBNYXJrIHZpZGVvIGFzIHJlbW92ZWQgdG8gY2FuY2VsIHdhaXRpbmcgbG9vcChpZiB2aWRlbyBpcyByZW1vdmVkXG4gICAgICAgIC8vIGJlZm9yZSBoYXMgc3RhcnRlZClcbiAgICAgICAgc2VsZWN0LnJlbW92ZWQgPSB0cnVlO1xuICAgICAgICBzZWxlY3QucmVtb3ZlKCk7XG5cbiAgICAgICAgdmFyIGF1ZGlvQ291bnQgPSAkKCcjJyArIGNvbnRhaW5lci5pZCArICc+YXVkaW8nKS5sZW5ndGg7XG4gICAgICAgIHZhciB2aWRlb0NvdW50ID0gJCgnIycgKyBjb250YWluZXIuaWQgKyAnPnZpZGVvJykubGVuZ3RoO1xuXG4gICAgICAgIGlmICghYXVkaW9Db3VudCAmJiAhdmlkZW9Db3VudCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJSZW1vdmUgd2hvbGUgdXNlclwiLCBjb250YWluZXIuaWQpO1xuICAgICAgICAgICAgLy8gUmVtb3ZlIHdob2xlIGNvbnRhaW5lclxuICAgICAgICAgICAgY29udGFpbmVyLnJlbW92ZSgpO1xuICAgICAgICAgICAgVXRpbC5wbGF5U291bmROb3RpZmljYXRpb24oJ3VzZXJMZWZ0Jyk7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5yZXNpemVUaHVtYm5haWxzKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVtb3ZlZFZpZGVvU3JjKVxuICAgICAgICAgICAgVmlkZW9MYXlvdXQudXBkYXRlUmVtb3ZlZFZpZGVvKHJlbW92ZWRWaWRlb1NyYyk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3cvaGlkZSBwZWVyIGNvbnRhaW5lciBmb3IgdGhlIGdpdmVuIHJlc291cmNlSmlkLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNob3dQZWVyQ29udGFpbmVyKHJlc291cmNlSmlkLCBpc1Nob3cpIHtcbiAgICAgICAgdmFyIHBlZXJDb250YWluZXIgPSAkKCcjcGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkKTtcblxuICAgICAgICBpZiAoIXBlZXJDb250YWluZXIpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgaWYgKCFwZWVyQ29udGFpbmVyLmlzKCc6dmlzaWJsZScpICYmIGlzU2hvdylcbiAgICAgICAgICAgIHBlZXJDb250YWluZXIuc2hvdygpO1xuICAgICAgICBlbHNlIGlmIChwZWVyQ29udGFpbmVyLmlzKCc6dmlzaWJsZScpICYmICFpc1Nob3cpXG4gICAgICAgICAgICBwZWVyQ29udGFpbmVyLmhpZGUoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgZGlzcGxheSBuYW1lIGZvciB0aGUgZ2l2ZW4gdmlkZW8gc3BhbiBpZC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzZXREaXNwbGF5TmFtZSh2aWRlb1NwYW5JZCwgZGlzcGxheU5hbWUpIHtcbiAgICAgICAgdmFyIG5hbWVTcGFuID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+c3Bhbi5kaXNwbGF5bmFtZScpO1xuICAgICAgICB2YXIgZGVmYXVsdExvY2FsRGlzcGxheU5hbWUgPSBcIk1lXCI7XG5cbiAgICAgICAgLy8gSWYgd2UgYWxyZWFkeSBoYXZlIGEgZGlzcGxheSBuYW1lIGZvciB0aGlzIHZpZGVvLlxuICAgICAgICBpZiAobmFtZVNwYW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdmFyIG5hbWVTcGFuRWxlbWVudCA9IG5hbWVTcGFuLmdldCgwKTtcblxuICAgICAgICAgICAgaWYgKG5hbWVTcGFuRWxlbWVudC5pZCA9PT0gJ2xvY2FsRGlzcGxheU5hbWUnICYmXG4gICAgICAgICAgICAgICAgJCgnI2xvY2FsRGlzcGxheU5hbWUnKS50ZXh0KCkgIT09IGRpc3BsYXlOYW1lKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRpc3BsYXlOYW1lICYmIGRpc3BsYXlOYW1lLmxlbmd0aCA+IDApXG4gICAgICAgICAgICAgICAgICAgICQoJyNsb2NhbERpc3BsYXlOYW1lJykudGV4dChkaXNwbGF5TmFtZSArICcgKG1lKScpO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgJCgnI2xvY2FsRGlzcGxheU5hbWUnKS50ZXh0KGRlZmF1bHRMb2NhbERpc3BsYXlOYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGRpc3BsYXlOYW1lICYmIGRpc3BsYXlOYW1lLmxlbmd0aCA+IDApXG4gICAgICAgICAgICAgICAgICAgICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnX25hbWUnKS50ZXh0KGRpc3BsYXlOYW1lKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnX25hbWUnKS50ZXh0KGludGVyZmFjZUNvbmZpZy5ERUZBVUxUX1JFTU9URV9ESVNQTEFZX05BTUUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGVkaXRCdXR0b24gPSBudWxsO1xuXG4gICAgICAgICAgICBuYW1lU3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIG5hbWVTcGFuLmNsYXNzTmFtZSA9ICdkaXNwbGF5bmFtZSc7XG4gICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkKVswXS5hcHBlbmRDaGlsZChuYW1lU3Bhbik7XG5cbiAgICAgICAgICAgIGlmICh2aWRlb1NwYW5JZCA9PT0gJ2xvY2FsVmlkZW9Db250YWluZXInKSB7XG4gICAgICAgICAgICAgICAgZWRpdEJ1dHRvbiA9IGNyZWF0ZUVkaXREaXNwbGF5TmFtZUJ1dHRvbigpO1xuICAgICAgICAgICAgICAgIG5hbWVTcGFuLmlubmVyVGV4dCA9IGRlZmF1bHRMb2NhbERpc3BsYXlOYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbmFtZVNwYW4uaW5uZXJUZXh0ID0gaW50ZXJmYWNlQ29uZmlnLkRFRkFVTFRfUkVNT1RFX0RJU1BMQVlfTkFNRTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGRpc3BsYXlOYW1lICYmIGRpc3BsYXlOYW1lLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBuYW1lU3Bhbi5pbm5lclRleHQgPSBkaXNwbGF5TmFtZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFlZGl0QnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgbmFtZVNwYW4uaWQgPSB2aWRlb1NwYW5JZCArICdfbmFtZSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5hbWVTcGFuLmlkID0gJ2xvY2FsRGlzcGxheU5hbWUnO1xuICAgICAgICAgICAgICAgICQoJyMnICsgdmlkZW9TcGFuSWQpWzBdLmFwcGVuZENoaWxkKGVkaXRCdXR0b24pO1xuXG4gICAgICAgICAgICAgICAgdmFyIGVkaXRhYmxlVGV4dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgZWRpdGFibGVUZXh0LmNsYXNzTmFtZSA9ICdkaXNwbGF5bmFtZSc7XG4gICAgICAgICAgICAgICAgZWRpdGFibGVUZXh0LnR5cGUgPSAndGV4dCc7XG4gICAgICAgICAgICAgICAgZWRpdGFibGVUZXh0LmlkID0gJ2VkaXREaXNwbGF5TmFtZSc7XG5cbiAgICAgICAgICAgICAgICBpZiAoZGlzcGxheU5hbWUgJiYgZGlzcGxheU5hbWUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGVkaXRhYmxlVGV4dC52YWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgPSBkaXNwbGF5TmFtZS5zdWJzdHJpbmcoMCwgZGlzcGxheU5hbWUuaW5kZXhPZignIChtZSknKSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZWRpdGFibGVUZXh0LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnZGlzcGxheTpub25lOycpO1xuICAgICAgICAgICAgICAgIGVkaXRhYmxlVGV4dC5zZXRBdHRyaWJ1dGUoJ3BsYWNlaG9sZGVyJywgJ2V4LiBKYW5lIFBpbmsnKTtcbiAgICAgICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkKVswXS5hcHBlbmRDaGlsZChlZGl0YWJsZVRleHQpO1xuXG4gICAgICAgICAgICAgICAgJCgnI2xvY2FsVmlkZW9Db250YWluZXIgLmRpc3BsYXluYW1lJylcbiAgICAgICAgICAgICAgICAgICAgLmJpbmQoXCJjbGlja1wiLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2xvY2FsRGlzcGxheU5hbWUnKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNlZGl0RGlzcGxheU5hbWUnKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNlZGl0RGlzcGxheU5hbWUnKS5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICAkKCcjZWRpdERpc3BsYXlOYW1lJykuc2VsZWN0KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGlucHV0RGlzcGxheU5hbWVIYW5kbGVyID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuaWNrbmFtZSAhPT0gbmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5pY2tuYW1lID0gbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLmRpc3BsYXluYW1lID0gbmlja25hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGlvbi5lbXVjLmFkZERpc3BsYXlOYW1lVG9QcmVzZW5jZShuaWNrbmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGlvbi5lbXVjLnNlbmRQcmVzZW5jZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVwLkNoYXQoKS5zZXRDaGF0Q29udmVyc2F0aW9uTW9kZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEkKCcjbG9jYWxEaXNwbGF5TmFtZScpLmlzKFwiOnZpc2libGVcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmlja25hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNsb2NhbERpc3BsYXlOYW1lJykudGV4dChuaWNrbmFtZSArIFwiIChtZSlcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjbG9jYWxEaXNwbGF5TmFtZScpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGV4dChkZWZhdWx0TG9jYWxEaXNwbGF5TmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI2xvY2FsRGlzcGxheU5hbWUnKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICQoJyNlZGl0RGlzcGxheU5hbWUnKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgJCgnI2VkaXREaXNwbGF5TmFtZScpLm9uZShcImZvY3Vzb3V0XCIsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dERpc3BsYXlOYW1lSGFuZGxlcih0aGlzLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgJCgnI2VkaXREaXNwbGF5TmFtZScpLm9uKCdrZXlkb3duJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0RGlzcGxheU5hbWVIYW5kbGVyKHRoaXMudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTaG93cy9oaWRlcyB0aGUgZGlzcGxheSBuYW1lIG9uIHRoZSByZW1vdGUgdmlkZW8uXG4gICAgICogQHBhcmFtIHZpZGVvU3BhbklkIHRoZSBpZGVudGlmaWVyIG9mIHRoZSB2aWRlbyBzcGFuIGVsZW1lbnRcbiAgICAgKiBAcGFyYW0gaXNTaG93IGluZGljYXRlcyBpZiB0aGUgZGlzcGxheSBuYW1lIHNob3VsZCBiZSBzaG93biBvciBoaWRkZW5cbiAgICAgKi9cbiAgICBteS5zaG93RGlzcGxheU5hbWUgPSBmdW5jdGlvbih2aWRlb1NwYW5JZCwgaXNTaG93KSB7XG4gICAgICAgIHZhciBuYW1lU3BhbiA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPnNwYW4uZGlzcGxheW5hbWUnKS5nZXQoMCk7XG4gICAgICAgIGlmIChpc1Nob3cpIHtcbiAgICAgICAgICAgIGlmIChuYW1lU3BhbiAmJiBuYW1lU3Bhbi5pbm5lckhUTUwgJiYgbmFtZVNwYW4uaW5uZXJIVE1MLmxlbmd0aCkgXG4gICAgICAgICAgICAgICAgbmFtZVNwYW4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJkaXNwbGF5OmlubGluZS1ibG9jaztcIik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAobmFtZVNwYW4pXG4gICAgICAgICAgICAgICAgbmFtZVNwYW4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJkaXNwbGF5Om5vbmU7XCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3dzIHRoZSBwcmVzZW5jZSBzdGF0dXMgbWVzc2FnZSBmb3IgdGhlIGdpdmVuIHZpZGVvLlxuICAgICAqL1xuICAgIG15LnNldFByZXNlbmNlU3RhdHVzID0gZnVuY3Rpb24gKHZpZGVvU3BhbklkLCBzdGF0dXNNc2cpIHtcblxuICAgICAgICBpZiAoISQoJyMnICsgdmlkZW9TcGFuSWQpLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gTm8gY29udGFpbmVyXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc3RhdHVzU3BhbiA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPnNwYW4uc3RhdHVzJyk7XG4gICAgICAgIGlmICghc3RhdHVzU3Bhbi5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vQWRkIHN0YXR1cyBzcGFuXG4gICAgICAgICAgICBzdGF0dXNTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgc3RhdHVzU3Bhbi5jbGFzc05hbWUgPSAnc3RhdHVzJztcbiAgICAgICAgICAgIHN0YXR1c1NwYW4uaWQgPSB2aWRlb1NwYW5JZCArICdfc3RhdHVzJztcbiAgICAgICAgICAgICQoJyMnICsgdmlkZW9TcGFuSWQpWzBdLmFwcGVuZENoaWxkKHN0YXR1c1NwYW4pO1xuXG4gICAgICAgICAgICBzdGF0dXNTcGFuID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+c3Bhbi5zdGF0dXMnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERpc3BsYXkgc3RhdHVzXG4gICAgICAgIGlmIChzdGF0dXNNc2cgJiYgc3RhdHVzTXNnLmxlbmd0aCkge1xuICAgICAgICAgICAgJCgnIycgKyB2aWRlb1NwYW5JZCArICdfc3RhdHVzJykudGV4dChzdGF0dXNNc2cpO1xuICAgICAgICAgICAgc3RhdHVzU3Bhbi5nZXQoMCkuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJkaXNwbGF5OmlubGluZS1ibG9jaztcIik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlXG4gICAgICAgICAgICBzdGF0dXNTcGFuLmdldCgwKS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImRpc3BsYXk6bm9uZTtcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2hvd3MgYSB2aXN1YWwgaW5kaWNhdG9yIGZvciB0aGUgZm9jdXMgb2YgdGhlIGNvbmZlcmVuY2UuXG4gICAgICogQ3VycmVudGx5IGlmIHdlJ3JlIG5vdCB0aGUgb3duZXIgb2YgdGhlIGNvbmZlcmVuY2Ugd2Ugb2J0YWluIHRoZSBmb2N1c1xuICAgICAqIGZyb20gdGhlIGNvbm5lY3Rpb24uamluZ2xlLnNlc3Npb25zLlxuICAgICAqL1xuICAgIG15LnNob3dGb2N1c0luZGljYXRvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoZm9jdXMgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHZhciBpbmRpY2F0b3JTcGFuID0gJCgnI2xvY2FsVmlkZW9Db250YWluZXIgLmZvY3VzaW5kaWNhdG9yJyk7XG5cbiAgICAgICAgICAgIGlmIChpbmRpY2F0b3JTcGFuLmNoaWxkcmVuKCkubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNyZWF0ZUZvY3VzSW5kaWNhdG9yRWxlbWVudChpbmRpY2F0b3JTcGFuWzBdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChPYmplY3Qua2V5cyhjb25uZWN0aW9uLmppbmdsZS5zZXNzaW9ucykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gSWYgd2UncmUgb25seSBhIHBhcnRpY2lwYW50IHRoZSBmb2N1cyB3aWxsIGJlIHRoZSBvbmx5IHNlc3Npb24gd2UgaGF2ZS5cbiAgICAgICAgICAgIHZhciBzZXNzaW9uXG4gICAgICAgICAgICAgICAgPSBjb25uZWN0aW9uLmppbmdsZS5zZXNzaW9uc1xuICAgICAgICAgICAgICAgICAgICBbT2JqZWN0LmtleXMoY29ubmVjdGlvbi5qaW5nbGUuc2Vzc2lvbnMpWzBdXTtcbiAgICAgICAgICAgIHZhciBmb2N1c0lkXG4gICAgICAgICAgICAgICAgPSAncGFydGljaXBhbnRfJyArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHNlc3Npb24ucGVlcmppZCk7XG5cbiAgICAgICAgICAgIHZhciBmb2N1c0NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGZvY3VzSWQpO1xuICAgICAgICAgICAgaWYgKCFmb2N1c0NvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJObyBmb2N1cyBjb250YWluZXIhXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpbmRpY2F0b3JTcGFuID0gJCgnIycgKyBmb2N1c0lkICsgJyAuZm9jdXNpbmRpY2F0b3InKTtcblxuICAgICAgICAgICAgaWYgKCFpbmRpY2F0b3JTcGFuIHx8IGluZGljYXRvclNwYW4ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgaW5kaWNhdG9yU3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgICAgICBpbmRpY2F0b3JTcGFuLmNsYXNzTmFtZSA9ICdmb2N1c2luZGljYXRvcic7XG5cbiAgICAgICAgICAgICAgICBmb2N1c0NvbnRhaW5lci5hcHBlbmRDaGlsZChpbmRpY2F0b3JTcGFuKTtcblxuICAgICAgICAgICAgICAgIGNyZWF0ZUZvY3VzSW5kaWNhdG9yRWxlbWVudChpbmRpY2F0b3JTcGFuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTaG93cyB2aWRlbyBtdXRlZCBpbmRpY2F0b3Igb3ZlciBzbWFsbCB2aWRlb3MuXG4gICAgICovXG4gICAgbXkuc2hvd1ZpZGVvSW5kaWNhdG9yID0gZnVuY3Rpb24odmlkZW9TcGFuSWQsIGlzTXV0ZWQpIHtcbiAgICAgICAgdmFyIHZpZGVvTXV0ZWRTcGFuID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+c3Bhbi52aWRlb011dGVkJyk7XG5cbiAgICAgICAgaWYgKGlzTXV0ZWQgPT09ICdmYWxzZScpIHtcbiAgICAgICAgICAgIGlmICh2aWRlb011dGVkU3Bhbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdmlkZW9NdXRlZFNwYW4ucmVtb3ZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgYXVkaW9NdXRlZFNwYW4gPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5zcGFuLmF1ZGlvTXV0ZWQnKTtcblxuICAgICAgICAgICAgdmlkZW9NdXRlZFNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICB2aWRlb011dGVkU3Bhbi5jbGFzc05hbWUgPSAndmlkZW9NdXRlZCc7XG4gICAgICAgICAgICBpZiAoYXVkaW9NdXRlZFNwYW4pIHtcbiAgICAgICAgICAgICAgICB2aWRlb011dGVkU3Bhbi5yaWdodCA9ICczMHB4JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQoJyMnICsgdmlkZW9TcGFuSWQpWzBdLmFwcGVuZENoaWxkKHZpZGVvTXV0ZWRTcGFuKTtcblxuICAgICAgICAgICAgdmFyIG11dGVkSW5kaWNhdG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaScpO1xuICAgICAgICAgICAgbXV0ZWRJbmRpY2F0b3IuY2xhc3NOYW1lID0gJ2ljb24tY2FtZXJhLWRpc2FibGVkJztcbiAgICAgICAgICAgIFV0aWwuc2V0VG9vbHRpcChtdXRlZEluZGljYXRvcixcbiAgICAgICAgICAgICAgICAgICAgXCJQYXJ0aWNpcGFudCBoYXM8YnIvPnN0b3BwZWQgdGhlIGNhbWVyYS5cIixcbiAgICAgICAgICAgICAgICAgICAgXCJ0b3BcIik7XG4gICAgICAgICAgICB2aWRlb011dGVkU3Bhbi5hcHBlbmRDaGlsZChtdXRlZEluZGljYXRvcik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2hvd3MgYXVkaW8gbXV0ZWQgaW5kaWNhdG9yIG92ZXIgc21hbGwgdmlkZW9zLlxuICAgICAqL1xuICAgIG15LnNob3dBdWRpb0luZGljYXRvciA9IGZ1bmN0aW9uKHZpZGVvU3BhbklkLCBpc011dGVkKSB7XG4gICAgICAgIHZhciBhdWRpb011dGVkU3BhbiA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPnNwYW4uYXVkaW9NdXRlZCcpO1xuXG4gICAgICAgIGlmIChpc011dGVkID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgICBpZiAoYXVkaW9NdXRlZFNwYW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGF1ZGlvTXV0ZWRTcGFuLnBvcG92ZXIoJ2hpZGUnKTtcbiAgICAgICAgICAgICAgICBhdWRpb011dGVkU3Bhbi5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciB2aWRlb011dGVkU3BhbiA9ICQoJyMnICsgdmlkZW9TcGFuSWQgKyAnPnNwYW4udmlkZW9NdXRlZCcpO1xuXG4gICAgICAgICAgICBhdWRpb011dGVkU3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIGF1ZGlvTXV0ZWRTcGFuLmNsYXNzTmFtZSA9ICdhdWRpb011dGVkJztcbiAgICAgICAgICAgIFV0aWwuc2V0VG9vbHRpcChhdWRpb011dGVkU3BhbixcbiAgICAgICAgICAgICAgICAgICAgXCJQYXJ0aWNpcGFudCBpcyBtdXRlZFwiLFxuICAgICAgICAgICAgICAgICAgICBcInRvcFwiKTtcblxuICAgICAgICAgICAgaWYgKHZpZGVvTXV0ZWRTcGFuKSB7XG4gICAgICAgICAgICAgICAgYXVkaW9NdXRlZFNwYW4ucmlnaHQgPSAnMzBweCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkKCcjJyArIHZpZGVvU3BhbklkKVswXS5hcHBlbmRDaGlsZChhdWRpb011dGVkU3Bhbik7XG5cbiAgICAgICAgICAgIHZhciBtdXRlZEluZGljYXRvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2knKTtcbiAgICAgICAgICAgIG11dGVkSW5kaWNhdG9yLmNsYXNzTmFtZSA9ICdpY29uLW1pYy1kaXNhYmxlZCc7XG4gICAgICAgICAgICBhdWRpb011dGVkU3Bhbi5hcHBlbmRDaGlsZChtdXRlZEluZGljYXRvcik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVzaXplcyB0aGUgbGFyZ2UgdmlkZW8gY29udGFpbmVyLlxuICAgICAqL1xuICAgIG15LnJlc2l6ZUxhcmdlVmlkZW9Db250YWluZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGRlcC5DaGF0KCkucmVzaXplQ2hhdCgpO1xuICAgICAgICB2YXIgYXZhaWxhYmxlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICB2YXIgYXZhaWxhYmxlV2lkdGggPSBkZXAuVUlVdGlsKCkuZ2V0QXZhaWxhYmxlVmlkZW9XaWR0aCgpO1xuICAgICAgICBpZiAoYXZhaWxhYmxlV2lkdGggPCAwIHx8IGF2YWlsYWJsZUhlaWdodCA8IDApIHJldHVybjtcblxuICAgICAgICAkKCcjdmlkZW9zcGFjZScpLndpZHRoKGF2YWlsYWJsZVdpZHRoKTtcbiAgICAgICAgJCgnI3ZpZGVvc3BhY2UnKS5oZWlnaHQoYXZhaWxhYmxlSGVpZ2h0KTtcbiAgICAgICAgJCgnI2xhcmdlVmlkZW9Db250YWluZXInKS53aWR0aChhdmFpbGFibGVXaWR0aCk7XG4gICAgICAgICQoJyNsYXJnZVZpZGVvQ29udGFpbmVyJykuaGVpZ2h0KGF2YWlsYWJsZUhlaWdodCk7XG5cbiAgICAgICAgVmlkZW9MYXlvdXQucmVzaXplVGh1bWJuYWlscygpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXNpemVzIHRodW1ibmFpbHMuXG4gICAgICovXG4gICAgbXkucmVzaXplVGh1bWJuYWlscyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmlkZW9TcGFjZVdpZHRoID0gJCgnI3JlbW90ZVZpZGVvcycpLndpZHRoKCk7XG5cbiAgICAgICAgdmFyIHRodW1ibmFpbFNpemUgPSBWaWRlb0xheW91dC5jYWxjdWxhdGVUaHVtYm5haWxTaXplKHZpZGVvU3BhY2VXaWR0aCk7XG4gICAgICAgIHZhciB3aWR0aCA9IHRodW1ibmFpbFNpemVbMF07XG4gICAgICAgIHZhciBoZWlnaHQgPSB0aHVtYm5haWxTaXplWzFdO1xuXG4gICAgICAgIC8vIHNpemUgdmlkZW9zIHNvIHRoYXQgd2hpbGUga2VlcGluZyBBUiBhbmQgbWF4IGhlaWdodCwgd2UgaGF2ZSBhXG4gICAgICAgIC8vIG5pY2UgZml0XG4gICAgICAgICQoJyNyZW1vdGVWaWRlb3MnKS5oZWlnaHQoaGVpZ2h0KTtcbiAgICAgICAgJCgnI3JlbW90ZVZpZGVvcz5zcGFuJykud2lkdGgod2lkdGgpO1xuICAgICAgICAkKCcjcmVtb3RlVmlkZW9zPnNwYW4nKS5oZWlnaHQoaGVpZ2h0KTtcblxuICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKFwicmVtb3RldmlkZW8ucmVzaXplZFwiLCBbd2lkdGgsIGhlaWdodF0pO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBFbmFibGVzIHRoZSBkb21pbmFudCBzcGVha2VyIFVJLlxuICAgICAqXG4gICAgICogQHBhcmFtIHJlc291cmNlSmlkIHRoZSBqaWQgaW5kaWNhdGluZyB0aGUgdmlkZW8gZWxlbWVudCB0b1xuICAgICAqIGFjdGl2YXRlL2RlYWN0aXZhdGVcbiAgICAgKiBAcGFyYW0gaXNFbmFibGUgaW5kaWNhdGVzIGlmIHRoZSBkb21pbmFudCBzcGVha2VyIHNob3VsZCBiZSBlbmFibGVkIG9yXG4gICAgICogZGlzYWJsZWRcbiAgICAgKi9cbiAgICBteS5lbmFibGVEb21pbmFudFNwZWFrZXIgPSBmdW5jdGlvbihyZXNvdXJjZUppZCwgaXNFbmFibGUpIHtcbiAgICAgICAgdmFyIGRpc3BsYXlOYW1lID0gcmVzb3VyY2VKaWQ7XG4gICAgICAgIHZhciBuYW1lU3BhbiA9ICQoJyNwYXJ0aWNpcGFudF8nICsgcmVzb3VyY2VKaWQgKyAnPnNwYW4uZGlzcGxheW5hbWUnKTtcbiAgICAgICAgaWYgKG5hbWVTcGFuLmxlbmd0aCA+IDApXG4gICAgICAgICAgICBkaXNwbGF5TmFtZSA9IG5hbWVTcGFuLnRleHQoKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIlVJIGVuYWJsZSBkb21pbmFudCBzcGVha2VyXCIsXG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lLFxuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZUppZCxcbiAgICAgICAgICAgICAgICAgICAgaXNFbmFibGUpO1xuXG4gICAgICAgIHZhciB2aWRlb1NwYW5JZCA9IG51bGw7XG4gICAgICAgIHZhciB2aWRlb0NvbnRhaW5lcklkID0gbnVsbDtcbiAgICAgICAgaWYgKHJlc291cmNlSmlkXG4gICAgICAgICAgICAgICAgPT09IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQpKSB7XG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdsb2NhbFZpZGVvV3JhcHBlcic7XG4gICAgICAgICAgICB2aWRlb0NvbnRhaW5lcklkID0gJ2xvY2FsVmlkZW9Db250YWluZXInO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAncGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkO1xuICAgICAgICAgICAgdmlkZW9Db250YWluZXJJZCA9IHZpZGVvU3BhbklkO1xuICAgICAgICB9XG5cbiAgICAgICAgdmlkZW9TcGFuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodmlkZW9Db250YWluZXJJZCk7XG5cbiAgICAgICAgaWYgKCF2aWRlb1NwYW4pIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJObyB2aWRlbyBlbGVtZW50IGZvciBqaWRcIiwgcmVzb3VyY2VKaWQpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHZpZGVvID0gJCgnIycgKyB2aWRlb1NwYW5JZCArICc+dmlkZW8nKTtcblxuICAgICAgICBpZiAodmlkZW8gJiYgdmlkZW8ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKGlzRW5hYmxlKSB7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0Rpc3BsYXlOYW1lKHZpZGVvQ29udGFpbmVySWQsIHRydWUpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCF2aWRlb1NwYW4uY2xhc3NMaXN0LmNvbnRhaW5zKFwiZG9taW5hbnRzcGVha2VyXCIpKVxuICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYW4uY2xhc3NMaXN0LmFkZChcImRvbWluYW50c3BlYWtlclwiKTtcblxuICAgICAgICAgICAgICAgIHZpZGVvLmNzcyh7dmlzaWJpbGl0eTogJ2hpZGRlbid9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dEaXNwbGF5TmFtZSh2aWRlb0NvbnRhaW5lcklkLCBmYWxzZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAodmlkZW9TcGFuLmNsYXNzTGlzdC5jb250YWlucyhcImRvbWluYW50c3BlYWtlclwiKSlcbiAgICAgICAgICAgICAgICAgICAgdmlkZW9TcGFuLmNsYXNzTGlzdC5yZW1vdmUoXCJkb21pbmFudHNwZWFrZXJcIik7XG5cbiAgICAgICAgICAgICAgICB2aWRlby5jc3Moe3Zpc2liaWxpdHk6ICd2aXNpYmxlJ30pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIHNlbGVjdG9yIG9mIHZpZGVvIHRodW1ibmFpbCBjb250YWluZXIgZm9yIHRoZSB1c2VyIGlkZW50aWZpZWQgYnlcbiAgICAgKiBnaXZlbiA8dHQ+dXNlckppZDwvdHQ+XG4gICAgICogQHBhcmFtIHVzZXJKaWQgdXNlcidzIEppZCBmb3Igd2hvbSB3ZSB3YW50IHRvIGdldCB0aGUgdmlkZW8gY29udGFpbmVyLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFBhcnRpY2lwYW50Q29udGFpbmVyKHVzZXJKaWQpXG4gICAge1xuICAgICAgICBpZiAoIXVzZXJKaWQpXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgICAgICBpZiAodXNlckppZCA9PT0gY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZClcbiAgICAgICAgICAgIHJldHVybiAkKFwiI2xvY2FsVmlkZW9Db250YWluZXJcIik7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiAkKFwiI3BhcnRpY2lwYW50X1wiICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQodXNlckppZCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIHNpemUgYW5kIHBvc2l0aW9uIG9mIHRoZSBnaXZlbiB2aWRlbyBlbGVtZW50LlxuICAgICAqXG4gICAgICogQHBhcmFtIHZpZGVvIHRoZSB2aWRlbyBlbGVtZW50IHRvIHBvc2l0aW9uXG4gICAgICogQHBhcmFtIHdpZHRoIHRoZSBkZXNpcmVkIHZpZGVvIHdpZHRoXG4gICAgICogQHBhcmFtIGhlaWdodCB0aGUgZGVzaXJlZCB2aWRlbyBoZWlnaHRcbiAgICAgKiBAcGFyYW0gaG9yaXpvbnRhbEluZGVudCB0aGUgbGVmdCBhbmQgcmlnaHQgaW5kZW50XG4gICAgICogQHBhcmFtIHZlcnRpY2FsSW5kZW50IHRoZSB0b3AgYW5kIGJvdHRvbSBpbmRlbnRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBwb3NpdGlvblZpZGVvKHZpZGVvLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBob3Jpem9udGFsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVydGljYWxJbmRlbnQpIHtcbiAgICAgICAgdmlkZW8ud2lkdGgod2lkdGgpO1xuICAgICAgICB2aWRlby5oZWlnaHQoaGVpZ2h0KTtcbiAgICAgICAgdmlkZW8uY3NzKHsgIHRvcDogdmVydGljYWxJbmRlbnQgKyAncHgnLFxuICAgICAgICAgICAgICAgICAgICAgYm90dG9tOiB2ZXJ0aWNhbEluZGVudCArICdweCcsXG4gICAgICAgICAgICAgICAgICAgICBsZWZ0OiBob3Jpem9udGFsSW5kZW50ICsgJ3B4JyxcbiAgICAgICAgICAgICAgICAgICAgIHJpZ2h0OiBob3Jpem9udGFsSW5kZW50ICsgJ3B4J30pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIHRodW1ibmFpbCBzaXplLlxuICAgICAqXG4gICAgICogQHBhcmFtIHZpZGVvU3BhY2VXaWR0aCB0aGUgd2lkdGggb2YgdGhlIHZpZGVvIHNwYWNlXG4gICAgICovXG4gICAgbXkuY2FsY3VsYXRlVGh1bWJuYWlsU2l6ZSA9IGZ1bmN0aW9uICh2aWRlb1NwYWNlV2lkdGgpIHtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRoZSBhdmFpbGFibGUgaGVpZ2h0LCB3aGljaCBpcyB0aGUgaW5uZXIgd2luZG93IGhlaWdodCBtaW51c1xuICAgICAgIC8vIDM5cHggZm9yIHRoZSBoZWFkZXIgbWludXMgMnB4IGZvciB0aGUgZGVsaW1pdGVyIGxpbmVzIG9uIHRoZSB0b3AgYW5kXG4gICAgICAgLy8gYm90dG9tIG9mIHRoZSBsYXJnZSB2aWRlbywgbWludXMgdGhlIDM2cHggc3BhY2UgaW5zaWRlIHRoZSByZW1vdGVWaWRlb3NcbiAgICAgICAvLyBjb250YWluZXIgdXNlZCBmb3IgaGlnaGxpZ2h0aW5nIHNoYWRvdy5cbiAgICAgICB2YXIgYXZhaWxhYmxlSGVpZ2h0ID0gMTAwO1xuXG4gICAgICAgdmFyIG51bXZpZHMgPSAwO1xuICAgICAgIGlmIChsYXN0TkNvdW50ICYmIGxhc3ROQ291bnQgPiAwKVxuICAgICAgICAgICBudW12aWRzID0gbGFzdE5Db3VudCArIDE7XG4gICAgICAgZWxzZVxuICAgICAgICAgICBudW12aWRzID0gJCgnI3JlbW90ZVZpZGVvcz5zcGFuOnZpc2libGUnKS5sZW5ndGg7XG5cbiAgICAgICAvLyBSZW1vdmUgdGhlIDNweCBib3JkZXJzIGFycm91bmQgdmlkZW9zIGFuZCBib3JkZXIgYXJvdW5kIHRoZSByZW1vdGVcbiAgICAgICAvLyB2aWRlb3MgYXJlYVxuICAgICAgIHZhciBhdmFpbGFibGVXaW5XaWR0aCA9IHZpZGVvU3BhY2VXaWR0aCAtIDIgKiAzICogbnVtdmlkcyAtIDcwO1xuXG4gICAgICAgdmFyIGF2YWlsYWJsZVdpZHRoID0gYXZhaWxhYmxlV2luV2lkdGggLyBudW12aWRzO1xuICAgICAgIHZhciBhc3BlY3RSYXRpbyA9IDE2LjAgLyA5LjA7XG4gICAgICAgdmFyIG1heEhlaWdodCA9IE1hdGgubWluKDE2MCwgYXZhaWxhYmxlSGVpZ2h0KTtcbiAgICAgICBhdmFpbGFibGVIZWlnaHQgPSBNYXRoLm1pbihtYXhIZWlnaHQsIGF2YWlsYWJsZVdpZHRoIC8gYXNwZWN0UmF0aW8pO1xuICAgICAgIGlmIChhdmFpbGFibGVIZWlnaHQgPCBhdmFpbGFibGVXaWR0aCAvIGFzcGVjdFJhdGlvKSB7XG4gICAgICAgICAgIGF2YWlsYWJsZVdpZHRoID0gTWF0aC5mbG9vcihhdmFpbGFibGVIZWlnaHQgKiBhc3BlY3RSYXRpbyk7XG4gICAgICAgfVxuXG4gICAgICAgcmV0dXJuIFthdmFpbGFibGVXaWR0aCwgYXZhaWxhYmxlSGVpZ2h0XTtcbiAgIH07XG5cbiAgIC8qKlxuICAgICogUmV0dXJucyBhbiBhcnJheSBvZiB0aGUgdmlkZW8gZGltZW5zaW9ucywgc28gdGhhdCBpdCBrZWVwcyBpdCdzIGFzcGVjdFxuICAgICogcmF0aW8gYW5kIGZpdHMgYXZhaWxhYmxlIGFyZWEgd2l0aCBpdCdzIGxhcmdlciBkaW1lbnNpb24uIFRoaXMgbWV0aG9kXG4gICAgKiBlbnN1cmVzIHRoYXQgd2hvbGUgdmlkZW8gd2lsbCBiZSB2aXNpYmxlIGFuZCBjYW4gbGVhdmUgZW1wdHkgYXJlYXMuXG4gICAgKlxuICAgICogQHJldHVybiBhbiBhcnJheSB3aXRoIDIgZWxlbWVudHMsIHRoZSB2aWRlbyB3aWR0aCBhbmQgdGhlIHZpZGVvIGhlaWdodFxuICAgICovXG4gICBmdW5jdGlvbiBnZXREZXNrdG9wVmlkZW9TaXplKHZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VIZWlnaHQpIHtcbiAgICAgICBpZiAoIXZpZGVvV2lkdGgpXG4gICAgICAgICAgIHZpZGVvV2lkdGggPSBjdXJyZW50VmlkZW9XaWR0aDtcbiAgICAgICBpZiAoIXZpZGVvSGVpZ2h0KVxuICAgICAgICAgICB2aWRlb0hlaWdodCA9IGN1cnJlbnRWaWRlb0hlaWdodDtcblxuICAgICAgIHZhciBhc3BlY3RSYXRpbyA9IHZpZGVvV2lkdGggLyB2aWRlb0hlaWdodDtcblxuICAgICAgIHZhciBhdmFpbGFibGVXaWR0aCA9IE1hdGgubWF4KHZpZGVvV2lkdGgsIHZpZGVvU3BhY2VXaWR0aCk7XG4gICAgICAgdmFyIGF2YWlsYWJsZUhlaWdodCA9IE1hdGgubWF4KHZpZGVvSGVpZ2h0LCB2aWRlb1NwYWNlSGVpZ2h0KTtcblxuICAgICAgIHZpZGVvU3BhY2VIZWlnaHQgLT0gJCgnI3JlbW90ZVZpZGVvcycpLm91dGVySGVpZ2h0KCk7XG5cbiAgICAgICBpZiAoYXZhaWxhYmxlV2lkdGggLyBhc3BlY3RSYXRpbyA+PSB2aWRlb1NwYWNlSGVpZ2h0KVxuICAgICAgIHtcbiAgICAgICAgICAgYXZhaWxhYmxlSGVpZ2h0ID0gdmlkZW9TcGFjZUhlaWdodDtcbiAgICAgICAgICAgYXZhaWxhYmxlV2lkdGggPSBhdmFpbGFibGVIZWlnaHQgKiBhc3BlY3RSYXRpbztcbiAgICAgICB9XG5cbiAgICAgICBpZiAoYXZhaWxhYmxlSGVpZ2h0ICogYXNwZWN0UmF0aW8gPj0gdmlkZW9TcGFjZVdpZHRoKVxuICAgICAgIHtcbiAgICAgICAgICAgYXZhaWxhYmxlV2lkdGggPSB2aWRlb1NwYWNlV2lkdGg7XG4gICAgICAgICAgIGF2YWlsYWJsZUhlaWdodCA9IGF2YWlsYWJsZVdpZHRoIC8gYXNwZWN0UmF0aW87XG4gICAgICAgfVxuXG4gICAgICAgcmV0dXJuIFthdmFpbGFibGVXaWR0aCwgYXZhaWxhYmxlSGVpZ2h0XTtcbiAgIH1cblxuXG4vKipcbiAgICAgKiBSZXR1cm5zIGFuIGFycmF5IG9mIHRoZSB2aWRlbyBkaW1lbnNpb25zLCBzbyB0aGF0IGl0IGNvdmVycyB0aGUgc2NyZWVuLlxuICAgICAqIEl0IGxlYXZlcyBubyBlbXB0eSBhcmVhcywgYnV0IHNvbWUgcGFydHMgb2YgdGhlIHZpZGVvIG1pZ2h0IG5vdCBiZSB2aXNpYmxlLlxuICAgICAqXG4gICAgICogQHJldHVybiBhbiBhcnJheSB3aXRoIDIgZWxlbWVudHMsIHRoZSB2aWRlbyB3aWR0aCBhbmQgdGhlIHZpZGVvIGhlaWdodFxuICAgICAqL1xuICAgIG15LmdldENhbWVyYVZpZGVvU2l6ZSA9IGZ1bmN0aW9uKHZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb1NwYWNlV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VIZWlnaHQpIHtcbiAgICAgICAgaWYgKCF2aWRlb1dpZHRoKVxuICAgICAgICAgICAgdmlkZW9XaWR0aCA9IGN1cnJlbnRWaWRlb1dpZHRoO1xuICAgICAgICBpZiAoIXZpZGVvSGVpZ2h0KVxuICAgICAgICAgICAgdmlkZW9IZWlnaHQgPSBjdXJyZW50VmlkZW9IZWlnaHQ7XG5cbiAgICAgICAgdmFyIGFzcGVjdFJhdGlvID0gdmlkZW9XaWR0aCAvIHZpZGVvSGVpZ2h0O1xuXG4gICAgICAgIHZhciBhdmFpbGFibGVXaWR0aCA9IE1hdGgubWF4KHZpZGVvV2lkdGgsIHZpZGVvU3BhY2VXaWR0aCk7XG4gICAgICAgIHZhciBhdmFpbGFibGVIZWlnaHQgPSBNYXRoLm1heCh2aWRlb0hlaWdodCwgdmlkZW9TcGFjZUhlaWdodCk7XG5cbiAgICAgICAgaWYgKGF2YWlsYWJsZVdpZHRoIC8gYXNwZWN0UmF0aW8gPCB2aWRlb1NwYWNlSGVpZ2h0KSB7XG4gICAgICAgICAgICBhdmFpbGFibGVIZWlnaHQgPSB2aWRlb1NwYWNlSGVpZ2h0O1xuICAgICAgICAgICAgYXZhaWxhYmxlV2lkdGggPSBhdmFpbGFibGVIZWlnaHQgKiBhc3BlY3RSYXRpbztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhdmFpbGFibGVIZWlnaHQgKiBhc3BlY3RSYXRpbyA8IHZpZGVvU3BhY2VXaWR0aCkge1xuICAgICAgICAgICAgYXZhaWxhYmxlV2lkdGggPSB2aWRlb1NwYWNlV2lkdGg7XG4gICAgICAgICAgICBhdmFpbGFibGVIZWlnaHQgPSBhdmFpbGFibGVXaWR0aCAvIGFzcGVjdFJhdGlvO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFthdmFpbGFibGVXaWR0aCwgYXZhaWxhYmxlSGVpZ2h0XTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGFuIGFycmF5IG9mIHRoZSB2aWRlbyBob3Jpem9udGFsIGFuZCB2ZXJ0aWNhbCBpbmRlbnRzLFxuICAgICAqIHNvIHRoYXQgaWYgZml0cyBpdHMgcGFyZW50LlxuICAgICAqXG4gICAgICogQHJldHVybiBhbiBhcnJheSB3aXRoIDIgZWxlbWVudHMsIHRoZSBob3Jpem9udGFsIGluZGVudCBhbmQgdGhlIHZlcnRpY2FsXG4gICAgICogaW5kZW50XG4gICAgICovXG4gICAgbXkuZ2V0Q2FtZXJhVmlkZW9Qb3NpdGlvbiA9IGZ1bmN0aW9uKHZpZGVvV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlb0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvU3BhY2VIZWlnaHQpIHtcbiAgICAgICAgLy8gUGFyZW50IGhlaWdodCBpc24ndCBjb21wbGV0ZWx5IGNhbGN1bGF0ZWQgd2hlbiB3ZSBwb3NpdGlvbiB0aGUgdmlkZW8gaW5cbiAgICAgICAgLy8gZnVsbCBzY3JlZW4gbW9kZSBhbmQgdGhpcyBpcyB3aHkgd2UgdXNlIHRoZSBzY3JlZW4gaGVpZ2h0IGluIHRoaXMgY2FzZS5cbiAgICAgICAgLy8gTmVlZCB0byB0aGluayBpdCBmdXJ0aGVyIGF0IHNvbWUgcG9pbnQgYW5kIGltcGxlbWVudCBpdCBwcm9wZXJseS5cbiAgICAgICAgdmFyIGlzRnVsbFNjcmVlbiA9IGRvY3VtZW50LmZ1bGxTY3JlZW4gfHxcbiAgICAgICAgICAgIGRvY3VtZW50Lm1vekZ1bGxTY3JlZW4gfHxcbiAgICAgICAgICAgIGRvY3VtZW50LndlYmtpdElzRnVsbFNjcmVlbjtcbiAgICAgICAgaWYgKGlzRnVsbFNjcmVlbilcbiAgICAgICAgICAgIHZpZGVvU3BhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG5cbiAgICAgICAgdmFyIGhvcml6b250YWxJbmRlbnQgPSAodmlkZW9TcGFjZVdpZHRoIC0gdmlkZW9XaWR0aCkgLyAyO1xuICAgICAgICB2YXIgdmVydGljYWxJbmRlbnQgPSAodmlkZW9TcGFjZUhlaWdodCAtIHZpZGVvSGVpZ2h0KSAvIDI7XG5cbiAgICAgICAgcmV0dXJuIFtob3Jpem9udGFsSW5kZW50LCB2ZXJ0aWNhbEluZGVudF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyB0aGUgZWRpdCBkaXNwbGF5IG5hbWUgYnV0dG9uLlxuICAgICAqXG4gICAgICogQHJldHVybnMgdGhlIGVkaXQgYnV0dG9uXG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlRWRpdERpc3BsYXlOYW1lQnV0dG9uKCkge1xuICAgICAgICB2YXIgZWRpdEJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgZWRpdEJ1dHRvbi5jbGFzc05hbWUgPSAnZGlzcGxheW5hbWUnO1xuICAgICAgICBVdGlsLnNldFRvb2x0aXAoZWRpdEJ1dHRvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICdDbGljayB0byBlZGl0IHlvdXI8YnIvPmRpc3BsYXkgbmFtZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInRvcFwiKTtcbiAgICAgICAgZWRpdEJ1dHRvbi5pbm5lckhUTUwgPSAnPGkgY2xhc3M9XCJmYSBmYS1wZW5jaWxcIj48L2k+JztcblxuICAgICAgICByZXR1cm4gZWRpdEJ1dHRvbjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIHRoZSBlbGVtZW50IGluZGljYXRpbmcgdGhlIGZvY3VzIG9mIHRoZSBjb25mZXJlbmNlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHBhcmVudEVsZW1lbnQgdGhlIHBhcmVudCBlbGVtZW50IHdoZXJlIHRoZSBmb2N1cyBpbmRpY2F0b3Igd2lsbFxuICAgICAqIGJlIGFkZGVkXG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlRm9jdXNJbmRpY2F0b3JFbGVtZW50KHBhcmVudEVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGZvY3VzSW5kaWNhdG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaScpO1xuICAgICAgICBmb2N1c0luZGljYXRvci5jbGFzc05hbWUgPSAnZmEgZmEtc3Rhcic7XG4gICAgICAgIHBhcmVudEVsZW1lbnQuYXBwZW5kQ2hpbGQoZm9jdXNJbmRpY2F0b3IpO1xuXG4gICAgICAgIFV0aWwuc2V0VG9vbHRpcChwYXJlbnRFbGVtZW50LFxuICAgICAgICAgICAgICAgIFwiVGhlIG93bmVyIG9mPGJyLz50aGlzIGNvbmZlcmVuY2VcIixcbiAgICAgICAgICAgICAgICBcInRvcFwiKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSByZW1vdGUgdmlkZW8gbWVudS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBqaWQgdGhlIGppZCBpbmRpY2F0aW5nIHRoZSB2aWRlbyBmb3Igd2hpY2ggd2UncmUgYWRkaW5nIGEgbWVudS5cbiAgICAgKiBAcGFyYW0gaXNNdXRlZCBpbmRpY2F0ZXMgdGhlIGN1cnJlbnQgbXV0ZSBzdGF0ZVxuICAgICAqL1xuICAgIG15LnVwZGF0ZVJlbW90ZVZpZGVvTWVudSA9IGZ1bmN0aW9uKGppZCwgaXNNdXRlZCkge1xuICAgICAgICB2YXIgbXV0ZU1lbnVJdGVtXG4gICAgICAgICAgICA9ICQoJyNyZW1vdGVfcG9wdXBtZW51XydcbiAgICAgICAgICAgICAgICAgICAgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpXG4gICAgICAgICAgICAgICAgICAgICsgJz5saT5hLm11dGVsaW5rJyk7XG5cbiAgICAgICAgdmFyIG11dGVkSW5kaWNhdG9yID0gXCI8aSBjbGFzcz0naWNvbi1taWMtZGlzYWJsZWQnPjwvaT5cIjtcblxuICAgICAgICBpZiAobXV0ZU1lbnVJdGVtLmxlbmd0aCkge1xuICAgICAgICAgICAgdmFyIG11dGVMaW5rID0gbXV0ZU1lbnVJdGVtLmdldCgwKTtcblxuICAgICAgICAgICAgaWYgKGlzTXV0ZWQgPT09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgIG11dGVMaW5rLmlubmVySFRNTCA9IG11dGVkSW5kaWNhdG9yICsgJyBNdXRlZCc7XG4gICAgICAgICAgICAgICAgbXV0ZUxpbmsuY2xhc3NOYW1lID0gJ211dGVsaW5rIGRpc2FibGVkJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG11dGVMaW5rLmlubmVySFRNTCA9IG11dGVkSW5kaWNhdG9yICsgJyBNdXRlJztcbiAgICAgICAgICAgICAgICBtdXRlTGluay5jbGFzc05hbWUgPSAnbXV0ZWxpbmsnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGN1cnJlbnQgZG9taW5hbnQgc3BlYWtlciByZXNvdXJjZSBqaWQuXG4gICAgICovXG4gICAgbXkuZ2V0RG9taW5hbnRTcGVha2VyUmVzb3VyY2VKaWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBjdXJyZW50RG9taW5hbnRTcGVha2VyO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBjb3JyZXNwb25kaW5nIHJlc291cmNlIGppZCB0byB0aGUgZ2l2ZW4gcGVlciBjb250YWluZXJcbiAgICAgKiBET00gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gdGhlIGNvcnJlc3BvbmRpbmcgcmVzb3VyY2UgamlkIHRvIHRoZSBnaXZlbiBwZWVyIGNvbnRhaW5lclxuICAgICAqIERPTSBlbGVtZW50XG4gICAgICovXG4gICAgbXkuZ2V0UGVlckNvbnRhaW5lclJlc291cmNlSmlkID0gZnVuY3Rpb24gKGNvbnRhaW5lckVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGkgPSBjb250YWluZXJFbGVtZW50LmlkLmluZGV4T2YoJ3BhcnRpY2lwYW50XycpO1xuXG4gICAgICAgIGlmIChpID49IDApXG4gICAgICAgICAgICByZXR1cm4gY29udGFpbmVyRWxlbWVudC5pZC5zdWJzdHJpbmcoaSArIDEyKTsgXG4gICAgfTtcblxuICAgIG15Lm9uUmVtb3RlU3RyZWFtQWRkZWQgPSBmdW5jdGlvbiAoc3RyZWFtKSB7XG4gICAgICAgIHZhciBjb250YWluZXI7XG4gICAgICAgIHZhciByZW1vdGVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JlbW90ZVZpZGVvcycpO1xuXG4gICAgICAgIGlmIChzdHJlYW0ucGVlcmppZCkge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuZW5zdXJlUGVlckNvbnRhaW5lckV4aXN0cyhzdHJlYW0ucGVlcmppZCk7XG5cbiAgICAgICAgICAgIGNvbnRhaW5lciAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcbiAgICAgICAgICAgICAgICAgICAgJ3BhcnRpY2lwYW50XycgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChzdHJlYW0ucGVlcmppZCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHN0cmVhbS5zdHJlYW0uaWQgIT09ICdtaXhlZG1zbGFiZWwnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvciggICdjYW4gbm90IGFzc29jaWF0ZSBzdHJlYW0nLFxuICAgICAgICAgICAgICAgICAgICBzdHJlYW0uc3RyZWFtLmlkLFxuICAgICAgICAgICAgICAgICAgICAnd2l0aCBhIHBhcnRpY2lwYW50Jyk7XG4gICAgICAgICAgICAgICAgLy8gV2UgZG9uJ3Qgd2FudCB0byBhZGQgaXQgaGVyZSBzaW5jZSBpdCB3aWxsIGNhdXNlIHRyb3VibGVzXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRklYTUU6IGZvciB0aGUgbWl4ZWQgbXMgd2UgZG9udCBuZWVkIGEgdmlkZW8gLS0gY3VycmVudGx5XG4gICAgICAgICAgICBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICBjb250YWluZXIuaWQgPSAnbWl4ZWRzdHJlYW0nO1xuICAgICAgICAgICAgY29udGFpbmVyLmNsYXNzTmFtZSA9ICd2aWRlb2NvbnRhaW5lcic7XG4gICAgICAgICAgICByZW1vdGVzLmFwcGVuZENoaWxkKGNvbnRhaW5lcik7XG4gICAgICAgICAgICBVdGlsLnBsYXlTb3VuZE5vdGlmaWNhdGlvbigndXNlckpvaW5lZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbnRhaW5lcikge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuYWRkUmVtb3RlU3RyZWFtRWxlbWVudCggY29udGFpbmVyLFxuICAgICAgICAgICAgICAgIHN0cmVhbS5zaWQsXG4gICAgICAgICAgICAgICAgc3RyZWFtLnN0cmVhbSxcbiAgICAgICAgICAgICAgICBzdHJlYW0ucGVlcmppZCxcbiAgICAgICAgICAgICAgICBzdHJlYW0uc3NyYyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBZGRzIHRoZSByZW1vdGUgdmlkZW8gbWVudSBlbGVtZW50IGZvciB0aGUgZ2l2ZW4gPHR0PmppZDwvdHQ+IGluIHRoZVxuICAgICAqIGdpdmVuIDx0dD5wYXJlbnRFbGVtZW50PC90dD4uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gamlkIHRoZSBqaWQgaW5kaWNhdGluZyB0aGUgdmlkZW8gZm9yIHdoaWNoIHdlJ3JlIGFkZGluZyBhIG1lbnUuXG4gICAgICogQHBhcmFtIHBhcmVudEVsZW1lbnQgdGhlIHBhcmVudCBlbGVtZW50IHdoZXJlIHRoaXMgbWVudSB3aWxsIGJlIGFkZGVkXG4gICAgICovXG4gICAgZnVuY3Rpb24gYWRkUmVtb3RlVmlkZW9NZW51KGppZCwgcGFyZW50RWxlbWVudCkge1xuICAgICAgICB2YXIgc3BhbkVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgIHNwYW5FbGVtZW50LmNsYXNzTmFtZSA9ICdyZW1vdGV2aWRlb21lbnUnO1xuXG4gICAgICAgIHBhcmVudEVsZW1lbnQuYXBwZW5kQ2hpbGQoc3BhbkVsZW1lbnQpO1xuXG4gICAgICAgIHZhciBtZW51RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2knKTtcbiAgICAgICAgbWVudUVsZW1lbnQuY2xhc3NOYW1lID0gJ2ZhIGZhLWFuZ2xlLWRvd24nO1xuICAgICAgICBtZW51RWxlbWVudC50aXRsZSA9ICdSZW1vdGUgdXNlciBjb250cm9scyc7XG4gICAgICAgIHNwYW5FbGVtZW50LmFwcGVuZENoaWxkKG1lbnVFbGVtZW50KTtcblxuLy8gICAgICAgIDx1bCBjbGFzcz1cInBvcHVwbWVudVwiPlxuLy8gICAgICAgIDxsaT48YSBocmVmPVwiI1wiPk11dGU8L2E+PC9saT5cbi8vICAgICAgICA8bGk+PGEgaHJlZj1cIiNcIj5FamVjdDwvYT48L2xpPlxuLy8gICAgICAgIDwvdWw+XG4gICAgICAgIHZhciBwb3B1cG1lbnVFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndWwnKTtcbiAgICAgICAgcG9wdXBtZW51RWxlbWVudC5jbGFzc05hbWUgPSAncG9wdXBtZW51JztcbiAgICAgICAgcG9wdXBtZW51RWxlbWVudC5pZFxuICAgICAgICAgICAgPSAncmVtb3RlX3BvcHVwbWVudV8nICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKTtcbiAgICAgICAgc3BhbkVsZW1lbnQuYXBwZW5kQ2hpbGQocG9wdXBtZW51RWxlbWVudCk7XG5cbiAgICAgICAgdmFyIG11dGVNZW51SXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gICAgICAgIHZhciBtdXRlTGlua0l0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG5cbiAgICAgICAgdmFyIG11dGVkSW5kaWNhdG9yID0gXCI8aSBjbGFzcz0naWNvbi1taWMtZGlzYWJsZWQnPjwvaT5cIjtcblxuICAgICAgICBpZiAoIW11dGVkQXVkaW9zW2ppZF0pIHtcbiAgICAgICAgICAgIG11dGVMaW5rSXRlbS5pbm5lckhUTUwgPSBtdXRlZEluZGljYXRvciArICdNdXRlJztcbiAgICAgICAgICAgIG11dGVMaW5rSXRlbS5jbGFzc05hbWUgPSAnbXV0ZWxpbmsnO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbXV0ZUxpbmtJdGVtLmlubmVySFRNTCA9IG11dGVkSW5kaWNhdG9yICsgJyBNdXRlZCc7XG4gICAgICAgICAgICBtdXRlTGlua0l0ZW0uY2xhc3NOYW1lID0gJ211dGVsaW5rIGRpc2FibGVkJztcbiAgICAgICAgfVxuXG4gICAgICAgIG11dGVMaW5rSXRlbS5vbmNsaWNrID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGlmICgkKHRoaXMpLmF0dHIoJ2Rpc2FibGVkJykgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpc011dGUgPSAhbXV0ZWRBdWRpb3NbamlkXTtcbiAgICAgICAgICAgIGNvbm5lY3Rpb24ubW9kZXJhdGUuc2V0TXV0ZShqaWQsIGlzTXV0ZSk7XG4gICAgICAgICAgICBwb3B1cG1lbnVFbGVtZW50LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnZGlzcGxheTpub25lOycpO1xuXG4gICAgICAgICAgICBpZiAoaXNNdXRlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbm5lckhUTUwgPSBtdXRlZEluZGljYXRvciArICcgTXV0ZWQnO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xhc3NOYW1lID0gJ211dGVsaW5rIGRpc2FibGVkJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5uZXJIVE1MID0gbXV0ZWRJbmRpY2F0b3IgKyAnIE11dGUnO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xhc3NOYW1lID0gJ211dGVsaW5rJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBtdXRlTWVudUl0ZW0uYXBwZW5kQ2hpbGQobXV0ZUxpbmtJdGVtKTtcbiAgICAgICAgcG9wdXBtZW51RWxlbWVudC5hcHBlbmRDaGlsZChtdXRlTWVudUl0ZW0pO1xuXG4gICAgICAgIHZhciBlamVjdEluZGljYXRvciA9IFwiPGkgY2xhc3M9J2ZhIGZhLWVqZWN0Jz48L2k+XCI7XG5cbiAgICAgICAgdmFyIGVqZWN0TWVudUl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuICAgICAgICB2YXIgZWplY3RMaW5rSXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgZWplY3RMaW5rSXRlbS5pbm5lckhUTUwgPSBlamVjdEluZGljYXRvciArICcgS2ljayBvdXQnO1xuICAgICAgICBlamVjdExpbmtJdGVtLm9uY2xpY2sgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgY29ubmVjdGlvbi5tb2RlcmF0ZS5lamVjdChqaWQpO1xuICAgICAgICAgICAgcG9wdXBtZW51RWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ2Rpc3BsYXk6bm9uZTsnKTtcbiAgICAgICAgfTtcblxuICAgICAgICBlamVjdE1lbnVJdGVtLmFwcGVuZENoaWxkKGVqZWN0TGlua0l0ZW0pO1xuICAgICAgICBwb3B1cG1lbnVFbGVtZW50LmFwcGVuZENoaWxkKGVqZWN0TWVudUl0ZW0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE9uIGF1ZGlvIG11dGVkIGV2ZW50LlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ2F1ZGlvbXV0ZWQubXVjJywgZnVuY3Rpb24gKGV2ZW50LCBqaWQsIGlzTXV0ZWQpIHtcbiAgICAgICAgdmFyIHZpZGVvU3BhbklkID0gbnVsbDtcbiAgICAgICAgaWYgKGppZCA9PT0gY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZCkge1xuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAnbG9jYWxWaWRlb0NvbnRhaW5lcic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5lbnN1cmVQZWVyQ29udGFpbmVyRXhpc3RzKGppZCk7XG4gICAgICAgICAgICB2aWRlb1NwYW5JZCA9ICdwYXJ0aWNpcGFudF8nICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmb2N1cykge1xuICAgICAgICAgICAgbXV0ZWRBdWRpb3NbamlkXSA9IGlzTXV0ZWQ7XG4gICAgICAgICAgICBWaWRlb0xheW91dC51cGRhdGVSZW1vdGVWaWRlb01lbnUoamlkLCBpc011dGVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2aWRlb1NwYW5JZClcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNob3dBdWRpb0luZGljYXRvcih2aWRlb1NwYW5JZCwgaXNNdXRlZCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBPbiB2aWRlbyBtdXRlZCBldmVudC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCd2aWRlb211dGVkLm11YycsIGZ1bmN0aW9uIChldmVudCwgamlkLCBpc011dGVkKSB7XG4gICAgICAgIHZhciB2aWRlb1NwYW5JZCA9IG51bGw7XG4gICAgICAgIGlmIChqaWQgPT09IGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQpIHtcbiAgICAgICAgICAgIHZpZGVvU3BhbklkID0gJ2xvY2FsVmlkZW9Db250YWluZXInO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVmlkZW9MYXlvdXQuZW5zdXJlUGVlckNvbnRhaW5lckV4aXN0cyhqaWQpO1xuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAncGFydGljaXBhbnRfJyArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGppZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodmlkZW9TcGFuSWQpXG4gICAgICAgICAgICBWaWRlb0xheW91dC5zaG93VmlkZW9JbmRpY2F0b3IodmlkZW9TcGFuSWQsIGlzTXV0ZWQpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogRGlzcGxheSBuYW1lIGNoYW5nZWQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgnZGlzcGxheW5hbWVjaGFuZ2VkJyxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKGV2ZW50LCBqaWQsIGRpc3BsYXlOYW1lLCBzdGF0dXMpIHtcbiAgICAgICAgaWYgKGppZCA9PT0gJ2xvY2FsVmlkZW9Db250YWluZXInXG4gICAgICAgICAgICB8fCBqaWQgPT09IGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQpIHtcbiAgICAgICAgICAgIHNldERpc3BsYXlOYW1lKCdsb2NhbFZpZGVvQ29udGFpbmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFZpZGVvTGF5b3V0LmVuc3VyZVBlZXJDb250YWluZXJFeGlzdHMoamlkKTtcblxuICAgICAgICAgICAgc2V0RGlzcGxheU5hbWUoXG4gICAgICAgICAgICAgICAgJ3BhcnRpY2lwYW50XycgKyBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lLFxuICAgICAgICAgICAgICAgIHN0YXR1cyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIE9uIGRvbWluYW50IHNwZWFrZXIgY2hhbmdlZCBldmVudC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdkb21pbmFudHNwZWFrZXJjaGFuZ2VkJywgZnVuY3Rpb24gKGV2ZW50LCByZXNvdXJjZUppZCkge1xuICAgICAgICAvLyBXZSBpZ25vcmUgbG9jYWwgdXNlciBldmVudHMuXG4gICAgICAgIGlmIChyZXNvdXJjZUppZFxuICAgICAgICAgICAgICAgID09PSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChjb25uZWN0aW9uLmVtdWMubXlyb29tamlkKSlcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAvLyBVcGRhdGUgdGhlIGN1cnJlbnQgZG9taW5hbnQgc3BlYWtlci5cbiAgICAgICAgaWYgKHJlc291cmNlSmlkICE9PSBjdXJyZW50RG9taW5hbnRTcGVha2VyKSB7XG4gICAgICAgICAgICB2YXIgb2xkU3BlYWtlclZpZGVvU3BhbklkID0gXCJwYXJ0aWNpcGFudF9cIiArIGN1cnJlbnREb21pbmFudFNwZWFrZXIsXG4gICAgICAgICAgICAgICAgbmV3U3BlYWtlclZpZGVvU3BhbklkID0gXCJwYXJ0aWNpcGFudF9cIiArIHJlc291cmNlSmlkO1xuICAgICAgICAgICAgaWYoJChcIiNcIiArIG9sZFNwZWFrZXJWaWRlb1NwYW5JZCArIFwiPnNwYW4uZGlzcGxheW5hbWVcIikudGV4dCgpID09PVxuICAgICAgICAgICAgICAgIGludGVyZmFjZUNvbmZpZy5ERUZBVUxUX0RPTUlOQU5UX1NQRUFLRVJfRElTUExBWV9OQU1FKSB7XG4gICAgICAgICAgICAgICAgc2V0RGlzcGxheU5hbWUob2xkU3BlYWtlclZpZGVvU3BhbklkLCBudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKCQoXCIjXCIgKyBuZXdTcGVha2VyVmlkZW9TcGFuSWQgKyBcIj5zcGFuLmRpc3BsYXluYW1lXCIpLnRleHQoKSA9PT1cbiAgICAgICAgICAgICAgICBpbnRlcmZhY2VDb25maWcuREVGQVVMVF9SRU1PVEVfRElTUExBWV9OQU1FKSB7XG4gICAgICAgICAgICAgICAgc2V0RGlzcGxheU5hbWUobmV3U3BlYWtlclZpZGVvU3BhbklkLFxuICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2VDb25maWcuREVGQVVMVF9ET01JTkFOVF9TUEVBS0VSX0RJU1BMQVlfTkFNRSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdXJyZW50RG9taW5hbnRTcGVha2VyID0gcmVzb3VyY2VKaWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBPYnRhaW4gY29udGFpbmVyIGZvciBuZXcgZG9taW5hbnQgc3BlYWtlci5cbiAgICAgICAgdmFyIGNvbnRhaW5lciAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcbiAgICAgICAgICAgICAgICAncGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkKTtcblxuICAgICAgICAvLyBMb2NhbCB2aWRlbyB3aWxsIG5vdCBoYXZlIGNvbnRhaW5lciBmb3VuZCwgYnV0IHRoYXQncyBva1xuICAgICAgICAvLyBzaW5jZSB3ZSBkb24ndCB3YW50IHRvIHN3aXRjaCB0byBsb2NhbCB2aWRlby5cbiAgICAgICAgaWYgKGNvbnRhaW5lciAmJiAhVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgdmlkZW8gPSBjb250YWluZXIuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJ2aWRlb1wiKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBsYXJnZSB2aWRlbyBpZiB0aGUgdmlkZW8gc291cmNlIGlzIGFscmVhZHkgYXZhaWxhYmxlLFxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIHdhaXQgZm9yIHRoZSBcInZpZGVvYWN0aXZlLmppbmdsZVwiIGV2ZW50LlxuICAgICAgICAgICAgaWYgKHZpZGVvLmxlbmd0aCAmJiB2aWRlb1swXS5jdXJyZW50VGltZSA+IDApXG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQudXBkYXRlTGFyZ2VWaWRlbyh2aWRlb1swXS5zcmMpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBPbiBsYXN0IE4gY2hhbmdlIGV2ZW50LlxuICAgICAqXG4gICAgICogQHBhcmFtIGV2ZW50IHRoZSBldmVudCB0aGF0IG5vdGlmaWVkIHVzXG4gICAgICogQHBhcmFtIGxhc3RORW5kcG9pbnRzIHRoZSBsaXN0IG9mIGxhc3QgTiBlbmRwb2ludHNcbiAgICAgKiBAcGFyYW0gZW5kcG9pbnRzRW50ZXJpbmdMYXN0TiB0aGUgbGlzdCBjdXJyZW50bHkgZW50ZXJpbmcgbGFzdCBOXG4gICAgICogZW5kcG9pbnRzXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgnbGFzdG5jaGFuZ2VkJywgZnVuY3Rpb24gKCBldmVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RORW5kcG9pbnRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kcG9pbnRzRW50ZXJpbmdMYXN0TixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cmVhbSkge1xuICAgICAgICBpZiAobGFzdE5Db3VudCAhPT0gbGFzdE5FbmRwb2ludHMubGVuZ3RoKVxuICAgICAgICAgICAgbGFzdE5Db3VudCA9IGxhc3RORW5kcG9pbnRzLmxlbmd0aDtcblxuICAgICAgICBsYXN0TkVuZHBvaW50c0NhY2hlID0gbGFzdE5FbmRwb2ludHM7XG5cbiAgICAgICAgJCgnI3JlbW90ZVZpZGVvcz5zcGFuJykuZWFjaChmdW5jdGlvbiggaW5kZXgsIGVsZW1lbnQgKSB7XG4gICAgICAgICAgICB2YXIgcmVzb3VyY2VKaWQgPSBWaWRlb0xheW91dC5nZXRQZWVyQ29udGFpbmVyUmVzb3VyY2VKaWQoZWxlbWVudCk7XG5cbiAgICAgICAgICAgIGlmIChyZXNvdXJjZUppZFxuICAgICAgICAgICAgICAgICYmIGxhc3RORW5kcG9pbnRzLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICAgICAmJiBsYXN0TkVuZHBvaW50cy5pbmRleE9mKHJlc291cmNlSmlkKSA8IDApIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlbW92ZSBmcm9tIGxhc3QgTlwiLCByZXNvdXJjZUppZCk7XG4gICAgICAgICAgICAgICAgc2hvd1BlZXJDb250YWluZXIocmVzb3VyY2VKaWQsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCFlbmRwb2ludHNFbnRlcmluZ0xhc3ROIHx8IGVuZHBvaW50c0VudGVyaW5nTGFzdE4ubGVuZ3RoIDwgMClcbiAgICAgICAgICAgIGVuZHBvaW50c0VudGVyaW5nTGFzdE4gPSBsYXN0TkVuZHBvaW50cztcblxuICAgICAgICBpZiAoZW5kcG9pbnRzRW50ZXJpbmdMYXN0TiAmJiBlbmRwb2ludHNFbnRlcmluZ0xhc3ROLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGVuZHBvaW50c0VudGVyaW5nTGFzdE4uZm9yRWFjaChmdW5jdGlvbiAocmVzb3VyY2VKaWQpIHtcblxuICAgICAgICAgICAgICAgIGlmICghJCgnI3BhcnRpY2lwYW50XycgKyByZXNvdXJjZUppZCkuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJBZGQgdG8gbGFzdCBOXCIsIHJlc291cmNlSmlkKTtcbiAgICAgICAgICAgICAgICAgICAgc2hvd1BlZXJDb250YWluZXIocmVzb3VyY2VKaWQsIHRydWUpO1xuXG4gICAgICAgICAgICAgICAgICAgIGRlcC5VSUFjdGl2YXRvcigpLmdldFJUQ1NlcnZpY2UoKS5yZW1vdGVTdHJlYW1zLnNvbWUoZnVuY3Rpb24gKG1lZGlhU3RyZWFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVkaWFTdHJlYW0ucGVlcmppZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICYmIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKG1lZGlhU3RyZWFtLnBlZXJqaWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID09PSByZXNvdXJjZUppZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICYmIG1lZGlhU3RyZWFtLnR5cGUgPT09IG1lZGlhU3RyZWFtLlZJREVPX1RZUEUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2VsID0gJCgnI3BhcnRpY2lwYW50XycgKyByZXNvdXJjZUppZCArICc+dmlkZW8nKTtcblxuLy88PDw8PDw8IEhFQUQ6VUkvdmlkZW9sYXlvdXQuanNcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dGFjaE1lZGlhU3RyZWFtKHNlbCwgbWVkaWFTdHJlYW0uc3RyZWFtKTtcbi8vPT09PT09PVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzaW11bGNhc3QgPSBuZXcgU2ltdWxjYXN0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZpZGVvU3RyZWFtID0gc2ltdWxjYXN0LmdldFJlY2VpdmluZ1ZpZGVvU3RyZWFtKG1lZGlhU3RyZWFtLnN0cmVhbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0YWNoTWVkaWFTdHJlYW0oc2VsLCB2aWRlb1N0cmVhbSk7XG4vLz4+Pj4+Pj4gbWFzdGVyOnZpZGVvbGF5b3V0LmpzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2FpdEZvclJlbW90ZVZpZGVvKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVkaWFTdHJlYW0uc3NyYyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lZGlhU3RyZWFtLnN0cmVhbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiB3YWl0Rm9yUmVtb3RlVmlkZW8oc2VsZWN0b3IsIHNzcmMsIHN0cmVhbSkge1xuICAgICAgICBpZiAoc2VsZWN0b3IucmVtb3ZlZCB8fCAhc2VsZWN0b3IucGFyZW50KCkuaXMoXCI6dmlzaWJsZVwiKSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKFwiTWVkaWEgcmVtb3ZlZCBiZWZvcmUgaGFkIHN0YXJ0ZWRcIiwgc2VsZWN0b3IpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN0cmVhbS5pZCA9PT0gJ21peGVkbXNsYWJlbCcpIHJldHVybjtcblxuICAgICAgICBpZiAoc2VsZWN0b3JbMF0uY3VycmVudFRpbWUgPiAwKSB7XG4gICAgICAgICAgICB2YXIgc2ltdWxjYXN0ID0gbmV3IFNpbXVsY2FzdCgpO1xuICAgICAgICAgICAgdmFyIHZpZGVvU3RyZWFtID0gc2ltdWxjYXN0LmdldFJlY2VpdmluZ1ZpZGVvU3RyZWFtKHN0cmVhbSk7XG4gICAgICAgICAgICBhdHRhY2hNZWRpYVN0cmVhbShzZWxlY3RvciwgdmlkZW9TdHJlYW0pOyAvLyBGSVhNRTogd2h5IGRvIGkgaGF2ZSB0byBkbyB0aGlzIGZvciBGRj9cblxuICAgICAgICAgICAgLy8gRklYTUU6IGFkZCBhIGNsYXNzIHRoYXQgd2lsbCBhc3NvY2lhdGUgcGVlciBKaWQsIHZpZGVvLnNyYywgaXQncyBzc3JjIGFuZCB2aWRlbyB0eXBlXG4gICAgICAgICAgICAvLyAgICAgICAgaW4gb3JkZXIgdG8gZ2V0IHJpZCBvZiB0b28gbWFueSBtYXBzXG4gICAgICAgICAgICBpZiAoc3NyYyAmJiBzZWxlY3Rvci5hdHRyKCdzcmMnKSkge1xuICAgICAgICAgICAgICAgIHZpZGVvU3JjVG9Tc3JjW3NlbGVjdG9yLmF0dHIoJ3NyYycpXSA9IHNzcmM7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIk5vIHNzcmMgZ2l2ZW4gZm9yIHZpZGVvXCIsIHNlbGVjdG9yKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmlkZW9BY3RpdmUoc2VsZWN0b3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgd2FpdEZvclJlbW90ZVZpZGVvKHNlbGVjdG9yLCBzc3JjLCBzdHJlYW0pO1xuICAgICAgICAgICAgfSwgMjUwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHZpZGVvQWN0aXZlKHZpZGVvZWxlbSkge1xuICAgICAgICBpZiAodmlkZW9lbGVtLmF0dHIoJ2lkJykuaW5kZXhPZignbWl4ZWRtc2xhYmVsJykgPT09IC0xKSB7XG4gICAgICAgICAgICAvLyBpZ25vcmUgbWl4ZWRtc2xhYmVsYTAgYW5kIHYwXG5cbiAgICAgICAgICAgIHZpZGVvZWxlbS5zaG93KCk7XG4gICAgICAgICAgICBWaWRlb0xheW91dC5yZXNpemVUaHVtYm5haWxzKCk7XG5cbiAgICAgICAgICAgIHZhciB2aWRlb1BhcmVudCA9IHZpZGVvZWxlbS5wYXJlbnQoKTtcbiAgICAgICAgICAgIHZhciBwYXJlbnRSZXNvdXJjZUppZCA9IG51bGw7XG4gICAgICAgICAgICBpZiAodmlkZW9QYXJlbnQpXG4gICAgICAgICAgICAgICAgcGFyZW50UmVzb3VyY2VKaWRcbiAgICAgICAgICAgICAgICAgICAgPSBWaWRlb0xheW91dC5nZXRQZWVyQ29udGFpbmVyUmVzb3VyY2VKaWQodmlkZW9QYXJlbnRbMF0pO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGxhcmdlIHZpZGVvIHRvIHRoZSBsYXN0IGFkZGVkIHZpZGVvIG9ubHkgaWYgdGhlcmUncyBub1xuICAgICAgICAgICAgLy8gY3VycmVudCBkb21pbmFudCBvciBmb2N1c2VkIHNwZWFrZXIgb3IgdXBkYXRlIGl0IHRvIHRoZSBjdXJyZW50XG4gICAgICAgICAgICAvLyBkb21pbmFudCBzcGVha2VyLlxuICAgICAgICAgICAgaWYgKCghVmlkZW9MYXlvdXQuZm9jdXNlZFZpZGVvU3JjICYmICFWaWRlb0xheW91dC5nZXREb21pbmFudFNwZWFrZXJSZXNvdXJjZUppZCgpKVxuICAgICAgICAgICAgICAgIHx8IChwYXJlbnRSZXNvdXJjZUppZFxuICAgICAgICAgICAgICAgICYmIFZpZGVvTGF5b3V0LmdldERvbWluYW50U3BlYWtlclJlc291cmNlSmlkKClcbiAgICAgICAgICAgICAgICAgICAgPT09IHBhcmVudFJlc291cmNlSmlkKSkge1xuICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8odmlkZW9lbGVtLmF0dHIoJ3NyYycpLCAxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2hvd0ZvY3VzSW5kaWNhdG9yKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgbXkucmVzaXplVmlkZW9TcGFjZSA9IGZ1bmN0aW9uKHJpZ2h0Q29sdW1uRWwsIHJpZ2h0Q29sdW1uU2l6ZSwgaXNWaXNpYmxlKVxuICAgIHtcbiAgICAgICAgdmFyIHZpZGVvc3BhY2UgPSAkKCcjdmlkZW9zcGFjZScpO1xuXG4gICAgICAgIHZhciB2aWRlb3NwYWNlV2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aCAtIHJpZ2h0Q29sdW1uU2l6ZVswXTtcbiAgICAgICAgdmFyIHZpZGVvc3BhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIHZhciB2aWRlb1NpemVcbiAgICAgICAgICAgID0gZ2V0VmlkZW9TaXplKG51bGwsIG51bGwsIHZpZGVvc3BhY2VXaWR0aCwgdmlkZW9zcGFjZUhlaWdodCk7XG4gICAgICAgIHZhciB2aWRlb1dpZHRoID0gdmlkZW9TaXplWzBdO1xuICAgICAgICB2YXIgdmlkZW9IZWlnaHQgPSB2aWRlb1NpemVbMV07XG4gICAgICAgIHZhciB2aWRlb1Bvc2l0aW9uID0gZ2V0VmlkZW9Qb3NpdGlvbih2aWRlb1dpZHRoLFxuICAgICAgICAgICAgdmlkZW9IZWlnaHQsXG4gICAgICAgICAgICB2aWRlb3NwYWNlV2lkdGgsXG4gICAgICAgICAgICB2aWRlb3NwYWNlSGVpZ2h0KTtcbiAgICAgICAgdmFyIGhvcml6b250YWxJbmRlbnQgPSB2aWRlb1Bvc2l0aW9uWzBdO1xuICAgICAgICB2YXIgdmVydGljYWxJbmRlbnQgPSB2aWRlb1Bvc2l0aW9uWzFdO1xuXG4gICAgICAgIHZhciB0aHVtYm5haWxTaXplID0gVmlkZW9MYXlvdXQuY2FsY3VsYXRlVGh1bWJuYWlsU2l6ZSh2aWRlb3NwYWNlV2lkdGgpO1xuICAgICAgICB2YXIgdGh1bWJuYWlsc1dpZHRoID0gdGh1bWJuYWlsU2l6ZVswXTtcbiAgICAgICAgdmFyIHRodW1ibmFpbHNIZWlnaHQgPSB0aHVtYm5haWxTaXplWzFdO1xuXG4gICAgICAgIGlmIChpc1Zpc2libGUpIHtcbiAgICAgICAgICAgIHZpZGVvc3BhY2UuYW5pbWF0ZSh7cmlnaHQ6IHJpZ2h0Q29sdW1uU2l6ZVswXSxcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHZpZGVvc3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB2aWRlb3NwYWNlSGVpZ2h0fSxcbiAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwfSk7XG5cbiAgICAgICAgICAgICQoJyNyZW1vdGVWaWRlb3MnKS5hbmltYXRlKHtoZWlnaHQ6IHRodW1ibmFpbHNIZWlnaHR9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDB9KTtcblxuICAgICAgICAgICAgJCgnI3JlbW90ZVZpZGVvcz5zcGFuJykuYW5pbWF0ZSh7aGVpZ2h0OiB0aHVtYm5haWxzSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogdGh1bWJuYWlsc1dpZHRofSxcbiAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicmVtb3RldmlkZW8ucmVzaXplZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt0aHVtYm5haWxzV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRodW1ibmFpbHNIZWlnaHRdKTtcbiAgICAgICAgICAgICAgICAgICAgfX0pO1xuXG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlb0NvbnRhaW5lcicpLmFuaW1hdGUoeyB3aWR0aDogdmlkZW9zcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZpZGVvc3BhY2VIZWlnaHR9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDBcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5hbmltYXRlKHsgIHdpZHRoOiB2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB0b3A6IHZlcnRpY2FsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICBib3R0b206IHZlcnRpY2FsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiBob3Jpem9udGFsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICByaWdodDogaG9yaXpvbnRhbEluZGVudH0sXG4gICAgICAgICAgICAgICAgeyAgIHF1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMFxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByaWdodENvbHVtbkVsLmhpZGUoXCJzbGlkZVwiLCB7IGRpcmVjdGlvbjogXCJyaWdodFwiLFxuICAgICAgICAgICAgICAgIHF1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBVbmRvY2sgdGhlIHRvb2xiYXIgd2hlbiB0aGUgY2hhdCBpcyBzaG93biBhbmQgaWYgd2UncmUgaW4gYVxuICAgICAgICAgICAgLy8gdmlkZW8gbW9kZS5cbiAgICAgICAgICAgIGlmIChWaWRlb0xheW91dC5pc0xhcmdlVmlkZW9WaXNpYmxlKCkpXG4gICAgICAgICAgICAgICAgZGVwLlRvb2xiYXIoKS5kb2NrVG9vbGJhcihmYWxzZSk7XG5cbiAgICAgICAgICAgIHZpZGVvc3BhY2UuYW5pbWF0ZSh7cmlnaHQ6IHJpZ2h0Q29sdW1uU2l6ZVswXSxcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHZpZGVvc3BhY2VXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB2aWRlb3NwYWNlSGVpZ2h0fSxcbiAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHRDb2x1bW5FbC50cmlnZ2VyKCdzaG93bicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICQoJyNyZW1vdGVWaWRlb3MnKS5hbmltYXRlKHtoZWlnaHQ6IHRodW1ibmFpbHNIZWlnaHR9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDB9KTtcblxuICAgICAgICAgICAgJCgnI3JlbW90ZVZpZGVvcz5zcGFuJykuYW5pbWF0ZSh7aGVpZ2h0OiB0aHVtYm5haWxzSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogdGh1bWJuYWlsc1dpZHRofSxcbiAgICAgICAgICAgICAgICB7cXVldWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicmVtb3RldmlkZW8ucmVzaXplZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFt0aHVtYm5haWxzV2lkdGgsIHRodW1ibmFpbHNIZWlnaHRdKTtcbiAgICAgICAgICAgICAgICAgICAgfX0pO1xuXG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlb0NvbnRhaW5lcicpLmFuaW1hdGUoeyB3aWR0aDogdmlkZW9zcGFjZVdpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZpZGVvc3BhY2VIZWlnaHR9LFxuICAgICAgICAgICAgICAgIHtxdWV1ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDBcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5hbmltYXRlKHsgIHdpZHRoOiB2aWRlb1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHZpZGVvSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB0b3A6IHZlcnRpY2FsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICBib3R0b206IHZlcnRpY2FsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiBob3Jpem9udGFsSW5kZW50LFxuICAgICAgICAgICAgICAgICAgICByaWdodDogaG9yaXpvbnRhbEluZGVudH0sXG4gICAgICAgICAgICAgICAge3F1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMFxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByaWdodENvbHVtbkVsLnNob3coXCJzbGlkZVwiLCB7IGRpcmVjdGlvbjogXCJyaWdodFwiLFxuICAgICAgICAgICAgICAgIHF1ZXVlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdzaW11bGNhc3RsYXllcnN0YXJ0ZWQnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICB2YXIgbG9jYWxWaWRlb1NlbGVjdG9yID0gJCgnIycgKyAnbG9jYWxWaWRlb18nICsgY29ubmVjdGlvbi5qaW5nbGUubG9jYWxWaWRlby5pZCk7XG4gICAgICAgIHZhciBzaW11bGNhc3QgPSBuZXcgU2ltdWxjYXN0KCk7XG4gICAgICAgIHZhciBzdHJlYW0gPSBzaW11bGNhc3QuZ2V0TG9jYWxWaWRlb1N0cmVhbSgpO1xuXG4gICAgICAgIC8vIEF0dGFjaCBXZWJSVEMgc3RyZWFtXG4gICAgICAgIGF0dGFjaE1lZGlhU3RyZWFtKGxvY2FsVmlkZW9TZWxlY3Rvciwgc3RyZWFtKTtcblxuICAgICAgICBsb2NhbFZpZGVvU3JjID0gJChsb2NhbFZpZGVvU2VsZWN0b3IpLmF0dHIoJ3NyYycpO1xuICAgIH0pO1xuXG4gICAgJChkb2N1bWVudCkuYmluZCgnc2ltdWxjYXN0bGF5ZXJzdG9wcGVkJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgdmFyIGxvY2FsVmlkZW9TZWxlY3RvciA9ICQoJyMnICsgJ2xvY2FsVmlkZW9fJyArIGNvbm5lY3Rpb24uamluZ2xlLmxvY2FsVmlkZW8uaWQpO1xuICAgICAgICB2YXIgc2ltdWxjYXN0ID0gbmV3IFNpbXVsY2FzdCgpO1xuICAgICAgICB2YXIgc3RyZWFtID0gc2ltdWxjYXN0LmdldExvY2FsVmlkZW9TdHJlYW0oKTtcblxuICAgICAgICAvLyBBdHRhY2ggV2ViUlRDIHN0cmVhbVxuICAgICAgICBhdHRhY2hNZWRpYVN0cmVhbShsb2NhbFZpZGVvU2VsZWN0b3IsIHN0cmVhbSk7XG5cbiAgICAgICAgbG9jYWxWaWRlb1NyYyA9ICQobG9jYWxWaWRlb1NlbGVjdG9yKS5hdHRyKCdzcmMnKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIE9uIHNpbXVsY2FzdCBsYXllcnMgY2hhbmdlZCBldmVudC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdzaW11bGNhc3RsYXllcnNjaGFuZ2VkJywgZnVuY3Rpb24gKGV2ZW50LCBlbmRwb2ludFNpbXVsY2FzdExheWVycykge1xuICAgICAgICB2YXIgc2ltdWxjYXN0ID0gbmV3IFNpbXVsY2FzdCgpO1xuICAgICAgICBlbmRwb2ludFNpbXVsY2FzdExheWVycy5mb3JFYWNoKGZ1bmN0aW9uIChlc2wpIHtcblxuICAgICAgICAgICAgdmFyIHByaW1hcnlTU1JDID0gZXNsLnNpbXVsY2FzdExheWVyLnByaW1hcnlTU1JDO1xuICAgICAgICAgICAgdmFyIG1zaWQgPSBzaW11bGNhc3QuZ2V0UmVtb3RlVmlkZW9TdHJlYW1JZEJ5U1NSQyhwcmltYXJ5U1NSQyk7XG5cbiAgICAgICAgICAgIC8vIEdldCBzZXNzaW9uIGFuZCBzdHJlYW0gZnJvbSBtc2lkLlxuICAgICAgICAgICAgdmFyIHNlc3Npb24sIGVsZWN0ZWRTdHJlYW07XG4gICAgICAgICAgICB2YXIgaSwgaiwgaztcbiAgICAgICAgICAgIGlmIChjb25uZWN0aW9uLmppbmdsZSkge1xuICAgICAgICAgICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoY29ubmVjdGlvbi5qaW5nbGUuc2Vzc2lvbnMpO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzaWQgPSBrZXlzW2ldO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVjdGVkU3RyZWFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzdHJlYW0gZm91bmQsIHN0b3AuXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb24gPSBjb25uZWN0aW9uLmppbmdsZS5zZXNzaW9uc1tzaWRdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5yZW1vdGVTdHJlYW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgc2Vzc2lvbi5yZW1vdGVTdHJlYW1zLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlbW90ZVN0cmVhbSA9IHNlc3Npb24ucmVtb3RlU3RyZWFtc1tqXTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVjdGVkU3RyZWFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHN0cmVhbSBmb3VuZCwgc3RvcC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0cmFja3MgPSByZW1vdGVTdHJlYW0uZ2V0VmlkZW9UcmFja3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodHJhY2tzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoayA9IDA7IGsgPCB0cmFja3MubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0cmFjayA9IHRyYWNrc1trXTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1zaWQgPT09IFtyZW1vdGVTdHJlYW0uaWQsIHRyYWNrLmlkXS5qb2luKCcgJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVjdGVkU3RyZWFtID0gbmV3IHdlYmtpdE1lZGlhU3RyZWFtKFt0cmFja10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHN0cmVhbSBmb3VuZCwgc3RvcC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHNlc3Npb24gJiYgZWxlY3RlZFN0cmVhbSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnU3dpdGNoaW5nIHNpbXVsY2FzdCBzdWJzdHJlYW0uJyk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKFtlc2wsIHByaW1hcnlTU1JDLCBtc2lkLCBzZXNzaW9uLCBlbGVjdGVkU3RyZWFtXSk7XG5cbiAgICAgICAgICAgICAgICB2YXIgbXNpZFBhcnRzID0gbXNpZC5zcGxpdCgnICcpO1xuICAgICAgICAgICAgICAgIHZhciBzZWxSZW1vdGVWaWRlbyA9ICQoWycjJywgJ3JlbW90ZVZpZGVvXycsIHNlc3Npb24uc2lkLCAnXycsIG1zaWRQYXJ0c1swXV0uam9pbignJykpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHVwZGF0ZUxhcmdlVmlkZW8gPSAoc3NyYzJqaWRbdmlkZW9TcmNUb1NzcmNbc2VsUmVtb3RlVmlkZW8uYXR0cignc3JjJyldXVxuICAgICAgICAgICAgICAgICAgICA9PSBzc3JjMmppZFt2aWRlb1NyY1RvU3NyY1tsYXJnZVZpZGVvTmV3U3JjXV0pO1xuICAgICAgICAgICAgICAgIHZhciB1cGRhdGVGb2N1c2VkVmlkZW9TcmMgPSAoc2VsUmVtb3RlVmlkZW8uYXR0cignc3JjJykgPT0gZm9jdXNlZFZpZGVvU3JjKTtcblxuICAgICAgICAgICAgICAgIHZhciBlbGVjdGVkU3RyZWFtVXJsID0gd2Via2l0VVJMLmNyZWF0ZU9iamVjdFVSTChlbGVjdGVkU3RyZWFtKTtcbiAgICAgICAgICAgICAgICBzZWxSZW1vdGVWaWRlby5hdHRyKCdzcmMnLCBlbGVjdGVkU3RyZWFtVXJsKTtcbiAgICAgICAgICAgICAgICB2aWRlb1NyY1RvU3NyY1tzZWxSZW1vdGVWaWRlby5hdHRyKCdzcmMnKV0gPSBwcmltYXJ5U1NSQztcblxuICAgICAgICAgICAgICAgIGlmICh1cGRhdGVMYXJnZVZpZGVvKSB7XG4gICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnVwZGF0ZUxhcmdlVmlkZW8oZWxlY3RlZFN0cmVhbVVybCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHVwZGF0ZUZvY3VzZWRWaWRlb1NyYykge1xuICAgICAgICAgICAgICAgICAgICBmb2N1c2VkVmlkZW9TcmMgPSBlbGVjdGVkU3RyZWFtVXJsO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdDb3VsZCBub3QgZmluZCBhIHN0cmVhbSBvciBhIHNlc3Npb24uJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG15O1xufShWaWRlb0xheW91dCB8fCB7fSkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZGVvTGF5b3V0O1xuIiwidmFyIFZpZGVvTGF5b3V0ID0gcmVxdWlyZShcIi4uL1ZpZGVvTGF5b3V0XCIpO1xudmFyIENhbnZhc1V0aWwgPSByZXF1aXJlKFwiLi9DYW52YXNVdGlsLmpzXCIpO1xuXG4vKipcbiAqIFRoZSBhdWRpbyBMZXZlbHMgcGx1Z2luLlxuICovXG52YXIgQXVkaW9MZXZlbHMgPSAoZnVuY3Rpb24obXkpIHtcbiAgICB2YXIgYXVkaW9MZXZlbENhbnZhc0NhY2hlID0ge307XG5cbiAgICBteS5MT0NBTF9MRVZFTCA9ICdsb2NhbCc7XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBhdWRpbyBsZXZlbCBjYW52YXMgZm9yIHRoZSBnaXZlbiBwZWVySmlkLiBJZiB0aGUgY2FudmFzXG4gICAgICogZGlkbid0IGV4aXN0IHdlIGNyZWF0ZSBpdC5cbiAgICAgKi9cbiAgICBteS51cGRhdGVBdWRpb0xldmVsQ2FudmFzID0gZnVuY3Rpb24gKHBlZXJKaWQpIHtcbiAgICAgICAgdmFyIHJlc291cmNlSmlkID0gbnVsbDtcbiAgICAgICAgdmFyIHZpZGVvU3BhbklkID0gbnVsbDtcbiAgICAgICAgaWYgKCFwZWVySmlkKVxuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAnbG9jYWxWaWRlb0NvbnRhaW5lcic7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVzb3VyY2VKaWQgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChwZWVySmlkKTtcblxuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAncGFydGljaXBhbnRfJyArIHJlc291cmNlSmlkO1xuICAgICAgICB9XG5cbiAgICAgICAgdmlkZW9TcGFuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodmlkZW9TcGFuSWQpO1xuXG4gICAgICAgIGlmICghdmlkZW9TcGFuKSB7XG4gICAgICAgICAgICBpZiAocmVzb3VyY2VKaWQpXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIk5vIHZpZGVvIGVsZW1lbnQgZm9yIGppZFwiLCByZXNvdXJjZUppZCk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIk5vIHZpZGVvIGVsZW1lbnQgZm9yIGxvY2FsIHZpZGVvLlwiKTtcblxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGF1ZGlvTGV2ZWxDYW52YXMgPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5jYW52YXMnKTtcblxuICAgICAgICB2YXIgdmlkZW9TcGFjZVdpZHRoID0gJCgnI3JlbW90ZVZpZGVvcycpLndpZHRoKCk7XG4gICAgICAgIHZhciB0aHVtYm5haWxTaXplXG4gICAgICAgICAgICA9IFZpZGVvTGF5b3V0LmNhbGN1bGF0ZVRodW1ibmFpbFNpemUodmlkZW9TcGFjZVdpZHRoKTtcbiAgICAgICAgdmFyIHRodW1ibmFpbFdpZHRoID0gdGh1bWJuYWlsU2l6ZVswXTtcbiAgICAgICAgdmFyIHRodW1ibmFpbEhlaWdodCA9IHRodW1ibmFpbFNpemVbMV07XG5cbiAgICAgICAgaWYgKCFhdWRpb0xldmVsQ2FudmFzIHx8IGF1ZGlvTGV2ZWxDYW52YXMubGVuZ3RoID09PSAwKSB7XG5cbiAgICAgICAgICAgIGF1ZGlvTGV2ZWxDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgICAgIGF1ZGlvTGV2ZWxDYW52YXMuY2xhc3NOYW1lID0gXCJhdWRpb2xldmVsXCI7XG4gICAgICAgICAgICBhdWRpb0xldmVsQ2FudmFzLnN0eWxlLmJvdHRvbSA9IFwiLVwiICsgaW50ZXJmYWNlQ29uZmlnLkNBTlZBU19FWFRSQS8yICsgXCJweFwiO1xuICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhcy5zdHlsZS5sZWZ0ID0gXCItXCIgKyBpbnRlcmZhY2VDb25maWcuQ0FOVkFTX0VYVFJBLzIgKyBcInB4XCI7XG4gICAgICAgICAgICByZXNpemVBdWRpb0xldmVsQ2FudmFzKCBhdWRpb0xldmVsQ2FudmFzLFxuICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgdGh1bWJuYWlsSGVpZ2h0KTtcblxuICAgICAgICAgICAgdmlkZW9TcGFuLmFwcGVuZENoaWxkKGF1ZGlvTGV2ZWxDYW52YXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhcyA9IGF1ZGlvTGV2ZWxDYW52YXMuZ2V0KDApO1xuXG4gICAgICAgICAgICByZXNpemVBdWRpb0xldmVsQ2FudmFzKCBhdWRpb0xldmVsQ2FudmFzLFxuICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgdGh1bWJuYWlsSGVpZ2h0KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBhdWRpbyBsZXZlbCBVSSBmb3IgdGhlIGdpdmVuIHJlc291cmNlSmlkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHJlc291cmNlSmlkIHRoZSByZXNvdXJjZSBqaWQgaW5kaWNhdGluZyB0aGUgdmlkZW8gZWxlbWVudCBmb3JcbiAgICAgKiB3aGljaCB3ZSBkcmF3IHRoZSBhdWRpbyBsZXZlbFxuICAgICAqIEBwYXJhbSBhdWRpb0xldmVsIHRoZSBuZXdBdWRpbyBsZXZlbCB0byByZW5kZXJcbiAgICAgKi9cbiAgICBteS51cGRhdGVBdWRpb0xldmVsID0gZnVuY3Rpb24gKHJlc291cmNlSmlkLCBhdWRpb0xldmVsKSB7XG4gICAgICAgIGRyYXdBdWRpb0xldmVsQ2FudmFzKHJlc291cmNlSmlkLCBhdWRpb0xldmVsKTtcblxuICAgICAgICB2YXIgdmlkZW9TcGFuSWQgPSBnZXRWaWRlb1NwYW5JZChyZXNvdXJjZUppZCk7XG5cbiAgICAgICAgdmFyIGF1ZGlvTGV2ZWxDYW52YXMgPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5jYW52YXMnKS5nZXQoMCk7XG5cbiAgICAgICAgaWYgKCFhdWRpb0xldmVsQ2FudmFzKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHZhciBkcmF3Q29udGV4dCA9IGF1ZGlvTGV2ZWxDYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgICAgICB2YXIgY2FudmFzQ2FjaGUgPSBhdWRpb0xldmVsQ2FudmFzQ2FjaGVbcmVzb3VyY2VKaWRdO1xuXG4gICAgICAgIGRyYXdDb250ZXh0LmNsZWFyUmVjdCAoMCwgMCxcbiAgICAgICAgICAgICAgICBhdWRpb0xldmVsQ2FudmFzLndpZHRoLCBhdWRpb0xldmVsQ2FudmFzLmhlaWdodCk7XG4gICAgICAgIGRyYXdDb250ZXh0LmRyYXdJbWFnZShjYW52YXNDYWNoZSwgMCwgMCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlc2l6ZXMgdGhlIGdpdmVuIGF1ZGlvIGxldmVsIGNhbnZhcyB0byBtYXRjaCB0aGUgZ2l2ZW4gdGh1bWJuYWlsIHNpemUuXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVzaXplQXVkaW9MZXZlbENhbnZhcyhhdWRpb0xldmVsQ2FudmFzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGh1bWJuYWlsV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHVtYm5haWxIZWlnaHQpIHtcbiAgICAgICAgYXVkaW9MZXZlbENhbnZhcy53aWR0aCA9IHRodW1ibmFpbFdpZHRoICsgaW50ZXJmYWNlQ29uZmlnLkNBTlZBU19FWFRSQTtcbiAgICAgICAgYXVkaW9MZXZlbENhbnZhcy5oZWlnaHQgPSB0aHVtYm5haWxIZWlnaHQgKyBpbnRlcmZhY2VDb25maWcuQ0FOVkFTX0VYVFJBO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBEcmF3cyB0aGUgYXVkaW8gbGV2ZWwgY2FudmFzIGludG8gdGhlIGNhY2hlZCBjYW52YXMgb2JqZWN0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHJlc291cmNlSmlkIHRoZSByZXNvdXJjZSBqaWQgaW5kaWNhdGluZyB0aGUgdmlkZW8gZWxlbWVudCBmb3JcbiAgICAgKiB3aGljaCB3ZSBkcmF3IHRoZSBhdWRpbyBsZXZlbFxuICAgICAqIEBwYXJhbSBhdWRpb0xldmVsIHRoZSBuZXdBdWRpbyBsZXZlbCB0byByZW5kZXJcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBkcmF3QXVkaW9MZXZlbENhbnZhcyhyZXNvdXJjZUppZCwgYXVkaW9MZXZlbCkge1xuICAgICAgICBpZiAoIWF1ZGlvTGV2ZWxDYW52YXNDYWNoZVtyZXNvdXJjZUppZF0pIHtcblxuICAgICAgICAgICAgdmFyIHZpZGVvU3BhbklkID0gZ2V0VmlkZW9TcGFuSWQocmVzb3VyY2VKaWQpO1xuXG4gICAgICAgICAgICB2YXIgYXVkaW9MZXZlbENhbnZhc09yaWcgPSAkKCcjJyArIHZpZGVvU3BhbklkICsgJz5jYW52YXMnKS5nZXQoMCk7XG5cbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgKiBGSVhNRSBUZXN0aW5nIGhhcyBzaG93biB0aGF0IGF1ZGlvTGV2ZWxDYW52YXNPcmlnIG1heSBub3QgZXhpc3QuXG4gICAgICAgICAgICAgKiBJbiBzdWNoIGEgY2FzZSwgdGhlIG1ldGhvZCBDYW52YXNVdGlsLmNsb25lQ2FudmFzIG1heSB0aHJvdyBhblxuICAgICAgICAgICAgICogZXJyb3IuIFNpbmNlIGF1ZGlvIGxldmVscyBhcmUgZnJlcXVlbnRseSB1cGRhdGVkLCB0aGUgZXJyb3JzIGhhdmVcbiAgICAgICAgICAgICAqIGJlZW4gb2JzZXJ2ZWQgdG8gcGlsZSBpbnRvIHRoZSBjb25zb2xlLCBzdHJhaW4gdGhlIENQVS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaWYgKGF1ZGlvTGV2ZWxDYW52YXNPcmlnKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGF1ZGlvTGV2ZWxDYW52YXNDYWNoZVtyZXNvdXJjZUppZF1cbiAgICAgICAgICAgICAgICAgICAgPSBDYW52YXNVdGlsLmNsb25lQ2FudmFzKGF1ZGlvTGV2ZWxDYW52YXNPcmlnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjYW52YXMgPSBhdWRpb0xldmVsQ2FudmFzQ2FjaGVbcmVzb3VyY2VKaWRdO1xuXG4gICAgICAgIGlmICghY2FudmFzKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHZhciBkcmF3Q29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgICAgIGRyYXdDb250ZXh0LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuXG4gICAgICAgIHZhciBzaGFkb3dMZXZlbCA9IGdldFNoYWRvd0xldmVsKGF1ZGlvTGV2ZWwpO1xuXG4gICAgICAgIGlmIChzaGFkb3dMZXZlbCA+IDApXG4gICAgICAgICAgICAvLyBkcmF3Q29udGV4dCwgeCwgeSwgdywgaCwgciwgc2hhZG93Q29sb3IsIHNoYWRvd0xldmVsXG4gICAgICAgICAgICBDYW52YXNVdGlsLmRyYXdSb3VuZFJlY3RHbG93KCAgIGRyYXdDb250ZXh0LFxuICAgICAgICAgICAgICAgIGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkEvMiwgaW50ZXJmYWNlQ29uZmlnLkNBTlZBU19FWFRSQS8yLFxuICAgICAgICAgICAgICAgIGNhbnZhcy53aWR0aCAtIGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkEsXG4gICAgICAgICAgICAgICAgY2FudmFzLmhlaWdodCAtIGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkEsXG4gICAgICAgICAgICAgICAgaW50ZXJmYWNlQ29uZmlnLkNBTlZBU19SQURJVVMsXG4gICAgICAgICAgICAgICAgaW50ZXJmYWNlQ29uZmlnLlNIQURPV19DT0xPUixcbiAgICAgICAgICAgICAgICBzaGFkb3dMZXZlbCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHNoYWRvdy9nbG93IGxldmVsIGZvciB0aGUgZ2l2ZW4gYXVkaW8gbGV2ZWwuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXVkaW9MZXZlbCB0aGUgYXVkaW8gbGV2ZWwgZnJvbSB3aGljaCB3ZSBkZXRlcm1pbmUgdGhlIHNoYWRvd1xuICAgICAqIGxldmVsXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0U2hhZG93TGV2ZWwgKGF1ZGlvTGV2ZWwpIHtcbiAgICAgICAgdmFyIHNoYWRvd0xldmVsID0gMDtcblxuICAgICAgICBpZiAoYXVkaW9MZXZlbCA8PSAwLjMpIHtcbiAgICAgICAgICAgIHNoYWRvd0xldmVsID0gTWF0aC5yb3VuZChpbnRlcmZhY2VDb25maWcuQ0FOVkFTX0VYVFJBLzIqKGF1ZGlvTGV2ZWwvMC4zKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoYXVkaW9MZXZlbCA8PSAwLjYpIHtcbiAgICAgICAgICAgIHNoYWRvd0xldmVsID0gTWF0aC5yb3VuZChpbnRlcmZhY2VDb25maWcuQ0FOVkFTX0VYVFJBLzIqKChhdWRpb0xldmVsIC0gMC4zKSAvIDAuMykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc2hhZG93TGV2ZWwgPSBNYXRoLnJvdW5kKGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkEvMiooKGF1ZGlvTGV2ZWwgLSAwLjYpIC8gMC40KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNoYWRvd0xldmVsO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSB2aWRlbyBzcGFuIGlkIGNvcnJlc3BvbmRpbmcgdG8gdGhlIGdpdmVuIHJlc291cmNlSmlkIG9yIGxvY2FsXG4gICAgICogdXNlci5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRWaWRlb1NwYW5JZChyZXNvdXJjZUppZCkge1xuICAgICAgICB2YXIgdmlkZW9TcGFuSWQgPSBudWxsO1xuICAgICAgICBpZiAocmVzb3VyY2VKaWQgPT09IFN0YXRpc3RpY3NBY3RpdmF0b3IuTE9DQUxfSklEKVxuICAgICAgICAgICAgdmlkZW9TcGFuSWQgPSAnbG9jYWxWaWRlb0NvbnRhaW5lcic7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHZpZGVvU3BhbklkID0gJ3BhcnRpY2lwYW50XycgKyByZXNvdXJjZUppZDtcblxuICAgICAgICByZXR1cm4gdmlkZW9TcGFuSWQ7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEluZGljYXRlcyB0aGF0IHRoZSByZW1vdGUgdmlkZW8gaGFzIGJlZW4gcmVzaXplZC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdyZW1vdGV2aWRlby5yZXNpemVkJywgZnVuY3Rpb24gKGV2ZW50LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHZhciByZXNpemVkID0gZmFsc2U7XG4gICAgICAgICQoJyNyZW1vdGVWaWRlb3M+c3Bhbj5jYW52YXMnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGNhbnZhcyA9ICQodGhpcykuZ2V0KDApO1xuICAgICAgICAgICAgaWYgKGNhbnZhcy53aWR0aCAhPT0gd2lkdGggKyBpbnRlcmZhY2VDb25maWcuQ0FOVkFTX0VYVFJBKSB7XG4gICAgICAgICAgICAgICAgY2FudmFzLndpZHRoID0gd2lkdGggKyBpbnRlcmZhY2VDb25maWcuQ0FOVkFTX0VYVFJBO1xuICAgICAgICAgICAgICAgIHJlc2l6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY2FudmFzLmhlaWdoICE9PSBoZWlnaHQgKyBpbnRlcmZhY2VDb25maWcuQ0FOVkFTX0VYVFJBKSB7XG4gICAgICAgICAgICAgICAgY2FudmFzLmhlaWdodCA9IGhlaWdodCArIGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkE7XG4gICAgICAgICAgICAgICAgcmVzaXplZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChyZXNpemVkKVxuICAgICAgICAgICAgT2JqZWN0LmtleXMoYXVkaW9MZXZlbENhbnZhc0NhY2hlKS5mb3JFYWNoKGZ1bmN0aW9uIChyZXNvdXJjZUppZCkge1xuICAgICAgICAgICAgICAgIGF1ZGlvTGV2ZWxDYW52YXNDYWNoZVtyZXNvdXJjZUppZF0ud2lkdGhcbiAgICAgICAgICAgICAgICAgICAgPSB3aWR0aCArIGludGVyZmFjZUNvbmZpZy5DQU5WQVNfRVhUUkE7XG4gICAgICAgICAgICAgICAgYXVkaW9MZXZlbENhbnZhc0NhY2hlW3Jlc291cmNlSmlkXS5oZWlnaHRcbiAgICAgICAgICAgICAgICAgICAgPSBoZWlnaHQgKyBpbnRlcmZhY2VDb25maWcuQ0FOVkFTX0VYVFJBO1xuICAgICAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbXk7XG5cbn0pKEF1ZGlvTGV2ZWxzIHx8IHt9KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBdWRpb0xldmVscztcbiIsIi8qKlxuICogVXRpbGl0eSBjbGFzcyBmb3IgZHJhd2luZyBjYW52YXMgc2hhcGVzLlxuICovXG52YXIgQ2FudmFzVXRpbCA9IChmdW5jdGlvbihteSkge1xuXG4gICAgLyoqXG4gICAgICogRHJhd3MgYSByb3VuZCByZWN0YW5nbGUgd2l0aCBhIGdsb3cuIFRoZSBnbG93V2lkdGggaW5kaWNhdGVzIHRoZSBkZXB0aFxuICAgICAqIG9mIHRoZSBnbG93LlxuICAgICAqXG4gICAgICogQHBhcmFtIGRyYXdDb250ZXh0IHRoZSBjb250ZXh0IG9mIHRoZSBjYW52YXMgdG8gZHJhdyB0b1xuICAgICAqIEBwYXJhbSB4IHRoZSB4IGNvb3JkaW5hdGUgb2YgdGhlIHJvdW5kIHJlY3RhbmdsZVxuICAgICAqIEBwYXJhbSB5IHRoZSB5IGNvb3JkaW5hdGUgb2YgdGhlIHJvdW5kIHJlY3RhbmdsZVxuICAgICAqIEBwYXJhbSB3IHRoZSB3aWR0aCBvZiB0aGUgcm91bmQgcmVjdGFuZ2xlXG4gICAgICogQHBhcmFtIGggdGhlIGhlaWdodCBvZiB0aGUgcm91bmQgcmVjdGFuZ2xlXG4gICAgICogQHBhcmFtIGdsb3dDb2xvciB0aGUgY29sb3Igb2YgdGhlIGdsb3dcbiAgICAgKiBAcGFyYW0gZ2xvd1dpZHRoIHRoZSB3aWR0aCBvZiB0aGUgZ2xvd1xuICAgICAqL1xuICAgIG15LmRyYXdSb3VuZFJlY3RHbG93XG4gICAgICAgID0gZnVuY3Rpb24oZHJhd0NvbnRleHQsIHgsIHksIHcsIGgsIHIsIGdsb3dDb2xvciwgZ2xvd1dpZHRoKSB7XG5cbiAgICAgICAgLy8gU2F2ZSB0aGUgcHJldmlvdXMgc3RhdGUgb2YgdGhlIGNvbnRleHQuXG4gICAgICAgIGRyYXdDb250ZXh0LnNhdmUoKTtcblxuICAgICAgICBpZiAodyA8IDIgKiByKSByID0gdyAvIDI7XG4gICAgICAgIGlmIChoIDwgMiAqIHIpIHIgPSBoIC8gMjtcblxuICAgICAgICAvLyBEcmF3IGEgcm91bmQgcmVjdGFuZ2xlLlxuICAgICAgICBkcmF3Q29udGV4dC5iZWdpblBhdGgoKTtcbiAgICAgICAgZHJhd0NvbnRleHQubW92ZVRvKHgrciwgeSk7XG4gICAgICAgIGRyYXdDb250ZXh0LmFyY1RvKHgrdywgeSwgICB4K3csIHkraCwgcik7XG4gICAgICAgIGRyYXdDb250ZXh0LmFyY1RvKHgrdywgeStoLCB4LCAgIHkraCwgcik7XG4gICAgICAgIGRyYXdDb250ZXh0LmFyY1RvKHgsICAgeStoLCB4LCAgIHksICAgcik7XG4gICAgICAgIGRyYXdDb250ZXh0LmFyY1RvKHgsICAgeSwgICB4K3csIHksICAgcik7XG4gICAgICAgIGRyYXdDb250ZXh0LmNsb3NlUGF0aCgpO1xuXG4gICAgICAgIC8vIEFkZCBhIHNoYWRvdyBhcm91bmQgdGhlIHJlY3RhbmdsZVxuICAgICAgICBkcmF3Q29udGV4dC5zaGFkb3dDb2xvciA9IGdsb3dDb2xvcjtcbiAgICAgICAgZHJhd0NvbnRleHQuc2hhZG93Qmx1ciA9IGdsb3dXaWR0aDtcbiAgICAgICAgZHJhd0NvbnRleHQuc2hhZG93T2Zmc2V0WCA9IDA7XG4gICAgICAgIGRyYXdDb250ZXh0LnNoYWRvd09mZnNldFkgPSAwO1xuXG4gICAgICAgIC8vIEZpbGwgdGhlIHNoYXBlLlxuICAgICAgICBkcmF3Q29udGV4dC5maWxsKCk7XG5cbiAgICAgICAgZHJhd0NvbnRleHQuc2F2ZSgpO1xuXG4gICAgICAgIGRyYXdDb250ZXh0LnJlc3RvcmUoKTtcblxuLy8gICAgICAxKSBVbmNvbW1lbnQgdGhpcyBsaW5lIHRvIHVzZSBDb21wb3NpdGUgT3BlcmF0aW9uLCB3aGljaCBpcyBkb2luZyB0aGVcbi8vICAgICAgc2FtZSBhcyB0aGUgY2xpcCBmdW5jdGlvbiBiZWxvdyBhbmQgaXMgYWxzbyBhbnRpYWxpYXNpbmcgdGhlIHJvdW5kXG4vLyAgICAgIGJvcmRlciwgYnV0IGlzIHNhaWQgdG8gYmUgbGVzcyBmYXN0IHBlcmZvcm1hbmNlIHdpc2UuXG5cbi8vICAgICAgZHJhd0NvbnRleHQuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uPSdkZXN0aW5hdGlvbi1vdXQnO1xuXG4gICAgICAgIGRyYXdDb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICBkcmF3Q29udGV4dC5tb3ZlVG8oeCtyLCB5KTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCt3LCB5LCAgIHgrdywgeStoLCByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCt3LCB5K2gsIHgsICAgeStoLCByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCwgICB5K2gsIHgsICAgeSwgICByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuYXJjVG8oeCwgICB5LCAgIHgrdywgeSwgICByKTtcbiAgICAgICAgZHJhd0NvbnRleHQuY2xvc2VQYXRoKCk7XG5cbi8vICAgICAgMikgVW5jb21tZW50IHRoaXMgbGluZSB0byB1c2UgQ29tcG9zaXRlIE9wZXJhdGlvbiwgd2hpY2ggaXMgZG9pbmcgdGhlXG4vLyAgICAgIHNhbWUgYXMgdGhlIGNsaXAgZnVuY3Rpb24gYmVsb3cgYW5kIGlzIGFsc28gYW50aWFsaWFzaW5nIHRoZSByb3VuZFxuLy8gICAgICBib3JkZXIsIGJ1dCBpcyBzYWlkIHRvIGJlIGxlc3MgZmFzdCBwZXJmb3JtYW5jZSB3aXNlLlxuXG4vLyAgICAgIGRyYXdDb250ZXh0LmZpbGwoKTtcblxuICAgICAgICAvLyBDb21tZW50IHRoZXNlIHR3byBsaW5lcyBpZiBjaG9vc2luZyB0byBkbyB0aGUgc2FtZSB3aXRoIGNvbXBvc2l0ZVxuICAgICAgICAvLyBvcGVyYXRpb24gYWJvdmUgMSBhbmQgMi5cbiAgICAgICAgZHJhd0NvbnRleHQuY2xpcCgpO1xuICAgICAgICBkcmF3Q29udGV4dC5jbGVhclJlY3QoMCwgMCwgMjc3LCAyMDApO1xuXG4gICAgICAgIC8vIFJlc3RvcmUgdGhlIHByZXZpb3VzIGNvbnRleHQgc3RhdGUuXG4gICAgICAgIGRyYXdDb250ZXh0LnJlc3RvcmUoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2xvbmVzIHRoZSBnaXZlbiBjYW52YXMuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHRoZSBuZXcgY2xvbmVkIGNhbnZhcy5cbiAgICAgKi9cbiAgICBteS5jbG9uZUNhbnZhcyA9IGZ1bmN0aW9uIChvbGRDYW52YXMpIHtcbiAgICAgICAgLypcbiAgICAgICAgICogRklYTUUgVGVzdGluZyBoYXMgc2hvd24gdGhhdCBvbGRDYW52YXMgbWF5IG5vdCBleGlzdC4gSW4gc3VjaCBhIGNhc2UsXG4gICAgICAgICAqIHRoZSBtZXRob2QgQ2FudmFzVXRpbC5jbG9uZUNhbnZhcyBtYXkgdGhyb3cgYW4gZXJyb3IuIFNpbmNlIGF1ZGlvXG4gICAgICAgICAqIGxldmVscyBhcmUgZnJlcXVlbnRseSB1cGRhdGVkLCB0aGUgZXJyb3JzIGhhdmUgYmVlbiBvYnNlcnZlZCB0byBwaWxlXG4gICAgICAgICAqIGludG8gdGhlIGNvbnNvbGUsIHN0cmFpbiB0aGUgQ1BVLlxuICAgICAgICAgKi9cbiAgICAgICAgaWYgKCFvbGRDYW52YXMpXG4gICAgICAgICAgICByZXR1cm4gb2xkQ2FudmFzO1xuXG4gICAgICAgIC8vY3JlYXRlIGEgbmV3IGNhbnZhc1xuICAgICAgICB2YXIgbmV3Q2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgIHZhciBjb250ZXh0ID0gbmV3Q2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbiAgICAgICAgLy9zZXQgZGltZW5zaW9uc1xuICAgICAgICBuZXdDYW52YXMud2lkdGggPSBvbGRDYW52YXMud2lkdGg7XG4gICAgICAgIG5ld0NhbnZhcy5oZWlnaHQgPSBvbGRDYW52YXMuaGVpZ2h0O1xuXG4gICAgICAgIC8vYXBwbHkgdGhlIG9sZCBjYW52YXMgdG8gdGhlIG5ldyBvbmVcbiAgICAgICAgY29udGV4dC5kcmF3SW1hZ2Uob2xkQ2FudmFzLCAwLCAwKTtcblxuICAgICAgICAvL3JldHVybiB0aGUgbmV3IGNhbnZhc1xuICAgICAgICByZXR1cm4gbmV3Q2FudmFzO1xuICAgIH07XG5cbiAgICByZXR1cm4gbXk7XG59KShDYW52YXNVdGlsIHx8IHt9KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYW52YXNVdGlsO1xuIiwiLyogZ2xvYmFsICQsIFV0aWwsIGNvbm5lY3Rpb24sIG5pY2tuYW1lOnRydWUsIGdldFZpZGVvU2l6ZSwgZ2V0VmlkZW9Qb3NpdGlvbiwgc2hvd1Rvb2xiYXIsIHByb2Nlc3NSZXBsYWNlbWVudHMgKi9cbnZhciBSZXBsYWNlbWVudCA9IHJlcXVpcmUoXCIuL1JlcGxhY2VtZW50LmpzXCIpO1xudmFyIGRlcCA9IHtcbiAgICBcIlZpZGVvTGF5b3V0XCI6IGZ1bmN0aW9uKCl7IHJldHVybiByZXF1aXJlKFwiLi4vVmlkZW9MYXlvdXRcIil9LFxuICAgIFwiVG9vbGJhclwiOiBmdW5jdGlvbigpe3JldHVybiByZXF1aXJlKFwiLi4vdG9vbGJhcnMvVG9vbGJhclwiKX1cbn07XG4vKipcbiAqIENoYXQgcmVsYXRlZCB1c2VyIGludGVyZmFjZS5cbiAqL1xudmFyIENoYXQgPSAoZnVuY3Rpb24gKG15KSB7XG4gICAgdmFyIG5vdGlmaWNhdGlvbkludGVydmFsID0gZmFsc2U7XG4gICAgdmFyIHVucmVhZE1lc3NhZ2VzID0gMDtcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIGNoYXQgcmVsYXRlZCBpbnRlcmZhY2UuXG4gICAgICovXG4gICAgbXkuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHN0b3JlZERpc3BsYXlOYW1lID0gd2luZG93LmxvY2FsU3RvcmFnZS5kaXNwbGF5bmFtZTtcbiAgICAgICAgaWYgKHN0b3JlZERpc3BsYXlOYW1lKSB7XG4gICAgICAgICAgICBuaWNrbmFtZSA9IHN0b3JlZERpc3BsYXlOYW1lO1xuXG4gICAgICAgICAgICBDaGF0LnNldENoYXRDb252ZXJzYXRpb25Nb2RlKHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgJCgnI25pY2tpbnB1dCcpLmtleWRvd24oZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHZhciB2YWwgPSBVdGlsLmVzY2FwZUh0bWwodGhpcy52YWx1ZSk7XG4gICAgICAgICAgICAgICAgdGhpcy52YWx1ZSA9ICcnO1xuICAgICAgICAgICAgICAgIGlmICghbmlja25hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbmlja25hbWUgPSB2YWw7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UuZGlzcGxheW5hbWUgPSBuaWNrbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgLy90aGlzIHNob3VsZCBiZSBjaGFuZ2VkXG4gICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Yy5hZGREaXNwbGF5TmFtZVRvUHJlc2VuY2Uobmlja25hbWUpO1xuICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuc2VuZFByZXNlbmNlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgQ2hhdC5zZXRDaGF0Q29udmVyc2F0aW9uTW9kZSh0cnVlKTtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkKCcjdXNlcm1zZycpLmtleWRvd24oZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IHRoaXMudmFsdWU7XG4gICAgICAgICAgICAgICAgJCgnI3VzZXJtc2cnKS52YWwoJycpLnRyaWdnZXIoJ2F1dG9zaXplLnJlc2l6ZScpO1xuICAgICAgICAgICAgICAgIHRoaXMuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICB2YXIgY29tbWFuZCA9IG5ldyBDb21tYW5kc1Byb2Nlc3Nvcih2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYoY29tbWFuZC5pc0NvbW1hbmQoKSlcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmQucHJvY2Vzc0NvbW1hbmQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgLy90aGlzIHNob3VsZCBiZSBjaGFuZ2VkXG4gICAgICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlID0gVXRpbC5lc2NhcGVIdG1sKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgY29ubmVjdGlvbi5lbXVjLnNlbmRNZXNzYWdlKG1lc3NhZ2UsIG5pY2tuYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBvblRleHRBcmVhUmVzaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmVzaXplQ2hhdENvbnZlcnNhdGlvbigpO1xuICAgICAgICAgICAgc2Nyb2xsQ2hhdFRvQm90dG9tKCk7XG4gICAgICAgIH07XG4gICAgICAgICQoJyN1c2VybXNnJykuYXV0b3NpemUoe2NhbGxiYWNrOiBvblRleHRBcmVhUmVzaXplfSk7XG5cbiAgICAgICAgJChcIiNjaGF0c3BhY2VcIikuYmluZChcInNob3duXCIsXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2Nyb2xsQ2hhdFRvQm90dG9tKCk7XG4gICAgICAgICAgICAgICAgdW5yZWFkTWVzc2FnZXMgPSAwO1xuICAgICAgICAgICAgICAgIHNldFZpc3VhbE5vdGlmaWNhdGlvbihmYWxzZSk7XG4gICAgICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQXBwZW5kcyB0aGUgZ2l2ZW4gbWVzc2FnZSB0byB0aGUgY2hhdCBjb252ZXJzYXRpb24uXG4gICAgICovXG4gICAgbXkudXBkYXRlQ2hhdENvbnZlcnNhdGlvbiA9IGZ1bmN0aW9uIChmcm9tLCBkaXNwbGF5TmFtZSwgbWVzc2FnZSkge1xuICAgICAgICB2YXIgZGl2Q2xhc3NOYW1lID0gJyc7XG5cbiAgICAgICAgaWYgKGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQgPT09IGZyb20pIHtcbiAgICAgICAgICAgIGRpdkNsYXNzTmFtZSA9IFwibG9jYWx1c2VyXCI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkaXZDbGFzc05hbWUgPSBcInJlbW90ZXVzZXJcIjtcblxuICAgICAgICAgICAgaWYgKCFDaGF0LmlzVmlzaWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgdW5yZWFkTWVzc2FnZXMrKztcbiAgICAgICAgICAgICAgICBVdGlsLnBsYXlTb3VuZE5vdGlmaWNhdGlvbignY2hhdE5vdGlmaWNhdGlvbicpO1xuICAgICAgICAgICAgICAgIHNldFZpc3VhbE5vdGlmaWNhdGlvbih0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vcmVwbGFjZSBsaW5rcyBhbmQgc21pbGV5c1xuICAgICAgICB2YXIgZXNjTWVzc2FnZSA9IFV0aWwuZXNjYXBlSHRtbChtZXNzYWdlKTtcbiAgICAgICAgdmFyIGVzY0Rpc3BsYXlOYW1lID0gVXRpbC5lc2NhcGVIdG1sKGRpc3BsYXlOYW1lKTtcbiAgICAgICAgbWVzc2FnZSA9IFJlcGxhY2VtZW50LnByb2Nlc3NSZXBsYWNlbWVudHMoZXNjTWVzc2FnZSk7XG5cbiAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKS5hcHBlbmQoJzxkaXYgY2xhc3M9XCInICsgZGl2Q2xhc3NOYW1lICsgJ1wiPjxiPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlc2NEaXNwbGF5TmFtZSArICc6IDwvYj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSArICc8L2Rpdj4nKTtcbiAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKS5hbmltYXRlKFxuICAgICAgICAgICAgICAgIHsgc2Nyb2xsVG9wOiAkKCcjY2hhdGNvbnZlcnNhdGlvbicpWzBdLnNjcm9sbEhlaWdodH0sIDEwMDApO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBcHBlbmRzIGVycm9yIG1lc3NhZ2UgdG8gdGhlIGNvbnZlcnNhdGlvblxuICAgICAqIEBwYXJhbSBlcnJvck1lc3NhZ2UgdGhlIHJlY2VpdmVkIGVycm9yIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIG9yaWdpbmFsVGV4dCB0aGUgb3JpZ2luYWwgbWVzc2FnZS5cbiAgICAgKi9cbiAgICBteS5jaGF0QWRkRXJyb3IgPSBmdW5jdGlvbihlcnJvck1lc3NhZ2UsIG9yaWdpbmFsVGV4dClcbiAgICB7XG4gICAgICAgIGVycm9yTWVzc2FnZSA9IFV0aWwuZXNjYXBlSHRtbChlcnJvck1lc3NhZ2UpO1xuICAgICAgICBvcmlnaW5hbFRleHQgPSBVdGlsLmVzY2FwZUh0bWwob3JpZ2luYWxUZXh0KTtcblxuICAgICAgICAkKCcjY2hhdGNvbnZlcnNhdGlvbicpLmFwcGVuZCgnPGRpdiBjbGFzcz1cImVycm9yTWVzc2FnZVwiPjxiPkVycm9yOiA8L2I+J1xuICAgICAgICAgICAgKyAnWW91ciBtZXNzYWdlJyArIChvcmlnaW5hbFRleHQ/ICgnIFxcXCInKyBvcmlnaW5hbFRleHQgKyAnXFxcIicpIDogXCJcIilcbiAgICAgICAgICAgICsgJyB3YXMgbm90IHNlbnQuJyArIChlcnJvck1lc3NhZ2U/ICgnIFJlYXNvbjogJyArIGVycm9yTWVzc2FnZSkgOiAnJylcbiAgICAgICAgICAgICsgICc8L2Rpdj4nKTtcbiAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKS5hbmltYXRlKFxuICAgICAgICAgICAgeyBzY3JvbGxUb3A6ICQoJyNjaGF0Y29udmVyc2F0aW9uJylbMF0uc2Nyb2xsSGVpZ2h0fSwgMTAwMCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIHN1YmplY3QgdG8gdGhlIFVJXG4gICAgICogQHBhcmFtIHN1YmplY3QgdGhlIHN1YmplY3RcbiAgICAgKi9cbiAgICBteS5jaGF0U2V0U3ViamVjdCA9IGZ1bmN0aW9uKHN1YmplY3QpXG4gICAge1xuICAgICAgICBpZihzdWJqZWN0KVxuICAgICAgICAgICAgc3ViamVjdCA9IHN1YmplY3QudHJpbSgpO1xuICAgICAgICAkKCcjc3ViamVjdCcpLmh0bWwoUmVwbGFjZW1lbnQubGlua2lmeShVdGlsLmVzY2FwZUh0bWwoc3ViamVjdCkpKTtcbiAgICAgICAgaWYoc3ViamVjdCA9PSBcIlwiKVxuICAgICAgICB7XG4gICAgICAgICAgICAkKFwiI3N1YmplY3RcIikuY3NzKHtkaXNwbGF5OiBcIm5vbmVcIn0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAge1xuICAgICAgICAgICAgJChcIiNzdWJqZWN0XCIpLmNzcyh7ZGlzcGxheTogXCJibG9ja1wifSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogT3BlbnMgLyBjbG9zZXMgdGhlIGNoYXQgYXJlYS5cbiAgICAgKi9cbiAgICBteS50b2dnbGVDaGF0ID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHZhciBjaGF0c3BhY2UgPSAkKCcjY2hhdHNwYWNlJyk7XG5cbiAgICAgICAgdmFyIGNoYXRTaXplID0gKGNoYXRzcGFjZS5pcyhcIjp2aXNpYmxlXCIpKSA/IFswLCAwXSA6IENoYXQuZ2V0Q2hhdFNpemUoKTtcbiAgICAgICAgZGVwLlZpZGVvTGF5b3V0KCkucmVzaXplVmlkZW9TcGFjZShjaGF0c3BhY2UsIGNoYXRTaXplLCBjaGF0c3BhY2UuaXMoXCI6dmlzaWJsZVwiKSk7XG5cbiAgICAgICAgLy8gRml4IG1lOiBTaG91bGQgYmUgY2FsbGVkIGFzIGNhbGxiYWNrIG9mIHNob3cgYW5pbWF0aW9uXG5cbiAgICAgICAgLy8gUmVxdWVzdCB0aGUgZm9jdXMgaW4gdGhlIG5pY2tuYW1lIGZpZWxkIG9yIHRoZSBjaGF0IGlucHV0IGZpZWxkLlxuICAgICAgICBpZiAoJCgnI25pY2tuYW1lJykuY3NzKCd2aXNpYmlsaXR5JykgPT09ICd2aXNpYmxlJykge1xuICAgICAgICAgICAgJCgnI25pY2tpbnB1dCcpLmZvY3VzKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjdXNlcm1zZycpLmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgY2hhdCBjb252ZXJzYXRpb24gbW9kZS5cbiAgICAgKi9cbiAgICBteS5zZXRDaGF0Q29udmVyc2F0aW9uTW9kZSA9IGZ1bmN0aW9uIChpc0NvbnZlcnNhdGlvbk1vZGUpIHtcbiAgICAgICAgaWYgKGlzQ29udmVyc2F0aW9uTW9kZSkge1xuICAgICAgICAgICAgJCgnI25pY2tuYW1lJykuY3NzKHt2aXNpYmlsaXR5OiAnaGlkZGVuJ30pO1xuICAgICAgICAgICAgJCgnI2NoYXRjb252ZXJzYXRpb24nKS5jc3Moe3Zpc2liaWxpdHk6ICd2aXNpYmxlJ30pO1xuICAgICAgICAgICAgJCgnI3VzZXJtc2cnKS5jc3Moe3Zpc2liaWxpdHk6ICd2aXNpYmxlJ30pO1xuICAgICAgICAgICAgJCgnI3VzZXJtc2cnKS5mb2N1cygpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlc2l6ZXMgdGhlIGNoYXQgYXJlYS5cbiAgICAgKi9cbiAgICBteS5yZXNpemVDaGF0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY2hhdFNpemUgPSBDaGF0LmdldENoYXRTaXplKCk7XG5cbiAgICAgICAgJCgnI2NoYXRzcGFjZScpLndpZHRoKGNoYXRTaXplWzBdKTtcbiAgICAgICAgJCgnI2NoYXRzcGFjZScpLmhlaWdodChjaGF0U2l6ZVsxXSk7XG5cbiAgICAgICAgcmVzaXplQ2hhdENvbnZlcnNhdGlvbigpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBzaXplIG9mIHRoZSBjaGF0LlxuICAgICAqL1xuICAgIG15LmdldENoYXRTaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYXZhaWxhYmxlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICB2YXIgYXZhaWxhYmxlV2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aDtcblxuICAgICAgICB2YXIgY2hhdFdpZHRoID0gMjAwO1xuICAgICAgICBpZiAoYXZhaWxhYmxlV2lkdGggKiAwLjIgPCAyMDApXG4gICAgICAgICAgICBjaGF0V2lkdGggPSBhdmFpbGFibGVXaWR0aCAqIDAuMjtcblxuICAgICAgICByZXR1cm4gW2NoYXRXaWR0aCwgYXZhaWxhYmxlSGVpZ2h0XTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSW5kaWNhdGVzIGlmIHRoZSBjaGF0IGlzIGN1cnJlbnRseSB2aXNpYmxlLlxuICAgICAqL1xuICAgIG15LmlzVmlzaWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICQoJyNjaGF0c3BhY2UnKS5pcyhcIjp2aXNpYmxlXCIpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXNpemVzIHRoZSBjaGF0IGNvbnZlcnNhdGlvbi5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiByZXNpemVDaGF0Q29udmVyc2F0aW9uKCkge1xuICAgICAgICB2YXIgdXNlcm1zZ1N0eWxlSGVpZ2h0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ1c2VybXNnXCIpLnN0eWxlLmhlaWdodDtcbiAgICAgICAgdmFyIHVzZXJtc2dIZWlnaHQgPSB1c2VybXNnU3R5bGVIZWlnaHRcbiAgICAgICAgICAgIC5zdWJzdHJpbmcoMCwgdXNlcm1zZ1N0eWxlSGVpZ2h0LmluZGV4T2YoJ3B4JykpO1xuXG4gICAgICAgICQoJyN1c2VybXNnJykud2lkdGgoJCgnI2NoYXRzcGFjZScpLndpZHRoKCkgLSAxMCk7XG4gICAgICAgICQoJyNjaGF0Y29udmVyc2F0aW9uJykud2lkdGgoJCgnI2NoYXRzcGFjZScpLndpZHRoKCkgLSAxMCk7XG4gICAgICAgICQoJyNjaGF0Y29udmVyc2F0aW9uJylcbiAgICAgICAgICAgIC5oZWlnaHQod2luZG93LmlubmVySGVpZ2h0IC0gMTAgLSBwYXJzZUludCh1c2VybXNnSGVpZ2h0KSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2hvd3MvaGlkZXMgYSB2aXN1YWwgbm90aWZpY2F0aW9uLCBpbmRpY2F0aW5nIHRoYXQgYSBtZXNzYWdlIGhhcyBhcnJpdmVkLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNldFZpc3VhbE5vdGlmaWNhdGlvbihzaG93KSB7XG4gICAgICAgIHZhciB1bnJlYWRNc2dFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3VucmVhZE1lc3NhZ2VzJyk7XG5cbiAgICAgICAgdmFyIGdsb3dlciA9ICQoJyNjaGF0QnV0dG9uJyk7XG5cbiAgICAgICAgaWYgKHVucmVhZE1lc3NhZ2VzKSB7XG4gICAgICAgICAgICB1bnJlYWRNc2dFbGVtZW50LmlubmVySFRNTCA9IHVucmVhZE1lc3NhZ2VzLnRvU3RyaW5nKCk7XG5cbiAgICAgICAgICAgIGRlcC5Ub29sYmFyKCkuZG9ja1Rvb2xiYXIodHJ1ZSk7XG5cbiAgICAgICAgICAgIHZhciBjaGF0QnV0dG9uRWxlbWVudFxuICAgICAgICAgICAgICAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NoYXRCdXR0b24nKS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgdmFyIGxlZnRJbmRlbnQgPSAoVXRpbC5nZXRUZXh0V2lkdGgoY2hhdEJ1dHRvbkVsZW1lbnQpIC1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFV0aWwuZ2V0VGV4dFdpZHRoKHVucmVhZE1zZ0VsZW1lbnQpKSAvIDI7XG4gICAgICAgICAgICB2YXIgdG9wSW5kZW50ID0gKFV0aWwuZ2V0VGV4dEhlaWdodChjaGF0QnV0dG9uRWxlbWVudCkgLVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBVdGlsLmdldFRleHRIZWlnaHQodW5yZWFkTXNnRWxlbWVudCkpIC8gMiAtIDM7XG5cbiAgICAgICAgICAgIHVucmVhZE1zZ0VsZW1lbnQuc2V0QXR0cmlidXRlKFxuICAgICAgICAgICAgICAgICAgICAnc3R5bGUnLFxuICAgICAgICAgICAgICAgICAgICAndG9wOicgKyB0b3BJbmRlbnQgK1xuICAgICAgICAgICAgICAgICAgICAnOyBsZWZ0OicgKyBsZWZ0SW5kZW50ICsgJzsnKTtcblxuICAgICAgICAgICAgaWYgKCFnbG93ZXIuaGFzQ2xhc3MoJ2ljb24tY2hhdC1zaW1wbGUnKSkge1xuICAgICAgICAgICAgICAgIGdsb3dlci5yZW1vdmVDbGFzcygnaWNvbi1jaGF0Jyk7XG4gICAgICAgICAgICAgICAgZ2xvd2VyLmFkZENsYXNzKCdpY29uLWNoYXQtc2ltcGxlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB1bnJlYWRNc2dFbGVtZW50LmlubmVySFRNTCA9ICcnO1xuICAgICAgICAgICAgZ2xvd2VyLnJlbW92ZUNsYXNzKCdpY29uLWNoYXQtc2ltcGxlJyk7XG4gICAgICAgICAgICBnbG93ZXIuYWRkQ2xhc3MoJ2ljb24tY2hhdCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNob3cgJiYgIW5vdGlmaWNhdGlvbkludGVydmFsKSB7XG4gICAgICAgICAgICBub3RpZmljYXRpb25JbnRlcnZhbCA9IHdpbmRvdy5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgZ2xvd2VyLnRvZ2dsZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH0sIDgwMCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIXNob3cgJiYgbm90aWZpY2F0aW9uSW50ZXJ2YWwpIHtcbiAgICAgICAgICAgIHdpbmRvdy5jbGVhckludGVydmFsKG5vdGlmaWNhdGlvbkludGVydmFsKTtcbiAgICAgICAgICAgIG5vdGlmaWNhdGlvbkludGVydmFsID0gZmFsc2U7XG4gICAgICAgICAgICBnbG93ZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2Nyb2xscyBjaGF0IHRvIHRoZSBib3R0b20uXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2Nyb2xsQ2hhdFRvQm90dG9tKCkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQoJyNjaGF0Y29udmVyc2F0aW9uJykuc2Nyb2xsVG9wKFxuICAgICAgICAgICAgICAgICAgICAkKCcjY2hhdGNvbnZlcnNhdGlvbicpWzBdLnNjcm9sbEhlaWdodCk7XG4gICAgICAgIH0sIDUpO1xuICAgIH1cblxuICAgIHJldHVybiBteTtcbn0oQ2hhdCB8fCB7fSkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENoYXQ7XG4iLCJcbnZhciBSZXBsYWNlbWVudCA9IGZ1bmN0aW9uKClcbntcbiAgICAvKipcbiAgICAgKiBSZXBsYWNlcyBjb21tb24gc21pbGV5IHN0cmluZ3Mgd2l0aCBpbWFnZXNcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzbWlsaWZ5KGJvZHkpXG4gICAge1xuICAgICAgICBpZighYm9keSlcbiAgICAgICAgICAgIHJldHVybiBib2R5O1xuXG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyg6XFwofDpcXChcXCh8Oi1cXChcXCh8Oi1cXCh8XFwoc2FkXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxKyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChhbmdyeVxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MisgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoblxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MysgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oOi1cXClcXCl8OlxcKVxcKXw7LVxcKVxcKXw7XFwpXFwpfFxcKGxvbFxcKXw6LUR8OkR8Oy1EfDtEKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXk0KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyg7LVxcKFxcKHw7XFwoXFwofDstXFwofDtcXCh8OidcXCh8OictXFwofDp+LVxcKHw6flxcKHxcXCh1cHNldFxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5NSsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oPDN8Jmx0OzN8XFwoTFxcKXxcXChsXFwpfFxcKEhcXCl8XFwoaFxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5NisgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoYW5nZWxcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTcrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKGJvbWJcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTgrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKGNodWNrbGVcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTkrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKHlcXCl8XFwoWVxcKXxcXChva1xcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MTArIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKDstXFwpfDtcXCl8Oi1cXCl8OlxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MTErIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKGJsdXNoXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxMisgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oOi1cXCp8OlxcKnxcXChraXNzXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxMysgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwoc2VhcmNoXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxNCsgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oXFwod2F2ZVxcKSkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MTUrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKFxcKGNsYXBcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTE2KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChzaWNrXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkxNysgXCI+XCIpO1xuICAgICAgICBib2R5ID0gYm9keS5yZXBsYWNlKC8oOi1QfDpQfDotcHw6cCkvZ2ksIFwiPGltZyBzcmM9XCIrc21pbGV5MTgrIFwiPlwiKTtcbiAgICAgICAgYm9keSA9IGJvZHkucmVwbGFjZSgvKDotXFwwfFxcKHNob2NrZWRcXCkpL2dpLCBcIjxpbWcgc3JjPVwiK3NtaWxleTE5KyBcIj5cIik7XG4gICAgICAgIGJvZHkgPSBib2R5LnJlcGxhY2UoLyhcXChvb3BzXFwpKS9naSwgXCI8aW1nIHNyYz1cIitzbWlsZXkyMCsgXCI+XCIpO1xuXG4gICAgICAgIHJldHVybiBib2R5O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIFJlcGxhY2VtZW50UHJvdG8oKSB7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQcm9jZXNzZXMgbGlua3MgYW5kIHNtaWxleXMgaW4gXCJib2R5XCJcbiAgICAgKi9cbiAgICBSZXBsYWNlbWVudFByb3RvLnByb2Nlc3NSZXBsYWNlbWVudHMgPSBmdW5jdGlvbihib2R5KVxuICAgIHtcbiAgICAgICAgLy9tYWtlIGxpbmtzIGNsaWNrYWJsZVxuICAgICAgICBib2R5ID0gUmVwbGFjZW1lbnRQcm90by5saW5raWZ5KGJvZHkpO1xuXG4gICAgICAgIC8vYWRkIHNtaWxleXNcbiAgICAgICAgYm9keSA9IHNtaWxpZnkoYm9keSk7XG5cbiAgICAgICAgcmV0dXJuIGJvZHk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmluZHMgYW5kIHJlcGxhY2VzIGFsbCBsaW5rcyBpbiB0aGUgbGlua3MgaW4gXCJib2R5XCJcbiAgICAgKiB3aXRoIHRoZWlyIDxhIGhyZWY9XCJcIj48L2E+XG4gICAgICovXG4gICAgUmVwbGFjZW1lbnRQcm90by5saW5raWZ5ID0gZnVuY3Rpb24oaW5wdXRUZXh0KVxuICAgIHtcbiAgICAgICAgdmFyIHJlcGxhY2VkVGV4dCwgcmVwbGFjZVBhdHRlcm4xLCByZXBsYWNlUGF0dGVybjIsIHJlcGxhY2VQYXR0ZXJuMztcblxuICAgICAgICAvL1VSTHMgc3RhcnRpbmcgd2l0aCBodHRwOi8vLCBodHRwczovLywgb3IgZnRwOi8vXG4gICAgICAgIHJlcGxhY2VQYXR0ZXJuMSA9IC8oXFxiKGh0dHBzP3xmdHApOlxcL1xcL1stQS1aMC05KyZAI1xcLyU/PX5ffCE6LC47XSpbLUEtWjAtOSsmQCNcXC8lPX5ffF0pL2dpbTtcbiAgICAgICAgcmVwbGFjZWRUZXh0ID0gaW5wdXRUZXh0LnJlcGxhY2UocmVwbGFjZVBhdHRlcm4xLCAnPGEgaHJlZj1cIiQxXCIgdGFyZ2V0PVwiX2JsYW5rXCI+JDE8L2E+Jyk7XG5cbiAgICAgICAgLy9VUkxzIHN0YXJ0aW5nIHdpdGggXCJ3d3cuXCIgKHdpdGhvdXQgLy8gYmVmb3JlIGl0LCBvciBpdCdkIHJlLWxpbmsgdGhlIG9uZXMgZG9uZSBhYm92ZSkuXG4gICAgICAgIHJlcGxhY2VQYXR0ZXJuMiA9IC8oXnxbXlxcL10pKHd3d1xcLltcXFNdKyhcXGJ8JCkpL2dpbTtcbiAgICAgICAgcmVwbGFjZWRUZXh0ID0gcmVwbGFjZWRUZXh0LnJlcGxhY2UocmVwbGFjZVBhdHRlcm4yLCAnJDE8YSBocmVmPVwiaHR0cDovLyQyXCIgdGFyZ2V0PVwiX2JsYW5rXCI+JDI8L2E+Jyk7XG5cbiAgICAgICAgLy9DaGFuZ2UgZW1haWwgYWRkcmVzc2VzIHRvIG1haWx0bzo6IGxpbmtzLlxuICAgICAgICByZXBsYWNlUGF0dGVybjMgPSAvKChbYS16QS1aMC05XFwtXFxfXFwuXSkrQFthLXpBLVpcXF9dKz8oXFwuW2EtekEtWl17Miw2fSkrKS9naW07XG4gICAgICAgIHJlcGxhY2VkVGV4dCA9IHJlcGxhY2VkVGV4dC5yZXBsYWNlKHJlcGxhY2VQYXR0ZXJuMywgJzxhIGhyZWY9XCJtYWlsdG86JDFcIj4kMTwvYT4nKTtcblxuICAgICAgICByZXR1cm4gcmVwbGFjZWRUZXh0O1xuICAgIH1cbiAgICByZXR1cm4gUmVwbGFjZW1lbnRQcm90bztcbn0oKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZXBsYWNlbWVudDtcblxuXG5cbiIsIi8qIGdsb2JhbCAkLCBjb25maWcsIFByZXppLCBVdGlsLCBjb25uZWN0aW9uLCBzZXRMYXJnZVZpZGVvVmlzaWJsZSwgZG9ja1Rvb2xiYXIgKi9cbnZhciBQcmV6aSA9IHJlcXVpcmUoXCIuLi9wcmV6aS9QcmV6aS5qc1wiKTtcbnZhciBVSVV0aWwgPSByZXF1aXJlKFwiLi4vVUlVdGlsLmpzXCIpO1xudmFyIFRvb2xiYXJUb2dnbGVyID0gcmVxdWlyZShcIi4uL3Rvb2xiYXJzL3Rvb2xiYXJfdG9nZ2xlclwiKTtcblxudmFyIEV0aGVycGFkID0gKGZ1bmN0aW9uIChteSkge1xuICAgIHZhciBldGhlcnBhZE5hbWUgPSBudWxsO1xuICAgIHZhciBldGhlcnBhZElGcmFtZSA9IG51bGw7XG4gICAgdmFyIGRvbWFpbiA9IG51bGw7XG4gICAgdmFyIG9wdGlvbnMgPSBcIj9zaG93Q29udHJvbHM9dHJ1ZSZzaG93Q2hhdD1mYWxzZSZzaG93TGluZU51bWJlcnM9dHJ1ZSZ1c2VNb25vc3BhY2VGb250PWZhbHNlXCI7XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgZXRoZXJwYWQuXG4gICAgICovXG4gICAgbXkuaW5pdCA9IGZ1bmN0aW9uIChuYW1lKSB7XG5cbiAgICAgICAgaWYgKGNvbmZpZy5ldGhlcnBhZF9iYXNlICYmICFldGhlcnBhZE5hbWUpIHtcblxuICAgICAgICAgICAgZG9tYWluID0gY29uZmlnLmV0aGVycGFkX2Jhc2U7XG5cbiAgICAgICAgICAgIGlmICghbmFtZSkge1xuICAgICAgICAgICAgICAgIC8vIEluIGNhc2Ugd2UncmUgdGhlIGZvY3VzIHdlIGdlbmVyYXRlIHRoZSBuYW1lLlxuICAgICAgICAgICAgICAgIGV0aGVycGFkTmFtZSA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdfJyArIChuZXcgRGF0ZSgpLmdldFRpbWUoKSkudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICBzaGFyZUV0aGVycGFkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgZXRoZXJwYWROYW1lID0gbmFtZTtcblxuICAgICAgICAgICAgZW5hYmxlRXRoZXJwYWRCdXR0b24oKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBPcGVucy9oaWRlcyB0aGUgRXRoZXJwYWQuXG4gICAgICovXG4gICAgbXkudG9nZ2xlRXRoZXJwYWQgPSBmdW5jdGlvbiAoaXNQcmVzZW50YXRpb24pIHtcbiAgICAgICAgaWYgKCFldGhlcnBhZElGcmFtZSlcbiAgICAgICAgICAgIGNyZWF0ZUlGcmFtZSgpO1xuXG4gICAgICAgIHZhciBsYXJnZVZpZGVvID0gbnVsbDtcbiAgICAgICAgaWYgKFByZXppLmlzUHJlc2VudGF0aW9uVmlzaWJsZSgpKVxuICAgICAgICAgICAgbGFyZ2VWaWRlbyA9ICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJyk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGxhcmdlVmlkZW8gPSAkKCcjbGFyZ2VWaWRlbycpO1xuXG4gICAgICAgIGlmICgkKCcjZXRoZXJwYWQ+aWZyYW1lJykuY3NzKCd2aXNpYmlsaXR5JykgPT09ICdoaWRkZW4nKSB7XG4gICAgICAgICAgICBsYXJnZVZpZGVvLmZhZGVPdXQoMzAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKFByZXppLmlzUHJlc2VudGF0aW9uVmlzaWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGxhcmdlVmlkZW8uY3NzKHtvcGFjaXR5OiAnMCd9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zZXRMYXJnZVZpZGVvVmlzaWJsZShmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIFRvb2xiYXJUb2dnbGVyLmRvY2tUb29sYmFyKHRydWUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICQoJyNldGhlcnBhZD5pZnJhbWUnKS5mYWRlSW4oMzAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuc3R5bGUuYmFja2dyb3VuZCA9ICcjZWVlZWVlJztcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V0aGVycGFkPmlmcmFtZScpLmNzcyh7dmlzaWJpbGl0eTogJ3Zpc2libGUnfSk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNldGhlcnBhZCcpLmNzcyh7ekluZGV4OiAyfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICgkKCcjZXRoZXJwYWQ+aWZyYW1lJykpIHtcbiAgICAgICAgICAgICQoJyNldGhlcnBhZD5pZnJhbWUnKS5mYWRlT3V0KDMwMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICQoJyNldGhlcnBhZD5pZnJhbWUnKS5jc3Moe3Zpc2liaWxpdHk6ICdoaWRkZW4nfSk7XG4gICAgICAgICAgICAgICAgJCgnI2V0aGVycGFkJykuY3NzKHt6SW5kZXg6IDB9KTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLmJhY2tncm91bmQgPSAnYmxhY2snO1xuICAgICAgICAgICAgICAgIGlmICghaXNQcmVzZW50YXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5mYWRlSW4oMzAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBWaWRlb0xheW91dC5zZXRMYXJnZVZpZGVvVmlzaWJsZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFRvb2xiYXJUb2dnbGVyLmRvY2tUb29sYmFyKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVzaXplKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlc2l6ZXMgdGhlIGV0aGVycGFkLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJlc2l6ZSgpIHtcbiAgICAgICAgaWYgKCQoJyNldGhlcnBhZD5pZnJhbWUnKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHZhciByZW1vdGVWaWRlb3MgPSAkKCcjcmVtb3RlVmlkZW9zJyk7XG4gICAgICAgICAgICB2YXIgYXZhaWxhYmxlSGVpZ2h0XG4gICAgICAgICAgICAgICAgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSByZW1vdGVWaWRlb3Mub3V0ZXJIZWlnaHQoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFVJVXRpbCk7XG4gICAgICAgICAgICB2YXIgYXZhaWxhYmxlV2lkdGggPSBVSVV0aWwuZ2V0QXZhaWxhYmxlVmlkZW9XaWR0aCgpO1xuXG4gICAgICAgICAgICAkKCcjZXRoZXJwYWQ+aWZyYW1lJykud2lkdGgoYXZhaWxhYmxlV2lkdGgpO1xuICAgICAgICAgICAgJCgnI2V0aGVycGFkPmlmcmFtZScpLmhlaWdodChhdmFpbGFibGVIZWlnaHQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2hhcmVzIHRoZSBFdGhlcnBhZCBuYW1lIHdpdGggb3RoZXIgcGFydGljaXBhbnRzLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNoYXJlRXRoZXJwYWQoKSB7XG4gICAgICAgIGNvbm5lY3Rpb24uZW11Yy5hZGRFdGhlcnBhZFRvUHJlc2VuY2UoZXRoZXJwYWROYW1lKTtcbiAgICAgICAgY29ubmVjdGlvbi5lbXVjLnNlbmRQcmVzZW5jZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgdGhlIEV0aGVycGFkIGJ1dHRvbiBhbmQgYWRkcyBpdCB0byB0aGUgdG9vbGJhci5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBlbmFibGVFdGhlcnBhZEJ1dHRvbigpIHtcbiAgICAgICAgaWYgKCEkKCcjZXRoZXJwYWRCdXR0b24nKS5pcyhcIjp2aXNpYmxlXCIpKVxuICAgICAgICAgICAgJCgnI2V0aGVycGFkQnV0dG9uJykuY3NzKHtkaXNwbGF5OiAnaW5saW5lLWJsb2NrJ30pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgdGhlIElGcmFtZSBmb3IgdGhlIGV0aGVycGFkLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZUlGcmFtZSgpIHtcbiAgICAgICAgZXRoZXJwYWRJRnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcbiAgICAgICAgZXRoZXJwYWRJRnJhbWUuc3JjID0gZG9tYWluICsgZXRoZXJwYWROYW1lICsgb3B0aW9ucztcbiAgICAgICAgZXRoZXJwYWRJRnJhbWUuZnJhbWVCb3JkZXIgPSAwO1xuICAgICAgICBldGhlcnBhZElGcmFtZS5zY3JvbGxpbmcgPSBcIm5vXCI7XG4gICAgICAgIGV0aGVycGFkSUZyYW1lLndpZHRoID0gJCgnI2xhcmdlVmlkZW9Db250YWluZXInKS53aWR0aCgpIHx8IDY0MDtcbiAgICAgICAgZXRoZXJwYWRJRnJhbWUuaGVpZ2h0ID0gJCgnI2xhcmdlVmlkZW9Db250YWluZXInKS5oZWlnaHQoKSB8fCA0ODA7XG4gICAgICAgIGV0aGVycGFkSUZyYW1lLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAndmlzaWJpbGl0eTogaGlkZGVuOycpO1xuXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdldGhlcnBhZCcpLmFwcGVuZENoaWxkKGV0aGVycGFkSUZyYW1lKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBPbiBFdGhlcnBhZCBhZGRlZCB0byBtdWMuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgnZXRoZXJwYWRhZGRlZC5tdWMnLCBmdW5jdGlvbiAoZXZlbnQsIGppZCwgZXRoZXJwYWROYW1lKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRXRoZXJwYWQgYWRkZWRcIiwgZXRoZXJwYWROYW1lKTtcbiAgICAgICAgaWYgKGNvbmZpZy5ldGhlcnBhZF9iYXNlICYmICFmb2N1cykge1xuICAgICAgICAgICAgRXRoZXJwYWQuaW5pdChldGhlcnBhZE5hbWUpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBPbiBmb2N1cyBjaGFuZ2VkIGV2ZW50LlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ2ZvY3VzZWNoYW5nZWQubXVjJywgZnVuY3Rpb24gKGV2ZW50LCBmb2N1cykge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkZvY3VzIGNoYW5nZWRcIik7XG4gICAgICAgIGlmIChjb25maWcuZXRoZXJwYWRfYmFzZSlcbiAgICAgICAgICAgIHNoYXJlRXRoZXJwYWQoKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIE9uIHZpZGVvIHNlbGVjdGVkIGV2ZW50LlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ3ZpZGVvLnNlbGVjdGVkJywgZnVuY3Rpb24gKGV2ZW50LCBpc1ByZXNlbnRhdGlvbikge1xuICAgICAgICBpZiAoIWNvbmZpZy5ldGhlcnBhZF9iYXNlKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIGlmIChldGhlcnBhZElGcmFtZSAmJiBldGhlcnBhZElGcmFtZS5zdHlsZS52aXNpYmlsaXR5ICE9PSAnaGlkZGVuJylcbiAgICAgICAgICAgIEV0aGVycGFkLnRvZ2dsZUV0aGVycGFkKGlzUHJlc2VudGF0aW9uKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFJlc2l6ZXMgdGhlIGV0aGVycGFkLCB3aGVuIHRoZSB3aW5kb3cgaXMgcmVzaXplZC5cbiAgICAgKi9cbiAgICAkKHdpbmRvdykucmVzaXplKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmVzaXplKCk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbXk7XG59KEV0aGVycGFkIHx8IHt9KSk7XG5cbm1vZHVsZS5leHBvcnRzID0gRXRoZXJwYWQ7XG4iLCJ2YXIgQm90dG9tVG9vbGJhciA9IHJlcXVpcmUoXCIuL3Rvb2xiYXJzL0JvdHRvbVRvb2xiYXJcIik7XG5cbnZhciBLZXlib2FyZFNob3J0Y3V0ID0gKGZ1bmN0aW9uKG15KSB7XG4gICAgLy9tYXBzIGtleWNvZGUgdG8gY2hhcmFjdGVyLCBpZCBvZiBwb3BvdmVyIGZvciBnaXZlbiBmdW5jdGlvbiBhbmQgZnVuY3Rpb25cbiAgICB2YXIgc2hvcnRjdXRzID0ge1xuICAgICAgICA2Nzoge1xuICAgICAgICAgICAgY2hhcmFjdGVyOiBcIkNcIixcbiAgICAgICAgICAgIGlkOiBcInRvZ2dsZUNoYXRQb3BvdmVyXCIsXG4gICAgICAgICAgICBmdW5jdGlvbjogQm90dG9tVG9vbGJhci50b2dnbGVDaGF0XG4gICAgICAgIH0sXG4gICAgICAgIDcwOiB7XG4gICAgICAgICAgICBjaGFyYWN0ZXI6IFwiRlwiLFxuICAgICAgICAgICAgaWQ6IFwiZmlsbXN0cmlwUG9wb3ZlclwiLFxuICAgICAgICAgICAgZnVuY3Rpb246IEJvdHRvbVRvb2xiYXIudG9nZ2xlRmlsbVN0cmlwXG4gICAgICAgIH0sXG4gICAgICAgIDc3OiB7XG4gICAgICAgICAgICBjaGFyYWN0ZXI6IFwiTVwiLFxuICAgICAgICAgICAgaWQ6IFwibXV0ZVBvcG92ZXJcIixcbiAgICAgICAgICAgIGZ1bmN0aW9uOiB0b2dnbGVBdWRpb1xuICAgICAgICB9LFxuICAgICAgICA4NDoge1xuICAgICAgICAgICAgY2hhcmFjdGVyOiBcIlRcIixcbiAgICAgICAgICAgIGZ1bmN0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZighaXNBdWRpb011dGVkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9nZ2xlQXVkaW8oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIDg2OiB7XG4gICAgICAgICAgICBjaGFyYWN0ZXI6IFwiVlwiLFxuICAgICAgICAgICAgaWQ6IFwidG9nZ2xlVmlkZW9Qb3BvdmVyXCIsXG4gICAgICAgICAgICBmdW5jdGlvbjogdG9nZ2xlVmlkZW9cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB3aW5kb3cub25rZXl1cCA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYoISgkKFwiOmZvY3VzXCIpLmlzKFwiaW5wdXRbdHlwZT10ZXh0XVwiKSB8fCAkKFwiOmZvY3VzXCIpLmlzKFwidGV4dGFyZWFcIikpKSB7XG4gICAgICAgICAgICB2YXIga2V5Y29kZSA9IGUud2hpY2g7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHNob3J0Y3V0c1trZXljb2RlXSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgIHNob3J0Y3V0c1trZXljb2RlXS5mdW5jdGlvbigpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChrZXljb2RlID49IFwiMFwiLmNoYXJDb2RlQXQoMCkgJiYga2V5Y29kZSA8PSBcIjlcIi5jaGFyQ29kZUF0KDApKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlbW90ZVZpZGVvcyA9ICQoXCIudmlkZW9jb250YWluZXI6bm90KCNtaXhlZHN0cmVhbSlcIiksXG4gICAgICAgICAgICAgICAgICAgIHZpZGVvV2FudGVkID0ga2V5Y29kZSAtIFwiMFwiLmNoYXJDb2RlQXQoMCkgKyAxO1xuICAgICAgICAgICAgICAgIGlmIChyZW1vdGVWaWRlb3MubGVuZ3RoID4gdmlkZW9XYW50ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVtb3RlVmlkZW9zW3ZpZGVvV2FudGVkXS5jbGljaygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB3aW5kb3cub25rZXlkb3duID0gZnVuY3Rpb24oZSkge1xuICAgICAgICBpZigkKFwiI2NoYXRzcGFjZVwiKS5jc3MoXCJkaXNwbGF5XCIpID09PSBcIm5vbmVcIikge1xuICAgICAgICAgICAgaWYoZS53aGljaCA9PT0gXCJUXCIuY2hhckNvZGVBdCgwKSkge1xuICAgICAgICAgICAgICAgIGlmKGlzQXVkaW9NdXRlZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvZ2dsZUF1ZGlvKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiAgXG4gICAgICogQHBhcmFtIGlkIGluZGljYXRlcyB0aGUgcG9wb3ZlciBhc3NvY2lhdGVkIHdpdGggdGhlIHNob3J0Y3V0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gdGhlIGtleWJvYXJkIHNob3J0Y3V0IHVzZWQgZm9yIHRoZSBpZCBnaXZlblxuICAgICAqL1xuICAgIG15LmdldFNob3J0Y3V0ID0gZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgZm9yKHZhciBrZXljb2RlIGluIHNob3J0Y3V0cykge1xuICAgICAgICAgICAgaWYoc2hvcnRjdXRzLmhhc093blByb3BlcnR5KGtleWNvZGUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNob3J0Y3V0c1trZXljb2RlXS5pZCA9PT0gaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiIChcIiArIHNob3J0Y3V0c1trZXljb2RlXS5jaGFyYWN0ZXIgKyBcIilcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfTtcblxuICAgIG15LmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICQoJ2JvZHknKS5wb3BvdmVyKHsgc2VsZWN0b3I6ICdbZGF0YS10b2dnbGU9cG9wb3Zlcl0nLFxuICAgICAgICAgICAgdHJpZ2dlcjogJ2NsaWNrIGhvdmVyJyxcbiAgICAgICAgICAgIGNvbnRlbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZShcImNvbnRlbnRcIikgK1xuICAgICAgICAgICAgICAgICAgICBLZXlib2FyZFNob3J0Y3V0LmdldFNob3J0Y3V0KHRoaXMuZ2V0QXR0cmlidXRlKFwic2hvcnRjdXRcIikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG15O1xufShLZXlib2FyZFNob3J0Y3V0IHx8IHt9KSk7XG5cbm1vZHVsZS5leHBvcnRzID0gS2V5Ym9hcmRTaG9ydGN1dDtcbiIsInZhciBQcmV6aVBsYXllciA9IHJlcXVpcmUoXCIuL1ByZXppUGxheWVyLmpzXCIpO1xudmFyIFVJVXRpbCA9IHJlcXVpcmUoXCIuLi9VSVV0aWwuanNcIik7XG52YXIgVG9vbGJhclRvZ2dsZXIgPSByZXF1aXJlKFwiLi4vdG9vbGJhcnMvdG9vbGJhcl90b2dnbGVyXCIpO1xuXG52YXIgUHJlemkgPSAoZnVuY3Rpb24gKG15KSB7XG4gICAgdmFyIHByZXppUGxheWVyID0gbnVsbDtcblxuICAgIC8qKlxuICAgICAqIFJlbG9hZHMgdGhlIGN1cnJlbnQgcHJlc2VudGF0aW9uLlxuICAgICAqL1xuICAgIG15LnJlbG9hZFByZXNlbnRhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgaWZyYW1lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQocHJlemlQbGF5ZXIub3B0aW9ucy5wcmV6aUlkKTtcbiAgICAgICAgaWZyYW1lLnNyYyA9IGlmcmFtZS5zcmM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3dzL2hpZGVzIGEgcHJlc2VudGF0aW9uLlxuICAgICAqL1xuICAgIG15LnNldFByZXNlbnRhdGlvblZpc2libGUgPSBmdW5jdGlvbiAodmlzaWJsZSkge1xuICAgICAgICBpZiAodmlzaWJsZSkge1xuICAgICAgICAgICAgLy8gVHJpZ2dlciB0aGUgdmlkZW8uc2VsZWN0ZWQgZXZlbnQgdG8gaW5kaWNhdGUgYSBjaGFuZ2UgaW4gdGhlXG4gICAgICAgICAgICAvLyBsYXJnZSB2aWRlby5cbiAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoXCJ2aWRlby5zZWxlY3RlZFwiLCBbdHJ1ZV0pO1xuXG4gICAgICAgICAgICAkKCcjbGFyZ2VWaWRlbycpLmZhZGVPdXQoMzAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgVmlkZW9MYXlvdXQuc2V0TGFyZ2VWaWRlb1Zpc2libGUoZmFsc2UpO1xuICAgICAgICAgICAgICAgICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykuZmFkZUluKDMwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykuY3NzKHtvcGFjaXR5OicxJ30pO1xuICAgICAgICAgICAgICAgICAgICBUb29sYmFyVG9nZ2xlci5kb2NrVG9vbGJhcih0cnVlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKCQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykuY3NzKCdvcGFjaXR5JykgPT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS5mYWRlT3V0KDMwMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLmNzcyh7b3BhY2l0eTonMCd9KTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI3JlbG9hZFByZXNlbnRhdGlvbicpLmNzcyh7ZGlzcGxheTonbm9uZSd9KTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2xhcmdlVmlkZW8nKS5mYWRlSW4oMzAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFZpZGVvTGF5b3V0LnNldExhcmdlVmlkZW9WaXNpYmxlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgVG9vbGJhclRvZ2dsZXIuZG9ja1Rvb2xiYXIoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIDx0dD50cnVlPC90dD4gaWYgdGhlIHByZXNlbnRhdGlvbiBpcyB2aXNpYmxlLCA8dHQ+ZmFsc2U8L3R0PiAtXG4gICAgICogb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIG15LmlzUHJlc2VudGF0aW9uVmlzaWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICgkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpICE9IG51bGxcbiAgICAgICAgICAgICAgICAmJiAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLmNzcygnb3BhY2l0eScpID09IDEpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBPcGVucyB0aGUgUHJlemkgZGlhbG9nLCBmcm9tIHdoaWNoIHRoZSB1c2VyIGNvdWxkIGNob29zZSBhIHByZXNlbnRhdGlvblxuICAgICAqIHRvIGxvYWQuXG4gICAgICovXG4gICAgbXkub3BlblByZXppRGlhbG9nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBteXByZXppID0gY29ubmVjdGlvbi5lbXVjLmdldFByZXppKGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQpO1xuICAgICAgICBpZiAobXlwcmV6aSkge1xuICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIub3BlblR3b0J1dHRvbkRpYWxvZyhcIlJlbW92ZSBQcmV6aVwiLFxuICAgICAgICAgICAgICAgIFwiQXJlIHlvdSBzdXJlIHlvdSB3b3VsZCBsaWtlIHRvIHJlbW92ZSB5b3VyIFByZXppP1wiLFxuICAgICAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgICAgIFwiUmVtb3ZlXCIsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oZSx2LG0sZikge1xuICAgICAgICAgICAgICAgICAgICBpZih2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMucmVtb3ZlUHJlemlGcm9tUHJlc2VuY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Yy5zZW5kUHJlc2VuY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocHJlemlQbGF5ZXIgIT0gbnVsbCkge1xuICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIub3BlblR3b0J1dHRvbkRpYWxvZyhcIlNoYXJlIGEgUHJlemlcIixcbiAgICAgICAgICAgICAgICBcIkFub3RoZXIgcGFydGljaXBhbnQgaXMgYWxyZWFkeSBzaGFyaW5nIGEgUHJlemkuXCIgK1xuICAgICAgICAgICAgICAgICAgICBcIlRoaXMgY29uZmVyZW5jZSBhbGxvd3Mgb25seSBvbmUgUHJlemkgYXQgYSB0aW1lLlwiLFxuICAgICAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgICAgIFwiT2tcIixcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihlLHYsbSxmKSB7XG4gICAgICAgICAgICAgICAgICAgICQucHJvbXB0LmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBvcGVuUHJlemlTdGF0ZSA9IHtcbiAgICAgICAgICAgICAgICBzdGF0ZTA6IHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogICAnPGgyPlNoYXJlIGEgUHJlemk8L2gyPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICc8aW5wdXQgaWQ9XCJwcmV6aVVybFwiIHR5cGU9XCJ0ZXh0XCIgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3BsYWNlaG9sZGVyPVwiZS5nLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnaHR0cDovL3ByZXppLmNvbS93ejd2aGp5Y2w3ZTYvbXktcHJlemlcIiBhdXRvZm9jdXM+JyxcbiAgICAgICAgICAgICAgICAgICAgcGVyc2lzdGVudDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGJ1dHRvbnM6IHsgXCJTaGFyZVwiOiB0cnVlICwgXCJDYW5jZWxcIjogZmFsc2V9LFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0QnV0dG9uOiAxLFxuICAgICAgICAgICAgICAgICAgICBzdWJtaXQ6IGZ1bmN0aW9uKGUsdixtLGYpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYodilcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcHJlemlVcmwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJlemlVcmwnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmV6aVVybC52YWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1cmxWYWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPSBlbmNvZGVVUkkoVXRpbC5lc2NhcGVIdG1sKHByZXppVXJsLnZhbHVlKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVybFZhbHVlLmluZGV4T2YoJ2h0dHA6Ly9wcmV6aS5jb20vJykgIT0gMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgdXJsVmFsdWUuaW5kZXhPZignaHR0cHM6Ly9wcmV6aS5jb20vJykgIT0gMClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJC5wcm9tcHQuZ29Ub1N0YXRlKCdzdGF0ZTEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwcmVzSWRUbXAgPSB1cmxWYWx1ZS5zdWJzdHJpbmcoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybFZhbHVlLmluZGV4T2YoXCJwcmV6aS5jb20vXCIpICsgMTApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0FscGhhbnVtZXJpYyhwcmVzSWRUbXApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IHByZXNJZFRtcC5pbmRleE9mKCcvJykgPCAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJC5wcm9tcHQuZ29Ub1N0YXRlKCdzdGF0ZTEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmVtdWNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFkZFByZXppVG9QcmVzZW5jZSh1cmxWYWx1ZSwgMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGlvbi5lbXVjLnNlbmRQcmVzZW5jZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQucHJvbXB0LmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJC5wcm9tcHQuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc3RhdGUxOiB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWw6ICAgJzxoMj5TaGFyZSBhIFByZXppPC9oMj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnUGxlYXNlIHByb3ZpZGUgYSBjb3JyZWN0IHByZXppIGxpbmsuJyxcbiAgICAgICAgICAgICAgICAgICAgcGVyc2lzdGVudDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGJ1dHRvbnM6IHsgXCJCYWNrXCI6IHRydWUsIFwiQ2FuY2VsXCI6IGZhbHNlIH0sXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRCdXR0b246IDEsXG4gICAgICAgICAgICAgICAgICAgIHN1Ym1pdDpmdW5jdGlvbihlLHYsbSxmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih2PT0wKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQucHJvbXB0LmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJC5wcm9tcHQuZ29Ub1N0YXRlKCdzdGF0ZTAnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgZm9jdXNQcmV6aVVybCA9ICBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcmV6aVVybCcpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5EaWFsb2dXaXRoU3RhdGVzKG9wZW5QcmV6aVN0YXRlLCBmb2N1c1ByZXppVXJsLCBmb2N1c1ByZXppVXJsKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBIG5ldyBwcmVzZW50YXRpb24gaGFzIGJlZW4gYWRkZWQuXG4gICAgICogXG4gICAgICogQHBhcmFtIGV2ZW50IHRoZSBldmVudCBpbmRpY2F0aW5nIHRoZSBhZGQgb2YgYSBwcmVzZW50YXRpb25cbiAgICAgKiBAcGFyYW0gamlkIHRoZSBqaWQgZnJvbSB3aGljaCB0aGUgcHJlc2VudGF0aW9uIHdhcyBhZGRlZFxuICAgICAqIEBwYXJhbSBwcmVzVXJsIHVybCBvZiB0aGUgcHJlc2VudGF0aW9uXG4gICAgICogQHBhcmFtIGN1cnJlbnRTbGlkZSB0aGUgY3VycmVudCBzbGlkZSB0byB3aGljaCB3ZSBzaG91bGQgbW92ZVxuICAgICAqL1xuICAgIHZhciBwcmVzZW50YXRpb25BZGRlZCA9IGZ1bmN0aW9uKGV2ZW50LCBqaWQsIHByZXNVcmwsIGN1cnJlbnRTbGlkZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInByZXNlbnRhdGlvbiBhZGRlZFwiLCBwcmVzVXJsKTtcblxuICAgICAgICB2YXIgcHJlc0lkID0gZ2V0UHJlc2VudGF0aW9uSWQocHJlc1VybCk7XG5cbiAgICAgICAgdmFyIGVsZW1lbnRJZCA9ICdwYXJ0aWNpcGFudF8nXG4gICAgICAgICAgICAgICAgICAgICAgICArIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGppZClcbiAgICAgICAgICAgICAgICAgICAgICAgICsgJ18nICsgcHJlc0lkO1xuXG4gICAgICAgIC8vIFdlIGV4cGxpY2l0bHkgZG9uJ3Qgc3BlY2lmeSB0aGUgcGVlciBqaWQgaGVyZSwgYmVjYXVzZSB3ZSBkb24ndCB3YW50XG4gICAgICAgIC8vIHRoaXMgdmlkZW8gdG8gYmUgZGVhbHQgd2l0aCBhcyBhIHBlZXIgcmVsYXRlZCBvbmUgKGZvciBleGFtcGxlIHdlXG4gICAgICAgIC8vIGRvbid0IHdhbnQgdG8gc2hvdyBhIG11dGUva2ljayBtZW51IGZvciB0aGlzIG9uZSwgZXRjLikuXG4gICAgICAgIFZpZGVvTGF5b3V0LmFkZFJlbW90ZVZpZGVvQ29udGFpbmVyKG51bGwsIGVsZW1lbnRJZCk7XG4gICAgICAgIFZpZGVvTGF5b3V0LnJlc2l6ZVRodW1ibmFpbHMoKTtcblxuICAgICAgICB2YXIgY29udHJvbHNFbmFibGVkID0gZmFsc2U7XG4gICAgICAgIGlmIChqaWQgPT09IGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQpXG4gICAgICAgICAgICBjb250cm9sc0VuYWJsZWQgPSB0cnVlO1xuXG4gICAgICAgIFByZXppLnNldFByZXNlbnRhdGlvblZpc2libGUodHJ1ZSk7XG4gICAgICAgICQoJyNsYXJnZVZpZGVvQ29udGFpbmVyJykuaG92ZXIoXG4gICAgICAgICAgICBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoUHJlemkuaXNQcmVzZW50YXRpb25WaXNpYmxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlbG9hZEJ1dHRvblJpZ2h0ID0gd2luZG93LmlubmVyV2lkdGhcbiAgICAgICAgICAgICAgICAgICAgICAgIC0gJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS5vZmZzZXQoKS5sZWZ0XG4gICAgICAgICAgICAgICAgICAgICAgICAtICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykud2lkdGgoKTtcblxuICAgICAgICAgICAgICAgICAgICAkKCcjcmVsb2FkUHJlc2VudGF0aW9uJykuY3NzKHsgIHJpZ2h0OiByZWxvYWRCdXR0b25SaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNwbGF5OidpbmxpbmUtYmxvY2snfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIGlmICghUHJlemkuaXNQcmVzZW50YXRpb25WaXNpYmxlKCkpXG4gICAgICAgICAgICAgICAgICAgICQoJyNyZWxvYWRQcmVzZW50YXRpb24nKS5jc3Moe2Rpc3BsYXk6J25vbmUnfSk7XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlID0gZXZlbnQudG9FbGVtZW50IHx8IGV2ZW50LnJlbGF0ZWRUYXJnZXQ7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGUgJiYgZS5pZCAhPSAncmVsb2FkUHJlc2VudGF0aW9uJyAmJiBlLmlkICE9ICdoZWFkZXInKVxuICAgICAgICAgICAgICAgICAgICAgICAgJCgnI3JlbG9hZFByZXNlbnRhdGlvbicpLmNzcyh7ZGlzcGxheTonbm9uZSd9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBwcmV6aVBsYXllciA9IG5ldyBQcmV6aVBsYXllcihcbiAgICAgICAgICAgICAgICAgICAgJ3ByZXNlbnRhdGlvbicsXG4gICAgICAgICAgICAgICAgICAgIHtwcmV6aUlkOiBwcmVzSWQsXG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiBnZXRQcmVzZW50YXRpb25XaWR0aCgpLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IGdldFByZXNlbnRhdGlvbkhlaWhndCgpLFxuICAgICAgICAgICAgICAgICAgICBjb250cm9sczogY29udHJvbHNFbmFibGVkLFxuICAgICAgICAgICAgICAgICAgICBkZWJ1ZzogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpLmF0dHIoJ2lkJywgcHJlemlQbGF5ZXIub3B0aW9ucy5wcmV6aUlkKTtcblxuICAgICAgICBwcmV6aVBsYXllci5vbihQcmV6aVBsYXllci5FVkVOVF9TVEFUVVMsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInByZXppIHN0YXR1c1wiLCBldmVudC52YWx1ZSk7XG4gICAgICAgICAgICBpZiAoZXZlbnQudmFsdWUgPT0gUHJlemlQbGF5ZXIuU1RBVFVTX0NPTlRFTlRfUkVBRFkpIHtcbiAgICAgICAgICAgICAgICBpZiAoamlkICE9IGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQpXG4gICAgICAgICAgICAgICAgICAgIHByZXppUGxheWVyLmZseVRvU3RlcChjdXJyZW50U2xpZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBwcmV6aVBsYXllci5vbihQcmV6aVBsYXllci5FVkVOVF9DVVJSRU5UX1NURVAsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImV2ZW50IHZhbHVlXCIsIGV2ZW50LnZhbHVlKTtcbiAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Yy5hZGRDdXJyZW50U2xpZGVUb1ByZXNlbmNlKGV2ZW50LnZhbHVlKTtcbiAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Yy5zZW5kUHJlc2VuY2UoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJChcIiNcIiArIGVsZW1lbnRJZCkuY3NzKCAnYmFja2dyb3VuZC1pbWFnZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICd1cmwoLi4vaW1hZ2VzL2F2YXRhcnByZXppLnBuZyknKTtcbiAgICAgICAgJChcIiNcIiArIGVsZW1lbnRJZCkuY2xpY2soXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgUHJlemkuc2V0UHJlc2VudGF0aW9uVmlzaWJsZSh0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQSBwcmVzZW50YXRpb24gaGFzIGJlZW4gcmVtb3ZlZC5cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0gZXZlbnQgdGhlIGV2ZW50IGluZGljYXRpbmcgdGhlIHJlbW92ZSBvZiBhIHByZXNlbnRhdGlvblxuICAgICAqIEBwYXJhbSBqaWQgdGhlIGppZCBmb3Igd2hpY2ggdGhlIHByZXNlbnRhdGlvbiB3YXMgcmVtb3ZlZFxuICAgICAqIEBwYXJhbSB0aGUgdXJsIG9mIHRoZSBwcmVzZW50YXRpb25cbiAgICAgKi9cbiAgICB2YXIgcHJlc2VudGF0aW9uUmVtb3ZlZCA9IGZ1bmN0aW9uIChldmVudCwgamlkLCBwcmVzVXJsKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdwcmVzZW50YXRpb24gcmVtb3ZlZCcsIHByZXNVcmwpO1xuICAgICAgICB2YXIgcHJlc0lkID0gZ2V0UHJlc2VudGF0aW9uSWQocHJlc1VybCk7XG4gICAgICAgIFByZXppLnNldFByZXNlbnRhdGlvblZpc2libGUoZmFsc2UpO1xuICAgICAgICAkKCcjcGFydGljaXBhbnRfJ1xuICAgICAgICAgICAgICAgICsgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKVxuICAgICAgICAgICAgICAgICsgJ18nICsgcHJlc0lkKS5yZW1vdmUoKTtcbiAgICAgICAgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS5yZW1vdmUoKTtcbiAgICAgICAgaWYgKHByZXppUGxheWVyICE9IG51bGwpIHtcbiAgICAgICAgICAgIHByZXppUGxheWVyLmRlc3Ryb3koKTtcbiAgICAgICAgICAgIHByZXppUGxheWVyID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBJbmRpY2F0ZXMgaWYgdGhlIGdpdmVuIHN0cmluZyBpcyBhbiBhbHBoYW51bWVyaWMgc3RyaW5nLlxuICAgICAqIE5vdGUgdGhhdCBzb21lIHNwZWNpYWwgY2hhcmFjdGVycyBhcmUgYWxzbyBhbGxvd2VkICgtLCBfICwgLywgJiwgPywgPSwgOykgZm9yIHRoZVxuICAgICAqIHB1cnBvc2Ugb2YgY2hlY2tpbmcgVVJJcy5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc0FscGhhbnVtZXJpYyh1bnNhZmVUZXh0KSB7XG4gICAgICAgIHZhciByZWdleCA9IC9eW2EtejAtOS1fXFwvJlxcPz07XSskL2k7XG4gICAgICAgIHJldHVybiByZWdleC50ZXN0KHVuc2FmZVRleHQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHByZXNlbnRhdGlvbiBpZCBmcm9tIHRoZSBnaXZlbiB1cmwuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UHJlc2VudGF0aW9uSWQgKHByZXNVcmwpIHtcbiAgICAgICAgdmFyIHByZXNJZFRtcCA9IHByZXNVcmwuc3Vic3RyaW5nKHByZXNVcmwuaW5kZXhPZihcInByZXppLmNvbS9cIikgKyAxMCk7XG4gICAgICAgIHJldHVybiBwcmVzSWRUbXAuc3Vic3RyaW5nKDAsIHByZXNJZFRtcC5pbmRleE9mKCcvJykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHByZXNlbnRhdGlvbiB3aWR0aC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRQcmVzZW50YXRpb25XaWR0aCgpIHtcbiAgICAgICAgdmFyIGF2YWlsYWJsZVdpZHRoID0gVUlVdGlsLmdldEF2YWlsYWJsZVZpZGVvV2lkdGgoKTtcbiAgICAgICAgdmFyIGF2YWlsYWJsZUhlaWdodCA9IGdldFByZXNlbnRhdGlvbkhlaWhndCgpO1xuXG4gICAgICAgIHZhciBhc3BlY3RSYXRpbyA9IDE2LjAgLyA5LjA7XG4gICAgICAgIGlmIChhdmFpbGFibGVIZWlnaHQgPCBhdmFpbGFibGVXaWR0aCAvIGFzcGVjdFJhdGlvKSB7XG4gICAgICAgICAgICBhdmFpbGFibGVXaWR0aCA9IE1hdGguZmxvb3IoYXZhaWxhYmxlSGVpZ2h0ICogYXNwZWN0UmF0aW8pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhdmFpbGFibGVXaWR0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBwcmVzZW50YXRpb24gaGVpZ2h0LlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFByZXNlbnRhdGlvbkhlaWhndCgpIHtcbiAgICAgICAgdmFyIHJlbW90ZVZpZGVvcyA9ICQoJyNyZW1vdGVWaWRlb3MnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbm5lckhlaWdodCAtIHJlbW90ZVZpZGVvcy5vdXRlckhlaWdodCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlc2l6ZXMgdGhlIHByZXNlbnRhdGlvbiBpZnJhbWUuXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVzaXplKCkge1xuICAgICAgICBpZiAoJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKSkge1xuICAgICAgICAgICAgJCgnI3ByZXNlbnRhdGlvbj5pZnJhbWUnKS53aWR0aChnZXRQcmVzZW50YXRpb25XaWR0aCgpKTtcbiAgICAgICAgICAgICQoJyNwcmVzZW50YXRpb24+aWZyYW1lJykuaGVpZ2h0KGdldFByZXNlbnRhdGlvbkhlaWhndCgpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFByZXNlbnRhdGlvbiBoYXMgYmVlbiByZW1vdmVkLlxuICAgICAqL1xuICAgICQoZG9jdW1lbnQpLmJpbmQoJ3ByZXNlbnRhdGlvbnJlbW92ZWQubXVjJywgcHJlc2VudGF0aW9uUmVtb3ZlZCk7XG5cbiAgICAvKipcbiAgICAgKiBQcmVzZW50YXRpb24gaGFzIGJlZW4gYWRkZWQuXG4gICAgICovXG4gICAgJChkb2N1bWVudCkuYmluZCgncHJlc2VudGF0aW9uYWRkZWQubXVjJywgcHJlc2VudGF0aW9uQWRkZWQpO1xuXG4gICAgLypcbiAgICAgKiBJbmRpY2F0ZXMgcHJlc2VudGF0aW9uIHNsaWRlIGNoYW5nZS5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCdnb3Rvc2xpZGUubXVjJywgZnVuY3Rpb24gKGV2ZW50LCBqaWQsIHByZXNVcmwsIGN1cnJlbnQpIHtcbiAgICAgICAgaWYgKHByZXppUGxheWVyICYmIHByZXppUGxheWVyLmdldEN1cnJlbnRTdGVwKCkgIT0gY3VycmVudCkge1xuICAgICAgICAgICAgcHJlemlQbGF5ZXIuZmx5VG9TdGVwKGN1cnJlbnQpO1xuXG4gICAgICAgICAgICB2YXIgYW5pbWF0aW9uU3RlcHNBcnJheSA9IHByZXppUGxheWVyLmdldEFuaW1hdGlvbkNvdW50T25TdGVwcygpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJzZUludChhbmltYXRpb25TdGVwc0FycmF5W2N1cnJlbnRdKTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcHJlemlQbGF5ZXIuZmx5VG9TdGVwKGN1cnJlbnQsIGkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBPbiB2aWRlbyBzZWxlY3RlZCBldmVudC5cbiAgICAgKi9cbiAgICAkKGRvY3VtZW50KS5iaW5kKCd2aWRlby5zZWxlY3RlZCcsIGZ1bmN0aW9uIChldmVudCwgaXNQcmVzZW50YXRpb24pIHtcbiAgICAgICAgaWYgKCFpc1ByZXNlbnRhdGlvbiAmJiAkKCcjcHJlc2VudGF0aW9uPmlmcmFtZScpKVxuICAgICAgICAgICAgUHJlemkuc2V0UHJlc2VudGF0aW9uVmlzaWJsZShmYWxzZSk7XG4gICAgfSk7XG5cbiAgICAkKHdpbmRvdykucmVzaXplKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmVzaXplKCk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbXk7XG59KFByZXppIHx8IHt9KSk7XG5cbm1vZHVsZS5leHBvcnRzID0gUHJlemk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB2YXIgX19iaW5kID0gZnVuY3Rpb24oZm4sIG1lKXsgcmV0dXJuIGZ1bmN0aW9uKCl7IHJldHVybiBmbi5hcHBseShtZSwgYXJndW1lbnRzKTsgfTsgfTtcblxuICAgIHZhciBQcmV6aVBsYXllciA9IChmdW5jdGlvbigpIHtcblxuICAgICAgICBQcmV6aVBsYXllci5BUElfVkVSU0lPTiA9IDE7XG4gICAgICAgIFByZXppUGxheWVyLkNVUlJFTlRfU1RFUCA9ICdjdXJyZW50U3RlcCc7XG4gICAgICAgIFByZXppUGxheWVyLkNVUlJFTlRfQU5JTUFUSU9OX1NURVAgPSAnY3VycmVudEFuaW1hdGlvblN0ZXAnO1xuICAgICAgICBQcmV6aVBsYXllci5DVVJSRU5UX09CSkVDVCA9ICdjdXJyZW50T2JqZWN0JztcbiAgICAgICAgUHJlemlQbGF5ZXIuU1RBVFVTX0xPQURJTkcgPSAnbG9hZGluZyc7XG4gICAgICAgIFByZXppUGxheWVyLlNUQVRVU19SRUFEWSA9ICdyZWFkeSc7XG4gICAgICAgIFByZXppUGxheWVyLlNUQVRVU19DT05URU5UX1JFQURZID0gJ2NvbnRlbnRyZWFkeSc7XG4gICAgICAgIFByZXppUGxheWVyLkVWRU5UX0NVUlJFTlRfU1RFUCA9IFwiY3VycmVudFN0ZXBDaGFuZ2VcIjtcbiAgICAgICAgUHJlemlQbGF5ZXIuRVZFTlRfQ1VSUkVOVF9BTklNQVRJT05fU1RFUCA9IFwiY3VycmVudEFuaW1hdGlvblN0ZXBDaGFuZ2VcIjtcbiAgICAgICAgUHJlemlQbGF5ZXIuRVZFTlRfQ1VSUkVOVF9PQkpFQ1QgPSBcImN1cnJlbnRPYmplY3RDaGFuZ2VcIjtcbiAgICAgICAgUHJlemlQbGF5ZXIuRVZFTlRfU1RBVFVTID0gXCJzdGF0dXNDaGFuZ2VcIjtcbiAgICAgICAgUHJlemlQbGF5ZXIuRVZFTlRfUExBWUlORyA9IFwiaXNBdXRvUGxheWluZ0NoYW5nZVwiO1xuICAgICAgICBQcmV6aVBsYXllci5FVkVOVF9JU19NT1ZJTkcgPSBcImlzTW92aW5nQ2hhbmdlXCI7XG4gICAgICAgIFByZXppUGxheWVyLmRvbWFpbiA9IFwiaHR0cHM6Ly9wcmV6aS5jb21cIjtcbiAgICAgICAgUHJlemlQbGF5ZXIucGF0aCA9IFwiL3BsYXllci9cIjtcbiAgICAgICAgUHJlemlQbGF5ZXIucGxheWVycyA9IHt9O1xuICAgICAgICBQcmV6aVBsYXllci5iaW5kZWRfbWV0aG9kcyA9IFsnY2hhbmdlc0hhbmRsZXInXTtcblxuICAgICAgICBQcmV6aVBsYXllci5jcmVhdGVNdWx0aXBsZVBsYXllcnMgPSBmdW5jdGlvbihvcHRpb25BcnJheSl7XG4gICAgICAgICAgICBmb3IodmFyIGk9MDsgaTxvcHRpb25BcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBvcHRpb25TZXQgPSBvcHRpb25BcnJheVtpXTtcbiAgICAgICAgICAgICAgICBuZXcgUHJlemlQbGF5ZXIob3B0aW9uU2V0LmlkLCBvcHRpb25TZXQpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5tZXNzYWdlUmVjZWl2ZWQgPSBmdW5jdGlvbihldmVudCl7XG4gICAgICAgICAgICB2YXIgbWVzc2FnZSwgaXRlbSwgcGxheWVyO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gSlNPTi5wYXJzZShldmVudC5kYXRhKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5pZCAmJiAocGxheWVyID0gUHJlemlQbGF5ZXIucGxheWVyc1ttZXNzYWdlLmlkXSkpe1xuICAgICAgICAgICAgICAgIGlmIChwbGF5ZXIub3B0aW9ucy5kZWJ1ZyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29uc29sZSAmJiBjb25zb2xlLmxvZykgY29uc29sZS5sb2coJ3JlY2VpdmVkJywgbWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiY2hhbmdlc1wiKXtcbiAgICAgICAgICAgICAgICAgICAgcGxheWVyLmNoYW5nZXNIYW5kbGVyKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8cGxheWVyLmNhbGxiYWNrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpdGVtID0gcGxheWVyLmNhbGxiYWNrc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0gJiYgbWVzc2FnZS50eXBlID09PSBpdGVtLmV2ZW50KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uY2FsbGJhY2sobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gUHJlemlQbGF5ZXIoaWQsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciBwYXJhbXMsIHBhcmFtU3RyaW5nID0gXCJcIiwgX3RoaXMgPSB0aGlzO1xuICAgICAgICAgICAgaWYgKFByZXppUGxheWVyLnBsYXllcnNbaWRdKXtcbiAgICAgICAgICAgICAgICBQcmV6aVBsYXllci5wbGF5ZXJzW2lkXS5kZXN0cm95KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IodmFyIGk9MDsgaTxQcmV6aVBsYXllci5iaW5kZWRfbWV0aG9kcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBtZXRob2RfbmFtZSA9IFByZXppUGxheWVyLmJpbmRlZF9tZXRob2RzW2ldO1xuICAgICAgICAgICAgICAgIF90aGlzW21ldGhvZF9uYW1lXSA9IF9fYmluZChfdGhpc1ttZXRob2RfbmFtZV0sIF90aGlzKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgICAgICAgICB0aGlzLnZhbHVlcyA9IHsnc3RhdHVzJzogUHJlemlQbGF5ZXIuU1RBVFVTX0xPQURJTkd9O1xuICAgICAgICAgICAgdGhpcy52YWx1ZXNbUHJlemlQbGF5ZXIuQ1VSUkVOVF9TVEVQXSA9IDA7XG4gICAgICAgICAgICB0aGlzLnZhbHVlc1tQcmV6aVBsYXllci5DVVJSRU5UX0FOSU1BVElPTl9TVEVQXSA9IDA7XG4gICAgICAgICAgICB0aGlzLnZhbHVlc1tQcmV6aVBsYXllci5DVVJSRU5UX09CSkVDVF0gPSBudWxsO1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFja3MgPSBbXTtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgICAgIHRoaXMuZW1iZWRUbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcbiAgICAgICAgICAgIGlmICghdGhpcy5lbWJlZFRvKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgXCJUaGUgZWxlbWVudCBpZCBpcyBub3QgYXZhaWxhYmxlLlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5pZnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcbiAgICAgICAgICAgIHBhcmFtcyA9IFtcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdvaWQnLCB2YWx1ZTogb3B0aW9ucy5wcmV6aUlkIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZXhwbG9yYWJsZScsIHZhbHVlOiBvcHRpb25zLmV4cGxvcmFibGUgPyAxIDogMCB9LFxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2NvbnRyb2xzJywgdmFsdWU6IG9wdGlvbnMuY29udHJvbHMgPyAxIDogMCB9XG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgZm9yKHZhciBpPTA7IGk8cGFyYW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtID0gcGFyYW1zW2ldO1xuICAgICAgICAgICAgICAgIHBhcmFtU3RyaW5nICs9IChpPT09MCA/IFwiP1wiIDogXCImXCIpICsgcGFyYW0ubmFtZSArIFwiPVwiICsgcGFyYW0udmFsdWU7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5pZnJhbWUuc3JjID0gUHJlemlQbGF5ZXIuZG9tYWluICsgUHJlemlQbGF5ZXIucGF0aCArIHBhcmFtU3RyaW5nO1xuICAgICAgICAgICAgdGhpcy5pZnJhbWUuZnJhbWVCb3JkZXIgPSAwO1xuICAgICAgICAgICAgdGhpcy5pZnJhbWUuc2Nyb2xsaW5nID0gXCJub1wiO1xuICAgICAgICAgICAgdGhpcy5pZnJhbWUud2lkdGggPSBvcHRpb25zLndpZHRoIHx8IDY0MDtcbiAgICAgICAgICAgIHRoaXMuaWZyYW1lLmhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0IHx8IDQ4MDtcbiAgICAgICAgICAgIHRoaXMuZW1iZWRUby5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgICAgIC8vIEpJVFNJOiBJTiBDQVNFIFNPTUVUSElORyBHT0VTIFdST05HLlxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0aGlzLmVtYmVkVG8uYXBwZW5kQ2hpbGQodGhpcy5pZnJhbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ0FUQ0ggRVJST1JcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEpJVFNJOiBJbmNyZWFzZSBpbnRlcnZhbCBmcm9tIDIwMCB0byA1MDAsIHdoaWNoIGZpeGVzIHByZXppXG4gICAgICAgICAgICAvLyBjcmFzaGVzIGZvciB1cy5cbiAgICAgICAgICAgIHRoaXMuaW5pdFBvbGxJbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgX3RoaXMuc2VuZE1lc3NhZ2UoeydhY3Rpb24nOiAnaW5pdCd9KTtcbiAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICBQcmV6aVBsYXllci5wbGF5ZXJzW2lkXSA9IHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuY2hhbmdlc0hhbmRsZXIgPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgICAgICAgICB2YXIga2V5LCB2YWx1ZSwgaiwgaXRlbTtcbiAgICAgICAgICAgIGlmICh0aGlzLmluaXRQb2xsSW50ZXJ2YWwpIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMuaW5pdFBvbGxJbnRlcnZhbCk7XG4gICAgICAgICAgICAgICAgdGhpcy5pbml0UG9sbEludGVydmFsID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGtleSBpbiBtZXNzYWdlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5kYXRhLmhhc093blByb3BlcnR5KGtleSkpe1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG1lc3NhZ2UuZGF0YVtrZXldO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnZhbHVlc1trZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaj0wOyBqPHRoaXMuY2FsbGJhY2tzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtID0gdGhpcy5jYWxsYmFja3Nbal07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLmV2ZW50ID09PSBrZXkgKyBcIkNoYW5nZVwiKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLmNhbGxiYWNrKHt0eXBlOiBpdGVtLmV2ZW50LCB2YWx1ZTogdmFsdWV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaW5pdFBvbGxJbnRlcnZhbCkge1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5pbml0UG9sbEludGVydmFsKTtcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRQb2xsSW50ZXJ2YWwgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZW1iZWRUby5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuc2VuZE1lc3NhZ2UgPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLmRlYnVnID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbnNvbGUgJiYgY29uc29sZS5sb2cpIGNvbnNvbGUubG9nKCdzZW50JywgbWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtZXNzYWdlLnZlcnNpb24gPSBQcmV6aVBsYXllci5BUElfVkVSU0lPTjtcbiAgICAgICAgICAgIG1lc3NhZ2UuaWQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaWZyYW1lLmNvbnRlbnRXaW5kb3cucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkobWVzc2FnZSksICcqJyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLm5leHRTdGVwID0gLyogbmV4dFN0ZXAgaXMgREVQUkVDQVRFRCAqL1xuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZmx5VG9OZXh0U3RlcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgICdhY3Rpb24nOiAncHJlc2VudCcsXG4gICAgICAgICAgICAgICAgJ2RhdGEnOiBbJ21vdmVUb05leHRTdGVwJ11cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5wcmV2aW91c1N0ZXAgPSAvKiBwcmV2aW91c1N0ZXAgaXMgREVQUkVDQVRFRCAqL1xuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZmx5VG9QcmV2aW91c1N0ZXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAnYWN0aW9uJzogJ3ByZXNlbnQnLFxuICAgICAgICAgICAgICAgICdkYXRhJzogWydtb3ZlVG9QcmV2U3RlcCddXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUudG9TdGVwID0gLyogdG9TdGVwIGlzIERFUFJFQ0FURUQgKi9cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmZseVRvU3RlcCA9IGZ1bmN0aW9uKHN0ZXAsIGFuaW1hdGlvbl9zdGVwKSB7XG4gICAgICAgICAgICB2YXIgb2JqID0gdGhpcztcbiAgICAgICAgICAgIC8vIGNoZWNrIGFuaW1hdGlvbl9zdGVwXG4gICAgICAgICAgICBpZiAoYW5pbWF0aW9uX3N0ZXAgPiAwICYmXG4gICAgICAgICAgICAgICAgb2JqLnZhbHVlcy5hbmltYXRpb25Db3VudE9uU3RlcHMgJiZcbiAgICAgICAgICAgICAgICBvYmoudmFsdWVzLmFuaW1hdGlvbkNvdW50T25TdGVwc1tzdGVwXSA8PSBhbmltYXRpb25fc3RlcCkge1xuICAgICAgICAgICAgICAgIGFuaW1hdGlvbl9zdGVwID0gb2JqLnZhbHVlcy5hbmltYXRpb25Db3VudE9uU3RlcHNbc3RlcF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBqdW1wIHRvIGFuaW1hdGlvbiBzdGVwcyBieSBjYWxsaW5nIGZseVRvTmV4dFN0ZXAoKVxuICAgICAgICAgICAgZnVuY3Rpb24gZG9BbmltYXRpb25TdGVwcygpIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqLnZhbHVlcy5pc01vdmluZyA9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZG9BbmltYXRpb25TdGVwcywgMTAwKTsgLy8gd2FpdCB1bnRpbCB0aGUgZmxpZ2h0IGVuZHNcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB3aGlsZSAoYW5pbWF0aW9uX3N0ZXAtLSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgb2JqLmZseVRvTmV4dFN0ZXAoKTsgLy8gZG8gdGhlIGFuaW1hdGlvbiBzdGVwc1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNldFRpbWVvdXQoZG9BbmltYXRpb25TdGVwcywgMjAwKTsgLy8gMjAwbXMgaXMgdGhlIGludGVybmFsIFwicmVwb3J0aW5nXCIgdGltZVxuICAgICAgICAgICAgLy8ganVtcCB0byB0aGUgc3RlcFxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgICdhY3Rpb24nOiAncHJlc2VudCcsXG4gICAgICAgICAgICAgICAgJ2RhdGEnOiBbJ21vdmVUb1N0ZXAnLCBzdGVwXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLnRvT2JqZWN0ID0gLyogdG9PYmplY3QgaXMgREVQUkVDQVRFRCAqL1xuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZmx5VG9PYmplY3QgPSBmdW5jdGlvbihvYmplY3RJZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgICdhY3Rpb24nOiAncHJlc2VudCcsXG4gICAgICAgICAgICAgICAgJ2RhdGEnOiBbJ21vdmVUb09iamVjdCcsIG9iamVjdElkXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWZhdWx0RGVsYXkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAnYWN0aW9uJzogJ3ByZXNlbnQnLFxuICAgICAgICAgICAgICAgICdkYXRhJzogWydzdGFydEF1dG9QbGF5JywgZGVmYXVsdERlbGF5XVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAnYWN0aW9uJzogJ3ByZXNlbnQnLFxuICAgICAgICAgICAgICAgICdkYXRhJzogWydzdG9wQXV0b1BsYXknXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oZGVmYXVsdERlbGF5KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgJ2FjdGlvbic6ICdwcmVzZW50JyxcbiAgICAgICAgICAgICAgICAnZGF0YSc6IFsncGF1c2VBdXRvUGxheScsIGRlZmF1bHREZWxheV1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5nZXRDdXJyZW50U3RlcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzLmN1cnJlbnRTdGVwO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5nZXRDdXJyZW50QW5pbWF0aW9uU3RlcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzLmN1cnJlbnRBbmltYXRpb25TdGVwO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5nZXRDdXJyZW50T2JqZWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXMuY3VycmVudE9iamVjdDtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZ2V0U3RhdHVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXMuc3RhdHVzO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5pc1BsYXlpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlcy5pc0F1dG9QbGF5aW5nO1xuICAgICAgICB9O1xuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5nZXRTdGVwQ291bnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlcy5zdGVwQ291bnQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLmdldEFuaW1hdGlvbkNvdW50T25TdGVwcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzLmFuaW1hdGlvbkNvdW50T25TdGVwcztcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuZ2V0VGl0bGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlcy50aXRsZTtcbiAgICAgICAgfTtcblxuICAgICAgICBQcmV6aVBsYXllci5wcm90b3R5cGUuc2V0RGltZW5zaW9ucyA9IGZ1bmN0aW9uKGRpbXMpIHtcbiAgICAgICAgICAgIGZvciAodmFyIHBhcmFtZXRlciBpbiBkaW1zKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pZnJhbWVbcGFyYW1ldGVyXSA9IGRpbXNbcGFyYW1ldGVyXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5nZXREaW1lbnNpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHdpZHRoOiBwYXJzZUludCh0aGlzLmlmcmFtZS53aWR0aCwgMTApLFxuICAgICAgICAgICAgICAgIGhlaWdodDogcGFyc2VJbnQodGhpcy5pZnJhbWUuaGVpZ2h0LCAxMClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIFByZXppUGxheWVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKGV2ZW50LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFja3MucHVzaCh7XG4gICAgICAgICAgICAgICAgZXZlbnQ6IGV2ZW50LFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgUHJlemlQbGF5ZXIucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uKGV2ZW50LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIGosIGl0ZW07XG4gICAgICAgICAgICBpZiAoZXZlbnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tzID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBqID0gdGhpcy5jYWxsYmFja3MubGVuZ3RoO1xuICAgICAgICAgICAgd2hpbGUgKGotLSkge1xuICAgICAgICAgICAgICAgIGl0ZW0gPSB0aGlzLmNhbGxiYWNrc1tqXTtcbiAgICAgICAgICAgICAgICBpZiAoaXRlbSAmJiBpdGVtLmV2ZW50ID09PSBldmVudCAmJiAoY2FsbGJhY2sgPT09IHVuZGVmaW5lZCB8fCBpdGVtLmNhbGxiYWNrID09PSBjYWxsYmFjaykpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbGxiYWNrcy5zcGxpY2UoaiwgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBQcmV6aVBsYXllci5tZXNzYWdlUmVjZWl2ZWQsIGZhbHNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdpbmRvdy5hdHRhY2hFdmVudCgnb25tZXNzYWdlJywgUHJlemlQbGF5ZXIubWVzc2FnZVJlY2VpdmVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBQcmV6aVBsYXllcjtcblxuICAgIH0pKCk7XG5cbiAgICByZXR1cm4gUHJlemlQbGF5ZXI7XG59KSgpO1xuIiwidmFyIENvbnRhY3RMaXN0ID0gcmVxdWlyZShcIi4vLi4vQ29udGFjdExpc3QuanNcIik7XG52YXIgQ2hhdCA9IHJlcXVpcmUoXCIuLy4uL2NoYXQvY2hhdC5qc1wiKTtcblxudmFyIEJvdHRvbVRvb2xiYXIgPSAoZnVuY3Rpb24gKG15KSB7XG5cbiAgICB2YXIgYnV0dG9uSGFuZGxlcnMgPSB7XG4gICAgICAgIFwiYm90dG9tdG9vbGJhcl9idXR0b25fY2hhdFwiOiBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiBCb3R0b21Ub29sYmFyLnRvZ2dsZUNoYXQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJib3R0b210b29sYmFyX2J1dHRvbl9jb250YWN0XCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBCb3R0b21Ub29sYmFyLnRvZ2dsZUNvbnRhY3RMaXN0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIFwiYm90dG9tdG9vbGJhcl9idXR0b25fZmlsbXN0cmlwXCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBCb3R0b21Ub29sYmFyLnRvZ2dsZUZpbG1TdHJpcCgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIG15LmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZvcih2YXIgayBpbiBidXR0b25IYW5kbGVycylcbiAgICAgICAgICAgICQoXCIjXCIgKyBrKS5jbGljayhidXR0b25IYW5kbGVyc1trXSk7XG4gICAgfVxuICAgIG15LnRvZ2dsZUNoYXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKENvbnRhY3RMaXN0LmlzVmlzaWJsZSgpKSB7XG4gICAgICAgICAgICBidXR0b25DbGljayhcIiNjb250YWN0TGlzdEJ1dHRvblwiLCBcImFjdGl2ZVwiKTtcbiAgICAgICAgICAgIENvbnRhY3RMaXN0LnRvZ2dsZUNvbnRhY3RMaXN0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBidXR0b25DbGljayhcIiNjaGF0Qm90dG9tQnV0dG9uXCIsIFwiYWN0aXZlXCIpO1xuXG4gICAgICAgIENoYXQudG9nZ2xlQ2hhdCgpO1xuICAgIH07XG5cbiAgICBteS50b2dnbGVDb250YWN0TGlzdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoQ2hhdC5pc1Zpc2libGUoKSkge1xuICAgICAgICAgICAgYnV0dG9uQ2xpY2soXCIjY2hhdEJvdHRvbUJ1dHRvblwiLCBcImFjdGl2ZVwiKTtcbiAgICAgICAgICAgIENoYXQudG9nZ2xlQ2hhdCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgYnV0dG9uQ2xpY2soXCIjY29udGFjdExpc3RCdXR0b25cIiwgXCJhY3RpdmVcIik7XG5cbiAgICAgICAgQ29udGFjdExpc3QudG9nZ2xlQ29udGFjdExpc3QoKTtcbiAgICB9O1xuXG4gICAgbXkudG9nZ2xlRmlsbVN0cmlwID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBmaWxtc3RyaXAgPSAkKFwiI3JlbW90ZVZpZGVvc1wiKTtcbiAgICAgICAgZmlsbXN0cmlwLnRvZ2dsZUNsYXNzKFwiaGlkZGVuXCIpO1xuICAgIH07XG5cblxuICAgICQoZG9jdW1lbnQpLmJpbmQoXCJyZW1vdGV2aWRlby5yZXNpemVkXCIsIGZ1bmN0aW9uIChldmVudCwgd2lkdGgsIGhlaWdodCkge1xuICAgICAgICB2YXIgYm90dG9tID0gKGhlaWdodCAtICQoJyNib3R0b21Ub29sYmFyJykub3V0ZXJIZWlnaHQoKSkvMiArIDE4O1xuXG4gICAgICAgICQoJyNib3R0b21Ub29sYmFyJykuY3NzKHtib3R0b206IGJvdHRvbSArICdweCd9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBteTtcbn0oQm90dG9tVG9vbGJhciB8fCB7fSkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJvdHRvbVRvb2xiYXI7XG4iLCJ2YXIgQm90dG9tVG9vbGJhciA9IHJlcXVpcmUoXCIuL0JvdHRvbVRvb2xiYXJcIik7XG52YXIgUHJlemkgPSByZXF1aXJlKFwiLi8uLi9wcmV6aS9wcmV6aVwiKTtcbnZhciBFdGhlcnBhZCA9IHJlcXVpcmUoXCIuLy4uL2V0aGVycGFkL0V0aGVycGFkXCIpO1xuXG52YXIgVG9vbGJhciA9IChmdW5jdGlvbiAobXkpIHtcblxuICAgIHZhciB0b29sYmFyVGltZW91dCA9IG51bGw7XG5cbiAgICB2YXIgYnV0dG9uSGFuZGxlcnMgPSB7XG4gICAgICAgIFwidG9vbGJhcl9idXR0b25fbXV0ZVwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9nZ2xlQXVkaW8oKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9jYW1lcmFcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYnV0dG9uQ2xpY2soXCIjdmlkZW9cIiwgXCJpY29uLWNhbWVyYSBpY29uLWNhbWVyYS1kaXNhYmxlZFwiKTtcbiAgICAgICAgICAgIHJldHVybiB0b2dnbGVWaWRlbygpO1xuICAgICAgICB9LFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX3JlY29yZFwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9nZ2xlUmVjb3JkaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgLFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX3NlY3VyaXR5XCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBUb29sYmFyLm9wZW5Mb2NrRGlhbG9nKCk7XG4gICAgICAgIH0sXG4gICAgICAgIFwidG9vbGJhcl9idXR0b25fbGlua1wiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gVG9vbGJhci5vcGVuTGlua0RpYWxvZygpO1xuICAgICAgICB9LFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX2NoYXRcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIEJvdHRvbVRvb2xiYXIudG9nZ2xlQ2hhdCgpO1xuICAgICAgICB9LFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX3ByZXppXCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBQcmV6aS5vcGVuUHJlemlEaWFsb2coKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9ldGhlcnBhZFwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gRXRoZXJwYWQudG9nZ2xlRXRoZXJwYWQoMCk7XG4gICAgICAgIH0sXG4gICAgICAgIFwidG9vbGJhcl9idXR0b25fZGVza3RvcHNoYXJpbmdcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRvZ2dsZVNjcmVlblNoYXJpbmcoKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9mdWxsU2NyZWVuXCI6IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgYnV0dG9uQ2xpY2soXCIjZnVsbFNjcmVlblwiLCBcImljb24tZnVsbC1zY3JlZW4gaWNvbi1leGl0LWZ1bGwtc2NyZWVuXCIpO1xuICAgICAgICAgICAgcmV0dXJuIFRvb2xiYXIudG9nZ2xlRnVsbFNjcmVlbigpO1xuICAgICAgICB9LFxuICAgICAgICBcInRvb2xiYXJfYnV0dG9uX3NpcFwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbFNpcEJ1dHRvbkNsaWNrZWQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b29sYmFyX2J1dHRvbl9oYW5ndXBcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGhhbmd1cCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gU3RhcnRzIG9yIHN0b3BzIHRoZSByZWNvcmRpbmcgZm9yIHRoZSBjb25mZXJlbmNlLlxuICAgIGZ1bmN0aW9uIHRvZ2dsZVJlY29yZGluZygpIHtcbiAgICAgICAgaWYgKGZvY3VzID09PSBudWxsIHx8IGZvY3VzLmNvbmZpZCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ25vbi1mb2N1cywgb3IgY29uZmVyZW5jZSBub3QgeWV0IG9yZ2FuaXplZDogbm90IGVuYWJsaW5nIHJlY29yZGluZycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFyZWNvcmRpbmdUb2tlbilcbiAgICAgICAge1xuICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIub3BlblR3b0J1dHRvbkRpYWxvZyhudWxsLFxuICAgICAgICAgICAgICAgICAgICAnPGgyPkVudGVyIHJlY29yZGluZyB0b2tlbjwvaDI+JyArXG4gICAgICAgICAgICAgICAgICAgICc8aW5wdXQgaWQ9XCJyZWNvcmRpbmdUb2tlblwiIHR5cGU9XCJ0ZXh0XCIgcGxhY2Vob2xkZXI9XCJ0b2tlblwiIGF1dG9mb2N1cz4nLFxuICAgICAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgICAgIFwiU2F2ZVwiLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlLCB2LCBtLCBmKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdG9rZW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVjb3JkaW5nVG9rZW4nKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRva2VuLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0UmVjb3JkaW5nVG9rZW4oVXRpbC5lc2NhcGVIdG1sKHRva2VuLnZhbHVlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlUmVjb3JkaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVjb3JkaW5nVG9rZW4nKS5mb2N1cygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBvbGRTdGF0ZSA9IGZvY3VzLnJlY29yZGluZ0VuYWJsZWQ7XG4gICAgICAgIFRvb2xiYXIudG9nZ2xlUmVjb3JkaW5nQnV0dG9uU3RhdGUoKTtcbiAgICAgICAgZm9jdXMuc2V0UmVjb3JkaW5nKCFvbGRTdGF0ZSxcbiAgICAgICAgICAgIHJlY29yZGluZ1Rva2VuLFxuICAgICAgICAgICAgZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJOZXcgcmVjb3JkaW5nIHN0YXRlOiBcIiwgc3RhdGUpO1xuICAgICAgICAgICAgICAgIGlmIChzdGF0ZSA9PSBvbGRTdGF0ZSkgLy9mYWlsZWQgdG8gY2hhbmdlLCByZXNldCB0aGUgdG9rZW4gYmVjYXVzZSBpdCBtaWdodCBoYXZlIGJlZW4gd3JvbmdcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFRvb2xiYXIudG9nZ2xlUmVjb3JkaW5nQnV0dG9uU3RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgc2V0UmVjb3JkaW5nVG9rZW4obnVsbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuXG5cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoYW5ndXAoKSB7XG4gICAgICAgIGRpc3Bvc2VDb25mZXJlbmNlKCk7XG4gICAgICAgIHNlc3Npb25UZXJtaW5hdGVkID0gdHJ1ZTtcbiAgICAgICAgY29ubmVjdGlvbi5lbXVjLmRvTGVhdmUoKTtcbiAgICAgICAgdmFyIGJ1dHRvbnMgPSB7fTtcbiAgICAgICAgaWYoY29uZmlnLmVuYWJsZVdlbGNvbWVQYWdlKVxuICAgICAgICB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLndlbGNvbWVQYWdlRGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgPSBcIi9cIjtcbiAgICAgICAgICAgIH0sIDEwMDAwKTtcblxuICAgICAgICB9XG5cbiAgICAgICAgJC5wcm9tcHQoXCJTZXNzaW9uIFRlcm1pbmF0ZWRcIixcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0aXRsZTogXCJZb3UgaHVuZyB1cCB0aGUgY2FsbFwiLFxuICAgICAgICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgICAgICAgYnV0dG9uczoge1xuICAgICAgICAgICAgICAgICAgICBcIkpvaW4gYWdhaW5cIjogdHJ1ZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY2xvc2VUZXh0OiAnJyxcbiAgICAgICAgICAgICAgICBzdWJtaXQ6IGZ1bmN0aW9uKGV2ZW50LCB2YWx1ZSwgbWVzc2FnZSwgZm9ybVZhbHMpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvY2tzIC8gdW5sb2NrcyB0aGUgcm9vbS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsb2NrUm9vbShsb2NrKSB7XG4gICAgICAgIGlmIChsb2NrKVxuICAgICAgICAgICAgY29ubmVjdGlvbi5lbXVjLmxvY2tSb29tKHNoYXJlZEtleSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Yy5sb2NrUm9vbSgnJyk7XG5cbiAgICAgICAgVG9vbGJhci51cGRhdGVMb2NrQnV0dG9uKCk7XG4gICAgfVxuXG4gICAgLy9zZXRzIG9uY2xpY2sgaGFuZGxlcnNcbiAgICBteS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBmb3IodmFyIGsgaW4gYnV0dG9uSGFuZGxlcnMpXG4gICAgICAgICAgICAkKFwiI1wiICsgaykuY2xpY2soYnV0dG9uSGFuZGxlcnNba10pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE9wZW5zIHRoZSBsb2NrIHJvb20gZGlhbG9nLlxuICAgICAqL1xuICAgIG15Lm9wZW5Mb2NrRGlhbG9nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBPbmx5IHRoZSBmb2N1cyBpcyBhYmxlIHRvIHNldCBhIHNoYXJlZCBrZXkuXG4gICAgICAgIGlmIChmb2N1cyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKHNoYXJlZEtleSkge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5NZXNzYWdlRGlhbG9nKG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBcIlRoaXMgY29udmVyc2F0aW9uIGlzIGN1cnJlbnRseSBwcm90ZWN0ZWQgYnlcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICBcIiBhIHNoYXJlZCBzZWNyZXQga2V5LlwiLFxuICAgICAgICAgICAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgXCJTZWNyZXQga2V5XCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5vcGVuTWVzc2FnZURpYWxvZyhudWxsLFxuICAgICAgICAgICAgICAgICAgICBcIlRoaXMgY29udmVyc2F0aW9uIGlzbid0IGN1cnJlbnRseSBwcm90ZWN0ZWQgYnlcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICBcIiBhIHNlY3JldCBrZXkuIE9ubHkgdGhlIG93bmVyIG9mIHRoZSBjb25mZXJlbmNlXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgXCIgY291bGQgc2V0IGEgc2hhcmVkIGtleS5cIixcbiAgICAgICAgICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIFwiU2VjcmV0IGtleVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChzaGFyZWRLZXkpIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5vcGVuVHdvQnV0dG9uRGlhbG9nKG51bGwsXG4gICAgICAgICAgICAgICAgICAgIFwiQXJlIHlvdSBzdXJlIHlvdSB3b3VsZCBsaWtlIHRvIHJlbW92ZSB5b3VyIHNlY3JldCBrZXk/XCIsXG4gICAgICAgICAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBcIlJlbW92ZVwiLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZSwgdikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRTaGFyZWRLZXkoJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2tSb29tKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5Ud29CdXR0b25EaWFsb2cobnVsbCxcbiAgICAgICAgICAgICAgICAgICAgJzxoMj5TZXQgYSBzZWNyZXQga2V5IHRvIGxvY2sgeW91ciByb29tPC9oMj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICc8aW5wdXQgaWQ9XCJsb2NrS2V5XCIgdHlwZT1cInRleHRcIicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ3BsYWNlaG9sZGVyPVwieW91ciBzaGFyZWQga2V5XCIgYXV0b2ZvY3VzPicsXG4gICAgICAgICAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBcIlNhdmVcIixcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKGUsIHYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxvY2tLZXkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9ja0tleScpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxvY2tLZXkudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0U2hhcmVkS2V5KFV0aWwuZXNjYXBlSHRtbChsb2NrS2V5LnZhbHVlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2tSb29tKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2tLZXknKS5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBPcGVucyB0aGUgaW52aXRlIGxpbmsgZGlhbG9nLlxuICAgICAqL1xuICAgIG15Lm9wZW5MaW5rRGlhbG9nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaW52aXRlTGluaztcbiAgICAgICAgaWYgKHJvb21VcmwgPT0gbnVsbCkge1xuICAgICAgICAgICAgaW52aXRlTGluayA9IFwiWW91ciBjb25mZXJlbmNlIGlzIGN1cnJlbnRseSBiZWluZyBjcmVhdGVkLi4uXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbnZpdGVMaW5rID0gZW5jb2RlVVJJKHJvb21VcmwpO1xuICAgICAgICB9XG4gICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5Ud29CdXR0b25EaWFsb2coXG4gICAgICAgICAgICBcIlNoYXJlIHRoaXMgbGluayB3aXRoIGV2ZXJ5b25lIHlvdSB3YW50IHRvIGludml0ZVwiLFxuICAgICAgICAgICAgJzxpbnB1dCBpZD1cImludml0ZUxpbmtSZWZcIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwiJyArXG4gICAgICAgICAgICAgICAgaW52aXRlTGluayArICdcIiBvbmNsaWNrPVwidGhpcy5zZWxlY3QoKTtcIiByZWFkb25seT4nLFxuICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICBcIkludml0ZVwiLFxuICAgICAgICAgICAgZnVuY3Rpb24gKGUsIHYpIHtcbiAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICBpZiAocm9vbVVybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW52aXRlUGFydGljaXBhbnRzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChyb29tVXJsKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpbnZpdGVMaW5rUmVmJykuc2VsZWN0KCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pxaV9zdGF0ZTBfYnV0dG9uSW52aXRlJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5kaXNhYmxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBJbnZpdGUgcGFydGljaXBhbnRzIHRvIGNvbmZlcmVuY2UuXG4gICAgICovXG4gICAgZnVuY3Rpb24gaW52aXRlUGFydGljaXBhbnRzKCkge1xuICAgICAgICBpZiAocm9vbVVybCA9PSBudWxsKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHZhciBzaGFyZWRLZXlUZXh0ID0gXCJcIjtcbiAgICAgICAgaWYgKHNoYXJlZEtleSAmJiBzaGFyZWRLZXkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgc2hhcmVkS2V5VGV4dCA9XG4gICAgICAgICAgICAgICAgXCJUaGlzIGNvbmZlcmVuY2UgaXMgcGFzc3dvcmQgcHJvdGVjdGVkLiBQbGVhc2UgdXNlIHRoZSBcIiArXG4gICAgICAgICAgICAgICAgXCJmb2xsb3dpbmcgcGluIHdoZW4gam9pbmluZzolMEQlMEElMEQlMEFcIiArXG4gICAgICAgICAgICAgICAgc2hhcmVkS2V5ICsgXCIlMEQlMEElMEQlMEFcIjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjb25mZXJlbmNlTmFtZSA9IHJvb21Vcmwuc3Vic3RyaW5nKHJvb21VcmwubGFzdEluZGV4T2YoJy8nKSArIDEpO1xuICAgICAgICB2YXIgc3ViamVjdCA9IFwiSW52aXRhdGlvbiB0byBhIEppdHNpIE1lZXQgKFwiICsgY29uZmVyZW5jZU5hbWUgKyBcIilcIjtcbiAgICAgICAgdmFyIGJvZHkgPSBcIkhleSB0aGVyZSwgSSUyN2QgbGlrZSB0byBpbnZpdGUgeW91IHRvIGEgSml0c2kgTWVldFwiICtcbiAgICAgICAgICAgICAgICAgICAgXCIgY29uZmVyZW5jZSBJJTI3dmUganVzdCBzZXQgdXAuJTBEJTBBJTBEJTBBXCIgK1xuICAgICAgICAgICAgICAgICAgICBcIlBsZWFzZSBjbGljayBvbiB0aGUgZm9sbG93aW5nIGxpbmsgaW4gb3JkZXJcIiArXG4gICAgICAgICAgICAgICAgICAgIFwiIHRvIGpvaW4gdGhlIGNvbmZlcmVuY2UuJTBEJTBBJTBEJTBBXCIgK1xuICAgICAgICAgICAgICAgICAgICByb29tVXJsICtcbiAgICAgICAgICAgICAgICAgICAgXCIlMEQlMEElMEQlMEFcIiArXG4gICAgICAgICAgICAgICAgICAgIHNoYXJlZEtleVRleHQgK1xuICAgICAgICAgICAgICAgICAgICBcIk5vdGUgdGhhdCBKaXRzaSBNZWV0IGlzIGN1cnJlbnRseSBvbmx5IHN1cHBvcnRlZCBieSBDaHJvbWl1bSxcIiArXG4gICAgICAgICAgICAgICAgICAgIFwiIEdvb2dsZSBDaHJvbWUgYW5kIE9wZXJhLCBzbyB5b3UgbmVlZFwiICtcbiAgICAgICAgICAgICAgICAgICAgXCIgdG8gYmUgdXNpbmcgb25lIG9mIHRoZXNlIGJyb3dzZXJzLiUwRCUwQSUwRCUwQVwiICtcbiAgICAgICAgICAgICAgICAgICAgXCJUYWxrIHRvIHlvdSBpbiBhIHNlYyFcIjtcblxuICAgICAgICBpZiAod2luZG93LmxvY2FsU3RvcmFnZS5kaXNwbGF5bmFtZSkge1xuICAgICAgICAgICAgYm9keSArPSBcIiUwRCUwQSUwRCUwQVwiICsgd2luZG93LmxvY2FsU3RvcmFnZS5kaXNwbGF5bmFtZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdpbmRvdy5vcGVuKFwibWFpbHRvOj9zdWJqZWN0PVwiICsgc3ViamVjdCArIFwiJmJvZHk9XCIgKyBib2R5LCAnX2JsYW5rJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogT3BlbnMgdGhlIHNldHRpbmdzIGRpYWxvZy5cbiAgICAgKi9cbiAgICBteS5vcGVuU2V0dGluZ3NEaWFsb2cgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5Ud29CdXR0b25EaWFsb2coXG4gICAgICAgICAgICAnPGgyPkNvbmZpZ3VyZSB5b3VyIGNvbmZlcmVuY2U8L2gyPicgK1xuICAgICAgICAgICAgICAgICc8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgaWQ9XCJpbml0TXV0ZWRcIj4nICtcbiAgICAgICAgICAgICAgICAnUGFydGljaXBhbnRzIGpvaW4gbXV0ZWQ8YnIvPicgK1xuICAgICAgICAgICAgICAgICc8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgaWQ9XCJyZXF1aXJlTmlja25hbWVzXCI+JyArXG4gICAgICAgICAgICAgICAgJ1JlcXVpcmUgbmlja25hbWVzPGJyLz48YnIvPicgK1xuICAgICAgICAgICAgICAgICdTZXQgYSBzZWNyZXQga2V5IHRvIGxvY2sgeW91ciByb29tOicgK1xuICAgICAgICAgICAgICAgICc8aW5wdXQgaWQ9XCJsb2NrS2V5XCIgdHlwZT1cInRleHRcIiBwbGFjZWhvbGRlcj1cInlvdXIgc2hhcmVkIGtleVwiJyArXG4gICAgICAgICAgICAgICAgJ2F1dG9mb2N1cz4nLFxuICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgXCJTYXZlXCIsXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvY2tLZXknKS5mb2N1cygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChlLCB2KSB7XG4gICAgICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQoJyNpbml0TXV0ZWQnKS5pcyhcIjpjaGVja2VkXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpdCBpcyBjaGVja2VkXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoJCgnI3JlcXVpcmVOaWNrbmFtZXMnKS5pcyhcIjpjaGVja2VkXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpdCBpcyBjaGVja2VkXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxvY2tLZXkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9ja0tleScpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChsb2NrS2V5LnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRTaGFyZWRLZXkobG9ja0tleS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NrUm9vbSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB0aGUgYXBwbGljYXRpb24gaW4gYW5kIG91dCBvZiBmdWxsIHNjcmVlbiBtb2RlXG4gICAgICogKGEuay5hLiBwcmVzZW50YXRpb24gbW9kZSBpbiBDaHJvbWUpLlxuICAgICAqL1xuICAgIG15LnRvZ2dsZUZ1bGxTY3JlZW4gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGZzRWxlbWVudCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcblxuICAgICAgICBpZiAoIWRvY3VtZW50Lm1vekZ1bGxTY3JlZW4gJiYgIWRvY3VtZW50LndlYmtpdElzRnVsbFNjcmVlbikge1xuICAgICAgICAgICAgLy9FbnRlciBGdWxsIFNjcmVlblxuICAgICAgICAgICAgaWYgKGZzRWxlbWVudC5tb3pSZXF1ZXN0RnVsbFNjcmVlbikge1xuICAgICAgICAgICAgICAgIGZzRWxlbWVudC5tb3pSZXF1ZXN0RnVsbFNjcmVlbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZnNFbGVtZW50LndlYmtpdFJlcXVlc3RGdWxsU2NyZWVuKEVsZW1lbnQuQUxMT1dfS0VZQk9BUkRfSU5QVVQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy9FeGl0IEZ1bGwgU2NyZWVuXG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQubW96Q2FuY2VsRnVsbFNjcmVlbikge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50Lm1vekNhbmNlbEZ1bGxTY3JlZW4oKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQud2Via2l0Q2FuY2VsRnVsbFNjcmVlbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBsb2NrIGJ1dHRvbiBzdGF0ZS5cbiAgICAgKi9cbiAgICBteS51cGRhdGVMb2NrQnV0dG9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGJ1dHRvbkNsaWNrKFwiI2xvY2tJY29uXCIsIFwiaWNvbi1zZWN1cml0eSBpY29uLXNlY3VyaXR5LWxvY2tlZFwiKTtcbiAgICB9O1xuXG4gICAgLy8gU2hvd3Mgb3IgaGlkZXMgdGhlICdyZWNvcmRpbmcnIGJ1dHRvbi5cbiAgICBteS5zaG93UmVjb3JkaW5nQnV0dG9uID0gZnVuY3Rpb24gKHNob3cpIHtcbiAgICAgICAgaWYgKCFjb25maWcuZW5hYmxlUmVjb3JkaW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc2hvdykge1xuICAgICAgICAgICAgJCgnI3JlY29yZGluZycpLmNzcyh7ZGlzcGxheTogXCJpbmxpbmVcIn0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgJCgnI3JlY29yZGluZycpLmNzcyh7ZGlzcGxheTogXCJub25lXCJ9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBUb2dnbGUgdGhlIHN0YXRlIG9mIHRoZSByZWNvcmRpbmcgYnV0dG9uXG4gICAgbXkudG9nZ2xlUmVjb3JkaW5nQnV0dG9uU3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJCgnI3JlY29yZEJ1dHRvbicpLnRvZ2dsZUNsYXNzKCdhY3RpdmUnKTtcbiAgICB9O1xuXG4gICAgLy8gU2hvd3Mgb3IgaGlkZXMgU0lQIGNhbGxzIGJ1dHRvblxuICAgIG15LnNob3dTaXBDYWxsQnV0dG9uID0gZnVuY3Rpb24oc2hvdyl7XG4gICAgICAgIGlmIChjb25maWcuaG9zdHMuY2FsbF9jb250cm9sICYmIHNob3cpIHtcbiAgICAgICAgICAgICQoJyNzaXBDYWxsQnV0dG9uJykuY3NzKHtkaXNwbGF5OiBcImlubGluZVwifSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjc2lwQ2FsbEJ1dHRvbicpLmNzcyh7ZGlzcGxheTogXCJub25lXCJ9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gbXk7XG59KFRvb2xiYXIgfHwge30pKTtcblxubW9kdWxlLmV4cG9ydHMgPSBUb29sYmFyO1xuIiwidmFyIFRvb2xiYXIgPSByZXF1aXJlKFwiLi90b29sYmFyXCIpO1xuXG52YXIgVG9vbGJhclRvZ2dsZXIgPSAoZnVuY3Rpb24obXkpIHtcbiAgICB2YXIgdG9vbGJhclRpbWVvdXRPYmplY3QsXG4gICAgICAgIHRvb2xiYXJUaW1lb3V0ID0gaW50ZXJmYWNlQ29uZmlnLklOSVRJQUxfVE9PTEJBUl9USU1FT1VUO1xuXG4gICAgLyoqXG4gICAgICogU2hvd3MgdGhlIG1haW4gdG9vbGJhci5cbiAgICAgKi9cbiAgICBteS5zaG93VG9vbGJhciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgaGVhZGVyID0gJChcIiNoZWFkZXJcIiksXG4gICAgICAgICAgICBib3R0b21Ub29sYmFyID0gJChcIiNib3R0b21Ub29sYmFyXCIpO1xuICAgICAgICBpZiAoIWhlYWRlci5pcygnOnZpc2libGUnKSB8fCAhYm90dG9tVG9vbGJhci5pcyhcIjp2aXNpYmxlXCIpKSB7XG4gICAgICAgICAgICBoZWFkZXIuc2hvdyhcInNsaWRlXCIsIHsgZGlyZWN0aW9uOiBcInVwXCIsIGR1cmF0aW9uOiAzMDB9KTtcbiAgICAgICAgICAgICQoJyNzdWJqZWN0JykuYW5pbWF0ZSh7dG9wOiBcIis9NDBcIn0sIDMwMCk7XG4gICAgICAgICAgICBpZighYm90dG9tVG9vbGJhci5pcyhcIjp2aXNpYmxlXCIpKSB7XG4gICAgICAgICAgICAgICAgYm90dG9tVG9vbGJhci5zaG93KFwic2xpZGVcIiwge2RpcmVjdGlvbjogXCJyaWdodFwiLGR1cmF0aW9uOiAzMDB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRvb2xiYXJUaW1lb3V0T2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRvb2xiYXJUaW1lb3V0T2JqZWN0KTtcbiAgICAgICAgICAgICAgICB0b29sYmFyVGltZW91dE9iamVjdCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0b29sYmFyVGltZW91dE9iamVjdCA9IHNldFRpbWVvdXQoaGlkZVRvb2xiYXIsIHRvb2xiYXJUaW1lb3V0KTtcbiAgICAgICAgICAgIHRvb2xiYXJUaW1lb3V0ID0gaW50ZXJmYWNlQ29uZmlnLlRPT0xCQVJfVElNRU9VVDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmb2N1cyAhPSBudWxsKVxuICAgICAgICB7XG4vLyAgICAgICAgICAgIFRPRE86IEVuYWJsZSBzZXR0aW5ncyBmdW5jdGlvbmFsaXR5LiBOZWVkIHRvIHVuY29tbWVudCB0aGUgc2V0dGluZ3MgYnV0dG9uIGluIGluZGV4Lmh0bWwuXG4vLyAgICAgICAgICAgICQoJyNzZXR0aW5nc0J1dHRvbicpLmNzcyh7dmlzaWJpbGl0eTpcInZpc2libGVcIn0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2hvdy9oaWRlIGRlc2t0b3Agc2hhcmluZyBidXR0b25cbiAgICAgICAgc2hvd0Rlc2t0b3BTaGFyaW5nQnV0dG9uKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEhpZGVzIHRoZSB0b29sYmFyLlxuICAgICAqL1xuICAgIHZhciBoaWRlVG9vbGJhciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGhlYWRlciA9ICQoXCIjaGVhZGVyXCIpLFxuICAgICAgICAgICAgYm90dG9tVG9vbGJhciA9ICQoXCIjYm90dG9tVG9vbGJhclwiKTtcbiAgICAgICAgdmFyIGlzVG9vbGJhckhvdmVyID0gZmFsc2U7XG4gICAgICAgIGhlYWRlci5maW5kKCcqJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgaWQgPSAkKHRoaXMpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBpZiAoJChcIiNcIiArIGlkICsgXCI6aG92ZXJcIikubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGlzVG9vbGJhckhvdmVyID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmKCQoXCIjYm90dG9tVG9vbGJhcjpob3ZlclwiKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaXNUb29sYmFySG92ZXIgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY2xlYXJUaW1lb3V0KHRvb2xiYXJUaW1lb3V0T2JqZWN0KTtcbiAgICAgICAgdG9vbGJhclRpbWVvdXRPYmplY3QgPSBudWxsO1xuXG4gICAgICAgIGlmICghaXNUb29sYmFySG92ZXIpIHtcbiAgICAgICAgICAgIGhlYWRlci5oaWRlKFwic2xpZGVcIiwgeyBkaXJlY3Rpb246IFwidXBcIiwgZHVyYXRpb246IDMwMH0pO1xuICAgICAgICAgICAgJCgnI3N1YmplY3QnKS5hbmltYXRlKHt0b3A6IFwiLT00MFwifSwgMzAwKTtcbiAgICAgICAgICAgIGlmKCQoXCIjcmVtb3RlVmlkZW9zXCIpLmhhc0NsYXNzKFwiaGlkZGVuXCIpKSB7XG4gICAgICAgICAgICAgICAgYm90dG9tVG9vbGJhci5oaWRlKFwic2xpZGVcIiwge2RpcmVjdGlvbjogXCJyaWdodFwiLCBkdXJhdGlvbjogMzAwfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0b29sYmFyVGltZW91dE9iamVjdCA9IHNldFRpbWVvdXQoaGlkZVRvb2xiYXIsIHRvb2xiYXJUaW1lb3V0KTtcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIC8qKlxuICAgICAqIERvY2tzL3VuZG9ja3MgdGhlIHRvb2xiYXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaXNEb2NrIGluZGljYXRlcyB3aGF0IG9wZXJhdGlvbiB0byBwZXJmb3JtXG4gICAgICovXG4gICAgbXkuZG9ja1Rvb2xiYXIgPSBmdW5jdGlvbihpc0RvY2spIHtcbiAgICAgICAgaWYgKGlzRG9jaykge1xuICAgICAgICAgICAgLy8gRmlyc3QgbWFrZSBzdXJlIHRoZSB0b29sYmFyIGlzIHNob3duLlxuICAgICAgICAgICAgaWYgKCEkKCcjaGVhZGVyJykuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICAgICBUb29sYmFyVG9nZ2xlci5zaG93VG9vbGJhcigpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUaGVuIGNsZWFyIHRoZSB0aW1lIG91dCwgdG8gZG9jayB0aGUgdG9vbGJhci5cbiAgICAgICAgICAgIGlmICh0b29sYmFyVGltZW91dE9iamVjdCkge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0b29sYmFyVGltZW91dE9iamVjdCk7XG4gICAgICAgICAgICAgICAgdG9vbGJhclRpbWVvdXRPYmplY3QgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKCEkKCcjaGVhZGVyJykuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICAgICBUb29sYmFyVG9nZ2xlci5zaG93VG9vbGJhcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdG9vbGJhclRpbWVvdXRPYmplY3QgPSBzZXRUaW1lb3V0KGhpZGVUb29sYmFyLCB0b29sYmFyVGltZW91dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICByZXR1cm4gbXk7XG59KFRvb2xiYXJUb2dnbGVyIHx8IHt9KSk7XG5cbm1vZHVsZS5leHBvcnRzID0gVG9vbGJhclRvZ2dsZXI7XG4iLCJ2YXIgUlRDQnJvd3NlclR5cGUgPSB7XG4gICAgUlRDX0JST1dTRVJfQ0hST01FOiBcInJ0Y19icm93c2VyLmNocm9tZVwiLFxuXG4gICAgUlRDX0JST1dTRVJfRklSRUZPWDogXCJydGNfYnJvd3Nlci5maXJlZm94XCJcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUlRDQnJvd3NlclR5cGU7IiwidmFyIFN0cmVhbUV2ZW50VHlwZXMgPSB7XG4gICAgRVZFTlRfVFlQRV9MT0NBTF9DUkVBVEVEOiBcInN0cmVhbS5sb2NhbF9jcmVhdGVkXCIsXG5cbiAgICBFVkVOVF9UWVBFX0xPQ0FMX0VOREVEOiBcInN0cmVhbS5sb2NhbF9lbmRlZFwiLFxuXG4gICAgRVZFTlRfVFlQRV9SRU1PVEVfQ1JFQVRFRDogXCJzdHJlYW0ucmVtb3RlX2NyZWF0ZWRcIixcblxuICAgIEVWRU5UX1RZUEVfUkVNT1RFX0VOREVEOiBcInN0cmVhbS5yZW1vdGVfZW5kZWRcIlxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdHJlYW1FdmVudFR5cGVzOyJdfQ==
