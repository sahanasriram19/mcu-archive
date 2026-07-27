//==================================================
//
// RENDERER
//
//==================================================

const canvas=document.getElementById("universe");

const ctx=canvas.getContext("2d");

function resize(){

    canvas.width=window.innerWidth;

    canvas.height=window.innerHeight;

}

resize();

window.addEventListener(

    "resize",

    resize

);

export{

    canvas,

    ctx

};