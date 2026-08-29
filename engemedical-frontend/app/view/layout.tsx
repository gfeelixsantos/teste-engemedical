import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "CMSO360 - Visualizador",
  },
};

export default function ViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
