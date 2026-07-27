//==================================================
//
// STATE
//
//==================================================

export const universe = {

    width: window.innerWidth,
    height: window.innerHeight,

    time: 0,

    stars: [],
    heroStars: [],
    dust: [],
    energy: [],
    nebulas: [],
    shootingStars: []

};

//==================================================
// KEEP SCREEN SIZE IN SYNC
//==================================================

window.addEventListener("resize", () => {

    universe.width = window.innerWidth;
    universe.height = window.innerHeight;

});
