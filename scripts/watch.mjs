import { execFileSync, spawn } from "node:child_process";
import { watch } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const isWindows = process.platform === "win32";
const ignoredSegments = new Set([".git", "node_modules", "_site"]);
const checkScript = resolve(scriptDir, "check-accessible-names.mjs");

let checkRunning = false;
let checkQueued = false;
let checkTimer = null;
let shuttingDown = false;

const serveProcess = spawn(
  "npx",
  ["eleventy", "--serve", "--watch", "--port=8081"],
  {
    cwd: projectRoot,
    stdio: "inherit",
    shell: isWindows,
  },
);

function stopProcess(childProcess) {
  if (!childProcess || childProcess.killed) {
    return;
  }

  if (isWindows) {
    try {
      execFileSync("taskkill", ["/pid", String(childProcess.pid), "/t", "/f"], {
        stdio: "ignore",
      });
      return;
    } catch {}
  }

  childProcess.kill("SIGTERM");
}

function isIgnoredPath(changedPath) {
  const normalizedPath = changedPath.replace(/\\/g, "/");
  return normalizedPath
    .split("/")
    .some((segment) => ignoredSegments.has(segment));
}

function runAudit() {
  if (shuttingDown || checkRunning) {
    return;
  }

  checkRunning = true;

  const auditProcess = spawn(process.execPath, [checkScript, "_site"], {
    cwd: projectRoot,
    stdio: "inherit",
  });

  auditProcess.on("error", (error) => {
    console.error(error.message);
  });

  auditProcess.on("exit", (code) => {
    checkRunning = false;

    if (code !== 0) {
      console.error(`Accessible-name audit exited with code ${code}.`);
    }

    if (checkQueued && !shuttingDown) {
      checkQueued = false;
      runAudit();
    }
  });
}

function queueAudit(reason) {
  if (shuttingDown) {
    return;
  }

  clearTimeout(checkTimer);
  checkTimer = setTimeout(() => {
    if (checkRunning) {
      checkQueued = true;
      return;
    }

    console.log(`Change detected (${reason}); running accessible-name audit...`);
    runAudit();
  }, 350);
}

const watcher = watch(
  resolve(projectRoot, "src"),
  { recursive: true },
  (eventType, filename) => {
    if (!filename || isIgnoredPath(filename)) {
      return;
    }

    queueAudit(`${eventType}: ${filename}`);
  },
);

setTimeout(() => {
  if (!shuttingDown) {
    console.log("Running initial accessible-name audit...");
    runAudit();
  }
}, 1000);

function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  clearTimeout(checkTimer);
  watcher.close();
  stopProcess(serveProcess);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, shutdown);
}

serveProcess.on("exit", (code) => {
  shuttingDown = true;
  clearTimeout(checkTimer);
  watcher.close();
  process.exit(code ?? 0);
});

serveProcess.on("error", (error) => {
  console.error(error.message);
  shutdown();
  process.exit(1);
});
