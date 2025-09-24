// Game configuration
const gameConfig = {
    playerCount: 2,
    questionCount: 10,
    playerAnswers: [],
    playerColors: [0xffcc00, 0x00ccff, 0xff00cc, 0x00ff66],
    playerNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4']
};

// Three.js variables
let scene, camera, renderer, maze, pacMen = [];
let questionIndex = 0;
let gameStarted = false;
let animationId = null;
let clock = new THREE.Clock();

// Parse URL parameters
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const players = parseInt(params.get('players'));
    const questions = parseInt(params.get('questions'));

    if (!players || !questions || players < 1 || players > 4 || questions < 1 || questions > 20) {
        return null;
    }

    const config = {
        playerCount: players,
        questionCount: questions,
        playerAnswers: []
    };

    // Get answers for each player
    for (let i = 1; i <= players; i++) {
        const answers = params.get(`p${i}`);
        if (!answers) return null;

        // Convert C/W to Correct/Wrong
        const answerArray = answers.split(',').map(a =>
            a.trim().toUpperCase() === 'C' ? 'Correct' : 'Wrong'
        );

        if (answerArray.length !== questions) return null;

        config.playerAnswers.push(answerArray);
    }

    return config;
}

// Initialize the game
function init() {
    // Check for URL parameters
    const urlConfig = getUrlParams();

    if (urlConfig) {
        // Auto-start game with URL configuration
        gameConfig.playerCount = urlConfig.playerCount;
        gameConfig.questionCount = urlConfig.questionCount;
        gameConfig.playerAnswers = urlConfig.playerAnswers;

        // Hide config panel and URL info
        document.getElementById('configPanel').style.display = 'none';
        document.getElementById('urlInfo').style.display = 'none';

        // Start game directly
        startGameFromUrl();
    } else {
        // Show normal configuration UI
        document.getElementById('urlInfo').style.display = 'block';

        // Set up event listeners
        document.getElementById('playerCount').addEventListener('change', updatePlayerAnswersUI);
        document.getElementById('questionCount').addEventListener('change', updatePlayerAnswersUI);
        document.getElementById('startBtn').addEventListener('click', startGameFromUI);
        document.getElementById('restartBtn').addEventListener('click', restartGame);

        // Initialize player answers UI
        updatePlayerAnswersUI();
    }
}

// Update the player answers UI based on configuration
function updatePlayerAnswersUI() {
    const playerCount = parseInt(document.getElementById('playerCount').value);
    const questionCount = parseInt(document.getElementById('questionCount').value);
    const container = document.getElementById('playerAnswersContainer');

    container.innerHTML = '';

    for (let i = 0; i < playerCount; i++) {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-answer-set';
        playerDiv.innerHTML = `<h4>${gameConfig.playerNames[i]} Answers</h4>`;

        const answersDiv = document.createElement('div');
        answersDiv.className = 'player-answers';
        answersDiv.id = `playerAnswers${i}`;

        for (let j = 0; j < questionCount; j++) {
            const answerBtn = document.createElement('button');
            answerBtn.className = 'answer-btn';
            answerBtn.textContent = `Q${j + 1}`;
            answerBtn.dataset.player = i;
            answerBtn.dataset.question = j;
            answerBtn.addEventListener('click', toggleAnswer);

            // Set default answers (alternating correct/wrong)
            if (j % 2 === 0) {
                answerBtn.classList.add('selected', 'correct');
            } else {
                answerBtn.classList.add('selected', 'wrong');
            }

            answersDiv.appendChild(answerBtn);
        }

        playerDiv.appendChild(answersDiv);
        container.appendChild(playerDiv);
    }
}

// Toggle answer state (correct/wrong)
function toggleAnswer(e) {
    const btn = e.target;
    const player = parseInt(btn.dataset.player);
    const question = parseInt(btn.dataset.question);

    if (!btn.classList.contains('selected') || btn.classList.contains('wrong')) {
        btn.classList.remove('wrong');
        btn.classList.add('selected', 'correct');
    } else {
        btn.classList.remove('correct');
        btn.classList.add('wrong');
    }
}

