export class LightLeaderboardError extends Error {
  /** HTTP status code returned by the API */
  readonly status: number;
  /** Raw response body from the API */
  readonly response: unknown;

  constructor(message: string, status: number, response: unknown) {
    super(message);
    this.name = 'LightLeaderboardError';
    this.status = status;
    this.response = response;
    // Restore prototype chain in environments that need it
    Object.setPrototypeOf(this, new.target.prototype);
  }

  get isAuthError() {
    return this.status === 401 || this.status === 403;
  }

  get isRateLimitError() {
    return this.status === 429;
  }

  get isBillingError() {
    return this.status === 402;
  }

  get isValidationError() {
    return this.status === 400;
  }
}
