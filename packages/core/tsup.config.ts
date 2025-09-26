import { defineConfig } from "tsup";
import { markAsExternalPlugin } from "../shared/tsup-plugins/mark-as-external";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  splitting: false,
  sourcemap: true,
  clean: false,
  target: "es2022",
  outDir: "dist",
  minify: false,
  dts: true,
  banner: {
    js: `(()=>{
      var g = typeof globalThis !== "undefined" ? globalThis : void 0;
      if (!g) return;
      var isNode = typeof process !== "undefined" && !!(process.versions && process.versions.node);
      if (isNode) return;
      if (g.__voltagentDefinePropertyPatched === true) return;
      var hasEdgeRuntime = typeof g.EdgeRuntime !== "undefined" || typeof g.Deno !== "undefined" || typeof g.Netlify !== "undefined";
      var hasCloudflareUA = false;
      if (typeof g.navigator === "object" && g.navigator && typeof g.navigator.userAgent === "string") {
        hasCloudflareUA = g.navigator.userAgent.indexOf("Cloudflare") !== -1;
      }
      if (!hasEdgeRuntime && !hasCloudflareUA) return;
      var originalDefineProperty = Object.defineProperty;
      try {
        Object.defineProperty = function(target, property, attributes) {
          if (!target || (typeof target !== "object" && typeof target !== "function")) {
            return target;
          }
          try {
            return originalDefineProperty(target, property, attributes);
          } catch (e) {
            return target;
          }
        };
        g.__voltagentDefinePropertyPatched = true;
      } catch (e) {
        // ignore
      }
    })();`,
  },
  esbuildPlugins: [markAsExternalPlugin],
  esbuildOptions(options) {
    options.keepNames = true;
    return options;
  },
});
