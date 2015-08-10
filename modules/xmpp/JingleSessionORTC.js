/* global $ */
var JingleSession = require('./JingleSession');
var Constants = require("../../service/xmpp/JingleConstants");

var j =JSON.stringify;
function JingleSessionORTC(me, sid, connection, service, eventEmitter) {
    JingleSession.call(this, me, sid, connection, service, eventEmitter);
    //this.state = null;
    this.audioRtpSenders = [];
    this.videoRtpSenders = [];
    log=[];
    J=this;
    this.ssrcOwners = {};
    this.ssrcVideoTypes = {};
    this.ssrcMediaTypes = {};
    this.ssrcReceivers = {};


}
JingleSessionORTC.prototype = JingleSession.prototype;
JingleSessionORTC.prototype.constructor = JingleSessionORTC;

/**
 * Returns a random integer between min (included) and max (excluded)
 * Using Math.round() gives a non-uniform distribution!
 * @returns {number}
 */
function generateSSRC() {
    var min = 0, max = 0xffffffff;
    return Math.floor(Math.random() * (max - min)) + min;
};

// RTCRtpParameters
var utilRTCRtpParameters = function (inMuxId, inCodecs, inHeaderExtensions, inEncodings, inRtcp) {
    return {
        muxId: inMuxId || "",
        codecs: inCodecs,
        headerExtensions: inHeaderExtensions,
        encodings: inEncodings,
        rtcp: inRtcp
    };
};
// RTCRtcpParameters
var utilRTCRtcpParameters = function (inSsrc, inCname, inReducecdSize, inMux) {
    return {
        ssrc: inSsrc,
        cname: inCname,
        reducedSize: inReducecdSize,
        mux: inMux
    };
};
var utilfilterHdrExtParams = function (left, right) {

    var hdrExtPrms = [];

    if (left && right) {

        left.forEach(function (leftItem) {

            for (var i = 0; i < right.length; i++) {

                var enc = right[i];
                if (leftItem.kind === enc.kind && leftItem.uri === enc.uri) {

                    //hdrExtPrms.push(util.RTCRtpEncodingParameters(enc.uri, enc.preferredId, enc.preferredEncrypt));
                    break;
                }

            }
        });
    }

    return hdrExtPrms;
};

utilRTCRtpCodecParameters = function (inName, inPayloadType, inClockRate, inNumChannels, inRtcpFeedback, inParameters) {
    return {
        name: inName,
        payloadType: inPayloadType,
        clockRate: inClockRate,
        numChannels: inNumChannels,
        rtcpFeedback: inRtcpFeedback,
        parameters: inParameters
    };
};



var utilfilterCodecParams = function (left, right) {

    var codecPrms = [];

    if (left && right) {

        left.forEach(function (leftItem) {

            for (var i = 0; i < right.length; i++) {

                var codec = right[i];
                if (leftItem.name == codec.name && leftItem.kind === codec.kind &&
                    leftItem.preferredPayloadType === codec.preferredPayloadType &&
                    leftItem.numChannels === codec.numChannels) {

                    codecPrms.push(utilRTCRtpCodecParameters(codec.name, codec.preferredPayloadType,
                        codec.clockRate, codec.numChannels, codec.rtcpFeedback, codec.parameters));

                    break;
                }

            }
        });
    }

    return codecPrms;
};
var utilRTCRtpEncodingParameters = function (inSsrc, inCodecPayloadType, inFec, inRtx, inPriority, inMaxBitRate, inMinQuality, inFramerateBias, inResolutionScale, inFramerateScale, inQualityScale, inActive, inEncodingId, inDependencyEncodingIds) {
    return {
        ssrc: inSsrc,
        codecPayloadType: inCodecPayloadType,
        fec: inFec,
        rtx: inRtx,
        priority: inPriority || 1.0,
        maxBitrate: inMaxBitRate || 2000000.0,
        minQuality: inMinQuality || 0,
        framerateBias: inFramerateBias || 0.5,
        resolutionScale: inResolutionScale || 1.0,
        framerateScale: inFramerateScale || 1.0,
        active: inActive || true,
        encodingId: inEncodingId,
        dependencyEncodingId: inDependencyEncodingIds
    };
};




