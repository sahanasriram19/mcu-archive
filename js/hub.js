const img = new Image();
img.src = "assets/marvel-logo.jpg";

export function renderHub(ctx, camera){

    const x = window.innerWidth/2 +
        (0-camera.x)*camera.zoom;

    const y = window.innerHeight/2 +
        (0-camera.y)*camera.zoom;

    const width = 900 * camera.zoom;
    const height = 400 * camera.zoom;

    if(img.complete){

        ctx.drawImage(
            img,
            x-width/2,
            y-height/2,
            width,
            height
        );

    }

}

const WAVE_SPEED = 1.4;

export function getWaveRadius(){

    return (performance.now()*0.18*WAVE_SPEED)%7000;

}