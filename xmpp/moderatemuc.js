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
                require("../UI/UIService").toggleAudio();
            }
            return true;
        },
        eject: function (jid) {
            this.connection.jingle.terminateRemoteByJid(jid, 'kick');
            this.connection.emuc.kick(jid);
        }
    });

};
