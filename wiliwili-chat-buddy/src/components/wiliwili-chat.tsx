import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Mic, MicOff, Send, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  type WiliConversation,
  type WiliMessage,
  getUserId,
  loadConversations,
  newConversation,
  newMessage,
  saveConversations,
} from "@/lib/wiliwili-storage";
import { askWiliwili } from "@/lib/wiliwili-api";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WiliwiliLogo } from "@/components/wiliwili-logo";
import { cn } from "@/lib/utils";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function WiliwiliChat({ conversationId }: { conversationId: string }) {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [conversations, setConversations] = useState<WiliConversation[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Bootstrap user + conversations
  useEffect(() => {
    setUserId(getUserId());
    setConversations(loadConversations());
  }, []);

  const active = conversations.find((c) => c.id === conversationId);

  // If conversation not found, ensure one exists
  useEffect(() => {
    if (!userId) return;
    if (!active && conversations.length >= 0) {
      const exists = conversations.some((c) => c.id === conversationId);
      if (!exists) {
        const conv: WiliConversation = {
          id: conversationId,
          title: "Nouvelle conversation",
          updatedAt: Date.now(),
          messages: [],
        };
        const next = [conv, ...conversations];
        setConversations(next);
        saveConversations(next);
      }
    }
  }, [userId, active, conversations, conversationId]);

  // Focus textarea
  useEffect(() => {
    textareaRef.current?.focus();
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.messages.length, loading]);

  const persist = (updater: (prev: WiliConversation[]) => WiliConversation[]) => {
    setConversations((prev) => {
      const next = updater(prev);
      saveConversations(next);
      return next;
    });
  };

  const handleNewConversation = () => {
    const conv = newConversation();
    persist((prev) => [conv, ...prev]);
    navigate({ to: "/c/$conversationId", params: { conversationId: conv.id } });
  };

  const handleSelect = (id: string) => {
    if (id === conversationId) return;
    navigate({ to: "/c/$conversationId", params: { conversationId: id } });
  };

  const handleDelete = (id: string) => {
    persist((prev) => prev.filter((c) => c.id !== id));
    if (id === conversationId) {
      const remaining = conversations.filter((c) => c.id !== id);
      if (remaining.length > 0) {
        navigate({ to: "/c/$conversationId", params: { conversationId: remaining[0].id } });
      } else {
        const conv = newConversation();
        persist((prev) => [conv, ...prev.filter((c) => c.id !== id)]);
        navigate({ to: "/c/$conversationId", params: { conversationId: conv.id } });
      }
    }
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading || !userId) return;
    setInput("");

    const userMsg = newMessage("user", trimmed);
    persist((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              title:
                c.messages.length === 0
                  ? trimmed.slice(0, 40) + (trimmed.length > 40 ? "…" : "")
                  : c.title,
              updatedAt: Date.now(),
              messages: [...c.messages, userMsg],
            }
          : c
      )
    );

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const answer = await askWiliwili({
        user_id: userId,
        conversation_id: conversationId,
        question: trimmed,
        signal: controller.signal,
      });
      const botMsg = newMessage("assistant", answer || "(respuesta vacía)");
      persist((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, updatedAt: Date.now(), messages: [...c.messages, botMsg] }
            : c
        )
      );
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast.error("Impossible de se connecter à wiliwili", {
          description: err?.message ?? "Vérifiez que l'API est disponible.",
        });
        const errMsg = newMessage(
          "assistant",
          "⚠️ Impossible de contacter le serveur. Veuillez réessayer."
        );
        persist((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? { ...c, updatedAt: Date.now(), messages: [...c.messages, errMsg] }
              : c
          )
        );
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  const { listening, supported, toggle } = useVoiceInput({
    lang: "es-ES",
    onResult: (text) => {
      setInput((prev) => (prev ? prev + " " + text : text));
      requestAnimationFrame(() => textareaRef.current?.focus());
    },
  });

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  const messages: WiliMessage[] = active?.messages ?? [];

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
          <WiliwiliLogo size={28} withText />
        </div>
        <div className="p-3">
          <Button
            onClick={handleNewConversation}
            className="bg-gradient-brand hover:opacity-90 shadow-brand w-full font-semibold text-white"
          >
            + Nouvelle conversation
          </Button>
        </div>
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 pb-4">
            {sorted.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "group flex items-center gap-1 rounded-lg px-2",
                  c.id === conversationId
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/60"
                )}
              >
                <button
                  onClick={() => handleSelect(c.id)}
                  className="min-w-0 flex-1 truncate py-2 text-left text-sm"
                  title={c.title}
                >
                  {c.title}
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-muted-foreground hover:text-destructive rounded p-1 opacity-0 transition group-hover:opacity-100"
                  aria-label="Supprimer la conversation"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="border-sidebar-border text-muted-foreground border-t px-4 py-3 text-xs">
          <div className="truncate">ID: {userId || "—"}</div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/80 flex items-center justify-between border-b px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center gap-3 md:hidden">
            <WiliwiliLogo size={28} withText />
          </div>
          <div className="hidden md:block">
            <h1 className="truncate text-base font-semibold">
              {active?.title ?? "Conversation"}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewConversation}
            className="md:hidden"
          >
            + Nouvelle
          </Button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6">
            {messages.length === 0 ? (
              <EmptyState onPick={(q) => sendMessage(q)} />
            ) : (
              <div className="space-y-6">
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
                {loading && (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    wiliwili pense…
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t bg-background/80 backdrop-blur">
          <div className="mx-auto w-full max-w-3xl p-3 md:p-4">
            <div className="bg-card shadow-soft flex items-end gap-2 rounded-2xl border p-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ecrivez ou utilisez le microphone"
                rows={1}
                className="max-h-40 min-h-[44px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
              <Button
                type="button"
                size="icon"
                variant={listening ? "default" : "ghost"}
                onClick={toggle}
                disabled={!supported}
                title={
                  supported
                    ? listening
                      ? "Detener grabación"
                      : "Hablar"
                    : "La voix n'est pas prise en charge par ce navigateur."
                }
                className={cn(
                  "rounded-full",
                  listening && "bg-destructive hover:bg-destructive/90 text-white"
                )}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              {loading ? (
                <Button
                  type="button"
                  size="icon"
                  onClick={stop}
                  className="bg-destructive hover:bg-destructive/90 rounded-full text-white"
                >
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="icon"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim()}
                  className="bg-gradient-brand shadow-brand rounded-full text-white hover:opacity-90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-muted-foreground mt-2 text-center text-xs">
              Wiliwili peut faire des erreurs. Vérifiez les informations importantes.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function MessageBubble({ message }: { message: WiliMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="bg-gradient-brand shadow-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
          w
        </div>
      )}
      <div className={cn("flex max-w-[80%] flex-col gap-1", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words",
            isUser
              ? "bg-gradient-brand shadow-brand rounded-br-sm text-white"
              : "bg-muted text-foreground rounded-bl-sm"
          )}
        >
          {message.content}
        </div>
        <span className="text-muted-foreground px-1 text-[10px]">
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  const suggestions = [
    "Comment puis-je installer le VPN de l'UPHF ? ",
    "Quelles sont les bonnes pratiques pour un mot de passe sécurisé ?",
    "Que faire en cas de suspicion de compromission de mon compte UPHF ?",
    "c'est quoi le wifi eduroam et comment y accéder ?",
  ];
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <WiliwiliLogo size={80} />
      <h2 className="mt-4 text-3xl font-bold tracking-tight">
        Hello, je suis <span className="text-gradient-brand">wiliwili</span>
      </h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">
        Votre assistant IA. Envoyez-moi un message ou parlez-moi, et je répondrai instantanément à vos questions.
      </p>
      <div className="mt-8 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="bg-card hover:border-primary/40 hover:shadow-soft rounded-xl border p-3 text-left text-sm transition"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
