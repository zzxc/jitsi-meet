var RTCBrowserType =  require("../service/RTC/RTCBrowserType.js");

var browserType = null;

function getBrowserType()
{
    if(browserType == null)
    {
        browserType = require("./UIActivator").getRTCService().getBrowserType();
    }

    return browserType;
}

var UIUtil = {

    /**
     * Returns the available video width.
     */
    getAvailableVideoWidth: function () {
        var chatspaceWidth
            = $('#chatspace').is(":visible")
            ? $('#chatspace').width()
            : 0;

        return window.innerWidth - chatspaceWidth;
    },

    /**
     * Changes the style class of the element given by id.
     */
    buttonClick: function (id, classname) {
        $(id).toggleClass(classname); // add the class to the clicked element
    },

    attachMediaStream: function (element, stream) {
        switch (getBrowserType())
        {
            case RTCBrowserType.RTC_BROWSER_CHROME:
                element.attr('src', webkitURL.createObjectURL(stream));
                break;
            case RTCBrowserType.RTC_BROWSER_FIREFOX:
                element[0].mozSrcObject = stream;
                element[0].play();
                break;
            default:
                console.log("Unknown browser.");
        }
    },

    getLocalSSRC: function (session, callback) {
        switch (getBrowserType())
        {
            case RTCBrowserType.RTC_BROWSER_FIREFOX:
                session.peerconnection.getStats(function (s) {
                    var ssrcs = {};
                    s.forEach(function (item) {
                        if (item.type == "outboundrtp" && !item.isRemote)
                        {
                            ssrcs[item.id.split('_')[2]] = item.ssrc;
                        }
                    });
                    session.localStreamsSSRC = {
                        "audio": ssrcs.audio,//for stable 0
                        "video": ssrcs.video// for stable 1
                    };
                    callback(session.localStreamsSSRC);
                },
                function () {
                    callback(null);
                });
                break;
            case RTCBrowserType.RTC_BROWSER_CHROME:
                callback(null);
                break;
            default:
                console.log("Unknown browser.");
        }
    },
    getStreamID: function (stream) {
        switch (getBrowserType())
        {
            case RTCBrowserType.RTC_BROWSER_FIREFOX:
                var tracks = stream.getVideoTracks();
                if(!tracks || tracks.length == 0)
                {
                    tracks = stream.getAudioTracks();
                }
                return tracks[0].id.replace(/[\{,\}]/g,"");
                break;
            case RTCBrowserType.RTC_BROWSER_CHROME:
                return stream.id;
                break;
            default:
                console.log("Unknown browser.");
                return null;
        }
    },
    getVideoSrc: function (element) {
        switch (getBrowserType())
        {
            case RTCBrowserType.RTC_BROWSER_FIREFOX:
                return element.mozSrcObject;
            case RTCBrowserType.RTC_BROWSER_CHROME:
                return element.getAttribute("src");
                break;
            default:
                console.log("Unknown browser.");
                return null;
        }

    },
    setVideoSrc: function (element, src) {
        switch (getBrowserType())
        {
            case RTCBrowserType.RTC_BROWSER_CHROME:
                element.setAttribute("src", src);
            case RTCBrowserType.RTC_BROWSER_FIREFOX:
                element.mozSrcObject = src;
                break;
            default:
                console.log("Unknown browser.");
        }

    }
};

module.exports = UIUtil;