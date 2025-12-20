// Game configuration
const gameConfig = {
    playerCount: 2,
    playerQuestions: [5, 5],
    playerAnswers: [[], []],
    playerColors: ['#FFCC00', '#00CCFF', '#FF00CC', '#00FF66'],
    playerNames: ['Team Yellow', 'Team Blue', 'Team Green', 'Team Red']
};

// Canvas and context
let canvas, ctx;
let gameStarted = false;
let gameFinished = false;
let currentRound = 0;
let animationId = null;
let startTime = 0;

// Game objects
let pacMen = [];
let ghosts = [];
let pellets = [];
let powerPellets = [];

// Parse URL parameters
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const players = parseInt(params.get('players'));

    if (!players || players < 1 || players > 4) {
        return null;
    }

    const config = {
        playerCount: players,
        playerQuestions: [],
        playerAnswers: []
    };

    for (let i = 1; i <= players; i++) {
        const questionCountParam = params.get(`p${i}`);
        if (!questionCountParam) return null;
        
        const questionCount = parseInt(questionCountParam);
        if (!questionCount || questionCount < 1 || questionCount > 20) return null;

        config.playerQuestions.push(questionCount);

        const allParams = window.location.search.substring(1).split('&');
        let answerString = null;
        
        for (let j = 0; j < allParams.length; j++) {
            if (allParams[j].startsWith(`p${i}=`)) {
                if (j + 1 < allParams.length) {
                    answerString = allParams[j + 1];
                    if (!answerString.includes('=')) {
                        break;
                    }
                }
            }
        }
        
        if (!answerString) return null;
        
        const answerArray = answerString.split(',').map(a =>
            a.trim().toUpperCase() === 'C' ? 'Correct' : 'Wrong'
        );

        if (answerArray.length !== questionCount) return null;
        config.playerAnswers.push(answerArray);
    }

    return config;
}

// Initialize the game
function init() {
    document.getElementById('restartBtn').addEventListener('click', restartGame);

    const urlConfig = getUrlParams();

    if (urlConfig) {
        gameConfig.playerCount = urlConfig.playerCount;
        gameConfig.playerQuestions = urlConfig.playerQuestions;
        gameConfig.playerAnswers = urlConfig.playerAnswers;

        document.getElementById('configPanel').style.display = 'none';
        document.getElementById('urlInfo').style.display = 'none';

        startGameFromUrl();
    } else {
        document.getElementById('urlInfo').style.display = 'block';
        document.getElementById('playerCount').addEventListener('change', updatePlayerQuestionsUI);
        document.getElementById('startBtn').addEventListener('click', startGameFromUI);
        updatePlayerQuestionsUI();
    }
}

// Update player questions UI
function updatePlayerQuestionsUI() {
    const playerCount = parseInt(document.getElementById('playerCount').value);
    const container = document.getElementById('playerQuestionsContainer');
    container.innerHTML = '';

    for (let i = 0; i < playerCount; i++) {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-question-set';
        playerDiv.innerHTML = `<h4>${gameConfig.playerNames[i]}</h4>`;

        const questionCountDiv = document.createElement('div');
        questionCountDiv.className = 'form-group';
        questionCountDiv.innerHTML = `
            <label for="questionCount${i}">Number of Questions (1-20)</label>
            <input type="number" id="questionCount${i}" min="1" max="20" value="5">
        `;
        playerDiv.appendChild(questionCountDiv);

        const answersDiv = document.createElement('div');
        answersDiv.className = 'player-answers';
        answersDiv.id = `playerAnswers${i}`;
        answersDiv.innerHTML = `<label>Answers:</label>`;
        playerDiv.appendChild(answersDiv);
        container.appendChild(playerDiv);

        document.getElementById(`questionCount${i}`).addEventListener('change', function () {
            updatePlayerAnswersUI(i);
        });

        updatePlayerAnswersUI(i);
    }
}

