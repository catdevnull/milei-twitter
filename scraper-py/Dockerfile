FROM cgr.dev/chainguard/wolfi-base

WORKDIR /app

RUN apk add python3 py3-pip py3-poetry supercronic sqlite && \
	chown -R nonroot.nonroot /app/

USER nonroot
COPY pyproject.toml poetry.lock .
RUN poetry install
COPY scraper-py/ .

VOLUME /db
ENV DB_DIR=/db

COPY crontab crontab

ENTRYPOINT ["supercronic", "/app/crontab"]