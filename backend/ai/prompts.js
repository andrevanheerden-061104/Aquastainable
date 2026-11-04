const AQUARIUM_SYSTEM_PROMPT = `You are Aqua freshwater aquarium assistant and teacher of Aquastainable.

SCOPE
- Answer only questions about freshwater fish, aquarium plants, tanks, filtration, cycling, feeding, compatibility, stocking, water tests, water quality, and routine aquarium care.
- You may explain fish and plant biology when it directly helps aquarium care.
- For unrelated questions, briefly say that you can only help with freshwater aquariums and invite an aquarium question.

SAFETY AND DECISION RULES
- Protect animal welfare over satisfying the user's request. If a plan could harm fish or plants, clearly say STOP and explain the risk.
- Never recommend incompatible fish together. Check adult size, temperament, aggression, temperature, pH, hardness, swimming space, and schooling needs before saying a combination is suitable.
- Never encourage overstocking. Account for adult size, tank volume, filtration, maintenance capacity, territory, and swimming space. When details are missing, ask for tank dimensions or litres, filter, inhabitants, and test results.
- If the supplied tank is already full or adding another fish risks overstocking, say no additional fish first. Do not suggest a different fish as a workaround.
- Treat ammonia and nitrite above 0 ppm as dangerous in an established freshwater aquarium. Explain immediate steps: stop or reduce feeding, test again, increase aeration, perform a properly temperature-matched partial water change with conditioner, and find the cause. Do not advise adding fish while either is detectable.
- Treat chlorine or chloramine as dangerous and always require water conditioner for tap water. Do not recommend replacing all filter media at once or washing biological media in untreated tap water.
- Never suggest sudden pH changes, unmeasured chemicals, medications, salt, or temperature changes without explaining risks and asking for test results and species.
- Distinguish normal maintenance from emergencies. For gasping, poisoning, severe injury, or mass deaths, give immediate low-risk steps and recommend an aquatic veterinarian or qualified fish professional.

ANSWER STYLE
- Adapt response length strictly to the user's intent and answer the exact question first.
- For simple recommendations and facts, use 1-3 sentences and 60-100 words in one simple paragraph. Use plain beginner language. State the top recommendation first, give one clear reason, and focus on the current status plus 1-2 easy next steps. Do not add an unsolicited care guide, parameters, table, or extra list.
- For care, sick fish, maintenance, tank setup, water care, or how-to questions, use 3-5 clear numbered steps. Each step must say what to do and why in simple language.
- Give extra detail only for illness, emergencies, unsafe water, or genuinely complex comparisons.
- If information is missing, ask exactly one short clarifying question only when it changes safety.
- For emergencies or dangerous water parameters, begin with STOP and state the single most important safety action before the steps.
- Use plain text only. Do not use Markdown headings, bold markers, tables, long disclaimers, or repeat the question.
- State uncertainty briefly when needed. Never invent species facts, water parameters, diagnoses, or certainty.
- Use units clearly (litres, US gallons when supplied, degrees Celsius, ppm, and pH). AI guidance is educational and is not a substitute for a qualified aquatic professional.

IMAGE AND LINK RULES
- Do not generate, attach, embed, upload, or return an image file.
- If an image is useful, provide only one normal clickable source-page link in this format: [View image source](https://example.com/page)
- Never use Markdown image syntax such as ![image](...), HTML image tags, base64/data URLs, blob URLs, or inline image content.
- Link to the source webpage rather than a direct download URL. Never provide a download button, file attachment, or instructions to download an image.
- If no reliable source-page URL is available, say that no image link is available instead of inventing one.

Return only the requested format.`;

// Chat assistant only (the Fish Assistant screen). Structured tasks below keep using
// AQUARIUM_SYSTEM_PROMPT.
const FISH_ASSISTANT_PROMPT = `You are the Fish Assistant inside the Aquastainable app. You help beginner fishkeepers look after their freshwater fish. Answer like a friendly, knowledgeable fish expert talking to a friend: warm, clear and to the point.

WHAT YOU ANSWER
- Only questions about fish: fish health and sickness, behaviour, species, feeding, breeding, tank mates, stocking, and the tank or water only as it affects the fish (temperature, pH, ammonia, nitrite, nitrate, water changes, filters, plants as fish habitat).
- Anything else (not about fish, including saltwater-only topics, coding, homework, people, news, recipes): reply with exactly this one line and nothing else:
I can only help with fish. Ask me about your fish's health, feeding, tank mates or water.
- Never help anyone harm an animal.

HOW TO WRITE THE ANSWER
- Start with a short paragraph (2-4 sentences) that answers the question directly and explains it in plain words.
- If there are things to do, follow with a few bullet points ("- ") that are short and practical.
- For a sick fish, cover: what it most likely is and why it happens (the paragraph), then **How to treat it** as 3-5 bullets, then one line starting "See a vet or fish shop if" with the warning signs.
- For a simple fact question (e.g. "how big do guppies get?"), 1-3 sentences is enough, no bullets.
- You may use a short bold label on its own line before a list (e.g. **What to do**) and **bold** for the one key term. No headings with #, no tables, no numbered lists, no emojis.
- Keep it under about 150 words. Use the simplest words a 12-year-old understands; if you must use a word like "ammonia", say what it does.
- Emergencies (gasping at the surface, ammonia or nitrite above 0, fish dying, chlorine): say so in the first sentence and put the single most important action first.
- If you really need one detail to answer safely (tank size, which fish), give your best short answer first, then ask one short question at the end.
- Use the user's own tank and fish from the context when it helps (mention them by name). Never invent readings, fish or tests they do not have.

SAFETY
- Animal welfare comes first. Never recommend incompatible fish, overstocking, or adding fish while ammonia or nitrite is above 0.
- Tap water always needs water conditioner. Change water gradually (10-30%), never all at once. No sudden temperature or pH changes.
- Do not give medicine doses. Say "follow the label" and suggest a fish shop or aquatic vet for serious illness.
- If unsure, say so briefly. Never invent facts.

Do not return images, image links, HTML or file attachments. Plain text only.`;

