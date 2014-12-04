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
     * @param id the user's email or userId used to get the user's avatar
     */
    my.ensureAddContact = function(peerJid, id) {
        var resourceJid = Strophe.getResourceFromJid(peerJid);

        var contact = $('#contactlist>ul>li[id="' + resourceJid + '"]');

        if (!contact || contact.length <= 0)
            ContactList.addContact(peerJid,id);
    };

    /**
     * Adds a contact for the given peer jid.
     *
     * @param peerJid the jid of the contact to add
     * @param id the email or userId of the user
     */
    my.addContact = function(peerJid, id) {
        var resourceJid = Strophe.getResourceFromJid(peerJid);

        var contactlist = $('#contactlist>ul');

        var newContact = document.createElement('li');
        // XXX(gp) contact click event handling is now in videolayout.js. Is the
        // following statement (newContact.id = resourceJid) still relevant?
        newContact.id = resourceJid;
        newContact.className = "clickable";
        newContact.onclick = function(event) {
            if(event.currentTarget.className === "clickable") {
                $(ContactList).trigger('contactclicked', [peerJid]);
            }
        };

        newContact.appendChild(createAvatar(id));
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

//<<<<<<< HEAD:UI/ContactList.js
//    /**
//     * Opens / closes the contact list area.
//     */
//    my.toggleContactList = function () {
//        var contactlist = $('#contactlist');
//
//        var chatSize = (ContactList.isVisible()) ? [0, 0] : require("./chat/chat").getChatSize();
//        VideoLayout.resizeVideoSpace(contactlist, chatSize, ContactList.isVisible(), function () {});
//
//        if (!ContactList.isVisible()) {
//            //stop the glowing of the contact list icon
//            setVisualNotification(false);
//=======
    my.setVisualNotification = function(show, stopGlowingIn) {
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
//>>>>>>> master:contact_list.js
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
            ContactList.setVisualNotification(true);
            numberOfContacts += delta;
            $("#numberOfParticipants").text(numberOfContacts);
        }
    }

    /**
     * Creates the avatar element.
     * 
     * @return the newly created avatar element
     */
    function createAvatar(id) {
        var avatar = document.createElement('img');
        avatar.className = "icon-avatar avatar";
        avatar.src = "https://www.gravatar.com/avatar/" + id + "?d=retro&size=30";

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
