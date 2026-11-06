// ==========================================================
// АВТОНОМНЫЙ ИНСТРУМЕНТ ОТЛАДКИ И ГИРОСКОПА С КНОПКОЙ УПРАВЛЕНИЯ
// ==========================================================
var DEBUG_MODE = false;  // Поменяйте на true, если снова нужен прицел и снятие координат по клику на ПК
var ENABLE_GYRO = true; // true - активировать модуль гироскопа для смартфонов, false - полностью скрыть

(function() {
  if (!DEBUG_MODE && !ENABLE_GYRO) return;

  console.log("%c[DebugTool] Модуль успешно загружен браузером!", "color: #00ffff; font-weight: bold;");

  window.addEventListener('load', function() {
    var panoContainer = document.querySelector('#pano') || document.querySelector('#panoList') || document.querySelector('.pano');
    if (!panoContainer) return;

    // 1. Создаем прицел и стили (только если активен режим отладки на ПК)
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
        
        // Запуск встроенного гироскопа с кнопкой (для мобильных)
        if (ENABLE_GYRO) initLocalGyroscope(activeViewer, panoContainer);
      }
    }, 200);
  });

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

  // СИНТАКСИС ИСПРАВЛЕН: 'def' заменен на 'function'
  function initLocalGyroscope(marzipanoViewer, container) {
    var deviceOrientationSupported = typeof window.DeviceOrientationEvent !== 'undefined';
    if (!deviceOrientationSupported) return;

    var isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) return;

    // Стили кнопки (Поставил аккуратно в верхний правый угол, чтобы не мешала)
    var gyroStyle = document.createElement('style');
    gyroStyle.innerHTML = `
      #gyro-toggle-btn {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 45px;
        height: 45px;
        background: rgba(0, 0, 0, 0.6);
        border: 2px solid rgba(255, 255, 255, 0.7);
        border-radius: 50%;
        color: #fff;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10001;
        transition: all 0.3s ease;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      }
      #gyro-toggle-btn.active {
        background: #00ff00;
        border-color: #fff;
        color: #000;
        box-shadow: 0 0 15px rgba(0, 255, 0, 0.6);
      }
    `;
    document.head.appendChild(gyroStyle);

    var gyroBtn = document.createElement('div');
    gyroBtn.id = 'gyro-toggle-btn';
    gyroBtn.innerHTML = '🧭'; 
    container.appendChild(gyroBtn);

    var gyroActive = false;
    var isRunning = false;
    var lastAlpha = null, lastBeta = null, lastGamma = null;

    function handleOrientation(event) {
      if (!gyroActive) return;

      var view = marzipanoViewer.view();
      if (!view) return;

      var alpha = event.alpha;
      var beta = event.beta;
      var gamma = event.gamma;

      if (alpha === null || beta === null || gamma === null) return;

      if (!isRunning) {
        isRunning = true;
        lastAlpha = alpha;
        lastBeta = beta;
        lastGamma = gamma;
        return;
      }

      var deltaYaw = (alpha - lastAlpha) * Math.PI / 180;
      var deltaPitch = (beta - lastBeta) * Math.PI / 180;

      if (window.orientation === 90) {
        deltaYaw = (beta - lastBeta) * Math.PI / 180;
        deltaPitch = -(gamma - lastGamma) * Math.PI / 180;
      } else if (window.orientation === -90) {
        deltaYaw = -(beta - lastBeta) * Math.PI / 180;
        deltaPitch = (gamma - lastGamma) * Math.PI / 180;
      }

      // Чувствительность выставлена на честные 1.0 (идеальное следование за руками)
      view.setYaw(view.yaw() - deltaYaw * 1.0);
      view.setPitch(view.pitch() - deltaPitch * 1.0);

      lastAlpha = alpha;
      lastBeta = beta;
      lastGamma = gamma;
    }

    function turnOnGyro() {
      gyroActive = true;
      isRunning = false; 
      gyroBtn.classList.add('active');
      gyroBtn.innerHTML = '📱'; 
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    function turnOffGyro() {
      gyroActive = false;
      gyroBtn.classList.remove('active');
      gyroBtn.innerHTML = '🧭'; 
      window.removeEventListener('deviceorientation', handleOrientation, true);
    }

    gyroBtn.addEventListener('click', function(e) {
      e.stopPropagation(); 

      if (gyroActive) {
        turnOffGyro();
        console.log("[DebugTool] Гироскоп выключен.");
      } else {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
          DeviceOrientationEvent.requestPermission()
            .then(function(state) {
              if (state === 'granted') turnOnGyro();
            })
            .catch(console.error);
        } else {
          turnOnGyro();
        }
        console.log("[DebugTool] Гироскоп включен.");
      }
    });
  }
})();