// Set up Three.js scene
function setupThreeJSScene() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a14);

    // Create camera
    const canvas = document.getElementById('gameCanvas');
    camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(0, 15, 15);
    camera.lookAt(0, 0, 0);

    // Create renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    scene.add(directionalLight);

    // Add a point light for better visibility
    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

// Create the maze
function createMaze() {
    maze = new THREE.Group();

    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(40, 40);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a3e,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    maze.add(floor);

    // Create path markers
    const pathGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.5);
    const pathMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a5a });

    for (let i = 0; i < gameConfig.questionCount; i++) {
        const pathMarker = new THREE.Mesh(pathGeometry, pathMaterial);
        pathMarker.position.x = -15 + (i * 30 / (gameConfig.questionCount - 1));
        pathMarker.position.y = 0.05;
        pathMarker.receiveShadow = true;
        maze.add(pathMarker);
    }

    // Create walls
    const wallGeometry = new THREE.BoxGeometry(40, 2, 1);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a8a });

    const topWall = new THREE.Mesh(wallGeometry, wallMaterial);
    topWall.position.z = -20;
    topWall.position.y = 1;
    topWall.castShadow = true;
    maze.add(topWall);

    const bottomWall = new THREE.Mesh(wallGeometry, wallMaterial);
    bottomWall.position.z = 20;
    bottomWall.position.y = 1;
    bottomWall.castShadow = true;
    maze.add(bottomWall);

    scene.add(maze);
}

// Create Pac-Man characters
function createPacMen() {
    pacMen = [];

    for (let i = 0; i < gameConfig.playerCount; i++) {
        // Create Pac-Man body (sphere with a segment removed for the mouth)
        const pacManGeometry = new THREE.SphereGeometry(1, 32, 32, 0, Math.PI * 2, 0, Math.PI * 1.8);
        const pacManMaterial = new THREE.MeshStandardMaterial({
            color: gameConfig.playerColors[i],
            emissive: gameConfig.playerColors[i],
            emissiveIntensity: 0.2
        });

        const pacMan = new THREE.Mesh(pacManGeometry, pacManMaterial);
        pacMan.position.set(-15, 1, -10 + i * 6);
        pacMan.castShadow = true;

        // Add eye
        const eyeGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        eye.position.set(0.4, 0.5, 0.6);
        pacMan.add(eye);

        scene.add(pacMan);
        pacMen.push({
            mesh: pacMan,
            position: 0,
            mouthOpen: true,
            mouthDirection: 1,
            correctAnswers: 0,
            mouthAnimationTime: 0
        });

        // Create player progress UI
        const progressItem = document.createElement('div');
        progressItem.className = 'progress-item';
        progressItem.innerHTML = `
                    <div class="player-color" style="background-color: #${gameConfig.playerColors[i].toString(16).padStart(6, '0')}"></div>
                    <div>${gameConfig.playerNames[i]}</div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress${i}" style="width: 0%; background-color: #${gameConfig.playerColors[i].toString(16).padStart(6, '0')}"></div>
                    </div>
                `;
        document.getElementById('playerProgress').appendChild(progressItem);
    }
}

// Start the game from UI configuration
function startGameFromUI() {
    // Get configuration from UI
    gameConfig.playerCount = parseInt(document.getElementById('playerCount').value);
    gameConfig.questionCount = parseInt(document.getElementById('questionCount').value);

    // Get player answers from UI
    gameConfig.playerAnswers = [];
    for (let i = 0; i < gameConfig.playerCount; i++) {
        const playerAnswers = [];
        const answerButtons = document.querySelectorAll(`#playerAnswers${i} .answer-btn`);

        for (let j = 0; j < answerButtons.length; j++) {
            playerAnswers.push(answerButtons[j].classList.contains('correct') ? 'Correct' : 'Wrong');
        }

        gameConfig.playerAnswers.push(playerAnswers);
    }

    // Validate that all questions have answers
    for (let i = 0; i < gameConfig.playerCount; i++) {
        if (gameConfig.playerAnswers[i].length !== gameConfig.questionCount) {
            alert(`Please set answers for all questions for ${gameConfig.playerNames[i]}`);
            return;
        }
    }

    startGameCommon();
}

