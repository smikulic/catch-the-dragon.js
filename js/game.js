;(function() {
  var BLOCK_SIZE = 15;

  var Game = function() {
    var screen = document.getElementById("screen").getContext('2d');

    this.size = { x: screen.canvas.width, y: screen.canvas.height };
    this.center = { x: this.size.x / 2, y: this.size.y / 2 };

    this.bodies = createWalls(this).concat(new Player(this));
    this.addDragon();
    this.showScore = document.getElementById("score");
    this.btnStartGame = document.getElementById("start");

    var self = this;
    var tick = function() {
      self.update();
      self.draw(screen);
      requestAnimationFrame(tick);
    };

    this.btnStartGame.addEventListener('click', function () {
      this.className = "hide";

      tick();
    });
  };

  Game.prototype = {
    update: function() {
      for (var i = 0; i < this.bodies.length; i++) {
        if (this.bodies[i].update !== undefined) {
          this.bodies[i].update();
        }
      }

      reportCollisions(this.bodies);
    },

    draw: function(screen) {
      screen.clearRect(0, 0, this.size.x, this.size.y);
      var bgImage = new Image();
      bgImage.src = "images/bg.png";
      screen.drawImage(bgImage, 0, 0);

      for (var i = 0; i < this.bodies.length; i++) {
        this.bodies[i].draw(screen);
      }
    },

    addBody: function(body) {
      this.bodies.push(body);
    },

    removeBody: function(body) {
      var bodyIndex = this.bodies.indexOf(body);
      if (bodyIndex !== -1) {
        this.bodies.splice(bodyIndex, 1);
      }
    },

    isSquareFree: function(center) {
      return this.bodies.filter(function(b) {
        return isColliding(b, { 
          center: center, 
          size: { x: BLOCK_SIZE, y: BLOCK_SIZE }
        });
      }).length === 0;
    },

    randomSquare: function() {
      return {
        x: Math.floor(this.size.x / BLOCK_SIZE * Math.random()) * BLOCK_SIZE + BLOCK_SIZE / 2,
        y: Math.floor(this.size.y / BLOCK_SIZE * Math.random()) * BLOCK_SIZE + BLOCK_SIZE / 2
      };
    },

    addDragon: function() {
      this.addBody(new Dragon(this));
    },

    handleScore: function(score) {
      this.showScore.innerHTML = score;
    }
  };

  var WallBlock = function(game, center, size) {
    this.game = game;
    this.center = center;
    this.size = size;
  };

  WallBlock.prototype = {
    draw: function(screen) {
      drawRect(screen, this, "black");
    }
  };

  var Dragon = function(game) {
    this.game = game;

    while (this.center === undefined) {
      var center = this.game.randomSquare();
      if (this.game.isSquareFree(center)) {
        this.center = center;
      }
    }

    this.size = { x: BLOCK_SIZE, y: BLOCK_SIZE };
  };

  Dragon.prototype = {
    draw: function(screen) {
      var dragonImage = new Image();
      dragonImage.src = "images/panda.png";
      screen.drawImage(dragonImage, this.center.x - this.size.x / 2, this.center.y - this.size.y / 2);
    },

    collision: function(otherBody) {
      if (otherBody instanceof Player) {
        this.game.removeBody(this);
      }
    }
  };

  var Player = function(game) {
    this.game = game;
    this.center = { x: this.game.center.x, y: this.game.center.y };
    this.direction = { x: 1, y: 0 };
    this.size = { x: BLOCK_SIZE * 1.5, y: BLOCK_SIZE * 1.5 };
    this.score = 0;
    this.blocks = [];

    this.keyboarder = new Keyboarder();
    this.lastMove = 0;
  };

  Player.prototype = {
    update: function() {
      this.handleKeyboard();

      var now = new Date().getTime();
      if (now > this.lastMove + 10) {
        this.move(this.score + 1);
        this.lastMove = now;
      }
    },

    draw: function(screen) {
      var playerImage = new Image();
      playerImage.src = "images/player.gif";
      screen.drawImage(playerImage, this.center.x - this.size.x / 2, this.center.y - this.size.y / 2);
    },

    collision: function(otherBody) {
      if (otherBody instanceof WallBlock) {
        this.die();
      } else if (otherBody instanceof Dragon) {
        this.eat();
      }
    },

    handleKeyboard: function() {
      if (this.keyboarder.isDown(this.keyboarder.KEYS.LEFT) &&
          this.direction.x !== 1) {
        this.direction.x = -1;
        this.direction.y = 0;
      } else if (this.keyboarder.isDown(this.keyboarder.KEYS.RIGHT) &&
                 this.direction.x !== -1) {
        this.direction.x = 1;
        this.direction.y = 0;
      }

      if (this.keyboarder.isDown(this.keyboarder.KEYS.UP) &&
          this.direction.y !== 1) {
        this.direction.y = -1;
        this.direction.x = 0;
      } else if (this.keyboarder.isDown(this.keyboarder.KEYS.DOWN) &&
                 this.direction.y !== -1) {
        this.direction.y = 1;
        this.direction.x = 0;
      }
    },

    move: function(level) {
      this.center.x += this.direction.x * BLOCK_SIZE * (level / 10);
      this.center.y += this.direction.y * BLOCK_SIZE * (level / 10);
    },

    eat: function() {
      this.score++;
      this.game.handleScore(this.score);
      this.game.addDragon();
    },

    die: function() {
      this.game.removeBody(this);
      for (var i = 0; i < this.blocks.length; i++) {
        this.game.removeBody(this.blocks[i]);
      }
      this.game.btnStartGame.innerHTML = "Restart";
      this.game.btnStartGame.className = "btn-start btn-restart";
      this.game.btnStartGame.addEventListener('click', function () {
        location.reload();
      });
    }
  };

  var Keyboarder = function() {
    var keyState = {};

    window.addEventListener('keydown', function(e) {
      keyState[e.keyCode] = true;
    });

    window.addEventListener('keyup', function(e) {
      keyState[e.keyCode] = false;
    });

    this.isDown = function(keyCode) {
      return keyState[keyCode] === true;
    };

    this.KEYS = { LEFT: 37, RIGHT: 39, UP: 38, DOWN: 40 };
  };

  var isColliding = function(b1, b2) {
    return !(
      b1 === b2 ||
        b1.center.x + b1.size.x / 2 <= b2.center.x - b2.size.x / 2 ||
        b1.center.y + b1.size.y / 2 <= b2.center.y - b2.size.y / 2 ||
        b1.center.x - b1.size.x / 2 >= b2.center.x + b2.size.x / 2 ||
        b1.center.y - b1.size.y / 2 >= b2.center.y + b2.size.y / 2
    );
  };

  var reportCollisions = function(bodies) {
    var collisions = [];
    for (var i = 0; i < bodies.length; i++) {
      for (var j = i + 1; j < bodies.length; j++) {
        if (isColliding(bodies[i], bodies[j])) {
          collisions.push([bodies[i], bodies[j]]);
        }
      }
    }

    for (var i = 0; i < collisions.length; i++) {
      if (collisions[i][0].collision !== undefined) {
        collisions[i][0].collision(collisions[i][1]);
      }

      if (collisions[i][1].collision !== undefined) {
        collisions[i][1].collision(collisions[i][0]);
      }
    }
  };

  var createWalls = function(game) {
    var walls = [];
    walls.push(new WallBlock(game,
                             { x: game.center.x, y: BLOCK_SIZE / 8 },
                             { x: game.size.x, y: BLOCK_SIZE / 4 })); // top

    walls.push(new WallBlock(game,
                             { x: game.size.x - BLOCK_SIZE / 8, y: game.center.y },
                             { x: BLOCK_SIZE / 2, y: game.size.y - BLOCK_SIZE * 0.25 })); // right

    walls.push(new WallBlock(game,
                             { x: game.center.x, y: game.size.y - BLOCK_SIZE / 8 },
                             { x: game.size.x, y: BLOCK_SIZE / 4 })); // bottom

    walls.push(new WallBlock(game,
                             { x: BLOCK_SIZE / 8, y: game.center.y },
                             { x: BLOCK_SIZE / 2, y: game.size.y - BLOCK_SIZE * 0.25 })); // left
    return walls;
  };

  var drawRect = function(screen, body, color) {
    screen.fillStyle = color;
    screen.fillRect(body.center.x - body.size.x / 2, body.center.y - body.size.y / 2,
                    body.size.x, body.size.y);
  };

  window.addEventListener('load', function() {
    new Game();
  });

  // Cross-browser support for requestAnimationFrame
  var w = window;
  requestAnimationFrame = w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.msRequestAnimationFrame || w.mozRequestAnimationFrame;
})(this);