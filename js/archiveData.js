//==================================================
// MCU DATA
//==================================================
// phase        : release phase (1-4)
// saga         : "infinity" | "multiverse"
// release      : real-world release date (YYYY-MM-DD)
// timeline     : in-universe chronological order (int)
// characters   : main characters featured, ordered by prominence
// colour       : accent used for this node's glow / poster tint (r,g,b)
//==================================================

export const archiveData = [

    { id:"cap1", title:"Captain America: The First Avenger", type:"movie", phase:1, saga:"infinity",
      release:"2011-07-22", timeline:1, colour:"91,141,239",
      characters:["Steve Rogers"], poster:null },

    { id:"gotg1", title:"Guardians of the Galaxy", type:"movie", phase:2, saga:"infinity",
      release:"2014-08-01", timeline:2, colour:"155,140,246",
      characters:["Star-Lord"], poster:null },

    { id:"thor1", title:"Thor", type:"movie", phase:1, saga:"infinity",
      release:"2011-05-06", timeline:4, colour:"246,196,83",
      characters:["Thor","Loki"], poster:null },

    { id:"ironman", title:"Iron Man", type:"movie", phase:1, saga:"infinity",
      release:"2008-05-02", timeline:5, colour:"226,89,107",
      characters:["Tony Stark"], poster:null },

    { id:"hulk", title:"The Incredible Hulk", type:"movie", phase:1, saga:"infinity",
      release:"2008-06-13", timeline:6, colour:"123,212,122",
      characters:["Bruce Banner"], poster:null },

    { id:"ironman2", title:"Iron Man 2", type:"movie", phase:1, saga:"infinity",
      release:"2010-05-07", timeline:7, colour:"226,89,107",
      characters:["Tony Stark","Natasha Romanoff"], poster:null },

    { id:"avengers1", title:"The Avengers", type:"movie", phase:1, saga:"infinity",
      release:"2012-05-04", timeline:8, colour:"232,183,75",
      characters:["Tony Stark","Steve Rogers","Thor","Bruce Banner","Natasha Romanoff","Loki"], poster:null },

    { id:"thor2", title:"Thor: The Dark World", type:"movie", phase:2, saga:"infinity",
      release:"2013-11-08", timeline:9, colour:"246,196,83",
      characters:["Thor","Loki"], poster:null },

    { id:"ironman3", title:"Iron Man 3", type:"movie", phase:2, saga:"infinity",
      release:"2013-05-03", timeline:10, colour:"226,89,107",
      characters:["Tony Stark"], poster:null },

    { id:"cap2", title:"Captain America: The Winter Soldier", type:"movie", phase:2, saga:"infinity",
      release:"2014-04-04", timeline:11, colour:"91,141,239",
      characters:["Steve Rogers","Natasha Romanoff"], poster:null },

    { id:"avengers2", title:"Avengers: Age of Ultron", type:"movie", phase:2, saga:"infinity",
      release:"2015-05-01", timeline:12, colour:"232,183,75",
      characters:["Tony Stark","Steve Rogers","Thor","Bruce Banner","Natasha Romanoff"], poster:null },

    { id:"cacw", title:"Captain America: Civil War", type:"movie", phase:3, saga:"infinity",
      release:"2016-05-06", timeline:13, colour:"91,141,239",
      characters:["Steve Rogers","Tony Stark"], poster:null },

    { id:"drstrange", title:"Doctor Strange", type:"movie", phase:3, saga:"infinity",
      release:"2016-11-04", timeline:14, colour:"155,140,246",
      characters:["Stephen Strange"], poster:null },

    { id:"spiderman1", title:"Spider-Man: Homecoming", type:"movie", phase:3, saga:"infinity",
      release:"2017-07-07", timeline:15, colour:"226,89,107",
      characters:["Peter Parker","Tony Stark"], poster:null },

    { id:"thor3", title:"Thor: Ragnarok", type:"movie", phase:3, saga:"infinity",
      release:"2017-11-03", timeline:16, colour:"246,196,83",
      characters:["Thor","Loki"], poster:null },

    { id:"blackpanther", title:"Black Panther", type:"movie", phase:3, saga:"infinity",
      release:"2018-02-16", timeline:17, colour:"123,212,122",
      characters:["T'Challa"], poster:null },

    { id:"infinitywar", title:"Avengers: Infinity War", type:"movie", phase:3, saga:"infinity",
      release:"2018-04-27", timeline:18, colour:"232,183,75",
      characters:["Tony Stark","Steve Rogers","Thor","Stephen Strange"], poster:null },

    { id:"endgame", title:"Avengers: Endgame", type:"movie", phase:3, saga:"infinity",
      release:"2019-04-26", timeline:19, colour:"232,183,75",
      characters:["Tony Stark","Steve Rogers","Thor","Bruce Banner","Natasha Romanoff"], poster:null },

    { id:"wandavision", title:"WandaVision", type:"show", phase:4, saga:"multiverse",
      release:"2021-01-15", timeline:20, colour:"226,89,107",
      characters:["Wanda Maximoff"], poster:null },

    { id:"loki", title:"Loki", type:"show", phase:4, saga:"multiverse",
      release:"2021-06-09", timeline:21, colour:"155,140,246",
      characters:["Loki"], poster:null }

];