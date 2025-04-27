// api/index.js
require('dotenv').config();

/* ---------- DEBUG: print once ---------- */
const MONGO_URI = process.env.MONGODB_URI;
console.log('DEBUG • Loaded URI:', MONGO_URI || 'undefined');
if (!MONGO_URI) {
  throw new Error('MONGODB_URI is missing. Check your .env file.');
}
/* ---------------------------------------- */

const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const serverless = require('serverless-http');

const app = express();
app.use(express.json());
app.use(cors());

/* ---------- Connect once, reuse ---------- */
let connPromise;
async function connectDB() {
  if (connPromise) return connPromise;         // reuse on warm starts
  console.log('DEBUG • Connecting to Mongo…');
  connPromise = mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS:        8000,
  });
  await connPromise;
  console.log('DEBUG • Connected to Mongo');
  return connPromise;
}
/* ----------------------------------------- */

/* ---------- Schema & model ---------- */
const postSchema = new mongoose.Schema({
  title:      String,
  content:    String,
  tags:       [String],
  createdAt: { type: Date, default: Date.now },
});
const Post = mongoose.models.Post || mongoose.model('Post', postSchema);
/* ------------------------------------- */

/* ---------- Routes ---------- */
app.get('/posts', async (req, res) => {
  await connectDB();
  const filter = req.query.tag ? { tags: req.query.tag } : {};
  const posts  = await Post.find(filter).sort({ createdAt: -1 });
  res.json(posts);
});

app.post('/posts', async (req, res) => {
  await connectDB();
  const { title, content, tags } = req.body;
  await Post.create({ title, content, tags });
  res.status(201).json({ message: 'Post created successfully' });
});
/* ----------------------------- */

/* ---------- Export for Vercel (adds CORS + OPTIONS) ---------- */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return serverless(app)(req, res);
};
/* ------------------------------------------------------------- */

/* ---------- Local dev: start Express normally ---------- */
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Local API listening on ${PORT}`));
}
/* ------------------------------------------------------- */
