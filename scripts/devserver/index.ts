import Run from "bun";
import path from "path";
import fs from "fs";
import { projectConfig } from "../project-config";

import { readdir } from "node:fs/promises";

export default async function handleIndexRequests(
  req: Request,
  server: Run.Server
): Promise<Response | void> {
  if (req.method === "GET") {
    let { pathname } = new URL(req.url);
    if (pathname.startsWith(".")) {
      return new Response("Not found", { status: 404 });
    }
    if (pathname.endsWith("/")) {
      const dir = path.join(projectConfig.projectRootDir, pathname);
      const dirExists = fs.existsSync(dir);
      if (dirExists) {
        const files = await readdir(dir);
        const list = files
          .filter((file) => !file.startsWith("."))
          .sort((a, b) => a.localeCompare(b))
          .map((file) => {
            const fileInfo = fs.statSync(path.join(dir, file));
            const isDir = fileInfo.isDirectory();
            const fileDate =
              fileInfo.mtime.toLocaleDateString("en-US") +
              " " +
              fileInfo.mtime.toLocaleTimeString("en-US");
            return `<li class="${isDir ? "dir" : "file"}"><a href="${path.join(
              pathname,
              file
            )}${isDir ? "/" : ""}">
              <span class="icon"></span><span class="filename">${file}</span>
              </a>
              <span class="filedate">${fileDate}</span>
            </li>`;
          })
          .join("");

        return new Response(
          `<html>
              <head>
                <title>${pathname}</title>
                <style>
                  body {
                    font-family: sans-serif;
                    font-size: 16px;
                  }
                  ul {
                    list-style: none;
                    padding: 0;  
                  }
                  li {
                    padding: 5px;
                    display: flex;
                    gap: 10px;
                    flex-wrap: nowrap;
                    justify-content: space-between;
                    align-items: center;
                  }
                  li a {
                    display: flex;
                    align-items: center;
                  }
                  li a .icon {
                    display: block;
                    width: 28px;
                    height: 28px;
                    overflow: hidden;
                  }
                  .file .icon {
                    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAYAAAByDd+UAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA5ElEQVR4nGNgGGhQ3L2Iu6JvrhKxuLJnpkZtzwJjsi2s6JoTWjdh4ffu2aveEYPbZyz/WNk9539V77wlZFu4csuBj/+JBE9evP7fP3/d//YZK/7X9i9YShcL56za9v/z12//O2et+FfbP38lXSwEAbIspcRCsiwlx8LOWSv+bz94Co5Xbj3wv7Jn7v+q7jkZVLfwy7fv/09evI6BpyzZ8L2ie3YO1S3EBVZuOfARZNaohQyjQUosWDmaaGBgNNEQC1aOJhoYGE00NEk0dSQ0E3HhugkLvxNlIakNYXwYZBZBC2kNALrqutsrMR/AAAAAAElFTkSuQmCC);
                  }
                  .dir .icon {
                    background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciICB2aWV3Qm94PSIwIDAgNDggNDgiIHdpZHRoPSIyOHB4IiBoZWlnaHQ9IjI4cHgiPjxwYXRoIGZpbGw9IiNGRkEwMDAiIGQ9Ik00MCwxMkgyMmwtNC00SDhjLTIuMiwwLTQsMS44LTQsNHY4aDQwdi00QzQ0LDEzLjgsNDIuMiwxMiw0MCwxMnoiLz48cGF0aCBmaWxsPSIjRkZDQTI4IiBkPSJNNDAsMTJIOGMtMi4yLDAtNCwxLjgtNCw0djIwYzAsMi4yLDEuOCw0LDQsNGgzMmMyLjIsMCw0LTEuOCw0LTRWMTZDNDQsMTMuOCw0Mi4yLDEyLDQwLDEyeiIvPjwvc3ZnPg==);
                  }
                  .filedate {
                    white-space: nowrap;
                    overflow: ellipsis;
                  }
                  @media (min-width: 720px) {
                    ul {
                      columns: 2;
                      gap: 40px;
                    }
                  }
                  @media (min-width: 1200px) {
                    ul {
                      columns: 3;
                      gap: 40px;
                    }
                  }
                </style>
              </head>
              <body>
              <h1>Index of ${pathname}</h1>
              <ul>${list}</ul>
              </body>
            </html>`,
          {
            status: 200,
            headers: { "Content-Type": "text/html" },
          }
        );
      }
    }
  }
}
