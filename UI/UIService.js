var AudioLevels = require("./audiolevels/AudioLevels.js");
var Etherpad = require("./etherpad/Etherpad.js");
var VideoLayout = require("./VideoLayout.js");
var Toolbar = require("./toolbars/toolbar.js");
var ToolbarToggler = require("./toolbars/toolbartoggler.js");
var ContactList = require("./ContactList");
var EventEmitter = require("events");

var UIService = function() {

    var eventEmitter = new EventEmitter();

    var nickname = null;

    var roomName = null;

    var XMPPActivator = null;

    function UIServiceProto(xmpp) {
        XMPPActivator = xmpp;
    }

    UIServiceProto.prototype.updateAudioLevelCanvas = function (peerJid) {
        AudioLevels.updateAudioLevelCanvas(peerJid);
    }

    UIServiceProto.prototype.initEtherpad = function () {
        Etherpad.init();
    }


    UIServiceProto.prototype.checkChangeLargeVideo = function (removedVideoSrc) {
        VideoLayout.checkChangeLargeVideo(removedVideoSrc);
    }

    UIServiceProto.prototype.onMucJoined = function (jid, info, noMembers) {
        Toolbar.updateRoomUrl(window.location.href);
        document.getElementById('localNick').appendChild(
            document.createTextNode(Strophe.getResourceFromJid(jid) + ' (me)')
        );

        if (noMembers) {
            Toolbar.showSipCallButton(true);
            Toolbar.showRecordingButton(false);
        }

        if (!XMPPActivator.isFocus()) {
            Toolbar.showSipCallButton(false);
        }

        if (XMPPActivator.isFocus() && config.etherpad_base) {
            this.initEtherpad();
        }

        VideoLayout.showFocusIndicator();

        // Add myself to the contact list.
        ContactList.addContact(jid);

        // Once we've joined the muc show the toolbar
        ToolbarToggler.showToolbar();

        if (info.displayName)
            this.onDisplayNameChanged(
                'localVideoContainer', info.displayName + ' (me)');
    }

    UIServiceProto.prototype.onDisplayNameChanged = function (peerJid, displayName, status) {
        VideoLayout.onDisplayNameChanged(peerJid, displayName, status);
        ContactList.onDisplayNameChanged(peerJid, displayName);
    };

    UIServiceProto.prototype.onMucEntered = function (jid, info, pres, newConference) {
        console.log('entered', jid, info);

        // Add Peer's container
        VideoLayout.ensurePeerContainerExists(jid);

        if(newConference)
        {
            console.log('make new conference with', jid);
            Toolbar.showRecordingButton(true);
        }
        else if (Toolbar.sharedKey) {
            Toolbar.updateLockButton();
        }
    }

    UIServiceProto.prototype.onMucPresenceStatus = function ( jid, info, pres) {
        VideoLayout.setPresenceStatus(
                'participant_' + Strophe.getResourceFromJid(jid), info.status);
    }

    UIServiceProto.prototype.onMucLeft = function(jid)
    {
        // Need to call this with a slight delay, otherwise the element couldn't be
        // found for some reason.
        window.setTimeout(function () {
            var container = document.getElementById(
                    'participant_' + Strophe.getResourceFromJid(jid));
            if (container) {
                // hide here, wait for video to close before removing
                $(container).hide();
                VideoLayout.resizeThumbnails();
            }
        }, 10);

        // Unlock large video
        if (VideoLayout.focusedVideoSrc)
        {
            if (VideoLayout.getJidFromVideoSrc(VideoLayout.focusedVideoSrc) === jid)
            {
                console.info("Focused video owner has left the conference");
                VideoLayout.focusedVideoSrc = null;
            }
        }

    };

    UIServiceProto.prototype.showVideoForJID = function (jid) {
        var el = $('#participant_'  + jid + '>video');
        el.show();
    }

    UIServiceProto.prototype.hideVideoForJID = function (jid) {
        var el = $('#participant_'  + jid + '>video');
        el.hide();
    }

    UIServiceProto.prototype.getSelectedJID = function () {
        var largeVideoSrc = $('#largeVideo').attr('src');
        return VideoLayout.getJidFromVideoSrc(largeVideoSrc);
    }
    
    UIServiceProto.prototype.updateButtons = function (recording, sip) {
        if(recording != null)
        {
            Toolbar.showRecordingButton(recording);
        }

        if(sip != null)
        {
            Toolbar.showSipCallButton(sip);
        }
    }

    UIServiceProto.prototype.toggleAudio = function()
    {
        Toolbar.toggleAudio();
    };

    UIServiceProto.prototype.getCredentials = function () {
        var credentials = {};
        credentials.jid = document.getElementById('jid').value
            || config.hosts.anonymousdomain
            || config.hosts.domain || window.location.hostname;

        credentials.bosh = document.getElementById('boshURL').value || config.bosh || '/http-bind';
        credentials.password = document.getElementById('password').value;
        return credentials;
    }

    UIServiceProto.prototype.addNicknameListener = function (listener) {
        eventEmitter.on("nick_changed", listener);
        eventEmitter.emit("nick_changed", nickname);

    }

    UIServiceProto.prototype.removeNicknameListener = function (listener) {
        eventEmitter.removeListener("nick_changed", listener);
    }

    UIServiceProto.prototype.dispose = function()
    {
        eventEmitter.removeAllListeners("statistics.audioLevel");
    }

    UIServiceProto.prototype.setNickname = function(value)
    {
        nickname = value;
        eventEmitter.emit("nick_changed", value);
    }

    UIServiceProto.prototype.getNickname = function () {
        return nickname;
    }

    UIServiceProto.prototype.generateRoomName = function (authenticatedUser) {
        var roomnode = null;
        var path = window.location.pathname;
        var roomjid;

        // determinde the room node from the url
        // TODO: just the roomnode or the whole bare jid?
        if (config.getroomnode && typeof config.getroomnode === 'function') {
            // custom function might be responsible for doing the pushstate
            roomnode = config.getroomnode(path);
        } else {
            /* fall back to default strategy
             * this is making assumptions about how the URL->room mapping happens.
             * It currently assumes deployment at root, with a rewrite like the
             * following one (for nginx):
             location ~ ^/([a-zA-Z0-9]+)$ {
             rewrite ^/(.*)$ / break;
             }
             */
            if (path.length > 1) {
                roomnode = path.substr(1).toLowerCase();
            } else {
                var word = RoomNameGenerator.generateRoomWithoutSeparator(3);
                roomnode = word.toLowerCase();

                window.history.pushState('VideoChat',
                        'Room: ' + word, window.location.pathname + word);
            }
        }

        roomName = roomnode + '@' + config.hosts.muc;

        var roomjid = roomName;
        var tmpJid = XMPPActivator.getOwnJIDNode();

        if (config.useNicks) {
            var nick = window.prompt('Your nickname (optional)');
            if (nick) {
                roomjid += '/' + nick;
            } else {
                roomjid += '/' + tmpJid;
            }
        } else {
            if(!authenticatedUser)
                tmpJid = tmpJid.substr(0, 8);

            roomjid += '/' + tmpJid;
        }
        return roomjid;
    }

    UIServiceProto.prototype.getRoomName = function()
    {
        return roomName;
    }

    UIServiceProto.prototype.showLoginPopup = function (callback) {
        console.log('password is required');

        messageHandler.openTwoButtonDialog(null,
                '<h2>Password required</h2>' +
                '<input id="passwordrequired.username" type="text" placeholder="user@domain.net" autofocus>' +
                '<input id="passwordrequired.password" type="password" placeholder="user password">',
            true,
            "Ok",
            function (e, v, m, f) {
                if (v) {
                    var username = document.getElementById('passwordrequired.username');
                    var password = document.getElementById('passwordrequired.password');

                    if (username.value !== null && password.value != null) {
                        callback(username.value, password.value);
                    }
                }
            },
            function (event) {
                document.getElementById('passwordrequired.username').focus();
            }
        );
    }

    UIServiceProto.prototype.disableConnect = function()
    {
        document.getElementById('connect').disabled = true;
    }

    UIServiceProto.prototype.showLockPopup = function (jid, callback) {
        console.log('on password required', jid);

        messageHandler.openTwoButtonDialog(null,
                '<h2>Password required</h2>' +
                '<input id="lockKey" type="text" placeholder="shared key" autofocus>',
            true,
            "Ok",
            function (e, v, m, f) {
                if (v) {
                    var lockKey = document.getElementById('lockKey');
                    if (lockKey.value !== null) {
                        setSharedKey(lockKey.value);
                        callback(jid, lockKey.value)
                    }
                }
            },
            function (event) {
                document.getElementById('lockKey').focus();
            }
        );
    }


    return UIServiceProto;
}();
module.exports = UIService;