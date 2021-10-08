/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/public/js/game/banner.js
Desc     : handles banner appearance
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Check if we should display banner
if (!window.localStorage.getItem('ec_hide_banner_v1.2.0')) {
    document.getElementById("banner").className = "bg-indigo-600 anim-ele anim-ele-fadein";
}

// Hide banner and update local storage
function hide_banner() {
    window.localStorage.setItem('ec_hide_banner_v1.2.0', true);
    document.getElementById("banner").className = "bg-indigo-600 hidden";
}