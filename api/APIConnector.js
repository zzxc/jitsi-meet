var uiService = require("../UI/UIActivator");

/**
 * List of the available commands.
 * @type {{
     *              displayName: inputDisplayNameHandler,
     *              muteAudio: toggleAudio,
     *              muteVideo: toggleVideo,
     *              filmStrip: toggleFilmStrip
     *          }}
 */
var commands =
{
    displayName: uiService.changeDisplayName,
    muteAudio: uiService.toggleAudio,
    muteVideo: uiService.toggleVideo,
    toggleFilmStrip: uiService.toggleFilmStrip,
    toggleChat: uiService.toggleChat,
    toggleContactList: uiService.toggleContactList
};


/**
 * Maps the supported events and their status
 * (true it the event is enabled and false if it is disabled)
 * @type {{
 *              incomingMessage: boolean,
 *              outgoingMessage: boolean,
 *              displayNameChange: boolean,
 *              participantJoined: boolean,
 *              participantLeft: boolean
 *      }}
 */
var events =
{
    incommingMessage: false,
    outgoingMessage:false,
    displayNameChange: false,
    participantJoined: false,
    participantLeft: false
};

/**
 * Implements API class that communicates with external api class
 * and provides interface to access Jitsi Meet features by external
 * applications that embed Jitsi Meet
 */

module.exports = {
    /**
     * Check whether the API should be enabled or not.
     * @returns {boolean}
     */
    isEnabled: function () {
        var hash = location.hash;
        if(hash && hash.indexOf("external") > -1 && window.postMessage)
            return true;
        return false;
    },

    /**
     * Initializes the APIConnector. Setups message event listeners that will
     * receive information from external applications that embed Jitsi Meet.
     * It also sends a message to the external application that APIConnector
     * is initialized.
     */
    init: function (uiServiceObject) {
        uiService = uiServiceObject;
        if (window.addEventListener) {
            window.addEventListener('message',
                this.processMessage, false);
        }
        else {
            window.attachEvent('onmessage', this.processMessage);
        }
        this.sendMessage({type: "system", loaded: true});
    },

    /**
     * Sends message to the external application.
     * @param object
     */
    sendMessage: function (object) {
        window.parent.postMessage(JSON.stringify(object), "*");
    },

    /**
     * Processes a message event from the external application
     * @param event the message event
     */
    processMessage: function(event)
    {
        var message;
        try {
            message = JSON.parse(event.data);
        } catch (e) {}

        if(!message.type)
            return;
        switch (message.type)
        {
            case "command":
                this.processCommand(message);
                break;
            case "event":
                this.processEvent(message);
                break;
            default:
                console.error("Unknown type of the message");
                return;
        }

    },

    /**
     * Processes commands from external applicaiton.
     * @param message the object with the command
     */
    processCommand: function (message)
    {
        if(message.action != "execute")
        {
            console.error("Unknown action of the message");
            return;
        }
        for(var key in message)
        {
            if(commands[key])
                commands[key].apply(null, message[key]);
        }
    },

    /**
     * Processes events objects from external applications
     * @param event the event
     */
    processEvent: function (event) {
        if(!event.action)
        {
            console.error("Event with no action is received.");
            return;
        }

        var i;

        switch(event.action)
        {
            case "add":
                for(i = 0; i < event.events.length; i++)
                {
                    events[event.events[i]] = true;
                }
                break;
            case "remove":
                for(i = 0; i < event.events.length; i++)
                {
                    events[event.events[i]] = false;
                }
                break;
            default:
                console.error("Unknown action for event.");
        }

    },

    /**
     * Checks whether the event is enabled ot not.
     * @param name the name of the event.
     * @returns {*}
     */
    isEventEnabled: function (name) {
        return events[name];
    },

    /**
     * Sends event object to the external application that has been subscribed
     * for that event.
     * @param name the name event
     * @param object data associated with the event
     */
    triggerEvent: function (name, object) {
        this.sendMessage({
            type: "event", action: "result", event: name, result: object});
    },

    /**
     * Removes the listeners.
     */
    dispose: function () {
        if(window.removeEventListener)
        {
            window.removeEventListener("message",
                this.processMessage, false);
        }
        else
        {
            window.detachEvent('onmessage', this.processMessage);
        }

    }
};
