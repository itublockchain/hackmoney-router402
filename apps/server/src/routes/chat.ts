import { logger } from "@router402/utils";
import type { Request, Response } from "express";
import { Router as ExpressRouter, type Router } from "express";

export const chatRouter: Router = ExpressRouter();

const chatLogger = logger.context("Chat");

const MOCK_RESPONSE =
  "This is a **mock response** from the Route402 server.\n\n" +
  "The chat endpoint is working correctly. Here are a few things I can confirm:\n\n" +
  "1. Your request was received and parsed successfully\n" +
  "2. SSE streaming is functioning as expected\n" +
  "3. The message format matches the OpenAI-compatible schema\n\n" +
  "Once the production API is connected, this mock will be replaced with real AI responses.";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

chatRouter.post("/", async (req: Request, res: Response) => {
  const { messages, stream } = req.body;

  chatLogger.info(
    `Chat completion request: ${messages?.length ?? 0} messages, stream=${stream}`
  );

  if (!stream) {
    res.json({
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: MOCK_RESPONSE },
          finish_reason: "stop",
        },
      ],
    });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const words = MOCK_RESPONSE.split(/(\s+)/);

  for (const word of words) {
    const chunk = JSON.stringify({
      choices: [{ index: 0, delta: { content: word } }],
    });
    res.write(`data: ${chunk}\n\n`);
    await sleep(30 + Math.random() * 40);
  }

  res.write("data: [DONE]\n\n");
  res.end();
});
