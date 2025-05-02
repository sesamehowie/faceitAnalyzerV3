import express from 'express';
import cors from 'cors';
import { run } from './src/runner.js';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/analyze', async (req, res) => {
  const { matchUrl, nickname } = req.body;
  try {
    if (!matchUrl || !nickname) {
      return res.status(400).json({ error: 'Missing matchUrl or nickname' });
    }
    const winProbabilities = await run(matchUrl, nickname);
    res.json({ winProbabilities });
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));