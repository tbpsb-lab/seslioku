const http = require('http');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const PORT = 3005;

const server = http.createServer(async (req, res) => {
  // CORS & PNA (Private Network Access) Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', bridge: 'msedge-tts' }));
    return;
  }

  if (url.pathname === '/api/tts') {
    let text = url.searchParams.get('text');
    let voice = url.searchParams.get('voice') || 'tr-TR-EmelNeural';
    let rate = parseFloat(url.searchParams.get('rate') || '1.0');

    if (req.method === 'POST') {
      try {
        const body = await new Promise((resolve) => {
          let data = '';
          req.on('data', chunk => data += chunk);
          req.on('end', () => resolve(JSON.parse(data || '{}')));
        });
        if (body.text) text = body.text;
        if (body.voice) voice = body.voice;
        if (body.rate) rate = parseFloat(body.rate);
      } catch (e) {}
    }

    if (!text) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Text parameter is required' }));
      return;
    }

    const voiceName = (voice === 'erkek' || voice === 'ahmet' || voice.includes('Ahmet'))
      ? 'tr-TR-AhmetNeural'
      : 'tr-TR-EmelNeural';

    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

      const ratePercent = Math.round((rate - 1.0) * 100);
      const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

      const { audioStream } = tts.toStream(text, { rate: rateStr });

      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400'
      });

      audioStream.pipe(res);
    } catch (err) {
      console.error('Bridge TTS Hatası:', err.message);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    }
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`[SesliOku Bridge] Chrome Ses Köprüsü http://localhost:${PORT} üzerinde başarıyla başlatıldı!`);
});
