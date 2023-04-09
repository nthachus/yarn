'use strict';
exports.__esModule = true;
exports.SecurityError =
  exports.ResponseError =
  exports.ProcessTermError =
  exports.ProcessSpawnError =
  exports.OneTimePasswordError =
  exports.MessageError =
    void 0;

class MessageError extends Error {
  constructor(msg, code) {
    super(msg);
    this.code = code;
  }
}
exports.MessageError = MessageError;

class ProcessSpawnError extends MessageError {
  constructor(msg, code, process) {
    super(msg, code);
    this.process = process;
  }
}
exports.ProcessSpawnError = ProcessSpawnError;

class SecurityError extends MessageError {}
exports.SecurityError = SecurityError;

class ProcessTermError extends MessageError {
  constructor(msg, code) {
    super(msg, code);
    this.EXIT_CODE = void 0;
    this.EXIT_SIGNAL = void 0;
  }
}
exports.ProcessTermError = ProcessTermError;

class ResponseError extends Error {
  constructor(msg, responseCode) {
    super(msg);
    this.responseCode = responseCode;
  }
}
exports.ResponseError = ResponseError;

class OneTimePasswordError extends Error {
  constructor(notice) {
    super();
    this.notice = notice;
  }
}
exports.OneTimePasswordError = OneTimePasswordError;
