import Run from 'bun';

import type { BunPlugin } from "bun";

const myPlugin: BunPlugin = {
  name: "Custom loader",
  setup(build) {
    build.onLoad({filter: /\.css$/}, async (args) => {
        const contents = await Bun.file(args.path).text();
        return {loader: "text", contents};
      });
  },
};

Run.build({
    entrypoints: ['./dummy-component.tsx'],
    outdir: './dist',
    format: 'esm',
    plugins: [myPlugin],
});