import { Game } from './core/Game.js';

const game = new Game();
game.init().catch((err) => {
  console.error(err);
  const el = document.getElementById('loading-text');
  if (el) el.textContent = 'فشل تحميل اللعبة: ' + err.message;
});