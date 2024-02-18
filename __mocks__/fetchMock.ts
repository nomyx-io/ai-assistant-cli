import { Response as OriginalResponse, RequestInit } from 'node-fetch';
const { default: originalFetch } = jest.requireActual('node-fetch');

export const Response = OriginalResponse; // Export the original Response for use in mock implementations

// Mock fetch and ensure it returns a Response object
export default function fetch(url: string, init?: RequestInit) {
  
  return {
    json: async () => {
      return { data: 'mocked data' };
    },
  }
}
