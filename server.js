import { createServer as createHttpServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { AppError, generateRecipes, normalizeInput } from './src/recipes.js';

const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
]);
const exampleInput = JSON.parse(await readFile(new URL('./examples/request.json', import.meta.url), 'utf8'));
const exampleOutput = JSON.parse(await readFile(new URL('./examples/response.json', import.meta.url), 'utf8'));

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16384) throw new AppError('The request is too large. Keep it below 16 KB.', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new AppError('The request body must contain valid JSON.', 400); }
}

export function createApp({ demo = false, recipeGenerator = generateRecipes } = {}) {
  return createHttpServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    try {
      const path = new URL(request.url, 'http://localhost').pathname;
      if (request.method === 'GET' && path === '/api/config') {
        json(response, 200, { demo, exampleInput });
      } else if (request.method === 'POST' && path === '/api/recipes') {
        if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
          throw new AppError('Use Content-Type: application/json.', 415);
        }
        const input = normalizeInput(await readBody(request));
        if (demo && JSON.stringify(input) !== JSON.stringify(normalizeInput(exampleInput))) {
          throw new AppError('Demo mode supports only the example input. Select Load example, or start the live app with npm start.', 400);
        }
        json(response, 200, demo ? structuredClone(exampleOutput) : await recipeGenerator(input));
      } else if (request.method === 'GET' && assets.has(path)) {
        const [file, contentType] = assets.get(path);
        const content = await readFile(new URL(`./public/${file}`, import.meta.url));
        response.writeHead(200, { 'Content-Type': contentType });
        response.end(content);
      } else {
        json(response, 404, { error: 'Not found.' });
      }
    } catch (error) {
      if (!response.destroyed) {
        json(response, error instanceof AppError ? error.status : 500, {
          error: error instanceof AppError ? error.message : 'An unexpected server error occurred. Please try again.',
        });
      }
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT must be a whole number between 1 and 65535.');
    process.exitCode = 1;
  } else {
    const demo = process.argv.includes('--demo');
    const server = createApp({ demo });
    server.on('error', error => {
      console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Set a different PORT in .env.` : 'The server could not start.');
      process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => {
      console.log(`Fridge-to-Recipes: http://localhost:${port}`);
      console.log(demo ? 'Demo mode: fixed example recipes; no API calls.' : 'Live mode: recipe requests use the OpenAI API.');
    });
  }
}
