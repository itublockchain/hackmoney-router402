import "dotenv/config";
import { Router402Sdk } from "@router402/sdk";
import express from "express";

const app = express();
app.use(express.json());

const token = process.env.ROUTER402_TOKEN;
if (!token) {
  console.error("ROUTER402_TOKEN environment variable is required");
  process.exit(1);
}

const sdk = new Router402Sdk({ token });

app.post("/chat", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  try {
    const response = await sdk.chat(prompt);
    res.json({ response });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to get response" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
