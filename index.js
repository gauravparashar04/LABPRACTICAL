const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');

const app = express();
const PORT = 3000;


app.use(express.json());


mongoose.connect('mongodb://localhost:27017/urlshortener')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));


const urlSchema = new mongoose.Schema({
  longUrl: { type: String, required: true },
  shortId: { type: String, required: true, unique: true },
  accessCount: { type: Number, default: 0 }
});

const Url = mongoose.model('Url', urlSchema);


function generateShortId() {
  return crypto.randomBytes(4).toString('hex');
}



app.post('/shorturl', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    let shortId;
    let existingUrl;

    
    do {
      shortId = generateShortId();
      existingUrl = await Url.findOne({ shortId });
    } while (existingUrl);

    const newUrl = new Url({
      longUrl: url,
      shortId
    });

    await newUrl.save();

    res.json({
      shortUrl: `http://localhost:${PORT}/${shortId}`,
      shortId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/:shortId', async (req, res) => {
  try {
    const { shortId } = req.params;
    const url = await Url.findOne({ shortId });

    if (!url) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

   
    url.accessCount += 1;
    await url.save();

   
    res.redirect(url.longUrl);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.patch('/:shortId', async (req, res) => {
  try {
    const { shortId } = req.params;
    const { url, accessCount } = req.body;

    const updateData = {};
    if (url !== undefined) updateData.longUrl = url;
    if (accessCount !== undefined) updateData.accessCount = accessCount;

    const updatedUrl = await Url.findOneAndUpdate(
      { shortId },
      updateData,
      { new: true }
    );

    if (!updatedUrl) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    res.json({
      shortId: updatedUrl.shortId,
      longUrl: updatedUrl.longUrl,
      accessCount: updatedUrl.accessCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});