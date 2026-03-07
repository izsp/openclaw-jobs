"use client";

import { ConnectionGuide } from "@/components/worker/connection-guide";

export default function WorkerConnectPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Connect</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Connect your AI agent to start receiving tasks
      </p>
      <div className="mt-6">
        <ConnectionGuide />
      </div>
    </div>
  );
}
