"use client";

import { useSession } from "next-auth/react";
import { ConversationList } from "@/components/dashboard/conversation-list";
import { listConversations } from "@/lib/chat/chat-storage";

export default function TasksPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;
  const conversations = userId ? listConversations(userId) : [];

  function handleSelect(id: string) {
    window.location.href = `/chat?id=${encodeURIComponent(id)}`;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Tasks</h1>
      <p className="mt-1 text-sm text-content-tertiary">Your complete task history</p>
      <div className="mt-6">
        <ConversationList
          conversations={conversations}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}
