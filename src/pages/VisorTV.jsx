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
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^/]*)\/videos\/|album\/(?:\d+)\/video\/|)(\d+)/);
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

  // Persistent Fit Mode: default to 'cover' (Pantalla Completa) across all videos until manually changed
  const [userFitOverride, setUserFitOverride] = useState(() => {
    try {
      return localStorage.getItem('visor_tv_fit_mode') || 'cover';
    } catch (_) {
      return 'cover';
    }
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [progress, setProgress] = useState(0);
  const [versionHash, setVersionHash] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Double Buffering (Slot A & Slot B) State
  const [activeSlot, setActiveSlot] = useState('A');
  const [slotAIndex, setSlotAIndex] = useState(0);
  const [slotBIndex, setSlotBIndex] = useState(1);

  // Refs
  const videoARef = useRef(null);
  const videoBRef = useRef(null);
  const playPromiseRef = useRef(null);
  const imageTimerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const containerRef = useRef(null);
  const latestPlaylistRef = useRef([]);
  const versionHashRef = useRef('');
  const currentIndexRef = useRef(0);
  const activeSlotRef = useRef('A');

  // Error cooldown and consecutive error tracker to prevent cascading crash
  const consecutiveErrorsRef = useRef(0);
  const errorCooldownRef = useRef(null);

  // Transition & Sychronization Refs (Zero-Black-Screen Engine)
  const transitionInProgressRef = useRef(false);
  const transitionTimeoutRef = useRef(null);
  const pendingTransitionRef = useRef(null);

  // Stall Watchdog Refs
  const stallCounterRef = useRef(0);
  const lastTimeRef = useRef(-1);

  useEffect(() => {
    latestPlaylistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    activeSlotRef.current = activeSlot;
  }, [activeSlot]);

  // Single elegant aesthetic
  const currentTheme = getThemeById('elegant-red');

  // Save fit mode to localStorage and state
  const changeFitMode = useCallback((newMode) => {
    setUserFitOverride(newMode);
    try {
      localStorage.setItem('visor_tv_fit_mode', newMode);
    } catch (_) {}
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

  // Listen to Fullscreen changes across all browser implementations
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
          if (err.name === 'AbortError') {
            return;
          }
          console.warn('Autoplay unmuted was restricted, falling back to muted playback:', err);
          videoEl.muted = true;
          setIsMuted(true);
          videoEl.play().catch((playErr) => {
            if (playErr.name !== 'AbortError') {
              console.error('Video playback failed:', playErr);
            }
          });
        });
      }
    } catch (_) {}
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
    } catch (_) {}
  }, []);

  // Auto-activate audio on first TV remote / keyboard / touch interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      setIsMuted(false);
      const activeVideo = activeSlotRef.current === 'A' ? videoARef.current : videoBRef.current;
      if (activeVideo) {
        activeVideo.muted = false;
      }
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

  // Smart Preload for Images
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

  // Initial Load & Periodic Sync of Playlist
  const loadPlaylist = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setIsLoading(true);
      setError(null);
    }
    try {
      if (!isInitial && versionHashRef.current) {
        try {
          const versionRes = await playlistService.checkVersion(slug);
          if (versionRes.data.success && versionRes.data.version_hash === versionHashRef.current) {
            return;
          }
        } catch (checkErr) {
          console.warn('checkVersion check failed, falling back to full playlist fetch:', checkErr);
        }
      }

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
        const prevItems = latestPlaylistRef.current;
        setPlaylist(items);
        latestPlaylistRef.current = items;
        setVersionHash(res.data.version_hash);
        versionHashRef.current = res.data.version_hash;

        if (isInitial) {
          if (items.length > 0) {
            setSlotAIndex(0);
            setSlotBIndex(items.length > 1 ? 1 : 0);
            setActiveSlot('A');
            activeSlotRef.current = 'A';
            setCurrentIndex(0);
            currentIndexRef.current = 0;
          }
        } else {
          if (items.length > 0) {
            const currentItem = prevItems[currentIndexRef.current];
            const foundIndex = currentItem ? items.findIndex((it) => it.id === currentItem.id) : -1;
            if (foundIndex !== -1) {
              setCurrentIndex(foundIndex);
              currentIndexRef.current = foundIndex;
              if (activeSlotRef.current === 'A') {
                setSlotAIndex(foundIndex);
                setSlotBIndex((foundIndex + 1) % items.length);
              } else {
                setSlotBIndex(foundIndex);
                setSlotAIndex((foundIndex + 1) % items.length);
              }
            } else {
              const nextSafe = Math.min(currentIndexRef.current, items.length - 1);
              setCurrentIndex(nextSafe);
              currentIndexRef.current = nextSafe;
              setSlotAIndex(nextSafe);
              setSlotBIndex((nextSafe + 1) % items.length);
              setActiveSlot('A');
              activeSlotRef.current = 'A';
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching playlist:', err);
      if (isInitial) {
        setError(
          err.response?.data?.error || 'No se pudo cargar la programación de esta sede.'
        );
      }
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

  // Double Buffering Transition (Seamless Zero-Black-Screen A/B Switch)
  const advanceToSlot = useCallback(
    (targetIndex, forceImmediate = false) => {
      const items = latestPlaylistRef.current;
      if (!items || items.length === 0) return;

      if (items.length === 1) {
        // Single item loop: do not toggle slots, restart cleanly in place
        setCurrentIndex(0);
        currentIndexRef.current = 0;
        setProgress(0);
        const activeVid = activeSlotRef.current === 'A' ? videoARef.current : videoBRef.current;
        if (activeVid) {
          try {
            activeVid.currentTime = 0;
            playSafe(activeVid);
          } catch (_) {}
        }
        return;
      }

      if (transitionInProgressRef.current) {
        if (!forceImmediate) {
          return;
        }
        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
          transitionTimeoutRef.current = null;
        }
      }

      const validIndex = ((targetIndex % items.length) + items.length) % items.length;
      const currentSlot = activeSlotRef.current;
      const nextSlot = currentSlot === 'A' ? 'B' : 'A';
      const nextItem = items[validIndex];
      if (!nextItem) return;

      transitionInProgressRef.current = true;

      // Stage the target index in the target slot
      if (nextSlot === 'B') {
        setSlotBIndex(validIndex);
      } else {
        setSlotAIndex(validIndex);
      }

      let transitionCompleted = false;

      // Helper to finalize the visual cross-fade and queue the following item
      const completeTransition = () => {
        if (transitionCompleted) return;
        transitionCompleted = true;

        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
          transitionTimeoutRef.current = null;
        }
        pendingTransitionRef.current = null;

        const incomingVideo = nextSlot === 'B' ? videoBRef.current : videoARef.current;
        const outgoingVideo = currentSlot === 'A' ? videoARef.current : videoBRef.current;

        // Unmute incoming if sound is active
        if (incomingVideo) {
          incomingVideo.muted = isMuted;
        }

        // Switch visible active slot: incoming slot fades in (0 -> 100), outgoing slot fades out (100 -> 0)
        // Outgoing media holds its last frame cleanly on display during the entire 500ms crossfade!
        setActiveSlot(nextSlot);
        activeSlotRef.current = nextSlot;
        setCurrentIndex(validIndex);
        currentIndexRef.current = validIndex;
        setProgress(0);

        // After cross-fade duration (550ms):
        // 1. Soft-pause outgoing video without resetting its frame
        // 2. Stage the next subsequent item (validIndex + 1) in the newly invisible slot
        setTimeout(() => {
          if (outgoingVideo) {
            pauseSafe(outgoingVideo);
            try {
              outgoingVideo.muted = true;
            } catch (_) {}
          }

          const subsequentIndex = (validIndex + 1) % items.length;
          if (currentSlot === 'A') {
            setSlotAIndex(subsequentIndex);
          } else {
            setSlotBIndex(subsequentIndex);
          }

          transitionInProgressRef.current = false;
        }, 550);
      };

      pendingTransitionRef.current = { slot: nextSlot, complete: completeTransition };

      const isNextEmbed = nextItem.type === 'video' && !!getEmbedUrl(nextItem.url);

      if (nextItem.type === 'video' && !isNextEmbed) {
        // Target is a video: start it in background and wait for 'playing' or buffer
        const targetVideo = nextSlot === 'B' ? videoBRef.current : videoARef.current;

        // Safety fallback timer: if heavy video buffers > 7s or decoder lags, proceed anyway
        transitionTimeoutRef.current = setTimeout(() => {
          console.warn('Transition timeout: proceeding to crossfade after buffer delay');
          completeTransition();
        }, 7000);

        if (targetVideo) {
          try {
            targetVideo.muted = true;
            const playPromise = targetVideo.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  completeTransition();
                })
                .catch(() => {
                  targetVideo.muted = true;
                  targetVideo
                    .play()
                    .then(() => completeTransition())
                    .catch(() => completeTransition());
                });
            } else {
              completeTransition();
            }
          } catch (_) {
            completeTransition();
          }
        } else {
          setTimeout(completeTransition, 50);
        }
      } else {
        // Target is an image or external embed: crossfade immediately with preloaded asset
        completeTransition();
      }
    },
    [pauseSafe, playSafe, isMuted]
  );

  const goToNext = useCallback(
    (force = true) => {
      advanceToSlot(currentIndexRef.current + 1, force);
    },
    [advanceToSlot]
  );

  const goToPrev = useCallback(
    (force = true) => {
      advanceToSlot(currentIndexRef.current - 1, force);
    },
    [advanceToSlot]
  );

  // Pre-queue the subsequent item in the inactive slot after transition completes
  useEffect(() => {
    if (playlist.length <= 1) return;
    const timer = setTimeout(() => {
      const nextIdx = (currentIndex + 1) % playlist.length;
      if (activeSlot === 'A') {
        setSlotBIndex(nextIdx);
      } else {
        setSlotAIndex(nextIdx);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [currentIndex, activeSlot, playlist.length]);

  const currentItem = playlist[currentIndex] || null;
  const isEmbedVideo = currentItem?.type === 'video' && !!getEmbedUrl(currentItem?.url);

  // Active Video Playback Controller
  useEffect(() => {
    const activeVideo = activeSlot === 'A' ? videoARef.current : videoBRef.current;
    const inactiveVideo = activeSlot === 'A' ? videoBRef.current : videoARef.current;

    if (inactiveVideo && !transitionInProgressRef.current) {
      pauseSafe(inactiveVideo);
      try {
        inactiveVideo.muted = true;
      } catch (_) {}
    }

    if (!currentItem || currentItem.type !== 'video' || isEmbedVideo) return;
    if (!activeVideo) return;

    if (isPaused) {
      pauseSafe(activeVideo);
      return;
    }

    playSafe(activeVideo);
  }, [currentIndex, activeSlot, isPaused, isMuted, currentItem, isEmbedVideo, playSafe, pauseSafe]);

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

    const imgTimer = imageTimerRef.current;
    const progTimer = progressTimerRef.current;
    return () => {
      if (imgTimer) clearInterval(imgTimer);
      if (progTimer) clearInterval(progTimer);
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
    if (playlist.length === 1) {
      // Loop native single item
      const activeVid = activeSlotRef.current === 'A' ? videoARef.current : videoBRef.current;
      if (activeVid) {
        try {
          activeVid.currentTime = 0;
          playSafe(activeVid);
        } catch (_) {}
      }
      return;
    }
    goToNext();
  };

  // Debounced error handler with infinite loop resilience (Rule R3.2)
  const handleMediaError = useCallback(
    (slot, err) => {
      console.warn(`Media playback error in Slot ${slot}:`, err);
      if (errorCooldownRef.current) return;
      consecutiveErrorsRef.current += 1;

      // Never halt or display fatal error screen on TVs; continue the infinite cycle seamlessly
      errorCooldownRef.current = setTimeout(() => {
        errorCooldownRef.current = null;
        transitionInProgressRef.current = false;
        goToNext();
      }, 1500);
    },
    [goToNext]
  );

  // Anti-Freeze & Buffer Stall Watchdog (Rule R3.1)
  useEffect(() => {
    if (isPaused || playlist.length === 0) return;
    const activeVideo = activeSlot === 'A' ? videoARef.current : videoBRef.current;
    const activeItem = playlist[currentIndex];
    if (!activeVideo || !activeItem || activeItem.type !== 'video' || isEmbedVideo) {
      stallCounterRef.current = 0;
      lastTimeRef.current = -1;
      return;
    }

    const watchdogInterval = setInterval(() => {
      if (isPaused || activeVideo.ended || transitionInProgressRef.current) {
        return;
      }

      const current = activeVideo.currentTime;

      // Case 1: Video is unexpectedly paused (e.g. TV buffer underrun or blocked autoplay)
      if (activeVideo.paused) {
        stallCounterRef.current += 1;
        if (stallCounterRef.current >= 3) {
          console.warn('Watchdog: active video paused unexpectedly, attempting playSafe recovery');
          playSafe(activeVideo);
        }
        if (stallCounterRef.current >= 7) {
          console.warn('Watchdog: active video stuck paused for >7s, forcing advance to next item');
          stallCounterRef.current = 0;
          lastTimeRef.current = -1;
          goToNext();
        }
        return;
      }

      // Case 2: Video is playing, but currentTime is not advancing (frozen decoder or stalled chunk)
      if (lastTimeRef.current >= 0 && Math.abs(current - lastTimeRef.current) < 0.1) {
        stallCounterRef.current += 1;
        // Stalled for > 4 seconds: micro-recovery nudge
        if (stallCounterRef.current === 4) {
          console.warn('Watchdog: video stall detected (>4s), executing micro-recovery');
          try {
            activeVideo.currentTime += 0.05;
            playSafe(activeVideo);
          } catch (_) {}
        }
        // Stalled for > 7 seconds: force advance to next item
        if (stallCounterRef.current >= 7) {
          console.warn('Watchdog: video remains stalled (>7s), forcing advance to next item');
          stallCounterRef.current = 0;
          lastTimeRef.current = -1;
          goToNext();
        }
      } else {
        stallCounterRef.current = 0;
        lastTimeRef.current = current;
      }
    }, 1000);

    return () => clearInterval(watchdogInterval);
  }, [activeSlot, currentIndex, isPaused, playlist, isEmbedVideo, goToNext, playSafe]);

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
          toggleFitMode();
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
  }, [goToNext, goToPrev, toggleFullscreen, toggleFitMode]);

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

        <div className="absolute top-8 right-8 flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-800 bg-slate-900/90 text-sm font-mono text-white shadow-xl">
          <Clock className="w-4 h-4 text-rose-500" />
          <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>

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
      onDoubleClick={toggleFullscreen}
    >
      {/* ================= DOUBLE BUFFERING SLOT A (PERSISTENT HARDWARE-ACCELERATED) ================= */}
      <div
        className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-500 ease-in-out transform-gpu will-change-opacity ${
          activeSlot === 'A' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}
      >
        {itemA && itemA.type === 'video' ? (
          getEmbedUrl(itemA.url) ? (
            <iframe
              key={`embed-a-${itemA.id}`}
              src={getEmbedUrl(itemA.url)}
              className="w-full h-full border-0 pointer-events-none"
              allow="autoplay; encrypted-media; picture-in-picture"
              title={itemA.title || 'Embed Video A'}
            />
          ) : (
            <video
              key={`video-a-${itemA.id}`}
              ref={videoARef}
              src={resolveMediaUrl(itemA.url)}
              muted={isMuted || activeSlot !== 'A'}
              loop={playlist.length === 1}
              playsInline
              preload="auto"
              disablePictureInPicture
              controlsList="nodownload nofullscreen noremoteplayback"
              onLoadedData={() => {
                if (activeSlot === 'A' && !isPaused) {
                  playSafe(videoARef.current);
                }
              }}
              onPlaying={() => {
                consecutiveErrorsRef.current = 0;
                if (pendingTransitionRef.current?.slot === 'A') {
                  pendingTransitionRef.current.complete();
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
        ) : itemA ? (
          <img
            key={`img-a-${itemA.id}`}
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

      {/* ================= DOUBLE BUFFERING SLOT B (PERSISTENT HARDWARE-ACCELERATED) ================= */}
      <div
        className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-500 ease-in-out transform-gpu will-change-opacity ${
          activeSlot === 'B' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}
      >
        {itemB && itemB.type === 'video' ? (
          getEmbedUrl(itemB.url) ? (
            <iframe
              key={`embed-b-${itemB.id}`}
              src={getEmbedUrl(itemB.url)}
              className="w-full h-full border-0 pointer-events-none"
              allow="autoplay; encrypted-media; picture-in-picture"
              title={itemB.title || 'Embed Video B'}
            />
          ) : (
            <video
              key={`video-b-${itemB.id}`}
              ref={videoBRef}
              src={resolveMediaUrl(itemB.url)}
              muted={isMuted || activeSlot !== 'B'}
              loop={playlist.length === 1}
              playsInline
              preload="auto"
              disablePictureInPicture
              controlsList="nodownload nofullscreen noremoteplayback"
              onLoadedData={() => {
                if (activeSlot === 'B' && !isPaused) {
                  playSafe(videoBRef.current);
                }
              }}
              onPlaying={() => {
                consecutiveErrorsRef.current = 0;
                if (pendingTransitionRef.current?.slot === 'B') {
                  pendingTransitionRef.current.complete();
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
        ) : itemB ? (
          <img
            key={`img-b-${itemB.id}`}
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
            const activeVideo = activeSlot === 'A' ? videoARef.current : videoBRef.current;
            if (activeVideo) activeVideo.muted = false;
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
              onClick={() => {
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                const activeVideo = activeSlot === 'A' ? videoARef.current : videoBRef.current;
                if (activeVideo) activeVideo.muted = nextMuted;
              }}
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
              onClick={toggleFitMode}
              title={`Modo visual: ${
                getEffectiveFit(currentItem) === 'cover'
                  ? 'Pantalla completa (Llenar pantalla)'
                  : getEffectiveFit(currentItem) === 'contain'
                  ? 'Ajustar original (Proporcional)'
                  : 'Nitidez Pro'
              }`}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-semibold border backdrop-blur-xl transition-all cursor-pointer ${
                getEffectiveFit(currentItem) === 'cover'
                  ? 'bg-rose-600/30 text-rose-200 border-rose-400/50 shadow-md shadow-rose-500/20'
                  : currentTheme.classes.controlBtn
              }`}
            >
              Modo:{' '}
              {getEffectiveFit(currentItem) === 'cover'
                ? 'Pantalla Completa'
                : getEffectiveFit(currentItem) === 'contain'
                ? 'Ajustar'
                : 'Nitidez Pro'}
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
