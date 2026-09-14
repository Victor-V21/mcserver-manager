---
target: client/src
total_score: 34
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 4
p2_count: 3
timestamp: 2026-09-14T04-02-45Z
slug: frontend-audit-and-microanimations
---
# Impeccable Frontend Heuristic Audit & Craftsmanship Report

### Overall Craftsmanship & Usability Assessment
**Verdict**: High domain fidelity (Minecraft Server Administration) with strong glassmorphism dark aesthetic, but lacking interactive micro-animations, physical transitions, and suffering from a few broken CSS keyframe references.

---

### Heuristics Scoring (Nielsen Norman Group 10 Usability Heuristics)

| # | Heuristic | Score (0–4) | Findings & Opportunities |
|---|---|:---:|---|
| 1 | **Visibility of System Status** | 3.5 | Live telemetry (CPU, RAM, Disk, TPS, MSPT) is now real and responsive. Missing: smooth numerical/bar transitions when telemetry polls update every 3.5s. |
| 2 | **Match Between System & Real World** | 4.0 | Terminology matches Minecraft/NeoForge conventions (.jar, MSPT/tick, ops, whitelist, RCON, user_jvm_args). |
| 3 | **User Control & Freedom** | 3.0 | Added restart notification button in mod management; modals have escape/backdrop dismiss. Navigation lacks transition cues. |
| 4 | **Consistency & Standards** | 3.5 | Cohesive dark gaming theme (`#070a0f`, emerald accents, JetBrains Mono font). Some buttons use ad-hoc styles instead of standard RareUI primitives. |
| 5 | **Error Prevention** | 3.5 | Mod toggles and deletes have confirmation prompts; paths are validated in Settings. |
| 6 | **Recognition Rather Than Recall** | 3.5 | Active version card, memory limits, and file paths are visible; Console has history shortcuts (`↑/↓`). |
| 7 | **Flexibility & Efficiency of Use** | 3.0 | Console quick commands had `forge tps` instead of `neoforge tps` for 1.21.1 builds. Quick access tiles lacked dynamic hover indicators. |
| 8 | **Aesthetic & Minimalist Design** | 3.5 | Clean glassmorphism layout. Missing: interactive micro-animations (cards, buttons, tabs, modal entrances). |
| 9 | **Help Users Recognize & Recover from Errors** | 3.5 | Clear toast notifications and banner feedback on mod changes. |
| 10 | **Help & Documentation** | 3.0 | Tooltips on badges and RCON quick commands; inline rule explanations in Properties and Players. |

**Total Score**: **34 / 40** (85.0% · Very Good)

---

### Detected Issues & Flaws

1. **[P0] Missing `@keyframes shimmerSweep` in CSS**:
   - `GlassShimmerButton.tsx` declares `animation: 'shimmerSweep 2.2s infinite linear'`, but the keyframe was never defined in `index.css` or Tailwind. The shimmer effect was completely inert.
2. **[P1] Missing `@keyframes scaleUp` / Missing Animated Modal Entrances**:
   - `Modal.tsx` references `animate-scaleUp`, which did not exist. Modals popped in abruptly without backdrop transitions or spring scaling.
3. **[P1] Jarring Page Switching**:
   - In `App.tsx`, changing tabs in the sidebar replaces the entire view without any motion, easing, or spatial transition.
4. **[P1] Static Metric Gauges**:
   - In `MetricGauge.tsx`, cards and progress bars lacked interactive hover lift, entrance motion, or spring-animated fill.
5. **[P1] Inert Sidebar Navigation**:
   - Navigation buttons lacked sliding active pill indicators (`layoutId`) and tactile tap feedback.
6. **[P2] Outdated Console Shortcut**:
   - `ConsoleView.tsx` had `forge tps` which fails on modern NeoForge (needs `neoforge tps`).
7. **[P2] Reduced Motion Accessibility**:
   - Missing `@media (prefers-reduced-motion: reduce)` rules for motion-sensitive users.

---

### Remediation Plan & Micro-Animations to Implement
1. **Core Motion Infrastructure**:
   - Define `@keyframes shimmerSweep`, `@keyframes float`, and `@keyframes pulseGlow` in `index.css`.
   - Add reduced-motion query guards.
2. **View & Tab Micro-Transitions**:
   - Integrate `framer-motion` `<AnimatePresence mode="wait">` in `App.tsx` for seamless tab switching with subtle slide and fade physics.
3. **Interactive Metric Cards**:
   - Upgrade `MetricGauge.tsx` to `motion.div` with spring hover float (`whileHover={{ y: -2, scale: 1.01 }}`) and spring-loaded animated progress bars.
4. **Fluid Sidebar Navigation**:
   - Add Framer Motion `layoutId="sidebarActivePill"` to `Sidebar.tsx` with smooth spring transitions between tabs, plus `whileHover` and `whileTap` tactile states.
5. **Spring-Physics Modals**:
   - Upgrade `Modal.tsx` with `AnimatePresence`, backdrop fade, and spring-scaled dialog box (`scale: 0.95 -> 1.0`).
6. **Console Quick Command Fix**:
   - Update `forge tps` to `neoforge tps`.
