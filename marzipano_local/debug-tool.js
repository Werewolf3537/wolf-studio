// ==========================================================
// АВТОНОМНЫЙ ИНСТРУМЕНТ ОТЛАДКИ И ГИРОСКОПА ДЛЯ MARZIPANO
// ==========================================================
var DEBUG_MODE = true;  // true - прицел и координаты включены, false - выключены
var ENABLE_GYRO = true; // true - включить гироскоп для телефонов, false - выключить

(function() {
  if (!DEBUG_MODE && !ENABLE_GYRO) return;

  console.log("%c[DebugTool] Модуль успешно загружен браузером!", "color: #00ffff; font-weight: bold;");

  window.addEventListener('load', function() {
    var panoContainer = document.querySelector('#pano') || document.querySelector('#panoList') || document.querySelector('.pano');
    if (!panoContainer) return;

    // 1. Создаем прицел и стили (только если активен режим отладки)
    if (DEBUG_MODE) {
      if (window.getComputedStyle(panoContainer).position === 'static') {
        panoContainer.style.position = 'relative';
      }
      var style = document.createElement('style');
      style.innerHTML = `
        #pano-crosshair { position: absolute; top: 50%; left: 50%; width: 20px; height: 20px; transform: translate(-50%, -50%); pointer-events: none; z-index: 9999; }
        #pano-crosshair::before, #pano-crosshair::after { content: ''; position: absolute; background: rgba(255, 255, 255, 0.9); border: 1px solid rgba(0, 0, 0, 0.6); }
        #pano-crosshair::before { top: 9px; left: 0; width: 20px; height: 2px; }
        #pano-crosshair::after { top: 0; left: 9px; width: 2px; height: 20px; }
      `;
      document.head.appendChild(style);
      var crosshair = document.createElement('div');
      crosshair.id = 'pano-crosshair';
      panoContainer.appendChild(crosshair);
    }

    // 2. Ждем инициализации viewer
    var checkViewerInterval = setInterval(function() {
      var activeViewer = window.viewer || (panoContainer.__marzipanoViewer);
      if (activeViewer) {
        clearInterval(checkViewerInterval);
        
        // Запуск снятия координат по клику (для ПК)
        if (DEBUG_MODE) initDebugClickListener(activeViewer);
        
        // Запуск встроенного гироскопа (для мобильных)
        if (ENABLE_GYRO) initLocalGyroscope(activeViewer);
      }
    }, 200);
  });

  // Логика снятия координат по клику
  function initDebugClickListener(marzipanoViewer) {
    var domElem = marzipanoViewer.domElement();
    if (!domElem) return;
    
    domElem.addEventListener('click', function(event) {
      var view = marzipanoViewer.view();
      if (!view) return;
      var rect = domElem.getBoundingClientRect();
      var screenX = event.clientX - rect.left;
      var screenY = event.clientY - rect.top;
      var coords = view.screenToCoordinates({ x: screenX, y: screenY });
      
      if (coords) {
        var yawDegrees = coords.yaw * 180 / Math.PI;
        var pitchDegrees = coords.pitch * 180 / Math.PI;
        console.log(
          "\n%c=== ТОЧКА ЗАФИКСИРОВАНА ===", "color: #ff00ff; font-weight: bold;" +
          "\nГрадусы -> Pitch (Вертикаль): " + yawDegrees.toFixed(2) + "°, Yaw (Горизонталь): " + pitchDegrees.toFixed(2) + "°" +
          "\n\nГОТОВЫЙ КОД ДЛЯ DATA.JS (В РАДИАНАХ):" +
          "\n{" +
          '\n  "yaw": ' + coords.yaw.toFixed(4) + ',' +
          '\n  "pitch": ' + coords.pitch.toFixed(4) + ',' +
          '\n  "rotation": 0,' +
          '\n  "target": "СЮДА_ID_СЦЕНЫ"' +
          "\n}"
        );
      }
    }, true);
  }

  // Нативный контроллер гироскопа для Marzipano без внешних библиотек
  function initLocalGyroscope(marzipanoViewer) {
    var deviceOrientationSupported = typeof window.DeviceOrientationEvent !== 'undefined';
    if (!deviceOrientationSupported) return;

    console.log("%c[DebugTool] Модуль гироскопа готов к работе на мобильных устройствах.", "color: #00ff00;");

    var isRunning = false;
    var baseYaw = 0;
    var lastAlpha = null, lastBeta = null, lastGamma = null;

    function handleOrientation(event) {
      var view = marzipanoViewer.view();
      if (!view) return;

      var alpha = event.alpha; // Z-ось (компас)
      var beta = event.beta;   // X-ось (наклон вперед-назад)
      var gamma = event.gamma; // Y-ось (наклон влево-вправо)

      if (alpha === null || beta === null || gamma === null) return;

      // При первом запуске фиксируем начальное положение
      if (!isRunning) {
        isRunning = true;
        baseYaw = view.yaw();
        lastAlpha = alpha;
        lastBeta = beta;
        lastGamma = gamma;
        return;
      }

      // Вычисляем разницу смещения датчиков в радианах
      var deltaYaw = (alpha - lastAlpha) * Math.PI / 180;
      var deltaPitch = (beta - lastBeta) * Math.PI / 180;

      // Если экран перевернут в ландшафтный режим, меняем оси местами
      if (window.orientation === 90) {
        deltaYaw = (beta - lastBeta) * Math.PI / 180;
        deltaPitch = -(gamma - lastGamma) * Math.PI / 180;
      } else if (window.orientation === -90) {
        deltaYaw = -(beta - lastBeta) * Math.PI / 180;
        deltaPitch = (gamma - lastGamma) * Math.PI / 180;
      }

      // Плавно обновляем углы камеры в самом плеере
      view.setYaw(view.yaw() - deltaYaw * 0.5);
      view.setPitch(view.pitch() - deltaPitch * 0.5);

      // Запоминаем последние координаты для следующего кадра
      lastAlpha = alpha;
      lastBeta = beta;
      lastGamma = gamma;
    }

    function startGyro() {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    // Запрос разрешений для систем iOS (iPhone)
    function requestPermissionAndStart() {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
          .then(function(state) {
            if (state === 'granted') startGyro();
          })
          .catch(console.error);
      } else {
        startGyro(); // Для Android систем запускаем сразу
      }
    }

    // Принудительная активация по первому тапу по экрану (требование безопасности мобильных браузеров)
    document.body.addEventListener('click', function() {
      if (!isRunning) requestPermissionAndStart();
    }, { once: true });
  }
})();
