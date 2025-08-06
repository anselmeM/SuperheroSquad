export class ApiHttpError extends Error {
  public response: { status: number; statusText: string; body?: string | null };

  constructor(message: string, status: number, statusText: string, body?: string | null) {
    super(message);
    this.name = 'ApiHttpError';
    this.response = { status, statusText, body };
  }
}
