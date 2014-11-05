/* global $, Util, connection, nickname:true, getVideoSize, getVideoPosition, showToolbar, processReplacements */
var Replacement = require("./Replacement.js");
var dep = {
    "VideoLayout": function(){ return require("../VideoLayout")},
    "Toolbar": function(){return require("../toolbars/Toolbar")},
    "UIActivator": function () {
        return require("../UIActivator");
    }
};
/**
 * Chat related user interface.
 */
var Chat = (function (my) {
    var notificationInterval = false;
    var unreadMessages = 0;

    /**
     * Initializes chat related interface.
     */
    my.init = function () {
        var storedDisplayName = window.localStorage.displayname;
        var nickname = null;
        if (storedDisplayName) {
            dep.UIActivator().getUIService().setNickname(storedDisplayName);
            nickname = storedDisplayName;
            Chat.setChatConversationMode(true);
        }

        $('#nickinput').keydown(function (event) {
            if (event.keyCode === 13) {
                event.preventDefault();
                var val = Util.escapeHtml(this.value);
                this.value = '';
                if (!dep.UIActivator().getUIService().getNickname()) {
                    dep.UIActivator().getUIService().setNickname(val);
                    window.localStorage.displayname = val;
                    //this should be changed
                    XMPPActivator.addToPresence("displayName", val);
                    Chat.setChatConversationMode(true);

                    return;
                }
            }
        });

        $('#usermsg').keydown(function (event) {
            if (event.keyCode === 13) {
                event.preventDefault();
                var value = this.value;
                $('#usermsg').val('').trigger('autosize.resize');
                this.focus();
                var command = new CommandsProcessor(value);
                if(command.isCommand())
                {
                    command.processCommand();
                }
                else
                {
                    //this should be changed
                    var message = Util.escapeHtml(value);
                    XMPPActivator.sendMessage(message, dep.UIActivator().getUIService().getNickname());
                }
            }
        });

        var onTextAreaResize = function () {
            resizeChatConversation();
            scrollChatToBottom();
        };
        $('#usermsg').autosize({callback: onTextAreaResize});

        $("#chatspace").bind("shown",
            function () {
                scrollChatToBottom();
                unreadMessages = 0;
                setVisualNotification(false);
            });
    };

    /**
     * Appends the given message to the chat conversation.
     */
    my.updateChatConversation = function (from, displayName, message) {
        var divClassName = '';

        if (XMPPActivator.getMyJID() === from) {
            divClassName = "localuser";
        }
        else {
            divClassName = "remoteuser";

            if (!Chat.isVisible()) {
                unreadMessages++;
                Util.playSoundNotification('chatNotification');
                setVisualNotification(true);
            }
        }

        //replace links and smileys
        var escMessage = Util.escapeHtml(message);
        var escDisplayName = Util.escapeHtml(displayName);
        message = Replacement.processReplacements(escMessage);

        $('#chatconversation').append('<div class="' + divClassName + '"><b>' +
                                      escDisplayName + ': </b>' +
                                      message + '</div>');
        $('#chatconversation').animate(
                { scrollTop: $('#chatconversation')[0].scrollHeight}, 1000);
    };

    /**
     * Appends error message to the conversation
     * @param errorMessage the received error message.
     * @param originalText the original message.
     */
    my.chatAddError = function(errorMessage, originalText)
    {
        errorMessage = Util.escapeHtml(errorMessage);
        originalText = Util.escapeHtml(originalText);

        $('#chatconversation').append('<div class="errorMessage"><b>Error: </b>'
            + 'Your message' + (originalText? (' \"'+ originalText + '\"') : "")
            + ' was not sent.' + (errorMessage? (' Reason: ' + errorMessage) : '')
            +  '</div>');
        $('#chatconversation').animate(
            { scrollTop: $('#chatconversation')[0].scrollHeight}, 1000);
    };

    /**
     * Sets the subject to the UI
     * @param subject the subject
     */
    my.chatSetSubject = function(subject)
    {
        if(subject)
            subject = subject.trim();
        $('#subject').html(Replacement.linkify(Util.escapeHtml(subject)));
        if(subject == "")
        {
            $("#subject").css({display: "none"});
        }
        else
        {
            $("#subject").css({display: "block"});
        }
    };

    /**
     * Opens / closes the chat area.
     */
    my.toggleChat = function () {

        var chatspace = $('#chatspace');

        var chatSize = (chatspace.is(":visible")) ? [0, 0] : Chat.getChatSize();
        dep.VideoLayout().resizeVideoSpace(chatspace, chatSize, chatspace.is(":visible"));

        // Fix me: Should be called as callback of show animation

        // Request the focus in the nickname field or the chat input field.
        if ($('#nickname').css('visibility') === 'visible') {
            $('#nickinput').focus();
        } else {
            $('#usermsg').focus();
        }
    };

    /**
     * Sets the chat conversation mode.
     */
    my.setChatConversationMode = function (isConversationMode) {
        if (isConversationMode) {
            $('#nickname').css({visibility: 'hidden'});
            $('#chatconversation').css({visibility: 'visible'});
            $('#usermsg').css({visibility: 'visible'});
            $('#usermsg').focus();
        }
    };

    /**
     * Resizes the chat area.
     */
    my.resizeChat = function () {
        var chatSize = Chat.getChatSize();

        $('#chatspace').width(chatSize[0]);
        $('#chatspace').height(chatSize[1]);

        resizeChatConversation();
    };

    /**
     * Returns the size of the chat.
     */
    my.getChatSize = function () {
        var availableHeight = window.innerHeight;
        var availableWidth = window.innerWidth;

        var chatWidth = 200;
        if (availableWidth * 0.2 < 200)
            chatWidth = availableWidth * 0.2;

        return [chatWidth, availableHeight];
    };

    /**
     * Indicates if the chat is currently visible.
     */
    my.isVisible = function () {
        return $('#chatspace').is(":visible");
    };

    /**
     * Resizes the chat conversation.
     */
    function resizeChatConversation() {
        var usermsgStyleHeight = document.getElementById("usermsg").style.height;
        var usermsgHeight = usermsgStyleHeight
            .substring(0, usermsgStyleHeight.indexOf('px'));

        $('#usermsg').width($('#chatspace').width() - 10);
        $('#chatconversation').width($('#chatspace').width() - 10);
        $('#chatconversation')
            .height(window.innerHeight - 10 - parseInt(usermsgHeight));
    }

    /**
     * Shows/hides a visual notification, indicating that a message has arrived.
     */
    function setVisualNotification(show) {
        var unreadMsgElement = document.getElementById('unreadMessages');

        var glower = $('#chatButton');

        if (unreadMessages) {
            unreadMsgElement.innerHTML = unreadMessages.toString();

            dep.Toolbar().dockToolbar(true);

            var chatButtonElement
                = document.getElementById('chatButton').parentNode;
            var leftIndent = (Util.getTextWidth(chatButtonElement) -
                              Util.getTextWidth(unreadMsgElement)) / 2;
            var topIndent = (Util.getTextHeight(chatButtonElement) -
                             Util.getTextHeight(unreadMsgElement)) / 2 - 3;

            unreadMsgElement.setAttribute(
                    'style',
                    'top:' + topIndent +
                    '; left:' + leftIndent + ';');

            if (!glower.hasClass('icon-chat-simple')) {
                glower.removeClass('icon-chat');
                glower.addClass('icon-chat-simple');
            }
        }
        else {
            unreadMsgElement.innerHTML = '';
            glower.removeClass('icon-chat-simple');
            glower.addClass('icon-chat');
        }

        if (show && !notificationInterval) {
            notificationInterval = window.setInterval(function () {
                glower.toggleClass('active');
            }, 800);
        }
        else if (!show && notificationInterval) {
            window.clearInterval(notificationInterval);
            notificationInterval = false;
            glower.removeClass('active');
        }
    }

    /**
     * Scrolls chat to the bottom.
     */
    function scrollChatToBottom() {
        setTimeout(function () {
            $('#chatconversation').scrollTop(
                    $('#chatconversation')[0].scrollHeight);
        }, 5);
    }

    return my;
}(Chat || {}));

module.exports = Chat;
