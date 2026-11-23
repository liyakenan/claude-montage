# Claude Montage kit

This folder is a ready video-editing kit for beginners. When the user wants a video edited (cut pauses, captions, zooms, graphics, render), follow the `montage` skill (`~/.claude/skills/montage/SKILL.md`; a copy is in `skill/montage/SKILL.md`).

- Launcher: `./m <command>` (Mac) or `.\m.cmd <command>` (Windows). `m help` lists commands.
- Each video is a project in `projects/<name>/`; the edit is `projects/<name>/Reel.tsx`; finished videos go to `ready/`.
- The user is not a programmer: answer in their language, in plain words, without code.
- Do not move this folder into iCloud / OneDrive / Desktop: synced folders make rendering hang.
