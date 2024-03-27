import asyncio
from twscrape import API, gather, Tweet, to_old_rep
from twscrape.logger import set_log_level
from twscrape.utils import to_old_obj
import twscrape
from db import fetchone, fetchall, execute
from nanoid import generate
import datetime
import json
import os
import httpx
import argparse
import pprint
import random
import traceback
import typing

JMILEI_ID = "4020276615"
JMILEI_HANDLE = "jmilei"

db_dir = os.environ["DB_DIR"]
db_path = db_dir + "/scraper.db"

api_url = os.environ["API_URL"]
api_token = os.environ["API_TOKEN"]

api = API(db_dir + "/accounts.db")

parser = argparse.ArgumentParser(prog="scraper-py")
subparsers = parser.add_subparsers(dest="subcommand_name")
cron_parser = subparsers.add_parser("cron")
liked_parser = subparsers.add_parser("liked")
retweets_parser = subparsers.add_parser("retweets")


async def main():
    args = parser.parse_args()
    try:
        await api.pool.login_all()
    except Exception as e:
        print("Error in login_all", e)
    try:
        await api.pool.relogin_failed()
    except Exception as e:
        print("Error in relogin_failed", e)

    if args.subcommand_name == "liked":
        res = await scrap_liked(1)
        pprint.pprint(res)
    elif args.subcommand_name == "retweets":
        res = await scrap_tweets(1)
        pprint.pprint(res)
    elif args.subcommand_name == "cron":
        while True:
            try:
                await cron()
            except Exception as e:
                print("Error in cron", type(e).__name__, e)
                print(traceback.format_exc())
            await asyncio.sleep(50 + random.randint(5, 15))
    else:
        print("wtf")


async def cron():
    try:
        print("Scrapping liked")
        res = await scrap_liked()
        await save_scrap(res["scrap"])
    except Exception as e:
        print("Error when scrapping liked", type(e).__name__, e)
        print(traceback.format_exc())

    try:
        print("Scrapping tweets")
        res = await scrap_tweets()
        await save_scrap(res["scrap"])
    except Exception as e:
        print("Error when scrapping tweets", type(e).__name__, e)
        print(traceback.format_exc())


async def save_scrap(scrap):
    scrap_json = json.dumps(scrap)
    await execute(
        db_path,
        "INSERT INTO db_scraper_scraps(uid, json) VALUES(:uid, :json)",
        {"uid": scrap["uid"], "json": scrap_json},
    )
    await upload_scraps()


async def read_tweet_timeline(res: httpx.Response):
    json = res.json()
    old_rep = to_old_rep(res.json())
    for instruction in json["data"]["user"]["result"]["timeline_v2"]["timeline"][
        "instructions"
    ]:
        if instruction["type"] != "TimelineAddEntries":
            continue
        for entry in instruction["entries"]:
            if entry["content"]["__typename"] != "TimelineTimelineItem":
                continue
            if entry["entryId"].startswith("promoted-tweet-"):
                continue
            old = to_old_obj(entry["content"]["itemContent"]["tweet_results"]["result"])
            tweet = Tweet.parse(old, old_rep)
            yield tweet


async def get_user_tweets_timeline(uid: int, limit=-1):
    async for res in api.user_tweets_raw(uid, limit):
        async for tweet in read_tweet_timeline(res):
            yield tweet


async def get_liked_tweets_timeline(uid: int, limit=-1):
    async for res in api.liked_tweets_raw(uid, limit):
        async for tweet in read_tweet_timeline(res):
            yield tweet


async def scrap_liked(limit=100):
    liked = await gather(get_liked_tweets_timeline(JMILEI_ID, limit))
    if len(liked) == 0:
        raise Exception("no likes returned")

    scrap = {
        "uid": generate(),
        "finishedAt": datetime.datetime.now().isoformat(),
        "totalTweetsSeen": len(liked),
        "likedTweets": [
            {
                "url": t.url,
                "firstSeenAt": datetime.datetime.now().isoformat(),
                "text": t.rawContent,
            }
            for t in liked
            if t.sourceLabel != "advertiser-interface"
        ],
        "retweets": [],
    }
    return {"scrap": scrap, "raw_liked": liked}


async def scrap_tweets(limit=40):
    tweets = await gather(get_user_tweets_timeline(JMILEI_ID, limit))
    if len(tweets) == 0:
        raise Exception("no tweets returned")
    scrap = {
        "uid": generate(),
        "finishedAt": datetime.datetime.now().isoformat(),
        "totalTweetsSeen": len(tweets),
        "likedTweets": [],
        "retweets": [
            {
                "posterId": str(t.retweetedTweet.user.id),
                "posterHandle": t.retweetedTweet.user.username,
                "postId": str(t.retweetedTweet.id),
                "firstSeenAt": datetime.datetime.now().isoformat(),
                "retweetAt": t.date.isoformat(),
                "postedAt": t.retweetedTweet.date.isoformat(),
                "text": t.retweetedTweet.rawContent,
            }
            for t in tweets
            if t.retweetedTweet
        ],
        "tweets": [
            {
                "id": str(t.id),
                "capturedAt": datetime.datetime.now().isoformat(),
                "snscrapeJson": t.json(),
            }
            for t in tweets
        ],
    }
    return {"scrap": scrap, "raw_tweets": tweets}


async def upload_scraps():
    async with httpx.AsyncClient() as client:
        for scrap in await fetchall(
            db_path, "SELECT * FROM db_scraper_scraps WHERE saved_with_id IS NULL"
        ):
            print("Saving scrap", scrap["uid"])
            r = await client.post(
                api_url + "/api/internal/scraper/scrap",
                json=json.loads(scrap["json"]),
                headers={"Authorization": "Bearer " + api_token},
            )
            print(r.text)
            res = r.json()

            await execute(
                db_path,
                "update db_scraper_scraps set saved_with_id = :scrap_id where uid = :uid",
                {"scrap_id": res["scrapId"], "uid": scrap["uid"]},
            )


if __name__ == "__main__":
    asyncio.run(main())
