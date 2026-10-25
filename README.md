# Fridge-to-Recipes

Homework 1: a small AI-assisted application that turns available ingredients and optional constraints into exactly three recipe suggestions.

Built with JavaScript, Node.js, HTML, and CSS. No framework, database, build step, or third-party runtime packages are needed.

## Work in VS Code

Install Git, Node.js 22.9 or newer, and Visual Studio Code. Open the project folder with **File > Open Folder**, or clone its GitHub repository using **Git: Clone** in the Command Palette (`Ctrl+Shift+P` on Windows).

Open **Run and Debug** (`Ctrl+Shift+D`), select a configuration, and press **F5**:

- **Run demo (no API key)** starts the fixed example without credentials.
- **Run app (OpenAI API)** starts live generation and loads `.env` if present.

Open <http://localhost:3000> after the server starts. For live mode, follow the `.env` setup below first. Stop a debug session before starting another server on the same port.

The **Tasks: Run Task** command also provides **Run demo**, **Run app**, and **Run tests**. You can run the same npm commands in VS Code's integrated terminal. No extra VS Code extensions are required for this project.

## GitHub workflow

The project is a Git repository. Commit the source, README, example files, VS Code configuration, and GitHub Actions workflow. `.env` stays on your computer; the empty `.env.example` template is included in Git.

Before making your own commits, set your identity in the project's terminal. Replace the placeholder values with your name and an email associated with your GitHub account (or your GitHub-provided no-reply address):

```sh
git config user.name "Your Name"
git config user.email "YOUR_GITHUB_COMMIT_EMAIL"
```

To publish an extracted copy that has no GitHub remote yet, use VS Code's **Publish to GitHub** action and sign in when prompted. Suggested repository name: `fridge-to-recipes`. Choose public visibility for a visible portfolio project, or private visibility if preferred. If you cloned the project from GitHub, its remote is already configured.

For later changes, use **Source Control**: review the diff, stage the changed files, enter a clear English commit message, select **Commit**, then **Sync Changes**. Submit the repository URL for the assignment.

The workflow in `.github/workflows/test.yml` runs `npm ci --ignore-scripts`, `npm test`, and `npm run example` on pushes and pull requests. It needs no OpenAI key because it uses mocked API responses and the explicit demo fixture. Its result appears in the repository's **Actions** tab after the project is pushed.

## Requirements covered

| Assignment requirement | Implementation |
| --- | --- |
| Ingredient list and optional constraints | Comma/newline input or a JSON array; dietary restrictions, cuisine, maximum time, and servings are optional. |
| Three recipe suggestions | The API requests exactly three distinct recipes with a strict JSON schema; the server validates the result. |
| Required recipe details | Title, full ingredient list with quantities and a `missing` flag, ordered steps, estimated preparation/cooking time, and servings. |
| Basic error handling and retry | Input validation, helpful API errors, a timeout, and up to two retries on transient failures. |
| API key in an environment variable | `OPENAI_API_KEY` is read only by the server. `.env` is ignored by Git. |
| Minimal web UI | Responsive form and three recipe cards, with missing ingredients visibly labeled. |
| README and example run | Setup, environment variables, and a reproducible sample invocation/output below. |

## Setup and live mode

Requires **Node.js 22.9 or newer** and npm. Live generation also requires an OpenAI API key with available API quota and access to the configured model.

1. Open a terminal in this project directory.
2. Copy `.env.example` to `.env`.
3. Set `OPENAI_API_KEY` in `.env` to your own key. Leave the other values unchanged unless needed.
4. Run `npm start` and open <http://localhost:3000>.

PowerShell example:

```powershell
Copy-Item .env.example .env
notepad .env
npm start
```

On macOS/Linux, use `cp .env.example .env`, edit the file, then run `npm start`.

No `npm install` is required because the project uses only Node.js built-ins. Running `npm install` is harmless if your usual workflow includes it.

Use **Load example** to fill the form, or enter your own ingredients. All four constraint fields can be left empty; servings default to 2. Include available staples such as oil and salt, because unlisted items are treated as missing. Quantities describe each recipe's needs; the app does not track pantry amounts.

