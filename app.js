/* jshint -W117 */
/* application specific logic */
var connection = null;
var authenticatedUser = false;
var focus = null;
var activecall = null;
var RTC = null;
var nickname = null;
var sharedKey = '';
var recordingToken ='';
var roomUrl = null;
var roomName = null;
var ssrc2jid = {};

/**
 * Indicates whether ssrc is camera video or desktop stream.
 * FIXME: remove those maps
 */
var ssrc2videoType = {};
var videoSrcToSsrc = {};

var mutedAudios = {};

var localVideoSrc = null;
var flipXLocalVideo = true;
var isFullScreen = false;
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
    RTCActivator.start();

    var jid = document.getElementById('jid').value || config.hosts.anonymousdomain || config.hosts.domain || window.location.hostname;
    connect(jid);
}

function connect(jid, password) {
    connection = new Strophe.Connection(document.getElementById('boshURL').value || config.bosh || '/http-bind');

    if (nickname) {
        connection.emuc.addDisplayNameToPresence(nickname);
    }

    if (connection.disco) {
        // for chrome, add multistream cap
    }
    connection.jingle.pc_constraints = RTCActivator.getRTCService().getPCConstraints();
    if (config.useIPv6) {
        // https://code.google.com/p/webrtc/issues/detail?id=2828
        if (!connection.jingle.pc_constraints.optional) connection.jingle.pc_constraints.optional = [];
        connection.jingle.pc_constraints.optional.push({googIPv6: true});
    }

    if(!password)
        password = document.getElementById('password').value;

    var anonymousConnectionFailed = false;
    connection.connect(jid, password, function (status, msg) {
        if (status === Strophe.Status.CONNECTED) {
            console.log('connected');
            if (config.useStunTurn) {
                connection.jingle.getStunAndTurnCredentials();
            }
            document.getElementById('connect').disabled = true;

            if(password)
                authenticatedUser = true;
            maybeDoJoin();
        } else if (status === Strophe.Status.CONNFAIL) {
            if(msg === 'x-strophe-bad-non-anon-jid') {
                anonymousConnectionFailed = true;
            }
            console.log('status', status);
        } else if (status === Strophe.Status.DISCONNECTED) {
            if(anonymousConnectionFailed) {
                // prompt user for username and password
                $(document).trigger('passwordrequired.main');
            }
        } else if (status === Strophe.Status.AUTHFAIL) {
            // wrong password or username, prompt user
            $(document).trigger('passwordrequired.main');

        } else {
            console.log('status', status);
        }
    });
}


function maybeDoJoin() {
    if (connection && connection.connected && Strophe.getResourceFromJid(connection.jid) // .connected is true while connecting?
        && (connection.jingle.localAudio || connection.jingle.localVideo)) {
        doJoin();
    }
}


function doJoin() {
    var roomnode = null;
    var path = window.location.pathname;
    var roomjid;

    // determinde the room node from the url
    // TODO: just the roomnode or the whole bare jid?
    if (config.getroomnode && typeof config.getroomnode === 'function') {
        // custom function might be responsible for doing the pushstate
        roomnode = config.getroomnode(path);
    } else {
        /* fall back to default strategy
         * this is making assumptions about how the URL->room mapping happens.
         * It currently assumes deployment at root, with a rewrite like the
         * following one (for nginx):
        location ~ ^/([a-zA-Z0-9]+)$ {
            rewrite ^/(.*)$ / break;
        }
         */
        if (path.length > 1) {
            roomnode = path.substr(1).toLowerCase();
        } else {
            var word = RoomNameGenerator.generateRoomWithoutSeparator(3);
            roomnode = word.toLowerCase();

            window.history.pushState('VideoChat',
                    'Room: ' + word, window.location.pathname + word);
        }
    }

    roomName = roomnode + '@' + config.hosts.muc;

    roomjid = roomName;

    if (config.useNicks) {
        var nick = window.prompt('Your nickname (optional)');
        if (nick) {
            roomjid += '/' + nick;
        } else {
            roomjid += '/' + Strophe.getNodeFromJid(connection.jid);
        }
    } else {

        var tmpJid = Strophe.getNodeFromJid(connection.jid);

        if(!authenticatedUser)
            tmpJid = tmpJid.substr(0, 8);

        roomjid += '/' + tmpJid;
    }
    connection.emuc.doJoin(roomjid);
}

$(document).bind('remotestreamadded.jingle', function (event, data, sid) {
    var sess = connection.jingle.sessions[sid];

    var thessrc;
    // look up an associated JID for a stream id
    if (data.stream.id.indexOf('mixedmslabel') === -1) {
        var ssrclines
            = SDPUtil.find_lines(sess.peerconnection.remoteDescription.sdp, 'a=ssrc');
        ssrclines = ssrclines.filter(function (line) {
            return line.indexOf('mslabel:' + data.stream.label) !== -1;
        });
        if (ssrclines.length) {
            thessrc = ssrclines[0].substring(7).split(' ')[0];
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
});

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
                        }
                    );
                },
                function (error) {
                    console.log('triggerKeyframe createAnswer failed', error);
                }
            );
        },
        function (error) {
            console.log('triggerKeyframe setRemoteDescription failed', error);
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
        openMessageDialog(  "Session Terminated",
                            "Ouch! You have been kicked out of the meet!");
    }
});

