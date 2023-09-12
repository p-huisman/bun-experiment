/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference types="p-elements-core" />

declare namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
  
  declare const Maquette: {
    h: H;
    createProjector: (projectorOptions?: ProjectorOptions) => Projector;
  };
  
  declare module "*.css";
  declare module "*.html";
  declare module "*.svg";
  