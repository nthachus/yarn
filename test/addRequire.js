import {URL} from 'url';
import {createRequire} from 'module';

const require = createRequire(new URL('../src/lockfile/', import.meta.url));

global.module = {children: 'false'};
global.__dirname = new URL('../src', import.meta.url).pathname;

// this will make require at the global scobe and treat it like the original require
export default global.require = require;
