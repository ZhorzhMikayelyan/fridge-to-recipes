const form = document.querySelector('#recipe-form');
const submitButton = document.querySelector('#submit-button');
const exampleButton = document.querySelector('#load-example');
const buttonText = document.querySelector('#button-text');
const buttonIcon = document.querySelector('#button-icon');
const status = document.querySelector('#status');
const errorBox = document.querySelector('#error');
const recipes = document.querySelector('#recipes');
const emptyState = document.querySelector('#empty-state');
const caption = document.querySelector('#results-caption');
let config;

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

async function loadConfig() {
  const response = await fetch('/api/config');
  if (!response.ok) throw new Error('Could not load the app settings. Refresh the page to try again.');
  config = await response.json();
  document.querySelector('#demo-notice').hidden = !config.demo;
  return config;
}

const configReady = loadConfig().catch(error => {
  showError(error.message);
  return null;
});

exampleButton.addEventListener('click', async () => {
  await configReady;
  if (!config) {
    try { await loadConfig(); } catch (error) { showError(error.message); return; }
  }
  const example = config.exampleInput;
  form.elements.ingredients.value = example.ingredients.join(', ');
  for (const name of ['dietary', 'cuisine', 'maxCookTime', 'servings']) {
    form.elements[name].value = example[name] ?? '';
  }
  errorBox.hidden = true;
  status.textContent = 'Example loaded. Select Find recipes to continue.';
  form.elements.ingredients.focus();
});

// Use textContent for all model output so recipe text is never treated as HTML.
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function recipeCard(recipe, index) {
  const card = element('article', 'recipe-card');
  const missing = recipe.ingredients.filter(ingredient => ingredient.missing).length;
  const top = element('div', 'card-top');
  top.append(element('span', 'recipe-number', `RECIPE 0${index + 1}`));
  top.append(element('span', 'time-tag', `${recipe.estimatedCookTimeMinutes} min`));
  card.append(top, element('h3', '', recipe.title));
  card.append(element('p', 'recipe-meta', `${recipe.servings} servings · ${missing ? `${missing} missing ${missing === 1 ? 'ingredient' : 'ingredients'}` : 'Everything on hand'}`));
  card.append(element('h4', '', 'Ingredients'));
  const ingredientList = element('ul', 'ingredient-list');
  for (const ingredient of recipe.ingredients) {
    const item = element('li', ingredient.missing ? 'missing' : 'available');
    const detail = element('div');
    detail.append(element('span', 'ingredient-name', ingredient.name), element('span', 'quantity', ingredient.quantity));
    item.append(detail, element('span', 'availability', ingredient.missing ? 'Missing' : 'On hand'));
    ingredientList.append(item);
  }
  const steps = element('ol', 'steps');
  for (const step of recipe.steps) steps.append(element('li', '', step));
  card.append(ingredientList, element('h4', '', 'How to make it'), steps);
  return card;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitButton.disabled) return;
  errorBox.hidden = true;
  recipes.replaceChildren();
  emptyState.hidden = true;
  submitButton.disabled = true;
  exampleButton.disabled = true;
  buttonText.textContent = 'Finding recipes';
  buttonIcon.className = 'spinner';
  buttonIcon.textContent = '';
  recipes.setAttribute('aria-busy', 'true');
  status.textContent = 'Preparing three recipe ideas. This may take a moment.';
  caption.textContent = 'Finding something good…';

  try {
    const input = Object.fromEntries(new FormData(form));
    const response = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not find recipes. Please try again.');
    recipes.append(...data.recipes.map(recipeCard));
    caption.textContent = 'Three ideas, ready when you are.';
    status.textContent = 'Three recipes ready. Missing ingredients are marked in each list.';
  } catch (error) {
    showError(error instanceof TypeError ? 'Could not connect to the server. Check that the app is running and try again.' : error.message);
    status.textContent = '';
    caption.textContent = "Let's try that again.";
    emptyState.hidden = false;
  } finally {
    submitButton.disabled = false;
    exampleButton.disabled = false;
    buttonText.textContent = 'Find recipes';
    buttonIcon.className = '';
    buttonIcon.textContent = '→';
    recipes.setAttribute('aria-busy', 'false');
  }
});
