/* jshint -W117 */
/* application specific logic */
var UIService = require("./UI/UIService");
function init() {
    var StatisticsService = require("./statistics/StatisticsService");
    StatisticsService.start();
    require("./RTC/RTCService").start();
    var uiCredentials = UIService.getCredentials();
    var XMPPService = require("./xmpp/XMPPService");
    XMPPService.start(null, null, uiCredentials);
    require("./connectionquality")(UIService,
        XMPPService,
        XMPPService,
        StatisticsService);
    require("./desktopsharing").init();
}

$(document).ready(function () {
    var APIConnector = require("./api/APIConnector");
    if(APIConnector.isEnabled())
        APIConnector.init();
    UIService.start(init);
});

$(window).on("beforeunload", function () {
    var APIConnector = require("./api/APIConnector");
    if(APIConnector.isEnabled())
        APIConnector.dispose();
});
