/**
 * Created by hristo on 8/4/14.
 */
var AudioLevels = require("./audiolevels/AudioLevels.js");
var Etherpad = require("./etherpad/Etherpad.js");
var VideoLayout = requre("./VideoLayout.js");

function UIService()
{

}

UIService.prototype.updateAudioLevelCanvas = function(peerJid)
{
    AudioLevels.updateAudioLevelCanvas(peerJid);
}

UIService.prototype.initEtherpad = function()
{
    Etherpad.init();
}


UIService.prototype.checkChangeLargeVideo = function(removedVideoSrc)
{
    VideoLayout.checkChangeLargeVideo(removedVideoSrc);
}

module.exports = UIService;