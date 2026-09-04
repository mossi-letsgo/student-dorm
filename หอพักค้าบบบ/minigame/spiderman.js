// ==========================================
// 1. SETUP CANVAS, THREE.JS & RENDERER
// ==========================================
const canvas = document.getElementById('gameCanvas');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x38bdf8);
scene.fog = new THREE.FogExp2(0x38bdf8, 0.0016);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

// Light Setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(200, 300, 150);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

// ==========================================
// 2. CITY BUILDINGS & ENVIRONMENT
// ==========================================
const buildings = [];
const buildingBoxes = [];

const floorGeo = new THREE.PlaneGeometry(3000, 3000);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

for (let i = 0; i < 220; i++) {
    const h = Math.random() * 120 + 40;
    const w = Math.random() * 26 + 18;
    const d = Math.random() * 26 + 18;
    
    const bGeo = new THREE.BoxGeometry(w, h, d);
    const bMat = new THREE.MeshStandardMaterial({ 
        color: Math.random() > 0.4 ? 0x0f172a : 0x334155,
        roughness: 0.3
    });
    const b = new THREE.Mesh(bGeo, bMat);
    
    b.position.x = (Math.random() - 0.5) * 1000;
    b.position.z = (Math.random() - 0.5) * 1000;
    b.position.y = h / 2;
    b.castShadow = true;
    b.receiveShadow = true;
    
    if (Math.abs(b.position.x) > 30 || Math.abs(b.position.z) > 30) {
        scene.add(b);
        buildings.push(b);
        
        const box = new THREE.Box3().setFromObject(b);
        buildingBoxes.push({ mesh: b, box: box, height: h });
    }
}

// Target Ring (เป้าโหนใย)
const ringGeo = new THREE.RingGeometry(0.2, 0.35, 32);
const ringMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, depthTest: false, transparent: true, opacity: 0.9 });
const targetRing = new THREE.Mesh(ringGeo, ringMat);
targetRing.renderOrder = 999;
targetRing.visible = false;
scene.add(targetRing);

// ==========================================
// 3. SPIDER-MAN MODEL CREATION
// ==========================================
const playerGroup = new THREE.Group();
const bodyContainer = new THREE.Group();
playerGroup.add(bodyContainer);

const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.2 });
const blueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.2 });
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), redMat);
torso.position.y = 1.3;
torso.castShadow = true;
bodyContainer.add(torso);

const hips = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.4, 0.48), blueMat);
hips.position.y = 0.65;
bodyContainer.add(hips);

const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), redMat);
head.position.y = 2.1;
head.castShadow = true;
bodyContainer.add(head);

const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.05), eyeMat);
leftEye.position.set(-0.12, 2.12, 0.33);
leftEye.rotation.y = 0.2;
const rightEye = leftEye.clone();
rightEye.position.x = 0.12;
rightEye.rotation.y = -0.2;
bodyContainer.add(leftEye);
bodyContainer.add(rightEye);

// Arms & Legs Pivots
const leftArmPivot = new THREE.Group();
leftArmPivot.position.set(-0.55, 1.6, 0);
bodyContainer.add(leftArmPivot);

const rightArmPivot = new THREE.Group();
rightArmPivot.position.set(0.55, 1.6, 0);
bodyContainer.add(rightArmPivot);

const armGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.8);
armGeo.translate(0, -0.4, 0);
const leftArm = new THREE.Mesh(armGeo, redMat);
leftArmPivot.add(leftArm);
const rightArm = new THREE.Mesh(armGeo, redMat);
rightArmPivot.add(rightArm);

const leftLegPivot = new THREE.Group();
leftLegPivot.position.set(-0.25, 0.5, 0);
bodyContainer.add(leftLegPivot);

const rightLegPivot = new THREE.Group();
rightLegPivot.position.set(0.25, 0.5, 0);
bodyContainer.add(rightLegPivot);

const legGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.9);
legGeo.translate(0, -0.45, 0);
const leftLeg = new THREE.Mesh(legGeo, blueMat);
leftLegPivot.add(leftLeg);
const rightLeg = new THREE.Mesh(legGeo, blueMat);
rightLegPivot.add(rightLeg);

playerGroup.position.set(0, 25, 0);
scene.add(playerGroup);

// Web Lines Visualization
const webMat = new THREE.LineBasicMaterial({ color: 0xf8fafc, linewidth: 3 });
const webGeo = new THREE.BufferGeometry();
const webLine = new THREE.Line(webGeo, webMat);
webLine.visible = false;
scene.add(webLine);

