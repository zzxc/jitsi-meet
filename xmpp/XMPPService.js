var StreamEventTypes = require("../service/RTC/StreamEventTypes");
var EventEmitter = require("events");
var XMPPEvents = require("../service/xmpp/XMPPEvents");


var activecall = null;

var UIService = null;
var RTCService = null;

var authenticatedUser = false;

var eventEmitter = new EventEmitter();

var connection = null;


function NicknameListenrer()
{
    this.nickname = null;
}

NicknameListenrer.prototype.onNicknameChanged = function (value) {
    this.nickname = value;
};

var nicknameListener = new NicknameListenrer();

function XMPPService()
{
}

function setupStrophePlugins()
{
    require("./strophe.emuc")(eventEmitter, XMPPService);
    require("./strophe.jingle")(eventEmitter, RTCService, XMPPService);
    require("./moderatemuc")(eventEmitter);
    require("./strophe.util")(eventEmitter);
    require("./rayo")();
}

function registerListeners() {
    UIService.addNicknameListener(
        nicknameListener.onNicknameChanged);
}

function setupEvents() {
    $(window).bind('beforeunload', function () {
        if (connection && connection.connected) {
            // ensure signout
            $.ajax({
                type: 'POST',
                url: config.bosh,
                async: false,
                cache: false,
                contentType: 'application/xml',
                data: "<body rid='" +
                    (connection.rid || connection._proto.rid) +
                    "' xmlns='http://jabber.org/protocol/httpbind' sid='" +
                    (connection.sid || connection._proto.sid) +
                    "' type='terminate'><presence xmlns='jabber:client'" +
                    " type='unavailable'/></body>",
                success: function (data) {
                    console.log('signed out');
                    console.log(data);
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    console.log('signout error', textStatus +
                        ' (' + errorThrown + ')');
                }
            });
        }
        XMPPService.disposeConference(true);
    });
}

function getConferenceHandler() {
    return connection.emuc.focus ? connection.emuc.focus : activecall;
}

function connect(jid, password, uiCredentials) {
    connection = new Strophe.Connection(uiCredentials.bosh);

    if (nicknameListener.nickname) {
        connection.emuc.addDisplayNameToPresence(nicknameListener.nickname);
    }

    if (connection.disco) {
        // for chrome, add multistream cap
    }
    connection.jingle.pc_constraints = RTCService.getPCConstraints();
    if (config.useIPv6) {
        // https://code.google.com/p/webrtc/issues/detail?id=2828
        if (!connection.jingle.pc_constraints.optional)
            connection.jingle.pc_constraints.optional = [];
        connection.jingle.pc_constraints.optional.push({googIPv6: true});
    }

    if(!password)
        password = uiCredentials.password;

    if(!jid)
        jid = uiCredentials.jid;

    var anonymousConnectionFailed = false;

    connection.connect(jid, password, function (status, msg) {
        if (status === Strophe.Status.CONNECTED) {
            console.log('connected');
            if (config.useStunTurn) {
                connection.jingle.getStunAndTurnCredentials();
            }
            UIService.disableConnect();

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
                XMPPService.promptLogin();
            }
        } else if (status === Strophe.Status.AUTHFAIL) {
            // wrong password or username, prompt user
            XMPPService.promptLogin();

        } else {
            console.log('status', status);
        }
    });
}

function maybeDoJoin() {
    if (connection && connection.connected && Strophe.getResourceFromJid(connection.jid)
        && (RTCService.localAudio || RTCService.localVideo)) {
        var roomjid = UIService.generateRoomName(authenticatedUser);
        connection.emuc.doJoin(roomjid);
    }
}

XMPPService.start = function (jid, password, uiCredentials) {
    UIService = require("../UI/UIService");
    RTCService = require("../RTC/RTCService");
    setupStrophePlugins();
    registerListeners();
    setupEvents();
    connect(jid, password, uiCredentials);
    RTCService.addStreamListener(maybeDoJoin, StreamEventTypes.EVENT_TYPE_LOCAL_CREATED);
};

XMPPService.getNickname = function () {
    return nicknameListener.nickname;
};

XMPPService.addToPresence = function (name, value) {
    switch (name)
    {
        case "displayName":
            connection.emuc.addDisplayNameToPresence(value);
            break;
        case "etherpad":
            connection.emuc.addEtherpadToPresence(value);
            break;
        case "prezi":
            connection.emuc.addPreziToPresence(value, 0);
            break;
        case "preziSlide":
            connection.emuc.addCurrentSlideToPresence(value);
            break;
        case "connectionQuality":
            connection.emuc.addConnectionInfoToPresence(value);
            break;
        default :
            console.log("Unknown tag for presence.");
            return;
    }
    connection.emuc.sendPresence();
}

