!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.XMPPActivator=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var StreamEventTypes = {
    EVENT_TYPE_LOCAL_CREATED: "stream.local_created",

    EVENT_TYPE_LOCAL_ENDED: "stream.local_ended",

    EVENT_TYPE_REMOTE_CREATED: "stream.remote_created",

    EVENT_TYPE_REMOTE_ENDED: "stream.remote_ended"
};

module.exports = StreamEventTypes;
},{}],2:[function(require,module,exports){
/**
 * Created by hristo on 10/29/14.
 */
var XMPPEvents = {
    CONFERENCE_CERATED: "xmpp.conferenceCreated.jingle",
    CALL_TERMINATED: "xmpp.callterminated.jingle",
    CALL_INCOMING: "xmpp.callincoming.jingle",
    DISPOSE_CONFERENCE: "xmpp.dispoce_confernce",
    DISPLAY_NAME_CHANGED: "xmpp.display_name_changed"

};
module.exports = XMPPEvents;
},{}],3:[function(require,module,exports){
(function () {

function trackUsage(eventname, obj) {
    //console.log('track', eventname, obj);
    // implement your own tracking mechanism here
}
if (typeof exports !== 'undefined') {
    module.exports = trackUsage;
} else {
    window.trackUsage = trackUsage;
}

})();

},{}],4:[function(require,module,exports){
var StreamEventTypes = require("../service/RTC/StreamEventTypes");
var EventEmitter = require("events");
var XMPPEvents = require("../service/xmpp/XMPPEvents");

var XMPPActivator = function()
{
    var activecall = null;

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
        require("./muc")(eventEmitter);
        require("./strophe.jingle")(eventEmitter);
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
        return (connection.emuc.focus !== null);
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
        if(Object.keys(connection.jingle.sessions).length == 0)
            return null;
        var session
            = connection.jingle.sessions
            [Object.keys(connection.jingle.sessions)[0]];
        return Strophe.getResourceFromJid(session.peerjid);
    }

    return XMPPActivatorProto;
}();

module.exports = XMPPActivator;
},{"../service/RTC/StreamEventTypes":1,"../service/xmpp/XMPPEvents":2,"./moderatemuc":7,"./muc":8,"./rayo":9,"./strophe.jingle":11,"./strophe.util":16,"events":17}],5:[function(require,module,exports){
/* colibri.js -- a COLIBRI focus
 * The colibri spec has been submitted to the XMPP Standards Foundation
 * for publications as a XMPP extensions:
 * http://xmpp.org/extensions/inbox/colibri.html
 *
 * colibri.js is a participating focus, i.e. the focus participates
 * in the conference. The conference itself can be ad-hoc, through a
 * MUC, through PubSub, etc.
 *
 * colibri.js relies heavily on the strophe.jingle library available
 * from https://github.com/ESTOS/strophe.jingle
 * and interoperates with the Jitsi videobridge available from
 * https://jitsi.org/Projects/JitsiVideobridge
 */
/*
 Copyright (c) 2013 ESTOS GmbH

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */
/* jshint -W117 */
var SessionBase = require("../strophe.jingle.sessionbase");
var ColibriSession = require("./colibri.session");
var TraceablePeerConnection = require("../strophe.jingle.adapter");
var SDP = require("../strophe.jingle.sdp");
var SDPUtil = require("../strophe.jingle.sdp.util");
var XMPPEvents = require("../../service/xmpp/XMPPEvents");
ColibriFocus.prototype = Object.create(SessionBase.prototype);
function ColibriFocus(connection, bridgejid, eventEmitter) {

    SessionBase.call(this, connection, Math.random().toString(36).substr(2, 12));

    this.bridgejid = bridgejid;
    this.peers = [];
    this.remoteStreams = [];
    this.confid = null;
    this.eventEmitter = eventEmitter;

    /**
     * Local XMPP resource used to join the multi user chat.
     * @type {*}
     */
    this.myMucResource = Strophe.getResourceFromJid(this.connection.emuc.myroomjid);

    /**
     * Default channel expire value in seconds.
     * @type {number}
     */
    this.channelExpire
        = ('number' === typeof(config.channelExpire))
            ? config.channelExpire
            : 15;
    /**
     * Default channel last-n value.
     * @type {number}
     */
    this.channelLastN
        = ('number' === typeof(config.channelLastN)) ? config.channelLastN : -1;

    // media types of the conference
    if (config.openSctp)
        this.media = ['audio', 'video', 'data'];
    else
        this.media = ['audio', 'video'];

    this.connection.jingle.sessions[this.sid] = this;
    this.bundledTransports = {};
    this.mychannel = [];
    this.channels = [];
    this.remotessrc = {};

    // container for candidates from the focus
    // gathered before confid is known
    this.drip_container = [];

    // silly wait flag
    this.wait = true;

    this.recordingEnabled = false;

    // stores information about the endpoints (i.e. display names) to
    // be sent to the videobridge.
    this.endpointsInfo = null;
}

// creates a conferences with an initial set of peers
ColibriFocus.prototype.makeConference = function (peers, errorCallback) {
    var self = this;
    if (this.confid !== null) {
        console.error('makeConference called twice? Ignoring...');
        // FIXME: just invite peers?
        return;
    }
    this.confid = 0; // !null
    this.peers = [];
    peers.forEach(function (peer) {
        self.peers.push(peer);
        self.channels.push([]);
    });

    this.peerconnection
        = new TraceablePeerConnection(
            this.connection.jingle.ice_config,
            this.connection.jingle.pc_constraints );

    if(RTCActivator.getRTCService().localAudio) {
        this.peerconnection.addStream(RTCActivator.getRTCService().localAudio);
    }
    if(RTCActivator.getRTCService().localVideo) {
        this.peerconnection.addStream(RTCActivator.getRTCService().localVideo);
    }
    this.peerconnection.oniceconnectionstatechange = function (event) {
        console.warn('ice connection state changed to', self.peerconnection.iceConnectionState);
        /*
        if (self.peerconnection.signalingState == 'stable' && self.peerconnection.iceConnectionState == 'connected') {
            console.log('adding new remote SSRCs from iceconnectionstatechange');
            window.setTimeout(function() { self.modifySources(); }, 1000);
        }
        */
        self.onIceConnectionStateChange(self.sid, self);
    };
    this.peerconnection.onsignalingstatechange = function (event) {
        console.warn(self.peerconnection.signalingState);
        /*
        if (self.peerconnection.signalingState == 'stable' && self.peerconnection.iceConnectionState == 'connected') {
            console.log('adding new remote SSRCs from signalingstatechange');
            window.setTimeout(function() { self.modifySources(); }, 1000);
        }
        */
    };
    this.peerconnection.onaddstream = function (event) {
        // search the jid associated with this stream
        Object.keys(self.remotessrc).forEach(function (jid) {
            if (self.remotessrc[jid].join('\r\n').indexOf('mslabel:' + event.stream.id) != -1) {
                event.peerjid = jid;
            }
        });
        self.remoteStreams.push(event.stream);
//        $(document).trigger('remotestreamadded.jingle', [event, self.sid]);
        self.waitForPresence(event, self.sid);
    };
    this.peerconnection.onicecandidate = function (event) {
        //console.log('focus onicecandidate', self.confid, new Date().getTime(), event.candidate);
        if (!event.candidate) {
            console.log('end of candidates');
            return;
        }
        self.sendIceCandidate(event.candidate);
    };
    this._makeConference(errorCallback);
    /*
    this.peerconnection.createOffer(
        function (offer) {
            self.peerconnection.setLocalDescription(
                offer,
                function () {
                    // success
                    $(document).trigger('setLocalDescription.jingle', [self.sid]);
                    // FIXME: could call _makeConference here and trickle candidates later
                    self._makeConference();
                },
                function (error) {
                    console.log('setLocalDescription failed', error);
                }
            );
        },
        function (error) {
            console.warn(error);
        }
    );
    */
};

// Sends a COLIBRI message which enables or disables (according to 'state') the
// recording on the bridge. Waits for the result IQ and calls 'callback' with
// the new recording state, according to the IQ.
ColibriFocus.prototype.setRecording = function(token, callback, tokenNullCallback) {
    if (this.confid === null) {
        console.log('non-focus, or conference not yet organized: not enabling recording');
        return;
    }

    if(!token)
    {
        tokenNullCallback();
        return;
    }

    var oldState = this.recordingEnabled;
    var state = !oldState;
    var self = this;
    var elem = $iq({to: this.bridgejid, type: 'set'});
    elem.c('conference', {
        xmlns: 'http://jitsi.org/protocol/colibri',
        id: this.confid
    });
    elem.c('recording', {state: state, token: token});
    elem.up();

    this.connection.sendIQ(elem,
        function (result) {
            console.log('Set recording "', state, '". Result:', result);
            var recordingElem = $(result).find('>conference>recording');
            var newState = ('true' === recordingElem.attr('state'));

            self.recordingEnabled = newState;
            callback(newState, oldState);
        },
        function (error) {
            console.warn(error);
        }
    );
};

/*
 * Updates the display name for an endpoint with a specific jid.
 * jid: the jid associated with the endpoint.
 * displayName: the new display name for the endpoint.
 */
ColibriFocus.prototype.setEndpointDisplayName = function(jid, displayName) {
    var endpointId = jid.substr(1 + jid.lastIndexOf('/'));
    var update = false;

    if (this.endpointsInfo === null) {
       this.endpointsInfo = {};
    }

    var endpointInfo = this.endpointsInfo[endpointId];
    if ('undefined' === typeof endpointInfo) {
        endpointInfo = this.endpointsInfo[endpointId] = {};
    }

    if (endpointInfo['displayname'] !== displayName) {
        endpointInfo['displayname'] = displayName;
        update = true;
    }

    if (update) {
        this.updateEndpoints();
    }
};

/*
 * Sends a colibri message to the bridge that contains the
 * current endpoints and their display names.
 */
ColibriFocus.prototype.updateEndpoints = function() {
    if (this.confid === null
        || this.endpointsInfo === null) {
        return;
    }

    if (this.confid === 0) {
        // the colibri conference is currently initiating
        var self = this;
        window.setTimeout(function() { self.updateEndpoints()}, 1000);
        return;
    }

    var elem = $iq({to: this.bridgejid, type: 'set'});
    elem.c('conference', {
        xmlns: 'http://jitsi.org/protocol/colibri',
        id: this.confid
    });

    for (var id in this.endpointsInfo) {
        elem.c('endpoint');
        elem.attrs({ id: id,
                     displayname: this.endpointsInfo[id]['displayname']
        });
        elem.up();
    }

    //elem.up(); //conference

    this.connection.sendIQ(
        elem,
        function (result) {},
        function (error) { console.warn(error); }
    );
};

ColibriFocus.prototype._makeConference = function (errorCallback) {
    var self = this;
    var elem = $iq({ to: this.bridgejid, type: 'get' });
    elem.c('conference', { xmlns: 'http://jitsi.org/protocol/colibri' });

    this.media.forEach(function (name) {
        var elemName;
        var elemAttrs = { initiator: 'true', expire: self.channelExpire };

        if ('data' === name)
        {
            elemName = 'sctpconnection';
            elemAttrs['port'] = 5000;
        }
        else
        {
            elemName = 'channel';
            if (('video' === name) && (self.channelLastN >= 0))
                elemAttrs['last-n'] = self.channelLastN;
        }

        elem.c('content', { name: name });

        elem.c(elemName, elemAttrs);
        elem.attrs({ endpoint: self.myMucResource });
        if (config.useBundle) {
            elem.attrs({ 'channel-bundle-id': self.myMucResource });
        }
        elem.up();// end of channel/sctpconnection

        for (var j = 0; j < self.peers.length; j++) {
            var peer = self.peers[j];
            var peerEndpoint = peer.substr(1 + peer.lastIndexOf('/'));

            elem.c(elemName, elemAttrs);
            elem.attrs({ endpoint: peerEndpoint });
            if (config.useBundle) {
                elem.attrs({ 'channel-bundle-id': peerEndpoint });
            }
            elem.up(); // end of channel/sctpconnection
        }
        elem.up(); // end of content
    });

    if (this.endpointsInfo !== null) {
        for (var id in this.endpointsInfo) {
            elem.c('endpoint');
            elem.attrs({ id: id,
                         displayname: this.endpointsInfo[id]['displayname']
            });
            elem.up();
        }
    }

    /*
    var localSDP = new SDP(this.peerconnection.localDescription.sdp);
    localSDP.media.forEach(function (media, channel) {
        var name = SDPUtil.parse_mline(media.split('\r\n')[0]).media;
        elem.c('content', {name: name});
        elem.c('channel', {initiator: 'false', expire: self.channelExpire});

        // FIXME: should reuse code from .toJingle
        var mline = SDPUtil.parse_mline(media.split('\r\n')[0]);
        for (var j = 0; j < mline.fmt.length; j++) {
            var rtpmap = SDPUtil.find_line(media, 'a=rtpmap:' + mline.fmt[j]);
            elem.c('payload-type', SDPUtil.parse_rtpmap(rtpmap));
            elem.up();
        }

        localSDP.TransportToJingle(channel, elem);

        elem.up(); // end of channel
        for (j = 0; j < self.peers.length; j++) {
            elem.c('channel', {initiator: 'true', expire: self.channelExpire }).up();
        }
        elem.up(); // end of content
    });
    */

    this.connection.sendIQ(elem,
        function (result) {
            self.createdConference(result);
        },
        function (error) {
            console.warn(error);
            errorCallback(error);
        }
    );
};

// callback when a colibri conference was created
ColibriFocus.prototype.createdConference = function (result) {
    console.log('created a conference on the bridge');
    var self = this;
    var tmp;

    this.confid = $(result).find('>conference').attr('id');
    var remotecontents = $(result).find('>conference>content').get();
    var numparticipants = 0;
    for (var i = 0; i < remotecontents.length; i++)
    {
        var contentName = $(remotecontents[i]).attr('name');
        var channelName
            = contentName !== 'data' ? '>channel' : '>sctpconnection';

        tmp = $(remotecontents[i]).find(channelName).get();
        this.mychannel.push($(tmp.shift()));
        numparticipants = tmp.length;
        for (j = 0; j < tmp.length; j++) {
            if (this.channels[j] === undefined) {
                this.channels[j] = [];
            }
            this.channels[j].push(tmp[j]);
        }
    }

    // save the 'transport' elements from 'channel-bundle'-s
    var channelBundles = $(result).find('>conference>channel-bundle');
    for (var i = 0; i < channelBundles.length; i++)
    {
        var endpointId = $(channelBundles[i]).attr('id');
        this.bundledTransports[endpointId] = $(channelBundles[i]).find('>transport[xmlns="urn:xmpp:jingle:transports:ice-udp:1"]');
    }

    console.log('remote channels', this.channels);

    // Notify that the focus has created the conference on the bridge
    this.eventEmitter.emit(XMPPEvents.CONFERENCE_CERATED, self);

    var bridgeSDP = new SDP(
        'v=0\r\n' +
        'o=- 5151055458874951233 2 IN IP4 127.0.0.1\r\n' +
        's=-\r\n' +
        't=0 0\r\n' +
        /* Audio */
        (config.useBundle
            ? ('a=group:BUNDLE audio video' +
                (config.openSctp ? ' data' : '') +
               '\r\n')
            : '') +
        'm=audio 1 RTP/SAVPF 111 103 104 0 8 106 105 13 126\r\n' +
        'c=IN IP4 0.0.0.0\r\n' +
        'a=rtcp:1 IN IP4 0.0.0.0\r\n' +
        'a=mid:audio\r\n' +
        'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\n' +
        'a=sendrecv\r\n' +
        'a=rtpmap:111 opus/48000/2\r\n' +
        'a=fmtp:111 minptime=10\r\n' +
        'a=rtpmap:103 ISAC/16000\r\n' +
        'a=rtpmap:104 ISAC/32000\r\n' +
        'a=rtpmap:0 PCMU/8000\r\n' +
        'a=rtpmap:8 PCMA/8000\r\n' +
        'a=rtpmap:106 CN/32000\r\n' +
        'a=rtpmap:105 CN/16000\r\n' +
        'a=rtpmap:13 CN/8000\r\n' +
        'a=rtpmap:126 telephone-event/8000\r\n' +
        'a=maxptime:60\r\n' +
        (config.useRtcpMux ? 'a=rtcp-mux\r\n' : '') +
        /* Video */
        'm=video 1 RTP/SAVPF 100 116 117\r\n' +
        'c=IN IP4 0.0.0.0\r\n' +
        'a=rtcp:1 IN IP4 0.0.0.0\r\n' +
        'a=mid:video\r\n' +
        'a=extmap:2 urn:ietf:params:rtp-hdrext:toffset\r\n' +
        'a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n' +
        'a=sendrecv\r\n' +
        'a=rtpmap:100 VP8/90000\r\n' +
        'a=rtcp-fb:100 ccm fir\r\n' +
        'a=rtcp-fb:100 nack\r\n' +
        'a=rtcp-fb:100 goog-remb\r\n' +
        'a=rtpmap:116 red/90000\r\n' +
        'a=rtpmap:117 ulpfec/90000\r\n' +
        (config.useRtcpMux ? 'a=rtcp-mux\r\n' : '') +
        /* Data SCTP */
        (config.openSctp ?
            'm=application 1 DTLS/SCTP 5000\r\n' +
            'c=IN IP4 0.0.0.0\r\n' +
            'a=sctpmap:5000 webrtc-datachannel\r\n' +
            'a=mid:data\r\n'
            : '')
    );

    bridgeSDP.media.length = this.mychannel.length;
    var channel;
    /*
    for (channel = 0; channel < bridgeSDP.media.length; channel++) {
        bridgeSDP.media[channel] = '';
        // unchanged lines
        bridgeSDP.media[channel] += SDPUtil.find_line(localSDP.media[channel], 'm=') + '\r\n';
        bridgeSDP.media[channel] += SDPUtil.find_line(localSDP.media[channel], 'c=') + '\r\n';
        if (SDPUtil.find_line(localSDP.media[channel], 'a=rtcp:')) {
            bridgeSDP.media[channel] += SDPUtil.find_line(localSDP.media[channel], 'a=rtcp:') + '\r\n';
        }
        if (SDPUtil.find_line(localSDP.media[channel], 'a=mid:')) {
            bridgeSDP.media[channel] += SDPUtil.find_line(localSDP.media[channel], 'a=mid:') + '\r\n';
        }
        if (SDPUtil.find_line(localSDP.media[channel], 'a=sendrecv')) {
            bridgeSDP.media[channel] += 'a=sendrecv\r\n';
        }
        if (SDPUtil.find_line(localSDP.media[channel], 'a=extmap:')) {
            bridgeSDP.media[channel] += SDPUtil.find_lines(localSDP.media[channel], 'a=extmap:').join('\r\n') + '\r\n';
        }

        // FIXME: should look at m-line and group the ids together
        if (SDPUtil.find_line(localSDP.media[channel], 'a=rtpmap:')) {
            bridgeSDP.media[channel] += SDPUtil.find_lines(localSDP.media[channel], 'a=rtpmap:').join('\r\n') + '\r\n';
        }
        if (SDPUtil.find_line(localSDP.media[channel], 'a=fmtp:')) {
            bridgeSDP.media[channel] += SDPUtil.find_lines(localSDP.media[channel], 'a=fmtp:').join('\r\n') + '\r\n';
        }
        if (SDPUtil.find_line(localSDP.media[channel], 'a=rtcp-fb:')) {
            bridgeSDP.media[channel] += SDPUtil.find_lines(localSDP.media[channel], 'a=rtcp-fb:').join('\r\n') + '\r\n';
        }
        // FIXME: changed lines -- a=sendrecv direction, a=setup direction
    }
    */
    for (channel = 0; channel < bridgeSDP.media.length; channel++) {
        // get the mixed ssrc
        tmp = $(this.mychannel[channel]).find('>source[xmlns="urn:xmpp:jingle:apps:rtp:ssma:0"]');
        // FIXME: check rtp-level-relay-type

        var name = bridgeSDP.media[channel].split(" ")[0].substr(2); // 'm=audio ...'
        if (name === 'audio' || name === 'video') {
            // make chrome happy... '3735928559' == 0xDEADBEEF
            var ssrc = tmp.length ? tmp.attr('ssrc') : '3735928559';

            bridgeSDP.media[channel] += 'a=ssrc:' + ssrc + ' cname:mixed\r\n';
            bridgeSDP.media[channel] += 'a=ssrc:' + ssrc + ' label:mixedlabel' + name + '0\r\n';
            bridgeSDP.media[channel] += 'a=ssrc:' + ssrc + ' msid:mixedmslabel mixedlabel' + name + '0\r\n';
            bridgeSDP.media[channel] += 'a=ssrc:' + ssrc + ' mslabel:mixedmslabel\r\n';
        }

        // FIXME: should take code from .fromJingle
        var channelBundleId = $(this.mychannel[channel]).attr('channel-bundle-id');
        if (typeof channelBundleId != 'undefined') {
            tmp = this.bundledTransports[channelBundleId];
        } else {
            tmp = $(this.mychannel[channel]).find('>transport[xmlns="urn:xmpp:jingle:transports:ice-udp:1"]');
        }

        if (tmp.length) {
            bridgeSDP.media[channel] += 'a=ice-ufrag:' + tmp.attr('ufrag') + '\r\n';
            bridgeSDP.media[channel] += 'a=ice-pwd:' + tmp.attr('pwd') + '\r\n';
            tmp.find('>candidate').each(function () {
                bridgeSDP.media[channel] += SDPUtil.candidateFromJingle(this);
            });
            tmp = tmp.find('>fingerprint');
            if (tmp.length) {
                bridgeSDP.media[channel] += 'a=fingerprint:' + tmp.attr('hash') + ' ' + tmp.text() + '\r\n';
                bridgeSDP.media[channel] += 'a=setup:actpass\r\n'; // offer so always actpass
            }
        }
    }
    bridgeSDP.raw = bridgeSDP.session + bridgeSDP.media.join('');
    var bridgeDesc = new RTCSessionDescription({type: 'offer', sdp: bridgeSDP.raw});
    var simulcast = new Simulcast();
    var bridgeDesc = simulcast.transformRemoteDescription(bridgeDesc);

    this.peerconnection.setRemoteDescription(bridgeDesc,
        function () {
            console.log('setRemoteDescription success');
            self.peerconnection.createAnswer(
                function (answer) {
                    self.peerconnection.setLocalDescription(answer,
                        function () {
                            console.log('setLocalDescription succeeded.');
                            // make sure our presence is updated
                            self.setLocalDescription(self.sid);
                            var elem = $iq({to: self.bridgejid, type: 'get'});
                            elem.c('conference', {xmlns: 'http://jitsi.org/protocol/colibri', id: self.confid});
                            var localSDP = new SDP(self.peerconnection.localDescription.sdp);
                            localSDP.media.forEach(function (media, channel) {
                                var name = SDPUtil.parse_mid(SDPUtil.find_line(media, 'a=mid:'));
                                elem.c('content', {name: name});
                                var mline = SDPUtil.parse_mline(media.split('\r\n')[0]);
                                if (name !== 'data')
                                {
                                    elem.c('channel', {
                                        initiator: 'true',
                                        expire: self.channelExpire,
                                        id: self.mychannel[channel].attr('id'),
                                        endpoint: self.myMucResource
                                    });

                                    // signal (through COLIBRI) to the bridge
                                    // the SSRC groups of the participant
                                    // that plays the role of the focus
                                    var ssrc_group_lines = SDPUtil.find_lines(media, 'a=ssrc-group:');
                                    var idx = 0;
                                    ssrc_group_lines.forEach(function(line) {
                                        idx = line.indexOf(' ');
                                        var semantics = line.substr(0, idx).substr(13);
                                        var ssrcs = line.substr(14 + semantics.length).split(' ');
                                        if (ssrcs.length != 0) {
                                            elem.c('ssrc-group', { semantics: semantics, xmlns: 'urn:xmpp:jingle:apps:rtp:ssma:0' });
                                            ssrcs.forEach(function(ssrc) {
                                                elem.c('source', { ssrc: ssrc })
                                                    .up();
                                            });
                                            elem.up();
                                        }
                                    });
                                    // FIXME: should reuse code from .toJingle
                                    for (var j = 0; j < mline.fmt.length; j++)
                                    {
                                        var rtpmap = SDPUtil.find_line(media, 'a=rtpmap:' + mline.fmt[j]);
                                        if (rtpmap)
                                        {
                                            elem.c('payload-type', SDPUtil.parse_rtpmap(rtpmap));
                                            elem.up();
                                        }
                                    }
                                }
                                else
                                {
                                    var sctpmap = SDPUtil.find_line(media, 'a=sctpmap:' + mline.fmt[0]);
                                    var sctpPort = SDPUtil.parse_sctpmap(sctpmap)[0];
                                    elem.c("sctpconnection",
                                        {
                                            initiator: 'true',
                                            expire: self.channelExpire,
                                            id: self.mychannel[channel].attr('id'),
                                            endpoint: self.myMucResource,
                                            port: sctpPort
                                        }
                                    );
                                }

                                localSDP.TransportToJingle(channel, elem);

                                elem.up(); // end of channel
                                elem.up(); // end of content
                            });

                            self.connection.sendIQ(elem,
                                function (result) {
                                    // ...
                                },
                                function (error) {
                                    console.error(
                                        "ERROR sending colibri message",
                                        error, elem);
                                }
                            );

                            // now initiate sessions
                            for (var i = 0; i < numparticipants; i++) {
                                self.initiate(self.peers[i], true);
                            }

                            // Notify we've created the conference
                            self.eventEmitter.emit(XMPPEvents.CONFERENCE_CERATED, self);
                        },
                        function (error) {
                            console.warn('setLocalDescription failed.', error);
                        }
                    );
                },
                function (error) {
                    console.warn('createAnswer failed.', error);
                }
            );
            /*
            for (var i = 0; i < numparticipants; i++) {
                self.initiate(self.peers[i], true);
            }
            */
        },
        function (error) {
            console.log('setRemoteDescription failed.', error);
        }
    );

};

// send a session-initiate to a new participant
ColibriFocus.prototype.initiate = function (peer, isInitiator) {
    var participant = this.peers.indexOf(peer);
    console.log('tell', peer, participant);
    var sdp;
    if (this.peerconnection !== null && this.peerconnection.signalingState == 'stable') {
        sdp = new SDP(this.peerconnection.remoteDescription.sdp);
        var localSDP = new SDP(this.peerconnection.localDescription.sdp);
        // throw away stuff we don't want
        // not needed with static offer
        if (!config.useBundle) {
            sdp.removeSessionLines('a=group:');
        }
        sdp.removeSessionLines('a=msid-semantic:'); // FIXME: not mapped over jingle anyway...
        for (var i = 0; i < sdp.media.length; i++) {
            if (!config.useRtcpMux){
                sdp.removeMediaLines(i, 'a=rtcp-mux');
            }
            sdp.removeMediaLines(i, 'a=ssrc:');
            sdp.removeMediaLines(i, 'a=ssrc-group:');
            sdp.removeMediaLines(i, 'a=crypto:');
            sdp.removeMediaLines(i, 'a=candidate:');
            sdp.removeMediaLines(i, 'a=ice-options:google-ice');
            sdp.removeMediaLines(i, 'a=ice-ufrag:');
            sdp.removeMediaLines(i, 'a=ice-pwd:');
            sdp.removeMediaLines(i, 'a=fingerprint:');
            sdp.removeMediaLines(i, 'a=setup:');

            if (1) { //i > 0) { // not for audio FIXME: does not work as intended
                // re-add all remote a=ssrcs _and_ a=ssrc-group
                for (var jid in this.remotessrc) {
                    if (jid == peer || !this.remotessrc[jid][i])
                        continue;
                    sdp.media[i] += this.remotessrc[jid][i];
                }

                // add local a=ssrc-group: lines
                lines = SDPUtil.find_lines(localSDP.media[i], 'a=ssrc-group:');
                if (lines.length != 0)
                    sdp.media[i] += lines.join('\r\n') + '\r\n';

                // and local a=ssrc: lines
                sdp.media[i] += SDPUtil.find_lines(localSDP.media[i], 'a=ssrc:').join('\r\n') + '\r\n';
            }
        }
        sdp.raw = sdp.session + sdp.media.join('');
    } else {
        console.error('can not initiate a new session without a stable peerconnection');
        return;
    }

    // add stuff we got from the bridge
    for (var j = 0; j < sdp.media.length; j++) {
        var chan = $(this.channels[participant][j]);
        console.log('channel id', chan.attr('id'));

        tmp = chan.find('>source[xmlns="urn:xmpp:jingle:apps:rtp:ssma:0"]');

        var name = sdp.media[j].split(" ")[0].substr(2); // 'm=audio ...'
        if (name === 'audio' || name === 'video') {
            // make chrome happy... '3735928559' == 0xDEADBEEF
            var ssrc = tmp.length ? tmp.attr('ssrc') : '3735928559';

            sdp.media[j] += 'a=ssrc:' + ssrc + ' cname:mixed\r\n';
            sdp.media[j] += 'a=ssrc:' + ssrc + ' label:mixedlabel' + name + '0\r\n';
            sdp.media[j] += 'a=ssrc:' + ssrc + ' msid:mixedmslabel mixedlabel' + name + '0\r\n';
            sdp.media[j] += 'a=ssrc:' + ssrc + ' mslabel:mixedmslabel\r\n';
        }

        // In the case of bundle, we add each candidate to all m= lines/jingle contents,
        // just as chrome does
        if (config.useBundle){
            tmp = this.bundledTransports[chan.attr('channel-bundle-id')];
        } else {
            tmp = chan.find('>transport[xmlns="urn:xmpp:jingle:transports:ice-udp:1"]');
        }

        if (tmp.length) {
            if (tmp.attr('ufrag'))
                sdp.media[j] += 'a=ice-ufrag:' + tmp.attr('ufrag') + '\r\n';
            if (tmp.attr('pwd'))
                sdp.media[j] += 'a=ice-pwd:' + tmp.attr('pwd') + '\r\n';
            // and the candidates...
            tmp.find('>candidate').each(function () {
                sdp.media[j] += SDPUtil.candidateFromJingle(this);
            });
            tmp = tmp.find('>fingerprint');
            if (tmp.length) {
                sdp.media[j] += 'a=fingerprint:' + tmp.attr('hash') + ' ' + tmp.text() + '\r\n';
                /*
                if (tmp.attr('direction')) {
                    sdp.media[j] += 'a=setup:' + tmp.attr('direction') + '\r\n';
                }
                */
                sdp.media[j] += 'a=setup:actpass\r\n';
            }
        }
    }
    // make a new colibri session and configure it
    // FIXME: is it correct to use this.connection.jid when used in a MUC?
    var sess = new ColibriSession(this.connection.jid,
                                  Math.random().toString(36).substr(2, 12), // random string
                                  this.connection);
    sess.initiate(peer);
    sess.colibri = this;
    // We do not announce our audio per conference peer, so only video is set here
    sess.localVideo = RTCActivator.getRTCService().localVideo;
    sess.media_constraints = this.connection.jingle.media_constraints;
    sess.pc_constraints = this.connection.jingle.pc_constraints;
    sess.ice_config = this.connection.jingle.ice_config;

    this.connection.jingle.sessions[sess.sid] = sess;
    this.connection.jingle.jid2session[sess.peerjid] = sess;

    // send a session-initiate
    var init = $iq({to: peer, type: 'set'})
        .c('jingle',
            {xmlns: 'urn:xmpp:jingle:1',
             action: 'session-initiate',
             initiator: sess.me,
             sid: sess.sid
            }
    );
    sdp.toJingle(init, 'initiator');
    this.connection.sendIQ(init,
        function (res) {
            console.log('got result');
        },
        function (err) {
            console.log('got error');
        }
    );
};

// pull in a new participant into the conference
ColibriFocus.prototype.addNewParticipant = function (peer) {
    var self = this;
    if (this.confid === 0 || !this.peerconnection.localDescription)
    {
        // bad state
        if (this.confid === 0)
        {
            console.error('confid does not exist yet, postponing', peer);
        }
        else
        {
            console.error('local description not ready yet, postponing', peer);
        }
        window.setTimeout(function () { self.addNewParticipant(peer); }, 250);
        return;
    }
    var index = this.channels.length;
    this.channels.push([]);
    this.peers.push(peer);

    var elem = $iq({to: this.bridgejid, type: 'get'});
    elem.c(
        'conference',
        { xmlns: 'http://jitsi.org/protocol/colibri', id: this.confid });
    var localSDP = new SDP(this.peerconnection.localDescription.sdp);
    localSDP.media.forEach(function (media, channel) {
        var name = SDPUtil.parse_mid(SDPUtil.find_line(media, 'a=mid:'));
        var elemName;
        var endpointId = peer.substr(1 + peer.lastIndexOf('/'));
        var elemAttrs
            = {
                initiator: 'true',
                expire: self.channelExpire,
                endpoint: endpointId
            };
        if (config.useBundle) {
            elemAttrs['channel-bundle-id'] = endpointId;
        }


        if ('data' == name)
        {
            elemName = 'sctpconnection';
            elemAttrs['port'] = 5000;
        }
        else
        {
            elemName = 'channel';
            if (('video' === name) && (self.channelLastN >= 0))
                elemAttrs['last-n'] = self.channelLastN;
        }

        elem.c('content', { name: name });
        elem.c(elemName, elemAttrs);
        elem.up(); // end of channel/sctpconnection
        elem.up(); // end of content
    });

    this.connection.sendIQ(elem,
        function (result) {
            var contents = $(result).find('>conference>content').get();
            var i;
            for (i = 0; i < contents.length; i++) {
                var channelXml = $(contents[i]).find('>channel');
                if (channelXml.length)
                {
                    tmp = channelXml.get();
                }
                else
                {
                    tmp = $(contents[i]).find('>sctpconnection').get();
                }
                self.channels[index][i] = tmp[0];
            }
            var channelBundles = $(result).find('>conference>channel-bundle');
            for (i = 0; i < channelBundles.length; i++)
            {
                var endpointId = $(channelBundles[i]).attr('id');
                self.bundledTransports[endpointId] = $(channelBundles[i]).find('>transport[xmlns="urn:xmpp:jingle:transports:ice-udp:1"]');
            }
            self.initiate(peer, true);
        },
        function (error) {
            console.warn(error);
        }
    );
};

// update the channel description (payload-types + dtls fp) for a participant
ColibriFocus.prototype.updateChannel = function (remoteSDP, participant) {
    console.log('change allocation for', this.confid);
    var self = this;
    var change = $iq({to: this.bridgejid, type: 'set'});
    change.c('conference', {xmlns: 'http://jitsi.org/protocol/colibri', id: this.confid});
    for (channel = 0; channel < this.channels[participant].length; channel++)
    {
        if (!remoteSDP.media[channel])
            continue;

        var name = SDPUtil.parse_mid(SDPUtil.find_line(remoteSDP.media[channel], 'a=mid:'));
        change.c('content', {name: name});
        if (name !== 'data')
        {
            change.c('channel', {
                id: $(this.channels[participant][channel]).attr('id'),
                endpoint: $(this.channels[participant][channel]).attr('endpoint'),
                expire: self.channelExpire
            });

            // signal (throught COLIBRI) to the bridge the SSRC groups of this
            // participant
            var ssrc_group_lines = SDPUtil.find_lines(remoteSDP.media[channel], 'a=ssrc-group:');
            var idx = 0;
            ssrc_group_lines.forEach(function(line) {
                idx = line.indexOf(' ');
                var semantics = line.substr(0, idx).substr(13);
                var ssrcs = line.substr(14 + semantics.length).split(' ');
                if (ssrcs.length != 0) {
                    change.c('ssrc-group', { semantics: semantics, xmlns: 'urn:xmpp:jingle:apps:rtp:ssma:0' });
                    ssrcs.forEach(function(ssrc) {
                        change.c('source', { ssrc: ssrc })
                            .up();
                    });
                    change.up();
                }
            });

            var rtpmap = SDPUtil.find_lines(remoteSDP.media[channel], 'a=rtpmap:');
            rtpmap.forEach(function (val) {
                // TODO: too much copy-paste
                var rtpmap = SDPUtil.parse_rtpmap(val);
                change.c('payload-type', rtpmap);
                //
                // put any 'a=fmtp:' + mline.fmt[j] lines into <param name=foo value=bar/>
                /*
                if (SDPUtil.find_line(remoteSDP.media[channel], 'a=fmtp:' + rtpmap.id)) {
                    tmp = SDPUtil.parse_fmtp(SDPUtil.find_line(remoteSDP.media[channel], 'a=fmtp:' + rtpmap.id));
                    for (var k = 0; k < tmp.length; k++) {
                        change.c('parameter', tmp[k]).up();
                    }
                }
                */
                change.up();
            });
        }
        else
        {
            var sctpmap = SDPUtil.find_line(remoteSDP.media[channel], 'a=sctpmap:');
            change.c('sctpconnection', {
                id: $(this.channels[participant][channel]).attr('id'),
                endpoint: $(this.channels[participant][channel]).attr('endpoint'),
                expire: self.channelExpire,
                port: SDPUtil.parse_sctpmap(sctpmap)[0]
            });
        }
        // now add transport
        remoteSDP.TransportToJingle(channel, change);

        change.up(); // end of channel/sctpconnection
        change.up(); // end of content
    }
    this.connection.sendIQ(change,
        function (res) {
            console.log('got result');
        },
        function (err) {
            console.log('got error');
        }
    );
};

// tell everyone about a new participants a=ssrc lines (isadd is true)
// or a leaving participants a=ssrc lines
ColibriFocus.prototype.sendSSRCUpdate = function (sdpMediaSsrcs, fromJid, isadd) {
    var self = this;
    this.peers.forEach(function (peerjid) {
        if (peerjid == fromJid) return;
        console.log('tell', peerjid, 'about ' + (isadd ? 'new' : 'removed') + ' ssrcs from', fromJid);
        if (!self.remotessrc[peerjid]) {
            // FIXME: this should only send to participants that are stable, i.e. who have sent a session-accept
            // possibly, this.remoteSSRC[session.peerjid] does not exist yet
            console.warn('do we really want to bother', peerjid, 'with updates yet?');
        }
        var peersess = self.connection.jingle.jid2session[peerjid];
        if(!peersess){
            console.warn('no session with peer: '+peerjid+' yet...');
            return;
        }

        self.sendSSRCUpdateIq(sdpMediaSsrcs, peersess.sid, peersess.initiator, peerjid, isadd);
    });
};

/**
 * Overrides SessionBase.addSource.
 *
 * @param elem proprietary 'add source' Jingle request(XML node).
 * @param fromJid JID of the participant to whom new ssrcs belong.
 */
ColibriFocus.prototype.addSource = function (elem, fromJid) {

    var self = this;
    // FIXME: dirty waiting
    if (!this.peerconnection.localDescription)
    {
        console.warn("addSource - localDescription not ready yet")
        setTimeout(function() { self.addSource(elem, fromJid); }, 200);
        return;
    }

    this.peerconnection.addSource(elem);

    var peerSsrc = this.remotessrc[fromJid];
    //console.log("On ADD", self.addssrc, peerSsrc);
    this.peerconnection.addssrc.forEach(function(val, idx){
        if(!peerSsrc[idx]){
            // add ssrc
            peerSsrc[idx] = val;
        } else {
            if(peerSsrc[idx].indexOf(val) == -1){
                peerSsrc[idx] = peerSsrc[idx]+val;
            }
        }
    });

    var oldRemoteSdp = new SDP(this.peerconnection.remoteDescription.sdp);
    this.modifySources(function(){
        // Notify other participants about added ssrc
        var remoteSDP = new SDP(self.peerconnection.remoteDescription.sdp);
        var newSSRCs = oldRemoteSdp.getNewMedia(remoteSDP);
        self.sendSSRCUpdate(newSSRCs, fromJid, true);
    });
};

/**
 * Overrides SessionBase.removeSource.
 *
 * @param elem proprietary 'remove source' Jingle request(XML node).
 * @param fromJid JID of the participant to whom removed ssrcs belong.
 */
ColibriFocus.prototype.removeSource = function (elem, fromJid) {

    var self = this;
    // FIXME: dirty waiting
    if (!self.peerconnection.localDescription)
    {
        console.warn("removeSource - localDescription not ready yet");
        setTimeout(function() { self.removeSource(elem, fromJid); }, 200);
        return;
    }

    this.peerconnection.removeSource(elem);

    var peerSsrc = this.remotessrc[fromJid];
    //console.log("On REMOVE", self.removessrc, peerSsrc);
    this.peerconnection.removessrc.forEach(function(val, idx){
        if(peerSsrc[idx]){
            // Remove ssrc
            peerSsrc[idx] = peerSsrc[idx].replace(val, '');
        }
    });

    var oldSDP = new SDP(self.peerconnection.remoteDescription.sdp);
    this.modifySources(function(){
        // Notify other participants about removed ssrc
        var remoteSDP = new SDP(self.peerconnection.remoteDescription.sdp);
        var removedSSRCs = remoteSDP.getNewMedia(oldSDP);
        self.sendSSRCUpdate(removedSSRCs, fromJid, false);
    });
};

ColibriFocus.prototype.setRemoteDescription = function (session, elem, desctype) {
    var participant = this.peers.indexOf(session.peerjid);
    console.log('Colibri.setRemoteDescription from', session.peerjid, participant);
    var remoteSDP = new SDP('');
    var channel;
    remoteSDP.fromJingle(elem);

    // ACT 1: change allocation on bridge
    this.updateChannel(remoteSDP, participant);

    // ACT 2: tell anyone else about the new SSRCs
    this.sendSSRCUpdate(remoteSDP.getMediaSsrcMap(), session.peerjid, true);

    // ACT 3: note the SSRCs
    this.remotessrc[session.peerjid] = [];
    for (channel = 0; channel < this.channels[participant].length; channel++) {
        //if (channel == 0) continue; FIXME: does not work as intended
        if (!remoteSDP.media[channel])
            continue;

        var lines = SDPUtil.find_lines(remoteSDP.media[channel], 'a=ssrc-group:');
        if (lines.length != 0)
            // prepend ssrc-groups
            this.remotessrc[session.peerjid][channel] = lines.join('\r\n') + '\r\n';

        if (SDPUtil.find_lines(remoteSDP.media[channel], 'a=ssrc:').length)
        {
            if (!this.remotessrc[session.peerjid][channel])
                this.remotessrc[session.peerjid][channel] = '';

            this.remotessrc[session.peerjid][channel] +=
                SDPUtil.find_lines(remoteSDP.media[channel], 'a=ssrc:')
                        .join('\r\n') + '\r\n';
        }
    }

    // ACT 4: add new a=ssrc and s=ssrc-group lines to local remotedescription
    for (channel = 0; channel < this.channels[participant].length; channel++) {
        //if (channel == 0) continue; FIXME: does not work as intended
        if (!remoteSDP.media[channel])
            continue;

        var lines = SDPUtil.find_lines(remoteSDP.media[channel], 'a=ssrc-group:');
        if (lines.length != 0)
            this.peerconnection.enqueueAddSsrc(
                channel, SDPUtil.find_lines(remoteSDP.media[channel], 'a=ssrc-group:').join('\r\n') + '\r\n');

        if (SDPUtil.find_lines(remoteSDP.media[channel], 'a=ssrc:').length) {
            this.peerconnection.enqueueAddSsrc(
                channel,
                SDPUtil.find_lines(remoteSDP.media[channel], 'a=ssrc:').join('\r\n') + '\r\n'
            );
        }
    }
    this.modifySources();
};

// relay ice candidates to bridge using trickle
ColibriFocus.prototype.addIceCandidate = function (session, elem) {
    var self = this;
    var participant = this.peers.indexOf(session.peerjid);
    //console.log('change transport allocation for', this.confid, session.peerjid, participant);
    var change = $iq({to: this.bridgejid, type: 'set'});
    change.c('conference', {xmlns: 'http://jitsi.org/protocol/colibri', id: this.confid});
    $(elem).each(function () {
        var name = $(this).attr('name');

        // If we are using bundle, audio/video/data channel will have the same candidates, so only send them for
        // the audio channel.
        if (config.useBundle && name !== 'audio') {
            return;
        }

        var channel = name == 'audio' ? 0 : 1; // FIXME: search mlineindex in localdesc
        if (name != 'audio' && name != 'video')
            channel = 2; // name == 'data'

        change.c('content', {name: name});
        if (name !== 'data')
        {
            change.c('channel', {
                id: $(self.channels[participant][channel]).attr('id'),
                endpoint: $(self.channels[participant][channel]).attr('endpoint'),
                expire: self.channelExpire
            });
        }
        else
        {
            change.c('sctpconnection', {
                id: $(self.channels[participant][channel]).attr('id'),
                endpoint: $(self.channels[participant][channel]).attr('endpoint'),
                expire: self.channelExpire
            });
        }
        $(this).find('>transport').each(function () {
            change.c('transport', {
                ufrag: $(this).attr('ufrag'),
                pwd: $(this).attr('pwd'),
                xmlns: $(this).attr('xmlns')
            });
            if (config.useRtcpMux
                  && 'channel' === change.node.parentNode.nodeName) {
                change.c('rtcp-mux').up();
            }

            $(this).find('>candidate').each(function () {
                /* not yet
                if (this.getAttribute('protocol') == 'tcp' && this.getAttribute('port') == 0) {
                    // chrome generates TCP candidates with port 0
                    return;
                }
                */
                var line = SDPUtil.candidateFromJingle(this);
                change.c('candidate', SDPUtil.candidateToJingle(line)).up();
            });
            change.up(); // end of transport
        });
        change.up(); // end of channel/sctpconnection
        change.up(); // end of content
    });
    // FIXME: need to check if there is at least one candidate when filtering TCP ones
    this.connection.sendIQ(change,
        function (res) {
            console.log('got result');
        },
        function (err) {
            console.error('got error', err);
        }
    );
};

// send our own candidate to the bridge
ColibriFocus.prototype.sendIceCandidate = function (candidate) {
    var self = this;
    //console.log('candidate', candidate);
    if (!candidate) {
        console.log('end of candidates');
        return;
    }
    if (this.drip_container.length === 0) {
        // start 20ms callout
        window.setTimeout(
            function () {
                if (self.drip_container.length === 0) return;
                self.sendIceCandidates(self.drip_container);
                self.drip_container = [];
            },
            20);
    }
    this.drip_container.push(candidate);
};

// sort and send multiple candidates
ColibriFocus.prototype.sendIceCandidates = function (candidates) {
    var self = this;
    var mycands = $iq({to: this.bridgejid, type: 'set'});
    mycands.c('conference', {xmlns: 'http://jitsi.org/protocol/colibri', id: this.confid});
    // FIXME: multi-candidate logic is taken from strophe.jingle, should be refactored there
    var localSDP = new SDP(this.peerconnection.localDescription.sdp);
    for (var mid = 0; mid < localSDP.media.length; mid++)
    {
        var cands = candidates.filter(function (el) { return el.sdpMLineIndex == mid; });
        if (cands.length > 0)
        {
            var name = cands[0].sdpMid;
            mycands.c('content', {name: name });
            if (name !== 'data')
            {
                mycands.c('channel', {
                    id: $(this.mychannel[cands[0].sdpMLineIndex]).attr('id'),
                    endpoint: $(this.mychannel[cands[0].sdpMLineIndex]).attr('endpoint'),
                    expire: self.channelExpire
                });
            }
            else
            {
                mycands.c('sctpconnection', {
                    id: $(this.mychannel[cands[0].sdpMLineIndex]).attr('id'),
                    endpoint: $(this.mychannel[cands[0].sdpMLineIndex]).attr('endpoint'),
                    port: $(this.mychannel[cands[0].sdpMLineIndex]).attr('port'),
                    expire: self.channelExpire
                });
            }
            mycands.c('transport', {xmlns: 'urn:xmpp:jingle:transports:ice-udp:1'});
            if (config.useRtcpMux && name !== 'data') {
                mycands.c('rtcp-mux').up();
            }
            for (var i = 0; i < cands.length; i++) {
                mycands.c('candidate', SDPUtil.candidateToJingle(cands[i].candidate)).up();
            }
            mycands.up(); // transport
            mycands.up(); // channel / sctpconnection
            mycands.up(); // content
        }
    }
    console.log('send cands', candidates);
    this.connection.sendIQ(mycands,
        function (res) {
            console.log('got result');
        },
        function (err) {
            console.error('got error', err);
        }
    );
};

ColibriFocus.prototype.terminate = function (session, reason) {
    console.log('remote session terminated from', session.peerjid);
    var participant = this.peers.indexOf(session.peerjid);
    if (!this.remotessrc[session.peerjid] || participant == -1) {
        return;
    }
    var ssrcs = this.remotessrc[session.peerjid];
    for (var i = 0; i < ssrcs.length; i++) {
        this.peerconnection.enqueueRemoveSsrc(i, ssrcs[i]);
    }
    // remove from this.peers
    this.peers.splice(participant, 1);
    // expire channel on bridge
    var change = $iq({to: this.bridgejid, type: 'set'});
    change.c('conference', {xmlns: 'http://jitsi.org/protocol/colibri', id: this.confid});
    for (var channel = 0; channel < this.channels[participant].length; channel++) {
        var name = channel === 0 ? 'audio' : 'video';
        if (channel == 2)
            name = 'data';
        change.c('content', {name: name});
        if (name !== 'data')
        {
            change.c('channel', {
                id: $(this.channels[participant][channel]).attr('id'),
                endpoint: $(this.channels[participant][channel]).attr('endpoint'),
                expire: '0'
            });
        }
        else
        {
            change.c('sctpconnection', {
                id: $(this.channels[participant][channel]).attr('id'),
                endpoint: $(this.channels[participant][channel]).attr('endpoint'),
                expire: '0'
            });
        }
        change.up(); // end of channel/sctpconnection
        change.up(); // end of content
    }
    this.connection.sendIQ(change,
        function (res) {
            console.log('got result');
        },
        function (err) {
            console.error('got error', err);
        }
    );
    // and remove from channels
    this.channels.splice(participant, 1);

    // tell everyone about the ssrcs to be removed
    var sdp = new SDP('');
    var localSDP = new SDP(this.peerconnection.localDescription.sdp);
    var contents = SDPUtil.find_lines(localSDP.raw, 'a=mid:').map(SDPUtil.parse_mid);
    for (var j = 0; j < ssrcs.length; j++) {
        sdp.media[j] = 'a=mid:' + contents[j] + '\r\n';
        sdp.media[j] += ssrcs[j];
        this.peerconnection.enqueueRemoveSsrc(j, ssrcs[j]);
    }
    this.sendSSRCUpdate(sdp.getMediaSsrcMap(), session.peerjid, false);

    delete this.remotessrc[session.peerjid];
    this.modifySources();
};

ColibriFocus.prototype.sendTerminate = function (session, reason, text) {
    var term = $iq({to: session.peerjid, type: 'set'})
        .c('jingle',
            {xmlns: 'urn:xmpp:jingle:1',
            action: 'session-terminate',
            initiator: session.me,
            sid: session.sid})
        .c('reason')
        .c(reason || 'success');

    if (text) {
        term.up().c('text').t(text);
    }

    this.connection.sendIQ(term,
        function () {
            if (!session)
                return;

            if (session.peerconnection) {
                session.peerconnection.close();
                session.peerconnection = null;
            }

            session.terminate();
            var ack = {};
            ack.source = 'terminate';
            $(document).trigger('ack.jingle', [session.sid, ack]);
        },
        function (stanza) {
            var error = ($(stanza).find('error').length) ? {
                code: $(stanza).find('error').attr('code'),
                reason: $(stanza).find('error :first')[0].tagName
            }:{};
            $(document).trigger('ack.jingle', [self.sid, error]);
        },
        10000);
    if (this.statsinterval !== null) {
        window.clearInterval(this.statsinterval);
        this.statsinterval = null;
    }
};

ColibriFocus.prototype.setRTCPTerminationStrategy = function (strategyFQN) {
    var self = this;

    // TODO(gp) maybe move the RTCP termination strategy element under the
    // content or channel element.
    var strategyIQ = $iq({to: this.bridgejid, type: 'set'});
    strategyIQ.c('conference', {
	    xmlns: 'http://jitsi.org/protocol/colibri',
	    id: this.confid
    });

    strategyIQ.c('rtcp-termination-strategy', {name: strategyFQN });

    strategyIQ.c('content', {name: "video"});
    strategyIQ.up(); // end of content

    console.log('setting RTCP termination strategy', strategyFQN);
    this.connection.sendIQ(strategyIQ,
        function (res) {
            console.log('got result');
        },
        function (err) {
            console.error('got error', err);
        }
    );
};

/**
 * Sets the default value of the channel last-n attribute in this conference and
 * updates/patches the existing channels.
 */
ColibriFocus.prototype.setChannelLastN = function (channelLastN) {
    if (('number' === typeof(channelLastN))
            && (this.channelLastN !== channelLastN))
    {
        this.channelLastN = channelLastN;

        // Update/patch the existing channels.
        var patch = $iq({ to: this.bridgejid, type: 'set' });

        patch.c(
            'conference',
            { xmlns: 'http://jitsi.org/protocol/colibri', id: this.confid });
        patch.c('content', { name: 'video' });
        patch.c(
            'channel',
            {
                id: $(this.mychannel[1 /* video */]).attr('id'),
                'last-n': this.channelLastN
            });
        patch.up(); // end of channel
        for (var p = 0; p < this.channels.length; p++)
        {
            patch.c(
                'channel',
                {
                    id: $(this.channels[p][1 /* video */]).attr('id'),
                    'last-n': this.channelLastN
                });
            patch.up(); // end of channel
        }
        this.connection.sendIQ(
            patch,
            function (res) {
                console.info('Set channel last-n succeeded:', res);
            },
            function (err) {
                console.error('Set channel last-n failed:', err);
            });
    }
};

/**
 * Sets the default value of the channel simulcast layer attribute in this
 * conference and updates/patches the existing channels.
 */
ColibriFocus.prototype.setReceiveSimulcastLayer = function (receiveSimulcastLayer) {
    if (('number' === typeof(receiveSimulcastLayer))
        && (this.receiveSimulcastLayer !== receiveSimulcastLayer))
    {
        // TODO(gp) be able to set the receiving simulcast layer on a per
        // sender basis.
        this.receiveSimulcastLayer = receiveSimulcastLayer;

        // Update/patch the existing channels.
        var patch = $iq({ to: this.bridgejid, type: 'set' });

        patch.c(
            'conference',
            { xmlns: 'http://jitsi.org/protocol/colibri', id: this.confid });
        patch.c('content', { name: 'video' });
        patch.c(
            'channel',
            {
                id: $(this.mychannel[1 /* video */]).attr('id'),
                'receive-simulcast-layer': this.receiveSimulcastLayer
            });
        patch.up(); // end of channel
        for (var p = 0; p < this.channels.length; p++)
        {
            patch.c(
                'channel',
                {
                    id: $(this.channels[p][1 /* video */]).attr('id'),
                    'receive-simulcast-layer': this.receiveSimulcastLayer
                });
            patch.up(); // end of channel
        }
        this.connection.sendIQ(
            patch,
            function (res) {
                console.info('Set channel simulcast receive layer succeeded:', res);
            },
            function (err) {
                console.error('Set channel simulcast receive layer failed:', err);
            });
    }
};
module.exports = ColibriFocus;

},{"../../service/xmpp/XMPPEvents":2,"../strophe.jingle.adapter":10,"../strophe.jingle.sdp":12,"../strophe.jingle.sdp.util":13,"../strophe.jingle.sessionbase":15,"./colibri.session":6}],6:[function(require,module,exports){
/* colibri.js -- a COLIBRI focus 
 * The colibri spec has been submitted to the XMPP Standards Foundation
 * for publications as a XMPP extensions:
 * http://xmpp.org/extensions/inbox/colibri.html
 *
 * colibri.js is a participating focus, i.e. the focus participates
 * in the conference. The conference itself can be ad-hoc, through a
 * MUC, through PubSub, etc.
 *
 * colibri.js relies heavily on the strophe.jingle library available 
 * from https://github.com/ESTOS/strophe.jingle
 * and interoperates with the Jitsi videobridge available from
 * https://jitsi.org/Projects/JitsiVideobridge
 */
/*
Copyright (c) 2013 ESTOS GmbH

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
// A colibri session is similar to a jingle session, it just implements some things differently
// FIXME: inherit jinglesession, see https://github.com/legastero/Jingle-RTCPeerConnection/blob/master/index.js
function ColibriSession(me, sid, connection) {
    this.me = me;
    this.sid = sid;
    this.connection = connection;
    //this.peerconnection = null;
    //this.mychannel = null;
    //this.channels = null;
    this.peerjid = null;

    this.colibri = null;
}

// implementation of JingleSession interface
ColibriSession.prototype.initiate = function (peerjid, isInitiator) {
    this.peerjid = peerjid;
};

ColibriSession.prototype.sendOffer = function (offer) {
    console.log('ColibriSession.sendOffer');
};


ColibriSession.prototype.accept = function () {
    console.log('ColibriSession.accept');
};

ColibriSession.prototype.addSource = function (elem, fromJid) {
    this.colibri.addSource(elem, fromJid);
};

ColibriSession.prototype.removeSource = function (elem, fromJid) {
    this.colibri.removeSource(elem, fromJid);
};

ColibriSession.prototype.terminate = function (reason) {
    this.colibri.terminate(this, reason);
};

ColibriSession.prototype.active = function () {
    console.log('ColibriSession.active');
};

ColibriSession.prototype.setRemoteDescription = function (elem, desctype) {
    this.colibri.setRemoteDescription(this, elem, desctype);
};

ColibriSession.prototype.addIceCandidate = function (elem) {
    this.colibri.addIceCandidate(this, elem);
};

ColibriSession.prototype.sendAnswer = function (sdp, provisional) {
    console.log('ColibriSession.sendAnswer');
};

ColibriSession.prototype.sendTerminate = function (reason, text) {
    this.colibri.sendTerminate(this, reason, text);
};

module.exports = ColibriSession;
},{}],7:[function(require,module,exports){
/**
 * Moderate connection plugin.
 */

module.exports = function() {
    Strophe.addConnectionPlugin('moderate', {
        connection: null,
        roomjid: null,
        myroomjid: null,
        members: {},
        list_members: [], // so we can elect a new focus
        presMap: {},
        preziMap: {},
        joined: false,
        isOwner: false,
        init: function (conn) {
            this.connection = conn;

            this.connection.addHandler(this.onMute.bind(this),
                'http://jitsi.org/jitmeet/audio',
                'iq',
                'set',
                null,
                null);
        },
        setMute: function (jid, mute) {
            var iq = $iq({to: jid, type: 'set'})
                .c('mute', {xmlns: 'http://jitsi.org/jitmeet/audio'})
                .t(mute.toString())
                .up();

            this.connection.sendIQ(
                iq,
                function (result) {
                    console.log('set mute', result);
                },
                function (error) {
                    console.log('set mute error', error);
                    messageHandler.openReportDialog(null, 'Failed to mute ' +
                        $("#participant_" + jid).find(".displayname").text() ||
                        "participant" + '.', error);
                });
        },
        onMute: function (iq) {
            var mute = $(iq).find('mute');
            if (mute.length) {
                UIActivator.getUIService().toggleAudio();
            }
            return true;
        },
        eject: function (jid) {
            this.connection.jingle.terminateRemoteByJid(jid, 'kick');
            this.connection.emuc.kick(jid);
        }
    });

};

},{}],8:[function(require,module,exports){
/* jshint -W117 */
/* a simple MUC connection plugin
 * can only handle a single MUC room
 */

var ColibriFocus = require("./colibri/colibri.focus");
var XMPPActivator = require("./XMPPActivator");
var XMPPEvents = require("../service/xmpp/XMPPEvents");

module.exports = function(eventEmitter) {
    Strophe.addConnectionPlugin('emuc', {
        connection: null,
        roomjid: null,
        myroomjid: null,
        members: {},
        list_members: [], // so we can elect a new focus
        presMap: {},
        preziMap: {},
        joined: false,
        isOwner: false,
        sessionTerminated: false,
        ssrc2videoType: {},
        ssrc2jid: {},
        focus: null,
        init: function (conn) {
            this.connection = conn;
        },
        initPresenceMap: function (myroomjid) {
            this.presMap['to'] = myroomjid;
            this.presMap['xns'] = 'http://jabber.org/protocol/muc';
        },
        doJoin: function (jid, password) {
            this.myroomjid = jid;

            console.info("Joined MUC as " + this.myroomjid);

            this.initPresenceMap(this.myroomjid);

            if (!this.roomjid) {
                this.roomjid = Strophe.getBareJidFromJid(jid);
                // add handlers (just once)
                this.connection.addHandler(this.onPresence.bind(this), null, 'presence', null, null, this.roomjid, {matchBare: true});
                this.connection.addHandler(this.onPresenceUnavailable.bind(this), null, 'presence', 'unavailable', null, this.roomjid, {matchBare: true});
                this.connection.addHandler(this.onPresenceError.bind(this), null, 'presence', 'error', null, this.roomjid, {matchBare: true});
                this.connection.addHandler(this.onMessage.bind(this), null, 'message', null, null, this.roomjid, {matchBare: true});
            }
            if (password !== undefined) {
                this.presMap['password'] = password;
            }
            this.sendPresence();
        },
        doLeave: function () {
            console.log("do leave", this.myroomjid);
            this.sessionTerminated = true;
            var pres = $pres({to: this.myroomjid, type: 'unavailable' });
            this.presMap.length = 0;
            this.connection.send(pres);
        },
        onPresence: function (pres) {
            var from = pres.getAttribute('from');
            var type = pres.getAttribute('type');
            if (type != null) {
                return true;
            }

            // Parse etherpad tag.
            var etherpad = $(pres).find('>etherpad');
            if (etherpad.length) {
                $(document).trigger('etherpadadded.muc', [from, etherpad.text()]);
            }

            // Parse prezi tag.
            var presentation = $(pres).find('>prezi');
            if (presentation.length) {
                var url = presentation.attr('url');
                var current = presentation.find('>current').text();

                console.log('presentation info received from', from, url);

                if (this.preziMap[from] == null) {
                    this.preziMap[from] = url;

                    $(document).trigger('presentationadded.muc', [from, url, current]);
                }
                else {
                    $(document).trigger('gotoslide.muc', [from, url, current]);
                }
            }
            else if (this.preziMap[from] != null) {
                var url = this.preziMap[from];
                delete this.preziMap[from];
                $(document).trigger('presentationremoved.muc', [from, url]);
            }

            // Parse audio info tag.
            var audioMuted = $(pres).find('>audiomuted');
            if (audioMuted.length) {
                $(document).trigger('audiomuted.muc', [from, audioMuted.text()]);
            }

            // Parse video info tag.
            var videoMuted = $(pres).find('>videomuted');
            if (videoMuted.length) {
                $(document).trigger('videomuted.muc', [from, videoMuted.text()]);
            }

            // Parse status.
            if ($(pres).find('>x[xmlns="http://jabber.org/protocol/muc#user"]>status[code="201"]').length) {
                // http://xmpp.org/extensions/xep-0045.html#createroom-instant
                this.isOwner = true;
                var create = $iq({type: 'set', to: this.roomjid})
                    .c('query', {xmlns: 'http://jabber.org/protocol/muc#owner'})
                    .c('x', {xmlns: 'jabber:x:data', type: 'submit'});
                this.connection.send(create); // fire away
            }

            // Parse roles.
            var member = {};
            member.show = $(pres).find('>show').text();
            member.status = $(pres).find('>status').text();
            var tmp = $(pres).find('>x[xmlns="http://jabber.org/protocol/muc#user"]>item');
            member.affiliation = tmp.attr('affiliation');
            member.role = tmp.attr('role');

            var nicktag = $(pres).find('>nick[xmlns="http://jabber.org/protocol/nick"]');
            member.displayName = (nicktag.length > 0 ? nicktag.text() : null);

            if (from == this.myroomjid) {
                if (member.affiliation == 'owner') this.isOwner = true;
                if (!this.joined) {
                    this.joined = true;
                    var noMembers = false;
                    if (Object.keys(this.members).length < 1) {
                        noMembers = true;
                        this.focus = new ColibriFocus(this.connection, config.hosts.bridge, eventEmitter);
                        this.setOwnNickname();
                    }
                    UIActivator.getUIService().onMucJoined(from, member, noMembers);
                    this.list_members.push(from);
                }
            } else if (this.members[from] === undefined) {
                // new participant
                this.members[from] = member;
                this.list_members.push(from);
                UIActivator.getUIService().onMucEntered(from, member, pres,
                    (this.focus !==null && this.focus.confid === null));
                if (this.focus !== null) {
                    // FIXME: this should prepare the video
                    if (this.focus.confid === null) {
                        console.log('make new conference with', from);
                        this.focus.makeConference(Object.keys(this.members));
                    } else {
                        console.log('invite', from, 'into conference');
                        this.focus.addNewParticipant(from);
                    }
                }
            }
            // Always trigger presence to update bindings
            console.log('presence change from', from);
            this.parsePresence(from, member, pres);

            // Trigger status message update
            if (member.status) {
                UIActivator.getUIService().onMucPresenceStatus(from, member, pres);
            }

            return true;
        },
        onPresenceUnavailable: function (pres) {
            var from = pres.getAttribute('from');
            // Status code 110 indicates that this notification is "self-presence".
            if (!$(pres).find('>x[xmlns="http://jabber.org/protocol/muc#user"]>status[code="110"]').length) {
                delete this.members[from];
                this.list_members.splice(this.list_members.indexOf(from), 1);
                this.leftMuc(from);
                //            $(document).trigger('left.muc', [from]);
            }
            // If the status code is 110 this means we're leaving and we would like
            // to remove everyone else from our view, so we trigger the event.
            else if (this.list_members.length > 1) {
                for (var i = 0; i < this.list_members.length; i++) {
                    var member = this.list_members[i];
                    delete this.members[i];
                    this.list_members.splice(i, 1);
                    this.leftMuc(member);
                    //                $(document).trigger('left.muc', member);
                }
            }
            return true;
        },
        leftMuc: function (jid) {
            console.log('left.muc', jid);
            UIActivator.getUIService().onMucLeft(jid);
            this.connection.jingle.terminateByJid(jid);

            if (this.focus == null
                // I shouldn't be the one that left to enter here.
                && jid !== this.connection.emuc.myroomjid
                && this.connection.emuc.myroomjid === this.connection.emuc.list_members[0]
                // If our session has been terminated for some reason
                // (kicked, hangup), don't try to become the focus
                && !this.sessionTerminated) {
                console.log('welcome to our new focus... myself');
                this.focus = new ColibriFocus(this.connection, config.hosts.bridge, eventEmitter);
                this.setOwnNickname();

                UIActivator.getUIService().updateButtons(null, true);

                if (Object.keys(this.members).length > 0) {
                    this.focus.makeConference(Object.keys(this.members));
                    UIActivator.getUIService().updateButtons(true, null);
                }
                $(document).trigger('focusechanged.muc', [this.focus]);
            }
            else if (this.focus && Object.keys(this.connection.emuc.members).length === 0) {
                console.log('everyone left');
                // FIXME: closing the connection is a hack to avoid some
                // problems with reinit
                XMPPActivator.disposeConference(false,null,false);
                this.focus = new ColibriFocus(this.connection, config.hosts.bridge, eventEmitter);
                this.setOwnNickname();
                UIActivator.getUIService().updateButtons(true, false);
            }

            if (this.connection.emuc.getPrezi(jid)) {
                $(document).trigger('presentationremoved.muc',
                    [jid, this.connection.emuc.getPrezi(jid)]);
            }
        },
        setOwnNickname: function () {

            if (XMPPActivator.getNickname() !== null) {
                this.focus.setEndpointDisplayName(this.connection.emuc.myroomjid,
                    XMPPActivator.getNickname());
            }

        },
        onPresenceError: function (pres) {
            var from = pres.getAttribute('from');
            if ($(pres).find('>error[type="auth"]>not-authorized[xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"]').length) {
                UIActivator.getUIService().showLockPopup(from, this.doJoin);
            } else if ($(pres).find(
                '>error[type="cancel"]>not-allowed[xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"]').length) {
                var toDomain = Strophe.getDomainFromJid(pres.getAttribute('to'));
                if (toDomain === config.hosts.anonymousdomain) {
                    // we are connected with anonymous domain and only non anonymous users can create rooms
                    // we must authorize the user
                    XMPPActivator.promptLogin();
                } else {
                    console.warn('onPresError ', pres);
                    messageHandler.openReportDialog(null,
                        'Oops! Something went wrong and we couldn`t connect to the conference.',
                        pres);
                }
            } else {
                console.warn('onPresError ', pres);
                messageHandler.openReportDialog(null,
                    'Oops! Something went wrong and we couldn`t connect to the conference.',
                    pres);
            }
            return true;
        },
        sendMessage: function (body, nickname) {
            var msg = $msg({to: this.roomjid, type: 'groupchat'});
            msg.c('body', body).up();
            if (nickname) {
                msg.c('nick', {xmlns: 'http://jabber.org/protocol/nick'}).t(nickname).up().up();
            }
            this.connection.send(msg);
        },
        setSubject: function (subject) {
            var msg = $msg({to: this.roomjid, type: 'groupchat'});
            msg.c('subject', subject);
            this.connection.send(msg);
            console.log("topic changed to " + subject);
        },
        onMessage: function (msg) {
            // FIXME: this is a hack. but jingle on muc makes nickchanges hard
            var from = msg.getAttribute('from');
            var nick = $(msg).find('>nick[xmlns="http://jabber.org/protocol/nick"]').text() || Strophe.getResourceFromJid(from);

            var txt = $(msg).find('>body').text();
            var type = msg.getAttribute("type");
            if (type == "error") {
                UIActivator.chatAddError($(msg).find('>text').text(), txt);
                return true;
            }

            var subject = $(msg).find('>subject');
            if (subject.length) {
                var subjectText = subject.text();
                if (subjectText || subjectText == "") {
                    UIActivator.chatSetSubject(subjectText);
                    console.log("Subject is changed to " + subjectText);
                }
            }


            if (txt) {
                console.log('chat', nick, txt);

                UIActivator.updateChatConversation(from, nick, txt);
            }
            return true;
        },
        lockRoom: function (key) {
            //http://xmpp.org/extensions/xep-0045.html#roomconfig
            var ob = this;
            this.connection.sendIQ($iq({to: this.roomjid, type: 'get'}).c('query', {xmlns: 'http://jabber.org/protocol/muc#owner'}),
                function (res) {
                    if ($(res).find('>query>x[xmlns="jabber:x:data"]>field[var="muc#roomconfig_roomsecret"]').length) {
                        var formsubmit = $iq({to: ob.roomjid, type: 'set'}).c('query', {xmlns: 'http://jabber.org/protocol/muc#owner'});
                        formsubmit.c('x', {xmlns: 'jabber:x:data', type: 'submit'});
                        formsubmit.c('field', {'var': 'FORM_TYPE'}).c('value').t('http://jabber.org/protocol/muc#roomconfig').up().up();
                        formsubmit.c('field', {'var': 'muc#roomconfig_roomsecret'}).c('value').t(key).up().up();
                        // FIXME: is muc#roomconfig_passwordprotectedroom required?
                        this.connection.sendIQ(formsubmit,
                            function (res) {
                                console.log('set room password');
                            },
                            function (err) {
                                console.warn('setting password failed', err);
                                messageHandler.showError('Lock failed',
                                    'Failed to lock conference.',
                                    err);
                            }
                        );
                    } else {
                        console.warn('room passwords not supported');
                        messageHandler.showError('Warning',
                            'Room passwords are currently not supported.');

                    }
                },
                function (err) {
                    console.warn('setting password failed', err);
                    messageHandler.showError('Lock failed',
                        'Failed to lock conference.',
                        err);
                }
            );
        },
        kick: function (jid) {
            var kickIQ = $iq({to: this.roomjid, type: 'set'})
                .c('query', {xmlns: 'http://jabber.org/protocol/muc#admin'})
                .c('item', {nick: Strophe.getResourceFromJid(jid), role: 'none'})
                .c('reason').t('You have been kicked.').up().up().up();

            this.connection.sendIQ(
                kickIQ,
                function (result) {
                    console.log('Kick participant with jid: ', jid, result);
                },
                function (error) {
                    console.log('Kick participant error: ', error);
                });
        },
        sendPresence: function () {
            var pres = $pres({to: this.presMap['to'] });
            pres.c('x', {xmlns: this.presMap['xns']});

            if (this.presMap['password']) {
                pres.c('password').t(this.presMap['password']).up();
            }

            pres.up();

            if (this.presMap['bridgeIsDown']) {
                pres.c('bridgeIsDown').up();
            }

            if (this.presMap['displayName']) {
                // XEP-0172
                pres.c('nick', {xmlns: 'http://jabber.org/protocol/nick'})
                    .t(this.presMap['displayName']).up();
            }

            if (this.presMap['audions']) {
                pres.c('audiomuted', {xmlns: this.presMap['audions']})
                    .t(this.presMap['audiomuted']).up();
            }

            if (this.presMap['videons']) {
                pres.c('videomuted', {xmlns: this.presMap['videons']})
                    .t(this.presMap['videomuted']).up();
            }

            if (this.presMap['prezins']) {
                pres.c('prezi',
                    {xmlns: this.presMap['prezins'],
                        'url': this.presMap['preziurl']})
                    .c('current').t(this.presMap['prezicurrent']).up().up();
            }

            if (this.presMap['etherpadns']) {
                pres.c('etherpad', {xmlns: this.presMap['etherpadns']})
                    .t(this.presMap['etherpadname']).up();
            }

            if (this.presMap['medians']) {
                pres.c('media', {xmlns: this.presMap['medians']});
                var sourceNumber = 0;
                Object.keys(this.presMap).forEach(function (key) {
                    if (key.indexOf('source') >= 0) {
                        sourceNumber++;
                    }
                });
                if (sourceNumber > 0)
                    for (var i = 1; i <= sourceNumber / 3; i++) {
                        pres.c('source',
                            {type: this.presMap['source' + i + '_type'],
                                ssrc: this.presMap['source' + i + '_ssrc'],
                                direction: this.presMap['source' + i + '_direction']
                                    || 'sendrecv' }
                        ).up();
                    }
            }

            pres.up();
            this.connection.send(pres);
        },
        addDisplayNameToPresence: function (displayName) {
            this.presMap['displayName'] = displayName;
        },
        addMediaToPresence: function (sourceNumber, mtype, ssrcs, direction) {
            if (!this.presMap['medians'])
                this.presMap['medians'] = 'http://estos.de/ns/mjs';

            this.presMap['source' + sourceNumber + '_type'] = mtype;
            this.presMap['source' + sourceNumber + '_ssrc'] = ssrcs;
            this.presMap['source' + sourceNumber + '_direction'] = direction;
        },
        clearPresenceMedia: function () {
            var self = this;
            Object.keys(this.presMap).forEach(function (key) {
                if (key.indexOf('source') != -1) {
                    delete self.presMap[key];
                }
            });
        },
        addPreziToPresence: function (url, currentSlide) {
            this.presMap['prezins'] = 'http://jitsi.org/jitmeet/prezi';
            this.presMap['preziurl'] = url;
            this.presMap['prezicurrent'] = currentSlide;
        },
        removePreziFromPresence: function () {
            delete this.presMap['prezins'];
            delete this.presMap['preziurl'];
            delete this.presMap['prezicurrent'];
        },
        addCurrentSlideToPresence: function (currentSlide) {
            this.presMap['prezicurrent'] = currentSlide;
        },
        getPrezi: function (roomjid) {
            return this.preziMap[roomjid];
        },
        addEtherpadToPresence: function (etherpadName) {
            this.presMap['etherpadns'] = 'http://jitsi.org/jitmeet/etherpad';
            this.presMap['etherpadname'] = etherpadName;
        },
        addAudioInfoToPresence: function (isMuted) {
            this.presMap['audions'] = 'http://jitsi.org/jitmeet/audio';
            this.presMap['audiomuted'] = isMuted.toString();
        },
        addVideoInfoToPresence: function (isMuted) {
            this.presMap['videons'] = 'http://jitsi.org/jitmeet/video';
            this.presMap['videomuted'] = isMuted.toString();
        },
        findJidFromResource: function (resourceJid) {
            var peerJid = null;
            Object.keys(this.members).some(function (jid) {
                peerJid = jid;
                return Strophe.getResourceFromJid(jid) === resourceJid;
            });
            return peerJid;
        },
        addBridgeIsDownToPresence: function () {
            this.presMap['bridgeIsDown'] = true;
        },
        parsePresence: function (jid, info, pres) {
            var self = this;
            // Remove old ssrcs coming from the jid
            Object.keys(this.ssrc2jid).forEach(function (ssrc) {
                if (self.ssrc2jid[ssrc] == jid) {
                    delete self.ssrc2jid[ssrc];
                    console.log("deleted " + ssrc + " for " + jid);
                }
                if (self.ssrc2videoType[ssrc] == jid) {
                    delete self.ssrc2videoType[ssrc];
                }
            });

            $(pres).find('>media[xmlns="http://estos.de/ns/mjs"]>source').each(function (idx, ssrc) {
                //console.log(jid, 'assoc ssrc', ssrc.getAttribute('type'), ssrc.getAttribute('ssrc'));
                var ssrcV = ssrc.getAttribute('ssrc');
                self.ssrc2jid[ssrcV] = jid;
                console.log("added " + ssrcV + " for " + jid);

                var type = ssrc.getAttribute('type');
                self.ssrc2videoType[ssrcV] = type;

                // might need to update the direction if participant just went from sendrecv to recvonly
                if (type === 'video' || type === 'screen') {
                    switch (ssrc.getAttribute('direction')) {
                        case 'sendrecv':
                            UIActivator.showVideoForJID(Strophe.getResourceFromJid(jid));
                            break;
                        case 'recvonly':
                            UIActivator.hideVideoForJID(Strophe.getResourceFromJid(jid));
                            break;
                    }
                }
            });

            //fire display name event
            if (info.displayName && info.displayName.length > 0)
                eventEmitter.emit(XMPPEvents.DISPLAY_NAME_CHANGED,
                    jid, info.displayName);

            if (this.focus !== null && info.displayName !== null) {
                this.focus.setEndpointDisplayName(jid, info.displayName);
            }

            //check if the video bridge is available
            if($(pres).find(">bridgeIsDown").length > 0 && !bridgeIsDown) {
                bridgeIsDown = true;
                messageHandler.showError("Error",
                    "The video bridge is currently unavailable.");
            }
        }
    });
};


},{"../service/xmpp/XMPPEvents":2,"./XMPPActivator":4,"./colibri/colibri.focus":5}],9:[function(require,module,exports){
/* jshint -W117 */
module.exports = function() {
    Strophe.addConnectionPlugin('rayo',
        {
            RAYO_XMLNS: 'urn:xmpp:rayo:1',
            connection: null,
            init: function (conn) {
                this.connection = conn;
                if (this.connection.disco) {
                    this.connection.disco.addFeature('urn:xmpp:rayo:client:1');
                }

                this.connection.addHandler(
                    this.onRayo.bind(this), this.RAYO_XMLNS, 'iq', 'set', null, null);
            },
            onRayo: function (iq) {
                console.info("Rayo IQ", iq);
            },
            dial: function (to, from, roomName) {
                var self = this;
                var req = $iq(
                    {
                        type: 'set',
                        to: config.hosts.call_control
                    }
                );
                req.c('dial',
                    {
                        xmlns: this.RAYO_XMLNS,
                        to: to,
                        from: from
                    });
                req.c('header',
                    {
                        name: 'JvbRoomName',
                        value: roomName
                    });

                this.connection.sendIQ(
                    req,
                    function (result) {
                        console.info('Dial result ', result);

                        var resource = $(result).find('ref').attr('uri');
                        this.call_resource = resource.substr('xmpp:'.length);
                        console.info(
                                "Received call resource: " + this.call_resource);
                    },
                    function (error) {
                        console.info('Dial error ', error);
                    }
                );
            },
            hang_up: function () {
                if (!this.call_resource) {
                    console.warn("No call in progress");
                    return;
                }

                var self = this;
                var req = $iq(
                    {
                        type: 'set',
                        to: this.call_resource
                    }
                );
                req.c('hangup',
                    {
                        xmlns: this.RAYO_XMLNS
                    });

                this.connection.sendIQ(
                    req,
                    function (result) {
                        console.info('Hangup result ', result);
                        self.call_resource = null;
                    },
                    function (error) {
                        console.info('Hangup error ', error);
                        self.call_resource = null;
                    }
                );
            }
        }
    );
};
},{}],10:[function(require,module,exports){
var SDP = require("./strophe.jingle.sdp");

function TraceablePeerConnection(ice_config, constraints) {
    var self = this;
    var RTCPeerconnection = navigator.mozGetUserMedia ? mozRTCPeerConnection : webkitRTCPeerConnection;
    this.peerconnection = new RTCPeerconnection(ice_config, constraints);
    this.updateLog = [];
    this.stats = {};
    this.statsinterval = null;
    this.maxstats = 0; // limit to 300 values, i.e. 5 minutes; set to 0 to disable

    /**
     * Array of ssrcs that will be added on next modifySources call.
     * @type {Array}
     */
    this.addssrc = [];
    /**
     * Array of ssrcs that will be added on next modifySources call.
     * @type {Array}
     */
    this.removessrc = [];
    /**
     * Pending operation that will be done during modifySources call.
     * Currently 'mute'/'unmute' operations are supported.
     *
     * @type {String}
     */
    this.pendingop = null;

    /**
     * Flag indicates that peer connection stream have changed and modifySources should proceed.
     * @type {boolean}
     */
    this.switchstreams = false;

    // override as desired
    this.trace = function (what, info) {
        //console.warn('WTRACE', what, info);
        self.updateLog.push({
            time: new Date(),
            type: what,
            value: info || ""
        });
    };
    this.onicecandidate = null;
    this.peerconnection.onicecandidate = function (event) {
        self.trace('onicecandidate', JSON.stringify(event.candidate, null, ' '));
        if (self.onicecandidate !== null) {
            self.onicecandidate(event);
        }
    };
    this.onaddstream = null;
    this.peerconnection.onaddstream = function (event) {
        self.trace('onaddstream', event.stream.id);
        if (self.onaddstream !== null) {
            self.onaddstream(event);
        }
    };
    this.onremovestream = null;
    this.peerconnection.onremovestream = function (event) {
        self.trace('onremovestream', event.stream.id);
        if (self.onremovestream !== null) {
            self.onremovestream(event);
        }
    };
    this.onsignalingstatechange = null;
    this.peerconnection.onsignalingstatechange = function (event) {
        self.trace('onsignalingstatechange', self.signalingState);
        if (self.onsignalingstatechange !== null) {
            self.onsignalingstatechange(event);
        }
    };
    this.oniceconnectionstatechange = null;
    this.peerconnection.oniceconnectionstatechange = function (event) {
        self.trace('oniceconnectionstatechange', self.iceConnectionState);
        if (self.oniceconnectionstatechange !== null) {
            self.oniceconnectionstatechange(event);
        }
    };
    this.onnegotiationneeded = null;
    this.peerconnection.onnegotiationneeded = function (event) {
        self.trace('onnegotiationneeded');
        if (self.onnegotiationneeded !== null) {
            self.onnegotiationneeded(event);
        }
    };
    self.ondatachannel = null;
    this.peerconnection.ondatachannel = function (event) {
        self.trace('ondatachannel', event);
        if (self.ondatachannel !== null) {
            self.ondatachannel(event);
        }
    };
    if (!navigator.mozGetUserMedia && this.maxstats) {
        this.statsinterval = window.setInterval(function() {
            self.peerconnection.getStats(function(stats) {
                var results = stats.result();
                for (var i = 0; i < results.length; ++i) {
                    //console.log(results[i].type, results[i].id, results[i].names())
                    var now = new Date();
                    results[i].names().forEach(function (name) {
                        var id = results[i].id + '-' + name;
                        if (!self.stats[id]) {
                            self.stats[id] = {
                                startTime: now,
                                endTime: now,
                                values: [],
                                times: []
                            };
                        }
                        self.stats[id].values.push(results[i].stat(name));
                        self.stats[id].times.push(now.getTime());
                        if (self.stats[id].values.length > self.maxstats) {
                            self.stats[id].values.shift();
                            self.stats[id].times.shift();
                        }
                        self.stats[id].endTime = now;
                    });
                }
            });

        }, 1000);
    }
};

dumpSDP = function(description) {
    return 'type: ' + description.type + '\r\n' + description.sdp;
}

if (TraceablePeerConnection.prototype.__defineGetter__ !== undefined) {
    TraceablePeerConnection.prototype.__defineGetter__('signalingState', function() { return this.peerconnection.signalingState; });
    TraceablePeerConnection.prototype.__defineGetter__('iceConnectionState', function() { return this.peerconnection.iceConnectionState; });
    TraceablePeerConnection.prototype.__defineGetter__('localDescription', function() {
        var simulcast = new Simulcast();
        var publicLocalDescription = simulcast.reverseTransformLocalDescription(this.peerconnection.localDescription);
        return publicLocalDescription;
    });
    TraceablePeerConnection.prototype.__defineGetter__('remoteDescription', function() {
        var simulcast = new Simulcast();
        var publicRemoteDescription = simulcast.reverseTransformRemoteDescription(this.peerconnection.remoteDescription);
        return publicRemoteDescription;
    });
}

TraceablePeerConnection.prototype.addStream = function (stream) {
    this.trace('addStream', stream.id);
    this.peerconnection.addStream(stream.getOriginalStream());
};

TraceablePeerConnection.prototype.removeStream = function (stream) {
    this.trace('removeStream', stream.id);
    this.peerconnection.removeStream(stream.getOriginalStream());
};

TraceablePeerConnection.prototype.createDataChannel = function (label, opts) {
    this.trace('createDataChannel', label, opts);
    return this.peerconnection.createDataChannel(label, opts);
};

TraceablePeerConnection.prototype.setLocalDescription = function (description, successCallback, failureCallback) {
    var self = this;
    var simulcast = new Simulcast();
    description = simulcast.transformLocalDescription(description);
    this.trace('setLocalDescription', dumpSDP(description));
    this.peerconnection.setLocalDescription(description,
        function () {
            self.trace('setLocalDescriptionOnSuccess');
            successCallback();
        },
        function (err) {
            self.trace('setLocalDescriptionOnFailure', err);
            failureCallback(err);
        }
    );
    /*
     if (this.statsinterval === null && this.maxstats > 0) {
     // start gathering stats
     }
     */
};

TraceablePeerConnection.prototype.setRemoteDescription = function (description, successCallback, failureCallback) {
    var self = this;
    var simulcast = new Simulcast();
    description = simulcast.transformRemoteDescription(description);
    this.trace('setRemoteDescription', dumpSDP(description));
    this.peerconnection.setRemoteDescription(description,
        function () {
            self.trace('setRemoteDescriptionOnSuccess');
            successCallback();
        },
        function (err) {
            self.trace('setRemoteDescriptionOnFailure', err);
            failureCallback(err);
        }
    );
    /*
     if (this.statsinterval === null && this.maxstats > 0) {
     // start gathering stats
     }
     */
};

TraceablePeerConnection.prototype.hardMuteVideo = function (muted) {
    this.pendingop = muted ? 'mute' : 'unmute';
};

TraceablePeerConnection.prototype.enqueueAddSsrc = function(channel, ssrcLines) {
    if (!this.addssrc[channel]) {
        this.addssrc[channel] = '';
    }
    this.addssrc[channel] += ssrcLines;
}

TraceablePeerConnection.prototype.addSource = function (elem) {
    console.log('addssrc', new Date().getTime());
    console.log('ice', this.iceConnectionState);
    var sdp = new SDP(this.remoteDescription.sdp);
    var mySdp = new SDP(this.peerconnection.localDescription.sdp);

    var self = this;
    $(elem).each(function (idx, content) {
        var name = $(content).attr('name');
        var lines = '';
        tmp = $(content).find('ssrc-group[xmlns="urn:xmpp:jingle:apps:rtp:ssma:0"]').each(function() {
            var semantics = this.getAttribute('semantics');
            var ssrcs = $(this).find('>source').map(function () {
                return this.getAttribute('ssrc');
            }).get();

            if (ssrcs.length != 0) {
                lines += 'a=ssrc-group:' + semantics + ' ' + ssrcs.join(' ') + '\r\n';
            }
        });
        tmp = $(content).find('source[xmlns="urn:xmpp:jingle:apps:rtp:ssma:0"]'); // can handle both >source and >description>source
        tmp.each(function () {
            var ssrc = $(this).attr('ssrc');
            if(mySdp.containsSSRC(ssrc)){
                /**
                 * This happens when multiple participants change their streams at the same time and
                 * ColibriFocus.modifySources have to wait for stable state. In the meantime multiple
                 * addssrc are scheduled for update IQ. See
                 */
                console.warn("Got add stream request for my own ssrc: "+ssrc);
                return;
            }
            $(this).find('>parameter').each(function () {
                lines += 'a=ssrc:' + ssrc + ' ' + $(this).attr('name');
                if ($(this).attr('value') && $(this).attr('value').length)
                    lines += ':' + $(this).attr('value');
                lines += '\r\n';
            });
        });
        sdp.media.forEach(function(media, idx) {
            if (!SDPUtil.find_line(media, 'a=mid:' + name))
                return;
            sdp.media[idx] += lines;
            self.enqueueAddSsrc(idx, lines);
        });
        sdp.raw = sdp.session + sdp.media.join('');
    });
};

TraceablePeerConnection.prototype.enqueueRemoveSsrc = function(channel, ssrcLines) {
    if (!this.removessrc[channel]){
        this.removessrc[channel] = '';
    }
    this.removessrc[channel] += ssrcLines;
}

TraceablePeerConnection.prototype.removeSource = function (elem) {
    console.log('removessrc', new Date().getTime());
    console.log('ice', this.iceConnectionState);
    var sdp = new SDP(this.remoteDescription.sdp);
    var mySdp = new SDP(this.peerconnection.localDescription.sdp);

    var self = this;
    $(elem).each(function (idx, content) {
        var name = $(content).attr('name');
        var lines = '';
        tmp = $(content).find('ssrc-group[xmlns="urn:xmpp:jingle:apps:rtp:ssma:0"]').each(function() {
            var semantics = this.getAttribute('semantics');
            var ssrcs = $(this).find('>source').map(function () {
                return this.getAttribute('ssrc');
            }).get();

            if (ssrcs.length != 0) {
                lines += 'a=ssrc-group:' + semantics + ' ' + ssrcs.join(' ') + '\r\n';
            }
        });
        tmp = $(content).find('source[xmlns="urn:xmpp:jingle:apps:rtp:ssma:0"]'); // can handle both >source and >description>source
        tmp.each(function () {
            var ssrc = $(this).attr('ssrc');
            // This should never happen, but can be useful for bug detection
            if(mySdp.containsSSRC(ssrc)){
                console.error("Got remove stream request for my own ssrc: "+ssrc);
                return;
            }
            $(this).find('>parameter').each(function () {
                lines += 'a=ssrc:' + ssrc + ' ' + $(this).attr('name');
                if ($(this).attr('value') && $(this).attr('value').length)
                    lines += ':' + $(this).attr('value');
                lines += '\r\n';
            });
        });
        sdp.media.forEach(function(media, idx) {
            if (!SDPUtil.find_line(media, 'a=mid:' + name))
                return;
            sdp.media[idx] += lines;
            self.enqueueRemoveSsrc(idx, lines);
        });
        sdp.raw = sdp.session + sdp.media.join('');
    });
};

TraceablePeerConnection.prototype.modifySources = function(successCallback) {
    var self = this;
    if (this.signalingState == 'closed') return;
    if (!(this.addssrc.length || this.removessrc.length || this.pendingop !== null || this.switchstreams)){
        // There is nothing to do since scheduled job might have been executed by another succeeding call
        if(successCallback){
            successCallback();
        }
        return;
    }

    // FIXME: this is a big hack
    // https://code.google.com/p/webrtc/issues/detail?id=2688
    if (!(this.signalingState == 'stable' && this.iceConnectionState == 'connected')) {
        console.warn('modifySources not yet', this.signalingState, this.iceConnectionState);
        this.wait = true;
        window.setTimeout(function() { self.modifySources(successCallback); }, 250);
        return;
    }
    if (this.wait) {
        window.setTimeout(function() { self.modifySources(successCallback); }, 2500);
        this.wait = false;
        return;
    }

    // Reset switch streams flag
    this.switchstreams = false;

    var sdp = new SDP(this.remoteDescription.sdp);

    // add sources
    this.addssrc.forEach(function(lines, idx) {
        sdp.media[idx] += lines;
    });
    this.addssrc = [];

    // remove sources
    this.removessrc.forEach(function(lines, idx) {
        lines = lines.split('\r\n');
        lines.pop(); // remove empty last element;
        lines.forEach(function(line) {
            sdp.media[idx] = sdp.media[idx].replace(line + '\r\n', '');
        });
    });
    this.removessrc = [];

    sdp.raw = sdp.session + sdp.media.join('');
    this.setRemoteDescription(new RTCSessionDescription({type: 'offer', sdp: sdp.raw}),
        function() {

            if(self.signalingState == 'closed') {
                console.error("createAnswer attempt on closed state");
                return;
            }

            self.createAnswer(
                function(modifiedAnswer) {
                    // change video direction, see https://github.com/jitsi/jitmeet/issues/41
                    if (self.pendingop !== null) {
                        var sdp = new SDP(modifiedAnswer.sdp);
                        if (sdp.media.length > 1) {
                            switch(self.pendingop) {
                                case 'mute':
                                    sdp.media[1] = sdp.media[1].replace('a=sendrecv', 'a=recvonly');
                                    break;
                                case 'unmute':
                                    sdp.media[1] = sdp.media[1].replace('a=recvonly', 'a=sendrecv');
                                    break;
                            }
                            sdp.raw = sdp.session + sdp.media.join('');
                            modifiedAnswer.sdp = sdp.raw;
                        }
                        self.pendingop = null;
                    }

                    // FIXME: pushing down an answer while ice connection state
                    // is still checking is bad...
                    //console.log(self.peerconnection.iceConnectionState);

                    // trying to work around another chrome bug
                    //modifiedAnswer.sdp = modifiedAnswer.sdp.replace(/a=setup:active/g, 'a=setup:actpass');
                    self.setLocalDescription(modifiedAnswer,
                        function() {
                            //console.log('modified setLocalDescription ok');
                            if(successCallback){
                                successCallback();
                            }
                        },
                        function(error) {
                            console.error('modified setLocalDescription failed', error);
                        }
                    );
                },
                function(error) {
                    console.error('modified answer failed', error);
                }
            );
        },
        function(error) {
            console.error('modify failed', error);
        }
    );
};

TraceablePeerConnection.prototype.close = function () {
    this.trace('stop');
    if (this.statsinterval !== null) {
        window.clearInterval(this.statsinterval);
        this.statsinterval = null;
    }
    this.peerconnection.close();
};

TraceablePeerConnection.prototype.createOffer = function (successCallback, failureCallback, constraints) {
    var self = this;
    this.trace('createOffer', JSON.stringify(constraints, null, ' '));
    this.peerconnection.createOffer(
        function (offer) {
            self.trace('createOfferOnSuccess', dumpSDP(offer));
            successCallback(offer);
        },
        function(err) {
            self.trace('createOfferOnFailure', err);
            failureCallback(err);
        },
        constraints
    );
};

TraceablePeerConnection.prototype.createAnswer = function (successCallback, failureCallback, constraints) {
    var self = this;
    this.trace('createAnswer', JSON.stringify(constraints, null, ' '));
    this.peerconnection.createAnswer(
        function (answer) {
            var simulcast = new Simulcast();
            answer = simulcast.transformAnswer(answer);
            self.trace('createAnswerOnSuccess', dumpSDP(answer));
            successCallback(answer);
        },
        function(err) {
            self.trace('createAnswerOnFailure', err);
            failureCallback(err);
        },
        constraints
    );
};

TraceablePeerConnection.prototype.addIceCandidate = function (candidate, successCallback, failureCallback) {
    var self = this;
    this.trace('addIceCandidate', JSON.stringify(candidate, null, ' '));
    this.peerconnection.addIceCandidate(candidate);
    /* maybe later
     this.peerconnection.addIceCandidate(candidate,
     function () {
     self.trace('addIceCandidateOnSuccess');
     successCallback();
     },
     function (err) {
     self.trace('addIceCandidateOnFailure', err);
     failureCallback(err);
     }
     );
     */
};

TraceablePeerConnection.prototype.getStats = function(callback, errback) {
    if (navigator.mozGetUserMedia) {
        // ignore for now...
    } else {
        this.peerconnection.getStats(callback);
    }
};

module.exports = TraceablePeerConnection;
},{"./strophe.jingle.sdp":12}],11:[function(require,module,exports){
/* jshint -W117 */

var JingleSession = require("./strophe.jingle.session");
var XMPPEvents = require("../service/xmpp/XMPPEvents");
module.exports = function(eventEmitter) {
    Strophe.addConnectionPlugin('jingle', {
        connection: null,
        sessions: {},
        jid2session: {},
        ice_config: {iceServers: []},
        pc_constraints: {},
        media_constraints: {
            mandatory: {
                'OfferToReceiveAudio': true,
                'OfferToReceiveVideo': true
            }
            // MozDontOfferDataChannel: true when this is firefox
        },
        localAudio: null,
        localVideo: null,

        init: function (conn) {
            this.connection = conn;
            if (this.connection.disco) {
                // http://xmpp.org/extensions/xep-0167.html#support
                // http://xmpp.org/extensions/xep-0176.html#support
                this.connection.disco.addFeature('urn:xmpp:jingle:1');
                this.connection.disco.addFeature('urn:xmpp:jingle:apps:rtp:1');
                this.connection.disco.addFeature('urn:xmpp:jingle:transports:ice-udp:1');
                this.connection.disco.addFeature('urn:xmpp:jingle:apps:rtp:audio');
                this.connection.disco.addFeature('urn:xmpp:jingle:apps:rtp:video');


                // this is dealt with by SDP O/A so we don't need to annouce this
                //this.connection.disco.addFeature('urn:xmpp:jingle:apps:rtp:rtcp-fb:0'); // XEP-0293
                //this.connection.disco.addFeature('urn:xmpp:jingle:apps:rtp:rtp-hdrext:0'); // XEP-0294
                this.connection.disco.addFeature('urn:ietf:rfc:5761'); // rtcp-mux
                //this.connection.disco.addFeature('urn:ietf:rfc:5888'); // a=group, e.g. bundle
                //this.connection.disco.addFeature('urn:ietf:rfc:5576'); // a=ssrc
            }
            this.connection.addHandler(this.onJingle.bind(this), 'urn:xmpp:jingle:1', 'iq', 'set', null, null);
        },
        onJingle: function (iq) {
            var sid = $(iq).find('jingle').attr('sid');
            var action = $(iq).find('jingle').attr('action');
            var fromJid = iq.getAttribute('from');
            // send ack first
            var ack = $iq({type: 'result',
                to: fromJid,
                id: iq.getAttribute('id')
            });
            console.log('on jingle ' + action + ' from ' + fromJid, iq);
            var sess = this.sessions[sid];
            if ('session-initiate' != action) {
                if (sess === null) {
                    ack.type = 'error';
                    ack.c('error', {type: 'cancel'})
                        .c('item-not-found', {xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'}).up()
                        .c('unknown-session', {xmlns: 'urn:xmpp:jingle:errors:1'});
                    this.connection.send(ack);
                    return true;
                }
                // compare from to sess.peerjid (bare jid comparison for later compat with message-mode)
                // local jid is not checked
                if (Strophe.getBareJidFromJid(fromJid) != Strophe.getBareJidFromJid(sess.peerjid)) {
                    console.warn('jid mismatch for session id', sid, fromJid, sess.peerjid);
                    ack.type = 'error';
                    ack.c('error', {type: 'cancel'})
                        .c('item-not-found', {xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'}).up()
                        .c('unknown-session', {xmlns: 'urn:xmpp:jingle:errors:1'});
                    this.connection.send(ack);
                    return true;
                }
            } else if (sess !== undefined) {
                // existing session with same session id
                // this might be out-of-order if the sess.peerjid is the same as from
                ack.type = 'error';
                ack.c('error', {type: 'cancel'})
                    .c('service-unavailable', {xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'}).up();
                console.warn('duplicate session id', sid);
                this.connection.send(ack);
                return true;
            }
            // FIXME: check for a defined action
            this.connection.send(ack);
            // see http://xmpp.org/extensions/xep-0166.html#concepts-session
            switch (action) {
                case 'session-initiate':
                    sess = new JingleSession($(iq).attr('to'), $(iq).find('jingle').attr('sid'), this.connection);
                    // configure session
                    if (this.localAudio) {
                        sess.localStreams.push(this.localAudio);
                    }
                    if (this.localVideo) {
                        sess.localStreams.push(this.localVideo);
                    }
                    sess.media_constraints = this.media_constraints;
                    sess.pc_constraints = this.pc_constraints;
                    sess.ice_config = this.ice_config;

                    sess.initiate(fromJid, false);
                    // FIXME: setRemoteDescription should only be done when this call is to be accepted
                    sess.setRemoteDescription($(iq).find('>jingle'), 'offer');

                    this.sessions[sess.sid] = sess;
                    this.jid2session[sess.peerjid] = sess;

                    // the callback should either
                    // .sendAnswer and .accept
                    // or .sendTerminate -- not necessarily synchronus
                    XMPPActivator.setActiveCall(sess);
                    eventEmitter.emit(XMPPEvents.CALL_INCOMING, sess);
                    // TODO: check affiliation and/or role
                    console.log('emuc data for', sess.peerjid, this.connection.emuc.members[sess.peerjid]);
                    this.sessions[sess.sid].usedrip = true; // not-so-naive trickle ice
                    this.sessions[sess.sid].sendAnswer();
                    this.sessions[sess.sid].accept();

                    break;
                case 'session-accept':
                    sess.setRemoteDescription($(iq).find('>jingle'), 'answer');
                    sess.accept();
                    $(document).trigger('callaccepted.jingle', [sess.sid]);
                    break;
                case 'session-terminate':
                    // If this is not the focus sending the terminate, we have
                    // nothing more to do here.
                    if (Object.keys(this.sessions).length < 1
                        || !(this.sessions[Object.keys(this.sessions)[0]]
                            instanceof JingleSession)) {
                        break;
                    }
                    console.log('terminating...', sess.sid);
                    sess.terminate();
                    this.terminate(sess.sid);
                    if ($(iq).find('>jingle>reason').length) {
                       this.callTerminated($(iq).find('>jingle>reason>text').text());
                    } else {
                        this.callTerminated(null);
                    }
                    break;
                case 'transport-info':
                    sess.addIceCandidate($(iq).find('>jingle>content'));
                    break;
                case 'session-info':
                    var affected;
                    if ($(iq).find('>jingle>ringing[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').length) {
                        $(document).trigger('ringing.jingle', [sess.sid]);
                    } else if ($(iq).find('>jingle>mute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').length) {
                        affected = $(iq).find('>jingle>mute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').attr('name');
                        $(document).trigger('mute.jingle', [sess.sid, affected]);
                    } else if ($(iq).find('>jingle>unmute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').length) {
                        affected = $(iq).find('>jingle>unmute[xmlns="urn:xmpp:jingle:apps:rtp:info:1"]').attr('name');
                        $(document).trigger('unmute.jingle', [sess.sid, affected]);
                    }
                    break;
                case 'addsource': // FIXME: proprietary, un-jingleish
                case 'source-add': // FIXME: proprietary
                    sess.addSource($(iq).find('>jingle>content'), fromJid);
                    break;
                case 'removesource': // FIXME: proprietary, un-jingleish
                case 'source-remove': // FIXME: proprietary
                    sess.removeSource($(iq).find('>jingle>content'), fromJid);
                    break;
                default:
                    console.warn('jingle action not implemented', action);
                    break;
            }
            return true;
        },
        initiate: function (peerjid, myjid) { // initiate a new jinglesession to peerjid
            var sess = new JingleSession(myjid || this.connection.jid,
                Math.random().toString(36).substr(2, 12), // random string
                this.connection);
            // configure session
            if (this.localAudio) {
                sess.localStreams.push(this.localAudio);
            }
            if (this.localVideo) {
                sess.localStreams.push(this.localVideo);
            }
            sess.media_constraints = this.media_constraints;
            sess.pc_constraints = this.pc_constraints;
            sess.ice_config = this.ice_config;

            sess.initiate(peerjid, true);
            this.sessions[sess.sid] = sess;
            this.jid2session[sess.peerjid] = sess;
            sess.sendOffer();
            return sess;
        },
        terminate: function (sid, reason, text) { // terminate by sessionid (or all sessions)
            if (sid === null || sid === undefined) {
                for (sid in this.sessions) {
                    if (this.sessions[sid].state != 'ended') {
                        this.sessions[sid].sendTerminate(reason || (!this.sessions[sid].active()) ? 'cancel' : null, text);
                        this.sessions[sid].terminate();
                    }
                    delete this.jid2session[this.sessions[sid].peerjid];
                    delete this.sessions[sid];
                }
            } else if (this.sessions.hasOwnProperty(sid)) {
                if (this.sessions[sid].state != 'ended') {
                    this.sessions[sid].sendTerminate(reason || (!this.sessions[sid].active()) ? 'cancel' : null, text);
                    this.sessions[sid].terminate();
                }
                delete this.jid2session[this.sessions[sid].peerjid];
                delete this.sessions[sid];
            }
        },
        callTerminated: function (reason) {
            if (this.connection.emuc.joined && this.connection.emuc.focus == null && reason === 'kick') {
                this.connection.emuc.doLeave();
                messageHandler.openMessageDialog("Session Terminated",
                    "Ouch! You have been kicked out of the meet!");
            }
        },
        // Used to terminate a session when an unavailable presence is received.
        terminateByJid: function (jid) {
            if (this.jid2session.hasOwnProperty(jid)) {
                var sess = this.jid2session[jid];
                if (sess) {
                    sess.terminate();
                    console.log('peer went away silently', jid);
                    delete this.sessions[sess.sid];
                    delete this.jid2session[jid];
                    this.callTerminated( 'gone');
                }
            }
        },
        terminateRemoteByJid: function (jid, reason) {
            if (this.jid2session.hasOwnProperty(jid)) {
                var sess = this.jid2session[jid];
                if (sess) {
                    sess.sendTerminate(reason || (!sess.active()) ? 'kick' : null);
                    sess.terminate();
                    console.log('terminate peer with jid', sess.sid, jid);
                    delete this.sessions[sess.sid];
                    delete this.jid2session[jid];
                    this.callTerminated( 'kicked');
                }
            }
        },
        getStunAndTurnCredentials: function () {
            // get stun and turn configuration from server via xep-0215
            // uses time-limited credentials as described in
            // http://tools.ietf.org/html/draft-uberti-behave-turn-rest-00
            //
            // see https://code.google.com/p/prosody-modules/source/browse/mod_turncredentials/mod_turncredentials.lua
            // for a prosody module which implements this
            //
            // currently, this doesn't work with updateIce and therefore credentials with a long
            // validity have to be fetched before creating the peerconnection
            // TODO: implement refresh via updateIce as described in
            //      https://code.google.com/p/webrtc/issues/detail?id=1650
            var self = this;
            this.connection.sendIQ(
                $iq({type: 'get', to: this.connection.domain})
                    .c('services', {xmlns: 'urn:xmpp:extdisco:1'}).c('service', {host: 'turn.' + this.connection.domain}),
                function (res) {
                    var iceservers = [];
                    $(res).find('>services>service').each(function (idx, el) {
                        el = $(el);
                        var dict = {};
                        var type = el.attr('type');
                        switch (type) {
                            case 'stun':
                                dict.url = 'stun:' + el.attr('host');
                                if (el.attr('port')) {
                                    dict.url += ':' + el.attr('port');
                                }
                                iceservers.push(dict);
                                break;
                            case 'turn':
                            case 'turns':
                                dict.url = type + ':';
                                if (el.attr('username')) { // https://code.google.com/p/webrtc/issues/detail?id=1508
                                    if (navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./) && parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10) < 28) {
                                        dict.url += el.attr('username') + '@';
                                    } else {
                                        dict.username = el.attr('username'); // only works in M28
                                    }
                                }
                                dict.url += el.attr('host');
                                if (el.attr('port') && el.attr('port') != '3478') {
                                    dict.url += ':' + el.attr('port');
                                }
                                if (el.attr('transport') && el.attr('transport') != 'udp') {
                                    dict.url += '?transport=' + el.attr('transport');
                                }
                                if (el.attr('password')) {
                                    dict.credential = el.attr('password');
                                }
                                iceservers.push(dict);
                                break;
                        }
                    });
                    self.ice_config.iceServers = iceservers;
                },
                function (err) {
                    console.warn('getting turn credentials failed', err);
                    console.warn('is mod_turncredentials or similar installed?');
                }
            );
            // implement push?
        },
        getJingleData: function () {
            var data = {};
            var self = this;
            Object.keys(this.connection.jingle.sessions).forEach(function (sid) {
                var session = self.connection.jingle.sessions[sid];
                if (session.peerconnection && session.peerconnection.updateLog) {
                    // FIXME: should probably be a .dump call
                    data["jingle_" + session.sid] = {
                        updateLog: session.peerconnection.updateLog,
                        stats: session.peerconnection.stats,
                        url: window.location.href
                    };
                }
            });
            return data;
        }
    });
}
},{"../service/xmpp/XMPPEvents":2,"./strophe.jingle.session":14}],12:[function(require,module,exports){
/* jshint -W117 */

/**
 * Class holds a=ssrc lines and media type a=mid
 * @param ssrc synchronization source identifier number(a=ssrc lines from SDP)
 * @param type media type eg. "audio" or "video"(a=mid frm SDP)
 * @constructor
 */
function ChannelSsrc(ssrc, type) {
    this.ssrc = ssrc;
    this.type = type;
    this.lines = [];
}

/**
 * Class holds a=ssrc-group: lines
 * @param semantics
 * @param ssrcs
 * @constructor
 */
function ChannelSsrcGroup(semantics, ssrcs, line) {
    this.semantics = semantics;
    this.ssrcs = ssrcs;
}

/**
 * Helper class represents media channel. Is a container for ChannelSsrc, holds channel idx and media type.
 * @param channelNumber channel idx in SDP media array.
 * @param mediaType media type(a=mid)
 * @constructor
 */
function MediaChannel(channelNumber, mediaType) {
    /**
     * SDP channel number
     * @type {*}
     */
    this.chNumber = channelNumber;
    /**
     * Channel media type(a=mid)
     * @type {*}
     */
    this.mediaType = mediaType;
    /**
     * The maps of ssrc numbers to ChannelSsrc objects.
     */
    this.ssrcs = {};

    /**
     * The array of ChannelSsrcGroup objects.
     * @type {Array}
     */
    this.ssrcGroups = [];
}

// SDP STUFF
function SDP(sdp) {
    this.media = sdp.split('\r\nm=');
    for (var i = 1; i < this.media.length; i++) {
        this.media[i] = 'm=' + this.media[i];
        if (i != this.media.length - 1) {
            this.media[i] += '\r\n';
        }
    }
    this.session = this.media.shift() + '\r\n';
    this.raw = this.session + this.media.join('');
}
/**
 * Returns map of MediaChannel mapped per channel idx.
 */
SDP.prototype.getMediaSsrcMap = function() {
    var self = this;
    var media_ssrcs = {};
    for (channelNum = 0; channelNum < self.media.length; channelNum++) {
        modified = true;
        tmp = SDPUtil.find_lines(self.media[channelNum], 'a=ssrc:');
        var type = SDPUtil.parse_mid(SDPUtil.find_line(self.media[channelNum], 'a=mid:'));
        var channel = new MediaChannel(channelNum, type);
        media_ssrcs[channelNum] = channel;
        tmp.forEach(function (line) {
            var linessrc = line.substring(7).split(' ')[0];
            // allocate new ChannelSsrc
            if(!channel.ssrcs[linessrc]) {
                channel.ssrcs[linessrc] = new ChannelSsrc(linessrc, type);
            }
            channel.ssrcs[linessrc].lines.push(line);
        });
        tmp = SDPUtil.find_lines(self.media[channelNum], 'a=ssrc-group:');
        tmp.forEach(function(line){
            var semantics = line.substr(0, idx).substr(13);
            var ssrcs = line.substr(14 + semantics.length).split(' ');
            if (ssrcs.length != 0) {
                var ssrcGroup = new ChannelSsrcGroup(semantics, ssrcs);
                channel.ssrcGroups.push(ssrcGroup);
            }
        });
    }
    return media_ssrcs;
}
/**
 * Returns <tt>true</tt> if this SDP contains given SSRC.
 * @param ssrc the ssrc to check.
 * @returns {boolean} <tt>true</tt> if this SDP contains given SSRC.
 */
SDP.prototype.containsSSRC = function(ssrc) {
    var channels = this.getMediaSsrcMap();
    var contains = false;
    Object.keys(channels).forEach(function(chNumber){
        var channel = channels[chNumber];
        //console.log("Check", channel, ssrc);
        if(Object.keys(channel.ssrcs).indexOf(ssrc) != -1){
            contains = true;
        }
    });
    return contains;
}
/**
 * Returns map of MediaChannel that contains only media not contained in <tt>otherSdp</tt>. Mapped by channel idx.
 * @param otherSdp the other SDP to check ssrc with.
 */
SDP.prototype.getNewMedia = function(otherSdp) {

    // this could be useful in Array.prototype.
    function arrayEquals(array) {
        // if the other array is a falsy value, return
        if (!array)
            return false;

        // compare lengths - can save a lot of time
        if (this.length != array.length)
            return false;

        for (var i = 0, l=this.length; i < l; i++) {
            // Check if we have nested arrays
            if (this[i] instanceof Array && array[i] instanceof Array) {
                // recurse into the nested arrays
                if (!this[i].equals(array[i]))
                    return false;
            }
            else if (this[i] != array[i]) {
                // Warning - two different object instances will never be equal: {x:20} != {x:20}
                return false;
            }
        }
        return true;
    };

    var myMedia = this.getMediaSsrcMap();
    var othersMedia = otherSdp.getMediaSsrcMap();
    var newMedia = {};
    Object.keys(othersMedia).forEach(function(channelNum) {
        var myChannel = myMedia[channelNum];
        var othersChannel = othersMedia[channelNum];
        if(!myChannel && othersChannel) {
            // Add whole channel
            newMedia[channelNum] = othersChannel;
            return;
        }
        // Look for new ssrcs accross the channel
        Object.keys(othersChannel.ssrcs).forEach(function(ssrc) {
            if(Object.keys(myChannel.ssrcs).indexOf(ssrc) === -1) {
                // Allocate channel if we've found ssrc that doesn't exist in our channel
                if(!newMedia[channelNum]){
                    newMedia[channelNum] = new MediaChannel(othersChannel.chNumber, othersChannel.mediaType);
                }
                newMedia[channelNum].ssrcs[ssrc] = othersChannel.ssrcs[ssrc];
            }
        })

        // Look for new ssrc groups across the channels
        othersChannel.ssrcGroups.forEach(function(otherSsrcGroup){

            // try to match the other ssrc-group with an ssrc-group of ours
            var matched = false;
            for (var i = 0; i < myChannel.ssrcGroups.length; i++) {
                var mySsrcGroup = myChannel.ssrcGroups[i];
                if (otherSsrcGroup.semantics == mySsrcGroup
                    && arrayEquals.apply(otherSsrcGroup.ssrcs, [mySsrcGroup.ssrcs])) {

                    matched = true;
                    break;
                }
            }

            if (!matched) {
                // Allocate channel if we've found an ssrc-group that doesn't
                // exist in our channel

                if(!newMedia[channelNum]){
                    newMedia[channelNum] = new MediaChannel(othersChannel.chNumber, othersChannel.mediaType);
                }
                newMedia[channelNum].ssrcGroups.push(otherSsrcGroup);
            }
        });
    });
    return newMedia;
}
// remove iSAC and CN from SDP
SDP.prototype.mangle = function () {
    var i, j, mline, lines, rtpmap, newdesc;
    for (i = 0; i < this.media.length; i++) {
        lines = this.media[i].split('\r\n');
        lines.pop(); // remove empty last element
        mline = SDPUtil.parse_mline(lines.shift());
        if (mline.media != 'audio')
            continue;
        newdesc = '';
        mline.fmt.length = 0;
        for (j = 0; j < lines.length; j++) {
            if (lines[j].substr(0, 9) == 'a=rtpmap:') {
                rtpmap = SDPUtil.parse_rtpmap(lines[j]);
                if (rtpmap.name == 'CN' || rtpmap.name == 'ISAC')
                    continue;
                mline.fmt.push(rtpmap.id);
                newdesc += lines[j] + '\r\n';
            } else {
                newdesc += lines[j] + '\r\n';
            }
        }
        this.media[i] = SDPUtil.build_mline(mline) + '\r\n';
        this.media[i] += newdesc;
    }
    this.raw = this.session + this.media.join('');
};

// remove lines matching prefix from session section
SDP.prototype.removeSessionLines = function(prefix) {
    var self = this;
    var lines = SDPUtil.find_lines(this.session, prefix);
    lines.forEach(function(line) {
        self.session = self.session.replace(line + '\r\n', '');
    });
    this.raw = this.session + this.media.join('');
    return lines;
}
// remove lines matching prefix from a media section specified by mediaindex
// TODO: non-numeric mediaindex could match mid
SDP.prototype.removeMediaLines = function(mediaindex, prefix) {
    var self = this;
    var lines = SDPUtil.find_lines(this.media[mediaindex], prefix);
    lines.forEach(function(line) {
        self.media[mediaindex] = self.media[mediaindex].replace(line + '\r\n', '');
    });
    this.raw = this.session + this.media.join('');
    return lines;
}

// add content's to a jingle element
SDP.prototype.toJingle = function (elem, thecreator) {
    var i, j, k, mline, ssrc, rtpmap, tmp, line, lines;
    var self = this;
    // new bundle plan
    if (SDPUtil.find_line(this.session, 'a=group:')) {
        lines = SDPUtil.find_lines(this.session, 'a=group:');
        for (i = 0; i < lines.length; i++) {
            tmp = lines[i].split(' ');
            var semantics = tmp.shift().substr(8);
            elem.c('group', {xmlns: 'urn:xmpp:jingle:apps:grouping:0', semantics:semantics});
            for (j = 0; j < tmp.length; j++) {
                elem.c('content', {name: tmp[j]}).up();
            }
            elem.up();
        }
    }
    // old bundle plan, to be removed
    var bundle = [];
    if (SDPUtil.find_line(this.session, 'a=group:BUNDLE')) {
        bundle = SDPUtil.find_line(this.session, 'a=group:BUNDLE ').split(' ');
        bundle.shift();
    }
    for (i = 0; i < this.media.length; i++) {
        mline = SDPUtil.parse_mline(this.media[i].split('\r\n')[0]);
        if (!(mline.media === 'audio' ||
              mline.media === 'video' ||
              mline.media === 'application'))
        {
            continue;
        }
        if (SDPUtil.find_line(this.media[i], 'a=ssrc:')) {
            ssrc = SDPUtil.find_line(this.media[i], 'a=ssrc:').substring(7).split(' ')[0]; // take the first
        } else {
            ssrc = false;
        }

        elem.c('content', {creator: thecreator, name: mline.media});
        if (SDPUtil.find_line(this.media[i], 'a=mid:')) {
            // prefer identifier from a=mid if present
            var mid = SDPUtil.parse_mid(SDPUtil.find_line(this.media[i], 'a=mid:'));
            elem.attrs({ name: mid });

            // old BUNDLE plan, to be removed
            if (bundle.indexOf(mid) !== -1) {
                elem.c('bundle', {xmlns: 'http://estos.de/ns/bundle'}).up();
                bundle.splice(bundle.indexOf(mid), 1);
            }
        }

        if (SDPUtil.find_line(this.media[i], 'a=rtpmap:').length)
        {
            elem.c('description',
                {xmlns: 'urn:xmpp:jingle:apps:rtp:1',
                    media: mline.media });
            if (ssrc) {
                elem.attrs({ssrc: ssrc});
            }
            for (j = 0; j < mline.fmt.length; j++) {
                rtpmap = SDPUtil.find_line(this.media[i], 'a=rtpmap:' + mline.fmt[j]);
                elem.c('payload-type', SDPUtil.parse_rtpmap(rtpmap));
                // put any 'a=fmtp:' + mline.fmt[j] lines into <param name=foo value=bar/>
                if (SDPUtil.find_line(this.media[i], 'a=fmtp:' + mline.fmt[j])) {
                    tmp = SDPUtil.parse_fmtp(SDPUtil.find_line(this.media[i], 'a=fmtp:' + mline.fmt[j]));
                    for (k = 0; k < tmp.length; k++) {
                        elem.c('parameter', tmp[k]).up();
                    }
                }
                this.RtcpFbToJingle(i, elem, mline.fmt[j]); // XEP-0293 -- map a=rtcp-fb

                elem.up();
            }
            if (SDPUtil.find_line(this.media[i], 'a=crypto:', this.session)) {
                elem.c('encryption', {required: 1});
                var crypto = SDPUtil.find_lines(this.media[i], 'a=crypto:', this.session);
                crypto.forEach(function(line) {
                    elem.c('crypto', SDPUtil.parse_crypto(line)).up();
                });
                elem.up(); // end of encryption
            }

            if (ssrc) {
                // new style mapping
                elem.c('source', { ssrc: ssrc, xmlns: 'urn:xmpp:jingle:apps:rtp:ssma:0' });
                // FIXME: group by ssrc and support multiple different ssrcs
                var ssrclines = SDPUtil.find_lines(this.media[i], 'a=ssrc:');
                ssrclines.forEach(function(line) {
                    idx = line.indexOf(' ');
                    var linessrc = line.substr(0, idx).substr(7);
                    if (linessrc != ssrc) {
                        elem.up();
                        ssrc = linessrc;
                        elem.c('source', { ssrc: ssrc, xmlns: 'urn:xmpp:jingle:apps:rtp:ssma:0' });
                    }
                    var kv = line.substr(idx + 1);
                    elem.c('parameter');
                    if (kv.indexOf(':') == -1) {
                        elem.attrs({ name: kv });
                    } else {
                        elem.attrs({ name: kv.split(':', 2)[0] });
                        elem.attrs({ value: kv.split(':', 2)[1] });
                    }
                    elem.up();
                });
                elem.up();

                // old proprietary mapping, to be removed at some point
                tmp = SDPUtil.parse_ssrc(this.media[i]);
                tmp.xmlns = 'http://estos.de/ns/ssrc';
                tmp.ssrc = ssrc;
                elem.c('ssrc', tmp).up(); // ssrc is part of description

                // XEP-0339 handle ssrc-group attributes
                var ssrc_group_lines = SDPUtil.find_lines(this.media[i], 'a=ssrc-group:');
                ssrc_group_lines.forEach(function(line) {
                    idx = line.indexOf(' ');
                    var semantics = line.substr(0, idx).substr(13);
                    var ssrcs = line.substr(14 + semantics.length).split(' ');
                    if (ssrcs.length != 0) {
                        elem.c('ssrc-group', { semantics: semantics, xmlns: 'urn:xmpp:jingle:apps:rtp:ssma:0' });
                        ssrcs.forEach(function(ssrc) {
                            elem.c('source', { ssrc: ssrc })
                                .up();
                        });
                        elem.up();
                    }
                });
            }

            if (SDPUtil.find_line(this.media[i], 'a=rtcp-mux')) {
                elem.c('rtcp-mux').up();
            }

            // XEP-0293 -- map a=rtcp-fb:*
            this.RtcpFbToJingle(i, elem, '*');

            // XEP-0294
            if (SDPUtil.find_line(this.media[i], 'a=extmap:')) {
                lines = SDPUtil.find_lines(this.media[i], 'a=extmap:');
                for (j = 0; j < lines.length; j++) {
                    tmp = SDPUtil.parse_extmap(lines[j]);
                    elem.c('rtp-hdrext', { xmlns: 'urn:xmpp:jingle:apps:rtp:rtp-hdrext:0',
                        uri: tmp.uri,
                        id: tmp.value });
                    if (tmp.hasOwnProperty('direction')) {
                        switch (tmp.direction) {
                            case 'sendonly':
                                elem.attrs({senders: 'responder'});
                                break;
                            case 'recvonly':
                                elem.attrs({senders: 'initiator'});
                                break;
                            case 'sendrecv':
                                elem.attrs({senders: 'both'});
                                break;
                            case 'inactive':
                                elem.attrs({senders: 'none'});
                                break;
                        }
                    }
                    // TODO: handle params
                    elem.up();
                }
            }
            elem.up(); // end of description
        }

        // map ice-ufrag/pwd, dtls fingerprint, candidates
        this.TransportToJingle(i, elem);

        if (SDPUtil.find_line(this.media[i], 'a=sendrecv', this.session)) {
            elem.attrs({senders: 'both'});
        } else if (SDPUtil.find_line(this.media[i], 'a=sendonly', this.session)) {
            elem.attrs({senders: 'initiator'});
        } else if (SDPUtil.find_line(this.media[i], 'a=recvonly', this.session)) {
            elem.attrs({senders: 'responder'});
        } else if (SDPUtil.find_line(this.media[i], 'a=inactive', this.session)) {
            elem.attrs({senders: 'none'});
        }
        if (mline.port == '0') {
            // estos hack to reject an m-line
            elem.attrs({senders: 'rejected'});
        }
        elem.up(); // end of content
    }
    elem.up();
    return elem;
};

SDP.prototype.TransportToJingle = function (mediaindex, elem) {
    var i = mediaindex;
    var tmp;
    var self = this;
    elem.c('transport');

    // XEP-0343 DTLS/SCTP
    if (SDPUtil.find_line(this.media[mediaindex], 'a=sctpmap:').length)
    {
        var sctpmap = SDPUtil.find_line(
            this.media[i], 'a=sctpmap:', self.session);
        if (sctpmap)
        {
            var sctpAttrs = SDPUtil.parse_sctpmap(sctpmap);
            elem.c('sctpmap',
                {
                    xmlns: 'urn:xmpp:jingle:transports:dtls-sctp:1',
                    number: sctpAttrs[0], /* SCTP port */
                    protocol: sctpAttrs[1], /* protocol */
                });
            // Optional stream count attribute
            if (sctpAttrs.length > 2)
                elem.attrs({ streams: sctpAttrs[2]});
            elem.up();
        }
    }
    // XEP-0320
    var fingerprints = SDPUtil.find_lines(this.media[mediaindex], 'a=fingerprint:', this.session);
    fingerprints.forEach(function(line) {
        tmp = SDPUtil.parse_fingerprint(line);
        tmp.xmlns = 'urn:xmpp:jingle:apps:dtls:0';
        elem.c('fingerprint').t(tmp.fingerprint);
        delete tmp.fingerprint;
        line = SDPUtil.find_line(self.media[mediaindex], 'a=setup:', self.session);
        if (line) {
            tmp.setup = line.substr(8);
        }
        elem.attrs(tmp);
        elem.up(); // end of fingerprint
    });
    tmp = SDPUtil.iceparams(this.media[mediaindex], this.session);
    if (tmp) {
        tmp.xmlns = 'urn:xmpp:jingle:transports:ice-udp:1';
        elem.attrs(tmp);
        // XEP-0176
        if (SDPUtil.find_line(this.media[mediaindex], 'a=candidate:', this.session)) { // add any a=candidate lines
            var lines = SDPUtil.find_lines(this.media[mediaindex], 'a=candidate:', this.session);
            lines.forEach(function (line) {
                elem.c('candidate', SDPUtil.candidateToJingle(line)).up();
            });
        }
    }
    elem.up(); // end of transport
}

SDP.prototype.RtcpFbToJingle = function (mediaindex, elem, payloadtype) { // XEP-0293
    var lines = SDPUtil.find_lines(this.media[mediaindex], 'a=rtcp-fb:' + payloadtype);
    lines.forEach(function (line) {
        var tmp = SDPUtil.parse_rtcpfb(line);
        if (tmp.type == 'trr-int') {
            elem.c('rtcp-fb-trr-int', {xmlns: 'urn:xmpp:jingle:apps:rtp:rtcp-fb:0', value: tmp.params[0]});
            elem.up();
        } else {
            elem.c('rtcp-fb', {xmlns: 'urn:xmpp:jingle:apps:rtp:rtcp-fb:0', type: tmp.type});
            if (tmp.params.length > 0) {
                elem.attrs({'subtype': tmp.params[0]});
            }
            elem.up();
        }
    });
};

SDP.prototype.RtcpFbFromJingle = function (elem, payloadtype) { // XEP-0293
    var media = '';
    var tmp = elem.find('>rtcp-fb-trr-int[xmlns="urn:xmpp:jingle:apps:rtp:rtcp-fb:0"]');
    if (tmp.length) {
        media += 'a=rtcp-fb:' + '*' + ' ' + 'trr-int' + ' ';
        if (tmp.attr('value')) {
            media += tmp.attr('value');
        } else {
            media += '0';
        }
        media += '\r\n';
    }
    tmp = elem.find('>rtcp-fb[xmlns="urn:xmpp:jingle:apps:rtp:rtcp-fb:0"]');
    tmp.each(function () {
        media += 'a=rtcp-fb:' + payloadtype + ' ' + $(this).attr('type');
        if ($(this).attr('subtype')) {
            media += ' ' + $(this).attr('subtype');
        }
        media += '\r\n';
    });
    return media;
};

// construct an SDP from a jingle stanza
SDP.prototype.fromJingle = function (jingle) {
    var self = this;
    this.raw = 'v=0\r\n' +
        'o=- ' + '1923518516' + ' 2 IN IP4 0.0.0.0\r\n' +// FIXME
        's=-\r\n' +
        't=0 0\r\n';
    // http://tools.ietf.org/html/draft-ietf-mmusic-sdp-bundle-negotiation-04#section-8
    if ($(jingle).find('>group[xmlns="urn:xmpp:jingle:apps:grouping:0"]').length) {
        $(jingle).find('>group[xmlns="urn:xmpp:jingle:apps:grouping:0"]').each(function (idx, group) {
            var contents = $(group).find('>content').map(function (idx, content) {
                return content.getAttribute('name');
            }).get();
            if (contents.length > 0) {
                self.raw += 'a=group:' + (group.getAttribute('semantics') || group.getAttribute('type')) + ' ' + contents.join(' ') + '\r\n';
            }
        });
    } else if ($(jingle).find('>group[xmlns="urn:ietf:rfc:5888"]').length) {
        // temporary namespace, not to be used. to be removed soon.
        $(jingle).find('>group[xmlns="urn:ietf:rfc:5888"]').each(function (idx, group) {
            var contents = $(group).find('>content').map(function (idx, content) {
                return content.getAttribute('name');
            }).get();
            if (group.getAttribute('type') !== null && contents.length > 0) {
                self.raw += 'a=group:' + group.getAttribute('type') + ' ' + contents.join(' ') + '\r\n';
            }
        });
    } else {
        // for backward compability, to be removed soon
        // assume all contents are in the same bundle group, can be improved upon later
        var bundle = $(jingle).find('>content').filter(function (idx, content) {
            //elem.c('bundle', {xmlns:'http://estos.de/ns/bundle'});
            return $(content).find('>bundle').length > 0;
        }).map(function (idx, content) {
                return content.getAttribute('name');
            }).get();
        if (bundle.length) {
            this.raw += 'a=group:BUNDLE ' + bundle.join(' ') + '\r\n';
        }
    }

    this.session = this.raw;
    jingle.find('>content').each(function () {
        var m = self.jingle2media($(this));
        self.media.push(m);
    });

    // reconstruct msid-semantic -- apparently not necessary
    /*
     var msid = SDPUtil.parse_ssrc(this.raw);
     if (msid.hasOwnProperty('mslabel')) {
     this.session += "a=msid-semantic: WMS " + msid.mslabel + "\r\n";
     }
     */

    this.raw = this.session + this.media.join('');
};

// translate a jingle content element into an an SDP media part
SDP.prototype.jingle2media = function (content) {
    var media = '',
        desc = content.find('description'),
        ssrc = desc.attr('ssrc'),
        self = this,
        tmp;
    var sctp = content.find(
        '>transport>sctpmap[xmlns="urn:xmpp:jingle:transports:dtls-sctp:1"]');

    tmp = { media: desc.attr('media') };
    tmp.port = '1';
    if (content.attr('senders') == 'rejected') {
        // estos hack to reject an m-line.
        tmp.port = '0';
    }
    if (content.find('>transport>fingerprint').length || desc.find('encryption').length) {
        if (sctp.length)
            tmp.proto = 'DTLS/SCTP';
        else
            tmp.proto = 'RTP/SAVPF';
    } else {
        tmp.proto = 'RTP/AVPF';
    }
    if (!sctp.length)
    {
        tmp.fmt = desc.find('payload-type').map(
            function () { return this.getAttribute('id'); }).get();
        media += SDPUtil.build_mline(tmp) + '\r\n';
    }
    else
    {
        media += 'm=application 1 DTLS/SCTP ' + sctp.attr('number') + '\r\n';
        media += 'a=sctpmap:' + sctp.attr('number') +
            ' ' + sctp.attr('protocol');

        var streamCount = sctp.attr('streams');
        if (streamCount)
            media += ' ' + streamCount + '\r\n';
        else
            media += '\r\n';
    }

    media += 'c=IN IP4 0.0.0.0\r\n';
    if (!sctp.length)
        media += 'a=rtcp:1 IN IP4 0.0.0.0\r\n';
    tmp = content.find('>transport[xmlns="urn:xmpp:jingle:transports:ice-udp:1"]');
    if (tmp.length) {
        if (tmp.attr('ufrag')) {
            media += SDPUtil.build_iceufrag(tmp.attr('ufrag')) + '\r\n';
        }
        if (tmp.attr('pwd')) {
            media += SDPUtil.build_icepwd(tmp.attr('pwd')) + '\r\n';
        }
        tmp.find('>fingerprint').each(function () {
            // FIXME: check namespace at some point
            media += 'a=fingerprint:' + this.getAttribute('hash');
            media += ' ' + $(this).text();
            media += '\r\n';
            if (this.getAttribute('setup')) {
                media += 'a=setup:' + this.getAttribute('setup') + '\r\n';
            }
        });
    }
    switch (content.attr('senders')) {
        case 'initiator':
            media += 'a=sendonly\r\n';
            break;
        case 'responder':
            media += 'a=recvonly\r\n';
            break;
        case 'none':
            media += 'a=inactive\r\n';
            break;
        case 'both':
            media += 'a=sendrecv\r\n';
            break;
    }
    media += 'a=mid:' + content.attr('name') + '\r\n';

    // <description><rtcp-mux/></description>
    // see http://code.google.com/p/libjingle/issues/detail?id=309 -- no spec though
    // and http://mail.jabber.org/pipermail/jingle/2011-December/001761.html
    if (desc.find('rtcp-mux').length) {
        media += 'a=rtcp-mux\r\n';
    }

    if (desc.find('encryption').length) {
        desc.find('encryption>crypto').each(function () {
            media += 'a=crypto:' + this.getAttribute('tag');
            media += ' ' + this.getAttribute('crypto-suite');
            media += ' ' + this.getAttribute('key-params');
            if (this.getAttribute('session-params')) {
                media += ' ' + this.getAttribute('session-params');
            }
            media += '\r\n';
        });
    }
    desc.find('payload-type').each(function () {
        media += SDPUtil.build_rtpmap(this) + '\r\n';
        if ($(this).find('>parameter').length) {
            media += 'a=fmtp:' + this.getAttribute('id') + ' ';
            media += $(this).find('parameter').map(function () { return (this.getAttribute('name') ? (this.getAttribute('name') + '=') : '') + this.getAttribute('value'); }).get().join(';');
            media += '\r\n';
        }
        // xep-0293
        media += self.RtcpFbFromJingle($(this), this.getAttribute('id'));
    });

    // xep-0293
    media += self.RtcpFbFromJingle(desc, '*');

    // xep-0294
    tmp = desc.find('>rtp-hdrext[xmlns="urn:xmpp:jingle:apps:rtp:rtp-hdrext:0"]');
    tmp.each(function () {
        media += 'a=extmap:' + this.getAttribute('id') + ' ' + this.getAttribute('uri') + '\r\n';
    });

    content.find('>transport[xmlns="urn:xmpp:jingle:transports:ice-udp:1"]>candidate').each(function () {
        media += SDPUtil.candidateFromJingle(this);
    });

    // XEP-0339 handle ssrc-group attributes
    tmp = content.find('description>ssrc-group[xmlns="urn:xmpp:jingle:apps:rtp:ssma:0"]').each(function() {
        var semantics = this.getAttribute('semantics');
        var ssrcs = $(this).find('>source').map(function() {
            return this.getAttribute('ssrc');
        }).get();

        if (ssrcs.length != 0) {
            media += 'a=ssrc-group:' + semantics + ' ' + ssrcs.join(' ') + '\r\n';
        }
    });

    tmp = content.find('description>source[xmlns="urn:xmpp:jingle:apps:rtp:ssma:0"]');
    tmp.each(function () {
        var ssrc = this.getAttribute('ssrc');
        $(this).find('>parameter').each(function () {
            media += 'a=ssrc:' + ssrc + ' ' + this.getAttribute('name');
            if (this.getAttribute('value') && this.getAttribute('value').length)
                media += ':' + this.getAttribute('value');
            media += '\r\n';
        });
    });

    if (tmp.length === 0) {
        // fallback to proprietary mapping of a=ssrc lines
        tmp = content.find('description>ssrc[xmlns="http://estos.de/ns/ssrc"]');
        if (tmp.length) {
            media += 'a=ssrc:' + ssrc + ' cname:' + tmp.attr('cname') + '\r\n';
            media += 'a=ssrc:' + ssrc + ' msid:' + tmp.attr('msid') + '\r\n';
            media += 'a=ssrc:' + ssrc + ' mslabel:' + tmp.attr('mslabel') + '\r\n';
            media += 'a=ssrc:' + ssrc + ' label:' + tmp.attr('label') + '\r\n';
        }
    }
    return media;
};

module.exports = SDP;

},{}],13:[function(require,module,exports){
/**
 * Contains utility classes used in SDP class.
 *
 */

SDPUtil = {
    iceparams: function (mediadesc, sessiondesc) {
        var data = null;
        if (SDPUtil.find_line(mediadesc, 'a=ice-ufrag:', sessiondesc) &&
            SDPUtil.find_line(mediadesc, 'a=ice-pwd:', sessiondesc)) {
            data = {
                ufrag: SDPUtil.parse_iceufrag(SDPUtil.find_line(mediadesc, 'a=ice-ufrag:', sessiondesc)),
                pwd: SDPUtil.parse_icepwd(SDPUtil.find_line(mediadesc, 'a=ice-pwd:', sessiondesc))
            };
        }
        return data;
    },
    parse_iceufrag: function (line) {
        return line.substring(12);
    },
    build_iceufrag: function (frag) {
        return 'a=ice-ufrag:' + frag;
    },
    parse_icepwd: function (line) {
        return line.substring(10);
    },
    build_icepwd: function (pwd) {
        return 'a=ice-pwd:' + pwd;
    },
    parse_mid: function (line) {
        return line.substring(6);
    },
    parse_mline: function (line) {
        var parts = line.substring(2).split(' '),
            data = {};
        data.media = parts.shift();
        data.port = parts.shift();
        data.proto = parts.shift();
        if (parts[parts.length - 1] === '') { // trailing whitespace
            parts.pop();
        }
        data.fmt = parts;
        return data;
    },
    build_mline: function (mline) {
        return 'm=' + mline.media + ' ' + mline.port + ' ' + mline.proto + ' ' + mline.fmt.join(' ');
    },
    parse_rtpmap: function (line) {
        var parts = line.substring(9).split(' '),
            data = {};
        data.id = parts.shift();
        parts = parts[0].split('/');
        data.name = parts.shift();
        data.clockrate = parts.shift();
        data.channels = parts.length ? parts.shift() : '1';
        return data;
    },
    /**
     * Parses SDP line "a=sctpmap:..." and extracts SCTP port from it.
     * @param line eg. "a=sctpmap:5000 webrtc-datachannel"
     * @returns [SCTP port number, protocol, streams]
     */
    parse_sctpmap: function (line)
    {
        var parts = line.substring(10).split(' ');
        var sctpPort = parts[0];
        var protocol = parts[1];
        // Stream count is optional
        var streamCount = parts.length > 2 ? parts[2] : null;
        return [sctpPort, protocol, streamCount];// SCTP port
    },
    build_rtpmap: function (el) {
        var line = 'a=rtpmap:' + el.getAttribute('id') + ' ' + el.getAttribute('name') + '/' + el.getAttribute('clockrate');
        if (el.getAttribute('channels') && el.getAttribute('channels') != '1') {
            line += '/' + el.getAttribute('channels');
        }
        return line;
    },
    parse_crypto: function (line) {
        var parts = line.substring(9).split(' '),
            data = {};
        data.tag = parts.shift();
        data['crypto-suite'] = parts.shift();
        data['key-params'] = parts.shift();
        if (parts.length) {
            data['session-params'] = parts.join(' ');
        }
        return data;
    },
    parse_fingerprint: function (line) { // RFC 4572
        var parts = line.substring(14).split(' '),
            data = {};
        data.hash = parts.shift();
        data.fingerprint = parts.shift();
        // TODO assert that fingerprint satisfies 2UHEX *(":" 2UHEX) ?
        return data;
    },
    parse_fmtp: function (line) {
        var parts = line.split(' '),
            i, key, value,
            data = [];
        parts.shift();
        parts = parts.join(' ').split(';');
        for (i = 0; i < parts.length; i++) {
            key = parts[i].split('=')[0];
            while (key.length && key[0] == ' ') {
                key = key.substring(1);
            }
            value = parts[i].split('=')[1];
            if (key && value) {
                data.push({name: key, value: value});
            } else if (key) {
                // rfc 4733 (DTMF) style stuff
                data.push({name: '', value: key});
            }
        }
        return data;
    },
    parse_icecandidate: function (line) {
        var candidate = {},
            elems = line.split(' ');
        candidate.foundation = elems[0].substring(12);
        candidate.component = elems[1];
        candidate.protocol = elems[2].toLowerCase();
        candidate.priority = elems[3];
        candidate.ip = elems[4];
        candidate.port = elems[5];
        // elems[6] => "typ"
        candidate.type = elems[7];
        candidate.generation = 0; // default value, may be overwritten below
        for (var i = 8; i < elems.length; i += 2) {
            switch (elems[i]) {
                case 'raddr':
                    candidate['rel-addr'] = elems[i + 1];
                    break;
                case 'rport':
                    candidate['rel-port'] = elems[i + 1];
                    break;
                case 'generation':
                    candidate.generation = elems[i + 1];
                    break;
                case 'tcptype':
                    candidate.tcptype = elems[i + 1];
                    break;
                default: // TODO
                    console.log('parse_icecandidate not translating "' + elems[i] + '" = "' + elems[i + 1] + '"');
            }
        }
        candidate.network = '1';
        candidate.id = Math.random().toString(36).substr(2, 10); // not applicable to SDP -- FIXME: should be unique, not just random
        return candidate;
    },
    build_icecandidate: function (cand) {
        var line = ['a=candidate:' + cand.foundation, cand.component, cand.protocol, cand.priority, cand.ip, cand.port, 'typ', cand.type].join(' ');
        line += ' ';
        switch (cand.type) {
            case 'srflx':
            case 'prflx':
            case 'relay':
                if (cand.hasOwnAttribute('rel-addr') && cand.hasOwnAttribute('rel-port')) {
                    line += 'raddr';
                    line += ' ';
                    line += cand['rel-addr'];
                    line += ' ';
                    line += 'rport';
                    line += ' ';
                    line += cand['rel-port'];
                    line += ' ';
                }
                break;
        }
        if (cand.hasOwnAttribute('tcptype')) {
            line += 'tcptype';
            line += ' ';
            line += cand.tcptype;
            line += ' ';
        }
        line += 'generation';
        line += ' ';
        line += cand.hasOwnAttribute('generation') ? cand.generation : '0';
        return line;
    },
    parse_ssrc: function (desc) {
        // proprietary mapping of a=ssrc lines
        // TODO: see "Jingle RTP Source Description" by Juberti and P. Thatcher on google docs
        // and parse according to that
        var lines = desc.split('\r\n'),
            data = {};
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].substring(0, 7) == 'a=ssrc:') {
                var idx = lines[i].indexOf(' ');
                data[lines[i].substr(idx + 1).split(':', 2)[0]] = lines[i].substr(idx + 1).split(':', 2)[1];
            }
        }
        return data;
    },
    parse_rtcpfb: function (line) {
        var parts = line.substr(10).split(' ');
        var data = {};
        data.pt = parts.shift();
        data.type = parts.shift();
        data.params = parts;
        return data;
    },
    parse_extmap: function (line) {
        var parts = line.substr(9).split(' ');
        var data = {};
        data.value = parts.shift();
        if (data.value.indexOf('/') != -1) {
            data.direction = data.value.substr(data.value.indexOf('/') + 1);
            data.value = data.value.substr(0, data.value.indexOf('/'));
        } else {
            data.direction = 'both';
        }
        data.uri = parts.shift();
        data.params = parts;
        return data;
    },
    find_line: function (haystack, needle, sessionpart) {
        var lines = haystack.split('\r\n');
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].substring(0, needle.length) == needle) {
                return lines[i];
            }
        }
        if (!sessionpart) {
            return false;
        }
        // search session part
        lines = sessionpart.split('\r\n');
        for (var j = 0; j < lines.length; j++) {
            if (lines[j].substring(0, needle.length) == needle) {
                return lines[j];
            }
        }
        return false;
    },
    find_lines: function (haystack, needle, sessionpart) {
        var lines = haystack.split('\r\n'),
            needles = [];
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].substring(0, needle.length) == needle)
                needles.push(lines[i]);
        }
        if (needles.length || !sessionpart) {
            return needles;
        }
        // search session part
        lines = sessionpart.split('\r\n');
        for (var j = 0; j < lines.length; j++) {
            if (lines[j].substring(0, needle.length) == needle) {
                needles.push(lines[j]);
            }
        }
        return needles;
    },
    candidateToJingle: function (line) {
        // a=candidate:2979166662 1 udp 2113937151 192.168.2.100 57698 typ host generation 0
        //      <candidate component=... foundation=... generation=... id=... ip=... network=... port=... priority=... protocol=... type=.../>
        if (line.indexOf('candidate:') === 0) {
            line = 'a=' + line;
        } else if (line.substring(0, 12) != 'a=candidate:') {
            console.log('parseCandidate called with a line that is not a candidate line');
            console.log(line);
            return null;
        }
        if (line.substring(line.length - 2) == '\r\n') // chomp it
            line = line.substring(0, line.length - 2);
        var candidate = {},
            elems = line.split(' '),
            i;
        if (elems[6] != 'typ') {
            console.log('did not find typ in the right place');
            console.log(line);
            return null;
        }
        candidate.foundation = elems[0].substring(12);
        candidate.component = elems[1];
        candidate.protocol = elems[2].toLowerCase();
        candidate.priority = elems[3];
        candidate.ip = elems[4];
        candidate.port = elems[5];
        // elems[6] => "typ"
        candidate.type = elems[7];

        candidate.generation = '0'; // default, may be overwritten below
        for (i = 8; i < elems.length; i += 2) {
            switch (elems[i]) {
                case 'raddr':
                    candidate['rel-addr'] = elems[i + 1];
                    break;
                case 'rport':
                    candidate['rel-port'] = elems[i + 1];
                    break;
                case 'generation':
                    candidate.generation = elems[i + 1];
                    break;
                case 'tcptype':
                    candidate.tcptype = elems[i + 1];
                    break;
                default: // TODO
                    console.log('not translating "' + elems[i] + '" = "' + elems[i + 1] + '"');
            }
        }
        candidate.network = '1';
        candidate.id = Math.random().toString(36).substr(2, 10); // not applicable to SDP -- FIXME: should be unique, not just random
        return candidate;
    },
    candidateFromJingle: function (cand) {
        var line = 'a=candidate:';
        line += cand.getAttribute('foundation');
        line += ' ';
        line += cand.getAttribute('component');
        line += ' ';
        line += cand.getAttribute('protocol'); //.toUpperCase(); // chrome M23 doesn't like this
        line += ' ';
        line += cand.getAttribute('priority');
        line += ' ';
        line += cand.getAttribute('ip');
        line += ' ';
        line += cand.getAttribute('port');
        line += ' ';
        line += 'typ';
        line += ' ' + cand.getAttribute('type');
        line += ' ';
        switch (cand.getAttribute('type')) {
            case 'srflx':
            case 'prflx':
            case 'relay':
                if (cand.getAttribute('rel-addr') && cand.getAttribute('rel-port')) {
                    line += 'raddr';
                    line += ' ';
                    line += cand.getAttribute('rel-addr');
                    line += ' ';
                    line += 'rport';
                    line += ' ';
                    line += cand.getAttribute('rel-port');
                    line += ' ';
                }
                break;
        }
        line += 'generation';
        line += ' ';
        line += cand.getAttribute('generation') || '0';
        return line + '\r\n';
    }
};

module.exports = SDPUtil;


},{}],14:[function(require,module,exports){
/* jshint -W117 */
// Jingle stuff
var SessionBase = require("./strophe.jingle.sessionbase");
var TraceablePeerConnection = require("./strophe.jingle.adapter");
var SDP = require("./strophe.jingle.sdp");

JingleSession.prototype = Object.create(SessionBase.prototype);
function JingleSession(me, sid, connection) {

    SessionBase.call(this, connection, sid);

    this.me = me;
    this.initiator = null;
    this.responder = null;
    this.isInitiator = null;
    this.peerjid = null;
    this.state = null;
    this.localSDP = null;
    this.remoteSDP = null;
    this.localStreams = [];
    this.relayedStreams = [];
    this.remoteStreams = [];
    this.startTime = null;
    this.stopTime = null;
    this.media_constraints = null;
    this.pc_constraints = null;
    this.ice_config = {};
    this.drip_container = [];

    this.usetrickle = true;
    this.usepranswer = false; // early transport warmup -- mind you, this might fail. depends on webrtc issue 1718
    this.usedrip = false; // dripping is sending trickle candidates not one-by-one

    this.hadstuncandidate = false;
    this.hadturncandidate = false;
    this.lasticecandidate = false;

    this.statsinterval = null;

    this.reason = null;

    this.wait = true;
}

JingleSession.prototype.initiate = function (peerjid, isInitiator) {
    var self = this;
    if (this.state !== null) {
        console.error('attempt to initiate on session ' + this.sid +
            'in state ' + this.state);
        return;
    }
    this.isInitiator = isInitiator;
    this.state = 'pending';
    this.initiator = isInitiator ? this.me : peerjid;
    this.responder = !isInitiator ? this.me : peerjid;
    this.peerjid = peerjid;
    this.hadstuncandidate = false;
    this.hadturncandidate = false;
    this.lasticecandidate = false;

    this.peerconnection
        = new TraceablePeerConnection(
            this.connection.jingle.ice_config,
            this.connection.jingle.pc_constraints );

    this.peerconnection.onicecandidate = function (event) {
        self.sendIceCandidate(event.candidate);
    };
    this.peerconnection.onaddstream = function (event) {
        self.remoteStreams.push(event.stream);
//        $(document).trigger('remotestreamadded.jingle', [event, self.sid]);
        self.waitForPresence(event, self.sid);
    };
    this.peerconnection.onremovestream = function (event) {
        // Remove the stream from remoteStreams
        var streamIdx = self.remoteStreams.indexOf(event.stream);
        if(streamIdx !== -1){
            self.remoteStreams.splice(streamIdx, 1);
        }
        // FIXME: remotestreamremoved.jingle not defined anywhere(unused)
        $(document).trigger('remotestreamremoved.jingle', [event, self.sid]);
    };
    this.peerconnection.onsignalingstatechange = function (event) {
        if (!(self && self.peerconnection)) return;
    };
    this.peerconnection.oniceconnectionstatechange = function (event) {
        if (!(self && self.peerconnection)) return;
        switch (self.peerconnection.iceConnectionState) {
            case 'connected':
                this.startTime = new Date();
                break;
            case 'disconnected':
                this.stopTime = new Date();
                break;
        }
        self.onIceConnectionStateChange(self.sid, self);
    };
    // add any local and relayed stream
    this.localStreams.forEach(function(stream) {
        self.peerconnection.addStream(stream);
    });
    this.relayedStreams.forEach(function(stream) {
        self.peerconnection.addStream(stream);
    });
};

JingleSession.prototype.accept = function () {
    var self = this;
    this.state = 'active';

    var pranswer = this.peerconnection.localDescription;
    if (!pranswer || pranswer.type != 'pranswer') {
        return;
    }
    console.log('going from pranswer to answer');
    if (this.usetrickle) {
        // remove candidates already sent from session-accept
        var lines = SDPUtil.find_lines(pranswer.sdp, 'a=candidate:');
        for (var i = 0; i < lines.length; i++) {
            pranswer.sdp = pranswer.sdp.replace(lines[i] + '\r\n', '');
        }
    }
    while (SDPUtil.find_line(pranswer.sdp, 'a=inactive')) {
        // FIXME: change any inactive to sendrecv or whatever they were originally
        pranswer.sdp = pranswer.sdp.replace('a=inactive', 'a=sendrecv');
    }
    var simulcast = new Simulcast();
    pranswer = simulcast.reverseTransformLocalDescription(pranswer);
    var prsdp = new SDP(pranswer.sdp);
    var accept = $iq({to: this.peerjid,
        type: 'set'})
        .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
            action: 'session-accept',
            initiator: this.initiator,
            responder: this.responder,
            sid: this.sid });
    prsdp.toJingle(accept, this.initiator == this.me ? 'initiator' : 'responder');
    this.connection.sendIQ(accept,
        function () {
            var ack = {};
            ack.source = 'answer';
            $(document).trigger('ack.jingle', [self.sid, ack]);
        },
        function (stanza) {
            var error = ($(stanza).find('error').length) ? {
                code: $(stanza).find('error').attr('code'),
                reason: $(stanza).find('error :first')[0].tagName,
            }:{};
            error.source = 'answer';
            $(document).trigger('error.jingle', [self.sid, error]);
        },
        10000);

    var sdp = this.peerconnection.localDescription.sdp;
    while (SDPUtil.find_line(sdp, 'a=inactive')) {
        // FIXME: change any inactive to sendrecv or whatever they were originally
        sdp = sdp.replace('a=inactive', 'a=sendrecv');
    }
    this.peerconnection.setLocalDescription(new RTCSessionDescription({type: 'answer', sdp: sdp}),
        function () {
            //console.log('setLocalDescription success');
            self.setLocalDescription(self.sid);
        },
        function (e) {
            console.error('setLocalDescription failed', e);
        }
    );
};

/**
 * Implements SessionBase.sendSSRCUpdate.
 */
JingleSession.prototype.sendSSRCUpdate = function(sdpMediaSsrcs, fromJid, isadd) {

    var self = this;
    console.log('tell', self.peerjid, 'about ' + (isadd ? 'new' : 'removed') + ' ssrcs from' + self.me);

    if (!(this.peerconnection.signalingState == 'stable' && this.peerconnection.iceConnectionState == 'connected')){
        console.log("Too early to send updates");
        return;
    }

    this.sendSSRCUpdateIq(sdpMediaSsrcs, self.sid, self.initiator, self.peerjid, isadd);
};

JingleSession.prototype.terminate = function (reason) {
    this.state = 'ended';
    this.reason = reason;
    this.peerconnection.close();
    if (this.statsinterval !== null) {
        window.clearInterval(this.statsinterval);
        this.statsinterval = null;
    }
};

JingleSession.prototype.active = function () {
    return this.state == 'active';
};

JingleSession.prototype.sendIceCandidate = function (candidate) {
    var self = this;
    if (candidate && !this.lasticecandidate) {
        var ice = SDPUtil.iceparams(this.localSDP.media[candidate.sdpMLineIndex], this.localSDP.session);
        var jcand = SDPUtil.candidateToJingle(candidate.candidate);
        if (!(ice && jcand)) {
            console.error('failed to get ice && jcand');
            return;
        }
        ice.xmlns = 'urn:xmpp:jingle:transports:ice-udp:1';

        if (jcand.type === 'srflx') {
            this.hadstuncandidate = true;
        } else if (jcand.type === 'relay') {
            this.hadturncandidate = true;
        }

        if (this.usetrickle) {
            if (this.usedrip) {
                if (this.drip_container.length === 0) {
                    // start 20ms callout
                    window.setTimeout(function () {
                        if (self.drip_container.length === 0) return;
                        self.sendIceCandidates(self.drip_container);
                        self.drip_container = [];
                    }, 20);

                }
                this.drip_container.push(event.candidate);
                return;
            } else {
                self.sendIceCandidate([event.candidate]);
            }
        }
    } else {
        //console.log('sendIceCandidate: last candidate.');
        if (!this.usetrickle) {
            //console.log('should send full offer now...');
            var init = $iq({to: this.peerjid,
                type: 'set'})
                .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
                    action: this.peerconnection.localDescription.type == 'offer' ? 'session-initiate' : 'session-accept',
                    initiator: this.initiator,
                    sid: this.sid});
            this.localSDP = new SDP(this.peerconnection.localDescription.sdp);
            this.localSDP.toJingle(init, this.initiator == this.me ? 'initiator' : 'responder');
            this.connection.sendIQ(init,
                function () {
                    //console.log('session initiate ack');
                    var ack = {};
                    ack.source = 'offer';
                    $(document).trigger('ack.jingle', [self.sid, ack]);
                },
                function (stanza) {
                    self.state = 'error';
                    self.peerconnection.close();
                    var error = ($(stanza).find('error').length) ? {
                        code: $(stanza).find('error').attr('code'),
                        reason: $(stanza).find('error :first')[0].tagName,
                    }:{};
                    error.source = 'offer';
                    $(document).trigger('error.jingle', [self.sid, error]);
                },
                10000);
        }
        this.lasticecandidate = true;
        console.log('Have we encountered any srflx candidates? ' + this.hadstuncandidate);
        console.log('Have we encountered any relay candidates? ' + this.hadturncandidate);

        if (!(this.hadstuncandidate || this.hadturncandidate) && this.peerconnection.signalingState != 'closed') {
            $(document).trigger('nostuncandidates.jingle', [this.sid]);
        }
    }
};

JingleSession.prototype.sendIceCandidates = function (candidates) {
    console.log('sendIceCandidates', candidates);
    var cand = $iq({to: this.peerjid, type: 'set'})
        .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
            action: 'transport-info',
            initiator: this.initiator,
            sid: this.sid});
    for (var mid = 0; mid < this.localSDP.media.length; mid++) {
        var cands = candidates.filter(function (el) { return el.sdpMLineIndex == mid; });
        if (cands.length > 0) {
            var ice = SDPUtil.iceparams(this.localSDP.media[mid], this.localSDP.session);
            ice.xmlns = 'urn:xmpp:jingle:transports:ice-udp:1';
            cand.c('content', {creator: this.initiator == this.me ? 'initiator' : 'responder',
                name: cands[0].sdpMid
            }).c('transport', ice);
            for (var i = 0; i < cands.length; i++) {
                cand.c('candidate', SDPUtil.candidateToJingle(cands[i].candidate)).up();
            }
            // add fingerprint
            if (SDPUtil.find_line(this.localSDP.media[mid], 'a=fingerprint:', this.localSDP.session)) {
                var tmp = SDPUtil.parse_fingerprint(SDPUtil.find_line(this.localSDP.media[mid], 'a=fingerprint:', this.localSDP.session));
                tmp.required = true;
                cand.c(
                    'fingerprint',
                    {xmlns: 'urn:xmpp:jingle:apps:dtls:0'})
                    .t(tmp.fingerprint);
                delete tmp.fingerprint;
                cand.attrs(tmp);
                cand.up();
            }
            cand.up(); // transport
            cand.up(); // content
        }
    }
    // might merge last-candidate notification into this, but it is called alot later. See webrtc issue #2340
    //console.log('was this the last candidate', this.lasticecandidate);
    this.connection.sendIQ(cand,
        function () {
            var ack = {};
            ack.source = 'transportinfo';
            $(document).trigger('ack.jingle', [this.sid, ack]);
        },
        function (stanza) {
            var error = ($(stanza).find('error').length) ? {
                code: $(stanza).find('error').attr('code'),
                reason: $(stanza).find('error :first')[0].tagName,
            }:{};
            error.source = 'transportinfo';
            $(document).trigger('error.jingle', [this.sid, error]);
        },
        10000);
};


JingleSession.prototype.sendOffer = function () {
    //console.log('sendOffer...');
    var self = this;
    this.peerconnection.createOffer(function (sdp) {
            self.createdOffer(sdp);
        },
        function (e) {
            console.error('createOffer failed', e);
        },
        this.media_constraints
    );
};

JingleSession.prototype.createdOffer = function (sdp) {
    //console.log('createdOffer', sdp);
    var self = this;
    this.localSDP = new SDP(sdp.sdp);
    //this.localSDP.mangle();
    if (this.usetrickle) {
        var init = $iq({to: this.peerjid,
            type: 'set'})
            .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
                action: 'session-initiate',
                initiator: this.initiator,
                sid: this.sid});
        this.localSDP.toJingle(init, this.initiator == this.me ? 'initiator' : 'responder');
        this.connection.sendIQ(init,
            function () {
                var ack = {};
                ack.source = 'offer';
                $(document).trigger('ack.jingle', [self.sid, ack]);
            },
            function (stanza) {
                self.state = 'error';
                self.peerconnection.close();
                var error = ($(stanza).find('error').length) ? {
                    code: $(stanza).find('error').attr('code'),
                    reason: $(stanza).find('error :first')[0].tagName,
                }:{};
                error.source = 'offer';
                $(document).trigger('error.jingle', [self.sid, error]);
            },
            10000);
    }
    sdp.sdp = this.localSDP.raw;
    this.peerconnection.setLocalDescription(sdp,
        function () {
            self.setLocalDescription(self.sid);
            //console.log('setLocalDescription success');
        },
        function (e) {
            console.error('setLocalDescription failed', e);
        }
    );
    var cands = SDPUtil.find_lines(this.localSDP.raw, 'a=candidate:');
    for (var i = 0; i < cands.length; i++) {
        var cand = SDPUtil.parse_icecandidate(cands[i]);
        if (cand.type == 'srflx') {
            this.hadstuncandidate = true;
        } else if (cand.type == 'relay') {
            this.hadturncandidate = true;
        }
    }
};

JingleSession.prototype.setRemoteDescription = function (elem, desctype) {
    //console.log('setting remote description... ', desctype);
    this.remoteSDP = new SDP('');
    this.remoteSDP.fromJingle(elem);
    if (this.peerconnection.remoteDescription !== null) {
        console.log('setRemoteDescription when remote description is not null, should be pranswer', this.peerconnection.remoteDescription);
        if (this.peerconnection.remoteDescription.type == 'pranswer') {
            var pranswer = new SDP(this.peerconnection.remoteDescription.sdp);
            for (var i = 0; i < pranswer.media.length; i++) {
                // make sure we have ice ufrag and pwd
                if (!SDPUtil.find_line(this.remoteSDP.media[i], 'a=ice-ufrag:', this.remoteSDP.session)) {
                    if (SDPUtil.find_line(pranswer.media[i], 'a=ice-ufrag:', pranswer.session)) {
                        this.remoteSDP.media[i] += SDPUtil.find_line(pranswer.media[i], 'a=ice-ufrag:', pranswer.session) + '\r\n';
                    } else {
                        console.warn('no ice ufrag?');
                    }
                    if (SDPUtil.find_line(pranswer.media[i], 'a=ice-pwd:', pranswer.session)) {
                        this.remoteSDP.media[i] += SDPUtil.find_line(pranswer.media[i], 'a=ice-pwd:', pranswer.session) + '\r\n';
                    } else {
                        console.warn('no ice pwd?');
                    }
                }
                // copy over candidates
                var lines = SDPUtil.find_lines(pranswer.media[i], 'a=candidate:');
                for (var j = 0; j < lines.length; j++) {
                    this.remoteSDP.media[i] += lines[j] + '\r\n';
                }
            }
            this.remoteSDP.raw = this.remoteSDP.session + this.remoteSDP.media.join('');
        }
    }
    var remotedesc = new RTCSessionDescription({type: desctype, sdp: this.remoteSDP.raw});

    this.peerconnection.setRemoteDescription(remotedesc,
        function () {
            //console.log('setRemoteDescription success');
        },
        function (e) {
            console.error('setRemoteDescription error', e);
            messageHandler.showError(  "Sorry",
                "Your browser version is too old. Please update and try again...");
            this.connection.emuc.doLeave();
        }
    );
};

JingleSession.prototype.addIceCandidate = function (elem) {
    var self = this;
    if (this.peerconnection.signalingState == 'closed') {
        return;
    }
    if (!this.peerconnection.remoteDescription && this.peerconnection.signalingState == 'have-local-offer') {
        console.log('trickle ice candidate arriving before session accept...');
        // create a PRANSWER for setRemoteDescription
        if (!this.remoteSDP) {
            var cobbled = 'v=0\r\n' +
                'o=- ' + '1923518516' + ' 2 IN IP4 0.0.0.0\r\n' +// FIXME
                's=-\r\n' +
                't=0 0\r\n';
            // first, take some things from the local description
            for (var i = 0; i < this.localSDP.media.length; i++) {
                cobbled += SDPUtil.find_line(this.localSDP.media[i], 'm=') + '\r\n';
                cobbled += SDPUtil.find_lines(this.localSDP.media[i], 'a=rtpmap:').join('\r\n') + '\r\n';
                if (SDPUtil.find_line(this.localSDP.media[i], 'a=mid:')) {
                    cobbled += SDPUtil.find_line(this.localSDP.media[i], 'a=mid:') + '\r\n';
                }
                cobbled += 'a=inactive\r\n';
            }
            this.remoteSDP = new SDP(cobbled);
        }
        // then add things like ice and dtls from remote candidate
        elem.each(function () {
            for (var i = 0; i < self.remoteSDP.media.length; i++) {
                if (SDPUtil.find_line(self.remoteSDP.media[i], 'a=mid:' + $(this).attr('name')) ||
                    self.remoteSDP.media[i].indexOf('m=' + $(this).attr('name')) === 0) {
                    if (!SDPUtil.find_line(self.remoteSDP.media[i], 'a=ice-ufrag:')) {
                        var tmp = $(this).find('transport');
                        self.remoteSDP.media[i] += 'a=ice-ufrag:' + tmp.attr('ufrag') + '\r\n';
                        self.remoteSDP.media[i] += 'a=ice-pwd:' + tmp.attr('pwd') + '\r\n';
                        tmp = $(this).find('transport>fingerprint');
                        if (tmp.length) {
                            self.remoteSDP.media[i] += 'a=fingerprint:' + tmp.attr('hash') + ' ' + tmp.text() + '\r\n';
                        } else {
                            console.log('no dtls fingerprint (webrtc issue #1718?)');
                            self.remoteSDP.media[i] += 'a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:BAADBAADBAADBAADBAADBAADBAADBAADBAADBAAD\r\n';
                        }
                        break;
                    }
                }
            }
        });
        this.remoteSDP.raw = this.remoteSDP.session + this.remoteSDP.media.join('');

        // we need a complete SDP with ice-ufrag/ice-pwd in all parts
        // this makes the assumption that the PRANSWER is constructed such that the ice-ufrag is in all mediaparts
        // but it could be in the session part as well. since the code above constructs this sdp this can't happen however
        var iscomplete = this.remoteSDP.media.filter(function (mediapart) {
            return SDPUtil.find_line(mediapart, 'a=ice-ufrag:');
        }).length == this.remoteSDP.media.length;

        if (iscomplete) {
            console.log('setting pranswer');
            try {
                this.peerconnection.setRemoteDescription(new RTCSessionDescription({type: 'pranswer', sdp: this.remoteSDP.raw }),
                    function() {
                    },
                    function(e) {
                        console.log('setRemoteDescription pranswer failed', e.toString());
                    });
            } catch (e) {
                console.error('setting pranswer failed', e);
            }
        } else {
            //console.log('not yet setting pranswer');
        }
    }
    // operate on each content element
    elem.each(function () {
        // would love to deactivate this, but firefox still requires it
        var idx = -1;
        var i;
        for (i = 0; i < self.remoteSDP.media.length; i++) {
            if (SDPUtil.find_line(self.remoteSDP.media[i], 'a=mid:' + $(this).attr('name')) ||
                self.remoteSDP.media[i].indexOf('m=' + $(this).attr('name')) === 0) {
                idx = i;
                break;
            }
        }
        if (idx == -1) { // fall back to localdescription
            for (i = 0; i < self.localSDP.media.length; i++) {
                if (SDPUtil.find_line(self.localSDP.media[i], 'a=mid:' + $(this).attr('name')) ||
                    self.localSDP.media[i].indexOf('m=' + $(this).attr('name')) === 0) {
                    idx = i;
                    break;
                }
            }
        }
        var name = $(this).attr('name');
        // TODO: check ice-pwd and ice-ufrag?
        $(this).find('transport>candidate').each(function () {
            var line, candidate;
            line = SDPUtil.candidateFromJingle(this);
            candidate = new RTCIceCandidate({sdpMLineIndex: idx,
                sdpMid: name,
                candidate: line});
            try {
                self.peerconnection.addIceCandidate(candidate);
            } catch (e) {
                console.error('addIceCandidate failed', e.toString(), line);
            }
        });
    });
};

JingleSession.prototype.sendAnswer = function (provisional) {
    //console.log('createAnswer', provisional);
    var self = this;
    this.peerconnection.createAnswer(
        function (sdp) {
            self.createdAnswer(sdp, provisional);
        },
        function (e) {
            console.error('createAnswer failed', e);
        },
        this.media_constraints
    );
};

JingleSession.prototype.createdAnswer = function (sdp, provisional) {
    //console.log('createAnswer callback');
    var self = this;
    this.localSDP = new SDP(sdp.sdp);
    //this.localSDP.mangle();
    this.usepranswer = provisional === true;
    if (this.usetrickle) {
        if (!this.usepranswer) {
            var accept = $iq({to: this.peerjid,
                type: 'set'})
                .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
                    action: 'session-accept',
                    initiator: this.initiator,
                    responder: this.responder,
                    sid: this.sid });
            var simulcast = new Simulcast();
            var publicLocalDesc = simulcast.reverseTransformLocalDescription(sdp);
            var publicLocalSDP = new SDP(publicLocalDesc.sdp);
            publicLocalSDP.toJingle(accept, this.initiator == this.me ? 'initiator' : 'responder');
            this.connection.sendIQ(accept,
                function () {
                    var ack = {};
                    ack.source = 'answer';
                    $(document).trigger('ack.jingle', [self.sid, ack]);
                },
                function (stanza) {
                    var error = ($(stanza).find('error').length) ? {
                        code: $(stanza).find('error').attr('code'),
                        reason: $(stanza).find('error :first')[0].tagName,
                    }:{};
                    error.source = 'answer';
                    $(document).trigger('error.jingle', [self.sid, error]);
                },
                10000);
        } else {
            sdp.type = 'pranswer';
            for (var i = 0; i < this.localSDP.media.length; i++) {
                this.localSDP.media[i] = this.localSDP.media[i].replace('a=sendrecv\r\n', 'a=inactive\r\n');
            }
            this.localSDP.raw = this.localSDP.session + '\r\n' + this.localSDP.media.join('');
        }
    }
    sdp.sdp = this.localSDP.raw;
    this.peerconnection.setLocalDescription(sdp,
        function () {
            self.setLocalDescription(self.sid);
            //console.log('setLocalDescription success');
        },
        function (e) {
            console.error('setLocalDescription failed', e);
        }
    );
    var cands = SDPUtil.find_lines(this.localSDP.raw, 'a=candidate:');
    for (var j = 0; j < cands.length; j++) {
        var cand = SDPUtil.parse_icecandidate(cands[j]);
        if (cand.type == 'srflx') {
            this.hadstuncandidate = true;
        } else if (cand.type == 'relay') {
            this.hadturncandidate = true;
        }
    }
};

JingleSession.prototype.sendTerminate = function (reason, text) {
    var self = this,
        term = $iq({to: this.peerjid,
            type: 'set'})
            .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
                action: 'session-terminate',
                initiator: this.initiator,
                sid: this.sid})
            .c('reason')
            .c(reason || 'success');

    if (text) {
        term.up().c('text').t(text);
    }

    this.connection.sendIQ(term,
        function () {
            self.peerconnection.close();
            self.peerconnection = null;
            self.terminate();
            var ack = {};
            ack.source = 'terminate';
            $(document).trigger('ack.jingle', [self.sid, ack]);
        },
        function (stanza) {
            var error = ($(stanza).find('error').length) ? {
                code: $(stanza).find('error').attr('code'),
                reason: $(stanza).find('error :first')[0].tagName,
            }:{};
            $(document).trigger('ack.jingle', [self.sid, error]);
        },
        10000);
    if (this.statsinterval !== null) {
        window.clearInterval(this.statsinterval);
        this.statsinterval = null;
    }
};

JingleSession.prototype.sendMute = function (muted, content) {
    var info = $iq({to: this.peerjid,
        type: 'set'})
        .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
            action: 'session-info',
            initiator: this.initiator,
            sid: this.sid });
    info.c(muted ? 'mute' : 'unmute', {xmlns: 'urn:xmpp:jingle:apps:rtp:info:1'});
    info.attrs({'creator': this.me == this.initiator ? 'creator' : 'responder'});
    if (content) {
        info.attrs({'name': content});
    }
    this.connection.send(info);
};

JingleSession.prototype.sendRinging = function () {
    var info = $iq({to: this.peerjid,
        type: 'set'})
        .c('jingle', {xmlns: 'urn:xmpp:jingle:1',
            action: 'session-info',
            initiator: this.initiator,
            sid: this.sid });
    info.c('ringing', {xmlns: 'urn:xmpp:jingle:apps:rtp:info:1'});
    this.connection.send(info);
};

JingleSession.prototype.getStats = function (interval) {
    var self = this;
    var recv = {audio: 0, video: 0};
    var lost = {audio: 0, video: 0};
    var lastrecv = {audio: 0, video: 0};
    var lastlost = {audio: 0, video: 0};
    var loss = {audio: 0, video: 0};
    var delta = {audio: 0, video: 0};
    this.statsinterval = window.setInterval(function () {
        if (self && self.peerconnection && self.peerconnection.getStats) {
            self.peerconnection.getStats(function (stats) {
                var results = stats.result();
                // TODO: there are so much statistics you can get from this..
                for (var i = 0; i < results.length; ++i) {
                    if (results[i].type == 'ssrc') {
                        var packetsrecv = results[i].stat('packetsReceived');
                        var packetslost = results[i].stat('packetsLost');
                        if (packetsrecv && packetslost) {
                            packetsrecv = parseInt(packetsrecv, 10);
                            packetslost = parseInt(packetslost, 10);

                            if (results[i].stat('googFrameRateReceived')) {
                                lastlost.video = lost.video;
                                lastrecv.video = recv.video;
                                recv.video = packetsrecv;
                                lost.video = packetslost;
                            } else {
                                lastlost.audio = lost.audio;
                                lastrecv.audio = recv.audio;
                                recv.audio = packetsrecv;
                                lost.audio = packetslost;
                            }
                        }
                    }
                }
                delta.audio = recv.audio - lastrecv.audio;
                delta.video = recv.video - lastrecv.video;
                loss.audio = (delta.audio > 0) ? Math.ceil(100 * (lost.audio - lastlost.audio) / delta.audio) : 0;
                loss.video = (delta.video > 0) ? Math.ceil(100 * (lost.video - lastlost.video) / delta.video) : 0;
                $(document).trigger('packetloss.jingle', [self.sid, loss]);
            });
        }
    }, interval || 3000);
    return this.statsinterval;
};
module.exports = JingleSession;
},{"./strophe.jingle.adapter":10,"./strophe.jingle.sdp":12,"./strophe.jingle.sessionbase":15}],15:[function(require,module,exports){
var SDP = require("./strophe.jingle.sdp");

/**
 * Base class for ColibriFocus and JingleSession.
 * @param connection Strophe connection object
 * @param sid my session identifier(resource)
 * @constructor
 */
function SessionBase(connection, sid){

    this.connection = connection;
    this.sid = sid;
}


SessionBase.prototype.modifySources = function (successCallback) {
    var self = this;
    this.peerconnection.modifySources(function(){
        self.setLocalDescription(self.sid);
        if(successCallback) {
            successCallback();
        }
    });
};

SessionBase.prototype.setLocalDescription = function (sid) {
    // put our ssrcs into presence so other clients can identify our stream
    var sess = this.connection.jingle.sessions[sid];
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
    this.connection.emuc.clearPresenceMedia();

    if (newssrcs.length > 0) {
        for (var i = 1; i <= newssrcs.length; i ++) {
            // Change video type to screen
            if (newssrcs[i-1].type === 'video' && isUsingScreenStream) {
                newssrcs[i-1].type = 'screen';
            }
            this.connection.emuc.addMediaToPresence(i,
                newssrcs[i-1].type, newssrcs[i-1].ssrc, newssrcs[i-1].direction);
        }

        this.connection.emuc.sendPresence();
    }
}

SessionBase.prototype.addSource = function (elem, fromJid) {

    var self = this;
    // FIXME: dirty waiting
    if (!this.peerconnection.localDescription)
    {
        console.warn("addSource - localDescription not ready yet")
        setTimeout(function()
            {
                self.addSource(elem, fromJid);
            },
            200
        );
        return;
    }

    this.peerconnection.addSource(elem);

    this.modifySources();
};

SessionBase.prototype.removeSource = function (elem, fromJid) {

    var self = this;
    // FIXME: dirty waiting
    if (!this.peerconnection.localDescription)
    {
        console.warn("removeSource - localDescription not ready yet")
        setTimeout(function()
            {
                self.removeSource(elem, fromJid);
            },
            200
        );
        return;
    }

    this.peerconnection.removeSource(elem);

    this.modifySources();
};
/**
 * Switches video streams.
 * @param new_stream new stream that will be used as video of this session.
 * @param oldStream old video stream of this session.
 * @param success_callback callback executed after successful stream switch.
 */
SessionBase.prototype.switchStreams = function (new_stream, oldStream, success_callback) {

    var self = this;

    // Stop the stream to trigger onended event for old stream
    oldStream.stop();

    // Remember SDP to figure out added/removed SSRCs
    var oldSdp = null;
    if(self.peerconnection) {
        if(self.peerconnection.localDescription) {
            oldSdp = new SDP(self.peerconnection.localDescription.sdp);
        }
        self.peerconnection.removeStream(oldStream);
        self.peerconnection.addStream(new_stream);
    }

    self.connection.jingle.localVideo = new_stream;


    // Conference is not active
    if(!oldSdp || !self.peerconnection) {
        success_callback();
        return;
    }

    self.peerconnection.switchstreams = true;
    self.modifySources(function() {
        console.log('modify sources done');

        var newSdp = new SDP(self.peerconnection.localDescription.sdp);
        console.log("SDPs", oldSdp, newSdp);
        self.notifyMySSRCUpdate(oldSdp, newSdp);

        success_callback();
    });
};

/**
 * Figures out added/removed ssrcs and send update IQs.
 * @param old_sdp SDP object for old description.
 * @param new_sdp SDP object for new description.
 */
SessionBase.prototype.notifyMySSRCUpdate = function (old_sdp, new_sdp) {

    var old_media = old_sdp.getMediaSsrcMap();
    var new_media = new_sdp.getMediaSsrcMap();
    //console.log("old/new medias: ", old_media, new_media);

    var toAdd = old_sdp.getNewMedia(new_sdp);
    var toRemove = new_sdp.getNewMedia(old_sdp);
    //console.log("to add", toAdd);
    //console.log("to remove", toRemove);
    if(Object.keys(toRemove).length > 0){
        this.sendSSRCUpdate(toRemove, null, false);
    }
    if(Object.keys(toAdd).length > 0){
        this.sendSSRCUpdate(toAdd, null, true);
    }
};

/**
 * Empty method that does nothing by default. It should send SSRC update IQs to session participants.
 * @param sdpMediaSsrcs array of
 * @param fromJid
 * @param isAdd
 */
SessionBase.prototype.sendSSRCUpdate = function(sdpMediaSsrcs, fromJid, isAdd) {
    //FIXME: put default implementation here(maybe from JingleSession?)
}

/**
 * Sends SSRC update IQ.
 * @param sdpMediaSsrcs SSRCs map obtained from SDP.getNewMedia. Cntains SSRCs to add/remove.
 * @param sid session identifier that will be put into the IQ.
 * @param initiator initiator identifier.
 * @param toJid destination Jid
 * @param isAdd indicates if this is remove or add operation.
 */
SessionBase.prototype.sendSSRCUpdateIq = function(sdpMediaSsrcs, sid, initiator, toJid, isAdd) {

    var self = this;
    var modify = $iq({to: toJid, type: 'set'})
        .c('jingle', {
            xmlns: 'urn:xmpp:jingle:1',
            action: isAdd ? 'source-add' : 'source-remove',
            initiator: initiator,
            sid: sid
        }
    );
    // FIXME: only announce video ssrcs since we mix audio and dont need
    //      the audio ssrcs therefore
    var modified = false;
    Object.keys(sdpMediaSsrcs).forEach(function(channelNum){
        modified = true;
        var channel = sdpMediaSsrcs[channelNum];
        modify.c('content', {name: channel.mediaType});

        modify.c('description', {xmlns:'urn:xmpp:jingle:apps:rtp:1', media: channel.mediaType});
        // FIXME: not completly sure this operates on blocks and / or handles different ssrcs correctly
        // generate sources from lines
        Object.keys(channel.ssrcs).forEach(function(ssrcNum) {
            var mediaSsrc = channel.ssrcs[ssrcNum];
            modify.c('source', { xmlns: 'urn:xmpp:jingle:apps:rtp:ssma:0' });
            modify.attrs({ssrc: mediaSsrc.ssrc});
            // iterate over ssrc lines
            mediaSsrc.lines.forEach(function (line) {
                var idx = line.indexOf(' ');
                var kv = line.substr(idx + 1);
                modify.c('parameter');
                if (kv.indexOf(':') == -1) {
                    modify.attrs({ name: kv });
                } else {
                    modify.attrs({ name: kv.split(':', 2)[0] });
                    modify.attrs({ value: kv.split(':', 2)[1] });
                }
                modify.up(); // end of parameter
            });
            modify.up(); // end of source
        });

        // generate source groups from lines
        channel.ssrcGroups.forEach(function(ssrcGroup) {
            if (ssrcGroup.ssrcs.length != 0) {

                modify.c('ssrc-group', {
                    semantics: ssrcGroup.semantics,
                    xmlns: 'urn:xmpp:jingle:apps:rtp:ssma:0'
                });

                ssrcGroup.ssrcs.forEach(function (ssrc) {
                    modify.c('source', { ssrc: ssrc })
                        .up(); // end of source
                });
                modify.up(); // end of ssrc-group
            }
        });

        modify.up(); // end of description
        modify.up(); // end of content
    });
    if (modified) {
        self.connection.sendIQ(modify,
            function (res) {
                console.info('got modify result', res);
            },
            function (err) {
                console.error('got modify error', err);
            }
        );
    } else {
        console.log('modification not necessary');
    }
};

// SDP-based mute by going recvonly/sendrecv
// FIXME: should probably black out the screen as well
SessionBase.prototype.toggleVideoMute = function (callback) {
    var stream = RTCActivator.getRTCService().localAudio;
    if (!stream)
        return;
    var ismuted = stream.mute();
    this.peerconnection.hardMuteVideo(ismuted);
    var self = this;
    this.modifySources(function () {
        self.connection.emuc.addVideoInfoToPresence(ismuted);
        self.connection.emuc.sendPresence();
        return callback(ismuted);
    }());
};

SessionBase.prototype.toggleAudioMute = function (callback) {
    var stream = RTCActivator.getRTCService().localAudio;
    if (!stream)
        return;
    var audioEnabled = stream.mute();
    // isMuted is the opposite of audioEnabled
    this.connection.emuc.addAudioInfoToPresence(audioEnabled);
    this.connection.emuc.sendPresence();
    callback(audioEnabled);
}


SessionBase.prototype.onIceConnectionStateChange = function (sid, session) {
    switch (session.peerconnection.iceConnectionState) {
        case 'checking':
            session.timeChecking = (new Date()).getTime();
            session.firstconnect = true;
            break;
        case 'completed': // on caller side
        case 'connected':
            if (session.firstconnect) {
                session.firstconnect = false;
                var metadata = {};
                metadata.setupTime = (new Date()).getTime() - session.timeChecking;
                session.peerconnection.getStats(function (res) {
                    res.result().forEach(function (report) {
                        if (report.type == 'googCandidatePair' && report.stat('googActiveConnection') == 'true') {
                            metadata.localCandidateType = report.stat('googLocalCandidateType');
                            metadata.remoteCandidateType = report.stat('googRemoteCandidateType');

                            // log pair as well so we can get nice pie charts
                            metadata.candidatePair = report.stat('googLocalCandidateType') + ';' + report.stat('googRemoteCandidateType');

                            if (report.stat('googRemoteAddress').indexOf('[') === 0) {
                                metadata.ipv6 = true;
                            }
                        }
                    });
//                    trackUsage('iceConnected', metadata);
                    require("../util/tracking.js")('iceConnected', metadata);
                });
            }
            break;
    }

    function waitForPresence(data, sid) {
        var sess = this.connection.jingle.sessions[sid];

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

                if (!XMPPActivator.getJIDFromSSRC(thessrc)) {
                    // TODO(gp) limit wait duration to 1 sec.
                    setTimeout(function(d, s) {
                        return function() {
                            waitForPresence(d, s);
                        }
                    }(data, sid), 250);
                    return;
                }

                // ok to overwrite the one from focus? might save work in colibri.js
                console.log('associated jid', XMPPActivator.getJIDFromSSRC(thessrc), data.peerjid);
                if (XMPPActivator.getJIDFromSSRC(thessrc)) {
                    data.peerjid = XMPPActivator.getJIDFromSSRC(thessrc);
                }
            }
        }

        var isVideo = data.stream.getVideoTracks().length > 0;

        RTCActivator.getRTCService().createRemoteStream(data, sid, thessrc);

        // an attempt to work around https://github.com/jitsi/jitmeet/issues/32
        if (isVideo &&
            data.peerjid && sess.peerjid === data.peerjid &&
            data.stream.getVideoTracks().length === 0 &&
            RTCActivator.getRTCService().localVideo.getVideoTracks().length > 0) {
            //
            window.setTimeout(function () {
                sendKeyframe(sess.peerconnection);
            }, 3000);
        }
    };

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
}


SessionBase.prototype.waitForPresence = function (data, sid) {
    var sess = this.connection.jingle.sessions[sid];

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

            if (!XMPPActivator.getJIDFromSSRC(thessrc)) {
                // TODO(gp) limit wait duration to 1 sec.
                setTimeout(function(d, s) {
                    return function() {
                        waitForPresence(d, s);
                    }
                }(data, sid), 250);
                return;
            }

            // ok to overwrite the one from focus? might save work in colibri.js
            console.log('associated jid', XMPPActivator.getJIDFromSSRC(thessrc), data.peerjid);
            if (XMPPActivator.getJIDFromSSRC(thessrc)) {
                data.peerjid = XMPPActivator.getJIDFromSSRC(thessrc);
            }
        }
    }

    var isVideo = data.stream.getVideoTracks().length > 0;


    // TODO this must be done with listeners
    RTCActivator.getRTCService().createRemoteStream(data, sid, thessrc);

    // an attempt to work around https://github.com/jitsi/jitmeet/issues/32
    if (isVideo &&
        data.peerjid && sess.peerjid === data.peerjid &&
        data.stream.getVideoTracks().length === 0 &&
        RTCActivator.getRTCService().localVideo.getVideoTracks().length > 0) {
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


module.exports = SessionBase;
},{"../util/tracking.js":3,"./strophe.jingle.sdp":12}],16:[function(require,module,exports){
/**
 * Strophe logger implementation. Logs from level WARN and above.
 */
module.exports = function() {
    Strophe.log = function (level, msg) {
        switch (level) {
            case Strophe.LogLevel.WARN:
                console.warn("Strophe: " + msg);
                break;
            case Strophe.LogLevel.ERROR:
            case Strophe.LogLevel.FATAL:
                console.error("Strophe: " + msg);
                break;
        }
    };
};


},{}],17:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}]},{},[4])(4)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9zZXJ2aWNlL1JUQy9TdHJlYW1FdmVudFR5cGVzLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvc2VydmljZS94bXBwL1hNUFBFdmVudHMuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC91dGlsL3RyYWNraW5nLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQveG1wcC9YTVBQQWN0aXZhdG9yLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQveG1wcC9jb2xpYnJpL2NvbGlicmkuZm9jdXMuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC94bXBwL2NvbGlicmkvY29saWJyaS5zZXNzaW9uLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQveG1wcC9tb2RlcmF0ZW11Yy5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L3htcHAvbXVjLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQveG1wcC9yYXlvLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQveG1wcC9zdHJvcGhlLmppbmdsZS5hZGFwdGVyLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQveG1wcC9zdHJvcGhlLmppbmdsZS5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L3htcHAvc3Ryb3BoZS5qaW5nbGUuc2RwLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQveG1wcC9zdHJvcGhlLmppbmdsZS5zZHAudXRpbC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L3htcHAvc3Ryb3BoZS5qaW5nbGUuc2Vzc2lvbi5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L3htcHAvc3Ryb3BoZS5qaW5nbGUuc2Vzc2lvbmJhc2UuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC94bXBwL3N0cm9waGUudXRpbC5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDditDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcmhCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeGVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM3VCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqZ0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIFN0cmVhbUV2ZW50VHlwZXMgPSB7XG4gICAgRVZFTlRfVFlQRV9MT0NBTF9DUkVBVEVEOiBcInN0cmVhbS5sb2NhbF9jcmVhdGVkXCIsXG5cbiAgICBFVkVOVF9UWVBFX0xPQ0FMX0VOREVEOiBcInN0cmVhbS5sb2NhbF9lbmRlZFwiLFxuXG4gICAgRVZFTlRfVFlQRV9SRU1PVEVfQ1JFQVRFRDogXCJzdHJlYW0ucmVtb3RlX2NyZWF0ZWRcIixcblxuICAgIEVWRU5UX1RZUEVfUkVNT1RFX0VOREVEOiBcInN0cmVhbS5yZW1vdGVfZW5kZWRcIlxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdHJlYW1FdmVudFR5cGVzOyIsIi8qKlxuICogQ3JlYXRlZCBieSBocmlzdG8gb24gMTAvMjkvMTQuXG4gKi9cbnZhciBYTVBQRXZlbnRzID0ge1xuICAgIENPTkZFUkVOQ0VfQ0VSQVRFRDogXCJ4bXBwLmNvbmZlcmVuY2VDcmVhdGVkLmppbmdsZVwiLFxuICAgIENBTExfVEVSTUlOQVRFRDogXCJ4bXBwLmNhbGx0ZXJtaW5hdGVkLmppbmdsZVwiLFxuICAgIENBTExfSU5DT01JTkc6IFwieG1wcC5jYWxsaW5jb21pbmcuamluZ2xlXCIsXG4gICAgRElTUE9TRV9DT05GRVJFTkNFOiBcInhtcHAuZGlzcG9jZV9jb25mZXJuY2VcIixcbiAgICBESVNQTEFZX05BTUVfQ0hBTkdFRDogXCJ4bXBwLmRpc3BsYXlfbmFtZV9jaGFuZ2VkXCJcblxufTtcbm1vZHVsZS5leHBvcnRzID0gWE1QUEV2ZW50czsiLCIoZnVuY3Rpb24gKCkge1xuXG5mdW5jdGlvbiB0cmFja1VzYWdlKGV2ZW50bmFtZSwgb2JqKSB7XG4gICAgLy9jb25zb2xlLmxvZygndHJhY2snLCBldmVudG5hbWUsIG9iaik7XG4gICAgLy8gaW1wbGVtZW50IHlvdXIgb3duIHRyYWNraW5nIG1lY2hhbmlzbSBoZXJlXG59XG5pZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSB0cmFja1VzYWdlO1xufSBlbHNlIHtcbiAgICB3aW5kb3cudHJhY2tVc2FnZSA9IHRyYWNrVXNhZ2U7XG59XG5cbn0pKCk7XG4iLCJ2YXIgU3RyZWFtRXZlbnRUeXBlcyA9IHJlcXVpcmUoXCIuLi9zZXJ2aWNlL1JUQy9TdHJlYW1FdmVudFR5cGVzXCIpO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCJldmVudHNcIik7XG52YXIgWE1QUEV2ZW50cyA9IHJlcXVpcmUoXCIuLi9zZXJ2aWNlL3htcHAvWE1QUEV2ZW50c1wiKTtcblxudmFyIFhNUFBBY3RpdmF0b3IgPSBmdW5jdGlvbigpXG57XG4gICAgdmFyIGFjdGl2ZWNhbGwgPSBudWxsO1xuXG4gICAgZnVuY3Rpb24gTmlja25hbWVMaXN0ZW5yZXIoKVxuICAgIHtcbiAgICAgICAgdGhpcy5uaWNrbmFtZSA9IG51bGw7XG4gICAgfVxuXG4gICAgTmlja25hbWVMaXN0ZW5yZXIucHJvdG90eXBlLm9uTmlja25hbWVDaGFuZ2VkID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMubmlja25hbWUgPSB2YWx1ZTtcbiAgICB9O1xuXG4gICAgdmFyIG5pY2tuYW1lTGlzdGVuZXIgPSBuZXcgTmlja25hbWVMaXN0ZW5yZXIoKTtcblxuICAgIHZhciBhdXRoZW50aWNhdGVkVXNlciA9IGZhbHNlO1xuXG4gICAgdmFyIGV2ZW50RW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICAgIHZhciBjb25uZWN0aW9uID0gbnVsbDtcblxuICAgIGZ1bmN0aW9uIFhNUFBBY3RpdmF0b3JQcm90bygpXG4gICAge1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldHVwU3Ryb3BoZVBsdWdpbnMoKVxuICAgIHtcbiAgICAgICAgcmVxdWlyZShcIi4vbXVjXCIpKGV2ZW50RW1pdHRlcik7XG4gICAgICAgIHJlcXVpcmUoXCIuL3N0cm9waGUuamluZ2xlXCIpKGV2ZW50RW1pdHRlcik7XG4gICAgICAgIHJlcXVpcmUoXCIuL21vZGVyYXRlbXVjXCIpKGV2ZW50RW1pdHRlcik7XG4gICAgICAgIHJlcXVpcmUoXCIuL3N0cm9waGUudXRpbFwiKShldmVudEVtaXR0ZXIpO1xuICAgICAgICByZXF1aXJlKFwiLi9yYXlvXCIpKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVnaXN0ZXJMaXN0ZW5lcnMoKSB7XG4gICAgICAgIFVJQWN0aXZhdG9yLmdldFVJU2VydmljZSgpLmFkZE5pY2tuYW1lTGlzdGVuZXIobmlja25hbWVMaXN0ZW5lci5vbk5pY2tuYW1lQ2hhbmdlZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0dXBFdmVudHMoKSB7XG4gICAgICAgICQod2luZG93KS5iaW5kKCdiZWZvcmV1bmxvYWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoY29ubmVjdGlvbiAmJiBjb25uZWN0aW9uLmNvbm5lY3RlZCkge1xuICAgICAgICAgICAgICAgIC8vIGVuc3VyZSBzaWdub3V0XG4gICAgICAgICAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ1BPU1QnLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGNvbmZpZy5ib3NoLFxuICAgICAgICAgICAgICAgICAgICBhc3luYzogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi94bWwnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBcIjxib2R5IHJpZD0nXCIgKyAoY29ubmVjdGlvbi5yaWQgfHwgY29ubmVjdGlvbi5fcHJvdG8ucmlkKSArIFwiJyB4bWxucz0naHR0cDovL2phYmJlci5vcmcvcHJvdG9jb2wvaHR0cGJpbmQnIHNpZD0nXCIgKyAoY29ubmVjdGlvbi5zaWQgfHwgY29ubmVjdGlvbi5fcHJvdG8uc2lkKSArIFwiJyB0eXBlPSd0ZXJtaW5hdGUnPjxwcmVzZW5jZSB4bWxucz0namFiYmVyOmNsaWVudCcgdHlwZT0ndW5hdmFpbGFibGUnLz48L2JvZHk+XCIsXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2lnbmVkIG91dCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbiAoWE1MSHR0cFJlcXVlc3QsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2lnbm91dCBlcnJvcicsIHRleHRTdGF0dXMgKyAnICgnICsgZXJyb3JUaHJvd24gKyAnKScpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBYTVBQQWN0aXZhdG9yUHJvdG8uZGlzcG9zZUNvbmZlcmVuY2UodHJ1ZSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIFhNUFBBY3RpdmF0b3JQcm90by5zdGFydCA9IGZ1bmN0aW9uIChqaWQsIHBhc3N3b3JkLCB1aUNyZWRlbnRpYWxzKSB7XG4gICAgICAgIHNldHVwU3Ryb3BoZVBsdWdpbnMoKTtcbiAgICAgICAgcmVnaXN0ZXJMaXN0ZW5lcnMoKTtcbiAgICAgICAgc2V0dXBFdmVudHMoKTtcbiAgICAgICAgY29ubmVjdChqaWQsIHBhc3N3b3JkLCB1aUNyZWRlbnRpYWxzKTtcbiAgICAgICAgUlRDQWN0aXZhdG9yLmFkZFN0cmVhbUxpc3RlbmVyKG1heWJlRG9Kb2luLCBTdHJlYW1FdmVudFR5cGVzLkVWRU5UX1RZUEVfTE9DQUxfQ1JFQVRFRCk7XG4gICAgfTtcblxuICAgIFhNUFBBY3RpdmF0b3JQcm90by5nZXROaWNrbmFtZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5pY2tuYW1lTGlzdGVuZXIubmlja25hbWU7XG4gICAgfTtcblxuICAgIFhNUFBBY3RpdmF0b3JQcm90by5hZGRUb1ByZXNlbmNlID0gZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG4gICAgICAgIHN3aXRjaCAobmFtZSlcbiAgICAgICAge1xuICAgICAgICAgICAgY2FzZSBcImRpc3BsYXlOYW1lXCI6XG4gICAgICAgICAgICAgICAgY29ubmVjdGlvbi5lbXVjLmFkZERpc3BsYXlOYW1lVG9QcmVzZW5jZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiZXRoZXJwYWRcIjpcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuYWRkRXRoZXJwYWRUb1ByZXNlbmNlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJwcmV6aVwiOlxuICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Yy5hZGRQcmV6aVRvUHJlc2VuY2UodmFsdWUsIDApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcInByZXppU2xpZGVcIjpcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuYWRkQ3VycmVudFNsaWRlVG9QcmVzZW5jZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0IDpcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlVua25vd24gdGFnIGZvciBwcmVzZW5jZS5cIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbm5lY3Rpb24uZW11Yy5zZW5kUHJlc2VuY2UoKTtcbiAgICB9XG5cbiAgICBYTVBQQWN0aXZhdG9yUHJvdG8uc2V0TXV0ZSA9IGZ1bmN0aW9uKGppZCwgaXNNdXRlKVxuICAgIHtcbiAgICAgICAgY29ubmVjdGlvbi5tb2RlcmF0ZS5zZXRNdXRlKGppZCwgaXNNdXRlKTtcbiAgICB9XG5cbiAgICBYTVBQQWN0aXZhdG9yUHJvdG8uZWplY3QgPSBmdW5jdGlvbihqaWQpXG4gICAge1xuICAgICAgICBjb25uZWN0aW9uLm1vZGVyYXRlLmVqZWN0KGppZCk7XG4gICAgfVxuICAgIFxuICAgIFhNUFBBY3RpdmF0b3JQcm90by5nZXRQcmV6aSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGNvbm5lY3Rpb24uZW11Yy5nZXRQcmV6aShYTVBQQWN0aXZhdG9yLmdldE15SklEKCkpO1xuICAgIH1cblxuICAgIFhNUFBBY3RpdmF0b3JQcm90by5yZW1vdmVGcm9tUHJlc2VuY2UgPSBmdW5jdGlvbihuYW1lKVxuICAgIHtcbiAgICAgICAgc3dpdGNoIChuYW1lKVxuICAgICAgICB7XG4gICAgICAgICAgICBjYXNlIFwicHJlemlcIjpcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMucmVtb3ZlUHJlemlGcm9tUHJlc2VuY2UoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbm5lY3Rpb24uZW11Yy5zZW5kUHJlc2VuY2UoKTtcbiAgICB9XG5cbiAgICBYTVBQQWN0aXZhdG9yUHJvdG8ubG9ja1Jvb20gPSBmdW5jdGlvbiAoc2hhcmVkS2V5KSB7XG4gICAgICAgIGNvbm5lY3Rpb24uZW11Yy5sb2NrUm9vbShzaGFyZWRLZXkpO1xuICAgIH1cblxuICAgIFhNUFBBY3RpdmF0b3JQcm90by5nZXRPd25KSUROb2RlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gU3Ryb3BoZS5nZXROb2RlRnJvbUppZChjb25uZWN0aW9uLmppZCk7XG4gICAgfVxuXG4gICAgWE1QUEFjdGl2YXRvclByb3RvLnNlbmRNZXNzYWdlID0gZnVuY3Rpb24gKG1lc3NhZ2UsIG5pY2tuYW1lKSB7XG4gICAgICAgIGNvbm5lY3Rpb24uZW11Yy5zZW5kTWVzc2FnZShtZXNzYWdlLCBuaWNrbmFtZSk7XG4gICAgfVxuXG4gICAgWE1QUEFjdGl2YXRvclByb3RvLnNldFN1YmplY3QgPSBmdW5jdGlvbiAoc3ViamVjdCkge1xuICAgICAgICBjb25uZWN0aW9uLmVtdWMuc2V0U3ViamVjdChzdWJqZWN0KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRDb25mZXJlbmNlSGFuZGxlcigpIHtcbiAgICAgICAgcmV0dXJuIGNvbm5lY3Rpb24uZW11Yy5mb2N1cyA/IGNvbm5lY3Rpb24uZW11Yy5mb2N1cyA6IGFjdGl2ZWNhbGw7XG4gICAgfVxuXG4gICAgWE1QUEFjdGl2YXRvclByb3RvLnRvZ2dsZUF1ZGlvTXV0ZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICBnZXRDb25mZXJlbmNlSGFuZGxlcigpLnRvZ2dsZUF1ZGlvTXV0ZShjYWxsYmFjayk7XG4gICAgfTtcblxuXG4gICAgWE1QUEFjdGl2YXRvclByb3RvLnRvZ2dsZVZpZGVvTXV0ZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICBnZXRDb25mZXJlbmNlSGFuZGxlcigpLnRvZ2dsZVZpZGVvTXV0ZShjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGNvbm5lY3QoamlkLCBwYXNzd29yZCwgdWlDcmVkZW50aWFscykge1xuICAgICAgICBjb25uZWN0aW9uID0gbmV3IFN0cm9waGUuQ29ubmVjdGlvbih1aUNyZWRlbnRpYWxzLmJvc2gpO1xuXG4gICAgICAgIGlmIChuaWNrbmFtZUxpc3RlbmVyLm5pY2tuYW1lKSB7XG4gICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuYWRkRGlzcGxheU5hbWVUb1ByZXNlbmNlKG5pY2tuYW1lTGlzdGVuZXIubmlja25hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbm5lY3Rpb24uZGlzY28pIHtcbiAgICAgICAgICAgIC8vIGZvciBjaHJvbWUsIGFkZCBtdWx0aXN0cmVhbSBjYXBcbiAgICAgICAgfVxuICAgICAgICBjb25uZWN0aW9uLmppbmdsZS5wY19jb25zdHJhaW50cyA9IFJUQ0FjdGl2YXRvci5nZXRSVENTZXJ2aWNlKCkuZ2V0UENDb25zdHJhaW50cygpO1xuICAgICAgICBpZiAoY29uZmlnLnVzZUlQdjYpIHtcbiAgICAgICAgICAgIC8vIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3Avd2VicnRjL2lzc3Vlcy9kZXRhaWw/aWQ9MjgyOFxuICAgICAgICAgICAgaWYgKCFjb25uZWN0aW9uLmppbmdsZS5wY19jb25zdHJhaW50cy5vcHRpb25hbCkgY29ubmVjdGlvbi5qaW5nbGUucGNfY29uc3RyYWludHMub3B0aW9uYWwgPSBbXTtcbiAgICAgICAgICAgIGNvbm5lY3Rpb24uamluZ2xlLnBjX2NvbnN0cmFpbnRzLm9wdGlvbmFsLnB1c2goe2dvb2dJUHY2OiB0cnVlfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZighcGFzc3dvcmQpXG4gICAgICAgICAgICBwYXNzd29yZCA9IHVpQ3JlZGVudGlhbHMucGFzc3dvcmQ7XG5cbiAgICAgICAgaWYoIWppZClcbiAgICAgICAgICAgIGppZCA9IHVpQ3JlZGVudGlhbHMuamlkO1xuXG4gICAgICAgIHZhciBhbm9ueW1vdXNDb25uZWN0aW9uRmFpbGVkID0gZmFsc2U7XG5cbiAgICAgICAgY29ubmVjdGlvbi5jb25uZWN0KGppZCwgcGFzc3dvcmQsIGZ1bmN0aW9uIChzdGF0dXMsIG1zZykge1xuICAgICAgICAgICAgaWYgKHN0YXR1cyA9PT0gU3Ryb3BoZS5TdGF0dXMuQ09OTkVDVEVEKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2Nvbm5lY3RlZCcpO1xuICAgICAgICAgICAgICAgIGlmIChjb25maWcudXNlU3R1blR1cm4pIHtcbiAgICAgICAgICAgICAgICAgICAgY29ubmVjdGlvbi5qaW5nbGUuZ2V0U3R1bkFuZFR1cm5DcmVkZW50aWFscygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBVSUFjdGl2YXRvci5nZXRVSVNlcnZpY2UoKS5kaXNhYmxlQ29ubmVjdCgpO1xuXG4gICAgICAgICAgICAgICAgaWYocGFzc3dvcmQpXG4gICAgICAgICAgICAgICAgICAgIGF1dGhlbnRpY2F0ZWRVc2VyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBtYXliZURvSm9pbigpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzdGF0dXMgPT09IFN0cm9waGUuU3RhdHVzLkNPTk5GQUlMKSB7XG4gICAgICAgICAgICAgICAgaWYobXNnID09PSAneC1zdHJvcGhlLWJhZC1ub24tYW5vbi1qaWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGFub255bW91c0Nvbm5lY3Rpb25GYWlsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc3RhdHVzJywgc3RhdHVzKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdHVzID09PSBTdHJvcGhlLlN0YXR1cy5ESVNDT05ORUNURUQpIHtcbiAgICAgICAgICAgICAgICBpZihhbm9ueW1vdXNDb25uZWN0aW9uRmFpbGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHByb21wdCB1c2VyIGZvciB1c2VybmFtZSBhbmQgcGFzc3dvcmRcbiAgICAgICAgICAgICAgICAgICAgWE1QUEFjdGl2YXRvclByb3RvLnByb21wdExvZ2luKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChzdGF0dXMgPT09IFN0cm9waGUuU3RhdHVzLkFVVEhGQUlMKSB7XG4gICAgICAgICAgICAgICAgLy8gd3JvbmcgcGFzc3dvcmQgb3IgdXNlcm5hbWUsIHByb21wdCB1c2VyXG4gICAgICAgICAgICAgICAgWE1QUEFjdGl2YXRvclByb3RvLnByb21wdExvZ2luKCk7XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3N0YXR1cycsIHN0YXR1cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIFhNUFBBY3RpdmF0b3JQcm90by5wcm9tcHRMb2dpbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgVUlBY3RpdmF0b3Iuc2hvd0xvZ2luUG9wdXAoY29ubmVjdCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWF5YmVEb0pvaW4oKSB7XG4gICAgICAgIGlmIChjb25uZWN0aW9uICYmIGNvbm5lY3Rpb24uY29ubmVjdGVkICYmIFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGNvbm5lY3Rpb24uamlkKSAvLyAuY29ubmVjdGVkIGlzIHRydWUgd2hpbGUgY29ubmVjdGluZz9cbiAgICAgICAgICAgICYmIChSVENBY3RpdmF0b3IuZ2V0UlRDU2VydmljZSgpLmxvY2FsQXVkaW8gfHwgUlRDQWN0aXZhdG9yLmdldFJUQ1NlcnZpY2UoKS5sb2NhbFZpZGVvKSkge1xuICAgICAgICAgICAgdmFyIHJvb21qaWQgPSBVSUFjdGl2YXRvci5nZXRVSVNlcnZpY2UoKS5nZW5lcmF0ZVJvb21OYW1lKGF1dGhlbnRpY2F0ZWRVc2VyKTtcbiAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Yy5kb0pvaW4ocm9vbWppZCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBYTVBQQWN0aXZhdG9yUHJvdG8uc3RvcCA9IGZ1bmN0aW9uICgpIHtcblxuICAgIH07XG5cbiAgICBYTVBQQWN0aXZhdG9yUHJvdG8uc2V0QWN0aXZlQ2FsbCA9IGZ1bmN0aW9uIChzZXNzaW9uKSB7XG4gICAgICAgIGFjdGl2ZWNhbGwgPSBzZXNzaW9uO1xuICAgIH07XG5cbiAgICBYTVBQQWN0aXZhdG9yUHJvdG8uZ2V0SklERnJvbVNTUkMgPSBmdW5jdGlvbiAoc3NyYykge1xuICAgICAgICByZXR1cm4gY29ubmVjdGlvbi5lbXVjLnNzcmMyamlkW3NzcmNdO1xuICAgIH07XG5cbiAgICBYTVBQQWN0aXZhdG9yUHJvdG8uaXNGb2N1cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIChjb25uZWN0aW9uLmVtdWMuZm9jdXMgIT09IG51bGwpO1xuICAgIH1cblxuICAgIFhNUFBBY3RpdmF0b3JQcm90by5zZXRSZWNvcmRpbmcgPSBmdW5jdGlvbiAodG9rZW4sIGNhbGxiYWNrLCB0b2tlbk51bGxDYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gY29ubmVjdGlvbi5lbXVjLmZvY3VzLnNldFJlY29yZGluZyh0b2tlbiwgY2FsbGJhY2ssIHRva2VuTnVsbENhbGxiYWNrKTtcbiAgICB9XG5cbiAgICBYTVBQQWN0aXZhdG9yUHJvdG8uc3dpdGNoU3RyZWFtcyA9IGZ1bmN0aW9uKHN0cmVhbSwgb2xkU3RyZWFtLCBzdHJlYW1Td2l0Y2hEb25lKVxuICAgIHtcbiAgICAgICAgdmFyIGNvbmZlcmVuY2VIYW5kbGVyID0gZ2V0Q29uZmVyZW5jZUhhbmRsZXIoKTtcbiAgICAgICAgaWYgKGNvbmZlcmVuY2VIYW5kbGVyKSB7XG4gICAgICAgICAgICAvLyBGSVhNRTogd2lsbCBibG9jayBzd2l0Y2hJblByb2dyZXNzIG9uIHRydWUgdmFsdWUgaW4gY2FzZSBvZiBleGNlcHRpb25cbiAgICAgICAgICAgIGNvbmZlcmVuY2VIYW5kbGVyLnN3aXRjaFN0cmVhbXMoc3RyZWFtLCBvbGRTdHJlYW0sIHN0cmVhbVN3aXRjaERvbmUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gV2UgYXJlIGRvbmUgaW1tZWRpYXRlbHlcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJObyBjb25mZXJlbmNlIGhhbmRsZXJcIik7XG4gICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5zaG93RXJyb3IoJ0Vycm9yJyxcbiAgICAgICAgICAgICAgICAnVW5hYmxlIHRvIHN3aXRjaCB2aWRlbyBzdHJlYW0uJyk7XG4gICAgICAgICAgICBzdHJlYW1Td2l0Y2hEb25lKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgWE1QUEFjdGl2YXRvclByb3RvLmRpc3Bvc2VDb25mZXJlbmNlID0gZnVuY3Rpb24gKG9uVW5sb2FkLCBjYWxsYmFjaywgbGVhdmVNVUMpIHtcbiAgICAgICAgaWYobGVhdmVNVUMpXG4gICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuZG9MZWF2ZSgpO1xuICAgICAgICB2YXIgaGFuZGxlciA9IGdldENvbmZlcmVuY2VIYW5kbGVyKCk7XG4gICAgICAgIGlmIChoYW5kbGVyICYmIGhhbmRsZXIucGVlcmNvbm5lY3Rpb24pIHtcbiAgICAgICAgICAgIC8vIEZJWE1FOiBwcm9iYWJseSByZW1vdmluZyBzdHJlYW1zIGlzIG5vdCByZXF1aXJlZCBhbmQgY2xvc2UoKSBzaG91bGQgYmUgZW5vdWdoXG4gICAgICAgICAgICBpZiAoUlRDQWN0aXZhdG9yLmdldFJUQ1NlcnZpY2UoKS5sb2NhbEF1ZGlvKSB7XG4gICAgICAgICAgICAgICAgaGFuZGxlci5wZWVyY29ubmVjdGlvbi5yZW1vdmVTdHJlYW0oUlRDQWN0aXZhdG9yLmdldFJUQ1NlcnZpY2UoKS5sb2NhbEF1ZGlvKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChSVENBY3RpdmF0b3IuZ2V0UlRDU2VydmljZSgpLmxvY2FsVmlkZW8pIHtcbiAgICAgICAgICAgICAgICBoYW5kbGVyLnBlZXJjb25uZWN0aW9uLnJlbW92ZVN0cmVhbShSVENBY3RpdmF0b3IuZ2V0UlRDU2VydmljZSgpLmxvY2FsVmlkZW8pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaGFuZGxlci5wZWVyY29ubmVjdGlvbi5jbG9zZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXZlbnRFbWl0dGVyLmVtaXQoWE1QUEV2ZW50cy5ESVNQT1NFX0NPTkZFUkVOQ0UsIG9uVW5sb2FkKTtcblxuICAgICAgICBjb25uZWN0aW9uLmVtdWMuZm9jdXMgPSBudWxsO1xuICAgICAgICBhY3RpdmVjYWxsID0gbnVsbDtcbiAgICAgICAgaWYoY2FsbGJhY2spXG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgIH1cblxuICAgIFhNUFBBY3RpdmF0b3JQcm90by5nZXRKaW5nbGVEYXRhID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoY29ubmVjdGlvbi5qaW5nbGUpIHtcbiAgICAgICAgICAgIHJldHVybiBjb25uZWN0aW9uLmppbmdsZS5nZXRKaW5nbGVEYXRhKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIFhNUFBBY3RpdmF0b3JQcm90by5nZXRMb2dnZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBjb25uZWN0aW9uLmxvZ2dlcjtcbiAgICB9XG4gICAgXG4gICAgWE1QUEFjdGl2YXRvclByb3RvLmFkZExpc3RlbmVyID0gZnVuY3Rpb24gKGV2ZW50LCBsaXN0ZW5lcikge1xuICAgICAgICBldmVudEVtaXR0ZXIub24oZXZlbnQsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICBYTVBQQWN0aXZhdG9yUHJvdG8uZ2V0TXlKSUQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBjb25uZWN0aW9uLmVtdWMubXlyb29tamlkO1xuICAgIH1cblxuICAgIFhNUFBBY3RpdmF0b3JQcm90by5nZXRWaWRlb1R5cGVGcm9tU1NSQyA9IGZ1bmN0aW9uIChzc3JjKSB7XG4gICAgICAgIHJldHVybiBjb25uZWN0aW9uLmVtdWMuc3NyYzJ2aWRlb1R5cGVbc3NyY107XG4gICAgfVxuXG4gICAgWE1QUEFjdGl2YXRvclByb3RvLnNpcERpYWwgPSBmdW5jdGlvbiAodG8sIGZyb20sIHJvb21OYW1lKVxuICAgIHtcbiAgICAgICAgcmV0dXJuIGNvbm5lY3Rpb24ucmF5by5kaWFsKHRvLCBmcm9tLCByb29tTmFtZSk7XG4gICAgfVxuXG4gICAgWE1QUEFjdGl2YXRvclByb3RvLmdldEZvY3VzSklEID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZihPYmplY3Qua2V5cyhjb25uZWN0aW9uLmppbmdsZS5zZXNzaW9ucykubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgdmFyIHNlc3Npb25cbiAgICAgICAgICAgID0gY29ubmVjdGlvbi5qaW5nbGUuc2Vzc2lvbnNcbiAgICAgICAgICAgIFtPYmplY3Qua2V5cyhjb25uZWN0aW9uLmppbmdsZS5zZXNzaW9ucylbMF1dO1xuICAgICAgICByZXR1cm4gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoc2Vzc2lvbi5wZWVyamlkKTtcbiAgICB9XG5cbiAgICByZXR1cm4gWE1QUEFjdGl2YXRvclByb3RvO1xufSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhNUFBBY3RpdmF0b3I7IiwiLyogY29saWJyaS5qcyAtLSBhIENPTElCUkkgZm9jdXNcbiAqIFRoZSBjb2xpYnJpIHNwZWMgaGFzIGJlZW4gc3VibWl0dGVkIHRvIHRoZSBYTVBQIFN0YW5kYXJkcyBGb3VuZGF0aW9uXG4gKiBmb3IgcHVibGljYXRpb25zIGFzIGEgWE1QUCBleHRlbnNpb25zOlxuICogaHR0cDovL3htcHAub3JnL2V4dGVuc2lvbnMvaW5ib3gvY29saWJyaS5odG1sXG4gKlxuICogY29saWJyaS5qcyBpcyBhIHBhcnRpY2lwYXRpbmcgZm9jdXMsIGkuZS4gdGhlIGZvY3VzIHBhcnRpY2lwYXRlc1xuICogaW4gdGhlIGNvbmZlcmVuY2UuIFRoZSBjb25mZXJlbmNlIGl0c2VsZiBjYW4gYmUgYWQtaG9jLCB0aHJvdWdoIGFcbiAqIE1VQywgdGhyb3VnaCBQdWJTdWIsIGV0Yy5cbiAqXG4gKiBjb2xpYnJpLmpzIHJlbGllcyBoZWF2aWx5IG9uIHRoZSBzdHJvcGhlLmppbmdsZSBsaWJyYXJ5IGF2YWlsYWJsZVxuICogZnJvbSBodHRwczovL2dpdGh1Yi5jb20vRVNUT1Mvc3Ryb3BoZS5qaW5nbGVcbiAqIGFuZCBpbnRlcm9wZXJhdGVzIHdpdGggdGhlIEppdHNpIHZpZGVvYnJpZGdlIGF2YWlsYWJsZSBmcm9tXG4gKiBodHRwczovL2ppdHNpLm9yZy9Qcm9qZWN0cy9KaXRzaVZpZGVvYnJpZGdlXG4gKi9cbi8qXG4gQ29weXJpZ2h0IChjKSAyMDEzIEVTVE9TIEdtYkhcblxuIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuXG4gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gVEhFIFNPRlRXQVJFLlxuICovXG4vKiBqc2hpbnQgLVcxMTcgKi9cbnZhciBTZXNzaW9uQmFzZSA9IHJlcXVpcmUoXCIuLi9zdHJvcGhlLmppbmdsZS5zZXNzaW9uYmFzZVwiKTtcbnZhciBDb2xpYnJpU2Vzc2lvbiA9IHJlcXVpcmUoXCIuL2NvbGlicmkuc2Vzc2lvblwiKTtcbnZhciBUcmFjZWFibGVQZWVyQ29ubmVjdGlvbiA9IHJlcXVpcmUoXCIuLi9zdHJvcGhlLmppbmdsZS5hZGFwdGVyXCIpO1xudmFyIFNEUCA9IHJlcXVpcmUoXCIuLi9zdHJvcGhlLmppbmdsZS5zZHBcIik7XG52YXIgU0RQVXRpbCA9IHJlcXVpcmUoXCIuLi9zdHJvcGhlLmppbmdsZS5zZHAudXRpbFwiKTtcbnZhciBYTVBQRXZlbnRzID0gcmVxdWlyZShcIi4uLy4uL3NlcnZpY2UveG1wcC9YTVBQRXZlbnRzXCIpO1xuQ29saWJyaUZvY3VzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU2Vzc2lvbkJhc2UucHJvdG90eXBlKTtcbmZ1bmN0aW9uIENvbGlicmlGb2N1cyhjb25uZWN0aW9uLCBicmlkZ2VqaWQsIGV2ZW50RW1pdHRlcikge1xuXG4gICAgU2Vzc2lvbkJhc2UuY2FsbCh0aGlzLCBjb25uZWN0aW9uLCBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgMTIpKTtcblxuICAgIHRoaXMuYnJpZGdlamlkID0gYnJpZGdlamlkO1xuICAgIHRoaXMucGVlcnMgPSBbXTtcbiAgICB0aGlzLnJlbW90ZVN0cmVhbXMgPSBbXTtcbiAgICB0aGlzLmNvbmZpZCA9IG51bGw7XG4gICAgdGhpcy5ldmVudEVtaXR0ZXIgPSBldmVudEVtaXR0ZXI7XG5cbiAgICAvKipcbiAgICAgKiBMb2NhbCBYTVBQIHJlc291cmNlIHVzZWQgdG8gam9pbiB0aGUgbXVsdGkgdXNlciBjaGF0LlxuICAgICAqIEB0eXBlIHsqfVxuICAgICAqL1xuICAgIHRoaXMubXlNdWNSZXNvdXJjZSA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKHRoaXMuY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZCk7XG5cbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IGNoYW5uZWwgZXhwaXJlIHZhbHVlIGluIHNlY29uZHMuXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICB0aGlzLmNoYW5uZWxFeHBpcmVcbiAgICAgICAgPSAoJ251bWJlcicgPT09IHR5cGVvZihjb25maWcuY2hhbm5lbEV4cGlyZSkpXG4gICAgICAgICAgICA/IGNvbmZpZy5jaGFubmVsRXhwaXJlXG4gICAgICAgICAgICA6IDE1O1xuICAgIC8qKlxuICAgICAqIERlZmF1bHQgY2hhbm5lbCBsYXN0LW4gdmFsdWUuXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICB0aGlzLmNoYW5uZWxMYXN0TlxuICAgICAgICA9ICgnbnVtYmVyJyA9PT0gdHlwZW9mKGNvbmZpZy5jaGFubmVsTGFzdE4pKSA/IGNvbmZpZy5jaGFubmVsTGFzdE4gOiAtMTtcblxuICAgIC8vIG1lZGlhIHR5cGVzIG9mIHRoZSBjb25mZXJlbmNlXG4gICAgaWYgKGNvbmZpZy5vcGVuU2N0cClcbiAgICAgICAgdGhpcy5tZWRpYSA9IFsnYXVkaW8nLCAndmlkZW8nLCAnZGF0YSddO1xuICAgIGVsc2VcbiAgICAgICAgdGhpcy5tZWRpYSA9IFsnYXVkaW8nLCAndmlkZW8nXTtcblxuICAgIHRoaXMuY29ubmVjdGlvbi5qaW5nbGUuc2Vzc2lvbnNbdGhpcy5zaWRdID0gdGhpcztcbiAgICB0aGlzLmJ1bmRsZWRUcmFuc3BvcnRzID0ge307XG4gICAgdGhpcy5teWNoYW5uZWwgPSBbXTtcbiAgICB0aGlzLmNoYW5uZWxzID0gW107XG4gICAgdGhpcy5yZW1vdGVzc3JjID0ge307XG5cbiAgICAvLyBjb250YWluZXIgZm9yIGNhbmRpZGF0ZXMgZnJvbSB0aGUgZm9jdXNcbiAgICAvLyBnYXRoZXJlZCBiZWZvcmUgY29uZmlkIGlzIGtub3duXG4gICAgdGhpcy5kcmlwX2NvbnRhaW5lciA9IFtdO1xuXG4gICAgLy8gc2lsbHkgd2FpdCBmbGFnXG4gICAgdGhpcy53YWl0ID0gdHJ1ZTtcblxuICAgIHRoaXMucmVjb3JkaW5nRW5hYmxlZCA9IGZhbHNlO1xuXG4gICAgLy8gc3RvcmVzIGluZm9ybWF0aW9uIGFib3V0IHRoZSBlbmRwb2ludHMgKGkuZS4gZGlzcGxheSBuYW1lcykgdG9cbiAgICAvLyBiZSBzZW50IHRvIHRoZSB2aWRlb2JyaWRnZS5cbiAgICB0aGlzLmVuZHBvaW50c0luZm8gPSBudWxsO1xufVxuXG4vLyBjcmVhdGVzIGEgY29uZmVyZW5jZXMgd2l0aCBhbiBpbml0aWFsIHNldCBvZiBwZWVyc1xuQ29saWJyaUZvY3VzLnByb3RvdHlwZS5tYWtlQ29uZmVyZW5jZSA9IGZ1bmN0aW9uIChwZWVycywgZXJyb3JDYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAodGhpcy5jb25maWQgIT09IG51bGwpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignbWFrZUNvbmZlcmVuY2UgY2FsbGVkIHR3aWNlPyBJZ25vcmluZy4uLicpO1xuICAgICAgICAvLyBGSVhNRToganVzdCBpbnZpdGUgcGVlcnM/XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5jb25maWQgPSAwOyAvLyAhbnVsbFxuICAgIHRoaXMucGVlcnMgPSBbXTtcbiAgICBwZWVycy5mb3JFYWNoKGZ1bmN0aW9uIChwZWVyKSB7XG4gICAgICAgIHNlbGYucGVlcnMucHVzaChwZWVyKTtcbiAgICAgICAgc2VsZi5jaGFubmVscy5wdXNoKFtdKTtcbiAgICB9KTtcblxuICAgIHRoaXMucGVlcmNvbm5lY3Rpb25cbiAgICAgICAgPSBuZXcgVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24oXG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uamluZ2xlLmljZV9jb25maWcsXG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uamluZ2xlLnBjX2NvbnN0cmFpbnRzICk7XG5cbiAgICBpZihSVENBY3RpdmF0b3IuZ2V0UlRDU2VydmljZSgpLmxvY2FsQXVkaW8pIHtcbiAgICAgICAgdGhpcy5wZWVyY29ubmVjdGlvbi5hZGRTdHJlYW0oUlRDQWN0aXZhdG9yLmdldFJUQ1NlcnZpY2UoKS5sb2NhbEF1ZGlvKTtcbiAgICB9XG4gICAgaWYoUlRDQWN0aXZhdG9yLmdldFJUQ1NlcnZpY2UoKS5sb2NhbFZpZGVvKSB7XG4gICAgICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uYWRkU3RyZWFtKFJUQ0FjdGl2YXRvci5nZXRSVENTZXJ2aWNlKCkubG9jYWxWaWRlbyk7XG4gICAgfVxuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24ub25pY2Vjb25uZWN0aW9uc3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdpY2UgY29ubmVjdGlvbiBzdGF0ZSBjaGFuZ2VkIHRvJywgc2VsZi5wZWVyY29ubmVjdGlvbi5pY2VDb25uZWN0aW9uU3RhdGUpO1xuICAgICAgICAvKlxuICAgICAgICBpZiAoc2VsZi5wZWVyY29ubmVjdGlvbi5zaWduYWxpbmdTdGF0ZSA9PSAnc3RhYmxlJyAmJiBzZWxmLnBlZXJjb25uZWN0aW9uLmljZUNvbm5lY3Rpb25TdGF0ZSA9PSAnY29ubmVjdGVkJykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2FkZGluZyBuZXcgcmVtb3RlIFNTUkNzIGZyb20gaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlJyk7XG4gICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHsgc2VsZi5tb2RpZnlTb3VyY2VzKCk7IH0sIDEwMDApO1xuICAgICAgICB9XG4gICAgICAgICovXG4gICAgICAgIHNlbGYub25JY2VDb25uZWN0aW9uU3RhdGVDaGFuZ2Uoc2VsZi5zaWQsIHNlbGYpO1xuICAgIH07XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5vbnNpZ25hbGluZ3N0YXRlY2hhbmdlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIGNvbnNvbGUud2FybihzZWxmLnBlZXJjb25uZWN0aW9uLnNpZ25hbGluZ1N0YXRlKTtcbiAgICAgICAgLypcbiAgICAgICAgaWYgKHNlbGYucGVlcmNvbm5lY3Rpb24uc2lnbmFsaW5nU3RhdGUgPT0gJ3N0YWJsZScgJiYgc2VsZi5wZWVyY29ubmVjdGlvbi5pY2VDb25uZWN0aW9uU3RhdGUgPT0gJ2Nvbm5lY3RlZCcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdhZGRpbmcgbmV3IHJlbW90ZSBTU1JDcyBmcm9tIHNpZ25hbGluZ3N0YXRlY2hhbmdlJyk7XG4gICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHsgc2VsZi5tb2RpZnlTb3VyY2VzKCk7IH0sIDEwMDApO1xuICAgICAgICB9XG4gICAgICAgICovXG4gICAgfTtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLm9uYWRkc3RyZWFtID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIC8vIHNlYXJjaCB0aGUgamlkIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHN0cmVhbVxuICAgICAgICBPYmplY3Qua2V5cyhzZWxmLnJlbW90ZXNzcmMpLmZvckVhY2goZnVuY3Rpb24gKGppZCkge1xuICAgICAgICAgICAgaWYgKHNlbGYucmVtb3Rlc3NyY1tqaWRdLmpvaW4oJ1xcclxcbicpLmluZGV4T2YoJ21zbGFiZWw6JyArIGV2ZW50LnN0cmVhbS5pZCkgIT0gLTEpIHtcbiAgICAgICAgICAgICAgICBldmVudC5wZWVyamlkID0gamlkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgc2VsZi5yZW1vdGVTdHJlYW1zLnB1c2goZXZlbnQuc3RyZWFtKTtcbi8vICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdyZW1vdGVzdHJlYW1hZGRlZC5qaW5nbGUnLCBbZXZlbnQsIHNlbGYuc2lkXSk7XG4gICAgICAgIHNlbGYud2FpdEZvclByZXNlbmNlKGV2ZW50LCBzZWxmLnNpZCk7XG4gICAgfTtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLm9uaWNlY2FuZGlkYXRlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIC8vY29uc29sZS5sb2coJ2ZvY3VzIG9uaWNlY2FuZGlkYXRlJywgc2VsZi5jb25maWQsIG5ldyBEYXRlKCkuZ2V0VGltZSgpLCBldmVudC5jYW5kaWRhdGUpO1xuICAgICAgICBpZiAoIWV2ZW50LmNhbmRpZGF0ZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2VuZCBvZiBjYW5kaWRhdGVzJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc2VsZi5zZW5kSWNlQ2FuZGlkYXRlKGV2ZW50LmNhbmRpZGF0ZSk7XG4gICAgfTtcbiAgICB0aGlzLl9tYWtlQ29uZmVyZW5jZShlcnJvckNhbGxiYWNrKTtcbiAgICAvKlxuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uY3JlYXRlT2ZmZXIoXG4gICAgICAgIGZ1bmN0aW9uIChvZmZlcikge1xuICAgICAgICAgICAgc2VsZi5wZWVyY29ubmVjdGlvbi5zZXRMb2NhbERlc2NyaXB0aW9uKFxuICAgICAgICAgICAgICAgIG9mZmVyLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdzZXRMb2NhbERlc2NyaXB0aW9uLmppbmdsZScsIFtzZWxmLnNpZF0pO1xuICAgICAgICAgICAgICAgICAgICAvLyBGSVhNRTogY291bGQgY2FsbCBfbWFrZUNvbmZlcmVuY2UgaGVyZSBhbmQgdHJpY2tsZSBjYW5kaWRhdGVzIGxhdGVyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX21ha2VDb25mZXJlbmNlKCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NldExvY2FsRGVzY3JpcHRpb24gZmFpbGVkJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGVycm9yKTtcbiAgICAgICAgfVxuICAgICk7XG4gICAgKi9cbn07XG5cbi8vIFNlbmRzIGEgQ09MSUJSSSBtZXNzYWdlIHdoaWNoIGVuYWJsZXMgb3IgZGlzYWJsZXMgKGFjY29yZGluZyB0byAnc3RhdGUnKSB0aGVcbi8vIHJlY29yZGluZyBvbiB0aGUgYnJpZGdlLiBXYWl0cyBmb3IgdGhlIHJlc3VsdCBJUSBhbmQgY2FsbHMgJ2NhbGxiYWNrJyB3aXRoXG4vLyB0aGUgbmV3IHJlY29yZGluZyBzdGF0ZSwgYWNjb3JkaW5nIHRvIHRoZSBJUS5cbkNvbGlicmlGb2N1cy5wcm90b3R5cGUuc2V0UmVjb3JkaW5nID0gZnVuY3Rpb24odG9rZW4sIGNhbGxiYWNrLCB0b2tlbk51bGxDYWxsYmFjaykge1xuICAgIGlmICh0aGlzLmNvbmZpZCA9PT0gbnVsbCkge1xuICAgICAgICBjb25zb2xlLmxvZygnbm9uLWZvY3VzLCBvciBjb25mZXJlbmNlIG5vdCB5ZXQgb3JnYW5pemVkOiBub3QgZW5hYmxpbmcgcmVjb3JkaW5nJyk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZighdG9rZW4pXG4gICAge1xuICAgICAgICB0b2tlbk51bGxDYWxsYmFjaygpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIG9sZFN0YXRlID0gdGhpcy5yZWNvcmRpbmdFbmFibGVkO1xuICAgIHZhciBzdGF0ZSA9ICFvbGRTdGF0ZTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGVsZW0gPSAkaXEoe3RvOiB0aGlzLmJyaWRnZWppZCwgdHlwZTogJ3NldCd9KTtcbiAgICBlbGVtLmMoJ2NvbmZlcmVuY2UnLCB7XG4gICAgICAgIHhtbG5zOiAnaHR0cDovL2ppdHNpLm9yZy9wcm90b2NvbC9jb2xpYnJpJyxcbiAgICAgICAgaWQ6IHRoaXMuY29uZmlkXG4gICAgfSk7XG4gICAgZWxlbS5jKCdyZWNvcmRpbmcnLCB7c3RhdGU6IHN0YXRlLCB0b2tlbjogdG9rZW59KTtcbiAgICBlbGVtLnVwKCk7XG5cbiAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKGVsZW0sXG4gICAgICAgIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTZXQgcmVjb3JkaW5nIFwiJywgc3RhdGUsICdcIi4gUmVzdWx0OicsIHJlc3VsdCk7XG4gICAgICAgICAgICB2YXIgcmVjb3JkaW5nRWxlbSA9ICQocmVzdWx0KS5maW5kKCc+Y29uZmVyZW5jZT5yZWNvcmRpbmcnKTtcbiAgICAgICAgICAgIHZhciBuZXdTdGF0ZSA9ICgndHJ1ZScgPT09IHJlY29yZGluZ0VsZW0uYXR0cignc3RhdGUnKSk7XG5cbiAgICAgICAgICAgIHNlbGYucmVjb3JkaW5nRW5hYmxlZCA9IG5ld1N0YXRlO1xuICAgICAgICAgICAgY2FsbGJhY2sobmV3U3RhdGUsIG9sZFN0YXRlKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oZXJyb3IpO1xuICAgICAgICB9XG4gICAgKTtcbn07XG5cbi8qXG4gKiBVcGRhdGVzIHRoZSBkaXNwbGF5IG5hbWUgZm9yIGFuIGVuZHBvaW50IHdpdGggYSBzcGVjaWZpYyBqaWQuXG4gKiBqaWQ6IHRoZSBqaWQgYXNzb2NpYXRlZCB3aXRoIHRoZSBlbmRwb2ludC5cbiAqIGRpc3BsYXlOYW1lOiB0aGUgbmV3IGRpc3BsYXkgbmFtZSBmb3IgdGhlIGVuZHBvaW50LlxuICovXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLnNldEVuZHBvaW50RGlzcGxheU5hbWUgPSBmdW5jdGlvbihqaWQsIGRpc3BsYXlOYW1lKSB7XG4gICAgdmFyIGVuZHBvaW50SWQgPSBqaWQuc3Vic3RyKDEgKyBqaWQubGFzdEluZGV4T2YoJy8nKSk7XG4gICAgdmFyIHVwZGF0ZSA9IGZhbHNlO1xuXG4gICAgaWYgKHRoaXMuZW5kcG9pbnRzSW5mbyA9PT0gbnVsbCkge1xuICAgICAgIHRoaXMuZW5kcG9pbnRzSW5mbyA9IHt9O1xuICAgIH1cblxuICAgIHZhciBlbmRwb2ludEluZm8gPSB0aGlzLmVuZHBvaW50c0luZm9bZW5kcG9pbnRJZF07XG4gICAgaWYgKCd1bmRlZmluZWQnID09PSB0eXBlb2YgZW5kcG9pbnRJbmZvKSB7XG4gICAgICAgIGVuZHBvaW50SW5mbyA9IHRoaXMuZW5kcG9pbnRzSW5mb1tlbmRwb2ludElkXSA9IHt9O1xuICAgIH1cblxuICAgIGlmIChlbmRwb2ludEluZm9bJ2Rpc3BsYXluYW1lJ10gIT09IGRpc3BsYXlOYW1lKSB7XG4gICAgICAgIGVuZHBvaW50SW5mb1snZGlzcGxheW5hbWUnXSA9IGRpc3BsYXlOYW1lO1xuICAgICAgICB1cGRhdGUgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICh1cGRhdGUpIHtcbiAgICAgICAgdGhpcy51cGRhdGVFbmRwb2ludHMoKTtcbiAgICB9XG59O1xuXG4vKlxuICogU2VuZHMgYSBjb2xpYnJpIG1lc3NhZ2UgdG8gdGhlIGJyaWRnZSB0aGF0IGNvbnRhaW5zIHRoZVxuICogY3VycmVudCBlbmRwb2ludHMgYW5kIHRoZWlyIGRpc3BsYXkgbmFtZXMuXG4gKi9cbkNvbGlicmlGb2N1cy5wcm90b3R5cGUudXBkYXRlRW5kcG9pbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuY29uZmlkID09PSBudWxsXG4gICAgICAgIHx8IHRoaXMuZW5kcG9pbnRzSW5mbyA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlkID09PSAwKSB7XG4gICAgICAgIC8vIHRoZSBjb2xpYnJpIGNvbmZlcmVuY2UgaXMgY3VycmVudGx5IGluaXRpYXRpbmdcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHsgc2VsZi51cGRhdGVFbmRwb2ludHMoKX0sIDEwMDApO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGVsZW0gPSAkaXEoe3RvOiB0aGlzLmJyaWRnZWppZCwgdHlwZTogJ3NldCd9KTtcbiAgICBlbGVtLmMoJ2NvbmZlcmVuY2UnLCB7XG4gICAgICAgIHhtbG5zOiAnaHR0cDovL2ppdHNpLm9yZy9wcm90b2NvbC9jb2xpYnJpJyxcbiAgICAgICAgaWQ6IHRoaXMuY29uZmlkXG4gICAgfSk7XG5cbiAgICBmb3IgKHZhciBpZCBpbiB0aGlzLmVuZHBvaW50c0luZm8pIHtcbiAgICAgICAgZWxlbS5jKCdlbmRwb2ludCcpO1xuICAgICAgICBlbGVtLmF0dHJzKHsgaWQ6IGlkLFxuICAgICAgICAgICAgICAgICAgICAgZGlzcGxheW5hbWU6IHRoaXMuZW5kcG9pbnRzSW5mb1tpZF1bJ2Rpc3BsYXluYW1lJ11cbiAgICAgICAgfSk7XG4gICAgICAgIGVsZW0udXAoKTtcbiAgICB9XG5cbiAgICAvL2VsZW0udXAoKTsgLy9jb25mZXJlbmNlXG5cbiAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKFxuICAgICAgICBlbGVtLFxuICAgICAgICBmdW5jdGlvbiAocmVzdWx0KSB7fSxcbiAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7IGNvbnNvbGUud2FybihlcnJvcik7IH1cbiAgICApO1xufTtcblxuQ29saWJyaUZvY3VzLnByb3RvdHlwZS5fbWFrZUNvbmZlcmVuY2UgPSBmdW5jdGlvbiAoZXJyb3JDYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZWxlbSA9ICRpcSh7IHRvOiB0aGlzLmJyaWRnZWppZCwgdHlwZTogJ2dldCcgfSk7XG4gICAgZWxlbS5jKCdjb25mZXJlbmNlJywgeyB4bWxuczogJ2h0dHA6Ly9qaXRzaS5vcmcvcHJvdG9jb2wvY29saWJyaScgfSk7XG5cbiAgICB0aGlzLm1lZGlhLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgdmFyIGVsZW1OYW1lO1xuICAgICAgICB2YXIgZWxlbUF0dHJzID0geyBpbml0aWF0b3I6ICd0cnVlJywgZXhwaXJlOiBzZWxmLmNoYW5uZWxFeHBpcmUgfTtcblxuICAgICAgICBpZiAoJ2RhdGEnID09PSBuYW1lKVxuICAgICAgICB7XG4gICAgICAgICAgICBlbGVtTmFtZSA9ICdzY3RwY29ubmVjdGlvbic7XG4gICAgICAgICAgICBlbGVtQXR0cnNbJ3BvcnQnXSA9IDUwMDA7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZVxuICAgICAgICB7XG4gICAgICAgICAgICBlbGVtTmFtZSA9ICdjaGFubmVsJztcbiAgICAgICAgICAgIGlmICgoJ3ZpZGVvJyA9PT0gbmFtZSkgJiYgKHNlbGYuY2hhbm5lbExhc3ROID49IDApKVxuICAgICAgICAgICAgICAgIGVsZW1BdHRyc1snbGFzdC1uJ10gPSBzZWxmLmNoYW5uZWxMYXN0TjtcbiAgICAgICAgfVxuXG4gICAgICAgIGVsZW0uYygnY29udGVudCcsIHsgbmFtZTogbmFtZSB9KTtcblxuICAgICAgICBlbGVtLmMoZWxlbU5hbWUsIGVsZW1BdHRycyk7XG4gICAgICAgIGVsZW0uYXR0cnMoeyBlbmRwb2ludDogc2VsZi5teU11Y1Jlc291cmNlIH0pO1xuICAgICAgICBpZiAoY29uZmlnLnVzZUJ1bmRsZSkge1xuICAgICAgICAgICAgZWxlbS5hdHRycyh7ICdjaGFubmVsLWJ1bmRsZS1pZCc6IHNlbGYubXlNdWNSZXNvdXJjZSB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbGVtLnVwKCk7Ly8gZW5kIG9mIGNoYW5uZWwvc2N0cGNvbm5lY3Rpb25cblxuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHNlbGYucGVlcnMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIHZhciBwZWVyID0gc2VsZi5wZWVyc1tqXTtcbiAgICAgICAgICAgIHZhciBwZWVyRW5kcG9pbnQgPSBwZWVyLnN1YnN0cigxICsgcGVlci5sYXN0SW5kZXhPZignLycpKTtcblxuICAgICAgICAgICAgZWxlbS5jKGVsZW1OYW1lLCBlbGVtQXR0cnMpO1xuICAgICAgICAgICAgZWxlbS5hdHRycyh7IGVuZHBvaW50OiBwZWVyRW5kcG9pbnQgfSk7XG4gICAgICAgICAgICBpZiAoY29uZmlnLnVzZUJ1bmRsZSkge1xuICAgICAgICAgICAgICAgIGVsZW0uYXR0cnMoeyAnY2hhbm5lbC1idW5kbGUtaWQnOiBwZWVyRW5kcG9pbnQgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbGVtLnVwKCk7IC8vIGVuZCBvZiBjaGFubmVsL3NjdHBjb25uZWN0aW9uXG4gICAgICAgIH1cbiAgICAgICAgZWxlbS51cCgpOyAvLyBlbmQgb2YgY29udGVudFxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMuZW5kcG9pbnRzSW5mbyAhPT0gbnVsbCkge1xuICAgICAgICBmb3IgKHZhciBpZCBpbiB0aGlzLmVuZHBvaW50c0luZm8pIHtcbiAgICAgICAgICAgIGVsZW0uYygnZW5kcG9pbnQnKTtcbiAgICAgICAgICAgIGVsZW0uYXR0cnMoeyBpZDogaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGxheW5hbWU6IHRoaXMuZW5kcG9pbnRzSW5mb1tpZF1bJ2Rpc3BsYXluYW1lJ11cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZWxlbS51cCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLypcbiAgICB2YXIgbG9jYWxTRFAgPSBuZXcgU0RQKHRoaXMucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbi5zZHApO1xuICAgIGxvY2FsU0RQLm1lZGlhLmZvckVhY2goZnVuY3Rpb24gKG1lZGlhLCBjaGFubmVsKSB7XG4gICAgICAgIHZhciBuYW1lID0gU0RQVXRpbC5wYXJzZV9tbGluZShtZWRpYS5zcGxpdCgnXFxyXFxuJylbMF0pLm1lZGlhO1xuICAgICAgICBlbGVtLmMoJ2NvbnRlbnQnLCB7bmFtZTogbmFtZX0pO1xuICAgICAgICBlbGVtLmMoJ2NoYW5uZWwnLCB7aW5pdGlhdG9yOiAnZmFsc2UnLCBleHBpcmU6IHNlbGYuY2hhbm5lbEV4cGlyZX0pO1xuXG4gICAgICAgIC8vIEZJWE1FOiBzaG91bGQgcmV1c2UgY29kZSBmcm9tIC50b0ppbmdsZVxuICAgICAgICB2YXIgbWxpbmUgPSBTRFBVdGlsLnBhcnNlX21saW5lKG1lZGlhLnNwbGl0KCdcXHJcXG4nKVswXSk7XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbWxpbmUuZm10Lmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICB2YXIgcnRwbWFwID0gU0RQVXRpbC5maW5kX2xpbmUobWVkaWEsICdhPXJ0cG1hcDonICsgbWxpbmUuZm10W2pdKTtcbiAgICAgICAgICAgIGVsZW0uYygncGF5bG9hZC10eXBlJywgU0RQVXRpbC5wYXJzZV9ydHBtYXAocnRwbWFwKSk7XG4gICAgICAgICAgICBlbGVtLnVwKCk7XG4gICAgICAgIH1cblxuICAgICAgICBsb2NhbFNEUC5UcmFuc3BvcnRUb0ppbmdsZShjaGFubmVsLCBlbGVtKTtcblxuICAgICAgICBlbGVtLnVwKCk7IC8vIGVuZCBvZiBjaGFubmVsXG4gICAgICAgIGZvciAoaiA9IDA7IGogPCBzZWxmLnBlZXJzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBlbGVtLmMoJ2NoYW5uZWwnLCB7aW5pdGlhdG9yOiAndHJ1ZScsIGV4cGlyZTogc2VsZi5jaGFubmVsRXhwaXJlIH0pLnVwKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxlbS51cCgpOyAvLyBlbmQgb2YgY29udGVudFxuICAgIH0pO1xuICAgICovXG5cbiAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKGVsZW0sXG4gICAgICAgIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgIHNlbGYuY3JlYXRlZENvbmZlcmVuY2UocmVzdWx0KTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oZXJyb3IpO1xuICAgICAgICAgICAgZXJyb3JDYWxsYmFjayhlcnJvcik7XG4gICAgICAgIH1cbiAgICApO1xufTtcblxuLy8gY2FsbGJhY2sgd2hlbiBhIGNvbGlicmkgY29uZmVyZW5jZSB3YXMgY3JlYXRlZFxuQ29saWJyaUZvY3VzLnByb3RvdHlwZS5jcmVhdGVkQ29uZmVyZW5jZSA9IGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICBjb25zb2xlLmxvZygnY3JlYXRlZCBhIGNvbmZlcmVuY2Ugb24gdGhlIGJyaWRnZScpO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdG1wO1xuXG4gICAgdGhpcy5jb25maWQgPSAkKHJlc3VsdCkuZmluZCgnPmNvbmZlcmVuY2UnKS5hdHRyKCdpZCcpO1xuICAgIHZhciByZW1vdGVjb250ZW50cyA9ICQocmVzdWx0KS5maW5kKCc+Y29uZmVyZW5jZT5jb250ZW50JykuZ2V0KCk7XG4gICAgdmFyIG51bXBhcnRpY2lwYW50cyA9IDA7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZW1vdGVjb250ZW50cy5sZW5ndGg7IGkrKylcbiAgICB7XG4gICAgICAgIHZhciBjb250ZW50TmFtZSA9ICQocmVtb3RlY29udGVudHNbaV0pLmF0dHIoJ25hbWUnKTtcbiAgICAgICAgdmFyIGNoYW5uZWxOYW1lXG4gICAgICAgICAgICA9IGNvbnRlbnROYW1lICE9PSAnZGF0YScgPyAnPmNoYW5uZWwnIDogJz5zY3RwY29ubmVjdGlvbic7XG5cbiAgICAgICAgdG1wID0gJChyZW1vdGVjb250ZW50c1tpXSkuZmluZChjaGFubmVsTmFtZSkuZ2V0KCk7XG4gICAgICAgIHRoaXMubXljaGFubmVsLnB1c2goJCh0bXAuc2hpZnQoKSkpO1xuICAgICAgICBudW1wYXJ0aWNpcGFudHMgPSB0bXAubGVuZ3RoO1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgdG1wLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5jaGFubmVsc1tqXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jaGFubmVsc1tqXSA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jaGFubmVsc1tqXS5wdXNoKHRtcFtqXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBzYXZlIHRoZSAndHJhbnNwb3J0JyBlbGVtZW50cyBmcm9tICdjaGFubmVsLWJ1bmRsZSctc1xuICAgIHZhciBjaGFubmVsQnVuZGxlcyA9ICQocmVzdWx0KS5maW5kKCc+Y29uZmVyZW5jZT5jaGFubmVsLWJ1bmRsZScpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hhbm5lbEJ1bmRsZXMubGVuZ3RoOyBpKyspXG4gICAge1xuICAgICAgICB2YXIgZW5kcG9pbnRJZCA9ICQoY2hhbm5lbEJ1bmRsZXNbaV0pLmF0dHIoJ2lkJyk7XG4gICAgICAgIHRoaXMuYnVuZGxlZFRyYW5zcG9ydHNbZW5kcG9pbnRJZF0gPSAkKGNoYW5uZWxCdW5kbGVzW2ldKS5maW5kKCc+dHJhbnNwb3J0W3htbG5zPVwidXJuOnhtcHA6amluZ2xlOnRyYW5zcG9ydHM6aWNlLXVkcDoxXCJdJyk7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coJ3JlbW90ZSBjaGFubmVscycsIHRoaXMuY2hhbm5lbHMpO1xuXG4gICAgLy8gTm90aWZ5IHRoYXQgdGhlIGZvY3VzIGhhcyBjcmVhdGVkIHRoZSBjb25mZXJlbmNlIG9uIHRoZSBicmlkZ2VcbiAgICB0aGlzLmV2ZW50RW1pdHRlci5lbWl0KFhNUFBFdmVudHMuQ09ORkVSRU5DRV9DRVJBVEVELCBzZWxmKTtcblxuICAgIHZhciBicmlkZ2VTRFAgPSBuZXcgU0RQKFxuICAgICAgICAndj0wXFxyXFxuJyArXG4gICAgICAgICdvPS0gNTE1MTA1NTQ1ODg3NDk1MTIzMyAyIElOIElQNCAxMjcuMC4wLjFcXHJcXG4nICtcbiAgICAgICAgJ3M9LVxcclxcbicgK1xuICAgICAgICAndD0wIDBcXHJcXG4nICtcbiAgICAgICAgLyogQXVkaW8gKi9cbiAgICAgICAgKGNvbmZpZy51c2VCdW5kbGVcbiAgICAgICAgICAgID8gKCdhPWdyb3VwOkJVTkRMRSBhdWRpbyB2aWRlbycgK1xuICAgICAgICAgICAgICAgIChjb25maWcub3BlblNjdHAgPyAnIGRhdGEnIDogJycpICtcbiAgICAgICAgICAgICAgICdcXHJcXG4nKVxuICAgICAgICAgICAgOiAnJykgK1xuICAgICAgICAnbT1hdWRpbyAxIFJUUC9TQVZQRiAxMTEgMTAzIDEwNCAwIDggMTA2IDEwNSAxMyAxMjZcXHJcXG4nICtcbiAgICAgICAgJ2M9SU4gSVA0IDAuMC4wLjBcXHJcXG4nICtcbiAgICAgICAgJ2E9cnRjcDoxIElOIElQNCAwLjAuMC4wXFxyXFxuJyArXG4gICAgICAgICdhPW1pZDphdWRpb1xcclxcbicgK1xuICAgICAgICAnYT1leHRtYXA6MSB1cm46aWV0ZjpwYXJhbXM6cnRwLWhkcmV4dDpzc3JjLWF1ZGlvLWxldmVsXFxyXFxuJyArXG4gICAgICAgICdhPXNlbmRyZWN2XFxyXFxuJyArXG4gICAgICAgICdhPXJ0cG1hcDoxMTEgb3B1cy80ODAwMC8yXFxyXFxuJyArXG4gICAgICAgICdhPWZtdHA6MTExIG1pbnB0aW1lPTEwXFxyXFxuJyArXG4gICAgICAgICdhPXJ0cG1hcDoxMDMgSVNBQy8xNjAwMFxcclxcbicgK1xuICAgICAgICAnYT1ydHBtYXA6MTA0IElTQUMvMzIwMDBcXHJcXG4nICtcbiAgICAgICAgJ2E9cnRwbWFwOjAgUENNVS84MDAwXFxyXFxuJyArXG4gICAgICAgICdhPXJ0cG1hcDo4IFBDTUEvODAwMFxcclxcbicgK1xuICAgICAgICAnYT1ydHBtYXA6MTA2IENOLzMyMDAwXFxyXFxuJyArXG4gICAgICAgICdhPXJ0cG1hcDoxMDUgQ04vMTYwMDBcXHJcXG4nICtcbiAgICAgICAgJ2E9cnRwbWFwOjEzIENOLzgwMDBcXHJcXG4nICtcbiAgICAgICAgJ2E9cnRwbWFwOjEyNiB0ZWxlcGhvbmUtZXZlbnQvODAwMFxcclxcbicgK1xuICAgICAgICAnYT1tYXhwdGltZTo2MFxcclxcbicgK1xuICAgICAgICAoY29uZmlnLnVzZVJ0Y3BNdXggPyAnYT1ydGNwLW11eFxcclxcbicgOiAnJykgK1xuICAgICAgICAvKiBWaWRlbyAqL1xuICAgICAgICAnbT12aWRlbyAxIFJUUC9TQVZQRiAxMDAgMTE2IDExN1xcclxcbicgK1xuICAgICAgICAnYz1JTiBJUDQgMC4wLjAuMFxcclxcbicgK1xuICAgICAgICAnYT1ydGNwOjEgSU4gSVA0IDAuMC4wLjBcXHJcXG4nICtcbiAgICAgICAgJ2E9bWlkOnZpZGVvXFxyXFxuJyArXG4gICAgICAgICdhPWV4dG1hcDoyIHVybjppZXRmOnBhcmFtczpydHAtaGRyZXh0OnRvZmZzZXRcXHJcXG4nICtcbiAgICAgICAgJ2E9ZXh0bWFwOjMgaHR0cDovL3d3dy53ZWJydGMub3JnL2V4cGVyaW1lbnRzL3J0cC1oZHJleHQvYWJzLXNlbmQtdGltZVxcclxcbicgK1xuICAgICAgICAnYT1zZW5kcmVjdlxcclxcbicgK1xuICAgICAgICAnYT1ydHBtYXA6MTAwIFZQOC85MDAwMFxcclxcbicgK1xuICAgICAgICAnYT1ydGNwLWZiOjEwMCBjY20gZmlyXFxyXFxuJyArXG4gICAgICAgICdhPXJ0Y3AtZmI6MTAwIG5hY2tcXHJcXG4nICtcbiAgICAgICAgJ2E9cnRjcC1mYjoxMDAgZ29vZy1yZW1iXFxyXFxuJyArXG4gICAgICAgICdhPXJ0cG1hcDoxMTYgcmVkLzkwMDAwXFxyXFxuJyArXG4gICAgICAgICdhPXJ0cG1hcDoxMTcgdWxwZmVjLzkwMDAwXFxyXFxuJyArXG4gICAgICAgIChjb25maWcudXNlUnRjcE11eCA/ICdhPXJ0Y3AtbXV4XFxyXFxuJyA6ICcnKSArXG4gICAgICAgIC8qIERhdGEgU0NUUCAqL1xuICAgICAgICAoY29uZmlnLm9wZW5TY3RwID9cbiAgICAgICAgICAgICdtPWFwcGxpY2F0aW9uIDEgRFRMUy9TQ1RQIDUwMDBcXHJcXG4nICtcbiAgICAgICAgICAgICdjPUlOIElQNCAwLjAuMC4wXFxyXFxuJyArXG4gICAgICAgICAgICAnYT1zY3RwbWFwOjUwMDAgd2VicnRjLWRhdGFjaGFubmVsXFxyXFxuJyArXG4gICAgICAgICAgICAnYT1taWQ6ZGF0YVxcclxcbidcbiAgICAgICAgICAgIDogJycpXG4gICAgKTtcblxuICAgIGJyaWRnZVNEUC5tZWRpYS5sZW5ndGggPSB0aGlzLm15Y2hhbm5lbC5sZW5ndGg7XG4gICAgdmFyIGNoYW5uZWw7XG4gICAgLypcbiAgICBmb3IgKGNoYW5uZWwgPSAwOyBjaGFubmVsIDwgYnJpZGdlU0RQLm1lZGlhLmxlbmd0aDsgY2hhbm5lbCsrKSB7XG4gICAgICAgIGJyaWRnZVNEUC5tZWRpYVtjaGFubmVsXSA9ICcnO1xuICAgICAgICAvLyB1bmNoYW5nZWQgbGluZXNcbiAgICAgICAgYnJpZGdlU0RQLm1lZGlhW2NoYW5uZWxdICs9IFNEUFV0aWwuZmluZF9saW5lKGxvY2FsU0RQLm1lZGlhW2NoYW5uZWxdLCAnbT0nKSArICdcXHJcXG4nO1xuICAgICAgICBicmlkZ2VTRFAubWVkaWFbY2hhbm5lbF0gKz0gU0RQVXRpbC5maW5kX2xpbmUobG9jYWxTRFAubWVkaWFbY2hhbm5lbF0sICdjPScpICsgJ1xcclxcbic7XG4gICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZShsb2NhbFNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9cnRjcDonKSkge1xuICAgICAgICAgICAgYnJpZGdlU0RQLm1lZGlhW2NoYW5uZWxdICs9IFNEUFV0aWwuZmluZF9saW5lKGxvY2FsU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1ydGNwOicpICsgJ1xcclxcbic7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKGxvY2FsU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1taWQ6JykpIHtcbiAgICAgICAgICAgIGJyaWRnZVNEUC5tZWRpYVtjaGFubmVsXSArPSBTRFBVdGlsLmZpbmRfbGluZShsb2NhbFNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9bWlkOicpICsgJ1xcclxcbic7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKGxvY2FsU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1zZW5kcmVjdicpKSB7XG4gICAgICAgICAgICBicmlkZ2VTRFAubWVkaWFbY2hhbm5lbF0gKz0gJ2E9c2VuZHJlY3ZcXHJcXG4nO1xuICAgICAgICB9XG4gICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZShsb2NhbFNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9ZXh0bWFwOicpKSB7XG4gICAgICAgICAgICBicmlkZ2VTRFAubWVkaWFbY2hhbm5lbF0gKz0gU0RQVXRpbC5maW5kX2xpbmVzKGxvY2FsU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1leHRtYXA6Jykuam9pbignXFxyXFxuJykgKyAnXFxyXFxuJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZJWE1FOiBzaG91bGQgbG9vayBhdCBtLWxpbmUgYW5kIGdyb3VwIHRoZSBpZHMgdG9nZXRoZXJcbiAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKGxvY2FsU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1ydHBtYXA6JykpIHtcbiAgICAgICAgICAgIGJyaWRnZVNEUC5tZWRpYVtjaGFubmVsXSArPSBTRFBVdGlsLmZpbmRfbGluZXMobG9jYWxTRFAubWVkaWFbY2hhbm5lbF0sICdhPXJ0cG1hcDonKS5qb2luKCdcXHJcXG4nKSArICdcXHJcXG4nO1xuICAgICAgICB9XG4gICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZShsb2NhbFNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9Zm10cDonKSkge1xuICAgICAgICAgICAgYnJpZGdlU0RQLm1lZGlhW2NoYW5uZWxdICs9IFNEUFV0aWwuZmluZF9saW5lcyhsb2NhbFNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9Zm10cDonKS5qb2luKCdcXHJcXG4nKSArICdcXHJcXG4nO1xuICAgICAgICB9XG4gICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZShsb2NhbFNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9cnRjcC1mYjonKSkge1xuICAgICAgICAgICAgYnJpZGdlU0RQLm1lZGlhW2NoYW5uZWxdICs9IFNEUFV0aWwuZmluZF9saW5lcyhsb2NhbFNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9cnRjcC1mYjonKS5qb2luKCdcXHJcXG4nKSArICdcXHJcXG4nO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZJWE1FOiBjaGFuZ2VkIGxpbmVzIC0tIGE9c2VuZHJlY3YgZGlyZWN0aW9uLCBhPXNldHVwIGRpcmVjdGlvblxuICAgIH1cbiAgICAqL1xuICAgIGZvciAoY2hhbm5lbCA9IDA7IGNoYW5uZWwgPCBicmlkZ2VTRFAubWVkaWEubGVuZ3RoOyBjaGFubmVsKyspIHtcbiAgICAgICAgLy8gZ2V0IHRoZSBtaXhlZCBzc3JjXG4gICAgICAgIHRtcCA9ICQodGhpcy5teWNoYW5uZWxbY2hhbm5lbF0pLmZpbmQoJz5zb3VyY2VbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6c3NtYTowXCJdJyk7XG4gICAgICAgIC8vIEZJWE1FOiBjaGVjayBydHAtbGV2ZWwtcmVsYXktdHlwZVxuXG4gICAgICAgIHZhciBuYW1lID0gYnJpZGdlU0RQLm1lZGlhW2NoYW5uZWxdLnNwbGl0KFwiIFwiKVswXS5zdWJzdHIoMik7IC8vICdtPWF1ZGlvIC4uLidcbiAgICAgICAgaWYgKG5hbWUgPT09ICdhdWRpbycgfHwgbmFtZSA9PT0gJ3ZpZGVvJykge1xuICAgICAgICAgICAgLy8gbWFrZSBjaHJvbWUgaGFwcHkuLi4gJzM3MzU5Mjg1NTknID09IDB4REVBREJFRUZcbiAgICAgICAgICAgIHZhciBzc3JjID0gdG1wLmxlbmd0aCA/IHRtcC5hdHRyKCdzc3JjJykgOiAnMzczNTkyODU1OSc7XG5cbiAgICAgICAgICAgIGJyaWRnZVNEUC5tZWRpYVtjaGFubmVsXSArPSAnYT1zc3JjOicgKyBzc3JjICsgJyBjbmFtZTptaXhlZFxcclxcbic7XG4gICAgICAgICAgICBicmlkZ2VTRFAubWVkaWFbY2hhbm5lbF0gKz0gJ2E9c3NyYzonICsgc3NyYyArICcgbGFiZWw6bWl4ZWRsYWJlbCcgKyBuYW1lICsgJzBcXHJcXG4nO1xuICAgICAgICAgICAgYnJpZGdlU0RQLm1lZGlhW2NoYW5uZWxdICs9ICdhPXNzcmM6JyArIHNzcmMgKyAnIG1zaWQ6bWl4ZWRtc2xhYmVsIG1peGVkbGFiZWwnICsgbmFtZSArICcwXFxyXFxuJztcbiAgICAgICAgICAgIGJyaWRnZVNEUC5tZWRpYVtjaGFubmVsXSArPSAnYT1zc3JjOicgKyBzc3JjICsgJyBtc2xhYmVsOm1peGVkbXNsYWJlbFxcclxcbic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGSVhNRTogc2hvdWxkIHRha2UgY29kZSBmcm9tIC5mcm9tSmluZ2xlXG4gICAgICAgIHZhciBjaGFubmVsQnVuZGxlSWQgPSAkKHRoaXMubXljaGFubmVsW2NoYW5uZWxdKS5hdHRyKCdjaGFubmVsLWJ1bmRsZS1pZCcpO1xuICAgICAgICBpZiAodHlwZW9mIGNoYW5uZWxCdW5kbGVJZCAhPSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdG1wID0gdGhpcy5idW5kbGVkVHJhbnNwb3J0c1tjaGFubmVsQnVuZGxlSWRdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdG1wID0gJCh0aGlzLm15Y2hhbm5lbFtjaGFubmVsXSkuZmluZCgnPnRyYW5zcG9ydFt4bWxucz1cInVybjp4bXBwOmppbmdsZTp0cmFuc3BvcnRzOmljZS11ZHA6MVwiXScpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRtcC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGJyaWRnZVNEUC5tZWRpYVtjaGFubmVsXSArPSAnYT1pY2UtdWZyYWc6JyArIHRtcC5hdHRyKCd1ZnJhZycpICsgJ1xcclxcbic7XG4gICAgICAgICAgICBicmlkZ2VTRFAubWVkaWFbY2hhbm5lbF0gKz0gJ2E9aWNlLXB3ZDonICsgdG1wLmF0dHIoJ3B3ZCcpICsgJ1xcclxcbic7XG4gICAgICAgICAgICB0bXAuZmluZCgnPmNhbmRpZGF0ZScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGJyaWRnZVNEUC5tZWRpYVtjaGFubmVsXSArPSBTRFBVdGlsLmNhbmRpZGF0ZUZyb21KaW5nbGUodGhpcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRtcCA9IHRtcC5maW5kKCc+ZmluZ2VycHJpbnQnKTtcbiAgICAgICAgICAgIGlmICh0bXAubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgYnJpZGdlU0RQLm1lZGlhW2NoYW5uZWxdICs9ICdhPWZpbmdlcnByaW50OicgKyB0bXAuYXR0cignaGFzaCcpICsgJyAnICsgdG1wLnRleHQoKSArICdcXHJcXG4nO1xuICAgICAgICAgICAgICAgIGJyaWRnZVNEUC5tZWRpYVtjaGFubmVsXSArPSAnYT1zZXR1cDphY3RwYXNzXFxyXFxuJzsgLy8gb2ZmZXIgc28gYWx3YXlzIGFjdHBhc3NcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBicmlkZ2VTRFAucmF3ID0gYnJpZGdlU0RQLnNlc3Npb24gKyBicmlkZ2VTRFAubWVkaWEuam9pbignJyk7XG4gICAgdmFyIGJyaWRnZURlc2MgPSBuZXcgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKHt0eXBlOiAnb2ZmZXInLCBzZHA6IGJyaWRnZVNEUC5yYXd9KTtcbiAgICB2YXIgc2ltdWxjYXN0ID0gbmV3IFNpbXVsY2FzdCgpO1xuICAgIHZhciBicmlkZ2VEZXNjID0gc2ltdWxjYXN0LnRyYW5zZm9ybVJlbW90ZURlc2NyaXB0aW9uKGJyaWRnZURlc2MpO1xuXG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5zZXRSZW1vdGVEZXNjcmlwdGlvbihicmlkZ2VEZXNjLFxuICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc2V0UmVtb3RlRGVzY3JpcHRpb24gc3VjY2VzcycpO1xuICAgICAgICAgICAgc2VsZi5wZWVyY29ubmVjdGlvbi5jcmVhdGVBbnN3ZXIoXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnBlZXJjb25uZWN0aW9uLnNldExvY2FsRGVzY3JpcHRpb24oYW5zd2VyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzZXRMb2NhbERlc2NyaXB0aW9uIHN1Y2NlZWRlZC4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBtYWtlIHN1cmUgb3VyIHByZXNlbmNlIGlzIHVwZGF0ZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnNldExvY2FsRGVzY3JpcHRpb24oc2VsZi5zaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBlbGVtID0gJGlxKHt0bzogc2VsZi5icmlkZ2VqaWQsIHR5cGU6ICdnZXQnfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5jKCdjb25mZXJlbmNlJywge3htbG5zOiAnaHR0cDovL2ppdHNpLm9yZy9wcm90b2NvbC9jb2xpYnJpJywgaWQ6IHNlbGYuY29uZmlkfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxvY2FsU0RQID0gbmV3IFNEUChzZWxmLnBlZXJjb25uZWN0aW9uLmxvY2FsRGVzY3JpcHRpb24uc2RwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhbFNEUC5tZWRpYS5mb3JFYWNoKGZ1bmN0aW9uIChtZWRpYSwgY2hhbm5lbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IFNEUFV0aWwucGFyc2VfbWlkKFNEUFV0aWwuZmluZF9saW5lKG1lZGlhLCAnYT1taWQ6JykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmMoJ2NvbnRlbnQnLCB7bmFtZTogbmFtZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWxpbmUgPSBTRFBVdGlsLnBhcnNlX21saW5lKG1lZGlhLnNwbGl0KCdcXHJcXG4nKVswXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuYW1lICE9PSAnZGF0YScpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uYygnY2hhbm5lbCcsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbml0aWF0b3I6ICd0cnVlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBpcmU6IHNlbGYuY2hhbm5lbEV4cGlyZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZDogc2VsZi5teWNoYW5uZWxbY2hhbm5lbF0uYXR0cignaWQnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmRwb2ludDogc2VsZi5teU11Y1Jlc291cmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2lnbmFsICh0aHJvdWdoIENPTElCUkkpIHRvIHRoZSBicmlkZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBTU1JDIGdyb3VwcyBvZiB0aGUgcGFydGljaXBhbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoYXQgcGxheXMgdGhlIHJvbGUgb2YgdGhlIGZvY3VzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc3NyY19ncm91cF9saW5lcyA9IFNEUFV0aWwuZmluZF9saW5lcyhtZWRpYSwgJ2E9c3NyYy1ncm91cDonKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHggPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3NyY19ncm91cF9saW5lcy5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZHggPSBsaW5lLmluZGV4T2YoJyAnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2VtYW50aWNzID0gbGluZS5zdWJzdHIoMCwgaWR4KS5zdWJzdHIoMTMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzc3JjcyA9IGxpbmUuc3Vic3RyKDE0ICsgc2VtYW50aWNzLmxlbmd0aCkuc3BsaXQoJyAnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3NyY3MubGVuZ3RoICE9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5jKCdzc3JjLWdyb3VwJywgeyBzZW1hbnRpY3M6IHNlbWFudGljcywgeG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6c3NtYTowJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3NyY3MuZm9yRWFjaChmdW5jdGlvbihzc3JjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmMoJ3NvdXJjZScsIHsgc3NyYzogc3NyYyB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC51cCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS51cCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IHNob3VsZCByZXVzZSBjb2RlIGZyb20gLnRvSmluZ2xlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG1saW5lLmZtdC5sZW5ndGg7IGorKylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcnRwbWFwID0gU0RQVXRpbC5maW5kX2xpbmUobWVkaWEsICdhPXJ0cG1hcDonICsgbWxpbmUuZm10W2pdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocnRwbWFwKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5jKCdwYXlsb2FkLXR5cGUnLCBTRFBVdGlsLnBhcnNlX3J0cG1hcChydHBtYXApKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS51cCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzY3RwbWFwID0gU0RQVXRpbC5maW5kX2xpbmUobWVkaWEsICdhPXNjdHBtYXA6JyArIG1saW5lLmZtdFswXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2N0cFBvcnQgPSBTRFBVdGlsLnBhcnNlX3NjdHBtYXAoc2N0cG1hcClbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmMoXCJzY3RwY29ubmVjdGlvblwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5pdGlhdG9yOiAndHJ1ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGlyZTogc2VsZi5jaGFubmVsRXhwaXJlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZDogc2VsZi5teWNoYW5uZWxbY2hhbm5lbF0uYXR0cignaWQnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kcG9pbnQ6IHNlbGYubXlNdWNSZXNvdXJjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9ydDogc2N0cFBvcnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxTRFAuVHJhbnNwb3J0VG9KaW5nbGUoY2hhbm5lbCwgZWxlbSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS51cCgpOyAvLyBlbmQgb2YgY2hhbm5lbFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLnVwKCk7IC8vIGVuZCBvZiBjb250ZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmNvbm5lY3Rpb24uc2VuZElRKGVsZW0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIC4uLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJFUlJPUiBzZW5kaW5nIGNvbGlicmkgbWVzc2FnZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yLCBlbGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBub3cgaW5pdGlhdGUgc2Vzc2lvbnNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG51bXBhcnRpY2lwYW50czsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuaW5pdGlhdGUoc2VsZi5wZWVyc1tpXSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm90aWZ5IHdlJ3ZlIGNyZWF0ZWQgdGhlIGNvbmZlcmVuY2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmV2ZW50RW1pdHRlci5lbWl0KFhNUFBFdmVudHMuQ09ORkVSRU5DRV9DRVJBVEVELCBzZWxmKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ3NldExvY2FsRGVzY3JpcHRpb24gZmFpbGVkLicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ2NyZWF0ZUFuc3dlciBmYWlsZWQuJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1wYXJ0aWNpcGFudHM7IGkrKykge1xuICAgICAgICAgICAgICAgIHNlbGYuaW5pdGlhdGUoc2VsZi5wZWVyc1tpXSwgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAqL1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzZXRSZW1vdGVEZXNjcmlwdGlvbiBmYWlsZWQuJywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgKTtcblxufTtcblxuLy8gc2VuZCBhIHNlc3Npb24taW5pdGlhdGUgdG8gYSBuZXcgcGFydGljaXBhbnRcbkNvbGlicmlGb2N1cy5wcm90b3R5cGUuaW5pdGlhdGUgPSBmdW5jdGlvbiAocGVlciwgaXNJbml0aWF0b3IpIHtcbiAgICB2YXIgcGFydGljaXBhbnQgPSB0aGlzLnBlZXJzLmluZGV4T2YocGVlcik7XG4gICAgY29uc29sZS5sb2coJ3RlbGwnLCBwZWVyLCBwYXJ0aWNpcGFudCk7XG4gICAgdmFyIHNkcDtcbiAgICBpZiAodGhpcy5wZWVyY29ubmVjdGlvbiAhPT0gbnVsbCAmJiB0aGlzLnBlZXJjb25uZWN0aW9uLnNpZ25hbGluZ1N0YXRlID09ICdzdGFibGUnKSB7XG4gICAgICAgIHNkcCA9IG5ldyBTRFAodGhpcy5wZWVyY29ubmVjdGlvbi5yZW1vdGVEZXNjcmlwdGlvbi5zZHApO1xuICAgICAgICB2YXIgbG9jYWxTRFAgPSBuZXcgU0RQKHRoaXMucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbi5zZHApO1xuICAgICAgICAvLyB0aHJvdyBhd2F5IHN0dWZmIHdlIGRvbid0IHdhbnRcbiAgICAgICAgLy8gbm90IG5lZWRlZCB3aXRoIHN0YXRpYyBvZmZlclxuICAgICAgICBpZiAoIWNvbmZpZy51c2VCdW5kbGUpIHtcbiAgICAgICAgICAgIHNkcC5yZW1vdmVTZXNzaW9uTGluZXMoJ2E9Z3JvdXA6Jyk7XG4gICAgICAgIH1cbiAgICAgICAgc2RwLnJlbW92ZVNlc3Npb25MaW5lcygnYT1tc2lkLXNlbWFudGljOicpOyAvLyBGSVhNRTogbm90IG1hcHBlZCBvdmVyIGppbmdsZSBhbnl3YXkuLi5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZHAubWVkaWEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICghY29uZmlnLnVzZVJ0Y3BNdXgpe1xuICAgICAgICAgICAgICAgIHNkcC5yZW1vdmVNZWRpYUxpbmVzKGksICdhPXJ0Y3AtbXV4Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZHAucmVtb3ZlTWVkaWFMaW5lcyhpLCAnYT1zc3JjOicpO1xuICAgICAgICAgICAgc2RwLnJlbW92ZU1lZGlhTGluZXMoaSwgJ2E9c3NyYy1ncm91cDonKTtcbiAgICAgICAgICAgIHNkcC5yZW1vdmVNZWRpYUxpbmVzKGksICdhPWNyeXB0bzonKTtcbiAgICAgICAgICAgIHNkcC5yZW1vdmVNZWRpYUxpbmVzKGksICdhPWNhbmRpZGF0ZTonKTtcbiAgICAgICAgICAgIHNkcC5yZW1vdmVNZWRpYUxpbmVzKGksICdhPWljZS1vcHRpb25zOmdvb2dsZS1pY2UnKTtcbiAgICAgICAgICAgIHNkcC5yZW1vdmVNZWRpYUxpbmVzKGksICdhPWljZS11ZnJhZzonKTtcbiAgICAgICAgICAgIHNkcC5yZW1vdmVNZWRpYUxpbmVzKGksICdhPWljZS1wd2Q6Jyk7XG4gICAgICAgICAgICBzZHAucmVtb3ZlTWVkaWFMaW5lcyhpLCAnYT1maW5nZXJwcmludDonKTtcbiAgICAgICAgICAgIHNkcC5yZW1vdmVNZWRpYUxpbmVzKGksICdhPXNldHVwOicpO1xuXG4gICAgICAgICAgICBpZiAoMSkgeyAvL2kgPiAwKSB7IC8vIG5vdCBmb3IgYXVkaW8gRklYTUU6IGRvZXMgbm90IHdvcmsgYXMgaW50ZW5kZWRcbiAgICAgICAgICAgICAgICAvLyByZS1hZGQgYWxsIHJlbW90ZSBhPXNzcmNzIF9hbmRfIGE9c3NyYy1ncm91cFxuICAgICAgICAgICAgICAgIGZvciAodmFyIGppZCBpbiB0aGlzLnJlbW90ZXNzcmMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGppZCA9PSBwZWVyIHx8ICF0aGlzLnJlbW90ZXNzcmNbamlkXVtpXSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICBzZHAubWVkaWFbaV0gKz0gdGhpcy5yZW1vdGVzc3JjW2ppZF1baV07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gYWRkIGxvY2FsIGE9c3NyYy1ncm91cDogbGluZXNcbiAgICAgICAgICAgICAgICBsaW5lcyA9IFNEUFV0aWwuZmluZF9saW5lcyhsb2NhbFNEUC5tZWRpYVtpXSwgJ2E9c3NyYy1ncm91cDonKTtcbiAgICAgICAgICAgICAgICBpZiAobGluZXMubGVuZ3RoICE9IDApXG4gICAgICAgICAgICAgICAgICAgIHNkcC5tZWRpYVtpXSArPSBsaW5lcy5qb2luKCdcXHJcXG4nKSArICdcXHJcXG4nO1xuXG4gICAgICAgICAgICAgICAgLy8gYW5kIGxvY2FsIGE9c3NyYzogbGluZXNcbiAgICAgICAgICAgICAgICBzZHAubWVkaWFbaV0gKz0gU0RQVXRpbC5maW5kX2xpbmVzKGxvY2FsU0RQLm1lZGlhW2ldLCAnYT1zc3JjOicpLmpvaW4oJ1xcclxcbicpICsgJ1xcclxcbic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc2RwLnJhdyA9IHNkcC5zZXNzaW9uICsgc2RwLm1lZGlhLmpvaW4oJycpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ2NhbiBub3QgaW5pdGlhdGUgYSBuZXcgc2Vzc2lvbiB3aXRob3V0IGEgc3RhYmxlIHBlZXJjb25uZWN0aW9uJyk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBhZGQgc3R1ZmYgd2UgZ290IGZyb20gdGhlIGJyaWRnZVxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgc2RwLm1lZGlhLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciBjaGFuID0gJCh0aGlzLmNoYW5uZWxzW3BhcnRpY2lwYW50XVtqXSk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdjaGFubmVsIGlkJywgY2hhbi5hdHRyKCdpZCcpKTtcblxuICAgICAgICB0bXAgPSBjaGFuLmZpbmQoJz5zb3VyY2VbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6c3NtYTowXCJdJyk7XG5cbiAgICAgICAgdmFyIG5hbWUgPSBzZHAubWVkaWFbal0uc3BsaXQoXCIgXCIpWzBdLnN1YnN0cigyKTsgLy8gJ209YXVkaW8gLi4uJ1xuICAgICAgICBpZiAobmFtZSA9PT0gJ2F1ZGlvJyB8fCBuYW1lID09PSAndmlkZW8nKSB7XG4gICAgICAgICAgICAvLyBtYWtlIGNocm9tZSBoYXBweS4uLiAnMzczNTkyODU1OScgPT0gMHhERUFEQkVFRlxuICAgICAgICAgICAgdmFyIHNzcmMgPSB0bXAubGVuZ3RoID8gdG1wLmF0dHIoJ3NzcmMnKSA6ICczNzM1OTI4NTU5JztcblxuICAgICAgICAgICAgc2RwLm1lZGlhW2pdICs9ICdhPXNzcmM6JyArIHNzcmMgKyAnIGNuYW1lOm1peGVkXFxyXFxuJztcbiAgICAgICAgICAgIHNkcC5tZWRpYVtqXSArPSAnYT1zc3JjOicgKyBzc3JjICsgJyBsYWJlbDptaXhlZGxhYmVsJyArIG5hbWUgKyAnMFxcclxcbic7XG4gICAgICAgICAgICBzZHAubWVkaWFbal0gKz0gJ2E9c3NyYzonICsgc3NyYyArICcgbXNpZDptaXhlZG1zbGFiZWwgbWl4ZWRsYWJlbCcgKyBuYW1lICsgJzBcXHJcXG4nO1xuICAgICAgICAgICAgc2RwLm1lZGlhW2pdICs9ICdhPXNzcmM6JyArIHNzcmMgKyAnIG1zbGFiZWw6bWl4ZWRtc2xhYmVsXFxyXFxuJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluIHRoZSBjYXNlIG9mIGJ1bmRsZSwgd2UgYWRkIGVhY2ggY2FuZGlkYXRlIHRvIGFsbCBtPSBsaW5lcy9qaW5nbGUgY29udGVudHMsXG4gICAgICAgIC8vIGp1c3QgYXMgY2hyb21lIGRvZXNcbiAgICAgICAgaWYgKGNvbmZpZy51c2VCdW5kbGUpe1xuICAgICAgICAgICAgdG1wID0gdGhpcy5idW5kbGVkVHJhbnNwb3J0c1tjaGFuLmF0dHIoJ2NoYW5uZWwtYnVuZGxlLWlkJyldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdG1wID0gY2hhbi5maW5kKCc+dHJhbnNwb3J0W3htbG5zPVwidXJuOnhtcHA6amluZ2xlOnRyYW5zcG9ydHM6aWNlLXVkcDoxXCJdJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG1wLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHRtcC5hdHRyKCd1ZnJhZycpKVxuICAgICAgICAgICAgICAgIHNkcC5tZWRpYVtqXSArPSAnYT1pY2UtdWZyYWc6JyArIHRtcC5hdHRyKCd1ZnJhZycpICsgJ1xcclxcbic7XG4gICAgICAgICAgICBpZiAodG1wLmF0dHIoJ3B3ZCcpKVxuICAgICAgICAgICAgICAgIHNkcC5tZWRpYVtqXSArPSAnYT1pY2UtcHdkOicgKyB0bXAuYXR0cigncHdkJykgKyAnXFxyXFxuJztcbiAgICAgICAgICAgIC8vIGFuZCB0aGUgY2FuZGlkYXRlcy4uLlxuICAgICAgICAgICAgdG1wLmZpbmQoJz5jYW5kaWRhdGUnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzZHAubWVkaWFbal0gKz0gU0RQVXRpbC5jYW5kaWRhdGVGcm9tSmluZ2xlKHRoaXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0bXAgPSB0bXAuZmluZCgnPmZpbmdlcnByaW50Jyk7XG4gICAgICAgICAgICBpZiAodG1wLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHNkcC5tZWRpYVtqXSArPSAnYT1maW5nZXJwcmludDonICsgdG1wLmF0dHIoJ2hhc2gnKSArICcgJyArIHRtcC50ZXh0KCkgKyAnXFxyXFxuJztcbiAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgIGlmICh0bXAuYXR0cignZGlyZWN0aW9uJykpIHtcbiAgICAgICAgICAgICAgICAgICAgc2RwLm1lZGlhW2pdICs9ICdhPXNldHVwOicgKyB0bXAuYXR0cignZGlyZWN0aW9uJykgKyAnXFxyXFxuJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBzZHAubWVkaWFbal0gKz0gJ2E9c2V0dXA6YWN0cGFzc1xcclxcbic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gbWFrZSBhIG5ldyBjb2xpYnJpIHNlc3Npb24gYW5kIGNvbmZpZ3VyZSBpdFxuICAgIC8vIEZJWE1FOiBpcyBpdCBjb3JyZWN0IHRvIHVzZSB0aGlzLmNvbm5lY3Rpb24uamlkIHdoZW4gdXNlZCBpbiBhIE1VQz9cbiAgICB2YXIgc2VzcyA9IG5ldyBDb2xpYnJpU2Vzc2lvbih0aGlzLmNvbm5lY3Rpb24uamlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCAxMiksIC8vIHJhbmRvbSBzdHJpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24pO1xuICAgIHNlc3MuaW5pdGlhdGUocGVlcik7XG4gICAgc2Vzcy5jb2xpYnJpID0gdGhpcztcbiAgICAvLyBXZSBkbyBub3QgYW5ub3VuY2Ugb3VyIGF1ZGlvIHBlciBjb25mZXJlbmNlIHBlZXIsIHNvIG9ubHkgdmlkZW8gaXMgc2V0IGhlcmVcbiAgICBzZXNzLmxvY2FsVmlkZW8gPSBSVENBY3RpdmF0b3IuZ2V0UlRDU2VydmljZSgpLmxvY2FsVmlkZW87XG4gICAgc2Vzcy5tZWRpYV9jb25zdHJhaW50cyA9IHRoaXMuY29ubmVjdGlvbi5qaW5nbGUubWVkaWFfY29uc3RyYWludHM7XG4gICAgc2Vzcy5wY19jb25zdHJhaW50cyA9IHRoaXMuY29ubmVjdGlvbi5qaW5nbGUucGNfY29uc3RyYWludHM7XG4gICAgc2Vzcy5pY2VfY29uZmlnID0gdGhpcy5jb25uZWN0aW9uLmppbmdsZS5pY2VfY29uZmlnO1xuXG4gICAgdGhpcy5jb25uZWN0aW9uLmppbmdsZS5zZXNzaW9uc1tzZXNzLnNpZF0gPSBzZXNzO1xuICAgIHRoaXMuY29ubmVjdGlvbi5qaW5nbGUuamlkMnNlc3Npb25bc2Vzcy5wZWVyamlkXSA9IHNlc3M7XG5cbiAgICAvLyBzZW5kIGEgc2Vzc2lvbi1pbml0aWF0ZVxuICAgIHZhciBpbml0ID0gJGlxKHt0bzogcGVlciwgdHlwZTogJ3NldCd9KVxuICAgICAgICAuYygnamluZ2xlJyxcbiAgICAgICAgICAgIHt4bWxuczogJ3Vybjp4bXBwOmppbmdsZToxJyxcbiAgICAgICAgICAgICBhY3Rpb246ICdzZXNzaW9uLWluaXRpYXRlJyxcbiAgICAgICAgICAgICBpbml0aWF0b3I6IHNlc3MubWUsXG4gICAgICAgICAgICAgc2lkOiBzZXNzLnNpZFxuICAgICAgICAgICAgfVxuICAgICk7XG4gICAgc2RwLnRvSmluZ2xlKGluaXQsICdpbml0aWF0b3InKTtcbiAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKGluaXQsXG4gICAgICAgIGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnb3QgcmVzdWx0Jyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnb3QgZXJyb3InKTtcbiAgICAgICAgfVxuICAgICk7XG59O1xuXG4vLyBwdWxsIGluIGEgbmV3IHBhcnRpY2lwYW50IGludG8gdGhlIGNvbmZlcmVuY2VcbkNvbGlicmlGb2N1cy5wcm90b3R5cGUuYWRkTmV3UGFydGljaXBhbnQgPSBmdW5jdGlvbiAocGVlcikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAodGhpcy5jb25maWQgPT09IDAgfHwgIXRoaXMucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbilcbiAgICB7XG4gICAgICAgIC8vIGJhZCBzdGF0ZVxuICAgICAgICBpZiAodGhpcy5jb25maWQgPT09IDApXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2NvbmZpZCBkb2VzIG5vdCBleGlzdCB5ZXQsIHBvc3Rwb25pbmcnLCBwZWVyKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2xvY2FsIGRlc2NyaXB0aW9uIG5vdCByZWFkeSB5ZXQsIHBvc3Rwb25pbmcnLCBwZWVyKTtcbiAgICAgICAgfVxuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7IHNlbGYuYWRkTmV3UGFydGljaXBhbnQocGVlcik7IH0sIDI1MCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGluZGV4ID0gdGhpcy5jaGFubmVscy5sZW5ndGg7XG4gICAgdGhpcy5jaGFubmVscy5wdXNoKFtdKTtcbiAgICB0aGlzLnBlZXJzLnB1c2gocGVlcik7XG5cbiAgICB2YXIgZWxlbSA9ICRpcSh7dG86IHRoaXMuYnJpZGdlamlkLCB0eXBlOiAnZ2V0J30pO1xuICAgIGVsZW0uYyhcbiAgICAgICAgJ2NvbmZlcmVuY2UnLFxuICAgICAgICB7IHhtbG5zOiAnaHR0cDovL2ppdHNpLm9yZy9wcm90b2NvbC9jb2xpYnJpJywgaWQ6IHRoaXMuY29uZmlkIH0pO1xuICAgIHZhciBsb2NhbFNEUCA9IG5ldyBTRFAodGhpcy5wZWVyY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uLnNkcCk7XG4gICAgbG9jYWxTRFAubWVkaWEuZm9yRWFjaChmdW5jdGlvbiAobWVkaWEsIGNoYW5uZWwpIHtcbiAgICAgICAgdmFyIG5hbWUgPSBTRFBVdGlsLnBhcnNlX21pZChTRFBVdGlsLmZpbmRfbGluZShtZWRpYSwgJ2E9bWlkOicpKTtcbiAgICAgICAgdmFyIGVsZW1OYW1lO1xuICAgICAgICB2YXIgZW5kcG9pbnRJZCA9IHBlZXIuc3Vic3RyKDEgKyBwZWVyLmxhc3RJbmRleE9mKCcvJykpO1xuICAgICAgICB2YXIgZWxlbUF0dHJzXG4gICAgICAgICAgICA9IHtcbiAgICAgICAgICAgICAgICBpbml0aWF0b3I6ICd0cnVlJyxcbiAgICAgICAgICAgICAgICBleHBpcmU6IHNlbGYuY2hhbm5lbEV4cGlyZSxcbiAgICAgICAgICAgICAgICBlbmRwb2ludDogZW5kcG9pbnRJZFxuICAgICAgICAgICAgfTtcbiAgICAgICAgaWYgKGNvbmZpZy51c2VCdW5kbGUpIHtcbiAgICAgICAgICAgIGVsZW1BdHRyc1snY2hhbm5lbC1idW5kbGUtaWQnXSA9IGVuZHBvaW50SWQ7XG4gICAgICAgIH1cblxuXG4gICAgICAgIGlmICgnZGF0YScgPT0gbmFtZSlcbiAgICAgICAge1xuICAgICAgICAgICAgZWxlbU5hbWUgPSAnc2N0cGNvbm5lY3Rpb24nO1xuICAgICAgICAgICAgZWxlbUF0dHJzWydwb3J0J10gPSA1MDAwO1xuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAge1xuICAgICAgICAgICAgZWxlbU5hbWUgPSAnY2hhbm5lbCc7XG4gICAgICAgICAgICBpZiAoKCd2aWRlbycgPT09IG5hbWUpICYmIChzZWxmLmNoYW5uZWxMYXN0TiA+PSAwKSlcbiAgICAgICAgICAgICAgICBlbGVtQXR0cnNbJ2xhc3QtbiddID0gc2VsZi5jaGFubmVsTGFzdE47XG4gICAgICAgIH1cblxuICAgICAgICBlbGVtLmMoJ2NvbnRlbnQnLCB7IG5hbWU6IG5hbWUgfSk7XG4gICAgICAgIGVsZW0uYyhlbGVtTmFtZSwgZWxlbUF0dHJzKTtcbiAgICAgICAgZWxlbS51cCgpOyAvLyBlbmQgb2YgY2hhbm5lbC9zY3RwY29ubmVjdGlvblxuICAgICAgICBlbGVtLnVwKCk7IC8vIGVuZCBvZiBjb250ZW50XG4gICAgfSk7XG5cbiAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKGVsZW0sXG4gICAgICAgIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgIHZhciBjb250ZW50cyA9ICQocmVzdWx0KS5maW5kKCc+Y29uZmVyZW5jZT5jb250ZW50JykuZ2V0KCk7XG4gICAgICAgICAgICB2YXIgaTtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBjb250ZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBjaGFubmVsWG1sID0gJChjb250ZW50c1tpXSkuZmluZCgnPmNoYW5uZWwnKTtcbiAgICAgICAgICAgICAgICBpZiAoY2hhbm5lbFhtbC5sZW5ndGgpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0bXAgPSBjaGFubmVsWG1sLmdldCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0bXAgPSAkKGNvbnRlbnRzW2ldKS5maW5kKCc+c2N0cGNvbm5lY3Rpb24nKS5nZXQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2VsZi5jaGFubmVsc1tpbmRleF1baV0gPSB0bXBbMF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgY2hhbm5lbEJ1bmRsZXMgPSAkKHJlc3VsdCkuZmluZCgnPmNvbmZlcmVuY2U+Y2hhbm5lbC1idW5kbGUnKTtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBjaGFubmVsQnVuZGxlcy5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgZW5kcG9pbnRJZCA9ICQoY2hhbm5lbEJ1bmRsZXNbaV0pLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAgICAgc2VsZi5idW5kbGVkVHJhbnNwb3J0c1tlbmRwb2ludElkXSA9ICQoY2hhbm5lbEJ1bmRsZXNbaV0pLmZpbmQoJz50cmFuc3BvcnRbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6dHJhbnNwb3J0czppY2UtdWRwOjFcIl0nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlbGYuaW5pdGlhdGUocGVlciwgdHJ1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGVycm9yKTtcbiAgICAgICAgfVxuICAgICk7XG59O1xuXG4vLyB1cGRhdGUgdGhlIGNoYW5uZWwgZGVzY3JpcHRpb24gKHBheWxvYWQtdHlwZXMgKyBkdGxzIGZwKSBmb3IgYSBwYXJ0aWNpcGFudFxuQ29saWJyaUZvY3VzLnByb3RvdHlwZS51cGRhdGVDaGFubmVsID0gZnVuY3Rpb24gKHJlbW90ZVNEUCwgcGFydGljaXBhbnQpIHtcbiAgICBjb25zb2xlLmxvZygnY2hhbmdlIGFsbG9jYXRpb24gZm9yJywgdGhpcy5jb25maWQpO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgY2hhbmdlID0gJGlxKHt0bzogdGhpcy5icmlkZ2VqaWQsIHR5cGU6ICdzZXQnfSk7XG4gICAgY2hhbmdlLmMoJ2NvbmZlcmVuY2UnLCB7eG1sbnM6ICdodHRwOi8vaml0c2kub3JnL3Byb3RvY29sL2NvbGlicmknLCBpZDogdGhpcy5jb25maWR9KTtcbiAgICBmb3IgKGNoYW5uZWwgPSAwOyBjaGFubmVsIDwgdGhpcy5jaGFubmVsc1twYXJ0aWNpcGFudF0ubGVuZ3RoOyBjaGFubmVsKyspXG4gICAge1xuICAgICAgICBpZiAoIXJlbW90ZVNEUC5tZWRpYVtjaGFubmVsXSlcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgIHZhciBuYW1lID0gU0RQVXRpbC5wYXJzZV9taWQoU0RQVXRpbC5maW5kX2xpbmUocmVtb3RlU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1taWQ6JykpO1xuICAgICAgICBjaGFuZ2UuYygnY29udGVudCcsIHtuYW1lOiBuYW1lfSk7XG4gICAgICAgIGlmIChuYW1lICE9PSAnZGF0YScpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNoYW5nZS5jKCdjaGFubmVsJywge1xuICAgICAgICAgICAgICAgIGlkOiAkKHRoaXMuY2hhbm5lbHNbcGFydGljaXBhbnRdW2NoYW5uZWxdKS5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgICAgIGVuZHBvaW50OiAkKHRoaXMuY2hhbm5lbHNbcGFydGljaXBhbnRdW2NoYW5uZWxdKS5hdHRyKCdlbmRwb2ludCcpLFxuICAgICAgICAgICAgICAgIGV4cGlyZTogc2VsZi5jaGFubmVsRXhwaXJlXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gc2lnbmFsICh0aHJvdWdodCBDT0xJQlJJKSB0byB0aGUgYnJpZGdlIHRoZSBTU1JDIGdyb3VwcyBvZiB0aGlzXG4gICAgICAgICAgICAvLyBwYXJ0aWNpcGFudFxuICAgICAgICAgICAgdmFyIHNzcmNfZ3JvdXBfbGluZXMgPSBTRFBVdGlsLmZpbmRfbGluZXMocmVtb3RlU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1zc3JjLWdyb3VwOicpO1xuICAgICAgICAgICAgdmFyIGlkeCA9IDA7XG4gICAgICAgICAgICBzc3JjX2dyb3VwX2xpbmVzLmZvckVhY2goZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgICAgIGlkeCA9IGxpbmUuaW5kZXhPZignICcpO1xuICAgICAgICAgICAgICAgIHZhciBzZW1hbnRpY3MgPSBsaW5lLnN1YnN0cigwLCBpZHgpLnN1YnN0cigxMyk7XG4gICAgICAgICAgICAgICAgdmFyIHNzcmNzID0gbGluZS5zdWJzdHIoMTQgKyBzZW1hbnRpY3MubGVuZ3RoKS5zcGxpdCgnICcpO1xuICAgICAgICAgICAgICAgIGlmIChzc3Jjcy5sZW5ndGggIT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBjaGFuZ2UuYygnc3NyYy1ncm91cCcsIHsgc2VtYW50aWNzOiBzZW1hbnRpY3MsIHhtbG5zOiAndXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOnNzbWE6MCcgfSk7XG4gICAgICAgICAgICAgICAgICAgIHNzcmNzLmZvckVhY2goZnVuY3Rpb24oc3NyYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlLmMoJ3NvdXJjZScsIHsgc3NyYzogc3NyYyB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC51cCgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlLnVwKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhciBydHBtYXAgPSBTRFBVdGlsLmZpbmRfbGluZXMocmVtb3RlU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1ydHBtYXA6Jyk7XG4gICAgICAgICAgICBydHBtYXAuZm9yRWFjaChmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETzogdG9vIG11Y2ggY29weS1wYXN0ZVxuICAgICAgICAgICAgICAgIHZhciBydHBtYXAgPSBTRFBVdGlsLnBhcnNlX3J0cG1hcCh2YWwpO1xuICAgICAgICAgICAgICAgIGNoYW5nZS5jKCdwYXlsb2FkLXR5cGUnLCBydHBtYXApO1xuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgLy8gcHV0IGFueSAnYT1mbXRwOicgKyBtbGluZS5mbXRbal0gbGluZXMgaW50byA8cGFyYW0gbmFtZT1mb28gdmFsdWU9YmFyLz5cbiAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZShyZW1vdGVTRFAubWVkaWFbY2hhbm5lbF0sICdhPWZtdHA6JyArIHJ0cG1hcC5pZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdG1wID0gU0RQVXRpbC5wYXJzZV9mbXRwKFNEUFV0aWwuZmluZF9saW5lKHJlbW90ZVNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9Zm10cDonICsgcnRwbWFwLmlkKSk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgdG1wLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2UuYygncGFyYW1ldGVyJywgdG1wW2tdKS51cCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgY2hhbmdlLnVwKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBzY3RwbWFwID0gU0RQVXRpbC5maW5kX2xpbmUocmVtb3RlU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1zY3RwbWFwOicpO1xuICAgICAgICAgICAgY2hhbmdlLmMoJ3NjdHBjb25uZWN0aW9uJywge1xuICAgICAgICAgICAgICAgIGlkOiAkKHRoaXMuY2hhbm5lbHNbcGFydGljaXBhbnRdW2NoYW5uZWxdKS5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgICAgIGVuZHBvaW50OiAkKHRoaXMuY2hhbm5lbHNbcGFydGljaXBhbnRdW2NoYW5uZWxdKS5hdHRyKCdlbmRwb2ludCcpLFxuICAgICAgICAgICAgICAgIGV4cGlyZTogc2VsZi5jaGFubmVsRXhwaXJlLFxuICAgICAgICAgICAgICAgIHBvcnQ6IFNEUFV0aWwucGFyc2Vfc2N0cG1hcChzY3RwbWFwKVswXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gbm93IGFkZCB0cmFuc3BvcnRcbiAgICAgICAgcmVtb3RlU0RQLlRyYW5zcG9ydFRvSmluZ2xlKGNoYW5uZWwsIGNoYW5nZSk7XG5cbiAgICAgICAgY2hhbmdlLnVwKCk7IC8vIGVuZCBvZiBjaGFubmVsL3NjdHBjb25uZWN0aW9uXG4gICAgICAgIGNoYW5nZS51cCgpOyAvLyBlbmQgb2YgY29udGVudFxuICAgIH1cbiAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKGNoYW5nZSxcbiAgICAgICAgZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2dvdCByZXN1bHQnKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2dvdCBlcnJvcicpO1xuICAgICAgICB9XG4gICAgKTtcbn07XG5cbi8vIHRlbGwgZXZlcnlvbmUgYWJvdXQgYSBuZXcgcGFydGljaXBhbnRzIGE9c3NyYyBsaW5lcyAoaXNhZGQgaXMgdHJ1ZSlcbi8vIG9yIGEgbGVhdmluZyBwYXJ0aWNpcGFudHMgYT1zc3JjIGxpbmVzXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLnNlbmRTU1JDVXBkYXRlID0gZnVuY3Rpb24gKHNkcE1lZGlhU3NyY3MsIGZyb21KaWQsIGlzYWRkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMucGVlcnMuZm9yRWFjaChmdW5jdGlvbiAocGVlcmppZCkge1xuICAgICAgICBpZiAocGVlcmppZCA9PSBmcm9tSmlkKSByZXR1cm47XG4gICAgICAgIGNvbnNvbGUubG9nKCd0ZWxsJywgcGVlcmppZCwgJ2Fib3V0ICcgKyAoaXNhZGQgPyAnbmV3JyA6ICdyZW1vdmVkJykgKyAnIHNzcmNzIGZyb20nLCBmcm9tSmlkKTtcbiAgICAgICAgaWYgKCFzZWxmLnJlbW90ZXNzcmNbcGVlcmppZF0pIHtcbiAgICAgICAgICAgIC8vIEZJWE1FOiB0aGlzIHNob3VsZCBvbmx5IHNlbmQgdG8gcGFydGljaXBhbnRzIHRoYXQgYXJlIHN0YWJsZSwgaS5lLiB3aG8gaGF2ZSBzZW50IGEgc2Vzc2lvbi1hY2NlcHRcbiAgICAgICAgICAgIC8vIHBvc3NpYmx5LCB0aGlzLnJlbW90ZVNTUkNbc2Vzc2lvbi5wZWVyamlkXSBkb2VzIG5vdCBleGlzdCB5ZXRcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignZG8gd2UgcmVhbGx5IHdhbnQgdG8gYm90aGVyJywgcGVlcmppZCwgJ3dpdGggdXBkYXRlcyB5ZXQ/Jyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBlZXJzZXNzID0gc2VsZi5jb25uZWN0aW9uLmppbmdsZS5qaWQyc2Vzc2lvbltwZWVyamlkXTtcbiAgICAgICAgaWYoIXBlZXJzZXNzKXtcbiAgICAgICAgICAgIGNvbnNvbGUud2Fybignbm8gc2Vzc2lvbiB3aXRoIHBlZXI6ICcrcGVlcmppZCsnIHlldC4uLicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgc2VsZi5zZW5kU1NSQ1VwZGF0ZUlxKHNkcE1lZGlhU3NyY3MsIHBlZXJzZXNzLnNpZCwgcGVlcnNlc3MuaW5pdGlhdG9yLCBwZWVyamlkLCBpc2FkZCk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIE92ZXJyaWRlcyBTZXNzaW9uQmFzZS5hZGRTb3VyY2UuXG4gKlxuICogQHBhcmFtIGVsZW0gcHJvcHJpZXRhcnkgJ2FkZCBzb3VyY2UnIEppbmdsZSByZXF1ZXN0KFhNTCBub2RlKS5cbiAqIEBwYXJhbSBmcm9tSmlkIEpJRCBvZiB0aGUgcGFydGljaXBhbnQgdG8gd2hvbSBuZXcgc3NyY3MgYmVsb25nLlxuICovXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLmFkZFNvdXJjZSA9IGZ1bmN0aW9uIChlbGVtLCBmcm9tSmlkKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gRklYTUU6IGRpcnR5IHdhaXRpbmdcbiAgICBpZiAoIXRoaXMucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbilcbiAgICB7XG4gICAgICAgIGNvbnNvbGUud2FybihcImFkZFNvdXJjZSAtIGxvY2FsRGVzY3JpcHRpb24gbm90IHJlYWR5IHlldFwiKVxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBzZWxmLmFkZFNvdXJjZShlbGVtLCBmcm9tSmlkKTsgfSwgMjAwKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uYWRkU291cmNlKGVsZW0pO1xuXG4gICAgdmFyIHBlZXJTc3JjID0gdGhpcy5yZW1vdGVzc3JjW2Zyb21KaWRdO1xuICAgIC8vY29uc29sZS5sb2coXCJPbiBBRERcIiwgc2VsZi5hZGRzc3JjLCBwZWVyU3NyYyk7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5hZGRzc3JjLmZvckVhY2goZnVuY3Rpb24odmFsLCBpZHgpe1xuICAgICAgICBpZighcGVlclNzcmNbaWR4XSl7XG4gICAgICAgICAgICAvLyBhZGQgc3NyY1xuICAgICAgICAgICAgcGVlclNzcmNbaWR4XSA9IHZhbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmKHBlZXJTc3JjW2lkeF0uaW5kZXhPZih2YWwpID09IC0xKXtcbiAgICAgICAgICAgICAgICBwZWVyU3NyY1tpZHhdID0gcGVlclNzcmNbaWR4XSt2YWw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBvbGRSZW1vdGVTZHAgPSBuZXcgU0RQKHRoaXMucGVlcmNvbm5lY3Rpb24ucmVtb3RlRGVzY3JpcHRpb24uc2RwKTtcbiAgICB0aGlzLm1vZGlmeVNvdXJjZXMoZnVuY3Rpb24oKXtcbiAgICAgICAgLy8gTm90aWZ5IG90aGVyIHBhcnRpY2lwYW50cyBhYm91dCBhZGRlZCBzc3JjXG4gICAgICAgIHZhciByZW1vdGVTRFAgPSBuZXcgU0RQKHNlbGYucGVlcmNvbm5lY3Rpb24ucmVtb3RlRGVzY3JpcHRpb24uc2RwKTtcbiAgICAgICAgdmFyIG5ld1NTUkNzID0gb2xkUmVtb3RlU2RwLmdldE5ld01lZGlhKHJlbW90ZVNEUCk7XG4gICAgICAgIHNlbGYuc2VuZFNTUkNVcGRhdGUobmV3U1NSQ3MsIGZyb21KaWQsIHRydWUpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBPdmVycmlkZXMgU2Vzc2lvbkJhc2UucmVtb3ZlU291cmNlLlxuICpcbiAqIEBwYXJhbSBlbGVtIHByb3ByaWV0YXJ5ICdyZW1vdmUgc291cmNlJyBKaW5nbGUgcmVxdWVzdChYTUwgbm9kZSkuXG4gKiBAcGFyYW0gZnJvbUppZCBKSUQgb2YgdGhlIHBhcnRpY2lwYW50IHRvIHdob20gcmVtb3ZlZCBzc3JjcyBiZWxvbmcuXG4gKi9cbkNvbGlicmlGb2N1cy5wcm90b3R5cGUucmVtb3ZlU291cmNlID0gZnVuY3Rpb24gKGVsZW0sIGZyb21KaWQpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBGSVhNRTogZGlydHkgd2FpdGluZ1xuICAgIGlmICghc2VsZi5wZWVyY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uKVxuICAgIHtcbiAgICAgICAgY29uc29sZS53YXJuKFwicmVtb3ZlU291cmNlIC0gbG9jYWxEZXNjcmlwdGlvbiBub3QgcmVhZHkgeWV0XCIpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBzZWxmLnJlbW92ZVNvdXJjZShlbGVtLCBmcm9tSmlkKTsgfSwgMjAwKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24ucmVtb3ZlU291cmNlKGVsZW0pO1xuXG4gICAgdmFyIHBlZXJTc3JjID0gdGhpcy5yZW1vdGVzc3JjW2Zyb21KaWRdO1xuICAgIC8vY29uc29sZS5sb2coXCJPbiBSRU1PVkVcIiwgc2VsZi5yZW1vdmVzc3JjLCBwZWVyU3NyYyk7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5yZW1vdmVzc3JjLmZvckVhY2goZnVuY3Rpb24odmFsLCBpZHgpe1xuICAgICAgICBpZihwZWVyU3NyY1tpZHhdKXtcbiAgICAgICAgICAgIC8vIFJlbW92ZSBzc3JjXG4gICAgICAgICAgICBwZWVyU3NyY1tpZHhdID0gcGVlclNzcmNbaWR4XS5yZXBsYWNlKHZhbCwgJycpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgb2xkU0RQID0gbmV3IFNEUChzZWxmLnBlZXJjb25uZWN0aW9uLnJlbW90ZURlc2NyaXB0aW9uLnNkcCk7XG4gICAgdGhpcy5tb2RpZnlTb3VyY2VzKGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vIE5vdGlmeSBvdGhlciBwYXJ0aWNpcGFudHMgYWJvdXQgcmVtb3ZlZCBzc3JjXG4gICAgICAgIHZhciByZW1vdGVTRFAgPSBuZXcgU0RQKHNlbGYucGVlcmNvbm5lY3Rpb24ucmVtb3RlRGVzY3JpcHRpb24uc2RwKTtcbiAgICAgICAgdmFyIHJlbW92ZWRTU1JDcyA9IHJlbW90ZVNEUC5nZXROZXdNZWRpYShvbGRTRFApO1xuICAgICAgICBzZWxmLnNlbmRTU1JDVXBkYXRlKHJlbW92ZWRTU1JDcywgZnJvbUppZCwgZmFsc2UpO1xuICAgIH0pO1xufTtcblxuQ29saWJyaUZvY3VzLnByb3RvdHlwZS5zZXRSZW1vdGVEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uIChzZXNzaW9uLCBlbGVtLCBkZXNjdHlwZSkge1xuICAgIHZhciBwYXJ0aWNpcGFudCA9IHRoaXMucGVlcnMuaW5kZXhPZihzZXNzaW9uLnBlZXJqaWQpO1xuICAgIGNvbnNvbGUubG9nKCdDb2xpYnJpLnNldFJlbW90ZURlc2NyaXB0aW9uIGZyb20nLCBzZXNzaW9uLnBlZXJqaWQsIHBhcnRpY2lwYW50KTtcbiAgICB2YXIgcmVtb3RlU0RQID0gbmV3IFNEUCgnJyk7XG4gICAgdmFyIGNoYW5uZWw7XG4gICAgcmVtb3RlU0RQLmZyb21KaW5nbGUoZWxlbSk7XG5cbiAgICAvLyBBQ1QgMTogY2hhbmdlIGFsbG9jYXRpb24gb24gYnJpZGdlXG4gICAgdGhpcy51cGRhdGVDaGFubmVsKHJlbW90ZVNEUCwgcGFydGljaXBhbnQpO1xuXG4gICAgLy8gQUNUIDI6IHRlbGwgYW55b25lIGVsc2UgYWJvdXQgdGhlIG5ldyBTU1JDc1xuICAgIHRoaXMuc2VuZFNTUkNVcGRhdGUocmVtb3RlU0RQLmdldE1lZGlhU3NyY01hcCgpLCBzZXNzaW9uLnBlZXJqaWQsIHRydWUpO1xuXG4gICAgLy8gQUNUIDM6IG5vdGUgdGhlIFNTUkNzXG4gICAgdGhpcy5yZW1vdGVzc3JjW3Nlc3Npb24ucGVlcmppZF0gPSBbXTtcbiAgICBmb3IgKGNoYW5uZWwgPSAwOyBjaGFubmVsIDwgdGhpcy5jaGFubmVsc1twYXJ0aWNpcGFudF0ubGVuZ3RoOyBjaGFubmVsKyspIHtcbiAgICAgICAgLy9pZiAoY2hhbm5lbCA9PSAwKSBjb250aW51ZTsgRklYTUU6IGRvZXMgbm90IHdvcmsgYXMgaW50ZW5kZWRcbiAgICAgICAgaWYgKCFyZW1vdGVTRFAubWVkaWFbY2hhbm5lbF0pXG4gICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICB2YXIgbGluZXMgPSBTRFBVdGlsLmZpbmRfbGluZXMocmVtb3RlU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1zc3JjLWdyb3VwOicpO1xuICAgICAgICBpZiAobGluZXMubGVuZ3RoICE9IDApXG4gICAgICAgICAgICAvLyBwcmVwZW5kIHNzcmMtZ3JvdXBzXG4gICAgICAgICAgICB0aGlzLnJlbW90ZXNzcmNbc2Vzc2lvbi5wZWVyamlkXVtjaGFubmVsXSA9IGxpbmVzLmpvaW4oJ1xcclxcbicpICsgJ1xcclxcbic7XG5cbiAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lcyhyZW1vdGVTRFAubWVkaWFbY2hhbm5lbF0sICdhPXNzcmM6JykubGVuZ3RoKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoIXRoaXMucmVtb3Rlc3NyY1tzZXNzaW9uLnBlZXJqaWRdW2NoYW5uZWxdKVxuICAgICAgICAgICAgICAgIHRoaXMucmVtb3Rlc3NyY1tzZXNzaW9uLnBlZXJqaWRdW2NoYW5uZWxdID0gJyc7XG5cbiAgICAgICAgICAgIHRoaXMucmVtb3Rlc3NyY1tzZXNzaW9uLnBlZXJqaWRdW2NoYW5uZWxdICs9XG4gICAgICAgICAgICAgICAgU0RQVXRpbC5maW5kX2xpbmVzKHJlbW90ZVNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9c3NyYzonKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmpvaW4oJ1xcclxcbicpICsgJ1xcclxcbic7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBQ1QgNDogYWRkIG5ldyBhPXNzcmMgYW5kIHM9c3NyYy1ncm91cCBsaW5lcyB0byBsb2NhbCByZW1vdGVkZXNjcmlwdGlvblxuICAgIGZvciAoY2hhbm5lbCA9IDA7IGNoYW5uZWwgPCB0aGlzLmNoYW5uZWxzW3BhcnRpY2lwYW50XS5sZW5ndGg7IGNoYW5uZWwrKykge1xuICAgICAgICAvL2lmIChjaGFubmVsID09IDApIGNvbnRpbnVlOyBGSVhNRTogZG9lcyBub3Qgd29yayBhcyBpbnRlbmRlZFxuICAgICAgICBpZiAoIXJlbW90ZVNEUC5tZWRpYVtjaGFubmVsXSlcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgIHZhciBsaW5lcyA9IFNEUFV0aWwuZmluZF9saW5lcyhyZW1vdGVTRFAubWVkaWFbY2hhbm5lbF0sICdhPXNzcmMtZ3JvdXA6Jyk7XG4gICAgICAgIGlmIChsaW5lcy5sZW5ndGggIT0gMClcbiAgICAgICAgICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uZW5xdWV1ZUFkZFNzcmMoXG4gICAgICAgICAgICAgICAgY2hhbm5lbCwgU0RQVXRpbC5maW5kX2xpbmVzKHJlbW90ZVNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9c3NyYy1ncm91cDonKS5qb2luKCdcXHJcXG4nKSArICdcXHJcXG4nKTtcblxuICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmVzKHJlbW90ZVNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9c3NyYzonKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uZW5xdWV1ZUFkZFNzcmMoXG4gICAgICAgICAgICAgICAgY2hhbm5lbCxcbiAgICAgICAgICAgICAgICBTRFBVdGlsLmZpbmRfbGluZXMocmVtb3RlU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1zc3JjOicpLmpvaW4oJ1xcclxcbicpICsgJ1xcclxcbidcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5tb2RpZnlTb3VyY2VzKCk7XG59O1xuXG4vLyByZWxheSBpY2UgY2FuZGlkYXRlcyB0byBicmlkZ2UgdXNpbmcgdHJpY2tsZVxuQ29saWJyaUZvY3VzLnByb3RvdHlwZS5hZGRJY2VDYW5kaWRhdGUgPSBmdW5jdGlvbiAoc2Vzc2lvbiwgZWxlbSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcGFydGljaXBhbnQgPSB0aGlzLnBlZXJzLmluZGV4T2Yoc2Vzc2lvbi5wZWVyamlkKTtcbiAgICAvL2NvbnNvbGUubG9nKCdjaGFuZ2UgdHJhbnNwb3J0IGFsbG9jYXRpb24gZm9yJywgdGhpcy5jb25maWQsIHNlc3Npb24ucGVlcmppZCwgcGFydGljaXBhbnQpO1xuICAgIHZhciBjaGFuZ2UgPSAkaXEoe3RvOiB0aGlzLmJyaWRnZWppZCwgdHlwZTogJ3NldCd9KTtcbiAgICBjaGFuZ2UuYygnY29uZmVyZW5jZScsIHt4bWxuczogJ2h0dHA6Ly9qaXRzaS5vcmcvcHJvdG9jb2wvY29saWJyaScsIGlkOiB0aGlzLmNvbmZpZH0pO1xuICAgICQoZWxlbSkuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBuYW1lID0gJCh0aGlzKS5hdHRyKCduYW1lJyk7XG5cbiAgICAgICAgLy8gSWYgd2UgYXJlIHVzaW5nIGJ1bmRsZSwgYXVkaW8vdmlkZW8vZGF0YSBjaGFubmVsIHdpbGwgaGF2ZSB0aGUgc2FtZSBjYW5kaWRhdGVzLCBzbyBvbmx5IHNlbmQgdGhlbSBmb3JcbiAgICAgICAgLy8gdGhlIGF1ZGlvIGNoYW5uZWwuXG4gICAgICAgIGlmIChjb25maWcudXNlQnVuZGxlICYmIG5hbWUgIT09ICdhdWRpbycpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjaGFubmVsID0gbmFtZSA9PSAnYXVkaW8nID8gMCA6IDE7IC8vIEZJWE1FOiBzZWFyY2ggbWxpbmVpbmRleCBpbiBsb2NhbGRlc2NcbiAgICAgICAgaWYgKG5hbWUgIT0gJ2F1ZGlvJyAmJiBuYW1lICE9ICd2aWRlbycpXG4gICAgICAgICAgICBjaGFubmVsID0gMjsgLy8gbmFtZSA9PSAnZGF0YSdcblxuICAgICAgICBjaGFuZ2UuYygnY29udGVudCcsIHtuYW1lOiBuYW1lfSk7XG4gICAgICAgIGlmIChuYW1lICE9PSAnZGF0YScpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNoYW5nZS5jKCdjaGFubmVsJywge1xuICAgICAgICAgICAgICAgIGlkOiAkKHNlbGYuY2hhbm5lbHNbcGFydGljaXBhbnRdW2NoYW5uZWxdKS5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgICAgIGVuZHBvaW50OiAkKHNlbGYuY2hhbm5lbHNbcGFydGljaXBhbnRdW2NoYW5uZWxdKS5hdHRyKCdlbmRwb2ludCcpLFxuICAgICAgICAgICAgICAgIGV4cGlyZTogc2VsZi5jaGFubmVsRXhwaXJlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNoYW5nZS5jKCdzY3RwY29ubmVjdGlvbicsIHtcbiAgICAgICAgICAgICAgICBpZDogJChzZWxmLmNoYW5uZWxzW3BhcnRpY2lwYW50XVtjaGFubmVsXSkuYXR0cignaWQnKSxcbiAgICAgICAgICAgICAgICBlbmRwb2ludDogJChzZWxmLmNoYW5uZWxzW3BhcnRpY2lwYW50XVtjaGFubmVsXSkuYXR0cignZW5kcG9pbnQnKSxcbiAgICAgICAgICAgICAgICBleHBpcmU6IHNlbGYuY2hhbm5lbEV4cGlyZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgJCh0aGlzKS5maW5kKCc+dHJhbnNwb3J0JykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjaGFuZ2UuYygndHJhbnNwb3J0Jywge1xuICAgICAgICAgICAgICAgIHVmcmFnOiAkKHRoaXMpLmF0dHIoJ3VmcmFnJyksXG4gICAgICAgICAgICAgICAgcHdkOiAkKHRoaXMpLmF0dHIoJ3B3ZCcpLFxuICAgICAgICAgICAgICAgIHhtbG5zOiAkKHRoaXMpLmF0dHIoJ3htbG5zJylcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKGNvbmZpZy51c2VSdGNwTXV4XG4gICAgICAgICAgICAgICAgICAmJiAnY2hhbm5lbCcgPT09IGNoYW5nZS5ub2RlLnBhcmVudE5vZGUubm9kZU5hbWUpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2UuYygncnRjcC1tdXgnKS51cCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkKHRoaXMpLmZpbmQoJz5jYW5kaWRhdGUnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvKiBub3QgeWV0XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZ2V0QXR0cmlidXRlKCdwcm90b2NvbCcpID09ICd0Y3AnICYmIHRoaXMuZ2V0QXR0cmlidXRlKCdwb3J0JykgPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjaHJvbWUgZ2VuZXJhdGVzIFRDUCBjYW5kaWRhdGVzIHdpdGggcG9ydCAwXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB2YXIgbGluZSA9IFNEUFV0aWwuY2FuZGlkYXRlRnJvbUppbmdsZSh0aGlzKTtcbiAgICAgICAgICAgICAgICBjaGFuZ2UuYygnY2FuZGlkYXRlJywgU0RQVXRpbC5jYW5kaWRhdGVUb0ppbmdsZShsaW5lKSkudXAoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY2hhbmdlLnVwKCk7IC8vIGVuZCBvZiB0cmFuc3BvcnRcbiAgICAgICAgfSk7XG4gICAgICAgIGNoYW5nZS51cCgpOyAvLyBlbmQgb2YgY2hhbm5lbC9zY3RwY29ubmVjdGlvblxuICAgICAgICBjaGFuZ2UudXAoKTsgLy8gZW5kIG9mIGNvbnRlbnRcbiAgICB9KTtcbiAgICAvLyBGSVhNRTogbmVlZCB0byBjaGVjayBpZiB0aGVyZSBpcyBhdCBsZWFzdCBvbmUgY2FuZGlkYXRlIHdoZW4gZmlsdGVyaW5nIFRDUCBvbmVzXG4gICAgdGhpcy5jb25uZWN0aW9uLnNlbmRJUShjaGFuZ2UsXG4gICAgICAgIGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnb3QgcmVzdWx0Jyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2dvdCBlcnJvcicsIGVycik7XG4gICAgICAgIH1cbiAgICApO1xufTtcblxuLy8gc2VuZCBvdXIgb3duIGNhbmRpZGF0ZSB0byB0aGUgYnJpZGdlXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLnNlbmRJY2VDYW5kaWRhdGUgPSBmdW5jdGlvbiAoY2FuZGlkYXRlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vY29uc29sZS5sb2coJ2NhbmRpZGF0ZScsIGNhbmRpZGF0ZSk7XG4gICAgaWYgKCFjYW5kaWRhdGUpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2VuZCBvZiBjYW5kaWRhdGVzJyk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHRoaXMuZHJpcF9jb250YWluZXIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIC8vIHN0YXJ0IDIwbXMgY2FsbG91dFxuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChcbiAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5kcmlwX2NvbnRhaW5lci5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgICAgICAgICBzZWxmLnNlbmRJY2VDYW5kaWRhdGVzKHNlbGYuZHJpcF9jb250YWluZXIpO1xuICAgICAgICAgICAgICAgIHNlbGYuZHJpcF9jb250YWluZXIgPSBbXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAyMCk7XG4gICAgfVxuICAgIHRoaXMuZHJpcF9jb250YWluZXIucHVzaChjYW5kaWRhdGUpO1xufTtcblxuLy8gc29ydCBhbmQgc2VuZCBtdWx0aXBsZSBjYW5kaWRhdGVzXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLnNlbmRJY2VDYW5kaWRhdGVzID0gZnVuY3Rpb24gKGNhbmRpZGF0ZXMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG15Y2FuZHMgPSAkaXEoe3RvOiB0aGlzLmJyaWRnZWppZCwgdHlwZTogJ3NldCd9KTtcbiAgICBteWNhbmRzLmMoJ2NvbmZlcmVuY2UnLCB7eG1sbnM6ICdodHRwOi8vaml0c2kub3JnL3Byb3RvY29sL2NvbGlicmknLCBpZDogdGhpcy5jb25maWR9KTtcbiAgICAvLyBGSVhNRTogbXVsdGktY2FuZGlkYXRlIGxvZ2ljIGlzIHRha2VuIGZyb20gc3Ryb3BoZS5qaW5nbGUsIHNob3VsZCBiZSByZWZhY3RvcmVkIHRoZXJlXG4gICAgdmFyIGxvY2FsU0RQID0gbmV3IFNEUCh0aGlzLnBlZXJjb25uZWN0aW9uLmxvY2FsRGVzY3JpcHRpb24uc2RwKTtcbiAgICBmb3IgKHZhciBtaWQgPSAwOyBtaWQgPCBsb2NhbFNEUC5tZWRpYS5sZW5ndGg7IG1pZCsrKVxuICAgIHtcbiAgICAgICAgdmFyIGNhbmRzID0gY2FuZGlkYXRlcy5maWx0ZXIoZnVuY3Rpb24gKGVsKSB7IHJldHVybiBlbC5zZHBNTGluZUluZGV4ID09IG1pZDsgfSk7XG4gICAgICAgIGlmIChjYW5kcy5sZW5ndGggPiAwKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgbmFtZSA9IGNhbmRzWzBdLnNkcE1pZDtcbiAgICAgICAgICAgIG15Y2FuZHMuYygnY29udGVudCcsIHtuYW1lOiBuYW1lIH0pO1xuICAgICAgICAgICAgaWYgKG5hbWUgIT09ICdkYXRhJylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBteWNhbmRzLmMoJ2NoYW5uZWwnLCB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiAkKHRoaXMubXljaGFubmVsW2NhbmRzWzBdLnNkcE1MaW5lSW5kZXhdKS5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgICAgICAgICBlbmRwb2ludDogJCh0aGlzLm15Y2hhbm5lbFtjYW5kc1swXS5zZHBNTGluZUluZGV4XSkuYXR0cignZW5kcG9pbnQnKSxcbiAgICAgICAgICAgICAgICAgICAgZXhwaXJlOiBzZWxmLmNoYW5uZWxFeHBpcmVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBteWNhbmRzLmMoJ3NjdHBjb25uZWN0aW9uJywge1xuICAgICAgICAgICAgICAgICAgICBpZDogJCh0aGlzLm15Y2hhbm5lbFtjYW5kc1swXS5zZHBNTGluZUluZGV4XSkuYXR0cignaWQnKSxcbiAgICAgICAgICAgICAgICAgICAgZW5kcG9pbnQ6ICQodGhpcy5teWNoYW5uZWxbY2FuZHNbMF0uc2RwTUxpbmVJbmRleF0pLmF0dHIoJ2VuZHBvaW50JyksXG4gICAgICAgICAgICAgICAgICAgIHBvcnQ6ICQodGhpcy5teWNoYW5uZWxbY2FuZHNbMF0uc2RwTUxpbmVJbmRleF0pLmF0dHIoJ3BvcnQnKSxcbiAgICAgICAgICAgICAgICAgICAgZXhwaXJlOiBzZWxmLmNoYW5uZWxFeHBpcmVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG15Y2FuZHMuYygndHJhbnNwb3J0Jywge3htbG5zOiAndXJuOnhtcHA6amluZ2xlOnRyYW5zcG9ydHM6aWNlLXVkcDoxJ30pO1xuICAgICAgICAgICAgaWYgKGNvbmZpZy51c2VSdGNwTXV4ICYmIG5hbWUgIT09ICdkYXRhJykge1xuICAgICAgICAgICAgICAgIG15Y2FuZHMuYygncnRjcC1tdXgnKS51cCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjYW5kcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIG15Y2FuZHMuYygnY2FuZGlkYXRlJywgU0RQVXRpbC5jYW5kaWRhdGVUb0ppbmdsZShjYW5kc1tpXS5jYW5kaWRhdGUpKS51cCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbXljYW5kcy51cCgpOyAvLyB0cmFuc3BvcnRcbiAgICAgICAgICAgIG15Y2FuZHMudXAoKTsgLy8gY2hhbm5lbCAvIHNjdHBjb25uZWN0aW9uXG4gICAgICAgICAgICBteWNhbmRzLnVwKCk7IC8vIGNvbnRlbnRcbiAgICAgICAgfVxuICAgIH1cbiAgICBjb25zb2xlLmxvZygnc2VuZCBjYW5kcycsIGNhbmRpZGF0ZXMpO1xuICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEobXljYW5kcyxcbiAgICAgICAgZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2dvdCByZXN1bHQnKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignZ290IGVycm9yJywgZXJyKTtcbiAgICAgICAgfVxuICAgICk7XG59O1xuXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLnRlcm1pbmF0ZSA9IGZ1bmN0aW9uIChzZXNzaW9uLCByZWFzb24pIHtcbiAgICBjb25zb2xlLmxvZygncmVtb3RlIHNlc3Npb24gdGVybWluYXRlZCBmcm9tJywgc2Vzc2lvbi5wZWVyamlkKTtcbiAgICB2YXIgcGFydGljaXBhbnQgPSB0aGlzLnBlZXJzLmluZGV4T2Yoc2Vzc2lvbi5wZWVyamlkKTtcbiAgICBpZiAoIXRoaXMucmVtb3Rlc3NyY1tzZXNzaW9uLnBlZXJqaWRdIHx8IHBhcnRpY2lwYW50ID09IC0xKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHNzcmNzID0gdGhpcy5yZW1vdGVzc3JjW3Nlc3Npb24ucGVlcmppZF07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzc3Jjcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLnBlZXJjb25uZWN0aW9uLmVucXVldWVSZW1vdmVTc3JjKGksIHNzcmNzW2ldKTtcbiAgICB9XG4gICAgLy8gcmVtb3ZlIGZyb20gdGhpcy5wZWVyc1xuICAgIHRoaXMucGVlcnMuc3BsaWNlKHBhcnRpY2lwYW50LCAxKTtcbiAgICAvLyBleHBpcmUgY2hhbm5lbCBvbiBicmlkZ2VcbiAgICB2YXIgY2hhbmdlID0gJGlxKHt0bzogdGhpcy5icmlkZ2VqaWQsIHR5cGU6ICdzZXQnfSk7XG4gICAgY2hhbmdlLmMoJ2NvbmZlcmVuY2UnLCB7eG1sbnM6ICdodHRwOi8vaml0c2kub3JnL3Byb3RvY29sL2NvbGlicmknLCBpZDogdGhpcy5jb25maWR9KTtcbiAgICBmb3IgKHZhciBjaGFubmVsID0gMDsgY2hhbm5lbCA8IHRoaXMuY2hhbm5lbHNbcGFydGljaXBhbnRdLmxlbmd0aDsgY2hhbm5lbCsrKSB7XG4gICAgICAgIHZhciBuYW1lID0gY2hhbm5lbCA9PT0gMCA/ICdhdWRpbycgOiAndmlkZW8nO1xuICAgICAgICBpZiAoY2hhbm5lbCA9PSAyKVxuICAgICAgICAgICAgbmFtZSA9ICdkYXRhJztcbiAgICAgICAgY2hhbmdlLmMoJ2NvbnRlbnQnLCB7bmFtZTogbmFtZX0pO1xuICAgICAgICBpZiAobmFtZSAhPT0gJ2RhdGEnKVxuICAgICAgICB7XG4gICAgICAgICAgICBjaGFuZ2UuYygnY2hhbm5lbCcsIHtcbiAgICAgICAgICAgICAgICBpZDogJCh0aGlzLmNoYW5uZWxzW3BhcnRpY2lwYW50XVtjaGFubmVsXSkuYXR0cignaWQnKSxcbiAgICAgICAgICAgICAgICBlbmRwb2ludDogJCh0aGlzLmNoYW5uZWxzW3BhcnRpY2lwYW50XVtjaGFubmVsXSkuYXR0cignZW5kcG9pbnQnKSxcbiAgICAgICAgICAgICAgICBleHBpcmU6ICcwJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZVxuICAgICAgICB7XG4gICAgICAgICAgICBjaGFuZ2UuYygnc2N0cGNvbm5lY3Rpb24nLCB7XG4gICAgICAgICAgICAgICAgaWQ6ICQodGhpcy5jaGFubmVsc1twYXJ0aWNpcGFudF1bY2hhbm5lbF0pLmF0dHIoJ2lkJyksXG4gICAgICAgICAgICAgICAgZW5kcG9pbnQ6ICQodGhpcy5jaGFubmVsc1twYXJ0aWNpcGFudF1bY2hhbm5lbF0pLmF0dHIoJ2VuZHBvaW50JyksXG4gICAgICAgICAgICAgICAgZXhwaXJlOiAnMCdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGNoYW5nZS51cCgpOyAvLyBlbmQgb2YgY2hhbm5lbC9zY3RwY29ubmVjdGlvblxuICAgICAgICBjaGFuZ2UudXAoKTsgLy8gZW5kIG9mIGNvbnRlbnRcbiAgICB9XG4gICAgdGhpcy5jb25uZWN0aW9uLnNlbmRJUShjaGFuZ2UsXG4gICAgICAgIGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnb3QgcmVzdWx0Jyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2dvdCBlcnJvcicsIGVycik7XG4gICAgICAgIH1cbiAgICApO1xuICAgIC8vIGFuZCByZW1vdmUgZnJvbSBjaGFubmVsc1xuICAgIHRoaXMuY2hhbm5lbHMuc3BsaWNlKHBhcnRpY2lwYW50LCAxKTtcblxuICAgIC8vIHRlbGwgZXZlcnlvbmUgYWJvdXQgdGhlIHNzcmNzIHRvIGJlIHJlbW92ZWRcbiAgICB2YXIgc2RwID0gbmV3IFNEUCgnJyk7XG4gICAgdmFyIGxvY2FsU0RQID0gbmV3IFNEUCh0aGlzLnBlZXJjb25uZWN0aW9uLmxvY2FsRGVzY3JpcHRpb24uc2RwKTtcbiAgICB2YXIgY29udGVudHMgPSBTRFBVdGlsLmZpbmRfbGluZXMobG9jYWxTRFAucmF3LCAnYT1taWQ6JykubWFwKFNEUFV0aWwucGFyc2VfbWlkKTtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHNzcmNzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHNkcC5tZWRpYVtqXSA9ICdhPW1pZDonICsgY29udGVudHNbal0gKyAnXFxyXFxuJztcbiAgICAgICAgc2RwLm1lZGlhW2pdICs9IHNzcmNzW2pdO1xuICAgICAgICB0aGlzLnBlZXJjb25uZWN0aW9uLmVucXVldWVSZW1vdmVTc3JjKGosIHNzcmNzW2pdKTtcbiAgICB9XG4gICAgdGhpcy5zZW5kU1NSQ1VwZGF0ZShzZHAuZ2V0TWVkaWFTc3JjTWFwKCksIHNlc3Npb24ucGVlcmppZCwgZmFsc2UpO1xuXG4gICAgZGVsZXRlIHRoaXMucmVtb3Rlc3NyY1tzZXNzaW9uLnBlZXJqaWRdO1xuICAgIHRoaXMubW9kaWZ5U291cmNlcygpO1xufTtcblxuQ29saWJyaUZvY3VzLnByb3RvdHlwZS5zZW5kVGVybWluYXRlID0gZnVuY3Rpb24gKHNlc3Npb24sIHJlYXNvbiwgdGV4dCkge1xuICAgIHZhciB0ZXJtID0gJGlxKHt0bzogc2Vzc2lvbi5wZWVyamlkLCB0eXBlOiAnc2V0J30pXG4gICAgICAgIC5jKCdqaW5nbGUnLFxuICAgICAgICAgICAge3htbG5zOiAndXJuOnhtcHA6amluZ2xlOjEnLFxuICAgICAgICAgICAgYWN0aW9uOiAnc2Vzc2lvbi10ZXJtaW5hdGUnLFxuICAgICAgICAgICAgaW5pdGlhdG9yOiBzZXNzaW9uLm1lLFxuICAgICAgICAgICAgc2lkOiBzZXNzaW9uLnNpZH0pXG4gICAgICAgIC5jKCdyZWFzb24nKVxuICAgICAgICAuYyhyZWFzb24gfHwgJ3N1Y2Nlc3MnKTtcblxuICAgIGlmICh0ZXh0KSB7XG4gICAgICAgIHRlcm0udXAoKS5jKCd0ZXh0JykudCh0ZXh0KTtcbiAgICB9XG5cbiAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKHRlcm0sXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICghc2Vzc2lvbilcbiAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgIGlmIChzZXNzaW9uLnBlZXJjb25uZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5wZWVyY29ubmVjdGlvbi5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIHNlc3Npb24ucGVlcmNvbm5lY3Rpb24gPSBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzZXNzaW9uLnRlcm1pbmF0ZSgpO1xuICAgICAgICAgICAgdmFyIGFjayA9IHt9O1xuICAgICAgICAgICAgYWNrLnNvdXJjZSA9ICd0ZXJtaW5hdGUnO1xuICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignYWNrLmppbmdsZScsIFtzZXNzaW9uLnNpZCwgYWNrXSk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzdGFuemEpIHtcbiAgICAgICAgICAgIHZhciBlcnJvciA9ICgkKHN0YW56YSkuZmluZCgnZXJyb3InKS5sZW5ndGgpID8ge1xuICAgICAgICAgICAgICAgIGNvZGU6ICQoc3RhbnphKS5maW5kKCdlcnJvcicpLmF0dHIoJ2NvZGUnKSxcbiAgICAgICAgICAgICAgICByZWFzb246ICQoc3RhbnphKS5maW5kKCdlcnJvciA6Zmlyc3QnKVswXS50YWdOYW1lXG4gICAgICAgICAgICB9Ont9O1xuICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignYWNrLmppbmdsZScsIFtzZWxmLnNpZCwgZXJyb3JdKTtcbiAgICAgICAgfSxcbiAgICAgICAgMTAwMDApO1xuICAgIGlmICh0aGlzLnN0YXRzaW50ZXJ2YWwgIT09IG51bGwpIHtcbiAgICAgICAgd2luZG93LmNsZWFySW50ZXJ2YWwodGhpcy5zdGF0c2ludGVydmFsKTtcbiAgICAgICAgdGhpcy5zdGF0c2ludGVydmFsID0gbnVsbDtcbiAgICB9XG59O1xuXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLnNldFJUQ1BUZXJtaW5hdGlvblN0cmF0ZWd5ID0gZnVuY3Rpb24gKHN0cmF0ZWd5RlFOKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8gVE9ETyhncCkgbWF5YmUgbW92ZSB0aGUgUlRDUCB0ZXJtaW5hdGlvbiBzdHJhdGVneSBlbGVtZW50IHVuZGVyIHRoZVxuICAgIC8vIGNvbnRlbnQgb3IgY2hhbm5lbCBlbGVtZW50LlxuICAgIHZhciBzdHJhdGVneUlRID0gJGlxKHt0bzogdGhpcy5icmlkZ2VqaWQsIHR5cGU6ICdzZXQnfSk7XG4gICAgc3RyYXRlZ3lJUS5jKCdjb25mZXJlbmNlJywge1xuXHQgICAgeG1sbnM6ICdodHRwOi8vaml0c2kub3JnL3Byb3RvY29sL2NvbGlicmknLFxuXHQgICAgaWQ6IHRoaXMuY29uZmlkXG4gICAgfSk7XG5cbiAgICBzdHJhdGVneUlRLmMoJ3J0Y3AtdGVybWluYXRpb24tc3RyYXRlZ3knLCB7bmFtZTogc3RyYXRlZ3lGUU4gfSk7XG5cbiAgICBzdHJhdGVneUlRLmMoJ2NvbnRlbnQnLCB7bmFtZTogXCJ2aWRlb1wifSk7XG4gICAgc3RyYXRlZ3lJUS51cCgpOyAvLyBlbmQgb2YgY29udGVudFxuXG4gICAgY29uc29sZS5sb2coJ3NldHRpbmcgUlRDUCB0ZXJtaW5hdGlvbiBzdHJhdGVneScsIHN0cmF0ZWd5RlFOKTtcbiAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKHN0cmF0ZWd5SVEsXG4gICAgICAgIGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnb3QgcmVzdWx0Jyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2dvdCBlcnJvcicsIGVycik7XG4gICAgICAgIH1cbiAgICApO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBkZWZhdWx0IHZhbHVlIG9mIHRoZSBjaGFubmVsIGxhc3QtbiBhdHRyaWJ1dGUgaW4gdGhpcyBjb25mZXJlbmNlIGFuZFxuICogdXBkYXRlcy9wYXRjaGVzIHRoZSBleGlzdGluZyBjaGFubmVscy5cbiAqL1xuQ29saWJyaUZvY3VzLnByb3RvdHlwZS5zZXRDaGFubmVsTGFzdE4gPSBmdW5jdGlvbiAoY2hhbm5lbExhc3ROKSB7XG4gICAgaWYgKCgnbnVtYmVyJyA9PT0gdHlwZW9mKGNoYW5uZWxMYXN0TikpXG4gICAgICAgICAgICAmJiAodGhpcy5jaGFubmVsTGFzdE4gIT09IGNoYW5uZWxMYXN0TikpXG4gICAge1xuICAgICAgICB0aGlzLmNoYW5uZWxMYXN0TiA9IGNoYW5uZWxMYXN0TjtcblxuICAgICAgICAvLyBVcGRhdGUvcGF0Y2ggdGhlIGV4aXN0aW5nIGNoYW5uZWxzLlxuICAgICAgICB2YXIgcGF0Y2ggPSAkaXEoeyB0bzogdGhpcy5icmlkZ2VqaWQsIHR5cGU6ICdzZXQnIH0pO1xuXG4gICAgICAgIHBhdGNoLmMoXG4gICAgICAgICAgICAnY29uZmVyZW5jZScsXG4gICAgICAgICAgICB7IHhtbG5zOiAnaHR0cDovL2ppdHNpLm9yZy9wcm90b2NvbC9jb2xpYnJpJywgaWQ6IHRoaXMuY29uZmlkIH0pO1xuICAgICAgICBwYXRjaC5jKCdjb250ZW50JywgeyBuYW1lOiAndmlkZW8nIH0pO1xuICAgICAgICBwYXRjaC5jKFxuICAgICAgICAgICAgJ2NoYW5uZWwnLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlkOiAkKHRoaXMubXljaGFubmVsWzEgLyogdmlkZW8gKi9dKS5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgICAgICdsYXN0LW4nOiB0aGlzLmNoYW5uZWxMYXN0TlxuICAgICAgICAgICAgfSk7XG4gICAgICAgIHBhdGNoLnVwKCk7IC8vIGVuZCBvZiBjaGFubmVsXG4gICAgICAgIGZvciAodmFyIHAgPSAwOyBwIDwgdGhpcy5jaGFubmVscy5sZW5ndGg7IHArKylcbiAgICAgICAge1xuICAgICAgICAgICAgcGF0Y2guYyhcbiAgICAgICAgICAgICAgICAnY2hhbm5lbCcsXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBpZDogJCh0aGlzLmNoYW5uZWxzW3BdWzEgLyogdmlkZW8gKi9dKS5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgICAgICAgICAnbGFzdC1uJzogdGhpcy5jaGFubmVsTGFzdE5cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHBhdGNoLnVwKCk7IC8vIGVuZCBvZiBjaGFubmVsXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmRJUShcbiAgICAgICAgICAgIHBhdGNoLFxuICAgICAgICAgICAgZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnU2V0IGNoYW5uZWwgbGFzdC1uIHN1Y2NlZWRlZDonLCByZXMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdTZXQgY2hhbm5lbCBsYXN0LW4gZmFpbGVkOicsIGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIGRlZmF1bHQgdmFsdWUgb2YgdGhlIGNoYW5uZWwgc2ltdWxjYXN0IGxheWVyIGF0dHJpYnV0ZSBpbiB0aGlzXG4gKiBjb25mZXJlbmNlIGFuZCB1cGRhdGVzL3BhdGNoZXMgdGhlIGV4aXN0aW5nIGNoYW5uZWxzLlxuICovXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLnNldFJlY2VpdmVTaW11bGNhc3RMYXllciA9IGZ1bmN0aW9uIChyZWNlaXZlU2ltdWxjYXN0TGF5ZXIpIHtcbiAgICBpZiAoKCdudW1iZXInID09PSB0eXBlb2YocmVjZWl2ZVNpbXVsY2FzdExheWVyKSlcbiAgICAgICAgJiYgKHRoaXMucmVjZWl2ZVNpbXVsY2FzdExheWVyICE9PSByZWNlaXZlU2ltdWxjYXN0TGF5ZXIpKVxuICAgIHtcbiAgICAgICAgLy8gVE9ETyhncCkgYmUgYWJsZSB0byBzZXQgdGhlIHJlY2VpdmluZyBzaW11bGNhc3QgbGF5ZXIgb24gYSBwZXJcbiAgICAgICAgLy8gc2VuZGVyIGJhc2lzLlxuICAgICAgICB0aGlzLnJlY2VpdmVTaW11bGNhc3RMYXllciA9IHJlY2VpdmVTaW11bGNhc3RMYXllcjtcblxuICAgICAgICAvLyBVcGRhdGUvcGF0Y2ggdGhlIGV4aXN0aW5nIGNoYW5uZWxzLlxuICAgICAgICB2YXIgcGF0Y2ggPSAkaXEoeyB0bzogdGhpcy5icmlkZ2VqaWQsIHR5cGU6ICdzZXQnIH0pO1xuXG4gICAgICAgIHBhdGNoLmMoXG4gICAgICAgICAgICAnY29uZmVyZW5jZScsXG4gICAgICAgICAgICB7IHhtbG5zOiAnaHR0cDovL2ppdHNpLm9yZy9wcm90b2NvbC9jb2xpYnJpJywgaWQ6IHRoaXMuY29uZmlkIH0pO1xuICAgICAgICBwYXRjaC5jKCdjb250ZW50JywgeyBuYW1lOiAndmlkZW8nIH0pO1xuICAgICAgICBwYXRjaC5jKFxuICAgICAgICAgICAgJ2NoYW5uZWwnLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlkOiAkKHRoaXMubXljaGFubmVsWzEgLyogdmlkZW8gKi9dKS5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgICAgICdyZWNlaXZlLXNpbXVsY2FzdC1sYXllcic6IHRoaXMucmVjZWl2ZVNpbXVsY2FzdExheWVyXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgcGF0Y2gudXAoKTsgLy8gZW5kIG9mIGNoYW5uZWxcbiAgICAgICAgZm9yICh2YXIgcCA9IDA7IHAgPCB0aGlzLmNoYW5uZWxzLmxlbmd0aDsgcCsrKVxuICAgICAgICB7XG4gICAgICAgICAgICBwYXRjaC5jKFxuICAgICAgICAgICAgICAgICdjaGFubmVsJyxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiAkKHRoaXMuY2hhbm5lbHNbcF1bMSAvKiB2aWRlbyAqL10pLmF0dHIoJ2lkJyksXG4gICAgICAgICAgICAgICAgICAgICdyZWNlaXZlLXNpbXVsY2FzdC1sYXllcic6IHRoaXMucmVjZWl2ZVNpbXVsY2FzdExheWVyXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBwYXRjaC51cCgpOyAvLyBlbmQgb2YgY2hhbm5lbFxuICAgICAgICB9XG4gICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoXG4gICAgICAgICAgICBwYXRjaCxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oJ1NldCBjaGFubmVsIHNpbXVsY2FzdCByZWNlaXZlIGxheWVyIHN1Y2NlZWRlZDonLCByZXMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdTZXQgY2hhbm5lbCBzaW11bGNhc3QgcmVjZWl2ZSBsYXllciBmYWlsZWQ6JywgZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IENvbGlicmlGb2N1cztcbiIsIi8qIGNvbGlicmkuanMgLS0gYSBDT0xJQlJJIGZvY3VzIFxuICogVGhlIGNvbGlicmkgc3BlYyBoYXMgYmVlbiBzdWJtaXR0ZWQgdG8gdGhlIFhNUFAgU3RhbmRhcmRzIEZvdW5kYXRpb25cbiAqIGZvciBwdWJsaWNhdGlvbnMgYXMgYSBYTVBQIGV4dGVuc2lvbnM6XG4gKiBodHRwOi8veG1wcC5vcmcvZXh0ZW5zaW9ucy9pbmJveC9jb2xpYnJpLmh0bWxcbiAqXG4gKiBjb2xpYnJpLmpzIGlzIGEgcGFydGljaXBhdGluZyBmb2N1cywgaS5lLiB0aGUgZm9jdXMgcGFydGljaXBhdGVzXG4gKiBpbiB0aGUgY29uZmVyZW5jZS4gVGhlIGNvbmZlcmVuY2UgaXRzZWxmIGNhbiBiZSBhZC1ob2MsIHRocm91Z2ggYVxuICogTVVDLCB0aHJvdWdoIFB1YlN1YiwgZXRjLlxuICpcbiAqIGNvbGlicmkuanMgcmVsaWVzIGhlYXZpbHkgb24gdGhlIHN0cm9waGUuamluZ2xlIGxpYnJhcnkgYXZhaWxhYmxlIFxuICogZnJvbSBodHRwczovL2dpdGh1Yi5jb20vRVNUT1Mvc3Ryb3BoZS5qaW5nbGVcbiAqIGFuZCBpbnRlcm9wZXJhdGVzIHdpdGggdGhlIEppdHNpIHZpZGVvYnJpZGdlIGF2YWlsYWJsZSBmcm9tXG4gKiBodHRwczovL2ppdHNpLm9yZy9Qcm9qZWN0cy9KaXRzaVZpZGVvYnJpZGdlXG4gKi9cbi8qXG5Db3B5cmlnaHQgKGMpIDIwMTMgRVNUT1MgR21iSFxuXG5QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG5vZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG5pbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG50byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG5jb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbmZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cblRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG5hbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG5GSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbkFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbkxJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG5PVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG5USEUgU09GVFdBUkUuXG4qL1xuLy8gQSBjb2xpYnJpIHNlc3Npb24gaXMgc2ltaWxhciB0byBhIGppbmdsZSBzZXNzaW9uLCBpdCBqdXN0IGltcGxlbWVudHMgc29tZSB0aGluZ3MgZGlmZmVyZW50bHlcbi8vIEZJWE1FOiBpbmhlcml0IGppbmdsZXNlc3Npb24sIHNlZSBodHRwczovL2dpdGh1Yi5jb20vbGVnYXN0ZXJvL0ppbmdsZS1SVENQZWVyQ29ubmVjdGlvbi9ibG9iL21hc3Rlci9pbmRleC5qc1xuZnVuY3Rpb24gQ29saWJyaVNlc3Npb24obWUsIHNpZCwgY29ubmVjdGlvbikge1xuICAgIHRoaXMubWUgPSBtZTtcbiAgICB0aGlzLnNpZCA9IHNpZDtcbiAgICB0aGlzLmNvbm5lY3Rpb24gPSBjb25uZWN0aW9uO1xuICAgIC8vdGhpcy5wZWVyY29ubmVjdGlvbiA9IG51bGw7XG4gICAgLy90aGlzLm15Y2hhbm5lbCA9IG51bGw7XG4gICAgLy90aGlzLmNoYW5uZWxzID0gbnVsbDtcbiAgICB0aGlzLnBlZXJqaWQgPSBudWxsO1xuXG4gICAgdGhpcy5jb2xpYnJpID0gbnVsbDtcbn1cblxuLy8gaW1wbGVtZW50YXRpb24gb2YgSmluZ2xlU2Vzc2lvbiBpbnRlcmZhY2VcbkNvbGlicmlTZXNzaW9uLnByb3RvdHlwZS5pbml0aWF0ZSA9IGZ1bmN0aW9uIChwZWVyamlkLCBpc0luaXRpYXRvcikge1xuICAgIHRoaXMucGVlcmppZCA9IHBlZXJqaWQ7XG59O1xuXG5Db2xpYnJpU2Vzc2lvbi5wcm90b3R5cGUuc2VuZE9mZmVyID0gZnVuY3Rpb24gKG9mZmVyKSB7XG4gICAgY29uc29sZS5sb2coJ0NvbGlicmlTZXNzaW9uLnNlbmRPZmZlcicpO1xufTtcblxuXG5Db2xpYnJpU2Vzc2lvbi5wcm90b3R5cGUuYWNjZXB0ID0gZnVuY3Rpb24gKCkge1xuICAgIGNvbnNvbGUubG9nKCdDb2xpYnJpU2Vzc2lvbi5hY2NlcHQnKTtcbn07XG5cbkNvbGlicmlTZXNzaW9uLnByb3RvdHlwZS5hZGRTb3VyY2UgPSBmdW5jdGlvbiAoZWxlbSwgZnJvbUppZCkge1xuICAgIHRoaXMuY29saWJyaS5hZGRTb3VyY2UoZWxlbSwgZnJvbUppZCk7XG59O1xuXG5Db2xpYnJpU2Vzc2lvbi5wcm90b3R5cGUucmVtb3ZlU291cmNlID0gZnVuY3Rpb24gKGVsZW0sIGZyb21KaWQpIHtcbiAgICB0aGlzLmNvbGlicmkucmVtb3ZlU291cmNlKGVsZW0sIGZyb21KaWQpO1xufTtcblxuQ29saWJyaVNlc3Npb24ucHJvdG90eXBlLnRlcm1pbmF0ZSA9IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICB0aGlzLmNvbGlicmkudGVybWluYXRlKHRoaXMsIHJlYXNvbik7XG59O1xuXG5Db2xpYnJpU2Vzc2lvbi5wcm90b3R5cGUuYWN0aXZlID0gZnVuY3Rpb24gKCkge1xuICAgIGNvbnNvbGUubG9nKCdDb2xpYnJpU2Vzc2lvbi5hY3RpdmUnKTtcbn07XG5cbkNvbGlicmlTZXNzaW9uLnByb3RvdHlwZS5zZXRSZW1vdGVEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uIChlbGVtLCBkZXNjdHlwZSkge1xuICAgIHRoaXMuY29saWJyaS5zZXRSZW1vdGVEZXNjcmlwdGlvbih0aGlzLCBlbGVtLCBkZXNjdHlwZSk7XG59O1xuXG5Db2xpYnJpU2Vzc2lvbi5wcm90b3R5cGUuYWRkSWNlQ2FuZGlkYXRlID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICB0aGlzLmNvbGlicmkuYWRkSWNlQ2FuZGlkYXRlKHRoaXMsIGVsZW0pO1xufTtcblxuQ29saWJyaVNlc3Npb24ucHJvdG90eXBlLnNlbmRBbnN3ZXIgPSBmdW5jdGlvbiAoc2RwLCBwcm92aXNpb25hbCkge1xuICAgIGNvbnNvbGUubG9nKCdDb2xpYnJpU2Vzc2lvbi5zZW5kQW5zd2VyJyk7XG59O1xuXG5Db2xpYnJpU2Vzc2lvbi5wcm90b3R5cGUuc2VuZFRlcm1pbmF0ZSA9IGZ1bmN0aW9uIChyZWFzb24sIHRleHQpIHtcbiAgICB0aGlzLmNvbGlicmkuc2VuZFRlcm1pbmF0ZSh0aGlzLCByZWFzb24sIHRleHQpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb2xpYnJpU2Vzc2lvbjsiLCIvKipcbiAqIE1vZGVyYXRlIGNvbm5lY3Rpb24gcGx1Z2luLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgU3Ryb3BoZS5hZGRDb25uZWN0aW9uUGx1Z2luKCdtb2RlcmF0ZScsIHtcbiAgICAgICAgY29ubmVjdGlvbjogbnVsbCxcbiAgICAgICAgcm9vbWppZDogbnVsbCxcbiAgICAgICAgbXlyb29tamlkOiBudWxsLFxuICAgICAgICBtZW1iZXJzOiB7fSxcbiAgICAgICAgbGlzdF9tZW1iZXJzOiBbXSwgLy8gc28gd2UgY2FuIGVsZWN0IGEgbmV3IGZvY3VzXG4gICAgICAgIHByZXNNYXA6IHt9LFxuICAgICAgICBwcmV6aU1hcDoge30sXG4gICAgICAgIGpvaW5lZDogZmFsc2UsXG4gICAgICAgIGlzT3duZXI6IGZhbHNlLFxuICAgICAgICBpbml0OiBmdW5jdGlvbiAoY29ubikge1xuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uID0gY29ubjtcblxuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLmFkZEhhbmRsZXIodGhpcy5vbk11dGUuYmluZCh0aGlzKSxcbiAgICAgICAgICAgICAgICAnaHR0cDovL2ppdHNpLm9yZy9qaXRtZWV0L2F1ZGlvJyxcbiAgICAgICAgICAgICAgICAnaXEnLFxuICAgICAgICAgICAgICAgICdzZXQnLFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgbnVsbCk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldE11dGU6IGZ1bmN0aW9uIChqaWQsIG11dGUpIHtcbiAgICAgICAgICAgIHZhciBpcSA9ICRpcSh7dG86IGppZCwgdHlwZTogJ3NldCd9KVxuICAgICAgICAgICAgICAgIC5jKCdtdXRlJywge3htbG5zOiAnaHR0cDovL2ppdHNpLm9yZy9qaXRtZWV0L2F1ZGlvJ30pXG4gICAgICAgICAgICAgICAgLnQobXV0ZS50b1N0cmluZygpKVxuICAgICAgICAgICAgICAgIC51cCgpO1xuXG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKFxuICAgICAgICAgICAgICAgIGlxLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NldCBtdXRlJywgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2V0IG11dGUgZXJyb3InLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5SZXBvcnREaWFsb2cobnVsbCwgJ0ZhaWxlZCB0byBtdXRlICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJChcIiNwYXJ0aWNpcGFudF9cIiArIGppZCkuZmluZChcIi5kaXNwbGF5bmFtZVwiKS50ZXh0KCkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwicGFydGljaXBhbnRcIiArICcuJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBvbk11dGU6IGZ1bmN0aW9uIChpcSkge1xuICAgICAgICAgICAgdmFyIG11dGUgPSAkKGlxKS5maW5kKCdtdXRlJyk7XG4gICAgICAgICAgICBpZiAobXV0ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBVSUFjdGl2YXRvci5nZXRVSVNlcnZpY2UoKS50b2dnbGVBdWRpbygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIGVqZWN0OiBmdW5jdGlvbiAoamlkKSB7XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uamluZ2xlLnRlcm1pbmF0ZVJlbW90ZUJ5SmlkKGppZCwgJ2tpY2snKTtcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5lbXVjLmtpY2soamlkKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG59O1xuIiwiLyoganNoaW50IC1XMTE3ICovXG4vKiBhIHNpbXBsZSBNVUMgY29ubmVjdGlvbiBwbHVnaW5cbiAqIGNhbiBvbmx5IGhhbmRsZSBhIHNpbmdsZSBNVUMgcm9vbVxuICovXG5cbnZhciBDb2xpYnJpRm9jdXMgPSByZXF1aXJlKFwiLi9jb2xpYnJpL2NvbGlicmkuZm9jdXNcIik7XG52YXIgWE1QUEFjdGl2YXRvciA9IHJlcXVpcmUoXCIuL1hNUFBBY3RpdmF0b3JcIik7XG52YXIgWE1QUEV2ZW50cyA9IHJlcXVpcmUoXCIuLi9zZXJ2aWNlL3htcHAvWE1QUEV2ZW50c1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihldmVudEVtaXR0ZXIpIHtcbiAgICBTdHJvcGhlLmFkZENvbm5lY3Rpb25QbHVnaW4oJ2VtdWMnLCB7XG4gICAgICAgIGNvbm5lY3Rpb246IG51bGwsXG4gICAgICAgIHJvb21qaWQ6IG51bGwsXG4gICAgICAgIG15cm9vbWppZDogbnVsbCxcbiAgICAgICAgbWVtYmVyczoge30sXG4gICAgICAgIGxpc3RfbWVtYmVyczogW10sIC8vIHNvIHdlIGNhbiBlbGVjdCBhIG5ldyBmb2N1c1xuICAgICAgICBwcmVzTWFwOiB7fSxcbiAgICAgICAgcHJlemlNYXA6IHt9LFxuICAgICAgICBqb2luZWQ6IGZhbHNlLFxuICAgICAgICBpc093bmVyOiBmYWxzZSxcbiAgICAgICAgc2Vzc2lvblRlcm1pbmF0ZWQ6IGZhbHNlLFxuICAgICAgICBzc3JjMnZpZGVvVHlwZToge30sXG4gICAgICAgIHNzcmMyamlkOiB7fSxcbiAgICAgICAgZm9jdXM6IG51bGwsXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uIChjb25uKSB7XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24gPSBjb25uO1xuICAgICAgICB9LFxuICAgICAgICBpbml0UHJlc2VuY2VNYXA6IGZ1bmN0aW9uIChteXJvb21qaWQpIHtcbiAgICAgICAgICAgIHRoaXMucHJlc01hcFsndG8nXSA9IG15cm9vbWppZDtcbiAgICAgICAgICAgIHRoaXMucHJlc01hcFsneG5zJ10gPSAnaHR0cDovL2phYmJlci5vcmcvcHJvdG9jb2wvbXVjJztcbiAgICAgICAgfSxcbiAgICAgICAgZG9Kb2luOiBmdW5jdGlvbiAoamlkLCBwYXNzd29yZCkge1xuICAgICAgICAgICAgdGhpcy5teXJvb21qaWQgPSBqaWQ7XG5cbiAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIkpvaW5lZCBNVUMgYXMgXCIgKyB0aGlzLm15cm9vbWppZCk7XG5cbiAgICAgICAgICAgIHRoaXMuaW5pdFByZXNlbmNlTWFwKHRoaXMubXlyb29tamlkKTtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLnJvb21qaWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJvb21qaWQgPSBTdHJvcGhlLmdldEJhcmVKaWRGcm9tSmlkKGppZCk7XG4gICAgICAgICAgICAgICAgLy8gYWRkIGhhbmRsZXJzIChqdXN0IG9uY2UpXG4gICAgICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLmFkZEhhbmRsZXIodGhpcy5vblByZXNlbmNlLmJpbmQodGhpcyksIG51bGwsICdwcmVzZW5jZScsIG51bGwsIG51bGwsIHRoaXMucm9vbWppZCwge21hdGNoQmFyZTogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5hZGRIYW5kbGVyKHRoaXMub25QcmVzZW5jZVVuYXZhaWxhYmxlLmJpbmQodGhpcyksIG51bGwsICdwcmVzZW5jZScsICd1bmF2YWlsYWJsZScsIG51bGwsIHRoaXMucm9vbWppZCwge21hdGNoQmFyZTogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5hZGRIYW5kbGVyKHRoaXMub25QcmVzZW5jZUVycm9yLmJpbmQodGhpcyksIG51bGwsICdwcmVzZW5jZScsICdlcnJvcicsIG51bGwsIHRoaXMucm9vbWppZCwge21hdGNoQmFyZTogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5hZGRIYW5kbGVyKHRoaXMub25NZXNzYWdlLmJpbmQodGhpcyksIG51bGwsICdtZXNzYWdlJywgbnVsbCwgbnVsbCwgdGhpcy5yb29tamlkLCB7bWF0Y2hCYXJlOiB0cnVlfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocGFzc3dvcmQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJlc01hcFsncGFzc3dvcmQnXSA9IHBhc3N3b3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zZW5kUHJlc2VuY2UoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZG9MZWF2ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJkbyBsZWF2ZVwiLCB0aGlzLm15cm9vbWppZCk7XG4gICAgICAgICAgICB0aGlzLnNlc3Npb25UZXJtaW5hdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHZhciBwcmVzID0gJHByZXMoe3RvOiB0aGlzLm15cm9vbWppZCwgdHlwZTogJ3VuYXZhaWxhYmxlJyB9KTtcbiAgICAgICAgICAgIHRoaXMucHJlc01hcC5sZW5ndGggPSAwO1xuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmQocHJlcyk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uUHJlc2VuY2U6IGZ1bmN0aW9uIChwcmVzKSB7XG4gICAgICAgICAgICB2YXIgZnJvbSA9IHByZXMuZ2V0QXR0cmlidXRlKCdmcm9tJyk7XG4gICAgICAgICAgICB2YXIgdHlwZSA9IHByZXMuZ2V0QXR0cmlidXRlKCd0eXBlJyk7XG4gICAgICAgICAgICBpZiAodHlwZSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFBhcnNlIGV0aGVycGFkIHRhZy5cbiAgICAgICAgICAgIHZhciBldGhlcnBhZCA9ICQocHJlcykuZmluZCgnPmV0aGVycGFkJyk7XG4gICAgICAgICAgICBpZiAoZXRoZXJwYWQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignZXRoZXJwYWRhZGRlZC5tdWMnLCBbZnJvbSwgZXRoZXJwYWQudGV4dCgpXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFBhcnNlIHByZXppIHRhZy5cbiAgICAgICAgICAgIHZhciBwcmVzZW50YXRpb24gPSAkKHByZXMpLmZpbmQoJz5wcmV6aScpO1xuICAgICAgICAgICAgaWYgKHByZXNlbnRhdGlvbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB2YXIgdXJsID0gcHJlc2VudGF0aW9uLmF0dHIoJ3VybCcpO1xuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50ID0gcHJlc2VudGF0aW9uLmZpbmQoJz5jdXJyZW50JykudGV4dCgpO1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3ByZXNlbnRhdGlvbiBpbmZvIHJlY2VpdmVkIGZyb20nLCBmcm9tLCB1cmwpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucHJlemlNYXBbZnJvbV0gPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnByZXppTWFwW2Zyb21dID0gdXJsO1xuXG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ3ByZXNlbnRhdGlvbmFkZGVkLm11YycsIFtmcm9tLCB1cmwsIGN1cnJlbnRdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2dvdG9zbGlkZS5tdWMnLCBbZnJvbSwgdXJsLCBjdXJyZW50XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5wcmV6aU1hcFtmcm9tXSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdmFyIHVybCA9IHRoaXMucHJlemlNYXBbZnJvbV07XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMucHJlemlNYXBbZnJvbV07XG4gICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcigncHJlc2VudGF0aW9ucmVtb3ZlZC5tdWMnLCBbZnJvbSwgdXJsXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFBhcnNlIGF1ZGlvIGluZm8gdGFnLlxuICAgICAgICAgICAgdmFyIGF1ZGlvTXV0ZWQgPSAkKHByZXMpLmZpbmQoJz5hdWRpb211dGVkJyk7XG4gICAgICAgICAgICBpZiAoYXVkaW9NdXRlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdhdWRpb211dGVkLm11YycsIFtmcm9tLCBhdWRpb011dGVkLnRleHQoKV0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBQYXJzZSB2aWRlbyBpbmZvIHRhZy5cbiAgICAgICAgICAgIHZhciB2aWRlb011dGVkID0gJChwcmVzKS5maW5kKCc+dmlkZW9tdXRlZCcpO1xuICAgICAgICAgICAgaWYgKHZpZGVvTXV0ZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcigndmlkZW9tdXRlZC5tdWMnLCBbZnJvbSwgdmlkZW9NdXRlZC50ZXh0KCldKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUGFyc2Ugc3RhdHVzLlxuICAgICAgICAgICAgaWYgKCQocHJlcykuZmluZCgnPnhbeG1sbnM9XCJodHRwOi8vamFiYmVyLm9yZy9wcm90b2NvbC9tdWMjdXNlclwiXT5zdGF0dXNbY29kZT1cIjIwMVwiXScpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIC8vIGh0dHA6Ly94bXBwLm9yZy9leHRlbnNpb25zL3hlcC0wMDQ1Lmh0bWwjY3JlYXRlcm9vbS1pbnN0YW50XG4gICAgICAgICAgICAgICAgdGhpcy5pc093bmVyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2YXIgY3JlYXRlID0gJGlxKHt0eXBlOiAnc2V0JywgdG86IHRoaXMucm9vbWppZH0pXG4gICAgICAgICAgICAgICAgICAgIC5jKCdxdWVyeScsIHt4bWxuczogJ2h0dHA6Ly9qYWJiZXIub3JnL3Byb3RvY29sL211YyNvd25lcid9KVxuICAgICAgICAgICAgICAgICAgICAuYygneCcsIHt4bWxuczogJ2phYmJlcjp4OmRhdGEnLCB0eXBlOiAnc3VibWl0J30pO1xuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kKGNyZWF0ZSk7IC8vIGZpcmUgYXdheVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBQYXJzZSByb2xlcy5cbiAgICAgICAgICAgIHZhciBtZW1iZXIgPSB7fTtcbiAgICAgICAgICAgIG1lbWJlci5zaG93ID0gJChwcmVzKS5maW5kKCc+c2hvdycpLnRleHQoKTtcbiAgICAgICAgICAgIG1lbWJlci5zdGF0dXMgPSAkKHByZXMpLmZpbmQoJz5zdGF0dXMnKS50ZXh0KCk7XG4gICAgICAgICAgICB2YXIgdG1wID0gJChwcmVzKS5maW5kKCc+eFt4bWxucz1cImh0dHA6Ly9qYWJiZXIub3JnL3Byb3RvY29sL211YyN1c2VyXCJdPml0ZW0nKTtcbiAgICAgICAgICAgIG1lbWJlci5hZmZpbGlhdGlvbiA9IHRtcC5hdHRyKCdhZmZpbGlhdGlvbicpO1xuICAgICAgICAgICAgbWVtYmVyLnJvbGUgPSB0bXAuYXR0cigncm9sZScpO1xuXG4gICAgICAgICAgICB2YXIgbmlja3RhZyA9ICQocHJlcykuZmluZCgnPm5pY2tbeG1sbnM9XCJodHRwOi8vamFiYmVyLm9yZy9wcm90b2NvbC9uaWNrXCJdJyk7XG4gICAgICAgICAgICBtZW1iZXIuZGlzcGxheU5hbWUgPSAobmlja3RhZy5sZW5ndGggPiAwID8gbmlja3RhZy50ZXh0KCkgOiBudWxsKTtcblxuICAgICAgICAgICAgaWYgKGZyb20gPT0gdGhpcy5teXJvb21qaWQpIHtcbiAgICAgICAgICAgICAgICBpZiAobWVtYmVyLmFmZmlsaWF0aW9uID09ICdvd25lcicpIHRoaXMuaXNPd25lciA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmpvaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmpvaW5lZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHZhciBub01lbWJlcnMgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKHRoaXMubWVtYmVycykubGVuZ3RoIDwgMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9NZW1iZXJzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZm9jdXMgPSBuZXcgQ29saWJyaUZvY3VzKHRoaXMuY29ubmVjdGlvbiwgY29uZmlnLmhvc3RzLmJyaWRnZSwgZXZlbnRFbWl0dGVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0T3duTmlja25hbWUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBVSUFjdGl2YXRvci5nZXRVSVNlcnZpY2UoKS5vbk11Y0pvaW5lZChmcm9tLCBtZW1iZXIsIG5vTWVtYmVycyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGlzdF9tZW1iZXJzLnB1c2goZnJvbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLm1lbWJlcnNbZnJvbV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIC8vIG5ldyBwYXJ0aWNpcGFudFxuICAgICAgICAgICAgICAgIHRoaXMubWVtYmVyc1tmcm9tXSA9IG1lbWJlcjtcbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RfbWVtYmVycy5wdXNoKGZyb20pO1xuICAgICAgICAgICAgICAgIFVJQWN0aXZhdG9yLmdldFVJU2VydmljZSgpLm9uTXVjRW50ZXJlZChmcm9tLCBtZW1iZXIsIHByZXMsXG4gICAgICAgICAgICAgICAgICAgICh0aGlzLmZvY3VzICE9PW51bGwgJiYgdGhpcy5mb2N1cy5jb25maWQgPT09IG51bGwpKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mb2N1cyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBGSVhNRTogdGhpcyBzaG91bGQgcHJlcGFyZSB0aGUgdmlkZW9cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZm9jdXMuY29uZmlkID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbWFrZSBuZXcgY29uZmVyZW5jZSB3aXRoJywgZnJvbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZvY3VzLm1ha2VDb25mZXJlbmNlKE9iamVjdC5rZXlzKHRoaXMubWVtYmVycykpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2ludml0ZScsIGZyb20sICdpbnRvIGNvbmZlcmVuY2UnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZm9jdXMuYWRkTmV3UGFydGljaXBhbnQoZnJvbSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBBbHdheXMgdHJpZ2dlciBwcmVzZW5jZSB0byB1cGRhdGUgYmluZGluZ3NcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwcmVzZW5jZSBjaGFuZ2UgZnJvbScsIGZyb20pO1xuICAgICAgICAgICAgdGhpcy5wYXJzZVByZXNlbmNlKGZyb20sIG1lbWJlciwgcHJlcyk7XG5cbiAgICAgICAgICAgIC8vIFRyaWdnZXIgc3RhdHVzIG1lc3NhZ2UgdXBkYXRlXG4gICAgICAgICAgICBpZiAobWVtYmVyLnN0YXR1cykge1xuICAgICAgICAgICAgICAgIFVJQWN0aXZhdG9yLmdldFVJU2VydmljZSgpLm9uTXVjUHJlc2VuY2VTdGF0dXMoZnJvbSwgbWVtYmVyLCBwcmVzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIG9uUHJlc2VuY2VVbmF2YWlsYWJsZTogZnVuY3Rpb24gKHByZXMpIHtcbiAgICAgICAgICAgIHZhciBmcm9tID0gcHJlcy5nZXRBdHRyaWJ1dGUoJ2Zyb20nKTtcbiAgICAgICAgICAgIC8vIFN0YXR1cyBjb2RlIDExMCBpbmRpY2F0ZXMgdGhhdCB0aGlzIG5vdGlmaWNhdGlvbiBpcyBcInNlbGYtcHJlc2VuY2VcIi5cbiAgICAgICAgICAgIGlmICghJChwcmVzKS5maW5kKCc+eFt4bWxucz1cImh0dHA6Ly9qYWJiZXIub3JnL3Byb3RvY29sL211YyN1c2VyXCJdPnN0YXR1c1tjb2RlPVwiMTEwXCJdJykubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMubWVtYmVyc1tmcm9tXTtcbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RfbWVtYmVycy5zcGxpY2UodGhpcy5saXN0X21lbWJlcnMuaW5kZXhPZihmcm9tKSwgMSk7XG4gICAgICAgICAgICAgICAgdGhpcy5sZWZ0TXVjKGZyb20pO1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignbGVmdC5tdWMnLCBbZnJvbV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgdGhlIHN0YXR1cyBjb2RlIGlzIDExMCB0aGlzIG1lYW5zIHdlJ3JlIGxlYXZpbmcgYW5kIHdlIHdvdWxkIGxpa2VcbiAgICAgICAgICAgIC8vIHRvIHJlbW92ZSBldmVyeW9uZSBlbHNlIGZyb20gb3VyIHZpZXcsIHNvIHdlIHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5saXN0X21lbWJlcnMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5saXN0X21lbWJlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1lbWJlciA9IHRoaXMubGlzdF9tZW1iZXJzW2ldO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5tZW1iZXJzW2ldO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpc3RfbWVtYmVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGVmdE11YyhtZW1iZXIpO1xuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdsZWZ0Lm11YycsIG1lbWJlcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIGxlZnRNdWM6IGZ1bmN0aW9uIChqaWQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdsZWZ0Lm11YycsIGppZCk7XG4gICAgICAgICAgICBVSUFjdGl2YXRvci5nZXRVSVNlcnZpY2UoKS5vbk11Y0xlZnQoamlkKTtcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5qaW5nbGUudGVybWluYXRlQnlKaWQoamlkKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuZm9jdXMgPT0gbnVsbFxuICAgICAgICAgICAgICAgIC8vIEkgc2hvdWxkbid0IGJlIHRoZSBvbmUgdGhhdCBsZWZ0IHRvIGVudGVyIGhlcmUuXG4gICAgICAgICAgICAgICAgJiYgamlkICE9PSB0aGlzLmNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWRcbiAgICAgICAgICAgICAgICAmJiB0aGlzLmNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQgPT09IHRoaXMuY29ubmVjdGlvbi5lbXVjLmxpc3RfbWVtYmVyc1swXVxuICAgICAgICAgICAgICAgIC8vIElmIG91ciBzZXNzaW9uIGhhcyBiZWVuIHRlcm1pbmF0ZWQgZm9yIHNvbWUgcmVhc29uXG4gICAgICAgICAgICAgICAgLy8gKGtpY2tlZCwgaGFuZ3VwKSwgZG9uJ3QgdHJ5IHRvIGJlY29tZSB0aGUgZm9jdXNcbiAgICAgICAgICAgICAgICAmJiAhdGhpcy5zZXNzaW9uVGVybWluYXRlZCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3ZWxjb21lIHRvIG91ciBuZXcgZm9jdXMuLi4gbXlzZWxmJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5mb2N1cyA9IG5ldyBDb2xpYnJpRm9jdXModGhpcy5jb25uZWN0aW9uLCBjb25maWcuaG9zdHMuYnJpZGdlLCBldmVudEVtaXR0ZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0T3duTmlja25hbWUoKTtcblxuICAgICAgICAgICAgICAgIFVJQWN0aXZhdG9yLmdldFVJU2VydmljZSgpLnVwZGF0ZUJ1dHRvbnMobnVsbCwgdHJ1ZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LmtleXModGhpcy5tZW1iZXJzKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZm9jdXMubWFrZUNvbmZlcmVuY2UoT2JqZWN0LmtleXModGhpcy5tZW1iZXJzKSk7XG4gICAgICAgICAgICAgICAgICAgIFVJQWN0aXZhdG9yLmdldFVJU2VydmljZSgpLnVwZGF0ZUJ1dHRvbnModHJ1ZSwgbnVsbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2ZvY3VzZWNoYW5nZWQubXVjJywgW3RoaXMuZm9jdXNdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuZm9jdXMgJiYgT2JqZWN0LmtleXModGhpcy5jb25uZWN0aW9uLmVtdWMubWVtYmVycykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2V2ZXJ5b25lIGxlZnQnKTtcbiAgICAgICAgICAgICAgICAvLyBGSVhNRTogY2xvc2luZyB0aGUgY29ubmVjdGlvbiBpcyBhIGhhY2sgdG8gYXZvaWQgc29tZVxuICAgICAgICAgICAgICAgIC8vIHByb2JsZW1zIHdpdGggcmVpbml0XG4gICAgICAgICAgICAgICAgWE1QUEFjdGl2YXRvci5kaXNwb3NlQ29uZmVyZW5jZShmYWxzZSxudWxsLGZhbHNlKTtcbiAgICAgICAgICAgICAgICB0aGlzLmZvY3VzID0gbmV3IENvbGlicmlGb2N1cyh0aGlzLmNvbm5lY3Rpb24sIGNvbmZpZy5ob3N0cy5icmlkZ2UsIGV2ZW50RW1pdHRlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRPd25OaWNrbmFtZSgpO1xuICAgICAgICAgICAgICAgIFVJQWN0aXZhdG9yLmdldFVJU2VydmljZSgpLnVwZGF0ZUJ1dHRvbnModHJ1ZSwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5jb25uZWN0aW9uLmVtdWMuZ2V0UHJlemkoamlkKSkge1xuICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ3ByZXNlbnRhdGlvbnJlbW92ZWQubXVjJyxcbiAgICAgICAgICAgICAgICAgICAgW2ppZCwgdGhpcy5jb25uZWN0aW9uLmVtdWMuZ2V0UHJlemkoamlkKV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzZXRPd25OaWNrbmFtZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICBpZiAoWE1QUEFjdGl2YXRvci5nZXROaWNrbmFtZSgpICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5mb2N1cy5zZXRFbmRwb2ludERpc3BsYXlOYW1lKHRoaXMuY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZCxcbiAgICAgICAgICAgICAgICAgICAgWE1QUEFjdGl2YXRvci5nZXROaWNrbmFtZSgpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9LFxuICAgICAgICBvblByZXNlbmNlRXJyb3I6IGZ1bmN0aW9uIChwcmVzKSB7XG4gICAgICAgICAgICB2YXIgZnJvbSA9IHByZXMuZ2V0QXR0cmlidXRlKCdmcm9tJyk7XG4gICAgICAgICAgICBpZiAoJChwcmVzKS5maW5kKCc+ZXJyb3JbdHlwZT1cImF1dGhcIl0+bm90LWF1dGhvcml6ZWRbeG1sbnM9XCJ1cm46aWV0ZjpwYXJhbXM6eG1sOm5zOnhtcHAtc3Rhbnphc1wiXScpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIFVJQWN0aXZhdG9yLmdldFVJU2VydmljZSgpLnNob3dMb2NrUG9wdXAoZnJvbSwgdGhpcy5kb0pvaW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgkKHByZXMpLmZpbmQoXG4gICAgICAgICAgICAgICAgJz5lcnJvclt0eXBlPVwiY2FuY2VsXCJdPm5vdC1hbGxvd2VkW3htbG5zPVwidXJuOmlldGY6cGFyYW1zOnhtbDpuczp4bXBwLXN0YW56YXNcIl0nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB2YXIgdG9Eb21haW4gPSBTdHJvcGhlLmdldERvbWFpbkZyb21KaWQocHJlcy5nZXRBdHRyaWJ1dGUoJ3RvJykpO1xuICAgICAgICAgICAgICAgIGlmICh0b0RvbWFpbiA9PT0gY29uZmlnLmhvc3RzLmFub255bW91c2RvbWFpbikge1xuICAgICAgICAgICAgICAgICAgICAvLyB3ZSBhcmUgY29ubmVjdGVkIHdpdGggYW5vbnltb3VzIGRvbWFpbiBhbmQgb25seSBub24gYW5vbnltb3VzIHVzZXJzIGNhbiBjcmVhdGUgcm9vbXNcbiAgICAgICAgICAgICAgICAgICAgLy8gd2UgbXVzdCBhdXRob3JpemUgdGhlIHVzZXJcbiAgICAgICAgICAgICAgICAgICAgWE1QUEFjdGl2YXRvci5wcm9tcHRMb2dpbigpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2Fybignb25QcmVzRXJyb3IgJywgcHJlcyk7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5SZXBvcnREaWFsb2cobnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICdPb3BzISBTb21ldGhpbmcgd2VudCB3cm9uZyBhbmQgd2UgY291bGRuYHQgY29ubmVjdCB0byB0aGUgY29uZmVyZW5jZS4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ29uUHJlc0Vycm9yICcsIHByZXMpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5SZXBvcnREaWFsb2cobnVsbCxcbiAgICAgICAgICAgICAgICAgICAgJ09vcHMhIFNvbWV0aGluZyB3ZW50IHdyb25nIGFuZCB3ZSBjb3VsZG5gdCBjb25uZWN0IHRvIHRoZSBjb25mZXJlbmNlLicsXG4gICAgICAgICAgICAgICAgICAgIHByZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIHNlbmRNZXNzYWdlOiBmdW5jdGlvbiAoYm9keSwgbmlja25hbWUpIHtcbiAgICAgICAgICAgIHZhciBtc2cgPSAkbXNnKHt0bzogdGhpcy5yb29tamlkLCB0eXBlOiAnZ3JvdXBjaGF0J30pO1xuICAgICAgICAgICAgbXNnLmMoJ2JvZHknLCBib2R5KS51cCgpO1xuICAgICAgICAgICAgaWYgKG5pY2tuYW1lKSB7XG4gICAgICAgICAgICAgICAgbXNnLmMoJ25pY2snLCB7eG1sbnM6ICdodHRwOi8vamFiYmVyLm9yZy9wcm90b2NvbC9uaWNrJ30pLnQobmlja25hbWUpLnVwKCkudXAoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kKG1zZyk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldFN1YmplY3Q6IGZ1bmN0aW9uIChzdWJqZWN0KSB7XG4gICAgICAgICAgICB2YXIgbXNnID0gJG1zZyh7dG86IHRoaXMucm9vbWppZCwgdHlwZTogJ2dyb3VwY2hhdCd9KTtcbiAgICAgICAgICAgIG1zZy5jKCdzdWJqZWN0Jywgc3ViamVjdCk7XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZChtc2cpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ0b3BpYyBjaGFuZ2VkIHRvIFwiICsgc3ViamVjdCk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uTWVzc2FnZTogZnVuY3Rpb24gKG1zZykge1xuICAgICAgICAgICAgLy8gRklYTUU6IHRoaXMgaXMgYSBoYWNrLiBidXQgamluZ2xlIG9uIG11YyBtYWtlcyBuaWNrY2hhbmdlcyBoYXJkXG4gICAgICAgICAgICB2YXIgZnJvbSA9IG1zZy5nZXRBdHRyaWJ1dGUoJ2Zyb20nKTtcbiAgICAgICAgICAgIHZhciBuaWNrID0gJChtc2cpLmZpbmQoJz5uaWNrW3htbG5zPVwiaHR0cDovL2phYmJlci5vcmcvcHJvdG9jb2wvbmlja1wiXScpLnRleHQoKSB8fCBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChmcm9tKTtcblxuICAgICAgICAgICAgdmFyIHR4dCA9ICQobXNnKS5maW5kKCc+Ym9keScpLnRleHQoKTtcbiAgICAgICAgICAgIHZhciB0eXBlID0gbXNnLmdldEF0dHJpYnV0ZShcInR5cGVcIik7XG4gICAgICAgICAgICBpZiAodHlwZSA9PSBcImVycm9yXCIpIHtcbiAgICAgICAgICAgICAgICBVSUFjdGl2YXRvci5jaGF0QWRkRXJyb3IoJChtc2cpLmZpbmQoJz50ZXh0JykudGV4dCgpLCB0eHQpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc3ViamVjdCA9ICQobXNnKS5maW5kKCc+c3ViamVjdCcpO1xuICAgICAgICAgICAgaWYgKHN1YmplY3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN1YmplY3RUZXh0ID0gc3ViamVjdC50ZXh0KCk7XG4gICAgICAgICAgICAgICAgaWYgKHN1YmplY3RUZXh0IHx8IHN1YmplY3RUZXh0ID09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgVUlBY3RpdmF0b3IuY2hhdFNldFN1YmplY3Qoc3ViamVjdFRleHQpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlN1YmplY3QgaXMgY2hhbmdlZCB0byBcIiArIHN1YmplY3RUZXh0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgaWYgKHR4dCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjaGF0JywgbmljaywgdHh0KTtcblxuICAgICAgICAgICAgICAgIFVJQWN0aXZhdG9yLnVwZGF0ZUNoYXRDb252ZXJzYXRpb24oZnJvbSwgbmljaywgdHh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICBsb2NrUm9vbTogZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgLy9odHRwOi8veG1wcC5vcmcvZXh0ZW5zaW9ucy94ZXAtMDA0NS5odG1sI3Jvb21jb25maWdcbiAgICAgICAgICAgIHZhciBvYiA9IHRoaXM7XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKCRpcSh7dG86IHRoaXMucm9vbWppZCwgdHlwZTogJ2dldCd9KS5jKCdxdWVyeScsIHt4bWxuczogJ2h0dHA6Ly9qYWJiZXIub3JnL3Byb3RvY29sL211YyNvd25lcid9KSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkKHJlcykuZmluZCgnPnF1ZXJ5PnhbeG1sbnM9XCJqYWJiZXI6eDpkYXRhXCJdPmZpZWxkW3Zhcj1cIm11YyNyb29tY29uZmlnX3Jvb21zZWNyZXRcIl0nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmb3Jtc3VibWl0ID0gJGlxKHt0bzogb2Iucm9vbWppZCwgdHlwZTogJ3NldCd9KS5jKCdxdWVyeScsIHt4bWxuczogJ2h0dHA6Ly9qYWJiZXIub3JnL3Byb3RvY29sL211YyNvd25lcid9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1zdWJtaXQuYygneCcsIHt4bWxuczogJ2phYmJlcjp4OmRhdGEnLCB0eXBlOiAnc3VibWl0J30pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybXN1Ym1pdC5jKCdmaWVsZCcsIHsndmFyJzogJ0ZPUk1fVFlQRSd9KS5jKCd2YWx1ZScpLnQoJ2h0dHA6Ly9qYWJiZXIub3JnL3Byb3RvY29sL211YyNyb29tY29uZmlnJykudXAoKS51cCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybXN1Ym1pdC5jKCdmaWVsZCcsIHsndmFyJzogJ211YyNyb29tY29uZmlnX3Jvb21zZWNyZXQnfSkuYygndmFsdWUnKS50KGtleSkudXAoKS51cCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IGlzIG11YyNyb29tY29uZmlnX3Bhc3N3b3JkcHJvdGVjdGVkcm9vbSByZXF1aXJlZD9cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoZm9ybXN1Ym1pdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzZXQgcm9vbSBwYXNzd29yZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ3NldHRpbmcgcGFzc3dvcmQgZmFpbGVkJywgZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIuc2hvd0Vycm9yKCdMb2NrIGZhaWxlZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGxvY2sgY29uZmVyZW5jZS4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdyb29tIHBhc3N3b3JkcyBub3Qgc3VwcG9ydGVkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5zaG93RXJyb3IoJ1dhcm5pbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdSb29tIHBhc3N3b3JkcyBhcmUgY3VycmVudGx5IG5vdCBzdXBwb3J0ZWQuJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ3NldHRpbmcgcGFzc3dvcmQgZmFpbGVkJywgZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIuc2hvd0Vycm9yKCdMb2NrIGZhaWxlZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGxvY2sgY29uZmVyZW5jZS4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9LFxuICAgICAgICBraWNrOiBmdW5jdGlvbiAoamlkKSB7XG4gICAgICAgICAgICB2YXIga2lja0lRID0gJGlxKHt0bzogdGhpcy5yb29tamlkLCB0eXBlOiAnc2V0J30pXG4gICAgICAgICAgICAgICAgLmMoJ3F1ZXJ5Jywge3htbG5zOiAnaHR0cDovL2phYmJlci5vcmcvcHJvdG9jb2wvbXVjI2FkbWluJ30pXG4gICAgICAgICAgICAgICAgLmMoJ2l0ZW0nLCB7bmljazogU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKSwgcm9sZTogJ25vbmUnfSlcbiAgICAgICAgICAgICAgICAuYygncmVhc29uJykudCgnWW91IGhhdmUgYmVlbiBraWNrZWQuJykudXAoKS51cCgpLnVwKCk7XG5cbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoXG4gICAgICAgICAgICAgICAga2lja0lRLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0tpY2sgcGFydGljaXBhbnQgd2l0aCBqaWQ6ICcsIGppZCwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnS2ljayBwYXJ0aWNpcGFudCBlcnJvcjogJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBzZW5kUHJlc2VuY2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBwcmVzID0gJHByZXMoe3RvOiB0aGlzLnByZXNNYXBbJ3RvJ10gfSk7XG4gICAgICAgICAgICBwcmVzLmMoJ3gnLCB7eG1sbnM6IHRoaXMucHJlc01hcFsneG5zJ119KTtcblxuICAgICAgICAgICAgaWYgKHRoaXMucHJlc01hcFsncGFzc3dvcmQnXSkge1xuICAgICAgICAgICAgICAgIHByZXMuYygncGFzc3dvcmQnKS50KHRoaXMucHJlc01hcFsncGFzc3dvcmQnXSkudXAoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcHJlcy51cCgpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5wcmVzTWFwWydicmlkZ2VJc0Rvd24nXSkge1xuICAgICAgICAgICAgICAgIHByZXMuYygnYnJpZGdlSXNEb3duJykudXAoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRoaXMucHJlc01hcFsnZGlzcGxheU5hbWUnXSkge1xuICAgICAgICAgICAgICAgIC8vIFhFUC0wMTcyXG4gICAgICAgICAgICAgICAgcHJlcy5jKCduaWNrJywge3htbG5zOiAnaHR0cDovL2phYmJlci5vcmcvcHJvdG9jb2wvbmljayd9KVxuICAgICAgICAgICAgICAgICAgICAudCh0aGlzLnByZXNNYXBbJ2Rpc3BsYXlOYW1lJ10pLnVwKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnByZXNNYXBbJ2F1ZGlvbnMnXSkge1xuICAgICAgICAgICAgICAgIHByZXMuYygnYXVkaW9tdXRlZCcsIHt4bWxuczogdGhpcy5wcmVzTWFwWydhdWRpb25zJ119KVxuICAgICAgICAgICAgICAgICAgICAudCh0aGlzLnByZXNNYXBbJ2F1ZGlvbXV0ZWQnXSkudXAoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRoaXMucHJlc01hcFsndmlkZW9ucyddKSB7XG4gICAgICAgICAgICAgICAgcHJlcy5jKCd2aWRlb211dGVkJywge3htbG5zOiB0aGlzLnByZXNNYXBbJ3ZpZGVvbnMnXX0pXG4gICAgICAgICAgICAgICAgICAgIC50KHRoaXMucHJlc01hcFsndmlkZW9tdXRlZCddKS51cCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5wcmVzTWFwWydwcmV6aW5zJ10pIHtcbiAgICAgICAgICAgICAgICBwcmVzLmMoJ3ByZXppJyxcbiAgICAgICAgICAgICAgICAgICAge3htbG5zOiB0aGlzLnByZXNNYXBbJ3ByZXppbnMnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICd1cmwnOiB0aGlzLnByZXNNYXBbJ3ByZXppdXJsJ119KVxuICAgICAgICAgICAgICAgICAgICAuYygnY3VycmVudCcpLnQodGhpcy5wcmVzTWFwWydwcmV6aWN1cnJlbnQnXSkudXAoKS51cCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5wcmVzTWFwWydldGhlcnBhZG5zJ10pIHtcbiAgICAgICAgICAgICAgICBwcmVzLmMoJ2V0aGVycGFkJywge3htbG5zOiB0aGlzLnByZXNNYXBbJ2V0aGVycGFkbnMnXX0pXG4gICAgICAgICAgICAgICAgICAgIC50KHRoaXMucHJlc01hcFsnZXRoZXJwYWRuYW1lJ10pLnVwKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnByZXNNYXBbJ21lZGlhbnMnXSkge1xuICAgICAgICAgICAgICAgIHByZXMuYygnbWVkaWEnLCB7eG1sbnM6IHRoaXMucHJlc01hcFsnbWVkaWFucyddfSk7XG4gICAgICAgICAgICAgICAgdmFyIHNvdXJjZU51bWJlciA9IDA7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmtleXModGhpcy5wcmVzTWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5pbmRleE9mKCdzb3VyY2UnKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2VOdW1iZXIrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmIChzb3VyY2VOdW1iZXIgPiAwKVxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8PSBzb3VyY2VOdW1iZXIgLyAzOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZXMuYygnc291cmNlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dHlwZTogdGhpcy5wcmVzTWFwWydzb3VyY2UnICsgaSArICdfdHlwZSddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzc3JjOiB0aGlzLnByZXNNYXBbJ3NvdXJjZScgKyBpICsgJ19zc3JjJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbjogdGhpcy5wcmVzTWFwWydzb3VyY2UnICsgaSArICdfZGlyZWN0aW9uJ11cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8ICdzZW5kcmVjdicgfVxuICAgICAgICAgICAgICAgICAgICAgICAgKS51cCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHByZXMudXAoKTtcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kKHByZXMpO1xuICAgICAgICB9LFxuICAgICAgICBhZGREaXNwbGF5TmFtZVRvUHJlc2VuY2U6IGZ1bmN0aW9uIChkaXNwbGF5TmFtZSkge1xuICAgICAgICAgICAgdGhpcy5wcmVzTWFwWydkaXNwbGF5TmFtZSddID0gZGlzcGxheU5hbWU7XG4gICAgICAgIH0sXG4gICAgICAgIGFkZE1lZGlhVG9QcmVzZW5jZTogZnVuY3Rpb24gKHNvdXJjZU51bWJlciwgbXR5cGUsIHNzcmNzLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5wcmVzTWFwWydtZWRpYW5zJ10pXG4gICAgICAgICAgICAgICAgdGhpcy5wcmVzTWFwWydtZWRpYW5zJ10gPSAnaHR0cDovL2VzdG9zLmRlL25zL21qcyc7XG5cbiAgICAgICAgICAgIHRoaXMucHJlc01hcFsnc291cmNlJyArIHNvdXJjZU51bWJlciArICdfdHlwZSddID0gbXR5cGU7XG4gICAgICAgICAgICB0aGlzLnByZXNNYXBbJ3NvdXJjZScgKyBzb3VyY2VOdW1iZXIgKyAnX3NzcmMnXSA9IHNzcmNzO1xuICAgICAgICAgICAgdGhpcy5wcmVzTWFwWydzb3VyY2UnICsgc291cmNlTnVtYmVyICsgJ19kaXJlY3Rpb24nXSA9IGRpcmVjdGlvbjtcbiAgICAgICAgfSxcbiAgICAgICAgY2xlYXJQcmVzZW5jZU1lZGlhOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyh0aGlzLnByZXNNYXApLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgIGlmIChrZXkuaW5kZXhPZignc291cmNlJykgIT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHNlbGYucHJlc01hcFtrZXldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBhZGRQcmV6aVRvUHJlc2VuY2U6IGZ1bmN0aW9uICh1cmwsIGN1cnJlbnRTbGlkZSkge1xuICAgICAgICAgICAgdGhpcy5wcmVzTWFwWydwcmV6aW5zJ10gPSAnaHR0cDovL2ppdHNpLm9yZy9qaXRtZWV0L3ByZXppJztcbiAgICAgICAgICAgIHRoaXMucHJlc01hcFsncHJleml1cmwnXSA9IHVybDtcbiAgICAgICAgICAgIHRoaXMucHJlc01hcFsncHJlemljdXJyZW50J10gPSBjdXJyZW50U2xpZGU7XG4gICAgICAgIH0sXG4gICAgICAgIHJlbW92ZVByZXppRnJvbVByZXNlbmNlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5wcmVzTWFwWydwcmV6aW5zJ107XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5wcmVzTWFwWydwcmV6aXVybCddO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMucHJlc01hcFsncHJlemljdXJyZW50J107XG4gICAgICAgIH0sXG4gICAgICAgIGFkZEN1cnJlbnRTbGlkZVRvUHJlc2VuY2U6IGZ1bmN0aW9uIChjdXJyZW50U2xpZGUpIHtcbiAgICAgICAgICAgIHRoaXMucHJlc01hcFsncHJlemljdXJyZW50J10gPSBjdXJyZW50U2xpZGU7XG4gICAgICAgIH0sXG4gICAgICAgIGdldFByZXppOiBmdW5jdGlvbiAocm9vbWppZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJlemlNYXBbcm9vbWppZF07XG4gICAgICAgIH0sXG4gICAgICAgIGFkZEV0aGVycGFkVG9QcmVzZW5jZTogZnVuY3Rpb24gKGV0aGVycGFkTmFtZSkge1xuICAgICAgICAgICAgdGhpcy5wcmVzTWFwWydldGhlcnBhZG5zJ10gPSAnaHR0cDovL2ppdHNpLm9yZy9qaXRtZWV0L2V0aGVycGFkJztcbiAgICAgICAgICAgIHRoaXMucHJlc01hcFsnZXRoZXJwYWRuYW1lJ10gPSBldGhlcnBhZE5hbWU7XG4gICAgICAgIH0sXG4gICAgICAgIGFkZEF1ZGlvSW5mb1RvUHJlc2VuY2U6IGZ1bmN0aW9uIChpc011dGVkKSB7XG4gICAgICAgICAgICB0aGlzLnByZXNNYXBbJ2F1ZGlvbnMnXSA9ICdodHRwOi8vaml0c2kub3JnL2ppdG1lZXQvYXVkaW8nO1xuICAgICAgICAgICAgdGhpcy5wcmVzTWFwWydhdWRpb211dGVkJ10gPSBpc011dGVkLnRvU3RyaW5nKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGFkZFZpZGVvSW5mb1RvUHJlc2VuY2U6IGZ1bmN0aW9uIChpc011dGVkKSB7XG4gICAgICAgICAgICB0aGlzLnByZXNNYXBbJ3ZpZGVvbnMnXSA9ICdodHRwOi8vaml0c2kub3JnL2ppdG1lZXQvdmlkZW8nO1xuICAgICAgICAgICAgdGhpcy5wcmVzTWFwWyd2aWRlb211dGVkJ10gPSBpc011dGVkLnRvU3RyaW5nKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZpbmRKaWRGcm9tUmVzb3VyY2U6IGZ1bmN0aW9uIChyZXNvdXJjZUppZCkge1xuICAgICAgICAgICAgdmFyIHBlZXJKaWQgPSBudWxsO1xuICAgICAgICAgICAgT2JqZWN0LmtleXModGhpcy5tZW1iZXJzKS5zb21lKGZ1bmN0aW9uIChqaWQpIHtcbiAgICAgICAgICAgICAgICBwZWVySmlkID0gamlkO1xuICAgICAgICAgICAgICAgIHJldHVybiBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpID09PSByZXNvdXJjZUppZDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIHBlZXJKaWQ7XG4gICAgICAgIH0sXG4gICAgICAgIGFkZEJyaWRnZUlzRG93blRvUHJlc2VuY2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMucHJlc01hcFsnYnJpZGdlSXNEb3duJ10gPSB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICBwYXJzZVByZXNlbmNlOiBmdW5jdGlvbiAoamlkLCBpbmZvLCBwcmVzKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICAvLyBSZW1vdmUgb2xkIHNzcmNzIGNvbWluZyBmcm9tIHRoZSBqaWRcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKHRoaXMuc3NyYzJqaWQpLmZvckVhY2goZnVuY3Rpb24gKHNzcmMpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5zc3JjMmppZFtzc3JjXSA9PSBqaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHNlbGYuc3NyYzJqaWRbc3NyY107XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGVsZXRlZCBcIiArIHNzcmMgKyBcIiBmb3IgXCIgKyBqaWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5zc3JjMnZpZGVvVHlwZVtzc3JjXSA9PSBqaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHNlbGYuc3NyYzJ2aWRlb1R5cGVbc3NyY107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICQocHJlcykuZmluZCgnPm1lZGlhW3htbG5zPVwiaHR0cDovL2VzdG9zLmRlL25zL21qc1wiXT5zb3VyY2UnKS5lYWNoKGZ1bmN0aW9uIChpZHgsIHNzcmMpIHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKGppZCwgJ2Fzc29jIHNzcmMnLCBzc3JjLmdldEF0dHJpYnV0ZSgndHlwZScpLCBzc3JjLmdldEF0dHJpYnV0ZSgnc3NyYycpKTtcbiAgICAgICAgICAgICAgICB2YXIgc3NyY1YgPSBzc3JjLmdldEF0dHJpYnV0ZSgnc3NyYycpO1xuICAgICAgICAgICAgICAgIHNlbGYuc3NyYzJqaWRbc3NyY1ZdID0gamlkO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWRkZWQgXCIgKyBzc3JjViArIFwiIGZvciBcIiArIGppZCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IHNzcmMuZ2V0QXR0cmlidXRlKCd0eXBlJyk7XG4gICAgICAgICAgICAgICAgc2VsZi5zc3JjMnZpZGVvVHlwZVtzc3JjVl0gPSB0eXBlO1xuXG4gICAgICAgICAgICAgICAgLy8gbWlnaHQgbmVlZCB0byB1cGRhdGUgdGhlIGRpcmVjdGlvbiBpZiBwYXJ0aWNpcGFudCBqdXN0IHdlbnQgZnJvbSBzZW5kcmVjdiB0byByZWN2b25seVxuICAgICAgICAgICAgICAgIGlmICh0eXBlID09PSAndmlkZW8nIHx8IHR5cGUgPT09ICdzY3JlZW4nKSB7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoc3NyYy5nZXRBdHRyaWJ1dGUoJ2RpcmVjdGlvbicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdzZW5kcmVjdic6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVUlBY3RpdmF0b3Iuc2hvd1ZpZGVvRm9ySklEKFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGppZCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAncmVjdm9ubHknOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFVJQWN0aXZhdG9yLmhpZGVWaWRlb0ZvckpJRChTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvL2ZpcmUgZGlzcGxheSBuYW1lIGV2ZW50XG4gICAgICAgICAgICBpZiAoaW5mby5kaXNwbGF5TmFtZSAmJiBpbmZvLmRpc3BsYXlOYW1lLmxlbmd0aCA+IDApXG4gICAgICAgICAgICAgICAgZXZlbnRFbWl0dGVyLmVtaXQoWE1QUEV2ZW50cy5ESVNQTEFZX05BTUVfQ0hBTkdFRCxcbiAgICAgICAgICAgICAgICAgICAgamlkLCBpbmZvLmRpc3BsYXlOYW1lKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuZm9jdXMgIT09IG51bGwgJiYgaW5mby5kaXNwbGF5TmFtZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZm9jdXMuc2V0RW5kcG9pbnREaXNwbGF5TmFtZShqaWQsIGluZm8uZGlzcGxheU5hbWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL2NoZWNrIGlmIHRoZSB2aWRlbyBicmlkZ2UgaXMgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZigkKHByZXMpLmZpbmQoXCI+YnJpZGdlSXNEb3duXCIpLmxlbmd0aCA+IDAgJiYgIWJyaWRnZUlzRG93bikge1xuICAgICAgICAgICAgICAgIGJyaWRnZUlzRG93biA9IHRydWU7XG4gICAgICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIuc2hvd0Vycm9yKFwiRXJyb3JcIixcbiAgICAgICAgICAgICAgICAgICAgXCJUaGUgdmlkZW8gYnJpZGdlIGlzIGN1cnJlbnRseSB1bmF2YWlsYWJsZS5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbiIsIi8qIGpzaGludCAtVzExNyAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICBTdHJvcGhlLmFkZENvbm5lY3Rpb25QbHVnaW4oJ3JheW8nLFxuICAgICAgICB7XG4gICAgICAgICAgICBSQVlPX1hNTE5TOiAndXJuOnhtcHA6cmF5bzoxJyxcbiAgICAgICAgICAgIGNvbm5lY3Rpb246IG51bGwsXG4gICAgICAgICAgICBpbml0OiBmdW5jdGlvbiAoY29ubikge1xuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbiA9IGNvbm47XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29ubmVjdGlvbi5kaXNjbykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uZGlzY28uYWRkRmVhdHVyZSgndXJuOnhtcHA6cmF5bzpjbGllbnQ6MScpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5hZGRIYW5kbGVyKFxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uUmF5by5iaW5kKHRoaXMpLCB0aGlzLlJBWU9fWE1MTlMsICdpcScsICdzZXQnLCBudWxsLCBudWxsKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblJheW86IGZ1bmN0aW9uIChpcSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIlJheW8gSVFcIiwgaXEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRpYWw6IGZ1bmN0aW9uICh0bywgZnJvbSwgcm9vbU5hbWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICAgICAgdmFyIHJlcSA9ICRpcShcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3NldCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB0bzogY29uZmlnLmhvc3RzLmNhbGxfY29udHJvbFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICByZXEuYygnZGlhbCcsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHhtbG5zOiB0aGlzLlJBWU9fWE1MTlMsXG4gICAgICAgICAgICAgICAgICAgICAgICB0bzogdG8sXG4gICAgICAgICAgICAgICAgICAgICAgICBmcm9tOiBmcm9tXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJlcS5jKCdoZWFkZXInLFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiAnSnZiUm9vbU5hbWUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHJvb21OYW1lXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmRJUShcbiAgICAgICAgICAgICAgICAgICAgcmVxLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oJ0RpYWwgcmVzdWx0ICcsIHJlc3VsdCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXNvdXJjZSA9ICQocmVzdWx0KS5maW5kKCdyZWYnKS5hdHRyKCd1cmknKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FsbF9yZXNvdXJjZSA9IHJlc291cmNlLnN1YnN0cigneG1wcDonLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiUmVjZWl2ZWQgY2FsbCByZXNvdXJjZTogXCIgKyB0aGlzLmNhbGxfcmVzb3VyY2UpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnRGlhbCBlcnJvciAnLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhhbmdfdXA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuY2FsbF9yZXNvdXJjZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJObyBjYWxsIGluIHByb2dyZXNzXCIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgICAgIHZhciByZXEgPSAkaXEoXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzZXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdG86IHRoaXMuY2FsbF9yZXNvdXJjZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICByZXEuYygnaGFuZ3VwJyxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgeG1sbnM6IHRoaXMuUkFZT19YTUxOU1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoXG4gICAgICAgICAgICAgICAgICAgIHJlcSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKCdIYW5ndXAgcmVzdWx0ICcsIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmNhbGxfcmVzb3VyY2UgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnSGFuZ3VwIGVycm9yICcsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuY2FsbF9yZXNvdXJjZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbn07IiwidmFyIFNEUCA9IHJlcXVpcmUoXCIuL3N0cm9waGUuamluZ2xlLnNkcFwiKTtcblxuZnVuY3Rpb24gVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24oaWNlX2NvbmZpZywgY29uc3RyYWludHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIFJUQ1BlZXJjb25uZWN0aW9uID0gbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSA/IG1velJUQ1BlZXJDb25uZWN0aW9uIDogd2Via2l0UlRDUGVlckNvbm5lY3Rpb247XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbiA9IG5ldyBSVENQZWVyY29ubmVjdGlvbihpY2VfY29uZmlnLCBjb25zdHJhaW50cyk7XG4gICAgdGhpcy51cGRhdGVMb2cgPSBbXTtcbiAgICB0aGlzLnN0YXRzID0ge307XG4gICAgdGhpcy5zdGF0c2ludGVydmFsID0gbnVsbDtcbiAgICB0aGlzLm1heHN0YXRzID0gMDsgLy8gbGltaXQgdG8gMzAwIHZhbHVlcywgaS5lLiA1IG1pbnV0ZXM7IHNldCB0byAwIHRvIGRpc2FibGVcblxuICAgIC8qKlxuICAgICAqIEFycmF5IG9mIHNzcmNzIHRoYXQgd2lsbCBiZSBhZGRlZCBvbiBuZXh0IG1vZGlmeVNvdXJjZXMgY2FsbC5cbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgdGhpcy5hZGRzc3JjID0gW107XG4gICAgLyoqXG4gICAgICogQXJyYXkgb2Ygc3NyY3MgdGhhdCB3aWxsIGJlIGFkZGVkIG9uIG5leHQgbW9kaWZ5U291cmNlcyBjYWxsLlxuICAgICAqIEB0eXBlIHtBcnJheX1cbiAgICAgKi9cbiAgICB0aGlzLnJlbW92ZXNzcmMgPSBbXTtcbiAgICAvKipcbiAgICAgKiBQZW5kaW5nIG9wZXJhdGlvbiB0aGF0IHdpbGwgYmUgZG9uZSBkdXJpbmcgbW9kaWZ5U291cmNlcyBjYWxsLlxuICAgICAqIEN1cnJlbnRseSAnbXV0ZScvJ3VubXV0ZScgb3BlcmF0aW9ucyBhcmUgc3VwcG9ydGVkLlxuICAgICAqXG4gICAgICogQHR5cGUge1N0cmluZ31cbiAgICAgKi9cbiAgICB0aGlzLnBlbmRpbmdvcCA9IG51bGw7XG5cbiAgICAvKipcbiAgICAgKiBGbGFnIGluZGljYXRlcyB0aGF0IHBlZXIgY29ubmVjdGlvbiBzdHJlYW0gaGF2ZSBjaGFuZ2VkIGFuZCBtb2RpZnlTb3VyY2VzIHNob3VsZCBwcm9jZWVkLlxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIHRoaXMuc3dpdGNoc3RyZWFtcyA9IGZhbHNlO1xuXG4gICAgLy8gb3ZlcnJpZGUgYXMgZGVzaXJlZFxuICAgIHRoaXMudHJhY2UgPSBmdW5jdGlvbiAod2hhdCwgaW5mbykge1xuICAgICAgICAvL2NvbnNvbGUud2FybignV1RSQUNFJywgd2hhdCwgaW5mbyk7XG4gICAgICAgIHNlbGYudXBkYXRlTG9nLnB1c2goe1xuICAgICAgICAgICAgdGltZTogbmV3IERhdGUoKSxcbiAgICAgICAgICAgIHR5cGU6IHdoYXQsXG4gICAgICAgICAgICB2YWx1ZTogaW5mbyB8fCBcIlwiXG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgdGhpcy5vbmljZWNhbmRpZGF0ZSA9IG51bGw7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5vbmljZWNhbmRpZGF0ZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBzZWxmLnRyYWNlKCdvbmljZWNhbmRpZGF0ZScsIEpTT04uc3RyaW5naWZ5KGV2ZW50LmNhbmRpZGF0ZSwgbnVsbCwgJyAnKSk7XG4gICAgICAgIGlmIChzZWxmLm9uaWNlY2FuZGlkYXRlICE9PSBudWxsKSB7XG4gICAgICAgICAgICBzZWxmLm9uaWNlY2FuZGlkYXRlKGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5vbmFkZHN0cmVhbSA9IG51bGw7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5vbmFkZHN0cmVhbSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBzZWxmLnRyYWNlKCdvbmFkZHN0cmVhbScsIGV2ZW50LnN0cmVhbS5pZCk7XG4gICAgICAgIGlmIChzZWxmLm9uYWRkc3RyZWFtICE9PSBudWxsKSB7XG4gICAgICAgICAgICBzZWxmLm9uYWRkc3RyZWFtKGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5vbnJlbW92ZXN0cmVhbSA9IG51bGw7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5vbnJlbW92ZXN0cmVhbSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBzZWxmLnRyYWNlKCdvbnJlbW92ZXN0cmVhbScsIGV2ZW50LnN0cmVhbS5pZCk7XG4gICAgICAgIGlmIChzZWxmLm9ucmVtb3Zlc3RyZWFtICE9PSBudWxsKSB7XG4gICAgICAgICAgICBzZWxmLm9ucmVtb3Zlc3RyZWFtKGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5vbnNpZ25hbGluZ3N0YXRlY2hhbmdlID0gbnVsbDtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLm9uc2lnbmFsaW5nc3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgc2VsZi50cmFjZSgnb25zaWduYWxpbmdzdGF0ZWNoYW5nZScsIHNlbGYuc2lnbmFsaW5nU3RhdGUpO1xuICAgICAgICBpZiAoc2VsZi5vbnNpZ25hbGluZ3N0YXRlY2hhbmdlICE9PSBudWxsKSB7XG4gICAgICAgICAgICBzZWxmLm9uc2lnbmFsaW5nc3RhdGVjaGFuZ2UoZXZlbnQpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLm9uaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlID0gbnVsbDtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLm9uaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHNlbGYudHJhY2UoJ29uaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlJywgc2VsZi5pY2VDb25uZWN0aW9uU3RhdGUpO1xuICAgICAgICBpZiAoc2VsZi5vbmljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgc2VsZi5vbmljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZShldmVudCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMub25uZWdvdGlhdGlvbm5lZWRlZCA9IG51bGw7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5vbm5lZ290aWF0aW9ubmVlZGVkID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHNlbGYudHJhY2UoJ29ubmVnb3RpYXRpb25uZWVkZWQnKTtcbiAgICAgICAgaWYgKHNlbGYub25uZWdvdGlhdGlvbm5lZWRlZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgc2VsZi5vbm5lZ290aWF0aW9ubmVlZGVkKGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgc2VsZi5vbmRhdGFjaGFubmVsID0gbnVsbDtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLm9uZGF0YWNoYW5uZWwgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgc2VsZi50cmFjZSgnb25kYXRhY2hhbm5lbCcsIGV2ZW50KTtcbiAgICAgICAgaWYgKHNlbGYub25kYXRhY2hhbm5lbCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgc2VsZi5vbmRhdGFjaGFubmVsKGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgaWYgKCFuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhICYmIHRoaXMubWF4c3RhdHMpIHtcbiAgICAgICAgdGhpcy5zdGF0c2ludGVydmFsID0gd2luZG93LnNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgc2VsZi5wZWVyY29ubmVjdGlvbi5nZXRTdGF0cyhmdW5jdGlvbihzdGF0cykge1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHRzID0gc3RhdHMucmVzdWx0KCk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXN1bHRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cocmVzdWx0c1tpXS50eXBlLCByZXN1bHRzW2ldLmlkLCByZXN1bHRzW2ldLm5hbWVzKCkpXG4gICAgICAgICAgICAgICAgICAgIHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzW2ldLm5hbWVzKCkuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkID0gcmVzdWx0c1tpXS5pZCArICctJyArIG5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXNlbGYuc3RhdHNbaWRdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5zdGF0c1tpZF0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0VGltZTogbm93LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmRUaW1lOiBub3csXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlczogW10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVzOiBbXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnN0YXRzW2lkXS52YWx1ZXMucHVzaChyZXN1bHRzW2ldLnN0YXQobmFtZSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5zdGF0c1tpZF0udGltZXMucHVzaChub3cuZ2V0VGltZSgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLnN0YXRzW2lkXS52YWx1ZXMubGVuZ3RoID4gc2VsZi5tYXhzdGF0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuc3RhdHNbaWRdLnZhbHVlcy5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuc3RhdHNbaWRdLnRpbWVzLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnN0YXRzW2lkXS5lbmRUaW1lID0gbm93O1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9LCAxMDAwKTtcbiAgICB9XG59O1xuXG5kdW1wU0RQID0gZnVuY3Rpb24oZGVzY3JpcHRpb24pIHtcbiAgICByZXR1cm4gJ3R5cGU6ICcgKyBkZXNjcmlwdGlvbi50eXBlICsgJ1xcclxcbicgKyBkZXNjcmlwdGlvbi5zZHA7XG59XG5cbmlmIChUcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuX19kZWZpbmVHZXR0ZXJfXyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLl9fZGVmaW5lR2V0dGVyX18oJ3NpZ25hbGluZ1N0YXRlJywgZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnBlZXJjb25uZWN0aW9uLnNpZ25hbGluZ1N0YXRlOyB9KTtcbiAgICBUcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuX19kZWZpbmVHZXR0ZXJfXygnaWNlQ29ubmVjdGlvblN0YXRlJywgZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnBlZXJjb25uZWN0aW9uLmljZUNvbm5lY3Rpb25TdGF0ZTsgfSk7XG4gICAgVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLl9fZGVmaW5lR2V0dGVyX18oJ2xvY2FsRGVzY3JpcHRpb24nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHNpbXVsY2FzdCA9IG5ldyBTaW11bGNhc3QoKTtcbiAgICAgICAgdmFyIHB1YmxpY0xvY2FsRGVzY3JpcHRpb24gPSBzaW11bGNhc3QucmV2ZXJzZVRyYW5zZm9ybUxvY2FsRGVzY3JpcHRpb24odGhpcy5wZWVyY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uKTtcbiAgICAgICAgcmV0dXJuIHB1YmxpY0xvY2FsRGVzY3JpcHRpb247XG4gICAgfSk7XG4gICAgVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLl9fZGVmaW5lR2V0dGVyX18oJ3JlbW90ZURlc2NyaXB0aW9uJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzaW11bGNhc3QgPSBuZXcgU2ltdWxjYXN0KCk7XG4gICAgICAgIHZhciBwdWJsaWNSZW1vdGVEZXNjcmlwdGlvbiA9IHNpbXVsY2FzdC5yZXZlcnNlVHJhbnNmb3JtUmVtb3RlRGVzY3JpcHRpb24odGhpcy5wZWVyY29ubmVjdGlvbi5yZW1vdGVEZXNjcmlwdGlvbik7XG4gICAgICAgIHJldHVybiBwdWJsaWNSZW1vdGVEZXNjcmlwdGlvbjtcbiAgICB9KTtcbn1cblxuVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFN0cmVhbSA9IGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICB0aGlzLnRyYWNlKCdhZGRTdHJlYW0nLCBzdHJlYW0uaWQpO1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uYWRkU3RyZWFtKHN0cmVhbS5nZXRPcmlnaW5hbFN0cmVhbSgpKTtcbn07XG5cblRyYWNlYWJsZVBlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVTdHJlYW0gPSBmdW5jdGlvbiAoc3RyZWFtKSB7XG4gICAgdGhpcy50cmFjZSgncmVtb3ZlU3RyZWFtJywgc3RyZWFtLmlkKTtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLnJlbW92ZVN0cmVhbShzdHJlYW0uZ2V0T3JpZ2luYWxTdHJlYW0oKSk7XG59O1xuXG5UcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuY3JlYXRlRGF0YUNoYW5uZWwgPSBmdW5jdGlvbiAobGFiZWwsIG9wdHMpIHtcbiAgICB0aGlzLnRyYWNlKCdjcmVhdGVEYXRhQ2hhbm5lbCcsIGxhYmVsLCBvcHRzKTtcbiAgICByZXR1cm4gdGhpcy5wZWVyY29ubmVjdGlvbi5jcmVhdGVEYXRhQ2hhbm5lbChsYWJlbCwgb3B0cyk7XG59O1xuXG5UcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuc2V0TG9jYWxEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uIChkZXNjcmlwdGlvbiwgc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHNpbXVsY2FzdCA9IG5ldyBTaW11bGNhc3QoKTtcbiAgICBkZXNjcmlwdGlvbiA9IHNpbXVsY2FzdC50cmFuc2Zvcm1Mb2NhbERlc2NyaXB0aW9uKGRlc2NyaXB0aW9uKTtcbiAgICB0aGlzLnRyYWNlKCdzZXRMb2NhbERlc2NyaXB0aW9uJywgZHVtcFNEUChkZXNjcmlwdGlvbikpO1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uc2V0TG9jYWxEZXNjcmlwdGlvbihkZXNjcmlwdGlvbixcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi50cmFjZSgnc2V0TG9jYWxEZXNjcmlwdGlvbk9uU3VjY2VzcycpO1xuICAgICAgICAgICAgc3VjY2Vzc0NhbGxiYWNrKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIHNlbGYudHJhY2UoJ3NldExvY2FsRGVzY3JpcHRpb25PbkZhaWx1cmUnLCBlcnIpO1xuICAgICAgICAgICAgZmFpbHVyZUNhbGxiYWNrKGVycik7XG4gICAgICAgIH1cbiAgICApO1xuICAgIC8qXG4gICAgIGlmICh0aGlzLnN0YXRzaW50ZXJ2YWwgPT09IG51bGwgJiYgdGhpcy5tYXhzdGF0cyA+IDApIHtcbiAgICAgLy8gc3RhcnQgZ2F0aGVyaW5nIHN0YXRzXG4gICAgIH1cbiAgICAgKi9cbn07XG5cblRyYWNlYWJsZVBlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5zZXRSZW1vdGVEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uIChkZXNjcmlwdGlvbiwgc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHNpbXVsY2FzdCA9IG5ldyBTaW11bGNhc3QoKTtcbiAgICBkZXNjcmlwdGlvbiA9IHNpbXVsY2FzdC50cmFuc2Zvcm1SZW1vdGVEZXNjcmlwdGlvbihkZXNjcmlwdGlvbik7XG4gICAgdGhpcy50cmFjZSgnc2V0UmVtb3RlRGVzY3JpcHRpb24nLCBkdW1wU0RQKGRlc2NyaXB0aW9uKSk7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5zZXRSZW1vdGVEZXNjcmlwdGlvbihkZXNjcmlwdGlvbixcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi50cmFjZSgnc2V0UmVtb3RlRGVzY3JpcHRpb25PblN1Y2Nlc3MnKTtcbiAgICAgICAgICAgIHN1Y2Nlc3NDYWxsYmFjaygpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBzZWxmLnRyYWNlKCdzZXRSZW1vdGVEZXNjcmlwdGlvbk9uRmFpbHVyZScsIGVycik7XG4gICAgICAgICAgICBmYWlsdXJlQ2FsbGJhY2soZXJyKTtcbiAgICAgICAgfVxuICAgICk7XG4gICAgLypcbiAgICAgaWYgKHRoaXMuc3RhdHNpbnRlcnZhbCA9PT0gbnVsbCAmJiB0aGlzLm1heHN0YXRzID4gMCkge1xuICAgICAvLyBzdGFydCBnYXRoZXJpbmcgc3RhdHNcbiAgICAgfVxuICAgICAqL1xufTtcblxuVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmhhcmRNdXRlVmlkZW8gPSBmdW5jdGlvbiAobXV0ZWQpIHtcbiAgICB0aGlzLnBlbmRpbmdvcCA9IG11dGVkID8gJ211dGUnIDogJ3VubXV0ZSc7XG59O1xuXG5UcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZW5xdWV1ZUFkZFNzcmMgPSBmdW5jdGlvbihjaGFubmVsLCBzc3JjTGluZXMpIHtcbiAgICBpZiAoIXRoaXMuYWRkc3NyY1tjaGFubmVsXSkge1xuICAgICAgICB0aGlzLmFkZHNzcmNbY2hhbm5lbF0gPSAnJztcbiAgICB9XG4gICAgdGhpcy5hZGRzc3JjW2NoYW5uZWxdICs9IHNzcmNMaW5lcztcbn1cblxuVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFNvdXJjZSA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgY29uc29sZS5sb2coJ2FkZHNzcmMnLCBuZXcgRGF0ZSgpLmdldFRpbWUoKSk7XG4gICAgY29uc29sZS5sb2coJ2ljZScsIHRoaXMuaWNlQ29ubmVjdGlvblN0YXRlKTtcbiAgICB2YXIgc2RwID0gbmV3IFNEUCh0aGlzLnJlbW90ZURlc2NyaXB0aW9uLnNkcCk7XG4gICAgdmFyIG15U2RwID0gbmV3IFNEUCh0aGlzLnBlZXJjb25uZWN0aW9uLmxvY2FsRGVzY3JpcHRpb24uc2RwKTtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAkKGVsZW0pLmVhY2goZnVuY3Rpb24gKGlkeCwgY29udGVudCkge1xuICAgICAgICB2YXIgbmFtZSA9ICQoY29udGVudCkuYXR0cignbmFtZScpO1xuICAgICAgICB2YXIgbGluZXMgPSAnJztcbiAgICAgICAgdG1wID0gJChjb250ZW50KS5maW5kKCdzc3JjLWdyb3VwW3htbG5zPVwidXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOnNzbWE6MFwiXScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VtYW50aWNzID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ3NlbWFudGljcycpO1xuICAgICAgICAgICAgdmFyIHNzcmNzID0gJCh0aGlzKS5maW5kKCc+c291cmNlJykubWFwKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3NzcmMnKTtcbiAgICAgICAgICAgIH0pLmdldCgpO1xuXG4gICAgICAgICAgICBpZiAoc3NyY3MubGVuZ3RoICE9IDApIHtcbiAgICAgICAgICAgICAgICBsaW5lcyArPSAnYT1zc3JjLWdyb3VwOicgKyBzZW1hbnRpY3MgKyAnICcgKyBzc3Jjcy5qb2luKCcgJykgKyAnXFxyXFxuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRtcCA9ICQoY29udGVudCkuZmluZCgnc291cmNlW3htbG5zPVwidXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOnNzbWE6MFwiXScpOyAvLyBjYW4gaGFuZGxlIGJvdGggPnNvdXJjZSBhbmQgPmRlc2NyaXB0aW9uPnNvdXJjZVxuICAgICAgICB0bXAuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgc3NyYyA9ICQodGhpcykuYXR0cignc3NyYycpO1xuICAgICAgICAgICAgaWYobXlTZHAuY29udGFpbnNTU1JDKHNzcmMpKXtcbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBUaGlzIGhhcHBlbnMgd2hlbiBtdWx0aXBsZSBwYXJ0aWNpcGFudHMgY2hhbmdlIHRoZWlyIHN0cmVhbXMgYXQgdGhlIHNhbWUgdGltZSBhbmRcbiAgICAgICAgICAgICAgICAgKiBDb2xpYnJpRm9jdXMubW9kaWZ5U291cmNlcyBoYXZlIHRvIHdhaXQgZm9yIHN0YWJsZSBzdGF0ZS4gSW4gdGhlIG1lYW50aW1lIG11bHRpcGxlXG4gICAgICAgICAgICAgICAgICogYWRkc3NyYyBhcmUgc2NoZWR1bGVkIGZvciB1cGRhdGUgSVEuIFNlZVxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkdvdCBhZGQgc3RyZWFtIHJlcXVlc3QgZm9yIG15IG93biBzc3JjOiBcIitzc3JjKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkKHRoaXMpLmZpbmQoJz5wYXJhbWV0ZXInKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBsaW5lcyArPSAnYT1zc3JjOicgKyBzc3JjICsgJyAnICsgJCh0aGlzKS5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgICAgICAgaWYgKCQodGhpcykuYXR0cigndmFsdWUnKSAmJiAkKHRoaXMpLmF0dHIoJ3ZhbHVlJykubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBsaW5lcyArPSAnOicgKyAkKHRoaXMpLmF0dHIoJ3ZhbHVlJyk7XG4gICAgICAgICAgICAgICAgbGluZXMgKz0gJ1xcclxcbic7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHNkcC5tZWRpYS5mb3JFYWNoKGZ1bmN0aW9uKG1lZGlhLCBpZHgpIHtcbiAgICAgICAgICAgIGlmICghU0RQVXRpbC5maW5kX2xpbmUobWVkaWEsICdhPW1pZDonICsgbmFtZSkpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgc2RwLm1lZGlhW2lkeF0gKz0gbGluZXM7XG4gICAgICAgICAgICBzZWxmLmVucXVldWVBZGRTc3JjKGlkeCwgbGluZXMpO1xuICAgICAgICB9KTtcbiAgICAgICAgc2RwLnJhdyA9IHNkcC5zZXNzaW9uICsgc2RwLm1lZGlhLmpvaW4oJycpO1xuICAgIH0pO1xufTtcblxuVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmVucXVldWVSZW1vdmVTc3JjID0gZnVuY3Rpb24oY2hhbm5lbCwgc3NyY0xpbmVzKSB7XG4gICAgaWYgKCF0aGlzLnJlbW92ZXNzcmNbY2hhbm5lbF0pe1xuICAgICAgICB0aGlzLnJlbW92ZXNzcmNbY2hhbm5lbF0gPSAnJztcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVzc3JjW2NoYW5uZWxdICs9IHNzcmNMaW5lcztcbn1cblxuVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnJlbW92ZVNvdXJjZSA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgY29uc29sZS5sb2coJ3JlbW92ZXNzcmMnLCBuZXcgRGF0ZSgpLmdldFRpbWUoKSk7XG4gICAgY29uc29sZS5sb2coJ2ljZScsIHRoaXMuaWNlQ29ubmVjdGlvblN0YXRlKTtcbiAgICB2YXIgc2RwID0gbmV3IFNEUCh0aGlzLnJlbW90ZURlc2NyaXB0aW9uLnNkcCk7XG4gICAgdmFyIG15U2RwID0gbmV3IFNEUCh0aGlzLnBlZXJjb25uZWN0aW9uLmxvY2FsRGVzY3JpcHRpb24uc2RwKTtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAkKGVsZW0pLmVhY2goZnVuY3Rpb24gKGlkeCwgY29udGVudCkge1xuICAgICAgICB2YXIgbmFtZSA9ICQoY29udGVudCkuYXR0cignbmFtZScpO1xuICAgICAgICB2YXIgbGluZXMgPSAnJztcbiAgICAgICAgdG1wID0gJChjb250ZW50KS5maW5kKCdzc3JjLWdyb3VwW3htbG5zPVwidXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOnNzbWE6MFwiXScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc2VtYW50aWNzID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ3NlbWFudGljcycpO1xuICAgICAgICAgICAgdmFyIHNzcmNzID0gJCh0aGlzKS5maW5kKCc+c291cmNlJykubWFwKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3NzcmMnKTtcbiAgICAgICAgICAgIH0pLmdldCgpO1xuXG4gICAgICAgICAgICBpZiAoc3NyY3MubGVuZ3RoICE9IDApIHtcbiAgICAgICAgICAgICAgICBsaW5lcyArPSAnYT1zc3JjLWdyb3VwOicgKyBzZW1hbnRpY3MgKyAnICcgKyBzc3Jjcy5qb2luKCcgJykgKyAnXFxyXFxuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRtcCA9ICQoY29udGVudCkuZmluZCgnc291cmNlW3htbG5zPVwidXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOnNzbWE6MFwiXScpOyAvLyBjYW4gaGFuZGxlIGJvdGggPnNvdXJjZSBhbmQgPmRlc2NyaXB0aW9uPnNvdXJjZVxuICAgICAgICB0bXAuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgc3NyYyA9ICQodGhpcykuYXR0cignc3NyYycpO1xuICAgICAgICAgICAgLy8gVGhpcyBzaG91bGQgbmV2ZXIgaGFwcGVuLCBidXQgY2FuIGJlIHVzZWZ1bCBmb3IgYnVnIGRldGVjdGlvblxuICAgICAgICAgICAgaWYobXlTZHAuY29udGFpbnNTU1JDKHNzcmMpKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiR290IHJlbW92ZSBzdHJlYW0gcmVxdWVzdCBmb3IgbXkgb3duIHNzcmM6IFwiK3NzcmMpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQodGhpcykuZmluZCgnPnBhcmFtZXRlcicpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGxpbmVzICs9ICdhPXNzcmM6JyArIHNzcmMgKyAnICcgKyAkKHRoaXMpLmF0dHIoJ25hbWUnKTtcbiAgICAgICAgICAgICAgICBpZiAoJCh0aGlzKS5hdHRyKCd2YWx1ZScpICYmICQodGhpcykuYXR0cigndmFsdWUnKS5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgIGxpbmVzICs9ICc6JyArICQodGhpcykuYXR0cigndmFsdWUnKTtcbiAgICAgICAgICAgICAgICBsaW5lcyArPSAnXFxyXFxuJztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgc2RwLm1lZGlhLmZvckVhY2goZnVuY3Rpb24obWVkaWEsIGlkeCkge1xuICAgICAgICAgICAgaWYgKCFTRFBVdGlsLmZpbmRfbGluZShtZWRpYSwgJ2E9bWlkOicgKyBuYW1lKSlcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBzZHAubWVkaWFbaWR4XSArPSBsaW5lcztcbiAgICAgICAgICAgIHNlbGYuZW5xdWV1ZVJlbW92ZVNzcmMoaWR4LCBsaW5lcyk7XG4gICAgICAgIH0pO1xuICAgICAgICBzZHAucmF3ID0gc2RwLnNlc3Npb24gKyBzZHAubWVkaWEuam9pbignJyk7XG4gICAgfSk7XG59O1xuXG5UcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUubW9kaWZ5U291cmNlcyA9IGZ1bmN0aW9uKHN1Y2Nlc3NDYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAodGhpcy5zaWduYWxpbmdTdGF0ZSA9PSAnY2xvc2VkJykgcmV0dXJuO1xuICAgIGlmICghKHRoaXMuYWRkc3NyYy5sZW5ndGggfHwgdGhpcy5yZW1vdmVzc3JjLmxlbmd0aCB8fCB0aGlzLnBlbmRpbmdvcCAhPT0gbnVsbCB8fCB0aGlzLnN3aXRjaHN0cmVhbXMpKXtcbiAgICAgICAgLy8gVGhlcmUgaXMgbm90aGluZyB0byBkbyBzaW5jZSBzY2hlZHVsZWQgam9iIG1pZ2h0IGhhdmUgYmVlbiBleGVjdXRlZCBieSBhbm90aGVyIHN1Y2NlZWRpbmcgY2FsbFxuICAgICAgICBpZihzdWNjZXNzQ2FsbGJhY2spe1xuICAgICAgICAgICAgc3VjY2Vzc0NhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEZJWE1FOiB0aGlzIGlzIGEgYmlnIGhhY2tcbiAgICAvLyBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3dlYnJ0Yy9pc3N1ZXMvZGV0YWlsP2lkPTI2ODhcbiAgICBpZiAoISh0aGlzLnNpZ25hbGluZ1N0YXRlID09ICdzdGFibGUnICYmIHRoaXMuaWNlQ29ubmVjdGlvblN0YXRlID09ICdjb25uZWN0ZWQnKSkge1xuICAgICAgICBjb25zb2xlLndhcm4oJ21vZGlmeVNvdXJjZXMgbm90IHlldCcsIHRoaXMuc2lnbmFsaW5nU3RhdGUsIHRoaXMuaWNlQ29ubmVjdGlvblN0YXRlKTtcbiAgICAgICAgdGhpcy53YWl0ID0gdHJ1ZTtcbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IHNlbGYubW9kaWZ5U291cmNlcyhzdWNjZXNzQ2FsbGJhY2spOyB9LCAyNTApO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0aGlzLndhaXQpIHtcbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IHNlbGYubW9kaWZ5U291cmNlcyhzdWNjZXNzQ2FsbGJhY2spOyB9LCAyNTAwKTtcbiAgICAgICAgdGhpcy53YWl0ID0gZmFsc2U7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBSZXNldCBzd2l0Y2ggc3RyZWFtcyBmbGFnXG4gICAgdGhpcy5zd2l0Y2hzdHJlYW1zID0gZmFsc2U7XG5cbiAgICB2YXIgc2RwID0gbmV3IFNEUCh0aGlzLnJlbW90ZURlc2NyaXB0aW9uLnNkcCk7XG5cbiAgICAvLyBhZGQgc291cmNlc1xuICAgIHRoaXMuYWRkc3NyYy5mb3JFYWNoKGZ1bmN0aW9uKGxpbmVzLCBpZHgpIHtcbiAgICAgICAgc2RwLm1lZGlhW2lkeF0gKz0gbGluZXM7XG4gICAgfSk7XG4gICAgdGhpcy5hZGRzc3JjID0gW107XG5cbiAgICAvLyByZW1vdmUgc291cmNlc1xuICAgIHRoaXMucmVtb3Zlc3NyYy5mb3JFYWNoKGZ1bmN0aW9uKGxpbmVzLCBpZHgpIHtcbiAgICAgICAgbGluZXMgPSBsaW5lcy5zcGxpdCgnXFxyXFxuJyk7XG4gICAgICAgIGxpbmVzLnBvcCgpOyAvLyByZW1vdmUgZW1wdHkgbGFzdCBlbGVtZW50O1xuICAgICAgICBsaW5lcy5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHNkcC5tZWRpYVtpZHhdID0gc2RwLm1lZGlhW2lkeF0ucmVwbGFjZShsaW5lICsgJ1xcclxcbicsICcnKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgdGhpcy5yZW1vdmVzc3JjID0gW107XG5cbiAgICBzZHAucmF3ID0gc2RwLnNlc3Npb24gKyBzZHAubWVkaWEuam9pbignJyk7XG4gICAgdGhpcy5zZXRSZW1vdGVEZXNjcmlwdGlvbihuZXcgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKHt0eXBlOiAnb2ZmZXInLCBzZHA6IHNkcC5yYXd9KSxcbiAgICAgICAgZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIGlmKHNlbGYuc2lnbmFsaW5nU3RhdGUgPT0gJ2Nsb3NlZCcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiY3JlYXRlQW5zd2VyIGF0dGVtcHQgb24gY2xvc2VkIHN0YXRlXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2VsZi5jcmVhdGVBbnN3ZXIoXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24obW9kaWZpZWRBbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gY2hhbmdlIHZpZGVvIGRpcmVjdGlvbiwgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9qaXRzaS9qaXRtZWV0L2lzc3Vlcy80MVxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5wZW5kaW5nb3AgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzZHAgPSBuZXcgU0RQKG1vZGlmaWVkQW5zd2VyLnNkcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2RwLm1lZGlhLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2goc2VsZi5wZW5kaW5nb3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnbXV0ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZHAubWVkaWFbMV0gPSBzZHAubWVkaWFbMV0ucmVwbGFjZSgnYT1zZW5kcmVjdicsICdhPXJlY3Zvbmx5Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAndW5tdXRlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNkcC5tZWRpYVsxXSA9IHNkcC5tZWRpYVsxXS5yZXBsYWNlKCdhPXJlY3Zvbmx5JywgJ2E9c2VuZHJlY3YnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZHAucmF3ID0gc2RwLnNlc3Npb24gKyBzZHAubWVkaWEuam9pbignJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9kaWZpZWRBbnN3ZXIuc2RwID0gc2RwLnJhdztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYucGVuZGluZ29wID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIEZJWE1FOiBwdXNoaW5nIGRvd24gYW4gYW5zd2VyIHdoaWxlIGljZSBjb25uZWN0aW9uIHN0YXRlXG4gICAgICAgICAgICAgICAgICAgIC8vIGlzIHN0aWxsIGNoZWNraW5nIGlzIGJhZC4uLlxuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKHNlbGYucGVlcmNvbm5lY3Rpb24uaWNlQ29ubmVjdGlvblN0YXRlKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyB0cnlpbmcgdG8gd29yayBhcm91bmQgYW5vdGhlciBjaHJvbWUgYnVnXG4gICAgICAgICAgICAgICAgICAgIC8vbW9kaWZpZWRBbnN3ZXIuc2RwID0gbW9kaWZpZWRBbnN3ZXIuc2RwLnJlcGxhY2UoL2E9c2V0dXA6YWN0aXZlL2csICdhPXNldHVwOmFjdHBhc3MnKTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5zZXRMb2NhbERlc2NyaXB0aW9uKG1vZGlmaWVkQW5zd2VyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnbW9kaWZpZWQgc2V0TG9jYWxEZXNjcmlwdGlvbiBvaycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHN1Y2Nlc3NDYWxsYmFjayl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NDYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ21vZGlmaWVkIHNldExvY2FsRGVzY3JpcHRpb24gZmFpbGVkJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignbW9kaWZpZWQgYW5zd2VyIGZhaWxlZCcsIGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignbW9kaWZ5IGZhaWxlZCcsIGVycm9yKTtcbiAgICAgICAgfVxuICAgICk7XG59O1xuXG5UcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy50cmFjZSgnc3RvcCcpO1xuICAgIGlmICh0aGlzLnN0YXRzaW50ZXJ2YWwgIT09IG51bGwpIHtcbiAgICAgICAgd2luZG93LmNsZWFySW50ZXJ2YWwodGhpcy5zdGF0c2ludGVydmFsKTtcbiAgICAgICAgdGhpcy5zdGF0c2ludGVydmFsID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5jbG9zZSgpO1xufTtcblxuVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmNyZWF0ZU9mZmVyID0gZnVuY3Rpb24gKHN1Y2Nlc3NDYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrLCBjb25zdHJhaW50cykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLnRyYWNlKCdjcmVhdGVPZmZlcicsIEpTT04uc3RyaW5naWZ5KGNvbnN0cmFpbnRzLCBudWxsLCAnICcpKTtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLmNyZWF0ZU9mZmVyKFxuICAgICAgICBmdW5jdGlvbiAob2ZmZXIpIHtcbiAgICAgICAgICAgIHNlbGYudHJhY2UoJ2NyZWF0ZU9mZmVyT25TdWNjZXNzJywgZHVtcFNEUChvZmZlcikpO1xuICAgICAgICAgICAgc3VjY2Vzc0NhbGxiYWNrKG9mZmVyKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICBzZWxmLnRyYWNlKCdjcmVhdGVPZmZlck9uRmFpbHVyZScsIGVycik7XG4gICAgICAgICAgICBmYWlsdXJlQ2FsbGJhY2soZXJyKTtcbiAgICAgICAgfSxcbiAgICAgICAgY29uc3RyYWludHNcbiAgICApO1xufTtcblxuVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmNyZWF0ZUFuc3dlciA9IGZ1bmN0aW9uIChzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaywgY29uc3RyYWludHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy50cmFjZSgnY3JlYXRlQW5zd2VyJywgSlNPTi5zdHJpbmdpZnkoY29uc3RyYWludHMsIG51bGwsICcgJykpO1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uY3JlYXRlQW5zd2VyKFxuICAgICAgICBmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICB2YXIgc2ltdWxjYXN0ID0gbmV3IFNpbXVsY2FzdCgpO1xuICAgICAgICAgICAgYW5zd2VyID0gc2ltdWxjYXN0LnRyYW5zZm9ybUFuc3dlcihhbnN3ZXIpO1xuICAgICAgICAgICAgc2VsZi50cmFjZSgnY3JlYXRlQW5zd2VyT25TdWNjZXNzJywgZHVtcFNEUChhbnN3ZXIpKTtcbiAgICAgICAgICAgIHN1Y2Nlc3NDYWxsYmFjayhhbnN3ZXIpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgIHNlbGYudHJhY2UoJ2NyZWF0ZUFuc3dlck9uRmFpbHVyZScsIGVycik7XG4gICAgICAgICAgICBmYWlsdXJlQ2FsbGJhY2soZXJyKTtcbiAgICAgICAgfSxcbiAgICAgICAgY29uc3RyYWludHNcbiAgICApO1xufTtcblxuVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZEljZUNhbmRpZGF0ZSA9IGZ1bmN0aW9uIChjYW5kaWRhdGUsIHN1Y2Nlc3NDYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMudHJhY2UoJ2FkZEljZUNhbmRpZGF0ZScsIEpTT04uc3RyaW5naWZ5KGNhbmRpZGF0ZSwgbnVsbCwgJyAnKSk7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5hZGRJY2VDYW5kaWRhdGUoY2FuZGlkYXRlKTtcbiAgICAvKiBtYXliZSBsYXRlclxuICAgICB0aGlzLnBlZXJjb25uZWN0aW9uLmFkZEljZUNhbmRpZGF0ZShjYW5kaWRhdGUsXG4gICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgc2VsZi50cmFjZSgnYWRkSWNlQ2FuZGlkYXRlT25TdWNjZXNzJyk7XG4gICAgIHN1Y2Nlc3NDYWxsYmFjaygpO1xuICAgICB9LFxuICAgICBmdW5jdGlvbiAoZXJyKSB7XG4gICAgIHNlbGYudHJhY2UoJ2FkZEljZUNhbmRpZGF0ZU9uRmFpbHVyZScsIGVycik7XG4gICAgIGZhaWx1cmVDYWxsYmFjayhlcnIpO1xuICAgICB9XG4gICAgICk7XG4gICAgICovXG59O1xuXG5UcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0U3RhdHMgPSBmdW5jdGlvbihjYWxsYmFjaywgZXJyYmFjaykge1xuICAgIGlmIChuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhKSB7XG4gICAgICAgIC8vIGlnbm9yZSBmb3Igbm93Li4uXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5wZWVyY29ubmVjdGlvbi5nZXRTdGF0cyhjYWxsYmFjayk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUcmFjZWFibGVQZWVyQ29ubmVjdGlvbjsiLCIvKiBqc2hpbnQgLVcxMTcgKi9cblxudmFyIEppbmdsZVNlc3Npb24gPSByZXF1aXJlKFwiLi9zdHJvcGhlLmppbmdsZS5zZXNzaW9uXCIpO1xudmFyIFhNUFBFdmVudHMgPSByZXF1aXJlKFwiLi4vc2VydmljZS94bXBwL1hNUFBFdmVudHNcIik7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGV2ZW50RW1pdHRlcikge1xuICAgIFN0cm9waGUuYWRkQ29ubmVjdGlvblBsdWdpbignamluZ2xlJywge1xuICAgICAgICBjb25uZWN0aW9uOiBudWxsLFxuICAgICAgICBzZXNzaW9uczoge30sXG4gICAgICAgIGppZDJzZXNzaW9uOiB7fSxcbiAgICAgICAgaWNlX2NvbmZpZzoge2ljZVNlcnZlcnM6IFtdfSxcbiAgICAgICAgcGNfY29uc3RyYWludHM6IHt9LFxuICAgICAgICBtZWRpYV9jb25zdHJhaW50czoge1xuICAgICAgICAgICAgbWFuZGF0b3J5OiB7XG4gICAgICAgICAgICAgICAgJ09mZmVyVG9SZWNlaXZlQXVkaW8nOiB0cnVlLFxuICAgICAgICAgICAgICAgICdPZmZlclRvUmVjZWl2ZVZpZGVvJzogdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTW96RG9udE9mZmVyRGF0YUNoYW5uZWw6IHRydWUgd2hlbiB0aGlzIGlzIGZpcmVmb3hcbiAgICAgICAgfSxcbiAgICAgICAgbG9jYWxBdWRpbzogbnVsbCxcbiAgICAgICAgbG9jYWxWaWRlbzogbnVsbCxcblxuICAgICAgICBpbml0OiBmdW5jdGlvbiAoY29ubikge1xuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uID0gY29ubjtcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbm5lY3Rpb24uZGlzY28pIHtcbiAgICAgICAgICAgICAgICAvLyBodHRwOi8veG1wcC5vcmcvZXh0ZW5zaW9ucy94ZXAtMDE2Ny5odG1sI3N1cHBvcnRcbiAgICAgICAgICAgICAgICAvLyBodHRwOi8veG1wcC5vcmcvZXh0ZW5zaW9ucy94ZXAtMDE3Ni5odG1sI3N1cHBvcnRcbiAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uZGlzY28uYWRkRmVhdHVyZSgndXJuOnhtcHA6amluZ2xlOjEnKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uZGlzY28uYWRkRmVhdHVyZSgndXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOjEnKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uZGlzY28uYWRkRmVhdHVyZSgndXJuOnhtcHA6amluZ2xlOnRyYW5zcG9ydHM6aWNlLXVkcDoxJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLmRpc2NvLmFkZEZlYXR1cmUoJ3Vybjp4bXBwOmppbmdsZTphcHBzOnJ0cDphdWRpbycpO1xuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5kaXNjby5hZGRGZWF0dXJlKCd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6dmlkZW8nKTtcblxuXG4gICAgICAgICAgICAgICAgLy8gdGhpcyBpcyBkZWFsdCB3aXRoIGJ5IFNEUCBPL0Egc28gd2UgZG9uJ3QgbmVlZCB0byBhbm5vdWNlIHRoaXNcbiAgICAgICAgICAgICAgICAvL3RoaXMuY29ubmVjdGlvbi5kaXNjby5hZGRGZWF0dXJlKCd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6cnRjcC1mYjowJyk7IC8vIFhFUC0wMjkzXG4gICAgICAgICAgICAgICAgLy90aGlzLmNvbm5lY3Rpb24uZGlzY28uYWRkRmVhdHVyZSgndXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOnJ0cC1oZHJleHQ6MCcpOyAvLyBYRVAtMDI5NFxuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5kaXNjby5hZGRGZWF0dXJlKCd1cm46aWV0ZjpyZmM6NTc2MScpOyAvLyBydGNwLW11eFxuICAgICAgICAgICAgICAgIC8vdGhpcy5jb25uZWN0aW9uLmRpc2NvLmFkZEZlYXR1cmUoJ3VybjppZXRmOnJmYzo1ODg4Jyk7IC8vIGE9Z3JvdXAsIGUuZy4gYnVuZGxlXG4gICAgICAgICAgICAgICAgLy90aGlzLmNvbm5lY3Rpb24uZGlzY28uYWRkRmVhdHVyZSgndXJuOmlldGY6cmZjOjU1NzYnKTsgLy8gYT1zc3JjXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uYWRkSGFuZGxlcih0aGlzLm9uSmluZ2xlLmJpbmQodGhpcyksICd1cm46eG1wcDpqaW5nbGU6MScsICdpcScsICdzZXQnLCBudWxsLCBudWxsKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25KaW5nbGU6IGZ1bmN0aW9uIChpcSkge1xuICAgICAgICAgICAgdmFyIHNpZCA9ICQoaXEpLmZpbmQoJ2ppbmdsZScpLmF0dHIoJ3NpZCcpO1xuICAgICAgICAgICAgdmFyIGFjdGlvbiA9ICQoaXEpLmZpbmQoJ2ppbmdsZScpLmF0dHIoJ2FjdGlvbicpO1xuICAgICAgICAgICAgdmFyIGZyb21KaWQgPSBpcS5nZXRBdHRyaWJ1dGUoJ2Zyb20nKTtcbiAgICAgICAgICAgIC8vIHNlbmQgYWNrIGZpcnN0XG4gICAgICAgICAgICB2YXIgYWNrID0gJGlxKHt0eXBlOiAncmVzdWx0JyxcbiAgICAgICAgICAgICAgICB0bzogZnJvbUppZCxcbiAgICAgICAgICAgICAgICBpZDogaXEuZ2V0QXR0cmlidXRlKCdpZCcpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvbiBqaW5nbGUgJyArIGFjdGlvbiArICcgZnJvbSAnICsgZnJvbUppZCwgaXEpO1xuICAgICAgICAgICAgdmFyIHNlc3MgPSB0aGlzLnNlc3Npb25zW3NpZF07XG4gICAgICAgICAgICBpZiAoJ3Nlc3Npb24taW5pdGlhdGUnICE9IGFjdGlvbikge1xuICAgICAgICAgICAgICAgIGlmIChzZXNzID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGFjay50eXBlID0gJ2Vycm9yJztcbiAgICAgICAgICAgICAgICAgICAgYWNrLmMoJ2Vycm9yJywge3R5cGU6ICdjYW5jZWwnfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5jKCdpdGVtLW5vdC1mb3VuZCcsIHt4bWxuczogJ3VybjppZXRmOnBhcmFtczp4bWw6bnM6eG1wcC1zdGFuemFzJ30pLnVwKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5jKCd1bmtub3duLXNlc3Npb24nLCB7eG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6ZXJyb3JzOjEnfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kKGFjayk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBjb21wYXJlIGZyb20gdG8gc2Vzcy5wZWVyamlkIChiYXJlIGppZCBjb21wYXJpc29uIGZvciBsYXRlciBjb21wYXQgd2l0aCBtZXNzYWdlLW1vZGUpXG4gICAgICAgICAgICAgICAgLy8gbG9jYWwgamlkIGlzIG5vdCBjaGVja2VkXG4gICAgICAgICAgICAgICAgaWYgKFN0cm9waGUuZ2V0QmFyZUppZEZyb21KaWQoZnJvbUppZCkgIT0gU3Ryb3BoZS5nZXRCYXJlSmlkRnJvbUppZChzZXNzLnBlZXJqaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignamlkIG1pc21hdGNoIGZvciBzZXNzaW9uIGlkJywgc2lkLCBmcm9tSmlkLCBzZXNzLnBlZXJqaWQpO1xuICAgICAgICAgICAgICAgICAgICBhY2sudHlwZSA9ICdlcnJvcic7XG4gICAgICAgICAgICAgICAgICAgIGFjay5jKCdlcnJvcicsIHt0eXBlOiAnY2FuY2VsJ30pXG4gICAgICAgICAgICAgICAgICAgICAgICAuYygnaXRlbS1ub3QtZm91bmQnLCB7eG1sbnM6ICd1cm46aWV0ZjpwYXJhbXM6eG1sOm5zOnhtcHAtc3Rhbnphcyd9KS51cCgpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYygndW5rbm93bi1zZXNzaW9uJywge3htbG5zOiAndXJuOnhtcHA6amluZ2xlOmVycm9yczoxJ30pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZChhY2spO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNlc3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIC8vIGV4aXN0aW5nIHNlc3Npb24gd2l0aCBzYW1lIHNlc3Npb24gaWRcbiAgICAgICAgICAgICAgICAvLyB0aGlzIG1pZ2h0IGJlIG91dC1vZi1vcmRlciBpZiB0aGUgc2Vzcy5wZWVyamlkIGlzIHRoZSBzYW1lIGFzIGZyb21cbiAgICAgICAgICAgICAgICBhY2sudHlwZSA9ICdlcnJvcic7XG4gICAgICAgICAgICAgICAgYWNrLmMoJ2Vycm9yJywge3R5cGU6ICdjYW5jZWwnfSlcbiAgICAgICAgICAgICAgICAgICAgLmMoJ3NlcnZpY2UtdW5hdmFpbGFibGUnLCB7eG1sbnM6ICd1cm46aWV0ZjpwYXJhbXM6eG1sOm5zOnhtcHAtc3Rhbnphcyd9KS51cCgpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignZHVwbGljYXRlIHNlc3Npb24gaWQnLCBzaWQpO1xuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kKGFjayk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBGSVhNRTogY2hlY2sgZm9yIGEgZGVmaW5lZCBhY3Rpb25cbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kKGFjayk7XG4gICAgICAgICAgICAvLyBzZWUgaHR0cDovL3htcHAub3JnL2V4dGVuc2lvbnMveGVwLTAxNjYuaHRtbCNjb25jZXB0cy1zZXNzaW9uXG4gICAgICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Nlc3Npb24taW5pdGlhdGUnOlxuICAgICAgICAgICAgICAgICAgICBzZXNzID0gbmV3IEppbmdsZVNlc3Npb24oJChpcSkuYXR0cigndG8nKSwgJChpcSkuZmluZCgnamluZ2xlJykuYXR0cignc2lkJyksIHRoaXMuY29ubmVjdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbmZpZ3VyZSBzZXNzaW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmxvY2FsQXVkaW8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3MubG9jYWxTdHJlYW1zLnB1c2godGhpcy5sb2NhbEF1ZGlvKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5sb2NhbFZpZGVvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzLmxvY2FsU3RyZWFtcy5wdXNoKHRoaXMubG9jYWxWaWRlbyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc2Vzcy5tZWRpYV9jb25zdHJhaW50cyA9IHRoaXMubWVkaWFfY29uc3RyYWludHM7XG4gICAgICAgICAgICAgICAgICAgIHNlc3MucGNfY29uc3RyYWludHMgPSB0aGlzLnBjX2NvbnN0cmFpbnRzO1xuICAgICAgICAgICAgICAgICAgICBzZXNzLmljZV9jb25maWcgPSB0aGlzLmljZV9jb25maWc7XG5cbiAgICAgICAgICAgICAgICAgICAgc2Vzcy5pbml0aWF0ZShmcm9tSmlkLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZJWE1FOiBzZXRSZW1vdGVEZXNjcmlwdGlvbiBzaG91bGQgb25seSBiZSBkb25lIHdoZW4gdGhpcyBjYWxsIGlzIHRvIGJlIGFjY2VwdGVkXG4gICAgICAgICAgICAgICAgICAgIHNlc3Muc2V0UmVtb3RlRGVzY3JpcHRpb24oJChpcSkuZmluZCgnPmppbmdsZScpLCAnb2ZmZXInKTtcblxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlc3Npb25zW3Nlc3Muc2lkXSA9IHNlc3M7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuamlkMnNlc3Npb25bc2Vzcy5wZWVyamlkXSA9IHNlc3M7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGNhbGxiYWNrIHNob3VsZCBlaXRoZXJcbiAgICAgICAgICAgICAgICAgICAgLy8gLnNlbmRBbnN3ZXIgYW5kIC5hY2NlcHRcbiAgICAgICAgICAgICAgICAgICAgLy8gb3IgLnNlbmRUZXJtaW5hdGUgLS0gbm90IG5lY2Vzc2FyaWx5IHN5bmNocm9udXNcbiAgICAgICAgICAgICAgICAgICAgWE1QUEFjdGl2YXRvci5zZXRBY3RpdmVDYWxsKHNlc3MpO1xuICAgICAgICAgICAgICAgICAgICBldmVudEVtaXR0ZXIuZW1pdChYTVBQRXZlbnRzLkNBTExfSU5DT01JTkcsIHNlc3MpO1xuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiBjaGVjayBhZmZpbGlhdGlvbiBhbmQvb3Igcm9sZVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZW11YyBkYXRhIGZvcicsIHNlc3MucGVlcmppZCwgdGhpcy5jb25uZWN0aW9uLmVtdWMubWVtYmVyc1tzZXNzLnBlZXJqaWRdKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXNzaW9uc1tzZXNzLnNpZF0udXNlZHJpcCA9IHRydWU7IC8vIG5vdC1zby1uYWl2ZSB0cmlja2xlIGljZVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlc3Npb25zW3Nlc3Muc2lkXS5zZW5kQW5zd2VyKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2Vzc2lvbnNbc2Vzcy5zaWRdLmFjY2VwdCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Nlc3Npb24tYWNjZXB0JzpcbiAgICAgICAgICAgICAgICAgICAgc2Vzcy5zZXRSZW1vdGVEZXNjcmlwdGlvbigkKGlxKS5maW5kKCc+amluZ2xlJyksICdhbnN3ZXInKTtcbiAgICAgICAgICAgICAgICAgICAgc2Vzcy5hY2NlcHQoKTtcbiAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignY2FsbGFjY2VwdGVkLmppbmdsZScsIFtzZXNzLnNpZF0pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdzZXNzaW9uLXRlcm1pbmF0ZSc6XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHRoaXMgaXMgbm90IHRoZSBmb2N1cyBzZW5kaW5nIHRoZSB0ZXJtaW5hdGUsIHdlIGhhdmVcbiAgICAgICAgICAgICAgICAgICAgLy8gbm90aGluZyBtb3JlIHRvIGRvIGhlcmUuXG4gICAgICAgICAgICAgICAgICAgIGlmIChPYmplY3Qua2V5cyh0aGlzLnNlc3Npb25zKS5sZW5ndGggPCAxXG4gICAgICAgICAgICAgICAgICAgICAgICB8fCAhKHRoaXMuc2Vzc2lvbnNbT2JqZWN0LmtleXModGhpcy5zZXNzaW9ucylbMF1dXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VvZiBKaW5nbGVTZXNzaW9uKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3Rlcm1pbmF0aW5nLi4uJywgc2Vzcy5zaWQpO1xuICAgICAgICAgICAgICAgICAgICBzZXNzLnRlcm1pbmF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRlcm1pbmF0ZShzZXNzLnNpZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkKGlxKS5maW5kKCc+amluZ2xlPnJlYXNvbicpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbGxUZXJtaW5hdGVkKCQoaXEpLmZpbmQoJz5qaW5nbGU+cmVhc29uPnRleHQnKS50ZXh0KCkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYWxsVGVybWluYXRlZChudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICd0cmFuc3BvcnQtaW5mbyc6XG4gICAgICAgICAgICAgICAgICAgIHNlc3MuYWRkSWNlQ2FuZGlkYXRlKCQoaXEpLmZpbmQoJz5qaW5nbGU+Y29udGVudCcpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnc2Vzc2lvbi1pbmZvJzpcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFmZmVjdGVkO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJChpcSkuZmluZCgnPmppbmdsZT5yaW5naW5nW3htbG5zPVwidXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOmluZm86MVwiXScpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcigncmluZ2luZy5qaW5nbGUnLCBbc2Vzcy5zaWRdKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICgkKGlxKS5maW5kKCc+amluZ2xlPm11dGVbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6aW5mbzoxXCJdJykubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZmZlY3RlZCA9ICQoaXEpLmZpbmQoJz5qaW5nbGU+bXV0ZVt4bWxucz1cInVybjp4bXBwOmppbmdsZTphcHBzOnJ0cDppbmZvOjFcIl0nKS5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdtdXRlLmppbmdsZScsIFtzZXNzLnNpZCwgYWZmZWN0ZWRdKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICgkKGlxKS5maW5kKCc+amluZ2xlPnVubXV0ZVt4bWxucz1cInVybjp4bXBwOmppbmdsZTphcHBzOnJ0cDppbmZvOjFcIl0nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFmZmVjdGVkID0gJChpcSkuZmluZCgnPmppbmdsZT51bm11dGVbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6aW5mbzoxXCJdJykuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcigndW5tdXRlLmppbmdsZScsIFtzZXNzLnNpZCwgYWZmZWN0ZWRdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdhZGRzb3VyY2UnOiAvLyBGSVhNRTogcHJvcHJpZXRhcnksIHVuLWppbmdsZWlzaFxuICAgICAgICAgICAgICAgIGNhc2UgJ3NvdXJjZS1hZGQnOiAvLyBGSVhNRTogcHJvcHJpZXRhcnlcbiAgICAgICAgICAgICAgICAgICAgc2Vzcy5hZGRTb3VyY2UoJChpcSkuZmluZCgnPmppbmdsZT5jb250ZW50JyksIGZyb21KaWQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdyZW1vdmVzb3VyY2UnOiAvLyBGSVhNRTogcHJvcHJpZXRhcnksIHVuLWppbmdsZWlzaFxuICAgICAgICAgICAgICAgIGNhc2UgJ3NvdXJjZS1yZW1vdmUnOiAvLyBGSVhNRTogcHJvcHJpZXRhcnlcbiAgICAgICAgICAgICAgICAgICAgc2Vzcy5yZW1vdmVTb3VyY2UoJChpcSkuZmluZCgnPmppbmdsZT5jb250ZW50JyksIGZyb21KaWQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ2ppbmdsZSBhY3Rpb24gbm90IGltcGxlbWVudGVkJywgYWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgaW5pdGlhdGU6IGZ1bmN0aW9uIChwZWVyamlkLCBteWppZCkgeyAvLyBpbml0aWF0ZSBhIG5ldyBqaW5nbGVzZXNzaW9uIHRvIHBlZXJqaWRcbiAgICAgICAgICAgIHZhciBzZXNzID0gbmV3IEppbmdsZVNlc3Npb24obXlqaWQgfHwgdGhpcy5jb25uZWN0aW9uLmppZCxcbiAgICAgICAgICAgICAgICBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgMTIpLCAvLyByYW5kb20gc3RyaW5nXG4gICAgICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uKTtcbiAgICAgICAgICAgIC8vIGNvbmZpZ3VyZSBzZXNzaW9uXG4gICAgICAgICAgICBpZiAodGhpcy5sb2NhbEF1ZGlvKSB7XG4gICAgICAgICAgICAgICAgc2Vzcy5sb2NhbFN0cmVhbXMucHVzaCh0aGlzLmxvY2FsQXVkaW8pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMubG9jYWxWaWRlbykge1xuICAgICAgICAgICAgICAgIHNlc3MubG9jYWxTdHJlYW1zLnB1c2godGhpcy5sb2NhbFZpZGVvKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlc3MubWVkaWFfY29uc3RyYWludHMgPSB0aGlzLm1lZGlhX2NvbnN0cmFpbnRzO1xuICAgICAgICAgICAgc2Vzcy5wY19jb25zdHJhaW50cyA9IHRoaXMucGNfY29uc3RyYWludHM7XG4gICAgICAgICAgICBzZXNzLmljZV9jb25maWcgPSB0aGlzLmljZV9jb25maWc7XG5cbiAgICAgICAgICAgIHNlc3MuaW5pdGlhdGUocGVlcmppZCwgdHJ1ZSk7XG4gICAgICAgICAgICB0aGlzLnNlc3Npb25zW3Nlc3Muc2lkXSA9IHNlc3M7XG4gICAgICAgICAgICB0aGlzLmppZDJzZXNzaW9uW3Nlc3MucGVlcmppZF0gPSBzZXNzO1xuICAgICAgICAgICAgc2Vzcy5zZW5kT2ZmZXIoKTtcbiAgICAgICAgICAgIHJldHVybiBzZXNzO1xuICAgICAgICB9LFxuICAgICAgICB0ZXJtaW5hdGU6IGZ1bmN0aW9uIChzaWQsIHJlYXNvbiwgdGV4dCkgeyAvLyB0ZXJtaW5hdGUgYnkgc2Vzc2lvbmlkIChvciBhbGwgc2Vzc2lvbnMpXG4gICAgICAgICAgICBpZiAoc2lkID09PSBudWxsIHx8IHNpZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZm9yIChzaWQgaW4gdGhpcy5zZXNzaW9ucykge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zZXNzaW9uc1tzaWRdLnN0YXRlICE9ICdlbmRlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2Vzc2lvbnNbc2lkXS5zZW5kVGVybWluYXRlKHJlYXNvbiB8fCAoIXRoaXMuc2Vzc2lvbnNbc2lkXS5hY3RpdmUoKSkgPyAnY2FuY2VsJyA6IG51bGwsIHRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXNzaW9uc1tzaWRdLnRlcm1pbmF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmppZDJzZXNzaW9uW3RoaXMuc2Vzc2lvbnNbc2lkXS5wZWVyamlkXTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuc2Vzc2lvbnNbc2lkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuc2Vzc2lvbnMuaGFzT3duUHJvcGVydHkoc2lkKSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNlc3Npb25zW3NpZF0uc3RhdGUgIT0gJ2VuZGVkJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlc3Npb25zW3NpZF0uc2VuZFRlcm1pbmF0ZShyZWFzb24gfHwgKCF0aGlzLnNlc3Npb25zW3NpZF0uYWN0aXZlKCkpID8gJ2NhbmNlbCcgOiBudWxsLCB0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXNzaW9uc1tzaWRdLnRlcm1pbmF0ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5qaWQyc2Vzc2lvblt0aGlzLnNlc3Npb25zW3NpZF0ucGVlcmppZF07XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuc2Vzc2lvbnNbc2lkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2FsbFRlcm1pbmF0ZWQ6IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbm5lY3Rpb24uZW11Yy5qb2luZWQgJiYgdGhpcy5jb25uZWN0aW9uLmVtdWMuZm9jdXMgPT0gbnVsbCAmJiByZWFzb24gPT09ICdraWNrJykge1xuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5lbXVjLmRvTGVhdmUoKTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5vcGVuTWVzc2FnZURpYWxvZyhcIlNlc3Npb24gVGVybWluYXRlZFwiLFxuICAgICAgICAgICAgICAgICAgICBcIk91Y2ghIFlvdSBoYXZlIGJlZW4ga2lja2VkIG91dCBvZiB0aGUgbWVldCFcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIC8vIFVzZWQgdG8gdGVybWluYXRlIGEgc2Vzc2lvbiB3aGVuIGFuIHVuYXZhaWxhYmxlIHByZXNlbmNlIGlzIHJlY2VpdmVkLlxuICAgICAgICB0ZXJtaW5hdGVCeUppZDogZnVuY3Rpb24gKGppZCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuamlkMnNlc3Npb24uaGFzT3duUHJvcGVydHkoamlkKSkge1xuICAgICAgICAgICAgICAgIHZhciBzZXNzID0gdGhpcy5qaWQyc2Vzc2lvbltqaWRdO1xuICAgICAgICAgICAgICAgIGlmIChzZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlc3MudGVybWluYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwZWVyIHdlbnQgYXdheSBzaWxlbnRseScsIGppZCk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnNlc3Npb25zW3Nlc3Muc2lkXTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuamlkMnNlc3Npb25bamlkXTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jYWxsVGVybWluYXRlZCggJ2dvbmUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHRlcm1pbmF0ZVJlbW90ZUJ5SmlkOiBmdW5jdGlvbiAoamlkLCByZWFzb24pIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmppZDJzZXNzaW9uLmhhc093blByb3BlcnR5KGppZCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VzcyA9IHRoaXMuamlkMnNlc3Npb25bamlkXTtcbiAgICAgICAgICAgICAgICBpZiAoc2Vzcykge1xuICAgICAgICAgICAgICAgICAgICBzZXNzLnNlbmRUZXJtaW5hdGUocmVhc29uIHx8ICghc2Vzcy5hY3RpdmUoKSkgPyAna2ljaycgOiBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgc2Vzcy50ZXJtaW5hdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3Rlcm1pbmF0ZSBwZWVyIHdpdGggamlkJywgc2Vzcy5zaWQsIGppZCk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnNlc3Npb25zW3Nlc3Muc2lkXTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuamlkMnNlc3Npb25bamlkXTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jYWxsVGVybWluYXRlZCggJ2tpY2tlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZ2V0U3R1bkFuZFR1cm5DcmVkZW50aWFsczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gZ2V0IHN0dW4gYW5kIHR1cm4gY29uZmlndXJhdGlvbiBmcm9tIHNlcnZlciB2aWEgeGVwLTAyMTVcbiAgICAgICAgICAgIC8vIHVzZXMgdGltZS1saW1pdGVkIGNyZWRlbnRpYWxzIGFzIGRlc2NyaWJlZCBpblxuICAgICAgICAgICAgLy8gaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvZHJhZnQtdWJlcnRpLWJlaGF2ZS10dXJuLXJlc3QtMDBcbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyBzZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC9wcm9zb2R5LW1vZHVsZXMvc291cmNlL2Jyb3dzZS9tb2RfdHVybmNyZWRlbnRpYWxzL21vZF90dXJuY3JlZGVudGlhbHMubHVhXG4gICAgICAgICAgICAvLyBmb3IgYSBwcm9zb2R5IG1vZHVsZSB3aGljaCBpbXBsZW1lbnRzIHRoaXNcbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyBjdXJyZW50bHksIHRoaXMgZG9lc24ndCB3b3JrIHdpdGggdXBkYXRlSWNlIGFuZCB0aGVyZWZvcmUgY3JlZGVudGlhbHMgd2l0aCBhIGxvbmdcbiAgICAgICAgICAgIC8vIHZhbGlkaXR5IGhhdmUgdG8gYmUgZmV0Y2hlZCBiZWZvcmUgY3JlYXRpbmcgdGhlIHBlZXJjb25uZWN0aW9uXG4gICAgICAgICAgICAvLyBUT0RPOiBpbXBsZW1lbnQgcmVmcmVzaCB2aWEgdXBkYXRlSWNlIGFzIGRlc2NyaWJlZCBpblxuICAgICAgICAgICAgLy8gICAgICBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3dlYnJ0Yy9pc3N1ZXMvZGV0YWlsP2lkPTE2NTBcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoXG4gICAgICAgICAgICAgICAgJGlxKHt0eXBlOiAnZ2V0JywgdG86IHRoaXMuY29ubmVjdGlvbi5kb21haW59KVxuICAgICAgICAgICAgICAgICAgICAuYygnc2VydmljZXMnLCB7eG1sbnM6ICd1cm46eG1wcDpleHRkaXNjbzoxJ30pLmMoJ3NlcnZpY2UnLCB7aG9zdDogJ3R1cm4uJyArIHRoaXMuY29ubmVjdGlvbi5kb21haW59KSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpY2VzZXJ2ZXJzID0gW107XG4gICAgICAgICAgICAgICAgICAgICQocmVzKS5maW5kKCc+c2VydmljZXM+c2VydmljZScpLmVhY2goZnVuY3Rpb24gKGlkeCwgZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsID0gJChlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZGljdCA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBlbC5hdHRyKCd0eXBlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdzdHVuJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGljdC51cmwgPSAnc3R1bjonICsgZWwuYXR0cignaG9zdCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWwuYXR0cigncG9ydCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWN0LnVybCArPSAnOicgKyBlbC5hdHRyKCdwb3J0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWNlc2VydmVycy5wdXNoKGRpY3QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICd0dXJuJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICd0dXJucyc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpY3QudXJsID0gdHlwZSArICc6JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsLmF0dHIoJ3VzZXJuYW1lJykpIHsgLy8gaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC93ZWJydGMvaXNzdWVzL2RldGFpbD9pZD0xNTA4XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvQ2hyb20oZXxpdW0pXFwvKFswLTldKylcXC4vKSAmJiBwYXJzZUludChuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9DaHJvbShlfGl1bSlcXC8oWzAtOV0rKVxcLi8pWzJdLCAxMCkgPCAyOCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpY3QudXJsICs9IGVsLmF0dHIoJ3VzZXJuYW1lJykgKyAnQCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpY3QudXNlcm5hbWUgPSBlbC5hdHRyKCd1c2VybmFtZScpOyAvLyBvbmx5IHdvcmtzIGluIE0yOFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpY3QudXJsICs9IGVsLmF0dHIoJ2hvc3QnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsLmF0dHIoJ3BvcnQnKSAmJiBlbC5hdHRyKCdwb3J0JykgIT0gJzM0NzgnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWN0LnVybCArPSAnOicgKyBlbC5hdHRyKCdwb3J0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsLmF0dHIoJ3RyYW5zcG9ydCcpICYmIGVsLmF0dHIoJ3RyYW5zcG9ydCcpICE9ICd1ZHAnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWN0LnVybCArPSAnP3RyYW5zcG9ydD0nICsgZWwuYXR0cigndHJhbnNwb3J0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsLmF0dHIoJ3Bhc3N3b3JkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpY3QuY3JlZGVudGlhbCA9IGVsLmF0dHIoJ3Bhc3N3b3JkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWNlc2VydmVycy5wdXNoKGRpY3QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuaWNlX2NvbmZpZy5pY2VTZXJ2ZXJzID0gaWNlc2VydmVycztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdnZXR0aW5nIHR1cm4gY3JlZGVudGlhbHMgZmFpbGVkJywgZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdpcyBtb2RfdHVybmNyZWRlbnRpYWxzIG9yIHNpbWlsYXIgaW5zdGFsbGVkPycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAvLyBpbXBsZW1lbnQgcHVzaD9cbiAgICAgICAgfSxcbiAgICAgICAgZ2V0SmluZ2xlRGF0YTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSB7fTtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKHRoaXMuY29ubmVjdGlvbi5qaW5nbGUuc2Vzc2lvbnMpLmZvckVhY2goZnVuY3Rpb24gKHNpZCkge1xuICAgICAgICAgICAgICAgIHZhciBzZXNzaW9uID0gc2VsZi5jb25uZWN0aW9uLmppbmdsZS5zZXNzaW9uc1tzaWRdO1xuICAgICAgICAgICAgICAgIGlmIChzZXNzaW9uLnBlZXJjb25uZWN0aW9uICYmIHNlc3Npb24ucGVlcmNvbm5lY3Rpb24udXBkYXRlTG9nKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZJWE1FOiBzaG91bGQgcHJvYmFibHkgYmUgYSAuZHVtcCBjYWxsXG4gICAgICAgICAgICAgICAgICAgIGRhdGFbXCJqaW5nbGVfXCIgKyBzZXNzaW9uLnNpZF0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVMb2c6IHNlc3Npb24ucGVlcmNvbm5lY3Rpb24udXBkYXRlTG9nLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHM6IHNlc3Npb24ucGVlcmNvbm5lY3Rpb24uc3RhdHMsXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHdpbmRvdy5sb2NhdGlvbi5ocmVmXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgfVxuICAgIH0pO1xufSIsIi8qIGpzaGludCAtVzExNyAqL1xuXG4vKipcbiAqIENsYXNzIGhvbGRzIGE9c3NyYyBsaW5lcyBhbmQgbWVkaWEgdHlwZSBhPW1pZFxuICogQHBhcmFtIHNzcmMgc3luY2hyb25pemF0aW9uIHNvdXJjZSBpZGVudGlmaWVyIG51bWJlcihhPXNzcmMgbGluZXMgZnJvbSBTRFApXG4gKiBAcGFyYW0gdHlwZSBtZWRpYSB0eXBlIGVnLiBcImF1ZGlvXCIgb3IgXCJ2aWRlb1wiKGE9bWlkIGZybSBTRFApXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gQ2hhbm5lbFNzcmMoc3NyYywgdHlwZSkge1xuICAgIHRoaXMuc3NyYyA9IHNzcmM7XG4gICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICB0aGlzLmxpbmVzID0gW107XG59XG5cbi8qKlxuICogQ2xhc3MgaG9sZHMgYT1zc3JjLWdyb3VwOiBsaW5lc1xuICogQHBhcmFtIHNlbWFudGljc1xuICogQHBhcmFtIHNzcmNzXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gQ2hhbm5lbFNzcmNHcm91cChzZW1hbnRpY3MsIHNzcmNzLCBsaW5lKSB7XG4gICAgdGhpcy5zZW1hbnRpY3MgPSBzZW1hbnRpY3M7XG4gICAgdGhpcy5zc3JjcyA9IHNzcmNzO1xufVxuXG4vKipcbiAqIEhlbHBlciBjbGFzcyByZXByZXNlbnRzIG1lZGlhIGNoYW5uZWwuIElzIGEgY29udGFpbmVyIGZvciBDaGFubmVsU3NyYywgaG9sZHMgY2hhbm5lbCBpZHggYW5kIG1lZGlhIHR5cGUuXG4gKiBAcGFyYW0gY2hhbm5lbE51bWJlciBjaGFubmVsIGlkeCBpbiBTRFAgbWVkaWEgYXJyYXkuXG4gKiBAcGFyYW0gbWVkaWFUeXBlIG1lZGlhIHR5cGUoYT1taWQpXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gTWVkaWFDaGFubmVsKGNoYW5uZWxOdW1iZXIsIG1lZGlhVHlwZSkge1xuICAgIC8qKlxuICAgICAqIFNEUCBjaGFubmVsIG51bWJlclxuICAgICAqIEB0eXBlIHsqfVxuICAgICAqL1xuICAgIHRoaXMuY2hOdW1iZXIgPSBjaGFubmVsTnVtYmVyO1xuICAgIC8qKlxuICAgICAqIENoYW5uZWwgbWVkaWEgdHlwZShhPW1pZClcbiAgICAgKiBAdHlwZSB7Kn1cbiAgICAgKi9cbiAgICB0aGlzLm1lZGlhVHlwZSA9IG1lZGlhVHlwZTtcbiAgICAvKipcbiAgICAgKiBUaGUgbWFwcyBvZiBzc3JjIG51bWJlcnMgdG8gQ2hhbm5lbFNzcmMgb2JqZWN0cy5cbiAgICAgKi9cbiAgICB0aGlzLnNzcmNzID0ge307XG5cbiAgICAvKipcbiAgICAgKiBUaGUgYXJyYXkgb2YgQ2hhbm5lbFNzcmNHcm91cCBvYmplY3RzLlxuICAgICAqIEB0eXBlIHtBcnJheX1cbiAgICAgKi9cbiAgICB0aGlzLnNzcmNHcm91cHMgPSBbXTtcbn1cblxuLy8gU0RQIFNUVUZGXG5mdW5jdGlvbiBTRFAoc2RwKSB7XG4gICAgdGhpcy5tZWRpYSA9IHNkcC5zcGxpdCgnXFxyXFxubT0nKTtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IHRoaXMubWVkaWEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5tZWRpYVtpXSA9ICdtPScgKyB0aGlzLm1lZGlhW2ldO1xuICAgICAgICBpZiAoaSAhPSB0aGlzLm1lZGlhLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIHRoaXMubWVkaWFbaV0gKz0gJ1xcclxcbic7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5zZXNzaW9uID0gdGhpcy5tZWRpYS5zaGlmdCgpICsgJ1xcclxcbic7XG4gICAgdGhpcy5yYXcgPSB0aGlzLnNlc3Npb24gKyB0aGlzLm1lZGlhLmpvaW4oJycpO1xufVxuLyoqXG4gKiBSZXR1cm5zIG1hcCBvZiBNZWRpYUNoYW5uZWwgbWFwcGVkIHBlciBjaGFubmVsIGlkeC5cbiAqL1xuU0RQLnByb3RvdHlwZS5nZXRNZWRpYVNzcmNNYXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG1lZGlhX3NzcmNzID0ge307XG4gICAgZm9yIChjaGFubmVsTnVtID0gMDsgY2hhbm5lbE51bSA8IHNlbGYubWVkaWEubGVuZ3RoOyBjaGFubmVsTnVtKyspIHtcbiAgICAgICAgbW9kaWZpZWQgPSB0cnVlO1xuICAgICAgICB0bXAgPSBTRFBVdGlsLmZpbmRfbGluZXMoc2VsZi5tZWRpYVtjaGFubmVsTnVtXSwgJ2E9c3NyYzonKTtcbiAgICAgICAgdmFyIHR5cGUgPSBTRFBVdGlsLnBhcnNlX21pZChTRFBVdGlsLmZpbmRfbGluZShzZWxmLm1lZGlhW2NoYW5uZWxOdW1dLCAnYT1taWQ6JykpO1xuICAgICAgICB2YXIgY2hhbm5lbCA9IG5ldyBNZWRpYUNoYW5uZWwoY2hhbm5lbE51bSwgdHlwZSk7XG4gICAgICAgIG1lZGlhX3NzcmNzW2NoYW5uZWxOdW1dID0gY2hhbm5lbDtcbiAgICAgICAgdG1wLmZvckVhY2goZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgICAgIHZhciBsaW5lc3NyYyA9IGxpbmUuc3Vic3RyaW5nKDcpLnNwbGl0KCcgJylbMF07XG4gICAgICAgICAgICAvLyBhbGxvY2F0ZSBuZXcgQ2hhbm5lbFNzcmNcbiAgICAgICAgICAgIGlmKCFjaGFubmVsLnNzcmNzW2xpbmVzc3JjXSkge1xuICAgICAgICAgICAgICAgIGNoYW5uZWwuc3NyY3NbbGluZXNzcmNdID0gbmV3IENoYW5uZWxTc3JjKGxpbmVzc3JjLCB0eXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNoYW5uZWwuc3NyY3NbbGluZXNzcmNdLmxpbmVzLnB1c2gobGluZSk7XG4gICAgICAgIH0pO1xuICAgICAgICB0bXAgPSBTRFBVdGlsLmZpbmRfbGluZXMoc2VsZi5tZWRpYVtjaGFubmVsTnVtXSwgJ2E9c3NyYy1ncm91cDonKTtcbiAgICAgICAgdG1wLmZvckVhY2goZnVuY3Rpb24obGluZSl7XG4gICAgICAgICAgICB2YXIgc2VtYW50aWNzID0gbGluZS5zdWJzdHIoMCwgaWR4KS5zdWJzdHIoMTMpO1xuICAgICAgICAgICAgdmFyIHNzcmNzID0gbGluZS5zdWJzdHIoMTQgKyBzZW1hbnRpY3MubGVuZ3RoKS5zcGxpdCgnICcpO1xuICAgICAgICAgICAgaWYgKHNzcmNzLmxlbmd0aCAhPSAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNzcmNHcm91cCA9IG5ldyBDaGFubmVsU3NyY0dyb3VwKHNlbWFudGljcywgc3NyY3MpO1xuICAgICAgICAgICAgICAgIGNoYW5uZWwuc3NyY0dyb3Vwcy5wdXNoKHNzcmNHcm91cCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gbWVkaWFfc3NyY3M7XG59XG4vKipcbiAqIFJldHVybnMgPHR0PnRydWU8L3R0PiBpZiB0aGlzIFNEUCBjb250YWlucyBnaXZlbiBTU1JDLlxuICogQHBhcmFtIHNzcmMgdGhlIHNzcmMgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gPHR0PnRydWU8L3R0PiBpZiB0aGlzIFNEUCBjb250YWlucyBnaXZlbiBTU1JDLlxuICovXG5TRFAucHJvdG90eXBlLmNvbnRhaW5zU1NSQyA9IGZ1bmN0aW9uKHNzcmMpIHtcbiAgICB2YXIgY2hhbm5lbHMgPSB0aGlzLmdldE1lZGlhU3NyY01hcCgpO1xuICAgIHZhciBjb250YWlucyA9IGZhbHNlO1xuICAgIE9iamVjdC5rZXlzKGNoYW5uZWxzKS5mb3JFYWNoKGZ1bmN0aW9uKGNoTnVtYmVyKXtcbiAgICAgICAgdmFyIGNoYW5uZWwgPSBjaGFubmVsc1tjaE51bWJlcl07XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJDaGVja1wiLCBjaGFubmVsLCBzc3JjKTtcbiAgICAgICAgaWYoT2JqZWN0LmtleXMoY2hhbm5lbC5zc3JjcykuaW5kZXhPZihzc3JjKSAhPSAtMSl7XG4gICAgICAgICAgICBjb250YWlucyA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gY29udGFpbnM7XG59XG4vKipcbiAqIFJldHVybnMgbWFwIG9mIE1lZGlhQ2hhbm5lbCB0aGF0IGNvbnRhaW5zIG9ubHkgbWVkaWEgbm90IGNvbnRhaW5lZCBpbiA8dHQ+b3RoZXJTZHA8L3R0Pi4gTWFwcGVkIGJ5IGNoYW5uZWwgaWR4LlxuICogQHBhcmFtIG90aGVyU2RwIHRoZSBvdGhlciBTRFAgdG8gY2hlY2sgc3NyYyB3aXRoLlxuICovXG5TRFAucHJvdG90eXBlLmdldE5ld01lZGlhID0gZnVuY3Rpb24ob3RoZXJTZHApIHtcblxuICAgIC8vIHRoaXMgY291bGQgYmUgdXNlZnVsIGluIEFycmF5LnByb3RvdHlwZS5cbiAgICBmdW5jdGlvbiBhcnJheUVxdWFscyhhcnJheSkge1xuICAgICAgICAvLyBpZiB0aGUgb3RoZXIgYXJyYXkgaXMgYSBmYWxzeSB2YWx1ZSwgcmV0dXJuXG4gICAgICAgIGlmICghYXJyYXkpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgLy8gY29tcGFyZSBsZW5ndGhzIC0gY2FuIHNhdmUgYSBsb3Qgb2YgdGltZVxuICAgICAgICBpZiAodGhpcy5sZW5ndGggIT0gYXJyYXkubGVuZ3RoKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsPXRoaXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiB3ZSBoYXZlIG5lc3RlZCBhcnJheXNcbiAgICAgICAgICAgIGlmICh0aGlzW2ldIGluc3RhbmNlb2YgQXJyYXkgJiYgYXJyYXlbaV0gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgIC8vIHJlY3Vyc2UgaW50byB0aGUgbmVzdGVkIGFycmF5c1xuICAgICAgICAgICAgICAgIGlmICghdGhpc1tpXS5lcXVhbHMoYXJyYXlbaV0pKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh0aGlzW2ldICE9IGFycmF5W2ldKSB7XG4gICAgICAgICAgICAgICAgLy8gV2FybmluZyAtIHR3byBkaWZmZXJlbnQgb2JqZWN0IGluc3RhbmNlcyB3aWxsIG5ldmVyIGJlIGVxdWFsOiB7eDoyMH0gIT0ge3g6MjB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICB2YXIgbXlNZWRpYSA9IHRoaXMuZ2V0TWVkaWFTc3JjTWFwKCk7XG4gICAgdmFyIG90aGVyc01lZGlhID0gb3RoZXJTZHAuZ2V0TWVkaWFTc3JjTWFwKCk7XG4gICAgdmFyIG5ld01lZGlhID0ge307XG4gICAgT2JqZWN0LmtleXMob3RoZXJzTWVkaWEpLmZvckVhY2goZnVuY3Rpb24oY2hhbm5lbE51bSkge1xuICAgICAgICB2YXIgbXlDaGFubmVsID0gbXlNZWRpYVtjaGFubmVsTnVtXTtcbiAgICAgICAgdmFyIG90aGVyc0NoYW5uZWwgPSBvdGhlcnNNZWRpYVtjaGFubmVsTnVtXTtcbiAgICAgICAgaWYoIW15Q2hhbm5lbCAmJiBvdGhlcnNDaGFubmVsKSB7XG4gICAgICAgICAgICAvLyBBZGQgd2hvbGUgY2hhbm5lbFxuICAgICAgICAgICAgbmV3TWVkaWFbY2hhbm5lbE51bV0gPSBvdGhlcnNDaGFubmVsO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIExvb2sgZm9yIG5ldyBzc3JjcyBhY2Nyb3NzIHRoZSBjaGFubmVsXG4gICAgICAgIE9iamVjdC5rZXlzKG90aGVyc0NoYW5uZWwuc3NyY3MpLmZvckVhY2goZnVuY3Rpb24oc3NyYykge1xuICAgICAgICAgICAgaWYoT2JqZWN0LmtleXMobXlDaGFubmVsLnNzcmNzKS5pbmRleE9mKHNzcmMpID09PSAtMSkge1xuICAgICAgICAgICAgICAgIC8vIEFsbG9jYXRlIGNoYW5uZWwgaWYgd2UndmUgZm91bmQgc3NyYyB0aGF0IGRvZXNuJ3QgZXhpc3QgaW4gb3VyIGNoYW5uZWxcbiAgICAgICAgICAgICAgICBpZighbmV3TWVkaWFbY2hhbm5lbE51bV0pe1xuICAgICAgICAgICAgICAgICAgICBuZXdNZWRpYVtjaGFubmVsTnVtXSA9IG5ldyBNZWRpYUNoYW5uZWwob3RoZXJzQ2hhbm5lbC5jaE51bWJlciwgb3RoZXJzQ2hhbm5lbC5tZWRpYVR5cGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBuZXdNZWRpYVtjaGFubmVsTnVtXS5zc3Jjc1tzc3JjXSA9IG90aGVyc0NoYW5uZWwuc3NyY3Nbc3NyY107XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gTG9vayBmb3IgbmV3IHNzcmMgZ3JvdXBzIGFjcm9zcyB0aGUgY2hhbm5lbHNcbiAgICAgICAgb3RoZXJzQ2hhbm5lbC5zc3JjR3JvdXBzLmZvckVhY2goZnVuY3Rpb24ob3RoZXJTc3JjR3JvdXApe1xuXG4gICAgICAgICAgICAvLyB0cnkgdG8gbWF0Y2ggdGhlIG90aGVyIHNzcmMtZ3JvdXAgd2l0aCBhbiBzc3JjLWdyb3VwIG9mIG91cnNcbiAgICAgICAgICAgIHZhciBtYXRjaGVkID0gZmFsc2U7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG15Q2hhbm5lbC5zc3JjR3JvdXBzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIG15U3NyY0dyb3VwID0gbXlDaGFubmVsLnNzcmNHcm91cHNbaV07XG4gICAgICAgICAgICAgICAgaWYgKG90aGVyU3NyY0dyb3VwLnNlbWFudGljcyA9PSBteVNzcmNHcm91cFxuICAgICAgICAgICAgICAgICAgICAmJiBhcnJheUVxdWFscy5hcHBseShvdGhlclNzcmNHcm91cC5zc3JjcywgW215U3NyY0dyb3VwLnNzcmNzXSkpIHtcblxuICAgICAgICAgICAgICAgICAgICBtYXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIW1hdGNoZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBBbGxvY2F0ZSBjaGFubmVsIGlmIHdlJ3ZlIGZvdW5kIGFuIHNzcmMtZ3JvdXAgdGhhdCBkb2Vzbid0XG4gICAgICAgICAgICAgICAgLy8gZXhpc3QgaW4gb3VyIGNoYW5uZWxcblxuICAgICAgICAgICAgICAgIGlmKCFuZXdNZWRpYVtjaGFubmVsTnVtXSl7XG4gICAgICAgICAgICAgICAgICAgIG5ld01lZGlhW2NoYW5uZWxOdW1dID0gbmV3IE1lZGlhQ2hhbm5lbChvdGhlcnNDaGFubmVsLmNoTnVtYmVyLCBvdGhlcnNDaGFubmVsLm1lZGlhVHlwZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG5ld01lZGlhW2NoYW5uZWxOdW1dLnNzcmNHcm91cHMucHVzaChvdGhlclNzcmNHcm91cCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBuZXdNZWRpYTtcbn1cbi8vIHJlbW92ZSBpU0FDIGFuZCBDTiBmcm9tIFNEUFxuU0RQLnByb3RvdHlwZS5tYW5nbGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGksIGosIG1saW5lLCBsaW5lcywgcnRwbWFwLCBuZXdkZXNjO1xuICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLm1lZGlhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGxpbmVzID0gdGhpcy5tZWRpYVtpXS5zcGxpdCgnXFxyXFxuJyk7XG4gICAgICAgIGxpbmVzLnBvcCgpOyAvLyByZW1vdmUgZW1wdHkgbGFzdCBlbGVtZW50XG4gICAgICAgIG1saW5lID0gU0RQVXRpbC5wYXJzZV9tbGluZShsaW5lcy5zaGlmdCgpKTtcbiAgICAgICAgaWYgKG1saW5lLm1lZGlhICE9ICdhdWRpbycpXG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgbmV3ZGVzYyA9ICcnO1xuICAgICAgICBtbGluZS5mbXQubGVuZ3RoID0gMDtcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IGxpbmVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBpZiAobGluZXNbal0uc3Vic3RyKDAsIDkpID09ICdhPXJ0cG1hcDonKSB7XG4gICAgICAgICAgICAgICAgcnRwbWFwID0gU0RQVXRpbC5wYXJzZV9ydHBtYXAobGluZXNbal0pO1xuICAgICAgICAgICAgICAgIGlmIChydHBtYXAubmFtZSA9PSAnQ04nIHx8IHJ0cG1hcC5uYW1lID09ICdJU0FDJylcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgbWxpbmUuZm10LnB1c2gocnRwbWFwLmlkKTtcbiAgICAgICAgICAgICAgICBuZXdkZXNjICs9IGxpbmVzW2pdICsgJ1xcclxcbic7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5ld2Rlc2MgKz0gbGluZXNbal0gKyAnXFxyXFxuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLm1lZGlhW2ldID0gU0RQVXRpbC5idWlsZF9tbGluZShtbGluZSkgKyAnXFxyXFxuJztcbiAgICAgICAgdGhpcy5tZWRpYVtpXSArPSBuZXdkZXNjO1xuICAgIH1cbiAgICB0aGlzLnJhdyA9IHRoaXMuc2Vzc2lvbiArIHRoaXMubWVkaWEuam9pbignJyk7XG59O1xuXG4vLyByZW1vdmUgbGluZXMgbWF0Y2hpbmcgcHJlZml4IGZyb20gc2Vzc2lvbiBzZWN0aW9uXG5TRFAucHJvdG90eXBlLnJlbW92ZVNlc3Npb25MaW5lcyA9IGZ1bmN0aW9uKHByZWZpeCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbGluZXMgPSBTRFBVdGlsLmZpbmRfbGluZXModGhpcy5zZXNzaW9uLCBwcmVmaXgpO1xuICAgIGxpbmVzLmZvckVhY2goZnVuY3Rpb24obGluZSkge1xuICAgICAgICBzZWxmLnNlc3Npb24gPSBzZWxmLnNlc3Npb24ucmVwbGFjZShsaW5lICsgJ1xcclxcbicsICcnKTtcbiAgICB9KTtcbiAgICB0aGlzLnJhdyA9IHRoaXMuc2Vzc2lvbiArIHRoaXMubWVkaWEuam9pbignJyk7XG4gICAgcmV0dXJuIGxpbmVzO1xufVxuLy8gcmVtb3ZlIGxpbmVzIG1hdGNoaW5nIHByZWZpeCBmcm9tIGEgbWVkaWEgc2VjdGlvbiBzcGVjaWZpZWQgYnkgbWVkaWFpbmRleFxuLy8gVE9ETzogbm9uLW51bWVyaWMgbWVkaWFpbmRleCBjb3VsZCBtYXRjaCBtaWRcblNEUC5wcm90b3R5cGUucmVtb3ZlTWVkaWFMaW5lcyA9IGZ1bmN0aW9uKG1lZGlhaW5kZXgsIHByZWZpeCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbGluZXMgPSBTRFBVdGlsLmZpbmRfbGluZXModGhpcy5tZWRpYVttZWRpYWluZGV4XSwgcHJlZml4KTtcbiAgICBsaW5lcy5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgc2VsZi5tZWRpYVttZWRpYWluZGV4XSA9IHNlbGYubWVkaWFbbWVkaWFpbmRleF0ucmVwbGFjZShsaW5lICsgJ1xcclxcbicsICcnKTtcbiAgICB9KTtcbiAgICB0aGlzLnJhdyA9IHRoaXMuc2Vzc2lvbiArIHRoaXMubWVkaWEuam9pbignJyk7XG4gICAgcmV0dXJuIGxpbmVzO1xufVxuXG4vLyBhZGQgY29udGVudCdzIHRvIGEgamluZ2xlIGVsZW1lbnRcblNEUC5wcm90b3R5cGUudG9KaW5nbGUgPSBmdW5jdGlvbiAoZWxlbSwgdGhlY3JlYXRvcikge1xuICAgIHZhciBpLCBqLCBrLCBtbGluZSwgc3NyYywgcnRwbWFwLCB0bXAsIGxpbmUsIGxpbmVzO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBuZXcgYnVuZGxlIHBsYW5cbiAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUodGhpcy5zZXNzaW9uLCAnYT1ncm91cDonKSkge1xuICAgICAgICBsaW5lcyA9IFNEUFV0aWwuZmluZF9saW5lcyh0aGlzLnNlc3Npb24sICdhPWdyb3VwOicpO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRtcCA9IGxpbmVzW2ldLnNwbGl0KCcgJyk7XG4gICAgICAgICAgICB2YXIgc2VtYW50aWNzID0gdG1wLnNoaWZ0KCkuc3Vic3RyKDgpO1xuICAgICAgICAgICAgZWxlbS5jKCdncm91cCcsIHt4bWxuczogJ3Vybjp4bXBwOmppbmdsZTphcHBzOmdyb3VwaW5nOjAnLCBzZW1hbnRpY3M6c2VtYW50aWNzfSk7XG4gICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgdG1wLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgZWxlbS5jKCdjb250ZW50Jywge25hbWU6IHRtcFtqXX0pLnVwKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbGVtLnVwKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gb2xkIGJ1bmRsZSBwbGFuLCB0byBiZSByZW1vdmVkXG4gICAgdmFyIGJ1bmRsZSA9IFtdO1xuICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZSh0aGlzLnNlc3Npb24sICdhPWdyb3VwOkJVTkRMRScpKSB7XG4gICAgICAgIGJ1bmRsZSA9IFNEUFV0aWwuZmluZF9saW5lKHRoaXMuc2Vzc2lvbiwgJ2E9Z3JvdXA6QlVORExFICcpLnNwbGl0KCcgJyk7XG4gICAgICAgIGJ1bmRsZS5zaGlmdCgpO1xuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5tZWRpYS5sZW5ndGg7IGkrKykge1xuICAgICAgICBtbGluZSA9IFNEUFV0aWwucGFyc2VfbWxpbmUodGhpcy5tZWRpYVtpXS5zcGxpdCgnXFxyXFxuJylbMF0pO1xuICAgICAgICBpZiAoIShtbGluZS5tZWRpYSA9PT0gJ2F1ZGlvJyB8fFxuICAgICAgICAgICAgICBtbGluZS5tZWRpYSA9PT0gJ3ZpZGVvJyB8fFxuICAgICAgICAgICAgICBtbGluZS5tZWRpYSA9PT0gJ2FwcGxpY2F0aW9uJykpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZSh0aGlzLm1lZGlhW2ldLCAnYT1zc3JjOicpKSB7XG4gICAgICAgICAgICBzc3JjID0gU0RQVXRpbC5maW5kX2xpbmUodGhpcy5tZWRpYVtpXSwgJ2E9c3NyYzonKS5zdWJzdHJpbmcoNykuc3BsaXQoJyAnKVswXTsgLy8gdGFrZSB0aGUgZmlyc3RcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNzcmMgPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGVsZW0uYygnY29udGVudCcsIHtjcmVhdG9yOiB0aGVjcmVhdG9yLCBuYW1lOiBtbGluZS5tZWRpYX0pO1xuICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUodGhpcy5tZWRpYVtpXSwgJ2E9bWlkOicpKSB7XG4gICAgICAgICAgICAvLyBwcmVmZXIgaWRlbnRpZmllciBmcm9tIGE9bWlkIGlmIHByZXNlbnRcbiAgICAgICAgICAgIHZhciBtaWQgPSBTRFBVdGlsLnBhcnNlX21pZChTRFBVdGlsLmZpbmRfbGluZSh0aGlzLm1lZGlhW2ldLCAnYT1taWQ6JykpO1xuICAgICAgICAgICAgZWxlbS5hdHRycyh7IG5hbWU6IG1pZCB9KTtcblxuICAgICAgICAgICAgLy8gb2xkIEJVTkRMRSBwbGFuLCB0byBiZSByZW1vdmVkXG4gICAgICAgICAgICBpZiAoYnVuZGxlLmluZGV4T2YobWlkKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBlbGVtLmMoJ2J1bmRsZScsIHt4bWxuczogJ2h0dHA6Ly9lc3Rvcy5kZS9ucy9idW5kbGUnfSkudXAoKTtcbiAgICAgICAgICAgICAgICBidW5kbGUuc3BsaWNlKGJ1bmRsZS5pbmRleE9mKG1pZCksIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKHRoaXMubWVkaWFbaV0sICdhPXJ0cG1hcDonKS5sZW5ndGgpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGVsZW0uYygnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHt4bWxuczogJ3Vybjp4bXBwOmppbmdsZTphcHBzOnJ0cDoxJyxcbiAgICAgICAgICAgICAgICAgICAgbWVkaWE6IG1saW5lLm1lZGlhIH0pO1xuICAgICAgICAgICAgaWYgKHNzcmMpIHtcbiAgICAgICAgICAgICAgICBlbGVtLmF0dHJzKHtzc3JjOiBzc3JjfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgbWxpbmUuZm10Lmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgcnRwbWFwID0gU0RQVXRpbC5maW5kX2xpbmUodGhpcy5tZWRpYVtpXSwgJ2E9cnRwbWFwOicgKyBtbGluZS5mbXRbal0pO1xuICAgICAgICAgICAgICAgIGVsZW0uYygncGF5bG9hZC10eXBlJywgU0RQVXRpbC5wYXJzZV9ydHBtYXAocnRwbWFwKSk7XG4gICAgICAgICAgICAgICAgLy8gcHV0IGFueSAnYT1mbXRwOicgKyBtbGluZS5mbXRbal0gbGluZXMgaW50byA8cGFyYW0gbmFtZT1mb28gdmFsdWU9YmFyLz5cbiAgICAgICAgICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUodGhpcy5tZWRpYVtpXSwgJ2E9Zm10cDonICsgbWxpbmUuZm10W2pdKSkge1xuICAgICAgICAgICAgICAgICAgICB0bXAgPSBTRFBVdGlsLnBhcnNlX2ZtdHAoU0RQVXRpbC5maW5kX2xpbmUodGhpcy5tZWRpYVtpXSwgJ2E9Zm10cDonICsgbWxpbmUuZm10W2pdKSk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoayA9IDA7IGsgPCB0bXAubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uYygncGFyYW1ldGVyJywgdG1wW2tdKS51cCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuUnRjcEZiVG9KaW5nbGUoaSwgZWxlbSwgbWxpbmUuZm10W2pdKTsgLy8gWEVQLTAyOTMgLS0gbWFwIGE9cnRjcC1mYlxuXG4gICAgICAgICAgICAgICAgZWxlbS51cCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKHRoaXMubWVkaWFbaV0sICdhPWNyeXB0bzonLCB0aGlzLnNlc3Npb24pKSB7XG4gICAgICAgICAgICAgICAgZWxlbS5jKCdlbmNyeXB0aW9uJywge3JlcXVpcmVkOiAxfSk7XG4gICAgICAgICAgICAgICAgdmFyIGNyeXB0byA9IFNEUFV0aWwuZmluZF9saW5lcyh0aGlzLm1lZGlhW2ldLCAnYT1jcnlwdG86JywgdGhpcy5zZXNzaW9uKTtcbiAgICAgICAgICAgICAgICBjcnlwdG8uZm9yRWFjaChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uYygnY3J5cHRvJywgU0RQVXRpbC5wYXJzZV9jcnlwdG8obGluZSkpLnVwKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZWxlbS51cCgpOyAvLyBlbmQgb2YgZW5jcnlwdGlvblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc3NyYykge1xuICAgICAgICAgICAgICAgIC8vIG5ldyBzdHlsZSBtYXBwaW5nXG4gICAgICAgICAgICAgICAgZWxlbS5jKCdzb3VyY2UnLCB7IHNzcmM6IHNzcmMsIHhtbG5zOiAndXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOnNzbWE6MCcgfSk7XG4gICAgICAgICAgICAgICAgLy8gRklYTUU6IGdyb3VwIGJ5IHNzcmMgYW5kIHN1cHBvcnQgbXVsdGlwbGUgZGlmZmVyZW50IHNzcmNzXG4gICAgICAgICAgICAgICAgdmFyIHNzcmNsaW5lcyA9IFNEUFV0aWwuZmluZF9saW5lcyh0aGlzLm1lZGlhW2ldLCAnYT1zc3JjOicpO1xuICAgICAgICAgICAgICAgIHNzcmNsaW5lcy5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWR4ID0gbGluZS5pbmRleE9mKCcgJyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsaW5lc3NyYyA9IGxpbmUuc3Vic3RyKDAsIGlkeCkuc3Vic3RyKDcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGluZXNzcmMgIT0gc3NyYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS51cCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3NyYyA9IGxpbmVzc3JjO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5jKCdzb3VyY2UnLCB7IHNzcmM6IHNzcmMsIHhtbG5zOiAndXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOnNzbWE6MCcgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdmFyIGt2ID0gbGluZS5zdWJzdHIoaWR4ICsgMSk7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uYygncGFyYW1ldGVyJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChrdi5pbmRleE9mKCc6JykgPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uYXR0cnMoeyBuYW1lOiBrdiB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uYXR0cnMoeyBuYW1lOiBrdi5zcGxpdCgnOicsIDIpWzBdIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5hdHRycyh7IHZhbHVlOiBrdi5zcGxpdCgnOicsIDIpWzFdIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsZW0udXAoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBlbGVtLnVwKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBvbGQgcHJvcHJpZXRhcnkgbWFwcGluZywgdG8gYmUgcmVtb3ZlZCBhdCBzb21lIHBvaW50XG4gICAgICAgICAgICAgICAgdG1wID0gU0RQVXRpbC5wYXJzZV9zc3JjKHRoaXMubWVkaWFbaV0pO1xuICAgICAgICAgICAgICAgIHRtcC54bWxucyA9ICdodHRwOi8vZXN0b3MuZGUvbnMvc3NyYyc7XG4gICAgICAgICAgICAgICAgdG1wLnNzcmMgPSBzc3JjO1xuICAgICAgICAgICAgICAgIGVsZW0uYygnc3NyYycsIHRtcCkudXAoKTsgLy8gc3NyYyBpcyBwYXJ0IG9mIGRlc2NyaXB0aW9uXG5cbiAgICAgICAgICAgICAgICAvLyBYRVAtMDMzOSBoYW5kbGUgc3NyYy1ncm91cCBhdHRyaWJ1dGVzXG4gICAgICAgICAgICAgICAgdmFyIHNzcmNfZ3JvdXBfbGluZXMgPSBTRFBVdGlsLmZpbmRfbGluZXModGhpcy5tZWRpYVtpXSwgJ2E9c3NyYy1ncm91cDonKTtcbiAgICAgICAgICAgICAgICBzc3JjX2dyb3VwX2xpbmVzLmZvckVhY2goZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgICAgICAgICBpZHggPSBsaW5lLmluZGV4T2YoJyAnKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNlbWFudGljcyA9IGxpbmUuc3Vic3RyKDAsIGlkeCkuc3Vic3RyKDEzKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNzcmNzID0gbGluZS5zdWJzdHIoMTQgKyBzZW1hbnRpY3MubGVuZ3RoKS5zcGxpdCgnICcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3NyY3MubGVuZ3RoICE9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uYygnc3NyYy1ncm91cCcsIHsgc2VtYW50aWNzOiBzZW1hbnRpY3MsIHhtbG5zOiAndXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOnNzbWE6MCcgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzc3Jjcy5mb3JFYWNoKGZ1bmN0aW9uKHNzcmMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmMoJ3NvdXJjZScsIHsgc3NyYzogc3NyYyB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudXAoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS51cCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZSh0aGlzLm1lZGlhW2ldLCAnYT1ydGNwLW11eCcpKSB7XG4gICAgICAgICAgICAgICAgZWxlbS5jKCdydGNwLW11eCcpLnVwKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFhFUC0wMjkzIC0tIG1hcCBhPXJ0Y3AtZmI6KlxuICAgICAgICAgICAgdGhpcy5SdGNwRmJUb0ppbmdsZShpLCBlbGVtLCAnKicpO1xuXG4gICAgICAgICAgICAvLyBYRVAtMDI5NFxuICAgICAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKHRoaXMubWVkaWFbaV0sICdhPWV4dG1hcDonKSkge1xuICAgICAgICAgICAgICAgIGxpbmVzID0gU0RQVXRpbC5maW5kX2xpbmVzKHRoaXMubWVkaWFbaV0sICdhPWV4dG1hcDonKTtcbiAgICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgbGluZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdG1wID0gU0RQVXRpbC5wYXJzZV9leHRtYXAobGluZXNbal0pO1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmMoJ3J0cC1oZHJleHQnLCB7IHhtbG5zOiAndXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOnJ0cC1oZHJleHQ6MCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmk6IHRtcC51cmksXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogdG1wLnZhbHVlIH0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAodG1wLmhhc093blByb3BlcnR5KCdkaXJlY3Rpb24nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoICh0bXAuZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnc2VuZG9ubHknOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmF0dHJzKHtzZW5kZXJzOiAncmVzcG9uZGVyJ30pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdyZWN2b25seSc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uYXR0cnMoe3NlbmRlcnM6ICdpbml0aWF0b3InfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3NlbmRyZWN2JzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5hdHRycyh7c2VuZGVyczogJ2JvdGgnfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2luYWN0aXZlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5hdHRycyh7c2VuZGVyczogJ25vbmUnfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIFRPRE86IGhhbmRsZSBwYXJhbXNcbiAgICAgICAgICAgICAgICAgICAgZWxlbS51cCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsZW0udXAoKTsgLy8gZW5kIG9mIGRlc2NyaXB0aW9uXG4gICAgICAgIH1cblxuICAgICAgICAvLyBtYXAgaWNlLXVmcmFnL3B3ZCwgZHRscyBmaW5nZXJwcmludCwgY2FuZGlkYXRlc1xuICAgICAgICB0aGlzLlRyYW5zcG9ydFRvSmluZ2xlKGksIGVsZW0pO1xuXG4gICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZSh0aGlzLm1lZGlhW2ldLCAnYT1zZW5kcmVjdicsIHRoaXMuc2Vzc2lvbikpIHtcbiAgICAgICAgICAgIGVsZW0uYXR0cnMoe3NlbmRlcnM6ICdib3RoJ30pO1xuICAgICAgICB9IGVsc2UgaWYgKFNEUFV0aWwuZmluZF9saW5lKHRoaXMubWVkaWFbaV0sICdhPXNlbmRvbmx5JywgdGhpcy5zZXNzaW9uKSkge1xuICAgICAgICAgICAgZWxlbS5hdHRycyh7c2VuZGVyczogJ2luaXRpYXRvcid9KTtcbiAgICAgICAgfSBlbHNlIGlmIChTRFBVdGlsLmZpbmRfbGluZSh0aGlzLm1lZGlhW2ldLCAnYT1yZWN2b25seScsIHRoaXMuc2Vzc2lvbikpIHtcbiAgICAgICAgICAgIGVsZW0uYXR0cnMoe3NlbmRlcnM6ICdyZXNwb25kZXInfSk7XG4gICAgICAgIH0gZWxzZSBpZiAoU0RQVXRpbC5maW5kX2xpbmUodGhpcy5tZWRpYVtpXSwgJ2E9aW5hY3RpdmUnLCB0aGlzLnNlc3Npb24pKSB7XG4gICAgICAgICAgICBlbGVtLmF0dHJzKHtzZW5kZXJzOiAnbm9uZSd9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobWxpbmUucG9ydCA9PSAnMCcpIHtcbiAgICAgICAgICAgIC8vIGVzdG9zIGhhY2sgdG8gcmVqZWN0IGFuIG0tbGluZVxuICAgICAgICAgICAgZWxlbS5hdHRycyh7c2VuZGVyczogJ3JlamVjdGVkJ30pO1xuICAgICAgICB9XG4gICAgICAgIGVsZW0udXAoKTsgLy8gZW5kIG9mIGNvbnRlbnRcbiAgICB9XG4gICAgZWxlbS51cCgpO1xuICAgIHJldHVybiBlbGVtO1xufTtcblxuU0RQLnByb3RvdHlwZS5UcmFuc3BvcnRUb0ppbmdsZSA9IGZ1bmN0aW9uIChtZWRpYWluZGV4LCBlbGVtKSB7XG4gICAgdmFyIGkgPSBtZWRpYWluZGV4O1xuICAgIHZhciB0bXA7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGVsZW0uYygndHJhbnNwb3J0Jyk7XG5cbiAgICAvLyBYRVAtMDM0MyBEVExTL1NDVFBcbiAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUodGhpcy5tZWRpYVttZWRpYWluZGV4XSwgJ2E9c2N0cG1hcDonKS5sZW5ndGgpXG4gICAge1xuICAgICAgICB2YXIgc2N0cG1hcCA9IFNEUFV0aWwuZmluZF9saW5lKFxuICAgICAgICAgICAgdGhpcy5tZWRpYVtpXSwgJ2E9c2N0cG1hcDonLCBzZWxmLnNlc3Npb24pO1xuICAgICAgICBpZiAoc2N0cG1hcClcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHNjdHBBdHRycyA9IFNEUFV0aWwucGFyc2Vfc2N0cG1hcChzY3RwbWFwKTtcbiAgICAgICAgICAgIGVsZW0uYygnc2N0cG1hcCcsXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB4bWxuczogJ3Vybjp4bXBwOmppbmdsZTp0cmFuc3BvcnRzOmR0bHMtc2N0cDoxJyxcbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyOiBzY3RwQXR0cnNbMF0sIC8qIFNDVFAgcG9ydCAqL1xuICAgICAgICAgICAgICAgICAgICBwcm90b2NvbDogc2N0cEF0dHJzWzFdLCAvKiBwcm90b2NvbCAqL1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gT3B0aW9uYWwgc3RyZWFtIGNvdW50IGF0dHJpYnV0ZVxuICAgICAgICAgICAgaWYgKHNjdHBBdHRycy5sZW5ndGggPiAyKVxuICAgICAgICAgICAgICAgIGVsZW0uYXR0cnMoeyBzdHJlYW1zOiBzY3RwQXR0cnNbMl19KTtcbiAgICAgICAgICAgIGVsZW0udXAoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBYRVAtMDMyMFxuICAgIHZhciBmaW5nZXJwcmludHMgPSBTRFBVdGlsLmZpbmRfbGluZXModGhpcy5tZWRpYVttZWRpYWluZGV4XSwgJ2E9ZmluZ2VycHJpbnQ6JywgdGhpcy5zZXNzaW9uKTtcbiAgICBmaW5nZXJwcmludHMuZm9yRWFjaChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgIHRtcCA9IFNEUFV0aWwucGFyc2VfZmluZ2VycHJpbnQobGluZSk7XG4gICAgICAgIHRtcC54bWxucyA9ICd1cm46eG1wcDpqaW5nbGU6YXBwczpkdGxzOjAnO1xuICAgICAgICBlbGVtLmMoJ2ZpbmdlcnByaW50JykudCh0bXAuZmluZ2VycHJpbnQpO1xuICAgICAgICBkZWxldGUgdG1wLmZpbmdlcnByaW50O1xuICAgICAgICBsaW5lID0gU0RQVXRpbC5maW5kX2xpbmUoc2VsZi5tZWRpYVttZWRpYWluZGV4XSwgJ2E9c2V0dXA6Jywgc2VsZi5zZXNzaW9uKTtcbiAgICAgICAgaWYgKGxpbmUpIHtcbiAgICAgICAgICAgIHRtcC5zZXR1cCA9IGxpbmUuc3Vic3RyKDgpO1xuICAgICAgICB9XG4gICAgICAgIGVsZW0uYXR0cnModG1wKTtcbiAgICAgICAgZWxlbS51cCgpOyAvLyBlbmQgb2YgZmluZ2VycHJpbnRcbiAgICB9KTtcbiAgICB0bXAgPSBTRFBVdGlsLmljZXBhcmFtcyh0aGlzLm1lZGlhW21lZGlhaW5kZXhdLCB0aGlzLnNlc3Npb24pO1xuICAgIGlmICh0bXApIHtcbiAgICAgICAgdG1wLnhtbG5zID0gJ3Vybjp4bXBwOmppbmdsZTp0cmFuc3BvcnRzOmljZS11ZHA6MSc7XG4gICAgICAgIGVsZW0uYXR0cnModG1wKTtcbiAgICAgICAgLy8gWEVQLTAxNzZcbiAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKHRoaXMubWVkaWFbbWVkaWFpbmRleF0sICdhPWNhbmRpZGF0ZTonLCB0aGlzLnNlc3Npb24pKSB7IC8vIGFkZCBhbnkgYT1jYW5kaWRhdGUgbGluZXNcbiAgICAgICAgICAgIHZhciBsaW5lcyA9IFNEUFV0aWwuZmluZF9saW5lcyh0aGlzLm1lZGlhW21lZGlhaW5kZXhdLCAnYT1jYW5kaWRhdGU6JywgdGhpcy5zZXNzaW9uKTtcbiAgICAgICAgICAgIGxpbmVzLmZvckVhY2goZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgICAgICAgICBlbGVtLmMoJ2NhbmRpZGF0ZScsIFNEUFV0aWwuY2FuZGlkYXRlVG9KaW5nbGUobGluZSkpLnVwKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbGVtLnVwKCk7IC8vIGVuZCBvZiB0cmFuc3BvcnRcbn1cblxuU0RQLnByb3RvdHlwZS5SdGNwRmJUb0ppbmdsZSA9IGZ1bmN0aW9uIChtZWRpYWluZGV4LCBlbGVtLCBwYXlsb2FkdHlwZSkgeyAvLyBYRVAtMDI5M1xuICAgIHZhciBsaW5lcyA9IFNEUFV0aWwuZmluZF9saW5lcyh0aGlzLm1lZGlhW21lZGlhaW5kZXhdLCAnYT1ydGNwLWZiOicgKyBwYXlsb2FkdHlwZSk7XG4gICAgbGluZXMuZm9yRWFjaChmdW5jdGlvbiAobGluZSkge1xuICAgICAgICB2YXIgdG1wID0gU0RQVXRpbC5wYXJzZV9ydGNwZmIobGluZSk7XG4gICAgICAgIGlmICh0bXAudHlwZSA9PSAndHJyLWludCcpIHtcbiAgICAgICAgICAgIGVsZW0uYygncnRjcC1mYi10cnItaW50Jywge3htbG5zOiAndXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOnJ0Y3AtZmI6MCcsIHZhbHVlOiB0bXAucGFyYW1zWzBdfSk7XG4gICAgICAgICAgICBlbGVtLnVwKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbGVtLmMoJ3J0Y3AtZmInLCB7eG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6cnRjcC1mYjowJywgdHlwZTogdG1wLnR5cGV9KTtcbiAgICAgICAgICAgIGlmICh0bXAucGFyYW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBlbGVtLmF0dHJzKHsnc3VidHlwZSc6IHRtcC5wYXJhbXNbMF19KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsZW0udXAoKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuU0RQLnByb3RvdHlwZS5SdGNwRmJGcm9tSmluZ2xlID0gZnVuY3Rpb24gKGVsZW0sIHBheWxvYWR0eXBlKSB7IC8vIFhFUC0wMjkzXG4gICAgdmFyIG1lZGlhID0gJyc7XG4gICAgdmFyIHRtcCA9IGVsZW0uZmluZCgnPnJ0Y3AtZmItdHJyLWludFt4bWxucz1cInVybjp4bXBwOmppbmdsZTphcHBzOnJ0cDpydGNwLWZiOjBcIl0nKTtcbiAgICBpZiAodG1wLmxlbmd0aCkge1xuICAgICAgICBtZWRpYSArPSAnYT1ydGNwLWZiOicgKyAnKicgKyAnICcgKyAndHJyLWludCcgKyAnICc7XG4gICAgICAgIGlmICh0bXAuYXR0cigndmFsdWUnKSkge1xuICAgICAgICAgICAgbWVkaWEgKz0gdG1wLmF0dHIoJ3ZhbHVlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtZWRpYSArPSAnMCc7XG4gICAgICAgIH1cbiAgICAgICAgbWVkaWEgKz0gJ1xcclxcbic7XG4gICAgfVxuICAgIHRtcCA9IGVsZW0uZmluZCgnPnJ0Y3AtZmJbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6cnRjcC1mYjowXCJdJyk7XG4gICAgdG1wLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBtZWRpYSArPSAnYT1ydGNwLWZiOicgKyBwYXlsb2FkdHlwZSArICcgJyArICQodGhpcykuYXR0cigndHlwZScpO1xuICAgICAgICBpZiAoJCh0aGlzKS5hdHRyKCdzdWJ0eXBlJykpIHtcbiAgICAgICAgICAgIG1lZGlhICs9ICcgJyArICQodGhpcykuYXR0cignc3VidHlwZScpO1xuICAgICAgICB9XG4gICAgICAgIG1lZGlhICs9ICdcXHJcXG4nO1xuICAgIH0pO1xuICAgIHJldHVybiBtZWRpYTtcbn07XG5cbi8vIGNvbnN0cnVjdCBhbiBTRFAgZnJvbSBhIGppbmdsZSBzdGFuemFcblNEUC5wcm90b3R5cGUuZnJvbUppbmdsZSA9IGZ1bmN0aW9uIChqaW5nbGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5yYXcgPSAndj0wXFxyXFxuJyArXG4gICAgICAgICdvPS0gJyArICcxOTIzNTE4NTE2JyArICcgMiBJTiBJUDQgMC4wLjAuMFxcclxcbicgKy8vIEZJWE1FXG4gICAgICAgICdzPS1cXHJcXG4nICtcbiAgICAgICAgJ3Q9MCAwXFxyXFxuJztcbiAgICAvLyBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9kcmFmdC1pZXRmLW1tdXNpYy1zZHAtYnVuZGxlLW5lZ290aWF0aW9uLTA0I3NlY3Rpb24tOFxuICAgIGlmICgkKGppbmdsZSkuZmluZCgnPmdyb3VwW3htbG5zPVwidXJuOnhtcHA6amluZ2xlOmFwcHM6Z3JvdXBpbmc6MFwiXScpLmxlbmd0aCkge1xuICAgICAgICAkKGppbmdsZSkuZmluZCgnPmdyb3VwW3htbG5zPVwidXJuOnhtcHA6amluZ2xlOmFwcHM6Z3JvdXBpbmc6MFwiXScpLmVhY2goZnVuY3Rpb24gKGlkeCwgZ3JvdXApIHtcbiAgICAgICAgICAgIHZhciBjb250ZW50cyA9ICQoZ3JvdXApLmZpbmQoJz5jb250ZW50JykubWFwKGZ1bmN0aW9uIChpZHgsIGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29udGVudC5nZXRBdHRyaWJ1dGUoJ25hbWUnKTtcbiAgICAgICAgICAgIH0pLmdldCgpO1xuICAgICAgICAgICAgaWYgKGNvbnRlbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBzZWxmLnJhdyArPSAnYT1ncm91cDonICsgKGdyb3VwLmdldEF0dHJpYnV0ZSgnc2VtYW50aWNzJykgfHwgZ3JvdXAuZ2V0QXR0cmlidXRlKCd0eXBlJykpICsgJyAnICsgY29udGVudHMuam9pbignICcpICsgJ1xcclxcbic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoJChqaW5nbGUpLmZpbmQoJz5ncm91cFt4bWxucz1cInVybjppZXRmOnJmYzo1ODg4XCJdJykubGVuZ3RoKSB7XG4gICAgICAgIC8vIHRlbXBvcmFyeSBuYW1lc3BhY2UsIG5vdCB0byBiZSB1c2VkLiB0byBiZSByZW1vdmVkIHNvb24uXG4gICAgICAgICQoamluZ2xlKS5maW5kKCc+Z3JvdXBbeG1sbnM9XCJ1cm46aWV0ZjpyZmM6NTg4OFwiXScpLmVhY2goZnVuY3Rpb24gKGlkeCwgZ3JvdXApIHtcbiAgICAgICAgICAgIHZhciBjb250ZW50cyA9ICQoZ3JvdXApLmZpbmQoJz5jb250ZW50JykubWFwKGZ1bmN0aW9uIChpZHgsIGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29udGVudC5nZXRBdHRyaWJ1dGUoJ25hbWUnKTtcbiAgICAgICAgICAgIH0pLmdldCgpO1xuICAgICAgICAgICAgaWYgKGdyb3VwLmdldEF0dHJpYnV0ZSgndHlwZScpICE9PSBudWxsICYmIGNvbnRlbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBzZWxmLnJhdyArPSAnYT1ncm91cDonICsgZ3JvdXAuZ2V0QXR0cmlidXRlKCd0eXBlJykgKyAnICcgKyBjb250ZW50cy5qb2luKCcgJykgKyAnXFxyXFxuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZm9yIGJhY2t3YXJkIGNvbXBhYmlsaXR5LCB0byBiZSByZW1vdmVkIHNvb25cbiAgICAgICAgLy8gYXNzdW1lIGFsbCBjb250ZW50cyBhcmUgaW4gdGhlIHNhbWUgYnVuZGxlIGdyb3VwLCBjYW4gYmUgaW1wcm92ZWQgdXBvbiBsYXRlclxuICAgICAgICB2YXIgYnVuZGxlID0gJChqaW5nbGUpLmZpbmQoJz5jb250ZW50JykuZmlsdGVyKGZ1bmN0aW9uIChpZHgsIGNvbnRlbnQpIHtcbiAgICAgICAgICAgIC8vZWxlbS5jKCdidW5kbGUnLCB7eG1sbnM6J2h0dHA6Ly9lc3Rvcy5kZS9ucy9idW5kbGUnfSk7XG4gICAgICAgICAgICByZXR1cm4gJChjb250ZW50KS5maW5kKCc+YnVuZGxlJykubGVuZ3RoID4gMDtcbiAgICAgICAgfSkubWFwKGZ1bmN0aW9uIChpZHgsIGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29udGVudC5nZXRBdHRyaWJ1dGUoJ25hbWUnKTtcbiAgICAgICAgICAgIH0pLmdldCgpO1xuICAgICAgICBpZiAoYnVuZGxlLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5yYXcgKz0gJ2E9Z3JvdXA6QlVORExFICcgKyBidW5kbGUuam9pbignICcpICsgJ1xcclxcbic7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnNlc3Npb24gPSB0aGlzLnJhdztcbiAgICBqaW5nbGUuZmluZCgnPmNvbnRlbnQnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG0gPSBzZWxmLmppbmdsZTJtZWRpYSgkKHRoaXMpKTtcbiAgICAgICAgc2VsZi5tZWRpYS5wdXNoKG0pO1xuICAgIH0pO1xuXG4gICAgLy8gcmVjb25zdHJ1Y3QgbXNpZC1zZW1hbnRpYyAtLSBhcHBhcmVudGx5IG5vdCBuZWNlc3NhcnlcbiAgICAvKlxuICAgICB2YXIgbXNpZCA9IFNEUFV0aWwucGFyc2Vfc3NyYyh0aGlzLnJhdyk7XG4gICAgIGlmIChtc2lkLmhhc093blByb3BlcnR5KCdtc2xhYmVsJykpIHtcbiAgICAgdGhpcy5zZXNzaW9uICs9IFwiYT1tc2lkLXNlbWFudGljOiBXTVMgXCIgKyBtc2lkLm1zbGFiZWwgKyBcIlxcclxcblwiO1xuICAgICB9XG4gICAgICovXG5cbiAgICB0aGlzLnJhdyA9IHRoaXMuc2Vzc2lvbiArIHRoaXMubWVkaWEuam9pbignJyk7XG59O1xuXG4vLyB0cmFuc2xhdGUgYSBqaW5nbGUgY29udGVudCBlbGVtZW50IGludG8gYW4gYW4gU0RQIG1lZGlhIHBhcnRcblNEUC5wcm90b3R5cGUuamluZ2xlMm1lZGlhID0gZnVuY3Rpb24gKGNvbnRlbnQpIHtcbiAgICB2YXIgbWVkaWEgPSAnJyxcbiAgICAgICAgZGVzYyA9IGNvbnRlbnQuZmluZCgnZGVzY3JpcHRpb24nKSxcbiAgICAgICAgc3NyYyA9IGRlc2MuYXR0cignc3NyYycpLFxuICAgICAgICBzZWxmID0gdGhpcyxcbiAgICAgICAgdG1wO1xuICAgIHZhciBzY3RwID0gY29udGVudC5maW5kKFxuICAgICAgICAnPnRyYW5zcG9ydD5zY3RwbWFwW3htbG5zPVwidXJuOnhtcHA6amluZ2xlOnRyYW5zcG9ydHM6ZHRscy1zY3RwOjFcIl0nKTtcblxuICAgIHRtcCA9IHsgbWVkaWE6IGRlc2MuYXR0cignbWVkaWEnKSB9O1xuICAgIHRtcC5wb3J0ID0gJzEnO1xuICAgIGlmIChjb250ZW50LmF0dHIoJ3NlbmRlcnMnKSA9PSAncmVqZWN0ZWQnKSB7XG4gICAgICAgIC8vIGVzdG9zIGhhY2sgdG8gcmVqZWN0IGFuIG0tbGluZS5cbiAgICAgICAgdG1wLnBvcnQgPSAnMCc7XG4gICAgfVxuICAgIGlmIChjb250ZW50LmZpbmQoJz50cmFuc3BvcnQ+ZmluZ2VycHJpbnQnKS5sZW5ndGggfHwgZGVzYy5maW5kKCdlbmNyeXB0aW9uJykubGVuZ3RoKSB7XG4gICAgICAgIGlmIChzY3RwLmxlbmd0aClcbiAgICAgICAgICAgIHRtcC5wcm90byA9ICdEVExTL1NDVFAnO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICB0bXAucHJvdG8gPSAnUlRQL1NBVlBGJztcbiAgICB9IGVsc2Uge1xuICAgICAgICB0bXAucHJvdG8gPSAnUlRQL0FWUEYnO1xuICAgIH1cbiAgICBpZiAoIXNjdHAubGVuZ3RoKVxuICAgIHtcbiAgICAgICAgdG1wLmZtdCA9IGRlc2MuZmluZCgncGF5bG9hZC10eXBlJykubWFwKFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ2lkJyk7IH0pLmdldCgpO1xuICAgICAgICBtZWRpYSArPSBTRFBVdGlsLmJ1aWxkX21saW5lKHRtcCkgKyAnXFxyXFxuJztcbiAgICB9XG4gICAgZWxzZVxuICAgIHtcbiAgICAgICAgbWVkaWEgKz0gJ209YXBwbGljYXRpb24gMSBEVExTL1NDVFAgJyArIHNjdHAuYXR0cignbnVtYmVyJykgKyAnXFxyXFxuJztcbiAgICAgICAgbWVkaWEgKz0gJ2E9c2N0cG1hcDonICsgc2N0cC5hdHRyKCdudW1iZXInKSArXG4gICAgICAgICAgICAnICcgKyBzY3RwLmF0dHIoJ3Byb3RvY29sJyk7XG5cbiAgICAgICAgdmFyIHN0cmVhbUNvdW50ID0gc2N0cC5hdHRyKCdzdHJlYW1zJyk7XG4gICAgICAgIGlmIChzdHJlYW1Db3VudClcbiAgICAgICAgICAgIG1lZGlhICs9ICcgJyArIHN0cmVhbUNvdW50ICsgJ1xcclxcbic7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIG1lZGlhICs9ICdcXHJcXG4nO1xuICAgIH1cblxuICAgIG1lZGlhICs9ICdjPUlOIElQNCAwLjAuMC4wXFxyXFxuJztcbiAgICBpZiAoIXNjdHAubGVuZ3RoKVxuICAgICAgICBtZWRpYSArPSAnYT1ydGNwOjEgSU4gSVA0IDAuMC4wLjBcXHJcXG4nO1xuICAgIHRtcCA9IGNvbnRlbnQuZmluZCgnPnRyYW5zcG9ydFt4bWxucz1cInVybjp4bXBwOmppbmdsZTp0cmFuc3BvcnRzOmljZS11ZHA6MVwiXScpO1xuICAgIGlmICh0bXAubGVuZ3RoKSB7XG4gICAgICAgIGlmICh0bXAuYXR0cigndWZyYWcnKSkge1xuICAgICAgICAgICAgbWVkaWEgKz0gU0RQVXRpbC5idWlsZF9pY2V1ZnJhZyh0bXAuYXR0cigndWZyYWcnKSkgKyAnXFxyXFxuJztcbiAgICAgICAgfVxuICAgICAgICBpZiAodG1wLmF0dHIoJ3B3ZCcpKSB7XG4gICAgICAgICAgICBtZWRpYSArPSBTRFBVdGlsLmJ1aWxkX2ljZXB3ZCh0bXAuYXR0cigncHdkJykpICsgJ1xcclxcbic7XG4gICAgICAgIH1cbiAgICAgICAgdG1wLmZpbmQoJz5maW5nZXJwcmludCcpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gRklYTUU6IGNoZWNrIG5hbWVzcGFjZSBhdCBzb21lIHBvaW50XG4gICAgICAgICAgICBtZWRpYSArPSAnYT1maW5nZXJwcmludDonICsgdGhpcy5nZXRBdHRyaWJ1dGUoJ2hhc2gnKTtcbiAgICAgICAgICAgIG1lZGlhICs9ICcgJyArICQodGhpcykudGV4dCgpO1xuICAgICAgICAgICAgbWVkaWEgKz0gJ1xcclxcbic7XG4gICAgICAgICAgICBpZiAodGhpcy5nZXRBdHRyaWJ1dGUoJ3NldHVwJykpIHtcbiAgICAgICAgICAgICAgICBtZWRpYSArPSAnYT1zZXR1cDonICsgdGhpcy5nZXRBdHRyaWJ1dGUoJ3NldHVwJykgKyAnXFxyXFxuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHN3aXRjaCAoY29udGVudC5hdHRyKCdzZW5kZXJzJykpIHtcbiAgICAgICAgY2FzZSAnaW5pdGlhdG9yJzpcbiAgICAgICAgICAgIG1lZGlhICs9ICdhPXNlbmRvbmx5XFxyXFxuJztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdyZXNwb25kZXInOlxuICAgICAgICAgICAgbWVkaWEgKz0gJ2E9cmVjdm9ubHlcXHJcXG4nO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ25vbmUnOlxuICAgICAgICAgICAgbWVkaWEgKz0gJ2E9aW5hY3RpdmVcXHJcXG4nO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2JvdGgnOlxuICAgICAgICAgICAgbWVkaWEgKz0gJ2E9c2VuZHJlY3ZcXHJcXG4nO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIG1lZGlhICs9ICdhPW1pZDonICsgY29udGVudC5hdHRyKCduYW1lJykgKyAnXFxyXFxuJztcblxuICAgIC8vIDxkZXNjcmlwdGlvbj48cnRjcC1tdXgvPjwvZGVzY3JpcHRpb24+XG4gICAgLy8gc2VlIGh0dHA6Ly9jb2RlLmdvb2dsZS5jb20vcC9saWJqaW5nbGUvaXNzdWVzL2RldGFpbD9pZD0zMDkgLS0gbm8gc3BlYyB0aG91Z2hcbiAgICAvLyBhbmQgaHR0cDovL21haWwuamFiYmVyLm9yZy9waXBlcm1haWwvamluZ2xlLzIwMTEtRGVjZW1iZXIvMDAxNzYxLmh0bWxcbiAgICBpZiAoZGVzYy5maW5kKCdydGNwLW11eCcpLmxlbmd0aCkge1xuICAgICAgICBtZWRpYSArPSAnYT1ydGNwLW11eFxcclxcbic7XG4gICAgfVxuXG4gICAgaWYgKGRlc2MuZmluZCgnZW5jcnlwdGlvbicpLmxlbmd0aCkge1xuICAgICAgICBkZXNjLmZpbmQoJ2VuY3J5cHRpb24+Y3J5cHRvJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBtZWRpYSArPSAnYT1jcnlwdG86JyArIHRoaXMuZ2V0QXR0cmlidXRlKCd0YWcnKTtcbiAgICAgICAgICAgIG1lZGlhICs9ICcgJyArIHRoaXMuZ2V0QXR0cmlidXRlKCdjcnlwdG8tc3VpdGUnKTtcbiAgICAgICAgICAgIG1lZGlhICs9ICcgJyArIHRoaXMuZ2V0QXR0cmlidXRlKCdrZXktcGFyYW1zJyk7XG4gICAgICAgICAgICBpZiAodGhpcy5nZXRBdHRyaWJ1dGUoJ3Nlc3Npb24tcGFyYW1zJykpIHtcbiAgICAgICAgICAgICAgICBtZWRpYSArPSAnICcgKyB0aGlzLmdldEF0dHJpYnV0ZSgnc2Vzc2lvbi1wYXJhbXMnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1lZGlhICs9ICdcXHJcXG4nO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZGVzYy5maW5kKCdwYXlsb2FkLXR5cGUnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbWVkaWEgKz0gU0RQVXRpbC5idWlsZF9ydHBtYXAodGhpcykgKyAnXFxyXFxuJztcbiAgICAgICAgaWYgKCQodGhpcykuZmluZCgnPnBhcmFtZXRlcicpLmxlbmd0aCkge1xuICAgICAgICAgICAgbWVkaWEgKz0gJ2E9Zm10cDonICsgdGhpcy5nZXRBdHRyaWJ1dGUoJ2lkJykgKyAnICc7XG4gICAgICAgICAgICBtZWRpYSArPSAkKHRoaXMpLmZpbmQoJ3BhcmFtZXRlcicpLm1hcChmdW5jdGlvbiAoKSB7IHJldHVybiAodGhpcy5nZXRBdHRyaWJ1dGUoJ25hbWUnKSA/ICh0aGlzLmdldEF0dHJpYnV0ZSgnbmFtZScpICsgJz0nKSA6ICcnKSArIHRoaXMuZ2V0QXR0cmlidXRlKCd2YWx1ZScpOyB9KS5nZXQoKS5qb2luKCc7Jyk7XG4gICAgICAgICAgICBtZWRpYSArPSAnXFxyXFxuJztcbiAgICAgICAgfVxuICAgICAgICAvLyB4ZXAtMDI5M1xuICAgICAgICBtZWRpYSArPSBzZWxmLlJ0Y3BGYkZyb21KaW5nbGUoJCh0aGlzKSwgdGhpcy5nZXRBdHRyaWJ1dGUoJ2lkJykpO1xuICAgIH0pO1xuXG4gICAgLy8geGVwLTAyOTNcbiAgICBtZWRpYSArPSBzZWxmLlJ0Y3BGYkZyb21KaW5nbGUoZGVzYywgJyonKTtcblxuICAgIC8vIHhlcC0wMjk0XG4gICAgdG1wID0gZGVzYy5maW5kKCc+cnRwLWhkcmV4dFt4bWxucz1cInVybjp4bXBwOmppbmdsZTphcHBzOnJ0cDpydHAtaGRyZXh0OjBcIl0nKTtcbiAgICB0bXAuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIG1lZGlhICs9ICdhPWV4dG1hcDonICsgdGhpcy5nZXRBdHRyaWJ1dGUoJ2lkJykgKyAnICcgKyB0aGlzLmdldEF0dHJpYnV0ZSgndXJpJykgKyAnXFxyXFxuJztcbiAgICB9KTtcblxuICAgIGNvbnRlbnQuZmluZCgnPnRyYW5zcG9ydFt4bWxucz1cInVybjp4bXBwOmppbmdsZTp0cmFuc3BvcnRzOmljZS11ZHA6MVwiXT5jYW5kaWRhdGUnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbWVkaWEgKz0gU0RQVXRpbC5jYW5kaWRhdGVGcm9tSmluZ2xlKHRoaXMpO1xuICAgIH0pO1xuXG4gICAgLy8gWEVQLTAzMzkgaGFuZGxlIHNzcmMtZ3JvdXAgYXR0cmlidXRlc1xuICAgIHRtcCA9IGNvbnRlbnQuZmluZCgnZGVzY3JpcHRpb24+c3NyYy1ncm91cFt4bWxucz1cInVybjp4bXBwOmppbmdsZTphcHBzOnJ0cDpzc21hOjBcIl0nKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc2VtYW50aWNzID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ3NlbWFudGljcycpO1xuICAgICAgICB2YXIgc3NyY3MgPSAkKHRoaXMpLmZpbmQoJz5zb3VyY2UnKS5tYXAoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3NzcmMnKTtcbiAgICAgICAgfSkuZ2V0KCk7XG5cbiAgICAgICAgaWYgKHNzcmNzLmxlbmd0aCAhPSAwKSB7XG4gICAgICAgICAgICBtZWRpYSArPSAnYT1zc3JjLWdyb3VwOicgKyBzZW1hbnRpY3MgKyAnICcgKyBzc3Jjcy5qb2luKCcgJykgKyAnXFxyXFxuJztcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdG1wID0gY29udGVudC5maW5kKCdkZXNjcmlwdGlvbj5zb3VyY2VbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6c3NtYTowXCJdJyk7XG4gICAgdG1wLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgc3NyYyA9IHRoaXMuZ2V0QXR0cmlidXRlKCdzc3JjJyk7XG4gICAgICAgICQodGhpcykuZmluZCgnPnBhcmFtZXRlcicpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgbWVkaWEgKz0gJ2E9c3NyYzonICsgc3NyYyArICcgJyArIHRoaXMuZ2V0QXR0cmlidXRlKCduYW1lJyk7XG4gICAgICAgICAgICBpZiAodGhpcy5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJykgJiYgdGhpcy5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJykubGVuZ3RoKVxuICAgICAgICAgICAgICAgIG1lZGlhICs9ICc6JyArIHRoaXMuZ2V0QXR0cmlidXRlKCd2YWx1ZScpO1xuICAgICAgICAgICAgbWVkaWEgKz0gJ1xcclxcbic7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgaWYgKHRtcC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8gZmFsbGJhY2sgdG8gcHJvcHJpZXRhcnkgbWFwcGluZyBvZiBhPXNzcmMgbGluZXNcbiAgICAgICAgdG1wID0gY29udGVudC5maW5kKCdkZXNjcmlwdGlvbj5zc3JjW3htbG5zPVwiaHR0cDovL2VzdG9zLmRlL25zL3NzcmNcIl0nKTtcbiAgICAgICAgaWYgKHRtcC5sZW5ndGgpIHtcbiAgICAgICAgICAgIG1lZGlhICs9ICdhPXNzcmM6JyArIHNzcmMgKyAnIGNuYW1lOicgKyB0bXAuYXR0cignY25hbWUnKSArICdcXHJcXG4nO1xuICAgICAgICAgICAgbWVkaWEgKz0gJ2E9c3NyYzonICsgc3NyYyArICcgbXNpZDonICsgdG1wLmF0dHIoJ21zaWQnKSArICdcXHJcXG4nO1xuICAgICAgICAgICAgbWVkaWEgKz0gJ2E9c3NyYzonICsgc3NyYyArICcgbXNsYWJlbDonICsgdG1wLmF0dHIoJ21zbGFiZWwnKSArICdcXHJcXG4nO1xuICAgICAgICAgICAgbWVkaWEgKz0gJ2E9c3NyYzonICsgc3NyYyArICcgbGFiZWw6JyArIHRtcC5hdHRyKCdsYWJlbCcpICsgJ1xcclxcbic7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1lZGlhO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTRFA7XG4iLCIvKipcbiAqIENvbnRhaW5zIHV0aWxpdHkgY2xhc3NlcyB1c2VkIGluIFNEUCBjbGFzcy5cbiAqXG4gKi9cblxuU0RQVXRpbCA9IHtcbiAgICBpY2VwYXJhbXM6IGZ1bmN0aW9uIChtZWRpYWRlc2MsIHNlc3Npb25kZXNjKSB7XG4gICAgICAgIHZhciBkYXRhID0gbnVsbDtcbiAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKG1lZGlhZGVzYywgJ2E9aWNlLXVmcmFnOicsIHNlc3Npb25kZXNjKSAmJlxuICAgICAgICAgICAgU0RQVXRpbC5maW5kX2xpbmUobWVkaWFkZXNjLCAnYT1pY2UtcHdkOicsIHNlc3Npb25kZXNjKSkge1xuICAgICAgICAgICAgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICB1ZnJhZzogU0RQVXRpbC5wYXJzZV9pY2V1ZnJhZyhTRFBVdGlsLmZpbmRfbGluZShtZWRpYWRlc2MsICdhPWljZS11ZnJhZzonLCBzZXNzaW9uZGVzYykpLFxuICAgICAgICAgICAgICAgIHB3ZDogU0RQVXRpbC5wYXJzZV9pY2Vwd2QoU0RQVXRpbC5maW5kX2xpbmUobWVkaWFkZXNjLCAnYT1pY2UtcHdkOicsIHNlc3Npb25kZXNjKSlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSxcbiAgICBwYXJzZV9pY2V1ZnJhZzogZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgcmV0dXJuIGxpbmUuc3Vic3RyaW5nKDEyKTtcbiAgICB9LFxuICAgIGJ1aWxkX2ljZXVmcmFnOiBmdW5jdGlvbiAoZnJhZykge1xuICAgICAgICByZXR1cm4gJ2E9aWNlLXVmcmFnOicgKyBmcmFnO1xuICAgIH0sXG4gICAgcGFyc2VfaWNlcHdkOiBmdW5jdGlvbiAobGluZSkge1xuICAgICAgICByZXR1cm4gbGluZS5zdWJzdHJpbmcoMTApO1xuICAgIH0sXG4gICAgYnVpbGRfaWNlcHdkOiBmdW5jdGlvbiAocHdkKSB7XG4gICAgICAgIHJldHVybiAnYT1pY2UtcHdkOicgKyBwd2Q7XG4gICAgfSxcbiAgICBwYXJzZV9taWQ6IGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgIHJldHVybiBsaW5lLnN1YnN0cmluZyg2KTtcbiAgICB9LFxuICAgIHBhcnNlX21saW5lOiBmdW5jdGlvbiAobGluZSkge1xuICAgICAgICB2YXIgcGFydHMgPSBsaW5lLnN1YnN0cmluZygyKS5zcGxpdCgnICcpLFxuICAgICAgICAgICAgZGF0YSA9IHt9O1xuICAgICAgICBkYXRhLm1lZGlhID0gcGFydHMuc2hpZnQoKTtcbiAgICAgICAgZGF0YS5wb3J0ID0gcGFydHMuc2hpZnQoKTtcbiAgICAgICAgZGF0YS5wcm90byA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICAgIGlmIChwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXSA9PT0gJycpIHsgLy8gdHJhaWxpbmcgd2hpdGVzcGFjZVxuICAgICAgICAgICAgcGFydHMucG9wKCk7XG4gICAgICAgIH1cbiAgICAgICAgZGF0YS5mbXQgPSBwYXJ0cztcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSxcbiAgICBidWlsZF9tbGluZTogZnVuY3Rpb24gKG1saW5lKSB7XG4gICAgICAgIHJldHVybiAnbT0nICsgbWxpbmUubWVkaWEgKyAnICcgKyBtbGluZS5wb3J0ICsgJyAnICsgbWxpbmUucHJvdG8gKyAnICcgKyBtbGluZS5mbXQuam9pbignICcpO1xuICAgIH0sXG4gICAgcGFyc2VfcnRwbWFwOiBmdW5jdGlvbiAobGluZSkge1xuICAgICAgICB2YXIgcGFydHMgPSBsaW5lLnN1YnN0cmluZyg5KS5zcGxpdCgnICcpLFxuICAgICAgICAgICAgZGF0YSA9IHt9O1xuICAgICAgICBkYXRhLmlkID0gcGFydHMuc2hpZnQoKTtcbiAgICAgICAgcGFydHMgPSBwYXJ0c1swXS5zcGxpdCgnLycpO1xuICAgICAgICBkYXRhLm5hbWUgPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAgICBkYXRhLmNsb2NrcmF0ZSA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICAgIGRhdGEuY2hhbm5lbHMgPSBwYXJ0cy5sZW5ndGggPyBwYXJ0cy5zaGlmdCgpIDogJzEnO1xuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFBhcnNlcyBTRFAgbGluZSBcImE9c2N0cG1hcDouLi5cIiBhbmQgZXh0cmFjdHMgU0NUUCBwb3J0IGZyb20gaXQuXG4gICAgICogQHBhcmFtIGxpbmUgZWcuIFwiYT1zY3RwbWFwOjUwMDAgd2VicnRjLWRhdGFjaGFubmVsXCJcbiAgICAgKiBAcmV0dXJucyBbU0NUUCBwb3J0IG51bWJlciwgcHJvdG9jb2wsIHN0cmVhbXNdXG4gICAgICovXG4gICAgcGFyc2Vfc2N0cG1hcDogZnVuY3Rpb24gKGxpbmUpXG4gICAge1xuICAgICAgICB2YXIgcGFydHMgPSBsaW5lLnN1YnN0cmluZygxMCkuc3BsaXQoJyAnKTtcbiAgICAgICAgdmFyIHNjdHBQb3J0ID0gcGFydHNbMF07XG4gICAgICAgIHZhciBwcm90b2NvbCA9IHBhcnRzWzFdO1xuICAgICAgICAvLyBTdHJlYW0gY291bnQgaXMgb3B0aW9uYWxcbiAgICAgICAgdmFyIHN0cmVhbUNvdW50ID0gcGFydHMubGVuZ3RoID4gMiA/IHBhcnRzWzJdIDogbnVsbDtcbiAgICAgICAgcmV0dXJuIFtzY3RwUG9ydCwgcHJvdG9jb2wsIHN0cmVhbUNvdW50XTsvLyBTQ1RQIHBvcnRcbiAgICB9LFxuICAgIGJ1aWxkX3J0cG1hcDogZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgIHZhciBsaW5lID0gJ2E9cnRwbWFwOicgKyBlbC5nZXRBdHRyaWJ1dGUoJ2lkJykgKyAnICcgKyBlbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKSArICcvJyArIGVsLmdldEF0dHJpYnV0ZSgnY2xvY2tyYXRlJyk7XG4gICAgICAgIGlmIChlbC5nZXRBdHRyaWJ1dGUoJ2NoYW5uZWxzJykgJiYgZWwuZ2V0QXR0cmlidXRlKCdjaGFubmVscycpICE9ICcxJykge1xuICAgICAgICAgICAgbGluZSArPSAnLycgKyBlbC5nZXRBdHRyaWJ1dGUoJ2NoYW5uZWxzJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxpbmU7XG4gICAgfSxcbiAgICBwYXJzZV9jcnlwdG86IGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgIHZhciBwYXJ0cyA9IGxpbmUuc3Vic3RyaW5nKDkpLnNwbGl0KCcgJyksXG4gICAgICAgICAgICBkYXRhID0ge307XG4gICAgICAgIGRhdGEudGFnID0gcGFydHMuc2hpZnQoKTtcbiAgICAgICAgZGF0YVsnY3J5cHRvLXN1aXRlJ10gPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAgICBkYXRhWydrZXktcGFyYW1zJ10gPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAgICBpZiAocGFydHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBkYXRhWydzZXNzaW9uLXBhcmFtcyddID0gcGFydHMuam9pbignICcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH0sXG4gICAgcGFyc2VfZmluZ2VycHJpbnQ6IGZ1bmN0aW9uIChsaW5lKSB7IC8vIFJGQyA0NTcyXG4gICAgICAgIHZhciBwYXJ0cyA9IGxpbmUuc3Vic3RyaW5nKDE0KS5zcGxpdCgnICcpLFxuICAgICAgICAgICAgZGF0YSA9IHt9O1xuICAgICAgICBkYXRhLmhhc2ggPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAgICBkYXRhLmZpbmdlcnByaW50ID0gcGFydHMuc2hpZnQoKTtcbiAgICAgICAgLy8gVE9ETyBhc3NlcnQgdGhhdCBmaW5nZXJwcmludCBzYXRpc2ZpZXMgMlVIRVggKihcIjpcIiAyVUhFWCkgP1xuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9LFxuICAgIHBhcnNlX2ZtdHA6IGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgIHZhciBwYXJ0cyA9IGxpbmUuc3BsaXQoJyAnKSxcbiAgICAgICAgICAgIGksIGtleSwgdmFsdWUsXG4gICAgICAgICAgICBkYXRhID0gW107XG4gICAgICAgIHBhcnRzLnNoaWZ0KCk7XG4gICAgICAgIHBhcnRzID0gcGFydHMuam9pbignICcpLnNwbGl0KCc7Jyk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAga2V5ID0gcGFydHNbaV0uc3BsaXQoJz0nKVswXTtcbiAgICAgICAgICAgIHdoaWxlIChrZXkubGVuZ3RoICYmIGtleVswXSA9PSAnICcpIHtcbiAgICAgICAgICAgICAgICBrZXkgPSBrZXkuc3Vic3RyaW5nKDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFsdWUgPSBwYXJ0c1tpXS5zcGxpdCgnPScpWzFdO1xuICAgICAgICAgICAgaWYgKGtleSAmJiB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGRhdGEucHVzaCh7bmFtZToga2V5LCB2YWx1ZTogdmFsdWV9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgLy8gcmZjIDQ3MzMgKERUTUYpIHN0eWxlIHN0dWZmXG4gICAgICAgICAgICAgICAgZGF0YS5wdXNoKHtuYW1lOiAnJywgdmFsdWU6IGtleX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH0sXG4gICAgcGFyc2VfaWNlY2FuZGlkYXRlOiBmdW5jdGlvbiAobGluZSkge1xuICAgICAgICB2YXIgY2FuZGlkYXRlID0ge30sXG4gICAgICAgICAgICBlbGVtcyA9IGxpbmUuc3BsaXQoJyAnKTtcbiAgICAgICAgY2FuZGlkYXRlLmZvdW5kYXRpb24gPSBlbGVtc1swXS5zdWJzdHJpbmcoMTIpO1xuICAgICAgICBjYW5kaWRhdGUuY29tcG9uZW50ID0gZWxlbXNbMV07XG4gICAgICAgIGNhbmRpZGF0ZS5wcm90b2NvbCA9IGVsZW1zWzJdLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGNhbmRpZGF0ZS5wcmlvcml0eSA9IGVsZW1zWzNdO1xuICAgICAgICBjYW5kaWRhdGUuaXAgPSBlbGVtc1s0XTtcbiAgICAgICAgY2FuZGlkYXRlLnBvcnQgPSBlbGVtc1s1XTtcbiAgICAgICAgLy8gZWxlbXNbNl0gPT4gXCJ0eXBcIlxuICAgICAgICBjYW5kaWRhdGUudHlwZSA9IGVsZW1zWzddO1xuICAgICAgICBjYW5kaWRhdGUuZ2VuZXJhdGlvbiA9IDA7IC8vIGRlZmF1bHQgdmFsdWUsIG1heSBiZSBvdmVyd3JpdHRlbiBiZWxvd1xuICAgICAgICBmb3IgKHZhciBpID0gODsgaSA8IGVsZW1zLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKGVsZW1zW2ldKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAncmFkZHInOlxuICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGVbJ3JlbC1hZGRyJ10gPSBlbGVtc1tpICsgMV07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Jwb3J0JzpcbiAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlWydyZWwtcG9ydCddID0gZWxlbXNbaSArIDFdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdnZW5lcmF0aW9uJzpcbiAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlLmdlbmVyYXRpb24gPSBlbGVtc1tpICsgMV07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3RjcHR5cGUnOlxuICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGUudGNwdHlwZSA9IGVsZW1zW2kgKyAxXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDogLy8gVE9ET1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncGFyc2VfaWNlY2FuZGlkYXRlIG5vdCB0cmFuc2xhdGluZyBcIicgKyBlbGVtc1tpXSArICdcIiA9IFwiJyArIGVsZW1zW2kgKyAxXSArICdcIicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNhbmRpZGF0ZS5uZXR3b3JrID0gJzEnO1xuICAgICAgICBjYW5kaWRhdGUuaWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgMTApOyAvLyBub3QgYXBwbGljYWJsZSB0byBTRFAgLS0gRklYTUU6IHNob3VsZCBiZSB1bmlxdWUsIG5vdCBqdXN0IHJhbmRvbVxuICAgICAgICByZXR1cm4gY2FuZGlkYXRlO1xuICAgIH0sXG4gICAgYnVpbGRfaWNlY2FuZGlkYXRlOiBmdW5jdGlvbiAoY2FuZCkge1xuICAgICAgICB2YXIgbGluZSA9IFsnYT1jYW5kaWRhdGU6JyArIGNhbmQuZm91bmRhdGlvbiwgY2FuZC5jb21wb25lbnQsIGNhbmQucHJvdG9jb2wsIGNhbmQucHJpb3JpdHksIGNhbmQuaXAsIGNhbmQucG9ydCwgJ3R5cCcsIGNhbmQudHlwZV0uam9pbignICcpO1xuICAgICAgICBsaW5lICs9ICcgJztcbiAgICAgICAgc3dpdGNoIChjYW5kLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ3NyZmx4JzpcbiAgICAgICAgICAgIGNhc2UgJ3ByZmx4JzpcbiAgICAgICAgICAgIGNhc2UgJ3JlbGF5JzpcbiAgICAgICAgICAgICAgICBpZiAoY2FuZC5oYXNPd25BdHRyaWJ1dGUoJ3JlbC1hZGRyJykgJiYgY2FuZC5oYXNPd25BdHRyaWJ1dGUoJ3JlbC1wb3J0JykpIHtcbiAgICAgICAgICAgICAgICAgICAgbGluZSArPSAncmFkZHInO1xuICAgICAgICAgICAgICAgICAgICBsaW5lICs9ICcgJztcbiAgICAgICAgICAgICAgICAgICAgbGluZSArPSBjYW5kWydyZWwtYWRkciddO1xuICAgICAgICAgICAgICAgICAgICBsaW5lICs9ICcgJztcbiAgICAgICAgICAgICAgICAgICAgbGluZSArPSAncnBvcnQnO1xuICAgICAgICAgICAgICAgICAgICBsaW5lICs9ICcgJztcbiAgICAgICAgICAgICAgICAgICAgbGluZSArPSBjYW5kWydyZWwtcG9ydCddO1xuICAgICAgICAgICAgICAgICAgICBsaW5lICs9ICcgJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNhbmQuaGFzT3duQXR0cmlidXRlKCd0Y3B0eXBlJykpIHtcbiAgICAgICAgICAgIGxpbmUgKz0gJ3RjcHR5cGUnO1xuICAgICAgICAgICAgbGluZSArPSAnICc7XG4gICAgICAgICAgICBsaW5lICs9IGNhbmQudGNwdHlwZTtcbiAgICAgICAgICAgIGxpbmUgKz0gJyAnO1xuICAgICAgICB9XG4gICAgICAgIGxpbmUgKz0gJ2dlbmVyYXRpb24nO1xuICAgICAgICBsaW5lICs9ICcgJztcbiAgICAgICAgbGluZSArPSBjYW5kLmhhc093bkF0dHJpYnV0ZSgnZ2VuZXJhdGlvbicpID8gY2FuZC5nZW5lcmF0aW9uIDogJzAnO1xuICAgICAgICByZXR1cm4gbGluZTtcbiAgICB9LFxuICAgIHBhcnNlX3NzcmM6IGZ1bmN0aW9uIChkZXNjKSB7XG4gICAgICAgIC8vIHByb3ByaWV0YXJ5IG1hcHBpbmcgb2YgYT1zc3JjIGxpbmVzXG4gICAgICAgIC8vIFRPRE86IHNlZSBcIkppbmdsZSBSVFAgU291cmNlIERlc2NyaXB0aW9uXCIgYnkgSnViZXJ0aSBhbmQgUC4gVGhhdGNoZXIgb24gZ29vZ2xlIGRvY3NcbiAgICAgICAgLy8gYW5kIHBhcnNlIGFjY29yZGluZyB0byB0aGF0XG4gICAgICAgIHZhciBsaW5lcyA9IGRlc2Muc3BsaXQoJ1xcclxcbicpLFxuICAgICAgICAgICAgZGF0YSA9IHt9O1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAobGluZXNbaV0uc3Vic3RyaW5nKDAsIDcpID09ICdhPXNzcmM6Jykge1xuICAgICAgICAgICAgICAgIHZhciBpZHggPSBsaW5lc1tpXS5pbmRleE9mKCcgJyk7XG4gICAgICAgICAgICAgICAgZGF0YVtsaW5lc1tpXS5zdWJzdHIoaWR4ICsgMSkuc3BsaXQoJzonLCAyKVswXV0gPSBsaW5lc1tpXS5zdWJzdHIoaWR4ICsgMSkuc3BsaXQoJzonLCAyKVsxXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9LFxuICAgIHBhcnNlX3J0Y3BmYjogZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgdmFyIHBhcnRzID0gbGluZS5zdWJzdHIoMTApLnNwbGl0KCcgJyk7XG4gICAgICAgIHZhciBkYXRhID0ge307XG4gICAgICAgIGRhdGEucHQgPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAgICBkYXRhLnR5cGUgPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAgICBkYXRhLnBhcmFtcyA9IHBhcnRzO1xuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9LFxuICAgIHBhcnNlX2V4dG1hcDogZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgdmFyIHBhcnRzID0gbGluZS5zdWJzdHIoOSkuc3BsaXQoJyAnKTtcbiAgICAgICAgdmFyIGRhdGEgPSB7fTtcbiAgICAgICAgZGF0YS52YWx1ZSA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICAgIGlmIChkYXRhLnZhbHVlLmluZGV4T2YoJy8nKSAhPSAtMSkge1xuICAgICAgICAgICAgZGF0YS5kaXJlY3Rpb24gPSBkYXRhLnZhbHVlLnN1YnN0cihkYXRhLnZhbHVlLmluZGV4T2YoJy8nKSArIDEpO1xuICAgICAgICAgICAgZGF0YS52YWx1ZSA9IGRhdGEudmFsdWUuc3Vic3RyKDAsIGRhdGEudmFsdWUuaW5kZXhPZignLycpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRhdGEuZGlyZWN0aW9uID0gJ2JvdGgnO1xuICAgICAgICB9XG4gICAgICAgIGRhdGEudXJpID0gcGFydHMuc2hpZnQoKTtcbiAgICAgICAgZGF0YS5wYXJhbXMgPSBwYXJ0cztcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSxcbiAgICBmaW5kX2xpbmU6IGZ1bmN0aW9uIChoYXlzdGFjaywgbmVlZGxlLCBzZXNzaW9ucGFydCkge1xuICAgICAgICB2YXIgbGluZXMgPSBoYXlzdGFjay5zcGxpdCgnXFxyXFxuJyk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChsaW5lc1tpXS5zdWJzdHJpbmcoMCwgbmVlZGxlLmxlbmd0aCkgPT0gbmVlZGxlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpbmVzW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghc2Vzc2lvbnBhcnQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBzZWFyY2ggc2Vzc2lvbiBwYXJ0XG4gICAgICAgIGxpbmVzID0gc2Vzc2lvbnBhcnQuc3BsaXQoJ1xcclxcbicpO1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGxpbmVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBpZiAobGluZXNbal0uc3Vic3RyaW5nKDAsIG5lZWRsZS5sZW5ndGgpID09IG5lZWRsZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaW5lc1tqXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcbiAgICBmaW5kX2xpbmVzOiBmdW5jdGlvbiAoaGF5c3RhY2ssIG5lZWRsZSwgc2Vzc2lvbnBhcnQpIHtcbiAgICAgICAgdmFyIGxpbmVzID0gaGF5c3RhY2suc3BsaXQoJ1xcclxcbicpLFxuICAgICAgICAgICAgbmVlZGxlcyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAobGluZXNbaV0uc3Vic3RyaW5nKDAsIG5lZWRsZS5sZW5ndGgpID09IG5lZWRsZSlcbiAgICAgICAgICAgICAgICBuZWVkbGVzLnB1c2gobGluZXNbaV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChuZWVkbGVzLmxlbmd0aCB8fCAhc2Vzc2lvbnBhcnQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZWVkbGVzO1xuICAgICAgICB9XG4gICAgICAgIC8vIHNlYXJjaCBzZXNzaW9uIHBhcnRcbiAgICAgICAgbGluZXMgPSBzZXNzaW9ucGFydC5zcGxpdCgnXFxyXFxuJyk7XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbGluZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIGlmIChsaW5lc1tqXS5zdWJzdHJpbmcoMCwgbmVlZGxlLmxlbmd0aCkgPT0gbmVlZGxlKSB7XG4gICAgICAgICAgICAgICAgbmVlZGxlcy5wdXNoKGxpbmVzW2pdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmVlZGxlcztcbiAgICB9LFxuICAgIGNhbmRpZGF0ZVRvSmluZ2xlOiBmdW5jdGlvbiAobGluZSkge1xuICAgICAgICAvLyBhPWNhbmRpZGF0ZToyOTc5MTY2NjYyIDEgdWRwIDIxMTM5MzcxNTEgMTkyLjE2OC4yLjEwMCA1NzY5OCB0eXAgaG9zdCBnZW5lcmF0aW9uIDBcbiAgICAgICAgLy8gICAgICA8Y2FuZGlkYXRlIGNvbXBvbmVudD0uLi4gZm91bmRhdGlvbj0uLi4gZ2VuZXJhdGlvbj0uLi4gaWQ9Li4uIGlwPS4uLiBuZXR3b3JrPS4uLiBwb3J0PS4uLiBwcmlvcml0eT0uLi4gcHJvdG9jb2w9Li4uIHR5cGU9Li4uLz5cbiAgICAgICAgaWYgKGxpbmUuaW5kZXhPZignY2FuZGlkYXRlOicpID09PSAwKSB7XG4gICAgICAgICAgICBsaW5lID0gJ2E9JyArIGxpbmU7XG4gICAgICAgIH0gZWxzZSBpZiAobGluZS5zdWJzdHJpbmcoMCwgMTIpICE9ICdhPWNhbmRpZGF0ZTonKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygncGFyc2VDYW5kaWRhdGUgY2FsbGVkIHdpdGggYSBsaW5lIHRoYXQgaXMgbm90IGEgY2FuZGlkYXRlIGxpbmUnKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGxpbmUpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxpbmUuc3Vic3RyaW5nKGxpbmUubGVuZ3RoIC0gMikgPT0gJ1xcclxcbicpIC8vIGNob21wIGl0XG4gICAgICAgICAgICBsaW5lID0gbGluZS5zdWJzdHJpbmcoMCwgbGluZS5sZW5ndGggLSAyKTtcbiAgICAgICAgdmFyIGNhbmRpZGF0ZSA9IHt9LFxuICAgICAgICAgICAgZWxlbXMgPSBsaW5lLnNwbGl0KCcgJyksXG4gICAgICAgICAgICBpO1xuICAgICAgICBpZiAoZWxlbXNbNl0gIT0gJ3R5cCcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkaWQgbm90IGZpbmQgdHlwIGluIHRoZSByaWdodCBwbGFjZScpO1xuICAgICAgICAgICAgY29uc29sZS5sb2cobGluZSk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBjYW5kaWRhdGUuZm91bmRhdGlvbiA9IGVsZW1zWzBdLnN1YnN0cmluZygxMik7XG4gICAgICAgIGNhbmRpZGF0ZS5jb21wb25lbnQgPSBlbGVtc1sxXTtcbiAgICAgICAgY2FuZGlkYXRlLnByb3RvY29sID0gZWxlbXNbMl0udG9Mb3dlckNhc2UoKTtcbiAgICAgICAgY2FuZGlkYXRlLnByaW9yaXR5ID0gZWxlbXNbM107XG4gICAgICAgIGNhbmRpZGF0ZS5pcCA9IGVsZW1zWzRdO1xuICAgICAgICBjYW5kaWRhdGUucG9ydCA9IGVsZW1zWzVdO1xuICAgICAgICAvLyBlbGVtc1s2XSA9PiBcInR5cFwiXG4gICAgICAgIGNhbmRpZGF0ZS50eXBlID0gZWxlbXNbN107XG5cbiAgICAgICAgY2FuZGlkYXRlLmdlbmVyYXRpb24gPSAnMCc7IC8vIGRlZmF1bHQsIG1heSBiZSBvdmVyd3JpdHRlbiBiZWxvd1xuICAgICAgICBmb3IgKGkgPSA4OyBpIDwgZWxlbXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoZWxlbXNbaV0pIHtcbiAgICAgICAgICAgICAgICBjYXNlICdyYWRkcic6XG4gICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZVsncmVsLWFkZHInXSA9IGVsZW1zW2kgKyAxXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAncnBvcnQnOlxuICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGVbJ3JlbC1wb3J0J10gPSBlbGVtc1tpICsgMV07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2dlbmVyYXRpb24nOlxuICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGUuZ2VuZXJhdGlvbiA9IGVsZW1zW2kgKyAxXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAndGNwdHlwZSc6XG4gICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZS50Y3B0eXBlID0gZWxlbXNbaSArIDFdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiAvLyBUT0RPXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdub3QgdHJhbnNsYXRpbmcgXCInICsgZWxlbXNbaV0gKyAnXCIgPSBcIicgKyBlbGVtc1tpICsgMV0gKyAnXCInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYW5kaWRhdGUubmV0d29yayA9ICcxJztcbiAgICAgICAgY2FuZGlkYXRlLmlkID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDEwKTsgLy8gbm90IGFwcGxpY2FibGUgdG8gU0RQIC0tIEZJWE1FOiBzaG91bGQgYmUgdW5pcXVlLCBub3QganVzdCByYW5kb21cbiAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICB9LFxuICAgIGNhbmRpZGF0ZUZyb21KaW5nbGU6IGZ1bmN0aW9uIChjYW5kKSB7XG4gICAgICAgIHZhciBsaW5lID0gJ2E9Y2FuZGlkYXRlOic7XG4gICAgICAgIGxpbmUgKz0gY2FuZC5nZXRBdHRyaWJ1dGUoJ2ZvdW5kYXRpb24nKTtcbiAgICAgICAgbGluZSArPSAnICc7XG4gICAgICAgIGxpbmUgKz0gY2FuZC5nZXRBdHRyaWJ1dGUoJ2NvbXBvbmVudCcpO1xuICAgICAgICBsaW5lICs9ICcgJztcbiAgICAgICAgbGluZSArPSBjYW5kLmdldEF0dHJpYnV0ZSgncHJvdG9jb2wnKTsgLy8udG9VcHBlckNhc2UoKTsgLy8gY2hyb21lIE0yMyBkb2Vzbid0IGxpa2UgdGhpc1xuICAgICAgICBsaW5lICs9ICcgJztcbiAgICAgICAgbGluZSArPSBjYW5kLmdldEF0dHJpYnV0ZSgncHJpb3JpdHknKTtcbiAgICAgICAgbGluZSArPSAnICc7XG4gICAgICAgIGxpbmUgKz0gY2FuZC5nZXRBdHRyaWJ1dGUoJ2lwJyk7XG4gICAgICAgIGxpbmUgKz0gJyAnO1xuICAgICAgICBsaW5lICs9IGNhbmQuZ2V0QXR0cmlidXRlKCdwb3J0Jyk7XG4gICAgICAgIGxpbmUgKz0gJyAnO1xuICAgICAgICBsaW5lICs9ICd0eXAnO1xuICAgICAgICBsaW5lICs9ICcgJyArIGNhbmQuZ2V0QXR0cmlidXRlKCd0eXBlJyk7XG4gICAgICAgIGxpbmUgKz0gJyAnO1xuICAgICAgICBzd2l0Y2ggKGNhbmQuZ2V0QXR0cmlidXRlKCd0eXBlJykpIHtcbiAgICAgICAgICAgIGNhc2UgJ3NyZmx4JzpcbiAgICAgICAgICAgIGNhc2UgJ3ByZmx4JzpcbiAgICAgICAgICAgIGNhc2UgJ3JlbGF5JzpcbiAgICAgICAgICAgICAgICBpZiAoY2FuZC5nZXRBdHRyaWJ1dGUoJ3JlbC1hZGRyJykgJiYgY2FuZC5nZXRBdHRyaWJ1dGUoJ3JlbC1wb3J0JykpIHtcbiAgICAgICAgICAgICAgICAgICAgbGluZSArPSAncmFkZHInO1xuICAgICAgICAgICAgICAgICAgICBsaW5lICs9ICcgJztcbiAgICAgICAgICAgICAgICAgICAgbGluZSArPSBjYW5kLmdldEF0dHJpYnV0ZSgncmVsLWFkZHInKTtcbiAgICAgICAgICAgICAgICAgICAgbGluZSArPSAnICc7XG4gICAgICAgICAgICAgICAgICAgIGxpbmUgKz0gJ3Jwb3J0JztcbiAgICAgICAgICAgICAgICAgICAgbGluZSArPSAnICc7XG4gICAgICAgICAgICAgICAgICAgIGxpbmUgKz0gY2FuZC5nZXRBdHRyaWJ1dGUoJ3JlbC1wb3J0Jyk7XG4gICAgICAgICAgICAgICAgICAgIGxpbmUgKz0gJyAnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBsaW5lICs9ICdnZW5lcmF0aW9uJztcbiAgICAgICAgbGluZSArPSAnICc7XG4gICAgICAgIGxpbmUgKz0gY2FuZC5nZXRBdHRyaWJ1dGUoJ2dlbmVyYXRpb24nKSB8fCAnMCc7XG4gICAgICAgIHJldHVybiBsaW5lICsgJ1xcclxcbic7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTRFBVdGlsO1xuXG4iLCIvKiBqc2hpbnQgLVcxMTcgKi9cbi8vIEppbmdsZSBzdHVmZlxudmFyIFNlc3Npb25CYXNlID0gcmVxdWlyZShcIi4vc3Ryb3BoZS5qaW5nbGUuc2Vzc2lvbmJhc2VcIik7XG52YXIgVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24gPSByZXF1aXJlKFwiLi9zdHJvcGhlLmppbmdsZS5hZGFwdGVyXCIpO1xudmFyIFNEUCA9IHJlcXVpcmUoXCIuL3N0cm9waGUuamluZ2xlLnNkcFwiKTtcblxuSmluZ2xlU2Vzc2lvbi5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNlc3Npb25CYXNlLnByb3RvdHlwZSk7XG5mdW5jdGlvbiBKaW5nbGVTZXNzaW9uKG1lLCBzaWQsIGNvbm5lY3Rpb24pIHtcblxuICAgIFNlc3Npb25CYXNlLmNhbGwodGhpcywgY29ubmVjdGlvbiwgc2lkKTtcblxuICAgIHRoaXMubWUgPSBtZTtcbiAgICB0aGlzLmluaXRpYXRvciA9IG51bGw7XG4gICAgdGhpcy5yZXNwb25kZXIgPSBudWxsO1xuICAgIHRoaXMuaXNJbml0aWF0b3IgPSBudWxsO1xuICAgIHRoaXMucGVlcmppZCA9IG51bGw7XG4gICAgdGhpcy5zdGF0ZSA9IG51bGw7XG4gICAgdGhpcy5sb2NhbFNEUCA9IG51bGw7XG4gICAgdGhpcy5yZW1vdGVTRFAgPSBudWxsO1xuICAgIHRoaXMubG9jYWxTdHJlYW1zID0gW107XG4gICAgdGhpcy5yZWxheWVkU3RyZWFtcyA9IFtdO1xuICAgIHRoaXMucmVtb3RlU3RyZWFtcyA9IFtdO1xuICAgIHRoaXMuc3RhcnRUaW1lID0gbnVsbDtcbiAgICB0aGlzLnN0b3BUaW1lID0gbnVsbDtcbiAgICB0aGlzLm1lZGlhX2NvbnN0cmFpbnRzID0gbnVsbDtcbiAgICB0aGlzLnBjX2NvbnN0cmFpbnRzID0gbnVsbDtcbiAgICB0aGlzLmljZV9jb25maWcgPSB7fTtcbiAgICB0aGlzLmRyaXBfY29udGFpbmVyID0gW107XG5cbiAgICB0aGlzLnVzZXRyaWNrbGUgPSB0cnVlO1xuICAgIHRoaXMudXNlcHJhbnN3ZXIgPSBmYWxzZTsgLy8gZWFybHkgdHJhbnNwb3J0IHdhcm11cCAtLSBtaW5kIHlvdSwgdGhpcyBtaWdodCBmYWlsLiBkZXBlbmRzIG9uIHdlYnJ0YyBpc3N1ZSAxNzE4XG4gICAgdGhpcy51c2VkcmlwID0gZmFsc2U7IC8vIGRyaXBwaW5nIGlzIHNlbmRpbmcgdHJpY2tsZSBjYW5kaWRhdGVzIG5vdCBvbmUtYnktb25lXG5cbiAgICB0aGlzLmhhZHN0dW5jYW5kaWRhdGUgPSBmYWxzZTtcbiAgICB0aGlzLmhhZHR1cm5jYW5kaWRhdGUgPSBmYWxzZTtcbiAgICB0aGlzLmxhc3RpY2VjYW5kaWRhdGUgPSBmYWxzZTtcblxuICAgIHRoaXMuc3RhdHNpbnRlcnZhbCA9IG51bGw7XG5cbiAgICB0aGlzLnJlYXNvbiA9IG51bGw7XG5cbiAgICB0aGlzLndhaXQgPSB0cnVlO1xufVxuXG5KaW5nbGVTZXNzaW9uLnByb3RvdHlwZS5pbml0aWF0ZSA9IGZ1bmN0aW9uIChwZWVyamlkLCBpc0luaXRpYXRvcikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAodGhpcy5zdGF0ZSAhPT0gbnVsbCkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdhdHRlbXB0IHRvIGluaXRpYXRlIG9uIHNlc3Npb24gJyArIHRoaXMuc2lkICtcbiAgICAgICAgICAgICdpbiBzdGF0ZSAnICsgdGhpcy5zdGF0ZSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5pc0luaXRpYXRvciA9IGlzSW5pdGlhdG9yO1xuICAgIHRoaXMuc3RhdGUgPSAncGVuZGluZyc7XG4gICAgdGhpcy5pbml0aWF0b3IgPSBpc0luaXRpYXRvciA/IHRoaXMubWUgOiBwZWVyamlkO1xuICAgIHRoaXMucmVzcG9uZGVyID0gIWlzSW5pdGlhdG9yID8gdGhpcy5tZSA6IHBlZXJqaWQ7XG4gICAgdGhpcy5wZWVyamlkID0gcGVlcmppZDtcbiAgICB0aGlzLmhhZHN0dW5jYW5kaWRhdGUgPSBmYWxzZTtcbiAgICB0aGlzLmhhZHR1cm5jYW5kaWRhdGUgPSBmYWxzZTtcbiAgICB0aGlzLmxhc3RpY2VjYW5kaWRhdGUgPSBmYWxzZTtcblxuICAgIHRoaXMucGVlcmNvbm5lY3Rpb25cbiAgICAgICAgPSBuZXcgVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24oXG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uamluZ2xlLmljZV9jb25maWcsXG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uamluZ2xlLnBjX2NvbnN0cmFpbnRzICk7XG5cbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLm9uaWNlY2FuZGlkYXRlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHNlbGYuc2VuZEljZUNhbmRpZGF0ZShldmVudC5jYW5kaWRhdGUpO1xuICAgIH07XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5vbmFkZHN0cmVhbSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBzZWxmLnJlbW90ZVN0cmVhbXMucHVzaChldmVudC5zdHJlYW0pO1xuLy8gICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ3JlbW90ZXN0cmVhbWFkZGVkLmppbmdsZScsIFtldmVudCwgc2VsZi5zaWRdKTtcbiAgICAgICAgc2VsZi53YWl0Rm9yUHJlc2VuY2UoZXZlbnQsIHNlbGYuc2lkKTtcbiAgICB9O1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24ub25yZW1vdmVzdHJlYW0gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBzdHJlYW0gZnJvbSByZW1vdGVTdHJlYW1zXG4gICAgICAgIHZhciBzdHJlYW1JZHggPSBzZWxmLnJlbW90ZVN0cmVhbXMuaW5kZXhPZihldmVudC5zdHJlYW0pO1xuICAgICAgICBpZihzdHJlYW1JZHggIT09IC0xKXtcbiAgICAgICAgICAgIHNlbGYucmVtb3RlU3RyZWFtcy5zcGxpY2Uoc3RyZWFtSWR4LCAxKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBGSVhNRTogcmVtb3Rlc3RyZWFtcmVtb3ZlZC5qaW5nbGUgbm90IGRlZmluZWQgYW55d2hlcmUodW51c2VkKVxuICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdyZW1vdGVzdHJlYW1yZW1vdmVkLmppbmdsZScsIFtldmVudCwgc2VsZi5zaWRdKTtcbiAgICB9O1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24ub25zaWduYWxpbmdzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBpZiAoIShzZWxmICYmIHNlbGYucGVlcmNvbm5lY3Rpb24pKSByZXR1cm47XG4gICAgfTtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLm9uaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIGlmICghKHNlbGYgJiYgc2VsZi5wZWVyY29ubmVjdGlvbikpIHJldHVybjtcbiAgICAgICAgc3dpdGNoIChzZWxmLnBlZXJjb25uZWN0aW9uLmljZUNvbm5lY3Rpb25TdGF0ZSkge1xuICAgICAgICAgICAgY2FzZSAnY29ubmVjdGVkJzpcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0VGltZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdkaXNjb25uZWN0ZWQnOlxuICAgICAgICAgICAgICAgIHRoaXMuc3RvcFRpbWUgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHNlbGYub25JY2VDb25uZWN0aW9uU3RhdGVDaGFuZ2Uoc2VsZi5zaWQsIHNlbGYpO1xuICAgIH07XG4gICAgLy8gYWRkIGFueSBsb2NhbCBhbmQgcmVsYXllZCBzdHJlYW1cbiAgICB0aGlzLmxvY2FsU3RyZWFtcy5mb3JFYWNoKGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgICBzZWxmLnBlZXJjb25uZWN0aW9uLmFkZFN0cmVhbShzdHJlYW0pO1xuICAgIH0pO1xuICAgIHRoaXMucmVsYXllZFN0cmVhbXMuZm9yRWFjaChmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgICAgc2VsZi5wZWVyY29ubmVjdGlvbi5hZGRTdHJlYW0oc3RyZWFtKTtcbiAgICB9KTtcbn07XG5cbkppbmdsZVNlc3Npb24ucHJvdG90eXBlLmFjY2VwdCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5zdGF0ZSA9ICdhY3RpdmUnO1xuXG4gICAgdmFyIHByYW5zd2VyID0gdGhpcy5wZWVyY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uO1xuICAgIGlmICghcHJhbnN3ZXIgfHwgcHJhbnN3ZXIudHlwZSAhPSAncHJhbnN3ZXInKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc29sZS5sb2coJ2dvaW5nIGZyb20gcHJhbnN3ZXIgdG8gYW5zd2VyJyk7XG4gICAgaWYgKHRoaXMudXNldHJpY2tsZSkge1xuICAgICAgICAvLyByZW1vdmUgY2FuZGlkYXRlcyBhbHJlYWR5IHNlbnQgZnJvbSBzZXNzaW9uLWFjY2VwdFxuICAgICAgICB2YXIgbGluZXMgPSBTRFBVdGlsLmZpbmRfbGluZXMocHJhbnN3ZXIuc2RwLCAnYT1jYW5kaWRhdGU6Jyk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHByYW5zd2VyLnNkcCA9IHByYW5zd2VyLnNkcC5yZXBsYWNlKGxpbmVzW2ldICsgJ1xcclxcbicsICcnKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB3aGlsZSAoU0RQVXRpbC5maW5kX2xpbmUocHJhbnN3ZXIuc2RwLCAnYT1pbmFjdGl2ZScpKSB7XG4gICAgICAgIC8vIEZJWE1FOiBjaGFuZ2UgYW55IGluYWN0aXZlIHRvIHNlbmRyZWN2IG9yIHdoYXRldmVyIHRoZXkgd2VyZSBvcmlnaW5hbGx5XG4gICAgICAgIHByYW5zd2VyLnNkcCA9IHByYW5zd2VyLnNkcC5yZXBsYWNlKCdhPWluYWN0aXZlJywgJ2E9c2VuZHJlY3YnKTtcbiAgICB9XG4gICAgdmFyIHNpbXVsY2FzdCA9IG5ldyBTaW11bGNhc3QoKTtcbiAgICBwcmFuc3dlciA9IHNpbXVsY2FzdC5yZXZlcnNlVHJhbnNmb3JtTG9jYWxEZXNjcmlwdGlvbihwcmFuc3dlcik7XG4gICAgdmFyIHByc2RwID0gbmV3IFNEUChwcmFuc3dlci5zZHApO1xuICAgIHZhciBhY2NlcHQgPSAkaXEoe3RvOiB0aGlzLnBlZXJqaWQsXG4gICAgICAgIHR5cGU6ICdzZXQnfSlcbiAgICAgICAgLmMoJ2ppbmdsZScsIHt4bWxuczogJ3Vybjp4bXBwOmppbmdsZToxJyxcbiAgICAgICAgICAgIGFjdGlvbjogJ3Nlc3Npb24tYWNjZXB0JyxcbiAgICAgICAgICAgIGluaXRpYXRvcjogdGhpcy5pbml0aWF0b3IsXG4gICAgICAgICAgICByZXNwb25kZXI6IHRoaXMucmVzcG9uZGVyLFxuICAgICAgICAgICAgc2lkOiB0aGlzLnNpZCB9KTtcbiAgICBwcnNkcC50b0ppbmdsZShhY2NlcHQsIHRoaXMuaW5pdGlhdG9yID09IHRoaXMubWUgPyAnaW5pdGlhdG9yJyA6ICdyZXNwb25kZXInKTtcbiAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKGFjY2VwdCxcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGFjayA9IHt9O1xuICAgICAgICAgICAgYWNrLnNvdXJjZSA9ICdhbnN3ZXInO1xuICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignYWNrLmppbmdsZScsIFtzZWxmLnNpZCwgYWNrXSk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzdGFuemEpIHtcbiAgICAgICAgICAgIHZhciBlcnJvciA9ICgkKHN0YW56YSkuZmluZCgnZXJyb3InKS5sZW5ndGgpID8ge1xuICAgICAgICAgICAgICAgIGNvZGU6ICQoc3RhbnphKS5maW5kKCdlcnJvcicpLmF0dHIoJ2NvZGUnKSxcbiAgICAgICAgICAgICAgICByZWFzb246ICQoc3RhbnphKS5maW5kKCdlcnJvciA6Zmlyc3QnKVswXS50YWdOYW1lLFxuICAgICAgICAgICAgfTp7fTtcbiAgICAgICAgICAgIGVycm9yLnNvdXJjZSA9ICdhbnN3ZXInO1xuICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignZXJyb3IuamluZ2xlJywgW3NlbGYuc2lkLCBlcnJvcl0pO1xuICAgICAgICB9LFxuICAgICAgICAxMDAwMCk7XG5cbiAgICB2YXIgc2RwID0gdGhpcy5wZWVyY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uLnNkcDtcbiAgICB3aGlsZSAoU0RQVXRpbC5maW5kX2xpbmUoc2RwLCAnYT1pbmFjdGl2ZScpKSB7XG4gICAgICAgIC8vIEZJWE1FOiBjaGFuZ2UgYW55IGluYWN0aXZlIHRvIHNlbmRyZWN2IG9yIHdoYXRldmVyIHRoZXkgd2VyZSBvcmlnaW5hbGx5XG4gICAgICAgIHNkcCA9IHNkcC5yZXBsYWNlKCdhPWluYWN0aXZlJywgJ2E9c2VuZHJlY3YnKTtcbiAgICB9XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5zZXRMb2NhbERlc2NyaXB0aW9uKG5ldyBSVENTZXNzaW9uRGVzY3JpcHRpb24oe3R5cGU6ICdhbnN3ZXInLCBzZHA6IHNkcH0pLFxuICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdzZXRMb2NhbERlc2NyaXB0aW9uIHN1Y2Nlc3MnKTtcbiAgICAgICAgICAgIHNlbGYuc2V0TG9jYWxEZXNjcmlwdGlvbihzZWxmLnNpZCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdzZXRMb2NhbERlc2NyaXB0aW9uIGZhaWxlZCcsIGUpO1xuICAgICAgICB9XG4gICAgKTtcbn07XG5cbi8qKlxuICogSW1wbGVtZW50cyBTZXNzaW9uQmFzZS5zZW5kU1NSQ1VwZGF0ZS5cbiAqL1xuSmluZ2xlU2Vzc2lvbi5wcm90b3R5cGUuc2VuZFNTUkNVcGRhdGUgPSBmdW5jdGlvbihzZHBNZWRpYVNzcmNzLCBmcm9tSmlkLCBpc2FkZCkge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGNvbnNvbGUubG9nKCd0ZWxsJywgc2VsZi5wZWVyamlkLCAnYWJvdXQgJyArIChpc2FkZCA/ICduZXcnIDogJ3JlbW92ZWQnKSArICcgc3NyY3MgZnJvbScgKyBzZWxmLm1lKTtcblxuICAgIGlmICghKHRoaXMucGVlcmNvbm5lY3Rpb24uc2lnbmFsaW5nU3RhdGUgPT0gJ3N0YWJsZScgJiYgdGhpcy5wZWVyY29ubmVjdGlvbi5pY2VDb25uZWN0aW9uU3RhdGUgPT0gJ2Nvbm5lY3RlZCcpKXtcbiAgICAgICAgY29uc29sZS5sb2coXCJUb28gZWFybHkgdG8gc2VuZCB1cGRhdGVzXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5zZW5kU1NSQ1VwZGF0ZUlxKHNkcE1lZGlhU3NyY3MsIHNlbGYuc2lkLCBzZWxmLmluaXRpYXRvciwgc2VsZi5wZWVyamlkLCBpc2FkZCk7XG59O1xuXG5KaW5nbGVTZXNzaW9uLnByb3RvdHlwZS50ZXJtaW5hdGUgPSBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgdGhpcy5zdGF0ZSA9ICdlbmRlZCc7XG4gICAgdGhpcy5yZWFzb24gPSByZWFzb247XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5jbG9zZSgpO1xuICAgIGlmICh0aGlzLnN0YXRzaW50ZXJ2YWwgIT09IG51bGwpIHtcbiAgICAgICAgd2luZG93LmNsZWFySW50ZXJ2YWwodGhpcy5zdGF0c2ludGVydmFsKTtcbiAgICAgICAgdGhpcy5zdGF0c2ludGVydmFsID0gbnVsbDtcbiAgICB9XG59O1xuXG5KaW5nbGVTZXNzaW9uLnByb3RvdHlwZS5hY3RpdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGUgPT0gJ2FjdGl2ZSc7XG59O1xuXG5KaW5nbGVTZXNzaW9uLnByb3RvdHlwZS5zZW5kSWNlQ2FuZGlkYXRlID0gZnVuY3Rpb24gKGNhbmRpZGF0ZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoY2FuZGlkYXRlICYmICF0aGlzLmxhc3RpY2VjYW5kaWRhdGUpIHtcbiAgICAgICAgdmFyIGljZSA9IFNEUFV0aWwuaWNlcGFyYW1zKHRoaXMubG9jYWxTRFAubWVkaWFbY2FuZGlkYXRlLnNkcE1MaW5lSW5kZXhdLCB0aGlzLmxvY2FsU0RQLnNlc3Npb24pO1xuICAgICAgICB2YXIgamNhbmQgPSBTRFBVdGlsLmNhbmRpZGF0ZVRvSmluZ2xlKGNhbmRpZGF0ZS5jYW5kaWRhdGUpO1xuICAgICAgICBpZiAoIShpY2UgJiYgamNhbmQpKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdmYWlsZWQgdG8gZ2V0IGljZSAmJiBqY2FuZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGljZS54bWxucyA9ICd1cm46eG1wcDpqaW5nbGU6dHJhbnNwb3J0czppY2UtdWRwOjEnO1xuXG4gICAgICAgIGlmIChqY2FuZC50eXBlID09PSAnc3JmbHgnKSB7XG4gICAgICAgICAgICB0aGlzLmhhZHN0dW5jYW5kaWRhdGUgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKGpjYW5kLnR5cGUgPT09ICdyZWxheScpIHtcbiAgICAgICAgICAgIHRoaXMuaGFkdHVybmNhbmRpZGF0ZSA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy51c2V0cmlja2xlKSB7XG4gICAgICAgICAgICBpZiAodGhpcy51c2VkcmlwKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZHJpcF9jb250YWluZXIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHN0YXJ0IDIwbXMgY2FsbG91dFxuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5kcmlwX2NvbnRhaW5lci5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuc2VuZEljZUNhbmRpZGF0ZXMoc2VsZi5kcmlwX2NvbnRhaW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmRyaXBfY29udGFpbmVyID0gW107XG4gICAgICAgICAgICAgICAgICAgIH0sIDIwKTtcblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLmRyaXBfY29udGFpbmVyLnB1c2goZXZlbnQuY2FuZGlkYXRlKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNlbGYuc2VuZEljZUNhbmRpZGF0ZShbZXZlbnQuY2FuZGlkYXRlXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICAvL2NvbnNvbGUubG9nKCdzZW5kSWNlQ2FuZGlkYXRlOiBsYXN0IGNhbmRpZGF0ZS4nKTtcbiAgICAgICAgaWYgKCF0aGlzLnVzZXRyaWNrbGUpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3Nob3VsZCBzZW5kIGZ1bGwgb2ZmZXIgbm93Li4uJyk7XG4gICAgICAgICAgICB2YXIgaW5pdCA9ICRpcSh7dG86IHRoaXMucGVlcmppZCxcbiAgICAgICAgICAgICAgICB0eXBlOiAnc2V0J30pXG4gICAgICAgICAgICAgICAgLmMoJ2ppbmdsZScsIHt4bWxuczogJ3Vybjp4bXBwOmppbmdsZToxJyxcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB0aGlzLnBlZXJjb25uZWN0aW9uLmxvY2FsRGVzY3JpcHRpb24udHlwZSA9PSAnb2ZmZXInID8gJ3Nlc3Npb24taW5pdGlhdGUnIDogJ3Nlc3Npb24tYWNjZXB0JyxcbiAgICAgICAgICAgICAgICAgICAgaW5pdGlhdG9yOiB0aGlzLmluaXRpYXRvcixcbiAgICAgICAgICAgICAgICAgICAgc2lkOiB0aGlzLnNpZH0pO1xuICAgICAgICAgICAgdGhpcy5sb2NhbFNEUCA9IG5ldyBTRFAodGhpcy5wZWVyY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uLnNkcCk7XG4gICAgICAgICAgICB0aGlzLmxvY2FsU0RQLnRvSmluZ2xlKGluaXQsIHRoaXMuaW5pdGlhdG9yID09IHRoaXMubWUgPyAnaW5pdGlhdG9yJyA6ICdyZXNwb25kZXInKTtcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoaW5pdCxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3Nlc3Npb24gaW5pdGlhdGUgYWNrJyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhY2sgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgYWNrLnNvdXJjZSA9ICdvZmZlcic7XG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2Fjay5qaW5nbGUnLCBbc2VsZi5zaWQsIGFja10pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHN0YW56YSkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnN0YXRlID0gJ2Vycm9yJztcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5wZWVyY29ubmVjdGlvbi5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSAoJChzdGFuemEpLmZpbmQoJ2Vycm9yJykubGVuZ3RoKSA/IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6ICQoc3RhbnphKS5maW5kKCdlcnJvcicpLmF0dHIoJ2NvZGUnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYXNvbjogJChzdGFuemEpLmZpbmQoJ2Vycm9yIDpmaXJzdCcpWzBdLnRhZ05hbWUsXG4gICAgICAgICAgICAgICAgICAgIH06e307XG4gICAgICAgICAgICAgICAgICAgIGVycm9yLnNvdXJjZSA9ICdvZmZlcic7XG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2Vycm9yLmppbmdsZScsIFtzZWxmLnNpZCwgZXJyb3JdKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIDEwMDAwKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxhc3RpY2VjYW5kaWRhdGUgPSB0cnVlO1xuICAgICAgICBjb25zb2xlLmxvZygnSGF2ZSB3ZSBlbmNvdW50ZXJlZCBhbnkgc3JmbHggY2FuZGlkYXRlcz8gJyArIHRoaXMuaGFkc3R1bmNhbmRpZGF0ZSk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdIYXZlIHdlIGVuY291bnRlcmVkIGFueSByZWxheSBjYW5kaWRhdGVzPyAnICsgdGhpcy5oYWR0dXJuY2FuZGlkYXRlKTtcblxuICAgICAgICBpZiAoISh0aGlzLmhhZHN0dW5jYW5kaWRhdGUgfHwgdGhpcy5oYWR0dXJuY2FuZGlkYXRlKSAmJiB0aGlzLnBlZXJjb25uZWN0aW9uLnNpZ25hbGluZ1N0YXRlICE9ICdjbG9zZWQnKSB7XG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdub3N0dW5jYW5kaWRhdGVzLmppbmdsZScsIFt0aGlzLnNpZF0pO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuSmluZ2xlU2Vzc2lvbi5wcm90b3R5cGUuc2VuZEljZUNhbmRpZGF0ZXMgPSBmdW5jdGlvbiAoY2FuZGlkYXRlcykge1xuICAgIGNvbnNvbGUubG9nKCdzZW5kSWNlQ2FuZGlkYXRlcycsIGNhbmRpZGF0ZXMpO1xuICAgIHZhciBjYW5kID0gJGlxKHt0bzogdGhpcy5wZWVyamlkLCB0eXBlOiAnc2V0J30pXG4gICAgICAgIC5jKCdqaW5nbGUnLCB7eG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6MScsXG4gICAgICAgICAgICBhY3Rpb246ICd0cmFuc3BvcnQtaW5mbycsXG4gICAgICAgICAgICBpbml0aWF0b3I6IHRoaXMuaW5pdGlhdG9yLFxuICAgICAgICAgICAgc2lkOiB0aGlzLnNpZH0pO1xuICAgIGZvciAodmFyIG1pZCA9IDA7IG1pZCA8IHRoaXMubG9jYWxTRFAubWVkaWEubGVuZ3RoOyBtaWQrKykge1xuICAgICAgICB2YXIgY2FuZHMgPSBjYW5kaWRhdGVzLmZpbHRlcihmdW5jdGlvbiAoZWwpIHsgcmV0dXJuIGVsLnNkcE1MaW5lSW5kZXggPT0gbWlkOyB9KTtcbiAgICAgICAgaWYgKGNhbmRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBpY2UgPSBTRFBVdGlsLmljZXBhcmFtcyh0aGlzLmxvY2FsU0RQLm1lZGlhW21pZF0sIHRoaXMubG9jYWxTRFAuc2Vzc2lvbik7XG4gICAgICAgICAgICBpY2UueG1sbnMgPSAndXJuOnhtcHA6amluZ2xlOnRyYW5zcG9ydHM6aWNlLXVkcDoxJztcbiAgICAgICAgICAgIGNhbmQuYygnY29udGVudCcsIHtjcmVhdG9yOiB0aGlzLmluaXRpYXRvciA9PSB0aGlzLm1lID8gJ2luaXRpYXRvcicgOiAncmVzcG9uZGVyJyxcbiAgICAgICAgICAgICAgICBuYW1lOiBjYW5kc1swXS5zZHBNaWRcbiAgICAgICAgICAgIH0pLmMoJ3RyYW5zcG9ydCcsIGljZSk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNhbmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY2FuZC5jKCdjYW5kaWRhdGUnLCBTRFBVdGlsLmNhbmRpZGF0ZVRvSmluZ2xlKGNhbmRzW2ldLmNhbmRpZGF0ZSkpLnVwKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBhZGQgZmluZ2VycHJpbnRcbiAgICAgICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZSh0aGlzLmxvY2FsU0RQLm1lZGlhW21pZF0sICdhPWZpbmdlcnByaW50OicsIHRoaXMubG9jYWxTRFAuc2Vzc2lvbikpIHtcbiAgICAgICAgICAgICAgICB2YXIgdG1wID0gU0RQVXRpbC5wYXJzZV9maW5nZXJwcmludChTRFBVdGlsLmZpbmRfbGluZSh0aGlzLmxvY2FsU0RQLm1lZGlhW21pZF0sICdhPWZpbmdlcnByaW50OicsIHRoaXMubG9jYWxTRFAuc2Vzc2lvbikpO1xuICAgICAgICAgICAgICAgIHRtcC5yZXF1aXJlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgY2FuZC5jKFxuICAgICAgICAgICAgICAgICAgICAnZmluZ2VycHJpbnQnLFxuICAgICAgICAgICAgICAgICAgICB7eG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6YXBwczpkdGxzOjAnfSlcbiAgICAgICAgICAgICAgICAgICAgLnQodG1wLmZpbmdlcnByaW50KTtcbiAgICAgICAgICAgICAgICBkZWxldGUgdG1wLmZpbmdlcnByaW50O1xuICAgICAgICAgICAgICAgIGNhbmQuYXR0cnModG1wKTtcbiAgICAgICAgICAgICAgICBjYW5kLnVwKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYW5kLnVwKCk7IC8vIHRyYW5zcG9ydFxuICAgICAgICAgICAgY2FuZC51cCgpOyAvLyBjb250ZW50XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gbWlnaHQgbWVyZ2UgbGFzdC1jYW5kaWRhdGUgbm90aWZpY2F0aW9uIGludG8gdGhpcywgYnV0IGl0IGlzIGNhbGxlZCBhbG90IGxhdGVyLiBTZWUgd2VicnRjIGlzc3VlICMyMzQwXG4gICAgLy9jb25zb2xlLmxvZygnd2FzIHRoaXMgdGhlIGxhc3QgY2FuZGlkYXRlJywgdGhpcy5sYXN0aWNlY2FuZGlkYXRlKTtcbiAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKGNhbmQsXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhY2sgPSB7fTtcbiAgICAgICAgICAgIGFjay5zb3VyY2UgPSAndHJhbnNwb3J0aW5mbyc7XG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdhY2suamluZ2xlJywgW3RoaXMuc2lkLCBhY2tdKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHN0YW56YSkge1xuICAgICAgICAgICAgdmFyIGVycm9yID0gKCQoc3RhbnphKS5maW5kKCdlcnJvcicpLmxlbmd0aCkgPyB7XG4gICAgICAgICAgICAgICAgY29kZTogJChzdGFuemEpLmZpbmQoJ2Vycm9yJykuYXR0cignY29kZScpLFxuICAgICAgICAgICAgICAgIHJlYXNvbjogJChzdGFuemEpLmZpbmQoJ2Vycm9yIDpmaXJzdCcpWzBdLnRhZ05hbWUsXG4gICAgICAgICAgICB9Ont9O1xuICAgICAgICAgICAgZXJyb3Iuc291cmNlID0gJ3RyYW5zcG9ydGluZm8nO1xuICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignZXJyb3IuamluZ2xlJywgW3RoaXMuc2lkLCBlcnJvcl0pO1xuICAgICAgICB9LFxuICAgICAgICAxMDAwMCk7XG59O1xuXG5cbkppbmdsZVNlc3Npb24ucHJvdG90eXBlLnNlbmRPZmZlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAvL2NvbnNvbGUubG9nKCdzZW5kT2ZmZXIuLi4nKTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5jcmVhdGVPZmZlcihmdW5jdGlvbiAoc2RwKSB7XG4gICAgICAgICAgICBzZWxmLmNyZWF0ZWRPZmZlcihzZHApO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignY3JlYXRlT2ZmZXIgZmFpbGVkJywgZSk7XG4gICAgICAgIH0sXG4gICAgICAgIHRoaXMubWVkaWFfY29uc3RyYWludHNcbiAgICApO1xufTtcblxuSmluZ2xlU2Vzc2lvbi5wcm90b3R5cGUuY3JlYXRlZE9mZmVyID0gZnVuY3Rpb24gKHNkcCkge1xuICAgIC8vY29uc29sZS5sb2coJ2NyZWF0ZWRPZmZlcicsIHNkcCk7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMubG9jYWxTRFAgPSBuZXcgU0RQKHNkcC5zZHApO1xuICAgIC8vdGhpcy5sb2NhbFNEUC5tYW5nbGUoKTtcbiAgICBpZiAodGhpcy51c2V0cmlja2xlKSB7XG4gICAgICAgIHZhciBpbml0ID0gJGlxKHt0bzogdGhpcy5wZWVyamlkLFxuICAgICAgICAgICAgdHlwZTogJ3NldCd9KVxuICAgICAgICAgICAgLmMoJ2ppbmdsZScsIHt4bWxuczogJ3Vybjp4bXBwOmppbmdsZToxJyxcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdzZXNzaW9uLWluaXRpYXRlJyxcbiAgICAgICAgICAgICAgICBpbml0aWF0b3I6IHRoaXMuaW5pdGlhdG9yLFxuICAgICAgICAgICAgICAgIHNpZDogdGhpcy5zaWR9KTtcbiAgICAgICAgdGhpcy5sb2NhbFNEUC50b0ppbmdsZShpbml0LCB0aGlzLmluaXRpYXRvciA9PSB0aGlzLm1lID8gJ2luaXRpYXRvcicgOiAncmVzcG9uZGVyJyk7XG4gICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoaW5pdCxcbiAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgYWNrID0ge307XG4gICAgICAgICAgICAgICAgYWNrLnNvdXJjZSA9ICdvZmZlcic7XG4gICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignYWNrLmppbmdsZScsIFtzZWxmLnNpZCwgYWNrXSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKHN0YW56YSkge1xuICAgICAgICAgICAgICAgIHNlbGYuc3RhdGUgPSAnZXJyb3InO1xuICAgICAgICAgICAgICAgIHNlbGYucGVlcmNvbm5lY3Rpb24uY2xvc2UoKTtcbiAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSAoJChzdGFuemEpLmZpbmQoJ2Vycm9yJykubGVuZ3RoKSA/IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogJChzdGFuemEpLmZpbmQoJ2Vycm9yJykuYXR0cignY29kZScpLFxuICAgICAgICAgICAgICAgICAgICByZWFzb246ICQoc3RhbnphKS5maW5kKCdlcnJvciA6Zmlyc3QnKVswXS50YWdOYW1lLFxuICAgICAgICAgICAgICAgIH06e307XG4gICAgICAgICAgICAgICAgZXJyb3Iuc291cmNlID0gJ29mZmVyJztcbiAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdlcnJvci5qaW5nbGUnLCBbc2VsZi5zaWQsIGVycm9yXSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgMTAwMDApO1xuICAgIH1cbiAgICBzZHAuc2RwID0gdGhpcy5sb2NhbFNEUC5yYXc7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5zZXRMb2NhbERlc2NyaXB0aW9uKHNkcCxcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5zZXRMb2NhbERlc2NyaXB0aW9uKHNlbGYuc2lkKTtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3NldExvY2FsRGVzY3JpcHRpb24gc3VjY2VzcycpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignc2V0TG9jYWxEZXNjcmlwdGlvbiBmYWlsZWQnLCBlKTtcbiAgICAgICAgfVxuICAgICk7XG4gICAgdmFyIGNhbmRzID0gU0RQVXRpbC5maW5kX2xpbmVzKHRoaXMubG9jYWxTRFAucmF3LCAnYT1jYW5kaWRhdGU6Jyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjYW5kcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY2FuZCA9IFNEUFV0aWwucGFyc2VfaWNlY2FuZGlkYXRlKGNhbmRzW2ldKTtcbiAgICAgICAgaWYgKGNhbmQudHlwZSA9PSAnc3JmbHgnKSB7XG4gICAgICAgICAgICB0aGlzLmhhZHN0dW5jYW5kaWRhdGUgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKGNhbmQudHlwZSA9PSAncmVsYXknKSB7XG4gICAgICAgICAgICB0aGlzLmhhZHR1cm5jYW5kaWRhdGUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuSmluZ2xlU2Vzc2lvbi5wcm90b3R5cGUuc2V0UmVtb3RlRGVzY3JpcHRpb24gPSBmdW5jdGlvbiAoZWxlbSwgZGVzY3R5cGUpIHtcbiAgICAvL2NvbnNvbGUubG9nKCdzZXR0aW5nIHJlbW90ZSBkZXNjcmlwdGlvbi4uLiAnLCBkZXNjdHlwZSk7XG4gICAgdGhpcy5yZW1vdGVTRFAgPSBuZXcgU0RQKCcnKTtcbiAgICB0aGlzLnJlbW90ZVNEUC5mcm9tSmluZ2xlKGVsZW0pO1xuICAgIGlmICh0aGlzLnBlZXJjb25uZWN0aW9uLnJlbW90ZURlc2NyaXB0aW9uICE9PSBudWxsKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdzZXRSZW1vdGVEZXNjcmlwdGlvbiB3aGVuIHJlbW90ZSBkZXNjcmlwdGlvbiBpcyBub3QgbnVsbCwgc2hvdWxkIGJlIHByYW5zd2VyJywgdGhpcy5wZWVyY29ubmVjdGlvbi5yZW1vdGVEZXNjcmlwdGlvbik7XG4gICAgICAgIGlmICh0aGlzLnBlZXJjb25uZWN0aW9uLnJlbW90ZURlc2NyaXB0aW9uLnR5cGUgPT0gJ3ByYW5zd2VyJykge1xuICAgICAgICAgICAgdmFyIHByYW5zd2VyID0gbmV3IFNEUCh0aGlzLnBlZXJjb25uZWN0aW9uLnJlbW90ZURlc2NyaXB0aW9uLnNkcCk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHByYW5zd2VyLm1lZGlhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgLy8gbWFrZSBzdXJlIHdlIGhhdmUgaWNlIHVmcmFnIGFuZCBwd2RcbiAgICAgICAgICAgICAgICBpZiAoIVNEUFV0aWwuZmluZF9saW5lKHRoaXMucmVtb3RlU0RQLm1lZGlhW2ldLCAnYT1pY2UtdWZyYWc6JywgdGhpcy5yZW1vdGVTRFAuc2Vzc2lvbikpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKHByYW5zd2VyLm1lZGlhW2ldLCAnYT1pY2UtdWZyYWc6JywgcHJhbnN3ZXIuc2Vzc2lvbikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3RlU0RQLm1lZGlhW2ldICs9IFNEUFV0aWwuZmluZF9saW5lKHByYW5zd2VyLm1lZGlhW2ldLCAnYT1pY2UtdWZyYWc6JywgcHJhbnN3ZXIuc2Vzc2lvbikgKyAnXFxyXFxuJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2Fybignbm8gaWNlIHVmcmFnPycpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZShwcmFuc3dlci5tZWRpYVtpXSwgJ2E9aWNlLXB3ZDonLCBwcmFuc3dlci5zZXNzaW9uKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdGVTRFAubWVkaWFbaV0gKz0gU0RQVXRpbC5maW5kX2xpbmUocHJhbnN3ZXIubWVkaWFbaV0sICdhPWljZS1wd2Q6JywgcHJhbnN3ZXIuc2Vzc2lvbikgKyAnXFxyXFxuJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2Fybignbm8gaWNlIHB3ZD8nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBjb3B5IG92ZXIgY2FuZGlkYXRlc1xuICAgICAgICAgICAgICAgIHZhciBsaW5lcyA9IFNEUFV0aWwuZmluZF9saW5lcyhwcmFuc3dlci5tZWRpYVtpXSwgJ2E9Y2FuZGlkYXRlOicpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbGluZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdGVTRFAubWVkaWFbaV0gKz0gbGluZXNbal0gKyAnXFxyXFxuJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnJlbW90ZVNEUC5yYXcgPSB0aGlzLnJlbW90ZVNEUC5zZXNzaW9uICsgdGhpcy5yZW1vdGVTRFAubWVkaWEuam9pbignJyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdmFyIHJlbW90ZWRlc2MgPSBuZXcgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKHt0eXBlOiBkZXNjdHlwZSwgc2RwOiB0aGlzLnJlbW90ZVNEUC5yYXd9KTtcblxuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uc2V0UmVtb3RlRGVzY3JpcHRpb24ocmVtb3RlZGVzYyxcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnc2V0UmVtb3RlRGVzY3JpcHRpb24gc3VjY2VzcycpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignc2V0UmVtb3RlRGVzY3JpcHRpb24gZXJyb3InLCBlKTtcbiAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLnNob3dFcnJvciggIFwiU29ycnlcIixcbiAgICAgICAgICAgICAgICBcIllvdXIgYnJvd3NlciB2ZXJzaW9uIGlzIHRvbyBvbGQuIFBsZWFzZSB1cGRhdGUgYW5kIHRyeSBhZ2Fpbi4uLlwiKTtcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5lbXVjLmRvTGVhdmUoKTtcbiAgICAgICAgfVxuICAgICk7XG59O1xuXG5KaW5nbGVTZXNzaW9uLnByb3RvdHlwZS5hZGRJY2VDYW5kaWRhdGUgPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAodGhpcy5wZWVyY29ubmVjdGlvbi5zaWduYWxpbmdTdGF0ZSA9PSAnY2xvc2VkJykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghdGhpcy5wZWVyY29ubmVjdGlvbi5yZW1vdGVEZXNjcmlwdGlvbiAmJiB0aGlzLnBlZXJjb25uZWN0aW9uLnNpZ25hbGluZ1N0YXRlID09ICdoYXZlLWxvY2FsLW9mZmVyJykge1xuICAgICAgICBjb25zb2xlLmxvZygndHJpY2tsZSBpY2UgY2FuZGlkYXRlIGFycml2aW5nIGJlZm9yZSBzZXNzaW9uIGFjY2VwdC4uLicpO1xuICAgICAgICAvLyBjcmVhdGUgYSBQUkFOU1dFUiBmb3Igc2V0UmVtb3RlRGVzY3JpcHRpb25cbiAgICAgICAgaWYgKCF0aGlzLnJlbW90ZVNEUCkge1xuICAgICAgICAgICAgdmFyIGNvYmJsZWQgPSAndj0wXFxyXFxuJyArXG4gICAgICAgICAgICAgICAgJ289LSAnICsgJzE5MjM1MTg1MTYnICsgJyAyIElOIElQNCAwLjAuMC4wXFxyXFxuJyArLy8gRklYTUVcbiAgICAgICAgICAgICAgICAncz0tXFxyXFxuJyArXG4gICAgICAgICAgICAgICAgJ3Q9MCAwXFxyXFxuJztcbiAgICAgICAgICAgIC8vIGZpcnN0LCB0YWtlIHNvbWUgdGhpbmdzIGZyb20gdGhlIGxvY2FsIGRlc2NyaXB0aW9uXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubG9jYWxTRFAubWVkaWEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb2JibGVkICs9IFNEUFV0aWwuZmluZF9saW5lKHRoaXMubG9jYWxTRFAubWVkaWFbaV0sICdtPScpICsgJ1xcclxcbic7XG4gICAgICAgICAgICAgICAgY29iYmxlZCArPSBTRFBVdGlsLmZpbmRfbGluZXModGhpcy5sb2NhbFNEUC5tZWRpYVtpXSwgJ2E9cnRwbWFwOicpLmpvaW4oJ1xcclxcbicpICsgJ1xcclxcbic7XG4gICAgICAgICAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKHRoaXMubG9jYWxTRFAubWVkaWFbaV0sICdhPW1pZDonKSkge1xuICAgICAgICAgICAgICAgICAgICBjb2JibGVkICs9IFNEUFV0aWwuZmluZF9saW5lKHRoaXMubG9jYWxTRFAubWVkaWFbaV0sICdhPW1pZDonKSArICdcXHJcXG4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb2JibGVkICs9ICdhPWluYWN0aXZlXFxyXFxuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMucmVtb3RlU0RQID0gbmV3IFNEUChjb2JibGVkKTtcbiAgICAgICAgfVxuICAgICAgICAvLyB0aGVuIGFkZCB0aGluZ3MgbGlrZSBpY2UgYW5kIGR0bHMgZnJvbSByZW1vdGUgY2FuZGlkYXRlXG4gICAgICAgIGVsZW0uZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYucmVtb3RlU0RQLm1lZGlhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKHNlbGYucmVtb3RlU0RQLm1lZGlhW2ldLCAnYT1taWQ6JyArICQodGhpcykuYXR0cignbmFtZScpKSB8fFxuICAgICAgICAgICAgICAgICAgICBzZWxmLnJlbW90ZVNEUC5tZWRpYVtpXS5pbmRleE9mKCdtPScgKyAkKHRoaXMpLmF0dHIoJ25hbWUnKSkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFTRFBVdGlsLmZpbmRfbGluZShzZWxmLnJlbW90ZVNEUC5tZWRpYVtpXSwgJ2E9aWNlLXVmcmFnOicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdG1wID0gJCh0aGlzKS5maW5kKCd0cmFuc3BvcnQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYucmVtb3RlU0RQLm1lZGlhW2ldICs9ICdhPWljZS11ZnJhZzonICsgdG1wLmF0dHIoJ3VmcmFnJykgKyAnXFxyXFxuJztcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYucmVtb3RlU0RQLm1lZGlhW2ldICs9ICdhPWljZS1wd2Q6JyArIHRtcC5hdHRyKCdwd2QnKSArICdcXHJcXG4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgdG1wID0gJCh0aGlzKS5maW5kKCd0cmFuc3BvcnQ+ZmluZ2VycHJpbnQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0bXAubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5yZW1vdGVTRFAubWVkaWFbaV0gKz0gJ2E9ZmluZ2VycHJpbnQ6JyArIHRtcC5hdHRyKCdoYXNoJykgKyAnICcgKyB0bXAudGV4dCgpICsgJ1xcclxcbic7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdubyBkdGxzIGZpbmdlcnByaW50ICh3ZWJydGMgaXNzdWUgIzE3MTg/KScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYucmVtb3RlU0RQLm1lZGlhW2ldICs9ICdhPWNyeXB0bzoxIEFFU19DTV8xMjhfSE1BQ19TSEExXzgwIGlubGluZTpCQUFEQkFBREJBQURCQUFEQkFBREJBQURCQUFEQkFBREJBQURCQUFEXFxyXFxuJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5yZW1vdGVTRFAucmF3ID0gdGhpcy5yZW1vdGVTRFAuc2Vzc2lvbiArIHRoaXMucmVtb3RlU0RQLm1lZGlhLmpvaW4oJycpO1xuXG4gICAgICAgIC8vIHdlIG5lZWQgYSBjb21wbGV0ZSBTRFAgd2l0aCBpY2UtdWZyYWcvaWNlLXB3ZCBpbiBhbGwgcGFydHNcbiAgICAgICAgLy8gdGhpcyBtYWtlcyB0aGUgYXNzdW1wdGlvbiB0aGF0IHRoZSBQUkFOU1dFUiBpcyBjb25zdHJ1Y3RlZCBzdWNoIHRoYXQgdGhlIGljZS11ZnJhZyBpcyBpbiBhbGwgbWVkaWFwYXJ0c1xuICAgICAgICAvLyBidXQgaXQgY291bGQgYmUgaW4gdGhlIHNlc3Npb24gcGFydCBhcyB3ZWxsLiBzaW5jZSB0aGUgY29kZSBhYm92ZSBjb25zdHJ1Y3RzIHRoaXMgc2RwIHRoaXMgY2FuJ3QgaGFwcGVuIGhvd2V2ZXJcbiAgICAgICAgdmFyIGlzY29tcGxldGUgPSB0aGlzLnJlbW90ZVNEUC5tZWRpYS5maWx0ZXIoZnVuY3Rpb24gKG1lZGlhcGFydCkge1xuICAgICAgICAgICAgcmV0dXJuIFNEUFV0aWwuZmluZF9saW5lKG1lZGlhcGFydCwgJ2E9aWNlLXVmcmFnOicpO1xuICAgICAgICB9KS5sZW5ndGggPT0gdGhpcy5yZW1vdGVTRFAubWVkaWEubGVuZ3RoO1xuXG4gICAgICAgIGlmIChpc2NvbXBsZXRlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc2V0dGluZyBwcmFuc3dlcicpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0aGlzLnBlZXJjb25uZWN0aW9uLnNldFJlbW90ZURlc2NyaXB0aW9uKG5ldyBSVENTZXNzaW9uRGVzY3JpcHRpb24oe3R5cGU6ICdwcmFuc3dlcicsIHNkcDogdGhpcy5yZW1vdGVTRFAucmF3IH0pLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NldFJlbW90ZURlc2NyaXB0aW9uIHByYW5zd2VyIGZhaWxlZCcsIGUudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ3NldHRpbmcgcHJhbnN3ZXIgZmFpbGVkJywgZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdub3QgeWV0IHNldHRpbmcgcHJhbnN3ZXInKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBvcGVyYXRlIG9uIGVhY2ggY29udGVudCBlbGVtZW50XG4gICAgZWxlbS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gd291bGQgbG92ZSB0byBkZWFjdGl2YXRlIHRoaXMsIGJ1dCBmaXJlZm94IHN0aWxsIHJlcXVpcmVzIGl0XG4gICAgICAgIHZhciBpZHggPSAtMTtcbiAgICAgICAgdmFyIGk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBzZWxmLnJlbW90ZVNEUC5tZWRpYS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKHNlbGYucmVtb3RlU0RQLm1lZGlhW2ldLCAnYT1taWQ6JyArICQodGhpcykuYXR0cignbmFtZScpKSB8fFxuICAgICAgICAgICAgICAgIHNlbGYucmVtb3RlU0RQLm1lZGlhW2ldLmluZGV4T2YoJ209JyArICQodGhpcykuYXR0cignbmFtZScpKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGlkeCA9IGk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkeCA9PSAtMSkgeyAvLyBmYWxsIGJhY2sgdG8gbG9jYWxkZXNjcmlwdGlvblxuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IHNlbGYubG9jYWxTRFAubWVkaWEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUoc2VsZi5sb2NhbFNEUC5tZWRpYVtpXSwgJ2E9bWlkOicgKyAkKHRoaXMpLmF0dHIoJ25hbWUnKSkgfHxcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5sb2NhbFNEUC5tZWRpYVtpXS5pbmRleE9mKCdtPScgKyAkKHRoaXMpLmF0dHIoJ25hbWUnKSkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWR4ID0gaTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBuYW1lID0gJCh0aGlzKS5hdHRyKCduYW1lJyk7XG4gICAgICAgIC8vIFRPRE86IGNoZWNrIGljZS1wd2QgYW5kIGljZS11ZnJhZz9cbiAgICAgICAgJCh0aGlzKS5maW5kKCd0cmFuc3BvcnQ+Y2FuZGlkYXRlJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbGluZSwgY2FuZGlkYXRlO1xuICAgICAgICAgICAgbGluZSA9IFNEUFV0aWwuY2FuZGlkYXRlRnJvbUppbmdsZSh0aGlzKTtcbiAgICAgICAgICAgIGNhbmRpZGF0ZSA9IG5ldyBSVENJY2VDYW5kaWRhdGUoe3NkcE1MaW5lSW5kZXg6IGlkeCxcbiAgICAgICAgICAgICAgICBzZHBNaWQ6IG5hbWUsXG4gICAgICAgICAgICAgICAgY2FuZGlkYXRlOiBsaW5lfSk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHNlbGYucGVlcmNvbm5lY3Rpb24uYWRkSWNlQ2FuZGlkYXRlKGNhbmRpZGF0ZSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignYWRkSWNlQ2FuZGlkYXRlIGZhaWxlZCcsIGUudG9TdHJpbmcoKSwgbGluZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxuSmluZ2xlU2Vzc2lvbi5wcm90b3R5cGUuc2VuZEFuc3dlciA9IGZ1bmN0aW9uIChwcm92aXNpb25hbCkge1xuICAgIC8vY29uc29sZS5sb2coJ2NyZWF0ZUFuc3dlcicsIHByb3Zpc2lvbmFsKTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5jcmVhdGVBbnN3ZXIoXG4gICAgICAgIGZ1bmN0aW9uIChzZHApIHtcbiAgICAgICAgICAgIHNlbGYuY3JlYXRlZEFuc3dlcihzZHAsIHByb3Zpc2lvbmFsKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2NyZWF0ZUFuc3dlciBmYWlsZWQnLCBlKTtcbiAgICAgICAgfSxcbiAgICAgICAgdGhpcy5tZWRpYV9jb25zdHJhaW50c1xuICAgICk7XG59O1xuXG5KaW5nbGVTZXNzaW9uLnByb3RvdHlwZS5jcmVhdGVkQW5zd2VyID0gZnVuY3Rpb24gKHNkcCwgcHJvdmlzaW9uYWwpIHtcbiAgICAvL2NvbnNvbGUubG9nKCdjcmVhdGVBbnN3ZXIgY2FsbGJhY2snKTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5sb2NhbFNEUCA9IG5ldyBTRFAoc2RwLnNkcCk7XG4gICAgLy90aGlzLmxvY2FsU0RQLm1hbmdsZSgpO1xuICAgIHRoaXMudXNlcHJhbnN3ZXIgPSBwcm92aXNpb25hbCA9PT0gdHJ1ZTtcbiAgICBpZiAodGhpcy51c2V0cmlja2xlKSB7XG4gICAgICAgIGlmICghdGhpcy51c2VwcmFuc3dlcikge1xuICAgICAgICAgICAgdmFyIGFjY2VwdCA9ICRpcSh7dG86IHRoaXMucGVlcmppZCxcbiAgICAgICAgICAgICAgICB0eXBlOiAnc2V0J30pXG4gICAgICAgICAgICAgICAgLmMoJ2ppbmdsZScsIHt4bWxuczogJ3Vybjp4bXBwOmppbmdsZToxJyxcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiAnc2Vzc2lvbi1hY2NlcHQnLFxuICAgICAgICAgICAgICAgICAgICBpbml0aWF0b3I6IHRoaXMuaW5pdGlhdG9yLFxuICAgICAgICAgICAgICAgICAgICByZXNwb25kZXI6IHRoaXMucmVzcG9uZGVyLFxuICAgICAgICAgICAgICAgICAgICBzaWQ6IHRoaXMuc2lkIH0pO1xuICAgICAgICAgICAgdmFyIHNpbXVsY2FzdCA9IG5ldyBTaW11bGNhc3QoKTtcbiAgICAgICAgICAgIHZhciBwdWJsaWNMb2NhbERlc2MgPSBzaW11bGNhc3QucmV2ZXJzZVRyYW5zZm9ybUxvY2FsRGVzY3JpcHRpb24oc2RwKTtcbiAgICAgICAgICAgIHZhciBwdWJsaWNMb2NhbFNEUCA9IG5ldyBTRFAocHVibGljTG9jYWxEZXNjLnNkcCk7XG4gICAgICAgICAgICBwdWJsaWNMb2NhbFNEUC50b0ppbmdsZShhY2NlcHQsIHRoaXMuaW5pdGlhdG9yID09IHRoaXMubWUgPyAnaW5pdGlhdG9yJyA6ICdyZXNwb25kZXInKTtcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoYWNjZXB0LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFjayA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBhY2suc291cmNlID0gJ2Fuc3dlcic7XG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2Fjay5qaW5nbGUnLCBbc2VsZi5zaWQsIGFja10pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHN0YW56YSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSAoJChzdGFuemEpLmZpbmQoJ2Vycm9yJykubGVuZ3RoKSA/IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6ICQoc3RhbnphKS5maW5kKCdlcnJvcicpLmF0dHIoJ2NvZGUnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYXNvbjogJChzdGFuemEpLmZpbmQoJ2Vycm9yIDpmaXJzdCcpWzBdLnRhZ05hbWUsXG4gICAgICAgICAgICAgICAgICAgIH06e307XG4gICAgICAgICAgICAgICAgICAgIGVycm9yLnNvdXJjZSA9ICdhbnN3ZXInO1xuICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdlcnJvci5qaW5nbGUnLCBbc2VsZi5zaWQsIGVycm9yXSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAxMDAwMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZHAudHlwZSA9ICdwcmFuc3dlcic7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubG9jYWxTRFAubWVkaWEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzLmxvY2FsU0RQLm1lZGlhW2ldID0gdGhpcy5sb2NhbFNEUC5tZWRpYVtpXS5yZXBsYWNlKCdhPXNlbmRyZWN2XFxyXFxuJywgJ2E9aW5hY3RpdmVcXHJcXG4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubG9jYWxTRFAucmF3ID0gdGhpcy5sb2NhbFNEUC5zZXNzaW9uICsgJ1xcclxcbicgKyB0aGlzLmxvY2FsU0RQLm1lZGlhLmpvaW4oJycpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHNkcC5zZHAgPSB0aGlzLmxvY2FsU0RQLnJhdztcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLnNldExvY2FsRGVzY3JpcHRpb24oc2RwLFxuICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLnNldExvY2FsRGVzY3JpcHRpb24oc2VsZi5zaWQpO1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnc2V0TG9jYWxEZXNjcmlwdGlvbiBzdWNjZXNzJyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdzZXRMb2NhbERlc2NyaXB0aW9uIGZhaWxlZCcsIGUpO1xuICAgICAgICB9XG4gICAgKTtcbiAgICB2YXIgY2FuZHMgPSBTRFBVdGlsLmZpbmRfbGluZXModGhpcy5sb2NhbFNEUC5yYXcsICdhPWNhbmRpZGF0ZTonKTtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IGNhbmRzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciBjYW5kID0gU0RQVXRpbC5wYXJzZV9pY2VjYW5kaWRhdGUoY2FuZHNbal0pO1xuICAgICAgICBpZiAoY2FuZC50eXBlID09ICdzcmZseCcpIHtcbiAgICAgICAgICAgIHRoaXMuaGFkc3R1bmNhbmRpZGF0ZSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAoY2FuZC50eXBlID09ICdyZWxheScpIHtcbiAgICAgICAgICAgIHRoaXMuaGFkdHVybmNhbmRpZGF0ZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5KaW5nbGVTZXNzaW9uLnByb3RvdHlwZS5zZW5kVGVybWluYXRlID0gZnVuY3Rpb24gKHJlYXNvbiwgdGV4dCkge1xuICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgdGVybSA9ICRpcSh7dG86IHRoaXMucGVlcmppZCxcbiAgICAgICAgICAgIHR5cGU6ICdzZXQnfSlcbiAgICAgICAgICAgIC5jKCdqaW5nbGUnLCB7eG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6MScsXG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnc2Vzc2lvbi10ZXJtaW5hdGUnLFxuICAgICAgICAgICAgICAgIGluaXRpYXRvcjogdGhpcy5pbml0aWF0b3IsXG4gICAgICAgICAgICAgICAgc2lkOiB0aGlzLnNpZH0pXG4gICAgICAgICAgICAuYygncmVhc29uJylcbiAgICAgICAgICAgIC5jKHJlYXNvbiB8fCAnc3VjY2VzcycpO1xuXG4gICAgaWYgKHRleHQpIHtcbiAgICAgICAgdGVybS51cCgpLmMoJ3RleHQnKS50KHRleHQpO1xuICAgIH1cblxuICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEodGVybSxcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5wZWVyY29ubmVjdGlvbi5jbG9zZSgpO1xuICAgICAgICAgICAgc2VsZi5wZWVyY29ubmVjdGlvbiA9IG51bGw7XG4gICAgICAgICAgICBzZWxmLnRlcm1pbmF0ZSgpO1xuICAgICAgICAgICAgdmFyIGFjayA9IHt9O1xuICAgICAgICAgICAgYWNrLnNvdXJjZSA9ICd0ZXJtaW5hdGUnO1xuICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignYWNrLmppbmdsZScsIFtzZWxmLnNpZCwgYWNrXSk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzdGFuemEpIHtcbiAgICAgICAgICAgIHZhciBlcnJvciA9ICgkKHN0YW56YSkuZmluZCgnZXJyb3InKS5sZW5ndGgpID8ge1xuICAgICAgICAgICAgICAgIGNvZGU6ICQoc3RhbnphKS5maW5kKCdlcnJvcicpLmF0dHIoJ2NvZGUnKSxcbiAgICAgICAgICAgICAgICByZWFzb246ICQoc3RhbnphKS5maW5kKCdlcnJvciA6Zmlyc3QnKVswXS50YWdOYW1lLFxuICAgICAgICAgICAgfTp7fTtcbiAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2Fjay5qaW5nbGUnLCBbc2VsZi5zaWQsIGVycm9yXSk7XG4gICAgICAgIH0sXG4gICAgICAgIDEwMDAwKTtcbiAgICBpZiAodGhpcy5zdGF0c2ludGVydmFsICE9PSBudWxsKSB7XG4gICAgICAgIHdpbmRvdy5jbGVhckludGVydmFsKHRoaXMuc3RhdHNpbnRlcnZhbCk7XG4gICAgICAgIHRoaXMuc3RhdHNpbnRlcnZhbCA9IG51bGw7XG4gICAgfVxufTtcblxuSmluZ2xlU2Vzc2lvbi5wcm90b3R5cGUuc2VuZE11dGUgPSBmdW5jdGlvbiAobXV0ZWQsIGNvbnRlbnQpIHtcbiAgICB2YXIgaW5mbyA9ICRpcSh7dG86IHRoaXMucGVlcmppZCxcbiAgICAgICAgdHlwZTogJ3NldCd9KVxuICAgICAgICAuYygnamluZ2xlJywge3htbG5zOiAndXJuOnhtcHA6amluZ2xlOjEnLFxuICAgICAgICAgICAgYWN0aW9uOiAnc2Vzc2lvbi1pbmZvJyxcbiAgICAgICAgICAgIGluaXRpYXRvcjogdGhpcy5pbml0aWF0b3IsXG4gICAgICAgICAgICBzaWQ6IHRoaXMuc2lkIH0pO1xuICAgIGluZm8uYyhtdXRlZCA/ICdtdXRlJyA6ICd1bm11dGUnLCB7eG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6aW5mbzoxJ30pO1xuICAgIGluZm8uYXR0cnMoeydjcmVhdG9yJzogdGhpcy5tZSA9PSB0aGlzLmluaXRpYXRvciA/ICdjcmVhdG9yJyA6ICdyZXNwb25kZXInfSk7XG4gICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgICAgaW5mby5hdHRycyh7J25hbWUnOiBjb250ZW50fSk7XG4gICAgfVxuICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kKGluZm8pO1xufTtcblxuSmluZ2xlU2Vzc2lvbi5wcm90b3R5cGUuc2VuZFJpbmdpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGluZm8gPSAkaXEoe3RvOiB0aGlzLnBlZXJqaWQsXG4gICAgICAgIHR5cGU6ICdzZXQnfSlcbiAgICAgICAgLmMoJ2ppbmdsZScsIHt4bWxuczogJ3Vybjp4bXBwOmppbmdsZToxJyxcbiAgICAgICAgICAgIGFjdGlvbjogJ3Nlc3Npb24taW5mbycsXG4gICAgICAgICAgICBpbml0aWF0b3I6IHRoaXMuaW5pdGlhdG9yLFxuICAgICAgICAgICAgc2lkOiB0aGlzLnNpZCB9KTtcbiAgICBpbmZvLmMoJ3JpbmdpbmcnLCB7eG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6aW5mbzoxJ30pO1xuICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kKGluZm8pO1xufTtcblxuSmluZ2xlU2Vzc2lvbi5wcm90b3R5cGUuZ2V0U3RhdHMgPSBmdW5jdGlvbiAoaW50ZXJ2YWwpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJlY3YgPSB7YXVkaW86IDAsIHZpZGVvOiAwfTtcbiAgICB2YXIgbG9zdCA9IHthdWRpbzogMCwgdmlkZW86IDB9O1xuICAgIHZhciBsYXN0cmVjdiA9IHthdWRpbzogMCwgdmlkZW86IDB9O1xuICAgIHZhciBsYXN0bG9zdCA9IHthdWRpbzogMCwgdmlkZW86IDB9O1xuICAgIHZhciBsb3NzID0ge2F1ZGlvOiAwLCB2aWRlbzogMH07XG4gICAgdmFyIGRlbHRhID0ge2F1ZGlvOiAwLCB2aWRlbzogMH07XG4gICAgdGhpcy5zdGF0c2ludGVydmFsID0gd2luZG93LnNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHNlbGYgJiYgc2VsZi5wZWVyY29ubmVjdGlvbiAmJiBzZWxmLnBlZXJjb25uZWN0aW9uLmdldFN0YXRzKSB7XG4gICAgICAgICAgICBzZWxmLnBlZXJjb25uZWN0aW9uLmdldFN0YXRzKGZ1bmN0aW9uIChzdGF0cykge1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHRzID0gc3RhdHMucmVzdWx0KCk7XG4gICAgICAgICAgICAgICAgLy8gVE9ETzogdGhlcmUgYXJlIHNvIG11Y2ggc3RhdGlzdGljcyB5b3UgY2FuIGdldCBmcm9tIHRoaXMuLlxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVzdWx0cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0c1tpXS50eXBlID09ICdzc3JjJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhY2tldHNyZWN2ID0gcmVzdWx0c1tpXS5zdGF0KCdwYWNrZXRzUmVjZWl2ZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwYWNrZXRzbG9zdCA9IHJlc3VsdHNbaV0uc3RhdCgncGFja2V0c0xvc3QnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYWNrZXRzcmVjdiAmJiBwYWNrZXRzbG9zdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhY2tldHNyZWN2ID0gcGFyc2VJbnQocGFja2V0c3JlY3YsIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWNrZXRzbG9zdCA9IHBhcnNlSW50KHBhY2tldHNsb3N0LCAxMCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0c1tpXS5zdGF0KCdnb29nRnJhbWVSYXRlUmVjZWl2ZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXN0bG9zdC52aWRlbyA9IGxvc3QudmlkZW87XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RyZWN2LnZpZGVvID0gcmVjdi52aWRlbztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjdi52aWRlbyA9IHBhY2tldHNyZWN2O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb3N0LnZpZGVvID0gcGFja2V0c2xvc3Q7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFzdGxvc3QuYXVkaW8gPSBsb3N0LmF1ZGlvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXN0cmVjdi5hdWRpbyA9IHJlY3YuYXVkaW87XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlY3YuYXVkaW8gPSBwYWNrZXRzcmVjdjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9zdC5hdWRpbyA9IHBhY2tldHNsb3N0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkZWx0YS5hdWRpbyA9IHJlY3YuYXVkaW8gLSBsYXN0cmVjdi5hdWRpbztcbiAgICAgICAgICAgICAgICBkZWx0YS52aWRlbyA9IHJlY3YudmlkZW8gLSBsYXN0cmVjdi52aWRlbztcbiAgICAgICAgICAgICAgICBsb3NzLmF1ZGlvID0gKGRlbHRhLmF1ZGlvID4gMCkgPyBNYXRoLmNlaWwoMTAwICogKGxvc3QuYXVkaW8gLSBsYXN0bG9zdC5hdWRpbykgLyBkZWx0YS5hdWRpbykgOiAwO1xuICAgICAgICAgICAgICAgIGxvc3MudmlkZW8gPSAoZGVsdGEudmlkZW8gPiAwKSA/IE1hdGguY2VpbCgxMDAgKiAobG9zdC52aWRlbyAtIGxhc3Rsb3N0LnZpZGVvKSAvIGRlbHRhLnZpZGVvKSA6IDA7XG4gICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcigncGFja2V0bG9zcy5qaW5nbGUnLCBbc2VsZi5zaWQsIGxvc3NdKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSwgaW50ZXJ2YWwgfHwgMzAwMCk7XG4gICAgcmV0dXJuIHRoaXMuc3RhdHNpbnRlcnZhbDtcbn07XG5tb2R1bGUuZXhwb3J0cyA9IEppbmdsZVNlc3Npb247IiwidmFyIFNEUCA9IHJlcXVpcmUoXCIuL3N0cm9waGUuamluZ2xlLnNkcFwiKTtcblxuLyoqXG4gKiBCYXNlIGNsYXNzIGZvciBDb2xpYnJpRm9jdXMgYW5kIEppbmdsZVNlc3Npb24uXG4gKiBAcGFyYW0gY29ubmVjdGlvbiBTdHJvcGhlIGNvbm5lY3Rpb24gb2JqZWN0XG4gKiBAcGFyYW0gc2lkIG15IHNlc3Npb24gaWRlbnRpZmllcihyZXNvdXJjZSlcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBTZXNzaW9uQmFzZShjb25uZWN0aW9uLCBzaWQpe1xuXG4gICAgdGhpcy5jb25uZWN0aW9uID0gY29ubmVjdGlvbjtcbiAgICB0aGlzLnNpZCA9IHNpZDtcbn1cblxuXG5TZXNzaW9uQmFzZS5wcm90b3R5cGUubW9kaWZ5U291cmNlcyA9IGZ1bmN0aW9uIChzdWNjZXNzQ2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5tb2RpZnlTb3VyY2VzKGZ1bmN0aW9uKCl7XG4gICAgICAgIHNlbGYuc2V0TG9jYWxEZXNjcmlwdGlvbihzZWxmLnNpZCk7XG4gICAgICAgIGlmKHN1Y2Nlc3NDYWxsYmFjaykge1xuICAgICAgICAgICAgc3VjY2Vzc0NhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cblNlc3Npb25CYXNlLnByb3RvdHlwZS5zZXRMb2NhbERlc2NyaXB0aW9uID0gZnVuY3Rpb24gKHNpZCkge1xuICAgIC8vIHB1dCBvdXIgc3NyY3MgaW50byBwcmVzZW5jZSBzbyBvdGhlciBjbGllbnRzIGNhbiBpZGVudGlmeSBvdXIgc3RyZWFtXG4gICAgdmFyIHNlc3MgPSB0aGlzLmNvbm5lY3Rpb24uamluZ2xlLnNlc3Npb25zW3NpZF07XG4gICAgdmFyIG5ld3NzcmNzID0gW107XG4gICAgdmFyIHNpbXVsY2FzdCA9IG5ldyBTaW11bGNhc3QoKTtcbiAgICB2YXIgbWVkaWEgPSBzaW11bGNhc3QucGFyc2VNZWRpYShzZXNzLnBlZXJjb25uZWN0aW9uLmxvY2FsRGVzY3JpcHRpb24pO1xuICAgIG1lZGlhLmZvckVhY2goZnVuY3Rpb24gKG1lZGlhKSB7XG5cbiAgICAgICAgLy8gVE9ETyhncCkgbWF5YmUgZXhjbHVkZSBGSUQgc3RyZWFtcz9cbiAgICAgICAgT2JqZWN0LmtleXMobWVkaWEuc291cmNlcykuZm9yRWFjaChmdW5jdGlvbihzc3JjKSB7XG4gICAgICAgICAgICBuZXdzc3Jjcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAnc3NyYyc6IHNzcmMsXG4gICAgICAgICAgICAgICAgJ3R5cGUnOiBtZWRpYS50eXBlLFxuICAgICAgICAgICAgICAgICdkaXJlY3Rpb24nOiBtZWRpYS5kaXJlY3Rpb25cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBjb25zb2xlLmxvZygnbmV3IHNzcmNzJywgbmV3c3NyY3MpO1xuXG4gICAgLy8gSGF2ZSB0byBjbGVhciBwcmVzZW5jZSBtYXAgdG8gZ2V0IHJpZCBvZiByZW1vdmVkIHN0cmVhbXNcbiAgICB0aGlzLmNvbm5lY3Rpb24uZW11Yy5jbGVhclByZXNlbmNlTWVkaWEoKTtcblxuICAgIGlmIChuZXdzc3Jjcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDw9IG5ld3NzcmNzLmxlbmd0aDsgaSArKykge1xuICAgICAgICAgICAgLy8gQ2hhbmdlIHZpZGVvIHR5cGUgdG8gc2NyZWVuXG4gICAgICAgICAgICBpZiAobmV3c3NyY3NbaS0xXS50eXBlID09PSAndmlkZW8nICYmIGlzVXNpbmdTY3JlZW5TdHJlYW0pIHtcbiAgICAgICAgICAgICAgICBuZXdzc3Jjc1tpLTFdLnR5cGUgPSAnc2NyZWVuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5lbXVjLmFkZE1lZGlhVG9QcmVzZW5jZShpLFxuICAgICAgICAgICAgICAgIG5ld3NzcmNzW2ktMV0udHlwZSwgbmV3c3NyY3NbaS0xXS5zc3JjLCBuZXdzc3Jjc1tpLTFdLmRpcmVjdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbm5lY3Rpb24uZW11Yy5zZW5kUHJlc2VuY2UoKTtcbiAgICB9XG59XG5cblNlc3Npb25CYXNlLnByb3RvdHlwZS5hZGRTb3VyY2UgPSBmdW5jdGlvbiAoZWxlbSwgZnJvbUppZCkge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIEZJWE1FOiBkaXJ0eSB3YWl0aW5nXG4gICAgaWYgKCF0aGlzLnBlZXJjb25uZWN0aW9uLmxvY2FsRGVzY3JpcHRpb24pXG4gICAge1xuICAgICAgICBjb25zb2xlLndhcm4oXCJhZGRTb3VyY2UgLSBsb2NhbERlc2NyaXB0aW9uIG5vdCByZWFkeSB5ZXRcIilcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc2VsZi5hZGRTb3VyY2UoZWxlbSwgZnJvbUppZCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgMjAwXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLmFkZFNvdXJjZShlbGVtKTtcblxuICAgIHRoaXMubW9kaWZ5U291cmNlcygpO1xufTtcblxuU2Vzc2lvbkJhc2UucHJvdG90eXBlLnJlbW92ZVNvdXJjZSA9IGZ1bmN0aW9uIChlbGVtLCBmcm9tSmlkKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gRklYTUU6IGRpcnR5IHdhaXRpbmdcbiAgICBpZiAoIXRoaXMucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbilcbiAgICB7XG4gICAgICAgIGNvbnNvbGUud2FybihcInJlbW92ZVNvdXJjZSAtIGxvY2FsRGVzY3JpcHRpb24gbm90IHJlYWR5IHlldFwiKVxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzZWxmLnJlbW92ZVNvdXJjZShlbGVtLCBmcm9tSmlkKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAyMDBcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24ucmVtb3ZlU291cmNlKGVsZW0pO1xuXG4gICAgdGhpcy5tb2RpZnlTb3VyY2VzKCk7XG59O1xuLyoqXG4gKiBTd2l0Y2hlcyB2aWRlbyBzdHJlYW1zLlxuICogQHBhcmFtIG5ld19zdHJlYW0gbmV3IHN0cmVhbSB0aGF0IHdpbGwgYmUgdXNlZCBhcyB2aWRlbyBvZiB0aGlzIHNlc3Npb24uXG4gKiBAcGFyYW0gb2xkU3RyZWFtIG9sZCB2aWRlbyBzdHJlYW0gb2YgdGhpcyBzZXNzaW9uLlxuICogQHBhcmFtIHN1Y2Nlc3NfY2FsbGJhY2sgY2FsbGJhY2sgZXhlY3V0ZWQgYWZ0ZXIgc3VjY2Vzc2Z1bCBzdHJlYW0gc3dpdGNoLlxuICovXG5TZXNzaW9uQmFzZS5wcm90b3R5cGUuc3dpdGNoU3RyZWFtcyA9IGZ1bmN0aW9uIChuZXdfc3RyZWFtLCBvbGRTdHJlYW0sIHN1Y2Nlc3NfY2FsbGJhY2spIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIFN0b3AgdGhlIHN0cmVhbSB0byB0cmlnZ2VyIG9uZW5kZWQgZXZlbnQgZm9yIG9sZCBzdHJlYW1cbiAgICBvbGRTdHJlYW0uc3RvcCgpO1xuXG4gICAgLy8gUmVtZW1iZXIgU0RQIHRvIGZpZ3VyZSBvdXQgYWRkZWQvcmVtb3ZlZCBTU1JDc1xuICAgIHZhciBvbGRTZHAgPSBudWxsO1xuICAgIGlmKHNlbGYucGVlcmNvbm5lY3Rpb24pIHtcbiAgICAgICAgaWYoc2VsZi5wZWVyY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBvbGRTZHAgPSBuZXcgU0RQKHNlbGYucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbi5zZHApO1xuICAgICAgICB9XG4gICAgICAgIHNlbGYucGVlcmNvbm5lY3Rpb24ucmVtb3ZlU3RyZWFtKG9sZFN0cmVhbSk7XG4gICAgICAgIHNlbGYucGVlcmNvbm5lY3Rpb24uYWRkU3RyZWFtKG5ld19zdHJlYW0pO1xuICAgIH1cblxuICAgIHNlbGYuY29ubmVjdGlvbi5qaW5nbGUubG9jYWxWaWRlbyA9IG5ld19zdHJlYW07XG5cblxuICAgIC8vIENvbmZlcmVuY2UgaXMgbm90IGFjdGl2ZVxuICAgIGlmKCFvbGRTZHAgfHwgIXNlbGYucGVlcmNvbm5lY3Rpb24pIHtcbiAgICAgICAgc3VjY2Vzc19jYWxsYmFjaygpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc2VsZi5wZWVyY29ubmVjdGlvbi5zd2l0Y2hzdHJlYW1zID0gdHJ1ZTtcbiAgICBzZWxmLm1vZGlmeVNvdXJjZXMoZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdtb2RpZnkgc291cmNlcyBkb25lJyk7XG5cbiAgICAgICAgdmFyIG5ld1NkcCA9IG5ldyBTRFAoc2VsZi5wZWVyY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uLnNkcCk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiU0RQc1wiLCBvbGRTZHAsIG5ld1NkcCk7XG4gICAgICAgIHNlbGYubm90aWZ5TXlTU1JDVXBkYXRlKG9sZFNkcCwgbmV3U2RwKTtcblxuICAgICAgICBzdWNjZXNzX2NhbGxiYWNrKCk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEZpZ3VyZXMgb3V0IGFkZGVkL3JlbW92ZWQgc3NyY3MgYW5kIHNlbmQgdXBkYXRlIElRcy5cbiAqIEBwYXJhbSBvbGRfc2RwIFNEUCBvYmplY3QgZm9yIG9sZCBkZXNjcmlwdGlvbi5cbiAqIEBwYXJhbSBuZXdfc2RwIFNEUCBvYmplY3QgZm9yIG5ldyBkZXNjcmlwdGlvbi5cbiAqL1xuU2Vzc2lvbkJhc2UucHJvdG90eXBlLm5vdGlmeU15U1NSQ1VwZGF0ZSA9IGZ1bmN0aW9uIChvbGRfc2RwLCBuZXdfc2RwKSB7XG5cbiAgICB2YXIgb2xkX21lZGlhID0gb2xkX3NkcC5nZXRNZWRpYVNzcmNNYXAoKTtcbiAgICB2YXIgbmV3X21lZGlhID0gbmV3X3NkcC5nZXRNZWRpYVNzcmNNYXAoKTtcbiAgICAvL2NvbnNvbGUubG9nKFwib2xkL25ldyBtZWRpYXM6IFwiLCBvbGRfbWVkaWEsIG5ld19tZWRpYSk7XG5cbiAgICB2YXIgdG9BZGQgPSBvbGRfc2RwLmdldE5ld01lZGlhKG5ld19zZHApO1xuICAgIHZhciB0b1JlbW92ZSA9IG5ld19zZHAuZ2V0TmV3TWVkaWEob2xkX3NkcCk7XG4gICAgLy9jb25zb2xlLmxvZyhcInRvIGFkZFwiLCB0b0FkZCk7XG4gICAgLy9jb25zb2xlLmxvZyhcInRvIHJlbW92ZVwiLCB0b1JlbW92ZSk7XG4gICAgaWYoT2JqZWN0LmtleXModG9SZW1vdmUpLmxlbmd0aCA+IDApe1xuICAgICAgICB0aGlzLnNlbmRTU1JDVXBkYXRlKHRvUmVtb3ZlLCBudWxsLCBmYWxzZSk7XG4gICAgfVxuICAgIGlmKE9iamVjdC5rZXlzKHRvQWRkKS5sZW5ndGggPiAwKXtcbiAgICAgICAgdGhpcy5zZW5kU1NSQ1VwZGF0ZSh0b0FkZCwgbnVsbCwgdHJ1ZSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBFbXB0eSBtZXRob2QgdGhhdCBkb2VzIG5vdGhpbmcgYnkgZGVmYXVsdC4gSXQgc2hvdWxkIHNlbmQgU1NSQyB1cGRhdGUgSVFzIHRvIHNlc3Npb24gcGFydGljaXBhbnRzLlxuICogQHBhcmFtIHNkcE1lZGlhU3NyY3MgYXJyYXkgb2ZcbiAqIEBwYXJhbSBmcm9tSmlkXG4gKiBAcGFyYW0gaXNBZGRcbiAqL1xuU2Vzc2lvbkJhc2UucHJvdG90eXBlLnNlbmRTU1JDVXBkYXRlID0gZnVuY3Rpb24oc2RwTWVkaWFTc3JjcywgZnJvbUppZCwgaXNBZGQpIHtcbiAgICAvL0ZJWE1FOiBwdXQgZGVmYXVsdCBpbXBsZW1lbnRhdGlvbiBoZXJlKG1heWJlIGZyb20gSmluZ2xlU2Vzc2lvbj8pXG59XG5cbi8qKlxuICogU2VuZHMgU1NSQyB1cGRhdGUgSVEuXG4gKiBAcGFyYW0gc2RwTWVkaWFTc3JjcyBTU1JDcyBtYXAgb2J0YWluZWQgZnJvbSBTRFAuZ2V0TmV3TWVkaWEuIENudGFpbnMgU1NSQ3MgdG8gYWRkL3JlbW92ZS5cbiAqIEBwYXJhbSBzaWQgc2Vzc2lvbiBpZGVudGlmaWVyIHRoYXQgd2lsbCBiZSBwdXQgaW50byB0aGUgSVEuXG4gKiBAcGFyYW0gaW5pdGlhdG9yIGluaXRpYXRvciBpZGVudGlmaWVyLlxuICogQHBhcmFtIHRvSmlkIGRlc3RpbmF0aW9uIEppZFxuICogQHBhcmFtIGlzQWRkIGluZGljYXRlcyBpZiB0aGlzIGlzIHJlbW92ZSBvciBhZGQgb3BlcmF0aW9uLlxuICovXG5TZXNzaW9uQmFzZS5wcm90b3R5cGUuc2VuZFNTUkNVcGRhdGVJcSA9IGZ1bmN0aW9uKHNkcE1lZGlhU3NyY3MsIHNpZCwgaW5pdGlhdG9yLCB0b0ppZCwgaXNBZGQpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbW9kaWZ5ID0gJGlxKHt0bzogdG9KaWQsIHR5cGU6ICdzZXQnfSlcbiAgICAgICAgLmMoJ2ppbmdsZScsIHtcbiAgICAgICAgICAgIHhtbG5zOiAndXJuOnhtcHA6amluZ2xlOjEnLFxuICAgICAgICAgICAgYWN0aW9uOiBpc0FkZCA/ICdzb3VyY2UtYWRkJyA6ICdzb3VyY2UtcmVtb3ZlJyxcbiAgICAgICAgICAgIGluaXRpYXRvcjogaW5pdGlhdG9yLFxuICAgICAgICAgICAgc2lkOiBzaWRcbiAgICAgICAgfVxuICAgICk7XG4gICAgLy8gRklYTUU6IG9ubHkgYW5ub3VuY2UgdmlkZW8gc3NyY3Mgc2luY2Ugd2UgbWl4IGF1ZGlvIGFuZCBkb250IG5lZWRcbiAgICAvLyAgICAgIHRoZSBhdWRpbyBzc3JjcyB0aGVyZWZvcmVcbiAgICB2YXIgbW9kaWZpZWQgPSBmYWxzZTtcbiAgICBPYmplY3Qua2V5cyhzZHBNZWRpYVNzcmNzKS5mb3JFYWNoKGZ1bmN0aW9uKGNoYW5uZWxOdW0pe1xuICAgICAgICBtb2RpZmllZCA9IHRydWU7XG4gICAgICAgIHZhciBjaGFubmVsID0gc2RwTWVkaWFTc3Jjc1tjaGFubmVsTnVtXTtcbiAgICAgICAgbW9kaWZ5LmMoJ2NvbnRlbnQnLCB7bmFtZTogY2hhbm5lbC5tZWRpYVR5cGV9KTtcblxuICAgICAgICBtb2RpZnkuYygnZGVzY3JpcHRpb24nLCB7eG1sbnM6J3Vybjp4bXBwOmppbmdsZTphcHBzOnJ0cDoxJywgbWVkaWE6IGNoYW5uZWwubWVkaWFUeXBlfSk7XG4gICAgICAgIC8vIEZJWE1FOiBub3QgY29tcGxldGx5IHN1cmUgdGhpcyBvcGVyYXRlcyBvbiBibG9ja3MgYW5kIC8gb3IgaGFuZGxlcyBkaWZmZXJlbnQgc3NyY3MgY29ycmVjdGx5XG4gICAgICAgIC8vIGdlbmVyYXRlIHNvdXJjZXMgZnJvbSBsaW5lc1xuICAgICAgICBPYmplY3Qua2V5cyhjaGFubmVsLnNzcmNzKS5mb3JFYWNoKGZ1bmN0aW9uKHNzcmNOdW0pIHtcbiAgICAgICAgICAgIHZhciBtZWRpYVNzcmMgPSBjaGFubmVsLnNzcmNzW3NzcmNOdW1dO1xuICAgICAgICAgICAgbW9kaWZ5LmMoJ3NvdXJjZScsIHsgeG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6c3NtYTowJyB9KTtcbiAgICAgICAgICAgIG1vZGlmeS5hdHRycyh7c3NyYzogbWVkaWFTc3JjLnNzcmN9KTtcbiAgICAgICAgICAgIC8vIGl0ZXJhdGUgb3ZlciBzc3JjIGxpbmVzXG4gICAgICAgICAgICBtZWRpYVNzcmMubGluZXMuZm9yRWFjaChmdW5jdGlvbiAobGluZSkge1xuICAgICAgICAgICAgICAgIHZhciBpZHggPSBsaW5lLmluZGV4T2YoJyAnKTtcbiAgICAgICAgICAgICAgICB2YXIga3YgPSBsaW5lLnN1YnN0cihpZHggKyAxKTtcbiAgICAgICAgICAgICAgICBtb2RpZnkuYygncGFyYW1ldGVyJyk7XG4gICAgICAgICAgICAgICAgaWYgKGt2LmluZGV4T2YoJzonKSA9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBtb2RpZnkuYXR0cnMoeyBuYW1lOiBrdiB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBtb2RpZnkuYXR0cnMoeyBuYW1lOiBrdi5zcGxpdCgnOicsIDIpWzBdIH0pO1xuICAgICAgICAgICAgICAgICAgICBtb2RpZnkuYXR0cnMoeyB2YWx1ZToga3Yuc3BsaXQoJzonLCAyKVsxXSB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbW9kaWZ5LnVwKCk7IC8vIGVuZCBvZiBwYXJhbWV0ZXJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbW9kaWZ5LnVwKCk7IC8vIGVuZCBvZiBzb3VyY2VcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gZ2VuZXJhdGUgc291cmNlIGdyb3VwcyBmcm9tIGxpbmVzXG4gICAgICAgIGNoYW5uZWwuc3NyY0dyb3Vwcy5mb3JFYWNoKGZ1bmN0aW9uKHNzcmNHcm91cCkge1xuICAgICAgICAgICAgaWYgKHNzcmNHcm91cC5zc3Jjcy5sZW5ndGggIT0gMCkge1xuXG4gICAgICAgICAgICAgICAgbW9kaWZ5LmMoJ3NzcmMtZ3JvdXAnLCB7XG4gICAgICAgICAgICAgICAgICAgIHNlbWFudGljczogc3NyY0dyb3VwLnNlbWFudGljcyxcbiAgICAgICAgICAgICAgICAgICAgeG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6c3NtYTowJ1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgc3NyY0dyb3VwLnNzcmNzLmZvckVhY2goZnVuY3Rpb24gKHNzcmMpIHtcbiAgICAgICAgICAgICAgICAgICAgbW9kaWZ5LmMoJ3NvdXJjZScsIHsgc3NyYzogc3NyYyB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLnVwKCk7IC8vIGVuZCBvZiBzb3VyY2VcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBtb2RpZnkudXAoKTsgLy8gZW5kIG9mIHNzcmMtZ3JvdXBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgbW9kaWZ5LnVwKCk7IC8vIGVuZCBvZiBkZXNjcmlwdGlvblxuICAgICAgICBtb2RpZnkudXAoKTsgLy8gZW5kIG9mIGNvbnRlbnRcbiAgICB9KTtcbiAgICBpZiAobW9kaWZpZWQpIHtcbiAgICAgICAgc2VsZi5jb25uZWN0aW9uLnNlbmRJUShtb2RpZnksXG4gICAgICAgICAgICBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKCdnb3QgbW9kaWZ5IHJlc3VsdCcsIHJlcyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2dvdCBtb2RpZnkgZXJyb3InLCBlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdtb2RpZmljYXRpb24gbm90IG5lY2Vzc2FyeScpO1xuICAgIH1cbn07XG5cbi8vIFNEUC1iYXNlZCBtdXRlIGJ5IGdvaW5nIHJlY3Zvbmx5L3NlbmRyZWN2XG4vLyBGSVhNRTogc2hvdWxkIHByb2JhYmx5IGJsYWNrIG91dCB0aGUgc2NyZWVuIGFzIHdlbGxcblNlc3Npb25CYXNlLnByb3RvdHlwZS50b2dnbGVWaWRlb011dGUgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICB2YXIgc3RyZWFtID0gUlRDQWN0aXZhdG9yLmdldFJUQ1NlcnZpY2UoKS5sb2NhbEF1ZGlvO1xuICAgIGlmICghc3RyZWFtKVxuICAgICAgICByZXR1cm47XG4gICAgdmFyIGlzbXV0ZWQgPSBzdHJlYW0ubXV0ZSgpO1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uaGFyZE11dGVWaWRlbyhpc211dGVkKTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5tb2RpZnlTb3VyY2VzKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5jb25uZWN0aW9uLmVtdWMuYWRkVmlkZW9JbmZvVG9QcmVzZW5jZShpc211dGVkKTtcbiAgICAgICAgc2VsZi5jb25uZWN0aW9uLmVtdWMuc2VuZFByZXNlbmNlKCk7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhpc211dGVkKTtcbiAgICB9KCkpO1xufTtcblxuU2Vzc2lvbkJhc2UucHJvdG90eXBlLnRvZ2dsZUF1ZGlvTXV0ZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIHZhciBzdHJlYW0gPSBSVENBY3RpdmF0b3IuZ2V0UlRDU2VydmljZSgpLmxvY2FsQXVkaW87XG4gICAgaWYgKCFzdHJlYW0pXG4gICAgICAgIHJldHVybjtcbiAgICB2YXIgYXVkaW9FbmFibGVkID0gc3RyZWFtLm11dGUoKTtcbiAgICAvLyBpc011dGVkIGlzIHRoZSBvcHBvc2l0ZSBvZiBhdWRpb0VuYWJsZWRcbiAgICB0aGlzLmNvbm5lY3Rpb24uZW11Yy5hZGRBdWRpb0luZm9Ub1ByZXNlbmNlKGF1ZGlvRW5hYmxlZCk7XG4gICAgdGhpcy5jb25uZWN0aW9uLmVtdWMuc2VuZFByZXNlbmNlKCk7XG4gICAgY2FsbGJhY2soYXVkaW9FbmFibGVkKTtcbn1cblxuXG5TZXNzaW9uQmFzZS5wcm90b3R5cGUub25JY2VDb25uZWN0aW9uU3RhdGVDaGFuZ2UgPSBmdW5jdGlvbiAoc2lkLCBzZXNzaW9uKSB7XG4gICAgc3dpdGNoIChzZXNzaW9uLnBlZXJjb25uZWN0aW9uLmljZUNvbm5lY3Rpb25TdGF0ZSkge1xuICAgICAgICBjYXNlICdjaGVja2luZyc6XG4gICAgICAgICAgICBzZXNzaW9uLnRpbWVDaGVja2luZyA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICBzZXNzaW9uLmZpcnN0Y29ubmVjdCA9IHRydWU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnY29tcGxldGVkJzogLy8gb24gY2FsbGVyIHNpZGVcbiAgICAgICAgY2FzZSAnY29ubmVjdGVkJzpcbiAgICAgICAgICAgIGlmIChzZXNzaW9uLmZpcnN0Y29ubmVjdCkge1xuICAgICAgICAgICAgICAgIHNlc3Npb24uZmlyc3Rjb25uZWN0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdmFyIG1ldGFkYXRhID0ge307XG4gICAgICAgICAgICAgICAgbWV0YWRhdGEuc2V0dXBUaW1lID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKSAtIHNlc3Npb24udGltZUNoZWNraW5nO1xuICAgICAgICAgICAgICAgIHNlc3Npb24ucGVlcmNvbm5lY3Rpb24uZ2V0U3RhdHMoZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgICAgICAgICByZXMucmVzdWx0KCkuZm9yRWFjaChmdW5jdGlvbiAocmVwb3J0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVwb3J0LnR5cGUgPT0gJ2dvb2dDYW5kaWRhdGVQYWlyJyAmJiByZXBvcnQuc3RhdCgnZ29vZ0FjdGl2ZUNvbm5lY3Rpb24nKSA9PSAndHJ1ZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRhZGF0YS5sb2NhbENhbmRpZGF0ZVR5cGUgPSByZXBvcnQuc3RhdCgnZ29vZ0xvY2FsQ2FuZGlkYXRlVHlwZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGFkYXRhLnJlbW90ZUNhbmRpZGF0ZVR5cGUgPSByZXBvcnQuc3RhdCgnZ29vZ1JlbW90ZUNhbmRpZGF0ZVR5cGUnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxvZyBwYWlyIGFzIHdlbGwgc28gd2UgY2FuIGdldCBuaWNlIHBpZSBjaGFydHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRhZGF0YS5jYW5kaWRhdGVQYWlyID0gcmVwb3J0LnN0YXQoJ2dvb2dMb2NhbENhbmRpZGF0ZVR5cGUnKSArICc7JyArIHJlcG9ydC5zdGF0KCdnb29nUmVtb3RlQ2FuZGlkYXRlVHlwZScpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlcG9ydC5zdGF0KCdnb29nUmVtb3RlQWRkcmVzcycpLmluZGV4T2YoJ1snKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRhZGF0YS5pcHY2ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuLy8gICAgICAgICAgICAgICAgICAgIHRyYWNrVXNhZ2UoJ2ljZUNvbm5lY3RlZCcsIG1ldGFkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZShcIi4uL3V0aWwvdHJhY2tpbmcuanNcIikoJ2ljZUNvbm5lY3RlZCcsIG1ldGFkYXRhKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHdhaXRGb3JQcmVzZW5jZShkYXRhLCBzaWQpIHtcbiAgICAgICAgdmFyIHNlc3MgPSB0aGlzLmNvbm5lY3Rpb24uamluZ2xlLnNlc3Npb25zW3NpZF07XG5cbiAgICAgICAgdmFyIHRoZXNzcmM7XG4gICAgICAgIC8vIGxvb2sgdXAgYW4gYXNzb2NpYXRlZCBKSUQgZm9yIGEgc3RyZWFtIGlkXG4gICAgICAgIGlmIChkYXRhLnN0cmVhbS5pZC5pbmRleE9mKCdtaXhlZG1zbGFiZWwnKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIC8vIGxvb2sgb25seSBhdCBhPXNzcmM6IGFuZCBfbm90XyBhdCBhPXNzcmMtZ3JvdXA6IGxpbmVzXG4gICAgICAgICAgICB2YXIgc3NyY2xpbmVzXG4gICAgICAgICAgICAgICAgPSBTRFBVdGlsLmZpbmRfbGluZXMoc2Vzcy5wZWVyY29ubmVjdGlvbi5yZW1vdGVEZXNjcmlwdGlvbi5zZHAsICdhPXNzcmM6Jyk7XG4gICAgICAgICAgICBzc3JjbGluZXMgPSBzc3JjbGluZXMuZmlsdGVyKGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgICAgICAgICAgLy8gTk9URShncCkgcHJldmlvdXNseSB3ZSBmaWx0ZXJlZCBvbiB0aGUgbXNsYWJlbCwgYnV0IHRoYXQgcHJvcGVydHlcbiAgICAgICAgICAgICAgICAvLyBpcyBub3QgYWx3YXlzIHByZXNlbnQuXG4gICAgICAgICAgICAgICAgLy8gcmV0dXJuIGxpbmUuaW5kZXhPZignbXNsYWJlbDonICsgZGF0YS5zdHJlYW0ubGFiZWwpICE9PSAtMTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGluZS5pbmRleE9mKCdtc2lkOicgKyBkYXRhLnN0cmVhbS5pZCkgIT09IC0xO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoc3NyY2xpbmVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoZXNzcmMgPSBzc3JjbGluZXNbMF0uc3Vic3RyaW5nKDcpLnNwbGl0KCcgJylbMF07XG5cbiAgICAgICAgICAgICAgICAvLyBXZSBzaWduYWwgb3VyIHN0cmVhbXMgKHRocm91Z2ggSmluZ2xlIHRvIHRoZSBmb2N1cykgYmVmb3JlIHdlIHNldFxuICAgICAgICAgICAgICAgIC8vIG91ciBwcmVzZW5jZSAodGhyb3VnaCB3aGljaCBwZWVycyBhc3NvY2lhdGUgcmVtb3RlIHN0cmVhbXMgdG9cbiAgICAgICAgICAgICAgICAvLyBqaWRzKS4gU28sIGl0IG1pZ2h0IGFycml2ZSB0aGF0IGEgcmVtb3RlIHN0cmVhbSBpcyBhZGRlZCBidXRcbiAgICAgICAgICAgICAgICAvLyBzc3JjMmppZCBpcyBub3QgeWV0IHVwZGF0ZWQgYW5kIHRodXMgZGF0YS5wZWVyamlkIGNhbm5vdCBiZVxuICAgICAgICAgICAgICAgIC8vIHN1Y2Nlc3NmdWxseSBzZXQuIEhlcmUgd2Ugd2FpdCBmb3IgdXAgdG8gYSBzZWNvbmQgZm9yIHRoZVxuICAgICAgICAgICAgICAgIC8vIHByZXNlbmNlIHRvIGFycml2ZS5cblxuICAgICAgICAgICAgICAgIGlmICghWE1QUEFjdGl2YXRvci5nZXRKSURGcm9tU1NSQyh0aGVzc3JjKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPKGdwKSBsaW1pdCB3YWl0IGR1cmF0aW9uIHRvIDEgc2VjLlxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKGQsIHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YWl0Rm9yUHJlc2VuY2UoZCwgcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0oZGF0YSwgc2lkKSwgMjUwKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIG9rIHRvIG92ZXJ3cml0ZSB0aGUgb25lIGZyb20gZm9jdXM/IG1pZ2h0IHNhdmUgd29yayBpbiBjb2xpYnJpLmpzXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2Fzc29jaWF0ZWQgamlkJywgWE1QUEFjdGl2YXRvci5nZXRKSURGcm9tU1NSQyh0aGVzc3JjKSwgZGF0YS5wZWVyamlkKTtcbiAgICAgICAgICAgICAgICBpZiAoWE1QUEFjdGl2YXRvci5nZXRKSURGcm9tU1NSQyh0aGVzc3JjKSkge1xuICAgICAgICAgICAgICAgICAgICBkYXRhLnBlZXJqaWQgPSBYTVBQQWN0aXZhdG9yLmdldEpJREZyb21TU1JDKHRoZXNzcmMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBpc1ZpZGVvID0gZGF0YS5zdHJlYW0uZ2V0VmlkZW9UcmFja3MoKS5sZW5ndGggPiAwO1xuXG4gICAgICAgIFJUQ0FjdGl2YXRvci5nZXRSVENTZXJ2aWNlKCkuY3JlYXRlUmVtb3RlU3RyZWFtKGRhdGEsIHNpZCwgdGhlc3NyYyk7XG5cbiAgICAgICAgLy8gYW4gYXR0ZW1wdCB0byB3b3JrIGFyb3VuZCBodHRwczovL2dpdGh1Yi5jb20vaml0c2kvaml0bWVldC9pc3N1ZXMvMzJcbiAgICAgICAgaWYgKGlzVmlkZW8gJiZcbiAgICAgICAgICAgIGRhdGEucGVlcmppZCAmJiBzZXNzLnBlZXJqaWQgPT09IGRhdGEucGVlcmppZCAmJlxuICAgICAgICAgICAgZGF0YS5zdHJlYW0uZ2V0VmlkZW9UcmFja3MoKS5sZW5ndGggPT09IDAgJiZcbiAgICAgICAgICAgIFJUQ0FjdGl2YXRvci5nZXRSVENTZXJ2aWNlKCkubG9jYWxWaWRlby5nZXRWaWRlb1RyYWNrcygpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2VuZEtleWZyYW1lKHNlc3MucGVlcmNvbm5lY3Rpb24pO1xuICAgICAgICAgICAgfSwgMzAwMCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4vLyBhbiBhdHRlbXB0IHRvIHdvcmsgYXJvdW5kIGh0dHBzOi8vZ2l0aHViLmNvbS9qaXRzaS9qaXRtZWV0L2lzc3Vlcy8zMlxuICAgIGZ1bmN0aW9uIHNlbmRLZXlmcmFtZShwYykge1xuICAgICAgICBjb25zb2xlLmxvZygnc2VuZGtleWZyYW1lJywgcGMuaWNlQ29ubmVjdGlvblN0YXRlKTtcbiAgICAgICAgaWYgKHBjLmljZUNvbm5lY3Rpb25TdGF0ZSAhPT0gJ2Nvbm5lY3RlZCcpIHJldHVybjsgLy8gc2FmZS4uLlxuICAgICAgICBwYy5zZXRSZW1vdGVEZXNjcmlwdGlvbihcbiAgICAgICAgICAgIHBjLnJlbW90ZURlc2NyaXB0aW9uLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHBjLmNyZWF0ZUFuc3dlcihcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKG1vZGlmaWVkQW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYy5zZXRMb2NhbERlc2NyaXB0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZGlmaWVkQW5zd2VyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm9vcFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0cmlnZ2VyS2V5ZnJhbWUgc2V0TG9jYWxEZXNjcmlwdGlvbiBmYWlsZWQnLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLnNob3dFcnJvcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3RyaWdnZXJLZXlmcmFtZSBjcmVhdGVBbnN3ZXIgZmFpbGVkJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIuc2hvd0Vycm9yKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0cmlnZ2VyS2V5ZnJhbWUgc2V0UmVtb3RlRGVzY3JpcHRpb24gZmFpbGVkJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLnNob3dFcnJvcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cbn1cblxuXG5TZXNzaW9uQmFzZS5wcm90b3R5cGUud2FpdEZvclByZXNlbmNlID0gZnVuY3Rpb24gKGRhdGEsIHNpZCkge1xuICAgIHZhciBzZXNzID0gdGhpcy5jb25uZWN0aW9uLmppbmdsZS5zZXNzaW9uc1tzaWRdO1xuXG4gICAgdmFyIHRoZXNzcmM7XG4gICAgLy8gbG9vayB1cCBhbiBhc3NvY2lhdGVkIEpJRCBmb3IgYSBzdHJlYW0gaWRcbiAgICBpZiAoZGF0YS5zdHJlYW0uaWQuaW5kZXhPZignbWl4ZWRtc2xhYmVsJykgPT09IC0xKSB7XG4gICAgICAgIC8vIGxvb2sgb25seSBhdCBhPXNzcmM6IGFuZCBfbm90XyBhdCBhPXNzcmMtZ3JvdXA6IGxpbmVzXG4gICAgICAgIHZhciBzc3JjbGluZXNcbiAgICAgICAgICAgID0gU0RQVXRpbC5maW5kX2xpbmVzKHNlc3MucGVlcmNvbm5lY3Rpb24ucmVtb3RlRGVzY3JpcHRpb24uc2RwLCAnYT1zc3JjOicpO1xuICAgICAgICBzc3JjbGluZXMgPSBzc3JjbGluZXMuZmlsdGVyKGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgICAgICAvLyBOT1RFKGdwKSBwcmV2aW91c2x5IHdlIGZpbHRlcmVkIG9uIHRoZSBtc2xhYmVsLCBidXQgdGhhdCBwcm9wZXJ0eVxuICAgICAgICAgICAgLy8gaXMgbm90IGFsd2F5cyBwcmVzZW50LlxuICAgICAgICAgICAgLy8gcmV0dXJuIGxpbmUuaW5kZXhPZignbXNsYWJlbDonICsgZGF0YS5zdHJlYW0ubGFiZWwpICE9PSAtMTtcbiAgICAgICAgICAgIHJldHVybiBsaW5lLmluZGV4T2YoJ21zaWQ6JyArIGRhdGEuc3RyZWFtLmlkKSAhPT0gLTE7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoc3NyY2xpbmVzLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhlc3NyYyA9IHNzcmNsaW5lc1swXS5zdWJzdHJpbmcoNykuc3BsaXQoJyAnKVswXTtcblxuICAgICAgICAgICAgLy8gV2Ugc2lnbmFsIG91ciBzdHJlYW1zICh0aHJvdWdoIEppbmdsZSB0byB0aGUgZm9jdXMpIGJlZm9yZSB3ZSBzZXRcbiAgICAgICAgICAgIC8vIG91ciBwcmVzZW5jZSAodGhyb3VnaCB3aGljaCBwZWVycyBhc3NvY2lhdGUgcmVtb3RlIHN0cmVhbXMgdG9cbiAgICAgICAgICAgIC8vIGppZHMpLiBTbywgaXQgbWlnaHQgYXJyaXZlIHRoYXQgYSByZW1vdGUgc3RyZWFtIGlzIGFkZGVkIGJ1dFxuICAgICAgICAgICAgLy8gc3NyYzJqaWQgaXMgbm90IHlldCB1cGRhdGVkIGFuZCB0aHVzIGRhdGEucGVlcmppZCBjYW5ub3QgYmVcbiAgICAgICAgICAgIC8vIHN1Y2Nlc3NmdWxseSBzZXQuIEhlcmUgd2Ugd2FpdCBmb3IgdXAgdG8gYSBzZWNvbmQgZm9yIHRoZVxuICAgICAgICAgICAgLy8gcHJlc2VuY2UgdG8gYXJyaXZlLlxuXG4gICAgICAgICAgICBpZiAoIVhNUFBBY3RpdmF0b3IuZ2V0SklERnJvbVNTUkModGhlc3NyYykpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPKGdwKSBsaW1pdCB3YWl0IGR1cmF0aW9uIHRvIDEgc2VjLlxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oZCwgcykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3YWl0Rm9yUHJlc2VuY2UoZCwgcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KGRhdGEsIHNpZCksIDI1MCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBvayB0byBvdmVyd3JpdGUgdGhlIG9uZSBmcm9tIGZvY3VzPyBtaWdodCBzYXZlIHdvcmsgaW4gY29saWJyaS5qc1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2Fzc29jaWF0ZWQgamlkJywgWE1QUEFjdGl2YXRvci5nZXRKSURGcm9tU1NSQyh0aGVzc3JjKSwgZGF0YS5wZWVyamlkKTtcbiAgICAgICAgICAgIGlmIChYTVBQQWN0aXZhdG9yLmdldEpJREZyb21TU1JDKHRoZXNzcmMpKSB7XG4gICAgICAgICAgICAgICAgZGF0YS5wZWVyamlkID0gWE1QUEFjdGl2YXRvci5nZXRKSURGcm9tU1NSQyh0aGVzc3JjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBpc1ZpZGVvID0gZGF0YS5zdHJlYW0uZ2V0VmlkZW9UcmFja3MoKS5sZW5ndGggPiAwO1xuXG5cbiAgICAvLyBUT0RPIHRoaXMgbXVzdCBiZSBkb25lIHdpdGggbGlzdGVuZXJzXG4gICAgUlRDQWN0aXZhdG9yLmdldFJUQ1NlcnZpY2UoKS5jcmVhdGVSZW1vdGVTdHJlYW0oZGF0YSwgc2lkLCB0aGVzc3JjKTtcblxuICAgIC8vIGFuIGF0dGVtcHQgdG8gd29yayBhcm91bmQgaHR0cHM6Ly9naXRodWIuY29tL2ppdHNpL2ppdG1lZXQvaXNzdWVzLzMyXG4gICAgaWYgKGlzVmlkZW8gJiZcbiAgICAgICAgZGF0YS5wZWVyamlkICYmIHNlc3MucGVlcmppZCA9PT0gZGF0YS5wZWVyamlkICYmXG4gICAgICAgIGRhdGEuc3RyZWFtLmdldFZpZGVvVHJhY2tzKCkubGVuZ3RoID09PSAwICYmXG4gICAgICAgIFJUQ0FjdGl2YXRvci5nZXRSVENTZXJ2aWNlKCkubG9jYWxWaWRlby5nZXRWaWRlb1RyYWNrcygpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgLy9cbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VuZEtleWZyYW1lKHNlc3MucGVlcmNvbm5lY3Rpb24pO1xuICAgICAgICB9LCAzMDAwKTtcbiAgICB9XG59XG5cbi8vIGFuIGF0dGVtcHQgdG8gd29yayBhcm91bmQgaHR0cHM6Ly9naXRodWIuY29tL2ppdHNpL2ppdG1lZXQvaXNzdWVzLzMyXG5mdW5jdGlvbiBzZW5kS2V5ZnJhbWUocGMpIHtcbiAgICBjb25zb2xlLmxvZygnc2VuZGtleWZyYW1lJywgcGMuaWNlQ29ubmVjdGlvblN0YXRlKTtcbiAgICBpZiAocGMuaWNlQ29ubmVjdGlvblN0YXRlICE9PSAnY29ubmVjdGVkJykgcmV0dXJuOyAvLyBzYWZlLi4uXG4gICAgcGMuc2V0UmVtb3RlRGVzY3JpcHRpb24oXG4gICAgICAgIHBjLnJlbW90ZURlc2NyaXB0aW9uLFxuICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBwYy5jcmVhdGVBbnN3ZXIoXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKG1vZGlmaWVkQW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHBjLnNldExvY2FsRGVzY3JpcHRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RpZmllZEFuc3dlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBub29wXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3RyaWdnZXJLZXlmcmFtZSBzZXRMb2NhbERlc2NyaXB0aW9uIGZhaWxlZCcsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5zaG93RXJyb3IoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndHJpZ2dlcktleWZyYW1lIGNyZWF0ZUFuc3dlciBmYWlsZWQnLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLnNob3dFcnJvcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3RyaWdnZXJLZXlmcmFtZSBzZXRSZW1vdGVEZXNjcmlwdGlvbiBmYWlsZWQnLCBlcnJvcik7XG4gICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5zaG93RXJyb3IoKTtcbiAgICAgICAgfVxuICAgICk7XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBTZXNzaW9uQmFzZTsiLCIvKipcbiAqIFN0cm9waGUgbG9nZ2VyIGltcGxlbWVudGF0aW9uLiBMb2dzIGZyb20gbGV2ZWwgV0FSTiBhbmQgYWJvdmUuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgU3Ryb3BoZS5sb2cgPSBmdW5jdGlvbiAobGV2ZWwsIG1zZykge1xuICAgICAgICBzd2l0Y2ggKGxldmVsKSB7XG4gICAgICAgICAgICBjYXNlIFN0cm9waGUuTG9nTGV2ZWwuV0FSTjpcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJTdHJvcGhlOiBcIiArIG1zZyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN0cm9waGUuTG9nTGV2ZWwuRVJST1I6XG4gICAgICAgICAgICBjYXNlIFN0cm9waGUuTG9nTGV2ZWwuRkFUQUw6XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIlN0cm9waGU6IFwiICsgbXNnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH07XG59O1xuXG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iXX0=
