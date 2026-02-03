// Types génériques pour les réponses API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Type pour les erreurs API
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Type pour la pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
