"use client";

import { Skeleton } from "@heroui/react";

export function CampaignListSkeleton() {
  return (
    <div className="w-full flex flex-col gap-4 mt-2">
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      <div className="border border-default-200 rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="bg-default-100 p-4 border-b border-default-200 grid grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={`header-${i}`} className="h-4 w-20 rounded-md" />
          ))}
        </div>

        {/* Table Rows */}
        {[1, 2, 3, 4].map((row) => (
          <div key={`row-${row}`} className="p-4 border-b border-default-100 grid grid-cols-6 gap-4 items-center">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-3 w-32 rounded-md" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
