"use client"

import { useAppStore } from "@/lib/store";
import { Cloud, CloudOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function SyncStatus() {
  const isSynced = useAppStore((state) => state.isSynced);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 cursor-help px-3 py-1.5 rounded-full bg-background/50 border">
          <div className={`w-2 h-2 rounded-full ${isSynced ? 'bg-green-500 pulse-sync-green' : 'bg-amber-500 pulse-sync-amber'}`} />
          {isSynced ? (
            <Cloud className="w-4 h-4 text-green-600" />
          ) : (
            <CloudOff className="w-4 h-4 text-amber-600 animate-pulse" />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {isSynced ? 'Cloud Synced' : 'Local-Only (Syncing...)'}
      </TooltipContent>
    </Tooltip>
  );
}