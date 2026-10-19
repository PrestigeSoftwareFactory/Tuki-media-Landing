"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { readCart, writeCart } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth";
import { enrollUser, getValidEnrollment } from "@/lib/courses";

async function getBuyableCourse(courseId: string) {
  return db.course.findFirst({
    where: { id: courseId, status: "PUBLISHED" },
    select: { id: true, slug: true, price: true, soldOut: true },
  });
}

export async function addToCartAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const course = await getBuyableCourse(courseId);
  if (!course || course.soldOut) redirect("/cursos?error=" + encodeURIComponent("El curso no está disponible."));
  const cart = await readCart();
  await writeCart([...cart, course.id]);
  revalidatePath("/", "layout");
  const back = String(formData.get("back") ?? "");
  if (back === "carrito") redirect("/carrito");
  redirect(`/curso/${course.slug}?ok=${encodeURIComponent("Agregado al carrito")}`);
}

export async function removeFromCartAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const cart = await readCart();
  await writeCart(cart.filter((id) => id !== courseId));
  revalidatePath("/", "layout");
  redirect("/carrito");
}

export async function buyNowAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const course = await getBuyableCourse(courseId);
  if (!course || course.soldOut) redirect("/cursos?error=" + encodeURIComponent("El curso no está disponible."));
  const cart = await readCart();
  if (!cart.includes(course.id)) await writeCart([...cart, course.id]);
  redirect("/checkout");
}

/** Inscripción directa a cursos gratuitos. */
export async function enrollFreeAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const course = await getBuyableCourse(courseId);
  if (!course || course.price !== 0) redirect("/cursos");
  const user = await getCurrentUser();
  if (!user) redirect(`/ingresar?next=${encodeURIComponent(`/curso/${course.slug}`)}`);
  if (!(await getValidEnrollment(user.id, course.id))) await enrollUser(user.id, course.id, "FREE");
  redirect(`/aprender/${course.slug}`);
}
