import {
  ApiResponse,
  HttpMethod,
  RetryConfig,
  VercelApiError,
} from './types';

const VERCEL_API_BASE = 'https://api.vercel.com';

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

export class VercelClient {
  private readonly token: string;
  private readonly teamId?: string;
  private readonly retryConfig: RetryConfig;

  constructor(token: string, teamId?: string, retryConfig?: Partial<RetryConfig>) {
    this.token = token;
    this.teamId = teamId;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  private buildUrl(path: string, queryParams?: Record<string, string>): string {
    const url = new URL(path, VERCEL_API_BASE);
    
    if (this.teamId) {
      url.searchParams.set('teamId', this.teamId);
    }
    
    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        url.searchParams.set(key, value);
      }
    }
    
    return url.toString();
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private calculateBackoff(attempt: number): number {
    const delay = this.retryConfig.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    return Math.min(delay + jitter, this.retryConfig.maxDelayMs);
  }

  private isRetryableError(statusCode: number): boolean {
    return statusCode === 429 || statusCode >= 500;
  }

  private parseRateLimitRetryAfter(headers: Headers): number | null {
    const retryAfter = headers.get('retry-after');
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
    }
    return null;
  }

  async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path, queryParams);
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        };

        const options: RequestInit = {
          method,
          headers,
        };

        if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
          options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        
        if (response.ok) {
          if (response.status === 204) {
            return { success: true };
          }
          const data = await response.json() as T;
          return { success: true, data };
        }

        const errorBody = await response.json().catch(() => ({})) as Record<string, unknown>;
        const error: VercelApiError = {
          code: (errorBody.error as Record<string, unknown>)?.code as string || 'UNKNOWN_ERROR',
          message: (errorBody.error as Record<string, unknown>)?.message as string || response.statusText,
          statusCode: response.status,
        };

        if (this.isRetryableError(response.status) && attempt < this.retryConfig.maxRetries) {
          const retryDelay = this.parseRateLimitRetryAfter(response.headers) ?? this.calculateBackoff(attempt);
          console.log(`[VercelClient] Request failed with ${response.status}, retrying in ${retryDelay}ms (attempt ${attempt + 1}/${this.retryConfig.maxRetries})`);
          await this.sleep(retryDelay);
          continue;
        }

        return { success: false, error };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        
        if (attempt < this.retryConfig.maxRetries) {
          const retryDelay = this.calculateBackoff(attempt);
          console.log(`[VercelClient] Network error: ${errorMessage}, retrying in ${retryDelay}ms (attempt ${attempt + 1}/${this.retryConfig.maxRetries})`);
          await this.sleep(retryDelay);
          continue;
        }

        return {
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: errorMessage,
          },
        };
      }
    }

    return {
      success: false,
      error: {
        code: 'MAX_RETRIES_EXCEEDED',
        message: `Request failed after ${this.retryConfig.maxRetries} retries`,
      },
    };
  }

  async get<T>(path: string, queryParams?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, undefined, queryParams);
  }

  async post<T>(path: string, body?: unknown, queryParams?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body, queryParams);
  }

  async delete<T>(path: string, queryParams?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, undefined, queryParams);
  }

  async patch<T>(path: string, body?: unknown, queryParams?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, body, queryParams);
  }
}
