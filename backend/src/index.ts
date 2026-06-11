import "dotenv/config";
import express from "express";
import cors from "cors";
import { apiRouter } from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { recalculateAllBalances } from "./services/activityCurrentAccount.service.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

const frontendOrigin =
  process.env.FRONTEND_URL?.replace(/\/$/, "") ?? "http://localhost:5173";

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", apiRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  recalculateAllBalances().catch((err) =>
    console.error("Cari bakiye yenileme hatası:", err)
  );
});
