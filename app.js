/* jshint -W117 */
/* application specific logic */
var connection = null;

function init() {
    StatisticsActivator.start();
    RTCActivator.start();
    var uiCredentials = UIActivator.getUIService().getCredentials();
    XMPPActivator.start(null, null, uiCredentials);
}


$(document).ready(function () {
    UIActivator.start();

    // Set default desktop sharing method
    setDesktopSharing(config.desktopSharing);
    // Initialize Chrome extension inline installs
    if (config.chromeExtensionId) {
        initInlineInstalls();
    }
});

