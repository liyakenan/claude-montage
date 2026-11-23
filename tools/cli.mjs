#!/usr/bin/env node
// Claude Montage kit: one small command for every step of editing a talking video.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { ROOT, FFMPEG, fail, ffmpegProgress, openFolder, pickFps, probe, projectDir, readJson, setActive, writeJson } from "./lib.mjs";
import { findKeeps, selectFilters } from "./cut.mjs";

const argv = process.argv.slice(2);
const cmd = argv[0];
const flags = {};
const args = [];
for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) {
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) flags[a.slice(2)] = true;
    else flags[a.slice(2)] = argv[++i];
  } else args.push(a);
}

const HELP = `Claude Montage - commands (run as: m <command>)

  new <video file> [--name my-reel] [--lang he] [--no-cut] [--min-pause 0.3]
        Prepare a video: convert, cut out the pauses, even out the sound, write down every word with its time.
  words <name>            Numbered list of the words with times (use the numbers for timing graphics).
  still <name> <sec> [<sec> ...] [--zones]
        Save check pictures of the edit at these seconds (--zones marks areas Instagram covers).
  render <name> [--draft] Make the final video -> ready/<name>.mp4
  preview <name>          Open the live preview in the browser.
  list                    Show all projects.
  doctor                  Check that everything is installed and working.
`;

const needProject = (name) => {
  if (!name) fail("Give the project name. See: m list");
  const dir = projectDir(name);
  if (!fs.existsSync(path.join(dir, "Reel.tsx"))) fail(`No project called "${name}". See: m list`);
  return dir;
};

