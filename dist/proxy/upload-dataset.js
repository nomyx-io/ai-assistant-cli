"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var path = require('path');
var HuggingFaceApi = require('huggingface').HuggingFaceApi;
var ConfigurationManager = require('openai').ConfigurationManager;
// Configuration: Set your mock server URL and Hugging Face API key
var mockServerUrl = configManager.MOCKSERVER_URL || 'http://localhost:8654/_/dataset';
var huggingFaceApiKey = configManager.HUGGINGFACE_API_KEY || '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';
var datasetBaseName = configManager.DATASET_BASENAME || 'mockserver-dataset';
var updateDataset = configManager.UPDATE_DATASET || false;
var outputDir = configManager.OUTPUT_DIR || 'output';
var organization = configManager.ORGANIZATION || 'lonestar108';
var hfApi = new HuggingFaceApi({ apiKey: huggingFaceApiKey });
// Function to request the dataset from the mock server
function requestDataset() {
    return __awaiter(this, void 0, void 0, function () {
        var response, data, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch(mockServerUrl)];
                case 1:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _a.sent();
                    return [2 /*return*/, data];
                case 3:
                    error_1 = _a.sent();
                    return [2 /*return*/, console.error('Error fetching dataset:', error_1)];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Function to upload dataset to Hugging Face
function uploadDataset(dataset) {
    return __awaiter(this, void 0, void 0, function () {
        var datasetRepo, organization, filePath, datasetFileContent, uploadResponse, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    datasetRepo = datasetBaseName;
                    organization = 'lonestar108';
                    filePath = path.join(outputDir, "".concat(datasetRepo, ".json"));
                    datasetFileContent = JSON.stringify(dataset);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, hfApi.uploadFile(datasetRepo, organization, datasetFileContent, filePath)];
                case 2:
                    uploadResponse = _a.sent();
                    console.log('Dataset uploaded successfully:', uploadResponse);
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    console.error('Error uploading dataset to Hugging Face:', error_2);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Main function to run the script
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var dataset;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, requestDataset()];
                case 1:
                    dataset = _a.sent();
                    if (!(dataset && dataset.length > 0)) return [3 /*break*/, 3];
                    return [4 /*yield*/, uploadDataset(dataset)];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    console.log('No dataset received or dataset is empty.');
                    _a.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
main();
//# sourceMappingURL=upload-dataset.js.map