// Attack Web Lines Visualization
const attackWebGeo = new THREE.BufferGeometry();
const attackWebMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 4 });
const attackWebLine = new THREE.Line(attackWebGeo, attackWebMat);
attackWebLine.visible = false;
scene.add(attackWebLine);

// ==========================================
// 4. ENEMIES & COMBAT SYSTEM
// ==========================================
const enemies = [];
const enemyMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.4 });
const webbedMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 });

function createEnemy(x, y, z) {
    const eGroup = new THREE.Group();
    
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.8, 0.7), enemyMat);
    body.position.y = 0.9;
    body.castShadow = true;
    eGroup.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), enemyMat);
    head.position.y = 2.1;
    eGroup.add(head);

    eGroup.position.set(x, y, z);
    scene.add(eGroup);

    enemies.push({
        mesh: eGroup,
        hp: 100,
        maxHp: 100,
        isWebbed: false,
        webTimer: 0,
        velocity: new THREE.Vector3(),
        isAlive: true
    });
}

// สุ่มสร้างศัตรูบนพื้น
for (let i = 0; i < 15; i++) {
    const x = (Math.random() - 0.5) * 400;
    const z = (Math.random() - 0.5) * 400;
    createEnemy(x, 1, z);
}

let comboCount = 0;
let comboTimer = null;

function addCombo() {
    comboCount++;
    const comboEl = document.getElementById('combo-counter');
    if (comboEl) {
        comboEl.innerText = `${comboCount} HIT!`;
        comboEl.classList.add('show');
    }

    clearTimeout(comboTimer);
    comboTimer = setTimeout(() => {
        comboCount = 0;
        if (comboEl) comboEl.classList.remove('show');
    }, 2500);
}

// Particle Hit Visual Effects
const particles = [];
function createHitParticles(pos) {
    for (let i = 0; i < 12; i++) {
        const pGeo = new THREE.SphereGeometry(0.12, 6, 6);
        const pMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
        const p = new THREE.Mesh(pGeo, pMat);
        p.position.copy(pos);
        
        const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 12,
            Math.random() * 10 + 2,
            (Math.random() - 0.5) * 12
        );
        scene.add(p);
        particles.push({ mesh: p, vel: vel, life: 0.3 });
    }
}

// ==========================================
// 5. PLAYER STATE & CONTROLS
// ==========================================
let velocity = new THREE.Vector3();
let playerHp = 100;
let webFluid = 100;
let isGrounded = false;
let isWebSwinging = false;
let isWallRunning = false;
let isAttacking = false;
let currentWallNormal = new THREE.Vector3();

let swingHand = 'right';
let webPoint = new THREE.Vector3();
let webLength = 0;
let currentTargetPoint = null;

let cameraYaw = 0;
let cameraPitch = 0.1;
let targetYaw = 0;
let targetPitch = 0.1;

const keys = {};
let isLocked = false;

document.addEventListener('click', () => {
    if (!isLocked) canvas.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === canvas;
});

document.addEventListener('mousemove', (e) => {
    if (!isLocked) return;
    targetYaw -= e.movementX * 0.0022;
    targetPitch += e.movementY * 0.0022;
    targetPitch = Math.max(-0.6, Math.min(1.2, targetPitch));
});

document.addEventListener('mousedown', (e) => {
    if (!isLocked) return;
    if (e.button === 0) startSwing(); // คลิกซ้าย: โหนใย
    if (e.button === 2) shootWebAtEnemy(); // คลิกขวา: ยิงใยใส่ศัตรู
});

document.addEventListener('mouseup', (e) => {
    if (e.button === 0 && isWebSwinging) stopSwing(true);
});

document.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    if (e.code === 'KeyF') attackPunch(); // F: ต่อย
    if (e.code === 'KeyE') webStrike();   // E: ยิงใยพุ่งใส่ศัตรู
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') webZip();
    if (e.code === 'Space') {
        if (isWallRunning) {
            isWallRunning = false;
            velocity.copy(currentWallNormal).multiplyScalar(24);
            velocity.y = 22;
        } else if (isWebSwinging) {
            stopSwing(true);
        } else if (isGrounded) {
            velocity.y = 18;
        }
    }
});
window.addEventListener('keyup', (e) => keys[e.code] = false);

