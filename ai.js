// client/ai.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';

export class AIPlayer {
  constructor(scene) {
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 2, 1),
      new THREE.MeshStandardMaterial({ color: 0xff00ff })
    );
    this.mesh.position.set(Math.random() * 40 - 20, 1, Math.random() * 40 - 20);
    this.direction = new THREE.Vector3();
    this.health = 100;
    this.scene = scene;
    this.bullets = [];
    this.lastShotTime = 0;
    this.shootInterval = 1500 + Math.random() * 2000;

    this.changeDirection();
    scene.add(this.mesh);
  }

  changeDirection() {
    const angle = Math.random() * Math.PI * 2;
    this.direction.set(Math.cos(angle), 0, Math.sin(angle));
  }

  shoot() {
    const bullet = new THREE.Mesh(
      new THREE.SphereGeometry(0.1),
      new THREE.MeshBasicMaterial({ color: 0x00ffff })
    );
    bullet.position.copy(this.mesh.position);
    bullet.direction = this.direction.clone();
    this.bullets.push(bullet);
    this.scene.add(bullet);
  }

  update(player) {
    if (this.health <= 0) return;

    this.mesh.position.addScaledVector(this.direction, 0.05);
    if (Math.random() < 0.01) this.changeDirection();

    const bounds = 50;
    if (
      Math.abs(this.mesh.position.x) > bounds ||
      Math.abs(this.mesh.position.z) > bounds
    ) {
      this.mesh.position.clamp(
        new THREE.Vector3(-bounds, 1, -bounds),
        new THREE.Vector3(bounds, 1, bounds)
      );
      this.changeDirection();
    }

    const now = performance.now();
    if (now - this.lastShotTime > this.shootInterval) {
      this.shoot();
      this.lastShotTime = now;
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.position.add(b.direction.clone().multiplyScalar(0.4));
      if (b.position.distanceTo(player.position) < 1) {
        this.scene.remove(b);
        this.bullets.splice(i, 1);
        player.health -= 10;
        if (player.health <= 0) {
          player.health = 100;
          player.position.set(0, 1, 0);
        }
      }
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.scene.remove(this.mesh);
    }
  }

  isAlive() {
    return this.health > 0;
  }

  respawn() {
    this.mesh.position.set(Math.random() * 40 - 20, 1, Math.random() * 40 - 20);
    this.scene.add(this.mesh);
    this.health = 100;
  }
}
