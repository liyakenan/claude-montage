import React from "react";
import { AbsoluteFill, OffthreadVideo, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export type Layout = "full" | "bottom" | "circle" | "hidden";
export type LayoutCue = { at: number; layout: Layout };
export type Zoom = { from: number; to: number; scale: number };

type Box = { x: number; y: number; w: number; h: number; r: number };

const BOXES: Record<Layout, Box> = {
  full: { x: 0, y: 0, w: 1080, h: 1920, r: 0 },
  // speaker fills the lower part, graphics go on top (use <Stage>)
  bottom: { x: 0, y: 860, w: 1080, h: 1060, r: 0 },
  // round "talking head" bubble at the bottom
  circle: { x: 320, y: 1070, w: 440, h: 440, r: 220 },
  hidden: { x: 320, y: 1920, w: 440, h: 440, r: 220 },
};

/** Where captions sit for each layout (vertical centre, px) so they never cover the face. */
export const CAPTION_Y: Record<Layout, number> = { full: 1330, bottom: 925, circle: 985, hidden: 1330 };

const mix = (a: Box, b: Box, t: number): Box => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
  r: a.r + (b.r - a.r) * t,
});

/**
 * The person talking. Always mounted (so the voice never drops), only its box changes.
 * layouts: when to switch between full / bottom / circle (frames).
 * zooms: gentle push-ins while in "full" (frames). Keep scale <= 1.15.
 * focusX/focusY: centre of the FACE in the source frame, in percent (measure it on a still).
 *   The crop keeps the whole head in view around this point and zooms go towards it.
 * srcWidth/srcHeight: size of the source video (info.width / info.height).
 */
export const Speaker: React.FC<{
  src: string;
  layouts?: LayoutCue[];
  zooms?: Zoom[];
  focusX?: number;
  focusY?: number;
  srcWidth?: number;
  srcHeight?: number;
  volume?: number;
}> = ({ src, layouts = [{ at: 0, layout: "full" }], zooms = [], focusX = 50, focusY = 38, srcWidth = 1080, srcHeight = 1920, volume = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cues = [...layouts].sort((a, b) => a.at - b.at);
  let box = BOXES[cues[0].layout];
  for (let i = 1; i < cues.length; i++) {
    const t = spring({ frame: frame - cues[i].at, fps, config: { damping: 200 }, durationInFrames: 14 });
    box = mix(box, BOXES[cues[i].layout], t);
  }

  let scale = 1;
  for (const z of zooms) {
    const ease = Math.min(10, Math.floor((z.to - z.from) / 2));
    scale += interpolate(frame, [z.from, z.from + ease, z.to - ease, z.to], [0, z.scale - 1, z.scale - 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  // place the face a bit above the middle of the box, whatever the box shape is
  const cover = Math.max(box.w / srcWidth, box.h / srcHeight);
  const overX = srcWidth * cover - box.w;
  const overY = srcHeight * cover - box.h;
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const posX = overX > 1 ? clamp((((focusX / 100) * srcWidth * cover - 0.5 * box.w) / overX) * 100) : 50;
  const posY = overY > 1 ? clamp((((focusY / 100) * srcHeight * cover - 0.42 * box.h) / overY) * 100) : 50;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: box.x,
          top: box.y,
          width: box.w,
          height: box.h,
          borderRadius: box.r,
          overflow: "hidden",
          boxShadow: box.r > 0 ? "0 20px 60px rgba(0,0,0,0.35)" : undefined,
        }}
      >
        <OffthreadVideo
          src={src}
          volume={volume}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `${posX}% ${posY}%`,
            transform: `scale(${scale})`,
            transformOrigin: `${focusX}% ${focusY}%`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/**
 * Area for graphics above the speaker in "bottom" / "circle" layouts.
 * Starts below the part Instagram covers (300 px) and ends above the captions.
 */
export const Stage: React.FC<{ children: React.ReactNode; top?: number; height?: number }> = ({ children, top = 310, height = 540 }) => (
  <div style={{ position: "absolute", left: 0, top, width: 1080, height, display: "flex", alignItems: "center", justifyContent: "center" }}>
    {children}
  </div>
);
