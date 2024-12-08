export interface ScrapeRequest {
  url: string;
  prompt: string;
}

export interface ScrapeResponse {
  message?: string;
  error?: string;
  details?: any;
} 