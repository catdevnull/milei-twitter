#!/bin/bash
# Advances the About job through its phase lists as each phase completes.
# Only advances when the previous phase finished cleanly (exit 0); restarts
# the same phase otherwise. After the final phase, retries failed usernames
# up to 2 times before declaring done.
ABOUT_DIR=/var/lib/twitter-gateway/about
LINK="$ABOUT_DIR/current-usernames.txt"
FAILED="$ABOUT_DIR/jmilei-about.jsonl.failed.jsonl"
failures=0
d_retries=0
while true; do
  while systemctl is-active --quiet jmilei-about.service; do sleep 60; done

  result=$(systemctl show -p Result --value jmilei-about.service)
  exit_code=$(systemctl show -p ExecMainStatus --value jmilei-about.service)
  if [ "$result" != "success" ] || [ "$exit_code" != "0" ]; then
    failures=$((failures + 1))
    echo "$(date -Is) about finished uncleanly (result=$result exit=$exit_code); failure $failures/10"
    if [ "$failures" -ge 10 ]; then
      echo "$(date -Is) giving up after 10 unclean finishes"
      exit 1
    fi
    systemctl restart jmilei-about.service
    sleep 30
    continue
  fi
  failures=0

  current=$(readlink "$LINK")
  case "$current" in
    phase-a-retweeters.txt) next=phase-b-first100k.txt;;
    phase-b-first100k.txt) next=phase-c-newest100k.txt;;
    phase-c-newest100k.txt) next=phase-d-rest.txt;;
    phase-d-rest.txt)
      if [ "$d_retries" -lt 2 ] && [ -s "$FAILED" ]; then
        d_retries=$((d_retries + 1))
        echo "$(date -Is) phase d finished; retry pass $d_retries/2 for failed usernames"
        systemctl restart jmilei-about.service
        sleep 30
        continue
      fi
      echo "$(date -Is) all phases done (current=$current, retries=$d_retries)"
      exit 0
      ;;
    *)
      echo "$(date -Is) all phases done (current=$current)"
      exit 0
      ;;
  esac
  echo "$(date -Is) advancing to $next"
  ln -sfn "$next" "$LINK"
  systemctl restart jmilei-about.service
done
