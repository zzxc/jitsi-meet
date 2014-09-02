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
            rtcService.init();

        }

};
})();

module.exports = RTCActivator;