var myCapsToSendParams = function (sendCaps, remoteRecvCaps) {

    if (!sendCaps || !remoteRecvCaps) { return; }

    // compute intersection of both.
    return utilRTCRtpParameters("", utilfilterCodecParams(sendCaps.codecs, remoteRecvCaps.codecs),
        utilfilterHdrExtParams(sendCaps.headerExtensions, remoteRecvCaps.headerExtensions), [],
        utilRTCRtcpParameters(0, "", false, true));
};




// Adds the ICE candidates found in the 'contents' array as remote candidates (?)
// Note: currently only used on transport-info
JingleSessionORTC.prototype.addIceCandidates = function(contents) {};

/**
 * Handles an 'add-source' event.
 *
 * @param contents an array of Jingle 'content' elements.
 */
JingleSessionORTC.prototype.addSource = function(contents) {
    console.log('add source', contents);
    this.readSsrcInfo($(contents).find(">content"));
    this.addSource2(contents);
};

JingleSessionORTC.prototype.addSource2 = function(jingle) {
    var self = this;
    var remoteVideoSsrc = $(jingle).find('content[name=video]').find('source').attr('ssrc');
    var remoteAudioSsrc = $(jingle).find('content[name=audio]').find('source').attr('ssrc');


    if (typeof remoteAudioSsrc == 'undefined' && $(jingle)[0])
        remoteAudioSsrc = $($(jingle)[0]).find('source').attr('ssrc');
    if (typeof remoteVideoSsrc == 'undefined' && $(jingle)[1])
        remoteVideoSsrc = $($(jingle)[1]).find('source').attr('ssrc');

    console.log("Remote ssrcs: "+ remoteAudioSsrc+ " "+remoteVideoSsrc);

    if (! remoteAudioSsrc && !remoteVideoSsrc)
        return;
    if (typeof remoteAudioSsrc == 'string')
        remoteAudioSsrc = Number(remoteAudioSsrc);
    if (typeof remoteVideoSsrc == 'string')
        remoteVideoSsrc = Number(remoteVideoSsrc);
    console.log("Remote ssrcs2: "+ remoteAudioSsrc+ " "+remoteVideoSsrc);

    /*
    if (typeof remoteAudioSsrc == 'undefined')
    debugger;
    else console.log("Remove audio ssrc: "+remoteAudioSsrc);
    */

    if (this.ssrcReceivers[remoteAudioSsrc] || this.ssrcReceivers[remoteVideoSsrc]) {
        console.log('duplicate add source? ', remoteAudioSsrc, '   '+remoteVideoSsrc);
        return;
    }

    var audioReceiverParameters = {
        "muxId": null, "codecs": [
            {
                "name": "SILK",
                "payloadType": 104,
                "clockRate": 16000,
                "numChannels": 1,
                "rtcpFeedback": [{
                    "type": "x-message",
                    "parameter": "app send:dsh recv:dsh"
                }],
                "parameters": {}
            }
            , {
                "name": "G722",
                "payloadType": 9,
                "clockRate": 8000,
                "numChannels": 1,
                "rtcpFeedback": [{
                    "type": "x-message",
                    "parameter": "app send:dsh recv:dsh"
                }],
                "parameters": {}
            }
            , {
                "name": "OPUS",
                "payloadType": 106,
                "clockRate": 16000,
                "numChannels": 1,
                "rtcpFeedback": [{
                    "type": "x-message",
                    "parameter": "app send:dsh recv:dsh"
                }],
                "parameters": {}
            }
            , {
                "name": "PCMU",
                "payloadType": 0,
                "clockRate": 8000,
                "numChannels": 1,
                "rtcpFeedback": [{
                    "type": "x-message",
                    "parameter": "app send:dsh recv:dsh"
                }],
                "parameters": {}
            }
            , {
                "name": "SILK",
                "payloadType": 103,
                "clockRate": 8000,
                "numChannels": 1,
                "rtcpFeedback": [{
                    "type": "x-message",
                    "parameter": "app send:dsh recv:dsh"
                }],
                "parameters": {}
            }
            , {
                "name": "PCMA",
                "payloadType": 8,
                "clockRate": 8000,
                "numChannels": 1,
                "rtcpFeedback": [{
                    "type": "x-message",
                    "parameter": "app send:dsh recv:dsh"
                }],
                "parameters": {}
            },
            {
                "name": "RED",
                "payloadType": 97,
                "clockRate": 8000,
                "numChannels": 1,
                "rtcpFeedback": [],
                "parameters": {}
            },
            {
                "name": "CN",
                "payloadType": 118,
                "clockRate": 16000,
                "numChannels": 1,
                "rtcpFeedback": [],
                "parameters": {}
            }
            , {
                "name": "telephone-event",
                "payloadType": 101,
                "clockRate": 8000,
                "numChannels": 1,
                "rtcpFeedback": [],
                "parameters": {"events": "0-16"}
            }]
        , "headerExtensions": [],
        "encodings": [{
            "ssrc": remoteAudioSsrc,
            "codecPayloadType": 0,
            "fec": 0,
            "rtx": 0,
            "priority": 1,
            "maxBitrate": 2000000,
            "minQuality": 0,
            "framerateBias": 0.5,
            "resolutionScale": 1,
            "framerateScale": 1,
            "active": true
        }],
        "rtcp": {
            "ssrc": this.localAudioSSRC,
            "cname": "",
            "reducedSize": false,
            "mux": true
        }
    };

    var videoReceiverParameters = {
        "muxId": null,
        "codecs": [{
            "name": "X-H264UC",
            "payloadType": 122,
            "clockRate": 90000,
            "numChannels": 1,
            "rtcpFeedback": [{
                "type": "x-message",
                "parameter": "app send:src,x-pli recv:src,x-pli"
            }],
            "parameters": {"packetization-mode": "1", "mst-mode": "NI-TC"}
        }
            , {
                "name": "x-ulpfecuc",
                "payloadType": 123,
                "clockRate": 90000,
                "numChannels": 1,
                "rtcpFeedback": [],
                "parameters": {}
            }
        ],
        "headerExtensions": [],
        "encodings": [{
            "ssrc": remoteVideoSsrc,
            "codecPayloadType": 0,
            "fec": 0,
            "rtx": 0,
            "priority": 1,
            "maxBitrate": 2000000,
            "minQuality": 0,
            "framerateBias": 0.5,
            "resolutionScale": 1,
            "framerateScale": 1,
            "active": true
        }
        ],
        "rtcp": {
            "ssrc": this.localVideoSSRC,
            "cname": "",
            "reducedSize": false,
            "mux": true
        }
    };

    var videoReceiver, audioReceiver;
    if (remoteVideoSsrc)
        videoReceiver = this.addReceiver('video', remoteVideoSsrc, videoReceiverParameters);
    if (remoteAudioSsrc)
        audioReceiver = this.addReceiver('audio', remoteVideoSsrc, audioReceiverParameters);


    if (remoteVideoSsrc) {
        console.log("receive video ", videoReceiverParameters);
        log.push("Starting video receiver, params=" + j(videoReceiverParameters));
        videoReceiver.receive(videoReceiverParameters);
        console.log("receive video done ");
    }

    if (remoteAudioSsrc) {
        console.log("receive audio ", audioReceiverParameters);
        log.push("Starting audio receiver, params=" + j(audioReceiverParameters));
        audioReceiver.receive(audioReceiverParameters);
        console.log("receive audio done ");
    }



};
JingleSessionORTC.prototype.doDtls = function(jingle) {

    var self=this;
    if (self.dtlsTransport.state == 'new') {
        var fps = [];
        $(jingle).find(">content>transport>fingerprint").each(function () {
            if (fps.length == 0)
                fps.push({
                    algorithm: this.getAttribute('hash'),
                    value: this.textContent
                });
        });
        if (fps.length == 0)
            $($(jingle)[0]).find('>transport>fingerprint').each(function () {

                if (fps.length == 0)
                    fps.push({
                        algorithm: this.getAttribute('hash'),
                        value: this.textContent
                    });
            });
        var remoteParams = {
            role: "server",
            fingerprints: fps
        };
        console.log("ortc start DTLS fps=", fps);
        log.push("Starting DtlsTransport, remoteParams=" + j(remoteParams));
        log.push("dtlsLocalParamaters: " + j(self.dtlsTransport.getLocalParameters()));
        self.dtlsTransport.start(remoteParams);
        console.log("ortc start DTLS done");
    }
}

