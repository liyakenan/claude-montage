# Claude Montage

A video-editing kit for Claude Code, made by Liya Kenan (KLAI.GEN) for her workshop students.
After installing, you drop a talking-head video into Claude and it cuts the pauses, adds captions (Hebrew included), gentle zooms and graphics, and renders a vertical Reel.

Everything is open in this repository, nothing is hidden or pre-compiled.

## What the installer does

It installs only into one folder, `~/claude-montage`, plus skill files in `~/.claude/skills`. No admin rights, no system settings are changed.

1. **Node.js 22**, the official build from nodejs.org, checked against its SHA-256 checksum. Placed in `~/claude-montage/.node`, not system-wide.
2. **This kit**, downloaded from this GitHub repository.
3. **Editing libraries** via `npm install` from the public npm registry: Remotion (renders the video), ffmpeg-static (cuts the audio and video), Transformers.js (speech recognition). Exact versions are pinned in `package.json` and `package-lock.json`.
4. **A browser for rendering** (about 140 MB) that Remotion uses to draw the frames.
5. **A speech-recognition model** (Whisper, about 1.5 GB) from Hugging Face, used offline for captions.
6. **Skills for Claude** copied into `~/.claude/skills`:
   - `montage`: the editing rules (see `skill/montage/SKILL.md`)
   - the official Remotion skills from [remotion-dev/skills](https://github.com/remotion-dev/skills)
   - Instagram skills, a copy of [Jakeschincariol/instagram-agent-skill](https://github.com/Jakeschincariol/instagram-agent-skill) (MIT), see `skills-instagram/SOURCE.txt`
7. A self-check that everything runs.

The installer code is short and readable: [install.sh](install.sh) (Mac), [install.ps1](install.ps1) (Windows), and [tools/setup.mjs](tools/setup.mjs) (the shared second half). It is safe to run again: it only adds what is missing.

## Install

Give this message to Claude Code (Code tab in the Claude app):

> Please install the Claude Montage video-editing kit from https://github.com/liyakenan/claude-montage . First read README.md, install.sh (or install.ps1 on Windows) and tools/setup.mjs, tell me in short what they do, and then run the installer for my computer.

Or run it yourself:

- Mac: `curl -fsSL https://raw.githubusercontent.com/liyakenan/claude-montage/main/install.sh -o /tmp/montage-install.sh && bash /tmp/montage-install.sh`
- Windows (PowerShell): download `install.ps1`, read it, then run `powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1`

## After installing

Open a new chat in Claude Code, choose the `claude-montage` folder, drag in a video and write: "edit my video" / "ערכו לי את הסרטון".

## License

MIT, see [LICENSE](LICENSE). The Instagram skills keep their original MIT license.
