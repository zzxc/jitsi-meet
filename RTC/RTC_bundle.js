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
},{"../service/RTC/RTCBrowserType.js":5,"../service/RTC/StreamEventTypes.js":6,"./RTC.js":2}],2:[function(require,module,exports){
var RTCActivator = require("./RTCActivator");

var RTCBrowserTypes = require("../service/RTC/RTCBrowserType.js");

function RTC()
{
    var RTC = null;

    if (navigator.mozGetUserMedia) {
        console.log('This appears to be Firefox');
        var version = parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);
        if (version >= 22) {
            RTC = {
                peerconnection: mozRTCPeerConnection,
                browser: RTCBrowserTypes.RTC_BROWSER_FIREFOX,
                getUserMedia: navigator.mozGetUserMedia.bind(navigator),
                pc_constraints: {}
            };
            RTCSessionDescription = mozRTCSessionDescription;
            RTCIceCandidate = mozRTCIceCandidate;
        }
    } else if (navigator.webkitGetUserMedia) {
        console.log('This appears to be Chrome');
        RTC = {
            peerconnection: webkitRTCPeerConnection,
            browser: RTCBrowserTypes.RTC_BROWSER_CHROME,
            getUserMedia: navigator.webkitGetUserMedia.bind(navigator),
            // DTLS should now be enabled by default but..
            pc_constraints: {'optional': [{'DtlsSrtpKeyAgreement': 'true'}]}
        };
        if (navigator.userAgent.indexOf('Android') != -1) {
            RTC.pc_constraints = {}; // disable DTLS on Android
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
    if (RTC === null) {
        try { console.log('Browser does not appear to be WebRTC-capable'); } catch (e) { }

        window.location.href = 'webrtcrequired.html';
        return;
    }

    if (RTC.browser !== 'chrome') {
        window.location.href = 'chromeonly.html';
        return;
    }

    return RTC;
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
            constraints.video.optional.push({ minAspectRatio: 1.77 });
            break;
        case '720':
        case 'hd':
            constraints.video.mandatory.minWidth = 1280;
            constraints.video.mandatory.minHeight = 720;
            constraints.video.optional.push({ minAspectRatio: 1.77 });
            break;
        case '360':
            constraints.video.mandatory.minWidth = 640;
            constraints.video.mandatory.minHeight = 360;
            constraints.video.optional.push({ minAspectRatio: 1.77 });
            break;
        case '180':
            constraints.video.mandatory.minWidth = 320;
            constraints.video.mandatory.minHeight = 180;
            constraints.video.optional.push({ minAspectRatio: 1.77 });
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

    if (bandwidth) { // doesn't work currently, see webrtc issue 1846
        if (!constraints.video) constraints.video = {mandatory: {}, optional: []};//same behaviour as true
        constraints.video.optional.push({bandwidth: bandwidth});
    }
    if (fps) { // for some cameras it might be necessary to request 30fps
        // so they choose 30fps mjpg over 10fps yuy2
        if (!constraints.video) constraints.video = {mandatory: {}, optional: []};// same behaviour as true;
        constraints.video.mandatory.minFrameRate = fps;
    }

    try {
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
    } catch (e) {
        console.error('GUM failed: ', e);
        if (failure_callback) {
            failure_callback(e);
        }
    }
}

RTC.prototype.obtainAudioAndVideoPermissions = function () {
    this.getUserMediaWithConstraints(
        ['audio', 'video'],
        function (avStream) {
            RTC.handleLocalStream(avStream);
        },
        function (error) {
            console.error('failed to obtain audio/video stream - stop', error);
        },
            config.resolution || '360');

}

RTC.handleLocalStream = function(stream) {

    var audioStream = new webkitMediaStream(stream);
    var videoStream = new webkitMediaStream(stream);
    var videoTracks = stream.getVideoTracks();
    var audioTracks = stream.getAudioTracks();
    for (var i = 0; i < videoTracks.length; i++) {
        audioStream.removeTrack(videoTracks[i]);
    }
    RTCActivator.getRTCService().createLocalStream(audioStream, "audio");
    for (i = 0; i < audioTracks.length; i++) {
        videoStream.removeTrack(audioTracks[i]);
    }
    RTCActivator.getRTCService().createLocalStream(videoStream, "video");
}

module.exports = RTC;
},{"../service/RTC/RTCBrowserType.js":5,"./RTCActivator":3}],3:[function(require,module,exports){
var RTCService = require("./RTCService.js");

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


    RTCActivatorProto.start= function () {
        rtcService = new RTCService();
    }

    RTCActivatorProto.getRTCService= function () {
        return rtcService;
    }

    RTCActivatorProto.addStreamListener= function(listener, eventType)
    {
        console.log(RTCService);
        console.log(require("./RTCService.js"));
        return RTCService.addStreamListener(listener, eventType);
    }

    RTCActivatorProto.removeStreamListener= function(listener, eventType)
    {
        return RTCService.removeStreamListener(listener, eventType);
    }
    
    return RTCActivatorProto;
})();

module.exports = RTCActivator;

},{"./RTCService.js":4}],4:[function(require,module,exports){
var EventEmmiter = require("events");
var RTC = require("./RTC.js");
var StreamEventTypes = require("../service/RTC/StreamEventTypes.js");
var MediaStream = require("./MediaStream.js");


var RTCService = function()
{
    var eventEmmiter = null;

    function Stream(stream, type)
    {
        this.stream = stream;
        this.eventEmmiter = eventEmmiter;
        this.type = type;
        eventEmmiter.emit(StreamEventTypes.EVENT_TYPE_LOCAL_CREATED, this);
        var self = this;
        this.stream.onended = function()
        {
            self.streamEnded();
        }
    }

    Stream.prototype.streamEnded = function () {
        eventEmmiter.emit(StreamEventTypes.EVENT_TYPE_LOCAL_ENDED, this);
    }

    Stream.prototype.getOriginalStream = function()
    {
        return this.stream;
    }

    function RTCServiceProto() {
        this.rtc = new RTC();
        this.rtc.obtainAudioAndVideoPermissions();
        this.localStreams = new Array();
        this.remoteStreams = new Array();
        RTCService.addStreamListener(maybeDoJoin(), StreamEventTypes.EVENT_TYPE_LOCAL_CREATED);
    }


    RTCServiceProto.addStreamListener = function (listener, eventType) {
        if (eventEmmiter == null) {
            eventEmmiter = new EventEmmiter();
        }

        eventEmmiter.on(eventType, listener);
    };

    RTCServiceProto.removeStreamListener = function (listener, eventType) {
        if(!(eventType instanceof SteamEventType))
            throw "Illegal argument";

        if (eventEmmiter == null)
            return;
        eventEmmiter.removeListener(eventType, listener);
    };

    RTCServiceProto.prototype.createLocalStream = function (stream, type) {
        var localStream =  new Stream(stream, type);
        this.localStreams.push(localStream);
        return localStream;
    };
    
    RTCServiceProto.prototype.createRemoteStream = function (data, sid, thessrc) {
        var remoteStream = new MediaStream(data, sid, thessrc, eventEmmiter);
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
        if (eventEmmiter) {
            eventEmmiter.removeAllListeners("statistics.audioLevel");
            eventEmmiter = null;
        }

        if (this.rtc) {
            this.rtc = null;
        }
    }

    return RTCServiceProto;
}();

module.exports = RTCService;

},{"../service/RTC/StreamEventTypes.js":6,"./MediaStream.js":1,"./RTC.js":2,"events":7}],5:[function(require,module,exports){
var RTCBrowserType = {
    RTC_BROWSER_CHROME: "rtc_browser.chrome",

    RTC_BROWSER_FIREFOX: "rtc_browser.firefox"
};

module.exports = RTCBrowserType;
},{}],6:[function(require,module,exports){
var StreamEventTypes = {
    EVENT_TYPE_LOCAL_CREATED: "stream.local_created",

    EVENT_TYPE_LOCAL_ENDED: "stream.local_ended",

    EVENT_TYPE_REMOTE_CREATED: "stream.remote_created",

    EVENT_TYPE_REMOTE_ENDED: "stream.remote_ended"
};

module.exports = StreamEventTypes;
},{}],7:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9SVEMvTWVkaWFTdHJlYW0uanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9SVEMvUlRDLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvUlRDL1JUQ0FjdGl2YXRvci5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L1JUQy9SVENTZXJ2aWNlLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvc2VydmljZS9SVEMvUlRDQnJvd3NlclR5cGUuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9zZXJ2aWNlL1JUQy9TdHJlYW1FdmVudFR5cGVzLmpzIiwiL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdk9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgUlRDID0gcmVxdWlyZShcIi4vUlRDLmpzXCIpO1xudmFyIFJUQ0Jyb3dzZXJUeXBlID0gcmVxdWlyZShcIi4uL3NlcnZpY2UvUlRDL1JUQ0Jyb3dzZXJUeXBlLmpzXCIpO1xudmFyIFN0cmVhbUV2ZW50VHlwZXMgPSByZXF1aXJlKFwiLi4vc2VydmljZS9SVEMvU3RyZWFtRXZlbnRUeXBlcy5qc1wiKTtcblxuLyoqXG4gKiBQcm92aWRlcyBhIHdyYXBwZXIgY2xhc3MgZm9yIHRoZSBNZWRpYVN0cmVhbS5cbiAqIFxuICogVE9ETyA6IEFkZCBoZXJlIHRoZSBzcmMgZnJvbSB0aGUgdmlkZW8gZWxlbWVudCBhbmQgb3RoZXIgcmVsYXRlZCBwcm9wZXJ0aWVzXG4gKiBhbmQgZ2V0IHJpZCBvZiBzb21lIG9mIHRoZSBtYXBwaW5ncyB0aGF0IHdlIHVzZSB0aHJvdWdob3V0IHRoZSBVSS5cbiAqL1xudmFyIE1lZGlhU3RyZWFtID0gKGZ1bmN0aW9uKCkge1xuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBNZWRpYVN0cmVhbSBvYmplY3QgZm9yIHRoZSBnaXZlbiBkYXRhLCBzZXNzaW9uIGlkIGFuZCBzc3JjLlxuICAgICAqXG4gICAgICogQHBhcmFtIGRhdGEgdGhlIGRhdGEgb2JqZWN0IGZyb20gd2hpY2ggd2Ugb2J0YWluIHRoZSBzdHJlYW0sXG4gICAgICogdGhlIHBlZXJqaWQsIGV0Yy5cbiAgICAgKiBAcGFyYW0gc2lkIHRoZSBzZXNzaW9uIGlkXG4gICAgICogQHBhcmFtIHNzcmMgdGhlIHNzcmMgY29ycmVzcG9uZGluZyB0byB0aGlzIE1lZGlhU3RyZWFtXG4gICAgICpcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBNZWRpYVN0cmVhbVByb3RvKGRhdGEsIHNpZCwgc3NyYywgZXZlbnRFbW1pdGVyKSB7XG4gICAgICAgIHRoaXMuc2lkID0gc2lkO1xuICAgICAgICB0aGlzLlZJREVPX1RZUEUgPSBcIlZpZGVvXCI7XG4gICAgICAgIHRoaXMuQVVESU9fVFlQRSA9IFwiQXVkaW9cIjtcbiAgICAgICAgdGhpcy5zdHJlYW0gPSBkYXRhLnN0cmVhbTtcbiAgICAgICAgdGhpcy5wZWVyamlkID0gZGF0YS5wZWVyamlkO1xuICAgICAgICB0aGlzLnNzcmMgPSBzc3JjO1xuICAgICAgICB0aGlzLnNlc3Npb24gPSBjb25uZWN0aW9uLmppbmdsZS5zZXNzaW9uc1tzaWRdO1xuICAgICAgICB0aGlzLnR5cGUgPSAodGhpcy5zdHJlYW0uZ2V0VmlkZW9UcmFja3MoKS5sZW5ndGggPiAwKVxuICAgICAgICAgICAgICAgICAgICA/IHRoaXMuVklERU9fVFlQRSA6IHRoaXMuQVVESU9fVFlQRTtcbiAgICAgICAgZXZlbnRFbW1pdGVyLmVtaXQoU3RyZWFtRXZlbnRUeXBlcy5FVkVOVF9UWVBFX1JFTU9URV9DUkVBVEVELCB0aGlzKTtcbiAgICB9XG5cbiAgICBpZihSVEMuYnJvd3NlciA9PSBSVENCcm93c2VyVHlwZS5SVENfQlJPV1NFUl9GSVJFRk9YKVxuICAgIHtcbiAgICAgICAgaWYgKCFNZWRpYVN0cmVhbS5wcm90b3R5cGUuZ2V0VmlkZW9UcmFja3MpXG4gICAgICAgICAgICBNZWRpYVN0cmVhbS5wcm90b3R5cGUuZ2V0VmlkZW9UcmFja3MgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBbXTsgfTtcbiAgICAgICAgaWYgKCFNZWRpYVN0cmVhbS5wcm90b3R5cGUuZ2V0QXVkaW9UcmFja3MpXG4gICAgICAgICAgICBNZWRpYVN0cmVhbS5wcm90b3R5cGUuZ2V0QXVkaW9UcmFja3MgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBbXTsgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gTWVkaWFTdHJlYW1Qcm90bztcbn0pKCk7XG5cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gTWVkaWFTdHJlYW07IiwidmFyIFJUQ0FjdGl2YXRvciA9IHJlcXVpcmUoXCIuL1JUQ0FjdGl2YXRvclwiKTtcblxudmFyIFJUQ0Jyb3dzZXJUeXBlcyA9IHJlcXVpcmUoXCIuLi9zZXJ2aWNlL1JUQy9SVENCcm93c2VyVHlwZS5qc1wiKTtcblxuZnVuY3Rpb24gUlRDKClcbntcbiAgICB2YXIgUlRDID0gbnVsbDtcblxuICAgIGlmIChuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdUaGlzIGFwcGVhcnMgdG8gYmUgRmlyZWZveCcpO1xuICAgICAgICB2YXIgdmVyc2lvbiA9IHBhcnNlSW50KG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0ZpcmVmb3hcXC8oWzAtOV0rKVxcLi8pWzFdLCAxMCk7XG4gICAgICAgIGlmICh2ZXJzaW9uID49IDIyKSB7XG4gICAgICAgICAgICBSVEMgPSB7XG4gICAgICAgICAgICAgICAgcGVlcmNvbm5lY3Rpb246IG1velJUQ1BlZXJDb25uZWN0aW9uLFxuICAgICAgICAgICAgICAgIGJyb3dzZXI6IFJUQ0Jyb3dzZXJUeXBlcy5SVENfQlJPV1NFUl9GSVJFRk9YLFxuICAgICAgICAgICAgICAgIGdldFVzZXJNZWRpYTogbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYS5iaW5kKG5hdmlnYXRvciksXG4gICAgICAgICAgICAgICAgcGNfY29uc3RyYWludHM6IHt9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uID0gbW96UlRDU2Vzc2lvbkRlc2NyaXB0aW9uO1xuICAgICAgICAgICAgUlRDSWNlQ2FuZGlkYXRlID0gbW96UlRDSWNlQ2FuZGlkYXRlO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdUaGlzIGFwcGVhcnMgdG8gYmUgQ2hyb21lJyk7XG4gICAgICAgIFJUQyA9IHtcbiAgICAgICAgICAgIHBlZXJjb25uZWN0aW9uOiB3ZWJraXRSVENQZWVyQ29ubmVjdGlvbixcbiAgICAgICAgICAgIGJyb3dzZXI6IFJUQ0Jyb3dzZXJUeXBlcy5SVENfQlJPV1NFUl9DSFJPTUUsXG4gICAgICAgICAgICBnZXRVc2VyTWVkaWE6IG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEuYmluZChuYXZpZ2F0b3IpLFxuICAgICAgICAgICAgLy8gRFRMUyBzaG91bGQgbm93IGJlIGVuYWJsZWQgYnkgZGVmYXVsdCBidXQuLlxuICAgICAgICAgICAgcGNfY29uc3RyYWludHM6IHsnb3B0aW9uYWwnOiBbeydEdGxzU3J0cEtleUFncmVlbWVudCc6ICd0cnVlJ31dfVxuICAgICAgICB9O1xuICAgICAgICBpZiAobmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCdBbmRyb2lkJykgIT0gLTEpIHtcbiAgICAgICAgICAgIFJUQy5wY19jb25zdHJhaW50cyA9IHt9OyAvLyBkaXNhYmxlIERUTFMgb24gQW5kcm9pZFxuICAgICAgICB9XG4gICAgICAgIGlmICghd2Via2l0TWVkaWFTdHJlYW0ucHJvdG90eXBlLmdldFZpZGVvVHJhY2tzKSB7XG4gICAgICAgICAgICB3ZWJraXRNZWRpYVN0cmVhbS5wcm90b3R5cGUuZ2V0VmlkZW9UcmFja3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudmlkZW9UcmFja3M7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGlmICghd2Via2l0TWVkaWFTdHJlYW0ucHJvdG90eXBlLmdldEF1ZGlvVHJhY2tzKSB7XG4gICAgICAgICAgICB3ZWJraXRNZWRpYVN0cmVhbS5wcm90b3R5cGUuZ2V0QXVkaW9UcmFja3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXVkaW9UcmFja3M7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChSVEMgPT09IG51bGwpIHtcbiAgICAgICAgdHJ5IHsgY29uc29sZS5sb2coJ0Jyb3dzZXIgZG9lcyBub3QgYXBwZWFyIHRvIGJlIFdlYlJUQy1jYXBhYmxlJyk7IH0gY2F0Y2ggKGUpIHsgfVxuXG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJ3dlYnJ0Y3JlcXVpcmVkLmh0bWwnO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKFJUQy5icm93c2VyICE9PSAnY2hyb21lJykge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9ICdjaHJvbWVvbmx5Lmh0bWwnO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgcmV0dXJuIFJUQztcbn1cblxuUlRDLnByb3RvdHlwZS5nZXRVc2VyTWVkaWFXaXRoQ29uc3RyYWludHNcbiAgICA9IGZ1bmN0aW9uKHVtLCBzdWNjZXNzX2NhbGxiYWNrLCBmYWlsdXJlX2NhbGxiYWNrLCByZXNvbHV0aW9uLCBiYW5kd2lkdGgsIGZwcywgZGVza3RvcFN0cmVhbSkge1xuICAgIHZhciBjb25zdHJhaW50cyA9IHthdWRpbzogZmFsc2UsIHZpZGVvOiBmYWxzZX07XG5cbiAgICBpZiAodW0uaW5kZXhPZigndmlkZW8nKSA+PSAwKSB7XG4gICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvID0geyBtYW5kYXRvcnk6IHt9LCBvcHRpb25hbDogW10gfTsvLyBzYW1lIGJlaGF2aW91ciBhcyB0cnVlXG4gICAgfVxuICAgIGlmICh1bS5pbmRleE9mKCdhdWRpbycpID49IDApIHtcbiAgICAgICAgY29uc3RyYWludHMuYXVkaW8gPSB7IG1hbmRhdG9yeToge30sIG9wdGlvbmFsOiBbXX07Ly8gc2FtZSBiZWhhdmlvdXIgYXMgdHJ1ZVxuICAgIH1cbiAgICBpZiAodW0uaW5kZXhPZignc2NyZWVuJykgPj0gMCkge1xuICAgICAgICBjb25zdHJhaW50cy52aWRlbyA9IHtcbiAgICAgICAgICAgIG1hbmRhdG9yeToge1xuICAgICAgICAgICAgICAgIGNocm9tZU1lZGlhU291cmNlOiBcInNjcmVlblwiLFxuICAgICAgICAgICAgICAgIGdvb2dMZWFreUJ1Y2tldDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBtYXhXaWR0aDogd2luZG93LnNjcmVlbi53aWR0aCxcbiAgICAgICAgICAgICAgICBtYXhIZWlnaHQ6IHdpbmRvdy5zY3JlZW4uaGVpZ2h0LFxuICAgICAgICAgICAgICAgIG1heEZyYW1lUmF0ZTogM1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9wdGlvbmFsOiBbXVxuICAgICAgICB9O1xuICAgIH1cbiAgICBpZiAodW0uaW5kZXhPZignZGVza3RvcCcpID49IDApIHtcbiAgICAgICAgY29uc3RyYWludHMudmlkZW8gPSB7XG4gICAgICAgICAgICBtYW5kYXRvcnk6IHtcbiAgICAgICAgICAgICAgICBjaHJvbWVNZWRpYVNvdXJjZTogXCJkZXNrdG9wXCIsXG4gICAgICAgICAgICAgICAgY2hyb21lTWVkaWFTb3VyY2VJZDogZGVza3RvcFN0cmVhbSxcbiAgICAgICAgICAgICAgICBnb29nTGVha3lCdWNrZXQ6IHRydWUsXG4gICAgICAgICAgICAgICAgbWF4V2lkdGg6IHdpbmRvdy5zY3JlZW4ud2lkdGgsXG4gICAgICAgICAgICAgICAgbWF4SGVpZ2h0OiB3aW5kb3cuc2NyZWVuLmhlaWdodCxcbiAgICAgICAgICAgICAgICBtYXhGcmFtZVJhdGU6IDNcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvcHRpb25hbDogW11cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjb25zdHJhaW50cy5hdWRpbykge1xuICAgICAgICAvLyBpZiBpdCBpcyBnb29kIGVub3VnaCBmb3IgaGFuZ291dHMuLi5cbiAgICAgICAgY29uc3RyYWludHMuYXVkaW8ub3B0aW9uYWwucHVzaChcbiAgICAgICAgICAgIHtnb29nRWNob0NhbmNlbGxhdGlvbjogdHJ1ZX0sXG4gICAgICAgICAgICB7Z29vZ0F1dG9HYWluQ29udHJvbDogdHJ1ZX0sXG4gICAgICAgICAgICB7Z29vZ05vaXNlU3VwcmVzc2lvbjogdHJ1ZX0sXG4gICAgICAgICAgICB7Z29vZ0hpZ2hwYXNzRmlsdGVyOiB0cnVlfSxcbiAgICAgICAgICAgIHtnb29nTm9pc2VzdXBwcmVzc2lvbjI6IHRydWV9LFxuICAgICAgICAgICAge2dvb2dFY2hvQ2FuY2VsbGF0aW9uMjogdHJ1ZX0sXG4gICAgICAgICAgICB7Z29vZ0F1dG9HYWluQ29udHJvbDI6IHRydWV9XG4gICAgICAgICk7XG4gICAgfVxuICAgIGlmIChjb25zdHJhaW50cy52aWRlbykge1xuICAgICAgICBjb25zdHJhaW50cy52aWRlby5vcHRpb25hbC5wdXNoKFxuICAgICAgICAgICAge2dvb2dOb2lzZVJlZHVjdGlvbjogdHJ1ZX1cbiAgICAgICAgKTtcbiAgICAgICAgaWYgKHVtLmluZGV4T2YoJ3ZpZGVvJykgPj0gMCkge1xuICAgICAgICAgICAgY29uc3RyYWludHMudmlkZW8ub3B0aW9uYWwucHVzaChcbiAgICAgICAgICAgICAgICB7Z29vZ0xlYWt5QnVja2V0OiB0cnVlfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIENoZWNrIGlmIHdlIGFyZSBydW5uaW5nIG9uIEFuZHJvaWQgZGV2aWNlXG4gICAgdmFyIGlzQW5kcm9pZCA9IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignQW5kcm9pZCcpICE9IC0xO1xuXG4gICAgaWYgKHJlc29sdXRpb24gJiYgIWNvbnN0cmFpbnRzLnZpZGVvIHx8IGlzQW5kcm9pZCkge1xuICAgICAgICBjb25zdHJhaW50cy52aWRlbyA9IHsgbWFuZGF0b3J5OiB7fSwgb3B0aW9uYWw6IFtdIH07Ly8gc2FtZSBiZWhhdmlvdXIgYXMgdHJ1ZVxuICAgIH1cbiAgICAvLyBzZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC9jaHJvbWl1bS9pc3N1ZXMvZGV0YWlsP2lkPTE0MzYzMSNjOSBmb3IgbGlzdCBvZiBzdXBwb3J0ZWQgcmVzb2x1dGlvbnNcbiAgICBzd2l0Y2ggKHJlc29sdXRpb24pIHtcbiAgICAgICAgLy8gMTY6OSBmaXJzdFxuICAgICAgICBjYXNlICcxMDgwJzpcbiAgICAgICAgY2FzZSAnZnVsbGhkJzpcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5taW5XaWR0aCA9IDE5MjA7XG4gICAgICAgICAgICBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWluSGVpZ2h0ID0gMTA4MDtcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm9wdGlvbmFsLnB1c2goeyBtaW5Bc3BlY3RSYXRpbzogMS43NyB9KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICc3MjAnOlxuICAgICAgICBjYXNlICdoZCc6XG4gICAgICAgICAgICBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWluV2lkdGggPSAxMjgwO1xuICAgICAgICAgICAgY29uc3RyYWludHMudmlkZW8ubWFuZGF0b3J5Lm1pbkhlaWdodCA9IDcyMDtcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm9wdGlvbmFsLnB1c2goeyBtaW5Bc3BlY3RSYXRpbzogMS43NyB9KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICczNjAnOlxuICAgICAgICAgICAgY29uc3RyYWludHMudmlkZW8ubWFuZGF0b3J5Lm1pbldpZHRoID0gNjQwO1xuICAgICAgICAgICAgY29uc3RyYWludHMudmlkZW8ubWFuZGF0b3J5Lm1pbkhlaWdodCA9IDM2MDtcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm9wdGlvbmFsLnB1c2goeyBtaW5Bc3BlY3RSYXRpbzogMS43NyB9KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICcxODAnOlxuICAgICAgICAgICAgY29uc3RyYWludHMudmlkZW8ubWFuZGF0b3J5Lm1pbldpZHRoID0gMzIwO1xuICAgICAgICAgICAgY29uc3RyYWludHMudmlkZW8ubWFuZGF0b3J5Lm1pbkhlaWdodCA9IDE4MDtcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm9wdGlvbmFsLnB1c2goeyBtaW5Bc3BlY3RSYXRpbzogMS43NyB9KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyA0OjNcbiAgICAgICAgY2FzZSAnOTYwJzpcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5taW5XaWR0aCA9IDk2MDtcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5taW5IZWlnaHQgPSA3MjA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnNjQwJzpcbiAgICAgICAgY2FzZSAndmdhJzpcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5taW5XaWR0aCA9IDY0MDtcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5taW5IZWlnaHQgPSA0ODA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnMzIwJzpcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5taW5XaWR0aCA9IDMyMDtcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5taW5IZWlnaHQgPSAyNDA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIGlmIChpc0FuZHJvaWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWluV2lkdGggPSAzMjA7XG4gICAgICAgICAgICAgICAgY29uc3RyYWludHMudmlkZW8ubWFuZGF0b3J5Lm1pbkhlaWdodCA9IDI0MDtcbiAgICAgICAgICAgICAgICBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWF4RnJhbWVSYXRlID0gMTU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICBpZiAoYmFuZHdpZHRoKSB7IC8vIGRvZXNuJ3Qgd29yayBjdXJyZW50bHksIHNlZSB3ZWJydGMgaXNzdWUgMTg0NlxuICAgICAgICBpZiAoIWNvbnN0cmFpbnRzLnZpZGVvKSBjb25zdHJhaW50cy52aWRlbyA9IHttYW5kYXRvcnk6IHt9LCBvcHRpb25hbDogW119Oy8vc2FtZSBiZWhhdmlvdXIgYXMgdHJ1ZVxuICAgICAgICBjb25zdHJhaW50cy52aWRlby5vcHRpb25hbC5wdXNoKHtiYW5kd2lkdGg6IGJhbmR3aWR0aH0pO1xuICAgIH1cbiAgICBpZiAoZnBzKSB7IC8vIGZvciBzb21lIGNhbWVyYXMgaXQgbWlnaHQgYmUgbmVjZXNzYXJ5IHRvIHJlcXVlc3QgMzBmcHNcbiAgICAgICAgLy8gc28gdGhleSBjaG9vc2UgMzBmcHMgbWpwZyBvdmVyIDEwZnBzIHl1eTJcbiAgICAgICAgaWYgKCFjb25zdHJhaW50cy52aWRlbykgY29uc3RyYWludHMudmlkZW8gPSB7bWFuZGF0b3J5OiB7fSwgb3B0aW9uYWw6IFtdfTsvLyBzYW1lIGJlaGF2aW91ciBhcyB0cnVlO1xuICAgICAgICBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWluRnJhbWVSYXRlID0gZnBzO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICAgIHRoaXMuZ2V0VXNlck1lZGlhKGNvbnN0cmFpbnRzLFxuICAgICAgICAgICAgZnVuY3Rpb24gKHN0cmVhbSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvblVzZXJNZWRpYVN1Y2Nlc3MnKTtcbiAgICAgICAgICAgICAgICBzdWNjZXNzX2NhbGxiYWNrKHN0cmVhbSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdGYWlsZWQgdG8gZ2V0IGFjY2VzcyB0byBsb2NhbCBtZWRpYS4gRXJyb3IgJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIGlmIChmYWlsdXJlX2NhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIGZhaWx1cmVfY2FsbGJhY2soZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignR1VNIGZhaWxlZDogJywgZSk7XG4gICAgICAgIGlmIChmYWlsdXJlX2NhbGxiYWNrKSB7XG4gICAgICAgICAgICBmYWlsdXJlX2NhbGxiYWNrKGUpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5SVEMucHJvdG90eXBlLm9idGFpbkF1ZGlvQW5kVmlkZW9QZXJtaXNzaW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmdldFVzZXJNZWRpYVdpdGhDb25zdHJhaW50cyhcbiAgICAgICAgWydhdWRpbycsICd2aWRlbyddLFxuICAgICAgICBmdW5jdGlvbiAoYXZTdHJlYW0pIHtcbiAgICAgICAgICAgIFJUQy5oYW5kbGVMb2NhbFN0cmVhbShhdlN0cmVhbSk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignZmFpbGVkIHRvIG9idGFpbiBhdWRpby92aWRlbyBzdHJlYW0gLSBzdG9wJywgZXJyb3IpO1xuICAgICAgICB9LFxuICAgICAgICAgICAgY29uZmlnLnJlc29sdXRpb24gfHwgJzM2MCcpO1xuXG59XG5cblJUQy5oYW5kbGVMb2NhbFN0cmVhbSA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuXG4gICAgdmFyIGF1ZGlvU3RyZWFtID0gbmV3IHdlYmtpdE1lZGlhU3RyZWFtKHN0cmVhbSk7XG4gICAgdmFyIHZpZGVvU3RyZWFtID0gbmV3IHdlYmtpdE1lZGlhU3RyZWFtKHN0cmVhbSk7XG4gICAgdmFyIHZpZGVvVHJhY2tzID0gc3RyZWFtLmdldFZpZGVvVHJhY2tzKCk7XG4gICAgdmFyIGF1ZGlvVHJhY2tzID0gc3RyZWFtLmdldEF1ZGlvVHJhY2tzKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2aWRlb1RyYWNrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBhdWRpb1N0cmVhbS5yZW1vdmVUcmFjayh2aWRlb1RyYWNrc1tpXSk7XG4gICAgfVxuICAgIFJUQ0FjdGl2YXRvci5nZXRSVENTZXJ2aWNlKCkuY3JlYXRlTG9jYWxTdHJlYW0oYXVkaW9TdHJlYW0sIFwiYXVkaW9cIik7XG4gICAgZm9yIChpID0gMDsgaSA8IGF1ZGlvVHJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZpZGVvU3RyZWFtLnJlbW92ZVRyYWNrKGF1ZGlvVHJhY2tzW2ldKTtcbiAgICB9XG4gICAgUlRDQWN0aXZhdG9yLmdldFJUQ1NlcnZpY2UoKS5jcmVhdGVMb2NhbFN0cmVhbSh2aWRlb1N0cmVhbSwgXCJ2aWRlb1wiKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSVEM7IiwidmFyIFJUQ1NlcnZpY2UgPSByZXF1aXJlKFwiLi9SVENTZXJ2aWNlLmpzXCIpO1xuXG52YXIgUlRDQWN0aXZhdG9yID0gKGZ1bmN0aW9uKClcbntcbiAgICB2YXIgcnRjU2VydmljZSA9IG51bGw7XG5cbiAgICBmdW5jdGlvbiBSVENBY3RpdmF0b3JQcm90bygpXG4gICAge1xuICAgICAgICBcbiAgICB9XG5cbiAgICBSVENBY3RpdmF0b3JQcm90by5zdG9wPSAgZnVuY3Rpb24gKCkge1xuICAgICAgICBydGNTZXJ2aWNlLmRpc3Bvc2UoKTtcbiAgICAgICAgcnRjU2VydmljZSA9IG51bGw7XG5cbiAgICB9XG5cblxuICAgIFJUQ0FjdGl2YXRvclByb3RvLnN0YXJ0PSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJ0Y1NlcnZpY2UgPSBuZXcgUlRDU2VydmljZSgpO1xuICAgIH1cblxuICAgIFJUQ0FjdGl2YXRvclByb3RvLmdldFJUQ1NlcnZpY2U9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHJ0Y1NlcnZpY2U7XG4gICAgfVxuXG4gICAgUlRDQWN0aXZhdG9yUHJvdG8uYWRkU3RyZWFtTGlzdGVuZXI9IGZ1bmN0aW9uKGxpc3RlbmVyLCBldmVudFR5cGUpXG4gICAge1xuICAgICAgICBjb25zb2xlLmxvZyhSVENTZXJ2aWNlKTtcbiAgICAgICAgY29uc29sZS5sb2cocmVxdWlyZShcIi4vUlRDU2VydmljZS5qc1wiKSk7XG4gICAgICAgIHJldHVybiBSVENTZXJ2aWNlLmFkZFN0cmVhbUxpc3RlbmVyKGxpc3RlbmVyLCBldmVudFR5cGUpO1xuICAgIH1cblxuICAgIFJUQ0FjdGl2YXRvclByb3RvLnJlbW92ZVN0cmVhbUxpc3RlbmVyPSBmdW5jdGlvbihsaXN0ZW5lciwgZXZlbnRUeXBlKVxuICAgIHtcbiAgICAgICAgcmV0dXJuIFJUQ1NlcnZpY2UucmVtb3ZlU3RyZWFtTGlzdGVuZXIobGlzdGVuZXIsIGV2ZW50VHlwZSk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBSVENBY3RpdmF0b3JQcm90bztcbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gUlRDQWN0aXZhdG9yO1xuIiwidmFyIEV2ZW50RW1taXRlciA9IHJlcXVpcmUoXCJldmVudHNcIik7XG52YXIgUlRDID0gcmVxdWlyZShcIi4vUlRDLmpzXCIpO1xudmFyIFN0cmVhbUV2ZW50VHlwZXMgPSByZXF1aXJlKFwiLi4vc2VydmljZS9SVEMvU3RyZWFtRXZlbnRUeXBlcy5qc1wiKTtcbnZhciBNZWRpYVN0cmVhbSA9IHJlcXVpcmUoXCIuL01lZGlhU3RyZWFtLmpzXCIpO1xuXG5cbnZhciBSVENTZXJ2aWNlID0gZnVuY3Rpb24oKVxue1xuICAgIHZhciBldmVudEVtbWl0ZXIgPSBudWxsO1xuXG4gICAgZnVuY3Rpb24gU3RyZWFtKHN0cmVhbSwgdHlwZSlcbiAgICB7XG4gICAgICAgIHRoaXMuc3RyZWFtID0gc3RyZWFtO1xuICAgICAgICB0aGlzLmV2ZW50RW1taXRlciA9IGV2ZW50RW1taXRlcjtcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICAgICAgZXZlbnRFbW1pdGVyLmVtaXQoU3RyZWFtRXZlbnRUeXBlcy5FVkVOVF9UWVBFX0xPQ0FMX0NSRUFURUQsIHRoaXMpO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHRoaXMuc3RyZWFtLm9uZW5kZWQgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHNlbGYuc3RyZWFtRW5kZWQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIFN0cmVhbS5wcm90b3R5cGUuc3RyZWFtRW5kZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGV2ZW50RW1taXRlci5lbWl0KFN0cmVhbUV2ZW50VHlwZXMuRVZFTlRfVFlQRV9MT0NBTF9FTkRFRCwgdGhpcyk7XG4gICAgfVxuXG4gICAgU3RyZWFtLnByb3RvdHlwZS5nZXRPcmlnaW5hbFN0cmVhbSA9IGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIHJldHVybiB0aGlzLnN0cmVhbTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBSVENTZXJ2aWNlUHJvdG8oKSB7XG4gICAgICAgIHRoaXMucnRjID0gbmV3IFJUQygpO1xuICAgICAgICB0aGlzLnJ0Yy5vYnRhaW5BdWRpb0FuZFZpZGVvUGVybWlzc2lvbnMoKTtcbiAgICAgICAgdGhpcy5sb2NhbFN0cmVhbXMgPSBuZXcgQXJyYXkoKTtcbiAgICAgICAgdGhpcy5yZW1vdGVTdHJlYW1zID0gbmV3IEFycmF5KCk7XG4gICAgICAgIFJUQ1NlcnZpY2UuYWRkU3RyZWFtTGlzdGVuZXIobWF5YmVEb0pvaW4oKSwgU3RyZWFtRXZlbnRUeXBlcy5FVkVOVF9UWVBFX0xPQ0FMX0NSRUFURUQpO1xuICAgIH1cblxuXG4gICAgUlRDU2VydmljZVByb3RvLmFkZFN0cmVhbUxpc3RlbmVyID0gZnVuY3Rpb24gKGxpc3RlbmVyLCBldmVudFR5cGUpIHtcbiAgICAgICAgaWYgKGV2ZW50RW1taXRlciA9PSBudWxsKSB7XG4gICAgICAgICAgICBldmVudEVtbWl0ZXIgPSBuZXcgRXZlbnRFbW1pdGVyKCk7XG4gICAgICAgIH1cblxuICAgICAgICBldmVudEVtbWl0ZXIub24oZXZlbnRUeXBlLCBsaXN0ZW5lcik7XG4gICAgfTtcblxuICAgIFJUQ1NlcnZpY2VQcm90by5yZW1vdmVTdHJlYW1MaXN0ZW5lciA9IGZ1bmN0aW9uIChsaXN0ZW5lciwgZXZlbnRUeXBlKSB7XG4gICAgICAgIGlmKCEoZXZlbnRUeXBlIGluc3RhbmNlb2YgU3RlYW1FdmVudFR5cGUpKVxuICAgICAgICAgICAgdGhyb3cgXCJJbGxlZ2FsIGFyZ3VtZW50XCI7XG5cbiAgICAgICAgaWYgKGV2ZW50RW1taXRlciA9PSBudWxsKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBldmVudEVtbWl0ZXIucmVtb3ZlTGlzdGVuZXIoZXZlbnRUeXBlLCBsaXN0ZW5lcik7XG4gICAgfTtcblxuICAgIFJUQ1NlcnZpY2VQcm90by5wcm90b3R5cGUuY3JlYXRlTG9jYWxTdHJlYW0gPSBmdW5jdGlvbiAoc3RyZWFtLCB0eXBlKSB7XG4gICAgICAgIHZhciBsb2NhbFN0cmVhbSA9ICBuZXcgU3RyZWFtKHN0cmVhbSwgdHlwZSk7XG4gICAgICAgIHRoaXMubG9jYWxTdHJlYW1zLnB1c2gobG9jYWxTdHJlYW0pO1xuICAgICAgICByZXR1cm4gbG9jYWxTdHJlYW07XG4gICAgfTtcbiAgICBcbiAgICBSVENTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLmNyZWF0ZVJlbW90ZVN0cmVhbSA9IGZ1bmN0aW9uIChkYXRhLCBzaWQsIHRoZXNzcmMpIHtcbiAgICAgICAgdmFyIHJlbW90ZVN0cmVhbSA9IG5ldyBNZWRpYVN0cmVhbShkYXRhLCBzaWQsIHRoZXNzcmMsIGV2ZW50RW1taXRlcik7XG4gICAgICAgIHRoaXMucmVtb3RlU3RyZWFtcy5wdXNoKHJlbW90ZVN0cmVhbSk7XG4gICAgICAgIHJldHVybiByZW1vdGVTdHJlYW07XG4gICAgfVxuXG4gICAgUlRDU2VydmljZVByb3RvLnByb3RvdHlwZS5nZXRCcm93c2VyVHlwZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucnRjLmJyb3dzZXI7XG4gICAgfTtcblxuICAgIFJUQ1NlcnZpY2VQcm90by5wcm90b3R5cGUuZ2V0UENDb25zdHJhaW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucnRjLnBjX2NvbnN0cmFpbnRzO1xuICAgIH07XG5cbiAgICBSVENTZXJ2aWNlUHJvdG8ucHJvdG90eXBlLmdldFVzZXJNZWRpYVdpdGhDb25zdHJhaW50cyA9XG4gICAgICAgIGZ1bmN0aW9uKHVtLCBzdWNjZXNzX2NhbGxiYWNrLCBmYWlsdXJlX2NhbGxiYWNrLCByZXNvbHV0aW9uLCBiYW5kd2lkdGgsIGZwcywgZGVza3RvcFN0cmVhbSlcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucnRjLmdldFVzZXJNZWRpYVdpdGhDb25zdHJhaW50cyh1bSwgc3VjY2Vzc19jYWxsYmFjaywgZmFpbHVyZV9jYWxsYmFjaywgcmVzb2x1dGlvbiwgYmFuZHdpZHRoLCBmcHMsIGRlc2t0b3BTdHJlYW0pO1xuICAgICAgICB9O1xuXG4gICAgUlRDU2VydmljZVByb3RvLnByb3RvdHlwZS5kaXNwb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChldmVudEVtbWl0ZXIpIHtcbiAgICAgICAgICAgIGV2ZW50RW1taXRlci5yZW1vdmVBbGxMaXN0ZW5lcnMoXCJzdGF0aXN0aWNzLmF1ZGlvTGV2ZWxcIik7XG4gICAgICAgICAgICBldmVudEVtbWl0ZXIgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMucnRjKSB7XG4gICAgICAgICAgICB0aGlzLnJ0YyA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gUlRDU2VydmljZVByb3RvO1xufSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJUQ1NlcnZpY2U7XG4iLCJ2YXIgUlRDQnJvd3NlclR5cGUgPSB7XG4gICAgUlRDX0JST1dTRVJfQ0hST01FOiBcInJ0Y19icm93c2VyLmNocm9tZVwiLFxuXG4gICAgUlRDX0JST1dTRVJfRklSRUZPWDogXCJydGNfYnJvd3Nlci5maXJlZm94XCJcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUlRDQnJvd3NlclR5cGU7IiwidmFyIFN0cmVhbUV2ZW50VHlwZXMgPSB7XG4gICAgRVZFTlRfVFlQRV9MT0NBTF9DUkVBVEVEOiBcInN0cmVhbS5sb2NhbF9jcmVhdGVkXCIsXG5cbiAgICBFVkVOVF9UWVBFX0xPQ0FMX0VOREVEOiBcInN0cmVhbS5sb2NhbF9lbmRlZFwiLFxuXG4gICAgRVZFTlRfVFlQRV9SRU1PVEVfQ1JFQVRFRDogXCJzdHJlYW0ucmVtb3RlX2NyZWF0ZWRcIixcblxuICAgIEVWRU5UX1RZUEVfUkVNT1RFX0VOREVEOiBcInN0cmVhbS5yZW1vdGVfZW5kZWRcIlxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdHJlYW1FdmVudFR5cGVzOyIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiJdfQ==
