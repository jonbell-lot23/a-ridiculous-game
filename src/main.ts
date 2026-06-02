import Phaser from 'phaser'
import { ParkScene } from './scenes/ParkScene'

new Phaser.Game({
  type:            Phaser.AUTO,
  width:           390,
  height:          700,
  backgroundColor: '#000033',
  pixelArt:        true,
  antialias:       false,
  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [ParkScene],
})
