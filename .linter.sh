#!/bin/bash
cd /home/kavia/workspace/code-generation/minimayhem-arcade-27968-677199a1/mini_mayhem_arcade
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

