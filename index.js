// index.js  — Lean Express backend that stores posts.json on Neocities
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import fetch from 'node-fetch';               // keep if you installed node-fetch

/* ---------- ENV checks ---------- */
const { NEOCITIES_API_KEY, NEOCITIES_USERNAME, BLOG_URL } = process.env;
if (!NEOCITIES_API_KEY || !NEOCITIES_USERNAME || !BLOG_URL) {
  throw new Error('Missing env vars: set NEOCITIES_API_KEY, NEOCITIES_USERNAME, BLOG_URL');
}

/* ---------- Helpers ---------- */
async function downloadPosts() {
  try {
    const r = await fetch(`${BLOG_URL}/posts.json`, { cache: 'no-store' });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return await r.json();
  } catch (_) {
    return [];                                 // first post ever
  }
}

async function pushJsonToNeocities(postsArray) {
  const json = JSON.stringify(postsArray, null, 2);

  const form = new FormData();
  // no api_key field here
  form.append('files[posts.json]', json, {
    filename: 'posts.json',
    contentType: 'application/json',
  });

  const r = await fetch('https://neocities.org/api/upload', {
    method: 'POST',
    headers: {
      // Bearer token auth
      Authorization: `Bearer ${process.env.NEOCITIES_API_KEY}`
    },
    body: form,
  });

  const data = await r.json();
  if (data.result !== 'success') {
    throw new Error('Neocities upload failed: ' + JSON.stringify(data));
  }
  console.log('✅  Neocities upload succeeded');
}

}

/* ---------- Express ---------- */
const app = express();
app.use(cors());
app.use(express.json());

// serve /public (admin.html lives there)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/', express.static(path.join(__dirname, 'public')));

/* --- API routes --- */
app.post('/posts', async (req, res) => {
  try {
    const { title, content, tags = [] } = req.body;
    if (!title || !content) return res.status(400).json({ message: 'title & content required' });

    const current = await downloadPosts();
    const newPost = { title, content, tags, createdAt: new Date().toISOString() };
    await pushJsonToNeocities([newPost, ...current]);

    res.status(201).json({ message: 'Post created & Neocities updated!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error saving post' });
  }
});

app.get('/posts', async (_req, res) => {
  const posts = await downloadPosts();
  res.json(posts);
});

/* ---------- Start ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('API listening on ' + PORT));
