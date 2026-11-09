"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Upload,
  BookOpen,
  Settings,
  Bookmark,
  Sun,
  Moon,
  Volume2,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  FastForward
} from "lucide-react";

interface Book {
  id: string;
  title: string;
  pages: string[];
}

const SAMPLE_BOOK: Book = {
  id: "little-prince",
  title: "Küçük Prens — Antoine de Saint-Exupéry",
  pages: [
    "Altı yaşındayken, balta girmemiş ormanlar üzerine yazılmış 'Yaşanmış Öyküler' adlı bir kitapta harika bir resim görmüştüm. Resimde bir avı yutmakta olan bir boa yılanı gösteriliyordu. İşte o resmin bir kopyası.\n\nKitapta şöyle deniyordu: 'Boa yılanları avlarını çiğnemeden olduğu gibi yutarlar. Sonra da kımıldayamaz hale gelir, altı aylık uykuya yatar, avlarını sindirmeye çalışırlar.' Ben de o zamanlar ormandaki serüvenler üzerine epey düşündüm ve renkli bir kalemle ilk resmimi yapmayı başardım.",
    "Resim 1'imi büyüklere gösterdim, korktular mı diye sordum. Bana: 'Şapkadan da korkulur mu hiç?' dediler. Oysa resmimde bir şapka yoktu. Bir fili sindirmekte olan bir boa yılanı çizmiştim ben.\n\nBüyükler anlayabilsin diye bu kez içini de çizdim. Büyüklerin kafası bir şeye ermezdi zaten. Çocuklar da her şeyi onlara açıklamak zorunda kaldıkları için çabuk yorulurlardı.",
    "Büyükler bana boa yılanlarını içten ya da dıştan çizmeyi bir yana bırakıp coğrafya, tarih, aritmetik ve dil bilgisiyle ilgilenmemi öğütlediler.\n\nBöylece altı yaşımda resim sanatı gibi parlak bir geleceğe veda etmek zorunda kaldım. Resim 1 ile Resim 2'nin başarısızlığı hevesimi kırmıştı. Büyükler kendi başlarına hiçbir şeyi anlayamazlar, çocukların da onlara her şeyi açıklayıp durmaktan canı sıkılır tabii."
  ]
};

