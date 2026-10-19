/* eslint-disable no-console */
// Crea (o actualiza) un administrador sin cargar datos de demostración.
// Uso: npm run create-admin -- email@dominio.com "Contraseña segura" Nombre Apellido
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

async function main() {
  // en la compu: toma DATABASE_URL del .env (en Docker ya viene en el entorno)
  if (!process.env.DATABASE_URL) {
    try {
      process.loadEnvFile(".env");
    } catch {
      /* sin .env */
    }
  }
  const [email, password, firstName = "Admin", lastName = "Tuki"] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Uso: npm run create-admin -- email@dominio.com "Contraseña" [Nombre] [Apellido]');
    process.exit(1);
  }
  if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    console.error("La contraseña tiene que tener al menos 10 caracteres, con letras y números.");
    process.exit(1);
  }
  const db = new PrismaClient();
  const passwordHash = await bcrypt.hash(password, 11);
  const user = await db.user.upsert({
    where: { email: email.toLowerCase() },
    update: { role: "ADMIN", passwordHash, blocked: false },
    create: { email: email.toLowerCase(), firstName, lastName, passwordHash, role: "ADMIN", emailVerifiedAt: new Date() },
  });
  console.log(`Administrador listo: ${user.email}`);
  await db.$disconnect();
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
