// Main Three.js variables
let scene, camera, renderer;
let bowler, batsman, ball, stumps, bails;
let clock = new THREE.Clock();
let animationPlaying = false;

// Initialize the scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2980);

    // Create camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 20);
    camera.lookAt(0, 5, 0);

    // Create renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('container').appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Create cricket pitch and players
    createPitch();
    createBowler();
    createBatsman();
    createStumps();
    createBall();

    // Add event listeners
    window.addEventListener('resize', onWindowResize);
    document.getElementById('playBtn').addEventListener('click', playAnimation);
    document.getElementById('resetBtn').addEventListener('click', resetAnimation);

    // Start animation loop
    animate();
}

// Create cricket pitch
function createPitch() {
    const pitchGeometry = new THREE.BoxGeometry(30, 0.2, 10);
    const pitchMaterial = new THREE.MeshStandardMaterial({
        color: 0x228B22
    });
    const pitch = new THREE.Mesh(pitchGeometry, pitchMaterial);
    pitch.position.y = 0.1;
    pitch.receiveShadow = true;
    scene.add(pitch);

    // Add pitch markings
    const creaseGeometry = new THREE.BoxGeometry(1, 0.21, 4);
    const creaseMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff
    });
    const crease1 = new THREE.Mesh(creaseGeometry, creaseMaterial);
    crease1.position.set(-13, 0.11, 0);
    scene.add(crease1);

    const crease2 = new THREE.Mesh(creaseGeometry, creaseMaterial);
    crease2.position.set(13, 0.11, 0);
    scene.add(crease2);
}

// Create bowler model
function createBowler() {
    const group = new THREE.Group();

    // Body (using cylinder instead of capsule)
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x0000ff
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.5;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.4, 32, 32);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.8;
    head.castShadow = true;
    group.add(head);

    // Arms (using cylinders)
    const armGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1, 12);
    const armMaterial = new THREE.MeshStandardMaterial({
        color: 0x0000ff
    });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.6, 2, 0);
    leftArm.rotation.z = Math.PI / 3;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.6, 2, 0);
    rightArm.rotation.z = -Math.PI / 3;
    group.add(rightArm);

    // Legs (using cylinders)
    const legGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 12);
    const legMaterial = new THREE.MeshStandardMaterial({
        color: 0x0000ff
    });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.2, 0.7, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.2, 0.7, 0);
    group.add(rightLeg);

    group.position.set(-15, 0, 0);
    scene.add(group);

    bowler = group;
}

// Create batsman model
function createBatsman() {
    const group = new THREE.Group();

    // Body (using cylinder)
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.5;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.4, 32, 32);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.8;
    head.castShadow = true;
    group.add(head);

    // Arms (using cylinders)
    const armGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1, 12);
    const armMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000
    });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.6, 2, 0);
    leftArm.rotation.z = Math.PI / 3;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.6, 2, 0);
    rightArm.rotation.z = -Math.PI / 3;
    group.add(rightArm);

    // Legs (using cylinders)
    const legGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 12);
    const legMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000
    });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.2, 0.7, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.2, 0.7, 0);
    group.add(rightLeg);

    // Bat
    const batHandleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 16);
    const batBladeGeometry = new THREE.BoxGeometry(0.2, 1, 0.05);
    const batMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513
    });

    const batHandle = new THREE.Mesh(batHandleGeometry, batMaterial);
    batHandle.position.set(0.8, 1, 0);
    batHandle.rotation.z = -Math.PI / 4;

    const batBlade = new THREE.Mesh(batBladeGeometry, batMaterial);
    batBlade.position.set(0.8, 0.3, 0);
    batBlade.rotation.z = -Math.PI / 4;

    group.add(batHandle);
    group.add(batBlade);

    group.position.set(10, 0, 0);
    scene.add(group);

    batsman = group;
}

// Create stumps
function createStumps() {
    const group = new THREE.Group();

    // Stumps
    const stumpGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 16);
    const stumpMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513
    });

    for (let i = -0.3; i <= 0.3; i += 0.3) {
        const stump = new THREE.Mesh(stumpGeometry, stumpMaterial);
        stump.position.set(i, 1, 0);
        stump.castShadow = true;
        group.add(stump);
    }

    // Bails
    const bailGeometry = new THREE.BoxGeometry(0.6, 0.05, 0.05);
    const bailMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF
    });

    const bail1 = new THREE.Mesh(bailGeometry, bailMaterial);
    bail1.position.set(0, 2.05, 0);
    bail1.castShadow = true;
    group.add(bail1);

    const bail2 = new THREE.Mesh(bailGeometry, bailMaterial);
    bail2.position.set(0, 2.05, 0);
    bail2.castShadow = true;
    group.add(bail2);

    group.position.set(13, 0, 0);
    scene.add(group);

    stumps = group;
    bails = [bail1, bail2];
}

