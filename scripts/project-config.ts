import fs from "fs";
import path from "path";
import process from "process";

const projectRootDir = process.cwd();

const config = JSON.parse(
  fs.readFileSync(path.join(projectRootDir, "config.json")).toString(),
);

let prConfig: ProjectConfig = {
  projectRootDir,
  devServer: {
    port: 9090,
  },
  ...config,
};

if (prConfig.cssFiles) {
  prConfig.cssFiles = config.cssFiles.map((file:{src: string; target: string}) => {
    return {
      src: path.join(prConfig.projectRootDir, file.src),
      target: path.join(prConfig.projectRootDir, prConfig.dist, file.target),
    };
  });
}

export const projectConfig = prConfig;

export interface ProjectConfig {
  projectRootDir: string;
  entryPoints: string[];
  testEntryPoints: string[];
  cssFiles?: {src: string; target: string}[];
  chromiumPath?: string;
  devServer: {
    port: number;
  };
  dist: string;
  target: "browser";
  testFiles: string[];
}