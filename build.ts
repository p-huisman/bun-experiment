import type { BunPlugin } from "bun";

import Run from "bun";
import { watch } from "fs";
import postcss from "postcss";

const postcssPlugin: BunPlugin = {
  name: "Postcss loader",
  setup(build: Run.PluginBuilder) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      let contents = await Bun.file(args.path).text();
      contents = await postcss([
        require("postcss-preset-env")({
          grid: true,
        }),
      ]).process(contents, { from: undefined }).css;
      return { loader: "text", contents };
    });
  },
};

const connnectedSockets: Run.ServerWebSocket<unknown>[] = [];

const build = () => {
  Run.build({
    entrypoints: ["./src/dummy-component.tsx"],
    outdir: "./dist",
    format: "esm",
    minify: true,
    sourcemap: "external",
    plugins: [postcssPlugin],
  })
    .then(() => console.log("build"))
    .catch((err) => console.error(err));
};
build();

const watcher = watch("./src", () => {
  build();
  connnectedSockets.forEach((ws) => ws.send("reload"));
});

process.on("SIGINT", () => {
  console.log(" closing...");
  watcher.close();
  connnectedSockets.forEach((ws) => ws.send("close"));
  process.exit(0);
});
Bun.serve(
  { 
    port: 9090, 
    fetch: async (req, server) => {
      const success = server.upgrade(req);
      if (success) {
        console.log("upgrade");
        return undefined;
      }
      let  { pathname } = new URL(req.url);
      if (pathname.startsWith(".")) {
        return new Response("Not found", { status: 404 });  
      }
      if(pathname.endsWith("/")) {
        pathname = pathname + "index.html";
      }
      const f = Bun.file(`.${pathname}`);
      if (f) {
        const r = new Response(await f.arrayBuffer().catch(e => e));
        if (r instanceof Response) {
          return new Response(f);
        }
      }
      return new Response("Not found", { status: 404 });
    },
    error(e) {
      if(e.message === "No such file or directory"){
        return new Response("Not found", { status: 404 });
      }
      return new Response("Error§", { status: 500 });
    },
    websocket: {
      message() {
      },
      open(ws) {
        connnectedSockets.push(ws);
      }, 
      close(ws) {
        connnectedSockets.splice(connnectedSockets.indexOf(ws), 1);
      }
    },
  }
);