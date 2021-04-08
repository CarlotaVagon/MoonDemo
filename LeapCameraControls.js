/*
 * @author Torsten Sprenger / http://torstensprenger.com
 * https://github.com/spren9er/threeleapcontrols
 * Leap Camera Controls (http://leapmotion.com)
 *
 * edited by Carlota Vazquez deleting sections that were unused
 * 
 */

THREE.LeapCameraControls = function(camera) {
  var _this = this;

  this.camera = camera;

  // api
  this.enabled      = true;
  this.target       = new THREE.Vector3(0, 0, 0);
  this.step         = (camera.position.z == 0 ? Math.pow(10, (Math.log(camera.near) + Math.log(camera.far))/Math.log(10))/10.0 : camera.position.z);
  this.fingerFactor = 2;

  // `...Hands`       : integer or range given as an array of length 2
  // `...Fingers`     : integer or range given as an array of length 2
  // `...RightHanded` : boolean indicating whether to use left or right hand for controlling (if number of hands > 1)
  // `...HandPosition`: boolean indicating whether to use palm position or finger tip position (if number of fingers == 1)
  // `...Stabilized`  : boolean indicating whether to use stabilized palm/finger tip position or not

  // rotation
  this.rotateEnabled       = true;
  this.rotateSpeed         = 1.0;
  this.rotateHands         = 1;
  this.rotateFingers       = [2, 3]; 
  this.rotateRightHanded   = true;
  this.rotateHandPosition  = true;
  this.rotateStabilized    = false;
  this.rotateMin           = 0;
  this.rotateMax           = Math.PI;
  
  // zoom
  this.zoomEnabled         = true;
  this.zoomSpeed           = 1.0;
  this.zoomHands           = 1;
  this.zoomFingers         = [4, 5];
  this.zoomRightHanded     = true;
  this.zoomHandPosition    = true;
  this.zoomStabilized      = false;
  this.zoomMin             = _this.camera.near;
  this.zoomMax             = _this.camera.far;

  
  // internals
  var _rotateXLast         = null;
  var _rotateYLast         = null;
  var _zoomZLast           = null;


  // helpers
  this.transformFactor = function(action) {
    switch(action) {
      case 'rotate':
        return _this.rotateSpeed * (_this.rotateHandPosition ? 1 : _this.fingerFactor);
      case 'zoom':
        return _this.zoomSpeed * (_this.zoomHandPosition ? 1 : _this.fingerFactor);
    };
  };

  this.rotateTransform = function(delta) {
    return _this.transformFactor('rotate') * THREE.Math.mapLinear(delta, -400, 400, -Math.PI, Math.PI);
  };

  this.zoomTransform = function(delta) {
    return _this.transformFactor('zoom') * THREE.Math.mapLinear(delta, -400, 400, -_this.step, _this.step);
  };

  this.panTransform = function(delta) {
    return _this.transformFactor('pan') * THREE.Math.mapLinear(delta, -400, 400, -_this.step, _this.step);
  };

  this.applyGesture = function(frame, action) {
    var hl = frame.hands.length;
    var fl = frame.pointables.length;

    switch(action) {
      case 'rotate':
        if (_this.rotateHands instanceof Array) {
          if (_this.rotateFingers instanceof Array) {
            if (_this.rotateHands[0] <= hl && hl <= _this.rotateHands[1] && _this.rotateFingers[0] <= fl && fl <= _this.rotateFingers[1]) return true;
          } else {
            if (_this.rotateHands[0] <= hl && hl <= _this.rotateHands[1] && _this.rotateFingers == fl) return true;
          };
        } else {
          if (_this.rotateFingers instanceof Array) {
            if (_this.rotateHands == hl && _this.rotateFingers[0] <= fl && fl <= _this.rotateFingers[1]) return true;
          } else {
            if (_this.rotateHands == hl && _this.rotateFingers == fl) return true;
          };
        };
        break;
      case 'zoom':
        if (_this.zoomHands instanceof Array) {
          if (_this.zoomFingers instanceof Array) {
            if (_this.zoomHands[0] <= hl && hl <= _this.zoomHands[1] && _this.zoomFingers[0] <= fl && fl <= _this.zoomFingers[1]) return true;
          } else {
            if (_this.zoomHands[0] <= hl && hl <= _this.zoomHands[1] && _this.zoomFingers == fl) return true;
          };
        } else {
          if (_this.zoomFingers instanceof Array) {
            if (_this.zoomHands == hl && _this.zoomFingers[0] <= fl && fl <= _this.zoomFingers[1]) return true;
          } else {
            if (_this.zoomHands == hl && _this.zoomFingers == fl) return true;
          };
        };
        break;
    };

    return false;
  };

  this.hand = function(frame, action) {
    var hds = frame.hands;

    if (hds.length > 0) {
      if (hds.length == 1) {
        return hds[0];
      } else if (hds.length == 2) {
        var lh, rh;
        if (hds[0].palmPosition[0] < hds[1].palmPosition[0]) {
          lh = hds[0];
          rh = hds[1];
        } else {
          lh = hds[1];
          rh = hds[0];
        }
        switch(action) {
          case 'rotate':
            if (_this.rotateRightHanded) {
              return rh;
            } else {
              return lh;
            };
          case 'zoom':
            if (_this.zoomRightHanded) {
              return rh;
            } else {
              return lh;
            };
        };
      };
    };

    return false;
  };

  this.position = function(frame, action) {
    // assertion: if `...HandPosition` is false, then `...Fingers` needs to be 1 or [1, 1]
    var h;
    switch(action) {
      case 'rotate':
        h = _this.hand(frame, 'rotate');
        return (_this.rotateHandPosition 
          ? (_this.rotateStabilized ? h.stabilizedPalmPosition : h.palmPosition) 
          : (_this.rotateStabilized ? frame.pointables[0].stabilizedTipPosition : frame.pointables[0].tipPosition)
        );
      case 'zoom':
        h = _this.hand(frame, 'zoom');
        return (_this.zoomHandPosition 
          ? (_this.zoomStabilized ? h.stabilizedPalmPosition : h.palmPosition) 
          : (_this.zoomStabilized ? frame.pointables[0].stabilizedTipPosition : frame.pointables[0].tipPosition)
        );
    };
  };

  // methods
  this.rotateCamera = function(frame) {
    if (_this.rotateEnabled && _this.applyGesture(frame, 'rotate')) {
      // rotate around axis in xy-plane (in target coordinate system) which is orthogonal to camera vector
      var y = _this.position(frame, 'rotate')[1];
      if (!_rotateYLast) _rotateYLast = y;
      var yDelta = y - _rotateYLast;
      var t = new THREE.Vector3().subVectors(_this.camera.position, _this.target); // translate
      angleDelta = _this.rotateTransform(yDelta);
      newAngle = t.angleTo(new THREE.Vector3(0, 1, 0)) + angleDelta;
      if (_this.rotateMin < newAngle && newAngle < _this.rotateMax) {
        var n = new THREE.Vector3(t.z, 0, -t.x).normalize();
        var matrixX = new THREE.Matrix4().makeRotationAxis(n, angleDelta);
        _this.camera.position = t.applyMatrix4(matrixX).add(_this.target); // rotate and translate back        
      };

      // rotate around y-axis translated by target vector
      var x = _this.position(frame, 'rotate')[0];
      if (!_rotateXLast) _rotateXLast = x;
      var xDelta = x - _rotateXLast;
      var matrixY = new THREE.Matrix4().makeRotationY(-_this.rotateTransform(xDelta));
      _this.camera.position.sub(_this.target).applyMatrix4(matrixY).add(_this.target); // translate, rotate and translate back
      _this.camera.lookAt(_this.target);
      
      _rotateYLast = y;
      _rotateXLast = x;
      _zoomZLast   = null;
    } else {
      _rotateYLast = null;
      _rotateXLast = null;      
    };
  };

  this.zoomCamera = function(frame) {
    if (_this.zoomEnabled && _this.applyGesture(frame, 'zoom')) {
      var z = _this.position(frame, 'zoom')[2];
      if (!_zoomZLast) _zoomZLast = z;
      var zDelta = z - _zoomZLast;
      var t = new THREE.Vector3().subVectors(_this.camera.position, _this.target);
      lengthDelta = _this.zoomTransform(zDelta);
      newLength = t.length() - lengthDelta;
      if (_this.zoomMin < newLength && newLength < _this.zoomMax) {
        t.normalize().multiplyScalar(lengthDelta);
        _this.camera.position.sub(t);        
      };

      _zoomZLast   = z; 
      _rotateXLast = null;
      _rotateYLast = null;
    } else {
      _zoomZLast = null; 
    };
  };


  this.update = function(frame) {
    if (_this.enabled) {
      _this.rotateCamera(frame);
      _this.zoomCamera(frame);
    };
  };
};