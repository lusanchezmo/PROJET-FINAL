import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { loadConversations, newConversation, saveConversations } from "@/lib/wiliwili-storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "wiliwili — Tu asistente con IA" },
      {
        name: "description",
        content: "wiliwili es un chatbot con IA que entiende texto y voz para responder al instante.",
      },
      { property: "og:title", content: "wiliwili — Tu asistente con IA" },
      {
        property: "og:description",
        content: "Chatea por texto o voz con wiliwili, tu asistente con IA.",
      },
    ],
  }),
  component: IndexBootstrap,
});

function IndexBootstrap() {
  const navigate = useNavigate();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = loadConversations();
    let target = existing[0];
    if (!target) {
      target = newConversation();
      saveConversations([target]);
    }
    navigate({
      to: "/c/$conversationId",
      params: { conversationId: target.id },
      replace: true,
    });
  }, [navigate]);

  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="text-muted-foreground text-sm">Cargando wiliwili…</div>
    </div>
  );
}
