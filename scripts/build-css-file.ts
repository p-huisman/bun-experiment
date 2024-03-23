import fs from "fs";
import postcss from "postcss";
import { postcssConfig } from "./postcss-config";
import { ProjectConfig } from "./project-config";

export async function buildCssFile(projectConfig: ProjectConfig, log: (message: string)=> void, src: string, target: string): Promise<void> {
  return new Promise((resolve) => {
    log(`Process css ${src.replace(projectConfig.projectRootDir, "")} start`);
    fs.readFile(src, (err, css) => {
      if (err) {
        console.error(`error reading css file ${src} ${err.message}`);
        process.exit(1);
      }
      postcss(postcssConfig.plugins)
        .process(css, {from: src, to: target})
        .then((result) => {
          fs.writeFileSync(target, result.css);
        })
        .catch((e) => {
          console.error(`Error processing css ${src.replace(projectConfig.projectRootDir, "")} ${e.message}`);
          process.exit(1);
        })
        .finally(() => {
          log(`Process css ${src.replace(projectConfig.projectRootDir, "")} complete`);
          resolve();
        });
    });
  });
}