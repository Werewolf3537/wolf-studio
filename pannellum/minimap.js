/* ==========================================================================
   1. НАСТРОЙКА РАЗМЕРОВ КАРТЫ (ПК И МОБИЛЬНЫЕ)
   ========================================================================== */
const sizes = {
    desktop: {
        width: "350px",  // Ширина карты на ПК
        height: "250px", // Высота карты на ПК
        bottom: "80px",  // Отступ снизу
        right: "20px"    // Отступ справа
    },
    mobile: {
        width: "85%",    // Ширина на телефоне (в процентах от экрана)
        height: "220px", // Высота на телефоне
        bottom: "75px",  // Отступ снизу
        right: "15px"    // Отступ справа
    }
};

/* ==========================================================================
   2. КОНФИГУРАЦИЯ ТОЧЕК НА КАРТЕ
   ========================================================================== */
const dotsData = {
    "1": { top: "30%", left: "45%", title: "1" },
    "2": { top: "55%", left: "20%", title: "2" },
    "3": { top: "70%", left: "65%", title: "3" },
    "4": { top: "40%", left: "80%", title: "4" }
    // По аналогии можешь добавлять "5", "6", "7", "8"
};

// Путь к твоей картинке планировки
const mapImagePath = "images/plan.png"; 


/* ==========================================================================
   АВТОГЕНЕРАЦИЯ СТИЛЕЙ КАРТЫ
   ========================================================================== */
const mapStyles = `
    .minimap-container {
        position: absolute !important;
        bottom: ${sizes.desktop.bottom} !important;
        right: ${sizes.desktop.right} !important;
        width: ${sizes.desktop.width} !important;
        height: ${sizes.desktop.height} !important;
        background: rgba(15, 15, 15, 0.85) !important;
        backdrop-filter: blur(10px) !important;
        border: 2px solid rgba(255, 255, 255, 0.15) !important;
        border-radius: 12px !important;
        z-index: 9999 !important; 
        display: none !important;
        overflow: visible !important;
    }
    
    .minimap-container.active {
        display: block !important;
    }

    .minimap-img {
        width: 100% !important;
        height: 100% !important;
        object-fit: fill !important; 
        pointer-events: none !important;
        border-radius: 10px !important;
    }

    .map-dot {
        position: absolute !important;
        width: 20px !important;
        height: 20px !important;
        margin-left: -10px !important;
        margin-top: -10px !important;
        cursor: pointer !important;
        z-index: 10001 !important;
    }

    .dot-core {
        width: 12px !important;
        height: 12px !important;
        background-color: #fff !important;
        border: 2px solid #2ecc71 !important;
        border-radius: 50% !important;
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        box-shadow: 0 0 8px rgba(0,0,0,0.6) !important;
        z-index: 10003 !important;
        transition: background 0.3s, transform 0.3s !important;
    }

    .map-dot.is-active .dot-core {
        background-color: #2ecc71 !important;
        transform: translate(-50%, -50%) scale(1.2) !important;
    }

    .radar-beam {
        display: none !important;
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        width: 120px !important;  
        height: 120px !important; 
        z-index: 10002 !important; 
        margin-top: -60px !important;
        margin-left: -60px !important;
        pointer-events: none !important;
        transform-origin: center center !important;
    }

    .radar-beam svg {
        width: 100% !important;
        height: 100% !important;
    }

    .map-dot.is-active .radar-beam {
        display: block !important;
    }

    @media (max-width: 768px) {
        .minimap-container {
            bottom: ${sizes.mobile.bottom} !important;
            right: ${sizes.mobile.right} !important;
            width: ${sizes.mobile.width} !important;
            height: ${sizes.mobile.height} !important;
        }
    }
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = mapStyles;
document.head.appendChild(styleSheet);

/* ==========================================================================
   3. ЛОГИКА ИНИЦИАЛИЗАЦИИ КАРТЫ В PANNELLUM
   ========================================================================== */
function initMinimap(viewerInstance) {
    const mapContainer = document.querySelector('.minimap-container');
    if (!mapContainer) return;

    mapContainer.innerHTML = `<img src="${mapImagePath}" class="minimap-img" alt="План">`;

    // Мягкий полупрозрачный зеленый SVG-вектор (угол обзора 60 градусов)
    const radarSvg = `
        <svg viewBox="0 0 100 100">
            <defs>
                <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#2ecc71" stop-opacity="0.6"/>
                    <stop offset="100%" stop-color="#2ecc71" stop-opacity="0"/>
                </radialGradient>
            </defs>
            <path d="M 50 50 L 25 6 A 50 50 0 0 1 75 6 Z" fill="url(#radarGlow)" />
        </svg>
    `;

    // Генерируем точки на карте
    Object.keys(dotsData).forEach(sceneId => {
        const data = dotsData[sceneId];
        const isCurrent = String(viewerInstance.getScene()) === String(sceneId);
        
        const dotHtml = `
            <div class="map-dot ${isCurrent ? 'is-active' : ''}" style="top: ${data.top}; left: ${data.left};" data-scene="${sceneId}" title="${data.title}">
                <div class="radar-beam">${radarSvg}</div>
                <div class="dot-core"></div>
            </div>
        `;
        mapContainer.insertAdjacentHTML('beforeend', dotHtml);
    });

    // Клики по точкам карты для перехода
    mapContainer.querySelectorAll('.map-dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetScene = dot.getAttribute('data-scene');
            if (targetScene) viewerInstance.loadScene(targetScene);
        });
    });

    // Синхронизация активной точки при ходьбе по туру
    viewerInstance.on('scenechange', (sceneId) => {
        mapContainer.querySelectorAll('.map-dot').forEach(dot => dot.classList.remove('is-active'));
        const activeDot = mapContainer.querySelector(`.map-dot[data-scene="${String(sceneId)}"]`);
        if (activeDot) activeDot.classList.add('is-active');
    });

    // Функция обновления вращения радара Marzipano-style
    function updateRadar() {
        const currentScene = viewerInstance.getScene();
        const yaw = viewerInstance.getYaw();
        const activeRadar = mapContainer.querySelector(`.map-dot[data-scene="${String(currentScene)}"] .radar-beam`);
        if (activeRadar) {
            activeRadar.style.transform = `rotate(${-yaw}deg)`; 
        }
    }

    // Подвязываем к событиям Pannellum + дублируем интервалом на случай фризов движка
    viewerInstance.on('animate', updateRadar);
    setInterval(updateRadar, 100);

    // Логика кнопки Открыть/Закрыть карту
    const mapBtn = document.querySelector('.map-toggle-btn');
    if (mapBtn) {
        mapBtn.replaceWith(mapBtn.cloneNode(true));
        const newMapBtn = document.querySelector('.map-toggle-btn');
        newMapBtn.addEventListener('click', () => {
            mapContainer.classList.toggle('active');
        });
    }
}
