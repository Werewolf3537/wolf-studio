/* ==========================================================================
   КОНФИГУРАЦИЯ ТОЧЕК НА КАРТЕ
   Задай для каждой сцены её координаты на картинке плана (в процентах)
   ========================================================================== */
const dotsData = {
    "1": { top: "30%", left: "45%", title: "1" },
    "2": { top: "55%", left: "20%", title: "2" },
    "3": { top: "70%", left: "65%", title: "3" },
    "4": { top: "40%", left: "80%", title: "4" }
    // Добавляй сцены 5, 6, 7, 8 сюда по аналогии, когда они понадобятся
};

// Путь к твоей картинке планировки
const mapImagePath = "images/plan.png"; 


/* ==========================================================================
   АВТОМАТИЧЕСКОЕ СОЗДАНИЕ СТИЛЕЙ И КАРТЫ (Не нужно трогать HTML и CSS)
   ========================================================================== */

// Внедряем стили карты прямо в документ, чтобы не засорять основной CSS
const mapStyles = `
    .minimap-container { position: relative; }
    .map-dot { position: absolute; width: 20px; height: 20px; cursor: pointer; z-index: 5; transform: translate(-50%, -50%); }
    .dot-core { width: 10px; height: 10px; background-color: #fff; border: 2px solid #2ecc71; border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 10px rgba(0,0,0,0.5); transition: background 0.3s; }
    .map-dot.is-active .dot-core { background-color: #2ecc71; transform: translate(-50%, -50%) scale(1.2); }
    .radar-beam { display: none; position: absolute; top: 50%; left: 50%; width: 60px; height: 60px; background: conic-gradient(from -30deg, rgba(46, 204, 113, 0.4) 0deg, rgba(46, 204, 113, 0) 60deg); border-radius: 50%; margin-top: -30px; margin-left: -30px; pointer-events: none; }
    .map-dot.is-active .radar-beam { display: block; }
`;
const styleSheet = document.createElement("style");
styleSheet.innerText = mapStyles;
document.head.appendChild(styleSheet);

// Функция инициализации, которую мы вызовем после создания плеера
function initMinimap(viewerInstance) {
    const mapContainer = document.querySelector('.minimap-container');
    if (!mapContainer) return;

    // 1. Очищаем контейнер и вставляем картинку плана
    mapContainer.innerHTML = `<img src="${mapImagePath}" class="minimap-img" alt="План">`;

    // 2. Генерируем точки на основе конфигурации dotsData
    Object.keys(dotsData).forEach(sceneId => {
        const data = dotsData[sceneId];
        const dotHtml = `
            <div class="map-dot ${viewerInstance.getScene() === sceneId ? 'is-active' : ''}" style="top: ${data.top}; left: ${data.left};" data-scene="${sceneId}" title="${data.title}">
                <div class="radar-beam"></div>
                <div class="dot-core"></div>
            </div>
        `;
        mapContainer.insertAdjacentHTML('beforeend', dotHtml);
    });

    // 3. Переключение сцен по клику на точку
    mapContainer.querySelectorAll('.map-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const targetScene = dot.getAttribute('data-scene');
            if (targetScene) viewerInstance.loadScene(targetScene);
        });
    });

    // 4. Логика подсветки активной точки при смене сцен в туре
    viewerInstance.on('scenechange', (sceneId) => {
        mapContainer.querySelectorAll('.map-dot').forEach(dot => dot.classList.remove('is-active'));
        const activeDot = mapContainer.querySelector(`.map-dot[data-scene="${sceneId}"]`);
        if (activeDot) activeDot.classList.add('is-active');
    });

    // 5. Вращение радара Marzipano-style вслед за камерой
    viewerInstance.on('animate', () => {
        const currentScene = viewerInstance.getScene();
        const yaw = viewerInstance.getYaw();
        const activeRadar = mapContainer.querySelector(`.map-dot[data-scene="${currentScene}"] .radar-beam`);
        if (activeRadar) {
            // Если радар косит в сторону, можно прибавить/отнять градусы, например: (yaw + 90)
            activeRadar.style.transform = `rotate(${yaw}deg)`; 
        }
    });

    // 6. Логика для кнопки Открыть/Закрыть карту
    const mapBtn = document.querySelector('.map-toggle-btn');
    if (mapBtn) {
        mapBtn.addEventListener('click', () => {
            mapContainer.classList.toggle('active');
        });
    }
}
