import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<22||(major===22&&minor<9)){console.error('Install Node.js 22.9 or newer: https://nodejs.org');process.exit(1);}
process.chdir(root);
if(!fs.existsSync('.env'))fs.copyFileSync('.env.example','.env');
process.loadEnvFile(path.join(root,'.env'));
try{const {server}=await import('./server.mjs');server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Port is in use. Stop the previous server or change PORT in .env.':'Server failed: '+error.message);process.exitCode=1;});}catch(error){console.error('Startup failed: '+error.message);process.exitCode=1;}
