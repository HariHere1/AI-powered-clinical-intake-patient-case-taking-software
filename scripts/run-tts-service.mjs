// Cross-platform launcher for the local Indic Parler-TTS service.
// Exists because npm scripts on Windows run through cmd.exe, which doesn't
// reliably resolve a forward-slash relative path to an executable.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const venvPython =
  process.platform === "win32"
    ? path.join(root, "tts_service", ".venv", "Scripts", "python.exe")
    : path.join(root, "tts_service", ".venv", "bin", "python");

const pythonBin = existsSync(venvPython) ? venvPython : "python";
if (pythonBin === "python") {
  console.warn(
    `Warning: no venv found at ${venvPython} — falling back to the system "python". ` +
      "Run the setup steps in tts_service/requirements.txt first.",
  );
}

// Redirect the HF/pip model+package caches into this project's own
// .tool-cache/ folder instead of the user's C: profile. Set here rather
// than relying on the OS-level env vars alone — those only apply to *new*
// shells opened after they were configured, so a long-lived terminal (or
// this very launcher, if invoked from one) would otherwise silently fall
// back to downloading multiple GB to C: again.
const toolCache = path.join(root, ".tool-cache");
const env = {
  ...process.env,
  HF_HOME: path.join(toolCache, "huggingface"),
  PIP_CACHE_DIR: path.join(toolCache, "pip"),
};

const child = spawn(pythonBin, ["-m", "uvicorn", "tts_service.app:app", "--port", "8788"], {
  cwd: root,
  stdio: "inherit",
  env,
});

child.on("exit", (code) => process.exit(code ?? 0));
