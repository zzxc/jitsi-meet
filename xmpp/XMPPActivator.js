var StreamEventTypes = require("../service/StreamEventTypes");

var XMPPActivator = function()
{


    function NicknameListenrer()
    {
        this.nickname = null
    }

    NicknameListenrer.prototype.onNicknameChanged = function (value) {
        this.nickname = value;
    }

    var nicknameListener = new NicknameListenrer();

    var authenticatedUser = false;

    function XMPPActivatorProto()
    {
    }

    function setupStrophePlugins()
    {
        require("./muc")();
        require("./moderatemuc")();
        require("./strophe.util")();

    }

    function registerListeners() {
        UIActivator.getUIService().addNicknameListener(nicknameListener.onNicknameChanged);
    }

    XMPPActivatorProto.start = function (jid, password, uiCredentials) {
        setupStrophePlugins();
        registerListeners();
        connect(jid, password, uiCredentials);
        RTCActivator.addStreamListener(maybeDoJoin, StreamEventTypes.EVENT_TYPE_LOCAL_CREATED);
    }

    XMPPActivatorProto.getNickname = function () {
        return nicknameListener.nickname;
    }

    function connect(jid, password, uiCredentials) {
        var localAudio, localVideo;
        if (connection && connection.jingle) {
            localAudio = connection.jingle.localAudio;
            localVideo = connection.jingle.localVideo;
        }
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
        if (localAudio) connection.jingle.localAudio = localAudio;
        if (localVideo) connection.jingle.localVideo = localVideo;

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
            && (connection.jingle.localAudio || connection.jingle.localVideo)) {
            var roomjid = UIActivator.getUIService().generateRoomName(authenticatedUser);
            connection.emuc.doJoin(roomjid);
        }
    }

    XMPPActivatorProto.stop = function () {

    }

    return XMPPActivatorProto;
}();

module.exports = XMPPActivator;