var RTCService = require("./RTCService.js");
var XMPPEvents = require("../service/xmpp/XMPPEvents");
var DataChannels = require("./data_channels");

var RTCActivator = (function()
{
    var rtcService = null;

    function RTCActivatorProto()
    {
        
    }

    RTCActivatorProto.stop=  function () {
        rtcService.dispose();
        rtcService = null;

    }

    function onConferenceCreated(event) {
        DataChannels.bindDataChannelListener(event.peerconnection);
    }

    RTCActivatorProto.start= function () {
        rtcService = new RTCService();
        XMPPActivator.addListener(XMPPEvents.CONFERENCE_CERATED, onConferenceCreated);
        XMPPActivator.addListener(XMPPEvents.CALL_INCOMING, onConferenceCreated);
    }

    RTCActivatorProto.getRTCService= function () {
        return rtcService;
    }

    RTCActivatorProto.addStreamListener= function(listener, eventType)
    {
        return RTCService.addStreamListener(listener, eventType);
    }

    RTCActivatorProto.removeStreamListener= function(listener, eventType)
    {
        return RTCService.removeStreamListener(listener, eventType);
    }
    
    return RTCActivatorProto;
})();

module.exports = RTCActivator;
