import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,chmod,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile);
test('updater retries stale runtime even if Git HEAD already equals target and respects CI',async t=>{
 const root=await mkdtemp(join(tmpdir(),'study-deploy-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(join(root,'bin'));await mkdir(join(root,'scripts'));
 const sha='a'.repeat(40);
 const files={git:`#!/bin/sh\nif [ "$1" = rev-parse ]; then echo ${sha}; fi\n`,docker:'#!/bin/sh\nprintf "%s" "$TEST_RUNTIME"\n',curl:`#!/bin/sh\nprintf '%s' '{"workflow_runs":[{"name":"Phase1 checks","head_sha":"${sha}","event":"push","run_number":1,"conclusion":"'$TEST_CI'"}]}'\n`};
 for(const [name,body] of Object.entries(files)){const file=join(root,'bin',name);await writeFile(file,body);await chmod(file,0o755);}
 await writeFile(join(root,'scripts/update.sh'),'#!/bin/sh\ntouch deployed\n');
 const script=(await readFile(new URL('../scripts/auto-update.sh',import.meta.url),'utf8')).replace('cd /opt/chen-study',`cd '${root}'`);await writeFile(join(root,'auto-update.sh'),script);
 const check=async(runtime,ci)=>{await rm(join(root,'deployed'),{force:true});await run('bash',[join(root,'auto-update.sh')],{env:{...process.env,PATH:join(root,'bin')+':'+process.env.PATH,TEST_RUNTIME:runtime,TEST_CI:ci}});try{await access(join(root,'deployed'));return true;}catch{return false;}};
 assert.equal(await check('old','success'),true);
 assert.equal(await check('','success'),true);
 assert.equal(await check(sha,'success'),false);
 assert.equal(await check('old','failure'),false);
 assert.equal(await check('old','null'),false);
});
