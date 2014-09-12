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
    function LocalStatsCollectorProto(stream, interval, eventEmmiter) {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.stream = stream;
        this.intervalId = null;
        this.intervalMilis = interval;
        this.eventEmmiter = eventEmmiter;
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
                    if(!isAudioMuted())
                        self.eventEmmiter.trigger("statistics.audioLevel", LocalStatsCollectorProto.LOCAL_JID,
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
},{}],3:[function(require,module,exports){
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
        var jid = ssrc2jid[ssrc];
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
            if(jid != connection.emuc.myroomjid)
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


},{}],4:[function(require,module,exports){
/**
 * Created by hristo on 8/4/14.
 */
var LocalStats = require("./LocalStatsCollector.js");
var RTPStats = require("./RTPStatsCollector.js");
var EventEmitter = require("events");
var StreamEventTypes = require("../service/RTC/StreamEventTypes.js");

var StatisticsActivator = function()
{
    var eventEmmiter = null;

    var localStats = null;

    var rtpStats = null;

    function StatisticsActivatorProto()
    {

    }

    StatisticsActivatorProto.LOCAL_JID = 'local';

    StatisticsActivatorProto.addAudioLevelListener = function(listener)
    {
        if(eventEmmiter == null)
        {
            eventEmmiter = new EventEmitter();
        }

        eventEmmiter.on("statistics.audioLevel", listener);
    }

    StatisticsActivatorProto.removeAudioLevelListener = function(listener)
    {
        if(eventEmmiter == null)
            return;
        eventEmmiter.removeListener("statistics.audioLevel", listener);
    }

    StatisticsActivatorProto.stop = function () {
        if(eventEmmiter)
        {
            eventEmmiter.removeAllListeners("statistics.audioLevel");
            eventEmmiter = null;
        }
        StatisticsActivator.stopLocal();
        StatisticsActivator.stopRemote();

    }

    StatisticsActivatorProto.stopLocal = function()
    {
        if(localStats)
        {
            localStats.stop();
            localStats = null;
        }
    }

    StatisticsActivatorProto.stopRemote = function()
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
    }

    StatisticsActivatorProto.onStreamCreated = function(stream)
    {
        if(eventEmmiter == null)
            eventEmmiter = new EventEmitter();
        localStats = new LocalStats(stream.getOriginalStream(), 100, eventEmmiter);
        localStats.start();
    }

    StatisticsActivatorProto.startRemoteStats = function (peerconnection) {
        if (config.enableRtpStats)
        {
            if(rtpStats)
            {
                rtpStats.stop();
                rtpStats = null;
            }

            if(eventEmmiter == null)
                eventEmmiter = new EventEmitter();
            rtpStats = new RTPStats(peerconnection, 200, eventEmmiter);
            rtpStats.start();
        }

    }

    return StatisticsActivatorProto;

}();




module.exports = StatisticsActivator;
},{"../service/RTC/StreamEventTypes.js":1,"./LocalStatsCollector.js":2,"./RTPStatsCollector.js":3,"events":5}],5:[function(require,module,exports){
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

},{}]},{},[4])(4)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9zZXJ2aWNlL1JUQy9TdHJlYW1FdmVudFR5cGVzLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvc3RhdGlzdGljcy9Mb2NhbFN0YXRzQ29sbGVjdG9yLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvc3RhdGlzdGljcy9SVFBTdGF0c0NvbGxlY3Rvci5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L3N0YXRpc3RpY3MvU3RhdGlzdGljc0FjdGl2YXRvci5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIFN0cmVhbUV2ZW50VHlwZXMgPSB7XG4gICAgRVZFTlRfVFlQRV9MT0NBTF9DUkVBVEVEOiBcInN0cmVhbS5sb2NhbF9jcmVhdGVkXCIsXG5cbiAgICBFVkVOVF9UWVBFX0xPQ0FMX0VOREVEOiBcInN0cmVhbS5sb2NhbF9lbmRlZFwiLFxuXG4gICAgRVZFTlRfVFlQRV9SRU1PVEVfQ1JFQVRFRDogXCJzdHJlYW0ucmVtb3RlX2NyZWF0ZWRcIixcblxuICAgIEVWRU5UX1RZUEVfUkVNT1RFX0VOREVEOiBcInN0cmVhbS5yZW1vdGVfZW5kZWRcIlxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdHJlYW1FdmVudFR5cGVzOyIsIi8qKlxuICogUHJvdmlkZXMgc3RhdGlzdGljcyBmb3IgdGhlIGxvY2FsIHN0cmVhbS5cbiAqL1xudmFyIExvY2FsU3RhdHNDb2xsZWN0b3IgPSAoZnVuY3Rpb24oKSB7XG4gICAgLyoqXG4gICAgICogU2l6ZSBvZiB0aGUgd2ViYXVkaW8gYW5hbGl6ZXIgYnVmZmVyLlxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgdmFyIFdFQkFVRElPX0FOQUxJWkVSX0ZGVF9TSVpFID0gMjA0ODtcblxuICAgIC8qKlxuICAgICAqIFZhbHVlIG9mIHRoZSB3ZWJhdWRpbyBhbmFsaXplciBzbW9vdGhpbmcgdGltZSBwYXJhbWV0ZXIuXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICB2YXIgV0VCQVVESU9fQU5BTElaRVJfU01PT1RJTkdfVElNRSA9IDAuODtcblxuICAgIC8qKlxuICAgICAqIDx0dD5Mb2NhbFN0YXRzQ29sbGVjdG9yPC90dD4gY2FsY3VsYXRlcyBzdGF0aXN0aWNzIGZvciB0aGUgbG9jYWwgc3RyZWFtLlxuICAgICAqXG4gICAgICogQHBhcmFtIHN0cmVhbSB0aGUgbG9jYWwgc3RyZWFtXG4gICAgICogQHBhcmFtIGludGVydmFsIHN0YXRzIHJlZnJlc2ggaW50ZXJ2YWwgZ2l2ZW4gaW4gbXMuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbihMb2NhbFN0YXRzQ29sbGVjdG9yKX0gdXBkYXRlQ2FsbGJhY2sgdGhlIGNhbGxiYWNrIGNhbGxlZCBvbiBzdGF0c1xuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGUuXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gTG9jYWxTdGF0c0NvbGxlY3RvclByb3RvKHN0cmVhbSwgaW50ZXJ2YWwsIGV2ZW50RW1taXRlcikge1xuICAgICAgICB3aW5kb3cuQXVkaW9Db250ZXh0ID0gd2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0O1xuICAgICAgICB0aGlzLnN0cmVhbSA9IHN0cmVhbTtcbiAgICAgICAgdGhpcy5pbnRlcnZhbElkID0gbnVsbDtcbiAgICAgICAgdGhpcy5pbnRlcnZhbE1pbGlzID0gaW50ZXJ2YWw7XG4gICAgICAgIHRoaXMuZXZlbnRFbW1pdGVyID0gZXZlbnRFbW1pdGVyO1xuICAgICAgICB0aGlzLmF1ZGlvTGV2ZWwgPSAwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFN0YXJ0cyB0aGUgY29sbGVjdGluZyB0aGUgc3RhdGlzdGljcy5cbiAgICAgKi9cbiAgICBMb2NhbFN0YXRzQ29sbGVjdG9yUHJvdG8ucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXdpbmRvdy5BdWRpb0NvbnRleHQpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgdmFyIGNvbnRleHQgPSBuZXcgQXVkaW9Db250ZXh0KCk7XG4gICAgICAgIHZhciBhbmFseXNlciA9IGNvbnRleHQuY3JlYXRlQW5hbHlzZXIoKTtcbiAgICAgICAgYW5hbHlzZXIuc21vb3RoaW5nVGltZUNvbnN0YW50ID0gV0VCQVVESU9fQU5BTElaRVJfU01PT1RJTkdfVElNRTtcbiAgICAgICAgYW5hbHlzZXIuZmZ0U2l6ZSA9IFdFQkFVRElPX0FOQUxJWkVSX0ZGVF9TSVpFO1xuXG5cbiAgICAgICAgdmFyIHNvdXJjZSA9IGNvbnRleHQuY3JlYXRlTWVkaWFTdHJlYW1Tb3VyY2UodGhpcy5zdHJlYW0pO1xuICAgICAgICBzb3VyY2UuY29ubmVjdChhbmFseXNlcik7XG5cblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdGhpcy5pbnRlcnZhbElkID0gc2V0SW50ZXJ2YWwoXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoYW5hbHlzZXIuZnJlcXVlbmN5QmluQ291bnQpO1xuICAgICAgICAgICAgICAgIGFuYWx5c2VyLmdldEJ5dGVUaW1lRG9tYWluRGF0YShhcnJheSk7XG4gICAgICAgICAgICAgICAgdmFyIGF1ZGlvTGV2ZWwgPSBUaW1lRG9tYWluRGF0YVRvQXVkaW9MZXZlbChhcnJheSk7XG4gICAgICAgICAgICAgICAgaWYoYXVkaW9MZXZlbCAhPSBzZWxmLmF1ZGlvTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5hdWRpb0xldmVsID0gYW5pbWF0ZUxldmVsKGF1ZGlvTGV2ZWwsIHNlbGYuYXVkaW9MZXZlbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmKCFpc0F1ZGlvTXV0ZWQoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuZXZlbnRFbW1pdGVyLnRyaWdnZXIoXCJzdGF0aXN0aWNzLmF1ZGlvTGV2ZWxcIiwgTG9jYWxTdGF0c0NvbGxlY3RvclByb3RvLkxPQ0FMX0pJRCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmF1ZGlvTGV2ZWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0aGlzLmludGVydmFsTWlsaXNcbiAgICAgICAgKTtcblxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTdG9wcyBjb2xsZWN0aW5nIHRoZSBzdGF0aXN0aWNzLlxuICAgICAqL1xuICAgIExvY2FsU3RhdHNDb2xsZWN0b3JQcm90by5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuaW50ZXJ2YWxJZCkge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLmludGVydmFsSWQpO1xuICAgICAgICAgICAgdGhpcy5pbnRlcnZhbElkID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyB0aW1lIGRvbWFpbiBkYXRhIGFycmF5IHRvIGF1ZGlvIGxldmVsLlxuICAgICAqIEBwYXJhbSBhcnJheSB0aGUgdGltZSBkb21haW4gZGF0YSBhcnJheS5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSB0aGUgYXVkaW8gbGV2ZWxcbiAgICAgKi9cbiAgICB2YXIgVGltZURvbWFpbkRhdGFUb0F1ZGlvTGV2ZWwgPSBmdW5jdGlvbiAoc2FtcGxlcykge1xuXG4gICAgICAgIHZhciBtYXhWb2x1bWUgPSAwO1xuXG4gICAgICAgIHZhciBsZW5ndGggPSBzYW1wbGVzLmxlbmd0aDtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAobWF4Vm9sdW1lIDwgc2FtcGxlc1tpXSlcbiAgICAgICAgICAgICAgICBtYXhWb2x1bWUgPSBzYW1wbGVzW2ldO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoKChtYXhWb2x1bWUgLSAxMjcpIC8gMTI4KS50b0ZpeGVkKDMpKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQW5pbWF0ZXMgYXVkaW8gbGV2ZWwgY2hhbmdlXG4gICAgICogQHBhcmFtIG5ld0xldmVsIHRoZSBuZXcgYXVkaW8gbGV2ZWxcbiAgICAgKiBAcGFyYW0gbGFzdExldmVsIHRoZSBsYXN0IGF1ZGlvIGxldmVsXG4gICAgICogQHJldHVybnMge051bWJlcn0gdGhlIGF1ZGlvIGxldmVsIHRvIGJlIHNldFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGFuaW1hdGVMZXZlbChuZXdMZXZlbCwgbGFzdExldmVsKVxuICAgIHtcbiAgICAgICAgdmFyIHZhbHVlID0gMDtcbiAgICAgICAgdmFyIGRpZmYgPSBsYXN0TGV2ZWwgLSBuZXdMZXZlbDtcbiAgICAgICAgaWYoZGlmZiA+IDAuMilcbiAgICAgICAge1xuICAgICAgICAgICAgdmFsdWUgPSBsYXN0TGV2ZWwgLSAwLjI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZihkaWZmIDwgLTAuNClcbiAgICAgICAge1xuICAgICAgICAgICAgdmFsdWUgPSBsYXN0TGV2ZWwgKyAwLjQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZVxuICAgICAgICB7XG4gICAgICAgICAgICB2YWx1ZSA9IG5ld0xldmVsO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQodmFsdWUudG9GaXhlZCgzKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5kaWNhdGVzIHRoYXQgdGhpcyBhdWRpbyBsZXZlbCBpcyBmb3IgbG9jYWwgamlkLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgTG9jYWxTdGF0c0NvbGxlY3RvclByb3RvLkxPQ0FMX0pJRCA9ICdsb2NhbCc7XG5cbiAgICByZXR1cm4gTG9jYWxTdGF0c0NvbGxlY3RvclByb3RvO1xufSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBMb2NhbFN0YXRzQ29sbGVjdG9yOyIsIi8qIGdsb2JhbCBzc3JjMmppZCAqL1xuXG4vKipcbiAqIEZ1bmN0aW9uIG9iamVjdCB3aGljaCBvbmNlIGNyZWF0ZWQgY2FuIGJlIHVzZWQgdG8gY2FsY3VsYXRlIG1vdmluZyBhdmVyYWdlIG9mXG4gKiBnaXZlbiBwZXJpb2QuIEV4YW1wbGUgZm9yIFNNQTM6PC9icj5cbiAqIHZhciBzbWEzID0gbmV3IFNpbXBsZU1vdmluZ0F2ZXJhZ2VyKDMpO1xuICogd2hpbGUodHJ1ZSkgLy8gc29tZSB1cGRhdGUgbG9vcFxuICoge1xuICogICB2YXIgY3VycmVudFNtYTNWYWx1ZSA9IHNtYTMobmV4dElucHV0VmFsdWUpO1xuICogfVxuICpcbiAqIEBwYXJhbSBwZXJpb2QgbW92aW5nIGF2ZXJhZ2UgcGVyaW9kIHRoYXQgd2lsbCBiZSB1c2VkIGJ5IGNyZWF0ZWQgaW5zdGFuY2UuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFNNQSBjYWxjdWxhdG9yIGZ1bmN0aW9uIG9mIGdpdmVuIDx0dD5wZXJpb2Q8L3R0Pi5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBTaW1wbGVNb3ZpbmdBdmVyYWdlcihwZXJpb2QpXG57XG4gICAgdmFyIG51bXMgPSBbXTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKG51bSlcbiAgICB7XG4gICAgICAgIG51bXMucHVzaChudW0pO1xuICAgICAgICBpZiAobnVtcy5sZW5ndGggPiBwZXJpb2QpXG4gICAgICAgICAgICBudW1zLnNwbGljZSgwLCAxKTtcbiAgICAgICAgdmFyIHN1bSA9IDA7XG4gICAgICAgIGZvciAodmFyIGkgaW4gbnVtcylcbiAgICAgICAgICAgIHN1bSArPSBudW1zW2ldO1xuICAgICAgICB2YXIgbiA9IHBlcmlvZDtcbiAgICAgICAgaWYgKG51bXMubGVuZ3RoIDwgcGVyaW9kKVxuICAgICAgICAgICAgbiA9IG51bXMubGVuZ3RoO1xuICAgICAgICByZXR1cm4gKHN1bSAvIG4pO1xuICAgIH07XG59XG5cbi8qKlxuICogUGVlciBzdGF0aXN0aWNzIGRhdGEgaG9sZGVyLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFBlZXJTdGF0cygpXG57XG4gICAgdGhpcy5zc3JjMkxvc3MgPSB7fTtcbiAgICB0aGlzLnNzcmMyQXVkaW9MZXZlbCA9IHt9O1xufVxuXG4vKipcbiAqIFNldHMgcGFja2V0cyBsb3NzIHJhdGUgZm9yIGdpdmVuIDx0dD5zc3JjPC90dD4gdGhhdCBibG9uZyB0byB0aGUgcGVlclxuICogcmVwcmVzZW50ZWQgYnkgdGhpcyBpbnN0YW5jZS5cbiAqIEBwYXJhbSBzc3JjIGF1ZGlvIG9yIHZpZGVvIFJUUCBzdHJlYW0gU1NSQy5cbiAqIEBwYXJhbSBsb3NzUmF0ZSBuZXcgcGFja2V0IGxvc3MgcmF0ZSB2YWx1ZSB0byBiZSBzZXQuXG4gKi9cblBlZXJTdGF0cy5wcm90b3R5cGUuc2V0U3NyY0xvc3MgPSBmdW5jdGlvbiAoc3NyYywgbG9zc1JhdGUpXG57XG4gICAgdGhpcy5zc3JjMkxvc3Nbc3NyY10gPSBsb3NzUmF0ZTtcbn07XG5cbi8qKlxuICogU2V0cyBuZXcgYXVkaW8gbGV2ZWwoaW5wdXQgb3Igb3V0cHV0KSBmb3IgZ2l2ZW4gPHR0PnNzcmM8L3R0PiB0aGF0IGlkZW50aWZpZXNcbiAqIHRoZSBzdHJlYW0gd2hpY2ggYmVsb25ncyB0byB0aGUgcGVlciByZXByZXNlbnRlZCBieSB0aGlzIGluc3RhbmNlLlxuICogQHBhcmFtIHNzcmMgUlRQIHN0cmVhbSBTU1JDIGZvciB3aGljaCBjdXJyZW50IGF1ZGlvIGxldmVsIHZhbHVlIHdpbGwgYmVcbiAqICAgICAgICB1cGRhdGVkLlxuICogQHBhcmFtIGF1ZGlvTGV2ZWwgdGhlIG5ldyBhdWRpbyBsZXZlbCB2YWx1ZSB0byBiZSBzZXQuIFZhbHVlIGlzIHRydW5jYXRlZCB0b1xuICogICAgICAgIGZpdCB0aGUgcmFuZ2UgZnJvbSAwIHRvIDEuXG4gKi9cblBlZXJTdGF0cy5wcm90b3R5cGUuc2V0U3NyY0F1ZGlvTGV2ZWwgPSBmdW5jdGlvbiAoc3NyYywgYXVkaW9MZXZlbClcbntcbiAgICAvLyBSYW5nZSBsaW1pdCAwIC0gMVxuICAgIHRoaXMuc3NyYzJBdWRpb0xldmVsW3NzcmNdID0gTWF0aC5taW4oTWF0aC5tYXgoYXVkaW9MZXZlbCwgMCksIDEpO1xufTtcblxuLyoqXG4gKiBDYWxjdWxhdGVzIGF2ZXJhZ2UgcGFja2V0IGxvc3MgZm9yIGFsbCBzdHJlYW1zIHRoYXQgYmVsb25nIHRvIHRoZSBwZWVyXG4gKiByZXByZXNlbnRlZCBieSB0aGlzIGluc3RhbmNlLlxuICogQHJldHVybnMge251bWJlcn0gYXZlcmFnZSBwYWNrZXQgbG9zcyBmb3IgYWxsIHN0cmVhbXMgdGhhdCBiZWxvbmcgdG8gdGhlIHBlZXJcbiAqICAgICAgICAgICAgICAgICAgIHJlcHJlc2VudGVkIGJ5IHRoaXMgaW5zdGFuY2UuXG4gKi9cblBlZXJTdGF0cy5wcm90b3R5cGUuZ2V0QXZnTG9zcyA9IGZ1bmN0aW9uICgpXG57XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBhdmcgPSAwO1xuICAgIHZhciBjb3VudCA9IE9iamVjdC5rZXlzKHRoaXMuc3NyYzJMb3NzKS5sZW5ndGg7XG4gICAgT2JqZWN0LmtleXModGhpcy5zc3JjMkxvc3MpLmZvckVhY2goXG4gICAgICAgIGZ1bmN0aW9uIChzc3JjKVxuICAgICAgICB7XG4gICAgICAgICAgICBhdmcgKz0gc2VsZi5zc3JjMkxvc3Nbc3NyY107XG4gICAgICAgIH1cbiAgICApO1xuICAgIHJldHVybiBjb3VudCA+IDAgPyBhdmcgLyBjb3VudCA6IDA7XG59O1xuXG4vKipcbiAqIDx0dD5TdGF0c0NvbGxlY3RvcjwvdHQ+IHJlZ2lzdGVycyBmb3Igc3RhdHMgdXBkYXRlcyBvZiBnaXZlblxuICogPHR0PnBlZXJjb25uZWN0aW9uPC90dD4gaW4gZ2l2ZW4gPHR0PmludGVydmFsPC90dD4uIE9uIGVhY2ggdXBkYXRlIHBhcnRpY3VsYXJcbiAqIHN0YXRzIGFyZSBleHRyYWN0ZWQgYW5kIHB1dCBpbiB7QGxpbmsgUGVlclN0YXRzfSBvYmplY3RzLiBPbmNlIHRoZSBwcm9jZXNzaW5nXG4gKiBpcyBkb25lIDx0dD51cGRhdGVDYWxsYmFjazwvdHQ+IGlzIGNhbGxlZCB3aXRoIDx0dD50aGlzPC90dD4gaW5zdGFuY2UgYXNcbiAqIGFuIGV2ZW50IHNvdXJjZS5cbiAqXG4gKiBAcGFyYW0gcGVlcmNvbm5lY3Rpb24gd2ViUlRDIHBlZXIgY29ubmVjdGlvbiBvYmplY3QuXG4gKiBAcGFyYW0gaW50ZXJ2YWwgc3RhdHMgcmVmcmVzaCBpbnRlcnZhbCBnaXZlbiBpbiBtcy5cbiAqIEBwYXJhbSB7ZnVuY3Rpb24oU3RhdHNDb2xsZWN0b3IpfSB1cGRhdGVDYWxsYmFjayB0aGUgY2FsbGJhY2sgY2FsbGVkIG9uIHN0YXRzXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFN0YXRzQ29sbGVjdG9yKHBlZXJjb25uZWN0aW9uLCBpbnRlcnZhbCwgZXZlbnRFbW1pdGVyKVxue1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24gPSBwZWVyY29ubmVjdGlvbjtcbiAgICB0aGlzLmJhc2VsaW5lUmVwb3J0ID0gbnVsbDtcbiAgICB0aGlzLmN1cnJlbnRSZXBvcnQgPSBudWxsO1xuICAgIHRoaXMuaW50ZXJ2YWxJZCA9IG51bGw7XG4gICAgLy8gVXBkYXRlcyBzdGF0cyBpbnRlcnZhbFxuICAgIHRoaXMuaW50ZXJ2YWxNaWxpcyA9IGludGVydmFsO1xuICAgIC8vIFVzZSBTTUEgMyB0byBhdmVyYWdlIHBhY2tldCBsb3NzIGNoYW5nZXMgb3ZlciB0aW1lXG4gICAgdGhpcy5zbWEzID0gbmV3IFNpbXBsZU1vdmluZ0F2ZXJhZ2VyKDMpO1xuICAgIC8vIE1hcCBvZiBqaWRzIHRvIFBlZXJTdGF0c1xuICAgIHRoaXMuamlkMnN0YXRzID0ge307XG5cbiAgICB0aGlzLmV2ZW50RW1taXRlciA9IGV2ZW50RW1taXRlcjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTdGF0c0NvbGxlY3RvcjtcblxuLyoqXG4gKiBTdG9wcyBzdGF0cyB1cGRhdGVzLlxuICovXG5TdGF0c0NvbGxlY3Rvci5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uICgpXG57XG4gICAgaWYgKHRoaXMuaW50ZXJ2YWxJZClcbiAgICB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5pbnRlcnZhbElkKTtcbiAgICAgICAgdGhpcy5pbnRlcnZhbElkID0gbnVsbDtcbiAgICB9XG59O1xuXG4vKipcbiAqIENhbGxiYWNrIHBhc3NlZCB0byA8dHQ+Z2V0U3RhdHM8L3R0PiBtZXRob2QuXG4gKiBAcGFyYW0gZXJyb3IgYW4gZXJyb3IgdGhhdCBvY2N1cnJlZCBvbiA8dHQ+Z2V0U3RhdHM8L3R0PiBjYWxsLlxuICovXG5TdGF0c0NvbGxlY3Rvci5wcm90b3R5cGUuZXJyb3JDYWxsYmFjayA9IGZ1bmN0aW9uIChlcnJvcilcbntcbiAgICBjb25zb2xlLmVycm9yKFwiR2V0IHN0YXRzIGVycm9yXCIsIGVycm9yKTtcbiAgICB0aGlzLnN0b3AoKTtcbn07XG5cbi8qKlxuICogU3RhcnRzIHN0YXRzIHVwZGF0ZXMuXG4gKi9cblN0YXRzQ29sbGVjdG9yLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uICgpXG57XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuaW50ZXJ2YWxJZCA9IHNldEludGVydmFsKFxuICAgICAgICBmdW5jdGlvbiAoKVxuICAgICAgICB7XG4gICAgICAgICAgICAvLyBJbnRlcnZhbCB1cGRhdGVzXG4gICAgICAgICAgICBzZWxmLnBlZXJjb25uZWN0aW9uLmdldFN0YXRzKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXBvcnQpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0cyA9IHJlcG9ydC5yZXN1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmVycm9yKFwiR290IGludGVydmFsIHJlcG9ydFwiLCByZXN1bHRzKTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5jdXJyZW50UmVwb3J0ID0gcmVzdWx0cztcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5wcm9jZXNzUmVwb3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuYmFzZWxpbmVSZXBvcnQgPSBzZWxmLmN1cnJlbnRSZXBvcnQ7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzZWxmLmVycm9yQ2FsbGJhY2tcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0sXG4gICAgICAgIHNlbGYuaW50ZXJ2YWxNaWxpc1xuICAgICk7XG59O1xuXG4vKipcbiAqIFN0YXRzIHByb2Nlc3NpbmcgbG9naWMuXG4gKi9cblN0YXRzQ29sbGVjdG9yLnByb3RvdHlwZS5wcm9jZXNzUmVwb3J0ID0gZnVuY3Rpb24gKClcbntcbiAgICBpZiAoIXRoaXMuYmFzZWxpbmVSZXBvcnQpXG4gICAge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaWR4IGluIHRoaXMuY3VycmVudFJlcG9ydClcbiAgICB7XG4gICAgICAgIHZhciBub3cgPSB0aGlzLmN1cnJlbnRSZXBvcnRbaWR4XTtcbiAgICAgICAgaWYgKG5vdy50eXBlICE9ICdzc3JjJylcbiAgICAgICAge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYmVmb3JlID0gdGhpcy5iYXNlbGluZVJlcG9ydFtpZHhdO1xuICAgICAgICBpZiAoIWJlZm9yZSlcbiAgICAgICAge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKG5vdy5zdGF0KCdzc3JjJykgKyAnIG5vdCBlbm91Z2ggZGF0YScpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc3NyYyA9IG5vdy5zdGF0KCdzc3JjJyk7XG4gICAgICAgIHZhciBqaWQgPSBzc3JjMmppZFtzc3JjXTtcbiAgICAgICAgaWYgKCFqaWQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcIk5vIGppZCBmb3Igc3NyYzogXCIgKyBzc3JjKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGppZFN0YXRzID0gdGhpcy5qaWQyc3RhdHNbamlkXTtcbiAgICAgICAgaWYgKCFqaWRTdGF0cylcbiAgICAgICAge1xuICAgICAgICAgICAgamlkU3RhdHMgPSBuZXcgUGVlclN0YXRzKCk7XG4gICAgICAgICAgICB0aGlzLmppZDJzdGF0c1tqaWRdID0gamlkU3RhdHM7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBdWRpbyBsZXZlbFxuICAgICAgICB2YXIgYXVkaW9MZXZlbCA9IG5vdy5zdGF0KCdhdWRpb0lucHV0TGV2ZWwnKTtcbiAgICAgICAgaWYgKCFhdWRpb0xldmVsKVxuICAgICAgICAgICAgYXVkaW9MZXZlbCA9IG5vdy5zdGF0KCdhdWRpb091dHB1dExldmVsJyk7XG4gICAgICAgIGlmIChhdWRpb0xldmVsKVxuICAgICAgICB7XG4gICAgICAgICAgICAvLyBUT0RPOiBjYW4ndCBmaW5kIHNwZWNzIGFib3V0IHdoYXQgdGhpcyB2YWx1ZSByZWFsbHkgaXMsXG4gICAgICAgICAgICAvLyBidXQgaXQgc2VlbXMgdG8gdmFyeSBiZXR3ZWVuIDAgYW5kIGFyb3VuZCAzMmsuXG4gICAgICAgICAgICBhdWRpb0xldmVsID0gYXVkaW9MZXZlbCAvIDMyNzY3O1xuICAgICAgICAgICAgamlkU3RhdHMuc2V0U3NyY0F1ZGlvTGV2ZWwoc3NyYywgYXVkaW9MZXZlbCk7XG4gICAgICAgICAgICAvL215IHJvb21qaWQgc2hvdWxkbid0IGJlIGdsb2JhbFxuICAgICAgICAgICAgaWYoamlkICE9IGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQpXG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudEVtbWl0ZXIuZW1pdChcInN0YXRpc3RpY3MuYXVkaW9MZXZlbFwiLCBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpLCBhdWRpb0xldmVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBrZXkgPSAncGFja2V0c1JlY2VpdmVkJztcbiAgICAgICAgaWYgKCFub3cuc3RhdChrZXkpKVxuICAgICAgICB7XG4gICAgICAgICAgICBrZXkgPSAncGFja2V0c1NlbnQnO1xuICAgICAgICAgICAgaWYgKCFub3cuc3RhdChrZXkpKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJObyBwYWNrZXRzUmVjZWl2ZWQgbm9yIHBhY2tldFNlbnQgc3RhdCBmb3VuZFwiKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0b3AoKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhY2tldHNOb3cgPSBub3cuc3RhdChrZXkpO1xuICAgICAgICB2YXIgcGFja2V0c0JlZm9yZSA9IGJlZm9yZS5zdGF0KGtleSk7XG4gICAgICAgIHZhciBwYWNrZXRSYXRlID0gcGFja2V0c05vdyAtIHBhY2tldHNCZWZvcmU7XG5cbiAgICAgICAgdmFyIGN1cnJlbnRMb3NzID0gbm93LnN0YXQoJ3BhY2tldHNMb3N0Jyk7XG4gICAgICAgIHZhciBwcmV2aW91c0xvc3MgPSBiZWZvcmUuc3RhdCgncGFja2V0c0xvc3QnKTtcbiAgICAgICAgdmFyIGxvc3NSYXRlID0gY3VycmVudExvc3MgLSBwcmV2aW91c0xvc3M7XG5cbiAgICAgICAgdmFyIHBhY2tldHNUb3RhbCA9IChwYWNrZXRSYXRlICsgbG9zc1JhdGUpO1xuICAgICAgICB2YXIgbG9zc1BlcmNlbnQ7XG5cbiAgICAgICAgaWYgKHBhY2tldHNUb3RhbCA+IDApXG4gICAgICAgICAgICBsb3NzUGVyY2VudCA9IGxvc3NSYXRlIC8gcGFja2V0c1RvdGFsO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBsb3NzUGVyY2VudCA9IDA7XG5cbiAgICAgICAgLy9jb25zb2xlLmluZm8oamlkICsgXCIgc3NyYzogXCIgKyBzc3JjICsgXCIgXCIgKyBrZXkgKyBcIjogXCIgKyBwYWNrZXRzTm93KTtcblxuICAgICAgICBqaWRTdGF0cy5zZXRTc3JjTG9zcyhzc3JjLCBsb3NzUGVyY2VudCk7XG4gICAgfVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIEppZCBzdGF0c1xuICAgIHZhciBhbGxQZWVyc0F2ZyA9IDA7XG4gICAgdmFyIGppZHMgPSBPYmplY3Qua2V5cyh0aGlzLmppZDJzdGF0cyk7XG4gICAgamlkcy5mb3JFYWNoKFxuICAgICAgICBmdW5jdGlvbiAoamlkKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgcGVlckF2ZyA9IHNlbGYuamlkMnN0YXRzW2ppZF0uZ2V0QXZnTG9zcyhcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoYXZnKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmluZm8oamlkICsgXCIgc3RhdHM6IFwiICsgKGF2ZyAqIDEwMCkgKyBcIiAlXCIpO1xuICAgICAgICAgICAgICAgICAgICBhbGxQZWVyc0F2ZyArPSBhdmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICk7XG5cbiAgICBpZiAoamlkcy5sZW5ndGggPiAxKVxuICAgIHtcbiAgICAgICAgLy8gT3VyIHN0cmVhbXMgbG9zcyBpcyByZXBvcnRlZCBhcyAwIGFsd2F5cywgc28gLTEgdG8gbGVuZ3RoXG4gICAgICAgIGFsbFBlZXJzQXZnID0gYWxsUGVlcnNBdmcgLyAoamlkcy5sZW5ndGggLSAxKTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2FsY3VsYXRlcyBudW1iZXIgb2YgY29ubmVjdGlvbiBxdWFsaXR5IGJhcnMgZnJvbSA0KGhpKSB0byAwKGxvKS5cbiAgICAgICAgICovXG4gICAgICAgIHZhciBvdXRwdXRBdmcgPSBzZWxmLnNtYTMoYWxsUGVlcnNBdmcpO1xuICAgICAgICAvLyBMaW5lYXIgZnJvbSA0KDAlKSB0byAwKDI1JSkuXG4gICAgICAgIHZhciBxdWFsaXR5ID0gTWF0aC5yb3VuZCg0IC0gb3V0cHV0QXZnICogMTYpO1xuICAgICAgICBxdWFsaXR5ID0gTWF0aC5tYXgocXVhbGl0eSwgMCk7IC8vIGxvd2VyIGxpbWl0IDBcbiAgICAgICAgcXVhbGl0eSA9IE1hdGgubWluKHF1YWxpdHksIDQpOyAvLyB1cHBlciBsaW1pdCA0XG4gICAgICAgIC8vIFRPRE86IHF1YWxpdHkgY2FuIGJlIHVzZWQgdG8gaW5kaWNhdGUgY29ubmVjdGlvbiBxdWFsaXR5IHVzaW5nIDQgc3RlcFxuICAgICAgICAvLyBiYXIgaW5kaWNhdG9yXG4gICAgICAgIC8vY29uc29sZS5pbmZvKFwiTG9zcyBTTUEzOiBcIiArIG91dHB1dEF2ZyArIFwiIFE6IFwiICsgcXVhbGl0eSk7XG4gICAgfVxufTtcblxuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGhyaXN0byBvbiA4LzQvMTQuXG4gKi9cbnZhciBMb2NhbFN0YXRzID0gcmVxdWlyZShcIi4vTG9jYWxTdGF0c0NvbGxlY3Rvci5qc1wiKTtcbnZhciBSVFBTdGF0cyA9IHJlcXVpcmUoXCIuL1JUUFN0YXRzQ29sbGVjdG9yLmpzXCIpO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIik7XG52YXIgU3RyZWFtRXZlbnRUeXBlcyA9IHJlcXVpcmUoXCIuLi9zZXJ2aWNlL1JUQy9TdHJlYW1FdmVudFR5cGVzLmpzXCIpO1xuXG52YXIgU3RhdGlzdGljc0FjdGl2YXRvciA9IGZ1bmN0aW9uKClcbntcbiAgICB2YXIgZXZlbnRFbW1pdGVyID0gbnVsbDtcblxuICAgIHZhciBsb2NhbFN0YXRzID0gbnVsbDtcblxuICAgIHZhciBydHBTdGF0cyA9IG51bGw7XG5cbiAgICBmdW5jdGlvbiBTdGF0aXN0aWNzQWN0aXZhdG9yUHJvdG8oKVxuICAgIHtcblxuICAgIH1cblxuICAgIFN0YXRpc3RpY3NBY3RpdmF0b3JQcm90by5MT0NBTF9KSUQgPSAnbG9jYWwnO1xuXG4gICAgU3RhdGlzdGljc0FjdGl2YXRvclByb3RvLmFkZEF1ZGlvTGV2ZWxMaXN0ZW5lciA9IGZ1bmN0aW9uKGxpc3RlbmVyKVxuICAgIHtcbiAgICAgICAgaWYoZXZlbnRFbW1pdGVyID09IG51bGwpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGV2ZW50RW1taXRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV2ZW50RW1taXRlci5vbihcInN0YXRpc3RpY3MuYXVkaW9MZXZlbFwiLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgU3RhdGlzdGljc0FjdGl2YXRvclByb3RvLnJlbW92ZUF1ZGlvTGV2ZWxMaXN0ZW5lciA9IGZ1bmN0aW9uKGxpc3RlbmVyKVxuICAgIHtcbiAgICAgICAgaWYoZXZlbnRFbW1pdGVyID09IG51bGwpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGV2ZW50RW1taXRlci5yZW1vdmVMaXN0ZW5lcihcInN0YXRpc3RpY3MuYXVkaW9MZXZlbFwiLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgU3RhdGlzdGljc0FjdGl2YXRvclByb3RvLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmKGV2ZW50RW1taXRlcilcbiAgICAgICAge1xuICAgICAgICAgICAgZXZlbnRFbW1pdGVyLnJlbW92ZUFsbExpc3RlbmVycyhcInN0YXRpc3RpY3MuYXVkaW9MZXZlbFwiKTtcbiAgICAgICAgICAgIGV2ZW50RW1taXRlciA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgU3RhdGlzdGljc0FjdGl2YXRvci5zdG9wTG9jYWwoKTtcbiAgICAgICAgU3RhdGlzdGljc0FjdGl2YXRvci5zdG9wUmVtb3RlKCk7XG5cbiAgICB9XG5cbiAgICBTdGF0aXN0aWNzQWN0aXZhdG9yUHJvdG8uc3RvcExvY2FsID0gZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgaWYobG9jYWxTdGF0cylcbiAgICAgICAge1xuICAgICAgICAgICAgbG9jYWxTdGF0cy5zdG9wKCk7XG4gICAgICAgICAgICBsb2NhbFN0YXRzID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIFN0YXRpc3RpY3NBY3RpdmF0b3JQcm90by5zdG9wUmVtb3RlID0gZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgICAgaWYocnRwU3RhdHMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJ0cFN0YXRzLnN0b3AoKTtcbiAgICAgICAgICAgIHJ0cFN0YXRzID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIFN0YXRpc3RpY3NBY3RpdmF0b3JQcm90by5zdGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgUlRDQWN0aXZhdG9yLmFkZFN0cmVhbUxpc3RlbmVyKFN0YXRpc3RpY3NBY3RpdmF0b3Iub25TdHJlYW1DcmVhdGVkLFxuICAgICAgICAgICAgU3RyZWFtRXZlbnRUeXBlcy5FVkVOVF9UWVBFX0xPQ0FMX0NSRUFURUQpO1xuICAgIH1cblxuICAgIFN0YXRpc3RpY3NBY3RpdmF0b3JQcm90by5vblN0cmVhbUNyZWF0ZWQgPSBmdW5jdGlvbihzdHJlYW0pXG4gICAge1xuICAgICAgICBpZihldmVudEVtbWl0ZXIgPT0gbnVsbClcbiAgICAgICAgICAgIGV2ZW50RW1taXRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgICAgICAgbG9jYWxTdGF0cyA9IG5ldyBMb2NhbFN0YXRzKHN0cmVhbS5nZXRPcmlnaW5hbFN0cmVhbSgpLCAxMDAsIGV2ZW50RW1taXRlcik7XG4gICAgICAgIGxvY2FsU3RhdHMuc3RhcnQoKTtcbiAgICB9XG5cbiAgICBTdGF0aXN0aWNzQWN0aXZhdG9yUHJvdG8uc3RhcnRSZW1vdGVTdGF0cyA9IGZ1bmN0aW9uIChwZWVyY29ubmVjdGlvbikge1xuICAgICAgICBpZiAoY29uZmlnLmVuYWJsZVJ0cFN0YXRzKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZihydHBTdGF0cylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBydHBTdGF0cy5zdG9wKCk7XG4gICAgICAgICAgICAgICAgcnRwU3RhdHMgPSBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZihldmVudEVtbWl0ZXIgPT0gbnVsbClcbiAgICAgICAgICAgICAgICBldmVudEVtbWl0ZXIgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gICAgICAgICAgICBydHBTdGF0cyA9IG5ldyBSVFBTdGF0cyhwZWVyY29ubmVjdGlvbiwgMjAwLCBldmVudEVtbWl0ZXIpO1xuICAgICAgICAgICAgcnRwU3RhdHMuc3RhcnQoKTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgcmV0dXJuIFN0YXRpc3RpY3NBY3RpdmF0b3JQcm90bztcblxufSgpO1xuXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFN0YXRpc3RpY3NBY3RpdmF0b3I7IiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIl19
