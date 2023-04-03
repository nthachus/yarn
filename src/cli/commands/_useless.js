import {MessageError} from '../../errors.js';

export default function(message) {
  return {
    useless: true,
    run() {
      throw new MessageError(message);
    },
    setFlags: () => {},
    hasWrapper: () => true,
  };
}
