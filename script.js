const container = document.getElementById('game-container');
const player = document.getElementById('player');
const scoreDisplay = document.getElementById('score');
const highscoreDisplay = document.getElementById('highscore');
const lifeDisplay = document.getElementById('life-hearts');
const overlay = document.getElementById('overlay');
const gameTitle = document.getElementById('game-title');
const gameMessage = document.getElementById('game-message');
const startBtn = document.getElementById('start-btn');

const howToBtn = document.getElementById('how-to-btn');
const howToModal = document.getElementById('how-to-modal');
const closeModalBtn = document.getElementById('close-modal-btn');

// ゲームの設定値
const GRAVITY = 0.4;       
const THRUST = -7;         
const CONTAINER_HEIGHT = 400;
const PLAYER_HEIGHT = 100; 

// ゲームの状態変数
let playerY = 150;
let velocity = 0;
let isThrusting = false;
let score = 0;
let highscore = 0;
let life = 3;             
let isInvincible = false; 
let obstacles = [];
let items = [];           
let gameActive = false;
let gameLoopId;
let spawnTimerId;
let backgroundX = 0;

if (localStorage.getItem('cleaner_highscore')) {
    highscore = parseInt(localStorage.getItem('cleaner_highscore'));
}
highscoreDisplay.textContent = highscore;

// 【初期設定】起動時は、プレイ用の町田さんオブジェクトを非表示にしておく
player.classList.add('hidden-player');

howToBtn.addEventListener('click', () => {
    howToModal.classList.remove('hidden');
});
closeModalBtn.addEventListener('click', () => {
    howToModal.classList.add('hidden');
});

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        isThrusting = true;
        e.preventDefault();
    }
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') isThrusting = false;
});
container.addEventListener('mousedown', () => isThrusting = true);
container.addEventListener('mouseup', () => isThrusting = false);
container.addEventListener('touchstart', () => isThrusting = true);
container.addEventListener('touchend', () => isThrusting = false);

startBtn.addEventListener('click', startGame);

function startGame() {
    playerY = 150;
    velocity = 0;
    score = 0;
    life = 3;
    backgroundX = 0;
    isThrusting = false;
    isInvincible = false;
    
    // 【変更箇所】ゲームスタート時に、本番用の町田さんを復活させる
    player.classList.remove('hidden-player');
    player.classList.remove('invincible');
    
    scoreDisplay.textContent = score;
    highscoreDisplay.textContent = highscore;
    updateLifeDisplay();

    document.querySelectorAll('.popup-text').forEach(el => el.remove());
    obstacles.forEach(obs => obs.element.remove());
    obstacles = [];
    items.forEach(item => item.element.remove());
    items = [];

    overlay.classList.remove('visible');
    gameActive = true;

    gameLoopId = requestAnimationFrame(updateGame);
    spawnObjects();
}

function updateLifeDisplay() {
    lifeDisplay.textContent = '❤️'.repeat(life);
}

function createPopupText(text, color) {
    const pRect = player.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    
    const textEl = document.createElement('div');
    textEl.classList.add('popup-text');
    textEl.textContent = text;
    textEl.style.color = color;
    
    textEl.style.left = (pRect.left - cRect.left + 15) + 'px';
    textEl.style.top = (pRect.top - cRect.top - 20) + 'px';
    
    container.appendChild(textEl);
    
    setTimeout(() => {
        textEl.remove();
    }, 800);
}