// ==========================================
// 6. SWINGING & COMBAT ACTIONS
// ==========================================
const raycaster = new THREE.Raycaster();

function updateTargeting() {
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);

    raycaster.set(camera.position, camDir);
    const intersects = raycaster.intersectObjects(buildings);

    const crosshair = document.getElementById('crosshair');

    if (intersects.length > 0 && intersects[0].distance < 280) {
        if (intersects[0].distance < 3) {
            targetRing.visible = false;
            return;
        }

        currentTargetPoint = intersects[0].point.clone();
        
        const building = intersects[0].object;
        const topY = building.position.y + (building.geometry.parameters.height / 2) - 1;
        if (currentTargetPoint.y < topY) {
            currentTargetPoint.y = Math.min(topY, currentTargetPoint.y + 15);
        }

        targetRing.position.copy(currentTargetPoint);
        if (intersects[0].face) {
            targetRing.lookAt(currentTargetPoint.clone().add(intersects[0].face.normal));
        }
        
        const scale = Math.max(0.5, intersects[0].distance * 0.035);
        targetRing.scale.set(scale, scale, scale);

        targetRing.visible = true;
        if (crosshair) crosshair.classList.add('active');
    } else {
        currentTargetPoint = null;
        targetRing.visible = false;
        if (crosshair) crosshair.classList.remove('active');
    }
}

// 🕸️ ระบบโหนใย: จำกัดความยาวให้ตึงแน่น ไม่ยืดหยุ่นเกินไป
function startSwing() {
    if (!currentTargetPoint) return;
    if (isWallRunning) isWallRunning = false;

    webPoint.copy(currentTargetPoint);

    // ✂️ ปรับระยะใยให้สั้น กระชับขึ้น (กระชับความยาวเหลือ 70% และไม่เกิน 48 หน่วย)
    const distToPoint = playerGroup.position.distanceTo(webPoint);
    webLength = Math.min(distToPoint * 0.7, 48);

    isWebSwinging = true;
    webLine.visible = true;

    swingHand = (swingHand === 'right') ? 'left' : 'right';

    const pullDir = new THREE.Vector3().subVectors(webPoint, playerGroup.position).normalize();

    if (isGrounded) {
        playerGroup.position.y += 0.5;
        isGrounded = false;
        velocity.y = 24; 
        velocity.x += pullDir.x * 24;
        velocity.z += pullDir.z * 24;
    } else {
        const forward = new THREE.Vector3(-Math.sin(targetYaw), -0.1, -Math.cos(targetYaw)).normalize();
        velocity.add(forward.multiplyScalar(22));
    }
}

function stopSwing(boost = false) {
    if (!isWebSwinging) return;
    isWebSwinging = false;
    webLine.visible = false;

    if (boost) {
        const forward = new THREE.Vector3(-Math.sin(targetYaw), 0.4, -Math.cos(targetYaw)).normalize();
        velocity.add(forward.multiplyScalar(30));
        velocity.y = Math.max(velocity.y + 14, 22);
    }
}

function webZip() {
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = Math.max(0.12, camDir.y + 0.15);

    if (isWebSwinging) stopSwing(false);
    if (isWallRunning) isWallRunning = false;

    velocity.copy(camDir.multiplyScalar(45));
}

// 🥊 ATTACK: ต่อยคอมโบ
function attackPunch() {
    if (isAttacking) return;
    isAttacking = true;

    rightArmPivot.rotation.x = Math.PI / 2;
    rightArmPivot.rotation.y = -0.5;

    enemies.forEach(e => {
        if (!e.isAlive) return;
        const dist = playerGroup.position.distanceTo(e.mesh.position);
        if (dist < 3.5) {
            e.hp -= 35;
            createHitParticles(e.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
            addCombo();

            const knockback = new THREE.Vector3().subVectors(e.mesh.position, playerGroup.position).normalize();
            e.velocity.add(knockback.multiplyScalar(15));

            if (e.hp <= 0) {
                e.isAlive = false;
                scene.remove(e.mesh);
            }
        }
    });

    setTimeout(() => { isAttacking = false; }, 250);
}

// 🕸️ WEB SHOOTER: ยิงใยตรึงศัตรู
function shootWebAtEnemy() {
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);

    raycaster.set(camera.position, camDir);
    const enemyMeshes = enemies.filter(e => e.isAlive).map(e => e.mesh);
    const intersects = raycaster.intersectObjects(enemyMeshes, true);

    if (intersects.length > 0) {
        let hitEnemy = enemies.find(e => e.mesh === intersects[0].object || e.mesh === intersects[0].object.parent);
        if (hitEnemy) {
            hitEnemy.isWebbed = true;
            hitEnemy.webTimer = 4.0;
            hitEnemy.mesh.children.forEach(child => child.material = webbedMat);

            const handPos = new THREE.Vector3();
            rightArmPivot.getWorldPosition(handPos);
            attackWebGeo.setFromPoints([handPos, intersects[0].point]);
            attackWebLine.visible = true;
            setTimeout(() => { attackWebLine.visible = false; }, 150);

            addCombo();
        }
    }
}

