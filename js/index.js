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
    /*my addition for the leap motion*/
    let projector;
    let objects = [], objectsControls = [], cameraControls;

    let lastControlsIndex = -1, controlsIndex = -1, index = -1;

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

    /*This function stops the speed of the light shader for the moon*/
    document.querySelector('.row').addEventListener('click', function(e) {
        if (e.target.type === 'button') {
            let speed = 0;
            if (e.target.id === 'btn-stop') {
                speed = 0.0;
            }

            light = {
                speed,
                distance: 1000,
                position: new THREE.Vector3(0, 0, 0),
                orbit: function (center, time) {
                    this.position.x =
                        (center.x + this.distance) * Math.sin(time * -this.speed);

                    this.position.z =
                        (center.z + this.distance) * Math.cos(time * this.speed);
                }
            };

            console.log(`light.speed: ${light.speed}`);
        }
    });



    /*created by cory gross*/
    const createMoon = (textureMap, normalMap) => {
        let radius = 200;
        let xSegments;
        xSegments = 100;
        let ySegments = 100;
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
        mesh.position.x = 0;
        mesh.position.y = 0;
        mesh.position.z = 0;
        //mesh.position.set(0, 0, 0);
        //mesh.rotation.set(0, 180, 0);
        mesh.rotation.x = 0;
        mesh.rotation.y = 180;
        mesh.rotation.z = 0;
        // leap object controls
        let objectControls = new THREE.LeapObjectControls(camera, mesh);

        objectControls.rotateEnabled  = true;
        objectControls.rotateSpeed    = 0.7;
        objectControls.rotateHands    = 1;
        objectControls.rotateFingers  = [2, 3];

        objectControls.scaleEnabled   = true;
        objectControls.scaleSpeed     = 0.7;
        objectControls.scaleHands     = 1;
        objectControls.scaleFingers   = [4, 5];

        scene.add(mesh);
        return mesh;
    };


    /*created by cory gross*/
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

        let mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);

        return mesh;

    }

    /*created by cory gross and edited with leap motion controls */
    function init() {
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            preserveDrawingBuffer: true
        });

        /*render*/
        renderer.setClearColor(0x000000, 1);
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        let fov = 35;
        let aspect = window.innerWidth / window.innerHeight;
        let near = 1;
        let far = 65536;

        camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        camera.position.set(0, 0, 800);

        let origin = new THREE.Vector3(0, 0, 0);
        camera.lookAt(origin);

        // leap camera controls
        cameraControls = new THREE.LeapCameraControls(camera);

        //for rotation
        cameraControls.rotateEnabled  = true;
        cameraControls.rotateSpeed    = 3;
        cameraControls.rotateHands    = 1;
        cameraControls.rotateFingers  = [2, 3];

        //for zooming
        cameraControls.zoomEnabled    = true;
        cameraControls.zoomSpeed      = 6;
        cameraControls.zoomHands      = 1;
        cameraControls.zoomFingers    = [4, 5];
        cameraControls.zoomMin        = 50;
        cameraControls.zoomMax        = 2000;

        //was not implemented due to lack of time (could be done in future work)
        //cameraControls.panEnabled     = false;
        //cameraControls.panSpeed       = 2;
        //cameraControls.panHands       = 2;
        //cameraControls.panFingers     = [6, 12];
        //cameraControls.panRightHanded = false; // for left-handed person

        //world
        scene = new THREE.Scene();

        //projector
        projector = new THREE.Projector();



        // world coordinate system (thin dashed helping lines)
        let lineGeometry = new THREE.Geometry();
        let vertArray = lineGeometry.vertices;
        vertArray.push(new THREE.Vector3(1000, 0, 0), origin, new THREE.Vector3(0, 1000, 0), origin, new THREE.Vector3(0, 0, 1000));
        lineGeometry.computeLineDistances();
        let lineMaterial = new THREE.LineDashedMaterial({color: 0x000000, dashSize: 1, gapSize: 2});
        let coords = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(coords);


        scene.add(camera);
        /*look here might be good for the leap motion control*/
        controls = new THREE.TrackballControls(camera);
        controls.rotateSpeed = 0.5;
        controls.dynamicDampingFactor = 0.5;

        stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.bottom = '0px';
        hud.appendChild(stats.domElement);

        // listen to resize event
        window.addEventListener('resize', onWindowResize, false);
        //maybe change
        render();
        clock = new THREE.Clock();
    }

    function changeControlsIndex() {
        if (lastControlsIndex == controlsIndex) {
            if (index != controlsIndex && controlsIndex > -2) {
                // new object or camera to control
                if (controlsIndex > -2) {
                    if (index > -1) objects[index].material.color.setHex(0x00000);
                    index = controlsIndex;
                    if (index > -1) objects[index].material.color.setHex(0x00000);
                }
            };
        };
        lastControlsIndex = controlsIndex;
    };

    function transform(tipPosition, w, h) {
        let width = 150;
        let height = 150;
        let minHeight = 100;

        let ftx = tipPosition[0];
        let fty = tipPosition[1];
        ftx = (ftx > width ? width - 1 : (ftx < -width ? -width + 1 : ftx));
        fty = (fty > 2*height ? 2*height - 1 : (fty < minHeight ? minHeight + 1 : fty));
        let x = THREE.Math.mapLinear(ftx, -width, width, 0, w);
        let y = THREE.Math.mapLinear(fty, 2*height, minHeight, 0, h);
        return [x, y];
    };

    function showCursor(frame) {
        let hl = frame.hands.length;
        let fl = frame.pointables.length;

        if (hl == 1 && fl == 1) {
            let f = frame.pointables[0];
            let cont = $(renderer.domElement);
            let offset = cont.offset();
            let coords = transform(f.tipPosition, cont.width(), cont.height());
            $("#cursor").css('left', offset.left + coords[0] - (($("#cursor").width() - 1)/2 + 1));
            $("#cursor").css('top', offset.top + coords[1] - (($("#cursor").height() - 1)/2 + 1));
        } else {
            $("#cursor").css('left', -1000);
            $("#cursor").css('top', -1000);
        };
    };

    function focusObject(frame) {
        let hl = frame.hands.length;
        let fl = frame.pointables.length;

        if (hl == 1 && fl == 1) {
            let f = frame.pointables[0];
            let cont = $(renderer.domElement);
            let coords = transform(f.tipPosition, cont.width(), cont.height());
            let vpx = (coords[0]/cont.width())*2 - 1;
            let vpy = -(coords[1]/cont.height())*2 + 1;
            let vector = new THREE.Vector3(vpx, vpy, 0.5);
            projector.unprojectVector(vector, camera);
            let raycaster = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
            let intersects = raycaster.intersectObjects(objects);
            if (intersects.length > 0) {
                let i = 0;
                while(!intersects[i].object.visible) i++;
                let intersected = intersects[i];
                return objects.indexOf(intersected.object);
            } else {
                return -1;
            };
        };

        return -2;
    };


    /*created by cory gross*/
    function animate() {
        requestAnimationFrame(animate);
        light.orbit(moon.position, clock.getElapsedTime());
        controls.update(camera);
        stats.update();
        renderer.render(scene, camera);
    }

    function render() {
        renderer.render(scene, camera);
    }

    /*created by cory gross*/
    function toggleHud() {
        hud.style.display = hud.style.display === 'none' ? 'block' : 'none';
    }

    /*created by cory gross*/
    function onDocumentKeyDown (evt) {
        switch (evt.keyCode) {
            case 'H'.charCodeAt(0):
                toggleHud();
                break;
        }
    }

    /*created by cory gross*/
    function onWindowResize() {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        render();
    }

    /*created by cory gross*/
    function loadAssets(options) {
        let paths = options.paths;
        let onBegin = options.onBegin;
        let onComplete = options.onComplete;
        let onProgress = options.onProgress;
        let total = 0;
        let completed = 0;
        let textures = { };
        let key;


        for (key in paths){
            if (paths.hasOwnProperty(key)) {total++;}
        }


        /*created by cory gross*/
        onBegin({
            total: total,
            completed: completed
        });

        /*created by cory gross*/
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

        /*created by cory gross*/
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

    /*created by cory gross*/
    /** When the window loads, we immediately begin loading assets. While the
     assets loading Three.JS is initialized. When all assets finish loading
     they can be used to create objects in the scene and animation begins */
    function onWindowLoaded() {
        loadAssets({
            paths: {
                /*changed image of moon to more detailed*/
                /*notes for some reason the nasa images dont load, investigate why*/
                moon: 'img/maps/moon8k.jpg',
                moonNormal: 'img/maps/normal8k.jpg',
                /*test comment out starfield for high resolution of the moon*/
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

        // leap loop
        Leap.loop(function(frame) {
            // show cursor
            //showCursor(frame);

            // set correct camera control
            controlsIndex = focusObject(frame);
            if (index == -1) {
                cameraControls.update(frame);
            } else {
                objectsControls[index].update(frame);
            };

            // custom modifications (here: show coordinate system always on target and light movement)
            //coords1.position = cameraControls.target;
            //coords2.position = cameraControls.target;
            //coords3.position = cameraControls.target;
            //light.position   = camera.position;

            render();
        });
    }

    /*created by cory gross*/
    /** Window load event kicks off execution */
    window.addEventListener('load', onWindowLoaded, false);
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', onDocumentKeyDown, false);
})();
