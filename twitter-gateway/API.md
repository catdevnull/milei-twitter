# Twitter Gateway API

A SocialAPI-compatible HTTP API backed by logged-in Twitter browser sessions and raw X GraphQL requests.

**Base URL:** `https://api.url`

## Authentication

All `/twitter/*` endpoints require a Bearer token:

```
Authorization: Bearer YOUR_API_KEY
```

Without a valid token the API returns:

```json
{ "error": "Invalid or missing API key" }
```

`HTTP 401`

---

## Public Endpoints

### Health Check

```
GET /health
```

No authentication required.

**Response:** `HTTP 200`

```json
{ "ok": true }
```

### Root

```
GET /
```

Returns an HTML page with service status, request statistics, and a list of available endpoints.

---

## Twitter Endpoints

### Search Tweets

```
GET /twitter/search
```

Search for tweets on Twitter/X.

**Query Parameters:**

| Parameter | Required | Type   | Description                              |
|-----------|----------|--------|------------------------------------------|
| `query`   | Yes      | string | The search query                         |
| `type`    | No       | string | Either `Latest` (default) or `Top`       |
| `cursor`  | No       | string | Pagination cursor from `next_cursor`     |

**Error Responses:**

- `422` — Missing `query` parameter:
  ```json
  { "error": "Missing required parameter: query" }
  ```
- `422` — Invalid `type` parameter:
  ```json
  { "error": "type must be Latest or Top" }
  ```

**Success Response:** `HTTP 200`

```json
{
  "next_cursor": "DAADDAABCgABHPAWNeaWoQAKAAI...",
  "tweets": [
    {
      "tweet_created_at": "2026-08-06T02:27:41.000Z",
      "id_str": "2085191048230248704",
      "text": null,
      "full_text": "@DiegoRoyet29 Milei",
      "source": null,
      "truncated": false,
      "in_reply_to_status_id_str": "2085061751255552312",
      "in_reply_to_user_id_str": "1512918109920935941",
      "in_reply_to_screen_name": "DiegoRoyet29",
      "user": { "...": "User object (see User schema below)" },
      "quoted_status_id_str": null,
      "is_quote_status": false,
      "quoted_status": null,
      "retweeted_status": null,
      "quote_count": 0,
      "reply_count": 1,
      "retweet_count": 0,
      "favorite_count": 0,
      "lang": "es",
      "entities": {},
      "extended_entities": undefined,
      "views_count": 0,
      "bookmark_count": 0,
      "raw_twitter": { "...": "Full raw GraphQL result object" }
    }
  ]
}
```

---

### Get User Profile

```
GET /twitter/user/:identifier
```

Fetch a user's profile. The `identifier` can be a numeric Twitter user ID or a username (with or without `@` prefix).

**Path Parameters:**

| Parameter    | Type   | Description                    |
|--------------|--------|--------------------------------|
| `identifier` | string | Numeric user ID or username    |

**Error Responses:**

- `404` — User not found:
  ```json
  { "error": "Twitter user <identifier> was not found" }
  ```

**Success Response:** `HTTP 200`

```json
{
  "id": 4020276615,
  "id_str": "4020276615",
  "name": "Javier Milei",
  "screen_name": "JMilei",
  "location": "Buenos Aires, Argentina",
  "url": "",
  "description": "Economista",
  "protected": false,
  "verified": false,
  "followers_count": 4542062,
  "friends_count": 1430,
  "listed_count": 0,
  "favourites_count": 683613,
  "statuses_count": 388369,
  "created_at": "2015-10-22T23:47:47.000Z",
  "profile_banner_url": "https://pbs.twimg.com/profile_banners/4020276615/1458666862",
  "profile_image_url_https": "https://pbs.twimg.com/profile_images/1553931112262549505/XTcdwp0b_normal.jpg",
  "can_dm": false,
  "raw_twitter": { "...": "Full raw GraphQL result object" }
}
```

---

### Get User Tweets

```
GET /twitter/user/:user_id/tweets
```

Fetch a user's tweets (excluding replies).

**Path Parameters:**

