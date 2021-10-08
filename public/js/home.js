/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
Filename : exploding-chickens/public/js/home.js
Desc     : handles attempt to join game on home page
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

// Swal toast settings
const toast_alert = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 5000,
    padding: '0.4rem'
});

// Declare socket.io
let socket = io();

// Check that lobby slug is valid, if so, enter lobby
function check_lobby_slug() {
    // Get game slug from input
    let passed_slug = document.getElementById("slug_input").value;
    console.log(passed_slug);
    if (passed_slug === "") {
        document.getElementById("slug_input").className = "sm:h-14 h-12 w-80 pl-9 pr-8 rounded-xl text-lg z-0 bg-transparent text-gray-400 border-2 border-gray-500 focus:outline-none";
        document.getElementById("slug_indicator").innerHTML = "<i class=\"hidden\"></i>";
    } else {
        // Input validation
        if (passed_slug !== "" && /^[a-z-]+$/.test(passed_slug)) {
            socket.emit('check-lobby-slug', {
                slug: passed_slug,
                player_id: "spectator"
            });
        } else {
            document.getElementById("slug_input").className = "sm:h-14 h-12 w-80 pl-9 pr-8 rounded-xl text-lg z-0 bg-transparent text-gray-400 border-2 border-red-600 focus:outline-none";
            document.getElementById("slug_indicator").innerHTML = "<i class=\"fa fa-times text-red-600 z-20\"></i>";
        }
    }
}

// Handle incoming slug response
socket.on("slug-response", function (data) {
    if (data === false) {
        document.getElementById("slug_input").className = "sm:h-14 h-12 w-80 pl-9 pr-8 rounded-xl text-lg z-0 bg-transparent text-gray-400 border-2 border-red-600 focus:outline-none";
        document.getElementById("slug_indicator").innerHTML = "<i class=\"fa fa-times text-red-600 z-20\"></i>";
    } else {
        document.getElementById("slug_input").className = "sm:h-14 h-12 w-80 pl-9 pr-8 rounded-xl text-lg z-0 bg-transparent text-gray-400 border-2 border-green-600 focus:outline-none";
        document.getElementById("slug_indicator").innerHTML = "<i class=\"fa fa-check text-green-600 z-20\"></i>";
        setTimeout(e => {window.location.href = "/game/" + data;}, 600);
    }
});

// Scroll progress bar
const scrollProgress = () => {
    return {
        init() {
            window.addEventListener('scroll', () => {
                let winScroll = document.body.scrollTop || document.documentElement.scrollTop
                let height = document.documentElement.scrollHeight - document.documentElement.clientHeight
                this.percent = Math.round((winScroll / height) * 100)
            })
        },
        percent: 0,
    }
}