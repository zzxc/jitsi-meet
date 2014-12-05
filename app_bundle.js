(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var RTC = require("./RTC.js");
var RTCBrowserType = require("../service/RTC/RTCBrowserType.js");
var StreamEventTypes = require("../service/RTC/StreamEventTypes.js");
var MediaStreamTypes = require("../service/RTC/MediaStreamTypes");

/**
 * Provides a wrapper class for the MediaStream.
 * 
 * TODO : Add here the src from the video element and other related properties
 * and get rid of some of the mappings that we use throughout the UI.
 */
var MediaStream = (function() {
    /**
     * Creates a MediaStream object for the given data, session id and ssrc.
     *
     * @param data the data object from which we obtain the stream,
     * the peerjid, etc.
     * @param sid the session id
     * @param ssrc the ssrc corresponding to this MediaStream
     *
     * @constructor
     */
    function MediaStreamProto(data, sid, ssrc, eventEmmiter) {
        this.sid = sid;
        this.stream = data.stream;
        this.peerjid = data.peerjid;
        this.ssrc = ssrc;
        this.type = (this.stream.getVideoTracks().length > 0)?
            MediaStreamTypes.VIDEO_TYPE : MediaStreamTypes.AUDIO_TYPE;
        this.muted = false;
        eventEmmiter.emit(StreamEventTypes.EVENT_TYPE_REMOTE_CREATED, this);
    }

    if(RTC.browser == RTCBrowserType.RTC_BROWSER_FIREFOX)
    {
        if (!MediaStream.prototype.getVideoTracks)
            MediaStream.prototype.getVideoTracks = function () { return []; };
        if (!MediaStream.prototype.getAudioTracks)
            MediaStream.prototype.getAudioTracks = function () { return []; };
    }

    MediaStreamProto.prototype.getOriginalStream = function()
    {
        return this.stream;
    }

    return MediaStreamProto;
})();


module.exports = MediaStream;

},{"../service/RTC/MediaStreamTypes":30,"../service/RTC/RTCBrowserType.js":31,"../service/RTC/StreamEventTypes.js":32,"./RTC.js":2}],2:[function(require,module,exports){
var RTCBrowserTypes = require("../service/RTC/RTCBrowserType.js");

function RTC(RTCService)
{
    this.service = RTCService;
    if (navigator.mozGetUserMedia) {
        console.log('This appears to be Firefox');
        var version = parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);
        if (version >= 22) {
            this.peerconnection = mozRTCPeerConnection;
            this.browser = RTCBrowserTypes.RTC_BROWSER_FIREFOX;
            this.getUserMedia = navigator.mozGetUserMedia.bind(navigator);
            this.pc_constraints = {};
            RTCSessionDescription = mozRTCSessionDescription;
            RTCIceCandidate = mozRTCIceCandidate;
        }
    } else if (navigator.webkitGetUserMedia) {
        console.log('This appears to be Chrome');
        this.peerconnection = webkitRTCPeerConnection;
        this.browser = RTCBrowserTypes.RTC_BROWSER_CHROME;
        this.getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
        // DTLS should now be enabled by default but..
        this.pc_constraints = {'optional': [{'DtlsSrtpKeyAgreement': 'true'}]};
        if (navigator.userAgent.indexOf('Android') != -1) {
            this.pc_constraints = {}; // disable DTLS on Android
        }
        if (!webkitMediaStream.prototype.getVideoTracks) {
            webkitMediaStream.prototype.getVideoTracks = function () {
                return this.videoTracks;
            };
        }
        if (!webkitMediaStream.prototype.getAudioTracks) {
            webkitMediaStream.prototype.getAudioTracks = function () {
                return this.audioTracks;
            };
        }
    }
    else
    {
        try { console.log('Browser does not appear to be WebRTC-capable'); } catch (e) { }

        window.location.href = 'webrtcrequired.html';
        return;
    }

    if (this.browser !== RTCBrowserTypes.RTC_BROWSER_CHROME) {
        window.location.href = 'chromeonly.html';
        return;
    }

}

RTC.prototype.getUserMediaWithConstraints
    = function(um, success_callback, failure_callback, resolution, bandwidth, fps, desktopStream) {
    var constraints = {audio: false, video: false};

    if (um.indexOf('video') >= 0) {
        constraints.video = { mandatory: {}, optional: [] };// same behaviour as true
    }
    if (um.indexOf('audio') >= 0) {
        constraints.audio = { mandatory: {}, optional: []};// same behaviour as true
    }
    if (um.indexOf('screen') >= 0) {
        constraints.video = {
            mandatory: {
                chromeMediaSource: "screen",
                googLeakyBucket: true,
                maxWidth: window.screen.width,
                maxHeight: window.screen.height,
                maxFrameRate: 3
            },
            optional: []
        };
    }
    if (um.indexOf('desktop') >= 0) {
        constraints.video = {
            mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: desktopStream,
                googLeakyBucket: true,
                maxWidth: window.screen.width,
                maxHeight: window.screen.height,
                maxFrameRate: 3
            },
            optional: []
        }
    }

    if (constraints.audio) {
        // if it is good enough for hangouts...
        constraints.audio.optional.push(
            {googEchoCancellation: true},
            {googAutoGainControl: true},
            {googNoiseSupression: true},
            {googHighpassFilter: true},
            {googNoisesuppression2: true},
            {googEchoCancellation2: true},
            {googAutoGainControl2: true}
        );
    }
    if (constraints.video) {
        constraints.video.optional.push(
            {googNoiseReduction: false}
        ); // chrome 37 workaround for issue 3807, reenable in M38
        if (um.indexOf('video') >= 0) {
            constraints.video.optional.push(
                {googLeakyBucket: true}
            );
        }
    }

    // Check if we are running on Android device
    var isAndroid = navigator.userAgent.indexOf('Android') != -1;

    if (resolution && !constraints.video || isAndroid) {
        constraints.video = { mandatory: {}, optional: [] };// same behaviour as true
    }
    // see https://code.google.com/p/chromium/issues/detail?id=143631#c9 for list of supported resolutions
    switch (resolution) {
        // 16:9 first
        case '1080':
        case 'fullhd':
            constraints.video.mandatory.minWidth = 1920;
            constraints.video.mandatory.minHeight = 1080;
            break;
        case '720':
        case 'hd':
            constraints.video.mandatory.minWidth = 1280;
            constraints.video.mandatory.minHeight = 720;
            break;
        case '360':
            constraints.video.mandatory.minWidth = 640;
            constraints.video.mandatory.minHeight = 360;
            break;
        case '180':
            constraints.video.mandatory.minWidth = 320;
            constraints.video.mandatory.minHeight = 180;
            break;
        // 4:3
        case '960':
            constraints.video.mandatory.minWidth = 960;
            constraints.video.mandatory.minHeight = 720;
            break;
        case '640':
        case 'vga':
            constraints.video.mandatory.minWidth = 640;
            constraints.video.mandatory.minHeight = 480;
            break;
        case '320':
            constraints.video.mandatory.minWidth = 320;
            constraints.video.mandatory.minHeight = 240;
            break;
        default:
            if (isAndroid) {
                constraints.video.mandatory.minWidth = 320;
                constraints.video.mandatory.minHeight = 240;
                constraints.video.mandatory.maxFrameRate = 15;
            }
            break;
    }
    if (constraints.video.mandatory.minWidth)
        constraints.video.mandatory.maxWidth = constraints.video.mandatory.minWidth;
    if (constraints.video.mandatory.minHeight)
        constraints.video.mandatory.maxHeight = constraints.video.mandatory.minHeight;

    if (bandwidth) { // doesn't work currently, see webrtc issue 1846
        if (!constraints.video) constraints.video = {mandatory: {}, optional: []};//same behaviour as true
        constraints.video.optional.push({bandwidth: bandwidth});
    }
    if (fps) { // for some cameras it might be necessary to request 30fps
        // so they choose 30fps mjpg over 10fps yuy2
        if (!constraints.video) constraints.video = {mandatory: {}, optional: []};// same behaviour as true;
        constraints.video.mandatory.minFrameRate = fps;
    }

    var isFF = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

    try {
        if (config.enableSimulcast
            && constraints.video
            && constraints.video.chromeMediaSource !== 'screen'
            && constraints.video.chromeMediaSource !== 'desktop'
            && !isAndroid

            // We currently do not support FF, as it doesn't have multistream support.
            && !isFF) {
            var simulcast = require("../simulcast/SimulcastService");
            simulcast.getUserMedia(constraints, function (stream) {
                    console.log('onUserMediaSuccess');
                    success_callback(stream);
                },
                function (error) {
                    console.warn('Failed to get access to local media. Error ', error);
                    if (failure_callback) {
                        failure_callback(error);
                    }
                });
        } else {

            this.getUserMedia(constraints,
                function (stream) {
                    console.log('onUserMediaSuccess');
                    success_callback(stream);
                },
                function (error) {
                    console.warn('Failed to get access to local media. Error ', error);
                    if (failure_callback) {
                        failure_callback(error);
                    }
                });

        }
    } catch (e) {
        console.error('GUM failed: ', e);
        if (failure_callback) {
            failure_callback(e);
        }
    }
}

RTC.prototype.obtainAudioAndVideoPermissions = function () {
    var self = this;
    this.getUserMediaWithConstraints(
        ['audio', 'video'],
        function (avStream) {
            self.handleLocalStream(avStream);
        },
        function (error) {
            console.error('failed to obtain audio/video stream - stop', error);
        },
            config.resolution || '360');

}

RTC.prototype.handleLocalStream = function(stream) {

    var audioStream = new webkitMediaStream(stream);
    var videoStream = new webkitMediaStream(stream);
    var videoTracks = stream.getVideoTracks();
    var audioTracks = stream.getAudioTracks();
    for (var i = 0; i < videoTracks.length; i++) {
        audioStream.removeTrack(videoTracks[i]);
    }
    this.service.createLocalStream(audioStream, "audio");
    for (i = 0; i < audioTracks.length; i++) {
        videoStream.removeTrack(audioTracks[i]);
    }
    this.service.createLocalStream(videoStream, "video");
}

module.exports = RTC;
},{"../service/RTC/RTCBrowserType.js":31,"../simulcast/SimulcastService":36}],3:[function(require,module,exports){
var EventEmitter = require("events");
var RTC = require("./RTC.js");
var StreamEventTypes = require("../service/RTC/StreamEventTypes.js");
var MediaStream = require("./MediaStream.js");
var XMPPEvents = require("../service/xmpp/XMPPEvents");

var eventEmitter = new EventEmitter();


function onConferenceCreated(event) {
    var DataChannels = require("./datachannels");
    DataChannels.bindDataChannelListener(event.peerconnection);
}

var RTCService = {
    rtc: null,
    localStreams: [],
    remoteStreams: {},
    localAudio: null,
    localVideo: null,
    addStreamListener: function (listener, eventType) {
        eventEmitter.on(eventType, listener);
    },
    removeStreamListener: function (listener, eventType) {
        if(!(eventType instanceof StreamEventTypes))
            throw "Illegal argument";

        eventEmitter.removeListener(eventType, listener);
    },
    createLocalStream: function (stream, type) {
        var localStream =  new require("./LocalStream")(stream, type);
        this.localStreams.push(localStream);
        if(type == "audio")
        {
            this.localAudio = localStream;
        }
        else
        {
            this.localVideo = localStream;
        }
        eventEmitter.emit(StreamEventTypes.EVENT_TYPE_LOCAL_CREATED,
            localStream);
        return localStream;
    },
    removeLocalStream: function (stream) {
        for(var i = 0; i < this.localStreams.length; i++)
        {
            if(this.localStreams[i].getOriginalStream() === stream) {
                delete this.localStreams[i];
                return;
            }
        }
    },
    createRemoteStream: function (data, sid, thessrc) {
        var remoteStream = new MediaStream(data, sid, thessrc, eventEmitter);
        this.remoteStreams[remoteStream.peerjid] = {};
        this.remoteStreams[remoteStream.peerjid][remoteStream.type]= remoteStream;
        return remoteStream;
    },
    getBrowserType: function () {
        return this.rtc.browser;
    },
    getPCConstraints: function () {
        return this.rtc.pc_constraints;
    },
    getUserMediaWithConstraints:function(um, success_callback,
                                         failure_callback, resolution,
                                         bandwidth, fps, desktopStream)
    {
        return this.rtc.getUserMediaWithConstraints(um, success_callback,
            failure_callback, resolution, bandwidth, fps, desktopStream);
    },
    dispose: function() {
        eventEmitter.removeAllListeners("statistics.audioLevel");

        if (this.rtc) {
            this.rtc = null;
        }
    },
    stop:  function () {
        this.dispose();
    },
    start: function () {
        this.rtc = new RTC(this);
        this.rtc.obtainAudioAndVideoPermissions();
        var XMPPService = require("../xmpp/XMPPService");
        XMPPService.addListener(XMPPEvents.CONFERENCE_CERATED,
            onConferenceCreated);
        XMPPService.addListener(XMPPEvents.CALL_INCOMING,
            onConferenceCreated);
    }
};

module.exports = RTCService;

},{"../service/RTC/StreamEventTypes.js":32,"../service/xmpp/XMPPEvents":33,"../xmpp/XMPPService":44,"./MediaStream.js":1,"./RTC.js":2,"./datachannels":4,"events":57}],4:[function(require,module,exports){
/* global connection, Strophe, updateLargeVideo, focusedVideoSrc*/

// cache datachannels to avoid garbage collection
// https://code.google.com/p/chromium/issues/detail?id=405545
var _dataChannels = [];



var DataChannels =
{

    /**
     * Callback triggered by PeerConnection when new data channel is opened
     * on the bridge.
     * @param event the event info object.
     */

    onDataChannel: function (event)
    {
        var dataChannel = event.channel;

        dataChannel.onopen = function () {
            console.info("Data channel opened by the Videobridge!", dataChannel);

            // Code sample for sending string and/or binary data
            // Sends String message to the bridge
            //dataChannel.send("Hello bridge!");
            // Sends 12 bytes binary message to the bridge
            //dataChannel.send(new ArrayBuffer(12));

            // when the data channel becomes available, tell the bridge about video
            // selections so that it can do adaptive simulcast,
            // we want the notification to trigger even if userJid is undefined,
            // or null.
            onSelectedEndpointChanged(require("../UI/UIService").getSelectedJID());
        };

        dataChannel.onerror = function (error) {
            console.error("Data Channel Error:", error, dataChannel);
        };

        dataChannel.onmessage = function (event) {
            var data = event.data;
            // JSON
            var obj;

            try {
                obj = JSON.parse(data);
            }
            catch (e) {
                console.error(
                    "Failed to parse data channel message as JSON: ",
                    data,
                    dataChannel);
            }
            if (('undefined' !== typeof(obj)) && (null !== obj)) {
                var colibriClass = obj.colibriClass;

                if ("DominantSpeakerEndpointChangeEvent" === colibriClass) {
                    // Endpoint ID from the Videobridge.
                    var dominantSpeakerEndpoint = obj.dominantSpeakerEndpoint;

                    console.info(
                        "Data channel new dominant speaker event: ",
                        dominantSpeakerEndpoint);
                    $(document).trigger(
                        'dominantspeakerchanged',
                        [dominantSpeakerEndpoint]);
                }
                else if ("LastNEndpointsChangeEvent" === colibriClass) {
                    // The new/latest list of last-n endpoint IDs.
                    var lastNEndpoints = obj.lastNEndpoints;
                    /*
                     * The list of endpoint IDs which are entering the list of
                     * last-n at this time i.e. were not in the old list of last-n
                     * endpoint IDs.
                     */
                    var endpointsEnteringLastN = obj.endpointsEnteringLastN;

                    var stream = obj.stream;

                    console.log(
                        "Data channel new last-n event: ",
                        lastNEndpoints, endpointsEnteringLastN, obj);

                    $(document).trigger(
                        'lastnchanged',
                        [lastNEndpoints, endpointsEnteringLastN, stream]);
                }
                else if ("SimulcastLayersChangedEvent" === colibriClass) {
                    var endpointSimulcastLayers = obj.endpointSimulcastLayers;
                    $(document).trigger('simulcastlayerschanged', [endpointSimulcastLayers]);
                }
                else if ("SimulcastLayersChangingEvent" === colibriClass) {
                    var endpointSimulcastLayers = obj.endpointSimulcastLayers;
                    $(document).trigger('simulcastlayerschanging', [endpointSimulcastLayers]);
                }
                else if ("StartSimulcastLayerEvent" === colibriClass) {
                    var simulcastLayer = obj.simulcastLayer;
                    $(document).trigger('startsimulcastlayer', simulcastLayer);
                }
                else if ("StopSimulcastLayerEvent" === colibriClass) {
                    var simulcastLayer = obj.simulcastLayer;
                    $(document).trigger('stopsimulcastlayer', simulcastLayer);
                }
                else {
                    console.debug("Data channel JSON-formatted message: ", obj);
                }
            }
        };

        dataChannel.onclose = function () {
            console.info("The Data Channel closed", dataChannel);
            var idx = _dataChannels.indexOf(dataChannel);
            if (idx > -1)
                _dataChannels = _dataChannels.splice(idx, 1);
        };
        _dataChannels.push(dataChannel);
    },

    /**
     * Binds "ondatachannel" event listener to given PeerConnection instance.
     * @param peerConnection WebRTC peer connection instance.
     */
    bindDataChannelListener: function (peerConnection) {
        if(!config.openSctp)
            retrun;

        peerConnection.ondatachannel = this.onDataChannel;

        // Sample code for opening new data channel from Jitsi Meet to the bridge.
        // Although it's not a requirement to open separate channels from both bridge
        // and peer as single channel can be used for sending and receiving data.
        // So either channel opened by the bridge or the one opened here is enough
        // for communication with the bridge.
        /*var dataChannelOptions =
         {
         reliable: true
         };
         var dataChannel
         = peerConnection.createDataChannel("myChannel", dataChannelOptions);

         // Can be used only when is in open state
         dataChannel.onopen = function ()
         {
         dataChannel.send("My channel !!!");
         };
         dataChannel.onmessage = function (event)
         {
         var msgData = event.data;
         console.info("Got My Data Channel Message:", msgData, dataChannel);
         };*/
    }

}

function onSelectedEndpointChanged(userJid)
{
    console.log('selected endpoint changed: ', userJid);
    if (_dataChannels && _dataChannels.length != 0)
    {
        _dataChannels.some(function (dataChannel) {
            if (dataChannel.readyState == 'open')
            {
                dataChannel.send(JSON.stringify({
                    'colibriClass': 'SelectedEndpointChangedEvent',
                    'selectedEndpoint': (!userJid || userJid == null)
                        ? null : Strophe.getResourceFromJid(userJid)
                }));

                return true;
            }
        });
    }
}

$(document).bind("selectedendpointchanged", function(event, userJid) {
    onSelectedEndpointChanged(userJid);
});

module.exports = DataChannels;
},{"../UI/UIService":7}],5:[function(require,module,exports){
var VideoLayout = require("./VideoLayout.js");
var XMPPService = require("../xmpp/XMPPService");

/**
 * Contact list.
 */
var ContactList = (function (my) {

    var numberOfContacts = 0;
    var notificationInterval;

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
     * @param id the user's email or userId used to get the user's avatar
     */
    my.ensureAddContact = function(peerJid, id) {
        var resourceJid = Strophe.getResourceFromJid(peerJid);

        var contact = $('#contactlist>ul>li[id="' + resourceJid + '"]');

        if (!contact || contact.length <= 0)
            ContactList.addContact(peerJid,id);
    };

    /**
     * Adds a contact for the given peer jid.
     *
     * @param peerJid the jid of the contact to add
     * @param id the email or userId of the user
     */
    my.addContact = function(peerJid, id) {
        var resourceJid = Strophe.getResourceFromJid(peerJid);

        var contactlist = $('#contactlist>ul');

        var newContact = document.createElement('li');
        // XXX(gp) contact click event handling is now in videolayout.js. Is the
        // following statement (newContact.id = resourceJid) still relevant?
        newContact.id = resourceJid;
        newContact.className = "clickable";
        newContact.onclick = function(event) {
            if(event.currentTarget.className === "clickable") {
                $(ContactList).trigger('contactclicked', [peerJid]);
            }
        };

        newContact.appendChild(createAvatar(id));
        newContact.appendChild(createDisplayNameParagraph("Participant"));

        var clElement = contactlist.get(0);

        if (resourceJid === Strophe.getResourceFromJid(XMPPService.getMyJID())
            && $('#contactlist>ul .title')[0].nextSibling.nextSibling)
        {
            clElement.insertBefore(newContact,
                    $('#contactlist>ul .title')[0].nextSibling.nextSibling);
        }
        else {
            clElement.appendChild(newContact);
        }
        updateNumberOfParticipants(1);
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

            updateNumberOfParticipants(-1);
        }
    };

//<<<<<<< HEAD:UI/ContactList.js
//    /**
//     * Opens / closes the contact list area.
//     */
//    my.toggleContactList = function () {
//        var contactlist = $('#contactlist');
//
//        var chatSize = (ContactList.isVisible()) ? [0, 0] : require("./chat/chat").getChatSize();
//        VideoLayout.resizeVideoSpace(contactlist, chatSize, ContactList.isVisible(), function () {});
//
//        if (!ContactList.isVisible()) {
//            //stop the glowing of the contact list icon
//            setVisualNotification(false);
//=======
    my.setVisualNotification = function(show, stopGlowingIn) {
        var glower = $('#contactListButton');
        function stopGlowing() {
            window.clearInterval(notificationInterval);
            notificationInterval = false;
            glower.removeClass('glowing');
            if(!ContactList.isVisible()) {
                glower.removeClass('active');
            }
        }

        if (show && !notificationInterval) {
            notificationInterval = window.setInterval(function () {
                glower.toggleClass('active glowing');
            }, 800);
        }
        else if (!show && notificationInterval) {
            stopGlowing();
        }
        if(stopGlowingIn) {
            setTimeout(stopGlowing, stopGlowingIn);
//>>>>>>> master:contact_list.js
        }
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
     * Updates the number of participants in the contact list button and sets
     * the glow
     * @param delta indicates whether a new user has joined (1) or someone has
     * left(-1)
     */
    function updateNumberOfParticipants(delta) {
        //when the user is alone we don't show the number of participants
        if(numberOfContacts === 0) {
            $("#numberOfParticipants").text('');
            numberOfContacts += delta;
        } else if(numberOfContacts !== 0 && !ContactList.isVisible()) {
            ContactList.setVisualNotification(true);
            numberOfContacts += delta;
            $("#numberOfParticipants").text(numberOfContacts);
        }
    }

    /**
     * Creates the avatar element.
     * 
     * @return the newly created avatar element
     */
    function createAvatar(id) {
        var avatar = document.createElement('img');
        avatar.className = "icon-avatar avatar";
        avatar.src = "https://www.gravatar.com/avatar/" + id + "?d=retro&size=30";

        return avatar;
    }

    /**
     * Creates the display name paragraph.
     *
     * @param displayName the display name to set
     */
    function createDisplayNameParagraph(displayName) {
        var p = document.createElement('p');
        p.innerText = displayName;

        return p;
    }


    /**
     * Indicates that the display name has changed.
     */
    my.onDisplayNameChanged =
        function (peerJid, displayName) {
            if (peerJid === 'localVideoContainer')
                peerJid = XMPPService.getMyJID();

            var resourceJid = Strophe.getResourceFromJid(peerJid);

            var contactName = $('#contactlist #' + resourceJid + '>p');

            if (contactName && displayName && displayName.length > 0)
                contactName.text(displayName);
        };

    my.setClickable = function(resourceJid, isClickable) {
        var contact = $('#contactlist>ul>li[id="' + resourceJid + '"]');
        if(isClickable) {
            contact.addClass('clickable');
        } else {
            contact.removeClass('clickable');
        }
    };

    return my;
}(ContactList || {}));

module.exports = ContactList

},{"../xmpp/XMPPService":44,"./VideoLayout.js":9}],6:[function(require,module,exports){
var JitsiPopover = (function () {
    /**
     * Constructs new JitsiPopover and attaches it to the element
     * @param element jquery selector
     * @param options the options for the popover.
     * @constructor
     */
    function JitsiPopover(element, options)
    {
        this.options = {
            skin: "white",
            content: ""
        };
        if(options)
        {
            if(options.skin)
                this.options.skin = options.skin;

            if(options.content)
                this.options.content = options.content;
        }

        this.elementIsHovered = false;
        this.popoverIsHovered = false;
        this.popoverShown = false;

        element.data("jitsi_popover", this);
        this.element = element;
        this.template = ' <div class="jitsipopover ' + this.options.skin +
            '"><div class="arrow"></div><div class="jitsipopover-content"></div>' +
            '<div class="jitsiPopupmenuPadding"></div></div>';
        var self = this;
        this.element.on("mouseenter", function () {
            self.elementIsHovered = true;
            self.show();
        }).on("mouseleave", function () {
            self.elementIsHovered = false;
            setTimeout(function () {
                self.hide();
            }, 10);
        });
    }

    /**
     * Shows the popover
     */
    JitsiPopover.prototype.show = function () {
        this.createPopover();
        this.popoverShown = true;

    };

    /**
     * Hides the popover
     */
    JitsiPopover.prototype.hide = function () {
        if(!this.elementIsHovered && !this.popoverIsHovered && this.popoverShown)
        {
            this.forceHide();
        }
    };

    /**
     * Hides the popover
     */
    JitsiPopover.prototype.forceHide = function () {
        $(".jitsipopover").remove();
        this.popoverShown = false;
    };

    /**
     * Creates the popover html
     */
    JitsiPopover.prototype.createPopover = function () {
        $("body").append(this.template);
        $(".jitsipopover > .jitsipopover-content").html(this.options.content);
        var self = this;
        $(".jitsipopover").on("mouseenter", function () {
            self.popoverIsHovered = true;
        }).on("mouseleave", function () {
            self.popoverIsHovered = false;
            self.hide();
        });

        this.refreshPosition();
    };

    /**
     * Refreshes the position of the popover
     */
    JitsiPopover.prototype.refreshPosition = function () {
        $(".jitsipopover").position({
            my: "bottom",
            at: "top",
            collision: "fit",
            of: this.element,
            using: function (position, elements) {
                var calcLeft = elements.target.left - elements.element.left + elements.target.width/2;
                $(".jitsipopover").css({top: position.top, left: position.left, display: "table"});
                $(".jitsipopover > .arrow").css({left: calcLeft});
                $(".jitsipopover > .jitsiPopupmenuPadding").css({left: calcLeft - 50});
            }
        });
    };

    /**
     * Updates the content of popover.
     * @param content new content
     */
    JitsiPopover.prototype.updateContent = function (content) {
        this.options.content = content;
        if(!this.popoverShown)
            return;
        $(".jitsipopover").remove();
        this.createPopover();
    };

    return JitsiPopover;


})();

module.exports = JitsiPopover;
},{}],7:[function(require,module,exports){
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


},{"../RTC/RTCService":3,"../desktopsharing":29,"../service/RTC/StreamEventTypes.js":32,"../service/xmpp/XMPPEvents":33,"../statistics/StatisticsService":40,"../xmpp/XMPPService":44,"./ContactList":5,"./VideoLayout.js":9,"./WelcomePage":10,"./audiolevels/AudioLevels.js":11,"./chat/Chat.js":13,"./etherpad/Etherpad.js":17,"./keyboardshortcuts":18,"./prezi/Prezi.js":19,"./toolbars/BottomToolbar":22,"./toolbars/toolbar":24,"./toolbars/toolbartoggler":25,"events":57}],8:[function(require,module,exports){
var RTCBrowserType =  require("../service/RTC/RTCBrowserType.js");

var browserType = null;

function getBrowserType()
{
    if(browserType == null)
    {
        browserType = require("./UIService").getRTCService().getBrowserType();
    }

    return browserType;
}

var UIUtil = {

    /**
     * Returns the available video width.
     */
    getAvailableVideoWidth: function () {
        var chatspaceWidth
            = $('#chatspace').is(":visible")
            ? $('#chatspace').width()
            : 0;

        return window.innerWidth - chatspaceWidth;
    },

    /**
     * Changes the style class of the element given by id.
     */
    buttonClick: function (id, classname) {
        $(id).toggleClass(classname); // add the class to the clicked element
    },

    attachMediaStream: function (element, stream) {
        switch (getBrowserType())
        {
            case RTCBrowserType.RTC_BROWSER_CHROME:
                element.attr('src', webkitURL.createObjectURL(stream));
                break;
            case RTCBrowserType.RTC_BROWSER_FIREFOX:
                element[0].mozSrcObject = stream;
                element[0].play();
                break;
            default:
                console.log("Unknown browser.");
        }
    },

    getLocalSSRC: function (session, callback) {
        switch (getBrowserType())
        {
            case RTCBrowserType.RTC_BROWSER_FIREFOX:
                session.peerconnection.getStats(function (s) {
                    var ssrcs = {};
                    s.forEach(function (item) {
                        if (item.type == "outboundrtp" && !item.isRemote)
                        {
                            ssrcs[item.id.split('_')[2]] = item.ssrc;
                        }
                    });
                    session.localStreamsSSRC = {
                        "audio": ssrcs.audio,//for stable 0
                        "video": ssrcs.video// for stable 1
                    };
                    callback(session.localStreamsSSRC);
                },
                function () {
                    callback(null);
                });
                break;
            case RTCBrowserType.RTC_BROWSER_CHROME:
                callback(null);
                break;
            default:
                console.log("Unknown browser.");
        }
    },
    getStreamID: function (stream) {
        switch (getBrowserType())
        {
            case RTCBrowserType.RTC_BROWSER_FIREFOX:
                var tracks = stream.getVideoTracks();
                if(!tracks || tracks.length == 0)
                {
                    tracks = stream.getAudioTracks();
                }
                return tracks[0].id.replace(/[\{,\}]/g,"");
                break;
            case RTCBrowserType.RTC_BROWSER_CHROME:
                return stream.id;
                break;
            default:
                console.log("Unknown browser.");
                return null;
        }
    },
    getVideoSrc: function (element) {
        switch (getBrowserType())
        {
            case RTCBrowserType.RTC_BROWSER_FIREFOX:
                return element.mozSrcObject;
            case RTCBrowserType.RTC_BROWSER_CHROME:
                return element.getAttribute("src");
                break;
            default:
                console.log("Unknown browser.");
                return null;
        }

    },
    setVideoSrc: function (element, src) {
        switch (getBrowserType())
        {
            case RTCBrowserType.RTC_BROWSER_CHROME:
                element.setAttribute("src", src);
            case RTCBrowserType.RTC_BROWSER_FIREFOX:
                element.mozSrcObject = src;
                break;
            default:
                console.log("Unknown browser.");
        }

    }
};

module.exports = UIUtil;
},{"../service/RTC/RTCBrowserType.js":31,"./UIService":7}],9:[function(require,module,exports){
var dep =
{
    "UIService": function(){ return require("./UIService.js")},
    "Chat": function(){ return require("./chat/Chat")},
    "ContactList": function(){ return require("./ContactList")},
    "ToolbarToggler": function(){ return require("./toolbars/toolbartoggler")}
}
var Util = require("../util/util");
var JitsiPopover = require("./JitsiPopover");
var simulcast = require("../simulcast/SimulcastService");
var MediaStreamTypes = require("../service/RTC/MediaStreamTypes");
var UIUtil = require("./UIUtil.js");

var VideoLayout = (function (my) {
    var currentDominantSpeaker = null;
    var lastNCount = config.channelLastN;
    var localLastNCount = config.channelLastN;
    var localLastNSet = [];
    var lastNEndpointsCache = [];
    var largeVideoNewSrc = '';
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
    var lastNPickupJid = null;
    var largeVideoState = {
        updateInProgress: false,
        newSrc: ''
    };

    var defaultLocalDisplayName = "Me";

    my.connectionIndicators = {};

    my.isInLastN = function(resource) {
        return lastNCount < 0 // lastN is disabled, return true
            || (lastNCount > 0 && lastNEndpointsCache.length == 0) // lastNEndpoints cache not built yet, return true
            || (lastNEndpointsCache && lastNEndpointsCache.indexOf(resource) !== -1);
    };

    my.changeLocalStream = my.changeLocalVideo;

    my.changeLocalAudio = function(stream) {
        UIUtil.attachMediaStream($('#localAudio'), stream);
        document.getElementById('localAudio').autoplay = true;
        document.getElementById('localAudio').volume = 0;
        if (preMuted) {
            setAudioMuted(true);
            preMuted = false;
        }
    };

    my.changeLocalVideo = function(stream, flipX) {
        var localVideo = document.createElement('video');
        localVideo.id = 'localVideo_' + UIUtil.getStreamID(stream);
        localVideo.autoplay = true;
        localVideo.volume = 0; // is it required if audio is separated ?
        localVideo.oncontextmenu = function () { return false; };

        var localVideoContainer = document.getElementById('localVideoWrapper');
        localVideoContainer.appendChild(localVideo);

        // Set default display name.
        setDisplayName('localVideoContainer');

        require("./audiolevels/AudioLevels").updateAudioLevelCanvas();
        if(!VideoLayout.connectionIndicators["localVideoContainer"]) {
            VideoLayout.connectionIndicators["localVideoContainer"]
                = new ConnectionIndicator($("#localVideoContainer")[0], null);
        }


        var localVideoSelector = $('#' + localVideo.id);
        // Add click handler to both video and video wrapper elements in case
        // there's no video.
        localVideoSelector.click(function () {
            VideoLayout.handleVideoThumbClicked(UIUtil.getVideoSrc(localVideo), false,
                dep.getUIService().getXMPPService().getMyJID());
        });
        $('#localVideoContainer').click(function () {
            VideoLayout.handleVideoThumbClicked(UIUtil.getVideoSrc(localVideo), false,
                dep.getUIService().getXMPPService().getMyJID());
        });

        // Add hover handler
        $('#localVideoContainer').hover(
            function() {
                VideoLayout.showDisplayName('localVideoContainer', true);
            },
            function() {
                if (!VideoLayout.isLargeVideoVisible()
                        || UIUtil.getVideoSrc(localVideo) !== UIUtil.getVideoSrc($('#largeVideo')[0]))
                    VideoLayout.showDisplayName('localVideoContainer', false);
            }
        );
        // Add stream ended handler
        stream.onended = function () {
            localVideoContainer.removeChild(localVideo);
            VideoLayout.updateRemovedVideo(UIUtil.getVideoSrc(localVideo));
        };
        // Flip video x axis if needed
        flipXLocalVideo = flipX;
        if (flipX) {
            localVideoSelector.addClass("flipVideoX");
        }
        // Attach WebRTC stream
        var videoStream = simulcast.getLocalVideoStream();
        UIUtil.attachMediaStream(localVideoSelector, videoStream);

        localVideoSrc = UIUtil.getVideoSrc(localVideo);

        var myResourceJid = null;
        if(connection.emuc.myroomjid)
        {
           myResourceJid = Strophe.getResourceFromJid(connection.emuc.myroomjid);
        }
        VideoLayout.updateLargeVideo(localVideoSrc, 0,
            myResourceJid);

    };

    /**
     * Checks if removed video is currently displayed and tries to display
     * another one instead.
     * @param removedVideoSrc src stream identifier of the video.
     */
    my.updateRemovedVideo = function(removedVideoSrc) {
        if (removedVideoSrc === UIUtil.getVideoSrc($('#largeVideo')[0])) {
            // this is currently displayed as large
            // pick the last visible video in the row
            // if nobody else is left, this picks the local video
            var pick
                = $('#remoteVideos>span[id!="mixedstream"]:visible:last>video')
                    .get(0);

            if (!pick) {
                console.info("Last visible video no longer exists");
                pick = $('#remoteVideos>span[id!="mixedstream"]>video').get(0);

                if (!pick || !UIUtil.getVideoSrc(pick)) {
                    // Try local video
                    console.info("Fallback to local video...");
                    pick = $('#remoteVideos>span>span>video').get(0);
                }
            }

            // mute if localvideo
            if (pick) {
                var container = pick.parentNode;
                var jid = null;
                if(container)
                {
                    if(container.id == "localVideoWrapper")
                    {
                        jid = Strophe.getResourceFromJid(connection.emuc.myroomjid);
                    }
                    else
                    {
                        jid = VideoLayout.getPeerContainerResourceJid(container);
                    }
                }

                VideoLayout.updateLargeVideo(UIUtil.getVideoSrc(pick), pick.volume, jid);
            } else {
                console.warn("Failed to elect large video");
            }
        }
    };

    my.getLargeVideoState = function () {
        return largeVideoState;
    }

    /**
     * Returns the JID of the user to whom given <tt>videoSrc</tt> belongs.
     * @param videoSrc the video "src" identifier.
     * @returns {null | String} the JID of the user to whom given <tt>videoSrc</tt>
     *                   belongs.
     */
    my.getJidFromVideoSrc = function(videoSrc)
    {
        if (videoSrc === localVideoSrc)
            return dep.UIService().getXMPPService().getMyJID();

        var ssrc = videoSrcToSsrc[videoSrc];
        if (!ssrc)
        {
            return null;
        }
        return dep.UIService().getXMPPService().getJIDFromSSRC(ssrc);
    }
    /**
     * Updates the large video with the given new video source.
     */
    my.updateLargeVideo = function(newSrc, vol, jid) {
        console.log('hover in', newSrc);

        if (UIUtil.getVideoSrc($('#largeVideo')[0]) != newSrc) {

            $('#activeSpeakerAvatar').css('visibility', 'hidden');
            // Due to the simulcast the localVideoSrc may have changed when the
            // fadeOut event triggers. In that case the getJidFromVideoSrc and
            // isVideoSrcDesktop methods will not function correctly.
            //
            // Also, again due to the simulcast, the updateLargeVideo method can
            // be called multiple times almost simultaneously. Therefore, we
            // store the state here and update only once.

            largeVideoState.newSrc = newSrc;
            largeVideoState.isVisible = $('#largeVideo').is(':visible');
            largeVideoState.isDesktop = isVideoSrcDesktop(jid);
//            var stream = dep.UIService().getRTCService().remoteStreams[largeVideoState.userJid]
            if(jid2Ssrc[largeVideoState.userJid] ||
                (dep.UIService().getXMPPService().getMyJID() &&
                    largeVideoState.userJid == Strophe.getResourceFromJid(
                    dep.UIService().getXMPPService().getMyJID())))
            {
                largeVideoState.oldJid = largeVideoState.userJid;
            }
            else
            {
                largeVideoState.oldJid = null;
            }
            largeVideoState.userJid = jid;

            // Screen stream is already rotated
            largeVideoState.flipX = (newSrc === localVideoSrc) && flipXLocalVideo;

            var userChanged = false;
            if (largeVideoState.oldJid != largeVideoState.userJid) {
                userChanged = true;
                // we want the notification to trigger even if userJid is undefined,
                // or null.
                $(document).trigger("selectedendpointchanged", [largeVideoState.userJid]);
            }

            if (!largeVideoState.updateInProgress) {
                largeVideoState.updateInProgress = true;

                var doUpdate = function () {
                    Avatar.updateActiveSpeakerAvatarSrc(largeVideoState.userJid);

                    if (!userChanged && largeVideoState.preload
                        && largeVideoState.preload != null
                        && UIUtil.getVideoSrc($(largeVideoState.preload)[0]) == newSrc)
                    {

                        console.info('Switching to preloaded video');
                        var attributes = $('#largeVideo').prop("attributes");

                        // loop through largeVideo attributes and apply them on
                        // preload.
                        $.each(attributes, function () {
                            if (this.name != 'id' && this.name != 'src') {
                                largeVideoState.preload.attr(this.name, this.value);
                            }
                        });

                        largeVideoState.preload.appendTo($('#largeVideoContainer'));
                        $('#largeVideo').attr('id', 'previousLargeVideo');
                        largeVideoState.preload.attr('id', 'largeVideo');
                        $('#previousLargeVideo').remove();

                        largeVideoState.preload.on('loadedmetadata', function (e) {
                            currentVideoWidth = this.videoWidth;
                            currentVideoHeight = this.videoHeight;
                            VideoLayout.positionLarge(currentVideoWidth, currentVideoHeight);
                        });
                        largeVideoState.preload = null;
                        largeVideoState.preload_ssrc = 0;
                    } else {
                        UIUtil.setVideoSrc($('#largeVideo')[0], largeVideoState.newSrc);
                    }

                    var videoTransform = document.getElementById('largeVideo')
                        .style.webkitTransform;

                    if (largeVideoState.flipX && videoTransform !== 'scaleX(-1)') {
                        document.getElementById('largeVideo').style.webkitTransform
                            = "scaleX(-1)";
                    }
                    else if (!largeVideoState.flipX && videoTransform === 'scaleX(-1)') {
                        document.getElementById('largeVideo').style.webkitTransform
                            = "none";
                    }

                    // Change the way we'll be measuring and positioning large video

                    getVideoSize = largeVideoState.isDesktop
                        ? getDesktopVideoSize
                        : VideoLayout.getCameraVideoSize;
                    getVideoPosition = largeVideoState.isDesktop
                        ? getDesktopVideoPosition
                        : VideoLayout.getCameraVideoPosition;


                    // Only if the large video is currently visible.
                    // Disable previous dominant speaker video.
                    if (largeVideoState.oldJid) {
                        VideoLayout.enableDominantSpeaker(largeVideoState.oldJid, false);
                    }

                    // Enable new dominant speaker in the remote videos section.
                    if (largeVideoState.userJid) {
                        VideoLayout.enableDominantSpeaker(largeVideoState.userJid, true);
                    }

                    if (userChanged && largeVideoState.isVisible) {
                        // using "this" should be ok because we're called
                        // from within the fadeOut event.
                        $(this).fadeIn(300);
                    }

                    if(userChanged) {
                        Avatar.showUserAvatar(largeVideoState.oldJid);
                    }

                    largeVideoState.updateInProgress = false;
                };

                if (userChanged) {
                    $('#largeVideo').fadeOut(300, doUpdate);
                } else {
                    doUpdate();
                }
            }
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
    function isVideoSrcDesktop(jid) {
        // FIXME: fix this mapping mess...
        // figure out if large video is desktop stream or just a camera

        if(!jid)
            return false;

        var isDesktop = false;

        if (dep.getUIService().getXMPPService().getMyJID() &&
            Strophe.getResourceFromJid(dep.getUIService().getXMPPService().getMyJID()) === jid) {
            // local video
            isDesktop = require("../desktopsharing").isUsingScreenStream();
        } else {
            // Do we have associations...
            var videoSsrc = jid2Ssrc[jid];
            if (videoSsrc) {
                var videoType = dep.UIService().getXMPPService().getVideoTypeFromSSRC(videoSsrc);
                if (videoType) {
                    // Finally there...
                    isDesktop = videoType === 'screen';
                } else {
                    console.error("No video type for ssrc: " + videoSsrc);
                }
            } else {
                console.error("No ssrc for jid: " + jid);
            }
        }
        return isDesktop;
    }


    my.handleVideoThumbClicked = function(videoSrc, noPinnedEndpointChangedEvent, jid) {
        // Restore style for previously focused video
        var oldContainer = null;
        if(focusedVideoSrc) {
            var focusJid = focusedVideoSrc.jid;
            oldContainer = getParticipantContainer(focusJid);
        }

        if (oldContainer) {
            oldContainer.removeClass("videoContainerFocused");
        }

        // Unlock current focused.
        if (VideoLayout.focusedVideoSrc && VideoLayout.focusedVideoSrc.src === videoSrc)
        {
            VideoLayout.focusedVideoSrc = null;
            var dominantSpeakerVideo = null;
            // Enable the currently set dominant speaker.
            if (currentDominantSpeaker) {
                dominantSpeakerVideo
                    = $('#participant_' + currentDominantSpeaker + '>video')
                        .get(0);

                if (dominantSpeakerVideo) {
                    VideoLayout.updateLargeVideo(UIUtil.getVideoSrc(dominantSpeakerVideo), 1, currentDominantSpeaker);
                }
            }

            if (!noPinnedEndpointChangedEvent) {
                $(document).trigger("pinnedendpointchanged");
            }
            return;
        }

        // Lock new video
        VideoLayout.focusedVideoSrc = {
            src: videoSrc,
            jid: jid
        };

        // Update focused/pinned interface.
        if (jid)
        {
            var container = getParticipantContainer(jid);
            container.addClass("videoContainerFocused");

            if (!noPinnedEndpointChangedEvent) {
                $(document).trigger("pinnedendpointchanged", [jid]);
            }
        }

        if ($('#largeVideo').attr('src') == videoSrc) {
            return;
        }

        // Triggers a "video.selected" event. The "false" parameter indicates
        // this isn't a prezi.
        $(document).trigger("video.selected", [false]);

        VideoLayout.updateLargeVideo(videoSrc, 1, Strophe.getResourceFromJid(jid));

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
        var resourceJid = largeVideoState.userJid;

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
     * @param userId user email or id for setting the avatar
     * 
     * @return Returns <tt>true</tt> if the peer container exists,
     * <tt>false</tt> - otherwise
     */
    my.ensurePeerContainerExists = function(peerJid, userId) {
        dep.ContactList().ensureAddContact(peerJid, userId);

        var resourceJid = Strophe.getResourceFromJid(peerJid);

        var videoSpanId = 'participant_' + resourceJid;

        if ($('#' + videoSpanId).length > 0) {
            // If there's been a focus change, make sure we add focus related
            // interface!!
            if (Moderator.isModerator() && $('#remote_popupmenu_' + resourceJid).length <= 0) {
                addRemoteVideoMenu(peerJid,
                    document.getElementById(videoSpanId));
            }
        }
        else {
            var container =
                VideoLayout.addRemoteVideoContainer(peerJid, videoSpanId, userId);
            Avatar.setUserAvatar(peerJid, userId);
            // Set default display name.
            setDisplayName(videoSpanId);

            VideoLayout.connectionIndicators[videoSpanId] = new ConnectionIndicator(container, peerJid);

            var nickfield = document.createElement('span');
            nickfield.className = "nick";
            nickfield.appendChild(document.createTextNode(resourceJid));
            container.appendChild(nickfield);

            // In case this is not currently in the last n we don't show it.
            if (localLastNCount
                && localLastNCount > 0
                && $('#remoteVideos>span').length >= localLastNCount + 2) {
                showPeerContainer(resourceJid, 'hide');
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
        if (Moderator.isModerator() && peerJid !== null)
            addRemoteVideoMenu(peerJid, container);

        remotes.appendChild(container);
        require("./audiolevels/AudioLevels").updateAudioLevelCanvas(peerJid);

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
                    + sid + '_' + UIUtil.getStreamID(stream);

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
                var videoStream = simulcast.getReceivingVideoStream(stream);
                UIUtil.attachMediaStream(sel, videoStream);

                if (isVideo)
                    waitForRemoteVideo(sel, thessrc, stream, peerJid);
            }

            stream.onended = function () {
                console.log('stream ended', this);

                VideoLayout.removeRemoteStreamElement(
                    stream, isVideo, container);

                // NOTE(gp) it seems that under certain circumstances, the
                // onended event is not fired and thus the contact list is not
                // updated.
                //
                // The onended event of a stream should be fired when the SSRCs
                // corresponding to that stream are removed from the SDP; but
                // this doesn't seem to always be the case, resulting in ghost
                // contacts.
                //
                // In an attempt to fix the ghost contacts problem, I'm moving
                // the removeContact() method call in app.js, inside the
                // 'muc.left' event handler.

                //if (peerJid)
                //    ContactList.removeContact(peerJid);
            };

            // Add click handler.
            container.onclick = function (event) {
                /*
                 * FIXME It turns out that videoThumb may not exist (if there is
                 * no actual video).
                 */
                var videoThumb = $('#' + container.id + '>video').get(0);

                if (videoThumb)
                    VideoLayout.handleVideoThumbClicked(UIUtil.getVideoSrc(videoThumb), false, peerJid);

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
                        videoSrc = UIUtil.getVideoSrc($('#' + container.id + '>video').get(0));
                    }

                    // If the video has been "pinned" by the user we want to
                    // keep the display name on place.
                    if (!VideoLayout.isLargeVideoVisible()
                            || videoSrc !== UIUtil.getVideoSrc($('#largeVideo')[0]))
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
     * @param isVideo <tt>true</tt> if given <tt>stream</tt> is a video one.
     * @param container
     */
    my.removeRemoteStreamElement = function (stream, isVideo, container) {
        if (!container)
            return;

        var select = null;
        var removedVideoSrc = null;
        if (isVideo) {
            select = $('#' + container.id + '>video');
            removedVideoSrc = UIUtil.getVideoSrc(select.get(0));
        }
        else
            select = $('#' + container.id + '>audio');


        // Mark video as removed to cancel waiting loop(if video is removed
        // before has started)
        select.removed = true;
        select.remove();

        var audioCount = $('#' + container.id + '>audio').length;
        var videoCount = $('#' + container.id + '>video').length;

        if (!audioCount && !videoCount) {
            console.log("Remove whole user", container.id);
            if(VideoLayout.connectionIndicators[container.id])
                VideoLayout.connectionIndicators[container.id].remove();
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
    function showPeerContainer(resourceJid, state) {
        var peerContainer = $('#participant_' + resourceJid);

        if (!peerContainer)
            return;

        var isHide = state === 'hide';
        var resizeThumbnails = false;

        if (!isHide) {
            if (!peerContainer.is(':visible')) {
                resizeThumbnails = true;
                peerContainer.show();
            }

            if (state == 'show')
            {
                // peerContainer.css('-webkit-filter', '');
                var jid = connection.emuc.findJidFromResource(resourceJid);
                Avatar.showUserAvatar(jid, false);
            }
            else // if (state == 'avatar')
            {
                // peerContainer.css('-webkit-filter', 'grayscale(100%)');
                var jid = connection.emuc.findJidFromResource(resourceJid);
                Avatar.showUserAvatar(jid, true);
            }
        }
        else if (peerContainer.is(':visible') && isHide)
        {
            resizeThumbnails = true;
            peerContainer.hide();
            if(VideoLayout.connectionIndicators['participant_' + resourceJid])
                VideoLayout.connectionIndicators['participant_' + resourceJid].hide();
        }

        if (resizeThumbnails) {
            VideoLayout.resizeThumbnails();
        }

        // We want to be able to pin a participant from the contact list, even
        // if he's not in the lastN set!
        // ContactList.setClickable(resourceJid, !isHide);

    };

    /**
     * Sets the display name for the given video span id.
     */
    function setDisplayName(videoSpanId, displayName) {
        var nameSpan = $('#' + videoSpanId + '>span.displayname');
        var defaultLocalDisplayName = interfaceConfig.DEFAULT_LOCAL_DISPLAY_NAME;

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
                    e.stopPropagation();
                    $('#localDisplayName').hide();
                    $('#editDisplayName').show();
                    $('#editDisplayName').focus();
                    $('#editDisplayName').select();

                    $('#editDisplayName').one("focusout", function (e) {
                        VideoLayout.inputDisplayNameHandler(this.value);
                    });

                    $('#editDisplayName').on('keydown', function (e) {
                        if (e.keyCode === 13) {
                            e.preventDefault();
                            VideoLayout.inputDisplayNameHandler(this.value);
                        }
                    });
                });
            }
        }
    }

    my.inputDisplayNameHandler = function (name) {
        var nickname = dep.UIService().getNickname();
        if (nickname !== name) {
            dep.UIService().setNickname(name);
            nickname  = name;
            window.localStorage.displayname = nickname;
            dep.UIService().getXMPPService().addToPresence("displayName", nickname);

            dep.Chat().setChatConversationMode(true);
        }

        if (!$('#localDisplayName').is(":visible")) {
            if (nickname)
                $('#localDisplayName').text(nickname + " (me)");
            else
                $('#localDisplayName')
                    .text(interfaceConfig.DEFAULT_LOCAL_DISPLAY_NAME);
            $('#localDisplayName').show();
        }

        $('#editDisplayName').hide();
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
     * Shows a visual indicator for the moderator of the conference.
     */
    my.showModeratorIndicator = function () {
        if (Moderator.isModerator()) {
            var indicatorSpan = $('#localVideoContainer .focusindicator');

            if (indicatorSpan.children().length === 0) {
                createModeratorIndicatorElement(indicatorSpan[0]);
            }
            else {
                Object.keys(connection.emuc.members).forEach(function (jid) {
                    var member = connection.emuc.members[jid];
                    if (member.role === 'moderator') {
                        var moderatorId
                            = 'participant_' + Strophe.getResourceFromJid(jid);

                        var moderatorContainer
                            = document.getElementById(moderatorId);

                        if (Strophe.getResourceFromJid(jid) === 'focus') {
                            // Skip server side focus
                            return;
                        }
                        if (!moderatorContainer) {
                            console.error("No moderator container for " + jid);
                            return;
                        }
                        var indicatorSpan
                            = $('#' + moderatorId + ' .focusindicator');

                        if (!indicatorSpan || indicatorSpan.length === 0) {
                            indicatorSpan = document.createElement('span');
                            indicatorSpan.className = 'focusindicator';

                            moderatorContainer.appendChild(indicatorSpan);

                            createModeratorIndicatorElement(indicatorSpan);
                        }
                    }
                });
            }
        }
    }

    /**
     * Shows video muted indicator over small videos.
     */
    my.showVideoIndicator = function(videoSpanId, isMuted) {
        var videoMutedSpan = $('#' + videoSpanId + '>span.videoMuted');

        if (isMuted === 'false') {
            if (videoMutedSpan.length > 0) {
                videoMutedSpan.popover('hide');
                videoMutedSpan.remove();
            }
        }
        else {
            if(videoMutedSpan.length == 0) {
                videoMutedSpan = document.createElement('span');
                videoMutedSpan.className = 'videoMuted';

                $('#' + videoSpanId)[0].appendChild(videoMutedSpan);

                var mutedIndicator = document.createElement('i');
                mutedIndicator.className = 'icon-camera-disabled';
                Util.setTooltip(mutedIndicator,
                    "Participant has<br/>stopped the camera.",
                    "top");
                videoMutedSpan.appendChild(mutedIndicator);
            }

            VideoLayout.updateMutePosition(videoSpanId);

        }
    };

    my.updateMutePosition = function (videoSpanId) {
        var audioMutedSpan = $('#' + videoSpanId + '>span.audioMuted');
        var connectionIndicator = $('#' + videoSpanId + '>div.connectionindicator');
        var videoMutedSpan = $('#' + videoSpanId + '>span.videoMuted');
        if(connectionIndicator.length > 0
            && connectionIndicator[0].style.display != "none") {
            audioMutedSpan.css({right: "23px"});
            videoMutedSpan.css({right: ((audioMutedSpan.length > 0? 23 : 0) + 30) + "px"});
        }
        else
        {
            audioMutedSpan.css({right: "0px"});
            videoMutedSpan.css({right: (audioMutedSpan.length > 0? 30 : 0) + "px"});
        }
    }
    /**
     * Shows audio muted indicator over small videos.
     * @param {string} isMuted
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
            if(audioMutedSpan.length == 0 ) {
                audioMutedSpan = document.createElement('span');
                audioMutedSpan.className = 'audioMuted';
                Util.setTooltip(audioMutedSpan,
                    "Participant is muted",
                    "top");

                $('#' + videoSpanId)[0].appendChild(audioMutedSpan);
                var mutedIndicator = document.createElement('i');
                mutedIndicator.className = 'icon-mic-disabled';
                audioMutedSpan.appendChild(mutedIndicator);

            }
            VideoLayout.updateMutePosition(videoSpanId);
        }
    };

    /*
     * Shows or hides the audio muted indicator over the local thumbnail video.
     * @param {boolean} isMuted
     */
    my.showLocalAudioIndicator = function(isMuted) {
        VideoLayout.showAudioIndicator('localVideoContainer', isMuted.toString());
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


        $('#activeSpeakerAvatar').css('top',
            (availableHeight - interfaceConfig.ACTIVE_SPEAKER_AVATAR_SIZE) / 2);

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

        $('.userAvatar').css('left', (width - height) / 2);

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

        var videoSpanId = null;
        var videoContainerId = null;
        if (resourceJid
                === Strophe.getResourceFromJid(dep.UIService().getXMPPService().getMyJID())) {
            videoSpanId = 'localVideoWrapper';
            videoContainerId = 'localVideoContainer';
        }
        else {
            videoSpanId = 'participant_' + resourceJid;
            videoContainerId = videoSpanId;
        }

        var displayName = resourceJid;
        var nameSpan = $('#' + videoContainerId + '>span.displayname');
        if (nameSpan.length > 0)
            displayName = nameSpan.text();

        console.log("UI enable dominant speaker",
            displayName,
            resourceJid,
            isEnable);

        videoSpan = document.getElementById(videoContainerId);

        if (!videoSpan) {
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

        if (userJid === dep.UIService().getXMPPService().getMyJID())
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

        var numvids = $('#remoteVideos>span:visible').length;
        if (localLastNCount && localLastNCount > 0) {
            numvids = Math.min(localLastNCount + 1, numvids);
        }

       // Remove the 3px borders arround videos and border around the remote
       // videos area and the 4 pixels between the local video and the others
       //TODO: Find out where the 4 pixels come from and remove them
       var availableWinWidth = videoSpaceWidth - 2 * 3 * numvids - 70 - 4;

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
     * Creates the element indicating the moderator(owner) of the conference.
     *
     * @param parentElement the parent element where the owner indicator will
     * be added
     */
    function createModeratorIndicatorElement(parentElement) {
        var moderatorIndicator = document.createElement('i');
        moderatorIndicator.className = 'fa fa-star';
        parentElement.appendChild(moderatorIndicator);

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
            dep.UIService().getXMPPService().setMute(jid, isMute);
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
            dep.UIService().getXMPPService().eject(jid);
            popupmenuElement.setAttribute('style', 'display:none;');
        };

        ejectMenuItem.appendChild(ejectLinkItem);
        popupmenuElement.appendChild(ejectMenuItem);

        var paddingSpan = document.createElement('span');
        paddingSpan.className = 'popupmenuPadding';
        popupmenuElement.appendChild(paddingSpan);
    }

    /**
     * On contact list item clicked.
     */
    $(ContactList).bind('contactclicked', function(event, jid) {
        if (!jid) {
            return;
        }

        var resource = Strophe.getResourceFromJid(jid);
        var videoContainer = $("#participant_" + resource);
        if (videoContainer.length > 0) {
            var videoThumb = $('video', videoContainer).get(0);
            // It is not always the case that a videoThumb exists (if there is
            // no actual video).
            if (videoThumb) {
                if (videoThumb.src && videoThumb.src != '') {

                    // We have a video src, great! Let's update the large video
                    // now.

                    VideoLayout.handleVideoThumbClicked(videoThumb.src, false, jid);
                } else {

                    // If we don't have a video src for jid, there's absolutely
                    // no point in calling handleVideoThumbClicked; Quite
                    // simply, it won't work because it needs an src to attach
                    // to the large video.
                    //
                    // Instead, we trigger the pinned endpoint changed event to
                    // let the bridge adjust its lastN set for myjid and store
                    // the pinned user in the lastNPickupJid variable to be
                    // picked up later by the lastN changed event handler.

                    lastNPickupJid = jid;
                    $(document).trigger("pinnedendpointchanged", [jid]);
                }
            } else if (jid == connection.emuc.myroomjid) {
                $("#localVideoContainer").click();
            }
        }
    });

    /**
     * On audio muted event.
     */
    $(document).bind('audiomuted.muc', function (event, jid, isMuted) {
        /*
         // FIXME: but focus can not mute in this case ? - check
         if (jid === dep.UIService().getXMPPService().getMyJID()) {

            // The local mute indicator is controlled locally
            return;
        }*/
        var videoSpanId = null;
        if (jid === connection.emuc.myroomjid) {
            videoSpanId = 'localVideoContainer';
        } else {
            VideoLayout.ensurePeerContainerExists(jid);
            videoSpanId = 'participant_' + Strophe.getResourceFromJid(jid);
        }

        mutedAudios[jid] = isMuted;

        if (Moderator.isModerator()) {
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
        if (jid === dep.UIService().getXMPPService().getMyJID()) {
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
        var name = null;
        if (jid === 'localVideoContainer'
            || jid === dep.UIService().getXMPPService().getMyJID()) {
            name = nickname;
            setDisplayName('localVideoContainer',
                           displayName);
        } else {
            VideoLayout.ensurePeerContainerExists(jid);
            name = $('#participant_' + Strophe.getResourceFromJid(jid) + "_name").text();
            setDisplayName(
                'participant_' + Strophe.getResourceFromJid(jid),
                displayName,
                status);
        }

        var APIConnector = require("../api/APIConnector");
        if(APIConnector.isEnabled() && APIConnector.isEventEnabled("displayNameChange"))
        {
            if(jid === 'localVideoContainer')
                jid = dep.UIService().getXMPPService().getMyJID();
            if(!name || name != displayName)
                APIConnector.triggerEvent("displayNameChange",{jid: jid, displayname: displayName});
        }
    };

    /**
     * On dominant speaker changed event.
     */
    $(document).bind('dominantspeakerchanged', function (event, resourceJid) {
        // We ignore local user events.
        if (resourceJid
                === Strophe.getResourceFromJid(dep.UIService().getXMPPService().getMyJID()))
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
                VideoLayout.updateLargeVideo(UIUtil.getVideoSrc(video[0]), resourceJid);
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

        // Say A, B, C, D, E, and F are in a conference and LastN = 3.
        //
        // If LastN drops to, say, 2, because of adaptivity, then E should see
        // thumbnails for A, B and C. A and B are in E's server side LastN set,
        // so E sees them. C is only in E's local LastN set.
        //
        // If F starts talking and LastN = 3, then E should see thumbnails for
        // F, A, B. B gets "ejected" from E's server side LastN set, but it
        // enters E's local LastN ejecting C.

        // Increase the local LastN set size, if necessary.
        if (lastNCount > localLastNCount) {
            localLastNCount = lastNCount;
        }

        // Update the local LastN set preserving the order in which the
        // endpoints appeared in the LastN/local LastN set.

        var nextLocalLastNSet = lastNEndpoints.slice(0);
        for (var i = 0; i < localLastNSet.length; i++) {
            if (nextLocalLastNSet.length >= localLastNCount) {
                break;
            }

            var resourceJid = localLastNSet[i];
            if (nextLocalLastNSet.indexOf(resourceJid) === -1) {
                nextLocalLastNSet.push(resourceJid);
            }
        }

        localLastNSet = nextLocalLastNSet;

        var updateLargeVideo = false;

        // Handle LastN/local LastN changes.
        $('#remoteVideos>span').each(function( index, element ) {
            var resourceJid = VideoLayout.getPeerContainerResourceJid(element);

            var isReceived = true;
            if (resourceJid
                && lastNEndpoints.indexOf(resourceJid) < 0
                && localLastNSet.indexOf(resourceJid) < 0) {
                console.log("Remove from last N", resourceJid);
                showPeerContainer(resourceJid, 'hide');
                isReceived = false;
            } else if (resourceJid
                && $('#participant_' + resourceJid).is(':visible')
                && lastNEndpoints.indexOf(resourceJid) < 0
                && localLastNSet.indexOf(resourceJid) >= 0) {
                showPeerContainer(resourceJid, 'avatar');
                isReceived = false;
            }

            if (!isReceived) {
                // resourceJid has dropped out of the server side lastN set, so
                // it is no longer being received. If resourceJid was being
                // displayed in the large video we have to switch to another
                // user.
                var largeVideoResource = largeVideoState.userJid;
                if (!updateLargeVideo && resourceJid === largeVideoResource) {
                    updateLargeVideo = true;
                }
            }
        });

        if (!endpointsEnteringLastN || endpointsEnteringLastN.length < 0)
            endpointsEnteringLastN = lastNEndpoints;

        if (endpointsEnteringLastN && endpointsEnteringLastN.length > 0) {
            endpointsEnteringLastN.forEach(function (resourceJid) {

                var isVisible = $('#participant_' + resourceJid).is(':visible');
                showPeerContainer(resourceJid, 'show');
                if (!isVisible) {
                    console.log("Add to last N", resourceJid);

                    var jid = dep.getUIService().getXMPPService().findJidFromResource(resourceJid);
                    var mediaStream = dep.UIService().getRTCService().remoteStreams[jid][MediaStreamTypes.VIDEO_TYPE];
                    var sel = $('#participant_' + resourceJid + '>video');

                    var videoStream = simulcast.getReceivingVideoStream(
                        mediaStream.stream);
                    UIUtil.attachMediaStream(sel, videoStream);
                    if (lastNPickupJid == mediaStream.peerjid) {
                        // Clean up the lastN pickup jid.
                        lastNPickupJid = null;

                        // Don't fire the events again, they've already
                        // been fired in the contact list click handler.
                        VideoLayout.handleVideoThumbClicked($(sel).attr('src'), false, mediaStream.peerjid);

                        updateLargeVideo = false;
                    }
                    waitForRemoteVideo(sel, mediaStream.ssrc, mediaStream.stream, resourceJid);
                }
            })
        }

        // The endpoint that was being shown in the large video has dropped out
        // of the lastN set and there was no lastN pickup jid. We need to update
        // the large video now.

        if (updateLargeVideo) {

            var resource, container, src;
            var myResource
                = Strophe.getResourceFromJid(connection.emuc.myroomjid);

            // Find out which endpoint to show in the large video.
            for (var i = 0; i < lastNEndpoints.length; i++) {
                resource = lastNEndpoints[i];
                if (!resource || resource === myResource)
                    continue;

                container = $("#participant_" + resource);
                if (container.length == 0)
                    continue;

                src = $('video', container).attr('src');
                if (!src)
                    continue;

                // videoSrcToSsrc needs to be update for this call to succeed.
                VideoLayout.updateLargeVideo(src);
                break;

            }
        }
    });

    function waitForRemoteVideo(selector, ssrc, stream) {
        if (selector.removed || !selector.parent().is(":visible")) {
            console.warn("Media removed before had started", selector);
            return;
        }

        if (stream.id === 'mixedmslabel') return;

        if (selector[0].currentTime > 0) {
            var videoStream = simulcast.getReceivingVideoStream(stream);
            UIUtil.attachMediaStream(selector, videoStream); // FIXME: why do i have to do this for FF?

            // FIXME: add a class that will associate peer Jid, video.src, it's ssrc and video type
            //        in order to get rid of too many maps
            if (ssrc && selector.attr('src')) {
                videoSrcToSsrc[selector.attr('src')] = ssrc;
            } else {
                console.warn("No ssrc given for video", selector);
                messageHandler.showError('Warning', 'No ssrc was given for the video.');
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
                VideoLayout.updateLargeVideo(UIUtil.getVideoSrc(videoelem[0]), 1, parentResourceJid);
            }

            VideoLayout.showModeratorIndicator();
        }
    };

    my.resizeVideoSpace = function(rightColumnEl, rightColumnSize, isVisible, rightColumnComplete)
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

        var completeFunction = isVisible ?
            function() {} : function () { rightColumnEl.trigger('shown');};

        videospace.animate({right: rightColumnSize[0],
                width: videospaceWidth,
                height: videospaceHeight},
            {queue: false,
                duration: 500,
                complete: completeFunction
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

        if (isVisible) {
            $("#toast-container").animate({right: '5px'},
                {queue: false,
                    duration: 500});
            rightColumnEl.hide("slide", { direction: "right",
                queue: false,
                duration: 500});
        }
        else {
            // Undock the toolbar when the chat is shown and if we're in a
            // video mode.
            if (VideoLayout.isLargeVideoVisible())
                dep.ToolbarToggler().dockToolbar(false);

            $("#toast-container").animate({right: (rightColumnSize[0] + 5) + 'px'},
                {queue: false,
                    duration: 500});
            rightColumnEl.show("slide", { direction: "right",
                queue: false,
                duration: 500,
                completeFunction: rightColumnComplete});
        }
    }

//    $(document).bind('simulcastlayerstarted', function(event) {
//        var localVideoSelector = $('#' + 'localVideo_' +
//            dep.UIService().getRTCService().localVideo.getOriginalStream().localVideo.id);
//        var simulcast = new Simulcast();
//        var stream = simulcast.getLocalVideoStream();
//
//        // Attach WebRTC stream
//        attachMediaStream(localVideoSelector, stream);

//            if (session && electedStream) {
//                var msid = simulcast.getRemoteVideoStreamIdBySSRC(primarySSRC);

//    $(document).bind('simulcastlayerstopped', function(event) {
//        var localVideoSelector = $('#' + 'localVideo_' +
//            dep.UIService().getRTCService().localVideo.getOriginalStream().localVideo.id);
//        var simulcast = new Simulcast();
//        var stream = simulcast.getLocalVideoStream();
//
//        // Attach WebRTC stream
//        attachMediaStream(localVideoSelector, stream);

//            } else {
//                console.error('Could not find a stream or a session.', session, electedStream);
//            }
//        });
//    });


    $(document).bind('simulcastlayerschanging', function (event, endpointSimulcastLayers) {
        endpointSimulcastLayers.forEach(function (esl) {

            var resource = esl.endpoint;

            // if lastN is enabled *and* the endpoint is *not* in the lastN set,
            // then ignore the event (= do not preload anything).
            //
            // The bridge could probably stop sending this message if it's for
            // an endpoint that's not in lastN.

            if (lastNCount != -1
                && (lastNCount < 1 || lastNEndpointsCache.indexOf(resource) === -1)) {
                return;
            }

            var primarySSRC = esl.simulcastLayer.primarySSRC;

            // Get session and stream from primary ssrc.
            var res = simulcast.getReceivingVideoStreamBySSRC(primarySSRC);
            var sid = res.sid;
            var electedStream = res.stream;

            if (sid && electedStream) {
                var msid = simulcast.getRemoteVideoStreamIdBySSRC(primarySSRC);

                console.info([esl, primarySSRC, msid, sid, electedStream]);

                var msidParts = msid.split(' ');

                var preload = (Strophe.getResourceFromJid(
                    dep.UIService().getXMPPService().getJIDFromSSRC(primarySSRC))
                        == largeVideoState.userJid);

                if (preload) {
                    if (largeVideoState.preload)
                    {
                        $(largeVideoState.preload).remove();
                    }
                    console.info('Preloading remote video');
                    largeVideoState.preload = $('<video autoplay></video>');
                    // ssrcs are unique in an rtp session
                    largeVideoState.preload_ssrc = primarySSRC;

                    UIUtil.attachMediaStream(largeVideoState.preload, electedStream)
                }

            } else {
                console.error('Could not find a stream or a session.', sid, electedStream);
            }
        });
    });

    /**
     * On simulcast layers changed event.
     */
    $(document).bind('simulcastlayerschanged', function (event, endpointSimulcastLayers) {
        endpointSimulcastLayers.forEach(function (esl) {

            var resource = esl.endpoint;

            // if lastN is enabled *and* the endpoint is *not* in the lastN set,
            // then ignore the event (= do not change large video/thumbnail
            // SRCs).
            //
            // Note that even if we ignore the "changed" event in this event
            // handler, the bridge must continue sending these events because
            // the simulcast code in simulcast.js uses it to know what's going
            // to be streamed by the bridge when/if the endpoint gets back into
            // the lastN set.

            if (lastNCount != -1
                && (lastNCount < 1 || lastNEndpointsCache.indexOf(resource) === -1)) {
                return;
            }

            var primarySSRC = esl.simulcastLayer.primarySSRC;

            // Get session and stream from primary ssrc.
            var res = simulcast.getReceivingVideoStreamBySSRC(primarySSRC);
            var sid = res.sid;
            var electedStream = res.stream;

            if (sid && electedStream) {
                var msid = simulcast.getRemoteVideoStreamIdBySSRC(primarySSRC);

                console.info('Switching simulcast substream.');

                var msidParts = msid.split(' ');
                var selRemoteVideo = $(['#', 'remoteVideo_', sid, '_', msidParts[0]].join(''));

                var updateLargeVideo = (Strophe.getResourceFromJid(
                    dep.UIService().getXMPPService().getJIDFromSSRC(primarySSRC))
                    == largeVideoState.userJid);
                var updateFocusedVideoSrc = (VideoLayout.focusedVideoSrc && VideoLayout.focusedVideoSrc.src &&
                    VideoLayout.focusedVideoSrc.src != '' &&
                    (UIUtil.getVideoSrc(selRemoteVideo[0]) == VideoLayout.focusedVideoSrc.src));

                var electedStreamUrl;
                if (largeVideoState.preload_ssrc == primarySSRC)
                {
                    UIUtil.setVideoSrc(selRemoteVideo[0], UIUtil.getVideoSrc(largeVideoState.preload[0]));
                }
                else
                {
                    if (largeVideoState.preload
                        && largeVideoState.preload != null) {
                        $(largeVideoState.preload).remove();
                    }

                    largeVideoState.preload_ssrc = 0;

                    UIUtil.attachMediaStream(selRemoteVideo, electedStream);
                }

                var jid = dep.UIService().getXMPPService().getJIDFromSSRC(primarySSRC);

                if (updateLargeVideo) {
                    VideoLayout.updateLargeVideo(UIUtil.getVideoSrc(selRemoteVideo[0]), null,
                        Strophe.getResourceFromJid(jid));
                }

                if (updateFocusedVideoSrc) {
                    VideoLayout.focusedVideoSrc = electedStreamUrl;
                }

                var videoId;
                if(resource == Strophe.getResourceFromJid(dep.UIService().getXMPPService().getMyJID()))
                {
                    VideoLayout.focusedVideoSrc.src = UIUtil.getVideoSrc(selRemoteVideo[0]);
                    videoId = "localVideoContainer";
                }
                else
                {
                    videoId = "participant_" + resource;
                }
                var connectionIndicator = VideoLayout.connectionIndicators[videoId];
                if(connectionIndicator)
                    connectionIndicator.updatePopoverData();

            } else {
                console.error('Could not find a stream or a session.', electedStream);
            }
        });
    });

    /**
     * Constructs new connection indicator.
     * @param videoContainer the video container associated with the indicator.
     * @constructor
     */
    function ConnectionIndicator(videoContainer, jid)
    {
        this.videoContainer = videoContainer;
        this.bandwidth = null;
        this.packetLoss = null;
        this.bitrate = null;
        this.showMoreValue = false;
        this.resolution = null;
        this.transport = [];
        this.popover = null;
        this.jid = jid;
        this.create();
    }

    /**
     * Values for the connection quality
     * @type {{98: string, 81: string, 64: string, 47: string, 30: string, 0: string}}
     */
    ConnectionIndicator.connectionQualityValues = {
        98: "18px", //full
        81: "15px",//4 bars
        64: "11px",//3 bars
        47: "7px",//2 bars
        30: "3px",//1 bar
        0: "0px"//empty
    };

    ConnectionIndicator.getIP = function(value)
    {
        return value.substring(0, value.lastIndexOf(":"));
    };

    ConnectionIndicator.getPort = function(value)
    {
        return value.substring(value.lastIndexOf(":") + 1, value.length);
    };

    ConnectionIndicator.getStringFromArray = function (array) {
        var res = "";
        for(var i = 0; i < array.length; i++)
        {
            res += (i == 0? "" : ", ") + array[i];
        }
        return res;
    }
    /**
     * Generates the html content.
     * @returns {string} the html content.
     */
    ConnectionIndicator.prototype.generateText = function () {
        var downloadBitrate, uploadBitrate, packetLoss, resolution;

        if(this.bitrate === null)
        {
            downloadBitrate = "N/A";
            uploadBitrate = "N/A";
        }
        else
        {
            downloadBitrate = this.bitrate.download? this.bitrate.download + " Kbps" : "N/A";
            uploadBitrate = this.bitrate.upload? this.bitrate.upload + " Kbps" : "N/A";
        }

        if(this.packetLoss === null)
        {
            packetLoss = "N/A";
        }
        else
        {

            packetLoss = "<span class='jitsipopover_green'>&darr;</span>" +
                (this.packetLoss.download != null? this.packetLoss.download : "N/A") +
                "% <span class='jitsipopover_orange'>&uarr;</span>" +
                (this.packetLoss.upload != null? this.packetLoss.upload : "N/A") + "%";
        }

        var resolutionValue = null;
        if(this.resolution)
        {
            var keys = Object.keys(this.resolution);
            if(keys.length == 1)
            {
                for(var ssrc in this.resolution)
                {
                    resolutionValue = this.resolution[ssrc];
                }
            }
            else if(keys.length > 1)
            {
                var displayedSsrc = simulcast.getReceivingSSRC(this.jid);
                resolutionValue = this.resolution[displayedSsrc];
            }
        }

        if(this.jid==null)
        {
            resolution = "";
            if(this.resolution == null || !Object.keys(this.resolution)
                || Object.keys(this.resolution).length == 0)
            {
                resolution = "N/A";
            }
            else
                for(var i in this.resolution)
                {
                    resolutionValue = this.resolution[i];
                    if(resolutionValue)
                    {
                        if(resolutionValue.height &&
                            resolutionValue.width)
                        {
                            resolution += (resolution == ""? "" : ", ")
                                + resolutionValue.width + "x" + resolutionValue.height;
                        }
                    }
                }
        }
        else if(!resolutionValue ||
            !resolutionValue.height ||
            !resolutionValue.width)
        {
            resolution = "N/A";
        }
        else
        {
            resolution = resolutionValue.width + "x" + resolutionValue.height;
        }

        var result = "<table style='width:100%'><tr><td><span class='jitsipopover_blue'>Bitrate:</span></td><td><span class='jitsipopover_green'>&darr;</span>" +
            downloadBitrate + " <span class='jitsipopover_orange'>&uarr;</span>" +
            uploadBitrate + "</td></tr><tr><td>" +
            "<tr><td><span class='jitsipopover_blue'>Packet loss: </span></td><td>" + packetLoss  + "</td></tr><tr><td>" +
            "<span class='jitsipopover_blue'>Resolution:</span></td><td>" + resolution + "</td></tr></table>";

        if(this.videoContainer.id == "localVideoContainer")
            result += "<div class=\"jitsipopover_showmore\" onclick = \"window.expandConnectionIndicator('" +
                 this.videoContainer.id + "')\">" + (this.showMoreValue? "Show less" : "Show More") + "</div><br />";

        if(this.showMoreValue)
        {
            var downloadBandwidth, uploadBandwidth, transport;
            if(this.bandwidth === null)
            {
                downloadBandwidth = "N/A";
                uploadBandwidth = "N/A";
            }
            else
            {
                downloadBandwidth = this.bandwidth.download? this.bandwidth.download + " Kbps" : "N/A";
                uploadBandwidth = this.bandwidth.upload? this.bandwidth.upload + " Kbps" : "N/A";
            }

            if(!this.transport || this.transport.length === 0)
            {
                transport = "<tr><td><span class='jitsipopover_blue'>Address:</span></td><td> N/A</td></tr>";
            }
            else
            {
                var data = {remoteIP: [], localIP:[], remotePort:[], localPort:[]};
                for(var i = 0; i < this.transport.length; i++)
                {
                    var ip =  ConnectionIndicator.getIP(this.transport[i].ip);
                    var port = ConnectionIndicator.getPort(this.transport[i].ip);
                    var localIP = ConnectionIndicator.getIP(this.transport[i].localip);
                    var localPort = ConnectionIndicator.getPort(this.transport[i].localip);
                    if(data.remoteIP.indexOf(ip) == -1)
                    {
                       data.remoteIP.push(ip);
                    }

                    if(data.remotePort.indexOf(port) == -1)
                    {
                        data.remotePort.push(port);
                    }

                    if(data.localIP.indexOf(localIP) == -1)
                    {
                        data.localIP.push(localIP);
                    }

                    if(data.localPort.indexOf(localPort) == -1)
                    {
                        data.localPort.push(localPort);
                    }

                }
                var localTransport = "<tr><td><span class='jitsipopover_blue'>Local address" +
                    (data.localIP.length > 1? "es" : "") + ": </span></td><td> " +
                     ConnectionIndicator.getStringFromArray(data.localIP) + "</td></tr>";
                transport = "<tr><td><span class='jitsipopover_blue'>Remote address"+
                    (data.remoteIP.length > 1? "es" : "") + ":</span></td><td> " +
                    ConnectionIndicator.getStringFromArray(data.remoteIP) + "</td></tr>";
                if(this.transport.length > 1)
                {
                    transport += "<tr><td><span class='jitsipopover_blue'>Remote ports:</span></td><td>";
                    localTransport += "<tr><td><span class='jitsipopover_blue'>Local ports:</span></td><td>";
                }
                else
                {
                    transport += "<tr><td><span class='jitsipopover_blue'>Remote port:</span></td><td>";
                    localTransport += "<tr><td><span class='jitsipopover_blue'>Local port:</span></td><td>";
                }

                transport += ConnectionIndicator.getStringFromArray(data.remotePort);
                localTransport += ConnectionIndicator.getStringFromArray(data.localPort);
                transport += "</td></tr>";
                transport += localTransport + "</td></tr>";
                transport +="<tr><td><span class='jitsipopover_blue'>Transport:</span></td><td>" + this.transport[0].type + "</td></tr>";

            }

            result += "<table  style='width:100%'><tr><td><span class='jitsipopover_blue'>Estimated bandwidth:</span> </td><td>" +
                "<span class='jitsipopover_green'>&darr;</span>" + downloadBandwidth +
                " <span class='jitsipopover_orange'>&uarr;</span>" +
                uploadBandwidth + "</td></tr>";

            result += transport + "</table>";

        }

        return result;
    };

    window.expandConnectionIndicator = function (id) {
        VideoLayout.connectionIndicators[id].showMore();
    }
    /**
     * Shows or hide the additional information.
     */
    ConnectionIndicator.prototype.showMore = function () {
        this.showMoreValue = !this.showMoreValue;
        this.updatePopoverData();
    };

    /**
     * Creates the indicator
     */
    ConnectionIndicator.prototype.create = function () {
        this.connectionIndicatorContainer = document.createElement("div");
        this.connectionIndicatorContainer.className = "connectionindicator";
        this.connectionIndicatorContainer.style.display = "none";
        this.videoContainer.appendChild(this.connectionIndicatorContainer);
        this.popover = new JitsiPopover($("#" + this.videoContainer.id + " > .connectionindicator"),
            {content: "<div class=\"connection_info\">Come back here for " +
                "connection information once the conference starts</div>", skin: "black"});

        function createIcon(classes)
        {
            var icon = document.createElement("span");
            for(var i in classes)
            {
                icon.classList.add(classes[i]);
            }
            icon.appendChild(document.createElement("i")).classList.add("icon-connection");
            return icon;
        }
        this.emptyIcon = this.connectionIndicatorContainer.appendChild(
            createIcon(["connection", "connection_empty"]));
        this.fullIcon = this.connectionIndicatorContainer.appendChild(
            createIcon(["connection", "connection_full"]));

    };

    /**
     * Removes the indicator
     */
    ConnectionIndicator.prototype.remove = function()
    {
        this.connectionIndicatorContainer.remove();
        this.popover.forceHide();

    };

    /**
     * Updates the data of the indicator
     * @param percent the percent of connection quality
     * @param object the statistics data.
     */
    ConnectionIndicator.prototype.updateConnectionQuality = function (percent, object) {

        if(percent === null)
        {
            this.connectionIndicatorContainer.style.display = "none";
            this.popover.forceHide();
            return;
        }
        else
        {
            if(this.connectionIndicatorContainer.style.display == "none") {
                this.connectionIndicatorContainer.style.display = "block";
                VideoLayout.updateMutePosition(this.videoContainer.id);
            }
        }
        this.bandwidth = object.bandwidth;
        this.bitrate = object.bitrate;
        this.packetLoss = object.packetLoss;
        this.transport = object.transport;
        if(object.resolution)
        {
            this.resolution = object.resolution;
        }
        for(var quality in ConnectionIndicator.connectionQualityValues)
        {
            if(percent >= quality)
            {
                this.fullIcon.style.width = ConnectionIndicator.connectionQualityValues[quality];
            }
        }
        this.updatePopoverData();
    };

    /**
     * Updates the resolution
     * @param resolution the new resolution
     */
    ConnectionIndicator.prototype.updateResolution = function (resolution) {
        this.resolution = resolution;
        this.updatePopoverData();
    };

    /**
     * Updates the content of the popover
     */
    ConnectionIndicator.prototype.updatePopoverData = function () {
        this.popover.updateContent("<div class=\"connection_info\">" + this.generateText() + "</div>");

    };

    /**
     * Hides the popover
     */
    ConnectionIndicator.prototype.hide = function () {
        this.popover.forceHide();
    };

    /**
     * Hides the indicator
     */
    ConnectionIndicator.prototype.hideIndicator = function () {
        this.connectionIndicatorContainer.style.display = "none";
        if(this.popover)
            this.popover.forceHide();
    };

    /**
     * Updates the data for the indicator
     * @param id the id of the indicator
     * @param percent the percent for connection quality
     * @param object the data
     */
    function updateStatsIndicator(id, percent, object) {
        if(VideoLayout.connectionIndicators[id])
            VideoLayout.connectionIndicators[id].updateConnectionQuality(percent, object);
    }

    /**
     * Updates local stats
     * @param percent
     * @param object
     */
    my.updateLocalConnectionStats = function (percent, object) {
        var resolution = null;
        if(object.resolution !== null)
        {
            resolution = object.resolution;
            object.resolution = resolution[dep.UIService().getXMPPService().getMyJID()];
            delete resolution[dep.UIService().getXMPPService().getMyJID()];
        }
        updateStatsIndicator("localVideoContainer", percent, object);
        for(var jid in resolution)
        {
            if(resolution[jid] === null)
                continue;
            var id = 'participant_' + Strophe.getResourceFromJid(jid);
            if(VideoLayout.connectionIndicators[id])
            {
                VideoLayout.connectionIndicators[id].updateResolution(resolution[jid]);
            }
        }

    };

    /**
     * Updates remote stats.
     * @param jid the jid associated with the stats
     * @param percent the connection quality percent
     * @param object the stats data
     */
    my.updateConnectionStats = function (jid, percent, object) {
        var resourceJid = Strophe.getResourceFromJid(jid);

        var videoSpanId = 'participant_' + resourceJid;
        updateStatsIndicator(videoSpanId, percent, object);
    };

    /**
     * Removes the connection
     * @param jid
     */
    my.removeConnectionIndicator = function (jid) {
        if(VideoLayout.connectionIndicators['participant_' + Strophe.getResourceFromJid(jid)])
            VideoLayout.connectionIndicators['participant_' + Strophe.getResourceFromJid(jid)].remove();
    };

    /**
     * Hides the connection indicator
     * @param jid
     */
    my.hideConnectionIndicator = function (jid) {
        if(VideoLayout.connectionIndicators['participant_' + Strophe.getResourceFromJid(jid)])
            VideoLayout.connectionIndicators['participant_' + Strophe.getResourceFromJid(jid)].hide();
    };

    /**
     * Hides all the indicators
     */
    my.onStatsStop = function () {
        for(var indicator in VideoLayout.connectionIndicators)
        {
            VideoLayout.connectionIndicators[indicator].hideIndicator();
        }
    };

    return my;
}(VideoLayout || {}));

module.exports = VideoLayout;

},{"../api/APIConnector":26,"../desktopsharing":29,"../service/RTC/MediaStreamTypes":30,"../simulcast/SimulcastService":36,"../util/util":43,"./ContactList":5,"./JitsiPopover":6,"./UIService.js":7,"./UIUtil.js":8,"./audiolevels/AudioLevels":11,"./chat/Chat":13,"./toolbars/toolbartoggler":25}],10:[function(require,module,exports){
var updateTimeout;
var animateTimeout;
var RoomNameGenerator = require("../util/roomname_generator");

function setupWelcomePage() {
    $("#domain_name").text(window.location.protocol + "//" + window.location.host + "/");
    $("span[name='appName']").text(interfaceConfig.appName);
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

},{"../util/roomname_generator":41}],11:[function(require,module,exports){
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
        if (resourceJid === require("../../statistics/StatisticsService").LOCAL_JID)
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

},{"../../statistics/StatisticsService":40,"../VideoLayout":9,"./CanvasUtil.js":12}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
/* global $, Util, connection, nickname:true, getVideoSize, getVideoPosition, showToolbar, processReplacements */
var Replacement = require("./Replacement.js");
var dep = {
    "VideoLayout": function(){ return require("../VideoLayout")},
    "UIService": function () {
        return require("../UIService");
    }
};

var Util = require("../../util/util");
var CommandsProcessor = require("./commands");

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
            dep.UIService().setNickname(storedDisplayName);
            nickname = storedDisplayName;
            Chat.setChatConversationMode(true);
        }

        $('#nickinput').keydown(function (event) {
            if (event.keyCode === 13) {
                event.preventDefault();
                var val = Util.escapeHtml(this.value);
                this.value = '';
                if (!dep.UIService().getNickname()) {
                    dep.UIService().setNickname(val);
                    window.localStorage.displayname = val;
                    //this should be changed
                    dep.UIService().getXMPPService().addToPresence("displayName", val);
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
                    dep.UIService().getXMPPService().sendMessage(message, dep.UIService().getNickname());
                }
            }
        });

        var onTextAreaResize = function () {
            resizeChatConversation();
            Chat.scrollChatToBottom();
        };
        $('#usermsg').autosize({callback: onTextAreaResize});

        $("#chatspace").bind("shown",
            function () {
                scrollChatToBottom();
                unreadMessages = 0;
                setVisualNotification(false);
            });

        addSmileys();
    };

    /**
     * Appends the given message to the chat conversation.
     */
    my.updateChatConversation = function (from, displayName, message) {
        var divClassName = '';

        if (dep.UIService().getXMPPService().getMyJID() === from) {
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

        var messageContainer =
            '<div class="chatmessage">'+
                '<img src="../images/chatArrow.svg" class="chatArrow">' +
                '<div class="username ' + divClassName +'">' + escDisplayName + '</div>' +
                '<div class="timestamp">' + getCurrentTime() + '</div>' +
                '<div class="usermessage">' + message + '</div>' +
            '</div>';

        $('#chatconversation').append(messageContainer);
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

//<<<<<<< HEAD:UI/chat/chat.js
//    /**
//     * Opens / closes the chat area.
//     */
//    my.toggleChat = function () {
//
//        var chatspace = $('#chatspace');
//
//        var chatSize = (chatspace.is(":visible")) ? [0, 0] : Chat.getChatSize();
//        dep.VideoLayout().resizeVideoSpace(chatspace, chatSize, chatspace.is(":visible"),
//            function () {
//
//                // Request the focus in the nickname field or the chat input field.
//                if ($('#nickname').css('visibility') === 'visible') {
//                    $('#nickinput').focus();
//                } else {
//                    $('#usermsg').focus();
//                }
//            });
//        Chat.resizeChat();
//    };
//=======
//
//>>>>>>> master:chat.js

    /**
     * Sets the chat conversation mode.
     */
    my.setChatConversationMode = function (isConversationMode) {
        if (isConversationMode) {
            $('#nickname').css({visibility: 'hidden'});
            $('#chatconversation').css({visibility: 'visible'});
            $('#usermsg').css({visibility: 'visible'});
            $('#smileysarea').css({visibility: 'visible'});
            $('#usermsg').focus();
        }
    };

    /**
     * Resizes the chat area.
     */
    my.resizeChat = function () {
        var chatSize = PanelToggler.getPanelSize();

        $('#chatspace').width(chatSize[0]);
        $('#chatspace').height(chatSize[1]);

        resizeChatConversation();
    };

    /**
     * Indicates if the chat is currently visible.
     */
    my.isVisible = function () {
        return $('#chatspace').is(":visible");
    };
    /**
     * Shows and hides the window with the smileys
     */
    my.toggleSmileys = function() {
        var smileys = $('#smileysContainer');
        if(!smileys.is(':visible')) {
            smileys.show("slide", { direction: "down", duration: 300});
        } else {
            smileys.hide("slide", { direction: "down", duration: 300});
        }
        $('#usermsg').focus();
    };

    /**
     * Scrolls chat to the bottom.
     */
    my.scrollChatToBottom = function() {
        setTimeout(function () {
            $('#chatconversation').scrollTop(
                $('#chatconversation')[0].scrollHeight);
        }, 5);
    };

    /**
     * Adds the smileys container to the chat
     */
    function addSmileys() {
        var smileysContainer = document.createElement('div');
        smileysContainer.id = 'smileysContainer';
        function addClickFunction(smiley, number) {
            smiley.onclick = function addSmileyToMessage() {
                var usermsg = $('#usermsg');
                var message = usermsg.val();
                message += smileys['smiley' + number];
                usermsg.val(message);
                usermsg.get(0).setSelectionRange(message.length, message.length);
                Chat.toggleSmileys();
                usermsg.focus();
            };
        }
        for(var i = 1; i <= 21; i++) {
            var smileyContainer = document.createElement('div');
            smileyContainer.id = 'smiley' + i;
            smileyContainer.className = 'smileyContainer';
            var smiley = document.createElement('img');
            smiley.src = 'images/smileys/smiley' + i + '.svg';
            smiley.className =  'smiley';
            addClickFunction(smiley, i);
            smileyContainer.appendChild(smiley);
            smileysContainer.appendChild(smileyContainer);
        }

        $("#chatspace").append(smileysContainer);
    }

    /**
     * Resizes the chat conversation.
     */
    function resizeChatConversation() {
        var msgareaHeight = $('#usermsg').outerHeight();
        var chatspace = $('#chatspace');
        var width = chatspace.width();
        var chat = $('#chatconversation');
        var smileys = $('#smileysarea');

        smileys.height(msgareaHeight);
        $("#smileys").css('bottom', (msgareaHeight - 26) / 2);
        $('#smileysContainer').css('bottom', msgareaHeight);
        chat.width(width - 10);
        chat.height(window.innerHeight - 15 - msgareaHeight);
    }

    /**
     * Shows/hides a visual notification, indicating that a message has arrived.
     */
    function setVisualNotification(show) {
        var unreadMsgElement = document.getElementById('unreadMessages');
        var unreadMsgBottomElement = document.getElementById('bottomUnreadMessages');

        var glower = $('#chatButton');
        var bottomGlower = $('#chatBottomButton');

        if (unreadMessages) {
            unreadMsgElement.innerHTML = unreadMessages.toString();
            unreadMsgBottomElement.innerHTML = unreadMessages.toString();

            require("../toolbars/Toolbar").dockToolbar(true);

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

            var chatBottomButtonElement
                = document.getElementById('chatBottomButton').parentNode;
            var bottomLeftIndent = (Util.getTextWidth(chatBottomButtonElement) -
                Util.getTextWidth(unreadMsgBottomElement)) / 2;
            var bottomTopIndent = (Util.getTextHeight(chatBottomButtonElement) -
                Util.getTextHeight(unreadMsgBottomElement)) / 2 - 2;

            unreadMsgBottomElement.setAttribute(
                'style',
                    'top:' + bottomTopIndent +
                    '; left:' + bottomLeftIndent + ';');


            if (!glower.hasClass('icon-chat-simple')) {
                glower.removeClass('icon-chat');
                glower.addClass('icon-chat-simple');
            }
        }
        else {
            unreadMsgElement.innerHTML = '';
            unreadMsgBottomElement.innerHTML = '';
            glower.removeClass('icon-chat-simple');
            glower.addClass('icon-chat');
        }

        if (show && !notificationInterval) {
            notificationInterval = window.setInterval(function () {
                glower.toggleClass('active');
                bottomGlower.toggleClass('active glowing');
            }, 800);
        }
        else if (!show && notificationInterval) {
            window.clearInterval(notificationInterval);
            notificationInterval = false;
            glower.removeClass('active');
            bottomGlower.removeClass('glowing');
            bottomGlower.addClass('active');
        }
    }


    /**
     * Returns the current time in the format it is shown to the user
     * @returns {string}
     */
    function getCurrentTime() {
        var now     = new Date();
        var hour    = now.getHours();
        var minute  = now.getMinutes();
        var second  = now.getSeconds();
        if(hour.toString().length === 1) {
            hour = '0'+hour;
        }
        if(minute.toString().length === 1) {
            minute = '0'+minute;
        }
        if(second.toString().length === 1) {
            second = '0'+second;
        }
        return hour+':'+minute+':'+second;
    }

    return my;
}(Chat || {}));

module.exports = Chat;

},{"../../util/util":43,"../UIService":7,"../VideoLayout":9,"../toolbars/Toolbar":23,"./Replacement.js":14,"./commands":16}],14:[function(require,module,exports){
var smileys = {
    "smiley1": ':)',
    "smiley2": ':(',
    "smiley3": ':D',
    "smiley4": '(y)',
    "smiley5": ' :P',
    "smiley6": '(wave)',
    "smiley7": '(blush)',
    "smiley8": '(chuckle)',
    "smiley9": '(shoked)',
    "smiley10": ':*',
    "smiley11": '(n)',
    "smiley12": '(search)',
    "smiley13": ' <3',
    "smiley14": '(oops)',
    "smiley15": '(angry)',
    "smiley16": '(angel)',
    "smiley17": '(sick)',
    "smiley18": ';(',
    "smiley19": '(bomb)',
    "smiley20": '(clap)',
    "smiley21": ' ;)'
};

var regexs = {
    'smiley2': /(:-\(\(|:-\(|:\(\(|:\(|\(sad\))/gi,
    'smiley3': /(:-\)\)|:\)\)|\(lol\)|:-D|:D)/gi,
    'smiley1': /(:-\)|:\))/gi,
    'smiley4': /(\(y\)|\(Y\)|\(ok\))/gi,
    'smiley5': /(:-P|:P|:-p|:p)/gi,
    'smiley6': /(\(wave\))/gi,
    'smiley7': /(\(blush\))/gi,
    'smiley8': /(\(chuckle\))/gi,
    'smiley9': /(:-0|\(shocked\))/gi,
    'smiley10': /(:-\*|:\*|\(kiss\))/gi,
    'smiley11': /(\(n\))/gi,
    'smiley12': /(\(search\))/g,
    'smiley13': /(<3|&lt;3|&amp;lt;3|\(L\)|\(l\)|\(H\)|\(h\))/gi,
    'smiley14': /(\(oops\))/gi,
    'smiley15': /(\(angry\))/gi,
    'smiley16': /(\(angel\))/gi,
    'smiley17': /(\(sick\))/gi,
    'smiley18': /(;-\(\(|;\(\(|;-\(|;\(|:'\(|:'-\(|:~-\(|:~\(|\(upset\))/gi,
    'smiley19': /(\(bomb\))/gi,
    'smiley20': /(\(clap\))/gi,
    'smiley21': /(;-\)|;\)|;-\)\)|;\)\)|;-D|;D|\(wink\))/gi
};


/**
 * Replaces common smiley strings with images
 */
function smilify(body) {
    if (!body) {
        return body;
    }

    for (var smiley in regexs) {
        if (regexs.hasOwnProperty(smiley)) {
            body = body.replace(regexs[smiley],
                    '<img class="smiley" src="images/smileys/' + smiley + '.svg">');
        }
    }

    return body;
}

var Replacement = {
    /**
     * Processes links and smileys in "body"
     */
    processReplacements: function(body) {
        //make links clickable
        body = this.linkify(body);

        //add smileys
        body = smilify(body);

        return body;
    },

    /**
     * Finds and replaces all links in the links in "body"
     * with their <a href=""></a>
     */
    linkify: function(inputText) {
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
};

module.exports = Replacement;

},{}],15:[function(require,module,exports){
module.exports=require(13)
},{"../../util/util":43,"../UIService":7,"../VideoLayout":9,"../toolbars/Toolbar":23,"./Replacement.js":14,"./commands":16}],16:[function(require,module,exports){
/**
 * Handles commands received via chat messages.
 */
var CommandsProcessor = (function()
{
    /**
     * Constructs new CommandProccessor instance from a message.
     * @param message the message
     * @constructor
     */
    function CommandsPrototype(message)
    {
        /**
         * Extracts the command from the message.
         * @param message the received message
         * @returns {string} the command
         */
        function getCommand(message)
        {
            if(message)
            {
                for(var command in commands)
                {
                    if(message.indexOf("/" + command) == 0)
                        return command;
                }
            }
            return "";
        };

        var command = getCommand(message);

        /**
         * Returns the name of the command.
         * @returns {String} the command
         */
        this.getCommand = function()
        {
            return command;
        }


        var messageArgument = message.substr(command.length + 2);

        /**
         * Returns the arguments of the command.
         * @returns {string}
         */
        this.getArgument = function()
        {
            return messageArgument;
        }
    }

    /**
     * Checks whether this instance is valid command or not.
     * @returns {boolean}
     */
    CommandsPrototype.prototype.isCommand = function()
    {
        if(this.getCommand())
            return true;
        return false;
    }

    /**
     * Processes the command.
     */
    CommandsPrototype.prototype.processCommand = function()
    {
        if(!this.isCommand())
            return;

        commands[this.getCommand()](this.getArgument());

    }

    /**
     * Processes the data for topic command.
     * @param commandArguments the arguments of the topic command.
     */
    var processTopic = function(commandArguments)
    {
        var topic = require("../../util/util").escapeHtml(commandArguments);

    }

    /**
     * List with supported commands. The keys are the names of the commands and
     * the value is the function that processes the message.
     * @type {{String: function}}
     */
    var commands = {
        "topic" : processTopic
    };

    return CommandsPrototype;
})();


module.exports = CommandsProcessor;
},{"../../util/util":43}],17:[function(require,module,exports){
var Prezi = require("../prezi/Prezi.js");
var UIUtil = require("../UIUtil.js");
var ToolbarToggler = require("../toolbars/toolbartoggler");

/* global $, config, connection, dockToolbar, Moderator, Prezi,
   setLargeVideoVisible, ToolbarToggler, Util, VideoLayout */
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
        require("../../xmpp/XMPPService").addToPresence("etherpad", etherpadName);
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

        etherpadIFrame.onload = function() {

            document.domain = document.domain;
            bubbleIframeMouseMove(etherpadIFrame);
            setTimeout(function() {
            //the iframes inside of the etherpad are not yet loaded when the etherpad iframe is loaded
                var outer = etherpadIFrame.contentDocument.getElementsByName("ace_outer")[0];
                bubbleIframeMouseMove(outer);
                var inner = outer.contentDocument.getElementsByName("ace_inner")[0];
                bubbleIframeMouseMove(inner);
            }, 2000);
        };
    }

    function bubbleIframeMouseMove(iframe){
        var existingOnMouseMove = iframe.contentWindow.onmousemove;
        iframe.contentWindow.onmousemove = function(e){
            if(existingOnMouseMove) existingOnMouseMove(e);
            var evt = document.createEvent("MouseEvents");
            var boundingClientRect = iframe.getBoundingClientRect();
            evt.initMouseEvent(
                "mousemove",
                true, // bubbles
                false, // not cancelable
                window,
                e.detail,
                e.screenX,
                e.screenY,
                    e.clientX + boundingClientRect.left,
                    e.clientY + boundingClientRect.top,
                e.ctrlKey,
                e.altKey,
                e.shiftKey,
                e.metaKey,
                e.button,
                null // no related element
            );
            iframe.dispatchEvent(evt);
        };
    }

    /**
     * On Etherpad added to muc.
     */
    $(document).bind('etherpadadded.muc', function (event, jid, etherpadName) {
        console.log("Etherpad added", etherpadName);
        if (config.etherpad_base && !Moderator.isModerator()) {
            Etherpad.init(etherpadName);
        }
    });

    /**
     * On focus changed event.
     */
    // FIXME: there is no such event as 'focusechanged.muc'
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

},{"../../xmpp/XMPPService":44,"../UIUtil.js":8,"../prezi/Prezi.js":19,"../toolbars/toolbartoggler":25}],18:[function(require,module,exports){
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

},{"../RTC/RTCService":3,"./toolbars/BottomToolbar":22,"./toolbars/Toolbar":23}],19:[function(require,module,exports){
var PreziPlayer = require("./PreziPlayer.js");
var UIUtil = require("../UIUtil.js");
var ToolbarToggler = require("../toolbars/toolbartoggler");
var XMPPService = require("../../xmpp/XMPPService");

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
        var myprezi = XMPPService.getPrezi();
        if (myprezi) {
            messageHandler.openTwoButtonDialog("Remove Prezi",
                "Are you sure you would like to remove your Prezi?",
                false,
                "Remove",
                function(e,v,m,f) {
                    if(v) {
                        XMPPService.removeFromPresence("prezi");
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
                                    = encodeURI(require("../../util/util").escapeHtml(preziUrl.value));

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

                                        XMPPService.addToPresence("prezi", urlValue);
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
        if (jid === XMPPService.getMyJID())
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
                if (jid != XMPPService.getMyJID())
                    preziPlayer.flyToStep(currentSlide);
            }
        });

        preziPlayer.on(PreziPlayer.EVENT_CURRENT_STEP, function(event) {
            console.log("event value", event.value);
            XMPPService.addToPresence("preziSlide", event.value);
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

},{"../../util/util":43,"../../xmpp/XMPPService":44,"../UIUtil.js":8,"../toolbars/toolbartoggler":25,"./PreziPlayer.js":20}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
module.exports=require(19)
},{"../../util/util":43,"../../xmpp/XMPPService":44,"../UIUtil.js":8,"../toolbars/toolbartoggler":25,"./PreziPlayer.js":20}],22:[function(require,module,exports){
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
        PanelToggler.toggleChat();
    };

    my.toggleContactList = function() {
        PanelToggler.toggleContactList();
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

},{"../UIUtil":8,"./../ContactList.js":5,"./../chat/chat.js":15}],23:[function(require,module,exports){
var BottomToolbar = require("./BottomToolbar");
var Prezi = require("./../prezi/prezi");
var Etherpad = require("./../etherpad/Etherpad");
var buttonClick = require("../UIUtil").buttonClick;
var DesktopStreaming = require("../../desktopsharing");
var Util = require("../../util/util");


var Toolbar = (function (my) {
    var toolbarTimeout = null;

    var UIService = null;

    var XMPPService = null

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
            return DesktopStreaming.toggleScreenSharing();
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
        var defaultNumber
            = config.defaultSipNumber ? config.defaultSipNumber : '';
        messageHandler.openTwoButtonDialog(null,
                '<h2>Enter SIP number</h2>' +
                '<input id="sipNumber" type="text"' +
                ' value="' + defaultNumber + '" autofocus>',
            false,
            "Dial",
            function (e, v, m, f) {
                if (v) {
                    var numberInput = document.getElementById('sipNumber');
                    if (numberInput.value) {
                        XMPPService.sipDial(
                            numberInput.value, 'fromnumber', UIService.getRoomName());
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
        if(!XMPPService.isFocus())
        {
            console.log('non-focus: not enabling recording');
            return;
        }

        XMPPService.setRecording(
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
        XMPPService.disposeConference(false, function () {
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

        XMPPService.lockRoom(key, function () {
            if (Toolbar.sharedKey) {
                console.log('set room password');
                Toolbar.lockLockButton();
            }
            else {
                console.log('removed room password');
                Toolbar.unlockLockButton();
            }
        }, function () {
            Toolbar.setSharedKey('');
        });

    }

    //sets onclick handlers
    my.init = function (ui, xmpp) {
        UIService = ui;
        XMPPService = xmpp;
        for(var k in buttonHandlers)
            $("#" + k).click(buttonHandlers[k]);
    };


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

        XMPPService.toggleVideoMute(
            function (isMuted) {
                Toolbar.changeToolbarVideoIcon(isMuted);

            }
        );
    }

    /**
     * Mutes / unmutes audio for the local participant.
     */
    my.toggleAudio = function () {
        if (!(require("../../RTC/RTCService").localAudio)) {
            Toolbar.preMuted = true;
            // We still click the button.
            buttonClick("#mute", "icon-microphone icon-mic-disabled");
            return;
        }

        XMPPService.toggleAudioMute(function () {
            buttonClick("#mute", "icon-microphone icon-mic-disabled");
        });

    }


    /**
     * Disables and enables some of the buttons.
     */
    my.setupButtonsFromConfig = function () {
        if(config.disablePrezi)
        {
            $("#prezi_button").css({display: "none"});
        }
    }

    /**
     * Opens the lock room dialog.
     */
    my.openLockDialog = function () {
        // Only the focus is able to set a shared key.
        if (!XMPPService.isFocus()) {
            if (Toolbar.sharedKey) {
                messageHandler.openMessageDialog(null,
                        "This conversation is currently protected by" +
                        " a password. Only the owner of the conference" +
                        " could set a password.",
                    false,
                    "Password");
            } else {
                messageHandler.openMessageDialog(null,
                    "This conversation isn't currently protected by" +
                        " a password. Only the owner of the conference" +
                        " could set a password.",
                    false,
                    "Password");
            }
        } else {
            if (Toolbar.sharedKey) {
                messageHandler.openTwoButtonDialog(null,
                    "Are you sure you would like to remove your password?",
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
                    '<h2>Set a password to lock your room</h2>' +
                        '<input id="lockKey" type="text"' +
                        'placeholder="your password" autofocus>',
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
                'Set a password to lock your room:' +
                '<input id="lockKey" type="text" placeholder="your password"' +
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
     * Unlocks the lock button state.
     */
    my.unlockLockButton = function() {
        if($("#lockIcon").hasClass("icon-security-locked"))
            buttonClick("#lockIcon", "icon-security icon-security-locked");
    };
    /**
     * Updates the lock button state to locked.
     */
    my.lockLockButton = function() {
        if($("#lockIcon").hasClass("icon-security"))
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

    /**
     * Sets the state of the button. The button has blue glow if desktop streaming is active.
     * @param active the state of the desktop streaming.
     */
    my.changeDesktopSharingButtonState = function (active) {
        var button = $("#desktopsharing > a");
        if(active)
        {
            button.addClass("glow");
        }
        else
        {
            button.removeClass("glow");
        }
    }

    return my;
}(Toolbar || {}));


module.exports = Toolbar;

},{"../../RTC/RTCService":3,"../../desktopsharing":29,"../../util/util":43,"../UIUtil":8,"./../etherpad/Etherpad":17,"./../prezi/prezi":21,"./BottomToolbar":22}],24:[function(require,module,exports){
module.exports=require(23)
},{"../../RTC/RTCService":3,"../../desktopsharing":29,"../../util/util":43,"../UIUtil":8,"./../etherpad/Etherpad":17,"./../prezi/prezi":21,"./BottomToolbar":22}],25:[function(require,module,exports){
var DesktopSharing = require("../../desktopsharing");

/* global $, interfaceConfig, Moderator, showDesktopSharingButton */
var ToolbarToggler = (function (my) {
    var toolbarTimeoutObject,
        toolbarTimeout = interfaceConfig.INITIAL_TOOLBAR_TIMEOUT;

    /**
     * Shows the main toolbar.
     */
    my.showToolbar = function () {
        var header = $("#header"),
            bottomToolbar = $("#bottomToolbar");
        if (!header.is(':visible') || !bottomToolbar.is(":visible")) {
            header.show("slide", { direction: "up", duration: 300});
            $('#subject').animate({top: "+=40"}, 300);
            if (!bottomToolbar.is(":visible")) {
                bottomToolbar.show(
                    "slide", {direction: "right", duration: 300});
            }

            if (toolbarTimeoutObject) {
                clearTimeout(toolbarTimeoutObject);
                toolbarTimeoutObject = null;
            }
            toolbarTimeoutObject = setTimeout(hideToolbar, toolbarTimeout);
            toolbarTimeout = interfaceConfig.TOOLBAR_TIMEOUT;
        }

        if (Moderator.isModerator())
        {
//            TODO: Enable settings functionality.
//                  Need to uncomment the settings button in index.html.
//            $('#settingsButton').css({visibility:"visible"});
        }

        // Show/hide desktop sharing button
        ToolbarToggler.showDesktopSharingButton();
    };

    my.showDesktopSharingButton = function () {
        if (DesktopSharing.isDesktopSharingEnabled()) {
            $('#desktopsharing').css({display: "inline"});
        } else {
            $('#desktopsharing').css({display: "none"});
        }
    }

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
        if ($("#bottomToolbar:hover").length > 0) {
            isToolbarHover = true;
        }

        clearTimeout(toolbarTimeoutObject);
        toolbarTimeoutObject = null;

        if (!isToolbarHover) {
            header.hide("slide", { direction: "up", duration: 300});
            $('#subject').animate({top: "-=40"}, 300);
            if ($("#remoteVideos").hasClass("hidden")) {
                bottomToolbar.hide(
                    "slide", {direction: "right", duration: 300});
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
    my.dockToolbar = function (isDock) {
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

},{"../../desktopsharing":29}],26:[function(require,module,exports){
var uiService = require("../UI/UIService");

/**
 * List of the available commands.
 * @type {{
     *              displayName: inputDisplayNameHandler,
     *              muteAudio: toggleAudio,
     *              muteVideo: toggleVideo,
     *              filmStrip: toggleFilmStrip
     *          }}
 */
var commands =
{
    displayName: uiService.changeDisplayName,
    muteAudio: uiService.toggleAudio,
    muteVideo: uiService.toggleVideo,
    toggleFilmStrip: uiService.toggleFilmStrip,
    toggleChat: uiService.toggleChat,
    toggleContactList: uiService.toggleContactList
};


/**
 * Maps the supported events and their status
 * (true it the event is enabled and false if it is disabled)
 * @type {{
 *              incomingMessage: boolean,
 *              outgoingMessage: boolean,
 *              displayNameChange: boolean,
 *              participantJoined: boolean,
 *              participantLeft: boolean
 *      }}
 */
var events =
{
    incommingMessage: false,
    outgoingMessage:false,
    displayNameChange: false,
    participantJoined: false,
    participantLeft: false
};

/**
 * Implements API class that communicates with external api class
 * and provides interface to access Jitsi Meet features by external
 * applications that embed Jitsi Meet
 */

module.exports = {
    /**
     * Check whether the API should be enabled or not.
     * @returns {boolean}
     */
    isEnabled: function () {
        var hash = location.hash;
        if(hash && hash.indexOf("external") > -1 && window.postMessage)
            return true;
        return false;
    },

    /**
     * Initializes the APIConnector. Setups message event listeners that will
     * receive information from external applications that embed Jitsi Meet.
     * It also sends a message to the external application that APIConnector
     * is initialized.
     */
    init: function (uiServiceObject) {
        uiService = uiServiceObject;
        if (window.addEventListener) {
            window.addEventListener('message',
                this.processMessage, false);
        }
        else {
            window.attachEvent('onmessage', this.processMessage);
        }
        this.sendMessage({type: "system", loaded: true});
    },

    /**
     * Sends message to the external application.
     * @param object
     */
    sendMessage: function (object) {
        window.parent.postMessage(JSON.stringify(object), "*");
    },

    /**
     * Processes a message event from the external application
     * @param event the message event
     */
    processMessage: function(event)
    {
        var message;
        try {
            message = JSON.parse(event.data);
        } catch (e) {}

        if(!message.type)
            return;
        switch (message.type)
        {
            case "command":
                this.processCommand(message);
                break;
            case "event":
                this.processEvent(message);
                break;
            default:
                console.error("Unknown type of the message");
                return;
        }

    },

    /**
     * Processes commands from external applicaiton.
     * @param message the object with the command
     */
    processCommand: function (message)
    {
        if(message.action != "execute")
        {
            console.error("Unknown action of the message");
            return;
        }
        for(var key in message)
        {
            if(commands[key])
                commands[key].apply(null, message[key]);
        }
    },

    /**
     * Processes events objects from external applications
     * @param event the event
     */
    processEvent: function (event) {
        if(!event.action)
        {
            console.error("Event with no action is received.");
            return;
        }

        var i;

        switch(event.action)
        {
            case "add":
                for(i = 0; i < event.events.length; i++)
                {
                    events[event.events[i]] = true;
                }
                break;
            case "remove":
                for(i = 0; i < event.events.length; i++)
                {
                    events[event.events[i]] = false;
                }
                break;
            default:
                console.error("Unknown action for event.");
        }

    },

    /**
     * Checks whether the event is enabled ot not.
     * @param name the name of the event.
     * @returns {*}
     */
    isEventEnabled: function (name) {
        return events[name];
    },

    /**
     * Sends event object to the external application that has been subscribed
     * for that event.
     * @param name the name event
     * @param object data associated with the event
     */
    triggerEvent: function (name, object) {
        this.sendMessage({
            type: "event", action: "result", event: name, result: object});
    },

    /**
     * Removes the listeners.
     */
    dispose: function () {
        if(window.removeEventListener)
        {
            window.removeEventListener("message",
                this.processMessage, false);
        }
        else
        {
            window.detachEvent('onmessage', this.processMessage);
        }

    }
};

},{"../UI/UIService":7}],27:[function(require,module,exports){
/* jshint -W117 */
/* application specific logic */
var UIService = require("./UI/UIService");
function init() {
    var StatisticsService = require("./statistics/StatisticsService");
    StatisticsService.start();
    require("./RTC/RTCService").start();
    var uiCredentials = UIService.getCredentials();
    var XMPPService = require("./xmpp/XMPPService");
    XMPPService.start(null, null, uiCredentials);
    require("./connectionquality")(UIService,
        XMPPService,
        XMPPService,
        StatisticsService);
    require("./desktopsharing").init();
}

$(document).ready(function () {
    var APIConnector = require("./api/APIConnector");
    if(APIConnector.isEnabled())
        APIConnector.init();
    UIService.start(init);
});

$(window).on("beforeunload", function () {
    var APIConnector = require("./api/APIConnector");
    if(APIConnector.isEnabled())
        APIConnector.dispose();
});

},{"./RTC/RTCService":3,"./UI/UIService":7,"./api/APIConnector":26,"./connectionquality":28,"./desktopsharing":29,"./statistics/StatisticsService":40,"./xmpp/XMPPService":44}],28:[function(require,module,exports){

var statsListener = null;

var statsSender = null;

/**
 * local stats
 * @type {{}}
 */
var stats = {};

/**
 * remote stats
 * @type {{}}
 */
var remoteStats = {};

/**
 * Interval for sending statistics to other participants
 * @type {null}
 */
var sendIntervalId = null;


/**
 * Start statistics sending.
 */
function startSendingStats() {
    sendStats();
    sendIntervalId = setInterval(sendStats, 10000);
}

/**
 * Sends statistics to other participants
 */
function sendStats() {
    statsSender.addToPresence("connectionQuality", convertToMUCStats(stats));
}

/**
 * Converts statistics to format for sending through XMPP
 * @param stats the statistics
 * @returns {{bitrate_donwload: *, bitrate_uplpoad: *, packetLoss_total: *, packetLoss_download: *, packetLoss_upload: *}}
 */
function convertToMUCStats(stats) {
    return {
        "bitrate_download": stats.bitrate.download,
        "bitrate_upload": stats.bitrate.upload,
        "packetLoss_total": stats.packetLoss.total,
        "packetLoss_download": stats.packetLoss.download,
        "packetLoss_upload": stats.packetLoss.upload
    };
}

/**
 * Converts statitistics to format used by VideoLayout
 * @param stats
 * @returns {{bitrate: {download: *, upload: *}, packetLoss: {total: *, download: *, upload: *}}}
 */
function parseMUCStats(stats) {
    return {
        bitrate: {
            download: stats.bitrate_download,
            upload: stats.bitrate_upload
        },
        packetLoss: {
            total: stats.packetLoss_total,
            download: stats.packetLoss_download,
            upload: stats.packetLoss_upload
        }
    };
}

var ConnectionQuality = {
    /**
     * Updates the local statistics
     * @param data new statistics
     */
    updateLocalStats: function (data) {
        stats = data;
        statsListener.updateLocalConnectionStats(100 - stats.packetLoss.total,stats);
        if(sendIntervalId == null)
        {
            startSendingStats();
        }
    },

    /**
     * Updates remote statistics
     * @param jid the jid associated with the statistics
     * @param data the statistics
     */
    updateRemoteStats: function (jid, data) {
        if(data == null || data.packetLoss_total == null)
        {
            statsListener.updateConnectionStats(jid, null, null);
            return;
        }
        remoteStats[jid] = parseMUCStats(data);

        statsListener.updateConnectionStats(jid, 100 - data.packetLoss_total,remoteStats[jid]);

    },

    /**
     * Stops statistics sending.
     */
    stopSendingStats: function () {
        clearInterval(sendIntervalId);
        sendIntervalId = null;
        //notify UI about stopping statistics gathering
        statsListener.onStatsStop();
    },

    /**
     * Returns the local statistics.
     */
    getStats: function () {
        return stats;
    }

};

module.exports = function (listener, sender, remoteStatsCollector, localStatsCollector) {
    statsSender = sender;
    statsListener = listener;
    remoteStatsCollector.addConnectionQualityListener(ConnectionQuality.updateRemoteStats);
    localStatsCollector.addConnectionStatsListener(ConnectionQuality.updateLocalStats);
    localStatsCollector.addRemoteStatsStopListener(ConnectionQuality.stopSendingStats);
}
},{}],29:[function(require,module,exports){
/* global $, alert, changeLocalVideo, chrome, config, connection, getConferenceHandler, getUserMediaWithConstraints, VideoLayout */
/**
 * Indicates that desktop stream is currently in use(for toggle purpose).
 * @type {boolean}
 */
var _isUsingScreenStream = false;
/**
 * Indicates that switch stream operation is in progress and prevent from triggering new events.
 * @type {boolean}
 */
var switchInProgress = false;

/**
 * Method used to get screen sharing stream.
 *
 * @type {function (stream_callback, failure_callback}
 */
var obtainDesktopStream = null;

/**
 * Flag used to cache desktop sharing enabled state. Do not use directly as it can be <tt>null</tt>.
 * @type {null|boolean}
 */
var _desktopSharingEnabled = null;

var RTCService = null;
/**
 * Method obtains desktop stream from WebRTC 'screen' source.
 * Flag 'chrome://flags/#enable-usermedia-screen-capture' must be enabled.
 */
function obtainWebRTCScreen(streamCallback, failCallback) {
    RTCService.getUserMediaWithConstraints(
        ['screen'],
        streamCallback,
        failCallback
    );
}

/**
 * Constructs inline install URL for Chrome desktop streaming extension.
 * The 'chromeExtensionId' must be defined in config.js.
 * @returns {string}
 */
function getWebStoreInstallUrl()
{
    return "https://chrome.google.com/webstore/detail/" + config.chromeExtensionId;
}

/**
 * Checks whether extension update is required.
 * @param minVersion minimal required version
 * @param extVersion current extension version
 * @returns {boolean}
 */
function isUpdateRequired(minVersion, extVersion)
{
    try
    {
        var s1 = minVersion.split('.');
        var s2 = extVersion.split('.');

        var len = Math.max(s1.length, s2.length);
        for (var i = 0; i < len; i++)
        {
            var n1 = 0,
                n2 = 0;

            if (i < s1.length)
                n1 = parseInt(s1[i]);
            if (i < s2.length)
                n2 = parseInt(s2[i]);

            if (isNaN(n1) || isNaN(n2))
            {
                return true;
            }
            else if (n1 !== n2)
            {
                return n1 > n2;
            }
        }

        // will happen if boths version has identical numbers in
        // their components (even if one of them is longer, has more components)
        return false;
    }
    catch (e)
    {
        console.error("Failed to parse extension version", e);
        messageHandler.showError('Error',
            'Error when trying to detect desktopsharing extension.');
        return true;
    }
}


function checkExtInstalled(isInstalledCallback) {
    if (!chrome.runtime) {
        // No API, so no extension for sure
        isInstalledCallback(false);
        return;
    }
    chrome.runtime.sendMessage(
        config.chromeExtensionId,
        { getVersion: true },
        function (response) {
            if (!response || !response.version) {
                // Communication failure - assume that no endpoint exists
                console.warn("Extension not installed?: " + chrome.runtime.lastError);
                isInstalledCallback(false);
            } else {
                // Check installed extension version
                var extVersion = response.version;
                console.log('Extension version is: ' + extVersion);
                var updateRequired = isUpdateRequired(config.minChromeExtVersion, extVersion);
                if (updateRequired) {
                    alert(
                        'Jitsi Desktop Streamer requires update. ' +
                        'Changes will take effect after next Chrome restart.');
                }
                isInstalledCallback(!updateRequired);
            }
        }
    );
}

function doGetStreamFromExtension(streamCallback, failCallback) {
    // Sends 'getStream' msg to the extension. Extension id must be defined in the config.
    chrome.runtime.sendMessage(
        config.chromeExtensionId,
        { getStream: true, sources: config.desktopSharingSources },
        function (response) {
            if (!response) {
                failCallback(chrome.runtime.lastError);
                return;
            }
            console.log("Response from extension: " + response);
            if (response.streamId) {
                RTCService.getUserMediaWithConstraints(
                    ['desktop'],
                    function (stream) {
                        streamCallback(stream);
                    },
                    failCallback,
                    null, null, null,
                    response.streamId);
            } else {
                failCallback("Extension failed to get the stream");
            }
        }
    );
}
/**
 * Asks Chrome extension to call chooseDesktopMedia and gets chrome 'desktop' stream for returned stream token.
 */
function obtainScreenFromExtension(streamCallback, failCallback) {
    checkExtInstalled(
        function (isInstalled) {
            if (isInstalled) {
                doGetStreamFromExtension(streamCallback, failCallback);
            } else {
                chrome.webstore.install(
                    getWebStoreInstallUrl(),
                    function (arg) {
                        console.log("Extension installed successfully", arg);
                        // We need to reload the page in order to get the access to chrome.runtime
                        window.location.reload(false);
                    },
                    function (arg) {
                        console.log("Failed to install the extension", arg);
                        failCallback(arg);
                        messageHandler.showError('Error',
                            'Failed to install desktop sharing extension');
                    }
                );
            }
        }
    );
}

/**
 * Initializes <link rel=chrome-webstore-item /> with extension id set in config.js to support inline installs.
 * Host site must be selected as main website of published extension.
 */
function initInlineInstalls()
{
    $("link[rel=chrome-webstore-item]").attr("href", getWebStoreInstallUrl());
}

function getSwitchStreamFailed(error) {
    console.error("Failed to obtain the stream to switch to", error);
    messageHandler.showError('Error', 'Failed to get video stream');
    switchInProgress = false;
}

function streamSwitchDone() {
    //window.setTimeout(
    //    function () {
    switchInProgress = false;
    //    }, 100
    //);
}

function newStreamCreated(stream) {

    var oldStream = RTCService.localVideo.getOriginalStream();

    RTCService.createLocalStream(stream, "desktop");
    RTCService.removeLocalStream(oldStream);

    require("./xmpp/XMPPService").switchStreams(stream, oldStream, streamSwitchDone);
}

/**
 * Call this method to toggle desktop sharing feature.
 * @param method pass "ext" to use chrome extension for desktop capture(chrome extension required),
 *        pass "webrtc" to use WebRTC "screen" desktop source('chrome://flags/#enable-usermedia-screen-capture'
 *        must be enabled), pass any other string or nothing in order to disable this feature completely.
 */
function setDesktopSharing(method) {
    // Check if we are running chrome
    if (!navigator.webkitGetUserMedia) {
        obtainDesktopStream = null;
        console.info("Desktop sharing disabled");
    } else if (method == "ext") {
        obtainDesktopStream = obtainScreenFromExtension;
        console.info("Using Chrome extension for desktop sharing");
    } else if (method == "webrtc") {
        obtainDesktopStream = obtainWebRTCScreen;
        console.info("Using Chrome WebRTC for desktop sharing");
    }

    // Reset enabled cache
    _desktopSharingEnabled = null;

    require("./UI/UIService").showDesktopSharingButton();
}


module.exports = {
    /*
     * Toggles screen sharing.
     */
    toggleScreenSharing: function () {
        if (switchInProgress || !obtainDesktopStream) {
            console.warn("Switch in progress or no method defined");
            return;
        }
        switchInProgress = true;

        // Only the focus is able to set a shared key.
        if (!_isUsingScreenStream)
        {
            obtainDesktopStream(
                function (stream) {
                    // We now use screen stream
                    _isUsingScreenStream = true;
                    // Hook 'ended' event to restore camera when screen stream stops
                    stream.addEventListener('ended',
                        function (e) {
                            if (!switchInProgress && _isUsingScreenStream) {
                                this.toggleScreenSharing();
                            }
                        }
                    );
                    newStreamCreated(stream);
                },
                getSwitchStreamFailed);
        } else {
            // Disable screen stream
            RTCService.getUserMediaWithConstraints(
                ['video'],
                function (stream) {
                    // We are now using camera stream
                    _isUsingScreenStream = false;
                    newStreamCreated(stream);
                },
                getSwitchStreamFailed, config.resolution || '360'
            );
        }
    },
    /**
     * @returns {boolean} <tt>true</tt> if desktop sharing feature is available and enabled.
     */
    isDesktopSharingEnabled: function () {
        if (_desktopSharingEnabled === null) {
            if (obtainDesktopStream === obtainScreenFromExtension) {
                // Parse chrome version
                var userAgent = navigator.userAgent.toLowerCase();
                // We can assume that user agent is chrome, because it's enforced when 'ext' streaming method is set
                var ver = parseInt(userAgent.match(/chrome\/(\d+)\./)[1], 10);
                console.log("Chrome version" + userAgent, ver);
                _desktopSharingEnabled = ver >= 34;
            } else {
                _desktopSharingEnabled = obtainDesktopStream === obtainWebRTCScreen;
            }
        }
        return _desktopSharingEnabled;
    },
    init: function () {
        RTCService = require("./RTC/RTCService");
        // Set default desktop sharing method
        setDesktopSharing(config.desktopSharing);
        // Initialize Chrome extension inline installs
        if (config.chromeExtensionId) {
            initInlineInstalls();
        }
    },
    isUsingScreenStream: function () {
        return _isUsingScreenStream;
    }
};

},{"./RTC/RTCService":3,"./UI/UIService":7,"./xmpp/XMPPService":44}],30:[function(require,module,exports){
var MediaStreamType = {
    VIDEO_TYPE: "Video",

    AUDIO_TYPE: "Audio"
};

module.exports = MediaStreamType;
},{}],31:[function(require,module,exports){
var RTCBrowserType = {
    RTC_BROWSER_CHROME: "rtc_browser.chrome",

    RTC_BROWSER_FIREFOX: "rtc_browser.firefox"
};

module.exports = RTCBrowserType;
},{}],32:[function(require,module,exports){
var StreamEventTypes = {
    EVENT_TYPE_LOCAL_CREATED: "stream.local_created",

    EVENT_TYPE_LOCAL_ENDED: "stream.local_ended",

    EVENT_TYPE_REMOTE_CREATED: "stream.remote_created",

    EVENT_TYPE_REMOTE_ENDED: "stream.remote_ended"
};

module.exports = StreamEventTypes;
},{}],33:[function(require,module,exports){
/**
 * Created by hristo on 10/29/14.
 */
var XMPPEvents = {
    CONFERENCE_CERATED: "xmpp.conferenceCreated.jingle",
    CALL_TERMINATED: "xmpp.callterminated.jingle",
    CALL_INCOMING: "xmpp.callincoming.jingle",
    DISPOSE_CONFERENCE: "xmpp.dispoce_confernce",
    DISPLAY_NAME_CHANGED: "xmpp.display_name_changed",
    REMOTE_STATS: "xmpp.remote_stats"
};
module.exports = XMPPEvents;
},{}],34:[function(require,module,exports){
var SimulcastUtils = require("./SimulcastUtil");
function SimulcastReceiver() {
    this.simulcastUtils = new SimulcastUtils();
    this.logger = this.simulcastUtils.createLogger('SimulcastReceiver');
}

SimulcastReceiver.prototype._remoteVideoSourceCache = '';
SimulcastReceiver.prototype._remoteMaps = {
    msid2Quality: {},
    ssrc2Msid: {},
    msid2ssrc: {},
    receivingVideoStreams: {}
};

SimulcastReceiver.prototype._cacheRemoteVideoSources = function (lines) {
    this._remoteVideoSourceCache = this.simulcastUtils._getVideoSources(lines);
};

SimulcastReceiver.prototype._restoreRemoteVideoSources = function (lines) {
    this.simulcastUtils._replaceVideoSources(lines, this._remoteVideoSourceCache);
};

SimulcastReceiver.prototype._ensureGoogConference = function (lines) {
    var sb;

    this.logger.info('Ensuring x-google-conference flag...')

    if (this.simulcastUtils._indexOfArray('a=x-google-flag:conference', lines) === this.simulcastUtils._emptyCompoundIndex) {
        // TODO(gp) do that for the audio as well as suggested by fippo.
        // Add the google conference flag
        sb = this.simulcastUtils._getVideoSources(lines);
        sb = ['a=x-google-flag:conference'].concat(sb);
        this.simulcastUtils._replaceVideoSources(lines, sb);
    }
};

SimulcastReceiver.prototype._restoreSimulcastGroups = function (sb) {
    this._restoreRemoteVideoSources(sb);
};

/**
 * Restores the simulcast groups of the remote description. In
 * transformRemoteDescription we remove those in order for the set remote
 * description to succeed. The focus needs the signal the groups to new
 * participants.
 *
 * @param desc
 * @returns {*}
 */
SimulcastReceiver.prototype.reverseTransformRemoteDescription = function (desc) {
    var sb;

    if (!desc || desc == null) {
        return desc;
    }

    if (config.enableSimulcast) {
        sb = desc.sdp.split('\r\n');

        this._restoreSimulcastGroups(sb);

        desc = new RTCSessionDescription({
            type: desc.type,
            sdp: sb.join('\r\n')
        });
    }

    return desc;
};


SimulcastReceiver.prototype._updateRemoteMaps = function (lines) {
    var remoteVideoSources = this.simulcastUtils.parseMedia(lines, ['video'])[0],
        videoSource, quality;

    // (re) initialize the remote maps.
    this._remoteMaps.msid2Quality = {};
    this._remoteMaps.ssrc2Msid = {};
    this._remoteMaps.msid2ssrc = {};

    var self = this;
    if (remoteVideoSources.groups && remoteVideoSources.groups.length !== 0) {
        remoteVideoSources.groups.forEach(function (group) {
            if (group.semantics === 'SIM' && group.ssrcs && group.ssrcs.length !== 0) {
                quality = 0;
                group.ssrcs.forEach(function (ssrc) {
                    videoSource = remoteVideoSources.sources[ssrc];
                    self._remoteMaps.msid2Quality[videoSource.msid] = quality++;
                    self._remoteMaps.ssrc2Msid[videoSource.ssrc] = videoSource.msid;
                    self._remoteMaps.msid2ssrc[videoSource.msid] = videoSource.ssrc;
                });
            }
        });
    }
};

SimulcastReceiver.prototype._setReceivingVideoStream = function (resource, ssrc) {
    this._remoteMaps.receivingVideoStreams[resource] = ssrc;
};

/**
 * Returns a stream with single video track, the one currently being
 * received by this endpoint.
 *
 * @param stream the remote simulcast stream.
 * @returns {webkitMediaStream}
 */
SimulcastReceiver.prototype.getReceivingVideoStream = function (stream) {
    var tracks, i, electedTrack, msid, quality = 0, receivingTrackId;

    var self = this;
    if (config.enableSimulcast) {

        stream.getVideoTracks().some(function (track) {
            return Object.keys(self._remoteMaps.receivingVideoStreams).some(function (resource) {
                var ssrc = self._remoteMaps.receivingVideoStreams[resource];
                var msid = self._remoteMaps.ssrc2Msid[ssrc];
                if (msid == [stream.id, track.id].join(' ')) {
                    electedTrack = track;
                    return true;
                }
            });
        });

        if (!electedTrack) {
            // we don't have an elected track, choose by initial quality.
            tracks = stream.getVideoTracks();
            for (i = 0; i < tracks.length; i++) {
                msid = [stream.id, tracks[i].id].join(' ');
                if (this._remoteMaps.msid2Quality[msid] === quality) {
                    electedTrack = tracks[i];
                    break;
                }
            }

            // TODO(gp) if the initialQuality could not be satisfied, lower
            // the requirement and try again.
        }
    }

    return (electedTrack)
        ? new webkitMediaStream([electedTrack])
        : stream;
};

SimulcastReceiver.prototype.getReceivingSSRC = function (jid) {
    var resource = Strophe.getResourceFromJid(jid);
    var ssrc = this._remoteMaps.receivingVideoStreams[resource];

    // If we haven't receiving a "changed" event yet, then we must be receiving
    // low quality (that the sender always streams).
    if (!ssrc) {
        var j, k;

        var remoteStreams = require("../RTC/RTCService").remoteStreams;
        if (remoteStreams) {
            for (j = 0; j < remoteStreams.length; j++) {
                var remoteStream = remoteStreams[j].getOriginalStream();

                if (ssrc) {
                    // stream found, stop.
                    break;
                }
                var tracks = remoteStream.getVideoTracks();
                if (tracks) {
                    for (k = 0; k < tracks.length; k++) {
                        var track = tracks[k];
                        var msid = [remoteStream.id, track.id].join(' ');
                        var _ssrc = this._remoteMaps.msid2ssrc[msid];
                        var _jid = require("../xmpp/XMPPService").getJIDFromSSRC(_ssrc);
                        var quality = this._remoteMaps.msid2Quality[msid];
                        if (jid == _jid && quality == 0) {
                            ssrc = _ssrc;
                            // stream found, stop.
                            break;
                        }
                    }
                }
            }
        }
    }

    return ssrc;
};

SimulcastReceiver.prototype.getReceivingVideoStreamBySSRC = function (ssrc)
{
    var electedStream;
    var j, k, remoteStream, mediaStream;

    var remoteStreams = require("../RTC/RTCService").remoteStreams;
    if (remoteStreams) {
        for (j = 0; j < remoteStreams.length; j++) {
            if (electedStream) {
                // stream found, stop.
                break;
            }

            mediaStream = remoteStreams[j];
            remoteStream = remoteStreams[j].getOriginalStream();
            var tracks = remoteStream.getVideoTracks();
            if (tracks) {
                for (k = 0; k < tracks.length; k++) {
                    var track = tracks[k];
                    var msid = [remoteStream.id, track.id].join(' ');
                    var tmp = this._remoteMaps.msid2ssrc[msid];
                    if (tmp == ssrc) {
                        electedStream = new webkitMediaStream([track]);
                        // stream found, stop.
                        break;
                    }
                }
            }
        }
    }

    return {
        sid: mediaStream.sid,
        stream: electedStream
    };
};

/**
 * Gets the fully qualified msid (stream.id + track.id) associated to the
 * SSRC.
 *
 * @param ssrc
 * @returns {*}
 */
SimulcastReceiver.prototype.getRemoteVideoStreamIdBySSRC = function (ssrc) {
    return this._remoteMaps.ssrc2Msid[ssrc];
};

/**
 * Removes the ssrc-group:SIM from the remote description bacause Chrome
 * either gets confused and thinks this is an FID group or, if an FID group
 * is already present, it fails to set the remote description.
 *
 * @param desc
 * @returns {*}
 */
SimulcastReceiver.prototype.transformRemoteDescription = function (desc) {

    var sb = desc.sdp.split('\r\n');

    this._updateRemoteMaps(sb);
    this._cacheRemoteVideoSources(sb);

    // NOTE(gp) this needs to be called after updateRemoteMaps because we need the simulcast group in the _updateRemoteMaps() method.
    this.simulcastUtils._removeSimulcastGroup(sb);

    // We don't need the goog conference flag if we're not doing native
    // simulcast, but at the receiver, we have no idea if the sender is
    // doing native or not-native simulcast.
    this._ensureGoogConference(sb);

    desc = new RTCSessionDescription({
        type: desc.type,
        sdp: sb.join('\r\n')
    });

    this.logger.fine(['Transformed remote description', desc.sdp].join(' '));

    return desc;
};

module.exports = SimulcastReceiver;
},{"../RTC/RTCService":3,"../xmpp/XMPPService":44,"./SimulcastUtil":37}],35:[function(require,module,exports){
var SimulcastUtils = require("./SimulcastUtil");
function SimulcastSender() {
    this.simulcastUtils = new SimulcastUtils();
    this.logger = this.simulcastUtils.createLogger('SimulcastSender');
}

SimulcastSender.prototype._localVideoSourceCache = '';
SimulcastSender.prototype.localStream = null;
SimulcastSender.prototype.displayedLocalVideoStream = null;

SimulcastSender.prototype._generateGuid = (function () {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }

    return function () {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    };
}());

SimulcastSender.prototype._cacheLocalVideoSources = function (lines) {
    this._localVideoSourceCache = this.simulcastUtils._getVideoSources(lines);
};

SimulcastSender.prototype._restoreLocalVideoSources = function (lines) {
    this.simulcastUtils._replaceVideoSources(lines, this._localVideoSourceCache);
};

// Returns a random integer between min (included) and max (excluded)
// Using Math.round() gives a non-uniform distribution!
SimulcastSender.prototype._generateRandomSSRC = function () {
    var min = 0, max = 0xffffffff;
    return Math.floor(Math.random() * (max - min)) + min;
};

SimulcastSender.prototype._appendSimulcastGroup = function (lines) {
    var videoSources, ssrcGroup, simSSRC, numOfSubs = 2, i, sb, msid;

    this.logger.info('Appending simulcast group...');

    // Get the primary SSRC information.
    videoSources = this.simulcastUtils.parseMedia(lines, ['video'])[0];

    // Start building the SIM SSRC group.
    ssrcGroup = ['a=ssrc-group:SIM'];

    // The video source buffer.
    sb = [];

    // Create the simulcast sub-streams.
    for (i = 0; i < numOfSubs; i++) {
        // TODO(gp) prevent SSRC collision.
        simSSRC = this._generateRandomSSRC();
        ssrcGroup.push(simSSRC);

        sb.splice.apply(sb, [sb.length, 0].concat(
            [["a=ssrc:", simSSRC, " cname:", videoSources.base.cname].join(''),
                ["a=ssrc:", simSSRC, " msid:", videoSources.base.msid].join('')]
        ));

        this.logger.info(['Generated substream ', i, ' with SSRC ', simSSRC, '.'].join(''));

    }

    // Add the group sim layers.
    sb.splice(0, 0, ssrcGroup.join(' '))

    this.simulcastUtils._replaceVideoSources(lines, sb);
};

// Does the actual patching.
SimulcastSender.prototype._ensureSimulcastGroup = function (lines) {

    this.logger.info('Ensuring simulcast group...');

    if (this.simulcastUtils._indexOfArray('a=ssrc-group:SIM', lines) === this.simulcastUtils._emptyCompoundIndex) {
        this._appendSimulcastGroup(lines);
        this._cacheLocalVideoSources(lines);
    } else {
        // verify that the ssrcs participating in the SIM group are present
        // in the SDP (needed for presence).
        this._restoreLocalVideoSources(lines);
    }
};

SimulcastSender.prototype.getLocalVideoStream = function () {
    return (this.displayedLocalVideoStream != null)
        ? this.displayedLocalVideoStream
        // in case we have no simulcast at all, i.e. we didn't perform the GUM
        : require("../RTC/RTCService").localVideo.getOriginalStream();
};

function NativeSimulcastSender() {
    SimulcastSender.call(this); // call the super constructor.
}

NativeSimulcastSender.prototype = Object.create(SimulcastSender.prototype);

NativeSimulcastSender.prototype._localExplosionMap = {};

/**
 * Produces a single stream with multiple tracks for local video sources.
 *
 * @param lines
 * @private
 */
NativeSimulcastSender.prototype._explodeSimulcastSenderSources = function (lines) {
    var sb, msid, sid, tid, videoSources, self;

    this.logger.info('Exploding local video sources...');

    videoSources = this.simulcastUtils.parseMedia(lines, ['video'])[0];

    self = this;
    if (videoSources.groups && videoSources.groups.length !== 0) {
        videoSources.groups.forEach(function (group) {
            if (group.semantics === 'SIM') {
                group.ssrcs.forEach(function (ssrc) {

                    // Get the msid for this ssrc..
                    if (self._localExplosionMap[ssrc]) {
                        // .. either from the explosion map..
                        msid = self._localExplosionMap[ssrc];
                    } else {
                        // .. or generate a new one (msid).
                        sid = videoSources.sources[ssrc].msid
                            .substring(0, videoSources.sources[ssrc].msid.indexOf(' '));

                        tid = self._generateGuid();
                        msid = [sid, tid].join(' ');
                        self._localExplosionMap[ssrc] = msid;
                    }

                    // Assign it to the source object.
                    videoSources.sources[ssrc].msid = msid;

                    // TODO(gp) Change the msid of associated sources.
                });
            }
        });
    }

    sb = this.simulcastUtils._compileVideoSources(videoSources);

    this.simulcastUtils._replaceVideoSources(lines, sb);
};

/**
 * GUM for simulcast.
 *
 * @param constraints
 * @param success
 * @param err
 */
NativeSimulcastSender.prototype.getUserMedia = function (constraints, success, err) {

    // There's nothing special to do for native simulcast, so just do a normal GUM.

    var self = this;
    navigator.webkitGetUserMedia(constraints, function (hqStream) {
        self.localStream = hqStream;
        success(hqStream);
    }, err);
};

/**
 * Prepares the local description for public usage (i.e. to be signaled
 * through Jingle to the focus).
 *
 * @param desc
 * @returns {RTCSessionDescription}
 */
NativeSimulcastSender.prototype.reverseTransformLocalDescription = function (desc) {
    var sb;

    if (!desc || desc == null) {
        return desc;
    }


    sb = desc.sdp.split('\r\n');

    this._explodeSimulcastSenderSources(sb);

    desc = new RTCSessionDescription({
        type: desc.type,
        sdp: sb.join('\r\n')
    });

    this.logger.fine(['Exploded local video sources', desc.sdp].join(' '));

    return desc;
};

/**
 * Ensures that the simulcast group is present in the answer, _if_ native
 * simulcast is enabled,
 *
 * @param desc
 * @returns {*}
 */
NativeSimulcastSender.prototype.transformAnswer = function (desc) {

    var sb = desc.sdp.split('\r\n');

    // Even if we have enabled native simulcasting previously
    // (with a call to SLD with an appropriate SDP, for example),
    // createAnswer seems to consistently generate incomplete SDP
    // with missing SSRCS.
    //
    // So, subsequent calls to SLD will have missing SSRCS and presence
    // won't have the complete list of SRCs.
    this._ensureSimulcastGroup(sb);

    desc = new RTCSessionDescription({
        type: desc.type,
        sdp: sb.join('\r\n')
    });

    this.logger.fine(['Transformed answer', desc.sdp].join(' '));

    return desc;
};


/**
 *
 *
 * @param desc
 * @returns {*}
 */
NativeSimulcastSender.prototype.transformLocalDescription = function (desc) {
    return desc;
};

NativeSimulcastSender.prototype._setLocalVideoStreamEnabled = function (ssrc, enabled) {
    // Nothing to do here, native simulcast does that auto-magically.
};

NativeSimulcastSender.prototype.constructor = NativeSimulcastSender;

function SimpleSimulcastSender() {
    SimulcastSender.call(this);
}

SimpleSimulcastSender.prototype = Object.create(SimulcastSender.prototype);

SimpleSimulcastSender.prototype._localMaps = {
    msids: [],
    msid2ssrc: {}
};

/**
 * Groups local video sources together in the ssrc-group:SIM group.
 *
 * @param lines
 * @private
 */
SimpleSimulcastSender.prototype._groupLocalVideoSources = function (lines) {
    var sb, videoSources, ssrcs = [], ssrc;

    this.logger.info('Grouping local video sources...');

    videoSources = this.simulcastUtils.parseMedia(lines, ['video'])[0];

    for (ssrc in videoSources.sources) {
        // jitsi-meet destroys/creates streams at various places causing
        // the original local stream ids to change. The only thing that
        // remains unchanged is the trackid.
        this._localMaps.msid2ssrc[videoSources.sources[ssrc].msid.split(' ')[1]] = ssrc;
    }

    var self = this;
    // TODO(gp) add only "free" sources.
    this._localMaps.msids.forEach(function (msid) {
        ssrcs.push(self._localMaps.msid2ssrc[msid]);
    });

    if (!videoSources.groups) {
        videoSources.groups = [];
    }

    videoSources.groups.push({
        'semantics': 'SIM',
        'ssrcs': ssrcs
    });

    sb = this.simulcastUtils._compileVideoSources(videoSources);

    this.simulcastUtils._replaceVideoSources(lines, sb);
};

/**
 * GUM for simulcast.
 *
 * @param constraints
 * @param success
 * @param err
 */
SimpleSimulcastSender.prototype.getUserMedia = function (constraints, success, err) {

    // TODO(gp) what if we request a resolution not supported by the hardware?
    // TODO(gp) make the lq stream configurable; although this wouldn't work with native simulcast
    var lqConstraints = {
        audio: false,
        video: {
            mandatory: {
                maxWidth: 320,
                maxHeight: 180,
                maxFrameRate: 15
            }
        }
    };

    this.logger.info('HQ constraints: ', constraints);
    this.logger.info('LQ constraints: ', lqConstraints);


    // NOTE(gp) if we request the lq stream first webkitGetUserMedia
    // fails randomly. Tested with Chrome 37. As fippo suggested, the
    // reason appears to be that Chrome only acquires the cam once and
    // then downscales the picture (https://code.google.com/p/chromium/issues/detail?id=346616#c11)

    var self = this;
    navigator.webkitGetUserMedia(constraints, function (hqStream) {

        self.localStream = hqStream;

        // reset local maps.
        self._localMaps.msids = [];
        self._localMaps.msid2ssrc = {};

        // add hq trackid to local map
        self._localMaps.msids.push(hqStream.getVideoTracks()[0].id);

        navigator.webkitGetUserMedia(lqConstraints, function (lqStream) {

            self.displayedLocalVideoStream = lqStream;

            // NOTE(gp) The specification says Array.forEach() will visit
            // the array elements in numeric order, and that it doesn't
            // visit elements that don't exist.

            // add lq trackid to local map
            self._localMaps.msids.splice(0, 0, lqStream.getVideoTracks()[0].id);

            self.localStream.addTrack(lqStream.getVideoTracks()[0]);
            success(self.localStream);
        }, err);
    }, err);
};

/**
 * Prepares the local description for public usage (i.e. to be signaled
 * through Jingle to the focus).
 *
 * @param desc
 * @returns {RTCSessionDescription}
 */
SimpleSimulcastSender.prototype.reverseTransformLocalDescription = function (desc) {
    var sb;

    if (!desc || desc == null) {
        return desc;
    }

    sb = desc.sdp.split('\r\n');

    this._groupLocalVideoSources(sb);

    desc = new RTCSessionDescription({
        type: desc.type,
        sdp: sb.join('\r\n')
    });

    this.logger.fine('Grouped local video sources');
    this.logger.fine(desc.sdp);

    return desc;
};

/**
 * Ensures that the simulcast group is present in the answer, _if_ native
 * simulcast is enabled,
 *
 * @param desc
 * @returns {*}
 */
SimpleSimulcastSender.prototype.transformAnswer = function (desc) {
    return desc;
};


/**
 *
 *
 * @param desc
 * @returns {*}
 */
SimpleSimulcastSender.prototype.transformLocalDescription = function (desc) {

    var sb = desc.sdp.split('\r\n');

    this.simulcastUtils._removeSimulcastGroup(sb);

    desc = new RTCSessionDescription({
        type: desc.type,
        sdp: sb.join('\r\n')
    });

    this.logger.fine('Transformed local description');
    this.logger.fine(desc.sdp);

    return desc;
};

SimpleSimulcastSender.prototype._setLocalVideoStreamEnabled = function (ssrc, enabled) {
    var trackid;

    var self = this;
    this.logger.log(['Requested to', enabled ? 'enable' : 'disable', ssrc].join(' '));
    if (Object.keys(this._localMaps.msid2ssrc).some(function (tid) {
        // Search for the track id that corresponds to the ssrc
        if (self._localMaps.msid2ssrc[tid] == ssrc) {
            trackid = tid;
            return true;
        }
    }) && self.localStream.getVideoTracks().some(function (track) {
        // Start/stop the track that corresponds to the track id
        if (track.id === trackid) {
            track.enabled = enabled;
            return true;
        }
    })) {
        this.logger.log([trackid, enabled ? 'enabled' : 'disabled'].join(' '));
        $(document).trigger(enabled
            ? 'simulcastlayerstarted'
            : 'simulcastlayerstopped');
    } else {
        this.logger.error("I don't have a local stream with SSRC " + ssrc);
    }
};

SimpleSimulcastSender.prototype.constructor = SimpleSimulcastSender;

function NoSimulcastSender() {
    SimulcastSender.call(this);
}

NoSimulcastSender.prototype = Object.create(SimulcastSender.prototype);

/**
 * GUM for simulcast.
 *
 * @param constraints
 * @param success
 * @param err
 */
NoSimulcastSender.prototype.getUserMedia = function (constraints, success, err) {
    var self = this;
    navigator.webkitGetUserMedia(constraints, function (hqStream) {
        self.localStream = hqStream;
        success(self.localStream);
    }, err);
};

/**
 * Prepares the local description for public usage (i.e. to be signaled
 * through Jingle to the focus).
 *
 * @param desc
 * @returns {RTCSessionDescription}
 */
NoSimulcastSender.prototype.reverseTransformLocalDescription = function (desc) {
    return desc;
};

/**
 * Ensures that the simulcast group is present in the answer, _if_ native
 * simulcast is enabled,
 *
 * @param desc
 * @returns {*}
 */
NoSimulcastSender.prototype.transformAnswer = function (desc) {
    return desc;
};


/**
 *
 *
 * @param desc
 * @returns {*}
 */
NoSimulcastSender.prototype.transformLocalDescription = function (desc) {
    return desc;
};

NoSimulcastSender.prototype._setLocalVideoStreamEnabled = function (ssrc, enabled) {

};

NoSimulcastSender.prototype.constructor = NoSimulcastSender;

function getSimulcastSender()
{
    var simulcastSender = null;
    if (!config.enableSimulcast) {
        simulcastSender = new NoSimulcastSender();
    } else {

        var isChromium = window.chrome,
            vendorName = window.navigator.vendor;
        if(isChromium !== null && isChromium !== undefined
            /* skip opera */
            && vendorName === "Google Inc."
            /* skip Chromium as suggested by fippo */
            && !window.navigator.appVersion.match(/Chromium\//) ) {
            var ver = parseInt(window.navigator.appVersion.match(/Chrome\/(\d+)\./)[1], 10);
            if (ver > 37) {
                simulcastSender = new NativeSimulcastSender();
            } else {
                simulcastSender = new NoSimulcastSender();
            }
        } else {
            simulcastSender = new NoSimulcastSender();
        }

    }

    return simulcastSender;
}


module.exports = getSimulcastSender;

},{"../RTC/RTCService":3,"./SimulcastUtil":37}],36:[function(require,module,exports){
var SimulcastUtils = require("./SimulcastUtil");
var SimulcastReceiver = require("./SimulcastReceiver");

/**
 *
 * @constructor
 */
function SimulcastManager() {

    // Create the simulcast utilities.
    this.simulcastUtils = new SimulcastUtils();

    // Create remote simulcast.
    this.simulcastReceiver = new SimulcastReceiver();

    // Initialize local simulcast.

    // TODO(gp) move into SimulcastManager.prototype.getUserMedia and take into
    // account constraints.
    var getSimulcastSender = require("./SimulcastSender");
    this.simulcastSender = getSimulcastSender();
}

/**
 * Restores the simulcast groups of the remote description. In
 * transformRemoteDescription we remove those in order for the set remote
 * description to succeed. The focus needs the signal the groups to new
 * participants.
 *
 * @param desc
 * @returns {*}
 */
SimulcastManager.prototype.reverseTransformRemoteDescription = function (desc) {
    return this.simulcastReceiver.reverseTransformRemoteDescription(desc);
};

/**
 * Removes the ssrc-group:SIM from the remote description bacause Chrome
 * either gets confused and thinks this is an FID group or, if an FID group
 * is already present, it fails to set the remote description.
 *
 * @param desc
 * @returns {*}
 */
SimulcastManager.prototype.transformRemoteDescription = function (desc) {
    return this.simulcastReceiver.transformRemoteDescription(desc);
};

/**
 * Gets the fully qualified msid (stream.id + track.id) associated to the
 * SSRC.
 *
 * @param ssrc
 * @returns {*}
 */
SimulcastManager.prototype.getRemoteVideoStreamIdBySSRC = function (ssrc) {
    return this.simulcastReceiver.getRemoteVideoStreamIdBySSRC(ssrc);
};

/**
 * Returns a stream with single video track, the one currently being
 * received by this endpoint.
 *
 * @param stream the remote simulcast stream.
 * @returns {webkitMediaStream}
 */
SimulcastManager.prototype.getReceivingVideoStream = function (stream) {
    return this.simulcastReceiver.getReceivingVideoStream(stream);
};

/**
 *
 *
 * @param desc
 * @returns {*}
 */
SimulcastManager.prototype.transformLocalDescription = function (desc) {
    return this.simulcastSender.transformLocalDescription(desc);
};

/**
 *
 * @returns {*}
 */
SimulcastManager.prototype.getLocalVideoStream = function() {
    return this.simulcastSender.getLocalVideoStream();
};

/**
 * GUM for simulcast.
 *
 * @param constraints
 * @param success
 * @param err
 */
SimulcastManager.prototype.getUserMedia = function (constraints, success, err) {

    this.simulcastSender.getUserMedia(constraints, success, err);
};

/**
 * Prepares the local description for public usage (i.e. to be signaled
 * through Jingle to the focus).
 *
 * @param desc
 * @returns {RTCSessionDescription}
 */
SimulcastManager.prototype.reverseTransformLocalDescription = function (desc) {
    return this.simulcastSender.reverseTransformLocalDescription(desc);
};

/**
 * Ensures that the simulcast group is present in the answer, _if_ native
 * simulcast is enabled,
 *
 * @param desc
 * @returns {*}
 */
SimulcastManager.prototype.transformAnswer = function (desc) {
    return this.simulcastSender.transformAnswer(desc);
};

SimulcastManager.prototype.getReceivingSSRC = function (jid) {
    return this.simulcastReceiver.getReceivingSSRC(jid);
};

SimulcastManager.prototype.getReceivingVideoStreamBySSRC = function (msid) {
    return this.simulcastReceiver.getReceivingVideoStreamBySSRC(msid);
};

/**
 *
 * @param lines
 * @param mediatypes
 * @returns {*}
 */
SimulcastManager.prototype.parseMedia = function(lines, mediatypes) {
    var sb = lines.sdp.split('\r\n');
    return this.simulcastUtils.parseMedia(sb, mediatypes);
};

SimulcastManager.prototype._setReceivingVideoStream = function(resource, ssrc) {
    this.simulcastReceiver._setReceivingVideoStream(resource, ssrc);
};

SimulcastManager.prototype._setLocalVideoStreamEnabled = function(ssrc, enabled) {
    this.simulcastSender._setLocalVideoStreamEnabled(ssrc, enabled);
};


var simulcast = new SimulcastManager();

$(document).bind('simulcastlayerschanged', function (event, endpointSimulcastLayers) {
    endpointSimulcastLayers.forEach(function (esl) {
        var ssrc = esl.simulcastLayer.primarySSRC;
        simulcast._setReceivingVideoStream(esl.endpoint, ssrc);
    });
});

$(document).bind('startsimulcastlayer', function (event, simulcastLayer) {
    var ssrc = simulcastLayer.primarySSRC;
    simulcast._setLocalVideoStreamEnabled(ssrc, true);
});

$(document).bind('stopsimulcastlayer', function (event, simulcastLayer) {
    var ssrc = simulcastLayer.primarySSRC;
    simulcast._setLocalVideoStreamEnabled(ssrc, false);
});

module.exports = simulcast;
},{"./SimulcastReceiver":34,"./SimulcastSender":35,"./SimulcastUtil":37}],37:[function(require,module,exports){
/**
 * Created by hristo on 11/12/14.
 */
/**
 *
 * @constructor
 */
function SimulcastUtils() {
    this.logger = new SimulcastLogger("SimulcastUtils");
}

/**
 *
 * @constructor
 */
function SimulcastLogger(name) {
    this.name = name;
}

SimulcastLogger.prototype.log = function (text) {
    console.log(text);
};

SimulcastLogger.prototype.info = function (text) {
    console.info(text);
};

SimulcastLogger.prototype.fine = function (text) {
    console.log(text);
};

SimulcastLogger.prototype.error = function (text) {
    console.error(text);
};

/**
 *
 * @type {{}}
 * @private
 */
SimulcastUtils.prototype._emptyCompoundIndex = {};

/**
 *
 * @param lines
 * @param videoSources
 * @private
 */
SimulcastUtils.prototype._replaceVideoSources = function (lines, videoSources) {
    var i, inVideo = false, index = -1, howMany = 0;

    this.logger.info('Replacing video sources...');

    for (i = 0; i < lines.length; i++) {
        if (inVideo && lines[i].substring(0, 'm='.length) === 'm=') {
            // Out of video.
            break;
        }

        if (!inVideo && lines[i].substring(0, 'm=video '.length) === 'm=video ') {
            // In video.
            inVideo = true;
        }

        if (inVideo && (lines[i].substring(0, 'a=ssrc:'.length) === 'a=ssrc:'
            || lines[i].substring(0, 'a=ssrc-group:'.length) === 'a=ssrc-group:')) {

            if (index === -1) {
                index = i;
            }

            howMany++;
        }
    }

    //  efficiency baby ;)
    lines.splice.apply(lines,
        [index, howMany].concat(videoSources));

};

SimulcastUtils.prototype._getVideoSources = function (lines) {
    var i, inVideo = false, sb = [];

    this.logger.info('Getting video sources...');

    for (i = 0; i < lines.length; i++) {
        if (inVideo && lines[i].substring(0, 'm='.length) === 'm=') {
            // Out of video.
            break;
        }

        if (!inVideo && lines[i].substring(0, 'm=video '.length) === 'm=video ') {
            // In video.
            inVideo = true;
        }

        if (inVideo && lines[i].substring(0, 'a=ssrc:'.length) === 'a=ssrc:') {
            // In SSRC.
            sb.push(lines[i]);
        }

        if (inVideo && lines[i].substring(0, 'a=ssrc-group:'.length) === 'a=ssrc-group:') {
            sb.push(lines[i]);
        }
    }

    return sb;
};

SimulcastUtils.prototype.parseMedia = function (lines, mediatypes) {
    var i, res = [], type, cur_media, idx, ssrcs, cur_ssrc, ssrc,
        ssrc_attribute, group, semantics, skip;

    this.logger.info('Parsing media sources...');

    for (i = 0; i < lines.length; i++) {
        if (lines[i].substring(0, 'm='.length) === 'm=') {

            type = lines[i]
                .substr('m='.length, lines[i].indexOf(' ') - 'm='.length);
            skip = mediatypes !== undefined && mediatypes.indexOf(type) === -1;

            if (!skip) {
                cur_media = {
                    'type': type,
                    'sources': {},
                    'groups': []
                };

                res.push(cur_media);
            }

        } else if (!skip && lines[i].substring(0, 'a=ssrc:'.length) === 'a=ssrc:') {

            idx = lines[i].indexOf(' ');
            ssrc = lines[i].substring('a=ssrc:'.length, idx);
            if (cur_media.sources[ssrc] === undefined) {
                cur_ssrc = {'ssrc': ssrc};
                cur_media.sources[ssrc] = cur_ssrc;
            }

            ssrc_attribute = lines[i].substr(idx + 1).split(':', 2)[0];
            cur_ssrc[ssrc_attribute] = lines[i].substr(idx + 1).split(':', 2)[1];

            if (cur_media.base === undefined) {
                cur_media.base = cur_ssrc;
            }

        } else if (!skip && lines[i].substring(0, 'a=ssrc-group:'.length) === 'a=ssrc-group:') {
            idx = lines[i].indexOf(' ');
            semantics = lines[i].substr(0, idx).substr('a=ssrc-group:'.length);
            ssrcs = lines[i].substr(idx).trim().split(' ');
            group = {
                'semantics': semantics,
                'ssrcs': ssrcs
            };
            cur_media.groups.push(group);
        } else if (!skip && (lines[i].substring(0, 'a=sendrecv'.length) === 'a=sendrecv' ||
            lines[i].substring(0, 'a=recvonly'.length) === 'a=recvonly' ||
            lines[i].substring(0, 'a=sendonly'.length) === 'a=sendonly' ||
            lines[i].substring(0, 'a=inactive'.length) === 'a=inactive')) {

            cur_media.direction = lines[i].substring('a='.length, 8);
        }
    }

    return res;
};

/**
 * The _indexOfArray() method returns the first a CompoundIndex at which a
 * given element can be found in the array, or _emptyCompoundIndex if it is
 * not present.
 *
 * Example:
 *
 * _indexOfArray('3', [ 'this is line 1', 'this is line 2', 'this is line 3' ])
 *
 * returns {row: 2, column: 14}
 *
 * @param needle
 * @param haystack
 * @param start
 * @returns {}
 * @private
 */
SimulcastUtils.prototype._indexOfArray = function (needle, haystack, start) {
    var length = haystack.length, idx, i;

    if (!start) {
        start = 0;
    }

    for (i = start; i < length; i++) {
        idx = haystack[i].indexOf(needle);
        if (idx !== -1) {
            return {row: i, column: idx};
        }
    }
    return this._emptyCompoundIndex;
};

SimulcastUtils.prototype._removeSimulcastGroup = function (lines) {
    var i;

    for (i = lines.length - 1; i >= 0; i--) {
        if (lines[i].indexOf('a=ssrc-group:SIM') !== -1) {
            lines.splice(i, 1);
        }
    }
};

SimulcastUtils.prototype._compileVideoSources = function (videoSources) {
    var sb = [], ssrc, addedSSRCs = [];

    this.logger.info('Compiling video sources...');

    // Add the groups
    if (videoSources.groups && videoSources.groups.length !== 0) {
        videoSources.groups.forEach(function (group) {
            if (group.ssrcs && group.ssrcs.length !== 0) {
                sb.push([['a=ssrc-group:', group.semantics].join(''), group.ssrcs.join(' ')].join(' '));

                // if (group.semantics !== 'SIM') {
                group.ssrcs.forEach(function (ssrc) {
                    addedSSRCs.push(ssrc);
                    sb.splice.apply(sb, [sb.length, 0].concat([
                        ["a=ssrc:", ssrc, " cname:", videoSources.sources[ssrc].cname].join(''),
                        ["a=ssrc:", ssrc, " msid:", videoSources.sources[ssrc].msid].join('')]));
                });
                //}
            }
        });
    }

    // Then add any free sources.
    if (videoSources.sources) {
        for (ssrc in videoSources.sources) {
            if (addedSSRCs.indexOf(ssrc) === -1) {
                sb.splice.apply(sb, [sb.length, 0].concat([
                    ["a=ssrc:", ssrc, " cname:", videoSources.sources[ssrc].cname].join(''),
                    ["a=ssrc:", ssrc, " msid:", videoSources.sources[ssrc].msid].join('')]));
            }
        }
    }

    return sb;
};

SimulcastUtils.prototype._ensureOrder = function (lines) {
    var videoSources, sb;

    videoSources = this.parseMedia(lines, ['video'])[0];
    sb = this._compileVideoSources(videoSources);

    this._replaceVideoSources(lines, sb);
};

SimulcastUtils.prototype.createLogger = function (name) {
    return new SimulcastLogger(name);
}


module.exports = SimulcastUtils;
},{}],38:[function(require,module,exports){
/**
 * Provides statistics for the local stream.
 */
var LocalStatsCollector = (function() {
    /**
     * Size of the webaudio analizer buffer.
     * @type {number}
     */
    var WEBAUDIO_ANALIZER_FFT_SIZE = 2048;

    /**
     * Value of the webaudio analizer smoothing time parameter.
     * @type {number}
     */
    var WEBAUDIO_ANALIZER_SMOOTING_TIME = 0.8;

    /**
     * <tt>LocalStatsCollector</tt> calculates statistics for the local stream.
     *
     * @param stream the local stream
     * @param interval stats refresh interval given in ms.
     * @param {function(LocalStatsCollector)} updateCallback the callback called on stats
     *                                   update.
     * @constructor
     */
    function LocalStatsCollectorProto(stream, interval, eventEmitter, rtcService) {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.stream = stream;
        this.intervalId = null;
        this.intervalMilis = interval;
        this.eventEmitter = eventEmitter;
        this.audioLevel = 0;
        this.rtcService = rtcService;
    }

    /**
     * Starts the collecting the statistics.
     */
    LocalStatsCollectorProto.prototype.start = function () {
        if (!window.AudioContext)
            return;

        var context = new AudioContext();
        var analyser = context.createAnalyser();
        analyser.smoothingTimeConstant = WEBAUDIO_ANALIZER_SMOOTING_TIME;
        analyser.fftSize = WEBAUDIO_ANALIZER_FFT_SIZE;


        var source = context.createMediaStreamSource(this.stream);
        source.connect(analyser);


        var self = this;

        this.intervalId = setInterval(
            function () {
                var array = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteTimeDomainData(array);
                var audioLevel = TimeDomainDataToAudioLevel(array);
                if(audioLevel != self.audioLevel) {
                    self.audioLevel = animateLevel(audioLevel, self.audioLevel);
                    if(!this.rtcService.localAudio.isMuted())
                        self.eventEmitter.emit("statistics.audioLevel", LocalStatsCollectorProto.LOCAL_JID,
                            self.audioLevel);
                }
            },
            this.intervalMilis
        );

    };

    /**
     * Stops collecting the statistics.
     */
    LocalStatsCollectorProto.prototype.stop = function () {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    };

    /**
     * Converts time domain data array to audio level.
     * @param array the time domain data array.
     * @returns {number} the audio level
     */
    var TimeDomainDataToAudioLevel = function (samples) {

        var maxVolume = 0;

        var length = samples.length;

        for (var i = 0; i < length; i++) {
            if (maxVolume < samples[i])
                maxVolume = samples[i];
        }

        return parseFloat(((maxVolume - 127) / 128).toFixed(3));
    };

    /**
     * Animates audio level change
     * @param newLevel the new audio level
     * @param lastLevel the last audio level
     * @returns {Number} the audio level to be set
     */
    function animateLevel(newLevel, lastLevel)
    {
        var value = 0;
        var diff = lastLevel - newLevel;
        if(diff > 0.2)
        {
            value = lastLevel - 0.2;
        }
        else if(diff < -0.4)
        {
            value = lastLevel + 0.4;
        }
        else
        {
            value = newLevel;
        }

        return parseFloat(value.toFixed(3));
    }

    /**
     * Indicates that this audio level is for local jid.
     * @type {string}
     */
    LocalStatsCollectorProto.LOCAL_JID = 'local';

    return LocalStatsCollectorProto;
})();

module.exports = LocalStatsCollector;

},{}],39:[function(require,module,exports){
/* global ssrc2jid */
/* jshint -W117 */
/**
 * Calculates packet lost percent using the number of lost packets and the
 * number of all packet.
 * @param lostPackets the number of lost packets
 * @param totalPackets the number of all packets.
 * @returns {number} packet loss percent
 */
function calculatePacketLoss(lostPackets, totalPackets) {
    if(!totalPackets || totalPackets <= 0 || !lostPackets || lostPackets <= 0)
        return 0;
    return Math.round((lostPackets/totalPackets)*100);
}

/**
 * Peer statistics data holder.
 * @constructor
 */
function PeerStats()
{
    this.ssrc2Loss = {};
    this.ssrc2AudioLevel = {};
    this.ssrc2bitrate = {};
    this.ssrc2resolution = {};
}

/**
 * The bandwidth
 * @type {{}}
 */
PeerStats.bandwidth = {};

/**
 * The bit rate
 * @type {{}}
 */
PeerStats.bitrate = {};



/**
 * The packet loss rate
 * @type {{}}
 */
PeerStats.packetLoss = null;

/**
 * Sets packets loss rate for given <tt>ssrc</tt> that blong to the peer
 * represented by this instance.
 * @param ssrc audio or video RTP stream SSRC.
 * @param lossRate new packet loss rate value to be set.
 */
PeerStats.prototype.setSsrcLoss = function (ssrc, lossRate)
{
    this.ssrc2Loss[ssrc] = lossRate;
};

/**
 * Sets resolution for given <tt>ssrc</tt> that belong to the peer
 * represented by this instance.
 * @param ssrc audio or video RTP stream SSRC.
 * @param resolution new resolution value to be set.
 */
PeerStats.prototype.setSsrcResolution = function (ssrc, resolution)
{
    if(resolution === null && this.ssrc2resolution[ssrc])
    {
        delete this.ssrc2resolution[ssrc];
    }
    else if(resolution !== null)
        this.ssrc2resolution[ssrc] = resolution;
};

/**
 * Sets the bit rate for given <tt>ssrc</tt> that blong to the peer
 * represented by this instance.
 * @param ssrc audio or video RTP stream SSRC.
 * @param bitrate new bitrate value to be set.
 */
PeerStats.prototype.setSsrcBitrate = function (ssrc, bitrate)
{
    if(this.ssrc2bitrate[ssrc])
    {
        this.ssrc2bitrate[ssrc].download += bitrate.download;
        this.ssrc2bitrate[ssrc].upload += bitrate.upload;
    }
    else {
        this.ssrc2bitrate[ssrc] = bitrate;
    }
};

/**
 * Sets new audio level(input or output) for given <tt>ssrc</tt> that identifies
 * the stream which belongs to the peer represented by this instance.
 * @param ssrc RTP stream SSRC for which current audio level value will be
 *        updated.
 * @param audioLevel the new audio level value to be set. Value is truncated to
 *        fit the range from 0 to 1.
 */
PeerStats.prototype.setSsrcAudioLevel = function (ssrc, audioLevel)
{
    // Range limit 0 - 1
    this.ssrc2AudioLevel[ssrc] = Math.min(Math.max(audioLevel, 0), 1);
};

/**
 * Array with the transport information.
 * @type {Array}
 */
PeerStats.transport = [];


/**
 * <tt>StatsCollector</tt> registers for stats updates of given
 * <tt>peerconnection</tt> in given <tt>interval</tt>. On each update particular
 * stats are extracted and put in {@link PeerStats} objects. Once the processing
 * is done <tt>audioLevelsUpdateCallback</tt> is called with <tt>this</tt>
 * instance as an event source.
 *
 * @param peerconnection webRTC peer connection object.
 * @param interval stats refresh interval given in ms.
 * @param {function(StatsCollector)} audioLevelsUpdateCallback the callback
 * called on stats update.
 * @constructor
 */
function StatsCollector(peerconnection, audioLevelsInterval, statsInterval, eventEmitter)
{
    this.peerconnection = peerconnection;
    this.baselineAudioLevelsReport = null;
    this.currentAudioLevelsReport = null;
    this.currentStatsReport = null;
    this.baselineStatsReport = null;
    this.audioLevelsIntervalId = null;

    /**
     * Gather PeerConnection stats once every this many milliseconds.
     */
    this.GATHER_INTERVAL = 10000;

    /**
     * Log stats via the focus once every this many milliseconds.
     */
    this.LOG_INTERVAL = 60000;

    /**
     * Gather stats and store them in this.statsToBeLogged.
     */
    this.gatherStatsIntervalId = null;

    /**
     * Send the stats already saved in this.statsToBeLogged to be logged via
     * the focus.
     */
    this.logStatsIntervalId = null;

    /**
     * Stores the statistics which will be send to the focus to be logged.
     */
    this.statsToBeLogged =
    {
      timestamps: [],
      stats: {}
    };

    // Updates stats interval
    this.audioLevelsIntervalMilis = audioLevelsInterval;

    this.statsIntervalId = null;
    this.statsIntervalMilis = statsInterval;
    // Map of jids to PeerStats
    this.jid2stats = {};

    this.eventEmitter = eventEmitter;
}

module.exports = StatsCollector;

/**
 * Stops stats updates.
 */
StatsCollector.prototype.stop = function ()
{
    if (this.audioLevelsIntervalId)
    {
        clearInterval(this.audioLevelsIntervalId);
        this.audioLevelsIntervalId = null;
        clearInterval(this.statsIntervalId);
        this.statsIntervalId = null;
        clearInterval(this.logStatsIntervalId);
        this.logStatsIntervalId = null;
        clearInterval(this.gatherStatsIntervalId);
        this.gatherStatsIntervalId = null;
    }
};

/**
 * Callback passed to <tt>getStats</tt> method.
 * @param error an error that occurred on <tt>getStats</tt> call.
 */
StatsCollector.prototype.errorCallback = function (error)
{
    console.error("Get stats error", error);
    this.stop();
};

/**
 * Starts stats updates.
 */
StatsCollector.prototype.start = function ()
{
    var self = this;
    this.audioLevelsIntervalId = setInterval(
        function ()
        {
            // Interval updates
            self.peerconnection.getStats(
                function (report)
                {
                    var results = null;
                    if(!report || !report.result || typeof report.result != 'function')
                    {
                        results = report;
                    }
                    else
                    {
                        results = report.result();
                    }
                    //console.error("Got interval report", results);
                    self.currentAudioLevelsReport = results;
                    self.processAudioLevelReport();
                    self.baselineAudioLevelsReport =
                        self.currentAudioLevelsReport;
                },
                self.errorCallback
            );
        },
        self.audioLevelsIntervalMilis
    );

    this.statsIntervalId = setInterval(
        function () {
            // Interval updates
            self.peerconnection.getStats(
                function (report)
                {
                    var results = null;
                    if(!report || !report.result || typeof report.result != 'function')
                    {
                        //firefox
                        results = report;
                    }
                    else
                    {
                        //chrome
                        results = report.result();
                    }
                    //console.error("Got interval report", results);
                    self.currentStatsReport = results;
                    try
                    {
                        self.processStatsReport();
                    }
                    catch(e)
                    {
                        console.error("Unsupported key:" + e);
                    }

                    self.baselineStatsReport = self.currentStatsReport;
                },
                self.errorCallback
            );
        },
        self.statsIntervalMilis
    );

    if (config.logStats) {
        this.gatherStatsIntervalId = setInterval(
            function () {
                self.peerconnection.getStats(
                    function (report) {
                        self.addStatsToBeLogged(report.result());
                    },
                    function () {
                    }
                );
            },
            this.GATHER_INTERVAL
        );

        this.logStatsIntervalId = setInterval(
            function() { self.logStats(); },
            this.LOG_INTERVAL);
    }
};

/**
 * Converts the stats to the format used for logging, and saves the data in
 * this.statsToBeLogged.
 * @param reports Reports as given by webkitRTCPerConnection.getStats.
 */
StatsCollector.prototype.addStatsToBeLogged = function (reports) {
    var self = this;
    var num_records = this.statsToBeLogged.timestamps.length;
    this.statsToBeLogged.timestamps.push(new Date().getTime());
    reports.map(function (report) {
        var stat = self.statsToBeLogged.stats[report.id];
        if (!stat) {
            stat = self.statsToBeLogged.stats[report.id] = {};
        }
        stat.type = report.type;
        report.names().map(function (name) {
            var values = stat[name];
            if (!values) {
                values = stat[name] = [];
            }
            while (values.length < num_records) {
                values.push(null);
            }
            values.push(report.stat(name));
        });
    });
};

StatsCollector.prototype.logStats = function () {
    if (!focusJid) {
        return;
    }

    var deflate = true;

    var content = JSON.stringify(this.statsToBeLogged);
    if (deflate) {
        content = String.fromCharCode.apply(null, Pako.deflateRaw(content));
    }
    content = Base64.encode(content);

    // XEP-0337-ish
    var message = $msg({to: focusJid, type: 'normal'});
    message.c('log', { xmlns: 'urn:xmpp:eventlog',
                       id: 'PeerConnectionStats'});
    message.c('message').t(content).up();
    if (deflate) {
        message.c('tag', {name: "deflated", value: "true"}).up();
    }
    message.up();

    connection.send(message);

    // Reset the stats
    this.statsToBeLogged.stats = {};
    this.statsToBeLogged.timestamps = [];
};
var keyMap = {
    "firefox": {
        "ssrc": "ssrc",
        "packetsReceived": "packetsReceived",
        "packetsLost": "packetsLost",
        "packetsSent": "packetsSent",
        "bytesReceived": "bytesReceived",
        "bytesSent": "bytesSent"
    },
    "chrome": {
        "receiveBandwidth": "googAvailableReceiveBandwidth",
        "sendBandwidth": "googAvailableSendBandwidth",
        "remoteAddress": "googRemoteAddress",
        "transportType": "googTransportType",
        "localAddress": "googLocalAddress",
        "activeConnection": "googActiveConnection",
        "ssrc": "ssrc",
        "packetsReceived": "packetsReceived",
        "packetsSent": "packetsSent",
        "packetsLost": "packetsLost",
        "bytesReceived": "bytesReceived",
        "bytesSent": "bytesSent",
        "googFrameHeightReceived": "googFrameHeightReceived",
        "googFrameWidthReceived": "googFrameWidthReceived",
        "googFrameHeightSent": "googFrameHeightSent",
        "googFrameWidthSent": "googFrameWidthSent",
        "audioInputLevel": "audioInputLevel",
        "audioOutputLevel": "audioOutputLevel"
    }
};

/**
 * Stats processing logic.
 */
StatsCollector.prototype.processStatsReport = function () {
    if (!this.baselineStatsReport) {
        return;
    }

    var XMPPService = require("../xmpp/XMPPService");
    for (var idx in this.currentStatsReport) {
        var now = this.currentStatsReport[idx];
        try {
            if (getStatValue(now, 'receiveBandwidth') ||
                getStatValue(now, 'sendBandwidth')) {
                PeerStats.bandwidth = {
                    "download": Math.round(
                            (getStatValue(now, 'receiveBandwidth')) / 1000),
                    "upload": Math.round(
                            (getStatValue(now, 'sendBandwidth')) / 1000)
                };
            }
        }
        catch(e){/*not supported*/}

        if(now.type == 'googCandidatePair')
        {
            var ip, type, localIP, active;
            try {
                ip = getStatValue(now, 'remoteAddress');
                type = getStatValue(now, "transportType");
                localIP = getStatValue(now, "localAddress");
                active = getStatValue(now, "activeConnection");
            }
            catch(e){/*not supported*/}
            if(!ip || !type || !localIP || active != "true")
                continue;
            var addressSaved = false;
            for(var i = 0; i < PeerStats.transport.length; i++)
            {
                if(PeerStats.transport[i].ip == ip &&
                    PeerStats.transport[i].type == type &&
                    PeerStats.transport[i].localip == localIP)
                {
                    addressSaved = true;
                }
            }
            if(addressSaved)
                continue;
            PeerStats.transport.push({localip: localIP, ip: ip, type: type});
            continue;
        }

        if(now.type == "candidatepair")
        {
            if(now.state == "succeeded")
                continue;

            var local = this.currentStatsReport[now.localCandidateId];
            var remote = this.currentStatsReport[now.remoteCandidateId];
            PeerStats.transport.push({localip: local.ipAddress + ":" + local.portNumber,
                ip: remote.ipAddress + ":" + remote.portNumber, type: local.transport});

        }

        if (now.type != 'ssrc' && now.type != "outboundrtp" &&
            now.type != "inboundrtp") {
            continue;
        }

        var before = this.baselineStatsReport[idx];
        if (!before) {
            console.warn(getStatValue(now, 'ssrc') + ' not enough data');
            continue;
        }

        var ssrc = getStatValue(now, 'ssrc');
        if(!ssrc)
            continue;
        var jid = XMPPService.getJIDFromSSRC(ssrc);
        if (!jid) {
            console.warn("No jid for ssrc: " + ssrc);
            continue;
        }

        var jidStats = this.jid2stats[jid];
        if (!jidStats) {
            jidStats = new PeerStats();
            this.jid2stats[jid] = jidStats;
        }

        var isDownloadStream = true;
        var key = 'packetsReceived';
        if (!getStatValue(now, key))
        {
            isDownloadStream = false;
            key = 'packetsSent';
            if (!getStatValue(now, key))
            {
                console.warn("No packetsReceived nor packetSent stat found");
                continue;
            }
        }
        var packetsNow = getStatValue(now, key);
        if(!packetsNow || packetsNow < 0)
            packetsNow = 0;

        var packetsBefore = getStatValue(before, key);
        if(!packetsBefore || packetsBefore < 0)
            packetsBefore = 0;
        var packetRate = packetsNow - packetsBefore;
        if(!packetRate || packetRate < 0)
            packetRate = 0;
        var currentLoss = getStatValue(now, 'packetsLost');
        if(!currentLoss || currentLoss < 0)
            currentLoss = 0;
        var previousLoss = getStatValue(before, 'packetsLost');
        if(!previousLoss || previousLoss < 0)
            previousLoss = 0;
        var lossRate = currentLoss - previousLoss;
        if(!lossRate || lossRate < 0)
            lossRate = 0;
        var packetsTotal = (packetRate + lossRate);

        jidStats.setSsrcLoss(ssrc,
            {"packetsTotal": packetsTotal,
                "packetsLost": lossRate,
                "isDownloadStream": isDownloadStream});


        var bytesReceived = 0, bytesSent = 0;
        if(getStatValue(now, "bytesReceived"))
        {
            bytesReceived = getStatValue(now, "bytesReceived") -
                getStatValue(before, "bytesReceived");
        }

        if(getStatValue(now, "bytesSent"))
        {
            bytesSent = getStatValue(now, "bytesSent") -
                getStatValue(before, "bytesSent");
        }

        var time = Math.round((now.timestamp - before.timestamp) / 1000);
        if(bytesReceived <= 0 || time <= 0)
        {
            bytesReceived = 0;
        }
        else
        {
            bytesReceived = Math.round(((bytesReceived * 8) / time) / 1000);
        }

        if(bytesSent <= 0 || time <= 0)
        {
            bytesSent = 0;
        }
        else
        {
            bytesSent = Math.round(((bytesSent * 8) / time) / 1000);
        }

        jidStats.setSsrcBitrate(ssrc, {
            "download": bytesReceived,
            "upload": bytesSent});

        var resolution = {height: null, width: null};
        try {
            if (getStatValue(now, "googFrameHeightReceived") &&
                getStatValue(now, "googFrameWidthReceived")) {
                resolution.height = getStatValue(now, "googFrameHeightReceived");
                resolution.width = getStatValue(now, "googFrameWidthReceived");
            }
            else if (getStatValue(now, "googFrameHeightSent") &&
                getStatValue(now, "googFrameWidthSent")) {
                resolution.height = getStatValue(now, "googFrameHeightSent");
                resolution.width = getStatValue(now, "googFrameWidthSent");
            }
        }
        catch(e){/*not supported*/}

        if(resolution.height && resolution.width)
        {
            jidStats.setSsrcResolution(ssrc, resolution);
        }
        else
        {
            jidStats.setSsrcResolution(ssrc, null);
        }


    }

    var self = this;
    // Jid stats
    var totalPackets = {download: 0, upload: 0};
    var lostPackets = {download: 0, upload: 0};
    var bitrateDownload = 0;
    var bitrateUpload = 0;
    var resolutions = {};
    Object.keys(this.jid2stats).forEach(
        function (jid)
        {
            Object.keys(self.jid2stats[jid].ssrc2Loss).forEach(
                function (ssrc)
                {
                    var type = "upload";
                    if(self.jid2stats[jid].ssrc2Loss[ssrc].isDownloadStream)
                        type = "download";
                    totalPackets[type] +=
                        self.jid2stats[jid].ssrc2Loss[ssrc].packetsTotal;
                    lostPackets[type] +=
                        self.jid2stats[jid].ssrc2Loss[ssrc].packetsLost;
                }
            );
            Object.keys(self.jid2stats[jid].ssrc2bitrate).forEach(
                function (ssrc) {
                    bitrateDownload +=
                        self.jid2stats[jid].ssrc2bitrate[ssrc].download;
                    bitrateUpload +=
                        self.jid2stats[jid].ssrc2bitrate[ssrc].upload;

                    delete self.jid2stats[jid].ssrc2bitrate[ssrc];
                }
            );
            resolutions[jid] = self.jid2stats[jid].ssrc2resolution;
        }
    );

    PeerStats.bitrate = {"upload": bitrateUpload, "download": bitrateDownload};

    PeerStats.packetLoss = {
        total:
            calculatePacketLoss(lostPackets.download + lostPackets.upload,
                totalPackets.download + totalPackets.upload),
        download:
            calculatePacketLoss(lostPackets.download, totalPackets.download),
        upload:
            calculatePacketLoss(lostPackets.upload, totalPackets.upload)
    };
    this.eventEmitter.emit("statistics.connectionstats",
        {
            "bitrate": PeerStats.bitrate,
            "packetLoss": PeerStats.packetLoss,
            "bandwidth": PeerStats.bandwidth,
            "resolution": resolutions,
            "transport": PeerStats.transport
        });
    PeerStats.transport = [];

};

/**
 * Stats processing logic.
 */
StatsCollector.prototype.processAudioLevelReport = function ()
{
    if (!this.baselineAudioLevelsReport)
    {
        return;
    }

    for (var idx in this.currentAudioLevelsReport)
    {
        var now = this.currentAudioLevelsReport[idx];

        if (now.type != 'ssrc')
        {
            continue;
        }

        var before = this.baselineAudioLevelsReport[idx];
        if (!before)
        {
            console.warn(getStatValue(now, 'ssrc') + ' not enough data');
            continue;
        }


        var ssrc = getStatValue(now, 'ssrc');
        var jid = require("../xmpp/XMPPService").getJIDFromSSRC(ssrc);
        if (!jid)
        {
            console.warn("No jid for ssrc: " + ssrc);
            continue;
        }

        var jidStats = this.jid2stats[jid];
        if (!jidStats)
        {
            jidStats = new PeerStats();
            this.jid2stats[jid] = jidStats;
        }

        // Audio level
        var audioLevel = null;

        try {
            audioLevel = getStatValue(now, 'audioInputLevel');
            if (!audioLevel)
                audioLevel = getStatValue(now, 'audioOutputLevel');
        }
        catch(e) {/*not supported*/
            console.warn("Audio Levels are not available in the statistics.");
            clearInterval(this.audioLevelsIntervalId);
            return;
        }

        if (audioLevel)
        {
            // TODO: can't find specs about what this value really is,
            // but it seems to vary between 0 and around 32k.
            audioLevel = audioLevel / 32767;
            jidStats.setSsrcAudioLevel(ssrc, audioLevel);
            if(jid != require("../xmpp/XMPPService").getMyJID())
                this.eventEmitter.emit("statistics.audioLevel",
                    Strophe.getResourceFromJid(jid), audioLevel);
        }

    }


};

function getStatValue(item, name) {
    if(!keyMap[RTC.browser][name])
        throw "The property isn't supported!";
    var key = keyMap[RTC.browser][name];
    return RTC.browser == "chrome"? item.stat(key) : item[key];
}
},{"../xmpp/XMPPService":44}],40:[function(require,module,exports){
/**
 * Created by hristo on 8/4/14.
 */
var LocalStats = require("./LocalStatsCollector.js");
var RTPStats = require("./RTPStatsCollector.js");
var EventEmitter = require("events");
var StreamEventTypes = require("../service/RTC/StreamEventTypes.js");
var XMPPEvents = require("../service/xmpp/XMPPEvents");

var eventEmitter = new EventEmitter();

var localStats = null;

var rtpStats = null;

var RTCService = null;

function stopLocal()
{
    if(localStats)
    {
        localStats.stop();
        localStats = null;
    }
}

function stopRemote()
{
    if(rtpStats)
    {
        rtpStats.stop();
        eventEmitter.emit("statistics.stop");
        rtpStats = null;
    }
}

function startRemoteStats (peerconnection) {
    if (config.enableRtpStats)
    {
        if(rtpStats)
        {
            rtpStats.stop();
            rtpStats = null;
        }

        rtpStats = new RTPStats(peerconnection, 200, 2000, eventEmitter);
        rtpStats.start();
    }

}


var StatisticsService =
{


    LOCAL_JID: 'local',

    addAudioLevelListener: function(listener)
    {
        eventEmitter.on("statistics.audioLevel", listener);
    },

    removeAudioLevelListener: function(listener)
    {
        eventEmitter.removeListener("statistics.audioLevel", listener);
    },

    addConnectionStatsListener: function(listener)
    {
        eventEmitter.on("statistics.connectionstats", listener);
    },

    removeConnectionStatsListener: function(listener)
    {
        eventEmitter.removeListener("statistics.connectionstats", listener);
    },


    addRemoteStatsStopListener: function(listener)
    {
        eventEmitter.on("statistics.stop", listener);
    },

    removeRemoteStatsStopListener: function(listener)
    {
        eventEmitter.removeListener("statistics.stop", listener);
    },

    stop: function () {
        stopLocal();
        stopRemote();
        if(eventEmitter)
        {
            eventEmitter.removeAllListeners();
        }
    },


    start: function () {
        RTCService = require("../RTC/RTCService");
        RTCService.addStreamListener(this.onStreamCreated,
            StreamEventTypes.EVENT_TYPE_LOCAL_CREATED);
        var XMPPService = require("../xmpp/XMPPService");
        XMPPService.addListener(XMPPEvents.CONFERENCE_CERATED,
            function (event) {
                startRemoteStats(event.peerconnection);
            });
        XMPPService.addListener(XMPPEvents.CALL_INCOMING, function (event) {
            startRemoteStats(event.peerconnection);
        });
        XMPPService.addListener(XMPPEvents.DISPOSE_CONFERENCE,
            function (onUnload) {
                stopRemote();
                if(onUnload) {
                    stopLocal();
                }
            });
    },

    onStreamCreated: function(stream)
    {
        if(!stream.isAudioStream())
            return;

        localStats = new LocalStats(stream.getOriginalStream(), 100,
            eventEmitter, RTCService);
        localStats.start();
    }
};




module.exports = StatisticsService;
},{"../RTC/RTCService":3,"../service/RTC/StreamEventTypes.js":32,"../service/xmpp/XMPPEvents":33,"../xmpp/XMPPService":44,"./LocalStatsCollector.js":38,"./RTPStatsCollector.js":39,"events":57}],41:[function(require,module,exports){
var RoomNameGenerator = function(my) {
    /**
     * Constructs new RoomNameGenerator object.
     * @constructor constructs new RoomNameGenerator object.
     */
    function RoomNameGeneratorProto()
    {
    }

    //var nouns = [
    //];
    var pluralNouns = [
        "Aliens", "Animals", "Antelopes", "Ants", "Apes", "Apples", "Baboons", "Bacteria", "Badgers", "Bananas", "Bats",
        "Bears", "Birds", "Bonobos", "Brides", "Bugs", "Bulls", "Butterflies", "Cheetahs",
        "Cherries", "Chicken", "Children", "Chimps", "Clowns", "Cows", "Creatures", "Dinosaurs", "Dogs", "Dolphins",
        "Donkeys", "Dragons", "Ducks", "Dwarfs", "Eagles", "Elephants", "Elves", "FAIL", "Fathers",
        "Fish", "Flowers", "Frogs", "Fruit", "Fungi", "Galaxies", "Geese", "Goats",
        "Gorillas", "Hedgehogs", "Hippos", "Horses", "Hunters", "Insects", "Kids", "Knights",
        "Lemons", "Lemurs", "Leopards", "LifeForms", "Lions", "Lizards", "Mice", "Monkeys", "Monsters",
        "Mushrooms", "Octopodes", "Oranges", "Orangutans", "Organisms", "Pants", "Parrots", "Penguins",
        "People", "Pigeons", "Pigs", "Pineapples", "Plants", "Potatoes", "Priests", "Rats", "Reptiles", "Reptilians",
        "Rhinos", "Seagulls", "Sheep", "Siblings", "Snakes", "Spaghetti", "Spiders", "Squid", "Squirrels",
        "Stars", "Students", "Teachers", "Tigers", "Tomatoes", "Trees", "Vampires", "Vegetables", "Viruses", "Vulcans",
        "Warewolves", "Weasels", "Whales", "Witches", "Wizards", "Wolves", "Workers", "Worms", "Zebras"
    ];
    //var places = [
    //"Pub", "University", "Airport", "Library", "Mall", "Theater", "Stadium", "Office", "Show", "Gallows", "Beach",
    // "Cemetery", "Hospital", "Reception", "Restaurant", "Bar", "Church", "House", "School", "Square", "Village",
    // "Cinema", "Movies", "Party", "Restroom", "End", "Jail", "PostOffice", "Station", "Circus", "Gates", "Entrance",
    // "Bridge"
    //];
    var verbs = [
        "Abandon", "Adapt", "Advertise", "Answer", "Anticipate", "Appreciate",
        "Approach", "Argue", "Ask", "Bite", "Blossom", "Blush", "Breathe", "Breed", "Bribe", "Burn", "Calculate",
        "Clean", "Code", "Communicate", "Compute", "Confess", "Confiscate", "Conjugate", "Conjure", "Consume",
        "Contemplate", "Crawl", "Dance", "Delegate", "Devour", "Develop", "Differ", "Discuss",
        "Dissolve", "Drink", "Eat", "Elaborate", "Emancipate", "Estimate", "Expire", "Extinguish",
        "Extract", "FAIL", "Facilitate", "Fall", "Feed", "Finish", "Floss", "Fly", "Follow", "Fragment", "Freeze",
        "Gather", "Glow", "Grow", "Hex", "Hide", "Hug", "Hurry", "Improve", "Intersect", "Investigate", "Jinx",
        "Joke", "Jubilate", "Kiss", "Laugh", "Manage", "Meet", "Merge", "Move", "Object", "Observe", "Offer",
        "Paint", "Participate", "Party", "Perform", "Plan", "Pursue", "Pierce", "Play", "Postpone", "Pray", "Proclaim",
        "Question", "Read", "Reckon", "Rejoice", "Represent", "Resize", "Rhyme", "Scream", "Search", "Select", "Share", "Shoot",
        "Shout", "Signal", "Sing", "Skate", "Sleep", "Smile", "Smoke", "Solve", "Spell", "Steer", "Stink",
        "Substitute", "Swim", "Taste", "Teach", "Terminate", "Think", "Type", "Unite", "Vanish", "Worship"
    ];
    var adverbs = [
        "Absently", "Accurately", "Accusingly", "Adorably", "AllTheTime", "Alone", "Always", "Amazingly", "Angrily",
        "Anxiously", "Anywhere", "Appallingly", "Apparently", "Articulately", "Astonishingly", "Badly", "Barely",
        "Beautifully", "Blindly", "Bravely", "Brightly", "Briskly", "Brutally", "Calmly", "Carefully", "Casually",
        "Cautiously", "Cleverly", "Constantly", "Correctly", "Crazily", "Curiously", "Cynically", "Daily",
        "Dangerously", "Deliberately", "Delicately", "Desperately", "Discreetly", "Eagerly", "Easily", "Euphoricly",
        "Evenly", "Everywhere", "Exactly", "Expectantly", "Extensively", "FAIL", "Ferociously", "Fiercely", "Finely",
        "Flatly", "Frequently", "Frighteningly", "Gently", "Gloriously", "Grimly", "Guiltily", "Happily",
        "Hard", "Hastily", "Heroically", "High", "Highly", "Hourly", "Humbly", "Hysterically", "Immensely",
        "Impartially", "Impolitely", "Indifferently", "Intensely", "Jealously", "Jovially", "Kindly", "Lazily",
        "Lightly", "Loudly", "Lovingly", "Loyally", "Magnificently", "Malevolently", "Merrily", "Mightily", "Miserably",
        "Mysteriously", "NOT", "Nervously", "Nicely", "Nowhere", "Objectively", "Obnoxiously", "Obsessively",
        "Obviously", "Often", "Painfully", "Patiently", "Playfully", "Politely", "Poorly", "Precisely", "Promptly",
        "Quickly", "Quietly", "Randomly", "Rapidly", "Rarely", "Recklessly", "Regularly", "Remorsefully", "Responsibly",
        "Rudely", "Ruthlessly", "Sadly", "Scornfully", "Seamlessly", "Seldom", "Selfishly", "Seriously", "Shakily",
        "Sharply", "Sideways", "Silently", "Sleepily", "Slightly", "Slowly", "Slyly", "Smoothly", "Softly", "Solemnly", "Steadily", "Sternly", "Strangely", "Strongly", "Stunningly", "Surely", "Tenderly", "Thoughtfully",
        "Tightly", "Uneasily", "Vanishingly", "Violently", "Warmly", "Weakly", "Wearily", "Weekly", "Weirdly", "Well",
        "Well", "Wickedly", "Wildly", "Wisely", "Wonderfully", "Yearly"
    ];
    var adjectives = [
        "Abominable", "Accurate", "Adorable", "All", "Alleged", "Ancient", "Angry", "Angry", "Anxious", "Appalling",
        "Apparent", "Astonishing", "Attractive", "Awesome", "Baby", "Bad", "Beautiful", "Benign", "Big", "Bitter",
        "Blind", "Blue", "Bold", "Brave", "Bright", "Brisk", "Calm", "Camouflaged", "Casual", "Cautious",
        "Choppy", "Chosen", "Clever", "Cold", "Cool", "Crawly", "Crazy", "Creepy", "Cruel", "Curious", "Cynical",
        "Dangerous", "Dark", "Delicate", "Desperate", "Difficult", "Discreet", "Disguised", "Dizzy",
        "Dumb", "Eager", "Easy", "Edgy", "Electric", "Elegant", "Emancipated", "Enormous", "Euphoric", "Evil",
        "FAIL", "Fast", "Ferocious", "Fierce", "Fine", "Flawed", "Flying", "Foolish", "Foxy",
        "Freezing", "Funny", "Furious", "Gentle", "Glorious", "Golden", "Good", "Green", "Green", "Guilty",
        "Hairy", "Happy", "Hard", "Hasty", "Hazy", "Heroic", "Hostile", "Hot", "Humble", "Humongous",
        "Humorous", "Hysterical", "Idealistic", "Ignorant", "Immense", "Impartial", "Impolite", "Indifferent",
        "Infuriated", "Insightful", "Intense", "Interesting", "Intimidated", "Intriguing", "Jealous", "Jolly", "Jovial",
        "Jumpy", "Kind", "Laughing", "Lazy", "Liquid", "Lonely", "Longing", "Loud", "Loving", "Loyal", "Macabre", "Mad",
        "Magical", "Magnificent", "Malevolent", "Medieval", "Memorable", "Mere", "Merry", "Mighty",
        "Mischievous", "Miserable", "Modified", "Moody", "Most", "Mysterious", "Mystical", "Needy",
        "Nervous", "Nice", "Objective", "Obnoxious", "Obsessive", "Obvious", "Opinionated", "Orange",
        "Painful", "Passionate", "Perfect", "Pink", "Playful", "Poisonous", "Polite", "Poor", "Popular", "Powerful", 
        "Precise", "Preserved", "Pretty", "Purple", "Quick", "Quiet", "Random", "Rapid", "Rare", "Real",
        "Reassuring", "Reckless", "Red", "Regular", "Remorseful", "Responsible", "Rich", "Rude", "Ruthless",
        "Sad", "Scared", "Scary", "Scornful", "Screaming", "Selfish", "Serious", "Shady", "Shaky", "Sharp",
        "Shiny", "Shy", "Simple", "Sleepy", "Slow", "Sly", "Small", "Smart", "Smelly", "Smiling", "Smooth",
        "Smug", "Sober", "Soft", "Solemn", "Square", "Square", "Steady", "Strange", "Strong",
        "Stunning", "Subjective", "Successful", "Surly", "Sweet", "Tactful", "Tense",
        "Thoughtful", "Tight", "Tiny", "Tolerant", "Uneasy", "Unique", "Unseen", "Warm", "Weak",
        "Weird", "WellCooked", "Wild", "Wise", "Witty", "Wonderful", "Worried", "Yellow", "Young",
        "Zealous"
        ];
    //var pronouns = [
    //];
    //var conjunctions = [
    //"And", "Or", "For", "Above", "Before", "Against", "Between"
    //];

    /*
     * Maps a string (category name) to the array of words from that category.
     */
    var CATEGORIES =
    {
        //"_NOUN_": nouns,
        "_PLURALNOUN_": pluralNouns,
        //"_PLACE_": places,
        "_VERB_": verbs,
        "_ADVERB_": adverbs,
        "_ADJECTIVE_": adjectives
        //"_PRONOUN_": pronouns,
        //"_CONJUNCTION_": conjunctions,
    };

    var PATTERNS = [
        "_ADJECTIVE__PLURALNOUN__VERB__ADVERB_"

        // BeautifulFungiOrSpaghetti
        //"_ADJECTIVE__PLURALNOUN__CONJUNCTION__PLURALNOUN_",

        // AmazinglyScaryToy
        //"_ADVERB__ADJECTIVE__NOUN_",

        // NeitherTrashNorRifle
        //"Neither_NOUN_Nor_NOUN_",
        //"Either_NOUN_Or_NOUN_",

        // EitherCopulateOrInvestigate
        //"Either_VERB_Or_VERB_",
        //"Neither_VERB_Nor_VERB_",

        //"The_ADJECTIVE__ADJECTIVE__NOUN_",
        //"The_ADVERB__ADJECTIVE__NOUN_",
        //"The_ADVERB__ADJECTIVE__NOUN_s",
        //"The_ADVERB__ADJECTIVE__PLURALNOUN__VERB_",

        // WolvesComputeBadly
        //"_PLURALNOUN__VERB__ADVERB_",

        // UniteFacilitateAndMerge
        //"_VERB__VERB_And_VERB_",

        //NastyWitchesAtThePub
        //"_ADJECTIVE__PLURALNOUN_AtThe_PLACE_",
    ];


    /*
     * Returns a random element from the array 'arr' 
     */
    function randomElement(arr)
    {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /*
     * Returns true if the string 's' contains one of the
     * template strings.
     */
    function hasTemplate(s)
    {
        for (var template in CATEGORIES){
            if (s.indexOf(template) >= 0){
                return true;
            }
        }
    }

    /**
     * Generates new room name.
     */
    RoomNameGeneratorProto.generateRoomWithoutSeparator = function()
    {
        // Note that if more than one pattern is available, the choice of 'name' won't be random (names from patterns
        // with fewer options will have higher probability of being chosen that names from patterns with more options).
        var name = randomElement(PATTERNS);
        var word;
        while (hasTemplate(name)){
            for (var template in CATEGORIES){
                word = randomElement(CATEGORIES[template]);
                name = name.replace(template, word);
            }
        }

        return name;
    };

    return RoomNameGeneratorProto;
}();


},{}],42:[function(require,module,exports){
(function () {

function trackUsage(eventname, obj) {
    //console.log('track', eventname, obj);
    // implement your own tracking mechanism here
}
if (typeof exports !== 'undefined') {
    module.exports = trackUsage;
} else {
    window.trackUsage = trackUsage;
}

})();

},{}],43:[function(require,module,exports){
/* global $ */
/**
 * Utility functions.
 */
var Util = (function (my) {

    /**
     * Returns the text width for the given element.
     *
     * @param el the element
     */
    my.getTextWidth = function (el) {
        return (el.clientWidth + 1);
    };

    /**
     * Returns the text height for the given element.
     *
     * @param el the element
     */
    my.getTextHeight = function (el) {
        return (el.clientHeight + 1);
    };

    /**
     * Casts the given number to integer.
     *
     * @param number the number to cast
     */
    my.toInteger = function (number) {
        return Math.round(Number(number));
    };

    /**
     * Plays the sound given by id.
     *
     * @param id the identifier of the audio element.
     */
    my.playSoundNotification = function (id) {
        document.getElementById(id).play();
    };

    /**
     * Escapes the given text.
     */
    my.escapeHtml = function (unsafeText) {
        return $('<div/>').text(unsafeText).html();
    };

    /**
     * Returns the available video width.
     */
    my.getAvailableVideoWidth = function () {
        var rightPanelWidth
            = PanelToggler.isVisible() ? PanelToggler.getPanelSize()[0] : 0;

        return window.innerWidth - rightPanelWidth;
    };

    my.imageToGrayScale = function (canvas) {
        var context = canvas.getContext('2d');
        var imgData = context.getImageData(0, 0, canvas.width, canvas.height);
        var pixels  = imgData.data;

        for (var i = 0, n = pixels.length; i < n; i += 4) {
            var grayscale
                = pixels[i] * .3 + pixels[i+1] * .59 + pixels[i+2] * .11;
            pixels[i  ] = grayscale;        // red
            pixels[i+1] = grayscale;        // green
            pixels[i+2] = grayscale;        // blue
            // pixels[i+3]              is alpha
        }
        // redraw the image in black & white
        context.putImageData(imgData, 0, 0);
    };

    my.setTooltip = function (element, tooltipText, position) {
        element.setAttribute("data-content", tooltipText);
        element.setAttribute("data-toggle", "popover");
        element.setAttribute("data-placement", position);
        element.setAttribute("data-html", true);
        element.setAttribute("data-container", "body");
    };

    my.createExpBackoffTimer = function (step) {
        var count = 1;
        return function (reset) {
            // Reset call
            if (reset) {
                count = 1;
                return;
            }
            // Calculate next timeout
            var timeout = Math.pow(2, count - 1);
            count += 1;
            return timeout * step;
        };
    };

    return my;
}(Util || {}));

module.exports = Util;

},{}],44:[function(require,module,exports){
var StreamEventTypes = require("../service/RTC/StreamEventTypes");
var EventEmitter = require("events");
var XMPPEvents = require("../service/xmpp/XMPPEvents");


var activecall = null;

var UIService = null;
var RTCService = null;

var authenticatedUser = false;

var eventEmitter = new EventEmitter();

var connection = null;


function NicknameListenrer()
{
    this.nickname = null;
}

NicknameListenrer.prototype.onNicknameChanged = function (value) {
    this.nickname = value;
};

var nicknameListener = new NicknameListenrer();

function XMPPService()
{
}

function setupStrophePlugins()
{
    require("./strophe.emuc")(eventEmitter, XMPPService);
    require("./strophe.jingle")(eventEmitter, RTCService, XMPPService);
    require("./moderatemuc")(eventEmitter);
    require("./strophe.util")(eventEmitter);
    require("./rayo")();
}

function registerListeners() {
    UIService.addNicknameListener(
        nicknameListener.onNicknameChanged);
}

function setupEvents() {
    $(window).bind('beforeunload', function () {
        if (connection && connection.connected) {
            // ensure signout
            $.ajax({
                type: 'POST',
                url: config.bosh,
                async: false,
                cache: false,
                contentType: 'application/xml',
                data: "<body rid='" +
                    (connection.rid || connection._proto.rid) +
                    "' xmlns='http://jabber.org/protocol/httpbind' sid='" +
                    (connection.sid || connection._proto.sid) +
                    "' type='terminate'><presence xmlns='jabber:client'" +
                    " type='unavailable'/></body>",
                success: function (data) {
                    console.log('signed out');
                    console.log(data);
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log('signout error', textStatus +
                        ' (' + errorThrown + ')');
                }
            });
        }
        XMPPService.disposeConference(true);
    });
}

function getConferenceHandler() {
    return connection.emuc.focus ? connection.emuc.focus : activecall;
}

function connect(jid, password, uiCredentials) {
    connection = new Strophe.Connection(uiCredentials.bosh);

    if (nicknameListener.nickname) {
        connection.emuc.addDisplayNameToPresence(nicknameListener.nickname);
    }

    if (connection.disco) {
        // for chrome, add multistream cap
    }
    connection.jingle.pc_constraints = RTCService.getPCConstraints();
    if (config.useIPv6) {
        // https://code.google.com/p/webrtc/issues/detail?id=2828
        if (!connection.jingle.pc_constraints.optional)
            connection.jingle.pc_constraints.optional = [];
        connection.jingle.pc_constraints.optional.push({googIPv6: true});
    }

    if(!password)
        password = uiCredentials.password;

    if(!jid)
        jid = uiCredentials.jid;

    var anonymousConnectionFailed = false;

    connection.connect(jid, password, function (status, msg) {
        if (status === Strophe.Status.CONNECTED) {
            console.log('connected');
            if (config.useStunTurn) {
                connection.jingle.getStunAndTurnCredentials();
            }
            UIService.disableConnect();

            if(password)
                authenticatedUser = true;
            maybeDoJoin();
        } else if (status === Strophe.Status.CONNFAIL) {
            if(msg === 'x-strophe-bad-non-anon-jid') {
                anonymousConnectionFailed = true;
            }
            console.log('status', status);
        } else if (status === Strophe.Status.DISCONNECTED) {
            if(anonymousConnectionFailed) {
                // prompt user for username and password
                XMPPService.promptLogin();
            }
        } else if (status === Strophe.Status.AUTHFAIL) {
            // wrong password or username, prompt user
            XMPPService.promptLogin();

        } else {
            console.log('status', status);
        }
    });
}

function maybeDoJoin() {
    if (connection && connection.connected && Strophe.getResourceFromJid(connection.jid)
        && (RTCService.localAudio || RTCService.localVideo)) {
        var roomjid = UIService.generateRoomName(authenticatedUser);
        connection.emuc.doJoin(roomjid);
    }
}

XMPPService.start = function (jid, password, uiCredentials) {
    UIService = require("../UI/UIService");
    RTCService = require("../RTC/RTCService");
    setupStrophePlugins();
    registerListeners();
    setupEvents();
    connect(jid, password, uiCredentials);
    RTCService.addStreamListener(maybeDoJoin, StreamEventTypes.EVENT_TYPE_LOCAL_CREATED);
};

XMPPService.getNickname = function () {
    return nicknameListener.nickname;
};

XMPPService.addToPresence = function (name, value) {
    switch (name)
    {
        case "displayName":
            connection.emuc.addDisplayNameToPresence(value);
            break;
        case "etherpad":
            connection.emuc.addEtherpadToPresence(value);
            break;
        case "prezi":
            connection.emuc.addPreziToPresence(value, 0);
            break;
        case "preziSlide":
            connection.emuc.addCurrentSlideToPresence(value);
            break;
        case "connectionQuality":
            connection.emuc.addConnectionInfoToPresence(value);
            break;
        default :
            console.log("Unknown tag for presence.");
            return;
    }
    connection.emuc.sendPresence();
}

XMPPService.setMute = function(jid, isMute)
{
    connection.moderate.setMute(jid, isMute);
}

XMPPService.eject = function(jid)
{
    connection.moderate.eject(jid);
}

XMPPService.getPrezi = function () {
    return connection.emuc.getPrezi(XMPPService.getMyJID());
}

XMPPService.removeFromPresence = function(name)
{
    switch (name)
    {
        case "prezi":
            connection.emuc.removePreziFromPresence();
            break;
        default:
            return;
    }
    connection.emuc.sendPresence();
}

XMPPService.lockRoom = function (sharedKey) {
    connection.emuc.lockRoom(sharedKey);
}

XMPPService.getOwnJIDNode = function () {
    return Strophe.getNodeFromJid(connection.jid);
}

XMPPService.sendMessage = function (message, nickname) {
    connection.emuc.sendMessage(message, nickname);
}

XMPPService.setSubject = function (subject) {
    connection.emuc.setSubject(subject);
}

XMPPService.toggleAudioMute = function (callback) {
    getConferenceHandler().toggleAudioMute(callback);
};


XMPPService.toggleVideoMute = function (callback) {
    getConferenceHandler().toggleVideoMute(callback);
};


XMPPService.promptLogin = function () {
    UIService.showLoginPopup(connect);
}

XMPPService.setActiveCall = function (session) {
    activecall = session;
};

XMPPService.getJIDFromSSRC = function (ssrc) {
    return connection.emuc.ssrc2jid[ssrc];
};

XMPPService.isFocus = function () {
    return (connection && connection.emuc.focus !== null);
}

XMPPService.setRecording = function (token, callback, tokenNullCallback) {
    return connection.emuc.focus.setRecording(token, callback, tokenNullCallback);
}

XMPPService.switchStreams = function(stream, oldStream, streamSwitchDone)
{
    var conferenceHandler = getConferenceHandler();
    if (conferenceHandler) {
        // FIXME: will block switchInProgress on true value in case of exception
        conferenceHandler.switchStreams(stream, oldStream, streamSwitchDone);
    } else {
        // We are done immediately
        console.error("No conference handler");
        messageHandler.showError('Error',
            'Unable to switch video stream.');
        streamSwitchDone();
    }
};

XMPPService.disposeConference = function (onUnload, callback, leaveMUC) {
    if(leaveMUC)
        connection.emuc.doLeave();
    var handler = getConferenceHandler();
    if (handler && handler.peerconnection) {
        // FIXME: probably removing streams is not required and close() should be enough
        if (RTCService.localAudio) {
            handler.peerconnection.removeStream(RTCService.localAudio);
        }
        if (RTCService.localVideo) {
            handler.peerconnection.removeStream(RTCService.localVideo);
        }
        handler.peerconnection.close();
    }

    eventEmitter.emit(XMPPEvents.DISPOSE_CONFERENCE, onUnload);

    connection.emuc.focus = null;
    activecall = null;
    if(callback)
        callback();
}

XMPPService.getJingleData = function () {
    if (connection.jingle) {
        return connection.jingle.getJingleData();
    }
    return {};
}

XMPPService.getLogger = function () {
    return connection.logger;
}

XMPPService.addListener = function (event, listener) {
    eventEmitter.on(event, listener);
}

XMPPService.getMyJID = function () {
    return connection.emuc.myroomjid;
}

XMPPService.getVideoTypeFromSSRC = function (ssrc) {
    return connection.emuc.ssrc2videoType[ssrc];
}

XMPPService.sipDial = function (to, from, roomName)
{
    return connection.rayo.dial(to, from, roomName);
}

XMPPService.getFocusJID = function () {
    if(Object.keys(connection.jingle.sessions).length === 0)
        return null;
    var session
        = connection.jingle.sessions
        [Object.keys(connection.jingle.sessions)[0]];
    return Strophe.getResourceFromJid(session.peerjid);
}

XMPPService.addConnectionQualityListener = function (listener) {
    eventEmitter.on(XMPPEvents.REMOTE_STATS, listener);
}

XMPPService.findJidFromResource = function (resource) {
    return connection.emuc.findJidFromResource(resource);
}


module.exports = XMPPService;
},{"../RTC/RTCService":3,"../UI/UIService":7,"../service/RTC/StreamEventTypes":32,"../service/xmpp/XMPPEvents":33,"./moderatemuc":47,"./rayo":48,"./strophe.emuc":49,"./strophe.jingle":51,"./strophe.util":56,"events":57}],45:[function(require,module,exports){
/* colibri.js -- a COLIBRI focus
 * The colibri spec has been submitted to the XMPP Standards Foundation
 * for publications as a XMPP extensions:
 * http://xmpp.org/extensions/inbox/colibri.html
 *
 * colibri.js is a participating focus, i.e. the focus participates
 * in the conference. The conference itself can be ad-hoc, through a
 * MUC, through PubSub, etc.
 *
 * colibri.js relies heavily on the strophe.jingle library available
 * from https://github.com/ESTOS/strophe.jingle
 * and interoperates with the Jitsi videobridge available from
 * https://jitsi.org/Projects/JitsiVideobridge
 */
/*
 Copyright (c) 2013 ESTOS GmbH

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */
/* jshint -W117 */
var SessionBase = require("../strophe.jingle.sessionbase");
var ColibriSession = require("./colibri.session");
var TraceablePeerConnection = require("../strophe.jingle.adapter");
var SDP = require("../strophe.jingle.sdp");
var SDPUtil = require("../strophe.jingle.sdp.util");
var XMPPEvents = require("../../service/xmpp/XMPPEvents");

ColibriFocus.prototype = Object.create(SessionBase.prototype);
function ColibriFocus(connection, bridgejid, eventEmitter) {

    SessionBase.call(this, connection, Math.random().toString(36).substr(2, 12));

    this.bridgejid = bridgejid;
    this.peers = [];
    this.remoteStreams = [];
    this.confid = null;
    this.eventEmitter = eventEmitter;

    /**
     * Local XMPP resource used to join the multi user chat.
     * @type {*}
     */
    this.myMucResource = Strophe.getResourceFromJid(this.connection.emuc.myroomjid);

    /**
     * Default channel expire value in seconds.
     * @type {number}
     */
    this.channelExpire
        = ('number' === typeof(config.channelExpire))
            ? config.channelExpire
            : 15;
    /**
     * Default channel last-n value.
     * @type {number}
     */
    this.channelLastN
        = ('number' === typeof(config.channelLastN)) ? config.channelLastN : -1;

    // media types of the conference
    if (config.openSctp)
        this.media = ['audio', 'video', 'data'];
    else
        this.media = ['audio', 'video'];

    this.connection.jingle.sessions[this.sid] = this;
    this.bundledTransports = {};
    this.mychannel = [];
    this.channels = [];
    this.remotessrc = {};

    // container for candidates from the focus
    // gathered before confid is known
    this.drip_container = [];

    // silly wait flag
    this.wait = true;

    this.recordingEnabled = false;

    // stores information about the endpoints (i.e. display names) to
    // be sent to the videobridge.
    this.endpointsInfo = null;
}

// creates a conferences with an initial set of peers
ColibriFocus.prototype.makeConference = function (peers, errorCallback) {
    var self = this;
    if (this.confid !== null) {
        console.error('makeConference called twice? Ignoring...');
        // FIXME: just invite peers?
        return;
    }
    this.confid = 0; // !null
    this.peers = [];
    peers.forEach(function (peer) {
        self.peers.push(peer);
        self.channels.push([]);
    });

    this.peerconnection
        = new TraceablePeerConnection(
            this.connection.jingle.ice_config,
            this.connection.jingle.pc_constraints );

    if(require("../../RTC/RTCService").localAudio) {
        this.peerconnection.addStream(require("../../RTC/RTCService").localAudio);
    }
    if(require("../../RTC/RTCService").localVideo) {
        this.peerconnection.addStream(require("../../RTC/RTCService").localVideo);
    }
    this.peerconnection.oniceconnectionstatechange = function (event) {
        console.warn('ice connection state changed to', self.peerconnection.iceConnectionState);
        /*
        if (self.peerconnection.signalingState == 'stable' && self.peerconnection.iceConnectionState == 'connected') {
            console.log('adding new remote SSRCs from iceconnectionstatechange');
            window.setTimeout(function() { self.modifySources(); }, 1000);
        }
        */
        self.onIceConnectionStateChange(self.sid, self);
    };
    this.peerconnection.onsignalingstatechange = function (event) {
        console.warn(self.peerconnection.signalingState);
        /*
        if (self.peerconnection.signalingState == 'stable' && self.peerconnection.iceConnectionState == 'connected') {
            console.log('adding new remote SSRCs from signalingstatechange');
            window.setTimeout(function() { self.modifySources(); }, 1000);
        }
        */
    };
    this.peerconnection.onaddstream = function (event) {
        // search the jid associated with this stream
        Object.keys(self.remotessrc).forEach(function (jid) {
            if (self.remotessrc[jid].join('\r\n').indexOf('mslabel:' + event.stream.id) != -1) {
                event.peerjid = jid;
            }
        });
        self.remoteStreams.push(event.stream);
//        $(document).trigger('remotestreamadded.jingle', [event, self.sid]);
        self.waitForPresence(event, self.sid);
    };
    this.peerconnection.onicecandidate = function (event) {
        //console.log('focus onicecandidate', self.confid, new Date().getTime(), event.candidate);
        if (!event.candidate) {
            console.log('end of candidates');
            return;
        }
        self.sendIceCandidate(event.candidate);
    };
    this._makeConference(errorCallback);
    /*
    this.peerconnection.createOffer(
        function (offer) {
            self.peerconnection.setLocalDescription(
                offer,
                function () {
                    // success
                    $(document).trigger('setLocalDescription.jingle', [self.sid]);
                    // FIXME: could call _makeConference here and trickle candidates later
                    self._makeConference();
                },
                function (error) {
                    console.log('setLocalDescription failed', error);
                }
            );
        },
        function (error) {
            console.warn(error);
        }
    );
    */
};

// Sends a COLIBRI message which enables or disables (according to 'state') the
// recording on the bridge. Waits for the result IQ and calls 'callback' with
// the new recording state, according to the IQ.
ColibriFocus.prototype.setRecording = function(token, callback, tokenNullCallback) {
    if (this.confid === null) {
        console.log('non-focus, or conference not yet organized: not enabling recording');
        return;
    }

    if(!token)
    {
        tokenNullCallback();
        return;
    }

    var oldState = this.recordingEnabled;
    var state = !oldState;
    var self = this;
    var elem = $iq({to: this.bridgejid, type: 'set'});
    elem.c('conference', {
        xmlns: 'http://jitsi.org/protocol/colibri',
        id: this.confid
    });
    elem.c('recording', {state: state, token: token});
    elem.up();

    this.connection.sendIQ(elem,
        function (result) {
            console.log('Set recording "', state, '". Result:', result);
            var recordingElem = $(result).find('>conference>recording');
            var newState = ('true' === recordingElem.attr('state'));

            self.recordingEnabled = newState;
            callback(newState, oldState);
        },
        function (error) {
            console.warn(error);
        }
    );
};

/*
 * Updates the display name for an endpoint with a specific jid.
 * jid: the jid associated with the endpoint.
 * displayName: the new display name for the endpoint.
 */
ColibriFocus.prototype.setEndpointDisplayName = function(jid, displayName) {
    var endpointId = jid.substr(1 + jid.lastIndexOf('/'));
    var update = false;

    if (this.endpointsInfo === null) {
       this.endpointsInfo = {};
    }

    var endpointInfo = this.endpointsInfo[endpointId];
    if ('undefined' === typeof endpointInfo) {
        endpointInfo = this.endpointsInfo[endpointId] = {};
    }

    if (endpointInfo['displayname'] !== displayName) {
        endpointInfo['displayname'] = displayName;
        update = true;
    }

    if (update) {
        this.updateEndpoints();
    }
};

/*
 * Sends a colibri message to the bridge that contains the
 * current endpoints and their display names.
 */
ColibriFocus.prototype.updateEndpoints = function() {
    if (this.confid === null
        || this.endpointsInfo === null) {
        return;
    }

    if (this.confid === 0) {
        // the colibri conference is currently initiating
        var self = this;
        window.setTimeout(function() { self.updateEndpoints()}, 1000);
        return;
    }

    var elem = $iq({to: this.bridgejid, type: 'set'});
    elem.c('conference', {
        xmlns: 'http://jitsi.org/protocol/colibri',
        id: this.confid
    });

    for (var id in this.endpointsInfo) {
        elem.c('endpoint');
        elem.attrs({ id: id,
                     displayname: this.endpointsInfo[id]['displayname']
        });
        elem.up();
    }

    //elem.up(); //conference

    this.connection.sendIQ(
        elem,
        function (result) {},
        function (error) { console.warn(error); }
    );
};

ColibriFocus.prototype._makeConference = function (errorCallback) {
    var self = this;
    var elem = $iq({ to: this.bridgejid, type: 'get' });
    elem.c('conference', { xmlns: 'http://jitsi.org/protocol/colibri' });

    this.media.forEach(function (name) {
        var elemName;
        var elemAttrs = { initiator: 'true', expire: self.channelExpire };

        if ('data' === name)
        {
            elemName = 'sctpconnection';
            elemAttrs['port'] = 5000;
        }
        else
        {
            elemName = 'channel';
            if ('video' === name) {
                if (self.channelLastN >= 0) {
                    elemAttrs['last-n'] = self.channelLastN;
                }
                if (config.adaptiveLastN) {
                    elemAttrs['adaptive-last-n'] = 'true';
                }
                if (config.adaptiveSimulcast) {
                    elemAttrs['adaptive-simulcast'] = 'true';
                }
            }
        }

        elem.c('content', { name: name });

        elem.c(elemName, elemAttrs);
        elem.attrs({ endpoint: self.myMucResource });
        if (config.useBundle) {
            elem.attrs({ 'channel-bundle-id': self.myMucResource });
        }
        elem.up();// end of channel/sctpconnection

        for (var j = 0; j < self.peers.length; j++) {
            var peer = self.peers[j];
            var peerEndpoint = peer.substr(1 + peer.lastIndexOf('/'));

            elem.c(elemName, elemAttrs);
            elem.attrs({ endpoint: peerEndpoint });
            if (config.useBundle) {
                elem.attrs({ 'channel-bundle-id': peerEndpoint });
            }
            elem.up(); // end of channel/sctpconnection
        }
        elem.up(); // end of content
    });

    if (this.endpointsInfo !== null) {
        for (var id in this.endpointsInfo) {
            elem.c('endpoint');
            elem.attrs({ id: id,
                         displayname: this.endpointsInfo[id]['displayname']
            });
            elem.up();
        }
    }

    /*
    var localSDP = new SDP(this.peerconnection.localDescription.sdp);
    localSDP.media.forEach(function (media, channel) {
        var name = SDPUtil.parse_mline(media.split('\r\n')[0]).media;
        elem.c('content', {name: name});
        elem.c('channel', {initiator: 'false', expire: self.channelExpire});

        // FIXME: should reuse code from .toJingle
        var mline = SDPUtil.parse_mline(media.split('\r\n')[0]);
        for (var j = 0; j < mline.fmt.length; j++) {
            var rtpmap = SDPUtil.find_line(media, 'a=rtpmap:' + mline.fmt[j]);
            elem.c('payload-type', SDPUtil.parse_rtpmap(rtpmap));
            elem.up();
        }

        localSDP.TransportToJingle(channel, elem);

        elem.up(); // end of channel
        for (j = 0; j < self.peers.length; j++) {
            elem.c('channel', {initiator: 'true', expire: self.channelExpire }).up();
        }
        elem.up(); // end of content
    });
    */

    this.connection.sendIQ(elem,
        function (result) {
            self.createdConference(result);
        },
        function (error) {
            console.warn(error);
            errorCallback(error);
        }
    );
};

// callback when a colibri conference was created
ColibriFocus.prototype.createdConference = function (result) {
    console.log('created a conference on the bridge');
    var self = this;
    var tmp;

    this.confid = $(result).find('>conference').attr('id');
    var remotecontents = $(result).find('>conference>content').get();
    var numparticipants = 0;
    for (var i = 0; i < remotecontents.length; i++)
    {
        var contentName = $(remotecontents[i]).attr('name');
        var channelName
            = contentName !== 'data' ? '>channel' : '>sctpconnection';

        tmp = $(remotecontents[i]).find(channelName).get();
        this.mychannel.push($(tmp.shift()));
        numparticipants = tmp.length;
        for (j = 0; j < tmp.length; j++) {
            if (this.channels[j] === undefined) {
                this.channels[j] = [];
            }
            this.channels[j].push(tmp[j]);
        }
    }

    // save the 'transport' elements from 'channel-bundle'-s
    var channelBundles = $(result).find('>conference>channel-bundle');
    for (var i = 0; i < channelBundles.length; i++)
    {
        var endpointId = $(channelBundles[i]).attr('id');
        this.bundledTransports[endpointId] = $(channelBundles[i]).find('>transport[xmlns="urn:xmpp:jingle:transports:ice-udp:1"]');
    }

    console.log('remote channels', this.channels);

    // Notify that the focus has created the conference on the bridge
    this.eventEmitter.emit(XMPPEvents.CONFERENCE_CERATED, self);

    var bridgeSDP = new SDP(
        'v=0\r\n' +
        'o=- 5151055458874951233 2 IN IP4 127.0.0.1\r\n' +
        's=-\r\n' +
        't=0 0\r\n' +
        /* Audio */
        (config.useBundle
            ? ('a=group:BUNDLE audio video' +
                (config.openSctp ? ' data' : '') +
               '\r\n')
            : '') +
        'm=audio 1 RTP/SAVPF 111 103 104 0 8 106 105 13 126\r\n' +
        'c=IN IP4 0.0.0.0\r\n' +
        'a=rtcp:1 IN IP4 0.0.0.0\r\n' +
        'a=mid:audio\r\n' +
        'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\n' +
        'a=sendrecv\r\n' +
        'a=rtpmap:111 opus/48000/2\r\n' +
        'a=fmtp:111 minptime=10\r\n' +
        'a=rtpmap:103 ISAC/16000\r\n' +
        'a=rtpmap:104 ISAC/32000\r\n' +
        'a=rtpmap:0 PCMU/8000\r\n' +
        'a=rtpmap:8 PCMA/8000\r\n' +
        'a=rtpmap:106 CN/32000\r\n' +
        'a=rtpmap:105 CN/16000\r\n' +
        'a=rtpmap:13 CN/8000\r\n' +
        'a=rtpmap:126 telephone-event/8000\r\n' +
        'a=maxptime:60\r\n' +
        (config.useRtcpMux ? 'a=rtcp-mux\r\n' : '') +
        /* Video */
        'm=video 1 RTP/SAVPF 100 116 117\r\n' +
        'c=IN IP4 0.0.0.0\r\n' +
        'a=rtcp:1 IN IP4 0.0.0.0\r\n' +
        'a=mid:video\r\n' +
        'a=extmap:2 urn:ietf:params:rtp-hdrext:toffset\r\n' +
        'a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n' +
        'a=sendrecv\r\n' +
        'a=rtpmap:100 VP8/90000\r\n' +
        'a=rtcp-fb:100 ccm fir\r\n' +
        'a=rtcp-fb:100 nack\r\n' +
        'a=rtcp-fb:100 nack pli\r\n' +
            (config.enableFirefoxSupport? "" : 'a=rtcp-fb:100 goog-remb\r\n') +
        'a=rtpmap:116 red/90000\r\n' +
        'a=rtpmap:117 ulpfec/90000\r\n' +
        (config.useRtcpMux ? 'a=rtcp-mux\r\n' : '') +
        /* Data SCTP */
        (config.openSctp ?
            'm=application 1 DTLS/SCTP 5000\r\n' +
            'c=IN IP4 0.0.0.0\r\n' +
            'a=sctpmap:5000 webrtc-datachannel\r\n' +
            'a=mid:data\r\n'
            : '')
    );

    bridgeSDP.media.length = this.mychannel.length;
    var channel;
    /*
    for (channel = 0; channel < bridgeSDP.media.length; channel++) {
        bridgeSDP.media[channel] = '';
        // unchanged lines
        bridgeSDP.media[channel] += SDPUtil.find_line(localSDP.media[channel], 'm=') + '\r\n';
        bridgeSDP.media[channel] += SDPUtil.find_line(localSDP.media[channel], 'c=') + '\r\n';
        if (SDPUtil.find_line(localSDP.media[channel], 'a=rtcp:')) {
            bridgeSDP.media[channel] += SDPUtil.find_line(localSDP.media[channel], 'a=rtcp:') + '\r\n';
        }
        if (SDPUtil.find_line(localSDP.media[channel], 'a=mid:')) {
            bridgeSDP.media[channel] += SDPUtil.find_line(localSDP.media[channel], 'a=mid:') + '\r\n';
        }
        if (SDPUtil.find_line(localSDP.media[channel], 'a=sendrecv')) {
            bridgeSDP.media[channel] += 'a=sendrecv\r\n';
        }
        if (SDPUtil.find_line(localSDP.media[channel], 'a=extmap:')) {
            bridgeSDP.media[channel] += SDPUtil.find_lines(localSDP.media[channel], 'a=extmap:').join('\r\n') + '\r\n';
        }

        // FIXME: should look at m-line and group the ids together
        if (SDPUtil.find_line(localSDP.media[channel], 'a=rtpmap:')) {
            bridgeSDP.media[channel] += SDPUtil.find_lines(localSDP.media[channel], 'a=rtpmap:').join('\r\n') + '\r\n';
        }
        if (SDPUtil.find_line(localSDP.media[channel], 'a=fmtp:')) {
            bridgeSDP.media[channel] += SDPUtil.find_lines(localSDP.media[channel], 'a=fmtp:').join('\r\n') + '\r\n';
        }
        if (SDPUtil.find_line(localSDP.media[channel], 'a=rtcp-fb:')) {
            bridgeSDP.media[channel] += SDPUtil.find_lines(localSDP.media[channel], 'a=rtcp-fb:').join('\r\n') + '\r\n';
        }
        // FIXME: changed lines -- a=sendrecv direction, a=setup direction
    }
    */
    for (channel = 0; channel < bridgeSDP.media.length; channel++) {
        // get the mixed ssrc
        tmp = $(this.mychannel[channel]).find('>source[xmlns="urn:xmpp:jingle:apps:rtp:ssma:0"]');
        // FIXME: check rtp-level-relay-type

        var name = bridgeSDP.media[channel].split(" ")[0].substr(2); // 'm=audio ...'
        if (name === 'audio' || name === 'video') {
            // make chrome happy... '3735928559' == 0xDEADBEEF
            var ssrc = tmp.length ? tmp.attr('ssrc') : '3735928559';

            bridgeSDP.media[channel] += 'a=ssrc:' + ssrc + ' cname:mixed\r\n';
            bridgeSDP.media[channel] += 'a=ssrc:' + ssrc + ' label:mixedlabel' + name + '0\r\n';
            bridgeSDP.media[channel] += 'a=ssrc:' + ssrc + ' msid:mixedmslabel mixedlabel' + name + '0\r\n';
            bridgeSDP.media[channel] += 'a=ssrc:' + ssrc + ' mslabel:mixedmslabel\r\n';
        }

        // FIXME: should take code from .fromJingle
        var channelBundleId = $(this.mychannel[channel]).attr('channel-bundle-id');
        if (typeof channelBundleId != 'undefined') {
            tmp = this.bundledTransports[channelBundleId];
        } else {
            tmp = $(this.mychannel[channel]).find('>transport[xmlns="urn:xmpp:jingle:transports:ice-udp:1"]');
        }

        if (tmp.length) {
            bridgeSDP.media[channel] += 'a=ice-ufrag:' + tmp.attr('ufrag') + '\r\n';
            bridgeSDP.media[channel] += 'a=ice-pwd:' + tmp.attr('pwd') + '\r\n';
            tmp.find('>candidate').each(function () {
                bridgeSDP.media[channel] += SDPUtil.candidateFromJingle(this);
            });
            tmp = tmp.find('>fingerprint');
            if (tmp.length) {
                bridgeSDP.media[channel] += 'a=fingerprint:' + tmp.attr('hash') + ' ' + tmp.text() + '\r\n';
                bridgeSDP.media[channel] += 'a=setup:actpass\r\n'; // offer so always actpass
            }
        }
    }
    bridgeSDP.raw = bridgeSDP.session + bridgeSDP.media.join('');
    var bridgeDesc = new RTCSessionDescription({type: 'offer', sdp: bridgeSDP.raw});
    bridgeDesc = require("../../simulcast/SimulcastService").transformRemoteDescription(bridgeDesc);

    this.peerconnection.setRemoteDescription(bridgeDesc,
        function () {
            console.log('setRemoteDescription success');
            self.peerconnection.createAnswer(
                function (answer) {
                    self.peerconnection.setLocalDescription(answer,
                        function () {
                            console.log('setLocalDescription succeeded.');
                            // make sure our presence is updated
                            self.setLocalDescription(self.sid);
                            var localSDP = new SDP(self.peerconnection.localDescription.sdp);
                            self.updateLocalChannel(localSDP);

                            // now initiate sessions
                            for (var i = 0; i < numparticipants; i++) {
                                self.initiate(self.peers[i], true);
                            }

                            // Notify we've created the conference
                            self.eventEmitter.emit(XMPPEvents.CONFERENCE_CERATED, self);
                        },
                        function (error) {
                            console.warn('setLocalDescription failed.', error);
                        }
                    );
                },
                function (error) {
                    console.warn('createAnswer failed.', error);
                }
            );
            /*
            for (var i = 0; i < numparticipants; i++) {
                self.initiate(self.peers[i], true);
            }
            */
        },
        function (error) {
            console.log('setRemoteDescription failed.', error);
        }
    );

};

ColibriFocus.prototype.updateLocalChannel = function(localSDP, parts) {
    var self = this;
    var elem = $iq({to: self.bridgejid, type: 'get'});
    elem.c('conference', {xmlns: 'http://jitsi.org/protocol/colibri', id: self.confid});
    localSDP.media.forEach(function (media, channel) {
        var name = SDPUtil.parse_mid(SDPUtil.find_line(media, 'a=mid:'));
        elem.c('content', {name: name});
        var mline = SDPUtil.parse_mline(media.split('\r\n')[0]);
        if (name !== 'data') {
            elem.c('channel', {
                initiator: 'true',
                expire: self.channelExpire,
                id: self.mychannel[channel].attr('id'),
                endpoint: self.myMucResource
            });

            if (!parts || parts.indexOf('sources') !== -1) {
                // signal (through COLIBRI) to the bridge
                // the SSRC groups of the participant
                // that plays the role of the focus
                var ssrc_group_lines = SDPUtil.find_lines(media, 'a=ssrc-group:');
                var idx = 0;
                var hasSIM = false;
                ssrc_group_lines.forEach(function (line) {
                    idx = line.indexOf(' ');
                    var semantics = line.substr(0, idx).substr(13);
                    var ssrcs = line.substr(14 + semantics.length).split(' ');
                    if (ssrcs.length != 0) {
                        elem.c('ssrc-group', { semantics: semantics, xmlns: 'urn:xmpp:jingle:apps:rtp:ssma:0' });
                        ssrcs.forEach(function (ssrc) {
                            elem.c('source', { ssrc: ssrc })
                                .up();
                        });
                        elem.up();
                    }
                });

                if (!hasSIM && name == 'video') {
                    // disable simulcast with an empty ssrc-group element.
                    elem.c('ssrc-group', { semantics: 'SIM', xmlns: 'urn:xmpp:jingle:apps:rtp:ssma:0' });
                    elem.up();
                }
            }

            if (!parts || parts.indexOf('payload-type') !== -1) {
                // FIXME: should reuse code from .toJingle
                for (var j = 0; j < mline.fmt.length; j++) {
                    var rtpmap = SDPUtil.find_line(media, 'a=rtpmap:' + mline.fmt[j]);
                    if (rtpmap) {
                        elem.c('payload-type', SDPUtil.parse_rtpmap(rtpmap));
                        elem.up();
                    }
                }
            }
        }
        else
        {
            var sctpmap = SDPUtil.find_line(media, 'a=sctpmap:' + mline.fmt[0]);
            var sctpPort = SDPUtil.parse_sctpmap(sctpmap)[0];
            elem.c("sctpconnection",
                {
                    initiator: 'true',
                    expire: self.channelExpire,
                    id: self.mychannel[channel].attr('id'),
                    endpoint: self.myMucResource,
                    port: sctpPort
                }
            );
        }

        if (!parts || parts.indexOf('transport') !== -1) {
            localSDP.TransportToJingle(channel, elem);
        }

        elem.up(); // end of channel
        elem.up(); // end of content
    });

    self.connection.sendIQ(elem,
        function (result) {
            // ...
        },
        function (error) {
            console.error(
                "ERROR sending colibri message",
                error, elem);
        }
    );
};

// send a session-initiate to a new participant
ColibriFocus.prototype.initiate = function (peer, isInitiator) {
    var participant = this.peers.indexOf(peer);
    console.log('tell', peer, participant);
    var sdp;

    if (!(this.peerconnection !== null && this.peerconnection.signalingState == 'stable')) {
        console.error('can not initiate a new session without a stable peerconnection');
        return;
    }

    sdp = new SDP(this.peerconnection.remoteDescription.sdp);
    var localSDP = new SDP(this.peerconnection.localDescription.sdp);
    // throw away stuff we don't want
    // not needed with static offer
    if (!config.useBundle) {
        sdp.removeSessionLines('a=group:');
    }
    sdp.removeSessionLines('a=msid-semantic:'); // FIXME: not mapped over jingle anyway...
    for (var i = 0; i < sdp.media.length; i++) {
        if (!config.useRtcpMux) {
            sdp.removeMediaLines(i, 'a=rtcp-mux');
        }
        sdp.removeMediaLines(i, 'a=ssrc:');
        sdp.removeMediaLines(i, 'a=ssrc-group:');
        sdp.removeMediaLines(i, 'a=crypto:');
        sdp.removeMediaLines(i, 'a=candidate:');
        sdp.removeMediaLines(i, 'a=ice-options:google-ice');
        sdp.removeMediaLines(i, 'a=ice-ufrag:');
        sdp.removeMediaLines(i, 'a=ice-pwd:');
        sdp.removeMediaLines(i, 'a=fingerprint:');
        sdp.removeMediaLines(i, 'a=setup:');
    }

    // add stuff we got from the bridge
    for (var j = 0; j < sdp.media.length; j++) {
        var chan = $(this.channels[participant][j]);
        console.log('channel id', chan.attr('id'));

        tmp = chan.find('>source[xmlns="urn:xmpp:jingle:apps:rtp:ssma:0"]');

        var name = sdp.media[j].split(" ")[0].substr(2); // 'm=audio ...'
        if (name === 'audio' || name === 'video') {
            // make chrome happy... '3735928559' == 0xDEADBEEF
            var ssrc = tmp.length ? tmp.attr('ssrc') : '3735928559';

            sdp.media[j] += 'a=ssrc:' + ssrc + ' cname:mixed\r\n';
            sdp.media[j] += 'a=ssrc:' + ssrc + ' label:mixedlabel' + name + '0\r\n';
            sdp.media[j] += 'a=ssrc:' + ssrc + ' msid:mixedmslabel mixedlabel' + name + '0\r\n';
            sdp.media[j] += 'a=ssrc:' + ssrc + ' mslabel:mixedmslabel\r\n';
        }

        // In the case of bundle, we add each candidate to all m= lines/jingle contents,
        // just as chrome does
        if (config.useBundle){
            tmp = this.bundledTransports[chan.attr('channel-bundle-id')];
        } else {
            tmp = chan.find('>transport[xmlns="urn:xmpp:jingle:transports:ice-udp:1"]');
        }

        if (tmp.length) {
            if (tmp.attr('ufrag'))
                sdp.media[j] += 'a=ice-ufrag:' + tmp.attr('ufrag') + '\r\n';
            if (tmp.attr('pwd'))
                sdp.media[j] += 'a=ice-pwd:' + tmp.attr('pwd') + '\r\n';
            // and the candidates...
            tmp.find('>candidate').each(function () {
                sdp.media[j] += SDPUtil.candidateFromJingle(this);
            });
            tmp = tmp.find('>fingerprint');
            if (tmp.length) {
                sdp.media[j] += 'a=fingerprint:' + tmp.attr('hash') + ' ' + tmp.text() + '\r\n';
                /*
                if (tmp.attr('direction')) {
                    sdp.media[j] += 'a=setup:' + tmp.attr('direction') + '\r\n';
                }
                */
                sdp.media[j] += 'a=setup:actpass\r\n';
            }
        }
    }

    for (var i = 0; i < sdp.media.length; i++) {
        // re-add all remote a=ssrcs _and_ a=ssrc-group
        for (var jid in this.remotessrc) {
            if (jid == peer || !this.remotessrc[jid][i])
                continue;
            sdp.media[i] += this.remotessrc[jid][i];
        }

        // add local a=ssrc-group: lines
        lines = SDPUtil.find_lines(localSDP.media[i], 'a=ssrc-group:');
        if (lines.length != 0)
            sdp.media[i] += lines.join('\r\n') + '\r\n';

        // and local a=ssrc: lines
        sdp.media[i] += SDPUtil.find_lines(localSDP.media[i], 'a=ssrc:').join('\r\n') + '\r\n';
    }
    sdp.raw = sdp.session + sdp.media.join('');

    // make a new colibri session and configure it
    // FIXME: is it correct to use this.connection.jid when used in a MUC?
    var sess = new ColibriSession(this.connection.jid,
                                  Math.random().toString(36).substr(2, 12), // random string
                                  this.connection);
    sess.initiate(peer);
    sess.colibri = this;
    // We do not announce our audio per conference peer, so only video is set here
    sess.localVideo = require("../../RTC/RTCService").localVideo;
    sess.media_constraints = this.connection.jingle.media_constraints;
    sess.pc_constraints = this.connection.jingle.pc_constraints;
    sess.ice_config = this.connection.jingle.ice_config;

    this.connection.jingle.sessions[sess.sid] = sess;
    this.connection.jingle.jid2session[sess.peerjid] = sess;

    // send a session-initiate
    var init = $iq({to: peer, type: 'set'})
        .c('jingle',
            {xmlns: 'urn:xmpp:jingle:1',
             action: 'session-initiate',
             initiator: sess.me,
             sid: sess.sid
            }
    );
    sdp.toJingle(init, 'initiator');
    this.connection.sendIQ(init,
        function (res) {
            console.log('got result');
        },
        function (err) {
            console.log('got error');
        }
    );
};

// pull in a new participant into the conference
ColibriFocus.prototype.addNewParticipant = function (peer) {
    var self = this;
    if (this.confid === 0 || !this.peerconnection.localDescription)
    {
        // bad state
        if (this.confid === 0)
        {
            console.error('confid does not exist yet, postponing', peer);
        }
        else
        {
            console.error('local description not ready yet, postponing', peer);
        }
        window.setTimeout(function () { self.addNewParticipant(peer); }, 250);
        return;
    }
    var index = this.channels.length;
    this.channels.push([]);
    this.peers.push(peer);

    var elem = $iq({to: this.bridgejid, type: 'get'});
    elem.c(
        'conference',
        { xmlns: 'http://jitsi.org/protocol/colibri', id: this.confid });
    var localSDP = new SDP(this.peerconnection.localDescription.sdp);
    localSDP.media.forEach(function (media, channel) {
        var name = SDPUtil.parse_mid(SDPUtil.find_line(media, 'a=mid:'));
        var elemName;
        var endpointId = peer.substr(1 + peer.lastIndexOf('/'));
        var elemAttrs
            = {
                initiator: 'true',
                expire: self.channelExpire,
                endpoint: endpointId
            };
        if (config.useBundle) {
            elemAttrs['channel-bundle-id'] = endpointId;
        }


        if ('data' == name)
        {
            elemName = 'sctpconnection';
            elemAttrs['port'] = 5000;
        }
        else
        {
            elemName = 'channel';
            if ('video' === name) {
                if (self.channelLastN >= 0) {
                    elemAttrs['last-n'] = self.channelLastN;
                }
                if (config.adaptiveLastN) {
                    elemAttrs['adaptive-last-n'] = 'true';
                }
                if (config.adaptiveSimulcast) {
                    elemAttrs['adaptive-simulcast'] = 'true';
                }
            }
        }

        elem.c('content', { name: name });
        elem.c(elemName, elemAttrs);
        elem.up(); // end of channel/sctpconnection
        elem.up(); // end of content
    });

    this.connection.sendIQ(elem,
        function (result) {
            var contents = $(result).find('>conference>content').get();
            var i;
            for (i = 0; i < contents.length; i++) {
                var channelXml = $(contents[i]).find('>channel');
                if (channelXml.length)
                {
                    tmp = channelXml.get();
                }
                else
                {
                    tmp = $(contents[i]).find('>sctpconnection').get();
                }
                self.channels[index][i] = tmp[0];
            }
            var channelBundles = $(result).find('>conference>channel-bundle');
            for (i = 0; i < channelBundles.length; i++)
            {
                var endpointId = $(channelBundles[i]).attr('id');
                self.bundledTransports[endpointId] = $(channelBundles[i]).find('>transport[xmlns="urn:xmpp:jingle:transports:ice-udp:1"]');
            }
            self.initiate(peer, true);
        },
        function (error) {
            console.warn(error);
        }
    );
};

// update the channel description (payload-types + dtls fp) for a participant
ColibriFocus.prototype.updateRemoteChannel = function (remoteSDP, participant, parts) {
    console.log('change allocation for', this.confid);
    var self = this;
    var change = $iq({to: this.bridgejid, type: 'set'});
    change.c('conference', {xmlns: 'http://jitsi.org/protocol/colibri', id: this.confid});
    for (channel = 0; channel < this.channels[participant].length; channel++) {
        if (!remoteSDP.media[channel])
            continue;

        var name = SDPUtil.parse_mid(SDPUtil.find_line(remoteSDP.media[channel], 'a=mid:'));
        change.c('content', {name: name});
        if (name !== 'data') {
            change.c('channel', {
                id: $(this.channels[participant][channel]).attr('id'),
                endpoint: $(this.channels[participant][channel]).attr('endpoint'),
                expire: self.channelExpire
            });

            if (!parts || parts.indexOf('sources') !== -1) {
                // signal (throught COLIBRI) to the bridge the SSRC groups of this
                // participant
                var ssrc_group_lines = SDPUtil.find_lines(remoteSDP.media[channel], 'a=ssrc-group:');
                var idx = 0;
                var hasSIM = false;
                ssrc_group_lines.forEach(function (line) {
                    idx = line.indexOf(' ');
                    var semantics = line.substr(0, idx).substr(13);
                    if (semantics == 'SIM') {
                        hasSIM = true;
                    }
                    var ssrcs = line.substr(14 + semantics.length).split(' ');
                    if (ssrcs.length != 0) {
                        change.c('ssrc-group', { semantics: semantics, xmlns: 'urn:xmpp:jingle:apps:rtp:ssma:0' });
                        ssrcs.forEach(function (ssrc) {
                            change.c('source', { ssrc: ssrc })
                                .up();
                        });
                        change.up();
                    }
                });

                if (!hasSIM && name == 'video') {
                    // disable simulcast with an empty ssrc-group element.
                    change.c('ssrc-group', { semantics: 'SIM', xmlns: 'urn:xmpp:jingle:apps:rtp:ssma:0' });
                    change.up();
                }
            }

            if (!parts || parts.indexOf('payload-type') !== -1) {
                var rtpmap = SDPUtil.find_lines(remoteSDP.media[channel], 'a=rtpmap:');
                rtpmap.forEach(function (val) {
                    // TODO: too much copy-paste
                    var rtpmap = SDPUtil.parse_rtpmap(val);
                    change.c('payload-type', rtpmap);
                    //
                    // put any 'a=fmtp:' + mline.fmt[j] lines into <param name=foo value=bar/>
                    /*
                     if (SDPUtil.find_line(remoteSDP.media[channel], 'a=fmtp:' + rtpmap.id)) {
                     tmp = SDPUtil.parse_fmtp(SDPUtil.find_line(remoteSDP.media[channel], 'a=fmtp:' + rtpmap.id));
                     for (var k = 0; k < tmp.length; k++) {
                     change.c('parameter', tmp[k]).up();
                     }
                     }
                     */
                    change.up();
                });
            }
        }
        else
        {
            var sctpmap = SDPUtil.find_line(remoteSDP.media[channel], 'a=sctpmap:');
            change.c('sctpconnection', {
                id: $(this.channels[participant][channel]).attr('id'),
                endpoint: $(this.channels[participant][channel]).attr('endpoint'),
                expire: self.channelExpire,
                port: SDPUtil.parse_sctpmap(sctpmap)[0]
            });
        }

        if (!parts || parts.indexOf('transport') !== -1) {
            // now add transport
            remoteSDP.TransportToJingle(channel, change);
        }

        change.up(); // end of channel/sctpconnection
        change.up(); // end of content
    }
    this.connection.sendIQ(change,
        function (res) {
            console.log('got result');
        },
        function (err) {
            console.log('got error');
        }
    );
};

/**
 * Switches video streams.
 * @param new_stream new stream that will be used as video of this session.
 * @param oldStream old video stream of this session.
 * @param success_callback callback executed after successful stream switch.
 */
ColibriFocus.prototype.switchStreams = function (new_stream, oldStream, success_callback) {

    var self = this;

    // Stop the stream to trigger onended event for old stream
    oldStream.stop();

    // Remember SDP to figure out added/removed SSRCs
    var oldSdp = null;
    if(self.peerconnection) {
        if(self.peerconnection.localDescription) {
            oldSdp = new SDP(self.peerconnection.localDescription.sdp);
        }
        self.peerconnection.removeStream(oldStream);
        self.peerconnection.addStream(new_stream);
    }

    self.connection.jingle.localVideo = new_stream;

    self.connection.jingle.localStreams = [];
    self.connection.jingle.localStreams.push(self.connection.jingle.localAudio);
    self.connection.jingle.localStreams.push(self.connection.jingle.localVideo);

    // Conference is not active
    if(!oldSdp || !self.peerconnection) {
        success_callback();
        return;
    }

    self.peerconnection.switchstreams = true;
    self.modifySources(function() {
        console.log('modify sources done');

        var newSdp = new SDP(self.peerconnection.localDescription.sdp);

        // change allocation on bridge
        self.updateLocalChannel(newSdp, ['sources']);

        console.log("SDPs", oldSdp, newSdp);
        self.notifyMySSRCUpdate(oldSdp, newSdp);

        success_callback();
    });
};

// tell everyone about a new participants a=ssrc lines (isadd is true)
// or a leaving participants a=ssrc lines
ColibriFocus.prototype.sendSSRCUpdate = function (sdpMediaSsrcs, fromJid, isadd) {
    var self = this;
    this.peers.forEach(function (peerjid) {
        if (peerjid == fromJid) return;
        console.log('tell', peerjid, 'about ' + (isadd ? 'new' : 'removed') + ' ssrcs from', fromJid);
        if (!self.remotessrc[peerjid]) {
            // FIXME: this should only send to participants that are stable, i.e. who have sent a session-accept
            // possibly, this.remoteSSRC[session.peerjid] does not exist yet
            console.warn('do we really want to bother', peerjid, 'with updates yet?');
        }
        var peersess = self.connection.jingle.jid2session[peerjid];
        if(!peersess){
            console.warn('no session with peer: '+peerjid+' yet...');
            return;
        }

        self.sendSSRCUpdateIq(sdpMediaSsrcs, peersess.sid, peersess.initiator, peerjid, isadd);
    });
};

/**
 * Overrides SessionBase.addSource.
 *
 * @param elem proprietary 'add source' Jingle request(XML node).
 * @param fromJid JID of the participant to whom new ssrcs belong.
 */
ColibriFocus.prototype.addSource = function (elem, fromJid) {

    var self = this;
    // FIXME: dirty waiting
    if (!this.peerconnection.localDescription)
    {
        console.warn("addSource - localDescription not ready yet");
        setTimeout(function() { self.addSource(elem, fromJid); }, 200);
        return;
    }

    this.peerconnection.addSource(elem);

    // NOTE(gp) this could be a useful thing to have in every Array object.
    var diffArray = function(a) {
        return this.filter(function(i) {return a.indexOf(i) < 0;});
    };

    var peerSsrc = this.remotessrc[fromJid];
    // console.log("On ADD", this.peerconnection.addssrc, peerSsrc);
    this.peerconnection.addssrc.forEach(function(val, idx){
        if(!peerSsrc[idx]){
            // add ssrc
            peerSsrc[idx] = val;
        } else if (val) {
            // NOTE(gp) we can't expect the lines in the removessrc SDP fragment
            // to be in the same order as in the lines in the peerSsrc SDP
            // fragment. So, here we remove the val lines and re-add them.

            var lines = peerSsrc[idx].split('\r\n');
            var diffLines = val.split('\r\n');

            // Remove ssrc
            peerSsrc[idx] = diffArray.apply(lines, [diffLines]).join('\r\n');

            // Add ssrc
            peerSsrc[idx] = peerSsrc[idx]+val;
        }
    });

    var oldRemoteSdp = new SDP(this.peerconnection.remoteDescription.sdp);
    this.modifySources(function() {
        // Notify other participants about added ssrc
        var remoteSDP = new SDP(self.peerconnection.remoteDescription.sdp);
        var newSSRCs = oldRemoteSdp.getNewMedia(remoteSDP);
        self.sendSSRCUpdate(newSSRCs, fromJid, true);
        // change allocation on bridge
        if (peerSsrc[1] /* video */) {
            // If the remote peer has changed its video sources, then we need to
            // update the bridge with this information, in order for the
            // simulcast manager of the remote peer to update its layers, and
            // any associated receivers to adjust to the change.
            var videoSDP = new SDP(['v=0', 'm=audio', 'a=mid:audio', peerSsrc[0]].join('\r\n') + ['m=video', 'a=mid:video', peerSsrc[1]].join('\r\n'));
            var participant = self.peers.indexOf(fromJid);
            self.updateRemoteChannel(videoSDP, participant, ['sources']);
        }
    });
};

/**
 * Overrides SessionBase.removeSource.
 *
 * @param elem proprietary 'remove source' Jingle request(XML node).
 * @param fromJid JID of the participant to whom removed ssrcs belong.
 */
ColibriFocus.prototype.removeSource = function (elem, fromJid) {

    var self = this;
    // FIXME: dirty waiting
    if (!self.peerconnection.localDescription)
    {
        console.warn("removeSource - localDescription not ready yet");
        setTimeout(function() { self.removeSource(elem, fromJid); }, 200);
        return;
    }

    this.peerconnection.removeSource(elem);

    // NOTE(gp) this could be a useful thing to have in every Array object.
    var diffArray = function(a) {
        return this.filter(function(i) {return a.indexOf(i) < 0;});
    };

    var peerSsrc = this.remotessrc[fromJid];
    // console.log("On REMOVE", this.peerconnection.removessrc, peerSsrc);
    this.peerconnection.removessrc.forEach(function(val, idx){
        if(peerSsrc[idx] && val){
            // NOTE(gp) we can't expect the lines in the removessrc SDP fragment
            // to be in the same order as in the lines in the peerSsrc SDP
            // fragment.
            var lines = peerSsrc[idx].split('\r\n');
            var diffLines = val.split('\r\n');
            // Remove ssrc
            peerSsrc[idx] = diffArray.apply(lines, [diffLines]).join('\r\n');
        }
    });

    var oldSDP = new SDP(self.peerconnection.remoteDescription.sdp);
    this.modifySources(function(){
        // Notify other participants about removed ssrc
        var remoteSDP = new SDP(self.peerconnection.remoteDescription.sdp);
        var removedSSRCs = remoteSDP.getNewMedia(oldSDP);
        self.sendSSRCUpdate(removedSSRCs, fromJid, false);
        // change allocation on bridge
        if (peerSsrc[1] /* video */) {
            // If the remote peer has changed its video sources, then we need to
            // update the bridge with this information, in order for the
            // simulcast manager of the remote peer to update its layers, and
            // any associated receivers to adjust to the change.
            var videoSDP = new SDP(['v=0', 'm=audio', 'a=mid:audio', peerSsrc[0]].join('\r\n') + ['m=video', 'a=mid:video', peerSsrc[1]].join('\r\n'));
            var participant = self.peers.indexOf(fromJid);
            self.updateRemoteChannel(videoSDP, participant, ['sources']);
        }
    });
};

ColibriFocus.prototype.setRemoteDescription = function (session, elem, desctype) {
    var participant = this.peers.indexOf(session.peerjid);
    console.log('Colibri.setRemoteDescription from', session.peerjid, participant);
    var remoteSDP = new SDP('');
    var channel;
    remoteSDP.fromJingle(elem);

    // ACT 1: change allocation on bridge
    this.updateRemoteChannel(remoteSDP, participant);

    // ACT 2: tell anyone else about the new SSRCs
    this.sendSSRCUpdate(remoteSDP.getMediaSsrcMap(), session.peerjid, true);

    // ACT 3: note the SSRCs
    this.remotessrc[session.peerjid] = [];
    for (channel = 0; channel < this.channels[participant].length; channel++) {
        //if (channel == 0) continue; FIXME: does not work as intended
        if (!remoteSDP.media[channel])
            continue;

        var lines = SDPUtil.find_lines(remoteSDP.media[channel], 'a=ssrc-group:');
        if (lines.length != 0)
            // prepend ssrc-groups
            this.remotessrc[session.peerjid][channel] = lines.join('\r\n') + '\r\n';

        if (SDPUtil.find_lines(remoteSDP.media[channel], 'a=ssrc:').length)
        {
            if (!this.remotessrc[session.peerjid][channel])
                this.remotessrc[session.peerjid][channel] = '';

            this.remotessrc[session.peerjid][channel] +=
                SDPUtil.find_lines(remoteSDP.media[channel], 'a=ssrc:')
                        .join('\r\n') + '\r\n';
        }
    }

    // ACT 4: add new a=ssrc and s=ssrc-group lines to local remotedescription
    for (channel = 0; channel < this.channels[participant].length; channel++) {
        //if (channel == 0) continue; FIXME: does not work as intended
        if (!remoteSDP.media[channel])
            continue;

        var lines = SDPUtil.find_lines(remoteSDP.media[channel], 'a=ssrc-group:');
        if (lines.length != 0)
            this.peerconnection.enqueueAddSsrc(
                channel, SDPUtil.find_lines(remoteSDP.media[channel], 'a=ssrc-group:').join('\r\n') + '\r\n');

        if (SDPUtil.find_lines(remoteSDP.media[channel], 'a=ssrc:').length) {
            this.peerconnection.enqueueAddSsrc(
                channel,
                SDPUtil.find_lines(remoteSDP.media[channel], 'a=ssrc:').join('\r\n') + '\r\n'
            );
        }
    }
    this.modifySources();
};

// relay ice candidates to bridge using trickle
ColibriFocus.prototype.addIceCandidate = function (session, elem) {
    var self = this;
    var participant = this.peers.indexOf(session.peerjid);
    //console.log('change transport allocation for', this.confid, session.peerjid, participant);
    var change = $iq({to: this.bridgejid, type: 'set'});
    change.c('conference', {xmlns: 'http://jitsi.org/protocol/colibri', id: this.confid});
    $(elem).each(function () {
        var name = $(this).attr('name');

        // If we are using bundle, audio/video/data channel will have the same candidates, so only send them for
        // the audio channel.
        if (config.useBundle && name !== 'audio') {
            return;
        }

        var channel = name == 'audio' ? 0 : 1; // FIXME: search mlineindex in localdesc
        if (name != 'audio' && name != 'video')
            channel = 2; // name == 'data'

        change.c('content', {name: name});
        if (name !== 'data')
        {
            change.c('channel', {
                id: $(self.channels[participant][channel]).attr('id'),
                endpoint: $(self.channels[participant][channel]).attr('endpoint'),
                expire: self.channelExpire
            });
        }
        else
        {
            change.c('sctpconnection', {
                id: $(self.channels[participant][channel]).attr('id'),
                endpoint: $(self.channels[participant][channel]).attr('endpoint'),
                expire: self.channelExpire
            });
        }
        $(this).find('>transport').each(function () {
            change.c('transport', {
                ufrag: $(this).attr('ufrag'),
                pwd: $(this).attr('pwd'),
                xmlns: $(this).attr('xmlns')
            });
            if (config.useRtcpMux
                  && 'channel' === change.node.parentNode.nodeName) {
                change.c('rtcp-mux').up();
            }

            $(this).find('>candidate').each(function () {
                /* not yet
                if (this.getAttribute('protocol') == 'tcp' && this.getAttribute('port') == 0) {
                    // chrome generates TCP candidates with port 0
                    return;
                }
                */
                var line = SDPUtil.candidateFromJingle(this);
                change.c('candidate', SDPUtil.candidateToJingle(line)).up();
            });
            change.up(); // end of transport
        });
        change.up(); // end of channel/sctpconnection
        change.up(); // end of content
    });
    // FIXME: need to check if there is at least one candidate when filtering TCP ones
    this.connection.sendIQ(change,
        function (res) {
            console.log('got result');
        },
        function (err) {
            console.error('got error', err);
        }
    );
};

// send our own candidate to the bridge
ColibriFocus.prototype.sendIceCandidate = function (candidate) {
    var self = this;
    //console.log('candidate', candidate);
    if (!candidate) {
        console.log('end of candidates');
        return;
    }
    if (this.drip_container.length === 0) {
        // start 20ms callout
        window.setTimeout(
            function () {
                if (self.drip_container.length === 0) return;
                self.sendIceCandidates(self.drip_container);
                self.drip_container = [];
            },
            20);
    }
    this.drip_container.push(candidate);
};

// sort and send multiple candidates
ColibriFocus.prototype.sendIceCandidates = function (candidates) {
    var self = this;
    var mycands = $iq({to: this.bridgejid, type: 'set'});
    mycands.c('conference', {xmlns: 'http://jitsi.org/protocol/colibri', id: this.confid});
    // FIXME: multi-candidate logic is taken from strophe.jingle, should be refactored there
    var localSDP = new SDP(this.peerconnection.localDescription.sdp);
    for (var mid = 0; mid < localSDP.media.length; mid++)
    {
        var cands = candidates.filter(function (el) { return el.sdpMLineIndex == mid; });
        if (cands.length > 0)
        {
            var name = cands[0].sdpMid;
            mycands.c('content', {name: name });
            if (name !== 'data')
            {
                mycands.c('channel', {
                    id: $(this.mychannel[cands[0].sdpMLineIndex]).attr('id'),
                    endpoint: $(this.mychannel[cands[0].sdpMLineIndex]).attr('endpoint'),
                    expire: self.channelExpire
                });
            }
            else
            {
                mycands.c('sctpconnection', {
                    id: $(this.mychannel[cands[0].sdpMLineIndex]).attr('id'),
                    endpoint: $(this.mychannel[cands[0].sdpMLineIndex]).attr('endpoint'),
                    port: $(this.mychannel[cands[0].sdpMLineIndex]).attr('port'),
                    expire: self.channelExpire
                });
            }
            mycands.c('transport', {xmlns: 'urn:xmpp:jingle:transports:ice-udp:1'});
            if (config.useRtcpMux && name !== 'data') {
                mycands.c('rtcp-mux').up();
            }
            for (var i = 0; i < cands.length; i++) {
                mycands.c('candidate', SDPUtil.candidateToJingle(cands[i].candidate)).up();
            }
            mycands.up(); // transport
            mycands.up(); // channel / sctpconnection
            mycands.up(); // content
        }
    }
    console.log('send cands', candidates);
    this.connection.sendIQ(mycands,
        function (res) {
            console.log('got result');
        },
        function (err) {
            console.error('got error', err);
        }
    );
};

ColibriFocus.prototype.terminate = function (session, reason) {
    console.log('remote session terminated from', session.peerjid);
    var participant = this.peers.indexOf(session.peerjid);
    if (!this.remotessrc[session.peerjid] || participant == -1) {
        return;
    }
    var ssrcs = this.remotessrc[session.peerjid];
    for (var i = 0; i < ssrcs.length; i++) {
        this.peerconnection.enqueueRemoveSsrc(i, ssrcs[i]);
    }
    // remove from this.peers
    this.peers.splice(participant, 1);
    // expire channel on bridge
    var change = $iq({to: this.bridgejid, type: 'set'});
    change.c('conference', {xmlns: 'http://jitsi.org/protocol/colibri', id: this.confid});
    for (var channel = 0; channel < this.channels[participant].length; channel++) {
        var name = channel === 0 ? 'audio' : 'video';
        if (channel == 2)
            name = 'data';
        change.c('content', {name: name});
        if (name !== 'data')
        {
            change.c('channel', {
                id: $(this.channels[participant][channel]).attr('id'),
                endpoint: $(this.channels[participant][channel]).attr('endpoint'),
                expire: '0'
            });
        }
        else
        {
            change.c('sctpconnection', {
                id: $(this.channels[participant][channel]).attr('id'),
                endpoint: $(this.channels[participant][channel]).attr('endpoint'),
                expire: '0'
            });
        }
        change.up(); // end of channel/sctpconnection
        change.up(); // end of content
    }
    this.connection.sendIQ(change,
        function (res) {
            console.log('got result');
        },
        function (err) {
            console.error('got error', err);
        }
    );
    // and remove from channels
    this.channels.splice(participant, 1);

    // tell everyone about the ssrcs to be removed
    var sdp = new SDP('');
    var localSDP = new SDP(this.peerconnection.localDescription.sdp);
    var contents = SDPUtil.find_lines(localSDP.raw, 'a=mid:').map(SDPUtil.parse_mid);
    for (var j = 0; j < ssrcs.length; j++) {
        sdp.media[j] = 'a=mid:' + contents[j] + '\r\n';
        sdp.media[j] += ssrcs[j];
        this.peerconnection.enqueueRemoveSsrc(j, ssrcs[j]);
    }
    this.sendSSRCUpdate(sdp.getMediaSsrcMap(), session.peerjid, false);

    delete this.remotessrc[session.peerjid];
    this.modifySources();
};

ColibriFocus.prototype.sendTerminate = function (session, reason, text) {
    var term = $iq({to: session.peerjid, type: 'set'})
        .c('jingle',
            {xmlns: 'urn:xmpp:jingle:1',
            action: 'session-terminate',
            initiator: session.me,
            sid: session.sid})
        .c('reason')
        .c(reason || 'success');

    if (text) {
        term.up().c('text').t(text);
    }

    this.connection.sendIQ(term,
        function () {
            if (!session)
                return;

            if (session.peerconnection) {
                session.peerconnection.close();
                session.peerconnection = null;
            }

            session.terminate();
            var ack = {};
            ack.source = 'terminate';
            $(document).trigger('ack.jingle', [session.sid, ack]);
        },
        function (stanza) {
            var error = ($(stanza).find('error').length) ? {
                code: $(stanza).find('error').attr('code'),
                reason: $(stanza).find('error :first')[0].tagName
            }:{};
            $(document).trigger('ack.jingle', [self.sid, error]);
        },
        10000);
    if (this.statsinterval !== null) {
        window.clearInterval(this.statsinterval);
        this.statsinterval = null;
    }
};

ColibriFocus.prototype.setRTCPTerminationStrategy = function (strategyFQN) {
    var self = this;

    // TODO(gp) maybe move the RTCP termination strategy element under the
    // content or channel element.
    var strategyIQ = $iq({to: this.bridgejid, type: 'set'});
    strategyIQ.c('conference', {
	    xmlns: 'http://jitsi.org/protocol/colibri',
	    id: this.confid
    });

    strategyIQ.c('rtcp-termination-strategy', {name: strategyFQN });

    strategyIQ.c('content', {name: "video"});
    strategyIQ.up(); // end of content

    console.log('setting RTCP termination strategy', strategyFQN);
    this.connection.sendIQ(strategyIQ,
        function (res) {
            console.log('got result');
        },
        function (err) {
            console.error('got error', err);
        }
    );
};

/**
 * Sets the default value of the channel last-n attribute in this conference and
 * updates/patches the existing channels.
 */
ColibriFocus.prototype.setChannelLastN = function (channelLastN) {
    if (('number' === typeof(channelLastN))
            && (this.channelLastN !== channelLastN))
    {
        this.channelLastN = channelLastN;

        // Update/patch the existing channels.
        var patch = $iq({ to: this.bridgejid, type: 'set' });

        patch.c(
            'conference',
            { xmlns: 'http://jitsi.org/protocol/colibri', id: this.confid });
        patch.c('content', { name: 'video' });
        patch.c(
            'channel',
            {
                id: $(this.mychannel[1 /* video */]).attr('id'),
                'last-n': this.channelLastN
            });
        patch.up(); // end of channel
        for (var p = 0; p < this.channels.length; p++)
        {
            patch.c(
                'channel',
                {
                    id: $(this.channels[p][1 /* video */]).attr('id'),
                    'last-n': this.channelLastN
                });
            patch.up(); // end of channel
        }
        this.connection.sendIQ(
            patch,
            function (res) {
                console.info('Set channel last-n succeeded:', res);
            },
            function (err) {
                console.error('Set channel last-n failed:', err);
            });
    }
};

/**
 * Sets the default value of the channel simulcast layer attribute in this
 * conference and updates/patches the existing channels.
 */
ColibriFocus.prototype.setReceiveSimulcastLayer = function (receiveSimulcastLayer) {
    if (('number' === typeof(receiveSimulcastLayer))
        && (this.receiveSimulcastLayer !== receiveSimulcastLayer))
    {
        // TODO(gp) be able to set the receiving simulcast layer on a per
        // sender basis.
        this.receiveSimulcastLayer = receiveSimulcastLayer;

        // Update/patch the existing channels.
        var patch = $iq({ to: this.bridgejid, type: 'set' });

        patch.c(
            'conference',
            { xmlns: 'http://jitsi.org/protocol/colibri', id: this.confid });
        patch.c('content', { name: 'video' });
        patch.c(
            'channel',
            {
                id: $(this.mychannel[1 /* video */]).attr('id'),
                'receive-simulcast-layer': this.receiveSimulcastLayer
            });
        patch.up(); // end of channel
        for (var p = 0; p < this.channels.length; p++)
        {
            patch.c(
                'channel',
                {
                    id: $(this.channels[p][1 /* video */]).attr('id'),
                    'receive-simulcast-layer': this.receiveSimulcastLayer
                });
            patch.up(); // end of channel
        }
        this.connection.sendIQ(
            patch,
            function (res) {
                console.info('Set channel simulcast receive layer succeeded:', res);
            },
            function (err) {
                console.error('Set channel simulcast receive layer failed:', err);
            });
    }
};
module.exports = ColibriFocus;

},{"../../RTC/RTCService":3,"../../service/xmpp/XMPPEvents":33,"../../simulcast/SimulcastService":36,"../strophe.jingle.adapter":50,"../strophe.jingle.sdp":52,"../strophe.jingle.sdp.util":53,"../strophe.jingle.sessionbase":55,"./colibri.session":46}],46:[function(require,module,exports){
/* colibri.js -- a COLIBRI focus 
 * The colibri spec has been submitted to the XMPP Standards Foundation
 * for publications as a XMPP extensions:
 * http://xmpp.org/extensions/inbox/colibri.html
 *
 * colibri.js is a participating focus, i.e. the focus participates
 * in the conference. The conference itself can be ad-hoc, through a
 * MUC, through PubSub, etc.
 *
 * colibri.js relies heavily on the strophe.jingle library available 
 * from https://github.com/ESTOS/strophe.jingle
 * and interoperates with the Jitsi videobridge available from
 * https://jitsi.org/Projects/JitsiVideobridge
 */
/*
Copyright (c) 2013 ESTOS GmbH

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
// A colibri session is similar to a jingle session, it just implements some things differently
// FIXME: inherit jinglesession, see https://github.com/legastero/Jingle-RTCPeerConnection/blob/master/index.js
function ColibriSession(me, sid, connection) {
    this.me = me;
    this.sid = sid;
    this.connection = connection;
    //this.peerconnection = null;
    //this.mychannel = null;
    //this.channels = null;
    this.peerjid = null;

    this.colibri = null;
}

// implementation of JingleSession interface
ColibriSession.prototype.initiate = function (peerjid, isInitiator) {
    this.peerjid = peerjid;
};

ColibriSession.prototype.sendOffer = function (offer) {
    console.log('ColibriSession.sendOffer');
};


ColibriSession.prototype.accept = function () {
    console.log('ColibriSession.accept');
};

ColibriSession.prototype.addSource = function (elem, fromJid) {
    this.colibri.addSource(elem, fromJid);
};

ColibriSession.prototype.removeSource = function (elem, fromJid) {
    this.colibri.removeSource(elem, fromJid);
};

ColibriSession.prototype.terminate = function (reason) {
    this.colibri.terminate(this, reason);
};

ColibriSession.prototype.active = function () {
    console.log('ColibriSession.active');
};

ColibriSession.prototype.setRemoteDescription = function (elem, desctype) {
    this.colibri.setRemoteDescription(this, elem, desctype);
};

ColibriSession.prototype.addIceCandidate = function (elem) {
    this.colibri.addIceCandidate(this, elem);
};

ColibriSession.prototype.sendAnswer = function (sdp, provisional) {
    console.log('ColibriSession.sendAnswer');
};

ColibriSession.prototype.sendTerminate = function (reason, text) {
    this.colibri.sendTerminate(this, reason, text);
};

module.exports = ColibriSession;
},{}],47:[function(require,module,exports){
/**
 * Moderate connection plugin.
 */

module.exports = function() {
    Strophe.addConnectionPlugin('moderate', {
        connection: null,
        roomjid: null,
        myroomjid: null,
        members: {},
        list_members: [], // so we can elect a new focus
        presMap: {},
        preziMap: {},
        joined: false,
        isOwner: false,
        init: function (conn) {
            this.connection = conn;

            this.connection.addHandler(this.onMute.bind(this),
                'http://jitsi.org/jitmeet/audio',
                'iq',
                'set',
                null,
                null);
        },
        setMute: function (jid, mute) {
            var iq = $iq({to: jid, type: 'set'})
                .c('mute', {xmlns: 'http://jitsi.org/jitmeet/audio'})
                .t(mute.toString())
                .up();

            this.connection.sendIQ(
                iq,
                function (result) {
                    console.log('set mute', result);
                },
                function (error) {
                    console.log('set mute error', error);
                    messageHandler.openReportDialog(null, 'Failed to mute ' +
                        $("#participant_" + jid).find(".displayname").text() ||
                        "participant" + '.', error);
                });
        },
        onMute: function (iq) {
            var mute = $(iq).find('mute');
            if (mute.length) {
                require("../UI/UIService").toggleAudio();
            }
            return true;
        },
        eject: function (jid) {
            this.connection.jingle.terminateRemoteByJid(jid, 'kick');
            this.connection.emuc.kick(jid);
        }
    });

};

},{"../UI/UIService":7}],48:[function(require,module,exports){
/* jshint -W117 */
module.exports = function() {
    Strophe.addConnectionPlugin('rayo',
        {
            RAYO_XMLNS: 'urn:xmpp:rayo:1',
            connection: null,
            init: function (conn) {
                this.connection = conn;
                if (this.connection.disco) {
                    this.connection.disco.addFeature('urn:xmpp:rayo:client:1');
                }

                this.connection.addHandler(
                    this.onRayo.bind(this), this.RAYO_XMLNS, 'iq', 'set', null, null);
            },
            onRayo: function (iq) {
                console.info("Rayo IQ", iq);
            },
            dial: function (to, from, roomName) {
                var self = this;
                var req = $iq(
                    {
                        type: 'set',
                        to: config.hosts.call_control
                    }
                );
                req.c('dial',
                    {
                        xmlns: this.RAYO_XMLNS,
                        to: to,
                        from: from
                    });
                req.c('header',
                    {
                        name: 'JvbRoomName',
                        value: roomName
                    });

                this.connection.sendIQ(
                    req,
                    function (result) {
                        console.info('Dial result ', result);

                        var resource = $(result).find('ref').attr('uri');
                        this.call_resource = resource.substr('xmpp:'.length);
                        console.info(
                                "Received call resource: " + this.call_resource);
                    },
                    function (error) {
                        console.info('Dial error ', error);
                    }
                );
            },
            hang_up: function () {
                if (!this.call_resource) {
                    console.warn("No call in progress");
                    return;
                }

                var self = this;
                var req = $iq(
                    {
                        type: 'set',
                        to: this.call_resource
                    }
                );
                req.c('hangup',
                    {
                        xmlns: this.RAYO_XMLNS
                    });

                this.connection.sendIQ(
                    req,
                    function (result) {
                        console.info('Hangup result ', result);
                        self.call_resource = null;
                    },
                    function (error) {
                        console.info('Hangup error ', error);
                        self.call_resource = null;
                    }
                );
            }
        }
    );
};
},{}],49:[function(require,module,exports){
/* jshint -W117 */
/* a simple MUC connection plugin
 * can only handle a single MUC room
 */

var ColibriFocus = require("./colibri/colibri.focus");
var XMPPEvents = require("../service/xmpp/XMPPEvents");
var UIService = require("../UI/UIService");
var APIConnector = require("../api/APIConnector");

module.exports = function(eventEmitter, XMPPService) {
    Strophe.addConnectionPlugin('emuc', {
        connection: null,
        roomjid: null,
        myroomjid: null,
        members: {},
        list_members: [], // so we can elect a new focus
        presMap: {},
        preziMap: {},
        joined: false,
        isOwner: false,
        sessionTerminated: false,
        ssrc2videoType: {},
        ssrc2jid: {},
        focus: null,
        init: function (conn) {
            this.connection = conn;
        },
        initPresenceMap: function (myroomjid) {
            this.presMap['to'] = myroomjid;
            this.presMap['xns'] = 'http://jabber.org/protocol/muc';
        },
        doJoin: function (jid, password) {
            this.myroomjid = jid;

            console.info("Joined MUC as " + this.myroomjid);

            this.initPresenceMap(this.myroomjid);

            if (!this.roomjid) {
                this.roomjid = Strophe.getBareJidFromJid(jid);
                // add handlers (just once)
                this.connection.addHandler(this.onPresence.bind(this), null, 'presence', null, null, this.roomjid, {matchBare: true});
                this.connection.addHandler(this.onPresenceUnavailable.bind(this), null, 'presence', 'unavailable', null, this.roomjid, {matchBare: true});
                this.connection.addHandler(this.onPresenceError.bind(this), null, 'presence', 'error', null, this.roomjid, {matchBare: true});
                this.connection.addHandler(this.onMessage.bind(this), null, 'message', null, null, this.roomjid, {matchBare: true});
            }
            if (password !== undefined) {
                this.presMap['password'] = password;
            }
            this.sendPresence();
        },
        doLeave: function () {
            console.log("do leave", this.myroomjid);
            this.sessionTerminated = true;
            var pres = $pres({to: this.myroomjid, type: 'unavailable' });
            this.presMap.length = 0;
            this.connection.send(pres);
        },
        onPresence: function (pres) {
            var from = pres.getAttribute('from');
            var type = pres.getAttribute('type');
            if (type != null) {
                return true;
            }

            // Parse etherpad tag.
            var etherpad = $(pres).find('>etherpad');
            if (etherpad.length) {
                $(document).trigger('etherpadadded.muc', [from, etherpad.text()]);
            }

            // Parse prezi tag.
            var presentation = $(pres).find('>prezi');
            if (presentation.length) {
                var url = presentation.attr('url');
                var current = presentation.find('>current').text();

                console.log('presentation info received from', from, url);

                if (this.preziMap[from] == null) {
                    this.preziMap[from] = url;

                    $(document).trigger('presentationadded.muc', [from, url, current]);
                }
                else {
                    $(document).trigger('gotoslide.muc', [from, url, current]);
                }
            }
            else if (this.preziMap[from] != null) {
                var url = this.preziMap[from];
                delete this.preziMap[from];
                $(document).trigger('presentationremoved.muc', [from, url]);
            }

            // Parse audio info tag.
            var audioMuted = $(pres).find('>audiomuted');
            if (audioMuted.length) {
                $(document).trigger('audiomuted.muc', [from, audioMuted.text()]);
            }

            // Parse video info tag.
            var videoMuted = $(pres).find('>videomuted');
            if (videoMuted.length) {
                $(document).trigger('videomuted.muc', [from, videoMuted.text()]);
            }

            var stats = $(pres).find('>stats');
            if (stats.length) {
                var statsObj = {};
                Strophe.forEachChild(stats[0], "stat", function (el) {
                    statsObj[el.getAttribute("name")] = el.getAttribute("value");
                });
                eventEmitter.emit(XMPPEvents.REMOTE_STATS, from, statsObj);
            }

            // Parse status.
            if ($(pres).find('>x[xmlns="http://jabber.org/protocol/muc#user"]>status[code="201"]').length) {
                // http://xmpp.org/extensions/xep-0045.html#createroom-instant
                this.isOwner = true;
                var create = $iq({type: 'set', to: this.roomjid})
                    .c('query', {xmlns: 'http://jabber.org/protocol/muc#owner'})
                    .c('x', {xmlns: 'jabber:x:data', type: 'submit'});
                this.connection.send(create); // fire away
            }

            // Parse roles.
            var member = {};
            member.show = $(pres).find('>show').text();
            member.status = $(pres).find('>status').text();
            var tmp = $(pres).find('>x[xmlns="http://jabber.org/protocol/muc#user"]>item');
            member.affiliation = tmp.attr('affiliation');
            member.role = tmp.attr('role');

            var nicktag = $(pres).find('>nick[xmlns="http://jabber.org/protocol/nick"]');
            member.displayName = (nicktag.length > 0 ? nicktag.text() : null);

            if (from == this.myroomjid) {
                if (member.affiliation == 'owner') this.isOwner = true;
                if (!this.joined) {
                    this.joined = true;
                    var noMembers = false;
                    if (Object.keys(this.members).length < 1) {
                        noMembers = true;
                        this.focus = new ColibriFocus(this.connection, config.hosts.bridge, eventEmitter);
                        this.setOwnNickname();
                    }
                    UIService.onMucJoined(from, member, noMembers);
                    this.list_members.push(from);
                }
            } else if (this.members[from] === undefined) {
                // new participant
                this.members[from] = member;
                this.list_members.push(from);
                UIService.onMucEntered(from, member, pres,
                    (this.focus !==null && this.focus.confid === null));
                if (this.focus !== null) {
                    // FIXME: this should prepare the video
                    if (this.focus.confid === null) {
                        console.log('make new conference with', from);
                        this.focus.makeConference(Object.keys(this.members));
                    } else {
                        console.log('invite', from, 'into conference');
                        this.focus.addNewParticipant(from);
                    }
                }
            }
            // Always trigger presence to update bindings
            console.log('presence change from', from);
            this.parsePresence(from, member, pres);

            // Trigger status message update
            if (member.status) {
                UIService.onMucPresenceStatus(from, member, pres);
            }

            return true;
        },
        onPresenceUnavailable: function (pres) {
            var from = pres.getAttribute('from');
            // Status code 110 indicates that this notification is "self-presence".
            if (!$(pres).find('>x[xmlns="http://jabber.org/protocol/muc#user"]>status[code="110"]').length) {
                delete this.members[from];
                this.list_members.splice(this.list_members.indexOf(from), 1);
                this.leftMuc(from);
            }
            // If the status code is 110 this means we're leaving and we would like
            // to remove everyone else from our view, so we trigger the event.
            else if (this.list_members.length > 1) {
                for (var i = 0; i < this.list_members.length; i++) {
                    var member = this.list_members[i];
                    delete this.members[i];
                    this.list_members.splice(i, 1);
                    this.leftMuc(member);
                }
            }
            return true;
        },
        leftMuc: function (jid) {
            console.log('left.muc', jid);
            UIService.onMucLeft(jid);
            this.connection.jingle.terminateByJid(jid);

            if (this.focus == null
                // I shouldn't be the one that left to enter here.
                && jid !== this.connection.emuc.myroomjid
                && this.connection.emuc.myroomjid === this.connection.emuc.list_members[0]
                // If our session has been terminated for some reason
                // (kicked, hangup), don't try to become the focus
                && !this.sessionTerminated) {
                console.log('welcome to our new focus... myself');
                this.focus = new ColibriFocus(this.connection, config.hosts.bridge, eventEmitter);
                this.setOwnNickname();

                UIService.updateButtons(null, true);

                if (Object.keys(this.members).length > 0) {
                    this.focus.makeConference(Object.keys(this.members));
                    UIService.updateButtons(true, null);
                }
                $(document).trigger('focusechanged.muc', [this.focus]);
            }
            else if (this.focus && Object.keys(this.connection.emuc.members).length === 0) {
                console.log('everyone left');
                // FIXME: closing the connection is a hack to avoid some
                // problems with reinit
                XMPPService.disposeConference(false,null,false);
                this.focus = new ColibriFocus(this.connection, config.hosts.bridge, eventEmitter);
                this.setOwnNickname();
                UIService.updateButtons(true, false);
            }

            if (this.connection.emuc.getPrezi(jid)) {
                $(document).trigger('presentationremoved.muc',
                    [jid, this.connection.emuc.getPrezi(jid)]);
            }
        },
        setOwnNickname: function () {

            if (XMPPService.getNickname() !== null) {
                this.focus.setEndpointDisplayName(this.connection.emuc.myroomjid,
                    XMPPService.getNickname());
            }

        },
        onPresenceError: function (pres) {
            var from = pres.getAttribute('from');
            if ($(pres).find('>error[type="auth"]>not-authorized[xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"]').length) {
                UIService.showLockPopup(from, this.doJoin);
            } else if ($(pres).find(
                '>error[type="cancel"]>not-allowed[xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"]').length) {
                var toDomain = Strophe.getDomainFromJid(pres.getAttribute('to'));
                if (toDomain === config.hosts.anonymousdomain) {
                    // we are connected with anonymous domain and only non anonymous users can create rooms
                    // we must authorize the user
                    XMPPService.promptLogin();
                } else {
                    console.warn('onPresError ', pres);
                    messageHandler.openReportDialog(null,
                        'Oops! Something went wrong and we couldn`t connect to the conference.',
                        pres);
                }
            } else {
                console.warn('onPresError ', pres);
                messageHandler.openReportDialog(null,
                    'Oops! Something went wrong and we couldn`t connect to the conference.',
                    pres);
            }
            return true;
        },
        sendMessage: function (body, nickname) {
            var msg = $msg({to: this.roomjid, type: 'groupchat'});
            msg.c('body', body).up();
            if (nickname) {
                msg.c('nick', {xmlns: 'http://jabber.org/protocol/nick'}).t(nickname).up().up();
            }
            this.connection.send(msg);
            if (APIConnector.isEnabled() && APIConnector.isEventEnabled("outgoingMessage")) {
                APIConnector.triggerEvent("outgoingMessage", {"message": body});
            }
        },
        setSubject: function (subject) {
            var msg = $msg({to: this.roomjid, type: 'groupchat'});
            msg.c('subject', subject);
            this.connection.send(msg);
            console.log("topic changed to " + subject);
        },
        onMessage: function (msg) {
            // FIXME: this is a hack. but jingle on muc makes nickchanges hard
            var from = msg.getAttribute('from');
            var nick = $(msg).find('>nick[xmlns="http://jabber.org/protocol/nick"]').text() || Strophe.getResourceFromJid(from);

            var txt = $(msg).find('>body').text();
            var type = msg.getAttribute("type");
            if (type == "error") {
                UIService.chatAddError($(msg).find('>text').text(), txt);
                return true;
            }

            var subject = $(msg).find('>subject');
            if (subject.length) {
                var subjectText = subject.text();
                if (subjectText || subjectText == "") {
                    UIService.chatSetSubject(subjectText);
                    console.log("Subject is changed to " + subjectText);
                }
            }


            if (txt) {
                console.log('chat', nick, txt);
                UIService.updateChatConversation(from, nick, txt);
                if (APIConnector.isEnabled() && APIConnector.isEventEnabled("incommingMessage"))
                {
                    if (from != this.myroomjid)
                        APIConnector.triggerEvent("incommingMessage",
                            {"from": from, "nick": nick, "message": txt});
                }
            }
            return true;
        },
        lockRoom: function (key, success_callback, error_callback) {
            //http://xmpp.org/extensions/xep-0045.html#roomconfig
            var ob = this;
            this.connection.sendIQ($iq({to: this.roomjid, type: 'get'}).c('query', {xmlns: 'http://jabber.org/protocol/muc#owner'}),
                function (res) {
                    if ($(res).find('>query>x[xmlns="jabber:x:data"]>field[var="muc#roomconfig_roomsecret"]').length) {
                        var formsubmit = $iq({to: ob.roomjid, type: 'set'}).c('query', {xmlns: 'http://jabber.org/protocol/muc#owner'});
                        formsubmit.c('x', {xmlns: 'jabber:x:data', type: 'submit'});
                        formsubmit.c('field', {'var': 'FORM_TYPE'}).c('value').t('http://jabber.org/protocol/muc#roomconfig').up().up();
                        formsubmit.c('field', {'var': 'muc#roomconfig_roomsecret'}).c('value').t(key).up().up();
                        // Fixes a bug in prosody 0.9.+ https://code.google.com/p/lxmppd/issues/detail?id=373
                        formsubmit.c('field', {'var': 'muc#roomconfig_whois'}).c('value').t('anyone').up().up();
                        // FIXME: is muc#roomconfig_passwordprotectedroom required?
                        this.connection.sendIQ(formsubmit,
                            function (res) {
                                success_callback();
                            },
                            function (err) {
                                console.warn('setting password failed', err);
                                messageHandler.showError('Lock failed',
                                    'Failed to lock conference.',
                                    err);
                                error_callback()

                            }
                        );
                    } else {
                        console.warn('room passwords not supported');
                        messageHandler.showError('Warning',
                            'Room passwords are currently not supported.');
                        error_callback();

                    }
                },
                function (err) {
                    console.warn('setting password failed', err);
                    messageHandler.showError('Lock failed',
                        'Failed to lock conference.',
                        err);
                    setSharedKey('');
                }
            );
        },
        kick: function (jid) {
            var kickIQ = $iq({to: this.roomjid, type: 'set'})
                .c('query', {xmlns: 'http://jabber.org/protocol/muc#admin'})
                .c('item', {nick: Strophe.getResourceFromJid(jid), role: 'none'})
                .c('reason').t('You have been kicked.').up().up().up();

            this.connection.sendIQ(
                kickIQ,
                function (result) {
                    console.log('Kick participant with jid: ', jid, result);
                },
                function (error) {
                    console.log('Kick participant error: ', error);
                });
        },
        sendPresence: function () {
            var pres = $pres({to: this.presMap['to'] });
            pres.c('x', {xmlns: this.presMap['xns']});

            if (this.presMap['password']) {
                pres.c('password').t(this.presMap['password']).up();
            }

            pres.up();

            // Send XEP-0115 'c' stanza that contains our capabilities info
            if (this.connection.caps) {
                this.connection.caps.node = config.clientNode;
                pres.c('c', this.connection.caps.generateCapsAttrs()).up();
            }

            if (this.presMap['bridgeIsDown']) {
                pres.c('bridgeIsDown').up();
            }

            if(this.presMap['email']) {
                pres.c('email').t(this.presMap['email']).up();
            }

            if(this.presMap['userId']) {
                pres.c('userId').t(this.presMap['userId']).up();
            }

            if (this.presMap['displayName']) {
                // XEP-0172
                pres.c('nick', {xmlns: 'http://jabber.org/protocol/nick'})
                    .t(this.presMap['displayName']).up();
            }

            if (this.presMap['audions']) {
                pres.c('audiomuted', {xmlns: this.presMap['audions']})
                    .t(this.presMap['audiomuted']).up();
            }

            if (this.presMap['videons']) {
                pres.c('videomuted', {xmlns: this.presMap['videons']})
                    .t(this.presMap['videomuted']).up();
            }

            if (this.presMap['statsns']) {
                var stats = pres.c('stats', {xmlns: this.presMap['statsns']});
                for (var stat in this.presMap["stats"])
                    if (this.presMap["stats"][stat] != null)
                        stats.c("stat", {name: stat, value: this.presMap["stats"][stat]}).up();
                pres.up();
            }

            if (this.presMap['prezins']) {
                pres.c('prezi',
                    {xmlns: this.presMap['prezins'],
                        'url': this.presMap['preziurl']})
                    .c('current').t(this.presMap['prezicurrent']).up().up();
            }

            if (this.presMap['etherpadns']) {
                pres.c('etherpad', {xmlns: this.presMap['etherpadns']})
                    .t(this.presMap['etherpadname']).up();
            }

            if (this.presMap['medians']) {
                pres.c('media', {xmlns: this.presMap['medians']});
                var sourceNumber = 0;
                Object.keys(this.presMap).forEach(function (key) {
                    if (key.indexOf('source') >= 0) {
                        sourceNumber++;
                    }
                });
                if (sourceNumber > 0)
                    for (var i = 1; i <= sourceNumber / 3; i++) {
                        pres.c('source',
                            {type: this.presMap['source' + i + '_type'],
                                ssrc: this.presMap['source' + i + '_ssrc'],
                                direction: this.presMap['source' + i + '_direction']
                                    || 'sendrecv' }
                        ).up();
                    }
            }

            pres.up();
            this.connection.send(pres);
        },
        addDisplayNameToPresence: function (displayName) {
            this.presMap['displayName'] = displayName;
        },
        addMediaToPresence: function (sourceNumber, mtype, ssrcs, direction) {
            if (!this.presMap['medians'])
                this.presMap['medians'] = 'http://estos.de/ns/mjs';

            this.presMap['source' + sourceNumber + '_type'] = mtype;
            this.presMap['source' + sourceNumber + '_ssrc'] = ssrcs;
            this.presMap['source' + sourceNumber + '_direction'] = direction;
        },
        clearPresenceMedia: function () {
            var self = this;
            Object.keys(this.presMap).forEach(function (key) {
                if (key.indexOf('source') != -1) {
                    delete self.presMap[key];
                }
            });
        },
        addPreziToPresence: function (url, currentSlide) {
            this.presMap['prezins'] = 'http://jitsi.org/jitmeet/prezi';
            this.presMap['preziurl'] = url;
            this.presMap['prezicurrent'] = currentSlide;
        },
        removePreziFromPresence: function () {
            delete this.presMap['prezins'];
            delete this.presMap['preziurl'];
            delete this.presMap['prezicurrent'];
        },
        addCurrentSlideToPresence: function (currentSlide) {
            this.presMap['prezicurrent'] = currentSlide;
        },
        getPrezi: function (roomjid) {
            return this.preziMap[roomjid];
        },
        addEtherpadToPresence: function (etherpadName) {
            this.presMap['etherpadns'] = 'http://jitsi.org/jitmeet/etherpad';
            this.presMap['etherpadname'] = etherpadName;
        },
        addAudioInfoToPresence: function (isMuted) {
            this.presMap['audions'] = 'http://jitsi.org/jitmeet/audio';
            this.presMap['audiomuted'] = isMuted.toString();
        },
        addVideoInfoToPresence: function (isMuted) {
            this.presMap['videons'] = 'http://jitsi.org/jitmeet/video';
            this.presMap['videomuted'] = isMuted.toString();
        },
        addConnectionInfoToPresence: function (stats) {
            this.presMap['statsns'] = 'http://jitsi.org/jitmeet/stats';
            this.presMap['stats'] = stats;
        },
        findJidFromResource: function (resourceJid) {
            var peerJid = null;
            Object.keys(this.members).some(function (jid) {
                peerJid = jid;
                return Strophe.getResourceFromJid(jid) === resourceJid;
            });
            return peerJid;
        },
        addBridgeIsDownToPresence: function () {
            this.presMap['bridgeIsDown'] = true;
        },
        addEmailToPresence: function(email) {
            this.presMap['email'] = email;
        },
        addUserIdToPresence: function(userId) {
            this.presMap['userId'] = userId;
        },
        parsePresence: function (jid, info, pres) {
            var self = this;
            // Remove old ssrcs coming from the jid
            Object.keys(this.ssrc2jid).forEach(function (ssrc) {
                if (self.ssrc2jid[ssrc] == jid) {
                    delete self.ssrc2jid[ssrc];
                    console.log("deleted " + ssrc + " for " + jid);
                }
                if (self.ssrc2videoType[ssrc] == jid) {
                    delete self.ssrc2videoType[ssrc];
                }
            });

            $(pres).find('>media[xmlns="http://estos.de/ns/mjs"]>source').each(function (idx, ssrc) {
                //console.log(jid, 'assoc ssrc', ssrc.getAttribute('type'), ssrc.getAttribute('ssrc'));
                var ssrcV = ssrc.getAttribute('ssrc');
                self.ssrc2jid[ssrcV] = jid;
                console.log("added " + ssrcV + " for " + jid);

                var type = ssrc.getAttribute('type');
                self.ssrc2videoType[ssrcV] = type;

                // might need to update the direction if participant just went from sendrecv to recvonly
                if (type === 'video' || type === 'screen') {
                    switch (ssrc.getAttribute('direction')) {
                        case 'sendrecv':
                            UIService.showVideoForJID(Strophe.getResourceFromJid(jid));
                            break;
                        case 'recvonly':
                            UIService.hideVideoForJID(Strophe.getResourceFromJid(jid));
                            break;
                    }
                }
            });

            //fire display name event
            if (info.displayName && info.displayName.length > 0)
                eventEmitter.emit(XMPPEvents.DISPLAY_NAME_CHANGED,
                    jid, info.displayName);

            if (this.focus !== null && info.displayName !== null) {
                this.focus.setEndpointDisplayName(jid, info.displayName);
            }

            //check if the video bridge is available
            if($(pres).find(">bridgeIsDown").length > 0 && !bridgeIsDown) {
                bridgeIsDown = true;
                messageHandler.showError("Error",
                    "The video bridge is currently unavailable.");
            }
        }
    });
}

},{"../UI/UIService":7,"../api/APIConnector":26,"../service/xmpp/XMPPEvents":33,"./colibri/colibri.focus":45}],50:[function(require,module,exports){
var SDP = require("./strophe.jingle.sdp");
var simulcast = require("../simulcast/SimulcastService");

function TraceablePeerConnection(ice_config, constraints) {
    var self = this;
    var RTCPeerconnection = navigator.mozGetUserMedia ? mozRTCPeerConnection : webkitRTCPeerConnection;
    this.peerconnection = new RTCPeerconnection(ice_config, constraints);
    this.updateLog = [];
    this.stats = {};
    this.statsinterval = null;
    this.maxstats = 0; // limit to 300 values, i.e. 5 minutes; set to 0 to disable

    /**
     * Array of ssrcs that will be added on next modifySources call.
     * @type {Array}
     */
    this.addssrc = [];
    /**
     * Array of ssrcs that will be added on next modifySources call.
     * @type {Array}
     */
    this.removessrc = [];
    /**
     * Pending operation that will be done during modifySources call.
     * Currently 'mute'/'unmute' operations are supported.
     *
     * @type {String}
     */
    this.pendingop = null;

    /**
     * Flag indicates that peer connection stream have changed and modifySources should proceed.
     * @type {boolean}
     */
    this.switchstreams = false;

    // override as desired
    this.trace = function (what, info) {
        //console.warn('WTRACE', what, info);
        self.updateLog.push({
            time: new Date(),
            type: what,
            value: info || ""
        });
    };
    this.onicecandidate = null;
    this.peerconnection.onicecandidate = function (event) {
        self.trace('onicecandidate', JSON.stringify(event.candidate, null, ' '));
        if (self.onicecandidate !== null) {
            self.onicecandidate(event);
        }
    };
    this.onaddstream = null;
    this.peerconnection.onaddstream = function (event) {
        self.trace('onaddstream', event.stream.id);
        if (self.onaddstream !== null) {
            self.onaddstream(event);
        }
    };
    this.onremovestream = null;
    this.peerconnection.onremovestream = function (event) {
        self.trace('onremovestream', event.stream.id);
        if (self.onremovestream !== null) {
            self.onremovestream(event);
        }
    };
    this.onsignalingstatechange = null;
    this.peerconnection.onsignalingstatechange = function (event) {
        self.trace('onsignalingstatechange', self.signalingState);
        if (self.onsignalingstatechange !== null) {
            self.onsignalingstatechange(event);
        }
    };
    this.oniceconnectionstatechange = null;
    this.peerconnection.oniceconnectionstatechange = function (event) {
        self.trace('oniceconnectionstatechange', self.iceConnectionState);
        if (self.oniceconnectionstatechange !== null) {
            self.oniceconnectionstatechange(event);
        }
    };
    this.onnegotiationneeded = null;
    this.peerconnection.onnegotiationneeded = function (event) {
        self.trace('onnegotiationneeded');
        if (self.onnegotiationneeded !== null) {
            self.onnegotiationneeded(event);
        }
    };
    self.ondatachannel = null;
    this.peerconnection.ondatachannel = function (event) {
        self.trace('ondatachannel', event);
        if (self.ondatachannel !== null) {
            self.ondatachannel(event);
        }
    };
    if (!navigator.mozGetUserMedia && this.maxstats) {
        this.statsinterval = window.setInterval(function() {
            self.peerconnection.getStats(function(stats) {
                var results = stats.result();
                for (var i = 0; i < results.length; ++i) {
                    //console.log(results[i].type, results[i].id, results[i].names())
                    var now = new Date();
                    results[i].names().forEach(function (name) {
                        var id = results[i].id + '-' + name;
                        if (!self.stats[id]) {
                            self.stats[id] = {
                                startTime: now,
                                endTime: now,
                                values: [],
                                times: []
                            };
                        }
                        self.stats[id].values.push(results[i].stat(name));
                        self.stats[id].times.push(now.getTime());
                        if (self.stats[id].values.length > self.maxstats) {
                            self.stats[id].values.shift();
                            self.stats[id].times.shift();
                        }
                        self.stats[id].endTime = now;
                    });
                }
            });

        }, 1000);
    }
};

dumpSDP = function(description) {
    return 'type: ' + description.type + '\r\n' + description.sdp;
}

if (TraceablePeerConnection.prototype.__defineGetter__ !== undefined) {
    TraceablePeerConnection.prototype.__defineGetter__('signalingState', function() { return this.peerconnection.signalingState; });
    TraceablePeerConnection.prototype.__defineGetter__('iceConnectionState', function() { return this.peerconnection.iceConnectionState; });
    TraceablePeerConnection.prototype.__defineGetter__('localDescription', function() {
        var publicLocalDescription = simulcast.reverseTransformLocalDescription(this.peerconnection.localDescription);
        return publicLocalDescription;
    });
    TraceablePeerConnection.prototype.__defineGetter__('remoteDescription', function() {
        var publicRemoteDescription = simulcast.reverseTransformRemoteDescription(this.peerconnection.remoteDescription);
        return publicRemoteDescription;
    });
}

TraceablePeerConnection.prototype.addStream = function (stream) {
    this.trace('addStream', stream.id);
    simulcast.resetSender();
    try
    {
        this.peerconnection.addStream(stream.getOriginalStream());
    }
    catch (e)
    {
        console.error(e);
        return;
    }
};

TraceablePeerConnection.prototype.removeStream = function (stream, stopStreams) {
    this.trace('removeStream', stream.id);
    simulcast.resetSender();
    if(stopStreams) {
        stream.getOriginalStream().getAudioTracks().forEach(function (track) {
            track.stop();
        });
        stream.getVideoTracks().forEach(function (track) {
            track.stop();
        });
    }
    this.peerconnection.removeStream(stream.getOriginalStream());
};

TraceablePeerConnection.prototype.createDataChannel = function (label, opts) {
    this.trace('createDataChannel', label, opts);
    return this.peerconnection.createDataChannel(label, opts);
};

TraceablePeerConnection.prototype.setLocalDescription = function (description, successCallback, failureCallback) {
    var self = this;
    description = simulcast.transformLocalDescription(description);
    this.trace('setLocalDescription', dumpSDP(description));
    this.peerconnection.setLocalDescription(description,
        function () {
            self.trace('setLocalDescriptionOnSuccess');
            successCallback();
        },
        function (err) {
            self.trace('setLocalDescriptionOnFailure', err);
            failureCallback(err);
        }
    );
    /*
     if (this.statsinterval === null && this.maxstats > 0) {
     // start gathering stats
     }
     */
};

TraceablePeerConnection.prototype.setRemoteDescription = function (description, successCallback, failureCallback) {
    var self = this;
    description = simulcast.transformRemoteDescription(description);
    this.trace('setRemoteDescription', dumpSDP(description));
    this.peerconnection.setRemoteDescription(description,
        function () {
            self.trace('setRemoteDescriptionOnSuccess');
            successCallback();
        },
        function (err) {
            self.trace('setRemoteDescriptionOnFailure', err);
            failureCallback(err);
        }
    );
    /*
     if (this.statsinterval === null && this.maxstats > 0) {
     // start gathering stats
     }
     */
};

TraceablePeerConnection.prototype.hardMuteVideo = function (muted) {
    this.pendingop = muted ? 'mute' : 'unmute';
};

TraceablePeerConnection.prototype.enqueueAddSsrc = function(channel, ssrcLines) {
    if (!this.addssrc[channel]) {
        this.addssrc[channel] = '';
    }
    this.addssrc[channel] += ssrcLines;
};

TraceablePeerConnection.prototype.addSource = function (elem) {
    console.log('addssrc', new Date().getTime());
    console.log('ice', this.iceConnectionState);
    var sdp = new SDP(this.remoteDescription.sdp);
    var mySdp = new SDP(this.peerconnection.localDescription.sdp);

    var self = this;
    $(elem).each(function (idx, content) {
        var name = $(content).attr('name');
        var lines = '';
        tmp = $(content).find('ssrc-group[xmlns="urn:xmpp:jingle:apps:rtp:ssma:0"]').each(function() {
            var semantics = this.getAttribute('semantics');
            var ssrcs = $(this).find('>source').map(function () {
                return this.getAttribute('ssrc');
            }).get();

            if (ssrcs.length != 0) {
                lines += 'a=ssrc-group:' + semantics + ' ' + ssrcs.join(' ') + '\r\n';
            }
        });
        tmp = $(content).find('source[xmlns="urn:xmpp:jingle:apps:rtp:ssma:0"]'); // can handle both >source and >description>source
        tmp.each(function () {
            var ssrc = $(this).attr('ssrc');
            if(mySdp.containsSSRC(ssrc)){
                /**
                 * This happens when multiple participants change their streams at the same time and
                 * ColibriFocus.modifySources have to wait for stable state. In the meantime multiple
                 * addssrc are scheduled for update IQ. See
                 */
                console.warn("Got add stream request for my own ssrc: "+ssrc);
                return;
            }
            $(this).find('>parameter').each(function () {
                lines += 'a=ssrc:' + ssrc + ' ' + $(this).attr('name');
                if ($(this).attr('value') && $(this).attr('value').length)
                    lines += ':' + $(this).attr('value');
                lines += '\r\n';
            });
        });
        sdp.media.forEach(function(media, idx) {
            if (!SDPUtil.find_line(media, 'a=mid:' + name))
                return;
            sdp.media[idx] += lines;
            self.enqueueAddSsrc(idx, lines);
        });
        sdp.raw = sdp.session + sdp.media.join('');
    });
};

TraceablePeerConnection.prototype.enqueueRemoveSsrc = function(channel, ssrcLines) {
    if (!this.removessrc[channel]){
        this.removessrc[channel] = '';
    }
    this.removessrc[channel] += ssrcLines;
};

TraceablePeerConnection.prototype.removeSource = function (elem) {
    console.log('removessrc', new Date().getTime());
    console.log('ice', this.iceConnectionState);
    var sdp = new SDP(this.remoteDescription.sdp);
    var mySdp = new SDP(this.peerconnection.localDescription.sdp);

    var self = this;
    $(elem).each(function (idx, content) {
        var name = $(content).attr('name');
        var lines = '';
        tmp = $(content).find('ssrc-group[xmlns="urn:xmpp:jingle:apps:rtp:ssma:0"]').each(function() {
            var semantics = this.getAttribute('semantics');
            var ssrcs = $(this).find('>source').map(function () {
                return this.getAttribute('ssrc');
            }).get();

            if (ssrcs.length != 0) {
                lines += 'a=ssrc-group:' + semantics + ' ' + ssrcs.join(' ') + '\r\n';
            }
        });
        tmp = $(content).find('source[xmlns="urn:xmpp:jingle:apps:rtp:ssma:0"]'); // can handle both >source and >description>source
        tmp.each(function () {
            var ssrc = $(this).attr('ssrc');
            // This should never happen, but can be useful for bug detection
            if(mySdp.containsSSRC(ssrc)){
                console.error("Got remove stream request for my own ssrc: "+ssrc);
                return;
            }
            $(this).find('>parameter').each(function () {
                lines += 'a=ssrc:' + ssrc + ' ' + $(this).attr('name');
                if ($(this).attr('value') && $(this).attr('value').length)
                    lines += ':' + $(this).attr('value');
                lines += '\r\n';
            });
        });
        sdp.media.forEach(function(media, idx) {
            if (!SDPUtil.find_line(media, 'a=mid:' + name))
                return;
            sdp.media[idx] += lines;
            self.enqueueRemoveSsrc(idx, lines);
        });
        sdp.raw = sdp.session + sdp.media.join('');
    });
};

TraceablePeerConnection.prototype.modifySources = function(successCallback) {
    var self = this;
    if (this.signalingState == 'closed') return;
    if (!(this.addssrc.length || this.removessrc.length || this.pendingop !== null || this.switchstreams)){
        // There is nothing to do since scheduled job might have been executed by another succeeding call
        if(successCallback){
            successCallback();
        }
        return;
    }

    // FIXME: this is a big hack
    // https://code.google.com/p/webrtc/issues/detail?id=2688
    // ^ has been fixed.
    if (!(this.signalingState == 'stable' && this.iceConnectionState == 'connected')) {
        console.warn('modifySources not yet', this.signalingState, this.iceConnectionState);
        this.wait = true;
        window.setTimeout(function() { self.modifySources(successCallback); }, 250);
        return;
    }
    if (this.wait) {
        window.setTimeout(function() { self.modifySources(successCallback); }, 2500);
        this.wait = false;
        return;
    }

    // Reset switch streams flag
    this.switchstreams = false;

    var sdp = new SDP(this.remoteDescription.sdp);

    // add sources
    this.addssrc.forEach(function(lines, idx) {
        sdp.media[idx] += lines;
    });
    this.addssrc = [];

    // remove sources
    this.removessrc.forEach(function(lines, idx) {
        lines = lines.split('\r\n');
        lines.pop(); // remove empty last element;
        lines.forEach(function(line) {
            sdp.media[idx] = sdp.media[idx].replace(line + '\r\n', '');
        });
    });
    this.removessrc = [];

    // FIXME:
    // this was a hack for the situation when only one peer exists
    // in the conference.
    // check if still required and remove
    if (sdp.media[0])
        sdp.media[0] = sdp.media[0].replace('a=recvonly', 'a=sendrecv');
    if (sdp.media[1])
        sdp.media[1] = sdp.media[1].replace('a=recvonly', 'a=sendrecv');

    sdp.raw = sdp.session + sdp.media.join('');
    this.setRemoteDescription(new RTCSessionDescription({type: 'offer', sdp: sdp.raw}),
        function() {

            if(self.signalingState == 'closed') {
                console.error("createAnswer attempt on closed state");
                return;
            }

            self.createAnswer(
                function(modifiedAnswer) {
                    // change video direction, see https://github.com/jitsi/jitmeet/issues/41
                    if (self.pendingop !== null) {
                        var sdp = new SDP(modifiedAnswer.sdp);
                        if (sdp.media.length > 1) {
                            switch(self.pendingop) {
                                case 'mute':
                                    sdp.media[1] = sdp.media[1].replace('a=sendrecv', 'a=recvonly');
                                    break;
                                case 'unmute':
                                    sdp.media[1] = sdp.media[1].replace('a=recvonly', 'a=sendrecv');
                                    break;
                            }
                            sdp.raw = sdp.session + sdp.media.join('');
                            modifiedAnswer.sdp = sdp.raw;
                        }
                        self.pendingop = null;
                    }

                    // FIXME: pushing down an answer while ice connection state
                    // is still checking is bad...
                    //console.log(self.peerconnection.iceConnectionState);

                    // trying to work around another chrome bug
                    //modifiedAnswer.sdp = modifiedAnswer.sdp.replace(/a=setup:active/g, 'a=setup:actpass');
                    self.setLocalDescription(modifiedAnswer,
                        function() {
                            //console.log('modified setLocalDescription ok');
                            if(successCallback){
                                successCallback();
                            }
                        },
                        function(error) {
                            console.error('modified setLocalDescription failed', error);
                        }
                    );
                },
                function(error) {
                    console.error('modified answer failed', error);
                }
            );
        },
        function(error) {
            console.error('modify failed', error);
        }
    );
};

TraceablePeerConnection.prototype.close = function () {
    this.trace('stop');
    if (this.statsinterval !== null) {
        window.clearInterval(this.statsinterval);
        this.statsinterval = null;
    }
    this.peerconnection.close();
};

TraceablePeerConnection.prototype.createOffer = function (successCallback, failureCallback, constraints) {
    var self = this;
    this.trace('createOffer', JSON.stringify(constraints, null, ' '));
    this.peerconnection.createOffer(
        function (offer) {
            self.trace('createOfferOnSuccess', dumpSDP(offer));
            successCallback(offer);
        },
        function(err) {
            self.trace('createOfferOnFailure', err);
            failureCallback(err);
        },
        constraints
    );
};

TraceablePeerConnection.prototype.createAnswer = function (successCallback, failureCallback, constraints) {
    var self = this;
    this.trace('createAnswer', JSON.stringify(constraints, null, ' '));
    this.peerconnection.createAnswer(
        function (answer) {
            answer = simulcast.transformAnswer(answer);
            self.trace('createAnswerOnSuccess', dumpSDP(answer));
            successCallback(answer);
        },
        function(err) {
            self.trace('createAnswerOnFailure', err);
            failureCallback(err);
        },
        constraints
    );
};

TraceablePeerConnection.prototype.addIceCandidate = function (candidate, successCallback, failureCallback) {
    var self = this;
    this.trace('addIceCandidate', JSON.stringify(candidate, null, ' '));
    this.peerconnection.addIceCandidate(candidate);
    /* maybe later
     this.peerconnection.addIceCandidate(candidate,
     function () {
     self.trace('addIceCandidateOnSuccess');
     successCallback();
     },
     function (err) {
     self.trace('addIceCandidateOnFailure', err);
     failureCallback(err);
     }
     );
     */
};

TraceablePeerConnection.prototype.getStats = function(callback, errback) {
    if (navigator.mozGetUserMedia) {
        // ignore for now...
        if(!errback)
            errback = function () {

            }
        this.peerconnection.getStats(null,callback,errback);
    } else {
        this.peerconnection.getStats(callback);
    }
};

module.exports = TraceablePeerConnection;

//<<<<<<< HEAD:xmpp/strophe.jingle.adapter.js
//
//=======
//// mozilla chrome compat layer -- very similar to adapter.js
//function setupRTC() {
//    var RTC = null;
//    if (navigator.mozGetUserMedia) {
//        console.log('This appears to be Firefox');
//        var version = parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);
//        if (version >= 22) {
//            RTC = {
//                peerconnection: mozRTCPeerConnection,
//                browser: 'firefox',
//                getUserMedia: navigator.mozGetUserMedia.bind(navigator),
//                attachMediaStream: function (element, stream) {
//                    element[0].mozSrcObject = stream;
//                    element[0].play();
//                },
//                pc_constraints: {},
//                getLocalSSRC: function (session, callback) {
//                    session.peerconnection.getStats(function (s) {
//                            var ssrcs = {};
//                            s.forEach(function (item) {
//                                if (item.type == "outboundrtp" && !item.isRemote)
//                                {
//                                    ssrcs[item.id.split('_')[2]] = item.ssrc;
//                                }
//                            });
//                            session.localStreamsSSRC = {
//                                "audio": ssrcs.audio,//for stable 0
//                                "video": ssrcs.video// for stable 1
//                            };
//                            callback(session.localStreamsSSRC);
//                        },
//                        function () {
//                            callback(null);
//                        });
//                },
//                getStreamID: function (stream) {
//                    var tracks = stream.getVideoTracks();
//                    if(!tracks || tracks.length == 0)
//                    {
//                        tracks = stream.getAudioTracks();
//                    }
//                    return tracks[0].id.replace(/[\{,\}]/g,"");
//                },
//                getVideoSrc: function (element) {
//                    return element.mozSrcObject;
//                },
//                setVideoSrc: function (element, src) {
//                    element.mozSrcObject = src;
//                }
//            };
//            if (!MediaStream.prototype.getVideoTracks)
//                MediaStream.prototype.getVideoTracks = function () { return []; };
//            if (!MediaStream.prototype.getAudioTracks)
//                MediaStream.prototype.getAudioTracks = function () { return []; };
//            RTCSessionDescription = mozRTCSessionDescription;
//            RTCIceCandidate = mozRTCIceCandidate;
//        }
//    } else if (navigator.webkitGetUserMedia) {
//        console.log('This appears to be Chrome');
//        RTC = {
//            peerconnection: webkitRTCPeerConnection,
//            browser: 'chrome',
//            getUserMedia: navigator.webkitGetUserMedia.bind(navigator),
//            attachMediaStream: function (element, stream) {
//                element.attr('src', webkitURL.createObjectURL(stream));
//            },
//            // DTLS should now be enabled by default but..
//            pc_constraints: {'optional': [{'DtlsSrtpKeyAgreement': 'true'}]},
//            getLocalSSRC: function (session, callback) {
//                callback(null);
//            },
//            getStreamID: function (stream) {
//                return stream.id;
//            },
//            getVideoSrc: function (element) {
//                return element.getAttribute("src");
//            },
//            setVideoSrc: function (element, src) {
//                element.setAttribute("src", src);
//            }
//        };
//        if (navigator.userAgent.indexOf('Android') != -1) {
//            RTC.pc_constraints = {}; // disable DTLS on Android
//        }
//        if (!webkitMediaStream.prototype.getVideoTracks) {
//            webkitMediaStream.prototype.getVideoTracks = function () {
//                return this.videoTracks;
//            };
//        }
//        if (!webkitMediaStream.prototype.getAudioTracks) {
//            webkitMediaStream.prototype.getAudioTracks = function () {
//                return this.audioTracks;
//            };
//        }
//    }
//    if (RTC === null) {
//        try { console.log('Browser does not appear to be WebRTC-capable'); } catch (e) { }
//    }
//    return RTC;
//}
//
//function getUserMediaWithConstraints(um, success_callback, failure_callback, resolution, bandwidth, fps, desktopStream) {
//    var constraints = {audio: false, video: false};
//
//    if (um.indexOf('video') >= 0) {
//        constraints.video = { mandatory: {}, optional: [] };// same behaviour as true
//    }
//    if (um.indexOf('audio') >= 0) {
//        constraints.audio = { mandatory: {}, optional: []};// same behaviour as true
//    }
//    if (um.indexOf('screen') >= 0) {
//        constraints.video = {
//            mandatory: {
//                chromeMediaSource: "screen",
//                googLeakyBucket: true,
//                maxWidth: window.screen.width,
//                maxHeight: window.screen.height,
//                maxFrameRate: 3
//            },
//            optional: []
//        };
//    }
//    if (um.indexOf('desktop') >= 0) {
//        constraints.video = {
//            mandatory: {
//                chromeMediaSource: "desktop",
//                chromeMediaSourceId: desktopStream,
//                googLeakyBucket: true,
//                maxWidth: window.screen.width,
//                maxHeight: window.screen.height,
//                maxFrameRate: 3
//            },
//            optional: []
//        }
//    }
//
//    if (constraints.audio) {
//        // if it is good enough for hangouts...
//        constraints.audio.optional.push(
//            {googEchoCancellation: true},
//            {googAutoGainControl: true},
//            {googNoiseSupression: true},
//            {googHighpassFilter: true},
//            {googNoisesuppression2: true},
//            {googEchoCancellation2: true},
//            {googAutoGainControl2: true}
//        );
//    }
//    if (constraints.video) {
//        constraints.video.optional.push(
//            {googNoiseReduction: false} // chrome 37 workaround for issue 3807, reenable in M38
//        );
//        if (um.indexOf('video') >= 0) {
//            constraints.video.optional.push(
//                {googLeakyBucket: true}
//            );
//        }
//    }
//
//    // Check if we are running on Android device
//    var isAndroid = navigator.userAgent.indexOf('Android') != -1;
//
//    if (resolution && !constraints.video || isAndroid) {
//        constraints.video = { mandatory: {}, optional: [] };// same behaviour as true
//    }
//    // see https://code.google.com/p/chromium/issues/detail?id=143631#c9 for list of supported resolutions
//    switch (resolution) {
//        // 16:9 first
//        case '1080':
//        case 'fullhd':
//            constraints.video.mandatory.minWidth = 1920;
//            constraints.video.mandatory.minHeight = 1080;
//            break;
//        case '720':
//        case 'hd':
//            constraints.video.mandatory.minWidth = 1280;
//            constraints.video.mandatory.minHeight = 720;
//            break;
//        case '360':
//            constraints.video.mandatory.minWidth = 640;
//            constraints.video.mandatory.minHeight = 360;
//            break;
//        case '180':
//            constraints.video.mandatory.minWidth = 320;
//            constraints.video.mandatory.minHeight = 180;
//            break;
//        // 4:3
//        case '960':
//            constraints.video.mandatory.minWidth = 960;
//            constraints.video.mandatory.minHeight = 720;
//            break;
//        case '640':
//        case 'vga':
//            constraints.video.mandatory.minWidth = 640;
//            constraints.video.mandatory.minHeight = 480;
//            break;
//        case '320':
//            constraints.video.mandatory.minWidth = 320;
//            constraints.video.mandatory.minHeight = 240;
//            break;
//        default:
//            if (isAndroid) {
//                constraints.video.mandatory.minWidth = 320;
//                constraints.video.mandatory.minHeight = 240;
//                constraints.video.mandatory.maxFrameRate = 15;
//            }
//            break;
//    }
//    if (constraints.video.mandatory.minWidth)
//        constraints.video.mandatory.maxWidth = constraints.video.mandatory.minWidth;
//    if (constraints.video.mandatory.minHeight)
//        constraints.video.mandatory.maxHeight = constraints.video.mandatory.minHeight;
//
//    if (bandwidth) { // doesn't work currently, see webrtc issue 1846
//        if (!constraints.video) constraints.video = {mandatory: {}, optional: []};//same behaviour as true
//        constraints.video.optional.push({bandwidth: bandwidth});
//    }
//    if (fps) { // for some cameras it might be necessary to request 30fps
//        // so they choose 30fps mjpg over 10fps yuy2
//        if (!constraints.video) constraints.video = {mandatory: {}, optional: []};// same behaviour as true;
//        constraints.video.mandatory.minFrameRate = fps;
//    }
//
//    var isFF = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
//
//    try {
//        if (config.enableSimulcast
//            && constraints.video
//            && constraints.video.chromeMediaSource !== 'screen'
//            && constraints.video.chromeMediaSource !== 'desktop'
//            && !isAndroid
//
//            // We currently do not support FF, as it doesn't have multistream support.
//            && !isFF) {
//            simulcast.getUserMedia(constraints, function (stream) {
//                    console.log('onUserMediaSuccess');
//                    success_callback(stream);
//                },
//                function (error) {
//                    console.warn('Failed to get access to local media. Error ', error);
//                    if (failure_callback) {
//                        failure_callback(error);
//                    }
//                });
//        } else {
//
//            RTC.getUserMedia(constraints,
//                function (stream) {
//                    console.log('onUserMediaSuccess');
//                    success_callback(stream);
//                },
//                function (error) {
//                    console.warn('Failed to get access to local media. Error ', error);
//                    if (failure_callback) {
//                        failure_callback(error);
//                    }
//                });
//
//        }
//    } catch (e) {
//        console.error('GUM failed: ', e);
//        if(failure_callback) {
//            failure_callback(e);
//        }
//    }
//}
//>>>>>>> master:libs/strophe/strophe.jingle.adapter.js

},{"../simulcast/SimulcastService":36,"./strophe.jingle.sdp":52}],51:[function(require,module,exports){
/* jshint -W117 */

var JingleSession = require("./strophe.jingle.session");
var XMPPEvents = require("../service/xmpp/XMPPEvents");
module.exports = function(eventEmitter, RTCService, XMPPService) {
    Strophe.addConnectionPlugin('jingle', {
        connection: null,
        sessions: {},
        jid2session: {},
        ice_config: {iceServers: []},
        pc_constraints: {},
        media_constraints: {
            mandatory: {
                'OfferToReceiveAudio': true,
                'OfferToReceiveVideo': true
            }
            // MozDontOfferDataChannel: true when this is firefox
        },
        localAudio: null,
        localVideo: null,

        init: function (conn) {
            this.connection = conn;
            if (this.connection.disco) {
                // http://xmpp.org/extensions/xep-0167.html#support
                // http://xmpp.org/extensions/xep-0176.html#support
                this.connection.disco.addFeature('urn:xmpp:jingle:1');
                this.connection.disco.addFeature('urn:xmpp:jingle:apps:rtp:1');
                this.connection.disco.addFeature('urn:xmpp:jingle:transports:ice-udp:1');
                this.connection.disco.addFeature('urn:xmpp:jingle:apps:rtp:audio');
                this.connection.disco.addFeature('urn:xmpp:jingle:apps:rtp:video');


                // this is dealt with by SDP O/A so we don't need to annouce this
                //this.connection.disco.addFeature('urn:xmpp:jingle:apps:rtp:rtcp-fb:0'); // XEP-0293
                //this.connection.disco.addFeature('urn:xmpp:jingle:apps:rtp:rtp-hdrext:0'); // XEP-0294
                this.connection.disco.addFeature('urn:ietf:rfc:5761'); // rtcp-mux
                //this.connection.disco.addFeature('urn:ietf:rfc:5888'); // a=group, e.g. bundle
                //this.connection.disco.addFeature('urn:ietf:rfc:5576'); // a=ssrc
            }
            this.connection.addHandler(this.onJingle.bind(this), 'urn:xmpp:jingle:1', 'iq', 'set', null, null);
        },
        onJingle: function (iq) {
            var sid = $(iq).find('jingle').attr('sid');
            var action = $(iq).find('jingle').attr('action');
            var fromJid = iq.getAttribute('from');
            // send ack first
            var ack = $iq({type: 'result',
                to: fromJid,
                id: iq.getAttribute('id')
            });
            console.log('on jingle ' + action + ' from ' + fromJid, iq);
            var sess = this.sessions[sid];
            if ('session-initiate' != action) {
                if (sess === null) {
                    ack.type = 'error';
                    ack.c('error', {type: 'cancel'})
                        .c('item-not-found', {xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'}).up()
                        .c('unknown-session', {xmlns: 'urn:xmpp:jingle:errors:1'});
                    this.connection.send(ack);
                    return true;
                }
                // compare from to sess.peerjid (bare jid comparison for later compat with message-mode)
                // local jid is not checked
                if (Strophe.getBareJidFromJid(fromJid) != Strophe.getBareJidFromJid(sess.peerjid)) {
                    console.warn('jid mismatch for session id', sid, fromJid, sess.peerjid);
                    ack.type = 'error';
                    ack.c('error', {type: 'cancel'})
                        .c('item-not-found', {xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'}).up()
                        .c('unknown-session', {xmlns: 'urn:xmpp:jingle:errors:1'});
                    this.connection.send(ack);
                    return true;
                }
            } else if (sess !== undefined) {
                // existing session with same session id
                // this might be out-of-order if the sess.peerjid is the same as from
                ack.type = 'error';
                ack.c('error', {type: 'cancel'})
                    .c('service-unavailable', {xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'}).up();
                console.warn('duplicate session id', sid);
                this.connection.send(ack);
                return true;
            }
            // FIXME: check for a defined action
            this.connection.send(ack);
            // see http://xmpp.org/extensions/xep-0166.html#concepts-session
            switch (action) {
                case 'session-initiate':
                    sess = new JingleSession($(iq).attr('to'), $(iq).find('jingle').attr('sid'), this.connection);
                    // configure session
                    if (RTCService.localAudio != RTCService.localVideo) {
                        sess.localStreams.push(RTCService.localAudio);
                    }
                    if (RTCService.localVideo) {
                        sess.localStreams.push(RTCService.localVideo);
                    }
                    sess.media_constraints = this.media_constraints;
                    sess.pc_constraints = this.pc_constraints;
                    sess.ice_config = this.ice_config;

                    sess.initiate(fromJid, false);
                    // FIXME: setRemoteDescription should only be done when this call is to be accepted
                    sess.setRemoteDescription($(iq).find('>jingle'), 'offer');

                    this.sessions[sess.sid] = sess;
                    this.jid2session[sess.peerjid] = sess;

                    // the callback should either
                    // .sendAnswer and .accept
                    // or .sendTerminate -- not necessarily synchronus
                    XMPPService.setActiveCall(sess);
                    eventEmitter.emit(XMPPEvents.CALL_INCOMING, sess);
                    // TODO: check affiliation and/or role
                    console.log('emuc data for', sess.peerjid, this.connection.emuc.members[sess.peerjid]);
                    this.sessions[sess.sid].usedrip = true; // not-so-naive trickle ice
                    this.sessions[sess.sid].sendAnswer();
                    this.sessions[sess.sid].accept();

                    break;
                case 'session-accept':
                    sess.setRemoteDescription($(iq).find('>jingle'), 'answer');
                    sess.accept();
                    $(document).trigger('callaccepted.jingle', [sess.sid]);
                    break;
                case 'session-terminate':
                    // If this is not the focus sending the terminate, we have
                    // nothing more to do here.
                    if (Object.keys(this.sessions).length < 1
                        || !(this.sessions[Object.keys(this.sessions)[0]]
                            instanceof JingleSession)) {
                        break;
                    }
                    console.log('terminating...', sess.sid);
                    sess.terminate();
                    this.terminate(sess.sid);
                    if ($(iq).find('>jingle>reason').length) {
                       this.callTerminated($(iq).find('>jingle>reason>text').text());
                    } else {
                        this.callTerminated(null);
                    }
                    break;
                case 'transport-info':
                    sess.addIceCandidate($(iq).find('>jingle>content'));
                    break;
                case 'session-info':
                    var affected;
                    if ($(iq).find('>jingle>ringing[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').length) {
                        $(document).trigger('ringing.jingle', [sess.sid]);
                    } else if ($(iq).find('>jingle>mute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').length) {
                        affected = $(iq).find('>jingle>mute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').attr('name');
                        $(document).trigger('mute.jingle', [sess.sid, affected]);
                    } else if ($(iq).find('>jingle>unmute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').length) {
                        affected = $(iq).find('>jingle>unmute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').attr('name');
                        $(document).trigger('unmute.jingle', [sess.sid, affected]);
                    }
                    break;
                case 'addsource': // FIXME: proprietary, un-jingleish
                case 'source-add': // FIXME: proprietary
                    sess.addSource($(iq).find('>jingle>content'), fromJid);
                    break;
                case 'removesource': // FIXME: proprietary, un-jingleish
                case 'source-remove': // FIXME: proprietary
                    sess.removeSource($(iq).find('>jingle>content'), fromJid);
                    break;
                default:
                    console.warn('jingle action not implemented', action);
                    break;
            }
            return true;
        },
        initiate: function (peerjid, myjid) { // initiate a new jinglesession to peerjid
            var sess = new JingleSession(myjid || this.connection.jid,
                Math.random().toString(36).substr(2, 12), // random string
                this.connection);
            // configure session
            if (RTCService.localAudio  != RTCService.localVideo) {
                sess.localStreams.push(RTCService.localAudio);
            }
            if (RTCService.localVideo) {
                sess.localStreams.push(RTCService.localVideo);
            }
            sess.media_constraints = this.media_constraints;
            sess.pc_constraints = this.pc_constraints;
            sess.ice_config = this.ice_config;

            sess.initiate(peerjid, true);
            this.sessions[sess.sid] = sess;
            this.jid2session[sess.peerjid] = sess;
            sess.sendOffer();
            return sess;
        },
        terminate: function (sid, reason, text) { // terminate by sessionid (or all sessions)
            if (sid === null || sid === undefined) {
                for (sid in this.sessions) {
                    if (this.sessions[sid].state != 'ended') {
                        this.sessions[sid].sendTerminate(reason || (!this.sessions[sid].active()) ? 'cancel' : null, text);
                        this.sessions[sid].terminate();
                    }
                    delete this.jid2session[this.sessions[sid].peerjid];
                    delete this.sessions[sid];
                }
            } else if (this.sessions.hasOwnProperty(sid)) {
                if (this.sessions[sid].state != 'ended') {
                    this.sessions[sid].sendTerminate(reason || (!this.sessions[sid].active()) ? 'cancel' : null, text);
                    this.sessions[sid].terminate();
                }
                delete this.jid2session[this.sessions[sid].peerjid];
                delete this.sessions[sid];
            }
        },
        callTerminated: function (reason) {
            if (this.connection.emuc.joined && this.connection.emuc.focus == null && reason === 'kick') {
                this.connection.emuc.doLeave();
                messageHandler.openMessageDialog("Session Terminated",
                    "Ouch! You have been kicked out of the meet!");
            }
        },
        // Used to terminate a session when an unavailable presence is received.
        terminateByJid: function (jid) {
            if (this.jid2session.hasOwnProperty(jid)) {
                var sess = this.jid2session[jid];
                if (sess) {
                    sess.terminate();
                    console.log('peer went away silently', jid);
                    delete this.sessions[sess.sid];
                    delete this.jid2session[jid];
                    this.callTerminated( 'gone');
                }
            }
        },
        terminateRemoteByJid: function (jid, reason) {
            if (this.jid2session.hasOwnProperty(jid)) {
                var sess = this.jid2session[jid];
                if (sess) {
                    sess.sendTerminate(reason || (!sess.active()) ? 'kick' : null);
                    sess.terminate();
                    console.log('terminate peer with jid', sess.sid, jid);
                    delete this.sessions[sess.sid];
                    delete this.jid2session[jid];
                    this.callTerminated( 'kicked');
                }
            }
        },
        getStunAndTurnCredentials: function () {
            // get stun and turn configuration from server via xep-0215
            // uses time-limited credentials as described in
            // http://tools.ietf.org/html/draft-uberti-behave-turn-rest-00
            //
            // see https://code.google.com/p/prosody-modules/source/browse/mod_turncredentials/mod_turncredentials.lua
            // for a prosody module which implements this
            //
            // currently, this doesn't work with updateIce and therefore credentials with a long
            // validity have to be fetched before creating the peerconnection
            // TODO: implement refresh via updateIce as described in
            //      https://code.google.com/p/webrtc/issues/detail?id=1650
            var self = this;
            this.connection.sendIQ(
                $iq({type: 'get', to: this.connection.domain})
                    .c('services', {xmlns: 'urn:xmpp:extdisco:1'}).c('service', {host: 'turn.' + this.connection.domain}),
                function (res) {
                    var iceservers = [];
                    $(res).find('>services>service').each(function (idx, el) {
                        el = $(el);
                        var dict = {};
                        var type = el.attr('type');
                        switch (type) {
                            case 'stun':
                                dict.url = 'stun:' + el.attr('host');
                                if (el.attr('port')) {
                                    dict.url += ':' + el.attr('port');
                                }
                                iceservers.push(dict);
                                break;
                            case 'turn':
                            case 'turns':
                                dict.url = type + ':';
                                if (el.attr('username')) { // https://code.google.com/p/webrtc/issues/detail?id=1508
                                    if (navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./) && parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10) < 28) {
                                        dict.url += el.attr('username') + '@';
                                    } else {
                                        dict.username = el.attr('username'); // only works in M28
                                    }
                                }
                                dict.url += el.attr('host');
                                if (el.attr('port') && el.attr('port') != '3478') {
                                    dict.url += ':' + el.attr('port');
                                }
                                if (el.attr('transport') && el.attr('transport') != 'udp') {
                                    dict.url += '?transport=' + el.attr('transport');
                                }
                                if (el.attr('password')) {
                                    dict.credential = el.attr('password');
                                }
                                iceservers.push(dict);
                                break;
                        }
                    });
                    self.ice_config.iceServers = iceservers;
                },
                function (err) {
                    console.warn('getting turn credentials failed', err);
                    console.warn('is mod_turncredentials or similar installed?');
                }
            );
            // implement push?
        },
        getJingleData: function () {
            var data = {};
            var self = this;
            Object.keys(this.connection.jingle.sessions).forEach(function (sid) {
                var session = self.connection.jingle.sessions[sid];
                if (session.peerconnection && session.peerconnection.updateLog) {
                    // FIXME: should probably be a .dump call
                    data["jingle_" + session.sid] = {
                        updateLog: session.peerconnection.updateLog,
                        stats: session.peerconnection.stats,
                        url: window.location.href
                    };
                }
            });
            return data;
        }
    });
}
},{"../service/xmpp/XMPPEvents":33,"./strophe.jingle.session":54}],52:[function(require,module,exports){
/* jshint -W117 */

/**
 * Class holds a=ssrc lines and media type a=mid
 * @param ssrc synchronization source identifier number(a=ssrc lines from SDP)
 * @param type media type eg. "audio" or "video"(a=mid frm SDP)
 * @constructor
 */
function ChannelSsrc(ssrc, type) {
    this.ssrc = ssrc;
    this.type = type;
    this.lines = [];
}

/**
 * Class holds a=ssrc-group: lines
 * @param semantics
 * @param ssrcs
 * @constructor
 */
function ChannelSsrcGroup(semantics, ssrcs, line) {
    this.semantics = semantics;
    this.ssrcs = ssrcs;
}

/**
 * Helper class represents media channel. Is a container for ChannelSsrc, holds channel idx and media type.
 * @param channelNumber channel idx in SDP media array.
 * @param mediaType media type(a=mid)
 * @constructor
 */
function MediaChannel(channelNumber, mediaType) {
    /**
     * SDP channel number
     * @type {*}
     */
    this.chNumber = channelNumber;
    /**
     * Channel media type(a=mid)
     * @type {*}
     */
    this.mediaType = mediaType;
    /**
     * The maps of ssrc numbers to ChannelSsrc objects.
     */
    this.ssrcs = {};

    /**
     * The array of ChannelSsrcGroup objects.
     * @type {Array}
     */
    this.ssrcGroups = [];
}

// SDP STUFF
function SDP(sdp) {
    this.media = sdp.split('\r\nm=');
    for (var i = 1; i < this.media.length; i++) {
        this.media[i] = 'm=' + this.media[i];
        if (i != this.media.length - 1) {
            this.media[i] += '\r\n';
        }
    }
    this.session = this.media.shift() + '\r\n';
    this.raw = this.session + this.media.join('');
}
/**
 * Returns map of MediaChannel mapped per channel idx.
 */
SDP.prototype.getMediaSsrcMap = function() {
    var self = this;
    var media_ssrcs = {};
    for (channelNum = 0; channelNum < self.media.length; channelNum++) {
        modified = true;
        tmp = SDPUtil.find_lines(self.media[channelNum], 'a=ssrc:');
        var type = SDPUtil.parse_mid(SDPUtil.find_line(self.media[channelNum], 'a=mid:'));
        var channel = new MediaChannel(channelNum, type);
        media_ssrcs[channelNum] = channel;
        tmp.forEach(function (line) {
            var linessrc = line.substring(7).split(' ')[0];
            // allocate new ChannelSsrc
            if(!channel.ssrcs[linessrc]) {
                channel.ssrcs[linessrc] = new ChannelSsrc(linessrc, type);
            }
            channel.ssrcs[linessrc].lines.push(line);
        });
        tmp = SDPUtil.find_lines(self.media[channelNum], 'a=ssrc-group:');
        tmp.forEach(function(line){
            var semantics = line.substr(0, idx).substr(13);
            var ssrcs = line.substr(14 + semantics.length).split(' ');
            if (ssrcs.length != 0) {
                var ssrcGroup = new ChannelSsrcGroup(semantics, ssrcs);
                channel.ssrcGroups.push(ssrcGroup);
            }
        });
    }
    return media_ssrcs;
};
/**
 * Returns <tt>true</tt> if this SDP contains given SSRC.
 * @param ssrc the ssrc to check.
 * @returns {boolean} <tt>true</tt> if this SDP contains given SSRC.
 */
SDP.prototype.containsSSRC = function(ssrc) {
    var channels = this.getMediaSsrcMap();
    var contains = false;
    Object.keys(channels).forEach(function(chNumber){
        var channel = channels[chNumber];
        //console.log("Check", channel, ssrc);
        if(Object.keys(channel.ssrcs).indexOf(ssrc) != -1){
            contains = true;
        }
    });
    return contains;
};

/**
 * Returns map of MediaChannel that contains only media not contained in <tt>otherSdp</tt>. Mapped by channel idx.
 * @param otherSdp the other SDP to check ssrc with.
 */
SDP.prototype.getNewMedia = function(otherSdp) {

    // this could be useful in Array.prototype.
    function arrayEquals(array) {
        // if the other array is a falsy value, return
        if (!array)
            return false;

        // compare lengths - can save a lot of time
        if (this.length != array.length)
            return false;

        for (var i = 0, l=this.length; i < l; i++) {
            // Check if we have nested arrays
            if (this[i] instanceof Array && array[i] instanceof Array) {
                // recurse into the nested arrays
                if (!this[i].equals(array[i]))
                    return false;
            }
            else if (this[i] != array[i]) {
                // Warning - two different object instances will never be equal: {x:20} != {x:20}
                return false;
            }
        }
        return true;
    }

    var myMedia = this.getMediaSsrcMap();
    var othersMedia = otherSdp.getMediaSsrcMap();
    var newMedia = {};
    Object.keys(othersMedia).forEach(function(channelNum) {
        var myChannel = myMedia[channelNum];
        var othersChannel = othersMedia[channelNum];
        if(!myChannel && othersChannel) {
            // Add whole channel
            newMedia[channelNum] = othersChannel;
            return;
        }
        // Look for new ssrcs accross the channel
        Object.keys(othersChannel.ssrcs).forEach(function(ssrc) {
            if(Object.keys(myChannel.ssrcs).indexOf(ssrc) === -1) {
                // Allocate channel if we've found ssrc that doesn't exist in our channel
                if(!newMedia[channelNum]){
                    newMedia[channelNum] = new MediaChannel(othersChannel.chNumber, othersChannel.mediaType);
                }
                newMedia[channelNum].ssrcs[ssrc] = othersChannel.ssrcs[ssrc];
            }
        });

        // Look for new ssrc groups across the channels
        othersChannel.ssrcGroups.forEach(function(otherSsrcGroup){

            // try to match the other ssrc-group with an ssrc-group of ours
            var matched = false;
            for (var i = 0; i < myChannel.ssrcGroups.length; i++) {
                var mySsrcGroup = myChannel.ssrcGroups[i];
                if (otherSsrcGroup.semantics == mySsrcGroup.semantics
                    && arrayEquals.apply(otherSsrcGroup.ssrcs, [mySsrcGroup.ssrcs])) {

                    matched = true;
                    break;
                }
            }

            if (!matched) {
                // Allocate channel if we've found an ssrc-group that doesn't
                // exist in our channel

                if(!newMedia[channelNum]){
                    newMedia[channelNum] = new MediaChannel(othersChannel.chNumber, othersChannel.mediaType);
                }
                newMedia[channelNum].ssrcGroups.push(otherSsrcGroup);
            }
        });
    });
    return newMedia;
};

// remove iSAC and CN from SDP
SDP.prototype.mangle = function () {
    var i, j, mline, lines, rtpmap, newdesc;
    for (i = 0; i < this.media.length; i++) {
        lines = this.media[i].split('\r\n');
        lines.pop(); // remove empty last element
        mline = SDPUtil.parse_mline(lines.shift());
        if (mline.media != 'audio')
            continue;
        newdesc = '';
        mline.fmt.length = 0;
        for (j = 0; j < lines.length; j++) {
            if (lines[j].substr(0, 9) == 'a=rtpmap:') {
                rtpmap = SDPUtil.parse_rtpmap(lines[j]);
                if (rtpmap.name == 'CN' || rtpmap.name == 'ISAC')
                    continue;
                mline.fmt.push(rtpmap.id);
                newdesc += lines[j] + '\r\n';
            } else {
                newdesc += lines[j] + '\r\n';
            }
        }
        this.media[i] = SDPUtil.build_mline(mline) + '\r\n';
        this.media[i] += newdesc;
    }
    this.raw = this.session + this.media.join('');
};

// remove lines matching prefix from session section
SDP.prototype.removeSessionLines = function(prefix) {
    var self = this;
    var lines = SDPUtil.find_lines(this.session, prefix);
    lines.forEach(function(line) {
        self.session = self.session.replace(line + '\r\n', '');
    });
    this.raw = this.session + this.media.join('');
    return lines;
}
// remove lines matching prefix from a media section specified by mediaindex
// TODO: non-numeric mediaindex could match mid
SDP.prototype.removeMediaLines = function(mediaindex, prefix) {
    var self = this;
    var lines = SDPUtil.find_lines(this.media[mediaindex], prefix);
    lines.forEach(function(line) {
        self.media[mediaindex] = self.media[mediaindex].replace(line + '\r\n', '');
    });
    this.raw = this.session + this.media.join('');
    return lines;
}

// add content's to a jingle element
SDP.prototype.toJingle = function (elem, thecreator, ssrcs) {
//    console.log("SSRC" + ssrcs["audio"] + " - " + ssrcs["video"]);
    var i, j, k, mline, ssrc, rtpmap, tmp, line, lines;
    var self = this;
    // new bundle plan
    if (SDPUtil.find_line(this.session, 'a=group:')) {
        lines = SDPUtil.find_lines(this.session, 'a=group:');
        for (i = 0; i < lines.length; i++) {
            tmp = lines[i].split(' ');
            var semantics = tmp.shift().substr(8);
            elem.c('group', {xmlns: 'urn:xmpp:jingle:apps:grouping:0', semantics:semantics});
            for (j = 0; j < tmp.length; j++) {
                elem.c('content', {name: tmp[j]}).up();
            }
            elem.up();
        }
    }
    for (i = 0; i < this.media.length; i++) {
        mline = SDPUtil.parse_mline(this.media[i].split('\r\n')[0]);
        if (!(mline.media === 'audio' ||
              mline.media === 'video' ||
              mline.media === 'application'))
        {
            continue;
        }
        if (SDPUtil.find_line(this.media[i], 'a=ssrc:')) {
            ssrc = SDPUtil.find_line(this.media[i], 'a=ssrc:').substring(7).split(' ')[0]; // take the first
        } else {
            if(ssrcs && ssrcs[mline.media])
            {
                ssrc = ssrcs[mline.media];
            }
            else
                ssrc = false;
        }

        elem.c('content', {creator: thecreator, name: mline.media});
        if (SDPUtil.find_line(this.media[i], 'a=mid:')) {
            // prefer identifier from a=mid if present
            var mid = SDPUtil.parse_mid(SDPUtil.find_line(this.media[i], 'a=mid:'));
            elem.attrs({ name: mid });
        }

        if (SDPUtil.find_line(this.media[i], 'a=rtpmap:').length)
        {
            elem.c('description',
                {xmlns: 'urn:xmpp:jingle:apps:rtp:1',
                    media: mline.media });
            if (ssrc) {
                elem.attrs({ssrc: ssrc});
            }
            for (j = 0; j < mline.fmt.length; j++) {
                rtpmap = SDPUtil.find_line(this.media[i], 'a=rtpmap:' + mline.fmt[j]);
                elem.c('payload-type', SDPUtil.parse_rtpmap(rtpmap));
                // put any 'a=fmtp:' + mline.fmt[j] lines into <param name=foo value=bar/>
                if (SDPUtil.find_line(this.media[i], 'a=fmtp:' + mline.fmt[j])) {
                    tmp = SDPUtil.parse_fmtp(SDPUtil.find_line(this.media[i], 'a=fmtp:' + mline.fmt[j]));
                    for (k = 0; k < tmp.length; k++) {
                        elem.c('parameter', tmp[k]).up();
                    }
                }
                this.RtcpFbToJingle(i, elem, mline.fmt[j]); // XEP-0293 -- map a=rtcp-fb

                elem.up();
            }
            if (SDPUtil.find_line(this.media[i], 'a=crypto:', this.session)) {
                elem.c('encryption', {required: 1});
                var crypto = SDPUtil.find_lines(this.media[i], 'a=crypto:', this.session);
                crypto.forEach(function(line) {
                    elem.c('crypto', SDPUtil.parse_crypto(line)).up();
                });
                elem.up(); // end of encryption
            }

            if (ssrc) {
                // new style mapping
                elem.c('source', { ssrc: ssrc, xmlns: 'urn:xmpp:jingle:apps:rtp:ssma:0' });
                // FIXME: group by ssrc and support multiple different ssrcs
                var ssrclines = SDPUtil.find_lines(this.media[i], 'a=ssrc:');
                if(ssrclines.length > 0) {
                    ssrclines.forEach(function (line) {
                        idx = line.indexOf(' ');
                        var linessrc = line.substr(0, idx).substr(7);
                        if (linessrc != ssrc) {
                            elem.up();
                            ssrc = linessrc;
                            elem.c('source', { ssrc: ssrc, xmlns: 'urn:xmpp:jingle:apps:rtp:ssma:0' });
                        }
                        var kv = line.substr(idx + 1);
                        elem.c('parameter');
                        if (kv.indexOf(':') == -1) {
                            elem.attrs({ name: kv });
                        } else {
                            elem.attrs({ name: kv.split(':', 2)[0] });
                            elem.attrs({ value: kv.split(':', 2)[1] });
                        }
                        elem.up();
                    });
                    elem.up();
                }
                else
                {
                    elem.up();
                    elem.c('source', { ssrc: ssrc, xmlns: 'urn:xmpp:jingle:apps:rtp:ssma:0' });
                    elem.c('parameter');
                    elem.attrs({name: "cname", value:Math.random().toString(36).substring(7)});
                    elem.up();
                    var msid = null;
                    if(mline.media == "audio")
                    {
                        msid = connection.jingle.localAudio.getAudioTracks()[0].id;
                    }
                    else
                    {
                        msid = connection.jingle.localVideo.getVideoTracks()[0].id;
                    }
                    if(msid != null)
                    {
                        msid = msid.replace(/[\{,\}]/g,"");
                        elem.c('parameter');
                        elem.attrs({name: "msid", value:msid});
                        elem.up();
                        elem.c('parameter');
                        elem.attrs({name: "mslabel", value:msid});
                        elem.up();
                        elem.c('parameter');
                        elem.attrs({name: "label", value:msid});
                        elem.up();
                        elem.up();
                    }


                }

                // XEP-0339 handle ssrc-group attributes
                var ssrc_group_lines = SDPUtil.find_lines(this.media[i], 'a=ssrc-group:');
                ssrc_group_lines.forEach(function(line) {
                    idx = line.indexOf(' ');
                    var semantics = line.substr(0, idx).substr(13);
                    var ssrcs = line.substr(14 + semantics.length).split(' ');
                    if (ssrcs.length != 0) {
                        elem.c('ssrc-group', { semantics: semantics, xmlns: 'urn:xmpp:jingle:apps:rtp:ssma:0' });
                        ssrcs.forEach(function(ssrc) {
                            elem.c('source', { ssrc: ssrc })
                                .up();
                        });
                        elem.up();
                    }
                });
            }

            if (SDPUtil.find_line(this.media[i], 'a=rtcp-mux')) {
                elem.c('rtcp-mux').up();
            }

            // XEP-0293 -- map a=rtcp-fb:*
            this.RtcpFbToJingle(i, elem, '*');

            // XEP-0294
            if (SDPUtil.find_line(this.media[i], 'a=extmap:')) {
                lines = SDPUtil.find_lines(this.media[i], 'a=extmap:');
                for (j = 0; j < lines.length; j++) {
                    tmp = SDPUtil.parse_extmap(lines[j]);
                    elem.c('rtp-hdrext', { xmlns: 'urn:xmpp:jingle:apps:rtp:rtp-hdrext:0',
                        uri: tmp.uri,
                        id: tmp.value });
                    if (tmp.hasOwnProperty('direction')) {
                        switch (tmp.direction) {
                            case 'sendonly':
                                elem.attrs({senders: 'responder'});
                                break;
                            case 'recvonly':
                                elem.attrs({senders: 'initiator'});
                                break;
                            case 'sendrecv':
                                elem.attrs({senders: 'both'});
                                break;
                            case 'inactive':
                                elem.attrs({senders: 'none'});
                                break;
                        }
                    }
                    // TODO: handle params
                    elem.up();
                }
            }
            elem.up(); // end of description
        }

        // map ice-ufrag/pwd, dtls fingerprint, candidates
        this.TransportToJingle(i, elem);

        if (SDPUtil.find_line(this.media[i], 'a=sendrecv', this.session)) {
            elem.attrs({senders: 'both'});
        } else if (SDPUtil.find_line(this.media[i], 'a=sendonly', this.session)) {
            elem.attrs({senders: 'initiator'});
        } else if (SDPUtil.find_line(this.media[i], 'a=recvonly', this.session)) {
            elem.attrs({senders: 'responder'});
        } else if (SDPUtil.find_line(this.media[i], 'a=inactive', this.session)) {
            elem.attrs({senders: 'none'});
        }
        if (mline.port == '0') {
            // estos hack to reject an m-line
            elem.attrs({senders: 'rejected'});
        }
        elem.up(); // end of content
    }
    elem.up();
    return elem;
};

SDP.prototype.TransportToJingle = function (mediaindex, elem) {
    var i = mediaindex;
    var tmp;
    var self = this;
    elem.c('transport');

    // XEP-0343 DTLS/SCTP
    if (SDPUtil.find_line(this.media[mediaindex], 'a=sctpmap:').length)
    {
        var sctpmap = SDPUtil.find_line(
            this.media[i], 'a=sctpmap:', self.session);
        if (sctpmap)
        {
            var sctpAttrs = SDPUtil.parse_sctpmap(sctpmap);
            elem.c('sctpmap',
                {
                    xmlns: 'urn:xmpp:jingle:transports:dtls-sctp:1',
                    number: sctpAttrs[0], /* SCTP port */
                    protocol: sctpAttrs[1], /* protocol */
                });
            // Optional stream count attribute
            if (sctpAttrs.length > 2)
                elem.attrs({ streams: sctpAttrs[2]});
            elem.up();
        }
    }
    // XEP-0320
    var fingerprints = SDPUtil.find_lines(this.media[mediaindex], 'a=fingerprint:', this.session);
    fingerprints.forEach(function(line) {
        tmp = SDPUtil.parse_fingerprint(line);
        tmp.xmlns = 'urn:xmpp:jingle:apps:dtls:0';
        elem.c('fingerprint').t(tmp.fingerprint);
        delete tmp.fingerprint;
        line = SDPUtil.find_line(self.media[mediaindex], 'a=setup:', self.session);
        if (line) {
            tmp.setup = line.substr(8);
        }
        elem.attrs(tmp);
        elem.up(); // end of fingerprint
    });
    tmp = SDPUtil.iceparams(this.media[mediaindex], this.session);
    if (tmp) {
        tmp.xmlns = 'urn:xmpp:jingle:transports:ice-udp:1';
        elem.attrs(tmp);
        // XEP-0176
        if (SDPUtil.find_line(this.media[mediaindex], 'a=candidate:', this.session)) { // add any a=candidate lines
            var lines = SDPUtil.find_lines(this.media[mediaindex], 'a=candidate:', this.session);
            lines.forEach(function (line) {
                elem.c('candidate', SDPUtil.candidateToJingle(line)).up();
            });
        }
    }
    elem.up(); // end of transport
}

SDP.prototype.RtcpFbToJingle = function (mediaindex, elem, payloadtype) { // XEP-0293
    var lines = SDPUtil.find_lines(this.media[mediaindex], 'a=rtcp-fb:' + payloadtype);
    lines.forEach(function (line) {
        var tmp = SDPUtil.parse_rtcpfb(line);
        if (tmp.type == 'trr-int') {
            elem.c('rtcp-fb-trr-int', {xmlns: 'urn:xmpp:jingle:apps:rtp:rtcp-fb:0', value: tmp.params[0]});
            elem.up();
        } else {
            elem.c('rtcp-fb', {xmlns: 'urn:xmpp:jingle:apps:rtp:rtcp-fb:0', type: tmp.type});
            if (tmp.params.length > 0) {
                elem.attrs({'subtype': tmp.params[0]});
            }
            elem.up();
        }
    });
};

SDP.prototype.RtcpFbFromJingle = function (elem, payloadtype) { // XEP-0293
    var media = '';
    var tmp = elem.find('>rtcp-fb-trr-int[xmlns="urn:xmpp:jingle:apps:rtp:rtcp-fb:0"]');
    if (tmp.length) {
        media += 'a=rtcp-fb:' + '*' + ' ' + 'trr-int' + ' ';
        if (tmp.attr('value')) {
            media += tmp.attr('value');
        } else {
            media += '0';
        }
        media += '\r\n';
    }
    tmp = elem.find('>rtcp-fb[xmlns="urn:xmpp:jingle:apps:rtp:rtcp-fb:0"]');
    tmp.each(function () {
        media += 'a=rtcp-fb:' + payloadtype + ' ' + $(this).attr('type');
        if ($(this).attr('subtype')) {
            media += ' ' + $(this).attr('subtype');
        }
        media += '\r\n';
    });
    return media;
};

// construct an SDP from a jingle stanza
SDP.prototype.fromJingle = function (jingle) {
    var self = this;
    this.raw = 'v=0\r\n' +
        'o=- ' + '1923518516' + ' 2 IN IP4 0.0.0.0\r\n' +// FIXME
        's=-\r\n' +
        't=0 0\r\n';
    // http://tools.ietf.org/html/draft-ietf-mmusic-sdp-bundle-negotiation-04#section-8
    if ($(jingle).find('>group[xmlns="urn:xmpp:jingle:apps:grouping:0"]').length) {
        $(jingle).find('>group[xmlns="urn:xmpp:jingle:apps:grouping:0"]').each(function (idx, group) {
            var contents = $(group).find('>content').map(function (idx, content) {
                return content.getAttribute('name');
            }).get();
            if (contents.length > 0) {
                self.raw += 'a=group:' + (group.getAttribute('semantics') || group.getAttribute('type')) + ' ' + contents.join(' ') + '\r\n';
            }
        });
    }

    this.session = this.raw;
    jingle.find('>content').each(function () {
        var m = self.jingle2media($(this));
        self.media.push(m);
    });

    // reconstruct msid-semantic -- apparently not necessary
    /*
     var msid = SDPUtil.parse_ssrc(this.raw);
     if (msid.hasOwnProperty('mslabel')) {
     this.session += "a=msid-semantic: WMS " + msid.mslabel + "\r\n";
     }
     */

    this.raw = this.session + this.media.join('');
};

// translate a jingle content element into an an SDP media part
SDP.prototype.jingle2media = function (content) {
    var media = '',
        desc = content.find('description'),
        ssrc = desc.attr('ssrc'),
        self = this,
        tmp;
    var sctp = content.find(
        '>transport>sctpmap[xmlns="urn:xmpp:jingle:transports:dtls-sctp:1"]');

    tmp = { media: desc.attr('media') };
    tmp.port = '1';
    if (content.attr('senders') == 'rejected') {
        // estos hack to reject an m-line.
        tmp.port = '0';
    }
    if (content.find('>transport>fingerprint').length || desc.find('encryption').length) {
        if (sctp.length)
            tmp.proto = 'DTLS/SCTP';
        else
            tmp.proto = 'RTP/SAVPF';
    } else {
        tmp.proto = 'RTP/AVPF';
    }
    if (!sctp.length)
    {
        tmp.fmt = desc.find('payload-type').map(
            function () { return this.getAttribute('id'); }).get();
        media += SDPUtil.build_mline(tmp) + '\r\n';
    }
    else
    {
        media += 'm=application 1 DTLS/SCTP ' + sctp.attr('number') + '\r\n';
        media += 'a=sctpmap:' + sctp.attr('number') +
            ' ' + sctp.attr('protocol');

        var streamCount = sctp.attr('streams');
        if (streamCount)
            media += ' ' + streamCount + '\r\n';
        else
            media += '\r\n';
    }

    media += 'c=IN IP4 0.0.0.0\r\n';
    if (!sctp.length)
        media += 'a=rtcp:1 IN IP4 0.0.0.0\r\n';
    tmp = content.find('>transport[xmlns="urn:xmpp:jingle:transports:ice-udp:1"]');
    if (tmp.length) {
        if (tmp.attr('ufrag')) {
            media += SDPUtil.build_iceufrag(tmp.attr('ufrag')) + '\r\n';
        }
        if (tmp.attr('pwd')) {
            media += SDPUtil.build_icepwd(tmp.attr('pwd')) + '\r\n';
        }
        tmp.find('>fingerprint').each(function () {
            // FIXME: check namespace at some point
            media += 'a=fingerprint:' + this.getAttribute('hash');
            media += ' ' + $(this).text();
            media += '\r\n';
            if (this.getAttribute('setup')) {
                media += 'a=setup:' + this.getAttribute('setup') + '\r\n';
            }
        });
    }
    switch (content.attr('senders')) {
        case 'initiator':
            media += 'a=sendonly\r\n';
            break;
        case 'responder':
            media += 'a=recvonly\r\n';
            break;
        case 'none':
            media += 'a=inactive\r\n';
            break;
        case 'both':
            media += 'a=sendrecv\r\n';
            break;
    }
    media += 'a=mid:' + content.attr('name') + '\r\n';

    // <description><rtcp-mux/></description>
    // see http://code.google.com/p/libjingle/issues/detail?id=309 -- no spec though
    // and http://mail.jabber.org/pipermail/jingle/2011-December/001761.html
    if (desc.find('rtcp-mux').length) {
        media += 'a=rtcp-mux\r\n';
    }

    if (desc.find('encryption').length) {
        desc.find('encryption>crypto').each(function () {
            media += 'a=crypto:' + this.getAttribute('tag');
            media += ' ' + this.getAttribute('crypto-suite');
            media += ' ' + this.getAttribute('key-params');
            if (this.getAttribute('session-params')) {
                media += ' ' + this.getAttribute('session-params');
            }
            media += '\r\n';
        });
    }
    desc.find('payload-type').each(function () {
        media += SDPUtil.build_rtpmap(this) + '\r\n';
        if ($(this).find('>parameter').length) {
            media += 'a=fmtp:' + this.getAttribute('id') + ' ';
            media += $(this).find('parameter').map(function () { return (this.getAttribute('name') ? (this.getAttribute('name') + '=') : '') + this.getAttribute('value'); }).get().join('; ');
            media += '\r\n';
        }
        // xep-0293
        media += self.RtcpFbFromJingle($(this), this.getAttribute('id'));
    });

    // xep-0293
    media += self.RtcpFbFromJingle(desc, '*');

    // xep-0294
    tmp = desc.find('>rtp-hdrext[xmlns="urn:xmpp:jingle:apps:rtp:rtp-hdrext:0"]');
    tmp.each(function () {
        media += 'a=extmap:' + this.getAttribute('id') + ' ' + this.getAttribute('uri') + '\r\n';
    });

    content.find('>transport[xmlns="urn:xmpp:jingle:transports:ice-udp:1"]>candidate').each(function () {
        media += SDPUtil.candidateFromJingle(this);
    });

    // XEP-0339 handle ssrc-group attributes
    tmp = content.find('description>ssrc-group[xmlns="urn:xmpp:jingle:apps:rtp:ssma:0"]').each(function() {
        var semantics = this.getAttribute('semantics');
        var ssrcs = $(this).find('>source').map(function() {
            return this.getAttribute('ssrc');
        }).get();

        if (ssrcs.length != 0) {
            media += 'a=ssrc-group:' + semantics + ' ' + ssrcs.join(' ') + '\r\n';
        }
    });

    tmp = content.find('description>source[xmlns="urn:xmpp:jingle:apps:rtp:ssma:0"]');
    tmp.each(function () {
        var ssrc = this.getAttribute('ssrc');
        $(this).find('>parameter').each(function () {
            media += 'a=ssrc:' + ssrc + ' ' + this.getAttribute('name');
            if (this.getAttribute('value') && this.getAttribute('value').length)
                media += ':' + this.getAttribute('value');
            media += '\r\n';
        });
    });

    return media;
};

module.exports = SDP;

},{}],53:[function(require,module,exports){
/**
 * Contains utility classes used in SDP class.
 *
 */

SDPUtil = {
    iceparams: function (mediadesc, sessiondesc) {
        var data = null;
        if (SDPUtil.find_line(mediadesc, 'a=ice-ufrag:', sessiondesc) &&
            SDPUtil.find_line(mediadesc, 'a=ice-pwd:', sessiondesc)) {
            data = {
                ufrag: SDPUtil.parse_iceufrag(SDPUtil.find_line(mediadesc, 'a=ice-ufrag:', sessiondesc)),
                pwd: SDPUtil.parse_icepwd(SDPUtil.find_line(mediadesc, 'a=ice-pwd:', sessiondesc))
            };
        }
        return data;
    },
    parse_iceufrag: function (line) {
        return line.substring(12);
    },
    build_iceufrag: function (frag) {
        return 'a=ice-ufrag:' + frag;
    },
    parse_icepwd: function (line) {
        return line.substring(10);
    },
    build_icepwd: function (pwd) {
        return 'a=ice-pwd:' + pwd;
    },
    parse_mid: function (line) {
        return line.substring(6);
    },
    parse_mline: function (line) {
        var parts = line.substring(2).split(' '),
            data = {};
        data.media = parts.shift();
        data.port = parts.shift();
        data.proto = parts.shift();
        if (parts[parts.length - 1] === '') { // trailing whitespace
            parts.pop();
        }
        data.fmt = parts;
        return data;
    },
    build_mline: function (mline) {
        return 'm=' + mline.media + ' ' + mline.port + ' ' + mline.proto + ' ' + mline.fmt.join(' ');
    },
    parse_rtpmap: function (line) {
        var parts = line.substring(9).split(' '),
            data = {};
        data.id = parts.shift();
        parts = parts[0].split('/');
        data.name = parts.shift();
        data.clockrate = parts.shift();
        data.channels = parts.length ? parts.shift() : '1';
        return data;
    },
    /**
     * Parses SDP line "a=sctpmap:..." and extracts SCTP port from it.
     * @param line eg. "a=sctpmap:5000 webrtc-datachannel"
     * @returns [SCTP port number, protocol, streams]
     */
    parse_sctpmap: function (line)
    {
        var parts = line.substring(10).split(' ');
        var sctpPort = parts[0];
        var protocol = parts[1];
        // Stream count is optional
        var streamCount = parts.length > 2 ? parts[2] : null;
        return [sctpPort, protocol, streamCount];// SCTP port
    },
    build_rtpmap: function (el) {
        var line = 'a=rtpmap:' + el.getAttribute('id') + ' ' + el.getAttribute('name') + '/' + el.getAttribute('clockrate');
        if (el.getAttribute('channels') && el.getAttribute('channels') != '1') {
            line += '/' + el.getAttribute('channels');
        }
        return line;
    },
    parse_crypto: function (line) {
        var parts = line.substring(9).split(' '),
            data = {};
        data.tag = parts.shift();
        data['crypto-suite'] = parts.shift();
        data['key-params'] = parts.shift();
        if (parts.length) {
            data['session-params'] = parts.join(' ');
        }
        return data;
    },
    parse_fingerprint: function (line) { // RFC 4572
        var parts = line.substring(14).split(' '),
            data = {};
        data.hash = parts.shift();
        data.fingerprint = parts.shift();
        // TODO assert that fingerprint satisfies 2UHEX *(":" 2UHEX) ?
        return data;
    },
    parse_fmtp: function (line) {
        var parts = line.split(' '),
            i, key, value,
            data = [];
        parts.shift();
        parts = parts.join(' ').split(';');
        for (i = 0; i < parts.length; i++) {
            key = parts[i].split('=')[0];
            while (key.length && key[0] == ' ') {
                key = key.substring(1);
            }
            value = parts[i].split('=')[1];
            if (key && value) {
                data.push({name: key, value: value});
            } else if (key) {
                // rfc 4733 (DTMF) style stuff
                data.push({name: '', value: key});
            }
        }
        return data;
    },
    parse_icecandidate: function (line) {
        var candidate = {},
            elems = line.split(' ');
        candidate.foundation = elems[0].substring(12);
        candidate.component = elems[1];
        candidate.protocol = elems[2].toLowerCase();
        candidate.priority = elems[3];
        candidate.ip = elems[4];
        candidate.port = elems[5];
        // elems[6] => "typ"
        candidate.type = elems[7];
        candidate.generation = 0; // default value, may be overwritten below
        for (var i = 8; i < elems.length; i += 2) {
            switch (elems[i]) {
                case 'raddr':
                    candidate['rel-addr'] = elems[i + 1];
                    break;
                case 'rport':
                    candidate['rel-port'] = elems[i + 1];
                    break;
                case 'generation':
                    candidate.generation = elems[i + 1];
                    break;
                case 'tcptype':
                    candidate.tcptype = elems[i + 1];
                    break;
                default: // TODO
                    console.log('parse_icecandidate not translating "' + elems[i] + '" = "' + elems[i + 1] + '"');
            }
        }
        candidate.network = '1';
        candidate.id = Math.random().toString(36).substr(2, 10); // not applicable to SDP -- FIXME: should be unique, not just random
        return candidate;
    },
    build_icecandidate: function (cand) {
        var line = ['a=candidate:' + cand.foundation, cand.component, cand.protocol, cand.priority, cand.ip, cand.port, 'typ', cand.type].join(' ');
        line += ' ';
        switch (cand.type) {
            case 'srflx':
            case 'prflx':
            case 'relay':
                if (cand.hasOwnAttribute('rel-addr') && cand.hasOwnAttribute('rel-port')) {
                    line += 'raddr';
                    line += ' ';
                    line += cand['rel-addr'];
                    line += ' ';
                    line += 'rport';
                    line += ' ';
                    line += cand['rel-port'];
                    line += ' ';
                }
                break;
        }
        if (cand.hasOwnAttribute('tcptype')) {
            line += 'tcptype';
            line += ' ';
            line += cand.tcptype;
            line += ' ';
        }
        line += 'generation';
        line += ' ';
        line += cand.hasOwnAttribute('generation') ? cand.generation : '0';
        return line;
    },
    parse_ssrc: function (desc) {
        // proprietary mapping of a=ssrc lines
        // TODO: see "Jingle RTP Source Description" by Juberti and P. Thatcher on google docs
        // and parse according to that
        var lines = desc.split('\r\n'),
            data = {};
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].substring(0, 7) == 'a=ssrc:') {
                var idx = lines[i].indexOf(' ');
                data[lines[i].substr(idx + 1).split(':', 2)[0]] = lines[i].substr(idx + 1).split(':', 2)[1];
            }
        }
        return data;
    },
    parse_rtcpfb: function (line) {
        var parts = line.substr(10).split(' ');
        var data = {};
        data.pt = parts.shift();
        data.type = parts.shift();
        data.params = parts;
        return data;
    },
    parse_extmap: function (line) {
        var parts = line.substr(9).split(' ');
        var data = {};
        data.value = parts.shift();
        if (data.value.indexOf('/') != -1) {
            data.direction = data.value.substr(data.value.indexOf('/') + 1);
            data.value = data.value.substr(0, data.value.indexOf('/'));
        } else {
            data.direction = 'both';
        }
        data.uri = parts.shift();
        data.params = parts;
        return data;
    },
    find_line: function (haystack, needle, sessionpart) {
        var lines = haystack.split('\r\n');
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].substring(0, needle.length) == needle) {
                return lines[i];
            }
        }
        if (!sessionpart) {
            return false;
        }
        // search session part
        lines = sessionpart.split('\r\n');
        for (var j = 0; j < lines.length; j++) {
            if (lines[j].substring(0, needle.length) == needle) {
                return lines[j];
            }
        }
        return false;
    },
    find_lines: function (haystack, needle, sessionpart) {
        var lines = haystack.split('\r\n'),
            needles = [];
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].substring(0, needle.length) == needle)
                needles.push(lines[i]);
        }
        if (needles.length || !sessionpart) {
            return needles;
        }
        // search session part
        lines = sessionpart.split('\r\n');
        for (var j = 0; j < lines.length; j++) {
            if (lines[j].substring(0, needle.length) == needle) {
                needles.push(lines[j]);
            }
        }
        return needles;
    },
    candidateToJingle: function (line) {
        // a=candidate:2979166662 1 udp 2113937151 192.168.2.100 57698 typ host generation 0
        //      <candidate component=... foundation=... generation=... id=... ip=... network=... port=... priority=... protocol=... type=.../>
        if (line.indexOf('candidate:') === 0) {
            line = 'a=' + line;
        } else if (line.substring(0, 12) != 'a=candidate:') {
            console.log('parseCandidate called with a line that is not a candidate line');
            console.log(line);
            return null;
        }
        if (line.substring(line.length - 2) == '\r\n') // chomp it
            line = line.substring(0, line.length - 2);
        var candidate = {},
            elems = line.split(' '),
            i;
        if (elems[6] != 'typ') {
            console.log('did not find typ in the right place');
            console.log(line);
            return null;
        }
        candidate.foundation = elems[0].substring(12);
        candidate.component = elems[1];
        candidate.protocol = elems[2].toLowerCase();
        candidate.priority = elems[3];
        candidate.ip = elems[4];
        candidate.port = elems[5];
        // elems[6] => "typ"
        candidate.type = elems[7];

        candidate.generation = '0'; // default, may be overwritten below
        for (i = 8; i < elems.length; i += 2) {
            switch (elems[i]) {
                case 'raddr':
                    candidate['rel-addr'] = elems[i + 1];
                    break;
                case 'rport':
                    candidate['rel-port'] = elems[i + 1];
                    break;
                case 'generation':
                    candidate.generation = elems[i + 1];
                    break;
                case 'tcptype':
                    candidate.tcptype = elems[i + 1];
                    break;
                default: // TODO
                    console.log('not translating "' + elems[i] + '" = "' + elems[i + 1] + '"');
            }
        }
        candidate.network = '1';
        candidate.id = Math.random().toString(36).substr(2, 10); // not applicable to SDP -- FIXME: should be unique, not just random
        return candidate;
    },
    candidateFromJingle: function (cand) {
        var line = 'a=candidate:';
        line += cand.getAttribute('foundation');
        line += ' ';
        line += cand.getAttribute('component');
        line += ' ';
        line += cand.getAttribute('protocol'); //.toUpperCase(); // chrome M23 doesn't like this
        line += ' ';
        line += cand.getAttribute('priority');
        line += ' ';
        line += cand.getAttribute('ip');
        line += ' ';
        line += cand.getAttribute('port');
        line += ' ';
        line += 'typ';
        line += ' ' + cand.getAttribute('type');
        line += ' ';
        switch (cand.getAttribute('type')) {
            case 'srflx':
            case 'prflx':
            case 'relay':
                if (cand.getAttribute('rel-addr') && cand.getAttribute('rel-port')) {
                    line += 'raddr';
                    line += ' ';
                    line += cand.getAttribute('rel-addr');
                    line += ' ';
                    line += 'rport';
                    line += ' ';
                    line += cand.getAttribute('rel-port');
                    line += ' ';
                }
                break;
        }
        if (cand.getAttribute('protocol').toLowerCase() == 'tcp') {
            line += 'tcptype';
            line += ' ';
            line += cand.getAttribute('tcptype');
            line += ' ';
        }
        line += 'generation';
        line += ' ';
        line += cand.getAttribute('generation') || '0';
        return line + '\r\n';
    }
};

module.exports = SDPUtil;


},{}],54:[function(require,module,exports){
/* jshint -W117 */
// Jingle stuff
var SessionBase = require("./strophe.jingle.sessionbase");
var TraceablePeerConnection = require("./strophe.jingle.adapter");
var SDP = require("./strophe.jingle.sdp");
var simulcast = require("../simulcast/SimulcastService");

JingleSession.prototype = Object.create(SessionBase.prototype);
function JingleSession(me, sid, connection) {

    SessionBase.call(this, connection, sid);

    this.me = me;
    this.initiator = null;
    this.responder = null;
    this.isInitiator = null;
    this.peerjid = null;
    this.state = null;
    this.localSDP = null;
    this.remoteSDP = null;
    this.localStreams = [];
    this.relayedStreams = [];
    this.remoteStreams = [];
    this.startTime = null;
    this.stopTime = null;
    this.media_constraints = null;
    this.pc_constraints = null;
    this.ice_config = {};
    this.drip_container = [];

    this.usetrickle = true;
    this.usepranswer = false; // early transport warmup -- mind you, this might fail. depends on webrtc issue 1718
    this.usedrip = false; // dripping is sending trickle candidates not one-by-one

    this.hadstuncandidate = false;
    this.hadturncandidate = false;
    this.lasticecandidate = false;

    this.statsinterval = null;

    this.reason = null;

    this.wait = true;
    this.localStreamsSSRC = null;
}

JingleSession.prototype.initiate = function (peerjid, isInitiator) {
    var self = this;
    if (this.state !== null) {
        console.error('attempt to initiate on session ' + this.sid +
            'in state ' + this.state);
        return;
    }
    this.isInitiator = isInitiator;
    this.state = 'pending';
    this.initiator = isInitiator ? this.me : peerjid;
    this.responder = !isInitiator ? this.me : peerjid;
    this.peerjid = peerjid;
    this.hadstuncandidate = false;
    this.hadturncandidate = false;
    this.lasticecandidate = false;

    this.peerconnection
        = new TraceablePeerConnection(
            this.connection.jingle.ice_config,
            this.connection.jingle.pc_constraints );

    this.peerconnection.onicecandidate = function (event) {
        self.sendIceCandidate(event.candidate);
    };
    this.peerconnection.onaddstream = function (event) {
        self.remoteStreams.push(event.stream);
        self.waitForPresence(event, self.sid);
    };
    this.peerconnection.onremovestream = function (event) {
        // Remove the stream from remoteStreams
        var streamIdx = self.remoteStreams.indexOf(event.stream);
        if(streamIdx !== -1){
            self.remoteStreams.splice(streamIdx, 1);
        }
        // FIXME: remotestreamremoved.jingle not defined anywhere(unused)
        $(document).trigger('remotestreamremoved.jingle', [event, self.sid]);
    };
    this.peerconnection.onsignalingstatechange = function (event) {
        if (!(self && self.peerconnection)) return;
    };
    this.peerconnection.oniceconnectionstatechange = function (event) {
        if (!(self && self.peerconnection)) return;
        switch (self.peerconnection.iceConnectionState) {
            case 'connected':
                this.startTime = new Date();
                break;
            case 'disconnected':
                this.stopTime = new Date();
                break;
        }
        self.onIceConnectionStateChange(self.sid, self);
    };
    // add any local and relayed stream
    this.localStreams.forEach(function(stream) {
        self.peerconnection.addStream(stream);
    });
    this.relayedStreams.forEach(function(stream) {
        self.peerconnection.addStream(stream);
    });
};

JingleSession.prototype.accept = function () {
    var self = this;
    this.state = 'active';

    var pranswer = this.peerconnection.localDescription;
    if (!pranswer || pranswer.type != 'pranswer') {
        return;
    }
    console.log('going from pranswer to answer');
    if (this.usetrickle) {
        // remove candidates already sent from session-accept
        var lines = SDPUtil.find_lines(pranswer.sdp, 'a=candidate:');
        for (var i = 0; i < lines.length; i++) {
            pranswer.sdp = pranswer.sdp.replace(lines[i] + '\r\n', '');
        }
    }
    while (SDPUtil.find_line(pranswer.sdp, 'a=inactive')) {
        // FIXME: change any inactive to sendrecv or whatever they were originally
        pranswer.sdp = pranswer.sdp.replace('a=inactive', 'a=sendrecv');
    }
    pranswer = simulcast.reverseTransformLocalDescription(pranswer);
    var prsdp = new SDP(pranswer.sdp);
    var accept = $iq({to: this.peerjid,
        type: 'set'})
        .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
            action: 'session-accept',
            initiator: this.initiator,
            responder: this.responder,
            sid: this.sid });
    prsdp.toJingle(accept, this.initiator == this.me ? 'initiator' : 'responder', this.localStreamsSSRC);
    var sdp = this.peerconnection.localDescription.sdp;
    while (SDPUtil.find_line(sdp, 'a=inactive')) {
        // FIXME: change any inactive to sendrecv or whatever they were originally
        sdp = sdp.replace('a=inactive', 'a=sendrecv');
    }
    this.peerconnection.setLocalDescription(new RTCSessionDescription({type: 'answer', sdp: sdp}),
        function () {
            //console.log('setLocalDescription success');
            self.setLocalDescription(self.sid);

            this.connection.sendIQ(accept,
                function () {
                    var ack = {};
                    ack.source = 'answer';
                    $(document).trigger('ack.jingle', [self.sid, ack]);
                },
                function (stanza) {
                    var error = ($(stanza).find('error').length) ? {
                        code: $(stanza).find('error').attr('code'),
                        reason: $(stanza).find('error :first')[0].tagName
                    }:{};
                    error.source = 'answer';
                    $(document).trigger('error.jingle', [self.sid, error]);
                },
                10000);
        },
        function (e) {
            console.error('setLocalDescription failed', e);
        }
    );
};

/**
 * Implements SessionBase.sendSSRCUpdate.
 */
JingleSession.prototype.sendSSRCUpdate = function(sdpMediaSsrcs, fromJid, isadd) {

    var self = this;
    console.log('tell', self.peerjid, 'about ' + (isadd ? 'new' : 'removed') + ' ssrcs from' + self.me);

    if (!(this.peerconnection.signalingState == 'stable' && this.peerconnection.iceConnectionState == 'connected')){
        console.log("Too early to send updates");
        return;
    }

    this.sendSSRCUpdateIq(sdpMediaSsrcs, self.sid, self.initiator, self.peerjid, isadd);
};

JingleSession.prototype.terminate = function (reason) {
    this.state = 'ended';
    this.reason = reason;
    this.peerconnection.close();
    if (this.statsinterval !== null) {
        window.clearInterval(this.statsinterval);
        this.statsinterval = null;
    }
};

JingleSession.prototype.active = function () {
    return this.state == 'active';
};

JingleSession.prototype.sendIceCandidate = function (candidate) {
    var self = this;
    if (candidate && !this.lasticecandidate) {
        var ice = SDPUtil.iceparams(this.localSDP.media[candidate.sdpMLineIndex], this.localSDP.session);
        var jcand = SDPUtil.candidateToJingle(candidate.candidate);
        if (!(ice && jcand)) {
            console.error('failed to get ice && jcand');
            return;
        }
        ice.xmlns = 'urn:xmpp:jingle:transports:ice-udp:1';

        if (jcand.type === 'srflx') {
            this.hadstuncandidate = true;
        } else if (jcand.type === 'relay') {
            this.hadturncandidate = true;
        }

        if (this.usetrickle) {
            if (this.usedrip) {
                if (this.drip_container.length === 0) {
                    // start 20ms callout
                    window.setTimeout(function () {
                        if (self.drip_container.length === 0) return;
                        self.sendIceCandidates(self.drip_container);
                        self.drip_container = [];
                    }, 20);

                }
                this.drip_container.push(candidate);
                return;
            } else {
                self.sendIceCandidate([candidate]);
            }
        }
    } else {
        //console.log('sendIceCandidate: last candidate.');
        if (!this.usetrickle) {
            //console.log('should send full offer now...');
            var init = $iq({to: this.peerjid,
                type: 'set'})
                .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
                    action: this.peerconnection.localDescription.type == 'offer' ? 'session-initiate' : 'session-accept',
                    initiator: this.initiator,
                    sid: this.sid});
            this.localSDP = new SDP(this.peerconnection.localDescription.sdp);
            var self = this;
            var sendJingle = function (ssrc) {
                if(!ssrc)
                    ssrc = {};
                self.localSDP.toJingle(init, self.initiator == self.me ? 'initiator' : 'responder', ssrc);
                self.connection.sendIQ(init,
                    function () {
                        //console.log('session initiate ack');
                        var ack = {};
                        ack.source = 'offer';
                        $(document).trigger('ack.jingle', [self.sid, ack]);
                    },
                    function (stanza) {
                        self.state = 'error';
                        self.peerconnection.close();
                        var error = ($(stanza).find('error').length) ? {
                            code: $(stanza).find('error').attr('code'),
                            reason: $(stanza).find('error :first')[0].tagName,
                        }:{};
                        error.source = 'offer';
                        $(document).trigger('error.jingle', [self.sid, error]);
                    },
                    10000);
            }

            RTC.getLocalSSRC(this, function (ssrcs) {
                if(ssrcs)
                {
                    sendJingle(ssrcs);
                    $(document).trigger("setLocalDescription.jingle", [self.sid]);
                }
                else
                {
                    sendJingle();
                }
            });

        }
        this.lasticecandidate = true;
        console.log('Have we encountered any srflx candidates? ' + this.hadstuncandidate);
        console.log('Have we encountered any relay candidates? ' + this.hadturncandidate);

        if (!(this.hadstuncandidate || this.hadturncandidate) && this.peerconnection.signalingState != 'closed') {
            $(document).trigger('nostuncandidates.jingle', [this.sid]);
        }
    }
};

JingleSession.prototype.sendIceCandidates = function (candidates) {
    console.log('sendIceCandidates', candidates);
    var cand = $iq({to: this.peerjid, type: 'set'})
        .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
            action: 'transport-info',
            initiator: this.initiator,
            sid: this.sid});
    for (var mid = 0; mid < this.localSDP.media.length; mid++) {
        var cands = candidates.filter(function (el) { return el.sdpMLineIndex == mid; });
        var mline = SDPUtil.parse_mline(this.localSDP.media[mid].split('\r\n')[0]);
        if (cands.length > 0) {
            var ice = SDPUtil.iceparams(this.localSDP.media[mid], this.localSDP.session);
            ice.xmlns = 'urn:xmpp:jingle:transports:ice-udp:1';
            cand.c('content', {creator: this.initiator == this.me ? 'initiator' : 'responder',
                name: (cands[0].sdpMid? cands[0].sdpMid : mline.media)
            }).c('transport', ice);
            for (var i = 0; i < cands.length; i++) {
                cand.c('candidate', SDPUtil.candidateToJingle(cands[i].candidate)).up();
            }
            // add fingerprint
            if (SDPUtil.find_line(this.localSDP.media[mid], 'a=fingerprint:', this.localSDP.session)) {
                var tmp = SDPUtil.parse_fingerprint(SDPUtil.find_line(this.localSDP.media[mid], 'a=fingerprint:', this.localSDP.session));
                tmp.required = true;
                cand.c(
                    'fingerprint',
                    {xmlns: 'urn:xmpp:jingle:apps:dtls:0'})
                    .t(tmp.fingerprint);
                delete tmp.fingerprint;
                cand.attrs(tmp);
                cand.up();
            }
            cand.up(); // transport
            cand.up(); // content
        }
    }
    // might merge last-candidate notification into this, but it is called alot later. See webrtc issue #2340
    //console.log('was this the last candidate', this.lasticecandidate);
    this.connection.sendIQ(cand,
        function () {
            var ack = {};
            ack.source = 'transportinfo';
            $(document).trigger('ack.jingle', [this.sid, ack]);
        },
        function (stanza) {
            var error = ($(stanza).find('error').length) ? {
                code: $(stanza).find('error').attr('code'),
                reason: $(stanza).find('error :first')[0].tagName,
            }:{};
            error.source = 'transportinfo';
            $(document).trigger('error.jingle', [this.sid, error]);
        },
        10000);
};


JingleSession.prototype.sendOffer = function () {
    //console.log('sendOffer...');
    var self = this;
    this.peerconnection.createOffer(function (sdp) {
            self.createdOffer(sdp);
        },
        function (e) {
            console.error('createOffer failed', e);
        },
        this.media_constraints
    );
};

JingleSession.prototype.createdOffer = function (sdp) {
    //console.log('createdOffer', sdp);
    var self = this;
    this.localSDP = new SDP(sdp.sdp);
    //this.localSDP.mangle();
    var sendJingle = function () {
        var init = $iq({to: this.peerjid,
            type: 'set'})
            .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
                action: 'session-initiate',
                initiator: this.initiator,
                sid: this.sid});
        this.localSDP.toJingle(init, this.initiator == this.me ? 'initiator' : 'responder', this.localStreamsSSRC);
        this.connection.sendIQ(init,
            function () {
                var ack = {};
                ack.source = 'offer';
                $(document).trigger('ack.jingle', [self.sid, ack]);
            },
            function (stanza) {
                self.state = 'error';
                self.peerconnection.close();
                var error = ($(stanza).find('error').length) ? {
                    code: $(stanza).find('error').attr('code'),
                    reason: $(stanza).find('error :first')[0].tagName,
                }:{};
                error.source = 'offer';
                $(document).trigger('error.jingle', [self.sid, error]);
            },
            10000);
    }
    sdp.sdp = this.localSDP.raw;
    this.peerconnection.setLocalDescription(sdp,
        function () {
            if(self.usetrickle)
            {
                RTC.getLocalSSRC(function(ssrc)
                {
                    sendJingle(ssrc);
                    self.setLocalDescription(self.sid);
                });
            }
            else
                self.setLocalDescription(self.sid);
            //console.log('setLocalDescription success');
        },
        function (e) {
            console.error('setLocalDescription failed', e);
        }
    );
    var cands = SDPUtil.find_lines(this.localSDP.raw, 'a=candidate:');
    for (var i = 0; i < cands.length; i++) {
        var cand = SDPUtil.parse_icecandidate(cands[i]);
        if (cand.type == 'srflx') {
            this.hadstuncandidate = true;
        } else if (cand.type == 'relay') {
            this.hadturncandidate = true;
        }
    }
};

JingleSession.prototype.setRemoteDescription = function (elem, desctype) {
    //console.log('setting remote description... ', desctype);
    this.remoteSDP = new SDP('');
    this.remoteSDP.fromJingle(elem);
    if (this.peerconnection.remoteDescription !== null) {
        console.log('setRemoteDescription when remote description is not null, should be pranswer', this.peerconnection.remoteDescription);
        if (this.peerconnection.remoteDescription.type == 'pranswer') {
            var pranswer = new SDP(this.peerconnection.remoteDescription.sdp);
            for (var i = 0; i < pranswer.media.length; i++) {
                // make sure we have ice ufrag and pwd
                if (!SDPUtil.find_line(this.remoteSDP.media[i], 'a=ice-ufrag:', this.remoteSDP.session)) {
                    if (SDPUtil.find_line(pranswer.media[i], 'a=ice-ufrag:', pranswer.session)) {
                        this.remoteSDP.media[i] += SDPUtil.find_line(pranswer.media[i], 'a=ice-ufrag:', pranswer.session) + '\r\n';
                    } else {
                        console.warn('no ice ufrag?');
                    }
                    if (SDPUtil.find_line(pranswer.media[i], 'a=ice-pwd:', pranswer.session)) {
                        this.remoteSDP.media[i] += SDPUtil.find_line(pranswer.media[i], 'a=ice-pwd:', pranswer.session) + '\r\n';
                    } else {
                        console.warn('no ice pwd?');
                    }
                }
                // copy over candidates
                var lines = SDPUtil.find_lines(pranswer.media[i], 'a=candidate:');
                for (var j = 0; j < lines.length; j++) {
                    this.remoteSDP.media[i] += lines[j] + '\r\n';
                }
            }
            this.remoteSDP.raw = this.remoteSDP.session + this.remoteSDP.media.join('');
        }
    }
    var remotedesc = new RTCSessionDescription({type: desctype, sdp: this.remoteSDP.raw});

    this.peerconnection.setRemoteDescription(remotedesc,
        function () {
            //console.log('setRemoteDescription success');
        },
        function (e) {
            console.error('setRemoteDescription error', e);
            messageHandler.showError(  "Sorry",
                "Your browser version is too old. Please update and try again...");
            this.connection.emuc.doLeave();
        }
    );
};

JingleSession.prototype.addIceCandidate = function (elem) {
    var self = this;
    if (this.peerconnection.signalingState == 'closed') {
        return;
    }
    if (!this.peerconnection.remoteDescription && this.peerconnection.signalingState == 'have-local-offer') {
        console.log('trickle ice candidate arriving before session accept...');
        // create a PRANSWER for setRemoteDescription
        if (!this.remoteSDP) {
            var cobbled = 'v=0\r\n' +
                'o=- ' + '1923518516' + ' 2 IN IP4 0.0.0.0\r\n' +// FIXME
                's=-\r\n' +
                't=0 0\r\n';
            // first, take some things from the local description
            for (var i = 0; i < this.localSDP.media.length; i++) {
                cobbled += SDPUtil.find_line(this.localSDP.media[i], 'm=') + '\r\n';
                cobbled += SDPUtil.find_lines(this.localSDP.media[i], 'a=rtpmap:').join('\r\n') + '\r\n';
                if (SDPUtil.find_line(this.localSDP.media[i], 'a=mid:')) {
                    cobbled += SDPUtil.find_line(this.localSDP.media[i], 'a=mid:') + '\r\n';
                }
                cobbled += 'a=inactive\r\n';
            }
            this.remoteSDP = new SDP(cobbled);
        }
        // then add things like ice and dtls from remote candidate
        elem.each(function () {
            for (var i = 0; i < self.remoteSDP.media.length; i++) {
                if (SDPUtil.find_line(self.remoteSDP.media[i], 'a=mid:' + $(this).attr('name')) ||
                    self.remoteSDP.media[i].indexOf('m=' + $(this).attr('name')) === 0) {
                    if (!SDPUtil.find_line(self.remoteSDP.media[i], 'a=ice-ufrag:')) {
                        var tmp = $(this).find('transport');
                        self.remoteSDP.media[i] += 'a=ice-ufrag:' + tmp.attr('ufrag') + '\r\n';
                        self.remoteSDP.media[i] += 'a=ice-pwd:' + tmp.attr('pwd') + '\r\n';
                        tmp = $(this).find('transport>fingerprint');
                        if (tmp.length) {
                            self.remoteSDP.media[i] += 'a=fingerprint:' + tmp.attr('hash') + ' ' + tmp.text() + '\r\n';
                        } else {
                            console.log('no dtls fingerprint (webrtc issue #1718?)');
                            self.remoteSDP.media[i] += 'a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:BAADBAADBAADBAADBAADBAADBAADBAADBAADBAAD\r\n';
                        }
                        break;
                    }
                }
            }
        });
        this.remoteSDP.raw = this.remoteSDP.session + this.remoteSDP.media.join('');

        // we need a complete SDP with ice-ufrag/ice-pwd in all parts
        // this makes the assumption that the PRANSWER is constructed such that the ice-ufrag is in all mediaparts
        // but it could be in the session part as well. since the code above constructs this sdp this can't happen however
        var iscomplete = this.remoteSDP.media.filter(function (mediapart) {
            return SDPUtil.find_line(mediapart, 'a=ice-ufrag:');
        }).length == this.remoteSDP.media.length;

        if (iscomplete) {
            console.log('setting pranswer');
            try {
                this.peerconnection.setRemoteDescription(new RTCSessionDescription({type: 'pranswer', sdp: this.remoteSDP.raw }),
                    function() {
                    },
                    function(e) {
                        console.log('setRemoteDescription pranswer failed', e.toString());
                    });
            } catch (e) {
                console.error('setting pranswer failed', e);
            }
        } else {
            //console.log('not yet setting pranswer');
        }
    }
    // operate on each content element
    elem.each(function () {
        // would love to deactivate this, but firefox still requires it
        var idx = -1;
        var i;
        for (i = 0; i < self.remoteSDP.media.length; i++) {
            if (SDPUtil.find_line(self.remoteSDP.media[i], 'a=mid:' + $(this).attr('name')) ||
                self.remoteSDP.media[i].indexOf('m=' + $(this).attr('name')) === 0) {
                idx = i;
                break;
            }
        }
        if (idx == -1) { // fall back to localdescription
            for (i = 0; i < self.localSDP.media.length; i++) {
                if (SDPUtil.find_line(self.localSDP.media[i], 'a=mid:' + $(this).attr('name')) ||
                    self.localSDP.media[i].indexOf('m=' + $(this).attr('name')) === 0) {
                    idx = i;
                    break;
                }
            }
        }
        var name = $(this).attr('name');
        // TODO: check ice-pwd and ice-ufrag?
        $(this).find('transport>candidate').each(function () {
            var line, candidate;
            line = SDPUtil.candidateFromJingle(this);
            candidate = new RTCIceCandidate({sdpMLineIndex: idx,
                sdpMid: name,
                candidate: line});
            try {
                self.peerconnection.addIceCandidate(candidate);
            } catch (e) {
                console.error('addIceCandidate failed', e.toString(), line);
            }
        });
    });
};

JingleSession.prototype.sendAnswer = function (provisional) {
    //console.log('createAnswer', provisional);
    var self = this;
    this.peerconnection.createAnswer(
        function (sdp) {
            self.createdAnswer(sdp, provisional);
        },
        function (e) {
            console.error('createAnswer failed', e);
        },
        this.media_constraints
    );
};

JingleSession.prototype.createdAnswer = function (sdp, provisional) {
    //console.log('createAnswer callback');
    var self = this;
    this.localSDP = new SDP(sdp.sdp);
    //this.localSDP.mangle();
    this.usepranswer = provisional === true;
    if (this.usetrickle) {
        if (this.usepranswer) {
            sdp.type = 'pranswer';
            for (var i = 0; i < this.localSDP.media.length; i++) {
                this.localSDP.media[i] = this.localSDP.media[i].replace('a=sendrecv\r\n', 'a=inactive\r\n');
            }
            this.localSDP.raw = this.localSDP.session + '\r\n' + this.localSDP.media.join('');
        }
    }
    var self = this;
    var sendJingle = function (ssrcs) {

                var accept = $iq({to: self.peerjid,
                    type: 'set'})
                    .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
                        action: 'session-accept',
                        initiator: self.initiator,
                        responder: self.responder,
                        sid: self.sid });
                var publicLocalDesc = simulcast.reverseTransformLocalDescription(sdp);
                var publicLocalSDP = new SDP(publicLocalDesc.sdp);
                publicLocalSDP.toJingle(accept, self.initiator == self.me ? 'initiator' : 'responder', ssrcs);
                this.connection.sendIQ(accept,
                    function () {
                        var ack = {};
                        ack.source = 'answer';
                        $(document).trigger('ack.jingle', [self.sid, ack]);
                    },
                    function (stanza) {
                        var error = ($(stanza).find('error').length) ? {
                            code: $(stanza).find('error').attr('code'),
                            reason: $(stanza).find('error :first')[0].tagName,
                        }:{};
                        error.source = 'answer';
                        $(document).trigger('error.jingle', [self.sid, error]);
                    },
                    10000);
    }
    sdp.sdp = this.localSDP.raw;
    this.peerconnection.setLocalDescription(sdp,
        function () {
            if (self.usetrickle && !self.usepranswer) {
                RTC.getLocalSSRC(self, function (ssrc) {
                    sendJingle(ssrc);
                    self.setLocalDescription(self.sid);
                });
            }
            else
                self.setLocalDescription(self.sid);
        },
        function (e) {
            console.error('setLocalDescription failed', e);
        }
    );
    var cands = SDPUtil.find_lines(this.localSDP.raw, 'a=candidate:');
    for (var j = 0; j < cands.length; j++) {
        var cand = SDPUtil.parse_icecandidate(cands[j]);
        if (cand.type == 'srflx') {
            this.hadstuncandidate = true;
        } else if (cand.type == 'relay') {
            this.hadturncandidate = true;
        }
    }
};

JingleSession.prototype.sendTerminate = function (reason, text) {
    var self = this,
        term = $iq({to: this.peerjid,
            type: 'set'})
            .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
                action: 'session-terminate',
                initiator: this.initiator,
                sid: this.sid})
            .c('reason')
            .c(reason || 'success');

    if (text) {
        term.up().c('text').t(text);
    }

    this.connection.sendIQ(term,
        function () {
            self.peerconnection.close();
            self.peerconnection = null;
            self.terminate();
            var ack = {};
            ack.source = 'terminate';
            $(document).trigger('ack.jingle', [self.sid, ack]);
        },
        function (stanza) {
            var error = ($(stanza).find('error').length) ? {
                code: $(stanza).find('error').attr('code'),
                reason: $(stanza).find('error :first')[0].tagName,
            }:{};
            $(document).trigger('ack.jingle', [self.sid, error]);
        },
        10000);
    if (this.statsinterval !== null) {
        window.clearInterval(this.statsinterval);
        this.statsinterval = null;
    }
};

JingleSession.prototype.sendMute = function (muted, content) {
    var info = $iq({to: this.peerjid,
        type: 'set'})
        .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
            action: 'session-info',
            initiator: this.initiator,
            sid: this.sid });
    info.c(muted ? 'mute' : 'unmute', {xmlns: 'urn:xmpp:jingle:apps:rtp:info:1'});
    info.attrs({'creator': this.me == this.initiator ? 'creator' : 'responder'});
    if (content) {
        info.attrs({'name': content});
    }
    this.connection.send(info);
};

JingleSession.prototype.sendRinging = function () {
    var info = $iq({to: this.peerjid,
        type: 'set'})
        .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
            action: 'session-info',
            initiator: this.initiator,
            sid: this.sid });
    info.c('ringing', {xmlns: 'urn:xmpp:jingle:apps:rtp:info:1'});
    this.connection.send(info);
};

JingleSession.prototype.getStats = function (interval) {
    var self = this;
    var recv = {audio: 0, video: 0};
    var lost = {audio: 0, video: 0};
    var lastrecv = {audio: 0, video: 0};
    var lastlost = {audio: 0, video: 0};
    var loss = {audio: 0, video: 0};
    var delta = {audio: 0, video: 0};
    this.statsinterval = window.setInterval(function () {
        if (self && self.peerconnection && self.peerconnection.getStats) {
            self.peerconnection.getStats(function (stats) {
                var results = stats.result();
                // TODO: there are so much statistics you can get from this..
                for (var i = 0; i < results.length; ++i) {
                    if (results[i].type == 'ssrc') {
                        var packetsrecv = results[i].stat('packetsReceived');
                        var packetslost = results[i].stat('packetsLost');
                        if (packetsrecv && packetslost) {
                            packetsrecv = parseInt(packetsrecv, 10);
                            packetslost = parseInt(packetslost, 10);

                            if (results[i].stat('googFrameRateReceived')) {
                                lastlost.video = lost.video;
                                lastrecv.video = recv.video;
                                recv.video = packetsrecv;
                                lost.video = packetslost;
                            } else {
                                lastlost.audio = lost.audio;
                                lastrecv.audio = recv.audio;
                                recv.audio = packetsrecv;
                                lost.audio = packetslost;
                            }
                        }
                    }
                }
                delta.audio = recv.audio - lastrecv.audio;
                delta.video = recv.video - lastrecv.video;
                loss.audio = (delta.audio > 0) ? Math.ceil(100 * (lost.audio - lastlost.audio) / delta.audio) : 0;
                loss.video = (delta.video > 0) ? Math.ceil(100 * (lost.video - lastlost.video) / delta.video) : 0;
                $(document).trigger('packetloss.jingle', [self.sid, loss]);
            });
        }
    }, interval || 3000);
    return this.statsinterval;
};
module.exports = JingleSession;

},{"../simulcast/SimulcastService":36,"./strophe.jingle.adapter":50,"./strophe.jingle.sdp":52,"./strophe.jingle.sessionbase":55}],55:[function(require,module,exports){
var SDP = require("./strophe.jingle.sdp");
var RTCService = require("../RTC/RTCService");
var XMPPService = require("./XMPPService");

/**
 * Base class for ColibriFocus and JingleSession.
 * @param connection Strophe connection object
 * @param sid my session identifier(resource)
 * @constructor
 */
function SessionBase(connection, sid){

    this.connection = connection;
    this.sid = sid;
}


SessionBase.prototype.modifySources = function (successCallback) {
    var self = this;
    if(this.peerconnection)
        this.peerconnection.modifySources(function(){
            self.setLocalDescription(self.sid);
            if(successCallback) {
                successCallback();
            }
        });
};

SessionBase.prototype.setLocalDescription = function (sid) {
    // put our ssrcs into presence so other clients can identify our stream
    var sess = this.connection.jingle.sessions[sid];
    var newssrcs = [];
    var media = require("../simulcast/SimulcastService").parseMedia(
        sess.peerconnection.localDescription);
    media.forEach(function (media) {

        // TODO(gp) maybe exclude FID streams?
        Object.keys(media.sources).forEach(function(ssrc) {
            newssrcs.push({
                'ssrc': ssrc,
                'type': media.type,
                'direction': media.direction
            });
        });
    });
    console.log('new ssrcs', newssrcs);

    // Have to clear presence map to get rid of removed streams
    this.connection.emuc.clearPresenceMedia();

    if (newssrcs.length > 0) {
        for (var i = 1; i <= newssrcs.length; i ++) {
            // Change video type to screen
            if (newssrcs[i-1].type === 'video' && require("../desktopsharing").isUsingScreenStream()) {
                newssrcs[i-1].type = 'screen';
            }
            this.connection.emuc.addMediaToPresence(i,
                newssrcs[i-1].type, newssrcs[i-1].ssrc, newssrcs[i-1].direction);
        }

        this.connection.emuc.sendPresence();
    }
}

SessionBase.prototype.addSource = function (elem, fromJid) {

    var self = this;
    // FIXME: dirty waiting
    if (!this.peerconnection.localDescription)
    {
        console.warn("addSource - localDescription not ready yet")
        setTimeout(function()
            {
                self.addSource(elem, fromJid);
            },
            200
        );
        return;
    }

    this.peerconnection.addSource(elem);

    this.modifySources();
};

SessionBase.prototype.removeSource = function (elem, fromJid) {

    var self = this;
    // FIXME: dirty waiting
    if (!this.peerconnection.localDescription)
    {
        console.warn("removeSource - localDescription not ready yet")
        setTimeout(function()
            {
                self.removeSource(elem, fromJid);
            },
            200
        );
        return;
    }

    this.peerconnection.removeSource(elem);

    this.modifySources();
};
/**
 * Switches video streams.
 * @param new_stream new stream that will be used as video of this session.
 * @param oldStream old video stream of this session.
 * @param success_callback callback executed after successful stream switch.
 */
SessionBase.prototype.switchStreams = function (new_stream, oldStream, success_callback) {

    var self = this;

    // Stop the stream to trigger onended event for old stream
    oldStream.stop();

    // Remember SDP to figure out added/removed SSRCs
    var oldSdp = null;
    if(self.peerconnection) {
        if(self.peerconnection.localDescription) {
            oldSdp = new SDP(self.peerconnection.localDescription.sdp);
        }
        self.peerconnection.removeStream(oldStream);
        self.peerconnection.addStream(new_stream);
    }

    // Conference is not active
    if(!oldSdp || !self.peerconnection) {
        success_callback();
        return;
    }

    self.peerconnection.switchstreams = true;
    self.modifySources(function() {
        console.log('modify sources done');

        var newSdp = new SDP(self.peerconnection.localDescription.sdp);
        console.log("SDPs", oldSdp, newSdp);
        self.notifyMySSRCUpdate(oldSdp, newSdp);

        success_callback();
    });
};

/**
 * Figures out added/removed ssrcs and send update IQs.
 * @param old_sdp SDP object for old description.
 * @param new_sdp SDP object for new description.
 */
SessionBase.prototype.notifyMySSRCUpdate = function (old_sdp, new_sdp) {

    var old_media = old_sdp.getMediaSsrcMap();
    var new_media = new_sdp.getMediaSsrcMap();
    //console.log("old/new medias: ", old_media, new_media);

    var toAdd = old_sdp.getNewMedia(new_sdp);
    var toRemove = new_sdp.getNewMedia(old_sdp);
    //console.log("to add", toAdd);
    //console.log("to remove", toRemove);
    if(Object.keys(toRemove).length > 0){
        this.sendSSRCUpdate(toRemove, null, false);
    }
    if(Object.keys(toAdd).length > 0){
        this.sendSSRCUpdate(toAdd, null, true);
    }
};

/**
 * Empty method that does nothing by default. It should send SSRC update IQs to session participants.
 * @param sdpMediaSsrcs array of
 * @param fromJid
 * @param isAdd
 */
SessionBase.prototype.sendSSRCUpdate = function(sdpMediaSsrcs, fromJid, isAdd) {
    //FIXME: put default implementation here(maybe from JingleSession?)
}

/**
 * Sends SSRC update IQ.
 * @param sdpMediaSsrcs SSRCs map obtained from SDP.getNewMedia. Cntains SSRCs to add/remove.
 * @param sid session identifier that will be put into the IQ.
 * @param initiator initiator identifier.
 * @param toJid destination Jid
 * @param isAdd indicates if this is remove or add operation.
 */
SessionBase.prototype.sendSSRCUpdateIq = function(sdpMediaSsrcs, sid, initiator, toJid, isAdd) {

    var self = this;
    var modify = $iq({to: toJid, type: 'set'})
        .c('jingle', {
            xmlns: 'urn:xmpp:jingle:1',
            action: isAdd ? 'source-add' : 'source-remove',
            initiator: initiator,
            sid: sid
        }
    );
    // FIXME: only announce video ssrcs since we mix audio and dont need
    //      the audio ssrcs therefore
    var modified = false;
    Object.keys(sdpMediaSsrcs).forEach(function(channelNum){
        modified = true;
        var channel = sdpMediaSsrcs[channelNum];
        modify.c('content', {name: channel.mediaType});

        modify.c('description', {xmlns:'urn:xmpp:jingle:apps:rtp:1', media: channel.mediaType});
        // FIXME: not completly sure this operates on blocks and / or handles different ssrcs correctly
        // generate sources from lines
        Object.keys(channel.ssrcs).forEach(function(ssrcNum) {
            var mediaSsrc = channel.ssrcs[ssrcNum];
            modify.c('source', { xmlns: 'urn:xmpp:jingle:apps:rtp:ssma:0' });
            modify.attrs({ssrc: mediaSsrc.ssrc});
            // iterate over ssrc lines
            mediaSsrc.lines.forEach(function (line) {
                var idx = line.indexOf(' ');
                var kv = line.substr(idx + 1);
                modify.c('parameter');
                if (kv.indexOf(':') == -1) {
                    modify.attrs({ name: kv });
                } else {
                    modify.attrs({ name: kv.split(':', 2)[0] });
                    modify.attrs({ value: kv.split(':', 2)[1] });
                }
                modify.up(); // end of parameter
            });
            modify.up(); // end of source
        });

        // generate source groups from lines
        channel.ssrcGroups.forEach(function(ssrcGroup) {
            if (ssrcGroup.ssrcs.length != 0) {

                modify.c('ssrc-group', {
                    semantics: ssrcGroup.semantics,
                    xmlns: 'urn:xmpp:jingle:apps:rtp:ssma:0'
                });

                ssrcGroup.ssrcs.forEach(function (ssrc) {
                    modify.c('source', { ssrc: ssrc })
                        .up(); // end of source
                });
                modify.up(); // end of ssrc-group
            }
        });

        modify.up(); // end of description
        modify.up(); // end of content
    });
    if (modified) {
        self.connection.sendIQ(modify,
            function (res) {
                console.info('got modify result', res);
            },
            function (err) {
                console.error('got modify error', err);
            }
        );
    } else {
        console.log('modification not necessary');
    }
};

// SDP-based mute by going recvonly/sendrecv
// FIXME: should probably black out the screen as well
SessionBase.prototype.toggleVideoMute = function (callback) {
    var stream = RTCService.localAudio;
    if (!stream)
        return;
    var ismuted = stream.mute();
    if(this.peerconnection)
        this.peerconnection.hardMuteVideo(ismuted);
    var self = this;
    this.modifySources(function () {
        self.connection.emuc.addVideoInfoToPresence(ismuted);
        self.connection.emuc.sendPresence();
        return callback(ismuted);
    }());
};

SessionBase.prototype.toggleAudioMute = function (callback) {
    var stream = RTCService.localAudio;
    if (!stream)
        return;
    var audioEnabled = stream.mute();
    // isMuted is the opposite of audioEnabled
    this.connection.emuc.addAudioInfoToPresence(audioEnabled);
    this.connection.emuc.sendPresence();
    callback(audioEnabled);
}


SessionBase.prototype.onIceConnectionStateChange = function (sid, session) {
    switch (session.peerconnection.iceConnectionState) {
        case 'checking':
            session.timeChecking = (new Date()).getTime();
            session.firstconnect = true;
            break;
        case 'completed': // on caller side
        case 'connected':
            if (session.firstconnect) {
                session.firstconnect = false;
                var metadata = {};
                metadata.setupTime = (new Date()).getTime() - session.timeChecking;
                session.peerconnection.getStats(function (res) {
                    res.result().forEach(function (report) {
                        if (report.type == 'googCandidatePair' && report.stat('googActiveConnection') == 'true') {
                            metadata.localCandidateType = report.stat('googLocalCandidateType');
                            metadata.remoteCandidateType = report.stat('googRemoteCandidateType');

                            // log pair as well so we can get nice pie charts
                            metadata.candidatePair = report.stat('googLocalCandidateType') + ';' + report.stat('googRemoteCandidateType');

                            if (report.stat('googRemoteAddress').indexOf('[') === 0) {
                                metadata.ipv6 = true;
                            }
                        }
                    });
                    require("../util/tracking.js")('iceConnected', metadata);
                });
            }
            break;
    }

}

// an attempt to work around https://github.com/jitsi/jitmeet/issues/32
function sendKeyframe(pc) {
    console.log('sendkeyframe', pc.iceConnectionState);
    if (pc.iceConnectionState !== 'connected') return; // safe...
    pc.setRemoteDescription(
        pc.remoteDescription,
        function () {
            pc.createAnswer(
                function (modifiedAnswer) {
                    pc.setLocalDescription(
                        modifiedAnswer,
                        function () {
                            // noop
                        },
                        function (error) {
                            console.log('triggerKeyframe setLocalDescription failed', error);
                            messageHandler.showError();
                        }
                    );
                },
                function (error) {
                    console.log('triggerKeyframe createAnswer failed', error);
                    messageHandler.showError();
                }
            );
        },
        function (error) {
            console.log('triggerKeyframe setRemoteDescription failed', error);
            messageHandler.showError();
        }
    );
}


SessionBase.prototype.waitForPresence = function (data, sid) {
    var sess = this.connection.jingle.sessions[sid];

    var thessrc;
    // look up an associated JID for a stream id
    if (data.stream.id.indexOf('mixedmslabel') === -1) {
        // look only at a=ssrc: and _not_ at a=ssrc-group: lines
        var ssrclines
            = SDPUtil.find_lines(sess.peerconnection.remoteDescription.sdp, 'a=ssrc:');
        ssrclines = ssrclines.filter(function (line) {
            // NOTE(gp) previously we filtered on the mslabel, but that property
            // is not always present.
            // return line.indexOf('mslabel:' + data.stream.label) !== -1;
            return line.indexOf('msid:' + data.stream.id) !== -1;
        });
        if (ssrclines.length) {
            thessrc = ssrclines[0].substring(7).split(' ')[0];

            // We signal our streams (through Jingle to the focus) before we set
            // our presence (through which peers associate remote streams to
            // jids). So, it might arrive that a remote stream is added but
            // ssrc2jid is not yet updated and thus data.peerjid cannot be
            // successfully set. Here we wait for up to a second for the
            // presence to arrive.

            var self = this;
            if (!XMPPService.getJIDFromSSRC(thessrc)) {
                // TODO(gp) limit wait duration to 1 sec.
                setTimeout(function(d, s) {
                    return function() {
                        self.waitForPresence(d, s);
                    }
                }(data, sid), 250);
                return;
            }

            // ok to overwrite the one from focus? might save work in colibri.js
            console.log('associated jid', XMPPService.getJIDFromSSRC(thessrc), data.peerjid);
            if (XMPPService.getJIDFromSSRC(thessrc)) {
                data.peerjid = XMPPService.getJIDFromSSRC(thessrc);
            }
        }
    }

    var isVideo = data.stream.getVideoTracks().length > 0;


    // TODO this must be done with listeners
    RTCService.createRemoteStream(data, sid, thessrc);

    // an attempt to work around https://github.com/jitsi/jitmeet/issues/32
    if (isVideo &&
        data.peerjid && sess.peerjid === data.peerjid &&
        data.stream.getVideoTracks().length === 0 &&
        RTCService.localVideo.getVideoTracks().length > 0) {
        //
        window.setTimeout(function () {
            sendKeyframe(sess.peerconnection);
        }, 3000);
    }
}

module.exports=SessionBase;
},{"../RTC/RTCService":3,"../desktopsharing":29,"../simulcast/SimulcastService":36,"../util/tracking.js":42,"./XMPPService":44,"./strophe.jingle.sdp":52}],56:[function(require,module,exports){
module.exports = function() {
    /**
     * Strophe logger implementation. Logs from level WARN and above.
     */
    Strophe.log = function (level, msg) {
        switch (level) {
            case Strophe.LogLevel.WARN:
                console.warn("Strophe: " + msg);
                break;
            case Strophe.LogLevel.ERROR:
            case Strophe.LogLevel.FATAL:
                console.error("Strophe: " + msg);
                break;
        }
    };

    Strophe.getStatusString = function (status) {
        switch (status) {
            case Strophe.Status.ERROR:
                return "ERROR";
            case Strophe.Status.CONNECTING:
                return "CONNECTING";
            case Strophe.Status.CONNFAIL:
                return "CONNFAIL";
            case Strophe.Status.AUTHENTICATING:
                return "AUTHENTICATING";
            case Strophe.Status.AUTHFAIL:
                return "AUTHFAIL";
            case Strophe.Status.CONNECTED:
                return "CONNECTED";
            case Strophe.Status.DISCONNECTED:
                return "DISCONNECTED";
            case Strophe.Status.DISCONNECTING:
                return "DISCONNECTING";
            case Strophe.Status.ATTACHED:
                return "ATTACHED";
            default:
                return "unknown";
        }
    };
}
},{}],57:[function(require,module,exports){
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

},{}]},{},[27]);
