import Run from "bun";
import { postcssPlugin } from "./postcss-plugin";
import { ProjectConfig } from "./project-config";

export const buildJsEntrypoints = async (
  log: (m: string) => void,
  projectConfig: ProjectConfig,
  isProduction: boolean,
  entrypoints: string[]
) => {
  log("build started");
  const result = Run.build({
    entrypoints,
    outdir: projectConfig.dist,
    target: projectConfig.target,
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
  return result;
};
