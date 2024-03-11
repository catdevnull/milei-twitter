import z from "zod";

export const zLikedTweet = z.object({
  url: z.string(),
  firstSeenAt: z.coerce.date(),
  text: z.string(),
});
export type LikedTweet = z.infer<typeof zLikedTweet>;
export const zRetweet = z.object({
  posterId: z.string(),
  posterHandle: z.string(),
  postId: z.string(),

  firstSeenAt: z.coerce.date(),
  retweetAt: z.coerce.date(),
  postedAt: z.coerce.date(),
  text: z.string(),
});
export type Retweet = z.infer<typeof zRetweet>;
export const zTweet = z.object({
  id: z.string(),
  snscrapeJson: z.string(),
  capturedAt: z.coerce.date(),
});
export const zScrap = z.object({
  uid: z.string({ description: "a unique id (nanoid)" }),
  finishedAt: z.coerce.date(),
  totalTweetsSeen: z.number(),
  likedTweets: z.array(zLikedTweet).optional(),
  retweets: z.array(zRetweet).optional(),

  tweets: z
    .array(zTweet, {
      description: "array of tweets, in the future replaces retweets field",
    })
    .optional(),
});
export type Scrap = z.infer<typeof zScrap>;

export const zPostScrapRes = z.object({
  scrapId: z.number(),
});
export type PostScrapRes = z.infer<typeof zPostScrapRes>;
