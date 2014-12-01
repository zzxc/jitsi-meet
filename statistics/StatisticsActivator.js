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

    var RTCActivator = null;

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

    StatisticsActivatorProto.addConnectionStatsListener = function(listener)
    {
        eventEmmiter.on("statistics.connectionstats", listener);
    }

    StatisticsActivatorProto.removeConnectionStatsListener = function(listener)
    {
        eventEmmiter.removeListener("statistics.connectionstats", listener);
    }


    StatisticsActivatorProto.addRemoteStatsStopListener = function(listener)
    {
        eventEmmiter.on("statistics.stop", listener);
    }

    StatisticsActivatorProto.removeRemoteStatsStopListener = function(listener)
    {
        eventEmmiter.removeListener("statistics.stop", listener);
    }

    StatisticsActivatorProto.stop = function () {
        stopLocal();
        stopRemote();
        if(eventEmmiter)
        {
            eventEmmiter.removeAllListeners();
        }
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
            eventEmmiter.emit("statistics.stop");
            rtpStats = null;
        }
    }

    StatisticsActivatorProto.start = function () {
        RTCActivator = require("../RTC/RTCActivator");
        RTCActivator.addStreamListener(StatisticsActivator.onStreamCreated,
            StreamEventTypes.EVENT_TYPE_LOCAL_CREATED);
        var XMPPActivator = require("../xmpp/XMPPActivator");
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

        localStats = new LocalStats(stream.getOriginalStream(), 100, eventEmmiter, RTCActivator);
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