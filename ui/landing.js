const button = document.getElementById("enter-btn");
const landing = document.getElementById("landing");
const viewport = document.getElementById("viewport");

button.addEventListener("click", () => {

    console.log("Enter Archive");

    landing.style.display = "none";
    viewport.style.display = "block";

});