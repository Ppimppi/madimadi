import "dotenv/config";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";

import { pool } from "./db.js";
import { appUrl } from "./env.js";
import { analysesRouter } from "./routes/analyses.js";
import { authRouter } from "./routes/auth.js";

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
app.use((_req, res) => res.status(404).json({ error: "요청한 API를 찾을 수 없습니다." }));
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled API error", error);
  res.status(500).json({ error: "서버에서 문제가 발생했습니다." });
});

app.listen(port, () => {
  console.log(`Madimadi API listening on port ${port} for ${appUrl().origin}`);
});
