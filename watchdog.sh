#!/usr/bin/env bash
# News Reel box backup (no AI): every 5 min, if news.yml hasn't started a run in 20 min, dispatch one via gh.
# Stop: kill the PID in watchdog.pid (check `ps -fp` first). Log: watchdog.log.
cd /workspace/news-reel || exit 1
exec 9>watchdog.lock; flock -n 9 || { echo "already running"; exit 0; }
echo $$ > watchdog.pid
log(){ echo "$(date '+%F %T %Z') $*" >> watchdog.log; }
log "watchdog started pid $$"
while true; do
  last=$(gh run list -R WajeehK/news-reel -w news.yml -L 1 --json createdAt -q '.[0].createdAt' 2>>watchdog.log)
  if [ -n "$last" ]; then
    age=$(( $(date +%s) - $(date -d "$last" +%s) ))
    if [ "$age" -gt 1200 ]; then gh workflow run news.yml -R WajeehK/news-reel >>watchdog.log 2>&1 && log "last run ${age}s ago -> dispatched"; fi
  else log "could not read runs"; fi
  [ "$(wc -c < watchdog.log)" -gt 200000 ] && tail -n 300 watchdog.log > watchdog.log.tmp && mv watchdog.log.tmp watchdog.log
  sleep 300
done
