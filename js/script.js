

"use strict";
// creating element and placed in perticular class
function element(name, className) {
  var element = document.createElement(name);
  if (className) element.className = className;
  return element;
}

/* Vector */
function Vector(x, y) {
  this.x = x;
  this.y = y;
}
//this is for changing co-ordinates of player
Vector.prototype.plus = function(other) {
  return new Vector(this.x + other.x, this.y + other.y);
};
//this is for changing shape after died
Vector.prototype.times = function(factor) {
  return new Vector(this.x * factor, this.y * factor);
};
//level objects 
//by creating stack of array of element's  in level
function Level(plan) {
  this.width = plan[0].length;
  this.height = plan.length;
  this.grid = [];
  this.actors = [];
  // build the grid
  for (var y = 0; y < this.height; y++) {
    var line = plan[y],
      gridLine = [];
    for (var x = 0; x < this.width; x++) {
      var ch = line[x],
        fieldType = null;
      var Actor = actorChars[ch];
      if (Actor)
        this.actors.push(new Actor(new Vector(x, y), ch));
      else if (ch == "x")
        fieldType = "wall";
      else if (ch == "!")
        fieldType = "lava";
      gridLine.push(fieldType);
    }
    this.grid.push(gridLine);
  }
  this.player = this.actors.filter(function(actor) {
    return actor.type == "player";
  })[0];
  this.status = this.finishDelay = null;
}
Level.prototype.isFinished = function() {
  return this.status != null && this.finishDelay < 0;
}
//create floors which restrict the motion of player
Level.prototype.obstacleAt = function(pos, size) {
  var xStart = Math.floor(pos.x);
  var xEnd = Math.ceil(pos.x + size.x);
  var yStart = Math.floor(pos.y);
  var yEnd = Math.ceil(pos.y + size.y);
  if (xStart < 0 || xEnd > this.width || yStart < 0)
    return "wall";
  if (yEnd > this.height)
    return "lava";
  for (var y = yStart; y < yEnd; y++) {
    for (var x = xStart; x < xEnd; x++) {
      var fieldType = this.grid[y][x];
      if (fieldType) return fieldType;
    }
  }
}
// very important it separete thr player and grids
// Handle the collisions between the player and other dynamic actors.
Level.prototype.actorAt = function(actor) {
  for (var i = 0; i < this.actors.length; i++) {
    var other = this.actors[i];
    if (other != actor &&
      actor.pos.x + actor.size.x > other.pos.x &&
      actor.pos.x < other.pos.x + other.size.x &&
      actor.pos.y + actor.size.y > other.pos.y &&
      actor.pos.y < other.pos.y + other.size.y)
      return other;
  }
};
var maxStep = 0.05;
Level.prototype.animate = function(step, keys) {
  if (this.status != null) {
    this.finishDelay -= step;
  }
  while (step > 0) {
    var thisStep = Math.min(step, maxStep);
    this.actors.forEach(function(actor) {
      actor.act(thisStep, this, keys);
    }, this);
    step -= thisStep;
  }
};
// Handles collisions between the player and other objects
Level.prototype.playerTouched = function(type, actor) {
  if (type == "lava" && this.status == null) {
    this.status = "lost";
    this.finishDelay = 1;
  } else if (type == "coin") {
    this.actors = this.actors.filter(function(other) {
      return other != actor;
    });
    if (!this.actors.some(function(actor) {
        return actor.type == "coin";
      })) {
      this.status = "won";
      this.finishDelay = 1;
    }
  }
};
var actorChars = {
  "@": Player,
  "o": Coin,
  "=": Lava,
  "|": Lava,
  "v": Lava
};
//define our mario
function Player(pos) {
  this.pos = pos.plus(new Vector(0, -0.5));
  this.size = new Vector(0.8, 1.5);
  this.speed = new Vector(0, 0);
}

