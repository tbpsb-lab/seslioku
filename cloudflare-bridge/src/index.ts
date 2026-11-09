/**
 * SesliOku - Cloudflare Edge-TTS Audio Bridge
 * Microsoft Edge Sinirsel Seslerini (Emel & Ahmet) Google Chrome ve tüm tarayıcılara HTTPS üzerinden ücretsiz aktarır.
 */

export interface Env {}

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WSS_URL = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function generateSecMsGec(trustedClientToken: string) {
  // Windows file time (100ns units since 1601-01-01)
  const ticks = (BigInt(Date.now()) + 11644473600000n) * 10000n;
  const rounded = ticks - (ticks % 3000000000n);
  const str = rounded.toString() + trustedClientToken;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", bridge: "seslioku-edge-tts" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/api/tts" || url.pathname === "/tts") {
      let text = url.searchParams.get("text");
      let voice = url.searchParams.get("voice") || "tr-TR-EmelNeural";
      let rate = parseFloat(url.searchParams.get("rate") || "1.0");

      if (request.method === "POST") {
        try {
          const body: any = await request.json();
          if (body.text) text = body.text;
          if (body.voice) voice = body.voice;
          if (body.rate) rate = parseFloat(body.rate);
        } catch (e) {}
      }

      if (!text) {
        return new Response(JSON.stringify({ error: "Metin (text) parametresi gereklidir." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const voiceName = (voice === "erkek" || voice === "ahmet" || voice.includes("Ahmet"))
        ? "tr-TR-AhmetNeural"
        : "tr-TR-EmelNeural";

      const ratePercent = Math.round((rate - 1.0) * 100);
      const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

      const reqId = generateUUID();
      const secMsGec = await generateSecMsGec(TRUSTED_CLIENT_TOKEN);
      const wssEndpoint = `${WSS_URL}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=2-143.0.3650.96&ConnectionId=${reqId}`;

      try {
        // Cloudflare Worker natively upgrades fetch to WebSocket!
        const wsResponse = await fetch(wssEndpoint, {
          headers: {
            "Upgrade": "websocket",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
            "Origin": "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold"
          }
        });

        const webSocket = (wsResponse as any).webSocket;
        if (!webSocket) {
          throw new Error("WebSocket bağlantısı kurulamadı.");
        }

        webSocket.accept();

        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();

        webSocket.addEventListener("message", async (event: MessageEvent) => {
          if (typeof event.data === "string") {
            if (event.data.includes("turn.end")) {
              try { await writer.close(); } catch(e) {}
              webSocket.close();
            }
          } else if (event.data instanceof ArrayBuffer) {
            const buffer = new Uint8Array(event.data);
            // Search for "Path:audio\r\n" delimiter
            const needle = new TextEncoder().encode("Path:audio\r\n");
            let idx = -1;
            for (let i = 0; i <= buffer.length - needle.length; i++) {
              let match = true;
              for (let j = 0; j < needle.length; j++) {
                if (buffer[i + j] !== needle[j]) {
                  match = false;
                  break;
                }
              }
              if (match) {
                idx = i;
                break;
              }
            }

            if (idx !== -1) {
              const audioBytes = buffer.slice(idx + needle.length);
              try {
                await writer.write(audioBytes);
              } catch (e) {}
            }
          }
        });

        webSocket.addEventListener("close", async () => {
          try { await writer.close(); } catch(e) {}
        });

        webSocket.addEventListener("error", async () => {
          try { await writer.abort(); } catch(e) {}
        });

        // Send Speech Config
        const timestamp = new Date().toISOString();
        webSocket.send(`Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`);

        // Send SSML Text
        const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='tr-TR'><voice name='${voiceName}'><prosody rate='${rateStr}'>${text}</prosody></voice></speak>`;
        webSocket.send(`X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp}Z\r\nPath:ssml\r\n\r\n${ssml}`);

        return new Response(readable, {
          headers: {
            ...corsHeaders,
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=86400"
          }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    return new Response("SesliOku TTS Bridge - 404", { status: 404 });
  }
};
