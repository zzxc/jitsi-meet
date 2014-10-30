/* jshint -W117 */
/* application specific logic */
var connection = null;
var focus = null;
var activecall = null;
var recordingToken ='';
var ssrc2jid = {};

/**
 * Indicates whether ssrc is camera video or desktop stream.
 * FIXME: remove those maps
 */
var ssrc2videoType = {};
var videoSrcToSsrc = {};

var localVideoSrc = null;

function init() {
    StatisticsActivator.start();
    RTCActivator.start();
    var uiCredentials = UIActivator.getUIService().getCredentials();
    XMPPActivator.start(null, null, uiCredentials);
}


/**
 * Returns the JID of the user to whom given <tt>videoSrc</tt> belongs.
 * @param videoSrc the video "src" identifier.
 * @returns {null | String} the JID of the user to whom given <tt>videoSrc</tt>
 *                   belongs.
 */
function getJidFromVideoSrc(videoSrc)
{
    if (videoSrc === localVideoSrc)
        return connection.emuc.myroomjid;

    var ssrc = videoSrcToSsrc[videoSrc];
    if (!ssrc)
    {
        return null;
    }
    return ssrc2jid[ssrc];
}

$(document).bind('callterminated.jingle', function (event, sid, jid, reason) {
    // Leave the room if my call has been remotely terminated.
    if (connection.emuc.joined && focus == null && reason === 'kick') {
        connection.emuc.doLeave();
        messageHandler.openMessageDialog("Session Terminated",
                            "Ouch! You have been kicked out of the meet!");
    }
});

$(document).bind('setLocalDescription.jingle', function (event, sid) {
    // put our ssrcs into presence so other clients can identify our stream
    var sess = connection.jingle.sessions[sid];
    var newssrcs = [];
    var simulcast = new Simulcast();
    var media = simulcast.parseMedia(sess.peerconnection.localDescription);
    media.forEach(function (media) {

        // TODO(gp) maybe exclude FID streams?
        Object.keys(media.sources).forEach(function(ssrc) {
            newssrcs.push({
                'ssrc': ssrc,
                'type': media.type,
                'direction': media.direction
            });
        });
    });
    console.log('new ssrcs', newssrcs);

    // Have to clear presence map to get rid of removed streams
    connection.emuc.clearPresenceMedia();

    if (newssrcs.length > 0) {
        for (var i = 1; i <= newssrcs.length; i ++) {
            // Change video type to screen
            if (newssrcs[i-1].type === 'video' && isUsingScreenStream) {
                newssrcs[i-1].type = 'screen';
            }
            connection.emuc.addMediaToPresence(i,
                newssrcs[i-1].type, newssrcs[i-1].ssrc, newssrcs[i-1].direction);
        }

        connection.emuc.sendPresence();
    }
});

$(document).bind('presence.muc', function (event, jid, info, pres) {

    // Remove old ssrcs coming from the jid
    Object.keys(ssrc2jid).forEach(function (ssrc) {
        if (ssrc2jid[ssrc] == jid) {
            delete ssrc2jid[ssrc];
            console.log("deleted " + ssrc + " for " + jid);
        }
        if (ssrc2videoType[ssrc] == jid) {
            delete ssrc2videoType[ssrc];
        }
    });

    $(pres).find('>media[xmlns="http://estos.de/ns/mjs"]>source').each(function (idx, ssrc) {
        //console.log(jid, 'assoc ssrc', ssrc.getAttribute('type'), ssrc.getAttribute('ssrc'));
        var ssrcV = ssrc.getAttribute('ssrc');
        ssrc2jid[ssrcV] = jid;
        console.log("added " + ssrcV + " for " + jid);

        var type = ssrc.getAttribute('type');
        ssrc2videoType[ssrcV] = type;

        // might need to update the direction if participant just went from sendrecv to recvonly
        if (type === 'video' || type === 'screen') {
            var el = $('#participant_'  + Strophe.getResourceFromJid(jid) + '>video');
            switch (ssrc.getAttribute('direction')) {
            case 'sendrecv':
                el.show();
                break;
            case 'recvonly':
                el.hide();
                // FIXME: Check if we have to change large video
                break;
            }
        }
    });

    if (info.displayName && info.displayName.length > 0)
        $(document).trigger('displaynamechanged',
                            [jid, info.displayName]);

    if (focus !== null && info.displayName !== null) {
        focus.setEndpointDisplayName(jid, info.displayName);
    }

    //check if the video bridge is available
    if($(pres).find(">bridgeIsDown").length > 0 && !bridgeIsDown) {
        bridgeIsDown = true;
        messageHandler.showError("Error",
            "The video bridge is currently unavailable.");
    }

});

function getConferenceHandler() {
    return focus ? focus : activecall;
}

function toggleVideo() {
    buttonClick("#video", "icon-camera icon-camera-disabled");
    if (!(connection && connection.jingle.localVideo))
        return;

    var sess = getConferenceHandler();
    if (sess) {
        sess.toggleVideoMute(
            function (isMuted) {
                if (isMuted) {
                    $('#video').removeClass("icon-camera");
                    $('#video').addClass("icon-camera icon-camera-disabled");
                } else {
                    $('#video').removeClass("icon-camera icon-camera-disabled");
                    $('#video').addClass("icon-camera");
                }
                connection.emuc.addVideoInfoToPresence(isMuted);
                connection.emuc.sendPresence();
            }
        );
    }
}

/**
 * Mutes / unmutes audio for the local participant.
 */
function toggleAudio() {
    if (!(connection && connection.jingle.localAudio)) {
        preMuted = true;
        // We still click the button.
        buttonClick("#mute", "icon-microphone icon-mic-disabled");
        return;
    }

    var localAudio = connection.jingle.localAudio;
    for (var idx = 0; idx < localAudio.getAudioTracks().length; idx++) {
        var audioEnabled = localAudio.getAudioTracks()[idx].enabled;

        localAudio.getAudioTracks()[idx].enabled = !audioEnabled;
        // isMuted is the opposite of audioEnabled
        connection.emuc.addAudioInfoToPresence(audioEnabled);
        connection.emuc.sendPresence();
    }

    buttonClick("#mute", "icon-microphone icon-mic-disabled");
}

/**
 * Checks whether the audio is muted or not.
 * @returns {boolean} true if audio is muted and false if not.
 */
function isAudioMuted()
{
    var localAudio = connection.jingle.localAudio;
    for (var idx = 0; idx < localAudio.getAudioTracks().length; idx++) {
        if(localAudio.getAudioTracks()[idx].enabled === true)
            return false;
    }
    return true;
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

$(window).bind('beforeunload', function () {
    disposeConference(true);
});

function disposeConference(onUnload) {
    var handler = getConferenceHandler();
    if (handler && handler.peerconnection) {
        // FIXME: probably removing streams is not required and close() should be enough
        if (connection.jingle.localAudio) {
            handler.peerconnection.removeStream(connection.jingle.localAudio);
        }
        if (connection.jingle.localVideo) {
            handler.peerconnection.removeStream(connection.jingle.localVideo);
        }
        handler.peerconnection.close();
    }
    StatisticsActivator.stopRemote();
    if(onUnload) {
        StatisticsActivator.stopLocal();
    }
    focus = null;
    activecall = null;
}

/**
 * Changes the style class of the element given by id.
 */
function buttonClick(id, classname) {
    $(id).toggleClass(classname); // add the class to the clicked element
}


$(document).bind('fatalError.jingle',
    function (event, session, error)
    {
        messageHandler.showError(  "Sorry",
            "Your browser version is too old. Please update and try again...");
    }
);


