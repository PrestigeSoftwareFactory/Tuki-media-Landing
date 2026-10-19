// Regenera las ilustraciones demo de los cursos sembrados (no toca imágenes subidas desde el admin).
import path from "node:path";
import fs from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { cardSvg, coverSvg } from "./seed-art";

const db = new PrismaClient();
const DIR = path.join(process.cwd(), "storage", "public", "seed");

async function main() {
  const courses = await db.course.findMany({ orderBy: { position: "asc" }, include: { category: true } });
  for (const [i, c] of courses.entries()) {
    const kicker = c.type === "PRESENCIAL" ? "Presencial" : c.category?.name ?? "Tuki";
    if (c.cardImage === `/media/seed/card-${c.slug}.svg`) await fs.writeFile(path.join(DIR, `card-${c.slug}.svg`), cardSvg(c.title, kicker, c.position ?? i));
    if (c.coverImage === `/media/seed/cover-${c.slug}.svg`) await fs.writeFile(path.join(DIR, `cover-${c.slug}.svg`), coverSvg(c.title, kicker, (c.position ?? i) + 1));
  }
  console.log(`Ilustraciones regeneradas para ${courses.length} cursos.`);
}
main().finally(() => db.$disconnect());