const safeName = (file) => {
  const base = path.basename(file, path.extname(file)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const d = new Date();
  const stamp = `${d.getMonth() + 1}`.padStart(2, "0") + `${d.getDate()}`.padStart(2, "0") + "-" + `${d.getHours()}`.padStart(2, "0") + `${d.getMinutes()}`.padStart(2, "0");
  return base && /[a-z]/.test(base) ? base.slice(0, 30) : "reel-" + stamp;
};

const fmt = (s) => s.toFixed(1) + "s";

async function withBundle(name, fn) {
  const { bundle } = await import("@remotion/bundler");
  const renderer = await import("@remotion/renderer");
  await renderer.ensureBrowser();
  setActive(name);
  const serveUrl = await bundle({
    entryPoint: path.join(ROOT, "src", "index.ts"),
    publicDir: name ? path.join(projectDir(name), "public") : path.join(ROOT, "src", "kit"),
    outDir: fs.mkdtempSync(path.join(os.tmpdir(), "montage-")),
  });
  try {
    return await fn(renderer, serveUrl);
  } finally {
    fs.rmSync(serveUrl, { recursive: true, force: true });
  }
}

const commands = {
  async new() {
    const src = args[0] && path.resolve(args[0]);
    if (!src || !fs.existsSync(src)) fail("Video file not found: " + (args[0] ?? "(none given)"));
    const lang = flags.lang || "he";
    let name = (flags.name && String(flags.name).toLowerCase().replace(/[^a-z0-9-]+/g, "-")) || safeName(src);
    if (!flags.name) for (let n = 2; fs.existsSync(projectDir(name)); n++) name = name.replace(/-\d+$/, "") + "-" + n;
    const dir = projectDir(name);
    const pub = path.join(dir, "public");
    fs.mkdirSync(pub, { recursive: true });

    const info = probe(src);
    if (!info.hasAudio) fail("This video has no sound, so there is no speech to edit.");
    const fps = pickFps(info.fps);
    console.log(`Source: ${info.width}x${info.height}, ${info.fps} fps, ${fmt(info.duration)}${info.hdr ? ", HDR" : ""}`);

    let keeps = [{ start: 0, end: Math.floor(info.duration * fps) / fps }];
    let removed = 0;
    if (!flags["no-cut"]) {
      const r = findKeeps(src, info.duration, fps, {
        minPause: +(flags["min-pause"] || 0.3),
        db: flags.db ? +flags.db : undefined,
      });
      if (r.keeps.length) ({ keeps, removed } = r);
      console.log(`Pauses: cutting ${fmt(removed)} in ${Math.max(0, keeps.length - 1)} places (silence level ${r.threshold.toFixed(0)} dB)`);
    }

    const sel = selectFilters(keeps, fps);
    const vf = [`fps=${fps}`];
    if (info.hdr) vf.push("zscale=t=linear:npl=100", "format=gbrpf32le", "zscale=p=bt709", "tonemap=tonemap=hable:desat=0", "zscale=t=bt709:m=bt709:r=tv");
    if (Math.max(info.width, info.height) > 1920) vf.push(info.width >= info.height ? "scale=1920:-2" : "scale=-2:1920");
    vf.push(sel.video, "format=yuv420p");
    const af = ["aresample=48000", sel.audio, "loudnorm=I=-16:TP=-1.5:LRA=11", "aresample=48000"];
    const cut = path.join(pub, "cut.mp4");
    const enc = (vfilters) =>
      ffmpegProgress(
        ["-i", src, "-vf", vfilters.join(","), "-af", af.join(","), "-map", "0:v:0", "-map", "0:a:0", "-c:v", "libx264", "-preset", "fast", "-crf", "17", "-g", String(fps), "-c:a", "aac", "-b:a", "192k", "-ac", "2", "-movflags", "+faststart", cut],
        info.duration,
        "Converting",
      );
    try {
      await enc(vf);
    } catch (e) {
      if (!info.hdr) throw e;
      console.log("  HDR conversion failed, retrying without it (colours may look pale)");
      await enc(vf.filter((f) => !/zscale|tonemap|gbrpf32le/.test(f)));
    }

    const out = probe(cut);
    console.log("Listening to the speech (first time can take a few minutes)...");
    const { transcribe } = await import("./transcribe.mjs");
    const tr = await transcribe(cut, lang);
    writeJson(path.join(dir, "words.json"), { text: tr.text, words: tr.words });
    writeJson(path.join(dir, "info.json"), {
      name,
      source: src,
      lang,
      fps,
      width: out.width,
      height: out.height,
      duration: +out.duration.toFixed(3),
      frames: Math.round(out.duration * fps),
      originalDuration: +info.duration.toFixed(3),
      keeps,
    });
    if (!fs.existsSync(path.join(dir, "Reel.tsx"))) fs.copyFileSync(path.join(ROOT, "templates", "Reel.tsx"), path.join(dir, "Reel.tsx"));
    setActive(name);

    console.log(`\nProject "${name}" is ready: ${path.relative(ROOT, dir)}`);
    console.log(`Length: ${fmt(info.duration)} -> ${fmt(out.duration)} (${out.width}x${out.height}, ${fps} fps), ${tr.words.length} words`);
    console.log(`Text: ${tr.text}`);
    console.log(`Next: m words ${name}   |   m still ${name} 1 --zones   |   m render ${name}`);
  },

  async words() {
    const dir = needProject(args[0]);
    const { words } = readJson(path.join(dir, "words.json"));
    const { fps } = readJson(path.join(dir, "info.json"));
    console.log("index | start s | frame | word");
    words.forEach((w, i) => console.log(`${String(i).padStart(3)} | ${w.start.toFixed(2).padStart(6)} | ${String(Math.round(w.start * fps)).padStart(5)} | ${w.text}`));
  },

  async still() {
    const dir = needProject(args[0]);
    const times = args.slice(1).map(Number).filter((n) => !Number.isNaN(n));
    if (!times.length) fail("Give at least one time in seconds, e.g.: m still my-reel 1 5.5 --zones");
    const out = path.join(dir, "stills");
    fs.mkdirSync(out, { recursive: true });
    await withBundle(args[0], async (r, serveUrl) => {
      const inputProps = { zones: !!flags.zones };
      const composition = await r.selectComposition({ serveUrl, id: "Reel", inputProps });
      for (const t of times) {
        const frame = Math.max(0, Math.min(composition.durationInFrames - 1, Math.round(t * composition.fps)));
        const file = path.join(out, `t${t.toFixed(1).padStart(5, "0")}${flags.zones ? "_zones" : ""}.jpg`);
        await r.renderStill({ composition, serveUrl, output: file, frame, inputProps, imageFormat: "jpeg", jpegQuality: 82, scale: 0.5 });
        console.log(file);
      }
    });
  },

  async render() {
    needProject(args[0]);
    const name = args[0];
    fs.mkdirSync(path.join(ROOT, "ready"), { recursive: true });
    const file = path.join(ROOT, "ready", `${name}${flags.draft ? "_draft" : ""}.mp4`);
    await withBundle(name, async (r, serveUrl) => {
      const inputProps = { zones: false };
      const composition = await r.selectComposition({ serveUrl, id: "Reel", inputProps });
      let last = -1;
      await r.renderMedia({
        composition,
        serveUrl,
        codec: "h264",
        crf: flags.draft ? 26 : 18,
        scale: flags.draft ? 0.5 : 1,
        audioCodec: "aac",
        outputLocation: file,
        inputProps,
        onProgress: ({ progress }) => {
          const pct = Math.floor(progress * 10) * 10;
          if (pct > last) console.log(`  Rendering ${(last = pct)}%`);
        },
      });
    });
    const mb = (fs.statSync(file).size / 1e6).toFixed(1);
    console.log(`\nDone: ${file} (${mb} MB)`);
    if (!flags["no-open"]) openFolder(path.dirname(file));
  },

  async preview() {
    needProject(args[0]);
    setActive(args[0]);
    const cli = path.join(ROOT, "node_modules", "@remotion", "cli", "remotion-cli.js");
    spawn(process.execPath, [cli, "studio", "src/index.ts", "--public-dir", path.join("projects", args[0], "public")], { cwd: ROOT, stdio: "inherit" });
  },

  async list() {
    const base = path.join(ROOT, "projects");
    const names = fs.existsSync(base) ? fs.readdirSync(base).filter((n) => fs.existsSync(path.join(base, n, "info.json"))) : [];
    if (!names.length) return console.log("No projects yet. Start with: m new <video file>");
    for (const n of names) {
      const i = readJson(path.join(base, n, "info.json"));
      const done = fs.existsSync(path.join(ROOT, "ready", n + ".mp4")) ? "rendered" : "not rendered yet";
      console.log(`${n}  -  ${fmt(i.duration)}, ${i.lang}, ${done}`);
    }
  },

  async doctor() {
    const ok = (label, good, hint = "") => console.log(`${good ? "OK  " : "FAIL"} ${label}${good || !hint ? "" : "  -> " + hint}`);
    let all = true;
    const check = (label, good, hint) => (ok(label, good, hint), (all = all && good));
    check(`Node ${process.version}`, +process.versions.node.split(".")[0] >= 20, "Node 20 or newer is needed. Run the installer again.");
    check("ffmpeg", !!FFMPEG && fs.existsSync(FFMPEG), "Run: npm install (inside the kit folder)");
    const models = path.join(ROOT, ".models");
    check("speech model", fs.existsSync(models) && fs.readdirSync(models).length > 0, "It will download on the first video (about 1.5 GB).");
    const active = path.join(ROOT, "src", "active.gen.ts");
    const before = fs.readFileSync(active, "utf8");
    try {
      const file = path.join(os.tmpdir(), "montage-check.jpg");
      await withBundle(null, async (r, serveUrl) => {
        const composition = await r.selectComposition({ serveUrl, id: "Reel" });
        await r.renderStill({ composition, serveUrl, output: file, frame: 10, imageFormat: "jpeg", scale: 0.25 });
      });
      check("video rendering", fs.existsSync(file));
    } catch (e) {
      check("video rendering", false, String(e.message || e).split("\n")[0]);
    } finally {
      fs.writeFileSync(active, before);
    }
    console.log(all ? "\nEverything works." : "\nSomething is missing, see FAIL lines above.");
    process.exit(all ? 0 : 1);
  },
};

if (!cmd || cmd === "help" || !commands[cmd]) {
  console.log(HELP);
  process.exit(cmd && cmd !== "help" ? 1 : 0);
}
commands[cmd]().then(
  () => process.exit(0),
  (e) => fail(e?.stack || String(e)),
);
