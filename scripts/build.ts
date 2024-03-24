import Run from "bun";
import fs from "fs";
import { rm } from "fs/promises";
import path from "path";
import { Console } from "console";
import process from "process";
import { buildCssFile } from "./build-css-file";
import { projectConfig, ProjectConfig } from "./project-config";
import chokidar from "chokidar";
import { debounce } from "./helpers";
import handleApiRequests from "./api/index";
import handleTestRequests from "./test/index";
import v8toIstanbul from "v8-to-istanbul";
import { chromium, webkit, firefox } from "playwright-core";
import { buildJsEntrypoints } from "./build-js-entrypoints";
import handleIndexRequests from "./devserver";

const doCoverage = false; // bun problems with external sourcemaps

const console = new Console(process.stdout, process.stderr);
const isProduction = process.argv.includes("--production");
const isTest = process.argv.includes("--test");
const isDevelopment = process.argv.includes("--development");
const isTestDevelopment = isTest && isDevelopment;
let connnectedSockets: Run.ServerWebSocket<unknown>[] | undefined;

await rm("dist", { recursive: true, force: true });
fs.mkdirSync(path.join(projectConfig.projectRootDir, "dist"), {
  recursive: true,
});

let watcher: fs.FSWatcher | undefined;

if (isDevelopment || isTestDevelopment || isTest) {
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
    connnectedSockets?.forEach((ws) => ws.send("reload"));
  }, 300);

  if (isDevelopment || isTestDevelopment) {
    watcher = chokidar
      .watch([path.join(projectConfig.projectRootDir, "./src")], {
        usePolling: true,
      })
      .on("all", watchAllCallback);
  }
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
        if (!isError && pathname.endsWith(".html")) {
          const decoder = new TextDecoder();
          let stringContent = decoder.decode(content);
          stringContent = stringContent.replace(
            "</head>",
            `<script defer src="/scripts/devserver/client.js"></script></head>`
          );
          return new Response(stringContent, {
            headers: { "Content-Type": "text/html" },
          });
        }

        const r = isError ? null : new Response(content);
        if (r instanceof Response) {
          return new Response(f);
        }
      }
      response = await handleIndexRequests(req, server);
      if (response) {
        return response;
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
      message() { },
      open(ws) {
        connnectedSockets?.push(ws);
      },
      close(ws) {
        connnectedSockets?.splice(connnectedSockets.indexOf(ws), 1);
      },
    },
  });
  log(`Server started on http://localhost:${projectConfig.devServer.port}`);
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

  buildJsEntrypoints(log, projectConfig, isProduction, entrypoints);
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

async function start() {
  await Promise.all([build(projectConfig), preprocessCss(projectConfig)]);
  openTestPage(projectConfig);
}

async function openTestPage(projectConfig: ProjectConfig) {
  if (isTest || isTestDevelopment) {
    log("open test page");
    let xunit = "";
    const browserPath = fs.existsSync(projectConfig.browserPath || "")
      ? projectConfig.browserPath
      : undefined;
    const browser = { chromium, webkit, firefox }[projectConfig.browser];
    const browserInstance = await browser.launch({
      executablePath: browserPath,
      headless: isTest && !isTestDevelopment ? true : false,
      devtools: isTestDevelopment ? true : false,
    });

    const page = await browserInstance.newPage();
    if (isTest) {
      page.on("console", async (msg) => {
        const txt = msg.text();
        // mocha test end
        if (txt === "END_PASSED" && !isTestDevelopment) {
          if (doCoverage) {
            const coverage = (await page.coverage.stopJSCoverage())
              .filter((entry) => {
                return entry.url.includes(".spec");
              })
              .map((entry) => {
                return entry;
              });
            const entries: any = {};
            for (const entry of coverage) {
              const converter = v8toIstanbul(entry.url, 0, {
                source: entry.source ? entry.source : "",
              });
              await converter.load();
              converter.applyCoverage(entry.functions);
              const istanbul = converter.toIstanbul();
              for (const key in istanbul) {
                const np = path.join(
                  projectConfig.projectRootDir,
                  key.split(`:${projectConfig.devServer.port}`, 2)[1]
                );
                if (np.includes(".spec.") === false) {
                  istanbul[key].path = np;
                  entries[np] = istanbul[key];
                }
              }
            }
            fs.mkdirSync(`./.nyc_output`, { recursive: true });
            fs.writeFileSync(
              `./.nyc_output/coverage-pw.json`,
              JSON.stringify(entries)
            );
            log("Reporting complete");
          }
          fs.writeFileSync(`./TESTS-xunit.xml`, xunit);
          await browserInstance.close();
          log("Test complete");
          process.exit(0);
        } else if (txt === "END_FAILED" && !isTestDevelopment) {
          log("Test failed");
          process.exit(1);
        } else if (txt === "END_INCOMPLETE" && !isTestDevelopment) {
          log("Test incomplete");
          process.exit(0);
        } else if (txt.startsWith("REPORT ")) {
          xunit = txt.split("REPORT ", 2)[1];
        } else {
          if (txt.startsWith("END_")) {
            return;
          }
          console.log(txt);
        }
      });
      await page.coverage.startJSCoverage();
    }
    await page
      .goto(`http://localhost:${projectConfig.devServer.port}/test`)
      .catch((e) => {
        console.info(e);
      });
  }
}

start();
