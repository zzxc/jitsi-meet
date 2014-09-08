(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
        eventEmmiter.emit(StreamEventTypes.types.EVENT_TYPE_REMOTE_CREATED, this);
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
var RTCActivator = require("./RTCActivator.js");

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
},{"../service/RTC/RTCBrowserType.js":5,"./RTCActivator.js":3}],3:[function(require,module,exports){
/**
 * Created by hristo on 8/20/14.
 */

var RTCService = require("./RTCService.js");

var RTCActivator = (function()
{
    var rtcService = null;

    return {


        stop:  function () {
            rtcService.dispose();
            rtcService = null;

        },



        start: function () {
            rtcService = new RTCService();
        },

        getRTCService: function () {
            return rtcService;
        },

        addStreamListener: function(listener, eventType)
        {
            return RTCService.addStreamListener(listener, eventType);
        },

        removeStreamListener: function(listener, eventType)
        {
            return RTCService.removeStreamListener(listener, eventType);
        }

};
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
        this.isVideoStream = false;
        if(isVideoStream)
            this.isVideoStream = isVideoStream;
        this.stream = stream;
        this.eventEmmiter = eventEmmiter;
        this.type = type;
        eventEmmiter.emit(StreamEventTypes.types.EVENT_TYPE_LOCAL_CREATED, this);
        var self = this;
        this.stream.onended = function()
        {
            self.streamEnded();
        }
    }

    Stream.prototype.streamEnded = function () {
        var type = null;
        if(this.isVideoStream)
        {
            type = StreamEventTypes.types.EVENT_TYPE_LOCAL_VIDEO_ENDED;
        }
        else
        {
            type = StreamEventTypes.types.EVENT_TYPE_LOCAL_AUDIO_ENDED;
        }
        eventEmmiter.emit(type, this);
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
    }


    RTCServiceProto.addStreamListener = function (listener, eventType) {
        if(!(eventType instanceof SteamEventType))
            throw "Illegal argument";

        if (eventEmmiter == null) {
            eventEmmiter = new EventEmitter();
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

},{"../service/RTC/StreamEventTypes.js":6,"./MediaStream.js":1,"./RTC.js":2,"events":10}],5:[function(require,module,exports){
function RTCBrowserType(type)
{
    this.type = type;
}

module.exports = {
    RTC_BROWSER_CHROME: new RTCBrowserType("chrome"),

    RTC_BROWSER_FIREFOX: new RTCBrowserType("firefox")
}
},{}],6:[function(require,module,exports){
function SteamEventType(type)
{
    this.type = type;
}

SteamEventType.types = {
    EVENT_TYPE_LOCAL_CREATED: new SteamEventType("stream.local_created"),

    EVENT_TYPE_LOCAL_ENDED: new SteamEventType("stream.local_ended"),

    EVENT_TYPE_REMOTE_CREATED: new SteamEventType("stream.remote_created"),

    EVENT_TYPE_REMOTE_ENDED: new SteamEventType("stream.remote_ended")
}

module.exports = SteamEventType;
},{}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
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


},{}],9:[function(require,module,exports){
/**
 * Created by hristo on 8/4/14.
 */
var LocalStats = require("./LocalStatsCollector.js");
var RTPStats = require("./RTPStatsCollector.js");
var EventEmmiter = require("events");
var RTCActivator = require("../RTC/RTCActivator.js");
var StreamEventTypes = require("../service/RTC/StreamEventTypes.js");

function StatisticsActivator()
{
    var eventEmmiter = null;

    var localStats = null;

    var rtpStats = null;
    StatisticsActivator.LOCAL_JID = 'local';

    StatisticsActivator.addAudioLevelListener = function(listener)
    {
        if(eventEmmiter == null)
        {
            eventEmmiter = new EventEmitter();
        }

        eventEmmiter.on("statistics.audioLevel", listener);
    }

    StatisticsActivator.removeAudioLevelListener = function(listener)
    {
        if(eventEmmiter == null)
            return;
        eventEmmiter.removeListener("statistics.audioLevel", listener);
    }

    StatisticsActivator.stop = function () {
        if(eventEmmiter)
        {
            eventEmmiter.removeAllListeners("statistics.audioLevel");
            eventEmmiter = null;
        }
        StatisticsActivator.stopLocal();
        StatisticsActivator.stopRemote();

    }

    StatisticsActivator.stopLocal = function()
    {
        if(localStats)
        {
            localStats.stop();
            localStats = null;
        }
    }

    StatisticsActivator.stopRemote = function()
    {
        if(rtpStats)
        {
            rtpStats.stop();
            rtpStats = null;
        }
    }
    
    StatisticsActivator.start = function () {
        RTCActivator.addStreamListener(StatisticsActivator.onStreamCreated,
            SteamEventType.types.EVENT_TYPE_LOCAL_AUDIO_CREATED);
    }

    StatisticsActivator.onStreamCreated = function(stream)
    {
        localStats = new LocalStats(stream.getOriginalStream(), 100, eventEmmiter);
        localStats.start();
    }

    StatisticsActivator.startRemoteStats = function (peerconnection) {
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

}




module.exports = StatisticsActivator;
},{"../RTC/RTCActivator.js":3,"../service/RTC/StreamEventTypes.js":6,"./LocalStatsCollector.js":7,"./RTPStatsCollector.js":8,"events":10}],10:[function(require,module,exports){
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

},{}]},{},[9]);
