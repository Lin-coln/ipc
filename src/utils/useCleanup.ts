import process from "node:process";

export default function useCleanup(callback: () => void): void {
  if (typeof callback !== "function") {
    throw new TypeError("Callback must be a function");
  }

  const cleanup = () => {
    try {
      callback();
    } catch (err) {
      console.error("Error during cleanup:", err);
    }
  };

  const signals: NodeJS.Signals[] = [
    "SIGINT", // Ctrl+C
    "SIGTERM", // Termination signal
    "SIGHUP", // Terminal is closed
  ];

  signals.forEach((signal) => {
    process.on(signal, () => {
      console.log(`exit signal: ${signal}`);
      cleanup();
      process.exit(0);
    });
  });

  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
    cleanup();
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
    cleanup();
    process.exit(1);
  });

  // 当进程正常退出时清理
  process.on("exit", () => {
    console.log(`exit`);
    cleanup();
  });
}
