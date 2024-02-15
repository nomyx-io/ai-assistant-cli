// include all required libraries and dependencies in the tool file here
const fs = require('fs');
const pathModule = require('path');

const { exec } = require('child_process');
const os = require('os');

let cwd = process.cwd();

const toolSchema = {
  state: {
  },
  schemas: [
    {type: 'function', function: {name: 'call_npm_method', description: 'Calls a method from a npm library', parameters: {type: 'object', properties: {npmlib: {type: 'string', description: 'The name of the npm library'}, method: {type: 'string', description: 'The name of the method to be called'}, args: {type: 'string', description: 'The arguments to be passed to the method'}}, required: ['npmlib', 'method', 'args']}}},
    {type: 'function', function: {name: 'list_npm_libraries', description: 'Lists all npm libraries installed in the current directory'}},
    {type: 'function', function: {name: 'install_npm_library', description: 'Installs a new npm library', parameters: {type: 'object', properties: {library: {type: 'string', description: 'The name of the npm library to be installed'}}, required: ['library']}}},
    {type: 'function', function: {name: 'getsetcwd', description: 'Gets or sets the current working directory to the specified path', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The directory to which the current working directory should be updated'}}, required: []}}},
    {type: 'function', function: {name: 'cp', description: 'Copies a file from the source to the destination', parameters: {type: 'object', properties: {source: {type: 'string', description: 'The source file'}, destination: {type: 'string', description: 'The destination file'}}, required: ['source', 'destination']}}},
    {type: 'function', function: {name: 'mv', description: 'Moves a file from the source to the destination', parameters: {type: 'object', properties: {source: {type: 'string', description: 'The source file'}, destination: {type: 'string', description: 'The destination file'}}, required: ['source', 'destination']}}},
    {type: 'function', function: {name: 'rm', description: 'Removes a file or directory', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The file or directory to be removed'}}, required: ['path']}}},
    {type: 'function', function: {name: 'cat', description: 'Prints the contents of a file', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The file to be printed'}}, required: ['path']}}},
    {type: 'function', function: {name: 'grep', description: 'Searches for a pattern in a file', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The file to be printed'}, pattern: {type: 'string', description: 'The pattern to be searched'}}, required: ['path', 'pattern']}}},
    {type: 'function', function: {name: 'curl', description: 'Downloads a file from the internet', parameters: {type: 'object', properties: {url: {type: 'string', description: 'The URL of the file to be downloaded'}}, required: ['url']}}},
    {type: 'function', function: {name: 'head', description: 'Prints the first few lines of a file', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The file to be printed'}, lines: {type: 'number', description: 'The number of lines to be printed'}}, required: ['path', 'lines']}}},
    {type: 'function', function: {name: 'stat', description: 'Prints the status of a file', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The file to be printed'}}, required: ['path']}}},
    {type: 'function', function: {name: 'tail', description: 'Prints the last few lines of a file', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The file to be printed'}, lines: {type: 'number', description: 'The number of lines to be printed'}}, required: ['path', 'lines']}}},
    {type: 'function', function: {name: 'sed', description: 'Replaces a pattern with a replacement in a file', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The file to be printed'}, pattern: {type: 'string', description: 'The pattern to be replaced'}, replacement: {type: 'string', description: 'The replacement pattern'}}, required: ['path', 'pattern', 'replacement']}}},
    {type: 'function', function: {name: 'awk', description: 'Replaces a pattern with a replacement in a file', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The file to be printed'}, pattern: {type: 'string', description: 'The pattern to be replaced'}, replacement: {type: 'string', description: 'The replacement pattern'}}, required: ['path', 'pattern', 'replacement']}}},
    {type: 'function', function: {name: 'touch', description: 'Creates a new file if it does not already exist', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The path of the file to be created'}}, required: ['path']}}},
    {type: 'function', function: {name: 'ls', description: 'Lists all files and directories in the current directory', parameters: {type: 'object', properties: {directory: {type: 'string', description: 'The directory to list its contents'}, options: {type: 'string', description: 'Options for listing e.g., -l for detailed list'}}, required: ['directory']}}},
    {type: 'function', function: {name: 'chmod', description: 'Changes the mode of a file', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The file whose mode is to be changed'}, mode: {type: 'string', description: 'The new mode of the file (e.g., "755")'}}, required: ['path', 'mode']}}},
    {type: 'function', function: {name: 'ln', description: 'Creates a link to a file', parameters: {type: 'object', properties: {target: {type: 'string', description: 'The target file'}, linkName: {type: 'string', description: 'The name of the new link'}}, required: ['target', 'linkName']}}},
    {type: 'function', function: {name: 'mkdir', description: 'Creates a new directory', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The path of the directory to be created'}, recursive: {type: 'boolean', description: 'Whether to create parent directories as needed'}}, required: ['path']}}},
    {type: 'function', function: {name: 'rmdir', description: 'Removes a directory', parameters: {type: 'object', properties: {path: {type: 'string', description: 'The path of the directory to be removed'}}, required: ['path']}}},
    {type: 'function', function: {name: 'rename', description: 'Renames a file or directory', parameters: {type: 'object', properties: {oldPath: {type: 'string', description: 'The current path'}, newPath: {type: 'string', description: 'The new path'}}, required: ['oldPath', 'newPath']}}},
    {type: 'function', function: {name: 'find', description: 'Searches for files and directories based on a pattern', parameters: {type: 'object', properties: {directory: {type: 'string', description: 'The directory to search in'}, pattern: {type: 'string', description: 'The search pattern'}}, required: ['directory', 'pattern']}}},
  ],
  tools: {
    ls: async function ({directory, options = ''}) {
      return new Promise((resolve, reject) => {
        exec(`ls ${options?options:''} ${directory}`, (error, stdout, stderr) => { 
          if (error) { 
            console.error(`exec error: ${error}`); 
            resolve('error: ' + error + ' ' + stderr);
          } 
          resolve(stdout);
        }); 
      });
    },
    chmod: async function ({path, mode}) {
      return new Promise((resolve, reject) => {
        exec(`chmod ${mode} ${path}`, (error, stdout, stderr) => { 
          if (error) { 
            console.error(`exec error: ${error}`); 
            resolve('error: ' + error + ' ' + stderr);
          } 
          resolve(stdout);
        }); 
      });
    },
    ln: async function ({target, linkName}) {
      return new Promise((resolve, reject) => {
        exec(`ln -s ${target} ${linkName}`, (error, stdout, stderr) => { 
          if (error) { 
            console.error(`exec error: ${error}`); 
            resolve('error: ' + error + ' ' + stderr);
          } 
          resolve(stdout);
        }); 
      });
    },
    mkdir: async function ({path, recursive = false}) {
      return new Promise((resolve, reject) => {
        exec(`mkdir ${recursive?'-p':''} ${path}`, (error, stdout, stderr) => { 
          if (error) { 
            console.error(`exec error: ${error}`); 
            resolve('error: ' + error + ' ' + stderr);
          } 
          resolve(stdout);
        }); 
      });
    },
    rmdir: async function ({path}) {
      return new Promise((resolve, reject) => {
        exec(`rmdir ${path}`, (error, stdout, stderr) => { 
          if (error) { 
            console.error(`exec error: ${error}`); 
            resolve('error: ' + error + ' ' + stderr);
          } 
          resolve(stdout);
        }); 
      });
    },
    rename: async function ({oldPath, newPath}) {
      return new Promise((resolve, reject) => {
        exec(`mv ${oldPath} ${newPath}`, (error, stdout, stderr) => { 
          if (error) { 
            console.error(`exec error: ${error}`); 
            resolve('error: ' + error + ' ' + stderr);
          } 
          resolve(stdout);
        }); 
      });
    },
    find: async function ({directory, pattern}) {
      return new Promise((resolve, reject) => {
        exec(`find ${directory} -name ${pattern}`, (error, stdout, stderr) => { 
          if (error) { 
            console.error(`exec error: ${error}`); 
            resolve('error: ' + error + ' ' + stderr);
          } 
          resolve(stdout);
        }); 
      });
    },
    call_npm_method: async function ({npmlib, method, args}) {
      return new Promise((resolve, reject) => {
        let lib = require(npmlib);
        let methodArgs = args.split(',');
        let result = lib[method](...methodArgs);
        resolve(result);
      });
    },
    list_npm_libraries: async function () {
      return new Promise((resolve, reject) => {
        let packageJson = pathModule.join(cwd, 'package.json');
        if (!fs.existsSync(packageJson)) {
          resolve('No package.json found in the current directory');
        }
        let package = require(packageJson);
        let dependencies = package.dependencies || {};
        let devDependencies = package.devDependencies || {};
        let allDependencies = {...dependencies, ...devDependencies};
        let result = Object.keys(allDependencies);
        resolve(result);
      });
    },
    install_npm_library: async function ({library}) {
      return new Promise((resolve, reject) => {
        exec(`npm install ${library}`, (error, stdout, stderr) => { 
          if (error) { 
            console.error(`exec error: ${error}`); 
            resolve('error: ' + error + ' ' + stderr);
          } 
          resolve(stdout);
        }); 
      });
    },
    getsetcwd: async function ({path}) {
      if (path) {
        cwd = path;
      }
      return cwd;
    },
    cp: async function ({source, destination}) {
      return new Promise((resolve, reject) => {
        exec(`cp ${source} ${destination}`, (error, stdout, stderr) => { 
          if (error) { 
            console.error(`exec error: ${error}`); 
            resolve('error: ' + error + ' ' + stderr);
          } 
          resolve(stdout);
        }); 
      });
    },
    mv: async function ({source, destination}) {
      return new Promise((resolve, reject) => {
        exec(`mv ${source} ${destination}`, (error, stdout, stderr) => { 
          if (error) { 
            console.error(`exec error: ${error}`); 
            resolve('error: ' + error + ' ' + stderr);
          } 
          resolve(stdout);
        }); 
      });
    },
    rm: async function ({path}) {
      return new Promise((resolve, reject) => {
        exec(`rm -rf ${path}`, (error, stdout, stderr) => { 
          if (error) { 
            console.error(`exec error: ${error}`); 
            resolve('error: ' + error + ' ' + stderr);
          } 
          resolve(stdout);
        }); 
      });
    },
    cat: async function ({path}) {
      return new Promise((resolve, reject) => {
        exec(`cat ${path}`, (error, stdout, stderr) => { 
          if (error) { 
            console.error(`exec error: ${error}`); 
            resolve('error: ' + error + ' ' + stderr);
          }
          resolve(stdout);
        }); 
      });
    },
    grep: async function ({path, pattern}) {
      return new Promise((resolve, reject) => {
        exec(`grep ${pattern} ${path}`, (error, stdout, stderr) => { 
          if (error) { 
            console.error(`exec error: ${error}`); 
            resolve('error: ' + error + ' ' + stderr);
          }
          resolve(stdout);
        }); 
      });
    },
    curl: async function ({url}) {
      return new Promise((resolve, reject) => {
        exec(`curl ${url}`, (error, stdout, stderr) => { 
          if (error) { 
            console.error(`exec error: ${error}`); 
            resolve('error: ' + error + ' ' + stderr);
          }
          resolve(stdout);
        }); 
      });
    },
    head: async function ({path, lines}) {
      return new Promise((resolve, reject) => {
        exec(`head -n ${lines} ${path}`, (error, stdout, stderr) => { 
          if (error) { 
            console.error(`exec error: ${error}`); 
            resolve('error: ' + error + ' ' + stderr);
          }
          resolve(stdout);
        }); 
      });
    },
    stat: async function ({path}) {
      return new Promise((resolve, reject) => {
        exec(`stat ${path}`, (error, stdout, stderr) => { 
          if (error) { 
            console.error(`exec error: ${error}`); 
            resolve('error: ' + error + ' ' + stderr);
          }
          resolve(stdout);
        }); 
      });
    },
    tail: async function ({path, lines}) {
      return new Promise((resolve, reject) => {
        exec(`tail -n ${lines} ${path}`, (error, stdout, stderr) => { 
          if (error) { 
            console.error(`exec error: ${error}`); 
            resolve('error: ' + error + ' ' + stderr);
          }
          resolve(stdout);
        }); 
      });
    },
    sed: async function ({path, pattern, replacement}) {
      return new Promise((resolve, reject) => {
        exec(`sed -i 's/${pattern}/${replacement}/g' ${path}`, (error, stdout, stderr) => { 
          if (error) { 
            console.error(`exec error: ${error}`); 
            resolve('error: ' + error + ' ' + stderr);
          }
          resolve(stdout);
        }); 
      });
    },
    awk: async function ({path, pattern, replacement}) {
      return new Promise((resolve, reject) => {
        exec(`awk '{gsub(/${pattern}/, "${replacement}"); print}' ${path}`, (error, stdout, stderr) => { 
          if (error) { 
            console.error(`exec error: ${error}`); 
            resolve('error: ' + error + ' ' + stderr);
          }
          resolve(stdout);
        }); 
      });
    },
    touch: async function ({path}) {
      return new Promise((resolve, reject) => {
        exec(`touch ${path}`, (error, stdout, stderr) => { 
          if (error) { 
            console.error(`exec error: ${error}`); 
            resolve('error: ' + error + ' ' + stderr);
          }
          resolve(stdout);
        }); 
      });
    },
  }
}
module.exports = toolSchema;