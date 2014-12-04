var StreamEventTypes = require("../service/RTC/StreamEventTypes");
var EventEmitter = require("events");
var XMPPEvents = require("../service/xmpp/XMPPEvents");


var XMPPActivator = function()
{
    var activecall = null;

    var UIActivator = null;
    var RTCActivator = null;

    function NicknameListenrer()
    {
        this.nickname = null;
    }

    NicknameListenrer.prototype.onNicknameChanged = function (value) {
        this.nickname = value;
    };

    var nicknameListener = new NicknameListenrer();

    var authenticatedUser = false;

    var eventEmitter = new EventEmitter();

    var connection = null;

    function XMPPActivatorProto()
    {
    }

    function setupStrophePlugins()
    {
        require("./strophe.emuc")(eventEmitter, XMPPActivator);
        require("./strophe.jingle")(eventEmitter, RTCActivator, XMPPActivator);
        require("./moderatemuc")(eventEmitter);
        require("./strophe.util")(eventEmitter);
        require("./rayo")();
    }

    function registerListeners() {
        UIActivator.getUIService().addNicknameListener(nicknameListener.onNicknameChanged);
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
            XMPPActivatorProto.disposeConference(true);
        });
    }

    XMPPActivatorProto.start = function (jid, password, uiCredentials) {
        UIActivator = require("../UI/UIActivator");
        RTCActivator = require("../RTC/RTCActivator");
        setupStrophePlugins();
        registerListeners();
        setupEvents();
        connect(jid, password, uiCredentials);
        RTCActivator.addStreamListener(maybeDoJoin, StreamEventTypes.EVENT_TYPE_LOCAL_CREATED);
    };

    XMPPActivatorProto.getNickname = function () {
        return nicknameListener.nickname;
    };

    XMPPActivatorProto.addToPresence = function (name, value) {
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

    XMPPActivatorProto.setMute = function(jid, isMute)
    {
        connection.moderate.setMute(jid, isMute);
    }

    XMPPActivatorProto.eject = function(jid)
    {
        connection.moderate.eject(jid);
    }
    
    XMPPActivatorProto.getPrezi = function () {
        return connection.emuc.getPrezi(XMPPActivator.getMyJID());
    }

    XMPPActivatorProto.removeFromPresence = function(name)
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

    XMPPActivatorProto.lockRoom = function (sharedKey) {
        connection.emuc.lockRoom(sharedKey);
    }

    XMPPActivatorProto.getOwnJIDNode = function () {
        return Strophe.getNodeFromJid(connection.jid);
    }

    XMPPActivatorProto.sendMessage = function (message, nickname) {
        connection.emuc.sendMessage(message, nickname);
    }

    XMPPActivatorProto.setSubject = function (subject) {
        connection.emuc.setSubject(subject);
    }

    function getConferenceHandler() {
        return connection.emuc.focus ? connection.emuc.focus : activecall;
    }

    XMPPActivatorProto.toggleAudioMute = function (callback) {
        getConferenceHandler().toggleAudioMute(callback);
    };


    XMPPActivatorProto.toggleVideoMute = function (callback) {
        getConferenceHandler().toggleVideoMute(callback);
    };

    function connect(jid, password, uiCredentials) {
        connection = new Strophe.Connection(uiCredentials.bosh);

        if (nicknameListener.nickname) {
            connection.emuc.addDisplayNameToPresence(nicknameListener.nickname);
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
                UIActivator.getUIService().disableConnect();

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
                    XMPPActivatorProto.promptLogin();
                }
            } else if (status === Strophe.Status.AUTHFAIL) {
                // wrong password or username, prompt user
                XMPPActivatorProto.promptLogin();

            } else {
                console.log('status', status);
            }
        });
    }

    XMPPActivatorProto.promptLogin = function () {
        UIActivator.showLoginPopup(connect);
    }

    function maybeDoJoin() {
        if (connection && connection.connected && Strophe.getResourceFromJid(connection.jid) // .connected is true while connecting?
            && (RTCActivator.getRTCService().localAudio || RTCActivator.getRTCService().localVideo)) {
            var roomjid = UIActivator.getUIService().generateRoomName(authenticatedUser);
            connection.emuc.doJoin(roomjid);
        }
    }

    XMPPActivatorProto.stop = function () {

    };

    XMPPActivatorProto.setActiveCall = function (session) {
        activecall = session;
    };

    XMPPActivatorProto.getJIDFromSSRC = function (ssrc) {
        return connection.emuc.ssrc2jid[ssrc];
    };

    XMPPActivatorProto.isFocus = function () {
        return (connection && connection.emuc.focus !== null);
    }

    XMPPActivatorProto.setRecording = function (token, callback, tokenNullCallback) {
        return connection.emuc.focus.setRecording(token, callback, tokenNullCallback);
    }

    XMPPActivatorProto.switchStreams = function(stream, oldStream, streamSwitchDone)
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

    XMPPActivatorProto.disposeConference = function (onUnload, callback, leaveMUC) {
        if(leaveMUC)
            connection.emuc.doLeave();
        var handler = getConferenceHandler();
        if (handler && handler.peerconnection) {
            // FIXME: probably removing streams is not required and close() should be enough
            if (RTCActivator.getRTCService().localAudio) {
                handler.peerconnection.removeStream(RTCActivator.getRTCService().localAudio);
            }
            if (RTCActivator.getRTCService().localVideo) {
                handler.peerconnection.removeStream(RTCActivator.getRTCService().localVideo);
            }
            handler.peerconnection.close();
        }

        eventEmitter.emit(XMPPEvents.DISPOSE_CONFERENCE, onUnload);

        connection.emuc.focus = null;
        activecall = null;
        if(callback)
            callback();
    }

    XMPPActivatorProto.getJingleData = function () {
        if (connection.jingle) {
            return connection.jingle.getJingleData();
        }
        return {};
    }

    XMPPActivatorProto.getLogger = function () {
        return connection.logger;
    }
    
    XMPPActivatorProto.addListener = function (event, listener) {
        eventEmitter.on(event, listener);
    }

    XMPPActivatorProto.getMyJID = function () {
        return connection.emuc.myroomjid;
    }

    XMPPActivatorProto.getVideoTypeFromSSRC = function (ssrc) {
        return connection.emuc.ssrc2videoType[ssrc];
    }

    XMPPActivatorProto.sipDial = function (to, from, roomName)
    {
        return connection.rayo.dial(to, from, roomName);
    }

    XMPPActivatorProto.getFocusJID = function () {
        if(Object.keys(connection.jingle.sessions).length === 0)
            return null;
        var session
            = connection.jingle.sessions
            [Object.keys(connection.jingle.sessions)[0]];
        return Strophe.getResourceFromJid(session.peerjid);
    }

    XMPPActivatorProto.addConnectionQualityListener = function (listener) {
        eventEmitter.on(XMPPEvents.REMOTE_STATS, listener);
    }

    XMPPActivatorProto.findJidFromResource = function (resource) {
        return connection.emuc.findJidFromResource(resource);
    }

    return XMPPActivatorProto;
}();

module.exports = XMPPActivator;