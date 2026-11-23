import React from "react";
import { AbsoluteFill } from "remotion";
import { brand, fontFamily } from "./brand";

export const meta = { fps: 30, frames: 30 };

// Used only by "m doctor" to prove that rendering works on this computer.
export const Reel: React.FC<{ zones?: boolean }> = () => (
  <AbsoluteFill
    style={{
      backgroundColor: brand.bg,
      color: brand.accent,
      fontFamily,
      fontWeight: 900,
      fontSize: 150,
      alignItems: "center",
      justifyContent: "center",
      direction: "rtl",
    }}
  >
    הכול מוכן
  </AbsoluteFill>
);
