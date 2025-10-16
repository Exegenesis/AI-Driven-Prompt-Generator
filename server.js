const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const app = express();
app.use(express.json());

// Sanitize environment values: strip surrounding quotes if user accidentally wrapped them
if (process.env.OPENAI_API_KEY) {
  const cleaned = process.env.OPENAI_API_KEY.replace(/^['"]|['"]$/g, '');
  if (cleaned !== process.env.OPENAI_API_KEY) {
    console.log('Stripped surrounding quotes from OPENAI_API_KEY in environment');
    process.env.OPENAI_API_KEY = cleaned;
  }
}
if (process.env.OPENAI_MODEL) {
  const cleanedModel = process.env.OPENAI_MODEL.replace(/^['"]|['"]$/g, '');
  if (cleanedModel !== process.env.OPENAI_MODEL) {
    console.log('Stripped surrounding quotes from OPENAI_MODEL in environment');
    process.env.OPENAI_MODEL = cleanedModel;
  }
}

// Diagnostic: print whether OpenAI key and model are configured (do not print the key itself)
console.log('OPENAI configured:', !!process.env.OPENAI_API_KEY, 'OPENAI_MODEL:', process.env.OPENAI_MODEL || 'gpt-5-nano');

// Serve static frontend (index.html in project root)
app.use(express.static(path.join(__dirname)));

// Optional MongoDB connection (only if MONGO_URI provided)
if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.warn('MongoDB connect failed (continuing without DB):', err.message));
} else {
  console.log('No MONGO_URI provided — skipping MongoDB connection.');
}

// R.C.C.O Framework
const generateRCCOPrompt = ({ goal, audience, aiModel }) => {
  return `Role: You are an expert ${aiModel} assistant. Context: The user is targeting ${audience}. Constraints: Be concise, actionable, and tailored to the audience. Objective: ${goal}.`;
};

// C.A.R.E Framework (Context, Audience, Requirements, Example)
const generateCAREPrompt = ({ goal, audience, aiModel }) => {
  return `Context: The user needs help to ${goal}. Audience: ${audience}. Requirements: Provide clear steps, examples, and rationale. Example output style: professional and concise. Model: ${aiModel}.`;
};

// T.A.S.K Framework (Task, Audience, Style, Key points)
const generateTASKPrompt = ({ goal, audience, aiModel }) => {
  return `Task: ${goal}. Audience: ${audience}. Style: Practical, step-by-step, and example-driven. Key points: include a short summary, 3 action items, and a sample result. Use ${aiModel} to produce the output.`;
};

// Helper: call OpenAI Responses API to refine prompt (uses official SDK)
async function refineWithOpenAI(rawPrompt, aiModel) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return `${rawPrompt} \n\n[Note: OpenAI API key not configured — returning generated template.]`;
  }

  try {
    const client = new OpenAI({ apiKey });
    const model = (aiModel && aiModel.toLowerCase().includes('gpt')) ? (process.env.OPENAI_MODEL || 'gpt-5-nano') : 'gpt-5-nano';

    console.log('Calling OpenAI Responses API', { model });
    const resp = await client.responses.create({
      model,
      input: [
        { role: 'developer', content: 'Act as an expert Prompt Engineer' },
        { role: 'user', content: `Refine this prompt for clarity, structure, and effectiveness:\n\n${rawPrompt}` }
      ],
      reasoning: { effort: 'low' },
      temperature: 0.2,
      max_output_tokens: 512
    });
    console.log('OpenAI response received — keys:', Object.keys(resp).slice(0,6));
    // The SDK may return `resp.output` with an array of content; fallback to output_text
    if (resp.output && resp.output.length) {
      const texts = resp.output.map(o => {
        try {
          return (o.type === 'message' && o.content && o.content[0] && o.content[0].text) ? o.content[0].text : '';
        } catch (e) { return ''; }
      }).filter(Boolean);
      if (texts.length) return texts.join('\n').trim();
    }
    if (resp.output_text) return resp.output_text.trim();
    console.warn('OpenAI response did not include text; returning raw prompt');
    return rawPrompt;
  } catch (err) {
    console.warn('OpenAI Responses API failed — returning raw prompt. Error summary:', err.message || err);
    if (err.response) console.warn('OpenAI SDK error response keys:', Object.keys(err.response).slice(0,6));
    return rawPrompt;
  }
}

// API Endpoint
app.post('/api/generate-prompt', async (req, res) => {
  const { goal, audience, framework = 'R.C.C.O', aiModel = 'GPT-4' } = req.body || {};

  if (!goal || !audience) {
    return res.status(400).json({ error: 'Missing required fields: goal and audience' });
  }

  let rawPrompt = '';
  switch ((framework || '').toUpperCase()) {
    case 'R.C.C.O':
    case 'RCCO':
      rawPrompt = generateRCCOPrompt({ goal, audience, aiModel });
      break;
    case 'C.A.R.E':
    case 'CARE':
      rawPrompt = generateCAREPrompt({ goal, audience, aiModel });
      break;
    case 'T.A.S.K':
    case 'TASK':
      rawPrompt = generateTASKPrompt({ goal, audience, aiModel });
      break;
    default:
      rawPrompt = generateRCCOPrompt({ goal, audience, aiModel });
  }

  const refined = await refineWithOpenAI(rawPrompt, aiModel);
  return res.json({ prompt: refined });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));