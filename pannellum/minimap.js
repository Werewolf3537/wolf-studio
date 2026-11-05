/* ==========================================================================
   КОНФИГУРАЦИЯ ТОЧЕК НА КАРТЕ
   Задай для каждой сцены её координаты на картинке плана (в процентах от 0 до 100)
   ========================================================================== */
const dotsData = {
    "1": { top: "30%", left: "45%", title: "1" },
    "2": { top: "55%", left: "20%", title: "2" },
    "3": { top: "70%", left: "65%", title: "3" },
    "4": { top: "40%", left: "80%", title: "4" }
};

// Путь к твоей картинке планировки
const mapImagePath = "images/plan.png"; 


/* ==========================================================================
   АВТОМАТИЧЕСКИЕ ИСПРАВЛЕННЫЕ СТИЛИ (Фикс позиционирования и радара)
   ========================================================================== */
const mapStyles = `
    /* Фиксируем карту в правом нижнем углу, поверх панорамы */
    .minimap-container {
        position: absolute !important;
        bottom: 80px !important;
        right: 20px !important;
        width: 300px !important;
        height: 220px !important;
        background: rgba(0, 0, 0, 0.8) !important;
        border: 2px solid rgba(255, 255, 255, 0.2) !important;
        border-radius: 12px !important;
        z-index: 15 !important;
        display: none !important; /* По умолчанию скрыта */
        overflow: visible !important; /* Разрешаем радару выходить за рамки точки */
    }
    
    /* Класс активации карты */
    .minimap-container.active {
        display: block !important;
    }

    /* Картинка плана внутри контейнера */
    .minimap-img {
        width: 100% !important;
        height: 100% !important;
        object-fit: contain !important; /* Картинка пропорционально впишется в окно */
        pointer-events: none !important;
    }

    /* Базовый класс точки (инвидимый контейнер для центрирования) */
    .map-dot {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        cursor: pointer !important;
        z-index: 20 !important;
    }

    /* Сам кругляшок в центре */
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
        transition: background 0.3s, transform 0.3s !important;
    }

    /* Анимация пульсации для активной точки */
    .map-dot.is-active .dot-core {
        background-color: #2ecc71 !important;
        transform: translate(-50%, -50%) scale(1.2) !important;
    }

    /* РАДАР (Луч взгляда Marzipano-style) */
    .radar-beam {
        display: none !important;
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        width: 80px !important;  /* Длина луча */
        height: 80px !important; /* Ширина раскрытия луча */
        
        /* Световой конус градиента */
        background: conic-gradient(from -30deg, rgba(46, 204, 113, 0.4) 0deg, rgba(46, 204, 113, 0) 60deg) !important;
        border-radius: 50% !important;
        
        /* Сдвигаем центр вращения градиента точно в центр точки */
        margin-top: -40px !important;
        margin-left: -40px !important;
        pointer-events: none !important;
        transform-origin: center center !important;
    }

    /* Показываем радар только на активной точке */
    .map-dot.is-active .radar-beam {
        display: block !important;
    }

    /* АДАПТИВНОСТЬ ПОД ТЕЛЕФОНЫ (Экраны до 768px) */
    @media (max-width: 768px) {
        .minimap-container {
            bottom: 75px !important;
            right: 15px !important;
            width: calc(100% - 30px) !important;
            max-width: 340px !important;
            height: 240px !important;
        }
    }
`;

// Внедряем исправленные стили в тег <head>
const styleSheet = document.createElement("style");
styleSheet.innerText = mapStyles;
document.head.appendChild(styleSheet);

/* ==========================================================================
   ЛОГИКА СВЯЗИ С PANNELLUM
   ========================================================================== */
function initMinimap(viewerInstance) {
    const mapContainer = document.querySelector('.minimap-container');
    if (!mapContainer) return;

    // 1. Рендерим картинку
    mapContainer.innerHTML = `<img src="${mapImagePath}" class="minimap-img" alt="План">`;

    // 2. Генерируем точки
    Object.keys(dotsData).forEach(sceneId => {
        const data = dotsData[sceneId];
        const isCurrent = viewerInstance.getScene() === sceneId;
        const dotHtml = `
            <div class="map-dot ${isCurrent ? 'is-active' : ''}" style="top: ${data.top}; left: ${data.left};" data-scene="${sceneId}" title="${data.title}">
                <div class="radar-beam"></div>
                <div class="dot-core"></div>
            </div>
        `;
        mapContainer.insertAdjacentHTML('beforeend', dotHtml);
    });

    // 3. Переключение сцен по клику на точку карты
    mapContainer.querySelectorAll('.map-dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
            e.stopPropagation(); // Чтобы клик по точке не закрывал карту, если есть внешние обработчики
            const targetScene = dot.getAttribute('data-scene');
            if (targetScene) viewerInstance.loadScene(targetScene);
        });
    });

    // 4. Синхронизация активной точки при перемещении по туру
    viewerInstance.on('scenechange', (sceneId) => {
        mapContainer.querySelectorAll('.map-dot').forEach(dot => dot.classList.remove('is-active'));
        const activeDot = mapContainer.querySelector(`.map-dot[data-scene="${sceneId}"]`);
        if (activeDot) activeDot.classList.add('is-active');
    });

    // 5. Вращение луча радара вслед за поворотом камеры
    viewerInstance.on('animate', () => {
        const currentScene = viewerInstance.getScene();
        const yaw = viewerInstance.getYaw();
        const activeRadar = mapContainer.querySelector(`.map-dot[data-scene="${currentScene}"] .radar-beam`);
        
        if (activeRadar) {
            // В Pannellum yaw идет в обратную сторону относительно стандартного CSS вращения, 
            // поэтому ставим знак минус перед yaw, чтобы радар крутился синхронно с мышкой.
            activeRadar.style.transform = `rotate(${-yaw}deg)`; 
        }
    });

    // 6. Кнопка открыть/закрыть карту
    const mapBtn = document.querySelector('.map-toggle-btn');
    if (mapBtn) {
        // Очищаем старые события (на всякий случай) и вешаем чистое переключение класса
        mapBtn.replaceWith(mapBtn.cloneNode(true));
        const newMapBtn = document.querySelector('.map-toggle-btn');
        newMapBtn.addEventListener('click', () => {
            mapContainer.classList.toggle('active');
        });
    }
}
