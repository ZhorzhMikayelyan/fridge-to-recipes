import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { createApp } from '../server.js';

// Exercise the HTTP endpoint without an API key using the labeled demo fixture.
const input = JSON.parse(await readFile(new URL('../examples/request.json', import.meta.url), 'utf8'));
const server = createApp({ demo: true });
try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`Example request failed: HTTP ${response.status}`);
  console.log(JSON.stringify(await response.json(), null, 2));
} finally {
  await new Promise(resolve => server.close(resolve));
}
