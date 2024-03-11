FROM python:3.11-slim-bookworm

WORKDIR /app

RUN adduser --disabled-password --gecos "" nonroot \
 && chown -R nonroot.nonroot /app/
RUN apt-get update && apt-get install -y sqlite3 curl && rm -rf /var/lib/apt/lists/*
RUN pip install poetry

# Latest releases available at https://github.com/aptible/supercronic/releases
ENV SUPERCRONIC_URL=https://github.com/aptible/supercronic/releases/download/v0.2.29/supercronic-linux-amd64 \
    SUPERCRONIC=supercronic-linux-amd64 \
    SUPERCRONIC_SHA1SUM=cd48d45c4b10f3f0bfdd3a57d054cd05ac96812b
RUN curl -fsSLO "$SUPERCRONIC_URL" \
 && echo "${SUPERCRONIC_SHA1SUM}  ${SUPERCRONIC}" | sha1sum -c - \
 && chmod +x "$SUPERCRONIC" \
 && mv "$SUPERCRONIC" "/usr/local/bin/${SUPERCRONIC}" \
 && ln -s "/usr/local/bin/${SUPERCRONIC}" /usr/local/bin/supercronic

USER nonroot
COPY pyproject.toml poetry.lock .
RUN poetry install --only main --no-root --no-directory
COPY scraper-py/ .

VOLUME /db
ENV DB_DIR=/db

ENTRYPOINT ["poetry", "run", "python3", "__init__.py", "cron"]