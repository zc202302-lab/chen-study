import {createHmac,timingSafeEqual} from 'node:crypto';
export function equal(a,b){const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y);}
export function sign(s,key){return createHmac('sha256',key).update(s).digest('hex');}
export function validSession(token,key,now=Date.now()){const [expiry,nonce,sig,...extra]=(token||'').split('.');return !extra.length&&/^\d+$/.test(expiry||'')&&Number(expiry)>now&&/^[a-f0-9]{32}$/.test(nonce||'')&&equal(sig,sign(`${expiry}.${nonce}`,key));}
