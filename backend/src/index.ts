import "dotenv/config";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";

import { pool } from "./db.js";
import { analysesRouter } from "./routes/analyses.js";
import { authRouter } from "./routes/auth.js";
import { coachRouter } from "./routes/coach.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/health", async (_req, res) => {
  try {
    await pool.query("select 1");
    return res.json({ ok: true });
  } catch {
    return res.status(503).json({ ok: false });
  }
});
app.use("/api/auth", authRouter);
app.use("/api/analyses", analysesRouter);
app.use("/api/coach", coachRouter);
app.use((_req, res) => res.status(404).json({ error: "요청한 API를 찾을 수 없습니다." }));
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (isRequestTooLargeError(error)) {
    return res.status(413).json({ error: "녹음 파일이 너무 큽니다. 5분 이하로 다시 녹음해주세요." });
  }
  console.error("Unhandled API error", error);
  return res.status(500).json({ error: "서버에서 문제가 발생했습니다." });
});

export default app;

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Madimadi API listening on port ${port}`);
  });
}

function isRequestTooLargeError(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "type" in error
    && error.type === "entity.too.large";
}