| Parameter  | Type   | Description              |
|------------|--------|--------------------------|
| `user_id`  | string | Numeric Twitter user ID  |

**Query Parameters:**

| Parameter | Required | Type   | Description                     |
|-----------|----------|--------|---------------------------------|
| `cursor`  | No       | string | Pagination cursor from response |

**Error Responses:**

- `422` — Missing or non-numeric `user_id`:
  ```json
  { "error": "user_id must be a numeric Twitter ID" }
  ```

**Success Response:** `HTTP 200`

```json
{
  "next_cursor": "DAAHCgABHPAWQp3AJxELAAIAAAATMjA4NTE2OTk1NDE0MDA5MDc1OAgAAwAAAAEAAA",
  "tweets": [
    { "...": "Tweet object (see Tweet schema below)" }
  ]
}
```

---

### Get User Tweets and Replies

```
GET /twitter/user/:user_id/tweets-and-replies
```

Fetch a user's tweets including replies.

**Path Parameters:**

| Parameter  | Type   | Description              |
|------------|--------|--------------------------|
| `user_id`  | string | Numeric Twitter user ID  |

**Query Parameters:**

| Parameter | Required | Type   | Description                     |
|-----------|----------|--------|---------------------------------|
| `cursor`  | No       | string | Pagination cursor from response |

**Error Responses:** Same as `/tweets`.

**Success Response:** `HTTP 200` — Same shape as `/tweets`.

---

### Get Followers List

```
GET /twitter/followers/list
```

Fetch the list of users who follow a given user.

**Query Parameters:**

| Parameter  | Required | Type   | Description                     |
|------------|----------|--------|---------------------------------|
| `user_id`  | Yes      | string | Numeric Twitter user ID         |
| `cursor`   | No       | string | Pagination cursor from response |

**Error Responses:**

- `422` — Missing or non-numeric `user_id`:
  ```json
  { "error": "user_id must be a numeric Twitter ID" }
  ```

**Success Response:** `HTTP 200`

```json
{
  "next_cursor": "1872738155815705978|2085191151303786424",
  "users": [
    { "...": "User object (see User schema below)" }
  ]
}
```

---

### Get Following List

```
GET /twitter/friends/list
```

Fetch the list of users that a given user follows.

**Query Parameters:**

| Parameter  | Required | Type   | Description                     |
|------------|----------|--------|---------------------------------|
| `user_id`  | Yes      | string | Numeric Twitter user ID         |
| `cursor`   | No       | string | Pagination cursor from response |

**Error Responses:** Same as `/followers/list`.

**Success Response:** `HTTP 200` — Same shape as `/followers/list`.

---

## Data Schemas

### User Object

| Field                     | Type    | Description                                          |
|---------------------------|---------|------------------------------------------------------|
| `id`                      | number  | Numeric Twitter user ID                              |
| `id_str`                  | string  | User ID as string                                    |
| `name`                    | string  | Display name                                         |
| `screen_name`             | string  | Username (without `@`)                               |
| `location`                | string  | Location string (empty string if not set)            |
| `url`                     | string  | Website URL (empty string or URL)                    |
| `description`             | string  | Bio / description (empty string if not set)          |
| `protected`               | boolean | Whether the account is private                       |
| `verified`                | boolean | Whether the account is verified                      |
| `followers_count`         | number  | Number of followers                                  |
| `friends_count`           | number  | Number of accounts followed                          |
| `listed_count`            | number  | Number of lists the account is in                    |
| `favourites_count`        | number  | Number of likes                                      |
| `statuses_count`          | number  | Number of tweets                                     |
| `created_at`              | string  | Account creation date in ISO 8601 format             |
| `profile_banner_url`      | string  | Banner image URL (or empty string if not set)        |
| `profile_image_url_https` | string  | Profile avatar URL                                   |
| `can_dm`                  | boolean | Whether DMs are enabled                              |
| `raw_twitter`             | object  | Full raw GraphQL result for this user                |

### Tweet Object

