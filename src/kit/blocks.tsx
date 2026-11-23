import React from "react";
import { Img, OffthreadVideo, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand, fontFamily } from "./brand";

/** Scale/fade in at `from`, out at `to` (frames). Wrap any graphic in it. */
export const Appear: React.FC<{ from: number; to: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  from,
  to,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame >= to) return null;
  const inn = spring({ frame: frame - from, fps, config: { damping: 16, stiffness: 160 } });
  const out = interpolate(frame, [to - 6, to], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ transform: `scale(${0.85 + 0.15 * inn})`, opacity: Math.min(inn, out), ...style }}>{children}</div>;
};

/** Big hook title at the top of the frame. Keep it short (3-7 words). */
export const Hook: React.FC<{ from: number; to: number; text: string; rtl?: boolean; y?: number }> = ({
  from,
  to,
  text,
  rtl = true,
  y = 330,
}) => (
  <Appear from={from} to={to} style={{ position: "absolute", left: 60, right: 60, top: y, display: "flex", justifyContent: "center" }}>
    <div
      style={{
        background: brand.accent,
        color: brand.cardText,
        fontFamily,
        fontWeight: 900,
        fontSize: 78,
        lineHeight: 1.15,
        padding: "22px 40px",
        borderRadius: 28,
        textAlign: "center",
        direction: rtl ? "rtl" : "ltr",
        boxShadow: "0 16px 50px rgba(0,0,0,0.35)",
      }}
    >
      {text}
    </div>
  </Appear>
);

/** A picture, screenshot or video clip in a rounded card. src = staticFile("name.png"). */
export const Picture: React.FC<{ from: number; to: number; src: string; video?: boolean; width?: number; height?: number }> = ({
  from,
  to,
  src,
  video = false,
  width = 900,
  height = 520,
}) => {
  const frame = useCurrentFrame();
  const push = interpolate(frame, [from, to], [1, 1.06]);
  const media: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", transform: `scale(${push})` };
  return (
    <Appear from={from} to={to}>
      <div style={{ width, height, borderRadius: 36, overflow: "hidden", background: brand.card, boxShadow: "0 24px 70px rgba(0,0,0,0.45)" }}>
        {video ? <OffthreadVideo src={src} muted style={media} /> : <Img src={src} style={media} />}
      </div>
    </Appear>
  );
};

/** A list whose lines appear one by one, each at its own frame. */
export const Steps: React.FC<{ from: number; to: number; items: { text: string; at: number }[]; rtl?: boolean }> = ({
  from,
  to,
  items,
  rtl = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Appear from={from} to={to}>
      <div style={{ width: 900, display: "flex", flexDirection: "column", gap: 22, direction: rtl ? "rtl" : "ltr" }}>
        {items.map((it, i) => {
          const s = spring({ frame: frame - it.at, fps, config: { damping: 18 } });
          const now = frame >= it.at && (i === items.length - 1 || frame < items[i + 1].at);
          return (
            <div
              key={i}
              style={{
                opacity: s,
                transform: `translateY(${(1 - s) * 40}px)`,
                background: now ? brand.accent : brand.card,
                color: brand.cardText,
                fontFamily,
                fontWeight: 700,
                fontSize: 50,
                padding: "22px 36px",
                borderRadius: 26,
                display: "flex",
                gap: 24,
                alignItems: "center",
                boxShadow: "0 12px 36px rgba(0,0,0,0.3)",
              }}
            >
              <span style={{ fontWeight: 900, opacity: 0.45 }}>{i + 1}</span>
              <span>{it.text}</span>
            </div>
          );
        })}
      </div>
    </Appear>
  );
};

/** A chat mock-up: messages are typed one after another. who: "me" (right bubble) or "ai". */
export const Chat: React.FC<{
  from: number;
  to: number;
  title?: string;
  messages: { who: "me" | "ai"; text: string; at: number }[];
  rtl?: boolean;
}> = ({ from, to, title = "AI", messages, rtl = true }) => {
  const frame = useCurrentFrame();
  return (
    <Appear from={from} to={to}>
      <div
        style={{
          width: 900,
          minHeight: 420,
          background: brand.card,
          color: brand.cardText,
          borderRadius: 40,
          padding: 36,
          boxSizing: "border-box",
          fontFamily,
          boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 40, opacity: 0.5, textAlign: "center" }}>{title}</div>
        {messages.map((m, i) => {
          if (frame < m.at) return null;
          const shown = m.text.slice(0, Math.floor((frame - m.at) * 1.6));
          return (
            <div
              key={i}
              dir={rtl ? "rtl" : "ltr"}
              style={{
                alignSelf: m.who === "me" ? "flex-end" : "flex-start",
                background: m.who === "me" ? brand.accent : "rgba(0,0,0,0.07)",
                padding: "20px 28px",
                borderRadius: 28,
                fontSize: 40,
                fontWeight: 500,
                lineHeight: 1.3,
                maxWidth: "85%",
                unicodeBidi: "plaintext",
              }}
            >
              {shown || " "}
            </div>
          );
        })}
      </div>
    </Appear>
  );
};
