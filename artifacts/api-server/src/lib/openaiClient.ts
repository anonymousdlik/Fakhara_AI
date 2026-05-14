import { openai as integrationOpenai } from "@workspace/integrations-openai-ai-server";
import OpenAI from "openai";

const userApiKey = process.env.OPENAI_API_KEY;

export const openai: OpenAI = userApiKey
  ? new OpenAI({ apiKey: userApiKey })
  : integrationOpenai;

export const openaiSource: "user" | "replit-integration" = userApiKey
  ? "user"
  : "replit-integration";

if (userApiKey) {
  console.log("[openai] Using user-provided OPENAI_API_KEY (direct)");
} else {
  console.log("[openai] Using Replit AI Integrations proxy");
}
