# Nightly pg_dump of every database in PG_TARGETS to the existing Backblaze B2
# bucket. Replaces `dokku postgres:backup-schedule`.
FROM postgres:17.5-alpine

RUN apk add --no-cache aws-cli curl

ARG SUPERCRONIC_VERSION=v0.2.33
RUN curl -fsSL "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-amd64" -o /usr/local/bin/supercronic \
    && echo "71b0d58cc53f6bd72cf2f293e09e294b79c666d8  /usr/local/bin/supercronic" | sha1sum -c - \
    && chmod +x /usr/local/bin/supercronic

COPY backup.sh /usr/local/bin/backup
COPY crontab /etc/pg-backup.crontab
RUN chmod +x /usr/local/bin/backup

ENTRYPOINT []
CMD ["/usr/local/bin/supercronic", "/etc/pg-backup.crontab"]
