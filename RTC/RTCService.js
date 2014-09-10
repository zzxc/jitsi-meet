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
