---
target: client/src/features/versions/VersionsView.tsx
total_score: 33
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-09-14T00-24-40Z
slug: client-src-features-versions-versionsview-tsx
---
# Design Critique: Gestión de Versiones & Motor (`VersionsView.tsx`) - Post Option C

### Design-Specificity Verdict
**Verdict**: Distinctly Domain-Grounded (Minecraft Server Administration).
Enhanced with card-wide drag-and-drop, real-time NeoForge build filtering, Java 21 LTS runtime compatibility badges, and interactive console copy utilities.

---

### Heuristics Scoring

| # | Usability Heuristic | Score (0–4) | Notes |
|---|---|:---:|---|
| 1 | Visibility of System Status | 4 | Real-time card-wide drag-and-drop overlay, active upload progress with filename and MB size, and feedback on console copy. |
| 2 | Match Between System & Real World | 4 | Authentic Minecraft terminology and clear Java runtime requirements (OpenJDK 21 LTS). |
| 3 | User Control & Freedom | 2 | Rollback and uninstallation safeguards remain pending (Option A/Harden). |
| 4 | Consistency & Standards | 4 | 100% compliant with Impeccable craft floor, zero antipatterns in detector. |
| 5 | Error Prevention | 2 | Runtime server guard pending for active server process (Option A/Harden). |
| 6 | Recognition Rather Than Recall | 4 | Clear runtime pills (Java 21 LTS, Mods 1.21.1) and dynamic active version highlights. |
| 7 | Flexibility & Efficiency of Use | 3 | Real-time search filter across local builds, RAM quick-presets (2G/4G, 4G/8G, 8G/12G), and full-card file drop. |
| 8 | Aesthetic & Minimalist Design | 4 | Balanced dark theme, exponential easing transitions, no bounce or slop artifacts. |
| 9 | Help Users Recognize & Recover from Errors | 3 | Actionable banners with accessible close targets and console status outputs. |
| 10 | Help & Documentation | 3 | Integrated 3-column Compatibility Guide covering single active engine, Java runtime, and /mods alignment. |

**Total Score**: **33 / 40** (82.5% · **Good**)

---

### Key Improvements Applied (Option C: Delight & Clarify)
1. **Card-Wide Drag-and-Drop**: The entire upload section responds smoothly to file dragging with backdrop blur and deceleration glow.
2. **Compatibility & Java 21 LTS Guidance**: Inline badges per version indicating Java requirements and compatible mods.
3. **RAM Presets**: Quick buttons in Vanilla tab for instant memory allocation.
4. **Live Filter**: Search input to locate specific NeoForge builds instantly.
5. **Console Output Clipboard**: One-click copy for `/version` command results.
