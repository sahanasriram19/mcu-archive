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

    zoomSmoothing: 0.045

};

// A long, slow pull-back (see slowZoomOut): the zoom eases
// in log space, so it moves out at an even pace instead of
// lurching at the start. Set by viewManager.js as a mind
// map forms after the hyperspace jump; cancelled as soon as
// anything else changes the target (you scroll, a view
// changes).
export function slowZoomOut(fromZoom, rate){

    camera.zoom = Math.min(camera.maxZoom, fromZoom);

    camera.slow = { rate, target: camera.targetZoom, tx: camera.targetX, ty: camera.targetY };

}

export function updateCamera(){

    const slow = camera.slow;

    if(slow){

        const retargeted =
            slow.target !== camera.targetZoom ||
            slow.tx !== camera.targetX ||
            slow.ty !== camera.targetY;

        const near = Math.abs(Math.log(camera.targetZoom / camera.zoom)) < 0.004;

        if(retargeted || near){

            camera.slow = null;

        } else {

            camera.zoom = Math.exp(
                Math.log(camera.zoom) +
                (Math.log(camera.targetZoom) - Math.log(camera.zoom)) * slow.rate
            );

            camera.x += (camera.targetX - camera.x) * slow.rate;
            camera.y += (camera.targetY - camera.y) * slow.rate;

            return;

        }

    }

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

}