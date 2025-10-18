const mongoose = require('mongoose');

const PromptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  sessionId: { type: String, default: null },
  framework: { type: String },
  aiModel: { type: String },
  goal: { type: String },
  audience: { type: String },
  promptText: { type: String },
  meta: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Prompt || mongoose.model('Prompt', PromptSchema);
