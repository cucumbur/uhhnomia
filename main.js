// Set up the full-screen drawing canvas
var drawCanvas = document.getElementById("drawCanvas");
drawCanvas.width = window.innerWidth;
drawCanvas.height = window.innerHeight;
window.addEventListener('resize', resizeCanvas, false);
function resizeCanvas() {
  drawCanvas.width = window.innerWidth;
  drawCanvas.height = window.innerHeight;
  /**
   * Your drawings need to be inside this function otherwise they will be reset when
   * you resize the browser window and the canvas goes will be cleared.
   */
}
resizeCanvas();

function init () {
  // TODO: use preload js to load resources?
  var stage = new createjs.Stage("drawCanvas");
  var circle = new createjs.Shape();
  var logo = new createjs.Bitmap("assets/images/logo_large_nodot.png");
  circle.graphics.beginFill("#F4F1BB").drawCircle(0, 0, 15);
  circle.x = ((drawCanvas.width - logo.getBounds().width)/2) + 762;
  circle.y = (drawCanvas.height - logo.getBounds().height)/2 - 200 + 31;
  logo.x = (drawCanvas.width - logo.getBounds().width)/2;
  logo.y = -logo.getBounds().height;
  logo.alpha = 0;
  //circle.alpha = 0;
  stage.addChild(circle);
  stage.addChild(logo);
  createjs.Tween.get(circle, { loop: true })
  .to({alpha: 1, scaleX:1.5, scaleY:1.5 }, 1000, createjs.Ease.getPowInOut(2))
  .to({alpha:1, scaleX:1, scaleY:1 }, 1000, createjs.Ease.getElasticInOut(2, 8));
  createjs.Tween.get(logo, { loop: false})
  .to({ y: (drawCanvas.height - logo.getBounds().height)/2 - 200, alpha: 1   }, 800, createjs.Ease.getPowInOut(2));
  createjs.CSSPlugin.install(createjs.Tween);
		var tween = createjs.Tween.get(loginModal, {loop: false})
    .to({ top: (drawCanvas.height - logo.getBounds().height)/2 - 200, opacity: 1   }, 800, createjs.Ease.getPowInOut(2));

  createjs.Ticker.setFPS(60);
  createjs.Ticker.addEventListener("tick", stage);
}


// Get the modal
var loginModal = document.getElementsByClassName('loginModal')[0];
var nameInput = document.getElementById('loginName');
var roomInput = document.getElementById('loginRoom');
var loginButton = document.getElementById('loginButton');
loginButton.addEventListener("click", function() {
    username = nameInput.value;
    roomname = roomInput.value;
    // If the username is valid
    alert("yo!!");
    if (username && roomname) {
      alert('hi');
      // $loginPage.fadeOut();
      // $chatPage.show();
      // $loginPage.off('click');
      // $currentInput = $inputMessage.focus();

      socket.emit('join room', {name:username, room:roomname});
    }
});
// When the user clicks on the button, open the modal
// btn.onclick = function() {
//     modal.style.display = "block";
// }

// When the user clicks on <span> (x), close the modal
// span.onclick = function() {
//     modal.style.display = "none";
// }

// When the user clicks anywhere outside of the modal, close it
// window.onclick = function(event) {
//     if (event.target == loginModal) {
//         loginModal.style.display = "none";
//     }
// }

// Socket functionality
var socket = io();
