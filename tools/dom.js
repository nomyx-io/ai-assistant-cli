const toolSchema = {
  state: {
    path: '',
    selector: '',
    value: '',
  },
  schemas: [
    {
      type: 'function',
      function: {
        name: 'html_selector',
        description: 'Performs the selector operation on the HTML page at the given path. The operation can be append, prepend, replace, remove, get_attributes, or set_attributes.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'The file path to the HTML file.' },
            operation: { type: 'string', description: 'The operation to perform on the selector. Can be append, prepend, replace, remove, get_attributes, set_attributes, or summarize' },
            selector: { type: 'string', description: 'The CSS selector to match elements.' },
            value: { type: 'string', description: 'The HTML content to append.' },
            n: { type: 'string', description: 'For summarize, specifies the depth of child elements to summarize. 0 for detailed information.' },
          },
          required: ['path', 'selector', 'operation']
        }
      }
    }
  ],
  tools: {
    html_selector: function ({ path, operation, selector, value, n }) {
      const fs = require('fs');
      const { JSDOM } = require('jsdom');
      const htmlContent = fs.readFileSync (path, 'utf8');
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;
      const elements = document.querySelectorAll(selector);
      let result = '';
      switch (operation) {
        case 'append':
          elements.forEach(ele => ele.innerHTML += value);
          result = 'Content appended successfully.';
          break;
        case 'prepend':
          elements.forEach(ele => ele.innerHTML = value + ele.innerHTML);
          result = 'Content prepended successfully.';
          break;
        case 'replace':
          elements.forEach(ele => ele.innerHTML = value);
          result = 'Content replaced successfully.';
          break;
        case 'remove':
          elements.forEach(ele => ele.innerHTML = ele.innerHTML.replace(value, ''));
          result = 'Content removed successfully.';
          break;
        case 'get_attributes':
          const attributes = [];
          elements.forEach(ele => attributes.push(ele.getAttribute(value)));
          result = attributes;
          break;
        case 'set_attributes':
          elements.forEach(ele => ele.setAttribute(value, n));
          result = 'Attribute set successfully.';
          break;
        case 'summarize':
          const summary = { textSummary: '', imageCount: 0, linkCount: 0, interactiveCount: 0 };
          elements.forEach(element => {
            if (n === 0) {
              // Base case: detailed information
              summary.textSummary = element.textContent.slice(0, 100) + '...'; // First 100 chars
              summary.imageCount += element.querySelectorAll('img').length;
              summary.linkCount += element.querySelectorAll('a').length;
              summary.interactiveCount += element.querySelectorAll('input, button, select, textarea').length;
            } else {
              // Summarize child elements
              const children = element.children;
              for (let i = 0; i < children.length; i++) {
                let childSummary = summarizeHTMLElement(children[i], n - 1);
                summary.textSummary += childSummary.textSummary; // Concatenate text summaries
                summary.imageCount += childSummary.imageCount;
                summary.linkCount += childSummary.linkCount;
                summary.interactiveCount += childSummary.interactiveCount;
              }
              // Simplify the summary for this level
              summary.textSummary += `${summary.textSummary.substring(0, 50)}... (${children.length} elements)\n`;
            }
          });
          result = summary;
          break;
        default:
          result = 'Invalid operation.';
      }
      fs.writeFileSync(path, dom.serialize());
      return dom.serialize();
    }
  }
}

module.exports = toolSchema;