import { z } from "zod";

export const zTweet = z.object({
  aproximateAt: z.coerce.date(),
  text: z.string().nullable(),
  url: z.string(),
  liked: z.boolean(),
  retweeted: z.boolean(),
});
export type Tweet = z.infer<typeof zTweet>;

export const zTweetsResponse = z.object({
  tweets: z.array(zTweet),
});
export type TweetsResponse = z.infer<typeof zTweetsResponse>;
