import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const TTS_MODEL = "gemini-2.5-flash-preview-tts";

export async function POST(req: NextRequest) {
  try {
    const { text, voice = "Kore", apiKey: userApiKey } = await req.json();

    const apiKey = (userApiKey || process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API anahtarı bulunamadı. Lütfen Ayarlar bölümünden girin veya Vercel ortam değişkeni ekleyin." },
        { status: 400 }
      );
    }

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Geçerli bir metin girilmedi." }, { status: 400 });
    }

    const genderTerm = voice === "Puck" ? "erkek" : "kadın";
    const promptText = `Sen profesyonel bir sesli kitap seslendiricisisin. Aşağıdaki metni HİÇBİR KELİME, CÜMLE VEYA DİPNOTU ATLAMADAN, eksiksiz, harfi harfine, doğal ve akıcı bir Türkçe ${genderTerm} sesiyle seslendir.

ÖNEMLİ SESLENDİRME KURALLARI:
1. Metin "[Bölüm Başlığı: ...]" ile başlıyorsa, köşeli parantez içindeki "Bölüm Başlığı:" kelimesini söylemeden doğrudan başlığın kendisini dingin bir başlık tonlamasıyla oku, ardından BİR NEFESLİK BELİRGİN BİR DURAKLAMA (yaklaşık 1 saniye sessizlik) bırak ve sonra ana metne geç.
2. Metinde geçen tüm "Dipnot:" bölümlerini, kaynakça ve yayın bilgilerini, yabancı/özgün terimleri ve tırnak içindeki tüm ifadeleri ASLA ATLAMADAN, aynen ve sırasıyla seslendir; dipnot bittiğinde "Ana metin:" kelimesini söylemeden kısa bir nefes verip normal metne devam et.
3. Parantez içi yaş veya sayı bilgilerini (örneğin "(33)") dipnot sanma; normal cümle akışı içinde doğal olarak oku.
4. Metinde geçen yabancı kişi, yer ve filozof isimlerini özgün dillerindeki doğru telaffuzlarıyla ve her yerde tutarlı biçimde seslendir.

Metin:
${text}`;

    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
        },
      },
      model: TTS_MODEL,
    };

    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Gemini API Hatası (${response.status}): ${errText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
