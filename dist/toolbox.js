"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Toolbox = void 0;
var path_1 = __importDefault(require("path"));
var fs_1 = __importDefault(require("fs"));
var Toolbox = /** @class */ (function () {
    function Toolbox(persona, tools, schemas, state) {
        this.persona = persona;
        this.tools = tools;
        this.schemas = schemas;
        this.state = state;
    }
    Toolbox.prototype.addTool = function (tool, schema, state) {
        var toolName = tool.name || '';
        this.tools[toolName] = tool;
        this.schemas.push(schema);
        this.state = __assign(__assign({}, this.state), state);
        this[toolName] = tool.bind(this);
    };
    Toolbox.prototype.getTool = function (tool) {
        var _a;
        var schema = this.schemas.find(function (schema) { return schema.function.name === tool; });
        return _a = {},
            _a[tool] = this.tools[tool],
            _a.schema = schema,
            _a;
    };
    Toolbox.prototype.setState = function (vv, value) {
        this.state[vv] = value;
    };
    Toolbox.prototype.getState = function (vv) {
        return this.state[vv];
    };
    Toolbox.loadToolbox = function (appDir, __toolbox) {
        var toolbox = new Toolbox(__toolbox.prompt, __toolbox.tools, __toolbox.schemas, __toolbox.state);
        var toolsFolder = path_1.default.join(__dirname, 'tools');
        var toolNames = [];
        if (fs_1.default.existsSync(toolsFolder)) {
            var files = fs_1.default.readdirSync(toolsFolder);
            files.forEach(function (file) {
                var t = require(path_1.default.join(toolsFolder, file));
                Object.keys(t.tools).forEach(function (key) {
                    var toolFunc = t.tools[key];
                    var schema = t.schemas.find(function (schema) { return schema.function.name === key; });
                    toolbox.addTool(toolFunc, schema, t.state);
                    toolNames.push(key);
                });
            });
        }
        else {
            fs_1.default.mkdirSync(path_1.default.join(appDir, 'tools'));
        }
        return toolbox;
    };
    return Toolbox;
}());
exports.Toolbox = Toolbox;
//# sourceMappingURL=toolbox.js.map