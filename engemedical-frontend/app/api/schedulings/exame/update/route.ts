import { proxySchedulingRequest } from "@/app/api/schedulings/_identityProxy";

export async function POST(req: Request) {
  return proxySchedulingRequest(req, "schedulings/exame/update");
}