export default function Home() {
  const [currentBook, setCurrentBook] = useState<Book>(SAMPLE_BOOK);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [currentParagraph, setCurrentParagraph] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [voiceName, setVoiceName] = useState<"Kore" | "Puck">("Kore");
  const [theme, setTheme] = useState<"light" | "dark" | "sepia">("sepia");
  const [fontSize, setFontSize] = useState<number>(18);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>("");
  const [bookmarks, setBookmarks] = useState<{ page: number; paragraph: number }[]>([]);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioCacheRef = useRef<Map<string, AudioBuffer>>(new Map());

  const paragraphs = (currentBook.pages[currentPage] || "").split("\n\n").filter(Boolean);

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const convertPcmToAudioBuffer = async (base64Pcm: string, sampleRate = 24000): Promise<AudioBuffer> => {
    const ctx = getAudioContext();
    const binary = atob(base64Pcm);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);
    const audioBuffer = ctx.createBuffer(1, int16Array.length, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < int16Array.length; i++) {
      channelData[i] = int16Array[i] / 32768.0;
    }
    return audioBuffer;
  };

  const playParagraph = async (pageIdx: number, pIdx: number) => {
    const targetText = (currentBook.pages[pageIdx] || "").split("\n\n").filter(Boolean)[pIdx];
    if (!targetText) {
      setIsPlaying(false);
      return;
    }

    if (currentSourceRef.current) {
      currentSourceRef.current.stop();
      currentSourceRef.current = null;
    }

    setIsLoadingAudio(true);
    const cacheKey = `${pageIdx}-${pIdx}-${voiceName}`;
    try {
      let buffer = audioCacheRef.current.get(cacheKey);
      if (!buffer) {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: targetText, voice: voiceName, apiKey }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Seslendirme isteği başarısız oldu.");
        }

        const data = await res.json();
        const pcmData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!pcmData) throw new Error("Ses verisi alınamadı.");

        buffer = await convertPcmToAudioBuffer(pcmData);
        audioCacheRef.current.set(cacheKey, buffer);
      }

      setIsLoadingAudio(false);
      const ctx = getAudioContext();
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = playbackRate;
      source.connect(ctx.destination);

      source.onended = () => {
        if (isPlaying) {
          if (pIdx + 1 < paragraphs.length) {
            setCurrentParagraph(pIdx + 1);
            playParagraph(pageIdx, pIdx + 1);
          } else if (pageIdx + 1 < currentBook.pages.length) {
            setCurrentPage(pageIdx + 1);
            setCurrentParagraph(0);
            playParagraph(pageIdx + 1, 0);
          } else {
            setIsPlaying(false);
          }
        }
      };

      currentSourceRef.current = source;
      source.start();
      setIsPlaying(true);
    } catch (err: any) {
      console.error(err);
      setIsLoadingAudio(false);
      setIsPlaying(false);
      alert(err.message || "Ses çalınırken bir hata meydana geldi.");
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      if (currentSourceRef.current) {
        currentSourceRef.current.stop();
        currentSourceRef.current = null;
      }
      setIsPlaying(false);
    } else {
      playParagraph(currentPage, currentParagraph);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pagesText: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items
          .map((item: any) => item.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (text) pagesText.push(text);
      }

      if (pagesText.length > 0) {
        setCurrentBook({
          id: file.name,
          title: file.name.replace(".pdf", ""),
          pages: pagesText,
        });
        setCurrentPage(0);
        setCurrentParagraph(0);
        audioCacheRef.current.clear();
      }
    } catch (error) {
      alert("PDF dosyası okunurken bir hata oluştu.");
    }
  };

  const themeClasses = {
    light: "bg-white text-zinc-900 border-zinc-200",
    dark: "bg-zinc-950 text-zinc-100 border-zinc-800",
    sepia: "bg-[#fbf7ee] text-[#433422] border-[#e8dfcf]",
  };

  const cardClasses = {
    light: "bg-zinc-50 border-zinc-200 shadow-sm",
    dark: "bg-zinc-900 border-zinc-800 shadow-lg",
    sepia: "bg-[#f4ecd8]/60 border-[#e5d8be] shadow-sm",
  };

  return (
    <div className={`min-h-screen flex flex-col font-serif transition-colors duration-300 ${themeClasses[theme]}`}>
      {/* Üst Zarif Bar */}
      <header className="h-16 px-6 border-b flex items-center justify-between backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition"
            title="Kitaplık & Bölümler"
          >
            <Menu className="w-5 h-5 opacity-70" />
          </button>
          <div className="flex items-center gap-2 font-sans font-semibold text-sm tracking-wide">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>SesliOku</span>
          </div>
        </div>

        <div className="max-w-md truncate font-sans text-xs opacity-70 text-center hidden md:block">
          {currentBook.title}
        </div>

        <div className="flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-sans text-xs font-medium border hover:opacity-80 transition bg-amber-500 text-white border-amber-600">
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF Yükle</span>
            <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
          </label>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition"
            title="Ayarlar"
          >
            <Settings className="w-5 h-5 opacity-70" />
          </button>
        </div>
      </header>

      {/* Ana Okuma Alanı */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10 flex flex-col justify-start">
        <div className="flex items-center justify-between font-sans text-xs opacity-50 mb-8 border-b pb-3">
          <span>Sayfa {currentPage + 1} / {currentBook.pages.length}</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setBookmarks([...bookmarks, { page: currentPage, paragraph: currentParagraph }]);
                alert("Ayraç eklendi!");
              }}
              className="flex items-center gap-1 hover:opacity-100 transition"
            >
              <Bookmark className="w-3.5 h-3.5" /> Ayraç Bırak
            </button>
          </div>
        </div>

        {/* Metin Paragrafları */}
        <div className="space-y-6 leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
          {paragraphs.map((p, idx) => {
            const isCurrent = idx === currentParagraph;
            return (
              <p
                key={idx}
                onClick={() => {
                  setCurrentParagraph(idx);
                  playParagraph(currentPage, idx);
                }}
                className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 ${
                  isCurrent
                    ? `${cardClasses[theme]} ring-2 ring-amber-500/40 font-medium scale-[1.01]`
                    : "hover:bg-black/[0.02] dark:hover:bg-white/[0.02] opacity-80"
                }`}
              >
                {p}
              </p>
            );
          })}
        </div>

        {/* Sayfa Değiştirme */}
        <div className="flex items-center justify-between mt-12 pt-6 border-t font-sans">
          <button
            disabled={currentPage === 0}
            onClick={() => {
              setCurrentPage((prev) => Math.max(0, prev - 1));
              setCurrentParagraph(0);
            }}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border text-xs font-medium disabled:opacity-30 hover:bg-black/5 transition"
          >
            <ChevronLeft className="w-4 h-4" /> Önceki Sayfa
          </button>
          <button
            disabled={currentPage >= currentBook.pages.length - 1}
            onClick={() => {
              setCurrentPage((prev) => Math.min(currentBook.pages.length - 1, prev + 1));
              setCurrentParagraph(0);
            }}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border text-xs font-medium disabled:opacity-30 hover:bg-black/5 transition"
          >
            Sonraki Sayfa <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* Yüzen Şık Oynatıcı Barı (Floating Player) */}
      <footer className="sticky bottom-6 px-4 max-w-xl w-full mx-auto z-40">
        <div className={`p-4 rounded-3xl border shadow-2xl backdrop-blur-xl flex items-center justify-between font-sans ${cardClasses[theme]}`}>
          {/* Hız */}
          <button
            onClick={() => {
              const rates = [0.75, 1.0, 1.25, 1.5, 2.0];
              const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
              setPlaybackRate(nextRate);
            }}
            className="px-2.5 py-1 rounded-xl text-xs font-semibold border hover:bg-black/5 transition"
          >
            {playbackRate}x
          </button>

          {/* Oynatıcı Kontrolleri */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (currentParagraph > 0) {
                  setCurrentParagraph(currentParagraph - 1);
                  playParagraph(currentPage, currentParagraph - 1);
                }
              }}
              className="p-2 rounded-full hover:bg-black/5 transition opacity-70"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              disabled={isLoadingAudio}
              className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center hover:scale-105 transition shadow-lg shadow-amber-500/30"
            >
              {isLoadingAudio ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>

            <button
              onClick={() => {
                if (currentParagraph < paragraphs.length - 1) {
                  setCurrentParagraph(currentParagraph + 1);
                  playParagraph(currentPage, currentParagraph + 1);
                }
              }}
              className="p-2 rounded-full hover:bg-black/5 transition opacity-70"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Ses Karakteri */}
          <button
            onClick={() => setVoiceName(voiceName === "Kore" ? "Puck" : "Kore")}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-medium hover:bg-black/5 transition"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-500" />
            <span>{voiceName === "Kore" ? "Kadın" : "Erkek"}</span>
          </button>
        </div>
      </footer>

      {/* Ayarlar Modalı */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className={`max-w-md w-full rounded-3xl p-6 border shadow-2xl ${cardClasses[theme]}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-base">Okuma & Ses Ayarları</h3>
              <button onClick={() => setSettingsOpen(false)} className="p-1 rounded-lg hover:bg-black/5">
                <X className="w-5 h-5 opacity-60" />
              </button>
            </div>

            <div className="space-y-5 text-sm">
              <div>
                <label className="block text-xs font-semibold opacity-70 mb-2">Tema</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["light", "sepia", "dark"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`py-2 rounded-xl border text-xs font-medium capitalize transition ${
                        theme === t ? "border-amber-500 bg-amber-500/10 font-bold" : ""
                      }`}
                    >
                      {t === "light" ? "Açık" : t === "sepia" ? "Sepya" : "Koyu"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold opacity-70 mb-2">Yazı Boyutu ({fontSize}px)</label>
                <input
                  type="range"
                  min="14"
                  max="26"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold opacity-70 mb-1">Gemini API Anahtarı (İsteğe Bağlı)</label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full p-2.5 rounded-xl border bg-transparent text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
