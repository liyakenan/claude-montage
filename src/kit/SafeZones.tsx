import React from "react";
import { AbsoluteFill } from "remotion";

const band: React.CSSProperties = {
  position: "absolute",
  background: "rgba(255,0,60,0.28)",
  color: "#fff",
  fontFamily: "sans-serif",
  fontSize: 30,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

/** Shown only in check stills (m still --zones): the red areas are covered by the Instagram/TikTok interface. */
export const SafeZones: React.FC = () => (
  <AbsoluteFill>
    <div style={{ ...band, left: 0, top: 0, width: 1080, height: 300 }}>covered: keep text below 300</div>
    <div style={{ ...band, left: 0, top: 1550, width: 1080, height: 370 }}>covered: keep text above 1550</div>
    <div style={{ ...band, left: 940, top: 1000, width: 140, height: 550, fontSize: 22 }}>icons</div>
  </AbsoluteFill>
);
