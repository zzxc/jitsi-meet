/* jshint -W117 */
/* application specific logic */
var UIActivator = require("./UI/UIActivator");
function init() {
    require("./statistics/StatisticsActivator").start();
    require("./RTC/RTCActivator").start();
    var uiCredentials = UIActivator.getUIService().getCredentials();
    require("./xmpp/XMPPActivator").start(null, null, uiCredentials);
    require("./desktopsharing").init();
}


$(document).ready(function () {
    UIActivator.start(init);
});

