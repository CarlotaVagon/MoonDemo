/* The code had to be updated to make it run plus new functions were added to provide
* leap motion functionality. Moreover I added comments to make the code more clear something
* that was not done by the original creator cory gross. Unless specified by the comment
* "created by cory gross" I coded it.*/
(function () {
    'use strict';

    if (!Detector.webgl) {
        Detector.addGetWebGLMessage();
        return;
    }

    /*cory gross coded this part, I had to change all var to let*/
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

    /*created by cory gross*/
    let moon;
    let starfield;
    let light = {
        /*I edited the speed to make it slower*/
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

    /*This event listener stops the speed of the light shader for the moon*/
    document.querySelector('.row').addEventListener('click', function(e) {
        if (e.target.type === 'button') {
            let speed = 0;
            if (e.target.id === 'but-stop') {
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
    /*This function created the moons size shape and the shaders*/
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

        /*edited from the original to be able to work wit the leap motion controller*/
        /*This section of code sets the starting position and orientation of the moon*/
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

        /* leap object controls are created here to be able to rotate and zoom*/
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
    /*This function creates the star background for moon*/
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

        /*render for the leap motion controller*/
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

        /*leap camera controls for the leap  motion controller*/
        cameraControls = new THREE.LeapCameraControls(camera);

        /*Rotation section*/
        cameraControls.rotateEnabled  = true;
        cameraControls.rotateSpeed    = 3;
        cameraControls.rotateHands    = 1;
        cameraControls.rotateFingers  = [2, 3];

        /*Zoom section*/
        cameraControls.zoomEnabled    = true;
        cameraControls.zoomSpeed      = 6;
        cameraControls.zoomHands      = 1;
        cameraControls.zoomFingers    = [4, 5];
        cameraControls.zoomMin        = 50;
        cameraControls.zoomMax        = 2000;


        /*Creates the world that can be controled with both mouse and leap motion*/
        scene = new THREE.Scene();

        /*The projector is used for the leap motion*/
        projector = new THREE.Projector();



        /*This section of code creates a coordinate system for the leap motion to use
        * It also includes a small dashed line coloured in black that shows the axis
        * Black to blend with the background, still slightly visible*/
        let lineGeometry = new THREE.Geometry();
        let vertArray = lineGeometry.vertices;
        vertArray.push(new THREE.Vector3(1000, 0, 0), origin, new THREE.Vector3(0, 1000, 0), origin, new THREE.Vector3(0, 0, 1000));
        lineGeometry.computeLineDistances();
        let lineMaterial = new THREE.LineDashedMaterial({color: 0x000000, dashSize: 1, gapSize: 2});
        let coords = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(coords);


        scene.add(camera);

        /*created by cory gross*/
        /*This section connects the moon to the mouse controls to zoom and rotate the model*/
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

    /*Leap motion function for a pointer that was never implemented due to lack of time*/
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

    /*Leap motion function that changes the size of the moon
    * returns: coordinates */
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

    /*Leap motion function for a pointer that was never implemented due to lack of time*/
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

    /*Leap motion function that feeds the leap motion controller with information of its readings
    * and changes the model accordingly
    * returns: object index which it most change*/
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

    /*Leap motion rendering function*/
    function render() {
        renderer.render(scene, camera);
    }

    /*created by cory gross*/
    function toggleHud() {
        hud.style.display = hud.style.display === 'none' ? 'block' : 'none';
    }

    /*created by cory gross*/
    /*This function was edited to only include the key event that worked
    * This was the h to toggle HUD, creates a fullscreen only showing the moon*/
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
                /*changed image of moon to more detailed version*/
                moon: 'img/maps/moon8k.jpg',
                moonNormal: 'img/maps/normal8k.jpg',
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

        /*Leap motion section
        * The Leap loop start the reading of the controller and updates the information every
        *  given time interval*/
        Leap.loop(function(frame) {
            /*Could have included a cursor function if had had more time*/
            // show cursor
            //showCursor(frame);

            /*set correct camera control*/
            controlsIndex = focusObject(frame);
            if (index == -1) {
                cameraControls.update(frame);
            } else {
                objectsControls[index].update(frame);
            };

            render();
        });
    }

    /*created by cory gross*/
    /** Window load event kicks off execution */
    window.addEventListener('load', onWindowLoaded, false);
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', onDocumentKeyDown, false);
})();
