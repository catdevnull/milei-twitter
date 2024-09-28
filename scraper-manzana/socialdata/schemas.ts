import { z } from "zod";

export const SocialDataUser = z.object({
  id: z.number(),
  id_str: z.string(),
  name: z.string(),
  screen_name: z.string(),
  location: z.string(),
  url: z.string().nullable(),
  description: z.string(),
  protected: z.boolean(),
  verified: z.boolean(),
  followers_count: z.number(),
  friends_count: z.number(),
  listed_count: z.number(),
  favourites_count: z.number(),
  statuses_count: z.number(),
  created_at: z.string(),
  profile_banner_url: z.string().nullable(),
  profile_image_url_https: z.string(),
  can_dm: z.boolean().nullable(),
});

export const SocialDataBaseTweet = z.object({
  tweet_created_at: z.string(),
  id_str: z.string(),
  text: z.null(),
  full_text: z.string(),
  source: z.string(),
  truncated: z.boolean(),
  in_reply_to_status_id_str: z.string().nullable(),
  in_reply_to_user_id_str: z.string().nullable(),
  in_reply_to_screen_name: z.string().nullable(),
  user: SocialDataUser,
  quoted_status_id_str: z.string().nullable(),
  is_quote_status: z.boolean(),
  quote_count: z.number(),
  reply_count: z.number(),
  retweet_count: z.number(),
  favorite_count: z.number(),
  lang: z.string(),
  entities: z.object({
    user_mentions: z.array(
      z.object({
        id_str: z.string(),
        name: z.string(),
        screen_name: z.string(),
        indices: z.array(z.number()),
      })
    ),
    urls: z.array(
      z.object({
        display_url: z.string(),
        expanded_url: z.string().optional(),
        indices: z.array(z.number()),
        url: z.string(),
      })
    ),
    hashtags: z.array(z.unknown()),
    symbols: z.array(z.unknown()),
  }),
  views_count: z.number().nullable(),
  bookmark_count: z.number(),
});
export type SocialDataBaseTweet = z.infer<typeof SocialDataBaseTweet>;

export type SocialDataTweet = z.infer<typeof SocialDataBaseTweet> & {
  quoted_status: z.infer<typeof SocialDataBaseTweet> | null;
  retweeted_status: z.infer<typeof SocialDataBaseTweet> | null;
};

export const SocialDataTweet: z.ZodType<SocialDataTweet> =
  SocialDataBaseTweet.extend({
    quoted_status: SocialDataBaseTweet.nullable(),
    retweeted_status: SocialDataBaseTweet.nullable(),
  });

export const SocialDataTweetsResponse = z.object({
  next_cursor: z.string(),
  tweets: z.array(SocialDataTweet),
});
export type SocialDataTweetsResponse = z.infer<typeof SocialDataTweetsResponse>;

export const SocialDataErrorResponse = z.object({
  status: z.literal("error"),
  message: z.string(),
});

export const SocialDataGenericResponse = z.object({
  status: z.string(),
  message: z.string().optional(),
});
export type SocialDataGenericResponse = z.infer<
  typeof SocialDataGenericResponse
>;
