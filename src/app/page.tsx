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
  Volume2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2
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
  const [selectedVoice, setSelectedVoice] = useState<"tr-TR-EmelNeural" | "tr-TR-AhmetNeural">("tr-TR-EmelNeural");
  const [theme, setTheme] = useState<"light" | "dark" | "sepia">("sepia");
  const [fontSize, setFontSize] = useState<number>(18);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<{ page: number; paragraph: number }[]>([]);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Prevent Garbage Collection in Chromium browsers
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const paragraphs = (currentBook.pages[currentPage] || "").split("\n\n").filter(Boolean);

  // Sesleri yükle ve hazırla
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      }
    };

    updateVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const stopAudio = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    activeUtteranceRef.current = null;
    setIsPlaying(false);
  };

  const playParagraph = (pageIdx: number, pIdx: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Tarayıcınız sesli okuma özelliğini desteklemiyor.");
      return;
    }

    const targetList = (currentBook.pages[pageIdx] || "").split("\n\n").filter(Boolean);
    const targetText = targetList[pIdx];

    if (!targetText) {
      setIsPlaying(false);
      return;
    }

    // Önceki konuşmayı sonlandır
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(targetText);
    activeUtteranceRef.current = utterance; // Referansı sakla, GC tarafından silinmesin!

    utterance.lang = "tr-TR";
    utterance.rate = playbackRate;

    // Mevcut sesler arasından en uygun Türkçe sesi seç
    const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
    const trVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("tr"));

    if (selectedVoice === "tr-TR-AhmetNeural") {
      // Erkek Ses Seçimi: Microsoft Ahmet Online (Natural) veya Tolga / Erkek
      const maleVoice =
        trVoices.find((v) => v.name.toLowerCase().includes("ahmet")) ||
        trVoices.find((v) => v.name.toLowerCase().includes("tolga") || v.name.toLowerCase().includes("erkek") || v.name.toLowerCase().includes("male")) ||
        trVoices[0];

      if (maleVoice) utterance.voice = maleVoice;
      utterance.pitch = 0.88; // Erkek ses derinliği
    } else {
      // Kadın Ses Seçimi (Varsayılan): Microsoft Emel Online (Natural) veya Kadın sesi
      const femaleVoice =
        trVoices.find((v) => v.name.toLowerCase().includes("emel")) ||
        trVoices.find((v) => v.name.toLowerCase().includes("kadın") || v.name.toLowerCase().includes("female")) ||
        trVoices[0];

      if (femaleVoice) utterance.voice = femaleVoice;
      utterance.pitch = 1.12; // Kadın ses berraklığı ve tonlaması
    }

    utterance.onstart = () => {
      setIsPlaying(true);
    };

    utterance.onend = () => {
      if (pIdx + 1 < targetList.length) {
        setCurrentParagraph(pIdx + 1);
        playParagraph(pageIdx, pIdx + 1);
      } else if (pageIdx + 1 < currentBook.pages.length) {
        setCurrentPage(pageIdx + 1);
        setCurrentParagraph(0);
        playParagraph(pageIdx + 1, 0);
      } else {
        setIsPlaying(false);
      }
    };

    utterance.onerror = (e) => {
      console.warn("SpeechSynthesis uyarısı:", e);
      setIsPlaying(false);
    };

    // Chromium pause/freeze hatasını çöz
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    // Anında konuşmaya başla
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopAudio();
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
        stopAudio();
        setCurrentBook({
          id: file.name,
          title: file.name.replace(".pdf", ""),
          pages: pagesText,
        });
        setCurrentPage(0);
        setCurrentParagraph(0);
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
    sepia: "bg-[#f4ecd8]/70 border-[#e5d8be] shadow-sm",
  };

  return (
    <div className={`min-h-screen flex flex-col font-serif transition-colors duration-300 ${themeClasses[theme]}`}>
      {/* Üst Zarif Bar */}
      <header className="h-16 px-6 border-b flex items-center justify-between backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-sans font-semibold text-sm tracking-wide">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>SesliOku</span>
            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Edge Neural TTS
            </span>
          </div>
        </div>

        <div className="max-w-md truncate font-sans text-xs opacity-70 text-center hidden md:block">
          {currentBook.title}
        </div>

        <div className="flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-sans text-xs font-medium border hover:opacity-80 transition bg-amber-500 text-white border-amber-600 shadow-sm">
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF Yükle</span>
            <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
          </label>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition border border-transparent hover:border-black/10"
            title="Görünüm Ayarları"
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
              stopAudio();
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
              stopAudio();
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
          {/* Hız Seçici */}
          <button
            onClick={() => {
              const rates = [0.75, 1.0, 1.25, 1.5, 2.0];
              const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
              setPlaybackRate(nextRate);
              if (isPlaying) {
                stopAudio();
                playParagraph(currentPage, currentParagraph);
              }
            }}
            className="px-2.5 py-1 rounded-xl text-xs font-semibold border hover:bg-black/5 transition"
            title="Okuma Hızı"
          >
            {playbackRate}x
          </button>

          {/* Oynatıcı Kontrolleri */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (currentParagraph > 0) {
                  stopAudio();
                  setCurrentParagraph(currentParagraph - 1);
                  playParagraph(currentPage, currentParagraph - 1);
                }
              }}
              className="p-2 rounded-full hover:bg-black/5 transition opacity-70"
              title="Önceki Paragraf"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center hover:scale-105 transition shadow-lg shadow-amber-500/30"
              title={isPlaying ? "Durdur" : "Sesli Oku"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>

            <button
              onClick={() => {
                if (currentParagraph < paragraphs.length - 1) {
                  stopAudio();
                  setCurrentParagraph(currentParagraph + 1);
                  playParagraph(currentPage, currentParagraph + 1);
                }
              }}
              className="p-2 rounded-full hover:bg-black/5 transition opacity-70"
              title="Sonraki Paragraf"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Microsoft Edge Doğal Ses Seçici: Emel (Kadın) / Ahmet (Erkek) */}
          <div className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-amber-500 opacity-70" />
            <select
              value={selectedVoice}
              onChange={(e) => {
                setSelectedVoice(e.target.value as any);
                if (isPlaying) {
                  stopAudio();
                  playParagraph(currentPage, currentParagraph);
                }
              }}
              className="bg-transparent text-xs font-medium border border-color rounded-xl px-2 py-1 max-w-[140px] truncate outline-none cursor-pointer"
            >
              <option value="tr-TR-EmelNeural" className="text-zinc-900 bg-white">
                👩 Emel (Kadın - Doğal)
              </option>
              <option value="tr-TR-AhmetNeural" className="text-zinc-900 bg-white">
                👨 Ahmet (Erkek - Doğal)
              </option>
            </select>
          </div>
        </div>
      </footer>

      {/* Ayarlar Modalı */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className={`max-w-md w-full rounded-3xl p-6 border shadow-2xl ${cardClasses[theme]}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-base">Görünüm Ayarları</h3>
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

              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                🎙️ <strong>Microsoft Edge Neural TTS:</strong> 
                <br />• <strong>Emel (Kadın):</strong> Varsayılan stüdyo kalitesinde Türkçe ses.
                <br />• <strong>Ahmet (Erkek):</strong> Doğal tonlamalı Türkçe erkek sesi.
                <br />Tamamen ücretsizdir, hiçbir API anahtarı veya kota tüketimi gerektirmez.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