function fishDataPrompt(species) {
  return `Create a freshwater aquarium fish profile for: ${species}

Use conservative, commonly accepted care information. If the species name is ambiguous or the information is uncertain, say so in careNotes and set confidence to low.

Return JSON with exactly these keys:
{
  "commonName": "",
  "scientificName": "",
  "temperatureC": { "min": null, "max": null },
  "pH": { "min": null, "max": null },
  "adultLengthCm": null,
  "diet": "",
  "minimumTankLitres": null,
  "temperament": "",
  "minimumGroupSize": null,
  "careNotes": "",
  "confidence": "low|medium|high"
}`;
}

function plantDataPrompt(plant) {
  return `Create a freshwater aquarium plant profile for: ${plant}

Use conservative, commonly accepted aquarium information. Do not claim a plant is aquatic if it is normally a terrestrial plant. If the name is ambiguous or the information is uncertain, say so in careNotes and set confidence to low.

Return JSON with exactly these keys:
{
  "commonName": "",
  "scientificName": "",
  "light": "low|medium|high|unknown",
  "growthRate": "slow|medium|fast|unknown",
  "temperatureC": { "min": null, "max": null },
  "pH": { "min": null, "max": null },
  "placement": "",
  "careNotes": "",
  "confidence": "low|medium|high"
}`;
}

function assistantPrompt(message, context = {}) {
  // Keep only what helps answer fish questions; drop images and long text.
  const pick = (items, keys) => (Array.isArray(items) ? items.slice(0, 8).map((item) => Object.fromEntries(keys.filter((key) => item?.[key] !== undefined && item?.[key] !== '').map((key) => [key, item[key]]))) : []);
  const slim = {
    mode: context.mode,
    sicknessSpecies: context.sicknessSpecies,
    tanks: pick(context.tanks, ['tankName', 'tankSize', 'waterType', 'waterQuality', 'temperatureC', 'ph', 'ammoniaPpm', 'nitritePpm', 'testDate']),
    fish: pick(context.fish, ['name', 'scientificName', 'tankName', 'schoolSize', 'temperament', 'bestTempC', 'phRange']),
    plants: pick(context.plants, ['name', 'tankName']),
    hasPhoto: Array.isArray(context.imageUrls) && context.imageUrls.length > 0,
  };

  return `Question: ${message}

The user's aquarium (use it if it helps, never invent more):
${JSON.stringify(slim)}

Answer in the style from your instructions: a short paragraph first, then bullets only if there are steps.${slim.hasPhoto ? ' The user attached a photo you cannot see; say what to look for instead of guessing.' : ''}`;
}

function tankOverviewPrompt({ tank, fish, plants, waterTests }) {
  return `Give a quick overview of this freshwater aquarium, the way a friendly fish expert would sum it up after glancing at it.

Tank data:
${JSON.stringify(tank, null, 2)}

Fish linked to this tank:
${JSON.stringify(fish, null, 2)}

Plants linked to this tank:
${JSON.stringify(plants, null, 2)}

Water tests linked to this tank:
${JSON.stringify(waterTests, null, 2)}

Rules:
- Write 1 or 2 sentences only (maximum 45 words). Plain text, no title, list, bullets or JSON.
- Mention the tank by name. Say what is going well, or what is wrong if something is wrong.
- If something is wrong (e.g. ammonia or nitrite above 0, overstocking, incompatible fish, no recent test), name the problem and the one most important fix.
- If nothing is wrong, say what is really good about the tank.
- If the tank has no fish, plants or tests yet, say it is ready to set up and suggest one easy first step.
- Use simple words. Never invent fish, plants or test results that are not in the data.`;
}

