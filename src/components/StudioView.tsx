import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Sparkles, Send, Star, BookmarkPlus, Upload, Camera, Tag, RotateCcw, X } from 'lucide-react';
import { IM, FILTERS, STICKERS } from '../data/mockData';
import { SOUND_NAMES, playSynthesizerSound, playTapSound } from '../utils/audio';

interface StudioViewProps {
  onPostClip: (clip: {
    caption: string;
    imageKey: string;
    filter: string;
    sticker: string;
    soundName: string;
    tags?: string;
  }) => void;
  onAddToStory: (story: {
    imageKey: string;
    filter: string;
    caption: string;
  }) => void;
  onSaveDraft: (draft: {
    img: string;
    fl: number;
    sticker: string;
    sound: number;
    cap: string;
  }) => void;
}

export const StudioView: React.FC<StudioViewProps> = ({
  onPostClip,
  onAddToStory,
  onSaveDraft
}) => {
  const [selectedImage, setSelectedImage] = useState<string>('a');
  const [customMediaData, setCustomMediaData] = useState<string | null>(null);
  const [selectedFilterIdx, setSelectedFilterIdx] = useState<number>(0);
  const [selectedSticker, setSelectedSticker] = useState<string>('');
  const [customStickerInput, setCustomStickerInput] = useState<string>('');
  const [selectedSoundIdx, setSelectedSoundIdx] = useState<number>(0);
  const [caption, setCaption] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['#BLiNBoost', '#VibeIn60s']);

  // Camera capture state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFilterStyle = FILTERS[selectedFilterIdx][1];

  // Stop camera helper
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      alert('Camera access could not be initialized or was not granted.');
    }
  };

  // Capture photo from video feed
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCustomMediaData(dataUrl);
      setSelectedImage(dataUrl);
      stopCamera();
      playTapSound();
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomMediaData(reader.result);
        setSelectedImage(reader.result);
        stopCamera();
        playTapSound();
      }
    };
    reader.readAsDataURL(file);
  };

  // Effective visual source
  const effectiveVisualSource = customMediaData || (IM[selectedImage] || IM.a);

  // Active sticker
  const effectiveSticker = customStickerInput.trim() || selectedSticker;

  const handlePost = () => {
    onPostClip({
      caption: caption.trim() || 'My new BLiN clip ✨',
      imageKey: selectedImage,
      filter: activeFilterStyle,
      sticker: effectiveSticker,
      soundName: SOUND_NAMES[selectedSoundIdx],
      tags: selectedTags.join(' ')
    });
    setCaption('');
    setSelectedSticker('');
    setCustomStickerInput('');
    setCustomMediaData(null);
  };

  const handleStory = () => {
    onAddToStory({
      imageKey: selectedImage,
      filter: activeFilterStyle,
      caption: caption.trim() || effectiveSticker || 'New story ✨'
    });
    setCaption('');
    setSelectedSticker('');
    setCustomStickerInput('');
  };

  const handleDraft = () => {
    onSaveDraft({
      img: selectedImage,
      fl: selectedFilterIdx,
      sticker: effectiveSticker,
      sound: selectedSoundIdx,
      cap: caption
    });
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
    playTapSound();
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-2xl mx-auto w-full no-scrollbar">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*,video/*"
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-white flex items-center gap-1.5">
          <span>Creator Studio</span>
          <Sparkles className="w-4 h-4 text-[#22c55e]" />
        </h2>
        <span className="text-xs text-[#a3e635] font-bold">New Creator Boost On 🚀</span>
      </div>

      {/* Live Preview / Camera Canvas */}
      <div className="relative h-64 rounded-2xl overflow-hidden shadow-2xl border border-[var(--border)] bg-black flex items-center justify-center">
        {isCameraActive ? (
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ filter: activeFilterStyle }}
            />
            <div className="absolute top-3 right-3 z-20">
              <button
                onClick={stopCamera}
                className="p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center z-20">
              <button
                onClick={capturePhoto}
                className="px-4 py-2 rounded-full bg-[#22c55e] text-[#04210f] font-extrabold text-xs shadow-lg flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>Capture Frame</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center transition-all duration-300"
              style={{
                backgroundImage: `url(${effectiveVisualSource})`,
                filter: activeFilterStyle
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

            {/* Sticker Overlay */}
            {effectiveSticker && (
              <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
                <span className="bg-black/75 backdrop-blur-md px-4 py-2 rounded-full text-base font-black text-[#a3e635] shadow-2xl border border-[#a3e635]/40 animate-pulse">
                  {effectiveSticker}
                </span>
              </div>
            )}

            {/* Audio track label */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
              <div className="flex items-center gap-1.5 truncate">
                <Volume2 className="w-3.5 h-3.5 text-[#22c55e]" />
                <span className="truncate">{SOUND_NAMES[selectedSoundIdx]}</span>
              </div>
              <span className="text-[10px] text-gray-400">Audio Preview</span>
            </div>
          </>
        )}
      </div>

      {/* Media Input Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="py-2.5 px-3 rounded-xl bg-[var(--card)] hover:bg-[var(--card-hover)] border border-[var(--border)] text-xs font-bold text-gray-200 flex items-center justify-center gap-2 transition-colors"
        >
          <Upload className="w-4 h-4 text-[#22c55e]" />
          <span>Upload File</span>
        </button>

        <button
          onClick={startCamera}
          className="py-2.5 px-3 rounded-xl bg-[var(--card)] hover:bg-[var(--card-hover)] border border-[var(--border)] text-xs font-bold text-gray-200 flex items-center justify-center gap-2 transition-colors"
        >
          <Camera className="w-4 h-4 text-[#4ade80]" />
          <span>Camera Snapshot</span>
        </button>
      </div>

      {/* Preset Visuals */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Or Choose Creative Preset
          </label>
          {customMediaData && (
            <button
              onClick={() => {
                setCustomMediaData(null);
                setSelectedImage('a');
              }}
              className="text-[11px] text-amber-400 font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Custom</span>
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'a', label: '💃 Afro Dance' },
            { id: 'k', label: '🎹 Beat Making' },
            { id: 'z', label: '🧵 Upcycled Fit' },
            { id: 'm', label: '🛹 Street Skate' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCustomMediaData(null);
                setSelectedImage(item.id);
                stopCamera();
                playTapSound();
              }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                selectedImage === item.id && !customMediaData
                  ? 'bg-[#22c55e] text-[#04210f] font-bold shadow-md'
                  : 'bg-[var(--card)] text-gray-300 hover:bg-[#1b261f] border border-[var(--border)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Filters */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
          Visual Filter
        </label>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f, idx) => (
            <button
              key={f[0]}
              onClick={() => {
                setSelectedFilterIdx(idx);
                playTapSound();
              }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                selectedFilterIdx === idx
                  ? 'bg-[#22c55e] text-[#04210f] font-bold shadow-md'
                  : 'bg-[var(--card)] text-gray-300 hover:bg-[#1b261f] border border-[var(--border)]'
              }`}
            >
              {f[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Stickers & Custom Sticker */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
          Sticker Overlay (Preset or Type Your Own)
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {STICKERS.map((stk) => {
            const isSelected = selectedSticker === stk && !customStickerInput;
            return (
              <button
                key={stk}
                onClick={() => {
                  setSelectedSticker(isSelected ? '' : stk);
                  setCustomStickerInput('');
                  playTapSound();
                }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                  isSelected
                    ? 'bg-[#a3e635] text-[#04210f] font-bold shadow-md'
                    : 'bg-[var(--card)] text-gray-300 hover:bg-[#1b261f] border border-[var(--border)]'
                }`}
              >
                {stk}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          placeholder="Or type custom sticker badge (e.g. ⚡ KAMPALA WAVE)"
          value={customStickerInput}
          onChange={(e) => {
            setCustomStickerInput(e.target.value);
            setSelectedSticker('');
          }}
          className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#22c55e]"
        />
      </div>

      {/* Procedural Sound Synthesizer */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Audio Track (Tap to play procedural synth)
          </label>
          <span className="text-[10px] text-[#22c55e] font-semibold">♪ Live synthesis</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SOUND_NAMES.map((sound, idx) => (
            <button
              key={sound}
              onClick={() => {
                setSelectedSoundIdx(idx);
                playSynthesizerSound(idx);
              }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                selectedSoundIdx === idx
                  ? 'bg-[#22c55e] text-[#04210f] font-bold shadow-md'
                  : 'bg-[var(--card)] text-gray-300 hover:bg-[#1b261f] border border-[var(--border)]'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{sound}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Caption & Suggested Tags */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
          Caption
        </label>
        <input
          type="text"
          placeholder="What's the vibe?"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#22c55e] mb-2"
        />

        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 mr-1">
            <Tag className="w-3 h-3 text-[#22c55e]" />
            Tags:
          </span>
          {['#BLiNBoost', '#VibeIn60s', '#KampalaVibes', '#AfroDance', '#BeatMaking', '#StreetFit'].map(
            (tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                    isSelected
                      ? 'bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/40'
                      : 'bg-[#101712] text-gray-400 border border-[#233128]'
                  }`}
                >
                  {tag}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-2">
        <button
          onClick={handlePost}
          className="w-full py-3.5 rounded-full gradient-btn shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 text-sm font-extrabold"
        >
          <Send className="w-4 h-4" />
          <span>Post clip 🚀</span>
        </button>

        <div className="flex gap-2">
          <button
            onClick={handleStory}
            className="flex-1 py-2.5 rounded-full bg-[var(--card)] hover:bg-[var(--card-hover)] border border-[var(--border)] text-gray-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span>Add to story ⭐</span>
          </button>

          <button
            onClick={handleDraft}
            className="flex-1 py-2.5 rounded-full bg-[var(--card)] hover:bg-[var(--card-hover)] border border-[var(--border)] text-gray-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-[#4ade80]" />
            <span>Save draft 📝</span>
          </button>
        </div>
      </div>
    </div>
  );
};
