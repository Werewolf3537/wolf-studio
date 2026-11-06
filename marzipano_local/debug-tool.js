// ==========================================================
// НАТИВНЫЙ ИНСТРУМЕНТ ОТЛАДКИ И ГИРОСКОПА С АВТОКАЛИБРОВКОЙ
// ==========================================================
var DEBUG_MODE = false; // true - прицел и снятие координат по клику на ПК
var ENABLE_GYRO = true; // true - активировать нативный гироскоп для смартфонов

(function() {
  if (!DEBUG_MODE && !ENABLE_GYRO) return;

  window.addEventListener('load', function() {
    var panoContainer = document.querySelector('#pano') || document.querySelector('#panoList') || document.querySelector('.pano');
    if (!panoContainer) return;

    // 1. Создаем прицел на ПК (только в режиме дебага)
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

    // 2. Ждем инициализации Marzipano Viewer
    var checkViewerInterval = setInterval(function() {
      var activeViewer = window.viewer || panoContainer.__marzipanoViewer;
      if (activeViewer) {
        clearInterval(checkViewerInterval);
        
        if (DEBUG_MODE) initDebugClickListener(activeViewer);
        if (ENABLE_GYRO) initNativeMarzipanoGyro(activeViewer, panoContainer);
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
          "\nPitch: " + yawDegrees.toFixed(2) + "°, Yaw: " + pitchDegrees.toFixed(2) + "°" +
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

  // Нативный метод интеграции гироскопа с автоматическим подхватом углов
  function initNativeMarzipanoGyro(marzipanoViewer, container) {
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

    function CustomGyroControlMethod() {
      this._active = false;
      this._calibrated = false;
      this._handler = this._handleOrientation.bind(this);
      
      // Смещения осей (калибровка)
      this._offsetX = 0;
      this._offsetY = 0;
    }

    CustomGyroControlMethod.prototype.init = function(callback) {
      this._callback = callback;
    };

    CustomGyroControlMethod.prototype._handleOrientation = function(event) {
      if (!this._active) return;
      
      var alpha = event.alpha; // Компас (0 - 360)
      var beta = event.beta;   // Наклон вперед/назад (-180 - 180)
      var gamma = event.gamma; // Наклон влево/вправо (-90 - 90)
      
      if (alpha === null || beta === null || gamma === null) return;

      var view = marzipanoViewer.view();
      if (!view) return;

      // Текущая ориентация экрана (портрет или ландшафт)
      var screenOrientation = window.orientation || 0;

      // Переводим текущие физические углы смартфона в радианы
      var currentX = beta * Math.PI / 180;
      var currentY = 0;

      if (screenOrientation === 90) {
        currentY = -beta * Math.PI / 180;
        currentX = -gamma * Math.PI / 180;
      } else if (screenOrientation === -90) {
        currentY = beta * Math.PI / 180;
        currentX = gamma * Math.PI / 180;
      } else {
        currentY = -gamma * Math.PI / 180;
        currentX = -beta * Math.PI / 180;
      }

      // ИСПРАВЛЕНИЕ: Автоматическая калибровка в самый первый кадр получения данных датчика
      if (!this._calibrated) {
        this._offsetX = view.pitch() - currentX;
        this._offsetY = view.yaw() - currentY;
        this._calibrated = true;
        return;
      }

      // Вычисляем целевые относительные координаты взгляда на основе калибровки
      var targetPitch = currentX + this._offsetX;
      var targetYaw = currentY + this._offsetY;

      // Ограничиваем вертикальный взгляд (pitch), чтобы камеру не выворачивало наизнанку на полюсах куба
      targetPitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, targetPitch));

      // Вычисляем необходимый импульс скорости для плавного движения в ядре Marzipano
      var pitchVelocity = (targetPitch - view.pitch()) * 0.25;
      var yawVelocity = (targetYaw - view.yaw()) * 0.25;

      this._callback(null, { yaw: yawVelocity, pitch: pitchVelocity });
    };

    CustomGyroControlMethod.prototype.enable = function() {
      this._active = true;
      this._calibrated = false; // Принудительно сбрасываем калибровку для нового подхвата по клику
      window.addEventListener('deviceorientation', this._handler, true);
    };

    CustomGyroControlMethod.prototype.disable = function() {
      this._active = false;
      this._calibrated = false;
      window.removeEventListener('deviceorientation', this._handler, true);
    };

    var controls = marzipanoViewer.controls();
    var gyroMethod = new CustomGyroControlMethod();
    controls.registerMethod('deviceOrientation', gyroMethod);

    var gyroEnabled = false;

    function toggleGyro() {
      if (gyroEnabled) {
        controls.disableMethod('deviceOrientation');
        gyroBtn.classList.remove('active');
        gyroBtn.innerHTML = '🧭';
        gyroEnabled = false;
      } else {
        // Перед включением фиксируем текущее положение панорамы
        gyroMethod._calibrated = false; 
        controls.enableMethod('deviceOrientation');
        gyroBtn.classList.add('active');
        gyroBtn.innerHTML = '📱';
        gyroEnabled = true;
      }
    }

    gyroBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
          .then(function(state) { if (state === 'granted') toggleGyro(); })
          .catch(console.error);
      } else {
        toggleGyro();
      }
    });
  }
})();
