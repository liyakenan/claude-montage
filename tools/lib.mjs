import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const FFMPEG = ffmpegPath;
export const projectDir = (name) => path.join(ROOT, "projects", name);

export const fail = (msg) => {
  console.error("ERROR: " + msg);
  process.exit(1);
};

export const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
export const writeJson = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 1));

/** Run ffmpeg, return stderr (ffmpeg prints its info there). */
export const ffmpeg = (args, { allowFail = false } = {}) => {
  const r = spawnSync(FFMPEG, ["-hide_banner", "-nostdin", ...args], { maxBuffer: 1 << 28, encoding: "utf8" });
  if (r.status !== 0 && !allowFail) throw new Error("ffmpeg failed:\n" + r.stderr.split("\n").slice(-12).join("\n"));
  return r.stderr || "";
};

/** Run ffmpeg with a simple progress line. */
export const ffmpegProgress = (args, total, label) =>
  new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, ["-hide_banner", "-nostdin", "-y", ...args]);
    let err = "";
    let last = -1;
    p.stderr.on("data", (d) => {
      err = (err + d).slice(-4000);
      const m = /time=(\d+):(\d+):([\d.]+)/.exec(String(d));
      if (m && total) {
        const pct = Math.min(100, Math.round(((+m[1] * 3600 + +m[2] * 60 + +m[3]) / total) * 100));
        if (pct >= last + 20) {
          last = pct;
          console.log(`  ${label} ${pct}%`);
        }
      }
    });
    p.on("close", (c) => (c === 0 ? resolve() : reject(new Error("ffmpeg failed:\n" + err.split("\n").slice(-12).join("\n")))));
  });

/** Basic facts about a video file. */
export const probe = (file) => {
  const out = ffmpeg(["-i", file], { allowFail: true });
  const v = out.split("\n").find((l) => /Stream .*Video:/.test(l));
  if (!v) fail("This file has no video track: " + file);
  const dm = /Duration: (\d+):(\d+):([\d.]+)/.exec(out);
  const size = /, (\d{2,5})x(\d{2,5})[ ,\[]/.exec(v);
  const fpsM = /([\d.]+) fps/.exec(v) || /([\d.]+) tbr/.exec(v);
  const rot = /rotation of (-?[\d.]+) degrees/.exec(out);
  let [w, h] = [+size[1], +size[2]];
  if (rot && Math.abs(Math.round(+rot[1])) % 180 === 90) [w, h] = [h, w];
  return {
    duration: dm ? +dm[1] * 3600 + +dm[2] * 60 + +dm[3] : 0,
    width: w,
    height: h,
    fps: fpsM ? +fpsM[1] : 30,
    hdr: /arib-std-b67|smpte2084/.test(v),
    hasAudio: /Stream .*Audio:/.test(out),
  };
};

/** Pick a clean frame rate close to the source (never invent frames: 60->30, 50->25). */
export const pickFps = (src) => {
  let f = Math.abs(src - Math.round(src)) < 0.06 ? Math.round(src) : src;
  if (f > 40) f = f / 2;
  if (f < 20 || f > 40 || !Number.isInteger(f)) f = 30;
  return f;
};

export const setActive = (name) => {
  const target = name ? `../projects/${name}/Reel` : "./kit/Check";
  fs.writeFileSync(path.join(ROOT, "src", "active.gen.ts"), `export { Reel, meta } from "${target}";\n`);
};

export const openFolder = (dir) => {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open";
  try {
    spawn(cmd, [dir], { detached: true, stdio: "ignore" }).unref();
  } catch {}
};
