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
    schemas: [
        { "type": "function", "function": {"name": "file_attach", "description": "attach a file to the assistant to make it available to the assistant [c, cpp, csv, docx, html, java, json, md, pdf, php, pptx, py, rb, tex, txt, css, jpeg, jpg, js, gif, png, tar, ts, xlsx, xml, zip] only", "parameters": {"type": "object", "properties": {"path": {"type": "string", "description": "The path to the file to attach"}}, "required": ["path"]}}},
        { "type": "function", "function": {"name": "file_list_attached", "description": "list the files attached to the assistant for thread with thread_id", "parameters": {"type": "object", "properties": {"thread_id": {"type": "string", "description": "The thread_id of the assistant"}}}}},
        { "type": 'function', "function": { "name": 'get_file_tree', "description": 'Return a tree of files and folders `n` levels deep from the specified `path`.', "parameters": { "type": 'object', "properties": { "value": { "type": 'string', "description": 'The directory path from which to start the exploration.' }, n: { "type": 'number', "description": 'The depth of exploration.' } }, "required": ['path', 'n'] } } },
        { "type": "function", "function": {"name": "file", "description": "Read, write, modify, and delete a file on the system. Supported operations are read, append, prepend, replace, insert_at, remove, delete, and copy.", "parameters": {"type": "object", "properties": {"operation": {"type": "string", "description": "The operation to perform on the file. Supported operations are read, append, prepend, replace, insert_at, remove, delete, and copy."}, "path": {"type": "string", "description": "The path to the file to perform the operation on."}, "match": {"type": "string", "description": "The string to match in the file. Regular expressions are supported."}, "data": {"type": "string", "description": "The data to write to the file."}, "position": {"type": "number", "description": "The position at which to perform the operation."}, "target": {"type": "string", "description": "The path to the target file."}}, "required": ["operation", "path"]}}},
    ],
    tools: {
        file: async function ({ operation, path, match, data, position, target }) {
            try {
                if (!fs.existsSync(path || target)) {
                    return `Error: File not found at path ${path || target}`;
                }
                let text = fs.readFileSync(path, 'utf8');
                switch (operation) {
                    case 'read':
                        return text;
                    case 'append':
                        text += data;
                        break;
                    case 'prepend':
                        text = data + text;
                        break;
                    case 'replace':
                        text = text.replace(match, data);
                        break;
                    case 'insert_at':
                        text = text.slice(0, position) + data + text.slice(position);
                        break;
                    case 'remove':
                        text = text.replace(match, '');
                        break;
                    case 'delete':
                        fs.unlinkSync(path);
                        break;
                    case 'copy':
                        fs.copyFileSync(path, target);
                        break;
                    default:
                        return `Error: Unsupported operation ${operation}`;
                }
                fs.writeFileSync(path, text);
                return `Successfully executed ${operation} operation on file at path ${path}`;
            } catch (error) {
                return `Error: ${error.message}`
            }
        },
        file_batch: async function ({ operations }) {
            try {
                for (const { operation, path, match, data, position, target } of operations) {
                    if (!fs.existsSync(path || target)) {
                        return `Error: File not found at path ${path || target}`;
                    }
                    let text = fs.readFileSync(path, 'utf8');
                    switch (operation) {
                        case 'read':
                            return text;
                        case 'append':
                            text += data;
                            break;
                        case 'prepend':
                            text = data + text;
                            break;
                        case 'replace':
                            text = text.replace(match, data);
                            break;
                        case 'insert_at':
                            text = text.slice(0, position) + data + text.slice(position);
                            break;
                        case 'remove':
                            text = text.replace(match, '');
                            break;
                        case 'delete':
                            fs.unlinkSync(path);
                            break;
                        case 'copy':
                            fs.copyFileSync(path, target);
                            break;
                        default:
                            return `Error: Unsupported operation ${operation}`;
                    }
                    fs.writeFileSync(path, text);
                }
                return `Successfully executed batch operations on file at path ${path}`;
            } catch (error) {
                return `Error: ${error.message}`
            }
        },
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