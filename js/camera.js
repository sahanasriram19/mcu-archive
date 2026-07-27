export const camera = {

    x: 0,
    y: 0,

    targetX: 0,
    targetY: 0,

    // Landing camera starts further out so more of
    // the star field is visible.
    zoom: 0.28,
    targetZoom: 0.28,

    minZoom: 0.07,
    maxZoom: 4,

    positionSmoothing: 0.09,

    zoomSmoothing: 0.045

};

export function updateCamera(){

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