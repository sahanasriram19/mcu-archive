const particles = document.getElementById("particles");

for(let i=0;i<80;i++){

    const p = document.createElement("div");

    p.className="particle";

    p.style.left=Math.random()*100+"%";

    p.style.top=Math.random()*100+"%";

    p.style.animationDuration=

    15+Math.random()*20+"s";

    particles.appendChild(p);

}