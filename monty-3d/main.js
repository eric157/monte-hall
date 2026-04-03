(function bootstrapMontyHallLab() {
  "use strict";

  if (!window.THREE) {
    reportFatal("Three.js failed to load. Check your internet connection and refresh.");
    return;
  }
  if (!window.BayesianTracker) {
    reportFatal("Bayesian module failed to load.");
    return;
  }

  const elements = {
    sceneWrap: document.getElementById("scene-wrap"),
    canvas: document.getElementById("three-canvas"),
    errorBanner: document.getElementById("error-banner"),
    run1: document.getElementById("run-1"),
    run10: document.getElementById("run-10"),
    run100: document.getElementById("run-100"),
    autoToggle: document.getElementById("auto-toggle"),
    reset: document.getElementById("reset"),
    autoSpeed: document.getElementById("auto-speed"),
    autoSpeedValue: document.getElementById("auto-speed-value"),
    roundDetail: document.getElementById("round-detail"),
    chart: document.getElementById("chart"),
    trialCount: document.getElementById("trial-count"),
    stayRate: document.getElementById("stay-rate"),
    switchRate: document.getElementById("switch-rate"),
    switchAdvantage: document.getElementById("switch-advantage"),
    traceFirst: document.getElementById("trace-first"),
    traceHost: document.getElementById("trace-host"),
    traceSwitch: document.getElementById("trace-switch"),
    traceStayOutcome: document.getElementById("trace-stay-outcome"),
    traceSwitchOutcome: document.getElementById("trace-switch-outcome"),
    traceWhy: document.getElementById("trace-why")
  };

  const palette = {
    bgTop: 0x0d1f2d,
    bgBottom: 0x09131d,
    stage: 0x15314a,
    stayMarker: 0x36a2eb,
    switchMarker: 0xff8c42,
    hostMarker: 0xff5c5c
  };

  const appState = {
    trialCount: 0,
    autoRunning: false,
    autoAccumulator: 0,
    autoLastTimestamp: 0,
    autoFrameId: null,
    currentRound: null
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 3.25, 9.25);
  camera.lookAt(0, 0.5, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas: elements.canvas,
    antialias: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(palette.bgBottom);

  const textureLoader = new THREE.TextureLoader();
  const textures = {
    doorClosed: null,
    doorOpen: null,
    goat: null,
    prize: null
  };

  const tracker = new window.BayesianTracker(elements.chart, {
    trialCount: elements.trialCount,
    stayRate: elements.stayRate,
    switchRate: elements.switchRate,
    switchAdvantage: elements.switchAdvantage
  });

  const doors = buildDoors();
  const markers = buildChoiceMarkers();
  buildSceneBase();
  bindUiEvents();
  primeTextures();
  resizeRenderer();
  window.addEventListener("resize", resizeRenderer);
  animate();
  updateRoundDetail(null);

  function reportFatal(message) {
    const banner = document.getElementById("error-banner");
    if (banner) {
      banner.hidden = false;
      banner.textContent = message;
    }
  }

  function buildSceneBase() {
    const hemisphere = new THREE.HemisphereLight(0xffffff, 0x18324a, 1.2);
    scene.add(hemisphere);

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(6, 10, 8);
    scene.add(key);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 10),
      new THREE.MeshStandardMaterial({
        color: palette.stage,
        roughness: 0.9,
        metalness: 0.05
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.65;
    scene.add(floor);

    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 10),
      new THREE.MeshBasicMaterial({
        color: palette.bgTop
      })
    );
    backdrop.position.z = -3.5;
    backdrop.position.y = 2;
    scene.add(backdrop);
  }

  function buildDoors() {
    const doorObjects = [];
    const doorHeight = 4.4;
    const doorWidth = doorHeight * (1050 / 1636);
    const spacing = 3.35;

    for (let i = 0; i < 3; i += 1) {
      const root = new THREE.Group();
      root.position.set((i - 1) * spacing, 0.58, 0);

      const cardGeometry = new THREE.PlaneGeometry(doorWidth, doorHeight);
      const closedMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        alphaTest: 0.02,
        side: THREE.DoubleSide
      });
      const openMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        alphaTest: 0.02,
        side: THREE.DoubleSide,
        opacity: 0
      });
      const contentMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        alphaTest: 0.02,
        side: THREE.DoubleSide,
        opacity: 0
      });

      const closedMesh = new THREE.Mesh(cardGeometry, closedMat);
      const openMesh = new THREE.Mesh(cardGeometry, openMat);
      openMesh.position.z = 0.005;
      root.add(closedMesh);
      root.add(openMesh);

      const contentMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.3, 1.3),
        contentMat
      );
      contentMesh.position.set(-0.44, -0.34, -0.04);
      root.add(contentMesh);

      scene.add(root);
      doorObjects.push({
        index: i,
        root,
        closedMesh,
        openMesh,
        contentMesh,
        closedMat,
        openMat,
        contentMat,
        isOpen: false,
        hasPrize: false,
        openProgress: 0,
        targetOpen: 0
      });
    }

    return doorObjects;
  }

  function buildChoiceMarkers() {
    const markerGeometry = new THREE.TorusGeometry(0.55, 0.075, 14, 32);
    const stayMarker = new THREE.Mesh(
      markerGeometry,
      new THREE.MeshStandardMaterial({ color: palette.stayMarker })
    );
    stayMarker.rotation.x = Math.PI / 2;
    stayMarker.visible = false;
    scene.add(stayMarker);

    const switchMarker = new THREE.Mesh(
      markerGeometry,
      new THREE.MeshStandardMaterial({ color: palette.switchMarker })
    );
    switchMarker.rotation.x = Math.PI / 2;
    switchMarker.visible = false;
    scene.add(switchMarker);

    const hostMarker = new THREE.Mesh(
      markerGeometry,
      new THREE.MeshStandardMaterial({ color: palette.hostMarker })
    );
    hostMarker.rotation.x = Math.PI / 2;
    hostMarker.visible = false;
    scene.add(hostMarker);

    return { stayMarker, switchMarker, hostMarker };
  }

  function bindUiEvents() {
    elements.run1.addEventListener("click", () => runTrials(1));
    elements.run10.addEventListener("click", () => runTrials(10));
    elements.run100.addEventListener("click", () => runTrials(100));
    elements.reset.addEventListener("click", resetApp);

    elements.autoToggle.addEventListener("click", () => {
      if (appState.autoRunning) {
        stopAutoRun();
      } else {
        startAutoRun();
      }
    });

    elements.autoSpeed.addEventListener("input", () => {
      elements.autoSpeedValue.textContent = String(getAutoSpeed());
    });
  }

  function primeTextures() {
    loadTexture("assets/close-door.png", (texture) => {
      textures.doorClosed = texture;
      refreshDoorTextures();
    });
    loadTexture("assets/open-door.png", (texture) => {
      textures.doorOpen = texture;
      refreshDoorTextures();
    });
    loadTexture("assets/poop.png", (texture) => {
      textures.goat = texture;
      refreshDoorTextures();
    });
    loadTexture("assets/gold-bar.png", (texture) => {
      textures.prize = texture;
      refreshDoorTextures();
    });
  }

  function loadTexture(path, onSuccess) {
    textureLoader.load(
      path,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        onSuccess(texture);
      },
      undefined,
      () => {
        console.warn(`Texture failed to load: ${path}`);
      }
    );
  }

  function refreshDoorTextures() {
    for (const door of doors) {
      const doorMap = textures.doorClosed;
      const openDoorMap = textures.doorOpen;
      const contentMap = door.hasPrize ? textures.prize : textures.goat;

      door.closedMat.map = doorMap;
      door.closedMat.needsUpdate = true;
      door.openMat.map = openDoorMap;
      door.openMat.needsUpdate = true;

      door.contentMat.map = contentMap;
      door.contentMat.needsUpdate = true;

      // Gold image is wider than poop; keep both visually balanced in the doorway.
      if (door.hasPrize) {
        door.contentMesh.scale.set(1.08, 1.08, 1);
      } else {
        door.contentMesh.scale.set(0.98, 0.98, 1);
      }
    }
  }

  function resizeRenderer() {
    const rect = elements.sceneWrap.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function randomDoorIndex() {
    return Math.floor(Math.random() * 3);
  }

  function generateRound() {
    const prize = randomDoorIndex();
    const firstChoice = randomDoorIndex();
    const revealCandidates = [0, 1, 2].filter((index) => index !== prize && index !== firstChoice);
    const revealedDoor = revealCandidates[Math.floor(Math.random() * revealCandidates.length)];
    const switchedChoice = [0, 1, 2].find((index) => index !== firstChoice && index !== revealedDoor);

    return {
      prize,
      firstChoice,
      revealedDoor,
      switchedChoice,
      stayWin: firstChoice === prize,
      switchWin: switchedChoice === prize
    };
  }

  function applyRoundToScene(round) {
    for (const door of doors) {
      door.hasPrize = door.index === round.prize;
      door.isOpen = door.index === round.revealedDoor;
      door.targetOpen = door.isOpen ? 1 : 0;
    }
    refreshDoorTextures();

    const stayDoor = doors[round.firstChoice];
    const switchDoor = doors[round.switchedChoice];

    markers.stayMarker.visible = true;
    markers.switchMarker.visible = true;
    markers.hostMarker.visible = true;
    markers.stayMarker.position.set(stayDoor.root.position.x, 2.25, 0.24);
    markers.switchMarker.position.set(switchDoor.root.position.x, 2.55, 0.24);
    markers.hostMarker.position.set(doors[round.revealedDoor].root.position.x, 2.85, 0.24);
  }

  function updateRoundDetail(round) {
    function setOutcome(element, isWin) {
      if (!element) {
        return;
      }
      if (isWin === null) {
        element.textContent = "-";
        element.style.color = "";
        return;
      }
      element.textContent = isWin ? "WIN" : "LOSE";
      element.style.color = isWin ? "#7df0ab" : "#ff9b9b";
    }

    if (!round) {
      elements.roundDetail.textContent = "No trials run yet.";
      if (elements.traceFirst) {
        elements.traceFirst.textContent = "Door -";
      }
      if (elements.traceHost) {
        elements.traceHost.textContent = "Door -";
      }
      if (elements.traceSwitch) {
        elements.traceSwitch.textContent = "Door -";
      }
      setOutcome(elements.traceStayOutcome, null);
      setOutcome(elements.traceSwitchOutcome, null);
      if (elements.traceWhy) {
        elements.traceWhy.textContent =
          "Why switch: initial door is right only 1/3, so the other unopened door carries 2/3 after host reveals a goat.";
      }
      return;
    }

    const stayResult = round.stayWin ? "win" : "lose";
    const switchResult = round.switchWin ? "win" : "lose";
    elements.roundDetail.textContent =
      `Round ${appState.trialCount}: prize behind door ${round.prize + 1}; initial pick ${round.firstChoice + 1}; ` +
      `host opened ${round.revealedDoor + 1}; stay = ${stayResult}, switch = ${switchResult}.`;

    if (elements.traceFirst) {
      elements.traceFirst.textContent = `Door ${round.firstChoice + 1}`;
    }
    if (elements.traceHost) {
      elements.traceHost.textContent = `Door ${round.revealedDoor + 1} (goat)`;
    }
    if (elements.traceSwitch) {
      elements.traceSwitch.textContent = `Door ${round.switchedChoice + 1}`;
    }
    setOutcome(elements.traceStayOutcome, round.stayWin);
    setOutcome(elements.traceSwitchOutcome, round.switchWin);
    if (elements.traceWhy) {
      elements.traceWhy.textContent =
        "Stay keeps your original 1/3 chance. Switch takes the other unopened door, which carries the remaining 2/3 chance.";
    }
  }

  function runTrials(count) {
    const trialsToRun = Math.max(1, Number(count) || 1);
    if (trialsToRun <= 0) {
      return;
    }

    for (let i = 0; i < trialsToRun; i += 1) {
      const round = generateRound();
      appState.currentRound = round;
      appState.trialCount += 1;

      const isFinalIteration = i === trialsToRun - 1;
      tracker.recordRound(round, {
        deferChartUpdate: !isFinalIteration
      });

      if (isFinalIteration) {
        applyRoundToScene(round);
        updateRoundDetail(round);
      }
    }

    tracker.flushChart();
  }

  function resetApp() {
    stopAutoRun();
    appState.trialCount = 0;
    appState.currentRound = null;
    appState.autoAccumulator = 0;
    appState.autoLastTimestamp = 0;
    tracker.reset();

    for (const door of doors) {
      door.hasPrize = false;
      door.isOpen = false;
      door.openProgress = 0;
      door.targetOpen = 0;
      door.openMesh.position.x = 0;
      door.closedMat.opacity = 1;
      door.openMat.opacity = 0;
      door.contentMat.opacity = 0;
    }
    refreshDoorTextures();

    markers.stayMarker.visible = false;
    markers.switchMarker.visible = false;
    markers.hostMarker.visible = false;
    updateRoundDetail(null);
  }

  function getAutoSpeed() {
    return Math.max(1, Number(elements.autoSpeed.value) || 1);
  }

  function startAutoRun() {
    appState.autoRunning = true;
    appState.autoAccumulator = 0;
    appState.autoLastTimestamp = 0;
    elements.autoToggle.textContent = "Pause Auto";
    elements.autoToggle.classList.add("active");
    appState.autoFrameId = requestAnimationFrame(stepAutoRun);
  }

  function stopAutoRun() {
    appState.autoRunning = false;
    appState.autoAccumulator = 0;
    appState.autoLastTimestamp = 0;
    elements.autoToggle.textContent = "Start Auto";
    elements.autoToggle.classList.remove("active");
    if (appState.autoFrameId) {
      cancelAnimationFrame(appState.autoFrameId);
      appState.autoFrameId = null;
    }
  }

  function stepAutoRun(timestamp) {
    if (!appState.autoRunning) {
      return;
    }

    if (!appState.autoLastTimestamp) {
      appState.autoLastTimestamp = timestamp;
    }

    const elapsedSeconds = (timestamp - appState.autoLastTimestamp) / 1000;
    appState.autoLastTimestamp = timestamp;
    appState.autoAccumulator += elapsedSeconds * getAutoSpeed();
    const readyTrials = Math.floor(appState.autoAccumulator);

    if (readyTrials > 0) {
      appState.autoAccumulator -= readyTrials;
      runTrials(Math.min(readyTrials, 500));
    }

    appState.autoFrameId = requestAnimationFrame(stepAutoRun);
  }

  function animate(timestamp) {
    const time = timestamp || 0;
    camera.position.x = Math.sin(time * 0.0002) * 0.75;
    camera.lookAt(0, 0.5, 0);

    for (const door of doors) {
      door.openProgress += (door.targetOpen - door.openProgress) * 0.16;
      door.closedMat.opacity = 1 - door.openProgress;
      door.openMat.opacity = door.openProgress;
      door.openMesh.position.x = 0.12 * door.openProgress;

      // Keep content hidden while door is mostly closed to prevent any edge bleed.
      const reveal = Math.min(1, Math.max(0, (door.openProgress - 0.24) / 0.45));
      door.contentMat.opacity = reveal;
      door.contentMesh.visible = reveal > 0.001;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
})();
