"use client";

import { useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setResponse(data.response ?? data.error);
    } catch {
      setResponse("Failed to fetch response");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 600, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>Router402 Chat</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask something..."
          style={{ width: "100%", padding: "0.5rem", fontSize: "1rem" }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ marginTop: "0.5rem", padding: "0.5rem 1rem" }}
        >
          {loading ? "Thinking..." : "Send"}
        </button>
      </form>
      {response && (
        <pre
          style={{
            marginTop: "1rem",
            whiteSpace: "pre-wrap",
            background: "#f5f5f5",
            padding: "1rem",
            borderRadius: "4px",
          }}
        >
          {response}
        </pre>
      )}
    </main>
  );
}
