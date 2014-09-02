var EventEmmiter = require("events");
var RTC = require("./RTC.js");
var SteamEventType = require("./StreamEventTypes.js");


var RTCService = function()
{
    var eventEmmiter = null;

    var rtc = null;

    function Stream(stream, eventEmmiter)
    {
        this.stream = stream;
        this.eventEmmiter = eventEmmiter;
        eventEmmiter.emit(StreamActivator.EVENT_TYPE_CREATED, this);
        var self = this;
        this.stream.onended = function()
        {
            self.streamEnded();
        }
    }

    Stream.prototype.streamEnded = function () {
        this.eventEmmiter.emit(StreamActivator.EVENT_TYPE_ENDED, this);
    }

    function RTCServiceProto() {

    }

    RTCServiceProto.init()
    {
        rtc = new RTC();
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

    RTCServiceProto.createStream = function (stream) {
        return new Stream(stream);
    };

    RTCServiceProto.attachMediaStream = function (element, stream) {
        return rtc.attachMediaStream(element, stream);
    };

    RTCServiceProto.getUserMediaWithConstraints =
        function(um, success_callback, failure_callback, resolution, bandwidth, fps, desktopStream)
        {
            return rtc.getUserMediaWithConstraints(um, success_callback, failure_callback, resolution, bandwidth, fps, desktopStream);
        };

    RTCServiceProto.dispose = function() {
        if (eventEmmiter) {
            eventEmmiter.removeAllListeners("statistics.audioLevel");
            eventEmmiter = null;
        }

        if (rtc) {
            rtc = null;
        }
    }



    return RTCServiceProto;
}();