// Update answers UI for a specific player
function updatePlayerAnswersUI(playerIndex) {
    const questionCount = parseInt(document.getElementById(`questionCount${playerIndex}`).value);
    const answersDiv = document.getElementById(`playerAnswers${playerIndex}`);

    while (answersDiv.children.length > 1) {
        answersDiv.removeChild(answersDiv.lastChild);
    }

    for (let j = 0; j < questionCount; j++) {
        const answerBtn = document.createElement('button');
        answerBtn.className = 'answer-btn';
        answerBtn.textContent = `Q${j + 1}`;
        answerBtn.dataset.player = playerIndex;
        answerBtn.dataset.question = j;
        answerBtn.addEventListener('click', toggleAnswer);

        if (j % 2 === 0) {
            answerBtn.classList.add('selected', 'correct');
        } else {
            answerBtn.classList.add('selected', 'wrong');
        }

        answersDiv.appendChild(answerBtn);
    }
}

// Toggle answer state
function toggleAnswer(e) {
    const btn = e.target;
    if (!btn.classList.contains('selected') || btn.classList.contains('wrong')) {
        btn.classList.remove('wrong');
        btn.classList.add('selected', 'correct');
    } else {
        btn.classList.remove('correct');
        btn.classList.add('wrong');
    }
}

// Start game from UI
function startGameFromUI() {
    gameConfig.playerCount = parseInt(document.getElementById('playerCount').value);
    gameConfig.playerQuestions = [];
    gameConfig.playerAnswers = [];

    for (let i = 0; i < gameConfig.playerCount; i++) {
        const questionCount = parseInt(document.getElementById(`questionCount${i}`).value);
        gameConfig.playerQuestions.push(questionCount);

        const playerAnswers = [];
        const answerButtons = document.querySelectorAll(`#playerAnswers${i} .answer-btn`);

        for (let j = 0; j < answerButtons.length; j++) {
            playerAnswers.push(answerButtons[j].classList.contains('correct') ? 'Correct' : 'Wrong');
        }

        gameConfig.playerAnswers.push(playerAnswers);
    }

    startGameCommon();
}

// Start game from URL
function startGameFromUrl() {
    startGameCommon();
}

// Common game start logic
function startGameCommon() {
    document.getElementById('configPanel').style.display = 'none';
    document.getElementById('gameView').style.display = 'block';
    document.getElementById('urlInfo').style.display = 'none';

    setupCanvas();
    createGameObjects();

    gameStarted = true;
    gameFinished = false;
    currentRound = 0;
    startTime = Date.now();
    animate();
}

// Setup canvas
function setupCanvas() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    window.addEventListener('resize', () => {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    });
}

// Maze path definition - classic Pac-Man style corridors
const mazePath = [
    // Start position -> right -> up -> right -> down -> right -> exit
    { x: 150, y: 300, dir: 'right' },
    { x: 250, y: 300, dir: 'up' },
    { x: 250, y: 200, dir: 'right' },
    { x: 400, y: 200, dir: 'down' },
    { x: 400, y: 350, dir: 'right' },
    { x: 550, y: 350, dir: 'up' },
    { x: 550, y: 250, dir: 'right' },
    { x: 700, y: 250, dir: 'down' },
    { x: 700, y: 350, dir: 'right' },
    { x: 850, y: 350, dir: 'exit' } // Exit point
];

