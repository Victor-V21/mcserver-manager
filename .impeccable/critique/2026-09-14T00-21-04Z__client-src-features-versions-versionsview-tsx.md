---
target: client/src/features/versions/VersionsView.tsx
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-09-14T00-21-04Z
slug: client-src-features-versions-versionsview-tsx
---
# Design Critique: Versions & Engine Management (`VersionsView.tsx`)

### Design-Specificity Verdict
**Verdict**: Distinctly Domain-Grounded (Minecraft Server Administration).
The visual language, metrics, file references (`start.sh`, `libraries/net/neoforged/neoforge/`, `unix_args.txt`), and official Mojang/NeoForge versioning workflows are authentically built for Minecraft server administrators, with a high-contrast dark gamer aesthetic and monospace diagnostic accents.

---

### Heuristics Scoring

| # | Usability Heuristic | Score (0–4) | Notes |
|---|---|:---:|---|
| 1 | Visibility of System Status | 3 | Clear active badges, loading spinners, and upload banners; server live state could be more explicitly tied into version switching. |
| 2 | Match Between System & Real World | 4 | Natural terminology (`.jar`, `NeoForge`, `Mojang`, `RAM`, `EULA`, `start.sh`). |
| 3 | User Control & Freedom | 2 | Missing confirmation or rollback when switching active builds or downloading vanilla server. |
| 4 | Consistency & Standards | 3 | Follows the panel's glassmorphism dark system and tab patterns consistently. |
| 5 | Error Prevention | 2 | No safeguard preventing engine switching or vanilla re-installation while server process is running. |
| 6 | Recognition Rather Than Recall | 3 | Versions clearly map NeoForge builds to their Minecraft counterparts (`21.1.12` -> `1.21.1`) with file paths. |
| 7 | Flexibility & Efficiency of Use | 2 | Lacks quick search/filter for accumulated jar builds and lacks drag-and-drop overlay for the full card. |
| 8 | Aesthetic & Minimalist Design | 3 | Well-balanced dark theme with emerald accents; uncluttered tabs. |
| 9 | Help Users Recognize & Recover from Errors | 3 | Clear dismissible toast banners with error messages and console response logs. |
| 10 | Help & Documentation | 2 | Basic inline rule info provided, but lacks compatibility guidance for mods and Java requirements. |

**Total Score**: **27 / 40** (67.5% · Acceptable)

---

### Cognitive Load Assessment
- **Checklist Failures**: 1 of 8 (Low Cognitive Load).
- **Working Memory**: Well within limits (≤4 active choices per tab).
- **Assessment**: The tabbed separation between local NeoForge engine builds and official Vanilla releases effectively prevents visual and decision fatigue.

---

### Emotional Journey
- **Highs**: Immediate reassurance when seeing the prominent active version card with `ACTIVA` badge and resolved physical path.
- **Valleys**: Anxiety when clicking "Activar Esta Versión" or "Instalar Vanilla" due to uncertainty about whether the action will conflict with a running server or wipe existing mods.

---

### Strengths
1. **Prominent Active Engine Anchor**: The top status card provides immediate clarity on the running engine (`Minecraft 1.21.1 • NeoForge 21.1.12`) and launcher target (`start.sh`).
2. **High-Fidelity Technical Diagnostics**: Displays physical paths, timestamps, jar names, and `unix_args.txt` readiness without cluttering the screen.
3. **Structured Tab Separation**: Cleanly divides modded engine management from official Mojang vanilla downloads and console diagnostics.

---

### Priority Issues

- **[P1] No Running-Server Guard When Switching Versions**
  - **Why it matters**: Switching NeoForge builds or triggering a Vanilla install while the server is active can corrupt files or crash the Java process.
  - **Fix**: Check `isRunning` status; disable version switches or show an active warning modal prompting to stop the server first.
  - **Suggested command**: `$impeccable harden`

- **[P1] Irreversible Vanilla Overwrite Without Confirmation**
  - **Why it matters**: Installing a Vanilla version replaces `server.jar` and launcher scripts, potentially destroying custom modded setups without warning.
  - **Fix**: Add a confirmation modal detailing the overwrite risks before initiating download.
  - **Suggested command**: `$impeccable harden`

- **[P2] Lack of Filter/Search and Sorting for Local Builds**
  - **Why it matters**: As servers accumulate multiple jar versions and library builds, finding a specific build in a flat grid becomes tedious.
  - **Fix**: Add search by build number and sort by date/active status.
  - **Suggested command**: `$impeccable layout`

- **[P2] Drag-and-Drop Area Restricted to Inner Box**
  - **Why it matters**: Dropping a `.jar` anywhere on the upload card fails unless dropped inside the dashed rectangle, often triggering accidental browser file open.
  - **Fix**: Expand drag-and-drop listener to the entire card with a visual drag-over state.
  - **Suggested command**: `$impeccable delight`

- **[P3] Lack of Mod Loader / Java Compatibility Hints**
  - **Why it matters**: Administrators switching versions need to know if their mods or Java runtime (Java 21) match the selected Minecraft version.
  - **Fix**: Add contextual badges or hints indicating recommended Java version and mod compatibility status.
  - **Suggested command**: `$impeccable clarify`

---

### Persona Red Flags
- **Alex (Power User)**:
  - No keyboard shortcuts for triggering "Escanear Raíz" or running `/version`.
  - No batch deletion or cleanup for obsolete `.jar` files in `server/`.
- **Jordan (First-Timer)**:
  - Unclear whether "Activar Esta Versión" automatically restarts the server or if manual intervention is required on Dashboard.
  - Confused by the difference between an installer jar and an installed library build.
- **Sam (Accessibility)**:
  - File upload zone relies on a clickable `<div>` wrapping a hidden `<input>`, which can be awkward for keyboard-only navigation.
  - Contrast on some subtle dark pill labels (`text-[10px] text-slate-400 bg-dark-900`) is close to the 4.5:1 threshold.

---

### Minor Observations
- The "Cerrar" button on the notification alert banner has a small touch/click target (`px-2 py-0.5 text-[11px]`).
- The console `/version` output box lacks a copy-to-clipboard button.

---

### Questions to Consider
- What if switching a version while the server is running offered a one-click "Guardar, Detener y Cambiar Versión"?
- Could we automatically cross-reference the `mods/` directory against the selected Minecraft version to warn about incompatible mods?
