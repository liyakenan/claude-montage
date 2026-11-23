import React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { type LayoutCue, Captions, SafeZones, Speaker, Stage, Hook, Picture, Steps, Chat, brand } from "../../src/kit";
import info from "./info.json";
import data from "./words.json";

export const meta = { fps: info.fps, frames: info.frames };

const words = data.words;
/** Frame at which word number i starts (numbers come from `m words <name>`). Time graphics with this. */
const W = (i: number) => Math.round(words[Math.min(i, words.length - 1)].start * info.fps);

/** When the speaker is full screen / at the bottom with graphics on top / in a small circle. */
const layouts: LayoutCue[] = [{ at: 0, layout: "full" }];

export const Reel: React.FC<{ zones?: boolean }> = ({ zones }) => (
  <AbsoluteFill style={{ backgroundColor: brand.bg }}>
    <Speaker src={staticFile("cut.mp4")} layouts={layouts} zooms={[]} focusX={50} focusY={38} srcWidth={info.width} srcHeight={info.height} />

    {/* Graphics go here, e.g.
    <Stage><Picture from={W(8)} to={W(20)} src={staticFile("screenshot.png")} /></Stage>
    */}

    <Captions words={words} lang={info.lang} layouts={layouts} />
    {zones ? <SafeZones /> : null}
  </AbsoluteFill>
);