// 🚀 WEB STRIKE: ยิงใยดึงตัวพุ่งไปต่อยศัตรู
function webStrike() {
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);

    raycaster.set(camera.position, camDir);
    const enemyMeshes = enemies.filter(e => e.isAlive).map(e => e.mesh);
    const intersects = raycaster.intersectObjects(enemyMeshes, true);

    if (intersects.length > 0) {
        const targetPos = intersects[0].point;
        const dir = new THREE.Vector3().subVectors(targetPos, playerGroup.position).normalize();
        
        velocity.copy(dir.multiplyScalar(50));
        velocity.y = Math.max(velocity.y, 8);

        const handPos = new THREE.Vector3();
        leftArmPivot.getWorldPosition(handPos);
        attackWebGeo.setFromPoints([handPos, targetPos]);
        attackWebLine.visible = true;
        setTimeout(() => { attackWebLine.visible = false; }, 200);

        addCombo();
    }
}

// ==========================================
// 7. COLLISION & WALL RUNNING
// ==========================================
function handleBuildingCollisions() {
    const radius = 0.85;
    const playerPos = playerGroup.position;
    
    let hitWall = false;

    for (let b of buildingBoxes) {
        const expandedBox = b.box.clone().expandByScalar(radius);

        if (expandedBox.containsPoint(playerPos)) {
            const closestPoint = new THREE.Vector3();
            b.box.clampPoint(playerPos, closestPoint);
            
            const pushDir = new THREE.Vector3().subVectors(playerPos, closestPoint);
            pushDir.y = 0;
            
            if (pushDir.lengthSq() > 0.0001) {
                pushDir.normalize();
                
                playerGroup.position.x = closestPoint.x + pushDir.x * (radius + 0.05);
                playerGroup.position.z = closestPoint.z + pushDir.z * (radius + 0.05);

                if (!isGrounded && playerPos.y < b.height) {
                    hitWall = true;
                    currentWallNormal.copy(pushDir);
                    
                    if (!isWallRunning) {
                        isWallRunning = true;
                        if (isWebSwinging) stopSwing(false);
                    }
                }
            }
        }
    }

    if (!hitWall && isWallRunning) {
        isWallRunning = false;
        velocity.y = 22;
        const forward = new THREE.Vector3(-Math.sin(targetYaw), 0.2, -Math.cos(targetYaw));
        velocity.add(forward.multiplyScalar(16));
    }
}

// ==========================================
// 8. ANIMATIONS & TURNING
// ==========================================
let animTimer = 0;

