// Find pauses in the speech and build the list of parts to keep.
import { ffmpeg } from "./lib.mjs";

export const analyseAudio = (file) => {
  const out = ffmpeg(["-i", file, "-vn", "-af", "volumedetect", "-f", "null", "-"], { allowFail: true });
  const mean = +(/mean_volume: (-?[\d.]+) dB/.exec(out)?.[1] ?? -25);
  const max = +(/max_volume: (-?[\d.]+) dB/.exec(out)?.[1] ?? -3);
  return { mean, max };
};

/**
 * Returns [{start,end}] to keep (seconds, snapped to frames).
 * Pauses of minPause seconds or more are shortened so that `keep` seconds of air stay.
 * Speech is never sped up.
 */
export const findKeeps = (file, duration, fps, { minPause = 0.3, keep = 0.16, db } = {}) => {
  const { mean } = analyseAudio(file);
  // "silence" = clearly below the speaking level of this particular recording
  const thr = db ?? Math.max(-52, Math.min(-30, mean - 16));
  const out = ffmpeg(["-i", file, "-vn", "-af", `silencedetect=noise=${thr}dB:d=${Math.max(0.12, minPause - 0.05)}`, "-f", "null", "-"], {
    allowFail: true,
  });
  const starts = [...out.matchAll(/silence_start: (-?[\d.]+)/g)].map((m) => Math.max(0, +m[1]));
  const ends = [...out.matchAll(/silence_end: (-?[\d.]+)/g)].map((m) => +m[1]);
  const silences = starts.map((s, i) => ({ start: s, end: ends[i] ?? duration }));

  const removes = [];
  for (const s of silences) {
    const atStart = s.start < 0.05;
    const atEnd = s.end > duration - 0.05;
    const len = s.end - s.start;
    if (!atStart && !atEnd && len < minPause) continue;
    const a = atStart ? 0 : s.start + keep / 2 + (atEnd ? 0.25 : 0);
    const b = atEnd ? duration : s.end - keep / 2;
    if (b - a > 0.06) removes.push({ start: a, end: b });
  }
  const snap = (t) => Math.round(t * fps) / fps;
  const keeps = [];
  let pos = 0;
  for (const r of removes) {
    if (snap(r.start) - snap(pos) > 1 / fps) keeps.push({ start: snap(pos), end: snap(r.start) });
    pos = r.end;
  }
  if (duration - pos > 1 / fps) keeps.push({ start: snap(pos), end: Math.floor(duration * fps) / fps });
  return { keeps, threshold: thr, removed: removes.reduce((n, r) => n + r.end - r.start, 0) };
};

/** ffmpeg filters that keep only the given parts, in one pass, with sound and picture in sync. */
export const selectFilters = (keeps, fps) => {
  const half = 0.5 / fps;
  const v = keeps.map((k) => `between(t,${(k.start - half).toFixed(4)},${(k.end - half - 0.0005).toFixed(4)})`).join("+");
  const a = keeps.map((k) => `between(t,${k.start.toFixed(4)},${(k.end - 0.00001).toFixed(5)})`).join("+");
  return {
    video: `select='${v}',setpts=N/${fps}/TB`,
    audio: `aselect='${a}',asetpts=N/SR/TB`,
  };
};
