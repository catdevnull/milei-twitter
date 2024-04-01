import { db } from "$lib/db";
import { seedHistoricLikes } from "$lib/db/seedHistoricLikes";
await seedHistoricLikes(db);
