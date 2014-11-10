var VideoLayout = require("./VideoLayout.js");
var XMPPActivator = require("../xmpp/XMPPActivator");

/**
 * Contact list.
 */
var ContactList = (function (my) {

    var numberOfContacts = 0;
    var notificationInterval;

    /**
     * Indicates if the chat is currently visible.
     *
     * @return <tt>true</tt> if the chat is currently visible, <tt>false</tt> -
     * otherwise
     */
    my.isVisible = function () {
        return $('#contactlist').is(":visible");
    };

    /**
     * Adds a contact for the given peerJid if such doesn't yet exist.
     *
     * @param peerJid the peerJid corresponding to the contact
     */
    my.ensureAddContact = function(peerJid) {
        var resourceJid = Strophe.getResourceFromJid(peerJid);

        var contact = $('#contactlist>ul>li[id="' + resourceJid + '"]');

        if (!contact || contact.length <= 0)
            ContactList.addContact(peerJid);
    };

    /**
     * Adds a contact for the given peer jid.
     *
     * @param peerJid the jid of the contact to add
     */
    my.addContact = function(peerJid) {
        var resourceJid = Strophe.getResourceFromJid(peerJid);

        var contactlist = $('#contactlist>ul');

        var newContact = document.createElement('li');
        newContact.id = resourceJid;
        newContact.className = "clickable";
        newContact.onclick = function(event) {
            if(event.currentTarget.className === "clickable") {
                var jid = event.currentTarget.id;
                var videoContainer = $("#participant_" + jid);
                if (videoContainer.length > 0) {
                    videoContainer.click();
                } else if (jid == Strophe.getResourceFromJid(XMPPActivator.getMyJID())) {
                    $("#localVideoContainer").click();
                }
            }
        };

        newContact.appendChild(createAvatar());
        newContact.appendChild(createDisplayNameParagraph("Participant"));

        var clElement = contactlist.get(0);

        if (resourceJid === Strophe.getResourceFromJid(XMPPActivator.getMyJID())
            && $('#contactlist>ul .title')[0].nextSibling.nextSibling)
        {
            clElement.insertBefore(newContact,
                    $('#contactlist>ul .title')[0].nextSibling.nextSibling);
        }
        else {
            clElement.appendChild(newContact);
        }
        updateNumberOfParticipants(1);
    };

    /**
     * Removes a contact for the given peer jid.
     *
     * @param peerJid the peerJid corresponding to the contact to remove
     */
    my.removeContact = function(peerJid) {
        var resourceJid = Strophe.getResourceFromJid(peerJid);

        var contact = $('#contactlist>ul>li[id="' + resourceJid + '"]');

        if (contact && contact.length > 0) {
            var contactlist = $('#contactlist>ul');

            contactlist.get(0).removeChild(contact.get(0));

            updateNumberOfParticipants(-1);
        }
    };

    /**
     * Opens / closes the contact list area.
     */
    my.toggleContactList = function () {
        var contactlist = $('#contactlist');
        var videospace = $('#videospace');

        var chatSize = (ContactList.isVisible()) ? [0, 0] : Chat.getChatSize();
        VideoLayout.resizeVideoSpace(contactlist, chatSize, ContactList.isVisible());

        if (!ContactList.isVisible()) {
            //stop the glowing of the contact list icon
            setVisualNotification(false);
        }
    };

    /**
     * Returns the size of the chat.
     */
    my.getContactListSize = function () {
        var availableHeight = window.innerHeight;
        var availableWidth = window.innerWidth;

        var chatWidth = 200;
        if (availableWidth * 0.2 < 200)
            chatWidth = availableWidth * 0.2;

        return [chatWidth, availableHeight];
    };


    /**
     * Updates the number of participants in the contact list button and sets
     * the glow
     * @param delta indicates whether a new user has joined (1) or someone has
     * left(-1)
     */
    function updateNumberOfParticipants(delta) {
        //when the user is alone we don't show the number of participants
        if(numberOfContacts === 0) {
            $("#numberOfParticipants").text('');
            numberOfContacts += delta;
        } else if(numberOfContacts !== 0 && !ContactList.isVisible()) {
            setVisualNotification(true);
            numberOfContacts += delta;
            $("#numberOfParticipants").text(numberOfContacts);
        }
    };

    /**
     * Creates the avatar element.
     * 
     * @return the newly created avatar element
     */
    function createAvatar() {
        var avatar = document.createElement('i');
        avatar.className = "icon-avatar avatar";

        return avatar;
    }

    /**
     * Creates the display name paragraph.
     *
     * @param displayName the display name to set
     */
    function createDisplayNameParagraph(displayName) {
        var p = document.createElement('p');
        p.innerText = displayName;

        return p;
    }

    /**
     * Shows/hides a visual notification, indicating that a new user has joined
     * the conference.
     */
    function setVisualNotification(show, stopGlowingIn) {
        var glower = $('#contactListButton');
        function stopGlowing() {
            window.clearInterval(notificationInterval);
            notificationInterval = false;
            glower.removeClass('glowing');
            if(!ContactList.isVisible()) {
                glower.removeClass('active');
            }
        }

        if (show && !notificationInterval) {
            notificationInterval = window.setInterval(function () {
                glower.toggleClass('active glowing');
            }, 800);
        }
        else if (!show && notificationInterval) {
            stopGlowing();
        }
        if(stopGlowingIn) {
            setTimeout(stopGlowing, stopGlowingIn);
        }
    }

    /**
     * Indicates that the display name has changed.
     */
    my.onDisplayNameChanged =
        function (peerJid, displayName) {
            if (peerJid === 'localVideoContainer')
                peerJid = XMPPActivator.getMyJID();

            var resourceJid = Strophe.getResourceFromJid(peerJid);

            var contactName = $('#contactlist #' + resourceJid + '>p');

            if (contactName && displayName && displayName.length > 0)
                contactName.text(displayName);
        };

    my.setClickable = function(resourceJid, isClickable) {
        var contact = $('#contactlist>ul>li[id="' + resourceJid + '"]');
        if(isClickable) {
            contact.addClass('clickable');
        } else {
            contact.removeClass('clickable');
        }
    };

    return my;
}(ContactList || {}));

module.exports = ContactList