/**
 * Handles a 'remove-source' event.
 *
 * @param contents an array of Jingle 'content' elements.
 */
JingleSessionORTC.prototype.removeSource = function(contents) {};

/**
 * Terminates this Jingle session (stops sending media and closes the streams?)
 */
JingleSessionORTC.prototype.terminate = function() {};

/**
 * Sends a Jingle session-terminate message to the peer and terminates the
 * session.
 * @param reason
 * @param text
 */
JingleSessionORTC.prototype.sendTerminate = function(reason, text) {};

/**
 * Handles an offer from the focus (prepares to accept a session).
 * @param jingle the 'jingle' XML element.
 */
JingleSessionORTC.prototype.setOffer = function(jingle) {
    var self = this;
    this.readSsrcInfo($(jingle).find(">content"));

    console.log('ortc offer: ', jingle);
    var candidates = [];
    var content = $(jingle).find(">content[name='audio']");
    $(content).find(">transport>candidate").each(function () {

        var cand = {
            foundation: this.getAttribute('foundation'),
            priority: this.getAttribute('priority'),
            ip: this.getAttribute('ip'),
            protocol: this.getAttribute('protocol'),
            port: this.getAttribute('port'),
            type: this.getAttribute('type')
            //tcpType: this.getAttribute('protocol'),
            //relatedAddress: this.getAttribute('protocol'),
            //relatedPort: this.getAttribute('protocol'),
        };
        if (this.getAttribute('protocol') == 'tcp'
            || this.getAttribute('protocol') == 'ssltcp')
            return;
        console.log('ortc adding remote cand ', cand);

        //self.iceTransport.addRemoteCandidate(cand);
        candidates.push(cand);
    });

    //var RTCIceCandidateComplete = {};
    //self.iceTransport.addRemoteCandidate({}); // indicate that we have all the candidates
    log.push("Set remote candidates. "+j(candidates));
    self.iceTransport.setRemoteCandidates(candidates);


    var icestarted = false;
    $(jingle).find(">content>transport").each(function () {
        if (icestarted)
            return;
        var ufrag = this.getAttribute('ufrag');
        var pwd = this.getAttribute('pwd');

        var remoteParameters = {"usernameFragment": ufrag, password: pwd};

        console.log("ortc start ICE transport (remote ice parameters: "
            , remoteParameters);

        console.log('local ice params: ',self.iceGatherer.getLocalParameters());
        log.push('Start ICE, local params: '+j(self.iceGatherer.getLocalParameters())+ "   remote params: "+j(remoteParameters));
        self.iceTransport.start(self.iceGatherer, remoteParameters, 'controlled');
        icestarted = true;
    });



    this.doDtls(jingle);

    self.addSource2(jingle);

    this.sendAnswer();
};