function updateGame() {
    if (!gameActive) return;

    if (isThrusting) {
        velocity += THRUST;
    }
    velocity += GRAVITY;
    velocity *= 0.95; 
    playerY += velocity;

    if (playerY < 0) {
        playerY = 0;
        velocity = 0;
    }
    if (playerY > CONTAINER_HEIGHT - PLAYER_HEIGHT) {
        playerY = CONTAINER_HEIGHT - PLAYER_HEIGHT;
        velocity = 0;
    }
    player.style.top = playerY + 'px';

    const currentSpeed = 5 + Math.floor(score / 50);
    backgroundX -= currentSpeed;
    container.style.backgroundPositionX = backgroundX + 'px';

    const pRect = player.getBoundingClientRect();
    const pPadW = pRect.width * 0.1;  
    const pPadH = pRect.height * 0.1; 
    const playerHitbox = {
        left: pRect.left + pPadW,
        right: pRect.right - pPadW,
        top: pRect.top + pPadH,
        bottom: pRect.bottom - pPadH
    };

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x -= obs.speed;
        obs.element.style.left = obs.x + 'px';

        const oRect = obs.element.getBoundingClientRect();
        
        const oPadW = oRect.width * 0.1;
        const oPadH = oRect.height * 0.1;
        const obsHitbox = {
            left: oRect.left + oPadW,
            right: oRect.right - oPadW,
            top: oRect.top + oPadH,
            bottom: oRect.bottom - oPadH
        };

        if (
            !isInvincible && 
            playerHitbox.left < obsHitbox.right &&
            playerHitbox.right > obsHitbox.left &&
            playerHitbox.top < obsHitbox.bottom &&
            playerHitbox.bottom > obsHitbox.top
        ) {
            takeDamage();
            if (!gameActive) return; 
        }

        if (obs.x < -120) {
            obs.element.remove();
            obstacles.splice(i, 1);
            score += 10;
            scoreDisplay.textContent = score;
        }
    }

    for (let i = items.length - 1; i >= 0; i--) {
        let item = items[i];
        item.x -= item.speed;
        item.element.style.left = item.x + 'px';

        const itemRect = item.element.getBoundingClientRect();
        if (
            pRect.left < itemRect.right &&
            pRect.right > itemRect.left &&
            pRect.top < itemRect.bottom &&
            pRect.bottom > itemRect.top
        ) {
            if (life < 3) {
                life++;
                updateLifeDisplay();
                createPopupText('回復！', '#2ecc71'); 
            } else {
                score += 10;
                scoreDisplay.textContent = score;
                createPopupText('SCORE +10', '#f1c40f'); 
            }
            
            item.element.remove();
            items.splice(i, 1);
            continue;
        }

        if (item.x < -100) {
            item.element.remove();
            items.splice(i, 1);
        }
    }

    gameLoopId = requestAnimationFrame(updateGame);
}

function spawnObjects() {
    if (!gameActive) return;

    const currentSpeed = 5 + Math.floor(score / 50);
    
    if (Math.random() < 0.25) {
        const itemElement = document.createElement('div');
        itemElement.classList.add('item', 'umaibo');
        
        const imgElement = document.createElement('img');
        const isCompo = Math.random() > 0.5;
        imgElement.src = isCompo ? 'umaibo1.png' : 'umaibo2.png';
        imgElement.classList.add('item-img');
        itemElement.appendChild(imgElement);
        
        const randPos = Math.random();
        if (randPos < 0.33) {
            itemElement.style.top = '110px'; 
        } else if (randPos < 0.66) {
            itemElement.style.top = '220px';
        } else {
            itemElement.style.bottom = '40px'; 
        }
        
        container.appendChild(itemElement);
        items.push({ element: itemElement, x: 800, speed: currentSpeed });
        
    } else {
        const obstacleElement = document.createElement('div');
        obstacleElement.classList.add('obstacle');
        
        const isTopObstacle = Math.random() > 0.5;
        const imgElement = document.createElement('img');
        imgElement.classList.add('obstacle-img');

        if (isTopObstacle) {
            obstacleElement.classList.add('type-top');
            imgElement.src = 'gomi.png';
        } else {
            obstacleElement.classList.add('type-bottom');
            imgElement.src = 'ue.png';
        }

        obstacleElement.appendChild(imgElement);
        container.appendChild(obstacleElement);
        obstacles.push({ element: obstacleElement, x: 800, speed: currentSpeed });
    }

    const nextSpawn = 1000 + Math.random() * 1000;
    spawnTimerId = setTimeout(spawnObjects, nextSpawn);
}

function takeDamage() {
    life--;
    updateLifeDisplay();

    if (life <= 0) {
        gameOver();
    } else {
        isInvincible = true;
        player.classList.add('invincible');
        
        setTimeout(() => {
            isInvincible = false;
            player.classList.remove('invincible');
        }, 1500);
    }
}

function gameOver() {
    gameActive = false;
    cancelAnimationFrame(gameLoopId);
    clearTimeout(spawnTimerId);

    if (score > highscore) {
        highscore = score;
        localStorage.setItem('cleaner_highscore', highscore);
    }

    // 【変更箇所】ゲームオーバー時、プレイ用の町田さんを一旦隠す（中央ディスプレイを映すため）
    player.classList.add('hidden-player');

    gameTitle.textContent = 'GAME OVER';
    gameMessage.innerHTML = `最終スコア: <span style="color:#e17846; font-weight:bold;">${score}</span><br><span style="font-size:16px; color:#aaa;">ハイスコア: ${highscore}</span>`;
    startBtn.textContent = 'RETRY';
    overlay.classList.add('visible');
}
