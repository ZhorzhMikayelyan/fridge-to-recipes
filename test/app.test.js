import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createApp } from '../server.js';
import { AppError, generateRecipes, normalizeInput, validateRecipes } from '../src/recipes.js';

const request = JSON.parse(await readFile(new URL('../examples/request.json', import.meta.url), 'utf8'));
const recipes = JSON.parse(await readFile(new URL('../examples/response.json', import.meta.url), 'utf8'));
const input = normalizeInput(request);
const success = data => new Response(JSON.stringify({
  status: 'completed',
  output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(data) }] }],
}));
const options = { apiKey: 'test-key-not-a-secret', sleep: async () => {} };

test('accepts ingredient-only input and normalizes comma/newline lists', () => {
  assert.deepEqual(normalizeInput({ ingredients: ' Eggs, tomatoes\neggs,  ' }), {
    ingredients: ['eggs', 'tomatoes'], dietary: '', cuisine: '', maxCookTime: null, servings: 2,
  });
});

test('rejects invalid ingredients and optional constraints', () => {
  for (const value of [null, [], {}, { ingredients: '' }, { ingredients: [null] },
    { ingredients: ['eggs'], servings: -1 }, { ingredients: ['eggs'], servings: true },
    { ingredients: ['eggs'], maxCookTime: 1.5 }, { ingredients: ['eggs'], cuisine: {} },
    { ingredients: ['eggs'], dietary: 'x'.repeat(301) }, { ingredients: ['x'.repeat(101)] },
    { ingredients: Array.from({ length: 51 }, (_, index) => `ingredient ${index}`) }]) {
    assert.throws(() => normalizeInput(value), error => error instanceof AppError && error.status === 400);
  }
});

test('sends constraints and a strict schema to the real API path and parses its response', async () => {
  let calls = 0;
  const result = await generateRecipes(input, {
    ...options,
    fetchImpl: async (url, init) => {
      calls++;
      assert.equal(url, 'https://api.openai.com/v1/responses');
      assert.equal(init.headers.Authorization, 'Bearer test-key-not-a-secret');
      const body = JSON.parse(init.body);
      assert.deepEqual(JSON.parse(body.input), input);
      assert.equal(body.text.format.strict, true);
      assert.equal(body.text.format.schema.properties.recipes.minItems, 3);
      assert.equal(body.text.format.schema.properties.recipes.maxItems, 3);
      assert.equal(body.store, false);
      return success(recipes);
    },
  });
  assert.equal(calls, 1);
  assert.deepEqual(result, recipes);
});

test('retries a 503 response and honors Retry-After before succeeding', async () => {
  let calls = 0;
  const waits = [];
  const result = await generateRecipes(input, {
    ...options,
    sleep: async milliseconds => waits.push(milliseconds),
    fetchImpl: async () => ++calls === 1
      ? new Response('Temporarily unavailable', { status: 503, headers: { 'Retry-After': '1' } })
      : success(recipes),
  });
  assert.deepEqual(result, recipes);
  assert.equal(calls, 2);
  assert.deepEqual(waits, [1000]);
});

test('retries a timeout/network failure and a 429 with exponential backoff', async () => {
  let calls = 0;
  const waits = [];
  await generateRecipes(input, {
    ...options,
    sleep: async milliseconds => waits.push(milliseconds),
    fetchImpl: async () => {
      calls++;
      if (calls === 1) throw new DOMException('Timed out', 'TimeoutError');
      if (calls === 2) return new Response('{}', { status: 429 });
      return success(recipes);
    },
  });
  assert.equal(calls, 3);
  assert.deepEqual(waits, [500, 1000]);
});

test('stops after three failed attempts', async () => {
  let calls = 0;
  await assert.rejects(generateRecipes(input, {
    ...options,
    fetchImpl: async () => { calls++; throw new TypeError('Network failure'); },
  }), error => error.status === 503 && /three attempts/.test(error.message));
  assert.equal(calls, 3);
});