JingleSessionORTC.prototype.addReceiver = function (type, ssrc, params) {

    log.push("New RTCRtpReceiver type="+type+" ssrc="+ssrc);
    var receiver = new RTCRtpReceiver(this.dtlsTransport, type);
    receiver.onerror=function(e){
        log.push("Receiver error (type="+type+" ssrc="+ssrc+") "+ j(e));
        console.log('video receiver error: ', e);};

    console.log('ortc starting receiver  '+type+' '+params);

    var remoteStream = new MediaStream();
    remoteStream.addTrack(receiver.track);
    this.remoteStreamAdded(remoteStream, ssrc);
    this.ssrcReceivers[ssrc] = receiver;
    return receiver;


};

/**
 * Handles an answer from the remote peer (prepares to accept a session).
 * @param jingle the 'jingle' XML element.
 */
JingleSessionORTC.prototype.setAnswer = function(jingle) {};




JingleSessionORTC.prototype.initiate=function(peerjid, isInitiator){
    this.localAudioSSRC = generateSSRC();
    this.localVideoSSRC = generateSSRC();
    console.log("ortc initiate1 ", APP.RTC.localStreams);
    var self = this;
    //if (this.state !== null) {
    //    console.error('attempt to initiate on session ' + this.sid +
    //    'in state ' + this.state);
    //    return;
    //}
    this.state = 'pending';
    this.initiator = isInitiator ? this.me : peerjid;
    this.responder = !isInitiator ? this.me : peerjid;
    this.peerjid = peerjid;

    console.log("ortc initiate2 ", APP.RTC.localStreams);
    //this.iceGatherer = new RTCIceGatherer({gatherPolicy:"all", "iceServers":[{ "urls": "msturn:91.190.218.71:3478?transport=udp", "username": "AgAAJBuV2+AB0S43IeDTQi1Wli7CBArAT76N57AgZT8AAAAAP5seYznklCPdgGXDhLvQ+SUMios=", "credential": "DaS0lLaHufzf3kJMErPVJvKROMc=" }]});
    var iceServers = [];
       // [{ urls: 'turn:numb.viagenie.ca',
      //  credential: 'muazkh',
       // username: 'webrtc@live.com'}];
    log.push("New RTCIceGatherer iceServers="+JSON.stringify(iceServers));
    this.iceGatherer = new RTCIceGatherer({gatherPolicy:"all", iceServers:iceServers});

    //this.iceGatherer = new RTCIceGatherer({gatherPolicy:"all", "iceServers":[]});
    this.iceGatherer.onlocalcandidate = function(c){log.push("onlocalcandidate: "+ j(c)); console.log("ORTC Respectfully ignoring a local candidate: ", c);};
    this.iceTransport = new RTCIceTransport();
    log.push("New RTCIceTransport state="+j(this.iceTransport.state));
    this.iceTransport.onicestatechange = function(ignore){
        log.push("Ice state change: "+j(self.iceTransport.state));
        console.log('ORTC ice state change new state: ', self.iceTransport.state);
    };
    console.log("ortc initiate3 ", APP.RTC.localStreams);
    log.push("New DtlsTransport");
    this.dtlsTransport = new RTCDtlsTransport(this.iceTransport);
    this.dtlsTransport.ondtlsstatechange = function(evt){
        console.log('New DTLS state '+self.dtlsTransport.state);
    }
    this.iceGatherer.onerror = function(e){
        log.push("iceGatherer.onerror "+ j(e));
        console.log("ORTC iceGatherer.onerror ", e)};
    this.dtlsTransport.onerror = function(e) {
        console.log("ORTC dtlsTransport.onerror ", e);
        log.push("dtlsGatherer.onerror " + j(e));
    };

    console.log("ortc initiate4 ", APP.RTC.localStreams);
    APP.RTC.localStreams.forEach(function(stream) {
        self.addStream(stream);
    });
};

