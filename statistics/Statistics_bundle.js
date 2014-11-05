!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.StatisticsActivator=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var StreamEventTypes = {
    EVENT_TYPE_LOCAL_CREATED: "stream.local_created",

    EVENT_TYPE_LOCAL_ENDED: "stream.local_ended",

    EVENT_TYPE_REMOTE_CREATED: "stream.remote_created",

    EVENT_TYPE_REMOTE_ENDED: "stream.remote_ended"
};

module.exports = StreamEventTypes;
},{}],2:[function(require,module,exports){
/**
 * Created by hristo on 10/29/14.
 */
var XMPPEvents = {
    CONFERENCE_CERATED: "xmpp.conferenceCreated.jingle",
    CALL_TERMINATED: "xmpp.callterminated.jingle",
    CALL_INCOMING: "xmpp.callincoming.jingle",
    DISPOSE_CONFERENCE: "xmpp.dispoce_confernce",
    DISPLAY_NAME_CHANGED: "xmpp.display_name_changed"

};
module.exports = XMPPEvents;
},{}],3:[function(require,module,exports){
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
    function LocalStatsCollectorProto(stream, interval, eventEmitter) {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.stream = stream;
        this.intervalId = null;
        this.intervalMilis = interval;
        this.eventEmitter = eventEmitter;
        this.audioLevel = 0;
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
                    if(!RTCActivator.getRTCService().localAudio.isMuted())
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
},{}],4:[function(require,module,exports){
/* global ssrc2jid */

/**
 * Function object which once created can be used to calculate moving average of
 * given period. Example for SMA3:</br>
 * var sma3 = new SimpleMovingAverager(3);
 * while(true) // some update loop
 * {
 *   var currentSma3Value = sma3(nextInputValue);
 * }
 *
 * @param period moving average period that will be used by created instance.
 * @returns {Function} SMA calculator function of given <tt>period</tt>.
 * @constructor
 */
function SimpleMovingAverager(period)
{
    var nums = [];
    return function (num)
    {
        nums.push(num);
        if (nums.length > period)
            nums.splice(0, 1);
        var sum = 0;
        for (var i in nums)
            sum += nums[i];
        var n = period;
        if (nums.length < period)
            n = nums.length;
        return (sum / n);
    };
}

/**
 * Peer statistics data holder.
 * @constructor
 */
function PeerStats()
{
    this.ssrc2Loss = {};
    this.ssrc2AudioLevel = {};
}

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
 * Calculates average packet loss for all streams that belong to the peer
 * represented by this instance.
 * @returns {number} average packet loss for all streams that belong to the peer
 *                   represented by this instance.
 */
PeerStats.prototype.getAvgLoss = function ()
{
    var self = this;
    var avg = 0;
    var count = Object.keys(this.ssrc2Loss).length;
    Object.keys(this.ssrc2Loss).forEach(
        function (ssrc)
        {
            avg += self.ssrc2Loss[ssrc];
        }
    );
    return count > 0 ? avg / count : 0;
};

/**
 * <tt>StatsCollector</tt> registers for stats updates of given
 * <tt>peerconnection</tt> in given <tt>interval</tt>. On each update particular
 * stats are extracted and put in {@link PeerStats} objects. Once the processing
 * is done <tt>updateCallback</tt> is called with <tt>this</tt> instance as
 * an event source.
 *
 * @param peerconnection webRTC peer connection object.
 * @param interval stats refresh interval given in ms.
 * @param {function(StatsCollector)} updateCallback the callback called on stats
 *                                   update.
 * @constructor
 */
function StatsCollector(peerconnection, interval, eventEmmiter)
{
    this.peerconnection = peerconnection;
    this.baselineReport = null;
    this.currentReport = null;
    this.intervalId = null;
    // Updates stats interval
    this.intervalMilis = interval;
    // Use SMA 3 to average packet loss changes over time
    this.sma3 = new SimpleMovingAverager(3);
    // Map of jids to PeerStats
    this.jid2stats = {};

    this.eventEmmiter = eventEmmiter;
}

module.exports = StatsCollector;

/**
 * Stops stats updates.
 */
StatsCollector.prototype.stop = function ()
{
    if (this.intervalId)
    {
        clearInterval(this.intervalId);
        this.intervalId = null;
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
    this.intervalId = setInterval(
        function ()
        {
            // Interval updates
            self.peerconnection.getStats(
                function (report)
                {
                    var results = report.result();
                    //console.error("Got interval report", results);
                    self.currentReport = results;
                    self.processReport();
                    self.baselineReport = self.currentReport;
                },
                self.errorCallback
            );
        },
        self.intervalMilis
    );
};

/**
 * Stats processing logic.
 */
StatsCollector.prototype.processReport = function ()
{
    if (!this.baselineReport)
    {
        return;
    }

    for (var idx in this.currentReport)
    {
        var now = this.currentReport[idx];
        if (now.type != 'ssrc')
        {
            continue;
        }

        var before = this.baselineReport[idx];
        if (!before)
        {
            console.warn(now.stat('ssrc') + ' not enough data');
            continue;
        }

        var ssrc = now.stat('ssrc');
        var jid = XMPPActivator.getJIDFromSSRC(ssrc);
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
        var audioLevel = now.stat('audioInputLevel');
        if (!audioLevel)
            audioLevel = now.stat('audioOutputLevel');
        if (audioLevel)
        {
            // TODO: can't find specs about what this value really is,
            // but it seems to vary between 0 and around 32k.
            audioLevel = audioLevel / 32767;
            jidStats.setSsrcAudioLevel(ssrc, audioLevel);
            //my roomjid shouldn't be global
            if(jid != XMPPActivator.getMyJID())
                this.eventEmmiter.emit("statistics.audioLevel", Strophe.getResourceFromJid(jid), audioLevel);
        }

        var key = 'packetsReceived';
        if (!now.stat(key))
        {
            key = 'packetsSent';
            if (!now.stat(key))
            {
                console.error("No packetsReceived nor packetSent stat found");
                this.stop();
                return;
            }
        }
        var packetsNow = now.stat(key);
        var packetsBefore = before.stat(key);
        var packetRate = packetsNow - packetsBefore;

        var currentLoss = now.stat('packetsLost');
        var previousLoss = before.stat('packetsLost');
        var lossRate = currentLoss - previousLoss;

        var packetsTotal = (packetRate + lossRate);
        var lossPercent;

        if (packetsTotal > 0)
            lossPercent = lossRate / packetsTotal;
        else
            lossPercent = 0;

        //console.info(jid + " ssrc: " + ssrc + " " + key + ": " + packetsNow);

        jidStats.setSsrcLoss(ssrc, lossPercent);
    }

    var self = this;
    // Jid stats
    var allPeersAvg = 0;
    var jids = Object.keys(this.jid2stats);
    jids.forEach(
        function (jid)
        {
            var peerAvg = self.jid2stats[jid].getAvgLoss(
                function (avg)
                {
                    //console.info(jid + " stats: " + (avg * 100) + " %");
                    allPeersAvg += avg;
                }
            );
        }
    );

    if (jids.length > 1)
    {
        // Our streams loss is reported as 0 always, so -1 to length
        allPeersAvg = allPeersAvg / (jids.length - 1);

        /**
         * Calculates number of connection quality bars from 4(hi) to 0(lo).
         */
        var outputAvg = self.sma3(allPeersAvg);
        // Linear from 4(0%) to 0(25%).
        var quality = Math.round(4 - outputAvg * 16);
        quality = Math.max(quality, 0); // lower limit 0
        quality = Math.min(quality, 4); // upper limit 4
        // TODO: quality can be used to indicate connection quality using 4 step
        // bar indicator
        //console.info("Loss SMA3: " + outputAvg + " Q: " + quality);
    }
};


},{}],5:[function(require,module,exports){
/**
 * Created by hristo on 8/4/14.
 */
var LocalStats = require("./LocalStatsCollector.js");
var RTPStats = require("./RTPStatsCollector.js");
var EventEmitter = require("events");
var StreamEventTypes = require("../service/RTC/StreamEventTypes.js");
var XMPPEvents = require("../service/xmpp/XMPPEvents");

var StatisticsActivator = function()
{
    var eventEmmiter = new EventEmitter();

    var localStats = null;

    var rtpStats = null;

    function StatisticsActivatorProto()
    {

    }

    StatisticsActivatorProto.LOCAL_JID = 'local';

    StatisticsActivatorProto.addAudioLevelListener = function(listener)
    {
        eventEmmiter.on("statistics.audioLevel", listener);
    }

    StatisticsActivatorProto.removeAudioLevelListener = function(listener)
    {
        eventEmmiter.removeListener("statistics.audioLevel", listener);
    }

    StatisticsActivatorProto.stop = function () {
        if(eventEmmiter)
        {
            eventEmmiter.removeAllListeners("statistics.audioLevel");
        }
        stopLocal();
        stopRemote();

    }

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
            rtpStats = null;
        }
    }

    StatisticsActivatorProto.start = function () {
        RTCActivator.addStreamListener(StatisticsActivator.onStreamCreated,
            StreamEventTypes.EVENT_TYPE_LOCAL_CREATED);
        XMPPActivator.addListener(XMPPEvents.CONFERENCE_CERATED, function (event) {
            startRemoteStats(event.peerconnection);
        });
        XMPPActivator.addListener(XMPPEvents.CALL_INCOMING, function (event) {
            startRemoteStats(event.peerconnection);
        });
        XMPPActivator.addListener(XMPPEvents.DISPOSE_CONFERENCE, function (onUnload) {
            stopRemote();
            if(onUnload) {
                stopLocal();
            }
        });
    }

    StatisticsActivatorProto.onStreamCreated = function(stream)
    {
        if(!stream.isAudioStream())
            return;

        localStats = new LocalStats(stream.getOriginalStream(), 100, eventEmmiter);
        localStats.start();
    }

    function startRemoteStats (peerconnection) {
        if (config.enableRtpStats)
        {
            if(rtpStats)
            {
                rtpStats.stop();
                rtpStats = null;
            }

            rtpStats = new RTPStats(peerconnection, 200, eventEmmiter);
            rtpStats.start();
        }

    }

    return StatisticsActivatorProto;

}();




module.exports = StatisticsActivator;
},{"../service/RTC/StreamEventTypes.js":1,"../service/xmpp/XMPPEvents":2,"./LocalStatsCollector.js":3,"./RTPStatsCollector.js":4,"events":6}],6:[function(require,module,exports){
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

},{}]},{},[5])(5)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9zZXJ2aWNlL1JUQy9TdHJlYW1FdmVudFR5cGVzLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvc2VydmljZS94bXBwL1hNUFBFdmVudHMuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9zdGF0aXN0aWNzL0xvY2FsU3RhdHNDb2xsZWN0b3IuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9zdGF0aXN0aWNzL1JUUFN0YXRzQ29sbGVjdG9yLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvc3RhdGlzdGljcy9TdGF0aXN0aWNzQWN0aXZhdG9yLmpzIiwiL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgU3RyZWFtRXZlbnRUeXBlcyA9IHtcbiAgICBFVkVOVF9UWVBFX0xPQ0FMX0NSRUFURUQ6IFwic3RyZWFtLmxvY2FsX2NyZWF0ZWRcIixcblxuICAgIEVWRU5UX1RZUEVfTE9DQUxfRU5ERUQ6IFwic3RyZWFtLmxvY2FsX2VuZGVkXCIsXG5cbiAgICBFVkVOVF9UWVBFX1JFTU9URV9DUkVBVEVEOiBcInN0cmVhbS5yZW1vdGVfY3JlYXRlZFwiLFxuXG4gICAgRVZFTlRfVFlQRV9SRU1PVEVfRU5ERUQ6IFwic3RyZWFtLnJlbW90ZV9lbmRlZFwiXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0cmVhbUV2ZW50VHlwZXM7IiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGhyaXN0byBvbiAxMC8yOS8xNC5cbiAqL1xudmFyIFhNUFBFdmVudHMgPSB7XG4gICAgQ09ORkVSRU5DRV9DRVJBVEVEOiBcInhtcHAuY29uZmVyZW5jZUNyZWF0ZWQuamluZ2xlXCIsXG4gICAgQ0FMTF9URVJNSU5BVEVEOiBcInhtcHAuY2FsbHRlcm1pbmF0ZWQuamluZ2xlXCIsXG4gICAgQ0FMTF9JTkNPTUlORzogXCJ4bXBwLmNhbGxpbmNvbWluZy5qaW5nbGVcIixcbiAgICBESVNQT1NFX0NPTkZFUkVOQ0U6IFwieG1wcC5kaXNwb2NlX2NvbmZlcm5jZVwiLFxuICAgIERJU1BMQVlfTkFNRV9DSEFOR0VEOiBcInhtcHAuZGlzcGxheV9uYW1lX2NoYW5nZWRcIlxuXG59O1xubW9kdWxlLmV4cG9ydHMgPSBYTVBQRXZlbnRzOyIsIi8qKlxuICogUHJvdmlkZXMgc3RhdGlzdGljcyBmb3IgdGhlIGxvY2FsIHN0cmVhbS5cbiAqL1xudmFyIExvY2FsU3RhdHNDb2xsZWN0b3IgPSAoZnVuY3Rpb24oKSB7XG4gICAgLyoqXG4gICAgICogU2l6ZSBvZiB0aGUgd2ViYXVkaW8gYW5hbGl6ZXIgYnVmZmVyLlxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgdmFyIFdFQkFVRElPX0FOQUxJWkVSX0ZGVF9TSVpFID0gMjA0ODtcblxuICAgIC8qKlxuICAgICAqIFZhbHVlIG9mIHRoZSB3ZWJhdWRpbyBhbmFsaXplciBzbW9vdGhpbmcgdGltZSBwYXJhbWV0ZXIuXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICB2YXIgV0VCQVVESU9fQU5BTElaRVJfU01PT1RJTkdfVElNRSA9IDAuODtcblxuICAgIC8qKlxuICAgICAqIDx0dD5Mb2NhbFN0YXRzQ29sbGVjdG9yPC90dD4gY2FsY3VsYXRlcyBzdGF0aXN0aWNzIGZvciB0aGUgbG9jYWwgc3RyZWFtLlxuICAgICAqXG4gICAgICogQHBhcmFtIHN0cmVhbSB0aGUgbG9jYWwgc3RyZWFtXG4gICAgICogQHBhcmFtIGludGVydmFsIHN0YXRzIHJlZnJlc2ggaW50ZXJ2YWwgZ2l2ZW4gaW4gbXMuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbihMb2NhbFN0YXRzQ29sbGVjdG9yKX0gdXBkYXRlQ2FsbGJhY2sgdGhlIGNhbGxiYWNrIGNhbGxlZCBvbiBzdGF0c1xuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGUuXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gTG9jYWxTdGF0c0NvbGxlY3RvclByb3RvKHN0cmVhbSwgaW50ZXJ2YWwsIGV2ZW50RW1pdHRlcikge1xuICAgICAgICB3aW5kb3cuQXVkaW9Db250ZXh0ID0gd2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0O1xuICAgICAgICB0aGlzLnN0cmVhbSA9IHN0cmVhbTtcbiAgICAgICAgdGhpcy5pbnRlcnZhbElkID0gbnVsbDtcbiAgICAgICAgdGhpcy5pbnRlcnZhbE1pbGlzID0gaW50ZXJ2YWw7XG4gICAgICAgIHRoaXMuZXZlbnRFbWl0dGVyID0gZXZlbnRFbWl0dGVyO1xuICAgICAgICB0aGlzLmF1ZGlvTGV2ZWwgPSAwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFN0YXJ0cyB0aGUgY29sbGVjdGluZyB0aGUgc3RhdGlzdGljcy5cbiAgICAgKi9cbiAgICBMb2NhbFN0YXRzQ29sbGVjdG9yUHJvdG8ucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXdpbmRvdy5BdWRpb0NvbnRleHQpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgdmFyIGNvbnRleHQgPSBuZXcgQXVkaW9Db250ZXh0KCk7XG4gICAgICAgIHZhciBhbmFseXNlciA9IGNvbnRleHQuY3JlYXRlQW5hbHlzZXIoKTtcbiAgICAgICAgYW5hbHlzZXIuc21vb3RoaW5nVGltZUNvbnN0YW50ID0gV0VCQVVESU9fQU5BTElaRVJfU01PT1RJTkdfVElNRTtcbiAgICAgICAgYW5hbHlzZXIuZmZ0U2l6ZSA9IFdFQkFVRElPX0FOQUxJWkVSX0ZGVF9TSVpFO1xuXG5cbiAgICAgICAgdmFyIHNvdXJjZSA9IGNvbnRleHQuY3JlYXRlTWVkaWFTdHJlYW1Tb3VyY2UodGhpcy5zdHJlYW0pO1xuICAgICAgICBzb3VyY2UuY29ubmVjdChhbmFseXNlcik7XG5cblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdGhpcy5pbnRlcnZhbElkID0gc2V0SW50ZXJ2YWwoXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoYW5hbHlzZXIuZnJlcXVlbmN5QmluQ291bnQpO1xuICAgICAgICAgICAgICAgIGFuYWx5c2VyLmdldEJ5dGVUaW1lRG9tYWluRGF0YShhcnJheSk7XG4gICAgICAgICAgICAgICAgdmFyIGF1ZGlvTGV2ZWwgPSBUaW1lRG9tYWluRGF0YVRvQXVkaW9MZXZlbChhcnJheSk7XG4gICAgICAgICAgICAgICAgaWYoYXVkaW9MZXZlbCAhPSBzZWxmLmF1ZGlvTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5hdWRpb0xldmVsID0gYW5pbWF0ZUxldmVsKGF1ZGlvTGV2ZWwsIHNlbGYuYXVkaW9MZXZlbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmKCFSVENBY3RpdmF0b3IuZ2V0UlRDU2VydmljZSgpLmxvY2FsQXVkaW8uaXNNdXRlZCgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5ldmVudEVtaXR0ZXIuZW1pdChcInN0YXRpc3RpY3MuYXVkaW9MZXZlbFwiLCBMb2NhbFN0YXRzQ29sbGVjdG9yUHJvdG8uTE9DQUxfSklELFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuYXVkaW9MZXZlbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRoaXMuaW50ZXJ2YWxNaWxpc1xuICAgICAgICApO1xuXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFN0b3BzIGNvbGxlY3RpbmcgdGhlIHN0YXRpc3RpY3MuXG4gICAgICovXG4gICAgTG9jYWxTdGF0c0NvbGxlY3RvclByb3RvLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5pbnRlcnZhbElkKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMuaW50ZXJ2YWxJZCk7XG4gICAgICAgICAgICB0aGlzLmludGVydmFsSWQgPSBudWxsO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIHRpbWUgZG9tYWluIGRhdGEgYXJyYXkgdG8gYXVkaW8gbGV2ZWwuXG4gICAgICogQHBhcmFtIGFycmF5IHRoZSB0aW1lIGRvbWFpbiBkYXRhIGFycmF5LlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IHRoZSBhdWRpbyBsZXZlbFxuICAgICAqL1xuICAgIHZhciBUaW1lRG9tYWluRGF0YVRvQXVkaW9MZXZlbCA9IGZ1bmN0aW9uIChzYW1wbGVzKSB7XG5cbiAgICAgICAgdmFyIG1heFZvbHVtZSA9IDA7XG5cbiAgICAgICAgdmFyIGxlbmd0aCA9IHNhbXBsZXMubGVuZ3RoO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChtYXhWb2x1bWUgPCBzYW1wbGVzW2ldKVxuICAgICAgICAgICAgICAgIG1heFZvbHVtZSA9IHNhbXBsZXNbaV07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdCgoKG1heFZvbHVtZSAtIDEyNykgLyAxMjgpLnRvRml4ZWQoMykpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBbmltYXRlcyBhdWRpbyBsZXZlbCBjaGFuZ2VcbiAgICAgKiBAcGFyYW0gbmV3TGV2ZWwgdGhlIG5ldyBhdWRpbyBsZXZlbFxuICAgICAqIEBwYXJhbSBsYXN0TGV2ZWwgdGhlIGxhc3QgYXVkaW8gbGV2ZWxcbiAgICAgKiBAcmV0dXJucyB7TnVtYmVyfSB0aGUgYXVkaW8gbGV2ZWwgdG8gYmUgc2V0XG4gICAgICovXG4gICAgZnVuY3Rpb24gYW5pbWF0ZUxldmVsKG5ld0xldmVsLCBsYXN0TGV2ZWwpXG4gICAge1xuICAgICAgICB2YXIgdmFsdWUgPSAwO1xuICAgICAgICB2YXIgZGlmZiA9IGxhc3RMZXZlbCAtIG5ld0xldmVsO1xuICAgICAgICBpZihkaWZmID4gMC4yKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YWx1ZSA9IGxhc3RMZXZlbCAtIDAuMjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKGRpZmYgPCAtMC40KVxuICAgICAgICB7XG4gICAgICAgICAgICB2YWx1ZSA9IGxhc3RMZXZlbCArIDAuNDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhbHVlID0gbmV3TGV2ZWw7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdCh2YWx1ZS50b0ZpeGVkKDMpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbmRpY2F0ZXMgdGhhdCB0aGlzIGF1ZGlvIGxldmVsIGlzIGZvciBsb2NhbCBqaWQuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBMb2NhbFN0YXRzQ29sbGVjdG9yUHJvdG8uTE9DQUxfSklEID0gJ2xvY2FsJztcblxuICAgIHJldHVybiBMb2NhbFN0YXRzQ29sbGVjdG9yUHJvdG87XG59KSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IExvY2FsU3RhdHNDb2xsZWN0b3I7IiwiLyogZ2xvYmFsIHNzcmMyamlkICovXG5cbi8qKlxuICogRnVuY3Rpb24gb2JqZWN0IHdoaWNoIG9uY2UgY3JlYXRlZCBjYW4gYmUgdXNlZCB0byBjYWxjdWxhdGUgbW92aW5nIGF2ZXJhZ2Ugb2ZcbiAqIGdpdmVuIHBlcmlvZC4gRXhhbXBsZSBmb3IgU01BMzo8L2JyPlxuICogdmFyIHNtYTMgPSBuZXcgU2ltcGxlTW92aW5nQXZlcmFnZXIoMyk7XG4gKiB3aGlsZSh0cnVlKSAvLyBzb21lIHVwZGF0ZSBsb29wXG4gKiB7XG4gKiAgIHZhciBjdXJyZW50U21hM1ZhbHVlID0gc21hMyhuZXh0SW5wdXRWYWx1ZSk7XG4gKiB9XG4gKlxuICogQHBhcmFtIHBlcmlvZCBtb3ZpbmcgYXZlcmFnZSBwZXJpb2QgdGhhdCB3aWxsIGJlIHVzZWQgYnkgY3JlYXRlZCBpbnN0YW5jZS5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gU01BIGNhbGN1bGF0b3IgZnVuY3Rpb24gb2YgZ2l2ZW4gPHR0PnBlcmlvZDwvdHQ+LlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFNpbXBsZU1vdmluZ0F2ZXJhZ2VyKHBlcmlvZClcbntcbiAgICB2YXIgbnVtcyA9IFtdO1xuICAgIHJldHVybiBmdW5jdGlvbiAobnVtKVxuICAgIHtcbiAgICAgICAgbnVtcy5wdXNoKG51bSk7XG4gICAgICAgIGlmIChudW1zLmxlbmd0aCA+IHBlcmlvZClcbiAgICAgICAgICAgIG51bXMuc3BsaWNlKDAsIDEpO1xuICAgICAgICB2YXIgc3VtID0gMDtcbiAgICAgICAgZm9yICh2YXIgaSBpbiBudW1zKVxuICAgICAgICAgICAgc3VtICs9IG51bXNbaV07XG4gICAgICAgIHZhciBuID0gcGVyaW9kO1xuICAgICAgICBpZiAobnVtcy5sZW5ndGggPCBwZXJpb2QpXG4gICAgICAgICAgICBuID0gbnVtcy5sZW5ndGg7XG4gICAgICAgIHJldHVybiAoc3VtIC8gbik7XG4gICAgfTtcbn1cblxuLyoqXG4gKiBQZWVyIHN0YXRpc3RpY3MgZGF0YSBob2xkZXIuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gUGVlclN0YXRzKClcbntcbiAgICB0aGlzLnNzcmMyTG9zcyA9IHt9O1xuICAgIHRoaXMuc3NyYzJBdWRpb0xldmVsID0ge307XG59XG5cbi8qKlxuICogU2V0cyBwYWNrZXRzIGxvc3MgcmF0ZSBmb3IgZ2l2ZW4gPHR0PnNzcmM8L3R0PiB0aGF0IGJsb25nIHRvIHRoZSBwZWVyXG4gKiByZXByZXNlbnRlZCBieSB0aGlzIGluc3RhbmNlLlxuICogQHBhcmFtIHNzcmMgYXVkaW8gb3IgdmlkZW8gUlRQIHN0cmVhbSBTU1JDLlxuICogQHBhcmFtIGxvc3NSYXRlIG5ldyBwYWNrZXQgbG9zcyByYXRlIHZhbHVlIHRvIGJlIHNldC5cbiAqL1xuUGVlclN0YXRzLnByb3RvdHlwZS5zZXRTc3JjTG9zcyA9IGZ1bmN0aW9uIChzc3JjLCBsb3NzUmF0ZSlcbntcbiAgICB0aGlzLnNzcmMyTG9zc1tzc3JjXSA9IGxvc3NSYXRlO1xufTtcblxuLyoqXG4gKiBTZXRzIG5ldyBhdWRpbyBsZXZlbChpbnB1dCBvciBvdXRwdXQpIGZvciBnaXZlbiA8dHQ+c3NyYzwvdHQ+IHRoYXQgaWRlbnRpZmllc1xuICogdGhlIHN0cmVhbSB3aGljaCBiZWxvbmdzIHRvIHRoZSBwZWVyIHJlcHJlc2VudGVkIGJ5IHRoaXMgaW5zdGFuY2UuXG4gKiBAcGFyYW0gc3NyYyBSVFAgc3RyZWFtIFNTUkMgZm9yIHdoaWNoIGN1cnJlbnQgYXVkaW8gbGV2ZWwgdmFsdWUgd2lsbCBiZVxuICogICAgICAgIHVwZGF0ZWQuXG4gKiBAcGFyYW0gYXVkaW9MZXZlbCB0aGUgbmV3IGF1ZGlvIGxldmVsIHZhbHVlIHRvIGJlIHNldC4gVmFsdWUgaXMgdHJ1bmNhdGVkIHRvXG4gKiAgICAgICAgZml0IHRoZSByYW5nZSBmcm9tIDAgdG8gMS5cbiAqL1xuUGVlclN0YXRzLnByb3RvdHlwZS5zZXRTc3JjQXVkaW9MZXZlbCA9IGZ1bmN0aW9uIChzc3JjLCBhdWRpb0xldmVsKVxue1xuICAgIC8vIFJhbmdlIGxpbWl0IDAgLSAxXG4gICAgdGhpcy5zc3JjMkF1ZGlvTGV2ZWxbc3NyY10gPSBNYXRoLm1pbihNYXRoLm1heChhdWRpb0xldmVsLCAwKSwgMSk7XG59O1xuXG4vKipcbiAqIENhbGN1bGF0ZXMgYXZlcmFnZSBwYWNrZXQgbG9zcyBmb3IgYWxsIHN0cmVhbXMgdGhhdCBiZWxvbmcgdG8gdGhlIHBlZXJcbiAqIHJlcHJlc2VudGVkIGJ5IHRoaXMgaW5zdGFuY2UuXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBhdmVyYWdlIHBhY2tldCBsb3NzIGZvciBhbGwgc3RyZWFtcyB0aGF0IGJlbG9uZyB0byB0aGUgcGVlclxuICogICAgICAgICAgICAgICAgICAgcmVwcmVzZW50ZWQgYnkgdGhpcyBpbnN0YW5jZS5cbiAqL1xuUGVlclN0YXRzLnByb3RvdHlwZS5nZXRBdmdMb3NzID0gZnVuY3Rpb24gKClcbntcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGF2ZyA9IDA7XG4gICAgdmFyIGNvdW50ID0gT2JqZWN0LmtleXModGhpcy5zc3JjMkxvc3MpLmxlbmd0aDtcbiAgICBPYmplY3Qua2V5cyh0aGlzLnNzcmMyTG9zcykuZm9yRWFjaChcbiAgICAgICAgZnVuY3Rpb24gKHNzcmMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGF2ZyArPSBzZWxmLnNzcmMyTG9zc1tzc3JjXTtcbiAgICAgICAgfVxuICAgICk7XG4gICAgcmV0dXJuIGNvdW50ID4gMCA/IGF2ZyAvIGNvdW50IDogMDtcbn07XG5cbi8qKlxuICogPHR0PlN0YXRzQ29sbGVjdG9yPC90dD4gcmVnaXN0ZXJzIGZvciBzdGF0cyB1cGRhdGVzIG9mIGdpdmVuXG4gKiA8dHQ+cGVlcmNvbm5lY3Rpb248L3R0PiBpbiBnaXZlbiA8dHQ+aW50ZXJ2YWw8L3R0Pi4gT24gZWFjaCB1cGRhdGUgcGFydGljdWxhclxuICogc3RhdHMgYXJlIGV4dHJhY3RlZCBhbmQgcHV0IGluIHtAbGluayBQZWVyU3RhdHN9IG9iamVjdHMuIE9uY2UgdGhlIHByb2Nlc3NpbmdcbiAqIGlzIGRvbmUgPHR0PnVwZGF0ZUNhbGxiYWNrPC90dD4gaXMgY2FsbGVkIHdpdGggPHR0PnRoaXM8L3R0PiBpbnN0YW5jZSBhc1xuICogYW4gZXZlbnQgc291cmNlLlxuICpcbiAqIEBwYXJhbSBwZWVyY29ubmVjdGlvbiB3ZWJSVEMgcGVlciBjb25uZWN0aW9uIG9iamVjdC5cbiAqIEBwYXJhbSBpbnRlcnZhbCBzdGF0cyByZWZyZXNoIGludGVydmFsIGdpdmVuIGluIG1zLlxuICogQHBhcmFtIHtmdW5jdGlvbihTdGF0c0NvbGxlY3Rvcil9IHVwZGF0ZUNhbGxiYWNrIHRoZSBjYWxsYmFjayBjYWxsZWQgb24gc3RhdHNcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGUuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gU3RhdHNDb2xsZWN0b3IocGVlcmNvbm5lY3Rpb24sIGludGVydmFsLCBldmVudEVtbWl0ZXIpXG57XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbiA9IHBlZXJjb25uZWN0aW9uO1xuICAgIHRoaXMuYmFzZWxpbmVSZXBvcnQgPSBudWxsO1xuICAgIHRoaXMuY3VycmVudFJlcG9ydCA9IG51bGw7XG4gICAgdGhpcy5pbnRlcnZhbElkID0gbnVsbDtcbiAgICAvLyBVcGRhdGVzIHN0YXRzIGludGVydmFsXG4gICAgdGhpcy5pbnRlcnZhbE1pbGlzID0gaW50ZXJ2YWw7XG4gICAgLy8gVXNlIFNNQSAzIHRvIGF2ZXJhZ2UgcGFja2V0IGxvc3MgY2hhbmdlcyBvdmVyIHRpbWVcbiAgICB0aGlzLnNtYTMgPSBuZXcgU2ltcGxlTW92aW5nQXZlcmFnZXIoMyk7XG4gICAgLy8gTWFwIG9mIGppZHMgdG8gUGVlclN0YXRzXG4gICAgdGhpcy5qaWQyc3RhdHMgPSB7fTtcblxuICAgIHRoaXMuZXZlbnRFbW1pdGVyID0gZXZlbnRFbW1pdGVyO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFN0YXRzQ29sbGVjdG9yO1xuXG4vKipcbiAqIFN0b3BzIHN0YXRzIHVwZGF0ZXMuXG4gKi9cblN0YXRzQ29sbGVjdG9yLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24gKClcbntcbiAgICBpZiAodGhpcy5pbnRlcnZhbElkKVxuICAgIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLmludGVydmFsSWQpO1xuICAgICAgICB0aGlzLmludGVydmFsSWQgPSBudWxsO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ2FsbGJhY2sgcGFzc2VkIHRvIDx0dD5nZXRTdGF0czwvdHQ+IG1ldGhvZC5cbiAqIEBwYXJhbSBlcnJvciBhbiBlcnJvciB0aGF0IG9jY3VycmVkIG9uIDx0dD5nZXRTdGF0czwvdHQ+IGNhbGwuXG4gKi9cblN0YXRzQ29sbGVjdG9yLnByb3RvdHlwZS5lcnJvckNhbGxiYWNrID0gZnVuY3Rpb24gKGVycm9yKVxue1xuICAgIGNvbnNvbGUuZXJyb3IoXCJHZXQgc3RhdHMgZXJyb3JcIiwgZXJyb3IpO1xuICAgIHRoaXMuc3RvcCgpO1xufTtcblxuLyoqXG4gKiBTdGFydHMgc3RhdHMgdXBkYXRlcy5cbiAqL1xuU3RhdHNDb2xsZWN0b3IucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gKClcbntcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5pbnRlcnZhbElkID0gc2V0SW50ZXJ2YWwoXG4gICAgICAgIGZ1bmN0aW9uICgpXG4gICAgICAgIHtcbiAgICAgICAgICAgIC8vIEludGVydmFsIHVwZGF0ZXNcbiAgICAgICAgICAgIHNlbGYucGVlcmNvbm5lY3Rpb24uZ2V0U3RhdHMoXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlcG9ydClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHRzID0gcmVwb3J0LnJlc3VsdCgpO1xuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUuZXJyb3IoXCJHb3QgaW50ZXJ2YWwgcmVwb3J0XCIsIHJlc3VsdHMpO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmN1cnJlbnRSZXBvcnQgPSByZXN1bHRzO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnByb2Nlc3NSZXBvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5iYXNlbGluZVJlcG9ydCA9IHNlbGYuY3VycmVudFJlcG9ydDtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNlbGYuZXJyb3JDYWxsYmFja1xuICAgICAgICAgICAgKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2VsZi5pbnRlcnZhbE1pbGlzXG4gICAgKTtcbn07XG5cbi8qKlxuICogU3RhdHMgcHJvY2Vzc2luZyBsb2dpYy5cbiAqL1xuU3RhdHNDb2xsZWN0b3IucHJvdG90eXBlLnByb2Nlc3NSZXBvcnQgPSBmdW5jdGlvbiAoKVxue1xuICAgIGlmICghdGhpcy5iYXNlbGluZVJlcG9ydClcbiAgICB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpZHggaW4gdGhpcy5jdXJyZW50UmVwb3J0KVxuICAgIHtcbiAgICAgICAgdmFyIG5vdyA9IHRoaXMuY3VycmVudFJlcG9ydFtpZHhdO1xuICAgICAgICBpZiAobm93LnR5cGUgIT0gJ3NzcmMnKVxuICAgICAgICB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBiZWZvcmUgPSB0aGlzLmJhc2VsaW5lUmVwb3J0W2lkeF07XG4gICAgICAgIGlmICghYmVmb3JlKVxuICAgICAgICB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4obm93LnN0YXQoJ3NzcmMnKSArICcgbm90IGVub3VnaCBkYXRhJyk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzc3JjID0gbm93LnN0YXQoJ3NzcmMnKTtcbiAgICAgICAgdmFyIGppZCA9IFhNUFBBY3RpdmF0b3IuZ2V0SklERnJvbVNTUkMoc3NyYyk7XG4gICAgICAgIGlmICghamlkKVxuICAgICAgICB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCJObyBqaWQgZm9yIHNzcmM6IFwiICsgc3NyYyk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBqaWRTdGF0cyA9IHRoaXMuamlkMnN0YXRzW2ppZF07XG4gICAgICAgIGlmICghamlkU3RhdHMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGppZFN0YXRzID0gbmV3IFBlZXJTdGF0cygpO1xuICAgICAgICAgICAgdGhpcy5qaWQyc3RhdHNbamlkXSA9IGppZFN0YXRzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXVkaW8gbGV2ZWxcbiAgICAgICAgdmFyIGF1ZGlvTGV2ZWwgPSBub3cuc3RhdCgnYXVkaW9JbnB1dExldmVsJyk7XG4gICAgICAgIGlmICghYXVkaW9MZXZlbClcbiAgICAgICAgICAgIGF1ZGlvTGV2ZWwgPSBub3cuc3RhdCgnYXVkaW9PdXRwdXRMZXZlbCcpO1xuICAgICAgICBpZiAoYXVkaW9MZXZlbClcbiAgICAgICAge1xuICAgICAgICAgICAgLy8gVE9ETzogY2FuJ3QgZmluZCBzcGVjcyBhYm91dCB3aGF0IHRoaXMgdmFsdWUgcmVhbGx5IGlzLFxuICAgICAgICAgICAgLy8gYnV0IGl0IHNlZW1zIHRvIHZhcnkgYmV0d2VlbiAwIGFuZCBhcm91bmQgMzJrLlxuICAgICAgICAgICAgYXVkaW9MZXZlbCA9IGF1ZGlvTGV2ZWwgLyAzMjc2NztcbiAgICAgICAgICAgIGppZFN0YXRzLnNldFNzcmNBdWRpb0xldmVsKHNzcmMsIGF1ZGlvTGV2ZWwpO1xuICAgICAgICAgICAgLy9teSByb29tamlkIHNob3VsZG4ndCBiZSBnbG9iYWxcbiAgICAgICAgICAgIGlmKGppZCAhPSBYTVBQQWN0aXZhdG9yLmdldE15SklEKCkpXG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudEVtbWl0ZXIuZW1pdChcInN0YXRpc3RpY3MuYXVkaW9MZXZlbFwiLCBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpLCBhdWRpb0xldmVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBrZXkgPSAncGFja2V0c1JlY2VpdmVkJztcbiAgICAgICAgaWYgKCFub3cuc3RhdChrZXkpKVxuICAgICAgICB7XG4gICAgICAgICAgICBrZXkgPSAncGFja2V0c1NlbnQnO1xuICAgICAgICAgICAgaWYgKCFub3cuc3RhdChrZXkpKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJObyBwYWNrZXRzUmVjZWl2ZWQgbm9yIHBhY2tldFNlbnQgc3RhdCBmb3VuZFwiKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0b3AoKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhY2tldHNOb3cgPSBub3cuc3RhdChrZXkpO1xuICAgICAgICB2YXIgcGFja2V0c0JlZm9yZSA9IGJlZm9yZS5zdGF0KGtleSk7XG4gICAgICAgIHZhciBwYWNrZXRSYXRlID0gcGFja2V0c05vdyAtIHBhY2tldHNCZWZvcmU7XG5cbiAgICAgICAgdmFyIGN1cnJlbnRMb3NzID0gbm93LnN0YXQoJ3BhY2tldHNMb3N0Jyk7XG4gICAgICAgIHZhciBwcmV2aW91c0xvc3MgPSBiZWZvcmUuc3RhdCgncGFja2V0c0xvc3QnKTtcbiAgICAgICAgdmFyIGxvc3NSYXRlID0gY3VycmVudExvc3MgLSBwcmV2aW91c0xvc3M7XG5cbiAgICAgICAgdmFyIHBhY2tldHNUb3RhbCA9IChwYWNrZXRSYXRlICsgbG9zc1JhdGUpO1xuICAgICAgICB2YXIgbG9zc1BlcmNlbnQ7XG5cbiAgICAgICAgaWYgKHBhY2tldHNUb3RhbCA+IDApXG4gICAgICAgICAgICBsb3NzUGVyY2VudCA9IGxvc3NSYXRlIC8gcGFja2V0c1RvdGFsO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBsb3NzUGVyY2VudCA9IDA7XG5cbiAgICAgICAgLy9jb25zb2xlLmluZm8oamlkICsgXCIgc3NyYzogXCIgKyBzc3JjICsgXCIgXCIgKyBrZXkgKyBcIjogXCIgKyBwYWNrZXRzTm93KTtcblxuICAgICAgICBqaWRTdGF0cy5zZXRTc3JjTG9zcyhzc3JjLCBsb3NzUGVyY2VudCk7XG4gICAgfVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIEppZCBzdGF0c1xuICAgIHZhciBhbGxQZWVyc0F2ZyA9IDA7XG4gICAgdmFyIGppZHMgPSBPYmplY3Qua2V5cyh0aGlzLmppZDJzdGF0cyk7XG4gICAgamlkcy5mb3JFYWNoKFxuICAgICAgICBmdW5jdGlvbiAoamlkKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgcGVlckF2ZyA9IHNlbGYuamlkMnN0YXRzW2ppZF0uZ2V0QXZnTG9zcyhcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoYXZnKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmluZm8oamlkICsgXCIgc3RhdHM6IFwiICsgKGF2ZyAqIDEwMCkgKyBcIiAlXCIpO1xuICAgICAgICAgICAgICAgICAgICBhbGxQZWVyc0F2ZyArPSBhdmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICk7XG5cbiAgICBpZiAoamlkcy5sZW5ndGggPiAxKVxuICAgIHtcbiAgICAgICAgLy8gT3VyIHN0cmVhbXMgbG9zcyBpcyByZXBvcnRlZCBhcyAwIGFsd2F5cywgc28gLTEgdG8gbGVuZ3RoXG4gICAgICAgIGFsbFBlZXJzQXZnID0gYWxsUGVlcnNBdmcgLyAoamlkcy5sZW5ndGggLSAxKTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2FsY3VsYXRlcyBudW1iZXIgb2YgY29ubmVjdGlvbiBxdWFsaXR5IGJhcnMgZnJvbSA0KGhpKSB0byAwKGxvKS5cbiAgICAgICAgICovXG4gICAgICAgIHZhciBvdXRwdXRBdmcgPSBzZWxmLnNtYTMoYWxsUGVlcnNBdmcpO1xuICAgICAgICAvLyBMaW5lYXIgZnJvbSA0KDAlKSB0byAwKDI1JSkuXG4gICAgICAgIHZhciBxdWFsaXR5ID0gTWF0aC5yb3VuZCg0IC0gb3V0cHV0QXZnICogMTYpO1xuICAgICAgICBxdWFsaXR5ID0gTWF0aC5tYXgocXVhbGl0eSwgMCk7IC8vIGxvd2VyIGxpbWl0IDBcbiAgICAgICAgcXVhbGl0eSA9IE1hdGgubWluKHF1YWxpdHksIDQpOyAvLyB1cHBlciBsaW1pdCA0XG4gICAgICAgIC8vIFRPRE86IHF1YWxpdHkgY2FuIGJlIHVzZWQgdG8gaW5kaWNhdGUgY29ubmVjdGlvbiBxdWFsaXR5IHVzaW5nIDQgc3RlcFxuICAgICAgICAvLyBiYXIgaW5kaWNhdG9yXG4gICAgICAgIC8vY29uc29sZS5pbmZvKFwiTG9zcyBTTUEzOiBcIiArIG91dHB1dEF2ZyArIFwiIFE6IFwiICsgcXVhbGl0eSk7XG4gICAgfVxufTtcblxuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGhyaXN0byBvbiA4LzQvMTQuXG4gKi9cbnZhciBMb2NhbFN0YXRzID0gcmVxdWlyZShcIi4vTG9jYWxTdGF0c0NvbGxlY3Rvci5qc1wiKTtcbnZhciBSVFBTdGF0cyA9IHJlcXVpcmUoXCIuL1JUUFN0YXRzQ29sbGVjdG9yLmpzXCIpO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIik7XG52YXIgU3RyZWFtRXZlbnRUeXBlcyA9IHJlcXVpcmUoXCIuLi9zZXJ2aWNlL1JUQy9TdHJlYW1FdmVudFR5cGVzLmpzXCIpO1xudmFyIFhNUFBFdmVudHMgPSByZXF1aXJlKFwiLi4vc2VydmljZS94bXBwL1hNUFBFdmVudHNcIik7XG5cbnZhciBTdGF0aXN0aWNzQWN0aXZhdG9yID0gZnVuY3Rpb24oKVxue1xuICAgIHZhciBldmVudEVtbWl0ZXIgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbiAgICB2YXIgbG9jYWxTdGF0cyA9IG51bGw7XG5cbiAgICB2YXIgcnRwU3RhdHMgPSBudWxsO1xuXG4gICAgZnVuY3Rpb24gU3RhdGlzdGljc0FjdGl2YXRvclByb3RvKClcbiAgICB7XG5cbiAgICB9XG5cbiAgICBTdGF0aXN0aWNzQWN0aXZhdG9yUHJvdG8uTE9DQUxfSklEID0gJ2xvY2FsJztcblxuICAgIFN0YXRpc3RpY3NBY3RpdmF0b3JQcm90by5hZGRBdWRpb0xldmVsTGlzdGVuZXIgPSBmdW5jdGlvbihsaXN0ZW5lcilcbiAgICB7XG4gICAgICAgIGV2ZW50RW1taXRlci5vbihcInN0YXRpc3RpY3MuYXVkaW9MZXZlbFwiLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgU3RhdGlzdGljc0FjdGl2YXRvclByb3RvLnJlbW92ZUF1ZGlvTGV2ZWxMaXN0ZW5lciA9IGZ1bmN0aW9uKGxpc3RlbmVyKVxuICAgIHtcbiAgICAgICAgZXZlbnRFbW1pdGVyLnJlbW92ZUxpc3RlbmVyKFwic3RhdGlzdGljcy5hdWRpb0xldmVsXCIsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICBTdGF0aXN0aWNzQWN0aXZhdG9yUHJvdG8uc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYoZXZlbnRFbW1pdGVyKVxuICAgICAgICB7XG4gICAgICAgICAgICBldmVudEVtbWl0ZXIucmVtb3ZlQWxsTGlzdGVuZXJzKFwic3RhdGlzdGljcy5hdWRpb0xldmVsXCIpO1xuICAgICAgICB9XG4gICAgICAgIHN0b3BMb2NhbCgpO1xuICAgICAgICBzdG9wUmVtb3RlKCk7XG5cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzdG9wTG9jYWwoKVxuICAgIHtcbiAgICAgICAgaWYobG9jYWxTdGF0cylcbiAgICAgICAge1xuICAgICAgICAgICAgbG9jYWxTdGF0cy5zdG9wKCk7XG4gICAgICAgICAgICBsb2NhbFN0YXRzID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN0b3BSZW1vdGUoKVxuICAgIHtcbiAgICAgICAgaWYocnRwU3RhdHMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJ0cFN0YXRzLnN0b3AoKTtcbiAgICAgICAgICAgIHJ0cFN0YXRzID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIFN0YXRpc3RpY3NBY3RpdmF0b3JQcm90by5zdGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgUlRDQWN0aXZhdG9yLmFkZFN0cmVhbUxpc3RlbmVyKFN0YXRpc3RpY3NBY3RpdmF0b3Iub25TdHJlYW1DcmVhdGVkLFxuICAgICAgICAgICAgU3RyZWFtRXZlbnRUeXBlcy5FVkVOVF9UWVBFX0xPQ0FMX0NSRUFURUQpO1xuICAgICAgICBYTVBQQWN0aXZhdG9yLmFkZExpc3RlbmVyKFhNUFBFdmVudHMuQ09ORkVSRU5DRV9DRVJBVEVELCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHN0YXJ0UmVtb3RlU3RhdHMoZXZlbnQucGVlcmNvbm5lY3Rpb24pO1xuICAgICAgICB9KTtcbiAgICAgICAgWE1QUEFjdGl2YXRvci5hZGRMaXN0ZW5lcihYTVBQRXZlbnRzLkNBTExfSU5DT01JTkcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgc3RhcnRSZW1vdGVTdGF0cyhldmVudC5wZWVyY29ubmVjdGlvbik7XG4gICAgICAgIH0pO1xuICAgICAgICBYTVBQQWN0aXZhdG9yLmFkZExpc3RlbmVyKFhNUFBFdmVudHMuRElTUE9TRV9DT05GRVJFTkNFLCBmdW5jdGlvbiAob25VbmxvYWQpIHtcbiAgICAgICAgICAgIHN0b3BSZW1vdGUoKTtcbiAgICAgICAgICAgIGlmKG9uVW5sb2FkKSB7XG4gICAgICAgICAgICAgICAgc3RvcExvY2FsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIFN0YXRpc3RpY3NBY3RpdmF0b3JQcm90by5vblN0cmVhbUNyZWF0ZWQgPSBmdW5jdGlvbihzdHJlYW0pXG4gICAge1xuICAgICAgICBpZighc3RyZWFtLmlzQXVkaW9TdHJlYW0oKSlcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBsb2NhbFN0YXRzID0gbmV3IExvY2FsU3RhdHMoc3RyZWFtLmdldE9yaWdpbmFsU3RyZWFtKCksIDEwMCwgZXZlbnRFbW1pdGVyKTtcbiAgICAgICAgbG9jYWxTdGF0cy5zdGFydCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN0YXJ0UmVtb3RlU3RhdHMgKHBlZXJjb25uZWN0aW9uKSB7XG4gICAgICAgIGlmIChjb25maWcuZW5hYmxlUnRwU3RhdHMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmKHJ0cFN0YXRzKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJ0cFN0YXRzLnN0b3AoKTtcbiAgICAgICAgICAgICAgICBydHBTdGF0cyA9IG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJ0cFN0YXRzID0gbmV3IFJUUFN0YXRzKHBlZXJjb25uZWN0aW9uLCAyMDAsIGV2ZW50RW1taXRlcik7XG4gICAgICAgICAgICBydHBTdGF0cy5zdGFydCgpO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICByZXR1cm4gU3RhdGlzdGljc0FjdGl2YXRvclByb3RvO1xuXG59KCk7XG5cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gU3RhdGlzdGljc0FjdGl2YXRvcjsiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iXX0=