//create our mario and its movement
Player.prototype.type = "player";
// Horizontal motion
var playerXSpeed = 7;
Player.prototype.moveX = function(step, level, keys) {
  this.speed.x = 0;
  if (keys.left) this.speed.x -= playerXSpeed;
  if (keys.right) this.speed.x += playerXSpeed;

  var motion = new Vector(this.speed.x * step, 0);
  var newPos = this.pos.plus(motion);
  var obstacle = level.obstacleAt(newPos, this.size);
  if (obstacle) 
    level.playerTouched(obstacle);
  else
    this.pos = newPos;
};
var gravity = 30;
var jumpSpeed = 17;
Player.prototype.moveY = function(step, level, keys) {
  this.speed.y += step * gravity;
  var motion = new Vector(0, this.speed.y * step);
  var newPos = this.pos.plus(motion);
  var obstacle = level.obstacleAt(newPos, this.size);
  if (obstacle) {
    level.playerTouched(obstacle);
    if (keys.up && this.speed.y > 0)
      this.speed.y = -jumpSpeed;
    else
      this.speed.y = 0;
  } else {
    this.pos = newPos;
  }
};

Player.prototype.act = function(step, level, keys) {
  this.moveX(step, level, keys);
  this.moveY(step, level, keys);

  var otherActor = level.actorAt(this);
  if (otherActor)
    level.playerTouched(otherActor.type, otherActor);
  if (level.status == "lost") {
    this.pos.y += step;
    this.size.y -= step;
  }
};
//lava objects
function Lava(pos, ch) {
  this.pos = pos;
  this.size = new Vector(1, 1);
  if (ch == "=") {
    this.speed = new Vector(2, 0);
  } else if (ch == "|") {
    this.speed = new Vector(0, 2);
  } else if (ch == "v") {
    this.speed = new Vector(0, 3);
    this.repeatPos = pos;
  }
}
Lava.prototype.type = "lava";
Lava.prototype.act = function(step, level) {
  var newPos = this.pos.plus(this.speed.times(step));
  if (!level.obstacleAt(newPos, this.size))
    this.pos = newPos;
  else if (this.repeatPos)
    this.pos = this.repeatPos;
  else
    this.speed = this.speed.times(-1);
};
//coin objects
function Coin(pos) {
  this.basePos = this.pos = pos.plus(new Vector(0.2, 0.1));
  this.size = new Vector(0.6, 0.6);
  this.wobble = Math.random() * Math.PI * 2;
}

Coin.prototype.type = "coin";

var wobbleSpeed = 8,
  wobbleDist = 0.07;
Coin.prototype.act = function(step) {
  this.wobble += step * wobbleSpeed;
  var wobblePos = Math.sin(this.wobble) * wobbleDist;
  this.pos = this.basePos.plus(new Vector(0, wobblePos));
};
//Dom Display objects
function DOMDisplay(parent, level) {
  this.wrap = parent.appendChild(element("div", "game"));
  this.level = level;
  this.wrap.appendChild(this.drawBackground());
  this.actorLayer = null;
  this.drawFrame();
}
var scale = 20;

DOMDisplay.prototype.drawBackground = function() {
  var table = element("table", "background");
  table.style.width = this.level.width * scale + "px";
  this.level.grid.forEach(function(row) {
    var rowelement = table.appendChild(element("tr"));
    rowelement.style.height = scale + "px";
    row.forEach(function(type) {
      rowelement.appendChild(element("td", type));
    });
  });
  return table;
};

