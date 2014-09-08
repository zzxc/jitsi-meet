var Chat = require("./chat/Chat.js");
var ContactList = require("./ContactList.js");

var UIUtil = (function (my) {

    /**
     * Returns the available video width.
     */
    my.getAvailableVideoWidth = function () {
        var chatspaceWidth
            = (Chat.isVisible() || ContactList.isVisible())
            ? $('#chatspace').width()
            : 0;

        return window.innerWidth - chatspaceWidth;
    };

    return my;

})(UIUtil || {});


//module.exports = {
//    getAvailableVideoWidth: function () {
//        var chatspaceWidth
//            = (Chat.isVisible() || ContactList.isVisible())
//            ? $('#chatspace').width()
//            : 0;
//
//        return window.innerWidth - chatspaceWidth;
//    }
//}

module.exports = UIUtil;
//module.exports = "Aaaaaaaaaaa";