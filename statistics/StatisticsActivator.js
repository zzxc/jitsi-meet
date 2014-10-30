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

    StatisticsActivatorProto.stop = function () {
        if(eventEmmiter)
        {
            eventEmmiter.removeAllListeners("statistics.audioLevel");
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
        XMPPActivator.addListener(XMPPEvents.CONFERENCE_CERATED, function (event) {
            startRemoteStats(event.peerconnection);
        });
        XMPPActivator.addListener(XMPPEvents.CALL_INCOMING, function (event) {
            startRemoteStats(event.peerconnection);
        });
    }

    StatisticsActivatorProto.onStreamCreated = function(stream)
    {
        if(!stream.isAudioStream())
            return;

        localStats = new LocalStats(stream.getOriginalStream(), 100, eventEmmiter);
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