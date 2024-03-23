import Run from "bun";
import fs from "fs";
import process from "process";
import { ProjectConfig } from "../project-config";

const isDevelopment = process.argv.includes("--development");

const dir = import.meta.dir;

export default function handleTestRequests(
  projectConfig: ProjectConfig,
  req: Request,
  server: Run.Server
): Response | void {
  if (new URL(req.url).pathname === "/test" && req.method === "GET") {
    let content = fs.readFileSync(dir + "/.index.html", "utf8");
    const scripts = projectConfig.testEntryPoints ? projectConfig.testFiles
          .map((src: string) => `<script defer src="${src}"></script>`)
          .join("\n") : "";
    content = content.replace(
            "<!-- scripts -->", scripts + "\r\n<!-- scripts -->"); 
    if (isDevelopment) {
      content = content.replace(
        "<!-- dev-server-client -->",
        `<script defer src="/scripts/devserver/client.js"></script>`
      );
    }
    return new Response(content.toString(), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }
}
