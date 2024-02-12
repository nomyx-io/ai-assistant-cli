const shell = require('shelljs');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');


module.exports = {
    schemas: [{
        type: 'function',
        function: {
            name: 'execute_bash_command',
            description: 'execute an arbitrary Bash command',
            parameters: {
                type: 'object',
                properties: {
                    command: {
                        type: 'string',
                        description: 'Bash command to run'
                    }
                },
                required: ['command']
            }
        }
    },{
        type: 'function',
        function: {
            name: 'execute_nodejs_code',
            description: 'execute arbitrary JavaScript code in node.js and return the result',
            parameters: {
                type: 'object',
                properties: {
                    js: {
                        type: 'string',
                        description: 'JavaScript code to run'
                    }
                },
                required: ['js']
            }
        }
    },{
        type: "function",
        function: {
            name: "execute_python_code",
            description: "execute arbitrary Python code and return the result",
            parameters: {
                type: "object",
                properties: {
                    python: {
                        type: "string",
                        description: "Python code to run"
                    }
                },
                required: ["python"]
            }
        }
    },{
        type: "function",
        function: {
            name: "execute_nodejs_file",
            description: "execute a file containing JavaScript code in node.js and return the result",
            parameters: {
                type: "object",
                properties: {
                    file: {
                        type: "string",
                        description: "JavaScript file to run"
                    }
                },
                required: ["file"]
            }

        }
    },{
        type: "function",
        function: {
            name: "execute_python_file",
            description: "execute a file containing Python code and return the result",
            parameters: {
                type: "object",
                properties: {
                    file: {
                        type: "string",
                        description: "Python file to run"
                    }
                },
                required: ["file"]
            }
        }
    }],
    tools: {
        execute_bash_command: async ({ command }) => {
            return new Promise((resolve, reject) => {
                shell.exec(command, { silent: true }, (code, stdout, stderr) => {
                    if (code === 0) {
                        resolve(stdout);
                    } else {
                        resolve(`${stdout}\n${stderr}`)
                    }
                });
            });
        },
        execute_nodejs_code: async ({ js }) => {
            return new Promise((resolve, reject) => {
                try {
                    const fileName = path.join(__dirname, new Date().getTime() + ".js");
                    fs.writeFileSync(fileName, js);
                    exec(`node ${fileName}`, ((error, stdout, stderr) => {
                        fs.unlinkSync(fileName);
                        if (error) {
                            resolve(error.message);
                        } else if (stderr) {
                            resolve(stderr);
                        } else {
                            resolve(JSON.stringify(stdout));
                        }
                    } ));
                } catch (err) {
                    resolve(err.message);
                }
            });
        },
        execute_python_code: async ({ python }) => {
            return new Promise((resolve, _reject) => {
                try {
                    const fileName = path.join(__dirname, new Date().getTime() + ".py");
                    fs.writeFileSync(fileName, python);
                    exec(`python ${fileName}`, (error, stdout, stderr) => {
                        fs.unlinkSync(fileName);
                        if (error) {
                            resolve(error.message);
                        } else if (stderr) {
                            resolve(JSON.stringify(stderr));
                        } else {
                            resolve(JSON.stringify(stdout));
                        }
                    });
                } catch (err) {
                    resolve(err.message);
                }
            });
        },
        execute_nodejs_file: async ({ file }) => {
            return new Promise((resolve, reject) => {
                try {
                    const fileName = path.join(__dirname, file);
                    exec(`node ${fileName}`, ((error, stdout, stderr) => {
                        if (error) {
                            resolve(error.message);
                        } else if (stderr) {
                            resolve(stderr);
                        } else {
                            resolve(stdout);
                        }
                    } ));
                } catch (err) {
                    resolve(err.message);
                }
            });
        },
        execute_python_file: async ({ file }) => {
            return new Promise((resolve, _reject) => {
                try {
                    const fileName = path.join(__dirname, file);
                    exec(`python ${fileName}`, (error, stdout, stderr) => {
                        if (error) {
                            resolve(error.message);
                        } else if (stderr) {
                            resolve(stderr);
                        } else {
                            resolve(stdout);
                        }
                    });
                } catch (err) {
                    resolve(err.message);
                }
            });
        }
    }
}