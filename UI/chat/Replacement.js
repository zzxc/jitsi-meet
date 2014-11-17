var smileys = {
    "smiley1": ':)',
    "smiley2": ':(',
    "smiley3": ':D',
    "smiley4": '(y)',
    "smiley5": ' :P',
    "smiley6": '(wave)',
    "smiley7": '(blush)',
    "smiley8": '(chuckle)',
    "smiley9": '(shoked)',
    "smiley10": ':*',
    "smiley11": '(n)',
    "smiley12": '(search)',
    "smiley13": ' <3',
    "smiley14": '(oops)',
    "smiley15": '(angry)',
    "smiley16": '(angel)',
    "smiley17": '(sick)',
    "smiley18": ';(',
    "smiley19": '(bomb)',
    "smiley20": '(clap)',
    "smiley21": ' ;)'
};

var regexs = {
    'smiley2': /(:-\(\(|:-\(|:\(\(|:\(|\(sad\))/gi,
    'smiley3': /(:-\)\)|:\)\)|\(lol\)|:-D|:D)/gi,
    'smiley1': /(:-\)|:\))/gi,
    'smiley4': /(\(y\)|\(Y\)|\(ok\))/gi,
    'smiley5': /(:-P|:P|:-p|:p)/gi,
    'smiley6': /(\(wave\))/gi,
    'smiley7': /(\(blush\))/gi,
    'smiley8': /(\(chuckle\))/gi,
    'smiley9': /(:-0|\(shocked\))/gi,
    'smiley10': /(:-\*|:\*|\(kiss\))/gi,
    'smiley11': /(\(n\))/gi,
    'smiley12': /(\(search\))/g,
    'smiley13': /(<3|&lt;3|&amp;lt;3|\(L\)|\(l\)|\(H\)|\(h\))/gi,
    'smiley14': /(\(oops\))/gi,
    'smiley15': /(\(angry\))/gi,
    'smiley16': /(\(angel\))/gi,
    'smiley17': /(\(sick\))/gi,
    'smiley18': /(;-\(\(|;\(\(|;-\(|;\(|:'\(|:'-\(|:~-\(|:~\(|\(upset\))/gi,
    'smiley19': /(\(bomb\))/gi,
    'smiley20': /(\(clap\))/gi,
    'smiley21': /(;-\)|;\)|;-\)\)|;\)\)|;-D|;D|\(wink\))/gi
};


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
    linkify: function(inputText) {
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
