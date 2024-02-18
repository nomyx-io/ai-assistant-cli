export function getDOMNodes(domFile: string, selector: string, unsafe = false) {
    const isBrowser = typeof window !== 'undefined';
    if (isBrowser) {
        const qs = document.querySelector('#content-container');
        if(qs) {
            let ret = qs.querySelector(selector);
            if (!ret && unsafe) {
                return  document.querySelectorAll(selector);
            } else if (!ret && !unsafe) {
                throw new Error('Selector not found');
            }
        }
    } else {
        const fs = require('fs');
        const pathModule = require('path');
        const { JSDOM } = require('jsdom');
        const cwd = process.cwd();
        const path = pathModule.join(cwd, domFile)
        const dom = new JSDOM(fs.readFileSync(path, 'utf8'));
        const domNode = dom.window.document.querySelector('#content-container').querySelector(selector);
        if (!domNode && unsafe) {
            return dom.window.document.querySelectorAll(selector);
        } else if (!domNode && !unsafe) {
            throw new Error('Selector not found');
        }
    }
}

module.exports = {
    getDOMNodes,
};