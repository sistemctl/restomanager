const { networkInterfaces } = require("node:os");
const { spawn } = require("node:child_process");

const addresses = Object.entries(networkInterfaces())
  .filter(([name]) => !/virtual|vethernet|wsl|loopback|vpn|docker/i.test(name))
  .flatMap(([name, entries]) => (entries || []).map(entry => ({ ...entry, name })))
  .filter(entry => entry.family === "IPv4" && !entry.internal && !entry.address.startsWith("169.254."))
  .sort((a, b) => Number(/wi-?fi|wireless/i.test(b.name)) - Number(/wi-?fi|wireless/i.test(a.name)));

const port = process.env.PORT || "3000";
const origin = `http://${addresses[0]?.address || "localhost"}:${port}`;
console.log(`Direccion local del restaurante: ${origin}`);

const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "-H", "0.0.0.0", "-p", port], {
  stdio: "inherit",
  windowsHide: true,
  env: { ...process.env, NODE_ENV: "production", AUTH_URL: "", NEXTAUTH_URL: "" },
});
server.on("error", error => { console.error(error.message); process.exitCode = 1; });
server.on("exit", code => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
