/* eslint-disable @typescript-eslint/no-require-imports -- Offline auth boundary checks. */
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

function callback(result = { error: null }, throws = false) {
  const calls = []
  const filename = path.resolve('src/app/auth/callback/route.ts')
  const instance = new Module(filename, module)
  instance.filename = filename
  instance.paths = Module._nodeModulePaths(path.dirname(filename))
  instance.require = name => ({
    '@/lib/supabase/server': { createClient: async () => ({ auth: { exchangeCodeForSession: async code => {
      calls.push(code)
      if (throws) throw new Error('provider unavailable')
      return result
    } } }) },
  })[name]
  instance._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename)
  return { get: instance.exports.GET, calls }
}

test('confirmation exchanges the code and ignores external destination overrides', async () => {
  const { get, calls } = callback()
  const response = await get(new Request('http://127.0.0.1:3000/auth/callback?code=one-time-code&next=https://attacker.invalid'))
  assert.deepEqual(calls, ['one-time-code'])
  assert.equal(response.status, 303)
  assert.equal(response.headers.get('Location'), '/dashboard')
  assert.equal(new URL(response.headers.get('Location'), 'http://127.0.0.1:3000/auth/callback').origin, 'http://127.0.0.1:3000')
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store')
})

test('missing or provider-rejected codes never start a session', async () => {
  for (const query of ['', '?code=', '?code=untrusted&error=access_denied']) {
    const { get, calls } = callback()
    const response = await get(new Request('http://localhost:3000/auth/callback' + query))
    assert.equal(calls.length, 0)
    assert.equal(response.headers.get('Location'), '/login?reason=confirmation')
  }
})

test('expired codes and network errors return a safe error without leaking credentials', async () => {
  for (const throws of [false, true]) {
    const { get } = callback({ error: { message: 'secret provider response' } }, throws)
    const response = await get(new Request('http://localhost:3000/auth/callback?code=private-code'))
    assert.equal(response.headers.get('Location'), '/login?reason=confirmation')
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store')
  }
})
