const express = require('express');
const mongoose = require('mongoose');
const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const app = express();
app.use(express.json());

// Global handlers to surface any uncaught errors so they appear in logs/terminal
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception - server will exit. Error:');
  console.error(err && err.stack ? err.stack : err);
  // allow logs to flush then exit
  try {
    setTimeout(() => process.exit(1), 100);
  } catch (e) {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:');
  console.error(reason && reason.stack ? reason.stack : reason);
  try {
    setTimeout(() => process.exit(1), 100);
  } catch (e) {
    process.exit(1);
  }
});

// Simple JWT middleware to attach req.user when Authorization header present
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
function jwtMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return next();
  const parts = auth.split(' ');
  if (parts.length !== 2) return next();
  const scheme = parts[0];
  const token = parts[1];
  if (!/^Bearer$/i.test(scheme)) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.id, username: payload.username };
  } catch (e) {
    // ignore invalid token
  }
  return next();
}
app.use(jwtMiddleware);

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
console.log(
  'OPENAI configured:',
  !!process.env.OPENAI_API_KEY,
  'OPENAI_MODEL:',
  process.env.OPENAI_MODEL || 'gpt-5-nano'
);

// Serve static frontend (index.html in project root)
app.use(express.static(path.join(__dirname)));

// Mount routes (auth + prompts)
try {
  const authRoutes = require('./routes/auth');
  const promptRoutes = require('./routes/prompts');
  app.use('/api/auth', authRoutes);
  app.use('/api/prompts', promptRoutes);
} catch (e) {
  console.warn('Could not mount auth/prompts routes:', e.message || e);
}

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
    return {
      success: true,
      text: `${rawPrompt} \n\n[Note: OpenAI API key not configured — returning generated template.]`,
    };
  }

  try {
    const client = new OpenAI({ apiKey });
    const model =
      aiModel && aiModel.toLowerCase().includes('gpt')
        ? process.env.OPENAI_MODEL || 'gpt-5-nano'
        : 'gpt-5-nano';

    console.log('Calling OpenAI Responses API', { model });

    // Retry/backoff wrapper for transient errors (429, 5xx)
    const callWithRetries = async (retries = 3, baseDelayMs = 500) => {
      let attempt = 0;
      while (attempt < retries) {
        try {
          const resp = await client.responses.create({
            model,
            input: [
              { role: 'developer', content: 'Act as an expert Prompt Engineer' },
              {
                role: 'user',
                content: `Refine this prompt for clarity, structure, and effectiveness:\n\n${rawPrompt}`,
              },
            ],
          });
          return resp;
        } catch (err) {
          attempt += 1;
          const status = err && err.status ? err.status : err && err.code ? err.code : null;
          // If it's a transient server error or rate limit, retry; otherwise throw
          const retryable =
            (status && (status === 429 || (status >= 500 && status < 600))) ||
            (err && err.code && err.code === 'ECONNRESET');
          console.warn(
            `OpenAI call attempt ${attempt} failed${retryable ? ', will retry' : ''}:`,
            err && err.message ? err.message : err
          );
          if (!retryable || attempt >= retries) throw err;
          const delay = Math.pow(2, attempt - 1) * baseDelayMs + Math.floor(Math.random() * 100);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    };

    const resp = await callWithRetries(3, 500);

    console.log('OpenAI response received — keys:', Object.keys(resp).slice(0, 6));
    // The SDK may return `resp.output` with an array of content; fallback to output_text
    if (resp.output && resp.output.length) {
      const texts = resp.output
        .map((o) => {
          try {
            return o.type === 'message' && o.content && o.content[0] && o.content[0].text
              ? o.content[0].text
              : '';
          } catch (e) {
            return '';
          }
        })
        .filter(Boolean);
      if (texts.length) return { success: true, text: texts.join('\n').trim() };
    }
    if (resp.output_text) return { success: true, text: resp.output_text.trim() };
    console.warn('OpenAI response did not include text; returning raw prompt');
    return { success: true, text: rawPrompt };
  } catch (err) {
    // Determine if we should show full error details to the client
    const showDetails =
      process.env.SHOW_ERROR_DETAILS === 'true' || process.env.NODE_ENV !== 'production';
    console.warn(
      'OpenAI Responses API failed after retries — returning raw prompt. Error summary:',
      err && err.message ? err.message : err
    );
    if (err && err.response)
      console.warn('OpenAI SDK error response keys:', Object.keys(err.response).slice(0, 6));
    const errorMessage = showDetails
      ? err && err.message
        ? err.message
        : String(err)
      : 'Upstream service error';
    return { success: false, text: rawPrompt, error: errorMessage };
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

  const refinedResult = await refineWithOpenAI(rawPrompt, aiModel);
  if (!refinedResult || refinedResult.success === false) {
    // OpenAI failed — return a 502 Bad Gateway so frontend can surface the failure
    return res.status(502).json({
      error: 'OpenAI refinement failed',
      details: refinedResult && refinedResult.error ? refinedResult.error : 'unknown',
      prompt: refinedResult && refinedResult.text ? refinedResult.text : rawPrompt,
    });
  }

  return res.json({ prompt: refinedResult.text });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
