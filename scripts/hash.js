const b = require('bcryptjs');
const pw = 'Manager123!';
console.log(b.hashSync(pw, 10));
