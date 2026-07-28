import { graph } from "../js/graph.js";
import { camera } from "../js/camera.js";

let selectedIndex = 0;
let results = [];
let selectedNode = null;

export function initMovieSearch(){

    const input = document.getElementById("movie-search");
    const resultsBox = document.getElementById("movie-search-results");

    if(!input || !resultsBox) return;

    input.addEventListener("input", () => {

        const query = input.value.trim().toLowerCase();

        if(!query){

            results = [];
            renderResults();
            return;

        }

        results = [];

        graph.nodes.forEach(node=>{

            let score = 0;

            const title = node.title.toLowerCase();

            if(title === query) score += 100;
            else if(title.startsWith(query)) score += 70;
            else if(title.includes(query)) score += 40;

            if(node.characters){

                node.characters.forEach(character=>{

                    const c = character.toLowerCase();

                    if(c === query) score += 90;
                    else if(c.startsWith(query)) score += 60;
                    else if(c.includes(query)) score += 30;

                });

            }

            if(score){

                results.push({

                    node,
                    score

                });

            }

        });

        results.sort((a,b)=>b.score-a.score);

        results = results.slice(0,8);

        selectedIndex = 0;

        renderResults();

    });

    input.addEventListener("keydown", e=>{

        if(!results.length) return;

        if(e.key==="ArrowDown"){

            e.preventDefault();

            selectedIndex=(selectedIndex+1)%results.length;

            renderResults();

        }

        if(e.key==="ArrowUp"){

            e.preventDefault();

            selectedIndex--;

            if(selectedIndex<0)
                selectedIndex=results.length-1;

            renderResults();

        }

        if(e.key==="Enter"){

            e.preventDefault();

            focusNode(results[selectedIndex].node);

        }

        if(e.key==="Escape"){

            input.value="";

            results=[];

            renderResults();

            input.blur();

        }

    });

    document.addEventListener("keydown",e=>{

        if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="k"){

            e.preventDefault();

            input.focus();

            input.select();

        }

    });

    function renderResults(){

        resultsBox.innerHTML="";

        if(!results.length){

            resultsBox.style.display="none";

            return;

        }

        resultsBox.style.display="block";

        results.forEach((result,index)=>{

            const button=document.createElement("button");

            button.className="search-result";

            if(index===selectedIndex)
                button.classList.add("active");

            button.innerHTML=`
                <div class="search-title">${result.node.title}</div>
                <div class="search-type">${result.node.type}</div>
            `;

            button.onclick=()=>focusNode(result.node);

            resultsBox.appendChild(button);

        });

    }

    function focusNode(node){

        if(selectedNode)
            selectedNode.selected=false;

        selectedNode=node;

        node.selected=true;

        camera.targetX=node.x;
        camera.targetY=node.y;
        camera.targetZoom=0.75;

        results=[];

        renderResults();

        input.blur();

    }

}