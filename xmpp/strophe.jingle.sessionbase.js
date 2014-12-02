var SDP = require("./strophe.jingle.sdp");
var RTCActivator = require("../RTC/RTCActivator");
var XMPPActivator = require("./XMPPActivator");

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
    if(this.peerconnection)
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
    var media = require("../simulcast/SimulcastService").parseMedia(
        sess.peerconnection.localDescription);
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
            if (newssrcs[i-1].type === 'video' && require("../desktopsharing").isUsingScreenStream()) {
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
    if(this.peerconnection)
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
                    require("../util/tracking.js")('iceConnected', metadata);
                });
            }
            break;
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

            var self = this;
            if (!XMPPActivator.getJIDFromSSRC(thessrc)) {
                // TODO(gp) limit wait duration to 1 sec.
                setTimeout(function(d, s) {
                    return function() {
                        self.waitForPresence(d, s);
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

module.exports=SessionBase;