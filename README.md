# AI-Based Delivery Robot Planning System

**Classical AI planning and heuristic search for autonomous pickup-and-delivery robots, running entirely in the browser.**

![Version](https://img.shields.io/badge/version-2.4-blue.svg)
![Planning](https://img.shields.io/badge/planning-STRIPS%20%7C%20A*%20%7C%20Dijkstra-00a8d6.svg)
![Platform](https://img.shields.io/badge/platform-client--side%20web-success.svg)
![Theme](https://img.shields.io/badge/theme-dark%20%7C%20light-lightgrey.svg)
![Dependencies](https://img.shields.io/badge/dependencies-none-brightgreen.svg)

> An Artificial Intelligence mini project demonstrating classical planning and heuristic search.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Problem Statement](#2-problem-statement)
3. [Key Features](#3-key-features)
4. [How the Planner Works](#4-how-the-planner-works)
5. [Search Algorithms](#5-search-algorithms)
6. [Benchmark Scenarios](#6-benchmark-scenarios)
7. [Technology Stack](#7-technology-stack)
8. [Project Structure](#8-project-structure)
9. [Getting Started](#9-getting-started)
10. [Using the Application](#10-using-the-application)
11. [Mathematical Formulation](#11-mathematical-formulation)
12. [Limitations and Future Scope](#12-limitations-and-future-scope)
13. [License](#13-license)

---

## 1. Overview

This project plans and simulates a delivery robot that must **collect an item from a pickup point and deliver it to a destination** on a 2D grid containing obstacles and rough terrain.

A mission is modelled as a **classical automated planning problem**. Before any search begins, the system checks the preconditions (valid coordinates, free cells, reachability). It then plans the mission in two phases:

| Phase | Goal | Ends with |
|-------|------|-----------|
| **Phase 1** | Robot start → item pickup | `PICKUP` action |
| **Phase 2** | Pickup → destination | `DROPOFF` action |

Several search strategies each produce a candidate plan. The system compares them and automatically selects the **lowest-cost valid plan**, then animates the delivery step by step with live telemetry.

## 2. Problem Statement

Delivery robots must reach goals in environments with obstacles and uneven terrain. In practice:

- The **shortest** path is not always the **cheapest**; mud or rough terrain costs more energy per step.
- Missions can be **infeasible**: the destination may be walled in, the pickup unreachable, or the input invalid.
- Manual route planning is slow, error-prone, and not cost-optimal.

This project solves these problems by verifying feasibility first and then selecting the cost-optimal plan among several algorithms.

## 3. Key Features

- **Formal planning model**: state space, STRIPS-style actions (`MOVE`, `PICKUP`, `DROPOFF`) and a precondition verification table.
- **Five search strategies**: A\* (Manhattan), A\* (Octile), Dijkstra, Safety-First, and Greedy Best-First.
- **Automatic plan comparison**: compares steps, movement cost, obstacle clearance, nodes expanded and compute time, then picks the best valid plan.
- **Interactive grid simulation**: draw obstacles, add rough terrain, and move the robot start, pickup and destination directly on the grid.
- **Playback controls**: play/pause, step through the plan, reset, timeline scrubber, and speed from 0.5x to 5.0x.
- **Live telemetry**: robot position, cargo status, energy consumed, current action, milestones and a real-time event log.
- **Six preloaded benchmark scenarios**, including failure and edge cases.
- **Configurable missions**: item name, priority, grid size (8x8, 10x10, 12x12 or 15x15), movement mode (4- or 8-directional), mud cost multiplier, safety weight, and obstacle density presets.
- **Dark and light themes** with a one-click toggle; your choice is remembered in the browser.
- **Sound effects** synthesised with the Web Audio API (no audio files needed).
- **Mission history and export**: delivery history table, plan export as **JSON**, history export as **CSV**.

## 4. How the Planner Works

```
Mission Input ──► Precondition Check ──► State-Space Model ──► Multi-Algorithm Search
                                                                        │
        Simulation & Report ◄────────── Best Plan Selection ◄──────────┘
```

1. **Mission input**: item, priority, robot start, pickup, destination, obstacles, terrain and algorithm settings.
2. **Precondition check**: verifies grid bounds, that the start, pickup and destination are not obstacles, and that a continuous path exists for each phase.
3. **State-space model**: a state holds the robot position, whether it carries cargo, pickup and destination, delivery status and accumulated cost. Actions are `MOVE(from, to, direction)`, `PICKUP(item, location)` and `DROPOFF(item, location)`.
4. **Search**: Phase 1 and Phase 2 paths are computed by each algorithm, using a priority queue.
5. **Best plan selection**: valid plans are sorted by **lowest total cost**, then **higher obstacle clearance**, then **fewer steps**.
6. **Simulation and report**: the chosen plan is animated on the grid and can be exported.

If a precondition fails (for example, a blocked destination), the system reports the failure **before** the robot moves and marks the plan as infeasible.

## 5. Search Algorithms

| Algorithm | Heuristic / Cost model | Behaviour |
|-----------|------------------------|-----------|
| **A\* (Manhattan)** | `h = \|dx\| + \|dy\|` | Optimal and admissible for 4-directional movement |
| **A\* (Octile)** | Octile distance, diagonal step ≈ 1.414 | Suited to 8-directional movement |
| **Dijkstra (Uniform Cost)** | No heuristic | Guaranteed minimum cost across non-uniform terrain |
| **Safety-First** | Adds a penalty near obstacles (safety weight) | Prefers paths with more wall clearance |
| **Greedy Best-First** | Heuristic only | Fast but not guaranteed optimal; shown for comparison |

**Terrain costs:** normal cells cost 1.0 per step; rough terrain (mud) costs the configurable multiplier (default 3.5; Scenario 5 uses 4.0).

## 6. Benchmark Scenarios

Select a scenario from the **Quick Scenarios** menu or from the cards on the Dashboard.

| # | Scenario | What it demonstrates | Expected result |
|---|----------|----------------------|-----------------|
| 1 | Normal Delivery | Start (0,0), pickup (1,1), destination (8,8) around obstacles | Full two-phase plan succeeds |
| 2 | Blocked Destination | Destination enclosed by obstacles | Phase 2 flagged infeasible; plan fails before moving |
| 3 | Unreachable Pickup | Pickup enclosed by barriers | Phase 1 flagged infeasible; robot never leaves start |
| 4 | Item Already at Destination | Pickup equals destination | Zero-cost Phase 2 (no-op) |
| 5 | Multiple Routes and Costs | Short mud corridor vs longer paved route | Planner chooses the longer but cheaper paved route |
| 6 | Invalid Task Specification | Negative or out-of-bounds coordinates, missing input | Validation banner with corrective advice, no crash |

## 7. Technology Stack

| Layer | Technology |
|-------|------------|
| Markup | HTML5 |
| Styling | CSS3 (CSS Grid, Flexbox, CSS variables for dark/light themes, animations) |
| Logic | Vanilla JavaScript (ES6+), no frameworks |
| Audio | Web Audio API |
| Icons and fonts | Font Awesome 6 and Google Fonts (Inter, JetBrains Mono) via CDN |

No Node.js, npm, Python or local server is required. An internet connection is only needed to load icons and fonts; the planner itself works offline.

## 8. Project Structure

```
AI_Based_Delivery_Robot_Planning_System/
│
├── index.html     # Application layout: dashboard, mission form, simulation, results, history
├── style.css      # Design system, grid styling, dark theme and light theme
├── script.js      # Planner, search algorithms, simulation controller, theme switcher
└── README.md      # Project documentation
```

## 9. Getting Started

**Requirements:** any modern web browser (Google Chrome recommended).

```bash
# 1. Clone the repository
git clone <repository-url>

# 2. Open the project folder
cd AI_Based_Delivery_Robot_Planning_System

# 3. Open index.html in your browser (double-click it, or run one of these)
#    macOS:    open index.html
#    Windows:  start index.html
#    Linux:    xdg-open index.html
```

The app starts with **Scenario 1** loaded and planned.

## 10. Using the Application

| Page | Purpose |
|------|---------|
| **Dashboard** | KPI cards (tasks, deliveries, failures, status, pickup, destination, total cost, route length), mission overview, scenario cards, live event stream |
| **Create Task and Scenarios** | Define the item, priority, coordinates, grid size, movement mode, algorithm, terrain cost and obstacles |
| **Robot Simulation Grid** | Edit the grid, play the plan, watch telemetry and the live log |
| **AI Planning Results** | Precondition verification table and the step-by-step action schedule |
| **Alternative Routes** | Side-by-side comparison of all algorithms with cost and safety charts |
| **Delivery History** | Log of planned missions with CSV export |
| **About and Formulation** | Formal problem description, action schemas and heuristics |

**Quick walkthrough**

1. Pick a scenario from **Quick Scenarios**.
2. Click **Generate AI Plan**, then **Run Simulation**.
3. Open **AI Planning Results** to read the precondition checks and action schedule.
4. Open **Alternative Routes** to see why the selected plan won.
5. In **Robot Simulation Grid**, draw an obstacle, click **Re-Calculate**, and watch the plan adapt.
6. Use the **Light Mode / Dark Mode** button in the top bar to switch themes.

## 11. Mathematical Formulation

**State**

$$s = \langle x_r,\; y_r,\; \text{has\_cargo},\; x_p,\; y_p,\; x_d,\; y_d,\; \text{delivered},\; \text{cost} \rangle$$

**Actions**

- `MOVE(from, to, dir)`: precondition: target cell is inside the grid and not an obstacle; effect: robot position changes and cost increases by the terrain cost.
- `PICKUP(item, loc)`: precondition: robot is at the pickup cell and carries nothing; effect: `has_cargo = true`.
- `DROPOFF(item, loc)`: precondition: robot is at the destination and carries the item; effect: `delivered = true`.

**Manhattan heuristic (4-directional movement)**

$$h(n) = |x_n - x_g| + |y_n - y_g|$$

This never overestimates the true remaining cost when every step costs at least 1, so $h(n) \le h^*(n)$ and A\* returns an optimal path.

**Octile heuristic (8-directional movement)**

$$h(n) = \max(\Delta x, \Delta y) + (\sqrt{2} - 1)\,\min(\Delta x, \Delta y)$$

**Total plan cost**

$$C_{\text{plan}} = C_{\text{phase 1}} + C_{\text{phase 2}}$$

## 12. Limitations and Future Scope

**Current limitations**

- Single robot on a static grid; obstacles change only when the user edits them.
- Mission history is kept for the current session and is not stored permanently.

**Future scope**

- Multiple robots with collision avoidance and task allocation.
- Dynamic or moving obstacles with real-time re-planning.
- Larger maps and additional algorithms (D\* Lite, Jump Point Search).
- Persistent history and importing maps from files.

## 13. License

This project is released for educational use. Add a license of your choice (for example MIT) in a `LICENSE` file.

---

*Built to demonstrate classical AI planning and heuristic search.*