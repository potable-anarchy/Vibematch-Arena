# CS Sound Files Checklist

Place all downloaded sounds in this directory: `public/assets/sounds/cs/`

## Weapon Fire Sounds (9 files)
- [ ] ak47.mp3
- [ ] m4a1.mp3
- [ ] awp.mp3
- [ ] deagle.mp3
- [ ] usp.mp3
- [ ] glock.mp3
- [ ] mp5.mp3
- [ ] p90.mp3
- [ ] scout.mp3

## Reload Sounds (5 files)
- [ ] reload-pistol.mp3
- [ ] reload-rifle.mp3
- [ ] reload-shotgun.mp3
- [ ] reload-smg.mp3
- [ ] reload-sniper.mp3

## Hit & Damage Sounds (3 files)
- [ ] hit-body.mp3
- [ ] headshot.mp3
- [ ] hit-armor.mp3

## Death Sounds (2 files)
- [ ] death.mp3
- [ ] death-headshot.mp3

## Movement Sounds (4 files)
- [ ] footstep1.mp3
- [ ] footstep2.mp3
- [ ] footstep3.mp3
- [ ] footstep4.mp3

## Misc Sounds (3 files)
- [ ] shell-drop.mp3
- [ ] weapon-switch.mp3
- [ ] empty-click.mp3

---

**Total: 29 sound files needed**

---

## Quick Search Terms for Freesound.org:

Copy and paste these into freesound.org search:

1. "ak47 rifle shot"
2. "m4 rifle shot"
3. "awp sniper shot"
4. "desert eagle pistol"
5. "suppressed pistol shot"
6. "glock pistol shot"
7. "mp5 smg shot"
8. "p90 smg shot"
9. "sniper rifle shot"
10. "pistol reload"
11. "rifle reload"
12. "shotgun reload"
13. "bullet impact flesh"
14. "headshot sound"
15. "bullet impact metal armor"
16. "death grunt"
17. "footstep concrete"
18. "shell casing drop"
19. "weapon switch"
20. "empty gun click"

---

## Verification Script

After downloading, run this to check which files are present:

```bash
cd public/assets/sounds/cs
ls -1 *.mp3 2>/dev/null | wc -l
```

Should show: 29

To see which files are missing:

```bash
cd public/assets/sounds/cs
for file in ak47.mp3 m4a1.mp3 awp.mp3 deagle.mp3 usp.mp3 glock.mp3 mp5.mp3 p90.mp3 scout.mp3 reload-pistol.mp3 reload-rifle.mp3 reload-shotgun.mp3 reload-smg.mp3 reload-sniper.mp3 hit-body.mp3 headshot.mp3 hit-armor.mp3 death.mp3 death-headshot.mp3 footstep1.mp3 footstep2.mp3 footstep3.mp3 footstep4.mp3 shell-drop.mp3 weapon-switch.mp3 empty-click.mp3; do
  if [ ! -f "$file" ]; then
    echo "MISSING: $file"
  fi
done
```
