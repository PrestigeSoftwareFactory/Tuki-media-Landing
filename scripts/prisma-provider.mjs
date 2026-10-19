// Cambia el motor de base de datos del esquema de Prisma.
//   node scripts/prisma-provider.mjs postgresql   (producción)
//   node scripts/prisma-provider.mjs sqlite       (desarrollo)
// Sin argumento, lo deduce de DATABASE_URL.
import fs from "node:fs";

const file = new URL("../prisma/schema.prisma", import.meta.url);
const url = process.env.DATABASE_URL ?? "";
const target = process.argv[2] ?? (url.startsWith("postgres") ? "postgresql" : "sqlite");
if (!["sqlite", "postgresql"].includes(target)) {
  console.error(`Motor no soportado: ${target}`);
  process.exit(1);
}
const schema = fs.readFileSync(file, "utf8");
const next = schema.replace(/(datasource db \{\s*provider\s*=\s*)"[^"]+"/, `$1"${target}"`);
if (next === schema && !schema.includes(`provider = "${target}"`)) {
  console.error("No encontré el datasource en prisma/schema.prisma");
  process.exit(1);
}
fs.writeFileSync(file, next);
console.log(`Prisma configurado para ${target}.`);
