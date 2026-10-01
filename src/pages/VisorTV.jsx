import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { playlistService, resolveMediaUrl } from '../services/api';
import IconRenderer from '../components/IconRenderer';
import { isImageUrl } from '../constants/icons';
import { getThemeById } from '../themes/visorThemes';
import {
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ArrowLeft,
  Clock,
  Radio,
  Tv,
  HelpCircle,
} from 'lucide-react';

const getEmbedUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}&controls=0`;
  }
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|)(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=1&background=1`;
  }
  return null;
};

const VisorTV = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  // Primary State
  const [playlist, setPlaylist] = useState([]);
  const [sede, setSede] = useState(null);
  const [settings, setSettings] = useState({
    tv_show_clock: true,
    tv_show_sede_title: true,
    tv_show_progress_bar: true,
    tv_auto_refresh_seconds: 30,
    tv_transition_effect: 'fade',
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [fitMode] = useState('enhanced');
  const [userFitOverride, setUserFitOverride] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [progress, setProgress] = useState(0);
  const [versionHash, setVersionHash] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Auto-activate audio on first TV remote / keyboard / touch interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      setIsMuted(false);
      if (videoARef.current) videoARef.current.muted = false;
      if (videoBRef.current) videoBRef.current.muted = false;
    };
    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });
    window.addEventListener('touchstart', handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // Single elegant aesthetic
  const currentTheme = getThemeById('elegant-red');

  const getEffectiveFit = useCallback(
    (item) => {
      if (userFitOverride) return userFitOverride;
      if (item && item.fit_mode && item.fit_mode !== 'contain') return item.fit_mode;
      return fitMode || 'enhanced';
    },
    [userFitOverride, fitMode]
  );

  // Double Buffering (Slot A & Slot B) State
  const [activeSlot, setActiveSlot] = useState('A');
  const [slotAIndex, setSlotAIndex] = useState(0);
  const [slotBIndex, setSlotBIndex] = useState(1);

  // Refs
  const videoARef = useRef(null);
  const videoBRef = useRef(null);
  const imageTimerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const containerRef = useRef(null);
  const latestPlaylistRef = useRef([]);

  useEffect(() => {
    latestPlaylistRef.current = playlist;
  }, [playlist]);

  // Smart Preload
  useEffect(() => {
    if (playlist.length <= 1) return;
    const next1 = playlist[(currentIndex + 1) % playlist.length];
    const next2 = playlist[(currentIndex + 2) % playlist.length];
    [next1, next2].forEach((item) => {
      if (item && item.type === 'image' && item.url) {
        const preImg = new window.Image();
        preImg.src = resolveMediaUrl(item.url);
      }
    });
  }, [currentIndex, playlist]);

  // Initial Load of Playlist
  const loadPlaylist = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const res = await playlistService.getPlaylist(slug);
      if (res.data.success) {
        setSede(res.data.sede);
        setSettings({
          tv_show_clock: res.data.settings?.tv_show_clock !== false,
          tv_show_sede_title: res.data.settings?.tv_show_sede_title !== false,
          tv_show_progress_bar: res.data.settings?.tv_show_progress_bar !== false,
          tv_auto_refresh_seconds: res.data.settings?.tv_auto_refresh_seconds || 30,
          tv_transition_effect: res.data.settings?.tv_transition_effect || 'fade',
        });
        const items = res.data.playlist || [];
        setPlaylist(items);
        setVersionHash(res.data.version_hash);

        if (items.length > 0) {
          setSlotAIndex(0);
          setSlotBIndex(items.length > 1 ? 1 : 0);
          setActiveSlot('A');
          setCurrentIndex(0);
        }
      }
    } catch (err) {
      console.error('Error fetching playlist:', err);
      setError(
        err.response?.data?.error || 'No se pudo cargar la programación de esta sede.'
      );
    } finally {
      if (isInitial) {
        setIsLoading(false);
      }
    }
  }, [slug]);

  useEffect(() => {
    loadPlaylist(true);
  }, [loadPlaylist]);

  // Periodic Polling
  useEffect(() => {
    const refreshSec = settings.tv_auto_refresh_seconds || 30;
    const interval = setInterval(() => {
      loadPlaylist(false);
    }, refreshSec * 1000);
    return () => clearInterval(interval);
  }, [settings.tv_auto_refresh_seconds, loadPlaylist]);

  // Clock Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Controls Visibility Timeout
  const handleUserActivity = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 5000);
  }, []);

  useEffect(() => {
    const handleMouseMove = () => handleUserActivity();
    const handleKeyDown = () => handleUserActivity();
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [handleUserActivity]);

  // Double Buffering Transition
  const advanceToSlot = useCallback(
    (targetIndex) => {
      const items = latestPlaylistRef.current;
      if (!items || items.length === 0) return;
      const validIndex = ((targetIndex % items.length) + items.length) % items.length;

      // Stop and reset any currently playing video immediately to prevent dual audio
      if (videoARef.current) {
        try {
          videoARef.current.pause();
          videoARef.current.currentTime = 0;
          videoARef.current.muted = true;
        } catch (_) {}
      }
      if (videoBRef.current) {
        try {
          videoBRef.current.pause();
          videoBRef.current.currentTime = 0;
          videoBRef.current.muted = true;
        } catch (_) {}
      }

      if (activeSlot === 'A') {
        setSlotBIndex(validIndex);
        setActiveSlot('B');
      } else {
        setSlotAIndex(validIndex);
        setActiveSlot('A');
      }

      setCurrentIndex(validIndex);
      setProgress(0);
    },
    [activeSlot]
  );

  const goToNext = useCallback(() => {
    advanceToSlot(currentIndex + 1);
  }, [advanceToSlot, currentIndex]);

  const goToPrev = useCallback(() => {
    advanceToSlot(currentIndex - 1);
  }, [advanceToSlot, currentIndex]);

  const currentItem = playlist[currentIndex] || null;
  const isEmbedVideo = currentItem?.type === 'video' && !!getEmbedUrl(currentItem?.url);

  // Active Video Playback Controller & Muted Policy Fallback
  useEffect(() => {
    const activeVideo = activeSlot === 'A' ? videoARef.current : videoBRef.current;
    const inactiveVideo = activeSlot === 'A' ? videoBRef.current : videoARef.current;

    // Strict audio separation: ensure the inactive slot's video is stopped and muted
    if (inactiveVideo) {
      try {
        inactiveVideo.pause();
        inactiveVideo.currentTime = 0;
        inactiveVideo.muted = true;
      } catch (_) {}
    }

    if (!currentItem || currentItem.type !== 'video' || isEmbedVideo) return;
    if (!activeVideo) return;

    if (isPaused) {
      activeVideo.pause();
      return;
    }

    activeVideo.muted = isMuted;
    const playPromise = activeVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Autoplay unmuted was restricted, falling back to muted playback:', err);
        activeVideo.muted = true;
        setIsMuted(true);
        activeVideo.play().catch((playErr) => {
          console.error('Video playback completely failed:', playErr);
        });
      });
    }
  }, [currentIndex, activeSlot, isPaused, isMuted, currentItem, isEmbedVideo]);

  // Lightweight preloader for next playlist item (instant 0ms transitions)
  useEffect(() => {
    if (!playlist || playlist.length <= 1) return;
    const nextIdx = (currentIndex + 1) % playlist.length;
    const nextMedia = playlist[nextIdx];
    if (nextMedia && nextMedia.type === 'image' && nextMedia.url) {
      const preloadImg = new window.Image();
      preloadImg.src = resolveMediaUrl(nextMedia.url);
    }
  }, [currentIndex, playlist]);

  // Auto-advance for Images and External Embed Videos
  useEffect(() => {
    if (imageTimerRef.current) clearInterval(imageTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    if (!currentItem || isPaused || playlist.length <= 1) {
      return;
    }

    if (currentItem.type === 'image' || isEmbedVideo) {
      const durationSec = Math.max(currentItem.duration || 10, 3);
      const totalMs = durationSec * 1000;
      const intervalMs = 100;
      let elapsedMs = 0;

      progressTimerRef.current = setInterval(() => {
        elapsedMs += intervalMs;
        const pct = Math.min((elapsedMs / totalMs) * 100, 100);
        setProgress(pct);

        if (elapsedMs >= totalMs) {
          clearInterval(progressTimerRef.current);
          goToNext();
        }
      }, intervalMs);
    }

    return () => {
      if (imageTimerRef.current) clearInterval(imageTimerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [currentItem, isPaused, playlist.length, goToNext, isEmbedVideo]);

  // Video Time Update & Ended Handlers
  const handleVideoTimeUpdate = (e) => {
    const video = e.target;
    if (video && video.duration > 0) {
      const pct = (video.currentTime / video.duration) * 100;
      setProgress(Math.min(pct, 100));
    }
  };

  const handleVideoEnded = () => {
    goToNext();
  };

  const handleMediaError = (slot, err) => {
    console.warn(`Media playback error in Slot ${slot}, skipping to next:`, err);
    goToNext();
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          setIsPaused((prev) => !prev);
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPrev();
          break;
        case 'm':
        case 'M':
          setIsMuted((prev) => !prev);
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'a':
        case 'A':
          setUserFitOverride((prev) => {
            const current = prev || 'enhanced';
            return current === 'enhanced' ? 'cover' : current === 'cover' ? 'contain' : 'enhanced';
          });
          break;
        case '?':
        case 'h':
        case 'H':
          setShowHelpModal((prev) => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center p-6 bg-black text-white">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center animate-pulse shadow-2xl">
            <Tv className="w-8 h-8 text-rose-500" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-rose-500" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600" />
          </span>
        </div>
        <p className="mt-4 text-sm font-mono tracking-wider font-semibold text-white">Cargando Visor TV...</p>
        <p className="text-xs mt-1 text-slate-400">Conectando a {slug}...</p>
      </div>
    );
  }

  // 2. Error State
  if (error || !sede) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center p-6 bg-black text-white text-center">
        <div className="max-w-md p-8 rounded-3xl border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <Tv className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Canal No Disponible</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">{error || 'La sede solicitada no existe o no se encuentra habilitada.'}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => loadPlaylist(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-lg shadow-rose-600/30 transition-transform active:scale-95 cursor-pointer"
            >
              Reintentar
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-700 hover:bg-slate-800 transition-all cursor-pointer text-slate-300"
            >
              Seleccionar Sede
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Empty Playlist State
  if (playlist.length === 0) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden bg-black text-white">
        {/* Sede Top Header */}
        <div className="absolute top-8 left-8 flex items-center gap-3">
          {isImageUrl(sede.icon) ? (
            <div className="w-12 h-12 rounded-xl border border-white/20 shadow-lg overflow-hidden bg-white/10 shrink-0">
              <img
                src={sede.icon}
                alt={sede.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0"
              style={{ backgroundColor: sede.color || '#e11d48' }}
            >
              <IconRenderer name={sede.icon} className="w-6 h-6 text-white" />
            </div>
          )}
          <div className="text-left">
            <h1 className="text-xl font-bold text-white">{sede.name}</h1>
            <p className="text-xs text-slate-400">{sede.address || 'Transmisión en espera'}</p>
          </div>
        </div>

        {/* Live Clock */}
        <div className="absolute top-8 right-8 flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-800 bg-slate-900/90 text-sm font-mono text-white shadow-xl">
          <Clock className="w-4 h-4 text-rose-500" />
          <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>

        {/* Center Content */}
        <div className="max-w-lg p-8 rounded-3xl border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <Radio className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Canal en Espera</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            No hay videos o imágenes configuradas actualmente para <strong className="font-semibold text-white">{sede.name}</strong>.
            Agregue contenido desde el panel de administración para comenzar la transmisión automática.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/admin/media"
              className="w-full sm:w-auto px-5 py-2.5 text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Subir Contenido en Admin</span>
            </a>
            <button
              onClick={() => navigate('/')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cambiar Sede</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Items for Slot A and Slot B
  const itemA = playlist[slotAIndex] || null;
  const itemB = playlist[slotBIndex] || null;

  return (
    <div
      ref={containerRef}
      className={`relative w-screen h-screen overflow-hidden select-none bg-black text-white ${
        showControls ? 'cursor-default' : 'cursor-none'
      }`}
      onMouseMove={handleUserActivity}
      onClick={handleUserActivity}
    >
      {/* ================= DOUBLE BUFFERING SLOT A (FULLSCREEN MEDIA) ================= */}
      <div
        className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-500 ease-in-out transform-gpu will-change-opacity ${
          activeSlot === 'A' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}
      >
        {itemA && itemA.type === 'video' ? (
          activeSlot === 'A' ? (
            getEmbedUrl(itemA.url) ? (
              <iframe
                src={getEmbedUrl(itemA.url)}
                className="w-full h-full border-0 pointer-events-none"
                allow="autoplay; encrypted-media; picture-in-picture"
                title={itemA.title || 'Embed Video A'}
              />
            ) : (
              <video
                ref={videoARef}
                src={resolveMediaUrl(itemA.url)}
                muted={isMuted}
                playsInline
                preload="auto"
                disablePictureInPicture
                controlsList="nodownload nofullscreen noremoteplayback"
                onLoadedData={() => {
                  if (activeSlot === 'A' && !isPaused) {
                    videoARef.current?.play().catch(() => {
                      if (videoARef.current) {
                        videoARef.current.muted = true;
                        videoARef.current.play().catch(() => {});
                      }
                    });
                  }
                }}
                onTimeUpdate={activeSlot === 'A' ? handleVideoTimeUpdate : undefined}
                onEnded={activeSlot === 'A' ? handleVideoEnded : undefined}
                onError={(e) => handleMediaError('A', e)}
                className={`w-full h-full max-w-full max-h-full transition-all duration-300 ${
                  getEffectiveFit(itemA) === 'cover' ? 'object-cover' : 'object-contain'
                } ${getEffectiveFit(itemA) !== 'contain' ? 'tv-video-enhanced' : ''}`}
                style={{ imageRendering: '-webkit-optimize-contrast' }}
              />
            )
          ) : null
        ) : itemA ? (
          <img
            src={resolveMediaUrl(itemA.url)}
            alt={itemA.title || 'Visor TV Media A'}
            fetchPriority={activeSlot === 'A' ? 'high' : 'auto'}
            decoding="async"
            onError={(e) => handleMediaError('A', e)}
            className={`w-full h-full max-w-full max-h-full ${
              getEffectiveFit(itemA) === 'cover' ? 'object-cover' : 'object-contain'
            }`}
          />
        ) : null}
      </div>

      {/* ================= DOUBLE BUFFERING SLOT B (FULLSCREEN MEDIA) ================= */}
      <div
        className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-500 ease-in-out transform-gpu will-change-opacity ${
          activeSlot === 'B' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}
      >
        {itemB && itemB.type === 'video' ? (
          activeSlot === 'B' ? (
            getEmbedUrl(itemB.url) ? (
              <iframe
                src={getEmbedUrl(itemB.url)}
                className="w-full h-full border-0 pointer-events-none"
                allow="autoplay; encrypted-media; picture-in-picture"
                title={itemB.title || 'Embed Video B'}
              />
            ) : (
              <video
                ref={videoBRef}
                src={resolveMediaUrl(itemB.url)}
                muted={isMuted}
                playsInline
                preload="auto"
                disablePictureInPicture
                controlsList="nodownload nofullscreen noremoteplayback"
                onLoadedData={() => {
                  if (activeSlot === 'B' && !isPaused) {
                    videoBRef.current?.play().catch(() => {
                      if (videoBRef.current) {
                        videoBRef.current.muted = true;
                        videoBRef.current.play().catch(() => {});
                      }
                    });
                  }
                }}
                onTimeUpdate={activeSlot === 'B' ? handleVideoTimeUpdate : undefined}
                onEnded={activeSlot === 'B' ? handleVideoEnded : undefined}
                onError={(e) => handleMediaError('B', e)}
                className={`w-full h-full max-w-full max-h-full transition-all duration-300 ${
                  getEffectiveFit(itemB) === 'cover' ? 'object-cover' : 'object-contain'
                } ${getEffectiveFit(itemB) !== 'contain' ? 'tv-video-enhanced' : ''}`}
                style={{ imageRendering: '-webkit-optimize-contrast' }}
              />
            )
          ) : null
        ) : itemB ? (
          <img
            src={resolveMediaUrl(itemB.url)}
            alt={itemB.title || 'Visor TV Media B'}
            fetchPriority={activeSlot === 'B' ? 'high' : 'auto'}
            decoding="async"
            onError={(e) => handleMediaError('B', e)}
            className={`w-full h-full max-w-full max-h-full ${
              getEffectiveFit(itemB) === 'cover' ? 'object-cover' : 'object-contain'
            }`}
          />
        ) : null}
      </div>

      {/* ================= UNMUTE PROMPT BANNER (if muted) ================= */}
      {isMuted && currentItem && currentItem.type === 'video' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMuted(false);
          }}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-semibold shadow-2xl shadow-rose-600/40 backdrop-blur-md transition-transform hover:scale-105 cursor-pointer"
        >
          <VolumeX className="w-4 h-4 animate-pulse" />
          <span>Audio silenciado • Clic para activar sonido (o presione M)</span>
        </button>
      )}

      {/* ================= TOP HUD OVERLAY (Auto-hides) ================= */}
      <div
        className={`absolute top-0 left-0 right-0 p-6 z-20 flex items-center justify-between transition-all duration-500 ${currentTheme.classes.topHud} ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Sede Info & Back Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className={`p-2.5 rounded-2xl border shadow-xl backdrop-blur-xl transition-all hover:scale-105 cursor-pointer ${currentTheme.classes.controlBtn}`}
            title="Volver al selector de sedes"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {settings.tv_show_sede_title && (
            <div className="flex items-center gap-3">
              {isImageUrl(sede.icon) ? (
                <div className="w-10 h-10 rounded-2xl border border-white/20 shadow-xl overflow-hidden bg-white/10 shrink-0">
                  <img
                    src={sede.icon}
                    alt={sede.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-rose-500/20"
                  style={{ backgroundColor: sede.color || currentTheme.colors.primary }}
                >
                  <IconRenderer name={sede.icon} className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-lg font-extrabold tracking-tight drop-shadow-md ${currentTheme.classes.title}`}>
                    {sede.name}
                  </h1>
                  <span className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${currentTheme.classes.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full animate-ping ${currentTheme.classes.liveDot}`} /> EN VIVO
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Clock & Playlist Counter */}
        <div className="flex items-center gap-3">
          {settings.tv_show_clock && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-mono backdrop-blur-xl shadow-xl ${currentTheme.classes.clock}`}>
              <Clock className="w-3.5 h-3.5 text-rose-500" />
              <span className="font-semibold capitalize">
                {currentTime.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} • {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          )}

          <div className={`px-4 py-2 rounded-2xl border text-xs font-semibold backdrop-blur-xl shadow-xl ${currentTheme.classes.counter}`}>
            <span className="font-bold text-rose-400">{currentIndex + 1}</span> / {playlist.length}
          </div>
        </div>
      </div>

      {/* ================= AMBIENT BOTTOM PROGRESS BAR (When controls hidden) ================= */}
      {!showControls && settings.tv_show_progress_bar && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40 z-10 pointer-events-none">
          <div
            className={`h-full transition-all duration-150 ease-linear ${currentTheme.classes.progressBar}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* ================= BOTTOM CONTROLS OVERLAY (Auto-hides) ================= */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-6 z-20 flex flex-col gap-3 transition-all duration-500 ${currentTheme.classes.bottomHud} ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar */}
        {settings.tv_show_progress_bar && (
          <div className="w-full h-1.5 rounded-full overflow-hidden backdrop-blur-xs bg-slate-800/80 shadow-inner">
            <div
              className={`h-full transition-all duration-150 ease-linear rounded-full ${currentTheme.classes.progressBar}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Control Buttons Bar */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <button
              onClick={goToPrev}
              title="Anterior (Flecha izquierda)"
              className={`p-2.5 rounded-2xl border backdrop-blur-xl transition-all hover:scale-105 cursor-pointer ${currentTheme.classes.controlBtn}`}
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsPaused(!isPaused)}
              title={isPaused ? 'Reanudar (Espacio)' : 'Pausar (Espacio)'}
              className={`p-3 rounded-2xl shadow-xl transition-transform active:scale-95 cursor-pointer ${currentTheme.classes.accentBtn}`}
            >
              {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
            </button>

            <button
              onClick={goToNext}
              title="Siguiente (Flecha derecha)"
              className={`p-2.5 rounded-2xl border backdrop-blur-xl transition-all hover:scale-105 cursor-pointer ${currentTheme.classes.controlBtn}`}
            >
              <SkipForward className="w-5 h-5" />
            </button>

            {/* Audio Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Activar sonido (M)' : 'Silenciar (M)'}
              className={`p-2.5 rounded-2xl border backdrop-blur-xl transition-colors cursor-pointer ${
                isMuted
                  ? currentTheme.classes.controlBtn
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
              }`}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Aspect Ratio & Quality Mode Toggle */}
            <button
              onClick={() => {
                const current = getEffectiveFit(currentItem);
                const nextMode =
                  current === 'enhanced' ? 'cover' : current === 'cover' ? 'contain' : 'enhanced';
                setUserFitOverride(nextMode);
              }}
              title={`Modo visual: ${
                getEffectiveFit(currentItem) === 'enhanced'
                  ? 'Nitidez Pro (Bordes nítidos, contraste optimizado y halo ambiental)'
                  : getEffectiveFit(currentItem) === 'cover'
                  ? 'Llenar pantalla completa'
                  : 'Ajustar original'
              }`}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-semibold border backdrop-blur-xl transition-all cursor-pointer ${
                getEffectiveFit(currentItem) === 'enhanced'
                  ? 'bg-blue-600/30 text-blue-200 border-blue-400/50 shadow-md shadow-blue-500/20'
                  : currentTheme.classes.controlBtn
              }`}
            >
              Modo:{' '}
              {getEffectiveFit(currentItem) === 'enhanced'
                ? 'Nitidez Pro'
                : getEffectiveFit(currentItem) === 'cover'
                ? 'Llenar'
                : 'Ajustar'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Help Button */}
            <button
              onClick={() => setShowHelpModal(true)}
              title="Atajos de teclado y control remoto (?)"
              className={`p-2.5 rounded-2xl border backdrop-blur-xl transition-colors cursor-pointer ${currentTheme.classes.controlBtn}`}
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Salir de pantalla completa (F11)' : 'Pantalla completa (F11)'}
              className={`p-2.5 rounded-2xl border backdrop-blur-xl transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer ${currentTheme.classes.controlBtn}`}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Normal' : 'Pantalla Completa'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= HELP / SHORTCUTS MODAL ================= */}
      {showHelpModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setShowHelpModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-white relative animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-lg">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Atajos del Visor TV</h3>
                  <p className="text-xs text-slate-400">Teclado y Control Remoto Smart TV</p>
                </div>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-800/60 text-sm">
                <span className="text-slate-300">Pausar / Reanudar</span>
                <kbd className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-rose-400 font-semibold shadow-xs">
                  Espacio
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800/60 text-sm">
                <span className="text-slate-300">Siguiente contenido</span>
                <kbd className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-rose-400 font-semibold shadow-xs">
                  → / Next
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800/60 text-sm">
                <span className="text-slate-300">Contenido anterior</span>
                <kbd className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-rose-400 font-semibold shadow-xs">
                  ← / Prev
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800/60 text-sm">
                <span className="text-slate-300">Silenciar / Audio</span>
                <kbd className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-rose-400 font-semibold shadow-xs">
                  M
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800/60 text-sm">
                <span className="text-slate-300">Modo visual / Nitidez Pro</span>
                <kbd className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-rose-400 font-semibold shadow-xs">
                  A
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800/60 text-sm">
                <span className="text-slate-300">Pantalla completa</span>
                <kbd className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-rose-400 font-semibold shadow-xs">
                  F / F11
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-300">Mostrar / Ocultar Ayuda</span>
                <kbd className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-rose-400 font-semibold shadow-xs">
                  ? / H
                </kbd>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 text-center">
              <p className="text-[11px] text-slate-500">
                Visor TV Enterprise • Diseñado por <span className="text-rose-400 font-semibold">Ashly Nicole</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisorTV;
