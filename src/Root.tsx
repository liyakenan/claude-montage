import React from "react";
import { Composition } from "remotion";
import { Reel, meta } from "./active.gen";

// One composition, always called "Reel". tools/cli.mjs points active.gen.ts at the project being worked on.
export const Root: React.FC = () => (
  <Composition
    id="Reel"
    component={Reel}
    width={1080}
    height={1920}
    fps={meta.fps}
    durationInFrames={meta.frames}
    defaultProps={{ zones: false }}
  />
);
