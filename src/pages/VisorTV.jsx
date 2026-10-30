import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { playlistService, resolveMediaUrl } from '../services/api';
import mediaCacheManager from '../services/mediaCacheManager';
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
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^/]*)\/videos\/|album\/(?:\d+)\/video\/|)(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=1&background=1`;
  }
  return null;
};

// Isolated micro-component for the live clock: renders independently so ticking seconds never cause VisorTV re-renders
const TVClock = React.memo(({ themeClass, isStandby = false }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (isStandby) {
    return (
      <div className="absolute top-8 right-8 flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-800 bg-slate-900 text-sm font-mono text-white shadow-xl">
        <Clock className="w-4 h-4 text-rose-500" />
        <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-mono shadow-xl ${themeClass}`}>
      <Clock className="w-3.5 h-3.5 text-rose-500" />
      <span className="font-semibold capitalize">
        {time.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} • {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  );
});

// Explicit video hardware decoder release utility (prevents "Renderer process has crashed!")
const releaseVideoDecoder = (videoEl) => {
  if (!videoEl) return;
  try {
    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.load();
  } catch {}
};

const VisorTV = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  // 1. Synchronous Cache Retrieval for Instant Zero-Delay Startup (0ms wait)
  const initialCache = useMemo(() => {
    try {
      const cachedRaw = localStorage.getItem(`visor_tv_cache_${slug}`);
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw);
        if (parsed && parsed.sede && Array.isArray(parsed.playlist) && parsed.playlist.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return null;
  }, [slug]);

  // Primary State
  const [playlist, setPlaylist] = useState(() => initialCache?.playlist || []);
  const [sede, setSede] = useState(() => initialCache?.sede || null);
  const [settings, setSettings] = useState(() => ({
    tv_show_clock: initialCache?.settings?.tv_show_clock !== false,
    tv_show_sede_title: initialCache?.settings?.tv_show_sede_title !== false,
    tv_show_progress_bar: initialCache?.settings?.tv_show_progress_bar !== false,
    tv_auto_refresh_seconds: initialCache?.settings?.tv_auto_refresh_seconds || 30,
    tv_transition_effect: initialCache?.settings?.tv_transition_effect || 'fade',
  }));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(() => !initialCache);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Dual-Slot Buffering Engine State (A/B Seamless Transition)
  const [activeSlot, setActiveSlot] = useState('A');
  const [slotAItem, setSlotAItem] = useState(() => initialCache?.playlist?.[0] || null);
  const [slotBItem, setSlotBItem] = useState(null);

  // Persistent Fit Mode: default to 'cover' (Pantalla Completa) across all videos until manually changed
  const [userFitOverride, setUserFitOverride] = useState(() => {
    try {
      return localStorage.getItem('visor_tv_fit_mode') || 'cover';
    } catch {
      return 'cover';
    }
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Direct DOM Refs for Progress Bars (0 React re-renders during video playback)
  const ambientProgressRef = useRef(null);
  const controlProgressRef = useRef(null);
  const lastActivityRef = useRef(0);

  const updateProgressDom = useCallback((pct) => {
    const clamped = Math.min(Math.max(pct, 0), 100);
    const widthStr = `${clamped}%`;
    if (ambientProgressRef.current) ambientProgressRef.current.style.width = widthStr;
    if (controlProgressRef.current) controlProgressRef.current.style.width = widthStr;
  }, []);

  // Dual Video Refs for A/B Hardware Decoders
  const videoRefA = useRef(null);
  const videoRefB = useRef(null);
  const activeSlotRef = useRef('A');
  const slotAItemRef = useRef(slotAItem);
  const slotBItemRef = useRef(slotBItem);

  useEffect(() => {
    activeSlotRef.current = activeSlot;
  }, [activeSlot]);

  useEffect(() => {
    slotAItemRef.current = slotAItem;
  }, [slotAItem]);

  useEffect(() => {
    slotBItemRef.current = slotBItem;
  }, [slotBItem]);

  const getActiveVideo = useCallback(() => {
    return activeSlotRef.current === 'A' ? videoRefA.current : videoRefB.current;
  }, []);

  const playPromiseRef = useRef(null);
  const progressTimerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const transitionTimeoutRef = useRef(null);
  const loadPlaylistRef = useRef(null);
  const containerRef = useRef(null);
  const latestPlaylistRef = useRef([]);
  const versionHashRef = useRef('');
  const currentIndexRef = useRef(0);
  const retryTimeoutRef = useRef(null);

  // Error cooldown and consecutive error tracker to prevent cascading crash
  const consecutiveErrorsRef = useRef(0);
  const errorCooldownRef = useRef(null);

  // Stall Watchdog Refs
  const stallCounterRef = useRef(0);
  const lastTimeRef = useRef(-1);

  useEffect(() => {
    latestPlaylistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const currentTheme = getThemeById('elegant-red');

  // Save fit mode to localStorage and state
  const changeFitMode = useCallback((newMode) => {
    setUserFitOverride(newMode);
    try {
      localStorage.setItem('visor_tv_fit_mode', newMode);
    } catch {}
  }, []);

  const getEffectiveFit = useCallback(
    (item) => {
      if (userFitOverride) return userFitOverride;
      if (item && item.fit_mode && item.fit_mode !== 'contain') return item.fit_mode;
      return 'cover';
    },
    [userFitOverride]
  );

  const toggleFitMode = useCallback(() => {
    const current = userFitOverride || 'cover';
    const nextMode = current === 'cover' ? 'contain' : current === 'contain' ? 'enhanced' : 'cover';
    changeFitMode(nextMode);
  }, [userFitOverride, changeFitMode]);

  // Fullscreen Handler with cross-browser and Smart TV vendor prefixes
  const toggleFullscreen = useCallback(() => {
    const fsElement =
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement;

    if (!fsElement) {
      const el = containerRef.current || document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }, []);

  // Listen to Fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsElement =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;
      setIsFullscreen(!!fsElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Safe Play and Pause Controllers (Guards against interrupted play promise errors)
  const playSafe = useCallback((videoEl) => {
    if (!videoEl) return;
    videoEl.muted = isMuted;
    try {
      const promise = videoEl.play();
      if (promise !== undefined) {
        playPromiseRef.current = promise;
        promise.catch((err) => {
          if (err.name === 'AbortError') return;
          console.warn('Autoplay unmuted was restricted, falling back to muted playback:', err);
          videoEl.muted = true;
          setIsMuted(true);
          videoEl.play().catch(() => {});
        });
      }
    } catch {}
  }, [isMuted]);

  const pauseSafe = useCallback((videoEl) => {
    if (!videoEl) return;
    try {
      if (playPromiseRef.current) {
        playPromiseRef.current
          .then(() => {
            videoEl.pause();
          })
          .catch(() => {
            videoEl.pause();
          });
      } else {
        videoEl.pause();
      }
    } catch {}
  }, []);

  // Auto-activate audio on first TV remote / keyboard / touch interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      setIsMuted(false);
      if (videoRefA.current) videoRefA.current.muted = false;
      if (videoRefB.current) videoRefB.current.muted = false;
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

  // Preload upcoming images into memory cache using mediaCacheManager
  useEffect(() => {
    if (playlist.length <= 1) return;
    const next1 = playlist[(currentIndex + 1) % playlist.length];
    const next2 = playlist[(currentIndex + 2) % playlist.length];
    [next1, next2].forEach((item) => {
      if (item && item.type === 'image' && item.url) {
        mediaCacheManager.preloadImage(resolveMediaUrl(item.url));
      }
    });
  }, [currentIndex, playlist]);

  // Load Playlist with LocalStorage Offline Cache Fallback & Auto-Retry
  const loadPlaylist = useCallback(async (isInitial = false) => {
    // Only flag loading if we truly have 0 items available from local cache
    if (isInitial && latestPlaylistRef.current.length === 0) {
      setIsLoading(true);
    }

    try {
      if (!isInitial && versionHashRef.current) {
        try {
          const versionRes = await playlistService.checkVersion(slug);
          if (versionRes.data.success && versionRes.data.version_hash === versionHashRef.current) {
            return;
          }
        } catch {}
      }

      const res = await playlistService.getPlaylist(slug);
      if (res.data.success) {
        setError(null);
        setIsOfflineMode(false);

        // Cache in localStorage for immediate offline restoration on TV reboot
        try {
          localStorage.setItem(`visor_tv_cache_${slug}`, JSON.stringify(res.data));
        } catch {}

        setSede(res.data.sede);
        setSettings({
          tv_show_clock: res.data.settings?.tv_show_clock !== false,
          tv_show_sede_title: res.data.settings?.tv_show_sede_title !== false,
          tv_show_progress_bar: res.data.settings?.tv_show_progress_bar !== false,
          tv_auto_refresh_seconds: res.data.settings?.tv_auto_refresh_seconds || 30,
          tv_transition_effect: res.data.settings?.tv_transition_effect || 'fade',
        });

        const items = res.data.playlist || [];
        const prevItems = latestPlaylistRef.current;
        setPlaylist(items);
        latestPlaylistRef.current = items;
        versionHashRef.current = res.data.version_hash;

        // Background preload entire media package for the active sede
        mediaCacheManager.preloadSedePackage(items);

        if (isInitial) {
          setCurrentIndex(0);
          currentIndexRef.current = 0;
          if (items.length > 0) {
            setSlotAItem(items[0]);
          }
        } else if (items.length > 0) {
          const currentItem = prevItems[currentIndexRef.current];
          const foundIndex = currentItem ? items.findIndex((it) => it.id === currentItem.id) : -1;
          if (foundIndex !== -1) {
            setCurrentIndex(foundIndex);
            currentIndexRef.current = foundIndex;
          } else {
            const nextSafe = Math.min(currentIndexRef.current, items.length - 1);
            setCurrentIndex(nextSafe);
            currentIndexRef.current = nextSafe;
          }
        }
      }
    } catch (err) {
      console.warn('Network issue fetching playlist:', err);

      // Attempt recovery from offline cache
      let recovered = false;
      try {
        const cachedRaw = localStorage.getItem(`visor_tv_cache_${slug}`);
        if (cachedRaw) {
          const cachedData = JSON.parse(cachedRaw);
          if (cachedData && cachedData.sede && Array.isArray(cachedData.playlist)) {
            setSede(cachedData.sede);
            setPlaylist(cachedData.playlist);
            latestPlaylistRef.current = cachedData.playlist;
            setSettings({
              tv_show_clock: cachedData.settings?.tv_show_clock !== false,
              tv_show_sede_title: cachedData.settings?.tv_show_sede_title !== false,
              tv_show_progress_bar: cachedData.settings?.tv_show_progress_bar !== false,
              tv_auto_refresh_seconds: cachedData.settings?.tv_auto_refresh_seconds || 30,
            });
            setError(null);
            setIsOfflineMode(true);
            recovered = true;
            if (slotAItemRef.current === null && cachedData.playlist.length > 0) {
              setSlotAItem(cachedData.playlist[0]);
            }
          }
        }
      } catch {}

      if (!recovered && isInitial && latestPlaylistRef.current.length === 0) {
        setError(err.response?.data?.error || 'No se pudo conectar con el servidor.');
        // Auto-retry connection every 5s on Smart TVs without requiring user interaction
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(() => {
          loadPlaylistRef.current?.(true);
        }, 5000);
      }
    } finally {
      if (isInitial) {
        setIsLoading(false);
      }
    }
  }, [slug]);

  useEffect(() => {
    loadPlaylistRef.current = loadPlaylist;
  }, [loadPlaylist]);

  useEffect(() => {
    loadPlaylist(true);
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [loadPlaylist]);

  // Master cleanup for timers and hardware decoders on component unmount
  useEffect(() => {
    const vidA = videoRefA.current;
    const vidB = videoRefB.current;
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (errorCooldownRef.current) clearTimeout(errorCooldownRef.current);
      releaseVideoDecoder(vidA);
      releaseVideoDecoder(vidB);
    };
  }, []);

  // Periodic Polling
  useEffect(() => {
    const refreshSec = settings.tv_auto_refresh_seconds || 30;
    const interval = setInterval(() => {
      loadPlaylist(false);
    }, refreshSec * 1000);
    return () => clearInterval(interval);
  }, [settings.tv_auto_refresh_seconds, loadPlaylist]);

  // Controls Visibility Timeout with Activity Throttling
  const handleUserActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityRef.current < 250) return;
    lastActivityRef.current = now;

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
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('keydown', handleKeyDown, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [handleUserActivity]);

  // Seamless Dual-Slot A/B Transition Engine (Zero Black Screen, Zero Decoder Memory Leaks)
  const transitionTo = useCallback(
    async (targetIndex) => {
      const items = latestPlaylistRef.current;
      if (!items || items.length === 0) return;

      // Cancel any in-flight release timeout to eliminate race conditions during rapid skips
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }

      if (items.length === 1) {
        setCurrentIndex(0);
        currentIndexRef.current = 0;
        updateProgressDom(0);
        const activeVid = activeSlotRef.current === 'A' ? videoRefA.current : videoRefB.current;
        if (activeVid) {
          try {
            activeVid.currentTime = 0;
            playSafe(activeVid);
          } catch {}
        }
        return;
      }

      const validIndex = ((targetIndex % items.length) + items.length) % items.length;
      const nextItem = items[validIndex];
      const currentSlot = activeSlotRef.current;
      const nextSlot = currentSlot === 'A' ? 'B' : 'A';

      // 1. If next item is an image: pre-decode bitmap into RAM BEFORE triggering crossfade!
      // Outgoing content stays 100% visible on screen so there are zero black flashes.
      // If already pre-warmed in background, this resolves in 0ms; otherwise capped at 350ms.
      if (nextItem?.type === 'image' && nextItem.url) {
        const fullUrl = resolveMediaUrl(nextItem.url);
        await Promise.race([
          mediaCacheManager.preloadImage(fullUrl),
          new Promise((resolve) => setTimeout(resolve, 350)),
        ]);
      }

      // 2. Load next item into reserve slot and ensure DOM video element source is primed immediately
      if (nextSlot === 'A') {
        setSlotAItem(nextItem);
        if (videoRefA.current && nextItem?.type === 'video' && !getEmbedUrl(nextItem?.url)) {
          const fullUrl = resolveMediaUrl(nextItem.url);
          if (videoRefA.current.src !== fullUrl) {
            videoRefA.current.src = fullUrl;
            videoRefA.current.load();
          }
        }
      } else {
        setSlotBItem(nextItem);
        if (videoRefB.current && nextItem?.type === 'video' && !getEmbedUrl(nextItem?.url)) {
          const fullUrl = resolveMediaUrl(nextItem.url);
          if (videoRefB.current.src !== fullUrl) {
            videoRefB.current.src = fullUrl;
            videoRefB.current.load();
          }
        }
      }

      setCurrentIndex(validIndex);
      currentIndexRef.current = validIndex;
      updateProgressDom(0);

      // 3. Perform smooth crossfade: image is ALREADY decoded, so it paints 100% complete with 0 scanlines
      setActiveSlot(nextSlot);
      activeSlotRef.current = nextSlot;

      // 4. After 350ms crossfade completes: cleanly release previous video decoder context
      // AND set the released slot state to null so React detects future changes in continuous loops
      transitionTimeoutRef.current = setTimeout(() => {
        transitionTimeoutRef.current = null;
        if (activeSlotRef.current === nextSlot) {
          const slotToRelease = nextSlot === 'A' ? 'B' : 'A';
          const inactiveVideo = slotToRelease === 'A' ? videoRefA.current : videoRefB.current;
          const inactiveItem = slotToRelease === 'A' ? slotAItemRef.current : slotBItemRef.current;
          if (inactiveItem?.type === 'video') {
            releaseVideoDecoder(inactiveVideo);
          }
          if (slotToRelease === 'A') {
            setSlotAItem(null);
          } else {
            setSlotBItem(null);
          }
        }
      }, 350);
    },
    [playSafe, updateProgressDom]
  );

  const goToNext = useCallback(() => {
    transitionTo(currentIndexRef.current + 1);
  }, [transitionTo]);

  const goToPrev = useCallback(() => {
    transitionTo(currentIndexRef.current - 1);
  }, [transitionTo]);

  // Keyboard and Remote Control Event Handler
  useEffect(() => {
    const handleRemoteKeys = (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea') return;

      handleUserActivity();

      switch (e.key) {
        case ' ':
        case 'MediaPlayPause':
        case 'Play':
        case 'Pause':
          e.preventDefault();
          setIsPaused((prev) => !prev);
          break;
        case 'ArrowRight':
        case 'MediaTrackNext':
        case 'ChannelUp':
        case 'FastForward':
          e.preventDefault();
          goToNext();
          break;
        case 'ArrowLeft':
        case 'MediaTrackPrevious':
        case 'ChannelDown':
        case 'Rewind':
          e.preventDefault();
          goToPrev();
          break;
        case 'm':
        case 'M':
        case 'VolumeMute':
          e.preventDefault();
          setIsMuted((prev) => {
            const next = !prev;
            if (videoRefA.current) videoRefA.current.muted = next;
            if (videoRefB.current) videoRefB.current.muted = next;
            return next;
          });
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'a':
        case 'A':
          e.preventDefault();
          toggleFitMode();
          break;
        case '?':
        case 'h':
        case 'H':
          e.preventDefault();
          setShowHelpModal((prev) => !prev);
          break;
        case 'Escape':
          if (showHelpModal) {
            e.preventDefault();
            setShowHelpModal(false);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleRemoteKeys);
    return () => window.removeEventListener('keydown', handleRemoteKeys);
  }, [goToNext, goToPrev, toggleFullscreen, toggleFitMode, handleUserActivity, showHelpModal]);

  const currentItem = playlist[currentIndex] || (activeSlot === 'A' ? slotAItem : slotBItem) || null;
  const isEmbedVideo = currentItem?.type === 'video' && !!getEmbedUrl(currentItem?.url);

  // Active Video Playback Controller
  useEffect(() => {
    const activeVideo = getActiveVideo();
    if (!activeVideo) return;

    if (!currentItem || currentItem.type !== 'video' || isEmbedVideo) {
      pauseSafe(activeVideo);
      return;
    }

    if (isPaused) {
      pauseSafe(activeVideo);
      return;
    }

    playSafe(activeVideo);
  }, [currentIndex, activeSlot, isPaused, isMuted, currentItem, isEmbedVideo, getActiveVideo, playSafe, pauseSafe]);

  // Auto-advance for Images and External Embeds
  useEffect(() => {
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
        updateProgressDom(pct);

        if (elapsedMs >= totalMs) {
          clearInterval(progressTimerRef.current);
          goToNext();
        }
      }, intervalMs);
    }

    const progTimer = progressTimerRef.current;
    return () => {
      if (progTimer) clearInterval(progTimer);
    };
  }, [currentItem, isPaused, playlist.length, goToNext, isEmbedVideo, updateProgressDom]);

  // Video Progress Update & Ended Handlers
  const handleVideoTimeUpdate = (e) => {
    const video = e.target;
    if (video && video.duration > 0) {
      const pct = (video.currentTime / video.duration) * 100;
      updateProgressDom(pct);
    }
  };

  const handleVideoEnded = () => {
    if (playlist.length === 1) {
      const vid = getActiveVideo();
      if (vid) {
        try {
          vid.currentTime = 0;
          playSafe(vid);
        } catch {}
      }
      return;
    }
    goToNext();
  };

  // Debounced error handler with infinite loop resilience
  const handleMediaError = useCallback((err) => {
    console.warn('Media playback error encountered:', err);
    if (errorCooldownRef.current) return;
    consecutiveErrorsRef.current += 1;

    errorCooldownRef.current = setTimeout(() => {
      errorCooldownRef.current = null;
      goToNext();
    }, 1200);
  }, [goToNext]);

  // Safe Anti-Freeze Stall Watchdog (Zero dangerous micro-seeks to avoid hardware decoder crash)
  useEffect(() => {
    if (isPaused || playlist.length === 0) return;
    const activeVideo = getActiveVideo();
    const activeItem = playlist[currentIndex];
    if (!activeVideo || !activeItem || activeItem.type !== 'video' || isEmbedVideo) {
      stallCounterRef.current = 0;
      lastTimeRef.current = -1;
      return;
    }

    const watchdogInterval = setInterval(() => {
      if (isPaused || activeVideo.ended) return;

      const current = activeVideo.currentTime;

      if (activeVideo.paused) {
        stallCounterRef.current += 1;
        if (stallCounterRef.current >= 3) {
          playSafe(activeVideo);
        }
        if (stallCounterRef.current >= 6) {
          stallCounterRef.current = 0;
          lastTimeRef.current = -1;
          goToNext();
        }
        return;
      }

      if (lastTimeRef.current >= 0 && Math.abs(current - lastTimeRef.current) < 0.1) {
        stallCounterRef.current += 1;
        if (stallCounterRef.current === 3) {
          playSafe(activeVideo);
        }
        if (stallCounterRef.current >= 6) {
          stallCounterRef.current = 0;
          lastTimeRef.current = -1;
          goToNext();
        }
      } else {
        stallCounterRef.current = 0;
      }

      lastTimeRef.current = current;
    }, 1000);

    return () => clearInterval(watchdogInterval);
  }, [currentIndex, isPaused, playlist, isEmbedVideo, getActiveVideo, playSafe, goToNext]);

  // 1. Initial Loading State: Silent pure black screen (zero spinners or text shown to patients)
  if (isLoading && playlist.length === 0) {
    return <div className="tv-screen-lock bg-black text-white select-none z-50 pointer-events-none" />;
  }

  // 2. Error / Reconnecting State (Pure Black, Self-Healing)
  if (error && playlist.length === 0) {
    return (
      <div className="tv-screen-lock flex flex-col items-center justify-center p-6 bg-black text-white text-center select-none z-50">
        <div className="max-w-md p-8 rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Tv className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Canal No Disponible</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">{error}</p>
          <p className="text-[11px] text-rose-400 font-mono mb-4 animate-pulse">
            Reintentando conexión automáticamente en segundo plano...
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => loadPlaylist(true)}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-lg shadow-rose-600/30 transition-transform active:scale-95 cursor-pointer"
            >
              Reintentar Ahora
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

  // 3. Empty Playlist Standby State
  if (playlist.length === 0 && sede) {
    return (
      <div className="tv-screen-lock flex flex-col items-center justify-center p-6 text-center select-none bg-black text-white z-50">
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

        <TVClock isStandby={true} />

        <div className="max-w-lg p-8 rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <Radio className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Canal en Espera</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            No hay videos o imágenes configuradas actualmente para <strong className="font-semibold text-white">{sede.name}</strong>.
            Agregue contenido desde el panel de administración para comenzar la transmisión automática.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/admin/media"
              className="w-full sm:w-auto px-5 py-2.5 text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Subir Contenido en Admin</span>
            </Link>
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

  const effectiveFit = getEffectiveFit(currentItem);

  return (
    <div
      ref={containerRef}
      className={`tv-screen-lock select-none bg-black text-white overscroll-none ${
        showControls ? 'cursor-default' : 'cursor-none'
      }`}
      onMouseMove={handleUserActivity}
      onClick={handleUserActivity}
      onDoubleClick={toggleFullscreen}
    >
      {/* ================= DUAL-SLOT SEAMLESS MEDIA ENGINE (Zero Black Screen & Zero Decoder Crashes) ================= */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden">
        {/* Slot A Media Presentation Surface */}
        <div
          className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-300 ease-in-out ${
            activeSlot === 'A' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          <video
            key="persistent-tv-video-a"
            ref={videoRefA}
            src={slotAItem?.type === 'video' && !getEmbedUrl(slotAItem?.url) ? resolveMediaUrl(slotAItem.url) : undefined}
            muted={isMuted}
            loop={playlist.length === 1}
            playsInline
            preload="auto"
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
            onLoadedData={() => {
              if (activeSlotRef.current === 'A' && !isPaused && slotAItem?.type === 'video' && !getEmbedUrl(slotAItem?.url)) {
                playSafe(videoRefA.current);
              }
            }}
            onPlaying={() => {
              consecutiveErrorsRef.current = 0;
            }}
            onTimeUpdate={activeSlot === 'A' ? handleVideoTimeUpdate : undefined}
            onEnded={activeSlot === 'A' ? handleVideoEnded : undefined}
            onError={activeSlot === 'A' ? handleMediaError : undefined}
            className={`absolute inset-0 w-full h-full max-w-full max-h-full transition-opacity duration-300 ease-in-out ${
              effectiveFit === 'cover' ? 'object-cover' : 'object-contain'
            } ${effectiveFit !== 'contain' ? 'tv-video-enhanced' : ''} ${
              slotAItem?.type === 'video' && !getEmbedUrl(slotAItem?.url) ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{ imageRendering: '-webkit-optimize-contrast' }}
          />

          {slotAItem?.type === 'image' && (
            <img
              key={`img-a-${slotAItem.id}`}
              src={resolveMediaUrl(slotAItem.url)}
              alt={slotAItem.title || 'Visor TV Media'}
              fetchPriority="high"
              decoding="sync"
              onError={activeSlot === 'A' ? handleMediaError : undefined}
              className={`absolute inset-0 w-full h-full max-w-full max-h-full transition-opacity duration-300 ease-in-out ${
                effectiveFit === 'cover' ? 'object-cover' : 'object-contain'
              } opacity-100`}
            />
          )}

          {slotAItem?.type === 'video' && getEmbedUrl(slotAItem?.url) && (
            <iframe
              key={`embed-a-${slotAItem.id}`}
              src={getEmbedUrl(slotAItem.url)}
              className="absolute inset-0 w-full h-full border-0 pointer-events-none"
              allow="autoplay; encrypted-media; picture-in-picture"
              title={slotAItem.title || 'Embed Video'}
            />
          )}
        </div>

        {/* Slot B Media Presentation Surface */}
        <div
          className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-300 ease-in-out ${
            activeSlot === 'B' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          <video
            key="persistent-tv-video-b"
            ref={videoRefB}
            src={slotBItem?.type === 'video' && !getEmbedUrl(slotBItem?.url) ? resolveMediaUrl(slotBItem.url) : undefined}
            muted={isMuted}
            loop={playlist.length === 1}
            playsInline
            preload="auto"
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
            onLoadedData={() => {
              if (activeSlotRef.current === 'B' && !isPaused && slotBItem?.type === 'video' && !getEmbedUrl(slotBItem?.url)) {
                playSafe(videoRefB.current);
              }
            }}
            onPlaying={() => {
              consecutiveErrorsRef.current = 0;
            }}
            onTimeUpdate={activeSlot === 'B' ? handleVideoTimeUpdate : undefined}
            onEnded={activeSlot === 'B' ? handleVideoEnded : undefined}
            onError={activeSlot === 'B' ? handleMediaError : undefined}
            className={`absolute inset-0 w-full h-full max-w-full max-h-full transition-opacity duration-300 ease-in-out ${
              effectiveFit === 'cover' ? 'object-cover' : 'object-contain'
            } ${effectiveFit !== 'contain' ? 'tv-video-enhanced' : ''} ${
              slotBItem?.type === 'video' && !getEmbedUrl(slotBItem?.url) ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{ imageRendering: '-webkit-optimize-contrast' }}
          />

          {slotBItem?.type === 'image' && (
            <img
              key={`img-b-${slotBItem.id}`}
              src={resolveMediaUrl(slotBItem.url)}
              alt={slotBItem.title || 'Visor TV Media'}
              fetchPriority="high"
              decoding="sync"
              onError={activeSlot === 'B' ? handleMediaError : undefined}
              className={`absolute inset-0 w-full h-full max-w-full max-h-full transition-opacity duration-300 ease-in-out ${
                effectiveFit === 'cover' ? 'object-cover' : 'object-contain'
              } opacity-100`}
            />
          )}

          {slotBItem?.type === 'video' && getEmbedUrl(slotBItem?.url) && (
            <iframe
              key={`embed-b-${slotBItem.id}`}
              src={getEmbedUrl(slotBItem.url)}
              className="absolute inset-0 w-full h-full border-0 pointer-events-none"
              allow="autoplay; encrypted-media; picture-in-picture"
              title={slotBItem.title || 'Embed Video'}
            />
          )}
        </div>
      </div>

      {/* ================= UNMUTE PROMPT BANNER (if muted) ================= */}
      {isMuted && currentItem && currentItem.type === 'video' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMuted(false);
            if (videoRefA.current) videoRefA.current.muted = false;
            if (videoRefB.current) videoRefB.current.muted = false;
          }}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-semibold shadow-2xl shadow-rose-600/40 transition-transform hover:scale-105 cursor-pointer"
        >
          <VolumeX className="w-4 h-4 animate-pulse" />
          <span>Audio silenciado • Clic para activar sonido (o presione M)</span>
        </button>
      )}

      {/* ================= OFFLINE STATUS BADGE (Non-blocking) ================= */}
      {isOfflineMode && (
        <div className="absolute top-20 right-6 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-medium shadow-lg animate-pulse">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Modo sin conexión • Transmitiendo desde paquete local</span>
        </div>
      )}

      {/* ================= TOP HUD OVERLAY (Auto-hides) ================= */}
      <div
        className={`absolute top-0 left-0 right-0 p-6 z-20 flex items-center justify-between transition-all duration-500 ${currentTheme.classes.topHud} ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className={`p-2.5 rounded-2xl border shadow-xl transition-all hover:scale-105 cursor-pointer ${currentTheme.classes.controlBtn}`}
            title="Volver al selector de sedes"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {settings.tv_show_sede_title && sede && (
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
            <TVClock themeClass={currentTheme.classes.clock} />
          )}

          <div className={`px-4 py-2 rounded-2xl border text-xs font-semibold shadow-xl ${currentTheme.classes.counter}`}>
            <span className="font-bold text-rose-400">{currentIndex + 1}</span> / {playlist.length}
          </div>
        </div>
      </div>

      {/* ================= AMBIENT BOTTOM PROGRESS BAR (When controls hidden) ================= */}
      {!showControls && settings.tv_show_progress_bar && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40 z-10 pointer-events-none">
          <div
            ref={ambientProgressRef}
            className={`h-full transition-all duration-150 ease-linear ${currentTheme.classes.progressBar}`}
            style={{ width: '0%' }}
          />
        </div>
      )}

      {/* ================= BOTTOM CONTROLS OVERLAY (Auto-hides) ================= */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-6 z-20 flex flex-col gap-3 transition-all duration-500 ${currentTheme.classes.bottomHud} ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar (Hardware-Accelerated Direct DOM Updates) */}
        {settings.tv_show_progress_bar && (
          <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-800/80 shadow-inner">
            <div
              ref={controlProgressRef}
              className={`h-full transition-all duration-150 ease-linear rounded-full ${currentTheme.classes.progressBar}`}
              style={{ width: '0%' }}
            />
          </div>
        )}

        {/* Control Buttons Bar */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <button
              onClick={goToPrev}
              title="Anterior (Flecha izquierda)"
              className={`p-2.5 rounded-2xl border transition-all hover:scale-105 cursor-pointer ${currentTheme.classes.controlBtn}`}
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
              className={`p-2.5 rounded-2xl border transition-all hover:scale-105 cursor-pointer ${currentTheme.classes.controlBtn}`}
            >
              <SkipForward className="w-5 h-5" />
            </button>

            {/* Audio Toggle */}
            <button
              onClick={() => {
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                if (videoRefA.current) videoRefA.current.muted = nextMuted;
                if (videoRefB.current) videoRefB.current.muted = nextMuted;
              }}
              title={isMuted ? 'Activar sonido (M)' : 'Silenciar (M)'}
              className={`p-2.5 rounded-2xl border transition-colors cursor-pointer ${
                isMuted
                  ? currentTheme.classes.controlBtn
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
              }`}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Aspect Ratio & Quality Mode Toggle */}
            <button
              onClick={toggleFitMode}
              title={`Modo visual: ${
                effectiveFit === 'cover'
                  ? 'Pantalla completa (Llenar pantalla)'
                  : effectiveFit === 'contain'
                  ? 'Ajustar original (Proporcional)'
                  : 'Nitidez Pro'
              }`}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-semibold border transition-all cursor-pointer ${
                effectiveFit === 'cover'
                  ? 'bg-rose-600/30 text-rose-200 border-rose-400/50 shadow-md shadow-rose-500/20'
                  : currentTheme.classes.controlBtn
              }`}
            >
              Modo:{' '}
              {effectiveFit === 'cover'
                ? 'Pantalla Completa'
                : effectiveFit === 'contain'
                ? 'Ajustar'
                : 'Nitidez Pro'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Help Button */}
            <button
              onClick={() => setShowHelpModal(true)}
              title="Atajos de teclado y control remoto (?)"
              className={`p-2.5 rounded-2xl border transition-colors cursor-pointer ${currentTheme.classes.controlBtn}`}
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Salir de pantalla completa (F11)' : 'Pantalla completa (F11)'}
              className={`p-2.5 rounded-2xl border transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer ${currentTheme.classes.controlBtn}`}
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
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowHelpModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-white relative"
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
                <span className="text-slate-300">Modo visual / Pantalla completa</span>
                <kbd className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-rose-400 font-semibold shadow-xs">
                  A
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800/60 text-sm">
                <span className="text-slate-300">Pantalla completa</span>
                <kbd className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-rose-400 font-semibold shadow-xs">
                  F / F11 / Doble Clic
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
