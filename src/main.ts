import { 
    Application, Graphics, Assets, 
    Sprite, Texture, Rectangle, Container, 
    Text, TextStyle} from 'pixi.js';

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

    const scene = new Container();
    app.stage.addChild(scene);

    const sheet = await Assets.load('/public/assets/tarot.png');
    const cardWidth = 71;
    const cardHeight = 95;

    const cards: any = [];
    const totalCards = 144;
    const radius = 200;

    // how wide should the fan be? in radians (e.g. Math.PI*0.6 = ~108° arc)
    const arc = Math.PI * 0.6;

    function shuffleArray(array: number[]): number[] {
        for (let i = array.length - 1; i > 0; i--) {
            // pick a random index from 0 to i
            const j = Math.floor(Math.random() * (i + 1));
            // swap
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function generateCards() {
        const arr1 = [];
        const nSprites = 56;

        for (let i = 0; i < nSprites; ++i) {
            arr1.push(i);
        }

        // 25 - 27 are back cards so just change to other cards (manual)
        arr1[25] = 10;
        arr1[26] = 15;
        arr1[27] = 19;

        const validSpriteIndices = shuffleArray(
            [...arr1, ...arr1, ...arr1].splice(0, totalCards));

        for (let i = 0; i < totalCards; ++i) {
            const rng = validSpriteIndices[i];
            const spriteX = rng % 10;
            const spriteY = Math.floor(rng / 10);

            const frame = new Rectangle(
                spriteX * cardWidth,
                spriteY * cardHeight,
                cardWidth,
                cardHeight
            );

            const cardTexture = new Texture({
                source: sheet.source,
                frame,
            });

            const card = new Sprite(cardTexture);
            cards.push(card);
        }
    }

    function initCards(arc: number, start: number, end: number, isSpreading: boolean = false) {
        const startAngle = -Math.PI / 2 - arc / 2;
        const endAngle   = -Math.PI / 2 + arc / 2;
        const angleStep = (startAngle - endAngle) / (totalCards - 1);

        for (let i = start; i < end; ++i) {
            const card = cards[i];

            card.scale.set(1.0);
            card.anchor.set(0.5, 1.0); 

            const px = app.screen.width / 2;
            const py = app.screen.height * 1.1;

            const theta = startAngle - (isSpreading ? start : i) * angleStep;
            card.position.set(px + Math.cos(theta) * radius, py + Math.sin(theta) * radius);
            card.rotation = theta + Math.PI / 2;

            scene.addChild(card);
        }
    }

    // simple linear interpolation
    function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

  

    // card initializations
    generateCards();
    initCards(arc, 0, totalCards);

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

    // animation variables
    let currCard = 0;

    const ARC_MIN = 0.06;
    let currArc = 0.6;

    const DURATION = 2000;             // ms
    let   elapsed  = 0;

    const fromPos: any = [];

    let to = {
        x:   window.innerWidth  / 2,     
        y:   window.innerHeight * 0.2,
        rot: 180 * Math.PI / 180,
    };

    app.ticker.add((delta) => {
        if (currCard < totalCards && currArc > ARC_MIN) {
            initCards(arc, ++currCard, totalCards, true);
        } else {
            if (currArc > ARC_MIN) {
                currArc = Math.max(currArc - 0.01 * delta.deltaTime, ARC_MIN);

                initCards(Math.PI * currArc, 0, totalCards);
                
                // assing final position of cards 
                // (prep for interpolation distribution)
                if (currArc == ARC_MIN) {
                    for (let i = 0; i < totalCards; ++i) {
                        fromPos[i] = { 
                            x: cards[i].x, 
                            y: cards[i].y,
                            rot: cards[i].rotation
                        };
                    }
                }
            } else {
                const c = cards[currCard - 1];
                const from = fromPos[currCard - 1];

                elapsed += delta.deltaMS;
                let t = Math.min(elapsed / DURATION, 1);

                let adj = 0.1 * (totalCards - currCard)
                c.y = lerp(from.y,   to.y,   t);
                c.rotation = lerp(from.rot, ((180 + adj) * Math.PI / 180) - from.rot, t);

                if (t === 1) {
                    scene.setChildIndex(c, totalCards - currCard);
                    --currCard;
                    elapsed = 0;
                    
                    initCards(Math.PI * currArc, 0, currCard);

                    /** 
                     * just somoe manual adjustment so at the end both stacks
                     * have cards.
                     * */  
                    if (currCard < 10) {
                        app.ticker.stop();
                    }
                }
            }
        }

        fpsDiv.textContent = `FPS: ${app.ticker.FPS.toFixed(1)}`;
    });
})();
