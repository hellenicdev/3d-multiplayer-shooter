// client/main.js (continued from previous)
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/controls/PointerLockControls.js';
import { AIPlayer } from './ai.js';

const socket = io();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0x404040));
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: 0x555555 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const player = new THREE.Mesh(
  new THREE.BoxGeometry(1, 2, 1),
  new THREE.MeshStandardMaterial({ color: 0x00ff00 })
);
player.position.y = 1;
scene.add(player);

const controls = new PointerLockControls(camera, renderer.domElement);
document.addEventListener('click', () => controls.lock(), false);
controls.getObject().position.copy(player.position);

// UI Elements for health, score, timer
const healthBar = document.createElement('div');
healthBar.style.cssText = 'position:fixed;top:10px;left:10px;width:200px;height:20px;background:red;';
document.body.appendChild(healthBar);

const scoreDisplay = document.createElement('div');
scoreDisplay.style.cssText = 'position:fixed;top:40px;left:10px;color:white;font:16px sans-serif;';
scoreDisplay.textContent = 'Score: 0';
document.body.appendChild(scoreDisplay);

const timerDisplay = document.createElement('div');
timerDisplay.style.cssText = 'position:fixed;top:70px;left:10px;color:white;font:16px sans-serif;';
timerDisplay.textContent = 'Time Left: 3:00';
document.body.appendChild(timerDisplay);

let playerHealth = 100;
let score = 0;
let remainingTime = 180; // 3 minutes
let gameOver = false;

// Player keys and mouse
const keys = {};
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

// AI setup
const aiEnemies = [new AIPlayer(scene), new AIPlayer(scene), new AIPlayer(scene)];

// Bullets and other players
const bullets = [];
const remoteBullets = [];
const otherPlayers = {};

// Add usernames above players
const usernames = {};
const usernameDivs = {};

socket.on('playerJoined', ({ id, state, username }) => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 2, 1),
    new THREE.MeshStandardMaterial({ color: 0x0000ff })
  );
  mesh.position.set(state.x, state.y, state.z);
  scene.add(mesh);
  otherPlayers[id] = mesh;

  // Display username above player
  const usernameDiv = document.createElement('div');
  usernameDiv.style.position = 'absolute';
  usernameDiv.style.color = 'white';
  usernameDiv.style.font = '14px sans-serif';
  usernameDiv.textContent = username;
  usernameDiv.style.top = `${state.y + 10}px`;
  usernameDiv.style.left = `${state.x + 10}px`;
  document.body.appendChild(usernameDiv);
  usernameDivs[id] = usernameDiv;
});

socket.on('playerUpdate', ({ id, state }) => {
  if (otherPlayers[id]) {
    otherPlayers[id].position.set(state.x, state.y, state.z);
    usernameDivs[id].style.top = `${state.y + 10}px`;
    usernameDivs[id].style.left = `${state.x + 10}px`;
  }
});

socket.on('playerLeft', id => {
  scene.remove(otherPlayers[id]);
  delete otherPlayers[id];
  document.body.removeChild(usernameDivs[id]);
  delete usernameDivs[id];
});

socket.on('bulletFired', ({ id, position, direction }) => {
  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.1),
    new THREE.MeshBasicMaterial({ color: 0xffff00 })
  );
  bullet.position.set(position.x, position.y, position.z);
  bullet.direction = new THREE.Vector3(direction.x, direction.y, direction.z);
  bullet.ownerId = id;
  remoteBullets.push(bullet);
  scene.add(bullet);
});

document.addEventListener('click', () => {
  if (!controls.isLocked || gameOver) return;

  // Bullet cooldown
  if (Date.now() - lastShotTime < 500) return;
  lastShotTime = Date.now();

  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.1),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  bullet.position.copy(player.position);
  bullet.direction = controls.getDirection(new THREE.Vector3()).clone();
  bullets.push(bullet);
  scene.add(bullet);

  socket.emit('shoot', {
    position: bullet.position,
    direction: bullet.direction
  });
});