$(document).bind('setLocalDescription.jingle', function (event, sid) {
    // put our ssrcs into presence so other clients can identify our stream
    var sess = connection.jingle.sessions[sid];
    var newssrcs = {};
    var directions = {};
    var localSDP = new SDP(sess.peerconnection.localDescription.sdp);
    localSDP.media.forEach(function (media) {
        var type = SDPUtil.parse_mid(SDPUtil.find_line(media, 'a=mid:'));

        if (SDPUtil.find_line(media, 'a=ssrc:')) {
            // assumes a single local ssrc
            var ssrc = SDPUtil.find_line(media, 'a=ssrc:').substring(7).split(' ')[0];
            newssrcs[type] = ssrc;

            directions[type] = (
                SDPUtil.find_line(media, 'a=sendrecv') ||
                SDPUtil.find_line(media, 'a=recvonly') ||
                SDPUtil.find_line(media, 'a=sendonly') ||
                SDPUtil.find_line(media, 'a=inactive') ||
                'a=sendrecv').substr(2);
        }
    });
    console.log('new ssrcs', newssrcs);

    // Have to clear presence map to get rid of removed streams
    connection.emuc.clearPresenceMedia();
    var i = 0;
    Object.keys(newssrcs).forEach(function (mtype) {
        i++;
        var type = mtype;
        // Change video type to screen
        if (mtype === 'video' && isUsingScreenStream) {
            type = 'screen';
        }
        connection.emuc.addMediaToPresence(i, type, newssrcs[mtype], directions[mtype]);
    });
    if (i > 0) {
        connection.emuc.sendPresence();
    }
});

$(document).bind('presence.muc', function (event, jid, info, pres) {

    // Remove old ssrcs coming from the jid
    Object.keys(ssrc2jid).forEach(function (ssrc) {
        if (ssrc2jid[ssrc] == jid) {
            delete ssrc2jid[ssrc];
        }
        if (ssrc2videoType[ssrc] == jid) {
            delete ssrc2videoType[ssrc];
        }
    });

    $(pres).find('>media[xmlns="http://estos.de/ns/mjs"]>source').each(function (idx, ssrc) {
        //console.log(jid, 'assoc ssrc', ssrc.getAttribute('type'), ssrc.getAttribute('ssrc'));
        var ssrcV = ssrc.getAttribute('ssrc');
        ssrc2jid[ssrcV] = jid;

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
});

$(document).bind('passwordrequired.muc', function (event, jid) {
    console.log('on password required', jid);

    $.prompt('<h2>Password required</h2>' +
        '<input id="lockKey" type="text" placeholder="shared key" autofocus>', {
        persistent: true,
        buttons: { "Ok": true, "Cancel": false},
        defaultButton: 1,
        loaded: function (event) {
            document.getElementById('lockKey').focus();
        },
        submit: function (e, v, m, f) {
            if (v) {
                var lockKey = document.getElementById('lockKey');

                if (lockKey.value !== null) {
                    setSharedKey(lockKey.value);
                    connection.emuc.doJoin(jid, lockKey.value);
                }
            }
        }
    });
});

$(document).bind('passwordrequired.main', function (event) {
    console.log('password is required');

    $.prompt('<h2>Password required</h2>' +
        '<input id="passwordrequired.username" type="text" placeholder="user@domain.net" autofocus>' +
        '<input id="passwordrequired.password" type="password" placeholder="user password">', {
        persistent: true,
        buttons: { "Ok": true, "Cancel": false},
        defaultButton: 1,
        loaded: function (event) {
            document.getElementById('passwordrequired.username').focus();
        },
        submit: function (e, v, m, f) {
            if (v) {
                var username = document.getElementById('passwordrequired.username');
                var password = document.getElementById('passwordrequired.password');

                if (username.value !== null && password.value != null) {
                    connect(username.value, password.value);
                }
            }
        }
    });
});

function getConferenceHandler() {
    return focus ? focus : activecall;
}

function toggleVideo() {
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
            }
        );
    }

    sess = focus || activecall;
    if (!sess) {
        return;
    }

    sess.pendingop = ismuted ? 'unmute' : 'mute';
//    connection.emuc.addVideoInfoToPresence(!ismuted);
//    connection.emuc.sendPresence();

    sess.modifySources();
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