Stop the server with `Ctrl+C`.

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | Live mode only | None | Server-side API credential. Never commit it or put it in `public/`. |
| `OPENAI_MODEL` | No | `gpt-4.1-mini` | OpenAI model supporting Responses API structured outputs. |
| `PORT` | No | `3000` | Local HTTP port. |

The app listens on the local machine at `127.0.0.1`. This is a local coursework project, without user accounts or public hosting.

## Demo mode without a key

```sh
npm run demo
```

Open <http://localhost:3000>, select **Load example**, then **Find recipes**.

Demo mode is explicitly labeled in the UI. It returns the hand-written fixture in `examples/response.json`, makes no AI calls, and accepts only the matching example input. Changed input produces a helpful error rather than unrelated canned recipes. Use `npm start` with a key for arbitrary ingredients and constraints.

## HTTP endpoint

`POST /api/recipes` accepts `Content-Type: application/json`.

```json
{
  "ingredients": ["eggs", "tomatoes", "spinach", "olive oil", "salt", "black pepper"],
  "dietary": "vegetarian",
  "cuisine": "Italian",
  "maxCookTime": 20,
  "servings": 2
}
```

Only `ingredients` is required. It can also be comma/newline-separated text. `maxCookTime` is a positive whole number of minutes, including preparation; `servings` is a positive whole number. Omit optional fields or send empty values to use defaults.

With either server mode running, send the saved request from another terminal:

```sh
curl -X POST http://localhost:3000/api/recipes -H "Content-Type: application/json" --data-binary @examples/request.json
```

In Windows PowerShell, use `curl.exe` for this command. Live mode returns a fresh AI response, so its recipes may vary. Demo mode returns the exact sample below.

## Sample invocation and output

This reproducible example starts a temporary demo server, posts `examples/request.json` to the actual HTTP endpoint, prints the response, and stops the server:

```sh
npm run example
```

