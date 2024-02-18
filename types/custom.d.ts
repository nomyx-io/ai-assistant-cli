// custom.d.ts
import 'jest-fetch-mock';

declare global {
  function fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
  
  namespace fetch {
    // Declare the additional jest-fetch-mock methods here
    export function mockResponseOnce(body: string, init?: RequestInit): Promise<Response>;
    export function resetMocks(): void;
  }
}
