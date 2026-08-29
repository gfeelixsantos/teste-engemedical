import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Engemedical Connect - Visualizador",
  },
};

export default function ViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
