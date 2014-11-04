
var UIUtil = (function (my) {

    /**
     * Returns the available video width.
     */
    my.getAvailableVideoWidth = function () {
        var chatspaceWidth
            = $('#chatspace').is(":visible")
            ? $('#chatspace').width()
            : 0;

        return window.innerWidth - chatspaceWidth;
    };

    /**
     * Changes the style class of the element given by id.
     */
    my.buttonClick = function (id, classname) {
        $(id).toggleClass(classname); // add the class to the clicked element
    };

    return my;

})(UIUtil || {});

module.exports = UIUtil;