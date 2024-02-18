"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDOMNodes = void 0;
function getDOMNodes(domFile, selector, unsafe) {
    if (unsafe === void 0) { unsafe = false; }
    var isBrowser = typeof window !== 'undefined';
    if (isBrowser) {
        var qs = document.querySelector('#content-container');
        if (qs) {
            var ret = qs.querySelector(selector);
            if (!ret && unsafe) {
                return document.querySelectorAll(selector);
            }
            else if (!ret && !unsafe) {
                throw new Error('Selector not found');
            }
        }
    }
    else {
        var fs = require('fs');
        var pathModule = require('path');
        var JSDOM = require('jsdom').JSDOM;
        var cwd = process.cwd();
        var path_1 = pathModule.join(cwd, domFile);
        var dom = new JSDOM(fs.readFileSync(path_1, 'utf8'));
        var domNode = dom.window.document.querySelector('#content-container').querySelector(selector);
        if (!domNode && unsafe) {
            return dom.window.document.querySelectorAll(selector);
        }
        else if (!domNode && !unsafe) {
            throw new Error('Selector not found');
        }
    }
}
exports.getDOMNodes = getDOMNodes;
module.exports = {
    getDOMNodes: getDOMNodes,
};
//# sourceMappingURL=utils.js.map