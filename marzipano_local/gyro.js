// gyro.js

(function() {
  let isGyroActive = false;
  let firstFrameCaptured = false;
  
  // Базовые углы для калибровки «первого кадра»
  let baseAlpha = 0;
  let baseBeta = 0;

  // Текущие смещения, которые мы будем отдавать в Marzipano
  let currentYaw = 0;
  let currentPitch = 0;

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

  // 2. Создаем кастомный метод управления для Marzipano
  // Это позволит гироскопу работать плавно и параллельно с тач-скрином
  function GyroControlMethod() {
    this._v = { yaw: 0, pitch: 0 };
  }
  
  GyroControlMethod.prototype.createControlParameters = function(parameters) {
    // Регистрируем параметры, которыми хотим управлять
    parameters.register('yaw', 'relative', new Marzipano.ParameterDynamics());
    parameters.register('pitch', 'relative', new Marzipano.ParameterDynamics());
  };

  GyroControlMethod.prototype.getControlValues = function(values) {
    // Отдаем изменения и сразу сбрасываем, так как тип управления 'relative' (относительный)
    values.yaw = this._v.yaw;
    values.pitch = this._v.pitch;
    this._v.yaw = 0;
    this._v.pitch = 0;
  };

  // Создаем инстанс нашего метода управления
  const gyroControlMethod = new GyroControlMethod();

  // 3. Функция обработки датчика
  function handleOrientation(event) {
    if (!isGyroActive) return;
    if (event.alpha === null || event.beta === null) return;

    // Фиксируем положение телефона в самый первый момент включения
    if (!firstFrameCaptured) {
      baseAlpha = event.alpha;
      baseBeta = event.beta;
      firstFrameCaptured = true;
      return; 
    }

    // Вычисляем разницу между стартовым и текущим положением
    let deltaAlpha = event.alpha - baseAlpha;
    let deltaBeta = event.beta - baseBeta;

    // Корректируем прокрутку через 360 градусов
    if (deltaAlpha > 180) deltaAlpha -= 360;
    if (deltaAlpha < -180) deltaAlpha += 360;

    // Переводим градусы в радианы
    let targetYaw = (deltaAlpha * Math.PI) / 180;
    let targetPitch = (deltaBeta * Math.PI) / 180;

    // Вычисляем относительное изменение (шаг) для текущего кадра
    gyroControlMethod._v.yaw = targetYaw - currentYaw;
    gyroControlMethod._v.pitch = targetPitch - currentPitch;

    // Запоминаем текущую позицию для следующего шага
    currentYaw = targetYaw;
    currentPitch = targetPitch;
  }

  // 4. Функция интеграции с Marzipano без глобальных переменных
  function attachGyroToMarzipano() {
    // Ищем контейнер тура. В стандартных шаблонах Marzipano это элемент с id="pano"
    const panoEl = document.getElementById('pano') || document.querySelector('.pano');
    
    if (!panoEl) {
      console.error('Контейнер Marzipano не найден. Убедитесь, что id="pano" существует.');
      return false;
    }

    // Хак: ищем внутреннее свойство Marzipano, которое вешается на DOM-элемент при инициализации
    // Обычно Marzipano сохраняет инстанс плеера или данные внутри элемента
    // Если его нет, мы попробуем перехватить управление через дефолтный реестр
    try {
      // Инициализируем метод в системе управления Marzipano
      const controls = window.viewer ? window.viewer.controls() : null;
      
      if (controls) {
        controls.addMethod('gyro', gyroControlMethod);
        return true;
      } else {
        // Если инициализация gyro.js произошла раньше, чем создался viewer,
        // перехватываем конструктор плеера один раз
        const originalViewer = Marzipano.Viewer;
        Marzipano.Viewer = function(...args) {
          const instance = new originalViewer(...args);
          instance.controls().addMethod('gyro', gyroControlMethod);
          window.__marzipanoGyroAttached = true;
          return instance;
        };
        return true;
      }
    } catch (e) {
      console.error('Не удалось привязать гироскоп к Marzipano:', e);
      return false;
    }
  }

  // 5. Переключение состояния (Старт/Стоп)
  function toggleGyroState() {
    isGyroActive = !isGyroActive;
    
    if (isGyroActive) {
      firstFrameCaptured = false;
      currentYaw = 0;
      currentPitch = 0;
      
      // Пытаемся подключиться к плееру
      attachGyroToMarzipano();

      window.addEventListener('deviceorientation', handleOrientation, true);
      gyroBtn.innerHTML = '🛑 Выключить гироскоп';
      gyroBtn.style.backgroundColor = 'rgba(220, 53, 69, 0.8)';
    } else {
      window.removeEventListener('deviceorientation', handleOrientation, true);
      gyroBtn.innerHTML = '🧭 Включить гироскоп';
      gyroBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    }
  }

  // 6. Запрос разрешений для iOS 13+ и запуск
  function enableGyroscope() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(permissionState => {
          if (permissionState === 'granted') {
            toggleGyroState();
          } else {
            alert('Доступ к гироскопу отклонен браузером.');
          }
        })
        .catch(console.error);
    } else {
      toggleGyroState();
    }
  }

  // Запуск при клике
  gyroBtn.addEventListener('click', enableGyroscope);
})();
