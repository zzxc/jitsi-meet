/**
 * Created by hristo on 8/4/14.
 */
var LocalStats = require("./LocalStatsCollector.js");
var RTPStats = require("./RTPStatsCollector.js");
var EventEmmiter = require("events");

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

    StatisticsActivator.startLocalStats = function (stream) {
        if(config.enableRtpStats)
        {
            localStats = new LocalStats(stream, 100, eventEmmiter);
            localStats.start();
        }

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