// Starts or stops the recording for the conference.
function toggleRecording() {
    if (focus === null || focus.confid === null) {
        console.log('non-focus, or conference not yet organized: not enabling recording');
        return;
    }

    if (!recordingToken)
    {
        $.prompt('<h2>Enter recording token</h2>' +
                '<input id="recordingToken" type="text" placeholder="token" autofocus>',
            {
                persistent: false,
                buttons: { "Save": true, "Cancel": false},
                defaultButton: 1,
                loaded: function (event) {
                    document.getElementById('recordingToken').focus();
                },
                submit: function (e, v, m, f) {
                    if (v) {
                        var token = document.getElementById('recordingToken');

                        if (token.value) {
                            setRecordingToken(Util.escapeHtml(token.value));
                            toggleRecording();
                        }
                    }
                }
            }
        );

        return;
    }

    var oldState = focus.recordingEnabled;
    Toolbar.toggleRecordingButtonState();
    focus.setRecording(!oldState,
                        recordingToken,
                        function (state) {
                            console.log("New recording state: ", state);
                            if (state == oldState) //failed to change, reset the token because it might have been wrong
                            {
                                Toolbar.toggleRecordingButtonState();
                                setRecordingToken(null);
                            }
                        }
    );


}

$(document).ready(function () {
    UIActivator.start();

    if(config.enableWelcomePage && window.location.pathname == "/" &&
        (!window.localStorage.welcomePageDisabled || window.localStorage.welcomePageDisabled == "false"))
    {
        $("#videoconference_page").hide();
        $("#domain_name").text(window.location.protocol + "//" + window.location.host + "/");
        $("span[name='appName']").text(brand.appName);
        $("#enter_room_button").click(function()
        {
            var val = $("#enter_room_field").val();
            if(!val)
                val = $("#enter_room_field").attr("room_name");
            window.location.pathname = "/" + val;
        });

        $("#enter_room_field").keydown(function (event) {
            if (event.keyCode === 13) {
                var val = Util.escapeHtml(this.value);
                window.location.pathname = "/" + val;
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
    Chat.init();

    $('body').popover({ selector: '[data-toggle=popover]',
                        trigger: 'click hover'});

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
    metadata = {};
    metadata.time = new Date();
    metadata.url = window.location.href;
    metadata.ua = navigator.userAgent;
    if (connection.logger) {
        metadata.xmpp = connection.logger.log;
    }
    data.metadata = metadata;
    elem.href += encodeURIComponent(JSON.stringify(data, null, '  '));
    return false;
}

/**
 * Changes the style class of the element given by id.
 */
function buttonClick(id, classname) {
    $(id).toggleClass(classname); // add the class to the clicked element
}

/**
 * Shows a message to the user.
 *
 * @param titleString the title of the message
 * @param messageString the text of the message
 */
function openMessageDialog(titleString, messageString) {
    $.prompt(messageString,
        {
            title: titleString,
            persistent: false
        }
    );
}

/**
 * Locks / unlocks the room.
 */
function lockRoom(lock) {
    if (lock)
        connection.emuc.lockRoom(sharedKey);
    else
        connection.emuc.lockRoom('');

    Toolbar.updateLockButton();
}

/**
 * Sets the shared key.
 */
function setSharedKey(sKey) {
    sharedKey = sKey;
}

function setRecordingToken(token) {
    recordingToken = token;
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

/**
 * Sets the current view.
 */
function setView(viewName) {
//    if (viewName == "fullscreen") {
//        document.getElementById('videolayout_fullscreen').disabled  = false;
//        document.getElementById('videolayout_default').disabled  = true;
//    }
//    else {
//        document.getElementById('videolayout_default').disabled  = false;
//        document.getElementById('videolayout_fullscreen').disabled  = true;
//    }
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
        openMessageDialog(  "Sorry",
            "Your browser version is too old. Please update and try again...");
    }
);

function callSipButtonClicked()
{
    $.prompt('<h2>Enter SIP number</h2>' +
        '<input id="sipNumber" type="text" value="" autofocus>',
        {
            persistent: false,
            buttons: { "Dial": true, "Cancel": false},
            defaultButton: 2,
            loaded: function (event)
            {
                document.getElementById('sipNumber').focus();
            },
            submit: function (e, v, m, f)
            {
                if (v)
                {
                    var numberInput = document.getElementById('sipNumber');
                    if (numberInput.value && numberInput.value.length)
                    {
                        connection.rayo.dial(
                            numberInput.value, 'fromnumber', roomName);
                    }
                }
            }
        }
    );
}

function hangup() {
    disposeConference();
    sessionTerminated = true;
    connection.emuc.doLeave();
    var buttons = {};
    if(config.enableWelcomePage)
    {
        setTimeout(function()
        {
            window.localStorage.welcomePageDisabled = false;
            window.location.pathname = "/";
        }, 10000);

    }

    $.prompt("Session Terminated",
        {
            title: "You hung up the call",
            persistent: true,
            buttons: {
                "Join again": true
            },
            closeText: '',
            submit: function(event, value, message, formVals)
            {
                window.location.reload();
                return false;
            }

        }
    );

}
