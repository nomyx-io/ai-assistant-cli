// import fs from 'fs';
// import path from 'path';
const fs = require('fs');
const path = require('path');

module.exports = {
    state: {
        modules: [{
            name: 'files',
            description: 'File manipulation tools',
            version: '0.0.1',
        }],
    },
    schemas: [{
        type: 'function',
        function: {
            name: 'file_attach',
            description: 'attach a file to the assistant to make it available to the assistant [c, cpp, csv, docx, html, java, json, md, pdf, php, pptx, py, rb, tex, txt, css, jpeg, jpg, js, gif, png, tar, ts, xlsx, xml, zip] only',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'The path to the file to attach'
                    }
                },
                required: ['path']
            }
        },
    }, {
        type: 'function',
        function: {
            name: 'file_batch_edit',
            description: 'execute a series of edit operations on the file at the given path in the order they are provided. Supported operations: replace, remove, insert, append, prepend',
            parameters: {
                type: 'object',
                properties: {
                    operations: {
                        type: 'array',
                        description: 'The operations to execute.',
                        items: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string',
                                    description: 'The name of the operation to execute. Supported operations: replace, remove, insert, append, prepend'
                                },
                                parameters: {
                                    type: 'object',
                                    description: 'The parameters to pass to the operation.',
                                    additionalProperties: true
                                }
                            },
                            required: ['name']
                        }
                    },
                    path: {
                        type: 'string',
                        description: 'The full path to the file to edit.'
                    }
                },
                required: ['operations', 'path']
            }
        },
    },{
        type: 'function',
        function: {
            name: 'file_list_attached',
            description: 'list the files attached to the assistant for thread with thread_id',
            parameters: {
                type: 'object',
                properties: {
                    thread_id: {
                        type: 'string',
                        description: 'The thread_id of the assistant'
                    },
                },
            }
        },
    },
    { type: 'function', function: { name: 'get_file_tree', description: 'Return a tree of files and folders `n` levels deep from the specified `path`.', parameters: { type: 'object', properties: { value: { type: 'string', description: 'The directory path from which to start the exploration.' }, n: { type: 'number', description: 'The depth of exploration.' } }, required: ['path', 'n'] } } }
    ],
    tools: {
        file_attach: async function ({ path }, assistant) {
            try {
                if (!fs.existsSync(path)) {
                    return `Error: File ${path} does not exist`;
                }
                const supportedFormats = ['c', 'cpp', 'csv', 'docx', 'html', 'java', 'json', 'md', 'pdf', 'php', 'pptx', 'py', 'rb', 'tex', 'txt', 'css', 'jpeg', 'jpg', 'js', 'gif', 'png', 'tar', 'ts', 'xlsx', 'xml', 'zip'];
                const extension = path.split('.').pop();
                if (!extension || !supportedFormats.includes(extension)) {
                    return `Error: File ${path} has an unsupported format`;
                }
                const ret = assistant.attachFile(path);
                return ret && `Successfully attached file ${path} to assistant ${assistant.name}` || `Error attaching file ${path} to assistant ${assistant.name}`;
            } catch (err) {
                return `Error attaching file ${path} to assistant ${assistant.name}: ${err.message}`
            }
        },
        file_batch_edit: async ({ operations, path }) => {
            try {
                if (!fs.existsSync(path)) {
                    return `Error: File not found at path ${path}`;
                }
                let text = fs.readFileSync(path, 'utf8');
                text = executeBatchOperations(text, operations);
                fs.writeFileSync(path, text);
                return `Successfully executed batch edit operations on file at path ${path}`
            } catch (error) {
                return `Error: ${error.message}`
            }
        },
        file_list_attached: async function (_dummy, assistant) {
            try {
                if (!assistant) {
                    return `Error: Could not create assistant`;
                }
                const myAssistantFiles = await assistant.listFiles();
                return JSON.stringify(myAssistantFiles);
            } catch (err) {
                return `Error: ${err.message}`
            }
        },
        file_read_window: async ({ path }) => {
            try {
                const ret = await readFileAsync(path, { encoding: 'utf8' });
                return ret;
            } catch (err) {
                return `Error reading ${path}: ${err.message}`
            }
        },
        get_file_tree: async ({ value, n }) => {
            const explore = (dir, depth) => {
                if (depth < 0) return null;
                const directoryTree = { path: dir, children: [] };
                const fsd = fs.readdirSync(dir, { withFileTypes: true })
                try {
                    fsd.forEach(dirent => {
                        const fullPath = path.join(dir, dirent.name); // Use pathModule instead of path
                        if (dirent.isDirectory()) {
                            directoryTree.children.push(explore(fullPath, depth - 1));
                        } else {
                            directoryTree.children.push({ path: fullPath });
                        }
                    });
                } catch (e) { }
                return directoryTree;
            };
            return explore(value, n);
        }
    }
}