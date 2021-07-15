/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/public/js/game/banner.js
Desc     : handles banner appearance
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Check if we should display banner
if (!window.localStorage.getItem('ec_hide_banner')) {
    document.getElementById("banner").className = "bg-indigo-600";
}

// Hide banner and update local storage
function hide_banner() {
    window.localStorage.setItem('ec_hide_banner', true);
    document.getElementById("banner").className = "bg-indigo-600 hidden";
}