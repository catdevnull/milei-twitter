import { db } from "$lib/db";
import { desc, isNotNull } from "drizzle-orm";
import { scraps } from "../../schema";

export async function queryLastLikedTweetsScrap() {
  return await db.query.scraps.findFirst({
    orderBy: desc(scraps.at),
    where: isNotNull(scraps.totalTweetsSeen),
  });
}
