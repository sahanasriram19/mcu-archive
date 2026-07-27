// js/characters/timeline.js

export function layoutJourney(nodes){

    const SPACING = 520;

    nodes.forEach((node,index)=>{

        node.targetX = index * SPACING;

        node.targetY = index % 2
            ? 220
            : -220;

    });

}