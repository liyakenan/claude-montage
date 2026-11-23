import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CAPTION_Y, type LayoutCue } from "./Speaker";
import { brand, fontFamily } from "./brand";

export type Word = { text: string; start: number; end: number };

const RTL = new Set(["he", "ar", "fa"]);
const isLtrToken = (t: string) => /[A-Za-z0-9]/.test(t) && !/[֐-ۿ]/.test(t);
const clean = (t: string) => t.replace(/[.,;:"„“”]+$/g, "").replace(/^["„“”]+/g, "");

type Page = { words: (Word & { i: number })[]; start: number; end: number };

/** Split words into short pages: a few words each, breaking on punctuation and on pauses. */
export const makePages = (words: Word[], maxWords = 3, maxChars = 18): Page[] => {
  const pages: Page[] = [];
  let cur: (Word & { i: number })[] = [];
  const flush = () => {
    if (cur.length) pages.push({ words: cur, start: cur[0].start, end: cur[cur.length - 1].end });
    cur = [];
  };
  words.forEach((w, i) => {
    const len = cur.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length;
    const gap = cur.length ? w.start - cur[cur.length - 1].end : 0;
    if (cur.length && (cur.length >= maxWords || len > maxChars || gap > 0.45)) flush();
    cur.push({ ...w, i });
    if (/[.?!…]$/.test(w.text)) flush();
  });
  flush();
  pages.forEach((p, k) => {
    const next = pages[k + 1];
    p.end = next ? Math.min(next.start, p.end + 0.6) : p.end + 0.4;
  });
  return pages;
};

/**
 * Word-by-word captions. The word being spoken gets the accent colour.
 * Latin words and numbers inside Hebrew/Arabic text are kept as one left-to-right block.
 * layouts: pass the same list you gave <Speaker> and the captions move out of the way of the face by themselves.
 * y: or set the vertical centre yourself (px). Keep between 300 and 1550 (Instagram covers the rest).
 * hide: ranges (frames) where captions are not shown, e.g. while a card with text is on screen.
 */
export const Captions: React.FC<{
  words: Word[];
  lang?: string;
  y?: number;
  layouts?: LayoutCue[];
  size?: number;
  maxWords?: number;
  color?: string;
  accent?: string;
  hide?: [number, number][];
}> = ({ words, lang = "he", y, layouts = [{ at: 0, layout: "full" }], size = 84, maxWords = 3, color = brand.text, accent = brand.accent, hide = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const pages = React.useMemo(() => makePages(words, maxWords), [words, maxWords]);
  const page = pages.find((p) => t >= p.start && t < p.end);
  if (!page || hide.some(([a, b]) => frame >= a && frame < b)) return null;

  // merge neighbouring Latin/number words into one LTR block
  const blocks: { text: string; start: number; end: number; ltr: boolean }[] = [];
  for (const w of page.words) {
    const text = clean(w.text);
    if (!text) continue;
    const ltr = isLtrToken(text);
    const last = blocks[blocks.length - 1];
    if (ltr && last?.ltr) {
      last.text += " " + text;
      last.end = w.end;
    } else blocks.push({ text, start: w.start, end: w.end, ltr });
  }

  const cues = [...layouts].sort((a, b) => a.at - b.at);
  let top = CAPTION_Y[cues[0].layout];
  for (let i = 1; i < cues.length; i++) {
    const k = spring({ frame: frame - cues[i].at, fps, config: { damping: 200 }, durationInFrames: 14 });
    top += (CAPTION_Y[cues[i].layout] - top) * k;
  }
  if (y !== undefined) top = y;

  const pop = interpolate(frame - page.start * fps, [0, 4], [0.92, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top,
        transform: `translateY(-50%) scale(${pop})`,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "0 22px",
        direction: RTL.has(lang) ? "rtl" : "ltr",
        fontFamily,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.15,
        textAlign: "center",
        textShadow: "0 4px 18px rgba(0,0,0,0.75), 0 0 4px rgba(0,0,0,0.9)",
      }}
    >
      {blocks.map((b, k) => {
        const next = blocks[k + 1];
        const active = t >= b.start && (next ? t < next.start : true);
        return (
          <span
            key={k}
            dir={b.ltr ? "ltr" : undefined}
            style={{ color: active ? accent : color, unicodeBidi: "isolate", display: "inline-block", whiteSpace: "nowrap" }}
          >
            {b.text}
          </span>
        );
      })}
    </div>
  );
};
