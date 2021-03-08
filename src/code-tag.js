var voidElements = require('void-elements');

module.exports = function (tag) {
    var res = {
        type: 'code',
        name: tag,
        voidElement: false,
        children: []
    };
    return res;
};