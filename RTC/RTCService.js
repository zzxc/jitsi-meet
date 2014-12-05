var EventEmitter = require("events");
var RTC = require("./RTC.js");
var StreamEventTypes = require("../service/RTC/StreamEventTypes.js");
var MediaStream = require("./MediaStream.js");
var XMPPEvents = require("../service/xmpp/XMPPEvents");

var eventEmitter = new EventEmitter();


function onConferenceCreated(event) {
    var DataChannels = require("./datachannels");
    DataChannels.bindDataChannelListener(event.peerconnection);
}

var RTCService = {
    rtc: null,
    localStreams: [],
    remoteStreams: {},
    localAudio: null,
    localVideo: null,
    addStreamListener: function (listener, eventType) {
        eventEmitter.on(eventType, listener);
    },
    removeStreamListener: function (listener, eventType) {
        if(!(eventType instanceof StreamEventTypes))
            throw "Illegal argument";

        eventEmitter.removeListener(eventType, listener);
    },
    createLocalStream: function (stream, type) {
        var localStream =  new require("./LocalStream")(stream, type);
        this.localStreams.push(localStream);
        if(type == "audio")
        {
            this.localAudio = localStream;
        }
        else
        {
            this.localVideo = localStream;
        }
        eventEmitter.emit(StreamEventTypes.EVENT_TYPE_LOCAL_CREATED,
            localStream);
        return localStream;
    },
    removeLocalStream: function (stream) {
        for(var i = 0; i < this.localStreams.length; i++)
        {
            if(this.localStreams[i].getOriginalStream() === stream) {
                delete this.localStreams[i];
                return;
            }
        }
    },
    createRemoteStream: function (data, sid, thessrc) {
        var remoteStream = new MediaStream(data, sid, thessrc, eventEmitter);
        this.remoteStreams[remoteStream.peerjid] = {};
        this.remoteStreams[remoteStream.peerjid][remoteStream.type]= remoteStream;
        return remoteStream;
    },
    getBrowserType: function () {
        return this.rtc.browser;
    },
    getPCConstraints: function () {
        return this.rtc.pc_constraints;
    },
    getUserMediaWithConstraints:function(um, success_callback,
                                         failure_callback, resolution,
                                         bandwidth, fps, desktopStream)
    {
        return this.rtc.getUserMediaWithConstraints(um, success_callback,
            failure_callback, resolution, bandwidth, fps, desktopStream);
    },
    dispose: function() {
        eventEmitter.removeAllListeners("statistics.audioLevel");

        if (this.rtc) {
            this.rtc = null;
        }
    },
    stop:  function () {
        this.dispose();
    },
    start: function () {
        this.rtc = new RTC(this);
        this.rtc.obtainAudioAndVideoPermissions();
        var XMPPService = require("../xmpp/XMPPService");
        XMPPService.addListener(XMPPEvents.CONFERENCE_CERATED,
            onConferenceCreated);
        XMPPService.addListener(XMPPEvents.CALL_INCOMING,
            onConferenceCreated);
    }
};

module.exports = RTCService;
