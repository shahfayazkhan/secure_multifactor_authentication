class AppError extends Error {
  /**
   * @param {string} message  Human readable message (safe to show to users)
   * @param {number} status   HTTP status code
   * @param {string} code     Machine readable error code for the client
   * @param {object} [details]
   */
  constructor(message, status = 400, code = 'BAD_REQUEST', details) {
    super(message);
    this.status = status;
    this.code = code;
    if (details) this.details = details;
  }
}

module.exports = AppError;
