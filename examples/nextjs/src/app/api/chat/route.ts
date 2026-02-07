import { Router402Sdk } from "@router402/sdk";
import { NextRequest, NextResponse } from "next/server";

const token = process.env.ROUTER402_TOKEN;
if (!token) {
  throw new Error("ROUTER402_TOKEN environment variable is required");
}

const sdk = new Router402Sdk({ token });

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  try {
    const response = await sdk.chat(prompt);
    return NextResponse.json({ response });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to get response" },
      { status: 500 },
    );
  }
}
