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

    Stream.prototype.mute = function()
    {
        var ismuted = false;
        var tracks = [];
        if(this.type = "audio")
        {
            tracks = this.stream.getAudioTracks();
        }
        else
        {
            tracks = this.stream.getVideoTracks();
        }

        for (var idx = 0; idx < tracks.length; idx++) {
            ismuted = !tracks[idx].enabled;
            tracks[idx].enabled = !tracks[idx].enabled;
        }
        return ismuted;
    }

    Stream.prototype.isMuted = function () {
        var tracks = [];
        if(this.type = "audio")
        {
            tracks = this.stream.getAudioTracks();
        }
        else
        {
            tracks = this.stream.getVideoTracks();
        }
        for (var idx = 0; idx < tracks.length; idx++) {
            if(tracks[idx].enabled)
                return false;
        }
        return true;
    }

    function RTCServiceProto() {
        this.rtc = new RTC(this);
        this.rtc.obtainAudioAndVideoPermissions();
        this.localStreams = new Array();
        this.remoteStreams = {};
        this.localAudio = null;
        this.localVideo = null;
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
        if(type == "audio")
        {
            this.localAudio = localStream;
        }
        else
        {
            this.localVideo = localStream;
        }
        eventEmitter.emit(StreamEventTypes.EVENT_TYPE_LOCAL_CREATED, localStream);
        return localStream;
    };
    
    RTCServiceProto.prototype.removeLocalStream = function (stream) {
        for(var i = 0; i < this.localStreams.length; i++)
        {
            if(this.localStreams[i].getOriginalStream() === stream) {
                delete this.localStreams[i];
                return;
            }
        }
    }
    
    RTCServiceProto.prototype.createRemoteStream = function (data, sid, thessrc) {
        var remoteStream = new MediaStream(data, sid, thessrc, eventEmitter);
        this.remoteStreams[remoteStream.peerjid] = {};
        this.remoteStreams[remoteStream.peerjid][remoteStream.type] = remoteStream;
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
