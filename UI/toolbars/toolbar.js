var BottomToolbar = require("./BottomToolbar");
var Prezi = require("./../prezi/prezi");
var Etherpad = require("./../etherpad/Etherpad");
var buttonClick = require("../UIUtil").buttonClick;
var DesktopStreaming = require("../../desktopsharing");


var Toolbar = (function (my) {

    var toolbarTimeout = null;

    var UIActivator = null;

    var XMPPActivator = null

    var roomUrl = null;

    var recordingToken = '';

    var buttonHandlers = {
        "toolbar_button_mute": function () {
            return Toolbar.toggleAudio();
        },
        "toolbar_button_camera": function () {
            buttonClick("#video", "icon-camera icon-camera-disabled");
            return toggleVideo();
        },
        "toolbar_button_record": function () {
            return toggleRecording();
        }
        ,
        "toolbar_button_security": function () {
            return Toolbar.openLockDialog();
        },
        "toolbar_button_link": function () {
            return Toolbar.openLinkDialog();
        },
        "toolbar_button_chat": function () {
            return BottomToolbar.toggleChat();
        },
        "toolbar_button_prezi": function () {
            return Prezi.openPreziDialog();
        },
        "toolbar_button_etherpad": function () {
            return Etherpad.toggleEtherpad(0);
        },
        "toolbar_button_desktopsharing": function () {
            return DesktopStreaming.toggleScreenSharing();
        },
        "toolbar_button_fullScreen": function()
        {
            buttonClick("#fullScreen", "icon-full-screen icon-exit-full-screen");
            return Toolbar.toggleFullScreen();
        },
        "toolbar_button_sip": function () {
            return callSipButtonClicked();
        },
        "toolbar_button_hangup": function () {
            return hangup();
        }
    }

    my.sharedKey = '';
    my.preMuted = false;

    function setRecordingToken(token) {
        recordingToken = token;
    }

    function callSipButtonClicked()
    {
        messageHandler.openTwoButtonDialog(null,
                '<h2>Enter SIP number</h2>' +
                '<input id="sipNumber" type="text"' +
                ' value="' + config.defaultSipNumber + '" autofocus>',
            false,
            "Dial",
            function (e, v, m, f) {
                if (v) {
                    var numberInput = document.getElementById('sipNumber');
                    if (numberInput.value) {
                        XMPPActivator.sipDial(
                            numberInput.value, 'fromnumber', UIActivator.getUIService().getRoomName());
                    }
                }
            },
            function (event) {
                document.getElementById('sipNumber').focus();
            }
        );
    }


    // Starts or stops the recording for the conference.
    function toggleRecording() {
        if(!XMPPActivator.isFocus())
        {
            console.log('non-focus: not enabling recording');
            return;
        }

        XMPPActivator.setRecording(
            recordingToken,
            function (state, oldState) {
                console.log("New recording state: ", state);
                if (state == oldState) //failed to change, reset the token because it might have been wrong
                {
                    Toolbar.toggleRecordingButtonState();
                    setRecordingToken(null);
                }
                else
                {
                    Toolbar.toggleRecordingButtonState();
                }
            },function() {
                if (!recordingToken) {
                    messageHandler.openTwoButtonDialog(null,
                            '<h2>Enter recording token</h2>' +
                            '<input id="recordingToken" type="text" placeholder="token" autofocus>',
                        false,
                        "Save",
                        function (e, v, m, f) {
                            if (v) {
                                var token = document.getElementById('recordingToken');

                                if (token.value) {
                                    setRecordingToken(Util.escapeHtml(token.value));
                                    toggleRecording();
                                }
                            }
                        },
                        function (event) {
                            document.getElementById('recordingToken').focus();
                        }
                    );

                }
            }
        );


    }

    function hangup() {
        XMPPActivator.disposeConference(false, function () {
            var buttons = {};
            if(config.enableWelcomePage)
            {
                setTimeout(function()
                {
                    window.localStorage.welcomePageDisabled = false;
                    window.location.pathname = "/";
                }, 10000);

            }

            $.prompt("Session Terminated",
                {
                    title: "You hung up the call",
                    persistent: true,
                    buttons: {
                        "Join again": true
                    },
                    closeText: '',
                    submit: function(event, value, message, formVals)
                    {
                        window.location.reload();
                        return false;
                    }

                }
            );
        }, true);


    }

    /**
     * Sets the shared key.
     */
    my.setSharedKey = function(sKey) {
        Toolbar.sharedKey = sKey;
    }

    /**
     * Locks / unlocks the room.
     */
    function lockRoom(lock) {
        var key = '';
        if (lock)
            key = Toolbar.sharedKey;

        XMPPActivator.lockRoom(key);

        Toolbar.updateLockButton();
    }

    //sets onclick handlers
    my.init = function (ui, xmpp) {
        UIActivator = ui;
        XMPPActivator = xmpp;
        for(var k in buttonHandlers)
            $("#" + k).click(buttonHandlers[k]);
    }


    my.changeToolbarVideoIcon = function (isMuted) {
        if (isMuted) {
            $('#video').removeClass("icon-camera");
            $('#video').addClass("icon-camera icon-camera-disabled");
        } else {
            $('#video').removeClass("icon-camera icon-camera-disabled");
            $('#video').addClass("icon-camera");
        }
    }

    my.toggleVideo = function () {
        buttonClick("#video", "icon-camera icon-camera-disabled");

        XMPPActivator.toggleVideoMute(
            function (isMuted) {
                Toolbar.changeToolbarVideoIcon(isMuted);

            }
        );
    }

    /**
     * Mutes / unmutes audio for the local participant.
     */
    my.toggleAudio = function () {
        var RTCActivator = require("../../RTC/RTCActivator");
        if (!(RTCActivator.getRTCService().localAudio)) {
            Toolbar.preMuted = true;
            // We still click the button.
            buttonClick("#mute", "icon-microphone icon-mic-disabled");
            return;
        }

        XMPPActivator.toggleAudioMute(function () {
            buttonClick("#mute", "icon-microphone icon-mic-disabled");
        });

    }

    /**
     * Opens the lock room dialog.
     */
    my.openLockDialog = function () {
        // Only the focus is able to set a shared key.
        if (!XMPPActivator.isFocus()) {
            if (Toolbar.sharedKey) {
                messageHandler.openMessageDialog(null,
                        "This conversation is currently protected by" +
                        " a shared secret key.",
                    false,
                    "Secret key");
            } else {
                messageHandler.openMessageDialog(null,
                    "This conversation isn't currently protected by" +
                        " a secret key. Only the owner of the conference" +
                        " could set a shared key.",
                    false,
                    "Secret key");
            }
        } else {
            if (Toolbar.sharedKey) {
                messageHandler.openTwoButtonDialog(null,
                    "Are you sure you would like to remove your secret key?",
                    false,
                    "Remove",
                    function (e, v) {
                        if (v) {
                            Toolbar.setSharedKey('');
                            lockRoom(false);
                        }
                    });
            } else {
                messageHandler.openTwoButtonDialog(null,
                    '<h2>Set a secret key to lock your room</h2>' +
                        '<input id="lockKey" type="text"' +
                        'placeholder="your shared key" autofocus>',
                    false,
                    "Save",
                    function (e, v) {
                        if (v) {
                            var lockKey = document.getElementById('lockKey');

                            if (lockKey.value) {
                                Toolbar.setSharedKey(Util.escapeHtml(lockKey.value));
                                lockRoom(true);
                            }
                        }
                    },
                    function () {
                        document.getElementById('lockKey').focus();
                    }
                );
            }
        }
    };

    /**
     * Updates the room invite url.
     */
    my.updateRoomUrl = function(newRoomUrl) {
        roomUrl = newRoomUrl;

        // If the invite dialog has been already opened we update the information.
        var inviteLink = document.getElementById('inviteLinkRef');
        if (inviteLink) {
            inviteLink.value = roomUrl;
            inviteLink.select();
            document.getElementById('jqi_state0_buttonInvite').disabled = false;
        }
    }

    /**
     * Opens the invite link dialog.
     */
    my.openLinkDialog = function () {
        var inviteLink;
        if (roomUrl == null) {
            inviteLink = "Your conference is currently being created...";
        } else {
            inviteLink = encodeURI(roomUrl);
        }
        messageHandler.openTwoButtonDialog(
            "Share this link with everyone you want to invite",
            '<input id="inviteLinkRef" type="text" value="' +
                inviteLink + '" onclick="this.select();" readonly>',
            false,
            "Invite",
            function (e, v) {
                if (v) {
                    if (roomUrl) {
                        inviteParticipants();
                    }
                }
            },
            function () {
                if (roomUrl) {
                    document.getElementById('inviteLinkRef').select();
                } else {
                    document.getElementById('jqi_state0_buttonInvite')
                        .disabled = true;
                }
            }
        );
    };

    /**
     * Invite participants to conference.
     */
    function inviteParticipants() {
        if (roomUrl == null)
            return;

        var sharedKeyText = "";
        if (Toolbar.sharedKey && Toolbar.sharedKey.length > 0) {
            sharedKeyText =
                "This conference is password protected. Please use the " +
                "following pin when joining:%0D%0A%0D%0A" +
                    Toolbar.sharedKey + "%0D%0A%0D%0A";
        }

        var conferenceName = roomUrl.substring(roomUrl.lastIndexOf('/') + 1);
        var subject = "Invitation to a Jitsi Meet (" + conferenceName + ")";
        var body = "Hey there, I%27d like to invite you to a Jitsi Meet" +
                    " conference I%27ve just set up.%0D%0A%0D%0A" +
                    "Please click on the following link in order" +
                    " to join the conference.%0D%0A%0D%0A" +
                    roomUrl +
                    "%0D%0A%0D%0A" +
                    sharedKeyText +
                    "Note that Jitsi Meet is currently only supported by Chromium," +
                    " Google Chrome and Opera, so you need" +
                    " to be using one of these browsers.%0D%0A%0D%0A" +
                    "Talk to you in a sec!";

        if (window.localStorage.displayname) {
            body += "%0D%0A%0D%0A" + window.localStorage.displayname;
        }

        window.open("mailto:?subject=" + subject + "&body=" + body, '_blank');
    }

    /**
     * Opens the settings dialog.
     */
    my.openSettingsDialog = function () {
        messageHandler.openTwoButtonDialog(
            '<h2>Configure your conference</h2>' +
                '<input type="checkbox" id="initMuted">' +
                'Participants join muted<br/>' +
                '<input type="checkbox" id="requireNicknames">' +
                'Require nicknames<br/><br/>' +
                'Set a secret key to lock your room:' +
                '<input id="lockKey" type="text" placeholder="your shared key"' +
                'autofocus>',
            null,
            false,
            "Save",
            function () {
                document.getElementById('lockKey').focus();
            },
            function (e, v) {
                if (v) {
                    if ($('#initMuted').is(":checked")) {
                        // it is checked
                    }

                    if ($('#requireNicknames').is(":checked")) {
                        // it is checked
                    }
                    /*
                    var lockKey = document.getElementById('lockKey');

                    if (lockKey.value) {
                        setSharedKey(lockKey.value);
                        lockRoom(true);
                    }
                    */
                }
            }
        );
    };

    /**
     * Toggles the application in and out of full screen mode
     * (a.k.a. presentation mode in Chrome).
     */
    my.toggleFullScreen = function() {
        var fsElement = document.documentElement;

        if (!document.mozFullScreen && !document.webkitIsFullScreen) {
            //Enter Full Screen
            if (fsElement.mozRequestFullScreen) {
                fsElement.mozRequestFullScreen();
            }
            else {
                fsElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
            }
        } else {
            //Exit Full Screen
            if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else {
                document.webkitCancelFullScreen();
            }
        }
    };
    /**
     * Updates the lock button state.
     */
    my.updateLockButton = function() {
        buttonClick("#lockIcon", "icon-security icon-security-locked");
    };

    // Shows or hides the 'recording' button.
    my.showRecordingButton = function (show) {
        if (!config.enableRecording) {
            return;
        }

        if (show) {
            $('#recording').css({display: "inline"});
        }
        else {
            $('#recording').css({display: "none"});
        }
    };

    // Toggle the state of the recording button
    my.toggleRecordingButtonState = function() {
        $('#recordButton').toggleClass('active');
    };

    // Shows or hides SIP calls button
    my.showSipCallButton = function(show){
        if (config.hosts.call_control && show) {
            $('#sipCallButton').css({display: "inline"});
        } else {
            $('#sipCallButton').css({display: "none"});
        }
    };

    return my;
}(Toolbar || {}));

module.exports = Toolbar;
