//======================================================
// MCU ARCHIVE CORE (the central "THE MCU" orb, sitting
// at world origin — pans and zooms with everything else)
//======================================================

import { camera } from "./camera.js";

export const archive = {

    x:0,
    y:0,

    radius:120,

    pulse:0,

    rotation:0

};

export function updateArchive(){

    archive.pulse += 0.02;

    archive.rotation += 0.001;

}

export function renderArchive(ctx, camera){

    const width = window.innerWidth;
    const height = window.innerHeight;

    const pulse =

        1 +

        Math.sin(archive.pulse)*0.05;

    //--------------------------------
    // Project world origin -> screen,
    // same projection as nodes/connections
    //--------------------------------

    const x = width/2 + (archive.x - camera.x) * camera.zoom;

    const y = height/2 + (archive.y - camera.y) * camera.zoom;

    const radius = archive.radius * camera.zoom * pulse;

    //--------------------------------
    // Outer Glow
    //--------------------------------

    const glow =

    ctx.createRadialGradient(

        x,
        y,
        0,

        x,
        y,

        radius * 2.5

    );

    glow.addColorStop(

        0,

        "rgba(255,255,255,.18)"

    );

    glow.addColorStop(

        .25,

        "rgba(90,150,255,.08)"

    );

    glow.addColorStop(

        1,

        "rgba(0,0,0,0)"

    );

    ctx.fillStyle = glow;

    ctx.beginPath();

    ctx.arc(

        x,

        y,

        radius * 2.5,

        0,

        Math.PI*2

    );

    ctx.fill();

    //--------------------------------
    // Core
    //--------------------------------

    ctx.beginPath();

    ctx.arc(

        x,

        y,

        radius * 0.54,

        0,

        Math.PI*2

    );

    ctx.fillStyle="#ffffff";

    ctx.fill();

}