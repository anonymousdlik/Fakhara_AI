import { Router } from "express";
import { runAgentChat } from "../services/agentChat";

const router = Router();

router.post("/businesses/:id/agent/chat", async (req, res) => {
  try {
    const businessId = Number(req.params["id"]);
    if (!Number.isFinite(businessId)) {
      return res.status(400).json({ error: "ID bisnis tidak valid" });
    }

    const { message, history } = req.body as {
      message: string;
      history?: { role: "user" | "assistant"; content: string }[];
    };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Pesan tidak boleh kosong" });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (h) =>
              h &&
              (h.role === "user" || h.role === "assistant") &&
              typeof h.content === "string",
          )
          .slice(-10)
      : [];

    const result = await runAgentChat(businessId, message.trim(), safeHistory);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      error: "Agen AI gagal merespons",
      detail: String(err),
    });
  }
});

export default router;
