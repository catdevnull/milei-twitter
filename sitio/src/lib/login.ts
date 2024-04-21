import { env } from "$env/dynamic/private";
import { error, redirect, type Cookies } from "@sveltejs/kit";

export function redirectIfNotLoggedIn(cookies: Cookies) {
  const pw = cookies.get("password");
  if ((env.ADMIN_PASSWORD?.length ?? 0) < 3) {
    return error(500, "no hay contraseña de admin seteada");
  }
  if (!pw || pw.length < 3) {
    return redirect(303, "/admin/login");
  }
  if (pw !== env.ADMIN_PASSWORD) {
    return redirect(303, "/admin/login");
  }
}
