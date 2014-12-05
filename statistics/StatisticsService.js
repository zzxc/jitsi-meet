/**
 * Created by hristo on 8/4/14.
 */
var LocalStats = require("./LocalStatsCollector.js");
var RTPStats = require("./RTPStatsCollector.js");
var EventEmitter = require("events");
var StreamEventTypes = require("../service/RTC/StreamEventTypes.js");
var XMPPEvents = require("../service/xmpp/XMPPEvents");

var eventEmitter = new EventEmitter();

var localStats = null;

var rtpStats = null;

var RTCService = null;

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
        eventEmitter.emit("statistics.stop");
        rtpStats = null;
    }
}

function startRemoteStats (peerconnection) {
    if (config.enableRtpStats)
    {
        if(rtpStats)
        {
            rtpStats.stop();
            rtpStats = null;
        }

        rtpStats = new RTPStats(peerconnection, 200, 2000, eventEmitter);
        rtpStats.start();
    }

}


var StatisticsService =
{


    LOCAL_JID: 'local',

    addAudioLevelListener: function(listener)
    {
        eventEmitter.on("statistics.audioLevel", listener);
    },

    removeAudioLevelListener: function(listener)
    {
        eventEmitter.removeListener("statistics.audioLevel", listener);
    },

    addConnectionStatsListener: function(listener)
    {
        eventEmitter.on("statistics.connectionstats", listener);
    },

    removeConnectionStatsListener: function(listener)
    {
        eventEmitter.removeListener("statistics.connectionstats", listener);
    },


    addRemoteStatsStopListener: function(listener)
    {
        eventEmitter.on("statistics.stop", listener);
    },

    removeRemoteStatsStopListener: function(listener)
    {
        eventEmitter.removeListener("statistics.stop", listener);
    },

    stop: function () {
        stopLocal();
        stopRemote();
        if(eventEmitter)
        {
            eventEmitter.removeAllListeners();
        }
    },


    start: function () {
        RTCService = require("../RTC/RTCService");
        RTCService.addStreamListener(this.onStreamCreated,
            StreamEventTypes.EVENT_TYPE_LOCAL_CREATED);
        var XMPPService = require("../xmpp/XMPPService");
        XMPPService.addListener(XMPPEvents.CONFERENCE_CERATED,
            function (event) {
                startRemoteStats(event.peerconnection);
            });
        XMPPService.addListener(XMPPEvents.CALL_INCOMING, function (event) {
            startRemoteStats(event.peerconnection);
        });
        XMPPService.addListener(XMPPEvents.DISPOSE_CONFERENCE,
            function (onUnload) {
                stopRemote();
                if(onUnload) {
                    stopLocal();
                }
            });
    },

    onStreamCreated: function(stream)
    {
        if(!stream.isAudioStream())
            return;

        localStats = new LocalStats(stream.getOriginalStream(), 100,
            eventEmitter, RTCService);
        localStats.start();
    }
};




module.exports = StatisticsService;