// Handle Timer countdown
let lastTimerUpdate = Date.now();
function updateTimer() {
  const now = Date.now();
  if (now - lastTimerUpdate > 1000) {
    remainingTime--;
    timerDisplay.textContent = `Time Left: ${Math.floor(remainingTime / 60)}:${remainingTime % 60}`;
    lastTimerUpdate = now;

    if (remainingTime <= 0 && !gameOver) {
      gameOver = true;
      alert('Game Over! Time has run out.');
    }
  }
}

// Jumping and Gravity
let isJumping = false;
let velocity = new THREE.Vector3();
let gravity = -9.8;

function jump() {
  if (isJumping) return;
  velocity.y = 5;
  isJumping = true;
}

function applyGravity() {
  if (player.position.y > 1) {
    velocity.y += gravity * 0.1;
    player.position.y += velocity.y;
  } else {
    velocity.y = 0;
    isJumping = false;
    player.position.y = 1;
  }
}

// Hit Effects (Particle Explosion)
function createHitEffect(position) {
  const particle = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 })
  );
  particle.position.copy(position);
  scene.add(particle);

  // Animate particle effect
  setTimeout(() => scene.remove(particle), 200);
}

// Map Enhancements (Obstacles)
const obstacles = [
  new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), new THREE.MeshStandardMaterial({ color: 0x888888 })),
  new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), new THREE.MeshStandardMaterial({ color: 0x888888 }))
];
obstacles[0].position.set(10, 2.5, 0);
obstacles[1].position.set(-10, 2.5, 0);
scene.add(obstacles[0]);
scene.add(obstacles[1]);

// Character Customization (Color)
function changePlayerColor(color) {
  player.material.color.set(color);
}

// Sound Effects (Shooting, Jumping)
const shootSound = new Audio('shoot.wav');
const jumpSound = new Audio('jump.wav');

document.addEventListener('click', () => {
  shootSound.play();
});

function handleJump() {
  jumpSound.play();
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    handleJump();
    jump();
  }
});

function animate() {
  requestAnimationFrame(animate);

  if (controls.isLocked) {
    const dir = new THREE.Vector3();
    if (keys['KeyW']) dir.z -= 1;
    if (keys['KeyS']) dir.z += 1;
    if (keys['KeyA']) dir.x -= 1;
    if (keys['KeyD']) dir.x += 1;
    dir.normalize().applyEuler(controls.getObject().rotation);
    player.position.addScaledVector(dir, 0.1);
    controls.getObject().position.copy(player.position);
  }

  applyGravity();

  bullets.forEach((bullet, i) => {
    bullet.position.add(bullet.direction.clone().multiplyScalar(0.5));

    aiEnemies.forEach(ai => {
      if (ai.isAlive() && bullet.position.distanceTo(ai.mesh.position) < 1) {
        ai.takeDamage(25);
        if (!ai.isAlive()) {
          score++;
          scoreDisplay.textContent = `Score: ${score}`;
          setTimeout(() => ai.respawn(), 3000);
        }
        createHitEffect(bullet.position);
        scene.remove(bullet);
        bullets.splice(i, 1);
      }
    });
  });

  remoteBullets.forEach((bullet, i) => {
    bullet.position.add(bullet.direction.clone().multiplyScalar(0.5));
    if (bullet.position.distanceTo(player.position) < 1) {
      playerHealth -= 10;
      createHitEffect(bullet.position);
      scene.remove(bullet);
      remoteBullets.splice(i, 1);
      if (playerHealth <= 0) {
        playerHealth = 100;
        player.position.set(0, 1, 0);
      }
    }
  });

  aiEnemies.forEach(ai => ai.update({
    position: player.position,
    get health() { return playerHealth; },
    set health(val) { playerHealth = val; }
  }));

  healthBar.style.width = `${playerHealth * 2}px`;

  socket.emit('update', {
    x: player.position.x,
    y: player.position.y,
    z: player.position.z
  });

  updateTimer();

  renderer.render(scene, camera);
}

animate();
