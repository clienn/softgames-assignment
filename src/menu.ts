import {
  Application,
  Container,
  Graphics,
  Text,
  TextStyle,
} from 'pixi.js';

import { startCardSpread } from './aceOfShadows';
import { startPhoenixFlame } from './phoenixFlame';
import { startMagicWords } from './magicWords';

(async () => {
    const app = new Application();
    await app.init({
        backgroundColor: 0x222222,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
        resizeTo: window,
    });

    document.body.appendChild(app.canvas);

// 2) Button factory
function createButton(
  label: string,
  x: number,
  y: number,
  onClick: () => void
): Container {
  const btn = new Container();
  btn.x = x;
  btn.y = y;
  btn.interactive = true;
  btn.cursor = 'pointer';        // replaced buttonMode
  btn.eventMode = 'static';      // enable pointer events

  const bg = new Graphics()
    .beginFill(0x444444)
    .drawRoundedRect(-10, -5, 200, 40, 5)
    .endFill();
  btn.addChild(bg);

  const text = new Text(label, new TextStyle({
    fontFamily: 'Arial',
    fontSize: 18,
    fill: 0xffffff,
  }));
  text.x = 10;
  text.y = 5;
  btn.addChild(text);

  btn.on('pointertap', onClick);
  return btn;
}

// 3) Create scenes
const menuScene = new Container();
const aceScene = new Container();
const magicScene = new Container();
const phoenixScene = new Container();
app.stage.addChild(menuScene, aceScene, magicScene, phoenixScene);

// 4) Scene-switcher helper
enum SceneKey {
  Menu,
  Ace,
  Magic,
  Phoenix,
}

async function showScene(key: SceneKey) {
  // hide all scenes
  [menuScene, aceScene, magicScene, phoenixScene].forEach(s => s.visible = false);

  switch (key) {
    case SceneKey.Menu:
      menuScene.visible = true;
      aceScene.visible = false;
      phoenixScene.visible = false;
      
      break;

    case SceneKey.Ace:
      aceScene.removeChildren();      // clear previous
      aceScene.visible = true;
    //   app.renderer.background = '0x222222';
    //   await startCardSpread(aceScene, app);  // run your card spread scene
      await startCardSpread(
        aceScene,
        app,
        () => showScene(SceneKey.Menu)
      );
      break;

    case SceneKey.Magic:
      magicScene.removeChildren();
      magicScene.visible = true;

      await startMagicWords(
        magicScene,
        app,
        () => showScene(SceneKey.Menu)
      );
      // TODO: call startMagicWords(magicScene, app);
      break;

    case SceneKey.Phoenix:
      phoenixScene.removeChildren();      // clear previous
      phoenixScene.visible = true;
    //   await startCardSpread(aceScene, app);  // run your card spread scene
      await startPhoenixFlame(
        phoenixScene,
        app,
        () => showScene(SceneKey.Menu)
      );
      // TODO: call startPhoenixFlame(phoenixScene, app);
      break;
  }
}
// 5) Build menu
menuScene.addChild(
  createButton('Ace of Shadows', 100, 100, () => showScene(SceneKey.Ace)),
  createButton('Magic Words', 100, 160, () => showScene(SceneKey.Magic)),
  createButton('Phoenix Flame', 100, 220, () => showScene(SceneKey.Phoenix))
);

// 6) Build game scenes
const sceneConfigs: Array<[Container, string, SceneKey]> = [
  [aceScene, 'Ace of Shadows Game…', SceneKey.Ace],
  [magicScene, 'Magic Words Game…', SceneKey.Magic],
  [phoenixScene, 'Phoenix Flame Game…', SceneKey.Phoenix],
];

sceneConfigs.forEach(([scene, placeholder, key]) => {
  // placeholder label
  const label = new Text(placeholder, new TextStyle({
    fontFamily: 'Arial',
    fontSize: 24,
    fill: 0xffcc00,
  }));
  label.anchor.set(0.5);
  label.position.set(app.screen.width / 2, app.screen.height / 2);
  scene.addChild(label);

  // back button
  scene.addChild(
    createButton('← Back', 20, 20, () => showScene(SceneKey.Menu))
  );
});

// 7) Start on menu
showScene(SceneKey.Menu);
})();
