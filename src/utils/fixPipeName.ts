import process from "node:process";

export default function fixPipeName(pipeName: string): string {
  if (process.platform === "win32") {
    const winPrefixes = [`\\\\.\\pipe\\`, `\\\\?\\pipe\\`];
    const prefix = winPrefixes.find((p) => pipeName.startsWith(p));
    const finalPrefix = prefix ?? winPrefixes[0];
    pipeName = pipeName
      .slice(prefix?.length ?? 0)
      .replace(/\\/g, "/")
      .replace(/^\//, "")
      .replace(/\//g, "-");
    pipeName = finalPrefix + pipeName;
  }
  return pipeName;
}