DOMDisplay.prototype.drawActors = function() {
  var wrap = element("div");
  this.level.actors.forEach(function(actor) {
    var rect = wrap.appendChild(element("div",
      "actor " + actor.type));
    rect.style.width = actor.size.x * scale + "px";
    rect.style.height = actor.size.y * scale + "px";
    rect.style.left = actor.pos.x * scale + "px";
    rect.style.top = actor.pos.y * scale + "px";
  });
  return wrap;
};
DOMDisplay.prototype.drawFrame = function() {
  if (this.actorLayer)
    this.wrap.removeChild(this.actorLayer);
  this.actorLayer = this.wrap.appendChild(this.drawActors());
  // By adding the level’s current status as a class name to the wrapper, 
  // we can style the player actor slightly differently when the game is won or lost
  this.wrap.className = "game " + (this.level.status || "");
  this.scrollPlayerIntoView();
};
DOMDisplay.prototype.scrollPlayerIntoView = function() {
  var width = this.wrap.clientWidth;
  var height = this.wrap.clientHeight;
  var margin = width / 3;
  var left = this.wrap.scrollLeft,
    right = left + width;
  var top = this.wrap.scrollTop,
    bottom = top + height;

  var player = this.level.player;
  var center = player.pos.plus(player.size.times(0.5)).times(scale);
  if (center.x < left + margin)
    this.wrap.scrollLeft = center.x - margin;
  else if (center.x > right - margin)
    this.wrap.scrollLeft = center.x + margin - width;

  if (center.y < top + margin)
    this.wrap.scrollTop = center.y - margin;
  else if (center.y > bottom - margin)
    this.wrap.scrollTop = center.y + margin - height;
};
DOMDisplay.prototype.clear = function() {
  this.wrap.parentNode.removeChild(this.wrap);
};

var arrowCodes = {
  37: "left",
  38: "up",
  39: "right",
};

function trackKeys(codes) {
  var pressed = Object.create(null);

  function handler(event) {
    if (codes.hasOwnProperty(event.keyCode)) {
      var down = event.type == "keydown";
      pressed[codes[event.keyCode]] = down;
      event.preventDefault();
    }
  }
  addEventListener("keydown", handler);
  addEventListener("keyup", handler);

  pressed.unregister = function() {
    removeEventListener("keydown", handler);
    removeEventListener("keyup", handler);
  }

  return pressed;
}