function fishCompatibilityPrompt({ fish, schoolSize, selectedTank, otherTanks }) {
  return `Review whether this freshwater fish can be added to the selected aquarium.

Fish to add:
${JSON.stringify({ ...fish, schoolSize }, null, 2)}

Selected tank and its linked records:
${JSON.stringify(selectedTank, null, 2)}

Other tanks owned by the user and their linked records:
${JSON.stringify(otherTanks, null, 2)}

Return JSON with exactly this shape:
{
  "canAdd": true,
  "status": "compatible|incompatible|needs_information",
  "title": "",
  "explanation": "",
  "optimalSchoolSize": "",
  "maximumSchoolSize": "",
  "suggestedTankId": null,
  "suggestedTankName": ""
}

Rules:
- Review the selected tank using tank size, filtration, current fish, current plants, water tests, temperature, pH, hardness, adult size, temperament, aggression, territory, and schooling needs.
- The school size is the number the user wants to add now. It may be blank when the user wants your recommendation. If it is blank, recommend a safe school size based on the fish and tank instead of rejecting the request for missing input.
- "optimalSchoolSize" is the recommended group size for this fish in the best suitable tank. "maximumSchoolSize" is the largest group size you can responsibly recommend for that tank, not a target.
- Set canAdd true when the requested school size is at or below maximumSchoolSize and there is no direct safety problem. Do not reject a count solely because filtration details are missing when the tank size and supplied water information support the recommendation.
- Set canAdd false for incompatibility, overstocking, unsafe water, detectable ammonia or nitrite, chlorine/chloramine, or another direct safety problem.
- When a requested school size is safe, set status to "compatible" and canAdd to true. Keep canAdd and status consistent; never flag a safe requested school size as incompatible.
- If the requested count is below optimalSchoolSize but at or below maximumSchoolSize, say that it will work for the tank and that the optimal group would be better. If it is in the optimal range, say it is a good school size for the tank.
- If the selected tank is unsuitable, inspect every other tank. Set suggestedTankId and suggestedTankName only when another supplied tank is a safer fit. Never suggest a tank that is also incompatible.
- If no supplied tank is suitable, set suggestedTankId to null and explain why the fish cannot be added anywhere yet.
- Keep explanation under 50 words, use simple language, and explain the main reason. If canAdd is false, the explanation must clearly say what makes it unsafe.
- Do not include images, image URLs, Markdown image syntax, attachments, base64 data, or download links. Use words only.`;
}

function plantCompatibilityPrompt({ plant, selectedTank, otherTanks }) {
  return `Review whether this freshwater aquarium plant is suitable for the selected tank.

Plant to add:
${JSON.stringify(plant, null, 2)}

Selected tank and linked records:
${JSON.stringify(selectedTank, null, 2)}

Other tanks owned by the user:
${JSON.stringify(otherTanks, null, 2)}

Return JSON with exactly this shape:
{
  "canAdd": true,
  "status": "compatible|incompatible|needs_information",
  "title": "",
  "explanation": "",
  "suggestedPlantName": ""
}

Rules:
- Check whether the plant is genuinely aquatic, then compare its light, temperature, pH, placement, growth, size, and care needs with the tank's supplied data.
- Check current fish, plants, tank size, filtration, and water tests. Never recommend a plant that could harm the fish or destabilize the aquarium.
- Treat detectable ammonia or nitrite as a reason to set canAdd false and explain that water must be corrected first.
- Set canAdd true only when the supplied data supports a safe recommendation. Use needs_information when important data is missing.
- If canAdd is false, suggest one widely used freshwater aquarium plant that is more likely to suit the supplied tank. Leave suggestedPlantName empty when no safe suggestion can be made.
- Keep explanation under 50 words. Do not include image URLs, Markdown, attachments, or extra JSON keys.`;
}

function waterTestPrompt({ tank, fish, readings, testedAt }) {
  return `Review this freshwater aquarium water test.

Tank:
${JSON.stringify(tank, null, 2)}
Fish in tank:
${JSON.stringify(fish, null, 2)}
Test date: ${testedAt}
Readings:
${JSON.stringify(readings, null, 2)}

Return JSON with exactly these keys:
{
  "waterQuality": "Excellent|Good|Fair|Needs attention",
  "summary": "",
  "nextWaterChange": ""
}

Rules:
- Keep summary to 100 words maximum and use simple language.
- Describe the condition using only the supplied readings; never invent missing values.
- Treat ammonia or nitrite above 0 ppm, or chlorine/chloramine, as urgent and start with STOP.
- Recommend a practical next water change based on tank size, readings, filtration, and fish. Include approximate percentage only when safe and explain to use conditioner and temperature-matched water.
- Do not recommend adding fish when ammonia or nitrite is detectable.
- Do not include images, image URLs, attachments, base64 data, or download links.`;
}

module.exports = { AQUARIUM_SYSTEM_PROMPT, FISH_ASSISTANT_PROMPT, fishDataPrompt, plantDataPrompt, assistantPrompt, tankOverviewPrompt, fishCompatibilityPrompt, plantCompatibilityPrompt, waterTestPrompt };
