import { execFileSync, spawn } from "node:child_process";
import { watch } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const isWindows = process.platform === "win32";
const astroCli = resolve(
  projectRoot,
  "node_modules",
  "astro",
  "bin",
  "astro.mjs",
);
const spawnOptions = {
  cwd: projectRoot,
  stdio: "inherit",
};
const ogScript = resolve(scriptDir, "generate-og-images.mjs");
const accessibleNameCheckScript = resolve(
  scriptDir,
  "check-accessible-names.mjs",
);
const ignoredSegments = new Set([".astro", "dist", "node_modules", ".git"]);
const enableBackgroundBuild = process.env.ASTRO_BACKGROUND_BUILD === "1";

let buildProcess = null;
let buildQueued = false;
let buildTimer = null;
let shuttingDown = false;

function runAstroCommand(...args) {
  return spawn(process.execPath, [astroCli, ...args], spawnOptions);
}

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

const devProcess = runAstroCommand("dev");

function isIgnoredPath(changedPath) {
  const normalizedPath = changedPath.replace(/\\/g, "/");
  return normalizedPath
    .split("/")
    .some((segment) => ignoredSegments.has(segment));
}

function runBuildStep(args) {
  return new Promise((resolveBuild, rejectBuild) => {
    const childProcess = runAstroCommand(...args);

    childProcess.on("error", rejectBuild);
    childProcess.on("exit", (code) => {
      if (code === 0) {
        resolveBuild();
        return;
      }

      rejectBuild(
        new Error(`Astro ${args.join(" ")} exited with code ${code}.`),
      );
    });
  });
}

function runScript(scriptPath, args = []) {
  return new Promise((resolveStep, rejectStep) => {
    const childProcess = spawn(
      process.execPath,
      ["--use-system-ca", scriptPath, ...args],
      spawnOptions,
    );
    childProcess.on("error", rejectStep);
    childProcess.on("exit", (code) => {
      if (code === 0) {
        resolveStep();
        return;
      }
      rejectStep(new Error(`${scriptPath} exited with code ${code}.`));
    });
  });
}

function runOgImages() {
  return runScript(ogScript, ["dist"]);
}

function runAccessibleNameAudit() {
  return runScript(accessibleNameCheckScript, ["dist"]);
}

function startBuild() {
  if (shuttingDown || buildProcess) {
    return;
  }

  buildProcess = { cancelled: false };

  Promise.resolve()
    .then(() => runBuildStep(["check"]))
    .then(() => runBuildStep(["build"]))
    .then(() => runOgImages())
    .then(() => runAccessibleNameAudit())
    .catch((error) => {
      if (!buildProcess?.cancelled) {
        console.error(error.message);
      }
    })
    .finally(() => {
      buildProcess = null;

      if (buildQueued && !shuttingDown) {
        buildQueued = false;
        startBuild();
      }
    });
}

function queueBuild(reason) {
  if (shuttingDown) {
    return;
  }

  clearTimeout(buildTimer);
  buildTimer = setTimeout(() => {
    if (buildProcess) {
      buildQueued = true;
      return;
    }

    console.log(`Change detected (${reason}); rebuilding site output...`);
    startBuild();
  }, 250);
}

const watcher = enableBackgroundBuild
  ? watch(projectRoot, { recursive: true }, (eventType, filename) => {
      if (!filename || isIgnoredPath(filename)) {
        return;
      }

      queueBuild(`${eventType}: ${filename}`);
    })
  : null;

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  clearTimeout(buildTimer);
  watcher?.close();

  if (buildProcess) {
    buildProcess.cancelled = true;
  }

  stopProcess(devProcess, signal);
}

devProcess.on("exit", (code) => {
  shuttingDown = true;
  watcher?.close();
  clearTimeout(buildTimer);

  if (buildProcess) {
    buildProcess.cancelled = true;
  }

  process.exit(code ?? 0);
});

devProcess.on("error", (error) => {
  console.error(error.message);
  shutdown("SIGTERM");
  process.exit(1);
});

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

if (enableBackgroundBuild) {
  console.log("Background check/build enabled (ASTRO_BACKGROUND_BUILD=1).");
  startBuild();
} else {
  console.log("Background check/build disabled for stable dev routing.");
}
