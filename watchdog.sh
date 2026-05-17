#!/bin/bash
while true; do
  cd /home/z/my-project
  node node_modules/.bin/next dev -p 3000 2>&1 | tee dev.log
  echo "Server crashed at $(date), restarting in 5s..."
  sleep 5
done
