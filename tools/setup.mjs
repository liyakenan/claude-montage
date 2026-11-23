// Second half of the installer (same for Mac and Windows): libraries, browser, speech model, skills, self-check.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const step = (n, text) => console.log(`\n[${n}/5] ${text}`);
const nodeDir = path.dirname(process.execPath);
const env = { ...process.env, PATH: nodeDir + path.delimiter + process.env.PATH };

const npmCli = [
  path.join(nodeDir, "node_modules", "npm", "bin", "npm-cli.js"),
  path.join(nodeDir, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
].find((p) => fs.existsSync(p));

if (!fs.existsSync(path.join(ROOT, "brand.json"))) fs.copyFileSync(path.join(ROOT, "brand.default.json"), path.join(ROOT, "brand.json"));
for (const d of ["projects", "ready"]) fs.mkdirSync(path.join(ROOT, d), { recursive: true });

step(1, "Installing the editing libraries (1-3 minutes)...");
{
  const args = ["install", "--no-fund", "--no-audit", "--loglevel=error"];
  const r = npmCli
    ? spawnSync(process.execPath, [npmCli, ...args], { cwd: ROOT, stdio: "inherit", env })
    : spawnSync("npm", args, { cwd: ROOT, stdio: "inherit", env, shell: true });
  if (r.status !== 0) {
    console.error("INSTALL FAILED at step 1 (npm install). Check the internet connection and run the installer again.");
    process.exit(1);
  }
}

step(2, "Downloading the browser used for rendering (140 MB)...");
try {
  const { ensureBrowser } = await import("@remotion/renderer");
  await ensureBrowser();
} catch (e) {
  console.log("  Could not download now, it will be retried on the first render. (" + String(e.message).split("\n")[0] + ")");
}

step(3, "Downloading the speech-recognition model (about 1.5 GB, the longest step)...");
try {
  const { loadAsr } = await import("./transcribe.mjs");
  const seen = {};
  await loadAsr((p) => {
    if (p.status !== "progress" || !p.total || p.total < 5e7) return;
    const pct = Math.floor((p.loaded / p.total) * 4) * 25;
    if (pct > (seen[p.file] ?? -1)) console.log(`  ${path.basename(p.file)} ${(seen[p.file] = pct)}%`);
  });
} catch (e) {
  console.log("  Could not download now, it will be retried on the first video. (" + String(e.message).split("\n")[0] + ")");
}

step(4, "Adding the skills to Claude...");
const skills = path.join(os.homedir(), ".claude", "skills");
fs.mkdirSync(skills, { recursive: true });
fs.cpSync(path.join(ROOT, "skill", "montage"), path.join(skills, "montage"), { recursive: true });
console.log("  montage: installed");
try {
  // Official Remotion skills, straight from their public repository (same thing as: npx skills add remotion-dev/skills)
  const tar = await import("tar");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "remotion-skills-"));
  const res = await fetch("https://codeload.github.com/remotion-dev/skills/tar.gz/refs/heads/main");
  if (!res.ok) throw new Error("HTTP " + res.status);
  const file = path.join(tmp, "skills.tgz");
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  await tar.x({ file, cwd: tmp, strip: 1 });
  const src = path.join(tmp, "skills");
  let n = 0;
  for (const name of fs.readdirSync(src)) {
    if (!fs.existsSync(path.join(src, name, "SKILL.md"))) continue;
    if (fs.existsSync(path.join(skills, name))) continue; // keep what the user already has
    fs.cpSync(path.join(src, name), path.join(skills, name), { recursive: true });
    n++;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`  Remotion skills: ${n} added`);
} catch (e) {
  console.log("  Remotion skills could not be downloaded (optional, editing works without them): " + e.message);
}

{
  // Instagram skills (scripts, hooks, captions, carousels): a fixed copy shipped inside the kit, see skills-instagram/SOURCE.txt
  const src = path.join(ROOT, "skills-instagram");
  let n = 0;
  if (fs.existsSync(src)) {
    for (const name of fs.readdirSync(src)) {
      if (!fs.existsSync(path.join(src, name, "SKILL.md"))) continue;
      if (fs.existsSync(path.join(skills, name))) continue; // keep what the user already has
      fs.cpSync(path.join(src, name), path.join(skills, name), { recursive: true });
      fs.copyFileSync(path.join(src, "LICENSE"), path.join(skills, name, "LICENSE"));
      n++;
    }
  }
  console.log(`  Instagram skills: ${n} added`);
}

step(5, "Checking that everything works...");
const r = spawnSync(process.execPath, [path.join(ROOT, "tools", "cli.mjs"), "doctor"], { cwd: ROOT, stdio: "inherit", env });
if (r.status === 0) {
  console.log("\nINSTALL OK - Claude Montage is ready in: " + ROOT);
  console.log("Open a NEW session in Claude (Code tab), choose the folder claude-montage, and write: ערכו לי את הסרטון");
} else {
  console.log("\nINSTALL INCOMPLETE - see the FAIL lines above. Running the installer again is safe.");
  process.exit(1);
}
