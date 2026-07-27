export const camera = {

    x: 0,
    y: 0,

    targetX: 0,
    targetY: 0,

    zoom: 1,
    targetZoom: 1,

    // 0.2 used to be the floor here, but Complete MCU's own
    // default zoom is 0.10 — once you scrolled in past 0.2,
    // the wheel handler's clamp meant you could never scroll
    // back out past 0.2, i.e. never back to how the view
    // actually loaded. Set below the smallest view zoom in
    // views.js, with a little headroom to spare.
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

   const zoomSpeed =
    camera.targetZoom > camera.zoom
        ? 0.04   // zooming in
        : 0.05;   // zooming out

    camera.zoom +=
        (camera.targetZoom - camera.zoom) *
        zoomSpeed;


}