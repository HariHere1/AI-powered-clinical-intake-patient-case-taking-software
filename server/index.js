import "dotenv/config";
import express from "express";
import cors from "cors";
import { synthesizeSpeech } from "./bhashiniClient.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.post("/api/tts", async (req, res) => {
  const { text, languageCode, gender } = req.body || {};

  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }
  if (typeof languageCode !== "string" || !languageCode.trim()) {
    return res.status(400).json({ error: "languageCode is required" });
  }

  try {
    const result = await synthesizeSpeech(text.trim(), languageCode.trim(), gender === "male" ? "male" : "female");
    res.json(result);
  } catch (err) {
    console.error("TTS error:", err);
    res.status(502).json({ error: err instanceof Error ? err.message : "TTS failed" });
  }
});

app.get("/api/tts/health", (_req, res) => res.json({ ok: true }));

const port = parseInt(process.env.API_PORT || "8787", 10);
app.listen(port, () => {
  console.log(`MediKiosk TTS API listening on http://localhost:${port}`);
});