function updateAnimations(delta) {
    animTimer += delta * 15;

    if (isAttacking) return;

    if (isWallRunning) {
        bodyContainer.rotation.x = Math.PI / 2.5;
        bodyContainer.rotation.z = 0;
        
        const targetAngle = Math.atan2(-currentWallNormal.x, -currentWallNormal.z);
        playerGroup.rotation.y = THREE.MathUtils.lerp(playerGroup.rotation.y, targetAngle, 0.2);

        const runCycle = Math.sin(animTimer);
        leftArmPivot.rotation.x = runCycle * 1.2;
        rightArmPivot.rotation.x = -runCycle * 1.2;
        leftLegPivot.rotation.x = -runCycle * 1.4;
        rightLegPivot.rotation.x = runCycle * 1.4;

    } else if (isWebSwinging) {
        const toWeb = new THREE.Vector3().subVectors(webPoint, playerGroup.position).normalize();

        bodyContainer.rotation.x = THREE.MathUtils.lerp(bodyContainer.rotation.x, Math.sign(velocity.y) * 0.5 + 0.2, 0.15);
        bodyContainer.rotation.z = THREE.MathUtils.lerp(bodyContainer.rotation.z, -toWeb.x * 0.6, 0.15);

        if (swingHand === 'right') {
            rightArmPivot.rotation.x = THREE.MathUtils.lerp(rightArmPivot.rotation.x, Math.PI - 0.2, 0.2);
            rightArmPivot.rotation.z = THREE.MathUtils.lerp(rightArmPivot.rotation.z, -0.3, 0.2);
            leftArmPivot.rotation.x = THREE.MathUtils.lerp(leftArmPivot.rotation.x, -0.6, 0.2);
        } else {
            leftArmPivot.rotation.x = THREE.MathUtils.lerp(leftArmPivot.rotation.x, Math.PI - 0.2, 0.2);
            leftArmPivot.rotation.z = THREE.MathUtils.lerp(leftArmPivot.rotation.z, 0.3, 0.2);
            rightArmPivot.rotation.x = THREE.MathUtils.lerp(rightArmPivot.rotation.x, -0.6, 0.2);
        }

        leftLegPivot.rotation.x = THREE.MathUtils.lerp(leftLegPivot.rotation.x, 1.2, 0.15);
        rightLegPivot.rotation.x = THREE.MathUtils.lerp(rightLegPivot.rotation.x, 0.4, 0.15);

    } else if (!isGrounded) {
        bodyContainer.rotation.z = THREE.MathUtils.lerp(bodyContainer.rotation.z, 0, 0.15);
        bodyContainer.rotation.x = THREE.MathUtils.lerp(bodyContainer.rotation.x, 0.2, 0.15);

        leftArmPivot.rotation.x = THREE.MathUtils.lerp(leftArmPivot.rotation.x, -1.2, 0.2);
        rightArmPivot.rotation.x = THREE.MathUtils.lerp(rightArmPivot.rotation.x, -1.2, 0.2);
        leftArmPivot.rotation.z = THREE.MathUtils.lerp(leftArmPivot.rotation.z, -0.5, 0.2);
        rightArmPivot.rotation.z = THREE.MathUtils.lerp(rightArmPivot.rotation.z, 0.5, 0.2);

        leftLegPivot.rotation.x = THREE.MathUtils.lerp(leftLegPivot.rotation.x, 0.3, 0.2);
        rightLegPivot.rotation.x = THREE.MathUtils.lerp(rightLegPivot.rotation.x, 0.7, 0.2);

    } else if (velocity.lengthSq() > 2) {
        bodyContainer.rotation.set(0, 0, 0);
        leftArmPivot.rotation.z = 0;
        rightArmPivot.rotation.z = 0;

        const runCycle = Math.sin(animTimer);
        leftArmPivot.rotation.x = runCycle * 1.0;
        rightArmPivot.rotation.x = -runCycle * 1.0;

        leftLegPivot.rotation.x = -runCycle * 1.2;
        rightLegPivot.rotation.x = runCycle * 1.2;

    } else {
        bodyContainer.rotation.set(0, 0, 0);
        leftArmPivot.rotation.set(0, 0, 0);
        rightArmPivot.rotation.set(0, 0, 0);
        leftLegPivot.rotation.set(0, 0, 0);
        rightLegPivot.rotation.set(0, 0, 0);
    }
}

