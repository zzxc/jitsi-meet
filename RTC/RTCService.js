var EventEmmiter = require("events");
var RTC = require("./RTC.js");
var SteamEventType = require("../service/RTC/StreamEventTypes.js");


var RTCService = function()
{
    var eventEmmiter = null;

    function Stream(stream, isVideoStream)
    {
        this.isVideoStream = false;
        if(isVideoStream)
            this.isVideoStream = isVideoStream;
        this.stream = stream;
        this.eventEmmiter = eventEmmiter;
        var type = null;
        if(this.isVideoStream)
        {
            type = StreamEventType.types.EVENT_TYPE_VIDEO_CREATED;
        }
        else
        {
            type = StreamEventType.types.EVENT_TYPE_AUDIO_CREATED;
        }
        eventEmmiter.emit(type, this);
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
            type = StreamEventType.types.EVENT_TYPE_VIDEO_ENDED;
        }
        else
        {
            type = StreamEventType.types.EVENT_TYPE_AUDIO_ENDED;
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

    RTCServiceProto.createStream = function (stream, isVideoStream) {
        return new Stream(stream, isVideoStream);
    };

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

    RTCServiceProto.BROWSER_CHROME = "chrome";
    RTCServiceProto.BROWSER_FIREFOX = "firefox";

    return RTCServiceProto;
}();
