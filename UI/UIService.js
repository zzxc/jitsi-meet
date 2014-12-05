var VideoLayout = require("./VideoLayout.js");
var AudioLevels = require("./audiolevels/AudioLevels.js");
var Prezi = require("./prezi/Prezi.js");
var Etherpad = require("./etherpad/Etherpad.js");
var Chat = require("./chat/Chat.js");
var StreamEventTypes = require("../service/RTC/StreamEventTypes.js");
var Toolbar = require("./toolbars/toolbar");
var ToolbarToggler = require("./toolbars/toolbartoggler");
var BottomToolbar = require("./toolbars/BottomToolbar");
var KeyboardShortcut = require("./keyboardshortcuts");
var XMPPEvents = require("../service/xmpp/XMPPEvents");
var ContactList = require("./ContactList");
var EventEmitter = require("events");

var eventEmitter = new EventEmitter();

var nickname = null;

var roomName = null;


var RTCService = null;

var XMPPService = null;

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
    });
}

function setupAudioLevels() {
    require("../statistics/StatisticsService").addAudioLevelListener(AudioLevels.updateAudioLevel);
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

function UIService()
{

}

function setupToolbars() {
    Toolbar.init(UIService, XMPPService);
    BottomToolbar.init();
}

/**
 * Populates the log data
 */
function populateData() {
    var data = XMPPService.getJingleData();
    var metadata = {};
    metadata.time = new Date();
    metadata.url = window.location.href;
    metadata.ua = navigator.userAgent;
    var logger = XMPPService.getLogger();
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
    RTCService.addStreamListener(function (stream) {
        switch (stream.type)
        {
            case "audio":
                VideoLayout.changeLocalAudio(stream.getOriginalStream());
                break;
            case "video":
                VideoLayout.changeLocalVideo(stream.getOriginalStream(), true);
                break;
            case "desktop":
                VideoLayout.changeLocalVideo(stream, !require("../desktopsharing").isUsingScreenStream());
                break;
        }
    }, StreamEventTypes.EVENT_TYPE_LOCAL_CREATED);

    RTCService.addStreamListener(function (stream) {
        VideoLayout.onRemoteStreamAdded(stream);
    }, StreamEventTypes.EVENT_TYPE_REMOTE_CREATED);
    XMPPService.addListener(XMPPEvents.DISPLAY_NAME_CHANGED,
        function (peerJid, displayName, status) {
            onDisplayNameChanged(peerJid, displayName, status);
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

function onDisplayNameChanged(peerJid, displayName, status) {
    VideoLayout.onDisplayNameChanged(peerJid, displayName, status);
    ContactList.onDisplayNameChanged(peerJid, displayName);
};



UIService.start = function (init) {
    RTCService = require("../RTC/RTCService");
    XMPPService = require("../xmpp/XMPPService");
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

    document.title = interfaceConfig.APP_NAME;

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

    toastr.options = {
        "closeButton": true,
        "debug": false,
        "positionClass": "notification-bottom-right",
        "onclick": null,
        "showDuration": "300",
        "hideDuration": "1000",
        "timeOut": "2000",
        "extendedTimeOut": "1000",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut",
        "reposition": function() {
            if(Chat.isVisible() || ContactList.isVisible()) {
                $("#toast-container").addClass("toast-bottom-right-center");
            } else {
                $("#toast-container").removeClass("toast-bottom-right-center");
            }
        },
        "newestOnTop": false
    }

}

UIService.showDesktopSharingButton = function () {
    return ToolbarToggler.showDesktopSharingButton();
}

UIService.getRTCService = function()
{
    return RTCService;
}

UIService.getXMPPService = function () {
    return XMPPService;
}

UIService.chatAddError = function(errorMessage, originalText)
{
    return Chat.chatAddError(errorMessage, originalText);
}

UIService.chatSetSubject = function(text)
{
    return Chat.chatSetSubject(text);
}

UIService.updateChatConversation = function (from, displayName, message) {
    return Chat.updateChatConversation(from, displayName, message);
}


UIService.updateLocalConnectionStats = function(percent, stats)
{
    VideoLayout.updateLocalConnectionStats(percent, stats);
}

UIService.updateConnectionStats = function(jid, percent, stats)
{
    VideoLayout.updateConnectionStats(jid, percent, stats);
}

UIService.onStatsStop = function () {
    VideoLayout.onStatsStop();
}

UIService.expandConnectionIndicator = function (id) {
    VideoLayout.connectionIndicators[id].showMore();
}

UIService.changeDisplayName = function (value) {
    return VideoLayout.inputDisplayNameHandler(value);
}

UIService.toggleAudio = function () {
    return Toolbar.toggleAudio();
}

UIService.toggleVideo = function () {
    return Toolbar.toggleVideo();
}

UIService.toggleFilmStrip = function () {
    return BottomToolbar.toggleFilmStrip();
}

UIService.toggleChat = function () {
    return BottomToolbar.toggleChat();
}

UIService.toggleContactList = function () {
    return BottomToolbar.toggleContactList();
}

UIService.onMucJoined = function (jid, info, noMembers) {
    Toolbar.updateRoomUrl(window.location.href);
    document.getElementById('localNick').appendChild(
        document.createTextNode(Strophe.getResourceFromJid(jid) + ' (me)')
    );

    if (noMembers) {
        Toolbar.showSipCallButton(true);
        Toolbar.showRecordingButton(false);
    }

    if (!XMPPService.isFocus()) {
        Toolbar.showSipCallButton(false);
    }

    if (XMPPService.isFocus() && config.etherpad_base) {
        Etherpad.init();
    }

    VideoLayout.showFocusIndicator();

    // Add myself to the contact list.
    ContactList.addContact(jid);

    // Once we've joined the muc show the toolbar
    ToolbarToggler.showToolbar();

    if (info.displayName)
        onDisplayNameChanged(
            'localVideoContainer', info.displayName + ' (me)');
}


UIService.onMucEntered = function (jid, info, pres, newConference) {
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
};

UIService.onMucPresenceStatus = function ( jid, info, pres) {
    VideoLayout.setPresenceStatus(
            'participant_' + Strophe.getResourceFromJid(jid), info.status);
}

UIService.onMucLeft = function(jid)
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

UIService.showVideoForJID = function (jid) {
    var el = $('#participant_'  + jid + '>video');
    el.show();
}

UIService.hideVideoForJID = function (jid) {
    var el = $('#participant_'  + jid + '>video');
    el.hide();
}

UIService.getSelectedJID = function () {
    var largeVideoSrc = $('#largeVideo').attr('src');
    return VideoLayout.getJidFromVideoSrc(largeVideoSrc);
}

UIService.updateButtons = function (recording, sip) {
    if(recording != null)
    {
        Toolbar.showRecordingButton(recording);
    }

    if(sip != null)
    {
        Toolbar.showSipCallButton(sip);
    }
}

UIService.getCredentials = function () {
    var credentials = {};
    credentials.jid = document.getElementById('jid').value
        || config.hosts.anonymousdomain
        || config.hosts.domain || window.location.hostname;

    credentials.bosh = document.getElementById('boshURL').value || config.bosh || '/http-bind';
    credentials.password = document.getElementById('password').value;
    return credentials;
}

UIService.addNicknameListener = function (listener) {
    eventEmitter.on("nick_changed", listener);
    eventEmitter.emit("nick_changed", nickname);

}

UIService.removeNicknameListener = function (listener) {
    eventEmitter.removeListener("nick_changed", listener);
}

UIService.setNickname = function(value)
{
    nickname = value;
    eventEmitter.emit("nick_changed", value);
}

UIService.getNickname = function () {
    return nickname;
}

UIService.generateRoomName = function (authenticatedUser) {
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
    var tmpJid = XMPPService.getOwnJIDNode();

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

UIService.getRoomName = function()
{
    return roomName;
}

UIService.showLoginPopup = function (callback) {
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

UIService.disableConnect = function()
{
    document.getElementById('connect').disabled = true;
}

UIService.showLockPopup = function (jid, callback) {
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


module.exports = UIService;

