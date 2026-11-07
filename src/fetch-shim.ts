const nativeFetch =
  typeof window !== 'undefined' && window.fetch
    ? window.fetch.bind(window)
    : globalThis.fetch?.bind(globalThis);

export const fetch = nativeFetch;
export const Headers = typeof window !== 'undefined' ? window.Headers : globalThis.Headers;
export const Request = typeof window !== 'undefined' ? window.Request : globalThis.Request;
export const Response = typeof window !== 'undefined' ? window.Response : globalThis.Response;
export default nativeFetch;
