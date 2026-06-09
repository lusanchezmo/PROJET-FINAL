export const WILIWILI_API_URL =
  (typeof window !== "undefined" && (window as any).__WILIWILI_API_URL) ||
  "http://localhost:8000/api/v1/chat/stored";

export async function askWiliwili(params: {
  user_id: string;
  conversation_id: string;
  question: string;
  signal?: AbortSignal;
}): Promise<string> {
  const res = await fetch(WILIWILI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: params.user_id,
      conversation_id: params.conversation_id,
      question: params.question,
    }),
    signal: params.signal,
  });
  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const data = await res.json();
    return (
      data.answer ??
      data.response ??
      data.message ??
      data.content ??
      data.text ??
      (typeof data === "string" ? data : JSON.stringify(data))
    );
  }
  return await res.text();
}