// Start the game from URL parameters
function startGameFromUrl() {
    // Configuration already set from URL parameters
    startGameCommon();
}

// Common game start logic
function startGameCommon() {
    // Switch to game view
    document.getElementById('configPanel').style.display = 'none';
    document.getElementById('gameView').style.display = 'block';
    document.getElementById('urlInfo').style.display = 'none';

    // Update UI
    document.getElementById('totalQuestions').textContent = gameConfig.questionCount;

    // Set up Three.js scene
    setupThreeJSScene();

    // Create maze and Pac-Man characters
    createMaze();
    createPacMen();

    // Start the game animation
    gameStarted = true;
    questionIndex = 0;
    clock.start();
    animate();
}

// Restart the game
function restartGame() {
    // Reset game state
    gameStarted = false;
    questionIndex = 0;

    // Hide winner celebration
    document.getElementById('winnerCelebration').style.display = 'none';

    // Clear scene
    if (scene) {
        while (scene.children.length > 0) {
            scene.remove(scene.children[0]);
        }
    }

    // Clear progress UI
    document.getElementById('playerProgress').innerHTML = '';

    // Check if we came from URL parameters or UI
    const urlConfig = getUrlParams();

    if (urlConfig) {
        // Restart with URL parameters
        gameConfig.playerCount = urlConfig.playerCount;
        gameConfig.questionCount = urlConfig.questionCount;
        gameConfig.playerAnswers = urlConfig.playerAnswers;

        // Start game directly
        startGameFromUrl();
    } else {
        // Show configuration panel
        document.getElementById('configPanel').style.display = 'block';
        document.getElementById('gameView').style.display = 'none';
        document.getElementById('urlInfo').style.display = 'block';

        // Cancel animation
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }
}

// Animate the game
function animate() {
    if (!gameStarted) return;

    animationId = requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Update Pac-Man animations
    pacMen.forEach((pacMan, index) => {
        // Animate mouth
        pacMan.mouthAnimationTime += delta;
        const mouthSpeed = 5; // Mouth animation speed

        if (pacMan.mouthAnimationTime > 1 / mouthSpeed) {
            pacMan.mouthOpen = !pacMan.mouthOpen;
            pacMan.mouthAnimationTime = 0;

            // Update geometry for mouth animation
            if (pacMan.mesh && pacMan.mesh.geometry) {
                pacMan.mesh.geometry.dispose();
                pacMan.mesh.geometry = new THREE.SphereGeometry(
                    1, 32, 32, 0, Math.PI * 2, 0,
                    pacMan.mouthOpen ? Math.PI * 1.6 : Math.PI * 1.9
                );
            }
        }

        // Move Pac-Man based on answers
        if (questionIndex < gameConfig.questionCount) {
            const answer = gameConfig.playerAnswers[index][questionIndex];

            if (answer === 'Correct') {
                // Move forward
                const targetX = -15 + (pacMan.correctAnswers * 30 / (gameConfig.questionCount - 1));
                pacMan.mesh.position.x += (targetX - pacMan.mesh.position.x) * 0.1;

                // Add green glow effect
                pacMan.mesh.material.emissive.setHex(0x00ff00);
                pacMan.mesh.material.emissiveIntensity = 0.5;
            } else {
                // Bounce effect for wrong answers
                pacMan.mesh.position.y = 1 + Math.sin(Date.now() * 0.01) * 0.3;

                // Add red flash effect
                pacMan.mesh.material.emissive.setHex(0xff0000);
                pacMan.mesh.material.emissiveIntensity = 0.5;
            }
        }

        // Gradually reduce emissive intensity
        pacMan.mesh.material.emissiveIntensity *= 0.95;
    });

    // Update camera to follow the Pac-Men
    if (pacMen.length > 0) {
        const averageX = pacMen.reduce((sum, pacMan) => sum + pacMan.mesh.position.x, 0) / pacMen.length;
        camera.position.x += (averageX - camera.position.x) * 0.05;
        camera.lookAt(averageX, 0, 0);
    }

    // Render the scene
    renderer.render(scene, camera);

    // Check if we should advance to the next question
    if (questionIndex < gameConfig.questionCount) {
        // Wait a bit before advancing to next question
        if (clock.getElapsedTime() > questionIndex * 3 + 1) {
            advanceQuestion();
        }
    } else if (questionIndex === gameConfig.questionCount) {
        // Game finished, determine winner
        determineWinner();
        questionIndex++; // Prevent multiple winner determinations
    }
}

