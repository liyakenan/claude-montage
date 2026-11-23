---
name: montage
description: Edit a talking-head video into a finished vertical Reel / TikTok / Short on this computer - cut the pauses, even out the sound, add word-by-word captions, gentle zooms and graphics on top (cards, screenshots, lists, chat mock-ups), then render an mp4. Use whenever the user sends or mentions a video file and wants it edited, or says things like "edit my video", "make a reel from this", "add subtitles", "cut the pauses", "ערכו לי את הסרטון", "תערוך לי סרטון", "תעשה לי רילס", "תוסיף כתוביות", "תחתוך שתיקות", "смонтируй видео", "сделай рилс", "добавь субтитры".
---

# Montage: edit a talking video with the Claude Montage kit

The user is a beginner, not a programmer. Speak to them in their own language (Hebrew by default, plural "אתם"), in short plain sentences. Never show them code, file paths inside the kit, or command names unless they ask. Tell them what you are doing and what you need from them.

Everything lives in the kit folder: `~/claude-montage` (Windows: `%USERPROFILE%\claude-montage`). All work is done with one launcher, run from that folder:

- Mac: `~/claude-montage/m <command>`
- Windows (PowerShell): `& "$HOME\claude-montage\m.cmd" <command>`

If the folder or the launcher is missing, the kit is not installed: tell the user to run the installer from the workshop page again. If something behaves oddly, run `m doctor` first.

Rendering and `m new` can take several minutes. Run them in the background if they may exceed two minutes, and keep the user posted.

## Commands

| Command | What it does |
|---|---|
| `m new <video> [--name x] [--lang he] [--no-cut] [--min-pause 0.3]` | Converts the video, cuts pauses, evens out loudness, writes every word with its time. Creates `projects/<name>/`. |
| `m words <name>` | Numbered word list with start time and frame. Use the word numbers to time everything. |
| `m still <name> <sec> ... [--zones]` | Check pictures at the given seconds into `projects/<name>/stills/`. `--zones` paints the areas Instagram covers. |
| `m render <name> [--draft]` | Final video into `ready/<name>.mp4` and opens that folder. |
| `m preview <name>` | Live preview in the browser (optional). |
| `m list`, `m doctor` | Projects; health check. |

`--lang`: language spoken in the video (`he`, `en`, `ru`, `ar`, ...). Ask if it is not obvious.

## Workflow

1. **Get the video.** Ask the user to drag the file into the chat or give its location. Ask only what you really need: the language spoken, and whether they want (a) a clean edit with the speaker full screen, or (b) graphics on top with the speaker below. If they do not care, choose (b) when the video explains steps, tools or lists, otherwise (a).
2. **Prepare:** `m new "<file>" --name <short-latin-name> --lang <code>`. Read the printed text. If words are clearly wrong (names, brands), fix them in `projects/<name>/words.json` (only the `text` field; never change the times).
3. **Plan the edit** from `m words <name>`: the hook (first 3 seconds), where graphics appear and disappear, where the layout changes. Every moment is tied to a word number: `W(i)` in the code is the frame where word `i` starts.
4. **Write the edit** in `projects/<name>/Reel.tsx` (see "The edit file"). Put images or screenshots the user gives you into `projects/<name>/public/` and reference them with `staticFile("file.png")`.
5. **Check with stills before rendering.** `m still <name> <several seconds> --zones`, then look at every picture yourself (Read the jpg). Check the list in "Rules". Fix and repeat until clean.
6. **Render:** `m render <name>`. Tell the user where the file is (the folder opens by itself) and offer changes in plain words ("bigger captions", "different colour", "remove the card at the start").

Changes after the first render: edit `Reel.tsx`, re-check the affected moments with `m still`, render again. Do not run `m new` again unless the source video changes - it would redo the cut and all word numbers would shift.

## The edit file

`projects/<name>/Reel.tsx` is a normal Remotion component, 1080x1920. Building blocks come from `src/kit` (read the source there when you need details - it is short):

