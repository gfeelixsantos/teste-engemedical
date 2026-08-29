import { NextResponse } from "next/server";

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache: Record<string, CacheEntry> = {};
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") || "Rio Claro,SP";

  // Tratar o nome para formatar corretamente para a API do HG Weather
  let cityNameQuery = "Rio Claro,SP";
  if (city.toUpperCase().includes("CORDEIR")) {
    cityNameQuery = "Cordeirópolis,SP";
  } else if (city.toUpperCase().includes("ARARAS")) {
    cityNameQuery = "Araras,SP";
  }

  const cacheKey = cityNameQuery.toLowerCase();
  const cached = cache[cacheKey];

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json(cached.data);
  }

  try {
    const key = "fc59965e";
    const res = await fetch(
      `https://api.hgbrasil.com/weather?key=${key}&city_name=${encodeURIComponent(cityNameQuery)}`
    );
    if (!res.ok) throw new Error("Erro ao consultar HG Brasil");
    
    const data = await res.json();
    
    // Armazena no cache se a resposta for válida
    if (data && data.results) {
      cache[cacheKey] = {
        data,
        timestamp: Date.now(),
      };
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Erro ao buscar clima:", err);
    return NextResponse.json({ error: "Erro ao buscar clima" }, { status: 500 });
  }
}
