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
var currentVideoWidth = null;
var currentVideoHeight = null;
/**
 * Method used to calculate large video size.
 * @type {function ()}
 */
var getVideoSize;
/**
 * Method used to get large video position.
 * @type {function ()}
 */
var getVideoPosition;

/* window.onbeforeunload = closePageWarning; */

var sessionTerminated = false;

function init() {
    StatisticsActivator.start();
    RTCActivator.start();
    var uiCredentials = UIActivator.getUIService().getCredentials();
    XMPPActivator.start(null, null, uiCredentials);
}


$(document).bind('remotestreamadded.jingle', function (event, data, sid) {
    waitForPresence(data, sid);
});

function waitForPresence(data, sid) {
    var sess = connection.jingle.sessions[sid];

    var thessrc;
    // look up an associated JID for a stream id
    if (data.stream.id.indexOf('mixedmslabel') === -1) {
        // look only at a=ssrc: and _not_ at a=ssrc-group: lines
        var ssrclines
            = SDPUtil.find_lines(sess.peerconnection.remoteDescription.sdp, 'a=ssrc:');
        ssrclines = ssrclines.filter(function (line) {
            // NOTE(gp) previously we filtered on the mslabel, but that property
            // is not always present.
            // return line.indexOf('mslabel:' + data.stream.label) !== -1;
            return line.indexOf('msid:' + data.stream.id) !== -1;
        });
        if (ssrclines.length) {
            thessrc = ssrclines[0].substring(7).split(' ')[0];

            // We signal our streams (through Jingle to the focus) before we set
            // our presence (through which peers associate remote streams to
            // jids). So, it might arrive that a remote stream is added but
            // ssrc2jid is not yet updated and thus data.peerjid cannot be
            // successfully set. Here we wait for up to a second for the
            // presence to arrive.

            if (!ssrc2jid[thessrc]) {
                // TODO(gp) limit wait duration to 1 sec.
                setTimeout(function(d, s) {
                    return function() {
                            waitForPresence(d, s);
                    }
                }(data, sid), 250);
                return;
            }

            // ok to overwrite the one from focus? might save work in colibri.js
            console.log('associated jid', ssrc2jid[thessrc], data.peerjid);
            if (ssrc2jid[thessrc]) {
                data.peerjid = ssrc2jid[thessrc];
            }
        }
    }

    var isVideo = data.stream.getVideoTracks().length > 0;

    RTCActivator.getRTCService().createRemoteStream(data, sid, thessrc);

    // an attempt to work around https://github.com/jitsi/jitmeet/issues/32
    if (isVideo &&
        data.peerjid && sess.peerjid === data.peerjid &&
        data.stream.getVideoTracks().length === 0 &&
        connection.jingle.localVideo.getVideoTracks().length > 0) {
        //
        window.setTimeout(function () {
            sendKeyframe(sess.peerconnection);
        }, 3000);
    }
}

