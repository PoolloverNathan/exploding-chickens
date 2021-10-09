/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/public/js/game/banner.js
Desc     : handles banner appearance
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

let banner_tag = "";

// Check if we should display banner
function check_banner(tag) {
    banner_tag = tag;
    if (!window.localStorage.getItem('ec_hide_banner_' + tag)) {
        document.getElementById("banner").className = "bg-indigo-600 anim-ele anim-ele-fadein";
    }
}

// Hide banner and update local storage
function hide_banner() {
    window.localStorage.setItem('ec_hide_banner_' + banner_tag, true);
    document.getElementById("banner").className = "bg-indigo-600 hidden";
}