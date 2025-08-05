import { Application, Sprite, Texture, Assets, Container, TextStyle, Text } from 'pixi.js';
import { Filter, GlProgram, Ticker } from 'pixi.js';

export async function startPhoenixFlame(
    scene: Container, 
    app: Application, 
    onBack: () => void): Promise<void> {

    scene.removeChildren();
    
    const noiseTexture = await Assets.load('/public/assets/noise.png');
    const ticker = new Ticker();
    
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
        ticker.stop();
        ticker.destroy();

        // clear the scene
        scene.removeChildren();
        fpsDiv.remove();
        app.renderer.clear();
        app.stage.removeChild(noiseSprite);

        onBack();
        // go back to menu
    //   startMenuScene(scene, app);
    });
    scene.addChild(back);

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

    // Load noise texture for iChannel1

    const noiseSprite = new Sprite(noiseTexture);
    noiseSprite.width = app.screen.width;
    noiseSprite.height = app.screen.height;
    app.stage.addChild(noiseSprite);

    // Vertex shader (Pixi-compatible)
    const vertex = `
        in vec2 aPosition;
        out vec2 vTextureCoord;

        uniform vec4 uInputSize;
        uniform vec4 uOutputFrame;
        uniform vec4 uOutputTexture;

        vec4 filterVertexPosition(void) {
            vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
            position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
            position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
            return vec4(position, 0.0, 1.0);
        }

        vec2 filterTextureCoord(void) {
            return aPosition * (uOutputFrame.zw * uInputSize.zw);
        }

        void main(void) {
            gl_Position = filterVertexPosition();
            vTextureCoord = filterTextureCoord();
        }
    `;

    // Fragment shader (converted to WebGL1-style)
    const fragment = `
        precision mediump float;

        uniform float uTime;
        uniform vec2 uResolution;
        uniform sampler2D uNoise;
        varying vec2 vTextureCoord;

        mat2 rotz(float angle) {
            float s = sin(angle);
            float c = cos(angle);
            return mat2(c, -s, s, c);
        }

        float rand(vec2 co) {
            return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
        }

        // --- Value-noise hash + interpolation ---
        float hash(vec2 p) {
            // a pseudo-random value in [0,1)
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise2D(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            // corner hashes
            float a = hash(i + vec2(0.0,0.0));
            float b = hash(i + vec2(1.0,0.0));
            float c = hash(i + vec2(0.0,1.0));
            float d = hash(i + vec2(1.0,1.0));
            // smooth interpolation curve
            vec2 u = f * f * (3.0 - 2.0 * f);
            // bilinear blend
            return mix(mix(a, b, u.x),
                    mix(c, d, u.x),
                    u.y);
        }

        float whiteNoise(vec2 st) {
            // make sure we sample at integer coordinates so each pixel is unique
            vec2 ipos = floor(st);
            // a well-known dot-sin fract hash
            return fract(sin(dot(ipos, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        // --- Fractal Brownian Motion ---
        float fbm(vec2 uv) {
            // octave 0: weight 0.5
            float n = (noise2D(uv) - 0.5) * 0.5;

            // octave 1: weight 0.5 * 0.5 = 0.25
            n += (noise2D(uv * 2.0) - 0.5) * 0.25;

            // octave 2: weight 0.5 * 0.5 * 0.5 = 0.125
            n += (noise2D(uv * 3.0) - 0.5) * 0.125;

            // if you want a 4th octave, you could add:
            n += (noise2D(uv * 4.0) - 0.5) * 0.0625;

            return n + 0.5;
        }

        void main() {
            // 1) flip Y so 0=bottom, 1=top
            vec2 tc = vec2(vTextureCoord.x, 1.0 - vTextureCoord.y);
            vec2 fragCoord = tc * uResolution;

            // 2) normalize to [0..1]
            vec2 uv = fragCoord / uResolution;

            vec2 _uv = uv;

            // 3) center at (0,0) and correct aspect
            uv -= vec2(0.5);
            uv.y /= uResolution.x / uResolution.y;
            vec2 centerUV = uv;

            // 4) fbm warp
            float variationH = fbm(vec2(uTime * 0.3)) * 1.1;
            vec2 offset     = vec2(0.0, -uTime * 0.15);
            float f         = fbm(uv * 0.1 + offset);
            float l         = max(0.1, length(uv));
            uv += rotz(((f - 0.5) / l) * smoothstep(-0.2, 0.4, _uv.y) * 0.45) * uv;

            // 5) base flame shape
            float flame = 1.25 - abs(uv.x) * 5.0;

            // 6) BLUE TIPS (fixed)
            float blueflame = pow(flame * 0.9, 15.0);
            //    a) vertical fade-in from bottom up to y=0.2
            blueflame *= smoothstep(-1.0, 0.2, _uv.y);
            //    b) stronger in center, fall off toward sides
            float sideAtten = 1.0 - smoothstep(0.0, 1.0, abs(uv.x) * 2.0);
            blueflame *= sideAtten;
            blueflame  = clamp(blueflame, 0.0, 1.0);

            // 7) refine main flame
            flame *= smoothstep(1.0, variationH * 0.5, _uv.y);
            flame  = clamp(flame, 0.0, 1.0);
            flame  = pow(flame, 3.0);
            flame /= smoothstep(1.1, -0.1, _uv.y);

            // 8) color ramp red→yellow
            vec4 col = mix(vec4(1.0, 1.0, 0.0, 0.0),
                        vec4(1.0, 1.0, 0.6, 0.0),
                        flame);
            col = mix(vec4(1.0, 0.0, 0.0, 0.0),
                    col,
                    smoothstep(0.0, 1.6, flame));

            // 9) apply blue tips on top
            vec4 bluecolor = mix(vec4(0.0, 0.0, 1.0, 0.0), col, 0.95);
            col = mix(col, bluecolor, blueflame);

            // 10) alpha
            col *= flame;
            col.a = flame;

            // 11) subtle halo around center
            float haloSize  = 0.5;
            float centerL   = 1.0 - (length(centerUV + vec2(0.0, 0.1)) / haloSize);
            vec4  halo      = vec4(0.8, 0.3, 0.3, 0.0) * fbm(vec2(uTime * 0.035)) * centerL + 0.02;
            vec4 finalCol  = mix(halo, col, col.a);
            col = finalCol;

            // 12) organic flicker
            col *= mix(rand(uv) + rand(uv * 0.45), 1.0, 0.9);

            gl_FragColor = clamp(col, 0.0, 1.0);
        }
    `;

    // Create flame filter
    const flameFilter = new Filter({
    glProgram: new GlProgram({ vertex, fragment }),
    resources: {
        uniforms: {
        uTime: { value: 0, type: 'f32' },
        uResolution: {
            value: [app.screen.width, app.screen.height],
            type: 'vec2<f32>',
        },
        // uNoise: { value: noiseTexture.source, type: 'sampler2D' }
        // uNoise: { value: noiseTexture.baseTexture.resource.source, type: 'sampler2D' },
        },
    },
    });

    // Apply filter to sprite
    noiseSprite.filters = [flameFilter];


    // Animate
    ticker.add(function(this: Ticker, delta) {
        flameFilter.resources.uniforms.uniforms.uTime += delta.deltaTime / 60 * 2;
        fpsDiv.textContent = `FPS: ${app.ticker.FPS.toFixed(1)}`;
    });

    ticker.start();

    // Resize support
    window.addEventListener('resize', () => {
        flameFilter.resources.uniforms.uniforms.uResolution = [
            app.screen.width,
            app.screen.height,
        ];
    });
}


