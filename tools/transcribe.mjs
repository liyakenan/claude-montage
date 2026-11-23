// Speech -> words with timestamps. No compilation needed (ONNX runtime), works on Mac and Windows.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const MODEL = "onnx-community/whisper-large-v3-turbo_timestamped";

export async function loadAsr(onProgress) {
  const { pipeline, env } = await import("@huggingface/transformers");
  env.cacheDir = path.join(ROOT, ".models");
  return pipeline("automatic-speech-recognition", MODEL, {
    dtype: { encoder_model: "fp16", decoder_model_merged: "q4" },
    progress_callback: onProgress,
  });
}

export function readAudio(file) {
  const r = spawnSync(
    ffmpegPath,
    ["-v", "error", "-i", file, "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
    { maxBuffer: 1 << 30 },
  );
  if (r.status !== 0) throw new Error("ffmpeg: " + r.stderr.toString());
  const b = r.stdout;
  return new Float32Array(b.buffer, b.byteOffset, Math.floor(b.byteLength / 4));
}

export async function transcribe(file, lang) {
  const asr = await loadAsr();
  const audio = readAudio(file);
  const out = await asr(audio, {
    language: lang,
    task: "transcribe",
    return_timestamps: "word",
    chunk_length_s: 30,
    stride_length_s: 5,
  });
  const dur = audio.length / 16000;
  const words = [];
  for (const c of out.chunks) {
    const text = c.text.trim();
    if (!text) continue;
    let [s, e] = c.timestamp;
    if (e == null || e < s) e = Math.min(dur, s + 0.4);
    const prev = words[words.length - 1];
    // glue pieces that the model split off: 'אט after מצ, or lone punctuation
    if (prev && (/^['’׳״"\-.,?!:;%]/.test(text) || /[-־]$/.test(prev.text))) {
      prev.text += text;
      prev.end = +e.toFixed(3);
      continue;
    }
    words.push({ text, start: +s.toFixed(3), end: +e.toFixed(3) });
  }
  return { duration: +dur.toFixed(3), text: out.text.trim(), words };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [file, lang = "he", outFile] = process.argv.slice(2);
  const t0 = Date.now();
  const res = await transcribe(file, lang);
  if (outFile) fs.writeFileSync(outFile, JSON.stringify(res, null, 1));
  console.log(res.text);
  console.log(`${res.words.length} words, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