- `<Speaker src layouts zooms focusX focusY srcWidth srcHeight />` - the person. `layouts` is a list of `{ at: frame, layout }` where layout is `"full"` (full screen), `"bottom"` (speaker in the lower part, graphics above), `"circle"` (small round bubble, graphics above) or `"hidden"`. `zooms` is a list of `{ from, to, scale }`. `focusX/focusY` = centre of the face in percent of the source frame: measure it on the first still and set it, the crop is built around it.
- `<Captions words lang layouts />` - word-by-word captions. Give it the same `layouts` list and it moves out of the way of the face. Options: `size`, `maxWords`, `color`, `accent`, `y`, `hide` (frame ranges without captions).
- `<Stage>` - the safe area for graphics above the speaker. Put blocks inside it.
- Blocks: `<Hook from to text />` (title at the top), `<Picture from to src />` (image / screenshot / video clip in a card), `<Steps from to items />` (list appearing line by line), `<Chat from to messages />` (typed chat mock-up), `<Appear from to>` (wrap your own graphic so it animates in and out).
- `<SafeZones />` is already wired to `--zones`. Leave it in.

These blocks are a starting point. For anything else - app screens, counters, arrows, comparisons, charts, logos - write your own React components in the project folder. If the Remotion skills are installed (`remotion-best-practices`), load them before writing custom animation. Drive every animation from `useCurrentFrame()`; CSS transitions and `setTimeout` do not render.

Colours come from `brand.json` in the kit folder (`accent`, `bg`, `text`, `card`, `cardText`). The first time, ask the user for their brand colour and write it there; do not ask again.

## Rules (they come from a lot of real edits - follow them)

**Cutting**
- Never speed up speech. Only pauses of 0.3 s or longer are cut. If the result sounds chopped ("eaten" words), redo with `--min-pause 0.45`; if pauses remain, try `--min-pause 0.25`.
- Keep the frame rate of the source. The kit does this; never force 30 fps on 25 fps footage, it stutters.
- The video starts with the first sentence. No cold opens, no "rewind" tricks.

**Hook**
- The first 3 seconds decide everything. The hook is 3-7 words and visible from frame 0. Strengthen it with a graphic, not with more text.

**Captions**
- 2-3 words at a time, large, in the lower-middle of the frame. The accent colour marks the word being spoken.
- In Hebrew / Arabic, Latin words and numbers stay one left-to-right block (the kit does it). Write tool names in Latin (ChatGPT, Claude), not transliterated.
- Fonts: plain bold sans (Rubik / Heebo). No serif, no handwritten fonts.

**Safe zones (1080x1920)**
- Nothing important above 300 px or below 1550 px: Instagram and TikTok cover those areas. The right edge between 1000 and 1550 px holds the like/comment icons.
- Always check with `--zones` stills. Text touching a red band is a bug.

**Framing**
- Never crop the head. In every layout, in every zoom, the whole head including hair is inside the frame. Look at the stills; adjust `focusY`, or lower the zoom.
- Zooms are rare and gentle: scale 1.08-1.15, on an important sentence, eased in and out. No shaking, no constant jump cuts.
- Captions never cover the face.

**Graphics**
- A graphic shows what the words mean - a picture, a screen, an object. It does not repeat the captions as text. One idea per graphic.
- Show each graphic exactly while it is being talked about: start at the word that introduces it (`W(i)`), end when the topic changes.
- Keep the speaker visible most of the time. People watch a person.
- Use real screenshots or images from the user when they have them. Ask for them; do not invent a product's interface.

**Sound**
- Voice only by default. No music or sound effects unless the user asks. If they ask for music, they supply the file; put it under the voice at roughly -24 dB.

**Before you say "done"** - look at stills from the start, every layout change, every graphic, and the end, and confirm: head whole, captions readable and not on the face, nothing in the red zones, Hebrew reads right-to-left with Latin words intact, graphics appear at the right words.

## When something breaks

- `m doctor` shows what is missing. Missing speech model or browser download themselves on next use (needs internet).
- Render error mentioning a file: it must be inside `projects/<name>/public/` and referenced with `staticFile()`.
- iPhone video looks pale: it was HDR and the conversion fell back; tell the user to record with HDR video off (Settings > Camera > Record Video).
- Very long videos (over ~5 minutes) take long to prepare and render; suggest editing a shorter part first.
