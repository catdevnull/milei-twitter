FROM python:3.11-slim-bookworm

WORKDIR /app

RUN adduser --disabled-password --gecos "" nonroot \
 && chown -R nonroot.nonroot /app/
RUN apt-get update && apt-get install -y sqlite3 tini && rm -rf /var/lib/apt/lists/*
RUN pip install poetry

USER nonroot
COPY pyproject.toml poetry.lock .
RUN poetry install --only main --no-root --no-directory
COPY scraper-py/ .

VOLUME /db
ENV DB_DIR=/db
ENV PYTHONUNBUFFERED=1

ENTRYPOINT ["tini", "--"]
CMD ["poetry", "run", "python3", "__init__.py", "cron"]