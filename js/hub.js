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
    if(getWorld() === "xmen"){

        drawWorldPlate(ctx, x, y, width, height, "X-MEN");

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

// A dark plate with a gold rim and the world's name in
// bold type — just typography, no emblem.
function drawWorldPlate(ctx, x, y, w, h, text){

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
    fill.addColorStop(0, "#1c2a5e");
    fill.addColorStop(1, "#0d1433");

    ctx.fillStyle = fill;
    ctx.shadowColor = "rgba(250,204,21,.45)";
    ctx.shadowBlur = 30 * (h / 400);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1.5, h * 0.03);
    ctx.strokeStyle = "rgb(250,204,21)";
    ctx.stroke();

    ctx.fillStyle = "rgb(250,204,21)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${h * 0.5}px Impact, "Arial Black", Inter, sans-serif`;
    ctx.fillText(text, x, y + h * 0.03);

    ctx.restore();

}