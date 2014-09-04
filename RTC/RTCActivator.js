/**
 * Created by hristo on 8/20/14.
 */

var RTCService = require("./RTCService.js");

var RTCActivator = (function()
{
    var rtcService = null;

    return {


        stop:  function () {
            rtcService.dispose();
            rtcService = null;

        },



        start: function () {
            rtcService = new RTCService();
        },

        getRTCService: function () {
            return rtcService;
        },

        addStreamListener: function(listener, eventType)
        {
            return RTCService.addStreamListener(listener, eventType);
        },

        removeStreamListener: function(listener, eventType)
        {
            return RTCService.removeStreamListener(listener, eventType);
        },

        createStream: function(stream)
        {
            RTCService.createStream(stream);
        }
};
})();

module.exports = RTCActivator;
