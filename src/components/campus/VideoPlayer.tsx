"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatClock } from "@/lib/utils";
import {
  IconBack10,
  IconFullscreen,
  IconFwd10,
  IconMute,
  IconPause,
  IconPlay,
  IconVolume,
} from "@/components/icons";

export type PlayerSource =
  | { type: "hls"; src: string; fallback?: string }
  | { type: "mp4"; src: string }
  | { type: "iframe"; src: string }
  | { type: "none" };

type Props = {
  lessonId: string;
  source: PlayerSource;
  poster?: string | null;
  watermark?: string | null;
  startAt?: number;
  autoCompleteAt?: number; // %
  alreadyCompleted?: boolean;
  next?: { href: string; title: string } | null;
  processing?: boolean;
  /** false en clases con evaluación: se completan al aprobarla */
  autoComplete?: boolean;
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

async function sendProgress(lessonId: string, position: number, completed?: boolean) {
  try {
    const res = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, position, completed }),
      keepalive: true,
    });
    return res.ok ? ((await res.json()) as { certificateCode?: string | null }) : null;
  } catch {
    return null;
  }
}

/** Marca de agua dinámica con los datos del alumno (desalienta grabaciones de pantalla). */
function Watermark({ text }: { text: string }) {
  const [pos, setPos] = useState({ left: 8, top: 10 });
  useEffect(() => {
    const t = setInterval(() => setPos({ left: 4 + Math.random() * 62, top: 6 + Math.random() * 74 }), 9000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="vp-wm" style={{ left: `${pos.left}%`, top: `${pos.top}%` }} aria-hidden="true">
      {text}
    </div>
  );
}

export function VideoPlayer(props: Props) {
  const { source } = props;
  if (source.type === "none") return null;
  if (source.type === "iframe") {
    return (
      <div className="vp" onContextMenu={(e) => e.preventDefault()}>
        <iframe
          src={source.src}
          title="Clase"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
        {props.watermark && <Watermark text={props.watermark} />}
      </div>
    );
  }
  return <NativePlayer {...props} source={source} />;
}

function NativePlayer({
  lessonId,
  source,
  poster,
  watermark,
  startAt = 0,
  autoCompleteAt = 90,
  alreadyCompleted = false,
  next,
  processing,
  autoComplete = true,
}: Props & { source: Extract<PlayerSource, { type: "hls" | "mp4" }> }) {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const completedRef = useRef(alreadyCompleted);
  const lastSaved = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [showCtrl, setShowCtrl] = useState(true);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null);
  const [nextCountdown, setNextCountdown] = useState<number | null>(null);

  // La URL firmada cambia en cada render del servidor (router.refresh); usamos la primera
  // para no reiniciar la reproducción. El token dura varias horas.
  const sourceRef = useRef(source);
  if (sourceRef.current.type !== source.type) sourceRef.current = source;

  // Carga de la fuente (HLS cifrado con hls.js o nativo; MP4 por rangos)
  useEffect(() => {
    const v = video.current;
    const source = sourceRef.current;
    if (!v) return;
    let hls: { destroy: () => void } | null = null;
    let cancelled = false;
    setError(null);
    try {
      const saved = Number(localStorage.getItem("tuki:speed") || 1);
      if (SPEEDS.includes(saved)) setSpeed(saved);
    } catch {
      /* sin storage */
    }
    if (source.type === "hls") {
      if (v.canPlayType("application/vnd.apple.mpegurl")) {
        v.src = source.src;
      } else {
        import("hls.js").then(({ default: Hls }) => {
          if (cancelled) return;
          if (!Hls.isSupported()) {
            if (source.fallback) v.src = source.fallback;
            else setError("Tu navegador no soporta este reproductor.");
            return;
          }
          const h = new Hls({ enableWorker: true, maxBufferLength: 30 });
          h.on(Hls.Events.ERROR, (_e, data) => {
            if (data.fatal) {
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR) setError("Se perdió la conexión o tu sesión expiró. Recargá la página.");
              else h.recoverMediaError();
            }
          });
          h.loadSource(source.src);
          h.attachMedia(v);
          hls = h;
        });
      }
    } else {
      v.src = source.src;
    }
    return () => {
      cancelled = true;
      hls?.destroy();
      v.removeAttribute("src");
      v.load();
    };
  }, [lessonId, source.type]);

  useEffect(() => {
    if (video.current) video.current.playbackRate = speed;
  }, [speed]);

  const save = useCallback(
    (force = false) => {
      const v = video.current;
      if (!v || !v.duration) return;
      if (!force && Math.abs(v.currentTime - lastSaved.current) < 10) return;
      lastSaved.current = v.currentTime;
      sendProgress(lessonId, v.currentTime);
    },
    [lessonId],
  );

  // Guardar al salir
  useEffect(() => {
    const onHide = () => save(true);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      save(true);
    };
  }, [save]);

  const complete = useCallback(async () => {
    if (completedRef.current || !autoComplete) return;
    completedRef.current = true;
    const r = await sendProgress(lessonId, video.current?.currentTime ?? 0, true);
    router.refresh();
    if (r?.certificateCode) {
      window.dispatchEvent(new CustomEvent("tuki:toast", { detail: { text: "¡Completaste el curso! Tu certificado ya está disponible 🎓" } }));
    }
  }, [lessonId, router, autoComplete]);

  const toggle = useCallback(() => {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const seekBy = (d: number) => {
    const v = video.current;
    if (v) v.currentTime = Math.min(Math.max(0, v.currentTime + d), v.duration || 0);
  };

  const fullscreen = () => {
    const el = wrap.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  };

  const poke = () => {
    setShowCtrl(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowCtrl(false), 2600);
  };

  // Atajos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        toggle();
      } else if (e.key === "ArrowRight" || e.key === "l") seekBy(10);
      else if (e.key === "ArrowLeft" || e.key === "j") seekBy(-10);
      else if (e.key === "f") fullscreen();
      else if (e.key === "m") setMuted((m) => !m);
      else return;
      poke();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  useEffect(() => {
    if (video.current) {
      video.current.volume = volume;
      video.current.muted = muted;
    }
  }, [volume, muted]);

  // Cuenta regresiva a la siguiente clase
  useEffect(() => {
    if (nextCountdown == null || !next) return;
    if (nextCountdown <= 0) {
      router.push(next.href);
      return;
    }
    const t = setTimeout(() => setNextCountdown((n) => (n == null ? n : n - 1)), 1000);
    return () => clearTimeout(t);
  }, [nextCountdown, next, router]);

  const pct = duration ? (time / duration) * 100 : 0;

  const seekFromEvent = (clientX: number, target: HTMLElement) => {
    const r = target.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return { ratio, x: clientX - r.left };
  };

  return (
    <div
      ref={wrap}
      className={`vp${playing ? "" : " paused"}${showCtrl ? " show-ctrl" : ""}${playing && !showCtrl ? " hide-cursor" : ""}`}
      onMouseMove={poke}
      onMouseLeave={() => playing && setShowCtrl(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <video
        ref={video}
        poster={poster ?? undefined}
        playsInline
        preload="metadata"
        controlsList="nodownload noremoteplayback noplaybackrate"
        disablePictureInPicture
        disableRemotePlayback
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDuration(v.duration);
          if (startAt > 5 && startAt < v.duration - 5) v.currentTime = startAt;
          v.playbackRate = speed;
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setTime(v.currentTime);
          if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
          save();
          if (v.duration && (v.currentTime / v.duration) * 100 >= autoCompleteAt) complete();
        }}
        onPlay={() => {
          setPlaying(true);
          setStarted(true);
          setNextCountdown(null);
          poke();
        }}
        onPause={() => {
          setPlaying(false);
          save(true);
        }}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onEnded={() => {
          setPlaying(false);
          complete();
          save(true);
          if (next) setNextCountdown(6);
        }}
        onError={() => setError("No pudimos cargar el video. Recargá la página o intentá más tarde.")}
        onClick={toggle}
        onDoubleClick={fullscreen}
      />
      {watermark && <Watermark text={watermark} />}
      {waiting && playing && <div className="vp-spinner" />}
      {!started && !error && (
        <button type="button" className="vp-big" aria-label="Reproducir" onClick={toggle}>
          <IconPlay />
        </button>
      )}
      {error && (
        <div className="vp-msg">
          <div>
            <strong>{processing ? "Estamos procesando este video" : "Ups, algo falló"}</strong>
            <p>{processing ? "El video se está optimizando para streaming seguro. Volvé en unos minutos." : error}</p>
            <button type="button" className="cp-btn" onClick={() => location.reload()}>
              Recargar
            </button>
          </div>
        </div>
      )}
      {nextCountdown != null && next && (
        <div className="vp-next" role="status">
          Siguiente clase en {nextCountdown}s
          <strong>{next.title}</strong>
          <div className="btns">
            <button type="button" className="cp-btn" onClick={() => router.push(next.href)}>
              Ver ahora
            </button>
            <button type="button" className="cp-btn ghost" onClick={() => setNextCountdown(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="vp-ctrl" onClick={(e) => e.stopPropagation()}>
        <div
          className="vp-seek"
          role="slider"
          aria-label="Progreso"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          tabIndex={0}
          onClick={(e) => {
            const { ratio } = seekFromEvent(e.clientX, e.currentTarget);
            if (video.current && duration) video.current.currentTime = ratio * duration;
          }}
          onMouseMove={(e) => {
            const { ratio, x } = seekFromEvent(e.clientX, e.currentTarget);
            setHover({ x, t: ratio * duration });
          }}
          onMouseLeave={() => setHover(null)}
        >
          <div className="track">
            <div className="buf" style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
            <div className="cur" style={{ width: `${pct}%` }} />
            <div className="knob" style={{ left: `${pct}%` }} />
          </div>
          {hover && duration > 0 && (
            <span className="tip" style={{ left: hover.x }}>
              {formatClock(hover.t)}
            </span>
          )}
        </div>
        <div className="vp-row">
          <button type="button" onClick={toggle} aria-label={playing ? "Pausar" : "Reproducir"}>
            {playing ? <IconPause /> : <IconPlay />}
          </button>
          <button type="button" onClick={() => seekBy(-10)} aria-label="Retroceder 10 segundos">
            <IconBack10 />
          </button>
          <button type="button" onClick={() => seekBy(10)} aria-label="Adelantar 10 segundos">
            <IconFwd10 />
          </button>
          <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Activar sonido" : "Silenciar"}>
            {muted || volume === 0 ? <IconMute /> : <IconVolume />}
          </button>
          <input
            className="vp-vol"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => {
              setVolume(Number(e.target.value));
              setMuted(Number(e.target.value) === 0);
            }}
            aria-label="Volumen"
          />
          <span className="time">
            {formatClock(time)} / {formatClock(duration)}
          </span>
          <span className="grow" />
          <div className="vp-speed">
            <button type="button" onClick={() => setSpeedOpen((o) => !o)} aria-label="Velocidad" aria-expanded={speedOpen}>
              {speed}x
            </button>
            {speedOpen && (
              <div className="vp-menu">
                {SPEEDS.map((s) => (
                  <button
                    type="button"
                    key={s}
                    className={s === speed ? "on" : ""}
                    onClick={() => {
                      setSpeed(s);
                      setSpeedOpen(false);
                      try {
                        localStorage.setItem("tuki:speed", String(s));
                      } catch {
                        /* sin storage */
                      }
                    }}
                  >
                    {s === 1 ? "Normal" : `${s}x`}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={fullscreen} aria-label="Pantalla completa">
            <IconFullscreen />
          </button>
        </div>
      </div>
    </div>
  );
}
