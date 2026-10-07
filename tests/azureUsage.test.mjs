// Pruebas de AUD-FUG-401 (v5.8.2): el Resource ID de Azure se valida y el token solo va a management.azure.com.
// Red simulada: `fetch` falso que registra cada petición. Ninguna llamada real.
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const SUB = '0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0'
const GOOD = `/subscriptions/${SUB}/resourceGroups/rg-habla/providers/Microsoft.CognitiveServices/accounts/habla-speech`
const CREDS = { tenantId: '11111111-2222-3333-4444-555555555555', clientId: '66666666-7777-8888-9999-000000000000', clientSecret: 'secreto-falso' }

function fakeNet() {
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), headers: init?.headers ?? {} })
    const body = String(url).includes('login.microsoftonline.com')
      ? { access_token: 'token-falso' }
      : { value: [{ timeseries: [{ data: [{ total: 60 }, { total: 30 }] }] }] }
    return { status: 200, json: async () => body }
  }
  const store = new Map()
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) }
  return calls
}

const MALICIOUS = [
  '@evil.example/x',
  '.evil.example/x',
  ':443@evil.example/x',
  '//evil.example/x',
  `${GOOD}@evil.example`,
  `/subscriptions/${SUB}/resourceGroups/../providers/Microsoft.CognitiveServices/accounts/x`,
  `/subscriptions/${SUB}/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/x/../../../../x`,
  `/subscriptions/${SUB}/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/x?y=1`,
  `/subscriptions/${SUB}/resourceGroups/rg%2F..%2F/providers/Microsoft.CognitiveServices/accounts/x`,
  'https://evil.example/subscriptions/x',
  '',
]

test('FUG-401: Resource IDs maliciosos o mal formados se rechazan y NO sale ninguna petición (ni el token)', async () => {
  const mod = await loadFresh('/src/lib/azureUsage.ts')
  for (const resourceId of MALICIOUS) {
    const calls = fakeNet()
    assert.equal(mod.normalizeResourceId(resourceId), null, resourceId)
    await assert.rejects(mod.monthUsage({ ...CREDS, resourceId }, true), /Resource ID/, resourceId)
    assert.equal(calls.length, 0, `sin peticiones con «${resourceId}»`)
  }
})

test('FUG-401: un Resource ID correcto va solo a login.microsoftonline.com y a management.azure.com', async () => {
  const mod = await loadFresh('/src/lib/azureUsage.ts')
  const calls = fakeNet()
  const u = await mod.monthUsage({ ...CREDS, resourceId: `  ${GOOD}/ ` }, true)
  assert.equal(u.usedSeconds, 90)
  assert.equal(calls.length, 2)
  assert.equal(new URL(calls[0].url).host, 'login.microsoftonline.com')
  const metrics = new URL(calls[1].url)
  assert.equal(metrics.host, 'management.azure.com')
  assert.equal(metrics.pathname, `${GOOD}/providers/microsoft.insights/metrics`)
  assert.equal(metrics.searchParams.get('metricnames'), 'AudioSecondsTranscribed')
  assert.match(calls[1].headers.Authorization, /^Bearer token-falso$/)
})

test('FUG-401: Tenant y Client ID con forma incorrecta se rechazan antes de pedir el token', async () => {
  const mod = await loadFresh('/src/lib/azureUsage.ts')
  const calls = fakeNet()
  assert.match(mod.monitorProblem({ tenantId: 'x/../evil', clientId: CREDS.clientId, resourceId: GOOD }), /Tenant/)
  assert.match(mod.monitorProblem({ tenantId: CREDS.tenantId, clientId: 'no-es-un-guid', resourceId: GOOD }), /Client/)
  assert.equal(mod.monitorProblem({ tenantId: 'contoso.onmicrosoft.com', clientId: CREDS.clientId, resourceId: GOOD }), null)
  await assert.rejects(mod.monthUsage({ ...CREDS, tenantId: 'evil.example/x?', resourceId: GOOD }, true), /Tenant/)
  assert.equal(calls.length, 0)
})
