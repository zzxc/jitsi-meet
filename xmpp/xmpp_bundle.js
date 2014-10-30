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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC9zZXJ2aWNlL1JUQy9TdHJlYW1FdmVudFR5cGVzLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQvc2VydmljZS94bXBwL1hNUFBFdmVudHMuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC91dGlsL3RyYWNraW5nLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQveG1wcC9YTVBQQWN0aXZhdG9yLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQveG1wcC9jb2xpYnJpL2NvbGlicmkuZm9jdXMuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC94bXBwL2NvbGlicmkvY29saWJyaS5zZXNzaW9uLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQveG1wcC9tb2RlcmF0ZW11Yy5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L3htcHAvbXVjLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQveG1wcC9zdHJvcGhlLmppbmdsZS5hZGFwdGVyLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQveG1wcC9zdHJvcGhlLmppbmdsZS5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L3htcHAvc3Ryb3BoZS5qaW5nbGUuc2RwLmpzIiwiL1VzZXJzL2hyaXN0by9Eb2N1bWVudHMvd29ya3NwYWNlL2ppdHNpLW1lZXQveG1wcC9zdHJvcGhlLmppbmdsZS5zZHAudXRpbC5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L3htcHAvc3Ryb3BoZS5qaW5nbGUuc2Vzc2lvbi5qcyIsIi9Vc2Vycy9ocmlzdG8vRG9jdW1lbnRzL3dvcmtzcGFjZS9qaXRzaS1tZWV0L3htcHAvc3Ryb3BoZS5qaW5nbGUuc2Vzc2lvbmJhc2UuanMiLCIvVXNlcnMvaHJpc3RvL0RvY3VtZW50cy93b3Jrc3BhY2Uvaml0c2ktbWVldC94bXBwL3N0cm9waGUudXRpbC5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeGVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM3VCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzV0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBTdHJlYW1FdmVudFR5cGVzID0ge1xuICAgIEVWRU5UX1RZUEVfTE9DQUxfQ1JFQVRFRDogXCJzdHJlYW0ubG9jYWxfY3JlYXRlZFwiLFxuXG4gICAgRVZFTlRfVFlQRV9MT0NBTF9FTkRFRDogXCJzdHJlYW0ubG9jYWxfZW5kZWRcIixcblxuICAgIEVWRU5UX1RZUEVfUkVNT1RFX0NSRUFURUQ6IFwic3RyZWFtLnJlbW90ZV9jcmVhdGVkXCIsXG5cbiAgICBFVkVOVF9UWVBFX1JFTU9URV9FTkRFRDogXCJzdHJlYW0ucmVtb3RlX2VuZGVkXCJcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3RyZWFtRXZlbnRUeXBlczsiLCIvKipcbiAqIENyZWF0ZWQgYnkgaHJpc3RvIG9uIDEwLzI5LzE0LlxuICovXG52YXIgWE1QUEV2ZW50cyA9IHtcbiAgICBDT05GRVJFTkNFX0NFUkFURUQ6IFwieG1wcC5jb25mZXJlbmNlQ3JlYXRlZC5qaW5nbGVcIixcbiAgICBDQUxMX1RFUk1JTkFURUQ6IFwieG1wcC5jYWxsdGVybWluYXRlZC5qaW5nbGVcIixcbiAgICBDQUxMX0lOQ09NSU5HOiBcInhtcHAuY2FsbGluY29taW5nLmppbmdsZVwiLFxuICAgIEZBVEFMX0pJTkdMRV9FUlJPUjogXCJ4bXBwLmZhdGFsRXJyb3IuamluZ2xlXCJcbn07XG5tb2R1bGUuZXhwb3J0cyA9IFhNUFBFdmVudHM7IiwiKGZ1bmN0aW9uICgpIHtcblxuZnVuY3Rpb24gdHJhY2tVc2FnZShldmVudG5hbWUsIG9iaikge1xuICAgIC8vY29uc29sZS5sb2coJ3RyYWNrJywgZXZlbnRuYW1lLCBvYmopO1xuICAgIC8vIGltcGxlbWVudCB5b3VyIG93biB0cmFja2luZyBtZWNoYW5pc20gaGVyZVxufVxuaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gdHJhY2tVc2FnZTtcbn0gZWxzZSB7XG4gICAgd2luZG93LnRyYWNrVXNhZ2UgPSB0cmFja1VzYWdlO1xufVxuXG59KSgpO1xuIiwidmFyIFN0cmVhbUV2ZW50VHlwZXMgPSByZXF1aXJlKFwiLi4vc2VydmljZS9SVEMvU3RyZWFtRXZlbnRUeXBlc1wiKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiZXZlbnRzXCIpO1xuXG52YXIgWE1QUEFjdGl2YXRvciA9IGZ1bmN0aW9uKClcbntcblxuICAgIGZ1bmN0aW9uIE5pY2tuYW1lTGlzdGVucmVyKClcbiAgICB7XG4gICAgICAgIHRoaXMubmlja25hbWUgPSBudWxsO1xuICAgIH1cblxuICAgIE5pY2tuYW1lTGlzdGVucmVyLnByb3RvdHlwZS5vbk5pY2tuYW1lQ2hhbmdlZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLm5pY2tuYW1lID0gdmFsdWU7XG4gICAgfTtcblxuICAgIHZhciBuaWNrbmFtZUxpc3RlbmVyID0gbmV3IE5pY2tuYW1lTGlzdGVucmVyKCk7XG5cbiAgICB2YXIgYXV0aGVudGljYXRlZFVzZXIgPSBmYWxzZTtcblxuICAgIHZhciBldmVudEVtaXR0ZXIgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbiAgICBmdW5jdGlvbiBYTVBQQWN0aXZhdG9yUHJvdG8oKVxuICAgIHtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXR1cFN0cm9waGVQbHVnaW5zKClcbiAgICB7XG4gICAgICAgIHJlcXVpcmUoXCIuL211Y1wiKShldmVudEVtaXR0ZXIpO1xuICAgICAgICByZXF1aXJlKFwiLi9zdHJvcGhlLmppbmdsZVwiKShldmVudEVtaXR0ZXIpO1xuICAgICAgICByZXF1aXJlKFwiLi9tb2RlcmF0ZW11Y1wiKShldmVudEVtaXR0ZXIpO1xuICAgICAgICByZXF1aXJlKFwiLi9zdHJvcGhlLnV0aWxcIikoZXZlbnRFbWl0dGVyKTtcblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlZ2lzdGVyTGlzdGVuZXJzKCkge1xuICAgICAgICBVSUFjdGl2YXRvci5nZXRVSVNlcnZpY2UoKS5hZGROaWNrbmFtZUxpc3RlbmVyKG5pY2tuYW1lTGlzdGVuZXIub25OaWNrbmFtZUNoYW5nZWQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldHVwRXZlbnRzKCkge1xuICAgICAgICAkKHdpbmRvdykuYmluZCgnYmVmb3JldW5sb2FkJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKGNvbm5lY3Rpb24gJiYgY29ubmVjdGlvbi5jb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBlbnN1cmUgc2lnbm91dFxuICAgICAgICAgICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBjb25maWcuYm9zaCxcbiAgICAgICAgICAgICAgICAgICAgYXN5bmM6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24veG1sJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogXCI8Ym9keSByaWQ9J1wiICsgKGNvbm5lY3Rpb24ucmlkIHx8IGNvbm5lY3Rpb24uX3Byb3RvLnJpZCkgKyBcIicgeG1sbnM9J2h0dHA6Ly9qYWJiZXIub3JnL3Byb3RvY29sL2h0dHBiaW5kJyBzaWQ9J1wiICsgKGNvbm5lY3Rpb24uc2lkIHx8IGNvbm5lY3Rpb24uX3Byb3RvLnNpZCkgKyBcIicgdHlwZT0ndGVybWluYXRlJz48cHJlc2VuY2UgeG1sbnM9J2phYmJlcjpjbGllbnQnIHR5cGU9J3VuYXZhaWxhYmxlJy8+PC9ib2R5PlwiLFxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NpZ25lZCBvdXQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24gKFhNTEh0dHBSZXF1ZXN0LCB0ZXh0U3RhdHVzLCBlcnJvclRocm93bikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NpZ25vdXQgZXJyb3InLCB0ZXh0U3RhdHVzICsgJyAoJyArIGVycm9yVGhyb3duICsgJyknKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBYTVBQQWN0aXZhdG9yUHJvdG8uc3RhcnQgPSBmdW5jdGlvbiAoamlkLCBwYXNzd29yZCwgdWlDcmVkZW50aWFscykge1xuICAgICAgICBzZXR1cFN0cm9waGVQbHVnaW5zKCk7XG4gICAgICAgIHJlZ2lzdGVyTGlzdGVuZXJzKCk7XG4gICAgICAgIHNldHVwRXZlbnRzKCk7XG4gICAgICAgIGNvbm5lY3QoamlkLCBwYXNzd29yZCwgdWlDcmVkZW50aWFscyk7XG4gICAgICAgIFJUQ0FjdGl2YXRvci5hZGRTdHJlYW1MaXN0ZW5lcihtYXliZURvSm9pbiwgU3RyZWFtRXZlbnRUeXBlcy5FVkVOVF9UWVBFX0xPQ0FMX0NSRUFURUQpO1xuICAgIH1cblxuICAgIFhNUFBBY3RpdmF0b3JQcm90by5nZXROaWNrbmFtZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5pY2tuYW1lTGlzdGVuZXIubmlja25hbWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29ubmVjdChqaWQsIHBhc3N3b3JkLCB1aUNyZWRlbnRpYWxzKSB7XG4gICAgICAgIHZhciBsb2NhbEF1ZGlvLCBsb2NhbFZpZGVvO1xuICAgICAgICBpZiAoY29ubmVjdGlvbiAmJiBjb25uZWN0aW9uLmppbmdsZSkge1xuICAgICAgICAgICAgbG9jYWxBdWRpbyA9IGNvbm5lY3Rpb24uamluZ2xlLmxvY2FsQXVkaW87XG4gICAgICAgICAgICBsb2NhbFZpZGVvID0gY29ubmVjdGlvbi5qaW5nbGUubG9jYWxWaWRlbztcbiAgICAgICAgfVxuICAgICAgICBjb25uZWN0aW9uID0gbmV3IFN0cm9waGUuQ29ubmVjdGlvbih1aUNyZWRlbnRpYWxzLmJvc2gpO1xuXG4gICAgICAgIGlmIChuaWNrbmFtZUxpc3RlbmVyLm5pY2tuYW1lKSB7XG4gICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuYWRkRGlzcGxheU5hbWVUb1ByZXNlbmNlKG5pY2tuYW1lTGlzdGVuZXIubmlja25hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbm5lY3Rpb24uZGlzY28pIHtcbiAgICAgICAgICAgIC8vIGZvciBjaHJvbWUsIGFkZCBtdWx0aXN0cmVhbSBjYXBcbiAgICAgICAgfVxuICAgICAgICBjb25uZWN0aW9uLmppbmdsZS5wY19jb25zdHJhaW50cyA9IFJUQ0FjdGl2YXRvci5nZXRSVENTZXJ2aWNlKCkuZ2V0UENDb25zdHJhaW50cygpO1xuICAgICAgICBpZiAoY29uZmlnLnVzZUlQdjYpIHtcbiAgICAgICAgICAgIC8vIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3Avd2VicnRjL2lzc3Vlcy9kZXRhaWw/aWQ9MjgyOFxuICAgICAgICAgICAgaWYgKCFjb25uZWN0aW9uLmppbmdsZS5wY19jb25zdHJhaW50cy5vcHRpb25hbCkgY29ubmVjdGlvbi5qaW5nbGUucGNfY29uc3RyYWludHMub3B0aW9uYWwgPSBbXTtcbiAgICAgICAgICAgIGNvbm5lY3Rpb24uamluZ2xlLnBjX2NvbnN0cmFpbnRzLm9wdGlvbmFsLnB1c2goe2dvb2dJUHY2OiB0cnVlfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxvY2FsQXVkaW8pIGNvbm5lY3Rpb24uamluZ2xlLmxvY2FsQXVkaW8gPSBsb2NhbEF1ZGlvO1xuICAgICAgICBpZiAobG9jYWxWaWRlbykgY29ubmVjdGlvbi5qaW5nbGUubG9jYWxWaWRlbyA9IGxvY2FsVmlkZW87XG5cbiAgICAgICAgaWYoIXBhc3N3b3JkKVxuICAgICAgICAgICAgcGFzc3dvcmQgPSB1aUNyZWRlbnRpYWxzLnBhc3N3b3JkO1xuXG4gICAgICAgIGlmKCFqaWQpXG4gICAgICAgICAgICBqaWQgPSB1aUNyZWRlbnRpYWxzLmppZDtcblxuICAgICAgICB2YXIgYW5vbnltb3VzQ29ubmVjdGlvbkZhaWxlZCA9IGZhbHNlO1xuXG4gICAgICAgIGNvbm5lY3Rpb24uY29ubmVjdChqaWQsIHBhc3N3b3JkLCBmdW5jdGlvbiAoc3RhdHVzLCBtc2cpIHtcbiAgICAgICAgICAgIGlmIChzdGF0dXMgPT09IFN0cm9waGUuU3RhdHVzLkNPTk5FQ1RFRCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjb25uZWN0ZWQnKTtcbiAgICAgICAgICAgICAgICBpZiAoY29uZmlnLnVzZVN0dW5UdXJuKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24uamluZ2xlLmdldFN0dW5BbmRUdXJuQ3JlZGVudGlhbHMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgVUlBY3RpdmF0b3IuZ2V0VUlTZXJ2aWNlKCkuZGlzYWJsZUNvbm5lY3QoKTtcblxuICAgICAgICAgICAgICAgIGlmKHBhc3N3b3JkKVxuICAgICAgICAgICAgICAgICAgICBhdXRoZW50aWNhdGVkVXNlciA9IHRydWU7XG4gICAgICAgICAgICAgICAgbWF5YmVEb0pvaW4oKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdHVzID09PSBTdHJvcGhlLlN0YXR1cy5DT05ORkFJTCkge1xuICAgICAgICAgICAgICAgIGlmKG1zZyA9PT0gJ3gtc3Ryb3BoZS1iYWQtbm9uLWFub24tamlkJykge1xuICAgICAgICAgICAgICAgICAgICBhbm9ueW1vdXNDb25uZWN0aW9uRmFpbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3N0YXR1cycsIHN0YXR1cyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHN0YXR1cyA9PT0gU3Ryb3BoZS5TdGF0dXMuRElTQ09OTkVDVEVEKSB7XG4gICAgICAgICAgICAgICAgaWYoYW5vbnltb3VzQ29ubmVjdGlvbkZhaWxlZCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBwcm9tcHQgdXNlciBmb3IgdXNlcm5hbWUgYW5kIHBhc3N3b3JkXG4gICAgICAgICAgICAgICAgICAgIFhNUFBBY3RpdmF0b3JQcm90by5wcm9tcHRMb2dpbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdHVzID09PSBTdHJvcGhlLlN0YXR1cy5BVVRIRkFJTCkge1xuICAgICAgICAgICAgICAgIC8vIHdyb25nIHBhc3N3b3JkIG9yIHVzZXJuYW1lLCBwcm9tcHQgdXNlclxuICAgICAgICAgICAgICAgIFhNUFBBY3RpdmF0b3JQcm90by5wcm9tcHRMb2dpbigpO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdGF0dXMnLCBzdGF0dXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBYTVBQQWN0aXZhdG9yUHJvdG8ucHJvbXB0TG9naW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIFVJQWN0aXZhdG9yLnNob3dMb2dpblBvcHVwKGNvbm5lY3QpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1heWJlRG9Kb2luKCkge1xuICAgICAgICBpZiAoY29ubmVjdGlvbiAmJiBjb25uZWN0aW9uLmNvbm5lY3RlZCAmJiBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChjb25uZWN0aW9uLmppZCkgLy8gLmNvbm5lY3RlZCBpcyB0cnVlIHdoaWxlIGNvbm5lY3Rpbmc/XG4gICAgICAgICAgICAmJiAoY29ubmVjdGlvbi5qaW5nbGUubG9jYWxBdWRpbyB8fCBjb25uZWN0aW9uLmppbmdsZS5sb2NhbFZpZGVvKSkge1xuICAgICAgICAgICAgdmFyIHJvb21qaWQgPSBVSUFjdGl2YXRvci5nZXRVSVNlcnZpY2UoKS5nZW5lcmF0ZVJvb21OYW1lKGF1dGhlbnRpY2F0ZWRVc2VyKTtcbiAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Yy5kb0pvaW4ocm9vbWppZCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBYTVBQQWN0aXZhdG9yUHJvdG8uc3RvcCA9IGZ1bmN0aW9uICgpIHtcblxuICAgIH1cblxuICAgIFhNUFBBY3RpdmF0b3JQcm90by5nZXRKaW5nbGVEYXRhID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoY29ubmVjdGlvbi5qaW5nbGUpIHtcbiAgICAgICAgICAgIHJldHVybiBjb25uZWN0aW9uLmppbmdsZS5nZXRKaW5nbGVEYXRhKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIFhNUFBBY3RpdmF0b3JQcm90by5nZXRMb2dnZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBjb25uZWN0aW9uLmxvZ2dlcjtcbiAgICB9XG4gICAgXG4gICAgWE1QUEFjdGl2YXRvclByb3RvLmFkZExpc3RlbmVyID0gZnVuY3Rpb24gKGV2ZW50LCBsaXN0ZW5lcikge1xuICAgICAgICBldmVudEVtaXR0ZXIub24oZXZlbnQsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICBYTVBQQWN0aXZhdG9yUHJvdG8uZ2V0TXlKSUQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBjb25uZWN0aW9uLmVtdWMubXlyb29tamlkO1xuICAgIH1cbiAgICByZXR1cm4gWE1QUEFjdGl2YXRvclByb3RvO1xufSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhNUFBBY3RpdmF0b3I7IiwiLyogY29saWJyaS5qcyAtLSBhIENPTElCUkkgZm9jdXNcbiAqIFRoZSBjb2xpYnJpIHNwZWMgaGFzIGJlZW4gc3VibWl0dGVkIHRvIHRoZSBYTVBQIFN0YW5kYXJkcyBGb3VuZGF0aW9uXG4gKiBmb3IgcHVibGljYXRpb25zIGFzIGEgWE1QUCBleHRlbnNpb25zOlxuICogaHR0cDovL3htcHAub3JnL2V4dGVuc2lvbnMvaW5ib3gvY29saWJyaS5odG1sXG4gKlxuICogY29saWJyaS5qcyBpcyBhIHBhcnRpY2lwYXRpbmcgZm9jdXMsIGkuZS4gdGhlIGZvY3VzIHBhcnRpY2lwYXRlc1xuICogaW4gdGhlIGNvbmZlcmVuY2UuIFRoZSBjb25mZXJlbmNlIGl0c2VsZiBjYW4gYmUgYWQtaG9jLCB0aHJvdWdoIGFcbiAqIE1VQywgdGhyb3VnaCBQdWJTdWIsIGV0Yy5cbiAqXG4gKiBjb2xpYnJpLmpzIHJlbGllcyBoZWF2aWx5IG9uIHRoZSBzdHJvcGhlLmppbmdsZSBsaWJyYXJ5IGF2YWlsYWJsZVxuICogZnJvbSBodHRwczovL2dpdGh1Yi5jb20vRVNUT1Mvc3Ryb3BoZS5qaW5nbGVcbiAqIGFuZCBpbnRlcm9wZXJhdGVzIHdpdGggdGhlIEppdHNpIHZpZGVvYnJpZGdlIGF2YWlsYWJsZSBmcm9tXG4gKiBodHRwczovL2ppdHNpLm9yZy9Qcm9qZWN0cy9KaXRzaVZpZGVvYnJpZGdlXG4gKi9cbi8qXG4gQ29weXJpZ2h0IChjKSAyMDEzIEVTVE9TIEdtYkhcblxuIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuXG4gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gVEhFIFNPRlRXQVJFLlxuICovXG4vKiBqc2hpbnQgLVcxMTcgKi9cbnZhciBTZXNzaW9uQmFzZSA9IHJlcXVpcmUoXCIuLi9zdHJvcGhlLmppbmdsZS5zZXNzaW9uYmFzZVwiKTtcbnZhciBDb2xpYnJpU2Vzc2lvbiA9IHJlcXVpcmUoXCIuL2NvbGlicmkuc2Vzc2lvblwiKTtcbnZhciBUcmFjZWFibGVQZWVyQ29ubmVjdGlvbiA9IHJlcXVpcmUoXCIuLi9zdHJvcGhlLmppbmdsZS5hZGFwdGVyXCIpO1xudmFyIFNEUCA9IHJlcXVpcmUoXCIuLi9zdHJvcGhlLmppbmdsZS5zZHBcIik7XG52YXIgU0RQVXRpbCA9IHJlcXVpcmUoXCIuLi9zdHJvcGhlLmppbmdsZS5zZHAudXRpbFwiKTtcbnZhciBYTVBQRXZlbnRzID0gcmVxdWlyZShcIi4uLy4uL3NlcnZpY2UveG1wcC9YTVBQRXZlbnRzXCIpO1xuQ29saWJyaUZvY3VzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU2Vzc2lvbkJhc2UucHJvdG90eXBlKTtcbmZ1bmN0aW9uIENvbGlicmlGb2N1cyhjb25uZWN0aW9uLCBicmlkZ2VqaWQsIGV2ZW50RW1pdHRlcikge1xuXG4gICAgU2Vzc2lvbkJhc2UuY2FsbCh0aGlzLCBjb25uZWN0aW9uLCBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgMTIpKTtcblxuICAgIHRoaXMuYnJpZGdlamlkID0gYnJpZGdlamlkO1xuICAgIHRoaXMucGVlcnMgPSBbXTtcbiAgICB0aGlzLnJlbW90ZVN0cmVhbXMgPSBbXTtcbiAgICB0aGlzLmNvbmZpZCA9IG51bGw7XG4gICAgdGhpcy5ldmVudEVtaXR0ZXIgPSBldmVudEVtaXR0ZXI7XG5cbiAgICAvKipcbiAgICAgKiBMb2NhbCBYTVBQIHJlc291cmNlIHVzZWQgdG8gam9pbiB0aGUgbXVsdGkgdXNlciBjaGF0LlxuICAgICAqIEB0eXBlIHsqfVxuICAgICAqL1xuICAgIHRoaXMubXlNdWNSZXNvdXJjZSA9IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQpO1xuXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBjaGFubmVsIGV4cGlyZSB2YWx1ZSBpbiBzZWNvbmRzLlxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgdGhpcy5jaGFubmVsRXhwaXJlXG4gICAgICAgID0gKCdudW1iZXInID09PSB0eXBlb2YoY29uZmlnLmNoYW5uZWxFeHBpcmUpKVxuICAgICAgICAgICAgPyBjb25maWcuY2hhbm5lbEV4cGlyZVxuICAgICAgICAgICAgOiAxNTtcbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IGNoYW5uZWwgbGFzdC1uIHZhbHVlLlxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgdGhpcy5jaGFubmVsTGFzdE5cbiAgICAgICAgPSAoJ251bWJlcicgPT09IHR5cGVvZihjb25maWcuY2hhbm5lbExhc3ROKSkgPyBjb25maWcuY2hhbm5lbExhc3ROIDogLTE7XG5cbiAgICAvLyBtZWRpYSB0eXBlcyBvZiB0aGUgY29uZmVyZW5jZVxuICAgIGlmIChjb25maWcub3BlblNjdHApXG4gICAgICAgIHRoaXMubWVkaWEgPSBbJ2F1ZGlvJywgJ3ZpZGVvJywgJ2RhdGEnXTtcbiAgICBlbHNlXG4gICAgICAgIHRoaXMubWVkaWEgPSBbJ2F1ZGlvJywgJ3ZpZGVvJ107XG5cbiAgICB0aGlzLmNvbm5lY3Rpb24uamluZ2xlLnNlc3Npb25zW3RoaXMuc2lkXSA9IHRoaXM7XG4gICAgdGhpcy5idW5kbGVkVHJhbnNwb3J0cyA9IHt9O1xuICAgIHRoaXMubXljaGFubmVsID0gW107XG4gICAgdGhpcy5jaGFubmVscyA9IFtdO1xuICAgIHRoaXMucmVtb3Rlc3NyYyA9IHt9O1xuXG4gICAgLy8gY29udGFpbmVyIGZvciBjYW5kaWRhdGVzIGZyb20gdGhlIGZvY3VzXG4gICAgLy8gZ2F0aGVyZWQgYmVmb3JlIGNvbmZpZCBpcyBrbm93blxuICAgIHRoaXMuZHJpcF9jb250YWluZXIgPSBbXTtcblxuICAgIC8vIHNpbGx5IHdhaXQgZmxhZ1xuICAgIHRoaXMud2FpdCA9IHRydWU7XG5cbiAgICB0aGlzLnJlY29yZGluZ0VuYWJsZWQgPSBmYWxzZTtcblxuICAgIC8vIHN0b3JlcyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgZW5kcG9pbnRzIChpLmUuIGRpc3BsYXkgbmFtZXMpIHRvXG4gICAgLy8gYmUgc2VudCB0byB0aGUgdmlkZW9icmlkZ2UuXG4gICAgdGhpcy5lbmRwb2ludHNJbmZvID0gbnVsbDtcbn1cblxuLy8gY3JlYXRlcyBhIGNvbmZlcmVuY2VzIHdpdGggYW4gaW5pdGlhbCBzZXQgb2YgcGVlcnNcbkNvbGlicmlGb2N1cy5wcm90b3R5cGUubWFrZUNvbmZlcmVuY2UgPSBmdW5jdGlvbiAocGVlcnMsIGVycm9yQ2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHRoaXMuY29uZmlkICE9PSBudWxsKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ21ha2VDb25mZXJlbmNlIGNhbGxlZCB0d2ljZT8gSWdub3JpbmcuLi4nKTtcbiAgICAgICAgLy8gRklYTUU6IGp1c3QgaW52aXRlIHBlZXJzP1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuY29uZmlkID0gMDsgLy8gIW51bGxcbiAgICB0aGlzLnBlZXJzID0gW107XG4gICAgcGVlcnMuZm9yRWFjaChmdW5jdGlvbiAocGVlcikge1xuICAgICAgICBzZWxmLnBlZXJzLnB1c2gocGVlcik7XG4gICAgICAgIHNlbGYuY2hhbm5lbHMucHVzaChbXSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uXG4gICAgICAgID0gbmV3IFRyYWNlYWJsZVBlZXJDb25uZWN0aW9uKFxuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLmppbmdsZS5pY2VfY29uZmlnLFxuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLmppbmdsZS5wY19jb25zdHJhaW50cyApO1xuXG4gICAgaWYodGhpcy5jb25uZWN0aW9uLmppbmdsZS5sb2NhbEF1ZGlvKSB7XG4gICAgICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uYWRkU3RyZWFtKHRoaXMuY29ubmVjdGlvbi5qaW5nbGUubG9jYWxBdWRpbyk7XG4gICAgfVxuICAgIGlmKHRoaXMuY29ubmVjdGlvbi5qaW5nbGUubG9jYWxWaWRlbykge1xuICAgICAgICB0aGlzLnBlZXJjb25uZWN0aW9uLmFkZFN0cmVhbSh0aGlzLmNvbm5lY3Rpb24uamluZ2xlLmxvY2FsVmlkZW8pO1xuICAgIH1cbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLm9uaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIGNvbnNvbGUud2FybignaWNlIGNvbm5lY3Rpb24gc3RhdGUgY2hhbmdlZCB0bycsIHNlbGYucGVlcmNvbm5lY3Rpb24uaWNlQ29ubmVjdGlvblN0YXRlKTtcbiAgICAgICAgLypcbiAgICAgICAgaWYgKHNlbGYucGVlcmNvbm5lY3Rpb24uc2lnbmFsaW5nU3RhdGUgPT0gJ3N0YWJsZScgJiYgc2VsZi5wZWVyY29ubmVjdGlvbi5pY2VDb25uZWN0aW9uU3RhdGUgPT0gJ2Nvbm5lY3RlZCcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdhZGRpbmcgbmV3IHJlbW90ZSBTU1JDcyBmcm9tIGljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZScpO1xuICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IHNlbGYubW9kaWZ5U291cmNlcygpOyB9LCAxMDAwKTtcbiAgICAgICAgfVxuICAgICAgICAqL1xuICAgICAgICBzZWxmLm9uSWNlQ29ubmVjdGlvblN0YXRlQ2hhbmdlKHNlbGYuc2lkLCBzZWxmKTtcbiAgICB9O1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24ub25zaWduYWxpbmdzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBjb25zb2xlLndhcm4oc2VsZi5wZWVyY29ubmVjdGlvbi5zaWduYWxpbmdTdGF0ZSk7XG4gICAgICAgIC8qXG4gICAgICAgIGlmIChzZWxmLnBlZXJjb25uZWN0aW9uLnNpZ25hbGluZ1N0YXRlID09ICdzdGFibGUnICYmIHNlbGYucGVlcmNvbm5lY3Rpb24uaWNlQ29ubmVjdGlvblN0YXRlID09ICdjb25uZWN0ZWQnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnYWRkaW5nIG5ldyByZW1vdGUgU1NSQ3MgZnJvbSBzaWduYWxpbmdzdGF0ZWNoYW5nZScpO1xuICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IHNlbGYubW9kaWZ5U291cmNlcygpOyB9LCAxMDAwKTtcbiAgICAgICAgfVxuICAgICAgICAqL1xuICAgIH07XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5vbmFkZHN0cmVhbSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAvLyBzZWFyY2ggdGhlIGppZCBhc3NvY2lhdGVkIHdpdGggdGhpcyBzdHJlYW1cbiAgICAgICAgT2JqZWN0LmtleXMoc2VsZi5yZW1vdGVzc3JjKS5mb3JFYWNoKGZ1bmN0aW9uIChqaWQpIHtcbiAgICAgICAgICAgIGlmIChzZWxmLnJlbW90ZXNzcmNbamlkXS5qb2luKCdcXHJcXG4nKS5pbmRleE9mKCdtc2xhYmVsOicgKyBldmVudC5zdHJlYW0uaWQpICE9IC0xKSB7XG4gICAgICAgICAgICAgICAgZXZlbnQucGVlcmppZCA9IGppZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHNlbGYucmVtb3RlU3RyZWFtcy5wdXNoKGV2ZW50LnN0cmVhbSk7XG4vLyAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcigncmVtb3Rlc3RyZWFtYWRkZWQuamluZ2xlJywgW2V2ZW50LCBzZWxmLnNpZF0pO1xuICAgICAgICBzZWxmLndhaXRGb3JQcmVzZW5jZShldmVudCwgc2VsZi5zaWQpO1xuICAgIH07XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5vbmljZWNhbmRpZGF0ZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAvL2NvbnNvbGUubG9nKCdmb2N1cyBvbmljZWNhbmRpZGF0ZScsIHNlbGYuY29uZmlkLCBuZXcgRGF0ZSgpLmdldFRpbWUoKSwgZXZlbnQuY2FuZGlkYXRlKTtcbiAgICAgICAgaWYgKCFldmVudC5jYW5kaWRhdGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdlbmQgb2YgY2FuZGlkYXRlcycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHNlbGYuc2VuZEljZUNhbmRpZGF0ZShldmVudC5jYW5kaWRhdGUpO1xuICAgIH07XG4gICAgdGhpcy5fbWFrZUNvbmZlcmVuY2UoZXJyb3JDYWxsYmFjayk7XG4gICAgLypcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLmNyZWF0ZU9mZmVyKFxuICAgICAgICBmdW5jdGlvbiAob2ZmZXIpIHtcbiAgICAgICAgICAgIHNlbGYucGVlcmNvbm5lY3Rpb24uc2V0TG9jYWxEZXNjcmlwdGlvbihcbiAgICAgICAgICAgICAgICBvZmZlcixcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignc2V0TG9jYWxEZXNjcmlwdGlvbi5qaW5nbGUnLCBbc2VsZi5zaWRdKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IGNvdWxkIGNhbGwgX21ha2VDb25mZXJlbmNlIGhlcmUgYW5kIHRyaWNrbGUgY2FuZGlkYXRlcyBsYXRlclxuICAgICAgICAgICAgICAgICAgICBzZWxmLl9tYWtlQ29uZmVyZW5jZSgpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzZXRMb2NhbERlc2NyaXB0aW9uIGZhaWxlZCcsIGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihlcnJvcik7XG4gICAgICAgIH1cbiAgICApO1xuICAgICovXG59O1xuXG4vLyBTZW5kcyBhIENPTElCUkkgbWVzc2FnZSB3aGljaCBlbmFibGVzIG9yIGRpc2FibGVzIChhY2NvcmRpbmcgdG8gJ3N0YXRlJykgdGhlXG4vLyByZWNvcmRpbmcgb24gdGhlIGJyaWRnZS4gV2FpdHMgZm9yIHRoZSByZXN1bHQgSVEgYW5kIGNhbGxzICdjYWxsYmFjaycgd2l0aFxuLy8gdGhlIG5ldyByZWNvcmRpbmcgc3RhdGUsIGFjY29yZGluZyB0byB0aGUgSVEuXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLnNldFJlY29yZGluZyA9IGZ1bmN0aW9uKHN0YXRlLCB0b2tlbiwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGVsZW0gPSAkaXEoe3RvOiB0aGlzLmJyaWRnZWppZCwgdHlwZTogJ3NldCd9KTtcbiAgICBlbGVtLmMoJ2NvbmZlcmVuY2UnLCB7XG4gICAgICAgIHhtbG5zOiAnaHR0cDovL2ppdHNpLm9yZy9wcm90b2NvbC9jb2xpYnJpJyxcbiAgICAgICAgaWQ6IHRoaXMuY29uZmlkXG4gICAgfSk7XG4gICAgZWxlbS5jKCdyZWNvcmRpbmcnLCB7c3RhdGU6IHN0YXRlLCB0b2tlbjogdG9rZW59KTtcbiAgICBlbGVtLnVwKCk7XG5cbiAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKGVsZW0sXG4gICAgICAgIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTZXQgcmVjb3JkaW5nIFwiJywgc3RhdGUsICdcIi4gUmVzdWx0OicsIHJlc3VsdCk7XG4gICAgICAgICAgICB2YXIgcmVjb3JkaW5nRWxlbSA9ICQocmVzdWx0KS5maW5kKCc+Y29uZmVyZW5jZT5yZWNvcmRpbmcnKTtcbiAgICAgICAgICAgIHZhciBuZXdTdGF0ZSA9ICgndHJ1ZScgPT09IHJlY29yZGluZ0VsZW0uYXR0cignc3RhdGUnKSk7XG5cbiAgICAgICAgICAgIHNlbGYucmVjb3JkaW5nRW5hYmxlZCA9IG5ld1N0YXRlO1xuICAgICAgICAgICAgY2FsbGJhY2sobmV3U3RhdGUpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihlcnJvcik7XG4gICAgICAgIH1cbiAgICApO1xufTtcblxuLypcbiAqIFVwZGF0ZXMgdGhlIGRpc3BsYXkgbmFtZSBmb3IgYW4gZW5kcG9pbnQgd2l0aCBhIHNwZWNpZmljIGppZC5cbiAqIGppZDogdGhlIGppZCBhc3NvY2lhdGVkIHdpdGggdGhlIGVuZHBvaW50LlxuICogZGlzcGxheU5hbWU6IHRoZSBuZXcgZGlzcGxheSBuYW1lIGZvciB0aGUgZW5kcG9pbnQuXG4gKi9cbkNvbGlicmlGb2N1cy5wcm90b3R5cGUuc2V0RW5kcG9pbnREaXNwbGF5TmFtZSA9IGZ1bmN0aW9uKGppZCwgZGlzcGxheU5hbWUpIHtcbiAgICB2YXIgZW5kcG9pbnRJZCA9IGppZC5zdWJzdHIoMSArIGppZC5sYXN0SW5kZXhPZignLycpKTtcbiAgICB2YXIgdXBkYXRlID0gZmFsc2U7XG5cbiAgICBpZiAodGhpcy5lbmRwb2ludHNJbmZvID09PSBudWxsKSB7XG4gICAgICAgdGhpcy5lbmRwb2ludHNJbmZvID0ge307XG4gICAgfVxuXG4gICAgdmFyIGVuZHBvaW50SW5mbyA9IHRoaXMuZW5kcG9pbnRzSW5mb1tlbmRwb2ludElkXTtcbiAgICBpZiAoJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiBlbmRwb2ludEluZm8pIHtcbiAgICAgICAgZW5kcG9pbnRJbmZvID0gdGhpcy5lbmRwb2ludHNJbmZvW2VuZHBvaW50SWRdID0ge307XG4gICAgfVxuXG4gICAgaWYgKGVuZHBvaW50SW5mb1snZGlzcGxheW5hbWUnXSAhPT0gZGlzcGxheU5hbWUpIHtcbiAgICAgICAgZW5kcG9pbnRJbmZvWydkaXNwbGF5bmFtZSddID0gZGlzcGxheU5hbWU7XG4gICAgICAgIHVwZGF0ZSA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHVwZGF0ZSkge1xuICAgICAgICB0aGlzLnVwZGF0ZUVuZHBvaW50cygpO1xuICAgIH1cbn07XG5cbi8qXG4gKiBTZW5kcyBhIGNvbGlicmkgbWVzc2FnZSB0byB0aGUgYnJpZGdlIHRoYXQgY29udGFpbnMgdGhlXG4gKiBjdXJyZW50IGVuZHBvaW50cyBhbmQgdGhlaXIgZGlzcGxheSBuYW1lcy5cbiAqL1xuQ29saWJyaUZvY3VzLnByb3RvdHlwZS51cGRhdGVFbmRwb2ludHMgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5jb25maWQgPT09IG51bGxcbiAgICAgICAgfHwgdGhpcy5lbmRwb2ludHNJbmZvID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jb25maWQgPT09IDApIHtcbiAgICAgICAgLy8gdGhlIGNvbGlicmkgY29uZmVyZW5jZSBpcyBjdXJyZW50bHkgaW5pdGlhdGluZ1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBzZWxmLnVwZGF0ZUVuZHBvaW50cygpfSwgMTAwMCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgZWxlbSA9ICRpcSh7dG86IHRoaXMuYnJpZGdlamlkLCB0eXBlOiAnc2V0J30pO1xuICAgIGVsZW0uYygnY29uZmVyZW5jZScsIHtcbiAgICAgICAgeG1sbnM6ICdodHRwOi8vaml0c2kub3JnL3Byb3RvY29sL2NvbGlicmknLFxuICAgICAgICBpZDogdGhpcy5jb25maWRcbiAgICB9KTtcblxuICAgIGZvciAodmFyIGlkIGluIHRoaXMuZW5kcG9pbnRzSW5mbykge1xuICAgICAgICBlbGVtLmMoJ2VuZHBvaW50Jyk7XG4gICAgICAgIGVsZW0uYXR0cnMoeyBpZDogaWQsXG4gICAgICAgICAgICAgICAgICAgICBkaXNwbGF5bmFtZTogdGhpcy5lbmRwb2ludHNJbmZvW2lkXVsnZGlzcGxheW5hbWUnXVxuICAgICAgICB9KTtcbiAgICAgICAgZWxlbS51cCgpO1xuICAgIH1cblxuICAgIC8vZWxlbS51cCgpOyAvL2NvbmZlcmVuY2VcblxuICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoXG4gICAgICAgIGVsZW0sXG4gICAgICAgIGZ1bmN0aW9uIChyZXN1bHQpIHt9LFxuICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHsgY29uc29sZS53YXJuKGVycm9yKTsgfVxuICAgICk7XG59O1xuXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLl9tYWtlQ29uZmVyZW5jZSA9IGZ1bmN0aW9uIChlcnJvckNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBlbGVtID0gJGlxKHsgdG86IHRoaXMuYnJpZGdlamlkLCB0eXBlOiAnZ2V0JyB9KTtcbiAgICBlbGVtLmMoJ2NvbmZlcmVuY2UnLCB7IHhtbG5zOiAnaHR0cDovL2ppdHNpLm9yZy9wcm90b2NvbC9jb2xpYnJpJyB9KTtcblxuICAgIHRoaXMubWVkaWEuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICB2YXIgZWxlbU5hbWU7XG4gICAgICAgIHZhciBlbGVtQXR0cnMgPSB7IGluaXRpYXRvcjogJ3RydWUnLCBleHBpcmU6IHNlbGYuY2hhbm5lbEV4cGlyZSB9O1xuXG4gICAgICAgIGlmICgnZGF0YScgPT09IG5hbWUpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGVsZW1OYW1lID0gJ3NjdHBjb25uZWN0aW9uJztcbiAgICAgICAgICAgIGVsZW1BdHRyc1sncG9ydCddID0gNTAwMDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgIHtcbiAgICAgICAgICAgIGVsZW1OYW1lID0gJ2NoYW5uZWwnO1xuICAgICAgICAgICAgaWYgKCgndmlkZW8nID09PSBuYW1lKSAmJiAoc2VsZi5jaGFubmVsTGFzdE4gPj0gMCkpXG4gICAgICAgICAgICAgICAgZWxlbUF0dHJzWydsYXN0LW4nXSA9IHNlbGYuY2hhbm5lbExhc3ROO1xuICAgICAgICB9XG5cbiAgICAgICAgZWxlbS5jKCdjb250ZW50JywgeyBuYW1lOiBuYW1lIH0pO1xuXG4gICAgICAgIGVsZW0uYyhlbGVtTmFtZSwgZWxlbUF0dHJzKTtcbiAgICAgICAgZWxlbS5hdHRycyh7IGVuZHBvaW50OiBzZWxmLm15TXVjUmVzb3VyY2UgfSk7XG4gICAgICAgIGlmIChjb25maWcudXNlQnVuZGxlKSB7XG4gICAgICAgICAgICBlbGVtLmF0dHJzKHsgJ2NoYW5uZWwtYnVuZGxlLWlkJzogc2VsZi5teU11Y1Jlc291cmNlIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsZW0udXAoKTsvLyBlbmQgb2YgY2hhbm5lbC9zY3RwY29ubmVjdGlvblxuXG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgc2VsZi5wZWVycy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgdmFyIHBlZXIgPSBzZWxmLnBlZXJzW2pdO1xuICAgICAgICAgICAgdmFyIHBlZXJFbmRwb2ludCA9IHBlZXIuc3Vic3RyKDEgKyBwZWVyLmxhc3RJbmRleE9mKCcvJykpO1xuXG4gICAgICAgICAgICBlbGVtLmMoZWxlbU5hbWUsIGVsZW1BdHRycyk7XG4gICAgICAgICAgICBlbGVtLmF0dHJzKHsgZW5kcG9pbnQ6IHBlZXJFbmRwb2ludCB9KTtcbiAgICAgICAgICAgIGlmIChjb25maWcudXNlQnVuZGxlKSB7XG4gICAgICAgICAgICAgICAgZWxlbS5hdHRycyh7ICdjaGFubmVsLWJ1bmRsZS1pZCc6IHBlZXJFbmRwb2ludCB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsZW0udXAoKTsgLy8gZW5kIG9mIGNoYW5uZWwvc2N0cGNvbm5lY3Rpb25cbiAgICAgICAgfVxuICAgICAgICBlbGVtLnVwKCk7IC8vIGVuZCBvZiBjb250ZW50XG4gICAgfSk7XG5cbiAgICBpZiAodGhpcy5lbmRwb2ludHNJbmZvICE9PSBudWxsKSB7XG4gICAgICAgIGZvciAodmFyIGlkIGluIHRoaXMuZW5kcG9pbnRzSW5mbykge1xuICAgICAgICAgICAgZWxlbS5jKCdlbmRwb2ludCcpO1xuICAgICAgICAgICAgZWxlbS5hdHRycyh7IGlkOiBpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBkaXNwbGF5bmFtZTogdGhpcy5lbmRwb2ludHNJbmZvW2lkXVsnZGlzcGxheW5hbWUnXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBlbGVtLnVwKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKlxuICAgIHZhciBsb2NhbFNEUCA9IG5ldyBTRFAodGhpcy5wZWVyY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uLnNkcCk7XG4gICAgbG9jYWxTRFAubWVkaWEuZm9yRWFjaChmdW5jdGlvbiAobWVkaWEsIGNoYW5uZWwpIHtcbiAgICAgICAgdmFyIG5hbWUgPSBTRFBVdGlsLnBhcnNlX21saW5lKG1lZGlhLnNwbGl0KCdcXHJcXG4nKVswXSkubWVkaWE7XG4gICAgICAgIGVsZW0uYygnY29udGVudCcsIHtuYW1lOiBuYW1lfSk7XG4gICAgICAgIGVsZW0uYygnY2hhbm5lbCcsIHtpbml0aWF0b3I6ICdmYWxzZScsIGV4cGlyZTogc2VsZi5jaGFubmVsRXhwaXJlfSk7XG5cbiAgICAgICAgLy8gRklYTUU6IHNob3VsZCByZXVzZSBjb2RlIGZyb20gLnRvSmluZ2xlXG4gICAgICAgIHZhciBtbGluZSA9IFNEUFV0aWwucGFyc2VfbWxpbmUobWVkaWEuc3BsaXQoJ1xcclxcbicpWzBdKTtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBtbGluZS5mbXQubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIHZhciBydHBtYXAgPSBTRFBVdGlsLmZpbmRfbGluZShtZWRpYSwgJ2E9cnRwbWFwOicgKyBtbGluZS5mbXRbal0pO1xuICAgICAgICAgICAgZWxlbS5jKCdwYXlsb2FkLXR5cGUnLCBTRFBVdGlsLnBhcnNlX3J0cG1hcChydHBtYXApKTtcbiAgICAgICAgICAgIGVsZW0udXAoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxvY2FsU0RQLlRyYW5zcG9ydFRvSmluZ2xlKGNoYW5uZWwsIGVsZW0pO1xuXG4gICAgICAgIGVsZW0udXAoKTsgLy8gZW5kIG9mIGNoYW5uZWxcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IHNlbGYucGVlcnMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIGVsZW0uYygnY2hhbm5lbCcsIHtpbml0aWF0b3I6ICd0cnVlJywgZXhwaXJlOiBzZWxmLmNoYW5uZWxFeHBpcmUgfSkudXAoKTtcbiAgICAgICAgfVxuICAgICAgICBlbGVtLnVwKCk7IC8vIGVuZCBvZiBjb250ZW50XG4gICAgfSk7XG4gICAgKi9cblxuICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoZWxlbSxcbiAgICAgICAgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgc2VsZi5jcmVhdGVkQ29uZmVyZW5jZShyZXN1bHQpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihlcnJvcik7XG4gICAgICAgICAgICBlcnJvckNhbGxiYWNrKGVycm9yKTtcbiAgICAgICAgfVxuICAgICk7XG59O1xuXG4vLyBjYWxsYmFjayB3aGVuIGEgY29saWJyaSBjb25mZXJlbmNlIHdhcyBjcmVhdGVkXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLmNyZWF0ZWRDb25mZXJlbmNlID0gZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgIGNvbnNvbGUubG9nKCdjcmVhdGVkIGEgY29uZmVyZW5jZSBvbiB0aGUgYnJpZGdlJyk7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB0bXA7XG5cbiAgICB0aGlzLmNvbmZpZCA9ICQocmVzdWx0KS5maW5kKCc+Y29uZmVyZW5jZScpLmF0dHIoJ2lkJyk7XG4gICAgdmFyIHJlbW90ZWNvbnRlbnRzID0gJChyZXN1bHQpLmZpbmQoJz5jb25mZXJlbmNlPmNvbnRlbnQnKS5nZXQoKTtcbiAgICB2YXIgbnVtcGFydGljaXBhbnRzID0gMDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlbW90ZWNvbnRlbnRzLmxlbmd0aDsgaSsrKVxuICAgIHtcbiAgICAgICAgdmFyIGNvbnRlbnROYW1lID0gJChyZW1vdGVjb250ZW50c1tpXSkuYXR0cignbmFtZScpO1xuICAgICAgICB2YXIgY2hhbm5lbE5hbWVcbiAgICAgICAgICAgID0gY29udGVudE5hbWUgIT09ICdkYXRhJyA/ICc+Y2hhbm5lbCcgOiAnPnNjdHBjb25uZWN0aW9uJztcblxuICAgICAgICB0bXAgPSAkKHJlbW90ZWNvbnRlbnRzW2ldKS5maW5kKGNoYW5uZWxOYW1lKS5nZXQoKTtcbiAgICAgICAgdGhpcy5teWNoYW5uZWwucHVzaCgkKHRtcC5zaGlmdCgpKSk7XG4gICAgICAgIG51bXBhcnRpY2lwYW50cyA9IHRtcC5sZW5ndGg7XG4gICAgICAgIGZvciAoaiA9IDA7IGogPCB0bXAubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmNoYW5uZWxzW2pdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNoYW5uZWxzW2pdID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNoYW5uZWxzW2pdLnB1c2godG1wW2pdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIHNhdmUgdGhlICd0cmFuc3BvcnQnIGVsZW1lbnRzIGZyb20gJ2NoYW5uZWwtYnVuZGxlJy1zXG4gICAgdmFyIGNoYW5uZWxCdW5kbGVzID0gJChyZXN1bHQpLmZpbmQoJz5jb25mZXJlbmNlPmNoYW5uZWwtYnVuZGxlJyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGFubmVsQnVuZGxlcy5sZW5ndGg7IGkrKylcbiAgICB7XG4gICAgICAgIHZhciBlbmRwb2ludElkID0gJChjaGFubmVsQnVuZGxlc1tpXSkuYXR0cignaWQnKTtcbiAgICAgICAgdGhpcy5idW5kbGVkVHJhbnNwb3J0c1tlbmRwb2ludElkXSA9ICQoY2hhbm5lbEJ1bmRsZXNbaV0pLmZpbmQoJz50cmFuc3BvcnRbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6dHJhbnNwb3J0czppY2UtdWRwOjFcIl0nKTtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZygncmVtb3RlIGNoYW5uZWxzJywgdGhpcy5jaGFubmVscyk7XG5cbiAgICAvLyBOb3RpZnkgdGhhdCB0aGUgZm9jdXMgaGFzIGNyZWF0ZWQgdGhlIGNvbmZlcmVuY2Ugb24gdGhlIGJyaWRnZVxuICAgIHRoaXMuZXZlbnRFbWl0dGVyLmVtaXQoWE1QUEV2ZW50cy5DT05GRVJFTkNFX0NFUkFURUQsIHNlbGYpO1xuXG4gICAgdmFyIGJyaWRnZVNEUCA9IG5ldyBTRFAoXG4gICAgICAgICd2PTBcXHJcXG4nICtcbiAgICAgICAgJ289LSA1MTUxMDU1NDU4ODc0OTUxMjMzIDIgSU4gSVA0IDEyNy4wLjAuMVxcclxcbicgK1xuICAgICAgICAncz0tXFxyXFxuJyArXG4gICAgICAgICd0PTAgMFxcclxcbicgK1xuICAgICAgICAvKiBBdWRpbyAqL1xuICAgICAgICAoY29uZmlnLnVzZUJ1bmRsZVxuICAgICAgICAgICAgPyAoJ2E9Z3JvdXA6QlVORExFIGF1ZGlvIHZpZGVvJyArXG4gICAgICAgICAgICAgICAgKGNvbmZpZy5vcGVuU2N0cCA/ICcgZGF0YScgOiAnJykgK1xuICAgICAgICAgICAgICAgJ1xcclxcbicpXG4gICAgICAgICAgICA6ICcnKSArXG4gICAgICAgICdtPWF1ZGlvIDEgUlRQL1NBVlBGIDExMSAxMDMgMTA0IDAgOCAxMDYgMTA1IDEzIDEyNlxcclxcbicgK1xuICAgICAgICAnYz1JTiBJUDQgMC4wLjAuMFxcclxcbicgK1xuICAgICAgICAnYT1ydGNwOjEgSU4gSVA0IDAuMC4wLjBcXHJcXG4nICtcbiAgICAgICAgJ2E9bWlkOmF1ZGlvXFxyXFxuJyArXG4gICAgICAgICdhPWV4dG1hcDoxIHVybjppZXRmOnBhcmFtczpydHAtaGRyZXh0OnNzcmMtYXVkaW8tbGV2ZWxcXHJcXG4nICtcbiAgICAgICAgJ2E9c2VuZHJlY3ZcXHJcXG4nICtcbiAgICAgICAgJ2E9cnRwbWFwOjExMSBvcHVzLzQ4MDAwLzJcXHJcXG4nICtcbiAgICAgICAgJ2E9Zm10cDoxMTEgbWlucHRpbWU9MTBcXHJcXG4nICtcbiAgICAgICAgJ2E9cnRwbWFwOjEwMyBJU0FDLzE2MDAwXFxyXFxuJyArXG4gICAgICAgICdhPXJ0cG1hcDoxMDQgSVNBQy8zMjAwMFxcclxcbicgK1xuICAgICAgICAnYT1ydHBtYXA6MCBQQ01VLzgwMDBcXHJcXG4nICtcbiAgICAgICAgJ2E9cnRwbWFwOjggUENNQS84MDAwXFxyXFxuJyArXG4gICAgICAgICdhPXJ0cG1hcDoxMDYgQ04vMzIwMDBcXHJcXG4nICtcbiAgICAgICAgJ2E9cnRwbWFwOjEwNSBDTi8xNjAwMFxcclxcbicgK1xuICAgICAgICAnYT1ydHBtYXA6MTMgQ04vODAwMFxcclxcbicgK1xuICAgICAgICAnYT1ydHBtYXA6MTI2IHRlbGVwaG9uZS1ldmVudC84MDAwXFxyXFxuJyArXG4gICAgICAgICdhPW1heHB0aW1lOjYwXFxyXFxuJyArXG4gICAgICAgIChjb25maWcudXNlUnRjcE11eCA/ICdhPXJ0Y3AtbXV4XFxyXFxuJyA6ICcnKSArXG4gICAgICAgIC8qIFZpZGVvICovXG4gICAgICAgICdtPXZpZGVvIDEgUlRQL1NBVlBGIDEwMCAxMTYgMTE3XFxyXFxuJyArXG4gICAgICAgICdjPUlOIElQNCAwLjAuMC4wXFxyXFxuJyArXG4gICAgICAgICdhPXJ0Y3A6MSBJTiBJUDQgMC4wLjAuMFxcclxcbicgK1xuICAgICAgICAnYT1taWQ6dmlkZW9cXHJcXG4nICtcbiAgICAgICAgJ2E9ZXh0bWFwOjIgdXJuOmlldGY6cGFyYW1zOnJ0cC1oZHJleHQ6dG9mZnNldFxcclxcbicgK1xuICAgICAgICAnYT1leHRtYXA6MyBodHRwOi8vd3d3LndlYnJ0Yy5vcmcvZXhwZXJpbWVudHMvcnRwLWhkcmV4dC9hYnMtc2VuZC10aW1lXFxyXFxuJyArXG4gICAgICAgICdhPXNlbmRyZWN2XFxyXFxuJyArXG4gICAgICAgICdhPXJ0cG1hcDoxMDAgVlA4LzkwMDAwXFxyXFxuJyArXG4gICAgICAgICdhPXJ0Y3AtZmI6MTAwIGNjbSBmaXJcXHJcXG4nICtcbiAgICAgICAgJ2E9cnRjcC1mYjoxMDAgbmFja1xcclxcbicgK1xuICAgICAgICAnYT1ydGNwLWZiOjEwMCBnb29nLXJlbWJcXHJcXG4nICtcbiAgICAgICAgJ2E9cnRwbWFwOjExNiByZWQvOTAwMDBcXHJcXG4nICtcbiAgICAgICAgJ2E9cnRwbWFwOjExNyB1bHBmZWMvOTAwMDBcXHJcXG4nICtcbiAgICAgICAgKGNvbmZpZy51c2VSdGNwTXV4ID8gJ2E9cnRjcC1tdXhcXHJcXG4nIDogJycpICtcbiAgICAgICAgLyogRGF0YSBTQ1RQICovXG4gICAgICAgIChjb25maWcub3BlblNjdHAgP1xuICAgICAgICAgICAgJ209YXBwbGljYXRpb24gMSBEVExTL1NDVFAgNTAwMFxcclxcbicgK1xuICAgICAgICAgICAgJ2M9SU4gSVA0IDAuMC4wLjBcXHJcXG4nICtcbiAgICAgICAgICAgICdhPXNjdHBtYXA6NTAwMCB3ZWJydGMtZGF0YWNoYW5uZWxcXHJcXG4nICtcbiAgICAgICAgICAgICdhPW1pZDpkYXRhXFxyXFxuJ1xuICAgICAgICAgICAgOiAnJylcbiAgICApO1xuXG4gICAgYnJpZGdlU0RQLm1lZGlhLmxlbmd0aCA9IHRoaXMubXljaGFubmVsLmxlbmd0aDtcbiAgICB2YXIgY2hhbm5lbDtcbiAgICAvKlxuICAgIGZvciAoY2hhbm5lbCA9IDA7IGNoYW5uZWwgPCBicmlkZ2VTRFAubWVkaWEubGVuZ3RoOyBjaGFubmVsKyspIHtcbiAgICAgICAgYnJpZGdlU0RQLm1lZGlhW2NoYW5uZWxdID0gJyc7XG4gICAgICAgIC8vIHVuY2hhbmdlZCBsaW5lc1xuICAgICAgICBicmlkZ2VTRFAubWVkaWFbY2hhbm5lbF0gKz0gU0RQVXRpbC5maW5kX2xpbmUobG9jYWxTRFAubWVkaWFbY2hhbm5lbF0sICdtPScpICsgJ1xcclxcbic7XG4gICAgICAgIGJyaWRnZVNEUC5tZWRpYVtjaGFubmVsXSArPSBTRFBVdGlsLmZpbmRfbGluZShsb2NhbFNEUC5tZWRpYVtjaGFubmVsXSwgJ2M9JykgKyAnXFxyXFxuJztcbiAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKGxvY2FsU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1ydGNwOicpKSB7XG4gICAgICAgICAgICBicmlkZ2VTRFAubWVkaWFbY2hhbm5lbF0gKz0gU0RQVXRpbC5maW5kX2xpbmUobG9jYWxTRFAubWVkaWFbY2hhbm5lbF0sICdhPXJ0Y3A6JykgKyAnXFxyXFxuJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUobG9jYWxTRFAubWVkaWFbY2hhbm5lbF0sICdhPW1pZDonKSkge1xuICAgICAgICAgICAgYnJpZGdlU0RQLm1lZGlhW2NoYW5uZWxdICs9IFNEUFV0aWwuZmluZF9saW5lKGxvY2FsU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1taWQ6JykgKyAnXFxyXFxuJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUobG9jYWxTRFAubWVkaWFbY2hhbm5lbF0sICdhPXNlbmRyZWN2JykpIHtcbiAgICAgICAgICAgIGJyaWRnZVNEUC5tZWRpYVtjaGFubmVsXSArPSAnYT1zZW5kcmVjdlxcclxcbic7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKGxvY2FsU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1leHRtYXA6JykpIHtcbiAgICAgICAgICAgIGJyaWRnZVNEUC5tZWRpYVtjaGFubmVsXSArPSBTRFBVdGlsLmZpbmRfbGluZXMobG9jYWxTRFAubWVkaWFbY2hhbm5lbF0sICdhPWV4dG1hcDonKS5qb2luKCdcXHJcXG4nKSArICdcXHJcXG4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRklYTUU6IHNob3VsZCBsb29rIGF0IG0tbGluZSBhbmQgZ3JvdXAgdGhlIGlkcyB0b2dldGhlclxuICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUobG9jYWxTRFAubWVkaWFbY2hhbm5lbF0sICdhPXJ0cG1hcDonKSkge1xuICAgICAgICAgICAgYnJpZGdlU0RQLm1lZGlhW2NoYW5uZWxdICs9IFNEUFV0aWwuZmluZF9saW5lcyhsb2NhbFNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9cnRwbWFwOicpLmpvaW4oJ1xcclxcbicpICsgJ1xcclxcbic7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKGxvY2FsU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1mbXRwOicpKSB7XG4gICAgICAgICAgICBicmlkZ2VTRFAubWVkaWFbY2hhbm5lbF0gKz0gU0RQVXRpbC5maW5kX2xpbmVzKGxvY2FsU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1mbXRwOicpLmpvaW4oJ1xcclxcbicpICsgJ1xcclxcbic7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKGxvY2FsU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1ydGNwLWZiOicpKSB7XG4gICAgICAgICAgICBicmlkZ2VTRFAubWVkaWFbY2hhbm5lbF0gKz0gU0RQVXRpbC5maW5kX2xpbmVzKGxvY2FsU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1ydGNwLWZiOicpLmpvaW4oJ1xcclxcbicpICsgJ1xcclxcbic7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRklYTUU6IGNoYW5nZWQgbGluZXMgLS0gYT1zZW5kcmVjdiBkaXJlY3Rpb24sIGE9c2V0dXAgZGlyZWN0aW9uXG4gICAgfVxuICAgICovXG4gICAgZm9yIChjaGFubmVsID0gMDsgY2hhbm5lbCA8IGJyaWRnZVNEUC5tZWRpYS5sZW5ndGg7IGNoYW5uZWwrKykge1xuICAgICAgICAvLyBnZXQgdGhlIG1peGVkIHNzcmNcbiAgICAgICAgdG1wID0gJCh0aGlzLm15Y2hhbm5lbFtjaGFubmVsXSkuZmluZCgnPnNvdXJjZVt4bWxucz1cInVybjp4bXBwOmppbmdsZTphcHBzOnJ0cDpzc21hOjBcIl0nKTtcbiAgICAgICAgLy8gRklYTUU6IGNoZWNrIHJ0cC1sZXZlbC1yZWxheS10eXBlXG5cbiAgICAgICAgdmFyIG5hbWUgPSBicmlkZ2VTRFAubWVkaWFbY2hhbm5lbF0uc3BsaXQoXCIgXCIpWzBdLnN1YnN0cigyKTsgLy8gJ209YXVkaW8gLi4uJ1xuICAgICAgICBpZiAobmFtZSA9PT0gJ2F1ZGlvJyB8fCBuYW1lID09PSAndmlkZW8nKSB7XG4gICAgICAgICAgICAvLyBtYWtlIGNocm9tZSBoYXBweS4uLiAnMzczNTkyODU1OScgPT0gMHhERUFEQkVFRlxuICAgICAgICAgICAgdmFyIHNzcmMgPSB0bXAubGVuZ3RoID8gdG1wLmF0dHIoJ3NzcmMnKSA6ICczNzM1OTI4NTU5JztcblxuICAgICAgICAgICAgYnJpZGdlU0RQLm1lZGlhW2NoYW5uZWxdICs9ICdhPXNzcmM6JyArIHNzcmMgKyAnIGNuYW1lOm1peGVkXFxyXFxuJztcbiAgICAgICAgICAgIGJyaWRnZVNEUC5tZWRpYVtjaGFubmVsXSArPSAnYT1zc3JjOicgKyBzc3JjICsgJyBsYWJlbDptaXhlZGxhYmVsJyArIG5hbWUgKyAnMFxcclxcbic7XG4gICAgICAgICAgICBicmlkZ2VTRFAubWVkaWFbY2hhbm5lbF0gKz0gJ2E9c3NyYzonICsgc3NyYyArICcgbXNpZDptaXhlZG1zbGFiZWwgbWl4ZWRsYWJlbCcgKyBuYW1lICsgJzBcXHJcXG4nO1xuICAgICAgICAgICAgYnJpZGdlU0RQLm1lZGlhW2NoYW5uZWxdICs9ICdhPXNzcmM6JyArIHNzcmMgKyAnIG1zbGFiZWw6bWl4ZWRtc2xhYmVsXFxyXFxuJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZJWE1FOiBzaG91bGQgdGFrZSBjb2RlIGZyb20gLmZyb21KaW5nbGVcbiAgICAgICAgdmFyIGNoYW5uZWxCdW5kbGVJZCA9ICQodGhpcy5teWNoYW5uZWxbY2hhbm5lbF0pLmF0dHIoJ2NoYW5uZWwtYnVuZGxlLWlkJyk7XG4gICAgICAgIGlmICh0eXBlb2YgY2hhbm5lbEJ1bmRsZUlkICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0bXAgPSB0aGlzLmJ1bmRsZWRUcmFuc3BvcnRzW2NoYW5uZWxCdW5kbGVJZF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0bXAgPSAkKHRoaXMubXljaGFubmVsW2NoYW5uZWxdKS5maW5kKCc+dHJhbnNwb3J0W3htbG5zPVwidXJuOnhtcHA6amluZ2xlOnRyYW5zcG9ydHM6aWNlLXVkcDoxXCJdJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG1wLmxlbmd0aCkge1xuICAgICAgICAgICAgYnJpZGdlU0RQLm1lZGlhW2NoYW5uZWxdICs9ICdhPWljZS11ZnJhZzonICsgdG1wLmF0dHIoJ3VmcmFnJykgKyAnXFxyXFxuJztcbiAgICAgICAgICAgIGJyaWRnZVNEUC5tZWRpYVtjaGFubmVsXSArPSAnYT1pY2UtcHdkOicgKyB0bXAuYXR0cigncHdkJykgKyAnXFxyXFxuJztcbiAgICAgICAgICAgIHRtcC5maW5kKCc+Y2FuZGlkYXRlJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgYnJpZGdlU0RQLm1lZGlhW2NoYW5uZWxdICs9IFNEUFV0aWwuY2FuZGlkYXRlRnJvbUppbmdsZSh0aGlzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdG1wID0gdG1wLmZpbmQoJz5maW5nZXJwcmludCcpO1xuICAgICAgICAgICAgaWYgKHRtcC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBicmlkZ2VTRFAubWVkaWFbY2hhbm5lbF0gKz0gJ2E9ZmluZ2VycHJpbnQ6JyArIHRtcC5hdHRyKCdoYXNoJykgKyAnICcgKyB0bXAudGV4dCgpICsgJ1xcclxcbic7XG4gICAgICAgICAgICAgICAgYnJpZGdlU0RQLm1lZGlhW2NoYW5uZWxdICs9ICdhPXNldHVwOmFjdHBhc3NcXHJcXG4nOyAvLyBvZmZlciBzbyBhbHdheXMgYWN0cGFzc1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGJyaWRnZVNEUC5yYXcgPSBicmlkZ2VTRFAuc2Vzc2lvbiArIGJyaWRnZVNEUC5tZWRpYS5qb2luKCcnKTtcbiAgICB2YXIgYnJpZGdlRGVzYyA9IG5ldyBSVENTZXNzaW9uRGVzY3JpcHRpb24oe3R5cGU6ICdvZmZlcicsIHNkcDogYnJpZGdlU0RQLnJhd30pO1xuICAgIHZhciBzaW11bGNhc3QgPSBuZXcgU2ltdWxjYXN0KCk7XG4gICAgdmFyIGJyaWRnZURlc2MgPSBzaW11bGNhc3QudHJhbnNmb3JtUmVtb3RlRGVzY3JpcHRpb24oYnJpZGdlRGVzYyk7XG5cbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLnNldFJlbW90ZURlc2NyaXB0aW9uKGJyaWRnZURlc2MsXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzZXRSZW1vdGVEZXNjcmlwdGlvbiBzdWNjZXNzJyk7XG4gICAgICAgICAgICBzZWxmLnBlZXJjb25uZWN0aW9uLmNyZWF0ZUFuc3dlcihcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYucGVlcmNvbm5lY3Rpb24uc2V0TG9jYWxEZXNjcmlwdGlvbihhbnN3ZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NldExvY2FsRGVzY3JpcHRpb24gc3VjY2VlZGVkLicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1ha2Ugc3VyZSBvdXIgcHJlc2VuY2UgaXMgdXBkYXRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ3NldExvY2FsRGVzY3JpcHRpb24uamluZ2xlJywgW3NlbGYuc2lkXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVsZW0gPSAkaXEoe3RvOiBzZWxmLmJyaWRnZWppZCwgdHlwZTogJ2dldCd9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmMoJ2NvbmZlcmVuY2UnLCB7eG1sbnM6ICdodHRwOi8vaml0c2kub3JnL3Byb3RvY29sL2NvbGlicmknLCBpZDogc2VsZi5jb25maWR9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbG9jYWxTRFAgPSBuZXcgU0RQKHNlbGYucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbi5zZHApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU0RQLm1lZGlhLmZvckVhY2goZnVuY3Rpb24gKG1lZGlhLCBjaGFubmVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuYW1lID0gU0RQVXRpbC5wYXJzZV9taWQoU0RQVXRpbC5maW5kX2xpbmUobWVkaWEsICdhPW1pZDonKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uYygnY29udGVudCcsIHtuYW1lOiBuYW1lfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtbGluZSA9IFNEUFV0aWwucGFyc2VfbWxpbmUobWVkaWEuc3BsaXQoJ1xcclxcbicpWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUgIT09ICdkYXRhJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5jKCdjaGFubmVsJywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluaXRpYXRvcjogJ3RydWUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGlyZTogc2VsZi5jaGFubmVsRXhwaXJlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBzZWxmLm15Y2hhbm5lbFtjaGFubmVsXS5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZHBvaW50OiBzZWxmLm15TXVjUmVzb3VyY2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzaWduYWwgKHRocm91Z2ggQ09MSUJSSSkgdG8gdGhlIGJyaWRnZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIFNTUkMgZ3JvdXBzIG9mIHRoZSBwYXJ0aWNpcGFudFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhhdCBwbGF5cyB0aGUgcm9sZSBvZiB0aGUgZm9jdXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzc3JjX2dyb3VwX2xpbmVzID0gU0RQVXRpbC5maW5kX2xpbmVzKG1lZGlhLCAnYT1zc3JjLWdyb3VwOicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkeCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzc3JjX2dyb3VwX2xpbmVzLmZvckVhY2goZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkeCA9IGxpbmUuaW5kZXhPZignICcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzZW1hbnRpY3MgPSBsaW5lLnN1YnN0cigwLCBpZHgpLnN1YnN0cigxMyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNzcmNzID0gbGluZS5zdWJzdHIoMTQgKyBzZW1hbnRpY3MubGVuZ3RoKS5zcGxpdCgnICcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzc3Jjcy5sZW5ndGggIT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmMoJ3NzcmMtZ3JvdXAnLCB7IHNlbWFudGljczogc2VtYW50aWNzLCB4bWxuczogJ3Vybjp4bXBwOmppbmdsZTphcHBzOnJ0cDpzc21hOjAnIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzc3Jjcy5mb3JFYWNoKGZ1bmN0aW9uKHNzcmMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uYygnc291cmNlJywgeyBzc3JjOiBzc3JjIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnVwKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLnVwKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGSVhNRTogc2hvdWxkIHJldXNlIGNvZGUgZnJvbSAudG9KaW5nbGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbWxpbmUuZm10Lmxlbmd0aDsgaisrKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBydHBtYXAgPSBTRFBVdGlsLmZpbmRfbGluZShtZWRpYSwgJ2E9cnRwbWFwOicgKyBtbGluZS5mbXRbal0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChydHBtYXApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmMoJ3BheWxvYWQtdHlwZScsIFNEUFV0aWwucGFyc2VfcnRwbWFwKHJ0cG1hcCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLnVwKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNjdHBtYXAgPSBTRFBVdGlsLmZpbmRfbGluZShtZWRpYSwgJ2E9c2N0cG1hcDonICsgbWxpbmUuZm10WzBdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzY3RwUG9ydCA9IFNEUFV0aWwucGFyc2Vfc2N0cG1hcChzY3RwbWFwKVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uYyhcInNjdHBjb25uZWN0aW9uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbml0aWF0b3I6ICd0cnVlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwaXJlOiBzZWxmLmNoYW5uZWxFeHBpcmUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBzZWxmLm15Y2hhbm5lbFtjaGFubmVsXS5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmRwb2ludDogc2VsZi5teU11Y1Jlc291cmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3J0OiBzY3RwUG9ydFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhbFNEUC5UcmFuc3BvcnRUb0ppbmdsZShjaGFubmVsLCBlbGVtKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLnVwKCk7IC8vIGVuZCBvZiBjaGFubmVsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0udXAoKTsgLy8gZW5kIG9mIGNvbnRlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuY29ubmVjdGlvbi5zZW5kSVEoZWxlbSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gLi4uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkVSUk9SIHNlbmRpbmcgY29saWJyaSBtZXNzYWdlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IsIGVsZW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5vdyBpbml0aWF0ZSBzZXNzaW9uc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtcGFydGljaXBhbnRzOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5pbml0aWF0ZShzZWxmLnBlZXJzW2ldLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBOb3RpZnkgd2UndmUgY3JlYXRlZCB0aGUgY29uZmVyZW5jZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuZXZlbnRFbWl0dGVyLmVtaXQoWE1QUEV2ZW50cy5DT05GRVJFTkNFX0NFUkFURUQsIHNlbGYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2Fybignc2V0TG9jYWxEZXNjcmlwdGlvbiBmYWlsZWQuJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignY3JlYXRlQW5zd2VyIGZhaWxlZC4nLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG51bXBhcnRpY2lwYW50czsgaSsrKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5pbml0aWF0ZShzZWxmLnBlZXJzW2ldLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICovXG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3NldFJlbW90ZURlc2NyaXB0aW9uIGZhaWxlZC4nLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICApO1xuXG59O1xuXG4vLyBzZW5kIGEgc2Vzc2lvbi1pbml0aWF0ZSB0byBhIG5ldyBwYXJ0aWNpcGFudFxuQ29saWJyaUZvY3VzLnByb3RvdHlwZS5pbml0aWF0ZSA9IGZ1bmN0aW9uIChwZWVyLCBpc0luaXRpYXRvcikge1xuICAgIHZhciBwYXJ0aWNpcGFudCA9IHRoaXMucGVlcnMuaW5kZXhPZihwZWVyKTtcbiAgICBjb25zb2xlLmxvZygndGVsbCcsIHBlZXIsIHBhcnRpY2lwYW50KTtcbiAgICB2YXIgc2RwO1xuICAgIGlmICh0aGlzLnBlZXJjb25uZWN0aW9uICE9PSBudWxsICYmIHRoaXMucGVlcmNvbm5lY3Rpb24uc2lnbmFsaW5nU3RhdGUgPT0gJ3N0YWJsZScpIHtcbiAgICAgICAgc2RwID0gbmV3IFNEUCh0aGlzLnBlZXJjb25uZWN0aW9uLnJlbW90ZURlc2NyaXB0aW9uLnNkcCk7XG4gICAgICAgIHZhciBsb2NhbFNEUCA9IG5ldyBTRFAodGhpcy5wZWVyY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uLnNkcCk7XG4gICAgICAgIC8vIHRocm93IGF3YXkgc3R1ZmYgd2UgZG9uJ3Qgd2FudFxuICAgICAgICAvLyBub3QgbmVlZGVkIHdpdGggc3RhdGljIG9mZmVyXG4gICAgICAgIGlmICghY29uZmlnLnVzZUJ1bmRsZSkge1xuICAgICAgICAgICAgc2RwLnJlbW92ZVNlc3Npb25MaW5lcygnYT1ncm91cDonKTtcbiAgICAgICAgfVxuICAgICAgICBzZHAucmVtb3ZlU2Vzc2lvbkxpbmVzKCdhPW1zaWQtc2VtYW50aWM6Jyk7IC8vIEZJWE1FOiBub3QgbWFwcGVkIG92ZXIgamluZ2xlIGFueXdheS4uLlxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNkcC5tZWRpYS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKCFjb25maWcudXNlUnRjcE11eCl7XG4gICAgICAgICAgICAgICAgc2RwLnJlbW92ZU1lZGlhTGluZXMoaSwgJ2E9cnRjcC1tdXgnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNkcC5yZW1vdmVNZWRpYUxpbmVzKGksICdhPXNzcmM6Jyk7XG4gICAgICAgICAgICBzZHAucmVtb3ZlTWVkaWFMaW5lcyhpLCAnYT1zc3JjLWdyb3VwOicpO1xuICAgICAgICAgICAgc2RwLnJlbW92ZU1lZGlhTGluZXMoaSwgJ2E9Y3J5cHRvOicpO1xuICAgICAgICAgICAgc2RwLnJlbW92ZU1lZGlhTGluZXMoaSwgJ2E9Y2FuZGlkYXRlOicpO1xuICAgICAgICAgICAgc2RwLnJlbW92ZU1lZGlhTGluZXMoaSwgJ2E9aWNlLW9wdGlvbnM6Z29vZ2xlLWljZScpO1xuICAgICAgICAgICAgc2RwLnJlbW92ZU1lZGlhTGluZXMoaSwgJ2E9aWNlLXVmcmFnOicpO1xuICAgICAgICAgICAgc2RwLnJlbW92ZU1lZGlhTGluZXMoaSwgJ2E9aWNlLXB3ZDonKTtcbiAgICAgICAgICAgIHNkcC5yZW1vdmVNZWRpYUxpbmVzKGksICdhPWZpbmdlcnByaW50OicpO1xuICAgICAgICAgICAgc2RwLnJlbW92ZU1lZGlhTGluZXMoaSwgJ2E9c2V0dXA6Jyk7XG5cbiAgICAgICAgICAgIGlmICgxKSB7IC8vaSA+IDApIHsgLy8gbm90IGZvciBhdWRpbyBGSVhNRTogZG9lcyBub3Qgd29yayBhcyBpbnRlbmRlZFxuICAgICAgICAgICAgICAgIC8vIHJlLWFkZCBhbGwgcmVtb3RlIGE9c3NyY3MgX2FuZF8gYT1zc3JjLWdyb3VwXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgamlkIGluIHRoaXMucmVtb3Rlc3NyYykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoamlkID09IHBlZXIgfHwgIXRoaXMucmVtb3Rlc3NyY1tqaWRdW2ldKVxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIHNkcC5tZWRpYVtpXSArPSB0aGlzLnJlbW90ZXNzcmNbamlkXVtpXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBhZGQgbG9jYWwgYT1zc3JjLWdyb3VwOiBsaW5lc1xuICAgICAgICAgICAgICAgIGxpbmVzID0gU0RQVXRpbC5maW5kX2xpbmVzKGxvY2FsU0RQLm1lZGlhW2ldLCAnYT1zc3JjLWdyb3VwOicpO1xuICAgICAgICAgICAgICAgIGlmIChsaW5lcy5sZW5ndGggIT0gMClcbiAgICAgICAgICAgICAgICAgICAgc2RwLm1lZGlhW2ldICs9IGxpbmVzLmpvaW4oJ1xcclxcbicpICsgJ1xcclxcbic7XG5cbiAgICAgICAgICAgICAgICAvLyBhbmQgbG9jYWwgYT1zc3JjOiBsaW5lc1xuICAgICAgICAgICAgICAgIHNkcC5tZWRpYVtpXSArPSBTRFBVdGlsLmZpbmRfbGluZXMobG9jYWxTRFAubWVkaWFbaV0sICdhPXNzcmM6Jykuam9pbignXFxyXFxuJykgKyAnXFxyXFxuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzZHAucmF3ID0gc2RwLnNlc3Npb24gKyBzZHAubWVkaWEuam9pbignJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignY2FuIG5vdCBpbml0aWF0ZSBhIG5ldyBzZXNzaW9uIHdpdGhvdXQgYSBzdGFibGUgcGVlcmNvbm5lY3Rpb24nKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGFkZCBzdHVmZiB3ZSBnb3QgZnJvbSB0aGUgYnJpZGdlXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBzZHAubWVkaWEubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdmFyIGNoYW4gPSAkKHRoaXMuY2hhbm5lbHNbcGFydGljaXBhbnRdW2pdKTtcbiAgICAgICAgY29uc29sZS5sb2coJ2NoYW5uZWwgaWQnLCBjaGFuLmF0dHIoJ2lkJykpO1xuXG4gICAgICAgIHRtcCA9IGNoYW4uZmluZCgnPnNvdXJjZVt4bWxucz1cInVybjp4bXBwOmppbmdsZTphcHBzOnJ0cDpzc21hOjBcIl0nKTtcblxuICAgICAgICB2YXIgbmFtZSA9IHNkcC5tZWRpYVtqXS5zcGxpdChcIiBcIilbMF0uc3Vic3RyKDIpOyAvLyAnbT1hdWRpbyAuLi4nXG4gICAgICAgIGlmIChuYW1lID09PSAnYXVkaW8nIHx8IG5hbWUgPT09ICd2aWRlbycpIHtcbiAgICAgICAgICAgIC8vIG1ha2UgY2hyb21lIGhhcHB5Li4uICczNzM1OTI4NTU5JyA9PSAweERFQURCRUVGXG4gICAgICAgICAgICB2YXIgc3NyYyA9IHRtcC5sZW5ndGggPyB0bXAuYXR0cignc3NyYycpIDogJzM3MzU5Mjg1NTknO1xuXG4gICAgICAgICAgICBzZHAubWVkaWFbal0gKz0gJ2E9c3NyYzonICsgc3NyYyArICcgY25hbWU6bWl4ZWRcXHJcXG4nO1xuICAgICAgICAgICAgc2RwLm1lZGlhW2pdICs9ICdhPXNzcmM6JyArIHNzcmMgKyAnIGxhYmVsOm1peGVkbGFiZWwnICsgbmFtZSArICcwXFxyXFxuJztcbiAgICAgICAgICAgIHNkcC5tZWRpYVtqXSArPSAnYT1zc3JjOicgKyBzc3JjICsgJyBtc2lkOm1peGVkbXNsYWJlbCBtaXhlZGxhYmVsJyArIG5hbWUgKyAnMFxcclxcbic7XG4gICAgICAgICAgICBzZHAubWVkaWFbal0gKz0gJ2E9c3NyYzonICsgc3NyYyArICcgbXNsYWJlbDptaXhlZG1zbGFiZWxcXHJcXG4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW4gdGhlIGNhc2Ugb2YgYnVuZGxlLCB3ZSBhZGQgZWFjaCBjYW5kaWRhdGUgdG8gYWxsIG09IGxpbmVzL2ppbmdsZSBjb250ZW50cyxcbiAgICAgICAgLy8ganVzdCBhcyBjaHJvbWUgZG9lc1xuICAgICAgICBpZiAoY29uZmlnLnVzZUJ1bmRsZSl7XG4gICAgICAgICAgICB0bXAgPSB0aGlzLmJ1bmRsZWRUcmFuc3BvcnRzW2NoYW4uYXR0cignY2hhbm5lbC1idW5kbGUtaWQnKV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0bXAgPSBjaGFuLmZpbmQoJz50cmFuc3BvcnRbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6dHJhbnNwb3J0czppY2UtdWRwOjFcIl0nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0bXAubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAodG1wLmF0dHIoJ3VmcmFnJykpXG4gICAgICAgICAgICAgICAgc2RwLm1lZGlhW2pdICs9ICdhPWljZS11ZnJhZzonICsgdG1wLmF0dHIoJ3VmcmFnJykgKyAnXFxyXFxuJztcbiAgICAgICAgICAgIGlmICh0bXAuYXR0cigncHdkJykpXG4gICAgICAgICAgICAgICAgc2RwLm1lZGlhW2pdICs9ICdhPWljZS1wd2Q6JyArIHRtcC5hdHRyKCdwd2QnKSArICdcXHJcXG4nO1xuICAgICAgICAgICAgLy8gYW5kIHRoZSBjYW5kaWRhdGVzLi4uXG4gICAgICAgICAgICB0bXAuZmluZCgnPmNhbmRpZGF0ZScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNkcC5tZWRpYVtqXSArPSBTRFBVdGlsLmNhbmRpZGF0ZUZyb21KaW5nbGUodGhpcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRtcCA9IHRtcC5maW5kKCc+ZmluZ2VycHJpbnQnKTtcbiAgICAgICAgICAgIGlmICh0bXAubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgc2RwLm1lZGlhW2pdICs9ICdhPWZpbmdlcnByaW50OicgKyB0bXAuYXR0cignaGFzaCcpICsgJyAnICsgdG1wLnRleHQoKSArICdcXHJcXG4nO1xuICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgaWYgKHRtcC5hdHRyKCdkaXJlY3Rpb24nKSkge1xuICAgICAgICAgICAgICAgICAgICBzZHAubWVkaWFbal0gKz0gJ2E9c2V0dXA6JyArIHRtcC5hdHRyKCdkaXJlY3Rpb24nKSArICdcXHJcXG4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHNkcC5tZWRpYVtqXSArPSAnYT1zZXR1cDphY3RwYXNzXFxyXFxuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBtYWtlIGEgbmV3IGNvbGlicmkgc2Vzc2lvbiBhbmQgY29uZmlndXJlIGl0XG4gICAgLy8gRklYTUU6IGlzIGl0IGNvcnJlY3QgdG8gdXNlIHRoaXMuY29ubmVjdGlvbi5qaWQgd2hlbiB1c2VkIGluIGEgTVVDP1xuICAgIHZhciBzZXNzID0gbmV3IENvbGlicmlTZXNzaW9uKHRoaXMuY29ubmVjdGlvbi5qaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDEyKSwgLy8gcmFuZG9tIHN0cmluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbik7XG4gICAgc2Vzcy5pbml0aWF0ZShwZWVyKTtcbiAgICBzZXNzLmNvbGlicmkgPSB0aGlzO1xuICAgIC8vIFdlIGRvIG5vdCBhbm5vdW5jZSBvdXIgYXVkaW8gcGVyIGNvbmZlcmVuY2UgcGVlciwgc28gb25seSB2aWRlbyBpcyBzZXQgaGVyZVxuICAgIHNlc3MubG9jYWxWaWRlbyA9IHRoaXMuY29ubmVjdGlvbi5qaW5nbGUubG9jYWxWaWRlbztcbiAgICBzZXNzLm1lZGlhX2NvbnN0cmFpbnRzID0gdGhpcy5jb25uZWN0aW9uLmppbmdsZS5tZWRpYV9jb25zdHJhaW50cztcbiAgICBzZXNzLnBjX2NvbnN0cmFpbnRzID0gdGhpcy5jb25uZWN0aW9uLmppbmdsZS5wY19jb25zdHJhaW50cztcbiAgICBzZXNzLmljZV9jb25maWcgPSB0aGlzLmNvbm5lY3Rpb24uamluZ2xlLmljZV9jb25maWc7XG5cbiAgICB0aGlzLmNvbm5lY3Rpb24uamluZ2xlLnNlc3Npb25zW3Nlc3Muc2lkXSA9IHNlc3M7XG4gICAgdGhpcy5jb25uZWN0aW9uLmppbmdsZS5qaWQyc2Vzc2lvbltzZXNzLnBlZXJqaWRdID0gc2VzcztcblxuICAgIC8vIHNlbmQgYSBzZXNzaW9uLWluaXRpYXRlXG4gICAgdmFyIGluaXQgPSAkaXEoe3RvOiBwZWVyLCB0eXBlOiAnc2V0J30pXG4gICAgICAgIC5jKCdqaW5nbGUnLFxuICAgICAgICAgICAge3htbG5zOiAndXJuOnhtcHA6amluZ2xlOjEnLFxuICAgICAgICAgICAgIGFjdGlvbjogJ3Nlc3Npb24taW5pdGlhdGUnLFxuICAgICAgICAgICAgIGluaXRpYXRvcjogc2Vzcy5tZSxcbiAgICAgICAgICAgICBzaWQ6IHNlc3Muc2lkXG4gICAgICAgICAgICB9XG4gICAgKTtcbiAgICBzZHAudG9KaW5nbGUoaW5pdCwgJ2luaXRpYXRvcicpO1xuICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoaW5pdCxcbiAgICAgICAgZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2dvdCByZXN1bHQnKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2dvdCBlcnJvcicpO1xuICAgICAgICB9XG4gICAgKTtcbn07XG5cbi8vIHB1bGwgaW4gYSBuZXcgcGFydGljaXBhbnQgaW50byB0aGUgY29uZmVyZW5jZVxuQ29saWJyaUZvY3VzLnByb3RvdHlwZS5hZGROZXdQYXJ0aWNpcGFudCA9IGZ1bmN0aW9uIChwZWVyKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICh0aGlzLmNvbmZpZCA9PT0gMCB8fCAhdGhpcy5wZWVyY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uKVxuICAgIHtcbiAgICAgICAgLy8gYmFkIHN0YXRlXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZCA9PT0gMClcbiAgICAgICAge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignY29uZmlkIGRvZXMgbm90IGV4aXN0IHlldCwgcG9zdHBvbmluZycsIHBlZXIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignbG9jYWwgZGVzY3JpcHRpb24gbm90IHJlYWR5IHlldCwgcG9zdHBvbmluZycsIHBlZXIpO1xuICAgICAgICB9XG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHsgc2VsZi5hZGROZXdQYXJ0aWNpcGFudChwZWVyKTsgfSwgMjUwKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgaW5kZXggPSB0aGlzLmNoYW5uZWxzLmxlbmd0aDtcbiAgICB0aGlzLmNoYW5uZWxzLnB1c2goW10pO1xuICAgIHRoaXMucGVlcnMucHVzaChwZWVyKTtcblxuICAgIHZhciBlbGVtID0gJGlxKHt0bzogdGhpcy5icmlkZ2VqaWQsIHR5cGU6ICdnZXQnfSk7XG4gICAgZWxlbS5jKFxuICAgICAgICAnY29uZmVyZW5jZScsXG4gICAgICAgIHsgeG1sbnM6ICdodHRwOi8vaml0c2kub3JnL3Byb3RvY29sL2NvbGlicmknLCBpZDogdGhpcy5jb25maWQgfSk7XG4gICAgdmFyIGxvY2FsU0RQID0gbmV3IFNEUCh0aGlzLnBlZXJjb25uZWN0aW9uLmxvY2FsRGVzY3JpcHRpb24uc2RwKTtcbiAgICBsb2NhbFNEUC5tZWRpYS5mb3JFYWNoKGZ1bmN0aW9uIChtZWRpYSwgY2hhbm5lbCkge1xuICAgICAgICB2YXIgbmFtZSA9IFNEUFV0aWwucGFyc2VfbWlkKFNEUFV0aWwuZmluZF9saW5lKG1lZGlhLCAnYT1taWQ6JykpO1xuICAgICAgICB2YXIgZWxlbU5hbWU7XG4gICAgICAgIHZhciBlbmRwb2ludElkID0gcGVlci5zdWJzdHIoMSArIHBlZXIubGFzdEluZGV4T2YoJy8nKSk7XG4gICAgICAgIHZhciBlbGVtQXR0cnNcbiAgICAgICAgICAgID0ge1xuICAgICAgICAgICAgICAgIGluaXRpYXRvcjogJ3RydWUnLFxuICAgICAgICAgICAgICAgIGV4cGlyZTogc2VsZi5jaGFubmVsRXhwaXJlLFxuICAgICAgICAgICAgICAgIGVuZHBvaW50OiBlbmRwb2ludElkXG4gICAgICAgICAgICB9O1xuICAgICAgICBpZiAoY29uZmlnLnVzZUJ1bmRsZSkge1xuICAgICAgICAgICAgZWxlbUF0dHJzWydjaGFubmVsLWJ1bmRsZS1pZCddID0gZW5kcG9pbnRJZDtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgaWYgKCdkYXRhJyA9PSBuYW1lKVxuICAgICAgICB7XG4gICAgICAgICAgICBlbGVtTmFtZSA9ICdzY3RwY29ubmVjdGlvbic7XG4gICAgICAgICAgICBlbGVtQXR0cnNbJ3BvcnQnXSA9IDUwMDA7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZVxuICAgICAgICB7XG4gICAgICAgICAgICBlbGVtTmFtZSA9ICdjaGFubmVsJztcbiAgICAgICAgICAgIGlmICgoJ3ZpZGVvJyA9PT0gbmFtZSkgJiYgKHNlbGYuY2hhbm5lbExhc3ROID49IDApKVxuICAgICAgICAgICAgICAgIGVsZW1BdHRyc1snbGFzdC1uJ10gPSBzZWxmLmNoYW5uZWxMYXN0TjtcbiAgICAgICAgfVxuXG4gICAgICAgIGVsZW0uYygnY29udGVudCcsIHsgbmFtZTogbmFtZSB9KTtcbiAgICAgICAgZWxlbS5jKGVsZW1OYW1lLCBlbGVtQXR0cnMpO1xuICAgICAgICBlbGVtLnVwKCk7IC8vIGVuZCBvZiBjaGFubmVsL3NjdHBjb25uZWN0aW9uXG4gICAgICAgIGVsZW0udXAoKTsgLy8gZW5kIG9mIGNvbnRlbnRcbiAgICB9KTtcblxuICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoZWxlbSxcbiAgICAgICAgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgdmFyIGNvbnRlbnRzID0gJChyZXN1bHQpLmZpbmQoJz5jb25mZXJlbmNlPmNvbnRlbnQnKS5nZXQoKTtcbiAgICAgICAgICAgIHZhciBpO1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGNvbnRlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNoYW5uZWxYbWwgPSAkKGNvbnRlbnRzW2ldKS5maW5kKCc+Y2hhbm5lbCcpO1xuICAgICAgICAgICAgICAgIGlmIChjaGFubmVsWG1sLmxlbmd0aClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRtcCA9IGNoYW5uZWxYbWwuZ2V0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRtcCA9ICQoY29udGVudHNbaV0pLmZpbmQoJz5zY3RwY29ubmVjdGlvbicpLmdldCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzZWxmLmNoYW5uZWxzW2luZGV4XVtpXSA9IHRtcFswXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBjaGFubmVsQnVuZGxlcyA9ICQocmVzdWx0KS5maW5kKCc+Y29uZmVyZW5jZT5jaGFubmVsLWJ1bmRsZScpO1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGNoYW5uZWxCdW5kbGVzLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHZhciBlbmRwb2ludElkID0gJChjaGFubmVsQnVuZGxlc1tpXSkuYXR0cignaWQnKTtcbiAgICAgICAgICAgICAgICBzZWxmLmJ1bmRsZWRUcmFuc3BvcnRzW2VuZHBvaW50SWRdID0gJChjaGFubmVsQnVuZGxlc1tpXSkuZmluZCgnPnRyYW5zcG9ydFt4bWxucz1cInVybjp4bXBwOmppbmdsZTp0cmFuc3BvcnRzOmljZS11ZHA6MVwiXScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2VsZi5pbml0aWF0ZShwZWVyLCB0cnVlKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oZXJyb3IpO1xuICAgICAgICB9XG4gICAgKTtcbn07XG5cbi8vIHVwZGF0ZSB0aGUgY2hhbm5lbCBkZXNjcmlwdGlvbiAocGF5bG9hZC10eXBlcyArIGR0bHMgZnApIGZvciBhIHBhcnRpY2lwYW50XG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLnVwZGF0ZUNoYW5uZWwgPSBmdW5jdGlvbiAocmVtb3RlU0RQLCBwYXJ0aWNpcGFudCkge1xuICAgIGNvbnNvbGUubG9nKCdjaGFuZ2UgYWxsb2NhdGlvbiBmb3InLCB0aGlzLmNvbmZpZCk7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBjaGFuZ2UgPSAkaXEoe3RvOiB0aGlzLmJyaWRnZWppZCwgdHlwZTogJ3NldCd9KTtcbiAgICBjaGFuZ2UuYygnY29uZmVyZW5jZScsIHt4bWxuczogJ2h0dHA6Ly9qaXRzaS5vcmcvcHJvdG9jb2wvY29saWJyaScsIGlkOiB0aGlzLmNvbmZpZH0pO1xuICAgIGZvciAoY2hhbm5lbCA9IDA7IGNoYW5uZWwgPCB0aGlzLmNoYW5uZWxzW3BhcnRpY2lwYW50XS5sZW5ndGg7IGNoYW5uZWwrKylcbiAgICB7XG4gICAgICAgIGlmICghcmVtb3RlU0RQLm1lZGlhW2NoYW5uZWxdKVxuICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgdmFyIG5hbWUgPSBTRFBVdGlsLnBhcnNlX21pZChTRFBVdGlsLmZpbmRfbGluZShyZW1vdGVTRFAubWVkaWFbY2hhbm5lbF0sICdhPW1pZDonKSk7XG4gICAgICAgIGNoYW5nZS5jKCdjb250ZW50Jywge25hbWU6IG5hbWV9KTtcbiAgICAgICAgaWYgKG5hbWUgIT09ICdkYXRhJylcbiAgICAgICAge1xuICAgICAgICAgICAgY2hhbmdlLmMoJ2NoYW5uZWwnLCB7XG4gICAgICAgICAgICAgICAgaWQ6ICQodGhpcy5jaGFubmVsc1twYXJ0aWNpcGFudF1bY2hhbm5lbF0pLmF0dHIoJ2lkJyksXG4gICAgICAgICAgICAgICAgZW5kcG9pbnQ6ICQodGhpcy5jaGFubmVsc1twYXJ0aWNpcGFudF1bY2hhbm5lbF0pLmF0dHIoJ2VuZHBvaW50JyksXG4gICAgICAgICAgICAgICAgZXhwaXJlOiBzZWxmLmNoYW5uZWxFeHBpcmVcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBzaWduYWwgKHRocm91Z2h0IENPTElCUkkpIHRvIHRoZSBicmlkZ2UgdGhlIFNTUkMgZ3JvdXBzIG9mIHRoaXNcbiAgICAgICAgICAgIC8vIHBhcnRpY2lwYW50XG4gICAgICAgICAgICB2YXIgc3NyY19ncm91cF9saW5lcyA9IFNEUFV0aWwuZmluZF9saW5lcyhyZW1vdGVTRFAubWVkaWFbY2hhbm5lbF0sICdhPXNzcmMtZ3JvdXA6Jyk7XG4gICAgICAgICAgICB2YXIgaWR4ID0gMDtcbiAgICAgICAgICAgIHNzcmNfZ3JvdXBfbGluZXMuZm9yRWFjaChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICAgICAgaWR4ID0gbGluZS5pbmRleE9mKCcgJyk7XG4gICAgICAgICAgICAgICAgdmFyIHNlbWFudGljcyA9IGxpbmUuc3Vic3RyKDAsIGlkeCkuc3Vic3RyKDEzKTtcbiAgICAgICAgICAgICAgICB2YXIgc3NyY3MgPSBsaW5lLnN1YnN0cigxNCArIHNlbWFudGljcy5sZW5ndGgpLnNwbGl0KCcgJyk7XG4gICAgICAgICAgICAgICAgaWYgKHNzcmNzLmxlbmd0aCAhPSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZS5jKCdzc3JjLWdyb3VwJywgeyBzZW1hbnRpY3M6IHNlbWFudGljcywgeG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6c3NtYTowJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3NyY3MuZm9yRWFjaChmdW5jdGlvbihzc3JjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2UuYygnc291cmNlJywgeyBzc3JjOiBzc3JjIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnVwKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBjaGFuZ2UudXAoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdmFyIHJ0cG1hcCA9IFNEUFV0aWwuZmluZF9saW5lcyhyZW1vdGVTRFAubWVkaWFbY2hhbm5lbF0sICdhPXJ0cG1hcDonKTtcbiAgICAgICAgICAgIHJ0cG1hcC5mb3JFYWNoKGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiB0b28gbXVjaCBjb3B5LXBhc3RlXG4gICAgICAgICAgICAgICAgdmFyIHJ0cG1hcCA9IFNEUFV0aWwucGFyc2VfcnRwbWFwKHZhbCk7XG4gICAgICAgICAgICAgICAgY2hhbmdlLmMoJ3BheWxvYWQtdHlwZScsIHJ0cG1hcCk7XG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyBwdXQgYW55ICdhPWZtdHA6JyArIG1saW5lLmZtdFtqXSBsaW5lcyBpbnRvIDxwYXJhbSBuYW1lPWZvbyB2YWx1ZT1iYXIvPlxuICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKHJlbW90ZVNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9Zm10cDonICsgcnRwbWFwLmlkKSkge1xuICAgICAgICAgICAgICAgICAgICB0bXAgPSBTRFBVdGlsLnBhcnNlX2ZtdHAoU0RQVXRpbC5maW5kX2xpbmUocmVtb3RlU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1mbXRwOicgKyBydHBtYXAuaWQpKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCB0bXAubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5nZS5jKCdwYXJhbWV0ZXInLCB0bXBba10pLnVwKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBjaGFuZ2UudXAoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHNjdHBtYXAgPSBTRFBVdGlsLmZpbmRfbGluZShyZW1vdGVTRFAubWVkaWFbY2hhbm5lbF0sICdhPXNjdHBtYXA6Jyk7XG4gICAgICAgICAgICBjaGFuZ2UuYygnc2N0cGNvbm5lY3Rpb24nLCB7XG4gICAgICAgICAgICAgICAgaWQ6ICQodGhpcy5jaGFubmVsc1twYXJ0aWNpcGFudF1bY2hhbm5lbF0pLmF0dHIoJ2lkJyksXG4gICAgICAgICAgICAgICAgZW5kcG9pbnQ6ICQodGhpcy5jaGFubmVsc1twYXJ0aWNpcGFudF1bY2hhbm5lbF0pLmF0dHIoJ2VuZHBvaW50JyksXG4gICAgICAgICAgICAgICAgZXhwaXJlOiBzZWxmLmNoYW5uZWxFeHBpcmUsXG4gICAgICAgICAgICAgICAgcG9ydDogU0RQVXRpbC5wYXJzZV9zY3RwbWFwKHNjdHBtYXApWzBdXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBub3cgYWRkIHRyYW5zcG9ydFxuICAgICAgICByZW1vdGVTRFAuVHJhbnNwb3J0VG9KaW5nbGUoY2hhbm5lbCwgY2hhbmdlKTtcblxuICAgICAgICBjaGFuZ2UudXAoKTsgLy8gZW5kIG9mIGNoYW5uZWwvc2N0cGNvbm5lY3Rpb25cbiAgICAgICAgY2hhbmdlLnVwKCk7IC8vIGVuZCBvZiBjb250ZW50XG4gICAgfVxuICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoY2hhbmdlLFxuICAgICAgICBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZ290IHJlc3VsdCcpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZ290IGVycm9yJyk7XG4gICAgICAgIH1cbiAgICApO1xufTtcblxuLy8gdGVsbCBldmVyeW9uZSBhYm91dCBhIG5ldyBwYXJ0aWNpcGFudHMgYT1zc3JjIGxpbmVzIChpc2FkZCBpcyB0cnVlKVxuLy8gb3IgYSBsZWF2aW5nIHBhcnRpY2lwYW50cyBhPXNzcmMgbGluZXNcbkNvbGlicmlGb2N1cy5wcm90b3R5cGUuc2VuZFNTUkNVcGRhdGUgPSBmdW5jdGlvbiAoc2RwTWVkaWFTc3JjcywgZnJvbUppZCwgaXNhZGQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5wZWVycy5mb3JFYWNoKGZ1bmN0aW9uIChwZWVyamlkKSB7XG4gICAgICAgIGlmIChwZWVyamlkID09IGZyb21KaWQpIHJldHVybjtcbiAgICAgICAgY29uc29sZS5sb2coJ3RlbGwnLCBwZWVyamlkLCAnYWJvdXQgJyArIChpc2FkZCA/ICduZXcnIDogJ3JlbW92ZWQnKSArICcgc3NyY3MgZnJvbScsIGZyb21KaWQpO1xuICAgICAgICBpZiAoIXNlbGYucmVtb3Rlc3NyY1twZWVyamlkXSkge1xuICAgICAgICAgICAgLy8gRklYTUU6IHRoaXMgc2hvdWxkIG9ubHkgc2VuZCB0byBwYXJ0aWNpcGFudHMgdGhhdCBhcmUgc3RhYmxlLCBpLmUuIHdobyBoYXZlIHNlbnQgYSBzZXNzaW9uLWFjY2VwdFxuICAgICAgICAgICAgLy8gcG9zc2libHksIHRoaXMucmVtb3RlU1NSQ1tzZXNzaW9uLnBlZXJqaWRdIGRvZXMgbm90IGV4aXN0IHlldFxuICAgICAgICAgICAgY29uc29sZS53YXJuKCdkbyB3ZSByZWFsbHkgd2FudCB0byBib3RoZXInLCBwZWVyamlkLCAnd2l0aCB1cGRhdGVzIHlldD8nKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcGVlcnNlc3MgPSBzZWxmLmNvbm5lY3Rpb24uamluZ2xlLmppZDJzZXNzaW9uW3BlZXJqaWRdO1xuICAgICAgICBpZighcGVlcnNlc3Mpe1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdubyBzZXNzaW9uIHdpdGggcGVlcjogJytwZWVyamlkKycgeWV0Li4uJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBzZWxmLnNlbmRTU1JDVXBkYXRlSXEoc2RwTWVkaWFTc3JjcywgcGVlcnNlc3Muc2lkLCBwZWVyc2Vzcy5pbml0aWF0b3IsIHBlZXJqaWQsIGlzYWRkKTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogT3ZlcnJpZGVzIFNlc3Npb25CYXNlLmFkZFNvdXJjZS5cbiAqXG4gKiBAcGFyYW0gZWxlbSBwcm9wcmlldGFyeSAnYWRkIHNvdXJjZScgSmluZ2xlIHJlcXVlc3QoWE1MIG5vZGUpLlxuICogQHBhcmFtIGZyb21KaWQgSklEIG9mIHRoZSBwYXJ0aWNpcGFudCB0byB3aG9tIG5ldyBzc3JjcyBiZWxvbmcuXG4gKi9cbkNvbGlicmlGb2N1cy5wcm90b3R5cGUuYWRkU291cmNlID0gZnVuY3Rpb24gKGVsZW0sIGZyb21KaWQpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBGSVhNRTogZGlydHkgd2FpdGluZ1xuICAgIGlmICghdGhpcy5wZWVyY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uKVxuICAgIHtcbiAgICAgICAgY29uc29sZS53YXJuKFwiYWRkU291cmNlIC0gbG9jYWxEZXNjcmlwdGlvbiBub3QgcmVhZHkgeWV0XCIpXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IHNlbGYuYWRkU291cmNlKGVsZW0sIGZyb21KaWQpOyB9LCAyMDApO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5hZGRTb3VyY2UoZWxlbSk7XG5cbiAgICB2YXIgcGVlclNzcmMgPSB0aGlzLnJlbW90ZXNzcmNbZnJvbUppZF07XG4gICAgLy9jb25zb2xlLmxvZyhcIk9uIEFERFwiLCBzZWxmLmFkZHNzcmMsIHBlZXJTc3JjKTtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLmFkZHNzcmMuZm9yRWFjaChmdW5jdGlvbih2YWwsIGlkeCl7XG4gICAgICAgIGlmKCFwZWVyU3NyY1tpZHhdKXtcbiAgICAgICAgICAgIC8vIGFkZCBzc3JjXG4gICAgICAgICAgICBwZWVyU3NyY1tpZHhdID0gdmFsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYocGVlclNzcmNbaWR4XS5pbmRleE9mKHZhbCkgPT0gLTEpe1xuICAgICAgICAgICAgICAgIHBlZXJTc3JjW2lkeF0gPSBwZWVyU3NyY1tpZHhdK3ZhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFyIG9sZFJlbW90ZVNkcCA9IG5ldyBTRFAodGhpcy5wZWVyY29ubmVjdGlvbi5yZW1vdGVEZXNjcmlwdGlvbi5zZHApO1xuICAgIHRoaXMubW9kaWZ5U291cmNlcyhmdW5jdGlvbigpe1xuICAgICAgICAvLyBOb3RpZnkgb3RoZXIgcGFydGljaXBhbnRzIGFib3V0IGFkZGVkIHNzcmNcbiAgICAgICAgdmFyIHJlbW90ZVNEUCA9IG5ldyBTRFAoc2VsZi5wZWVyY29ubmVjdGlvbi5yZW1vdGVEZXNjcmlwdGlvbi5zZHApO1xuICAgICAgICB2YXIgbmV3U1NSQ3MgPSBvbGRSZW1vdGVTZHAuZ2V0TmV3TWVkaWEocmVtb3RlU0RQKTtcbiAgICAgICAgc2VsZi5zZW5kU1NSQ1VwZGF0ZShuZXdTU1JDcywgZnJvbUppZCwgdHJ1ZSk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIE92ZXJyaWRlcyBTZXNzaW9uQmFzZS5yZW1vdmVTb3VyY2UuXG4gKlxuICogQHBhcmFtIGVsZW0gcHJvcHJpZXRhcnkgJ3JlbW92ZSBzb3VyY2UnIEppbmdsZSByZXF1ZXN0KFhNTCBub2RlKS5cbiAqIEBwYXJhbSBmcm9tSmlkIEpJRCBvZiB0aGUgcGFydGljaXBhbnQgdG8gd2hvbSByZW1vdmVkIHNzcmNzIGJlbG9uZy5cbiAqL1xuQ29saWJyaUZvY3VzLnByb3RvdHlwZS5yZW1vdmVTb3VyY2UgPSBmdW5jdGlvbiAoZWxlbSwgZnJvbUppZCkge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIEZJWE1FOiBkaXJ0eSB3YWl0aW5nXG4gICAgaWYgKCFzZWxmLnBlZXJjb25uZWN0aW9uLmxvY2FsRGVzY3JpcHRpb24pXG4gICAge1xuICAgICAgICBjb25zb2xlLndhcm4oXCJyZW1vdmVTb3VyY2UgLSBsb2NhbERlc2NyaXB0aW9uIG5vdCByZWFkeSB5ZXRcIik7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IHNlbGYucmVtb3ZlU291cmNlKGVsZW0sIGZyb21KaWQpOyB9LCAyMDApO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5yZW1vdmVTb3VyY2UoZWxlbSk7XG5cbiAgICB2YXIgcGVlclNzcmMgPSB0aGlzLnJlbW90ZXNzcmNbZnJvbUppZF07XG4gICAgLy9jb25zb2xlLmxvZyhcIk9uIFJFTU9WRVwiLCBzZWxmLnJlbW92ZXNzcmMsIHBlZXJTc3JjKTtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLnJlbW92ZXNzcmMuZm9yRWFjaChmdW5jdGlvbih2YWwsIGlkeCl7XG4gICAgICAgIGlmKHBlZXJTc3JjW2lkeF0pe1xuICAgICAgICAgICAgLy8gUmVtb3ZlIHNzcmNcbiAgICAgICAgICAgIHBlZXJTc3JjW2lkeF0gPSBwZWVyU3NyY1tpZHhdLnJlcGxhY2UodmFsLCAnJyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBvbGRTRFAgPSBuZXcgU0RQKHNlbGYucGVlcmNvbm5lY3Rpb24ucmVtb3RlRGVzY3JpcHRpb24uc2RwKTtcbiAgICB0aGlzLm1vZGlmeVNvdXJjZXMoZnVuY3Rpb24oKXtcbiAgICAgICAgLy8gTm90aWZ5IG90aGVyIHBhcnRpY2lwYW50cyBhYm91dCByZW1vdmVkIHNzcmNcbiAgICAgICAgdmFyIHJlbW90ZVNEUCA9IG5ldyBTRFAoc2VsZi5wZWVyY29ubmVjdGlvbi5yZW1vdGVEZXNjcmlwdGlvbi5zZHApO1xuICAgICAgICB2YXIgcmVtb3ZlZFNTUkNzID0gcmVtb3RlU0RQLmdldE5ld01lZGlhKG9sZFNEUCk7XG4gICAgICAgIHNlbGYuc2VuZFNTUkNVcGRhdGUocmVtb3ZlZFNTUkNzLCBmcm9tSmlkLCBmYWxzZSk7XG4gICAgfSk7XG59O1xuXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLnNldFJlbW90ZURlc2NyaXB0aW9uID0gZnVuY3Rpb24gKHNlc3Npb24sIGVsZW0sIGRlc2N0eXBlKSB7XG4gICAgdmFyIHBhcnRpY2lwYW50ID0gdGhpcy5wZWVycy5pbmRleE9mKHNlc3Npb24ucGVlcmppZCk7XG4gICAgY29uc29sZS5sb2coJ0NvbGlicmkuc2V0UmVtb3RlRGVzY3JpcHRpb24gZnJvbScsIHNlc3Npb24ucGVlcmppZCwgcGFydGljaXBhbnQpO1xuICAgIHZhciByZW1vdGVTRFAgPSBuZXcgU0RQKCcnKTtcbiAgICB2YXIgY2hhbm5lbDtcbiAgICByZW1vdGVTRFAuZnJvbUppbmdsZShlbGVtKTtcblxuICAgIC8vIEFDVCAxOiBjaGFuZ2UgYWxsb2NhdGlvbiBvbiBicmlkZ2VcbiAgICB0aGlzLnVwZGF0ZUNoYW5uZWwocmVtb3RlU0RQLCBwYXJ0aWNpcGFudCk7XG5cbiAgICAvLyBBQ1QgMjogdGVsbCBhbnlvbmUgZWxzZSBhYm91dCB0aGUgbmV3IFNTUkNzXG4gICAgdGhpcy5zZW5kU1NSQ1VwZGF0ZShyZW1vdGVTRFAuZ2V0TWVkaWFTc3JjTWFwKCksIHNlc3Npb24ucGVlcmppZCwgdHJ1ZSk7XG5cbiAgICAvLyBBQ1QgMzogbm90ZSB0aGUgU1NSQ3NcbiAgICB0aGlzLnJlbW90ZXNzcmNbc2Vzc2lvbi5wZWVyamlkXSA9IFtdO1xuICAgIGZvciAoY2hhbm5lbCA9IDA7IGNoYW5uZWwgPCB0aGlzLmNoYW5uZWxzW3BhcnRpY2lwYW50XS5sZW5ndGg7IGNoYW5uZWwrKykge1xuICAgICAgICAvL2lmIChjaGFubmVsID09IDApIGNvbnRpbnVlOyBGSVhNRTogZG9lcyBub3Qgd29yayBhcyBpbnRlbmRlZFxuICAgICAgICBpZiAoIXJlbW90ZVNEUC5tZWRpYVtjaGFubmVsXSlcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgIHZhciBsaW5lcyA9IFNEUFV0aWwuZmluZF9saW5lcyhyZW1vdGVTRFAubWVkaWFbY2hhbm5lbF0sICdhPXNzcmMtZ3JvdXA6Jyk7XG4gICAgICAgIGlmIChsaW5lcy5sZW5ndGggIT0gMClcbiAgICAgICAgICAgIC8vIHByZXBlbmQgc3NyYy1ncm91cHNcbiAgICAgICAgICAgIHRoaXMucmVtb3Rlc3NyY1tzZXNzaW9uLnBlZXJqaWRdW2NoYW5uZWxdID0gbGluZXMuam9pbignXFxyXFxuJykgKyAnXFxyXFxuJztcblxuICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmVzKHJlbW90ZVNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9c3NyYzonKS5sZW5ndGgpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5yZW1vdGVzc3JjW3Nlc3Npb24ucGVlcmppZF1bY2hhbm5lbF0pXG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdGVzc3JjW3Nlc3Npb24ucGVlcmppZF1bY2hhbm5lbF0gPSAnJztcblxuICAgICAgICAgICAgdGhpcy5yZW1vdGVzc3JjW3Nlc3Npb24ucGVlcmppZF1bY2hhbm5lbF0gKz1cbiAgICAgICAgICAgICAgICBTRFBVdGlsLmZpbmRfbGluZXMocmVtb3RlU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1zc3JjOicpXG4gICAgICAgICAgICAgICAgICAgICAgICAuam9pbignXFxyXFxuJykgKyAnXFxyXFxuJztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFDVCA0OiBhZGQgbmV3IGE9c3NyYyBhbmQgcz1zc3JjLWdyb3VwIGxpbmVzIHRvIGxvY2FsIHJlbW90ZWRlc2NyaXB0aW9uXG4gICAgZm9yIChjaGFubmVsID0gMDsgY2hhbm5lbCA8IHRoaXMuY2hhbm5lbHNbcGFydGljaXBhbnRdLmxlbmd0aDsgY2hhbm5lbCsrKSB7XG4gICAgICAgIC8vaWYgKGNoYW5uZWwgPT0gMCkgY29udGludWU7IEZJWE1FOiBkb2VzIG5vdCB3b3JrIGFzIGludGVuZGVkXG4gICAgICAgIGlmICghcmVtb3RlU0RQLm1lZGlhW2NoYW5uZWxdKVxuICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgdmFyIGxpbmVzID0gU0RQVXRpbC5maW5kX2xpbmVzKHJlbW90ZVNEUC5tZWRpYVtjaGFubmVsXSwgJ2E9c3NyYy1ncm91cDonKTtcbiAgICAgICAgaWYgKGxpbmVzLmxlbmd0aCAhPSAwKVxuICAgICAgICAgICAgdGhpcy5wZWVyY29ubmVjdGlvbi5lbnF1ZXVlQWRkU3NyYyhcbiAgICAgICAgICAgICAgICBjaGFubmVsLCBTRFBVdGlsLmZpbmRfbGluZXMocmVtb3RlU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1zc3JjLWdyb3VwOicpLmpvaW4oJ1xcclxcbicpICsgJ1xcclxcbicpO1xuXG4gICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZXMocmVtb3RlU0RQLm1lZGlhW2NoYW5uZWxdLCAnYT1zc3JjOicpLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5wZWVyY29ubmVjdGlvbi5lbnF1ZXVlQWRkU3NyYyhcbiAgICAgICAgICAgICAgICBjaGFubmVsLFxuICAgICAgICAgICAgICAgIFNEUFV0aWwuZmluZF9saW5lcyhyZW1vdGVTRFAubWVkaWFbY2hhbm5lbF0sICdhPXNzcmM6Jykuam9pbignXFxyXFxuJykgKyAnXFxyXFxuJ1xuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLm1vZGlmeVNvdXJjZXMoKTtcbn07XG5cbi8vIHJlbGF5IGljZSBjYW5kaWRhdGVzIHRvIGJyaWRnZSB1c2luZyB0cmlja2xlXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLmFkZEljZUNhbmRpZGF0ZSA9IGZ1bmN0aW9uIChzZXNzaW9uLCBlbGVtKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBwYXJ0aWNpcGFudCA9IHRoaXMucGVlcnMuaW5kZXhPZihzZXNzaW9uLnBlZXJqaWQpO1xuICAgIC8vY29uc29sZS5sb2coJ2NoYW5nZSB0cmFuc3BvcnQgYWxsb2NhdGlvbiBmb3InLCB0aGlzLmNvbmZpZCwgc2Vzc2lvbi5wZWVyamlkLCBwYXJ0aWNpcGFudCk7XG4gICAgdmFyIGNoYW5nZSA9ICRpcSh7dG86IHRoaXMuYnJpZGdlamlkLCB0eXBlOiAnc2V0J30pO1xuICAgIGNoYW5nZS5jKCdjb25mZXJlbmNlJywge3htbG5zOiAnaHR0cDovL2ppdHNpLm9yZy9wcm90b2NvbC9jb2xpYnJpJywgaWQ6IHRoaXMuY29uZmlkfSk7XG4gICAgJChlbGVtKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5hbWUgPSAkKHRoaXMpLmF0dHIoJ25hbWUnKTtcblxuICAgICAgICAvLyBJZiB3ZSBhcmUgdXNpbmcgYnVuZGxlLCBhdWRpby92aWRlby9kYXRhIGNoYW5uZWwgd2lsbCBoYXZlIHRoZSBzYW1lIGNhbmRpZGF0ZXMsIHNvIG9ubHkgc2VuZCB0aGVtIGZvclxuICAgICAgICAvLyB0aGUgYXVkaW8gY2hhbm5lbC5cbiAgICAgICAgaWYgKGNvbmZpZy51c2VCdW5kbGUgJiYgbmFtZSAhPT0gJ2F1ZGlvJykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNoYW5uZWwgPSBuYW1lID09ICdhdWRpbycgPyAwIDogMTsgLy8gRklYTUU6IHNlYXJjaCBtbGluZWluZGV4IGluIGxvY2FsZGVzY1xuICAgICAgICBpZiAobmFtZSAhPSAnYXVkaW8nICYmIG5hbWUgIT0gJ3ZpZGVvJylcbiAgICAgICAgICAgIGNoYW5uZWwgPSAyOyAvLyBuYW1lID09ICdkYXRhJ1xuXG4gICAgICAgIGNoYW5nZS5jKCdjb250ZW50Jywge25hbWU6IG5hbWV9KTtcbiAgICAgICAgaWYgKG5hbWUgIT09ICdkYXRhJylcbiAgICAgICAge1xuICAgICAgICAgICAgY2hhbmdlLmMoJ2NoYW5uZWwnLCB7XG4gICAgICAgICAgICAgICAgaWQ6ICQoc2VsZi5jaGFubmVsc1twYXJ0aWNpcGFudF1bY2hhbm5lbF0pLmF0dHIoJ2lkJyksXG4gICAgICAgICAgICAgICAgZW5kcG9pbnQ6ICQoc2VsZi5jaGFubmVsc1twYXJ0aWNpcGFudF1bY2hhbm5lbF0pLmF0dHIoJ2VuZHBvaW50JyksXG4gICAgICAgICAgICAgICAgZXhwaXJlOiBzZWxmLmNoYW5uZWxFeHBpcmVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAge1xuICAgICAgICAgICAgY2hhbmdlLmMoJ3NjdHBjb25uZWN0aW9uJywge1xuICAgICAgICAgICAgICAgIGlkOiAkKHNlbGYuY2hhbm5lbHNbcGFydGljaXBhbnRdW2NoYW5uZWxdKS5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgICAgIGVuZHBvaW50OiAkKHNlbGYuY2hhbm5lbHNbcGFydGljaXBhbnRdW2NoYW5uZWxdKS5hdHRyKCdlbmRwb2ludCcpLFxuICAgICAgICAgICAgICAgIGV4cGlyZTogc2VsZi5jaGFubmVsRXhwaXJlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAkKHRoaXMpLmZpbmQoJz50cmFuc3BvcnQnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNoYW5nZS5jKCd0cmFuc3BvcnQnLCB7XG4gICAgICAgICAgICAgICAgdWZyYWc6ICQodGhpcykuYXR0cigndWZyYWcnKSxcbiAgICAgICAgICAgICAgICBwd2Q6ICQodGhpcykuYXR0cigncHdkJyksXG4gICAgICAgICAgICAgICAgeG1sbnM6ICQodGhpcykuYXR0cigneG1sbnMnKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoY29uZmlnLnVzZVJ0Y3BNdXhcbiAgICAgICAgICAgICAgICAgICYmICdjaGFubmVsJyA9PT0gY2hhbmdlLm5vZGUucGFyZW50Tm9kZS5ub2RlTmFtZSkge1xuICAgICAgICAgICAgICAgIGNoYW5nZS5jKCdydGNwLW11eCcpLnVwKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICQodGhpcykuZmluZCgnPmNhbmRpZGF0ZScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8qIG5vdCB5ZXRcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5nZXRBdHRyaWJ1dGUoJ3Byb3RvY29sJykgPT0gJ3RjcCcgJiYgdGhpcy5nZXRBdHRyaWJ1dGUoJ3BvcnQnKSA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNocm9tZSBnZW5lcmF0ZXMgVENQIGNhbmRpZGF0ZXMgd2l0aCBwb3J0IDBcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHZhciBsaW5lID0gU0RQVXRpbC5jYW5kaWRhdGVGcm9tSmluZ2xlKHRoaXMpO1xuICAgICAgICAgICAgICAgIGNoYW5nZS5jKCdjYW5kaWRhdGUnLCBTRFBVdGlsLmNhbmRpZGF0ZVRvSmluZ2xlKGxpbmUpKS51cCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjaGFuZ2UudXAoKTsgLy8gZW5kIG9mIHRyYW5zcG9ydFxuICAgICAgICB9KTtcbiAgICAgICAgY2hhbmdlLnVwKCk7IC8vIGVuZCBvZiBjaGFubmVsL3NjdHBjb25uZWN0aW9uXG4gICAgICAgIGNoYW5nZS51cCgpOyAvLyBlbmQgb2YgY29udGVudFxuICAgIH0pO1xuICAgIC8vIEZJWE1FOiBuZWVkIHRvIGNoZWNrIGlmIHRoZXJlIGlzIGF0IGxlYXN0IG9uZSBjYW5kaWRhdGUgd2hlbiBmaWx0ZXJpbmcgVENQIG9uZXNcbiAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKGNoYW5nZSxcbiAgICAgICAgZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2dvdCByZXN1bHQnKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignZ290IGVycm9yJywgZXJyKTtcbiAgICAgICAgfVxuICAgICk7XG59O1xuXG4vLyBzZW5kIG91ciBvd24gY2FuZGlkYXRlIHRvIHRoZSBicmlkZ2VcbkNvbGlicmlGb2N1cy5wcm90b3R5cGUuc2VuZEljZUNhbmRpZGF0ZSA9IGZ1bmN0aW9uIChjYW5kaWRhdGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy9jb25zb2xlLmxvZygnY2FuZGlkYXRlJywgY2FuZGlkYXRlKTtcbiAgICBpZiAoIWNhbmRpZGF0ZSkge1xuICAgICAgICBjb25zb2xlLmxvZygnZW5kIG9mIGNhbmRpZGF0ZXMnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAodGhpcy5kcmlwX2NvbnRhaW5lci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8gc3RhcnQgMjBtcyBjYWxsb3V0XG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChzZWxmLmRyaXBfY29udGFpbmVyLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHNlbGYuc2VuZEljZUNhbmRpZGF0ZXMoc2VsZi5kcmlwX2NvbnRhaW5lcik7XG4gICAgICAgICAgICAgICAgc2VsZi5kcmlwX2NvbnRhaW5lciA9IFtdO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIDIwKTtcbiAgICB9XG4gICAgdGhpcy5kcmlwX2NvbnRhaW5lci5wdXNoKGNhbmRpZGF0ZSk7XG59O1xuXG4vLyBzb3J0IGFuZCBzZW5kIG11bHRpcGxlIGNhbmRpZGF0ZXNcbkNvbGlicmlGb2N1cy5wcm90b3R5cGUuc2VuZEljZUNhbmRpZGF0ZXMgPSBmdW5jdGlvbiAoY2FuZGlkYXRlcykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbXljYW5kcyA9ICRpcSh7dG86IHRoaXMuYnJpZGdlamlkLCB0eXBlOiAnc2V0J30pO1xuICAgIG15Y2FuZHMuYygnY29uZmVyZW5jZScsIHt4bWxuczogJ2h0dHA6Ly9qaXRzaS5vcmcvcHJvdG9jb2wvY29saWJyaScsIGlkOiB0aGlzLmNvbmZpZH0pO1xuICAgIC8vIEZJWE1FOiBtdWx0aS1jYW5kaWRhdGUgbG9naWMgaXMgdGFrZW4gZnJvbSBzdHJvcGhlLmppbmdsZSwgc2hvdWxkIGJlIHJlZmFjdG9yZWQgdGhlcmVcbiAgICB2YXIgbG9jYWxTRFAgPSBuZXcgU0RQKHRoaXMucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbi5zZHApO1xuICAgIGZvciAodmFyIG1pZCA9IDA7IG1pZCA8IGxvY2FsU0RQLm1lZGlhLmxlbmd0aDsgbWlkKyspXG4gICAge1xuICAgICAgICB2YXIgY2FuZHMgPSBjYW5kaWRhdGVzLmZpbHRlcihmdW5jdGlvbiAoZWwpIHsgcmV0dXJuIGVsLnNkcE1MaW5lSW5kZXggPT0gbWlkOyB9KTtcbiAgICAgICAgaWYgKGNhbmRzLmxlbmd0aCA+IDApXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBuYW1lID0gY2FuZHNbMF0uc2RwTWlkO1xuICAgICAgICAgICAgbXljYW5kcy5jKCdjb250ZW50Jywge25hbWU6IG5hbWUgfSk7XG4gICAgICAgICAgICBpZiAobmFtZSAhPT0gJ2RhdGEnKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG15Y2FuZHMuYygnY2hhbm5lbCcsIHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6ICQodGhpcy5teWNoYW5uZWxbY2FuZHNbMF0uc2RwTUxpbmVJbmRleF0pLmF0dHIoJ2lkJyksXG4gICAgICAgICAgICAgICAgICAgIGVuZHBvaW50OiAkKHRoaXMubXljaGFubmVsW2NhbmRzWzBdLnNkcE1MaW5lSW5kZXhdKS5hdHRyKCdlbmRwb2ludCcpLFxuICAgICAgICAgICAgICAgICAgICBleHBpcmU6IHNlbGYuY2hhbm5lbEV4cGlyZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG15Y2FuZHMuYygnc2N0cGNvbm5lY3Rpb24nLCB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiAkKHRoaXMubXljaGFubmVsW2NhbmRzWzBdLnNkcE1MaW5lSW5kZXhdKS5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgICAgICAgICBlbmRwb2ludDogJCh0aGlzLm15Y2hhbm5lbFtjYW5kc1swXS5zZHBNTGluZUluZGV4XSkuYXR0cignZW5kcG9pbnQnKSxcbiAgICAgICAgICAgICAgICAgICAgcG9ydDogJCh0aGlzLm15Y2hhbm5lbFtjYW5kc1swXS5zZHBNTGluZUluZGV4XSkuYXR0cigncG9ydCcpLFxuICAgICAgICAgICAgICAgICAgICBleHBpcmU6IHNlbGYuY2hhbm5lbEV4cGlyZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbXljYW5kcy5jKCd0cmFuc3BvcnQnLCB7eG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6dHJhbnNwb3J0czppY2UtdWRwOjEnfSk7XG4gICAgICAgICAgICBpZiAoY29uZmlnLnVzZVJ0Y3BNdXggJiYgbmFtZSAhPT0gJ2RhdGEnKSB7XG4gICAgICAgICAgICAgICAgbXljYW5kcy5jKCdydGNwLW11eCcpLnVwKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNhbmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbXljYW5kcy5jKCdjYW5kaWRhdGUnLCBTRFBVdGlsLmNhbmRpZGF0ZVRvSmluZ2xlKGNhbmRzW2ldLmNhbmRpZGF0ZSkpLnVwKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBteWNhbmRzLnVwKCk7IC8vIHRyYW5zcG9ydFxuICAgICAgICAgICAgbXljYW5kcy51cCgpOyAvLyBjaGFubmVsIC8gc2N0cGNvbm5lY3Rpb25cbiAgICAgICAgICAgIG15Y2FuZHMudXAoKTsgLy8gY29udGVudFxuICAgICAgICB9XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCdzZW5kIGNhbmRzJywgY2FuZGlkYXRlcyk7XG4gICAgdGhpcy5jb25uZWN0aW9uLnNlbmRJUShteWNhbmRzLFxuICAgICAgICBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZ290IHJlc3VsdCcpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdnb3QgZXJyb3InLCBlcnIpO1xuICAgICAgICB9XG4gICAgKTtcbn07XG5cbkNvbGlicmlGb2N1cy5wcm90b3R5cGUudGVybWluYXRlID0gZnVuY3Rpb24gKHNlc3Npb24sIHJlYXNvbikge1xuICAgIGNvbnNvbGUubG9nKCdyZW1vdGUgc2Vzc2lvbiB0ZXJtaW5hdGVkIGZyb20nLCBzZXNzaW9uLnBlZXJqaWQpO1xuICAgIHZhciBwYXJ0aWNpcGFudCA9IHRoaXMucGVlcnMuaW5kZXhPZihzZXNzaW9uLnBlZXJqaWQpO1xuICAgIGlmICghdGhpcy5yZW1vdGVzc3JjW3Nlc3Npb24ucGVlcmppZF0gfHwgcGFydGljaXBhbnQgPT0gLTEpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgc3NyY3MgPSB0aGlzLnJlbW90ZXNzcmNbc2Vzc2lvbi5wZWVyamlkXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNzcmNzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uZW5xdWV1ZVJlbW92ZVNzcmMoaSwgc3NyY3NbaV0pO1xuICAgIH1cbiAgICAvLyByZW1vdmUgZnJvbSB0aGlzLnBlZXJzXG4gICAgdGhpcy5wZWVycy5zcGxpY2UocGFydGljaXBhbnQsIDEpO1xuICAgIC8vIGV4cGlyZSBjaGFubmVsIG9uIGJyaWRnZVxuICAgIHZhciBjaGFuZ2UgPSAkaXEoe3RvOiB0aGlzLmJyaWRnZWppZCwgdHlwZTogJ3NldCd9KTtcbiAgICBjaGFuZ2UuYygnY29uZmVyZW5jZScsIHt4bWxuczogJ2h0dHA6Ly9qaXRzaS5vcmcvcHJvdG9jb2wvY29saWJyaScsIGlkOiB0aGlzLmNvbmZpZH0pO1xuICAgIGZvciAodmFyIGNoYW5uZWwgPSAwOyBjaGFubmVsIDwgdGhpcy5jaGFubmVsc1twYXJ0aWNpcGFudF0ubGVuZ3RoOyBjaGFubmVsKyspIHtcbiAgICAgICAgdmFyIG5hbWUgPSBjaGFubmVsID09PSAwID8gJ2F1ZGlvJyA6ICd2aWRlbyc7XG4gICAgICAgIGlmIChjaGFubmVsID09IDIpXG4gICAgICAgICAgICBuYW1lID0gJ2RhdGEnO1xuICAgICAgICBjaGFuZ2UuYygnY29udGVudCcsIHtuYW1lOiBuYW1lfSk7XG4gICAgICAgIGlmIChuYW1lICE9PSAnZGF0YScpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNoYW5nZS5jKCdjaGFubmVsJywge1xuICAgICAgICAgICAgICAgIGlkOiAkKHRoaXMuY2hhbm5lbHNbcGFydGljaXBhbnRdW2NoYW5uZWxdKS5hdHRyKCdpZCcpLFxuICAgICAgICAgICAgICAgIGVuZHBvaW50OiAkKHRoaXMuY2hhbm5lbHNbcGFydGljaXBhbnRdW2NoYW5uZWxdKS5hdHRyKCdlbmRwb2ludCcpLFxuICAgICAgICAgICAgICAgIGV4cGlyZTogJzAnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNoYW5nZS5jKCdzY3RwY29ubmVjdGlvbicsIHtcbiAgICAgICAgICAgICAgICBpZDogJCh0aGlzLmNoYW5uZWxzW3BhcnRpY2lwYW50XVtjaGFubmVsXSkuYXR0cignaWQnKSxcbiAgICAgICAgICAgICAgICBlbmRwb2ludDogJCh0aGlzLmNoYW5uZWxzW3BhcnRpY2lwYW50XVtjaGFubmVsXSkuYXR0cignZW5kcG9pbnQnKSxcbiAgICAgICAgICAgICAgICBleHBpcmU6ICcwJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgY2hhbmdlLnVwKCk7IC8vIGVuZCBvZiBjaGFubmVsL3NjdHBjb25uZWN0aW9uXG4gICAgICAgIGNoYW5nZS51cCgpOyAvLyBlbmQgb2YgY29udGVudFxuICAgIH1cbiAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKGNoYW5nZSxcbiAgICAgICAgZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2dvdCByZXN1bHQnKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignZ290IGVycm9yJywgZXJyKTtcbiAgICAgICAgfVxuICAgICk7XG4gICAgLy8gYW5kIHJlbW92ZSBmcm9tIGNoYW5uZWxzXG4gICAgdGhpcy5jaGFubmVscy5zcGxpY2UocGFydGljaXBhbnQsIDEpO1xuXG4gICAgLy8gdGVsbCBldmVyeW9uZSBhYm91dCB0aGUgc3NyY3MgdG8gYmUgcmVtb3ZlZFxuICAgIHZhciBzZHAgPSBuZXcgU0RQKCcnKTtcbiAgICB2YXIgbG9jYWxTRFAgPSBuZXcgU0RQKHRoaXMucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbi5zZHApO1xuICAgIHZhciBjb250ZW50cyA9IFNEUFV0aWwuZmluZF9saW5lcyhsb2NhbFNEUC5yYXcsICdhPW1pZDonKS5tYXAoU0RQVXRpbC5wYXJzZV9taWQpO1xuICAgIGZvciAodmFyIGogPSAwOyBqIDwgc3NyY3MubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgc2RwLm1lZGlhW2pdID0gJ2E9bWlkOicgKyBjb250ZW50c1tqXSArICdcXHJcXG4nO1xuICAgICAgICBzZHAubWVkaWFbal0gKz0gc3NyY3Nbal07XG4gICAgICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uZW5xdWV1ZVJlbW92ZVNzcmMoaiwgc3NyY3Nbal0pO1xuICAgIH1cbiAgICB0aGlzLnNlbmRTU1JDVXBkYXRlKHNkcC5nZXRNZWRpYVNzcmNNYXAoKSwgc2Vzc2lvbi5wZWVyamlkLCBmYWxzZSk7XG5cbiAgICBkZWxldGUgdGhpcy5yZW1vdGVzc3JjW3Nlc3Npb24ucGVlcmppZF07XG4gICAgdGhpcy5tb2RpZnlTb3VyY2VzKCk7XG59O1xuXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLnNlbmRUZXJtaW5hdGUgPSBmdW5jdGlvbiAoc2Vzc2lvbiwgcmVhc29uLCB0ZXh0KSB7XG4gICAgdmFyIHRlcm0gPSAkaXEoe3RvOiBzZXNzaW9uLnBlZXJqaWQsIHR5cGU6ICdzZXQnfSlcbiAgICAgICAgLmMoJ2ppbmdsZScsXG4gICAgICAgICAgICB7eG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6MScsXG4gICAgICAgICAgICBhY3Rpb246ICdzZXNzaW9uLXRlcm1pbmF0ZScsXG4gICAgICAgICAgICBpbml0aWF0b3I6IHNlc3Npb24ubWUsXG4gICAgICAgICAgICBzaWQ6IHNlc3Npb24uc2lkfSlcbiAgICAgICAgLmMoJ3JlYXNvbicpXG4gICAgICAgIC5jKHJlYXNvbiB8fCAnc3VjY2VzcycpO1xuXG4gICAgaWYgKHRleHQpIHtcbiAgICAgICAgdGVybS51cCgpLmMoJ3RleHQnKS50KHRleHQpO1xuICAgIH1cblxuICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEodGVybSxcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKCFzZXNzaW9uKVxuICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgaWYgKHNlc3Npb24ucGVlcmNvbm5lY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLnBlZXJjb25uZWN0aW9uLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5wZWVyY29ubmVjdGlvbiA9IG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNlc3Npb24udGVybWluYXRlKCk7XG4gICAgICAgICAgICB2YXIgYWNrID0ge307XG4gICAgICAgICAgICBhY2suc291cmNlID0gJ3Rlcm1pbmF0ZSc7XG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdhY2suamluZ2xlJywgW3Nlc3Npb24uc2lkLCBhY2tdKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHN0YW56YSkge1xuICAgICAgICAgICAgdmFyIGVycm9yID0gKCQoc3RhbnphKS5maW5kKCdlcnJvcicpLmxlbmd0aCkgPyB7XG4gICAgICAgICAgICAgICAgY29kZTogJChzdGFuemEpLmZpbmQoJ2Vycm9yJykuYXR0cignY29kZScpLFxuICAgICAgICAgICAgICAgIHJlYXNvbjogJChzdGFuemEpLmZpbmQoJ2Vycm9yIDpmaXJzdCcpWzBdLnRhZ05hbWVcbiAgICAgICAgICAgIH06e307XG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdhY2suamluZ2xlJywgW3NlbGYuc2lkLCBlcnJvcl0pO1xuICAgICAgICB9LFxuICAgICAgICAxMDAwMCk7XG4gICAgaWYgKHRoaXMuc3RhdHNpbnRlcnZhbCAhPT0gbnVsbCkge1xuICAgICAgICB3aW5kb3cuY2xlYXJJbnRlcnZhbCh0aGlzLnN0YXRzaW50ZXJ2YWwpO1xuICAgICAgICB0aGlzLnN0YXRzaW50ZXJ2YWwgPSBudWxsO1xuICAgIH1cbn07XG5cbkNvbGlicmlGb2N1cy5wcm90b3R5cGUuc2V0UlRDUFRlcm1pbmF0aW9uU3RyYXRlZ3kgPSBmdW5jdGlvbiAoc3RyYXRlZ3lGUU4pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBUT0RPKGdwKSBtYXliZSBtb3ZlIHRoZSBSVENQIHRlcm1pbmF0aW9uIHN0cmF0ZWd5IGVsZW1lbnQgdW5kZXIgdGhlXG4gICAgLy8gY29udGVudCBvciBjaGFubmVsIGVsZW1lbnQuXG4gICAgdmFyIHN0cmF0ZWd5SVEgPSAkaXEoe3RvOiB0aGlzLmJyaWRnZWppZCwgdHlwZTogJ3NldCd9KTtcbiAgICBzdHJhdGVneUlRLmMoJ2NvbmZlcmVuY2UnLCB7XG5cdCAgICB4bWxuczogJ2h0dHA6Ly9qaXRzaS5vcmcvcHJvdG9jb2wvY29saWJyaScsXG5cdCAgICBpZDogdGhpcy5jb25maWRcbiAgICB9KTtcblxuICAgIHN0cmF0ZWd5SVEuYygncnRjcC10ZXJtaW5hdGlvbi1zdHJhdGVneScsIHtuYW1lOiBzdHJhdGVneUZRTiB9KTtcblxuICAgIHN0cmF0ZWd5SVEuYygnY29udGVudCcsIHtuYW1lOiBcInZpZGVvXCJ9KTtcbiAgICBzdHJhdGVneUlRLnVwKCk7IC8vIGVuZCBvZiBjb250ZW50XG5cbiAgICBjb25zb2xlLmxvZygnc2V0dGluZyBSVENQIHRlcm1pbmF0aW9uIHN0cmF0ZWd5Jywgc3RyYXRlZ3lGUU4pO1xuICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoc3RyYXRlZ3lJUSxcbiAgICAgICAgZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2dvdCByZXN1bHQnKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignZ290IGVycm9yJywgZXJyKTtcbiAgICAgICAgfVxuICAgICk7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIGRlZmF1bHQgdmFsdWUgb2YgdGhlIGNoYW5uZWwgbGFzdC1uIGF0dHJpYnV0ZSBpbiB0aGlzIGNvbmZlcmVuY2UgYW5kXG4gKiB1cGRhdGVzL3BhdGNoZXMgdGhlIGV4aXN0aW5nIGNoYW5uZWxzLlxuICovXG5Db2xpYnJpRm9jdXMucHJvdG90eXBlLnNldENoYW5uZWxMYXN0TiA9IGZ1bmN0aW9uIChjaGFubmVsTGFzdE4pIHtcbiAgICBpZiAoKCdudW1iZXInID09PSB0eXBlb2YoY2hhbm5lbExhc3ROKSlcbiAgICAgICAgICAgICYmICh0aGlzLmNoYW5uZWxMYXN0TiAhPT0gY2hhbm5lbExhc3ROKSlcbiAgICB7XG4gICAgICAgIHRoaXMuY2hhbm5lbExhc3ROID0gY2hhbm5lbExhc3ROO1xuXG4gICAgICAgIC8vIFVwZGF0ZS9wYXRjaCB0aGUgZXhpc3RpbmcgY2hhbm5lbHMuXG4gICAgICAgIHZhciBwYXRjaCA9ICRpcSh7IHRvOiB0aGlzLmJyaWRnZWppZCwgdHlwZTogJ3NldCcgfSk7XG5cbiAgICAgICAgcGF0Y2guYyhcbiAgICAgICAgICAgICdjb25mZXJlbmNlJyxcbiAgICAgICAgICAgIHsgeG1sbnM6ICdodHRwOi8vaml0c2kub3JnL3Byb3RvY29sL2NvbGlicmknLCBpZDogdGhpcy5jb25maWQgfSk7XG4gICAgICAgIHBhdGNoLmMoJ2NvbnRlbnQnLCB7IG5hbWU6ICd2aWRlbycgfSk7XG4gICAgICAgIHBhdGNoLmMoXG4gICAgICAgICAgICAnY2hhbm5lbCcsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWQ6ICQodGhpcy5teWNoYW5uZWxbMSAvKiB2aWRlbyAqL10pLmF0dHIoJ2lkJyksXG4gICAgICAgICAgICAgICAgJ2xhc3Qtbic6IHRoaXMuY2hhbm5lbExhc3ROXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgcGF0Y2gudXAoKTsgLy8gZW5kIG9mIGNoYW5uZWxcbiAgICAgICAgZm9yICh2YXIgcCA9IDA7IHAgPCB0aGlzLmNoYW5uZWxzLmxlbmd0aDsgcCsrKVxuICAgICAgICB7XG4gICAgICAgICAgICBwYXRjaC5jKFxuICAgICAgICAgICAgICAgICdjaGFubmVsJyxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiAkKHRoaXMuY2hhbm5lbHNbcF1bMSAvKiB2aWRlbyAqL10pLmF0dHIoJ2lkJyksXG4gICAgICAgICAgICAgICAgICAgICdsYXN0LW4nOiB0aGlzLmNoYW5uZWxMYXN0TlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcGF0Y2gudXAoKTsgLy8gZW5kIG9mIGNoYW5uZWxcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKFxuICAgICAgICAgICAgcGF0Y2gsXG4gICAgICAgICAgICBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKCdTZXQgY2hhbm5lbCBsYXN0LW4gc3VjY2VlZGVkOicsIHJlcyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NldCBjaGFubmVsIGxhc3QtbiBmYWlsZWQ6JywgZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogU2V0cyB0aGUgZGVmYXVsdCB2YWx1ZSBvZiB0aGUgY2hhbm5lbCBzaW11bGNhc3QgbGF5ZXIgYXR0cmlidXRlIGluIHRoaXNcbiAqIGNvbmZlcmVuY2UgYW5kIHVwZGF0ZXMvcGF0Y2hlcyB0aGUgZXhpc3RpbmcgY2hhbm5lbHMuXG4gKi9cbkNvbGlicmlGb2N1cy5wcm90b3R5cGUuc2V0UmVjZWl2ZVNpbXVsY2FzdExheWVyID0gZnVuY3Rpb24gKHJlY2VpdmVTaW11bGNhc3RMYXllcikge1xuICAgIGlmICgoJ251bWJlcicgPT09IHR5cGVvZihyZWNlaXZlU2ltdWxjYXN0TGF5ZXIpKVxuICAgICAgICAmJiAodGhpcy5yZWNlaXZlU2ltdWxjYXN0TGF5ZXIgIT09IHJlY2VpdmVTaW11bGNhc3RMYXllcikpXG4gICAge1xuICAgICAgICAvLyBUT0RPKGdwKSBiZSBhYmxlIHRvIHNldCB0aGUgcmVjZWl2aW5nIHNpbXVsY2FzdCBsYXllciBvbiBhIHBlclxuICAgICAgICAvLyBzZW5kZXIgYmFzaXMuXG4gICAgICAgIHRoaXMucmVjZWl2ZVNpbXVsY2FzdExheWVyID0gcmVjZWl2ZVNpbXVsY2FzdExheWVyO1xuXG4gICAgICAgIC8vIFVwZGF0ZS9wYXRjaCB0aGUgZXhpc3RpbmcgY2hhbm5lbHMuXG4gICAgICAgIHZhciBwYXRjaCA9ICRpcSh7IHRvOiB0aGlzLmJyaWRnZWppZCwgdHlwZTogJ3NldCcgfSk7XG5cbiAgICAgICAgcGF0Y2guYyhcbiAgICAgICAgICAgICdjb25mZXJlbmNlJyxcbiAgICAgICAgICAgIHsgeG1sbnM6ICdodHRwOi8vaml0c2kub3JnL3Byb3RvY29sL2NvbGlicmknLCBpZDogdGhpcy5jb25maWQgfSk7XG4gICAgICAgIHBhdGNoLmMoJ2NvbnRlbnQnLCB7IG5hbWU6ICd2aWRlbycgfSk7XG4gICAgICAgIHBhdGNoLmMoXG4gICAgICAgICAgICAnY2hhbm5lbCcsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWQ6ICQodGhpcy5teWNoYW5uZWxbMSAvKiB2aWRlbyAqL10pLmF0dHIoJ2lkJyksXG4gICAgICAgICAgICAgICAgJ3JlY2VpdmUtc2ltdWxjYXN0LWxheWVyJzogdGhpcy5yZWNlaXZlU2ltdWxjYXN0TGF5ZXJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICBwYXRjaC51cCgpOyAvLyBlbmQgb2YgY2hhbm5lbFxuICAgICAgICBmb3IgKHZhciBwID0gMDsgcCA8IHRoaXMuY2hhbm5lbHMubGVuZ3RoOyBwKyspXG4gICAgICAgIHtcbiAgICAgICAgICAgIHBhdGNoLmMoXG4gICAgICAgICAgICAgICAgJ2NoYW5uZWwnLFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6ICQodGhpcy5jaGFubmVsc1twXVsxIC8qIHZpZGVvICovXSkuYXR0cignaWQnKSxcbiAgICAgICAgICAgICAgICAgICAgJ3JlY2VpdmUtc2ltdWxjYXN0LWxheWVyJzogdGhpcy5yZWNlaXZlU2ltdWxjYXN0TGF5ZXJcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHBhdGNoLnVwKCk7IC8vIGVuZCBvZiBjaGFubmVsXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmRJUShcbiAgICAgICAgICAgIHBhdGNoLFxuICAgICAgICAgICAgZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnU2V0IGNoYW5uZWwgc2ltdWxjYXN0IHJlY2VpdmUgbGF5ZXIgc3VjY2VlZGVkOicsIHJlcyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NldCBjaGFubmVsIHNpbXVsY2FzdCByZWNlaXZlIGxheWVyIGZhaWxlZDonLCBlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gQ29saWJyaUZvY3VzO1xuIiwiLyogY29saWJyaS5qcyAtLSBhIENPTElCUkkgZm9jdXMgXG4gKiBUaGUgY29saWJyaSBzcGVjIGhhcyBiZWVuIHN1Ym1pdHRlZCB0byB0aGUgWE1QUCBTdGFuZGFyZHMgRm91bmRhdGlvblxuICogZm9yIHB1YmxpY2F0aW9ucyBhcyBhIFhNUFAgZXh0ZW5zaW9uczpcbiAqIGh0dHA6Ly94bXBwLm9yZy9leHRlbnNpb25zL2luYm94L2NvbGlicmkuaHRtbFxuICpcbiAqIGNvbGlicmkuanMgaXMgYSBwYXJ0aWNpcGF0aW5nIGZvY3VzLCBpLmUuIHRoZSBmb2N1cyBwYXJ0aWNpcGF0ZXNcbiAqIGluIHRoZSBjb25mZXJlbmNlLiBUaGUgY29uZmVyZW5jZSBpdHNlbGYgY2FuIGJlIGFkLWhvYywgdGhyb3VnaCBhXG4gKiBNVUMsIHRocm91Z2ggUHViU3ViLCBldGMuXG4gKlxuICogY29saWJyaS5qcyByZWxpZXMgaGVhdmlseSBvbiB0aGUgc3Ryb3BoZS5qaW5nbGUgbGlicmFyeSBhdmFpbGFibGUgXG4gKiBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9FU1RPUy9zdHJvcGhlLmppbmdsZVxuICogYW5kIGludGVyb3BlcmF0ZXMgd2l0aCB0aGUgSml0c2kgdmlkZW9icmlkZ2UgYXZhaWxhYmxlIGZyb21cbiAqIGh0dHBzOi8vaml0c2kub3JnL1Byb2plY3RzL0ppdHNpVmlkZW9icmlkZ2VcbiAqL1xuLypcbkNvcHlyaWdodCAoYykgMjAxMyBFU1RPUyBHbWJIXG5cblBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbm9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbmluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbnRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbmNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbmFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG5JTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbkZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbk9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cblRIRSBTT0ZUV0FSRS5cbiovXG4vLyBBIGNvbGlicmkgc2Vzc2lvbiBpcyBzaW1pbGFyIHRvIGEgamluZ2xlIHNlc3Npb24sIGl0IGp1c3QgaW1wbGVtZW50cyBzb21lIHRoaW5ncyBkaWZmZXJlbnRseVxuLy8gRklYTUU6IGluaGVyaXQgamluZ2xlc2Vzc2lvbiwgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9sZWdhc3Rlcm8vSmluZ2xlLVJUQ1BlZXJDb25uZWN0aW9uL2Jsb2IvbWFzdGVyL2luZGV4LmpzXG5mdW5jdGlvbiBDb2xpYnJpU2Vzc2lvbihtZSwgc2lkLCBjb25uZWN0aW9uKSB7XG4gICAgdGhpcy5tZSA9IG1lO1xuICAgIHRoaXMuc2lkID0gc2lkO1xuICAgIHRoaXMuY29ubmVjdGlvbiA9IGNvbm5lY3Rpb247XG4gICAgLy90aGlzLnBlZXJjb25uZWN0aW9uID0gbnVsbDtcbiAgICAvL3RoaXMubXljaGFubmVsID0gbnVsbDtcbiAgICAvL3RoaXMuY2hhbm5lbHMgPSBudWxsO1xuICAgIHRoaXMucGVlcmppZCA9IG51bGw7XG5cbiAgICB0aGlzLmNvbGlicmkgPSBudWxsO1xufVxuXG4vLyBpbXBsZW1lbnRhdGlvbiBvZiBKaW5nbGVTZXNzaW9uIGludGVyZmFjZVxuQ29saWJyaVNlc3Npb24ucHJvdG90eXBlLmluaXRpYXRlID0gZnVuY3Rpb24gKHBlZXJqaWQsIGlzSW5pdGlhdG9yKSB7XG4gICAgdGhpcy5wZWVyamlkID0gcGVlcmppZDtcbn07XG5cbkNvbGlicmlTZXNzaW9uLnByb3RvdHlwZS5zZW5kT2ZmZXIgPSBmdW5jdGlvbiAob2ZmZXIpIHtcbiAgICBjb25zb2xlLmxvZygnQ29saWJyaVNlc3Npb24uc2VuZE9mZmVyJyk7XG59O1xuXG5cbkNvbGlicmlTZXNzaW9uLnByb3RvdHlwZS5hY2NlcHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgY29uc29sZS5sb2coJ0NvbGlicmlTZXNzaW9uLmFjY2VwdCcpO1xufTtcblxuQ29saWJyaVNlc3Npb24ucHJvdG90eXBlLmFkZFNvdXJjZSA9IGZ1bmN0aW9uIChlbGVtLCBmcm9tSmlkKSB7XG4gICAgdGhpcy5jb2xpYnJpLmFkZFNvdXJjZShlbGVtLCBmcm9tSmlkKTtcbn07XG5cbkNvbGlicmlTZXNzaW9uLnByb3RvdHlwZS5yZW1vdmVTb3VyY2UgPSBmdW5jdGlvbiAoZWxlbSwgZnJvbUppZCkge1xuICAgIHRoaXMuY29saWJyaS5yZW1vdmVTb3VyY2UoZWxlbSwgZnJvbUppZCk7XG59O1xuXG5Db2xpYnJpU2Vzc2lvbi5wcm90b3R5cGUudGVybWluYXRlID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHRoaXMuY29saWJyaS50ZXJtaW5hdGUodGhpcywgcmVhc29uKTtcbn07XG5cbkNvbGlicmlTZXNzaW9uLnByb3RvdHlwZS5hY3RpdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgY29uc29sZS5sb2coJ0NvbGlicmlTZXNzaW9uLmFjdGl2ZScpO1xufTtcblxuQ29saWJyaVNlc3Npb24ucHJvdG90eXBlLnNldFJlbW90ZURlc2NyaXB0aW9uID0gZnVuY3Rpb24gKGVsZW0sIGRlc2N0eXBlKSB7XG4gICAgdGhpcy5jb2xpYnJpLnNldFJlbW90ZURlc2NyaXB0aW9uKHRoaXMsIGVsZW0sIGRlc2N0eXBlKTtcbn07XG5cbkNvbGlicmlTZXNzaW9uLnByb3RvdHlwZS5hZGRJY2VDYW5kaWRhdGUgPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgIHRoaXMuY29saWJyaS5hZGRJY2VDYW5kaWRhdGUodGhpcywgZWxlbSk7XG59O1xuXG5Db2xpYnJpU2Vzc2lvbi5wcm90b3R5cGUuc2VuZEFuc3dlciA9IGZ1bmN0aW9uIChzZHAsIHByb3Zpc2lvbmFsKSB7XG4gICAgY29uc29sZS5sb2coJ0NvbGlicmlTZXNzaW9uLnNlbmRBbnN3ZXInKTtcbn07XG5cbkNvbGlicmlTZXNzaW9uLnByb3RvdHlwZS5zZW5kVGVybWluYXRlID0gZnVuY3Rpb24gKHJlYXNvbiwgdGV4dCkge1xuICAgIHRoaXMuY29saWJyaS5zZW5kVGVybWluYXRlKHRoaXMsIHJlYXNvbiwgdGV4dCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbGlicmlTZXNzaW9uOyIsIi8qKlxuICogTW9kZXJhdGUgY29ubmVjdGlvbiBwbHVnaW4uXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICBTdHJvcGhlLmFkZENvbm5lY3Rpb25QbHVnaW4oJ21vZGVyYXRlJywge1xuICAgICAgICBjb25uZWN0aW9uOiBudWxsLFxuICAgICAgICByb29tamlkOiBudWxsLFxuICAgICAgICBteXJvb21qaWQ6IG51bGwsXG4gICAgICAgIG1lbWJlcnM6IHt9LFxuICAgICAgICBsaXN0X21lbWJlcnM6IFtdLCAvLyBzbyB3ZSBjYW4gZWxlY3QgYSBuZXcgZm9jdXNcbiAgICAgICAgcHJlc01hcDoge30sXG4gICAgICAgIHByZXppTWFwOiB7fSxcbiAgICAgICAgam9pbmVkOiBmYWxzZSxcbiAgICAgICAgaXNPd25lcjogZmFsc2UsXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uIChjb25uKSB7XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24gPSBjb25uO1xuXG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uYWRkSGFuZGxlcih0aGlzLm9uTXV0ZS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICdodHRwOi8vaml0c2kub3JnL2ppdG1lZXQvYXVkaW8nLFxuICAgICAgICAgICAgICAgICdpcScsXG4gICAgICAgICAgICAgICAgJ3NldCcsXG4gICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICBudWxsKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0TXV0ZTogZnVuY3Rpb24gKGppZCwgbXV0ZSkge1xuICAgICAgICAgICAgdmFyIGlxID0gJGlxKHt0bzogamlkLCB0eXBlOiAnc2V0J30pXG4gICAgICAgICAgICAgICAgLmMoJ211dGUnLCB7eG1sbnM6ICdodHRwOi8vaml0c2kub3JnL2ppdG1lZXQvYXVkaW8nfSlcbiAgICAgICAgICAgICAgICAudChtdXRlLnRvU3RyaW5nKCkpXG4gICAgICAgICAgICAgICAgLnVwKCk7XG5cbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoXG4gICAgICAgICAgICAgICAgaXEsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2V0IG11dGUnLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzZXQgbXV0ZSBlcnJvcicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIub3BlblJlcG9ydERpYWxvZyhudWxsLCAnRmFpbGVkIHRvIG11dGUgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAkKFwiI3BhcnRpY2lwYW50X1wiICsgamlkKS5maW5kKFwiLmRpc3BsYXluYW1lXCIpLnRleHQoKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJwYXJ0aWNpcGFudFwiICsgJy4nLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uTXV0ZTogZnVuY3Rpb24gKGlxKSB7XG4gICAgICAgICAgICB2YXIgbXV0ZSA9ICQoaXEpLmZpbmQoJ211dGUnKTtcbiAgICAgICAgICAgIGlmIChtdXRlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRvZ2dsZUF1ZGlvKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgZWplY3Q6IGZ1bmN0aW9uIChqaWQpIHtcbiAgICAgICAgICAgIGNvbm5lY3Rpb24uamluZ2xlLnRlcm1pbmF0ZVJlbW90ZUJ5SmlkKGppZCwgJ2tpY2snKTtcbiAgICAgICAgICAgIGNvbm5lY3Rpb24uZW11Yy5raWNrKGppZCk7XG4gICAgICAgIH1cbiAgICB9KTtcblxufTtcbiIsIi8qIGpzaGludCAtVzExNyAqL1xuLyogYSBzaW1wbGUgTVVDIGNvbm5lY3Rpb24gcGx1Z2luXG4gKiBjYW4gb25seSBoYW5kbGUgYSBzaW5nbGUgTVVDIHJvb21cbiAqL1xuXG52YXIgQ29saWJyaUZvY3VzID0gcmVxdWlyZShcIi4vY29saWJyaS9jb2xpYnJpLmZvY3VzXCIpO1xudmFyIFhNUFBBY3RpdmF0b3IgPSByZXF1aXJlKFwiLi9YTVBQQWN0aXZhdG9yXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGV2ZW50RW1pdHRlcikge1xuICAgIFN0cm9waGUuYWRkQ29ubmVjdGlvblBsdWdpbignZW11YycsIHtcbiAgICAgICAgY29ubmVjdGlvbjogbnVsbCxcbiAgICAgICAgcm9vbWppZDogbnVsbCxcbiAgICAgICAgbXlyb29tamlkOiBudWxsLFxuICAgICAgICBtZW1iZXJzOiB7fSxcbiAgICAgICAgbGlzdF9tZW1iZXJzOiBbXSwgLy8gc28gd2UgY2FuIGVsZWN0IGEgbmV3IGZvY3VzXG4gICAgICAgIHByZXNNYXA6IHt9LFxuICAgICAgICBwcmV6aU1hcDoge30sXG4gICAgICAgIGpvaW5lZDogZmFsc2UsXG4gICAgICAgIGlzT3duZXI6IGZhbHNlLFxuICAgICAgICBzZXNzaW9uVGVybWluYXRlZDogZmFsc2UsXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uIChjb25uKSB7XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24gPSBjb25uO1xuICAgICAgICB9LFxuICAgICAgICBpbml0UHJlc2VuY2VNYXA6IGZ1bmN0aW9uIChteXJvb21qaWQpIHtcbiAgICAgICAgICAgIHRoaXMucHJlc01hcFsndG8nXSA9IG15cm9vbWppZDtcbiAgICAgICAgICAgIHRoaXMucHJlc01hcFsneG5zJ10gPSAnaHR0cDovL2phYmJlci5vcmcvcHJvdG9jb2wvbXVjJztcbiAgICAgICAgfSxcbiAgICAgICAgZG9Kb2luOiBmdW5jdGlvbiAoamlkLCBwYXNzd29yZCkge1xuICAgICAgICAgICAgdGhpcy5teXJvb21qaWQgPSBqaWQ7XG5cbiAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIkpvaW5lZCBNVUMgYXMgXCIgKyB0aGlzLm15cm9vbWppZCk7XG5cbiAgICAgICAgICAgIHRoaXMuaW5pdFByZXNlbmNlTWFwKHRoaXMubXlyb29tamlkKTtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLnJvb21qaWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJvb21qaWQgPSBTdHJvcGhlLmdldEJhcmVKaWRGcm9tSmlkKGppZCk7XG4gICAgICAgICAgICAgICAgLy8gYWRkIGhhbmRsZXJzIChqdXN0IG9uY2UpXG4gICAgICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLmFkZEhhbmRsZXIodGhpcy5vblByZXNlbmNlLmJpbmQodGhpcyksIG51bGwsICdwcmVzZW5jZScsIG51bGwsIG51bGwsIHRoaXMucm9vbWppZCwge21hdGNoQmFyZTogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5hZGRIYW5kbGVyKHRoaXMub25QcmVzZW5jZVVuYXZhaWxhYmxlLmJpbmQodGhpcyksIG51bGwsICdwcmVzZW5jZScsICd1bmF2YWlsYWJsZScsIG51bGwsIHRoaXMucm9vbWppZCwge21hdGNoQmFyZTogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5hZGRIYW5kbGVyKHRoaXMub25QcmVzZW5jZUVycm9yLmJpbmQodGhpcyksIG51bGwsICdwcmVzZW5jZScsICdlcnJvcicsIG51bGwsIHRoaXMucm9vbWppZCwge21hdGNoQmFyZTogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5hZGRIYW5kbGVyKHRoaXMub25NZXNzYWdlLmJpbmQodGhpcyksIG51bGwsICdtZXNzYWdlJywgbnVsbCwgbnVsbCwgdGhpcy5yb29tamlkLCB7bWF0Y2hCYXJlOiB0cnVlfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocGFzc3dvcmQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJlc01hcFsncGFzc3dvcmQnXSA9IHBhc3N3b3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zZW5kUHJlc2VuY2UoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZG9MZWF2ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJkbyBsZWF2ZVwiLCB0aGlzLm15cm9vbWppZCk7XG4gICAgICAgICAgICB0aGlzLnNlc3Npb25UZXJtaW5hdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHZhciBwcmVzID0gJHByZXMoe3RvOiB0aGlzLm15cm9vbWppZCwgdHlwZTogJ3VuYXZhaWxhYmxlJyB9KTtcbiAgICAgICAgICAgIHRoaXMucHJlc01hcC5sZW5ndGggPSAwO1xuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmQocHJlcyk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uUHJlc2VuY2U6IGZ1bmN0aW9uIChwcmVzKSB7XG4gICAgICAgICAgICB2YXIgZnJvbSA9IHByZXMuZ2V0QXR0cmlidXRlKCdmcm9tJyk7XG4gICAgICAgICAgICB2YXIgdHlwZSA9IHByZXMuZ2V0QXR0cmlidXRlKCd0eXBlJyk7XG4gICAgICAgICAgICBpZiAodHlwZSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFBhcnNlIGV0aGVycGFkIHRhZy5cbiAgICAgICAgICAgIHZhciBldGhlcnBhZCA9ICQocHJlcykuZmluZCgnPmV0aGVycGFkJyk7XG4gICAgICAgICAgICBpZiAoZXRoZXJwYWQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignZXRoZXJwYWRhZGRlZC5tdWMnLCBbZnJvbSwgZXRoZXJwYWQudGV4dCgpXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFBhcnNlIHByZXppIHRhZy5cbiAgICAgICAgICAgIHZhciBwcmVzZW50YXRpb24gPSAkKHByZXMpLmZpbmQoJz5wcmV6aScpO1xuICAgICAgICAgICAgaWYgKHByZXNlbnRhdGlvbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB2YXIgdXJsID0gcHJlc2VudGF0aW9uLmF0dHIoJ3VybCcpO1xuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50ID0gcHJlc2VudGF0aW9uLmZpbmQoJz5jdXJyZW50JykudGV4dCgpO1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3ByZXNlbnRhdGlvbiBpbmZvIHJlY2VpdmVkIGZyb20nLCBmcm9tLCB1cmwpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucHJlemlNYXBbZnJvbV0gPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnByZXppTWFwW2Zyb21dID0gdXJsO1xuXG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ3ByZXNlbnRhdGlvbmFkZGVkLm11YycsIFtmcm9tLCB1cmwsIGN1cnJlbnRdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2dvdG9zbGlkZS5tdWMnLCBbZnJvbSwgdXJsLCBjdXJyZW50XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5wcmV6aU1hcFtmcm9tXSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdmFyIHVybCA9IHRoaXMucHJlemlNYXBbZnJvbV07XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMucHJlemlNYXBbZnJvbV07XG4gICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcigncHJlc2VudGF0aW9ucmVtb3ZlZC5tdWMnLCBbZnJvbSwgdXJsXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFBhcnNlIGF1ZGlvIGluZm8gdGFnLlxuICAgICAgICAgICAgdmFyIGF1ZGlvTXV0ZWQgPSAkKHByZXMpLmZpbmQoJz5hdWRpb211dGVkJyk7XG4gICAgICAgICAgICBpZiAoYXVkaW9NdXRlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdhdWRpb211dGVkLm11YycsIFtmcm9tLCBhdWRpb011dGVkLnRleHQoKV0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBQYXJzZSB2aWRlbyBpbmZvIHRhZy5cbiAgICAgICAgICAgIHZhciB2aWRlb011dGVkID0gJChwcmVzKS5maW5kKCc+dmlkZW9tdXRlZCcpO1xuICAgICAgICAgICAgaWYgKHZpZGVvTXV0ZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcigndmlkZW9tdXRlZC5tdWMnLCBbZnJvbSwgdmlkZW9NdXRlZC50ZXh0KCldKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUGFyc2Ugc3RhdHVzLlxuICAgICAgICAgICAgaWYgKCQocHJlcykuZmluZCgnPnhbeG1sbnM9XCJodHRwOi8vamFiYmVyLm9yZy9wcm90b2NvbC9tdWMjdXNlclwiXT5zdGF0dXNbY29kZT1cIjIwMVwiXScpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIC8vIGh0dHA6Ly94bXBwLm9yZy9leHRlbnNpb25zL3hlcC0wMDQ1Lmh0bWwjY3JlYXRlcm9vbS1pbnN0YW50XG4gICAgICAgICAgICAgICAgdGhpcy5pc093bmVyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2YXIgY3JlYXRlID0gJGlxKHt0eXBlOiAnc2V0JywgdG86IHRoaXMucm9vbWppZH0pXG4gICAgICAgICAgICAgICAgICAgIC5jKCdxdWVyeScsIHt4bWxuczogJ2h0dHA6Ly9qYWJiZXIub3JnL3Byb3RvY29sL211YyNvd25lcid9KVxuICAgICAgICAgICAgICAgICAgICAuYygneCcsIHt4bWxuczogJ2phYmJlcjp4OmRhdGEnLCB0eXBlOiAnc3VibWl0J30pO1xuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kKGNyZWF0ZSk7IC8vIGZpcmUgYXdheVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBQYXJzZSByb2xlcy5cbiAgICAgICAgICAgIHZhciBtZW1iZXIgPSB7fTtcbiAgICAgICAgICAgIG1lbWJlci5zaG93ID0gJChwcmVzKS5maW5kKCc+c2hvdycpLnRleHQoKTtcbiAgICAgICAgICAgIG1lbWJlci5zdGF0dXMgPSAkKHByZXMpLmZpbmQoJz5zdGF0dXMnKS50ZXh0KCk7XG4gICAgICAgICAgICB2YXIgdG1wID0gJChwcmVzKS5maW5kKCc+eFt4bWxucz1cImh0dHA6Ly9qYWJiZXIub3JnL3Byb3RvY29sL211YyN1c2VyXCJdPml0ZW0nKTtcbiAgICAgICAgICAgIG1lbWJlci5hZmZpbGlhdGlvbiA9IHRtcC5hdHRyKCdhZmZpbGlhdGlvbicpO1xuICAgICAgICAgICAgbWVtYmVyLnJvbGUgPSB0bXAuYXR0cigncm9sZScpO1xuXG4gICAgICAgICAgICB2YXIgbmlja3RhZyA9ICQocHJlcykuZmluZCgnPm5pY2tbeG1sbnM9XCJodHRwOi8vamFiYmVyLm9yZy9wcm90b2NvbC9uaWNrXCJdJyk7XG4gICAgICAgICAgICBtZW1iZXIuZGlzcGxheU5hbWUgPSAobmlja3RhZy5sZW5ndGggPiAwID8gbmlja3RhZy50ZXh0KCkgOiBudWxsKTtcblxuICAgICAgICAgICAgaWYgKGZyb20gPT0gdGhpcy5teXJvb21qaWQpIHtcbiAgICAgICAgICAgICAgICBpZiAobWVtYmVyLmFmZmlsaWF0aW9uID09ICdvd25lcicpIHRoaXMuaXNPd25lciA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmpvaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmpvaW5lZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHZhciBub01lbWJlcnMgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKGNvbm5lY3Rpb24uZW11Yy5tZW1iZXJzKS5sZW5ndGggPCAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub01lbWJlcnMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9jdXMgPSBuZXcgQ29saWJyaUZvY3VzKGNvbm5lY3Rpb24sIGNvbmZpZy5ob3N0cy5icmlkZ2UsIGV2ZW50RW1pdHRlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldE93bk5pY2tuYW1lKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgVUlBY3RpdmF0b3IuZ2V0VUlTZXJ2aWNlKCkub25NdWNKb2luZWQoZnJvbSwgbWVtYmVyLCBub01lbWJlcnMpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpc3RfbWVtYmVycy5wdXNoKGZyb20pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5tZW1iZXJzW2Zyb21dID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBuZXcgcGFydGljaXBhbnRcbiAgICAgICAgICAgICAgICB0aGlzLm1lbWJlcnNbZnJvbV0gPSBtZW1iZXI7XG4gICAgICAgICAgICAgICAgdGhpcy5saXN0X21lbWJlcnMucHVzaChmcm9tKTtcbiAgICAgICAgICAgICAgICBVSUFjdGl2YXRvci5nZXRVSVNlcnZpY2UoKS5vbk11Y0VudGVyZWQoZnJvbSwgbWVtYmVyLCBwcmVzKTtcbiAgICAgICAgICAgICAgICBpZiAoZm9jdXMgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IHRoaXMgc2hvdWxkIHByZXBhcmUgdGhlIHZpZGVvXG4gICAgICAgICAgICAgICAgICAgIGlmIChmb2N1cy5jb25maWQgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdtYWtlIG5ldyBjb25mZXJlbmNlIHdpdGgnLCBmcm9tKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvY3VzLm1ha2VDb25mZXJlbmNlKE9iamVjdC5rZXlzKHRoaXMubWVtYmVycykpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2ludml0ZScsIGZyb20sICdpbnRvIGNvbmZlcmVuY2UnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvY3VzLmFkZE5ld1BhcnRpY2lwYW50KGZyb20pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQWx3YXlzIHRyaWdnZXIgcHJlc2VuY2UgdG8gdXBkYXRlIGJpbmRpbmdzXG4gICAgICAgICAgICBjb25zb2xlLmxvZygncHJlc2VuY2UgY2hhbmdlIGZyb20nLCBmcm9tKTtcbiAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ3ByZXNlbmNlLm11YycsIFtmcm9tLCBtZW1iZXIsIHByZXNdKTtcblxuICAgICAgICAgICAgLy8gVHJpZ2dlciBzdGF0dXMgbWVzc2FnZSB1cGRhdGVcbiAgICAgICAgICAgIGlmIChtZW1iZXIuc3RhdHVzKSB7XG4gICAgICAgICAgICAgICAgVUlBY3RpdmF0b3IuZ2V0VUlTZXJ2aWNlKCkub25NdWNQcmVzZW5jZVN0YXR1cyhmcm9tLCBtZW1iZXIsIHByZXMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgb25QcmVzZW5jZVVuYXZhaWxhYmxlOiBmdW5jdGlvbiAocHJlcykge1xuICAgICAgICAgICAgdmFyIGZyb20gPSBwcmVzLmdldEF0dHJpYnV0ZSgnZnJvbScpO1xuICAgICAgICAgICAgLy8gU3RhdHVzIGNvZGUgMTEwIGluZGljYXRlcyB0aGF0IHRoaXMgbm90aWZpY2F0aW9uIGlzIFwic2VsZi1wcmVzZW5jZVwiLlxuICAgICAgICAgICAgaWYgKCEkKHByZXMpLmZpbmQoJz54W3htbG5zPVwiaHR0cDovL2phYmJlci5vcmcvcHJvdG9jb2wvbXVjI3VzZXJcIl0+c3RhdHVzW2NvZGU9XCIxMTBcIl0nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5tZW1iZXJzW2Zyb21dO1xuICAgICAgICAgICAgICAgIHRoaXMubGlzdF9tZW1iZXJzLnNwbGljZSh0aGlzLmxpc3RfbWVtYmVycy5pbmRleE9mKGZyb20pLCAxKTtcbiAgICAgICAgICAgICAgICB0aGlzLmxlZnRNdWMoZnJvbSk7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdsZWZ0Lm11YycsIFtmcm9tXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBJZiB0aGUgc3RhdHVzIGNvZGUgaXMgMTEwIHRoaXMgbWVhbnMgd2UncmUgbGVhdmluZyBhbmQgd2Ugd291bGQgbGlrZVxuICAgICAgICAgICAgLy8gdG8gcmVtb3ZlIGV2ZXJ5b25lIGVsc2UgZnJvbSBvdXIgdmlldywgc28gd2UgdHJpZ2dlciB0aGUgZXZlbnQuXG4gICAgICAgICAgICBlbHNlIGlmICh0aGlzLmxpc3RfbWVtYmVycy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxpc3RfbWVtYmVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbWVtYmVyID0gdGhpcy5saXN0X21lbWJlcnNbaV07XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLm1lbWJlcnNbaV07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGlzdF9tZW1iZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sZWZ0TXVjKG1lbWJlcik7XG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2xlZnQubXVjJywgbWVtYmVyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgbGVmdE11YzogZnVuY3Rpb24gKGppZCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2xlZnQubXVjJywgamlkKTtcbiAgICAgICAgICAgIFVJQWN0aXZhdG9yLmdldFVJU2VydmljZSgpLm9uTXVjTGVmdChqaWQpO1xuICAgICAgICAgICAgY29ubmVjdGlvbi5qaW5nbGUudGVybWluYXRlQnlKaWQoamlkKTtcblxuICAgICAgICAgICAgaWYgKGZvY3VzID09IG51bGxcbiAgICAgICAgICAgICAgICAvLyBJIHNob3VsZG4ndCBiZSB0aGUgb25lIHRoYXQgbGVmdCB0byBlbnRlciBoZXJlLlxuICAgICAgICAgICAgICAgICYmIGppZCAhPT0gY29ubmVjdGlvbi5lbXVjLm15cm9vbWppZFxuICAgICAgICAgICAgICAgICYmIGNvbm5lY3Rpb24uZW11Yy5teXJvb21qaWQgPT09IGNvbm5lY3Rpb24uZW11Yy5saXN0X21lbWJlcnNbMF1cbiAgICAgICAgICAgICAgICAvLyBJZiBvdXIgc2Vzc2lvbiBoYXMgYmVlbiB0ZXJtaW5hdGVkIGZvciBzb21lIHJlYXNvblxuICAgICAgICAgICAgICAgIC8vIChraWNrZWQsIGhhbmd1cCksIGRvbid0IHRyeSB0byBiZWNvbWUgdGhlIGZvY3VzXG4gICAgICAgICAgICAgICAgJiYgIXRoaXMuc2Vzc2lvblRlcm1pbmF0ZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnd2VsY29tZSB0byBvdXIgbmV3IGZvY3VzLi4uIG15c2VsZicpO1xuICAgICAgICAgICAgICAgIGZvY3VzID0gbmV3IENvbGlicmlGb2N1cyhjb25uZWN0aW9uLCBjb25maWcuaG9zdHMuYnJpZGdlLCBldmVudEVtaXR0ZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0T3duTmlja25hbWUoKTtcblxuICAgICAgICAgICAgICAgIFVJQWN0aXZhdG9yLmdldFVJU2VydmljZSgpLnVwZGF0ZUJ1dHRvbnMobnVsbCwgdHJ1ZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LmtleXMoY29ubmVjdGlvbi5lbXVjLm1lbWJlcnMpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9jdXMubWFrZUNvbmZlcmVuY2UoT2JqZWN0LmtleXMoY29ubmVjdGlvbi5lbXVjLm1lbWJlcnMpKTtcbiAgICAgICAgICAgICAgICAgICAgVUlBY3RpdmF0b3IuZ2V0VUlTZXJ2aWNlKCkudXBkYXRlQnV0dG9ucyh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignZm9jdXNlY2hhbmdlZC5tdWMnLCBbZm9jdXNdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGZvY3VzICYmIE9iamVjdC5rZXlzKGNvbm5lY3Rpb24uZW11Yy5tZW1iZXJzKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZXZlcnlvbmUgbGVmdCcpO1xuICAgICAgICAgICAgICAgIC8vIEZJWE1FOiBjbG9zaW5nIHRoZSBjb25uZWN0aW9uIGlzIGEgaGFjayB0byBhdm9pZCBzb21lXG4gICAgICAgICAgICAgICAgLy8gcHJvYmxlbXMgd2l0aCByZWluaXRcbiAgICAgICAgICAgICAgICBkaXNwb3NlQ29uZmVyZW5jZSgpO1xuICAgICAgICAgICAgICAgIGZvY3VzID0gbmV3IENvbGlicmlGb2N1cyhjb25uZWN0aW9uLCBjb25maWcuaG9zdHMuYnJpZGdlLCBldmVudEVtaXR0ZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0T3duTmlja25hbWUoKTtcbiAgICAgICAgICAgICAgICBVSUFjdGl2YXRvci5nZXRVSVNlcnZpY2UoKS51cGRhdGVCdXR0b25zKHRydWUsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGNvbm5lY3Rpb24uZW11Yy5nZXRQcmV6aShqaWQpKSB7XG4gICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcigncHJlc2VudGF0aW9ucmVtb3ZlZC5tdWMnLFxuICAgICAgICAgICAgICAgICAgICBbamlkLCBjb25uZWN0aW9uLmVtdWMuZ2V0UHJlemkoamlkKV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzZXRPd25OaWNrbmFtZTogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICBpZiAoWE1QUEFjdGl2YXRvci5nZXROaWNrbmFtZSgpICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZm9jdXMuc2V0RW5kcG9pbnREaXNwbGF5TmFtZShjb25uZWN0aW9uLmVtdWMubXlyb29tamlkLFxuICAgICAgICAgICAgICAgICAgICBYTVBQQWN0aXZhdG9yLmdldE5pY2tuYW1lKCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0sXG4gICAgICAgIG9uUHJlc2VuY2VFcnJvcjogZnVuY3Rpb24gKHByZXMpIHtcbiAgICAgICAgICAgIHZhciBmcm9tID0gcHJlcy5nZXRBdHRyaWJ1dGUoJ2Zyb20nKTtcbiAgICAgICAgICAgIGlmICgkKHByZXMpLmZpbmQoJz5lcnJvclt0eXBlPVwiYXV0aFwiXT5ub3QtYXV0aG9yaXplZFt4bWxucz1cInVybjppZXRmOnBhcmFtczp4bWw6bnM6eG1wcC1zdGFuemFzXCJdJykubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgVUlBY3RpdmF0b3IuZ2V0VUlTZXJ2aWNlKCkuc2hvd0xvY2tQb3B1cChmcm9tLCB0aGlzLmRvSm9pbik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCQocHJlcykuZmluZChcbiAgICAgICAgICAgICAgICAnPmVycm9yW3R5cGU9XCJjYW5jZWxcIl0+bm90LWFsbG93ZWRbeG1sbnM9XCJ1cm46aWV0ZjpwYXJhbXM6eG1sOm5zOnhtcHAtc3Rhbnphc1wiXScpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHZhciB0b0RvbWFpbiA9IFN0cm9waGUuZ2V0RG9tYWluRnJvbUppZChwcmVzLmdldEF0dHJpYnV0ZSgndG8nKSk7XG4gICAgICAgICAgICAgICAgaWYgKHRvRG9tYWluID09PSBjb25maWcuaG9zdHMuYW5vbnltb3VzZG9tYWluKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHdlIGFyZSBjb25uZWN0ZWQgd2l0aCBhbm9ueW1vdXMgZG9tYWluIGFuZCBvbmx5IG5vbiBhbm9ueW1vdXMgdXNlcnMgY2FuIGNyZWF0ZSByb29tc1xuICAgICAgICAgICAgICAgICAgICAvLyB3ZSBtdXN0IGF1dGhvcml6ZSB0aGUgdXNlclxuICAgICAgICAgICAgICAgICAgICBYTVBQQWN0aXZhdG9yLnByb21wdExvZ2luKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdvblByZXNFcnJvciAnLCBwcmVzKTtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIub3BlblJlcG9ydERpYWxvZyhudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ09vcHMhIFNvbWV0aGluZyB3ZW50IHdyb25nIGFuZCB3ZSBjb3VsZG5gdCBjb25uZWN0IHRvIHRoZSBjb25mZXJlbmNlLicsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2Fybignb25QcmVzRXJyb3IgJywgcHJlcyk7XG4gICAgICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIub3BlblJlcG9ydERpYWxvZyhudWxsLFxuICAgICAgICAgICAgICAgICAgICAnT29wcyEgU29tZXRoaW5nIHdlbnQgd3JvbmcgYW5kIHdlIGNvdWxkbmB0IGNvbm5lY3QgdG8gdGhlIGNvbmZlcmVuY2UuJyxcbiAgICAgICAgICAgICAgICAgICAgcHJlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgc2VuZE1lc3NhZ2U6IGZ1bmN0aW9uIChib2R5LCBuaWNrbmFtZSkge1xuICAgICAgICAgICAgdmFyIG1zZyA9ICRtc2coe3RvOiB0aGlzLnJvb21qaWQsIHR5cGU6ICdncm91cGNoYXQnfSk7XG4gICAgICAgICAgICBtc2cuYygnYm9keScsIGJvZHkpLnVwKCk7XG4gICAgICAgICAgICBpZiAobmlja25hbWUpIHtcbiAgICAgICAgICAgICAgICBtc2cuYygnbmljaycsIHt4bWxuczogJ2h0dHA6Ly9qYWJiZXIub3JnL3Byb3RvY29sL25pY2snfSkudChuaWNrbmFtZSkudXAoKS51cCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmQobXNnKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0U3ViamVjdDogZnVuY3Rpb24gKHN1YmplY3QpIHtcbiAgICAgICAgICAgIHZhciBtc2cgPSAkbXNnKHt0bzogdGhpcy5yb29tamlkLCB0eXBlOiAnZ3JvdXBjaGF0J30pO1xuICAgICAgICAgICAgbXNnLmMoJ3N1YmplY3QnLCBzdWJqZWN0KTtcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kKG1zZyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInRvcGljIGNoYW5nZWQgdG8gXCIgKyBzdWJqZWN0KTtcbiAgICAgICAgfSxcbiAgICAgICAgb25NZXNzYWdlOiBmdW5jdGlvbiAobXNnKSB7XG4gICAgICAgICAgICAvLyBGSVhNRTogdGhpcyBpcyBhIGhhY2suIGJ1dCBqaW5nbGUgb24gbXVjIG1ha2VzIG5pY2tjaGFuZ2VzIGhhcmRcbiAgICAgICAgICAgIHZhciBmcm9tID0gbXNnLmdldEF0dHJpYnV0ZSgnZnJvbScpO1xuICAgICAgICAgICAgdmFyIG5pY2sgPSAkKG1zZykuZmluZCgnPm5pY2tbeG1sbnM9XCJodHRwOi8vamFiYmVyLm9yZy9wcm90b2NvbC9uaWNrXCJdJykudGV4dCgpIHx8IFN0cm9waGUuZ2V0UmVzb3VyY2VGcm9tSmlkKGZyb20pO1xuXG4gICAgICAgICAgICB2YXIgdHh0ID0gJChtc2cpLmZpbmQoJz5ib2R5JykudGV4dCgpO1xuICAgICAgICAgICAgdmFyIHR5cGUgPSBtc2cuZ2V0QXR0cmlidXRlKFwidHlwZVwiKTtcbiAgICAgICAgICAgIGlmICh0eXBlID09IFwiZXJyb3JcIikge1xuICAgICAgICAgICAgICAgIFVJQWN0aXZhdG9yLmNoYXRBZGRFcnJvcigkKG1zZykuZmluZCgnPnRleHQnKS50ZXh0KCksIHR4dCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBzdWJqZWN0ID0gJChtc2cpLmZpbmQoJz5zdWJqZWN0Jyk7XG4gICAgICAgICAgICBpZiAoc3ViamVjdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB2YXIgc3ViamVjdFRleHQgPSBzdWJqZWN0LnRleHQoKTtcbiAgICAgICAgICAgICAgICBpZiAoc3ViamVjdFRleHQgfHwgc3ViamVjdFRleHQgPT0gXCJcIikge1xuICAgICAgICAgICAgICAgICAgICBVSUFjdGl2YXRvci5jaGF0U2V0U3ViamVjdChzdWJqZWN0VGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU3ViamVjdCBpcyBjaGFuZ2VkIHRvIFwiICsgc3ViamVjdFRleHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICBpZiAodHh0KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NoYXQnLCBuaWNrLCB0eHQpO1xuXG4gICAgICAgICAgICAgICAgVUlBY3RpdmF0b3IudXBkYXRlQ2hhdENvbnZlcnNhdGlvbihmcm9tLCBuaWNrLCB0eHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIGxvY2tSb29tOiBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAvL2h0dHA6Ly94bXBwLm9yZy9leHRlbnNpb25zL3hlcC0wMDQ1Lmh0bWwjcm9vbWNvbmZpZ1xuICAgICAgICAgICAgdmFyIG9iID0gdGhpcztcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5zZW5kSVEoJGlxKHt0bzogdGhpcy5yb29tamlkLCB0eXBlOiAnZ2V0J30pLmMoJ3F1ZXJ5Jywge3htbG5zOiAnaHR0cDovL2phYmJlci5vcmcvcHJvdG9jb2wvbXVjI293bmVyJ30pLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQocmVzKS5maW5kKCc+cXVlcnk+eFt4bWxucz1cImphYmJlcjp4OmRhdGFcIl0+ZmllbGRbdmFyPVwibXVjI3Jvb21jb25maWdfcm9vbXNlY3JldFwiXScpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZvcm1zdWJtaXQgPSAkaXEoe3RvOiBvYi5yb29tamlkLCB0eXBlOiAnc2V0J30pLmMoJ3F1ZXJ5Jywge3htbG5zOiAnaHR0cDovL2phYmJlci5vcmcvcHJvdG9jb2wvbXVjI293bmVyJ30pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybXN1Ym1pdC5jKCd4Jywge3htbG5zOiAnamFiYmVyOng6ZGF0YScsIHR5cGU6ICdzdWJtaXQnfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3Jtc3VibWl0LmMoJ2ZpZWxkJywgeyd2YXInOiAnRk9STV9UWVBFJ30pLmMoJ3ZhbHVlJykudCgnaHR0cDovL2phYmJlci5vcmcvcHJvdG9jb2wvbXVjI3Jvb21jb25maWcnKS51cCgpLnVwKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3Jtc3VibWl0LmMoJ2ZpZWxkJywgeyd2YXInOiAnbXVjI3Jvb21jb25maWdfcm9vbXNlY3JldCd9KS5jKCd2YWx1ZScpLnQoa2V5KS51cCgpLnVwKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGSVhNRTogaXMgbXVjI3Jvb21jb25maWdfcGFzc3dvcmRwcm90ZWN0ZWRyb29tIHJlcXVpcmVkP1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmRJUShmb3Jtc3VibWl0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NldCByb29tIHBhc3N3b3JkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2Fybignc2V0dGluZyBwYXNzd29yZCBmYWlsZWQnLCBlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5zaG93RXJyb3IoJ0xvY2sgZmFpbGVkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdGYWlsZWQgdG8gbG9jayBjb25mZXJlbmNlLicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ3Jvb20gcGFzc3dvcmRzIG5vdCBzdXBwb3J0ZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLnNob3dFcnJvcignV2FybmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1Jvb20gcGFzc3dvcmRzIGFyZSBjdXJyZW50bHkgbm90IHN1cHBvcnRlZC4nKTtcblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2Fybignc2V0dGluZyBwYXNzd29yZCBmYWlsZWQnLCBlcnIpO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5zaG93RXJyb3IoJ0xvY2sgZmFpbGVkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdGYWlsZWQgdG8gbG9jayBjb25mZXJlbmNlLicsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0sXG4gICAgICAgIGtpY2s6IGZ1bmN0aW9uIChqaWQpIHtcbiAgICAgICAgICAgIHZhciBraWNrSVEgPSAkaXEoe3RvOiB0aGlzLnJvb21qaWQsIHR5cGU6ICdzZXQnfSlcbiAgICAgICAgICAgICAgICAuYygncXVlcnknLCB7eG1sbnM6ICdodHRwOi8vamFiYmVyLm9yZy9wcm90b2NvbC9tdWMjYWRtaW4nfSlcbiAgICAgICAgICAgICAgICAuYygnaXRlbScsIHtuaWNrOiBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpLCByb2xlOiAnbm9uZSd9KVxuICAgICAgICAgICAgICAgIC5jKCdyZWFzb24nKS50KCdZb3UgaGF2ZSBiZWVuIGtpY2tlZC4nKS51cCgpLnVwKCkudXAoKTtcblxuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmRJUShcbiAgICAgICAgICAgICAgICBraWNrSVEsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnS2ljayBwYXJ0aWNpcGFudCB3aXRoIGppZDogJywgamlkLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdLaWNrIHBhcnRpY2lwYW50IGVycm9yOiAnLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIHNlbmRQcmVzZW5jZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHByZXMgPSAkcHJlcyh7dG86IHRoaXMucHJlc01hcFsndG8nXSB9KTtcbiAgICAgICAgICAgIHByZXMuYygneCcsIHt4bWxuczogdGhpcy5wcmVzTWFwWyd4bnMnXX0pO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5wcmVzTWFwWydwYXNzd29yZCddKSB7XG4gICAgICAgICAgICAgICAgcHJlcy5jKCdwYXNzd29yZCcpLnQodGhpcy5wcmVzTWFwWydwYXNzd29yZCddKS51cCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcmVzLnVwKCk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnByZXNNYXBbJ2JyaWRnZUlzRG93biddKSB7XG4gICAgICAgICAgICAgICAgcHJlcy5jKCdicmlkZ2VJc0Rvd24nKS51cCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5wcmVzTWFwWydkaXNwbGF5TmFtZSddKSB7XG4gICAgICAgICAgICAgICAgLy8gWEVQLTAxNzJcbiAgICAgICAgICAgICAgICBwcmVzLmMoJ25pY2snLCB7eG1sbnM6ICdodHRwOi8vamFiYmVyLm9yZy9wcm90b2NvbC9uaWNrJ30pXG4gICAgICAgICAgICAgICAgICAgIC50KHRoaXMucHJlc01hcFsnZGlzcGxheU5hbWUnXSkudXAoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRoaXMucHJlc01hcFsnYXVkaW9ucyddKSB7XG4gICAgICAgICAgICAgICAgcHJlcy5jKCdhdWRpb211dGVkJywge3htbG5zOiB0aGlzLnByZXNNYXBbJ2F1ZGlvbnMnXX0pXG4gICAgICAgICAgICAgICAgICAgIC50KHRoaXMucHJlc01hcFsnYXVkaW9tdXRlZCddKS51cCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5wcmVzTWFwWyd2aWRlb25zJ10pIHtcbiAgICAgICAgICAgICAgICBwcmVzLmMoJ3ZpZGVvbXV0ZWQnLCB7eG1sbnM6IHRoaXMucHJlc01hcFsndmlkZW9ucyddfSlcbiAgICAgICAgICAgICAgICAgICAgLnQodGhpcy5wcmVzTWFwWyd2aWRlb211dGVkJ10pLnVwKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnByZXNNYXBbJ3ByZXppbnMnXSkge1xuICAgICAgICAgICAgICAgIHByZXMuYygncHJlemknLFxuICAgICAgICAgICAgICAgICAgICB7eG1sbnM6IHRoaXMucHJlc01hcFsncHJlemlucyddLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ3VybCc6IHRoaXMucHJlc01hcFsncHJleml1cmwnXX0pXG4gICAgICAgICAgICAgICAgICAgIC5jKCdjdXJyZW50JykudCh0aGlzLnByZXNNYXBbJ3ByZXppY3VycmVudCddKS51cCgpLnVwKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnByZXNNYXBbJ2V0aGVycGFkbnMnXSkge1xuICAgICAgICAgICAgICAgIHByZXMuYygnZXRoZXJwYWQnLCB7eG1sbnM6IHRoaXMucHJlc01hcFsnZXRoZXJwYWRucyddfSlcbiAgICAgICAgICAgICAgICAgICAgLnQodGhpcy5wcmVzTWFwWydldGhlcnBhZG5hbWUnXSkudXAoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRoaXMucHJlc01hcFsnbWVkaWFucyddKSB7XG4gICAgICAgICAgICAgICAgcHJlcy5jKCdtZWRpYScsIHt4bWxuczogdGhpcy5wcmVzTWFwWydtZWRpYW5zJ119KTtcbiAgICAgICAgICAgICAgICB2YXIgc291cmNlTnVtYmVyID0gMDtcbiAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyh0aGlzLnByZXNNYXApLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5LmluZGV4T2YoJ3NvdXJjZScpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZU51bWJlcisrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKHNvdXJjZU51bWJlciA+IDApXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDw9IHNvdXJjZU51bWJlciAvIDM7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJlcy5jKCdzb3VyY2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHt0eXBlOiB0aGlzLnByZXNNYXBbJ3NvdXJjZScgKyBpICsgJ190eXBlJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNzcmM6IHRoaXMucHJlc01hcFsnc291cmNlJyArIGkgKyAnX3NzcmMnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uOiB0aGlzLnByZXNNYXBbJ3NvdXJjZScgKyBpICsgJ19kaXJlY3Rpb24nXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgJ3NlbmRyZWN2JyB9XG4gICAgICAgICAgICAgICAgICAgICAgICApLnVwKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcHJlcy51cCgpO1xuICAgICAgICAgICAgY29ubmVjdGlvbi5zZW5kKHByZXMpO1xuICAgICAgICB9LFxuICAgICAgICBhZGREaXNwbGF5TmFtZVRvUHJlc2VuY2U6IGZ1bmN0aW9uIChkaXNwbGF5TmFtZSkge1xuICAgICAgICAgICAgdGhpcy5wcmVzTWFwWydkaXNwbGF5TmFtZSddID0gZGlzcGxheU5hbWU7XG4gICAgICAgIH0sXG4gICAgICAgIGFkZE1lZGlhVG9QcmVzZW5jZTogZnVuY3Rpb24gKHNvdXJjZU51bWJlciwgbXR5cGUsIHNzcmNzLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5wcmVzTWFwWydtZWRpYW5zJ10pXG4gICAgICAgICAgICAgICAgdGhpcy5wcmVzTWFwWydtZWRpYW5zJ10gPSAnaHR0cDovL2VzdG9zLmRlL25zL21qcyc7XG5cbiAgICAgICAgICAgIHRoaXMucHJlc01hcFsnc291cmNlJyArIHNvdXJjZU51bWJlciArICdfdHlwZSddID0gbXR5cGU7XG4gICAgICAgICAgICB0aGlzLnByZXNNYXBbJ3NvdXJjZScgKyBzb3VyY2VOdW1iZXIgKyAnX3NzcmMnXSA9IHNzcmNzO1xuICAgICAgICAgICAgdGhpcy5wcmVzTWFwWydzb3VyY2UnICsgc291cmNlTnVtYmVyICsgJ19kaXJlY3Rpb24nXSA9IGRpcmVjdGlvbjtcbiAgICAgICAgfSxcbiAgICAgICAgY2xlYXJQcmVzZW5jZU1lZGlhOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyh0aGlzLnByZXNNYXApLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgIGlmIChrZXkuaW5kZXhPZignc291cmNlJykgIT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHNlbGYucHJlc01hcFtrZXldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBhZGRQcmV6aVRvUHJlc2VuY2U6IGZ1bmN0aW9uICh1cmwsIGN1cnJlbnRTbGlkZSkge1xuICAgICAgICAgICAgdGhpcy5wcmVzTWFwWydwcmV6aW5zJ10gPSAnaHR0cDovL2ppdHNpLm9yZy9qaXRtZWV0L3ByZXppJztcbiAgICAgICAgICAgIHRoaXMucHJlc01hcFsncHJleml1cmwnXSA9IHVybDtcbiAgICAgICAgICAgIHRoaXMucHJlc01hcFsncHJlemljdXJyZW50J10gPSBjdXJyZW50U2xpZGU7XG4gICAgICAgIH0sXG4gICAgICAgIHJlbW92ZVByZXppRnJvbVByZXNlbmNlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5wcmVzTWFwWydwcmV6aW5zJ107XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5wcmVzTWFwWydwcmV6aXVybCddO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMucHJlc01hcFsncHJlemljdXJyZW50J107XG4gICAgICAgIH0sXG4gICAgICAgIGFkZEN1cnJlbnRTbGlkZVRvUHJlc2VuY2U6IGZ1bmN0aW9uIChjdXJyZW50U2xpZGUpIHtcbiAgICAgICAgICAgIHRoaXMucHJlc01hcFsncHJlemljdXJyZW50J10gPSBjdXJyZW50U2xpZGU7XG4gICAgICAgIH0sXG4gICAgICAgIGdldFByZXppOiBmdW5jdGlvbiAocm9vbWppZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJlemlNYXBbcm9vbWppZF07XG4gICAgICAgIH0sXG4gICAgICAgIGFkZEV0aGVycGFkVG9QcmVzZW5jZTogZnVuY3Rpb24gKGV0aGVycGFkTmFtZSkge1xuICAgICAgICAgICAgdGhpcy5wcmVzTWFwWydldGhlcnBhZG5zJ10gPSAnaHR0cDovL2ppdHNpLm9yZy9qaXRtZWV0L2V0aGVycGFkJztcbiAgICAgICAgICAgIHRoaXMucHJlc01hcFsnZXRoZXJwYWRuYW1lJ10gPSBldGhlcnBhZE5hbWU7XG4gICAgICAgIH0sXG4gICAgICAgIGFkZEF1ZGlvSW5mb1RvUHJlc2VuY2U6IGZ1bmN0aW9uIChpc011dGVkKSB7XG4gICAgICAgICAgICB0aGlzLnByZXNNYXBbJ2F1ZGlvbnMnXSA9ICdodHRwOi8vaml0c2kub3JnL2ppdG1lZXQvYXVkaW8nO1xuICAgICAgICAgICAgdGhpcy5wcmVzTWFwWydhdWRpb211dGVkJ10gPSBpc011dGVkLnRvU3RyaW5nKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGFkZFZpZGVvSW5mb1RvUHJlc2VuY2U6IGZ1bmN0aW9uIChpc011dGVkKSB7XG4gICAgICAgICAgICB0aGlzLnByZXNNYXBbJ3ZpZGVvbnMnXSA9ICdodHRwOi8vaml0c2kub3JnL2ppdG1lZXQvdmlkZW8nO1xuICAgICAgICAgICAgdGhpcy5wcmVzTWFwWyd2aWRlb211dGVkJ10gPSBpc011dGVkLnRvU3RyaW5nKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZpbmRKaWRGcm9tUmVzb3VyY2U6IGZ1bmN0aW9uIChyZXNvdXJjZUppZCkge1xuICAgICAgICAgICAgdmFyIHBlZXJKaWQgPSBudWxsO1xuICAgICAgICAgICAgT2JqZWN0LmtleXModGhpcy5tZW1iZXJzKS5zb21lKGZ1bmN0aW9uIChqaWQpIHtcbiAgICAgICAgICAgICAgICBwZWVySmlkID0gamlkO1xuICAgICAgICAgICAgICAgIHJldHVybiBTdHJvcGhlLmdldFJlc291cmNlRnJvbUppZChqaWQpID09PSByZXNvdXJjZUppZDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIHBlZXJKaWQ7XG4gICAgICAgIH0sXG4gICAgICAgIGFkZEJyaWRnZUlzRG93blRvUHJlc2VuY2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMucHJlc01hcFsnYnJpZGdlSXNEb3duJ10gPSB0cnVlO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4iLCJ2YXIgU0RQID0gcmVxdWlyZShcIi4vc3Ryb3BoZS5qaW5nbGUuc2RwXCIpO1xuXG5mdW5jdGlvbiBUcmFjZWFibGVQZWVyQ29ubmVjdGlvbihpY2VfY29uZmlnLCBjb25zdHJhaW50cykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgUlRDUGVlcmNvbm5lY3Rpb24gPSBuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhID8gbW96UlRDUGVlckNvbm5lY3Rpb24gOiB3ZWJraXRSVENQZWVyQ29ubmVjdGlvbjtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uID0gbmV3IFJUQ1BlZXJjb25uZWN0aW9uKGljZV9jb25maWcsIGNvbnN0cmFpbnRzKTtcbiAgICB0aGlzLnVwZGF0ZUxvZyA9IFtdO1xuICAgIHRoaXMuc3RhdHMgPSB7fTtcbiAgICB0aGlzLnN0YXRzaW50ZXJ2YWwgPSBudWxsO1xuICAgIHRoaXMubWF4c3RhdHMgPSAwOyAvLyBsaW1pdCB0byAzMDAgdmFsdWVzLCBpLmUuIDUgbWludXRlczsgc2V0IHRvIDAgdG8gZGlzYWJsZVxuXG4gICAgLyoqXG4gICAgICogQXJyYXkgb2Ygc3NyY3MgdGhhdCB3aWxsIGJlIGFkZGVkIG9uIG5leHQgbW9kaWZ5U291cmNlcyBjYWxsLlxuICAgICAqIEB0eXBlIHtBcnJheX1cbiAgICAgKi9cbiAgICB0aGlzLmFkZHNzcmMgPSBbXTtcbiAgICAvKipcbiAgICAgKiBBcnJheSBvZiBzc3JjcyB0aGF0IHdpbGwgYmUgYWRkZWQgb24gbmV4dCBtb2RpZnlTb3VyY2VzIGNhbGwuXG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqL1xuICAgIHRoaXMucmVtb3Zlc3NyYyA9IFtdO1xuICAgIC8qKlxuICAgICAqIFBlbmRpbmcgb3BlcmF0aW9uIHRoYXQgd2lsbCBiZSBkb25lIGR1cmluZyBtb2RpZnlTb3VyY2VzIGNhbGwuXG4gICAgICogQ3VycmVudGx5ICdtdXRlJy8ndW5tdXRlJyBvcGVyYXRpb25zIGFyZSBzdXBwb3J0ZWQuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7U3RyaW5nfVxuICAgICAqL1xuICAgIHRoaXMucGVuZGluZ29wID0gbnVsbDtcblxuICAgIC8qKlxuICAgICAqIEZsYWcgaW5kaWNhdGVzIHRoYXQgcGVlciBjb25uZWN0aW9uIHN0cmVhbSBoYXZlIGNoYW5nZWQgYW5kIG1vZGlmeVNvdXJjZXMgc2hvdWxkIHByb2NlZWQuXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgdGhpcy5zd2l0Y2hzdHJlYW1zID0gZmFsc2U7XG5cbiAgICAvLyBvdmVycmlkZSBhcyBkZXNpcmVkXG4gICAgdGhpcy50cmFjZSA9IGZ1bmN0aW9uICh3aGF0LCBpbmZvKSB7XG4gICAgICAgIC8vY29uc29sZS53YXJuKCdXVFJBQ0UnLCB3aGF0LCBpbmZvKTtcbiAgICAgICAgc2VsZi51cGRhdGVMb2cucHVzaCh7XG4gICAgICAgICAgICB0aW1lOiBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgdHlwZTogd2hhdCxcbiAgICAgICAgICAgIHZhbHVlOiBpbmZvIHx8IFwiXCJcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICB0aGlzLm9uaWNlY2FuZGlkYXRlID0gbnVsbDtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLm9uaWNlY2FuZGlkYXRlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHNlbGYudHJhY2UoJ29uaWNlY2FuZGlkYXRlJywgSlNPTi5zdHJpbmdpZnkoZXZlbnQuY2FuZGlkYXRlLCBudWxsLCAnICcpKTtcbiAgICAgICAgaWYgKHNlbGYub25pY2VjYW5kaWRhdGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHNlbGYub25pY2VjYW5kaWRhdGUoZXZlbnQpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLm9uYWRkc3RyZWFtID0gbnVsbDtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLm9uYWRkc3RyZWFtID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHNlbGYudHJhY2UoJ29uYWRkc3RyZWFtJywgZXZlbnQuc3RyZWFtLmlkKTtcbiAgICAgICAgaWYgKHNlbGYub25hZGRzdHJlYW0gIT09IG51bGwpIHtcbiAgICAgICAgICAgIHNlbGYub25hZGRzdHJlYW0oZXZlbnQpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLm9ucmVtb3Zlc3RyZWFtID0gbnVsbDtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLm9ucmVtb3Zlc3RyZWFtID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHNlbGYudHJhY2UoJ29ucmVtb3Zlc3RyZWFtJywgZXZlbnQuc3RyZWFtLmlkKTtcbiAgICAgICAgaWYgKHNlbGYub25yZW1vdmVzdHJlYW0gIT09IG51bGwpIHtcbiAgICAgICAgICAgIHNlbGYub25yZW1vdmVzdHJlYW0oZXZlbnQpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLm9uc2lnbmFsaW5nc3RhdGVjaGFuZ2UgPSBudWxsO1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24ub25zaWduYWxpbmdzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBzZWxmLnRyYWNlKCdvbnNpZ25hbGluZ3N0YXRlY2hhbmdlJywgc2VsZi5zaWduYWxpbmdTdGF0ZSk7XG4gICAgICAgIGlmIChzZWxmLm9uc2lnbmFsaW5nc3RhdGVjaGFuZ2UgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHNlbGYub25zaWduYWxpbmdzdGF0ZWNoYW5nZShldmVudCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMub25pY2Vjb25uZWN0aW9uc3RhdGVjaGFuZ2UgPSBudWxsO1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24ub25pY2Vjb25uZWN0aW9uc3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgc2VsZi50cmFjZSgnb25pY2Vjb25uZWN0aW9uc3RhdGVjaGFuZ2UnLCBzZWxmLmljZUNvbm5lY3Rpb25TdGF0ZSk7XG4gICAgICAgIGlmIChzZWxmLm9uaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlICE9PSBudWxsKSB7XG4gICAgICAgICAgICBzZWxmLm9uaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlKGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5vbm5lZ290aWF0aW9ubmVlZGVkID0gbnVsbDtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLm9ubmVnb3RpYXRpb25uZWVkZWQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgc2VsZi50cmFjZSgnb25uZWdvdGlhdGlvbm5lZWRlZCcpO1xuICAgICAgICBpZiAoc2VsZi5vbm5lZ290aWF0aW9ubmVlZGVkICE9PSBudWxsKSB7XG4gICAgICAgICAgICBzZWxmLm9ubmVnb3RpYXRpb25uZWVkZWQoZXZlbnQpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBzZWxmLm9uZGF0YWNoYW5uZWwgPSBudWxsO1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24ub25kYXRhY2hhbm5lbCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBzZWxmLnRyYWNlKCdvbmRhdGFjaGFubmVsJywgZXZlbnQpO1xuICAgICAgICBpZiAoc2VsZi5vbmRhdGFjaGFubmVsICE9PSBudWxsKSB7XG4gICAgICAgICAgICBzZWxmLm9uZGF0YWNoYW5uZWwoZXZlbnQpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBpZiAoIW5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEgJiYgdGhpcy5tYXhzdGF0cykge1xuICAgICAgICB0aGlzLnN0YXRzaW50ZXJ2YWwgPSB3aW5kb3cuc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzZWxmLnBlZXJjb25uZWN0aW9uLmdldFN0YXRzKGZ1bmN0aW9uKHN0YXRzKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSBzdGF0cy5yZXN1bHQoKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlc3VsdHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhyZXN1bHRzW2ldLnR5cGUsIHJlc3VsdHNbaV0uaWQsIHJlc3VsdHNbaV0ubmFtZXMoKSlcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHNbaV0ubmFtZXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWQgPSByZXN1bHRzW2ldLmlkICsgJy0nICsgbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghc2VsZi5zdGF0c1tpZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnN0YXRzW2lkXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnRUaW1lOiBub3csXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZFRpbWU6IG5vdyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVzOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZXM6IFtdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuc3RhdHNbaWRdLnZhbHVlcy5wdXNoKHJlc3VsdHNbaV0uc3RhdChuYW1lKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnN0YXRzW2lkXS50aW1lcy5wdXNoKG5vdy5nZXRUaW1lKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuc3RhdHNbaWRdLnZhbHVlcy5sZW5ndGggPiBzZWxmLm1heHN0YXRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5zdGF0c1tpZF0udmFsdWVzLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5zdGF0c1tpZF0udGltZXMuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuc3RhdHNbaWRdLmVuZFRpbWUgPSBub3c7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0sIDEwMDApO1xuICAgIH1cbn07XG5cbmR1bXBTRFAgPSBmdW5jdGlvbihkZXNjcmlwdGlvbikge1xuICAgIHJldHVybiAndHlwZTogJyArIGRlc2NyaXB0aW9uLnR5cGUgKyAnXFxyXFxuJyArIGRlc2NyaXB0aW9uLnNkcDtcbn1cblxuaWYgKFRyYWNlYWJsZVBlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5fX2RlZmluZUdldHRlcl9fICE9PSB1bmRlZmluZWQpIHtcbiAgICBUcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuX19kZWZpbmVHZXR0ZXJfXygnc2lnbmFsaW5nU3RhdGUnLCBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMucGVlcmNvbm5lY3Rpb24uc2lnbmFsaW5nU3RhdGU7IH0pO1xuICAgIFRyYWNlYWJsZVBlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5fX2RlZmluZUdldHRlcl9fKCdpY2VDb25uZWN0aW9uU3RhdGUnLCBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMucGVlcmNvbm5lY3Rpb24uaWNlQ29ubmVjdGlvblN0YXRlOyB9KTtcbiAgICBUcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuX19kZWZpbmVHZXR0ZXJfXygnbG9jYWxEZXNjcmlwdGlvbicsIGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc2ltdWxjYXN0ID0gbmV3IFNpbXVsY2FzdCgpO1xuICAgICAgICB2YXIgcHVibGljTG9jYWxEZXNjcmlwdGlvbiA9IHNpbXVsY2FzdC5yZXZlcnNlVHJhbnNmb3JtTG9jYWxEZXNjcmlwdGlvbih0aGlzLnBlZXJjb25uZWN0aW9uLmxvY2FsRGVzY3JpcHRpb24pO1xuICAgICAgICByZXR1cm4gcHVibGljTG9jYWxEZXNjcmlwdGlvbjtcbiAgICB9KTtcbiAgICBUcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuX19kZWZpbmVHZXR0ZXJfXygncmVtb3RlRGVzY3JpcHRpb24nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHNpbXVsY2FzdCA9IG5ldyBTaW11bGNhc3QoKTtcbiAgICAgICAgdmFyIHB1YmxpY1JlbW90ZURlc2NyaXB0aW9uID0gc2ltdWxjYXN0LnJldmVyc2VUcmFuc2Zvcm1SZW1vdGVEZXNjcmlwdGlvbih0aGlzLnBlZXJjb25uZWN0aW9uLnJlbW90ZURlc2NyaXB0aW9uKTtcbiAgICAgICAgcmV0dXJuIHB1YmxpY1JlbW90ZURlc2NyaXB0aW9uO1xuICAgIH0pO1xufVxuXG5UcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkU3RyZWFtID0gZnVuY3Rpb24gKHN0cmVhbSkge1xuICAgIHRoaXMudHJhY2UoJ2FkZFN0cmVhbScsIHN0cmVhbS5pZCk7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5hZGRTdHJlYW0oc3RyZWFtKTtcbn07XG5cblRyYWNlYWJsZVBlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVTdHJlYW0gPSBmdW5jdGlvbiAoc3RyZWFtKSB7XG4gICAgdGhpcy50cmFjZSgncmVtb3ZlU3RyZWFtJywgc3RyZWFtLmlkKTtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLnJlbW92ZVN0cmVhbShzdHJlYW0pO1xufTtcblxuVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmNyZWF0ZURhdGFDaGFubmVsID0gZnVuY3Rpb24gKGxhYmVsLCBvcHRzKSB7XG4gICAgdGhpcy50cmFjZSgnY3JlYXRlRGF0YUNoYW5uZWwnLCBsYWJlbCwgb3B0cyk7XG4gICAgcmV0dXJuIHRoaXMucGVlcmNvbm5lY3Rpb24uY3JlYXRlRGF0YUNoYW5uZWwobGFiZWwsIG9wdHMpO1xufTtcblxuVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnNldExvY2FsRGVzY3JpcHRpb24gPSBmdW5jdGlvbiAoZGVzY3JpcHRpb24sIHN1Y2Nlc3NDYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBzaW11bGNhc3QgPSBuZXcgU2ltdWxjYXN0KCk7XG4gICAgZGVzY3JpcHRpb24gPSBzaW11bGNhc3QudHJhbnNmb3JtTG9jYWxEZXNjcmlwdGlvbihkZXNjcmlwdGlvbik7XG4gICAgdGhpcy50cmFjZSgnc2V0TG9jYWxEZXNjcmlwdGlvbicsIGR1bXBTRFAoZGVzY3JpcHRpb24pKTtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLnNldExvY2FsRGVzY3JpcHRpb24oZGVzY3JpcHRpb24sXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYudHJhY2UoJ3NldExvY2FsRGVzY3JpcHRpb25PblN1Y2Nlc3MnKTtcbiAgICAgICAgICAgIHN1Y2Nlc3NDYWxsYmFjaygpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBzZWxmLnRyYWNlKCdzZXRMb2NhbERlc2NyaXB0aW9uT25GYWlsdXJlJywgZXJyKTtcbiAgICAgICAgICAgIGZhaWx1cmVDYWxsYmFjayhlcnIpO1xuICAgICAgICB9XG4gICAgKTtcbiAgICAvKlxuICAgICBpZiAodGhpcy5zdGF0c2ludGVydmFsID09PSBudWxsICYmIHRoaXMubWF4c3RhdHMgPiAwKSB7XG4gICAgIC8vIHN0YXJ0IGdhdGhlcmluZyBzdGF0c1xuICAgICB9XG4gICAgICovXG59O1xuXG5UcmFjZWFibGVQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuc2V0UmVtb3RlRGVzY3JpcHRpb24gPSBmdW5jdGlvbiAoZGVzY3JpcHRpb24sIHN1Y2Nlc3NDYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBzaW11bGNhc3QgPSBuZXcgU2ltdWxjYXN0KCk7XG4gICAgZGVzY3JpcHRpb24gPSBzaW11bGNhc3QudHJhbnNmb3JtUmVtb3RlRGVzY3JpcHRpb24oZGVzY3JpcHRpb24pO1xuICAgIHRoaXMudHJhY2UoJ3NldFJlbW90ZURlc2NyaXB0aW9uJywgZHVtcFNEUChkZXNjcmlwdGlvbikpO1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uc2V0UmVtb3RlRGVzY3JpcHRpb24oZGVzY3JpcHRpb24sXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYudHJhY2UoJ3NldFJlbW90ZURlc2NyaXB0aW9uT25TdWNjZXNzJyk7XG4gICAgICAgICAgICBzdWNjZXNzQ2FsbGJhY2soKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgc2VsZi50cmFjZSgnc2V0UmVtb3RlRGVzY3JpcHRpb25PbkZhaWx1cmUnLCBlcnIpO1xuICAgICAgICAgICAgZmFpbHVyZUNhbGxiYWNrKGVycik7XG4gICAgICAgIH1cbiAgICApO1xuICAgIC8qXG4gICAgIGlmICh0aGlzLnN0YXRzaW50ZXJ2YWwgPT09IG51bGwgJiYgdGhpcy5tYXhzdGF0cyA+IDApIHtcbiAgICAgLy8gc3RhcnQgZ2F0aGVyaW5nIHN0YXRzXG4gICAgIH1cbiAgICAgKi9cbn07XG5cblRyYWNlYWJsZVBlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5oYXJkTXV0ZVZpZGVvID0gZnVuY3Rpb24gKG11dGVkKSB7XG4gICAgdGhpcy5wZW5kaW5nb3AgPSBtdXRlZCA/ICdtdXRlJyA6ICd1bm11dGUnO1xufTtcblxuVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmVucXVldWVBZGRTc3JjID0gZnVuY3Rpb24oY2hhbm5lbCwgc3NyY0xpbmVzKSB7XG4gICAgaWYgKCF0aGlzLmFkZHNzcmNbY2hhbm5lbF0pIHtcbiAgICAgICAgdGhpcy5hZGRzc3JjW2NoYW5uZWxdID0gJyc7XG4gICAgfVxuICAgIHRoaXMuYWRkc3NyY1tjaGFubmVsXSArPSBzc3JjTGluZXM7XG59XG5cblRyYWNlYWJsZVBlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRTb3VyY2UgPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgIGNvbnNvbGUubG9nKCdhZGRzc3JjJywgbmV3IERhdGUoKS5nZXRUaW1lKCkpO1xuICAgIGNvbnNvbGUubG9nKCdpY2UnLCB0aGlzLmljZUNvbm5lY3Rpb25TdGF0ZSk7XG4gICAgdmFyIHNkcCA9IG5ldyBTRFAodGhpcy5yZW1vdGVEZXNjcmlwdGlvbi5zZHApO1xuICAgIHZhciBteVNkcCA9IG5ldyBTRFAodGhpcy5wZWVyY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uLnNkcCk7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgJChlbGVtKS5lYWNoKGZ1bmN0aW9uIChpZHgsIGNvbnRlbnQpIHtcbiAgICAgICAgdmFyIG5hbWUgPSAkKGNvbnRlbnQpLmF0dHIoJ25hbWUnKTtcbiAgICAgICAgdmFyIGxpbmVzID0gJyc7XG4gICAgICAgIHRtcCA9ICQoY29udGVudCkuZmluZCgnc3NyYy1ncm91cFt4bWxucz1cInVybjp4bXBwOmppbmdsZTphcHBzOnJ0cDpzc21hOjBcIl0nKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbWFudGljcyA9IHRoaXMuZ2V0QXR0cmlidXRlKCdzZW1hbnRpY3MnKTtcbiAgICAgICAgICAgIHZhciBzc3JjcyA9ICQodGhpcykuZmluZCgnPnNvdXJjZScpLm1hcChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdzc3JjJyk7XG4gICAgICAgICAgICB9KS5nZXQoKTtcblxuICAgICAgICAgICAgaWYgKHNzcmNzLmxlbmd0aCAhPSAwKSB7XG4gICAgICAgICAgICAgICAgbGluZXMgKz0gJ2E9c3NyYy1ncm91cDonICsgc2VtYW50aWNzICsgJyAnICsgc3NyY3Muam9pbignICcpICsgJ1xcclxcbic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0bXAgPSAkKGNvbnRlbnQpLmZpbmQoJ3NvdXJjZVt4bWxucz1cInVybjp4bXBwOmppbmdsZTphcHBzOnJ0cDpzc21hOjBcIl0nKTsgLy8gY2FuIGhhbmRsZSBib3RoID5zb3VyY2UgYW5kID5kZXNjcmlwdGlvbj5zb3VyY2VcbiAgICAgICAgdG1wLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHNzcmMgPSAkKHRoaXMpLmF0dHIoJ3NzcmMnKTtcbiAgICAgICAgICAgIGlmKG15U2RwLmNvbnRhaW5zU1NSQyhzc3JjKSl7XG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogVGhpcyBoYXBwZW5zIHdoZW4gbXVsdGlwbGUgcGFydGljaXBhbnRzIGNoYW5nZSB0aGVpciBzdHJlYW1zIGF0IHRoZSBzYW1lIHRpbWUgYW5kXG4gICAgICAgICAgICAgICAgICogQ29saWJyaUZvY3VzLm1vZGlmeVNvdXJjZXMgaGF2ZSB0byB3YWl0IGZvciBzdGFibGUgc3RhdGUuIEluIHRoZSBtZWFudGltZSBtdWx0aXBsZVxuICAgICAgICAgICAgICAgICAqIGFkZHNzcmMgYXJlIHNjaGVkdWxlZCBmb3IgdXBkYXRlIElRLiBTZWVcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJHb3QgYWRkIHN0cmVhbSByZXF1ZXN0IGZvciBteSBvd24gc3NyYzogXCIrc3NyYyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJCh0aGlzKS5maW5kKCc+cGFyYW1ldGVyJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbGluZXMgKz0gJ2E9c3NyYzonICsgc3NyYyArICcgJyArICQodGhpcykuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgICAgIGlmICgkKHRoaXMpLmF0dHIoJ3ZhbHVlJykgJiYgJCh0aGlzKS5hdHRyKCd2YWx1ZScpLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgbGluZXMgKz0gJzonICsgJCh0aGlzKS5hdHRyKCd2YWx1ZScpO1xuICAgICAgICAgICAgICAgIGxpbmVzICs9ICdcXHJcXG4nO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBzZHAubWVkaWEuZm9yRWFjaChmdW5jdGlvbihtZWRpYSwgaWR4KSB7XG4gICAgICAgICAgICBpZiAoIVNEUFV0aWwuZmluZF9saW5lKG1lZGlhLCAnYT1taWQ6JyArIG5hbWUpKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIHNkcC5tZWRpYVtpZHhdICs9IGxpbmVzO1xuICAgICAgICAgICAgc2VsZi5lbnF1ZXVlQWRkU3NyYyhpZHgsIGxpbmVzKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHNkcC5yYXcgPSBzZHAuc2Vzc2lvbiArIHNkcC5tZWRpYS5qb2luKCcnKTtcbiAgICB9KTtcbn07XG5cblRyYWNlYWJsZVBlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5lbnF1ZXVlUmVtb3ZlU3NyYyA9IGZ1bmN0aW9uKGNoYW5uZWwsIHNzcmNMaW5lcykge1xuICAgIGlmICghdGhpcy5yZW1vdmVzc3JjW2NoYW5uZWxdKXtcbiAgICAgICAgdGhpcy5yZW1vdmVzc3JjW2NoYW5uZWxdID0gJyc7XG4gICAgfVxuICAgIHRoaXMucmVtb3Zlc3NyY1tjaGFubmVsXSArPSBzc3JjTGluZXM7XG59XG5cblRyYWNlYWJsZVBlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVTb3VyY2UgPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgIGNvbnNvbGUubG9nKCdyZW1vdmVzc3JjJywgbmV3IERhdGUoKS5nZXRUaW1lKCkpO1xuICAgIGNvbnNvbGUubG9nKCdpY2UnLCB0aGlzLmljZUNvbm5lY3Rpb25TdGF0ZSk7XG4gICAgdmFyIHNkcCA9IG5ldyBTRFAodGhpcy5yZW1vdGVEZXNjcmlwdGlvbi5zZHApO1xuICAgIHZhciBteVNkcCA9IG5ldyBTRFAodGhpcy5wZWVyY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uLnNkcCk7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgJChlbGVtKS5lYWNoKGZ1bmN0aW9uIChpZHgsIGNvbnRlbnQpIHtcbiAgICAgICAgdmFyIG5hbWUgPSAkKGNvbnRlbnQpLmF0dHIoJ25hbWUnKTtcbiAgICAgICAgdmFyIGxpbmVzID0gJyc7XG4gICAgICAgIHRtcCA9ICQoY29udGVudCkuZmluZCgnc3NyYy1ncm91cFt4bWxucz1cInVybjp4bXBwOmppbmdsZTphcHBzOnJ0cDpzc21hOjBcIl0nKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHNlbWFudGljcyA9IHRoaXMuZ2V0QXR0cmlidXRlKCdzZW1hbnRpY3MnKTtcbiAgICAgICAgICAgIHZhciBzc3JjcyA9ICQodGhpcykuZmluZCgnPnNvdXJjZScpLm1hcChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdzc3JjJyk7XG4gICAgICAgICAgICB9KS5nZXQoKTtcblxuICAgICAgICAgICAgaWYgKHNzcmNzLmxlbmd0aCAhPSAwKSB7XG4gICAgICAgICAgICAgICAgbGluZXMgKz0gJ2E9c3NyYy1ncm91cDonICsgc2VtYW50aWNzICsgJyAnICsgc3NyY3Muam9pbignICcpICsgJ1xcclxcbic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0bXAgPSAkKGNvbnRlbnQpLmZpbmQoJ3NvdXJjZVt4bWxucz1cInVybjp4bXBwOmppbmdsZTphcHBzOnJ0cDpzc21hOjBcIl0nKTsgLy8gY2FuIGhhbmRsZSBib3RoID5zb3VyY2UgYW5kID5kZXNjcmlwdGlvbj5zb3VyY2VcbiAgICAgICAgdG1wLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHNzcmMgPSAkKHRoaXMpLmF0dHIoJ3NzcmMnKTtcbiAgICAgICAgICAgIC8vIFRoaXMgc2hvdWxkIG5ldmVyIGhhcHBlbiwgYnV0IGNhbiBiZSB1c2VmdWwgZm9yIGJ1ZyBkZXRlY3Rpb25cbiAgICAgICAgICAgIGlmKG15U2RwLmNvbnRhaW5zU1NSQyhzc3JjKSl7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkdvdCByZW1vdmUgc3RyZWFtIHJlcXVlc3QgZm9yIG15IG93biBzc3JjOiBcIitzc3JjKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkKHRoaXMpLmZpbmQoJz5wYXJhbWV0ZXInKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBsaW5lcyArPSAnYT1zc3JjOicgKyBzc3JjICsgJyAnICsgJCh0aGlzKS5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgICAgICAgaWYgKCQodGhpcykuYXR0cigndmFsdWUnKSAmJiAkKHRoaXMpLmF0dHIoJ3ZhbHVlJykubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBsaW5lcyArPSAnOicgKyAkKHRoaXMpLmF0dHIoJ3ZhbHVlJyk7XG4gICAgICAgICAgICAgICAgbGluZXMgKz0gJ1xcclxcbic7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHNkcC5tZWRpYS5mb3JFYWNoKGZ1bmN0aW9uKG1lZGlhLCBpZHgpIHtcbiAgICAgICAgICAgIGlmICghU0RQVXRpbC5maW5kX2xpbmUobWVkaWEsICdhPW1pZDonICsgbmFtZSkpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgc2RwLm1lZGlhW2lkeF0gKz0gbGluZXM7XG4gICAgICAgICAgICBzZWxmLmVucXVldWVSZW1vdmVTc3JjKGlkeCwgbGluZXMpO1xuICAgICAgICB9KTtcbiAgICAgICAgc2RwLnJhdyA9IHNkcC5zZXNzaW9uICsgc2RwLm1lZGlhLmpvaW4oJycpO1xuICAgIH0pO1xufTtcblxuVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLm1vZGlmeVNvdXJjZXMgPSBmdW5jdGlvbihzdWNjZXNzQ2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHRoaXMuc2lnbmFsaW5nU3RhdGUgPT0gJ2Nsb3NlZCcpIHJldHVybjtcbiAgICBpZiAoISh0aGlzLmFkZHNzcmMubGVuZ3RoIHx8IHRoaXMucmVtb3Zlc3NyYy5sZW5ndGggfHwgdGhpcy5wZW5kaW5nb3AgIT09IG51bGwgfHwgdGhpcy5zd2l0Y2hzdHJlYW1zKSl7XG4gICAgICAgIC8vIFRoZXJlIGlzIG5vdGhpbmcgdG8gZG8gc2luY2Ugc2NoZWR1bGVkIGpvYiBtaWdodCBoYXZlIGJlZW4gZXhlY3V0ZWQgYnkgYW5vdGhlciBzdWNjZWVkaW5nIGNhbGxcbiAgICAgICAgaWYoc3VjY2Vzc0NhbGxiYWNrKXtcbiAgICAgICAgICAgIHN1Y2Nlc3NDYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBGSVhNRTogdGhpcyBpcyBhIGJpZyBoYWNrXG4gICAgLy8gaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC93ZWJydGMvaXNzdWVzL2RldGFpbD9pZD0yNjg4XG4gICAgaWYgKCEodGhpcy5zaWduYWxpbmdTdGF0ZSA9PSAnc3RhYmxlJyAmJiB0aGlzLmljZUNvbm5lY3Rpb25TdGF0ZSA9PSAnY29ubmVjdGVkJykpIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdtb2RpZnlTb3VyY2VzIG5vdCB5ZXQnLCB0aGlzLnNpZ25hbGluZ1N0YXRlLCB0aGlzLmljZUNvbm5lY3Rpb25TdGF0ZSk7XG4gICAgICAgIHRoaXMud2FpdCA9IHRydWU7XG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBzZWxmLm1vZGlmeVNvdXJjZXMoc3VjY2Vzc0NhbGxiYWNrKTsgfSwgMjUwKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAodGhpcy53YWl0KSB7XG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBzZWxmLm1vZGlmeVNvdXJjZXMoc3VjY2Vzc0NhbGxiYWNrKTsgfSwgMjUwMCk7XG4gICAgICAgIHRoaXMud2FpdCA9IGZhbHNlO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gUmVzZXQgc3dpdGNoIHN0cmVhbXMgZmxhZ1xuICAgIHRoaXMuc3dpdGNoc3RyZWFtcyA9IGZhbHNlO1xuXG4gICAgdmFyIHNkcCA9IG5ldyBTRFAodGhpcy5yZW1vdGVEZXNjcmlwdGlvbi5zZHApO1xuXG4gICAgLy8gYWRkIHNvdXJjZXNcbiAgICB0aGlzLmFkZHNzcmMuZm9yRWFjaChmdW5jdGlvbihsaW5lcywgaWR4KSB7XG4gICAgICAgIHNkcC5tZWRpYVtpZHhdICs9IGxpbmVzO1xuICAgIH0pO1xuICAgIHRoaXMuYWRkc3NyYyA9IFtdO1xuXG4gICAgLy8gcmVtb3ZlIHNvdXJjZXNcbiAgICB0aGlzLnJlbW92ZXNzcmMuZm9yRWFjaChmdW5jdGlvbihsaW5lcywgaWR4KSB7XG4gICAgICAgIGxpbmVzID0gbGluZXMuc3BsaXQoJ1xcclxcbicpO1xuICAgICAgICBsaW5lcy5wb3AoKTsgLy8gcmVtb3ZlIGVtcHR5IGxhc3QgZWxlbWVudDtcbiAgICAgICAgbGluZXMuZm9yRWFjaChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICBzZHAubWVkaWFbaWR4XSA9IHNkcC5tZWRpYVtpZHhdLnJlcGxhY2UobGluZSArICdcXHJcXG4nLCAnJyk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHRoaXMucmVtb3Zlc3NyYyA9IFtdO1xuXG4gICAgc2RwLnJhdyA9IHNkcC5zZXNzaW9uICsgc2RwLm1lZGlhLmpvaW4oJycpO1xuICAgIHRoaXMuc2V0UmVtb3RlRGVzY3JpcHRpb24obmV3IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbih7dHlwZTogJ29mZmVyJywgc2RwOiBzZHAucmF3fSksXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICBpZihzZWxmLnNpZ25hbGluZ1N0YXRlID09ICdjbG9zZWQnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcImNyZWF0ZUFuc3dlciBhdHRlbXB0IG9uIGNsb3NlZCBzdGF0ZVwiKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNlbGYuY3JlYXRlQW5zd2VyKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG1vZGlmaWVkQW5zd2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNoYW5nZSB2aWRlbyBkaXJlY3Rpb24sIHNlZSBodHRwczovL2dpdGh1Yi5jb20vaml0c2kvaml0bWVldC9pc3N1ZXMvNDFcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYucGVuZGluZ29wICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2RwID0gbmV3IFNEUChtb2RpZmllZEFuc3dlci5zZHApO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNkcC5tZWRpYS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoKHNlbGYucGVuZGluZ29wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ211dGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2RwLm1lZGlhWzFdID0gc2RwLm1lZGlhWzFdLnJlcGxhY2UoJ2E9c2VuZHJlY3YnLCAnYT1yZWN2b25seScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3VubXV0ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZHAubWVkaWFbMV0gPSBzZHAubWVkaWFbMV0ucmVwbGFjZSgnYT1yZWN2b25seScsICdhPXNlbmRyZWN2Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2RwLnJhdyA9IHNkcC5zZXNzaW9uICsgc2RwLm1lZGlhLmpvaW4oJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZGlmaWVkQW5zd2VyLnNkcCA9IHNkcC5yYXc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnBlbmRpbmdvcCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBGSVhNRTogcHVzaGluZyBkb3duIGFuIGFuc3dlciB3aGlsZSBpY2UgY29ubmVjdGlvbiBzdGF0ZVxuICAgICAgICAgICAgICAgICAgICAvLyBpcyBzdGlsbCBjaGVja2luZyBpcyBiYWQuLi5cbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhzZWxmLnBlZXJjb25uZWN0aW9uLmljZUNvbm5lY3Rpb25TdGF0ZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gdHJ5aW5nIHRvIHdvcmsgYXJvdW5kIGFub3RoZXIgY2hyb21lIGJ1Z1xuICAgICAgICAgICAgICAgICAgICAvL21vZGlmaWVkQW5zd2VyLnNkcCA9IG1vZGlmaWVkQW5zd2VyLnNkcC5yZXBsYWNlKC9hPXNldHVwOmFjdGl2ZS9nLCAnYT1zZXR1cDphY3RwYXNzJyk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuc2V0TG9jYWxEZXNjcmlwdGlvbihtb2RpZmllZEFuc3dlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ21vZGlmaWVkIHNldExvY2FsRGVzY3JpcHRpb24gb2snKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihzdWNjZXNzQ2FsbGJhY2spe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzQ2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdtb2RpZmllZCBzZXRMb2NhbERlc2NyaXB0aW9uIGZhaWxlZCcsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ21vZGlmaWVkIGFuc3dlciBmYWlsZWQnLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ21vZGlmeSBmYWlsZWQnLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICApO1xufTtcblxuVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMudHJhY2UoJ3N0b3AnKTtcbiAgICBpZiAodGhpcy5zdGF0c2ludGVydmFsICE9PSBudWxsKSB7XG4gICAgICAgIHdpbmRvdy5jbGVhckludGVydmFsKHRoaXMuc3RhdHNpbnRlcnZhbCk7XG4gICAgICAgIHRoaXMuc3RhdHNpbnRlcnZhbCA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uY2xvc2UoKTtcbn07XG5cblRyYWNlYWJsZVBlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5jcmVhdGVPZmZlciA9IGZ1bmN0aW9uIChzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaywgY29uc3RyYWludHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy50cmFjZSgnY3JlYXRlT2ZmZXInLCBKU09OLnN0cmluZ2lmeShjb25zdHJhaW50cywgbnVsbCwgJyAnKSk7XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5jcmVhdGVPZmZlcihcbiAgICAgICAgZnVuY3Rpb24gKG9mZmVyKSB7XG4gICAgICAgICAgICBzZWxmLnRyYWNlKCdjcmVhdGVPZmZlck9uU3VjY2VzcycsIGR1bXBTRFAob2ZmZXIpKTtcbiAgICAgICAgICAgIHN1Y2Nlc3NDYWxsYmFjayhvZmZlcik7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgc2VsZi50cmFjZSgnY3JlYXRlT2ZmZXJPbkZhaWx1cmUnLCBlcnIpO1xuICAgICAgICAgICAgZmFpbHVyZUNhbGxiYWNrKGVycik7XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnN0cmFpbnRzXG4gICAgKTtcbn07XG5cblRyYWNlYWJsZVBlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5jcmVhdGVBbnN3ZXIgPSBmdW5jdGlvbiAoc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2ssIGNvbnN0cmFpbnRzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMudHJhY2UoJ2NyZWF0ZUFuc3dlcicsIEpTT04uc3RyaW5naWZ5KGNvbnN0cmFpbnRzLCBudWxsLCAnICcpKTtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLmNyZWF0ZUFuc3dlcihcbiAgICAgICAgZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgICAgICAgdmFyIHNpbXVsY2FzdCA9IG5ldyBTaW11bGNhc3QoKTtcbiAgICAgICAgICAgIGFuc3dlciA9IHNpbXVsY2FzdC50cmFuc2Zvcm1BbnN3ZXIoYW5zd2VyKTtcbiAgICAgICAgICAgIHNlbGYudHJhY2UoJ2NyZWF0ZUFuc3dlck9uU3VjY2VzcycsIGR1bXBTRFAoYW5zd2VyKSk7XG4gICAgICAgICAgICBzdWNjZXNzQ2FsbGJhY2soYW5zd2VyKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICBzZWxmLnRyYWNlKCdjcmVhdGVBbnN3ZXJPbkZhaWx1cmUnLCBlcnIpO1xuICAgICAgICAgICAgZmFpbHVyZUNhbGxiYWNrKGVycik7XG4gICAgICAgIH0sXG4gICAgICAgIGNvbnN0cmFpbnRzXG4gICAgKTtcbn07XG5cblRyYWNlYWJsZVBlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRJY2VDYW5kaWRhdGUgPSBmdW5jdGlvbiAoY2FuZGlkYXRlLCBzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLnRyYWNlKCdhZGRJY2VDYW5kaWRhdGUnLCBKU09OLnN0cmluZ2lmeShjYW5kaWRhdGUsIG51bGwsICcgJykpO1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uYWRkSWNlQ2FuZGlkYXRlKGNhbmRpZGF0ZSk7XG4gICAgLyogbWF5YmUgbGF0ZXJcbiAgICAgdGhpcy5wZWVyY29ubmVjdGlvbi5hZGRJY2VDYW5kaWRhdGUoY2FuZGlkYXRlLFxuICAgICBmdW5jdGlvbiAoKSB7XG4gICAgIHNlbGYudHJhY2UoJ2FkZEljZUNhbmRpZGF0ZU9uU3VjY2VzcycpO1xuICAgICBzdWNjZXNzQ2FsbGJhY2soKTtcbiAgICAgfSxcbiAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICBzZWxmLnRyYWNlKCdhZGRJY2VDYW5kaWRhdGVPbkZhaWx1cmUnLCBlcnIpO1xuICAgICBmYWlsdXJlQ2FsbGJhY2soZXJyKTtcbiAgICAgfVxuICAgICApO1xuICAgICAqL1xufTtcblxuVHJhY2VhYmxlUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFN0YXRzID0gZnVuY3Rpb24oY2FsbGJhY2ssIGVycmJhY2spIHtcbiAgICBpZiAobmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSkge1xuICAgICAgICAvLyBpZ25vcmUgZm9yIG5vdy4uLlxuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uZ2V0U3RhdHMoY2FsbGJhY2spO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVHJhY2VhYmxlUGVlckNvbm5lY3Rpb247IiwiLyoganNoaW50IC1XMTE3ICovXG5cbnZhciBKaW5nbGVTZXNzaW9uID0gcmVxdWlyZShcIi4vc3Ryb3BoZS5qaW5nbGUuc2Vzc2lvblwiKTtcbnZhciBYTVBQRXZlbnRzID0gcmVxdWlyZShcIi4uL3NlcnZpY2UveG1wcC9YTVBQRXZlbnRzXCIpO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihldmVudEVtaXR0ZXIpIHtcbiAgICBTdHJvcGhlLmFkZENvbm5lY3Rpb25QbHVnaW4oJ2ppbmdsZScsIHtcbiAgICAgICAgY29ubmVjdGlvbjogbnVsbCxcbiAgICAgICAgc2Vzc2lvbnM6IHt9LFxuICAgICAgICBqaWQyc2Vzc2lvbjoge30sXG4gICAgICAgIGljZV9jb25maWc6IHtpY2VTZXJ2ZXJzOiBbXX0sXG4gICAgICAgIHBjX2NvbnN0cmFpbnRzOiB7fSxcbiAgICAgICAgbWVkaWFfY29uc3RyYWludHM6IHtcbiAgICAgICAgICAgIG1hbmRhdG9yeToge1xuICAgICAgICAgICAgICAgICdPZmZlclRvUmVjZWl2ZUF1ZGlvJzogdHJ1ZSxcbiAgICAgICAgICAgICAgICAnT2ZmZXJUb1JlY2VpdmVWaWRlbyc6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE1vekRvbnRPZmZlckRhdGFDaGFubmVsOiB0cnVlIHdoZW4gdGhpcyBpcyBmaXJlZm94XG4gICAgICAgIH0sXG4gICAgICAgIGxvY2FsQXVkaW86IG51bGwsXG4gICAgICAgIGxvY2FsVmlkZW86IG51bGwsXG5cbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKGNvbm4pIHtcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbiA9IGNvbm47XG4gICAgICAgICAgICBpZiAodGhpcy5jb25uZWN0aW9uLmRpc2NvKSB7XG4gICAgICAgICAgICAgICAgLy8gaHR0cDovL3htcHAub3JnL2V4dGVuc2lvbnMveGVwLTAxNjcuaHRtbCNzdXBwb3J0XG4gICAgICAgICAgICAgICAgLy8gaHR0cDovL3htcHAub3JnL2V4dGVuc2lvbnMveGVwLTAxNzYuaHRtbCNzdXBwb3J0XG4gICAgICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLmRpc2NvLmFkZEZlYXR1cmUoJ3Vybjp4bXBwOmppbmdsZToxJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLmRpc2NvLmFkZEZlYXR1cmUoJ3Vybjp4bXBwOmppbmdsZTphcHBzOnJ0cDoxJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLmRpc2NvLmFkZEZlYXR1cmUoJ3Vybjp4bXBwOmppbmdsZTp0cmFuc3BvcnRzOmljZS11ZHA6MScpO1xuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5kaXNjby5hZGRGZWF0dXJlKCd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6YXVkaW8nKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uZGlzY28uYWRkRmVhdHVyZSgndXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOnZpZGVvJyk7XG5cblxuICAgICAgICAgICAgICAgIC8vIHRoaXMgaXMgZGVhbHQgd2l0aCBieSBTRFAgTy9BIHNvIHdlIGRvbid0IG5lZWQgdG8gYW5ub3VjZSB0aGlzXG4gICAgICAgICAgICAgICAgLy90aGlzLmNvbm5lY3Rpb24uZGlzY28uYWRkRmVhdHVyZSgndXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOnJ0Y3AtZmI6MCcpOyAvLyBYRVAtMDI5M1xuICAgICAgICAgICAgICAgIC8vdGhpcy5jb25uZWN0aW9uLmRpc2NvLmFkZEZlYXR1cmUoJ3Vybjp4bXBwOmppbmdsZTphcHBzOnJ0cDpydHAtaGRyZXh0OjAnKTsgLy8gWEVQLTAyOTRcbiAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uZGlzY28uYWRkRmVhdHVyZSgndXJuOmlldGY6cmZjOjU3NjEnKTsgLy8gcnRjcC1tdXhcbiAgICAgICAgICAgICAgICAvL3RoaXMuY29ubmVjdGlvbi5kaXNjby5hZGRGZWF0dXJlKCd1cm46aWV0ZjpyZmM6NTg4OCcpOyAvLyBhPWdyb3VwLCBlLmcuIGJ1bmRsZVxuICAgICAgICAgICAgICAgIC8vdGhpcy5jb25uZWN0aW9uLmRpc2NvLmFkZEZlYXR1cmUoJ3VybjppZXRmOnJmYzo1NTc2Jyk7IC8vIGE9c3NyY1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLmFkZEhhbmRsZXIodGhpcy5vbkppbmdsZS5iaW5kKHRoaXMpLCAndXJuOnhtcHA6amluZ2xlOjEnLCAnaXEnLCAnc2V0JywgbnVsbCwgbnVsbCk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uSmluZ2xlOiBmdW5jdGlvbiAoaXEpIHtcbiAgICAgICAgICAgIHZhciBzaWQgPSAkKGlxKS5maW5kKCdqaW5nbGUnKS5hdHRyKCdzaWQnKTtcbiAgICAgICAgICAgIHZhciBhY3Rpb24gPSAkKGlxKS5maW5kKCdqaW5nbGUnKS5hdHRyKCdhY3Rpb24nKTtcbiAgICAgICAgICAgIHZhciBmcm9tSmlkID0gaXEuZ2V0QXR0cmlidXRlKCdmcm9tJyk7XG4gICAgICAgICAgICAvLyBzZW5kIGFjayBmaXJzdFxuICAgICAgICAgICAgdmFyIGFjayA9ICRpcSh7dHlwZTogJ3Jlc3VsdCcsXG4gICAgICAgICAgICAgICAgdG86IGZyb21KaWQsXG4gICAgICAgICAgICAgICAgaWQ6IGlxLmdldEF0dHJpYnV0ZSgnaWQnKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb24gamluZ2xlICcgKyBhY3Rpb24gKyAnIGZyb20gJyArIGZyb21KaWQsIGlxKTtcbiAgICAgICAgICAgIHZhciBzZXNzID0gdGhpcy5zZXNzaW9uc1tzaWRdO1xuICAgICAgICAgICAgaWYgKCdzZXNzaW9uLWluaXRpYXRlJyAhPSBhY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBpZiAoc2VzcyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBhY2sudHlwZSA9ICdlcnJvcic7XG4gICAgICAgICAgICAgICAgICAgIGFjay5jKCdlcnJvcicsIHt0eXBlOiAnY2FuY2VsJ30pXG4gICAgICAgICAgICAgICAgICAgICAgICAuYygnaXRlbS1ub3QtZm91bmQnLCB7eG1sbnM6ICd1cm46aWV0ZjpwYXJhbXM6eG1sOm5zOnhtcHAtc3Rhbnphcyd9KS51cCgpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYygndW5rbm93bi1zZXNzaW9uJywge3htbG5zOiAndXJuOnhtcHA6amluZ2xlOmVycm9yczoxJ30pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZChhY2spO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gY29tcGFyZSBmcm9tIHRvIHNlc3MucGVlcmppZCAoYmFyZSBqaWQgY29tcGFyaXNvbiBmb3IgbGF0ZXIgY29tcGF0IHdpdGggbWVzc2FnZS1tb2RlKVxuICAgICAgICAgICAgICAgIC8vIGxvY2FsIGppZCBpcyBub3QgY2hlY2tlZFxuICAgICAgICAgICAgICAgIGlmIChTdHJvcGhlLmdldEJhcmVKaWRGcm9tSmlkKGZyb21KaWQpICE9IFN0cm9waGUuZ2V0QmFyZUppZEZyb21KaWQoc2Vzcy5wZWVyamlkKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ2ppZCBtaXNtYXRjaCBmb3Igc2Vzc2lvbiBpZCcsIHNpZCwgZnJvbUppZCwgc2Vzcy5wZWVyamlkKTtcbiAgICAgICAgICAgICAgICAgICAgYWNrLnR5cGUgPSAnZXJyb3InO1xuICAgICAgICAgICAgICAgICAgICBhY2suYygnZXJyb3InLCB7dHlwZTogJ2NhbmNlbCd9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLmMoJ2l0ZW0tbm90LWZvdW5kJywge3htbG5zOiAndXJuOmlldGY6cGFyYW1zOnhtbDpuczp4bXBwLXN0YW56YXMnfSkudXAoKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmMoJ3Vua25vd24tc2Vzc2lvbicsIHt4bWxuczogJ3Vybjp4bXBwOmppbmdsZTplcnJvcnM6MSd9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmQoYWNrKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChzZXNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBleGlzdGluZyBzZXNzaW9uIHdpdGggc2FtZSBzZXNzaW9uIGlkXG4gICAgICAgICAgICAgICAgLy8gdGhpcyBtaWdodCBiZSBvdXQtb2Ytb3JkZXIgaWYgdGhlIHNlc3MucGVlcmppZCBpcyB0aGUgc2FtZSBhcyBmcm9tXG4gICAgICAgICAgICAgICAgYWNrLnR5cGUgPSAnZXJyb3InO1xuICAgICAgICAgICAgICAgIGFjay5jKCdlcnJvcicsIHt0eXBlOiAnY2FuY2VsJ30pXG4gICAgICAgICAgICAgICAgICAgIC5jKCdzZXJ2aWNlLXVuYXZhaWxhYmxlJywge3htbG5zOiAndXJuOmlldGY6cGFyYW1zOnhtbDpuczp4bXBwLXN0YW56YXMnfSkudXAoKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ2R1cGxpY2F0ZSBzZXNzaW9uIGlkJywgc2lkKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZChhY2spO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRklYTUU6IGNoZWNrIGZvciBhIGRlZmluZWQgYWN0aW9uXG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZChhY2spO1xuICAgICAgICAgICAgLy8gc2VlIGh0dHA6Ly94bXBwLm9yZy9leHRlbnNpb25zL3hlcC0wMTY2Lmh0bWwjY29uY2VwdHMtc2Vzc2lvblxuICAgICAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBjYXNlICdzZXNzaW9uLWluaXRpYXRlJzpcbiAgICAgICAgICAgICAgICAgICAgc2VzcyA9IG5ldyBKaW5nbGVTZXNzaW9uKCQoaXEpLmF0dHIoJ3RvJyksICQoaXEpLmZpbmQoJ2ppbmdsZScpLmF0dHIoJ3NpZCcpLCB0aGlzLmNvbm5lY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICAvLyBjb25maWd1cmUgc2Vzc2lvblxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5sb2NhbEF1ZGlvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzLmxvY2FsU3RyZWFtcy5wdXNoKHRoaXMubG9jYWxBdWRpbyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMubG9jYWxWaWRlbykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2Vzcy5sb2NhbFN0cmVhbXMucHVzaCh0aGlzLmxvY2FsVmlkZW8pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHNlc3MubWVkaWFfY29uc3RyYWludHMgPSB0aGlzLm1lZGlhX2NvbnN0cmFpbnRzO1xuICAgICAgICAgICAgICAgICAgICBzZXNzLnBjX2NvbnN0cmFpbnRzID0gdGhpcy5wY19jb25zdHJhaW50cztcbiAgICAgICAgICAgICAgICAgICAgc2Vzcy5pY2VfY29uZmlnID0gdGhpcy5pY2VfY29uZmlnO1xuXG4gICAgICAgICAgICAgICAgICAgIHNlc3MuaW5pdGlhdGUoZnJvbUppZCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAvLyBGSVhNRTogc2V0UmVtb3RlRGVzY3JpcHRpb24gc2hvdWxkIG9ubHkgYmUgZG9uZSB3aGVuIHRoaXMgY2FsbCBpcyB0byBiZSBhY2NlcHRlZFxuICAgICAgICAgICAgICAgICAgICBzZXNzLnNldFJlbW90ZURlc2NyaXB0aW9uKCQoaXEpLmZpbmQoJz5qaW5nbGUnKSwgJ29mZmVyJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXNzaW9uc1tzZXNzLnNpZF0gPSBzZXNzO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmppZDJzZXNzaW9uW3Nlc3MucGVlcmppZF0gPSBzZXNzO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSBjYWxsYmFjayBzaG91bGQgZWl0aGVyXG4gICAgICAgICAgICAgICAgICAgIC8vIC5zZW5kQW5zd2VyIGFuZCAuYWNjZXB0XG4gICAgICAgICAgICAgICAgICAgIC8vIG9yIC5zZW5kVGVybWluYXRlIC0tIG5vdCBuZWNlc3NhcmlseSBzeW5jaHJvbnVzXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZWNhbGwgPSBzZXNzO1xuICAgICAgICAgICAgICAgICAgICBldmVudEVtaXR0ZXIuZW1pdChYTVBQRXZlbnRzLkNBTExfSU5DT01JTkcsIHNlc3MpO1xuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiBjaGVjayBhZmZpbGlhdGlvbiBhbmQvb3Igcm9sZVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZW11YyBkYXRhIGZvcicsIHNlc3MucGVlcmppZCwgY29ubmVjdGlvbi5lbXVjLm1lbWJlcnNbc2Vzcy5wZWVyamlkXSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2Vzc2lvbnNbc2Vzcy5zaWRdLnVzZWRyaXAgPSB0cnVlOyAvLyBub3Qtc28tbmFpdmUgdHJpY2tsZSBpY2VcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXNzaW9uc1tzZXNzLnNpZF0uc2VuZEFuc3dlcigpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlc3Npb25zW3Nlc3Muc2lkXS5hY2NlcHQoKTtcblxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdzZXNzaW9uLWFjY2VwdCc6XG4gICAgICAgICAgICAgICAgICAgIHNlc3Muc2V0UmVtb3RlRGVzY3JpcHRpb24oJChpcSkuZmluZCgnPmppbmdsZScpLCAnYW5zd2VyJyk7XG4gICAgICAgICAgICAgICAgICAgIHNlc3MuYWNjZXB0KCk7XG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2NhbGxhY2NlcHRlZC5qaW5nbGUnLCBbc2Vzcy5zaWRdKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnc2Vzc2lvbi10ZXJtaW5hdGUnOlxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGlzIGlzIG5vdCB0aGUgZm9jdXMgc2VuZGluZyB0aGUgdGVybWluYXRlLCB3ZSBoYXZlXG4gICAgICAgICAgICAgICAgICAgIC8vIG5vdGhpbmcgbW9yZSB0byBkbyBoZXJlLlxuICAgICAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LmtleXModGhpcy5zZXNzaW9ucykubGVuZ3RoIDwgMVxuICAgICAgICAgICAgICAgICAgICAgICAgfHwgISh0aGlzLnNlc3Npb25zW09iamVjdC5rZXlzKHRoaXMuc2Vzc2lvbnMpWzBdXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlb2YgSmluZ2xlU2Vzc2lvbikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0ZXJtaW5hdGluZy4uLicsIHNlc3Muc2lkKTtcbiAgICAgICAgICAgICAgICAgICAgc2Vzcy50ZXJtaW5hdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50ZXJtaW5hdGUoc2Vzcy5zaWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJChpcSkuZmluZCgnPmppbmdsZT5yZWFzb24nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2NhbGx0ZXJtaW5hdGVkLmppbmdsZScsIFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXNzLnNpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXNzLnBlZXJqaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChpcSkuZmluZCgnPmppbmdsZT5yZWFzb24+OmZpcnN0JylbMF0udGFnTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKGlxKS5maW5kKCc+amluZ2xlPnJlYXNvbj50ZXh0JykudGV4dCgpXG4gICAgICAgICAgICAgICAgICAgICAgICBdKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2NhbGx0ZXJtaW5hdGVkLmppbmdsZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgW3Nlc3Muc2lkLCBzZXNzLnBlZXJqaWRdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICd0cmFuc3BvcnQtaW5mbyc6XG4gICAgICAgICAgICAgICAgICAgIHNlc3MuYWRkSWNlQ2FuZGlkYXRlKCQoaXEpLmZpbmQoJz5qaW5nbGU+Y29udGVudCcpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnc2Vzc2lvbi1pbmZvJzpcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFmZmVjdGVkO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJChpcSkuZmluZCgnPmppbmdsZT5yaW5naW5nW3htbG5zPVwidXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOmluZm86MVwiXScpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcigncmluZ2luZy5qaW5nbGUnLCBbc2Vzcy5zaWRdKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICgkKGlxKS5maW5kKCc+amluZ2xlPm11dGVbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6aW5mbzoxXCJdJykubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZmZlY3RlZCA9ICQoaXEpLmZpbmQoJz5qaW5nbGU+bXV0ZVt4bWxucz1cInVybjp4bXBwOmppbmdsZTphcHBzOnJ0cDppbmZvOjFcIl0nKS5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdtdXRlLmppbmdsZScsIFtzZXNzLnNpZCwgYWZmZWN0ZWRdKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICgkKGlxKS5maW5kKCc+amluZ2xlPnVubXV0ZVt4bWxucz1cInVybjp4bXBwOmppbmdsZTphcHBzOnJ0cDppbmZvOjFcIl0nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFmZmVjdGVkID0gJChpcSkuZmluZCgnPmppbmdsZT51bm11dGVbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6aW5mbzoxXCJdJykuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcigndW5tdXRlLmppbmdsZScsIFtzZXNzLnNpZCwgYWZmZWN0ZWRdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdhZGRzb3VyY2UnOiAvLyBGSVhNRTogcHJvcHJpZXRhcnksIHVuLWppbmdsZWlzaFxuICAgICAgICAgICAgICAgIGNhc2UgJ3NvdXJjZS1hZGQnOiAvLyBGSVhNRTogcHJvcHJpZXRhcnlcbiAgICAgICAgICAgICAgICAgICAgc2Vzcy5hZGRTb3VyY2UoJChpcSkuZmluZCgnPmppbmdsZT5jb250ZW50JyksIGZyb21KaWQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdyZW1vdmVzb3VyY2UnOiAvLyBGSVhNRTogcHJvcHJpZXRhcnksIHVuLWppbmdsZWlzaFxuICAgICAgICAgICAgICAgIGNhc2UgJ3NvdXJjZS1yZW1vdmUnOiAvLyBGSVhNRTogcHJvcHJpZXRhcnlcbiAgICAgICAgICAgICAgICAgICAgc2Vzcy5yZW1vdmVTb3VyY2UoJChpcSkuZmluZCgnPmppbmdsZT5jb250ZW50JyksIGZyb21KaWQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ2ppbmdsZSBhY3Rpb24gbm90IGltcGxlbWVudGVkJywgYWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgaW5pdGlhdGU6IGZ1bmN0aW9uIChwZWVyamlkLCBteWppZCkgeyAvLyBpbml0aWF0ZSBhIG5ldyBqaW5nbGVzZXNzaW9uIHRvIHBlZXJqaWRcbiAgICAgICAgICAgIHZhciBzZXNzID0gbmV3IEppbmdsZVNlc3Npb24obXlqaWQgfHwgdGhpcy5jb25uZWN0aW9uLmppZCxcbiAgICAgICAgICAgICAgICBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgMTIpLCAvLyByYW5kb20gc3RyaW5nXG4gICAgICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uKTtcbiAgICAgICAgICAgIC8vIGNvbmZpZ3VyZSBzZXNzaW9uXG4gICAgICAgICAgICBpZiAodGhpcy5sb2NhbEF1ZGlvKSB7XG4gICAgICAgICAgICAgICAgc2Vzcy5sb2NhbFN0cmVhbXMucHVzaCh0aGlzLmxvY2FsQXVkaW8pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMubG9jYWxWaWRlbykge1xuICAgICAgICAgICAgICAgIHNlc3MubG9jYWxTdHJlYW1zLnB1c2godGhpcy5sb2NhbFZpZGVvKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlc3MubWVkaWFfY29uc3RyYWludHMgPSB0aGlzLm1lZGlhX2NvbnN0cmFpbnRzO1xuICAgICAgICAgICAgc2Vzcy5wY19jb25zdHJhaW50cyA9IHRoaXMucGNfY29uc3RyYWludHM7XG4gICAgICAgICAgICBzZXNzLmljZV9jb25maWcgPSB0aGlzLmljZV9jb25maWc7XG5cbiAgICAgICAgICAgIHNlc3MuaW5pdGlhdGUocGVlcmppZCwgdHJ1ZSk7XG4gICAgICAgICAgICB0aGlzLnNlc3Npb25zW3Nlc3Muc2lkXSA9IHNlc3M7XG4gICAgICAgICAgICB0aGlzLmppZDJzZXNzaW9uW3Nlc3MucGVlcmppZF0gPSBzZXNzO1xuICAgICAgICAgICAgc2Vzcy5zZW5kT2ZmZXIoKTtcbiAgICAgICAgICAgIHJldHVybiBzZXNzO1xuICAgICAgICB9LFxuICAgICAgICB0ZXJtaW5hdGU6IGZ1bmN0aW9uIChzaWQsIHJlYXNvbiwgdGV4dCkgeyAvLyB0ZXJtaW5hdGUgYnkgc2Vzc2lvbmlkIChvciBhbGwgc2Vzc2lvbnMpXG4gICAgICAgICAgICBpZiAoc2lkID09PSBudWxsIHx8IHNpZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZm9yIChzaWQgaW4gdGhpcy5zZXNzaW9ucykge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zZXNzaW9uc1tzaWRdLnN0YXRlICE9ICdlbmRlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2Vzc2lvbnNbc2lkXS5zZW5kVGVybWluYXRlKHJlYXNvbiB8fCAoIXRoaXMuc2Vzc2lvbnNbc2lkXS5hY3RpdmUoKSkgPyAnY2FuY2VsJyA6IG51bGwsIHRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXNzaW9uc1tzaWRdLnRlcm1pbmF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmppZDJzZXNzaW9uW3RoaXMuc2Vzc2lvbnNbc2lkXS5wZWVyamlkXTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuc2Vzc2lvbnNbc2lkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuc2Vzc2lvbnMuaGFzT3duUHJvcGVydHkoc2lkKSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNlc3Npb25zW3NpZF0uc3RhdGUgIT0gJ2VuZGVkJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlc3Npb25zW3NpZF0uc2VuZFRlcm1pbmF0ZShyZWFzb24gfHwgKCF0aGlzLnNlc3Npb25zW3NpZF0uYWN0aXZlKCkpID8gJ2NhbmNlbCcgOiBudWxsLCB0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXNzaW9uc1tzaWRdLnRlcm1pbmF0ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5qaWQyc2Vzc2lvblt0aGlzLnNlc3Npb25zW3NpZF0ucGVlcmppZF07XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuc2Vzc2lvbnNbc2lkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgLy8gVXNlZCB0byB0ZXJtaW5hdGUgYSBzZXNzaW9uIHdoZW4gYW4gdW5hdmFpbGFibGUgcHJlc2VuY2UgaXMgcmVjZWl2ZWQuXG4gICAgICAgIHRlcm1pbmF0ZUJ5SmlkOiBmdW5jdGlvbiAoamlkKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5qaWQyc2Vzc2lvbi5oYXNPd25Qcm9wZXJ0eShqaWQpKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlc3MgPSB0aGlzLmppZDJzZXNzaW9uW2ppZF07XG4gICAgICAgICAgICAgICAgaWYgKHNlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgc2Vzcy50ZXJtaW5hdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3BlZXIgd2VudCBhd2F5IHNpbGVudGx5JywgamlkKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuc2Vzc2lvbnNbc2Vzcy5zaWRdO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5qaWQyc2Vzc2lvbltqaWRdO1xuICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdjYWxsdGVybWluYXRlZC5qaW5nbGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgW3Nlc3Muc2lkLCBqaWRdLCAnZ29uZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgdGVybWluYXRlUmVtb3RlQnlKaWQ6IGZ1bmN0aW9uIChqaWQsIHJlYXNvbikge1xuICAgICAgICAgICAgaWYgKHRoaXMuamlkMnNlc3Npb24uaGFzT3duUHJvcGVydHkoamlkKSkge1xuICAgICAgICAgICAgICAgIHZhciBzZXNzID0gdGhpcy5qaWQyc2Vzc2lvbltqaWRdO1xuICAgICAgICAgICAgICAgIGlmIChzZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlc3Muc2VuZFRlcm1pbmF0ZShyZWFzb24gfHwgKCFzZXNzLmFjdGl2ZSgpKSA/ICdraWNrJyA6IG51bGwpO1xuICAgICAgICAgICAgICAgICAgICBzZXNzLnRlcm1pbmF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndGVybWluYXRlIHBlZXIgd2l0aCBqaWQnLCBzZXNzLnNpZCwgamlkKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuc2Vzc2lvbnNbc2Vzcy5zaWRdO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5qaWQyc2Vzc2lvbltqaWRdO1xuICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdjYWxsdGVybWluYXRlZC5qaW5nbGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgW3Nlc3Muc2lkLCBqaWQsICdraWNrZWQnXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBnZXRTdHVuQW5kVHVybkNyZWRlbnRpYWxzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBnZXQgc3R1biBhbmQgdHVybiBjb25maWd1cmF0aW9uIGZyb20gc2VydmVyIHZpYSB4ZXAtMDIxNVxuICAgICAgICAgICAgLy8gdXNlcyB0aW1lLWxpbWl0ZWQgY3JlZGVudGlhbHMgYXMgZGVzY3JpYmVkIGluXG4gICAgICAgICAgICAvLyBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9kcmFmdC11YmVydGktYmVoYXZlLXR1cm4tcmVzdC0wMFxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIHNlZSBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3Byb3NvZHktbW9kdWxlcy9zb3VyY2UvYnJvd3NlL21vZF90dXJuY3JlZGVudGlhbHMvbW9kX3R1cm5jcmVkZW50aWFscy5sdWFcbiAgICAgICAgICAgIC8vIGZvciBhIHByb3NvZHkgbW9kdWxlIHdoaWNoIGltcGxlbWVudHMgdGhpc1xuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIGN1cnJlbnRseSwgdGhpcyBkb2Vzbid0IHdvcmsgd2l0aCB1cGRhdGVJY2UgYW5kIHRoZXJlZm9yZSBjcmVkZW50aWFscyB3aXRoIGEgbG9uZ1xuICAgICAgICAgICAgLy8gdmFsaWRpdHkgaGF2ZSB0byBiZSBmZXRjaGVkIGJlZm9yZSBjcmVhdGluZyB0aGUgcGVlcmNvbm5lY3Rpb25cbiAgICAgICAgICAgIC8vIFRPRE86IGltcGxlbWVudCByZWZyZXNoIHZpYSB1cGRhdGVJY2UgYXMgZGVzY3JpYmVkIGluXG4gICAgICAgICAgICAvLyAgICAgIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3Avd2VicnRjL2lzc3Vlcy9kZXRhaWw/aWQ9MTY1MFxuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmRJUShcbiAgICAgICAgICAgICAgICAkaXEoe3R5cGU6ICdnZXQnLCB0bzogdGhpcy5jb25uZWN0aW9uLmRvbWFpbn0pXG4gICAgICAgICAgICAgICAgICAgIC5jKCdzZXJ2aWNlcycsIHt4bWxuczogJ3Vybjp4bXBwOmV4dGRpc2NvOjEnfSkuYygnc2VydmljZScsIHtob3N0OiAndHVybi4nICsgdGhpcy5jb25uZWN0aW9uLmRvbWFpbn0pLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGljZXNlcnZlcnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgJChyZXMpLmZpbmQoJz5zZXJ2aWNlcz5zZXJ2aWNlJykuZWFjaChmdW5jdGlvbiAoaWR4LCBlbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWwgPSAkKGVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkaWN0ID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IGVsLmF0dHIoJ3R5cGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3N0dW4nOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWN0LnVybCA9ICdzdHVuOicgKyBlbC5hdHRyKCdob3N0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbC5hdHRyKCdwb3J0JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpY3QudXJsICs9ICc6JyArIGVsLmF0dHIoJ3BvcnQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpY2VzZXJ2ZXJzLnB1c2goZGljdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3R1cm4nOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3R1cm5zJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGljdC51cmwgPSB0eXBlICsgJzonO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWwuYXR0cigndXNlcm5hbWUnKSkgeyAvLyBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3dlYnJ0Yy9pc3N1ZXMvZGV0YWlsP2lkPTE1MDhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9DaHJvbShlfGl1bSlcXC8oWzAtOV0rKVxcLi8pICYmIHBhcnNlSW50KG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0Nocm9tKGV8aXVtKVxcLyhbMC05XSspXFwuLylbMl0sIDEwKSA8IDI4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGljdC51cmwgKz0gZWwuYXR0cigndXNlcm5hbWUnKSArICdAJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGljdC51c2VybmFtZSA9IGVsLmF0dHIoJ3VzZXJuYW1lJyk7IC8vIG9ubHkgd29ya3MgaW4gTTI4XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGljdC51cmwgKz0gZWwuYXR0cignaG9zdCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWwuYXR0cigncG9ydCcpICYmIGVsLmF0dHIoJ3BvcnQnKSAhPSAnMzQ3OCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpY3QudXJsICs9ICc6JyArIGVsLmF0dHIoJ3BvcnQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWwuYXR0cigndHJhbnNwb3J0JykgJiYgZWwuYXR0cigndHJhbnNwb3J0JykgIT0gJ3VkcCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpY3QudXJsICs9ICc/dHJhbnNwb3J0PScgKyBlbC5hdHRyKCd0cmFuc3BvcnQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWwuYXR0cigncGFzc3dvcmQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGljdC5jcmVkZW50aWFsID0gZWwuYXR0cigncGFzc3dvcmQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpY2VzZXJ2ZXJzLnB1c2goZGljdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5pY2VfY29uZmlnLmljZVNlcnZlcnMgPSBpY2VzZXJ2ZXJzO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ2dldHRpbmcgdHVybiBjcmVkZW50aWFscyBmYWlsZWQnLCBlcnIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ2lzIG1vZF90dXJuY3JlZGVudGlhbHMgb3Igc2ltaWxhciBpbnN0YWxsZWQ/Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIC8vIGltcGxlbWVudCBwdXNoP1xuICAgICAgICB9LFxuICAgICAgICBnZXRKaW5nbGVEYXRhOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHt9O1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoY29ubmVjdGlvbi5qaW5nbGUuc2Vzc2lvbnMpLmZvckVhY2goZnVuY3Rpb24gKHNpZCkge1xuICAgICAgICAgICAgICAgIHZhciBzZXNzaW9uID0gY29ubmVjdGlvbi5qaW5nbGUuc2Vzc2lvbnNbc2lkXTtcbiAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5wZWVyY29ubmVjdGlvbiAmJiBzZXNzaW9uLnBlZXJjb25uZWN0aW9uLnVwZGF0ZUxvZykge1xuICAgICAgICAgICAgICAgICAgICAvLyBGSVhNRTogc2hvdWxkIHByb2JhYmx5IGJlIGEgLmR1bXAgY2FsbFxuICAgICAgICAgICAgICAgICAgICBkYXRhW1wiamluZ2xlX1wiICsgc2Vzc2lvbi5zaWRdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlTG9nOiBzZXNzaW9uLnBlZXJjb25uZWN0aW9uLnVwZGF0ZUxvZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRzOiBzZXNzaW9uLnBlZXJjb25uZWN0aW9uLnN0YXRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiB3aW5kb3cubG9jYXRpb24uaHJlZlxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH1cbiAgICB9KTtcbn0iLCIvKiBqc2hpbnQgLVcxMTcgKi9cblxuLyoqXG4gKiBDbGFzcyBob2xkcyBhPXNzcmMgbGluZXMgYW5kIG1lZGlhIHR5cGUgYT1taWRcbiAqIEBwYXJhbSBzc3JjIHN5bmNocm9uaXphdGlvbiBzb3VyY2UgaWRlbnRpZmllciBudW1iZXIoYT1zc3JjIGxpbmVzIGZyb20gU0RQKVxuICogQHBhcmFtIHR5cGUgbWVkaWEgdHlwZSBlZy4gXCJhdWRpb1wiIG9yIFwidmlkZW9cIihhPW1pZCBmcm0gU0RQKVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIENoYW5uZWxTc3JjKHNzcmMsIHR5cGUpIHtcbiAgICB0aGlzLnNzcmMgPSBzc3JjO1xuICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgdGhpcy5saW5lcyA9IFtdO1xufVxuXG4vKipcbiAqIENsYXNzIGhvbGRzIGE9c3NyYy1ncm91cDogbGluZXNcbiAqIEBwYXJhbSBzZW1hbnRpY3NcbiAqIEBwYXJhbSBzc3Jjc1xuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIENoYW5uZWxTc3JjR3JvdXAoc2VtYW50aWNzLCBzc3JjcywgbGluZSkge1xuICAgIHRoaXMuc2VtYW50aWNzID0gc2VtYW50aWNzO1xuICAgIHRoaXMuc3NyY3MgPSBzc3Jjcztcbn1cblxuLyoqXG4gKiBIZWxwZXIgY2xhc3MgcmVwcmVzZW50cyBtZWRpYSBjaGFubmVsLiBJcyBhIGNvbnRhaW5lciBmb3IgQ2hhbm5lbFNzcmMsIGhvbGRzIGNoYW5uZWwgaWR4IGFuZCBtZWRpYSB0eXBlLlxuICogQHBhcmFtIGNoYW5uZWxOdW1iZXIgY2hhbm5lbCBpZHggaW4gU0RQIG1lZGlhIGFycmF5LlxuICogQHBhcmFtIG1lZGlhVHlwZSBtZWRpYSB0eXBlKGE9bWlkKVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIE1lZGlhQ2hhbm5lbChjaGFubmVsTnVtYmVyLCBtZWRpYVR5cGUpIHtcbiAgICAvKipcbiAgICAgKiBTRFAgY2hhbm5lbCBudW1iZXJcbiAgICAgKiBAdHlwZSB7Kn1cbiAgICAgKi9cbiAgICB0aGlzLmNoTnVtYmVyID0gY2hhbm5lbE51bWJlcjtcbiAgICAvKipcbiAgICAgKiBDaGFubmVsIG1lZGlhIHR5cGUoYT1taWQpXG4gICAgICogQHR5cGUgeyp9XG4gICAgICovXG4gICAgdGhpcy5tZWRpYVR5cGUgPSBtZWRpYVR5cGU7XG4gICAgLyoqXG4gICAgICogVGhlIG1hcHMgb2Ygc3NyYyBudW1iZXJzIHRvIENoYW5uZWxTc3JjIG9iamVjdHMuXG4gICAgICovXG4gICAgdGhpcy5zc3JjcyA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogVGhlIGFycmF5IG9mIENoYW5uZWxTc3JjR3JvdXAgb2JqZWN0cy5cbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgdGhpcy5zc3JjR3JvdXBzID0gW107XG59XG5cbi8vIFNEUCBTVFVGRlxuZnVuY3Rpb24gU0RQKHNkcCkge1xuICAgIHRoaXMubWVkaWEgPSBzZHAuc3BsaXQoJ1xcclxcbm09Jyk7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCB0aGlzLm1lZGlhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMubWVkaWFbaV0gPSAnbT0nICsgdGhpcy5tZWRpYVtpXTtcbiAgICAgICAgaWYgKGkgIT0gdGhpcy5tZWRpYS5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICB0aGlzLm1lZGlhW2ldICs9ICdcXHJcXG4nO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMuc2Vzc2lvbiA9IHRoaXMubWVkaWEuc2hpZnQoKSArICdcXHJcXG4nO1xuICAgIHRoaXMucmF3ID0gdGhpcy5zZXNzaW9uICsgdGhpcy5tZWRpYS5qb2luKCcnKTtcbn1cbi8qKlxuICogUmV0dXJucyBtYXAgb2YgTWVkaWFDaGFubmVsIG1hcHBlZCBwZXIgY2hhbm5lbCBpZHguXG4gKi9cblNEUC5wcm90b3R5cGUuZ2V0TWVkaWFTc3JjTWFwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBtZWRpYV9zc3JjcyA9IHt9O1xuICAgIGZvciAoY2hhbm5lbE51bSA9IDA7IGNoYW5uZWxOdW0gPCBzZWxmLm1lZGlhLmxlbmd0aDsgY2hhbm5lbE51bSsrKSB7XG4gICAgICAgIG1vZGlmaWVkID0gdHJ1ZTtcbiAgICAgICAgdG1wID0gU0RQVXRpbC5maW5kX2xpbmVzKHNlbGYubWVkaWFbY2hhbm5lbE51bV0sICdhPXNzcmM6Jyk7XG4gICAgICAgIHZhciB0eXBlID0gU0RQVXRpbC5wYXJzZV9taWQoU0RQVXRpbC5maW5kX2xpbmUoc2VsZi5tZWRpYVtjaGFubmVsTnVtXSwgJ2E9bWlkOicpKTtcbiAgICAgICAgdmFyIGNoYW5uZWwgPSBuZXcgTWVkaWFDaGFubmVsKGNoYW5uZWxOdW0sIHR5cGUpO1xuICAgICAgICBtZWRpYV9zc3Jjc1tjaGFubmVsTnVtXSA9IGNoYW5uZWw7XG4gICAgICAgIHRtcC5mb3JFYWNoKGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgICAgICB2YXIgbGluZXNzcmMgPSBsaW5lLnN1YnN0cmluZyg3KS5zcGxpdCgnICcpWzBdO1xuICAgICAgICAgICAgLy8gYWxsb2NhdGUgbmV3IENoYW5uZWxTc3JjXG4gICAgICAgICAgICBpZighY2hhbm5lbC5zc3Jjc1tsaW5lc3NyY10pIHtcbiAgICAgICAgICAgICAgICBjaGFubmVsLnNzcmNzW2xpbmVzc3JjXSA9IG5ldyBDaGFubmVsU3NyYyhsaW5lc3NyYywgdHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjaGFubmVsLnNzcmNzW2xpbmVzc3JjXS5saW5lcy5wdXNoKGxpbmUpO1xuICAgICAgICB9KTtcbiAgICAgICAgdG1wID0gU0RQVXRpbC5maW5kX2xpbmVzKHNlbGYubWVkaWFbY2hhbm5lbE51bV0sICdhPXNzcmMtZ3JvdXA6Jyk7XG4gICAgICAgIHRtcC5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUpe1xuICAgICAgICAgICAgdmFyIHNlbWFudGljcyA9IGxpbmUuc3Vic3RyKDAsIGlkeCkuc3Vic3RyKDEzKTtcbiAgICAgICAgICAgIHZhciBzc3JjcyA9IGxpbmUuc3Vic3RyKDE0ICsgc2VtYW50aWNzLmxlbmd0aCkuc3BsaXQoJyAnKTtcbiAgICAgICAgICAgIGlmIChzc3Jjcy5sZW5ndGggIT0gMCkge1xuICAgICAgICAgICAgICAgIHZhciBzc3JjR3JvdXAgPSBuZXcgQ2hhbm5lbFNzcmNHcm91cChzZW1hbnRpY3MsIHNzcmNzKTtcbiAgICAgICAgICAgICAgICBjaGFubmVsLnNzcmNHcm91cHMucHVzaChzc3JjR3JvdXApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG1lZGlhX3NzcmNzO1xufVxuLyoqXG4gKiBSZXR1cm5zIDx0dD50cnVlPC90dD4gaWYgdGhpcyBTRFAgY29udGFpbnMgZ2l2ZW4gU1NSQy5cbiAqIEBwYXJhbSBzc3JjIHRoZSBzc3JjIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IDx0dD50cnVlPC90dD4gaWYgdGhpcyBTRFAgY29udGFpbnMgZ2l2ZW4gU1NSQy5cbiAqL1xuU0RQLnByb3RvdHlwZS5jb250YWluc1NTUkMgPSBmdW5jdGlvbihzc3JjKSB7XG4gICAgdmFyIGNoYW5uZWxzID0gdGhpcy5nZXRNZWRpYVNzcmNNYXAoKTtcbiAgICB2YXIgY29udGFpbnMgPSBmYWxzZTtcbiAgICBPYmplY3Qua2V5cyhjaGFubmVscykuZm9yRWFjaChmdW5jdGlvbihjaE51bWJlcil7XG4gICAgICAgIHZhciBjaGFubmVsID0gY2hhbm5lbHNbY2hOdW1iZXJdO1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiQ2hlY2tcIiwgY2hhbm5lbCwgc3NyYyk7XG4gICAgICAgIGlmKE9iamVjdC5rZXlzKGNoYW5uZWwuc3NyY3MpLmluZGV4T2Yoc3NyYykgIT0gLTEpe1xuICAgICAgICAgICAgY29udGFpbnMgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGNvbnRhaW5zO1xufVxuLyoqXG4gKiBSZXR1cm5zIG1hcCBvZiBNZWRpYUNoYW5uZWwgdGhhdCBjb250YWlucyBvbmx5IG1lZGlhIG5vdCBjb250YWluZWQgaW4gPHR0Pm90aGVyU2RwPC90dD4uIE1hcHBlZCBieSBjaGFubmVsIGlkeC5cbiAqIEBwYXJhbSBvdGhlclNkcCB0aGUgb3RoZXIgU0RQIHRvIGNoZWNrIHNzcmMgd2l0aC5cbiAqL1xuU0RQLnByb3RvdHlwZS5nZXROZXdNZWRpYSA9IGZ1bmN0aW9uKG90aGVyU2RwKSB7XG5cbiAgICAvLyB0aGlzIGNvdWxkIGJlIHVzZWZ1bCBpbiBBcnJheS5wcm90b3R5cGUuXG4gICAgZnVuY3Rpb24gYXJyYXlFcXVhbHMoYXJyYXkpIHtcbiAgICAgICAgLy8gaWYgdGhlIG90aGVyIGFycmF5IGlzIGEgZmFsc3kgdmFsdWUsIHJldHVyblxuICAgICAgICBpZiAoIWFycmF5KVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgIC8vIGNvbXBhcmUgbGVuZ3RocyAtIGNhbiBzYXZlIGEgbG90IG9mIHRpbWVcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoICE9IGFycmF5Lmxlbmd0aClcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbD10aGlzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgd2UgaGF2ZSBuZXN0ZWQgYXJyYXlzXG4gICAgICAgICAgICBpZiAodGhpc1tpXSBpbnN0YW5jZW9mIEFycmF5ICYmIGFycmF5W2ldIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICAvLyByZWN1cnNlIGludG8gdGhlIG5lc3RlZCBhcnJheXNcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXNbaV0uZXF1YWxzKGFycmF5W2ldKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodGhpc1tpXSAhPSBhcnJheVtpXSkge1xuICAgICAgICAgICAgICAgIC8vIFdhcm5pbmcgLSB0d28gZGlmZmVyZW50IG9iamVjdCBpbnN0YW5jZXMgd2lsbCBuZXZlciBiZSBlcXVhbDoge3g6MjB9ICE9IHt4OjIwfVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuXG4gICAgdmFyIG15TWVkaWEgPSB0aGlzLmdldE1lZGlhU3NyY01hcCgpO1xuICAgIHZhciBvdGhlcnNNZWRpYSA9IG90aGVyU2RwLmdldE1lZGlhU3NyY01hcCgpO1xuICAgIHZhciBuZXdNZWRpYSA9IHt9O1xuICAgIE9iamVjdC5rZXlzKG90aGVyc01lZGlhKS5mb3JFYWNoKGZ1bmN0aW9uKGNoYW5uZWxOdW0pIHtcbiAgICAgICAgdmFyIG15Q2hhbm5lbCA9IG15TWVkaWFbY2hhbm5lbE51bV07XG4gICAgICAgIHZhciBvdGhlcnNDaGFubmVsID0gb3RoZXJzTWVkaWFbY2hhbm5lbE51bV07XG4gICAgICAgIGlmKCFteUNoYW5uZWwgJiYgb3RoZXJzQ2hhbm5lbCkge1xuICAgICAgICAgICAgLy8gQWRkIHdob2xlIGNoYW5uZWxcbiAgICAgICAgICAgIG5ld01lZGlhW2NoYW5uZWxOdW1dID0gb3RoZXJzQ2hhbm5lbDtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBMb29rIGZvciBuZXcgc3NyY3MgYWNjcm9zcyB0aGUgY2hhbm5lbFxuICAgICAgICBPYmplY3Qua2V5cyhvdGhlcnNDaGFubmVsLnNzcmNzKS5mb3JFYWNoKGZ1bmN0aW9uKHNzcmMpIHtcbiAgICAgICAgICAgIGlmKE9iamVjdC5rZXlzKG15Q2hhbm5lbC5zc3JjcykuaW5kZXhPZihzc3JjKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAvLyBBbGxvY2F0ZSBjaGFubmVsIGlmIHdlJ3ZlIGZvdW5kIHNzcmMgdGhhdCBkb2Vzbid0IGV4aXN0IGluIG91ciBjaGFubmVsXG4gICAgICAgICAgICAgICAgaWYoIW5ld01lZGlhW2NoYW5uZWxOdW1dKXtcbiAgICAgICAgICAgICAgICAgICAgbmV3TWVkaWFbY2hhbm5lbE51bV0gPSBuZXcgTWVkaWFDaGFubmVsKG90aGVyc0NoYW5uZWwuY2hOdW1iZXIsIG90aGVyc0NoYW5uZWwubWVkaWFUeXBlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbmV3TWVkaWFbY2hhbm5lbE51bV0uc3NyY3Nbc3NyY10gPSBvdGhlcnNDaGFubmVsLnNzcmNzW3NzcmNdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIExvb2sgZm9yIG5ldyBzc3JjIGdyb3VwcyBhY3Jvc3MgdGhlIGNoYW5uZWxzXG4gICAgICAgIG90aGVyc0NoYW5uZWwuc3NyY0dyb3Vwcy5mb3JFYWNoKGZ1bmN0aW9uKG90aGVyU3NyY0dyb3VwKXtcblxuICAgICAgICAgICAgLy8gdHJ5IHRvIG1hdGNoIHRoZSBvdGhlciBzc3JjLWdyb3VwIHdpdGggYW4gc3NyYy1ncm91cCBvZiBvdXJzXG4gICAgICAgICAgICB2YXIgbWF0Y2hlZCA9IGZhbHNlO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBteUNoYW5uZWwuc3NyY0dyb3Vwcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBteVNzcmNHcm91cCA9IG15Q2hhbm5lbC5zc3JjR3JvdXBzW2ldO1xuICAgICAgICAgICAgICAgIGlmIChvdGhlclNzcmNHcm91cC5zZW1hbnRpY3MgPT0gbXlTc3JjR3JvdXBcbiAgICAgICAgICAgICAgICAgICAgJiYgYXJyYXlFcXVhbHMuYXBwbHkob3RoZXJTc3JjR3JvdXAuc3NyY3MsIFtteVNzcmNHcm91cC5zc3Jjc10pKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFtYXRjaGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gQWxsb2NhdGUgY2hhbm5lbCBpZiB3ZSd2ZSBmb3VuZCBhbiBzc3JjLWdyb3VwIHRoYXQgZG9lc24ndFxuICAgICAgICAgICAgICAgIC8vIGV4aXN0IGluIG91ciBjaGFubmVsXG5cbiAgICAgICAgICAgICAgICBpZighbmV3TWVkaWFbY2hhbm5lbE51bV0pe1xuICAgICAgICAgICAgICAgICAgICBuZXdNZWRpYVtjaGFubmVsTnVtXSA9IG5ldyBNZWRpYUNoYW5uZWwob3RoZXJzQ2hhbm5lbC5jaE51bWJlciwgb3RoZXJzQ2hhbm5lbC5tZWRpYVR5cGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBuZXdNZWRpYVtjaGFubmVsTnVtXS5zc3JjR3JvdXBzLnB1c2gob3RoZXJTc3JjR3JvdXApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gbmV3TWVkaWE7XG59XG4vLyByZW1vdmUgaVNBQyBhbmQgQ04gZnJvbSBTRFBcblNEUC5wcm90b3R5cGUubWFuZ2xlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBpLCBqLCBtbGluZSwgbGluZXMsIHJ0cG1hcCwgbmV3ZGVzYztcbiAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5tZWRpYS5sZW5ndGg7IGkrKykge1xuICAgICAgICBsaW5lcyA9IHRoaXMubWVkaWFbaV0uc3BsaXQoJ1xcclxcbicpO1xuICAgICAgICBsaW5lcy5wb3AoKTsgLy8gcmVtb3ZlIGVtcHR5IGxhc3QgZWxlbWVudFxuICAgICAgICBtbGluZSA9IFNEUFV0aWwucGFyc2VfbWxpbmUobGluZXMuc2hpZnQoKSk7XG4gICAgICAgIGlmIChtbGluZS5tZWRpYSAhPSAnYXVkaW8nKVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIG5ld2Rlc2MgPSAnJztcbiAgICAgICAgbWxpbmUuZm10Lmxlbmd0aCA9IDA7XG4gICAgICAgIGZvciAoaiA9IDA7IGogPCBsaW5lcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgaWYgKGxpbmVzW2pdLnN1YnN0cigwLCA5KSA9PSAnYT1ydHBtYXA6Jykge1xuICAgICAgICAgICAgICAgIHJ0cG1hcCA9IFNEUFV0aWwucGFyc2VfcnRwbWFwKGxpbmVzW2pdKTtcbiAgICAgICAgICAgICAgICBpZiAocnRwbWFwLm5hbWUgPT0gJ0NOJyB8fCBydHBtYXAubmFtZSA9PSAnSVNBQycpXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIG1saW5lLmZtdC5wdXNoKHJ0cG1hcC5pZCk7XG4gICAgICAgICAgICAgICAgbmV3ZGVzYyArPSBsaW5lc1tqXSArICdcXHJcXG4nO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXdkZXNjICs9IGxpbmVzW2pdICsgJ1xcclxcbic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5tZWRpYVtpXSA9IFNEUFV0aWwuYnVpbGRfbWxpbmUobWxpbmUpICsgJ1xcclxcbic7XG4gICAgICAgIHRoaXMubWVkaWFbaV0gKz0gbmV3ZGVzYztcbiAgICB9XG4gICAgdGhpcy5yYXcgPSB0aGlzLnNlc3Npb24gKyB0aGlzLm1lZGlhLmpvaW4oJycpO1xufTtcblxuLy8gcmVtb3ZlIGxpbmVzIG1hdGNoaW5nIHByZWZpeCBmcm9tIHNlc3Npb24gc2VjdGlvblxuU0RQLnByb3RvdHlwZS5yZW1vdmVTZXNzaW9uTGluZXMgPSBmdW5jdGlvbihwcmVmaXgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGxpbmVzID0gU0RQVXRpbC5maW5kX2xpbmVzKHRoaXMuc2Vzc2lvbiwgcHJlZml4KTtcbiAgICBsaW5lcy5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgc2VsZi5zZXNzaW9uID0gc2VsZi5zZXNzaW9uLnJlcGxhY2UobGluZSArICdcXHJcXG4nLCAnJyk7XG4gICAgfSk7XG4gICAgdGhpcy5yYXcgPSB0aGlzLnNlc3Npb24gKyB0aGlzLm1lZGlhLmpvaW4oJycpO1xuICAgIHJldHVybiBsaW5lcztcbn1cbi8vIHJlbW92ZSBsaW5lcyBtYXRjaGluZyBwcmVmaXggZnJvbSBhIG1lZGlhIHNlY3Rpb24gc3BlY2lmaWVkIGJ5IG1lZGlhaW5kZXhcbi8vIFRPRE86IG5vbi1udW1lcmljIG1lZGlhaW5kZXggY291bGQgbWF0Y2ggbWlkXG5TRFAucHJvdG90eXBlLnJlbW92ZU1lZGlhTGluZXMgPSBmdW5jdGlvbihtZWRpYWluZGV4LCBwcmVmaXgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGxpbmVzID0gU0RQVXRpbC5maW5kX2xpbmVzKHRoaXMubWVkaWFbbWVkaWFpbmRleF0sIHByZWZpeCk7XG4gICAgbGluZXMuZm9yRWFjaChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgIHNlbGYubWVkaWFbbWVkaWFpbmRleF0gPSBzZWxmLm1lZGlhW21lZGlhaW5kZXhdLnJlcGxhY2UobGluZSArICdcXHJcXG4nLCAnJyk7XG4gICAgfSk7XG4gICAgdGhpcy5yYXcgPSB0aGlzLnNlc3Npb24gKyB0aGlzLm1lZGlhLmpvaW4oJycpO1xuICAgIHJldHVybiBsaW5lcztcbn1cblxuLy8gYWRkIGNvbnRlbnQncyB0byBhIGppbmdsZSBlbGVtZW50XG5TRFAucHJvdG90eXBlLnRvSmluZ2xlID0gZnVuY3Rpb24gKGVsZW0sIHRoZWNyZWF0b3IpIHtcbiAgICB2YXIgaSwgaiwgaywgbWxpbmUsIHNzcmMsIHJ0cG1hcCwgdG1wLCBsaW5lLCBsaW5lcztcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gbmV3IGJ1bmRsZSBwbGFuXG4gICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKHRoaXMuc2Vzc2lvbiwgJ2E9Z3JvdXA6JykpIHtcbiAgICAgICAgbGluZXMgPSBTRFBVdGlsLmZpbmRfbGluZXModGhpcy5zZXNzaW9uLCAnYT1ncm91cDonKTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0bXAgPSBsaW5lc1tpXS5zcGxpdCgnICcpO1xuICAgICAgICAgICAgdmFyIHNlbWFudGljcyA9IHRtcC5zaGlmdCgpLnN1YnN0cig4KTtcbiAgICAgICAgICAgIGVsZW0uYygnZ3JvdXAnLCB7eG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6YXBwczpncm91cGluZzowJywgc2VtYW50aWNzOnNlbWFudGljc30pO1xuICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IHRtcC5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIGVsZW0uYygnY29udGVudCcsIHtuYW1lOiB0bXBbal19KS51cCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxlbS51cCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIG9sZCBidW5kbGUgcGxhbiwgdG8gYmUgcmVtb3ZlZFxuICAgIHZhciBidW5kbGUgPSBbXTtcbiAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUodGhpcy5zZXNzaW9uLCAnYT1ncm91cDpCVU5ETEUnKSkge1xuICAgICAgICBidW5kbGUgPSBTRFBVdGlsLmZpbmRfbGluZSh0aGlzLnNlc3Npb24sICdhPWdyb3VwOkJVTkRMRSAnKS5zcGxpdCgnICcpO1xuICAgICAgICBidW5kbGUuc2hpZnQoKTtcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IHRoaXMubWVkaWEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbWxpbmUgPSBTRFBVdGlsLnBhcnNlX21saW5lKHRoaXMubWVkaWFbaV0uc3BsaXQoJ1xcclxcbicpWzBdKTtcbiAgICAgICAgaWYgKCEobWxpbmUubWVkaWEgPT09ICdhdWRpbycgfHxcbiAgICAgICAgICAgICAgbWxpbmUubWVkaWEgPT09ICd2aWRlbycgfHxcbiAgICAgICAgICAgICAgbWxpbmUubWVkaWEgPT09ICdhcHBsaWNhdGlvbicpKVxuICAgICAgICB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUodGhpcy5tZWRpYVtpXSwgJ2E9c3NyYzonKSkge1xuICAgICAgICAgICAgc3NyYyA9IFNEUFV0aWwuZmluZF9saW5lKHRoaXMubWVkaWFbaV0sICdhPXNzcmM6Jykuc3Vic3RyaW5nKDcpLnNwbGl0KCcgJylbMF07IC8vIHRha2UgdGhlIGZpcnN0XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzc3JjID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBlbGVtLmMoJ2NvbnRlbnQnLCB7Y3JlYXRvcjogdGhlY3JlYXRvciwgbmFtZTogbWxpbmUubWVkaWF9KTtcbiAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKHRoaXMubWVkaWFbaV0sICdhPW1pZDonKSkge1xuICAgICAgICAgICAgLy8gcHJlZmVyIGlkZW50aWZpZXIgZnJvbSBhPW1pZCBpZiBwcmVzZW50XG4gICAgICAgICAgICB2YXIgbWlkID0gU0RQVXRpbC5wYXJzZV9taWQoU0RQVXRpbC5maW5kX2xpbmUodGhpcy5tZWRpYVtpXSwgJ2E9bWlkOicpKTtcbiAgICAgICAgICAgIGVsZW0uYXR0cnMoeyBuYW1lOiBtaWQgfSk7XG5cbiAgICAgICAgICAgIC8vIG9sZCBCVU5ETEUgcGxhbiwgdG8gYmUgcmVtb3ZlZFxuICAgICAgICAgICAgaWYgKGJ1bmRsZS5pbmRleE9mKG1pZCkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgZWxlbS5jKCdidW5kbGUnLCB7eG1sbnM6ICdodHRwOi8vZXN0b3MuZGUvbnMvYnVuZGxlJ30pLnVwKCk7XG4gICAgICAgICAgICAgICAgYnVuZGxlLnNwbGljZShidW5kbGUuaW5kZXhPZihtaWQpLCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZSh0aGlzLm1lZGlhW2ldLCAnYT1ydHBtYXA6JykubGVuZ3RoKVxuICAgICAgICB7XG4gICAgICAgICAgICBlbGVtLmMoJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICB7eG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6MScsXG4gICAgICAgICAgICAgICAgICAgIG1lZGlhOiBtbGluZS5tZWRpYSB9KTtcbiAgICAgICAgICAgIGlmIChzc3JjKSB7XG4gICAgICAgICAgICAgICAgZWxlbS5hdHRycyh7c3NyYzogc3NyY30pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IG1saW5lLmZtdC5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHJ0cG1hcCA9IFNEUFV0aWwuZmluZF9saW5lKHRoaXMubWVkaWFbaV0sICdhPXJ0cG1hcDonICsgbWxpbmUuZm10W2pdKTtcbiAgICAgICAgICAgICAgICBlbGVtLmMoJ3BheWxvYWQtdHlwZScsIFNEUFV0aWwucGFyc2VfcnRwbWFwKHJ0cG1hcCkpO1xuICAgICAgICAgICAgICAgIC8vIHB1dCBhbnkgJ2E9Zm10cDonICsgbWxpbmUuZm10W2pdIGxpbmVzIGludG8gPHBhcmFtIG5hbWU9Zm9vIHZhbHVlPWJhci8+XG4gICAgICAgICAgICAgICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKHRoaXMubWVkaWFbaV0sICdhPWZtdHA6JyArIG1saW5lLmZtdFtqXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdG1wID0gU0RQVXRpbC5wYXJzZV9mbXRwKFNEUFV0aWwuZmluZF9saW5lKHRoaXMubWVkaWFbaV0sICdhPWZtdHA6JyArIG1saW5lLmZtdFtqXSkpO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGsgPSAwOyBrIDwgdG1wLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmMoJ3BhcmFtZXRlcicsIHRtcFtrXSkudXAoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLlJ0Y3BGYlRvSmluZ2xlKGksIGVsZW0sIG1saW5lLmZtdFtqXSk7IC8vIFhFUC0wMjkzIC0tIG1hcCBhPXJ0Y3AtZmJcblxuICAgICAgICAgICAgICAgIGVsZW0udXAoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZSh0aGlzLm1lZGlhW2ldLCAnYT1jcnlwdG86JywgdGhpcy5zZXNzaW9uKSkge1xuICAgICAgICAgICAgICAgIGVsZW0uYygnZW5jcnlwdGlvbicsIHtyZXF1aXJlZDogMX0pO1xuICAgICAgICAgICAgICAgIHZhciBjcnlwdG8gPSBTRFBVdGlsLmZpbmRfbGluZXModGhpcy5tZWRpYVtpXSwgJ2E9Y3J5cHRvOicsIHRoaXMuc2Vzc2lvbik7XG4gICAgICAgICAgICAgICAgY3J5cHRvLmZvckVhY2goZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmMoJ2NyeXB0bycsIFNEUFV0aWwucGFyc2VfY3J5cHRvKGxpbmUpKS51cCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGVsZW0udXAoKTsgLy8gZW5kIG9mIGVuY3J5cHRpb25cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHNzcmMpIHtcbiAgICAgICAgICAgICAgICAvLyBuZXcgc3R5bGUgbWFwcGluZ1xuICAgICAgICAgICAgICAgIGVsZW0uYygnc291cmNlJywgeyBzc3JjOiBzc3JjLCB4bWxuczogJ3Vybjp4bXBwOmppbmdsZTphcHBzOnJ0cDpzc21hOjAnIH0pO1xuICAgICAgICAgICAgICAgIC8vIEZJWE1FOiBncm91cCBieSBzc3JjIGFuZCBzdXBwb3J0IG11bHRpcGxlIGRpZmZlcmVudCBzc3Jjc1xuICAgICAgICAgICAgICAgIHZhciBzc3JjbGluZXMgPSBTRFBVdGlsLmZpbmRfbGluZXModGhpcy5tZWRpYVtpXSwgJ2E9c3NyYzonKTtcbiAgICAgICAgICAgICAgICBzc3JjbGluZXMuZm9yRWFjaChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICAgICAgICAgIGlkeCA9IGxpbmUuaW5kZXhPZignICcpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGluZXNzcmMgPSBsaW5lLnN1YnN0cigwLCBpZHgpLnN1YnN0cig3KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxpbmVzc3JjICE9IHNzcmMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0udXAoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNzcmMgPSBsaW5lc3NyYztcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uYygnc291cmNlJywgeyBzc3JjOiBzc3JjLCB4bWxuczogJ3Vybjp4bXBwOmppbmdsZTphcHBzOnJ0cDpzc21hOjAnIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHZhciBrdiA9IGxpbmUuc3Vic3RyKGlkeCArIDEpO1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmMoJ3BhcmFtZXRlcicpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoa3YuaW5kZXhPZignOicpID09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmF0dHJzKHsgbmFtZToga3YgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmF0dHJzKHsgbmFtZToga3Yuc3BsaXQoJzonLCAyKVswXSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uYXR0cnMoeyB2YWx1ZToga3Yuc3BsaXQoJzonLCAyKVsxXSB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbGVtLnVwKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZWxlbS51cCgpO1xuXG4gICAgICAgICAgICAgICAgLy8gb2xkIHByb3ByaWV0YXJ5IG1hcHBpbmcsIHRvIGJlIHJlbW92ZWQgYXQgc29tZSBwb2ludFxuICAgICAgICAgICAgICAgIHRtcCA9IFNEUFV0aWwucGFyc2Vfc3NyYyh0aGlzLm1lZGlhW2ldKTtcbiAgICAgICAgICAgICAgICB0bXAueG1sbnMgPSAnaHR0cDovL2VzdG9zLmRlL25zL3NzcmMnO1xuICAgICAgICAgICAgICAgIHRtcC5zc3JjID0gc3NyYztcbiAgICAgICAgICAgICAgICBlbGVtLmMoJ3NzcmMnLCB0bXApLnVwKCk7IC8vIHNzcmMgaXMgcGFydCBvZiBkZXNjcmlwdGlvblxuXG4gICAgICAgICAgICAgICAgLy8gWEVQLTAzMzkgaGFuZGxlIHNzcmMtZ3JvdXAgYXR0cmlidXRlc1xuICAgICAgICAgICAgICAgIHZhciBzc3JjX2dyb3VwX2xpbmVzID0gU0RQVXRpbC5maW5kX2xpbmVzKHRoaXMubWVkaWFbaV0sICdhPXNzcmMtZ3JvdXA6Jyk7XG4gICAgICAgICAgICAgICAgc3NyY19ncm91cF9saW5lcy5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWR4ID0gbGluZS5pbmRleE9mKCcgJyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzZW1hbnRpY3MgPSBsaW5lLnN1YnN0cigwLCBpZHgpLnN1YnN0cigxMyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzc3JjcyA9IGxpbmUuc3Vic3RyKDE0ICsgc2VtYW50aWNzLmxlbmd0aCkuc3BsaXQoJyAnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNzcmNzLmxlbmd0aCAhPSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmMoJ3NzcmMtZ3JvdXAnLCB7IHNlbWFudGljczogc2VtYW50aWNzLCB4bWxuczogJ3Vybjp4bXBwOmppbmdsZTphcHBzOnJ0cDpzc21hOjAnIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3NyY3MuZm9yRWFjaChmdW5jdGlvbihzc3JjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5jKCdzb3VyY2UnLCB7IHNzcmM6IHNzcmMgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnVwKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0udXAoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUodGhpcy5tZWRpYVtpXSwgJ2E9cnRjcC1tdXgnKSkge1xuICAgICAgICAgICAgICAgIGVsZW0uYygncnRjcC1tdXgnKS51cCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBYRVAtMDI5MyAtLSBtYXAgYT1ydGNwLWZiOipcbiAgICAgICAgICAgIHRoaXMuUnRjcEZiVG9KaW5nbGUoaSwgZWxlbSwgJyonKTtcblxuICAgICAgICAgICAgLy8gWEVQLTAyOTRcbiAgICAgICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZSh0aGlzLm1lZGlhW2ldLCAnYT1leHRtYXA6JykpIHtcbiAgICAgICAgICAgICAgICBsaW5lcyA9IFNEUFV0aWwuZmluZF9saW5lcyh0aGlzLm1lZGlhW2ldLCAnYT1leHRtYXA6Jyk7XG4gICAgICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IGxpbmVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRtcCA9IFNEUFV0aWwucGFyc2VfZXh0bWFwKGxpbmVzW2pdKTtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5jKCdydHAtaGRyZXh0JywgeyB4bWxuczogJ3Vybjp4bXBwOmppbmdsZTphcHBzOnJ0cDpydHAtaGRyZXh0OjAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdXJpOiB0bXAudXJpLFxuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHRtcC52YWx1ZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRtcC5oYXNPd25Qcm9wZXJ0eSgnZGlyZWN0aW9uJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAodG1wLmRpcmVjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3NlbmRvbmx5JzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5hdHRycyh7c2VuZGVyczogJ3Jlc3BvbmRlcid9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAncmVjdm9ubHknOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmF0dHJzKHtzZW5kZXJzOiAnaW5pdGlhdG9yJ30pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdzZW5kcmVjdic6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uYXR0cnMoe3NlbmRlcnM6ICdib3RoJ30pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdpbmFjdGl2ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uYXR0cnMoe3NlbmRlcnM6ICdub25lJ30pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiBoYW5kbGUgcGFyYW1zXG4gICAgICAgICAgICAgICAgICAgIGVsZW0udXAoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbGVtLnVwKCk7IC8vIGVuZCBvZiBkZXNjcmlwdGlvblxuICAgICAgICB9XG5cbiAgICAgICAgLy8gbWFwIGljZS11ZnJhZy9wd2QsIGR0bHMgZmluZ2VycHJpbnQsIGNhbmRpZGF0ZXNcbiAgICAgICAgdGhpcy5UcmFuc3BvcnRUb0ppbmdsZShpLCBlbGVtKTtcblxuICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUodGhpcy5tZWRpYVtpXSwgJ2E9c2VuZHJlY3YnLCB0aGlzLnNlc3Npb24pKSB7XG4gICAgICAgICAgICBlbGVtLmF0dHJzKHtzZW5kZXJzOiAnYm90aCd9KTtcbiAgICAgICAgfSBlbHNlIGlmIChTRFBVdGlsLmZpbmRfbGluZSh0aGlzLm1lZGlhW2ldLCAnYT1zZW5kb25seScsIHRoaXMuc2Vzc2lvbikpIHtcbiAgICAgICAgICAgIGVsZW0uYXR0cnMoe3NlbmRlcnM6ICdpbml0aWF0b3InfSk7XG4gICAgICAgIH0gZWxzZSBpZiAoU0RQVXRpbC5maW5kX2xpbmUodGhpcy5tZWRpYVtpXSwgJ2E9cmVjdm9ubHknLCB0aGlzLnNlc3Npb24pKSB7XG4gICAgICAgICAgICBlbGVtLmF0dHJzKHtzZW5kZXJzOiAncmVzcG9uZGVyJ30pO1xuICAgICAgICB9IGVsc2UgaWYgKFNEUFV0aWwuZmluZF9saW5lKHRoaXMubWVkaWFbaV0sICdhPWluYWN0aXZlJywgdGhpcy5zZXNzaW9uKSkge1xuICAgICAgICAgICAgZWxlbS5hdHRycyh7c2VuZGVyczogJ25vbmUnfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1saW5lLnBvcnQgPT0gJzAnKSB7XG4gICAgICAgICAgICAvLyBlc3RvcyBoYWNrIHRvIHJlamVjdCBhbiBtLWxpbmVcbiAgICAgICAgICAgIGVsZW0uYXR0cnMoe3NlbmRlcnM6ICdyZWplY3RlZCd9KTtcbiAgICAgICAgfVxuICAgICAgICBlbGVtLnVwKCk7IC8vIGVuZCBvZiBjb250ZW50XG4gICAgfVxuICAgIGVsZW0udXAoKTtcbiAgICByZXR1cm4gZWxlbTtcbn07XG5cblNEUC5wcm90b3R5cGUuVHJhbnNwb3J0VG9KaW5nbGUgPSBmdW5jdGlvbiAobWVkaWFpbmRleCwgZWxlbSkge1xuICAgIHZhciBpID0gbWVkaWFpbmRleDtcbiAgICB2YXIgdG1wO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBlbGVtLmMoJ3RyYW5zcG9ydCcpO1xuXG4gICAgLy8gWEVQLTAzNDMgRFRMUy9TQ1RQXG4gICAgaWYgKFNEUFV0aWwuZmluZF9saW5lKHRoaXMubWVkaWFbbWVkaWFpbmRleF0sICdhPXNjdHBtYXA6JykubGVuZ3RoKVxuICAgIHtcbiAgICAgICAgdmFyIHNjdHBtYXAgPSBTRFBVdGlsLmZpbmRfbGluZShcbiAgICAgICAgICAgIHRoaXMubWVkaWFbaV0sICdhPXNjdHBtYXA6Jywgc2VsZi5zZXNzaW9uKTtcbiAgICAgICAgaWYgKHNjdHBtYXApXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBzY3RwQXR0cnMgPSBTRFBVdGlsLnBhcnNlX3NjdHBtYXAoc2N0cG1hcCk7XG4gICAgICAgICAgICBlbGVtLmMoJ3NjdHBtYXAnLFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgeG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6dHJhbnNwb3J0czpkdGxzLXNjdHA6MScsXG4gICAgICAgICAgICAgICAgICAgIG51bWJlcjogc2N0cEF0dHJzWzBdLCAvKiBTQ1RQIHBvcnQgKi9cbiAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6IHNjdHBBdHRyc1sxXSwgLyogcHJvdG9jb2wgKi9cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vIE9wdGlvbmFsIHN0cmVhbSBjb3VudCBhdHRyaWJ1dGVcbiAgICAgICAgICAgIGlmIChzY3RwQXR0cnMubGVuZ3RoID4gMilcbiAgICAgICAgICAgICAgICBlbGVtLmF0dHJzKHsgc3RyZWFtczogc2N0cEF0dHJzWzJdfSk7XG4gICAgICAgICAgICBlbGVtLnVwKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gWEVQLTAzMjBcbiAgICB2YXIgZmluZ2VycHJpbnRzID0gU0RQVXRpbC5maW5kX2xpbmVzKHRoaXMubWVkaWFbbWVkaWFpbmRleF0sICdhPWZpbmdlcnByaW50OicsIHRoaXMuc2Vzc2lvbik7XG4gICAgZmluZ2VycHJpbnRzLmZvckVhY2goZnVuY3Rpb24obGluZSkge1xuICAgICAgICB0bXAgPSBTRFBVdGlsLnBhcnNlX2ZpbmdlcnByaW50KGxpbmUpO1xuICAgICAgICB0bXAueG1sbnMgPSAndXJuOnhtcHA6amluZ2xlOmFwcHM6ZHRsczowJztcbiAgICAgICAgZWxlbS5jKCdmaW5nZXJwcmludCcpLnQodG1wLmZpbmdlcnByaW50KTtcbiAgICAgICAgZGVsZXRlIHRtcC5maW5nZXJwcmludDtcbiAgICAgICAgbGluZSA9IFNEUFV0aWwuZmluZF9saW5lKHNlbGYubWVkaWFbbWVkaWFpbmRleF0sICdhPXNldHVwOicsIHNlbGYuc2Vzc2lvbik7XG4gICAgICAgIGlmIChsaW5lKSB7XG4gICAgICAgICAgICB0bXAuc2V0dXAgPSBsaW5lLnN1YnN0cig4KTtcbiAgICAgICAgfVxuICAgICAgICBlbGVtLmF0dHJzKHRtcCk7XG4gICAgICAgIGVsZW0udXAoKTsgLy8gZW5kIG9mIGZpbmdlcnByaW50XG4gICAgfSk7XG4gICAgdG1wID0gU0RQVXRpbC5pY2VwYXJhbXModGhpcy5tZWRpYVttZWRpYWluZGV4XSwgdGhpcy5zZXNzaW9uKTtcbiAgICBpZiAodG1wKSB7XG4gICAgICAgIHRtcC54bWxucyA9ICd1cm46eG1wcDpqaW5nbGU6dHJhbnNwb3J0czppY2UtdWRwOjEnO1xuICAgICAgICBlbGVtLmF0dHJzKHRtcCk7XG4gICAgICAgIC8vIFhFUC0wMTc2XG4gICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZSh0aGlzLm1lZGlhW21lZGlhaW5kZXhdLCAnYT1jYW5kaWRhdGU6JywgdGhpcy5zZXNzaW9uKSkgeyAvLyBhZGQgYW55IGE9Y2FuZGlkYXRlIGxpbmVzXG4gICAgICAgICAgICB2YXIgbGluZXMgPSBTRFBVdGlsLmZpbmRfbGluZXModGhpcy5tZWRpYVttZWRpYWluZGV4XSwgJ2E9Y2FuZGlkYXRlOicsIHRoaXMuc2Vzc2lvbik7XG4gICAgICAgICAgICBsaW5lcy5mb3JFYWNoKGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgICAgICAgICAgZWxlbS5jKCdjYW5kaWRhdGUnLCBTRFBVdGlsLmNhbmRpZGF0ZVRvSmluZ2xlKGxpbmUpKS51cCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxlbS51cCgpOyAvLyBlbmQgb2YgdHJhbnNwb3J0XG59XG5cblNEUC5wcm90b3R5cGUuUnRjcEZiVG9KaW5nbGUgPSBmdW5jdGlvbiAobWVkaWFpbmRleCwgZWxlbSwgcGF5bG9hZHR5cGUpIHsgLy8gWEVQLTAyOTNcbiAgICB2YXIgbGluZXMgPSBTRFBVdGlsLmZpbmRfbGluZXModGhpcy5tZWRpYVttZWRpYWluZGV4XSwgJ2E9cnRjcC1mYjonICsgcGF5bG9hZHR5cGUpO1xuICAgIGxpbmVzLmZvckVhY2goZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgdmFyIHRtcCA9IFNEUFV0aWwucGFyc2VfcnRjcGZiKGxpbmUpO1xuICAgICAgICBpZiAodG1wLnR5cGUgPT0gJ3Ryci1pbnQnKSB7XG4gICAgICAgICAgICBlbGVtLmMoJ3J0Y3AtZmItdHJyLWludCcsIHt4bWxuczogJ3Vybjp4bXBwOmppbmdsZTphcHBzOnJ0cDpydGNwLWZiOjAnLCB2YWx1ZTogdG1wLnBhcmFtc1swXX0pO1xuICAgICAgICAgICAgZWxlbS51cCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWxlbS5jKCdydGNwLWZiJywge3htbG5zOiAndXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOnJ0Y3AtZmI6MCcsIHR5cGU6IHRtcC50eXBlfSk7XG4gICAgICAgICAgICBpZiAodG1wLnBhcmFtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgZWxlbS5hdHRycyh7J3N1YnR5cGUnOiB0bXAucGFyYW1zWzBdfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbGVtLnVwKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cblNEUC5wcm90b3R5cGUuUnRjcEZiRnJvbUppbmdsZSA9IGZ1bmN0aW9uIChlbGVtLCBwYXlsb2FkdHlwZSkgeyAvLyBYRVAtMDI5M1xuICAgIHZhciBtZWRpYSA9ICcnO1xuICAgIHZhciB0bXAgPSBlbGVtLmZpbmQoJz5ydGNwLWZiLXRyci1pbnRbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6cnRjcC1mYjowXCJdJyk7XG4gICAgaWYgKHRtcC5sZW5ndGgpIHtcbiAgICAgICAgbWVkaWEgKz0gJ2E9cnRjcC1mYjonICsgJyonICsgJyAnICsgJ3Ryci1pbnQnICsgJyAnO1xuICAgICAgICBpZiAodG1wLmF0dHIoJ3ZhbHVlJykpIHtcbiAgICAgICAgICAgIG1lZGlhICs9IHRtcC5hdHRyKCd2YWx1ZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWVkaWEgKz0gJzAnO1xuICAgICAgICB9XG4gICAgICAgIG1lZGlhICs9ICdcXHJcXG4nO1xuICAgIH1cbiAgICB0bXAgPSBlbGVtLmZpbmQoJz5ydGNwLWZiW3htbG5zPVwidXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOnJ0Y3AtZmI6MFwiXScpO1xuICAgIHRtcC5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbWVkaWEgKz0gJ2E9cnRjcC1mYjonICsgcGF5bG9hZHR5cGUgKyAnICcgKyAkKHRoaXMpLmF0dHIoJ3R5cGUnKTtcbiAgICAgICAgaWYgKCQodGhpcykuYXR0cignc3VidHlwZScpKSB7XG4gICAgICAgICAgICBtZWRpYSArPSAnICcgKyAkKHRoaXMpLmF0dHIoJ3N1YnR5cGUnKTtcbiAgICAgICAgfVxuICAgICAgICBtZWRpYSArPSAnXFxyXFxuJztcbiAgICB9KTtcbiAgICByZXR1cm4gbWVkaWE7XG59O1xuXG4vLyBjb25zdHJ1Y3QgYW4gU0RQIGZyb20gYSBqaW5nbGUgc3RhbnphXG5TRFAucHJvdG90eXBlLmZyb21KaW5nbGUgPSBmdW5jdGlvbiAoamluZ2xlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMucmF3ID0gJ3Y9MFxcclxcbicgK1xuICAgICAgICAnbz0tICcgKyAnMTkyMzUxODUxNicgKyAnIDIgSU4gSVA0IDAuMC4wLjBcXHJcXG4nICsvLyBGSVhNRVxuICAgICAgICAncz0tXFxyXFxuJyArXG4gICAgICAgICd0PTAgMFxcclxcbic7XG4gICAgLy8gaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvZHJhZnQtaWV0Zi1tbXVzaWMtc2RwLWJ1bmRsZS1uZWdvdGlhdGlvbi0wNCNzZWN0aW9uLThcbiAgICBpZiAoJChqaW5nbGUpLmZpbmQoJz5ncm91cFt4bWxucz1cInVybjp4bXBwOmppbmdsZTphcHBzOmdyb3VwaW5nOjBcIl0nKS5sZW5ndGgpIHtcbiAgICAgICAgJChqaW5nbGUpLmZpbmQoJz5ncm91cFt4bWxucz1cInVybjp4bXBwOmppbmdsZTphcHBzOmdyb3VwaW5nOjBcIl0nKS5lYWNoKGZ1bmN0aW9uIChpZHgsIGdyb3VwKSB7XG4gICAgICAgICAgICB2YXIgY29udGVudHMgPSAkKGdyb3VwKS5maW5kKCc+Y29udGVudCcpLm1hcChmdW5jdGlvbiAoaWR4LCBjb250ZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRlbnQuZ2V0QXR0cmlidXRlKCduYW1lJyk7XG4gICAgICAgICAgICB9KS5nZXQoKTtcbiAgICAgICAgICAgIGlmIChjb250ZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5yYXcgKz0gJ2E9Z3JvdXA6JyArIChncm91cC5nZXRBdHRyaWJ1dGUoJ3NlbWFudGljcycpIHx8IGdyb3VwLmdldEF0dHJpYnV0ZSgndHlwZScpKSArICcgJyArIGNvbnRlbnRzLmpvaW4oJyAnKSArICdcXHJcXG4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKCQoamluZ2xlKS5maW5kKCc+Z3JvdXBbeG1sbnM9XCJ1cm46aWV0ZjpyZmM6NTg4OFwiXScpLmxlbmd0aCkge1xuICAgICAgICAvLyB0ZW1wb3JhcnkgbmFtZXNwYWNlLCBub3QgdG8gYmUgdXNlZC4gdG8gYmUgcmVtb3ZlZCBzb29uLlxuICAgICAgICAkKGppbmdsZSkuZmluZCgnPmdyb3VwW3htbG5zPVwidXJuOmlldGY6cmZjOjU4ODhcIl0nKS5lYWNoKGZ1bmN0aW9uIChpZHgsIGdyb3VwKSB7XG4gICAgICAgICAgICB2YXIgY29udGVudHMgPSAkKGdyb3VwKS5maW5kKCc+Y29udGVudCcpLm1hcChmdW5jdGlvbiAoaWR4LCBjb250ZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRlbnQuZ2V0QXR0cmlidXRlKCduYW1lJyk7XG4gICAgICAgICAgICB9KS5nZXQoKTtcbiAgICAgICAgICAgIGlmIChncm91cC5nZXRBdHRyaWJ1dGUoJ3R5cGUnKSAhPT0gbnVsbCAmJiBjb250ZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5yYXcgKz0gJ2E9Z3JvdXA6JyArIGdyb3VwLmdldEF0dHJpYnV0ZSgndHlwZScpICsgJyAnICsgY29udGVudHMuam9pbignICcpICsgJ1xcclxcbic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGZvciBiYWNrd2FyZCBjb21wYWJpbGl0eSwgdG8gYmUgcmVtb3ZlZCBzb29uXG4gICAgICAgIC8vIGFzc3VtZSBhbGwgY29udGVudHMgYXJlIGluIHRoZSBzYW1lIGJ1bmRsZSBncm91cCwgY2FuIGJlIGltcHJvdmVkIHVwb24gbGF0ZXJcbiAgICAgICAgdmFyIGJ1bmRsZSA9ICQoamluZ2xlKS5maW5kKCc+Y29udGVudCcpLmZpbHRlcihmdW5jdGlvbiAoaWR4LCBjb250ZW50KSB7XG4gICAgICAgICAgICAvL2VsZW0uYygnYnVuZGxlJywge3htbG5zOidodHRwOi8vZXN0b3MuZGUvbnMvYnVuZGxlJ30pO1xuICAgICAgICAgICAgcmV0dXJuICQoY29udGVudCkuZmluZCgnPmJ1bmRsZScpLmxlbmd0aCA+IDA7XG4gICAgICAgIH0pLm1hcChmdW5jdGlvbiAoaWR4LCBjb250ZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRlbnQuZ2V0QXR0cmlidXRlKCduYW1lJyk7XG4gICAgICAgICAgICB9KS5nZXQoKTtcbiAgICAgICAgaWYgKGJ1bmRsZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMucmF3ICs9ICdhPWdyb3VwOkJVTkRMRSAnICsgYnVuZGxlLmpvaW4oJyAnKSArICdcXHJcXG4nO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5zZXNzaW9uID0gdGhpcy5yYXc7XG4gICAgamluZ2xlLmZpbmQoJz5jb250ZW50JykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBtID0gc2VsZi5qaW5nbGUybWVkaWEoJCh0aGlzKSk7XG4gICAgICAgIHNlbGYubWVkaWEucHVzaChtKTtcbiAgICB9KTtcblxuICAgIC8vIHJlY29uc3RydWN0IG1zaWQtc2VtYW50aWMgLS0gYXBwYXJlbnRseSBub3QgbmVjZXNzYXJ5XG4gICAgLypcbiAgICAgdmFyIG1zaWQgPSBTRFBVdGlsLnBhcnNlX3NzcmModGhpcy5yYXcpO1xuICAgICBpZiAobXNpZC5oYXNPd25Qcm9wZXJ0eSgnbXNsYWJlbCcpKSB7XG4gICAgIHRoaXMuc2Vzc2lvbiArPSBcImE9bXNpZC1zZW1hbnRpYzogV01TIFwiICsgbXNpZC5tc2xhYmVsICsgXCJcXHJcXG5cIjtcbiAgICAgfVxuICAgICAqL1xuXG4gICAgdGhpcy5yYXcgPSB0aGlzLnNlc3Npb24gKyB0aGlzLm1lZGlhLmpvaW4oJycpO1xufTtcblxuLy8gdHJhbnNsYXRlIGEgamluZ2xlIGNvbnRlbnQgZWxlbWVudCBpbnRvIGFuIGFuIFNEUCBtZWRpYSBwYXJ0XG5TRFAucHJvdG90eXBlLmppbmdsZTJtZWRpYSA9IGZ1bmN0aW9uIChjb250ZW50KSB7XG4gICAgdmFyIG1lZGlhID0gJycsXG4gICAgICAgIGRlc2MgPSBjb250ZW50LmZpbmQoJ2Rlc2NyaXB0aW9uJyksXG4gICAgICAgIHNzcmMgPSBkZXNjLmF0dHIoJ3NzcmMnKSxcbiAgICAgICAgc2VsZiA9IHRoaXMsXG4gICAgICAgIHRtcDtcbiAgICB2YXIgc2N0cCA9IGNvbnRlbnQuZmluZChcbiAgICAgICAgJz50cmFuc3BvcnQ+c2N0cG1hcFt4bWxucz1cInVybjp4bXBwOmppbmdsZTp0cmFuc3BvcnRzOmR0bHMtc2N0cDoxXCJdJyk7XG5cbiAgICB0bXAgPSB7IG1lZGlhOiBkZXNjLmF0dHIoJ21lZGlhJykgfTtcbiAgICB0bXAucG9ydCA9ICcxJztcbiAgICBpZiAoY29udGVudC5hdHRyKCdzZW5kZXJzJykgPT0gJ3JlamVjdGVkJykge1xuICAgICAgICAvLyBlc3RvcyBoYWNrIHRvIHJlamVjdCBhbiBtLWxpbmUuXG4gICAgICAgIHRtcC5wb3J0ID0gJzAnO1xuICAgIH1cbiAgICBpZiAoY29udGVudC5maW5kKCc+dHJhbnNwb3J0PmZpbmdlcnByaW50JykubGVuZ3RoIHx8IGRlc2MuZmluZCgnZW5jcnlwdGlvbicpLmxlbmd0aCkge1xuICAgICAgICBpZiAoc2N0cC5sZW5ndGgpXG4gICAgICAgICAgICB0bXAucHJvdG8gPSAnRFRMUy9TQ1RQJztcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgdG1wLnByb3RvID0gJ1JUUC9TQVZQRic7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdG1wLnByb3RvID0gJ1JUUC9BVlBGJztcbiAgICB9XG4gICAgaWYgKCFzY3RwLmxlbmd0aClcbiAgICB7XG4gICAgICAgIHRtcC5mbXQgPSBkZXNjLmZpbmQoJ3BheWxvYWQtdHlwZScpLm1hcChcbiAgICAgICAgICAgIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdpZCcpOyB9KS5nZXQoKTtcbiAgICAgICAgbWVkaWEgKz0gU0RQVXRpbC5idWlsZF9tbGluZSh0bXApICsgJ1xcclxcbic7XG4gICAgfVxuICAgIGVsc2VcbiAgICB7XG4gICAgICAgIG1lZGlhICs9ICdtPWFwcGxpY2F0aW9uIDEgRFRMUy9TQ1RQICcgKyBzY3RwLmF0dHIoJ251bWJlcicpICsgJ1xcclxcbic7XG4gICAgICAgIG1lZGlhICs9ICdhPXNjdHBtYXA6JyArIHNjdHAuYXR0cignbnVtYmVyJykgK1xuICAgICAgICAgICAgJyAnICsgc2N0cC5hdHRyKCdwcm90b2NvbCcpO1xuXG4gICAgICAgIHZhciBzdHJlYW1Db3VudCA9IHNjdHAuYXR0cignc3RyZWFtcycpO1xuICAgICAgICBpZiAoc3RyZWFtQ291bnQpXG4gICAgICAgICAgICBtZWRpYSArPSAnICcgKyBzdHJlYW1Db3VudCArICdcXHJcXG4nO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBtZWRpYSArPSAnXFxyXFxuJztcbiAgICB9XG5cbiAgICBtZWRpYSArPSAnYz1JTiBJUDQgMC4wLjAuMFxcclxcbic7XG4gICAgaWYgKCFzY3RwLmxlbmd0aClcbiAgICAgICAgbWVkaWEgKz0gJ2E9cnRjcDoxIElOIElQNCAwLjAuMC4wXFxyXFxuJztcbiAgICB0bXAgPSBjb250ZW50LmZpbmQoJz50cmFuc3BvcnRbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6dHJhbnNwb3J0czppY2UtdWRwOjFcIl0nKTtcbiAgICBpZiAodG1wLmxlbmd0aCkge1xuICAgICAgICBpZiAodG1wLmF0dHIoJ3VmcmFnJykpIHtcbiAgICAgICAgICAgIG1lZGlhICs9IFNEUFV0aWwuYnVpbGRfaWNldWZyYWcodG1wLmF0dHIoJ3VmcmFnJykpICsgJ1xcclxcbic7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRtcC5hdHRyKCdwd2QnKSkge1xuICAgICAgICAgICAgbWVkaWEgKz0gU0RQVXRpbC5idWlsZF9pY2Vwd2QodG1wLmF0dHIoJ3B3ZCcpKSArICdcXHJcXG4nO1xuICAgICAgICB9XG4gICAgICAgIHRtcC5maW5kKCc+ZmluZ2VycHJpbnQnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIEZJWE1FOiBjaGVjayBuYW1lc3BhY2UgYXQgc29tZSBwb2ludFxuICAgICAgICAgICAgbWVkaWEgKz0gJ2E9ZmluZ2VycHJpbnQ6JyArIHRoaXMuZ2V0QXR0cmlidXRlKCdoYXNoJyk7XG4gICAgICAgICAgICBtZWRpYSArPSAnICcgKyAkKHRoaXMpLnRleHQoKTtcbiAgICAgICAgICAgIG1lZGlhICs9ICdcXHJcXG4nO1xuICAgICAgICAgICAgaWYgKHRoaXMuZ2V0QXR0cmlidXRlKCdzZXR1cCcpKSB7XG4gICAgICAgICAgICAgICAgbWVkaWEgKz0gJ2E9c2V0dXA6JyArIHRoaXMuZ2V0QXR0cmlidXRlKCdzZXR1cCcpICsgJ1xcclxcbic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzd2l0Y2ggKGNvbnRlbnQuYXR0cignc2VuZGVycycpKSB7XG4gICAgICAgIGNhc2UgJ2luaXRpYXRvcic6XG4gICAgICAgICAgICBtZWRpYSArPSAnYT1zZW5kb25seVxcclxcbic7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAncmVzcG9uZGVyJzpcbiAgICAgICAgICAgIG1lZGlhICs9ICdhPXJlY3Zvbmx5XFxyXFxuJztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdub25lJzpcbiAgICAgICAgICAgIG1lZGlhICs9ICdhPWluYWN0aXZlXFxyXFxuJztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdib3RoJzpcbiAgICAgICAgICAgIG1lZGlhICs9ICdhPXNlbmRyZWN2XFxyXFxuJztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBtZWRpYSArPSAnYT1taWQ6JyArIGNvbnRlbnQuYXR0cignbmFtZScpICsgJ1xcclxcbic7XG5cbiAgICAvLyA8ZGVzY3JpcHRpb24+PHJ0Y3AtbXV4Lz48L2Rlc2NyaXB0aW9uPlxuICAgIC8vIHNlZSBodHRwOi8vY29kZS5nb29nbGUuY29tL3AvbGliamluZ2xlL2lzc3Vlcy9kZXRhaWw/aWQ9MzA5IC0tIG5vIHNwZWMgdGhvdWdoXG4gICAgLy8gYW5kIGh0dHA6Ly9tYWlsLmphYmJlci5vcmcvcGlwZXJtYWlsL2ppbmdsZS8yMDExLURlY2VtYmVyLzAwMTc2MS5odG1sXG4gICAgaWYgKGRlc2MuZmluZCgncnRjcC1tdXgnKS5sZW5ndGgpIHtcbiAgICAgICAgbWVkaWEgKz0gJ2E9cnRjcC1tdXhcXHJcXG4nO1xuICAgIH1cblxuICAgIGlmIChkZXNjLmZpbmQoJ2VuY3J5cHRpb24nKS5sZW5ndGgpIHtcbiAgICAgICAgZGVzYy5maW5kKCdlbmNyeXB0aW9uPmNyeXB0bycpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgbWVkaWEgKz0gJ2E9Y3J5cHRvOicgKyB0aGlzLmdldEF0dHJpYnV0ZSgndGFnJyk7XG4gICAgICAgICAgICBtZWRpYSArPSAnICcgKyB0aGlzLmdldEF0dHJpYnV0ZSgnY3J5cHRvLXN1aXRlJyk7XG4gICAgICAgICAgICBtZWRpYSArPSAnICcgKyB0aGlzLmdldEF0dHJpYnV0ZSgna2V5LXBhcmFtcycpO1xuICAgICAgICAgICAgaWYgKHRoaXMuZ2V0QXR0cmlidXRlKCdzZXNzaW9uLXBhcmFtcycpKSB7XG4gICAgICAgICAgICAgICAgbWVkaWEgKz0gJyAnICsgdGhpcy5nZXRBdHRyaWJ1dGUoJ3Nlc3Npb24tcGFyYW1zJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtZWRpYSArPSAnXFxyXFxuJztcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGRlc2MuZmluZCgncGF5bG9hZC10eXBlJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIG1lZGlhICs9IFNEUFV0aWwuYnVpbGRfcnRwbWFwKHRoaXMpICsgJ1xcclxcbic7XG4gICAgICAgIGlmICgkKHRoaXMpLmZpbmQoJz5wYXJhbWV0ZXInKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIG1lZGlhICs9ICdhPWZtdHA6JyArIHRoaXMuZ2V0QXR0cmlidXRlKCdpZCcpICsgJyAnO1xuICAgICAgICAgICAgbWVkaWEgKz0gJCh0aGlzKS5maW5kKCdwYXJhbWV0ZXInKS5tYXAoZnVuY3Rpb24gKCkgeyByZXR1cm4gKHRoaXMuZ2V0QXR0cmlidXRlKCduYW1lJykgPyAodGhpcy5nZXRBdHRyaWJ1dGUoJ25hbWUnKSArICc9JykgOiAnJykgKyB0aGlzLmdldEF0dHJpYnV0ZSgndmFsdWUnKTsgfSkuZ2V0KCkuam9pbignOycpO1xuICAgICAgICAgICAgbWVkaWEgKz0gJ1xcclxcbic7XG4gICAgICAgIH1cbiAgICAgICAgLy8geGVwLTAyOTNcbiAgICAgICAgbWVkaWEgKz0gc2VsZi5SdGNwRmJGcm9tSmluZ2xlKCQodGhpcyksIHRoaXMuZ2V0QXR0cmlidXRlKCdpZCcpKTtcbiAgICB9KTtcblxuICAgIC8vIHhlcC0wMjkzXG4gICAgbWVkaWEgKz0gc2VsZi5SdGNwRmJGcm9tSmluZ2xlKGRlc2MsICcqJyk7XG5cbiAgICAvLyB4ZXAtMDI5NFxuICAgIHRtcCA9IGRlc2MuZmluZCgnPnJ0cC1oZHJleHRbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6cnRwLWhkcmV4dDowXCJdJyk7XG4gICAgdG1wLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBtZWRpYSArPSAnYT1leHRtYXA6JyArIHRoaXMuZ2V0QXR0cmlidXRlKCdpZCcpICsgJyAnICsgdGhpcy5nZXRBdHRyaWJ1dGUoJ3VyaScpICsgJ1xcclxcbic7XG4gICAgfSk7XG5cbiAgICBjb250ZW50LmZpbmQoJz50cmFuc3BvcnRbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6dHJhbnNwb3J0czppY2UtdWRwOjFcIl0+Y2FuZGlkYXRlJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIG1lZGlhICs9IFNEUFV0aWwuY2FuZGlkYXRlRnJvbUppbmdsZSh0aGlzKTtcbiAgICB9KTtcblxuICAgIC8vIFhFUC0wMzM5IGhhbmRsZSBzc3JjLWdyb3VwIGF0dHJpYnV0ZXNcbiAgICB0bXAgPSBjb250ZW50LmZpbmQoJ2Rlc2NyaXB0aW9uPnNzcmMtZ3JvdXBbeG1sbnM9XCJ1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6c3NtYTowXCJdJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHNlbWFudGljcyA9IHRoaXMuZ2V0QXR0cmlidXRlKCdzZW1hbnRpY3MnKTtcbiAgICAgICAgdmFyIHNzcmNzID0gJCh0aGlzKS5maW5kKCc+c291cmNlJykubWFwKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdzc3JjJyk7XG4gICAgICAgIH0pLmdldCgpO1xuXG4gICAgICAgIGlmIChzc3Jjcy5sZW5ndGggIT0gMCkge1xuICAgICAgICAgICAgbWVkaWEgKz0gJ2E9c3NyYy1ncm91cDonICsgc2VtYW50aWNzICsgJyAnICsgc3NyY3Muam9pbignICcpICsgJ1xcclxcbic7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHRtcCA9IGNvbnRlbnQuZmluZCgnZGVzY3JpcHRpb24+c291cmNlW3htbG5zPVwidXJuOnhtcHA6amluZ2xlOmFwcHM6cnRwOnNzbWE6MFwiXScpO1xuICAgIHRtcC5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNzcmMgPSB0aGlzLmdldEF0dHJpYnV0ZSgnc3NyYycpO1xuICAgICAgICAkKHRoaXMpLmZpbmQoJz5wYXJhbWV0ZXInKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIG1lZGlhICs9ICdhPXNzcmM6JyArIHNzcmMgKyAnICcgKyB0aGlzLmdldEF0dHJpYnV0ZSgnbmFtZScpO1xuICAgICAgICAgICAgaWYgKHRoaXMuZ2V0QXR0cmlidXRlKCd2YWx1ZScpICYmIHRoaXMuZ2V0QXR0cmlidXRlKCd2YWx1ZScpLmxlbmd0aClcbiAgICAgICAgICAgICAgICBtZWRpYSArPSAnOicgKyB0aGlzLmdldEF0dHJpYnV0ZSgndmFsdWUnKTtcbiAgICAgICAgICAgIG1lZGlhICs9ICdcXHJcXG4nO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGlmICh0bXAubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIC8vIGZhbGxiYWNrIHRvIHByb3ByaWV0YXJ5IG1hcHBpbmcgb2YgYT1zc3JjIGxpbmVzXG4gICAgICAgIHRtcCA9IGNvbnRlbnQuZmluZCgnZGVzY3JpcHRpb24+c3NyY1t4bWxucz1cImh0dHA6Ly9lc3Rvcy5kZS9ucy9zc3JjXCJdJyk7XG4gICAgICAgIGlmICh0bXAubGVuZ3RoKSB7XG4gICAgICAgICAgICBtZWRpYSArPSAnYT1zc3JjOicgKyBzc3JjICsgJyBjbmFtZTonICsgdG1wLmF0dHIoJ2NuYW1lJykgKyAnXFxyXFxuJztcbiAgICAgICAgICAgIG1lZGlhICs9ICdhPXNzcmM6JyArIHNzcmMgKyAnIG1zaWQ6JyArIHRtcC5hdHRyKCdtc2lkJykgKyAnXFxyXFxuJztcbiAgICAgICAgICAgIG1lZGlhICs9ICdhPXNzcmM6JyArIHNzcmMgKyAnIG1zbGFiZWw6JyArIHRtcC5hdHRyKCdtc2xhYmVsJykgKyAnXFxyXFxuJztcbiAgICAgICAgICAgIG1lZGlhICs9ICdhPXNzcmM6JyArIHNzcmMgKyAnIGxhYmVsOicgKyB0bXAuYXR0cignbGFiZWwnKSArICdcXHJcXG4nO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtZWRpYTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU0RQO1xuIiwiLyoqXG4gKiBDb250YWlucyB1dGlsaXR5IGNsYXNzZXMgdXNlZCBpbiBTRFAgY2xhc3MuXG4gKlxuICovXG5cblNEUFV0aWwgPSB7XG4gICAgaWNlcGFyYW1zOiBmdW5jdGlvbiAobWVkaWFkZXNjLCBzZXNzaW9uZGVzYykge1xuICAgICAgICB2YXIgZGF0YSA9IG51bGw7XG4gICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZShtZWRpYWRlc2MsICdhPWljZS11ZnJhZzonLCBzZXNzaW9uZGVzYykgJiZcbiAgICAgICAgICAgIFNEUFV0aWwuZmluZF9saW5lKG1lZGlhZGVzYywgJ2E9aWNlLXB3ZDonLCBzZXNzaW9uZGVzYykpIHtcbiAgICAgICAgICAgIGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgdWZyYWc6IFNEUFV0aWwucGFyc2VfaWNldWZyYWcoU0RQVXRpbC5maW5kX2xpbmUobWVkaWFkZXNjLCAnYT1pY2UtdWZyYWc6Jywgc2Vzc2lvbmRlc2MpKSxcbiAgICAgICAgICAgICAgICBwd2Q6IFNEUFV0aWwucGFyc2VfaWNlcHdkKFNEUFV0aWwuZmluZF9saW5lKG1lZGlhZGVzYywgJ2E9aWNlLXB3ZDonLCBzZXNzaW9uZGVzYykpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH0sXG4gICAgcGFyc2VfaWNldWZyYWc6IGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgIHJldHVybiBsaW5lLnN1YnN0cmluZygxMik7XG4gICAgfSxcbiAgICBidWlsZF9pY2V1ZnJhZzogZnVuY3Rpb24gKGZyYWcpIHtcbiAgICAgICAgcmV0dXJuICdhPWljZS11ZnJhZzonICsgZnJhZztcbiAgICB9LFxuICAgIHBhcnNlX2ljZXB3ZDogZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgcmV0dXJuIGxpbmUuc3Vic3RyaW5nKDEwKTtcbiAgICB9LFxuICAgIGJ1aWxkX2ljZXB3ZDogZnVuY3Rpb24gKHB3ZCkge1xuICAgICAgICByZXR1cm4gJ2E9aWNlLXB3ZDonICsgcHdkO1xuICAgIH0sXG4gICAgcGFyc2VfbWlkOiBmdW5jdGlvbiAobGluZSkge1xuICAgICAgICByZXR1cm4gbGluZS5zdWJzdHJpbmcoNik7XG4gICAgfSxcbiAgICBwYXJzZV9tbGluZTogZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgdmFyIHBhcnRzID0gbGluZS5zdWJzdHJpbmcoMikuc3BsaXQoJyAnKSxcbiAgICAgICAgICAgIGRhdGEgPSB7fTtcbiAgICAgICAgZGF0YS5tZWRpYSA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICAgIGRhdGEucG9ydCA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICAgIGRhdGEucHJvdG8gPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAgICBpZiAocGFydHNbcGFydHMubGVuZ3RoIC0gMV0gPT09ICcnKSB7IC8vIHRyYWlsaW5nIHdoaXRlc3BhY2VcbiAgICAgICAgICAgIHBhcnRzLnBvcCgpO1xuICAgICAgICB9XG4gICAgICAgIGRhdGEuZm10ID0gcGFydHM7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH0sXG4gICAgYnVpbGRfbWxpbmU6IGZ1bmN0aW9uIChtbGluZSkge1xuICAgICAgICByZXR1cm4gJ209JyArIG1saW5lLm1lZGlhICsgJyAnICsgbWxpbmUucG9ydCArICcgJyArIG1saW5lLnByb3RvICsgJyAnICsgbWxpbmUuZm10LmpvaW4oJyAnKTtcbiAgICB9LFxuICAgIHBhcnNlX3J0cG1hcDogZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgdmFyIHBhcnRzID0gbGluZS5zdWJzdHJpbmcoOSkuc3BsaXQoJyAnKSxcbiAgICAgICAgICAgIGRhdGEgPSB7fTtcbiAgICAgICAgZGF0YS5pZCA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICAgIHBhcnRzID0gcGFydHNbMF0uc3BsaXQoJy8nKTtcbiAgICAgICAgZGF0YS5uYW1lID0gcGFydHMuc2hpZnQoKTtcbiAgICAgICAgZGF0YS5jbG9ja3JhdGUgPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAgICBkYXRhLmNoYW5uZWxzID0gcGFydHMubGVuZ3RoID8gcGFydHMuc2hpZnQoKSA6ICcxJztcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBQYXJzZXMgU0RQIGxpbmUgXCJhPXNjdHBtYXA6Li4uXCIgYW5kIGV4dHJhY3RzIFNDVFAgcG9ydCBmcm9tIGl0LlxuICAgICAqIEBwYXJhbSBsaW5lIGVnLiBcImE9c2N0cG1hcDo1MDAwIHdlYnJ0Yy1kYXRhY2hhbm5lbFwiXG4gICAgICogQHJldHVybnMgW1NDVFAgcG9ydCBudW1iZXIsIHByb3RvY29sLCBzdHJlYW1zXVxuICAgICAqL1xuICAgIHBhcnNlX3NjdHBtYXA6IGZ1bmN0aW9uIChsaW5lKVxuICAgIHtcbiAgICAgICAgdmFyIHBhcnRzID0gbGluZS5zdWJzdHJpbmcoMTApLnNwbGl0KCcgJyk7XG4gICAgICAgIHZhciBzY3RwUG9ydCA9IHBhcnRzWzBdO1xuICAgICAgICB2YXIgcHJvdG9jb2wgPSBwYXJ0c1sxXTtcbiAgICAgICAgLy8gU3RyZWFtIGNvdW50IGlzIG9wdGlvbmFsXG4gICAgICAgIHZhciBzdHJlYW1Db3VudCA9IHBhcnRzLmxlbmd0aCA+IDIgPyBwYXJ0c1syXSA6IG51bGw7XG4gICAgICAgIHJldHVybiBbc2N0cFBvcnQsIHByb3RvY29sLCBzdHJlYW1Db3VudF07Ly8gU0NUUCBwb3J0XG4gICAgfSxcbiAgICBidWlsZF9ydHBtYXA6IGZ1bmN0aW9uIChlbCkge1xuICAgICAgICB2YXIgbGluZSA9ICdhPXJ0cG1hcDonICsgZWwuZ2V0QXR0cmlidXRlKCdpZCcpICsgJyAnICsgZWwuZ2V0QXR0cmlidXRlKCduYW1lJykgKyAnLycgKyBlbC5nZXRBdHRyaWJ1dGUoJ2Nsb2NrcmF0ZScpO1xuICAgICAgICBpZiAoZWwuZ2V0QXR0cmlidXRlKCdjaGFubmVscycpICYmIGVsLmdldEF0dHJpYnV0ZSgnY2hhbm5lbHMnKSAhPSAnMScpIHtcbiAgICAgICAgICAgIGxpbmUgKz0gJy8nICsgZWwuZ2V0QXR0cmlidXRlKCdjaGFubmVscycpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsaW5lO1xuICAgIH0sXG4gICAgcGFyc2VfY3J5cHRvOiBmdW5jdGlvbiAobGluZSkge1xuICAgICAgICB2YXIgcGFydHMgPSBsaW5lLnN1YnN0cmluZyg5KS5zcGxpdCgnICcpLFxuICAgICAgICAgICAgZGF0YSA9IHt9O1xuICAgICAgICBkYXRhLnRhZyA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICAgIGRhdGFbJ2NyeXB0by1zdWl0ZSddID0gcGFydHMuc2hpZnQoKTtcbiAgICAgICAgZGF0YVsna2V5LXBhcmFtcyddID0gcGFydHMuc2hpZnQoKTtcbiAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgZGF0YVsnc2Vzc2lvbi1wYXJhbXMnXSA9IHBhcnRzLmpvaW4oJyAnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9LFxuICAgIHBhcnNlX2ZpbmdlcnByaW50OiBmdW5jdGlvbiAobGluZSkgeyAvLyBSRkMgNDU3MlxuICAgICAgICB2YXIgcGFydHMgPSBsaW5lLnN1YnN0cmluZygxNCkuc3BsaXQoJyAnKSxcbiAgICAgICAgICAgIGRhdGEgPSB7fTtcbiAgICAgICAgZGF0YS5oYXNoID0gcGFydHMuc2hpZnQoKTtcbiAgICAgICAgZGF0YS5maW5nZXJwcmludCA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICAgIC8vIFRPRE8gYXNzZXJ0IHRoYXQgZmluZ2VycHJpbnQgc2F0aXNmaWVzIDJVSEVYICooXCI6XCIgMlVIRVgpID9cbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSxcbiAgICBwYXJzZV9mbXRwOiBmdW5jdGlvbiAobGluZSkge1xuICAgICAgICB2YXIgcGFydHMgPSBsaW5lLnNwbGl0KCcgJyksXG4gICAgICAgICAgICBpLCBrZXksIHZhbHVlLFxuICAgICAgICAgICAgZGF0YSA9IFtdO1xuICAgICAgICBwYXJ0cy5zaGlmdCgpO1xuICAgICAgICBwYXJ0cyA9IHBhcnRzLmpvaW4oJyAnKS5zcGxpdCgnOycpO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGtleSA9IHBhcnRzW2ldLnNwbGl0KCc9JylbMF07XG4gICAgICAgICAgICB3aGlsZSAoa2V5Lmxlbmd0aCAmJiBrZXlbMF0gPT0gJyAnKSB7XG4gICAgICAgICAgICAgICAga2V5ID0ga2V5LnN1YnN0cmluZygxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhbHVlID0gcGFydHNbaV0uc3BsaXQoJz0nKVsxXTtcbiAgICAgICAgICAgIGlmIChrZXkgJiYgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBkYXRhLnB1c2goe25hbWU6IGtleSwgdmFsdWU6IHZhbHVlfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGtleSkge1xuICAgICAgICAgICAgICAgIC8vIHJmYyA0NzMzIChEVE1GKSBzdHlsZSBzdHVmZlxuICAgICAgICAgICAgICAgIGRhdGEucHVzaCh7bmFtZTogJycsIHZhbHVlOiBrZXl9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9LFxuICAgIHBhcnNlX2ljZWNhbmRpZGF0ZTogZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgdmFyIGNhbmRpZGF0ZSA9IHt9LFxuICAgICAgICAgICAgZWxlbXMgPSBsaW5lLnNwbGl0KCcgJyk7XG4gICAgICAgIGNhbmRpZGF0ZS5mb3VuZGF0aW9uID0gZWxlbXNbMF0uc3Vic3RyaW5nKDEyKTtcbiAgICAgICAgY2FuZGlkYXRlLmNvbXBvbmVudCA9IGVsZW1zWzFdO1xuICAgICAgICBjYW5kaWRhdGUucHJvdG9jb2wgPSBlbGVtc1syXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBjYW5kaWRhdGUucHJpb3JpdHkgPSBlbGVtc1szXTtcbiAgICAgICAgY2FuZGlkYXRlLmlwID0gZWxlbXNbNF07XG4gICAgICAgIGNhbmRpZGF0ZS5wb3J0ID0gZWxlbXNbNV07XG4gICAgICAgIC8vIGVsZW1zWzZdID0+IFwidHlwXCJcbiAgICAgICAgY2FuZGlkYXRlLnR5cGUgPSBlbGVtc1s3XTtcbiAgICAgICAgY2FuZGlkYXRlLmdlbmVyYXRpb24gPSAwOyAvLyBkZWZhdWx0IHZhbHVlLCBtYXkgYmUgb3ZlcndyaXR0ZW4gYmVsb3dcbiAgICAgICAgZm9yICh2YXIgaSA9IDg7IGkgPCBlbGVtcy5sZW5ndGg7IGkgKz0gMikge1xuICAgICAgICAgICAgc3dpdGNoIChlbGVtc1tpXSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ3JhZGRyJzpcbiAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlWydyZWwtYWRkciddID0gZWxlbXNbaSArIDFdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdycG9ydCc6XG4gICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZVsncmVsLXBvcnQnXSA9IGVsZW1zW2kgKyAxXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnZ2VuZXJhdGlvbic6XG4gICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZS5nZW5lcmF0aW9uID0gZWxlbXNbaSArIDFdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICd0Y3B0eXBlJzpcbiAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlLnRjcHR5cGUgPSBlbGVtc1tpICsgMV07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6IC8vIFRPRE9cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3BhcnNlX2ljZWNhbmRpZGF0ZSBub3QgdHJhbnNsYXRpbmcgXCInICsgZWxlbXNbaV0gKyAnXCIgPSBcIicgKyBlbGVtc1tpICsgMV0gKyAnXCInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYW5kaWRhdGUubmV0d29yayA9ICcxJztcbiAgICAgICAgY2FuZGlkYXRlLmlkID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDEwKTsgLy8gbm90IGFwcGxpY2FibGUgdG8gU0RQIC0tIEZJWE1FOiBzaG91bGQgYmUgdW5pcXVlLCBub3QganVzdCByYW5kb21cbiAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICB9LFxuICAgIGJ1aWxkX2ljZWNhbmRpZGF0ZTogZnVuY3Rpb24gKGNhbmQpIHtcbiAgICAgICAgdmFyIGxpbmUgPSBbJ2E9Y2FuZGlkYXRlOicgKyBjYW5kLmZvdW5kYXRpb24sIGNhbmQuY29tcG9uZW50LCBjYW5kLnByb3RvY29sLCBjYW5kLnByaW9yaXR5LCBjYW5kLmlwLCBjYW5kLnBvcnQsICd0eXAnLCBjYW5kLnR5cGVdLmpvaW4oJyAnKTtcbiAgICAgICAgbGluZSArPSAnICc7XG4gICAgICAgIHN3aXRjaCAoY2FuZC50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdzcmZseCc6XG4gICAgICAgICAgICBjYXNlICdwcmZseCc6XG4gICAgICAgICAgICBjYXNlICdyZWxheSc6XG4gICAgICAgICAgICAgICAgaWYgKGNhbmQuaGFzT3duQXR0cmlidXRlKCdyZWwtYWRkcicpICYmIGNhbmQuaGFzT3duQXR0cmlidXRlKCdyZWwtcG9ydCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpbmUgKz0gJ3JhZGRyJztcbiAgICAgICAgICAgICAgICAgICAgbGluZSArPSAnICc7XG4gICAgICAgICAgICAgICAgICAgIGxpbmUgKz0gY2FuZFsncmVsLWFkZHInXTtcbiAgICAgICAgICAgICAgICAgICAgbGluZSArPSAnICc7XG4gICAgICAgICAgICAgICAgICAgIGxpbmUgKz0gJ3Jwb3J0JztcbiAgICAgICAgICAgICAgICAgICAgbGluZSArPSAnICc7XG4gICAgICAgICAgICAgICAgICAgIGxpbmUgKz0gY2FuZFsncmVsLXBvcnQnXTtcbiAgICAgICAgICAgICAgICAgICAgbGluZSArPSAnICc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjYW5kLmhhc093bkF0dHJpYnV0ZSgndGNwdHlwZScpKSB7XG4gICAgICAgICAgICBsaW5lICs9ICd0Y3B0eXBlJztcbiAgICAgICAgICAgIGxpbmUgKz0gJyAnO1xuICAgICAgICAgICAgbGluZSArPSBjYW5kLnRjcHR5cGU7XG4gICAgICAgICAgICBsaW5lICs9ICcgJztcbiAgICAgICAgfVxuICAgICAgICBsaW5lICs9ICdnZW5lcmF0aW9uJztcbiAgICAgICAgbGluZSArPSAnICc7XG4gICAgICAgIGxpbmUgKz0gY2FuZC5oYXNPd25BdHRyaWJ1dGUoJ2dlbmVyYXRpb24nKSA/IGNhbmQuZ2VuZXJhdGlvbiA6ICcwJztcbiAgICAgICAgcmV0dXJuIGxpbmU7XG4gICAgfSxcbiAgICBwYXJzZV9zc3JjOiBmdW5jdGlvbiAoZGVzYykge1xuICAgICAgICAvLyBwcm9wcmlldGFyeSBtYXBwaW5nIG9mIGE9c3NyYyBsaW5lc1xuICAgICAgICAvLyBUT0RPOiBzZWUgXCJKaW5nbGUgUlRQIFNvdXJjZSBEZXNjcmlwdGlvblwiIGJ5IEp1YmVydGkgYW5kIFAuIFRoYXRjaGVyIG9uIGdvb2dsZSBkb2NzXG4gICAgICAgIC8vIGFuZCBwYXJzZSBhY2NvcmRpbmcgdG8gdGhhdFxuICAgICAgICB2YXIgbGluZXMgPSBkZXNjLnNwbGl0KCdcXHJcXG4nKSxcbiAgICAgICAgICAgIGRhdGEgPSB7fTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKGxpbmVzW2ldLnN1YnN0cmluZygwLCA3KSA9PSAnYT1zc3JjOicpIHtcbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gbGluZXNbaV0uaW5kZXhPZignICcpO1xuICAgICAgICAgICAgICAgIGRhdGFbbGluZXNbaV0uc3Vic3RyKGlkeCArIDEpLnNwbGl0KCc6JywgMilbMF1dID0gbGluZXNbaV0uc3Vic3RyKGlkeCArIDEpLnNwbGl0KCc6JywgMilbMV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSxcbiAgICBwYXJzZV9ydGNwZmI6IGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgIHZhciBwYXJ0cyA9IGxpbmUuc3Vic3RyKDEwKS5zcGxpdCgnICcpO1xuICAgICAgICB2YXIgZGF0YSA9IHt9O1xuICAgICAgICBkYXRhLnB0ID0gcGFydHMuc2hpZnQoKTtcbiAgICAgICAgZGF0YS50eXBlID0gcGFydHMuc2hpZnQoKTtcbiAgICAgICAgZGF0YS5wYXJhbXMgPSBwYXJ0cztcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSxcbiAgICBwYXJzZV9leHRtYXA6IGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgIHZhciBwYXJ0cyA9IGxpbmUuc3Vic3RyKDkpLnNwbGl0KCcgJyk7XG4gICAgICAgIHZhciBkYXRhID0ge307XG4gICAgICAgIGRhdGEudmFsdWUgPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAgICBpZiAoZGF0YS52YWx1ZS5pbmRleE9mKCcvJykgIT0gLTEpIHtcbiAgICAgICAgICAgIGRhdGEuZGlyZWN0aW9uID0gZGF0YS52YWx1ZS5zdWJzdHIoZGF0YS52YWx1ZS5pbmRleE9mKCcvJykgKyAxKTtcbiAgICAgICAgICAgIGRhdGEudmFsdWUgPSBkYXRhLnZhbHVlLnN1YnN0cigwLCBkYXRhLnZhbHVlLmluZGV4T2YoJy8nKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkYXRhLmRpcmVjdGlvbiA9ICdib3RoJztcbiAgICAgICAgfVxuICAgICAgICBkYXRhLnVyaSA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICAgIGRhdGEucGFyYW1zID0gcGFydHM7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH0sXG4gICAgZmluZF9saW5lOiBmdW5jdGlvbiAoaGF5c3RhY2ssIG5lZWRsZSwgc2Vzc2lvbnBhcnQpIHtcbiAgICAgICAgdmFyIGxpbmVzID0gaGF5c3RhY2suc3BsaXQoJ1xcclxcbicpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAobGluZXNbaV0uc3Vic3RyaW5nKDAsIG5lZWRsZS5sZW5ndGgpID09IG5lZWRsZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaW5lc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIXNlc3Npb25wYXJ0KSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgLy8gc2VhcmNoIHNlc3Npb24gcGFydFxuICAgICAgICBsaW5lcyA9IHNlc3Npb25wYXJ0LnNwbGl0KCdcXHJcXG4nKTtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBsaW5lcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgaWYgKGxpbmVzW2pdLnN1YnN0cmluZygwLCBuZWVkbGUubGVuZ3RoKSA9PSBuZWVkbGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGluZXNbal07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG4gICAgZmluZF9saW5lczogZnVuY3Rpb24gKGhheXN0YWNrLCBuZWVkbGUsIHNlc3Npb25wYXJ0KSB7XG4gICAgICAgIHZhciBsaW5lcyA9IGhheXN0YWNrLnNwbGl0KCdcXHJcXG4nKSxcbiAgICAgICAgICAgIG5lZWRsZXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKGxpbmVzW2ldLnN1YnN0cmluZygwLCBuZWVkbGUubGVuZ3RoKSA9PSBuZWVkbGUpXG4gICAgICAgICAgICAgICAgbmVlZGxlcy5wdXNoKGxpbmVzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobmVlZGxlcy5sZW5ndGggfHwgIXNlc3Npb25wYXJ0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmVlZGxlcztcbiAgICAgICAgfVxuICAgICAgICAvLyBzZWFyY2ggc2Vzc2lvbiBwYXJ0XG4gICAgICAgIGxpbmVzID0gc2Vzc2lvbnBhcnQuc3BsaXQoJ1xcclxcbicpO1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGxpbmVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBpZiAobGluZXNbal0uc3Vic3RyaW5nKDAsIG5lZWRsZS5sZW5ndGgpID09IG5lZWRsZSkge1xuICAgICAgICAgICAgICAgIG5lZWRsZXMucHVzaChsaW5lc1tqXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5lZWRsZXM7XG4gICAgfSxcbiAgICBjYW5kaWRhdGVUb0ppbmdsZTogZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgLy8gYT1jYW5kaWRhdGU6Mjk3OTE2NjY2MiAxIHVkcCAyMTEzOTM3MTUxIDE5Mi4xNjguMi4xMDAgNTc2OTggdHlwIGhvc3QgZ2VuZXJhdGlvbiAwXG4gICAgICAgIC8vICAgICAgPGNhbmRpZGF0ZSBjb21wb25lbnQ9Li4uIGZvdW5kYXRpb249Li4uIGdlbmVyYXRpb249Li4uIGlkPS4uLiBpcD0uLi4gbmV0d29yaz0uLi4gcG9ydD0uLi4gcHJpb3JpdHk9Li4uIHByb3RvY29sPS4uLiB0eXBlPS4uLi8+XG4gICAgICAgIGlmIChsaW5lLmluZGV4T2YoJ2NhbmRpZGF0ZTonKSA9PT0gMCkge1xuICAgICAgICAgICAgbGluZSA9ICdhPScgKyBsaW5lO1xuICAgICAgICB9IGVsc2UgaWYgKGxpbmUuc3Vic3RyaW5nKDAsIDEyKSAhPSAnYT1jYW5kaWRhdGU6Jykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3BhcnNlQ2FuZGlkYXRlIGNhbGxlZCB3aXRoIGEgbGluZSB0aGF0IGlzIG5vdCBhIGNhbmRpZGF0ZSBsaW5lJyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhsaW5lKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsaW5lLnN1YnN0cmluZyhsaW5lLmxlbmd0aCAtIDIpID09ICdcXHJcXG4nKSAvLyBjaG9tcCBpdFxuICAgICAgICAgICAgbGluZSA9IGxpbmUuc3Vic3RyaW5nKDAsIGxpbmUubGVuZ3RoIC0gMik7XG4gICAgICAgIHZhciBjYW5kaWRhdGUgPSB7fSxcbiAgICAgICAgICAgIGVsZW1zID0gbGluZS5zcGxpdCgnICcpLFxuICAgICAgICAgICAgaTtcbiAgICAgICAgaWYgKGVsZW1zWzZdICE9ICd0eXAnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZGlkIG5vdCBmaW5kIHR5cCBpbiB0aGUgcmlnaHQgcGxhY2UnKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGxpbmUpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgY2FuZGlkYXRlLmZvdW5kYXRpb24gPSBlbGVtc1swXS5zdWJzdHJpbmcoMTIpO1xuICAgICAgICBjYW5kaWRhdGUuY29tcG9uZW50ID0gZWxlbXNbMV07XG4gICAgICAgIGNhbmRpZGF0ZS5wcm90b2NvbCA9IGVsZW1zWzJdLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGNhbmRpZGF0ZS5wcmlvcml0eSA9IGVsZW1zWzNdO1xuICAgICAgICBjYW5kaWRhdGUuaXAgPSBlbGVtc1s0XTtcbiAgICAgICAgY2FuZGlkYXRlLnBvcnQgPSBlbGVtc1s1XTtcbiAgICAgICAgLy8gZWxlbXNbNl0gPT4gXCJ0eXBcIlxuICAgICAgICBjYW5kaWRhdGUudHlwZSA9IGVsZW1zWzddO1xuXG4gICAgICAgIGNhbmRpZGF0ZS5nZW5lcmF0aW9uID0gJzAnOyAvLyBkZWZhdWx0LCBtYXkgYmUgb3ZlcndyaXR0ZW4gYmVsb3dcbiAgICAgICAgZm9yIChpID0gODsgaSA8IGVsZW1zLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKGVsZW1zW2ldKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAncmFkZHInOlxuICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGVbJ3JlbC1hZGRyJ10gPSBlbGVtc1tpICsgMV07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Jwb3J0JzpcbiAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlWydyZWwtcG9ydCddID0gZWxlbXNbaSArIDFdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdnZW5lcmF0aW9uJzpcbiAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlLmdlbmVyYXRpb24gPSBlbGVtc1tpICsgMV07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3RjcHR5cGUnOlxuICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGUudGNwdHlwZSA9IGVsZW1zW2kgKyAxXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDogLy8gVE9ET1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbm90IHRyYW5zbGF0aW5nIFwiJyArIGVsZW1zW2ldICsgJ1wiID0gXCInICsgZWxlbXNbaSArIDFdICsgJ1wiJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2FuZGlkYXRlLm5ldHdvcmsgPSAnMSc7XG4gICAgICAgIGNhbmRpZGF0ZS5pZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCAxMCk7IC8vIG5vdCBhcHBsaWNhYmxlIHRvIFNEUCAtLSBGSVhNRTogc2hvdWxkIGJlIHVuaXF1ZSwgbm90IGp1c3QgcmFuZG9tXG4gICAgICAgIHJldHVybiBjYW5kaWRhdGU7XG4gICAgfSxcbiAgICBjYW5kaWRhdGVGcm9tSmluZ2xlOiBmdW5jdGlvbiAoY2FuZCkge1xuICAgICAgICB2YXIgbGluZSA9ICdhPWNhbmRpZGF0ZTonO1xuICAgICAgICBsaW5lICs9IGNhbmQuZ2V0QXR0cmlidXRlKCdmb3VuZGF0aW9uJyk7XG4gICAgICAgIGxpbmUgKz0gJyAnO1xuICAgICAgICBsaW5lICs9IGNhbmQuZ2V0QXR0cmlidXRlKCdjb21wb25lbnQnKTtcbiAgICAgICAgbGluZSArPSAnICc7XG4gICAgICAgIGxpbmUgKz0gY2FuZC5nZXRBdHRyaWJ1dGUoJ3Byb3RvY29sJyk7IC8vLnRvVXBwZXJDYXNlKCk7IC8vIGNocm9tZSBNMjMgZG9lc24ndCBsaWtlIHRoaXNcbiAgICAgICAgbGluZSArPSAnICc7XG4gICAgICAgIGxpbmUgKz0gY2FuZC5nZXRBdHRyaWJ1dGUoJ3ByaW9yaXR5Jyk7XG4gICAgICAgIGxpbmUgKz0gJyAnO1xuICAgICAgICBsaW5lICs9IGNhbmQuZ2V0QXR0cmlidXRlKCdpcCcpO1xuICAgICAgICBsaW5lICs9ICcgJztcbiAgICAgICAgbGluZSArPSBjYW5kLmdldEF0dHJpYnV0ZSgncG9ydCcpO1xuICAgICAgICBsaW5lICs9ICcgJztcbiAgICAgICAgbGluZSArPSAndHlwJztcbiAgICAgICAgbGluZSArPSAnICcgKyBjYW5kLmdldEF0dHJpYnV0ZSgndHlwZScpO1xuICAgICAgICBsaW5lICs9ICcgJztcbiAgICAgICAgc3dpdGNoIChjYW5kLmdldEF0dHJpYnV0ZSgndHlwZScpKSB7XG4gICAgICAgICAgICBjYXNlICdzcmZseCc6XG4gICAgICAgICAgICBjYXNlICdwcmZseCc6XG4gICAgICAgICAgICBjYXNlICdyZWxheSc6XG4gICAgICAgICAgICAgICAgaWYgKGNhbmQuZ2V0QXR0cmlidXRlKCdyZWwtYWRkcicpICYmIGNhbmQuZ2V0QXR0cmlidXRlKCdyZWwtcG9ydCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpbmUgKz0gJ3JhZGRyJztcbiAgICAgICAgICAgICAgICAgICAgbGluZSArPSAnICc7XG4gICAgICAgICAgICAgICAgICAgIGxpbmUgKz0gY2FuZC5nZXRBdHRyaWJ1dGUoJ3JlbC1hZGRyJyk7XG4gICAgICAgICAgICAgICAgICAgIGxpbmUgKz0gJyAnO1xuICAgICAgICAgICAgICAgICAgICBsaW5lICs9ICdycG9ydCc7XG4gICAgICAgICAgICAgICAgICAgIGxpbmUgKz0gJyAnO1xuICAgICAgICAgICAgICAgICAgICBsaW5lICs9IGNhbmQuZ2V0QXR0cmlidXRlKCdyZWwtcG9ydCcpO1xuICAgICAgICAgICAgICAgICAgICBsaW5lICs9ICcgJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgbGluZSArPSAnZ2VuZXJhdGlvbic7XG4gICAgICAgIGxpbmUgKz0gJyAnO1xuICAgICAgICBsaW5lICs9IGNhbmQuZ2V0QXR0cmlidXRlKCdnZW5lcmF0aW9uJykgfHwgJzAnO1xuICAgICAgICByZXR1cm4gbGluZSArICdcXHJcXG4nO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU0RQVXRpbDtcblxuIiwiLyoganNoaW50IC1XMTE3ICovXG4vLyBKaW5nbGUgc3R1ZmZcbnZhciBTZXNzaW9uQmFzZSA9IHJlcXVpcmUoXCIuL3N0cm9waGUuamluZ2xlLnNlc3Npb25iYXNlXCIpO1xudmFyIFRyYWNlYWJsZVBlZXJDb25uZWN0aW9uID0gcmVxdWlyZShcIi4vc3Ryb3BoZS5qaW5nbGUuYWRhcHRlclwiKTtcbnZhciBTRFAgPSByZXF1aXJlKFwiLi9zdHJvcGhlLmppbmdsZS5zZHBcIik7XG5cbkppbmdsZVNlc3Npb24ucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTZXNzaW9uQmFzZS5wcm90b3R5cGUpO1xuZnVuY3Rpb24gSmluZ2xlU2Vzc2lvbihtZSwgc2lkLCBjb25uZWN0aW9uKSB7XG5cbiAgICBTZXNzaW9uQmFzZS5jYWxsKHRoaXMsIGNvbm5lY3Rpb24sIHNpZCk7XG5cbiAgICB0aGlzLm1lID0gbWU7XG4gICAgdGhpcy5pbml0aWF0b3IgPSBudWxsO1xuICAgIHRoaXMucmVzcG9uZGVyID0gbnVsbDtcbiAgICB0aGlzLmlzSW5pdGlhdG9yID0gbnVsbDtcbiAgICB0aGlzLnBlZXJqaWQgPSBudWxsO1xuICAgIHRoaXMuc3RhdGUgPSBudWxsO1xuICAgIHRoaXMubG9jYWxTRFAgPSBudWxsO1xuICAgIHRoaXMucmVtb3RlU0RQID0gbnVsbDtcbiAgICB0aGlzLmxvY2FsU3RyZWFtcyA9IFtdO1xuICAgIHRoaXMucmVsYXllZFN0cmVhbXMgPSBbXTtcbiAgICB0aGlzLnJlbW90ZVN0cmVhbXMgPSBbXTtcbiAgICB0aGlzLnN0YXJ0VGltZSA9IG51bGw7XG4gICAgdGhpcy5zdG9wVGltZSA9IG51bGw7XG4gICAgdGhpcy5tZWRpYV9jb25zdHJhaW50cyA9IG51bGw7XG4gICAgdGhpcy5wY19jb25zdHJhaW50cyA9IG51bGw7XG4gICAgdGhpcy5pY2VfY29uZmlnID0ge307XG4gICAgdGhpcy5kcmlwX2NvbnRhaW5lciA9IFtdO1xuXG4gICAgdGhpcy51c2V0cmlja2xlID0gdHJ1ZTtcbiAgICB0aGlzLnVzZXByYW5zd2VyID0gZmFsc2U7IC8vIGVhcmx5IHRyYW5zcG9ydCB3YXJtdXAgLS0gbWluZCB5b3UsIHRoaXMgbWlnaHQgZmFpbC4gZGVwZW5kcyBvbiB3ZWJydGMgaXNzdWUgMTcxOFxuICAgIHRoaXMudXNlZHJpcCA9IGZhbHNlOyAvLyBkcmlwcGluZyBpcyBzZW5kaW5nIHRyaWNrbGUgY2FuZGlkYXRlcyBub3Qgb25lLWJ5LW9uZVxuXG4gICAgdGhpcy5oYWRzdHVuY2FuZGlkYXRlID0gZmFsc2U7XG4gICAgdGhpcy5oYWR0dXJuY2FuZGlkYXRlID0gZmFsc2U7XG4gICAgdGhpcy5sYXN0aWNlY2FuZGlkYXRlID0gZmFsc2U7XG5cbiAgICB0aGlzLnN0YXRzaW50ZXJ2YWwgPSBudWxsO1xuXG4gICAgdGhpcy5yZWFzb24gPSBudWxsO1xuXG4gICAgdGhpcy53YWl0ID0gdHJ1ZTtcbn1cblxuSmluZ2xlU2Vzc2lvbi5wcm90b3R5cGUuaW5pdGlhdGUgPSBmdW5jdGlvbiAocGVlcmppZCwgaXNJbml0aWF0b3IpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHRoaXMuc3RhdGUgIT09IG51bGwpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignYXR0ZW1wdCB0byBpbml0aWF0ZSBvbiBzZXNzaW9uICcgKyB0aGlzLnNpZCArXG4gICAgICAgICAgICAnaW4gc3RhdGUgJyArIHRoaXMuc3RhdGUpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuaXNJbml0aWF0b3IgPSBpc0luaXRpYXRvcjtcbiAgICB0aGlzLnN0YXRlID0gJ3BlbmRpbmcnO1xuICAgIHRoaXMuaW5pdGlhdG9yID0gaXNJbml0aWF0b3IgPyB0aGlzLm1lIDogcGVlcmppZDtcbiAgICB0aGlzLnJlc3BvbmRlciA9ICFpc0luaXRpYXRvciA/IHRoaXMubWUgOiBwZWVyamlkO1xuICAgIHRoaXMucGVlcmppZCA9IHBlZXJqaWQ7XG4gICAgdGhpcy5oYWRzdHVuY2FuZGlkYXRlID0gZmFsc2U7XG4gICAgdGhpcy5oYWR0dXJuY2FuZGlkYXRlID0gZmFsc2U7XG4gICAgdGhpcy5sYXN0aWNlY2FuZGlkYXRlID0gZmFsc2U7XG5cbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uXG4gICAgICAgID0gbmV3IFRyYWNlYWJsZVBlZXJDb25uZWN0aW9uKFxuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLmppbmdsZS5pY2VfY29uZmlnLFxuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLmppbmdsZS5wY19jb25zdHJhaW50cyApO1xuXG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5vbmljZWNhbmRpZGF0ZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBzZWxmLnNlbmRJY2VDYW5kaWRhdGUoZXZlbnQuY2FuZGlkYXRlKTtcbiAgICB9O1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24ub25hZGRzdHJlYW0gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgc2VsZi5yZW1vdGVTdHJlYW1zLnB1c2goZXZlbnQuc3RyZWFtKTtcbi8vICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdyZW1vdGVzdHJlYW1hZGRlZC5qaW5nbGUnLCBbZXZlbnQsIHNlbGYuc2lkXSk7XG4gICAgICAgIHNlbGYud2FpdEZvclByZXNlbmNlKGV2ZW50LCBzZWxmLnNpZCk7XG4gICAgfTtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLm9ucmVtb3Zlc3RyZWFtID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIC8vIFJlbW92ZSB0aGUgc3RyZWFtIGZyb20gcmVtb3RlU3RyZWFtc1xuICAgICAgICB2YXIgc3RyZWFtSWR4ID0gc2VsZi5yZW1vdGVTdHJlYW1zLmluZGV4T2YoZXZlbnQuc3RyZWFtKTtcbiAgICAgICAgaWYoc3RyZWFtSWR4ICE9PSAtMSl7XG4gICAgICAgICAgICBzZWxmLnJlbW90ZVN0cmVhbXMuc3BsaWNlKHN0cmVhbUlkeCwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRklYTUU6IHJlbW90ZXN0cmVhbXJlbW92ZWQuamluZ2xlIG5vdCBkZWZpbmVkIGFueXdoZXJlKHVudXNlZClcbiAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcigncmVtb3Rlc3RyZWFtcmVtb3ZlZC5qaW5nbGUnLCBbZXZlbnQsIHNlbGYuc2lkXSk7XG4gICAgfTtcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLm9uc2lnbmFsaW5nc3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgaWYgKCEoc2VsZiAmJiBzZWxmLnBlZXJjb25uZWN0aW9uKSkgcmV0dXJuO1xuICAgIH07XG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5vbmljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBpZiAoIShzZWxmICYmIHNlbGYucGVlcmNvbm5lY3Rpb24pKSByZXR1cm47XG4gICAgICAgIHN3aXRjaCAoc2VsZi5wZWVyY29ubmVjdGlvbi5pY2VDb25uZWN0aW9uU3RhdGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2Nvbm5lY3RlZCc6XG4gICAgICAgICAgICAgICAgdGhpcy5zdGFydFRpbWUgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZGlzY29ubmVjdGVkJzpcbiAgICAgICAgICAgICAgICB0aGlzLnN0b3BUaW1lID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBzZWxmLm9uSWNlQ29ubmVjdGlvblN0YXRlQ2hhbmdlKHNlbGYuc2lkLCBzZWxmKTtcbiAgICB9O1xuICAgIC8vIGFkZCBhbnkgbG9jYWwgYW5kIHJlbGF5ZWQgc3RyZWFtXG4gICAgdGhpcy5sb2NhbFN0cmVhbXMuZm9yRWFjaChmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgICAgc2VsZi5wZWVyY29ubmVjdGlvbi5hZGRTdHJlYW0oc3RyZWFtKTtcbiAgICB9KTtcbiAgICB0aGlzLnJlbGF5ZWRTdHJlYW1zLmZvckVhY2goZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgICAgIHNlbGYucGVlcmNvbm5lY3Rpb24uYWRkU3RyZWFtKHN0cmVhbSk7XG4gICAgfSk7XG59O1xuXG5KaW5nbGVTZXNzaW9uLnByb3RvdHlwZS5hY2NlcHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuc3RhdGUgPSAnYWN0aXZlJztcblxuICAgIHZhciBwcmFuc3dlciA9IHRoaXMucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbjtcbiAgICBpZiAoIXByYW5zd2VyIHx8IHByYW5zd2VyLnR5cGUgIT0gJ3ByYW5zd2VyJykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCdnb2luZyBmcm9tIHByYW5zd2VyIHRvIGFuc3dlcicpO1xuICAgIGlmICh0aGlzLnVzZXRyaWNrbGUpIHtcbiAgICAgICAgLy8gcmVtb3ZlIGNhbmRpZGF0ZXMgYWxyZWFkeSBzZW50IGZyb20gc2Vzc2lvbi1hY2NlcHRcbiAgICAgICAgdmFyIGxpbmVzID0gU0RQVXRpbC5maW5kX2xpbmVzKHByYW5zd2VyLnNkcCwgJ2E9Y2FuZGlkYXRlOicpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBwcmFuc3dlci5zZHAgPSBwcmFuc3dlci5zZHAucmVwbGFjZShsaW5lc1tpXSArICdcXHJcXG4nLCAnJyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgd2hpbGUgKFNEUFV0aWwuZmluZF9saW5lKHByYW5zd2VyLnNkcCwgJ2E9aW5hY3RpdmUnKSkge1xuICAgICAgICAvLyBGSVhNRTogY2hhbmdlIGFueSBpbmFjdGl2ZSB0byBzZW5kcmVjdiBvciB3aGF0ZXZlciB0aGV5IHdlcmUgb3JpZ2luYWxseVxuICAgICAgICBwcmFuc3dlci5zZHAgPSBwcmFuc3dlci5zZHAucmVwbGFjZSgnYT1pbmFjdGl2ZScsICdhPXNlbmRyZWN2Jyk7XG4gICAgfVxuICAgIHZhciBzaW11bGNhc3QgPSBuZXcgU2ltdWxjYXN0KCk7XG4gICAgcHJhbnN3ZXIgPSBzaW11bGNhc3QucmV2ZXJzZVRyYW5zZm9ybUxvY2FsRGVzY3JpcHRpb24ocHJhbnN3ZXIpO1xuICAgIHZhciBwcnNkcCA9IG5ldyBTRFAocHJhbnN3ZXIuc2RwKTtcbiAgICB2YXIgYWNjZXB0ID0gJGlxKHt0bzogdGhpcy5wZWVyamlkLFxuICAgICAgICB0eXBlOiAnc2V0J30pXG4gICAgICAgIC5jKCdqaW5nbGUnLCB7eG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6MScsXG4gICAgICAgICAgICBhY3Rpb246ICdzZXNzaW9uLWFjY2VwdCcsXG4gICAgICAgICAgICBpbml0aWF0b3I6IHRoaXMuaW5pdGlhdG9yLFxuICAgICAgICAgICAgcmVzcG9uZGVyOiB0aGlzLnJlc3BvbmRlcixcbiAgICAgICAgICAgIHNpZDogdGhpcy5zaWQgfSk7XG4gICAgcHJzZHAudG9KaW5nbGUoYWNjZXB0LCB0aGlzLmluaXRpYXRvciA9PSB0aGlzLm1lID8gJ2luaXRpYXRvcicgOiAncmVzcG9uZGVyJyk7XG4gICAgdGhpcy5jb25uZWN0aW9uLnNlbmRJUShhY2NlcHQsXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhY2sgPSB7fTtcbiAgICAgICAgICAgIGFjay5zb3VyY2UgPSAnYW5zd2VyJztcbiAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2Fjay5qaW5nbGUnLCBbc2VsZi5zaWQsIGFja10pO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoc3RhbnphKSB7XG4gICAgICAgICAgICB2YXIgZXJyb3IgPSAoJChzdGFuemEpLmZpbmQoJ2Vycm9yJykubGVuZ3RoKSA/IHtcbiAgICAgICAgICAgICAgICBjb2RlOiAkKHN0YW56YSkuZmluZCgnZXJyb3InKS5hdHRyKCdjb2RlJyksXG4gICAgICAgICAgICAgICAgcmVhc29uOiAkKHN0YW56YSkuZmluZCgnZXJyb3IgOmZpcnN0JylbMF0udGFnTmFtZSxcbiAgICAgICAgICAgIH06e307XG4gICAgICAgICAgICBlcnJvci5zb3VyY2UgPSAnYW5zd2VyJztcbiAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2Vycm9yLmppbmdsZScsIFtzZWxmLnNpZCwgZXJyb3JdKTtcbiAgICAgICAgfSxcbiAgICAgICAgMTAwMDApO1xuXG4gICAgdmFyIHNkcCA9IHRoaXMucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbi5zZHA7XG4gICAgd2hpbGUgKFNEUFV0aWwuZmluZF9saW5lKHNkcCwgJ2E9aW5hY3RpdmUnKSkge1xuICAgICAgICAvLyBGSVhNRTogY2hhbmdlIGFueSBpbmFjdGl2ZSB0byBzZW5kcmVjdiBvciB3aGF0ZXZlciB0aGV5IHdlcmUgb3JpZ2luYWxseVxuICAgICAgICBzZHAgPSBzZHAucmVwbGFjZSgnYT1pbmFjdGl2ZScsICdhPXNlbmRyZWN2Jyk7XG4gICAgfVxuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uc2V0TG9jYWxEZXNjcmlwdGlvbihuZXcgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKHt0eXBlOiAnYW5zd2VyJywgc2RwOiBzZHB9KSxcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnc2V0TG9jYWxEZXNjcmlwdGlvbiBzdWNjZXNzJyk7XG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdzZXRMb2NhbERlc2NyaXB0aW9uLmppbmdsZScsIFtzZWxmLnNpZF0pO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignc2V0TG9jYWxEZXNjcmlwdGlvbiBmYWlsZWQnLCBlKTtcbiAgICAgICAgfVxuICAgICk7XG59O1xuXG4vKipcbiAqIEltcGxlbWVudHMgU2Vzc2lvbkJhc2Uuc2VuZFNTUkNVcGRhdGUuXG4gKi9cbkppbmdsZVNlc3Npb24ucHJvdG90eXBlLnNlbmRTU1JDVXBkYXRlID0gZnVuY3Rpb24oc2RwTWVkaWFTc3JjcywgZnJvbUppZCwgaXNhZGQpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBjb25zb2xlLmxvZygndGVsbCcsIHNlbGYucGVlcmppZCwgJ2Fib3V0ICcgKyAoaXNhZGQgPyAnbmV3JyA6ICdyZW1vdmVkJykgKyAnIHNzcmNzIGZyb20nICsgc2VsZi5tZSk7XG5cbiAgICBpZiAoISh0aGlzLnBlZXJjb25uZWN0aW9uLnNpZ25hbGluZ1N0YXRlID09ICdzdGFibGUnICYmIHRoaXMucGVlcmNvbm5lY3Rpb24uaWNlQ29ubmVjdGlvblN0YXRlID09ICdjb25uZWN0ZWQnKSl7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiVG9vIGVhcmx5IHRvIHNlbmQgdXBkYXRlc1wiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuc2VuZFNTUkNVcGRhdGVJcShzZHBNZWRpYVNzcmNzLCBzZWxmLnNpZCwgc2VsZi5pbml0aWF0b3IsIHNlbGYucGVlcmppZCwgaXNhZGQpO1xufTtcblxuSmluZ2xlU2Vzc2lvbi5wcm90b3R5cGUudGVybWluYXRlID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHRoaXMuc3RhdGUgPSAnZW5kZWQnO1xuICAgIHRoaXMucmVhc29uID0gcmVhc29uO1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uY2xvc2UoKTtcbiAgICBpZiAodGhpcy5zdGF0c2ludGVydmFsICE9PSBudWxsKSB7XG4gICAgICAgIHdpbmRvdy5jbGVhckludGVydmFsKHRoaXMuc3RhdHNpbnRlcnZhbCk7XG4gICAgICAgIHRoaXMuc3RhdHNpbnRlcnZhbCA9IG51bGw7XG4gICAgfVxufTtcblxuSmluZ2xlU2Vzc2lvbi5wcm90b3R5cGUuYWN0aXZlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLnN0YXRlID09ICdhY3RpdmUnO1xufTtcblxuSmluZ2xlU2Vzc2lvbi5wcm90b3R5cGUuc2VuZEljZUNhbmRpZGF0ZSA9IGZ1bmN0aW9uIChjYW5kaWRhdGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKGNhbmRpZGF0ZSAmJiAhdGhpcy5sYXN0aWNlY2FuZGlkYXRlKSB7XG4gICAgICAgIHZhciBpY2UgPSBTRFBVdGlsLmljZXBhcmFtcyh0aGlzLmxvY2FsU0RQLm1lZGlhW2NhbmRpZGF0ZS5zZHBNTGluZUluZGV4XSwgdGhpcy5sb2NhbFNEUC5zZXNzaW9uKTtcbiAgICAgICAgdmFyIGpjYW5kID0gU0RQVXRpbC5jYW5kaWRhdGVUb0ppbmdsZShjYW5kaWRhdGUuY2FuZGlkYXRlKTtcbiAgICAgICAgaWYgKCEoaWNlICYmIGpjYW5kKSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignZmFpbGVkIHRvIGdldCBpY2UgJiYgamNhbmQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpY2UueG1sbnMgPSAndXJuOnhtcHA6amluZ2xlOnRyYW5zcG9ydHM6aWNlLXVkcDoxJztcblxuICAgICAgICBpZiAoamNhbmQudHlwZSA9PT0gJ3NyZmx4Jykge1xuICAgICAgICAgICAgdGhpcy5oYWRzdHVuY2FuZGlkYXRlID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChqY2FuZC50eXBlID09PSAncmVsYXknKSB7XG4gICAgICAgICAgICB0aGlzLmhhZHR1cm5jYW5kaWRhdGUgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMudXNldHJpY2tsZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMudXNlZHJpcCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRyaXBfY29udGFpbmVyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBzdGFydCAyMG1zIGNhbGxvdXRcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuZHJpcF9jb250YWluZXIubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnNlbmRJY2VDYW5kaWRhdGVzKHNlbGYuZHJpcF9jb250YWluZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5kcmlwX2NvbnRhaW5lciA9IFtdO1xuICAgICAgICAgICAgICAgICAgICB9LCAyMCk7XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5kcmlwX2NvbnRhaW5lci5wdXNoKGV2ZW50LmNhbmRpZGF0ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZWxmLnNlbmRJY2VDYW5kaWRhdGUoW2V2ZW50LmNhbmRpZGF0ZV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZygnc2VuZEljZUNhbmRpZGF0ZTogbGFzdCBjYW5kaWRhdGUuJyk7XG4gICAgICAgIGlmICghdGhpcy51c2V0cmlja2xlKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdzaG91bGQgc2VuZCBmdWxsIG9mZmVyIG5vdy4uLicpO1xuICAgICAgICAgICAgdmFyIGluaXQgPSAkaXEoe3RvOiB0aGlzLnBlZXJqaWQsXG4gICAgICAgICAgICAgICAgdHlwZTogJ3NldCd9KVxuICAgICAgICAgICAgICAgIC5jKCdqaW5nbGUnLCB7eG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6MScsXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbjogdGhpcy5wZWVyY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uLnR5cGUgPT0gJ29mZmVyJyA/ICdzZXNzaW9uLWluaXRpYXRlJyA6ICdzZXNzaW9uLWFjY2VwdCcsXG4gICAgICAgICAgICAgICAgICAgIGluaXRpYXRvcjogdGhpcy5pbml0aWF0b3IsXG4gICAgICAgICAgICAgICAgICAgIHNpZDogdGhpcy5zaWR9KTtcbiAgICAgICAgICAgIHRoaXMubG9jYWxTRFAgPSBuZXcgU0RQKHRoaXMucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbi5zZHApO1xuICAgICAgICAgICAgdGhpcy5sb2NhbFNEUC50b0ppbmdsZShpbml0LCB0aGlzLmluaXRpYXRvciA9PSB0aGlzLm1lID8gJ2luaXRpYXRvcicgOiAncmVzcG9uZGVyJyk7XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKGluaXQsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdzZXNzaW9uIGluaXRpYXRlIGFjaycpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgYWNrID0ge307XG4gICAgICAgICAgICAgICAgICAgIGFjay5zb3VyY2UgPSAnb2ZmZXInO1xuICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdhY2suamluZ2xlJywgW3NlbGYuc2lkLCBhY2tdKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChzdGFuemEpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5zdGF0ZSA9ICdlcnJvcic7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYucGVlcmNvbm5lY3Rpb24uY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVycm9yID0gKCQoc3RhbnphKS5maW5kKCdlcnJvcicpLmxlbmd0aCkgPyB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiAkKHN0YW56YSkuZmluZCgnZXJyb3InKS5hdHRyKCdjb2RlJyksXG4gICAgICAgICAgICAgICAgICAgICAgICByZWFzb246ICQoc3RhbnphKS5maW5kKCdlcnJvciA6Zmlyc3QnKVswXS50YWdOYW1lLFxuICAgICAgICAgICAgICAgICAgICB9Ont9O1xuICAgICAgICAgICAgICAgICAgICBlcnJvci5zb3VyY2UgPSAnb2ZmZXInO1xuICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdlcnJvci5qaW5nbGUnLCBbc2VsZi5zaWQsIGVycm9yXSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAxMDAwMCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5sYXN0aWNlY2FuZGlkYXRlID0gdHJ1ZTtcbiAgICAgICAgY29uc29sZS5sb2coJ0hhdmUgd2UgZW5jb3VudGVyZWQgYW55IHNyZmx4IGNhbmRpZGF0ZXM/ICcgKyB0aGlzLmhhZHN0dW5jYW5kaWRhdGUpO1xuICAgICAgICBjb25zb2xlLmxvZygnSGF2ZSB3ZSBlbmNvdW50ZXJlZCBhbnkgcmVsYXkgY2FuZGlkYXRlcz8gJyArIHRoaXMuaGFkdHVybmNhbmRpZGF0ZSk7XG5cbiAgICAgICAgaWYgKCEodGhpcy5oYWRzdHVuY2FuZGlkYXRlIHx8IHRoaXMuaGFkdHVybmNhbmRpZGF0ZSkgJiYgdGhpcy5wZWVyY29ubmVjdGlvbi5zaWduYWxpbmdTdGF0ZSAhPSAnY2xvc2VkJykge1xuICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignbm9zdHVuY2FuZGlkYXRlcy5qaW5nbGUnLCBbdGhpcy5zaWRdKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbkppbmdsZVNlc3Npb24ucHJvdG90eXBlLnNlbmRJY2VDYW5kaWRhdGVzID0gZnVuY3Rpb24gKGNhbmRpZGF0ZXMpIHtcbiAgICBjb25zb2xlLmxvZygnc2VuZEljZUNhbmRpZGF0ZXMnLCBjYW5kaWRhdGVzKTtcbiAgICB2YXIgY2FuZCA9ICRpcSh7dG86IHRoaXMucGVlcmppZCwgdHlwZTogJ3NldCd9KVxuICAgICAgICAuYygnamluZ2xlJywge3htbG5zOiAndXJuOnhtcHA6amluZ2xlOjEnLFxuICAgICAgICAgICAgYWN0aW9uOiAndHJhbnNwb3J0LWluZm8nLFxuICAgICAgICAgICAgaW5pdGlhdG9yOiB0aGlzLmluaXRpYXRvcixcbiAgICAgICAgICAgIHNpZDogdGhpcy5zaWR9KTtcbiAgICBmb3IgKHZhciBtaWQgPSAwOyBtaWQgPCB0aGlzLmxvY2FsU0RQLm1lZGlhLmxlbmd0aDsgbWlkKyspIHtcbiAgICAgICAgdmFyIGNhbmRzID0gY2FuZGlkYXRlcy5maWx0ZXIoZnVuY3Rpb24gKGVsKSB7IHJldHVybiBlbC5zZHBNTGluZUluZGV4ID09IG1pZDsgfSk7XG4gICAgICAgIGlmIChjYW5kcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YXIgaWNlID0gU0RQVXRpbC5pY2VwYXJhbXModGhpcy5sb2NhbFNEUC5tZWRpYVttaWRdLCB0aGlzLmxvY2FsU0RQLnNlc3Npb24pO1xuICAgICAgICAgICAgaWNlLnhtbG5zID0gJ3Vybjp4bXBwOmppbmdsZTp0cmFuc3BvcnRzOmljZS11ZHA6MSc7XG4gICAgICAgICAgICBjYW5kLmMoJ2NvbnRlbnQnLCB7Y3JlYXRvcjogdGhpcy5pbml0aWF0b3IgPT0gdGhpcy5tZSA/ICdpbml0aWF0b3InIDogJ3Jlc3BvbmRlcicsXG4gICAgICAgICAgICAgICAgbmFtZTogY2FuZHNbMF0uc2RwTWlkXG4gICAgICAgICAgICB9KS5jKCd0cmFuc3BvcnQnLCBpY2UpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjYW5kcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGNhbmQuYygnY2FuZGlkYXRlJywgU0RQVXRpbC5jYW5kaWRhdGVUb0ppbmdsZShjYW5kc1tpXS5jYW5kaWRhdGUpKS51cCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gYWRkIGZpbmdlcnByaW50XG4gICAgICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUodGhpcy5sb2NhbFNEUC5tZWRpYVttaWRdLCAnYT1maW5nZXJwcmludDonLCB0aGlzLmxvY2FsU0RQLnNlc3Npb24pKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRtcCA9IFNEUFV0aWwucGFyc2VfZmluZ2VycHJpbnQoU0RQVXRpbC5maW5kX2xpbmUodGhpcy5sb2NhbFNEUC5tZWRpYVttaWRdLCAnYT1maW5nZXJwcmludDonLCB0aGlzLmxvY2FsU0RQLnNlc3Npb24pKTtcbiAgICAgICAgICAgICAgICB0bXAucmVxdWlyZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGNhbmQuYyhcbiAgICAgICAgICAgICAgICAgICAgJ2ZpbmdlcnByaW50JyxcbiAgICAgICAgICAgICAgICAgICAge3htbG5zOiAndXJuOnhtcHA6amluZ2xlOmFwcHM6ZHRsczowJ30pXG4gICAgICAgICAgICAgICAgICAgIC50KHRtcC5maW5nZXJwcmludCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRtcC5maW5nZXJwcmludDtcbiAgICAgICAgICAgICAgICBjYW5kLmF0dHJzKHRtcCk7XG4gICAgICAgICAgICAgICAgY2FuZC51cCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FuZC51cCgpOyAvLyB0cmFuc3BvcnRcbiAgICAgICAgICAgIGNhbmQudXAoKTsgLy8gY29udGVudFxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIG1pZ2h0IG1lcmdlIGxhc3QtY2FuZGlkYXRlIG5vdGlmaWNhdGlvbiBpbnRvIHRoaXMsIGJ1dCBpdCBpcyBjYWxsZWQgYWxvdCBsYXRlci4gU2VlIHdlYnJ0YyBpc3N1ZSAjMjM0MFxuICAgIC8vY29uc29sZS5sb2coJ3dhcyB0aGlzIHRoZSBsYXN0IGNhbmRpZGF0ZScsIHRoaXMubGFzdGljZWNhbmRpZGF0ZSk7XG4gICAgdGhpcy5jb25uZWN0aW9uLnNlbmRJUShjYW5kLFxuICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgYWNrID0ge307XG4gICAgICAgICAgICBhY2suc291cmNlID0gJ3RyYW5zcG9ydGluZm8nO1xuICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignYWNrLmppbmdsZScsIFt0aGlzLnNpZCwgYWNrXSk7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChzdGFuemEpIHtcbiAgICAgICAgICAgIHZhciBlcnJvciA9ICgkKHN0YW56YSkuZmluZCgnZXJyb3InKS5sZW5ndGgpID8ge1xuICAgICAgICAgICAgICAgIGNvZGU6ICQoc3RhbnphKS5maW5kKCdlcnJvcicpLmF0dHIoJ2NvZGUnKSxcbiAgICAgICAgICAgICAgICByZWFzb246ICQoc3RhbnphKS5maW5kKCdlcnJvciA6Zmlyc3QnKVswXS50YWdOYW1lLFxuICAgICAgICAgICAgfTp7fTtcbiAgICAgICAgICAgIGVycm9yLnNvdXJjZSA9ICd0cmFuc3BvcnRpbmZvJztcbiAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2Vycm9yLmppbmdsZScsIFt0aGlzLnNpZCwgZXJyb3JdKTtcbiAgICAgICAgfSxcbiAgICAgICAgMTAwMDApO1xufTtcblxuXG5KaW5nbGVTZXNzaW9uLnByb3RvdHlwZS5zZW5kT2ZmZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy9jb25zb2xlLmxvZygnc2VuZE9mZmVyLi4uJyk7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uY3JlYXRlT2ZmZXIoZnVuY3Rpb24gKHNkcCkge1xuICAgICAgICAgICAgc2VsZi5jcmVhdGVkT2ZmZXIoc2RwKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2NyZWF0ZU9mZmVyIGZhaWxlZCcsIGUpO1xuICAgICAgICB9LFxuICAgICAgICB0aGlzLm1lZGlhX2NvbnN0cmFpbnRzXG4gICAgKTtcbn07XG5cbkppbmdsZVNlc3Npb24ucHJvdG90eXBlLmNyZWF0ZWRPZmZlciA9IGZ1bmN0aW9uIChzZHApIHtcbiAgICAvL2NvbnNvbGUubG9nKCdjcmVhdGVkT2ZmZXInLCBzZHApO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmxvY2FsU0RQID0gbmV3IFNEUChzZHAuc2RwKTtcbiAgICAvL3RoaXMubG9jYWxTRFAubWFuZ2xlKCk7XG4gICAgaWYgKHRoaXMudXNldHJpY2tsZSkge1xuICAgICAgICB2YXIgaW5pdCA9ICRpcSh7dG86IHRoaXMucGVlcmppZCxcbiAgICAgICAgICAgIHR5cGU6ICdzZXQnfSlcbiAgICAgICAgICAgIC5jKCdqaW5nbGUnLCB7eG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6MScsXG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnc2Vzc2lvbi1pbml0aWF0ZScsXG4gICAgICAgICAgICAgICAgaW5pdGlhdG9yOiB0aGlzLmluaXRpYXRvcixcbiAgICAgICAgICAgICAgICBzaWQ6IHRoaXMuc2lkfSk7XG4gICAgICAgIHRoaXMubG9jYWxTRFAudG9KaW5nbGUoaW5pdCwgdGhpcy5pbml0aWF0b3IgPT0gdGhpcy5tZSA/ICdpbml0aWF0b3InIDogJ3Jlc3BvbmRlcicpO1xuICAgICAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZElRKGluaXQsXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFjayA9IHt9O1xuICAgICAgICAgICAgICAgIGFjay5zb3VyY2UgPSAnb2ZmZXInO1xuICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2Fjay5qaW5nbGUnLCBbc2VsZi5zaWQsIGFja10pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChzdGFuemEpIHtcbiAgICAgICAgICAgICAgICBzZWxmLnN0YXRlID0gJ2Vycm9yJztcbiAgICAgICAgICAgICAgICBzZWxmLnBlZXJjb25uZWN0aW9uLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgdmFyIGVycm9yID0gKCQoc3RhbnphKS5maW5kKCdlcnJvcicpLmxlbmd0aCkgPyB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6ICQoc3RhbnphKS5maW5kKCdlcnJvcicpLmF0dHIoJ2NvZGUnKSxcbiAgICAgICAgICAgICAgICAgICAgcmVhc29uOiAkKHN0YW56YSkuZmluZCgnZXJyb3IgOmZpcnN0JylbMF0udGFnTmFtZSxcbiAgICAgICAgICAgICAgICB9Ont9O1xuICAgICAgICAgICAgICAgIGVycm9yLnNvdXJjZSA9ICdvZmZlcic7XG4gICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignZXJyb3IuamluZ2xlJywgW3NlbGYuc2lkLCBlcnJvcl0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIDEwMDAwKTtcbiAgICB9XG4gICAgc2RwLnNkcCA9IHRoaXMubG9jYWxTRFAucmF3O1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uc2V0TG9jYWxEZXNjcmlwdGlvbihzZHAsXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ3NldExvY2FsRGVzY3JpcHRpb24uamluZ2xlJywgW3NlbGYuc2lkXSk7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdzZXRMb2NhbERlc2NyaXB0aW9uIHN1Y2Nlc3MnKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ3NldExvY2FsRGVzY3JpcHRpb24gZmFpbGVkJywgZSk7XG4gICAgICAgIH1cbiAgICApO1xuICAgIHZhciBjYW5kcyA9IFNEUFV0aWwuZmluZF9saW5lcyh0aGlzLmxvY2FsU0RQLnJhdywgJ2E9Y2FuZGlkYXRlOicpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2FuZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGNhbmQgPSBTRFBVdGlsLnBhcnNlX2ljZWNhbmRpZGF0ZShjYW5kc1tpXSk7XG4gICAgICAgIGlmIChjYW5kLnR5cGUgPT0gJ3NyZmx4Jykge1xuICAgICAgICAgICAgdGhpcy5oYWRzdHVuY2FuZGlkYXRlID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChjYW5kLnR5cGUgPT0gJ3JlbGF5Jykge1xuICAgICAgICAgICAgdGhpcy5oYWR0dXJuY2FuZGlkYXRlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbkppbmdsZVNlc3Npb24ucHJvdG90eXBlLnNldFJlbW90ZURlc2NyaXB0aW9uID0gZnVuY3Rpb24gKGVsZW0sIGRlc2N0eXBlKSB7XG4gICAgLy9jb25zb2xlLmxvZygnc2V0dGluZyByZW1vdGUgZGVzY3JpcHRpb24uLi4gJywgZGVzY3R5cGUpO1xuICAgIHRoaXMucmVtb3RlU0RQID0gbmV3IFNEUCgnJyk7XG4gICAgdGhpcy5yZW1vdGVTRFAuZnJvbUppbmdsZShlbGVtKTtcbiAgICBpZiAodGhpcy5wZWVyY29ubmVjdGlvbi5yZW1vdGVEZXNjcmlwdGlvbiAhPT0gbnVsbCkge1xuICAgICAgICBjb25zb2xlLmxvZygnc2V0UmVtb3RlRGVzY3JpcHRpb24gd2hlbiByZW1vdGUgZGVzY3JpcHRpb24gaXMgbm90IG51bGwsIHNob3VsZCBiZSBwcmFuc3dlcicsIHRoaXMucGVlcmNvbm5lY3Rpb24ucmVtb3RlRGVzY3JpcHRpb24pO1xuICAgICAgICBpZiAodGhpcy5wZWVyY29ubmVjdGlvbi5yZW1vdGVEZXNjcmlwdGlvbi50eXBlID09ICdwcmFuc3dlcicpIHtcbiAgICAgICAgICAgIHZhciBwcmFuc3dlciA9IG5ldyBTRFAodGhpcy5wZWVyY29ubmVjdGlvbi5yZW1vdGVEZXNjcmlwdGlvbi5zZHApO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcmFuc3dlci5tZWRpYS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIC8vIG1ha2Ugc3VyZSB3ZSBoYXZlIGljZSB1ZnJhZyBhbmQgcHdkXG4gICAgICAgICAgICAgICAgaWYgKCFTRFBVdGlsLmZpbmRfbGluZSh0aGlzLnJlbW90ZVNEUC5tZWRpYVtpXSwgJ2E9aWNlLXVmcmFnOicsIHRoaXMucmVtb3RlU0RQLnNlc3Npb24pKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZShwcmFuc3dlci5tZWRpYVtpXSwgJ2E9aWNlLXVmcmFnOicsIHByYW5zd2VyLnNlc3Npb24pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW90ZVNEUC5tZWRpYVtpXSArPSBTRFBVdGlsLmZpbmRfbGluZShwcmFuc3dlci5tZWRpYVtpXSwgJ2E9aWNlLXVmcmFnOicsIHByYW5zd2VyLnNlc3Npb24pICsgJ1xcclxcbic7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ25vIGljZSB1ZnJhZz8nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUocHJhbnN3ZXIubWVkaWFbaV0sICdhPWljZS1wd2Q6JywgcHJhbnN3ZXIuc2Vzc2lvbikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3RlU0RQLm1lZGlhW2ldICs9IFNEUFV0aWwuZmluZF9saW5lKHByYW5zd2VyLm1lZGlhW2ldLCAnYT1pY2UtcHdkOicsIHByYW5zd2VyLnNlc3Npb24pICsgJ1xcclxcbic7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ25vIGljZSBwd2Q/Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gY29weSBvdmVyIGNhbmRpZGF0ZXNcbiAgICAgICAgICAgICAgICB2YXIgbGluZXMgPSBTRFBVdGlsLmZpbmRfbGluZXMocHJhbnN3ZXIubWVkaWFbaV0sICdhPWNhbmRpZGF0ZTonKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGxpbmVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3RlU0RQLm1lZGlhW2ldICs9IGxpbmVzW2pdICsgJ1xcclxcbic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5yZW1vdGVTRFAucmF3ID0gdGhpcy5yZW1vdGVTRFAuc2Vzc2lvbiArIHRoaXMucmVtb3RlU0RQLm1lZGlhLmpvaW4oJycpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZhciByZW1vdGVkZXNjID0gbmV3IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbih7dHlwZTogZGVzY3R5cGUsIHNkcDogdGhpcy5yZW1vdGVTRFAucmF3fSk7XG5cbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLnNldFJlbW90ZURlc2NyaXB0aW9uKHJlbW90ZWRlc2MsXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3NldFJlbW90ZURlc2NyaXB0aW9uIHN1Y2Nlc3MnKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ3NldFJlbW90ZURlc2NyaXB0aW9uIGVycm9yJywgZSk7XG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdmYXRhbEVycm9yLmppbmdsZScsIFtzZWxmLCBlXSk7XG4gICAgICAgICAgICBjb25uZWN0aW9uLmVtdWMuZG9MZWF2ZSgpO1xuICAgICAgICB9XG4gICAgKTtcbn07XG5cbkppbmdsZVNlc3Npb24ucHJvdG90eXBlLmFkZEljZUNhbmRpZGF0ZSA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICh0aGlzLnBlZXJjb25uZWN0aW9uLnNpZ25hbGluZ1N0YXRlID09ICdjbG9zZWQnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCF0aGlzLnBlZXJjb25uZWN0aW9uLnJlbW90ZURlc2NyaXB0aW9uICYmIHRoaXMucGVlcmNvbm5lY3Rpb24uc2lnbmFsaW5nU3RhdGUgPT0gJ2hhdmUtbG9jYWwtb2ZmZXInKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCd0cmlja2xlIGljZSBjYW5kaWRhdGUgYXJyaXZpbmcgYmVmb3JlIHNlc3Npb24gYWNjZXB0Li4uJyk7XG4gICAgICAgIC8vIGNyZWF0ZSBhIFBSQU5TV0VSIGZvciBzZXRSZW1vdGVEZXNjcmlwdGlvblxuICAgICAgICBpZiAoIXRoaXMucmVtb3RlU0RQKSB7XG4gICAgICAgICAgICB2YXIgY29iYmxlZCA9ICd2PTBcXHJcXG4nICtcbiAgICAgICAgICAgICAgICAnbz0tICcgKyAnMTkyMzUxODUxNicgKyAnIDIgSU4gSVA0IDAuMC4wLjBcXHJcXG4nICsvLyBGSVhNRVxuICAgICAgICAgICAgICAgICdzPS1cXHJcXG4nICtcbiAgICAgICAgICAgICAgICAndD0wIDBcXHJcXG4nO1xuICAgICAgICAgICAgLy8gZmlyc3QsIHRha2Ugc29tZSB0aGluZ3MgZnJvbSB0aGUgbG9jYWwgZGVzY3JpcHRpb25cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sb2NhbFNEUC5tZWRpYS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGNvYmJsZWQgKz0gU0RQVXRpbC5maW5kX2xpbmUodGhpcy5sb2NhbFNEUC5tZWRpYVtpXSwgJ209JykgKyAnXFxyXFxuJztcbiAgICAgICAgICAgICAgICBjb2JibGVkICs9IFNEUFV0aWwuZmluZF9saW5lcyh0aGlzLmxvY2FsU0RQLm1lZGlhW2ldLCAnYT1ydHBtYXA6Jykuam9pbignXFxyXFxuJykgKyAnXFxyXFxuJztcbiAgICAgICAgICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUodGhpcy5sb2NhbFNEUC5tZWRpYVtpXSwgJ2E9bWlkOicpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvYmJsZWQgKz0gU0RQVXRpbC5maW5kX2xpbmUodGhpcy5sb2NhbFNEUC5tZWRpYVtpXSwgJ2E9bWlkOicpICsgJ1xcclxcbic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvYmJsZWQgKz0gJ2E9aW5hY3RpdmVcXHJcXG4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5yZW1vdGVTRFAgPSBuZXcgU0RQKGNvYmJsZWQpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHRoZW4gYWRkIHRoaW5ncyBsaWtlIGljZSBhbmQgZHRscyBmcm9tIHJlbW90ZSBjYW5kaWRhdGVcbiAgICAgICAgZWxlbS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5yZW1vdGVTRFAubWVkaWEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUoc2VsZi5yZW1vdGVTRFAubWVkaWFbaV0sICdhPW1pZDonICsgJCh0aGlzKS5hdHRyKCduYW1lJykpIHx8XG4gICAgICAgICAgICAgICAgICAgIHNlbGYucmVtb3RlU0RQLm1lZGlhW2ldLmluZGV4T2YoJ209JyArICQodGhpcykuYXR0cignbmFtZScpKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIVNEUFV0aWwuZmluZF9saW5lKHNlbGYucmVtb3RlU0RQLm1lZGlhW2ldLCAnYT1pY2UtdWZyYWc6JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0bXAgPSAkKHRoaXMpLmZpbmQoJ3RyYW5zcG9ydCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5yZW1vdGVTRFAubWVkaWFbaV0gKz0gJ2E9aWNlLXVmcmFnOicgKyB0bXAuYXR0cigndWZyYWcnKSArICdcXHJcXG4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5yZW1vdGVTRFAubWVkaWFbaV0gKz0gJ2E9aWNlLXB3ZDonICsgdG1wLmF0dHIoJ3B3ZCcpICsgJ1xcclxcbic7XG4gICAgICAgICAgICAgICAgICAgICAgICB0bXAgPSAkKHRoaXMpLmZpbmQoJ3RyYW5zcG9ydD5maW5nZXJwcmludCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRtcC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnJlbW90ZVNEUC5tZWRpYVtpXSArPSAnYT1maW5nZXJwcmludDonICsgdG1wLmF0dHIoJ2hhc2gnKSArICcgJyArIHRtcC50ZXh0KCkgKyAnXFxyXFxuJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ25vIGR0bHMgZmluZ2VycHJpbnQgKHdlYnJ0YyBpc3N1ZSAjMTcxOD8pJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5yZW1vdGVTRFAubWVkaWFbaV0gKz0gJ2E9Y3J5cHRvOjEgQUVTX0NNXzEyOF9ITUFDX1NIQTFfODAgaW5saW5lOkJBQURCQUFEQkFBREJBQURCQUFEQkFBREJBQURCQUFEQkFBREJBQURcXHJcXG4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnJlbW90ZVNEUC5yYXcgPSB0aGlzLnJlbW90ZVNEUC5zZXNzaW9uICsgdGhpcy5yZW1vdGVTRFAubWVkaWEuam9pbignJyk7XG5cbiAgICAgICAgLy8gd2UgbmVlZCBhIGNvbXBsZXRlIFNEUCB3aXRoIGljZS11ZnJhZy9pY2UtcHdkIGluIGFsbCBwYXJ0c1xuICAgICAgICAvLyB0aGlzIG1ha2VzIHRoZSBhc3N1bXB0aW9uIHRoYXQgdGhlIFBSQU5TV0VSIGlzIGNvbnN0cnVjdGVkIHN1Y2ggdGhhdCB0aGUgaWNlLXVmcmFnIGlzIGluIGFsbCBtZWRpYXBhcnRzXG4gICAgICAgIC8vIGJ1dCBpdCBjb3VsZCBiZSBpbiB0aGUgc2Vzc2lvbiBwYXJ0IGFzIHdlbGwuIHNpbmNlIHRoZSBjb2RlIGFib3ZlIGNvbnN0cnVjdHMgdGhpcyBzZHAgdGhpcyBjYW4ndCBoYXBwZW4gaG93ZXZlclxuICAgICAgICB2YXIgaXNjb21wbGV0ZSA9IHRoaXMucmVtb3RlU0RQLm1lZGlhLmZpbHRlcihmdW5jdGlvbiAobWVkaWFwYXJ0KSB7XG4gICAgICAgICAgICByZXR1cm4gU0RQVXRpbC5maW5kX2xpbmUobWVkaWFwYXJ0LCAnYT1pY2UtdWZyYWc6Jyk7XG4gICAgICAgIH0pLmxlbmd0aCA9PSB0aGlzLnJlbW90ZVNEUC5tZWRpYS5sZW5ndGg7XG5cbiAgICAgICAgaWYgKGlzY29tcGxldGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzZXR0aW5nIHByYW5zd2VyJyk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uc2V0UmVtb3RlRGVzY3JpcHRpb24obmV3IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbih7dHlwZTogJ3ByYW5zd2VyJywgc2RwOiB0aGlzLnJlbW90ZVNEUC5yYXcgfSksXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2V0UmVtb3RlRGVzY3JpcHRpb24gcHJhbnN3ZXIgZmFpbGVkJywgZS50b1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignc2V0dGluZyBwcmFuc3dlciBmYWlsZWQnLCBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ25vdCB5ZXQgc2V0dGluZyBwcmFuc3dlcicpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIG9wZXJhdGUgb24gZWFjaCBjb250ZW50IGVsZW1lbnRcbiAgICBlbGVtLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyB3b3VsZCBsb3ZlIHRvIGRlYWN0aXZhdGUgdGhpcywgYnV0IGZpcmVmb3ggc3RpbGwgcmVxdWlyZXMgaXRcbiAgICAgICAgdmFyIGlkeCA9IC0xO1xuICAgICAgICB2YXIgaTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHNlbGYucmVtb3RlU0RQLm1lZGlhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoU0RQVXRpbC5maW5kX2xpbmUoc2VsZi5yZW1vdGVTRFAubWVkaWFbaV0sICdhPW1pZDonICsgJCh0aGlzKS5hdHRyKCduYW1lJykpIHx8XG4gICAgICAgICAgICAgICAgc2VsZi5yZW1vdGVTRFAubWVkaWFbaV0uaW5kZXhPZignbT0nICsgJCh0aGlzKS5hdHRyKCduYW1lJykpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgaWR4ID0gaTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaWR4ID09IC0xKSB7IC8vIGZhbGwgYmFjayB0byBsb2NhbGRlc2NyaXB0aW9uXG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgc2VsZi5sb2NhbFNEUC5tZWRpYS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChTRFBVdGlsLmZpbmRfbGluZShzZWxmLmxvY2FsU0RQLm1lZGlhW2ldLCAnYT1taWQ6JyArICQodGhpcykuYXR0cignbmFtZScpKSB8fFxuICAgICAgICAgICAgICAgICAgICBzZWxmLmxvY2FsU0RQLm1lZGlhW2ldLmluZGV4T2YoJ209JyArICQodGhpcykuYXR0cignbmFtZScpKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBpZHggPSBpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG5hbWUgPSAkKHRoaXMpLmF0dHIoJ25hbWUnKTtcbiAgICAgICAgLy8gVE9ETzogY2hlY2sgaWNlLXB3ZCBhbmQgaWNlLXVmcmFnP1xuICAgICAgICAkKHRoaXMpLmZpbmQoJ3RyYW5zcG9ydD5jYW5kaWRhdGUnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBsaW5lLCBjYW5kaWRhdGU7XG4gICAgICAgICAgICBsaW5lID0gU0RQVXRpbC5jYW5kaWRhdGVGcm9tSmluZ2xlKHRoaXMpO1xuICAgICAgICAgICAgY2FuZGlkYXRlID0gbmV3IFJUQ0ljZUNhbmRpZGF0ZSh7c2RwTUxpbmVJbmRleDogaWR4LFxuICAgICAgICAgICAgICAgIHNkcE1pZDogbmFtZSxcbiAgICAgICAgICAgICAgICBjYW5kaWRhdGU6IGxpbmV9KTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgc2VsZi5wZWVyY29ubmVjdGlvbi5hZGRJY2VDYW5kaWRhdGUoY2FuZGlkYXRlKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdhZGRJY2VDYW5kaWRhdGUgZmFpbGVkJywgZS50b1N0cmluZygpLCBsaW5lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG5KaW5nbGVTZXNzaW9uLnByb3RvdHlwZS5zZW5kQW5zd2VyID0gZnVuY3Rpb24gKHByb3Zpc2lvbmFsKSB7XG4gICAgLy9jb25zb2xlLmxvZygnY3JlYXRlQW5zd2VyJywgcHJvdmlzaW9uYWwpO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLmNyZWF0ZUFuc3dlcihcbiAgICAgICAgZnVuY3Rpb24gKHNkcCkge1xuICAgICAgICAgICAgc2VsZi5jcmVhdGVkQW5zd2VyKHNkcCwgcHJvdmlzaW9uYWwpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignY3JlYXRlQW5zd2VyIGZhaWxlZCcsIGUpO1xuICAgICAgICB9LFxuICAgICAgICB0aGlzLm1lZGlhX2NvbnN0cmFpbnRzXG4gICAgKTtcbn07XG5cbkppbmdsZVNlc3Npb24ucHJvdG90eXBlLmNyZWF0ZWRBbnN3ZXIgPSBmdW5jdGlvbiAoc2RwLCBwcm92aXNpb25hbCkge1xuICAgIC8vY29uc29sZS5sb2coJ2NyZWF0ZUFuc3dlciBjYWxsYmFjaycpO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmxvY2FsU0RQID0gbmV3IFNEUChzZHAuc2RwKTtcbiAgICAvL3RoaXMubG9jYWxTRFAubWFuZ2xlKCk7XG4gICAgdGhpcy51c2VwcmFuc3dlciA9IHByb3Zpc2lvbmFsID09PSB0cnVlO1xuICAgIGlmICh0aGlzLnVzZXRyaWNrbGUpIHtcbiAgICAgICAgaWYgKCF0aGlzLnVzZXByYW5zd2VyKSB7XG4gICAgICAgICAgICB2YXIgYWNjZXB0ID0gJGlxKHt0bzogdGhpcy5wZWVyamlkLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdzZXQnfSlcbiAgICAgICAgICAgICAgICAuYygnamluZ2xlJywge3htbG5zOiAndXJuOnhtcHA6amluZ2xlOjEnLFxuICAgICAgICAgICAgICAgICAgICBhY3Rpb246ICdzZXNzaW9uLWFjY2VwdCcsXG4gICAgICAgICAgICAgICAgICAgIGluaXRpYXRvcjogdGhpcy5pbml0aWF0b3IsXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbmRlcjogdGhpcy5yZXNwb25kZXIsXG4gICAgICAgICAgICAgICAgICAgIHNpZDogdGhpcy5zaWQgfSk7XG4gICAgICAgICAgICB2YXIgc2ltdWxjYXN0ID0gbmV3IFNpbXVsY2FzdCgpO1xuICAgICAgICAgICAgdmFyIHB1YmxpY0xvY2FsRGVzYyA9IHNpbXVsY2FzdC5yZXZlcnNlVHJhbnNmb3JtTG9jYWxEZXNjcmlwdGlvbihzZHApO1xuICAgICAgICAgICAgdmFyIHB1YmxpY0xvY2FsU0RQID0gbmV3IFNEUChwdWJsaWNMb2NhbERlc2Muc2RwKTtcbiAgICAgICAgICAgIHB1YmxpY0xvY2FsU0RQLnRvSmluZ2xlKGFjY2VwdCwgdGhpcy5pbml0aWF0b3IgPT0gdGhpcy5tZSA/ICdpbml0aWF0b3InIDogJ3Jlc3BvbmRlcicpO1xuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLnNlbmRJUShhY2NlcHQsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYWNrID0ge307XG4gICAgICAgICAgICAgICAgICAgIGFjay5zb3VyY2UgPSAnYW5zd2VyJztcbiAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignYWNrLmppbmdsZScsIFtzZWxmLnNpZCwgYWNrXSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoc3RhbnphKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlcnJvciA9ICgkKHN0YW56YSkuZmluZCgnZXJyb3InKS5sZW5ndGgpID8ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogJChzdGFuemEpLmZpbmQoJ2Vycm9yJykuYXR0cignY29kZScpLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVhc29uOiAkKHN0YW56YSkuZmluZCgnZXJyb3IgOmZpcnN0JylbMF0udGFnTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgfTp7fTtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3Iuc291cmNlID0gJ2Fuc3dlcic7XG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ2Vycm9yLmppbmdsZScsIFtzZWxmLnNpZCwgZXJyb3JdKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIDEwMDAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNkcC50eXBlID0gJ3ByYW5zd2VyJztcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sb2NhbFNEUC5tZWRpYS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXMubG9jYWxTRFAubWVkaWFbaV0gPSB0aGlzLmxvY2FsU0RQLm1lZGlhW2ldLnJlcGxhY2UoJ2E9c2VuZHJlY3ZcXHJcXG4nLCAnYT1pbmFjdGl2ZVxcclxcbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5sb2NhbFNEUC5yYXcgPSB0aGlzLmxvY2FsU0RQLnNlc3Npb24gKyAnXFxyXFxuJyArIHRoaXMubG9jYWxTRFAubWVkaWEuam9pbignJyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc2RwLnNkcCA9IHRoaXMubG9jYWxTRFAucmF3O1xuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uc2V0TG9jYWxEZXNjcmlwdGlvbihzZHAsXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ3NldExvY2FsRGVzY3JpcHRpb24uamluZ2xlJywgW3NlbGYuc2lkXSk7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdzZXRMb2NhbERlc2NyaXB0aW9uIHN1Y2Nlc3MnKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ3NldExvY2FsRGVzY3JpcHRpb24gZmFpbGVkJywgZSk7XG4gICAgICAgIH1cbiAgICApO1xuICAgIHZhciBjYW5kcyA9IFNEUFV0aWwuZmluZF9saW5lcyh0aGlzLmxvY2FsU0RQLnJhdywgJ2E9Y2FuZGlkYXRlOicpO1xuICAgIGZvciAodmFyIGogPSAwOyBqIDwgY2FuZHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdmFyIGNhbmQgPSBTRFBVdGlsLnBhcnNlX2ljZWNhbmRpZGF0ZShjYW5kc1tqXSk7XG4gICAgICAgIGlmIChjYW5kLnR5cGUgPT0gJ3NyZmx4Jykge1xuICAgICAgICAgICAgdGhpcy5oYWRzdHVuY2FuZGlkYXRlID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChjYW5kLnR5cGUgPT0gJ3JlbGF5Jykge1xuICAgICAgICAgICAgdGhpcy5oYWR0dXJuY2FuZGlkYXRlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbkppbmdsZVNlc3Npb24ucHJvdG90eXBlLnNlbmRUZXJtaW5hdGUgPSBmdW5jdGlvbiAocmVhc29uLCB0ZXh0KSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICB0ZXJtID0gJGlxKHt0bzogdGhpcy5wZWVyamlkLFxuICAgICAgICAgICAgdHlwZTogJ3NldCd9KVxuICAgICAgICAgICAgLmMoJ2ppbmdsZScsIHt4bWxuczogJ3Vybjp4bXBwOmppbmdsZToxJyxcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdzZXNzaW9uLXRlcm1pbmF0ZScsXG4gICAgICAgICAgICAgICAgaW5pdGlhdG9yOiB0aGlzLmluaXRpYXRvcixcbiAgICAgICAgICAgICAgICBzaWQ6IHRoaXMuc2lkfSlcbiAgICAgICAgICAgIC5jKCdyZWFzb24nKVxuICAgICAgICAgICAgLmMocmVhc29uIHx8ICdzdWNjZXNzJyk7XG5cbiAgICBpZiAodGV4dCkge1xuICAgICAgICB0ZXJtLnVwKCkuYygndGV4dCcpLnQodGV4dCk7XG4gICAgfVxuXG4gICAgdGhpcy5jb25uZWN0aW9uLnNlbmRJUSh0ZXJtLFxuICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLnBlZXJjb25uZWN0aW9uLmNsb3NlKCk7XG4gICAgICAgICAgICBzZWxmLnBlZXJjb25uZWN0aW9uID0gbnVsbDtcbiAgICAgICAgICAgIHNlbGYudGVybWluYXRlKCk7XG4gICAgICAgICAgICB2YXIgYWNrID0ge307XG4gICAgICAgICAgICBhY2suc291cmNlID0gJ3Rlcm1pbmF0ZSc7XG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdhY2suamluZ2xlJywgW3NlbGYuc2lkLCBhY2tdKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKHN0YW56YSkge1xuICAgICAgICAgICAgdmFyIGVycm9yID0gKCQoc3RhbnphKS5maW5kKCdlcnJvcicpLmxlbmd0aCkgPyB7XG4gICAgICAgICAgICAgICAgY29kZTogJChzdGFuemEpLmZpbmQoJ2Vycm9yJykuYXR0cignY29kZScpLFxuICAgICAgICAgICAgICAgIHJlYXNvbjogJChzdGFuemEpLmZpbmQoJ2Vycm9yIDpmaXJzdCcpWzBdLnRhZ05hbWUsXG4gICAgICAgICAgICB9Ont9O1xuICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignYWNrLmppbmdsZScsIFtzZWxmLnNpZCwgZXJyb3JdKTtcbiAgICAgICAgfSxcbiAgICAgICAgMTAwMDApO1xuICAgIGlmICh0aGlzLnN0YXRzaW50ZXJ2YWwgIT09IG51bGwpIHtcbiAgICAgICAgd2luZG93LmNsZWFySW50ZXJ2YWwodGhpcy5zdGF0c2ludGVydmFsKTtcbiAgICAgICAgdGhpcy5zdGF0c2ludGVydmFsID0gbnVsbDtcbiAgICB9XG59O1xuXG5KaW5nbGVTZXNzaW9uLnByb3RvdHlwZS5zZW5kTXV0ZSA9IGZ1bmN0aW9uIChtdXRlZCwgY29udGVudCkge1xuICAgIHZhciBpbmZvID0gJGlxKHt0bzogdGhpcy5wZWVyamlkLFxuICAgICAgICB0eXBlOiAnc2V0J30pXG4gICAgICAgIC5jKCdqaW5nbGUnLCB7eG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6MScsXG4gICAgICAgICAgICBhY3Rpb246ICdzZXNzaW9uLWluZm8nLFxuICAgICAgICAgICAgaW5pdGlhdG9yOiB0aGlzLmluaXRpYXRvcixcbiAgICAgICAgICAgIHNpZDogdGhpcy5zaWQgfSk7XG4gICAgaW5mby5jKG11dGVkID8gJ211dGUnIDogJ3VubXV0ZScsIHt4bWxuczogJ3Vybjp4bXBwOmppbmdsZTphcHBzOnJ0cDppbmZvOjEnfSk7XG4gICAgaW5mby5hdHRycyh7J2NyZWF0b3InOiB0aGlzLm1lID09IHRoaXMuaW5pdGlhdG9yID8gJ2NyZWF0b3InIDogJ3Jlc3BvbmRlcid9KTtcbiAgICBpZiAoY29udGVudCkge1xuICAgICAgICBpbmZvLmF0dHJzKHsnbmFtZSc6IGNvbnRlbnR9KTtcbiAgICB9XG4gICAgdGhpcy5jb25uZWN0aW9uLnNlbmQoaW5mbyk7XG59O1xuXG5KaW5nbGVTZXNzaW9uLnByb3RvdHlwZS5zZW5kUmluZ2luZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaW5mbyA9ICRpcSh7dG86IHRoaXMucGVlcmppZCxcbiAgICAgICAgdHlwZTogJ3NldCd9KVxuICAgICAgICAuYygnamluZ2xlJywge3htbG5zOiAndXJuOnhtcHA6amluZ2xlOjEnLFxuICAgICAgICAgICAgYWN0aW9uOiAnc2Vzc2lvbi1pbmZvJyxcbiAgICAgICAgICAgIGluaXRpYXRvcjogdGhpcy5pbml0aWF0b3IsXG4gICAgICAgICAgICBzaWQ6IHRoaXMuc2lkIH0pO1xuICAgIGluZm8uYygncmluZ2luZycsIHt4bWxuczogJ3Vybjp4bXBwOmppbmdsZTphcHBzOnJ0cDppbmZvOjEnfSk7XG4gICAgdGhpcy5jb25uZWN0aW9uLnNlbmQoaW5mbyk7XG59O1xuXG5KaW5nbGVTZXNzaW9uLnByb3RvdHlwZS5nZXRTdGF0cyA9IGZ1bmN0aW9uIChpbnRlcnZhbCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcmVjdiA9IHthdWRpbzogMCwgdmlkZW86IDB9O1xuICAgIHZhciBsb3N0ID0ge2F1ZGlvOiAwLCB2aWRlbzogMH07XG4gICAgdmFyIGxhc3RyZWN2ID0ge2F1ZGlvOiAwLCB2aWRlbzogMH07XG4gICAgdmFyIGxhc3Rsb3N0ID0ge2F1ZGlvOiAwLCB2aWRlbzogMH07XG4gICAgdmFyIGxvc3MgPSB7YXVkaW86IDAsIHZpZGVvOiAwfTtcbiAgICB2YXIgZGVsdGEgPSB7YXVkaW86IDAsIHZpZGVvOiAwfTtcbiAgICB0aGlzLnN0YXRzaW50ZXJ2YWwgPSB3aW5kb3cuc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoc2VsZiAmJiBzZWxmLnBlZXJjb25uZWN0aW9uICYmIHNlbGYucGVlcmNvbm5lY3Rpb24uZ2V0U3RhdHMpIHtcbiAgICAgICAgICAgIHNlbGYucGVlcmNvbm5lY3Rpb24uZ2V0U3RhdHMoZnVuY3Rpb24gKHN0YXRzKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSBzdGF0cy5yZXN1bHQoKTtcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiB0aGVyZSBhcmUgc28gbXVjaCBzdGF0aXN0aWNzIHlvdSBjYW4gZ2V0IGZyb20gdGhpcy4uXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXN1bHRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHRzW2ldLnR5cGUgPT0gJ3NzcmMnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFja2V0c3JlY3YgPSByZXN1bHRzW2ldLnN0YXQoJ3BhY2tldHNSZWNlaXZlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhY2tldHNsb3N0ID0gcmVzdWx0c1tpXS5zdGF0KCdwYWNrZXRzTG9zdCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhY2tldHNyZWN2ICYmIHBhY2tldHNsb3N0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFja2V0c3JlY3YgPSBwYXJzZUludChwYWNrZXRzcmVjdiwgMTApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhY2tldHNsb3N0ID0gcGFyc2VJbnQocGFja2V0c2xvc3QsIDEwKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHRzW2ldLnN0YXQoJ2dvb2dGcmFtZVJhdGVSZWNlaXZlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3Rsb3N0LnZpZGVvID0gbG9zdC52aWRlbztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFzdHJlY3YudmlkZW8gPSByZWN2LnZpZGVvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWN2LnZpZGVvID0gcGFja2V0c3JlY3Y7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvc3QudmlkZW8gPSBwYWNrZXRzbG9zdDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXN0bG9zdC5hdWRpbyA9IGxvc3QuYXVkaW87XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RyZWN2LmF1ZGlvID0gcmVjdi5hdWRpbztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjdi5hdWRpbyA9IHBhY2tldHNyZWN2O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb3N0LmF1ZGlvID0gcGFja2V0c2xvc3Q7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRlbHRhLmF1ZGlvID0gcmVjdi5hdWRpbyAtIGxhc3RyZWN2LmF1ZGlvO1xuICAgICAgICAgICAgICAgIGRlbHRhLnZpZGVvID0gcmVjdi52aWRlbyAtIGxhc3RyZWN2LnZpZGVvO1xuICAgICAgICAgICAgICAgIGxvc3MuYXVkaW8gPSAoZGVsdGEuYXVkaW8gPiAwKSA/IE1hdGguY2VpbCgxMDAgKiAobG9zdC5hdWRpbyAtIGxhc3Rsb3N0LmF1ZGlvKSAvIGRlbHRhLmF1ZGlvKSA6IDA7XG4gICAgICAgICAgICAgICAgbG9zcy52aWRlbyA9IChkZWx0YS52aWRlbyA+IDApID8gTWF0aC5jZWlsKDEwMCAqIChsb3N0LnZpZGVvIC0gbGFzdGxvc3QudmlkZW8pIC8gZGVsdGEudmlkZW8pIDogMDtcbiAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdwYWNrZXRsb3NzLmppbmdsZScsIFtzZWxmLnNpZCwgbG9zc10pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LCBpbnRlcnZhbCB8fCAzMDAwKTtcbiAgICByZXR1cm4gdGhpcy5zdGF0c2ludGVydmFsO1xufTtcbm1vZHVsZS5leHBvcnRzID0gSmluZ2xlU2Vzc2lvbjsiLCJ2YXIgU0RQID0gcmVxdWlyZShcIi4vc3Ryb3BoZS5qaW5nbGUuc2RwXCIpO1xuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIENvbGlicmlGb2N1cyBhbmQgSmluZ2xlU2Vzc2lvbi5cbiAqIEBwYXJhbSBjb25uZWN0aW9uIFN0cm9waGUgY29ubmVjdGlvbiBvYmplY3RcbiAqIEBwYXJhbSBzaWQgbXkgc2Vzc2lvbiBpZGVudGlmaWVyKHJlc291cmNlKVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFNlc3Npb25CYXNlKGNvbm5lY3Rpb24sIHNpZCl7XG5cbiAgICB0aGlzLmNvbm5lY3Rpb24gPSBjb25uZWN0aW9uO1xuICAgIHRoaXMuc2lkID0gc2lkO1xufVxuXG5cblNlc3Npb25CYXNlLnByb3RvdHlwZS5tb2RpZnlTb3VyY2VzID0gZnVuY3Rpb24gKHN1Y2Nlc3NDYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLnBlZXJjb25uZWN0aW9uLm1vZGlmeVNvdXJjZXMoZnVuY3Rpb24oKXtcbiAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignc2V0TG9jYWxEZXNjcmlwdGlvbi5qaW5nbGUnLCBbc2VsZi5zaWRdKTtcbiAgICAgICAgaWYoc3VjY2Vzc0NhbGxiYWNrKSB7XG4gICAgICAgICAgICBzdWNjZXNzQ2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuU2Vzc2lvbkJhc2UucHJvdG90eXBlLmFkZFNvdXJjZSA9IGZ1bmN0aW9uIChlbGVtLCBmcm9tSmlkKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gRklYTUU6IGRpcnR5IHdhaXRpbmdcbiAgICBpZiAoIXRoaXMucGVlcmNvbm5lY3Rpb24ubG9jYWxEZXNjcmlwdGlvbilcbiAgICB7XG4gICAgICAgIGNvbnNvbGUud2FybihcImFkZFNvdXJjZSAtIGxvY2FsRGVzY3JpcHRpb24gbm90IHJlYWR5IHlldFwiKVxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzZWxmLmFkZFNvdXJjZShlbGVtLCBmcm9tSmlkKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAyMDBcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uYWRkU291cmNlKGVsZW0pO1xuXG4gICAgdGhpcy5tb2RpZnlTb3VyY2VzKCk7XG59O1xuXG5TZXNzaW9uQmFzZS5wcm90b3R5cGUucmVtb3ZlU291cmNlID0gZnVuY3Rpb24gKGVsZW0sIGZyb21KaWQpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBGSVhNRTogZGlydHkgd2FpdGluZ1xuICAgIGlmICghdGhpcy5wZWVyY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uKVxuICAgIHtcbiAgICAgICAgY29uc29sZS53YXJuKFwicmVtb3ZlU291cmNlIC0gbG9jYWxEZXNjcmlwdGlvbiBub3QgcmVhZHkgeWV0XCIpXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHNlbGYucmVtb3ZlU291cmNlKGVsZW0sIGZyb21KaWQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIDIwMFxuICAgICAgICApO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5wZWVyY29ubmVjdGlvbi5yZW1vdmVTb3VyY2UoZWxlbSk7XG5cbiAgICB0aGlzLm1vZGlmeVNvdXJjZXMoKTtcbn07XG4vKipcbiAqIFN3aXRjaGVzIHZpZGVvIHN0cmVhbXMuXG4gKiBAcGFyYW0gbmV3X3N0cmVhbSBuZXcgc3RyZWFtIHRoYXQgd2lsbCBiZSB1c2VkIGFzIHZpZGVvIG9mIHRoaXMgc2Vzc2lvbi5cbiAqIEBwYXJhbSBvbGRTdHJlYW0gb2xkIHZpZGVvIHN0cmVhbSBvZiB0aGlzIHNlc3Npb24uXG4gKiBAcGFyYW0gc3VjY2Vzc19jYWxsYmFjayBjYWxsYmFjayBleGVjdXRlZCBhZnRlciBzdWNjZXNzZnVsIHN0cmVhbSBzd2l0Y2guXG4gKi9cblNlc3Npb25CYXNlLnByb3RvdHlwZS5zd2l0Y2hTdHJlYW1zID0gZnVuY3Rpb24gKG5ld19zdHJlYW0sIG9sZFN0cmVhbSwgc3VjY2Vzc19jYWxsYmFjaykge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8gU3RvcCB0aGUgc3RyZWFtIHRvIHRyaWdnZXIgb25lbmRlZCBldmVudCBmb3Igb2xkIHN0cmVhbVxuICAgIG9sZFN0cmVhbS5zdG9wKCk7XG5cbiAgICAvLyBSZW1lbWJlciBTRFAgdG8gZmlndXJlIG91dCBhZGRlZC9yZW1vdmVkIFNTUkNzXG4gICAgdmFyIG9sZFNkcCA9IG51bGw7XG4gICAgaWYoc2VsZi5wZWVyY29ubmVjdGlvbikge1xuICAgICAgICBpZihzZWxmLnBlZXJjb25uZWN0aW9uLmxvY2FsRGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIG9sZFNkcCA9IG5ldyBTRFAoc2VsZi5wZWVyY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uLnNkcCk7XG4gICAgICAgIH1cbiAgICAgICAgc2VsZi5wZWVyY29ubmVjdGlvbi5yZW1vdmVTdHJlYW0ob2xkU3RyZWFtKTtcbiAgICAgICAgc2VsZi5wZWVyY29ubmVjdGlvbi5hZGRTdHJlYW0obmV3X3N0cmVhbSk7XG4gICAgfVxuXG4gICAgc2VsZi5jb25uZWN0aW9uLmppbmdsZS5sb2NhbFZpZGVvID0gbmV3X3N0cmVhbTtcblxuICAgIHNlbGYuY29ubmVjdGlvbi5qaW5nbGUubG9jYWxTdHJlYW1zID0gW107XG4gICAgc2VsZi5jb25uZWN0aW9uLmppbmdsZS5sb2NhbFN0cmVhbXMucHVzaChzZWxmLmNvbm5lY3Rpb24uamluZ2xlLmxvY2FsQXVkaW8pO1xuICAgIHNlbGYuY29ubmVjdGlvbi5qaW5nbGUubG9jYWxTdHJlYW1zLnB1c2goc2VsZi5jb25uZWN0aW9uLmppbmdsZS5sb2NhbFZpZGVvKTtcblxuICAgIC8vIENvbmZlcmVuY2UgaXMgbm90IGFjdGl2ZVxuICAgIGlmKCFvbGRTZHAgfHwgIXNlbGYucGVlcmNvbm5lY3Rpb24pIHtcbiAgICAgICAgc3VjY2Vzc19jYWxsYmFjaygpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc2VsZi5wZWVyY29ubmVjdGlvbi5zd2l0Y2hzdHJlYW1zID0gdHJ1ZTtcbiAgICBzZWxmLm1vZGlmeVNvdXJjZXMoZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdtb2RpZnkgc291cmNlcyBkb25lJyk7XG5cbiAgICAgICAgdmFyIG5ld1NkcCA9IG5ldyBTRFAoc2VsZi5wZWVyY29ubmVjdGlvbi5sb2NhbERlc2NyaXB0aW9uLnNkcCk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiU0RQc1wiLCBvbGRTZHAsIG5ld1NkcCk7XG4gICAgICAgIHNlbGYubm90aWZ5TXlTU1JDVXBkYXRlKG9sZFNkcCwgbmV3U2RwKTtcblxuICAgICAgICBzdWNjZXNzX2NhbGxiYWNrKCk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEZpZ3VyZXMgb3V0IGFkZGVkL3JlbW92ZWQgc3NyY3MgYW5kIHNlbmQgdXBkYXRlIElRcy5cbiAqIEBwYXJhbSBvbGRfc2RwIFNEUCBvYmplY3QgZm9yIG9sZCBkZXNjcmlwdGlvbi5cbiAqIEBwYXJhbSBuZXdfc2RwIFNEUCBvYmplY3QgZm9yIG5ldyBkZXNjcmlwdGlvbi5cbiAqL1xuU2Vzc2lvbkJhc2UucHJvdG90eXBlLm5vdGlmeU15U1NSQ1VwZGF0ZSA9IGZ1bmN0aW9uIChvbGRfc2RwLCBuZXdfc2RwKSB7XG5cbiAgICB2YXIgb2xkX21lZGlhID0gb2xkX3NkcC5nZXRNZWRpYVNzcmNNYXAoKTtcbiAgICB2YXIgbmV3X21lZGlhID0gbmV3X3NkcC5nZXRNZWRpYVNzcmNNYXAoKTtcbiAgICAvL2NvbnNvbGUubG9nKFwib2xkL25ldyBtZWRpYXM6IFwiLCBvbGRfbWVkaWEsIG5ld19tZWRpYSk7XG5cbiAgICB2YXIgdG9BZGQgPSBvbGRfc2RwLmdldE5ld01lZGlhKG5ld19zZHApO1xuICAgIHZhciB0b1JlbW92ZSA9IG5ld19zZHAuZ2V0TmV3TWVkaWEob2xkX3NkcCk7XG4gICAgLy9jb25zb2xlLmxvZyhcInRvIGFkZFwiLCB0b0FkZCk7XG4gICAgLy9jb25zb2xlLmxvZyhcInRvIHJlbW92ZVwiLCB0b1JlbW92ZSk7XG4gICAgaWYoT2JqZWN0LmtleXModG9SZW1vdmUpLmxlbmd0aCA+IDApe1xuICAgICAgICB0aGlzLnNlbmRTU1JDVXBkYXRlKHRvUmVtb3ZlLCBudWxsLCBmYWxzZSk7XG4gICAgfVxuICAgIGlmKE9iamVjdC5rZXlzKHRvQWRkKS5sZW5ndGggPiAwKXtcbiAgICAgICAgdGhpcy5zZW5kU1NSQ1VwZGF0ZSh0b0FkZCwgbnVsbCwgdHJ1ZSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBFbXB0eSBtZXRob2QgdGhhdCBkb2VzIG5vdGhpbmcgYnkgZGVmYXVsdC4gSXQgc2hvdWxkIHNlbmQgU1NSQyB1cGRhdGUgSVFzIHRvIHNlc3Npb24gcGFydGljaXBhbnRzLlxuICogQHBhcmFtIHNkcE1lZGlhU3NyY3MgYXJyYXkgb2ZcbiAqIEBwYXJhbSBmcm9tSmlkXG4gKiBAcGFyYW0gaXNBZGRcbiAqL1xuU2Vzc2lvbkJhc2UucHJvdG90eXBlLnNlbmRTU1JDVXBkYXRlID0gZnVuY3Rpb24oc2RwTWVkaWFTc3JjcywgZnJvbUppZCwgaXNBZGQpIHtcbiAgICAvL0ZJWE1FOiBwdXQgZGVmYXVsdCBpbXBsZW1lbnRhdGlvbiBoZXJlKG1heWJlIGZyb20gSmluZ2xlU2Vzc2lvbj8pXG59XG5cbi8qKlxuICogU2VuZHMgU1NSQyB1cGRhdGUgSVEuXG4gKiBAcGFyYW0gc2RwTWVkaWFTc3JjcyBTU1JDcyBtYXAgb2J0YWluZWQgZnJvbSBTRFAuZ2V0TmV3TWVkaWEuIENudGFpbnMgU1NSQ3MgdG8gYWRkL3JlbW92ZS5cbiAqIEBwYXJhbSBzaWQgc2Vzc2lvbiBpZGVudGlmaWVyIHRoYXQgd2lsbCBiZSBwdXQgaW50byB0aGUgSVEuXG4gKiBAcGFyYW0gaW5pdGlhdG9yIGluaXRpYXRvciBpZGVudGlmaWVyLlxuICogQHBhcmFtIHRvSmlkIGRlc3RpbmF0aW9uIEppZFxuICogQHBhcmFtIGlzQWRkIGluZGljYXRlcyBpZiB0aGlzIGlzIHJlbW92ZSBvciBhZGQgb3BlcmF0aW9uLlxuICovXG5TZXNzaW9uQmFzZS5wcm90b3R5cGUuc2VuZFNTUkNVcGRhdGVJcSA9IGZ1bmN0aW9uKHNkcE1lZGlhU3NyY3MsIHNpZCwgaW5pdGlhdG9yLCB0b0ppZCwgaXNBZGQpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbW9kaWZ5ID0gJGlxKHt0bzogdG9KaWQsIHR5cGU6ICdzZXQnfSlcbiAgICAgICAgLmMoJ2ppbmdsZScsIHtcbiAgICAgICAgICAgIHhtbG5zOiAndXJuOnhtcHA6amluZ2xlOjEnLFxuICAgICAgICAgICAgYWN0aW9uOiBpc0FkZCA/ICdzb3VyY2UtYWRkJyA6ICdzb3VyY2UtcmVtb3ZlJyxcbiAgICAgICAgICAgIGluaXRpYXRvcjogaW5pdGlhdG9yLFxuICAgICAgICAgICAgc2lkOiBzaWRcbiAgICAgICAgfVxuICAgICk7XG4gICAgLy8gRklYTUU6IG9ubHkgYW5ub3VuY2UgdmlkZW8gc3NyY3Mgc2luY2Ugd2UgbWl4IGF1ZGlvIGFuZCBkb250IG5lZWRcbiAgICAvLyAgICAgIHRoZSBhdWRpbyBzc3JjcyB0aGVyZWZvcmVcbiAgICB2YXIgbW9kaWZpZWQgPSBmYWxzZTtcbiAgICBPYmplY3Qua2V5cyhzZHBNZWRpYVNzcmNzKS5mb3JFYWNoKGZ1bmN0aW9uKGNoYW5uZWxOdW0pe1xuICAgICAgICBtb2RpZmllZCA9IHRydWU7XG4gICAgICAgIHZhciBjaGFubmVsID0gc2RwTWVkaWFTc3Jjc1tjaGFubmVsTnVtXTtcbiAgICAgICAgbW9kaWZ5LmMoJ2NvbnRlbnQnLCB7bmFtZTogY2hhbm5lbC5tZWRpYVR5cGV9KTtcblxuICAgICAgICBtb2RpZnkuYygnZGVzY3JpcHRpb24nLCB7eG1sbnM6J3Vybjp4bXBwOmppbmdsZTphcHBzOnJ0cDoxJywgbWVkaWE6IGNoYW5uZWwubWVkaWFUeXBlfSk7XG4gICAgICAgIC8vIEZJWE1FOiBub3QgY29tcGxldGx5IHN1cmUgdGhpcyBvcGVyYXRlcyBvbiBibG9ja3MgYW5kIC8gb3IgaGFuZGxlcyBkaWZmZXJlbnQgc3NyY3MgY29ycmVjdGx5XG4gICAgICAgIC8vIGdlbmVyYXRlIHNvdXJjZXMgZnJvbSBsaW5lc1xuICAgICAgICBPYmplY3Qua2V5cyhjaGFubmVsLnNzcmNzKS5mb3JFYWNoKGZ1bmN0aW9uKHNzcmNOdW0pIHtcbiAgICAgICAgICAgIHZhciBtZWRpYVNzcmMgPSBjaGFubmVsLnNzcmNzW3NzcmNOdW1dO1xuICAgICAgICAgICAgbW9kaWZ5LmMoJ3NvdXJjZScsIHsgeG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6c3NtYTowJyB9KTtcbiAgICAgICAgICAgIG1vZGlmeS5hdHRycyh7c3NyYzogbWVkaWFTc3JjLnNzcmN9KTtcbiAgICAgICAgICAgIC8vIGl0ZXJhdGUgb3ZlciBzc3JjIGxpbmVzXG4gICAgICAgICAgICBtZWRpYVNzcmMubGluZXMuZm9yRWFjaChmdW5jdGlvbiAobGluZSkge1xuICAgICAgICAgICAgICAgIHZhciBpZHggPSBsaW5lLmluZGV4T2YoJyAnKTtcbiAgICAgICAgICAgICAgICB2YXIga3YgPSBsaW5lLnN1YnN0cihpZHggKyAxKTtcbiAgICAgICAgICAgICAgICBtb2RpZnkuYygncGFyYW1ldGVyJyk7XG4gICAgICAgICAgICAgICAgaWYgKGt2LmluZGV4T2YoJzonKSA9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBtb2RpZnkuYXR0cnMoeyBuYW1lOiBrdiB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBtb2RpZnkuYXR0cnMoeyBuYW1lOiBrdi5zcGxpdCgnOicsIDIpWzBdIH0pO1xuICAgICAgICAgICAgICAgICAgICBtb2RpZnkuYXR0cnMoeyB2YWx1ZToga3Yuc3BsaXQoJzonLCAyKVsxXSB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbW9kaWZ5LnVwKCk7IC8vIGVuZCBvZiBwYXJhbWV0ZXJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbW9kaWZ5LnVwKCk7IC8vIGVuZCBvZiBzb3VyY2VcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gZ2VuZXJhdGUgc291cmNlIGdyb3VwcyBmcm9tIGxpbmVzXG4gICAgICAgIGNoYW5uZWwuc3NyY0dyb3Vwcy5mb3JFYWNoKGZ1bmN0aW9uKHNzcmNHcm91cCkge1xuICAgICAgICAgICAgaWYgKHNzcmNHcm91cC5zc3Jjcy5sZW5ndGggIT0gMCkge1xuXG4gICAgICAgICAgICAgICAgbW9kaWZ5LmMoJ3NzcmMtZ3JvdXAnLCB7XG4gICAgICAgICAgICAgICAgICAgIHNlbWFudGljczogc3NyY0dyb3VwLnNlbWFudGljcyxcbiAgICAgICAgICAgICAgICAgICAgeG1sbnM6ICd1cm46eG1wcDpqaW5nbGU6YXBwczpydHA6c3NtYTowJ1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgc3NyY0dyb3VwLnNzcmNzLmZvckVhY2goZnVuY3Rpb24gKHNzcmMpIHtcbiAgICAgICAgICAgICAgICAgICAgbW9kaWZ5LmMoJ3NvdXJjZScsIHsgc3NyYzogc3NyYyB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLnVwKCk7IC8vIGVuZCBvZiBzb3VyY2VcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBtb2RpZnkudXAoKTsgLy8gZW5kIG9mIHNzcmMtZ3JvdXBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgbW9kaWZ5LnVwKCk7IC8vIGVuZCBvZiBkZXNjcmlwdGlvblxuICAgICAgICBtb2RpZnkudXAoKTsgLy8gZW5kIG9mIGNvbnRlbnRcbiAgICB9KTtcbiAgICBpZiAobW9kaWZpZWQpIHtcbiAgICAgICAgc2VsZi5jb25uZWN0aW9uLnNlbmRJUShtb2RpZnksXG4gICAgICAgICAgICBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKCdnb3QgbW9kaWZ5IHJlc3VsdCcsIHJlcyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2dvdCBtb2RpZnkgZXJyb3InLCBlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdtb2RpZmljYXRpb24gbm90IG5lY2Vzc2FyeScpO1xuICAgIH1cbn07XG5cbi8vIFNEUC1iYXNlZCBtdXRlIGJ5IGdvaW5nIHJlY3Zvbmx5L3NlbmRyZWN2XG4vLyBGSVhNRTogc2hvdWxkIHByb2JhYmx5IGJsYWNrIG91dCB0aGUgc2NyZWVuIGFzIHdlbGxcblNlc3Npb25CYXNlLnByb3RvdHlwZS50b2dnbGVWaWRlb011dGUgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcblxuICAgIHZhciBpc211dGVkID0gZmFsc2U7XG4gICAgdmFyIGxvY2FsVmlkZW8gPSBjb25uZWN0aW9uLmppbmdsZS5sb2NhbFZpZGVvO1xuICAgIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGxvY2FsVmlkZW8uZ2V0VmlkZW9UcmFja3MoKS5sZW5ndGg7IGlkeCsrKSB7XG4gICAgICAgIGlzbXV0ZWQgPSAhbG9jYWxWaWRlby5nZXRWaWRlb1RyYWNrcygpW2lkeF0uZW5hYmxlZDtcbiAgICB9XG4gICAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgbG9jYWxWaWRlby5nZXRWaWRlb1RyYWNrcygpLmxlbmd0aDsgaWR4KyspIHtcbiAgICAgICAgbG9jYWxWaWRlby5nZXRWaWRlb1RyYWNrcygpW2lkeF0uZW5hYmxlZCA9ICFsb2NhbFZpZGVvLmdldFZpZGVvVHJhY2tzKClbaWR4XS5lbmFibGVkO1xuICAgIH1cblxuICAgIHRoaXMucGVlcmNvbm5lY3Rpb24uaGFyZE11dGVWaWRlbyghaXNtdXRlZCk7XG4gICAgdGhpcy5tb2RpZnlTb3VyY2VzKGNhbGxiYWNrKCFpc211dGVkKSk7XG59O1xuXG5cblNlc3Npb25CYXNlLnByb3RvdHlwZS5vbkljZUNvbm5lY3Rpb25TdGF0ZUNoYW5nZSA9IGZ1bmN0aW9uIChzaWQsIHNlc3Npb24pIHtcbiAgICBzd2l0Y2ggKHNlc3Npb24ucGVlcmNvbm5lY3Rpb24uaWNlQ29ubmVjdGlvblN0YXRlKSB7XG4gICAgICAgIGNhc2UgJ2NoZWNraW5nJzpcbiAgICAgICAgICAgIHNlc3Npb24udGltZUNoZWNraW5nID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcbiAgICAgICAgICAgIHNlc3Npb24uZmlyc3Rjb25uZWN0ID0gdHJ1ZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdjb21wbGV0ZWQnOiAvLyBvbiBjYWxsZXIgc2lkZVxuICAgICAgICBjYXNlICdjb25uZWN0ZWQnOlxuICAgICAgICAgICAgaWYgKHNlc3Npb24uZmlyc3Rjb25uZWN0KSB7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5maXJzdGNvbm5lY3QgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgbWV0YWRhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICBtZXRhZGF0YS5zZXR1cFRpbWUgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpIC0gc2Vzc2lvbi50aW1lQ2hlY2tpbmc7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5wZWVyY29ubmVjdGlvbi5nZXRTdGF0cyhmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5yZXN1bHQoKS5mb3JFYWNoKGZ1bmN0aW9uIChyZXBvcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXBvcnQudHlwZSA9PSAnZ29vZ0NhbmRpZGF0ZVBhaXInICYmIHJlcG9ydC5zdGF0KCdnb29nQWN0aXZlQ29ubmVjdGlvbicpID09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGFkYXRhLmxvY2FsQ2FuZGlkYXRlVHlwZSA9IHJlcG9ydC5zdGF0KCdnb29nTG9jYWxDYW5kaWRhdGVUeXBlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0YWRhdGEucmVtb3RlQ2FuZGlkYXRlVHlwZSA9IHJlcG9ydC5zdGF0KCdnb29nUmVtb3RlQ2FuZGlkYXRlVHlwZScpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbG9nIHBhaXIgYXMgd2VsbCBzbyB3ZSBjYW4gZ2V0IG5pY2UgcGllIGNoYXJ0c1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGFkYXRhLmNhbmRpZGF0ZVBhaXIgPSByZXBvcnQuc3RhdCgnZ29vZ0xvY2FsQ2FuZGlkYXRlVHlwZScpICsgJzsnICsgcmVwb3J0LnN0YXQoJ2dvb2dSZW1vdGVDYW5kaWRhdGVUeXBlJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVwb3J0LnN0YXQoJ2dvb2dSZW1vdGVBZGRyZXNzJykuaW5kZXhPZignWycpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGFkYXRhLmlwdjYgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4vLyAgICAgICAgICAgICAgICAgICAgdHJhY2tVc2FnZSgnaWNlQ29ubmVjdGVkJywgbWV0YWRhdGEpO1xuICAgICAgICAgICAgICAgICAgICByZXF1aXJlKFwiLi4vdXRpbC90cmFja2luZy5qc1wiKSgnaWNlQ29ubmVjdGVkJywgbWV0YWRhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gd2FpdEZvclByZXNlbmNlKGRhdGEsIHNpZCkge1xuICAgICAgICB2YXIgc2VzcyA9IGNvbm5lY3Rpb24uamluZ2xlLnNlc3Npb25zW3NpZF07XG5cbiAgICAgICAgdmFyIHRoZXNzcmM7XG4gICAgICAgIC8vIGxvb2sgdXAgYW4gYXNzb2NpYXRlZCBKSUQgZm9yIGEgc3RyZWFtIGlkXG4gICAgICAgIGlmIChkYXRhLnN0cmVhbS5pZC5pbmRleE9mKCdtaXhlZG1zbGFiZWwnKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIC8vIGxvb2sgb25seSBhdCBhPXNzcmM6IGFuZCBfbm90XyBhdCBhPXNzcmMtZ3JvdXA6IGxpbmVzXG4gICAgICAgICAgICB2YXIgc3NyY2xpbmVzXG4gICAgICAgICAgICAgICAgPSBTRFBVdGlsLmZpbmRfbGluZXMoc2Vzcy5wZWVyY29ubmVjdGlvbi5yZW1vdGVEZXNjcmlwdGlvbi5zZHAsICdhPXNzcmM6Jyk7XG4gICAgICAgICAgICBzc3JjbGluZXMgPSBzc3JjbGluZXMuZmlsdGVyKGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgICAgICAgICAgLy8gTk9URShncCkgcHJldmlvdXNseSB3ZSBmaWx0ZXJlZCBvbiB0aGUgbXNsYWJlbCwgYnV0IHRoYXQgcHJvcGVydHlcbiAgICAgICAgICAgICAgICAvLyBpcyBub3QgYWx3YXlzIHByZXNlbnQuXG4gICAgICAgICAgICAgICAgLy8gcmV0dXJuIGxpbmUuaW5kZXhPZignbXNsYWJlbDonICsgZGF0YS5zdHJlYW0ubGFiZWwpICE9PSAtMTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGluZS5pbmRleE9mKCdtc2lkOicgKyBkYXRhLnN0cmVhbS5pZCkgIT09IC0xO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoc3NyY2xpbmVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoZXNzcmMgPSBzc3JjbGluZXNbMF0uc3Vic3RyaW5nKDcpLnNwbGl0KCcgJylbMF07XG5cbiAgICAgICAgICAgICAgICAvLyBXZSBzaWduYWwgb3VyIHN0cmVhbXMgKHRocm91Z2ggSmluZ2xlIHRvIHRoZSBmb2N1cykgYmVmb3JlIHdlIHNldFxuICAgICAgICAgICAgICAgIC8vIG91ciBwcmVzZW5jZSAodGhyb3VnaCB3aGljaCBwZWVycyBhc3NvY2lhdGUgcmVtb3RlIHN0cmVhbXMgdG9cbiAgICAgICAgICAgICAgICAvLyBqaWRzKS4gU28sIGl0IG1pZ2h0IGFycml2ZSB0aGF0IGEgcmVtb3RlIHN0cmVhbSBpcyBhZGRlZCBidXRcbiAgICAgICAgICAgICAgICAvLyBzc3JjMmppZCBpcyBub3QgeWV0IHVwZGF0ZWQgYW5kIHRodXMgZGF0YS5wZWVyamlkIGNhbm5vdCBiZVxuICAgICAgICAgICAgICAgIC8vIHN1Y2Nlc3NmdWxseSBzZXQuIEhlcmUgd2Ugd2FpdCBmb3IgdXAgdG8gYSBzZWNvbmQgZm9yIHRoZVxuICAgICAgICAgICAgICAgIC8vIHByZXNlbmNlIHRvIGFycml2ZS5cblxuICAgICAgICAgICAgICAgIGlmICghc3NyYzJqaWRbdGhlc3NyY10pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVE9ETyhncCkgbGltaXQgd2FpdCBkdXJhdGlvbiB0byAxIHNlYy5cbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbihkLCBzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2FpdEZvclByZXNlbmNlKGQsIHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KGRhdGEsIHNpZCksIDI1MCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBvayB0byBvdmVyd3JpdGUgdGhlIG9uZSBmcm9tIGZvY3VzPyBtaWdodCBzYXZlIHdvcmsgaW4gY29saWJyaS5qc1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdhc3NvY2lhdGVkIGppZCcsIHNzcmMyamlkW3RoZXNzcmNdLCBkYXRhLnBlZXJqaWQpO1xuICAgICAgICAgICAgICAgIGlmIChzc3JjMmppZFt0aGVzc3JjXSkge1xuICAgICAgICAgICAgICAgICAgICBkYXRhLnBlZXJqaWQgPSBzc3JjMmppZFt0aGVzc3JjXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaXNWaWRlbyA9IGRhdGEuc3RyZWFtLmdldFZpZGVvVHJhY2tzKCkubGVuZ3RoID4gMDtcblxuICAgICAgICBSVENBY3RpdmF0b3IuZ2V0UlRDU2VydmljZSgpLmNyZWF0ZVJlbW90ZVN0cmVhbShkYXRhLCBzaWQsIHRoZXNzcmMpO1xuXG4gICAgICAgIC8vIGFuIGF0dGVtcHQgdG8gd29yayBhcm91bmQgaHR0cHM6Ly9naXRodWIuY29tL2ppdHNpL2ppdG1lZXQvaXNzdWVzLzMyXG4gICAgICAgIGlmIChpc1ZpZGVvICYmXG4gICAgICAgICAgICBkYXRhLnBlZXJqaWQgJiYgc2Vzcy5wZWVyamlkID09PSBkYXRhLnBlZXJqaWQgJiZcbiAgICAgICAgICAgIGRhdGEuc3RyZWFtLmdldFZpZGVvVHJhY2tzKCkubGVuZ3RoID09PSAwICYmXG4gICAgICAgICAgICBjb25uZWN0aW9uLmppbmdsZS5sb2NhbFZpZGVvLmdldFZpZGVvVHJhY2tzKCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzZW5kS2V5ZnJhbWUoc2Vzcy5wZWVyY29ubmVjdGlvbik7XG4gICAgICAgICAgICB9LCAzMDAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8gYW4gYXR0ZW1wdCB0byB3b3JrIGFyb3VuZCBodHRwczovL2dpdGh1Yi5jb20vaml0c2kvaml0bWVldC9pc3N1ZXMvMzJcbiAgICBmdW5jdGlvbiBzZW5kS2V5ZnJhbWUocGMpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3NlbmRrZXlmcmFtZScsIHBjLmljZUNvbm5lY3Rpb25TdGF0ZSk7XG4gICAgICAgIGlmIChwYy5pY2VDb25uZWN0aW9uU3RhdGUgIT09ICdjb25uZWN0ZWQnKSByZXR1cm47IC8vIHNhZmUuLi5cbiAgICAgICAgcGMuc2V0UmVtb3RlRGVzY3JpcHRpb24oXG4gICAgICAgICAgICBwYy5yZW1vdGVEZXNjcmlwdGlvbixcbiAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBwYy5jcmVhdGVBbnN3ZXIoXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChtb2RpZmllZEFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGMuc2V0TG9jYWxEZXNjcmlwdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2RpZmllZEFuc3dlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5vb3BcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndHJpZ2dlcktleWZyYW1lIHNldExvY2FsRGVzY3JpcHRpb24gZmFpbGVkJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5zaG93RXJyb3IoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0cmlnZ2VyS2V5ZnJhbWUgY3JlYXRlQW5zd2VyIGZhaWxlZCcsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VIYW5kbGVyLnNob3dFcnJvcigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndHJpZ2dlcktleWZyYW1lIHNldFJlbW90ZURlc2NyaXB0aW9uIGZhaWxlZCcsIGVycm9yKTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5zaG93RXJyb3IoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG59XG5cblxuU2Vzc2lvbkJhc2UucHJvdG90eXBlLndhaXRGb3JQcmVzZW5jZSA9IGZ1bmN0aW9uIChkYXRhLCBzaWQpIHtcbiAgICB2YXIgc2VzcyA9IGNvbm5lY3Rpb24uamluZ2xlLnNlc3Npb25zW3NpZF07XG5cbiAgICB2YXIgdGhlc3NyYztcbiAgICAvLyBsb29rIHVwIGFuIGFzc29jaWF0ZWQgSklEIGZvciBhIHN0cmVhbSBpZFxuICAgIGlmIChkYXRhLnN0cmVhbS5pZC5pbmRleE9mKCdtaXhlZG1zbGFiZWwnKSA9PT0gLTEpIHtcbiAgICAgICAgLy8gbG9vayBvbmx5IGF0IGE9c3NyYzogYW5kIF9ub3RfIGF0IGE9c3NyYy1ncm91cDogbGluZXNcbiAgICAgICAgdmFyIHNzcmNsaW5lc1xuICAgICAgICAgICAgPSBTRFBVdGlsLmZpbmRfbGluZXMoc2Vzcy5wZWVyY29ubmVjdGlvbi5yZW1vdGVEZXNjcmlwdGlvbi5zZHAsICdhPXNzcmM6Jyk7XG4gICAgICAgIHNzcmNsaW5lcyA9IHNzcmNsaW5lcy5maWx0ZXIoZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgICAgIC8vIE5PVEUoZ3ApIHByZXZpb3VzbHkgd2UgZmlsdGVyZWQgb24gdGhlIG1zbGFiZWwsIGJ1dCB0aGF0IHByb3BlcnR5XG4gICAgICAgICAgICAvLyBpcyBub3QgYWx3YXlzIHByZXNlbnQuXG4gICAgICAgICAgICAvLyByZXR1cm4gbGluZS5pbmRleE9mKCdtc2xhYmVsOicgKyBkYXRhLnN0cmVhbS5sYWJlbCkgIT09IC0xO1xuICAgICAgICAgICAgcmV0dXJuIGxpbmUuaW5kZXhPZignbXNpZDonICsgZGF0YS5zdHJlYW0uaWQpICE9PSAtMTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChzc3JjbGluZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGVzc3JjID0gc3NyY2xpbmVzWzBdLnN1YnN0cmluZyg3KS5zcGxpdCgnICcpWzBdO1xuXG4gICAgICAgICAgICAvLyBXZSBzaWduYWwgb3VyIHN0cmVhbXMgKHRocm91Z2ggSmluZ2xlIHRvIHRoZSBmb2N1cykgYmVmb3JlIHdlIHNldFxuICAgICAgICAgICAgLy8gb3VyIHByZXNlbmNlICh0aHJvdWdoIHdoaWNoIHBlZXJzIGFzc29jaWF0ZSByZW1vdGUgc3RyZWFtcyB0b1xuICAgICAgICAgICAgLy8gamlkcykuIFNvLCBpdCBtaWdodCBhcnJpdmUgdGhhdCBhIHJlbW90ZSBzdHJlYW0gaXMgYWRkZWQgYnV0XG4gICAgICAgICAgICAvLyBzc3JjMmppZCBpcyBub3QgeWV0IHVwZGF0ZWQgYW5kIHRodXMgZGF0YS5wZWVyamlkIGNhbm5vdCBiZVxuICAgICAgICAgICAgLy8gc3VjY2Vzc2Z1bGx5IHNldC4gSGVyZSB3ZSB3YWl0IGZvciB1cCB0byBhIHNlY29uZCBmb3IgdGhlXG4gICAgICAgICAgICAvLyBwcmVzZW5jZSB0byBhcnJpdmUuXG5cbiAgICAgICAgICAgIGlmICghc3NyYzJqaWRbdGhlc3NyY10pIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPKGdwKSBsaW1pdCB3YWl0IGR1cmF0aW9uIHRvIDEgc2VjLlxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oZCwgcykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3YWl0Rm9yUHJlc2VuY2UoZCwgcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KGRhdGEsIHNpZCksIDI1MCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBvayB0byBvdmVyd3JpdGUgdGhlIG9uZSBmcm9tIGZvY3VzPyBtaWdodCBzYXZlIHdvcmsgaW4gY29saWJyaS5qc1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2Fzc29jaWF0ZWQgamlkJywgc3NyYzJqaWRbdGhlc3NyY10sIGRhdGEucGVlcmppZCk7XG4gICAgICAgICAgICBpZiAoc3NyYzJqaWRbdGhlc3NyY10pIHtcbiAgICAgICAgICAgICAgICBkYXRhLnBlZXJqaWQgPSBzc3JjMmppZFt0aGVzc3JjXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBpc1ZpZGVvID0gZGF0YS5zdHJlYW0uZ2V0VmlkZW9UcmFja3MoKS5sZW5ndGggPiAwO1xuXG5cbiAgICAvLyBUT0RPIHRoaXMgbXVzdCBiZSBkb25lIHdpdGggbGlzdGVuZXJzXG4gICAgUlRDQWN0aXZhdG9yLmdldFJUQ1NlcnZpY2UoKS5jcmVhdGVSZW1vdGVTdHJlYW0oZGF0YSwgc2lkLCB0aGVzc3JjKTtcblxuICAgIC8vIGFuIGF0dGVtcHQgdG8gd29yayBhcm91bmQgaHR0cHM6Ly9naXRodWIuY29tL2ppdHNpL2ppdG1lZXQvaXNzdWVzLzMyXG4gICAgaWYgKGlzVmlkZW8gJiZcbiAgICAgICAgZGF0YS5wZWVyamlkICYmIHNlc3MucGVlcmppZCA9PT0gZGF0YS5wZWVyamlkICYmXG4gICAgICAgIGRhdGEuc3RyZWFtLmdldFZpZGVvVHJhY2tzKCkubGVuZ3RoID09PSAwICYmXG4gICAgICAgIGNvbm5lY3Rpb24uamluZ2xlLmxvY2FsVmlkZW8uZ2V0VmlkZW9UcmFja3MoKS5sZW5ndGggPiAwKSB7XG4gICAgICAgIC8vXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbmRLZXlmcmFtZShzZXNzLnBlZXJjb25uZWN0aW9uKTtcbiAgICAgICAgfSwgMzAwMCk7XG4gICAgfVxufVxuXG4vLyBhbiBhdHRlbXB0IHRvIHdvcmsgYXJvdW5kIGh0dHBzOi8vZ2l0aHViLmNvbS9qaXRzaS9qaXRtZWV0L2lzc3Vlcy8zMlxuZnVuY3Rpb24gc2VuZEtleWZyYW1lKHBjKSB7XG4gICAgY29uc29sZS5sb2coJ3NlbmRrZXlmcmFtZScsIHBjLmljZUNvbm5lY3Rpb25TdGF0ZSk7XG4gICAgaWYgKHBjLmljZUNvbm5lY3Rpb25TdGF0ZSAhPT0gJ2Nvbm5lY3RlZCcpIHJldHVybjsgLy8gc2FmZS4uLlxuICAgIHBjLnNldFJlbW90ZURlc2NyaXB0aW9uKFxuICAgICAgICBwYy5yZW1vdGVEZXNjcmlwdGlvbixcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcGMuY3JlYXRlQW5zd2VyKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChtb2RpZmllZEFuc3dlcikge1xuICAgICAgICAgICAgICAgICAgICBwYy5zZXRMb2NhbERlc2NyaXB0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kaWZpZWRBbnN3ZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm9vcFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0cmlnZ2VyS2V5ZnJhbWUgc2V0TG9jYWxEZXNjcmlwdGlvbiBmYWlsZWQnLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIuc2hvd0Vycm9yKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3RyaWdnZXJLZXlmcmFtZSBjcmVhdGVBbnN3ZXIgZmFpbGVkJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlSGFuZGxlci5zaG93RXJyb3IoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0cmlnZ2VyS2V5ZnJhbWUgc2V0UmVtb3RlRGVzY3JpcHRpb24gZmFpbGVkJywgZXJyb3IpO1xuICAgICAgICAgICAgbWVzc2FnZUhhbmRsZXIuc2hvd0Vycm9yKCk7XG4gICAgICAgIH1cbiAgICApO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gU2Vzc2lvbkJhc2U7IiwiLyoqXG4gKiBTdHJvcGhlIGxvZ2dlciBpbXBsZW1lbnRhdGlvbi4gTG9ncyBmcm9tIGxldmVsIFdBUk4gYW5kIGFib3ZlLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIFN0cm9waGUubG9nID0gZnVuY3Rpb24gKGxldmVsLCBtc2cpIHtcbiAgICAgICAgc3dpdGNoIChsZXZlbCkge1xuICAgICAgICAgICAgY2FzZSBTdHJvcGhlLkxvZ0xldmVsLldBUk46XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiU3Ryb3BoZTogXCIgKyBtc2cpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTdHJvcGhlLkxvZ0xldmVsLkVSUk9SOlxuICAgICAgICAgICAgY2FzZSBTdHJvcGhlLkxvZ0xldmVsLkZBVEFMOlxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJTdHJvcGhlOiBcIiArIG1zZyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9O1xufTtcblxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIl19
