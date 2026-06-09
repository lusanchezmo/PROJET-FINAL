import { createFileRoute } from "@tanstack/react-router";
import { WiliwiliChat } from "@/components/wiliwili-chat";

export const Route = createFileRoute("/c/$conversationId")({
  head: ({ params }) => ({
    meta: [
      { title: `wiliwili — conversación` },
      { name: "description", content: "Conversación con wiliwili, tu asistente con IA." },
    ],
  }),
  component: ChatRoute,
});

function ChatRoute() {
  const { conversationId } = Route.useParams();
  return <WiliwiliChat key={conversationId} conversationId={conversationId} />;
}