function runAnimation(frameFunc) {
  var lastTime = null;

  function frame(time) {
    var stop = false;
    if (lastTime != null) {
      var timeStep = Math.min(time - lastTime, 100) / 1000; // convert to seconds
      stop = frameFunc(timeStep) == false;
    }
    lastTime = time;
    if (!stop)
      requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
function runLevel(level, Display, andThen) {
  var display = new Display(document.body, level);
  var running = "yes";
  function handleEscKey(event) {
    if (event.keyCode == 27) { // ESC's key code is 27
      var handler = arrows.eventListener;
      if (running == "yes") {
        running = "pausing";
      } else if (running == "no") { // resume
        running = "yes";
        runAnimation(animation);
      } else if (running == "pausing") { // not yet stop animation
        running = "yes";
      }
    }
  }
  addEventListener("keydown", handleEscKey);
  var arrows = trackKeys(arrowCodes);

  function animation(step) {
    if (running == "pausing") {
      running = "no";
      return false; // actually pause the game
    }

    level.animate(step, arrows);
    display.drawFrame(step);
    if (level.isFinished()) {
      display.clear();
      removeEventListener("keydown", handleEscKey);
      arrows.unregister();
      if (andThen)
        andThen(level.status);
      return false;
    }
  }

  runAnimation(animation);
}

function runGame(plans, Display) {
  function startLevel(n, lives) {
    runLevel(new Level(plans[n]), Display, function(status) {
      if (status == "lost") {
        if (lives > 0) {
          startLevel(n, lives - 1);
        } else {
          console.log('Game Over!');
          startLevel(0, 3);
        }
      } else if (n < plans.length - 1)
        startLevel(n + 1);
      else
        console.log("You win!");
    });
  }
  startLevel(0, 3);
}

// create game levels here
var GAME_LEVELS = [
[
   "                                                                                            x",
   "                                                                                            x",
   "                                                                xxx                         x",
   "                                                                 v                          x",
   "                                           v        o                                       x",
   "                          o                                                        o        x",
   "                                           o           o                                    x",
   "                          o                                                    o            x",
   "                                                    xxxx                           xx       x",
   "                       xxxxx                                                                x",
   "                    x          x                    o  o                   o   xx           x",
   "xx                 xx          x          xxx                   xxx                         x",
   "x                 xxxx         x           x       xxxxxx                xx                 x",
   "x                xxxx          x           x                                                x",
   "x     @         xxxxx     =    x     =     x                xx     =      xx       =        x",
   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      
  ] ,
[
   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
   "x                                                             xxxxxxxxxxxxxxxx            ",
   "x                                                           xxxx         xxxxxxx          ",
   "x                                                          xxx     o o    v xxxxxx        ",
   "x                                                         xxx                o  xx        ",
   "x                                                         xxx     xxxxx      o  xx        ",
   "x          o                                              xxxx              xxxxx         ",
   "x                                                          xxx          xxxxxxxx          ",
   "x         xxx                                                xxxxxx     v xxx             ",
   "x      o       o                       x     x     x      x        xxx    x               ",
   "x                          o           v     v     v      v           x   x               ",
   "x     xxx     xxx                                                     x   x               ",
   "x                                                                     x  xx               ",
   "x                                                                     x   x               ",
   "xxxx                                      o     o     o               x   x               ",
   "x                       x     x                                       xx  x               ",
   "x      @               xx     xx                                      x   x               ",
   "x    xxxx             xxx     xxx         x     x     x                  xx               ",
   "x                    xxxx     xxxx        x     x     x                   x               ",
   "x=                 =xxxxx  =  xxxxx   =   x  =  x  =  x         =         x               ",
   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  ], 
  ["                                                                xxxxxxx                                    xxx  ",
    "                                                               xxxx     xxxx                        v   v    xxx  ",
    "                                                              xx           xx                                xxx  ",
    "                                                             xx             xx                               xxx  ",
    "                                                             x                                    o   o   o  xxx  ",
    "                                                             x     o   o                                    xxxx  ",
    "                                                 xxx         x                                xxxxxxxxxxxxxxxxxx  ",
    "                                                 xvx         x     x   x                        xxxxxxxxxxxxxxxx  ",
    "                                                             xx  |   |   |  xx            xxxxxxxxxxxxxxxxxxxxx   ",
    "                                                              xxxxxxxxxxxxxxx            v                        ",
    "                                                               xxxxxxxxxxxxx                                      ",
    "                                               x                  xxxxxxx        xxx         xxx                  ",
    "                  o                             x     x                    xxx    x           x x                  ",
    "                                               x     x                             x         x                    ",
    "                                               x     x                        xxx  xx        x                    ",
    "                                               xx    x                             x   x      x                    ",
    "                 xxx                             x     x      o  o     x   x                   x                    ",
    "               xxxxxxx       xxxx   xxx        x     x               x   x         x         x                    ",
    "              xx     xx         x   x          x     x     xxxxxx    x   x   xxxxxxxxx      xx                    ",
    "             xx       xx        x o x          x    xx               x   x   x               x                    ",
    "     @       x         x        x   x          x     x               x   x   x               x                    ",
    "    xxx      x         x        x   x          x     x               x   xxxxx   xxxxxx    xxx                    ",
    "    x x      x         x       xx o xx         x     x               x     o     x x         x                    ",
    "    x x  =   x         x      xx     xx!!!!!!!!xx    x!!!!!!!!!=     x     =     x x         x                    ",
    "xxxxx xxxxxxxx         x=    xx       xxxxxxxxxx     xxxxxxxxxx     =xxxxxxxxxxxxx xx  o o  xx                    ",
    "xxxxx xxxxxxxx         x     x    o                 xxxxxxxxxx                     xx     xx                     ",
    "                       x    =x                     xxxxxxxxxx                       xxxxxxx                      ",
    "                       x     xx       xxxxxxxxxxxxxxxxxxxxxx                                                      ",
    "                       xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx                                                       ",
    "                       xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx                                                        "
  ]
 
 
   
 
 
    
  
 

  
];
runGame(GAME_LEVELS, DOMDisplay);