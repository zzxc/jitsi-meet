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
    FATAL_JINGLE_ERROR: "xmpp.fatalError.jingle"
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

var XMPPActivator = function()
{

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
        });
    }

    XMPPActivatorProto.start = function (jid, password, uiCredentials) {
        setupStrophePlugins();
        registerListeners();
        setupEvents();
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
    return XMPPActivatorProto;
}();

module.exports = XMPPActivator;
},{"../service/RTC/StreamEventTypes":1,"./moderatemuc":7,"./muc":8,"./strophe.jingle":10,"./strophe.util":15,"events":16}],5:[function(require,module,exports){
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
    this.myMucResource = Strophe.getResourceFromJid(connection.emuc.myroomjid);

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

    if(this.connection.jingle.localAudio) {
        this.peerconnection.addStream(this.connection.jingle.localAudio);
    }
    if(this.connection.jingle.localVideo) {
        this.peerconnection.addStream(this.connection.jingle.localVideo);
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
ColibriFocus.prototype.setRecording = function(state, token, callback) {
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
            callback(newState);
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
                            $(document).trigger('setLocalDescription.jingle', [self.sid]);
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
    sess.localVideo = this.connection.jingle.localVideo;
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

},{"../../service/xmpp/XMPPEvents":2,"../strophe.jingle.adapter":9,"../strophe.jingle.sdp":11,"../strophe.jingle.sdp.util":12,"../strophe.jingle.sessionbase":14,"./colibri.session":6}],6:[function(require,module,exports){
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
                toggleAudio();
            }
            return true;
        },
        eject: function (jid) {
            connection.jingle.terminateRemoteByJid(jid, 'kick');
            connection.emuc.kick(jid);
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
                    if (Object.keys(connection.emuc.members).length < 1) {
                        noMembers = true;
                        focus = new ColibriFocus(connection, config.hosts.bridge, eventEmitter);
                        this.setOwnNickname();
                    }
                    UIActivator.getUIService().onMucJoined(from, member, noMembers);
                    this.list_members.push(from);
                }
            } else if (this.members[from] === undefined) {
                // new participant
                this.members[from] = member;
                this.list_members.push(from);
                UIActivator.getUIService().onMucEntered(from, member, pres);
                if (focus !== null) {
                    // FIXME: this should prepare the video
                    if (focus.confid === null) {
                        console.log('make new conference with', from);
                        focus.makeConference(Object.keys(this.members));
                    } else {
                        console.log('invite', from, 'into conference');
                        focus.addNewParticipant(from);
                    }
                }
            }
            // Always trigger presence to update bindings
            console.log('presence change from', from);
            $(document).trigger('presence.muc', [from, member, pres]);

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
            connection.jingle.terminateByJid(jid);

            if (focus == null
                // I shouldn't be the one that left to enter here.
                && jid !== connection.emuc.myroomjid
                && connection.emuc.myroomjid === connection.emuc.list_members[0]
                // If our session has been terminated for some reason
                // (kicked, hangup), don't try to become the focus
                && !this.sessionTerminated) {
                console.log('welcome to our new focus... myself');
                focus = new ColibriFocus(connection, config.hosts.bridge, eventEmitter);
                this.setOwnNickname();

                UIActivator.getUIService().updateButtons(null, true);

                if (Object.keys(connection.emuc.members).length > 0) {
                    focus.makeConference(Object.keys(connection.emuc.members));
                    UIActivator.getUIService().updateButtons(true, null);
                }
                $(document).trigger('focusechanged.muc', [focus]);
            }
            else if (focus && Object.keys(connection.emuc.members).length === 0) {
                console.log('everyone left');
                // FIXME: closing the connection is a hack to avoid some
                // problems with reinit
                disposeConference();
                focus = new ColibriFocus(connection, config.hosts.bridge, eventEmitter);
                this.setOwnNickname();
                UIActivator.getUIService().updateButtons(true, false);
            }

            if (connection.emuc.getPrezi(jid)) {
                $(document).trigger('presentationremoved.muc',
                    [jid, connection.emuc.getPrezi(jid)]);
            }
        },
        setOwnNickname: function () {

            if (XMPPActivator.getNickname() !== null) {
                focus.setEndpointDisplayName(connection.emuc.myroomjid,
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
            connection.send(pres);
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
        }
    });
};


},{"./XMPPActivator":4,"./colibri/colibri.focus":5}],9:[function(require,module,exports){
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
    this.peerconnection.addStream(stream);
};

TraceablePeerConnection.prototype.removeStream = function (stream) {
    this.trace('removeStream', stream.id);
    this.peerconnection.removeStream(stream);
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
},{"./strophe.jingle.sdp":11}],10:[function(require,module,exports){
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
                    activecall = sess;
                    eventEmitter.emit(XMPPEvents.CALL_INCOMING, sess);
                    // TODO: check affiliation and/or role
                    console.log('emuc data for', sess.peerjid, connection.emuc.members[sess.peerjid]);
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
                        $(document).trigger('callterminated.jingle', [
                            sess.sid,
                            sess.peerjid,
                            $(iq).find('>jingle>reason>:first')[0].tagName,
                            $(iq).find('>jingle>reason>text').text()
                        ]);
                    } else {
                        $(document).trigger('callterminated.jingle',
                            [sess.sid, sess.peerjid]);
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
        // Used to terminate a session when an unavailable presence is received.
        terminateByJid: function (jid) {
            if (this.jid2session.hasOwnProperty(jid)) {
                var sess = this.jid2session[jid];
                if (sess) {
                    sess.terminate();
                    console.log('peer went away silently', jid);
                    delete this.sessions[sess.sid];
                    delete this.jid2session[jid];
                    $(document).trigger('callterminated.jingle',
                        [sess.sid, jid], 'gone');
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
                    $(document).trigger('callterminated.jingle',
                        [sess.sid, jid, 'kicked']);
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
            return data;
        }
    });
}
},{"../service/xmpp/XMPPEvents":2,"./strophe.jingle.session":13}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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


},{}],13:[function(require,module,exports){
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
            $(document).trigger('setLocalDescription.jingle', [self.sid]);
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
            $(document).trigger('setLocalDescription.jingle', [self.sid]);
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
            $(document).trigger('fatalError.jingle', [self, e]);
            connection.emuc.doLeave();
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
            $(document).trigger('setLocalDescription.jingle', [self.sid]);
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
},{"./strophe.jingle.adapter":9,"./strophe.jingle.sdp":11,"./strophe.jingle.sessionbase":14}],14:[function(require,module,exports){
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
        $(document).trigger('setLocalDescription.jingle', [self.sid]);
        if(successCallback) {
            successCallback();
        }
    });
};

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

    self.connection.jingle.localStreams = [];
    self.connection.jingle.localStreams.push(self.connection.jingle.localAudio);
    self.connection.jingle.localStreams.push(self.connection.jingle.localVideo);

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

    var ismuted = false;
    var localVideo = connection.jingle.localVideo;
    for (var idx = 0; idx < localVideo.getVideoTracks().length; idx++) {
        ismuted = !localVideo.getVideoTracks()[idx].enabled;
    }
    for (var idx = 0; idx < localVideo.getVideoTracks().length; idx++) {
        localVideo.getVideoTracks()[idx].enabled = !localVideo.getVideoTracks()[idx].enabled;
    }

    this.peerconnection.hardMuteVideo(!ismuted);
    this.modifySources(callback(!ismuted));
};


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
}


SessionBase.prototype.waitForPresence = function (data, sid) {
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


    // TODO this must be done with listeners
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


module.exports = SessionBase;
},{"../util/tracking.js":3,"./strophe.jingle.sdp":11}],15:[function(require,module,exports){
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


},{}],16:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9zZXJ2aWNlL1JUQy9TdHJlYW1FdmVudFR5cGVzLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvc2VydmljZS94bXBwL1hNUFBFdmVudHMuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC91dGlsL3RyYWNraW5nLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQveG1wcC9YTVBQQWN0aXZhdG9yLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQveG1wcC9jb2xpYnJpL2NvbGlicmkuZm9jdXMuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC94bXBwL2NvbGlicmkvY29saWJyaS5zZXNzaW9uLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQveG1wcC9tb2RlcmF0ZW11Yy5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L3htcHAvbXVjLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQveG1wcC9zdHJvcGhlLmppbmdsZS5hZGFwdGVyLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQveG1wcC9zdHJvcGhlLmppbmdsZS5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L3htcHAvc3Ryb3BoZS5qaW5nbGUuc2RwLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQveG1wcC9zdHJvcGhlLmppbmdsZS5zZHAudXRpbC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L3htcHAvc3Ryb3BoZS5qaW5nbGUuc2Vzc2lvbi5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L3htcHAvc3Ryb3BoZS5qaW5nbGUuc2Vzc2lvbmJhc2UuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC94bXBwL3N0cm9waGUudXRpbC5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMTlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3ZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hlQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzN1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1dEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0ZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgU3RyZWFtRXZlbnRUeXBlcyA9IHtcbiAgICBFVkVOVF9UWVBFX0xPQ0FMX0NSRUFURUQ6IFwic3RyZWFtLmxvY2FsX2NyZWF0ZWRcIixcblxuICAgIEVWRU5UX1RZUEVfTE9DQUxfRU5ERUQ6IFwic3RyZWFtLmxvY2FsX2VuZGVkXCIsXG5cbiAgICBFVkVOVF9UWVBFX1JFTU9URV9DUkVBVEVEOiBcInN0cmVhbS5yZW1vdGVfY3JlYXRlZFwiLFxuXG4gICAgRVZFTlRfVFlQRV9SRU1PVEVfRU5ERUQ6IFwic3RyZWFtLnJlbW90ZV9lbmRlZFwiXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0cmVhbUV2ZW50VHlwZXM7IiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGhyaXN0byBvbiAxMC8yOS8xNC5cbiAqL1xudmFyIFhNUFBFdmVudHMgPSB7XG4gICAgQ09ORkVSRU5DRV9DRVJBVEVEOiBcInhtcHAuY29uZmVyZW5jZUNyZWF0ZWQuamluZ2xlXCIsXG4gICAgQ0FMTF9URVJNSU5BVEVEOiBcInhtcHAuY2FsbHRlcm1pbmF0ZWQuamluZ2xlXCIsXG4gICAgQ0FMTF9JTkNPTUlORzogXCJ4bXBwLmNhbGxpbmNvbWluZy5qaW5nbGVcIixcbiAgICBGQVRBTF9KSU5HTEVfRVJST1I6IFwieG1wcC5mYXRhbEVycm9yLmppbmdsZVwiXG59O1xubW9kdWxlLmV4cG9ydHMgPSBYTVBQRXZlbnRzOyIsIihmdW5jdGlvbiAoKSB7XG5cbmZ1bmN0aW9uIHRyYWNrVXNhZ2UoZXZlbnRuYW1lLCBvYmopIHtcbiAgICAvL2NvbnNvbGUubG9nKCd0cmFjaycsIGV2ZW50bmFtZSwgb2JqKTtcbiAgICAvLyBpbXBsZW1lbnQgeW91ciBvd24gdHJhY2tpbmcgbWVjaGFuaXNtIGhlcmVcbn1cbmlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHRyYWNrVXNhZ2U7XG59IGVsc2Uge1xuICAgIHdpbmRvdy50cmFja1VzYWdlID0gdHJhY2tVc2FnZTtcbn1cblxufSkoKTtcbiIsInZhciBTdHJlYW1FdmVudFR5cGVzID0gcmVxdWlyZShcIi4uL3NlcnZpY2UvUlRDL1N0cmVhbUV2ZW50VHlwZXNcIik7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcImV2ZW50c1wiKTtcblxudmFyIFhNUFBBY3RpdmF0b3IgPSBmdW5jdGlvbigpXG57XG5cbiAgICBmdW5jdGlvbiBOaWNrbmFtZUxpc3RlbnJlcigpXG4gICAge1xuICAgICAgICB0aGlzLm5pY2tuYW1lID0gbnVsbDtcbiAgICB9XG5cbiAgICBOaWNrbmFtZUxpc3RlbnJlci5wcm90b3R5cGUub25OaWNrbmFtZUNoYW5nZWQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5uaWNrbmFtZSA9IHZhbHVlO1xuICAgIH07XG5cbiAgICB2YXIgbmlja25hbWVMaXN0ZW5lciA9IG5ldyBOaWNrbmFtZUxpc3RlbnJlcigpO1xuXG4gICAgdmFyIGF1dGhlbnRpY2F0ZWRVc2VyID0gZmFsc2U7XG5cbiAgICB2YXIgZXZlbnRFbWl0dGVyID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gICAgdmFyIGNvbm5lY3Rpb24gPSBudWxsO1xuXG4gICAgZnVuY3Rpb24gWE1QUEFjdGl2YXRvclByb3RvKClcbiAgICB7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0dXBTdHJvcGhlUGx1Z2lucygpXG4gICAge1xuICAgICAgICByZXF1aXJlKFwiLi9tdWNcIikoZXZlbnRFbWl0dGVyKTtcbiAgICAgICAgcmVxdWlyZShcIi4vc3Ryb3BoZS5qaW5nbGVcIikoZXZlbnRFbWl0dGVyKTtcbiAgICAgICAgcmVxdWlyZShcIi4vbW9kZXJhdGVtdWNcIikoZXZlbnRFbWl0dGVyKTtcbiAgICAgICAgcmVxdWlyZShcIi4vc3Ryb3BoZS51dGlsXCIpKGV2ZW50RW1pdHRlcik7XG5cbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZWdpc3Rlckxpc3RlbmVycygpIHtcbiAgICAgICAgVUlBY3RpdmF0b3IuZ2V0VUlTZXJ2aWNlKCkuYWRkTmlja25hbWVMaXN0ZW5lcihuaWNrbmFtZUxpc3RlbmVyLm9uTmlja25hbWVDaGFuZ2VkKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXR1cEV2ZW50cygpIHtcbiAgICAgICAgJCh3aW5kb3cpLmJpbmQoJ2JlZm9yZXVubG9hZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChjb25uZWN0aW9uICYmIGNvbm5lY3Rpb24uY29ubmVjdGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gZW5zdXJlIHNpZ25vdXRcbiAgICAgICAgICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgICAgIHVybDogY29uZmlnLmJvc2gsXG4gICAgICAgICAgICAgICAgICAgIGFzeW5jOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL3htbCcsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IFwiPGJvZHkgcmlkPSdcIiArIChjb25uZWN0aW9uLnJpZCB8fCBjb25uZWN0aW9uLl9wcm90by5yaWQpICsgXCInIHhtbG5zPSdodHRwOi8vamFiYmVyLm9yZy9wcm90b2NvbC9odHRwYmluZCcgc2lkPSdcIiArIChjb25uZWN0aW9uLnNpZCB8fCBjb25uZWN0aW9uLl9wcm90by5zaWQpICsgXCInIHR5cGU9J3Rlcm1pbmF0ZSc+PHByZXNlbmNlIHhtbG5zPSdqYWJiZXI6Y2xpZW50JyB0eXBlPSd1bmF2YWlsYWJsZScvPjwvYm9keT5cIixcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzaWduZWQgb3V0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uIChYTUxIdHRwUmVxdWVzdCwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzaWdub3V0IGVycm9yJywgdGV4dFN0YXR1cyArICcgKCcgKyBlcnJvclRocm93biArICcpJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgWE1QUEFjdGl2YXRvclByb3RvLnN0YXJ0ID0gZnVuY3Rpb24gKGppZCwgcGFzc3dvcmQsIHVpQ3JlZGVudGlhbHMpIHtcbiAgICAgICAgc2V0dXBTdHJvcGhlUGx1Z2lucygpO1xuICAgICAgICByZWdpc3Rlckxpc3RlbmVycygpO1xuICAgICAgICBzZXR1cEV2ZW50cygpO1xuICAgICAgICBjb25uZWN0KGppZCwgcGFzc3dvcmQsIHVpQ3JlZGVudGlhbHMpO1xuICAgICAgICBSVENBY3RpdmF0b3IuYWRkU3RyZWFtTGlzdGVuZXIobWF5YmVEb0pvaW4sIFN0cmVhbUV2ZW50VHlwZXMuRVZFTlRfVFlQRV9MT0NBTF9DUkVBVEVEKTtcbiAgICB9XG5cbiAgICBYTVBQQWN0aXZhdG9yUHJvdG8uZ2V0Tmlja25hbWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuaWNrbmFtZUxpc3RlbmVyLm5pY2tuYW1lO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbm5lY3QoamlkLCBwYXNzd29yZCwgdWlDcmVkZW50aWFscykge1xuICAgICAgICB2YXIgbG9jYWxBdWRpbywgbG9jYWxWaWRlbztcbiAgICAgICAgaWYgKGNvbm5lY3Rpb24gJiYgY29ubmVjdGlvbi5qaW5nbGUpIHtcbiAgICAgICAgICAgIGxvY2FsQXVkaW8gPSBjb25uZWN0aW9uLmppbmdsZS5sb2NhbEF1ZGlvO1xuICAgICAgICAgICAgbG9jYWxWaWRlbyA9IGNvbm5lY3Rpb24uamluZ2xlLmxvY2FsVmlkZW87XG4gICAgICAgIH1cbiAgICAgICAgY29ubmVjdGlvbiA9IG5ldyBTdHJvcGhlLkNvbm5lY3Rpb24odWlDcmVkZW50aWFscy5ib3NoKTtcblxuICAgICAgICBpZiAobmlja25hbWVMaXN0ZW5lci5uaWNrbmFtZSkge1xuICAgICAgICAgICAgY29ubmVjdGlvbi5lbXVjLmFkZERpc3BsYXlOYW1lVG9QcmVzZW5jZShuaWNrbmFtZUxpc3RlbmVyLm5pY2tuYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25uZWN0aW9uLmRpc2NvKSB7XG4gICAgICAgICAgICAvLyBmb3IgY2hyb21lLCBhZGQgbXVsdGlzdHJlYW0gY2FwXG4gICAgICAgIH1cbiAgICAgICAgY29ubmVjdGlvbi5qaW5nbGUucGNfY29uc3RyYWludHMgPSBSVENBY3RpdmF0b3IuZ2V0UlRDU2VydmljZSgpLmdldFBDQ29uc3RyYWludHMoKTtcbiAgICAgICAgaWYgKGNvbmZpZy51c2VJUHY2KSB7XG4gICAgICAgICAgICAvLyBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3dlYnJ0Yy9pc3N1ZXMvZGV0YWlsP2lkPTI4MjhcbiAgICAgICAgICAgIGlmICghY29ubmVjdGlvbi5qaW5nbGUucGNfY29uc3RyYWludHMub3B0aW9uYWwpIGNvbm5lY3Rpb24uamluZ2xlLnBjX2NvbnN0cmFpbnRzLm9wdGlvbmFsID0gW107XG4gICAgICAgICAgICBjb25uZWN0aW9uLmppbmdsZS5wY19jb25zdHJhaW50cy5vcHRpb25hbC5wdXNoKHtnb29nSVB2NjogdHJ1ZX0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsb2NhbEF1ZGlvKSBjb25uZWN0aW9uLmppbmdsZS5sb2NhbEF1ZGlvID0gbG9jYWxBdWRpbztcbiAgICAgICAgaWYgKGxvY2FsVmlkZW8pIGNvbm5lY3Rpb24uamluZ2xlLmxvY2FsVmlkZW8gPSBsb2NhbFZpZGVvO1xuXG4gICAgICAgIGlmKCFwYXNzd29yZClcbiAgICAgICAgICAgIHBhc3N3b3JkID0gdWlDcmVkZW50aWFscy5wYXNzd29yZDtcblxuICAgICAgICBpZighamlkKVxuICAgICAgICAgICAgamlkID0gdWlDcmVkZW50aWFscy5qaWQ7XG5cbiAgICAgICAgdmFyIGFub255bW91c0Nvbm5lY3Rpb25GYWlsZWQgPSBmYWxzZTtcblxuICAgICAgICBjb25uZWN0aW9uLmNvbm5lY3QoamlkLCBwYXNzd29yZCwgZnVuY3Rpb24gKHN0YXR1cywgbXNnKSB7XG4gICAgICAgICAgICBpZiAoc3RhdHVzID09PSBTdHJvcGhlLlN0YXR1cy5DT05ORUNURUQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY29ubmVjdGVkJyk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbmZpZy51c2VTdHVuVHVybikge1xuICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmppbmdsZS5nZXRTdHVuQW5kVHVybkNyZWRlbnRpYWxzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFVJQWN0aXZhdG9yLmdldFVJU2VydmljZSgpLmRpc2FibGVDb25uZWN0KCk7XG5cbiAgICAgICAgICAgICAgICBpZihwYXNzd29yZClcbiAgICAgICAgICAgICAgICAgICAgYXV0aGVudGljYXRlZFVzZXIgPSB0cnVlO1xuICAgICAgICAgICAgICAgIG1heWJlRG9Kb2luKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHN0YXR1cyA9PT0gU3Ryb3BoZS5TdGF0dXMuQ09OTkZBSUwpIHtcbiAgICAgICAgICAgICAgICBpZihtc2cgPT09ICd4LXN0cm9waGUtYmFkLW5vbi1hbm9uLWppZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgYW5vbnltb3VzQ29ubmVjdGlvbkZhaWxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdGF0dXMnLCBzdGF0dXMpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzdGF0dXMgPT09IFN0cm9waGUuU3RhdHVzLkRJU0NPTk5FQ1RFRCkge1xuICAgICAgICAgICAgICAgIGlmKGFub255bW91c0Nvbm5lY3Rpb25GYWlsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcHJvbXB0IHVzZXIgZm9yIHVzZXJuYW1lIGFuZCBwYXNzd29yZFxuICAgICAgICAgICAgICAgICAgICBYTVBQQWN0aXZhdG9yUHJvdG8ucHJvbXB0TG9naW4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHN0YXR1cyA9PT0gU3Ryb3BoZS5TdGF0dXMuQVVUSEZBSUwpIHtcbiAgICAgICAgICAgICAgICAvLyB3cm9uZyBwYXNzd29yZCBvciB1c2VybmFtZSwgcHJvbXB0IHVzZXJcbiAgICAgICAgICAgICAgICBYTVBQQWN0aXZhdG9yUHJvdG8ucHJvbXB0TG9naW4oKTtcblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc3RhdHVzJywgc3RhdHVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgWE1QUEFjdGl2YXRvclByb3RvLnByb21wdExvZ2luID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBVSUFjdGl2YXRvci5zaG93TG9naW5Qb3B1cChjb25uZWN0KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYXliZURvSm9pbigpIHtcbiAgICAgICAgaWYgKGNvbm5lY3Rpb24gJiYgY29ubmVjdGlvbi5jb25uZWN0ZWQgJiYgU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoY29ubmVjdGlvbi5qaWQpIC8vIC5jb25uZWN0ZWQgaXMgdHJ1ZSB3aGlsZSBjb25uZWN0aW5nP1xuICAgICAgICAgICAgJiYgKGNvbm5lY3Rpb24uamluZ2xlLmxvY2FsQXVkaW8gfHwgY29ubmVjdGlvbi5qaW5nbGUubG9jYWxWaWRlbykpIHtcbiAgICAgICAgICAgIHZhciByb29tamlkID0gVUlBY3RpdmF0b3IuZ2V0VUlTZXJ2aWNlKCkuZ2VuZXJhdGVSb29tTmFtZShhdXRoZW50aWNhdGVkVXNlcik7XG4gICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuZG9Kb2luKHJvb21qaWQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgWE1QUEFjdGl2YXRvclByb3RvLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICB9XG5cbiAgICBYTVBQQWN0aXZhdG9yUHJvdG8uZ2V0SmluZ2xlRGF0YSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGNvbm5lY3Rpb24uamluZ2xlKSB7XG4gICAgICAgICAgICByZXR1cm4gY29ubmVjdGlvbi5qaW5nbGUuZ2V0SmluZ2xlRGF0YSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICBYTVBQQWN0aXZhdG9yUHJvdG8uZ2V0TG9nZ2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gY29ubmVjdGlvbi5sb2dnZXI7XG4gICAgfVxuICAgIFxuICAgIFhNUFBBY3RpdmF0b3JQcm90by5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uIChldmVudCwgbGlzdGVuZXIpIHtcbiAgICAgICAgZXZlbnRFbWl0dGVyLm9uKGV2ZW50LCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgWE1QUEFjdGl2YXRvclByb3RvLmdldE15SklEID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZDtcbiAgICB9XG4gICAgcmV0dXJuIFhNUFBBY3RpdmF0b3JQcm90bztcbn0oKTtcblxubW9kdWxlLmV4cG9ydHMgPSBYTVBQQWN0aXZhdG9yOyIsIi8qIGNvbGlicmkuanMgLS0gYSBDT0xJQlJJIGZvY3VzXG4gKiBUaGUgY29saWJyaSBzcGVjIGhhcyBiZWVuIHN1Ym1pdHRlZCB0byB0aGUgWE1QUCBTdGFuZGFyZHMgRm91bmRhdGlvblxuICogZm9yIHB1YmxpY2F0aW9ucyBhcyBhIFhNUFAgZXh0ZW5zaW9uczpcbiAqIGh0dHA6Ly94bXBwLm9yZy9leHRlbnNpb25zL2luYm94L2NvbGlicmkuaHRtbFxuICpcbiAqIGNvbGlicmkuanMgaXMgYSBwYXJ0aWNpcGF0aW5nIGZvY3VzLCBpLmUuIHRoZSBmb2N1cyBwYXJ0aWNpcGF0ZXNcbiAqIGluIHRoZSBjb25mZXJlbmNlLiBUaGUgY29uZmVyZW5jZSBpdHNlbGYgY2FuIGJlIGFkLWhvYywgdGhyb3VnaCBhXG4gKiBNVUMsIHRocm91Z2ggUHViU3ViLCBldGMuXG4gKlxuICogY29saWJyaS5qcyByZWxpZXMgaGVhdmlseSBvbiB0aGUgc3Ryb3BoZS5qaW5nbGUgbGlicmFyeSBhdmFpbGFibGVcbiAqIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL0VTVE9TL3N0cm9waGUuamluZ2xlXG4gKiBhbmQgaW50ZXJvcGVyYXRlcyB3aXRoIHRoZSBKaXRzaSB2aWRlb2JyaWRnZSBhdmFpbGFibGUgZnJvbVxuICogaHR0cHM6Ly9qaXRzaS5vcmcvUHJvamVjdHMvSml0c2lWaWRlb2JyaWRnZVxuICovXG4vKlxuIENvcHlyaWdodCAoYykgMjAxMyBFU1RPUyBHbWJIXG5cbiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cbiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuIFRIRSBTT0ZUV0FSRS5cbiAqL1xuLyoganNoaW50IC1XMTE3ICovXG52YXIgU2Vzc2lvbkJhc2UgPSByZXF1aXJlKFwiLi4vc3Ryb3BoZS5qaW5nbGUuc2Vzc2lvbmJhc2VcIik7XG52YXIgQ29saWJyaVNlc3Npb24gPSByZXF1aXJlKFwiLi9jb2xpYnJpLnNlc3Npb25cIik7XG52YXIgVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24gPSByZXF1aXJlKFwiLi4vc3Ryb3BoZS5qaW5nbGUuYWRhcHRlclwiKTtcbnZhciBTRFAgPSByZXF1aXJlKFwiLi4vc3Ryb3BoZS5qaW5nbGUuc2RwXCIpO1xudmFyIFNEUFV0aWwgPSByZXF1aXJlKFwiLi4vc3Ryb3BoZS5qaW5nbGUuc2RwLnV0aWxcIik7XG52YXIgWE1QUEV2ZW50cyA9IHJlcXVpcmUoXCIuLi8uLi9zZXJ2aWNlL3htcHAvWE1QUEV2ZW50c1wiKTtcbkNvbGlicmlGb2N1cy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFNlc3Npb25CYXNlLnByb3RvdHlwZSk7XG5mdW5jdGlvbiBDb2xpYnJpRm9jdXMoY29ubmVjdGlvbiwgYnJpZGdlamlkLCBldmVudEVtaXR0ZXIpIHtcblxuICAgIFNlc3Npb25CYXNlLmNhbGwodGhpcywgY29ubmVjdGlvbiwgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDEyKSk7XG5cbiAgICB0aGlzLmJyaWRnZWppZCA9IGJyaWRnZWppZDtcbiAgICB0aGlzLnBlZXJzID0gW107XG4gICAgdGhpcy5yZW1vdGVTdHJlYW1zID0gW107XG4gICAgdGhpcy5jb25maWQgPSBudWxsO1xuICAgIHRoaXMuZXZlbnRFbWl0dGVyID0gZXZlbnRFbWl0dGVyO1xuXG4gICAgLyoqXG4gICAgICogTG9jYWwgWE1QUCByZXNvdXJjZSB1c2VkIHRvIGpvaW4gdGhlIG11bHRpIHVzZXIgY2hhdC5cbiAgICAgKiBAdHlwZSB7Kn1cbiAgICAgKi9cbiAgICB0aGlzLm15TXVjUmVzb3VyY2UgPSBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChjb25uZWN0aW9uLmVtdWMubXlyb29tamlkKTtcblxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgY2hhbm5lbCBleHBpcmUgdmFsdWUgaW4gc2Vjb25kcy5cbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIHRoaXMuY2hhbm5lbEV4cGlyZVxuICAgICAgICA9ICgnbnVtYmVyJyA9PT0gdHlwZW9mKGNvbmZpZy5jaGFubmVsRXhwaXJlKSlcbiAgICAgICAgICAgID8gY29uZmlnLmNoYW5uZWxFeHBpcmVcbiAgICAgICAgICAgIDogMTU7XG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBjaGFubmVsIGxhc3QtbiB2YWx1ZS5cbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIHRoaXMuY2hhbm5lbExhc3ROXG4gICAgICAgID0gKCdudW1iZXInID09PSB0eXBlb2YoY29uZmlnLmNoYW5uZWxMYXN0TikpID8gY29uZmlnLmNoYW5uZWxMYXN0TiA6IC0xO1xuXG4gICAgLy8gbWVkaWEgdHlwZXMgb2YgdGhlIGNvbmZlcmVuY2VcbiAgICBpZiAoY29uZmlnLm9wZW5TY3RwKVxuICAgICAgICB0aGlzLm1lZGlhID0gWydhdWRpbycsICd2aWRlbycsICdkYXRhJ107XG4gICAgZWxzZVxuICAgICAgICB0aGlzLm1lZGlhID0gWydhdWRpbycsICd2aWRlbyddO1xuXG4gICAgdGhpcy5jb25uZWN0aW9uLmppbmdsZS5zZXNzaW9uc1t0aGlzLnNpZF0gPSB0aGlzO1xuICAgIHRoaXMuYnVuZGxlZFRyYW5zcG9ydHMgPSB7fTtcbiAgICB0aGlzLm15Y2hhbm5lbCA9IFtdO1xuICAgIHRoaXMuY2hhbm5lbHMgPSBbXTtcbiAgICB0aGlzLnJlbW90ZXNzcmMgPSB7fTtcblxuICAgIC8vIGNvbnRhaW5lciBmb3IgY2FuZGlkYXRlcyBmcm9tIHRoZSBmb2N1c1xuICAgIC8vIGdhdGhlcmVkIGJlZm9yZSBjb25maWQgaXMga25vd25cbiAgICB0aGlzLmRyaXBfY29udGFpbmVyID0gW107XG5cbiAgICAvLyBzaWxseSB3YWl0IGZsYWdcbiAgICB0aGlzLndhaXQgPSB0cnVlO1xuXG4gICAgdGhpcy5yZWNvcmRpbmdFbmFibGVkID0gZmFsc2U7XG5cbiAgICAvLyBzdG9yZXMgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGVuZHBvaW50cyAoaS5lLiBkaXNwbGF5IG5hbWVzKSB0b1xuICAgIC8vIGJlIHNlbnQgdG8gdGhlIHZpZGVvYnJpZGdlLlxuICAgIHRoaXMuZW5kcG9pbnRzSW5mbyA9IG51bGw7XG59XG5cbi8vIGNyZWF0ZXMgYSBjb25mZXJlbmNlcyB3aXRoIGFuIGluaXRpYWwgc2V0IG9mIHBlZXJzXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLm1ha2VDb25mZXJlbmNlID0gZnVuY3Rpb24gKHBlZXJzLCBlcnJvckNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICh0aGlzLmNvbmZpZCAhPT0gbnVsbCkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdtYWtlQ29uZmVyZW5jZSBjYWxsZWQgdHdpY2U/IElnbm9yaW5nLi4uJyk7XG4gICAgICAgIC8vIEZJWE1FOiBqdXN0IGludml0ZSBwZWVycz9cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmNvbmZpZCA9IDA7IC8vICFudWxsXG4gICAgdGhpcy5wZWVycyA9IFtdO1xuICAgIHBlZXJzLmZvckVhY2goZnVuY3Rpb24gKHBlZXIpIHtcbiAgICAgICAgc2VsZi5wZWVycy5wdXNoKHBlZXIpO1xuICAgICAgICBzZWxmLmNoYW5uZWxzLnB1c2goW10pO1xuICAgIH0pO1xuXG4gICAgdGhpcy5wZWVyY29ubmVjdGlvblxuICAgICAgICA9IG5ldyBUcmFjZWFibGVQZWVyQ29ubmVjdGlvbihcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5qaW5nbGUuaWNlX2NvbmZpZyxcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5qaW5nbGUucGNfY29uc3RyYWludHMgKTtcblxuICAgIGlmKHRoaXMuY29ubmVjdGlvbi5qaW5nbGUubG9jYWxBdWRpbykge1xuICAgICAgICB0aGlzLnBlZXJjb25uZWN0aW9uLmFkZFN0cmVhbSh0aGlzLmNvbm5lY3Rpb24uamluZ2xlLmxvY2FsQXVkaW8pO1xuICAgIH1cbiAgICBpZih0aGlzLmNvbm5lY3Rpb24uamluZ2xlLmxvY2FsVmlkZW8pIHtcbiAgICAgICAgdGhpcy5wZWVyY29ubmVjdGlvbi5hZGRTdHJlYW0odGhpcy5jb25uZWN0aW9uLmppbmdsZS5sb2NhbFZpZGVvKTtcbiAgICB9XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5vbmljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBjb25zb2xlLndhcm4oJ2ljZSBjb25uZWN0aW9uIHN0YXRlIGNoYW5nZWQgdG8nLCBzZWxmLnBlZXJjb25uZWN0aW9uLmljZUNvbm5lY3Rpb25TdGF0ZSk7XG4gICAgICAgIC8qXG4gICAgICAgIGlmIChzZWxmLnBlZXJjb25uZWN0aW9uLnNpZ25hbGluZ1N0YXRlID09ICdzdGFibGUnICYmIHNlbGYucGVlcmNvbm5lY3Rpb24uaWNlQ29ubmVjdGlvblN0YXRlID09ICdjb25uZWN0ZWQnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnYWRkaW5nIG5ldyByZW1vdGUgU1NSQ3MgZnJvbSBpY2Vjb25uZWN0aW9uc3RhdGVjaGFuZ2UnKTtcbiAgICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBzZWxmLm1vZGlmeVNvdXJjZXMoKTsgfSwgMTAwMCk7XG4gICAgICAgIH1cbiAgICAgICAgKi9cbiAgICAgICAgc2VsZi5vbkljZUNvbm5lY3Rpb25TdGF0ZUNoYW5nZShzZWxmLnNpZCwgc2VsZik7XG4gICAgfTtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLm9uc2lnbmFsaW5nc3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgY29uc29sZS53YXJuKHNlbGYucGVlcmNvbm5lY3Rpb24uc2lnbmFsaW5nU3RhdGUpO1xuICAgICAgICAvKlxuICAgICAgICBpZiAoc2VsZi5wZWVyY29ubmVjdGlvbi5zaWduYWxpbmdTdGF0ZSA9PSAnc3RhYmxlJyAmJiBzZWxmLnBlZXJjb25uZWN0aW9uLmljZUNvbm5lY3Rpb25TdGF0ZSA9PSAnY29ubmVjdGVkJykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2FkZGluZyBuZXcgcmVtb3RlIFNTUkNzIGZyb20gc2lnbmFsaW5nc3RhdGVjaGFuZ2UnKTtcbiAgICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBzZWxmLm1vZGlmeVNvdXJjZXMoKTsgfSwgMTAwMCk7XG4gICAgICAgIH1cbiAgICAgICAgKi9cbiAgICB9O1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24ub25hZGRzdHJlYW0gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgLy8gc2VhcmNoIHRoZSBqaWQgYXNzb2NpYXRlZCB3aXRoIHRoaXMgc3RyZWFtXG4gICAgICAgIE9iamVjdC5rZXlzKHNlbGYucmVtb3Rlc3NyYykuZm9yRWFjaChmdW5jdGlvbiAoamlkKSB7XG4gICAgICAgICAgICBpZiAoc2VsZi5yZW1vdGVzc3JjW2ppZF0uam9pbignXFxyXFxuJykuaW5kZXhPZignbXNsYWJlbDonICsgZXZlbnQuc3RyZWFtLmlkKSAhPSAtMSkge1xuICAgICAgICAgICAgICAgIGV2ZW50LnBlZXJqaWQgPSBqaWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBzZWxmLnJlbW90ZVN0cmVhbXMucHVzaChldmVudC5zdHJlYW0pO1xuLy8gICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ3JlbW90ZXN0cmVhbWFkZGVkLmppbmdsZScsIFtldmVudCwgc2VsZi5zaWRdKTtcbiAgICAgICAgc2VsZi53YWl0Rm9yUHJlc2VuY2UoZXZlbnQsIHNlbGYuc2lkKTtcbiAgICB9O1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24ub25pY2VjYW5kaWRhdGUgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZygnZm9jdXMgb25pY2VjYW5kaWRhdGUnLCBzZWxmLmNvbmZpZCwgbmV3IERhdGUoKS5nZXRUaW1lKCksIGV2ZW50LmNhbmRpZGF0ZSk7XG4gICAgICAgIGlmICghZXZlbnQuY2FuZGlkYXRlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZW5kIG9mIGNhbmRpZGF0ZXMnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzZWxmLnNlbmRJY2VDYW5kaWRhdGUoZXZlbnQuY2FuZGlkYXRlKTtcbiAgICB9O1xuICAgIHRoaXMuX21ha2VDb25mZXJlbmNlKGVycm9yQ2FsbGJhY2spO1xuICAgIC8qXG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5jcmVhdGVPZmZlcihcbiAgICAgICAgZnVuY3Rpb24gKG9mZmVyKSB7XG4gICAgICAgICAgICBzZWxmLnBlZXJjb25uZWN0aW9uLnNldExvY2FsRGVzY3JpcHRpb24oXG4gICAgICAgICAgICAgICAgb2ZmZXIsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBzdWNjZXNzXG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ3NldExvY2FsRGVzY3JpcHRpb24uamluZ2xlJywgW3NlbGYuc2lkXSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZJWE1FOiBjb3VsZCBjYWxsIF9tYWtlQ29uZmVyZW5jZSBoZXJlIGFuZCB0cmlja2xlIGNhbmRpZGF0ZXMgbGF0ZXJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fbWFrZUNvbmZlcmVuY2UoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2V0TG9jYWxEZXNjcmlwdGlvbiBmYWlsZWQnLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oZXJyb3IpO1xuICAgICAgICB9XG4gICAgKTtcbiAgICAqL1xufTtcblxuLy8gU2VuZHMgYSBDT0xJQlJJIG1lc3NhZ2Ugd2hpY2ggZW5hYmxlcyBvciBkaXNhYmxlcyAoYWNjb3JkaW5nIHRvICdzdGF0ZScpIHRoZVxuLy8gcmVjb3JkaW5nIG9uIHRoZSBicmlkZ2UuIFdhaXRzIGZvciB0aGUgcmVzdWx0IElRIGFuZCBjYWxscyAnY2FsbGJhY2snIHdpdGhcbi8vIHRoZSBuZXcgcmVjb3JkaW5nIHN0YXRlLCBhY2NvcmRpbmcgdG8gdGhlIElRLlxuQ29saWJyaUZvY3VzLnByb3RvdHlwZS5zZXRSZWNvcmRpbmcgPSBmdW5jdGlvbihzdGF0ZSwgdG9rZW4sIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBlbGVtID0gJGlxKHt0bzogdGhpcy5icmlkZ2VqaWQsIHR5cGU6ICdzZXQnfSk7XG4gICAgZWxlbS5jKCdjb25mZXJlbmNlJywge1xuICAgICAgICB4bWxuczogJ2h0dHA6Ly9qaXRzaS5vcmcvcHJvdG9jb2wvY29saWJyaScsXG4gICAgICAgIGlkOiB0aGlzLmNvbmZpZFxuICAgIH0pO1xuICAgIGVsZW0uYygncmVjb3JkaW5nJywge3N0YXRlOiBzdGF0ZSwgdG9rZW46IHRva2VufSk7XG4gICAgZWxlbS51cCgpO1xuXG4gICAgdGhpcy5jb25uZWN0aW9uLnNlbmRJUShlbGVtLFxuICAgICAgICBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU2V0IHJlY29yZGluZyBcIicsIHN0YXRlLCAnXCIuIFJlc3VsdDonLCByZXN1bHQpO1xuICAgICAgICAgICAgdmFyIHJlY29yZGluZ0VsZW0gPSAkKHJlc3VsdCkuZmluZCgnPmNvbmZlcmVuY2U+cmVjb3JkaW5nJyk7XG4gICAgICAgICAgICB2YXIgbmV3U3RhdGUgPSAoJ3RydWUnID09PSByZWNvcmRpbmdFbGVtLmF0dHIoJ3N0YXRlJykpO1xuXG4gICAgICAgICAgICBzZWxmLnJlY29yZGluZ0VuYWJsZWQgPSBuZXdTdGF0ZTtcbiAgICAgICAgICAgIGNhbGxiYWNrKG5ld1N0YXRlKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oZXJyb3IpO1xuICAgICAgICB9XG4gICAgKTtcbn07XG5cbi8qXG4gKiBVcGRhdGVzIHRoZSBkaXNwbGF5IG5hbWUgZm9yIGFuIGVuZHBvaW50IHdpdGggYSBzcGVjaWZpYyBqaWQuXG4gKiBqaWQ6IHRoZSBqaWQgYXNzb2NpYXRlZCB3aXRoIHRoZSBlbmRwb2ludC5cbiAqIGRpc3BsYXlOYW1lOiB0aGUgbmV3IGRpc3BsYXkgbmFtZSBmb3IgdGhlIGVuZHBvaW50LlxuICovXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLnNldEVuZHBvaW50RGlzcGxheU5hbWUgPSBmdW5jdGlvbihqaWQsIGRpc3BsYXlOYW1lKSB7XG4gICAgdmFyIGVuZHBvaW50SWQgPSBqaWQuc3Vic3RyKDEgKyBqaWQubGFzdEluZGV4T2YoJy8nKSk7XG4gICAgdmFyIHVwZGF0ZSA9IGZhbHNlO1xuXG4gICAgaWYgKHRoaXMuZW5kcG9pbnRzSW5mbyA9PT0gbnVsbCkge1xuICAgICAgIHRoaXMuZW5kcG9pbnRzSW5mbyA9IHt9O1xuICAgIH1cblxuICAgIHZhciBlbmRwb2ludEluZm8gPSB0aGlzLmVuZHBvaW50c0luZm9bZW5kcG9pbnRJZF07XG4gICAgaWYgKCd1bmRlZmluZWQnID09PSB0eXBlb2YgZW5kcG9pbnRJbmZvKSB7XG4gICAgICAgIGVuZHBvaW50SW5mbyA9IHRoaXMuZW5kcG9pbnRzSW5mb1tlbmRwb2ludElkXSA9IHt9O1xuICAgIH1cblxuICAgIGlmIChlbmRwb2ludEluZm9bJ2Rpc3BsYXluYW1lJ10gIT09IGRpc3BsYXlOYW1lKSB7XG4gICAgICAgIGVuZHBvaW50SW5mb1snZGlzcGxheW5hbWUnXSA9IGRpc3BsYXlOYW1lO1xuICAgICAgICB1cGRhdGUgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICh1cGRhdGUpIHtcbiAgICAgICAgdGhpcy51cGRhdGVFbmRwb2ludHMoKTtcbiAgICB9XG59O1xuXG4vKlxuICogU2VuZHMgYSBjb2xpYnJpIG1lc3NhZ2UgdG8gdGhlIGJyaWRnZSB0aGF0IGNvbnRhaW5zIHRoZVxuICogY3VycmVudCBlbmRwb2ludHMgYW5kIHRoZWlyIGRpc3BsYXkgbmFtZXMuXG4gKi9cbkNvbGlicmlGb2N1cy5wcm90b3R5cGUudXBkYXRlRW5kcG9pbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuY29uZmlkID09PSBudWxsXG4gICAgICAgIHx8IHRoaXMuZW5kcG9pbnRzSW5mbyA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlkID09PSAwKSB7XG4gICAgICAgIC8vIHRoZSBjb2xpYnJpIGNvbmZlcmVuY2UgaXMgY3VycmVudGx5IGluaXRpYXRpbmdcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHsgc2VsZi51cGRhdGVFbmRwb2ludHMoKX0sIDEwMDApO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGVsZW0gPSAkaXEoe3RvOiB0aGlzLmJyaWRnZWppZCwgdHlwZTogJ3NldCd9KTtcbiAgICBlbGVtLmMoJ2NvbmZlcmVuY2UnLCB7XG4gICAgICAgIHhtbG5zOiAnaHR0cDovL2ppdHNpLm9yZy9wcm90b2NvbC9jb2xpYnJpJyxcbiAgICAgICAgaWQ6IHRoaXMuY29uZmlkXG4gICAgfSk7XG5cbiAgICBmb3IgKHZhciBpZCBpbiB0aGlzLmVuZHBvaW50c0luZm8pIHtcbiAgICAgICAgZWxlbS5jKCdlbmRwb2ludCcpO1xuICAgICAgICBlbGVtLmF0dHJzKHsgaWQ6IGlkLFxuICAgICAgICAgICAgICAgICAgICAgZGlzcGxheW5hbWU6IHRoaXMuZW5kcG9pbnRzSW5mb1tpZF1bJ2Rpc3BsYXluYW1lJ11cbiAgICAgICAgfSk7XG4gICAgICAgIGVsZW0udXAoKTtcbiAgICB9XG5cbiAgICAvL2VsZW0udXAoKTsgLy9jb25mZXJlbmNlXG5cbiAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKFxuICAgICAgICBlbGVtLFxuICAgICAgICBmdW5jdGlvbiAocmVzdWx0KSB7fSxcbiAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7IGNvbnNvbGUud2FybihlcnJvcik7IH1cbiAgICApO1xufTtcblxuQ29saWJyaUZvY3VzLnByb3RvdHlwZS5fbWFrZUNvbmZlcmVuY2UgPSBmdW5jdGlvbiAoZXJyb3JDYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZWxlbSA9ICRpcSh7IHRvOiB0aGlzLmJyaWRnZWppZCwgdHlwZTogJ2dldCcgfSk7XG4gICAgZWxlbS5jKCdjb25mZXJlbmNlJywgeyB4bWxuczogJ2h0dHA6Ly9qaXRzaS5vcmcvcHJvdG9jb2wvY29saWJyaScgfSk7XG5cbiAgICB0aGlzLm1lZGlhLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgdmFyIGVsZW1OYW1lO1xuICAgICAgICB2YXIgZWxlbUF0dHJzID0geyBpbml0aWF0b3I6ICd0cnVlJywgZXhwaXJlOiBzZWxmLmNoYW5uZWxFeHBpcmUgfTtcblxuICAgICAgICBpZiAoJ2RhdGEnID09PSBuYW1lKVxuICAgICAgICB7XG4gICAgICAgICAgICBlbGVtTmFtZSA9ICdzY3RwY29ubmVjdGlvbic7XG4gICAgICAgICAgICBlbGVtQXR0cnNbJ3BvcnQnXSA9IDUwMDA7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZVxuICAgICAgICB7XG4gICAgICAgICAgICBlbGVtTmFtZSA9ICdjaGFubmVsJztcbiAgICAgICAgICAgIGlmICgoJ3ZpZGVvJyA9PT0gbmFtZSkgJiYgKHNlbGYuY2hhbm5lbExhc3ROID49IDApKVxuICAgICAgICAgICAgICAgIGVsZW1BdHRyc1snbGFzdC1uJ10gPSBzZWxmLmNoYW5uZWxMYXN0TjtcbiAgICAgICAgfVxuXG4gICAgICAgIGVsZW0uYygnY29udGVudCcsIHsgbmFtZTogbmFtZSB9KTtcblxuICAgICAgICBlbGVtLmMoZWxlbU5hbWUsIGVsZW1BdHRycyk7XG4gICAgICAgIGVsZW0uYXR0cnMoeyBlbmRwb2ludDogc2VsZi5teU11Y1Jlc291cmNlIH0pO1xuICAgICAgICBpZiAoY29uZmlnLnVzZUJ1bmRsZSkge1xuICAgICAgICAgICAgZWxlbS5hdHRycyh7ICdjaGFubmVsLWJ1bmRsZS1pZCc6IHNlbGYubXlNdWNSZXNvdXJjZSB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbGVtLnVwKCk7Ly8gZW5kIG9mIGNoYW5uZWwvc2N0cGNvbm5lY3Rpb25cblxuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHNlbGYucGVlcnMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIHZhciBwZWVyID0gc2VsZi5wZWVyc1tqXTtcbiAgICAgICAgICAgIHZhciBwZWVyRW5kcG9pbnQgPSBwZWVyLnN1YnN0cigxICsgcGVlci5sYXN0SW5kZXhPZignLycpKTtcblxuICAgICAgICAgICAgZWxlbS5jKGVsZW1OYW1lLCBlbGVtQXR0cnMpO1xuICAgICAgICAgICAgZWxlbS5hdHRycyh7IGVuZHBvaW50OiBwZWVyRW5kcG9pbnQgfSk7XG4gICAgICAgICAgICBpZiAoY29uZmlnLnVzZUJ1bmRsZSkge1xuICAgICAgICAgICAgICAgIGVsZW0uYXR0cnMoeyAnY2hhbm5lbC1idW5kbGUtaWQnOiBwZWVyRW5kcG9pbnQgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbGVtLnVwKCk7IC8vIGVuZCBvZiBjaGFubmVsL3NjdHBjb25uZWN0aW9uXG4gICAgICAgIH1cbiAgICAgICAgZWxlbS51cCgpOyAvLyBlbmQgb2YgY29udGVudFxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMuZW5kcG9pbnRzSW5mbyAhPT0gbnVsbCkge1xuICAgICAgICBmb3IgKHZhciBpZCBpbiB0aGlzLmVuZHBvaW50c0luZm8pIHtcbiAgICAgICAgICAgIGVsZW0uYygnZW5kcG9pbnQnKTtcbiAgICAgICAgICAgIGVsZW0uYXR0cnMoeyBpZDogaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGxheW5hbWU6IHRoaXMuZW5kcG9pbnRzSW5mb1tpZF1bJ2Rpc3BsYXluYW1lJ11cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZWxlbS51cCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLypcbiAgICB2YXIgbG9jYWxTRFAgPSBuZXcgU0RQKHRoaXMucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbi5zZHApO1xuICAgIGxvY2FsU0RQLm1lZGlhLmZvckVhY2goZnVuY3Rpb24gKG1lZGlhLCBjaGFubmVsKSB7XG4gICAgICAgIHZhciBuYW1lID0gU0RQVXRpbC5wYXJzZV9tbGluZShtZWRpYS5zcGxpdCgnXFxyXFxuJylbMF0pLm1lZGlhO1xuICAgICAgICBlbGVtLmMoJ2NvbnRlbnQnLCB7bmFtZTogbmFtZX0pO1xuICAgICAgICBlbGVtLmMoJ2NoYW5uZWwnLCB7aW5pdGlhdG9yOiAnZmFsc2UnLCBleHBpcmU6IHNlbGYuY2hhbm5lbEV4cGlyZX0pO1xuXG4gICAgICAgIC8vIEZJWE1FOiBzaG91bGQgcmV1c2UgY29kZSBmcm9tIC50b0ppbmdsZVxuICAgICAgICB2YXIgbWxpbmUgPSBTRFBVdGlsLnBhcnNlX21saW5lKG1lZGlhLnNwbGl0KCdcXHJcXG4nKVswXSk7XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbWxpbmUuZm10Lmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICB2YXIgcnRwbWFwID0gU0RQVXRpbC5maW5kX2xpbmUobWVkaWEsICdhPXJ0cG1hcDonICsgbWxpbmUuZm10W2pdKTtcbiAgICAgICAgICAgIGVsZW0uYygncGF5bG9hZC10eXBlJywgU0RQVXRpbC5wYXJzZV9ydHBtYXAocnRwbWFwKSk7XG4gICAgICAgICAgICBlbGVtLnVwKCk7XG4gICAgICAgIH1cblxuICAgICAgICBsb2NhbFNEUC5UcmFuc3BvcnRUb0ppbmdsZShjaGFubmVsLCBlbGVtKTtcblxuICAgICAgICBlbGVtLnVwKCk7IC8vIGVuZCBvZiBjaGFubmVsXG4gICAgICAgIGZvciAoaiA9IDA7IGogPCBzZWxmLnBlZXJzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBlbGVtLmMoJ2NoYW5uZWwnLCB7aW5pdGlhdG9yOiAndHJ1ZScsIGV4cGlyZTogc2VsZi5jaGFubmVsRXhwaXJlIH0pLnVwKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxlbS51cCgpOyAvLyBlbmQgb2YgY29udGVudFxuICAgIH0pO1xuICAgICovXG5cbiAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKGVsZW0sXG4gICAgICAgIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgIHNlbGYuY3JlYXRlZENvbmZlcmVuY2UocmVzdWx0KTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oZXJyb3IpO1xuICAgICAgICAgICAgZXJyb3JDYWxsYmFjayhlcnJvcik7XG4gICAgICAgIH1cbiAgICApO1xufTtcblxuLy8gY2FsbGJhY2sgd2hlbiBhIGNvbGlicmkgY29uZmVyZW5jZSB3YXMgY3JlYXRlZFxuQ29saWJyaUZvY3VzLnByb3RvdHlwZS5jcmVhdGVkQ29uZmVyZW5jZSA9IGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICBjb25zb2xlLmxvZygnY3JlYXRlZCBhIGNvbmZlcmVuY2Ugb24gdGhlIGJyaWRnZScpO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdG1wO1xuXG4gICAgdGhpcy5jb25maWQgPSAkKHJlc3VsdCkuZmluZCgnPmNvbmZlcmVuY2UnKS5hdHRyKCdpZCcpO1xuICAgIHZhciByZW1vdGVjb250ZW50cyA9ICQocmVzdWx0KS5maW5kKCc+Y29uZmVyZW5jZT5jb250ZW50JykuZ2V0KCk7XG4gICAgdmFyIG51bXBhcnRpY2lwYW50cyA9IDA7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZW1vdGVjb250ZW50cy5sZW5ndGg7IGkrKylcbiAgICB7XG4gICAgICAgIHZhciBjb250ZW50TmFtZSA9ICQocmVtb3RlY29udGVudHNbaV0pLmF0dHIoJ25hbWUnKTtcbiAgICAgICAgdmFyIGNoYW5uZWxOYW1lXG4gICAgICAgICAgICA9IGNvbnRlbnROYW1lICE9PSAnZGF0YScgPyAnPmNoYW5uZWwnIDogJz5zY3RwY29ubmVjdGlvbic7XG5cbiAgICAgICAgdG1wID0gJChyZW1vdGVjb250ZW50c1tpXSkuZmluZChjaGFubmVsTmFtZSkuZ2V0KCk7XG4gICAgICAgIHRoaXMubXljaGFubmVsLnB1c2goJCh0bXAuc2hpZnQoKSkpO1xuICAgICAgICBudW1wYXJ0aWNpcGFudHMgPSB0bXAubGVuZ3RoO1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgdG1wLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5jaGFubmVsc1tqXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jaGFubmVsc1tqXSA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jaGFubmVsc1tqXS5wdXNoKHRtcFtqXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBzYXZlIHRoZSAndHJhbnNwb3J0JyBlbGVtZW50cyBmcm9tICdjaGFubmVsLWJ1bmRsZSctc1xuICAgIHZhciBjaGFubmVsQnVuZGxlcyA9ICQocmVzdWx0KS5maW5kKCc+Y29uZmVyZW5jZT5jaGFubmVsLWJ1bmRsZScpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hhbm5lbEJ1bmRsZXMubGVuZ3RoOyBpKyspXG4gICAge1xuICAgICAgICB2YXIgZW5kcG9pbnRJZCA9ICQoY2hhbm5lbEJ1bmRsZXNbaV0pLmF0dHIoJ2lkJyk7XG4gICAgICAgIHRoaXMuYnVuZGxlZFRyYW5zcG9ydHNbZW5kcG9pbnRJZF0gPSAkKGNoYW5uZWxCdW5kbGVzW2ldKS5maW5kKCc+dHJhbnNwb3J0W3htbG5zPVwidXJuOnhtcHA6amluZ2xlOnRyYW5zcG9ydHM6aWNlLXVkcDoxXCJdJyk7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coJ3JlbW90ZSBjaGFubmVscycsIHRoaXMuY2hhbm5lbHMpO1xuXG4gICAgLy8gTm90aWZ5IHRoYXQgdGhlIGZvY3VzIGhhcyBjcmVhdGVkIHRoZSBjb25mZXJlbmNlIG9uIHRoZSBicmlkZ2VcbiAgICB0aGlzLmV2ZW50RW1pdHRlci5lbWl0KFhNUFBFdmVudHMuQ09ORkVSRU5DRV9DRVJBVEVELCBzZWxmKTtcblxuICAgIHZhciBicmlkZ2VTRFAgPSBuZXcgU0RQKFxuICAgICAgICAndj0wXFxyXFxuJyArXG4gICAgICAgICdvPS0gNTE1MTA1NTQ1ODg3NDk1MTIzMyAyIElOIElQNCAxMjcuMC4wLjFcXHJcXG4nICtcbiAgICAgICAgJ3M9LVxcclxcbicgK1xuICAgICAgICAndD0wIDBcXHJcXG4nICtcbiAgICAgICAgLyogQXVkaW8gKi9cbiAgICAgICAgKGNvbmZpZy51c2VCdW5kbGVcbiAgICAgICAgICAgID8gKCdhPWdyb3VwOkJVTkRMRSBhdWRpbyB2aWRlbycgK1xuICAgICAgICAgICAgICAgIChjb25maWcub3BlblNjdHAgPyAnIGRhdGEnIDogJycpICtcbiAgICAgICAgICAgICAgICdcXHJcXG4nKVxuICAgICAgICAgICAgOiAnJykgK1xuICAgICAgICAnbT1hdWRpbyAxIFJUUC9TQVZQRiAxMTEgMTAzIDEwNCAwIDggMTA2IDEwNSAxMyAxMjZcXHJcXG4nICtcbiAgICAgICAgJ2M9SU4gSVA0IDAuMC4wLjBcXHJcXG4nICtcbiAgICAgICAgJ2E9cnRjcDoxIElOIElQNCAwLjAuMC4wXFxyXFxuJyArXG4gICAgICAgICdhPW1pZDphdWRpb1xcclxcbicgK1xuICAgICAgICAnYT1leHRtYXA6MSB1cm46aWV0ZjpwYXJhbXM6cnRwLWhkcmV4dDpzc3JjLWF1ZGlvLWxldmVsXFxyXFxuJyArXG4gICAgICAgICdhPXNlbmRyZWN2XFxyXFxuJyArXG4gICAgICAgICdhPXJ0cG1hcDoxMTEgb3B1cy80ODAwMC8yXFxyXFxuJyArXG4gICAgICAgICdhPWZtdHA6MTExIG1pbnB0aW1lPTEwXFxyXFxuJyArXG4gICAgICAgICdhPXJ0cG1hcDoxMDMgSVNBQy8xNjAwMFxcclxcbicgK1xuICAgICAgICAnYT1ydHBtYXA6MTA0IElTQUMvMzIwMDBcXHJcXG4nICtcbiAgICAgICAgJ2E9cnRwbWFwOjAgUENNVS84MDAwXFxyXFxuJyArXG4gICAgICAgICdhPXJ0cG1hcDo4IFBDTUEvODAwMFxcclxcbicgK1xuICAgICAgICAnYT1ydHBtYXA6MTA2IENOLzMyMDAwXFxyXFxuJyArXG4gICAgICAgICdhPXJ0cG1hcDoxMDUgQ04vMTYwMDBcXHJcXG4nICtcbiAgICAgICAgJ2E9cnRwbWFwOjEzIENOLzgwMDBcXHJcXG4nICtcbiAgICAgICAgJ2E9cnRwbWFwOjEyNiB0ZWxlcGhvbmUtZXZlbnQvODAwMFxcclxcbicgK1xuICAgICAgICAnYT1tYXhwdGltZTo2MFxcclxcbicgK1xuICAgICAgICAoY29uZmlnLnVzZVJ0Y3BNdXggPyAnYT1ydGNwLW11eFxcclxcbicgOiAnJykgK1xuICAgICAgICAvKiBWaWRlbyAqL1xuICAgICAgICAnbT12aWRlbyAxIFJUUC9TQVZQRiAxMDAgMTE2IDExN1xcclxcbicgK1xuICAgICAgICAnYz1JTiBJUDQgMC4wLjAuMFxcclxcbicgK1xuICAgICAgICAnYT1ydGNwOjEgSU4gSVA0IDAuMC4wLjBcXHJcXG4nICtcbiAgICAgICAgJ2E9bWlkOnZpZGVvXFxyXFxuJyArXG4gICAgICAgICdhPWV4dG1hcDoyIHVybjppZXRmOnBhcmFtczpydHAtaGRyZXh0OnRvZmZzZXRcXHJcXG4nICtcbiAgICAgICAgJ2E9ZXh0bWFwOjMgaHR0cDovL3d3dy53ZWJydGMub3JnL2V4cGVyaW1lbnRzL3J0cC1oZHJleHQvYWJzLXNlbmQtdGltZVxcclxcbicgK1xuICAgICAgICAnYT1zZW5kcmVjdlxcclxcbicgK1xuICAgICAgICAnYT1ydHBtYXA6MTAwIFZQOC85MDAwMFxcclxcbicgK1xuICAgICAgICAnYT1ydGNwLWZiOjEwMCBjY20gZmlyXFxyXFxuJyArXG4gICAgICAgICdhPXJ0Y3AtZmI6MTAwIG5hY2tcXHJcXG4nICtcbiAgICAgICAgJ2E9cnRjcC1mYjoxMDAgZ29vZy1yZW1iXFxyXFxuJyArXG4gICAgICAgICdhPXJ0cG1hcDoxMTYgcmVkLzkwMDAwXFxyXFxuJyArXG4gICAgICAgICdhPXJ0cG1hcDoxMTcgdWxwZmVjLzkwMDAwXFxyXFxuJyArXG4gICAgICAgIChjb25maWcudXNlUnRjcE11eCA/ICdhPXJ0Y3AtbXV4XFxyXFxuJyA6ICcnKSArXG4gICAgICAgIC8qIERhdGEgU0NUUCAqL1xuICAgICAgICAoY29uZmlnLm9wZW5TY3RwID9cbiAgICAgICAgICAgICdtPWFwcGxpY2F0aW9uIDEgRFRMUy9TQ1RQIDUwMDBcXHJcXG4nICtcbiAgICAgICAgICAgICdjPUlOIElQNCAwLjAuMC4wXFxyXFxuJyArXG4gICAgICAgICAgICAnYT1zY3RwbWFwOjUwMDAgd2VicnRjLWRhdGFjaGFubmVsXFxyXFxuJyArXG4gICAgICAgICAgICAnYT1taWQ6ZGF0YVxcclxcbidcbiAgICAgICAgICAgIDogJycpXG4gICAgKTtcblxuICAgIGJyaWRnZVNEUC5tZWRpYS5sZW5ndGggPSB0aGlzLm15Y2hhbm5lbC5sZW5ndGg7XG4gICAgdmFyIGNoYW5uZWw7XG4gICAgLypcbiAgICBmb3IgKGNoYW5uZWwgPSAwOyBjaGFubmVsIDwgYnJpZGdlU0RQLm1lZGlhLmxlbmd0aDsgY2hhbm5lbCsrKSB7XG4gICAgICAgIGJyaWRnZVNEUC5tZWRpYVtjaGFubmVsXSA9ICcnO1xuICAgICAgICAvLyB1bmNoYW5nZWQgbGluZXNcbiAgICAgICAgYnJpZGdlU0RQLm1lZGlhW2NoYW5uZWxdICs9IFNEUFV0aWwuZmluZF9saW5lKGxvY2FsU0RQLm1lZGlhW2NoYW5uZWxdLCAnbT0nKSArICdcXHJcXG4nO1xuICAgICAgICBicmlkZ2VTRFAubWVkaWFbY2hhbm5lbF0gKz0gU0RQVXRpbC5maW5kX2xpbmUobG9jYWxTRFAubWVkaWFbY2hhbm5lbF0sICdjPScpICsgJ1xcclxcbic7XG4gICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZShsb2NhbFNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9cnRjcDonKSkge1xuICAgICAgICAgICAgYnJpZGdlU0RQLm1lZGlhW2NoYW5uZWxdICs9IFNEUFV0aWwuZmluZF9saW5lKGxvY2FsU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1ydGNwOicpICsgJ1xcclxcbic7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKGxvY2FsU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1taWQ6JykpIHtcbiAgICAgICAgICAgIGJyaWRnZVNEUC5tZWRpYVtjaGFubmVsXSArPSBTRFBVdGlsLmZpbmRfbGluZShsb2NhbFNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9bWlkOicpICsgJ1xcclxcbic7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKGxvY2FsU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1zZW5kcmVjdicpKSB7XG4gICAgICAgICAgICBicmlkZ2VTRFAubWVkaWFbY2hhbm5lbF0gKz0gJ2E9c2VuZHJlY3ZcXHJcXG4nO1xuICAgICAgICB9XG4gICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZShsb2NhbFNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9ZXh0bWFwOicpKSB7XG4gICAgICAgICAgICBicmlkZ2VTRFAubWVkaWFbY2hhbm5lbF0gKz0gU0RQVXRpbC5maW5kX2xpbmVzKGxvY2FsU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1leHRtYXA6Jykuam9pbignXFxyXFxuJykgKyAnXFxyXFxuJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZJWE1FOiBzaG91bGQgbG9vayBhdCBtLWxpbmUgYW5kIGdyb3VwIHRoZSBpZHMgdG9nZXRoZXJcbiAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKGxvY2FsU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1ydHBtYXA6JykpIHtcbiAgICAgICAgICAgIGJyaWRnZVNEUC5tZWRpYVtjaGFubmVsXSArPSBTRFBVdGlsLmZpbmRfbGluZXMobG9jYWxTRFAubWVkaWFbY2hhbm5lbF0sICdhPXJ0cG1hcDonKS5qb2luKCdcXHJcXG4nKSArICdcXHJcXG4nO1xuICAgICAgICB9XG4gICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZShsb2NhbFNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9Zm10cDonKSkge1xuICAgICAgICAgICAgYnJpZGdlU0RQLm1lZGlhW2NoYW5uZWxdICs9IFNEUFV0aWwuZmluZF9saW5lcyhsb2NhbFNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9Zm10cDonKS5qb2luKCdcXHJcXG4nKSArICdcXHJcXG4nO1xuICAgICAgICB9XG4gICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZShsb2NhbFNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9cnRjcC1mYjonKSkge1xuICAgICAgICAgICAgYnJpZGdlU0RQLm1lZGlhW2NoYW5uZWxdICs9IFNEUFV0aWwuZmluZF9saW5lcyhsb2NhbFNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9cnRjcC1mYjonKS5qb2luKCdcXHJcXG4nKSArICdcXHJcXG4nO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZJWE1FOiBjaGFuZ2VkIGxpbmVzIC0tIGE9c2VuZHJlY3YgZGlyZWN0aW9uLCBhPXNldHVwIGRpcmVjdGlvblxuICAgIH1cbiAgICAqL1xuICAgIGZvciAoY2hhbm5lbCA9IDA7IGNoYW5uZWwgPCBicmlkZ2VTRFAubWVkaWEubGVuZ3RoOyBjaGFubmVsKyspIHtcbiAgICAgICAgLy8gZ2V0IHRoZSBtaXhlZCBzc3JjXG4gICAgICAgIHRtcCA9ICQodGhpcy5teWNoYW5uZWxbY2hhbm5lbF0pLmZpbmQoJz5zb3VyY2VbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6c3NtYTowXCJdJyk7XG4gICAgICAgIC8vIEZJWE1FOiBjaGVjayBydHAtbGV2ZWwtcmVsYXktdHlwZVxuXG4gICAgICAgIHZhciBuYW1lID0gYnJpZGdlU0RQLm1lZGlhW2NoYW5uZWxdLnNwbGl0KFwiIFwiKVswXS5zdWJzdHIoMik7IC8vICdtPWF1ZGlvIC4uLidcbiAgICAgICAgaWYgKG5hbWUgPT09ICdhdWRpbycgfHwgbmFtZSA9PT0gJ3ZpZGVvJykge1xuICAgICAgICAgICAgLy8gbWFrZSBjaHJvbWUgaGFwcHkuLi4gJzM3MzU5Mjg1NTknID09IDB4REVBREJFRUZcbiAgICAgICAgICAgIHZhciBzc3JjID0gdG1wLmxlbmd0aCA/IHRtcC5hdHRyKCdzc3JjJykgOiAnMzczNTkyODU1OSc7XG5cbiAgICAgICAgICAgIGJyaWRnZVNEUC5tZWRpYVtjaGFubmVsXSArPSAnYT1zc3JjOicgKyBzc3JjICsgJyBjbmFtZTptaXhlZFxcclxcbic7XG4gICAgICAgICAgICBicmlkZ2VTRFAubWVkaWFbY2hhbm5lbF0gKz0gJ2E9c3NyYzonICsgc3NyYyArICcgbGFiZWw6bWl4ZWRsYWJlbCcgKyBuYW1lICsgJzBcXHJcXG4nO1xuICAgICAgICAgICAgYnJpZGdlU0RQLm1lZGlhW2NoYW5uZWxdICs9ICdhPXNzcmM6JyArIHNzcmMgKyAnIG1zaWQ6bWl4ZWRtc2xhYmVsIG1peGVkbGFiZWwnICsgbmFtZSArICcwXFxyXFxuJztcbiAgICAgICAgICAgIGJyaWRnZVNEUC5tZWRpYVtjaGFubmVsXSArPSAnYT1zc3JjOicgKyBzc3JjICsgJyBtc2xhYmVsOm1peGVkbXNsYWJlbFxcclxcbic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGSVhNRTogc2hvdWxkIHRha2UgY29kZSBmcm9tIC5mcm9tSmluZ2xlXG4gICAgICAgIHZhciBjaGFubmVsQnVuZGxlSWQgPSAkKHRoaXMubXljaGFubmVsW2NoYW5uZWxdKS5hdHRyKCdjaGFubmVsLWJ1bmRsZS1pZCcpO1xuICAgICAgICBpZiAodHlwZW9mIGNoYW5uZWxCdW5kbGVJZCAhPSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdG1wID0gdGhpcy5idW5kbGVkVHJhbnNwb3J0c1tjaGFubmVsQnVuZGxlSWRdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdG1wID0gJCh0aGlzLm15Y2hhbm5lbFtjaGFubmVsXSkuZmluZCgnPnRyYW5zcG9ydFt4bWxucz1cInVybjp4bXBwOmppbmdsZTp0cmFuc3BvcnRzOmljZS11ZHA6MVwiXScpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRtcC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGJyaWRnZVNEUC5tZWRpYVtjaGFubmVsXSArPSAnYT1pY2UtdWZyYWc6JyArIHRtcC5hdHRyKCd1ZnJhZycpICsgJ1xcclxcbic7XG4gICAgICAgICAgICBicmlkZ2VTRFAubWVkaWFbY2hhbm5lbF0gKz0gJ2E9aWNlLXB3ZDonICsgdG1wLmF0dHIoJ3B3ZCcpICsgJ1xcclxcbic7XG4gICAgICAgICAgICB0bXAuZmluZCgnPmNhbmRpZGF0ZScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGJyaWRnZVNEUC5tZWRpYVtjaGFubmVsXSArPSBTRFBVdGlsLmNhbmRpZGF0ZUZyb21KaW5nbGUodGhpcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRtcCA9IHRtcC5maW5kKCc+ZmluZ2VycHJpbnQnKTtcbiAgICAgICAgICAgIGlmICh0bXAubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgYnJpZGdlU0RQLm1lZGlhW2NoYW5uZWxdICs9ICdhPWZpbmdlcnByaW50OicgKyB0bXAuYXR0cignaGFzaCcpICsgJyAnICsgdG1wLnRleHQoKSArICdcXHJcXG4nO1xuICAgICAgICAgICAgICAgIGJyaWRnZVNEUC5tZWRpYVtjaGFubmVsXSArPSAnYT1zZXR1cDphY3RwYXNzXFxyXFxuJzsgLy8gb2ZmZXIgc28gYWx3YXlzIGFjdHBhc3NcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBicmlkZ2VTRFAucmF3ID0gYnJpZGdlU0RQLnNlc3Npb24gKyBicmlkZ2VTRFAubWVkaWEuam9pbignJyk7XG4gICAgdmFyIGJyaWRnZURlc2MgPSBuZXcgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKHt0eXBlOiAnb2ZmZXInLCBzZHA6IGJyaWRnZVNEUC5yYXd9KTtcbiAgICB2YXIgc2ltdWxjYXN0ID0gbmV3IFNpbXVsY2FzdCgpO1xuICAgIHZhciBicmlkZ2VEZXNjID0gc2ltdWxjYXN0LnRyYW5zZm9ybVJlbW90ZURlc2NyaXB0aW9uKGJyaWRnZURlc2MpO1xuXG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5zZXRSZW1vdGVEZXNjcmlwdGlvbihicmlkZ2VEZXNjLFxuICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc2V0UmVtb3RlRGVzY3JpcHRpb24gc3VjY2VzcycpO1xuICAgICAgICAgICAgc2VsZi5wZWVyY29ubmVjdGlvbi5jcmVhdGVBbnN3ZXIoXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnBlZXJjb25uZWN0aW9uLnNldExvY2FsRGVzY3JpcHRpb24oYW5zd2VyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzZXRMb2NhbERlc2NyaXB0aW9uIHN1Y2NlZWRlZC4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBtYWtlIHN1cmUgb3VyIHByZXNlbmNlIGlzIHVwZGF0ZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdzZXRMb2NhbERlc2NyaXB0aW9uLmppbmdsZScsIFtzZWxmLnNpZF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBlbGVtID0gJGlxKHt0bzogc2VsZi5icmlkZ2VqaWQsIHR5cGU6ICdnZXQnfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5jKCdjb25mZXJlbmNlJywge3htbG5zOiAnaHR0cDovL2ppdHNpLm9yZy9wcm90b2NvbC9jb2xpYnJpJywgaWQ6IHNlbGYuY29uZmlkfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxvY2FsU0RQID0gbmV3IFNEUChzZWxmLnBlZXJjb25uZWN0aW9uLmxvY2FsRGVzY3JpcHRpb24uc2RwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhbFNEUC5tZWRpYS5mb3JFYWNoKGZ1bmN0aW9uIChtZWRpYSwgY2hhbm5lbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IFNEUFV0aWwucGFyc2VfbWlkKFNEUFV0aWwuZmluZF9saW5lKG1lZGlhLCAnYT1taWQ6JykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmMoJ2NvbnRlbnQnLCB7bmFtZTogbmFtZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWxpbmUgPSBTRFBVdGlsLnBhcnNlX21saW5lKG1lZGlhLnNwbGl0KCdcXHJcXG4nKVswXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuYW1lICE9PSAnZGF0YScpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uYygnY2hhbm5lbCcsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbml0aWF0b3I6ICd0cnVlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBpcmU6IHNlbGYuY2hhbm5lbEV4cGlyZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZDogc2VsZi5teWNoYW5uZWxbY2hhbm5lbF0uYXR0cignaWQnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmRwb2ludDogc2VsZi5teU11Y1Jlc291cmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2lnbmFsICh0aHJvdWdoIENPTElCUkkpIHRvIHRoZSBicmlkZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBTU1JDIGdyb3VwcyBvZiB0aGUgcGFydGljaXBhbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoYXQgcGxheXMgdGhlIHJvbGUgb2YgdGhlIGZvY3VzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc3NyY19ncm91cF9saW5lcyA9IFNEUFV0aWwuZmluZF9saW5lcyhtZWRpYSwgJ2E9c3NyYy1ncm91cDonKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHggPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3NyY19ncm91cF9saW5lcy5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZHggPSBsaW5lLmluZGV4T2YoJyAnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2VtYW50aWNzID0gbGluZS5zdWJzdHIoMCwgaWR4KS5zdWJzdHIoMTMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzc3JjcyA9IGxpbmUuc3Vic3RyKDE0ICsgc2VtYW50aWNzLmxlbmd0aCkuc3BsaXQoJyAnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3NyY3MubGVuZ3RoICE9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5jKCdzc3JjLWdyb3VwJywgeyBzZW1hbnRpY3M6IHNlbWFudGljcywgeG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6c3NtYTowJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3NyY3MuZm9yRWFjaChmdW5jdGlvbihzc3JjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmMoJ3NvdXJjZScsIHsgc3NyYzogc3NyYyB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC51cCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS51cCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IHNob3VsZCByZXVzZSBjb2RlIGZyb20gLnRvSmluZ2xlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG1saW5lLmZtdC5sZW5ndGg7IGorKylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcnRwbWFwID0gU0RQVXRpbC5maW5kX2xpbmUobWVkaWEsICdhPXJ0cG1hcDonICsgbWxpbmUuZm10W2pdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocnRwbWFwKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5jKCdwYXlsb2FkLXR5cGUnLCBTRFBVdGlsLnBhcnNlX3J0cG1hcChydHBtYXApKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS51cCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzY3RwbWFwID0gU0RQVXRpbC5maW5kX2xpbmUobWVkaWEsICdhPXNjdHBtYXA6JyArIG1saW5lLmZtdFswXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2N0cFBvcnQgPSBTRFBVdGlsLnBhcnNlX3NjdHBtYXAoc2N0cG1hcClbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmMoXCJzY3RwY29ubmVjdGlvblwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5pdGlhdG9yOiAndHJ1ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGlyZTogc2VsZi5jaGFubmVsRXhwaXJlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZDogc2VsZi5teWNoYW5uZWxbY2hhbm5lbF0uYXR0cignaWQnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kcG9pbnQ6IHNlbGYubXlNdWNSZXNvdXJjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9ydDogc2N0cFBvcnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxTRFAuVHJhbnNwb3J0VG9KaW5nbGUoY2hhbm5lbCwgZWxlbSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS51cCgpOyAvLyBlbmQgb2YgY2hhbm5lbFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLnVwKCk7IC8vIGVuZCBvZiBjb250ZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmNvbm5lY3Rpb24uc2VuZElRKGVsZW0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIC4uLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJFUlJPUiBzZW5kaW5nIGNvbGlicmkgbWVzc2FnZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yLCBlbGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBub3cgaW5pdGlhdGUgc2Vzc2lvbnNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG51bXBhcnRpY2lwYW50czsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuaW5pdGlhdGUoc2VsZi5wZWVyc1tpXSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm90aWZ5IHdlJ3ZlIGNyZWF0ZWQgdGhlIGNvbmZlcmVuY2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmV2ZW50RW1pdHRlci5lbWl0KFhNUFBFdmVudHMuQ09ORkVSRU5DRV9DRVJBVEVELCBzZWxmKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ3NldExvY2FsRGVzY3JpcHRpb24gZmFpbGVkLicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ2NyZWF0ZUFuc3dlciBmYWlsZWQuJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1wYXJ0aWNpcGFudHM7IGkrKykge1xuICAgICAgICAgICAgICAgIHNlbGYuaW5pdGlhdGUoc2VsZi5wZWVyc1tpXSwgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAqL1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzZXRSZW1vdGVEZXNjcmlwdGlvbiBmYWlsZWQuJywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgKTtcblxufTtcblxuLy8gc2VuZCBhIHNlc3Npb24taW5pdGlhdGUgdG8gYSBuZXcgcGFydGljaXBhbnRcbkNvbGlicmlGb2N1cy5wcm90b3R5cGUuaW5pdGlhdGUgPSBmdW5jdGlvbiAocGVlciwgaXNJbml0aWF0b3IpIHtcbiAgICB2YXIgcGFydGljaXBhbnQgPSB0aGlzLnBlZXJzLmluZGV4T2YocGVlcik7XG4gICAgY29uc29sZS5sb2coJ3RlbGwnLCBwZWVyLCBwYXJ0aWNpcGFudCk7XG4gICAgdmFyIHNkcDtcbiAgICBpZiAodGhpcy5wZWVyY29ubmVjdGlvbiAhPT0gbnVsbCAmJiB0aGlzLnBlZXJjb25uZWN0aW9uLnNpZ25hbGluZ1N0YXRlID09ICdzdGFibGUnKSB7XG4gICAgICAgIHNkcCA9IG5ldyBTRFAodGhpcy5wZWVyY29ubmVjdGlvbi5yZW1vdGVEZXNjcmlwdGlvbi5zZHApO1xuICAgICAgICB2YXIgbG9jYWxTRFAgPSBuZXcgU0RQKHRoaXMucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbi5zZHApO1xuICAgICAgICAvLyB0aHJvdyBhd2F5IHN0dWZmIHdlIGRvbid0IHdhbnRcbiAgICAgICAgLy8gbm90IG5lZWRlZCB3aXRoIHN0YXRpYyBvZmZlclxuICAgICAgICBpZiAoIWNvbmZpZy51c2VCdW5kbGUpIHtcbiAgICAgICAgICAgIHNkcC5yZW1vdmVTZXNzaW9uTGluZXMoJ2E9Z3JvdXA6Jyk7XG4gICAgICAgIH1cbiAgICAgICAgc2RwLnJlbW92ZVNlc3Npb25MaW5lcygnYT1tc2lkLXNlbWFudGljOicpOyAvLyBGSVhNRTogbm90IG1hcHBlZCBvdmVyIGppbmdsZSBhbnl3YXkuLi5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZHAubWVkaWEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICghY29uZmlnLnVzZVJ0Y3BNdXgpe1xuICAgICAgICAgICAgICAgIHNkcC5yZW1vdmVNZWRpYUxpbmVzKGksICdhPXJ0Y3AtbXV4Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZHAucmVtb3ZlTWVkaWFMaW5lcyhpLCAnYT1zc3JjOicpO1xuICAgICAgICAgICAgc2RwLnJlbW92ZU1lZGlhTGluZXMoaSwgJ2E9c3NyYy1ncm91cDonKTtcbiAgICAgICAgICAgIHNkcC5yZW1vdmVNZWRpYUxpbmVzKGksICdhPWNyeXB0bzonKTtcbiAgICAgICAgICAgIHNkcC5yZW1vdmVNZWRpYUxpbmVzKGksICdhPWNhbmRpZGF0ZTonKTtcbiAgICAgICAgICAgIHNkcC5yZW1vdmVNZWRpYUxpbmVzKGksICdhPWljZS1vcHRpb25zOmdvb2dsZS1pY2UnKTtcbiAgICAgICAgICAgIHNkcC5yZW1vdmVNZWRpYUxpbmVzKGksICdhPWljZS11ZnJhZzonKTtcbiAgICAgICAgICAgIHNkcC5yZW1vdmVNZWRpYUxpbmVzKGksICdhPWljZS1wd2Q6Jyk7XG4gICAgICAgICAgICBzZHAucmVtb3ZlTWVkaWFMaW5lcyhpLCAnYT1maW5nZXJwcmludDonKTtcbiAgICAgICAgICAgIHNkcC5yZW1vdmVNZWRpYUxpbmVzKGksICdhPXNldHVwOicpO1xuXG4gICAgICAgICAgICBpZiAoMSkgeyAvL2kgPiAwKSB7IC8vIG5vdCBmb3IgYXVkaW8gRklYTUU6IGRvZXMgbm90IHdvcmsgYXMgaW50ZW5kZWRcbiAgICAgICAgICAgICAgICAvLyByZS1hZGQgYWxsIHJlbW90ZSBhPXNzcmNzIF9hbmRfIGE9c3NyYy1ncm91cFxuICAgICAgICAgICAgICAgIGZvciAodmFyIGppZCBpbiB0aGlzLnJlbW90ZXNzcmMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGppZCA9PSBwZWVyIHx8ICF0aGlzLnJlbW90ZXNzcmNbamlkXVtpXSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICBzZHAubWVkaWFbaV0gKz0gdGhpcy5yZW1vdGVzc3JjW2ppZF1baV07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gYWRkIGxvY2FsIGE9c3NyYy1ncm91cDogbGluZXNcbiAgICAgICAgICAgICAgICBsaW5lcyA9IFNEUFV0aWwuZmluZF9saW5lcyhsb2NhbFNEUC5tZWRpYVtpXSwgJ2E9c3NyYy1ncm91cDonKTtcbiAgICAgICAgICAgICAgICBpZiAobGluZXMubGVuZ3RoICE9IDApXG4gICAgICAgICAgICAgICAgICAgIHNkcC5tZWRpYVtpXSArPSBsaW5lcy5qb2luKCdcXHJcXG4nKSArICdcXHJcXG4nO1xuXG4gICAgICAgICAgICAgICAgLy8gYW5kIGxvY2FsIGE9c3NyYzogbGluZXNcbiAgICAgICAgICAgICAgICBzZHAubWVkaWFbaV0gKz0gU0RQVXRpbC5maW5kX2xpbmVzKGxvY2FsU0RQLm1lZGlhW2ldLCAnYT1zc3JjOicpLmpvaW4oJ1xcclxcbicpICsgJ1xcclxcbic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc2RwLnJhdyA9IHNkcC5zZXNzaW9uICsgc2RwLm1lZGlhLmpvaW4oJycpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ2NhbiBub3QgaW5pdGlhdGUgYSBuZXcgc2Vzc2lvbiB3aXRob3V0IGEgc3RhYmxlIHBlZXJjb25uZWN0aW9uJyk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBhZGQgc3R1ZmYgd2UgZ290IGZyb20gdGhlIGJyaWRnZVxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgc2RwLm1lZGlhLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciBjaGFuID0gJCh0aGlzLmNoYW5uZWxzW3BhcnRpY2lwYW50XVtqXSk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdjaGFubmVsIGlkJywgY2hhbi5hdHRyKCdpZCcpKTtcblxuICAgICAgICB0bXAgPSBjaGFuLmZpbmQoJz5zb3VyY2VbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6c3NtYTowXCJdJyk7XG5cbiAgICAgICAgdmFyIG5hbWUgPSBzZHAubWVkaWFbal0uc3BsaXQoXCIgXCIpWzBdLnN1YnN0cigyKTsgLy8gJ209YXVkaW8gLi4uJ1xuICAgICAgICBpZiAobmFtZSA9PT0gJ2F1ZGlvJyB8fCBuYW1lID09PSAndmlkZW8nKSB7XG4gICAgICAgICAgICAvLyBtYWtlIGNocm9tZSBoYXBweS4uLiAnMzczNTkyODU1OScgPT0gMHhERUFEQkVFRlxuICAgICAgICAgICAgdmFyIHNzcmMgPSB0bXAubGVuZ3RoID8gdG1wLmF0dHIoJ3NzcmMnKSA6ICczNzM1OTI4NTU5JztcblxuICAgICAgICAgICAgc2RwLm1lZGlhW2pdICs9ICdhPXNzcmM6JyArIHNzcmMgKyAnIGNuYW1lOm1peGVkXFxyXFxuJztcbiAgICAgICAgICAgIHNkcC5tZWRpYVtqXSArPSAnYT1zc3JjOicgKyBzc3JjICsgJyBsYWJlbDptaXhlZGxhYmVsJyArIG5hbWUgKyAnMFxcclxcbic7XG4gICAgICAgICAgICBzZHAubWVkaWFbal0gKz0gJ2E9c3NyYzonICsgc3NyYyArICcgbXNpZDptaXhlZG1zbGFiZWwgbWl4ZWRsYWJlbCcgKyBuYW1lICsgJzBcXHJcXG4nO1xuICAgICAgICAgICAgc2RwLm1lZGlhW2pdICs9ICdhPXNzcmM6JyArIHNzcmMgKyAnIG1zbGFiZWw6bWl4ZWRtc2xhYmVsXFxyXFxuJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluIHRoZSBjYXNlIG9mIGJ1bmRsZSwgd2UgYWRkIGVhY2ggY2FuZGlkYXRlIHRvIGFsbCBtPSBsaW5lcy9qaW5nbGUgY29udGVudHMsXG4gICAgICAgIC8vIGp1c3QgYXMgY2hyb21lIGRvZXNcbiAgICAgICAgaWYgKGNvbmZpZy51c2VCdW5kbGUpe1xuICAgICAgICAgICAgdG1wID0gdGhpcy5idW5kbGVkVHJhbnNwb3J0c1tjaGFuLmF0dHIoJ2NoYW5uZWwtYnVuZGxlLWlkJyldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdG1wID0gY2hhbi5maW5kKCc+dHJhbnNwb3J0W3htbG5zPVwidXJuOnhtcHA6amluZ2xlOnRyYW5zcG9ydHM6aWNlLXVkcDoxXCJdJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG1wLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHRtcC5hdHRyKCd1ZnJhZycpKVxuICAgICAgICAgICAgICAgIHNkcC5tZWRpYVtqXSArPSAnYT1pY2UtdWZyYWc6JyArIHRtcC5hdHRyKCd1ZnJhZycpICsgJ1xcclxcbic7XG4gICAgICAgICAgICBpZiAodG1wLmF0dHIoJ3B3ZCcpKVxuICAgICAgICAgICAgICAgIHNkcC5tZWRpYVtqXSArPSAnYT1pY2UtcHdkOicgKyB0bXAuYXR0cigncHdkJykgKyAnXFxyXFxuJztcbiAgICAgICAgICAgIC8vIGFuZCB0aGUgY2FuZGlkYXRlcy4uLlxuICAgICAgICAgICAgdG1wLmZpbmQoJz5jYW5kaWRhdGUnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzZHAubWVkaWFbal0gKz0gU0RQVXRpbC5jYW5kaWRhdGVGcm9tSmluZ2xlKHRoaXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0bXAgPSB0bXAuZmluZCgnPmZpbmdlcnByaW50Jyk7XG4gICAgICAgICAgICBpZiAodG1wLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHNkcC5tZWRpYVtqXSArPSAnYT1maW5nZXJwcmludDonICsgdG1wLmF0dHIoJ2hhc2gnKSArICcgJyArIHRtcC50ZXh0KCkgKyAnXFxyXFxuJztcbiAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgIGlmICh0bXAuYXR0cignZGlyZWN0aW9uJykpIHtcbiAgICAgICAgICAgICAgICAgICAgc2RwLm1lZGlhW2pdICs9ICdhPXNldHVwOicgKyB0bXAuYXR0cignZGlyZWN0aW9uJykgKyAnXFxyXFxuJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBzZHAubWVkaWFbal0gKz0gJ2E9c2V0dXA6YWN0cGFzc1xcclxcbic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gbWFrZSBhIG5ldyBjb2xpYnJpIHNlc3Npb24gYW5kIGNvbmZpZ3VyZSBpdFxuICAgIC8vIEZJWE1FOiBpcyBpdCBjb3JyZWN0IHRvIHVzZSB0aGlzLmNvbm5lY3Rpb24uamlkIHdoZW4gdXNlZCBpbiBhIE1VQz9cbiAgICB2YXIgc2VzcyA9IG5ldyBDb2xpYnJpU2Vzc2lvbih0aGlzLmNvbm5lY3Rpb24uamlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCAxMiksIC8vIHJhbmRvbSBzdHJpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24pO1xuICAgIHNlc3MuaW5pdGlhdGUocGVlcik7XG4gICAgc2Vzcy5jb2xpYnJpID0gdGhpcztcbiAgICAvLyBXZSBkbyBub3QgYW5ub3VuY2Ugb3VyIGF1ZGlvIHBlciBjb25mZXJlbmNlIHBlZXIsIHNvIG9ubHkgdmlkZW8gaXMgc2V0IGhlcmVcbiAgICBzZXNzLmxvY2FsVmlkZW8gPSB0aGlzLmNvbm5lY3Rpb24uamluZ2xlLmxvY2FsVmlkZW87XG4gICAgc2Vzcy5tZWRpYV9jb25zdHJhaW50cyA9IHRoaXMuY29ubmVjdGlvbi5qaW5nbGUubWVkaWFfY29uc3RyYWludHM7XG4gICAgc2Vzcy5wY19jb25zdHJhaW50cyA9IHRoaXMuY29ubmVjdGlvbi5qaW5nbGUucGNfY29uc3RyYWludHM7XG4gICAgc2Vzcy5pY2VfY29uZmlnID0gdGhpcy5jb25uZWN0aW9uLmppbmdsZS5pY2VfY29uZmlnO1xuXG4gICAgdGhpcy5jb25uZWN0aW9uLmppbmdsZS5zZXNzaW9uc1tzZXNzLnNpZF0gPSBzZXNzO1xuICAgIHRoaXMuY29ubmVjdGlvbi5qaW5nbGUuamlkMnNlc3Npb25bc2Vzcy5wZWVyamlkXSA9IHNlc3M7XG5cbiAgICAvLyBzZW5kIGEgc2Vzc2lvbi1pbml0aWF0ZVxuICAgIHZhciBpbml0ID0gJGlxKHt0bzogcGVlciwgdHlwZTogJ3NldCd9KVxuICAgICAgICAuYygnamluZ2xlJyxcbiAgICAgICAgICAgIHt4bWxuczogJ3Vybjp4bXBwOmppbmdsZToxJyxcbiAgICAgICAgICAgICBhY3Rpb246ICdzZXNzaW9uLWluaXRpYXRlJyxcbiAgICAgICAgICAgICBpbml0aWF0b3I6IHNlc3MubWUsXG4gICAgICAgICAgICAgc2lkOiBzZXNzLnNpZFxuICAgICAgICAgICAgfVxuICAgICk7XG4gICAgc2RwLnRvSmluZ2xlKGluaXQsICdpbml0aWF0b3InKTtcbiAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKGluaXQsXG4gICAgICAgIGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnb3QgcmVzdWx0Jyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnb3QgZXJyb3InKTtcbiAgICAgICAgfVxuICAgICk7XG59O1xuXG4vLyBwdWxsIGluIGEgbmV3IHBhcnRpY2lwYW50IGludG8gdGhlIGNvbmZlcmVuY2VcbkNvbGlicmlGb2N1cy5wcm90b3R5cGUuYWRkTmV3UGFydGljaXBhbnQgPSBmdW5jdGlvbiAocGVlcikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAodGhpcy5jb25maWQgPT09IDAgfHwgIXRoaXMucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbilcbiAgICB7XG4gICAgICAgIC8vIGJhZCBzdGF0ZVxuICAgICAgICBpZiAodGhpcy5jb25maWQgPT09IDApXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2NvbmZpZCBkb2VzIG5vdCBleGlzdCB5ZXQsIHBvc3Rwb25pbmcnLCBwZWVyKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2xvY2FsIGRlc2NyaXB0aW9uIG5vdCByZWFkeSB5ZXQsIHBvc3Rwb25pbmcnLCBwZWVyKTtcbiAgICAgICAgfVxuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7IHNlbGYuYWRkTmV3UGFydGljaXBhbnQocGVlcik7IH0sIDI1MCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGluZGV4ID0gdGhpcy5jaGFubmVscy5sZW5ndGg7XG4gICAgdGhpcy5jaGFubmVscy5wdXNoKFtdKTtcbiAgICB0aGlzLnBlZXJzLnB1c2gocGVlcik7XG5cbiAgICB2YXIgZWxlbSA9ICRpcSh7dG86IHRoaXMuYnJpZGdlamlkLCB0eXBlOiAnZ2V0J30pO1xuICAgIGVsZW0uYyhcbiAgICAgICAgJ2NvbmZlcmVuY2UnLFxuICAgICAgICB7IHhtbG5zOiAnaHR0cDovL2ppdHNpLm9yZy9wcm90b2NvbC9jb2xpYnJpJywgaWQ6IHRoaXMuY29uZmlkIH0pO1xuICAgIHZhciBsb2NhbFNEUCA9IG5ldyBTRFAodGhpcy5wZWVyY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uLnNkcCk7XG4gICAgbG9jYWxTRFAubWVkaWEuZm9yRWFjaChmdW5jdGlvbiAobWVkaWEsIGNoYW5uZWwpIHtcbiAgICAgICAgdmFyIG5hbWUgPSBTRFBVdGlsLnBhcnNlX21pZChTRFBVdGlsLmZpbmRfbGluZShtZWRpYSwgJ2E9bWlkOicpKTtcbiAgICAgICAgdmFyIGVsZW1OYW1lO1xuICAgICAgICB2YXIgZW5kcG9pbnRJZCA9IHBlZXIuc3Vic3RyKDEgKyBwZWVyLmxhc3RJbmRleE9mKCcvJykpO1xuICAgICAgICB2YXIgZWxlbUF0dHJzXG4gICAgICAgICAgICA9IHtcbiAgICAgICAgICAgICAgICBpbml0aWF0b3I6ICd0cnVlJyxcbiAgICAgICAgICAgICAgICBleHBpcmU6IHNlbGYuY2hhbm5lbEV4cGlyZSxcbiAgICAgICAgICAgICAgICBlbmRwb2ludDogZW5kcG9pbnRJZFxuICAgICAgICAgICAgfTtcbiAgICAgICAgaWYgKGNvbmZpZy51c2VCdW5kbGUpIHtcbiAgICAgICAgICAgIGVsZW1BdHRyc1snY2hhbm5lbC1idW5kbGUtaWQnXSA9IGVuZHBvaW50SWQ7XG4gICAgICAgIH1cblxuXG4gICAgICAgIGlmICgnZGF0YScgPT0gbmFtZSlcbiAgICAgICAge1xuICAgICAgICAgICAgZWxlbU5hbWUgPSAnc2N0cGNvbm5lY3Rpb24nO1xuICAgICAgICAgICAgZWxlbUF0dHJzWydwb3J0J10gPSA1MDAwO1xuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAge1xuICAgICAgICAgICAgZWxlbU5hbWUgPSAnY2hhbm5lbCc7XG4gICAgICAgICAgICBpZiAoKCd2aWRlbycgPT09IG5hbWUpICYmIChzZWxmLmNoYW5uZWxMYXN0TiA+PSAwKSlcbiAgICAgICAgICAgICAgICBlbGVtQXR0cnNbJ2xhc3QtbiddID0gc2VsZi5jaGFubmVsTGFzdE47XG4gICAgICAgIH1cblxuICAgICAgICBlbGVtLmMoJ2NvbnRlbnQnLCB7IG5hbWU6IG5hbWUgfSk7XG4gICAgICAgIGVsZW0uYyhlbGVtTmFtZSwgZWxlbUF0dHJzKTtcbiAgICAgICAgZWxlbS51cCgpOyAvLyBlbmQgb2YgY2hhbm5lbC9zY3RwY29ubmVjdGlvblxuICAgICAgICBlbGVtLnVwKCk7IC8vIGVuZCBvZiBjb250ZW50XG4gICAgfSk7XG5cbiAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKGVsZW0sXG4gICAgICAgIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgIHZhciBjb250ZW50cyA9ICQocmVzdWx0KS5maW5kKCc+Y29uZmVyZW5jZT5jb250ZW50JykuZ2V0KCk7XG4gICAgICAgICAgICB2YXIgaTtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBjb250ZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBjaGFubmVsWG1sID0gJChjb250ZW50c1tpXSkuZmluZCgnPmNoYW5uZWwnKTtcbiAgICAgICAgICAgICAgICBpZiAoY2hhbm5lbFhtbC5sZW5ndGgpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0bXAgPSBjaGFubmVsWG1sLmdldCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0bXAgPSAkKGNvbnRlbnRzW2ldKS5maW5kKCc+c2N0cGNvbm5lY3Rpb24nKS5nZXQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2VsZi5jaGFubmVsc1tpbmRleF1baV0gPSB0bXBbMF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgY2hhbm5lbEJ1bmRsZXMgPSAkKHJlc3VsdCkuZmluZCgnPmNvbmZlcmVuY2U+Y2hhbm5lbC1idW5kbGUnKTtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBjaGFubmVsQnVuZGxlcy5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgZW5kcG9pbnRJZCA9ICQoY2hhbm5lbEJ1bmRsZXNbaV0pLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAgICAgc2VsZi5idW5kbGVkVHJhbnNwb3J0c1tlbmRwb2ludElkXSA9ICQoY2hhbm5lbEJ1bmRsZXNbaV0pLmZpbmQoJz50cmFuc3BvcnRbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6dHJhbnNwb3J0czppY2UtdWRwOjFcIl0nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlbGYuaW5pdGlhdGUocGVlciwgdHJ1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGVycm9yKTtcbiAgICAgICAgfVxuICAgICk7XG59O1xuXG4vLyB1cGRhdGUgdGhlIGNoYW5uZWwgZGVzY3JpcHRpb24gKHBheWxvYWQtdHlwZXMgKyBkdGxzIGZwKSBmb3IgYSBwYXJ0aWNpcGFudFxuQ29saWJyaUZvY3VzLnByb3RvdHlwZS51cGRhdGVDaGFubmVsID0gZnVuY3Rpb24gKHJlbW90ZVNEUCwgcGFydGljaXBhbnQpIHtcbiAgICBjb25zb2xlLmxvZygnY2hhbmdlIGFsbG9jYXRpb24gZm9yJywgdGhpcy5jb25maWQpO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgY2hhbmdlID0gJGlxKHt0bzogdGhpcy5icmlkZ2VqaWQsIHR5cGU6ICdzZXQnfSk7XG4gICAgY2hhbmdlLmMoJ2NvbmZlcmVuY2UnLCB7eG1sbnM6ICdodHRwOi8vaml0c2kub3JnL3Byb3RvY29sL2NvbGlicmknLCBpZDogdGhpcy5jb25maWR9KTtcbiAgICBmb3IgKGNoYW5uZWwgPSAwOyBjaGFubmVsIDwgdGhpcy5jaGFubmVsc1twYXJ0aWNpcGFudF0ubGVuZ3RoOyBjaGFubmVsKyspXG4gICAge1xuICAgICAgICBpZiAoIXJlbW90ZVNEUC5tZWRpYVtjaGFubmVsXSlcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgIHZhciBuYW1lID0gU0RQVXRpbC5wYXJzZV9taWQoU0RQVXRpbC5maW5kX2xpbmUocmVtb3RlU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1taWQ6JykpO1xuICAgICAgICBjaGFuZ2UuYygnY29udGVudCcsIHtuYW1lOiBuYW1lfSk7XG4gICAgICAgIGlmIChuYW1lICE9PSAnZGF0YScpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNoYW5nZS5jKCdjaGFubmVsJywge1xuICAgICAgICAgICAgICAgIGlkOiAkKHRoaXMuY2hhbm5lbHNbcGFydGljaXBhbnRdW2NoYW5uZWxdKS5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgICAgIGVuZHBvaW50OiAkKHRoaXMuY2hhbm5lbHNbcGFydGljaXBhbnRdW2NoYW5uZWxdKS5hdHRyKCdlbmRwb2ludCcpLFxuICAgICAgICAgICAgICAgIGV4cGlyZTogc2VsZi5jaGFubmVsRXhwaXJlXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gc2lnbmFsICh0aHJvdWdodCBDT0xJQlJJKSB0byB0aGUgYnJpZGdlIHRoZSBTU1JDIGdyb3VwcyBvZiB0aGlzXG4gICAgICAgICAgICAvLyBwYXJ0aWNpcGFudFxuICAgICAgICAgICAgdmFyIHNzcmNfZ3JvdXBfbGluZXMgPSBTRFBVdGlsLmZpbmRfbGluZXMocmVtb3RlU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1zc3JjLWdyb3VwOicpO1xuICAgICAgICAgICAgdmFyIGlkeCA9IDA7XG4gICAgICAgICAgICBzc3JjX2dyb3VwX2xpbmVzLmZvckVhY2goZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgICAgIGlkeCA9IGxpbmUuaW5kZXhPZignICcpO1xuICAgICAgICAgICAgICAgIHZhciBzZW1hbnRpY3MgPSBsaW5lLnN1YnN0cigwLCBpZHgpLnN1YnN0cigxMyk7XG4gICAgICAgICAgICAgICAgdmFyIHNzcmNzID0gbGluZS5zdWJzdHIoMTQgKyBzZW1hbnRpY3MubGVuZ3RoKS5zcGxpdCgnICcpO1xuICAgICAgICAgICAgICAgIGlmIChzc3Jjcy5sZW5ndGggIT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBjaGFuZ2UuYygnc3NyYy1ncm91cCcsIHsgc2VtYW50aWNzOiBzZW1hbnRpY3MsIHhtbG5zOiAndXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOnNzbWE6MCcgfSk7XG4gICAgICAgICAgICAgICAgICAgIHNzcmNzLmZvckVhY2goZnVuY3Rpb24oc3NyYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlLmMoJ3NvdXJjZScsIHsgc3NyYzogc3NyYyB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC51cCgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlLnVwKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhciBydHBtYXAgPSBTRFBVdGlsLmZpbmRfbGluZXMocmVtb3RlU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1ydHBtYXA6Jyk7XG4gICAgICAgICAgICBydHBtYXAuZm9yRWFjaChmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETzogdG9vIG11Y2ggY29weS1wYXN0ZVxuICAgICAgICAgICAgICAgIHZhciBydHBtYXAgPSBTRFBVdGlsLnBhcnNlX3J0cG1hcCh2YWwpO1xuICAgICAgICAgICAgICAgIGNoYW5nZS5jKCdwYXlsb2FkLXR5cGUnLCBydHBtYXApO1xuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgLy8gcHV0IGFueSAnYT1mbXRwOicgKyBtbGluZS5mbXRbal0gbGluZXMgaW50byA8cGFyYW0gbmFtZT1mb28gdmFsdWU9YmFyLz5cbiAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZShyZW1vdGVTRFAubWVkaWFbY2hhbm5lbF0sICdhPWZtdHA6JyArIHJ0cG1hcC5pZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdG1wID0gU0RQVXRpbC5wYXJzZV9mbXRwKFNEUFV0aWwuZmluZF9saW5lKHJlbW90ZVNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9Zm10cDonICsgcnRwbWFwLmlkKSk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgdG1wLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2UuYygncGFyYW1ldGVyJywgdG1wW2tdKS51cCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgY2hhbmdlLnVwKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBzY3RwbWFwID0gU0RQVXRpbC5maW5kX2xpbmUocmVtb3RlU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1zY3RwbWFwOicpO1xuICAgICAgICAgICAgY2hhbmdlLmMoJ3NjdHBjb25uZWN0aW9uJywge1xuICAgICAgICAgICAgICAgIGlkOiAkKHRoaXMuY2hhbm5lbHNbcGFydGljaXBhbnRdW2NoYW5uZWxdKS5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgICAgIGVuZHBvaW50OiAkKHRoaXMuY2hhbm5lbHNbcGFydGljaXBhbnRdW2NoYW5uZWxdKS5hdHRyKCdlbmRwb2ludCcpLFxuICAgICAgICAgICAgICAgIGV4cGlyZTogc2VsZi5jaGFubmVsRXhwaXJlLFxuICAgICAgICAgICAgICAgIHBvcnQ6IFNEUFV0aWwucGFyc2Vfc2N0cG1hcChzY3RwbWFwKVswXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gbm93IGFkZCB0cmFuc3BvcnRcbiAgICAgICAgcmVtb3RlU0RQLlRyYW5zcG9ydFRvSmluZ2xlKGNoYW5uZWwsIGNoYW5nZSk7XG5cbiAgICAgICAgY2hhbmdlLnVwKCk7IC8vIGVuZCBvZiBjaGFubmVsL3NjdHBjb25uZWN0aW9uXG4gICAgICAgIGNoYW5nZS51cCgpOyAvLyBlbmQgb2YgY29udGVudFxuICAgIH1cbiAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKGNoYW5nZSxcbiAgICAgICAgZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2dvdCByZXN1bHQnKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2dvdCBlcnJvcicpO1xuICAgICAgICB9XG4gICAgKTtcbn07XG5cbi8vIHRlbGwgZXZlcnlvbmUgYWJvdXQgYSBuZXcgcGFydGljaXBhbnRzIGE9c3NyYyBsaW5lcyAoaXNhZGQgaXMgdHJ1ZSlcbi8vIG9yIGEgbGVhdmluZyBwYXJ0aWNpcGFudHMgYT1zc3JjIGxpbmVzXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLnNlbmRTU1JDVXBkYXRlID0gZnVuY3Rpb24gKHNkcE1lZGlhU3NyY3MsIGZyb21KaWQsIGlzYWRkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMucGVlcnMuZm9yRWFjaChmdW5jdGlvbiAocGVlcmppZCkge1xuICAgICAgICBpZiAocGVlcmppZCA9PSBmcm9tSmlkKSByZXR1cm47XG4gICAgICAgIGNvbnNvbGUubG9nKCd0ZWxsJywgcGVlcmppZCwgJ2Fib3V0ICcgKyAoaXNhZGQgPyAnbmV3JyA6ICdyZW1vdmVkJykgKyAnIHNzcmNzIGZyb20nLCBmcm9tSmlkKTtcbiAgICAgICAgaWYgKCFzZWxmLnJlbW90ZXNzcmNbcGVlcmppZF0pIHtcbiAgICAgICAgICAgIC8vIEZJWE1FOiB0aGlzIHNob3VsZCBvbmx5IHNlbmQgdG8gcGFydGljaXBhbnRzIHRoYXQgYXJlIHN0YWJsZSwgaS5lLiB3aG8gaGF2ZSBzZW50IGEgc2Vzc2lvbi1hY2NlcHRcbiAgICAgICAgICAgIC8vIHBvc3NpYmx5LCB0aGlzLnJlbW90ZVNTUkNbc2Vzc2lvbi5wZWVyamlkXSBkb2VzIG5vdCBleGlzdCB5ZXRcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignZG8gd2UgcmVhbGx5IHdhbnQgdG8gYm90aGVyJywgcGVlcmppZCwgJ3dpdGggdXBkYXRlcyB5ZXQ/Jyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBlZXJzZXNzID0gc2VsZi5jb25uZWN0aW9uLmppbmdsZS5qaWQyc2Vzc2lvbltwZWVyamlkXTtcbiAgICAgICAgaWYoIXBlZXJzZXNzKXtcbiAgICAgICAgICAgIGNvbnNvbGUud2Fybignbm8gc2Vzc2lvbiB3aXRoIHBlZXI6ICcrcGVlcmppZCsnIHlldC4uLicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgc2VsZi5zZW5kU1NSQ1VwZGF0ZUlxKHNkcE1lZGlhU3NyY3MsIHBlZXJzZXNzLnNpZCwgcGVlcnNlc3MuaW5pdGlhdG9yLCBwZWVyamlkLCBpc2FkZCk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIE92ZXJyaWRlcyBTZXNzaW9uQmFzZS5hZGRTb3VyY2UuXG4gKlxuICogQHBhcmFtIGVsZW0gcHJvcHJpZXRhcnkgJ2FkZCBzb3VyY2UnIEppbmdsZSByZXF1ZXN0KFhNTCBub2RlKS5cbiAqIEBwYXJhbSBmcm9tSmlkIEpJRCBvZiB0aGUgcGFydGljaXBhbnQgdG8gd2hvbSBuZXcgc3NyY3MgYmVsb25nLlxuICovXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLmFkZFNvdXJjZSA9IGZ1bmN0aW9uIChlbGVtLCBmcm9tSmlkKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gRklYTUU6IGRpcnR5IHdhaXRpbmdcbiAgICBpZiAoIXRoaXMucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbilcbiAgICB7XG4gICAgICAgIGNvbnNvbGUud2FybihcImFkZFNvdXJjZSAtIGxvY2FsRGVzY3JpcHRpb24gbm90IHJlYWR5IHlldFwiKVxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBzZWxmLmFkZFNvdXJjZShlbGVtLCBmcm9tSmlkKTsgfSwgMjAwKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uYWRkU291cmNlKGVsZW0pO1xuXG4gICAgdmFyIHBlZXJTc3JjID0gdGhpcy5yZW1vdGVzc3JjW2Zyb21KaWRdO1xuICAgIC8vY29uc29sZS5sb2coXCJPbiBBRERcIiwgc2VsZi5hZGRzc3JjLCBwZWVyU3NyYyk7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5hZGRzc3JjLmZvckVhY2goZnVuY3Rpb24odmFsLCBpZHgpe1xuICAgICAgICBpZighcGVlclNzcmNbaWR4XSl7XG4gICAgICAgICAgICAvLyBhZGQgc3NyY1xuICAgICAgICAgICAgcGVlclNzcmNbaWR4XSA9IHZhbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmKHBlZXJTc3JjW2lkeF0uaW5kZXhPZih2YWwpID09IC0xKXtcbiAgICAgICAgICAgICAgICBwZWVyU3NyY1tpZHhdID0gcGVlclNzcmNbaWR4XSt2YWw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBvbGRSZW1vdGVTZHAgPSBuZXcgU0RQKHRoaXMucGVlcmNvbm5lY3Rpb24ucmVtb3RlRGVzY3JpcHRpb24uc2RwKTtcbiAgICB0aGlzLm1vZGlmeVNvdXJjZXMoZnVuY3Rpb24oKXtcbiAgICAgICAgLy8gTm90aWZ5IG90aGVyIHBhcnRpY2lwYW50cyBhYm91dCBhZGRlZCBzc3JjXG4gICAgICAgIHZhciByZW1vdGVTRFAgPSBuZXcgU0RQKHNlbGYucGVlcmNvbm5lY3Rpb24ucmVtb3RlRGVzY3JpcHRpb24uc2RwKTtcbiAgICAgICAgdmFyIG5ld1NTUkNzID0gb2xkUmVtb3RlU2RwLmdldE5ld01lZGlhKHJlbW90ZVNEUCk7XG4gICAgICAgIHNlbGYuc2VuZFNTUkNVcGRhdGUobmV3U1NSQ3MsIGZyb21KaWQsIHRydWUpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBPdmVycmlkZXMgU2Vzc2lvbkJhc2UucmVtb3ZlU291cmNlLlxuICpcbiAqIEBwYXJhbSBlbGVtIHByb3ByaWV0YXJ5ICdyZW1vdmUgc291cmNlJyBKaW5nbGUgcmVxdWVzdChYTUwgbm9kZSkuXG4gKiBAcGFyYW0gZnJvbUppZCBKSUQgb2YgdGhlIHBhcnRpY2lwYW50IHRvIHdob20gcmVtb3ZlZCBzc3JjcyBiZWxvbmcuXG4gKi9cbkNvbGlicmlGb2N1cy5wcm90b3R5cGUucmVtb3ZlU291cmNlID0gZnVuY3Rpb24gKGVsZW0sIGZyb21KaWQpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBGSVhNRTogZGlydHkgd2FpdGluZ1xuICAgIGlmICghc2VsZi5wZWVyY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uKVxuICAgIHtcbiAgICAgICAgY29uc29sZS53YXJuKFwicmVtb3ZlU291cmNlIC0gbG9jYWxEZXNjcmlwdGlvbiBub3QgcmVhZHkgeWV0XCIpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBzZWxmLnJlbW92ZVNvdXJjZShlbGVtLCBmcm9tSmlkKTsgfSwgMjAwKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24ucmVtb3ZlU291cmNlKGVsZW0pO1xuXG4gICAgdmFyIHBlZXJTc3JjID0gdGhpcy5yZW1vdGVzc3JjW2Zyb21KaWRdO1xuICAgIC8vY29uc29sZS5sb2coXCJPbiBSRU1PVkVcIiwgc2VsZi5yZW1vdmVzc3JjLCBwZWVyU3NyYyk7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5yZW1vdmVzc3JjLmZvckVhY2goZnVuY3Rpb24odmFsLCBpZHgpe1xuICAgICAgICBpZihwZWVyU3NyY1tpZHhdKXtcbiAgICAgICAgICAgIC8vIFJlbW92ZSBzc3JjXG4gICAgICAgICAgICBwZWVyU3NyY1tpZHhdID0gcGVlclNzcmNbaWR4XS5yZXBsYWNlKHZhbCwgJycpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgb2xkU0RQID0gbmV3IFNEUChzZWxmLnBlZXJjb25uZWN0aW9uLnJlbW90ZURlc2NyaXB0aW9uLnNkcCk7XG4gICAgdGhpcy5tb2RpZnlTb3VyY2VzKGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vIE5vdGlmeSBvdGhlciBwYXJ0aWNpcGFudHMgYWJvdXQgcmVtb3ZlZCBzc3JjXG4gICAgICAgIHZhciByZW1vdGVTRFAgPSBuZXcgU0RQKHNlbGYucGVlcmNvbm5lY3Rpb24ucmVtb3RlRGVzY3JpcHRpb24uc2RwKTtcbiAgICAgICAgdmFyIHJlbW92ZWRTU1JDcyA9IHJlbW90ZVNEUC5nZXROZXdNZWRpYShvbGRTRFApO1xuICAgICAgICBzZWxmLnNlbmRTU1JDVXBkYXRlKHJlbW92ZWRTU1JDcywgZnJvbUppZCwgZmFsc2UpO1xuICAgIH0pO1xufTtcblxuQ29saWJyaUZvY3VzLnByb3RvdHlwZS5zZXRSZW1vdGVEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uIChzZXNzaW9uLCBlbGVtLCBkZXNjdHlwZSkge1xuICAgIHZhciBwYXJ0aWNpcGFudCA9IHRoaXMucGVlcnMuaW5kZXhPZihzZXNzaW9uLnBlZXJqaWQpO1xuICAgIGNvbnNvbGUubG9nKCdDb2xpYnJpLnNldFJlbW90ZURlc2NyaXB0aW9uIGZyb20nLCBzZXNzaW9uLnBlZXJqaWQsIHBhcnRpY2lwYW50KTtcbiAgICB2YXIgcmVtb3RlU0RQID0gbmV3IFNEUCgnJyk7XG4gICAgdmFyIGNoYW5uZWw7XG4gICAgcmVtb3RlU0RQLmZyb21KaW5nbGUoZWxlbSk7XG5cbiAgICAvLyBBQ1QgMTogY2hhbmdlIGFsbG9jYXRpb24gb24gYnJpZGdlXG4gICAgdGhpcy51cGRhdGVDaGFubmVsKHJlbW90ZVNEUCwgcGFydGljaXBhbnQpO1xuXG4gICAgLy8gQUNUIDI6IHRlbGwgYW55b25lIGVsc2UgYWJvdXQgdGhlIG5ldyBTU1JDc1xuICAgIHRoaXMuc2VuZFNTUkNVcGRhdGUocmVtb3RlU0RQLmdldE1lZGlhU3NyY01hcCgpLCBzZXNzaW9uLnBlZXJqaWQsIHRydWUpO1xuXG4gICAgLy8gQUNUIDM6IG5vdGUgdGhlIFNTUkNzXG4gICAgdGhpcy5yZW1vdGVzc3JjW3Nlc3Npb24ucGVlcmppZF0gPSBbXTtcbiAgICBmb3IgKGNoYW5uZWwgPSAwOyBjaGFubmVsIDwgdGhpcy5jaGFubmVsc1twYXJ0aWNpcGFudF0ubGVuZ3RoOyBjaGFubmVsKyspIHtcbiAgICAgICAgLy9pZiAoY2hhbm5lbCA9PSAwKSBjb250aW51ZTsgRklYTUU6IGRvZXMgbm90IHdvcmsgYXMgaW50ZW5kZWRcbiAgICAgICAgaWYgKCFyZW1vdGVTRFAubWVkaWFbY2hhbm5lbF0pXG4gICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICB2YXIgbGluZXMgPSBTRFBVdGlsLmZpbmRfbGluZXMocmVtb3RlU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1zc3JjLWdyb3VwOicpO1xuICAgICAgICBpZiAobGluZXMubGVuZ3RoICE9IDApXG4gICAgICAgICAgICAvLyBwcmVwZW5kIHNzcmMtZ3JvdXBzXG4gICAgICAgICAgICB0aGlzLnJlbW90ZXNzcmNbc2Vzc2lvbi5wZWVyamlkXVtjaGFubmVsXSA9IGxpbmVzLmpvaW4oJ1xcclxcbicpICsgJ1xcclxcbic7XG5cbiAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lcyhyZW1vdGVTRFAubWVkaWFbY2hhbm5lbF0sICdhPXNzcmM6JykubGVuZ3RoKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoIXRoaXMucmVtb3Rlc3NyY1tzZXNzaW9uLnBlZXJqaWRdW2NoYW5uZWxdKVxuICAgICAgICAgICAgICAgIHRoaXMucmVtb3Rlc3NyY1tzZXNzaW9uLnBlZXJqaWRdW2NoYW5uZWxdID0gJyc7XG5cbiAgICAgICAgICAgIHRoaXMucmVtb3Rlc3NyY1tzZXNzaW9uLnBlZXJqaWRdW2NoYW5uZWxdICs9XG4gICAgICAgICAgICAgICAgU0RQVXRpbC5maW5kX2xpbmVzKHJlbW90ZVNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9c3NyYzonKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmpvaW4oJ1xcclxcbicpICsgJ1xcclxcbic7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBQ1QgNDogYWRkIG5ldyBhPXNzcmMgYW5kIHM9c3NyYy1ncm91cCBsaW5lcyB0byBsb2NhbCByZW1vdGVkZXNjcmlwdGlvblxuICAgIGZvciAoY2hhbm5lbCA9IDA7IGNoYW5uZWwgPCB0aGlzLmNoYW5uZWxzW3BhcnRpY2lwYW50XS5sZW5ndGg7IGNoYW5uZWwrKykge1xuICAgICAgICAvL2lmIChjaGFubmVsID09IDApIGNvbnRpbnVlOyBGSVhNRTogZG9lcyBub3Qgd29yayBhcyBpbnRlbmRlZFxuICAgICAgICBpZiAoIXJlbW90ZVNEUC5tZWRpYVtjaGFubmVsXSlcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgIHZhciBsaW5lcyA9IFNEUFV0aWwuZmluZF9saW5lcyhyZW1vdGVTRFAubWVkaWFbY2hhbm5lbF0sICdhPXNzcmMtZ3JvdXA6Jyk7XG4gICAgICAgIGlmIChsaW5lcy5sZW5ndGggIT0gMClcbiAgICAgICAgICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uZW5xdWV1ZUFkZFNzcmMoXG4gICAgICAgICAgICAgICAgY2hhbm5lbCwgU0RQVXRpbC5maW5kX2xpbmVzKHJlbW90ZVNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9c3NyYy1ncm91cDonKS5qb2luKCdcXHJcXG4nKSArICdcXHJcXG4nKTtcblxuICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmVzKHJlbW90ZVNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9c3NyYzonKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uZW5xdWV1ZUFkZFNzcmMoXG4gICAgICAgICAgICAgICAgY2hhbm5lbCxcbiAgICAgICAgICAgICAgICBTRFBVdGlsLmZpbmRfbGluZXMocmVtb3RlU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1zc3JjOicpLmpvaW4oJ1xcclxcbicpICsgJ1xcclxcbidcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5tb2RpZnlTb3VyY2VzKCk7XG59O1xuXG4vLyByZWxheSBpY2UgY2FuZGlkYXRlcyB0byBicmlkZ2UgdXNpbmcgdHJpY2tsZVxuQ29saWJyaUZvY3VzLnByb3RvdHlwZS5hZGRJY2VDYW5kaWRhdGUgPSBmdW5jdGlvbiAoc2Vzc2lvbiwgZWxlbSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcGFydGljaXBhbnQgPSB0aGlzLnBlZXJzLmluZGV4T2Yoc2Vzc2lvbi5wZWVyamlkKTtcbiAgICAvL2NvbnNvbGUubG9nKCdjaGFuZ2UgdHJhbnNwb3J0IGFsbG9jYXRpb24gZm9yJywgdGhpcy5jb25maWQsIHNlc3Npb24ucGVlcmppZCwgcGFydGljaXBhbnQpO1xuICAgIHZhciBjaGFuZ2UgPSAkaXEoe3RvOiB0aGlzLmJyaWRnZWppZCwgdHlwZTogJ3NldCd9KTtcbiAgICBjaGFuZ2UuYygnY29uZmVyZW5jZScsIHt4bWxuczogJ2h0dHA6Ly9qaXRzaS5vcmcvcHJvdG9jb2wvY29saWJyaScsIGlkOiB0aGlzLmNvbmZpZH0pO1xuICAgICQoZWxlbSkuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBuYW1lID0gJCh0aGlzKS5hdHRyKCduYW1lJyk7XG5cbiAgICAgICAgLy8gSWYgd2UgYXJlIHVzaW5nIGJ1bmRsZSwgYXVkaW8vdmlkZW8vZGF0YSBjaGFubmVsIHdpbGwgaGF2ZSB0aGUgc2FtZSBjYW5kaWRhdGVzLCBzbyBvbmx5IHNlbmQgdGhlbSBmb3JcbiAgICAgICAgLy8gdGhlIGF1ZGlvIGNoYW5uZWwuXG4gICAgICAgIGlmIChjb25maWcudXNlQnVuZGxlICYmIG5hbWUgIT09ICdhdWRpbycpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjaGFubmVsID0gbmFtZSA9PSAnYXVkaW8nID8gMCA6IDE7IC8vIEZJWE1FOiBzZWFyY2ggbWxpbmVpbmRleCBpbiBsb2NhbGRlc2NcbiAgICAgICAgaWYgKG5hbWUgIT0gJ2F1ZGlvJyAmJiBuYW1lICE9ICd2aWRlbycpXG4gICAgICAgICAgICBjaGFubmVsID0gMjsgLy8gbmFtZSA9PSAnZGF0YSdcblxuICAgICAgICBjaGFuZ2UuYygnY29udGVudCcsIHtuYW1lOiBuYW1lfSk7XG4gICAgICAgIGlmIChuYW1lICE9PSAnZGF0YScpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNoYW5nZS5jKCdjaGFubmVsJywge1xuICAgICAgICAgICAgICAgIGlkOiAkKHNlbGYuY2hhbm5lbHNbcGFydGljaXBhbnRdW2NoYW5uZWxdKS5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgICAgIGVuZHBvaW50OiAkKHNlbGYuY2hhbm5lbHNbcGFydGljaXBhbnRdW2NoYW5uZWxdKS5hdHRyKCdlbmRwb2ludCcpLFxuICAgICAgICAgICAgICAgIGV4cGlyZTogc2VsZi5jaGFubmVsRXhwaXJlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNoYW5nZS5jKCdzY3RwY29ubmVjdGlvbicsIHtcbiAgICAgICAgICAgICAgICBpZDogJChzZWxmLmNoYW5uZWxzW3BhcnRpY2lwYW50XVtjaGFubmVsXSkuYXR0cignaWQnKSxcbiAgICAgICAgICAgICAgICBlbmRwb2ludDogJChzZWxmLmNoYW5uZWxzW3BhcnRpY2lwYW50XVtjaGFubmVsXSkuYXR0cignZW5kcG9pbnQnKSxcbiAgICAgICAgICAgICAgICBleHBpcmU6IHNlbGYuY2hhbm5lbEV4cGlyZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgJCh0aGlzKS5maW5kKCc+dHJhbnNwb3J0JykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjaGFuZ2UuYygndHJhbnNwb3J0Jywge1xuICAgICAgICAgICAgICAgIHVmcmFnOiAkKHRoaXMpLmF0dHIoJ3VmcmFnJyksXG4gICAgICAgICAgICAgICAgcHdkOiAkKHRoaXMpLmF0dHIoJ3B3ZCcpLFxuICAgICAgICAgICAgICAgIHhtbG5zOiAkKHRoaXMpLmF0dHIoJ3htbG5zJylcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKGNvbmZpZy51c2VSdGNwTXV4XG4gICAgICAgICAgICAgICAgICAmJiAnY2hhbm5lbCcgPT09IGNoYW5nZS5ub2RlLnBhcmVudE5vZGUubm9kZU5hbWUpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2UuYygncnRjcC1tdXgnKS51cCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkKHRoaXMpLmZpbmQoJz5jYW5kaWRhdGUnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvKiBub3QgeWV0XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZ2V0QXR0cmlidXRlKCdwcm90b2NvbCcpID09ICd0Y3AnICYmIHRoaXMuZ2V0QXR0cmlidXRlKCdwb3J0JykgPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjaHJvbWUgZ2VuZXJhdGVzIFRDUCBjYW5kaWRhdGVzIHdpdGggcG9ydCAwXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB2YXIgbGluZSA9IFNEUFV0aWwuY2FuZGlkYXRlRnJvbUppbmdsZSh0aGlzKTtcbiAgICAgICAgICAgICAgICBjaGFuZ2UuYygnY2FuZGlkYXRlJywgU0RQVXRpbC5jYW5kaWRhdGVUb0ppbmdsZShsaW5lKSkudXAoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY2hhbmdlLnVwKCk7IC8vIGVuZCBvZiB0cmFuc3BvcnRcbiAgICAgICAgfSk7XG4gICAgICAgIGNoYW5nZS51cCgpOyAvLyBlbmQgb2YgY2hhbm5lbC9zY3RwY29ubmVjdGlvblxuICAgICAgICBjaGFuZ2UudXAoKTsgLy8gZW5kIG9mIGNvbnRlbnRcbiAgICB9KTtcbiAgICAvLyBGSVhNRTogbmVlZCB0byBjaGVjayBpZiB0aGVyZSBpcyBhdCBsZWFzdCBvbmUgY2FuZGlkYXRlIHdoZW4gZmlsdGVyaW5nIFRDUCBvbmVzXG4gICAgdGhpcy5jb25uZWN0aW9uLnNlbmRJUShjaGFuZ2UsXG4gICAgICAgIGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnb3QgcmVzdWx0Jyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2dvdCBlcnJvcicsIGVycik7XG4gICAgICAgIH1cbiAgICApO1xufTtcblxuLy8gc2VuZCBvdXIgb3duIGNhbmRpZGF0ZSB0byB0aGUgYnJpZGdlXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLnNlbmRJY2VDYW5kaWRhdGUgPSBmdW5jdGlvbiAoY2FuZGlkYXRlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vY29uc29sZS5sb2coJ2NhbmRpZGF0ZScsIGNhbmRpZGF0ZSk7XG4gICAgaWYgKCFjYW5kaWRhdGUpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2VuZCBvZiBjYW5kaWRhdGVzJyk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHRoaXMuZHJpcF9jb250YWluZXIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIC8vIHN0YXJ0IDIwbXMgY2FsbG91dFxuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChcbiAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5kcmlwX2NvbnRhaW5lci5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgICAgICAgICBzZWxmLnNlbmRJY2VDYW5kaWRhdGVzKHNlbGYuZHJpcF9jb250YWluZXIpO1xuICAgICAgICAgICAgICAgIHNlbGYuZHJpcF9jb250YWluZXIgPSBbXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAyMCk7XG4gICAgfVxuICAgIHRoaXMuZHJpcF9jb250YWluZXIucHVzaChjYW5kaWRhdGUpO1xufTtcblxuLy8gc29ydCBhbmQgc2VuZCBtdWx0aXBsZSBjYW5kaWRhdGVzXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLnNlbmRJY2VDYW5kaWRhdGVzID0gZnVuY3Rpb24gKGNhbmRpZGF0ZXMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG15Y2FuZHMgPSAkaXEoe3RvOiB0aGlzLmJyaWRnZWppZCwgdHlwZTogJ3NldCd9KTtcbiAgICBteWNhbmRzLmMoJ2NvbmZlcmVuY2UnLCB7eG1sbnM6ICdodHRwOi8vaml0c2kub3JnL3Byb3RvY29sL2NvbGlicmknLCBpZDogdGhpcy5jb25maWR9KTtcbiAgICAvLyBGSVhNRTogbXVsdGktY2FuZGlkYXRlIGxvZ2ljIGlzIHRha2VuIGZyb20gc3Ryb3BoZS5qaW5nbGUsIHNob3VsZCBiZSByZWZhY3RvcmVkIHRoZXJlXG4gICAgdmFyIGxvY2FsU0RQID0gbmV3IFNEUCh0aGlzLnBlZXJjb25uZWN0aW9uLmxvY2FsRGVzY3JpcHRpb24uc2RwKTtcbiAgICBmb3IgKHZhciBtaWQgPSAwOyBtaWQgPCBsb2NhbFNEUC5tZWRpYS5sZW5ndGg7IG1pZCsrKVxuICAgIHtcbiAgICAgICAgdmFyIGNhbmRzID0gY2FuZGlkYXRlcy5maWx0ZXIoZnVuY3Rpb24gKGVsKSB7IHJldHVybiBlbC5zZHBNTGluZUluZGV4ID09IG1pZDsgfSk7XG4gICAgICAgIGlmIChjYW5kcy5sZW5ndGggPiAwKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgbmFtZSA9IGNhbmRzWzBdLnNkcE1pZDtcbiAgICAgICAgICAgIG15Y2FuZHMuYygnY29udGVudCcsIHtuYW1lOiBuYW1lIH0pO1xuICAgICAgICAgICAgaWYgKG5hbWUgIT09ICdkYXRhJylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBteWNhbmRzLmMoJ2NoYW5uZWwnLCB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiAkKHRoaXMubXljaGFubmVsW2NhbmRzWzBdLnNkcE1MaW5lSW5kZXhdKS5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgICAgICAgICBlbmRwb2ludDogJCh0aGlzLm15Y2hhbm5lbFtjYW5kc1swXS5zZHBNTGluZUluZGV4XSkuYXR0cignZW5kcG9pbnQnKSxcbiAgICAgICAgICAgICAgICAgICAgZXhwaXJlOiBzZWxmLmNoYW5uZWxFeHBpcmVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBteWNhbmRzLmMoJ3NjdHBjb25uZWN0aW9uJywge1xuICAgICAgICAgICAgICAgICAgICBpZDogJCh0aGlzLm15Y2hhbm5lbFtjYW5kc1swXS5zZHBNTGluZUluZGV4XSkuYXR0cignaWQnKSxcbiAgICAgICAgICAgICAgICAgICAgZW5kcG9pbnQ6ICQodGhpcy5teWNoYW5uZWxbY2FuZHNbMF0uc2RwTUxpbmVJbmRleF0pLmF0dHIoJ2VuZHBvaW50JyksXG4gICAgICAgICAgICAgICAgICAgIHBvcnQ6ICQodGhpcy5teWNoYW5uZWxbY2FuZHNbMF0uc2RwTUxpbmVJbmRleF0pLmF0dHIoJ3BvcnQnKSxcbiAgICAgICAgICAgICAgICAgICAgZXhwaXJlOiBzZWxmLmNoYW5uZWxFeHBpcmVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG15Y2FuZHMuYygndHJhbnNwb3J0Jywge3htbG5zOiAndXJuOnhtcHA6amluZ2xlOnRyYW5zcG9ydHM6aWNlLXVkcDoxJ30pO1xuICAgICAgICAgICAgaWYgKGNvbmZpZy51c2VSdGNwTXV4ICYmIG5hbWUgIT09ICdkYXRhJykge1xuICAgICAgICAgICAgICAgIG15Y2FuZHMuYygncnRjcC1tdXgnKS51cCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjYW5kcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIG15Y2FuZHMuYygnY2FuZGlkYXRlJywgU0RQVXRpbC5jYW5kaWRhdGVUb0ppbmdsZShjYW5kc1tpXS5jYW5kaWRhdGUpKS51cCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbXljYW5kcy51cCgpOyAvLyB0cmFuc3BvcnRcbiAgICAgICAgICAgIG15Y2FuZHMudXAoKTsgLy8gY2hhbm5lbCAvIHNjdHBjb25uZWN0aW9uXG4gICAgICAgICAgICBteWNhbmRzLnVwKCk7IC8vIGNvbnRlbnRcbiAgICAgICAgfVxuICAgIH1cbiAgICBjb25zb2xlLmxvZygnc2VuZCBjYW5kcycsIGNhbmRpZGF0ZXMpO1xuICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEobXljYW5kcyxcbiAgICAgICAgZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2dvdCByZXN1bHQnKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignZ290IGVycm9yJywgZXJyKTtcbiAgICAgICAgfVxuICAgICk7XG59O1xuXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLnRlcm1pbmF0ZSA9IGZ1bmN0aW9uIChzZXNzaW9uLCByZWFzb24pIHtcbiAgICBjb25zb2xlLmxvZygncmVtb3RlIHNlc3Npb24gdGVybWluYXRlZCBmcm9tJywgc2Vzc2lvbi5wZWVyamlkKTtcbiAgICB2YXIgcGFydGljaXBhbnQgPSB0aGlzLnBlZXJzLmluZGV4T2Yoc2Vzc2lvbi5wZWVyamlkKTtcbiAgICBpZiAoIXRoaXMucmVtb3Rlc3NyY1tzZXNzaW9uLnBlZXJqaWRdIHx8IHBhcnRpY2lwYW50ID09IC0xKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHNzcmNzID0gdGhpcy5yZW1vdGVzc3JjW3Nlc3Npb24ucGVlcmppZF07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzc3Jjcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLnBlZXJjb25uZWN0aW9uLmVucXVldWVSZW1vdmVTc3JjKGksIHNzcmNzW2ldKTtcbiAgICB9XG4gICAgLy8gcmVtb3ZlIGZyb20gdGhpcy5wZWVyc1xuICAgIHRoaXMucGVlcnMuc3BsaWNlKHBhcnRpY2lwYW50LCAxKTtcbiAgICAvLyBleHBpcmUgY2hhbm5lbCBvbiBicmlkZ2VcbiAgICB2YXIgY2hhbmdlID0gJGlxKHt0bzogdGhpcy5icmlkZ2VqaWQsIHR5cGU6ICdzZXQnfSk7XG4gICAgY2hhbmdlLmMoJ2NvbmZlcmVuY2UnLCB7eG1sbnM6ICdodHRwOi8vaml0c2kub3JnL3Byb3RvY29sL2NvbGlicmknLCBpZDogdGhpcy5jb25maWR9KTtcbiAgICBmb3IgKHZhciBjaGFubmVsID0gMDsgY2hhbm5lbCA8IHRoaXMuY2hhbm5lbHNbcGFydGljaXBhbnRdLmxlbmd0aDsgY2hhbm5lbCsrKSB7XG4gICAgICAgIHZhciBuYW1lID0gY2hhbm5lbCA9PT0gMCA/ICdhdWRpbycgOiAndmlkZW8nO1xuICAgICAgICBpZiAoY2hhbm5lbCA9PSAyKVxuICAgICAgICAgICAgbmFtZSA9ICdkYXRhJztcbiAgICAgICAgY2hhbmdlLmMoJ2NvbnRlbnQnLCB7bmFtZTogbmFtZX0pO1xuICAgICAgICBpZiAobmFtZSAhPT0gJ2RhdGEnKVxuICAgICAgICB7XG4gICAgICAgICAgICBjaGFuZ2UuYygnY2hhbm5lbCcsIHtcbiAgICAgICAgICAgICAgICBpZDogJCh0aGlzLmNoYW5uZWxzW3BhcnRpY2lwYW50XVtjaGFubmVsXSkuYXR0cignaWQnKSxcbiAgICAgICAgICAgICAgICBlbmRwb2ludDogJCh0aGlzLmNoYW5uZWxzW3BhcnRpY2lwYW50XVtjaGFubmVsXSkuYXR0cignZW5kcG9pbnQnKSxcbiAgICAgICAgICAgICAgICBleHBpcmU6ICcwJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZVxuICAgICAgICB7XG4gICAgICAgICAgICBjaGFuZ2UuYygnc2N0cGNvbm5lY3Rpb24nLCB7XG4gICAgICAgICAgICAgICAgaWQ6ICQodGhpcy5jaGFubmVsc1twYXJ0aWNpcGFudF1bY2hhbm5lbF0pLmF0dHIoJ2lkJyksXG4gICAgICAgICAgICAgICAgZW5kcG9pbnQ6ICQodGhpcy5jaGFubmVsc1twYXJ0aWNpcGFudF1bY2hhbm5lbF0pLmF0dHIoJ2VuZHBvaW50JyksXG4gICAgICAgICAgICAgICAgZXhwaXJlOiAnMCdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGNoYW5nZS51cCgpOyAvLyBlbmQgb2YgY2hhbm5lbC9zY3RwY29ubmVjdGlvblxuICAgICAgICBjaGFuZ2UudXAoKTsgLy8gZW5kIG9mIGNvbnRlbnRcbiAgICB9XG4gICAgdGhpcy5jb25uZWN0aW9uLnNlbmRJUShjaGFuZ2UsXG4gICAgICAgIGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnb3QgcmVzdWx0Jyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2dvdCBlcnJvcicsIGVycik7XG4gICAgICAgIH1cbiAgICApO1xuICAgIC8vIGFuZCByZW1vdmUgZnJvbSBjaGFubmVsc1xuICAgIHRoaXMuY2hhbm5lbHMuc3BsaWNlKHBhcnRpY2lwYW50LCAxKTtcblxuICAgIC8vIHRlbGwgZXZlcnlvbmUgYWJvdXQgdGhlIHNzcmNzIHRvIGJlIHJlbW92ZWRcbiAgICB2YXIgc2RwID0gbmV3IFNEUCgnJyk7XG4gICAgdmFyIGxvY2FsU0RQID0gbmV3IFNEUCh0aGlzLnBlZXJjb25uZWN0aW9uLmxvY2FsRGVzY3JpcHRpb24uc2RwKTtcbiAgICB2YXIgY29udGVudHMgPSBTRFBVdGlsLmZpbmRfbGluZXMobG9jYWxTRFAucmF3LCAnYT1taWQ6JykubWFwKFNEUFV0aWwucGFyc2VfbWlkKTtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHNzcmNzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHNkcC5tZWRpYVtqXSA9ICdhPW1pZDonICsgY29udGVudHNbal0gKyAnXFxyXFxuJztcbiAgICAgICAgc2RwLm1lZGlhW2pdICs9IHNzcmNzW2pdO1xuICAgICAgICB0aGlzLnBlZXJjb25uZWN0aW9uLmVucXVldWVSZW1vdmVTc3JjKGosIHNzcmNzW2pdKTtcbiAgICB9XG4gICAgdGhpcy5zZW5kU1NSQ1VwZGF0ZShzZHAuZ2V0TWVkaWFTc3JjTWFwKCksIHNlc3Npb24ucGVlcmppZCwgZmFsc2UpO1xuXG4gICAgZGVsZXRlIHRoaXMucmVtb3Rlc3NyY1tzZXNzaW9uLnBlZXJqaWRdO1xuICAgIHRoaXMubW9kaWZ5U291cmNlcygpO1xufTtcblxuQ29saWJyaUZvY3VzLnByb3RvdHlwZS5zZW5kVGVybWluYXRlID0gZnVuY3Rpb24gKHNlc3Npb24sIHJlYXNvbiwgdGV4dCkge1xuICAgIHZhciB0ZXJtID0gJGlxKHt0bzogc2Vzc2lvbi5wZWVyamlkLCB0eXBlOiAnc2V0J30pXG4gICAgICAgIC5jKCdqaW5nbGUnLFxuICAgICAgICAgICAge3htbG5zOiAndXJuOnhtcHA6amluZ2xlOjEnLFxuICAgICAgICAgICAgYWN0aW9uOiAnc2Vzc2lvbi10ZXJtaW5hdGUnLFxuICAgICAgICAgICAgaW5pdGlhdG9yOiBzZXNzaW9uLm1lLFxuICAgICAgICAgICAgc2lkOiBzZXNzaW9uLnNpZH0pXG4gICAgICAgIC5jKCdyZWFzb24nKVxuICAgICAgICAuYyhyZWFzb24gfHwgJ3N1Y2Nlc3MnKTtcblxuICAgIGlmICh0ZXh0KSB7XG4gICAgICAgIHRlcm0udXAoKS5jKCd0ZXh0JykudCh0ZXh0KTtcbiAgICB9XG5cbiAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKHRlcm0sXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICghc2Vzc2lvbilcbiAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgIGlmIChzZXNzaW9uLnBlZXJjb25uZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5wZWVyY29ubmVjdGlvbi5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIHNlc3Npb24ucGVlcmNvbm5lY3Rpb24gPSBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzZXNzaW9uLnRlcm1pbmF0ZSgpO1xuICAgICAgICAgICAgdmFyIGFjayA9IHt9O1xuICAgICAgICAgICAgYWNrLnNvdXJjZSA9ICd0ZXJtaW5hdGUnO1xuICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignYWNrLmppbmdsZScsIFtzZXNzaW9uLnNpZCwgYWNrXSk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzdGFuemEpIHtcbiAgICAgICAgICAgIHZhciBlcnJvciA9ICgkKHN0YW56YSkuZmluZCgnZXJyb3InKS5sZW5ndGgpID8ge1xuICAgICAgICAgICAgICAgIGNvZGU6ICQoc3RhbnphKS5maW5kKCdlcnJvcicpLmF0dHIoJ2NvZGUnKSxcbiAgICAgICAgICAgICAgICByZWFzb246ICQoc3RhbnphKS5maW5kKCdlcnJvciA6Zmlyc3QnKVswXS50YWdOYW1lXG4gICAgICAgICAgICB9Ont9O1xuICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignYWNrLmppbmdsZScsIFtzZWxmLnNpZCwgZXJyb3JdKTtcbiAgICAgICAgfSxcbiAgICAgICAgMTAwMDApO1xuICAgIGlmICh0aGlzLnN0YXRzaW50ZXJ2YWwgIT09IG51bGwpIHtcbiAgICAgICAgd2luZG93LmNsZWFySW50ZXJ2YWwodGhpcy5zdGF0c2ludGVydmFsKTtcbiAgICAgICAgdGhpcy5zdGF0c2ludGVydmFsID0gbnVsbDtcbiAgICB9XG59O1xuXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLnNldFJUQ1BUZXJtaW5hdGlvblN0cmF0ZWd5ID0gZnVuY3Rpb24gKHN0cmF0ZWd5RlFOKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8gVE9ETyhncCkgbWF5YmUgbW92ZSB0aGUgUlRDUCB0ZXJtaW5hdGlvbiBzdHJhdGVneSBlbGVtZW50IHVuZGVyIHRoZVxuICAgIC8vIGNvbnRlbnQgb3IgY2hhbm5lbCBlbGVtZW50LlxuICAgIHZhciBzdHJhdGVneUlRID0gJGlxKHt0bzogdGhpcy5icmlkZ2VqaWQsIHR5cGU6ICdzZXQnfSk7XG4gICAgc3RyYXRlZ3lJUS5jKCdjb25mZXJlbmNlJywge1xuXHQgICAgeG1sbnM6ICdodHRwOi8vaml0c2kub3JnL3Byb3RvY29sL2NvbGlicmknLFxuXHQgICAgaWQ6IHRoaXMuY29uZmlkXG4gICAgfSk7XG5cbiAgICBzdHJhdGVneUlRLmMoJ3J0Y3AtdGVybWluYXRpb24tc3RyYXRlZ3knLCB7bmFtZTogc3RyYXRlZ3lGUU4gfSk7XG5cbiAgICBzdHJhdGVneUlRLmMoJ2NvbnRlbnQnLCB7bmFtZTogXCJ2aWRlb1wifSk7XG4gICAgc3RyYXRlZ3lJUS51cCgpOyAvLyBlbmQgb2YgY29udGVudFxuXG4gICAgY29uc29sZS5sb2coJ3NldHRpbmcgUlRDUCB0ZXJtaW5hdGlvbiBzdHJhdGVneScsIHN0cmF0ZWd5RlFOKTtcbiAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKHN0cmF0ZWd5SVEsXG4gICAgICAgIGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnb3QgcmVzdWx0Jyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2dvdCBlcnJvcicsIGVycik7XG4gICAgICAgIH1cbiAgICApO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBkZWZhdWx0IHZhbHVlIG9mIHRoZSBjaGFubmVsIGxhc3QtbiBhdHRyaWJ1dGUgaW4gdGhpcyBjb25mZXJlbmNlIGFuZFxuICogdXBkYXRlcy9wYXRjaGVzIHRoZSBleGlzdGluZyBjaGFubmVscy5cbiAqL1xuQ29saWJyaUZvY3VzLnByb3RvdHlwZS5zZXRDaGFubmVsTGFzdE4gPSBmdW5jdGlvbiAoY2hhbm5lbExhc3ROKSB7XG4gICAgaWYgKCgnbnVtYmVyJyA9PT0gdHlwZW9mKGNoYW5uZWxMYXN0TikpXG4gICAgICAgICAgICAmJiAodGhpcy5jaGFubmVsTGFzdE4gIT09IGNoYW5uZWxMYXN0TikpXG4gICAge1xuICAgICAgICB0aGlzLmNoYW5uZWxMYXN0TiA9IGNoYW5uZWxMYXN0TjtcblxuICAgICAgICAvLyBVcGRhdGUvcGF0Y2ggdGhlIGV4aXN0aW5nIGNoYW5uZWxzLlxuICAgICAgICB2YXIgcGF0Y2ggPSAkaXEoeyB0bzogdGhpcy5icmlkZ2VqaWQsIHR5cGU6ICdzZXQnIH0pO1xuXG4gICAgICAgIHBhdGNoLmMoXG4gICAgICAgICAgICAnY29uZmVyZW5jZScsXG4gICAgICAgICAgICB7IHhtbG5zOiAnaHR0cDovL2ppdHNpLm9yZy9wcm90b2NvbC9jb2xpYnJpJywgaWQ6IHRoaXMuY29uZmlkIH0pO1xuICAgICAgICBwYXRjaC5jKCdjb250ZW50JywgeyBuYW1lOiAndmlkZW8nIH0pO1xuICAgICAgICBwYXRjaC5jKFxuICAgICAgICAgICAgJ2NoYW5uZWwnLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlkOiAkKHRoaXMubXljaGFubmVsWzEgLyogdmlkZW8gKi9dKS5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgICAgICdsYXN0LW4nOiB0aGlzLmNoYW5uZWxMYXN0TlxuICAgICAgICAgICAgfSk7XG4gICAgICAgIHBhdGNoLnVwKCk7IC8vIGVuZCBvZiBjaGFubmVsXG4gICAgICAgIGZvciAodmFyIHAgPSAwOyBwIDwgdGhpcy5jaGFubmVscy5sZW5ndGg7IHArKylcbiAgICAgICAge1xuICAgICAgICAgICAgcGF0Y2guYyhcbiAgICAgICAgICAgICAgICAnY2hhbm5lbCcsXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBpZDogJCh0aGlzLmNoYW5uZWxzW3BdWzEgLyogdmlkZW8gKi9dKS5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgICAgICAgICAnbGFzdC1uJzogdGhpcy5jaGFubmVsTGFzdE5cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHBhdGNoLnVwKCk7IC8vIGVuZCBvZiBjaGFubmVsXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmRJUShcbiAgICAgICAgICAgIHBhdGNoLFxuICAgICAgICAgICAgZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnU2V0IGNoYW5uZWwgbGFzdC1uIHN1Y2NlZWRlZDonLCByZXMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdTZXQgY2hhbm5lbCBsYXN0LW4gZmFpbGVkOicsIGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIGRlZmF1bHQgdmFsdWUgb2YgdGhlIGNoYW5uZWwgc2ltdWxjYXN0IGxheWVyIGF0dHJpYnV0ZSBpbiB0aGlzXG4gKiBjb25mZXJlbmNlIGFuZCB1cGRhdGVzL3BhdGNoZXMgdGhlIGV4aXN0aW5nIGNoYW5uZWxzLlxuICovXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLnNldFJlY2VpdmVTaW11bGNhc3RMYXllciA9IGZ1bmN0aW9uIChyZWNlaXZlU2ltdWxjYXN0TGF5ZXIpIHtcbiAgICBpZiAoKCdudW1iZXInID09PSB0eXBlb2YocmVjZWl2ZVNpbXVsY2FzdExheWVyKSlcbiAgICAgICAgJiYgKHRoaXMucmVjZWl2ZVNpbXVsY2FzdExheWVyICE9PSByZWNlaXZlU2ltdWxjYXN0TGF5ZXIpKVxuICAgIHtcbiAgICAgICAgLy8gVE9ETyhncCkgYmUgYWJsZSB0byBzZXQgdGhlIHJlY2VpdmluZyBzaW11bGNhc3QgbGF5ZXIgb24gYSBwZXJcbiAgICAgICAgLy8gc2VuZGVyIGJhc2lzLlxuICAgICAgICB0aGlzLnJlY2VpdmVTaW11bGNhc3RMYXllciA9IHJlY2VpdmVTaW11bGNhc3RMYXllcjtcblxuICAgICAgICAvLyBVcGRhdGUvcGF0Y2ggdGhlIGV4aXN0aW5nIGNoYW5uZWxzLlxuICAgICAgICB2YXIgcGF0Y2ggPSAkaXEoeyB0bzogdGhpcy5icmlkZ2VqaWQsIHR5cGU6ICdzZXQnIH0pO1xuXG4gICAgICAgIHBhdGNoLmMoXG4gICAgICAgICAgICAnY29uZmVyZW5jZScsXG4gICAgICAgICAgICB7IHhtbG5zOiAnaHR0cDovL2ppdHNpLm9yZy9wcm90b2NvbC9jb2xpYnJpJywgaWQ6IHRoaXMuY29uZmlkIH0pO1xuICAgICAgICBwYXRjaC5jKCdjb250ZW50JywgeyBuYW1lOiAndmlkZW8nIH0pO1xuICAgICAgICBwYXRjaC5jKFxuICAgICAgICAgICAgJ2NoYW5uZWwnLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlkOiAkKHRoaXMubXljaGFubmVsWzEgLyogdmlkZW8gKi9dKS5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgICAgICdyZWNlaXZlLXNpbXVsY2FzdC1sYXllcic6IHRoaXMucmVjZWl2ZVNpbXVsY2FzdExheWVyXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgcGF0Y2gudXAoKTsgLy8gZW5kIG9mIGNoYW5uZWxcbiAgICAgICAgZm9yICh2YXIgcCA9IDA7IHAgPCB0aGlzLmNoYW5uZWxzLmxlbmd0aDsgcCsrKVxuICAgICAgICB7XG4gICAgICAgICAgICBwYXRjaC5jKFxuICAgICAgICAgICAgICAgICdjaGFubmVsJyxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiAkKHRoaXMuY2hhbm5lbHNbcF1bMSAvKiB2aWRlbyAqL10pLmF0dHIoJ2lkJyksXG4gICAgICAgICAgICAgICAgICAgICdyZWNlaXZlLXNpbXVsY2FzdC1sYXllcic6IHRoaXMucmVjZWl2ZVNpbXVsY2FzdExheWVyXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBwYXRjaC51cCgpOyAvLyBlbmQgb2YgY2hhbm5lbFxuICAgICAgICB9XG4gICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoXG4gICAgICAgICAgICBwYXRjaCxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oJ1NldCBjaGFubmVsIHNpbXVsY2FzdCByZWNlaXZlIGxheWVyIHN1Y2NlZWRlZDonLCByZXMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdTZXQgY2hhbm5lbCBzaW11bGNhc3QgcmVjZWl2ZSBsYXllciBmYWlsZWQ6JywgZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IENvbGlicmlGb2N1cztcbiIsIi8qIGNvbGlicmkuanMgLS0gYSBDT0xJQlJJIGZvY3VzIFxuICogVGhlIGNvbGlicmkgc3BlYyBoYXMgYmVlbiBzdWJtaXR0ZWQgdG8gdGhlIFhNUFAgU3RhbmRhcmRzIEZvdW5kYXRpb25cbiAqIGZvciBwdWJsaWNhdGlvbnMgYXMgYSBYTVBQIGV4dGVuc2lvbnM6XG4gKiBodHRwOi8veG1wcC5vcmcvZXh0ZW5zaW9ucy9pbmJveC9jb2xpYnJpLmh0bWxcbiAqXG4gKiBjb2xpYnJpLmpzIGlzIGEgcGFydGljaXBhdGluZyBmb2N1cywgaS5lLiB0aGUgZm9jdXMgcGFydGljaXBhdGVzXG4gKiBpbiB0aGUgY29uZmVyZW5jZS4gVGhlIGNvbmZlcmVuY2UgaXRzZWxmIGNhbiBiZSBhZC1ob2MsIHRocm91Z2ggYVxuICogTVVDLCB0aHJvdWdoIFB1YlN1YiwgZXRjLlxuICpcbiAqIGNvbGlicmkuanMgcmVsaWVzIGhlYXZpbHkgb24gdGhlIHN0cm9waGUuamluZ2xlIGxpYnJhcnkgYXZhaWxhYmxlIFxuICogZnJvbSBodHRwczovL2dpdGh1Yi5jb20vRVNUT1Mvc3Ryb3BoZS5qaW5nbGVcbiAqIGFuZCBpbnRlcm9wZXJhdGVzIHdpdGggdGhlIEppdHNpIHZpZGVvYnJpZGdlIGF2YWlsYWJsZSBmcm9tXG4gKiBodHRwczovL2ppdHNpLm9yZy9Qcm9qZWN0cy9KaXRzaVZpZGVvYnJpZGdlXG4gKi9cbi8qXG5Db3B5cmlnaHQgKGMpIDIwMTMgRVNUT1MgR21iSFxuXG5QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG5vZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG5pbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG50byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG5jb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbmZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cblRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG5hbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG5GSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbkFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbkxJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG5PVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG5USEUgU09GVFdBUkUuXG4qL1xuLy8gQSBjb2xpYnJpIHNlc3Npb24gaXMgc2ltaWxhciB0byBhIGppbmdsZSBzZXNzaW9uLCBpdCBqdXN0IGltcGxlbWVudHMgc29tZSB0aGluZ3MgZGlmZmVyZW50bHlcbi8vIEZJWE1FOiBpbmhlcml0IGppbmdsZXNlc3Npb24sIHNlZSBodHRwczovL2dpdGh1Yi5jb20vbGVnYXN0ZXJvL0ppbmdsZS1SVENQZWVyQ29ubmVjdGlvbi9ibG9iL21hc3Rlci9pbmRleC5qc1xuZnVuY3Rpb24gQ29saWJyaVNlc3Npb24obWUsIHNpZCwgY29ubmVjdGlvbikge1xuICAgIHRoaXMubWUgPSBtZTtcbiAgICB0aGlzLnNpZCA9IHNpZDtcbiAgICB0aGlzLmNvbm5lY3Rpb24gPSBjb25uZWN0aW9uO1xuICAgIC8vdGhpcy5wZWVyY29ubmVjdGlvbiA9IG51bGw7XG4gICAgLy90aGlzLm15Y2hhbm5lbCA9IG51bGw7XG4gICAgLy90aGlzLmNoYW5uZWxzID0gbnVsbDtcbiAgICB0aGlzLnBlZXJqaWQgPSBudWxsO1xuXG4gICAgdGhpcy5jb2xpYnJpID0gbnVsbDtcbn1cblxuLy8gaW1wbGVtZW50YXRpb24gb2YgSmluZ2xlU2Vzc2lvbiBpbnRlcmZhY2VcbkNvbGlicmlTZXNzaW9uLnByb3RvdHlwZS5pbml0aWF0ZSA9IGZ1bmN0aW9uIChwZWVyamlkLCBpc0luaXRpYXRvcikge1xuICAgIHRoaXMucGVlcmppZCA9IHBlZXJqaWQ7XG59O1xuXG5Db2xpYnJpU2Vzc2lvbi5wcm90b3R5cGUuc2VuZE9mZmVyID0gZnVuY3Rpb24gKG9mZmVyKSB7XG4gICAgY29uc29sZS5sb2coJ0NvbGlicmlTZXNzaW9uLnNlbmRPZmZlcicpO1xufTtcblxuXG5Db2xpYnJpU2Vzc2lvbi5wcm90b3R5cGUuYWNjZXB0ID0gZnVuY3Rpb24gKCkge1xuICAgIGNvbnNvbGUubG9nKCdDb2xpYnJpU2Vzc2lvbi5hY2NlcHQnKTtcbn07XG5cbkNvbGlicmlTZXNzaW9uLnByb3RvdHlwZS5hZGRTb3VyY2UgPSBmdW5jdGlvbiAoZWxlbSwgZnJvbUppZCkge1xuICAgIHRoaXMuY29saWJyaS5hZGRTb3VyY2UoZWxlbSwgZnJvbUppZCk7XG59O1xuXG5Db2xpYnJpU2Vzc2lvbi5wcm90b3R5cGUucmVtb3ZlU291cmNlID0gZnVuY3Rpb24gKGVsZW0sIGZyb21KaWQpIHtcbiAgICB0aGlzLmNvbGlicmkucmVtb3ZlU291cmNlKGVsZW0sIGZyb21KaWQpO1xufTtcblxuQ29saWJyaVNlc3Npb24ucHJvdG90eXBlLnRlcm1pbmF0ZSA9IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICB0aGlzLmNvbGlicmkudGVybWluYXRlKHRoaXMsIHJlYXNvbik7XG59O1xuXG5Db2xpYnJpU2Vzc2lvbi5wcm90b3R5cGUuYWN0aXZlID0gZnVuY3Rpb24gKCkge1xuICAgIGNvbnNvbGUubG9nKCdDb2xpYnJpU2Vzc2lvbi5hY3RpdmUnKTtcbn07XG5cbkNvbGlicmlTZXNzaW9uLnByb3RvdHlwZS5zZXRSZW1vdGVEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uIChlbGVtLCBkZXNjdHlwZSkge1xuICAgIHRoaXMuY29saWJyaS5zZXRSZW1vdGVEZXNjcmlwdGlvbih0aGlzLCBlbGVtLCBkZXNjdHlwZSk7XG59O1xuXG5Db2xpYnJpU2Vzc2lvbi5wcm90b3R5cGUuYWRkSWNlQ2FuZGlkYXRlID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICB0aGlzLmNvbGlicmkuYWRkSWNlQ2FuZGlkYXRlKHRoaXMsIGVsZW0pO1xufTtcblxuQ29saWJyaVNlc3Npb24ucHJvdG90eXBlLnNlbmRBbnN3ZXIgPSBmdW5jdGlvbiAoc2RwLCBwcm92aXNpb25hbCkge1xuICAgIGNvbnNvbGUubG9nKCdDb2xpYnJpU2Vzc2lvbi5zZW5kQW5zd2VyJyk7XG59O1xuXG5Db2xpYnJpU2Vzc2lvbi5wcm90b3R5cGUuc2VuZFRlcm1pbmF0ZSA9IGZ1bmN0aW9uIChyZWFzb24sIHRleHQpIHtcbiAgICB0aGlzLmNvbGlicmkuc2VuZFRlcm1pbmF0ZSh0aGlzLCByZWFzb24sIHRleHQpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb2xpYnJpU2Vzc2lvbjsiLCIvKipcbiAqIE1vZGVyYXRlIGNvbm5lY3Rpb24gcGx1Z2luLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgU3Ryb3BoZS5hZGRDb25uZWN0aW9uUGx1Z2luKCdtb2RlcmF0ZScsIHtcbiAgICAgICAgY29ubmVjdGlvbjogbnVsbCxcbiAgICAgICAgcm9vbWppZDogbnVsbCxcbiAgICAgICAgbXlyb29tamlkOiBudWxsLFxuICAgICAgICBtZW1iZXJzOiB7fSxcbiAgICAgICAgbGlzdF9tZW1iZXJzOiBbXSwgLy8gc28gd2UgY2FuIGVsZWN0IGEgbmV3IGZvY3VzXG4gICAgICAgIHByZXNNYXA6IHt9LFxuICAgICAgICBwcmV6aU1hcDoge30sXG4gICAgICAgIGpvaW5lZDogZmFsc2UsXG4gICAgICAgIGlzT3duZXI6IGZhbHNlLFxuICAgICAgICBpbml0OiBmdW5jdGlvbiAoY29ubikge1xuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uID0gY29ubjtcblxuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLmFkZEhhbmRsZXIodGhpcy5vbk11dGUuYmluZCh0aGlzKSxcbiAgICAgICAgICAgICAgICAnaHR0cDovL2ppdHNpLm9yZy9qaXRtZWV0L2F1ZGlvJyxcbiAgICAgICAgICAgICAgICAnaXEnLFxuICAgICAgICAgICAgICAgICdzZXQnLFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgbnVsbCk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldE11dGU6IGZ1bmN0aW9uIChqaWQsIG11dGUpIHtcbiAgICAgICAgICAgIHZhciBpcSA9ICRpcSh7dG86IGppZCwgdHlwZTogJ3NldCd9KVxuICAgICAgICAgICAgICAgIC5jKCdtdXRlJywge3htbG5zOiAnaHR0cDovL2ppdHNpLm9yZy9qaXRtZWV0L2F1ZGlvJ30pXG4gICAgICAgICAgICAgICAgLnQobXV0ZS50b1N0cmluZygpKVxuICAgICAgICAgICAgICAgIC51cCgpO1xuXG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKFxuICAgICAgICAgICAgICAgIGlxLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NldCBtdXRlJywgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2V0IG11dGUgZXJyb3InLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5SZXBvcnREaWFsb2cobnVsbCwgJ0ZhaWxlZCB0byBtdXRlICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJChcIiNwYXJ0aWNpcGFudF9cIiArIGppZCkuZmluZChcIi5kaXNwbGF5bmFtZVwiKS50ZXh0KCkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwicGFydGljaXBhbnRcIiArICcuJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBvbk11dGU6IGZ1bmN0aW9uIChpcSkge1xuICAgICAgICAgICAgdmFyIG11dGUgPSAkKGlxKS5maW5kKCdtdXRlJyk7XG4gICAgICAgICAgICBpZiAobXV0ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0b2dnbGVBdWRpbygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIGVqZWN0OiBmdW5jdGlvbiAoamlkKSB7XG4gICAgICAgICAgICBjb25uZWN0aW9uLmppbmdsZS50ZXJtaW5hdGVSZW1vdGVCeUppZChqaWQsICdraWNrJyk7XG4gICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMua2ljayhqaWQpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbn07XG4iLCIvKiBqc2hpbnQgLVcxMTcgKi9cbi8qIGEgc2ltcGxlIE1VQyBjb25uZWN0aW9uIHBsdWdpblxuICogY2FuIG9ubHkgaGFuZGxlIGEgc2luZ2xlIE1VQyByb29tXG4gKi9cblxudmFyIENvbGlicmlGb2N1cyA9IHJlcXVpcmUoXCIuL2NvbGlicmkvY29saWJyaS5mb2N1c1wiKTtcbnZhciBYTVBQQWN0aXZhdG9yID0gcmVxdWlyZShcIi4vWE1QUEFjdGl2YXRvclwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihldmVudEVtaXR0ZXIpIHtcbiAgICBTdHJvcGhlLmFkZENvbm5lY3Rpb25QbHVnaW4oJ2VtdWMnLCB7XG4gICAgICAgIGNvbm5lY3Rpb246IG51bGwsXG4gICAgICAgIHJvb21qaWQ6IG51bGwsXG4gICAgICAgIG15cm9vbWppZDogbnVsbCxcbiAgICAgICAgbWVtYmVyczoge30sXG4gICAgICAgIGxpc3RfbWVtYmVyczogW10sIC8vIHNvIHdlIGNhbiBlbGVjdCBhIG5ldyBmb2N1c1xuICAgICAgICBwcmVzTWFwOiB7fSxcbiAgICAgICAgcHJlemlNYXA6IHt9LFxuICAgICAgICBqb2luZWQ6IGZhbHNlLFxuICAgICAgICBpc093bmVyOiBmYWxzZSxcbiAgICAgICAgc2Vzc2lvblRlcm1pbmF0ZWQ6IGZhbHNlLFxuICAgICAgICBpbml0OiBmdW5jdGlvbiAoY29ubikge1xuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uID0gY29ubjtcbiAgICAgICAgfSxcbiAgICAgICAgaW5pdFByZXNlbmNlTWFwOiBmdW5jdGlvbiAobXlyb29tamlkKSB7XG4gICAgICAgICAgICB0aGlzLnByZXNNYXBbJ3RvJ10gPSBteXJvb21qaWQ7XG4gICAgICAgICAgICB0aGlzLnByZXNNYXBbJ3hucyddID0gJ2h0dHA6Ly9qYWJiZXIub3JnL3Byb3RvY29sL211Yyc7XG4gICAgICAgIH0sXG4gICAgICAgIGRvSm9pbjogZnVuY3Rpb24gKGppZCwgcGFzc3dvcmQpIHtcbiAgICAgICAgICAgIHRoaXMubXlyb29tamlkID0gamlkO1xuXG4gICAgICAgICAgICBjb25zb2xlLmluZm8oXCJKb2luZWQgTVVDIGFzIFwiICsgdGhpcy5teXJvb21qaWQpO1xuXG4gICAgICAgICAgICB0aGlzLmluaXRQcmVzZW5jZU1hcCh0aGlzLm15cm9vbWppZCk7XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5yb29tamlkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yb29tamlkID0gU3Ryb3BoZS5nZXRCYXJlSmlkRnJvbUppZChqaWQpO1xuICAgICAgICAgICAgICAgIC8vIGFkZCBoYW5kbGVycyAoanVzdCBvbmNlKVxuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5hZGRIYW5kbGVyKHRoaXMub25QcmVzZW5jZS5iaW5kKHRoaXMpLCBudWxsLCAncHJlc2VuY2UnLCBudWxsLCBudWxsLCB0aGlzLnJvb21qaWQsIHttYXRjaEJhcmU6IHRydWV9KTtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uYWRkSGFuZGxlcih0aGlzLm9uUHJlc2VuY2VVbmF2YWlsYWJsZS5iaW5kKHRoaXMpLCBudWxsLCAncHJlc2VuY2UnLCAndW5hdmFpbGFibGUnLCBudWxsLCB0aGlzLnJvb21qaWQsIHttYXRjaEJhcmU6IHRydWV9KTtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uYWRkSGFuZGxlcih0aGlzLm9uUHJlc2VuY2VFcnJvci5iaW5kKHRoaXMpLCBudWxsLCAncHJlc2VuY2UnLCAnZXJyb3InLCBudWxsLCB0aGlzLnJvb21qaWQsIHttYXRjaEJhcmU6IHRydWV9KTtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uYWRkSGFuZGxlcih0aGlzLm9uTWVzc2FnZS5iaW5kKHRoaXMpLCBudWxsLCAnbWVzc2FnZScsIG51bGwsIG51bGwsIHRoaXMucm9vbWppZCwge21hdGNoQmFyZTogdHJ1ZX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHBhc3N3b3JkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByZXNNYXBbJ3Bhc3N3b3JkJ10gPSBwYXNzd29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2VuZFByZXNlbmNlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGRvTGVhdmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZG8gbGVhdmVcIiwgdGhpcy5teXJvb21qaWQpO1xuICAgICAgICAgICAgdGhpcy5zZXNzaW9uVGVybWluYXRlZCA9IHRydWU7XG4gICAgICAgICAgICB2YXIgcHJlcyA9ICRwcmVzKHt0bzogdGhpcy5teXJvb21qaWQsIHR5cGU6ICd1bmF2YWlsYWJsZScgfSk7XG4gICAgICAgICAgICB0aGlzLnByZXNNYXAubGVuZ3RoID0gMDtcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kKHByZXMpO1xuICAgICAgICB9LFxuICAgICAgICBvblByZXNlbmNlOiBmdW5jdGlvbiAocHJlcykge1xuICAgICAgICAgICAgdmFyIGZyb20gPSBwcmVzLmdldEF0dHJpYnV0ZSgnZnJvbScpO1xuICAgICAgICAgICAgdmFyIHR5cGUgPSBwcmVzLmdldEF0dHJpYnV0ZSgndHlwZScpO1xuICAgICAgICAgICAgaWYgKHR5cGUgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBQYXJzZSBldGhlcnBhZCB0YWcuXG4gICAgICAgICAgICB2YXIgZXRoZXJwYWQgPSAkKHByZXMpLmZpbmQoJz5ldGhlcnBhZCcpO1xuICAgICAgICAgICAgaWYgKGV0aGVycGFkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2V0aGVycGFkYWRkZWQubXVjJywgW2Zyb20sIGV0aGVycGFkLnRleHQoKV0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBQYXJzZSBwcmV6aSB0YWcuXG4gICAgICAgICAgICB2YXIgcHJlc2VudGF0aW9uID0gJChwcmVzKS5maW5kKCc+cHJlemknKTtcbiAgICAgICAgICAgIGlmIChwcmVzZW50YXRpb24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHVybCA9IHByZXNlbnRhdGlvbi5hdHRyKCd1cmwnKTtcbiAgICAgICAgICAgICAgICB2YXIgY3VycmVudCA9IHByZXNlbnRhdGlvbi5maW5kKCc+Y3VycmVudCcpLnRleHQoKTtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwcmVzZW50YXRpb24gaW5mbyByZWNlaXZlZCBmcm9tJywgZnJvbSwgdXJsKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnByZXppTWFwW2Zyb21dID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcmV6aU1hcFtmcm9tXSA9IHVybDtcblxuICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdwcmVzZW50YXRpb25hZGRlZC5tdWMnLCBbZnJvbSwgdXJsLCBjdXJyZW50XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdnb3Rvc2xpZGUubXVjJywgW2Zyb20sIHVybCwgY3VycmVudF0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMucHJlemlNYXBbZnJvbV0gIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHZhciB1cmwgPSB0aGlzLnByZXppTWFwW2Zyb21dO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnByZXppTWFwW2Zyb21dO1xuICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ3ByZXNlbnRhdGlvbnJlbW92ZWQubXVjJywgW2Zyb20sIHVybF0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBQYXJzZSBhdWRpbyBpbmZvIHRhZy5cbiAgICAgICAgICAgIHZhciBhdWRpb011dGVkID0gJChwcmVzKS5maW5kKCc+YXVkaW9tdXRlZCcpO1xuICAgICAgICAgICAgaWYgKGF1ZGlvTXV0ZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignYXVkaW9tdXRlZC5tdWMnLCBbZnJvbSwgYXVkaW9NdXRlZC50ZXh0KCldKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUGFyc2UgdmlkZW8gaW5mbyB0YWcuXG4gICAgICAgICAgICB2YXIgdmlkZW9NdXRlZCA9ICQocHJlcykuZmluZCgnPnZpZGVvbXV0ZWQnKTtcbiAgICAgICAgICAgIGlmICh2aWRlb011dGVkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ3ZpZGVvbXV0ZWQubXVjJywgW2Zyb20sIHZpZGVvTXV0ZWQudGV4dCgpXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFBhcnNlIHN0YXR1cy5cbiAgICAgICAgICAgIGlmICgkKHByZXMpLmZpbmQoJz54W3htbG5zPVwiaHR0cDovL2phYmJlci5vcmcvcHJvdG9jb2wvbXVjI3VzZXJcIl0+c3RhdHVzW2NvZGU9XCIyMDFcIl0nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAvLyBodHRwOi8veG1wcC5vcmcvZXh0ZW5zaW9ucy94ZXAtMDA0NS5odG1sI2NyZWF0ZXJvb20taW5zdGFudFxuICAgICAgICAgICAgICAgIHRoaXMuaXNPd25lciA9IHRydWU7XG4gICAgICAgICAgICAgICAgdmFyIGNyZWF0ZSA9ICRpcSh7dHlwZTogJ3NldCcsIHRvOiB0aGlzLnJvb21qaWR9KVxuICAgICAgICAgICAgICAgICAgICAuYygncXVlcnknLCB7eG1sbnM6ICdodHRwOi8vamFiYmVyLm9yZy9wcm90b2NvbC9tdWMjb3duZXInfSlcbiAgICAgICAgICAgICAgICAgICAgLmMoJ3gnLCB7eG1sbnM6ICdqYWJiZXI6eDpkYXRhJywgdHlwZTogJ3N1Ym1pdCd9KTtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZChjcmVhdGUpOyAvLyBmaXJlIGF3YXlcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUGFyc2Ugcm9sZXMuXG4gICAgICAgICAgICB2YXIgbWVtYmVyID0ge307XG4gICAgICAgICAgICBtZW1iZXIuc2hvdyA9ICQocHJlcykuZmluZCgnPnNob3cnKS50ZXh0KCk7XG4gICAgICAgICAgICBtZW1iZXIuc3RhdHVzID0gJChwcmVzKS5maW5kKCc+c3RhdHVzJykudGV4dCgpO1xuICAgICAgICAgICAgdmFyIHRtcCA9ICQocHJlcykuZmluZCgnPnhbeG1sbnM9XCJodHRwOi8vamFiYmVyLm9yZy9wcm90b2NvbC9tdWMjdXNlclwiXT5pdGVtJyk7XG4gICAgICAgICAgICBtZW1iZXIuYWZmaWxpYXRpb24gPSB0bXAuYXR0cignYWZmaWxpYXRpb24nKTtcbiAgICAgICAgICAgIG1lbWJlci5yb2xlID0gdG1wLmF0dHIoJ3JvbGUnKTtcblxuICAgICAgICAgICAgdmFyIG5pY2t0YWcgPSAkKHByZXMpLmZpbmQoJz5uaWNrW3htbG5zPVwiaHR0cDovL2phYmJlci5vcmcvcHJvdG9jb2wvbmlja1wiXScpO1xuICAgICAgICAgICAgbWVtYmVyLmRpc3BsYXlOYW1lID0gKG5pY2t0YWcubGVuZ3RoID4gMCA/IG5pY2t0YWcudGV4dCgpIDogbnVsbCk7XG5cbiAgICAgICAgICAgIGlmIChmcm9tID09IHRoaXMubXlyb29tamlkKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1lbWJlci5hZmZpbGlhdGlvbiA9PSAnb3duZXInKSB0aGlzLmlzT3duZXIgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5qb2luZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5qb2luZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbm9NZW1iZXJzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGlmIChPYmplY3Qua2V5cyhjb25uZWN0aW9uLmVtdWMubWVtYmVycykubGVuZ3RoIDwgMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9NZW1iZXJzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvY3VzID0gbmV3IENvbGlicmlGb2N1cyhjb25uZWN0aW9uLCBjb25maWcuaG9zdHMuYnJpZGdlLCBldmVudEVtaXR0ZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRPd25OaWNrbmFtZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFVJQWN0aXZhdG9yLmdldFVJU2VydmljZSgpLm9uTXVjSm9pbmVkKGZyb20sIG1lbWJlciwgbm9NZW1iZXJzKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5saXN0X21lbWJlcnMucHVzaChmcm9tKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMubWVtYmVyc1tmcm9tXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgLy8gbmV3IHBhcnRpY2lwYW50XG4gICAgICAgICAgICAgICAgdGhpcy5tZW1iZXJzW2Zyb21dID0gbWVtYmVyO1xuICAgICAgICAgICAgICAgIHRoaXMubGlzdF9tZW1iZXJzLnB1c2goZnJvbSk7XG4gICAgICAgICAgICAgICAgVUlBY3RpdmF0b3IuZ2V0VUlTZXJ2aWNlKCkub25NdWNFbnRlcmVkKGZyb20sIG1lbWJlciwgcHJlcyk7XG4gICAgICAgICAgICAgICAgaWYgKGZvY3VzICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZJWE1FOiB0aGlzIHNob3VsZCBwcmVwYXJlIHRoZSB2aWRlb1xuICAgICAgICAgICAgICAgICAgICBpZiAoZm9jdXMuY29uZmlkID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbWFrZSBuZXcgY29uZmVyZW5jZSB3aXRoJywgZnJvbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb2N1cy5tYWtlQ29uZmVyZW5jZShPYmplY3Qua2V5cyh0aGlzLm1lbWJlcnMpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdpbnZpdGUnLCBmcm9tLCAnaW50byBjb25mZXJlbmNlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb2N1cy5hZGROZXdQYXJ0aWNpcGFudChmcm9tKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEFsd2F5cyB0cmlnZ2VyIHByZXNlbmNlIHRvIHVwZGF0ZSBiaW5kaW5nc1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3ByZXNlbmNlIGNoYW5nZSBmcm9tJywgZnJvbSk7XG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdwcmVzZW5jZS5tdWMnLCBbZnJvbSwgbWVtYmVyLCBwcmVzXSk7XG5cbiAgICAgICAgICAgIC8vIFRyaWdnZXIgc3RhdHVzIG1lc3NhZ2UgdXBkYXRlXG4gICAgICAgICAgICBpZiAobWVtYmVyLnN0YXR1cykge1xuICAgICAgICAgICAgICAgIFVJQWN0aXZhdG9yLmdldFVJU2VydmljZSgpLm9uTXVjUHJlc2VuY2VTdGF0dXMoZnJvbSwgbWVtYmVyLCBwcmVzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIG9uUHJlc2VuY2VVbmF2YWlsYWJsZTogZnVuY3Rpb24gKHByZXMpIHtcbiAgICAgICAgICAgIHZhciBmcm9tID0gcHJlcy5nZXRBdHRyaWJ1dGUoJ2Zyb20nKTtcbiAgICAgICAgICAgIC8vIFN0YXR1cyBjb2RlIDExMCBpbmRpY2F0ZXMgdGhhdCB0aGlzIG5vdGlmaWNhdGlvbiBpcyBcInNlbGYtcHJlc2VuY2VcIi5cbiAgICAgICAgICAgIGlmICghJChwcmVzKS5maW5kKCc+eFt4bWxucz1cImh0dHA6Ly9qYWJiZXIub3JnL3Byb3RvY29sL211YyN1c2VyXCJdPnN0YXR1c1tjb2RlPVwiMTEwXCJdJykubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMubWVtYmVyc1tmcm9tXTtcbiAgICAgICAgICAgICAgICB0aGlzLmxpc3RfbWVtYmVycy5zcGxpY2UodGhpcy5saXN0X21lbWJlcnMuaW5kZXhPZihmcm9tKSwgMSk7XG4gICAgICAgICAgICAgICAgdGhpcy5sZWZ0TXVjKGZyb20pO1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignbGVmdC5tdWMnLCBbZnJvbV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgdGhlIHN0YXR1cyBjb2RlIGlzIDExMCB0aGlzIG1lYW5zIHdlJ3JlIGxlYXZpbmcgYW5kIHdlIHdvdWxkIGxpa2VcbiAgICAgICAgICAgIC8vIHRvIHJlbW92ZSBldmVyeW9uZSBlbHNlIGZyb20gb3VyIHZpZXcsIHNvIHdlIHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5saXN0X21lbWJlcnMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5saXN0X21lbWJlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1lbWJlciA9IHRoaXMubGlzdF9tZW1iZXJzW2ldO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5tZW1iZXJzW2ldO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpc3RfbWVtYmVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGVmdE11YyhtZW1iZXIpO1xuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdsZWZ0Lm11YycsIG1lbWJlcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIGxlZnRNdWM6IGZ1bmN0aW9uIChqaWQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdsZWZ0Lm11YycsIGppZCk7XG4gICAgICAgICAgICBVSUFjdGl2YXRvci5nZXRVSVNlcnZpY2UoKS5vbk11Y0xlZnQoamlkKTtcbiAgICAgICAgICAgIGNvbm5lY3Rpb24uamluZ2xlLnRlcm1pbmF0ZUJ5SmlkKGppZCk7XG5cbiAgICAgICAgICAgIGlmIChmb2N1cyA9PSBudWxsXG4gICAgICAgICAgICAgICAgLy8gSSBzaG91bGRuJ3QgYmUgdGhlIG9uZSB0aGF0IGxlZnQgdG8gZW50ZXIgaGVyZS5cbiAgICAgICAgICAgICAgICAmJiBqaWQgIT09IGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWRcbiAgICAgICAgICAgICAgICAmJiBjb25uZWN0aW9uLmVtdWMubXlyb29tamlkID09PSBjb25uZWN0aW9uLmVtdWMubGlzdF9tZW1iZXJzWzBdXG4gICAgICAgICAgICAgICAgLy8gSWYgb3VyIHNlc3Npb24gaGFzIGJlZW4gdGVybWluYXRlZCBmb3Igc29tZSByZWFzb25cbiAgICAgICAgICAgICAgICAvLyAoa2lja2VkLCBoYW5ndXApLCBkb24ndCB0cnkgdG8gYmVjb21lIHRoZSBmb2N1c1xuICAgICAgICAgICAgICAgICYmICF0aGlzLnNlc3Npb25UZXJtaW5hdGVkKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3dlbGNvbWUgdG8gb3VyIG5ldyBmb2N1cy4uLiBteXNlbGYnKTtcbiAgICAgICAgICAgICAgICBmb2N1cyA9IG5ldyBDb2xpYnJpRm9jdXMoY29ubmVjdGlvbiwgY29uZmlnLmhvc3RzLmJyaWRnZSwgZXZlbnRFbWl0dGVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldE93bk5pY2tuYW1lKCk7XG5cbiAgICAgICAgICAgICAgICBVSUFjdGl2YXRvci5nZXRVSVNlcnZpY2UoKS51cGRhdGVCdXR0b25zKG51bGwsIHRydWUpO1xuXG4gICAgICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKGNvbm5lY3Rpb24uZW11Yy5tZW1iZXJzKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvY3VzLm1ha2VDb25mZXJlbmNlKE9iamVjdC5rZXlzKGNvbm5lY3Rpb24uZW11Yy5tZW1iZXJzKSk7XG4gICAgICAgICAgICAgICAgICAgIFVJQWN0aXZhdG9yLmdldFVJU2VydmljZSgpLnVwZGF0ZUJ1dHRvbnModHJ1ZSwgbnVsbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2ZvY3VzZWNoYW5nZWQubXVjJywgW2ZvY3VzXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChmb2N1cyAmJiBPYmplY3Qua2V5cyhjb25uZWN0aW9uLmVtdWMubWVtYmVycykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2V2ZXJ5b25lIGxlZnQnKTtcbiAgICAgICAgICAgICAgICAvLyBGSVhNRTogY2xvc2luZyB0aGUgY29ubmVjdGlvbiBpcyBhIGhhY2sgdG8gYXZvaWQgc29tZVxuICAgICAgICAgICAgICAgIC8vIHByb2JsZW1zIHdpdGggcmVpbml0XG4gICAgICAgICAgICAgICAgZGlzcG9zZUNvbmZlcmVuY2UoKTtcbiAgICAgICAgICAgICAgICBmb2N1cyA9IG5ldyBDb2xpYnJpRm9jdXMoY29ubmVjdGlvbiwgY29uZmlnLmhvc3RzLmJyaWRnZSwgZXZlbnRFbWl0dGVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldE93bk5pY2tuYW1lKCk7XG4gICAgICAgICAgICAgICAgVUlBY3RpdmF0b3IuZ2V0VUlTZXJ2aWNlKCkudXBkYXRlQnV0dG9ucyh0cnVlLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjb25uZWN0aW9uLmVtdWMuZ2V0UHJlemkoamlkKSkge1xuICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ3ByZXNlbnRhdGlvbnJlbW92ZWQubXVjJyxcbiAgICAgICAgICAgICAgICAgICAgW2ppZCwgY29ubmVjdGlvbi5lbXVjLmdldFByZXppKGppZCldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2V0T3duTmlja25hbWU6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgaWYgKFhNUFBBY3RpdmF0b3IuZ2V0Tmlja25hbWUoKSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGZvY3VzLnNldEVuZHBvaW50RGlzcGxheU5hbWUoY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZCxcbiAgICAgICAgICAgICAgICAgICAgWE1QUEFjdGl2YXRvci5nZXROaWNrbmFtZSgpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9LFxuICAgICAgICBvblByZXNlbmNlRXJyb3I6IGZ1bmN0aW9uIChwcmVzKSB7XG4gICAgICAgICAgICB2YXIgZnJvbSA9IHByZXMuZ2V0QXR0cmlidXRlKCdmcm9tJyk7XG4gICAgICAgICAgICBpZiAoJChwcmVzKS5maW5kKCc+ZXJyb3JbdHlwZT1cImF1dGhcIl0+bm90LWF1dGhvcml6ZWRbeG1sbnM9XCJ1cm46aWV0ZjpwYXJhbXM6eG1sOm5zOnhtcHAtc3Rhbnphc1wiXScpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIFVJQWN0aXZhdG9yLmdldFVJU2VydmljZSgpLnNob3dMb2NrUG9wdXAoZnJvbSwgdGhpcy5kb0pvaW4pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgkKHByZXMpLmZpbmQoXG4gICAgICAgICAgICAgICAgJz5lcnJvclt0eXBlPVwiY2FuY2VsXCJdPm5vdC1hbGxvd2VkW3htbG5zPVwidXJuOmlldGY6cGFyYW1zOnhtbDpuczp4bXBwLXN0YW56YXNcIl0nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB2YXIgdG9Eb21haW4gPSBTdHJvcGhlLmdldERvbWFpbkZyb21KaWQocHJlcy5nZXRBdHRyaWJ1dGUoJ3RvJykpO1xuICAgICAgICAgICAgICAgIGlmICh0b0RvbWFpbiA9PT0gY29uZmlnLmhvc3RzLmFub255bW91c2RvbWFpbikge1xuICAgICAgICAgICAgICAgICAgICAvLyB3ZSBhcmUgY29ubmVjdGVkIHdpdGggYW5vbnltb3VzIGRvbWFpbiBhbmQgb25seSBub24gYW5vbnltb3VzIHVzZXJzIGNhbiBjcmVhdGUgcm9vbXNcbiAgICAgICAgICAgICAgICAgICAgLy8gd2UgbXVzdCBhdXRob3JpemUgdGhlIHVzZXJcbiAgICAgICAgICAgICAgICAgICAgWE1QUEFjdGl2YXRvci5wcm9tcHRMb2dpbigpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2Fybignb25QcmVzRXJyb3IgJywgcHJlcyk7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5SZXBvcnREaWFsb2cobnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICdPb3BzISBTb21ldGhpbmcgd2VudCB3cm9uZyBhbmQgd2UgY291bGRuYHQgY29ubmVjdCB0byB0aGUgY29uZmVyZW5jZS4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ29uUHJlc0Vycm9yICcsIHByZXMpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLm9wZW5SZXBvcnREaWFsb2cobnVsbCxcbiAgICAgICAgICAgICAgICAgICAgJ09vcHMhIFNvbWV0aGluZyB3ZW50IHdyb25nIGFuZCB3ZSBjb3VsZG5gdCBjb25uZWN0IHRvIHRoZSBjb25mZXJlbmNlLicsXG4gICAgICAgICAgICAgICAgICAgIHByZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIHNlbmRNZXNzYWdlOiBmdW5jdGlvbiAoYm9keSwgbmlja25hbWUpIHtcbiAgICAgICAgICAgIHZhciBtc2cgPSAkbXNnKHt0bzogdGhpcy5yb29tamlkLCB0eXBlOiAnZ3JvdXBjaGF0J30pO1xuICAgICAgICAgICAgbXNnLmMoJ2JvZHknLCBib2R5KS51cCgpO1xuICAgICAgICAgICAgaWYgKG5pY2tuYW1lKSB7XG4gICAgICAgICAgICAgICAgbXNnLmMoJ25pY2snLCB7eG1sbnM6ICdodHRwOi8vamFiYmVyLm9yZy9wcm90b2NvbC9uaWNrJ30pLnQobmlja25hbWUpLnVwKCkudXAoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kKG1zZyk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldFN1YmplY3Q6IGZ1bmN0aW9uIChzdWJqZWN0KSB7XG4gICAgICAgICAgICB2YXIgbXNnID0gJG1zZyh7dG86IHRoaXMucm9vbWppZCwgdHlwZTogJ2dyb3VwY2hhdCd9KTtcbiAgICAgICAgICAgIG1zZy5jKCdzdWJqZWN0Jywgc3ViamVjdCk7XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZChtc2cpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ0b3BpYyBjaGFuZ2VkIHRvIFwiICsgc3ViamVjdCk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uTWVzc2FnZTogZnVuY3Rpb24gKG1zZykge1xuICAgICAgICAgICAgLy8gRklYTUU6IHRoaXMgaXMgYSBoYWNrLiBidXQgamluZ2xlIG9uIG11YyBtYWtlcyBuaWNrY2hhbmdlcyBoYXJkXG4gICAgICAgICAgICB2YXIgZnJvbSA9IG1zZy5nZXRBdHRyaWJ1dGUoJ2Zyb20nKTtcbiAgICAgICAgICAgIHZhciBuaWNrID0gJChtc2cpLmZpbmQoJz5uaWNrW3htbG5zPVwiaHR0cDovL2phYmJlci5vcmcvcHJvdG9jb2wvbmlja1wiXScpLnRleHQoKSB8fCBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChmcm9tKTtcblxuICAgICAgICAgICAgdmFyIHR4dCA9ICQobXNnKS5maW5kKCc+Ym9keScpLnRleHQoKTtcbiAgICAgICAgICAgIHZhciB0eXBlID0gbXNnLmdldEF0dHJpYnV0ZShcInR5cGVcIik7XG4gICAgICAgICAgICBpZiAodHlwZSA9PSBcImVycm9yXCIpIHtcbiAgICAgICAgICAgICAgICBVSUFjdGl2YXRvci5jaGF0QWRkRXJyb3IoJChtc2cpLmZpbmQoJz50ZXh0JykudGV4dCgpLCB0eHQpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc3ViamVjdCA9ICQobXNnKS5maW5kKCc+c3ViamVjdCcpO1xuICAgICAgICAgICAgaWYgKHN1YmplY3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN1YmplY3RUZXh0ID0gc3ViamVjdC50ZXh0KCk7XG4gICAgICAgICAgICAgICAgaWYgKHN1YmplY3RUZXh0IHx8IHN1YmplY3RUZXh0ID09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgVUlBY3RpdmF0b3IuY2hhdFNldFN1YmplY3Qoc3ViamVjdFRleHQpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlN1YmplY3QgaXMgY2hhbmdlZCB0byBcIiArIHN1YmplY3RUZXh0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgaWYgKHR4dCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjaGF0JywgbmljaywgdHh0KTtcblxuICAgICAgICAgICAgICAgIFVJQWN0aXZhdG9yLnVwZGF0ZUNoYXRDb252ZXJzYXRpb24oZnJvbSwgbmljaywgdHh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICBsb2NrUm9vbTogZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgLy9odHRwOi8veG1wcC5vcmcvZXh0ZW5zaW9ucy94ZXAtMDA0NS5odG1sI3Jvb21jb25maWdcbiAgICAgICAgICAgIHZhciBvYiA9IHRoaXM7XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKCRpcSh7dG86IHRoaXMucm9vbWppZCwgdHlwZTogJ2dldCd9KS5jKCdxdWVyeScsIHt4bWxuczogJ2h0dHA6Ly9qYWJiZXIub3JnL3Byb3RvY29sL211YyNvd25lcid9KSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkKHJlcykuZmluZCgnPnF1ZXJ5PnhbeG1sbnM9XCJqYWJiZXI6eDpkYXRhXCJdPmZpZWxkW3Zhcj1cIm11YyNyb29tY29uZmlnX3Jvb21zZWNyZXRcIl0nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmb3Jtc3VibWl0ID0gJGlxKHt0bzogb2Iucm9vbWppZCwgdHlwZTogJ3NldCd9KS5jKCdxdWVyeScsIHt4bWxuczogJ2h0dHA6Ly9qYWJiZXIub3JnL3Byb3RvY29sL211YyNvd25lcid9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1zdWJtaXQuYygneCcsIHt4bWxuczogJ2phYmJlcjp4OmRhdGEnLCB0eXBlOiAnc3VibWl0J30pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybXN1Ym1pdC5jKCdmaWVsZCcsIHsndmFyJzogJ0ZPUk1fVFlQRSd9KS5jKCd2YWx1ZScpLnQoJ2h0dHA6Ly9qYWJiZXIub3JnL3Byb3RvY29sL211YyNyb29tY29uZmlnJykudXAoKS51cCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybXN1Ym1pdC5jKCdmaWVsZCcsIHsndmFyJzogJ211YyNyb29tY29uZmlnX3Jvb21zZWNyZXQnfSkuYygndmFsdWUnKS50KGtleSkudXAoKS51cCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IGlzIG11YyNyb29tY29uZmlnX3Bhc3N3b3JkcHJvdGVjdGVkcm9vbSByZXF1aXJlZD9cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoZm9ybXN1Ym1pdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzZXQgcm9vbSBwYXNzd29yZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ3NldHRpbmcgcGFzc3dvcmQgZmFpbGVkJywgZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIuc2hvd0Vycm9yKCdMb2NrIGZhaWxlZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGxvY2sgY29uZmVyZW5jZS4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdyb29tIHBhc3N3b3JkcyBub3Qgc3VwcG9ydGVkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5zaG93RXJyb3IoJ1dhcm5pbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdSb29tIHBhc3N3b3JkcyBhcmUgY3VycmVudGx5IG5vdCBzdXBwb3J0ZWQuJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ3NldHRpbmcgcGFzc3dvcmQgZmFpbGVkJywgZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIuc2hvd0Vycm9yKCdMb2NrIGZhaWxlZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGxvY2sgY29uZmVyZW5jZS4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9LFxuICAgICAgICBraWNrOiBmdW5jdGlvbiAoamlkKSB7XG4gICAgICAgICAgICB2YXIga2lja0lRID0gJGlxKHt0bzogdGhpcy5yb29tamlkLCB0eXBlOiAnc2V0J30pXG4gICAgICAgICAgICAgICAgLmMoJ3F1ZXJ5Jywge3htbG5zOiAnaHR0cDovL2phYmJlci5vcmcvcHJvdG9jb2wvbXVjI2FkbWluJ30pXG4gICAgICAgICAgICAgICAgLmMoJ2l0ZW0nLCB7bmljazogU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKSwgcm9sZTogJ25vbmUnfSlcbiAgICAgICAgICAgICAgICAuYygncmVhc29uJykudCgnWW91IGhhdmUgYmVlbiBraWNrZWQuJykudXAoKS51cCgpLnVwKCk7XG5cbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoXG4gICAgICAgICAgICAgICAga2lja0lRLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0tpY2sgcGFydGljaXBhbnQgd2l0aCBqaWQ6ICcsIGppZCwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnS2ljayBwYXJ0aWNpcGFudCBlcnJvcjogJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBzZW5kUHJlc2VuY2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBwcmVzID0gJHByZXMoe3RvOiB0aGlzLnByZXNNYXBbJ3RvJ10gfSk7XG4gICAgICAgICAgICBwcmVzLmMoJ3gnLCB7eG1sbnM6IHRoaXMucHJlc01hcFsneG5zJ119KTtcblxuICAgICAgICAgICAgaWYgKHRoaXMucHJlc01hcFsncGFzc3dvcmQnXSkge1xuICAgICAgICAgICAgICAgIHByZXMuYygncGFzc3dvcmQnKS50KHRoaXMucHJlc01hcFsncGFzc3dvcmQnXSkudXAoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcHJlcy51cCgpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5wcmVzTWFwWydicmlkZ2VJc0Rvd24nXSkge1xuICAgICAgICAgICAgICAgIHByZXMuYygnYnJpZGdlSXNEb3duJykudXAoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRoaXMucHJlc01hcFsnZGlzcGxheU5hbWUnXSkge1xuICAgICAgICAgICAgICAgIC8vIFhFUC0wMTcyXG4gICAgICAgICAgICAgICAgcHJlcy5jKCduaWNrJywge3htbG5zOiAnaHR0cDovL2phYmJlci5vcmcvcHJvdG9jb2wvbmljayd9KVxuICAgICAgICAgICAgICAgICAgICAudCh0aGlzLnByZXNNYXBbJ2Rpc3BsYXlOYW1lJ10pLnVwKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnByZXNNYXBbJ2F1ZGlvbnMnXSkge1xuICAgICAgICAgICAgICAgIHByZXMuYygnYXVkaW9tdXRlZCcsIHt4bWxuczogdGhpcy5wcmVzTWFwWydhdWRpb25zJ119KVxuICAgICAgICAgICAgICAgICAgICAudCh0aGlzLnByZXNNYXBbJ2F1ZGlvbXV0ZWQnXSkudXAoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRoaXMucHJlc01hcFsndmlkZW9ucyddKSB7XG4gICAgICAgICAgICAgICAgcHJlcy5jKCd2aWRlb211dGVkJywge3htbG5zOiB0aGlzLnByZXNNYXBbJ3ZpZGVvbnMnXX0pXG4gICAgICAgICAgICAgICAgICAgIC50KHRoaXMucHJlc01hcFsndmlkZW9tdXRlZCddKS51cCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5wcmVzTWFwWydwcmV6aW5zJ10pIHtcbiAgICAgICAgICAgICAgICBwcmVzLmMoJ3ByZXppJyxcbiAgICAgICAgICAgICAgICAgICAge3htbG5zOiB0aGlzLnByZXNNYXBbJ3ByZXppbnMnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICd1cmwnOiB0aGlzLnByZXNNYXBbJ3ByZXppdXJsJ119KVxuICAgICAgICAgICAgICAgICAgICAuYygnY3VycmVudCcpLnQodGhpcy5wcmVzTWFwWydwcmV6aWN1cnJlbnQnXSkudXAoKS51cCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5wcmVzTWFwWydldGhlcnBhZG5zJ10pIHtcbiAgICAgICAgICAgICAgICBwcmVzLmMoJ2V0aGVycGFkJywge3htbG5zOiB0aGlzLnByZXNNYXBbJ2V0aGVycGFkbnMnXX0pXG4gICAgICAgICAgICAgICAgICAgIC50KHRoaXMucHJlc01hcFsnZXRoZXJwYWRuYW1lJ10pLnVwKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnByZXNNYXBbJ21lZGlhbnMnXSkge1xuICAgICAgICAgICAgICAgIHByZXMuYygnbWVkaWEnLCB7eG1sbnM6IHRoaXMucHJlc01hcFsnbWVkaWFucyddfSk7XG4gICAgICAgICAgICAgICAgdmFyIHNvdXJjZU51bWJlciA9IDA7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmtleXModGhpcy5wcmVzTWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5pbmRleE9mKCdzb3VyY2UnKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2VOdW1iZXIrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmIChzb3VyY2VOdW1iZXIgPiAwKVxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8PSBzb3VyY2VOdW1iZXIgLyAzOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZXMuYygnc291cmNlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dHlwZTogdGhpcy5wcmVzTWFwWydzb3VyY2UnICsgaSArICdfdHlwZSddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzc3JjOiB0aGlzLnByZXNNYXBbJ3NvdXJjZScgKyBpICsgJ19zc3JjJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbjogdGhpcy5wcmVzTWFwWydzb3VyY2UnICsgaSArICdfZGlyZWN0aW9uJ11cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8ICdzZW5kcmVjdicgfVxuICAgICAgICAgICAgICAgICAgICAgICAgKS51cCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHByZXMudXAoKTtcbiAgICAgICAgICAgIGNvbm5lY3Rpb24uc2VuZChwcmVzKTtcbiAgICAgICAgfSxcbiAgICAgICAgYWRkRGlzcGxheU5hbWVUb1ByZXNlbmNlOiBmdW5jdGlvbiAoZGlzcGxheU5hbWUpIHtcbiAgICAgICAgICAgIHRoaXMucHJlc01hcFsnZGlzcGxheU5hbWUnXSA9IGRpc3BsYXlOYW1lO1xuICAgICAgICB9LFxuICAgICAgICBhZGRNZWRpYVRvUHJlc2VuY2U6IGZ1bmN0aW9uIChzb3VyY2VOdW1iZXIsIG10eXBlLCBzc3JjcywgZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMucHJlc01hcFsnbWVkaWFucyddKVxuICAgICAgICAgICAgICAgIHRoaXMucHJlc01hcFsnbWVkaWFucyddID0gJ2h0dHA6Ly9lc3Rvcy5kZS9ucy9tanMnO1xuXG4gICAgICAgICAgICB0aGlzLnByZXNNYXBbJ3NvdXJjZScgKyBzb3VyY2VOdW1iZXIgKyAnX3R5cGUnXSA9IG10eXBlO1xuICAgICAgICAgICAgdGhpcy5wcmVzTWFwWydzb3VyY2UnICsgc291cmNlTnVtYmVyICsgJ19zc3JjJ10gPSBzc3JjcztcbiAgICAgICAgICAgIHRoaXMucHJlc01hcFsnc291cmNlJyArIHNvdXJjZU51bWJlciArICdfZGlyZWN0aW9uJ10gPSBkaXJlY3Rpb247XG4gICAgICAgIH0sXG4gICAgICAgIGNsZWFyUHJlc2VuY2VNZWRpYTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgT2JqZWN0LmtleXModGhpcy5wcmVzTWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICBpZiAoa2V5LmluZGV4T2YoJ3NvdXJjZScpICE9IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBzZWxmLnByZXNNYXBba2V5XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgYWRkUHJlemlUb1ByZXNlbmNlOiBmdW5jdGlvbiAodXJsLCBjdXJyZW50U2xpZGUpIHtcbiAgICAgICAgICAgIHRoaXMucHJlc01hcFsncHJlemlucyddID0gJ2h0dHA6Ly9qaXRzaS5vcmcvaml0bWVldC9wcmV6aSc7XG4gICAgICAgICAgICB0aGlzLnByZXNNYXBbJ3ByZXppdXJsJ10gPSB1cmw7XG4gICAgICAgICAgICB0aGlzLnByZXNNYXBbJ3ByZXppY3VycmVudCddID0gY3VycmVudFNsaWRlO1xuICAgICAgICB9LFxuICAgICAgICByZW1vdmVQcmV6aUZyb21QcmVzZW5jZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMucHJlc01hcFsncHJlemlucyddO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMucHJlc01hcFsncHJleml1cmwnXTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnByZXNNYXBbJ3ByZXppY3VycmVudCddO1xuICAgICAgICB9LFxuICAgICAgICBhZGRDdXJyZW50U2xpZGVUb1ByZXNlbmNlOiBmdW5jdGlvbiAoY3VycmVudFNsaWRlKSB7XG4gICAgICAgICAgICB0aGlzLnByZXNNYXBbJ3ByZXppY3VycmVudCddID0gY3VycmVudFNsaWRlO1xuICAgICAgICB9LFxuICAgICAgICBnZXRQcmV6aTogZnVuY3Rpb24gKHJvb21qaWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnByZXppTWFwW3Jvb21qaWRdO1xuICAgICAgICB9LFxuICAgICAgICBhZGRFdGhlcnBhZFRvUHJlc2VuY2U6IGZ1bmN0aW9uIChldGhlcnBhZE5hbWUpIHtcbiAgICAgICAgICAgIHRoaXMucHJlc01hcFsnZXRoZXJwYWRucyddID0gJ2h0dHA6Ly9qaXRzaS5vcmcvaml0bWVldC9ldGhlcnBhZCc7XG4gICAgICAgICAgICB0aGlzLnByZXNNYXBbJ2V0aGVycGFkbmFtZSddID0gZXRoZXJwYWROYW1lO1xuICAgICAgICB9LFxuICAgICAgICBhZGRBdWRpb0luZm9Ub1ByZXNlbmNlOiBmdW5jdGlvbiAoaXNNdXRlZCkge1xuICAgICAgICAgICAgdGhpcy5wcmVzTWFwWydhdWRpb25zJ10gPSAnaHR0cDovL2ppdHNpLm9yZy9qaXRtZWV0L2F1ZGlvJztcbiAgICAgICAgICAgIHRoaXMucHJlc01hcFsnYXVkaW9tdXRlZCddID0gaXNNdXRlZC50b1N0cmluZygpO1xuICAgICAgICB9LFxuICAgICAgICBhZGRWaWRlb0luZm9Ub1ByZXNlbmNlOiBmdW5jdGlvbiAoaXNNdXRlZCkge1xuICAgICAgICAgICAgdGhpcy5wcmVzTWFwWyd2aWRlb25zJ10gPSAnaHR0cDovL2ppdHNpLm9yZy9qaXRtZWV0L3ZpZGVvJztcbiAgICAgICAgICAgIHRoaXMucHJlc01hcFsndmlkZW9tdXRlZCddID0gaXNNdXRlZC50b1N0cmluZygpO1xuICAgICAgICB9LFxuICAgICAgICBmaW5kSmlkRnJvbVJlc291cmNlOiBmdW5jdGlvbiAocmVzb3VyY2VKaWQpIHtcbiAgICAgICAgICAgIHZhciBwZWVySmlkID0gbnVsbDtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKHRoaXMubWVtYmVycykuc29tZShmdW5jdGlvbiAoamlkKSB7XG4gICAgICAgICAgICAgICAgcGVlckppZCA9IGppZDtcbiAgICAgICAgICAgICAgICByZXR1cm4gU3Ryb3BoZS5nZXRSZXNvdXJjZUZyb21KaWQoamlkKSA9PT0gcmVzb3VyY2VKaWQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBwZWVySmlkO1xuICAgICAgICB9LFxuICAgICAgICBhZGRCcmlkZ2VJc0Rvd25Ub1ByZXNlbmNlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnByZXNNYXBbJ2JyaWRnZUlzRG93biddID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuIiwidmFyIFNEUCA9IHJlcXVpcmUoXCIuL3N0cm9waGUuamluZ2xlLnNkcFwiKTtcblxuZnVuY3Rpb24gVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24oaWNlX2NvbmZpZywgY29uc3RyYWludHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIFJUQ1BlZXJjb25uZWN0aW9uID0gbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSA/IG1velJUQ1BlZXJDb25uZWN0aW9uIDogd2Via2l0UlRDUGVlckNvbm5lY3Rpb247XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbiA9IG5ldyBSVENQZWVyY29ubmVjdGlvbihpY2VfY29uZmlnLCBjb25zdHJhaW50cyk7XG4gICAgdGhpcy51cGRhdGVMb2cgPSBbXTtcbiAgICB0aGlzLnN0YXRzID0ge307XG4gICAgdGhpcy5zdGF0c2ludGVydmFsID0gbnVsbDtcbiAgICB0aGlzLm1heHN0YXRzID0gMDsgLy8gbGltaXQgdG8gMzAwIHZhbHVlcywgaS5lLiA1IG1pbnV0ZXM7IHNldCB0byAwIHRvIGRpc2FibGVcblxuICAgIC8qKlxuICAgICAqIEFycmF5IG9mIHNzcmNzIHRoYXQgd2lsbCBiZSBhZGRlZCBvbiBuZXh0IG1vZGlmeVNvdXJjZXMgY2FsbC5cbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgdGhpcy5hZGRzc3JjID0gW107XG4gICAgLyoqXG4gICAgICogQXJyYXkgb2Ygc3NyY3MgdGhhdCB3aWxsIGJlIGFkZGVkIG9uIG5leHQgbW9kaWZ5U291cmNlcyBjYWxsLlxuICAgICAqIEB0eXBlIHtBcnJheX1cbiAgICAgKi9cbiAgICB0aGlzLnJlbW92ZXNzcmMgPSBbXTtcbiAgICAvKipcbiAgICAgKiBQZW5kaW5nIG9wZXJhdGlvbiB0aGF0IHdpbGwgYmUgZG9uZSBkdXJpbmcgbW9kaWZ5U291cmNlcyBjYWxsLlxuICAgICAqIEN1cnJlbnRseSAnbXV0ZScvJ3VubXV0ZScgb3BlcmF0aW9ucyBhcmUgc3VwcG9ydGVkLlxuICAgICAqXG4gICAgICogQHR5cGUge1N0cmluZ31cbiAgICAgKi9cbiAgICB0aGlzLnBlbmRpbmdvcCA9IG51bGw7XG5cbiAgICAvKipcbiAgICAgKiBGbGFnIGluZGljYXRlcyB0aGF0IHBlZXIgY29ubmVjdGlvbiBzdHJlYW0gaGF2ZSBjaGFuZ2VkIGFuZCBtb2RpZnlTb3VyY2VzIHNob3VsZCBwcm9jZWVkLlxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIHRoaXMuc3dpdGNoc3RyZWFtcyA9IGZhbHNlO1xuXG4gICAgLy8gb3ZlcnJpZGUgYXMgZGVzaXJlZFxuICAgIHRoaXMudHJhY2UgPSBmdW5jdGlvbiAod2hhdCwgaW5mbykge1xuICAgICAgICAvL2NvbnNvbGUud2FybignV1RSQUNFJywgd2hhdCwgaW5mbyk7XG4gICAgICAgIHNlbGYudXBkYXRlTG9nLnB1c2goe1xuICAgICAgICAgICAgdGltZTogbmV3IERhdGUoKSxcbiAgICAgICAgICAgIHR5cGU6IHdoYXQsXG4gICAgICAgICAgICB2YWx1ZTogaW5mbyB8fCBcIlwiXG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgdGhpcy5vbmljZWNhbmRpZGF0ZSA9IG51bGw7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5vbmljZWNhbmRpZGF0ZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBzZWxmLnRyYWNlKCdvbmljZWNhbmRpZGF0ZScsIEpTT04uc3RyaW5naWZ5KGV2ZW50LmNhbmRpZGF0ZSwgbnVsbCwgJyAnKSk7XG4gICAgICAgIGlmIChzZWxmLm9uaWNlY2FuZGlkYXRlICE9PSBudWxsKSB7XG4gICAgICAgICAgICBzZWxmLm9uaWNlY2FuZGlkYXRlKGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5vbmFkZHN0cmVhbSA9IG51bGw7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5vbmFkZHN0cmVhbSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBzZWxmLnRyYWNlKCdvbmFkZHN0cmVhbScsIGV2ZW50LnN0cmVhbS5pZCk7XG4gICAgICAgIGlmIChzZWxmLm9uYWRkc3RyZWFtICE9PSBudWxsKSB7XG4gICAgICAgICAgICBzZWxmLm9uYWRkc3RyZWFtKGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5vbnJlbW92ZXN0cmVhbSA9IG51bGw7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5vbnJlbW92ZXN0cmVhbSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBzZWxmLnRyYWNlKCdvbnJlbW92ZXN0cmVhbScsIGV2ZW50LnN0cmVhbS5pZCk7XG4gICAgICAgIGlmIChzZWxmLm9ucmVtb3Zlc3RyZWFtICE9PSBudWxsKSB7XG4gICAgICAgICAgICBzZWxmLm9ucmVtb3Zlc3RyZWFtKGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5vbnNpZ25hbGluZ3N0YXRlY2hhbmdlID0gbnVsbDtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLm9uc2lnbmFsaW5nc3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgc2VsZi50cmFjZSgnb25zaWduYWxpbmdzdGF0ZWNoYW5nZScsIHNlbGYuc2lnbmFsaW5nU3RhdGUpO1xuICAgICAgICBpZiAoc2VsZi5vbnNpZ25hbGluZ3N0YXRlY2hhbmdlICE9PSBudWxsKSB7XG4gICAgICAgICAgICBzZWxmLm9uc2lnbmFsaW5nc3RhdGVjaGFuZ2UoZXZlbnQpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLm9uaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlID0gbnVsbDtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLm9uaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHNlbGYudHJhY2UoJ29uaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlJywgc2VsZi5pY2VDb25uZWN0aW9uU3RhdGUpO1xuICAgICAgICBpZiAoc2VsZi5vbmljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgc2VsZi5vbmljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZShldmVudCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMub25uZWdvdGlhdGlvbm5lZWRlZCA9IG51bGw7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5vbm5lZ290aWF0aW9ubmVlZGVkID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHNlbGYudHJhY2UoJ29ubmVnb3RpYXRpb25uZWVkZWQnKTtcbiAgICAgICAgaWYgKHNlbGYub25uZWdvdGlhdGlvbm5lZWRlZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgc2VsZi5vbm5lZ290aWF0aW9ubmVlZGVkKGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgc2VsZi5vbmRhdGFjaGFubmVsID0gbnVsbDtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLm9uZGF0YWNoYW5uZWwgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgc2VsZi50cmFjZSgnb25kYXRhY2hhbm5lbCcsIGV2ZW50KTtcbiAgICAgICAgaWYgKHNlbGYub25kYXRhY2hhbm5lbCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgc2VsZi5vbmRhdGFjaGFubmVsKGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgaWYgKCFuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhICYmIHRoaXMubWF4c3RhdHMpIHtcbiAgICAgICAgdGhpcy5zdGF0c2ludGVydmFsID0gd2luZG93LnNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgc2VsZi5wZWVyY29ubmVjdGlvbi5nZXRTdGF0cyhmdW5jdGlvbihzdGF0cykge1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHRzID0gc3RhdHMucmVzdWx0KCk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXN1bHRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cocmVzdWx0c1tpXS50eXBlLCByZXN1bHRzW2ldLmlkLCByZXN1bHRzW2ldLm5hbWVzKCkpXG4gICAgICAgICAgICAgICAgICAgIHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzW2ldLm5hbWVzKCkuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkID0gcmVzdWx0c1tpXS5pZCArICctJyArIG5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXNlbGYuc3RhdHNbaWRdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5zdGF0c1tpZF0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0VGltZTogbm93LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmRUaW1lOiBub3csXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlczogW10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVzOiBbXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnN0YXRzW2lkXS52YWx1ZXMucHVzaChyZXN1bHRzW2ldLnN0YXQobmFtZSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5zdGF0c1tpZF0udGltZXMucHVzaChub3cuZ2V0VGltZSgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLnN0YXRzW2lkXS52YWx1ZXMubGVuZ3RoID4gc2VsZi5tYXhzdGF0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuc3RhdHNbaWRdLnZhbHVlcy5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuc3RhdHNbaWRdLnRpbWVzLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnN0YXRzW2lkXS5lbmRUaW1lID0gbm93O1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9LCAxMDAwKTtcbiAgICB9XG59O1xuXG5kdW1wU0RQID0gZnVuY3Rpb24oZGVzY3JpcHRpb24pIHtcbiAgICByZXR1cm4gJ3R5cGU6ICcgKyBkZXNjcmlwdGlvbi50eXBlICsgJ1xcclxcbicgKyBkZXNjcmlwdGlvbi5zZHA7XG59XG5cbmlmIChUcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuX19kZWZpbmVHZXR0ZXJfXyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLl9fZGVmaW5lR2V0dGVyX18oJ3NpZ25hbGluZ1N0YXRlJywgZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnBlZXJjb25uZWN0aW9uLnNpZ25hbGluZ1N0YXRlOyB9KTtcbiAgICBUcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuX19kZWZpbmVHZXR0ZXJfXygnaWNlQ29ubmVjdGlvblN0YXRlJywgZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnBlZXJjb25uZWN0aW9uLmljZUNvbm5lY3Rpb25TdGF0ZTsgfSk7XG4gICAgVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLl9fZGVmaW5lR2V0dGVyX18oJ2xvY2FsRGVzY3JpcHRpb24nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHNpbXVsY2FzdCA9IG5ldyBTaW11bGNhc3QoKTtcbiAgICAgICAgdmFyIHB1YmxpY0xvY2FsRGVzY3JpcHRpb24gPSBzaW11bGNhc3QucmV2ZXJzZVRyYW5zZm9ybUxvY2FsRGVzY3JpcHRpb24odGhpcy5wZWVyY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uKTtcbiAgICAgICAgcmV0dXJuIHB1YmxpY0xvY2FsRGVzY3JpcHRpb247XG4gICAgfSk7XG4gICAgVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLl9fZGVmaW5lR2V0dGVyX18oJ3JlbW90ZURlc2NyaXB0aW9uJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzaW11bGNhc3QgPSBuZXcgU2ltdWxjYXN0KCk7XG4gICAgICAgIHZhciBwdWJsaWNSZW1vdGVEZXNjcmlwdGlvbiA9IHNpbXVsY2FzdC5yZXZlcnNlVHJhbnNmb3JtUmVtb3RlRGVzY3JpcHRpb24odGhpcy5wZWVyY29ubmVjdGlvbi5yZW1vdGVEZXNjcmlwdGlvbik7XG4gICAgICAgIHJldHVybiBwdWJsaWNSZW1vdGVEZXNjcmlwdGlvbjtcbiAgICB9KTtcbn1cblxuVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFN0cmVhbSA9IGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICB0aGlzLnRyYWNlKCdhZGRTdHJlYW0nLCBzdHJlYW0uaWQpO1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uYWRkU3RyZWFtKHN0cmVhbSk7XG59O1xuXG5UcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUucmVtb3ZlU3RyZWFtID0gZnVuY3Rpb24gKHN0cmVhbSkge1xuICAgIHRoaXMudHJhY2UoJ3JlbW92ZVN0cmVhbScsIHN0cmVhbS5pZCk7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5yZW1vdmVTdHJlYW0oc3RyZWFtKTtcbn07XG5cblRyYWNlYWJsZVBlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5jcmVhdGVEYXRhQ2hhbm5lbCA9IGZ1bmN0aW9uIChsYWJlbCwgb3B0cykge1xuICAgIHRoaXMudHJhY2UoJ2NyZWF0ZURhdGFDaGFubmVsJywgbGFiZWwsIG9wdHMpO1xuICAgIHJldHVybiB0aGlzLnBlZXJjb25uZWN0aW9uLmNyZWF0ZURhdGFDaGFubmVsKGxhYmVsLCBvcHRzKTtcbn07XG5cblRyYWNlYWJsZVBlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5zZXRMb2NhbERlc2NyaXB0aW9uID0gZnVuY3Rpb24gKGRlc2NyaXB0aW9uLCBzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgc2ltdWxjYXN0ID0gbmV3IFNpbXVsY2FzdCgpO1xuICAgIGRlc2NyaXB0aW9uID0gc2ltdWxjYXN0LnRyYW5zZm9ybUxvY2FsRGVzY3JpcHRpb24oZGVzY3JpcHRpb24pO1xuICAgIHRoaXMudHJhY2UoJ3NldExvY2FsRGVzY3JpcHRpb24nLCBkdW1wU0RQKGRlc2NyaXB0aW9uKSk7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5zZXRMb2NhbERlc2NyaXB0aW9uKGRlc2NyaXB0aW9uLFxuICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLnRyYWNlKCdzZXRMb2NhbERlc2NyaXB0aW9uT25TdWNjZXNzJyk7XG4gICAgICAgICAgICBzdWNjZXNzQ2FsbGJhY2soKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgc2VsZi50cmFjZSgnc2V0TG9jYWxEZXNjcmlwdGlvbk9uRmFpbHVyZScsIGVycik7XG4gICAgICAgICAgICBmYWlsdXJlQ2FsbGJhY2soZXJyKTtcbiAgICAgICAgfVxuICAgICk7XG4gICAgLypcbiAgICAgaWYgKHRoaXMuc3RhdHNpbnRlcnZhbCA9PT0gbnVsbCAmJiB0aGlzLm1heHN0YXRzID4gMCkge1xuICAgICAvLyBzdGFydCBnYXRoZXJpbmcgc3RhdHNcbiAgICAgfVxuICAgICAqL1xufTtcblxuVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnNldFJlbW90ZURlc2NyaXB0aW9uID0gZnVuY3Rpb24gKGRlc2NyaXB0aW9uLCBzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgc2ltdWxjYXN0ID0gbmV3IFNpbXVsY2FzdCgpO1xuICAgIGRlc2NyaXB0aW9uID0gc2ltdWxjYXN0LnRyYW5zZm9ybVJlbW90ZURlc2NyaXB0aW9uKGRlc2NyaXB0aW9uKTtcbiAgICB0aGlzLnRyYWNlKCdzZXRSZW1vdGVEZXNjcmlwdGlvbicsIGR1bXBTRFAoZGVzY3JpcHRpb24pKTtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLnNldFJlbW90ZURlc2NyaXB0aW9uKGRlc2NyaXB0aW9uLFxuICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLnRyYWNlKCdzZXRSZW1vdGVEZXNjcmlwdGlvbk9uU3VjY2VzcycpO1xuICAgICAgICAgICAgc3VjY2Vzc0NhbGxiYWNrKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIHNlbGYudHJhY2UoJ3NldFJlbW90ZURlc2NyaXB0aW9uT25GYWlsdXJlJywgZXJyKTtcbiAgICAgICAgICAgIGZhaWx1cmVDYWxsYmFjayhlcnIpO1xuICAgICAgICB9XG4gICAgKTtcbiAgICAvKlxuICAgICBpZiAodGhpcy5zdGF0c2ludGVydmFsID09PSBudWxsICYmIHRoaXMubWF4c3RhdHMgPiAwKSB7XG4gICAgIC8vIHN0YXJ0IGdhdGhlcmluZyBzdGF0c1xuICAgICB9XG4gICAgICovXG59O1xuXG5UcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuaGFyZE11dGVWaWRlbyA9IGZ1bmN0aW9uIChtdXRlZCkge1xuICAgIHRoaXMucGVuZGluZ29wID0gbXV0ZWQgPyAnbXV0ZScgOiAndW5tdXRlJztcbn07XG5cblRyYWNlYWJsZVBlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5lbnF1ZXVlQWRkU3NyYyA9IGZ1bmN0aW9uKGNoYW5uZWwsIHNzcmNMaW5lcykge1xuICAgIGlmICghdGhpcy5hZGRzc3JjW2NoYW5uZWxdKSB7XG4gICAgICAgIHRoaXMuYWRkc3NyY1tjaGFubmVsXSA9ICcnO1xuICAgIH1cbiAgICB0aGlzLmFkZHNzcmNbY2hhbm5lbF0gKz0gc3NyY0xpbmVzO1xufVxuXG5UcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkU291cmNlID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICBjb25zb2xlLmxvZygnYWRkc3NyYycsIG5ldyBEYXRlKCkuZ2V0VGltZSgpKTtcbiAgICBjb25zb2xlLmxvZygnaWNlJywgdGhpcy5pY2VDb25uZWN0aW9uU3RhdGUpO1xuICAgIHZhciBzZHAgPSBuZXcgU0RQKHRoaXMucmVtb3RlRGVzY3JpcHRpb24uc2RwKTtcbiAgICB2YXIgbXlTZHAgPSBuZXcgU0RQKHRoaXMucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbi5zZHApO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICQoZWxlbSkuZWFjaChmdW5jdGlvbiAoaWR4LCBjb250ZW50KSB7XG4gICAgICAgIHZhciBuYW1lID0gJChjb250ZW50KS5hdHRyKCduYW1lJyk7XG4gICAgICAgIHZhciBsaW5lcyA9ICcnO1xuICAgICAgICB0bXAgPSAkKGNvbnRlbnQpLmZpbmQoJ3NzcmMtZ3JvdXBbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6c3NtYTowXCJdJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZW1hbnRpY3MgPSB0aGlzLmdldEF0dHJpYnV0ZSgnc2VtYW50aWNzJyk7XG4gICAgICAgICAgICB2YXIgc3NyY3MgPSAkKHRoaXMpLmZpbmQoJz5zb3VyY2UnKS5tYXAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnc3NyYycpO1xuICAgICAgICAgICAgfSkuZ2V0KCk7XG5cbiAgICAgICAgICAgIGlmIChzc3Jjcy5sZW5ndGggIT0gMCkge1xuICAgICAgICAgICAgICAgIGxpbmVzICs9ICdhPXNzcmMtZ3JvdXA6JyArIHNlbWFudGljcyArICcgJyArIHNzcmNzLmpvaW4oJyAnKSArICdcXHJcXG4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdG1wID0gJChjb250ZW50KS5maW5kKCdzb3VyY2VbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6c3NtYTowXCJdJyk7IC8vIGNhbiBoYW5kbGUgYm90aCA+c291cmNlIGFuZCA+ZGVzY3JpcHRpb24+c291cmNlXG4gICAgICAgIHRtcC5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBzc3JjID0gJCh0aGlzKS5hdHRyKCdzc3JjJyk7XG4gICAgICAgICAgICBpZihteVNkcC5jb250YWluc1NTUkMoc3NyYykpe1xuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFRoaXMgaGFwcGVucyB3aGVuIG11bHRpcGxlIHBhcnRpY2lwYW50cyBjaGFuZ2UgdGhlaXIgc3RyZWFtcyBhdCB0aGUgc2FtZSB0aW1lIGFuZFxuICAgICAgICAgICAgICAgICAqIENvbGlicmlGb2N1cy5tb2RpZnlTb3VyY2VzIGhhdmUgdG8gd2FpdCBmb3Igc3RhYmxlIHN0YXRlLiBJbiB0aGUgbWVhbnRpbWUgbXVsdGlwbGVcbiAgICAgICAgICAgICAgICAgKiBhZGRzc3JjIGFyZSBzY2hlZHVsZWQgZm9yIHVwZGF0ZSBJUS4gU2VlXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiR290IGFkZCBzdHJlYW0gcmVxdWVzdCBmb3IgbXkgb3duIHNzcmM6IFwiK3NzcmMpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQodGhpcykuZmluZCgnPnBhcmFtZXRlcicpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGxpbmVzICs9ICdhPXNzcmM6JyArIHNzcmMgKyAnICcgKyAkKHRoaXMpLmF0dHIoJ25hbWUnKTtcbiAgICAgICAgICAgICAgICBpZiAoJCh0aGlzKS5hdHRyKCd2YWx1ZScpICYmICQodGhpcykuYXR0cigndmFsdWUnKS5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgIGxpbmVzICs9ICc6JyArICQodGhpcykuYXR0cigndmFsdWUnKTtcbiAgICAgICAgICAgICAgICBsaW5lcyArPSAnXFxyXFxuJztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgc2RwLm1lZGlhLmZvckVhY2goZnVuY3Rpb24obWVkaWEsIGlkeCkge1xuICAgICAgICAgICAgaWYgKCFTRFBVdGlsLmZpbmRfbGluZShtZWRpYSwgJ2E9bWlkOicgKyBuYW1lKSlcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBzZHAubWVkaWFbaWR4XSArPSBsaW5lcztcbiAgICAgICAgICAgIHNlbGYuZW5xdWV1ZUFkZFNzcmMoaWR4LCBsaW5lcyk7XG4gICAgICAgIH0pO1xuICAgICAgICBzZHAucmF3ID0gc2RwLnNlc3Npb24gKyBzZHAubWVkaWEuam9pbignJyk7XG4gICAgfSk7XG59O1xuXG5UcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZW5xdWV1ZVJlbW92ZVNzcmMgPSBmdW5jdGlvbihjaGFubmVsLCBzc3JjTGluZXMpIHtcbiAgICBpZiAoIXRoaXMucmVtb3Zlc3NyY1tjaGFubmVsXSl7XG4gICAgICAgIHRoaXMucmVtb3Zlc3NyY1tjaGFubmVsXSA9ICcnO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZXNzcmNbY2hhbm5lbF0gKz0gc3NyY0xpbmVzO1xufVxuXG5UcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUucmVtb3ZlU291cmNlID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICBjb25zb2xlLmxvZygncmVtb3Zlc3NyYycsIG5ldyBEYXRlKCkuZ2V0VGltZSgpKTtcbiAgICBjb25zb2xlLmxvZygnaWNlJywgdGhpcy5pY2VDb25uZWN0aW9uU3RhdGUpO1xuICAgIHZhciBzZHAgPSBuZXcgU0RQKHRoaXMucmVtb3RlRGVzY3JpcHRpb24uc2RwKTtcbiAgICB2YXIgbXlTZHAgPSBuZXcgU0RQKHRoaXMucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbi5zZHApO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICQoZWxlbSkuZWFjaChmdW5jdGlvbiAoaWR4LCBjb250ZW50KSB7XG4gICAgICAgIHZhciBuYW1lID0gJChjb250ZW50KS5hdHRyKCduYW1lJyk7XG4gICAgICAgIHZhciBsaW5lcyA9ICcnO1xuICAgICAgICB0bXAgPSAkKGNvbnRlbnQpLmZpbmQoJ3NzcmMtZ3JvdXBbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6c3NtYTowXCJdJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzZW1hbnRpY3MgPSB0aGlzLmdldEF0dHJpYnV0ZSgnc2VtYW50aWNzJyk7XG4gICAgICAgICAgICB2YXIgc3NyY3MgPSAkKHRoaXMpLmZpbmQoJz5zb3VyY2UnKS5tYXAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnc3NyYycpO1xuICAgICAgICAgICAgfSkuZ2V0KCk7XG5cbiAgICAgICAgICAgIGlmIChzc3Jjcy5sZW5ndGggIT0gMCkge1xuICAgICAgICAgICAgICAgIGxpbmVzICs9ICdhPXNzcmMtZ3JvdXA6JyArIHNlbWFudGljcyArICcgJyArIHNzcmNzLmpvaW4oJyAnKSArICdcXHJcXG4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdG1wID0gJChjb250ZW50KS5maW5kKCdzb3VyY2VbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6c3NtYTowXCJdJyk7IC8vIGNhbiBoYW5kbGUgYm90aCA+c291cmNlIGFuZCA+ZGVzY3JpcHRpb24+c291cmNlXG4gICAgICAgIHRtcC5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBzc3JjID0gJCh0aGlzKS5hdHRyKCdzc3JjJyk7XG4gICAgICAgICAgICAvLyBUaGlzIHNob3VsZCBuZXZlciBoYXBwZW4sIGJ1dCBjYW4gYmUgdXNlZnVsIGZvciBidWcgZGV0ZWN0aW9uXG4gICAgICAgICAgICBpZihteVNkcC5jb250YWluc1NTUkMoc3NyYykpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJHb3QgcmVtb3ZlIHN0cmVhbSByZXF1ZXN0IGZvciBteSBvd24gc3NyYzogXCIrc3NyYyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJCh0aGlzKS5maW5kKCc+cGFyYW1ldGVyJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbGluZXMgKz0gJ2E9c3NyYzonICsgc3NyYyArICcgJyArICQodGhpcykuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgICAgIGlmICgkKHRoaXMpLmF0dHIoJ3ZhbHVlJykgJiYgJCh0aGlzKS5hdHRyKCd2YWx1ZScpLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgbGluZXMgKz0gJzonICsgJCh0aGlzKS5hdHRyKCd2YWx1ZScpO1xuICAgICAgICAgICAgICAgIGxpbmVzICs9ICdcXHJcXG4nO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBzZHAubWVkaWEuZm9yRWFjaChmdW5jdGlvbihtZWRpYSwgaWR4KSB7XG4gICAgICAgICAgICBpZiAoIVNEUFV0aWwuZmluZF9saW5lKG1lZGlhLCAnYT1taWQ6JyArIG5hbWUpKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIHNkcC5tZWRpYVtpZHhdICs9IGxpbmVzO1xuICAgICAgICAgICAgc2VsZi5lbnF1ZXVlUmVtb3ZlU3NyYyhpZHgsIGxpbmVzKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHNkcC5yYXcgPSBzZHAuc2Vzc2lvbiArIHNkcC5tZWRpYS5qb2luKCcnKTtcbiAgICB9KTtcbn07XG5cblRyYWNlYWJsZVBlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5tb2RpZnlTb3VyY2VzID0gZnVuY3Rpb24oc3VjY2Vzc0NhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICh0aGlzLnNpZ25hbGluZ1N0YXRlID09ICdjbG9zZWQnKSByZXR1cm47XG4gICAgaWYgKCEodGhpcy5hZGRzc3JjLmxlbmd0aCB8fCB0aGlzLnJlbW92ZXNzcmMubGVuZ3RoIHx8IHRoaXMucGVuZGluZ29wICE9PSBudWxsIHx8IHRoaXMuc3dpdGNoc3RyZWFtcykpe1xuICAgICAgICAvLyBUaGVyZSBpcyBub3RoaW5nIHRvIGRvIHNpbmNlIHNjaGVkdWxlZCBqb2IgbWlnaHQgaGF2ZSBiZWVuIGV4ZWN1dGVkIGJ5IGFub3RoZXIgc3VjY2VlZGluZyBjYWxsXG4gICAgICAgIGlmKHN1Y2Nlc3NDYWxsYmFjayl7XG4gICAgICAgICAgICBzdWNjZXNzQ2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gRklYTUU6IHRoaXMgaXMgYSBiaWcgaGFja1xuICAgIC8vIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3Avd2VicnRjL2lzc3Vlcy9kZXRhaWw/aWQ9MjY4OFxuICAgIGlmICghKHRoaXMuc2lnbmFsaW5nU3RhdGUgPT0gJ3N0YWJsZScgJiYgdGhpcy5pY2VDb25uZWN0aW9uU3RhdGUgPT0gJ2Nvbm5lY3RlZCcpKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignbW9kaWZ5U291cmNlcyBub3QgeWV0JywgdGhpcy5zaWduYWxpbmdTdGF0ZSwgdGhpcy5pY2VDb25uZWN0aW9uU3RhdGUpO1xuICAgICAgICB0aGlzLndhaXQgPSB0cnVlO1xuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHsgc2VsZi5tb2RpZnlTb3VyY2VzKHN1Y2Nlc3NDYWxsYmFjayk7IH0sIDI1MCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHRoaXMud2FpdCkge1xuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHsgc2VsZi5tb2RpZnlTb3VyY2VzKHN1Y2Nlc3NDYWxsYmFjayk7IH0sIDI1MDApO1xuICAgICAgICB0aGlzLndhaXQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFJlc2V0IHN3aXRjaCBzdHJlYW1zIGZsYWdcbiAgICB0aGlzLnN3aXRjaHN0cmVhbXMgPSBmYWxzZTtcblxuICAgIHZhciBzZHAgPSBuZXcgU0RQKHRoaXMucmVtb3RlRGVzY3JpcHRpb24uc2RwKTtcblxuICAgIC8vIGFkZCBzb3VyY2VzXG4gICAgdGhpcy5hZGRzc3JjLmZvckVhY2goZnVuY3Rpb24obGluZXMsIGlkeCkge1xuICAgICAgICBzZHAubWVkaWFbaWR4XSArPSBsaW5lcztcbiAgICB9KTtcbiAgICB0aGlzLmFkZHNzcmMgPSBbXTtcblxuICAgIC8vIHJlbW92ZSBzb3VyY2VzXG4gICAgdGhpcy5yZW1vdmVzc3JjLmZvckVhY2goZnVuY3Rpb24obGluZXMsIGlkeCkge1xuICAgICAgICBsaW5lcyA9IGxpbmVzLnNwbGl0KCdcXHJcXG4nKTtcbiAgICAgICAgbGluZXMucG9wKCk7IC8vIHJlbW92ZSBlbXB0eSBsYXN0IGVsZW1lbnQ7XG4gICAgICAgIGxpbmVzLmZvckVhY2goZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgc2RwLm1lZGlhW2lkeF0gPSBzZHAubWVkaWFbaWR4XS5yZXBsYWNlKGxpbmUgKyAnXFxyXFxuJywgJycpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB0aGlzLnJlbW92ZXNzcmMgPSBbXTtcblxuICAgIHNkcC5yYXcgPSBzZHAuc2Vzc2lvbiArIHNkcC5tZWRpYS5qb2luKCcnKTtcbiAgICB0aGlzLnNldFJlbW90ZURlc2NyaXB0aW9uKG5ldyBSVENTZXNzaW9uRGVzY3JpcHRpb24oe3R5cGU6ICdvZmZlcicsIHNkcDogc2RwLnJhd30pLFxuICAgICAgICBmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgaWYoc2VsZi5zaWduYWxpbmdTdGF0ZSA9PSAnY2xvc2VkJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJjcmVhdGVBbnN3ZXIgYXR0ZW1wdCBvbiBjbG9zZWQgc3RhdGVcIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzZWxmLmNyZWF0ZUFuc3dlcihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihtb2RpZmllZEFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBjaGFuZ2UgdmlkZW8gZGlyZWN0aW9uLCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL2ppdHNpL2ppdG1lZXQvaXNzdWVzLzQxXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLnBlbmRpbmdvcCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNkcCA9IG5ldyBTRFAobW9kaWZpZWRBbnN3ZXIuc2RwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZHAubWVkaWEubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaChzZWxmLnBlbmRpbmdvcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdtdXRlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNkcC5tZWRpYVsxXSA9IHNkcC5tZWRpYVsxXS5yZXBsYWNlKCdhPXNlbmRyZWN2JywgJ2E9cmVjdm9ubHknKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICd1bm11dGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2RwLm1lZGlhWzFdID0gc2RwLm1lZGlhWzFdLnJlcGxhY2UoJ2E9cmVjdm9ubHknLCAnYT1zZW5kcmVjdicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNkcC5yYXcgPSBzZHAuc2Vzc2lvbiArIHNkcC5tZWRpYS5qb2luKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2RpZmllZEFuc3dlci5zZHAgPSBzZHAucmF3O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5wZW5kaW5nb3AgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IHB1c2hpbmcgZG93biBhbiBhbnN3ZXIgd2hpbGUgaWNlIGNvbm5lY3Rpb24gc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgLy8gaXMgc3RpbGwgY2hlY2tpbmcgaXMgYmFkLi4uXG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coc2VsZi5wZWVyY29ubmVjdGlvbi5pY2VDb25uZWN0aW9uU3RhdGUpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIHRyeWluZyB0byB3b3JrIGFyb3VuZCBhbm90aGVyIGNocm9tZSBidWdcbiAgICAgICAgICAgICAgICAgICAgLy9tb2RpZmllZEFuc3dlci5zZHAgPSBtb2RpZmllZEFuc3dlci5zZHAucmVwbGFjZSgvYT1zZXR1cDphY3RpdmUvZywgJ2E9c2V0dXA6YWN0cGFzcycpO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnNldExvY2FsRGVzY3JpcHRpb24obW9kaWZpZWRBbnN3ZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdtb2RpZmllZCBzZXRMb2NhbERlc2NyaXB0aW9uIG9rJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoc3VjY2Vzc0NhbGxiYWNrKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0NhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignbW9kaWZpZWQgc2V0TG9jYWxEZXNjcmlwdGlvbiBmYWlsZWQnLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdtb2RpZmllZCBhbnN3ZXIgZmFpbGVkJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdtb2RpZnkgZmFpbGVkJywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgKTtcbn07XG5cblRyYWNlYWJsZVBlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnRyYWNlKCdzdG9wJyk7XG4gICAgaWYgKHRoaXMuc3RhdHNpbnRlcnZhbCAhPT0gbnVsbCkge1xuICAgICAgICB3aW5kb3cuY2xlYXJJbnRlcnZhbCh0aGlzLnN0YXRzaW50ZXJ2YWwpO1xuICAgICAgICB0aGlzLnN0YXRzaW50ZXJ2YWwgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLmNsb3NlKCk7XG59O1xuXG5UcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuY3JlYXRlT2ZmZXIgPSBmdW5jdGlvbiAoc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2ssIGNvbnN0cmFpbnRzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMudHJhY2UoJ2NyZWF0ZU9mZmVyJywgSlNPTi5zdHJpbmdpZnkoY29uc3RyYWludHMsIG51bGwsICcgJykpO1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uY3JlYXRlT2ZmZXIoXG4gICAgICAgIGZ1bmN0aW9uIChvZmZlcikge1xuICAgICAgICAgICAgc2VsZi50cmFjZSgnY3JlYXRlT2ZmZXJPblN1Y2Nlc3MnLCBkdW1wU0RQKG9mZmVyKSk7XG4gICAgICAgICAgICBzdWNjZXNzQ2FsbGJhY2sob2ZmZXIpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgIHNlbGYudHJhY2UoJ2NyZWF0ZU9mZmVyT25GYWlsdXJlJywgZXJyKTtcbiAgICAgICAgICAgIGZhaWx1cmVDYWxsYmFjayhlcnIpO1xuICAgICAgICB9LFxuICAgICAgICBjb25zdHJhaW50c1xuICAgICk7XG59O1xuXG5UcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuY3JlYXRlQW5zd2VyID0gZnVuY3Rpb24gKHN1Y2Nlc3NDYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrLCBjb25zdHJhaW50cykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLnRyYWNlKCdjcmVhdGVBbnN3ZXInLCBKU09OLnN0cmluZ2lmeShjb25zdHJhaW50cywgbnVsbCwgJyAnKSk7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5jcmVhdGVBbnN3ZXIoXG4gICAgICAgIGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgICAgICAgIHZhciBzaW11bGNhc3QgPSBuZXcgU2ltdWxjYXN0KCk7XG4gICAgICAgICAgICBhbnN3ZXIgPSBzaW11bGNhc3QudHJhbnNmb3JtQW5zd2VyKGFuc3dlcik7XG4gICAgICAgICAgICBzZWxmLnRyYWNlKCdjcmVhdGVBbnN3ZXJPblN1Y2Nlc3MnLCBkdW1wU0RQKGFuc3dlcikpO1xuICAgICAgICAgICAgc3VjY2Vzc0NhbGxiYWNrKGFuc3dlcik7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgc2VsZi50cmFjZSgnY3JlYXRlQW5zd2VyT25GYWlsdXJlJywgZXJyKTtcbiAgICAgICAgICAgIGZhaWx1cmVDYWxsYmFjayhlcnIpO1xuICAgICAgICB9LFxuICAgICAgICBjb25zdHJhaW50c1xuICAgICk7XG59O1xuXG5UcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkSWNlQ2FuZGlkYXRlID0gZnVuY3Rpb24gKGNhbmRpZGF0ZSwgc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy50cmFjZSgnYWRkSWNlQ2FuZGlkYXRlJywgSlNPTi5zdHJpbmdpZnkoY2FuZGlkYXRlLCBudWxsLCAnICcpKTtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLmFkZEljZUNhbmRpZGF0ZShjYW5kaWRhdGUpO1xuICAgIC8qIG1heWJlIGxhdGVyXG4gICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uYWRkSWNlQ2FuZGlkYXRlKGNhbmRpZGF0ZSxcbiAgICAgZnVuY3Rpb24gKCkge1xuICAgICBzZWxmLnRyYWNlKCdhZGRJY2VDYW5kaWRhdGVPblN1Y2Nlc3MnKTtcbiAgICAgc3VjY2Vzc0NhbGxiYWNrKCk7XG4gICAgIH0sXG4gICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgc2VsZi50cmFjZSgnYWRkSWNlQ2FuZGlkYXRlT25GYWlsdXJlJywgZXJyKTtcbiAgICAgZmFpbHVyZUNhbGxiYWNrKGVycik7XG4gICAgIH1cbiAgICAgKTtcbiAgICAgKi9cbn07XG5cblRyYWNlYWJsZVBlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRTdGF0cyA9IGZ1bmN0aW9uKGNhbGxiYWNrLCBlcnJiYWNrKSB7XG4gICAgaWYgKG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEpIHtcbiAgICAgICAgLy8gaWdub3JlIGZvciBub3cuLi5cbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnBlZXJjb25uZWN0aW9uLmdldFN0YXRzKGNhbGxiYWNrKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRyYWNlYWJsZVBlZXJDb25uZWN0aW9uOyIsIi8qIGpzaGludCAtVzExNyAqL1xuXG52YXIgSmluZ2xlU2Vzc2lvbiA9IHJlcXVpcmUoXCIuL3N0cm9waGUuamluZ2xlLnNlc3Npb25cIik7XG52YXIgWE1QUEV2ZW50cyA9IHJlcXVpcmUoXCIuLi9zZXJ2aWNlL3htcHAvWE1QUEV2ZW50c1wiKTtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZXZlbnRFbWl0dGVyKSB7XG4gICAgU3Ryb3BoZS5hZGRDb25uZWN0aW9uUGx1Z2luKCdqaW5nbGUnLCB7XG4gICAgICAgIGNvbm5lY3Rpb246IG51bGwsXG4gICAgICAgIHNlc3Npb25zOiB7fSxcbiAgICAgICAgamlkMnNlc3Npb246IHt9LFxuICAgICAgICBpY2VfY29uZmlnOiB7aWNlU2VydmVyczogW119LFxuICAgICAgICBwY19jb25zdHJhaW50czoge30sXG4gICAgICAgIG1lZGlhX2NvbnN0cmFpbnRzOiB7XG4gICAgICAgICAgICBtYW5kYXRvcnk6IHtcbiAgICAgICAgICAgICAgICAnT2ZmZXJUb1JlY2VpdmVBdWRpbyc6IHRydWUsXG4gICAgICAgICAgICAgICAgJ09mZmVyVG9SZWNlaXZlVmlkZW8nOiB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBNb3pEb250T2ZmZXJEYXRhQ2hhbm5lbDogdHJ1ZSB3aGVuIHRoaXMgaXMgZmlyZWZveFxuICAgICAgICB9LFxuICAgICAgICBsb2NhbEF1ZGlvOiBudWxsLFxuICAgICAgICBsb2NhbFZpZGVvOiBudWxsLFxuXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uIChjb25uKSB7XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24gPSBjb25uO1xuICAgICAgICAgICAgaWYgKHRoaXMuY29ubmVjdGlvbi5kaXNjbykge1xuICAgICAgICAgICAgICAgIC8vIGh0dHA6Ly94bXBwLm9yZy9leHRlbnNpb25zL3hlcC0wMTY3Lmh0bWwjc3VwcG9ydFxuICAgICAgICAgICAgICAgIC8vIGh0dHA6Ly94bXBwLm9yZy9leHRlbnNpb25zL3hlcC0wMTc2Lmh0bWwjc3VwcG9ydFxuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5kaXNjby5hZGRGZWF0dXJlKCd1cm46eG1wcDpqaW5nbGU6MScpO1xuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5kaXNjby5hZGRGZWF0dXJlKCd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6MScpO1xuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5kaXNjby5hZGRGZWF0dXJlKCd1cm46eG1wcDpqaW5nbGU6dHJhbnNwb3J0czppY2UtdWRwOjEnKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uZGlzY28uYWRkRmVhdHVyZSgndXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOmF1ZGlvJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLmRpc2NvLmFkZEZlYXR1cmUoJ3Vybjp4bXBwOmppbmdsZTphcHBzOnJ0cDp2aWRlbycpO1xuXG5cbiAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIGRlYWx0IHdpdGggYnkgU0RQIE8vQSBzbyB3ZSBkb24ndCBuZWVkIHRvIGFubm91Y2UgdGhpc1xuICAgICAgICAgICAgICAgIC8vdGhpcy5jb25uZWN0aW9uLmRpc2NvLmFkZEZlYXR1cmUoJ3Vybjp4bXBwOmppbmdsZTphcHBzOnJ0cDpydGNwLWZiOjAnKTsgLy8gWEVQLTAyOTNcbiAgICAgICAgICAgICAgICAvL3RoaXMuY29ubmVjdGlvbi5kaXNjby5hZGRGZWF0dXJlKCd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6cnRwLWhkcmV4dDowJyk7IC8vIFhFUC0wMjk0XG4gICAgICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLmRpc2NvLmFkZEZlYXR1cmUoJ3VybjppZXRmOnJmYzo1NzYxJyk7IC8vIHJ0Y3AtbXV4XG4gICAgICAgICAgICAgICAgLy90aGlzLmNvbm5lY3Rpb24uZGlzY28uYWRkRmVhdHVyZSgndXJuOmlldGY6cmZjOjU4ODgnKTsgLy8gYT1ncm91cCwgZS5nLiBidW5kbGVcbiAgICAgICAgICAgICAgICAvL3RoaXMuY29ubmVjdGlvbi5kaXNjby5hZGRGZWF0dXJlKCd1cm46aWV0ZjpyZmM6NTU3NicpOyAvLyBhPXNzcmNcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5hZGRIYW5kbGVyKHRoaXMub25KaW5nbGUuYmluZCh0aGlzKSwgJ3Vybjp4bXBwOmppbmdsZToxJywgJ2lxJywgJ3NldCcsIG51bGwsIG51bGwpO1xuICAgICAgICB9LFxuICAgICAgICBvbkppbmdsZTogZnVuY3Rpb24gKGlxKSB7XG4gICAgICAgICAgICB2YXIgc2lkID0gJChpcSkuZmluZCgnamluZ2xlJykuYXR0cignc2lkJyk7XG4gICAgICAgICAgICB2YXIgYWN0aW9uID0gJChpcSkuZmluZCgnamluZ2xlJykuYXR0cignYWN0aW9uJyk7XG4gICAgICAgICAgICB2YXIgZnJvbUppZCA9IGlxLmdldEF0dHJpYnV0ZSgnZnJvbScpO1xuICAgICAgICAgICAgLy8gc2VuZCBhY2sgZmlyc3RcbiAgICAgICAgICAgIHZhciBhY2sgPSAkaXEoe3R5cGU6ICdyZXN1bHQnLFxuICAgICAgICAgICAgICAgIHRvOiBmcm9tSmlkLFxuICAgICAgICAgICAgICAgIGlkOiBpcS5nZXRBdHRyaWJ1dGUoJ2lkJylcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ29uIGppbmdsZSAnICsgYWN0aW9uICsgJyBmcm9tICcgKyBmcm9tSmlkLCBpcSk7XG4gICAgICAgICAgICB2YXIgc2VzcyA9IHRoaXMuc2Vzc2lvbnNbc2lkXTtcbiAgICAgICAgICAgIGlmICgnc2Vzc2lvbi1pbml0aWF0ZScgIT0gYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNlc3MgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgYWNrLnR5cGUgPSAnZXJyb3InO1xuICAgICAgICAgICAgICAgICAgICBhY2suYygnZXJyb3InLCB7dHlwZTogJ2NhbmNlbCd9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLmMoJ2l0ZW0tbm90LWZvdW5kJywge3htbG5zOiAndXJuOmlldGY6cGFyYW1zOnhtbDpuczp4bXBwLXN0YW56YXMnfSkudXAoKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmMoJ3Vua25vd24tc2Vzc2lvbicsIHt4bWxuczogJ3Vybjp4bXBwOmppbmdsZTplcnJvcnM6MSd9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmQoYWNrKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGNvbXBhcmUgZnJvbSB0byBzZXNzLnBlZXJqaWQgKGJhcmUgamlkIGNvbXBhcmlzb24gZm9yIGxhdGVyIGNvbXBhdCB3aXRoIG1lc3NhZ2UtbW9kZSlcbiAgICAgICAgICAgICAgICAvLyBsb2NhbCBqaWQgaXMgbm90IGNoZWNrZWRcbiAgICAgICAgICAgICAgICBpZiAoU3Ryb3BoZS5nZXRCYXJlSmlkRnJvbUppZChmcm9tSmlkKSAhPSBTdHJvcGhlLmdldEJhcmVKaWRGcm9tSmlkKHNlc3MucGVlcmppZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdqaWQgbWlzbWF0Y2ggZm9yIHNlc3Npb24gaWQnLCBzaWQsIGZyb21KaWQsIHNlc3MucGVlcmppZCk7XG4gICAgICAgICAgICAgICAgICAgIGFjay50eXBlID0gJ2Vycm9yJztcbiAgICAgICAgICAgICAgICAgICAgYWNrLmMoJ2Vycm9yJywge3R5cGU6ICdjYW5jZWwnfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5jKCdpdGVtLW5vdC1mb3VuZCcsIHt4bWxuczogJ3VybjppZXRmOnBhcmFtczp4bWw6bnM6eG1wcC1zdGFuemFzJ30pLnVwKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5jKCd1bmtub3duLXNlc3Npb24nLCB7eG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6ZXJyb3JzOjEnfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kKGFjayk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc2VzcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgLy8gZXhpc3Rpbmcgc2Vzc2lvbiB3aXRoIHNhbWUgc2Vzc2lvbiBpZFxuICAgICAgICAgICAgICAgIC8vIHRoaXMgbWlnaHQgYmUgb3V0LW9mLW9yZGVyIGlmIHRoZSBzZXNzLnBlZXJqaWQgaXMgdGhlIHNhbWUgYXMgZnJvbVxuICAgICAgICAgICAgICAgIGFjay50eXBlID0gJ2Vycm9yJztcbiAgICAgICAgICAgICAgICBhY2suYygnZXJyb3InLCB7dHlwZTogJ2NhbmNlbCd9KVxuICAgICAgICAgICAgICAgICAgICAuYygnc2VydmljZS11bmF2YWlsYWJsZScsIHt4bWxuczogJ3VybjppZXRmOnBhcmFtczp4bWw6bnM6eG1wcC1zdGFuemFzJ30pLnVwKCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdkdXBsaWNhdGUgc2Vzc2lvbiBpZCcsIHNpZCk7XG4gICAgICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmQoYWNrKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZJWE1FOiBjaGVjayBmb3IgYSBkZWZpbmVkIGFjdGlvblxuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmQoYWNrKTtcbiAgICAgICAgICAgIC8vIHNlZSBodHRwOi8veG1wcC5vcmcvZXh0ZW5zaW9ucy94ZXAtMDE2Ni5odG1sI2NvbmNlcHRzLXNlc3Npb25cbiAgICAgICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnc2Vzc2lvbi1pbml0aWF0ZSc6XG4gICAgICAgICAgICAgICAgICAgIHNlc3MgPSBuZXcgSmluZ2xlU2Vzc2lvbigkKGlxKS5hdHRyKCd0bycpLCAkKGlxKS5maW5kKCdqaW5nbGUnKS5hdHRyKCdzaWQnKSwgdGhpcy5jb25uZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uZmlndXJlIHNlc3Npb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMubG9jYWxBdWRpbykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2Vzcy5sb2NhbFN0cmVhbXMucHVzaCh0aGlzLmxvY2FsQXVkaW8pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmxvY2FsVmlkZW8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3MubG9jYWxTdHJlYW1zLnB1c2godGhpcy5sb2NhbFZpZGVvKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzZXNzLm1lZGlhX2NvbnN0cmFpbnRzID0gdGhpcy5tZWRpYV9jb25zdHJhaW50cztcbiAgICAgICAgICAgICAgICAgICAgc2Vzcy5wY19jb25zdHJhaW50cyA9IHRoaXMucGNfY29uc3RyYWludHM7XG4gICAgICAgICAgICAgICAgICAgIHNlc3MuaWNlX2NvbmZpZyA9IHRoaXMuaWNlX2NvbmZpZztcblxuICAgICAgICAgICAgICAgICAgICBzZXNzLmluaXRpYXRlKGZyb21KaWQsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IHNldFJlbW90ZURlc2NyaXB0aW9uIHNob3VsZCBvbmx5IGJlIGRvbmUgd2hlbiB0aGlzIGNhbGwgaXMgdG8gYmUgYWNjZXB0ZWRcbiAgICAgICAgICAgICAgICAgICAgc2Vzcy5zZXRSZW1vdGVEZXNjcmlwdGlvbigkKGlxKS5maW5kKCc+amluZ2xlJyksICdvZmZlcicpO1xuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2Vzc2lvbnNbc2Vzcy5zaWRdID0gc2VzcztcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5qaWQyc2Vzc2lvbltzZXNzLnBlZXJqaWRdID0gc2VzcztcblxuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgY2FsbGJhY2sgc2hvdWxkIGVpdGhlclxuICAgICAgICAgICAgICAgICAgICAvLyAuc2VuZEFuc3dlciBhbmQgLmFjY2VwdFxuICAgICAgICAgICAgICAgICAgICAvLyBvciAuc2VuZFRlcm1pbmF0ZSAtLSBub3QgbmVjZXNzYXJpbHkgc3luY2hyb251c1xuICAgICAgICAgICAgICAgICAgICBhY3RpdmVjYWxsID0gc2VzcztcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRFbWl0dGVyLmVtaXQoWE1QUEV2ZW50cy5DQUxMX0lOQ09NSU5HLCBzZXNzKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gVE9ETzogY2hlY2sgYWZmaWxpYXRpb24gYW5kL29yIHJvbGVcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2VtdWMgZGF0YSBmb3InLCBzZXNzLnBlZXJqaWQsIGNvbm5lY3Rpb24uZW11Yy5tZW1iZXJzW3Nlc3MucGVlcmppZF0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlc3Npb25zW3Nlc3Muc2lkXS51c2VkcmlwID0gdHJ1ZTsgLy8gbm90LXNvLW5haXZlIHRyaWNrbGUgaWNlXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2Vzc2lvbnNbc2Vzcy5zaWRdLnNlbmRBbnN3ZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXNzaW9uc1tzZXNzLnNpZF0uYWNjZXB0KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnc2Vzc2lvbi1hY2NlcHQnOlxuICAgICAgICAgICAgICAgICAgICBzZXNzLnNldFJlbW90ZURlc2NyaXB0aW9uKCQoaXEpLmZpbmQoJz5qaW5nbGUnKSwgJ2Fuc3dlcicpO1xuICAgICAgICAgICAgICAgICAgICBzZXNzLmFjY2VwdCgpO1xuICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdjYWxsYWNjZXB0ZWQuamluZ2xlJywgW3Nlc3Muc2lkXSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Nlc3Npb24tdGVybWluYXRlJzpcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhpcyBpcyBub3QgdGhlIGZvY3VzIHNlbmRpbmcgdGhlIHRlcm1pbmF0ZSwgd2UgaGF2ZVxuICAgICAgICAgICAgICAgICAgICAvLyBub3RoaW5nIG1vcmUgdG8gZG8gaGVyZS5cbiAgICAgICAgICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKHRoaXMuc2Vzc2lvbnMpLmxlbmd0aCA8IDFcbiAgICAgICAgICAgICAgICAgICAgICAgIHx8ICEodGhpcy5zZXNzaW9uc1tPYmplY3Qua2V5cyh0aGlzLnNlc3Npb25zKVswXV1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZW9mIEppbmdsZVNlc3Npb24pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndGVybWluYXRpbmcuLi4nLCBzZXNzLnNpZCk7XG4gICAgICAgICAgICAgICAgICAgIHNlc3MudGVybWluYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGVybWluYXRlKHNlc3Muc2lkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQoaXEpLmZpbmQoJz5qaW5nbGU+cmVhc29uJykubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdjYWxsdGVybWluYXRlZC5qaW5nbGUnLCBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Vzcy5zaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Vzcy5wZWVyamlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoaXEpLmZpbmQoJz5qaW5nbGU+cmVhc29uPjpmaXJzdCcpWzBdLnRhZ05hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChpcSkuZmluZCgnPmppbmdsZT5yZWFzb24+dGV4dCcpLnRleHQoKVxuICAgICAgICAgICAgICAgICAgICAgICAgXSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdjYWxsdGVybWluYXRlZC5qaW5nbGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtzZXNzLnNpZCwgc2Vzcy5wZWVyamlkXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAndHJhbnNwb3J0LWluZm8nOlxuICAgICAgICAgICAgICAgICAgICBzZXNzLmFkZEljZUNhbmRpZGF0ZSgkKGlxKS5maW5kKCc+amluZ2xlPmNvbnRlbnQnKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Nlc3Npb24taW5mbyc6XG4gICAgICAgICAgICAgICAgICAgIHZhciBhZmZlY3RlZDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQoaXEpLmZpbmQoJz5qaW5nbGU+cmluZ2luZ1t4bWxucz1cInVybjp4bXBwOmppbmdsZTphcHBzOnJ0cDppbmZvOjFcIl0nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ3JpbmdpbmcuamluZ2xlJywgW3Nlc3Muc2lkXSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoJChpcSkuZmluZCgnPmppbmdsZT5tdXRlW3htbG5zPVwidXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOmluZm86MVwiXScpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWZmZWN0ZWQgPSAkKGlxKS5maW5kKCc+amluZ2xlPm11dGVbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6aW5mbzoxXCJdJykuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignbXV0ZS5qaW5nbGUnLCBbc2Vzcy5zaWQsIGFmZmVjdGVkXSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoJChpcSkuZmluZCgnPmppbmdsZT51bm11dGVbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6aW5mbzoxXCJdJykubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZmZlY3RlZCA9ICQoaXEpLmZpbmQoJz5qaW5nbGU+dW5tdXRlW3htbG5zPVwidXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOmluZm86MVwiXScpLmF0dHIoJ25hbWUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ3VubXV0ZS5qaW5nbGUnLCBbc2Vzcy5zaWQsIGFmZmVjdGVkXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnYWRkc291cmNlJzogLy8gRklYTUU6IHByb3ByaWV0YXJ5LCB1bi1qaW5nbGVpc2hcbiAgICAgICAgICAgICAgICBjYXNlICdzb3VyY2UtYWRkJzogLy8gRklYTUU6IHByb3ByaWV0YXJ5XG4gICAgICAgICAgICAgICAgICAgIHNlc3MuYWRkU291cmNlKCQoaXEpLmZpbmQoJz5qaW5nbGU+Y29udGVudCcpLCBmcm9tSmlkKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAncmVtb3Zlc291cmNlJzogLy8gRklYTUU6IHByb3ByaWV0YXJ5LCB1bi1qaW5nbGVpc2hcbiAgICAgICAgICAgICAgICBjYXNlICdzb3VyY2UtcmVtb3ZlJzogLy8gRklYTUU6IHByb3ByaWV0YXJ5XG4gICAgICAgICAgICAgICAgICAgIHNlc3MucmVtb3ZlU291cmNlKCQoaXEpLmZpbmQoJz5qaW5nbGU+Y29udGVudCcpLCBmcm9tSmlkKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdqaW5nbGUgYWN0aW9uIG5vdCBpbXBsZW1lbnRlZCcsIGFjdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIGluaXRpYXRlOiBmdW5jdGlvbiAocGVlcmppZCwgbXlqaWQpIHsgLy8gaW5pdGlhdGUgYSBuZXcgamluZ2xlc2Vzc2lvbiB0byBwZWVyamlkXG4gICAgICAgICAgICB2YXIgc2VzcyA9IG5ldyBKaW5nbGVTZXNzaW9uKG15amlkIHx8IHRoaXMuY29ubmVjdGlvbi5qaWQsXG4gICAgICAgICAgICAgICAgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDEyKSwgLy8gcmFuZG9tIHN0cmluZ1xuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbik7XG4gICAgICAgICAgICAvLyBjb25maWd1cmUgc2Vzc2lvblxuICAgICAgICAgICAgaWYgKHRoaXMubG9jYWxBdWRpbykge1xuICAgICAgICAgICAgICAgIHNlc3MubG9jYWxTdHJlYW1zLnB1c2godGhpcy5sb2NhbEF1ZGlvKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmxvY2FsVmlkZW8pIHtcbiAgICAgICAgICAgICAgICBzZXNzLmxvY2FsU3RyZWFtcy5wdXNoKHRoaXMubG9jYWxWaWRlbyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZXNzLm1lZGlhX2NvbnN0cmFpbnRzID0gdGhpcy5tZWRpYV9jb25zdHJhaW50cztcbiAgICAgICAgICAgIHNlc3MucGNfY29uc3RyYWludHMgPSB0aGlzLnBjX2NvbnN0cmFpbnRzO1xuICAgICAgICAgICAgc2Vzcy5pY2VfY29uZmlnID0gdGhpcy5pY2VfY29uZmlnO1xuXG4gICAgICAgICAgICBzZXNzLmluaXRpYXRlKHBlZXJqaWQsIHRydWUpO1xuICAgICAgICAgICAgdGhpcy5zZXNzaW9uc1tzZXNzLnNpZF0gPSBzZXNzO1xuICAgICAgICAgICAgdGhpcy5qaWQyc2Vzc2lvbltzZXNzLnBlZXJqaWRdID0gc2VzcztcbiAgICAgICAgICAgIHNlc3Muc2VuZE9mZmVyKCk7XG4gICAgICAgICAgICByZXR1cm4gc2VzcztcbiAgICAgICAgfSxcbiAgICAgICAgdGVybWluYXRlOiBmdW5jdGlvbiAoc2lkLCByZWFzb24sIHRleHQpIHsgLy8gdGVybWluYXRlIGJ5IHNlc3Npb25pZCAob3IgYWxsIHNlc3Npb25zKVxuICAgICAgICAgICAgaWYgKHNpZCA9PT0gbnVsbCB8fCBzaWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGZvciAoc2lkIGluIHRoaXMuc2Vzc2lvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc2Vzc2lvbnNbc2lkXS5zdGF0ZSAhPSAnZW5kZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlc3Npb25zW3NpZF0uc2VuZFRlcm1pbmF0ZShyZWFzb24gfHwgKCF0aGlzLnNlc3Npb25zW3NpZF0uYWN0aXZlKCkpID8gJ2NhbmNlbCcgOiBudWxsLCB0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2Vzc2lvbnNbc2lkXS50ZXJtaW5hdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5qaWQyc2Vzc2lvblt0aGlzLnNlc3Npb25zW3NpZF0ucGVlcmppZF07XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnNlc3Npb25zW3NpZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLnNlc3Npb25zLmhhc093blByb3BlcnR5KHNpZCkpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zZXNzaW9uc1tzaWRdLnN0YXRlICE9ICdlbmRlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXNzaW9uc1tzaWRdLnNlbmRUZXJtaW5hdGUocmVhc29uIHx8ICghdGhpcy5zZXNzaW9uc1tzaWRdLmFjdGl2ZSgpKSA/ICdjYW5jZWwnIDogbnVsbCwgdGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2Vzc2lvbnNbc2lkXS50ZXJtaW5hdGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuamlkMnNlc3Npb25bdGhpcy5zZXNzaW9uc1tzaWRdLnBlZXJqaWRdO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnNlc3Npb25zW3NpZF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIC8vIFVzZWQgdG8gdGVybWluYXRlIGEgc2Vzc2lvbiB3aGVuIGFuIHVuYXZhaWxhYmxlIHByZXNlbmNlIGlzIHJlY2VpdmVkLlxuICAgICAgICB0ZXJtaW5hdGVCeUppZDogZnVuY3Rpb24gKGppZCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuamlkMnNlc3Npb24uaGFzT3duUHJvcGVydHkoamlkKSkge1xuICAgICAgICAgICAgICAgIHZhciBzZXNzID0gdGhpcy5qaWQyc2Vzc2lvbltqaWRdO1xuICAgICAgICAgICAgICAgIGlmIChzZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlc3MudGVybWluYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwZWVyIHdlbnQgYXdheSBzaWxlbnRseScsIGppZCk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnNlc3Npb25zW3Nlc3Muc2lkXTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuamlkMnNlc3Npb25bamlkXTtcbiAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignY2FsbHRlcm1pbmF0ZWQuamluZ2xlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFtzZXNzLnNpZCwgamlkXSwgJ2dvbmUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHRlcm1pbmF0ZVJlbW90ZUJ5SmlkOiBmdW5jdGlvbiAoamlkLCByZWFzb24pIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmppZDJzZXNzaW9uLmhhc093blByb3BlcnR5KGppZCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VzcyA9IHRoaXMuamlkMnNlc3Npb25bamlkXTtcbiAgICAgICAgICAgICAgICBpZiAoc2Vzcykge1xuICAgICAgICAgICAgICAgICAgICBzZXNzLnNlbmRUZXJtaW5hdGUocmVhc29uIHx8ICghc2Vzcy5hY3RpdmUoKSkgPyAna2ljaycgOiBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgc2Vzcy50ZXJtaW5hdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3Rlcm1pbmF0ZSBwZWVyIHdpdGggamlkJywgc2Vzcy5zaWQsIGppZCk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnNlc3Npb25zW3Nlc3Muc2lkXTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuamlkMnNlc3Npb25bamlkXTtcbiAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignY2FsbHRlcm1pbmF0ZWQuamluZ2xlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFtzZXNzLnNpZCwgamlkLCAna2lja2VkJ10pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZ2V0U3R1bkFuZFR1cm5DcmVkZW50aWFsczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gZ2V0IHN0dW4gYW5kIHR1cm4gY29uZmlndXJhdGlvbiBmcm9tIHNlcnZlciB2aWEgeGVwLTAyMTVcbiAgICAgICAgICAgIC8vIHVzZXMgdGltZS1saW1pdGVkIGNyZWRlbnRpYWxzIGFzIGRlc2NyaWJlZCBpblxuICAgICAgICAgICAgLy8gaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvZHJhZnQtdWJlcnRpLWJlaGF2ZS10dXJuLXJlc3QtMDBcbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyBzZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC9wcm9zb2R5LW1vZHVsZXMvc291cmNlL2Jyb3dzZS9tb2RfdHVybmNyZWRlbnRpYWxzL21vZF90dXJuY3JlZGVudGlhbHMubHVhXG4gICAgICAgICAgICAvLyBmb3IgYSBwcm9zb2R5IG1vZHVsZSB3aGljaCBpbXBsZW1lbnRzIHRoaXNcbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyBjdXJyZW50bHksIHRoaXMgZG9lc24ndCB3b3JrIHdpdGggdXBkYXRlSWNlIGFuZCB0aGVyZWZvcmUgY3JlZGVudGlhbHMgd2l0aCBhIGxvbmdcbiAgICAgICAgICAgIC8vIHZhbGlkaXR5IGhhdmUgdG8gYmUgZmV0Y2hlZCBiZWZvcmUgY3JlYXRpbmcgdGhlIHBlZXJjb25uZWN0aW9uXG4gICAgICAgICAgICAvLyBUT0RPOiBpbXBsZW1lbnQgcmVmcmVzaCB2aWEgdXBkYXRlSWNlIGFzIGRlc2NyaWJlZCBpblxuICAgICAgICAgICAgLy8gICAgICBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3dlYnJ0Yy9pc3N1ZXMvZGV0YWlsP2lkPTE2NTBcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoXG4gICAgICAgICAgICAgICAgJGlxKHt0eXBlOiAnZ2V0JywgdG86IHRoaXMuY29ubmVjdGlvbi5kb21haW59KVxuICAgICAgICAgICAgICAgICAgICAuYygnc2VydmljZXMnLCB7eG1sbnM6ICd1cm46eG1wcDpleHRkaXNjbzoxJ30pLmMoJ3NlcnZpY2UnLCB7aG9zdDogJ3R1cm4uJyArIHRoaXMuY29ubmVjdGlvbi5kb21haW59KSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpY2VzZXJ2ZXJzID0gW107XG4gICAgICAgICAgICAgICAgICAgICQocmVzKS5maW5kKCc+c2VydmljZXM+c2VydmljZScpLmVhY2goZnVuY3Rpb24gKGlkeCwgZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsID0gJChlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZGljdCA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBlbC5hdHRyKCd0eXBlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdzdHVuJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGljdC51cmwgPSAnc3R1bjonICsgZWwuYXR0cignaG9zdCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWwuYXR0cigncG9ydCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWN0LnVybCArPSAnOicgKyBlbC5hdHRyKCdwb3J0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWNlc2VydmVycy5wdXNoKGRpY3QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICd0dXJuJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICd0dXJucyc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpY3QudXJsID0gdHlwZSArICc6JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsLmF0dHIoJ3VzZXJuYW1lJykpIHsgLy8gaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC93ZWJydGMvaXNzdWVzL2RldGFpbD9pZD0xNTA4XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvQ2hyb20oZXxpdW0pXFwvKFswLTldKylcXC4vKSAmJiBwYXJzZUludChuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9DaHJvbShlfGl1bSlcXC8oWzAtOV0rKVxcLi8pWzJdLCAxMCkgPCAyOCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpY3QudXJsICs9IGVsLmF0dHIoJ3VzZXJuYW1lJykgKyAnQCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpY3QudXNlcm5hbWUgPSBlbC5hdHRyKCd1c2VybmFtZScpOyAvLyBvbmx5IHdvcmtzIGluIE0yOFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpY3QudXJsICs9IGVsLmF0dHIoJ2hvc3QnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsLmF0dHIoJ3BvcnQnKSAmJiBlbC5hdHRyKCdwb3J0JykgIT0gJzM0NzgnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWN0LnVybCArPSAnOicgKyBlbC5hdHRyKCdwb3J0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsLmF0dHIoJ3RyYW5zcG9ydCcpICYmIGVsLmF0dHIoJ3RyYW5zcG9ydCcpICE9ICd1ZHAnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWN0LnVybCArPSAnP3RyYW5zcG9ydD0nICsgZWwuYXR0cigndHJhbnNwb3J0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsLmF0dHIoJ3Bhc3N3b3JkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpY3QuY3JlZGVudGlhbCA9IGVsLmF0dHIoJ3Bhc3N3b3JkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWNlc2VydmVycy5wdXNoKGRpY3QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuaWNlX2NvbmZpZy5pY2VTZXJ2ZXJzID0gaWNlc2VydmVycztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdnZXR0aW5nIHR1cm4gY3JlZGVudGlhbHMgZmFpbGVkJywgZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdpcyBtb2RfdHVybmNyZWRlbnRpYWxzIG9yIHNpbWlsYXIgaW5zdGFsbGVkPycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAvLyBpbXBsZW1lbnQgcHVzaD9cbiAgICAgICAgfSxcbiAgICAgICAgZ2V0SmluZ2xlRGF0YTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSB7fTtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGNvbm5lY3Rpb24uamluZ2xlLnNlc3Npb25zKS5mb3JFYWNoKGZ1bmN0aW9uIChzaWQpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2Vzc2lvbiA9IGNvbm5lY3Rpb24uamluZ2xlLnNlc3Npb25zW3NpZF07XG4gICAgICAgICAgICAgICAgaWYgKHNlc3Npb24ucGVlcmNvbm5lY3Rpb24gJiYgc2Vzc2lvbi5wZWVyY29ubmVjdGlvbi51cGRhdGVMb2cpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IHNob3VsZCBwcm9iYWJseSBiZSBhIC5kdW1wIGNhbGxcbiAgICAgICAgICAgICAgICAgICAgZGF0YVtcImppbmdsZV9cIiArIHNlc3Npb24uc2lkXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZUxvZzogc2Vzc2lvbi5wZWVyY29ubmVjdGlvbi51cGRhdGVMb2csXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0czogc2Vzc2lvbi5wZWVyY29ubmVjdGlvbi5zdGF0cyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogd2luZG93LmxvY2F0aW9uLmhyZWZcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICB9XG4gICAgfSk7XG59IiwiLyoganNoaW50IC1XMTE3ICovXG5cbi8qKlxuICogQ2xhc3MgaG9sZHMgYT1zc3JjIGxpbmVzIGFuZCBtZWRpYSB0eXBlIGE9bWlkXG4gKiBAcGFyYW0gc3NyYyBzeW5jaHJvbml6YXRpb24gc291cmNlIGlkZW50aWZpZXIgbnVtYmVyKGE9c3NyYyBsaW5lcyBmcm9tIFNEUClcbiAqIEBwYXJhbSB0eXBlIG1lZGlhIHR5cGUgZWcuIFwiYXVkaW9cIiBvciBcInZpZGVvXCIoYT1taWQgZnJtIFNEUClcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBDaGFubmVsU3NyYyhzc3JjLCB0eXBlKSB7XG4gICAgdGhpcy5zc3JjID0gc3NyYztcbiAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgIHRoaXMubGluZXMgPSBbXTtcbn1cblxuLyoqXG4gKiBDbGFzcyBob2xkcyBhPXNzcmMtZ3JvdXA6IGxpbmVzXG4gKiBAcGFyYW0gc2VtYW50aWNzXG4gKiBAcGFyYW0gc3NyY3NcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBDaGFubmVsU3NyY0dyb3VwKHNlbWFudGljcywgc3NyY3MsIGxpbmUpIHtcbiAgICB0aGlzLnNlbWFudGljcyA9IHNlbWFudGljcztcbiAgICB0aGlzLnNzcmNzID0gc3NyY3M7XG59XG5cbi8qKlxuICogSGVscGVyIGNsYXNzIHJlcHJlc2VudHMgbWVkaWEgY2hhbm5lbC4gSXMgYSBjb250YWluZXIgZm9yIENoYW5uZWxTc3JjLCBob2xkcyBjaGFubmVsIGlkeCBhbmQgbWVkaWEgdHlwZS5cbiAqIEBwYXJhbSBjaGFubmVsTnVtYmVyIGNoYW5uZWwgaWR4IGluIFNEUCBtZWRpYSBhcnJheS5cbiAqIEBwYXJhbSBtZWRpYVR5cGUgbWVkaWEgdHlwZShhPW1pZClcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBNZWRpYUNoYW5uZWwoY2hhbm5lbE51bWJlciwgbWVkaWFUeXBlKSB7XG4gICAgLyoqXG4gICAgICogU0RQIGNoYW5uZWwgbnVtYmVyXG4gICAgICogQHR5cGUgeyp9XG4gICAgICovXG4gICAgdGhpcy5jaE51bWJlciA9IGNoYW5uZWxOdW1iZXI7XG4gICAgLyoqXG4gICAgICogQ2hhbm5lbCBtZWRpYSB0eXBlKGE9bWlkKVxuICAgICAqIEB0eXBlIHsqfVxuICAgICAqL1xuICAgIHRoaXMubWVkaWFUeXBlID0gbWVkaWFUeXBlO1xuICAgIC8qKlxuICAgICAqIFRoZSBtYXBzIG9mIHNzcmMgbnVtYmVycyB0byBDaGFubmVsU3NyYyBvYmplY3RzLlxuICAgICAqL1xuICAgIHRoaXMuc3NyY3MgPSB7fTtcblxuICAgIC8qKlxuICAgICAqIFRoZSBhcnJheSBvZiBDaGFubmVsU3NyY0dyb3VwIG9iamVjdHMuXG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqL1xuICAgIHRoaXMuc3NyY0dyb3VwcyA9IFtdO1xufVxuXG4vLyBTRFAgU1RVRkZcbmZ1bmN0aW9uIFNEUChzZHApIHtcbiAgICB0aGlzLm1lZGlhID0gc2RwLnNwbGl0KCdcXHJcXG5tPScpO1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgdGhpcy5tZWRpYS5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLm1lZGlhW2ldID0gJ209JyArIHRoaXMubWVkaWFbaV07XG4gICAgICAgIGlmIChpICE9IHRoaXMubWVkaWEubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgdGhpcy5tZWRpYVtpXSArPSAnXFxyXFxuJztcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnNlc3Npb24gPSB0aGlzLm1lZGlhLnNoaWZ0KCkgKyAnXFxyXFxuJztcbiAgICB0aGlzLnJhdyA9IHRoaXMuc2Vzc2lvbiArIHRoaXMubWVkaWEuam9pbignJyk7XG59XG4vKipcbiAqIFJldHVybnMgbWFwIG9mIE1lZGlhQ2hhbm5lbCBtYXBwZWQgcGVyIGNoYW5uZWwgaWR4LlxuICovXG5TRFAucHJvdG90eXBlLmdldE1lZGlhU3NyY01hcCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbWVkaWFfc3NyY3MgPSB7fTtcbiAgICBmb3IgKGNoYW5uZWxOdW0gPSAwOyBjaGFubmVsTnVtIDwgc2VsZi5tZWRpYS5sZW5ndGg7IGNoYW5uZWxOdW0rKykge1xuICAgICAgICBtb2RpZmllZCA9IHRydWU7XG4gICAgICAgIHRtcCA9IFNEUFV0aWwuZmluZF9saW5lcyhzZWxmLm1lZGlhW2NoYW5uZWxOdW1dLCAnYT1zc3JjOicpO1xuICAgICAgICB2YXIgdHlwZSA9IFNEUFV0aWwucGFyc2VfbWlkKFNEUFV0aWwuZmluZF9saW5lKHNlbGYubWVkaWFbY2hhbm5lbE51bV0sICdhPW1pZDonKSk7XG4gICAgICAgIHZhciBjaGFubmVsID0gbmV3IE1lZGlhQ2hhbm5lbChjaGFubmVsTnVtLCB0eXBlKTtcbiAgICAgICAgbWVkaWFfc3NyY3NbY2hhbm5lbE51bV0gPSBjaGFubmVsO1xuICAgICAgICB0bXAuZm9yRWFjaChmdW5jdGlvbiAobGluZSkge1xuICAgICAgICAgICAgdmFyIGxpbmVzc3JjID0gbGluZS5zdWJzdHJpbmcoNykuc3BsaXQoJyAnKVswXTtcbiAgICAgICAgICAgIC8vIGFsbG9jYXRlIG5ldyBDaGFubmVsU3NyY1xuICAgICAgICAgICAgaWYoIWNoYW5uZWwuc3NyY3NbbGluZXNzcmNdKSB7XG4gICAgICAgICAgICAgICAgY2hhbm5lbC5zc3Jjc1tsaW5lc3NyY10gPSBuZXcgQ2hhbm5lbFNzcmMobGluZXNzcmMsIHR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2hhbm5lbC5zc3Jjc1tsaW5lc3NyY10ubGluZXMucHVzaChsaW5lKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRtcCA9IFNEUFV0aWwuZmluZF9saW5lcyhzZWxmLm1lZGlhW2NoYW5uZWxOdW1dLCAnYT1zc3JjLWdyb3VwOicpO1xuICAgICAgICB0bXAuZm9yRWFjaChmdW5jdGlvbihsaW5lKXtcbiAgICAgICAgICAgIHZhciBzZW1hbnRpY3MgPSBsaW5lLnN1YnN0cigwLCBpZHgpLnN1YnN0cigxMyk7XG4gICAgICAgICAgICB2YXIgc3NyY3MgPSBsaW5lLnN1YnN0cigxNCArIHNlbWFudGljcy5sZW5ndGgpLnNwbGl0KCcgJyk7XG4gICAgICAgICAgICBpZiAoc3NyY3MubGVuZ3RoICE9IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgc3NyY0dyb3VwID0gbmV3IENoYW5uZWxTc3JjR3JvdXAoc2VtYW50aWNzLCBzc3Jjcyk7XG4gICAgICAgICAgICAgICAgY2hhbm5lbC5zc3JjR3JvdXBzLnB1c2goc3NyY0dyb3VwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBtZWRpYV9zc3Jjcztcbn1cbi8qKlxuICogUmV0dXJucyA8dHQ+dHJ1ZTwvdHQ+IGlmIHRoaXMgU0RQIGNvbnRhaW5zIGdpdmVuIFNTUkMuXG4gKiBAcGFyYW0gc3NyYyB0aGUgc3NyYyB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSA8dHQ+dHJ1ZTwvdHQ+IGlmIHRoaXMgU0RQIGNvbnRhaW5zIGdpdmVuIFNTUkMuXG4gKi9cblNEUC5wcm90b3R5cGUuY29udGFpbnNTU1JDID0gZnVuY3Rpb24oc3NyYykge1xuICAgIHZhciBjaGFubmVscyA9IHRoaXMuZ2V0TWVkaWFTc3JjTWFwKCk7XG4gICAgdmFyIGNvbnRhaW5zID0gZmFsc2U7XG4gICAgT2JqZWN0LmtleXMoY2hhbm5lbHMpLmZvckVhY2goZnVuY3Rpb24oY2hOdW1iZXIpe1xuICAgICAgICB2YXIgY2hhbm5lbCA9IGNoYW5uZWxzW2NoTnVtYmVyXTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIkNoZWNrXCIsIGNoYW5uZWwsIHNzcmMpO1xuICAgICAgICBpZihPYmplY3Qua2V5cyhjaGFubmVsLnNzcmNzKS5pbmRleE9mKHNzcmMpICE9IC0xKXtcbiAgICAgICAgICAgIGNvbnRhaW5zID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBjb250YWlucztcbn1cbi8qKlxuICogUmV0dXJucyBtYXAgb2YgTWVkaWFDaGFubmVsIHRoYXQgY29udGFpbnMgb25seSBtZWRpYSBub3QgY29udGFpbmVkIGluIDx0dD5vdGhlclNkcDwvdHQ+LiBNYXBwZWQgYnkgY2hhbm5lbCBpZHguXG4gKiBAcGFyYW0gb3RoZXJTZHAgdGhlIG90aGVyIFNEUCB0byBjaGVjayBzc3JjIHdpdGguXG4gKi9cblNEUC5wcm90b3R5cGUuZ2V0TmV3TWVkaWEgPSBmdW5jdGlvbihvdGhlclNkcCkge1xuXG4gICAgLy8gdGhpcyBjb3VsZCBiZSB1c2VmdWwgaW4gQXJyYXkucHJvdG90eXBlLlxuICAgIGZ1bmN0aW9uIGFycmF5RXF1YWxzKGFycmF5KSB7XG4gICAgICAgIC8vIGlmIHRoZSBvdGhlciBhcnJheSBpcyBhIGZhbHN5IHZhbHVlLCByZXR1cm5cbiAgICAgICAgaWYgKCFhcnJheSlcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcblxuICAgICAgICAvLyBjb21wYXJlIGxlbmd0aHMgLSBjYW4gc2F2ZSBhIGxvdCBvZiB0aW1lXG4gICAgICAgIGlmICh0aGlzLmxlbmd0aCAhPSBhcnJheS5sZW5ndGgpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGw9dGhpcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHdlIGhhdmUgbmVzdGVkIGFycmF5c1xuICAgICAgICAgICAgaWYgKHRoaXNbaV0gaW5zdGFuY2VvZiBBcnJheSAmJiBhcnJheVtpXSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICAgICAgLy8gcmVjdXJzZSBpbnRvIHRoZSBuZXN0ZWQgYXJyYXlzXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzW2ldLmVxdWFscyhhcnJheVtpXSkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHRoaXNbaV0gIT0gYXJyYXlbaV0pIHtcbiAgICAgICAgICAgICAgICAvLyBXYXJuaW5nIC0gdHdvIGRpZmZlcmVudCBvYmplY3QgaW5zdGFuY2VzIHdpbGwgbmV2ZXIgYmUgZXF1YWw6IHt4OjIwfSAhPSB7eDoyMH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIHZhciBteU1lZGlhID0gdGhpcy5nZXRNZWRpYVNzcmNNYXAoKTtcbiAgICB2YXIgb3RoZXJzTWVkaWEgPSBvdGhlclNkcC5nZXRNZWRpYVNzcmNNYXAoKTtcbiAgICB2YXIgbmV3TWVkaWEgPSB7fTtcbiAgICBPYmplY3Qua2V5cyhvdGhlcnNNZWRpYSkuZm9yRWFjaChmdW5jdGlvbihjaGFubmVsTnVtKSB7XG4gICAgICAgIHZhciBteUNoYW5uZWwgPSBteU1lZGlhW2NoYW5uZWxOdW1dO1xuICAgICAgICB2YXIgb3RoZXJzQ2hhbm5lbCA9IG90aGVyc01lZGlhW2NoYW5uZWxOdW1dO1xuICAgICAgICBpZighbXlDaGFubmVsICYmIG90aGVyc0NoYW5uZWwpIHtcbiAgICAgICAgICAgIC8vIEFkZCB3aG9sZSBjaGFubmVsXG4gICAgICAgICAgICBuZXdNZWRpYVtjaGFubmVsTnVtXSA9IG90aGVyc0NoYW5uZWw7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gTG9vayBmb3IgbmV3IHNzcmNzIGFjY3Jvc3MgdGhlIGNoYW5uZWxcbiAgICAgICAgT2JqZWN0LmtleXMob3RoZXJzQ2hhbm5lbC5zc3JjcykuZm9yRWFjaChmdW5jdGlvbihzc3JjKSB7XG4gICAgICAgICAgICBpZihPYmplY3Qua2V5cyhteUNoYW5uZWwuc3NyY3MpLmluZGV4T2Yoc3NyYykgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgLy8gQWxsb2NhdGUgY2hhbm5lbCBpZiB3ZSd2ZSBmb3VuZCBzc3JjIHRoYXQgZG9lc24ndCBleGlzdCBpbiBvdXIgY2hhbm5lbFxuICAgICAgICAgICAgICAgIGlmKCFuZXdNZWRpYVtjaGFubmVsTnVtXSl7XG4gICAgICAgICAgICAgICAgICAgIG5ld01lZGlhW2NoYW5uZWxOdW1dID0gbmV3IE1lZGlhQ2hhbm5lbChvdGhlcnNDaGFubmVsLmNoTnVtYmVyLCBvdGhlcnNDaGFubmVsLm1lZGlhVHlwZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG5ld01lZGlhW2NoYW5uZWxOdW1dLnNzcmNzW3NzcmNdID0gb3RoZXJzQ2hhbm5lbC5zc3Jjc1tzc3JjXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICAvLyBMb29rIGZvciBuZXcgc3NyYyBncm91cHMgYWNyb3NzIHRoZSBjaGFubmVsc1xuICAgICAgICBvdGhlcnNDaGFubmVsLnNzcmNHcm91cHMuZm9yRWFjaChmdW5jdGlvbihvdGhlclNzcmNHcm91cCl7XG5cbiAgICAgICAgICAgIC8vIHRyeSB0byBtYXRjaCB0aGUgb3RoZXIgc3NyYy1ncm91cCB3aXRoIGFuIHNzcmMtZ3JvdXAgb2Ygb3Vyc1xuICAgICAgICAgICAgdmFyIG1hdGNoZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbXlDaGFubmVsLnNzcmNHcm91cHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgbXlTc3JjR3JvdXAgPSBteUNoYW5uZWwuc3NyY0dyb3Vwc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAob3RoZXJTc3JjR3JvdXAuc2VtYW50aWNzID09IG15U3NyY0dyb3VwXG4gICAgICAgICAgICAgICAgICAgICYmIGFycmF5RXF1YWxzLmFwcGx5KG90aGVyU3NyY0dyb3VwLnNzcmNzLCBbbXlTc3JjR3JvdXAuc3NyY3NdKSkge1xuXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghbWF0Y2hlZCkge1xuICAgICAgICAgICAgICAgIC8vIEFsbG9jYXRlIGNoYW5uZWwgaWYgd2UndmUgZm91bmQgYW4gc3NyYy1ncm91cCB0aGF0IGRvZXNuJ3RcbiAgICAgICAgICAgICAgICAvLyBleGlzdCBpbiBvdXIgY2hhbm5lbFxuXG4gICAgICAgICAgICAgICAgaWYoIW5ld01lZGlhW2NoYW5uZWxOdW1dKXtcbiAgICAgICAgICAgICAgICAgICAgbmV3TWVkaWFbY2hhbm5lbE51bV0gPSBuZXcgTWVkaWFDaGFubmVsKG90aGVyc0NoYW5uZWwuY2hOdW1iZXIsIG90aGVyc0NoYW5uZWwubWVkaWFUeXBlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbmV3TWVkaWFbY2hhbm5lbE51bV0uc3NyY0dyb3Vwcy5wdXNoKG90aGVyU3NyY0dyb3VwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIG5ld01lZGlhO1xufVxuLy8gcmVtb3ZlIGlTQUMgYW5kIENOIGZyb20gU0RQXG5TRFAucHJvdG90eXBlLm1hbmdsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaSwgaiwgbWxpbmUsIGxpbmVzLCBydHBtYXAsIG5ld2Rlc2M7XG4gICAgZm9yIChpID0gMDsgaSA8IHRoaXMubWVkaWEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbGluZXMgPSB0aGlzLm1lZGlhW2ldLnNwbGl0KCdcXHJcXG4nKTtcbiAgICAgICAgbGluZXMucG9wKCk7IC8vIHJlbW92ZSBlbXB0eSBsYXN0IGVsZW1lbnRcbiAgICAgICAgbWxpbmUgPSBTRFBVdGlsLnBhcnNlX21saW5lKGxpbmVzLnNoaWZ0KCkpO1xuICAgICAgICBpZiAobWxpbmUubWVkaWEgIT0gJ2F1ZGlvJylcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICBuZXdkZXNjID0gJyc7XG4gICAgICAgIG1saW5lLmZtdC5sZW5ndGggPSAwO1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgbGluZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIGlmIChsaW5lc1tqXS5zdWJzdHIoMCwgOSkgPT0gJ2E9cnRwbWFwOicpIHtcbiAgICAgICAgICAgICAgICBydHBtYXAgPSBTRFBVdGlsLnBhcnNlX3J0cG1hcChsaW5lc1tqXSk7XG4gICAgICAgICAgICAgICAgaWYgKHJ0cG1hcC5uYW1lID09ICdDTicgfHwgcnRwbWFwLm5hbWUgPT0gJ0lTQUMnKVxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBtbGluZS5mbXQucHVzaChydHBtYXAuaWQpO1xuICAgICAgICAgICAgICAgIG5ld2Rlc2MgKz0gbGluZXNbal0gKyAnXFxyXFxuJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbmV3ZGVzYyArPSBsaW5lc1tqXSArICdcXHJcXG4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMubWVkaWFbaV0gPSBTRFBVdGlsLmJ1aWxkX21saW5lKG1saW5lKSArICdcXHJcXG4nO1xuICAgICAgICB0aGlzLm1lZGlhW2ldICs9IG5ld2Rlc2M7XG4gICAgfVxuICAgIHRoaXMucmF3ID0gdGhpcy5zZXNzaW9uICsgdGhpcy5tZWRpYS5qb2luKCcnKTtcbn07XG5cbi8vIHJlbW92ZSBsaW5lcyBtYXRjaGluZyBwcmVmaXggZnJvbSBzZXNzaW9uIHNlY3Rpb25cblNEUC5wcm90b3R5cGUucmVtb3ZlU2Vzc2lvbkxpbmVzID0gZnVuY3Rpb24ocHJlZml4KSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBsaW5lcyA9IFNEUFV0aWwuZmluZF9saW5lcyh0aGlzLnNlc3Npb24sIHByZWZpeCk7XG4gICAgbGluZXMuZm9yRWFjaChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgIHNlbGYuc2Vzc2lvbiA9IHNlbGYuc2Vzc2lvbi5yZXBsYWNlKGxpbmUgKyAnXFxyXFxuJywgJycpO1xuICAgIH0pO1xuICAgIHRoaXMucmF3ID0gdGhpcy5zZXNzaW9uICsgdGhpcy5tZWRpYS5qb2luKCcnKTtcbiAgICByZXR1cm4gbGluZXM7XG59XG4vLyByZW1vdmUgbGluZXMgbWF0Y2hpbmcgcHJlZml4IGZyb20gYSBtZWRpYSBzZWN0aW9uIHNwZWNpZmllZCBieSBtZWRpYWluZGV4XG4vLyBUT0RPOiBub24tbnVtZXJpYyBtZWRpYWluZGV4IGNvdWxkIG1hdGNoIG1pZFxuU0RQLnByb3RvdHlwZS5yZW1vdmVNZWRpYUxpbmVzID0gZnVuY3Rpb24obWVkaWFpbmRleCwgcHJlZml4KSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBsaW5lcyA9IFNEUFV0aWwuZmluZF9saW5lcyh0aGlzLm1lZGlhW21lZGlhaW5kZXhdLCBwcmVmaXgpO1xuICAgIGxpbmVzLmZvckVhY2goZnVuY3Rpb24obGluZSkge1xuICAgICAgICBzZWxmLm1lZGlhW21lZGlhaW5kZXhdID0gc2VsZi5tZWRpYVttZWRpYWluZGV4XS5yZXBsYWNlKGxpbmUgKyAnXFxyXFxuJywgJycpO1xuICAgIH0pO1xuICAgIHRoaXMucmF3ID0gdGhpcy5zZXNzaW9uICsgdGhpcy5tZWRpYS5qb2luKCcnKTtcbiAgICByZXR1cm4gbGluZXM7XG59XG5cbi8vIGFkZCBjb250ZW50J3MgdG8gYSBqaW5nbGUgZWxlbWVudFxuU0RQLnByb3RvdHlwZS50b0ppbmdsZSA9IGZ1bmN0aW9uIChlbGVtLCB0aGVjcmVhdG9yKSB7XG4gICAgdmFyIGksIGosIGssIG1saW5lLCBzc3JjLCBydHBtYXAsIHRtcCwgbGluZSwgbGluZXM7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIG5ldyBidW5kbGUgcGxhblxuICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZSh0aGlzLnNlc3Npb24sICdhPWdyb3VwOicpKSB7XG4gICAgICAgIGxpbmVzID0gU0RQVXRpbC5maW5kX2xpbmVzKHRoaXMuc2Vzc2lvbiwgJ2E9Z3JvdXA6Jyk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdG1wID0gbGluZXNbaV0uc3BsaXQoJyAnKTtcbiAgICAgICAgICAgIHZhciBzZW1hbnRpY3MgPSB0bXAuc2hpZnQoKS5zdWJzdHIoOCk7XG4gICAgICAgICAgICBlbGVtLmMoJ2dyb3VwJywge3htbG5zOiAndXJuOnhtcHA6amluZ2xlOmFwcHM6Z3JvdXBpbmc6MCcsIHNlbWFudGljczpzZW1hbnRpY3N9KTtcbiAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCB0bXAubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBlbGVtLmMoJ2NvbnRlbnQnLCB7bmFtZTogdG1wW2pdfSkudXAoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsZW0udXAoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBvbGQgYnVuZGxlIHBsYW4sIHRvIGJlIHJlbW92ZWRcbiAgICB2YXIgYnVuZGxlID0gW107XG4gICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKHRoaXMuc2Vzc2lvbiwgJ2E9Z3JvdXA6QlVORExFJykpIHtcbiAgICAgICAgYnVuZGxlID0gU0RQVXRpbC5maW5kX2xpbmUodGhpcy5zZXNzaW9uLCAnYT1ncm91cDpCVU5ETEUgJykuc3BsaXQoJyAnKTtcbiAgICAgICAgYnVuZGxlLnNoaWZ0KCk7XG4gICAgfVxuICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLm1lZGlhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG1saW5lID0gU0RQVXRpbC5wYXJzZV9tbGluZSh0aGlzLm1lZGlhW2ldLnNwbGl0KCdcXHJcXG4nKVswXSk7XG4gICAgICAgIGlmICghKG1saW5lLm1lZGlhID09PSAnYXVkaW8nIHx8XG4gICAgICAgICAgICAgIG1saW5lLm1lZGlhID09PSAndmlkZW8nIHx8XG4gICAgICAgICAgICAgIG1saW5lLm1lZGlhID09PSAnYXBwbGljYXRpb24nKSlcbiAgICAgICAge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKHRoaXMubWVkaWFbaV0sICdhPXNzcmM6JykpIHtcbiAgICAgICAgICAgIHNzcmMgPSBTRFBVdGlsLmZpbmRfbGluZSh0aGlzLm1lZGlhW2ldLCAnYT1zc3JjOicpLnN1YnN0cmluZyg3KS5zcGxpdCgnICcpWzBdOyAvLyB0YWtlIHRoZSBmaXJzdFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3NyYyA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgZWxlbS5jKCdjb250ZW50Jywge2NyZWF0b3I6IHRoZWNyZWF0b3IsIG5hbWU6IG1saW5lLm1lZGlhfSk7XG4gICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZSh0aGlzLm1lZGlhW2ldLCAnYT1taWQ6JykpIHtcbiAgICAgICAgICAgIC8vIHByZWZlciBpZGVudGlmaWVyIGZyb20gYT1taWQgaWYgcHJlc2VudFxuICAgICAgICAgICAgdmFyIG1pZCA9IFNEUFV0aWwucGFyc2VfbWlkKFNEUFV0aWwuZmluZF9saW5lKHRoaXMubWVkaWFbaV0sICdhPW1pZDonKSk7XG4gICAgICAgICAgICBlbGVtLmF0dHJzKHsgbmFtZTogbWlkIH0pO1xuXG4gICAgICAgICAgICAvLyBvbGQgQlVORExFIHBsYW4sIHRvIGJlIHJlbW92ZWRcbiAgICAgICAgICAgIGlmIChidW5kbGUuaW5kZXhPZihtaWQpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIGVsZW0uYygnYnVuZGxlJywge3htbG5zOiAnaHR0cDovL2VzdG9zLmRlL25zL2J1bmRsZSd9KS51cCgpO1xuICAgICAgICAgICAgICAgIGJ1bmRsZS5zcGxpY2UoYnVuZGxlLmluZGV4T2YobWlkKSwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUodGhpcy5tZWRpYVtpXSwgJ2E9cnRwbWFwOicpLmxlbmd0aClcbiAgICAgICAge1xuICAgICAgICAgICAgZWxlbS5jKCdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAge3htbG5zOiAndXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOjEnLFxuICAgICAgICAgICAgICAgICAgICBtZWRpYTogbWxpbmUubWVkaWEgfSk7XG4gICAgICAgICAgICBpZiAoc3NyYykge1xuICAgICAgICAgICAgICAgIGVsZW0uYXR0cnMoe3NzcmM6IHNzcmN9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBtbGluZS5mbXQubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBydHBtYXAgPSBTRFBVdGlsLmZpbmRfbGluZSh0aGlzLm1lZGlhW2ldLCAnYT1ydHBtYXA6JyArIG1saW5lLmZtdFtqXSk7XG4gICAgICAgICAgICAgICAgZWxlbS5jKCdwYXlsb2FkLXR5cGUnLCBTRFBVdGlsLnBhcnNlX3J0cG1hcChydHBtYXApKTtcbiAgICAgICAgICAgICAgICAvLyBwdXQgYW55ICdhPWZtdHA6JyArIG1saW5lLmZtdFtqXSBsaW5lcyBpbnRvIDxwYXJhbSBuYW1lPWZvbyB2YWx1ZT1iYXIvPlxuICAgICAgICAgICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZSh0aGlzLm1lZGlhW2ldLCAnYT1mbXRwOicgKyBtbGluZS5mbXRbal0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHRtcCA9IFNEUFV0aWwucGFyc2VfZm10cChTRFBVdGlsLmZpbmRfbGluZSh0aGlzLm1lZGlhW2ldLCAnYT1mbXRwOicgKyBtbGluZS5mbXRbal0pKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChrID0gMDsgayA8IHRtcC5sZW5ndGg7IGsrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5jKCdwYXJhbWV0ZXInLCB0bXBba10pLnVwKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5SdGNwRmJUb0ppbmdsZShpLCBlbGVtLCBtbGluZS5mbXRbal0pOyAvLyBYRVAtMDI5MyAtLSBtYXAgYT1ydGNwLWZiXG5cbiAgICAgICAgICAgICAgICBlbGVtLnVwKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUodGhpcy5tZWRpYVtpXSwgJ2E9Y3J5cHRvOicsIHRoaXMuc2Vzc2lvbikpIHtcbiAgICAgICAgICAgICAgICBlbGVtLmMoJ2VuY3J5cHRpb24nLCB7cmVxdWlyZWQ6IDF9KTtcbiAgICAgICAgICAgICAgICB2YXIgY3J5cHRvID0gU0RQVXRpbC5maW5kX2xpbmVzKHRoaXMubWVkaWFbaV0sICdhPWNyeXB0bzonLCB0aGlzLnNlc3Npb24pO1xuICAgICAgICAgICAgICAgIGNyeXB0by5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5jKCdjcnlwdG8nLCBTRFBVdGlsLnBhcnNlX2NyeXB0byhsaW5lKSkudXAoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBlbGVtLnVwKCk7IC8vIGVuZCBvZiBlbmNyeXB0aW9uXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzc3JjKSB7XG4gICAgICAgICAgICAgICAgLy8gbmV3IHN0eWxlIG1hcHBpbmdcbiAgICAgICAgICAgICAgICBlbGVtLmMoJ3NvdXJjZScsIHsgc3NyYzogc3NyYywgeG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6c3NtYTowJyB9KTtcbiAgICAgICAgICAgICAgICAvLyBGSVhNRTogZ3JvdXAgYnkgc3NyYyBhbmQgc3VwcG9ydCBtdWx0aXBsZSBkaWZmZXJlbnQgc3NyY3NcbiAgICAgICAgICAgICAgICB2YXIgc3NyY2xpbmVzID0gU0RQVXRpbC5maW5kX2xpbmVzKHRoaXMubWVkaWFbaV0sICdhPXNzcmM6Jyk7XG4gICAgICAgICAgICAgICAgc3NyY2xpbmVzLmZvckVhY2goZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgICAgICAgICBpZHggPSBsaW5lLmluZGV4T2YoJyAnKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxpbmVzc3JjID0gbGluZS5zdWJzdHIoMCwgaWR4KS5zdWJzdHIoNyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsaW5lc3NyYyAhPSBzc3JjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtLnVwKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzc3JjID0gbGluZXNzcmM7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmMoJ3NvdXJjZScsIHsgc3NyYzogc3NyYywgeG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6c3NtYTowJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB2YXIga3YgPSBsaW5lLnN1YnN0cihpZHggKyAxKTtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5jKCdwYXJhbWV0ZXInKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGt2LmluZGV4T2YoJzonKSA9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5hdHRycyh7IG5hbWU6IGt2IH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5hdHRycyh7IG5hbWU6IGt2LnNwbGl0KCc6JywgMilbMF0gfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmF0dHJzKHsgdmFsdWU6IGt2LnNwbGl0KCc6JywgMilbMV0gfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxlbS51cCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGVsZW0udXAoKTtcblxuICAgICAgICAgICAgICAgIC8vIG9sZCBwcm9wcmlldGFyeSBtYXBwaW5nLCB0byBiZSByZW1vdmVkIGF0IHNvbWUgcG9pbnRcbiAgICAgICAgICAgICAgICB0bXAgPSBTRFBVdGlsLnBhcnNlX3NzcmModGhpcy5tZWRpYVtpXSk7XG4gICAgICAgICAgICAgICAgdG1wLnhtbG5zID0gJ2h0dHA6Ly9lc3Rvcy5kZS9ucy9zc3JjJztcbiAgICAgICAgICAgICAgICB0bXAuc3NyYyA9IHNzcmM7XG4gICAgICAgICAgICAgICAgZWxlbS5jKCdzc3JjJywgdG1wKS51cCgpOyAvLyBzc3JjIGlzIHBhcnQgb2YgZGVzY3JpcHRpb25cblxuICAgICAgICAgICAgICAgIC8vIFhFUC0wMzM5IGhhbmRsZSBzc3JjLWdyb3VwIGF0dHJpYnV0ZXNcbiAgICAgICAgICAgICAgICB2YXIgc3NyY19ncm91cF9saW5lcyA9IFNEUFV0aWwuZmluZF9saW5lcyh0aGlzLm1lZGlhW2ldLCAnYT1zc3JjLWdyb3VwOicpO1xuICAgICAgICAgICAgICAgIHNzcmNfZ3JvdXBfbGluZXMuZm9yRWFjaChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICAgICAgICAgIGlkeCA9IGxpbmUuaW5kZXhPZignICcpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2VtYW50aWNzID0gbGluZS5zdWJzdHIoMCwgaWR4KS5zdWJzdHIoMTMpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgc3NyY3MgPSBsaW5lLnN1YnN0cigxNCArIHNlbWFudGljcy5sZW5ndGgpLnNwbGl0KCcgJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzc3Jjcy5sZW5ndGggIT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5jKCdzc3JjLWdyb3VwJywgeyBzZW1hbnRpY3M6IHNlbWFudGljcywgeG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6c3NtYTowJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNzcmNzLmZvckVhY2goZnVuY3Rpb24oc3NyYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uYygnc291cmNlJywgeyBzc3JjOiBzc3JjIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC51cCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtLnVwKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKHRoaXMubWVkaWFbaV0sICdhPXJ0Y3AtbXV4JykpIHtcbiAgICAgICAgICAgICAgICBlbGVtLmMoJ3J0Y3AtbXV4JykudXAoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gWEVQLTAyOTMgLS0gbWFwIGE9cnRjcC1mYjoqXG4gICAgICAgICAgICB0aGlzLlJ0Y3BGYlRvSmluZ2xlKGksIGVsZW0sICcqJyk7XG5cbiAgICAgICAgICAgIC8vIFhFUC0wMjk0XG4gICAgICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUodGhpcy5tZWRpYVtpXSwgJ2E9ZXh0bWFwOicpKSB7XG4gICAgICAgICAgICAgICAgbGluZXMgPSBTRFBVdGlsLmZpbmRfbGluZXModGhpcy5tZWRpYVtpXSwgJ2E9ZXh0bWFwOicpO1xuICAgICAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBsaW5lcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICB0bXAgPSBTRFBVdGlsLnBhcnNlX2V4dG1hcChsaW5lc1tqXSk7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uYygncnRwLWhkcmV4dCcsIHsgeG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6cnRwLWhkcmV4dDowJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVyaTogdG1wLnVyaSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiB0bXAudmFsdWUgfSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0bXAuaGFzT3duUHJvcGVydHkoJ2RpcmVjdGlvbicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHRtcC5kaXJlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdzZW5kb25seSc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uYXR0cnMoe3NlbmRlcnM6ICdyZXNwb25kZXInfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3JlY3Zvbmx5JzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5hdHRycyh7c2VuZGVyczogJ2luaXRpYXRvcid9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnc2VuZHJlY3YnOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmF0dHJzKHtzZW5kZXJzOiAnYm90aCd9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnaW5hY3RpdmUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmF0dHJzKHtzZW5kZXJzOiAnbm9uZSd9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gVE9ETzogaGFuZGxlIHBhcmFtc1xuICAgICAgICAgICAgICAgICAgICBlbGVtLnVwKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxlbS51cCgpOyAvLyBlbmQgb2YgZGVzY3JpcHRpb25cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG1hcCBpY2UtdWZyYWcvcHdkLCBkdGxzIGZpbmdlcnByaW50LCBjYW5kaWRhdGVzXG4gICAgICAgIHRoaXMuVHJhbnNwb3J0VG9KaW5nbGUoaSwgZWxlbSk7XG5cbiAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKHRoaXMubWVkaWFbaV0sICdhPXNlbmRyZWN2JywgdGhpcy5zZXNzaW9uKSkge1xuICAgICAgICAgICAgZWxlbS5hdHRycyh7c2VuZGVyczogJ2JvdGgnfSk7XG4gICAgICAgIH0gZWxzZSBpZiAoU0RQVXRpbC5maW5kX2xpbmUodGhpcy5tZWRpYVtpXSwgJ2E9c2VuZG9ubHknLCB0aGlzLnNlc3Npb24pKSB7XG4gICAgICAgICAgICBlbGVtLmF0dHJzKHtzZW5kZXJzOiAnaW5pdGlhdG9yJ30pO1xuICAgICAgICB9IGVsc2UgaWYgKFNEUFV0aWwuZmluZF9saW5lKHRoaXMubWVkaWFbaV0sICdhPXJlY3Zvbmx5JywgdGhpcy5zZXNzaW9uKSkge1xuICAgICAgICAgICAgZWxlbS5hdHRycyh7c2VuZGVyczogJ3Jlc3BvbmRlcid9KTtcbiAgICAgICAgfSBlbHNlIGlmIChTRFBVdGlsLmZpbmRfbGluZSh0aGlzLm1lZGlhW2ldLCAnYT1pbmFjdGl2ZScsIHRoaXMuc2Vzc2lvbikpIHtcbiAgICAgICAgICAgIGVsZW0uYXR0cnMoe3NlbmRlcnM6ICdub25lJ30pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtbGluZS5wb3J0ID09ICcwJykge1xuICAgICAgICAgICAgLy8gZXN0b3MgaGFjayB0byByZWplY3QgYW4gbS1saW5lXG4gICAgICAgICAgICBlbGVtLmF0dHJzKHtzZW5kZXJzOiAncmVqZWN0ZWQnfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxlbS51cCgpOyAvLyBlbmQgb2YgY29udGVudFxuICAgIH1cbiAgICBlbGVtLnVwKCk7XG4gICAgcmV0dXJuIGVsZW07XG59O1xuXG5TRFAucHJvdG90eXBlLlRyYW5zcG9ydFRvSmluZ2xlID0gZnVuY3Rpb24gKG1lZGlhaW5kZXgsIGVsZW0pIHtcbiAgICB2YXIgaSA9IG1lZGlhaW5kZXg7XG4gICAgdmFyIHRtcDtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgZWxlbS5jKCd0cmFuc3BvcnQnKTtcblxuICAgIC8vIFhFUC0wMzQzIERUTFMvU0NUUFxuICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZSh0aGlzLm1lZGlhW21lZGlhaW5kZXhdLCAnYT1zY3RwbWFwOicpLmxlbmd0aClcbiAgICB7XG4gICAgICAgIHZhciBzY3RwbWFwID0gU0RQVXRpbC5maW5kX2xpbmUoXG4gICAgICAgICAgICB0aGlzLm1lZGlhW2ldLCAnYT1zY3RwbWFwOicsIHNlbGYuc2Vzc2lvbik7XG4gICAgICAgIGlmIChzY3RwbWFwKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgc2N0cEF0dHJzID0gU0RQVXRpbC5wYXJzZV9zY3RwbWFwKHNjdHBtYXApO1xuICAgICAgICAgICAgZWxlbS5jKCdzY3RwbWFwJyxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHhtbG5zOiAndXJuOnhtcHA6amluZ2xlOnRyYW5zcG9ydHM6ZHRscy1zY3RwOjEnLFxuICAgICAgICAgICAgICAgICAgICBudW1iZXI6IHNjdHBBdHRyc1swXSwgLyogU0NUUCBwb3J0ICovXG4gICAgICAgICAgICAgICAgICAgIHByb3RvY29sOiBzY3RwQXR0cnNbMV0sIC8qIHByb3RvY29sICovXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLyBPcHRpb25hbCBzdHJlYW0gY291bnQgYXR0cmlidXRlXG4gICAgICAgICAgICBpZiAoc2N0cEF0dHJzLmxlbmd0aCA+IDIpXG4gICAgICAgICAgICAgICAgZWxlbS5hdHRycyh7IHN0cmVhbXM6IHNjdHBBdHRyc1syXX0pO1xuICAgICAgICAgICAgZWxlbS51cCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIFhFUC0wMzIwXG4gICAgdmFyIGZpbmdlcnByaW50cyA9IFNEUFV0aWwuZmluZF9saW5lcyh0aGlzLm1lZGlhW21lZGlhaW5kZXhdLCAnYT1maW5nZXJwcmludDonLCB0aGlzLnNlc3Npb24pO1xuICAgIGZpbmdlcnByaW50cy5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgdG1wID0gU0RQVXRpbC5wYXJzZV9maW5nZXJwcmludChsaW5lKTtcbiAgICAgICAgdG1wLnhtbG5zID0gJ3Vybjp4bXBwOmppbmdsZTphcHBzOmR0bHM6MCc7XG4gICAgICAgIGVsZW0uYygnZmluZ2VycHJpbnQnKS50KHRtcC5maW5nZXJwcmludCk7XG4gICAgICAgIGRlbGV0ZSB0bXAuZmluZ2VycHJpbnQ7XG4gICAgICAgIGxpbmUgPSBTRFBVdGlsLmZpbmRfbGluZShzZWxmLm1lZGlhW21lZGlhaW5kZXhdLCAnYT1zZXR1cDonLCBzZWxmLnNlc3Npb24pO1xuICAgICAgICBpZiAobGluZSkge1xuICAgICAgICAgICAgdG1wLnNldHVwID0gbGluZS5zdWJzdHIoOCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxlbS5hdHRycyh0bXApO1xuICAgICAgICBlbGVtLnVwKCk7IC8vIGVuZCBvZiBmaW5nZXJwcmludFxuICAgIH0pO1xuICAgIHRtcCA9IFNEUFV0aWwuaWNlcGFyYW1zKHRoaXMubWVkaWFbbWVkaWFpbmRleF0sIHRoaXMuc2Vzc2lvbik7XG4gICAgaWYgKHRtcCkge1xuICAgICAgICB0bXAueG1sbnMgPSAndXJuOnhtcHA6amluZ2xlOnRyYW5zcG9ydHM6aWNlLXVkcDoxJztcbiAgICAgICAgZWxlbS5hdHRycyh0bXApO1xuICAgICAgICAvLyBYRVAtMDE3NlxuICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUodGhpcy5tZWRpYVttZWRpYWluZGV4XSwgJ2E9Y2FuZGlkYXRlOicsIHRoaXMuc2Vzc2lvbikpIHsgLy8gYWRkIGFueSBhPWNhbmRpZGF0ZSBsaW5lc1xuICAgICAgICAgICAgdmFyIGxpbmVzID0gU0RQVXRpbC5maW5kX2xpbmVzKHRoaXMubWVkaWFbbWVkaWFpbmRleF0sICdhPWNhbmRpZGF0ZTonLCB0aGlzLnNlc3Npb24pO1xuICAgICAgICAgICAgbGluZXMuZm9yRWFjaChmdW5jdGlvbiAobGluZSkge1xuICAgICAgICAgICAgICAgIGVsZW0uYygnY2FuZGlkYXRlJywgU0RQVXRpbC5jYW5kaWRhdGVUb0ppbmdsZShsaW5lKSkudXAoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsZW0udXAoKTsgLy8gZW5kIG9mIHRyYW5zcG9ydFxufVxuXG5TRFAucHJvdG90eXBlLlJ0Y3BGYlRvSmluZ2xlID0gZnVuY3Rpb24gKG1lZGlhaW5kZXgsIGVsZW0sIHBheWxvYWR0eXBlKSB7IC8vIFhFUC0wMjkzXG4gICAgdmFyIGxpbmVzID0gU0RQVXRpbC5maW5kX2xpbmVzKHRoaXMubWVkaWFbbWVkaWFpbmRleF0sICdhPXJ0Y3AtZmI6JyArIHBheWxvYWR0eXBlKTtcbiAgICBsaW5lcy5mb3JFYWNoKGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgIHZhciB0bXAgPSBTRFBVdGlsLnBhcnNlX3J0Y3BmYihsaW5lKTtcbiAgICAgICAgaWYgKHRtcC50eXBlID09ICd0cnItaW50Jykge1xuICAgICAgICAgICAgZWxlbS5jKCdydGNwLWZiLXRyci1pbnQnLCB7eG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6cnRjcC1mYjowJywgdmFsdWU6IHRtcC5wYXJhbXNbMF19KTtcbiAgICAgICAgICAgIGVsZW0udXAoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVsZW0uYygncnRjcC1mYicsIHt4bWxuczogJ3Vybjp4bXBwOmppbmdsZTphcHBzOnJ0cDpydGNwLWZiOjAnLCB0eXBlOiB0bXAudHlwZX0pO1xuICAgICAgICAgICAgaWYgKHRtcC5wYXJhbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGVsZW0uYXR0cnMoeydzdWJ0eXBlJzogdG1wLnBhcmFtc1swXX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxlbS51cCgpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5TRFAucHJvdG90eXBlLlJ0Y3BGYkZyb21KaW5nbGUgPSBmdW5jdGlvbiAoZWxlbSwgcGF5bG9hZHR5cGUpIHsgLy8gWEVQLTAyOTNcbiAgICB2YXIgbWVkaWEgPSAnJztcbiAgICB2YXIgdG1wID0gZWxlbS5maW5kKCc+cnRjcC1mYi10cnItaW50W3htbG5zPVwidXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOnJ0Y3AtZmI6MFwiXScpO1xuICAgIGlmICh0bXAubGVuZ3RoKSB7XG4gICAgICAgIG1lZGlhICs9ICdhPXJ0Y3AtZmI6JyArICcqJyArICcgJyArICd0cnItaW50JyArICcgJztcbiAgICAgICAgaWYgKHRtcC5hdHRyKCd2YWx1ZScpKSB7XG4gICAgICAgICAgICBtZWRpYSArPSB0bXAuYXR0cigndmFsdWUnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1lZGlhICs9ICcwJztcbiAgICAgICAgfVxuICAgICAgICBtZWRpYSArPSAnXFxyXFxuJztcbiAgICB9XG4gICAgdG1wID0gZWxlbS5maW5kKCc+cnRjcC1mYlt4bWxucz1cInVybjp4bXBwOmppbmdsZTphcHBzOnJ0cDpydGNwLWZiOjBcIl0nKTtcbiAgICB0bXAuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIG1lZGlhICs9ICdhPXJ0Y3AtZmI6JyArIHBheWxvYWR0eXBlICsgJyAnICsgJCh0aGlzKS5hdHRyKCd0eXBlJyk7XG4gICAgICAgIGlmICgkKHRoaXMpLmF0dHIoJ3N1YnR5cGUnKSkge1xuICAgICAgICAgICAgbWVkaWEgKz0gJyAnICsgJCh0aGlzKS5hdHRyKCdzdWJ0eXBlJyk7XG4gICAgICAgIH1cbiAgICAgICAgbWVkaWEgKz0gJ1xcclxcbic7XG4gICAgfSk7XG4gICAgcmV0dXJuIG1lZGlhO1xufTtcblxuLy8gY29uc3RydWN0IGFuIFNEUCBmcm9tIGEgamluZ2xlIHN0YW56YVxuU0RQLnByb3RvdHlwZS5mcm9tSmluZ2xlID0gZnVuY3Rpb24gKGppbmdsZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLnJhdyA9ICd2PTBcXHJcXG4nICtcbiAgICAgICAgJ289LSAnICsgJzE5MjM1MTg1MTYnICsgJyAyIElOIElQNCAwLjAuMC4wXFxyXFxuJyArLy8gRklYTUVcbiAgICAgICAgJ3M9LVxcclxcbicgK1xuICAgICAgICAndD0wIDBcXHJcXG4nO1xuICAgIC8vIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL2RyYWZ0LWlldGYtbW11c2ljLXNkcC1idW5kbGUtbmVnb3RpYXRpb24tMDQjc2VjdGlvbi04XG4gICAgaWYgKCQoamluZ2xlKS5maW5kKCc+Z3JvdXBbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6YXBwczpncm91cGluZzowXCJdJykubGVuZ3RoKSB7XG4gICAgICAgICQoamluZ2xlKS5maW5kKCc+Z3JvdXBbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6YXBwczpncm91cGluZzowXCJdJykuZWFjaChmdW5jdGlvbiAoaWR4LCBncm91cCkge1xuICAgICAgICAgICAgdmFyIGNvbnRlbnRzID0gJChncm91cCkuZmluZCgnPmNvbnRlbnQnKS5tYXAoZnVuY3Rpb24gKGlkeCwgY29udGVudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjb250ZW50LmdldEF0dHJpYnV0ZSgnbmFtZScpO1xuICAgICAgICAgICAgfSkuZ2V0KCk7XG4gICAgICAgICAgICBpZiAoY29udGVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHNlbGYucmF3ICs9ICdhPWdyb3VwOicgKyAoZ3JvdXAuZ2V0QXR0cmlidXRlKCdzZW1hbnRpY3MnKSB8fCBncm91cC5nZXRBdHRyaWJ1dGUoJ3R5cGUnKSkgKyAnICcgKyBjb250ZW50cy5qb2luKCcgJykgKyAnXFxyXFxuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIGlmICgkKGppbmdsZSkuZmluZCgnPmdyb3VwW3htbG5zPVwidXJuOmlldGY6cmZjOjU4ODhcIl0nKS5sZW5ndGgpIHtcbiAgICAgICAgLy8gdGVtcG9yYXJ5IG5hbWVzcGFjZSwgbm90IHRvIGJlIHVzZWQuIHRvIGJlIHJlbW92ZWQgc29vbi5cbiAgICAgICAgJChqaW5nbGUpLmZpbmQoJz5ncm91cFt4bWxucz1cInVybjppZXRmOnJmYzo1ODg4XCJdJykuZWFjaChmdW5jdGlvbiAoaWR4LCBncm91cCkge1xuICAgICAgICAgICAgdmFyIGNvbnRlbnRzID0gJChncm91cCkuZmluZCgnPmNvbnRlbnQnKS5tYXAoZnVuY3Rpb24gKGlkeCwgY29udGVudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjb250ZW50LmdldEF0dHJpYnV0ZSgnbmFtZScpO1xuICAgICAgICAgICAgfSkuZ2V0KCk7XG4gICAgICAgICAgICBpZiAoZ3JvdXAuZ2V0QXR0cmlidXRlKCd0eXBlJykgIT09IG51bGwgJiYgY29udGVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHNlbGYucmF3ICs9ICdhPWdyb3VwOicgKyBncm91cC5nZXRBdHRyaWJ1dGUoJ3R5cGUnKSArICcgJyArIGNvbnRlbnRzLmpvaW4oJyAnKSArICdcXHJcXG4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBmb3IgYmFja3dhcmQgY29tcGFiaWxpdHksIHRvIGJlIHJlbW92ZWQgc29vblxuICAgICAgICAvLyBhc3N1bWUgYWxsIGNvbnRlbnRzIGFyZSBpbiB0aGUgc2FtZSBidW5kbGUgZ3JvdXAsIGNhbiBiZSBpbXByb3ZlZCB1cG9uIGxhdGVyXG4gICAgICAgIHZhciBidW5kbGUgPSAkKGppbmdsZSkuZmluZCgnPmNvbnRlbnQnKS5maWx0ZXIoZnVuY3Rpb24gKGlkeCwgY29udGVudCkge1xuICAgICAgICAgICAgLy9lbGVtLmMoJ2J1bmRsZScsIHt4bWxuczonaHR0cDovL2VzdG9zLmRlL25zL2J1bmRsZSd9KTtcbiAgICAgICAgICAgIHJldHVybiAkKGNvbnRlbnQpLmZpbmQoJz5idW5kbGUnKS5sZW5ndGggPiAwO1xuICAgICAgICB9KS5tYXAoZnVuY3Rpb24gKGlkeCwgY29udGVudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjb250ZW50LmdldEF0dHJpYnV0ZSgnbmFtZScpO1xuICAgICAgICAgICAgfSkuZ2V0KCk7XG4gICAgICAgIGlmIChidW5kbGUubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnJhdyArPSAnYT1ncm91cDpCVU5ETEUgJyArIGJ1bmRsZS5qb2luKCcgJykgKyAnXFxyXFxuJztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuc2Vzc2lvbiA9IHRoaXMucmF3O1xuICAgIGppbmdsZS5maW5kKCc+Y29udGVudCcpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbSA9IHNlbGYuamluZ2xlMm1lZGlhKCQodGhpcykpO1xuICAgICAgICBzZWxmLm1lZGlhLnB1c2gobSk7XG4gICAgfSk7XG5cbiAgICAvLyByZWNvbnN0cnVjdCBtc2lkLXNlbWFudGljIC0tIGFwcGFyZW50bHkgbm90IG5lY2Vzc2FyeVxuICAgIC8qXG4gICAgIHZhciBtc2lkID0gU0RQVXRpbC5wYXJzZV9zc3JjKHRoaXMucmF3KTtcbiAgICAgaWYgKG1zaWQuaGFzT3duUHJvcGVydHkoJ21zbGFiZWwnKSkge1xuICAgICB0aGlzLnNlc3Npb24gKz0gXCJhPW1zaWQtc2VtYW50aWM6IFdNUyBcIiArIG1zaWQubXNsYWJlbCArIFwiXFxyXFxuXCI7XG4gICAgIH1cbiAgICAgKi9cblxuICAgIHRoaXMucmF3ID0gdGhpcy5zZXNzaW9uICsgdGhpcy5tZWRpYS5qb2luKCcnKTtcbn07XG5cbi8vIHRyYW5zbGF0ZSBhIGppbmdsZSBjb250ZW50IGVsZW1lbnQgaW50byBhbiBhbiBTRFAgbWVkaWEgcGFydFxuU0RQLnByb3RvdHlwZS5qaW5nbGUybWVkaWEgPSBmdW5jdGlvbiAoY29udGVudCkge1xuICAgIHZhciBtZWRpYSA9ICcnLFxuICAgICAgICBkZXNjID0gY29udGVudC5maW5kKCdkZXNjcmlwdGlvbicpLFxuICAgICAgICBzc3JjID0gZGVzYy5hdHRyKCdzc3JjJyksXG4gICAgICAgIHNlbGYgPSB0aGlzLFxuICAgICAgICB0bXA7XG4gICAgdmFyIHNjdHAgPSBjb250ZW50LmZpbmQoXG4gICAgICAgICc+dHJhbnNwb3J0PnNjdHBtYXBbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6dHJhbnNwb3J0czpkdGxzLXNjdHA6MVwiXScpO1xuXG4gICAgdG1wID0geyBtZWRpYTogZGVzYy5hdHRyKCdtZWRpYScpIH07XG4gICAgdG1wLnBvcnQgPSAnMSc7XG4gICAgaWYgKGNvbnRlbnQuYXR0cignc2VuZGVycycpID09ICdyZWplY3RlZCcpIHtcbiAgICAgICAgLy8gZXN0b3MgaGFjayB0byByZWplY3QgYW4gbS1saW5lLlxuICAgICAgICB0bXAucG9ydCA9ICcwJztcbiAgICB9XG4gICAgaWYgKGNvbnRlbnQuZmluZCgnPnRyYW5zcG9ydD5maW5nZXJwcmludCcpLmxlbmd0aCB8fCBkZXNjLmZpbmQoJ2VuY3J5cHRpb24nKS5sZW5ndGgpIHtcbiAgICAgICAgaWYgKHNjdHAubGVuZ3RoKVxuICAgICAgICAgICAgdG1wLnByb3RvID0gJ0RUTFMvU0NUUCc7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHRtcC5wcm90byA9ICdSVFAvU0FWUEYnO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRtcC5wcm90byA9ICdSVFAvQVZQRic7XG4gICAgfVxuICAgIGlmICghc2N0cC5sZW5ndGgpXG4gICAge1xuICAgICAgICB0bXAuZm10ID0gZGVzYy5maW5kKCdwYXlsb2FkLXR5cGUnKS5tYXAoXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnaWQnKTsgfSkuZ2V0KCk7XG4gICAgICAgIG1lZGlhICs9IFNEUFV0aWwuYnVpbGRfbWxpbmUodG1wKSArICdcXHJcXG4nO1xuICAgIH1cbiAgICBlbHNlXG4gICAge1xuICAgICAgICBtZWRpYSArPSAnbT1hcHBsaWNhdGlvbiAxIERUTFMvU0NUUCAnICsgc2N0cC5hdHRyKCdudW1iZXInKSArICdcXHJcXG4nO1xuICAgICAgICBtZWRpYSArPSAnYT1zY3RwbWFwOicgKyBzY3RwLmF0dHIoJ251bWJlcicpICtcbiAgICAgICAgICAgICcgJyArIHNjdHAuYXR0cigncHJvdG9jb2wnKTtcblxuICAgICAgICB2YXIgc3RyZWFtQ291bnQgPSBzY3RwLmF0dHIoJ3N0cmVhbXMnKTtcbiAgICAgICAgaWYgKHN0cmVhbUNvdW50KVxuICAgICAgICAgICAgbWVkaWEgKz0gJyAnICsgc3RyZWFtQ291bnQgKyAnXFxyXFxuJztcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgbWVkaWEgKz0gJ1xcclxcbic7XG4gICAgfVxuXG4gICAgbWVkaWEgKz0gJ2M9SU4gSVA0IDAuMC4wLjBcXHJcXG4nO1xuICAgIGlmICghc2N0cC5sZW5ndGgpXG4gICAgICAgIG1lZGlhICs9ICdhPXJ0Y3A6MSBJTiBJUDQgMC4wLjAuMFxcclxcbic7XG4gICAgdG1wID0gY29udGVudC5maW5kKCc+dHJhbnNwb3J0W3htbG5zPVwidXJuOnhtcHA6amluZ2xlOnRyYW5zcG9ydHM6aWNlLXVkcDoxXCJdJyk7XG4gICAgaWYgKHRtcC5sZW5ndGgpIHtcbiAgICAgICAgaWYgKHRtcC5hdHRyKCd1ZnJhZycpKSB7XG4gICAgICAgICAgICBtZWRpYSArPSBTRFBVdGlsLmJ1aWxkX2ljZXVmcmFnKHRtcC5hdHRyKCd1ZnJhZycpKSArICdcXHJcXG4nO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0bXAuYXR0cigncHdkJykpIHtcbiAgICAgICAgICAgIG1lZGlhICs9IFNEUFV0aWwuYnVpbGRfaWNlcHdkKHRtcC5hdHRyKCdwd2QnKSkgKyAnXFxyXFxuJztcbiAgICAgICAgfVxuICAgICAgICB0bXAuZmluZCgnPmZpbmdlcnByaW50JykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBGSVhNRTogY2hlY2sgbmFtZXNwYWNlIGF0IHNvbWUgcG9pbnRcbiAgICAgICAgICAgIG1lZGlhICs9ICdhPWZpbmdlcnByaW50OicgKyB0aGlzLmdldEF0dHJpYnV0ZSgnaGFzaCcpO1xuICAgICAgICAgICAgbWVkaWEgKz0gJyAnICsgJCh0aGlzKS50ZXh0KCk7XG4gICAgICAgICAgICBtZWRpYSArPSAnXFxyXFxuJztcbiAgICAgICAgICAgIGlmICh0aGlzLmdldEF0dHJpYnV0ZSgnc2V0dXAnKSkge1xuICAgICAgICAgICAgICAgIG1lZGlhICs9ICdhPXNldHVwOicgKyB0aGlzLmdldEF0dHJpYnV0ZSgnc2V0dXAnKSArICdcXHJcXG4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgc3dpdGNoIChjb250ZW50LmF0dHIoJ3NlbmRlcnMnKSkge1xuICAgICAgICBjYXNlICdpbml0aWF0b3InOlxuICAgICAgICAgICAgbWVkaWEgKz0gJ2E9c2VuZG9ubHlcXHJcXG4nO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3Jlc3BvbmRlcic6XG4gICAgICAgICAgICBtZWRpYSArPSAnYT1yZWN2b25seVxcclxcbic7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICBtZWRpYSArPSAnYT1pbmFjdGl2ZVxcclxcbic7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnYm90aCc6XG4gICAgICAgICAgICBtZWRpYSArPSAnYT1zZW5kcmVjdlxcclxcbic7XG4gICAgICAgICAgICBicmVhaztcbiAgICB9XG4gICAgbWVkaWEgKz0gJ2E9bWlkOicgKyBjb250ZW50LmF0dHIoJ25hbWUnKSArICdcXHJcXG4nO1xuXG4gICAgLy8gPGRlc2NyaXB0aW9uPjxydGNwLW11eC8+PC9kZXNjcmlwdGlvbj5cbiAgICAvLyBzZWUgaHR0cDovL2NvZGUuZ29vZ2xlLmNvbS9wL2xpYmppbmdsZS9pc3N1ZXMvZGV0YWlsP2lkPTMwOSAtLSBubyBzcGVjIHRob3VnaFxuICAgIC8vIGFuZCBodHRwOi8vbWFpbC5qYWJiZXIub3JnL3BpcGVybWFpbC9qaW5nbGUvMjAxMS1EZWNlbWJlci8wMDE3NjEuaHRtbFxuICAgIGlmIChkZXNjLmZpbmQoJ3J0Y3AtbXV4JykubGVuZ3RoKSB7XG4gICAgICAgIG1lZGlhICs9ICdhPXJ0Y3AtbXV4XFxyXFxuJztcbiAgICB9XG5cbiAgICBpZiAoZGVzYy5maW5kKCdlbmNyeXB0aW9uJykubGVuZ3RoKSB7XG4gICAgICAgIGRlc2MuZmluZCgnZW5jcnlwdGlvbj5jcnlwdG8nKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIG1lZGlhICs9ICdhPWNyeXB0bzonICsgdGhpcy5nZXRBdHRyaWJ1dGUoJ3RhZycpO1xuICAgICAgICAgICAgbWVkaWEgKz0gJyAnICsgdGhpcy5nZXRBdHRyaWJ1dGUoJ2NyeXB0by1zdWl0ZScpO1xuICAgICAgICAgICAgbWVkaWEgKz0gJyAnICsgdGhpcy5nZXRBdHRyaWJ1dGUoJ2tleS1wYXJhbXMnKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmdldEF0dHJpYnV0ZSgnc2Vzc2lvbi1wYXJhbXMnKSkge1xuICAgICAgICAgICAgICAgIG1lZGlhICs9ICcgJyArIHRoaXMuZ2V0QXR0cmlidXRlKCdzZXNzaW9uLXBhcmFtcycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbWVkaWEgKz0gJ1xcclxcbic7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBkZXNjLmZpbmQoJ3BheWxvYWQtdHlwZScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBtZWRpYSArPSBTRFBVdGlsLmJ1aWxkX3J0cG1hcCh0aGlzKSArICdcXHJcXG4nO1xuICAgICAgICBpZiAoJCh0aGlzKS5maW5kKCc+cGFyYW1ldGVyJykubGVuZ3RoKSB7XG4gICAgICAgICAgICBtZWRpYSArPSAnYT1mbXRwOicgKyB0aGlzLmdldEF0dHJpYnV0ZSgnaWQnKSArICcgJztcbiAgICAgICAgICAgIG1lZGlhICs9ICQodGhpcykuZmluZCgncGFyYW1ldGVyJykubWFwKGZ1bmN0aW9uICgpIHsgcmV0dXJuICh0aGlzLmdldEF0dHJpYnV0ZSgnbmFtZScpID8gKHRoaXMuZ2V0QXR0cmlidXRlKCduYW1lJykgKyAnPScpIDogJycpICsgdGhpcy5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJyk7IH0pLmdldCgpLmpvaW4oJzsnKTtcbiAgICAgICAgICAgIG1lZGlhICs9ICdcXHJcXG4nO1xuICAgICAgICB9XG4gICAgICAgIC8vIHhlcC0wMjkzXG4gICAgICAgIG1lZGlhICs9IHNlbGYuUnRjcEZiRnJvbUppbmdsZSgkKHRoaXMpLCB0aGlzLmdldEF0dHJpYnV0ZSgnaWQnKSk7XG4gICAgfSk7XG5cbiAgICAvLyB4ZXAtMDI5M1xuICAgIG1lZGlhICs9IHNlbGYuUnRjcEZiRnJvbUppbmdsZShkZXNjLCAnKicpO1xuXG4gICAgLy8geGVwLTAyOTRcbiAgICB0bXAgPSBkZXNjLmZpbmQoJz5ydHAtaGRyZXh0W3htbG5zPVwidXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOnJ0cC1oZHJleHQ6MFwiXScpO1xuICAgIHRtcC5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbWVkaWEgKz0gJ2E9ZXh0bWFwOicgKyB0aGlzLmdldEF0dHJpYnV0ZSgnaWQnKSArICcgJyArIHRoaXMuZ2V0QXR0cmlidXRlKCd1cmknKSArICdcXHJcXG4nO1xuICAgIH0pO1xuXG4gICAgY29udGVudC5maW5kKCc+dHJhbnNwb3J0W3htbG5zPVwidXJuOnhtcHA6amluZ2xlOnRyYW5zcG9ydHM6aWNlLXVkcDoxXCJdPmNhbmRpZGF0ZScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBtZWRpYSArPSBTRFBVdGlsLmNhbmRpZGF0ZUZyb21KaW5nbGUodGhpcyk7XG4gICAgfSk7XG5cbiAgICAvLyBYRVAtMDMzOSBoYW5kbGUgc3NyYy1ncm91cCBhdHRyaWJ1dGVzXG4gICAgdG1wID0gY29udGVudC5maW5kKCdkZXNjcmlwdGlvbj5zc3JjLWdyb3VwW3htbG5zPVwidXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOnNzbWE6MFwiXScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzZW1hbnRpY3MgPSB0aGlzLmdldEF0dHJpYnV0ZSgnc2VtYW50aWNzJyk7XG4gICAgICAgIHZhciBzc3JjcyA9ICQodGhpcykuZmluZCgnPnNvdXJjZScpLm1hcChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnc3NyYycpO1xuICAgICAgICB9KS5nZXQoKTtcblxuICAgICAgICBpZiAoc3NyY3MubGVuZ3RoICE9IDApIHtcbiAgICAgICAgICAgIG1lZGlhICs9ICdhPXNzcmMtZ3JvdXA6JyArIHNlbWFudGljcyArICcgJyArIHNzcmNzLmpvaW4oJyAnKSArICdcXHJcXG4nO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB0bXAgPSBjb250ZW50LmZpbmQoJ2Rlc2NyaXB0aW9uPnNvdXJjZVt4bWxucz1cInVybjp4bXBwOmppbmdsZTphcHBzOnJ0cDpzc21hOjBcIl0nKTtcbiAgICB0bXAuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzc3JjID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ3NzcmMnKTtcbiAgICAgICAgJCh0aGlzKS5maW5kKCc+cGFyYW1ldGVyJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBtZWRpYSArPSAnYT1zc3JjOicgKyBzc3JjICsgJyAnICsgdGhpcy5nZXRBdHRyaWJ1dGUoJ25hbWUnKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmdldEF0dHJpYnV0ZSgndmFsdWUnKSAmJiB0aGlzLmdldEF0dHJpYnV0ZSgndmFsdWUnKS5sZW5ndGgpXG4gICAgICAgICAgICAgICAgbWVkaWEgKz0gJzonICsgdGhpcy5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJyk7XG4gICAgICAgICAgICBtZWRpYSArPSAnXFxyXFxuJztcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBpZiAodG1wLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAvLyBmYWxsYmFjayB0byBwcm9wcmlldGFyeSBtYXBwaW5nIG9mIGE9c3NyYyBsaW5lc1xuICAgICAgICB0bXAgPSBjb250ZW50LmZpbmQoJ2Rlc2NyaXB0aW9uPnNzcmNbeG1sbnM9XCJodHRwOi8vZXN0b3MuZGUvbnMvc3NyY1wiXScpO1xuICAgICAgICBpZiAodG1wLmxlbmd0aCkge1xuICAgICAgICAgICAgbWVkaWEgKz0gJ2E9c3NyYzonICsgc3NyYyArICcgY25hbWU6JyArIHRtcC5hdHRyKCdjbmFtZScpICsgJ1xcclxcbic7XG4gICAgICAgICAgICBtZWRpYSArPSAnYT1zc3JjOicgKyBzc3JjICsgJyBtc2lkOicgKyB0bXAuYXR0cignbXNpZCcpICsgJ1xcclxcbic7XG4gICAgICAgICAgICBtZWRpYSArPSAnYT1zc3JjOicgKyBzc3JjICsgJyBtc2xhYmVsOicgKyB0bXAuYXR0cignbXNsYWJlbCcpICsgJ1xcclxcbic7XG4gICAgICAgICAgICBtZWRpYSArPSAnYT1zc3JjOicgKyBzc3JjICsgJyBsYWJlbDonICsgdG1wLmF0dHIoJ2xhYmVsJykgKyAnXFxyXFxuJztcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWVkaWE7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNEUDtcbiIsIi8qKlxuICogQ29udGFpbnMgdXRpbGl0eSBjbGFzc2VzIHVzZWQgaW4gU0RQIGNsYXNzLlxuICpcbiAqL1xuXG5TRFBVdGlsID0ge1xuICAgIGljZXBhcmFtczogZnVuY3Rpb24gKG1lZGlhZGVzYywgc2Vzc2lvbmRlc2MpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBudWxsO1xuICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUobWVkaWFkZXNjLCAnYT1pY2UtdWZyYWc6Jywgc2Vzc2lvbmRlc2MpICYmXG4gICAgICAgICAgICBTRFBVdGlsLmZpbmRfbGluZShtZWRpYWRlc2MsICdhPWljZS1wd2Q6Jywgc2Vzc2lvbmRlc2MpKSB7XG4gICAgICAgICAgICBkYXRhID0ge1xuICAgICAgICAgICAgICAgIHVmcmFnOiBTRFBVdGlsLnBhcnNlX2ljZXVmcmFnKFNEUFV0aWwuZmluZF9saW5lKG1lZGlhZGVzYywgJ2E9aWNlLXVmcmFnOicsIHNlc3Npb25kZXNjKSksXG4gICAgICAgICAgICAgICAgcHdkOiBTRFBVdGlsLnBhcnNlX2ljZXB3ZChTRFBVdGlsLmZpbmRfbGluZShtZWRpYWRlc2MsICdhPWljZS1wd2Q6Jywgc2Vzc2lvbmRlc2MpKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9LFxuICAgIHBhcnNlX2ljZXVmcmFnOiBmdW5jdGlvbiAobGluZSkge1xuICAgICAgICByZXR1cm4gbGluZS5zdWJzdHJpbmcoMTIpO1xuICAgIH0sXG4gICAgYnVpbGRfaWNldWZyYWc6IGZ1bmN0aW9uIChmcmFnKSB7XG4gICAgICAgIHJldHVybiAnYT1pY2UtdWZyYWc6JyArIGZyYWc7XG4gICAgfSxcbiAgICBwYXJzZV9pY2Vwd2Q6IGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgIHJldHVybiBsaW5lLnN1YnN0cmluZygxMCk7XG4gICAgfSxcbiAgICBidWlsZF9pY2Vwd2Q6IGZ1bmN0aW9uIChwd2QpIHtcbiAgICAgICAgcmV0dXJuICdhPWljZS1wd2Q6JyArIHB3ZDtcbiAgICB9LFxuICAgIHBhcnNlX21pZDogZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgcmV0dXJuIGxpbmUuc3Vic3RyaW5nKDYpO1xuICAgIH0sXG4gICAgcGFyc2VfbWxpbmU6IGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgIHZhciBwYXJ0cyA9IGxpbmUuc3Vic3RyaW5nKDIpLnNwbGl0KCcgJyksXG4gICAgICAgICAgICBkYXRhID0ge307XG4gICAgICAgIGRhdGEubWVkaWEgPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAgICBkYXRhLnBvcnQgPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAgICBkYXRhLnByb3RvID0gcGFydHMuc2hpZnQoKTtcbiAgICAgICAgaWYgKHBhcnRzW3BhcnRzLmxlbmd0aCAtIDFdID09PSAnJykgeyAvLyB0cmFpbGluZyB3aGl0ZXNwYWNlXG4gICAgICAgICAgICBwYXJ0cy5wb3AoKTtcbiAgICAgICAgfVxuICAgICAgICBkYXRhLmZtdCA9IHBhcnRzO1xuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9LFxuICAgIGJ1aWxkX21saW5lOiBmdW5jdGlvbiAobWxpbmUpIHtcbiAgICAgICAgcmV0dXJuICdtPScgKyBtbGluZS5tZWRpYSArICcgJyArIG1saW5lLnBvcnQgKyAnICcgKyBtbGluZS5wcm90byArICcgJyArIG1saW5lLmZtdC5qb2luKCcgJyk7XG4gICAgfSxcbiAgICBwYXJzZV9ydHBtYXA6IGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgIHZhciBwYXJ0cyA9IGxpbmUuc3Vic3RyaW5nKDkpLnNwbGl0KCcgJyksXG4gICAgICAgICAgICBkYXRhID0ge307XG4gICAgICAgIGRhdGEuaWQgPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAgICBwYXJ0cyA9IHBhcnRzWzBdLnNwbGl0KCcvJyk7XG4gICAgICAgIGRhdGEubmFtZSA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICAgIGRhdGEuY2xvY2tyYXRlID0gcGFydHMuc2hpZnQoKTtcbiAgICAgICAgZGF0YS5jaGFubmVscyA9IHBhcnRzLmxlbmd0aCA/IHBhcnRzLnNoaWZ0KCkgOiAnMSc7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogUGFyc2VzIFNEUCBsaW5lIFwiYT1zY3RwbWFwOi4uLlwiIGFuZCBleHRyYWN0cyBTQ1RQIHBvcnQgZnJvbSBpdC5cbiAgICAgKiBAcGFyYW0gbGluZSBlZy4gXCJhPXNjdHBtYXA6NTAwMCB3ZWJydGMtZGF0YWNoYW5uZWxcIlxuICAgICAqIEByZXR1cm5zIFtTQ1RQIHBvcnQgbnVtYmVyLCBwcm90b2NvbCwgc3RyZWFtc11cbiAgICAgKi9cbiAgICBwYXJzZV9zY3RwbWFwOiBmdW5jdGlvbiAobGluZSlcbiAgICB7XG4gICAgICAgIHZhciBwYXJ0cyA9IGxpbmUuc3Vic3RyaW5nKDEwKS5zcGxpdCgnICcpO1xuICAgICAgICB2YXIgc2N0cFBvcnQgPSBwYXJ0c1swXTtcbiAgICAgICAgdmFyIHByb3RvY29sID0gcGFydHNbMV07XG4gICAgICAgIC8vIFN0cmVhbSBjb3VudCBpcyBvcHRpb25hbFxuICAgICAgICB2YXIgc3RyZWFtQ291bnQgPSBwYXJ0cy5sZW5ndGggPiAyID8gcGFydHNbMl0gOiBudWxsO1xuICAgICAgICByZXR1cm4gW3NjdHBQb3J0LCBwcm90b2NvbCwgc3RyZWFtQ291bnRdOy8vIFNDVFAgcG9ydFxuICAgIH0sXG4gICAgYnVpbGRfcnRwbWFwOiBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgdmFyIGxpbmUgPSAnYT1ydHBtYXA6JyArIGVsLmdldEF0dHJpYnV0ZSgnaWQnKSArICcgJyArIGVsLmdldEF0dHJpYnV0ZSgnbmFtZScpICsgJy8nICsgZWwuZ2V0QXR0cmlidXRlKCdjbG9ja3JhdGUnKTtcbiAgICAgICAgaWYgKGVsLmdldEF0dHJpYnV0ZSgnY2hhbm5lbHMnKSAmJiBlbC5nZXRBdHRyaWJ1dGUoJ2NoYW5uZWxzJykgIT0gJzEnKSB7XG4gICAgICAgICAgICBsaW5lICs9ICcvJyArIGVsLmdldEF0dHJpYnV0ZSgnY2hhbm5lbHMnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGluZTtcbiAgICB9LFxuICAgIHBhcnNlX2NyeXB0bzogZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgdmFyIHBhcnRzID0gbGluZS5zdWJzdHJpbmcoOSkuc3BsaXQoJyAnKSxcbiAgICAgICAgICAgIGRhdGEgPSB7fTtcbiAgICAgICAgZGF0YS50YWcgPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAgICBkYXRhWydjcnlwdG8tc3VpdGUnXSA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICAgIGRhdGFbJ2tleS1wYXJhbXMnXSA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICAgIGlmIChwYXJ0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGRhdGFbJ3Nlc3Npb24tcGFyYW1zJ10gPSBwYXJ0cy5qb2luKCcgJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSxcbiAgICBwYXJzZV9maW5nZXJwcmludDogZnVuY3Rpb24gKGxpbmUpIHsgLy8gUkZDIDQ1NzJcbiAgICAgICAgdmFyIHBhcnRzID0gbGluZS5zdWJzdHJpbmcoMTQpLnNwbGl0KCcgJyksXG4gICAgICAgICAgICBkYXRhID0ge307XG4gICAgICAgIGRhdGEuaGFzaCA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICAgIGRhdGEuZmluZ2VycHJpbnQgPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAgICAvLyBUT0RPIGFzc2VydCB0aGF0IGZpbmdlcnByaW50IHNhdGlzZmllcyAyVUhFWCAqKFwiOlwiIDJVSEVYKSA/XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH0sXG4gICAgcGFyc2VfZm10cDogZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgdmFyIHBhcnRzID0gbGluZS5zcGxpdCgnICcpLFxuICAgICAgICAgICAgaSwga2V5LCB2YWx1ZSxcbiAgICAgICAgICAgIGRhdGEgPSBbXTtcbiAgICAgICAgcGFydHMuc2hpZnQoKTtcbiAgICAgICAgcGFydHMgPSBwYXJ0cy5qb2luKCcgJykuc3BsaXQoJzsnKTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBrZXkgPSBwYXJ0c1tpXS5zcGxpdCgnPScpWzBdO1xuICAgICAgICAgICAgd2hpbGUgKGtleS5sZW5ndGggJiYga2V5WzBdID09ICcgJykge1xuICAgICAgICAgICAgICAgIGtleSA9IGtleS5zdWJzdHJpbmcoMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YWx1ZSA9IHBhcnRzW2ldLnNwbGl0KCc9JylbMV07XG4gICAgICAgICAgICBpZiAoa2V5ICYmIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgZGF0YS5wdXNoKHtuYW1lOiBrZXksIHZhbHVlOiB2YWx1ZX0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChrZXkpIHtcbiAgICAgICAgICAgICAgICAvLyByZmMgNDczMyAoRFRNRikgc3R5bGUgc3R1ZmZcbiAgICAgICAgICAgICAgICBkYXRhLnB1c2goe25hbWU6ICcnLCB2YWx1ZToga2V5fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSxcbiAgICBwYXJzZV9pY2VjYW5kaWRhdGU6IGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgIHZhciBjYW5kaWRhdGUgPSB7fSxcbiAgICAgICAgICAgIGVsZW1zID0gbGluZS5zcGxpdCgnICcpO1xuICAgICAgICBjYW5kaWRhdGUuZm91bmRhdGlvbiA9IGVsZW1zWzBdLnN1YnN0cmluZygxMik7XG4gICAgICAgIGNhbmRpZGF0ZS5jb21wb25lbnQgPSBlbGVtc1sxXTtcbiAgICAgICAgY2FuZGlkYXRlLnByb3RvY29sID0gZWxlbXNbMl0udG9Mb3dlckNhc2UoKTtcbiAgICAgICAgY2FuZGlkYXRlLnByaW9yaXR5ID0gZWxlbXNbM107XG4gICAgICAgIGNhbmRpZGF0ZS5pcCA9IGVsZW1zWzRdO1xuICAgICAgICBjYW5kaWRhdGUucG9ydCA9IGVsZW1zWzVdO1xuICAgICAgICAvLyBlbGVtc1s2XSA9PiBcInR5cFwiXG4gICAgICAgIGNhbmRpZGF0ZS50eXBlID0gZWxlbXNbN107XG4gICAgICAgIGNhbmRpZGF0ZS5nZW5lcmF0aW9uID0gMDsgLy8gZGVmYXVsdCB2YWx1ZSwgbWF5IGJlIG92ZXJ3cml0dGVuIGJlbG93XG4gICAgICAgIGZvciAodmFyIGkgPSA4OyBpIDwgZWxlbXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoZWxlbXNbaV0pIHtcbiAgICAgICAgICAgICAgICBjYXNlICdyYWRkcic6XG4gICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZVsncmVsLWFkZHInXSA9IGVsZW1zW2kgKyAxXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAncnBvcnQnOlxuICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGVbJ3JlbC1wb3J0J10gPSBlbGVtc1tpICsgMV07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2dlbmVyYXRpb24nOlxuICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGUuZ2VuZXJhdGlvbiA9IGVsZW1zW2kgKyAxXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAndGNwdHlwZSc6XG4gICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZS50Y3B0eXBlID0gZWxlbXNbaSArIDFdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiAvLyBUT0RPXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwYXJzZV9pY2VjYW5kaWRhdGUgbm90IHRyYW5zbGF0aW5nIFwiJyArIGVsZW1zW2ldICsgJ1wiID0gXCInICsgZWxlbXNbaSArIDFdICsgJ1wiJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2FuZGlkYXRlLm5ldHdvcmsgPSAnMSc7XG4gICAgICAgIGNhbmRpZGF0ZS5pZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCAxMCk7IC8vIG5vdCBhcHBsaWNhYmxlIHRvIFNEUCAtLSBGSVhNRTogc2hvdWxkIGJlIHVuaXF1ZSwgbm90IGp1c3QgcmFuZG9tXG4gICAgICAgIHJldHVybiBjYW5kaWRhdGU7XG4gICAgfSxcbiAgICBidWlsZF9pY2VjYW5kaWRhdGU6IGZ1bmN0aW9uIChjYW5kKSB7XG4gICAgICAgIHZhciBsaW5lID0gWydhPWNhbmRpZGF0ZTonICsgY2FuZC5mb3VuZGF0aW9uLCBjYW5kLmNvbXBvbmVudCwgY2FuZC5wcm90b2NvbCwgY2FuZC5wcmlvcml0eSwgY2FuZC5pcCwgY2FuZC5wb3J0LCAndHlwJywgY2FuZC50eXBlXS5qb2luKCcgJyk7XG4gICAgICAgIGxpbmUgKz0gJyAnO1xuICAgICAgICBzd2l0Y2ggKGNhbmQudHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnc3JmbHgnOlxuICAgICAgICAgICAgY2FzZSAncHJmbHgnOlxuICAgICAgICAgICAgY2FzZSAncmVsYXknOlxuICAgICAgICAgICAgICAgIGlmIChjYW5kLmhhc093bkF0dHJpYnV0ZSgncmVsLWFkZHInKSAmJiBjYW5kLmhhc093bkF0dHJpYnV0ZSgncmVsLXBvcnQnKSkge1xuICAgICAgICAgICAgICAgICAgICBsaW5lICs9ICdyYWRkcic7XG4gICAgICAgICAgICAgICAgICAgIGxpbmUgKz0gJyAnO1xuICAgICAgICAgICAgICAgICAgICBsaW5lICs9IGNhbmRbJ3JlbC1hZGRyJ107XG4gICAgICAgICAgICAgICAgICAgIGxpbmUgKz0gJyAnO1xuICAgICAgICAgICAgICAgICAgICBsaW5lICs9ICdycG9ydCc7XG4gICAgICAgICAgICAgICAgICAgIGxpbmUgKz0gJyAnO1xuICAgICAgICAgICAgICAgICAgICBsaW5lICs9IGNhbmRbJ3JlbC1wb3J0J107XG4gICAgICAgICAgICAgICAgICAgIGxpbmUgKz0gJyAnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2FuZC5oYXNPd25BdHRyaWJ1dGUoJ3RjcHR5cGUnKSkge1xuICAgICAgICAgICAgbGluZSArPSAndGNwdHlwZSc7XG4gICAgICAgICAgICBsaW5lICs9ICcgJztcbiAgICAgICAgICAgIGxpbmUgKz0gY2FuZC50Y3B0eXBlO1xuICAgICAgICAgICAgbGluZSArPSAnICc7XG4gICAgICAgIH1cbiAgICAgICAgbGluZSArPSAnZ2VuZXJhdGlvbic7XG4gICAgICAgIGxpbmUgKz0gJyAnO1xuICAgICAgICBsaW5lICs9IGNhbmQuaGFzT3duQXR0cmlidXRlKCdnZW5lcmF0aW9uJykgPyBjYW5kLmdlbmVyYXRpb24gOiAnMCc7XG4gICAgICAgIHJldHVybiBsaW5lO1xuICAgIH0sXG4gICAgcGFyc2Vfc3NyYzogZnVuY3Rpb24gKGRlc2MpIHtcbiAgICAgICAgLy8gcHJvcHJpZXRhcnkgbWFwcGluZyBvZiBhPXNzcmMgbGluZXNcbiAgICAgICAgLy8gVE9ETzogc2VlIFwiSmluZ2xlIFJUUCBTb3VyY2UgRGVzY3JpcHRpb25cIiBieSBKdWJlcnRpIGFuZCBQLiBUaGF0Y2hlciBvbiBnb29nbGUgZG9jc1xuICAgICAgICAvLyBhbmQgcGFyc2UgYWNjb3JkaW5nIHRvIHRoYXRcbiAgICAgICAgdmFyIGxpbmVzID0gZGVzYy5zcGxpdCgnXFxyXFxuJyksXG4gICAgICAgICAgICBkYXRhID0ge307XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChsaW5lc1tpXS5zdWJzdHJpbmcoMCwgNykgPT0gJ2E9c3NyYzonKSB7XG4gICAgICAgICAgICAgICAgdmFyIGlkeCA9IGxpbmVzW2ldLmluZGV4T2YoJyAnKTtcbiAgICAgICAgICAgICAgICBkYXRhW2xpbmVzW2ldLnN1YnN0cihpZHggKyAxKS5zcGxpdCgnOicsIDIpWzBdXSA9IGxpbmVzW2ldLnN1YnN0cihpZHggKyAxKS5zcGxpdCgnOicsIDIpWzFdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH0sXG4gICAgcGFyc2VfcnRjcGZiOiBmdW5jdGlvbiAobGluZSkge1xuICAgICAgICB2YXIgcGFydHMgPSBsaW5lLnN1YnN0cigxMCkuc3BsaXQoJyAnKTtcbiAgICAgICAgdmFyIGRhdGEgPSB7fTtcbiAgICAgICAgZGF0YS5wdCA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICAgIGRhdGEudHlwZSA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICAgIGRhdGEucGFyYW1zID0gcGFydHM7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH0sXG4gICAgcGFyc2VfZXh0bWFwOiBmdW5jdGlvbiAobGluZSkge1xuICAgICAgICB2YXIgcGFydHMgPSBsaW5lLnN1YnN0cig5KS5zcGxpdCgnICcpO1xuICAgICAgICB2YXIgZGF0YSA9IHt9O1xuICAgICAgICBkYXRhLnZhbHVlID0gcGFydHMuc2hpZnQoKTtcbiAgICAgICAgaWYgKGRhdGEudmFsdWUuaW5kZXhPZignLycpICE9IC0xKSB7XG4gICAgICAgICAgICBkYXRhLmRpcmVjdGlvbiA9IGRhdGEudmFsdWUuc3Vic3RyKGRhdGEudmFsdWUuaW5kZXhPZignLycpICsgMSk7XG4gICAgICAgICAgICBkYXRhLnZhbHVlID0gZGF0YS52YWx1ZS5zdWJzdHIoMCwgZGF0YS52YWx1ZS5pbmRleE9mKCcvJykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGF0YS5kaXJlY3Rpb24gPSAnYm90aCc7XG4gICAgICAgIH1cbiAgICAgICAgZGF0YS51cmkgPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAgICBkYXRhLnBhcmFtcyA9IHBhcnRzO1xuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9LFxuICAgIGZpbmRfbGluZTogZnVuY3Rpb24gKGhheXN0YWNrLCBuZWVkbGUsIHNlc3Npb25wYXJ0KSB7XG4gICAgICAgIHZhciBsaW5lcyA9IGhheXN0YWNrLnNwbGl0KCdcXHJcXG4nKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKGxpbmVzW2ldLnN1YnN0cmluZygwLCBuZWVkbGUubGVuZ3RoKSA9PSBuZWVkbGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGluZXNbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFzZXNzaW9ucGFydCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vIHNlYXJjaCBzZXNzaW9uIHBhcnRcbiAgICAgICAgbGluZXMgPSBzZXNzaW9ucGFydC5zcGxpdCgnXFxyXFxuJyk7XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbGluZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIGlmIChsaW5lc1tqXS5zdWJzdHJpbmcoMCwgbmVlZGxlLmxlbmd0aCkgPT0gbmVlZGxlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpbmVzW2pdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuICAgIGZpbmRfbGluZXM6IGZ1bmN0aW9uIChoYXlzdGFjaywgbmVlZGxlLCBzZXNzaW9ucGFydCkge1xuICAgICAgICB2YXIgbGluZXMgPSBoYXlzdGFjay5zcGxpdCgnXFxyXFxuJyksXG4gICAgICAgICAgICBuZWVkbGVzID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChsaW5lc1tpXS5zdWJzdHJpbmcoMCwgbmVlZGxlLmxlbmd0aCkgPT0gbmVlZGxlKVxuICAgICAgICAgICAgICAgIG5lZWRsZXMucHVzaChsaW5lc1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5lZWRsZXMubGVuZ3RoIHx8ICFzZXNzaW9ucGFydCkge1xuICAgICAgICAgICAgcmV0dXJuIG5lZWRsZXM7XG4gICAgICAgIH1cbiAgICAgICAgLy8gc2VhcmNoIHNlc3Npb24gcGFydFxuICAgICAgICBsaW5lcyA9IHNlc3Npb25wYXJ0LnNwbGl0KCdcXHJcXG4nKTtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBsaW5lcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgaWYgKGxpbmVzW2pdLnN1YnN0cmluZygwLCBuZWVkbGUubGVuZ3RoKSA9PSBuZWVkbGUpIHtcbiAgICAgICAgICAgICAgICBuZWVkbGVzLnB1c2gobGluZXNbal0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZWVkbGVzO1xuICAgIH0sXG4gICAgY2FuZGlkYXRlVG9KaW5nbGU6IGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgIC8vIGE9Y2FuZGlkYXRlOjI5NzkxNjY2NjIgMSB1ZHAgMjExMzkzNzE1MSAxOTIuMTY4LjIuMTAwIDU3Njk4IHR5cCBob3N0IGdlbmVyYXRpb24gMFxuICAgICAgICAvLyAgICAgIDxjYW5kaWRhdGUgY29tcG9uZW50PS4uLiBmb3VuZGF0aW9uPS4uLiBnZW5lcmF0aW9uPS4uLiBpZD0uLi4gaXA9Li4uIG5ldHdvcms9Li4uIHBvcnQ9Li4uIHByaW9yaXR5PS4uLiBwcm90b2NvbD0uLi4gdHlwZT0uLi4vPlxuICAgICAgICBpZiAobGluZS5pbmRleE9mKCdjYW5kaWRhdGU6JykgPT09IDApIHtcbiAgICAgICAgICAgIGxpbmUgPSAnYT0nICsgbGluZTtcbiAgICAgICAgfSBlbHNlIGlmIChsaW5lLnN1YnN0cmluZygwLCAxMikgIT0gJ2E9Y2FuZGlkYXRlOicpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwYXJzZUNhbmRpZGF0ZSBjYWxsZWQgd2l0aCBhIGxpbmUgdGhhdCBpcyBub3QgYSBjYW5kaWRhdGUgbGluZScpO1xuICAgICAgICAgICAgY29uc29sZS5sb2cobGluZSk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAobGluZS5zdWJzdHJpbmcobGluZS5sZW5ndGggLSAyKSA9PSAnXFxyXFxuJykgLy8gY2hvbXAgaXRcbiAgICAgICAgICAgIGxpbmUgPSBsaW5lLnN1YnN0cmluZygwLCBsaW5lLmxlbmd0aCAtIDIpO1xuICAgICAgICB2YXIgY2FuZGlkYXRlID0ge30sXG4gICAgICAgICAgICBlbGVtcyA9IGxpbmUuc3BsaXQoJyAnKSxcbiAgICAgICAgICAgIGk7XG4gICAgICAgIGlmIChlbGVtc1s2XSAhPSAndHlwJykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2RpZCBub3QgZmluZCB0eXAgaW4gdGhlIHJpZ2h0IHBsYWNlJyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhsaW5lKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGNhbmRpZGF0ZS5mb3VuZGF0aW9uID0gZWxlbXNbMF0uc3Vic3RyaW5nKDEyKTtcbiAgICAgICAgY2FuZGlkYXRlLmNvbXBvbmVudCA9IGVsZW1zWzFdO1xuICAgICAgICBjYW5kaWRhdGUucHJvdG9jb2wgPSBlbGVtc1syXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBjYW5kaWRhdGUucHJpb3JpdHkgPSBlbGVtc1szXTtcbiAgICAgICAgY2FuZGlkYXRlLmlwID0gZWxlbXNbNF07XG4gICAgICAgIGNhbmRpZGF0ZS5wb3J0ID0gZWxlbXNbNV07XG4gICAgICAgIC8vIGVsZW1zWzZdID0+IFwidHlwXCJcbiAgICAgICAgY2FuZGlkYXRlLnR5cGUgPSBlbGVtc1s3XTtcblxuICAgICAgICBjYW5kaWRhdGUuZ2VuZXJhdGlvbiA9ICcwJzsgLy8gZGVmYXVsdCwgbWF5IGJlIG92ZXJ3cml0dGVuIGJlbG93XG4gICAgICAgIGZvciAoaSA9IDg7IGkgPCBlbGVtcy5sZW5ndGg7IGkgKz0gMikge1xuICAgICAgICAgICAgc3dpdGNoIChlbGVtc1tpXSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ3JhZGRyJzpcbiAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlWydyZWwtYWRkciddID0gZWxlbXNbaSArIDFdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdycG9ydCc6XG4gICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZVsncmVsLXBvcnQnXSA9IGVsZW1zW2kgKyAxXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnZ2VuZXJhdGlvbic6XG4gICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZS5nZW5lcmF0aW9uID0gZWxlbXNbaSArIDFdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICd0Y3B0eXBlJzpcbiAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlLnRjcHR5cGUgPSBlbGVtc1tpICsgMV07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IC8vIFRPRE9cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vdCB0cmFuc2xhdGluZyBcIicgKyBlbGVtc1tpXSArICdcIiA9IFwiJyArIGVsZW1zW2kgKyAxXSArICdcIicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNhbmRpZGF0ZS5uZXR3b3JrID0gJzEnO1xuICAgICAgICBjYW5kaWRhdGUuaWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgMTApOyAvLyBub3QgYXBwbGljYWJsZSB0byBTRFAgLS0gRklYTUU6IHNob3VsZCBiZSB1bmlxdWUsIG5vdCBqdXN0IHJhbmRvbVxuICAgICAgICByZXR1cm4gY2FuZGlkYXRlO1xuICAgIH0sXG4gICAgY2FuZGlkYXRlRnJvbUppbmdsZTogZnVuY3Rpb24gKGNhbmQpIHtcbiAgICAgICAgdmFyIGxpbmUgPSAnYT1jYW5kaWRhdGU6JztcbiAgICAgICAgbGluZSArPSBjYW5kLmdldEF0dHJpYnV0ZSgnZm91bmRhdGlvbicpO1xuICAgICAgICBsaW5lICs9ICcgJztcbiAgICAgICAgbGluZSArPSBjYW5kLmdldEF0dHJpYnV0ZSgnY29tcG9uZW50Jyk7XG4gICAgICAgIGxpbmUgKz0gJyAnO1xuICAgICAgICBsaW5lICs9IGNhbmQuZ2V0QXR0cmlidXRlKCdwcm90b2NvbCcpOyAvLy50b1VwcGVyQ2FzZSgpOyAvLyBjaHJvbWUgTTIzIGRvZXNuJ3QgbGlrZSB0aGlzXG4gICAgICAgIGxpbmUgKz0gJyAnO1xuICAgICAgICBsaW5lICs9IGNhbmQuZ2V0QXR0cmlidXRlKCdwcmlvcml0eScpO1xuICAgICAgICBsaW5lICs9ICcgJztcbiAgICAgICAgbGluZSArPSBjYW5kLmdldEF0dHJpYnV0ZSgnaXAnKTtcbiAgICAgICAgbGluZSArPSAnICc7XG4gICAgICAgIGxpbmUgKz0gY2FuZC5nZXRBdHRyaWJ1dGUoJ3BvcnQnKTtcbiAgICAgICAgbGluZSArPSAnICc7XG4gICAgICAgIGxpbmUgKz0gJ3R5cCc7XG4gICAgICAgIGxpbmUgKz0gJyAnICsgY2FuZC5nZXRBdHRyaWJ1dGUoJ3R5cGUnKTtcbiAgICAgICAgbGluZSArPSAnICc7XG4gICAgICAgIHN3aXRjaCAoY2FuZC5nZXRBdHRyaWJ1dGUoJ3R5cGUnKSkge1xuICAgICAgICAgICAgY2FzZSAnc3JmbHgnOlxuICAgICAgICAgICAgY2FzZSAncHJmbHgnOlxuICAgICAgICAgICAgY2FzZSAncmVsYXknOlxuICAgICAgICAgICAgICAgIGlmIChjYW5kLmdldEF0dHJpYnV0ZSgncmVsLWFkZHInKSAmJiBjYW5kLmdldEF0dHJpYnV0ZSgncmVsLXBvcnQnKSkge1xuICAgICAgICAgICAgICAgICAgICBsaW5lICs9ICdyYWRkcic7XG4gICAgICAgICAgICAgICAgICAgIGxpbmUgKz0gJyAnO1xuICAgICAgICAgICAgICAgICAgICBsaW5lICs9IGNhbmQuZ2V0QXR0cmlidXRlKCdyZWwtYWRkcicpO1xuICAgICAgICAgICAgICAgICAgICBsaW5lICs9ICcgJztcbiAgICAgICAgICAgICAgICAgICAgbGluZSArPSAncnBvcnQnO1xuICAgICAgICAgICAgICAgICAgICBsaW5lICs9ICcgJztcbiAgICAgICAgICAgICAgICAgICAgbGluZSArPSBjYW5kLmdldEF0dHJpYnV0ZSgncmVsLXBvcnQnKTtcbiAgICAgICAgICAgICAgICAgICAgbGluZSArPSAnICc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGxpbmUgKz0gJ2dlbmVyYXRpb24nO1xuICAgICAgICBsaW5lICs9ICcgJztcbiAgICAgICAgbGluZSArPSBjYW5kLmdldEF0dHJpYnV0ZSgnZ2VuZXJhdGlvbicpIHx8ICcwJztcbiAgICAgICAgcmV0dXJuIGxpbmUgKyAnXFxyXFxuJztcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNEUFV0aWw7XG5cbiIsIi8qIGpzaGludCAtVzExNyAqL1xuLy8gSmluZ2xlIHN0dWZmXG52YXIgU2Vzc2lvbkJhc2UgPSByZXF1aXJlKFwiLi9zdHJvcGhlLmppbmdsZS5zZXNzaW9uYmFzZVwiKTtcbnZhciBUcmFjZWFibGVQZWVyQ29ubmVjdGlvbiA9IHJlcXVpcmUoXCIuL3N0cm9waGUuamluZ2xlLmFkYXB0ZXJcIik7XG52YXIgU0RQID0gcmVxdWlyZShcIi4vc3Ryb3BoZS5qaW5nbGUuc2RwXCIpO1xuXG5KaW5nbGVTZXNzaW9uLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU2Vzc2lvbkJhc2UucHJvdG90eXBlKTtcbmZ1bmN0aW9uIEppbmdsZVNlc3Npb24obWUsIHNpZCwgY29ubmVjdGlvbikge1xuXG4gICAgU2Vzc2lvbkJhc2UuY2FsbCh0aGlzLCBjb25uZWN0aW9uLCBzaWQpO1xuXG4gICAgdGhpcy5tZSA9IG1lO1xuICAgIHRoaXMuaW5pdGlhdG9yID0gbnVsbDtcbiAgICB0aGlzLnJlc3BvbmRlciA9IG51bGw7XG4gICAgdGhpcy5pc0luaXRpYXRvciA9IG51bGw7XG4gICAgdGhpcy5wZWVyamlkID0gbnVsbDtcbiAgICB0aGlzLnN0YXRlID0gbnVsbDtcbiAgICB0aGlzLmxvY2FsU0RQID0gbnVsbDtcbiAgICB0aGlzLnJlbW90ZVNEUCA9IG51bGw7XG4gICAgdGhpcy5sb2NhbFN0cmVhbXMgPSBbXTtcbiAgICB0aGlzLnJlbGF5ZWRTdHJlYW1zID0gW107XG4gICAgdGhpcy5yZW1vdGVTdHJlYW1zID0gW107XG4gICAgdGhpcy5zdGFydFRpbWUgPSBudWxsO1xuICAgIHRoaXMuc3RvcFRpbWUgPSBudWxsO1xuICAgIHRoaXMubWVkaWFfY29uc3RyYWludHMgPSBudWxsO1xuICAgIHRoaXMucGNfY29uc3RyYWludHMgPSBudWxsO1xuICAgIHRoaXMuaWNlX2NvbmZpZyA9IHt9O1xuICAgIHRoaXMuZHJpcF9jb250YWluZXIgPSBbXTtcblxuICAgIHRoaXMudXNldHJpY2tsZSA9IHRydWU7XG4gICAgdGhpcy51c2VwcmFuc3dlciA9IGZhbHNlOyAvLyBlYXJseSB0cmFuc3BvcnQgd2FybXVwIC0tIG1pbmQgeW91LCB0aGlzIG1pZ2h0IGZhaWwuIGRlcGVuZHMgb24gd2VicnRjIGlzc3VlIDE3MThcbiAgICB0aGlzLnVzZWRyaXAgPSBmYWxzZTsgLy8gZHJpcHBpbmcgaXMgc2VuZGluZyB0cmlja2xlIGNhbmRpZGF0ZXMgbm90IG9uZS1ieS1vbmVcblxuICAgIHRoaXMuaGFkc3R1bmNhbmRpZGF0ZSA9IGZhbHNlO1xuICAgIHRoaXMuaGFkdHVybmNhbmRpZGF0ZSA9IGZhbHNlO1xuICAgIHRoaXMubGFzdGljZWNhbmRpZGF0ZSA9IGZhbHNlO1xuXG4gICAgdGhpcy5zdGF0c2ludGVydmFsID0gbnVsbDtcblxuICAgIHRoaXMucmVhc29uID0gbnVsbDtcblxuICAgIHRoaXMud2FpdCA9IHRydWU7XG59XG5cbkppbmdsZVNlc3Npb24ucHJvdG90eXBlLmluaXRpYXRlID0gZnVuY3Rpb24gKHBlZXJqaWQsIGlzSW5pdGlhdG9yKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICh0aGlzLnN0YXRlICE9PSBudWxsKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ2F0dGVtcHQgdG8gaW5pdGlhdGUgb24gc2Vzc2lvbiAnICsgdGhpcy5zaWQgK1xuICAgICAgICAgICAgJ2luIHN0YXRlICcgKyB0aGlzLnN0YXRlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmlzSW5pdGlhdG9yID0gaXNJbml0aWF0b3I7XG4gICAgdGhpcy5zdGF0ZSA9ICdwZW5kaW5nJztcbiAgICB0aGlzLmluaXRpYXRvciA9IGlzSW5pdGlhdG9yID8gdGhpcy5tZSA6IHBlZXJqaWQ7XG4gICAgdGhpcy5yZXNwb25kZXIgPSAhaXNJbml0aWF0b3IgPyB0aGlzLm1lIDogcGVlcmppZDtcbiAgICB0aGlzLnBlZXJqaWQgPSBwZWVyamlkO1xuICAgIHRoaXMuaGFkc3R1bmNhbmRpZGF0ZSA9IGZhbHNlO1xuICAgIHRoaXMuaGFkdHVybmNhbmRpZGF0ZSA9IGZhbHNlO1xuICAgIHRoaXMubGFzdGljZWNhbmRpZGF0ZSA9IGZhbHNlO1xuXG4gICAgdGhpcy5wZWVyY29ubmVjdGlvblxuICAgICAgICA9IG5ldyBUcmFjZWFibGVQZWVyQ29ubmVjdGlvbihcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5qaW5nbGUuaWNlX2NvbmZpZyxcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5qaW5nbGUucGNfY29uc3RyYWludHMgKTtcblxuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24ub25pY2VjYW5kaWRhdGUgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgc2VsZi5zZW5kSWNlQ2FuZGlkYXRlKGV2ZW50LmNhbmRpZGF0ZSk7XG4gICAgfTtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLm9uYWRkc3RyZWFtID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHNlbGYucmVtb3RlU3RyZWFtcy5wdXNoKGV2ZW50LnN0cmVhbSk7XG4vLyAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcigncmVtb3Rlc3RyZWFtYWRkZWQuamluZ2xlJywgW2V2ZW50LCBzZWxmLnNpZF0pO1xuICAgICAgICBzZWxmLndhaXRGb3JQcmVzZW5jZShldmVudCwgc2VsZi5zaWQpO1xuICAgIH07XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5vbnJlbW92ZXN0cmVhbSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAvLyBSZW1vdmUgdGhlIHN0cmVhbSBmcm9tIHJlbW90ZVN0cmVhbXNcbiAgICAgICAgdmFyIHN0cmVhbUlkeCA9IHNlbGYucmVtb3RlU3RyZWFtcy5pbmRleE9mKGV2ZW50LnN0cmVhbSk7XG4gICAgICAgIGlmKHN0cmVhbUlkeCAhPT0gLTEpe1xuICAgICAgICAgICAgc2VsZi5yZW1vdGVTdHJlYW1zLnNwbGljZShzdHJlYW1JZHgsIDEpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZJWE1FOiByZW1vdGVzdHJlYW1yZW1vdmVkLmppbmdsZSBub3QgZGVmaW5lZCBhbnl3aGVyZSh1bnVzZWQpXG4gICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ3JlbW90ZXN0cmVhbXJlbW92ZWQuamluZ2xlJywgW2V2ZW50LCBzZWxmLnNpZF0pO1xuICAgIH07XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5vbnNpZ25hbGluZ3N0YXRlY2hhbmdlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIGlmICghKHNlbGYgJiYgc2VsZi5wZWVyY29ubmVjdGlvbikpIHJldHVybjtcbiAgICB9O1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24ub25pY2Vjb25uZWN0aW9uc3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgaWYgKCEoc2VsZiAmJiBzZWxmLnBlZXJjb25uZWN0aW9uKSkgcmV0dXJuO1xuICAgICAgICBzd2l0Y2ggKHNlbGYucGVlcmNvbm5lY3Rpb24uaWNlQ29ubmVjdGlvblN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlICdjb25uZWN0ZWQnOlxuICAgICAgICAgICAgICAgIHRoaXMuc3RhcnRUaW1lID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2Rpc2Nvbm5lY3RlZCc6XG4gICAgICAgICAgICAgICAgdGhpcy5zdG9wVGltZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgc2VsZi5vbkljZUNvbm5lY3Rpb25TdGF0ZUNoYW5nZShzZWxmLnNpZCwgc2VsZik7XG4gICAgfTtcbiAgICAvLyBhZGQgYW55IGxvY2FsIGFuZCByZWxheWVkIHN0cmVhbVxuICAgIHRoaXMubG9jYWxTdHJlYW1zLmZvckVhY2goZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgICAgIHNlbGYucGVlcmNvbm5lY3Rpb24uYWRkU3RyZWFtKHN0cmVhbSk7XG4gICAgfSk7XG4gICAgdGhpcy5yZWxheWVkU3RyZWFtcy5mb3JFYWNoKGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgICBzZWxmLnBlZXJjb25uZWN0aW9uLmFkZFN0cmVhbShzdHJlYW0pO1xuICAgIH0pO1xufTtcblxuSmluZ2xlU2Vzc2lvbi5wcm90b3R5cGUuYWNjZXB0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLnN0YXRlID0gJ2FjdGl2ZSc7XG5cbiAgICB2YXIgcHJhbnN3ZXIgPSB0aGlzLnBlZXJjb25uZWN0aW9uLmxvY2FsRGVzY3JpcHRpb247XG4gICAgaWYgKCFwcmFuc3dlciB8fCBwcmFuc3dlci50eXBlICE9ICdwcmFuc3dlcicpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZygnZ29pbmcgZnJvbSBwcmFuc3dlciB0byBhbnN3ZXInKTtcbiAgICBpZiAodGhpcy51c2V0cmlja2xlKSB7XG4gICAgICAgIC8vIHJlbW92ZSBjYW5kaWRhdGVzIGFscmVhZHkgc2VudCBmcm9tIHNlc3Npb24tYWNjZXB0XG4gICAgICAgIHZhciBsaW5lcyA9IFNEUFV0aWwuZmluZF9saW5lcyhwcmFuc3dlci5zZHAsICdhPWNhbmRpZGF0ZTonKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcHJhbnN3ZXIuc2RwID0gcHJhbnN3ZXIuc2RwLnJlcGxhY2UobGluZXNbaV0gKyAnXFxyXFxuJywgJycpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHdoaWxlIChTRFBVdGlsLmZpbmRfbGluZShwcmFuc3dlci5zZHAsICdhPWluYWN0aXZlJykpIHtcbiAgICAgICAgLy8gRklYTUU6IGNoYW5nZSBhbnkgaW5hY3RpdmUgdG8gc2VuZHJlY3Ygb3Igd2hhdGV2ZXIgdGhleSB3ZXJlIG9yaWdpbmFsbHlcbiAgICAgICAgcHJhbnN3ZXIuc2RwID0gcHJhbnN3ZXIuc2RwLnJlcGxhY2UoJ2E9aW5hY3RpdmUnLCAnYT1zZW5kcmVjdicpO1xuICAgIH1cbiAgICB2YXIgc2ltdWxjYXN0ID0gbmV3IFNpbXVsY2FzdCgpO1xuICAgIHByYW5zd2VyID0gc2ltdWxjYXN0LnJldmVyc2VUcmFuc2Zvcm1Mb2NhbERlc2NyaXB0aW9uKHByYW5zd2VyKTtcbiAgICB2YXIgcHJzZHAgPSBuZXcgU0RQKHByYW5zd2VyLnNkcCk7XG4gICAgdmFyIGFjY2VwdCA9ICRpcSh7dG86IHRoaXMucGVlcmppZCxcbiAgICAgICAgdHlwZTogJ3NldCd9KVxuICAgICAgICAuYygnamluZ2xlJywge3htbG5zOiAndXJuOnhtcHA6amluZ2xlOjEnLFxuICAgICAgICAgICAgYWN0aW9uOiAnc2Vzc2lvbi1hY2NlcHQnLFxuICAgICAgICAgICAgaW5pdGlhdG9yOiB0aGlzLmluaXRpYXRvcixcbiAgICAgICAgICAgIHJlc3BvbmRlcjogdGhpcy5yZXNwb25kZXIsXG4gICAgICAgICAgICBzaWQ6IHRoaXMuc2lkIH0pO1xuICAgIHByc2RwLnRvSmluZ2xlKGFjY2VwdCwgdGhpcy5pbml0aWF0b3IgPT0gdGhpcy5tZSA/ICdpbml0aWF0b3InIDogJ3Jlc3BvbmRlcicpO1xuICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoYWNjZXB0LFxuICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgYWNrID0ge307XG4gICAgICAgICAgICBhY2suc291cmNlID0gJ2Fuc3dlcic7XG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdhY2suamluZ2xlJywgW3NlbGYuc2lkLCBhY2tdKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHN0YW56YSkge1xuICAgICAgICAgICAgdmFyIGVycm9yID0gKCQoc3RhbnphKS5maW5kKCdlcnJvcicpLmxlbmd0aCkgPyB7XG4gICAgICAgICAgICAgICAgY29kZTogJChzdGFuemEpLmZpbmQoJ2Vycm9yJykuYXR0cignY29kZScpLFxuICAgICAgICAgICAgICAgIHJlYXNvbjogJChzdGFuemEpLmZpbmQoJ2Vycm9yIDpmaXJzdCcpWzBdLnRhZ05hbWUsXG4gICAgICAgICAgICB9Ont9O1xuICAgICAgICAgICAgZXJyb3Iuc291cmNlID0gJ2Fuc3dlcic7XG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdlcnJvci5qaW5nbGUnLCBbc2VsZi5zaWQsIGVycm9yXSk7XG4gICAgICAgIH0sXG4gICAgICAgIDEwMDAwKTtcblxuICAgIHZhciBzZHAgPSB0aGlzLnBlZXJjb25uZWN0aW9uLmxvY2FsRGVzY3JpcHRpb24uc2RwO1xuICAgIHdoaWxlIChTRFBVdGlsLmZpbmRfbGluZShzZHAsICdhPWluYWN0aXZlJykpIHtcbiAgICAgICAgLy8gRklYTUU6IGNoYW5nZSBhbnkgaW5hY3RpdmUgdG8gc2VuZHJlY3Ygb3Igd2hhdGV2ZXIgdGhleSB3ZXJlIG9yaWdpbmFsbHlcbiAgICAgICAgc2RwID0gc2RwLnJlcGxhY2UoJ2E9aW5hY3RpdmUnLCAnYT1zZW5kcmVjdicpO1xuICAgIH1cbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLnNldExvY2FsRGVzY3JpcHRpb24obmV3IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbih7dHlwZTogJ2Fuc3dlcicsIHNkcDogc2RwfSksXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3NldExvY2FsRGVzY3JpcHRpb24gc3VjY2VzcycpO1xuICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignc2V0TG9jYWxEZXNjcmlwdGlvbi5qaW5nbGUnLCBbc2VsZi5zaWRdKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ3NldExvY2FsRGVzY3JpcHRpb24gZmFpbGVkJywgZSk7XG4gICAgICAgIH1cbiAgICApO1xufTtcblxuLyoqXG4gKiBJbXBsZW1lbnRzIFNlc3Npb25CYXNlLnNlbmRTU1JDVXBkYXRlLlxuICovXG5KaW5nbGVTZXNzaW9uLnByb3RvdHlwZS5zZW5kU1NSQ1VwZGF0ZSA9IGZ1bmN0aW9uKHNkcE1lZGlhU3NyY3MsIGZyb21KaWQsIGlzYWRkKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgY29uc29sZS5sb2coJ3RlbGwnLCBzZWxmLnBlZXJqaWQsICdhYm91dCAnICsgKGlzYWRkID8gJ25ldycgOiAncmVtb3ZlZCcpICsgJyBzc3JjcyBmcm9tJyArIHNlbGYubWUpO1xuXG4gICAgaWYgKCEodGhpcy5wZWVyY29ubmVjdGlvbi5zaWduYWxpbmdTdGF0ZSA9PSAnc3RhYmxlJyAmJiB0aGlzLnBlZXJjb25uZWN0aW9uLmljZUNvbm5lY3Rpb25TdGF0ZSA9PSAnY29ubmVjdGVkJykpe1xuICAgICAgICBjb25zb2xlLmxvZyhcIlRvbyBlYXJseSB0byBzZW5kIHVwZGF0ZXNcIik7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnNlbmRTU1JDVXBkYXRlSXEoc2RwTWVkaWFTc3Jjcywgc2VsZi5zaWQsIHNlbGYuaW5pdGlhdG9yLCBzZWxmLnBlZXJqaWQsIGlzYWRkKTtcbn07XG5cbkppbmdsZVNlc3Npb24ucHJvdG90eXBlLnRlcm1pbmF0ZSA9IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICB0aGlzLnN0YXRlID0gJ2VuZGVkJztcbiAgICB0aGlzLnJlYXNvbiA9IHJlYXNvbjtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLmNsb3NlKCk7XG4gICAgaWYgKHRoaXMuc3RhdHNpbnRlcnZhbCAhPT0gbnVsbCkge1xuICAgICAgICB3aW5kb3cuY2xlYXJJbnRlcnZhbCh0aGlzLnN0YXRzaW50ZXJ2YWwpO1xuICAgICAgICB0aGlzLnN0YXRzaW50ZXJ2YWwgPSBudWxsO1xuICAgIH1cbn07XG5cbkppbmdsZVNlc3Npb24ucHJvdG90eXBlLmFjdGl2ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZSA9PSAnYWN0aXZlJztcbn07XG5cbkppbmdsZVNlc3Npb24ucHJvdG90eXBlLnNlbmRJY2VDYW5kaWRhdGUgPSBmdW5jdGlvbiAoY2FuZGlkYXRlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChjYW5kaWRhdGUgJiYgIXRoaXMubGFzdGljZWNhbmRpZGF0ZSkge1xuICAgICAgICB2YXIgaWNlID0gU0RQVXRpbC5pY2VwYXJhbXModGhpcy5sb2NhbFNEUC5tZWRpYVtjYW5kaWRhdGUuc2RwTUxpbmVJbmRleF0sIHRoaXMubG9jYWxTRFAuc2Vzc2lvbik7XG4gICAgICAgIHZhciBqY2FuZCA9IFNEUFV0aWwuY2FuZGlkYXRlVG9KaW5nbGUoY2FuZGlkYXRlLmNhbmRpZGF0ZSk7XG4gICAgICAgIGlmICghKGljZSAmJiBqY2FuZCkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2ZhaWxlZCB0byBnZXQgaWNlICYmIGpjYW5kJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWNlLnhtbG5zID0gJ3Vybjp4bXBwOmppbmdsZTp0cmFuc3BvcnRzOmljZS11ZHA6MSc7XG5cbiAgICAgICAgaWYgKGpjYW5kLnR5cGUgPT09ICdzcmZseCcpIHtcbiAgICAgICAgICAgIHRoaXMuaGFkc3R1bmNhbmRpZGF0ZSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAoamNhbmQudHlwZSA9PT0gJ3JlbGF5Jykge1xuICAgICAgICAgICAgdGhpcy5oYWR0dXJuY2FuZGlkYXRlID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnVzZXRyaWNrbGUpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnVzZWRyaXApIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kcmlwX2NvbnRhaW5lci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc3RhcnQgMjBtcyBjYWxsb3V0XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLmRyaXBfY29udGFpbmVyLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5zZW5kSWNlQ2FuZGlkYXRlcyhzZWxmLmRyaXBfY29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuZHJpcF9jb250YWluZXIgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMjApO1xuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuZHJpcF9jb250YWluZXIucHVzaChldmVudC5jYW5kaWRhdGUpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2VsZi5zZW5kSWNlQ2FuZGlkYXRlKFtldmVudC5jYW5kaWRhdGVdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vY29uc29sZS5sb2coJ3NlbmRJY2VDYW5kaWRhdGU6IGxhc3QgY2FuZGlkYXRlLicpO1xuICAgICAgICBpZiAoIXRoaXMudXNldHJpY2tsZSkge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnc2hvdWxkIHNlbmQgZnVsbCBvZmZlciBub3cuLi4nKTtcbiAgICAgICAgICAgIHZhciBpbml0ID0gJGlxKHt0bzogdGhpcy5wZWVyamlkLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdzZXQnfSlcbiAgICAgICAgICAgICAgICAuYygnamluZ2xlJywge3htbG5zOiAndXJuOnhtcHA6amluZ2xlOjEnLFxuICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHRoaXMucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbi50eXBlID09ICdvZmZlcicgPyAnc2Vzc2lvbi1pbml0aWF0ZScgOiAnc2Vzc2lvbi1hY2NlcHQnLFxuICAgICAgICAgICAgICAgICAgICBpbml0aWF0b3I6IHRoaXMuaW5pdGlhdG9yLFxuICAgICAgICAgICAgICAgICAgICBzaWQ6IHRoaXMuc2lkfSk7XG4gICAgICAgICAgICB0aGlzLmxvY2FsU0RQID0gbmV3IFNEUCh0aGlzLnBlZXJjb25uZWN0aW9uLmxvY2FsRGVzY3JpcHRpb24uc2RwKTtcbiAgICAgICAgICAgIHRoaXMubG9jYWxTRFAudG9KaW5nbGUoaW5pdCwgdGhpcy5pbml0aWF0b3IgPT0gdGhpcy5tZSA/ICdpbml0aWF0b3InIDogJ3Jlc3BvbmRlcicpO1xuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmRJUShpbml0LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnc2Vzc2lvbiBpbml0aWF0ZSBhY2snKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFjayA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBhY2suc291cmNlID0gJ29mZmVyJztcbiAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignYWNrLmppbmdsZScsIFtzZWxmLnNpZCwgYWNrXSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoc3RhbnphKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuc3RhdGUgPSAnZXJyb3InO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnBlZXJjb25uZWN0aW9uLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlcnJvciA9ICgkKHN0YW56YSkuZmluZCgnZXJyb3InKS5sZW5ndGgpID8ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogJChzdGFuemEpLmZpbmQoJ2Vycm9yJykuYXR0cignY29kZScpLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVhc29uOiAkKHN0YW56YSkuZmluZCgnZXJyb3IgOmZpcnN0JylbMF0udGFnTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgfTp7fTtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3Iuc291cmNlID0gJ29mZmVyJztcbiAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignZXJyb3IuamluZ2xlJywgW3NlbGYuc2lkLCBlcnJvcl0pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgMTAwMDApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubGFzdGljZWNhbmRpZGF0ZSA9IHRydWU7XG4gICAgICAgIGNvbnNvbGUubG9nKCdIYXZlIHdlIGVuY291bnRlcmVkIGFueSBzcmZseCBjYW5kaWRhdGVzPyAnICsgdGhpcy5oYWRzdHVuY2FuZGlkYXRlKTtcbiAgICAgICAgY29uc29sZS5sb2coJ0hhdmUgd2UgZW5jb3VudGVyZWQgYW55IHJlbGF5IGNhbmRpZGF0ZXM/ICcgKyB0aGlzLmhhZHR1cm5jYW5kaWRhdGUpO1xuXG4gICAgICAgIGlmICghKHRoaXMuaGFkc3R1bmNhbmRpZGF0ZSB8fCB0aGlzLmhhZHR1cm5jYW5kaWRhdGUpICYmIHRoaXMucGVlcmNvbm5lY3Rpb24uc2lnbmFsaW5nU3RhdGUgIT0gJ2Nsb3NlZCcpIHtcbiAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ25vc3R1bmNhbmRpZGF0ZXMuamluZ2xlJywgW3RoaXMuc2lkXSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5KaW5nbGVTZXNzaW9uLnByb3RvdHlwZS5zZW5kSWNlQ2FuZGlkYXRlcyA9IGZ1bmN0aW9uIChjYW5kaWRhdGVzKSB7XG4gICAgY29uc29sZS5sb2coJ3NlbmRJY2VDYW5kaWRhdGVzJywgY2FuZGlkYXRlcyk7XG4gICAgdmFyIGNhbmQgPSAkaXEoe3RvOiB0aGlzLnBlZXJqaWQsIHR5cGU6ICdzZXQnfSlcbiAgICAgICAgLmMoJ2ppbmdsZScsIHt4bWxuczogJ3Vybjp4bXBwOmppbmdsZToxJyxcbiAgICAgICAgICAgIGFjdGlvbjogJ3RyYW5zcG9ydC1pbmZvJyxcbiAgICAgICAgICAgIGluaXRpYXRvcjogdGhpcy5pbml0aWF0b3IsXG4gICAgICAgICAgICBzaWQ6IHRoaXMuc2lkfSk7XG4gICAgZm9yICh2YXIgbWlkID0gMDsgbWlkIDwgdGhpcy5sb2NhbFNEUC5tZWRpYS5sZW5ndGg7IG1pZCsrKSB7XG4gICAgICAgIHZhciBjYW5kcyA9IGNhbmRpZGF0ZXMuZmlsdGVyKGZ1bmN0aW9uIChlbCkgeyByZXR1cm4gZWwuc2RwTUxpbmVJbmRleCA9PSBtaWQ7IH0pO1xuICAgICAgICBpZiAoY2FuZHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdmFyIGljZSA9IFNEUFV0aWwuaWNlcGFyYW1zKHRoaXMubG9jYWxTRFAubWVkaWFbbWlkXSwgdGhpcy5sb2NhbFNEUC5zZXNzaW9uKTtcbiAgICAgICAgICAgIGljZS54bWxucyA9ICd1cm46eG1wcDpqaW5nbGU6dHJhbnNwb3J0czppY2UtdWRwOjEnO1xuICAgICAgICAgICAgY2FuZC5jKCdjb250ZW50Jywge2NyZWF0b3I6IHRoaXMuaW5pdGlhdG9yID09IHRoaXMubWUgPyAnaW5pdGlhdG9yJyA6ICdyZXNwb25kZXInLFxuICAgICAgICAgICAgICAgIG5hbWU6IGNhbmRzWzBdLnNkcE1pZFxuICAgICAgICAgICAgfSkuYygndHJhbnNwb3J0JywgaWNlKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2FuZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjYW5kLmMoJ2NhbmRpZGF0ZScsIFNEUFV0aWwuY2FuZGlkYXRlVG9KaW5nbGUoY2FuZHNbaV0uY2FuZGlkYXRlKSkudXAoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGFkZCBmaW5nZXJwcmludFxuICAgICAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKHRoaXMubG9jYWxTRFAubWVkaWFbbWlkXSwgJ2E9ZmluZ2VycHJpbnQ6JywgdGhpcy5sb2NhbFNEUC5zZXNzaW9uKSkge1xuICAgICAgICAgICAgICAgIHZhciB0bXAgPSBTRFBVdGlsLnBhcnNlX2ZpbmdlcnByaW50KFNEUFV0aWwuZmluZF9saW5lKHRoaXMubG9jYWxTRFAubWVkaWFbbWlkXSwgJ2E9ZmluZ2VycHJpbnQ6JywgdGhpcy5sb2NhbFNEUC5zZXNzaW9uKSk7XG4gICAgICAgICAgICAgICAgdG1wLnJlcXVpcmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjYW5kLmMoXG4gICAgICAgICAgICAgICAgICAgICdmaW5nZXJwcmludCcsXG4gICAgICAgICAgICAgICAgICAgIHt4bWxuczogJ3Vybjp4bXBwOmppbmdsZTphcHBzOmR0bHM6MCd9KVxuICAgICAgICAgICAgICAgICAgICAudCh0bXAuZmluZ2VycHJpbnQpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0bXAuZmluZ2VycHJpbnQ7XG4gICAgICAgICAgICAgICAgY2FuZC5hdHRycyh0bXApO1xuICAgICAgICAgICAgICAgIGNhbmQudXAoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhbmQudXAoKTsgLy8gdHJhbnNwb3J0XG4gICAgICAgICAgICBjYW5kLnVwKCk7IC8vIGNvbnRlbnRcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBtaWdodCBtZXJnZSBsYXN0LWNhbmRpZGF0ZSBub3RpZmljYXRpb24gaW50byB0aGlzLCBidXQgaXQgaXMgY2FsbGVkIGFsb3QgbGF0ZXIuIFNlZSB3ZWJydGMgaXNzdWUgIzIzNDBcbiAgICAvL2NvbnNvbGUubG9nKCd3YXMgdGhpcyB0aGUgbGFzdCBjYW5kaWRhdGUnLCB0aGlzLmxhc3RpY2VjYW5kaWRhdGUpO1xuICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoY2FuZCxcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGFjayA9IHt9O1xuICAgICAgICAgICAgYWNrLnNvdXJjZSA9ICd0cmFuc3BvcnRpbmZvJztcbiAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2Fjay5qaW5nbGUnLCBbdGhpcy5zaWQsIGFja10pO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc3RhbnphKSB7XG4gICAgICAgICAgICB2YXIgZXJyb3IgPSAoJChzdGFuemEpLmZpbmQoJ2Vycm9yJykubGVuZ3RoKSA/IHtcbiAgICAgICAgICAgICAgICBjb2RlOiAkKHN0YW56YSkuZmluZCgnZXJyb3InKS5hdHRyKCdjb2RlJyksXG4gICAgICAgICAgICAgICAgcmVhc29uOiAkKHN0YW56YSkuZmluZCgnZXJyb3IgOmZpcnN0JylbMF0udGFnTmFtZSxcbiAgICAgICAgICAgIH06e307XG4gICAgICAgICAgICBlcnJvci5zb3VyY2UgPSAndHJhbnNwb3J0aW5mbyc7XG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdlcnJvci5qaW5nbGUnLCBbdGhpcy5zaWQsIGVycm9yXSk7XG4gICAgICAgIH0sXG4gICAgICAgIDEwMDAwKTtcbn07XG5cblxuSmluZ2xlU2Vzc2lvbi5wcm90b3R5cGUuc2VuZE9mZmVyID0gZnVuY3Rpb24gKCkge1xuICAgIC8vY29uc29sZS5sb2coJ3NlbmRPZmZlci4uLicpO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLmNyZWF0ZU9mZmVyKGZ1bmN0aW9uIChzZHApIHtcbiAgICAgICAgICAgIHNlbGYuY3JlYXRlZE9mZmVyKHNkcCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdjcmVhdGVPZmZlciBmYWlsZWQnLCBlKTtcbiAgICAgICAgfSxcbiAgICAgICAgdGhpcy5tZWRpYV9jb25zdHJhaW50c1xuICAgICk7XG59O1xuXG5KaW5nbGVTZXNzaW9uLnByb3RvdHlwZS5jcmVhdGVkT2ZmZXIgPSBmdW5jdGlvbiAoc2RwKSB7XG4gICAgLy9jb25zb2xlLmxvZygnY3JlYXRlZE9mZmVyJywgc2RwKTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5sb2NhbFNEUCA9IG5ldyBTRFAoc2RwLnNkcCk7XG4gICAgLy90aGlzLmxvY2FsU0RQLm1hbmdsZSgpO1xuICAgIGlmICh0aGlzLnVzZXRyaWNrbGUpIHtcbiAgICAgICAgdmFyIGluaXQgPSAkaXEoe3RvOiB0aGlzLnBlZXJqaWQsXG4gICAgICAgICAgICB0eXBlOiAnc2V0J30pXG4gICAgICAgICAgICAuYygnamluZ2xlJywge3htbG5zOiAndXJuOnhtcHA6amluZ2xlOjEnLFxuICAgICAgICAgICAgICAgIGFjdGlvbjogJ3Nlc3Npb24taW5pdGlhdGUnLFxuICAgICAgICAgICAgICAgIGluaXRpYXRvcjogdGhpcy5pbml0aWF0b3IsXG4gICAgICAgICAgICAgICAgc2lkOiB0aGlzLnNpZH0pO1xuICAgICAgICB0aGlzLmxvY2FsU0RQLnRvSmluZ2xlKGluaXQsIHRoaXMuaW5pdGlhdG9yID09IHRoaXMubWUgPyAnaW5pdGlhdG9yJyA6ICdyZXNwb25kZXInKTtcbiAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmRJUShpbml0LFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBhY2sgPSB7fTtcbiAgICAgICAgICAgICAgICBhY2suc291cmNlID0gJ29mZmVyJztcbiAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdhY2suamluZ2xlJywgW3NlbGYuc2lkLCBhY2tdKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbiAoc3RhbnphKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5zdGF0ZSA9ICdlcnJvcic7XG4gICAgICAgICAgICAgICAgc2VsZi5wZWVyY29ubmVjdGlvbi5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIHZhciBlcnJvciA9ICgkKHN0YW56YSkuZmluZCgnZXJyb3InKS5sZW5ndGgpID8ge1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiAkKHN0YW56YSkuZmluZCgnZXJyb3InKS5hdHRyKCdjb2RlJyksXG4gICAgICAgICAgICAgICAgICAgIHJlYXNvbjogJChzdGFuemEpLmZpbmQoJ2Vycm9yIDpmaXJzdCcpWzBdLnRhZ05hbWUsXG4gICAgICAgICAgICAgICAgfTp7fTtcbiAgICAgICAgICAgICAgICBlcnJvci5zb3VyY2UgPSAnb2ZmZXInO1xuICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2Vycm9yLmppbmdsZScsIFtzZWxmLnNpZCwgZXJyb3JdKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAxMDAwMCk7XG4gICAgfVxuICAgIHNkcC5zZHAgPSB0aGlzLmxvY2FsU0RQLnJhdztcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLnNldExvY2FsRGVzY3JpcHRpb24oc2RwLFxuICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdzZXRMb2NhbERlc2NyaXB0aW9uLmppbmdsZScsIFtzZWxmLnNpZF0pO1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnc2V0TG9jYWxEZXNjcmlwdGlvbiBzdWNjZXNzJyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdzZXRMb2NhbERlc2NyaXB0aW9uIGZhaWxlZCcsIGUpO1xuICAgICAgICB9XG4gICAgKTtcbiAgICB2YXIgY2FuZHMgPSBTRFBVdGlsLmZpbmRfbGluZXModGhpcy5sb2NhbFNEUC5yYXcsICdhPWNhbmRpZGF0ZTonKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNhbmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjYW5kID0gU0RQVXRpbC5wYXJzZV9pY2VjYW5kaWRhdGUoY2FuZHNbaV0pO1xuICAgICAgICBpZiAoY2FuZC50eXBlID09ICdzcmZseCcpIHtcbiAgICAgICAgICAgIHRoaXMuaGFkc3R1bmNhbmRpZGF0ZSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAoY2FuZC50eXBlID09ICdyZWxheScpIHtcbiAgICAgICAgICAgIHRoaXMuaGFkdHVybmNhbmRpZGF0ZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5KaW5nbGVTZXNzaW9uLnByb3RvdHlwZS5zZXRSZW1vdGVEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uIChlbGVtLCBkZXNjdHlwZSkge1xuICAgIC8vY29uc29sZS5sb2coJ3NldHRpbmcgcmVtb3RlIGRlc2NyaXB0aW9uLi4uICcsIGRlc2N0eXBlKTtcbiAgICB0aGlzLnJlbW90ZVNEUCA9IG5ldyBTRFAoJycpO1xuICAgIHRoaXMucmVtb3RlU0RQLmZyb21KaW5nbGUoZWxlbSk7XG4gICAgaWYgKHRoaXMucGVlcmNvbm5lY3Rpb24ucmVtb3RlRGVzY3JpcHRpb24gIT09IG51bGwpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3NldFJlbW90ZURlc2NyaXB0aW9uIHdoZW4gcmVtb3RlIGRlc2NyaXB0aW9uIGlzIG5vdCBudWxsLCBzaG91bGQgYmUgcHJhbnN3ZXInLCB0aGlzLnBlZXJjb25uZWN0aW9uLnJlbW90ZURlc2NyaXB0aW9uKTtcbiAgICAgICAgaWYgKHRoaXMucGVlcmNvbm5lY3Rpb24ucmVtb3RlRGVzY3JpcHRpb24udHlwZSA9PSAncHJhbnN3ZXInKSB7XG4gICAgICAgICAgICB2YXIgcHJhbnN3ZXIgPSBuZXcgU0RQKHRoaXMucGVlcmNvbm5lY3Rpb24ucmVtb3RlRGVzY3JpcHRpb24uc2RwKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHJhbnN3ZXIubWVkaWEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAvLyBtYWtlIHN1cmUgd2UgaGF2ZSBpY2UgdWZyYWcgYW5kIHB3ZFxuICAgICAgICAgICAgICAgIGlmICghU0RQVXRpbC5maW5kX2xpbmUodGhpcy5yZW1vdGVTRFAubWVkaWFbaV0sICdhPWljZS11ZnJhZzonLCB0aGlzLnJlbW90ZVNEUC5zZXNzaW9uKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUocHJhbnN3ZXIubWVkaWFbaV0sICdhPWljZS11ZnJhZzonLCBwcmFuc3dlci5zZXNzaW9uKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdGVTRFAubWVkaWFbaV0gKz0gU0RQVXRpbC5maW5kX2xpbmUocHJhbnN3ZXIubWVkaWFbaV0sICdhPWljZS11ZnJhZzonLCBwcmFuc3dlci5zZXNzaW9uKSArICdcXHJcXG4nO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdubyBpY2UgdWZyYWc/Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKHByYW5zd2VyLm1lZGlhW2ldLCAnYT1pY2UtcHdkOicsIHByYW5zd2VyLnNlc3Npb24pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW90ZVNEUC5tZWRpYVtpXSArPSBTRFBVdGlsLmZpbmRfbGluZShwcmFuc3dlci5tZWRpYVtpXSwgJ2E9aWNlLXB3ZDonLCBwcmFuc3dlci5zZXNzaW9uKSArICdcXHJcXG4nO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdubyBpY2UgcHdkPycpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGNvcHkgb3ZlciBjYW5kaWRhdGVzXG4gICAgICAgICAgICAgICAgdmFyIGxpbmVzID0gU0RQVXRpbC5maW5kX2xpbmVzKHByYW5zd2VyLm1lZGlhW2ldLCAnYT1jYW5kaWRhdGU6Jyk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBsaW5lcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW90ZVNEUC5tZWRpYVtpXSArPSBsaW5lc1tqXSArICdcXHJcXG4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMucmVtb3RlU0RQLnJhdyA9IHRoaXMucmVtb3RlU0RQLnNlc3Npb24gKyB0aGlzLnJlbW90ZVNEUC5tZWRpYS5qb2luKCcnKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2YXIgcmVtb3RlZGVzYyA9IG5ldyBSVENTZXNzaW9uRGVzY3JpcHRpb24oe3R5cGU6IGRlc2N0eXBlLCBzZHA6IHRoaXMucmVtb3RlU0RQLnJhd30pO1xuXG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5zZXRSZW1vdGVEZXNjcmlwdGlvbihyZW1vdGVkZXNjLFxuICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdzZXRSZW1vdGVEZXNjcmlwdGlvbiBzdWNjZXNzJyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdzZXRSZW1vdGVEZXNjcmlwdGlvbiBlcnJvcicsIGUpO1xuICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignZmF0YWxFcnJvci5qaW5nbGUnLCBbc2VsZiwgZV0pO1xuICAgICAgICAgICAgY29ubmVjdGlvbi5lbXVjLmRvTGVhdmUoKTtcbiAgICAgICAgfVxuICAgICk7XG59O1xuXG5KaW5nbGVTZXNzaW9uLnByb3RvdHlwZS5hZGRJY2VDYW5kaWRhdGUgPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAodGhpcy5wZWVyY29ubmVjdGlvbi5zaWduYWxpbmdTdGF0ZSA9PSAnY2xvc2VkJykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghdGhpcy5wZWVyY29ubmVjdGlvbi5yZW1vdGVEZXNjcmlwdGlvbiAmJiB0aGlzLnBlZXJjb25uZWN0aW9uLnNpZ25hbGluZ1N0YXRlID09ICdoYXZlLWxvY2FsLW9mZmVyJykge1xuICAgICAgICBjb25zb2xlLmxvZygndHJpY2tsZSBpY2UgY2FuZGlkYXRlIGFycml2aW5nIGJlZm9yZSBzZXNzaW9uIGFjY2VwdC4uLicpO1xuICAgICAgICAvLyBjcmVhdGUgYSBQUkFOU1dFUiBmb3Igc2V0UmVtb3RlRGVzY3JpcHRpb25cbiAgICAgICAgaWYgKCF0aGlzLnJlbW90ZVNEUCkge1xuICAgICAgICAgICAgdmFyIGNvYmJsZWQgPSAndj0wXFxyXFxuJyArXG4gICAgICAgICAgICAgICAgJ289LSAnICsgJzE5MjM1MTg1MTYnICsgJyAyIElOIElQNCAwLjAuMC4wXFxyXFxuJyArLy8gRklYTUVcbiAgICAgICAgICAgICAgICAncz0tXFxyXFxuJyArXG4gICAgICAgICAgICAgICAgJ3Q9MCAwXFxyXFxuJztcbiAgICAgICAgICAgIC8vIGZpcnN0LCB0YWtlIHNvbWUgdGhpbmdzIGZyb20gdGhlIGxvY2FsIGRlc2NyaXB0aW9uXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubG9jYWxTRFAubWVkaWEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb2JibGVkICs9IFNEUFV0aWwuZmluZF9saW5lKHRoaXMubG9jYWxTRFAubWVkaWFbaV0sICdtPScpICsgJ1xcclxcbic7XG4gICAgICAgICAgICAgICAgY29iYmxlZCArPSBTRFBVdGlsLmZpbmRfbGluZXModGhpcy5sb2NhbFNEUC5tZWRpYVtpXSwgJ2E9cnRwbWFwOicpLmpvaW4oJ1xcclxcbicpICsgJ1xcclxcbic7XG4gICAgICAgICAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKHRoaXMubG9jYWxTRFAubWVkaWFbaV0sICdhPW1pZDonKSkge1xuICAgICAgICAgICAgICAgICAgICBjb2JibGVkICs9IFNEUFV0aWwuZmluZF9saW5lKHRoaXMubG9jYWxTRFAubWVkaWFbaV0sICdhPW1pZDonKSArICdcXHJcXG4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb2JibGVkICs9ICdhPWluYWN0aXZlXFxyXFxuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMucmVtb3RlU0RQID0gbmV3IFNEUChjb2JibGVkKTtcbiAgICAgICAgfVxuICAgICAgICAvLyB0aGVuIGFkZCB0aGluZ3MgbGlrZSBpY2UgYW5kIGR0bHMgZnJvbSByZW1vdGUgY2FuZGlkYXRlXG4gICAgICAgIGVsZW0uZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYucmVtb3RlU0RQLm1lZGlhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKHNlbGYucmVtb3RlU0RQLm1lZGlhW2ldLCAnYT1taWQ6JyArICQodGhpcykuYXR0cignbmFtZScpKSB8fFxuICAgICAgICAgICAgICAgICAgICBzZWxmLnJlbW90ZVNEUC5tZWRpYVtpXS5pbmRleE9mKCdtPScgKyAkKHRoaXMpLmF0dHIoJ25hbWUnKSkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFTRFBVdGlsLmZpbmRfbGluZShzZWxmLnJlbW90ZVNEUC5tZWRpYVtpXSwgJ2E9aWNlLXVmcmFnOicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdG1wID0gJCh0aGlzKS5maW5kKCd0cmFuc3BvcnQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYucmVtb3RlU0RQLm1lZGlhW2ldICs9ICdhPWljZS11ZnJhZzonICsgdG1wLmF0dHIoJ3VmcmFnJykgKyAnXFxyXFxuJztcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYucmVtb3RlU0RQLm1lZGlhW2ldICs9ICdhPWljZS1wd2Q6JyArIHRtcC5hdHRyKCdwd2QnKSArICdcXHJcXG4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgdG1wID0gJCh0aGlzKS5maW5kKCd0cmFuc3BvcnQ+ZmluZ2VycHJpbnQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0bXAubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5yZW1vdGVTRFAubWVkaWFbaV0gKz0gJ2E9ZmluZ2VycHJpbnQ6JyArIHRtcC5hdHRyKCdoYXNoJykgKyAnICcgKyB0bXAudGV4dCgpICsgJ1xcclxcbic7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdubyBkdGxzIGZpbmdlcnByaW50ICh3ZWJydGMgaXNzdWUgIzE3MTg/KScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYucmVtb3RlU0RQLm1lZGlhW2ldICs9ICdhPWNyeXB0bzoxIEFFU19DTV8xMjhfSE1BQ19TSEExXzgwIGlubGluZTpCQUFEQkFBREJBQURCQUFEQkFBREJBQURCQUFEQkFBREJBQURCQUFEXFxyXFxuJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5yZW1vdGVTRFAucmF3ID0gdGhpcy5yZW1vdGVTRFAuc2Vzc2lvbiArIHRoaXMucmVtb3RlU0RQLm1lZGlhLmpvaW4oJycpO1xuXG4gICAgICAgIC8vIHdlIG5lZWQgYSBjb21wbGV0ZSBTRFAgd2l0aCBpY2UtdWZyYWcvaWNlLXB3ZCBpbiBhbGwgcGFydHNcbiAgICAgICAgLy8gdGhpcyBtYWtlcyB0aGUgYXNzdW1wdGlvbiB0aGF0IHRoZSBQUkFOU1dFUiBpcyBjb25zdHJ1Y3RlZCBzdWNoIHRoYXQgdGhlIGljZS11ZnJhZyBpcyBpbiBhbGwgbWVkaWFwYXJ0c1xuICAgICAgICAvLyBidXQgaXQgY291bGQgYmUgaW4gdGhlIHNlc3Npb24gcGFydCBhcyB3ZWxsLiBzaW5jZSB0aGUgY29kZSBhYm92ZSBjb25zdHJ1Y3RzIHRoaXMgc2RwIHRoaXMgY2FuJ3QgaGFwcGVuIGhvd2V2ZXJcbiAgICAgICAgdmFyIGlzY29tcGxldGUgPSB0aGlzLnJlbW90ZVNEUC5tZWRpYS5maWx0ZXIoZnVuY3Rpb24gKG1lZGlhcGFydCkge1xuICAgICAgICAgICAgcmV0dXJuIFNEUFV0aWwuZmluZF9saW5lKG1lZGlhcGFydCwgJ2E9aWNlLXVmcmFnOicpO1xuICAgICAgICB9KS5sZW5ndGggPT0gdGhpcy5yZW1vdGVTRFAubWVkaWEubGVuZ3RoO1xuXG4gICAgICAgIGlmIChpc2NvbXBsZXRlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc2V0dGluZyBwcmFuc3dlcicpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0aGlzLnBlZXJjb25uZWN0aW9uLnNldFJlbW90ZURlc2NyaXB0aW9uKG5ldyBSVENTZXNzaW9uRGVzY3JpcHRpb24oe3R5cGU6ICdwcmFuc3dlcicsIHNkcDogdGhpcy5yZW1vdGVTRFAucmF3IH0pLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NldFJlbW90ZURlc2NyaXB0aW9uIHByYW5zd2VyIGZhaWxlZCcsIGUudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ3NldHRpbmcgcHJhbnN3ZXIgZmFpbGVkJywgZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdub3QgeWV0IHNldHRpbmcgcHJhbnN3ZXInKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBvcGVyYXRlIG9uIGVhY2ggY29udGVudCBlbGVtZW50XG4gICAgZWxlbS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gd291bGQgbG92ZSB0byBkZWFjdGl2YXRlIHRoaXMsIGJ1dCBmaXJlZm94IHN0aWxsIHJlcXVpcmVzIGl0XG4gICAgICAgIHZhciBpZHggPSAtMTtcbiAgICAgICAgdmFyIGk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBzZWxmLnJlbW90ZVNEUC5tZWRpYS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKHNlbGYucmVtb3RlU0RQLm1lZGlhW2ldLCAnYT1taWQ6JyArICQodGhpcykuYXR0cignbmFtZScpKSB8fFxuICAgICAgICAgICAgICAgIHNlbGYucmVtb3RlU0RQLm1lZGlhW2ldLmluZGV4T2YoJ209JyArICQodGhpcykuYXR0cignbmFtZScpKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGlkeCA9IGk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkeCA9PSAtMSkgeyAvLyBmYWxsIGJhY2sgdG8gbG9jYWxkZXNjcmlwdGlvblxuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IHNlbGYubG9jYWxTRFAubWVkaWEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUoc2VsZi5sb2NhbFNEUC5tZWRpYVtpXSwgJ2E9bWlkOicgKyAkKHRoaXMpLmF0dHIoJ25hbWUnKSkgfHxcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5sb2NhbFNEUC5tZWRpYVtpXS5pbmRleE9mKCdtPScgKyAkKHRoaXMpLmF0dHIoJ25hbWUnKSkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWR4ID0gaTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBuYW1lID0gJCh0aGlzKS5hdHRyKCduYW1lJyk7XG4gICAgICAgIC8vIFRPRE86IGNoZWNrIGljZS1wd2QgYW5kIGljZS11ZnJhZz9cbiAgICAgICAgJCh0aGlzKS5maW5kKCd0cmFuc3BvcnQ+Y2FuZGlkYXRlJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbGluZSwgY2FuZGlkYXRlO1xuICAgICAgICAgICAgbGluZSA9IFNEUFV0aWwuY2FuZGlkYXRlRnJvbUppbmdsZSh0aGlzKTtcbiAgICAgICAgICAgIGNhbmRpZGF0ZSA9IG5ldyBSVENJY2VDYW5kaWRhdGUoe3NkcE1MaW5lSW5kZXg6IGlkeCxcbiAgICAgICAgICAgICAgICBzZHBNaWQ6IG5hbWUsXG4gICAgICAgICAgICAgICAgY2FuZGlkYXRlOiBsaW5lfSk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHNlbGYucGVlcmNvbm5lY3Rpb24uYWRkSWNlQ2FuZGlkYXRlKGNhbmRpZGF0ZSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignYWRkSWNlQ2FuZGlkYXRlIGZhaWxlZCcsIGUudG9TdHJpbmcoKSwgbGluZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxuSmluZ2xlU2Vzc2lvbi5wcm90b3R5cGUuc2VuZEFuc3dlciA9IGZ1bmN0aW9uIChwcm92aXNpb25hbCkge1xuICAgIC8vY29uc29sZS5sb2coJ2NyZWF0ZUFuc3dlcicsIHByb3Zpc2lvbmFsKTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5jcmVhdGVBbnN3ZXIoXG4gICAgICAgIGZ1bmN0aW9uIChzZHApIHtcbiAgICAgICAgICAgIHNlbGYuY3JlYXRlZEFuc3dlcihzZHAsIHByb3Zpc2lvbmFsKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2NyZWF0ZUFuc3dlciBmYWlsZWQnLCBlKTtcbiAgICAgICAgfSxcbiAgICAgICAgdGhpcy5tZWRpYV9jb25zdHJhaW50c1xuICAgICk7XG59O1xuXG5KaW5nbGVTZXNzaW9uLnByb3RvdHlwZS5jcmVhdGVkQW5zd2VyID0gZnVuY3Rpb24gKHNkcCwgcHJvdmlzaW9uYWwpIHtcbiAgICAvL2NvbnNvbGUubG9nKCdjcmVhdGVBbnN3ZXIgY2FsbGJhY2snKTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5sb2NhbFNEUCA9IG5ldyBTRFAoc2RwLnNkcCk7XG4gICAgLy90aGlzLmxvY2FsU0RQLm1hbmdsZSgpO1xuICAgIHRoaXMudXNlcHJhbnN3ZXIgPSBwcm92aXNpb25hbCA9PT0gdHJ1ZTtcbiAgICBpZiAodGhpcy51c2V0cmlja2xlKSB7XG4gICAgICAgIGlmICghdGhpcy51c2VwcmFuc3dlcikge1xuICAgICAgICAgICAgdmFyIGFjY2VwdCA9ICRpcSh7dG86IHRoaXMucGVlcmppZCxcbiAgICAgICAgICAgICAgICB0eXBlOiAnc2V0J30pXG4gICAgICAgICAgICAgICAgLmMoJ2ppbmdsZScsIHt4bWxuczogJ3Vybjp4bXBwOmppbmdsZToxJyxcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiAnc2Vzc2lvbi1hY2NlcHQnLFxuICAgICAgICAgICAgICAgICAgICBpbml0aWF0b3I6IHRoaXMuaW5pdGlhdG9yLFxuICAgICAgICAgICAgICAgICAgICByZXNwb25kZXI6IHRoaXMucmVzcG9uZGVyLFxuICAgICAgICAgICAgICAgICAgICBzaWQ6IHRoaXMuc2lkIH0pO1xuICAgICAgICAgICAgdmFyIHNpbXVsY2FzdCA9IG5ldyBTaW11bGNhc3QoKTtcbiAgICAgICAgICAgIHZhciBwdWJsaWNMb2NhbERlc2MgPSBzaW11bGNhc3QucmV2ZXJzZVRyYW5zZm9ybUxvY2FsRGVzY3JpcHRpb24oc2RwKTtcbiAgICAgICAgICAgIHZhciBwdWJsaWNMb2NhbFNEUCA9IG5ldyBTRFAocHVibGljTG9jYWxEZXNjLnNkcCk7XG4gICAgICAgICAgICBwdWJsaWNMb2NhbFNEUC50b0ppbmdsZShhY2NlcHQsIHRoaXMuaW5pdGlhdG9yID09IHRoaXMubWUgPyAnaW5pdGlhdG9yJyA6ICdyZXNwb25kZXInKTtcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoYWNjZXB0LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFjayA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBhY2suc291cmNlID0gJ2Fuc3dlcic7XG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2Fjay5qaW5nbGUnLCBbc2VsZi5zaWQsIGFja10pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHN0YW56YSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSAoJChzdGFuemEpLmZpbmQoJ2Vycm9yJykubGVuZ3RoKSA/IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6ICQoc3RhbnphKS5maW5kKCdlcnJvcicpLmF0dHIoJ2NvZGUnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYXNvbjogJChzdGFuemEpLmZpbmQoJ2Vycm9yIDpmaXJzdCcpWzBdLnRhZ05hbWUsXG4gICAgICAgICAgICAgICAgICAgIH06e307XG4gICAgICAgICAgICAgICAgICAgIGVycm9yLnNvdXJjZSA9ICdhbnN3ZXInO1xuICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdlcnJvci5qaW5nbGUnLCBbc2VsZi5zaWQsIGVycm9yXSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAxMDAwMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZHAudHlwZSA9ICdwcmFuc3dlcic7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubG9jYWxTRFAubWVkaWEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzLmxvY2FsU0RQLm1lZGlhW2ldID0gdGhpcy5sb2NhbFNEUC5tZWRpYVtpXS5yZXBsYWNlKCdhPXNlbmRyZWN2XFxyXFxuJywgJ2E9aW5hY3RpdmVcXHJcXG4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubG9jYWxTRFAucmF3ID0gdGhpcy5sb2NhbFNEUC5zZXNzaW9uICsgJ1xcclxcbicgKyB0aGlzLmxvY2FsU0RQLm1lZGlhLmpvaW4oJycpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHNkcC5zZHAgPSB0aGlzLmxvY2FsU0RQLnJhdztcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLnNldExvY2FsRGVzY3JpcHRpb24oc2RwLFxuICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdzZXRMb2NhbERlc2NyaXB0aW9uLmppbmdsZScsIFtzZWxmLnNpZF0pO1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnc2V0TG9jYWxEZXNjcmlwdGlvbiBzdWNjZXNzJyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdzZXRMb2NhbERlc2NyaXB0aW9uIGZhaWxlZCcsIGUpO1xuICAgICAgICB9XG4gICAgKTtcbiAgICB2YXIgY2FuZHMgPSBTRFBVdGlsLmZpbmRfbGluZXModGhpcy5sb2NhbFNEUC5yYXcsICdhPWNhbmRpZGF0ZTonKTtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IGNhbmRzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciBjYW5kID0gU0RQVXRpbC5wYXJzZV9pY2VjYW5kaWRhdGUoY2FuZHNbal0pO1xuICAgICAgICBpZiAoY2FuZC50eXBlID09ICdzcmZseCcpIHtcbiAgICAgICAgICAgIHRoaXMuaGFkc3R1bmNhbmRpZGF0ZSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAoY2FuZC50eXBlID09ICdyZWxheScpIHtcbiAgICAgICAgICAgIHRoaXMuaGFkdHVybmNhbmRpZGF0ZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5KaW5nbGVTZXNzaW9uLnByb3RvdHlwZS5zZW5kVGVybWluYXRlID0gZnVuY3Rpb24gKHJlYXNvbiwgdGV4dCkge1xuICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgdGVybSA9ICRpcSh7dG86IHRoaXMucGVlcmppZCxcbiAgICAgICAgICAgIHR5cGU6ICdzZXQnfSlcbiAgICAgICAgICAgIC5jKCdqaW5nbGUnLCB7eG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6MScsXG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnc2Vzc2lvbi10ZXJtaW5hdGUnLFxuICAgICAgICAgICAgICAgIGluaXRpYXRvcjogdGhpcy5pbml0aWF0b3IsXG4gICAgICAgICAgICAgICAgc2lkOiB0aGlzLnNpZH0pXG4gICAgICAgICAgICAuYygncmVhc29uJylcbiAgICAgICAgICAgIC5jKHJlYXNvbiB8fCAnc3VjY2VzcycpO1xuXG4gICAgaWYgKHRleHQpIHtcbiAgICAgICAgdGVybS51cCgpLmMoJ3RleHQnKS50KHRleHQpO1xuICAgIH1cblxuICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEodGVybSxcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5wZWVyY29ubmVjdGlvbi5jbG9zZSgpO1xuICAgICAgICAgICAgc2VsZi5wZWVyY29ubmVjdGlvbiA9IG51bGw7XG4gICAgICAgICAgICBzZWxmLnRlcm1pbmF0ZSgpO1xuICAgICAgICAgICAgdmFyIGFjayA9IHt9O1xuICAgICAgICAgICAgYWNrLnNvdXJjZSA9ICd0ZXJtaW5hdGUnO1xuICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignYWNrLmppbmdsZScsIFtzZWxmLnNpZCwgYWNrXSk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzdGFuemEpIHtcbiAgICAgICAgICAgIHZhciBlcnJvciA9ICgkKHN0YW56YSkuZmluZCgnZXJyb3InKS5sZW5ndGgpID8ge1xuICAgICAgICAgICAgICAgIGNvZGU6ICQoc3RhbnphKS5maW5kKCdlcnJvcicpLmF0dHIoJ2NvZGUnKSxcbiAgICAgICAgICAgICAgICByZWFzb246ICQoc3RhbnphKS5maW5kKCdlcnJvciA6Zmlyc3QnKVswXS50YWdOYW1lLFxuICAgICAgICAgICAgfTp7fTtcbiAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2Fjay5qaW5nbGUnLCBbc2VsZi5zaWQsIGVycm9yXSk7XG4gICAgICAgIH0sXG4gICAgICAgIDEwMDAwKTtcbiAgICBpZiAodGhpcy5zdGF0c2ludGVydmFsICE9PSBudWxsKSB7XG4gICAgICAgIHdpbmRvdy5jbGVhckludGVydmFsKHRoaXMuc3RhdHNpbnRlcnZhbCk7XG4gICAgICAgIHRoaXMuc3RhdHNpbnRlcnZhbCA9IG51bGw7XG4gICAgfVxufTtcblxuSmluZ2xlU2Vzc2lvbi5wcm90b3R5cGUuc2VuZE11dGUgPSBmdW5jdGlvbiAobXV0ZWQsIGNvbnRlbnQpIHtcbiAgICB2YXIgaW5mbyA9ICRpcSh7dG86IHRoaXMucGVlcmppZCxcbiAgICAgICAgdHlwZTogJ3NldCd9KVxuICAgICAgICAuYygnamluZ2xlJywge3htbG5zOiAndXJuOnhtcHA6amluZ2xlOjEnLFxuICAgICAgICAgICAgYWN0aW9uOiAnc2Vzc2lvbi1pbmZvJyxcbiAgICAgICAgICAgIGluaXRpYXRvcjogdGhpcy5pbml0aWF0b3IsXG4gICAgICAgICAgICBzaWQ6IHRoaXMuc2lkIH0pO1xuICAgIGluZm8uYyhtdXRlZCA/ICdtdXRlJyA6ICd1bm11dGUnLCB7eG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6aW5mbzoxJ30pO1xuICAgIGluZm8uYXR0cnMoeydjcmVhdG9yJzogdGhpcy5tZSA9PSB0aGlzLmluaXRpYXRvciA/ICdjcmVhdG9yJyA6ICdyZXNwb25kZXInfSk7XG4gICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgICAgaW5mby5hdHRycyh7J25hbWUnOiBjb250ZW50fSk7XG4gICAgfVxuICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kKGluZm8pO1xufTtcblxuSmluZ2xlU2Vzc2lvbi5wcm90b3R5cGUuc2VuZFJpbmdpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGluZm8gPSAkaXEoe3RvOiB0aGlzLnBlZXJqaWQsXG4gICAgICAgIHR5cGU6ICdzZXQnfSlcbiAgICAgICAgLmMoJ2ppbmdsZScsIHt4bWxuczogJ3Vybjp4bXBwOmppbmdsZToxJyxcbiAgICAgICAgICAgIGFjdGlvbjogJ3Nlc3Npb24taW5mbycsXG4gICAgICAgICAgICBpbml0aWF0b3I6IHRoaXMuaW5pdGlhdG9yLFxuICAgICAgICAgICAgc2lkOiB0aGlzLnNpZCB9KTtcbiAgICBpbmZvLmMoJ3JpbmdpbmcnLCB7eG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6aW5mbzoxJ30pO1xuICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kKGluZm8pO1xufTtcblxuSmluZ2xlU2Vzc2lvbi5wcm90b3R5cGUuZ2V0U3RhdHMgPSBmdW5jdGlvbiAoaW50ZXJ2YWwpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJlY3YgPSB7YXVkaW86IDAsIHZpZGVvOiAwfTtcbiAgICB2YXIgbG9zdCA9IHthdWRpbzogMCwgdmlkZW86IDB9O1xuICAgIHZhciBsYXN0cmVjdiA9IHthdWRpbzogMCwgdmlkZW86IDB9O1xuICAgIHZhciBsYXN0bG9zdCA9IHthdWRpbzogMCwgdmlkZW86IDB9O1xuICAgIHZhciBsb3NzID0ge2F1ZGlvOiAwLCB2aWRlbzogMH07XG4gICAgdmFyIGRlbHRhID0ge2F1ZGlvOiAwLCB2aWRlbzogMH07XG4gICAgdGhpcy5zdGF0c2ludGVydmFsID0gd2luZG93LnNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHNlbGYgJiYgc2VsZi5wZWVyY29ubmVjdGlvbiAmJiBzZWxmLnBlZXJjb25uZWN0aW9uLmdldFN0YXRzKSB7XG4gICAgICAgICAgICBzZWxmLnBlZXJjb25uZWN0aW9uLmdldFN0YXRzKGZ1bmN0aW9uIChzdGF0cykge1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHRzID0gc3RhdHMucmVzdWx0KCk7XG4gICAgICAgICAgICAgICAgLy8gVE9ETzogdGhlcmUgYXJlIHNvIG11Y2ggc3RhdGlzdGljcyB5b3UgY2FuIGdldCBmcm9tIHRoaXMuLlxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVzdWx0cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0c1tpXS50eXBlID09ICdzc3JjJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhY2tldHNyZWN2ID0gcmVzdWx0c1tpXS5zdGF0KCdwYWNrZXRzUmVjZWl2ZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwYWNrZXRzbG9zdCA9IHJlc3VsdHNbaV0uc3RhdCgncGFja2V0c0xvc3QnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYWNrZXRzcmVjdiAmJiBwYWNrZXRzbG9zdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhY2tldHNyZWN2ID0gcGFyc2VJbnQocGFja2V0c3JlY3YsIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWNrZXRzbG9zdCA9IHBhcnNlSW50KHBhY2tldHNsb3N0LCAxMCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0c1tpXS5zdGF0KCdnb29nRnJhbWVSYXRlUmVjZWl2ZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXN0bG9zdC52aWRlbyA9IGxvc3QudmlkZW87XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RyZWN2LnZpZGVvID0gcmVjdi52aWRlbztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjdi52aWRlbyA9IHBhY2tldHNyZWN2O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb3N0LnZpZGVvID0gcGFja2V0c2xvc3Q7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFzdGxvc3QuYXVkaW8gPSBsb3N0LmF1ZGlvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXN0cmVjdi5hdWRpbyA9IHJlY3YuYXVkaW87XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlY3YuYXVkaW8gPSBwYWNrZXRzcmVjdjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9zdC5hdWRpbyA9IHBhY2tldHNsb3N0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkZWx0YS5hdWRpbyA9IHJlY3YuYXVkaW8gLSBsYXN0cmVjdi5hdWRpbztcbiAgICAgICAgICAgICAgICBkZWx0YS52aWRlbyA9IHJlY3YudmlkZW8gLSBsYXN0cmVjdi52aWRlbztcbiAgICAgICAgICAgICAgICBsb3NzLmF1ZGlvID0gKGRlbHRhLmF1ZGlvID4gMCkgPyBNYXRoLmNlaWwoMTAwICogKGxvc3QuYXVkaW8gLSBsYXN0bG9zdC5hdWRpbykgLyBkZWx0YS5hdWRpbykgOiAwO1xuICAgICAgICAgICAgICAgIGxvc3MudmlkZW8gPSAoZGVsdGEudmlkZW8gPiAwKSA/IE1hdGguY2VpbCgxMDAgKiAobG9zdC52aWRlbyAtIGxhc3Rsb3N0LnZpZGVvKSAvIGRlbHRhLnZpZGVvKSA6IDA7XG4gICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcigncGFja2V0bG9zcy5qaW5nbGUnLCBbc2VsZi5zaWQsIGxvc3NdKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSwgaW50ZXJ2YWwgfHwgMzAwMCk7XG4gICAgcmV0dXJuIHRoaXMuc3RhdHNpbnRlcnZhbDtcbn07XG5tb2R1bGUuZXhwb3J0cyA9IEppbmdsZVNlc3Npb247IiwidmFyIFNEUCA9IHJlcXVpcmUoXCIuL3N0cm9waGUuamluZ2xlLnNkcFwiKTtcblxuLyoqXG4gKiBCYXNlIGNsYXNzIGZvciBDb2xpYnJpRm9jdXMgYW5kIEppbmdsZVNlc3Npb24uXG4gKiBAcGFyYW0gY29ubmVjdGlvbiBTdHJvcGhlIGNvbm5lY3Rpb24gb2JqZWN0XG4gKiBAcGFyYW0gc2lkIG15IHNlc3Npb24gaWRlbnRpZmllcihyZXNvdXJjZSlcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBTZXNzaW9uQmFzZShjb25uZWN0aW9uLCBzaWQpe1xuXG4gICAgdGhpcy5jb25uZWN0aW9uID0gY29ubmVjdGlvbjtcbiAgICB0aGlzLnNpZCA9IHNpZDtcbn1cblxuXG5TZXNzaW9uQmFzZS5wcm90b3R5cGUubW9kaWZ5U291cmNlcyA9IGZ1bmN0aW9uIChzdWNjZXNzQ2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5tb2RpZnlTb3VyY2VzKGZ1bmN0aW9uKCl7XG4gICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ3NldExvY2FsRGVzY3JpcHRpb24uamluZ2xlJywgW3NlbGYuc2lkXSk7XG4gICAgICAgIGlmKHN1Y2Nlc3NDYWxsYmFjaykge1xuICAgICAgICAgICAgc3VjY2Vzc0NhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cblNlc3Npb25CYXNlLnByb3RvdHlwZS5hZGRTb3VyY2UgPSBmdW5jdGlvbiAoZWxlbSwgZnJvbUppZCkge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIEZJWE1FOiBkaXJ0eSB3YWl0aW5nXG4gICAgaWYgKCF0aGlzLnBlZXJjb25uZWN0aW9uLmxvY2FsRGVzY3JpcHRpb24pXG4gICAge1xuICAgICAgICBjb25zb2xlLndhcm4oXCJhZGRTb3VyY2UgLSBsb2NhbERlc2NyaXB0aW9uIG5vdCByZWFkeSB5ZXRcIilcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc2VsZi5hZGRTb3VyY2UoZWxlbSwgZnJvbUppZCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgMjAwXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLmFkZFNvdXJjZShlbGVtKTtcblxuICAgIHRoaXMubW9kaWZ5U291cmNlcygpO1xufTtcblxuU2Vzc2lvbkJhc2UucHJvdG90eXBlLnJlbW92ZVNvdXJjZSA9IGZ1bmN0aW9uIChlbGVtLCBmcm9tSmlkKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gRklYTUU6IGRpcnR5IHdhaXRpbmdcbiAgICBpZiAoIXRoaXMucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbilcbiAgICB7XG4gICAgICAgIGNvbnNvbGUud2FybihcInJlbW92ZVNvdXJjZSAtIGxvY2FsRGVzY3JpcHRpb24gbm90IHJlYWR5IHlldFwiKVxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzZWxmLnJlbW92ZVNvdXJjZShlbGVtLCBmcm9tSmlkKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAyMDBcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24ucmVtb3ZlU291cmNlKGVsZW0pO1xuXG4gICAgdGhpcy5tb2RpZnlTb3VyY2VzKCk7XG59O1xuLyoqXG4gKiBTd2l0Y2hlcyB2aWRlbyBzdHJlYW1zLlxuICogQHBhcmFtIG5ld19zdHJlYW0gbmV3IHN0cmVhbSB0aGF0IHdpbGwgYmUgdXNlZCBhcyB2aWRlbyBvZiB0aGlzIHNlc3Npb24uXG4gKiBAcGFyYW0gb2xkU3RyZWFtIG9sZCB2aWRlbyBzdHJlYW0gb2YgdGhpcyBzZXNzaW9uLlxuICogQHBhcmFtIHN1Y2Nlc3NfY2FsbGJhY2sgY2FsbGJhY2sgZXhlY3V0ZWQgYWZ0ZXIgc3VjY2Vzc2Z1bCBzdHJlYW0gc3dpdGNoLlxuICovXG5TZXNzaW9uQmFzZS5wcm90b3R5cGUuc3dpdGNoU3RyZWFtcyA9IGZ1bmN0aW9uIChuZXdfc3RyZWFtLCBvbGRTdHJlYW0sIHN1Y2Nlc3NfY2FsbGJhY2spIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIFN0b3AgdGhlIHN0cmVhbSB0byB0cmlnZ2VyIG9uZW5kZWQgZXZlbnQgZm9yIG9sZCBzdHJlYW1cbiAgICBvbGRTdHJlYW0uc3RvcCgpO1xuXG4gICAgLy8gUmVtZW1iZXIgU0RQIHRvIGZpZ3VyZSBvdXQgYWRkZWQvcmVtb3ZlZCBTU1JDc1xuICAgIHZhciBvbGRTZHAgPSBudWxsO1xuICAgIGlmKHNlbGYucGVlcmNvbm5lY3Rpb24pIHtcbiAgICAgICAgaWYoc2VsZi5wZWVyY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBvbGRTZHAgPSBuZXcgU0RQKHNlbGYucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbi5zZHApO1xuICAgICAgICB9XG4gICAgICAgIHNlbGYucGVlcmNvbm5lY3Rpb24ucmVtb3ZlU3RyZWFtKG9sZFN0cmVhbSk7XG4gICAgICAgIHNlbGYucGVlcmNvbm5lY3Rpb24uYWRkU3RyZWFtKG5ld19zdHJlYW0pO1xuICAgIH1cblxuICAgIHNlbGYuY29ubmVjdGlvbi5qaW5nbGUubG9jYWxWaWRlbyA9IG5ld19zdHJlYW07XG5cbiAgICBzZWxmLmNvbm5lY3Rpb24uamluZ2xlLmxvY2FsU3RyZWFtcyA9IFtdO1xuICAgIHNlbGYuY29ubmVjdGlvbi5qaW5nbGUubG9jYWxTdHJlYW1zLnB1c2goc2VsZi5jb25uZWN0aW9uLmppbmdsZS5sb2NhbEF1ZGlvKTtcbiAgICBzZWxmLmNvbm5lY3Rpb24uamluZ2xlLmxvY2FsU3RyZWFtcy5wdXNoKHNlbGYuY29ubmVjdGlvbi5qaW5nbGUubG9jYWxWaWRlbyk7XG5cbiAgICAvLyBDb25mZXJlbmNlIGlzIG5vdCBhY3RpdmVcbiAgICBpZighb2xkU2RwIHx8ICFzZWxmLnBlZXJjb25uZWN0aW9uKSB7XG4gICAgICAgIHN1Y2Nlc3NfY2FsbGJhY2soKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHNlbGYucGVlcmNvbm5lY3Rpb24uc3dpdGNoc3RyZWFtcyA9IHRydWU7XG4gICAgc2VsZi5tb2RpZnlTb3VyY2VzKGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnbW9kaWZ5IHNvdXJjZXMgZG9uZScpO1xuXG4gICAgICAgIHZhciBuZXdTZHAgPSBuZXcgU0RQKHNlbGYucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbi5zZHApO1xuICAgICAgICBjb25zb2xlLmxvZyhcIlNEUHNcIiwgb2xkU2RwLCBuZXdTZHApO1xuICAgICAgICBzZWxmLm5vdGlmeU15U1NSQ1VwZGF0ZShvbGRTZHAsIG5ld1NkcCk7XG5cbiAgICAgICAgc3VjY2Vzc19jYWxsYmFjaygpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBGaWd1cmVzIG91dCBhZGRlZC9yZW1vdmVkIHNzcmNzIGFuZCBzZW5kIHVwZGF0ZSBJUXMuXG4gKiBAcGFyYW0gb2xkX3NkcCBTRFAgb2JqZWN0IGZvciBvbGQgZGVzY3JpcHRpb24uXG4gKiBAcGFyYW0gbmV3X3NkcCBTRFAgb2JqZWN0IGZvciBuZXcgZGVzY3JpcHRpb24uXG4gKi9cblNlc3Npb25CYXNlLnByb3RvdHlwZS5ub3RpZnlNeVNTUkNVcGRhdGUgPSBmdW5jdGlvbiAob2xkX3NkcCwgbmV3X3NkcCkge1xuXG4gICAgdmFyIG9sZF9tZWRpYSA9IG9sZF9zZHAuZ2V0TWVkaWFTc3JjTWFwKCk7XG4gICAgdmFyIG5ld19tZWRpYSA9IG5ld19zZHAuZ2V0TWVkaWFTc3JjTWFwKCk7XG4gICAgLy9jb25zb2xlLmxvZyhcIm9sZC9uZXcgbWVkaWFzOiBcIiwgb2xkX21lZGlhLCBuZXdfbWVkaWEpO1xuXG4gICAgdmFyIHRvQWRkID0gb2xkX3NkcC5nZXROZXdNZWRpYShuZXdfc2RwKTtcbiAgICB2YXIgdG9SZW1vdmUgPSBuZXdfc2RwLmdldE5ld01lZGlhKG9sZF9zZHApO1xuICAgIC8vY29uc29sZS5sb2coXCJ0byBhZGRcIiwgdG9BZGQpO1xuICAgIC8vY29uc29sZS5sb2coXCJ0byByZW1vdmVcIiwgdG9SZW1vdmUpO1xuICAgIGlmKE9iamVjdC5rZXlzKHRvUmVtb3ZlKS5sZW5ndGggPiAwKXtcbiAgICAgICAgdGhpcy5zZW5kU1NSQ1VwZGF0ZSh0b1JlbW92ZSwgbnVsbCwgZmFsc2UpO1xuICAgIH1cbiAgICBpZihPYmplY3Qua2V5cyh0b0FkZCkubGVuZ3RoID4gMCl7XG4gICAgICAgIHRoaXMuc2VuZFNTUkNVcGRhdGUodG9BZGQsIG51bGwsIHRydWUpO1xuICAgIH1cbn07XG5cbi8qKlxuICogRW1wdHkgbWV0aG9kIHRoYXQgZG9lcyBub3RoaW5nIGJ5IGRlZmF1bHQuIEl0IHNob3VsZCBzZW5kIFNTUkMgdXBkYXRlIElRcyB0byBzZXNzaW9uIHBhcnRpY2lwYW50cy5cbiAqIEBwYXJhbSBzZHBNZWRpYVNzcmNzIGFycmF5IG9mXG4gKiBAcGFyYW0gZnJvbUppZFxuICogQHBhcmFtIGlzQWRkXG4gKi9cblNlc3Npb25CYXNlLnByb3RvdHlwZS5zZW5kU1NSQ1VwZGF0ZSA9IGZ1bmN0aW9uKHNkcE1lZGlhU3NyY3MsIGZyb21KaWQsIGlzQWRkKSB7XG4gICAgLy9GSVhNRTogcHV0IGRlZmF1bHQgaW1wbGVtZW50YXRpb24gaGVyZShtYXliZSBmcm9tIEppbmdsZVNlc3Npb24/KVxufVxuXG4vKipcbiAqIFNlbmRzIFNTUkMgdXBkYXRlIElRLlxuICogQHBhcmFtIHNkcE1lZGlhU3NyY3MgU1NSQ3MgbWFwIG9idGFpbmVkIGZyb20gU0RQLmdldE5ld01lZGlhLiBDbnRhaW5zIFNTUkNzIHRvIGFkZC9yZW1vdmUuXG4gKiBAcGFyYW0gc2lkIHNlc3Npb24gaWRlbnRpZmllciB0aGF0IHdpbGwgYmUgcHV0IGludG8gdGhlIElRLlxuICogQHBhcmFtIGluaXRpYXRvciBpbml0aWF0b3IgaWRlbnRpZmllci5cbiAqIEBwYXJhbSB0b0ppZCBkZXN0aW5hdGlvbiBKaWRcbiAqIEBwYXJhbSBpc0FkZCBpbmRpY2F0ZXMgaWYgdGhpcyBpcyByZW1vdmUgb3IgYWRkIG9wZXJhdGlvbi5cbiAqL1xuU2Vzc2lvbkJhc2UucHJvdG90eXBlLnNlbmRTU1JDVXBkYXRlSXEgPSBmdW5jdGlvbihzZHBNZWRpYVNzcmNzLCBzaWQsIGluaXRpYXRvciwgdG9KaWQsIGlzQWRkKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG1vZGlmeSA9ICRpcSh7dG86IHRvSmlkLCB0eXBlOiAnc2V0J30pXG4gICAgICAgIC5jKCdqaW5nbGUnLCB7XG4gICAgICAgICAgICB4bWxuczogJ3Vybjp4bXBwOmppbmdsZToxJyxcbiAgICAgICAgICAgIGFjdGlvbjogaXNBZGQgPyAnc291cmNlLWFkZCcgOiAnc291cmNlLXJlbW92ZScsXG4gICAgICAgICAgICBpbml0aWF0b3I6IGluaXRpYXRvcixcbiAgICAgICAgICAgIHNpZDogc2lkXG4gICAgICAgIH1cbiAgICApO1xuICAgIC8vIEZJWE1FOiBvbmx5IGFubm91bmNlIHZpZGVvIHNzcmNzIHNpbmNlIHdlIG1peCBhdWRpbyBhbmQgZG9udCBuZWVkXG4gICAgLy8gICAgICB0aGUgYXVkaW8gc3NyY3MgdGhlcmVmb3JlXG4gICAgdmFyIG1vZGlmaWVkID0gZmFsc2U7XG4gICAgT2JqZWN0LmtleXMoc2RwTWVkaWFTc3JjcykuZm9yRWFjaChmdW5jdGlvbihjaGFubmVsTnVtKXtcbiAgICAgICAgbW9kaWZpZWQgPSB0cnVlO1xuICAgICAgICB2YXIgY2hhbm5lbCA9IHNkcE1lZGlhU3NyY3NbY2hhbm5lbE51bV07XG4gICAgICAgIG1vZGlmeS5jKCdjb250ZW50Jywge25hbWU6IGNoYW5uZWwubWVkaWFUeXBlfSk7XG5cbiAgICAgICAgbW9kaWZ5LmMoJ2Rlc2NyaXB0aW9uJywge3htbG5zOid1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6MScsIG1lZGlhOiBjaGFubmVsLm1lZGlhVHlwZX0pO1xuICAgICAgICAvLyBGSVhNRTogbm90IGNvbXBsZXRseSBzdXJlIHRoaXMgb3BlcmF0ZXMgb24gYmxvY2tzIGFuZCAvIG9yIGhhbmRsZXMgZGlmZmVyZW50IHNzcmNzIGNvcnJlY3RseVxuICAgICAgICAvLyBnZW5lcmF0ZSBzb3VyY2VzIGZyb20gbGluZXNcbiAgICAgICAgT2JqZWN0LmtleXMoY2hhbm5lbC5zc3JjcykuZm9yRWFjaChmdW5jdGlvbihzc3JjTnVtKSB7XG4gICAgICAgICAgICB2YXIgbWVkaWFTc3JjID0gY2hhbm5lbC5zc3Jjc1tzc3JjTnVtXTtcbiAgICAgICAgICAgIG1vZGlmeS5jKCdzb3VyY2UnLCB7IHhtbG5zOiAndXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOnNzbWE6MCcgfSk7XG4gICAgICAgICAgICBtb2RpZnkuYXR0cnMoe3NzcmM6IG1lZGlhU3NyYy5zc3JjfSk7XG4gICAgICAgICAgICAvLyBpdGVyYXRlIG92ZXIgc3NyYyBsaW5lc1xuICAgICAgICAgICAgbWVkaWFTc3JjLmxpbmVzLmZvckVhY2goZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gbGluZS5pbmRleE9mKCcgJyk7XG4gICAgICAgICAgICAgICAgdmFyIGt2ID0gbGluZS5zdWJzdHIoaWR4ICsgMSk7XG4gICAgICAgICAgICAgICAgbW9kaWZ5LmMoJ3BhcmFtZXRlcicpO1xuICAgICAgICAgICAgICAgIGlmIChrdi5pbmRleE9mKCc6JykgPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgbW9kaWZ5LmF0dHJzKHsgbmFtZToga3YgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbW9kaWZ5LmF0dHJzKHsgbmFtZToga3Yuc3BsaXQoJzonLCAyKVswXSB9KTtcbiAgICAgICAgICAgICAgICAgICAgbW9kaWZ5LmF0dHJzKHsgdmFsdWU6IGt2LnNwbGl0KCc6JywgMilbMV0gfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1vZGlmeS51cCgpOyAvLyBlbmQgb2YgcGFyYW1ldGVyXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIG1vZGlmeS51cCgpOyAvLyBlbmQgb2Ygc291cmNlXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIGdlbmVyYXRlIHNvdXJjZSBncm91cHMgZnJvbSBsaW5lc1xuICAgICAgICBjaGFubmVsLnNzcmNHcm91cHMuZm9yRWFjaChmdW5jdGlvbihzc3JjR3JvdXApIHtcbiAgICAgICAgICAgIGlmIChzc3JjR3JvdXAuc3NyY3MubGVuZ3RoICE9IDApIHtcblxuICAgICAgICAgICAgICAgIG1vZGlmeS5jKCdzc3JjLWdyb3VwJywge1xuICAgICAgICAgICAgICAgICAgICBzZW1hbnRpY3M6IHNzcmNHcm91cC5zZW1hbnRpY3MsXG4gICAgICAgICAgICAgICAgICAgIHhtbG5zOiAndXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOnNzbWE6MCdcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHNzcmNHcm91cC5zc3Jjcy5mb3JFYWNoKGZ1bmN0aW9uIChzc3JjKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vZGlmeS5jKCdzb3VyY2UnLCB7IHNzcmM6IHNzcmMgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC51cCgpOyAvLyBlbmQgb2Ygc291cmNlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgbW9kaWZ5LnVwKCk7IC8vIGVuZCBvZiBzc3JjLWdyb3VwXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG1vZGlmeS51cCgpOyAvLyBlbmQgb2YgZGVzY3JpcHRpb25cbiAgICAgICAgbW9kaWZ5LnVwKCk7IC8vIGVuZCBvZiBjb250ZW50XG4gICAgfSk7XG4gICAgaWYgKG1vZGlmaWVkKSB7XG4gICAgICAgIHNlbGYuY29ubmVjdGlvbi5zZW5kSVEobW9kaWZ5LFxuICAgICAgICAgICAgZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnZ290IG1vZGlmeSByZXN1bHQnLCByZXMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdnb3QgbW9kaWZ5IGVycm9yJywgZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZygnbW9kaWZpY2F0aW9uIG5vdCBuZWNlc3NhcnknKTtcbiAgICB9XG59O1xuXG4vLyBTRFAtYmFzZWQgbXV0ZSBieSBnb2luZyByZWN2b25seS9zZW5kcmVjdlxuLy8gRklYTUU6IHNob3VsZCBwcm9iYWJseSBibGFjayBvdXQgdGhlIHNjcmVlbiBhcyB3ZWxsXG5TZXNzaW9uQmFzZS5wcm90b3R5cGUudG9nZ2xlVmlkZW9NdXRlID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG5cbiAgICB2YXIgaXNtdXRlZCA9IGZhbHNlO1xuICAgIHZhciBsb2NhbFZpZGVvID0gY29ubmVjdGlvbi5qaW5nbGUubG9jYWxWaWRlbztcbiAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBsb2NhbFZpZGVvLmdldFZpZGVvVHJhY2tzKCkubGVuZ3RoOyBpZHgrKykge1xuICAgICAgICBpc211dGVkID0gIWxvY2FsVmlkZW8uZ2V0VmlkZW9UcmFja3MoKVtpZHhdLmVuYWJsZWQ7XG4gICAgfVxuICAgIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGxvY2FsVmlkZW8uZ2V0VmlkZW9UcmFja3MoKS5sZW5ndGg7IGlkeCsrKSB7XG4gICAgICAgIGxvY2FsVmlkZW8uZ2V0VmlkZW9UcmFja3MoKVtpZHhdLmVuYWJsZWQgPSAhbG9jYWxWaWRlby5nZXRWaWRlb1RyYWNrcygpW2lkeF0uZW5hYmxlZDtcbiAgICB9XG5cbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLmhhcmRNdXRlVmlkZW8oIWlzbXV0ZWQpO1xuICAgIHRoaXMubW9kaWZ5U291cmNlcyhjYWxsYmFjayghaXNtdXRlZCkpO1xufTtcblxuXG5TZXNzaW9uQmFzZS5wcm90b3R5cGUub25JY2VDb25uZWN0aW9uU3RhdGVDaGFuZ2UgPSBmdW5jdGlvbiAoc2lkLCBzZXNzaW9uKSB7XG4gICAgc3dpdGNoIChzZXNzaW9uLnBlZXJjb25uZWN0aW9uLmljZUNvbm5lY3Rpb25TdGF0ZSkge1xuICAgICAgICBjYXNlICdjaGVja2luZyc6XG4gICAgICAgICAgICBzZXNzaW9uLnRpbWVDaGVja2luZyA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICBzZXNzaW9uLmZpcnN0Y29ubmVjdCA9IHRydWU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnY29tcGxldGVkJzogLy8gb24gY2FsbGVyIHNpZGVcbiAgICAgICAgY2FzZSAnY29ubmVjdGVkJzpcbiAgICAgICAgICAgIGlmIChzZXNzaW9uLmZpcnN0Y29ubmVjdCkge1xuICAgICAgICAgICAgICAgIHNlc3Npb24uZmlyc3Rjb25uZWN0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdmFyIG1ldGFkYXRhID0ge307XG4gICAgICAgICAgICAgICAgbWV0YWRhdGEuc2V0dXBUaW1lID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKSAtIHNlc3Npb24udGltZUNoZWNraW5nO1xuICAgICAgICAgICAgICAgIHNlc3Npb24ucGVlcmNvbm5lY3Rpb24uZ2V0U3RhdHMoZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgICAgICAgICByZXMucmVzdWx0KCkuZm9yRWFjaChmdW5jdGlvbiAocmVwb3J0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVwb3J0LnR5cGUgPT0gJ2dvb2dDYW5kaWRhdGVQYWlyJyAmJiByZXBvcnQuc3RhdCgnZ29vZ0FjdGl2ZUNvbm5lY3Rpb24nKSA9PSAndHJ1ZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRhZGF0YS5sb2NhbENhbmRpZGF0ZVR5cGUgPSByZXBvcnQuc3RhdCgnZ29vZ0xvY2FsQ2FuZGlkYXRlVHlwZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGFkYXRhLnJlbW90ZUNhbmRpZGF0ZVR5cGUgPSByZXBvcnQuc3RhdCgnZ29vZ1JlbW90ZUNhbmRpZGF0ZVR5cGUnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxvZyBwYWlyIGFzIHdlbGwgc28gd2UgY2FuIGdldCBuaWNlIHBpZSBjaGFydHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRhZGF0YS5jYW5kaWRhdGVQYWlyID0gcmVwb3J0LnN0YXQoJ2dvb2dMb2NhbENhbmRpZGF0ZVR5cGUnKSArICc7JyArIHJlcG9ydC5zdGF0KCdnb29nUmVtb3RlQ2FuZGlkYXRlVHlwZScpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlcG9ydC5zdGF0KCdnb29nUmVtb3RlQWRkcmVzcycpLmluZGV4T2YoJ1snKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRhZGF0YS5pcHY2ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuLy8gICAgICAgICAgICAgICAgICAgIHRyYWNrVXNhZ2UoJ2ljZUNvbm5lY3RlZCcsIG1ldGFkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZShcIi4uL3V0aWwvdHJhY2tpbmcuanNcIikoJ2ljZUNvbm5lY3RlZCcsIG1ldGFkYXRhKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHdhaXRGb3JQcmVzZW5jZShkYXRhLCBzaWQpIHtcbiAgICAgICAgdmFyIHNlc3MgPSBjb25uZWN0aW9uLmppbmdsZS5zZXNzaW9uc1tzaWRdO1xuXG4gICAgICAgIHZhciB0aGVzc3JjO1xuICAgICAgICAvLyBsb29rIHVwIGFuIGFzc29jaWF0ZWQgSklEIGZvciBhIHN0cmVhbSBpZFxuICAgICAgICBpZiAoZGF0YS5zdHJlYW0uaWQuaW5kZXhPZignbWl4ZWRtc2xhYmVsJykgPT09IC0xKSB7XG4gICAgICAgICAgICAvLyBsb29rIG9ubHkgYXQgYT1zc3JjOiBhbmQgX25vdF8gYXQgYT1zc3JjLWdyb3VwOiBsaW5lc1xuICAgICAgICAgICAgdmFyIHNzcmNsaW5lc1xuICAgICAgICAgICAgICAgID0gU0RQVXRpbC5maW5kX2xpbmVzKHNlc3MucGVlcmNvbm5lY3Rpb24ucmVtb3RlRGVzY3JpcHRpb24uc2RwLCAnYT1zc3JjOicpO1xuICAgICAgICAgICAgc3NyY2xpbmVzID0gc3NyY2xpbmVzLmZpbHRlcihmdW5jdGlvbiAobGluZSkge1xuICAgICAgICAgICAgICAgIC8vIE5PVEUoZ3ApIHByZXZpb3VzbHkgd2UgZmlsdGVyZWQgb24gdGhlIG1zbGFiZWwsIGJ1dCB0aGF0IHByb3BlcnR5XG4gICAgICAgICAgICAgICAgLy8gaXMgbm90IGFsd2F5cyBwcmVzZW50LlxuICAgICAgICAgICAgICAgIC8vIHJldHVybiBsaW5lLmluZGV4T2YoJ21zbGFiZWw6JyArIGRhdGEuc3RyZWFtLmxhYmVsKSAhPT0gLTE7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpbmUuaW5kZXhPZignbXNpZDonICsgZGF0YS5zdHJlYW0uaWQpICE9PSAtMTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHNzcmNsaW5lcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGVzc3JjID0gc3NyY2xpbmVzWzBdLnN1YnN0cmluZyg3KS5zcGxpdCgnICcpWzBdO1xuXG4gICAgICAgICAgICAgICAgLy8gV2Ugc2lnbmFsIG91ciBzdHJlYW1zICh0aHJvdWdoIEppbmdsZSB0byB0aGUgZm9jdXMpIGJlZm9yZSB3ZSBzZXRcbiAgICAgICAgICAgICAgICAvLyBvdXIgcHJlc2VuY2UgKHRocm91Z2ggd2hpY2ggcGVlcnMgYXNzb2NpYXRlIHJlbW90ZSBzdHJlYW1zIHRvXG4gICAgICAgICAgICAgICAgLy8gamlkcykuIFNvLCBpdCBtaWdodCBhcnJpdmUgdGhhdCBhIHJlbW90ZSBzdHJlYW0gaXMgYWRkZWQgYnV0XG4gICAgICAgICAgICAgICAgLy8gc3NyYzJqaWQgaXMgbm90IHlldCB1cGRhdGVkIGFuZCB0aHVzIGRhdGEucGVlcmppZCBjYW5ub3QgYmVcbiAgICAgICAgICAgICAgICAvLyBzdWNjZXNzZnVsbHkgc2V0LiBIZXJlIHdlIHdhaXQgZm9yIHVwIHRvIGEgc2Vjb25kIGZvciB0aGVcbiAgICAgICAgICAgICAgICAvLyBwcmVzZW5jZSB0byBhcnJpdmUuXG5cbiAgICAgICAgICAgICAgICBpZiAoIXNzcmMyamlkW3RoZXNzcmNdKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRPRE8oZ3ApIGxpbWl0IHdhaXQgZHVyYXRpb24gdG8gMSBzZWMuXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oZCwgcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdhaXRGb3JQcmVzZW5jZShkLCBzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfShkYXRhLCBzaWQpLCAyNTApO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gb2sgdG8gb3ZlcndyaXRlIHRoZSBvbmUgZnJvbSBmb2N1cz8gbWlnaHQgc2F2ZSB3b3JrIGluIGNvbGlicmkuanNcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnYXNzb2NpYXRlZCBqaWQnLCBzc3JjMmppZFt0aGVzc3JjXSwgZGF0YS5wZWVyamlkKTtcbiAgICAgICAgICAgICAgICBpZiAoc3NyYzJqaWRbdGhlc3NyY10pIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5wZWVyamlkID0gc3NyYzJqaWRbdGhlc3NyY107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGlzVmlkZW8gPSBkYXRhLnN0cmVhbS5nZXRWaWRlb1RyYWNrcygpLmxlbmd0aCA+IDA7XG5cbiAgICAgICAgUlRDQWN0aXZhdG9yLmdldFJUQ1NlcnZpY2UoKS5jcmVhdGVSZW1vdGVTdHJlYW0oZGF0YSwgc2lkLCB0aGVzc3JjKTtcblxuICAgICAgICAvLyBhbiBhdHRlbXB0IHRvIHdvcmsgYXJvdW5kIGh0dHBzOi8vZ2l0aHViLmNvbS9qaXRzaS9qaXRtZWV0L2lzc3Vlcy8zMlxuICAgICAgICBpZiAoaXNWaWRlbyAmJlxuICAgICAgICAgICAgZGF0YS5wZWVyamlkICYmIHNlc3MucGVlcmppZCA9PT0gZGF0YS5wZWVyamlkICYmXG4gICAgICAgICAgICBkYXRhLnN0cmVhbS5nZXRWaWRlb1RyYWNrcygpLmxlbmd0aCA9PT0gMCAmJlxuICAgICAgICAgICAgY29ubmVjdGlvbi5qaW5nbGUubG9jYWxWaWRlby5nZXRWaWRlb1RyYWNrcygpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2VuZEtleWZyYW1lKHNlc3MucGVlcmNvbm5lY3Rpb24pO1xuICAgICAgICAgICAgfSwgMzAwMCk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vIGFuIGF0dGVtcHQgdG8gd29yayBhcm91bmQgaHR0cHM6Ly9naXRodWIuY29tL2ppdHNpL2ppdG1lZXQvaXNzdWVzLzMyXG4gICAgZnVuY3Rpb24gc2VuZEtleWZyYW1lKHBjKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdzZW5ka2V5ZnJhbWUnLCBwYy5pY2VDb25uZWN0aW9uU3RhdGUpO1xuICAgICAgICBpZiAocGMuaWNlQ29ubmVjdGlvblN0YXRlICE9PSAnY29ubmVjdGVkJykgcmV0dXJuOyAvLyBzYWZlLi4uXG4gICAgICAgIHBjLnNldFJlbW90ZURlc2NyaXB0aW9uKFxuICAgICAgICAgICAgcGMucmVtb3RlRGVzY3JpcHRpb24sXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcGMuY3JlYXRlQW5zd2VyKFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAobW9kaWZpZWRBbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBjLnNldExvY2FsRGVzY3JpcHRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9kaWZpZWRBbnN3ZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBub29wXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3RyaWdnZXJLZXlmcmFtZSBzZXRMb2NhbERlc2NyaXB0aW9uIGZhaWxlZCcsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIuc2hvd0Vycm9yKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndHJpZ2dlcktleWZyYW1lIGNyZWF0ZUFuc3dlciBmYWlsZWQnLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5zaG93RXJyb3IoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3RyaWdnZXJLZXlmcmFtZSBzZXRSZW1vdGVEZXNjcmlwdGlvbiBmYWlsZWQnLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIuc2hvd0Vycm9yKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfVxufVxuXG5cblNlc3Npb25CYXNlLnByb3RvdHlwZS53YWl0Rm9yUHJlc2VuY2UgPSBmdW5jdGlvbiAoZGF0YSwgc2lkKSB7XG4gICAgdmFyIHNlc3MgPSBjb25uZWN0aW9uLmppbmdsZS5zZXNzaW9uc1tzaWRdO1xuXG4gICAgdmFyIHRoZXNzcmM7XG4gICAgLy8gbG9vayB1cCBhbiBhc3NvY2lhdGVkIEpJRCBmb3IgYSBzdHJlYW0gaWRcbiAgICBpZiAoZGF0YS5zdHJlYW0uaWQuaW5kZXhPZignbWl4ZWRtc2xhYmVsJykgPT09IC0xKSB7XG4gICAgICAgIC8vIGxvb2sgb25seSBhdCBhPXNzcmM6IGFuZCBfbm90XyBhdCBhPXNzcmMtZ3JvdXA6IGxpbmVzXG4gICAgICAgIHZhciBzc3JjbGluZXNcbiAgICAgICAgICAgID0gU0RQVXRpbC5maW5kX2xpbmVzKHNlc3MucGVlcmNvbm5lY3Rpb24ucmVtb3RlRGVzY3JpcHRpb24uc2RwLCAnYT1zc3JjOicpO1xuICAgICAgICBzc3JjbGluZXMgPSBzc3JjbGluZXMuZmlsdGVyKGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgICAgICAvLyBOT1RFKGdwKSBwcmV2aW91c2x5IHdlIGZpbHRlcmVkIG9uIHRoZSBtc2xhYmVsLCBidXQgdGhhdCBwcm9wZXJ0eVxuICAgICAgICAgICAgLy8gaXMgbm90IGFsd2F5cyBwcmVzZW50LlxuICAgICAgICAgICAgLy8gcmV0dXJuIGxpbmUuaW5kZXhPZignbXNsYWJlbDonICsgZGF0YS5zdHJlYW0ubGFiZWwpICE9PSAtMTtcbiAgICAgICAgICAgIHJldHVybiBsaW5lLmluZGV4T2YoJ21zaWQ6JyArIGRhdGEuc3RyZWFtLmlkKSAhPT0gLTE7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoc3NyY2xpbmVzLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhlc3NyYyA9IHNzcmNsaW5lc1swXS5zdWJzdHJpbmcoNykuc3BsaXQoJyAnKVswXTtcblxuICAgICAgICAgICAgLy8gV2Ugc2lnbmFsIG91ciBzdHJlYW1zICh0aHJvdWdoIEppbmdsZSB0byB0aGUgZm9jdXMpIGJlZm9yZSB3ZSBzZXRcbiAgICAgICAgICAgIC8vIG91ciBwcmVzZW5jZSAodGhyb3VnaCB3aGljaCBwZWVycyBhc3NvY2lhdGUgcmVtb3RlIHN0cmVhbXMgdG9cbiAgICAgICAgICAgIC8vIGppZHMpLiBTbywgaXQgbWlnaHQgYXJyaXZlIHRoYXQgYSByZW1vdGUgc3RyZWFtIGlzIGFkZGVkIGJ1dFxuICAgICAgICAgICAgLy8gc3NyYzJqaWQgaXMgbm90IHlldCB1cGRhdGVkIGFuZCB0aHVzIGRhdGEucGVlcmppZCBjYW5ub3QgYmVcbiAgICAgICAgICAgIC8vIHN1Y2Nlc3NmdWxseSBzZXQuIEhlcmUgd2Ugd2FpdCBmb3IgdXAgdG8gYSBzZWNvbmQgZm9yIHRoZVxuICAgICAgICAgICAgLy8gcHJlc2VuY2UgdG8gYXJyaXZlLlxuXG4gICAgICAgICAgICBpZiAoIXNzcmMyamlkW3RoZXNzcmNdKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyhncCkgbGltaXQgd2FpdCBkdXJhdGlvbiB0byAxIHNlYy5cbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKGQsIHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2FpdEZvclByZXNlbmNlKGQsIHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfShkYXRhLCBzaWQpLCAyNTApO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gb2sgdG8gb3ZlcndyaXRlIHRoZSBvbmUgZnJvbSBmb2N1cz8gbWlnaHQgc2F2ZSB3b3JrIGluIGNvbGlicmkuanNcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdhc3NvY2lhdGVkIGppZCcsIHNzcmMyamlkW3RoZXNzcmNdLCBkYXRhLnBlZXJqaWQpO1xuICAgICAgICAgICAgaWYgKHNzcmMyamlkW3RoZXNzcmNdKSB7XG4gICAgICAgICAgICAgICAgZGF0YS5wZWVyamlkID0gc3NyYzJqaWRbdGhlc3NyY107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgaXNWaWRlbyA9IGRhdGEuc3RyZWFtLmdldFZpZGVvVHJhY2tzKCkubGVuZ3RoID4gMDtcblxuXG4gICAgLy8gVE9ETyB0aGlzIG11c3QgYmUgZG9uZSB3aXRoIGxpc3RlbmVyc1xuICAgIFJUQ0FjdGl2YXRvci5nZXRSVENTZXJ2aWNlKCkuY3JlYXRlUmVtb3RlU3RyZWFtKGRhdGEsIHNpZCwgdGhlc3NyYyk7XG5cbiAgICAvLyBhbiBhdHRlbXB0IHRvIHdvcmsgYXJvdW5kIGh0dHBzOi8vZ2l0aHViLmNvbS9qaXRzaS9qaXRtZWV0L2lzc3Vlcy8zMlxuICAgIGlmIChpc1ZpZGVvICYmXG4gICAgICAgIGRhdGEucGVlcmppZCAmJiBzZXNzLnBlZXJqaWQgPT09IGRhdGEucGVlcmppZCAmJlxuICAgICAgICBkYXRhLnN0cmVhbS5nZXRWaWRlb1RyYWNrcygpLmxlbmd0aCA9PT0gMCAmJlxuICAgICAgICBjb25uZWN0aW9uLmppbmdsZS5sb2NhbFZpZGVvLmdldFZpZGVvVHJhY2tzKCkubGVuZ3RoID4gMCkge1xuICAgICAgICAvL1xuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZW5kS2V5ZnJhbWUoc2Vzcy5wZWVyY29ubmVjdGlvbik7XG4gICAgICAgIH0sIDMwMDApO1xuICAgIH1cbn1cblxuLy8gYW4gYXR0ZW1wdCB0byB3b3JrIGFyb3VuZCBodHRwczovL2dpdGh1Yi5jb20vaml0c2kvaml0bWVldC9pc3N1ZXMvMzJcbmZ1bmN0aW9uIHNlbmRLZXlmcmFtZShwYykge1xuICAgIGNvbnNvbGUubG9nKCdzZW5ka2V5ZnJhbWUnLCBwYy5pY2VDb25uZWN0aW9uU3RhdGUpO1xuICAgIGlmIChwYy5pY2VDb25uZWN0aW9uU3RhdGUgIT09ICdjb25uZWN0ZWQnKSByZXR1cm47IC8vIHNhZmUuLi5cbiAgICBwYy5zZXRSZW1vdGVEZXNjcmlwdGlvbihcbiAgICAgICAgcGMucmVtb3RlRGVzY3JpcHRpb24sXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHBjLmNyZWF0ZUFuc3dlcihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAobW9kaWZpZWRBbnN3ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcGMuc2V0TG9jYWxEZXNjcmlwdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZGlmaWVkQW5zd2VyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5vb3BcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndHJpZ2dlcktleWZyYW1lIHNldExvY2FsRGVzY3JpcHRpb24gZmFpbGVkJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLnNob3dFcnJvcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0cmlnZ2VyS2V5ZnJhbWUgY3JlYXRlQW5zd2VyIGZhaWxlZCcsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIuc2hvd0Vycm9yKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygndHJpZ2dlcktleWZyYW1lIHNldFJlbW90ZURlc2NyaXB0aW9uIGZhaWxlZCcsIGVycm9yKTtcbiAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLnNob3dFcnJvcigpO1xuICAgICAgICB9XG4gICAgKTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlc3Npb25CYXNlOyIsIi8qKlxuICogU3Ryb3BoZSBsb2dnZXIgaW1wbGVtZW50YXRpb24uIExvZ3MgZnJvbSBsZXZlbCBXQVJOIGFuZCBhYm92ZS5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICBTdHJvcGhlLmxvZyA9IGZ1bmN0aW9uIChsZXZlbCwgbXNnKSB7XG4gICAgICAgIHN3aXRjaCAobGV2ZWwpIHtcbiAgICAgICAgICAgIGNhc2UgU3Ryb3BoZS5Mb2dMZXZlbC5XQVJOOlxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIlN0cm9waGU6IFwiICsgbXNnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3Ryb3BoZS5Mb2dMZXZlbC5FUlJPUjpcbiAgICAgICAgICAgIGNhc2UgU3Ryb3BoZS5Mb2dMZXZlbC5GQVRBTDpcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiU3Ryb3BoZTogXCIgKyBtc2cpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfTtcbn07XG5cbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiJdfQ==
