import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 5174;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_ORIGIN }));
app.get('/', (_, res) => res.send({ ok: true }));

// GET /api/twitter?username=foo&count=5
app.get('/api/twitter', async (req, res) => {
  const { username, count = 5 } = req.query;
  if(!process.env.TWITTER_BEARER_TOKEN){
    return res.status(500).json({ error: 'Missing TWITTER_BEARER_TOKEN' });
  }
  if(!username){ return res.status(400).json({ error: 'username is required' }); }
  const max = Math.max(1, Math.min(10, parseInt(count,10) || 5));

  try{
    const headers = { Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}` };
    // 1) Lookup user ID
    const userResp = await axios.get(`https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}`, {
      headers,
      params: { 'user.fields': 'id' }
    });
    const userId = userResp.data?.data?.id;
    if(!userId){ return res.status(404).json({ error: 'User not found' }); }

    // 2) Fetch tweets
    const tweetsResp = await axios.get(`https://api.twitter.com/2/users/${userId}/tweets`, {
      headers,
      params: {
        max_results: max,
        'tweet.fields': 'created_at,public_metrics'
      }
    });

    return res.json({ tweets: tweetsResp.data?.data || [] });
  }catch(err){
    console.error('Twitter API error', err?.response?.data || err.message);
    const status = err?.response?.status || 500;
    return res.status(status).json({ error: 'Twitter API request failed', details: err?.response?.data || err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
