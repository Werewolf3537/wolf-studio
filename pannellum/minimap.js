/* ==========================================================================
   1. НАСТРОЙКА РАЗМЕРОВ КАРТЫ (ПК И МОБИЛЬНЫЕ)
   ========================================================================== */
const sizes = {
    // Настройки для компьютеров и ноутбуков (ПК)
    desktop: {
        width: "350px",  // Ширина карты на ПК (можно в px или в % от экрана, например "25%")
        height: "250px", // Высота карты на ПК
        bottom: "80px",  // Отступ снизу (чтобы не перекрывать кнопку)
        right: "20px"    // Отступ справа
    },
    // Настройки для смартфонов и планшетов (экран меньше 768px)
    mobile: {
        width: "85%",    // Ширина на телефоне (лучше в %, чтобы подходила под все экраны)
        height: "220px", // Высота на телефоне
        bottom: "75px",  // Отступ снизу
        right: "15px"    // Отступ справа
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

// Путь к картинке планировки
const mapImagePath = "images/plan.png"; 


/* ==========================================================================
   АВТОГЕНЕРАЦИЯ СТИЛЕЙ С УЧЕТОМ РАЗМЕРОВ
   ========================================================================== */
const mapStyles = `
    /* Базовый контейнер карты для ПК */
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
        z-index: 9999 !important; /* Поднимаем карту над всем интерфейсом */
        display: none !important;
        overflow: visible !important;
    }
    
    .minimap-container.active {
        display: block !important;
    }

    .minimap-img {
        width: 100% !important;
        height: 100% !important;
        object-fit: fill !important; /* Растягивает картинку ровно по границам контейнера, чтобы проценты точек не съезжали */
        pointer-events: none !important;
        border-radius: 10px !important;
    }

    /* Точки на карте */
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

    /* РАДАР (Луч взгляда) */
    .radar-beam {
        display: none !important;
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        width: 100px !important;  /* Немного увеличили длину луча для видимости */
        height: 100px !important; 
        
        /* Жестко выводим радар НАД картинкой, но ПОД самой точкой */
        z-index: 10002 !important; 
        
        background: conic-gradient(from -30deg, rgba(46, 204, 113, 0.45) 0deg, rgba(46, 204, 113, 0) 60deg) !important;
        border-radius: 50% !important;
        
        margin-top: -50px !important;
        margin-left: -50px !important;
        pointer-events: none !important;
        transform-origin: center center !important;
    }

    .map-dot.is-active .radar-beam {
        display: block !important;
    }

    /* НАСТРОЙКИ ДЛЯ МОБИЛЬНЫХ УСТРОЙСТВ */
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

    // Очищаем и создаем структуру заново
    mapContainer.innerHTML = `<img src="${mapImagePath}" class="minimap-img" alt="План">`;

    Object.keys(dotsData).forEach(sceneId => {
        const data = dotsData[sceneId];
        const isCurrent = String(viewerInstance.getScene()) === String(sceneId);
        
        const dotHtml = `
            <div class="map-dot ${isCurrent ? 'is-active' : ''}" style="top: ${data.top}; left: ${data.left};" data-scene="${sceneId}" title="${data.title}">
                <div class="radar-beam"></div>
                <div class="dot-core"></div>
            </div>
        `;
        mapContainer.insertAdjacentHTML('beforeend', dotHtml);
    });

    // Клики по точкам
    mapContainer.querySelectorAll('.map-dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetScene = dot.getAttribute('data-scene');
            if (targetScene) viewerInstance.loadScene(targetScene);
        });
    });

    // Синхронизация при смене сцены кнопками внутри тура
    viewerInstance.on('scenechange', (sceneId) => {
        mapContainer.querySelectorAll('.map-dot').forEach(dot => dot.classList.remove('is-active'));
        const activeDot = mapContainer.querySelector(`.map-dot[data-scene="${String(sceneId)}"]`);
        if (activeDot) activeDot.classList.add('is-active');
    });

    // Вращение радара Marzipano-style
    viewerInstance.on('animate', () => {
        const currentScene = viewerInstance.getScene();
        const yaw = viewerInstance.getYaw();
        const activeRadar = mapContainer.querySelector(`.map-dot[data-scene="${String(currentScene)}"] .radar-beam`);
        
        if (activeRadar) {
            // Крутим радар в противоход yaw из Pannellum
            activeRadar.style.transform = `rotate(${-yaw}deg)`; 
        }
    });

    // Логика кнопки Открыть/Закрыть
    const mapBtn = document.querySelector('.map-toggle-btn');
    if (mapBtn) {
        mapBtn.replaceWith(mapBtn.cloneNode(true));
        const newMapBtn = document.querySelector('.map-toggle-btn');
        newMapBtn.addEventListener('click', () => {
            mapContainer.classList.toggle('active');
        });
    }
}
