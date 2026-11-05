/* ==========================================================================
   1. НАСТРОЙКА РАЗМЕРОВ КАРТЫ (ПК И МОБИЛЬНЫЕ)
   ========================================================================== */
const sizes = {
    desktop: {
        width: "350px",  
        height: "250px", 
        bottom: "80px",  
        right: "20px"    
    },
    mobile: {
        width: "85%",    
        height: "220px", 
        bottom: "75px",  
        right: "15px"    
    }
};

/* ==========================================================================
   2. КОНФИГУРАЦИЯ ТОЧЕК НА КАРТЕ
   ========================================================================== */
const dotsData = {
    "1": { top: "30%", left: "45%", title: "Сцена 1" },
    "2": { top: "55%", left: "20%", title: "Сцена 2" },
    "3": { top: "70%", left: "65%", title: "Сцена 3" },
    "4": { top: "40%", left: "80%", title: "Сцена 4" }
};

const mapImagePath = "images/plan.png"; 

/* ==========================================================================
   АВТОГЕНЕРАЦИЯ СТИЛЕЙ КАРТЫ (Максимальный приоритет слоев)
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
        z-index: 999999 !important; /* Экстремально высокий слой, чтобы не перекрывалось панорамой */
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
        z-index: 1000001 !important;
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
        z-index: 1000003 !important;
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
        z-index: 1000002 !important; 
        margin-top: -60px !important;
        margin-left: -60px !important;
        pointer-events: none !important;
        transform-origin: center center !important;
    }

    .radar-beam svg {
        width: 100% !important;
        height: 100% !important;
        overflow: visible !important;
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
function initMinimap(viewerInstance, containerSelector, buttonSelector) {
    const mapContainer = document.querySelector(containerSelector || '.minimap-container');
    const mapBtn = document.querySelector(buttonSelector || '.map-toggle-btn');
    
    if (!mapContainer) return;

    // Очищаем и рендерим планировку
    mapContainer.innerHTML = `<img src="${mapImagePath}" class="minimap-img" alt="План">`;

    // Зеленый SVG сектор радара
    const radarSvg = `
        <svg viewBox="0 0 100 100">
            <defs>
                <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#2ecc71" stop-opacity="0.7"/>
                    <stop offset="100%" stop-color="#2ecc71" stop-opacity="0"/>
                </radialGradient>
            </defs>
            <path d="M 50 50 L 25 6 A 50 50 0 0 1 75 6 Z" fill="url(#radarGlow)" />
        </svg>
    `;

    // Создаем точки на карте на основе текущей активной сцены
    const currentSceneAtStart = String(viewerInstance.getScene());

    Object.keys(dotsData).forEach(sceneId => {
        const data = dotsData[sceneId];
        const isCurrent = currentSceneAtStart === String(sceneId);
        
        const dotHtml = `
            <div class="map-dot ${isCurrent ? 'is-active' : ''}" style="top: ${data.top}; left: ${data.left};" data-scene="${sceneId}" title="${data.title}">
                <div class="radar-beam">${radarSvg}</div>
                <div class="dot-core"></div>
            </div>
        `;
        mapContainer.insertAdjacentHTML('beforeend', dotHtml);
    });

    // Переход по сценам при клике на точки планировки
    mapContainer.querySelectorAll('.map-dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetScene = dot.getAttribute('data-scene');
            if (targetScene) viewerInstance.loadScene(targetScene);
        });
    });

    // Переключение активной точки при смене сцены внутри тура
    viewerInstance.on('scenechange', (sceneId) => {
        mapContainer.querySelectorAll('.map-dot').forEach(dot => dot.classList.remove('is-active'));
        const activeDot = mapContainer.querySelector(`.map-dot[data-scene="${String(sceneId)}"]`);
        if (activeDot) activeDot.classList.add('is-active');
    });

    // Функция синхронного вращения радара за камерой
    function updateRadar() {
        const currentScene = viewerInstance.getScene();
        const yaw = viewerInstance.getYaw();
        const activeRadar = mapContainer.querySelector(`.map-dot[data-scene="${String(currentScene)}"] .radar-beam`);
        if (activeRadar) {
            activeRadar.style.transform = `rotate(${-yaw}deg)`; 
        }
    }

    viewerInstance.on('animate', updateRadar);
    setInterval(updateRadar, 50); // Увеличили частоту обновления до 50мс для идеальной плавности

    // Чистая логика переключения кнопки Открыть/Закрыть (без дублирования событий)
    if (mapBtn) {
        mapBtn.onclick = null; // Принудительно очищаем старый инлайн-атрибут
        mapBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mapContainer.classList.toggle('active');
        });
    }
}