test('does not retry invalid credentials or exhausted quota, and does not expose API messages', async () => {
  for (const [status, code] of [[401, 'invalid_api_key'], [429, 'insufficient_quota'], [400, 'bad_request']]) {
    let calls = 0;
    await assert.rejects(generateRecipes(input, {
      ...options,
      fetchImpl: async () => {
        calls++;
        return new Response(JSON.stringify({ error: { code, message: 'PRIVATE PROVIDER DETAIL' } }), { status });
      },
    }), error => !error.message.includes('PRIVATE PROVIDER DETAIL'));
    assert.equal(calls, 1);
  }
});

test('requires an API key without making a network request', async () => {
  await assert.rejects(generateRecipes(input, {
    apiKey: '', fetchImpl: async () => assert.fail('Must not call API'),
  }), error => error.status === 503 && /OPENAI_API_KEY/.test(error.message));
});

test('rejects refusals, incomplete results, and invalid JSON', async () => {
  const payloads = [
    { status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'Cannot comply' }] }] },
    { status: 'incomplete', output: [] },
    { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '{' }] }] },
  ];
  for (const payload of payloads) {
    await assert.rejects(generateRecipes(input, {
      ...options, fetchImpl: async () => new Response(JSON.stringify(payload)),
    }), error => [422, 502].includes(error.status));
  }
});

test('requires three complete, distinct recipes within time and servings constraints', () => {
  assert.deepEqual(validateRecipes(recipes, input), recipes);
  const mutations = [
    result => result.recipes.pop(),
    result => { result.recipes[0].steps = []; },
    result => { result.recipes[0].ingredients[0].missing = 'false'; },
    result => { result.recipes[0].estimatedCookTimeMinutes = 21; },
    result => { result.recipes[0].servings = 3; },
    result => { result.recipes[0].title = result.recipes[1].title; },
  ];
  for (const mutate of mutations) {
    const invalid = structuredClone(recipes);
    mutate(invalid);
    assert.throws(() => validateRecipes(invalid, input), error => error.status === 502);
  }
});

async function runServer(t, appOptions) {
  const server = createApp(appOptions);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('serves the web app, exposes only safe configuration, and returns the demo response', async t => {
  const base = await runServer(t, { demo: true });
  for (const path of ['/', '/app.js', '/styles.css']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    assert.ok((await response.text()).length > 0);
  }
  const config = await (await fetch(base + '/api/config')).json();
  assert.deepEqual(Object.keys(config).sort(), ['demo', 'exampleInput']);
  assert.equal(config.demo, true);
  const response = await fetch(base + '/api/recipes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), recipes);
  assert.equal((await fetch(base + '/.env')).status, 404);
  assert.equal((await fetch(base + '/server.js')).status, 404);
});

test('HTTP live path passes validated input through the generator', async t => {
  const base = await runServer(t, {
    recipeGenerator: normalized => generateRecipes(normalized, {
      ...options, fetchImpl: async () => success(recipes),
    }),
  });
  const response = await fetch(base + '/api/recipes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), recipes);
});

test('HTTP errors are helpful for bad input, media types, oversized requests, and unsupported demo input', async t => {
  const base = await runServer(t, { demo: true });
  for (const [body, contentType, expected] of [
    ['{', 'application/json', 400],
    ['{}', 'application/json', 400],
    [JSON.stringify({ ingredients: ['rice'] }), 'application/json', 400],
    ['{}', 'text/plain', 415],
    [JSON.stringify({ ingredients: ['x'.repeat(17000)] }), 'application/json', 413],
  ]) {
    const response = await fetch(base + '/api/recipes', {
      method: 'POST', headers: { 'Content-Type': contentType }, body,
    });
    assert.equal(response.status, expected);
    assert.equal(typeof (await response.json()).error, 'string');
  }
});
