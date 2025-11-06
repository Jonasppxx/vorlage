const fs = require('fs');
const vm = require('vm');
const path = require('path');

const file = path.join(process.cwd(), 'index.js');
let code = fs.readFileSync(file, 'utf8');
// remove BOM and shebang if present (handles CRLF/LF)
code = code.replace(/^\uFEFF?#!.*(\r?\n)/, '');
try {
  // Try to compile without executing
  new vm.Script(code, { filename: 'index.js' });
  console.log('PARSE_OK');
} catch (e) {
  console.error('PARSE_ERROR');
  console.error(e);
  process.exit(1);
}
