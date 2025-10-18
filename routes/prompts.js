const express = require('express');
const router = express.Router();
const Prompt = require('../models/Prompt');
const mongoose = require('mongoose');

// In-memory fallback store used when MongoDB isn't connected. This is
// intentionally simple and only for local development while Atlas auth
// issues are being resolved.
const inMemoryPrompts = [];

function isDbConnected() {
  try { return mongoose && mongoose.connection && mongoose.connection.readyState === 1; }
  catch (e) { return false; }
}

function makeId() {
  return (Date.now().toString(36) + Math.random().toString(36).slice(2,9));
}

// Simple JWT middleware (expects req.user to be set by an upstream middleware when present)
function requireAuthOrSession(req, res, next) {
  if (req.user) return next();
  // Allow anonymous with sessionId header or query param
  const sessionId = req.headers['x-session-id'] || req.query.session;
  if (sessionId) { req.sessionId = sessionId; return next(); }
  return res.status(401).json({ error: 'Authentication required or provide session id' });
}

// POST /api/prompts
router.post('/', async (req, res) => {
  const { promptText, framework, aiModel, goal, audience, meta } = req.body || {};
  if (!promptText) return res.status(400).json({ error: 'promptText required' });
  try {
    if (isDbConnected()) {
      const doc = await Prompt.create({
        userId: req.user ? req.user.id : null,
        sessionId: req.sessionId || null,
        framework, aiModel, goal, audience, promptText, meta
      });
      return res.status(201).json(doc);
    }

    // In-memory fallback
    const doc = {
      _id: makeId(),
      userId: req.user ? req.user.id : null,
      sessionId: req.sessionId || null,
      framework: framework || null,
      aiModel: aiModel || null,
      goal: goal || null,
      audience: audience || null,
      promptText,
      meta: meta || null,
      createdAt: new Date().toISOString()
    };
    inMemoryPrompts.unshift(doc);
    // keep reasonable cap
    if (inMemoryPrompts.length > 500) inMemoryPrompts.length = 500;
    return res.status(201).json(doc);
  } catch (err) {
    console.error('Save prompt failed', err);
    res.status(500).json({ error: 'Save failed' });
  }
});

// GET /api/prompts
router.get('/', async (req, res) => {
  try {
    if (isDbConnected()) {
      if (req.user) {
        const docs = await Prompt.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(200);
        return res.json(docs);
      }
      const session = req.query.session || req.headers['x-session-id'];
      if (session) {
        const docs = await Prompt.find({ sessionId: session }).sort({ createdAt: -1 }).limit(200);
        return res.json(docs);
      }
      return res.status(400).json([]);
    }

    // In-memory fetch
    if (req.user) {
      const docs = inMemoryPrompts.filter(d => d.userId && String(d.userId) === String(req.user.id));
      return res.json(docs.slice(0,200));
    }
    const session = req.query.session || req.headers['x-session-id'];
    if (session) {
      const docs = inMemoryPrompts.filter(d => d.sessionId === session);
      return res.json(docs.slice(0,200));
    }
    return res.status(400).json([]);
  } catch (err) {
    console.error('Fetch prompts failed', err);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// DELETE /api/prompts/:id
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    if (isDbConnected()) {
      const doc = await Prompt.findById(id);
      if (!doc) return res.status(404).json({ error: 'Not found' });
      // check ownership: either user matches or session matches
      if (req.user && String(doc.userId) === String(req.user.id)) {
        await doc.remove();
        return res.status(204).send();
      }
      const session = req.headers['x-session-id'] || req.query.session;
      if (session && doc.sessionId === session) { await doc.remove(); return res.status(204).send(); }
      return res.status(403).json({ error: 'Not allowed' });
    }

    // In-memory delete
    const idx = inMemoryPrompts.findIndex(d => String(d._id) === String(id));
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const doc = inMemoryPrompts[idx];
    if (req.user && String(doc.userId) === String(req.user.id)) {
      inMemoryPrompts.splice(idx,1);
      return res.status(204).send();
    }
    const session = req.headers['x-session-id'] || req.query.session;
    if (session && doc.sessionId === session) { inMemoryPrompts.splice(idx,1); return res.status(204).send(); }
    return res.status(403).json({ error: 'Not allowed' });
  } catch (err) {
    console.error('Delete failed', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
