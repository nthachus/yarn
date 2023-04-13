'use strict';
exports.__esModule = true;
exports.default = void 0;

var _util = require('./util.js');

class Spinner {
  constructor(stdout, lineNumber) {
    if (stdout === void 0) stdout = process.stderr;
    if (lineNumber === void 0) lineNumber = 0;
    this.current = 0;
    this.prefix = '';
    this.lineNumber = lineNumber;
    this.stdout = stdout;
    this.delay = 60;
    this.chars = Spinner.spinners[28].split('');
    this.text = '';
    this.id = null;
  }

  setPrefix(prefix) {
    this.prefix = prefix;
  }
  setText(text) {
    this.text = text;
  }
  start() {
    this.current = 0;
    this.render();
  }
  render() {
    if (this.id) {
      clearTimeout(this.id);
    }
    // build line ensuring we don't wrap to the next line
    var msg = `${this.prefix}${this.chars[this.current]} ${this.text}`;
    var columns = typeof this.stdout.columns === 'number' ? this.stdout.columns : 100;
    msg = msg.slice(0, columns);
    (0, _util.writeOnNthLine)(this.stdout, this.lineNumber, msg);
    this.current = ++this.current % this.chars.length;
    this.id = setTimeout(() => this.render(), this.delay);
  }
  stop() {
    if (this.id) {
      clearTimeout(this.id);
      this.id = null;
    }
    (0, _util.clearNthLine)(this.stdout, this.lineNumber);
  }
}
exports.default = Spinner;

Spinner.spinners = [
  '|/-\\',
  '⠂-–—–-',
  '◐◓◑◒',
  '◴◷◶◵',
  '◰◳◲◱',
  '▖▘▝▗',
  '■□▪▫',
  '▌▀▐▄',
  '▉▊▋▌▍▎▏▎▍▌▋▊▉',
  '▁▃▄▅▆▇█▇▆▅▄▃',
  '←↖↑↗→↘↓↙',
  '┤┘┴└├┌┬┐',
  '◢◣◤◥',
  '.oO°Oo.',
  '.oO@*',
  '🌍🌎🌏',
  '◡◡ ⊙⊙ ◠◠',
  '☱☲☴',
  '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏',
  '⠋⠙⠚⠞⠖⠦⠴⠲⠳⠓',
  '⠄⠆⠇⠋⠙⠸⠰⠠⠰⠸⠙⠋⠇⠆',
  '⠋⠙⠚⠒⠂⠂⠒⠲⠴⠦⠖⠒⠐⠐⠒⠓⠋',
  '⠁⠉⠙⠚⠒⠂⠂⠒⠲⠴⠤⠄⠄⠤⠴⠲⠒⠂⠂⠒⠚⠙⠉⠁',
  '⠈⠉⠋⠓⠒⠐⠐⠒⠖⠦⠤⠠⠠⠤⠦⠖⠒⠐⠐⠒⠓⠋⠉⠈',
  '⠁⠁⠉⠙⠚⠒⠂⠂⠒⠲⠴⠤⠄⠄⠤⠠⠠⠤⠦⠖⠒⠐⠐⠒⠓⠋⠉⠈⠈',
  '⢄⢂⢁⡁⡈⡐⡠',
  '⢹⢺⢼⣸⣇⡧⡗⡏',
  '⣾⣽⣻⢿⡿⣟⣯⣷',
  '⠁⠂⠄⡀⢀⠠⠐⠈',
];
