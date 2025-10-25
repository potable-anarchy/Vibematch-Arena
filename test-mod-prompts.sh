#!/bin/bash

# Array of test prompts players might use
declare -a prompts=(
    "make me heal over time"
    "give me a speed boost"
    "teleport me to the center of the map"
    "make my crosshair rainbow colored"
    "play a sound when I get a kill"
    "make everything explode when I shoot"
    "give me unlimited ammo"
    "make me invisible"
    "auto-aim at enemies"
    "make my gun shoot faster"
    "heal me to full health right now"
    "spawn a weapon"
    "make the screen shake when I take damage"
    "give me double damage for 30 seconds"
    "slow down time"
)

echo "═══════════════════════════════════════════════════════════════"
echo "Testing Gemini Mod Generation with Various User Prompts"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Test each prompt
for i in "${!prompts[@]}"; do
    prompt="${prompts[$i]}"
    num=$((i + 1))

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Test $num/${#prompts[@]}: \"$prompt\""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    response=$(curl -s -X POST http://localhost:5500/api/generate-mod \
        -H "Content-Type: application/json" \
        -d "{\"prompt\": \"$prompt\"}")

    echo "Response:"
    echo "$response" | jq -r '.code // .error' 2>/dev/null || echo "$response"
    echo ""
    echo "Type: $(echo "$response" | jq -r '.type // "N/A"')"
    echo ""
    sleep 1
done

echo "═══════════════════════════════════════════════════════════════"
echo "All tests complete!"
echo "═══════════════════════════════════════════════════════════════"
