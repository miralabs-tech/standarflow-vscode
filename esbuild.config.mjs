import esbuild from "esbuild";
import { sassPlugin } from "esbuild-sass-plugin";

const watch = process.argv.includes("--watch");
const minify = !watch;

const hostCtx = await esbuild.context({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  target: "node20",
  sourcemap: !minify,
  minify,
  logLevel: "info",
});

const webviewCtx = await esbuild.context({
  entryPoints: ["src/webview/ui/main.tsx"],
  bundle: true,
  outdir: "dist/webview",
  format: "esm",
  platform: "browser",
  target: "es2022",
  jsx: "automatic",
  jsxImportSource: "preact",
  sourcemap: !minify,
  minify,
  logLevel: "info",
  plugins: [sassPlugin()],
});

if (watch) {
  await Promise.all([hostCtx.watch(), webviewCtx.watch()]);
  console.log("[watch] standarflow extension host + webview");
} else {
  await Promise.all([hostCtx.rebuild(), webviewCtx.rebuild()]);
  await Promise.all([hostCtx.dispose(), webviewCtx.dispose()]);
}
