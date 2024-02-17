// include all required libraries and dependencies in the tool file here
const fs = require('fs');
const pathModule = require('path');

const { exec } = require('child_process');
const os = require('os');

let cwd = process.cwd();

module.exports = {
  state: {
  },
  schemas: [
    {type: 'function', function: {name: 'npm_call_npm_method', description: 'Calls a method from a npm library', parameters: {type: 'object', properties: {npmlib: {type: 'string', description: 'The name of the npm library'}, method: {type: 'string', description: 'The name of the method to be called'}, args: {type: 'string', description: 'The arguments to be passed to the method'}}, required: ['npmlib', 'method', 'args']}}},
    {type: 'function', function: {name: 'npm_list_npm_libraries', description: 'Lists all npm libraries installed in the current directory'}},
    {type: 'function', function: {name: 'npm_install_npm_library', description: 'Installs a new npm library', parameters: {type: 'object', properties: {library: {type: 'string', description: 'The name of the npm library to be installed'}}, required: ['library']}}},
  ],
  tools: {
    npm_list_npm_libraries: async function (_, run) {
      return new Promise((resolve, reject) => {
        let packageJson = pathModule.join(cwd, 'package.json');
        if (!fs.existsSync(packageJson)) {
          resolve('No package.json found in the current directory');
        }
        let package = require(packageJson);
        let dependencies = package.dependencies || {};
        let devDependencies = package.devDependencies || {};
        let allDependencies = {...dependencies, ...devDependencies};
        let result = JSON.stringify( Object.keys(allDependencies) );
        resolve(result);
      });
    },
    npm_install_npm_library: async function ({library}, run) {
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
    npm_call_npm_method: async function ({npmlib, method, args}, run) {
      let lib = require(npmlib);
      let result = lib[method](args);
      return JSON.stringify(result);
    }
  }
}