// Main Interactivity Script for D3 Fest 2026
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Highlight Active Nav Link
    const path = window.location.pathname;
    let pageName = 'index';
    if (path.includes('about')) pageName = 'about';
    else if (path.includes('events')) pageName = 'events';
    else if (path.includes('merch')) pageName = 'merch';
    else if (path.includes('sponsors')) pageName = 'sponsors';
    else if (path.includes('contact')) pageName = 'contact';
    else if (path.includes('gallery')) pageName = 'gallery';

    document.querySelectorAll(`.nav-link[data-page="${pageName}"]`).forEach((link) => {
      link.classList.add('active');
    });

    // 2. HERO ARCADE CABINET & CRT EXPERIENCE (on index.html)
    const heroSection = document.getElementById('hero');
    const heroPin = document.getElementById('hero-pin-container');
    const cabinetMachine = document.getElementById('arcade-cabinet-wrapper');
    const heroScrollPrompt = document.getElementById('hero-scroll-prompt');
    const arenaOverlay = document.getElementById('hero-arena-overlay');

    const crtMonitor = document.getElementById('arcade-crt-monitor');
    const crtStreakLine = document.getElementById('crt-streak-line');
    const crtPowerFlash = document.getElementById('crt-power-flash');
    const stageWelcome = document.getElementById('crt-stage-welcome');
    const namasteIcon = document.getElementById('crt-namaste-icon');
    const stageQuestions = document.getElementById('crt-stage-questions');
    const sysHeader = document.getElementById('crt-sys-header');
    const sysFooter = document.getElementById('crt-sys-footer');
    const headerCredits = document.getElementById('crt-header-credits');
    const coinSub = document.getElementById('crt-coin-sub');
    const promptStrip = document.getElementById('crt-prompt-strip');
    const crtCharacter = document.getElementById('crt-character');
    const q1Wrap = document.getElementById('crt-q1-wrap');
    const q2Wrap = document.getElementById('crt-q2-wrap');
    const q3Wrap = document.getElementById('crt-q3-wrap');
    const q1 = document.getElementById('crt-q1');
    const q2 = document.getElementById('crt-q2');
    const q3 = document.getElementById('crt-q3');
    const promptCoin = document.getElementById('crt-insert-coin-prompt');
    const coinDots = document.getElementById('coin-dots');
    const coinVal = document.getElementById('coin-val');

    const coin1 = document.getElementById('coin-1');
    const coin2 = document.getElementById('coin-2');
    const coin3 = document.getElementById('coin-3');

    const slotTarget = document.getElementById('arcade-coin-slot-target');
    const slotFlash = document.getElementById('coin-slot-flash');
    const stageReady = document.getElementById('crt-stage-ready');
    const pressStartBtn = document.getElementById('crt-press-start-btn');
    const stageBoot = document.getElementById('crt-stage-boot');
    const bootProgressBar = document.getElementById('crt-boot-progress-bar');

    if (heroSection && heroPin && cabinetMachine && window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);

      function getCoinDeltas() {
        const w = cabinetMachine.offsetWidth || 450;
        const h = cabinetMachine.offsetHeight || 600;
        const fbDx = -0.28 * w;
        const fbDy = 0.23 * h;

        if (!slotTarget || !coin1) {
          return {
            d1: { x: fbDx, y: fbDy },
            d2: { x: fbDx, y: fbDy },
            d3: { x: fbDx, y: fbDy }
          };
        }

        const slotRect = slotTarget.getBoundingClientRect();
        const slotX = slotRect.left + slotRect.width / 2;
        const slotY = slotRect.top + slotRect.height / 2;

        function calc(coinEl) {
          if (!coinEl) return { x: fbDx, y: fbDy };
          const cr = coinEl.getBoundingClientRect();
          const cx = cr.left + cr.width / 2;
          const cy = cr.top + cr.height / 2;
          return {
            x: slotX - cx,
            y: slotY - cy
          };
        }

        return {
          d1: calc(coin1),
          d2: calc(coin2),
          d3: calc(coin3)
        };
      }

      let deltas = getCoinDeltas();
      ScrollTrigger.addEventListener('refreshInit', () => {
        deltas = getCoinDeltas();
      });
      window.addEventListener('load', () => {
        deltas = getCoinDeltas();
        ScrollTrigger.refresh();
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroSection,
          start: 'top top',
          end: '+=420%',
          pin: heroPin,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      // SFX & Live Counter Triggers synchronized with scroll scrub
      let soundPlayed = {
        crt: false,
        welcome: false,
        q1: false,
        q2: false,
        q3: false,
        coin1: false,
        coin2: false,
        coin3: false,
        ready: false
      };

      ScrollTrigger.create({
        trigger: heroSection,
        start: 'top top',
        end: '+=450%',
        onUpdate: (self) => {
          const p = self.progress;

          // CRT Power-On Sound
          if (p > 0.03 && !soundPlayed.crt && self.direction > 0) {
            soundPlayed.crt = true;
            if (window.RetroAudio) window.RetroAudio.playSfx('crt');
          } else if (p < 0.02 && soundPlayed.crt) {
            soundPlayed.crt = false;
          }

          // Welcome screen 🙏 chime
          if (p > 0.06 && !soundPlayed.welcome && self.direction > 0) {
            soundPlayed.welcome = true;
            if (window.RetroAudio) window.RetroAudio.playSfx('blip');
          } else if (p < 0.04 && soundPlayed.welcome) {
            soundPlayed.welcome = false;
          }

          // Question 1 Blip
          if (p > 0.16 && !soundPlayed.q1 && self.direction > 0) {
            soundPlayed.q1 = true;
            if (window.RetroAudio) window.RetroAudio.playSfx('blip');
          } else if (p < 0.13 && soundPlayed.q1) {
            soundPlayed.q1 = false;
          }

          // Question 2 Blip
          if (p > 0.27 && !soundPlayed.q2 && self.direction > 0) {
            soundPlayed.q2 = true;
            if (window.RetroAudio) window.RetroAudio.playSfx('blip');
          } else if (p < 0.24 && soundPlayed.q2) {
            soundPlayed.q2 = false;
          }

          // Question 3 Blip
          if (p > 0.38 && !soundPlayed.q3 && self.direction > 0) {
            soundPlayed.q3 = true;
            if (window.RetroAudio) window.RetroAudio.playSfx('blip');
          } else if (p < 0.35 && soundPlayed.q3) {
            soundPlayed.q3 = false;
          }

          // Coin 1 (₹1) Arrival
          if (p > 0.58 && !soundPlayed.coin1 && self.direction > 0) {
            soundPlayed.coin1 = true;
            if (window.RetroAudio) window.RetroAudio.playSfx('coin', 1);
            if (coinDots) coinDots.textContent = '● ○ ○';
            if (coinVal) coinVal.textContent = '1';
            if (headerCredits) headerCredits.textContent = 'CREDITS: 01';
            if (coinSub) coinSub.textContent = '₹2 MORE >';
          } else if (p < 0.55 && soundPlayed.coin1) {
            soundPlayed.coin1 = false;
            if (coinDots) coinDots.textContent = '○ ○ ○';
            if (coinVal) coinVal.textContent = '0';
            if (headerCredits) headerCredits.textContent = 'CREDITS: 00';
            if (coinSub) coinSub.textContent = '₹1 EACH >';
          }

          // Coin 2 (₹2) Arrival
          if (p > 0.66 && !soundPlayed.coin2 && self.direction > 0) {
            soundPlayed.coin2 = true;
            if (window.RetroAudio) window.RetroAudio.playSfx('coin', 2);
            if (coinDots) coinDots.textContent = '● ● ○';
            if (coinVal) coinVal.textContent = '2';
            if (headerCredits) headerCredits.textContent = 'CREDITS: 02';
            if (coinSub) coinSub.textContent = '₹1 MORE >';
          } else if (p < 0.63 && soundPlayed.coin2) {
            soundPlayed.coin2 = false;
            if (coinDots) coinDots.textContent = '● ○ ○';
            if (coinVal) coinVal.textContent = '1';
            if (headerCredits) headerCredits.textContent = 'CREDITS: 01';
            if (coinSub) coinSub.textContent = '₹2 MORE >';
          }

          // Coin 3 (₹3) Arrival
          if (p > 0.74 && !soundPlayed.coin3 && self.direction > 0) {
            soundPlayed.coin3 = true;
            if (window.RetroAudio) window.RetroAudio.playSfx('coin', 3);
            if (coinDots) coinDots.textContent = '● ● ●';
            if (coinVal) coinVal.textContent = '3';
            if (headerCredits) headerCredits.textContent = 'CREDITS: 03';
            if (coinSub) {
              coinSub.textContent = 'PAID! >';
              coinSub.classList.add('text-[#ffe600]');
            }
          } else if (p < 0.71 && soundPlayed.coin3) {
            soundPlayed.coin3 = false;
            if (coinDots) coinDots.textContent = '● ● ○';
            if (coinVal) coinVal.textContent = '2';
            if (headerCredits) headerCredits.textContent = 'CREDITS: 02';
            if (coinSub) {
              coinSub.textContent = '₹1 MORE >';
              coinSub.classList.remove('text-[#ffe600]');
            }
          }

          // Ready sound
          if (p > 0.79 && !soundPlayed.ready && self.direction > 0) {
            soundPlayed.ready = true;
            if (window.RetroAudio) window.RetroAudio.playSfx('powerup');
          } else if (p < 0.76 && soundPlayed.ready) {
            soundPlayed.ready = false;
          }
        }
      });

      // TIMELINE SEQUENCE: Starts with 100% Blank Screen, Blue Screen with 🙏, then Questions ONE AT A TIME!
      
      // 1. CRT Monitor Powers On (Horizontal Light Streak & Screen Flash)
      tl.fromTo(crtStreakLine, 
        { scaleX: 0, opacity: 1 }, 
        { scaleX: 1, duration: 0.35, ease: 'power2.inOut' }, 
        0.4
      );
      tl.to(crtStreakLine, { scaleY: 15, opacity: 0, duration: 0.18 }, 0.75);
      tl.fromTo(crtPowerFlash, 
        { opacity: 0.9 }, 
        { opacity: 0, duration: 0.35 }, 
        0.75
      );

      // STAGE 0: BLUE WELCOME SCREEN WITH PIXELATED 🙏
      if (stageWelcome) {
        tl.fromTo(stageWelcome, 
          { opacity: 0 }, 
          { opacity: 1, duration: 0.35, ease: 'power1.out' }, 
          0.75
        );
        if (namasteIcon) {
          tl.fromTo(namasteIcon, 
            { scale: 0.8, y: 6 }, 
            { scale: 1, y: 0, duration: 0.45, ease: 'back.out(1.6)' }, 
            0.85
          );
        }
        tl.to(stageWelcome, { opacity: 0, duration: 0.35 }, 2.0);
      }

      // STAGE 1: QUESTIONS ONE AT A TIME
      tl.to(stageQuestions, { opacity: 1, duration: 0.2 }, 2.2);
      tl.fromTo(sysHeader, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.25 }, 2.2);
      tl.fromTo(sysFooter, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.25 }, 2.2);

      // --- QUESTION 1 (Alone on Screen) ---
      if (q1Wrap) {
        tl.fromTo(q1Wrap, 
          { opacity: 0, y: 10 }, 
          { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, 
          2.4
        );
        tl.to(q1Wrap, { opacity: 0, y: -10, duration: 0.35, ease: 'power2.in' }, 3.7);
      }

      // --- QUESTION 2 (Alone on Screen) ---
      if (q2Wrap) {
        tl.fromTo(q2Wrap, 
          { opacity: 0, y: 10 }, 
          { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, 
          4.1
        );
        tl.to(q2Wrap, { opacity: 0, y: -10, duration: 0.35, ease: 'power2.in' }, 5.4);
      }

      // --- QUESTION 3 (Alone on Screen) ---
      if (q3Wrap) {
        tl.fromTo(q3Wrap, 
          { opacity: 0, y: 10 }, 
          { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, 
          5.8
        );
        tl.to(q3Wrap, { opacity: 0, y: -10, duration: 0.35, ease: 'power2.in' }, 7.1);
      }

      // --- INSERT COIN PROMPT (Alone on Screen after questions) ---
      if (promptStrip) {
        tl.fromTo(promptStrip, 
          { opacity: 0, scale: 0.9 }, 
          { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.4)' }, 
          7.5
        );
      }
      tl.to(promptCoin, { 
        boxShadow: '0 0 15px #ffe600, inset 0 0 6px #ffe600', 
        scale: 1.05, 
        duration: 0.25, 
        yoyo: true, 
        repeat: 1 
      }, 7.9);

      // 4. COIN 1 (₹1) enters slot
      tl.to(coin1, { 
        y: -30, 
        scale: 1.25, 
        rotateY: 180, 
        rotate: -15, 
        duration: 0.38, 
        ease: 'power1.out' 
      }, 8.4);
      tl.to(coin1, { 
        x: () => deltas.d1.x, 
        y: () => deltas.d1.y, 
        rotateY: 720, 
        rotate: 90, 
        scale: 0.22, 
        opacity: 0, 
        duration: 0.52, 
        ease: 'power2.in' 
      }, 8.78);
      tl.fromTo(slotFlash, 
        { opacity: 1 }, 
        { opacity: 0, duration: 0.22 }, 
        9.3
      );

      // 5. COIN 2 (₹2) enters slot
      tl.to(coin2, { 
        y: -30, 
        scale: 1.25, 
        rotateY: 180, 
        rotate: -15, 
        duration: 0.38, 
        ease: 'power1.out' 
      }, 9.6);
      tl.to(coin2, { 
        x: () => deltas.d2.x, 
        y: () => deltas.d2.y, 
        rotateY: 720, 
        rotate: 90, 
        scale: 0.22, 
        opacity: 0, 
        duration: 0.52, 
        ease: 'power2.in' 
      }, 9.98);
      tl.fromTo(slotFlash, 
        { opacity: 1 }, 
        { opacity: 0, duration: 0.22 }, 
        10.5
      );

      // 6. COIN 3 (₹3) enters slot
      tl.to(coin3, { 
        y: -30, 
        scale: 1.25, 
        rotateY: 180, 
        rotate: -15, 
        duration: 0.38, 
        ease: 'power1.out' 
      }, 10.8);
      tl.to(coin3, { 
        x: () => deltas.d3.x, 
        y: () => deltas.d3.y, 
        rotateY: 720, 
        rotate: 90, 
        scale: 0.22, 
        opacity: 0, 
        duration: 0.52, 
        ease: 'power2.in' 
      }, 11.18);
      tl.fromTo(slotFlash, 
        { opacity: 1 }, 
        { opacity: 0, duration: 0.25 }, 
        11.7
      );

      // 7. "PLAYER 1 READY" Screen Appears with CRT glitch burst
      tl.to(stageQuestions, { opacity: 0, duration: 0.2 }, 12.0);
      tl.to(stageReady, { opacity: 1, pointerEvents: 'auto', duration: 0.35 }, 12.2);

      // 8. Screen Magnifies & Zooms forward right into CRT monitor glass (Origin: 50.0% 42.0%)
      tl.to(cabinetMachine, { 
        scale: 5.8, 
        transformOrigin: '50.0% 42.0%', 
        duration: 1.8, 
        ease: 'power2.inOut' 
      }, 12.7);

      if (heroScrollPrompt) {
        tl.to(heroScrollPrompt, { 
          opacity: 0, 
          y: 20, 
          duration: 0.4, 
          ease: 'power1.out' 
        }, 12.7);
      }

      // 9. Turn Dark and show INITIALIZING Boot Screen...
      tl.to(stageReady, { opacity: 0, duration: 0.2 }, 13.8);
      tl.to(stageBoot, { opacity: 1, duration: 0.3 }, 14.0);
      tl.to(bootProgressBar, { width: '100%', duration: 0.8, ease: 'power1.inOut' }, 14.2);

      // 10. Cabinet Fades and Main Festival Page blooms open
      tl.to(cabinetMachine, { opacity: 0, duration: 0.5 }, 14.9);

      if (arenaOverlay) {
        tl.fromTo(
          arenaOverlay,
          { opacity: 0, scale: 0.94, pointerEvents: 'none' },
          { opacity: 1, scale: 1, pointerEvents: 'auto', duration: 0.8, ease: 'power1.out' },
          15.1
        );
      }

      // 11. INTERACTIVE START & KEYBOARD TRIGGER SYSTEM
      let experienceStarted = false;

      function triggerAutoOrClickStart() {
        if (experienceStarted) return;
        experienceStarted = true;
        if (window.RetroAudio) window.RetroAudio.playSfx('start');

        // Smoothly glide through the arcade sequence to reveal the festival hub
        const pinHeight = heroPin.offsetHeight;
        const targetScrollY = heroSection.offsetTop + pinHeight * 4.4;

        const startY = window.pageYOffset || document.documentElement.scrollTop;
        const diff = targetScrollY - startY;
        const durationMs = 3800;
        const startTime = performance.now();

        function smoothStep(now) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / durationMs, 1);
          // Ease in-out cubic
          const ease = progress < 0.5 
            ? 4 * progress * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
          
          window.scrollTo(0, startY + diff * ease);
          if (progress < 1) {
            requestAnimationFrame(smoothStep);
          }
        }
        requestAnimationFrame(smoothStep);
      }

      window.startArcadeExperience = triggerAutoOrClickStart;

      // Listen for Enter or Space key to start
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.code === 'Space') {
          if (window.scrollY < window.innerHeight * 0.6) {
            e.preventDefault();
            triggerAutoOrClickStart();
          }
        }
      });

      // Press Start Button click
      if (pressStartBtn) {
        pressStartBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          triggerAutoOrClickStart();
        });
      }
    }

    // 2.5 PAC-MAN INTERACTIVE EXPERIENCE (Smooth trigger from hero)
    const heroStartBtn = document.querySelector('a[href="#pacman-section"]');
    if (heroStartBtn) {
      heroStartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.RetroAudio) window.RetroAudio.playSfx('start');
        const pacSection = document.getElementById('pacman-section');
        if (pacSection) {
          const pacTop = pacSection.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop);
          window.scrollTo({
            top: pacTop,
            behavior: 'smooth'
          });
        }
      });
    }

    // 3. EVENTS PAC-MAN ROADMAP (on events.html)
    const roadContainer = document.getElementById('events-roadmap-container');
    const pacmanRunner = document.getElementById('pacman-runner');
    const dotsContainer = document.getElementById('roadmap-dots-container');

    if (roadContainer && pacmanRunner && window.FEST_CONFIG && window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);

      const eventsList = window.FEST_CONFIG.events || [];
      const eventCount = eventsList.length;

      // Construct Waypoints
      const waypoints = [];
      for (let i = 0; i < eventCount; i++) {
        const isEven = i % 2 === 0;
        const y = 2.5 + (i / (eventCount - 1)) * 93;
        const x = isEven ? 25 : 75;
        if (i === 0) {
          waypoints.push({ x: 25, y });
        } else {
          const lastX = waypoints[waypoints.length - 1].x;
          waypoints.push({ x: lastX, y });
          waypoints.push({ x, y });
        }
      }
      const lastX = waypoints[waypoints.length - 1].x;
      waypoints.push({ x: lastX, y: 98 });
      waypoints.push({ x: 50, y: 98 });
      waypoints.push({ x: 50, y: 100 });

      // Generate Road Dots
      if (dotsContainer) {
        dotsContainer.innerHTML = '';
        const dots = [];
        let id = 0;
        for (let i = 0; i < waypoints.length - 1; i++) {
          const p1 = waypoints[i];
          const p2 = waypoints[i + 1];
          const steps =
            p1.y === p2.y
              ? Math.max(6, Math.round(Math.abs(p2.x - p1.x) / 1.6))
              : Math.max(5, Math.round(Math.abs(p2.y - p1.y) / 0.8));

          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const dotEl = document.createElement('div');
            dotEl.className =
              'absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 bg-[#ffe600] shadow-[0_0_8px_#ffe600] rounded-none transition-all duration-75';
            dotEl.style.left = `${p1.x + (p2.x - p1.x) * t}%`;
            dotEl.style.top = `${p1.y + (p2.y - p1.y) * t}%`;
            dotsContainer.appendChild(dotEl);
          }
        }
      }

      function getPacmanPos(progress) {
        const segCount = waypoints.length - 1;
        const totalProgress = Math.min(progress * segCount, segCount - 0.001);
        const segIndex = Math.floor(totalProgress);
        const segFraction = totalProgress - segIndex;
        const p1 = waypoints[segIndex];
        const p2 = waypoints[segIndex + 1];

        const x = p1.x + (p2.x - p1.x) * segFraction;
        const y = p1.y + (p2.y - p1.y) * segFraction;

        let rot = 0;
        let flipY = false;
        if (p2.x > p1.x) rot = 0;
        else if (p2.x < p1.x) {
          rot = 180;
          flipY = true;
        } else if (p2.y > p1.y) rot = 90;
        else if (p2.y < p1.y) rot = 270;

        return { x, y, rot, flipY };
      }

      const cardEls = document.querySelectorAll('.arena-card-item');
      let lastActive = -1;

      ScrollTrigger.create({
        trigger: roadContainer,
        start: 'top top+=80',
        end: 'bottom bottom-=80',
        scrub: 0.1,
        onUpdate: (self) => {
          const progress = self.progress;
          const pos = getPacmanPos(progress);

          pacmanRunner.style.left = `${pos.x}%`;
          pacmanRunner.style.top = `${pos.y}%`;
          pacmanRunner.style.transform = `translate(-50%, -50%) rotate(${pos.rot}deg) ${
            pos.flipY ? 'scaleY(-1)' : ''
          }`;

          // Dots eating
          if (dotsContainer) {
            const dots = dotsContainer.children;
            const eaten = Math.floor(progress * dots.length);
            for (let i = 0; i < dots.length; i++) {
              const dot = dots[i];
              if (i <= eaten) {
                dot.style.opacity = '0.15';
                dot.style.transform = 'translate(-50%, -50%) scale(0.6)';
                dot.style.backgroundColor = '#52525b';
                dot.style.boxShadow = 'none';
              } else {
                dot.style.opacity = '1';
                dot.style.transform = 'translate(-50%, -50%) scale(1)';
                dot.style.backgroundColor = '#ffe600';
                dot.style.boxShadow = '0 0 8px #ffe600';
              }
            }
          }

          // Card highlight
          const activeIdx = Math.min(Math.floor(progress * eventCount), eventCount - 1);
          if (activeIdx !== lastActive) {
            lastActive = activeIdx;
            cardEls.forEach((card, idx) => {
              if (idx === activeIdx) {
                card.classList.add('ring-2', 'ring-[#ffe600]', 'scale-[1.02]', 'shadow-[0_0_35px_rgba(255,230,0,0.7)]');
              } else {
                card.classList.remove('ring-2', 'ring-[#ffe600]', 'scale-[1.02]', 'shadow-[0_0_35px_rgba(255,230,0,0.7)]');
              }
            });
          }
        },
      });

      // Events Filtering
      const searchInput = document.getElementById('events-search-input');
      const catButtons = document.querySelectorAll('.event-cat-btn');

      let currentCategory = 'ALL';
      let currentQuery = '';

      function filterEvents() {
        cardEls.forEach((card) => {
          const category = card.getAttribute('data-category') || '';
          const title = card.getAttribute('data-title') || '';
          const subtitle = card.getAttribute('data-subtitle') || '';
          const desc = card.getAttribute('data-desc') || '';

          const matchCat = currentCategory === 'ALL' || category === currentCategory;
          const matchQuery =
            currentQuery === '' ||
            title.toLowerCase().includes(currentQuery) ||
            subtitle.toLowerCase().includes(currentQuery) ||
            desc.toLowerCase().includes(currentQuery);

          if (matchCat && matchQuery) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
        ScrollTrigger.refresh();
      }

      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          currentQuery = e.target.value.toLowerCase().trim();
          filterEvents();
        });
      }

      catButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          if (window.RetroAudio) window.RetroAudio.playSfx('blip');
          catButtons.forEach((b) => {
            b.classList.remove('bg-[#ffe600]', 'text-black', 'font-bold', 'shadow-[0_0_10px_#ffe600]');
            b.classList.add('bg-black/80', 'text-zinc-400');
          });
          btn.classList.add('bg-[#ffe600]', 'text-black', 'font-bold', 'shadow-[0_0_10px_#ffe600]');
          btn.classList.remove('bg-black/80', 'text-zinc-400');

          currentCategory = btn.getAttribute('data-category');
          filterEvents();
        });
      });
    }

    // 4. Modals (Qualifiers & Details)
    window.openEventDetails = function (eventId) {
      if (window.RetroAudio) window.RetroAudio.playSfx('blip');
      const modal = document.getElementById(`modal-${eventId}`);
      if (modal) modal.classList.remove('hidden');
    };

    window.closeModal = function (modalId) {
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.add('hidden');
    };

    // Close on backdrop click & Escape key
    document.querySelectorAll('.modal-overlay').forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay:not(.hidden)').forEach((modal) => {
          modal.classList.add('hidden');
        });
      }
    });

    // 5. MERCH FORM SUBMISSION
    const merchForm = document.getElementById('merch-notify-form');
    const merchSuccess = document.getElementById('merch-notify-success');
    if (merchForm && merchSuccess) {
      merchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (window.RetroAudio) window.RetroAudio.playSfx('coin');
        merchForm.classList.add('hidden');
        merchSuccess.classList.remove('hidden');
        setTimeout(() => {
          merchForm.reset();
          merchSuccess.classList.add('hidden');
          merchForm.classList.remove('hidden');
        }, 4000);
      });
    }

    // 6. CONTACT FORM SUBMISSION
    const contactForm = document.getElementById('contact-msg-form');
    const contactSuccess = document.getElementById('contact-msg-success');
    if (contactForm && contactSuccess) {
      contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (window.RetroAudio) window.RetroAudio.playSfx('start');
        contactForm.classList.add('hidden');
        contactSuccess.classList.remove('hidden');
        setTimeout(() => {
          contactForm.reset();
          contactSuccess.classList.add('hidden');
          contactForm.classList.remove('hidden');
        }, 4000);
      });
    }
  });
})();
