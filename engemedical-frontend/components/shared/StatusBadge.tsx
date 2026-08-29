"use client";

import React from "react";
import { Chip } from "@heroui/react";

export type StatusColor = "green" | "yellow" | "gray" | "red";

export interface StatusBadgeProps {
  label: string;
  color: StatusColor;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const colorStyles: Record<
  StatusColor,
  { bg: string; dot: string; text: string }
> = {
  green: {
    bg: "bg-transparent",
    dot: "bg-[#22c55e]",
    text: "text-[#16a34a] font-extrabold",
  },
  yellow: {
    bg: "bg-transparent",
    dot: "bg-amber-500",
    text: "text-amber-600 font-extrabold",
  },
  red: {
    bg: "bg-transparent",
    dot: "bg-red-500",
    text: "text-red-600 font-extrabold"
  },
  gray: {
    bg: "bg-transparent",
    dot: "bg-red-500",
    text: "text-red-600 font-extrabold"
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  color,
  icon,
  onClick,
  className = "",
}) => {
  const styles = colorStyles[color];
  const isClickable = !!onClick;

  return (
    <Chip
      className={`font-semibold text-sm px-3 py-1 rounded-full shadow-sm transition-all ${styles.bg} ${styles.text} ${
        isClickable ? "cursor-pointer hover:opacity-80 active:scale-95" : ""
      } ${className}`}
      size="sm"
      variant="flat"
      onClick={isClickable ? onClick : undefined}
    >
      <span className="flex w-full items-center justify-center gap-1.5">
        {icon || <span className={`w-2 h-2 rounded-full ${styles.dot}`} />}
        {label}
      </span>
    </Chip>
  );
};
