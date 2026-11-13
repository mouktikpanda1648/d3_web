// Interactive Pac-Man Quest Arena for D3 Fest 2026 (Native Integration)
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const pacSection = document.getElementById('pacman-section');
    if (!pacSection) return;

    /* ==========================================================================
       1. MAP & CONSTANTS
       ========================================================================== */
    const TILE_SIZE = 20;
    const ROWS = 15;
    const COLS = 41;
    const WORLD_W = COLS * TILE_SIZE;
    const WORLD_H = ROWS * TILE_SIZE;
    const FRUIT_COUNT = 17;

    const D3FEST_MAP = [
      "#########################################",
      "#o..................#..................o#",
      "#.####.#####.#####..#..#####.#####.####.#",
      "#.......................................#",
      "#.MMMM..MMMMM.MMMMM.MMMMM.MMMMM.MMMMM...#",
      "#.M   M.....M.M.....M.....M.......M.....#",
      "..M   M.....M.M.....M.....M.......M......",
      "#.M   M..MMMM.MMMM..MMMM..MMMMM...M...#.#",
      "..M   M.....M.M.....M.........M...M......",
      "#.M   M.....M.M.....M.........M...M.....#",
      "#.MMMM..MMMMM.M.....MMMMM.MMMMM...M.....#",
      "#...................P...................#",
      "#.####.#####.#####..#..#####.#####.####.#",
      "#o.......G..........#..........G.......o#",
      "#########################################"
    ];

    const GHOST_SPECS = [
      { name: 'BLINKY', color: '#ff0000' },
      { name: 'PINKY',  color: '#ffb8ff' },
      { name: 'INKY',   color: '#00ffff' },
      { name: 'CLYDE',  color: '#ffb852' }
    ];

    /* ==========================================================================
       2. DETERMINISTIC SIMULATION
       ========================================================================== */
    function mulberry32(a) {
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function buildSimulation() {
      const N = ROWS * COLS;
      const rOf = id => (id / COLS) | 0;
      const cOf = id => id % COLS;
      const isWalk = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS && '.oPG'.indexOf(D3FEST_MAP[r][c]) >= 0;

      const nbrs = new Array(N);
      for (let id = 0; id < N; id++) {
        const r = rOf(id), c = cOf(id);
        const list = [];
        if (isWalk(r, c)) {
          if (isWalk(r - 1, c)) list.push((r - 1) * COLS + c);
          if (isWalk(r + 1, c)) list.push((r + 1) * COLS + c);
          if (isWalk(r, c - 1)) list.push(r * COLS + c - 1);
          if (isWalk(r, c + 1)) list.push(r * COLS + c + 1);
        }
        nbrs[id] = list;
      }

      let startId = 11 * COLS + 20;
      const dotType = new Map();
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const ch = D3FEST_MAP[r][c];
        if (ch === 'P') startId = r * COLS + c;
        if (ch === '.' || ch === 'o') dotType.set(r * COLS + c, ch);
      }

      const remaining = new Set(dotType.keys());
      const path = [startId];
      let cur = startId, prevDir = 1;
      while (remaining.size > 0) {
        const parent = new Int32Array(N).fill(-1);
        parent[cur] = cur;
        const queue = [cur];
        let found = -1;
        for (let qi = 0; qi < queue.length && found < 0; qi++) {
          const id = queue[qi];
          if (id !== cur && remaining.has(id)) { found = id; break; }
          const list = nbrs[id].slice().sort((a, b) => {
            const sa = (a - id === prevDir && id === cur) ? 0 : 1;
            const sb = (b - id === prevDir && id === cur) ? 0 : 1;
            return sa - sb;
          });
          for (const nb of list) if (parent[nb] < 0) { parent[nb] = id; queue.push(nb); }
        }
        if (found < 0) break;
        const seg = [];
        for (let id = found; id !== cur; id = parent[id]) seg.push(id);
        seg.reverse();
        for (const id of seg) { path.push(id); remaining.delete(id); }
        prevDir = path[path.length - 1] - path[path.length - 2];
        cur = found;
      }
      const n = path.length - 1;

      const firstVisit = new Map();
      for (let i = 0; i <= n; i++) if (!firstVisit.has(path[i])) firstVisit.set(path[i], i);

      const fruits = [];
      let prevIdx = 12;
      for (let k = 0; k < FRUIT_COUNT; k++) {
        let idx = Math.round((k + 1) * (n * 0.94) / (FRUIT_COUNT + 0.5));
        idx = Math.max(idx, prevIdx + 22);
        while (idx < n - 6 && firstVisit.get(path[idx]) !== idx) idx++;
        const id = path[idx];
        fruits.push({ k, idx, r: rOf(id), c: cOf(id), spawn: Math.max(1, idx - 14) });
        prevIdx = idx;
      }
      const fruitAt = new Map(fruits.map(f => [f.idx, f]));

      const scoreAt = new Array(n + 1), frightAt = new Array(n + 1);
      let score = 0, fright = 0;
      for (let i = 0; i <= n; i++) {
        const id = path[i];
        if (firstVisit.get(id) === i && dotType.has(id)) {
          if (dotType.get(id) === '.') score += 10; else { score += 50; fright = 28; }
        }
        if (fruitAt.has(i)) score += 500;
        scoreAt[i] = score;
        frightAt[i] = fright;
        if (fright > 0) fright--;
      }

      const manh = (a, b) => Math.abs(rOf(a) - rOf(b)) + Math.abs(cOf(a) - cOf(b));
      const ghostStarts = [13 * COLS + 9, 13 * COLS + 31, 1 * COLS + 3, 1 * COLS + 37];

      function generateGhosts(seed) {
        const rng = mulberry32(seed);
        const out = [];
        for (let g = 0; g < 4; g++) {
          let curId = ghostStarts[g], prev = -1;
          const arr = [curId];
          for (let i = 0; i < n; i++) {
            const pa = path[i], pb = path[i + 1];
            const pc = path[Math.min(n, i + 2)], pd = path[Math.min(n, i + 3)];
            const nb = nbrs[curId];
            const noSwap = x => !(curId === pb && x === pa);
            const notBack = x => x !== prev || nb.length === 1;
            let cand = nb.filter(x => notBack(x) && manh(x, pb) >= 2 && x !== pc && x !== pd && noSwap(x));
            if (!cand.length) cand = nb.filter(x => notBack(x) && manh(x, pb) >= 2 && noSwap(x));
            if (!cand.length) cand = nb.filter(x => manh(x, pb) >= 2 && noSwap(x));
            if (!cand.length) cand = nb.filter(x => x !== pb && noSwap(x));
            if (!cand.length) cand = curId !== pb ? [curId] : nb.slice();
            const target = g === 1 ? path[Math.min(n, i + 5)] : pb;
            let best = cand[0], bestScore = Infinity;
            for (const x of cand) {
              let s;
              if (g === 0 || g === 1) s = manh(x, target) + rng() * 1.6;
              else if (g === 2) s = rng();
              else s = (manh(curId, pb) > 8 ? manh(x, pb) : -manh(x, pb)) + rng() * 1.6;
              if (s < bestScore) { bestScore = s; best = x; }
            }
            prev = curId; curId = best; arr.push(curId);
          }
          out.push(arr);
        }
        return out;
      }

      function violations(gs) {
        let bad = 0;
        const samples = [0, 0.25, 0.5, 0.75, 1];
        for (let i = 0; i < n; i++) for (let g = 0; g < 4; g++) for (const f of samples) {
          const pr = rOf(path[i]) + (rOf(path[i + 1]) - rOf(path[i])) * f;
          const pcc = cOf(path[i]) + (cOf(path[i + 1]) - cOf(path[i])) * f;
          const gr = rOf(gs[g][i]) + (rOf(gs[g][i + 1]) - rOf(gs[g][i])) * f;
          const gc = cOf(gs[g][i]) + (cOf(gs[g][i + 1]) - cOf(gs[g][i])) * f;
          if (Math.hypot(pr - gr, pcc - gc) < 1.05) bad++;
        }
        return bad;
      }

      let ghostIds = null, bestBad = Infinity, usedSeed = 0;
      for (let seed = 1; seed <= 80; seed++) {
        const gs = generateGhosts(seed);
        const bad = violations(gs);
        if (bad < bestBad) { bestBad = bad; ghostIds = gs; usedSeed = seed; }
        if (bad === 0) break;
      }

      const toRC = id => ({ r: rOf(id), c: cOf(id) });
      return {
        n,
        path: path.map(toRC),
        dots: Array.from(dotType.entries()).map(([id, type]) => ({ r: rOf(id), c: cOf(id), type, fv: firstVisit.get(id) })),
        fruits, scoreAt, frightAt,
        ghosts: ghostIds.map(arr => arr.map(toRC)),
        ghostViolations: bestBad, ghostSeed: usedSeed
      };
    }

    /* ==========================================================================
       3. LEVEL (EVENT) CONFIGURATION
       ========================================================================== */
    const TECH_FEST_EVENTS = [
      { id: 1,  title: "CRAFT N CODE '26",   category: "NATIONAL HACKATHON",          date: "DAY 1 - 09:00 AM", prize: "₹50,000",     fruit: "CHERRY",     desc: "Gear up for the ultimate National level Hackathon! 24-hour non-stop hackathon inviting brilliant minds nationwide to build creative solutions and solve real-world challenges." },
      { id: 2,  title: "CODE KOMBAT",        category: "1V1 CODING BATTLE",           date: "DAY 1 - 11:30 AM", prize: "₹25,000",     fruit: "STRAWBERRY", desc: "ICPC-inspired programming tournament where coders face off in intense algorithmic challenges. Real-time elimination format testing coding speed, precision, and edge-case handling." },
      { id: 3,  title: "TECHXPO",            category: "INNOVATION ON DISPLAY",       date: "DAY 1 - 02:00 PM", prize: "EXHIBITION",  fruit: "ORANGE",     desc: "Curated exhibition where local startups, research labs, and student innovators showcase cutting-edge technology products and live prototypes to a nationwide audience." },
      { id: 4,  title: "CTF ARENA",          category: "CYBERSEC DEFENSE BATTLE",     date: "DAY 1 - 04:30 PM", prize: "₹20,000",     fruit: "APPLE",      desc: "Demonstrate cybersecurity expertise in defending digital assets and combating national security threats, financial fraud, vulnerability exploitation, and cyberattacks." },
      { id: 5,  title: "UI/UX SHOWDOWN",     category: "DIGITAL EXPERIENCE SPRINT",   date: "DAY 2 - 09:30 AM", prize: "₹18,000",     fruit: "MELON",      desc: "Transform complex problem statements into intuitive, accessible, and aesthetically compelling UI/UX solutions emphasizing usability, accessibility, and design thinking." },
      { id: 6,  title: "BOT BOWL",           category: "ROBOSOCCER CHAMPIONSHIP",     date: "DAY 2 - 11:30 AM", prize: "₹25,000",     fruit: "GALAXIAN",   desc: "Adrenaline-charged RoboSoccer challenge where teams operate custom bots to dribble, pass, and score on a mini soccer field. Agility and engineering decide the victor." },
      { id: 7,  title: "FLYTRON",            category: "HIGH-SPEED DRONE RACING",     date: "DAY 2 - 02:00 PM", prize: "₹25,000",     fruit: "BELL",       desc: "Navigate high-speed aerial obstacle courses where surgical precision meets throttle control. Dominate the skies in thrilling competitive heats." },
      { id: 8,  title: "ROBO RASH",          category: "ALL-TERRAIN ENDURANCE RUSH",  date: "DAY 2 - 04:30 PM", prize: "₹15,000",     fruit: "KEY",        desc: "Navigate mobile robots through rugged multi-surface tracks featuring gravel, sand, turf, and steep slopes with maximum stability and record time." },
      { id: 9,  title: "GROUND ZERO",        category: "DISASTER DETECTION QUEST",    date: "DAY 3 - 09:30 AM", prize: "₹12,000",     fruit: "CHERRY",     desc: "Deploy robotic explorers into simulated disaster zones to traverse rubble, detect metallic hazards, locate hidden resources, and identify signs of human life." },
      { id: 10, title: "BUILDATHON",         category: "HARDWARE & PROTOTYPE SPRINT", date: "DAY 3 - 11:30 AM", prize: "₹20,000",     fruit: "STRAWBERRY", desc: "A race against time to turn bold ideas into working solutions. Brainstorm, design, prototype, and present working electronics, software, or automation systems." },
      { id: 11, title: "EXPERIENCE CENTER",  category: "EXPERIENTIAL TECH ZONE",      date: "DAY 3 - 02:00 PM", prize: "INTERACTIVE", fruit: "ORANGE",     desc: "An immersive zone where technology comes alive. Explore interactive demos, live robotics showcases, and hands-on automation experiences built by the Automation & Robotics Society." },
      { id: 12, title: "WORKSHOP.EXE",       category: "MASTERCLASS IN FUTURE TECH",  date: "DAY 3 - 04:30 PM", prize: "CERTIFICATE", fruit: "APPLE",      desc: "Engage in hands-on learning with top industry experts covering Artificial Intelligence (AI), Blockchain, Web3, Augmented Reality (AR), and Virtual Reality (VR)." },
      { id: 13, title: "DEV DIALOGUE",       category: "INSPIRATIONAL TECH TALK",     date: "DAY 4 - 10:00 AM", prize: "KEYNOTE",     fruit: "MELON",      desc: "Leading industry visionaries and tech innovators dive into the latest breakthrough trends, sparking new ideas, expanding horizons, and shaping the future." },
      { id: 14, title: "MECHLAB.IO",         category: "EMBEDDED & AUTONOMOUS SYSTEMS", date: "DAY 4 - 11:30 AM", prize: "WORKSHOP",  fruit: "GALAXIAN",   desc: "Comprehensive hands-on workshop presented by the Automation and Robotics Society on Embedded Systems, IoT, RPA, Computer Vision, and Autonomous Navigation." },
      { id: 15, title: "WELCOMING CEREMONY", category: "GRAND INAUGURATION",          date: "DAY 1 - 08:30 AM", prize: "INAUGURAL",   fruit: "BELL",       desc: "The official inauguration ceremony of D³ Fest 2026, unveiling 4 days of arcade engineering, special keynote announcements, and festivities." },
      { id: 16, title: "BITS OF PAST",       category: "RETRO COMMUNITY CELEBRATION", date: "DAY 4 - 03:00 PM", prize: "COMMUNITY",   fruit: "KEY",        desc: "An inspiring retro retrospective and community celebration honoring tech evolution, student projects, and the timeless 80s arcade culture." },
      { id: 17, title: "CLOSING CEREMONY",   category: "AWARDS GALA & GRAND SURPRISE", date: "DAY 4 - 06:00 PM", prize: "CELEBRATION", fruit: "CHERRY",   desc: "Summing up the fest with the announcement of the Grand Surprise, awards gala for tournament champions, and the official closing celebration." }
    ];

    const FRUIT_EMOJIS = {
      CHERRY: "🍒", STRAWBERRY: "🍓", ORANGE: "🍊", APPLE: "🍎",
      MELON: "🍈", GALAXIAN: "👾", BELL: "🔔", KEY: "🔑"
    };

    /* ==========================================================================
       4. BUILD THE RUN + RENDERING ENGINE (MAGNIFIED PAC-MAN)
       ========================================================================== */
    const SIM = buildSimulation();
    const PATH = SIM.path, N_STEPS = SIM.n;
    
    // Magnified Pac-Man & corridor camera zoom (increased from 2.8 to 3.6 for high-impact presence)
    const ZOOM = 3.6;

    const dotGrid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    SIM.dots.forEach(d => { dotGrid[d.r][d.c] = d; });

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const livesCanvas = document.getElementById('livesCanvas');
    const livesCtx = livesCanvas ? livesCanvas.getContext('2d') : null;
    const fruitsCanvas = document.getElementById('fruitsCanvas');
    const fruitsCtx = fruitsCanvas ? fruitsCanvas.getContext('2d') : null;

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
    const easeOutBack = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

    let baseScale = 1, cssScale = 1;
    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.max(2, Math.round(rect.width * dpr));
      canvas.height = Math.max(2, Math.round(rect.height * dpr));
      baseScale = canvas.width / WORLD_W;
      cssScale = rect.width / WORLD_W;
    }

    function samplePath(arr, pos) {
      pos = clamp(pos, 0, N_STEPS);
      const i = Math.min(N_STEPS - 1, Math.floor(pos));
      const f = pos - i;
      const a = arr[i], b = arr[i + 1];
      return {
        x: (a.c + (b.c - a.c) * f + 0.5) * TILE_SIZE,
        y: (a.r + (b.r - a.r) * f + 0.5) * TILE_SIZE,
        dx: b.c - a.c, dy: b.r - a.r
      };
    }

    function drawFruitSprite(targetCtx, cx, cy, fruitName, scale = 1) {
      targetCtx.save();
      targetCtx.translate(cx, cy);
      targetCtx.scale(scale, scale);
      if (fruitName === 'CHERRY') {
        targetCtx.strokeStyle = '#00dd00'; targetCtx.lineWidth = 1.8;
        targetCtx.beginPath();
        targetCtx.moveTo(-4, 2); targetCtx.quadraticCurveTo(0, -7, 5, -7);
        targetCtx.moveTo(3, 4);  targetCtx.quadraticCurveTo(4, -3, 5, -7);
        targetCtx.stroke();
        targetCtx.fillStyle = '#ff0000';
        targetCtx.beginPath();
        targetCtx.arc(-4, 3, 4, 0, Math.PI * 2);
        targetCtx.arc(3, 5, 4, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.fillStyle = '#ffffff';
        targetCtx.fillRect(-6, 1, 1.5, 1.5);
        targetCtx.fillRect(1, 3, 1.5, 1.5);
      } else if (fruitName === 'STRAWBERRY') {
        targetCtx.fillStyle = '#ff1155';
        targetCtx.beginPath(); targetCtx.arc(0, 0, 6, 0, Math.PI * 2); targetCtx.fill();
        targetCtx.fillStyle = '#00ee00'; targetCtx.fillRect(-4, -7, 8, 3);
        targetCtx.fillStyle = '#ffffff';
        targetCtx.fillRect(-3, -2, 1.5, 1.5); targetCtx.fillRect(2, -1, 1.5, 1.5); targetCtx.fillRect(0, 2, 1.5, 1.5);
      } else if (fruitName === 'ORANGE') {
        targetCtx.fillStyle = '#ff9900'; targetCtx.beginPath(); targetCtx.arc(0, 1, 6.5, 0, Math.PI * 2); targetCtx.fill();
        targetCtx.fillStyle = '#00dd00'; targetCtx.fillRect(-1, -7, 3, 3);
      } else if (fruitName === 'APPLE') {
        targetCtx.fillStyle = '#dd0000';
        targetCtx.beginPath(); targetCtx.arc(-2, 1, 5.5, 0, Math.PI * 2); targetCtx.arc(2, 1, 5.5, 0, Math.PI * 2); targetCtx.fill();
        targetCtx.fillStyle = '#00dd00'; targetCtx.fillRect(0, -7, 2, 3);
      } else if (fruitName === 'MELON') {
        targetCtx.fillStyle = '#00cc55'; targetCtx.beginPath(); targetCtx.arc(0, 1, 6.5, 0, Math.PI * 2); targetCtx.fill();
        targetCtx.strokeStyle = '#005522'; targetCtx.lineWidth = 1.5;
        targetCtx.beginPath(); targetCtx.moveTo(-5, 1); targetCtx.lineTo(5, 1); targetCtx.stroke();
      } else if (fruitName === 'GALAXIAN') {
        targetCtx.fillStyle = '#ffff00'; targetCtx.fillRect(-5, -5, 10, 10);
        targetCtx.fillStyle = '#0000ff'; targetCtx.fillRect(-3, -3, 6, 6);
      } else if (fruitName === 'BELL') {
        targetCtx.fillStyle = '#ffff00'; targetCtx.beginPath(); targetCtx.arc(0, -1, 6, Math.PI, 0); targetCtx.lineTo(6, 4); targetCtx.lineTo(-6, 4); targetCtx.fill();
        targetCtx.fillStyle = '#00ffff'; targetCtx.fillRect(-2, 4, 4, 2);
      } else { // KEY
        targetCtx.fillStyle = '#00ffff'; targetCtx.fillRect(-2, -6, 4, 12); targetCtx.fillRect(0, 0, 4, 2); targetCtx.fillRect(0, 3, 4, 2);
      }
      targetCtx.restore();
    }

    function drawGhost(g, pos, frightened, flashWhite, wobble) {
      const gx = g.x - TILE_SIZE / 2, gy = g.y - TILE_SIZE / 2;
      const gr = TILE_SIZE / 2 - 0.5;
      ctx.save();
      ctx.fillStyle = frightened ? (flashWhite ? '#ffffff' : '#2121ff') : g.color;
      ctx.beginPath();
      ctx.arc(gx + TILE_SIZE / 2, gy + TILE_SIZE / 2 - 1, gr, Math.PI, 0, false);
      ctx.lineTo(gx + TILE_SIZE - 1, gy + TILE_SIZE - 1);
      const up = wobble ? 4 : 2, dn = wobble ? 2 : 4;
      ctx.lineTo(gx + TILE_SIZE * 0.75, gy + TILE_SIZE - up);
      ctx.lineTo(gx + TILE_SIZE * 0.5, gy + TILE_SIZE - 1);
      ctx.lineTo(gx + TILE_SIZE * 0.25, gy + TILE_SIZE - dn);
      ctx.lineTo(gx + 1, gy + TILE_SIZE - 1);
      ctx.closePath();
      ctx.fill();

      const ex = clamp(g.dx, -1, 1) * 1.4, ey = clamp(g.dy, -1, 1) * 1.4;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(gx + TILE_SIZE / 2 - 3, gy + TILE_SIZE / 2 - 2, 2.5, 0, Math.PI * 2);
      ctx.arc(gx + TILE_SIZE / 2 + 3, gy + TILE_SIZE / 2 - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2121ff';
      ctx.beginPath();
      ctx.arc(gx + TILE_SIZE / 2 - 3 + ex, gy + TILE_SIZE / 2 - 2 + ey, 1.2, 0, Math.PI * 2);
      ctx.arc(gx + TILE_SIZE / 2 + 3 + ex, gy + TILE_SIZE / 2 - 2 + ey, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const cam = { x: 0, y: 0, zoom: ZOOM, pacX: 0, pacY: 0 };
    const worldToCss = (wx, wy) => ({ x: (wx - cam.x) * cam.zoom * cssScale, y: (wy - cam.y) * cam.zoom * cssScale });

    function renderGameFrame(pos, zoom, opts) {
      opts = opts || {};
      const T = TILE_SIZE;
      const stepI = clamp(Math.floor(pos), 0, N_STEPS);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let cx = 0, cy = 0, wsum = 0;
      for (let d = -2; d <= 2; d += 1) {
        const w = 3 - Math.abs(d) * 0.8;
        const s = samplePath(PATH, pos + d * 0.7);
        cx += s.x * w; cy += s.y * w; wsum += w;
      }
      cx /= wsum; cy /= wsum;

      // In finale phase, smoothly center camera on world center
      if (opts.centerWorld && opts.centerT !== undefined) {
        cx = lerp(cx, WORLD_W / 2, opts.centerT);
        cy = lerp(cy, WORLD_H / 2, opts.centerT);
      }

      const camW = WORLD_W / zoom, camH = WORLD_H / zoom;
      const camX = clamp(cx - camW / 2, 0, Math.max(0, WORLD_W - camW));
      const camY = clamp(cy - camH / 2, 0, Math.max(0, WORLD_H - camH));
      const s = baseScale * zoom;
      ctx.setTransform(s, 0, 0, s, -camX * s, -camY * s);
      cam.x = camX; cam.y = camY; cam.zoom = zoom;

      const pac = samplePath(PATH, pos);
      cam.pacX = pac.x; cam.pacY = pac.y;

      const c0 = Math.max(0, Math.floor(camX / T) - 1), c1 = Math.min(COLS - 1, Math.ceil((camX + camW) / T) + 1);
      const r0 = Math.max(0, Math.floor(camY / T) - 1), r1 = Math.min(ROWS - 1, Math.ceil((camY + camH) / T) + 1);
      const wallColor = opts.flash ? '#ffffff' : '#2121ff';
      const blinkOn = opts.blink !== false;

      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const cell = D3FEST_MAP[r][c];
          const x = c * T, y = r * T;
          if (cell === '#') {
            ctx.strokeStyle = wallColor; ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, T - 4, T - 4);
          } else if (cell === 'M') {
            ctx.fillStyle = '#101038';
            ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
            ctx.strokeStyle = opts.flash ? '#ffffff' : '#ffb852'; ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 2.5, y + 2.5, T - 5, T - 5);
          } else {
            const d = dotGrid[r][c];
            if (d && pos < d.fv) {
              ctx.fillStyle = '#ffb8ae';
              if (d.type === '.') {
                ctx.fillRect(x + T / 2 - 2, y + T / 2 - 2, 4, 4);
              } else if (blinkOn) {
                ctx.beginPath(); ctx.arc(x + T / 2, y + T / 2, 6, 0, Math.PI * 2); ctx.fill();
              }
            }
          }
        }
      }

      // Fruits
      const t = opts.time || 0;
      for (const f of SIM.fruits) {
        const fx = (f.c + 0.5) * T, fy = (f.r + 0.5) * T;
        const ev = TECH_FEST_EVENTS[f.k];
        if (pos >= f.spawn && pos < f.idx) {
          const pop = easeOutBack(clamp((pos - f.spawn) / 1.6, 0, 1));
          const bob = Math.sin(t / 180 + f.k) * 1.2;
          ctx.save();
          ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t / 200);
          ctx.fillStyle = '#ffff00';
          ctx.beginPath(); ctx.arc(fx, fy, 10 * pop, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          drawFruitSprite(ctx, fx, fy + bob, ev.fruit, 1.35 * pop);
        } else if (pos >= f.idx && pos < f.idx + 2.4) {
          const q = (pos - f.idx) / 2.4;
          ctx.save();
          ctx.globalAlpha = 1 - q;
          ctx.fillStyle = '#00ffff';
          ctx.font = '7px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('+500', fx, fy - 8 - q * 14);
          ctx.restore();
        }
      }

      // Ghosts
      const fright = SIM.frightAt[stepI];
      const ghostPos = SIM.ghosts.map((arr, gi) => {
        const p = samplePath(arr, pos);
        p.color = GHOST_SPECS[gi].color;
        return p;
      });
      const wobble = (Math.floor(pos * 2) % 2) === 0;
      ghostPos.forEach(g => drawGhost(g, pos, fright > 0, fright > 0 && fright < 9 && (stepI % 2 === 0), wobble));

      // Magnified Pac-Man: Prominent size and bold chomp
      const moving = pos < N_STEPS - 0.001 && pos > 0;
      const mouth = moving ? 0.04 + 0.22 * Math.abs(Math.sin(pos * Math.PI * 2)) : 0.2;
      let rotation = 0;
      if (pac.dx === 1) rotation = 0; else if (pac.dy === 1) rotation = Math.PI / 2;
      else if (pac.dx === -1) rotation = Math.PI; else if (pac.dy === -1) rotation = -Math.PI / 2;
      ctx.save();
      ctx.translate(pac.x, pac.y);
      ctx.rotate(rotation);
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      // Pac-Man magnified radius: T / 2 + 1 (11px, enlarged from 9px)
      ctx.arc(0, 0, T / 2 + 1, mouth * Math.PI, (2 - mouth) * Math.PI);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    let lastTrayCount = -1;
    function drawHUDTrays(eaten) {
      if (!livesCtx || !fruitsCtx || eaten === lastTrayCount) return;
      lastTrayCount = eaten;
      livesCtx.clearRect(0, 0, livesCanvas.width, livesCanvas.height);
      for (let i = 0; i < 3; i++) {
        const cx = 14 + i * 26, cy = 12;
        livesCtx.fillStyle = '#ffff00';
        livesCtx.beginPath();
        livesCtx.arc(cx, cy, 8, 1.25 * Math.PI, 0.75 * Math.PI, false);
        livesCtx.lineTo(cx, cy);
        livesCtx.closePath();
        livesCtx.fill();
      }
      fruitsCtx.clearRect(0, 0, fruitsCanvas.width, fruitsCanvas.height);
      const from = Math.max(0, eaten - 6);
      for (let k = from; k < eaten; k++) {
        drawFruitSprite(fruitsCtx, fruitsCanvas.width - 14 - (eaten - 1 - k) * 22, 12, TECH_FEST_EVENTS[k].fruit, 0.9);
      }
    }

    /* ==========================================================================
       5. SCROLL TIMELINE
       ========================================================================== */
    const INTRO_PX = 700;
    const FINALE_PX = 1500;
    const FAST_PX_PER_TILE = 14;
    const SLOW_PX_PER_TILE = 80;

    const keys = [{ u: INTRO_PX, pos: 0 }];
    const zones = [];
    let U_END = INTRO_PX;
    (function buildTimeline() {
      let u = INTRO_PX, p = 0;
      for (const f of SIM.fruits) {
        const a = Math.max(p, f.idx - 1.5);
        const b = Math.min(N_STEPS, f.idx + 3.5);
        u += (a - p) * FAST_PX_PER_TILE;
        keys.push({ u, pos: a });
        const uStart = u;
        const uEat = u + (f.idx - a) * SLOW_PX_PER_TILE;
        u += (b - a) * SLOW_PX_PER_TILE;
        keys.push({ u, pos: b });
        zones.push({ k: f.k, uStart, uEat, uEnd: u, side: 0 });
        p = b;
      }
      u += (N_STEPS - p) * FAST_PX_PER_TILE;
      keys.push({ u, pos: N_STEPS });
      U_END = u;
    })();

    function posOfU(u) {
      if (u <= INTRO_PX) return 0;
      if (u >= U_END) return N_STEPS;
      let lo = 0, hi = keys.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (keys[mid].u <= u) lo = mid; else hi = mid;
      }
      const a = keys[lo], b = keys[hi];
      return a.pos + (b.pos - a.pos) * ((u - a.u) / Math.max(1e-6, b.u - a.u));
    }

    /* ==========================================================================
       6. DOM ELEMENTS & INTERACTION
       ========================================================================== */
    const scrollTrack = document.getElementById('scrollTrack');
    const scoreEl = document.getElementById('scoreEl');
    const statusEl = document.getElementById('statusEl');
    const unlockedCount = document.getElementById('unlockedCount');
    const startOverlay = document.getElementById('startOverlay');
    const startBtn = document.getElementById('startBtn');
    const simulatedCursor = document.getElementById('simulatedCursor');
    const eventPopup = document.getElementById('eventPopup');
    const popupFruitIcon = document.getElementById('popupFruitIcon');
    const eventIdTag = document.getElementById('eventIdTag');
    const popupCategory = document.getElementById('popupCategory');
    const popupTitle = document.getElementById('popupTitle');
    const popupDesc = document.getElementById('popupDesc');
    const popupPrize = document.getElementById('popupPrize');
    const popupDate = document.getElementById('popupDate');
    const finaleBranding = document.getElementById('finaleBranding');
    const eventJumpGrid = document.getElementById('eventJumpGrid');
    const brandTitle = document.getElementById('brandTitle');
    const brandSub = document.getElementById('brandSub');
    const jumpWrap = document.getElementById('jumpWrap');
    const stage = document.getElementById('stage');
    const cabinet = document.getElementById('arcadeCabinet');
    const container = document.getElementById('canvasContainer');
    const pacStickyWrap = document.getElementById('pacman-sticky-wrap');

    const BRAND = "IIIT BHUBANESWAR";
    const brandLetters = [];
    if (brandTitle) {
      brandTitle.innerHTML = '';
      BRAND.split('').forEach(ch => {
        const sp = document.createElement('span');
        sp.textContent = ch === ' ' ? '\u00A0' : ch;
        brandTitle.appendChild(sp);
        brandLetters.push(sp);
      });
    }

    if (eventJumpGrid) {
      eventJumpGrid.innerHTML = '';
      TECH_FEST_EVENTS.forEach((ev, idx) => {
        const btn = document.createElement('button');
        btn.className = "jump-tile-btn";
        btn.innerHTML = `<span>${FRUIT_EMOJIS[ev.fruit] || '🍒'}</span><span>L${ev.id}</span>`;
        btn.onclick = () => {
          const pacTop = pacSection.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop);
          window.scrollTo({ top: pacTop + zones[idx].uEat + 130, behavior: 'smooth' });
        };
        eventJumpGrid.appendChild(btn);
      });
    }

    const pad2 = v => String(v).padStart(2, '0');
    let lastPopupZone = -1;
    let brandShown = false, lettersOn = -1;

    function hidePopup() {
      if (eventPopup && eventPopup.style.opacity !== '0') {
        eventPopup.style.opacity = '0';
        eventPopup.style.pointerEvents = 'none';
      }
      lastPopupZone = -1;
    }

    function updatePopup(u, pos) {
      if (!eventPopup || !container) return;
      let zone = null;
      for (const z of zones) { if (u >= z.uEat - 4 && u <= z.uEnd) { zone = z; break; } }
      if (!zone) { hidePopup(); return; }
      const inP = clamp((u - zone.uEat) / 90, 0, 1);
      const outP = clamp((zone.uEnd - u) / 110, 0, 1);
      const e = easeOutCubic(Math.min(inP, outP));
      if (e < 0.01) { hidePopup(); return; }

      const ev = TECH_FEST_EVENTS[zone.k];
      if (lastPopupZone !== zone.k) {
        lastPopupZone = zone.k;
        if (popupFruitIcon) popupFruitIcon.textContent = FRUIT_EMOJIS[ev.fruit] || '🍒';
        if (eventIdTag) eventIdTag.textContent = `LEVEL ${pad2(ev.id)}`;
        if (popupCategory) popupCategory.textContent = ev.category;
        if (popupTitle) popupTitle.textContent = ev.title;
        if (popupDesc) popupDesc.textContent = ev.desc;
        if (popupPrize) popupPrize.textContent = ev.prize;
        if (popupDate) popupDate.textContent = ev.date;

        const pacCss = worldToCss(cam.pacX, cam.pacY);
        zone.side = pacCss.x < container.clientWidth / 2 ? 1 : -1;
      }

      const cw = container.clientWidth, ch = container.clientHeight;
      const pw = eventPopup.offsetWidth, ph = eventPopup.offsetHeight;
      let left, top;
      if (cw < 560) {
        left = (cw - pw) / 2;
        const pacCss = worldToCss(cam.pacX, cam.pacY);
        top = pacCss.y > ch / 2 ? 4 : Math.max(4, ch - ph - 4);
      } else {
        left = zone.side > 0 ? cw - pw - 14 : 14;
        top = Math.max(6, (ch - ph) / 2);
      }
      const f = SIM.fruits[zone.k];
      const fruitCss = worldToCss((f.c + 0.5) * TILE_SIZE, (f.r + 0.5) * TILE_SIZE);
      eventPopup.style.left = left + 'px';
      eventPopup.style.top = top + 'px';
      eventPopup.style.transformOrigin = `${fruitCss.x - left}px ${fruitCss.y - top}px`;
      eventPopup.style.transform = `scale(${(0.12 + 0.88 * e).toFixed(3)})`;
      eventPopup.style.opacity = e.toFixed(3);
      eventPopup.style.pointerEvents = 'none';
    }

    function fruitsEaten(pos) {
      let c = 0;
      for (const f of SIM.fruits) if (pos >= f.idx) c++;
      return c;
    }

    function setStageFit(active) {
      if (!stage || !cabinet) return;
      const main = stage.parentElement;
      if (!main) return;

      if (!active) {
        stage.style.transform = 'translateY(0px) scale(1)';
        return;
      }

      // Available height inside <main> with safety buffer
      const availableH = main.clientHeight - 8;
      const finaleH = (finaleBranding && finaleBranding.classList.contains('show'))
        ? (finaleBranding.scrollHeight || finaleBranding.offsetHeight || 135)
        : 0;
      const neededH = cabinet.offsetHeight + finaleH + 6;

      // Zoom-out scale factor s: scale down so entire stage fits within original cabinet bounds or available clearance
      const targetH = Math.min(availableH, Math.max(cabinet.offsetHeight + 20, cabinet.offsetHeight * 1.05));
      let s = clamp(targetH / neededH, 0.60, 0.90);
      if (neededH * s > availableH) {
        s = clamp(availableH / neededH, 0.60, 0.90);
      }

      // Prevent cabinet from moving up while scaling down:
      // In flexbox justify-center, the unscaled stage is centered at (main.clientHeight - neededH) / 2.
      // Scaled visual top inside main without offset: currentVisualTop = (main.clientHeight - (neededH * s)) / 2.
      // Before finale, cabinet visual top was: baseTop = (main.clientHeight - cabinet.offsetHeight) / 2.
      // To ensure cabinet does NOT move up, visualTop should not be less than baseTop:
      const baseTop = (main.clientHeight - cabinet.offsetHeight) / 2;
      const currentVisualTop = (main.clientHeight - (neededH * s)) / 2;
      const desiredShiftDown = Math.max(0, baseTop - currentVisualTop);

      // Guard bottom clearance so fruit navigation tiles are never cut off:
      const currentVisualBottom = currentVisualTop + (neededH * s);
      const maxShiftDown = Math.max(0, availableH - currentVisualBottom);
      const safeShift = clamp(desiredShiftDown, 0, maxShiftDown);

      stage.style.transform = `translateY(${safeShift.toFixed(1)}px) scale(${s.toFixed(3)})`;
    }

    let lastEatenCount = -1;
    let stageClearSoundPlayed = false;

    function render(u, now) {
      const blink = (Math.floor(now / 250) % 2) === 0;

      /* Phase 1: Intro sequence */
      if (u < INTRO_PX) {
        const q = u / INTRO_PX;
        if (startBtn && simulatedCursor) {
          const btnRect = startBtn.getBoundingClientRect();
          const tx = btnRect.left + btnRect.width / 2 - 6;
          const ty = btnRect.top + btnRect.height / 2 - 4;
          const m = easeInOut(clamp(q / 0.62, 0, 1));
          const pressed = q > 0.68;
          simulatedCursor.style.opacity = String(1 - clamp((q - 0.88) / 0.12, 0, 1));
          simulatedCursor.style.transform = `translate(${lerp(60, tx, m)}px, ${lerp(60, ty, m)}px) scale(${pressed ? 0.82 : 1})`;
          if (pressed) {
            startBtn.textContent = "START GAME";
            startBtn.style.backgroundColor = '#00ff66';
            startBtn.style.boxShadow = 'none';
            startBtn.style.transform = 'translate(4px, 4px)';
          } else {
            startBtn.textContent = "ARE YOU READY?";
            startBtn.style.backgroundColor = '';
            startBtn.style.boxShadow = '';
            startBtn.style.transform = '';
          }
        }
        if (startOverlay) {
          startOverlay.style.opacity = String(1 - clamp((q - 0.8) / 0.2, 0, 1));
          startOverlay.style.display = 'flex';
        }

        renderGameFrame(0, ZOOM, { time: now, blink });
        if (scoreEl) scoreEl.textContent = '00000';
        if (statusEl) { statusEl.textContent = 'READY!'; statusEl.style.color = '#00ffff'; }
        if (unlockedCount) unlockedCount.textContent = '0';
        drawHUDTrays(0);
        hidePopup();
        if (finaleBranding) finaleBranding.classList.remove('show');
        setStageFit(false);
        return;
      }

      if (simulatedCursor) simulatedCursor.style.opacity = '0';
      if (startOverlay) {
        startOverlay.style.opacity = '0';
        startOverlay.style.display = 'none';
      }

      /* Phase 2: Active gameplay through the 17 levels */
      if (u <= U_END) {
        const pos = posOfU(u);
        renderGameFrame(pos, ZOOM, { time: now, blink });
        const step = clamp(Math.floor(pos), 0, N_STEPS);
        const eaten = fruitsEaten(pos);

        if (scoreEl) scoreEl.textContent = String(SIM.scoreAt[step]).padStart(5, '0');
        if (statusEl) {
          statusEl.textContent = `LEVEL ${Math.min(FRUIT_COUNT, eaten + 1)}`;
          statusEl.style.color = '#00ffff';
        }
        if (unlockedCount) unlockedCount.textContent = eaten;
        drawHUDTrays(eaten);
        updatePopup(u, pos);

        // Sound trigger on level / fruit eat
        if (eaten > lastEatenCount && eaten > 0) {
          lastEatenCount = eaten;
          if (window.RetroAudio) window.RetroAudio.playSfx('powerup');
        }

        if (brandShown) brandShown = false;
        if (finaleBranding) finaleBranding.classList.remove('show');
        setStageFit(false);
        if (brandSub) brandSub.style.opacity = '0';
        if (jumpWrap) jumpWrap.style.opacity = '0';
        if (lettersOn !== 0) {
          brandLetters.forEach(l => l.classList.remove('on'));
          lettersOn = 0;
        }
        stageClearSoundPlayed = false;
        return;
      }

      /* Phase 3: Victory, camera zoom-out reveals full map, IIIT Bhubaneswar lighting */
      const fp = clamp((u - U_END) / FINALE_PX, 0, 1);
      const zoomT = easeInOut(clamp(fp / 0.42, 0, 1));
      // Zoom out to 1.0 so the entire map is completely visible
      const zoom = lerp(ZOOM, 1.0, zoomT);
      const flash = fp < 0.42 && (Math.floor(fp * 36) % 2 === 1);
      renderGameFrame(N_STEPS, zoom, { time: now, blink, flash, centerWorld: true, centerT: zoomT });

      if (scoreEl) scoreEl.textContent = String(SIM.scoreAt[N_STEPS]).padStart(5, '0');
      if (statusEl) {
        statusEl.textContent = 'STAGE CLEAR!';
        statusEl.style.color = '#00ff66';
      }
      if (unlockedCount) unlockedCount.textContent = String(FRUIT_COUNT);
      drawHUDTrays(FRUIT_COUNT);
      hidePopup();

      if (!stageClearSoundPlayed) {
        stageClearSoundPlayed = true;
        if (window.RetroAudio) window.RetroAudio.playSfx('start');
      }

      const show = fp > 0.34;
      if (finaleBranding) {
        finaleBranding.classList.toggle('show', show);
        setStageFit(show);
      }
      const on = Math.floor(clamp((fp - 0.42) / 0.3, 0, 1) * BRAND.length + 0.0001);
      if (on !== lettersOn) {
        brandLetters.forEach((l, i) => l.classList.toggle('on', i < on));
        lettersOn = on;
      }
      if (brandSub) brandSub.style.opacity = fp > 0.78 ? '1' : '0';
      if (jumpWrap) jumpWrap.style.opacity = fp > 0.86 ? '1' : '0';
    }

    /* ==========================================================================
       7. SMOOTH SCROLL INTEGRATION
       ========================================================================== */
    let target = 0, current = 0, dirty = true, blinkPhase = -1;

    function sizeTrack() {
      if (scrollTrack) {
        scrollTrack.style.height = Math.ceil(U_END + FINALE_PX + window.innerHeight) + 'px';
      }
    }

    function updateFadeAndOffset() {
      if (!pacSection) return 0;
      const rect = pacSection.getBoundingClientRect();
      const vh = window.innerHeight || 800;

      if (pacStickyWrap) {
        if (rect.top >= vh) {
          pacStickyWrap.style.opacity = '0';
          pacStickyWrap.style.pointerEvents = 'none';
        } else if (rect.top > 0) {
          // Smooth fade in as pacman section scrolls into view
          const fadeProgress = clamp(1 - (rect.top / (vh * 0.75)), 0, 1);
          pacStickyWrap.style.opacity = fadeProgress.toFixed(3);
          pacStickyWrap.style.pointerEvents = fadeProgress > 0.5 ? 'auto' : 'none';
        } else {
          pacStickyWrap.style.opacity = '1';
          pacStickyWrap.style.pointerEvents = 'auto';
        }
      }

      return Math.max(0, -rect.top);
    }

    function frame(now) {
      const d = target - current;
      if (Math.abs(d) > 0.25) { current += d * 0.2; dirty = true; }
      else if (current !== target) { current = target; dirty = true; }
      const ph = Math.floor(now / 250) & 1;
      if (ph !== blinkPhase) { blinkPhase = ph; dirty = true; }
      if (dirty) { dirty = false; render(current, now); }
      requestAnimationFrame(frame);
    }

    window.addEventListener('scroll', () => {
      target = updateFadeAndOffset();
    }, { passive: true });

    window.addEventListener('resize', () => {
      sizeTrack();
      resizeCanvas();
      if (finaleBranding && finaleBranding.classList.contains('show')) {
        setStageFit(true);
      }
      updateFadeAndOffset();
      lastTrayCount = -1;
      dirty = true;
    });

    const topBtn = document.getElementById('scrollToTopBtn');
    if (topBtn) {
      topBtn.addEventListener('click', () => {
        const pacTop = pacSection.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop);
        window.scrollTo({ top: pacTop, behavior: 'smooth' });
      });
    }

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        const pacTop = pacSection.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop);
        window.scrollTo({ top: pacTop + 750, behavior: 'smooth' });
      });
    }

    // Direct continuation trigger from "LET'S START"
    const heroStartLink = document.querySelector('a[href="#pacman-section"]');
    if (heroStartLink) {
      heroStartLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.RetroAudio) window.RetroAudio.playSfx('start');
        const pacTop = pacSection.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop);
        window.scrollTo({ top: pacTop, behavior: 'smooth' });
      });
    }

    // Initialize layout & first frame
    sizeTrack();
    resizeCanvas();
    if (window.ResizeObserver && container) {
      new ResizeObserver(() => { resizeCanvas(); lastTrayCount = -1; dirty = true; }).observe(container);
    }
    target = current = updateFadeAndOffset();
    dirty = true;
    requestAnimationFrame(frame);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { dirty = true; });
    }
  });
})();
