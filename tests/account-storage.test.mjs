import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../src/accountStorage.js',import.meta.url),'utf8');
let sequence=0;
async function setup(session){
 const values=new Map();globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 globalThis.window={dispatchEvent(){}};
 if(session)values.set('relay-account-session',JSON.stringify({user:{id:session},accessToken:'a',refreshToken:'r'}));
 return {values,storage:await import('data:text/javascript;base64,'+Buffer.from(source+'\n//'+sequence++).toString('base64'))};
}
test('guest records survive an account switch and are only imported explicitly',async()=>{
 const {storage,values}=await setup('A');values.set('relay-saved','["guest-item"]');
 assert.deepEqual(storage.readLocal('relay-saved',[]),[]);
 storage.writeLocal('relay-saved',['account-item']);
 assert.deepEqual(storage.readGuest('relay-saved',[]),['guest-item']);
 assert.deepEqual(JSON.parse(values.get('relay-user:A:relay-saved')),['account-item']);
});
test('an old tab remains scoped to its original user while another tab changes session',async()=>{
 const {storage,values}=await setup('A');
 values.set('relay-account-session',JSON.stringify({user:{id:'B'},accessToken:'b',refreshToken:'r'}));
 storage.writeLocal('relay-drafts',[{id:'A-private'}]);
 assert.equal(values.has('relay-user:B:relay-drafts'),false);
 assert.deepEqual(JSON.parse(values.get('relay-user:A:relay-drafts')),[{id:'A-private'}]);
});
test('signed-out users keep using the original guest storage',async()=>{
 const {storage,values}=await setup();storage.writeLocal('relay-school','广州大学');assert.equal(values.get('relay-school'),'"广州大学"');
});