| Field                       | Type     | Description                                              |
|-----------------------------|----------|----------------------------------------------------------|
| `tweet_created_at`          | string   | Tweet creation date in ISO 8601 format                   |
| `id_str`                    | string   | Tweet ID as string                                       |
| `text`                      | null     | Always `null`                                            |
| `full_text`                 | string   | Full tweet text                                          |
| `source`                    | string   | Tweet source/client (or `null`)                          |
| `truncated`                 | boolean  | Whether the tweet is truncated                           |
| `in_reply_to_status_id_str` | string   | ID of the tweet being replied to (or `null`)             |
| `in_reply_to_user_id_str`   | string   | User ID of the account being replied to (or `null`)      |
| `in_reply_to_screen_name`   | string   | Screen name of the account being replied to (or `null`)  |
| `user`                      | object   | Author's User object                                     |
| `quoted_status_id_str`      | string   | ID of quoted tweet (or `null`)                           |
| `is_quote_status`           | boolean  | Whether this tweet is a quote                            |
| `quoted_status`             | object   | Nested Tweet object of the quoted tweet (or `null`)      |
| `retweeted_status`          | object   | Nested Tweet object of the original tweet (or `null`)    |
| `quote_count`               | number   | Number of quotes                                         |
| `reply_count`               | number   | Number of replies                                        |
| `retweet_count`             | number   | Number of retweets                                       |
| `favorite_count`            | number   | Number of likes                                          |
| `lang`                      | string   | Detected language code (or `null`)                       |
| `entities`                  | object   | Parsed entities (hashtags, mentions, URLs, etc.)         |
| `extended_entities`         | object   | Media entities (images, videos, etc.) or `undefined`     |
| `views_count`               | number   | Number of views                                          |
| `bookmark_count`            | number   | Number of bookmarks                                      |
| `raw_twitter`               | object   | Full raw GraphQL result for this tweet                   |

---

## Pagination

All list endpoints return a `next_cursor` field. Pass its value as the `cursor` query parameter to fetch the next page. When `next_cursor` is `null`, there are no more results.

---

## Error Responses

### Validation Error

```
HTTP 422
```

```json
{ "error": "Missing required parameter: query" }
```

```json
{ "error": "user_id must be a numeric Twitter ID" }
```

```json
{ "error": "type must be Latest or Top" }
```

### Not Found

```
HTTP 404
```

```json
{ "error": "Twitter user <identifier> was not found" }
```

### Rate Limited

When all backend Twitter accounts are rate-limited:

```
HTTP 503
Retry-After: <seconds>
```

```json
{
  "error": "All Twitter accounts are rate limited",
  "retry_after": 900
}
```

### Twitter API Error

When Twitter returns an error (e.g., 404, 500):

```
HTTP 404 or 502
```

```json
{
  "error": "Twitter request failed",
  "twitter_status": 404
}
```

### Internal Error

```
HTTP 500
```

```json
{ "error": "<error message>" }
```

### Auth Not Configured

```
HTTP 503
```

```json
{ "error": "API authentication is not configured" }
```

---

## Examples

### Search for latest tweets about a topic

```bash
curl "https://api.url/twitter/search?query=Argentina&type=Latest" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Get a user by username

```bash
curl "https://api.url/twitter/user/JMilei" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Get a user by numeric ID

```bash
curl "https://api.url/twitter/user/4020276615" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Get user tweets

```bash
curl "https://api.url/twitter/user/4020276615/tweets" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Get user tweets with replies

```bash
curl "https://api.url/twitter/user/4020276615/tweets-and-replies" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Get followers

```bash
curl "https://api.url/twitter/followers/list?user_id=4020276615" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Get following

```bash
curl "https://api.url/twitter/friends/list?user_id=4020276615" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Paginated request

```bash
# First page
curl "https://api.url/twitter/user/4020276615/tweets" \
  -H "Authorization: Bearer YOUR_API_KEY"

# Use next_cursor from response for the next page
curl "https://api.url/twitter/user/4020276615/tweets?cursor=DAAHCgABHPAWQp3AJxELAAIAAAA..." \
  -H "Authorization: Bearer YOUR_API_KEY"
```
