#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
const file = new URL("../site.config.json", import.meta.url);
const config = JSON.parse(readFileSync(file, "utf8"));
const action = process.argv[2] ?? "status";
if (!["on", "off", "status"].includes(action)) {
  console.error("Uso: node scripts/manage-ads.mjs on|off|status");
  process.exit(1);
}
if (action !== "status") {
  config.ads.enabled = action === "on";
  writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
}
console.log(`AdSense: ${config.ads.enabled ? "ativado" : "desativado"}; desktop a partir de ${config.ads.minViewportWidth}px.`);
if (action !== "status") console.log("Publique site.config.json para aplicar a mudança aos próximos carregamentos do site.");
