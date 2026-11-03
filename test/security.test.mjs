import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sign,validSession,equal} from '../security.mjs';
test('sessions reject tampering, expiry and malformed tokens',()=>{
 const key='secret',raw='2000.0123456789abcdef0123456789abcdef',token=`${raw}.${sign(raw,key)}`;
 assert.equal(validSession(token,key,1000),true);
 assert.equal(validSession(token,key,2000),false);
 assert.equal(validSession(token,'wrong',1000),false);
 assert.equal(validSession(token+'x',key,1000),false);
 assert.equal(validSession(token+'.extra',key,1000),false);
 assert.equal(validSession('',key,1000),false);
 assert.equal(equal('','different'),false);
});
