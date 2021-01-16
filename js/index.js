/* NOTE TO SELF : there seem to be a few problems :
* 1. "var used instead of 'let' or 'const'" - So I need to see the difference and change it
* 2. in line 153 there is a then missing .... "promise returned from toggle is ignored"
* 3. "deprecated symbol used, consult docs for better alternative" (both likes 190 and 192
* Minor errors in the typos of starfield and cubemap */
(function () {
    'use strict';

    if (!Detector.webgl) {
        Detector.addGetWebGLMessage();
        return;
    }

    let hud = document.getElementById('hud');
    let container = document.getElementById('container');

    let loadingContainer = document.getElementById('loading-container');
    let loadingMessage = document.getElementById('loading-message');

    let normVertShader = document.getElementById('norm-vert-shader');
    let normFragShader = document.getElementById('norm-frag-shader');

    let scene;
    let renderer;
    let camera;
    let clock;
    let controls;
    let stats;

    let moon;
    let starfield;
    let light = {
        speed: 0.1,
        distance: 1000,
        position: new THREE.Vector3(0, 0, 0),
        orbit: function (center, time) {
            this.position.x =
                (center.x + this.distance) * Math.sin(time * -this.speed);

            this.position.z =
                (center.z + this.distance) * Math.cos(time * this.speed);
        }
    };

    const createMoon = (textureMap, normalMap) => {
        let radius = 100;
        let xSegments;
        xSegments = 50;
        let ySegments = 50;
        let geo = new THREE.SphereGeometry(radius, xSegments, ySegments);

        let mat = new THREE.ShaderMaterial({
            uniforms: {
                lightPosition: {
                    type: 'v3',
                    value: light.position
                },
                textureMap: {
                    type: 't',
                    value: textureMap
                },
                normalMap: {
                    type: 't',
                    value: normalMap
                },
                uvScale: {
                    type: 'v2',
                    value: new THREE.Vector2(1.0, 1.0)
                }
            },
            vertexShader: normVertShader.innerText,
            fragmentShader: normFragShader.innerText
        });

        let mesh = new THREE.Mesh(geo, mat);
        mesh.geometry.computeTangents();
        mesh.position.set(0, 0, 0);
        mesh.rotation.set(0, 180, 0);
        scene.add(mesh);
        return mesh;
    };

    function createSkybox(texture) {
        let size = 15000;

        let cubemap = THREE.ShaderLib.cube;
        cubemap.uniforms.tCube.value = texture;

        let mat = new THREE.ShaderMaterial({
            fragmentShader: cubemap.fragmentShader,
            vertexShader: cubemap.vertexShader,
            uniforms: cubemap.uniforms,
            depthWrite: false,
            side: THREE.BackSide
        });

        let geo = new THREE.CubeGeometry(size, size, size);

        let
            mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);

        return mesh;
    }

    function init() {
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            preserveDrawingBuffer: true
        });

        renderer.setClearColor(0x000000, 1);
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        let fov = 35;
        let aspect = window.innerWidth / window.innerHeight;
        let near = 1;
        let far = 65536;

        camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        camera.position.set(0, 0, 800);

        scene = new THREE.Scene();
        scene.add(camera);

        controls = new THREE.TrackballControls(camera);
        controls.rotateSpeed = 0.5;
        controls.dynamicDampingFactor = 0.5;

        stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.bottom = '0px';
        hud.appendChild(stats.domElement);

        clock = new THREE.Clock();
    }

    function animate() {
        requestAnimationFrame(animate);
        light.orbit(moon.position, clock.getElapsedTime());
        controls.update(camera);
        stats.update();
        renderer.render(scene, camera);
    }

    function toggleHud() {
        hud.style.display = hud.style.display === 'none' ? 'block' : 'none';
    }

    function onDocumentKeyDown (evt) {
        switch (evt.keyCode) {
        case 'H'.charCodeAt(0):
            toggleHud();
            break;
        case 'F'.charCodeAt(0):
            if (screenfull.enabled) {screenfull.toggle();}
            break;
        case 'P'.charCodeAt(0):
            window.open(renderer.domElement.toDataURL('image/png'));
            break;
        }
    }

    function onWindowResize() {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }

    function loadAssets(options) {
        let paths = options.paths;
        let onBegin = options.onBegin;
        let onComplete = options.onComplete;
        let onProgress = options.onProgress;
        let total = 0;
        let completed = 0;
        let textures = { };
        let key;

        /* there seem to be missing some {} for the for and if */
        for (key in paths){
            if (paths.hasOwnProperty(key)) {total++;}
        }


        onBegin({
            total: total,
            completed: completed
        });

        for (key in paths) {
            if (paths.hasOwnProperty(key)) {
                let path = paths[key];
                if (typeof path === 'string'){
                    THREE.ImageUtils.loadTexture(path, null, getOnLoad(path, key));
                }

                else if (typeof path === 'object'){
                    THREE.ImageUtils.loadTextureCube(path, null, getOnLoad(path, key));
                }

            }
        }

        function getOnLoad(path, name) {
            return function (tex) {
                textures[name] = tex;
                completed++;
                if (typeof onProgress === 'function') {
                    onProgress({
                        path: path,
                        name: name,
                        total: total,
                        completed: completed
                    });
                }
                if (completed === total && typeof onComplete === 'function') {
                    onComplete({
                        textures: textures
                    });
                }
            };
        }
    }

    /** When the window loads, we immediately begin loading assets. While the
        assets loading Three.JS is initialized. When all assets finish loading
        they can be used to create objects in the scene and animation begins */
    function onWindowLoaded() {
        loadAssets({
            paths: {
                moon: 'img/maps/moon.jpg',
                moonNormal: 'img/maps/normal.jpg',
                starfield: [
                    'img/starfield/front.png',
                    'img/starfield/back.png',
                    'img/starfield/left.png',
                    'img/starfield/right.png',
                    'img/starfield/top.png',
                    'img/starfield/bottom.png'
                ]
            },
            onBegin: function () {
                loadingContainer.style.display = 'block';
            },
            onComplete: function (evt) {
                loadingContainer.style.display = 'none';
                let textures = evt.textures;
                moon = createMoon(textures.moon, textures.moonNormal);
                starfield = createSkybox(textures.starfield);
                animate();
            },
            onProgress: function (evt) {
                loadingMessage.innerHTML = evt.name;
            }
        });

        init();
    }

    /** Window load event kicks off execution */
    window.addEventListener('load', onWindowLoaded, false);
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', onDocumentKeyDown, false);
})();
