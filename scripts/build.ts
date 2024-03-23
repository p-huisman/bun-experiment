import Run from "bun";
import fs from "fs";
import path from "path";
import { postcssPlugin } from "./postcss-plugin";
import { Console } from "console";
import process from "process";
import { buildCssFile } from "./build-css-file";
import { projectConfig, ProjectConfig } from "./project-config";
import chokidar from "chokidar";
import { debounce } from "./helpers";
import handleApiRequests from "./api/index";;
import handleTestRequests from "./test/index";;

const console = new Console(process.stdout, process.stderr);
const isProduction = process.argv.includes("--production");
const isTest = process.argv.includes("--test");
const isDevelopment = process.argv.includes("--development");
const isTestDevelopment = isTest && isDevelopment;
let connnectedSockets: Run.ServerWebSocket<unknown>[] | undefined;

let watcher: fs.FSWatcher | undefined;

if (isDevelopment || isTestDevelopment) {
  connnectedSockets = [];
  const watchAllCallback = debounce(async (event: string, name: string) => {
    const index = projectConfig?.cssFiles?.findIndex(
      (file) => file.src === name
    );
    if (index !== -1) {
      await buildCssFile(
        projectConfig,
        log,
        name,
        projectConfig.cssFiles[index].target
      );
    } else {
      await build(projectConfig);
    }
    connnectedSockets.forEach((ws) => ws.send("reload"));
  }, 300);

  watcher = chokidar
    .watch([path.join(projectConfig.projectRootDir, "./src")], {
      usePolling: true,
    })
    .on("all", watchAllCallback);
  Bun.serve({
    port: projectConfig.devServer.port,
    fetch: async (req, server) => {
      const success = server.upgrade(req);
      if (success) {
        return undefined;
      }
      let response = handleTestRequests(projectConfig, req, server);
      if (response) {
        return response;
      }
      response = handleApiRequests(req, server);
      if (response) {
        return response;
      }
      let { pathname } = new URL(req.url);
      if (pathname.startsWith(".")) {
        return new Response("Not found", { status: 404 });
      }
      if (pathname.endsWith("/")) {
        pathname = pathname + "index.html";
      }

      const f = Bun.file(`.${pathname}`);
      if (f) {
        const content = await f.arrayBuffer().catch((e) => e);
        const isError = content instanceof Error;
        if (!isError && pathname.endsWith(".html") ) {
          const decoder = new TextDecoder();
          let stringContent = decoder.decode(content);
          stringContent = stringContent.replace("</head>", `<script defer src="/scripts/devserver/client.js"></script></head>`);
          return new Response(stringContent, { headers: { "Content-Type": "text/html" } });
        }
        
        const r = isError ? null : new Response(content);
        if (r instanceof Response) {
          return new Response(f);
        }
      }
      return new Response("Not found", { status: 404 });
    },
    error(e) {
      if (e.message === "No such file or directory") {
        return new Response("Not found", { status: 404 });
      }
      return new Response("Error", { status: 500 });
    },
    websocket: {
      message() {},
      open(ws) {
        connnectedSockets.push(ws);
      },
      close(ws) {
        connnectedSockets.splice(connnectedSockets.indexOf(ws), 1);
      },
    },
  });
}

process.on("SIGINT", () => {
  log(" closing...");
  watcher?.close();
  connnectedSockets?.forEach((ws) => ws.send("close"));
  process.exit(0);
});

async function build(projectConfig: ProjectConfig): Promise<void> {
  const entrypoints =
    isTest || isTestDevelopment
      ? projectConfig.testEntryPoints.map((entry: string) =>
          path.join(projectConfig.projectRootDir, entry)
        )
      : projectConfig.entryPoints.map((entry: string) =>
          path.join(projectConfig.projectRootDir, entry)
        );

  log("build started");
  const result = Run.build({
    entrypoints,
    outdir: projectConfig.dist,
    target: "browser",
    format: "esm",
    minify: !isProduction,
    sourcemap: isProduction ? "none" : "inline",
    plugins: [postcssPlugin],
  }).catch((e) => e);
  if (result instanceof Error) {
    console.error(result);
    return Promise.reject(result);
  }
  log("build complete");
}

const preprocessCss = (projectConfig: ProjectConfig): Promise<any> => {
  if (!projectConfig.cssFiles) {
    return Promise.resolve();
  }
  const promises: Promise<void>[] = [];
  projectConfig.cssFiles.forEach(async (file) => {
    promises.push(buildCssFile(projectConfig, log, file.src, file.target));
  });

  return Promise.all(promises);
};

function log(message: string) {
  console.log(
    `[${new Date().toISOString().split("T")[1].split("Z")[0]}] ${message}`
  );
}

build(projectConfig);
preprocessCss(projectConfig);

const chromiumPath = fs.existsSync(projectConfig.chromiumPath)
  ? projectConfig.chromiumPath
  : undefined;

