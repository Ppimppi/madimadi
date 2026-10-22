import { cp, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const packageDirectory = dirname(require.resolve("@mediapipe/tasks-vision"));
const sourceDirectory = join(packageDirectory, "wasm");
const frontendDirectory = join(dirname(fileURLToPath(import.meta.url)), "..");
const destinationDirectory = join(frontendDirectory, "public", "mediapipe", "wasm");

await mkdir(destinationDirectory, { recursive: true });
await cp(sourceDirectory, destinationDirectory, { recursive: true, force: true });
console.log("MediaPipe WASM assets prepared.");
