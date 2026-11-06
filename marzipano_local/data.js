var APP_DATA = {
  "scenes": [
    {
      "id": "scene_0",
      "name": "Bath",
      "mapCoords": {
        "left": "50%",
        "top": "50%"
      },
      "levels": [
        {
          "tileSize": 256,
          "size": 256,
          "fallbackOnly": true
        },
        {
          "tileSize": 512,
          "size": 512
        },
        {
          "tileSize": 512,
          "size": 1024
        },
        {
          "tileSize": 512,
          "size": 2048
        }
      ],
      "faceSize": 2048,
      "initialViewParameters": {
        "yaw": 0.0,
        "pitch": 0.0,
        "fov": 1.2
      },
      "linkHotspots": [
        {
          "yaw": 0.0,
          "pitch": 0.0,
          "rotation": 0,
          "target": "scene_1"
        }
      ],
      "infoHotspots": []
    },
    {
      "id": "scene_1",
      "name": "Bedroom", 
      "mapCoords": {
        "left": "50%",
        "top": "50%"
      },
      "levels": [
        {
          "tileSize": 256,
          "size": 256,
          "fallbackOnly": true
        },
        {
          "tileSize": 512,
          "size": 512
        },
        {
          "tileSize": 512,
          "size": 1024
        },
        {
          "tileSize": 512,
          "size": 2048
        }
      ],
      "faceSize": 2048,
      "initialViewParameters": {
        "yaw": 0.0,
        "pitch": 0.0,
        "fov": 1.2
      },
      "linkHotspots": [
        {
          "yaw": -0.5236,
          "pitch": 0.0,
          "rotation": 0,
          "target": "scene_0"
        },
        {
          "yaw": 0.0,
          "pitch": 0.0,
          "rotation": 0,
          "target": "scene_2"
        }
      ],
      "infoHotspots": []
    },
    {
      "id": "scene_2",
      "name": "Hallway_1",
      "mapCoords": {
        "left": "50%",
        "top": "50%"
      },
      "levels": [
        {
          "tileSize": 256,
          "size": 256,
          "fallbackOnly": true
        },
        {
          "tileSize": 512,
          "size": 512
        },
        {
          "tileSize": 512,
          "size": 1024
        },
        {
          "tileSize": 512,
          "size": 2048
        }
      ],
      "faceSize": 2048,
      "initialViewParameters": {
        "yaw": 0.0,
        "pitch": 0.0,
        "fov": 1.2
      },
      "linkHotspots": [
        {
          "yaw": -0.5236,
          "pitch": 0.0,
          "rotation": 0,
          "target": "scene_1"
        },
        {
          "yaw": 0.0,
          "pitch": 0.0,
          "rotation": 0,
          "target": "scene_3"
        }
      ],
      "infoHotspots": []
    },
    {
      "id": "scene_3",
      "name": "Hallway_2",
      "mapCoords": {
        "left": "50%",
        "top": "50%"
      },
      "levels": [
        {
          "tileSize": 256,
          "size": 256,
          "fallbackOnly": true
        },
        {
          "tileSize": 512,
          "size": 512
        },
        {
          "tileSize": 512,
          "size": 1024
        },
        {
          "tileSize": 512,
          "size": 2048
        }
      ],
      "faceSize": 2048,
      "initialViewParameters": {
        "yaw": 0.0,
        "pitch": 0.0,
        "fov": 1.2
      },
      "linkHotspots": [
        {
          "yaw": -0.5236,
          "pitch": 0.0,
          "rotation": 0,
          "target": "scene_2"
        },
        {
          "yaw": 0.0,
          "pitch": 0.0,
          "rotation": 0,
          "target": "scene_4"
        }
      ],
      "infoHotspots": []
    },
    {
      "id": "scene_4",
      "name": "Kitchen",
      "mapCoords": {
        "left": "50%",
        "top": "50%"
      },
      "levels": [
        {
          "tileSize": 256,
          "size": 256,
          "fallbackOnly": true
        },
        {
          "tileSize": 512,
          "size": 512
        },
        {
          "tileSize": 512,
          "size": 1024
        },
        {
          "tileSize": 512,
          "size": 2048
        }
      ],
      "faceSize": 2048,
      "initialViewParameters": {
        "yaw": 0.0,
        "pitch": 0.0,
        "fov": 1.2
      },
      "linkHotspots": [
        {
          "yaw": -0.5236,
          "pitch": 0.0,
          "rotation": 0,
          "target": "scene_3"
        },
        {
          "yaw": 0.0,
          "pitch": 0.0,
          "rotation": 0,
          "target": "scene_5"
        }
      ],
      "infoHotspots": []
    },
    {
      "id": "scene_5",
      "name": "Living",
      "mapCoords": {
        "left": "50%",
        "top": "50%"
      },
      "levels": [
        {
          "tileSize": 256,
          "size": 256,
          "fallbackOnly": true
        },
        {
          "tileSize": 512,
          "size": 512
        },
        {
          "tileSize": 512,
          "size": 1024
        },
        {
          "tileSize": 512,
          "size": 2048
        }
      ],
      "faceSize": 2048,
      "initialViewParameters": {
        "yaw": 0.0,
        "pitch": 0.0,
        "fov": 1.2
      },
      "linkHotspots": [
        {
          "yaw": -0.5236,
          "pitch": 0.0,
          "rotation": 0,
          "target": "scene_4"
        }
      ],
      "infoHotspots": []
    }
  ],
  "settings": {
    "mouseViewMode": "drag",
    "autorotateEnabled": false
  }
};