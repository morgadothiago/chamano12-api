export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page: number;
    total: number;
    limit: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
  };
}
