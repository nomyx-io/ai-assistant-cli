import path from 'path';
import fs from 'fs';

import { State } from "./api";

export type Tool = { 
    (this: Toolbox, ...args: any[]): any;  
    name?: string; 
    bind?: any; 
};

export interface Tools {
    [key: string]: Tool;
}

export interface Schema {
    function: {
        name: string;
        arguments: any[];
    };
}

export class Toolbox {

    constructor(public persona: string, public tools: Tools, public schemas: Schema[], public state: State) {
    }

    addTool(tool: Tool, schema: any, state: any): void {
        const toolName: string = tool.name || '';
        this.tools[toolName] = tool;
        this.schemas.push(schema);
        this.state = { ...this.state, ...state };
        (this as any)[toolName] = tool.bind(this);
    }
    getTool(tool: string | number): any {
        const schema = this.schemas.find((schema: { function: { name: any; }; }) => schema.function.name === tool);
        return {
            [tool]: this.tools[tool],
            schema
        }
    }
    setState(vv: string | number, value: any) {
        this.state[vv] = value;
    }
    getState(vv: string | number): any {
        return this.state[vv];
    }
    static loadToolbox(appDir: any, __toolbox: any) {
        const toolbox = new Toolbox(__toolbox.prompt, __toolbox.tools, __toolbox.schemas, __toolbox.state);
        const toolsFolder = path.join(__dirname, 'tools')
        const toolNames: string[] = [];
        if (fs.existsSync(toolsFolder)) {
            const files = fs.readdirSync(toolsFolder);
            files.forEach((file: any) => {
                const t = require(path.join(toolsFolder, file))
                Object.keys(t.tools).forEach((key: string) => {
                    const toolFunc = t.tools[key];
                    const schema = t.schemas.find((schema: { function: { name: string; }; }) => schema.function.name === key);
                    toolbox.addTool(toolFunc, schema, t.state);
                    toolNames.push(key);
                })
            });
        } else {
            fs.mkdirSync(path.join(appDir, 'tools'));
        }
        return toolbox;
    }
}