// Create game objects
function createGameObjects() {
    pacMen = [];
    ghosts = [];
    pellets = [];
    powerPellets = [];
    
    const maxQuestions = Math.max(...gameConfig.playerQuestions);
    
    // Create Pac-Men - all start at the beginning of the maze
    for (let i = 0; i < gameConfig.playerCount; i++) {
        const startOffset = i * 35; // Stagger start positions
        const verticalOffset = (i - (gameConfig.playerCount - 1) / 2) * 25; // Vertical spacing
        
        pacMen.push({
            x: mazePath[0].x - startOffset,
            y: mazePath[0].y + verticalOffset,
            size: 18,
            color: gameConfig.playerColors[i],
            mouthOpen: 0,
            direction: 0, // 0=right, 90=down, 180=left, 270=up
            currentQuestion: 0,
            totalQuestions: gameConfig.playerQuestions[i],
            correctAnswers: 0,
            pathIndex: 0,
            targetPathIndex: 0,
            finished: false,
            hitByGhost: false,
            hitTime: 0,
            speed: 2,
            verticalOffset: verticalOffset, // Store offset for path following
            lane: i // Lane identifier
        });
    }
    
    // Create pellets along the maze path
    for (let i = 0; i < mazePath.length - 1; i++) {
        const start = mazePath[i];
        const end = mazePath[i + 1];
        
        // Calculate number of pellets for this segment
        const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        const pelletCount = Math.floor(distance / 20);
        
        for (let j = 0; j < pelletCount; j++) {
            const t = j / pelletCount;
            pellets.push({
                x: start.x + (end.x - start.x) * t,
                y: start.y + (end.y - start.y) * t,
                size: 3,
                eaten: false
            });
        }
    }
    
    // Create power pellets at key points
    powerPellets.push({
        x: mazePath[0].x,
        y: mazePath[0].y,
        size: 10,
        pulse: 0
    });
    
    powerPellets.push({
        x: mazePath[Math.floor(mazePath.length / 2)].x,
        y: mazePath[Math.floor(mazePath.length / 2)].y,
        size: 10,
        pulse: 0
    });
    
    powerPellets.push({
        x: mazePath[mazePath.length - 2].x,
        y: mazePath[mazePath.length - 2].y,
        size: 10,
        pulse: 0
    });
    
    // Create ghosts - start in the ghost house (above and right of the path)
    const centerX = canvas.width / 2 + 150; // Match ghost house position
    const centerY = canvas.height / 2 - 120; // Match ghost house position
    
    for (let i = 0; i < gameConfig.playerCount; i++) {
        const angle = (i / gameConfig.playerCount) * Math.PI * 2;
        
        ghosts.push({
            x: centerX + Math.cos(angle) * 30,
            y: centerY + Math.sin(angle) * 30,
            size: 18,
            color: ['#FF0000', '#FFB8FF', '#00FFFF', '#FFB852'][i % 4],
            targetX: centerX,
            targetY: centerY,
            chasing: false,
            speed: 1.5,
            wanderAngle: angle,
            homeX: centerX, // Store home position
            homeY: centerY
        });
    }
    
    // Update progress UI
    const progressContainer = document.getElementById('playerProgress');
    progressContainer.innerHTML = '';
    
    for (let i = 0; i < gameConfig.playerCount; i++) {
        const progressItem = document.createElement('div');
        progressItem.className = 'progress-item';
        progressItem.innerHTML = `
            <div class="player-color" style="background-color: ${gameConfig.playerColors[i]}"></div>
            <div>${gameConfig.playerNames[i]}</div>
            <div class="progress-bar">
                <div class="progress-fill" id="progress${i}" style="width: 0%; background-color: ${gameConfig.playerColors[i]}"></div>
            </div>
            <div class="player-status" id="status${i}">0/${gameConfig.playerQuestions[i]}</div>
        `;
        progressContainer.appendChild(progressItem);
    }
}

