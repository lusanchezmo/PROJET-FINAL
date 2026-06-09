export type WiliMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

export type WiliConversation = {
  id: string;
  title: string;
  updatedAt: number;
  messages: WiliMessage[];
};

const USER_KEY = "wiliwili:user_id";
const CONV_KEY = "wiliwili:conversations";

function rid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function getUserId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(USER_KEY);
  if (!id) {
    id = "u_" + rid();
    localStorage.setItem(USER_KEY, id);
  }
  return id;
}

export function loadConversations(): WiliConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CONV_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WiliConversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveConversations(list: WiliConversation[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONV_KEY, JSON.stringify(list));
}

export function newConversation(): WiliConversation {
  return {
    id: "c_" + rid(),
    title: " Nouvelle conversation",
    updatedAt: Date.now(),
    messages: [],
  };
}

export function newMessage(role: WiliMessage["role"], content: string): WiliMessage {
  return { id: "m_" + rid(), role, content, createdAt: Date.now() };
}
