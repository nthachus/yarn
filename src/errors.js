export class MessageError extends Error {
  constructor(msg, code) {
    super(msg);
    this.code = code;
  }
}

export class ProcessSpawnError extends MessageError {
  constructor(msg, code, process) {
    super(msg, code);
    this.process = process;
  }
}

export class SecurityError extends MessageError {}

export class ProcessTermError extends MessageError {}

export class ResponseError extends Error {
  constructor(msg, responseCode) {
    super(msg);
    this.responseCode = responseCode;
  }
}

export class OneTimePasswordError extends Error {}
