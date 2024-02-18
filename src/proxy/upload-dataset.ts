const path = require('path');
const { HuggingFaceApi } = require('huggingface');

const ConfigurationManager = require('openai').ConfigurationManager;

// Configuration: Set your mock server URL and Hugging Face API key
const mockServerUrl = configManager.MOCKSERVER_URL || 'http://localhost:8654/_/dataset';
const huggingFaceApiKey = configManager.HUGGINGFACE_API_KEY || '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';
const datasetBaseName = configManager.DATASET_BASENAME || 'mockserver-dataset';
const updateDataset = configManager.UPDATE_DATASET || false;
const outputDir = configManager.OUTPUT_DIR || 'output';
const organization = configManager.ORGANIZATION || 'lonestar108';

const hfApi = new HuggingFaceApi({ apiKey: huggingFaceApiKey });

// Function to request the dataset from the mock server
async function requestDataset() {
    try {
        const response = await fetch(mockServerUrl);
        const data = await response.json();
        return data;
    } catch (error) {
        return console.error('Error fetching dataset:', error);
    }
}

// Function to upload dataset to Hugging Face
async function uploadDataset(dataset: any[]) {
    // Define your dataset repository name and organization (or username)
    const datasetRepo = datasetBaseName; // Replace with your dataset repository name
    const organization = 'lonestar108'; // Replace with your organization or username
    const filePath = path.join(outputDir, `${datasetRepo}.json`);
    const datasetFileContent = JSON.stringify(dataset);
    try {
        // Upload the file to your dataset repository
        const uploadResponse = await hfApi.uploadFile(datasetRepo, organization, datasetFileContent, filePath);
        console.log('Dataset uploaded successfully:', uploadResponse);
    } catch (error) {
        console.error('Error uploading dataset to Hugging Face:', error);
    }
}

// Main function to run the script
async function main() {
    const dataset = await requestDataset();
    if (dataset && dataset.length > 0) {
        await uploadDataset(dataset);
    } else {
        console.log('No dataset received or dataset is empty.');
    }
}

main();
