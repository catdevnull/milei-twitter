import { env } from "$env/dynamic/private";
import { redirect, type Cookies } from "@sveltejs/kit";

export function redirectIfNotLoggedIn(cookies: Cookies) {
  const pw = cookies.get("password");
  if (!pw || pw.length < 3) {
    return redirect(303, "/admin/login");
  }
  if (pw !== env.ADMIN_PASSWORD) {
    return redirect(303, "/admin/login");
  }
}
