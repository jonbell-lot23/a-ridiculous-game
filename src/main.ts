import Phaser from 'phaser'
import { ParkScene } from './scenes/ParkScene'

new Phaser.Game({
  type:            Phaser.AUTO,
  backgroundColor: '#000033',
  pixelArt:        true,
  antialias:       false,
  scale: {
    mode:       Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width:      '100%',
    height:     '100%',
  },
  scene: [ParkScene],
})
