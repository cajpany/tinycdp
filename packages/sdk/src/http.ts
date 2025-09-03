import type { HTTPResponse, HTTPError, Logger } from './types';

/**
 * HTTP client for making requests to TinyCDP API
 */
export class HTTPClient {
  constructor(
    private baseURL: string,
    private timeout: number = 15000,
    private logger: Logger
  ) {}

  /**
   * Make an HTTP request
   */
  async request<T = unknown>(
    method: string,
    path: string,
    options: {
      headers?: Record<string, string>;
      body?: unknown;
      timeout?: number;
    } = {}
  ): Promise<HTTPResponse<T>> {
    const url = this.baseURL + path;
    const timeout = options.timeout || this.timeout;

    this.logger.debug(`HTTP ${method} ${url}`, { 
      headers: options.headers,
      bodyType: typeof options.body 
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'TinyCDP-SDK/1.0.0',
        ...options.headers,
      };

      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (options.body !== undefined) {
        fetchOptions.body = JSON.stringify(options.body);
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      let responseData: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json() as T;
      } else {
        responseData = await response.text() as unknown as T;
      }

      if (!response.ok) {
        const error: HTTPError = new Error(
          `HTTP ${response.status}: ${response.statusText}`
        );
        error.status = response.status;
        error.statusText = response.statusText;
        error.response = typeof responseData === 'string' 
          ? responseData 
          : JSON.stringify(responseData);
        
        this.logger.error('HTTP request failed', {
          method,
          url,
          status: response.status,
          statusText: response.statusText,
          response: error.response
        });
        
        throw error;
      }

      this.logger.debug(`HTTP ${method} ${url} succeeded`, {
        status: response.status,
        responseType: typeof responseData
      });

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
      };

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError: HTTPError = new Error(`Request timeout after ${timeout}ms`);
        this.logger.error('HTTP request timed out', { method, url, timeout });
        throw timeoutError;
      }

      this.logger.error('HTTP request error', { 
        method, 
        url, 
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T = unknown>(
    path: string, 
    options: { headers?: Record<string, string>; timeout?: number } = {}
  ): Promise<HTTPResponse<T>> {
    return this.request<T>('GET', path, options);
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    path: string,
    body?: unknown,
    options: { headers?: Record<string, string>; timeout?: number } = {}
  ): Promise<HTTPResponse<T>> {
    return this.request<T>('POST', path, { ...options, body });
  }
}