// an attempt to work around https://github.com/jitsi/jitmeet/issues/32
function sendKeyframe(pc) {
    console.log('sendkeyframe', pc.iceConnectionState);
    if (pc.iceConnectionState !== 'connected') return; // safe...
    pc.setRemoteDescription(
        pc.remoteDescription,
        function () {
            pc.createAnswer(
                function (modifiedAnswer) {
                    pc.setLocalDescription(
                        modifiedAnswer,
                        function () {
                            // noop
                        },
                        function (error) {
                            console.log('triggerKeyframe setLocalDescription failed', error);
                            messageHandler.showError();
                        }
                    );
                },
                function (error) {
                    console.log('triggerKeyframe createAnswer failed', error);
                    messageHandler.showError();
                }
            );
        },
        function (error) {
            console.log('triggerKeyframe setRemoteDescription failed', error);
            messageHandler.showError();
        }
    );
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

$(document).bind('callincoming.jingle', function (event, sid) {
    var sess = connection.jingle.sessions[sid];

    // TODO: do we check activecall == null?
    activecall = sess;

    StatisticsActivator.startRemoteStats(getConferenceHandler().peerconnection);

    // Bind data channel listener in case we're a regular participant
    if (config.openSctp)
    {
        bindDataChannelListener(sess.peerconnection);
    }

    // TODO: check affiliation and/or role
    console.log('emuc data for', sess.peerjid, connection.emuc.members[sess.peerjid]);
    sess.usedrip = true; // not-so-naive trickle ice
    sess.sendAnswer();
    sess.accept();

});

$(document).bind('conferenceCreated.jingle', function (event, focus)
{
    StatisticsActivator.startRemoteStats(getConferenceHandler().peerconnection);
});

$(document).bind('conferenceCreated.jingle', function (event, focus)
{
    // Bind data channel listener in case we're the focus
    if (config.openSctp)
    {
        bindDataChannelListener(focus.peerconnection);
    }
});

$(document).bind('callterminated.jingle', function (event, sid, jid, reason) {
    // Leave the room if my call has been remotely terminated.
    if (connection.emuc.joined && focus == null && reason === 'kick') {
        sessionTerminated = true;
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
    document.title = brand.appName;

    if(config.enableWelcomePage && window.location.pathname == "/" &&
        (!window.localStorage.welcomePageDisabled || window.localStorage.welcomePageDisabled == "false"))
    {
        $("#videoconference_page").hide();
        $("#domain_name").text(window.location.protocol + "//" + window.location.host + "/");
        $("span[name='appName']").text(brand.appName);
        function enter_room()
        {
            var val = $("#enter_room_field").val();
            if(!val)
                val = $("#enter_room_field").attr("room_name");
            window.location.pathname = "/" + val;
        }
        $("#enter_room_button").click(function()
        {
            enter_room();
        });

        $("#enter_room_field").keydown(function (event) {
            if (event.keyCode === 13) {
                enter_room();
            }
        });

        var updateTimeout;
        var animateTimeout;
        $("#reload_roomname").click(function () {
            clearTimeout(updateTimeout);
            clearTimeout(animateTimeout);
            update_roomname();
        });

        function animate(word) {
            var currentVal = $("#enter_room_field").attr("placeholder");
            $("#enter_room_field").attr("placeholder", currentVal + word.substr(0, 1));
            animateTimeout = setTimeout(function() {
                    animate(word.substring(1, word.length))
                }, 70);
        }


        function update_roomname()
        {
            var word = RoomNameGenerator.generateRoomWithoutSeparator();
            $("#enter_room_field").attr("room_name", word);
            $("#enter_room_field").attr("placeholder", "");
            animate(word);
            updateTimeout = setTimeout(update_roomname, 10000);

        }
        update_roomname();

        $("#disable_welcome").click(function () {
            window.localStorage.welcomePageDisabled = $("#disable_welcome").is(":checked");
        });

        return;
    }

    $("#welcome_page").hide();

    // Set the defaults for prompt dialogs.
    jQuery.prompt.setDefaults({persistent: false});

    // Set default desktop sharing method
    setDesktopSharing(config.desktopSharing);
    // Initialize Chrome extension inline installs
    if (config.chromeExtensionId) {
        initInlineInstalls();
    }

    if (!$('#settings').is(':visible')) {
        console.log('init');
        init();
    } else {
        loginInfo.onsubmit = function (e) {
            if (e.preventDefault) e.preventDefault();
            $('#settings').hide();
            init();
        };
    }
});

$(window).bind('beforeunload', function () {
    if (connection && connection.connected) {
        // ensure signout
        $.ajax({
            type: 'POST',
            url: config.bosh,
            async: false,
            cache: false,
            contentType: 'application/xml',
            data: "<body rid='" + (connection.rid || connection._proto.rid) + "' xmlns='http://jabber.org/protocol/httpbind' sid='" + (connection.sid || connection._proto.sid) + "' type='terminate'><presence xmlns='jabber:client' type='unavailable'/></body>",
            success: function (data) {
                console.log('signed out');
                console.log(data);
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                console.log('signout error', textStatus + ' (' + errorThrown + ')');
            }
        });
    }
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

function dump(elem, filename) {
    elem = elem.parentNode;
    elem.download = filename || 'meetlog.json';
    elem.href = 'data:application/json;charset=utf-8,\n';
    var data = populateData();
    elem.href += encodeURIComponent(JSON.stringify(data, null, '  '));
    return false;
}


/**
 * Populates the log data
 */
function populateData() {
    var data = {};
    if (connection.jingle) {
        Object.keys(connection.jingle.sessions).forEach(function (sid) {
            var session = connection.jingle.sessions[sid];
            if (session.peerconnection && session.peerconnection.updateLog) {
                // FIXME: should probably be a .dump call
                data["jingle_" + session.sid] = {
                    updateLog: session.peerconnection.updateLog,
                    stats: session.peerconnection.stats,
                    url: window.location.href
                };
            }
        });
    }
    var metadata = {};
    metadata.time = new Date();
    metadata.url = window.location.href;
    metadata.ua = navigator.userAgent;
    if (connection.logger) {
        metadata.xmpp = connection.logger.log;
    }
    data.metadata = metadata;
    return data;
}

/**
 * Changes the style class of the element given by id.
 */
function buttonClick(id, classname) {
    $(id).toggleClass(classname); // add the class to the clicked element
}



/**
 * Warning to the user that the conference window is about to be closed.
 */
function closePageWarning() {
    if (focus !== null)
        return "You are the owner of this conference call and"
                + " you are about to end it.";
    else
        return "You are about to leave this conversation.";
}

function hangUp() {
    if (connection && connection.connected) {
        // ensure signout
        $.ajax({
            type: 'POST',
            url: config.bosh,
            async: false,
            cache: false,
            contentType: 'application/xml',
            data: "<body rid='" + (connection.rid || connection._proto.rid) + "' xmlns='http://jabber.org/protocol/httpbind' sid='" + (connection.sid || connection._proto.sid) + "' type='terminate'><presence xmlns='jabber:client' type='unavailable'/></body>",
            success: function (data) {
                console.log('signed out');
                console.log(data);
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                console.log('signout error', textStatus + ' (' + errorThrown + ')');
            }
        });
    }
    disposeConference(true);
}

$(document).bind('fatalError.jingle',
    function (event, session, error)
    {
        sessionTerminated = true;
        connection.emuc.doLeave();
        messageHandler.showError(  "Sorry",
            "Your browser version is too old. Please update and try again...");
    }
);

function onSelectedEndpointChanged(userJid)
{
    console.log('selected endpoint changed: ', userJid);
    if (_dataChannels && _dataChannels.length != 0 && _dataChannels[0].readyState == "open") {
        _dataChannels[0].send(JSON.stringify({
            'colibriClass': 'SelectedEndpointChangedEvent',
            'selectedEndpoint': (!userJid || userJid == null)
                ? null : Strophe.getResourceFromJid(userJid)
        }));
    }
}

$(document).bind("selectedendpointchanged", function(event, userJid) {
    onSelectedEndpointChanged(userJid);
});
