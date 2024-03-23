import type { BunPlugin } from "bun";
import Run from "bun";
import {postcssConfig} from "./postcss-config";
import postcss from "postcss";

export const postcssPlugin: BunPlugin = {
  name: "Postcss loader",
  setup(build: Run.PluginBuilder) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      let contents = await Bun.file(args.path).text();
      contents = await postcss(postcssConfig.plugins).process(contents, { from: undefined }).css;
      return { loader: "text", contents };
    });
  },
};