import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { env } from "$env/dynamic/private";

export const load: PageServerLoad = async ({ cookies }) => {
  if (
    cookies.get("password")?.length &&
    cookies.get("password") === env.ADMIN_PASSWORD
  ) {
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
