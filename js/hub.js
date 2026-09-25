import { getWorld } from "./worlds.js";

const img = new Image();
img.src = "assets/marvel-logo.jpg";

export function renderHub(ctx, camera){

    const x = window.innerWidth/2 +
        (0-camera.x)*camera.zoom;

    const y = window.innerHeight/2 +
        (0-camera.y)*camera.zoom;

    const width = 900 * camera.zoom;
    const height = 400 * camera.zoom;

    // X-Men world: a plain title plate in place of the Marvel
    // logo, the same size so the branches meet it the same way.
    const plate = WORLD_PLATES[getWorld()];

    if(plate){

        drawWorldPlate(ctx, x, y, width, height, plate);

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

// Title plates for the non-MCU worlds: just the name in
// bold type on a coloured plate — no emblems.
const WORLD_PLATES = {

    xmen:   { text: "X-MEN",      top: "#1c2a5e", bottom: "#0d1433", rim: "250,204,21", ink: "rgb(250,204,21)" },
    spider: { text: "SPIDER-MAN", top: "#7a1018", bottom: "#3a060b", rim: "70,150,255", ink: "#ffffff" }

};

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