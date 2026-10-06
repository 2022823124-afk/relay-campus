export const sessionKey='relay-account-session';
export function getSession(){try{const s=JSON.parse(localStorage.getItem(sessionKey));return s?.user?.id&&s?.accessToken&&s?.refreshToken?s:null}catch{return null}}
const ownerId=getSession()?.user.id;
export const storageKey=k=>ownerId?`relay-user:${ownerId}:${k}`:k;
const key=storageKey;
export function readLocal(k,fallback){try{return JSON.parse(localStorage.getItem(key(k)))??fallback}catch{return fallback}}
export function writeLocal(k,value){try{localStorage.setItem(key(k),JSON.stringify(value));if(k==='relay-sprout-care')window.dispatchEvent(new Event('relay-care-change'))}catch{}}
export function readGuest(k,fallback){try{return JSON.parse(localStorage.getItem(k))??fallback}catch{return fallback}}
