import asyncio
from twscrape import API, gather
from twscrape.logger import set_log_level
from db import fetchone, fetchall, execute
from nanoid import generate
import datetime
import json
import os
import httpx

JMILEI_ID = "4020276615"
JMILEI_HANDLE = "jmilei"

db_dir = os.environ['DB_DIR']
db_path = db_dir+"/scraper.db"

api_url = os.environ['API_URL']
api_token = os.environ['API_TOKEN']

api = API(db_dir+"/accounts.db")


async def main():
    await api.pool.login_all()
    await scrap_liked()
    await scrap_retweets()


async def scrap_liked():
    liked = await gather(api.liked_tweets(JMILEI_ID, limit=100))

    scrap = {
        'uid': generate(),
        'finishedAt': datetime.datetime.now().isoformat(),
        'totalTweetsSeen': len(liked),
        'likedTweets': [{
            'url': t.url,
            'firstSeenAt': datetime.datetime.now().isoformat(),
            'text': t.rawContent,
        } for t in liked if t.sourceLabel != 'advertiser-interface'],
        'retweets': []
    }
    scrap_json = json.dumps(scrap)

    await execute(db_path, "INSERT INTO db_scraper_scraps(uid, json) VALUES(:uid, :json)", {
        'uid': scrap["uid"],
        'json': scrap_json
    })
    await upload_scraps()


async def scrap_retweets():
    tweets = await gather(api.user_tweets(JMILEI_ID, limit=100))
    scrap = {
        'uid': generate(),
        'finishedAt': datetime.datetime.now().isoformat(),
        'totalTweetsSeen': len(tweets),
        'likedTweets': [],
        'retweets': [{
            'posterId': str(t.retweetedTweet.user.id),
            'posterHandle': t.retweetedTweet.user.username,
            'postId': str(t.retweetedTweet.id),

            'firstSeenAt': datetime.datetime.now().isoformat(),
            'retweetAt': t.date.isoformat(),
            'postedAt': t.retweetedTweet.date.isoformat(),
            'text': t.retweetedTweet.rawContent,
        } for t in tweets if t.retweetedTweet]
    }
    scrap_json = json.dumps(scrap)

    await execute(db_path, "INSERT INTO db_scraper_scraps(uid, json) VALUES(:uid, :json)", {
        'uid': scrap["uid"],
        'json': scrap_json
    })
    await upload_scraps()


async def upload_scraps():
    async with httpx.AsyncClient() as client:
        for scrap in await fetchall(db_path, "SELECT * FROM db_scraper_scraps WHERE saved_with_id IS NULL"):
            print("Saving scrap", scrap["uid"])
            r = await client.post(api_url+"/api/internal/scraper/scrap", json=json.loads(scrap["json"]), headers={"Authorization": "Bearer "+api_token})
            print(r.text)
            res = r.json()

            await execute(
                db_path,
                "update db_scraper_scraps set saved_with_id = :scrap_id where uid = :uid",
                {'scrap_id': res['scrapId'], 'uid': scrap['uid']})


if __name__ == "__main__":
    asyncio.run(main())
