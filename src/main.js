import Phaser from "phaser";
import "./style.css";

class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");

    this.started = false;
    this.isGamePaused = false;
    this.score = 0;
    this.level = 1;
    this.energy = 100;
    this.dragonScale = 0.10;
    this.levelTransitioning = false;
    this.gameOver = false;
  }

  resetGameState() {
    this.started = false;
    this.isGamePaused = false;
    this.gameOver = false;
    this.levelTransitioning = false;

    this.score = 0;
    this.level = 1;
    this.energy = 100;
    this.dragonScale = 0.10;

    this.appleTimer = null;
    this.lastShotAt = -10000;
  }

  preload() {
    this.load.image("gardenSky", "assets/garden_sky.png");
    this.load.image("dragon", "assets/little_dragon.png");
    this.load.image("fireball", "assets/fireball.png");
    this.load.image("apple", "assets/apple.png");
    this.load.audio("pew", "assets/pew.wav");
  }

  create() {
    // Phaser's scene.restart() reuses the same Scene instance, so reset all
    // gameplay state explicitly before creating Level 1 again.
    this.resetGameState();

    this.physics.world.resume();
    this.createBackground();

    this.fireballs = this.physics.add.group();
    this.apples = this.physics.add.group();

    this.dragon = this.physics.add
      .sprite(this.scale.width / 2, this.scale.height - 82, "dragon")
      .setScale(this.dragonScale)
      .setDepth(10);

    this.dragon.body.setAllowGravity(false);
    this.dragon.setCollideWorldBounds(true);

    this.createHUD();
    this.createControls();

    this.physics.add.overlap(
      this.fireballs,
      this.apples,
      this.hitApple,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.dragon,
      this.apples,
      this.appleHitsDragon,
      undefined,
      this
    );

    this.input.on("pointermove", (pointer) => {
      if (!this.started || this.isGamePaused || this.levelTransitioning) return;
      this.moveDragon(pointer.x);
    });

    this.input.on("pointerdown", (pointer, currentlyOver) => {
      if (!this.started || this.isGamePaused || this.levelTransitioning) return;
      if (currentlyOver.some((object) => object.getData("uiButton"))) return;

      this.moveDragon(pointer.x);
      this.shoot();
    });

    this.scale.on("resize", (gameSize) => {
      this.relayout(gameSize.width, gameSize.height);
    });

    this.updateHUD();
  }

  createBackground() {
    this.background = this.add
      .image(this.scale.width / 2, this.scale.height / 2, "gardenSky")
      .setDepth(-20);

    this.resizeBackground();
  }

  resizeBackground() {
    const texture = this.textures.get("gardenSky").getSourceImage();
    const coverScale = Math.max(
      this.scale.width / texture.width,
      this.scale.height / texture.height
    );

    this.background
      .setPosition(this.scale.width / 2, this.scale.height / 2)
      .setScale(coverScale);
  }

  getSafeAreaInsets() {
    const styles = getComputedStyle(document.documentElement);

    const readInset = (name) => {
      const value = parseFloat(styles.getPropertyValue(name));
      return Number.isFinite(value) ? value : 0;
    };

    return {
      top: readInset("--safe-area-top"),
      right: readInset("--safe-area-right"),
      bottom: readInset("--safe-area-bottom"),
      left: readInset("--safe-area-left"),
    };
  }

  getResponsiveLayout(width = this.scale.width, height = this.scale.height) {
    const safeArea = this.getSafeAreaInsets();
    const landscape = width > height;
    const narrow = width < 390;

    const sidePadding = Math.max(
      safeArea.left,
      safeArea.right,
      Phaser.Math.Clamp(width * 0.035, 12, 26)
    );

    const topPadding =
      safeArea.top + Phaser.Math.Clamp(height * 0.018, 10, 20);

    const bottomPadding =
      safeArea.bottom + Phaser.Math.Clamp(height * 0.022, 14, 26);

    const hudFont = Math.round(
      Phaser.Math.Clamp(width * (narrow ? 0.047 : 0.042), 14, 21)
    );

    const messageFont = Math.round(
      Phaser.Math.Clamp(
        Math.min(width * 0.075, height * (landscape ? 0.075 : 0.052)),
        20,
        34
      )
    );

    const messageWidth = Math.max(
      210,
      Math.min(width - sidePadding * 2 - 16, landscape ? 620 : 520)
    );

    const smallButtonFont = Math.round(
      Phaser.Math.Clamp(width * 0.046, 15, 21)
    );

    const startButtonFont = Math.round(
      Phaser.Math.Clamp(width * 0.067, 22, 30)
    );

    const energyBarWidth = Math.round(
      Phaser.Math.Clamp(width * 0.29, 86, 130)
    );

    return {
      safeArea,
      landscape,
      narrow,
      sidePadding,
      topPadding,
      bottomPadding,
      hudFont,
      messageFont,
      messageWidth,
      smallButtonFont,
      startButtonFont,
      energyBarWidth,
      hudTop: topPadding,
      energyBarY: topPadding + hudFont + 18,
      bottomButtonY: height - bottomPadding - 18,
      dragonY: height - bottomPadding - 78,
      messageY: landscape ? height * 0.47 : height * 0.39,
    };
  }

  applyResponsiveTextLayout(width = this.scale.width, height = this.scale.height) {
    const layout = this.getResponsiveLayout(width, height);
    this.layout = layout;

    this.scoreText
      .setFontSize(layout.hudFont)
      .setPosition(layout.sidePadding, layout.hudTop);

    this.levelText
      .setFontSize(layout.hudFont)
      .setPosition(width / 2, layout.hudTop);

    this.energyLabel
      .setFontSize(layout.hudFont)
      .setPosition(width - layout.sidePadding, layout.hudTop);

    this.energyBarBackground
      .setPosition(width - layout.sidePadding, layout.energyBarY)
      .setSize(layout.energyBarWidth, 14);

    this.energyBar
      .setPosition(width - layout.sidePadding - 2, layout.energyBarY)
      .setSize(layout.energyBarWidth - 4, 10);

    this.messageText
      .setFontSize(layout.messageFont)
      .setWordWrapWidth(layout.messageWidth, true)
      .setPosition(width / 2, layout.messageY);

    this.startButton
      .setFontSize(layout.startButtonFont)
      .setPadding(
        Math.round(layout.startButtonFont * 0.65),
        Math.round(layout.startButtonFont * 0.36)
      );

    this.pauseButton
      .setFontSize(layout.smallButtonFont)
      .setPadding(
        Math.round(layout.smallButtonFont * 0.55),
        Math.round(layout.smallButtonFont * 0.34)
      )
      .setPosition(
        layout.sidePadding + this.pauseButton.displayWidth / 2,
        layout.bottomButtonY
      );

    this.restartButton
      .setFontSize(layout.smallButtonFont)
      .setPadding(
        Math.round(layout.smallButtonFont * 0.55),
        Math.round(layout.smallButtonFont * 0.34)
      )
      .setPosition(
        width - layout.sidePadding - this.restartButton.displayWidth / 2,
        layout.bottomButtonY
      );

    if (this.startButton.visible) {
      this.startButton.setPosition(
        width / 2,
        this.gameOver ? height * 0.61 : height / 2
      );
    }

    this.dragon.y = layout.dragonY;
    this.updateHUD();
  }

  createHUD() {
    const layout = this.getResponsiveLayout();

    const hudStyle = {
      fontFamily: "Arial",
      fontSize: `${layout.hudFont}px`,
      color: "#ffffff",
      stroke: "#5d417b",
      strokeThickness: 5,
    };

    this.scoreText = this.add
      .text(layout.sidePadding, layout.hudTop, "", hudStyle)
      .setDepth(30);

    this.levelText = this.add
      .text(this.scale.width / 2, layout.hudTop, "", hudStyle)
      .setOrigin(0.5, 0)
      .setDepth(30);

    this.energyLabel = this.add
      .text(
        this.scale.width - layout.sidePadding,
        layout.hudTop,
        "Energy",
        hudStyle
      )
      .setOrigin(1, 0)
      .setDepth(30);

    this.energyBarBackground = this.add
      .rectangle(
        this.scale.width - layout.sidePadding,
        layout.energyBarY,
        layout.energyBarWidth,
        14,
        0x4c355f,
        0.85
      )
      .setOrigin(1, 0.5)
      .setDepth(29);

    this.energyBar = this.add
      .rectangle(
        this.scale.width - layout.sidePadding - 2,
        layout.energyBarY,
        layout.energyBarWidth - 4,
        10,
        0xffd966,
        1
      )
      .setOrigin(1, 0.5)
      .setDepth(30);

    this.messageText = this.add
      .text(this.scale.width / 2, layout.messageY, "", {
        fontFamily: "Arial",
        fontStyle: "bold",
        fontSize: `${layout.messageFont}px`,
        align: "center",
        color: "#ffffff",
        stroke: "#6c4d8c",
        strokeThickness: 7,
        backgroundColor: "rgba(70, 43, 98, 0.48)",
        padding: {
          left: 14,
          right: 14,
          top: 10,
          bottom: 10,
        },
        wordWrap: {
          width: layout.messageWidth,
          useAdvancedWrap: true,
        },
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setVisible(false);
  }

  createControls() {
    const layout = this.getResponsiveLayout();

    this.startButton = this.makeButton(
      this.scale.width / 2,
      this.scale.height / 2,
      "START",
      () => this.startGame(),
      layout.startButtonFont
    );

    this.pauseButton = this.makeButton(
      layout.sidePadding + 48,
      layout.bottomButtonY,
      "Pause",
      () => this.togglePause(),
      layout.smallButtonFont
    ).setVisible(false);

    this.restartButton = this.makeButton(
      this.scale.width - layout.sidePadding - 52,
      layout.bottomButtonY,
      "Restart",
      () => this.restartGame(),
      layout.smallButtonFont
    ).setVisible(false);

    this.applyResponsiveTextLayout();
  }

  makeButton(x, y, label, action, fontSize) {
    const button = this.add
      .text(x, y, label, {
        fontFamily: "Arial",
        fontStyle: "bold",
        fontSize: `${fontSize}px`,
        color: "#ffffff",
        backgroundColor: "#7655a8",
        padding: { left: 15, right: 15, top: 9, bottom: 9 },
      })
      .setOrigin(0.5)
      .setDepth(60)
      .setInteractive({ useHandCursor: true });

    button.setData("uiButton", true);
    button.on("pointerdown", action);
    button.on("pointerover", () => button.setScale(1.05));
    button.on("pointerout", () => button.setScale(1));

    return button;
  }

  getLevelSettings() {
    const settings = {
      1: {
        appleSpeedMin: 120,
        appleSpeedMax: 155,
        spawnDelay: 1200,
        scoreToAdvance: 8,
        missedAppleEnergyLoss: 0,
        hitEnergyLoss: 8,
        fireballSpeed: 540,
        shotCooldown: 240,
      },
      2: {
        appleSpeedMin: 150,
        appleSpeedMax: 190,
        spawnDelay: 1050,
        scoreToAdvance: 18,
        missedAppleEnergyLoss: 0,
        hitEnergyLoss: 9,
        fireballSpeed: 590,
        shotCooldown: 220,
      },
      3: {
        appleSpeedMin: 185,
        appleSpeedMax: 230,
        spawnDelay: 900,
        scoreToAdvance: 30,
        missedAppleEnergyLoss: 2,
        hitEnergyLoss: 11,
        fireballSpeed: 640,
        shotCooldown: 200,
      },
      4: {
        appleSpeedMin: 220,
        appleSpeedMax: 270,
        spawnDelay: 780,
        scoreToAdvance: 45,
        missedAppleEnergyLoss: 3,
        hitEnergyLoss: 13,
        fireballSpeed: 700,
        shotCooldown: 180,
      },
      5: {
        appleSpeedMin: 255,
        appleSpeedMax: 315,
        spawnDelay: 680,
        scoreToAdvance: 63,
        missedAppleEnergyLoss: 4,
        hitEnergyLoss: 15,
        fireballSpeed: 760,
        shotCooldown: 160,
      },
      6: {
        appleSpeedMin: 295,
        appleSpeedMax: 360,
        spawnDelay: 600,
        scoreToAdvance: 84,
        missedAppleEnergyLoss: 5,
        hitEnergyLoss: 17,
        fireballSpeed: 830,
        shotCooldown: 145,
      },
      7: {
        appleSpeedMin: 335,
        appleSpeedMax: 410,
        spawnDelay: 525,
        scoreToAdvance: 108,
        missedAppleEnergyLoss: 6,
        hitEnergyLoss: 19,
        fireballSpeed: 900,
        shotCooldown: 130,
      },
      8: {
        appleSpeedMin: 380,
        appleSpeedMax: 465,
        spawnDelay: 460,
        scoreToAdvance: Number.POSITIVE_INFINITY,
        missedAppleEnergyLoss: 7,
        hitEnergyLoss: 22,
        fireballSpeed: 980,
        shotCooldown: 115,
      },
    };

    return settings[this.level];
  }

  startGame() {
    if (this.gameOver) {
      this.restartGame();
      return;
    }

    if (this.started) return;

    this.started = true;
    this.startButton.setVisible(false);
    this.pauseButton.setVisible(true);
    this.restartButton.setVisible(true);

    this.showMessage("Level 1", 900);
    this.startAppleTimer();
  }

  startAppleTimer() {
    if (this.appleTimer) {
      this.appleTimer.remove(false);
    }

    const settings = this.getLevelSettings();

    this.appleTimer = this.time.addEvent({
      delay: settings.spawnDelay,
      loop: true,
      callback: () => this.spawnApple(),
    });
  }

  spawnApple() {
    if (!this.started || this.isGamePaused || this.levelTransitioning) return;

    const settings = this.getLevelSettings();
    const padding = 34;

    const apple = this.apples.create(
      Phaser.Math.Between(padding, this.scale.width - padding),
      -35,
      "apple"
    );

    apple.setScale(0.0625);
    apple.setVelocityY(
      Phaser.Math.Between(settings.appleSpeedMin, settings.appleSpeedMax)
    );
    apple.body.setAllowGravity(false);
    apple.setDepth(8);
    apple.setData("countedAsMissed", false);
  }

  shoot() {
    const settings = this.getLevelSettings();
    const now = this.time.now;

    // Prevent accidental duplicate shots, while allowing faster firing
    // as the player reaches higher levels.
    if (now - this.lastShotAt < settings.shotCooldown) return;
    this.lastShotAt = now;

    const fireball = this.fireballs.create(
      this.dragon.x,
      this.dragon.y - this.dragon.displayHeight / 2,
      "fireball"
    );

    fireball.setScale(0.1);
    fireball.setVelocityY(-settings.fireballSpeed);
    fireball.body.setAllowGravity(false);
    fireball.setDepth(9);

    this.sound.play("pew", { volume: 0.35 });
  }

  moveDragon(x) {
    const halfWidth = this.dragon.displayWidth / 2;
    this.dragon.x = Phaser.Math.Clamp(
      x,
      halfWidth,
      this.scale.width - halfWidth
    );
  }

  hitApple(fireball, apple) {
    if (!fireball.active || !apple.active) return;

    fireball.destroy();
    apple.destroy();

    this.score += 1;
    this.energy = Math.min(100, this.energy + 1);
    this.updateHUD();
    this.checkLevelProgress();
  }

  appleHitsDragon(dragon, apple) {
    if (!apple.active || this.levelTransitioning) return;

    apple.destroy();

    const settings = this.getLevelSettings();

    this.energy = Math.max(0, this.energy - settings.hitEnergyLoss);
    this.dragonScale = Math.max(0.045, this.dragonScale * 0.88);
    this.dragon.setScale(this.dragonScale);

    this.cameras.main.shake(130, 0.008);
    this.dragon.setTint(0xffa6b7);

    this.time.delayedCall(180, () => {
      if (this.dragon?.active) {
        this.dragon.clearTint();
      }
    });

    this.updateHUD();
    this.checkGameOver();
  }

  handleMissedApple(apple) {
    if (!apple.active || apple.getData("countedAsMissed")) return;

    apple.setData("countedAsMissed", true);

    const settings = this.getLevelSettings();

    if (settings.missedAppleEnergyLoss > 0) {
      this.energy = Math.max(0, this.energy - settings.missedAppleEnergyLoss);
      this.updateHUD();
      this.checkGameOver();
    }

    apple.destroy();
  }

  checkLevelProgress() {
    const settings = this.getLevelSettings();

    if (
      this.level < 8 &&
      this.score >= settings.scoreToAdvance &&
      !this.levelTransitioning
    ) {
      this.advanceLevel();
    }
  }

  advanceLevel() {
    this.levelTransitioning = true;
    this.level += 1;

    this.physics.world.pause();
    this.appleTimer.paused = true;
    this.apples.clear(true, true);
    this.fireballs.clear(true, true);

    this.energy = Math.min(100, this.energy + 20);
    this.dragonScale = Math.min(0.10, this.dragonScale + 0.012);
    this.dragon.setScale(this.dragonScale);
    this.updateHUD();

    const levelMessage =
      this.level === 3
        ? "Fallen apples drain energy!"
        : "Faster apples and fireballs!";

    this.showMessage(`Level ${this.level}\n${levelMessage}`, 1500);

    this.time.delayedCall(1550, () => {
      this.physics.world.resume();
      this.levelTransitioning = false;
      this.startAppleTimer();
    });
  }

  checkGameOver() {
    if (this.energy > 0 || this.gameOver) return;

    this.gameOver = true;
    this.started = false;
    this.isGamePaused = false;
    this.physics.world.pause();

    if (this.appleTimer) {
      this.appleTimer.paused = true;
    }

    this.apples.clear(true, true);
    this.fireballs.clear(true, true);

    this.showMessage(`Game Over
Score: ${this.score}`, 0);

    this.pauseButton.setVisible(false);
    this.restartButton.setVisible(false);

    this.startButton
      .setText("PLAY AGAIN")
      .setPosition(this.scale.width / 2, this.scale.height * 0.58)
      .setVisible(true);
  }

  showMessage(message, duration) {
    this.messageText.setText(message).setVisible(true);

    if (duration > 0) {
      this.time.delayedCall(duration, () => {
        if (this.messageText?.active) {
          this.messageText.setVisible(false);
        }
      });
    }
  }

  togglePause() {
    if (!this.started || this.levelTransitioning) return;

    this.isGamePaused = !this.isGamePaused;

    if (this.isGamePaused) {
      this.physics.world.pause();
      this.appleTimer.paused = true;
      this.pauseButton.setText("Resume");
      this.showMessage("Paused", 0);
    } else {
      this.physics.world.resume();
      this.appleTimer.paused = false;
      this.pauseButton.setText("Pause");
      this.messageText.setVisible(false);
    }
  }

  restartGame() {
    if (this.appleTimer) {
      this.appleTimer.remove(false);
      this.appleTimer = null;
    }

    this.apples?.clear(true, true);
    this.fireballs?.clear(true, true);

    this.physics.world.resume();
    this.scene.restart();
  }

  updateHUD() {
    this.scoreText.setText(`Score: ${this.score}`);
    this.levelText.setText(`Level ${this.level}/8`);

    const energyRatio = Phaser.Math.Clamp(this.energy / 100, 0, 1);
    const maxEnergyWidth = Math.max(1, (this.layout?.energyBarWidth ?? 130) - 4);
    this.energyBar.width = maxEnergyWidth * energyRatio;

    if (this.energy > 60) {
      this.energyBar.fillColor = 0xffd966;
    } else if (this.energy > 30) {
      this.energyBar.fillColor = 0xffa94d;
    } else {
      this.energyBar.fillColor = 0xff5d73;
    }
  }

  relayout(width, height) {
    this.resizeBackground();

    const layout = this.getResponsiveLayout(width, height);
    this.layout = layout;

    this.dragon.setPosition(
      Phaser.Math.Clamp(
        this.dragon.x,
        this.dragon.displayWidth / 2,
        width - this.dragon.displayWidth / 2
      ),
      layout.dragonY
    );

    this.applyResponsiveTextLayout(width, height);
  }

  update() {
    this.fireballs?.children.each((fireball) => {
      if (fireball.active && fireball.y < -80) {
        fireball.destroy();
      }
    });

    this.apples?.children.each((apple) => {
      if (apple.active && apple.y > this.scale.height + 55) {
        this.handleMissedApple(apple);
      }
    });
  }
}

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#8d6bc4",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: GameScene,
};

new Phaser.Game(config);
