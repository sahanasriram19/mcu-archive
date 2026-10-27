export const camera = {

    x: 0,
    y: 0,

    targetX: 0,
    targetY: 0,

    // Landing camera starts further out so more of
    // the star field is visible.
    zoom: 0.28,
    targetZoom: 0.28,

    // Low enough for a phone held sideways to fit the whole
    // Phases grid; the mind map keeps its own 0.07 floor
    // (views.js), so its posters stay readable.
    minZoom: 0.05,
    maxZoom: 4,

    positionSmoothing: 0.09,

    zoomSmoothing: 0.045,

    // How far the map is tipped back, in radians (0 = flat,
    // looking straight down at it). See js/depth.js.
    pitch: 0,
    targetPitch: 0,
    pitchSmoothing: 0.12,

    // How far the map is turned on the spot, like a
    // turntable, in radians (0 = as laid out). See js/depth.js.
    spin: 0,
    targetSpin: 0
};

export function updateCamera(){

    // Moving at all this frame? (Read by universe.js: once the
    // camera and everything else has settled, the map isn't
    // redrawn until something changes.)
    camera.moving =
        camera.x !== camera.targetX || camera.y !== camera.targetY ||
        camera.zoom !== camera.targetZoom ||
        camera.pitch !== camera.targetPitch || camera.spin !== camera.targetSpin;

    camera.x +=
        (camera.targetX - camera.x) *
        camera.positionSmoothing;

    camera.y +=
        (camera.targetY - camera.y) *
        camera.positionSmoothing;

    // Slightly faster zoom than before
    const zoomSpeed =
        camera.targetZoom > camera.zoom
            ? 0.08
            : 0.09;

    camera.zoom +=
        (camera.targetZoom - camera.zoom) *
        zoomSpeed;

    camera.pitch +=
        (camera.targetPitch - camera.pitch) *
        camera.pitchSmoothing;

    if(Math.abs(camera.targetPitch - camera.pitch) < 1e-4) camera.pitch = camera.targetPitch;

    camera.spin +=
        (camera.targetSpin - camera.spin) *
        camera.pitchSmoothing;

    if(Math.abs(camera.targetSpin - camera.spin) < 1e-4) camera.spin = camera.targetSpin;

    // Close enough to see no difference (under a hundredth
    // of a pixel): arrive, so the camera can count as still.
    if(Math.abs(camera.targetX - camera.x) * camera.zoom < 0.01) camera.x = camera.targetX;
    if(Math.abs(camera.targetY - camera.y) * camera.zoom < 0.01) camera.y = camera.targetY;
    if(Math.abs(camera.targetZoom - camera.zoom) < camera.zoom * 1e-5) camera.zoom = camera.targetZoom;

}