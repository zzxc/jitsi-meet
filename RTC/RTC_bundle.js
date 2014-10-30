!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.RTCActivator=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var RTC = require("./RTC.js");
var RTCBrowserType = require("../service/RTC/RTCBrowserType.js");
var StreamEventTypes = require("../service/RTC/StreamEventTypes.js");

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
        this.VIDEO_TYPE = "Video";
        this.AUDIO_TYPE = "Audio";
        this.stream = data.stream;
        this.peerjid = data.peerjid;
        this.ssrc = ssrc;
        this.session = connection.jingle.sessions[sid];
        this.type = (this.stream.getVideoTracks().length > 0)
                    ? this.VIDEO_TYPE : this.AUDIO_TYPE;
        eventEmmiter.emit(StreamEventTypes.EVENT_TYPE_REMOTE_CREATED, this);
    }

    if(RTC.browser == RTCBrowserType.RTC_BROWSER_FIREFOX)
    {
        if (!MediaStream.prototype.getVideoTracks)
            MediaStream.prototype.getVideoTracks = function () { return []; };
        if (!MediaStream.prototype.getAudioTracks)
            MediaStream.prototype.getAudioTracks = function () { return []; };
    }

    return MediaStreamProto;
})();




module.exports = MediaStream;
},{"../service/RTC/RTCBrowserType.js":6,"../service/RTC/StreamEventTypes.js":7,"./RTC.js":2}],2:[function(require,module,exports){
var RTCActivator = require("./RTCActivator");

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
            {googNoiseReduction: true}
        );
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
            var simulcast = new Simulcast();
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
},{"../service/RTC/RTCBrowserType.js":6,"./RTCActivator":3}],3:[function(require,module,exports){
var RTCService = require("./RTCService.js");
var XMPPEvents = require("../service/xmpp/XMPPEvents");
var DataChannels = require("./data_channels");

var RTCActivator = (function()
{
    var rtcService = null;

    function RTCActivatorProto()
    {
        
    }

    RTCActivatorProto.stop=  function () {
        rtcService.dispose();
        rtcService = null;

    }

    function onConferenceCreated(event) {
        DataChannels.bindDataChannelListener(event.peerconnection);
    }

    RTCActivatorProto.start= function () {
        rtcService = new RTCService();
        XMPPActivator.addListener(XMPPEvents.CONFERENCE_CERATED, onConferenceCreated);
        XMPPActivator.addListener(XMPPEvents.CALL_INCOMING, onConferenceCreated);
    }

    RTCActivatorProto.getRTCService= function () {
        return rtcService;
    }

    RTCActivatorProto.addStreamListener= function(listener, eventType)
    {
        return RTCService.addStreamListener(listener, eventType);
    }

    RTCActivatorProto.removeStreamListener= function(listener, eventType)
    {
        return RTCService.removeStreamListener(listener, eventType);
    }
    
    return RTCActivatorProto;
})();

module.exports = RTCActivator;

},{"../service/xmpp/XMPPEvents":8,"./RTCService.js":4,"./data_channels":5}],4:[function(require,module,exports){
var EventEmitter = require("events");
var RTC = require("./RTC.js");
var StreamEventTypes = require("../service/RTC/StreamEventTypes.js");
var MediaStream = require("./MediaStream.js");


var RTCService = function()
{
    var eventEmitter = new EventEmitter();

    function Stream(stream, type)
    {
        this.stream = stream;
        this.eventEmitter = eventEmitter;
        this.type = type;
        eventEmitter.emit(StreamEventTypes.EVENT_TYPE_LOCAL_CREATED, this);
        var self = this;
        this.stream.onended = function()
        {
            self.streamEnded();
        }
    }

    Stream.prototype.streamEnded = function () {
        eventEmitter.emit(StreamEventTypes.EVENT_TYPE_LOCAL_ENDED, this);
    }

    Stream.prototype.getOriginalStream = function()
    {
        return this.stream;
    }

    Stream.prototype.isAudioStream = function () {
        return (this.stream.getAudioTracks() && this.stream.getAudioTracks().length > 0);
    }

    function RTCServiceProto() {
        this.rtc = new RTC(this);
        this.rtc.obtainAudioAndVideoPermissions();
        this.localStreams = new Array();
        this.remoteStreams = new Array();
    }


    RTCServiceProto.addStreamListener = function (listener, eventType) {
        eventEmitter.on(eventType, listener);
    };

    RTCServiceProto.removeStreamListener = function (listener, eventType) {
        if(!(eventType instanceof SteamEventType))
            throw "Illegal argument";

        eventEmitter.removeListener(eventType, listener);
    };

    RTCServiceProto.prototype.createLocalStream = function (stream, type) {
        var localStream =  new Stream(stream, type);
        this.localStreams.push(localStream);
        return localStream;
    };
    
    RTCServiceProto.prototype.createRemoteStream = function (data, sid, thessrc) {
        var remoteStream = new MediaStream(data, sid, thessrc, eventEmitter);
        this.remoteStreams.push(remoteStream);
        return remoteStream;
    }

    RTCServiceProto.prototype.getBrowserType = function () {
        return this.rtc.browser;
    };

    RTCServiceProto.prototype.getPCConstraints = function () {
        return this.rtc.pc_constraints;
    };

    RTCServiceProto.prototype.getUserMediaWithConstraints =
        function(um, success_callback, failure_callback, resolution, bandwidth, fps, desktopStream)
        {
            return this.rtc.getUserMediaWithConstraints(um, success_callback, failure_callback, resolution, bandwidth, fps, desktopStream);
        };

    RTCServiceProto.prototype.dispose = function() {
        eventEmitter.removeAllListeners("statistics.audioLevel");

        if (this.rtc) {
            this.rtc = null;
        }
    }

    return RTCServiceProto;
}();

module.exports = RTCService;

},{"../service/RTC/StreamEventTypes.js":7,"./MediaStream.js":1,"./RTC.js":2,"events":9}],5:[function(require,module,exports){
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
    onDataChannel: function (event) {
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
            var largeVideoSrc = $('#largeVideo').attr('src');
            var userJid = getJidFromVideoSrc(largeVideoSrc);
            // we want the notification to trigger even if userJid is undefined,
            // or null.
            onSelectedEndpointChanged(userJid);
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
        if (!config.openSctp)
            return;
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
};

function onSelectedEndpointChanged(userJid)
{
    console.log('selected endpoint changed: ', userJid);
    if (_dataChannels && _dataChannels.length != 0 && _dataChannels[0].readyState == "open") {
        _dataChannels[0].send(JSON.stringify({
            'colibriClass': 'SelectedEndpointChangedEvent',
            'selectedEndpoint': (!userJid || userJid == null)
                ? null : Strophe.getResourceFromJid(userJid)
        }));
    }
}

$(document).bind("selectedendpointchanged", function(event, userJid) {
    onSelectedEndpointChanged(userJid);
});

module.exports = DataChannels;


},{}],6:[function(require,module,exports){
var RTCBrowserType = {
    RTC_BROWSER_CHROME: "rtc_browser.chrome",

    RTC_BROWSER_FIREFOX: "rtc_browser.firefox"
};

module.exports = RTCBrowserType;
},{}],7:[function(require,module,exports){
var StreamEventTypes = {
    EVENT_TYPE_LOCAL_CREATED: "stream.local_created",

    EVENT_TYPE_LOCAL_ENDED: "stream.local_ended",

    EVENT_TYPE_REMOTE_CREATED: "stream.remote_created",

    EVENT_TYPE_REMOTE_ENDED: "stream.remote_ended"
};

module.exports = StreamEventTypes;
},{}],8:[function(require,module,exports){
/**
 * Created by hristo on 10/29/14.
 */
var XMPPEvents = {
    CONFERENCE_CERATED: "xmpp.conferenceCreated.jingle",
    CALL_TERMINATED: "xmpp.callterminated.jingle",
    CALL_INCOMING: "xmpp.callincoming.jingle",
    FATAL_JINGLE_ERROR: "xmpp.fatalError.jingle"
};
module.exports = XMPPEvents;
},{}],9:[function(require,module,exports){
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

},{}]},{},[3])(3)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9SVEMvTWVkaWFTdHJlYW0uanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9SVEMvUlRDLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvUlRDL1JUQ0FjdGl2YXRvci5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1JUQy9SVENTZXJ2aWNlLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvUlRDL2RhdGFfY2hhbm5lbHMuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9zZXJ2aWNlL1JUQy9SVENCcm93c2VyVHlwZS5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L3NlcnZpY2UvUlRDL1N0cmVhbUV2ZW50VHlwZXMuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9zZXJ2aWNlL3htcHAvWE1QUEV2ZW50cy5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIFJUQyA9IHJlcXVpcmUoXCIuL1JUQy5qc1wiKTtcbnZhciBSVENCcm93c2VyVHlwZSA9IHJlcXVpcmUoXCIuLi9zZXJ2aWNlL1JUQy9SVENCcm93c2VyVHlwZS5qc1wiKTtcbnZhciBTdHJlYW1FdmVudFR5cGVzID0gcmVxdWlyZShcIi4uL3NlcnZpY2UvUlRDL1N0cmVhbUV2ZW50VHlwZXMuanNcIik7XG5cbi8qKlxuICogUHJvdmlkZXMgYSB3cmFwcGVyIGNsYXNzIGZvciB0aGUgTWVkaWFTdHJlYW0uXG4gKiBcbiAqIFRPRE8gOiBBZGQgaGVyZSB0aGUgc3JjIGZyb20gdGhlIHZpZGVvIGVsZW1lbnQgYW5kIG90aGVyIHJlbGF0ZWQgcHJvcGVydGllc1xuICogYW5kIGdldCByaWQgb2Ygc29tZSBvZiB0aGUgbWFwcGluZ3MgdGhhdCB3ZSB1c2UgdGhyb3VnaG91dCB0aGUgVUkuXG4gKi9cbnZhciBNZWRpYVN0cmVhbSA9IChmdW5jdGlvbigpIHtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgTWVkaWFTdHJlYW0gb2JqZWN0IGZvciB0aGUgZ2l2ZW4gZGF0YSwgc2Vzc2lvbiBpZCBhbmQgc3NyYy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBkYXRhIHRoZSBkYXRhIG9iamVjdCBmcm9tIHdoaWNoIHdlIG9idGFpbiB0aGUgc3RyZWFtLFxuICAgICAqIHRoZSBwZWVyamlkLCBldGMuXG4gICAgICogQHBhcmFtIHNpZCB0aGUgc2Vzc2lvbiBpZFxuICAgICAqIEBwYXJhbSBzc3JjIHRoZSBzc3JjIGNvcnJlc3BvbmRpbmcgdG8gdGhpcyBNZWRpYVN0cmVhbVxuICAgICAqXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gTWVkaWFTdHJlYW1Qcm90byhkYXRhLCBzaWQsIHNzcmMsIGV2ZW50RW1taXRlcikge1xuICAgICAgICB0aGlzLnNpZCA9IHNpZDtcbiAgICAgICAgdGhpcy5WSURFT19UWVBFID0gXCJWaWRlb1wiO1xuICAgICAgICB0aGlzLkFVRElPX1RZUEUgPSBcIkF1ZGlvXCI7XG4gICAgICAgIHRoaXMuc3RyZWFtID0gZGF0YS5zdHJlYW07XG4gICAgICAgIHRoaXMucGVlcmppZCA9IGRhdGEucGVlcmppZDtcbiAgICAgICAgdGhpcy5zc3JjID0gc3NyYztcbiAgICAgICAgdGhpcy5zZXNzaW9uID0gY29ubmVjdGlvbi5qaW5nbGUuc2Vzc2lvbnNbc2lkXTtcbiAgICAgICAgdGhpcy50eXBlID0gKHRoaXMuc3RyZWFtLmdldFZpZGVvVHJhY2tzKCkubGVuZ3RoID4gMClcbiAgICAgICAgICAgICAgICAgICAgPyB0aGlzLlZJREVPX1RZUEUgOiB0aGlzLkFVRElPX1RZUEU7XG4gICAgICAgIGV2ZW50RW1taXRlci5lbWl0KFN0cmVhbUV2ZW50VHlwZXMuRVZFTlRfVFlQRV9SRU1PVEVfQ1JFQVRFRCwgdGhpcyk7XG4gICAgfVxuXG4gICAgaWYoUlRDLmJyb3dzZXIgPT0gUlRDQnJvd3NlclR5cGUuUlRDX0JST1dTRVJfRklSRUZPWClcbiAgICB7XG4gICAgICAgIGlmICghTWVkaWFTdHJlYW0ucHJvdG90eXBlLmdldFZpZGVvVHJhY2tzKVxuICAgICAgICAgICAgTWVkaWFTdHJlYW0ucHJvdG90eXBlLmdldFZpZGVvVHJhY2tzID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gW107IH07XG4gICAgICAgIGlmICghTWVkaWFTdHJlYW0ucHJvdG90eXBlLmdldEF1ZGlvVHJhY2tzKVxuICAgICAgICAgICAgTWVkaWFTdHJlYW0ucHJvdG90eXBlLmdldEF1ZGlvVHJhY2tzID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gW107IH07XG4gICAgfVxuXG4gICAgcmV0dXJuIE1lZGlhU3RyZWFtUHJvdG87XG59KSgpO1xuXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IE1lZGlhU3RyZWFtOyIsInZhciBSVENBY3RpdmF0b3IgPSByZXF1aXJlKFwiLi9SVENBY3RpdmF0b3JcIik7XG5cbnZhciBSVENCcm93c2VyVHlwZXMgPSByZXF1aXJlKFwiLi4vc2VydmljZS9SVEMvUlRDQnJvd3NlclR5cGUuanNcIik7XG5cbmZ1bmN0aW9uIFJUQyhSVENTZXJ2aWNlKVxue1xuICAgIHRoaXMuc2VydmljZSA9IFJUQ1NlcnZpY2U7XG4gICAgaWYgKG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1RoaXMgYXBwZWFycyB0byBiZSBGaXJlZm94Jyk7XG4gICAgICAgIHZhciB2ZXJzaW9uID0gcGFyc2VJbnQobmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvRmlyZWZveFxcLyhbMC05XSspXFwuLylbMV0sIDEwKTtcbiAgICAgICAgaWYgKHZlcnNpb24gPj0gMjIpIHtcbiAgICAgICAgICAgIHRoaXMucGVlcmNvbm5lY3Rpb24gPSBtb3pSVENQZWVyQ29ubmVjdGlvbjtcbiAgICAgICAgICAgIHRoaXMuYnJvd3NlciA9IFJUQ0Jyb3dzZXJUeXBlcy5SVENfQlJPV1NFUl9GSVJFRk9YO1xuICAgICAgICAgICAgdGhpcy5nZXRVc2VyTWVkaWEgPSBuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhLmJpbmQobmF2aWdhdG9yKTtcbiAgICAgICAgICAgIHRoaXMucGNfY29uc3RyYWludHMgPSB7fTtcbiAgICAgICAgICAgIFJUQ1Nlc3Npb25EZXNjcmlwdGlvbiA9IG1velJUQ1Nlc3Npb25EZXNjcmlwdGlvbjtcbiAgICAgICAgICAgIFJUQ0ljZUNhbmRpZGF0ZSA9IG1velJUQ0ljZUNhbmRpZGF0ZTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAobmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYSkge1xuICAgICAgICBjb25zb2xlLmxvZygnVGhpcyBhcHBlYXJzIHRvIGJlIENocm9tZScpO1xuICAgICAgICB0aGlzLnBlZXJjb25uZWN0aW9uID0gd2Via2l0UlRDUGVlckNvbm5lY3Rpb247XG4gICAgICAgIHRoaXMuYnJvd3NlciA9IFJUQ0Jyb3dzZXJUeXBlcy5SVENfQlJPV1NFUl9DSFJPTUU7XG4gICAgICAgIHRoaXMuZ2V0VXNlck1lZGlhID0gbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYS5iaW5kKG5hdmlnYXRvcik7XG4gICAgICAgIC8vIERUTFMgc2hvdWxkIG5vdyBiZSBlbmFibGVkIGJ5IGRlZmF1bHQgYnV0Li5cbiAgICAgICAgdGhpcy5wY19jb25zdHJhaW50cyA9IHsnb3B0aW9uYWwnOiBbeydEdGxzU3J0cEtleUFncmVlbWVudCc6ICd0cnVlJ31dfTtcbiAgICAgICAgaWYgKG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignQW5kcm9pZCcpICE9IC0xKSB7XG4gICAgICAgICAgICB0aGlzLnBjX2NvbnN0cmFpbnRzID0ge307IC8vIGRpc2FibGUgRFRMUyBvbiBBbmRyb2lkXG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF3ZWJraXRNZWRpYVN0cmVhbS5wcm90b3R5cGUuZ2V0VmlkZW9UcmFja3MpIHtcbiAgICAgICAgICAgIHdlYmtpdE1lZGlhU3RyZWFtLnByb3RvdHlwZS5nZXRWaWRlb1RyYWNrcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy52aWRlb1RyYWNrcztcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF3ZWJraXRNZWRpYVN0cmVhbS5wcm90b3R5cGUuZ2V0QXVkaW9UcmFja3MpIHtcbiAgICAgICAgICAgIHdlYmtpdE1lZGlhU3RyZWFtLnByb3RvdHlwZS5nZXRBdWRpb1RyYWNrcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5hdWRpb1RyYWNrcztcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZVxuICAgIHtcbiAgICAgICAgdHJ5IHsgY29uc29sZS5sb2coJ0Jyb3dzZXIgZG9lcyBub3QgYXBwZWFyIHRvIGJlIFdlYlJUQy1jYXBhYmxlJyk7IH0gY2F0Y2ggKGUpIHsgfVxuXG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJ3dlYnJ0Y3JlcXVpcmVkLmh0bWwnO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYnJvd3NlciAhPT0gUlRDQnJvd3NlclR5cGVzLlJUQ19CUk9XU0VSX0NIUk9NRSkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9ICdjaHJvbWVvbmx5Lmh0bWwnO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG59XG5cblJUQy5wcm90b3R5cGUuZ2V0VXNlck1lZGlhV2l0aENvbnN0cmFpbnRzXG4gICAgPSBmdW5jdGlvbih1bSwgc3VjY2Vzc19jYWxsYmFjaywgZmFpbHVyZV9jYWxsYmFjaywgcmVzb2x1dGlvbiwgYmFuZHdpZHRoLCBmcHMsIGRlc2t0b3BTdHJlYW0pIHtcbiAgICB2YXIgY29uc3RyYWludHMgPSB7YXVkaW86IGZhbHNlLCB2aWRlbzogZmFsc2V9O1xuXG4gICAgaWYgKHVtLmluZGV4T2YoJ3ZpZGVvJykgPj0gMCkge1xuICAgICAgICBjb25zdHJhaW50cy52aWRlbyA9IHsgbWFuZGF0b3J5OiB7fSwgb3B0aW9uYWw6IFtdIH07Ly8gc2FtZSBiZWhhdmlvdXIgYXMgdHJ1ZVxuICAgIH1cbiAgICBpZiAodW0uaW5kZXhPZignYXVkaW8nKSA+PSAwKSB7XG4gICAgICAgIGNvbnN0cmFpbnRzLmF1ZGlvID0geyBtYW5kYXRvcnk6IHt9LCBvcHRpb25hbDogW119Oy8vIHNhbWUgYmVoYXZpb3VyIGFzIHRydWVcbiAgICB9XG4gICAgaWYgKHVtLmluZGV4T2YoJ3NjcmVlbicpID49IDApIHtcbiAgICAgICAgY29uc3RyYWludHMudmlkZW8gPSB7XG4gICAgICAgICAgICBtYW5kYXRvcnk6IHtcbiAgICAgICAgICAgICAgICBjaHJvbWVNZWRpYVNvdXJjZTogXCJzY3JlZW5cIixcbiAgICAgICAgICAgICAgICBnb29nTGVha3lCdWNrZXQ6IHRydWUsXG4gICAgICAgICAgICAgICAgbWF4V2lkdGg6IHdpbmRvdy5zY3JlZW4ud2lkdGgsXG4gICAgICAgICAgICAgICAgbWF4SGVpZ2h0OiB3aW5kb3cuc2NyZWVuLmhlaWdodCxcbiAgICAgICAgICAgICAgICBtYXhGcmFtZVJhdGU6IDNcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvcHRpb25hbDogW11cbiAgICAgICAgfTtcbiAgICB9XG4gICAgaWYgKHVtLmluZGV4T2YoJ2Rlc2t0b3AnKSA+PSAwKSB7XG4gICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvID0ge1xuICAgICAgICAgICAgbWFuZGF0b3J5OiB7XG4gICAgICAgICAgICAgICAgY2hyb21lTWVkaWFTb3VyY2U6IFwiZGVza3RvcFwiLFxuICAgICAgICAgICAgICAgIGNocm9tZU1lZGlhU291cmNlSWQ6IGRlc2t0b3BTdHJlYW0sXG4gICAgICAgICAgICAgICAgZ29vZ0xlYWt5QnVja2V0OiB0cnVlLFxuICAgICAgICAgICAgICAgIG1heFdpZHRoOiB3aW5kb3cuc2NyZWVuLndpZHRoLFxuICAgICAgICAgICAgICAgIG1heEhlaWdodDogd2luZG93LnNjcmVlbi5oZWlnaHQsXG4gICAgICAgICAgICAgICAgbWF4RnJhbWVSYXRlOiAzXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb3B0aW9uYWw6IFtdXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY29uc3RyYWludHMuYXVkaW8pIHtcbiAgICAgICAgLy8gaWYgaXQgaXMgZ29vZCBlbm91Z2ggZm9yIGhhbmdvdXRzLi4uXG4gICAgICAgIGNvbnN0cmFpbnRzLmF1ZGlvLm9wdGlvbmFsLnB1c2goXG4gICAgICAgICAgICB7Z29vZ0VjaG9DYW5jZWxsYXRpb246IHRydWV9LFxuICAgICAgICAgICAge2dvb2dBdXRvR2FpbkNvbnRyb2w6IHRydWV9LFxuICAgICAgICAgICAge2dvb2dOb2lzZVN1cHJlc3Npb246IHRydWV9LFxuICAgICAgICAgICAge2dvb2dIaWdocGFzc0ZpbHRlcjogdHJ1ZX0sXG4gICAgICAgICAgICB7Z29vZ05vaXNlc3VwcHJlc3Npb24yOiB0cnVlfSxcbiAgICAgICAgICAgIHtnb29nRWNob0NhbmNlbGxhdGlvbjI6IHRydWV9LFxuICAgICAgICAgICAge2dvb2dBdXRvR2FpbkNvbnRyb2wyOiB0cnVlfVxuICAgICAgICApO1xuICAgIH1cbiAgICBpZiAoY29uc3RyYWludHMudmlkZW8pIHtcbiAgICAgICAgY29uc3RyYWludHMudmlkZW8ub3B0aW9uYWwucHVzaChcbiAgICAgICAgICAgIHtnb29nTm9pc2VSZWR1Y3Rpb246IHRydWV9XG4gICAgICAgICk7XG4gICAgICAgIGlmICh1bS5pbmRleE9mKCd2aWRlbycpID49IDApIHtcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm9wdGlvbmFsLnB1c2goXG4gICAgICAgICAgICAgICAge2dvb2dMZWFreUJ1Y2tldDogdHJ1ZX1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiB3ZSBhcmUgcnVubmluZyBvbiBBbmRyb2lkIGRldmljZVxuICAgIHZhciBpc0FuZHJvaWQgPSBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJ0FuZHJvaWQnKSAhPSAtMTtcblxuICAgIGlmIChyZXNvbHV0aW9uICYmICFjb25zdHJhaW50cy52aWRlbyB8fCBpc0FuZHJvaWQpIHtcbiAgICAgICAgY29uc3RyYWludHMudmlkZW8gPSB7IG1hbmRhdG9yeToge30sIG9wdGlvbmFsOiBbXSB9Oy8vIHNhbWUgYmVoYXZpb3VyIGFzIHRydWVcbiAgICB9XG4gICAgLy8gc2VlIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD0xNDM2MzEjYzkgZm9yIGxpc3Qgb2Ygc3VwcG9ydGVkIHJlc29sdXRpb25zXG4gICAgc3dpdGNoIChyZXNvbHV0aW9uKSB7XG4gICAgICAgIC8vIDE2OjkgZmlyc3RcbiAgICAgICAgY2FzZSAnMTA4MCc6XG4gICAgICAgIGNhc2UgJ2Z1bGxoZCc6XG4gICAgICAgICAgICBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWluV2lkdGggPSAxOTIwO1xuICAgICAgICAgICAgY29uc3RyYWludHMudmlkZW8ubWFuZGF0b3J5Lm1pbkhlaWdodCA9IDEwODA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnNzIwJzpcbiAgICAgICAgY2FzZSAnaGQnOlxuICAgICAgICAgICAgY29uc3RyYWludHMudmlkZW8ubWFuZGF0b3J5Lm1pbldpZHRoID0gMTI4MDtcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5taW5IZWlnaHQgPSA3MjA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnMzYwJzpcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5taW5XaWR0aCA9IDY0MDtcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5taW5IZWlnaHQgPSAzNjA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnMTgwJzpcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5taW5XaWR0aCA9IDMyMDtcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5taW5IZWlnaHQgPSAxODA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gNDozXG4gICAgICAgIGNhc2UgJzk2MCc6XG4gICAgICAgICAgICBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWluV2lkdGggPSA5NjA7XG4gICAgICAgICAgICBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWluSGVpZ2h0ID0gNzIwO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJzY0MCc6XG4gICAgICAgIGNhc2UgJ3ZnYSc6XG4gICAgICAgICAgICBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWluV2lkdGggPSA2NDA7XG4gICAgICAgICAgICBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWluSGVpZ2h0ID0gNDgwO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJzMyMCc6XG4gICAgICAgICAgICBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWluV2lkdGggPSAzMjA7XG4gICAgICAgICAgICBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWluSGVpZ2h0ID0gMjQwO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBpZiAoaXNBbmRyb2lkKSB7XG4gICAgICAgICAgICAgICAgY29uc3RyYWludHMudmlkZW8ubWFuZGF0b3J5Lm1pbldpZHRoID0gMzIwO1xuICAgICAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5taW5IZWlnaHQgPSAyNDA7XG4gICAgICAgICAgICAgICAgY29uc3RyYWludHMudmlkZW8ubWFuZGF0b3J5Lm1heEZyYW1lUmF0ZSA9IDE1O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGlmIChjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWluV2lkdGgpXG4gICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5tYXhXaWR0aCA9IGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5taW5XaWR0aDtcbiAgICBpZiAoY29uc3RyYWludHMudmlkZW8ubWFuZGF0b3J5Lm1pbkhlaWdodClcbiAgICAgICAgY29uc3RyYWludHMudmlkZW8ubWFuZGF0b3J5Lm1heEhlaWdodCA9IGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5taW5IZWlnaHQ7XG5cbiAgICBpZiAoYmFuZHdpZHRoKSB7IC8vIGRvZXNuJ3Qgd29yayBjdXJyZW50bHksIHNlZSB3ZWJydGMgaXNzdWUgMTg0NlxuICAgICAgICBpZiAoIWNvbnN0cmFpbnRzLnZpZGVvKSBjb25zdHJhaW50cy52aWRlbyA9IHttYW5kYXRvcnk6IHt9LCBvcHRpb25hbDogW119Oy8vc2FtZSBiZWhhdmlvdXIgYXMgdHJ1ZVxuICAgICAgICBjb25zdHJhaW50cy52aWRlby5vcHRpb25hbC5wdXNoKHtiYW5kd2lkdGg6IGJhbmR3aWR0aH0pO1xuICAgIH1cbiAgICBpZiAoZnBzKSB7IC8vIGZvciBzb21lIGNhbWVyYXMgaXQgbWlnaHQgYmUgbmVjZXNzYXJ5IHRvIHJlcXVlc3QgMzBmcHNcbiAgICAgICAgLy8gc28gdGhleSBjaG9vc2UgMzBmcHMgbWpwZyBvdmVyIDEwZnBzIHl1eTJcbiAgICAgICAgaWYgKCFjb25zdHJhaW50cy52aWRlbykgY29uc3RyYWludHMudmlkZW8gPSB7bWFuZGF0b3J5OiB7fSwgb3B0aW9uYWw6IFtdfTsvLyBzYW1lIGJlaGF2aW91ciBhcyB0cnVlO1xuICAgICAgICBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWluRnJhbWVSYXRlID0gZnBzO1xuICAgIH1cblxuICAgIHZhciBpc0ZGID0gbmF2aWdhdG9yLnVzZXJBZ2VudC50b0xvd2VyQ2FzZSgpLmluZGV4T2YoJ2ZpcmVmb3gnKSA+IC0xO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKGNvbmZpZy5lbmFibGVTaW11bGNhc3RcbiAgICAgICAgICAgICYmIGNvbnN0cmFpbnRzLnZpZGVvXG4gICAgICAgICAgICAmJiBjb25zdHJhaW50cy52aWRlby5jaHJvbWVNZWRpYVNvdXJjZSAhPT0gJ3NjcmVlbidcbiAgICAgICAgICAgICYmIGNvbnN0cmFpbnRzLnZpZGVvLmNocm9tZU1lZGlhU291cmNlICE9PSAnZGVza3RvcCdcbiAgICAgICAgICAgICYmICFpc0FuZHJvaWRcblxuICAgICAgICAgICAgLy8gV2UgY3VycmVudGx5IGRvIG5vdCBzdXBwb3J0IEZGLCBhcyBpdCBkb2Vzbid0IGhhdmUgbXVsdGlzdHJlYW0gc3VwcG9ydC5cbiAgICAgICAgICAgICYmICFpc0ZGKSB7XG4gICAgICAgICAgICB2YXIgc2ltdWxjYXN0ID0gbmV3IFNpbXVsY2FzdCgpO1xuICAgICAgICAgICAgc2ltdWxjYXN0LmdldFVzZXJNZWRpYShjb25zdHJhaW50cywgZnVuY3Rpb24gKHN0cmVhbSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnb25Vc2VyTWVkaWFTdWNjZXNzJyk7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NfY2FsbGJhY2soc3RyZWFtKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0ZhaWxlZCB0byBnZXQgYWNjZXNzIHRvIGxvY2FsIG1lZGlhLiBFcnJvciAnLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmYWlsdXJlX2NhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmYWlsdXJlX2NhbGxiYWNrKGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICB0aGlzLmdldFVzZXJNZWRpYShjb25zdHJhaW50cyxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoc3RyZWFtKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvblVzZXJNZWRpYVN1Y2Nlc3MnKTtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc19jYWxsYmFjayhzdHJlYW0pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignRmFpbGVkIHRvIGdldCBhY2Nlc3MgdG8gbG9jYWwgbWVkaWEuIEVycm9yICcsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZhaWx1cmVfY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZhaWx1cmVfY2FsbGJhY2soZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignR1VNIGZhaWxlZDogJywgZSk7XG4gICAgICAgIGlmIChmYWlsdXJlX2NhbGxiYWNrKSB7XG4gICAgICAgICAgICBmYWlsdXJlX2NhbGxiYWNrKGUpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5SVEMucHJvdG90eXBlLm9idGFpbkF1ZGlvQW5kVmlkZW9QZXJtaXNzaW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5nZXRVc2VyTWVkaWFXaXRoQ29uc3RyYWludHMoXG4gICAgICAgIFsnYXVkaW8nLCAndmlkZW8nXSxcbiAgICAgICAgZnVuY3Rpb24gKGF2U3RyZWFtKSB7XG4gICAgICAgICAgICBzZWxmLmhhbmRsZUxvY2FsU3RyZWFtKGF2U3RyZWFtKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdmYWlsZWQgdG8gb2J0YWluIGF1ZGlvL3ZpZGVvIHN0cmVhbSAtIHN0b3AnLCBlcnJvcik7XG4gICAgICAgIH0sXG4gICAgICAgICAgICBjb25maWcucmVzb2x1dGlvbiB8fCAnMzYwJyk7XG5cbn1cblxuUlRDLnByb3RvdHlwZS5oYW5kbGVMb2NhbFN0cmVhbSA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuXG4gICAgdmFyIGF1ZGlvU3RyZWFtID0gbmV3IHdlYmtpdE1lZGlhU3RyZWFtKHN0cmVhbSk7XG4gICAgdmFyIHZpZGVvU3RyZWFtID0gbmV3IHdlYmtpdE1lZGlhU3RyZWFtKHN0cmVhbSk7XG4gICAgdmFyIHZpZGVvVHJhY2tzID0gc3RyZWFtLmdldFZpZGVvVHJhY2tzKCk7XG4gICAgdmFyIGF1ZGlvVHJhY2tzID0gc3RyZWFtLmdldEF1ZGlvVHJhY2tzKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2aWRlb1RyYWNrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBhdWRpb1N0cmVhbS5yZW1vdmVUcmFjayh2aWRlb1RyYWNrc1tpXSk7XG4gICAgfVxuICAgIHRoaXMuc2VydmljZS5jcmVhdGVMb2NhbFN0cmVhbShhdWRpb1N0cmVhbSwgXCJhdWRpb1wiKTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgYXVkaW9UcmFja3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmlkZW9TdHJlYW0ucmVtb3ZlVHJhY2soYXVkaW9UcmFja3NbaV0pO1xuICAgIH1cbiAgICB0aGlzLnNlcnZpY2UuY3JlYXRlTG9jYWxTdHJlYW0odmlkZW9TdHJlYW0sIFwidmlkZW9cIik7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUlRDOyIsInZhciBSVENTZXJ2aWNlID0gcmVxdWlyZShcIi4vUlRDU2VydmljZS5qc1wiKTtcbnZhciBYTVBQRXZlbnRzID0gcmVxdWlyZShcIi4uL3NlcnZpY2UveG1wcC9YTVBQRXZlbnRzXCIpO1xudmFyIERhdGFDaGFubmVscyA9IHJlcXVpcmUoXCIuL2RhdGFfY2hhbm5lbHNcIik7XG5cbnZhciBSVENBY3RpdmF0b3IgPSAoZnVuY3Rpb24oKVxue1xuICAgIHZhciBydGNTZXJ2aWNlID0gbnVsbDtcblxuICAgIGZ1bmN0aW9uIFJUQ0FjdGl2YXRvclByb3RvKClcbiAgICB7XG4gICAgICAgIFxuICAgIH1cblxuICAgIFJUQ0FjdGl2YXRvclByb3RvLnN0b3A9ICBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJ0Y1NlcnZpY2UuZGlzcG9zZSgpO1xuICAgICAgICBydGNTZXJ2aWNlID0gbnVsbDtcblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uQ29uZmVyZW5jZUNyZWF0ZWQoZXZlbnQpIHtcbiAgICAgICAgRGF0YUNoYW5uZWxzLmJpbmREYXRhQ2hhbm5lbExpc3RlbmVyKGV2ZW50LnBlZXJjb25uZWN0aW9uKTtcbiAgICB9XG5cbiAgICBSVENBY3RpdmF0b3JQcm90by5zdGFydD0gZnVuY3Rpb24gKCkge1xuICAgICAgICBydGNTZXJ2aWNlID0gbmV3IFJUQ1NlcnZpY2UoKTtcbiAgICAgICAgWE1QUEFjdGl2YXRvci5hZGRMaXN0ZW5lcihYTVBQRXZlbnRzLkNPTkZFUkVOQ0VfQ0VSQVRFRCwgb25Db25mZXJlbmNlQ3JlYXRlZCk7XG4gICAgICAgIFhNUFBBY3RpdmF0b3IuYWRkTGlzdGVuZXIoWE1QUEV2ZW50cy5DQUxMX0lOQ09NSU5HLCBvbkNvbmZlcmVuY2VDcmVhdGVkKTtcbiAgICB9XG5cbiAgICBSVENBY3RpdmF0b3JQcm90by5nZXRSVENTZXJ2aWNlPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBydGNTZXJ2aWNlO1xuICAgIH1cblxuICAgIFJUQ0FjdGl2YXRvclByb3RvLmFkZFN0cmVhbUxpc3RlbmVyPSBmdW5jdGlvbihsaXN0ZW5lciwgZXZlbnRUeXBlKVxuICAgIHtcbiAgICAgICAgcmV0dXJuIFJUQ1NlcnZpY2UuYWRkU3RyZWFtTGlzdGVuZXIobGlzdGVuZXIsIGV2ZW50VHlwZSk7XG4gICAgfVxuXG4gICAgUlRDQWN0aXZhdG9yUHJvdG8ucmVtb3ZlU3RyZWFtTGlzdGVuZXI9IGZ1bmN0aW9uKGxpc3RlbmVyLCBldmVudFR5cGUpXG4gICAge1xuICAgICAgICByZXR1cm4gUlRDU2VydmljZS5yZW1vdmVTdHJlYW1MaXN0ZW5lcihsaXN0ZW5lciwgZXZlbnRUeXBlKTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIFJUQ0FjdGl2YXRvclByb3RvO1xufSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSVENBY3RpdmF0b3I7XG4iLCJ2YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKTtcbnZhciBSVEMgPSByZXF1aXJlKFwiLi9SVEMuanNcIik7XG52YXIgU3RyZWFtRXZlbnRUeXBlcyA9IHJlcXVpcmUoXCIuLi9zZXJ2aWNlL1JUQy9TdHJlYW1FdmVudFR5cGVzLmpzXCIpO1xudmFyIE1lZGlhU3RyZWFtID0gcmVxdWlyZShcIi4vTWVkaWFTdHJlYW0uanNcIik7XG5cblxudmFyIFJUQ1NlcnZpY2UgPSBmdW5jdGlvbigpXG57XG4gICAgdmFyIGV2ZW50RW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICAgIGZ1bmN0aW9uIFN0cmVhbShzdHJlYW0sIHR5cGUpXG4gICAge1xuICAgICAgICB0aGlzLnN0cmVhbSA9IHN0cmVhbTtcbiAgICAgICAgdGhpcy5ldmVudEVtaXR0ZXIgPSBldmVudEVtaXR0ZXI7XG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgICAgIGV2ZW50RW1pdHRlci5lbWl0KFN0cmVhbUV2ZW50VHlwZXMuRVZFTlRfVFlQRV9MT0NBTF9DUkVBVEVELCB0aGlzKTtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB0aGlzLnN0cmVhbS5vbmVuZGVkID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICBzZWxmLnN0cmVhbUVuZGVkKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBTdHJlYW0ucHJvdG90eXBlLnN0cmVhbUVuZGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBldmVudEVtaXR0ZXIuZW1pdChTdHJlYW1FdmVudFR5cGVzLkVWRU5UX1RZUEVfTE9DQUxfRU5ERUQsIHRoaXMpO1xuICAgIH1cblxuICAgIFN0cmVhbS5wcm90b3R5cGUuZ2V0T3JpZ2luYWxTdHJlYW0gPSBmdW5jdGlvbigpXG4gICAge1xuICAgICAgICByZXR1cm4gdGhpcy5zdHJlYW07XG4gICAgfVxuXG4gICAgU3RyZWFtLnByb3RvdHlwZS5pc0F1ZGlvU3RyZWFtID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gKHRoaXMuc3RyZWFtLmdldEF1ZGlvVHJhY2tzKCkgJiYgdGhpcy5zdHJlYW0uZ2V0QXVkaW9UcmFja3MoKS5sZW5ndGggPiAwKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBSVENTZXJ2aWNlUHJvdG8oKSB7XG4gICAgICAgIHRoaXMucnRjID0gbmV3IFJUQyh0aGlzKTtcbiAgICAgICAgdGhpcy5ydGMub2J0YWluQXVkaW9BbmRWaWRlb1Blcm1pc3Npb25zKCk7XG4gICAgICAgIHRoaXMubG9jYWxTdHJlYW1zID0gbmV3IEFycmF5KCk7XG4gICAgICAgIHRoaXMucmVtb3RlU3RyZWFtcyA9IG5ldyBBcnJheSgpO1xuICAgIH1cblxuXG4gICAgUlRDU2VydmljZVByb3RvLmFkZFN0cmVhbUxpc3RlbmVyID0gZnVuY3Rpb24gKGxpc3RlbmVyLCBldmVudFR5cGUpIHtcbiAgICAgICAgZXZlbnRFbWl0dGVyLm9uKGV2ZW50VHlwZSwgbGlzdGVuZXIpO1xuICAgIH07XG5cbiAgICBSVENTZXJ2aWNlUHJvdG8ucmVtb3ZlU3RyZWFtTGlzdGVuZXIgPSBmdW5jdGlvbiAobGlzdGVuZXIsIGV2ZW50VHlwZSkge1xuICAgICAgICBpZighKGV2ZW50VHlwZSBpbnN0YW5jZW9mIFN0ZWFtRXZlbnRUeXBlKSlcbiAgICAgICAgICAgIHRocm93IFwiSWxsZWdhbCBhcmd1bWVudFwiO1xuXG4gICAgICAgIGV2ZW50RW1pdHRlci5yZW1vdmVMaXN0ZW5lcihldmVudFR5cGUsIGxpc3RlbmVyKTtcbiAgICB9O1xuXG4gICAgUlRDU2VydmljZVByb3RvLnByb3RvdHlwZS5jcmVhdGVMb2NhbFN0cmVhbSA9IGZ1bmN0aW9uIChzdHJlYW0sIHR5cGUpIHtcbiAgICAgICAgdmFyIGxvY2FsU3RyZWFtID0gIG5ldyBTdHJlYW0oc3RyZWFtLCB0eXBlKTtcbiAgICAgICAgdGhpcy5sb2NhbFN0cmVhbXMucHVzaChsb2NhbFN0cmVhbSk7XG4gICAgICAgIHJldHVybiBsb2NhbFN0cmVhbTtcbiAgICB9O1xuICAgIFxuICAgIFJUQ1NlcnZpY2VQcm90by5wcm90b3R5cGUuY3JlYXRlUmVtb3RlU3RyZWFtID0gZnVuY3Rpb24gKGRhdGEsIHNpZCwgdGhlc3NyYykge1xuICAgICAgICB2YXIgcmVtb3RlU3RyZWFtID0gbmV3IE1lZGlhU3RyZWFtKGRhdGEsIHNpZCwgdGhlc3NyYywgZXZlbnRFbWl0dGVyKTtcbiAgICAgICAgdGhpcy5yZW1vdGVTdHJlYW1zLnB1c2gocmVtb3RlU3RyZWFtKTtcbiAgICAgICAgcmV0dXJuIHJlbW90ZVN0cmVhbTtcbiAgICB9XG5cbiAgICBSVENTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLmdldEJyb3dzZXJUeXBlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5ydGMuYnJvd3NlcjtcbiAgICB9O1xuXG4gICAgUlRDU2VydmljZVByb3RvLnByb3RvdHlwZS5nZXRQQ0NvbnN0cmFpbnRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5ydGMucGNfY29uc3RyYWludHM7XG4gICAgfTtcblxuICAgIFJUQ1NlcnZpY2VQcm90by5wcm90b3R5cGUuZ2V0VXNlck1lZGlhV2l0aENvbnN0cmFpbnRzID1cbiAgICAgICAgZnVuY3Rpb24odW0sIHN1Y2Nlc3NfY2FsbGJhY2ssIGZhaWx1cmVfY2FsbGJhY2ssIHJlc29sdXRpb24sIGJhbmR3aWR0aCwgZnBzLCBkZXNrdG9wU3RyZWFtKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5ydGMuZ2V0VXNlck1lZGlhV2l0aENvbnN0cmFpbnRzKHVtLCBzdWNjZXNzX2NhbGxiYWNrLCBmYWlsdXJlX2NhbGxiYWNrLCByZXNvbHV0aW9uLCBiYW5kd2lkdGgsIGZwcywgZGVza3RvcFN0cmVhbSk7XG4gICAgICAgIH07XG5cbiAgICBSVENTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgZXZlbnRFbWl0dGVyLnJlbW92ZUFsbExpc3RlbmVycyhcInN0YXRpc3RpY3MuYXVkaW9MZXZlbFwiKTtcblxuICAgICAgICBpZiAodGhpcy5ydGMpIHtcbiAgICAgICAgICAgIHRoaXMucnRjID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBSVENTZXJ2aWNlUHJvdG87XG59KCk7XG5cbm1vZHVsZS5leHBvcnRzID0gUlRDU2VydmljZTtcbiIsIi8qIGdsb2JhbCBjb25uZWN0aW9uLCBTdHJvcGhlLCB1cGRhdGVMYXJnZVZpZGVvLCBmb2N1c2VkVmlkZW9TcmMqL1xuXG4vLyBjYWNoZSBkYXRhY2hhbm5lbHMgdG8gYXZvaWQgZ2FyYmFnZSBjb2xsZWN0aW9uXG4vLyBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL2Nocm9taXVtL2lzc3Vlcy9kZXRhaWw/aWQ9NDA1NTQ1XG52YXIgX2RhdGFDaGFubmVscyA9IFtdO1xuXG5cbnZhciBEYXRhQ2hhbm5lbHMgPVxue1xuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgdHJpZ2dlcmVkIGJ5IFBlZXJDb25uZWN0aW9uIHdoZW4gbmV3IGRhdGEgY2hhbm5lbCBpcyBvcGVuZWRcbiAgICAgKiBvbiB0aGUgYnJpZGdlLlxuICAgICAqIEBwYXJhbSBldmVudCB0aGUgZXZlbnQgaW5mbyBvYmplY3QuXG4gICAgICovXG4gICAgb25EYXRhQ2hhbm5lbDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHZhciBkYXRhQ2hhbm5lbCA9IGV2ZW50LmNoYW5uZWw7XG5cbiAgICAgICAgZGF0YUNoYW5uZWwub25vcGVuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc29sZS5pbmZvKFwiRGF0YSBjaGFubmVsIG9wZW5lZCBieSB0aGUgVmlkZW9icmlkZ2UhXCIsIGRhdGFDaGFubmVsKTtcblxuICAgICAgICAgICAgLy8gQ29kZSBzYW1wbGUgZm9yIHNlbmRpbmcgc3RyaW5nIGFuZC9vciBiaW5hcnkgZGF0YVxuICAgICAgICAgICAgLy8gU2VuZHMgU3RyaW5nIG1lc3NhZ2UgdG8gdGhlIGJyaWRnZVxuICAgICAgICAgICAgLy9kYXRhQ2hhbm5lbC5zZW5kKFwiSGVsbG8gYnJpZGdlIVwiKTtcbiAgICAgICAgICAgIC8vIFNlbmRzIDEyIGJ5dGVzIGJpbmFyeSBtZXNzYWdlIHRvIHRoZSBicmlkZ2VcbiAgICAgICAgICAgIC8vZGF0YUNoYW5uZWwuc2VuZChuZXcgQXJyYXlCdWZmZXIoMTIpKTtcblxuICAgICAgICAgICAgLy8gd2hlbiB0aGUgZGF0YSBjaGFubmVsIGJlY29tZXMgYXZhaWxhYmxlLCB0ZWxsIHRoZSBicmlkZ2UgYWJvdXQgdmlkZW9cbiAgICAgICAgICAgIC8vIHNlbGVjdGlvbnMgc28gdGhhdCBpdCBjYW4gZG8gYWRhcHRpdmUgc2ltdWxjYXN0LFxuICAgICAgICAgICAgdmFyIGxhcmdlVmlkZW9TcmMgPSAkKCcjbGFyZ2VWaWRlbycpLmF0dHIoJ3NyYycpO1xuICAgICAgICAgICAgdmFyIHVzZXJKaWQgPSBnZXRKaWRGcm9tVmlkZW9TcmMobGFyZ2VWaWRlb1NyYyk7XG4gICAgICAgICAgICAvLyB3ZSB3YW50IHRoZSBub3RpZmljYXRpb24gdG8gdHJpZ2dlciBldmVuIGlmIHVzZXJKaWQgaXMgdW5kZWZpbmVkLFxuICAgICAgICAgICAgLy8gb3IgbnVsbC5cbiAgICAgICAgICAgIG9uU2VsZWN0ZWRFbmRwb2ludENoYW5nZWQodXNlckppZCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgZGF0YUNoYW5uZWwub25lcnJvciA9IGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkRhdGEgQ2hhbm5lbCBFcnJvcjpcIiwgZXJyb3IsIGRhdGFDaGFubmVsKTtcbiAgICAgICAgfTtcblxuICAgICAgICBkYXRhQ2hhbm5lbC5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gZXZlbnQuZGF0YTtcbiAgICAgICAgICAgIC8vIEpTT05cbiAgICAgICAgICAgIHZhciBvYmo7XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgb2JqID0gSlNPTi5wYXJzZShkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICAgICAgICAgICAgXCJGYWlsZWQgdG8gcGFyc2UgZGF0YSBjaGFubmVsIG1lc3NhZ2UgYXMgSlNPTjogXCIsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEsXG4gICAgICAgICAgICAgICAgICAgIGRhdGFDaGFubmVsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgoJ3VuZGVmaW5lZCcgIT09IHR5cGVvZihvYmopKSAmJiAobnVsbCAhPT0gb2JqKSkge1xuICAgICAgICAgICAgICAgIHZhciBjb2xpYnJpQ2xhc3MgPSBvYmouY29saWJyaUNsYXNzO1xuXG4gICAgICAgICAgICAgICAgaWYgKFwiRG9taW5hbnRTcGVha2VyRW5kcG9pbnRDaGFuZ2VFdmVudFwiID09PSBjb2xpYnJpQ2xhc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRW5kcG9pbnQgSUQgZnJvbSB0aGUgVmlkZW9icmlkZ2UuXG4gICAgICAgICAgICAgICAgICAgIHZhciBkb21pbmFudFNwZWFrZXJFbmRwb2ludCA9IG9iai5kb21pbmFudFNwZWFrZXJFbmRwb2ludDtcblxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oXG4gICAgICAgICAgICAgICAgICAgICAgICBcIkRhdGEgY2hhbm5lbCBuZXcgZG9taW5hbnQgc3BlYWtlciBldmVudDogXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkb21pbmFudFNwZWFrZXJFbmRwb2ludCk7XG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAnZG9taW5hbnRzcGVha2VyY2hhbmdlZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBbZG9taW5hbnRTcGVha2VyRW5kcG9pbnRdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoXCJMYXN0TkVuZHBvaW50c0NoYW5nZUV2ZW50XCIgPT09IGNvbGlicmlDbGFzcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaGUgbmV3L2xhdGVzdCBsaXN0IG9mIGxhc3QtbiBlbmRwb2ludCBJRHMuXG4gICAgICAgICAgICAgICAgICAgIHZhciBsYXN0TkVuZHBvaW50cyA9IG9iai5sYXN0TkVuZHBvaW50cztcbiAgICAgICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgICAgICogVGhlIGxpc3Qgb2YgZW5kcG9pbnQgSURzIHdoaWNoIGFyZSBlbnRlcmluZyB0aGUgbGlzdCBvZlxuICAgICAgICAgICAgICAgICAgICAgKiBsYXN0LW4gYXQgdGhpcyB0aW1lIGkuZS4gd2VyZSBub3QgaW4gdGhlIG9sZCBsaXN0IG9mIGxhc3QtblxuICAgICAgICAgICAgICAgICAgICAgKiBlbmRwb2ludCBJRHMuXG4gICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgICAgICB2YXIgZW5kcG9pbnRzRW50ZXJpbmdMYXN0TiA9IG9iai5lbmRwb2ludHNFbnRlcmluZ0xhc3ROO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBzdHJlYW0gPSBvYmouc3RyZWFtO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJEYXRhIGNoYW5uZWwgbmV3IGxhc3QtbiBldmVudDogXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0TkVuZHBvaW50cywgZW5kcG9pbnRzRW50ZXJpbmdMYXN0Tiwgb2JqKTtcblxuICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2xhc3RuY2hhbmdlZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBbbGFzdE5FbmRwb2ludHMsIGVuZHBvaW50c0VudGVyaW5nTGFzdE4sIHN0cmVhbV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChcIlNpbXVsY2FzdExheWVyc0NoYW5nZWRFdmVudFwiID09PSBjb2xpYnJpQ2xhc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVuZHBvaW50U2ltdWxjYXN0TGF5ZXJzID0gb2JqLmVuZHBvaW50U2ltdWxjYXN0TGF5ZXJzO1xuICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdzaW11bGNhc3RsYXllcnNjaGFuZ2VkJywgW2VuZHBvaW50U2ltdWxjYXN0TGF5ZXJzXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKFwiU3RhcnRTaW11bGNhc3RMYXllckV2ZW50XCIgPT09IGNvbGlicmlDbGFzcykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2ltdWxjYXN0TGF5ZXIgPSBvYmouc2ltdWxjYXN0TGF5ZXI7XG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ3N0YXJ0c2ltdWxjYXN0bGF5ZXInLCBzaW11bGNhc3RMYXllcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKFwiU3RvcFNpbXVsY2FzdExheWVyRXZlbnRcIiA9PT0gY29saWJyaUNsYXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzaW11bGNhc3RMYXllciA9IG9iai5zaW11bGNhc3RMYXllcjtcbiAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignc3RvcHNpbXVsY2FzdGxheWVyJywgc2ltdWxjYXN0TGF5ZXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZyhcIkRhdGEgY2hhbm5lbCBKU09OLWZvcm1hdHRlZCBtZXNzYWdlOiBcIiwgb2JqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgZGF0YUNoYW5uZWwub25jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIlRoZSBEYXRhIENoYW5uZWwgY2xvc2VkXCIsIGRhdGFDaGFubmVsKTtcbiAgICAgICAgICAgIHZhciBpZHggPSBfZGF0YUNoYW5uZWxzLmluZGV4T2YoZGF0YUNoYW5uZWwpO1xuICAgICAgICAgICAgaWYgKGlkeCA+IC0xKVxuICAgICAgICAgICAgICAgIF9kYXRhQ2hhbm5lbHMgPSBfZGF0YUNoYW5uZWxzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICB9O1xuICAgICAgICBfZGF0YUNoYW5uZWxzLnB1c2goZGF0YUNoYW5uZWwpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCaW5kcyBcIm9uZGF0YWNoYW5uZWxcIiBldmVudCBsaXN0ZW5lciB0byBnaXZlbiBQZWVyQ29ubmVjdGlvbiBpbnN0YW5jZS5cbiAgICAgKiBAcGFyYW0gcGVlckNvbm5lY3Rpb24gV2ViUlRDIHBlZXIgY29ubmVjdGlvbiBpbnN0YW5jZS5cbiAgICAgKi9cbiAgICBiaW5kRGF0YUNoYW5uZWxMaXN0ZW5lcjogZnVuY3Rpb24gKHBlZXJDb25uZWN0aW9uKSB7XG4gICAgICAgIGlmICghY29uZmlnLm9wZW5TY3RwKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBwZWVyQ29ubmVjdGlvbi5vbmRhdGFjaGFubmVsID0gdGhpcy5vbkRhdGFDaGFubmVsO1xuXG4gICAgICAgIC8vIFNhbXBsZSBjb2RlIGZvciBvcGVuaW5nIG5ldyBkYXRhIGNoYW5uZWwgZnJvbSBKaXRzaSBNZWV0IHRvIHRoZSBicmlkZ2UuXG4gICAgICAgIC8vIEFsdGhvdWdoIGl0J3Mgbm90IGEgcmVxdWlyZW1lbnQgdG8gb3BlbiBzZXBhcmF0ZSBjaGFubmVscyBmcm9tIGJvdGggYnJpZGdlXG4gICAgICAgIC8vIGFuZCBwZWVyIGFzIHNpbmdsZSBjaGFubmVsIGNhbiBiZSB1c2VkIGZvciBzZW5kaW5nIGFuZCByZWNlaXZpbmcgZGF0YS5cbiAgICAgICAgLy8gU28gZWl0aGVyIGNoYW5uZWwgb3BlbmVkIGJ5IHRoZSBicmlkZ2Ugb3IgdGhlIG9uZSBvcGVuZWQgaGVyZSBpcyBlbm91Z2hcbiAgICAgICAgLy8gZm9yIGNvbW11bmljYXRpb24gd2l0aCB0aGUgYnJpZGdlLlxuICAgICAgICAvKnZhciBkYXRhQ2hhbm5lbE9wdGlvbnMgPVxuICAgICAgICAge1xuICAgICAgICAgcmVsaWFibGU6IHRydWVcbiAgICAgICAgIH07XG4gICAgICAgICB2YXIgZGF0YUNoYW5uZWxcbiAgICAgICAgID0gcGVlckNvbm5lY3Rpb24uY3JlYXRlRGF0YUNoYW5uZWwoXCJteUNoYW5uZWxcIiwgZGF0YUNoYW5uZWxPcHRpb25zKTtcblxuICAgICAgICAgLy8gQ2FuIGJlIHVzZWQgb25seSB3aGVuIGlzIGluIG9wZW4gc3RhdGVcbiAgICAgICAgIGRhdGFDaGFubmVsLm9ub3BlbiA9IGZ1bmN0aW9uICgpXG4gICAgICAgICB7XG4gICAgICAgICBkYXRhQ2hhbm5lbC5zZW5kKFwiTXkgY2hhbm5lbCAhISFcIik7XG4gICAgICAgICB9O1xuICAgICAgICAgZGF0YUNoYW5uZWwub25tZXNzYWdlID0gZnVuY3Rpb24gKGV2ZW50KVxuICAgICAgICAge1xuICAgICAgICAgdmFyIG1zZ0RhdGEgPSBldmVudC5kYXRhO1xuICAgICAgICAgY29uc29sZS5pbmZvKFwiR290IE15IERhdGEgQ2hhbm5lbCBNZXNzYWdlOlwiLCBtc2dEYXRhLCBkYXRhQ2hhbm5lbCk7XG4gICAgICAgICB9OyovXG4gICAgfVxufTtcblxuZnVuY3Rpb24gb25TZWxlY3RlZEVuZHBvaW50Q2hhbmdlZCh1c2VySmlkKVxue1xuICAgIGNvbnNvbGUubG9nKCdzZWxlY3RlZCBlbmRwb2ludCBjaGFuZ2VkOiAnLCB1c2VySmlkKTtcbiAgICBpZiAoX2RhdGFDaGFubmVscyAmJiBfZGF0YUNoYW5uZWxzLmxlbmd0aCAhPSAwICYmIF9kYXRhQ2hhbm5lbHNbMF0ucmVhZHlTdGF0ZSA9PSBcIm9wZW5cIikge1xuICAgICAgICBfZGF0YUNoYW5uZWxzWzBdLnNlbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgJ2NvbGlicmlDbGFzcyc6ICdTZWxlY3RlZEVuZHBvaW50Q2hhbmdlZEV2ZW50JyxcbiAgICAgICAgICAgICdzZWxlY3RlZEVuZHBvaW50JzogKCF1c2VySmlkIHx8IHVzZXJKaWQgPT0gbnVsbClcbiAgICAgICAgICAgICAgICA/IG51bGwgOiBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZCh1c2VySmlkKVxuICAgICAgICB9KSk7XG4gICAgfVxufVxuXG4kKGRvY3VtZW50KS5iaW5kKFwic2VsZWN0ZWRlbmRwb2ludGNoYW5nZWRcIiwgZnVuY3Rpb24oZXZlbnQsIHVzZXJKaWQpIHtcbiAgICBvblNlbGVjdGVkRW5kcG9pbnRDaGFuZ2VkKHVzZXJKaWQpO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gRGF0YUNoYW5uZWxzO1xuXG4iLCJ2YXIgUlRDQnJvd3NlclR5cGUgPSB7XG4gICAgUlRDX0JST1dTRVJfQ0hST01FOiBcInJ0Y19icm93c2VyLmNocm9tZVwiLFxuXG4gICAgUlRDX0JST1dTRVJfRklSRUZPWDogXCJydGNfYnJvd3Nlci5maXJlZm94XCJcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUlRDQnJvd3NlclR5cGU7IiwidmFyIFN0cmVhbUV2ZW50VHlwZXMgPSB7XG4gICAgRVZFTlRfVFlQRV9MT0NBTF9DUkVBVEVEOiBcInN0cmVhbS5sb2NhbF9jcmVhdGVkXCIsXG5cbiAgICBFVkVOVF9UWVBFX0xPQ0FMX0VOREVEOiBcInN0cmVhbS5sb2NhbF9lbmRlZFwiLFxuXG4gICAgRVZFTlRfVFlQRV9SRU1PVEVfQ1JFQVRFRDogXCJzdHJlYW0ucmVtb3RlX2NyZWF0ZWRcIixcblxuICAgIEVWRU5UX1RZUEVfUkVNT1RFX0VOREVEOiBcInN0cmVhbS5yZW1vdGVfZW5kZWRcIlxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdHJlYW1FdmVudFR5cGVzOyIsIi8qKlxuICogQ3JlYXRlZCBieSBocmlzdG8gb24gMTAvMjkvMTQuXG4gKi9cbnZhciBYTVBQRXZlbnRzID0ge1xuICAgIENPTkZFUkVOQ0VfQ0VSQVRFRDogXCJ4bXBwLmNvbmZlcmVuY2VDcmVhdGVkLmppbmdsZVwiLFxuICAgIENBTExfVEVSTUlOQVRFRDogXCJ4bXBwLmNhbGx0ZXJtaW5hdGVkLmppbmdsZVwiLFxuICAgIENBTExfSU5DT01JTkc6IFwieG1wcC5jYWxsaW5jb21pbmcuamluZ2xlXCIsXG4gICAgRkFUQUxfSklOR0xFX0VSUk9SOiBcInhtcHAuZmF0YWxFcnJvci5qaW5nbGVcIlxufTtcbm1vZHVsZS5leHBvcnRzID0gWE1QUEV2ZW50czsiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iXX0=
