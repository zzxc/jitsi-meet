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
                this.eventEmmiter("statistics.audioLevel", jid, audioLevel);
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
var EventEmmiter = require("events");
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
            eventEmmiter = new EventEmmiter();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9zZXJ2aWNlL1JUQy9TdHJlYW1FdmVudFR5cGVzLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvc3RhdGlzdGljcy9Mb2NhbFN0YXRzQ29sbGVjdG9yLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvc3RhdGlzdGljcy9SVFBTdGF0c0NvbGxlY3Rvci5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L3N0YXRpc3RpY3MvU3RhdGlzdGljc0FjdGl2YXRvci5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBTdHJlYW1FdmVudFR5cGVzID0ge1xuICAgIEVWRU5UX1RZUEVfTE9DQUxfQ1JFQVRFRDogXCJzdHJlYW0ubG9jYWxfY3JlYXRlZFwiLFxuXG4gICAgRVZFTlRfVFlQRV9MT0NBTF9FTkRFRDogXCJzdHJlYW0ubG9jYWxfZW5kZWRcIixcblxuICAgIEVWRU5UX1RZUEVfUkVNT1RFX0NSRUFURUQ6IFwic3RyZWFtLnJlbW90ZV9jcmVhdGVkXCIsXG5cbiAgICBFVkVOVF9UWVBFX1JFTU9URV9FTkRFRDogXCJzdHJlYW0ucmVtb3RlX2VuZGVkXCJcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3RyZWFtRXZlbnRUeXBlczsiLCIvKipcbiAqIFByb3ZpZGVzIHN0YXRpc3RpY3MgZm9yIHRoZSBsb2NhbCBzdHJlYW0uXG4gKi9cbnZhciBMb2NhbFN0YXRzQ29sbGVjdG9yID0gKGZ1bmN0aW9uKCkge1xuICAgIC8qKlxuICAgICAqIFNpemUgb2YgdGhlIHdlYmF1ZGlvIGFuYWxpemVyIGJ1ZmZlci5cbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIHZhciBXRUJBVURJT19BTkFMSVpFUl9GRlRfU0laRSA9IDIwNDg7XG5cbiAgICAvKipcbiAgICAgKiBWYWx1ZSBvZiB0aGUgd2ViYXVkaW8gYW5hbGl6ZXIgc21vb3RoaW5nIHRpbWUgcGFyYW1ldGVyLlxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgdmFyIFdFQkFVRElPX0FOQUxJWkVSX1NNT09USU5HX1RJTUUgPSAwLjg7XG5cbiAgICAvKipcbiAgICAgKiA8dHQ+TG9jYWxTdGF0c0NvbGxlY3RvcjwvdHQ+IGNhbGN1bGF0ZXMgc3RhdGlzdGljcyBmb3IgdGhlIGxvY2FsIHN0cmVhbS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdHJlYW0gdGhlIGxvY2FsIHN0cmVhbVxuICAgICAqIEBwYXJhbSBpbnRlcnZhbCBzdGF0cyByZWZyZXNoIGludGVydmFsIGdpdmVuIGluIG1zLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb24oTG9jYWxTdGF0c0NvbGxlY3Rvcil9IHVwZGF0ZUNhbGxiYWNrIHRoZSBjYWxsYmFjayBjYWxsZWQgb24gc3RhdHNcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlLlxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIExvY2FsU3RhdHNDb2xsZWN0b3JQcm90byhzdHJlYW0sIGludGVydmFsLCBldmVudEVtbWl0ZXIpIHtcbiAgICAgICAgd2luZG93LkF1ZGlvQ29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcbiAgICAgICAgdGhpcy5zdHJlYW0gPSBzdHJlYW07XG4gICAgICAgIHRoaXMuaW50ZXJ2YWxJZCA9IG51bGw7XG4gICAgICAgIHRoaXMuaW50ZXJ2YWxNaWxpcyA9IGludGVydmFsO1xuICAgICAgICB0aGlzLmV2ZW50RW1taXRlciA9IGV2ZW50RW1taXRlcjtcbiAgICAgICAgdGhpcy5hdWRpb0xldmVsID0gMDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTdGFydHMgdGhlIGNvbGxlY3RpbmcgdGhlIHN0YXRpc3RpY3MuXG4gICAgICovXG4gICAgTG9jYWxTdGF0c0NvbGxlY3RvclByb3RvLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuQXVkaW9Db250ZXh0KVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHZhciBjb250ZXh0ID0gbmV3IEF1ZGlvQ29udGV4dCgpO1xuICAgICAgICB2YXIgYW5hbHlzZXIgPSBjb250ZXh0LmNyZWF0ZUFuYWx5c2VyKCk7XG4gICAgICAgIGFuYWx5c2VyLnNtb290aGluZ1RpbWVDb25zdGFudCA9IFdFQkFVRElPX0FOQUxJWkVSX1NNT09USU5HX1RJTUU7XG4gICAgICAgIGFuYWx5c2VyLmZmdFNpemUgPSBXRUJBVURJT19BTkFMSVpFUl9GRlRfU0laRTtcblxuXG4gICAgICAgIHZhciBzb3VyY2UgPSBjb250ZXh0LmNyZWF0ZU1lZGlhU3RyZWFtU291cmNlKHRoaXMuc3RyZWFtKTtcbiAgICAgICAgc291cmNlLmNvbm5lY3QoYW5hbHlzZXIpO1xuXG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHRoaXMuaW50ZXJ2YWxJZCA9IHNldEludGVydmFsKFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBhcnJheSA9IG5ldyBVaW50OEFycmF5KGFuYWx5c2VyLmZyZXF1ZW5jeUJpbkNvdW50KTtcbiAgICAgICAgICAgICAgICBhbmFseXNlci5nZXRCeXRlVGltZURvbWFpbkRhdGEoYXJyYXkpO1xuICAgICAgICAgICAgICAgIHZhciBhdWRpb0xldmVsID0gVGltZURvbWFpbkRhdGFUb0F1ZGlvTGV2ZWwoYXJyYXkpO1xuICAgICAgICAgICAgICAgIGlmKGF1ZGlvTGV2ZWwgIT0gc2VsZi5hdWRpb0xldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuYXVkaW9MZXZlbCA9IGFuaW1hdGVMZXZlbChhdWRpb0xldmVsLCBzZWxmLmF1ZGlvTGV2ZWwpO1xuICAgICAgICAgICAgICAgICAgICBpZighaXNBdWRpb011dGVkKCkpXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmV2ZW50RW1taXRlci50cmlnZ2VyKFwic3RhdGlzdGljcy5hdWRpb0xldmVsXCIsIExvY2FsU3RhdHNDb2xsZWN0b3JQcm90by5MT0NBTF9KSUQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5hdWRpb0xldmVsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGhpcy5pbnRlcnZhbE1pbGlzXG4gICAgICAgICk7XG5cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU3RvcHMgY29sbGVjdGluZyB0aGUgc3RhdGlzdGljcy5cbiAgICAgKi9cbiAgICBMb2NhbFN0YXRzQ29sbGVjdG9yUHJvdG8ucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLmludGVydmFsSWQpIHtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5pbnRlcnZhbElkKTtcbiAgICAgICAgICAgIHRoaXMuaW50ZXJ2YWxJZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ29udmVydHMgdGltZSBkb21haW4gZGF0YSBhcnJheSB0byBhdWRpbyBsZXZlbC5cbiAgICAgKiBAcGFyYW0gYXJyYXkgdGhlIHRpbWUgZG9tYWluIGRhdGEgYXJyYXkuXG4gICAgICogQHJldHVybnMge251bWJlcn0gdGhlIGF1ZGlvIGxldmVsXG4gICAgICovXG4gICAgdmFyIFRpbWVEb21haW5EYXRhVG9BdWRpb0xldmVsID0gZnVuY3Rpb24gKHNhbXBsZXMpIHtcblxuICAgICAgICB2YXIgbWF4Vm9sdW1lID0gMDtcblxuICAgICAgICB2YXIgbGVuZ3RoID0gc2FtcGxlcy5sZW5ndGg7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKG1heFZvbHVtZSA8IHNhbXBsZXNbaV0pXG4gICAgICAgICAgICAgICAgbWF4Vm9sdW1lID0gc2FtcGxlc1tpXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwYXJzZUZsb2F0KCgobWF4Vm9sdW1lIC0gMTI3KSAvIDEyOCkudG9GaXhlZCgzKSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFuaW1hdGVzIGF1ZGlvIGxldmVsIGNoYW5nZVxuICAgICAqIEBwYXJhbSBuZXdMZXZlbCB0aGUgbmV3IGF1ZGlvIGxldmVsXG4gICAgICogQHBhcmFtIGxhc3RMZXZlbCB0aGUgbGFzdCBhdWRpbyBsZXZlbFxuICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9IHRoZSBhdWRpbyBsZXZlbCB0byBiZSBzZXRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBhbmltYXRlTGV2ZWwobmV3TGV2ZWwsIGxhc3RMZXZlbClcbiAgICB7XG4gICAgICAgIHZhciB2YWx1ZSA9IDA7XG4gICAgICAgIHZhciBkaWZmID0gbGFzdExldmVsIC0gbmV3TGV2ZWw7XG4gICAgICAgIGlmKGRpZmYgPiAwLjIpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhbHVlID0gbGFzdExldmVsIC0gMC4yO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYoZGlmZiA8IC0wLjQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhbHVlID0gbGFzdExldmVsICsgMC40O1xuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAge1xuICAgICAgICAgICAgdmFsdWUgPSBuZXdMZXZlbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwYXJzZUZsb2F0KHZhbHVlLnRvRml4ZWQoMykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluZGljYXRlcyB0aGF0IHRoaXMgYXVkaW8gbGV2ZWwgaXMgZm9yIGxvY2FsIGppZC5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIExvY2FsU3RhdHNDb2xsZWN0b3JQcm90by5MT0NBTF9KSUQgPSAnbG9jYWwnO1xuXG4gICAgcmV0dXJuIExvY2FsU3RhdHNDb2xsZWN0b3JQcm90bztcbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gTG9jYWxTdGF0c0NvbGxlY3RvcjsiLCIvKiBnbG9iYWwgc3NyYzJqaWQgKi9cblxuLyoqXG4gKiBGdW5jdGlvbiBvYmplY3Qgd2hpY2ggb25jZSBjcmVhdGVkIGNhbiBiZSB1c2VkIHRvIGNhbGN1bGF0ZSBtb3ZpbmcgYXZlcmFnZSBvZlxuICogZ2l2ZW4gcGVyaW9kLiBFeGFtcGxlIGZvciBTTUEzOjwvYnI+XG4gKiB2YXIgc21hMyA9IG5ldyBTaW1wbGVNb3ZpbmdBdmVyYWdlcigzKTtcbiAqIHdoaWxlKHRydWUpIC8vIHNvbWUgdXBkYXRlIGxvb3BcbiAqIHtcbiAqICAgdmFyIGN1cnJlbnRTbWEzVmFsdWUgPSBzbWEzKG5leHRJbnB1dFZhbHVlKTtcbiAqIH1cbiAqXG4gKiBAcGFyYW0gcGVyaW9kIG1vdmluZyBhdmVyYWdlIHBlcmlvZCB0aGF0IHdpbGwgYmUgdXNlZCBieSBjcmVhdGVkIGluc3RhbmNlLlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBTTUEgY2FsY3VsYXRvciBmdW5jdGlvbiBvZiBnaXZlbiA8dHQ+cGVyaW9kPC90dD4uXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gU2ltcGxlTW92aW5nQXZlcmFnZXIocGVyaW9kKVxue1xuICAgIHZhciBudW1zID0gW107XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChudW0pXG4gICAge1xuICAgICAgICBudW1zLnB1c2gobnVtKTtcbiAgICAgICAgaWYgKG51bXMubGVuZ3RoID4gcGVyaW9kKVxuICAgICAgICAgICAgbnVtcy5zcGxpY2UoMCwgMSk7XG4gICAgICAgIHZhciBzdW0gPSAwO1xuICAgICAgICBmb3IgKHZhciBpIGluIG51bXMpXG4gICAgICAgICAgICBzdW0gKz0gbnVtc1tpXTtcbiAgICAgICAgdmFyIG4gPSBwZXJpb2Q7XG4gICAgICAgIGlmIChudW1zLmxlbmd0aCA8IHBlcmlvZClcbiAgICAgICAgICAgIG4gPSBudW1zLmxlbmd0aDtcbiAgICAgICAgcmV0dXJuIChzdW0gLyBuKTtcbiAgICB9O1xufVxuXG4vKipcbiAqIFBlZXIgc3RhdGlzdGljcyBkYXRhIGhvbGRlci5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBQZWVyU3RhdHMoKVxue1xuICAgIHRoaXMuc3NyYzJMb3NzID0ge307XG4gICAgdGhpcy5zc3JjMkF1ZGlvTGV2ZWwgPSB7fTtcbn1cblxuLyoqXG4gKiBTZXRzIHBhY2tldHMgbG9zcyByYXRlIGZvciBnaXZlbiA8dHQ+c3NyYzwvdHQ+IHRoYXQgYmxvbmcgdG8gdGhlIHBlZXJcbiAqIHJlcHJlc2VudGVkIGJ5IHRoaXMgaW5zdGFuY2UuXG4gKiBAcGFyYW0gc3NyYyBhdWRpbyBvciB2aWRlbyBSVFAgc3RyZWFtIFNTUkMuXG4gKiBAcGFyYW0gbG9zc1JhdGUgbmV3IHBhY2tldCBsb3NzIHJhdGUgdmFsdWUgdG8gYmUgc2V0LlxuICovXG5QZWVyU3RhdHMucHJvdG90eXBlLnNldFNzcmNMb3NzID0gZnVuY3Rpb24gKHNzcmMsIGxvc3NSYXRlKVxue1xuICAgIHRoaXMuc3NyYzJMb3NzW3NzcmNdID0gbG9zc1JhdGU7XG59O1xuXG4vKipcbiAqIFNldHMgbmV3IGF1ZGlvIGxldmVsKGlucHV0IG9yIG91dHB1dCkgZm9yIGdpdmVuIDx0dD5zc3JjPC90dD4gdGhhdCBpZGVudGlmaWVzXG4gKiB0aGUgc3RyZWFtIHdoaWNoIGJlbG9uZ3MgdG8gdGhlIHBlZXIgcmVwcmVzZW50ZWQgYnkgdGhpcyBpbnN0YW5jZS5cbiAqIEBwYXJhbSBzc3JjIFJUUCBzdHJlYW0gU1NSQyBmb3Igd2hpY2ggY3VycmVudCBhdWRpbyBsZXZlbCB2YWx1ZSB3aWxsIGJlXG4gKiAgICAgICAgdXBkYXRlZC5cbiAqIEBwYXJhbSBhdWRpb0xldmVsIHRoZSBuZXcgYXVkaW8gbGV2ZWwgdmFsdWUgdG8gYmUgc2V0LiBWYWx1ZSBpcyB0cnVuY2F0ZWQgdG9cbiAqICAgICAgICBmaXQgdGhlIHJhbmdlIGZyb20gMCB0byAxLlxuICovXG5QZWVyU3RhdHMucHJvdG90eXBlLnNldFNzcmNBdWRpb0xldmVsID0gZnVuY3Rpb24gKHNzcmMsIGF1ZGlvTGV2ZWwpXG57XG4gICAgLy8gUmFuZ2UgbGltaXQgMCAtIDFcbiAgICB0aGlzLnNzcmMyQXVkaW9MZXZlbFtzc3JjXSA9IE1hdGgubWluKE1hdGgubWF4KGF1ZGlvTGV2ZWwsIDApLCAxKTtcbn07XG5cbi8qKlxuICogQ2FsY3VsYXRlcyBhdmVyYWdlIHBhY2tldCBsb3NzIGZvciBhbGwgc3RyZWFtcyB0aGF0IGJlbG9uZyB0byB0aGUgcGVlclxuICogcmVwcmVzZW50ZWQgYnkgdGhpcyBpbnN0YW5jZS5cbiAqIEByZXR1cm5zIHtudW1iZXJ9IGF2ZXJhZ2UgcGFja2V0IGxvc3MgZm9yIGFsbCBzdHJlYW1zIHRoYXQgYmVsb25nIHRvIHRoZSBwZWVyXG4gKiAgICAgICAgICAgICAgICAgICByZXByZXNlbnRlZCBieSB0aGlzIGluc3RhbmNlLlxuICovXG5QZWVyU3RhdHMucHJvdG90eXBlLmdldEF2Z0xvc3MgPSBmdW5jdGlvbiAoKVxue1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgYXZnID0gMDtcbiAgICB2YXIgY291bnQgPSBPYmplY3Qua2V5cyh0aGlzLnNzcmMyTG9zcykubGVuZ3RoO1xuICAgIE9iamVjdC5rZXlzKHRoaXMuc3NyYzJMb3NzKS5mb3JFYWNoKFxuICAgICAgICBmdW5jdGlvbiAoc3NyYylcbiAgICAgICAge1xuICAgICAgICAgICAgYXZnICs9IHNlbGYuc3NyYzJMb3NzW3NzcmNdO1xuICAgICAgICB9XG4gICAgKTtcbiAgICByZXR1cm4gY291bnQgPiAwID8gYXZnIC8gY291bnQgOiAwO1xufTtcblxuLyoqXG4gKiA8dHQ+U3RhdHNDb2xsZWN0b3I8L3R0PiByZWdpc3RlcnMgZm9yIHN0YXRzIHVwZGF0ZXMgb2YgZ2l2ZW5cbiAqIDx0dD5wZWVyY29ubmVjdGlvbjwvdHQ+IGluIGdpdmVuIDx0dD5pbnRlcnZhbDwvdHQ+LiBPbiBlYWNoIHVwZGF0ZSBwYXJ0aWN1bGFyXG4gKiBzdGF0cyBhcmUgZXh0cmFjdGVkIGFuZCBwdXQgaW4ge0BsaW5rIFBlZXJTdGF0c30gb2JqZWN0cy4gT25jZSB0aGUgcHJvY2Vzc2luZ1xuICogaXMgZG9uZSA8dHQ+dXBkYXRlQ2FsbGJhY2s8L3R0PiBpcyBjYWxsZWQgd2l0aCA8dHQ+dGhpczwvdHQ+IGluc3RhbmNlIGFzXG4gKiBhbiBldmVudCBzb3VyY2UuXG4gKlxuICogQHBhcmFtIHBlZXJjb25uZWN0aW9uIHdlYlJUQyBwZWVyIGNvbm5lY3Rpb24gb2JqZWN0LlxuICogQHBhcmFtIGludGVydmFsIHN0YXRzIHJlZnJlc2ggaW50ZXJ2YWwgZ2l2ZW4gaW4gbXMuXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKFN0YXRzQ29sbGVjdG9yKX0gdXBkYXRlQ2FsbGJhY2sgdGhlIGNhbGxiYWNrIGNhbGxlZCBvbiBzdGF0c1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZS5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBTdGF0c0NvbGxlY3RvcihwZWVyY29ubmVjdGlvbiwgaW50ZXJ2YWwsIGV2ZW50RW1taXRlcilcbntcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uID0gcGVlcmNvbm5lY3Rpb247XG4gICAgdGhpcy5iYXNlbGluZVJlcG9ydCA9IG51bGw7XG4gICAgdGhpcy5jdXJyZW50UmVwb3J0ID0gbnVsbDtcbiAgICB0aGlzLmludGVydmFsSWQgPSBudWxsO1xuICAgIC8vIFVwZGF0ZXMgc3RhdHMgaW50ZXJ2YWxcbiAgICB0aGlzLmludGVydmFsTWlsaXMgPSBpbnRlcnZhbDtcbiAgICAvLyBVc2UgU01BIDMgdG8gYXZlcmFnZSBwYWNrZXQgbG9zcyBjaGFuZ2VzIG92ZXIgdGltZVxuICAgIHRoaXMuc21hMyA9IG5ldyBTaW1wbGVNb3ZpbmdBdmVyYWdlcigzKTtcbiAgICAvLyBNYXAgb2YgamlkcyB0byBQZWVyU3RhdHNcbiAgICB0aGlzLmppZDJzdGF0cyA9IHt9O1xuXG4gICAgdGhpcy5ldmVudEVtbWl0ZXIgPSBldmVudEVtbWl0ZXI7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU3RhdHNDb2xsZWN0b3I7XG5cbi8qKlxuICogU3RvcHMgc3RhdHMgdXBkYXRlcy5cbiAqL1xuU3RhdHNDb2xsZWN0b3IucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbiAoKVxue1xuICAgIGlmICh0aGlzLmludGVydmFsSWQpXG4gICAge1xuICAgICAgICBjbGVhckludGVydmFsKHRoaXMuaW50ZXJ2YWxJZCk7XG4gICAgICAgIHRoaXMuaW50ZXJ2YWxJZCA9IG51bGw7XG4gICAgfVxufTtcblxuLyoqXG4gKiBDYWxsYmFjayBwYXNzZWQgdG8gPHR0PmdldFN0YXRzPC90dD4gbWV0aG9kLlxuICogQHBhcmFtIGVycm9yIGFuIGVycm9yIHRoYXQgb2NjdXJyZWQgb24gPHR0PmdldFN0YXRzPC90dD4gY2FsbC5cbiAqL1xuU3RhdHNDb2xsZWN0b3IucHJvdG90eXBlLmVycm9yQ2FsbGJhY2sgPSBmdW5jdGlvbiAoZXJyb3IpXG57XG4gICAgY29uc29sZS5lcnJvcihcIkdldCBzdGF0cyBlcnJvclwiLCBlcnJvcik7XG4gICAgdGhpcy5zdG9wKCk7XG59O1xuXG4vKipcbiAqIFN0YXJ0cyBzdGF0cyB1cGRhdGVzLlxuICovXG5TdGF0c0NvbGxlY3Rvci5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbiAoKVxue1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmludGVydmFsSWQgPSBzZXRJbnRlcnZhbChcbiAgICAgICAgZnVuY3Rpb24gKClcbiAgICAgICAge1xuICAgICAgICAgICAgLy8gSW50ZXJ2YWwgdXBkYXRlc1xuICAgICAgICAgICAgc2VsZi5wZWVyY29ubmVjdGlvbi5nZXRTdGF0cyhcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVwb3J0KVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSByZXBvcnQucmVzdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5lcnJvcihcIkdvdCBpbnRlcnZhbCByZXBvcnRcIiwgcmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuY3VycmVudFJlcG9ydCA9IHJlc3VsdHM7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYucHJvY2Vzc1JlcG9ydCgpO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmJhc2VsaW5lUmVwb3J0ID0gc2VsZi5jdXJyZW50UmVwb3J0O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2VsZi5lcnJvckNhbGxiYWNrXG4gICAgICAgICAgICApO1xuICAgICAgICB9LFxuICAgICAgICBzZWxmLmludGVydmFsTWlsaXNcbiAgICApO1xufTtcblxuLyoqXG4gKiBTdGF0cyBwcm9jZXNzaW5nIGxvZ2ljLlxuICovXG5TdGF0c0NvbGxlY3Rvci5wcm90b3R5cGUucHJvY2Vzc1JlcG9ydCA9IGZ1bmN0aW9uICgpXG57XG4gICAgaWYgKCF0aGlzLmJhc2VsaW5lUmVwb3J0KVxuICAgIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAodmFyIGlkeCBpbiB0aGlzLmN1cnJlbnRSZXBvcnQpXG4gICAge1xuICAgICAgICB2YXIgbm93ID0gdGhpcy5jdXJyZW50UmVwb3J0W2lkeF07XG4gICAgICAgIGlmIChub3cudHlwZSAhPSAnc3NyYycpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGJlZm9yZSA9IHRoaXMuYmFzZWxpbmVSZXBvcnRbaWR4XTtcbiAgICAgICAgaWYgKCFiZWZvcmUpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2Fybihub3cuc3RhdCgnc3NyYycpICsgJyBub3QgZW5vdWdoIGRhdGEnKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHNzcmMgPSBub3cuc3RhdCgnc3NyYycpO1xuICAgICAgICB2YXIgamlkID0gc3NyYzJqaWRbc3NyY107XG4gICAgICAgIGlmICghamlkKVxuICAgICAgICB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCJObyBqaWQgZm9yIHNzcmM6IFwiICsgc3NyYyk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBqaWRTdGF0cyA9IHRoaXMuamlkMnN0YXRzW2ppZF07XG4gICAgICAgIGlmICghamlkU3RhdHMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGppZFN0YXRzID0gbmV3IFBlZXJTdGF0cygpO1xuICAgICAgICAgICAgdGhpcy5qaWQyc3RhdHNbamlkXSA9IGppZFN0YXRzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXVkaW8gbGV2ZWxcbiAgICAgICAgdmFyIGF1ZGlvTGV2ZWwgPSBub3cuc3RhdCgnYXVkaW9JbnB1dExldmVsJyk7XG4gICAgICAgIGlmICghYXVkaW9MZXZlbClcbiAgICAgICAgICAgIGF1ZGlvTGV2ZWwgPSBub3cuc3RhdCgnYXVkaW9PdXRwdXRMZXZlbCcpO1xuICAgICAgICBpZiAoYXVkaW9MZXZlbClcbiAgICAgICAge1xuICAgICAgICAgICAgLy8gVE9ETzogY2FuJ3QgZmluZCBzcGVjcyBhYm91dCB3aGF0IHRoaXMgdmFsdWUgcmVhbGx5IGlzLFxuICAgICAgICAgICAgLy8gYnV0IGl0IHNlZW1zIHRvIHZhcnkgYmV0d2VlbiAwIGFuZCBhcm91bmQgMzJrLlxuICAgICAgICAgICAgYXVkaW9MZXZlbCA9IGF1ZGlvTGV2ZWwgLyAzMjc2NztcbiAgICAgICAgICAgIGppZFN0YXRzLnNldFNzcmNBdWRpb0xldmVsKHNzcmMsIGF1ZGlvTGV2ZWwpO1xuICAgICAgICAgICAgLy9teSByb29tamlkIHNob3VsZG4ndCBiZSBnbG9iYWxcbiAgICAgICAgICAgIGlmKGppZCAhPSBjb25uZWN0aW9uLmVtdWMubXlyb29tamlkKVxuICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRFbW1pdGVyKFwic3RhdGlzdGljcy5hdWRpb0xldmVsXCIsIGppZCwgYXVkaW9MZXZlbCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIga2V5ID0gJ3BhY2tldHNSZWNlaXZlZCc7XG4gICAgICAgIGlmICghbm93LnN0YXQoa2V5KSlcbiAgICAgICAge1xuICAgICAgICAgICAga2V5ID0gJ3BhY2tldHNTZW50JztcbiAgICAgICAgICAgIGlmICghbm93LnN0YXQoa2V5KSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiTm8gcGFja2V0c1JlY2VpdmVkIG5vciBwYWNrZXRTZW50IHN0YXQgZm91bmRcIik7XG4gICAgICAgICAgICAgICAgdGhpcy5zdG9wKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBwYWNrZXRzTm93ID0gbm93LnN0YXQoa2V5KTtcbiAgICAgICAgdmFyIHBhY2tldHNCZWZvcmUgPSBiZWZvcmUuc3RhdChrZXkpO1xuICAgICAgICB2YXIgcGFja2V0UmF0ZSA9IHBhY2tldHNOb3cgLSBwYWNrZXRzQmVmb3JlO1xuXG4gICAgICAgIHZhciBjdXJyZW50TG9zcyA9IG5vdy5zdGF0KCdwYWNrZXRzTG9zdCcpO1xuICAgICAgICB2YXIgcHJldmlvdXNMb3NzID0gYmVmb3JlLnN0YXQoJ3BhY2tldHNMb3N0Jyk7XG4gICAgICAgIHZhciBsb3NzUmF0ZSA9IGN1cnJlbnRMb3NzIC0gcHJldmlvdXNMb3NzO1xuXG4gICAgICAgIHZhciBwYWNrZXRzVG90YWwgPSAocGFja2V0UmF0ZSArIGxvc3NSYXRlKTtcbiAgICAgICAgdmFyIGxvc3NQZXJjZW50O1xuXG4gICAgICAgIGlmIChwYWNrZXRzVG90YWwgPiAwKVxuICAgICAgICAgICAgbG9zc1BlcmNlbnQgPSBsb3NzUmF0ZSAvIHBhY2tldHNUb3RhbDtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgbG9zc1BlcmNlbnQgPSAwO1xuXG4gICAgICAgIC8vY29uc29sZS5pbmZvKGppZCArIFwiIHNzcmM6IFwiICsgc3NyYyArIFwiIFwiICsga2V5ICsgXCI6IFwiICsgcGFja2V0c05vdyk7XG5cbiAgICAgICAgamlkU3RhdHMuc2V0U3NyY0xvc3Moc3NyYywgbG9zc1BlcmNlbnQpO1xuICAgIH1cblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBKaWQgc3RhdHNcbiAgICB2YXIgYWxsUGVlcnNBdmcgPSAwO1xuICAgIHZhciBqaWRzID0gT2JqZWN0LmtleXModGhpcy5qaWQyc3RhdHMpO1xuICAgIGppZHMuZm9yRWFjaChcbiAgICAgICAgZnVuY3Rpb24gKGppZClcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHBlZXJBdmcgPSBzZWxmLmppZDJzdGF0c1tqaWRdLmdldEF2Z0xvc3MoXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKGF2ZylcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5pbmZvKGppZCArIFwiIHN0YXRzOiBcIiArIChhdmcgKiAxMDApICsgXCIgJVwiKTtcbiAgICAgICAgICAgICAgICAgICAgYWxsUGVlcnNBdmcgKz0gYXZnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICApO1xuXG4gICAgaWYgKGppZHMubGVuZ3RoID4gMSlcbiAgICB7XG4gICAgICAgIC8vIE91ciBzdHJlYW1zIGxvc3MgaXMgcmVwb3J0ZWQgYXMgMCBhbHdheXMsIHNvIC0xIHRvIGxlbmd0aFxuICAgICAgICBhbGxQZWVyc0F2ZyA9IGFsbFBlZXJzQXZnIC8gKGppZHMubGVuZ3RoIC0gMSk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENhbGN1bGF0ZXMgbnVtYmVyIG9mIGNvbm5lY3Rpb24gcXVhbGl0eSBiYXJzIGZyb20gNChoaSkgdG8gMChsbykuXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgb3V0cHV0QXZnID0gc2VsZi5zbWEzKGFsbFBlZXJzQXZnKTtcbiAgICAgICAgLy8gTGluZWFyIGZyb20gNCgwJSkgdG8gMCgyNSUpLlxuICAgICAgICB2YXIgcXVhbGl0eSA9IE1hdGgucm91bmQoNCAtIG91dHB1dEF2ZyAqIDE2KTtcbiAgICAgICAgcXVhbGl0eSA9IE1hdGgubWF4KHF1YWxpdHksIDApOyAvLyBsb3dlciBsaW1pdCAwXG4gICAgICAgIHF1YWxpdHkgPSBNYXRoLm1pbihxdWFsaXR5LCA0KTsgLy8gdXBwZXIgbGltaXQgNFxuICAgICAgICAvLyBUT0RPOiBxdWFsaXR5IGNhbiBiZSB1c2VkIHRvIGluZGljYXRlIGNvbm5lY3Rpb24gcXVhbGl0eSB1c2luZyA0IHN0ZXBcbiAgICAgICAgLy8gYmFyIGluZGljYXRvclxuICAgICAgICAvL2NvbnNvbGUuaW5mbyhcIkxvc3MgU01BMzogXCIgKyBvdXRwdXRBdmcgKyBcIiBROiBcIiArIHF1YWxpdHkpO1xuICAgIH1cbn07XG5cbiIsIi8qKlxuICogQ3JlYXRlZCBieSBocmlzdG8gb24gOC80LzE0LlxuICovXG52YXIgTG9jYWxTdGF0cyA9IHJlcXVpcmUoXCIuL0xvY2FsU3RhdHNDb2xsZWN0b3IuanNcIik7XG52YXIgUlRQU3RhdHMgPSByZXF1aXJlKFwiLi9SVFBTdGF0c0NvbGxlY3Rvci5qc1wiKTtcbnZhciBFdmVudEVtbWl0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpO1xudmFyIFN0cmVhbUV2ZW50VHlwZXMgPSByZXF1aXJlKFwiLi4vc2VydmljZS9SVEMvU3RyZWFtRXZlbnRUeXBlcy5qc1wiKTtcblxudmFyIFN0YXRpc3RpY3NBY3RpdmF0b3IgPSBmdW5jdGlvbigpXG57XG4gICAgdmFyIGV2ZW50RW1taXRlciA9IG51bGw7XG5cbiAgICB2YXIgbG9jYWxTdGF0cyA9IG51bGw7XG5cbiAgICB2YXIgcnRwU3RhdHMgPSBudWxsO1xuXG4gICAgZnVuY3Rpb24gU3RhdGlzdGljc0FjdGl2YXRvclByb3RvKClcbiAgICB7XG5cbiAgICB9XG5cbiAgICBTdGF0aXN0aWNzQWN0aXZhdG9yUHJvdG8uTE9DQUxfSklEID0gJ2xvY2FsJztcblxuICAgIFN0YXRpc3RpY3NBY3RpdmF0b3JQcm90by5hZGRBdWRpb0xldmVsTGlzdGVuZXIgPSBmdW5jdGlvbihsaXN0ZW5lcilcbiAgICB7XG4gICAgICAgIGlmKGV2ZW50RW1taXRlciA9PSBudWxsKVxuICAgICAgICB7XG4gICAgICAgICAgICBldmVudEVtbWl0ZXIgPSBuZXcgRXZlbnRFbW1pdGVyKCk7XG4gICAgICAgIH1cblxuICAgICAgICBldmVudEVtbWl0ZXIub24oXCJzdGF0aXN0aWNzLmF1ZGlvTGV2ZWxcIiwgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIFN0YXRpc3RpY3NBY3RpdmF0b3JQcm90by5yZW1vdmVBdWRpb0xldmVsTGlzdGVuZXIgPSBmdW5jdGlvbihsaXN0ZW5lcilcbiAgICB7XG4gICAgICAgIGlmKGV2ZW50RW1taXRlciA9PSBudWxsKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBldmVudEVtbWl0ZXIucmVtb3ZlTGlzdGVuZXIoXCJzdGF0aXN0aWNzLmF1ZGlvTGV2ZWxcIiwgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIFN0YXRpc3RpY3NBY3RpdmF0b3JQcm90by5zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZihldmVudEVtbWl0ZXIpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGV2ZW50RW1taXRlci5yZW1vdmVBbGxMaXN0ZW5lcnMoXCJzdGF0aXN0aWNzLmF1ZGlvTGV2ZWxcIik7XG4gICAgICAgICAgICBldmVudEVtbWl0ZXIgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFN0YXRpc3RpY3NBY3RpdmF0b3Iuc3RvcExvY2FsKCk7XG4gICAgICAgIFN0YXRpc3RpY3NBY3RpdmF0b3Iuc3RvcFJlbW90ZSgpO1xuXG4gICAgfVxuXG4gICAgU3RhdGlzdGljc0FjdGl2YXRvclByb3RvLnN0b3BMb2NhbCA9IGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIGlmKGxvY2FsU3RhdHMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGxvY2FsU3RhdHMuc3RvcCgpO1xuICAgICAgICAgICAgbG9jYWxTdGF0cyA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBTdGF0aXN0aWNzQWN0aXZhdG9yUHJvdG8uc3RvcFJlbW90ZSA9IGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICAgIGlmKHJ0cFN0YXRzKVxuICAgICAgICB7XG4gICAgICAgICAgICBydHBTdGF0cy5zdG9wKCk7XG4gICAgICAgICAgICBydHBTdGF0cyA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBTdGF0aXN0aWNzQWN0aXZhdG9yUHJvdG8uc3RhcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIFJUQ0FjdGl2YXRvci5hZGRTdHJlYW1MaXN0ZW5lcihTdGF0aXN0aWNzQWN0aXZhdG9yLm9uU3RyZWFtQ3JlYXRlZCxcbiAgICAgICAgICAgIFN0cmVhbUV2ZW50VHlwZXMuRVZFTlRfVFlQRV9MT0NBTF9DUkVBVEVEKTtcbiAgICB9XG5cbiAgICBTdGF0aXN0aWNzQWN0aXZhdG9yUHJvdG8ub25TdHJlYW1DcmVhdGVkID0gZnVuY3Rpb24oc3RyZWFtKVxuICAgIHtcbiAgICAgICAgbG9jYWxTdGF0cyA9IG5ldyBMb2NhbFN0YXRzKHN0cmVhbS5nZXRPcmlnaW5hbFN0cmVhbSgpLCAxMDAsIGV2ZW50RW1taXRlcik7XG4gICAgICAgIGxvY2FsU3RhdHMuc3RhcnQoKTtcbiAgICB9XG5cbiAgICBTdGF0aXN0aWNzQWN0aXZhdG9yUHJvdG8uc3RhcnRSZW1vdGVTdGF0cyA9IGZ1bmN0aW9uIChwZWVyY29ubmVjdGlvbikge1xuICAgICAgICBpZiAoY29uZmlnLmVuYWJsZVJ0cFN0YXRzKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZihydHBTdGF0cylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBydHBTdGF0cy5zdG9wKCk7XG4gICAgICAgICAgICAgICAgcnRwU3RhdHMgPSBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBydHBTdGF0cyA9IG5ldyBSVFBTdGF0cyhwZWVyY29ubmVjdGlvbiwgMjAwLCBldmVudEVtbWl0ZXIpO1xuICAgICAgICAgICAgcnRwU3RhdHMuc3RhcnQoKTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgcmV0dXJuIFN0YXRpc3RpY3NBY3RpdmF0b3JQcm90bztcblxufSgpO1xuXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFN0YXRpc3RpY3NBY3RpdmF0b3I7IiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIl19
