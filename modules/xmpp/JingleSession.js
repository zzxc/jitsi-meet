/* global $iq, require*/

var Constants = require('../../service/xmpp/JingleConstants');

/**
 * JingleSession provides an API to manage a single Jingle session. We will
 * have different implementations depending on the underlying interface used
 * (i.e. WebRTC and ORTC) and here we hold the code common to all of them.
 *
 * @param me our JID.
 * @param sid the ID of the Jingle session.
 * @param connection The Strophe connection used to send stanzas.
 * @param service The Jitsi-Meet XMPP service. TODO: barely used, we should
 * remove the dependency.
 * @param eventEmitter object to use to emit events.
 * @constructor
 */
function JingleSession(me, sid, connection, service, eventEmitter) {
    this.me = me;
    this.sid = sid;
    this.connection = connection;
    this.service = service;
    this.eventEmitter = eventEmitter;

    // The JID of the initiator in the Jingle session.
    this.initiator = null;

    // The JID of the responder in this Jingle session (i.e. the peer which is
    // not the initiator).
    this.responder = null;

    // The JID of the remote Jingle peer.
    this.peerjid = null;

    // Use trickle ICE or not.
    this.usetrickle = true;

    // dripping is sending trickle candidates not one-by-one
    this.usedrip = true;
}

/**
 * Sends a Jingle session-info message to the Jingle peer, with a 'mute' or
 * 'unmute' element for the Jingle content named 'content'. See XEP-0167.
 * @param muted whether to send a 'mute' or 'unmute' message.
 * @param content the name of the affected Jingle content.
 */
JingleSession.prototype.sendMute = function (muted, content) {
    var info = this.createJingleIQ('session-info');
    info.c(muted ? 'mute' : 'unmute', {xmlns: Constants.XMLNS_RTP_INFO});
    info.attrs(
        {'creator': this.me == this.initiator ? 'initiator' : 'responder'});

    if (content) {
        info.attrs({'name': content});
    }

    this.connection.send(info);
};

/**
 * Sends a Jingle session-info message to the Jingle peer, with a 'ringing'
 * element. See XEP-0167.
 */
JingleSession.prototype.sendRinging = function () {
    var info = this.createJingleIQ('session-info');
    info.c('ringing', {xmlns: Constants.XMLNS_RTP_INFO});

    this.connection.send(info);
};

/**
 * Creates and returns a Jingle IQ with the given action, and addressed to
 * the existing Jingle peer, *and with the current element set to the 'jingle'
 * element*.
 *
 * @param action the Jingle action.
 * @returns {*}
 */
JingleSession.prototype.createJingleIQ = function(action) {
    return $iq({to: this.peerjid, type: 'set'})
        .c('jingle', {
            xmlns: Constants.XMLNS_JINGLE,
            action: action,
            initiator: this.initiator,
            sid: this.sid});
};

module.exports = JingleSession;