XMPPService.setMute = function(jid, isMute)
{
    connection.moderate.setMute(jid, isMute);
}

XMPPService.eject = function(jid)
{
    connection.moderate.eject(jid);
}

XMPPService.getPrezi = function () {
    return connection.emuc.getPrezi(XMPPService.getMyJID());
}

XMPPService.removeFromPresence = function(name)
{
    switch (name)
    {
        case "prezi":
            connection.emuc.removePreziFromPresence();
            break;
        default:
            return;
    }
    connection.emuc.sendPresence();
}

XMPPService.lockRoom = function (sharedKey) {
    connection.emuc.lockRoom(sharedKey);
}

XMPPService.getOwnJIDNode = function () {
    return Strophe.getNodeFromJid(connection.jid);
}

XMPPService.sendMessage = function (message, nickname) {
    connection.emuc.sendMessage(message, nickname);
}

XMPPService.setSubject = function (subject) {
    connection.emuc.setSubject(subject);
}

XMPPService.toggleAudioMute = function (callback) {
    getConferenceHandler().toggleAudioMute(callback);
};


XMPPService.toggleVideoMute = function (callback) {
    getConferenceHandler().toggleVideoMute(callback);
};


XMPPService.promptLogin = function () {
    UIService.showLoginPopup(connect);
}

XMPPService.setActiveCall = function (session) {
    activecall = session;
};

XMPPService.getJIDFromSSRC = function (ssrc) {
    return connection.emuc.ssrc2jid[ssrc];
};

XMPPService.isFocus = function () {
    return (connection && connection.emuc.focus !== null);
}

XMPPService.setRecording = function (token, callback, tokenNullCallback) {
    return connection.emuc.focus.setRecording(token, callback, tokenNullCallback);
}

XMPPService.switchStreams = function(stream, oldStream, streamSwitchDone)
{
    var conferenceHandler = getConferenceHandler();
    if (conferenceHandler) {
        // FIXME: will block switchInProgress on true value in case of exception
        conferenceHandler.switchStreams(stream, oldStream, streamSwitchDone);
    } else {
        // We are done immediately
        console.error("No conference handler");
        messageHandler.showError('Error',
            'Unable to switch video stream.');
        streamSwitchDone();
    }
};

XMPPService.disposeConference = function (onUnload, callback, leaveMUC) {
    if(leaveMUC)
        connection.emuc.doLeave();
    var handler = getConferenceHandler();
    if (handler && handler.peerconnection) {
        // FIXME: probably removing streams is not required and close() should be enough
        if (RTCService.localAudio) {
            handler.peerconnection.removeStream(RTCService.localAudio);
        }
        if (RTCService.localVideo) {
            handler.peerconnection.removeStream(RTCService.localVideo);
        }
        handler.peerconnection.close();
    }

    eventEmitter.emit(XMPPEvents.DISPOSE_CONFERENCE, onUnload);

    connection.emuc.focus = null;
    activecall = null;
    if(callback)
        callback();
}

XMPPService.getJingleData = function () {
    if (connection.jingle) {
        return connection.jingle.getJingleData();
    }
    return {};
}

XMPPService.getLogger = function () {
    return connection.logger;
}

XMPPService.addListener = function (event, listener) {
    eventEmitter.on(event, listener);
}

XMPPService.getMyJID = function () {
    return connection.emuc.myroomjid;
}

XMPPService.getVideoTypeFromSSRC = function (ssrc) {
    return connection.emuc.ssrc2videoType[ssrc];
}

XMPPService.sipDial = function (to, from, roomName)
{
    return connection.rayo.dial(to, from, roomName);
}

XMPPService.getFocusJID = function () {
    if(Object.keys(connection.jingle.sessions).length === 0)
        return null;
    var session
        = connection.jingle.sessions
        [Object.keys(connection.jingle.sessions)[0]];
    return Strophe.getResourceFromJid(session.peerjid);
}

XMPPService.addConnectionQualityListener = function (listener) {
    eventEmitter.on(XMPPEvents.REMOTE_STATS, listener);
}

XMPPService.findJidFromResource = function (resource) {
    return connection.emuc.findJidFromResource(resource);
}


module.exports = XMPPService;