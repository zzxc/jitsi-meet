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