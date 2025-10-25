#!/bin/bash

# CS Sound Download Helper Script
# This script helps you download free Counter-Strike style sounds from freesound.org
#
# USAGE:
#   1. Create an account at freesound.org
#   2. Get your API key from: https://freesound.org/apiv2/apply
#   3. Run: ./download-sounds-helper.sh YOUR_API_KEY
#
# Or use this script as a reference for manual downloading

set -e

API_KEY="${1:-}"
OUTPUT_DIR="public/assets/sounds/cs"

if [ -z "$API_KEY" ]; then
  echo "======================================================"
  echo "CS Sound Download Helper"
  echo "======================================================"
  echo ""
  echo "This script can help you download sounds from Freesound.org"
  echo ""
  echo "OPTION 1: Manual Download (Recommended)"
  echo "=========================================="
  echo "1. Go to https://freesound.org"
  echo "2. Search for each sound term listed below"
  echo "3. Download as MP3"
  echo "4. Rename to the required filename"
  echo "5. Place in: $OUTPUT_DIR"
  echo ""
  echo "OPTION 2: Automated Download (Requires API Key)"
  echo "================================================="
  echo "Usage: $0 YOUR_API_KEY"
  echo ""
  echo "Get API key from: https://freesound.org/apiv2/apply"
  echo ""
  echo "======================================================"
  echo "Required Sounds (29 total):"
  echo "======================================================"
  echo ""
  echo "WEAPON SOUNDS:"
  echo "  ak47.mp3          - Search: 'ak47 rifle shot'"
  echo "  m4a1.mp3          - Search: 'm4 rifle shot'"
  echo "  awp.mp3           - Search: 'awp sniper shot' or 'heavy sniper'"
  echo "  deagle.mp3        - Search: 'desert eagle pistol'"
  echo "  usp.mp3           - Search: 'suppressed pistol'"
  echo "  glock.mp3         - Search: 'glock pistol shot'"
  echo "  mp5.mp3           - Search: 'mp5 smg shot'"
  echo "  p90.mp3           - Search: 'p90 smg shot'"
  echo "  scout.mp3         - Search: 'sniper rifle shot'"
  echo ""
  echo "RELOAD SOUNDS:"
  echo "  reload-pistol.mp3 - Search: 'pistol reload magazine'"
  echo "  reload-rifle.mp3  - Search: 'rifle reload magazine'"
  echo "  reload-shotgun.mp3 - Search: 'shotgun reload pump'"
  echo "  reload-smg.mp3    - Search: 'smg reload magazine'"
  echo "  reload-sniper.mp3 - Search: 'sniper reload bolt'"
  echo ""
  echo "HIT SOUNDS:"
  echo "  hit-body.mp3      - Search: 'bullet impact flesh'"
  echo "  headshot.mp3      - Search: 'headshot hit marker'"
  echo "  hit-armor.mp3     - Search: 'bullet metal impact'"
  echo ""
  echo "DEATH SOUNDS:"
  echo "  death.mp3         - Search: 'death grunt male'"
  echo "  death-headshot.mp3 - Search: 'death sound'"
  echo ""
  echo "MOVEMENT SOUNDS:"
  echo "  footstep1.mp3     - Search: 'footstep concrete'"
  echo "  footstep2.mp3     - Search: 'footstep concrete'"
  echo "  footstep3.mp3     - Search: 'footstep concrete'"
  echo "  footstep4.mp3     - Search: 'footstep concrete'"
  echo ""
  echo "MISC SOUNDS:"
  echo "  shell-drop.mp3    - Search: 'shell casing drop'"
  echo "  weapon-switch.mp3 - Search: 'weapon switch'"
  echo "  empty-click.mp3   - Search: 'empty gun click'"
  echo ""
  echo "======================================================"
  echo "Alternative Free Sources:"
  echo "======================================================"
  echo "1. Zapsplat.com - Great weapon sounds (free account)"
  echo "2. OpenGameArt.org - Game-ready sound packs"
  echo "3. Sonniss GDC Bundles - Professional quality (free)"
  echo "   https://sonniss.com/gameaudiogdc"
  echo ""
  echo "======================================================"
  echo "After downloading, verify with:"
  echo "======================================================"
  echo "cd $OUTPUT_DIR"
  echo "ls -1 *.mp3 | wc -l  # Should show: 29"
  echo ""
  exit 0
fi

# If API key provided, show how to use freesound-python
echo "======================================================"
echo "Automated Download with Freesound API"
echo "======================================================"
echo ""
echo "To automate downloads, you can use the Freesound Python library:"
echo ""
echo "1. Install: pip install freesound-python"
echo ""
echo "2. Create a Python script like this:"
echo ""
cat << 'PYTHON_SCRIPT'
import freesound
import os

API_KEY = "YOUR_API_KEY"
OUTPUT_DIR = "public/assets/sounds/cs"

client = freesound.FreesoundClient()
client.set_token(API_KEY)

# Sound search terms
sounds_to_download = {
    "ak47.mp3": "ak47 rifle shot",
    "m4a1.mp3": "m4 rifle shot",
    "awp.mp3": "awp sniper shot",
    "deagle.mp3": "desert eagle pistol",
    # ... add all 29 sounds
}

for filename, search_term in sounds_to_download.items():
    results = client.text_search(
        query=search_term,
        filter="license:\"Creative Commons 0\"",
        sort="rating_desc",
        fields="id,name,previews"
    )

    if results.count > 0:
        sound = results[0]
        # Download preview (or full file if you have permission)
        preview_url = sound.previews.preview_hq_mp3
        # Download and save to OUTPUT_DIR/filename
        print(f"Downloading {filename}...")

print("Done! Check the CS_SOUND_IMPLEMENTATION.md for next steps.")
PYTHON_SCRIPT

echo ""
echo "======================================================"
echo "However, manual downloading is often faster and gives"
echo "you more control over sound quality and selection."
echo "======================================================"
