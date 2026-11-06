// ==========================================================
// СИНХРОННЫЙ ГИРОСКОП С АВТОКАЛИБРОВКОЙ И ОПТИМИЗАЦИЕЙ WEBGL
// ==========================================================
var DEBUG_MODE = false; 
var ENABLE_GYRO = true; 

(function() {
  if (!DEBUG_MODE && !ENABLE_GYRO) return;

  console.log("%c[DebugTool] Модуль успешно загружен браузером!", "color: #00ffff; font-weight: bold;");

  window.addEventListener('load', function() {
    var panoContainer = document.querySelector('#pano') || document.querySelector('#panoList') || document.querySelector('.pano');
    if (!panoContainer) return;

    if (DEBUG_MODE) {
      if (window.getComputedStyle(panoContainer).position === 'static') panoContainer.style.position = 'relative';
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

    var checkViewerInterval = setInterval(function() {
      var activeViewer = window.viewer || panoContainer.__marzipanoViewer;
      if (activeViewer) {
        clearInterval(checkViewerInterval);
        if (DEBUG_MODE) initDebugClickListener(activeViewer);
        if (ENABLE_GYRO) initOptimizedGyroscope(activeViewer, panoContainer);
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
        console.log(
          "\n%c=== ТОЧКА ЗАФИКСИРОВАНА ===" +
          "\n\nГОТОВЫЙ КОД ДЛЯ DATA.JS:" +
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

  // Оптимизированный ручной гироскоп с мгновенным подхватом осей взгляда
  function initOptimizedGyroscope(marzipanoViewer, container) {
    if (typeof window.DeviceOrientationEvent === 'undefined') return;
    if (!/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;

    var gyroStyle = document.createElement('style');
    gyroStyle.innerHTML = `
      #gyro-toggle-btn {
        position: absolute; top: 20px; right: 20px; width: 45px; height: 45px;
        background: rgba(0, 0, 0, 0.6); border: 2px solid rgba(255, 255, 255, 0.7);
        border-radius: 50%; color: #fff; font-size: 20px; display: flex;
        align-items: center; justify-content: center; cursor: pointer;
        z-index: 10001; transition: all 0.3s ease; box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      }
      #gyro-toggle-btn.active { background: #00ff00; border-color: #fff; color: #000; box-shadow: 0 0 15px rgba(0, 255, 0, 0.6); }
    `;
    document.head.appendChild(gyroStyle);

    var gyroBtn = document.createElement('div');
    gyroBtn.id = 'gyro-toggle-btn';
    gyroBtn.innerHTML = '🧭'; 
    container.appendChild(gyroBtn);

    var gyroActive = false;
    var isCalibrated = false;
    var lastAlpha = null, lastBeta = null, lastGamma = null;
    
    // Переменные для удерживания физических смещений рук
    var offsetYaw = 0;
    var offsetPitch = 0;

    function handleOrientation(event) {
      if (!gyroActive) return;

      var view = marzipanoViewer.view();
      if (!view) return;

      var alpha = event.alpha; // Поворот (0-360)
      var beta = event.beta;   // Наклон вперед/назад (-180-180)
      var gamma = event.gamma; // Наклон влево/вправо (-90-90)

      if (alpha === null || beta === null || gamma === null) return;

      // Переводим углы смартфона в радианы
      var currentPhysicalYaw = -alpha * Math.PI / 180;
      var currentPhysicalPitch = beta * Math.PI / 180;

      // Учитываем поворот экрана в ландшафтный режим
      var orientation = window.orientation || 0;
      if (orientation === 90) {
        currentPhysicalYaw = -beta * Math.PI / 180;
        currentPhysicalPitch = -gamma * Math.PI / 180;
      } else if (orientation === -90) {
        currentPhysicalYaw = beta * Math.PI / 180;
        currentPhysicalPitch = gamma * Math.PI / 180;
      }

      // МГНОВЕННАЯ КАЛИБРОВКА: Запоминаем разницу между виртуальным взглядом и физическим наклоном рук
      if (!isCalibrated) {
        offsetYaw = view.yaw() - currentPhysicalYaw;
        offsetPitch = view.pitch() - currentPhysicalPitch;
        isCalibrated = true;
        return;
      }

      // Рассчитываем итоговые скорректированные координаты
      var targetYaw = currentPhysicalYaw + offsetYaw;
      var targetPitch = currentPhysicalPitch + offsetPitch;

      // Защита от выворачивания камеры на полюсах
      targetPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, targetPitch));

      // Применяем координаты. Умножение на коэффициент убрано для максимальной отзывчивости (1.0)
      view.setYaw(targetYaw);
      view.setPitch(targetPitch);
    }

    function turnOnGyro() {
      gyroActive = true;
      isCalibrated = false; // Сбрасываем флаг для мгновенной калибровки под текущие руки
      gyroBtn.classList.add('active');
      gyroBtn.innerHTML = '📱';
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    function turnOffGyro() {
      gyroActive = false;
      isCalibrated = false;
      gyroBtn.classList.remove('active');
      gyroBtn.innerHTML = '🧭';
      window.removeEventListener('deviceorientation', handleOrientation, true);
    }

    gyroBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (gyroActive) {
        turnOffGyro();
      } else {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
          DeviceOrientationEvent.requestPermission()
            .then(function(state) { if (state === 'granted') turnOnGyro(); })
            .catch(console.error);
        } else {
          turnOnGyro();
        }
      }
    });
  }
})();
