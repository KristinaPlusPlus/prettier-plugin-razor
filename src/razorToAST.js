// Code originally from from https://github.com/rayd/html-parse-stringify2

var tagRE = /(?:@\*.+\*@|(?:^@.+|(?<!")@[^{\r\n<]+|else[^{\r\n<]*|for[^{\r\n<]*)|<[^<|"]*(("[^"]*")[^>|"]*)*>|[@]*\{|\})/gmi;
var codeRE = /\@code\s*{/g;
var wsRE = /^\s*$/;
var parseTag = require('./parse-tag');
var parseCode = require('./code-tag');

// re-used obj for quick lookups of components
var empty = Object.create ? Object.create(null) : {};
// common logic for pushing a child node onto a list
function pushTextNode(list, razor, level, start, ignoreWhitespace) {
    // calculate correct end of the content slice in case there's
    // no tag after the text node.
    var end = getNext(razor, start);
    var content = razor.slice(start, end === -1 ? undefined : end);
    // if a node is nothing but whitespace, collapse it as the spec states:
    // https://www.w3.org/TR/html4/struct/text.html#h-9.1
    if (wsRE.test(content)) {
        // Check if just end of line
        if(content.includes('\r\n\r\n')){
            content = '';
        }
        else{
            content = ' ';
        }
    }
    // don't add whitespace-only text nodes if they would be trailing text nodes
    // or if they would be leading whitespace-only text nodes:
    //  * end > -1 indicates this is not a trailing text node
    //  * leading node is when level is -1 and list has length 0
    if ((!ignoreWhitespace && end > -1 && level + list.length >= 0 && content != ' ')) {
        list.push({
            type: 'text',
            content: content
        });
    }
}
// common logic to check for next occurrance of the pattern
function getNext(parentStr, start=0){
    searchStr = parentStr.substring(start, parentStr.length);
    return start + searchStr.search(tagRE);
}

module.exports = function parse(razor) {
    var ignoreWhitespace = false;
    var result = [];
    var current;
    var level = -1;
    var arr = [];

    // Find the code section
    var matchCodeSec = codeRE.exec(razor)
    if (matchCodeSec != null){
        var codeSecIndex = matchCodeSec.index
    }
    else{
        var codeSecIndex = razor.length
    }

    // Ignore the code section while parsing
    var codeSection = razor.substring(codeSecIndex, razor.length)
    var razor = razor.replace(codeSection, '');

    var matchIndex = tagRE.exec(razor).index;
    // Check if there are non-whitespace values prior to first tag
    if (matchIndex !== 0 && razor.substring(0, matchIndex).trim().length !== 0){
        pushTextNode(result, razor, 0, 0, ignoreWhitespace);
    }

    razor.replace(tagRE, function (tag, p1, p2, index) {

        var isOpen = tag.charAt(1) !== '/' && tag.charAt(0) !== '\}';
        var isComment = tag.indexOf('<!--') === 0 || tag.indexOf('\@\*') == 0;
        var isScriptCode = tag.indexOf('\@') == 0 || tag.indexOf('\{') == 0 || tag.indexOf('\}') == 0 || tag.toLowerCase().indexOf('else') == 0 || tag.toLowerCase().indexOf('for') == 0;
        var start = index + tag.length;
        var parent;

        if (!isComment && isOpen) {
            level++;

            if (isScriptCode) {
                current = parseCode(tag);
            }
            else {
                current = parseTag(tag);
            }

            if (!current.voidElement && getNext(razor, start) !== start) {
                pushTextNode(current.children, razor, level, start, ignoreWhitespace);
            }

            // if we're at the root, push a base text node. otherwise add as
            // a child to the previous node.
            parent = level <= 0 ? result : arr[level-1].children;

            parent.push(current);

            arr[level] = current;
        }

        if (isComment || !isOpen || current.voidElement) {
            if(!isComment){
                level--;
            } 
            // trailing text node
            // if we're at the root, push a base text node. otherwise add as
            // a child to the current node.
            parent = level <= -1 ? result : arr[level].children;

            if (isComment) {
                current = {
                    type: 'comment',
                    content: tag
                };
                parent.push(current);
            }
            if ( getNext(razor, start) !== start) {
                pushTextNode(parent, razor, level, start, ignoreWhitespace);
            }
        }
    });

    // If the "razor" passed isn't actually razor, add it as a text node.
    if (!result.length && razor.length) {
        pushTextNode(result, razor, 0, 0, ignoreWhitespace);
    }
    // Add the code section at the end as a text node
    result.push({
        type: 'text',
        content: codeSection
    });

    return result;
};