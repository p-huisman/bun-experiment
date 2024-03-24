import Run from "bun";
import fs from "fs";
import path from "path";
import process from "process";
import { ProjectConfig } from "../project-config";

const isDevelopment = process.argv.includes("--development");
const isTest = process.argv.includes("--test");

const dir = import.meta.dir;

export default function handleTestRequests(
  projectConfig: ProjectConfig,
  req: Request,
  server: Run.Server
): Response | void {
  if (new URL(req.url).pathname === "/test" && req.method === "GET") {
    let content = fs.readFileSync(dir + "/.index.html", "utf8");

    const testScripts = getTestEntrypoints(projectConfig);

    const scripts = projectConfig.testEntryPoints ? projectConfig.testFiles
          .map((src: string) => `<script defer src="${src}"></script>`)
          .join("\n") : "";
    content = content.replace(
            "<!-- scripts -->", scripts + testScripts 
            + "\r\n<!-- scripts -->"); 
    if (isDevelopment) {
      content = content.replace(
        "<!-- dev-server-client -->",
        `<script defer src="/scripts/devserver/client.js"></script>`
      );
    }
    if (isTest && !isDevelopment) {
      content = content
        .replace(
          "/* onEnd */",
          `console.log("END_" + info.overallStatus.toUpperCase());`,
        )
        .replace(
          "/* addReporter */",
          `jasmine.getEnv().addReporter(junitReporter);`,
        );
    }
    return new Response(content.toString(), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }
}

function getTestEntrypoints(projectConfig: ProjectConfig): string {
  return projectConfig.testEntryPoints.map((entry: string) =>
  `<script type="module" src="/${path.join(projectConfig.dist, path.parse(entry).name).replaceAll("\\", "/")}.js"></script>`
  ).join("\n");
}