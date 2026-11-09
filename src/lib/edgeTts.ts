import { Client } from "@gradio/client";

let gradioClient: any = null;

export async function synthesizeEdgeTTS(
  text: string,
  voice: "tr-TR-EmelNeural" | "tr-TR-AhmetNeural",
  rate: number = 1.0
): Promise<string> {
  const hfVoice =
    voice === "tr-TR-AhmetNeural"
      ? "tr-TR-AhmetNeural - tr-TR (Male)"
      : "tr-TR-EmelNeural - tr-TR (Female)";

  const ratePercent = Math.round((rate - 1.0) * 100);

  // 1. Hugging Face Edge-TTS Space (Canlı Firebase ve Tarayıcı Doğrudan Bağlantı)
  try {
    if (!gradioClient) {
      gradioClient = await Client.connect("innoai/Edge-TTS-Text-to-Speech");
    }
    const result = await gradioClient.predict(0, [
      text,
      hfVoice,
      ratePercent,
      0, // pitch
    ]);
    const audioData = (result as any)?.data?.[0];
    if (audioData?.url) {
      return audioData.url;
    }
  } catch (hfErr) {
    console.warn("Hugging Face Edge-TTS yanıt veremedi, yerel API deneniyor:", hfErr);
    gradioClient = null; // Bağlantıyı sıfırla
  }

  // 2. Yerel Node.js /api/tts yedeği (Yerel geliştirmede)
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, rate }),
    });
    if (res.ok) {
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    }
  } catch (localErr) {
    console.warn("Yerel API yedek hatası:", localErr);
  }

  throw new Error("Ses sentezleme servisine ulaşılamadı.");
}
