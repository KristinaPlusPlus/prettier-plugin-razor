var voidElements = require('void-elements');

module.exports = function (tag) {
    var res = {
        type: 'code',
        name: tag,
        voidElement: false,
        children: []
    };
    if ((tag.charAt(0) === '\@' && !tag.includes('\@\{')) || tag.toLowerCase().indexOf('else') == 0 || tag.toLowerCase().indexOf('for') == 0) {
        res.voidElement = true;
    }
    return res;
};