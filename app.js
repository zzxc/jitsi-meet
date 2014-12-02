/* jshint -W117 */
/* application specific logic */
var UIActivator = require("./UI/UIActivator");
var APIConnector = require("./api/APIConnector");
function init() {
    var StatisticsService = require("./statistics/StatisticsService");
    StatisticsService.start();
    require("./RTC/RTCActivator").start();
    var uiCredentials = UIActivator.getUIService().getCredentials();
    var XMPPActivator = require("./xmpp/XMPPActivator");
    XMPPActivator.start(null, null, uiCredentials);
    require("./connectionquality")(UIActivator,
        XMPPActivator,
        XMPPActivator,
        StatisticsService);
    require("./desktopsharing").init();
}


$(document).ready(function () {
    if(APIConnector.isEnabled())
        APIConnector.init(UIActivator);
    UIActivator.start(init);
});

$(window).on("beforeunload", function () {
    if(APIConnector.isEnabled())
        APIConnector.dispose();
});
