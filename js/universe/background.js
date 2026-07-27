//==================================================
// BACKGROUND
//==================================================

import { ctx } from "./renderer.js";
import { universe } from "./state.js";

export function drawBackground(){

    const gradient = ctx.createLinearGradient(

        0,
        0,

        0,
        universe.height

    );

    gradient.addColorStop(0,"#04060A");
    gradient.addColorStop(.25,"#07111F");
    gradient.addColorStop(.5,"#10192D");
    gradient.addColorStop(.75,"#08111E");
    gradient.addColorStop(1,"#020306");

    ctx.fillStyle = gradient;

    ctx.fillRect(

        0,
        0,

        universe.width,
        universe.height

    );

}