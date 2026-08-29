"use client";

import React, { useEffect, useState, useRef } from "react";
import { FixedSizeList as List } from "react-window";

interface VirtualizedGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  gap?: number;
  className?: string;
  breakpoints?: { sm?: number; md?: number; lg?: number; xl?: number };
}

interface RowData {
  items: any[];
  dimensions: { width: number; height: number; columns: number };
  renderItem: (item: any, index: number) => React.ReactNode;
  gap: number;
}

const Row = React.memo(({ index, style, data }: { index: number; style: React.CSSProperties; data: RowData }) => {
  const { items, dimensions, renderItem, gap } = data;
  const fromIndex = index * dimensions.columns;
  const toIndex = Math.min(fromIndex + dimensions.columns, items.length);
  const rowItems = items.slice(fromIndex, toIndex);

  return (
    <div style={{ ...style, display: "flex", gap: `${gap}px`, paddingBottom: `${gap}px` }}>
      {rowItems.map((item, i) => (
        <div key={fromIndex + i} style={{ flex: 1, minWidth: 0 }}>
          {renderItem(item, fromIndex + i)}
        </div>
      ))}
      {/* Placeholder para manter alinhamento se a última linha não estiver cheia */}
      {Array.from({ length: dimensions.columns - rowItems.length }).map((_, i) => (
        <div key={`empty-${i}`} style={{ flex: 1 }} />
      ))}
    </div>
  );
});

export function VirtualizedGrid<T>({
  items,
  renderItem,
  itemHeight,
  gap = 12,
  className = "",
  breakpoints = { sm: 2, xl: 3 },
}: VirtualizedGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, columns: 1 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = containerRef.current.offsetHeight;
        let columns = 1;
        
        if (width >= 1280 && breakpoints.xl) columns = breakpoints.xl;
        else if (width >= 1024 && breakpoints.lg) columns = breakpoints.lg;
        else if (width >= 768 && breakpoints.md) columns = breakpoints.md;
        else if (width >= 640 && breakpoints.sm) columns = breakpoints.sm;

        setDimensions({ width, height, columns });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [breakpoints]);

  const rowCount = Math.ceil(items.length / dimensions.columns);
  
  const itemData = React.useMemo<RowData>(() => ({
    items,
    dimensions,
    renderItem,
    gap
  }), [items, dimensions, renderItem, gap]);

  if (dimensions.height === 0) {
    return <div ref={containerRef} className={`w-full h-full ${className}`} />;
  }

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      <List
        height={dimensions.height}
        itemCount={rowCount}
        itemSize={itemHeight + gap}
        width={dimensions.width}
        itemData={itemData}
      >
        {Row}
      </List>
    </div>
  );
}