JingleSessionORTC.prototype.addStream = function(stream) {
    console.log("add stream, " ,stream);

    var self = this;
    stream.getTracks().forEach(function(track){
        log.push("New RTCRtpSender type="+stream.type+" track="+j(track));
        var rtpSender = new RTCRtpSender(track, self.dtlsTransport);

        if (stream.type == 'audio')
            self.audioRtpSenders.push(rtpSender);
        else
            self.videoRtpSenders.push(rtpSender);
        //console.log(rtpSender.getCapabilities(track.kind));
    });
};


JingleSessionORTC.prototype.readSsrcInfo = function (contents) {
    var self = this;
    $(contents).each(function (idx, content) {
        var name = $(content).attr('name');
        var mediaType = this.getAttribute('name');
        var ssrcs = $(content).find('description>source[xmlns="urn:xmpp:jingle:apps:rtp:ssma:0"]');
        ssrcs.each(function () {
            var ssrc = this.getAttribute('ssrc');
            $(this).find('>ssrc-info[xmlns="http://jitsi.org/jitmeet"]').each(
                function () {
                    var owner = this.getAttribute('owner');
                    var videoType = this.getAttribute('video-type');
                    self.ssrcOwners[ssrc] = owner;
                    self.ssrcVideoTypes[ssrc] = videoType;
                    self.ssrcMediaTypes[ssrc] = mediaType;
                }
            );
        });
    });
};


JingleSessionORTC.prototype.getSsrcOwner = function (ssrc) {
    return this.ssrcOwners[ssrc];
};


JingleSessionORTC.prototype.remoteStreamAdded = function(stream, thessrc) {
    var streamId = APP.RTC.getStreamID(stream);

    // look up an associated JID for a stream id
    if (!streamId) {
        console.error("No stream ID for", stream);
    }

    var data = {
        stream: stream,
        peerjid: this.ssrcOwners[thessrc],
        videoType: 'video'
    };

    APP.RTC.createRemoteStream(data, this.sid, thessrc);
};

