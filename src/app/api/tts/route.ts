import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export async function POST(req: NextRequest) {
  try {
    const { text, voice = "tr-TR-EmelNeural", rate = 1.0 } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Geçerli bir metin girilmedi." }, { status: 400 });
    }

    const voiceName = voice === "erkek" || voice === "tr-TR-AhmetNeural" 
      ? "tr-TR-AhmetNeural" 
      : "tr-TR-EmelNeural";

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    // Hız ayarı (Prosody: +0%, +20%, -20% vb.)
    const ratePercent = Math.round((rate - 1.0) * 100);
    const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

    const { audioStream } = tts.toStream(text, {
      rate: rateStr,
    });

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
      audioStream.on("end", () => resolve());
      audioStream.on("error", (err: Error) => reject(err));
    });

    const audioBuffer = Buffer.concat(chunks);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error: any) {
    console.error("Edge TTS hatası:", error);
    return NextResponse.json(
      { error: error?.message || "Ses sentezleme sırasında bir hata oluştu." },
      { status: 500 }
    );
  }
}
