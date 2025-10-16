import * as THREE from 'three';

// === Basic Scene Setup ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// === Card Texture Setup ===
const canvasWidth = 1024;
const canvasHeight = 512;

// Front Canvas and Texture
const canvasFront = document.createElement('canvas');
canvasFront.width = canvasWidth;
canvasFront.height = canvasHeight;
const ctxFront = canvasFront.getContext('2d');
const textureFront = new THREE.CanvasTexture(canvasFront);

// Back Canvas and Texture
const canvasBack = document.createElement('canvas');
canvasBack.width = canvasWidth;
canvasBack.height = canvasHeight;
const ctxBack = canvasBack.getContext('2d');
const textureBack = new THREE.CanvasTexture(canvasBack);

let logoImage = null; // Shared logo image

// === Draggable Elements Data (Mapped to their respective canvases) ===
const cardElements = {
    front: {
        ctx: ctxFront,
        texture: textureFront,
        elements: {
            name: { text: 'Aisha Nama', x: 50, y: 150, font: 'bold 64px Arial' },
            title: { text: 'AI & Data Science Enthusiast', x: 50, y: 240, font: '48px Arial' },
            contact: { text: 'aisha.nama@email.com', x: 50, y: 320, font: '40px Arial' }
        }
    },
    back: {
        ctx: ctxBack,
        texture: textureBack,
        elements: {
            slogan: { text: "Let's build the future.", x: canvasWidth / 2, y: 200, font: 'italic 54px Arial', align: 'center' },
            logo: { img: null, x: canvasWidth / 2 - 100, y: 250, width: 200, height: 200 } // Center the logo initial position
        }
    }
};

// Helper to get text bounding box (requires ctx to be set to current canvas)
function getTextBBox(elementData, ctx) {
    ctx.font = elementData.font;
    const metrics = ctx.measureText(elementData.text);
    const align = elementData.align || 'left';
    let x = elementData.x;
    if (align === 'center') {
        x -= metrics.width / 2;
    } else if (align === 'right') {
        x -= metrics.width;
    }
    return {
        x: x,
        y: elementData.y - metrics.actualBoundingBoxAscent,
        width: metrics.width,
        height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
    };
}

// Helper to get logo bounding box
function getLogoBBox(elementData) {
    return { x: elementData.x, y: elementData.y, width: elementData.width, height: elementData.height };
}

// === Drawing Function ===
function updateCardTextures() {
    const bgColor = document.getElementById('bgColor').value;
    const textColor = document.getElementById('textColor').value;

    // --- Draw Front ---
    cardElements.front.elements.name.text = document.getElementById('name').value;
    cardElements.front.elements.title.text = document.getElementById('title').value;
    cardElements.front.elements.contact.text = document.getElementById('contact').value;
    
    const ctxF = cardElements.front.ctx;
    ctxF.fillStyle = bgColor;
    ctxF.fillRect(0, 0, canvasWidth, canvasHeight);
    ctxF.fillStyle = textColor;
    Object.values(cardElements.front.elements).forEach(el => {
        if (el.text) {
            ctxF.font = el.font;
            ctxF.textAlign = el.align || 'left';
            ctxF.fillText(el.text, el.x, el.y);
        }
    });
    cardElements.front.texture.needsUpdate = true;

    // --- Draw Back ---
    cardElements.back.elements.slogan.text = document.getElementById('slogan').value;
    
    const ctxB = cardElements.back.ctx;
    ctxB.fillStyle = bgColor;
    ctxB.fillRect(0, 0, canvasWidth, canvasHeight);
    ctxB.fillStyle = textColor;
    
    // Draw Slogan
    const sloganEl = cardElements.back.elements.slogan;
    if (sloganEl.text) {
        ctxB.font = sloganEl.font;
        ctxB.textAlign = sloganEl.align || 'left';
        ctxB.fillText(sloganEl.text, sloganEl.x, sloganEl.y);
    }
    
    // Draw Logo
    const logoEl = cardElements.back.elements.logo;
    if (logoImage) {
        logoEl.img = logoImage; // Assign loaded image
        ctxB.drawImage(logoImage, logoEl.x, logoEl.y, logoEl.width, logoEl.height);
    } else {
        logoEl.img = null; // Clear if no image
    }
    cardElements.back.texture.needsUpdate = true;
}

// === 3D Business Card Object ===
const cardWidth = 3.5 * 2;
const cardHeight = 2 * 2;
const cardDepth = 0.05 * 2;
const geometry = new THREE.BoxGeometry(cardWidth, cardHeight, cardDepth);

const sideMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8 });
const frontMaterial = new THREE.MeshStandardMaterial({ map: textureFront, roughness: 0.4 });
const backMaterial = new THREE.MeshStandardMaterial({ map: textureBack, roughness: 0.4 });

const materials = [
    sideMaterial,   // right
    sideMaterial,   // left
    sideMaterial,   // top
    sideMaterial,   // bottom
    frontMaterial,  // front (+z)
    backMaterial    // back (-z)
];

const card = new THREE.Mesh(geometry, materials);
scene.add(card);

// === Event Listeners for Editing ===
['name', 'title', 'contact', 'slogan', 'bgColor', 'textColor'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateCardTextures);
});

document.getElementById('logo').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => { logoImage = img; updateCardTextures(); };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        logoImage = null; // If file is cleared
        updateCardTextures();
    }
});

// === DRAG & DROP AND CARD ROTATION LOGIC ===
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let draggedElement = null; // Reference to the element being dragged
let dragOffset = { x: 0, y: 0 }; // Offset from mouse to element's top-left corner
let currentCanvasState = null; // To know if we're on front or back

let isCardDragging = false; // Flag for card rotation
let previousMouseX = 0;

renderer.domElement.addEventListener('pointerdown', (event) => {
    // 1. Determine which side of the card is visible and being clicked
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(card);

    if (intersects.length > 0) {
        const intersection = intersects[0];
        const faceIndex = intersection.faceIndex;
        
        let sideKey = null; // 'front' or 'back'
        // Face indices: 0,1=right; 2,3=left; 4,5=top; 6,7=bottom; 8,9=front; 10,11=back
        if (faceIndex >= 8 && faceIndex <= 9) {
            sideKey = 'front';
        } else if (faceIndex >= 10 && faceIndex <= 11) {
            sideKey = 'back';
        }

        if (sideKey) {
            const uv = intersection.uv;
            const canvasX = uv.x * canvasWidth;
            const canvasY = (1 - uv.y) * canvasHeight; // Flip Y for canvas coords

            currentCanvasState = cardElements[sideKey];
            const elementsToCheck = currentCanvasState.elements;
            const currentCtx = currentCanvasState.ctx;

            // Check if we clicked on any draggable element (in reverse order to pick top-most)
            for (const key of Object.keys(elementsToCheck).reverse()) {
                const el = elementsToCheck[key];
                
                let bbox;
                if (el.text !== undefined) { // Is a text element
                    bbox = getTextBBox(el, currentCtx);
                } else if (el.img !== undefined && el.img !== null) { // Is a logo element with an image
                    bbox = getLogoBBox(el);
                } else {
                    continue; // Skip if no text or no image
                }

                if (canvasX >= bbox.x && canvasX <= bbox.x + bbox.width &&
                    canvasY >= bbox.y && canvasY <= bbox.y + bbox.height) {
                    
                    draggedElement = { data: el, side: sideKey, key: key }; // Store reference to element
                    dragOffset.x = canvasX - el.x;
                    dragOffset.y = canvasY - el.y;
                    
                    isCardDragging = false; // Don't rotate card if dragging element
                    return; // Stop here, we're dragging an element
                }
            }
        }
    }
    
    // If no element was clicked, start card rotation
    isCardDragging = true;
    previousMouseX = event.clientX;
});

renderer.domElement.addEventListener('pointermove', (event) => {
    // If an element is being dragged
    if (draggedElement) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(card);

        if (intersects.length > 0) {
            const uv = intersects[0].uv;
            const canvasX = uv.x * canvasWidth;
            const canvasY = (1 - uv.y) * canvasHeight;

            // Update the position of the dragged element
            draggedElement.data.x = canvasX - dragOffset.x;
            draggedElement.data.y = canvasY - dragOffset.y;

            updateCardTextures(); // Redraw with new position
        }
    } else if (isCardDragging) { // If no element is dragged, rotate the card
        const deltaX = event.clientX - previousMouseX;
        card.rotation.y += deltaX * 0.01; // Sensitivity for rotation
        previousMouseX = event.clientX;
    }
});

renderer.domElement.addEventListener('pointerup', () => {
    draggedElement = null; // Stop dragging element
    isCardDragging = false; // Stop dragging card
    currentCanvasState = null;
});

// Zoom with the scroll wheel (same as before)
renderer.domElement.addEventListener('wheel', (e) => {
    camera.position.z += e.deltaY * 0.005;
    camera.position.z = Math.max(2, Math.min(15, camera.position.z));
});


// === Window Resize Handler (same as before) ===
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// === Animation Loop (same as before) ===
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Initial Draw and Start Animation
updateCardTextures();
animate();