JingleSessionORTC.prototype.sendAnswer = function(){

    var accept = $iq({to: this.peerjid,
        type: 'set'})
        .c('jingle', {xmlns: Constants.XMLNS_JINGLE,
            action: 'session-accept',
            initiator: this.initiator,
            responder: this.responder,
            sid: this.sid });

    //
//<iq to='test@meet.jit.si/focus' type='set' xmlns='jabber:client'>
//<jingle xmlns='urn:xmpp:jingle:1' action='session-accept' initiator='test@meet.jit.si/focus' responder='3bedd46b-282b-458e-8a22-9390c45907a4@guest.jit.si/f8bdd081-a378-4eb4-9734-5efd170f8fbe' sid='64vi51atpgkoe'>
//<group xmlns='urn:xmpp:jingle:apps:grouping:0' semantics='BUNDLE'>
//<content name='audio'/>
//<content name='video'/>
//<content name='data'/>
//</group>
//<content creator='responder' name='audio' senders='both'>
//<description xmlns='urn:xmpp:jingle:apps:rtp:1' media='audio' ssrc='4230580009'>
//<payload-type id='111' name='opus' clockrate='48000' channels='2'>
//<parameter name='minptime' value='10'/>
//<parameter name='useinbandfec' value='1'/>
//</payload-type>
//<payload-type id='103' name='ISAC' clockrate='16000' channels='1'/>
//<payload-type id='104' name='ISAC' clockrate='32000' channels='1'/>
//<payload-type id='0' name='PCMU' clockrate='8000' channels='1'/>
//<payload-type id='8' name='PCMA' clockrate='8000' channels='1'/>
//<payload-type id='106' name='CN' clockrate='32000' channels='1'/>
//<payload-type id='105' name='CN' clockrate='16000' channels='1'/>
//<payload-type id='13' name='CN' clockrate='8000' channels='1'/>
//<payload-type id='126' name='telephone-event' clockrate='8000' channels='1'/>
//<source ssrc='4230580009' xmlns='urn:xmpp:jingle:apps:rtp:ssma:0'>
//<parameter name='cname' value='uRI/DLve04WeHcOn'/>
//<parameter name='msid' value='d15be704-cfc5-4036-b9f1-31597e033a1c 5c19b60c-cef3-4f7e-979f-94dc52124669'/>
//<parameter name='mslabel' value='d15be704-cfc5-4036-b9f1-31597e033a1c'/>
//<parameter name='label' value='5c19b60c-cef3-4f7e-979f-94dc52124669'/>
//</source>
//<rtcp-mux/>
//<rtp-hdrext xmlns='urn:xmpp:jingle:apps:rtp:rtp-hdrext:0' uri='urn:ietf:params:rtp-hdrext:ssrc-audio-level' id='1'/>
//</description>
//<transport ufrag='STPNJx+AT31GEGdR' pwd='APuirhpvepZeHuKtpc2yxA45' xmlns='urn:xmpp:jingle:transports:ice-udp:1'>
//<fingerprint hash='sha-256' xmlns='urn:xmpp:jingle:apps:dtls:0' setup='active'>EB:91:61:4E:3D:D7:75:8E:26:26:A4:6B:F4:ED:8D:51:18:A1:A0:8A:56:7D:4F:91:ED:41:E7:25:CE:BB:16:8E
//</fingerprint>
//</transport>
//</content>
//<content creator='responder' name='data'>
//<transport ufrag='STPNJx+AT31GEGdR' pwd='APuirhpvepZeHuKtpc2yxA45' xmlns='urn:xmpp:jingle:transports:ice-udp:1'>
//<sctpmap xmlns='urn:xmpp:jingle:transports:dtls-sctp:1' number='5000' protocol='webrtc-datachannel' streams='1024'/>
//<fingerprint hash='sha-256' xmlns='urn:xmpp:jingle:apps:dtls:0' setup='active'>EB:91:61:4E:3D:D7:75:8E:26:26:A4:6B:F4:ED:8D:51:18:A1:A0:8A:56:7D:4F:91:ED:41:E7:25:CE:BB:16:8E
//</fingerprint>
//</transport>
//</content>
//<content creator='responder' name='video' senders='both'>
//<description xmlns='urn:xmpp:jingle:apps:rtp:1' media='video' ssrc='2608784670'>
//<payload-type id='100' name='VP8' clockrate='90000' channels='1'>
//<rtcp-fb xmlns='urn:xmpp:jingle:apps:rtp:rtcp-fb:0' type='ccm' subtype='fir'/>
//<rtcp-fb xmlns='urn:xmpp:jingle:apps:rtp:rtcp-fb:0' type='nack'/>
//<rtcp-fb xmlns='urn:xmpp:jingle:apps:rtp:rtcp-fb:0' type='nack' subtype='pli'/>
//<rtcp-fb xmlns='urn:xmpp:jingle:apps:rtp:rtcp-fb:0' type='goog-remb'/>
//</payload-type>
//<payload-type id='116' name='red' clockrate='90000' channels='1'/>
//<payload-type id='117' name='ulpfec' clockrate='90000' channels='1'/>
//<rtcp-mux/>
//<rtp-hdrext xmlns='urn:xmpp:jingle:apps:rtp:rtp-hdrext:0' uri='urn:ietf:params:rtp-hdrext:toffset' id='2'/>
//<source ssrc='2608784670' xmlns='urn:xmpp:jingle:apps:rtp:ssma:0'>
//<parameter name='cname' value='oawa9WOZWSlnvIND'/>
//<parameter name='msid' value='f23e80c2-2741-4c1f-ad20-44c9f2bad9e8 0b72bbad-3ff3-4bf8-bee6-b08d06bf10ff'/>
//<parameter name='mslabel' value='f23e80c2-2741-4c1f-ad20-44c9f2bad9e8'/>
//<parameter name='label' value='0b72bbad-3ff3-4bf8-bee6-b08d06bf10ff'/>
//</source>
//<rtp-hdrext xmlns='urn:xmpp:jingle:apps:rtp:rtp-hdrext:0' uri='http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time' id='3'/>
//</description>
//<transport ufrag='STPNJx+AT31GEGdR' pwd='APuirhpvepZeHuKtpc2yxA45' xmlns='urn:xmpp:jingle:transports:ice-udp:1'>
//<fingerprint hash='sha-256' xmlns='urn:xmpp:jingle:apps:dtls:0' setup='active'>EB:91:61:4E:3D:D7:75:8E:26:26:A4:6B:F4:ED:8D:51:18:A1:A0:8A:56:7D:4F:91:ED:41:E7:25:CE:BB:16:8E
//</fingerprint>
//</transport>
//</content>
//</jingle>
//</iq>
    // group
    accept.c('group',
        {xmlns: 'urn:xmpp:jingle:apps:grouping:0', semantics:'BUNDLE'});

    accept.c('content', {name: 'audio'});
    accept.up();
    accept.c('content', {name: 'video'});
    accept.up();

    accept.up();

    // audio description
    accept.c('content', {creator: 'responder', name: 'audio', senders: 'both'});
    accept.c('description', {xmlns:'urn:xmpp:jingle:apps:rtp:1', media:'audio', ssrc:'1001'});
    accept.c('payload-type', {id: 0, name: 'PCMU', clockrate: '8000', channels: 1});
    accept.up();
    accept.c('payload-type', {id: 104, name: 'opus', clockrate: '48000', channels: 2});
    accept.up();
    accept.c('rtcp-mux');
    accept.up();

    accept.c('source', {ssrc:this.localAudioSSRC, xmlns:'urn:xmpp:jingle:apps:rtp:ssma:0'});
    accept.up();

    // end audio description
    accept.up();

    accept.c('transport', { xmlns:'urn:xmpp:jingle:transports:ice-udp:1',
        ufrag: this.iceGatherer.getLocalParameters().usernameFragment, pwd: this.iceGatherer.getLocalParameters().password});
    accept.c('fingerprint', {hash: 'sha-256', xmlns: 'urn:xmpp:jingle:apps:dtls:0',
        setup: 'active'}).t(this.dtlsTransport.getLocalParameters().fingerprints[0].value);
    accept.up();
    accept.up();


    // end audio content
    accept.up();

     accept.c('content', {creator: 'responder', name: 'video', senders: 'both'});
    accept.c('description', {xmlns:'urn:xmpp:jingle:apps:rtp:1', media:'video', ssrc:'3003'});
    accept.c('payload-type', {id: 122, name: 'VP8', clockrate: '90000', channels: 1});
    accept.up();
    accept.c('payload-type', {id: 123, name: 'RED', clockrate: '90000', channels: 2});
    accept.up();
    accept.c('rtcp-mux');
    accept.up();

    accept.c('source', {ssrc:this.localVideoSSRC, xmlns:'urn:xmpp:jingle:apps:rtp:ssma:0'});
    accept.up();

    // end audio description
    accept.up();

    accept.c('transport', { xmlns:'urn:xmpp:jingle:transports:ice-udp:1',
        ufrag: this.iceGatherer.getLocalParameters().usernameFragment, pwd: this.iceGatherer.getLocalParameters().password});
    accept.c('fingerprint', {hash: 'sha-256',
        xmlns: 'urn:xmpp:jingle:apps:dtls:0', setup: 'active'}).t(this.dtlsTransport.getLocalParameters().fingerprints[0].value);
    accept.up();
    accept.up();

    // end video content
    accept.up();

    console.log('ufrag:'+ this.iceGatherer.getLocalParameters().usernameFragment, 'pwd: '+this.iceGatherer.getLocalParameters().password);
    console.log('Sending answer: ', accept);
    this.connection.sendIQ(accept,
                function () {
                    var ack = {};
                    ack.source = 'answer';
                    $(document).trigger('ack.jingle', [self.sid, ack]);
                },
                function (stanza) {
                    var error = ($(stanza).find('error').length) ? {
                        code: $(stanza).find('error').attr('code'),
                        reason: $(stanza).find('error :first')[0].tagName
                    }:{};
                    error.source = 'answer';
                    console.log('I borked with: ', error);
                },
                10000);

    // update maps with local ssrcs: ssrcOwners, ssrcMediaTypes, ssrcVideoTypes

    this.startSenders();

};

