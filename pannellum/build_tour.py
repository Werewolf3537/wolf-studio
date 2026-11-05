import os
import subprocess
import json

# ================= КОНФИГУРАЦИЯ ПРОЕКТА =================
# Путь к оригинальным сферическим панорамам
INPUT_IMAGES_DIR = "images" 
# Куда складывать нарезанные тайлы
OUTPUT_TILES_DIR = "tiles"      
# Путь к скрипту генератора из pannellum-master
GENERATOR_PATH = os.path.join("multires", "generate.py") 
# Путь к исполняемому файлу Nona (Hugin)
NONA_PATH = r"C:\Program Files\Hugin\bin\nona.exe" 
# ========================================================

# Базовый каркас нашего tour.json с оптимизацией под смартфоны
tour_config = {
    "default": {
        "firstScene": "1",           # Имя вашей стартовой сцены (например, "1")
        "sceneFadeDuration": 1200,   # Оптимальная скорость для мобильных процессоров
        "autoLoad": True,
        "hotSpotDebug": True,        # ВКЛЮЧЕНО: для поиска координат на экране
        "orientationOnByDefault": False, # ОТКЛЮЧЕНО: включим позже по кнопке
        "showControls": False,       # ОТКЛЮЧЕНО: убираем штатные кнопки зума и фуллскрина
        
        # Настройки против "рыбьего глаза" и для снижения нагрузки на смартфонах:
        "hfov": 80,                  # Естественный стартовый зум (приближение)
        "minHfov": 65,               # Лимит приближения
        "maxHfov": 90,               # Лимит отдаления (не дает уйти в рыбий глаз)
        "multiResMinHfov": True,
        "tileCacheLimit": 12         # Выделяем больше памяти смартфона под кэш тайлов
    },
    "scenes": {}
}

# Считываем старые хотспоты, чтобы скрипт их случайно не стёр при повторном запуске
existing_hotspots = {}
if os.path.exists("tour.json"):
    try:
        with open("tour.json", "r", encoding="utf-8") as f:
            old_data = json.load(f)
            for scene_id, scene_data in old_data.get("scenes", {}).items():
                if "hotSpots" in scene_data and len(scene_data["hotSpots"]) > 0:
                    existing_hotspots[scene_id] = scene_data["hotSpots"]
    except Exception:
        print("[!] Не удалось прочитать старый tour.json, создаем с нуля.")

# Создаем папки, если их нет
os.makedirs(INPUT_IMAGES_DIR, exist_ok=True)
os.makedirs(OUTPUT_TILES_DIR, exist_ok=True)

# Ищем все картинки в папке исходников
images = [f for f in os.listdir(INPUT_IMAGES_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

if not images:
    print(f"[-] В папке '{INPUT_IMAGES_DIR}' нет картинок. Положи туда панорамы и запусти скрипт снова.")
    exit()

# Сортируем список картинок, чтобы сцены шли строго по порядку (1, 2, 3...)
images.sort()
print(f"[+] Найдено панорам для обработки: {len(images)}")

# Генерируем список ID всех сцен для вычисления связей "вперед-назад"
scene_ids = [os.path.splitext(img_name)[0] for img_name in images]
total_scenes = len(scene_ids)

# Устанавливаем стартовую сцену автоматически на первую из списка
if total_scenes > 0:
    tour_config["default"]["firstScene"] = scene_ids[0]

for idx, img_name in enumerate(images):
    scene_id = scene_ids[idx]
    img_path = os.path.join(INPUT_IMAGES_DIR, img_name)
    scene_tiles_dir = os.path.join(OUTPUT_TILES_DIR, scene_id)
    
    print(f"\n--- Обработка сцены: {scene_id} ({idx + 1}/{total_scenes}) ---")
    
    # Запускаем оригинальный скрипт генерации тайлов Pannellum
    command = [
        "python", GENERATOR_PATH,
        img_path,
        "-o", scene_tiles_dir,
        "--nona", NONA_PATH
    ]
    
    try:
        subprocess.run(command, check=True)
    except subprocess.CalledProcessError as e:
        print(f"[!] Ошибка при генерации тайлов для {scene_id}: {e}")
        continue
        
    # Читаем config.json, который создал генератор Pannellum внутри папки с тайлами
    gen_config_path = os.path.join(scene_tiles_dir, "config.json")
    if os.path.exists(gen_config_path):
        with open(gen_config_path, "r", encoding="utf-8") as f:
            gen_data = json.load(f)
            
        ext = gen_data["multiRes"]["extension"]
        
        # Если для этой сцены ещё нет сохраненных хотспотов, создаем связи "вперед-назад"
        if scene_id in existing_hotspots:
            current_hotspots = existing_hotspots[scene_id]
        else:
            # Логика определения переходов:
            if idx == 0:
                # Начальная сцена: оба хотспота ведут на следующую сцену
                next_scene = scene_ids[idx + 1] if total_scenes > 1 else scene_id
                target_forward = next_scene
                target_backward = next_scene
            elif idx == total_scenes - 1:
                # Последняя сцена: оба хотспота ведут на предыдущую сцену
                prev_scene = scene_ids[idx - 1]
                target_forward = prev_scene
                target_backward = prev_scene
            else:
                # Промежуточные сцены: первый вперед, второй назад
                target_forward = scene_ids[idx + 1]
                target_backward = scene_ids[idx - 1]
                
            current_hotspots = [
                {
                    "pitch": 0,
                    "yaw": 0,
                    "type": "scene",
                    "text": "Вперед",
                    "sceneId": target_forward,
                    "targetPitch": "same",
                    "targetYaw": "same"
                },
                {
                    "pitch": -30,
                    "yaw": 0,
                    "type": "scene",
                    "text": "Назад",
                    "sceneId": target_backward,
                    "targetPitch": "same",
                    "targetYaw": "same"
                }
            ]
            
        # Формируем структуру сцены для общего tour.json
        tour_config["scenes"][scene_id] = {
            "type": "multires",
            "multiRes": {
                "path": f"{OUTPUT_TILES_DIR}/{scene_id}/%l/%s%y_%x",
                "fallbackPath": f"{OUTPUT_TILES_DIR}/{scene_id}/fallback/%s.{ext}",
                "extension": ext,
                "tileResolution": gen_data["multiRes"]["tileResolution"],
                "maxLevel": gen_data["multiRes"]["maxLevel"],
                "cubeResolution": gen_data["multiRes"]["cubeResolution"]
            },
            "hotSpots": current_hotspots
        }
    else:
        print(f"[!] Не найден config.json для {scene_id}")

# Сохраняем финальный tour.json в корень проекта
with open("tour.json", "w", encoding="utf-8") as f:
    json.dump(tour_config, f, ensure_ascii=False, indent=4)

print("\n[=== СБОРКА ТУРА ЗАВЕРШЕНА ===]")
print("[+] Файл tour.json успешно обновлен.")
