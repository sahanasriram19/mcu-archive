import axios from "axios";
import fs from "fs";

const API_KEY = "8be14d404d22f2dec6bc58c0cd19e49a";

async function test(){

    const movie=await axios.get(

        `https://api.themoviedb.org/3/movie/299536?api_key=${API_KEY}`

    );

    console.log(movie.data.title);

}

test();