JingleSessionORTC.prototype.startSenders = function() {
    //var audioCapabilities = RTCRtpSender.getCapabilities('audio');
    //var videoCapabilities = RTCRtpSender.getCapabilities('video');
    //console.log('audio caps sender ', audioCapabilities);
    //console.log('video caps sender ', videoCapabilities);

    //var audioCapabilitiesReceiver = RTCRtpReceiver.getCapabilities('audio');
    //var videoCapabilitiesReceiver = RTCRtpReceiver.getCapabilities('video');
    //console.log('audio caps Receiver ', audioCapabilitiesReceiver);
    //console.log('video caps Receiver ', videoCapabilitiesReceiver);

    var audioSenderParameters = {
        "muxId": null, "codecs": [
            {
                "name": "PCMU",
                "payloadType": 0,
                "clockRate": 8000,
                "numChannels": 1,
                "rtcpFeedback": [{
                    "type": "x-message",
                    "parameter": "app send:dsh recv:dsh"
                }],
                "parameters": {}
            },
            {
                "name": "G722",
                "payloadType": 9,
                "clockRate": 8000,
                "numChannels": 1,
                "rtcpFeedback": [{
                    "type": "x-message",
                    "parameter": "app send:dsh recv:dsh"
                }],
                "parameters": {}
            }
            , {
                "name": "OPUS",
                "payloadType": 106,
                "clockRate": 16000,
                "numChannels": 1,
                "rtcpFeedback": [{
                    "type": "x-message",
                    "parameter": "app send:dsh recv:dsh"
                }],
                "parameters": {}
            }
            ]
        , "headerExtensions": [],
        "encodings": [{
            "ssrc": this.localAudioSSRC,
            "codecPayloadType": 0,
            "fec": 0,
            "rtx": 0,
            "priority": 1,
            "maxBitrate": 2000000,
            "minQuality": 0,
            "framerateBias": 0.5,
            "resolutionScale": 1,
            "framerateScale": 1,
            "active": true
        }],
        "rtcp": {
            "ssrc": 0,
            "cname": "emil",
            "reducedSize": false,
            "mux": true
        }
    };

    var videoSenderParameters = {
        "muxId": null,
        "codecs": [{
            "name": "X-H264UC",
            "payloadType": 122,
            "clockRate": 90000,
            "numChannels": 1,
            "rtcpFeedback": [{
                "type": "x-message",
                "parameter": "app send:src,x-pli recv:src,x-pli"
            }],
            "parameters": {"packetization-mode": "1", "mst-mode": "NI-TC"}
        }
            , {
                "name": "x-ulpfecuc",
                "payloadType": 123,
                "clockRate": 90000,
                "numChannels": 1,
                "rtcpFeedback": [],
                "parameters": {}
            }
        ],
        "headerExtensions": [],
        "encodings": [{
            "ssrc": this.localVideoSSRC,
            "codecPayloadType": 0,
            "fec": 0,
            "rtx": 0,
            "priority": 1,
            "maxBitrate": 2000000,
            "minQuality": 0,
            "framerateBias": 0.5,
            "resolutionScale": 1,
            "framerateScale": 1,
            "active": true
        }
        ],
        "rtcp": {
            "ssrc": 0,
            "cname": "emil",
            "reducedSize": false,
            "mux": true
        }
    };

    this.audioRtpSenders.forEach(function(sender){
        log.push("Starting audio sender.");
        sender.send(audioSenderParameters);
        log.push("Started audio sender.");
        console.log("Started audio sender.");
    });
    this.videoRtpSenders.forEach(function(sender){
        log.push("Starting video sender.");
        sender.send(videoSenderParameters);
        log.push("Started video sender.");
        console.log("Started video sender.");
    });


};


module.exports = JingleSessionORTC;
