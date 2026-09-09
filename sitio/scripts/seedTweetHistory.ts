import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { scraperTokens, tweetSnapshots } from "../src/schema.ts";

const texts = [
  "La libertad avanza. Viva la libertad carajo.",
  "Fin de una jornada histórica. Gracias a todos los argentinos que siguen apostando por el cambio.",
  "No hay crecimiento posible sin equilibrio fiscal. Ordenar las cuentas es cuidar el futuro.",
  "Reunión de trabajo con el equipo económico. Seguimos avanzando con las reformas.",
  "Argentina tiene todo para volver a ser protagonista en el mundo.",
  "El esfuerzo empieza a dar frutos. No vamos a abandonar el rumbo.",
  "Defender la propiedad privada es defender la libertad de cada ciudadano.",
  "Gracias por el recibimiento y por tanto afecto. El cambio es imparable.",
  "La inflación sigue bajando. Falta mucho, pero estamos recorriendo el camino correcto.",
  "Hoy dimos un paso más para liberar las fuerzas productivas de la Argentina.",
  "Una sociedad libre premia el trabajo, el mérito y la innovación.",
  "Seguimos trabajando para que la Argentina vuelva a crecer.",
];

const databaseUrl = process.env.DATABASE_URL ?? "";
if (
  process.env.ALLOW_FAKE_TWEET_HISTORY_SEED !== "1" ||
  !/^postgres(?:ql)?:\/\/[^/]*@?(?:127\.0\.0\.1|localhost)(?::|\/)/.test(
    databaseUrl,
  )
) {
  throw new Error(
    "Refusing to seed unless DATABASE_URL is local and ALLOW_FAKE_TWEET_HISTORY_SEED=1",
  );
}
const client = postgres(databaseUrl);
const db = drizzle(client);

const now = new Date("2026-09-09T12:00:00-03:00");
const rows = texts.flatMap((text, tweetIndex) => {
  const tweetedAt = new Date(
    now.getTime() - (tweetIndex * 6 + 2) * 60 * 60 * 1_000,
  );
  const tweetId = String(2090000000000000000n - BigInt(tweetIndex) * 1000000n);
  const observations = Math.min(20, tweetIndex * 2 + 5);
  const finalLikes = 7_500 + ((tweetIndex * 7_919) % 48_000);
  const finalViews = 310_000 + ((tweetIndex * 613_337) % 2_400_000);
  const curve = (progress: number) =>
    (1 - Math.exp(-3.8 * progress)) / (1 - Math.exp(-3.8));

  return Array.from({ length: observations }, (_, observationIndex) => {
    const progress = (observationIndex + 1) / observations;
    const scrapedAt = new Date(
      tweetedAt.getTime() + (now.getTime() - tweetedAt.getTime()) * progress,
    );
    const favoriteCount = Math.round(finalLikes * curve(progress));
    const viewsCount = Math.round(finalViews * curve(progress));
    return {
      tweetId,
      scrapedAt,
      tweetedAt,
      favoriteCount,
      viewsCount,
      tweetJson: {
        tweet_created_at: tweetedAt.toISOString(),
        id_str: tweetId,
        full_text: text,
        favorite_count: favoriteCount,
        views_count: viewsCount,
        retweeted_status: null,
        quote_count: Math.round(favoriteCount * 0.015),
        reply_count: Math.round(favoriteCount * 0.04),
        retweet_count: Math.round(favoriteCount * 0.17),
        bookmark_count: Math.round(favoriteCount * 0.025),
        user: {
          id_str: "4020276615",
          name: "Javier Milei",
          screen_name: "JMilei",
        },
        raw_twitter: {
          __typename: "Tweet",
          rest_id: tweetId,
          legacy: {
            created_at: tweetedAt.toISOString(),
            full_text: text,
            favorite_count: favoriteCount,
          },
          views: { count: String(viewsCount), state: "EnabledWithCount" },
        },
      },
    };
  });
});

await db.insert(scraperTokens).values({ token: "local-preview-token" });
await db.insert(tweetSnapshots).values(rows);
console.info(`Seeded ${texts.length} tweets and ${rows.length} observations.`);
await client.end();
