import Phaser from 'phaser'
import { ParkScene } from './scenes/ParkScene'

new Phaser.Game({
  type:            Phaser.AUTO,
  width:           360,
  height:          640,
  backgroundColor: '#000033',
  pixelArt:        true,
  antialias:       false,
  width:  390,
  height: 700,
  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [ParkScene],
})
