'use strict';
const fs=require('node:fs'),path=require('node:path');
require('./check.cjs');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'extension','manifest.json'),'utf8'));
const output=path.join(root,'dist','ChatGPT流畅助手-'+manifest.version);
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.cpSync(path.join(root,'extension'),output,{recursive:true});
console.log('Built '+output);
