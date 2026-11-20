# AI-Based Delivery Robot Planning System
**Autonomous Multi-Phase Classical Planning & Dynamic Route Optimization**

![System Version](https://img.shields.io/badge/System-v2.4-blue.svg)
![AI-Engine](https://img.shields.io/badge/Planning-A*%20%2F%20Dijkstra%20%2F%20STRIPS-00d2ff.svg)
![Platform](https://img.shields.io/badge/Platform-Pure%20Client--Side%20Web-success.svg)
![Status](https://img.shields.io/badge/Status-Demonstration--Ready-brightgreen.svg)

---

## 1. Project Overview

The **AI-Based Delivery Robot Planning System** is a full-featured, engineering-grade web application that synthesizes and simulates autonomous robot delivery operations in discrete spatial environments.

Given an initial robot state, an item to collect at a pickup coordinate, and a target destination locker, the system formulates the mission as a classical automated planning problem. It formally verifies precondition guards (boundary admissibility, spatial clearance, reachability, and cargo payload status) before synthesizing two consecutive movement phases:
1. **Phase 1:** Navigation from starting coordinate $(x_0, y_0)$ to item pickup $(x_p, y_p)$, culminating in a `PICKUP` operator.
2. **Phase 2:** Transport of the loaded payload to the destination $(x_d, y_d)$, culminating in a `DROPOFF` operator.

The planner computes alternative routes across five algorithmic heuristic strategies and selects the **lowest-cost valid plan**. The user can observe real-time robot movement, state changes, telemetry logs, and step-by-step precondition traces.

---

## 2. Key Features

- **Classical Automated Planning Formulation:**
  - State space: $S = \langle (x_r, y_r), \text{has\_cargo}, (x_p, y_p), (x_d, y_d), \text{delivered}, \text{energy} \rangle$.
  - STRIPS-style action schemas: `MOVE(from, to, dir)`, `PICKUP(item, loc)`, `DROPOFF(item, loc)`.
  - Comprehensive Precondition Guard Verification matrix.
- **Multi-Algorithm Heuristic Search Engine:**
  - **A\* Search with Manhattan Distance Heuristic:** Optimal and admissible for 4-directional grid corridors.
  - **A\* Search with Octile/Diagonal Heuristic:** Optimized for 8-directional kinematics with $\sqrt{2} \approx 1.414$ diagonal step cost.
  - **Dijkstra's Algorithm (Uniform Cost Search):** Guaranteed shortest-path exploration through non-uniform terrain cost fields.
  - **Safety-First / Cautious Planner:** Dynamic obstacle clearance field penalizing navigation near walls.
  - **Greedy Best-First Search:** Demonstrates greedy heuristic behavior vs optimal planning.
- **Multi-Plan Comparison & Automatic Optimal Selection:**
  - Evaluates candidate plans side-by-side.
  - Comparison metrics: Total physical steps, cumulative energy/movement cost, obstacle clearance index, nodes expanded, execution time, and mathematical justification.
- **Visual Grid Simulation Engine:**
  - Interactive grid editing: Click to draw or erase obstacles, set rough terrain (mud with $\times 3.5$ cost penalty), move robot start, pickup, or destination.
  - Step-by-step playback controls (Play, Pause, Step Forward, Step Back, Reset, Timeline Scrubber, Speed 0.5x to 5.0x).
  - Live animated robot sprite with visual cargo indicator and orientation.
- **Built-in Web Audio Synthesizer:**
  - Zero external media dependencies; generates real-time audio ticks, pickup chimes, delivery victory fanfares, and error buzzes using the standard Web Audio API.
- **All 6 Benchmark Scenarios Pre-configured (One-Click Selection):**
  1. *Normal Delivery:* Complete mission from pickup to destination around obstacles.
  2. *Blocked Destination:* Destination enclosed by obstacles; reports goal infeasibility before execution.
  3. *Unreachable Pickup Point:* Pickup enclosed by barriers; aborts Phase 1 safely.
  4. *Item Already at Destination:* Pickup equals destination; executes no-op zero-cost transit.
  5. *Multiple Routes with Different Costs:* Compares high-friction mud corridor ($\text{Cost}=4.0/\text{step}$) against a longer paved perimeter ($\text{Cost}=1.0/\text{step}$), proving cost minimization over physical distance.
  6. *Invalid Task Specification:* Catches missing inputs, negative/out-of-bounds coordinates, and obstacle collisions gracefully.
- **Mission History & Data Export:**
  - Live activity logging stream in terminal style.
  - Delivery history table with one-click mission replays.
  - Export plan report as JSON and delivery history as CSV.

---

## 3. Technology Stack

- **HTML5:** Semantic markup, responsive viewport layout, accessibility.
- **CSS3:** Custom Modern Dark Robotics Theme (Dark Navy, Slate, Electric Cyan, Neon Blue, Emerald Green), CSS Grid, Flexbox, glassmorphism filters, keyframe animations.
- **JavaScript (ES6+):** Pure vanilla JavaScript without external framework dependencies. Real A*, Dijkstra, Priority Queue, and state-space planning algorithms.
- **Web Audio API:** Hardware-accelerated audio synthesis for real-time auditory feedback.
- **Font Awesome 6 (CDN with fallback):** Robotics and navigational iconography.

> **Zero Dependencies:** No Node.js, React, npm, Python, or local web server required. Runs directly by opening `index.html` in Google Chrome or any modern browser.

---

## 4. Code & Directory Structure

```
delivery-robot-planner/
│
├── index.html        # Main presentation & application markup
├── style.css         # Dark navy/blue robotics design system & grid layout
├── script.js         # Classical planner, pathfinding algorithms & simulation controller
└── README.md         # Comprehensive engineering report & documentation
```

---

## 5. How to Run the Application

1. Locate the `delivery-robot-planner/` folder.
2. Double-click **`index.html`** or right-click and choose **Open with &rarr; Google Chrome**.
3. The dashboard will initialize automatically with **Scenario 1 (Normal Delivery)** loaded and planned.
4. Click **"Run Simulation"** in the top header or navigate to the **"Robot Simulation Grid"** tab to watch the autonomous robot collect and deliver the package.

---

## 6. Testing & Demonstration Guide

### Testing the 6 Benchmark Scenarios:
Click the **"Quick Scenarios"** dropdown in the top header or click any of the 6 scenario cards on the Dashboard:

1. **Scenario 1: Normal Delivery**
   - Click *Scenario 1*.
   - Notice the Start at `(0,0)`, Pickup at `(1,1)`, and Destination at `(8,8)`.
   - Click *"Run Simulation"* &rarr; Robot navigates Phase 1, retrieves `Medical Emergency Package`, navigates Phase 2, and drops off at destination.
2. **Scenario 2: Blocked Destination**
   - Click *Scenario 2*.
   - The destination locker `(8,8)` is surrounded by a ring of obstacles.
   - Click *"Generate AI Plan"* &rarr; Preconditions table flags *Phase 2 Infeasible*. Status shows `PLAN FAILED`. System prevents futile travel.
3. **Scenario 3: Unreachable Pickup Point**
   - Click *Scenario 3*.
   - The pickup item `(4,4)` is enclosed inside barriers.
   - Click *"Generate AI Plan"* &rarr; Preconditions table flags *Phase 1 Infeasible*. Rover aborts before leaving `(0,0)`.
4. **Scenario 4: Item Already at Destination**
   - Click *Scenario 4*.
   - Pickup is `(6,6)` and Destination is `(6,6)`.
   - System plans direct transit to `(6,6)` and executes instant handoff with Phase 2 transit cost = `0.0`.
5. **Scenario 5: Multiple Routes with Different Costs**
   - Click *Scenario 5*.
   - Direct corridor has heavy mud ($\text{Cost multiplier} = 4.0$), while outer corridor has clean pavement ($\text{Cost} = 1.0$).
   - Open the **"Alternative Routes"** tab. Observe how the planner chooses the physically longer path because its cumulative energy cost is significantly lower!
6. **Scenario 6: Invalid Task Specification**
   - Click *Scenario 6*.
   - Form loads invalid negative coordinates and missing name.
   - System displays a validation error banner with precise corrective advice without throwing unhandled exceptions.

---

## 7. Mathematical Formulation

### 7.1 State Space $\mathcal{S}$
A state $s \in \mathcal{S}$ is defined as:
$$s = \langle x_r, y_r, \text{has\_cargo}, x_p, y_p, x_d, y_d, \text{delivered}, \text{cost} \rangle$$

### 7.2 Heuristic Admissibility
For 4-directional orthogonal movement on a grid with non-negative step costs:
$$h(n) = |x_n - x_g| + |y_n - y_g|$$
Because any path without diagonal movement requires at least $|x_n - x_g|$ horizontal and $|y_n - y_g|$ vertical moves, $h(n) \le h^*(n)$ holds unconditionally, guaranteeing that $A^*$ returns the globally optimal shortest path.

---

## 8. Presentation Tips for Academic Review

1. **Start at Dashboard:** Show the 8 KPI cards summarizing operational metrics.
2. **Showcase the 6 Scenarios:** Emphasize that the system handles not just the ideal case, but edge cases such as blockages, unreachable goals, and cost trade-offs.
3. **Open "AI Planning Results":** Walk the evaluators through the formal precondition verification table and step schedule.
4. **Open "Alternative Routes":** Point out the comparison table and explain how the system evaluates multiple heuristics (A* Manhattan, Octile, Dijkstra, Cautious Safety, and Greedy BFS) to guarantee cost-optimal execution.
5. **Demonstrate Interactive Canvas:** In the "Robot Simulation Grid", draw an obstacle while simulation is paused, click *"Re-Calculate"*, and watch the robot dynamically navigate around the new obstacle.
