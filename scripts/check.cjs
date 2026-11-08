'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..','extension');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
if(manifest.manifest_version!==3)throw Error('Expected Manifest V3');
if(manifest.permissions.some(p=>!['storage','activeTab'].includes(p)))throw Error('Unexpected permission');
for(const c of manifest.content_scripts)for(const n of [...c.js||[],...c.css||[]])if(!fs.existsSync(path.join(root,n)))throw Error('Missing resource: '+n);
function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())visit(file);else if(entry.name.endsWith('.js'))new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});}}
visit(root);
for(const css of ['katex.min.css','katex-fonts.css'])for(const match of fs.readFileSync(path.join(root,css),'utf8').matchAll(/url\(([^)]+)\)/g))if(!fs.existsSync(path.join(root,match[1].replace(/["']/g,''))))throw Error('Missing font: '+match[1]);
const hashes=JSON.parse(fs.readFileSync(path.join(root,'文件校验.json'),'utf8'));
for(const [name,expected]of Object.entries(hashes)){const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex');if(actual!==expected)throw Error('Checksum mismatch: '+name);}
console.log(`Validated ${manifest.name} ${manifest.version}: syntax, resources, permissions and ${Object.keys(hashes).length} checksums.`);