// ==========================================
// 9. GAME MAIN LOOP
// ==========================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    cameraYaw += (targetYaw - cameraYaw) * 0.25;
    cameraPitch += (targetPitch - cameraPitch) * 0.25;

    // Dynamic FOV
    const speed = velocity.length();
    const targetFOV = Math.min(95, 75 + speed * 0.35);
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.1);
    camera.updateProjectionMatrix();

    // Camera Positioning
    const camDist = 9.5;
    camera.position.x = playerGroup.position.x + Math.sin(cameraYaw) * camDist * Math.cos(cameraPitch);
    camera.position.y = playerGroup.position.y + Math.sin(cameraPitch) * camDist + 2.2;
    camera.position.z = playerGroup.position.z + Math.cos(cameraYaw) * camDist * Math.cos(cameraPitch);
    camera.lookAt(playerGroup.position.clone().add(new THREE.Vector3(0, 1.4, 0)));

    updateTargeting();

    const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));

    // 🕸️ SWING PHYSICS & MOVEMENT
    if (isWallRunning) {
        velocity.x *= 0.8;
        velocity.z *= 0.8;
        if (keys['KeyW']) velocity.y = 28;
        else if (keys['KeyS']) velocity.y = -18;
        else velocity.y = 0;

    } else if (isWebSwinging) {
        velocity.y -= 26 * delta;

        const toWeb = new THREE.Vector3().subVectors(webPoint, playerGroup.position);
        const currentDist = toWeb.length();

        // 🎯 ดึงตึงแน่น: ถ้าเกินระยะใย ล็อกและกระชับตำแหน่งทันที ไม่ให้ยาน
        if (currentDist > webLength) {
            toWeb.normalize();
            
            const dot = velocity.dot(toWeb);
            if (dot < 0) {
                velocity.sub(toWeb.clone().multiplyScalar(dot));
            }
            
            // ล็อกตำแหน่งให้ตึงแน่นทันทีตาม webLength
            playerGroup.position.copy(webPoint).sub(toWeb.clone().multiplyScalar(webLength));
            
            // เพิ่มแรงดึงเข้าหาจุดเกาะช่วยส่งตัวขึ้น
            velocity.add(toWeb.multiplyScalar(18 * delta));
        }

        if (keys['KeyW']) velocity.add(forward.clone().multiplyScalar(40 * delta));
        if (keys['KeyA']) velocity.add(right.clone().multiplyScalar(-22 * delta));
        if (keys['KeyD']) velocity.add(right.clone().multiplyScalar(22 * delta));

        const handPos = new THREE.Vector3();
        if (swingHand === 'right') rightArmPivot.getWorldPosition(handPos);
        else leftArmPivot.getWorldPosition(handPos);

        webGeo.setFromPoints([handPos, webPoint]);

    } else {
        if (isGrounded) {
            velocity.x *= 0.86;
            velocity.z *= 0.86;
            
            let moveDir = new THREE.Vector3();
            if (keys['KeyW']) moveDir.add(forward);
            if (keys['KeyS']) moveDir.sub(forward);
            if (keys['KeyA']) moveDir.sub(right);
            if (keys['KeyD']) moveDir.add(right);

            if (moveDir.lengthSq() > 0) {
                moveDir.normalize();
                velocity.add(moveDir.multiplyScalar(42 * delta));
            }
        }
        velocity.y -= 28 * delta;
    }

    playerGroup.position.addScaledVector(velocity, delta);

    handleBuildingCollisions();

    // Ground Check
    if (playerGroup.position.y <= 1.0) {
        playerGroup.position.y = 1.0;
        velocity.y = 0;
        isGrounded = true;
        if (isWebSwinging) stopSwing(false);
        if (isWallRunning) isWallRunning = false;
    } else {
        isGrounded = false;
    }

    // Smooth Player Turning
    if (!isWallRunning) {
        let turnTargetAngle = playerGroup.rotation.y;
        const horizVel = new THREE.Vector3(velocity.x, 0, velocity.z);

        if (horizVel.lengthSq() > 1.5) {
            turnTargetAngle = Math.atan2(velocity.x, velocity.z) + Math.PI;
        } else if (isGrounded) {
            turnTargetAngle = cameraYaw + Math.PI;
        }

        let diff = turnTargetAngle - playerGroup.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        playerGroup.rotation.y += diff * 0.2;
    }

    // 🤖 Update Enemies AI
    enemies.forEach(e => {
        if (!e.isAlive) return;

        if (e.isWebbed) {
            e.webTimer -= delta;
            if (e.webTimer <= 0) {
                e.isWebbed = false;
                e.mesh.children.forEach(child => child.material = enemyMat);
            }
        } else {
            const dist = e.mesh.position.distanceTo(playerGroup.position);
            if (dist < 25 && dist > 2) {
                const dir = new THREE.Vector3().subVectors(playerGroup.position, e.mesh.position);
                dir.y = 0;
                dir.normalize();
                e.mesh.position.addScaledVector(dir, 4 * delta);
                e.mesh.lookAt(playerGroup.position.x, e.mesh.position.y, playerGroup.position.z);
            }
        }

        e.mesh.position.addScaledVector(e.velocity, delta);
        e.velocity.multiplyScalar(0.9);
    });

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= delta;
        p.mesh.position.addScaledVector(p.vel, delta);
        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        }
    }

    updateAnimations(delta);

    // UI Updates
    const speedEl = document.getElementById('speedVal');
    if (speedEl) speedEl.innerText = Math.round(velocity.length() * 3.6);

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});