import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { env } from "$env/dynamic/private";

export const load: PageServerLoad = async ({ cookies }) => {
  if ((env.ADMIN_PASSWORD?.length ?? 0) < 3) {
    return error(500, "no hay contraseña de admin seteada");
  }
  const attemptedPassword = cookies.get("password");
  if (attemptedPassword === env.ADMIN_PASSWORD) {
    redirect(303, "/admin");
  }
};

export const actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const password = data.get("password");

    if (!password || password.toString().length < 3) {
      return fail(400, { error: "muy chiquita la pw" });
    }

    if (password.toString() !== env.ADMIN_PASSWORD) {
      return fail(401, { error: "pw incorrecta" });
    }

    cookies.set("password", password.toString(), { path: "/" });

    redirect(303, "/admin");
  },
} satisfies Actions;
