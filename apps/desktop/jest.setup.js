// eslint-disable-next-line @typescript-eslint/no-require-imports
const { TextEncoder, TextDecoder } = require('util');

Object.assign(global, { TextEncoder, TextDecoder });

// React 19: enable concurrent act() environment in Jest
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
