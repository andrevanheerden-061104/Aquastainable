const groqProvider = require('./providers/groqProvider');
const { AQUARIUM_SYSTEM_PROMPT, FISH_ASSISTANT_PROMPT, assistantPrompt, fishDataPrompt, plantDataPrompt, tankOverviewPrompt, fishCompatibilityPrompt, plantCompatibilityPrompt, waterTestPrompt } = require('./prompts');

function parseJsonResponse(response) {
  try {
    return JSON.parse(response);
  } catch (error) {
    throw new Error('The remote AI returned invalid JSON.');
  }
}

async function generateText(prompt) {
  return groqProvider.generate({
    prompt,
    system: AQUARIUM_SYSTEM_PROMPT,
  });
}

async function generateFishData(species) {
  const result = await groqProvider.generate({
    prompt: fishDataPrompt(species),
    system: AQUARIUM_SYSTEM_PROMPT,
    format: 'json',
  });

  return { ...parseJsonResponse(result.response), model: result.model };
}

async function generatePlantData(plant) {
  const result = await groqProvider.generate({
    prompt: plantDataPrompt(plant),
    system: AQUARIUM_SYSTEM_PROMPT,
    format: 'json',
  });

  return { ...parseJsonResponse(result.response), model: result.model };
}

// Clean up the model's reply so the app can render it as headline + bullets.
function tidyAnswer(text) {
  const lines = String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim()
      .replace(/^#{1,6}\s*/, '') // no markdown headings
      .replace(/^(\d+)[.)]\s+/, '- ') // numbered -> bullets
      .replace(/^[*•]\s+/, '- ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')) // no images
    .filter((line, index, all) => line || (all[index - 1] && all[index - 1] !== ''));

  // Keep at most 4 bullets in a row so answers stay short.
  const out = [];
  let run = 0;
  for (const line of lines) {
    run = line.startsWith('- ') ? run + 1 : 0;
    if (run <= 4) out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function answerAssistant(message, context, history = []) {
  const result = await groqProvider.generate({
    prompt: assistantPrompt(message, context),
    system: FISH_ASSISTANT_PROMPT,
    // Short history keeps answers focused and cheaper.
    history: history.slice(-8),
    maxTokens: 1200,
    temperature: 0.3,
    reasoningEffort: 'low',
  });

  return { answer: tidyAnswer(result.response), model: result.model };
}

async function generateTankOverview(data) {
  const result = await groqProvider.generate({
    prompt: tankOverviewPrompt(data),
    system: AQUARIUM_SYSTEM_PROMPT,
  });

  const overview = result.response.trim().split(/\s+/).slice(0, 150).join(' ');
  return { overview, model: result.model };
}

async function assessFishCompatibility(data) {
  const result = await groqProvider.generate({
    prompt: fishCompatibilityPrompt(data),
    system: AQUARIUM_SYSTEM_PROMPT,
    format: 'json',
  });

  return parseJsonResponse(result.response);
}

async function assessPlantCompatibility(data) {
  const result = await groqProvider.generate({
    prompt: plantCompatibilityPrompt(data),
    system: AQUARIUM_SYSTEM_PROMPT,
    format: 'json',
  });
  return { ...parseJsonResponse(result.response), model: result.model };
}

async function reviewWaterTest(data) {
  const result = await groqProvider.generate({
    prompt: waterTestPrompt(data),
    system: AQUARIUM_SYSTEM_PROMPT,
    format: 'json',
  });
  const review = parseJsonResponse(result.response);
  return {
    ...review,
    summary: String(review.summary || '').trim().split(/\s+/).slice(0, 100).join(' '),
    model: result.model,
  };
}

module.exports = {
  answerAssistant,
  tidyAnswer,
  generateFishData,
  generatePlantData,
  generateText,
  generateTankOverview,
  assessFishCompatibility,
  assessPlantCompatibility,
  reviewWaterTest,
  health: groqProvider.health,
};
