export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiErrorResponse {
  message: string;
  details?: Record<string, string[]>;
}

export type ID = string;
