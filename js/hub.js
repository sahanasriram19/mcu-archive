import { getWorld } from "./worlds.js";
import { graph } from "./graph.js";

const img = new Image();
img.src = "assets/marvel-logo.jpg";

// Draws each mind map's logo (graph.hubs): one in the middle
// of a single world's map, or one per world on the combined
// "Complete MCU" map.
export function renderHub(ctx, camera){

    const hubs = graph.hubs && graph.hubs.length ? graph.hubs : [{ world: getWorld(), x: 0, y: 0 }];

    hubs.forEach(h => drawHub(ctx, camera, h));

}

function drawHub(ctx, camera, hub){

    const x = window.innerWidth/2 +
        (hub.x-camera.x)*camera.zoom;

    const y = window.innerHeight/2 +
        (hub.y-camera.y)*camera.zoom;

    const width = 900 * camera.zoom;
    const height = 400 * camera.zoom;

    // Off screen: nothing to draw.
    if(x + width < 0 || x - width > window.innerWidth || y + height < 0 || y - height > window.innerHeight) return;

    // X-Men / Spider-Man worlds: their own logo picture if
    // one is set (see WORLD_PLATES below), otherwise a plain
    // title plate — either way in place of the Marvel logo,
    // the same size so the branches meet it the same way.
    const plate = WORLD_PLATES[hub.world];

    if(plate){

        const pic = plateImage(plate);

        if(pic) drawFitted(ctx, pic, x, y, width, height);

        else drawWorldPlate(ctx, x, y, width, height, plate);

        return;

    }

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

// The centre of the map for the non-MCU worlds.
//
// To use a picture as a world's logo, put the image file in
// the assets folder and set `image` to its path, e.g.
//
//     image: "assets/xmen-logo.png"
//
// PNG with a transparent background looks best. It's scaled
// to fit a 900 x 400 box (keeping its shape) in the middle
// of the map. With `image` left out — or while the picture
// is still loading, or if the file can't be found — the
// plain title plate below is drawn instead.
const WORLD_PLATES = {

    xmen:   { image: "assets/xmen-logo.png", text: "X-MEN",      top: "#1c2a5e", bottom: "#0d1433", rim: "250,204,21", ink: "rgb(250,204,21)" },
    spider: { image: "assets/spiderman-logo.png", text: "SPIDER-MAN", top: "#7a1018", bottom: "#3a060b", rim: "70,150,255", ink: "#ffffff" }

};

// Loads a world's logo picture once; returns it when ready.
function plateImage(plate){

    if(!plate.image) return null;

    if(!plate.img){

        plate.img = new Image();

        plate.img.onerror = () => { plate.imgFailed = true; };

        plate.img.src = plate.image;

    }

    if(plate.imgFailed || !plate.img.complete || !plate.img.naturalWidth) return null;

    return plate.img;

}

// Draws a picture as large as fits in the w x h box centred
// on (x, y), without stretching it.
function drawFitted(ctx, pic, x, y, w, h){

    const scale = Math.min(w / pic.naturalWidth, h / pic.naturalHeight);

    const dw = pic.naturalWidth * scale;
    const dh = pic.naturalHeight * scale;

    ctx.drawImage(pic, x - dw / 2, y - dh / 2, dw, dh);

}

function drawWorldPlate(ctx, x, y, w, h, plate){

    const text = plate.text;

    const r = Math.min(18, h * 0.12);

    ctx.save();

    ctx.beginPath();
    ctx.moveTo(x - w/2 + r, y - h/2);
    ctx.arcTo(x + w/2, y - h/2, x + w/2, y + h/2, r);
    ctx.arcTo(x + w/2, y + h/2, x - w/2, y + h/2, r);
    ctx.arcTo(x - w/2, y + h/2, x - w/2, y - h/2, r);
    ctx.arcTo(x - w/2, y - h/2, x + w/2, y - h/2, r);
    ctx.closePath();

    const fill = ctx.createLinearGradient(x, y - h/2, x, y + h/2);
    fill.addColorStop(0, plate.top);
    fill.addColorStop(1, plate.bottom);

    ctx.fillStyle = fill;
    ctx.shadowColor = `rgba(${plate.rim},.45)`;
    ctx.shadowBlur = 30 * (h / 400);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1.5, h * 0.03);
    ctx.strokeStyle = `rgb(${plate.rim})`;
    ctx.stroke();

    ctx.fillStyle = plate.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Shrink longer names ("SPIDER-MAN") to fit the plate.
    let size = h * 0.5;

    ctx.font = `900 ${size}px Impact, "Arial Black", Inter, sans-serif`;

    const fit = (w * 0.86) / Math.max(1, ctx.measureText(text).width);

    if(fit < 1){

        size *= fit;

        ctx.font = `900 ${size}px Impact, "Arial Black", Inter, sans-serif`;

    }

    ctx.fillText(text, x, y + h * 0.03);

    ctx.restore();

}