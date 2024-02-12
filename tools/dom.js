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
        name: 'html_selector_append_child',
        description: 'Appends the specified HTML content to elements matching the CSS selector in the specified HTML file.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'The file path to the HTML file.' },
            selector: { type: 'string', description: 'The CSS selector to match elements.' },
            value: { type: 'string', description: 'The HTML content to append.' },
          },
          required: ['path', 'selector', 'value']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'html_selector_replace_child',
        description: 'Replaces the specified HTML content in elements matching the CSS selector in the specified HTML file.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'The file path to the HTML file.' },
            selector: { type: 'string', description: 'The CSS selector to match elements.' },
            value: { type: 'string', description: 'The HTML content to replace.' },
          },
          required: ['path', 'selector', 'value']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'html_selector_remove_child',
        description: 'Removes the specified HTML content from elements matching the CSS selector in the specified HTML file.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'The file path to the HTML file.' },
            selector: { type: 'string', description: 'The CSS selector to match elements.' },
            value: { type: 'string', description: 'The HTML content to remove.' },
          },
          required: ['path', 'selector', 'value']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'html_selector_get_child',
        description: 'Gets the specified HTML content from elements matching the CSS selector in the specified HTML file.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'The file path to the HTML file.' },
            selector: { type: 'string', description: 'The CSS selector to match elements.' },
          },
          required: ['path', 'selector']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'html_selector_get_attribute',
        description: 'Gets the specified attribute from elements matching the CSS selector in the specified HTML file.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'The file path to the HTML file.' },
            selector: { type: 'string', description: 'The CSS selector to match elements.' },
            attribute: { type: 'string', description: 'The attribute to get.' },
          },
          required: ['path', 'selector', 'attribute']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'html_selector_set_attribute',
        description: 'Sets the specified attribute in elements matching the CSS selector in the specified HTML file.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'The file path to the HTML file.' },
            selector: { type: 'string', description: 'The CSS selector to match elements.' },
            attribute: { type: 'string', description: 'The attribute to set.' },
            value: { type: 'string', description: 'The value to set.' },
          },
          required: ['path', 'selector', 'attribute', 'value']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_summarized_selector',
        description: 'Summarizes the content of elements matching the CSS selector in the specified HTML file.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'The file path to the HTML file.' },
            selector: { type: 'string', description: 'The CSS selector to match elements.' },
            level: { type: 'number', description: 'The depth of child elements to summarize. 0 for detailed information.' },
          },
          required: ['path', 'selector']
        }
      }
    }
  ],
  tools: {
    get_summarized_selector: function ({ path, selector, level = 0 }) {
      const fs = require('fs');
      const { JSDOM } = require('jsdom');

      // Load the HTML file
      const htmlContent = fs.readFileSync(path, 'utf8');
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;

      // Select elements and append the value
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (level === 0) {
          // Base case: detailed information
          summary.textSummary = element.textContent.slice(0, 100) + '...'; // First 100 chars
          summary.imageCount += element.querySelectorAll('img').length;
          summary.linkCount += element.querySelectorAll('a').length;
          summary.interactiveCount += element.querySelectorAll('input, button, select, textarea').length;
        } else {
          // Summarize child elements
          const children = element.children;
          for (let i = 0; i < children.length; i++) {
            let childSummary = summarizeHTMLElement(children[i], level - 1);
            summary.textSummary += childSummary.textSummary; // Concatenate text summaries
            summary.imageCount += childSummary.imageCount;
            summary.linkCount += childSummary.linkCount;
            summary.interactiveCount += childSummary.interactiveCount;
          }
          // Simplify the summary for this level
          summary.textSummary += `${summary.textSummary.substring(0, 50)}... (${children.length} elements)\n`;
        }
      });
      let summary = { textSummary: '', imageCount: 0, linkCount: 0, interactiveCount: 0 };
      return summary;
    },
    html_selector_append_child: function ({ path, selector, value }) {
      const fs = require('fs');
      const { JSDOM } = require('jsdom');

      // Load the HTML file
      const htmlContent = fs.readFileSync(path, 'utf8');
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;

      // Select elements and append the value
      const elements = document.querySelectorAll(selector);
      elements.forEach(ele => ele.innerHTML += value);

      // Save the updated HTML back to the file
      fs.writeFileSync(path, dom.serialize());

      return 'Content appended successfully.';
    },
    html_selector_replace_child: function ({ path, selector, value }) {
      const fs = require('fs');
      const { JSDOM } = require('jsdom');

      // Load the HTML file
      const htmlContent = fs.readFileSync(path, 'utf8');
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;

      // Select elements and replace the value
      const elements = document.querySelectorAll(selector);
      elements.forEach(ele => ele.innerHTML = value);

      // Save the updated HTML back to the file
      fs.writeFileSync(path, dom.serialize());

      return 'Content replaced successfully.';
    },
    html_selector_remove_child: function ({ path, selector, value }) {
      const fs = require('fs');
      const { JSDOM } = require('jsdom');

      // Load the HTML file
      const htmlContent = fs.readFileSync(path, 'utf8');
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;

      // Select elements and remove the value
      const elements = document.querySelectorAll(selector);
      elements.forEach(ele => ele.innerHTML = ele.innerHTML.replace(value, ''));

      // Save the updated HTML back to the file
      fs.writeFileSync(path, dom.serialize());

      return 'Content removed successfully.';
    },
    html_selector_get_child: function ({ path, selector }) {
      const fs = require('fs');
      const { JSDOM } = require('jsdom');

      // Load the HTML file
      const htmlContent = fs.readFileSync(path, 'utf8');
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;

      // Select elements and get the value
      const elements = document.querySelectorAll(selector);
      const values = [];
      elements.forEach(ele => values.push(ele.innerHTML));

      return values;
    },
    html_selector_get_attribute: function ({ path, selector, attribute }) {
      const fs = require('fs');
      const { JSDOM } = require('jsdom');

      // Load the HTML file
      const htmlContent = fs.readFileSync(path, 'utf8');
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;

      // Select elements and get the attribute
      const elements = document.querySelectorAll(selector);
      const values = [];
      elements.forEach(ele => values.push(ele.getAttribute(attribute)));

      return values;
    },
    html_selector_set_attribute: function ({ path, selector, attribute, value }) {
      const fs = require('fs');
      const { JSDOM } = require('jsdom');

      // Load the HTML file
      const htmlContent = fs.readFileSync(path, 'utf8');
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;

      // Select elements and set the attribute
      const elements = document.querySelectorAll(selector);
      elements.forEach(ele => ele.setAttribute(attribute, value));

      // Save the updated HTML back to the file
      fs.writeFileSync(path, dom.serialize());

      return 'Attribute set successfully.';
    }
  }
}

module.exports = toolSchema;