"use client";

import React, { useState } from "react";
// Fallback icon if needed, though we use letter

const logos: Record<string, string> = {
  Syn: "https://meusyn.com.br/wp-content/uploads/2024/12/syngular.png",
  SafeID:
    "https://cdn.prod.website-files.com/672e6529985d6bf8cb78e54b/67ec28ccb8f7752e999fab23_logo-Safeweb-colorido%20(2)-p-500.png",
  SerproID:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSGyQdK03oK0CHdfWnSDpqwttMAw6pag-YT6w&s",
  RemoteID:
    "https://i0.wp.com/certisign.com.br/wp-content/uploads/2024/05/certisign.webp?fit=113%2C24&ssl=1",
  BirdID: "https://birdid.com.br/storage/2023/04/logo-bird-id-new.png",
  Vidaas:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSgez9UM82AQtaszTdKgV-g77bTYl_nd36smQ&s",
  "BRy Cloud":
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcShSv1NDG7dOH9x0XzewuF9PB2B4LK7BjKnYQ&s",
  "DS Cloud":
    "data:image/png;base64,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",
};

interface ProviderIconProps {
  name: string;
  size?: number; // Size in pixels
  className?: string;
}

export const ProviderIcon: React.FC<ProviderIconProps> = ({
  name,
  size = 40,
  className = "",
}) => {
  const [error, setError] = useState(false);
  const logoUrl = logos[name];

  // Helper to get initials or first letter
  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "?";
  };

  // If no URL found or image failed to load, show fallback
  if (!logoUrl || error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 rounded-md text-gray-500 font-bold border border-gray-200 select-none shadow-sm ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        title={name}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center bg-white rounded-md overflow-hidden border border-gray-100 shadow-sm select-none ${className}`}
      style={{ width: size, height: size }}
      title={name}
    >
      <img
        alt={`${name} logo`}
        className="w-[90%] h-[90%] object-contain block mx-auto py-1"
        src={logoUrl}
        onError={() => setError(true)}
      />
    </div>
  );
};
