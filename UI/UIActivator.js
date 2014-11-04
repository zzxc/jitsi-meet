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

