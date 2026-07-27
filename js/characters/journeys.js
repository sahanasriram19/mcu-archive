// js/characters/journeys.js

export function getJourney(nodes,name){

    return nodes
        .filter(node=>
            node.characters &&
            node.characters.includes(name)
        )
        .sort((a,b)=>a.timeline-b.timeline);

}