The output below is the complete JSON response from that command (npm's script header is omitted). It is a fixed demo response, **not evidence of a live OpenAI call**.

```json
{
  "recipes": [
    {
      "title": "Tomato and Spinach Scramble",
      "servings": 2,
      "estimatedCookTimeMinutes": 10,
      "ingredients": [
        {
          "name": "eggs",
          "quantity": "4",
          "missing": false
        },
        {
          "name": "tomatoes",
          "quantity": "2 medium",
          "missing": false
        },
        {
          "name": "spinach",
          "quantity": "100 g",
          "missing": false
        },
        {
          "name": "olive oil",
          "quantity": "1 tbsp",
          "missing": false
        },
        {
          "name": "salt",
          "quantity": "1/4 tsp",
          "missing": false
        },
        {
          "name": "black pepper",
          "quantity": "1/8 tsp",
          "missing": false
        }
      ],
      "steps": [
        "Wash the vegetables. Dice the tomatoes and roughly chop the spinach.",
        "Heat the olive oil in a frying pan over medium heat. Cook the tomatoes for 3 minutes, then add the spinach and cook for 1 minute.",
        "Beat the eggs with the salt and pepper. Add them to the pan and stir gently for 3 minutes, until fully set. Divide between two plates."
      ]
    },
    {
      "title": "Spinach and Mozzarella Frittata",
      "servings": 2,
      "estimatedCookTimeMinutes": 18,
      "ingredients": [
        {
          "name": "eggs",
          "quantity": "4",
          "missing": false
        },
        {
          "name": "tomatoes",
          "quantity": "2 medium",
          "missing": false
        },
        {
          "name": "spinach",
          "quantity": "100 g",
          "missing": false
        },
        {
          "name": "olive oil",
          "quantity": "1 tbsp",
          "missing": false
        },
        {
          "name": "salt",
          "quantity": "1/4 tsp",
          "missing": false
        },
        {
          "name": "black pepper",
          "quantity": "1/8 tsp",
          "missing": false
        },
        {
          "name": "vegetarian mozzarella",
          "quantity": "60 g",
          "missing": true
        }
      ],
      "steps": [
        "Wash and dice the tomatoes, chop the spinach, and tear the mozzarella into small pieces.",
        "Heat the olive oil in a small nonstick frying pan over medium heat. Cook the tomatoes for 3 minutes, then wilt the spinach for 1 minute.",
        "Beat the eggs with the salt and pepper. Pour into the pan and distribute the mozzarella on top.",
        "Cover and cook over low heat for 8 to 10 minutes, until the eggs are fully set in the center. Cut in half and serve."
      ]
    },
    {
      "title": "Italian-Style Egg and Tomato Toast",
      "servings": 2,
      "estimatedCookTimeMinutes": 15,
      "ingredients": [
        {
          "name": "eggs",
          "quantity": "4",
          "missing": false
        },
        {
          "name": "tomatoes",
          "quantity": "2 medium",
          "missing": false
        },
        {
          "name": "spinach",
          "quantity": "100 g",
          "missing": false
        },
        {
          "name": "olive oil",
          "quantity": "1 tbsp",
          "missing": false
        },
        {
          "name": "salt",
          "quantity": "1/4 tsp",
          "missing": false
        },
        {
          "name": "black pepper",
          "quantity": "1/8 tsp",
          "missing": false
        },
        {
          "name": "bread",
          "quantity": "2 large slices",
          "missing": true
        },
        {
          "name": "fresh basil",
          "quantity": "6 leaves",
          "missing": true
        }
      ],
      "steps": [
        "Wash the vegetables and basil. Dice the tomatoes and chop the spinach and basil. Toast the bread.",
        "Heat half the olive oil in a frying pan. Cook the tomatoes for 3 minutes and add the spinach for 1 minute. Season with half the salt and pepper, then spoon onto the toast.",
        "Add the remaining oil to the pan. Beat the eggs with the remaining salt and pepper, then scramble for 3 to 4 minutes until fully set.",
        "Divide the eggs between the two slices of toast and scatter the basil on top."
      ]
    }
  ]
}
```

## How it works

The browser sends the input to the local Node.js server. The server validates it and calls the OpenAI Responses API with a recipe-specific prompt and a strict JSON schema. The browser never receives the API key. Generated text is rendered with `textContent`, not HTML.

The server verifies that there are three distinct recipes, that required fields are present, and that the time and servings match the request. Dietary compliance, cuisine, and ingredient-name equivalence are determined by the model; they are not checked against an external recipe database.

## Error handling and retries

- Invalid or empty ingredients, invalid constraints, malformed JSON, and oversized requests receive clear errors.
- Each API attempt has a 30-second timeout, including reading its response body.
- Network failures/timeouts and HTTP 408, 409, 429, or 5xx responses are retried up to twice (three total attempts).
- The default retry delays are 500 ms and 1 second. A valid `Retry-After` header takes precedence, capped at 5 seconds.
- Invalid credentials, exhausted quota, other permanent errors, refusals, and malformed recipe results are reported without automatic retry.
- There is no silent fallback to demo recipes when live generation fails.

## Tests

```sh
npm test
```

The tests use Node's built-in test runner. They cover input validation, the structured API request and response, retry/recovery behavior, exhausted retries, permanent errors, missing keys, invalid AI responses, recipe completeness, time/servings limits, static files, and the actual local HTTP endpoint. External API responses are mocked; the tests cost nothing and require no key.

A live OpenAI call has not been verified in the supplied project because no API credential was provided. To verify live generation, set your key, start with `npm start`, load the example, and submit it. Demo mode alone does not verify the external API integration.

## Project structure

```text
public/                 HTML, CSS, and browser JavaScript
.vscode/                VS Code launch configurations and tasks
.github/workflows/      Automated tests on GitHub
src/recipes.js          Validation, AI prompt/schema, API call, retries
server.js               Local HTTP server and routes
examples/request.json   Sample invocation input
examples/response.json  Fixed demo output
scripts/example.js      Reproducible HTTP example
test/app.test.js        Automated tests
.env.example            Environment template without credentials
```

The downloaded project includes Git history. The GitHub workflow above explains how to publish an extracted copy or continue working from a clone. Keep `.env` untracked.

## AI assistance

AI assistance was used to implement the application, write the recipe prompt, prepare documentation, and create tests for this coursework. The demo recipes are hand-written fixtures, separate from live model responses.

## API references

- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [GPT-4.1 mini model](https://developers.openai.com/api/docs/models/gpt-4.1-mini)
- [GitHub in VS Code](https://code.visualstudio.com/docs/sourcecontrol/github)
- [Node.js debugging in VS Code](https://code.visualstudio.com/docs/nodejs/nodejs-debugging)
- [Building and testing Node.js on GitHub](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)