// Advance to the next question
function advanceQuestion() {
    questionIndex++;
    document.getElementById('currentQuestion').textContent = questionIndex;

    // Update correct answers count and progress bars
    pacMen.forEach((pacMan, index) => {
        if (questionIndex > 0 && gameConfig.playerAnswers[index][questionIndex - 1] === 'Correct') {
            pacMan.correctAnswers++;
        }

        // Update progress bar
        const progressBar = document.getElementById(`progress${index}`);
        if (progressBar) {
            const progress = (pacMan.correctAnswers / gameConfig.questionCount) * 100;
            progressBar.style.width = `${progress}%`;
        }
    });
}

// Determine the winner and show celebration
function determineWinner() {
    // Find the player(s) with the most correct answers
    let maxCorrect = 0;
    let winners = [];

    pacMen.forEach((pacMan, index) => {
        if (pacMan.correctAnswers > maxCorrect) {
            maxCorrect = pacMan.correctAnswers;
            winners = [index];
        } else if (pacMan.correctAnswers === maxCorrect) {
            winners.push(index);
        }
    });

    // Show winner celebration
    const winnerText = document.getElementById('winnerText');
    if (winners.length === 1) {
        winnerText.textContent = `Winner: ${gameConfig.playerNames[winners[0]]}`;
    } else {
        winnerText.textContent = `Tie: ${winners.map(i => gameConfig.playerNames[i]).join(', ')}`;
    }

    document.getElementById('winnerCelebration').style.display = 'flex';

    // Animate winner Pac-Man(s)
    winners.forEach(winnerIndex => {
        const winnerPacMan = pacMen[winnerIndex];

        // Make winner larger
        winnerPacMan.mesh.scale.set(1.5, 1.5, 1.5);

        // Jump animation
        winnerPacMan.mesh.position.y = 1 + Math.sin(Date.now() * 0.01) * 0.5;

        // Golden glow
        winnerPacMan.mesh.material.emissive.setHex(0xffcc00);
        winnerPacMan.mesh.material.emissiveIntensity = 0.8;
    });

    // Create confetti effect
    createConfetti();
}

// Create confetti effect
function createConfetti() {
    const confettiCount = 200;
    const confettiGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);

    for (let i = 0; i < confettiCount; i++) {
        const confettiMaterial = new THREE.MeshStandardMaterial({
            color: Math.random() * 0xffffff
        });

        const confetti = new THREE.Mesh(confettiGeometry, confettiMaterial);
        confetti.position.set(
            Math.random() * 20 - 10,
            Math.random() * 10 + 5,
            Math.random() * 20 - 10
        );

        confetti.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        scene.add(confetti);

        // Animate confetti falling
        (function (confetti) {
            const speed = 0.02 + Math.random() * 0.03;
            const spinSpeed = 0.02 + Math.random() * 0.03;
            let falling = true;

            function fall() {
                if (!falling) return;

                confetti.position.y -= speed;
                confetti.rotation.x += spinSpeed;
                confetti.rotation.y += spinSpeed;

                if (confetti.position.y > -5) {
                    requestAnimationFrame(fall);
                } else {
                    falling = false;
                    if (scene) {
                        scene.remove(confetti);
                    }
                }
            }

            fall();
        })(confetti);
    }
}

// Handle window resize
function onWindowResize() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas || !camera || !renderer) return;

    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
}

// Initialize the game when the page loads
window.addEventListener('load', init);
