import {
  Application,
  Container,
  Graphics,
  Assets,
  Sprite,
  Texture,
  Loader,
  Text,
  TextStyle,
  Ticker 
} from 'pixi.js';

/**
 * Runs the card spread animation inside an existing Pixi `app` and `scene`.
 * @param scene The Container to populate with card sprites
 * @param app   The Pixi Application instance
 */
export async function startMagicWords(
    scene: Container, 
    app: Application, 
    onBack: () => void): Promise<void> {
    // clear any previous content
    scene.removeChildren();
    
    const ticker = new Ticker();
    const avatarDisplay: any = [];

    const back = new Text("← Back", new TextStyle({
      fill: "#ffffff",
      fontSize: 18,
      fontWeight: "bold",
    }));
    back.interactive  = true;
    back.cursor = 'pointer';        // replaced buttonMode
    back.eventMode = 'static';      // enable pointer events
    back.position.set(16, 16);
    back.zIndex = 1000;
    back.on("pointerdown", () => {
      // stop the spread animation ticker
    //   app.ticker.remove(tickerCallback);
      ticker.stop();
      ticker.destroy();
      // clear the scene
      container.removeChildren();
      
      scene.removeChildren();
      fpsDiv.remove();

      onBack();
    });
    scene.addChild(back);

    // 2) Fetch your JSON
    const { dialogue, emojies, avatars } = await fetch(
        'https://private-624120-softgamesassignment.apiary-mock.com/v2/magicwords'
    ).then(r => r.json());

    const emojis = [];
    for (const { name, url } of emojies) {
        emojis.push({ name, url });
    }
    // helper to load one image URL into a PIXI.Texture
    function loadTexture(name: string, url: string) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
        resolve([ name, Texture.from(img) ]);
        };
        img.onerror = reject;
        img.src = url;
    });
    }

    async function loadAllTextures(list: any) {
        // list = [{ name: 'Sheldon', url: '…' }, …]
        const entries = await Promise.all(
            list.map(({ name, url }) => loadTexture(name, url))
        );
        // turn [ [name, texture], […] ] into { name: texture, … }
        return Object.fromEntries(entries);
    }

    avatars.push({
            "name": "Neighbour",
        "url": "/public/assets/takopi.jpg",
        "position": "right"
    })

    // usage
    const emojisTex = await loadAllTextures(emojies);
    const avatarTex = await loadAllTextures(avatars);

    // initialize FPS for display
    const fpsDiv = document.createElement('div');
    Object.assign(fpsDiv.style, {
        position:   'absolute',
        top:        '0px',
        left:       '0px',
        padding:    '4px 8px',
        color:      '#ffffff',
        font:       '14px monospace',
        background: 'rgba(0,0,0,0.5)',
        pointerEvents: 'none',
        zIndex:     '9999',
    });
    document.body.appendChild(fpsDiv);

    const container = new Container();
    app.stage.addChild(container);
    const style2 = new TextStyle({ fontFamily: 'Arial', fontSize: 11, fill: '#ffffff' });
    let prevH = 0;
    const Avatar_Index = {
        Sheldon: 0,
        Penny: 1,
        Leonard: 2,
        Neighbour: 3,
    }

    let overflow = false;


    function layoutLine(text: string, style: TextStyle, maxTextWidth: number, lineHeight: number) {
        // 1) split into words & emoji placeholders
        const tokens = text.split(/(\{[^}]+\})/g).filter(t => t !== '');
        
        // 2) measure each token
        const measurements = tokens.map(tok => {
            // emoji placeholders we’ll render as 48px
            if (/^\{[^}]+\}$/.test(tok)) {
                return { token: tok, width: 48, height: 48, isEmoji: true };
            } else {
                const meas = new Text(tok, style);
                const w = Math.min(meas.width, maxTextWidth);
                const h = meas.height;
                meas.destroy();
                return { token: tok, width: w, height: h, isEmoji: false };
            }
        });

        // 3) walk tokens and break lines
        const layouts: { token: string; x: number; y: number; width: number; isEmoji: boolean }[] = [];
        let cursorX = 0;
        let cursorY = 0;
        let maxLineWidth = 0;

        for (const m of measurements) {
            // if this token would overflow, wrap
            if (cursorX + m.width > maxTextWidth) {
                cursorX = 0;
                cursorY += lineHeight;
            }
            layouts.push({
                token:  m.token,
                x:      cursorX,
                y:      cursorY,
                width:  m.width,
                isEmoji: m.isEmoji
            });
            cursorX += m.width;
            maxLineWidth = Math.max(maxLineWidth, cursorX);
        }

        const totalHeight = cursorY + lineHeight;
        return { layouts, totalWidth: maxLineWidth, totalHeight };
    }

    function showLine(i: number) {
        // container.removeChildren();
        const idx = Avatar_Index[dialogue[i].name];

        // 1) scale factor & margins
        const baseWidth = 1024;
        const scale     = Math.max(0.5, (app.screen.width / baseWidth));
        const marginX   = 20 * scale;
        // 2) text style with wrapping
        const maxTextWidth = app.screen.width - marginX * 2;
        const style = new TextStyle({
            fontFamily: 'Arial',
            fontSize: Math.round(20 * scale),
            fill: '#ffffff',
            wordWrap: true,
            wordWrapWidth: maxTextWidth,
        });
        const lineHeight   = Math.round(style.fontSize * 2.2);

        const { layouts, totalWidth, totalHeight } =
        layoutLine(dialogue[i].text, style, maxTextWidth, lineHeight);

        // 2) compute bubble dims & draw
        const padding = 12 * scale;
        let x0 = avatars[idx].position == 'right' ? app.screen.width - (totalWidth + padding*2 + 64 * scale) : marginX - padding;
        // const y0 = totalHeight - padding*2 - marginX;
        const y0 = app.screen.height - totalHeight - padding*2 - marginX;
        // const adjY = totalHeight * 4 * i;
        
        if (y0 - prevH < 100) overflow = true;
        
        const spr = new Sprite(avatarTex[avatars[idx].name]);
        spr.x = avatars[idx].position == 'right' ? app.screen.width - 64 * scale: x0;
        spr.y = y0 - prevH;
        spr.width = 64 * scale;
        spr.height = 64 * scale;
        // app.stage.addChild(spr);
        container.addChild(spr);
        // avatarDisplay.push(spr);

        const meas = new Text(avatars[idx].name, style);
        const w = Math.min(meas.width, maxTextWidth);
        meas.destroy();
        
        
        const avatarTxt = new Text(avatars[idx].name, style2);

        const textWidth  = avatarTxt.width;
        const spriteMidX = spr.x + spr.width / 2;


        avatarTxt.x = spriteMidX - textWidth / 2;
        avatarTxt.y = spr.y + spr.height + 5;
        container.addChild(avatarTxt);
        
        const adjX = 70 * scale * (avatars[idx].position == 'right' ? -0.1 : 1);

        const bubble = new Graphics()
        .beginFill(0x000000, 0.6)
        .lineStyle(2 * scale, 0xffffff, 0.8)
        .drawRoundedRect(
            x0 + adjX, y0 - prevH,
            totalWidth + padding*2,
            totalHeight + padding*2,
            12 * scale
        )
        .endFill();
        container.addChild(bubble);

        // 3) render tokens
        for (const item of layouts) {
            const drawX = avatars[idx].position == 'right' ? x0 + (marginX + item.x + adjX) : marginX + item.x + adjX;
            const drawY = y0 + padding + item.y - prevH;
            if (item.isEmoji) {
                // pull your sprite from cache
                const key   = item.token.slice(1, -1);            // "{smile}" → "smile"
                const tex   = emojisTex[key];
                const spr   = new Sprite(tex);
                spr.width   = spr.height = 32;
                spr.x       = drawX + 8;
                spr.y       = drawY - (32 - lineHeight) / 2 - 8;        // center in the line
                container.addChild(spr);
            } else {
                const txt = new Text(item.token, style);
                txt.x     = drawX;
                txt.y     = drawY;
                container.addChild(txt);
            }
        }
        prevH += totalHeight + padding*2 + marginX;
    }

    let elapsed = 0;
    let currIdx = 0;

    ticker.add(function(this: Ticker, delta) {
        elapsed += delta.deltaMS;

        if (elapsed >= 2000 && currIdx < dialogue.length) {
            showLine(currIdx);
            currIdx++;
            if (overflow) {
                overflow = false;
                prevH = 0;
                container.removeChildren();
            }
            elapsed = 0;
        }

        fpsDiv.textContent = `FPS: ${app.ticker.FPS.toFixed(1)}`;
    });

    
    
    ticker.start();

}