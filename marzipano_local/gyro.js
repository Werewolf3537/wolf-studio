// gyro.js

(function() {
  let isGyroActive = false;
  let firstFrameCaptured = false;
  
  // Базовые углы для калибровки «первого кадра»
  let baseAlpha = 0;
  let baseBeta = 0;

  // Начальный взгляд камеры перед включением гироскопа
  let startYaw = 0;
  let startPitch = 0;

  let viewerInstance = null;

  // 1. Создаем кнопку на экране
  const gyroBtn = document.createElement('button');
  gyroBtn.innerHTML = '🧭 Включить гироскоп';
  gyroBtn.style.position = 'absolute';
  gyroBtn.style.bottom = '20px';
  gyroBtn.style.left = '50%';
  gyroBtn.style.transform = 'translateX(-50%)';
  gyroBtn.style.zIndex = '1000';
  gyroBtn.style.padding = '10px 20px';
  gyroBtn.style.fontSize = '16px';
  gyroBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  gyroBtn.style.color = '#fff';
  gyroBtn.style.border = 'none';
  gyroBtn.style.borderRadius = '5px';
  gyroBtn.style.cursor = 'pointer';
  gyroBtn.style.webkitUserSelect = 'none';
  gyroBtn.style.userSelect = 'none';
  document.body.appendChild(gyroBtn);

  // 2. Функция поиска инстанса Marzipano Viewer
  function getViewer() {
    if (window.viewer) return window.viewer;
    if (viewerInstance) return viewerInstance;
    return null;
  }

  // Перехватываем создание Viewer, если gyro.js загрузился раньше основного скрипта
  if (typeof Marzipano !== 'undefined' && Marzipano.Viewer) {
    const originalViewer = Marzipano.Viewer;
    Marzipano.Viewer = function(...args) {
      const instance = new originalViewer(...args);
      viewerInstance = instance;
      return instance;
    };
  }

  // 3. Функция обработки датчика
  function handleOrientation(event) {
    if (!isGyroActive) return;
    if (event.alpha === null || event.beta === null) return;

    const viewer = getViewer();
    if (!viewer) return;

    const view = viewer.view();
    if (!view) return;

    // Фиксируем положение телефона и камеры в самый первый момент включения
    if (!firstFrameCaptured) {
      baseAlpha = event.alpha;
      baseBeta = event.beta;
      
      // Запоминаем, куда смотрела камера ДО включения гироскопа
      startYaw = view.yaw();
      startPitch = view.pitch();
      
      firstFrameCaptured = true;
      return; 
    }

    // Вычисляем разницу (смещение) относительно стартовой точки телефона
    let deltaAlpha = event.alpha - baseAlpha;
    let deltaBeta = event.beta - baseBeta;

    // Корректируем прокрутку через 360 градусов для горизонтальной оси
    if (deltaAlpha > 180) deltaAlpha -= 360;
    if (deltaAlpha < -180) deltaAlpha += 360;

    // Переводим смещение из градусов в радианы
    // Для alpha инвертируем знак (-), чтобы поворот телефона совпадал с поворотом камеры
    let diffYaw = -(deltaAlpha * Math.PI) / 180;
    let diffPitch = (deltaBeta * Math.PI) / 180;

    // Складываем начальный взгляд камеры и смещение гироскопа
    let targetYaw = startYaw + diffYaw;
    let targetPitch = startPitch + diffPitch;

    // Мягко обновляем координаты в Marzipano
    view.setParameters({
      yaw: targetYaw,
      pitch: targetPitch
    });
  }

  // 4. Переключение состояния (Старт/Стоп)
  function toggleGyroState() {
    const viewer = getViewer();
    if (!viewer) {
      alert('Ошибка: Тур Marzipano еще не загрузился. Подождите секунду.');
      return;
    }

    isGyroActive = !isGyroActive;
    
    if (isGyroActive) {
      firstFrameCaptured = false;
      
      // Отключаем стандартный контроль (мышку/тач), чтобы они не конфликтовали с гироскопом
      viewer.controls().disable();

      window.addEventListener('deviceorientation', handleOrientation, true);
      gyroBtn.innerHTML = '🛑 Выключить гироскоп';
      gyroBtn.style.backgroundColor = 'rgba(220, 53, 69, 0.8)';
    } else {
      window.removeEventListener('deviceorientation', handleOrientation, true);
      
      // Возвращаем мышку и тач обратно при выключении
      viewer.controls().enable();

      gyroBtn.innerHTML = '🧭 Включить гироскоп';
      gyroBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    }
  }

  // 5. Запрос разрешений для мобильных устройств
  function enableGyroscope() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(permissionState => {
          if (permissionState === 'granted') {
            toggleGyroState();
          } else {
            alert('Доступ к гироскопу отклонен вашим браузером.');
          }
        })
        .catch(err => {
          console.error(err);
          alert('Ошибка запроса гироскопа: ' + err);
        });
    } else {
      toggleGyroState();
    }
  }

  // Запуск при клике
  gyroBtn.addEventListener('click', enableGyroscope);
})();
