/**
 * Replaces common smiley strings with images
 */
function smilify(body) {
    if (!body) {
        return body;
    }

    for (var smiley in regexs) {
        if (regexs.hasOwnProperty(smiley)) {
            body = body.replace(regexs[smiley],
                    '<img class="smiley" src="images/smileys/' + smiley + '.svg">');
        }
    }

    return body;
}

var Replacement = {
    /**
     * Processes links and smileys in "body"
     */
    processReplacements: function(body) {
        //make links clickable
        body = this.linkify(body);

        //add smileys
        body = smilify(body);

        return body;
    },

    /**
     * Finds and replaces all links in the links in "body"
     * with their <a href=""></a>
     */
    linify: function(inputText) {
        var replacedText, replacePattern1, replacePattern2, replacePattern3;

        //URLs starting with http://, https://, or ftp://
        replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
        replacedText = inputText.replace(replacePattern1, '<a href="$1" target="_blank">$1</a>');

        //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
        replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
        replacedText = replacedText.replace(replacePattern2, '$1<a href="http://$2" target="_blank">$2</a>');

        //Change email addresses to mailto:: links.
        replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
        replacedText = replacedText.replace(replacePattern3, '<a href="mailto:$1">$1</a>');

        return replacedText;
    }
};

module.exports = Replacement;