// Draw Pac-Man
function drawPacMan(pacMan) {
    ctx.save();
    ctx.translate(pacMan.x, pacMan.y);
    ctx.rotate(pacMan.direction); // Rotate to face movement direction
    
    // Draw Pac-Man body
    ctx.fillStyle = pacMan.color;
    ctx.beginPath();
    
    const mouthAngle = 0.2 + Math.abs(Math.sin(pacMan.mouthOpen)) * 0.3;
    ctx.arc(0, 0, pacMan.size, mouthAngle * Math.PI, (2 - mouthAngle) * Math.PI);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    
    // Draw eye
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(6, -6, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// Draw Ghost
function drawGhost(ghost) {
    ctx.save();
    ctx.translate(ghost.x, ghost.y);
    
    // Ghost body
    ctx.fillStyle = ghost.color;
    ctx.beginPath();
    ctx.arc(0, -10, ghost.size * 0.8, Math.PI, 0, false);
    ctx.lineTo(ghost.size * 0.8, 10);
    
    // Wavy bottom
    for (let i = 0; i < 3; i++) {
        ctx.lineTo(ghost.size * 0.8 - (i + 0.5) * (ghost.size * 0.53), 10 + (i % 2 === 0 ? 5 : 0));
    }
    ctx.lineTo(-ghost.size * 0.8, 10);
    ctx.closePath();
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(-8, -8, 6, 0, Math.PI * 2);
    ctx.arc(8, -8, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupils
    ctx.fillStyle = '#00F';
    ctx.beginPath();
    ctx.arc(-8, -8, 3, 0, Math.PI * 2);
    ctx.arc(8, -8, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// Draw pellet
function drawPellet(pellet) {
    if (pellet.eaten) return;
    
    ctx.fillStyle = '#FFB8AE';
    ctx.beginPath();
    ctx.arc(pellet.x, pellet.y, pellet.size, 0, Math.PI * 2);
    ctx.fill();
}

// Draw power pellet
function drawPowerPellet(powerPellet) {
    const size = powerPellet.size + Math.sin(powerPellet.pulse) * 4;
    
    ctx.fillStyle = '#FFFF00';
    ctx.shadowColor = '#FFFF00';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(powerPellet.x, powerPellet.y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

// Draw maze with corridors
function drawMaze() {
    // Draw outer border
    ctx.strokeStyle = '#2121FF';
    ctx.lineWidth = 10;
    ctx.shadowColor = '#2121FF';
    ctx.shadowBlur = 15;
    ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);
    ctx.shadowBlur = 0;
    
    // Draw the path corridors (where Pac-Man can move)
    ctx.strokeStyle = '#1a1a3e';
    ctx.lineWidth = 50;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(mazePath[0].x, mazePath[0].y);
    for (let i = 1; i < mazePath.length; i++) {
        ctx.lineTo(mazePath[i].x, mazePath[i].y);
    }
    ctx.stroke();
    
    // Draw corridor borders (blue walls)
    ctx.strokeStyle = '#2121FF';
    ctx.lineWidth = 8;
    ctx.shadowColor = '#2121FF';
    ctx.shadowBlur = 10;
    
    ctx.beginPath();
    ctx.moveTo(mazePath[0].x, mazePath[0].y);
    for (let i = 1; i < mazePath.length; i++) {
        ctx.lineTo(mazePath[i].x, mazePath[i].y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Draw ghost house above and to the right of the main path
    const centerX = canvas.width / 2 + 150; // Move right by 150 pixels
    const centerY = canvas.height / 2 - 120; // Move up by 120 pixels
    const boxSize = 100;
    
    ctx.fillStyle = '#1a1a3e';
    ctx.fillRect(centerX - boxSize / 2, centerY - boxSize / 2, boxSize, boxSize);
    
    ctx.strokeStyle = '#FF69B4';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#FF69B4';
    ctx.shadowBlur = 10;
    ctx.strokeRect(centerX - boxSize / 2, centerY - boxSize / 2, boxSize, boxSize);
    ctx.shadowBlur = 0;
    
    // Ghost house label
    ctx.fillStyle = '#FF69B4';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GHOST', centerX, centerY - 10);
    ctx.fillText('HOUSE', centerX, centerY + 10);
    
    // Draw START marker
    ctx.fillStyle = '#00FF00';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('START', mazePath[0].x, mazePath[0].y - 40);
    
    // Draw arrow pointing to start
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(mazePath[0].x - 20, mazePath[0].y - 30);
    ctx.lineTo(mazePath[0].x, mazePath[0].y - 35);
    ctx.lineTo(mazePath[0].x + 20, mazePath[0].y - 30);
    ctx.stroke();
    
    // Draw EXIT marker
    const exitPoint = mazePath[mazePath.length - 1];
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('🏁 EXIT', exitPoint.x, exitPoint.y - 30);
    
    // Draw exit arrow
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(exitPoint.x - 10, exitPoint.y + 20);
    ctx.lineTo(exitPoint.x + 10, exitPoint.y + 20);
    ctx.lineTo(exitPoint.x, exitPoint.y + 35);
    ctx.closePath();
    ctx.fill();
}

// Main animation loop
function animate() {
    if (!gameStarted) return;
    
    animationId = requestAnimationFrame(animate);
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw maze
    drawMaze();
    
    let allFinished = true;
    
    // Draw all pellets first
    pellets.forEach(pellet => drawPellet(pellet));
    
    // Draw power pellets
    powerPellets.forEach(powerPellet => {
        powerPellet.pulse += 0.1;
        drawPowerPellet(powerPellet);
    });
    
    // Update and draw game objects
    pacMen.forEach((pacMan, index) => {
        if (!pacMan.finished) {
            allFinished = false;
            
            // Animate mouth
            pacMan.mouthOpen += 0.2;
            
            // Process current question
            if (pacMan.currentQuestion < pacMan.totalQuestions) {
                const answer = gameConfig.playerAnswers[index][pacMan.currentQuestion];
                
                if (answer === 'Correct') {
                    // Move along the maze path
                    if (pacMan.pathIndex < pacMan.targetPathIndex && pacMan.pathIndex < mazePath.length - 1) {
                        const target = mazePath[pacMan.pathIndex + 1];
                        const targetX = target.x;
                        const targetY = target.y + pacMan.verticalOffset; // Apply vertical offset
                        
                        const dx = targetX - pacMan.x;
                        const dy = targetY - pacMan.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance > 5) {
                            // Move towards next waypoint
                            pacMan.x += (dx / distance) * pacMan.speed;
                            pacMan.y += (dy / distance) * pacMan.speed;
                            
                            // Update direction for Pac-Man rotation
                            pacMan.direction = Math.atan2(dy, dx);
                        } else {
                            // Reached waypoint, move to next
                            pacMan.pathIndex++;
                            pacMan.x = targetX;
                            pacMan.y = targetY;
                        }
                    }
                    
                    // Eat pellets
                    pellets.forEach(pellet => {
                        if (!pellet.eaten && Math.abs(pacMan.x - pellet.x) < 20 && Math.abs(pacMan.y - pellet.y) < 20) {
                            pellet.eaten = true;
                            createPelletEffect(pellet.x, pellet.y);
                        }
                    });
                    
                    // Check if reached exit
                    if (pacMan.pathIndex >= mazePath.length - 1) {
                        pacMan.finished = true;
                    }
                } else {
                    // Hit by ghost - shake and pause
                    if (!pacMan.hitByGhost) {
                        pacMan.hitByGhost = true;
                        pacMan.hitTime = Date.now();
                        ghosts[index].chasing = true;
                        ghosts[index].targetX = pacMan.x;
                        ghosts[index].targetY = pacMan.y;
                    }
                    
                    const shakeTime = Date.now() - pacMan.hitTime;
                    if (shakeTime < 1500) {
                        // Shake effect - stay in place
                        const baseX = mazePath[pacMan.pathIndex].x;
                        const baseY = mazePath[pacMan.pathIndex].y + pacMan.verticalOffset;
                        pacMan.x = baseX + Math.sin(shakeTime * 0.1) * 5;
                        pacMan.y = baseY + Math.cos(shakeTime * 0.1) * 5;
                    } else {
                        // Return to path
                        pacMan.x = mazePath[pacMan.pathIndex].x;
                        pacMan.y = mazePath[pacMan.pathIndex].y + pacMan.verticalOffset;
                        pacMan.hitByGhost = false;
                    }
                }
            } else {
                pacMan.finished = true;
            }
        }
        
        // Draw Pac-Man
        drawPacMan(pacMan);
        
        // Update and draw ghost
        const ghost = ghosts[index];
        if (ghost.chasing) {
            // Chase the Pac-Man
            const dx = ghost.targetX - ghost.x;
            const dy = ghost.targetY - ghost.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) {
                ghost.x += (dx / distance) * ghost.speed;
                ghost.y += (dy / distance) * ghost.speed;
            } else {
                ghost.chasing = false;
                // Return to ghost house
                ghost.targetX = ghost.homeX;
                ghost.targetY = ghost.homeY;
            }
        } else {
            // Wander in ghost house
            ghost.wanderAngle += 0.05;
            ghost.targetX = ghost.homeX + Math.cos(ghost.wanderAngle) * 30;
            ghost.targetY = ghost.homeY + Math.sin(ghost.wanderAngle) * 30;
            
            ghost.x += (ghost.targetX - ghost.x) * 0.05;
            ghost.y += (ghost.targetY - ghost.y) * 0.05;
        }
        drawGhost(ghost);
    });
    
    // Advance rounds
    const elapsed = (Date.now() - startTime) / 1000;
    if (elapsed > (currentRound + 1) * 2 && currentRound < Math.max(...gameConfig.playerQuestions)) {
        advanceRound();
    }
    
    // Check if finished
    if (allFinished && !gameFinished) {
        gameFinished = true;
        determineWinner();
    }
}

// Create pellet eating effect
function createPelletEffect(x, y) {
    // Visual feedback - score popup
    const scoreText = {
        x: x,
        y: y,
        alpha: 1,
        text: '+10'
    };
    
    function animateScore() {
        if (scoreText.alpha > 0) {
            ctx.save();
            ctx.globalAlpha = scoreText.alpha;
            ctx.fillStyle = '#FFFF00';
            ctx.font = 'bold 16px Arial';
            ctx.fillText(scoreText.text, scoreText.x, scoreText.y);
            ctx.restore();
            
            scoreText.y -= 1;
            scoreText.alpha -= 0.02;
            requestAnimationFrame(animateScore);
        }
    }
    animateScore();
}

// Advance to next round
function advanceRound() {
    currentRound++;
    document.getElementById('currentRound').textContent = currentRound;
    
    const maxQuestions = Math.max(...gameConfig.playerQuestions);
    
    pacMen.forEach((pacMan, index) => {
        if (pacMan.currentQuestion < pacMan.totalQuestions) {
            const answer = gameConfig.playerAnswers[index][pacMan.currentQuestion];
            
            if (answer === 'Correct') {
                pacMan.correctAnswers++;
                // Advance Pac-Man along the path
                const pathProgress = pacMan.correctAnswers / maxQuestions;
                pacMan.targetPathIndex = Math.min(
                    Math.floor(pathProgress * (mazePath.length - 1)),
                    mazePath.length - 1
                );
            }
            
            pacMan.currentQuestion++;
            
            // Update progress
            const progress = (pacMan.currentQuestion / pacMan.totalQuestions) * 100;
            const progressBar = document.getElementById(`progress${index}`);
            const statusText = document.getElementById(`status${index}`);
            
            if (progressBar && statusText) {
                progressBar.style.width = `${progress}%`;
                statusText.textContent = 
                    pacMan.currentQuestion >= pacMan.totalQuestions ? 
                    '✓ Finished' : `${pacMan.currentQuestion}/${pacMan.totalQuestions}`;
                
                if (pacMan.currentQuestion >= pacMan.totalQuestions) {
                    statusText.style.color = '#4CAF50';
                }
            }
        }
    });
}

// Determine winner
function determineWinner() {
    let maxCorrect = 0;
    let winners = [];
    let loser = null;
    let minCorrect = Infinity;
    
    pacMen.forEach((pacMan, index) => {
        if (pacMan.correctAnswers > maxCorrect) {
            maxCorrect = pacMan.correctAnswers;
            winners = [index];
        } else if (pacMan.correctAnswers === maxCorrect) {
            winners.push(index);
        }
        
        if (pacMan.correctAnswers < minCorrect) {
            minCorrect = pacMan.correctAnswers;
            loser = index;
        }
    });
    
    const winnerText = document.getElementById('winnerText');
    if (winners.length === 1) {
        winnerText.textContent = `Winner: ${gameConfig.playerNames[winners[0]]} (${maxCorrect} correct) 🏆`;
    } else {
        winnerText.textContent = `Tie: ${winners.map(i => gameConfig.playerNames[i]).join(', ')} (${maxCorrect} correct each) 🏆`;
    }
    
    document.getElementById('winnerCelebration').style.display = 'flex';
    
    // Winner animation - eat through the maze to EXIT!
    winners.forEach(winnerIndex => {
        const pacMan = pacMen[winnerIndex];
        let growing = true;
        pacMan.speed = 3; // Speed up the winner
        
        function winnerAnimation() {
            if (gameFinished) {
                // Grow bigger
                if (growing && pacMan.size < 28) {
                    pacMan.size += 0.3;
                } else {
                    growing = false;
                }
                
                // Continue eating through the maze path
                if (pacMan.pathIndex < mazePath.length - 1) {
                    const target = mazePath[pacMan.pathIndex + 1];
                    const targetX = target.x;
                    const targetY = target.y + pacMan.verticalOffset;
                    
                    const dx = targetX - pacMan.x;
                    const dy = targetY - pacMan.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 5) {
                        // Move towards next waypoint
                        pacMan.x += (dx / distance) * pacMan.speed;
                        pacMan.y += (dy / distance) * pacMan.speed;
                        
                        // Update direction
                        pacMan.direction = Math.atan2(dy, dx);
                    } else {
                        // Reached waypoint, move to next
                        pacMan.pathIndex++;
                        if (pacMan.pathIndex < mazePath.length) {
                            pacMan.x = targetX;
                            pacMan.y = targetY;
                        }
                    }
                    
                    // Eat remaining pellets
                    pellets.forEach(pellet => {
                        if (!pellet.eaten && Math.abs(pacMan.x - pellet.x) < 25 && Math.abs(pacMan.y - pellet.y) < 25) {
                            pellet.eaten = true;
                            createPelletEffect(pellet.x, pellet.y);
                        }
                    });
                } else {
                    // Reached exit - continue moving out
                    pacMan.x += Math.cos(pacMan.direction) * pacMan.speed;
                    pacMan.y += Math.sin(pacMan.direction) * pacMan.speed;
                }
                
                // Animate mouth
                pacMan.mouthOpen += 0.4;
                
                // Rainbow color effect
                const hue = (Date.now() / 20) % 360;
                pacMan.color = `hsl(${hue}, 100%, 50%)`;
                
                // Continue animation until off screen
                if (pacMan.x < canvas.width + 50 && pacMan.y < canvas.height + 50) {
                    requestAnimationFrame(winnerAnimation);
                }
            }
        }
        winnerAnimation();
    });
    
    // Loser gets chased by ALL ghosts! 😄
    if (loser !== null && !winners.includes(loser)) {
        const loserPacMan = pacMen[loser];
        
        // All ghosts chase the loser
        ghosts.forEach((ghost, idx) => {
            ghost.chasing = true;
            ghost.speed = 3;
        });
        
        function chaseAnimation() {
            if (gameFinished) {
                // Loser runs away (backwards)
                loserPacMan.x -= 2;
                loserPacMan.y += Math.sin(Date.now() * 0.01) * 3; // Panic movement
                
                // All ghosts chase
                ghosts.forEach(ghost => {
                    ghost.targetX = loserPacMan.x - 40;
                    ghost.targetY = loserPacMan.y;
                    ghost.x += (ghost.targetX - ghost.x) * 0.15;
                    ghost.y += (ghost.targetY - ghost.y) * 0.15;
                });
                
                if (loserPacMan.x > 80) {
                    requestAnimationFrame(chaseAnimation);
                }
            }
        }
        chaseAnimation();
    }
}

// Restart game
function restartGame() {
    gameStarted = false;
    gameFinished = false;
    currentRound = 0;
    
    document.getElementById('winnerCelebration').style.display = 'none';
    
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    const urlConfig = getUrlParams();
    
    if (urlConfig) {
        gameConfig.playerCount = urlConfig.playerCount;
        gameConfig.playerQuestions = urlConfig.playerQuestions;
        gameConfig.playerAnswers = urlConfig.playerAnswers;
        startGameFromUrl();
    } else {
        document.getElementById('configPanel').style.display = 'block';
        document.getElementById('gameView').style.display = 'none';
        document.getElementById('urlInfo').style.display = 'block';
    }
}

// Initialize on load
window.addEventListener('load', init);
