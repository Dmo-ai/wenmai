import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../public/account.js', import.meta.url), 'utf8');

function element() {
  const handlers = new Map();
  const classes = new Set(['hidden']);
  return {
    textContent: '', value: '', disabled: false, children: [],
    handlers,
    classList: {
      add: key => classes.add(key),
      remove: key => classes.delete(key),
      toggle: (key, state) => state ? classes.add(key) : classes.delete(key),
      contains: key => classes.has(key),
    },
    addEventListener: (name, callback) => handlers.set(name, callback),
    append(...children) { this.children.push(...children); },
    replaceChildren() { this.children = []; },
  };
}

test('existing account can sign in and read only via authenticated request', async () => {
  const ids = ['login-form','login-button','login-message','login-panel','account-panel','user-email','orders','logout-button','email','password'];
  const nodes = Object.fromEntries(ids.map(id => [id, element()]));
  nodes.email.value = 'member@example.com';
  nodes.password.value = 'a-test-password';
  const calls = [];
  const storage = new Map();
  const replies = [
    {access_token:'test-access', refresh_token:'test-refresh', expires_in:3600},
    {id:'person-id', email:'member@example.com'},
    [{id:'order-id',product_code:'single_design',status:'paid',created_at:'2026-10-11T00:00:00Z'}],
  ];
  const context = {
    document:{getElementById:id=>nodes[id],createElement:()=>element()},
    sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
    fetch:async (url,options)=>{calls.push({url,options});return {ok:true,status:200,json:async()=>replies.shift()};},
    Date, JSON, Number, Error, Array,
  };
  vm.runInNewContext(source, context);
  await nodes['login-form'].handlers.get('submit')({preventDefault(){}});
  assert.equal(nodes['user-email'].textContent,'member@example.com');
  assert.equal(nodes.orders.children.length,1);
  assert.equal(nodes.password.value,'');
  assert.match(calls[0].url,/auth\/v1\/token\?grant_type=password$/);
  assert.match(calls[2].url,/rest\/v1\/design_orders/);
  assert.equal(calls[2].options.headers.Authorization,'Bearer test-access');
  assert.ok(!source.includes('service_role'));
});

