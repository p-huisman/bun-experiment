import Run from "bun";

export default function handleApiRequests(
  req: Request,
  server: Run.Server
): Response | void {
  if (
    new URL(req.url).pathname.startsWith("/api/greet") &&
    req.method === "GET"
  ) {
    return new Response(JSON.stringify({ message: "hi" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
