import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const frontend = spawn(npmCommand, ["run", "dev:frontend"], {
  stdio: "inherit",
  shell: false,
});

const backend = spawn(npmCommand, ["run", "dev:backend"], {
  stdio: "inherit",
  shell: false,
});

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  frontend.kill("SIGINT");
  backend.kill("SIGINT");
  setTimeout(() => process.exit(code), 300);
}

frontend.on("exit", (code) => {
  if (!shuttingDown && code !== 0) shutdown(code ?? 1);
});

backend.on("exit", (code) => {
  if (!shuttingDown && code !== 0) shutdown(code ?? 1);
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("\nSchool Clinic development environment starting...");
console.log("Backend:  http://localhost:8080");
console.log("Frontend: http://localhost:5173\n");
