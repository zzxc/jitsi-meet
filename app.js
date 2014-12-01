/* jshint -W117 */
/* application specific logic */
var UIActivator = require("./UI/UIActivator");
var APIConnector = require("./api/APIConnector");
function init() {
    require("./statistics/StatisticsActivator").start();
    require("./RTC/RTCActivator").start();
    var uiCredentials = UIActivator.getUIService().getCredentials();
    require("./xmpp/XMPPActivator").start(null, null, uiCredentials);
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