// Create cricket ball
function createBall() {
    const geometry = new THREE.SphereGeometry(0.15, 32, 32);
    const material = new THREE.MeshStandardMaterial({
        color: 0xDC143C,
        roughness: 0.7,
        metalness: 0.3
    });

    ball = new THREE.Mesh(geometry, material);
    ball.castShadow = true;
    ball.visible = false;
    scene.add(ball);
}

// Play the animation sequence
function playAnimation() {
    if (animationPlaying) return;

    animationPlaying = true;
    document.getElementById('playBtn').disabled = true;

    // Reset positions
    bowler.position.set(-15, 0, 0);
    batsman.position.set(10, 0, 0);
    stumps.position.set(13, 0, 0);

    // Reset bails
    bails[0].position.set(0, 2.05, 0);
    bails[1].position.set(0, 2.05, 0);
    bails[0].rotation.set(0, 0, 0);
    bails[1].rotation.set(0, 0, 0);

    // Hide wicket text
    document.getElementById('wicketText').style.opacity = 0;

    // Animation timeline
    const startTime = clock.getElapsedTime();

    // Function to update animation
    function updateAnimation() {
        if (!animationPlaying) return;

        const elapsed = clock.getElapsedTime() - startTime;

        // Phase 1: Bowler runs in (0-2 seconds)
        if (elapsed < 2) {
            const progress = elapsed / 2;
            bowler.position.x = -15 + 7 * progress;

            // Animate bowler's arms and legs
            bowler.children[2].rotation.z = Math.PI / 3 + Math.sin(progress * 10) * 0.3;
            bowler.children[3].rotation.z = -Math.PI / 3 + Math.sin(progress * 10) * 0.3;
        }
        // Phase 2: Bowler delivers ball (2-3 seconds)
        else if (elapsed < 3) {
            const progress = (elapsed - 2) / 1;

            // Bowling arm goes back
            bowler.children[3].rotation.z = -Math.PI / 1.5;

            // Show ball at release point
            if (elapsed > 2.5 && !ball.visible) {
                ball.visible = true;
                ball.position.set(-7, 2.5, 0);
            }
        }
        // Phase 3: Ball travels to batsman (3-4 seconds)
        else if (elapsed < 4) {
            const progress = (elapsed - 3) / 1;
            ball.position.x = -7 + 15 * progress;
            ball.position.y = 2.5 - 2 * progress;

            // Batsman attempts to play shot
            batsman.children[5].rotation.z = -Math.PI / 4 + Math.sin(progress * 5) * 0.2;
        }
        // Phase 4: Ball passes batsman and hits stumps (4-5 seconds)
        else if (elapsed < 5) {
            const progress = (elapsed - 4) / 1;
            ball.position.x = 8 + 5 * progress;
            ball.position.y = 0.5;

            // Bails fly off
            if (elapsed > 4.5) {
                bails[0].position.y = 2.05 + progress * 2;
                bails[0].rotation.z = progress * 2;
                bails[1].position.y = 2.05 + progress * 1.5;
                bails[1].rotation.z = -progress * 1.5;
            }
        }
        // Phase 5: Show wicket (5-7 seconds)
        else if (elapsed < 7) {
            if (elapsed < 5.5) {
                document.getElementById('wicketText').style.opacity = (elapsed - 5) / 0.5;
            }
        }
        // Phase 6: End animation
        else {
            animationPlaying = false;
            document.getElementById('playBtn').disabled = false;
            return;
        }

        requestAnimationFrame(updateAnimation);
    }

    updateAnimation();
}

// Reset the animation
function resetAnimation() {
    animationPlaying = false;
    document.getElementById('playBtn').disabled = false;

    bowler.position.set(-15, 0, 0);
    batsman.position.set(10, 0, 0);
    stumps.position.set(13, 0, 0);

    // Reset bails
    bails[0].position.set(0, 2.05, 0);
    bails[1].position.set(0, 2.05, 0);
    bails[0].rotation.set(0, 0, 0);
    bails[1].rotation.set(0, 0, 0);

    // Hide ball and wicket text
    ball.visible = false;
    document.getElementById('wicketText').style.opacity = 0;

    // Reset bowler's arms
    bowler.children[2].rotation.z = Math.PI / 3;
    bowler.children[3].rotation.z = -Math.PI / 3;

    // Reset batsman's bat
    batsman.children[5].rotation.z = -Math.PI / 4;
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Simple camera movement
    if (!animationPlaying) {
        const time = clock.getElapsedTime();
        camera.position.x = Math.sin(time * 0.2) * 5;
        camera.position.z = 20 + Math.cos(time * 0.2) * 2;
        camera.lookAt(0, 5, 0);
    }

    renderer.render(scene, camera);
}

// Initialize the application
init();
