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

const child = spawn(pythonBin, ["-m", "uvicorn", "tts_service.app:app", "--port", "8788"], {
  cwd: root,
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 0));
