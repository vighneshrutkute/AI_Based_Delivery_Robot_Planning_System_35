/**
 * ============================================================================
 * AI-BASED DELIVERY ROBOT PLANNING SYSTEM
 * Pure Client-Side Implementation (HTML5, CSS3, JavaScript ES6+)
 * 
 * Features:
 * - Formal Classical Planning: State Space, Preconditions, Guards & Effects
 * - Multi-Algorithm Search Engine: A* (Manhattan, Octile), Dijkstra, Safety-First, Greedy BFS
 * - Multi-Plan Generation & Lowest-Cost Valid Selection
 * - Step-by-Step Animated Simulation with Live Telemetry
 * - Interactive Grid Editing (Obstacles, Mud/Rough Terrain, Start, Pickup, Dest)
 * - 6 Pre-configured Benchmark Scenarios
 * - Synthesized Audio Effects via Web Audio API (Zero External Media)
 * ============================================================================
 */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
   * 1. AUDIO SYNTHESIZER (Web Audio API)
   * -------------------------------------------------------------------------- */
  class SoundManager {
    constructor() {
      this.ctx = null;
      this.enabled = true;
    }

    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
    }

    playMove() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
      } catch (e) {
        // Audio error handling ignored silently
      }
    }

    playPickup() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.12, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.25);
        });
      } catch (e) {}
    }

    playDelivery() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          gain.gain.setValueAtTime(0.15, now + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.35);
        });
      } catch (e) {}
    }

    playError() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } catch (e) {}
    }

    toggle() {
      this.enabled = !this.enabled;
      return this.enabled;
    }
  }

  const sound = new SoundManager();

  /* --------------------------------------------------------------------------
   * 2. DATA STRUCTURES & PRIORITY QUEUE FOR HEURISTIC SEARCH
   * -------------------------------------------------------------------------- */
  class PriorityQueue {
    constructor() {
      this.elements = [];
    }
    enqueue(item, priority) {
      this.elements.push({ item, priority });
      this.elements.sort((a, b) => a.priority - b.priority);
    }
    dequeue() {
      return this.elements.shift().item;
    }
    isEmpty() {
      return this.elements.length === 0;
    }
    size() {
      return this.elements.length;
    }
  }

  /* --------------------------------------------------------------------------
   * 3. BENCHMARK SCENARIOS CONFIGURATION
   * -------------------------------------------------------------------------- */
  const SCENARIO_PRESETS = {
    1: {
      id: 1,
      name: "Normal Delivery",
      tag: "Scenario 1: Normal Delivery (Happy Path)",
      item: "Medical Emergency Package",
      priority: "CRITICAL",
      gridSize: 10,
      start: { x: 0, y: 0 },
      pickup: { x: 1, y: 1 },
      dest: { x: 8, y: 8 },
      directions: 4,
      algorithm: "AUTO",
      mudCost: 3.5,
      safetyWeight: 1.5,
      obstacles: [
        { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 },
        { x: 5, y: 9 }, { x: 5, y: 8 }, { x: 5, y: 7 }, { x: 5, y: 6 },
        { x: 6, y: 4 }, { x: 7, y: 4 }, { x: 8, y: 4 },
        { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }
      ],
      mud: [
        { x: 4, y: 4 }, { x: 4, y: 5 }
      ],
      description: "Robot successfully collects item at (1,1) and delivers to hospital locker at (8,8) navigating around perimeter walls."
    },
    2: {
      id: 2,
      name: "Blocked Destination",
      tag: "Scenario 2: Blocked Destination (Infeasible Goal)",
      item: "Sterile Surgical Kits",
      priority: "HIGH",
      gridSize: 10,
      start: { x: 0, y: 0 },
      pickup: { x: 2, y: 2 },
      dest: { x: 8, y: 8 },
      directions: 4,
      algorithm: "AUTO",
      mudCost: 3.5,
      safetyWeight: 1.5,
      // Fully enclose destination (8,8)
      obstacles: [
        { x: 7, y: 7 }, { x: 8, y: 7 }, { x: 9, y: 7 },
        { x: 7, y: 8 },                   { x: 9, y: 8 },
        { x: 7, y: 9 }, { x: 8, y: 9 }, { x: 9, y: 9 }
      ],
      mud: [],
      description: "Destination at (8,8) is completely surrounded by barrier obstacles. Planning validates Phase 1 but flags Goal Infeasibility for Phase 2."
    },
    3: {
      id: 3,
      name: "Unreachable Pickup Point",
      tag: "Scenario 3: Unreachable Pickup Point (Precondition Failure)",
      item: "Cryogenic Organ Transport",
      priority: "CRITICAL",
      gridSize: 10,
      start: { x: 0, y: 0 },
      pickup: { x: 4, y: 4 },
      dest: { x: 9, y: 9 },
      directions: 4,
      algorithm: "AUTO",
      mudCost: 3.5,
      safetyWeight: 1.5,
      // Fully enclose pickup (4,4)
      obstacles: [
        { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 },
        { x: 3, y: 4 },                   { x: 5, y: 4 },
        { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }
      ],
      mud: [],
      description: "Pickup location is barricaded inside a containment zone. The planning algorithm detects that Phase 1 is impossible and safely aborts before departure."
    },
    4: {
      id: 4,
      name: "Item Already at Destination",
      tag: "Scenario 4: Item Already at Destination (No-Op Transit)",
      item: "Pre-positioned Defibrillator",
      priority: "NORMAL",
      gridSize: 10,
      start: { x: 0, y: 0 },
      pickup: { x: 6, y: 6 },
      dest: { x: 6, y: 6 }, // Pickup == Dest
      directions: 4,
      algorithm: "AUTO",
      mudCost: 3.5,
      safetyWeight: 1.5,
      obstacles: [
        { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 4 }
      ],
      mud: [],
      description: "Item pickup point is identical to the destination point. The planning model treats Phase 2 transit as a zero-cost no-op operation."
    },
    5: {
      id: 5,
      name: "Multiple Routes with Different Costs",
      tag: "Scenario 5: Multiple Routes with Different Costs (Terrain Trade-off)",
      item: "Industrial Circuit Assembly",
      priority: "HIGH",
      gridSize: 10,
      start: { x: 1, y: 1 },
      pickup: { x: 2, y: 1 },
      dest: { x: 8, y: 8 },
      directions: 4,
      algorithm: "AUTO",
      mudCost: 4.0, // High penalty for mud
      safetyWeight: 1.5,
      // Middle corridor is mud; wall separates direct route vs clear outer corridor
      obstacles: [
        { x: 4, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 5 }, { x: 4, y: 6 }, { x: 4, y: 7 }
      ],
      // Direct diagonal path passes through dense high-friction mud
      mud: [
        { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 4 }, { x: 3, y: 5 },
        { x: 5, y: 4 }, { x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 7, y: 7 }
      ],
      description: "Direct path has high terrain friction (mud cost x4.0), while outer perimeter path is clear (cost x1.0). Compares both routes to demonstrate intelligent cost minimization."
    },
    6: {
      id: 6,
      name: "Invalid Task Specification",
      tag: "Scenario 6: Invalid Task Specification (Error Interception)",
      item: "", // Missing item name
      priority: "NORMAL",
      gridSize: 10,
      start: { x: -1, y: 0 }, // Out of bounds negative
      pickup: { x: 5, y: 12 }, // Out of bounds coordinate
      dest: { x: 4, y: 4 },
      directions: 4,
      algorithm: "AUTO",
      mudCost: 3.5,
      safetyWeight: 1.5,
      obstacles: [
        { x: 4, y: 4 } // Destination placed directly on obstacle!
      ],
      mud: [],
      description: "Intentionally presents invalid coordinates, missing item title, and collision conflict. Intercepted by Task Validation Guard without crashing."
    }
  };

  /* --------------------------------------------------------------------------
   * 4. APP STATE
   * -------------------------------------------------------------------------- */
  const AppState = {
    // Current task parameters
    task: {
      item: "Medical Emergency Package",
      priority: "CRITICAL",
      gridSize: 10,
      start: { x: 0, y: 0 },
      pickup: { x: 1, y: 1 },
      dest: { x: 8, y: 8 },
      directions: 4,
      algorithm: "AUTO",
      mudCost: 3.5,
      safetyWeight: 1.5,
      obstacles: new Set(), // Set of "x,y" strings
      mud: new Set()        // Set of "x,y" strings
    },

    // Current active scenario id (or null if customized)
    activeScenarioId: 1,

    // Grid interaction mode
    gridEditMode: "OBS", // "OBS", "MUD", "START", "PICKUP", "DEST", "ERASE"

    // Multi-plan generated candidate plans
    candidatePlans: [],
    selectedPlan: null,

    // Precondition evaluation matrix
    preconditionCheck: {
      valid: false,
      details: []
    },

    // Simulation playback runtime state
    simulation: {
      isPlaying: false,
      timer: null,
      currentStepIndex: 0,
      speedMs: 400,
      steps: [], // Flattened list of action steps
      robotPos: { x: 0, y: 0 },
      hasCargo: false,
      delivered: false,
      costAccumulated: 0
    },

    // Statistics & Mission History
    metrics: {
      totalTasks: 6,
      completedTasks: 4,
      failedTasks: 2
    },
    history: []
  };

  /* --------------------------------------------------------------------------
   * 5. AI PLANNING ENGINE & PATHFINDING ALGORITHMS
   * -------------------------------------------------------------------------- */
  class AIPlanner {
    
    // Heuristic functions
    static manhattanDistance(a, b) {
      return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    static euclideanDistance(a, b) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    static octileDistance(a, b) {
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      return Math.min(dx, dy) * 1.414 + Math.abs(dx - dy);
    }

    // Directional offsets
    static getNeighbors(node, gridSize, directions, obstacles) {
      const neighbors = [];
      // 4 orthogonal movements
      const orthogonal = [
        { dx: 0, dy: -1, dir: "NORTH", baseCost: 1.0 },
        { dx: 0, dy: 1,  dir: "SOUTH", baseCost: 1.0 },
        { dx: 1, dy: 0,  dir: "EAST",  baseCost: 1.0 },
        { dx: -1, dy: 0, dir: "WEST",  baseCost: 1.0 }
      ];

      // 4 diagonal movements
      const diagonal = [
        { dx: 1, dy: -1,  dir: "NORTHEAST", baseCost: 1.414 },
        { dx: -1, dy: -1, dir: "NORTHWEST", baseCost: 1.414 },
        { dx: 1, dy: 1,   dir: "SOUTHEAST", baseCost: 1.414 },
        { dx: -1, dy: 1,  dir: "SOUTHWEST", baseCost: 1.414 }
      ];

      const moves = directions === 8 ? [...orthogonal, ...diagonal] : orthogonal;

      for (const m of moves) {
        const nx = node.x + m.dx;
        const ny = node.y + m.dy;
        const key = `${nx},${ny}`;

        // Guard: Bounds check
        if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) continue;
        // Guard: Obstacle collision check
        if (obstacles.has(key)) continue;

        // Diagonal corner cutting prevention (if 8-directional)
        if (directions === 8 && (m.dx !== 0 && m.dy !== 0)) {
          if (obstacles.has(`${node.x + m.dx},${node.y}`) && obstacles.has(`${node.x},${node.y + m.dy}`)) {
            continue; // blocked by adjacent corners
          }
        }

        neighbors.push({
          x: nx,
          y: ny,
          dir: m.dir,
          baseCost: m.baseCost
        });
      }

      return neighbors;
    }

    // Clearance / safety penalty calculation (distance to nearest obstacle)
    static calculateObstacleClearance(pos, obstacles) {
      if (obstacles.size === 0) return 3.0; // max clearance
      let minDist = Infinity;
      for (const obsKey of obstacles) {
        const [ox, oy] = obsKey.split(',').map(Number);
        const dist = Math.hypot(pos.x - ox, pos.y - oy);
        if (dist < minDist) minDist = dist;
      }
      return minDist;
    }

    /**
     * Core Search Engine implementing A*, Dijkstra, Greedy BFS & Safety-First
     */
    static findPath(start, goal, config) {
      const {
        gridSize,
        directions,
        obstacles,
        mud,
        mudCost,
        safetyWeight,
        algorithm
      } = config;

      // Special case: Item already at goal
      if (start.x === goal.x && start.y === goal.y) {
        return {
          found: true,
          path: [{ x: start.x, y: start.y, dir: "STATIONARY", stepCost: 0 }],
          totalCost: 0,
          stepsCount: 0,
          nodesExpanded: 0,
          avgClearance: AIPlanner.calculateObstacleClearance(start, obstacles)
        };
      }

      const openSet = new PriorityQueue();
      const startKey = `${start.x},${start.y}`;
      const goalKey = `${goal.x},${goal.y}`;

      const cameFrom = new Map();
      const gScore = new Map();
      const fScore = new Map();

      gScore.set(startKey, 0);

      // Heuristic selection
      const heuristic = (pos) => {
        if (algorithm === "DIJKSTRA") return 0;
        if (directions === 8) {
          return AIPlanner.octileDistance(pos, goal);
        }
        return AIPlanner.manhattanDistance(pos, goal);
      };

      const hStart = heuristic(start);
      fScore.set(startKey, algorithm === "GREEDY_BFS" ? hStart : hStart);
      openSet.enqueue({ x: start.x, y: start.y }, fScore.get(startKey));

      let nodesExpanded = 0;
      const closedSet = new Set();

      while (!openSet.isEmpty()) {
        const current = openSet.dequeue();
        const currentKey = `${current.x},${current.y}`;

        if (current.x === goal.x && current.y === goal.y) {
          // Reconstruct path
          const path = [];
          let curr = currentKey;
          let totalCost = gScore.get(curr);
          let clearanceSum = 0;

          while (cameFrom.has(curr)) {
            const entry = cameFrom.get(curr);
            const [cx, cy] = curr.split(',').map(Number);
            clearanceSum += AIPlanner.calculateObstacleClearance({ x: cx, y: cy }, obstacles);

            path.unshift({
              x: cx,
              y: cy,
              dir: entry.dir,
              stepCost: entry.stepCost
            });
            curr = entry.from;
          }

          // Prepend start node
          path.unshift({
            x: start.x,
            y: start.y,
            dir: "START",
            stepCost: 0
          });

          return {
            found: true,
            path: path,
            totalCost: parseFloat(totalCost.toFixed(2)),
            stepsCount: path.length - 1,
            nodesExpanded: nodesExpanded,
            avgClearance: path.length > 1 ? parseFloat((clearanceSum / (path.length - 1)).toFixed(2)) : 3.0
          };
        }

        if (closedSet.has(currentKey)) continue;
        closedSet.add(currentKey);
        nodesExpanded++;

        const neighbors = AIPlanner.getNeighbors(current, gridSize, directions, obstacles);

        for (const neighbor of neighbors) {
          const neighborKey = `${neighbor.x},${neighbor.y}`;
          if (closedSet.has(neighborKey)) continue;

          // Calculate terrain cost
          let cellWeight = neighbor.baseCost;
          if (mud.has(neighborKey)) {
            cellWeight *= mudCost;
          }

          // Safety-First penalty: cells close to obstacles incur a penalty
          if (algorithm === "SAFETY_FIRST" && safetyWeight > 0) {
            const clearance = AIPlanner.calculateObstacleClearance(neighbor, obstacles);
            if (clearance < 1.5) {
              cellWeight += (1.5 - clearance) * safetyWeight * 2.5;
            }
          }

          const tentativeGScore = gScore.get(currentKey) + cellWeight;

          if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
            cameFrom.set(neighborKey, {
              from: currentKey,
              dir: neighbor.dir,
              stepCost: parseFloat(cellWeight.toFixed(2))
            });

            gScore.set(neighborKey, tentativeGScore);

            let priorityVal;
            const hVal = heuristic(neighbor);

            if (algorithm === "GREEDY_BFS") {
              priorityVal = hVal;
            } else {
              priorityVal = tentativeGScore + hVal;
            }

            fScore.set(neighborKey, priorityVal);
            openSet.enqueue({ x: neighbor.x, y: neighbor.y }, priorityVal);
          }
        }
      }

      // No path found
      return {
        found: false,
        path: [],
        totalCost: Infinity,
        stepsCount: 0,
        nodesExpanded: nodesExpanded,
        avgClearance: 0
      };
    }

    /**
     * Formal Classical Planning Synthesis:
     * Evaluates preconditions, synthesizes Phase 1 (to pickup) and Phase 2 (to destination),
     * and constructs the full STRIPS execution plan schedule.
     */
    static synthesizeMissionPlan(task, algorithmType) {
      const startTime = performance.now();
      const preconditions = [];
      let allPreconditionsMet = true;

      // Guard 1: Grid boundary validation
      const inBounds = (p) => p.x >= 0 && p.x < task.gridSize && p.y >= 0 && p.y < task.gridSize;
      const startIn = inBounds(task.start);
      const pickupIn = inBounds(task.pickup);
      const destIn = inBounds(task.dest);

      preconditions.push({
        guard: "Grid Boundary Admissibility",
        formalism: "0 <= x, y < W && 0 <= x, y < H",
        state: `Start:(${task.start.x},${task.start.y}), Pickup:(${task.pickup.x},${task.pickup.y}), Dest:(${task.dest.x},${task.dest.y})`,
        passed: startIn && pickupIn && destIn,
        action: startIn && pickupIn && destIn ? "State Space Approved" : "Reject: Coordinates out of bounds"
      });
      if (!startIn || !pickupIn || !destIn) allPreconditionsMet = false;

      // Guard 2: Start not on obstacle
      const startCollision = task.obstacles.has(`${task.start.x},${task.start.y}`);
      preconditions.push({
        guard: "Robot Initial Coordinate Clearance",
        formalism: "~Obstacle(Robot_Start)",
        state: startCollision ? "COLLISION: Robot start placed on barrier" : "CLEAR: Coordinate accessible",
        passed: !startCollision,
        action: !startCollision ? "Initialize Rover State" : "Reject: Robot starts inside obstacle"
      });
      if (startCollision) allPreconditionsMet = false;

      // Guard 3: Pickup not on obstacle
      const pickupCollision = task.obstacles.has(`${task.pickup.x},${task.pickup.y}`);
      preconditions.push({
        guard: "Target Cargo Clearance",
        formalism: "~Obstacle(Cargo_Pickup)",
        state: pickupCollision ? "COLLISION: Item placed on barrier" : "CLEAR: Item accessible",
        passed: !pickupCollision,
        action: !pickupCollision ? "Valid Pickup Target" : "Reject: Cargo location blocked by obstacle"
      });
      if (pickupCollision) allPreconditionsMet = false;

      // Guard 4: Destination not on obstacle
      const destCollision = task.obstacles.has(`${task.dest.x},${task.dest.y}`);
      preconditions.push({
        guard: "Destination Terminal Clearance",
        formalism: "~Obstacle(Goal_Dest)",
        state: destCollision ? "COLLISION: Destination placed on barrier" : "CLEAR: Destination accessible",
        passed: !destCollision,
        action: !destCollision ? "Valid Dropoff Locker" : "Reject: Destination blocked by obstacle"
      });
      if (destCollision) allPreconditionsMet = false;

      // If spatial preconditions fail, terminate synthesis early
      if (!allPreconditionsMet) {
        return {
          valid: false,
          reason: "Spatial Preconditions Violated",
          preconditions,
          latencyMs: parseFloat((performance.now() - startTime).toFixed(2)),
          phase1: null,
          phase2: null,
          schedule: [],
          totalCost: Infinity,
          stepsCount: 0
        };
      }

      // Configure algorithm run
      const runConfig = {
        gridSize: task.gridSize,
        directions: task.directions,
        obstacles: task.obstacles,
        mud: task.mud,
        mudCost: task.mudCost,
        safetyWeight: task.safetyWeight,
        algorithm: algorithmType
      };

      // PHASE 1: Path from Robot Start to Pickup Point
      const phase1 = AIPlanner.findPath(task.start, task.pickup, runConfig);

      preconditions.push({
        guard: "Phase 1 Reachability (Start -> Pickup)",
        formalism: "Exists Continuous Path(Robot_0 -> Pickup)",
        state: phase1.found ? `Valid path found (${phase1.stepsCount} steps, cost: ${phase1.totalCost})` : "NO CONTINUOUS PATHWAY",
        passed: phase1.found,
        action: phase1.found ? "Approve Phase 1 Transit" : "Infeasible: Cargo Pickup is unreachable"
      });
      if (!phase1.found) allPreconditionsMet = false;

      // PHASE 2: Path from Pickup Point to Destination
      let phase2;
      if (task.pickup.x === task.dest.x && task.pickup.y === task.dest.y) {
        // Scenario 4: Item already at destination
        phase2 = {
          found: true,
          path: [{ x: task.dest.x, y: task.dest.y, dir: "STATIONARY", stepCost: 0 }],
          totalCost: 0,
          stepsCount: 0,
          nodesExpanded: 0,
          avgClearance: 3.0
        };
      } else {
        phase2 = AIPlanner.findPath(task.pickup, task.dest, runConfig);
      }

      preconditions.push({
        guard: "Phase 2 Reachability (Pickup -> Destination)",
        formalism: "Exists Continuous Path(Pickup -> Destination)",
        state: phase2.found ? `Valid path found (${phase2.stepsCount} steps, cost: ${phase2.totalCost})` : "NO CONTINUOUS PATHWAY",
        passed: phase2.found,
        action: phase2.found ? "Approve Phase 2 Transit" : "Infeasible: Destination is unreachable"
      });
      if (!phase2.found) allPreconditionsMet = false;

      const latency = parseFloat((performance.now() - startTime).toFixed(2));

      if (!allPreconditionsMet) {
        return {
          valid: false,
          reason: !phase1.found ? "Pickup Point Unreachable (Phase 1 Infeasible)" : "Destination Unreachable (Phase 2 Infeasible)",
          preconditions,
          latencyMs: latency,
          phase1: phase1.found ? phase1 : null,
          phase2: phase2.found ? phase2 : null,
          schedule: [],
          totalCost: Infinity,
          stepsCount: 0
        };
      }

      // Synthesize Sequential Execution Schedule
      const schedule = [];
      let stepNum = 1;
      let accumCost = 0;

      // Phase 1 Move Steps
      for (let i = 1; i < phase1.path.length; i++) {
        const prev = phase1.path[i - 1];
        const curr = phase1.path[i];
        accumCost += curr.stepCost;

        schedule.push({
          step: stepNum++,
          phase: "Phase 1: Transit to Pickup",
          operator: "MOVE",
          from: `(${prev.x}, ${prev.y})`,
          to: `(${curr.x}, ${curr.y})`,
          toPos: { x: curr.x, y: curr.y },
          direction: curr.dir,
          stepCost: curr.stepCost,
          accumCost: parseFloat(accumCost.toFixed(2)),
          cargoState: "EMPTY",
          status: "SCHEDULED"
        });
      }

      // Action: PICKUP
      schedule.push({
        step: stepNum++,
        phase: "Phase 1: Cargo Handshake",
        operator: "PICKUP",
        from: `(${task.pickup.x}, ${task.pickup.y})`,
        to: `(${task.pickup.x}, ${task.pickup.y})`,
        toPos: { x: task.pickup.x, y: task.pickup.y },
        direction: "GRASP_LOAD",
        stepCost: 0.0,
        accumCost: parseFloat(accumCost.toFixed(2)),
        cargoState: `HOLDING: ${task.item}`,
        status: "SCHEDULED"
      });

      // Phase 2 Move Steps (Transit to Destination)
      if (phase2.path.length > 1) {
        for (let i = 1; i < phase2.path.length; i++) {
          const prev = phase2.path[i - 1];
          const curr = phase2.path[i];
          accumCost += curr.stepCost;

          schedule.push({
            step: stepNum++,
            phase: "Phase 2: Cargo Delivery",
            operator: "MOVE",
            from: `(${prev.x}, ${prev.y})`,
            to: `(${curr.x}, ${curr.y})`,
            toPos: { x: curr.x, y: curr.y },
            direction: curr.dir,
            stepCost: curr.stepCost,
            accumCost: parseFloat(accumCost.toFixed(2)),
            cargoState: `HOLDING: ${task.item}`,
            status: "SCHEDULED"
          });
        }
      }

      // Action: DROPOFF
      schedule.push({
        step: stepNum++,
        phase: "Phase 2: Delivery Completion",
        operator: "DROPOFF",
        from: `(${task.dest.x}, ${task.dest.y})`,
        to: `(${task.dest.x}, ${task.dest.y})`,
        toPos: { x: task.dest.x, y: task.dest.y },
        direction: "RELEASE_LOCKER",
        stepCost: 0.0,
        accumCost: parseFloat(accumCost.toFixed(2)),
        cargoState: "DELIVERED",
        status: "SCHEDULED"
      });

      const totalPlanCost = parseFloat((phase1.totalCost + phase2.totalCost).toFixed(2));
      const totalSteps = schedule.length;
      const combinedClearance = parseFloat(((phase1.avgClearance + phase2.avgClearance) / 2).toFixed(2));
      const totalNodes = phase1.nodesExpanded + phase2.nodesExpanded;

      return {
        valid: true,
        preconditions,
        latencyMs: latency,
        phase1,
        phase2,
        schedule,
        totalCost: totalPlanCost,
        stepsCount: totalSteps,
        avgClearance: combinedClearance,
        nodesExpanded: totalNodes,
        algorithm: algorithmType
      };
    }

    /**
     * Generate and compare all candidate plans using distinct algorithms
     */
    static evaluateAllCandidatePlans(task) {
      const algorithms = [
        { key: "ASTAR_MANHATTAN", name: "A* Search", heuristic: "Manhattan Distance (Admissible)" },
        { key: "ASTAR_EUCLIDEAN", name: "A* Diagonal/Octile", heuristic: "Octile Distance (Metric)" },
        { key: "DIJKSTRA", name: "Dijkstra Algorithm", heuristic: "Zero Heuristic (Uniform Cost)" },
        { key: "SAFETY_FIRST", name: "Safety-First Cautious", heuristic: "Obstacle Distance Clearance Field" },
        { key: "GREEDY_BFS", name: "Greedy Best-First", heuristic: "Greedy Heuristic h(n)" }
      ];

      const candidates = [];

      for (let i = 0; i < algorithms.length; i++) {
        const alg = algorithms[i];
        const plan = AIPlanner.synthesizeMissionPlan(task, alg.key);
        candidates.push({
          planId: i + 1,
          key: alg.key,
          name: alg.name,
          heuristic: alg.heuristic,
          result: plan
        });
      }

      // Filter valid plans and select the lowest cost
      const validCandidates = candidates.filter(c => c.result.valid);

      let optimalCandidate = null;
      if (validCandidates.length > 0) {
        // Sort by lowest cost, then higher obstacle clearance, then fewer steps
        validCandidates.sort((a, b) => {
          if (Math.abs(a.result.totalCost - b.result.totalCost) > 0.001) {
            return a.result.totalCost - b.result.totalCost;
          }
          if (Math.abs(a.result.avgClearance - b.result.avgClearance) > 0.1) {
            return b.result.avgClearance - a.result.avgClearance; // prefer safer
          }
          return a.result.stepsCount - b.result.stepsCount;
        });
        optimalCandidate = validCandidates[0];
      }

      return {
        candidates,
        optimalCandidate
      };
    }
  }

  /* --------------------------------------------------------------------------
   * 6. UI RENDERER & SIMULATION CONTROLLER
   * -------------------------------------------------------------------------- */
  class SystemController {
    static init() {
      // 1. Setup UI navigation tabs
      SystemController.setupNavigation();

      // 2. Setup event listeners
      SystemController.setupEventListeners();

      // 3. Load default Scenario 1 (Normal Delivery)
      SystemController.loadScenario(1);

      // 4. Initial logging
      SystemController.log("SYSTEM", "AI-Based Delivery Robot Planning System Initialized v2.4", "info");
      SystemController.log("PLANNER", "Classical Planning Engine loaded (A*, Dijkstra, Safety Heuristics ready)", "plan");
      SystemController.log("BENCHMARK", "Scenario 1 loaded: Medical Package (1,1) -> (8,8)", "success");
    }

    /* Navigation handling */
    static setupNavigation() {
      const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
      navItems.forEach(item => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const targetId = item.getAttribute('data-target');
          SystemController.switchSection(targetId);
        });
      });

      // Quick links
      document.getElementById('dash-btn-simulate')?.addEventListener('click', () => {
        SystemController.switchSection('simulation-section');
      });
      document.getElementById('dash-btn-replan')?.addEventListener('click', () => {
        SystemController.generatePlan();
      });
      document.getElementById('btn-draw-on-grid')?.addEventListener('click', () => {
        SystemController.switchSection('simulation-section');
      });
    }

    static switchSection(targetSectionId) {
      document.querySelectorAll('.app-section').forEach(sec => sec.classList.remove('active'));
      document.querySelectorAll('.sidebar-nav .nav-item').forEach(it => it.classList.remove('active'));

      const activeSection = document.getElementById(targetSectionId);
      if (activeSection) activeSection.classList.add('active');

      const activeNavItem = document.querySelector(`.sidebar-nav .nav-item[data-target="${targetSectionId}"]`);
      if (activeNavItem) activeNavItem.classList.add('active');

      // Update page title
      const titles = {
        'dashboard-section': 'Operational Dashboard',
        'task-section': 'Create Mission & Constraints',
        'simulation-section': 'Robot Simulation Grid',
        'planning-section': 'AI Planning & Precondition Trace',
        'comparison-section': 'Alternative Route Comparison',
        'history-section': 'Mission History & Audit',
        'about-section': 'About & AI Formulation'
      };
      if (titles[targetSectionId]) {
        document.getElementById('current-page-title').textContent = titles[targetSectionId];
      }

      // Close mobile sidebar if open
      document.getElementById('sidebar').classList.remove('open');
    }

    /* Event Listeners Binding */
    static setupEventListeners() {
      // Sidebar mobile toggle
      document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
      });

      // Audio toggle button
      const soundBtn = document.getElementById('btn-sound-toggle');
      soundBtn.addEventListener('click', () => {
        const isEnabled = sound.toggle();
        if (isEnabled) {
          soundBtn.classList.remove('sound-muted');
          soundBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> <span>Sound ON</span>';
        } else {
          soundBtn.classList.add('sound-muted');
          soundBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i> <span>Sound OFF</span>';
        }
      });

      // Quick Scenarios Dropdown Menu Toggle
      const presetMenuBtn = document.getElementById('btn-preset-menu');
      const dropdownMenu = document.getElementById('scenarios-dropdown');
      presetMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
      });
      document.addEventListener('click', () => {
        dropdownMenu.classList.remove('show');
      });

      // Dropdown scenario items click
      document.querySelectorAll('#scenarios-dropdown .dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const scId = parseInt(item.getAttribute('data-scenario'), 10);
          SystemController.loadScenario(scId);
          dropdownMenu.classList.remove('show');
        });
      });

      // Dashboard scenario cards click
      document.querySelectorAll('.btn-scenario-card').forEach(btn => {
        btn.addEventListener('click', () => {
          const scId = parseInt(btn.getAttribute('data-scenario'), 10);
          SystemController.loadScenario(scId);
        });
      });

      // Master Generate AI Plan buttons
      document.getElementById('btn-topbar-plan').addEventListener('click', () => SystemController.generatePlan());
      document.getElementById('btn-form-generate').addEventListener('click', () => SystemController.generatePlan());
      document.getElementById('btn-submit-task').addEventListener('click', () => SystemController.generatePlan());
      document.getElementById('btn-recompute-plan')?.addEventListener('click', () => SystemController.generatePlan());
      document.getElementById('btn-re-evaluate-plans')?.addEventListener('click', () => SystemController.generatePlan());

      // Master Run Simulation button
      document.getElementById('btn-topbar-simulate').addEventListener('click', () => {
        SystemController.switchSection('simulation-section');
        SystemController.startSimulation();
      });

      // Form reset button
      document.getElementById('btn-reset-form').addEventListener('click', () => {
        SystemController.loadScenario(1);
        SystemController.showBanner("Form reset to default benchmark scenario (Scenario 1)", "info");
      });

      // Simulation Toolbar Edit Mode buttons
      document.querySelectorAll('#grid-mode-selector .tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#grid-mode-selector .tool-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          AppState.gridEditMode = btn.getAttribute('data-mode');
        });
      });

      // Clear Grid & Recenter
      document.getElementById('sim-btn-clear-map').addEventListener('click', () => {
        AppState.task.obstacles.clear();
        AppState.task.mud.clear();
        SystemController.renderGrid();
        SystemController.generatePlan();
        SystemController.log("MAP", "All obstacles and mud zones cleared from grid", "warning");
      });

      document.getElementById('sim-btn-recenter')?.addEventListener('click', () => {
        document.getElementById('grid-board-wrapper').scrollTo({ left: 0, top: 0, behavior: 'smooth' });
      });

      // Simulation Playback Controls
      document.getElementById('sim-btn-play').addEventListener('click', () => {
        if (AppState.simulation.isPlaying) {
          SystemController.pauseSimulation();
        } else {
          SystemController.startSimulation();
        }
      });

      document.getElementById('sim-btn-reset').addEventListener('click', () => {
        SystemController.resetSimulation();
      });

      document.getElementById('sim-btn-step-forward').addEventListener('click', () => {
        SystemController.pauseSimulation();
        SystemController.stepSimulation(1);
      });

      document.getElementById('sim-btn-step-back').addEventListener('click', () => {
        SystemController.pauseSimulation();
        SystemController.stepSimulation(-1);
      });

      // Timeline Scrubber
      document.getElementById('sim-scrubber').addEventListener('input', (e) => {
        SystemController.pauseSimulation();
        const targetStep = parseInt(e.target.value, 10);
        SystemController.jumpToStep(targetStep);
      });

      // Speed selection
      document.getElementById('sim-speed-select').addEventListener('change', (e) => {
        AppState.simulation.speedMs = parseInt(e.target.value, 10);
        if (AppState.simulation.isPlaying) {
          SystemController.pauseSimulation();
          SystemController.startSimulation();
        }
      });

      // Clear Activity Log
      document.getElementById('btn-clear-logs').addEventListener('click', () => {
        document.getElementById('dashboard-log-stream').innerHTML = '';
        document.getElementById('sim-terminal-log').innerHTML = '';
        document.getElementById('log-count-badge').textContent = '0 entries';
      });

      // Clear History
      document.getElementById('btn-clear-history')?.addEventListener('click', () => {
        AppState.history = [];
        SystemController.renderHistoryTable();
        SystemController.showBanner("Mission history cleared", "info");
      });

      // Export CSV
      document.getElementById('btn-export-history')?.addEventListener('click', () => {
        SystemController.exportHistoryCSV();
      });

      // Export Plan JSON
      document.getElementById('btn-export-plan')?.addEventListener('click', () => {
        SystemController.exportPlanJSON();
      });

      // Banner close
      document.getElementById('banner-close').addEventListener('click', () => {
        document.getElementById('system-banner').classList.add('hidden');
      });

      // Grid Size changes in form
      document.getElementById('input-grid-size').addEventListener('change', (e) => {
        AppState.task.gridSize = parseInt(e.target.value, 10);
        SystemController.renderGrid();
        SystemController.generatePlan();
      });
    }

    /* ------------------------------------------------------------------------
     * Scenario Loader
     * ------------------------------------------------------------------------ */
    static loadScenario(scenarioId) {
      const sc = SCENARIO_PRESETS[scenarioId];
      if (!sc) return;

      AppState.activeScenarioId = scenarioId;

      // Populate Task parameters
      AppState.task.item = sc.item;
      AppState.task.priority = sc.priority;
      AppState.task.gridSize = sc.gridSize;
      AppState.task.start = { ...sc.start };
      AppState.task.pickup = { ...sc.pickup };
      AppState.task.dest = { ...sc.dest };
      AppState.task.directions = sc.directions;
      AppState.task.algorithm = sc.algorithm;
      AppState.task.mudCost = sc.mudCost;
      AppState.task.safetyWeight = sc.safetyWeight;

      // Reset & set obstacles
      AppState.task.obstacles = new Set(sc.obstacles.map(o => `${o.x},${o.y}`));
      AppState.task.mud = new Set(sc.mud.map(m => `${m.x},${m.y}`));

      // Sync form fields
      document.getElementById('input-item-name').value = sc.item;
      document.getElementById('input-priority').value = sc.priority;
      document.getElementById('input-grid-size').value = sc.gridSize;
      document.getElementById('input-robot-x').value = sc.start.x;
      document.getElementById('input-robot-y').value = sc.start.y;
      document.getElementById('input-pickup-x').value = sc.pickup.x;
      document.getElementById('input-pickup-y').value = sc.pickup.y;
      document.getElementById('input-dest-x').value = sc.dest.x;
      document.getElementById('input-dest-y').value = sc.dest.y;
      document.getElementById('input-mud-cost').value = sc.mudCost;
      document.getElementById('input-safety-weight').value = sc.safetyWeight;

      // Movement radio
      const rad4 = document.querySelector('input[name="movement-directions"][value="4"]');
      const rad8 = document.querySelector('input[name="movement-directions"][value="8"]');
      if (sc.directions === 8 && rad8) rad8.checked = true;
      else if (rad4) rad4.checked = true;

      // Topbar tag
      document.getElementById('current-scenario-tag').textContent = sc.tag;

      // Re-render visual grid
      SystemController.renderGrid();

      // Trigger automatic plan generation
      SystemController.generatePlan();

      SystemController.log("BENCHMARK", `Loaded Scenario ${sc.id}: ${sc.name}`, "info");
      SystemController.showBanner(`Loaded Scenario ${sc.id}: ${sc.name} — ${sc.description}`, sc.id === 2 || sc.id === 3 || sc.id === 6 ? "warning" : "success");
    }

    /* ------------------------------------------------------------------------
     * Read Input Form & Synchronize AppState
     * ------------------------------------------------------------------------ */
    static readFormInputs() {
      AppState.task.item = document.getElementById('input-item-name').value.trim();
      AppState.task.priority = document.getElementById('input-priority').value;
      AppState.task.gridSize = parseInt(document.getElementById('input-grid-size').value, 10);
      AppState.task.start = {
        x: parseInt(document.getElementById('input-robot-x').value, 10),
        y: parseInt(document.getElementById('input-robot-y').value, 10)
      };
      AppState.task.pickup = {
        x: parseInt(document.getElementById('input-pickup-x').value, 10),
        y: parseInt(document.getElementById('input-pickup-y').value, 10)
      };
      AppState.task.dest = {
        x: parseInt(document.getElementById('input-dest-x').value, 10),
        y: parseInt(document.getElementById('input-dest-y').value, 10)
      };
      AppState.task.mudCost = parseFloat(document.getElementById('input-mud-cost').value) || 3.5;
      AppState.task.safetyWeight = parseFloat(document.getElementById('input-safety-weight').value) || 1.5;

      const checkedDir = document.querySelector('input[name="movement-directions"]:checked');
      AppState.task.directions = checkedDir ? parseInt(checkedDir.value, 10) : 4;

      const algSelect = document.getElementById('select-algorithm').value;
      AppState.task.algorithm = algSelect;

      // Parse custom obstacle text if present
      const customObsText = document.getElementById('input-custom-obstacles').value.trim();
      if (customObsText) {
        try {
          const pairs = customObsText.match(/\(?\s*(-?\d+)\s*,\s*(-?\d+)\s*\)?/g);
          if (pairs) {
            pairs.forEach(p => {
              const m = p.match(/(-?\d+)\s*,\s*(-?\d+)/);
              if (m) {
                AppState.task.obstacles.add(`${parseInt(m[1], 10)},${parseInt(m[2], 10)}`);
              }
            });
          }
        } catch (e) {}
      }
    }

    /* ------------------------------------------------------------------------
     * Generate AI Plan
     * ------------------------------------------------------------------------ */
    static generatePlan() {
      // 1. Read current inputs
      SystemController.readFormInputs();

      // Validate Task specification guard (Scenario 6 checks)
      const validationErrors = [];
      if (!AppState.task.item) {
        validationErrors.push("Item Name cannot be blank.");
      }
      if (isNaN(AppState.task.start.x) || isNaN(AppState.task.start.y) ||
          isNaN(AppState.task.pickup.x) || isNaN(AppState.task.pickup.y) ||
          isNaN(AppState.task.dest.x) || isNaN(AppState.task.dest.y)) {
        validationErrors.push("Coordinates must be valid integers.");
      }
      const inBounds = (p) => p.x >= 0 && p.x < AppState.task.gridSize && p.y >= 0 && p.y < AppState.task.gridSize;
      if (!inBounds(AppState.task.start)) {
        validationErrors.push(`Robot Start (${AppState.task.start.x},${AppState.task.start.y}) is outside the ${AppState.task.gridSize}x${AppState.task.gridSize} grid.`);
      }
      if (!inBounds(AppState.task.pickup)) {
        validationErrors.push(`Pickup point (${AppState.task.pickup.x},${AppState.task.pickup.y}) is outside the ${AppState.task.gridSize}x${AppState.task.gridSize} grid.`);
      }
      if (!inBounds(AppState.task.dest)) {
        validationErrors.push(`Destination (${AppState.task.dest.x},${AppState.task.dest.y}) is outside the ${AppState.task.gridSize}x${AppState.task.gridSize} grid.`);
      }

      if (validationErrors.length > 0) {
        sound.playError();
        SystemController.showBanner("Task Specification Invalid: " + validationErrors.join(" "), "danger");
        SystemController.log("VALIDATION", "Task rejected: " + validationErrors.join("; "), "danger");
        SystemController.handlePlanningFailure(validationErrors.join(" "));
        return;
      }

      SystemController.log("PLANNER", `Evaluating state space for item: '${AppState.task.item}'...`, "info");

      // 2. Run multi-plan candidate evaluation across algorithms
      const evalResult = AIPlanner.evaluateAllCandidatePlans(AppState.task);
      AppState.candidatePlans = evalResult.candidates;

      // Determine selected plan: if user forced an algorithm, find that one; otherwise optimal
      let chosenCandidate = evalResult.optimalCandidate;
      if (AppState.task.algorithm !== "AUTO") {
        const found = evalResult.candidates.find(c => c.key === AppState.task.algorithm);
        if (found && found.result.valid) chosenCandidate = found;
      }

      AppState.selectedPlan = chosenCandidate ? chosenCandidate.result : null;

      // 3. Update Preconditions Table
      SystemController.renderPreconditionsTable(chosenCandidate ? chosenCandidate.result.preconditions : (evalResult.candidates[0] ? evalResult.candidates[0].result.preconditions : []));

      // 4. Update Alternative Plans Comparison Table & Charts
      SystemController.renderComparisonSection(evalResult.candidates, chosenCandidate);

      // 5. Update KPI Cards and Workflow on Dashboard
      if (chosenCandidate && chosenCandidate.result.valid) {
        SystemController.handlePlanningSuccess(chosenCandidate);
      } else {
        const failReason = evalResult.candidates[0]?.result?.reason || "No valid path exists satisfying all constraints";
        SystemController.handlePlanningFailure(failReason);
      }

      // 6. Refresh simulation grid visuals with the planned routes
      SystemController.renderGrid();
      SystemController.resetSimulation();
    }

    static handlePlanningSuccess(candidate) {
      const plan = candidate.result;
      document.getElementById('btn-topbar-simulate').disabled = false;
      document.getElementById('sim-btn-play').disabled = false;

      // Update Dashboard KPIs
      document.getElementById('kpi-robot-status').textContent = "PLAN READY";
      document.getElementById('kpi-robot-status').className = "kpi-value text-green";
      document.getElementById('kpi-robot-pos').textContent = `Start: (${AppState.task.start.x}, ${AppState.task.start.y})`;
      document.getElementById('kpi-pickup-loc').textContent = `(${AppState.task.pickup.x}, ${AppState.task.pickup.y})`;
      document.getElementById('kpi-item-name').textContent = `Item: ${AppState.task.item}`;
      document.getElementById('kpi-dest-loc').textContent = `(${AppState.task.dest.x}, ${AppState.task.dest.y})`;
      document.getElementById('kpi-total-cost').textContent = plan.totalCost.toFixed(1);
      document.getElementById('kpi-cost-breakdown').textContent = `Phase 1: ${plan.phase1.totalCost.toFixed(1)} | Phase 2: ${plan.phase2.totalCost.toFixed(1)}`;
      document.getElementById('kpi-route-steps').textContent = `${plan.stepsCount} Actions`;
      document.getElementById('kpi-algorithm-used').textContent = candidate.name;

      // Sidebar battery and status
      document.getElementById('nav-status-dot').className = "status-dot pulse-green";
      document.getElementById('nav-status-text').textContent = "PLAN VERIFIED";

      // Dashboard Mission Specs
      document.getElementById('dash-spec-obstacles').textContent = `${AppState.task.obstacles.size} obstacles`;
      document.getElementById('dash-spec-movement').textContent = AppState.task.directions === 8 ? "8-Dir (with Diagonals)" : "4-Dir Orthogonal";
      document.getElementById('dash-spec-energy').textContent = `${plan.totalCost.toFixed(1)} Energy Units`;
      document.getElementById('dash-spec-alts').textContent = `${AppState.candidatePlans.length} Candidate Plans`;

      // Workflow indicators
      document.getElementById('wf-step-1').className = "workflow-step active";
      document.getElementById('wf-text-1').textContent = "Preconditions Verified";
      document.getElementById('wf-conn-1').className = "workflow-connector done";

      document.getElementById('wf-step-2').className = "workflow-step active";
      document.getElementById('wf-text-2').textContent = `Path: ${plan.phase1.stepsCount} steps (Cost: ${plan.phase1.totalCost})`;
      document.getElementById('wf-conn-2').className = "workflow-connector done";

      document.getElementById('wf-step-3').className = "workflow-step active";
      document.getElementById('wf-text-3').textContent = `${AppState.task.item}`;
      document.getElementById('wf-conn-3').className = "workflow-connector done";

      document.getElementById('wf-step-4').className = "workflow-step active";
      document.getElementById('wf-text-4').textContent = `Path: ${plan.phase2.stepsCount} steps (Cost: ${plan.phase2.totalCost})`;
      document.getElementById('wf-conn-4').className = "workflow-connector done";

      document.getElementById('wf-step-5').className = "workflow-step active";
      document.getElementById('wf-text-5').textContent = "Dropoff Planned";

      // Render Step Schedule Table in Section 4
      SystemController.renderPlanScheduleTable(plan.schedule, plan.totalCost, plan.latencyMs);

      // Scrubber limits
      const scrubber = document.getElementById('sim-scrubber');
      scrubber.max = plan.schedule.length;
      scrubber.value = 0;
      document.getElementById('sim-step-indicator').textContent = `Step: 0 / ${plan.schedule.length}`;

      SystemController.showBanner(`Optimal AI Plan Generated via ${candidate.name} (${plan.stepsCount} actions, Cost: ${plan.totalCost})`, "success");
      SystemController.log("PLANNER", `Optimal Plan Selected: ${candidate.name} | Total Cost: ${plan.totalCost} | Steps: ${plan.stepsCount} | Compute: ${plan.latencyMs}ms`, "success");
    }

    static handlePlanningFailure(reason) {
      document.getElementById('btn-topbar-simulate').disabled = true;
      document.getElementById('sim-btn-play').disabled = true;

      document.getElementById('kpi-robot-status').textContent = "PLAN FAILED";
      document.getElementById('kpi-robot-status').className = "kpi-value text-danger";
      document.getElementById('kpi-total-cost').textContent = "INFEASIBLE";
      document.getElementById('kpi-route-steps').textContent = "0 Steps";

      document.getElementById('nav-status-dot').className = "status-dot pulse-red";
      document.getElementById('nav-status-text').textContent = "INFEASIBLE MISSION";

      document.getElementById('wf-step-1').className = "workflow-step active";
      document.getElementById('wf-text-1').textContent = "Precondition Aborted";
      document.getElementById('wf-conn-1').className = "workflow-connector";
      document.getElementById('wf-step-2').className = "workflow-step";
      document.getElementById('wf-conn-2').className = "workflow-connector";
      document.getElementById('wf-step-3').className = "workflow-step";
      document.getElementById('wf-conn-3').className = "workflow-connector";
      document.getElementById('wf-step-4').className = "workflow-step";
      document.getElementById('wf-conn-4').className = "workflow-connector";
      document.getElementById('wf-step-5').className = "workflow-step";

      document.getElementById('plan-schedule-table-body').innerHTML = `
        <tr>
          <td colspan="10" class="text-center text-danger" style="padding: 2rem;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; margin-bottom: 0.5rem; display:block;"></i>
            <strong>Planning Aborted: ${reason}</strong><br>
            <span class="text-muted text-sm">Review preconditions table and remove blocking obstacles or adjust coordinates.</span>
          </td>
        </tr>
      `;

      sound.playError();
      SystemController.showBanner(`Planning Failed: ${reason}`, "danger");
      SystemController.log("PLANNER", `Execution rejected: ${reason}`, "danger");
    }

    /* ------------------------------------------------------------------------
     * Grid Rendering & Interaction
     * ------------------------------------------------------------------------ */
    static renderGrid() {
      const container = document.getElementById('grid-container');
      container.innerHTML = '';

      const size = AppState.task.gridSize;
      container.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

      // Build route path lookups for Phase 1 and Phase 2
      const phase1Map = new Map();
      const phase2Map = new Map();

      if (AppState.selectedPlan && AppState.selectedPlan.valid) {
        if (AppState.selectedPlan.phase1 && AppState.selectedPlan.phase1.path) {
          AppState.selectedPlan.phase1.path.forEach((p, idx) => {
            if (idx > 0) phase1Map.set(`${p.x},${p.y}`, idx);
          });
        }
        if (AppState.selectedPlan.phase2 && AppState.selectedPlan.phase2.path) {
          AppState.selectedPlan.phase2.path.forEach((p, idx) => {
            if (idx > 0) phase2Map.set(`${p.x},${p.y}`, idx);
          });
        }
      }

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const key = `${x},${y}`;
          const cell = document.createElement('div');
          cell.className = 'grid-cell';
          cell.setAttribute('data-x', x);
          cell.setAttribute('data-y', y);

          // Coordinate label
          const coord = document.createElement('span');
          coord.className = 'cell-coord';
          coord.textContent = `${x},${y}`;
          cell.appendChild(coord);

          // Check cell type
          const isStart = (x === AppState.task.start.x && y === AppState.task.start.y);
          const isPickup = (x === AppState.task.pickup.x && y === AppState.task.pickup.y);
          const isDest = (x === AppState.task.dest.x && y === AppState.task.dest.y);
          const isObstacle = AppState.task.obstacles.has(key);
          const isMud = AppState.task.mud.has(key);

          if (isObstacle) {
            cell.classList.add('cell-obstacle');
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-shield-halved';
            cell.appendChild(icon);
          } else if (isMud) {
            cell.classList.add('cell-mud');
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-water';
            cell.appendChild(icon);
          }

          // Paths
          if (!isObstacle && phase1Map.has(key) && !isPickup && !isStart) {
            cell.classList.add('cell-path-phase1');
            const badge = document.createElement('span');
            badge.className = 'cell-step-num';
            badge.textContent = `P1:${phase1Map.get(key)}`;
            cell.appendChild(badge);
          } else if (!isObstacle && phase2Map.has(key) && !isDest && !isPickup) {
            cell.classList.add('cell-path-phase2');
            const badge = document.createElement('span');
            badge.className = 'cell-step-num';
            badge.textContent = `P2:${phase2Map.get(key)}`;
            cell.appendChild(badge);
          }

          // Special locations
          if (isStart) {
            cell.classList.add('cell-start');
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-robot';
            icon.title = 'Robot Start';
            cell.appendChild(icon);
          }

          if (isPickup) {
            cell.classList.add('cell-pickup');
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-box';
            icon.title = `Pickup Item: ${AppState.task.item}`;
            cell.appendChild(icon);
          }

          if (isDest) {
            cell.classList.add('cell-dest');
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-flag-checkered';
            icon.title = 'Destination Locker';
            cell.appendChild(icon);
          }

          // Active Robot Marker during simulation
          if (AppState.simulation.robotPos.x === x && AppState.simulation.robotPos.y === y) {
            cell.classList.add('cell-robot-active');
            const rIcon = document.createElement('i');
            rIcon.className = 'fa-solid fa-robot robot-sprite';
            cell.appendChild(rIcon);
          }

          // Click handler to paint or modify cell
          cell.addEventListener('click', () => SystemController.handleCellClick(x, y));

          container.appendChild(cell);
        }
      }
    }

    static handleCellClick(x, y) {
      const key = `${x},${y}`;
      const mode = AppState.gridEditMode;

      if (mode === "OBS") {
        if (AppState.task.obstacles.has(key)) {
          AppState.task.obstacles.delete(key);
        } else {
          // Cannot place obstacle on start, pickup or dest
          if ((x === AppState.task.start.x && y === AppState.task.start.y) ||
              (x === AppState.task.pickup.x && y === AppState.task.pickup.y) ||
              (x === AppState.task.dest.x && y === AppState.task.dest.y)) {
            SystemController.showBanner("Cannot place obstacle directly on start, pickup or destination!", "warning");
            return;
          }
          AppState.task.obstacles.add(key);
          AppState.task.mud.delete(key);
        }
      } else if (mode === "MUD") {
        if (AppState.task.mud.has(key)) {
          AppState.task.mud.delete(key);
        } else {
          AppState.task.mud.add(key);
          AppState.task.obstacles.delete(key);
        }
      } else if (mode === "START") {
        AppState.task.start = { x, y };
        AppState.task.obstacles.delete(key);
        document.getElementById('input-robot-x').value = x;
        document.getElementById('input-robot-y').value = y;
      } else if (mode === "PICKUP") {
        AppState.task.pickup = { x, y };
        AppState.task.obstacles.delete(key);
        document.getElementById('input-pickup-x').value = x;
        document.getElementById('input-pickup-y').value = y;
      } else if (mode === "DEST") {
        AppState.task.dest = { x, y };
        AppState.task.obstacles.delete(key);
        document.getElementById('input-dest-x').value = x;
        document.getElementById('input-dest-y').value = y;
      } else if (mode === "ERASE") {
        AppState.task.obstacles.delete(key);
        AppState.task.mud.delete(key);
      }

      SystemController.renderGrid();
      SystemController.generatePlan();
    }

    /* ------------------------------------------------------------------------
     * Preconditions Table Renderer
     * ------------------------------------------------------------------------ */
    static renderPreconditionsTable(preconditions) {
      const tbody = document.getElementById('preconditions-table-body');
      tbody.innerHTML = '';

      let allPassed = true;

      preconditions.forEach(p => {
        if (!p.passed) allPassed = false;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${p.guard}</strong></td>
          <td><code class="font-mono text-accent">${p.formalism}</code></td>
          <td>${p.state}</td>
          <td>
            <span class="badge ${p.passed ? 'badge-success' : 'badge-danger'}">
              <i class="fa-solid ${p.passed ? 'fa-check' : 'fa-xmark'}"></i>
              ${p.passed ? 'PASSED' : 'VIOLATED'}
            </span>
          </td>
          <td><strong>${p.action}</strong></td>
        `;
        tbody.appendChild(tr);
      });

      const badge = document.getElementById('plan-verif-badge');
      if (allPassed && preconditions.length > 0) {
        badge.className = "badge badge-success";
        badge.textContent = "ALL PRECONDITIONS SATISFIED";
      } else {
        badge.className = "badge badge-danger";
        badge.textContent = "PRECONDITION VIOLATION DETECTED";
      }
    }

    /* ------------------------------------------------------------------------
     * Step Action Schedule Table Renderer
     * ------------------------------------------------------------------------ */
    static renderPlanScheduleTable(schedule, totalCost, latencyMs) {
      const tbody = document.getElementById('plan-schedule-table-body');
      tbody.innerHTML = '';

      document.getElementById('plan-metadata-summary').textContent = 
        `${schedule.length} Total Actions | Accumulated Cost: ${totalCost} | Compute: ${latencyMs}ms`;

      schedule.forEach((s) => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-step-index', s.step);

        let opBadge = "badge-info";
        if (s.operator === "PICKUP") opBadge = "badge-warning";
        if (s.operator === "DROPOFF") opBadge = "badge-success";

        tr.innerHTML = `
          <td><strong class="font-mono">${s.step}</strong></td>
          <td><small class="text-muted">${s.phase}</small></td>
          <td><span class="badge ${opBadge}">${s.operator}</span></td>
          <td class="font-mono">${s.from}</td>
          <td class="font-mono">${s.to}</td>
          <td><span class="text-dim text-xs">${s.direction}</span></td>
          <td class="font-mono">+${s.stepCost.toFixed(2)}</td>
          <td class="font-mono text-green">${s.accumCost.toFixed(2)}</td>
          <td><small class="${s.cargoState.startsWith('HOLDING') ? 'text-warning' : 'text-dim'}">${s.cargoState}</small></td>
          <td><span class="badge badge-info" id="table-step-status-${s.step}">READY</span></td>
        `;
        tbody.appendChild(tr);
      });
    }

    /* ------------------------------------------------------------------------
     * Alternative Route Comparison Table & Charts Renderer
     * ------------------------------------------------------------------------ */
    static renderComparisonSection(candidates, optimalCandidate) {
      const tbody = document.getElementById('comparison-table-body');
      tbody.innerHTML = '';

      const costContainer = document.getElementById('cost-bars-container');
      costContainer.innerHTML = '';

      const safetyContainer = document.getElementById('safety-bars-container');
      safetyContainer.innerHTML = '';

      // Find max cost for relative bar scaling
      const validCosts = candidates.filter(c => c.result.valid).map(c => c.result.totalCost);
      const maxCost = validCosts.length > 0 ? Math.max(...validCosts, 1) : 20;

      candidates.forEach((c) => {
        const plan = c.result;
        const isOptimal = (optimalCandidate && optimalCandidate.planId === c.planId);

        const tr = document.createElement('tr');
        if (isOptimal) tr.className = 'row-selected';

        tr.innerHTML = `
          <td><strong class="font-mono">#${c.planId}</strong></td>
          <td><strong>${c.name}</strong></td>
          <td><small class="text-muted font-mono">${c.heuristic}</small></td>
          <td class="font-mono">${plan.valid ? plan.stepsCount + ' steps' : 'N/A'}</td>
          <td class="font-mono ${isOptimal ? 'text-green font-bold' : ''}">
            ${plan.valid ? plan.totalCost.toFixed(2) : '<span class="text-danger">&infin;</span>'}
          </td>
          <td class="font-mono">${plan.valid ? plan.avgClearance.toFixed(1) + ' units' : '0.0'}</td>
          <td class="font-mono">${plan.valid ? plan.nodesExpanded : '0'}</td>
          <td>
            <span class="badge ${plan.valid ? 'badge-success' : 'badge-danger'}">
              ${plan.valid ? 'VALID' : 'INFEASIBLE'}
            </span>
          </td>
          <td>
            ${isOptimal ? '<span class="badge badge-success"><i class="fa-solid fa-trophy"></i> OPTIMAL PLAN</span>' : 
              (plan.valid ? '<span class="badge badge-info">Candidate</span>' : '<span class="badge badge-danger">Rejected</span>')}
          </td>
        `;
        tbody.appendChild(tr);

        // Chart Bars
        if (plan.valid) {
          // Cost Bar
          const costPct = Math.min(100, Math.max(10, (plan.totalCost / maxCost) * 100));
          const costRow = document.createElement('div');
          costRow.className = 'chart-bar-row';
          costRow.innerHTML = `
            <div class="chart-bar-label">
              <span><strong>Plan #${c.planId}:</strong> ${c.name}</span>
              <span class="font-mono ${isOptimal ? 'text-green' : ''}">${plan.totalCost.toFixed(1)} Cost</span>
            </div>
            <div class="chart-track">
              <div class="chart-fill ${isOptimal ? 'fill-optimal' : 'fill-regular'}" style="width: ${costPct}%;"></div>
            </div>
          `;
          costContainer.appendChild(costRow);

          // Safety Bar (0 to 3 scale)
          const safetyPct = Math.min(100, (plan.avgClearance / 3.0) * 100);
          const safetyRow = document.createElement('div');
          safetyRow.className = 'chart-bar-row';
          safetyRow.innerHTML = `
            <div class="chart-bar-label">
              <span><strong>Plan #${c.planId}:</strong> ${c.name}</span>
              <span class="font-mono">${plan.avgClearance.toFixed(1)} Clearance</span>
            </div>
            <div class="chart-track">
              <div class="chart-fill ${safetyPct > 60 ? 'fill-optimal' : 'fill-suboptimal'}" style="width: ${safetyPct}%;"></div>
            </div>
          `;
          safetyContainer.appendChild(safetyRow);
        }
      });

      // Justification Box
      const justBox = document.getElementById('selection-justification-box');
      if (optimalCandidate && optimalCandidate.result.valid) {
        justBox.innerHTML = `
          <p class="text-success mb-1">
            <i class="fa-solid fa-circle-check"></i> 
            <strong>Plan #${optimalCandidate.planId} (${optimalCandidate.name})</strong> has been mathematically selected as the optimal plan.
          </p>
          <p class="text-sm text-muted">
            The planner evaluated ${candidates.length} algorithms. Plan #${optimalCandidate.planId} achieved the lowest cumulative energy expenditure 
            of <strong>${optimalCandidate.result.totalCost.toFixed(2)} units</strong> across both Phase 1 (transit to pickup) and Phase 2 (delivery). 
            With an average obstacle clearance margin of <strong>${optimalCandidate.result.avgClearance} units</strong>, it avoids narrow collision pinch-points 
            while expanding <strong>${optimalCandidate.result.nodesExpanded} nodes</strong> within ${optimalCandidate.result.latencyMs}ms.
          </p>
        `;
      } else {
        justBox.innerHTML = `
          <p class="text-danger">
            <i class="fa-solid fa-circle-xmark"></i> 
            <strong>No Valid Plan Feasible:</strong> All candidate planners failed to discover a valid continuous corridor between the specified start, pickup, and destination nodes.
          </p>
        `;
      }
    }

    /* ------------------------------------------------------------------------
     * SIMULATION PLAYBACK ENGINE
     * ------------------------------------------------------------------------ */
    static startSimulation() {
      if (!AppState.selectedPlan || !AppState.selectedPlan.valid) {
        SystemController.showBanner("Cannot run simulation: No valid AI plan generated!", "warning");
        return;
      }

      AppState.simulation.isPlaying = true;
      document.getElementById('sim-play-icon').className = 'fa-solid fa-pause';
      document.getElementById('hud-status-badge').className = 'badge badge-warning';
      document.getElementById('hud-status-badge').textContent = 'EXECUTING';

      // Load steps into simulation
      AppState.simulation.steps = AppState.selectedPlan.schedule;

      if (AppState.simulation.currentStepIndex >= AppState.simulation.steps.length) {
        SystemController.resetSimulation();
      }

      SystemController.log("ROBOT", "Autonomous navigation sequence started...", "info");

      // Clear any running timer
      if (AppState.simulation.timer) clearInterval(AppState.simulation.timer);

      AppState.simulation.timer = setInterval(() => {
        SystemController.executeNextStep();
      }, AppState.simulation.speedMs);
    }

    static pauseSimulation() {
      AppState.simulation.isPlaying = false;
      if (AppState.simulation.timer) clearInterval(AppState.simulation.timer);
      document.getElementById('sim-play-icon').className = 'fa-solid fa-play';
      document.getElementById('hud-status-badge').className = 'badge badge-info';
      document.getElementById('hud-status-badge').textContent = 'PAUSED';
    }

    static resetSimulation() {
      SystemController.pauseSimulation();
      AppState.simulation.currentStepIndex = 0;
      AppState.simulation.robotPos = { ...AppState.task.start };
      AppState.simulation.hasCargo = false;
      AppState.simulation.delivered = false;
      AppState.simulation.costAccumulated = 0;

      // Reset milestones
      for (let i = 1; i <= 6; i++) {
        const ms = document.getElementById(`ms-${i}`);
        if (ms) ms.className = 'milestone-item';
      }

      // Reset table status badges
      if (AppState.selectedPlan && AppState.selectedPlan.schedule) {
        AppState.selectedPlan.schedule.forEach(s => {
          const badge = document.getElementById(`table-step-status-${s.step}`);
          if (badge) {
            badge.className = 'badge badge-info';
            badge.textContent = 'READY';
          }
        });
      }

      // Reset HUD
      document.getElementById('robot-cargo-dot').classList.remove('loaded');
      document.getElementById('hud-cargo-status').textContent = 'EMPTY';
      document.getElementById('hud-cargo-status').className = 'value text-warning';
      document.getElementById('hud-cost-consumed').textContent = `0.0 / ${AppState.selectedPlan ? AppState.selectedPlan.totalCost : 0} Units`;
      document.getElementById('hud-current-action').textContent = 'STANDBY';
      document.getElementById('hud-robot-coordinates').textContent = `Coordinates: X=${AppState.task.start.x}, Y=${AppState.task.start.y}`;
      document.getElementById('hud-status-badge').className = 'badge badge-success';
      document.getElementById('hud-status-badge').textContent = 'READY';
      document.getElementById('sim-step-indicator').textContent = `Step: 0 / ${AppState.simulation.steps.length}`;
      document.getElementById('sim-scrubber').value = 0;

      // Update milestone 1
      const ms1 = document.getElementById('ms-1');
      if (ms1) ms1.className = 'milestone-item done';

      SystemController.renderGrid();
    }

    static executeNextStep() {
      if (AppState.simulation.currentStepIndex >= AppState.simulation.steps.length) {
        SystemController.completeMission();
        return;
      }

      const step = AppState.simulation.steps[AppState.simulation.currentStepIndex];
      AppState.simulation.currentStepIndex++;

      // Update robot position
      AppState.simulation.robotPos = { ...step.toPos };
      AppState.simulation.costAccumulated = step.accumCost;

      // Play sound
      sound.playMove();

      // Handle special actions
      if (step.operator === "PICKUP") {
        AppState.simulation.hasCargo = true;
        sound.playPickup();
        document.getElementById('robot-cargo-dot').classList.add('loaded');
        document.getElementById('hud-cargo-status').textContent = `LOADED: ${AppState.task.item}`;
        document.getElementById('hud-cargo-status').className = 'value text-success';
        SystemController.log("CARGO", `Successfully loaded item '${AppState.task.item}' at (${step.toPos.x},${step.toPos.y})`, "success");
        
        const ms2 = document.getElementById('ms-2');
        const ms3 = document.getElementById('ms-3');
        if (ms2) ms2.className = 'milestone-item done';
        if (ms3) ms3.className = 'milestone-item done';
      } else if (step.operator === "DROPOFF") {
        AppState.simulation.hasCargo = false;
        AppState.simulation.delivered = true;
        sound.playDelivery();
        document.getElementById('robot-cargo-dot').classList.remove('loaded');
        document.getElementById('hud-cargo-status').textContent = `DELIVERED`;
        document.getElementById('hud-cargo-status').className = 'value text-accent';
        SystemController.log("DELIVERY", `Delivered '${AppState.task.item}' to destination locker (${step.toPos.x},${step.toPos.y})`, "success");

        const ms4 = document.getElementById('ms-4');
        const ms5 = document.getElementById('ms-5');
        const ms6 = document.getElementById('ms-6');
        if (ms4) ms4.className = 'milestone-item done';
        if (ms5) ms5.className = 'milestone-item done';
        if (ms6) ms6.className = 'milestone-item done';
      } else {
        // Normal Move
        SystemController.log("MOVE", `Step ${step.step}: Moving ${step.direction} to (${step.toPos.x}, ${step.toPos.y}) | Cost: +${step.stepCost}`, "info");
      }

      // Update table step status
      const tblBadge = document.getElementById(`table-step-status-${step.step}`);
      if (tblBadge) {
        tblBadge.className = 'badge badge-success';
        tblBadge.textContent = 'DONE';
      }

      // Update Scrubber and Labels
      document.getElementById('sim-scrubber').value = AppState.simulation.currentStepIndex;
      document.getElementById('sim-step-indicator').textContent = 
        `Step: ${AppState.simulation.currentStepIndex} / ${AppState.simulation.steps.length}`;

      const phaseInd = document.getElementById('sim-phase-indicator');
      if (AppState.simulation.hasCargo) {
        phaseInd.className = "badge badge-phase2";
        phaseInd.textContent = "Phase 2: Delivering to Destination";
      } else {
        phaseInd.className = "badge badge-phase1";
        phaseInd.textContent = "Phase 1: Transit to Pickup";
      }

      // Update HUD
      document.getElementById('hud-robot-coordinates').textContent = 
        `Coordinates: X=${step.toPos.x}, Y=${step.toPos.y}`;
      document.getElementById('hud-current-action').textContent = 
        `${step.operator} ${step.direction || ''}`;
      document.getElementById('hud-cost-consumed').textContent = 
        `${step.accumCost.toFixed(1)} / ${AppState.selectedPlan.totalCost} Units`;
      document.getElementById('hud-remaining-steps').textContent = 
        `${AppState.simulation.steps.length - AppState.simulation.currentStepIndex} actions remaining`;

      // Update visual grid
      SystemController.renderGrid();
    }

    static stepSimulation(delta) {
      const newIndex = AppState.simulation.currentStepIndex + delta;
      if (newIndex >= 0 && newIndex <= AppState.simulation.steps.length) {
        SystemController.jumpToStep(newIndex);
      }
    }

    static jumpToStep(targetIndex) {
      if (!AppState.simulation.steps || AppState.simulation.steps.length === 0) return;
      targetIndex = Math.max(0, Math.min(targetIndex, AppState.simulation.steps.length));

      AppState.simulation.currentStepIndex = targetIndex;

      if (targetIndex === 0) {
        SystemController.resetSimulation();
        return;
      }

      const currentStep = AppState.simulation.steps[targetIndex - 1];
      AppState.simulation.robotPos = { ...currentStep.toPos };
      AppState.simulation.costAccumulated = currentStep.accumCost;

      // Determine cargo state at this step
      let isLoaded = false;
      let isDelivered = false;
      for (let i = 0; i < targetIndex; i++) {
        if (AppState.simulation.steps[i].operator === "PICKUP") isLoaded = true;
        if (AppState.simulation.steps[i].operator === "DROPOFF") {
          isLoaded = false;
          isDelivered = true;
        }
      }
      AppState.simulation.hasCargo = isLoaded;
      AppState.simulation.delivered = isDelivered;

      if (isLoaded) {
        document.getElementById('robot-cargo-dot').classList.add('loaded');
        document.getElementById('hud-cargo-status').textContent = `LOADED: ${AppState.task.item}`;
      } else if (isDelivered) {
        document.getElementById('robot-cargo-dot').classList.remove('loaded');
        document.getElementById('hud-cargo-status').textContent = `DELIVERED`;
      } else {
        document.getElementById('robot-cargo-dot').classList.remove('loaded');
        document.getElementById('hud-cargo-status').textContent = `EMPTY`;
      }

      document.getElementById('hud-robot-coordinates').textContent = 
        `Coordinates: X=${currentStep.toPos.x}, Y=${currentStep.toPos.y}`;
      document.getElementById('hud-cost-consumed').textContent = 
        `${currentStep.accumCost.toFixed(1)} / ${AppState.selectedPlan.totalCost} Units`;
      document.getElementById('sim-step-indicator').textContent = 
        `Step: ${targetIndex} / ${AppState.simulation.steps.length}`;
      document.getElementById('sim-scrubber').value = targetIndex;

      SystemController.renderGrid();
    }

    static completeMission() {
      SystemController.pauseSimulation();
      document.getElementById('hud-status-badge').className = 'badge badge-success';
      document.getElementById('hud-status-badge').textContent = 'COMPLETED';

      // Increment metrics
      AppState.metrics.completedTasks++;
      AppState.metrics.totalTasks++;
      document.getElementById('kpi-total-tasks').textContent = AppState.metrics.totalTasks;
      document.getElementById('kpi-completed-tasks').textContent = AppState.metrics.completedTasks;

      // Add to delivery history
      const missionRecord = {
        id: "MIS-" + Math.floor(1000 + Math.random() * 9000),
        timestamp: new Date().toLocaleTimeString(),
        item: AppState.task.item,
        route: `(${AppState.task.start.x},${AppState.task.start.y}) &rarr; (${AppState.task.pickup.x},${AppState.task.pickup.y}) &rarr; (${AppState.task.dest.x},${AppState.task.dest.y})`,
        algorithm: AppState.selectedPlan.algorithm,
        cost: AppState.selectedPlan.totalCost,
        steps: AppState.selectedPlan.stepsCount,
        scenario: SCENARIO_PRESETS[AppState.activeScenarioId]?.name || "Custom Mission",
        status: "SUCCESS"
      };

      AppState.history.unshift(missionRecord);
      SystemController.renderHistoryTable();

      sound.playDelivery();
      SystemController.showBanner(`Delivery Completed Successfully! Item '${AppState.task.item}' verified at locker.`, "success");
      SystemController.log("SUCCESS", `Mission accomplished! Cost: ${AppState.selectedPlan.totalCost} | Steps: ${AppState.selectedPlan.stepsCount}`, "success");
    }

    /* ------------------------------------------------------------------------
     * Delivery History Table
     * ------------------------------------------------------------------------ */
    static renderHistoryTable() {
      const tbody = document.getElementById('history-table-body');
      if (!tbody) return;
      tbody.innerHTML = '';

      document.getElementById('history-count-badge').textContent = `${AppState.history.length} Missions`;

      AppState.history.forEach((h) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong class="font-mono">${h.id}</strong></td>
          <td><small class="text-muted">${h.timestamp}</small></td>
          <td><strong>${h.item}</strong></td>
          <td class="font-mono text-xs">${h.route}</td>
          <td><span class="badge badge-info">${h.algorithm}</span></td>
          <td class="font-mono text-green">${h.cost.toFixed(1)}</td>
          <td class="font-mono">${h.steps}</td>
          <td><small class="text-muted">${h.scenario}</small></td>
          <td><span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> ${h.status}</span></td>
          <td>
            <button class="btn btn-sm btn-outline btn-replay-hist" data-id="${h.id}">
              <i class="fa-solid fa-rotate-left"></i> Replay
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Bind replay buttons
      document.querySelectorAll('.btn-replay-hist').forEach(btn => {
        btn.addEventListener('click', () => {
          SystemController.switchSection('simulation-section');
          SystemController.resetSimulation();
          SystemController.startSimulation();
        });
      });
    }

    static exportHistoryCSV() {
      if (AppState.history.length === 0) {
        SystemController.showBanner("No history records to export", "warning");
        return;
      }
      let csv = "Mission ID,Timestamp,Item,Route,Algorithm,Total Cost,Steps,Scenario,Status\n";
      AppState.history.forEach(h => {
        csv += `"${h.id}","${h.timestamp}","${h.item}","${h.route}","${h.algorithm}",${h.cost},${h.steps},"${h.scenario}","${h.status}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Delivery_History_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    static exportPlanJSON() {
      if (!AppState.selectedPlan) {
        SystemController.showBanner("No active plan to export", "warning");
        return;
      }
      const data = {
        task: AppState.task,
        selectedPlan: AppState.selectedPlan,
        allCandidates: AppState.candidatePlans
      };
      const json = JSON.stringify(data, (key, value) => {
        if (value instanceof Set) return Array.from(value);
        return value;
      }, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AI_Plan_Report_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    /* ------------------------------------------------------------------------
     * Live Logging & Banner Notifications
     * ------------------------------------------------------------------------ */
    static log(tag, message, type = "info") {
      const timeStr = new Date().toLocaleTimeString();
      const dashStream = document.getElementById('dashboard-log-stream');
      const simStream = document.getElementById('sim-terminal-log');

      const entry = document.createElement('div');
      entry.className = 'log-entry';

      let tagClass = "tag-info";
      if (type === "success") tagClass = "tag-success";
      if (type === "warning") tagClass = "tag-warning";
      if (type === "danger") tagClass = "tag-danger";
      if (type === "plan") tagClass = "tag-plan";

      entry.innerHTML = `
        <span class="log-time">[${timeStr}]</span>
        <span class="log-tag ${tagClass}">${tag}</span>
        <span class="log-msg">${message}</span>
      `;

      if (dashStream) {
        dashStream.appendChild(entry);
        dashStream.scrollTop = dashStream.scrollHeight;
        const count = dashStream.children.length;
        document.getElementById('log-count-badge').textContent = `${count} entries`;
      }

      if (simStream) {
        const simEntry = entry.cloneNode(true);
        simStream.appendChild(simEntry);
        simStream.scrollTop = simStream.scrollHeight;
      }
    }

    static showBanner(message, type = "info") {
      const banner = document.getElementById('system-banner');
      const icon = document.getElementById('banner-icon');
      const msg = document.getElementById('banner-message');

      banner.className = `system-banner banner-${type}`;
      msg.textContent = message;

      if (type === "success") icon.className = "fa-solid fa-circle-check";
      else if (type === "danger") icon.className = "fa-solid fa-circle-xmark";
      else icon.className = "fa-solid fa-triangle-exclamation";

      banner.classList.remove('hidden');

      // Auto dismiss after 8 seconds
      clearTimeout(this.bannerTimer);
      this.bannerTimer = setTimeout(() => {
        banner.classList.add('hidden');
      }, 8000);
    }
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', SystemController.init);
  } else {
    SystemController.init();
  }

})();

/* ==========================================================================
   THEME SWITCHER (Dark / Light)  - paste at the very END of script.js
   ========================================================================== */
(function () {
  const STORAGE_KEY = 'robot-planner-theme';
  const root = document.documentElement;

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    const btn = document.getElementById('btn-theme-toggle');
    if (!btn) return;
    const isDark = theme === 'dark';
    // Button shows the theme you will switch TO
    btn.querySelector('i').className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    btn.querySelector('span').textContent = isDark ? 'Light Mode' : 'Dark Mode';
    btn.title = isDark ? 'Switch to light theme' : 'Switch to dark theme';
  }

  function toggleTheme() {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.classList.add('theme-transition');           // smooth colour fade
    applyTheme(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
    setTimeout(() => root.classList.remove('theme-transition'), 400);
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(root.getAttribute('data-theme') || 'dark');
    const btn = document.getElementById('btn-theme-toggle');
    if (btn) btn.addEventListener('click', toggleTheme);
  });
})();