// EMBERFALL renderer: every pixel the game shows is drawn here on one
// 1280x720 canvas — the felt table, the enemy portraits, the cards, the
// HUD and every screen. Drawing a frame also records the clickable regions
// (G.hits) that input.js tests against.

import { CARD_TYPES, COLORS, VIEW_W, VIEW_H, CARD_W, CARD_H, CARD_SMALL_W, CARD_SMALL_H, STAGE_NAMES } from './config.js';
import { cardDef } from './cards.js';
import { isMuted } from './audio.js';
import { shakeOffset } from './anim.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, font, color, align = 'center', baseline = 'middle') {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(str, x, y);
}

function wrapText(ctx, str, maxWidth) {
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// The four suit shapes: sword, shield, star, plus. Drawn, never text.
export function drawShape(ctx, shape, cx, cy, size, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.08);
  if (shape === 'sword') {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.22, -size * 0.3);
    ctx.lineTo(size * 0.22, size * 0.45);
    ctx.lineTo(-size * 0.22, size * 0.45);
    ctx.lineTo(-size * 0.22, -size * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-size * 0.55, size * 0.45, size * 1.1, size * 0.18);
    ctx.fillRect(-size * 0.1, size * 0.6, size * 0.2, size * 0.4);
  } else if (shape === 'shield') {
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.8, -size * 0.6);
    ctx.lineTo(size * 0.8, size * 0.1);
    ctx.quadraticCurveTo(size * 0.8, size * 0.7, 0, size);
    ctx.quadraticCurveTo(-size * 0.8, size * 0.7, -size * 0.8, size * 0.1);
    ctx.lineTo(-size * 0.8, -size * 0.6);
    ctx.closePath();
    ctx.fill();
  } else if (shape === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const r = i % 2 === 0 ? size : size * 0.45;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else if (shape === 'plus') {
    const t = size * 0.36;
    ctx.fillRect(-t, -size, t * 2, size * 2);
    ctx.fillRect(-size, -t, size * 2, t * 2);
  }
  ctx.restore();
}

function drawCostOrb(ctx, x, y, r, cost, affordable) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = affordable ? '#2b6cb0' : '#8a8a8a';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#f4ead3';
  ctx.stroke();
  text(ctx, String(cost), x, y + 1, `bold ${Math.round(r * 1.05)}px Georgia, serif`, '#ffffff');
}

function drawCardFace(ctx, def, x, y, w, h, opts = {}) {
  const type = CARD_TYPES[def.type];
  const affordable = opts.affordable !== false;
  ctx.save();
  ctx.shadowColor = COLORS.shadow;
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fillStyle = COLORS.parchment;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, x, y, w, h, 12);
  ctx.lineWidth = 2;
  ctx.strokeStyle = affordable ? type.dark : '#999999';
  ctx.stroke();

  // Header band in the type colour.
  ctx.save();
  roundRect(ctx, x + 2, y + 2, w - 4, h * 0.3, 10);
  ctx.clip();
  ctx.fillStyle = type.color;
  ctx.fillRect(x + 2, y + 2, w - 4, h * 0.3);
  ctx.restore();

  // Shape icon in the header.
  drawShape(ctx, type.shape, x + w / 2, y + h * 0.16, Math.min(w, h) * 0.11, 'rgba(255,255,255,0.9)');
  // Name.
  text(ctx, def.name, x + w / 2, y + h * 0.3 + 12, `bold ${Math.round(w * 0.115)}px Georgia, serif`, COLORS.ink);
  // Type label.
  text(ctx, type.label, x + w / 2, y + h * 0.3 + 30, `bold ${Math.round(w * 0.075)}px Verdana, sans-serif`, type.dark);
  // Effect text, wrapped.
  ctx.font = `${Math.round(w * 0.088)}px Verdana, sans-serif`;
  ctx.fillStyle = COLORS.inkSoft;
  const lines = wrapText(ctx, def.text, w - 18);
  const startY = y + h * 0.3 + 48;
  lines.forEach((line, i) => {
    text(ctx, line, x + w / 2, startY + i * Math.round(w * 0.105), `${Math.round(w * 0.088)}px Verdana, sans-serif`, COLORS.inkSoft);
  });
  // Big number at the bottom: damage / block / heal / draw.
  const big = def.damage ? `${def.damage}` : def.block ? `${def.block}` : def.heal ? `+${def.heal}` : def.draw ? `+${def.draw}` : '';
  if (big) {
    text(ctx, big, x + w / 2, y + h - 16, `bold ${Math.round(w * 0.19)}px Georgia, serif`, type.dark);
  }
  // Cost orb, top-left.
  drawCostOrb(ctx, x + 16, y + 16, 14, def.cost, affordable);
  if (opts.dim) {
    roundRect(ctx, x, y, w, h, 12);
    ctx.fillStyle = 'rgba(20, 20, 20, 0.35)';
    ctx.fill();
  }
}

// The enemy's intent cards: small, face up, showing what it will play.
function drawIntentCard(ctx, intent, x, y) {
  const w = CARD_SMALL_W;
  const h = CARD_SMALL_H;
  const color = intent.kind === 'attack' ? '#b3372c' : intent.kind === 'guard' ? '#2e6da4' : '#6b4a8f';
  ctx.save();
  ctx.shadowColor = COLORS.shadow;
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = '#efe6d0';
  ctx.fill();
  ctx.restore();
  roundRect(ctx, x, y, w, h, 10);
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 2, w - 4, 26);
  text(ctx, intent.kind.toUpperCase(), x + w / 2, y + 15, 'bold 10px Verdana, sans-serif', '#ffffff');
  text(ctx, intent.name, x + w / 2, y + 48, 'bold 13px Georgia, serif', COLORS.ink);
  ctx.font = '11px Verdana, sans-serif';
  const lines = wrapText(ctx, intent.text, w - 14);
  lines.forEach((line, i) => {
    text(ctx, line, x + w / 2, y + 72 + i * 15, '11px Verdana, sans-serif', COLORS.inkSoft);
  });
  text(ctx, String(intent.value), x + w / 2, y + h - 20, 'bold 26px Georgia, serif', color);
}

function drawHealthBar(ctx, x, y, w, h, hp, maxHp, label) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fill();
  const frac = Math.max(0, hp / maxHp);
  if (frac > 0) {
    roundRect(ctx, x + 2, y + 2, (w - 4) * frac, h - 4, (h - 4) / 2);
    ctx.fillStyle = frac > 0.5 ? COLORS.hpGreen : frac > 0.25 ? '#e8a13c' : COLORS.hpRed;
    ctx.fill();
  }
  text(ctx, `${label}  ${hp} / ${maxHp}`, x + w / 2, y + h / 2 + 1, `bold ${Math.round(h * 0.62)}px Verdana, sans-serif`, '#ffffff');
}

function drawButton(ctx, id, x, y, w, h, label, opts = {}) {
  const hover = opts.hover;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = opts.disabled ? '#6b6b6b' : hover ? COLORS.gold : COLORS.goldDark;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#f4ead3';
  ctx.stroke();
  text(ctx, label, x + w / 2, y + h / 2 + 1, `bold ${opts.fontSize || 18}px Georgia, serif`, opts.disabled ? '#cccccc' : '#241a10');
  return { id, x, y, w, h, data: opts.data };
}

function drawBackground(ctx, time) {
  const grad = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 120, VIEW_W / 2, VIEW_H / 2, 820);
  grad.addColorStop(0, COLORS.feltLight);
  grad.addColorStop(0.6, COLORS.felt);
  grad.addColorStop(1, COLORS.feltDark);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Table trim.
  ctx.strokeStyle = COLORS.tableEdge;
  ctx.lineWidth = 18;
  ctx.strokeRect(9, 9, VIEW_W - 18, VIEW_H - 18);
  ctx.strokeStyle = COLORS.goldDark;
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, VIEW_W - 44, VIEW_H - 44);
  // Faint ember glow drifting across the felt.
  const gx = VIEW_W * (0.5 + 0.28 * Math.sin(time * 0.11));
  const gy = VIEW_H * (0.5 + 0.2 * Math.cos(time * 0.09));
  const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, 260);
  glow.addColorStop(0, 'rgba(232, 182, 76, 0.10)');
  glow.addColorStop(1, 'rgba(232, 182, 76, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

// Procedural enemy portraits: one silhouette per foe, drawn from shapes.
function drawEnemyArt(ctx, enemy, cx, cy, s, time) {
  const bob = Math.sin(time * 1.6) * 4 * s;
  const pal = enemy.def.palette;
  ctx.save();
  ctx.translate(cx, cy + bob);
  ctx.scale(s, s);
  if (enemy.def.id === 'imp') {
    // Horned imp: round body, horns, tail, glowing eyes.
    ctx.fillStyle = pal.body;
    ctx.beginPath();
    ctx.ellipse(0, 10, 62, 58, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 34, 44, 34, 0, 0, Math.PI * 2);
    ctx.fillStyle = pal.belly;
    ctx.fill();
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.moveTo(-48, -34);
    ctx.quadraticCurveTo(-62, -72, -34, -58);
    ctx.quadraticCurveTo(-44, -40, -48, -34);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(48, -34);
    ctx.quadraticCurveTo(62, -72, 34, -58);
    ctx.quadraticCurveTo(44, -40, 48, -34);
    ctx.fill();
    ctx.strokeStyle = pal.body;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(56, 44);
    ctx.quadraticCurveTo(92, 52, 84, 18);
    ctx.stroke();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(-20, -6, 7, 0, Math.PI * 2);
    ctx.arc(20, -6, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.arc(-20, -6, 3, 0, Math.PI * 2);
    ctx.arc(20, -6, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.def.id === 'warden') {
    // Ash warden: broad armoured body, pauldrons, shield.
    ctx.fillStyle = pal.body;
    ctx.beginPath();
    ctx.moveTo(-58, 66);
    ctx.lineTo(-58, -10);
    ctx.quadraticCurveTo(-58, -52, 0, -52);
    ctx.quadraticCurveTo(58, -52, 58, -10);
    ctx.lineTo(58, 66);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = pal.belly;
    ctx.beginPath();
    ctx.ellipse(0, 22, 34, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.arc(-52, -34, 20, 0, Math.PI * 2);
    ctx.arc(52, -34, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.body;
    ctx.beginPath();
    ctx.arc(0, -30, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(-10, -32, 4, 0, Math.PI * 2);
    ctx.arc(10, -32, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.moveTo(-86, -6);
    ctx.lineTo(-58, -26);
    ctx.lineTo(-58, 44);
    ctx.lineTo(-86, 30);
    ctx.closePath();
    ctx.fill();
  } else if (enemy.def.id === 'herald') {
    // Gloom herald: hooded figure with a staff.
    ctx.fillStyle = pal.body;
    ctx.beginPath();
    ctx.moveTo(0, -72);
    ctx.quadraticCurveTo(44, -52, 40, 10);
    ctx.lineTo(52, 70);
    ctx.lineTo(-52, 70);
    ctx.lineTo(-40, 10);
    ctx.quadraticCurveTo(-44, -52, 0, -72);
    ctx.fill();
    ctx.fillStyle = '#1c1426';
    ctx.beginPath();
    ctx.ellipse(0, -38, 26, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.arc(-9, -40, 4, 0, Math.PI * 2);
    ctx.arc(9, -40, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = pal.belly;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(58, -58);
    ctx.lineTo(58, 70);
    ctx.stroke();
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.arc(58, -64, 10, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // The Hollow King: crowned, robed, gold trim.
    ctx.fillStyle = pal.body;
    ctx.beginPath();
    ctx.moveTo(-56, 70);
    ctx.lineTo(-44, -30);
    ctx.quadraticCurveTo(0, -56, 44, -30);
    ctx.lineTo(56, 70);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = pal.belly;
    ctx.beginPath();
    ctx.ellipse(0, 26, 30, 38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.moveTo(-30, -48);
    ctx.lineTo(-30, -74);
    ctx.lineTo(-15, -58);
    ctx.lineTo(0, -80);
    ctx.lineTo(15, -58);
    ctx.lineTo(30, -74);
    ctx.lineTo(30, -48);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0f0d12';
    ctx.beginPath();
    ctx.arc(-10, -30, 4, 0, Math.PI * 2);
    ctx.arc(10, -30, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.accent;
    ctx.fillRect(-46, 58, 92, 6);
  }
  ctx.restore();
  // Kindle flame above a kindled foe.
  if (enemy.kindled) {
    const fx = cx + 74 * s;
    const fy = cy - 66 * s + Math.sin(time * 5) * 3;
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath();
    ctx.moveTo(fx, fy - 16);
    ctx.quadraticCurveTo(fx + 12, fy + 2, fx + 6, fy + 12);
    ctx.quadraticCurveTo(fx, fy + 20, fx - 6, fy + 12);
    ctx.quadraticCurveTo(fx - 12, fy + 2, fx, fy - 16);
    ctx.fill();
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.arc(fx, fy + 8, 4, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, 'KINDLED', fx, fy + 30, 'bold 10px Verdana, sans-serif', '#ff9f1c');
  }
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTopBar(ctx, G) {
  text(ctx, `STAGE ${G.run.stage + 1} · ${STAGE_NAMES[G.run.stage]}`, 40, 44, 'bold 15px Verdana, sans-serif', COLORS.gold, 'left');
  text(ctx, `SCORE  ${G.run.score}`, VIEW_W - 200, 44, 'bold 16px Verdana, sans-serif', '#ffffff', 'left');
  const muteLabel = isMuted() ? 'SOUND OFF' : 'SOUND ON';
  G.hits.push(drawButton(ctx, 'btn-mute', VIEW_W - 186, 60, 146, 30, muteLabel, { fontSize: 12 }));
}

function drawTitle(ctx, G) {
  drawBackground(ctx, G.time);
  drawParticles(ctx, G.particles);
  text(ctx, 'EMBERFALL', VIEW_W / 2, 190, 'bold 92px Georgia, serif', COLORS.gold);
  text(ctx, 'A roguelike deck-builder · four foes stand between you and the Hollow Throne', VIEW_W / 2, 248, '17px Georgia, serif', '#f4ead3');
  // Three sample cards, fanned, as the title's centrepiece.
  const samples = ['strike', 'spark', 'guard'];
  samples.forEach((id, i) => {
    const cx = VIEW_W / 2 + (i - 1) * 150;
    ctx.save();
    ctx.translate(cx, 400);
    ctx.rotate((i - 1) * 0.08);
    drawCardFace(ctx, cardDef(id), -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, {});
    ctx.restore();
  });
  const bw = 260;
  const bx = VIEW_W / 2 - bw / 2;
  G.hits.push(drawButton(ctx, 'btn-new', bx, 540, bw, 46, G.hasSave ? 'NEW RUN' : 'PLAY', {}));
  if (G.hasSave) {
    G.hits.push(drawButton(ctx, 'btn-continue', bx, 594, bw, 46, 'CONTINUE', {}));
  }
  G.hits.push(drawButton(ctx, 'btn-how', bx, G.hasSave ? 648 : 594, bw, 46, 'HOW TO PLAY', {}));
  if (G.bestScore > 0) {
    text(ctx, `BEST SCORE  ${G.bestScore}`, VIEW_W / 2, G.hasSave ? 706 : 660, 'bold 14px Verdana, sans-serif', COLORS.gold);
  }
  text(ctx, 'Mouse + keyboard · 1-5 play a card · E end turn · Esc pause · M mute', VIEW_W / 2, 44, '13px Verdana, sans-serif', 'rgba(244,234,211,0.75)');
}

function drawHowTo(ctx, G) {
  drawBackground(ctx, G.time);
  roundRect(ctx, 190, 70, 900, 580, 16);
  ctx.fillStyle = 'rgba(20, 26, 18, 0.92)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLORS.goldDark;
  ctx.stroke();
  text(ctx, 'HOW TO PLAY', VIEW_W / 2, 112, 'bold 30px Georgia, serif', COLORS.gold);
  const lines = [
    'You are the last Ember Knight. Fight through 4 stages to the Hollow King.',
    'Each turn you gain 3 Energy and draw 5 cards. Click a card (or press 1-5) to play it.',
    'ATTACK cards (red, sword) deal damage. GUARD cards (blue, shield) gain Block.',
    'SPARK cards (gold, star) Kindle the foe: your next attack deals +2. Play 2 Sparks',
    'in one turn to trigger an Ember Burst for 8 damage. HEAL cards (green, +) restore HP.',
    'The foe reveals its next 2 moves face up — read them and counter: Guard before',
    'a big hit, or finish it before it strikes. Block fades at the start of your turn.',
    'Win a battle to pick a new card and heal 6 HP. Lose, and the run ends —',
    'but your best score is kept. Good luck, Knight.',
  ];
  ctx.font = '16px Verdana, sans-serif';
  lines.forEach((line, i) => {
    text(ctx, line, VIEW_W / 2, 160 + i * 32, '16px Verdana, sans-serif', '#f4ead3');
  });
  G.hits.push(drawButton(ctx, 'btn-close-how', VIEW_W / 2 - 110, 560, 220, 44, 'BACK', {}));
}

function drawMap(ctx, G) {
  drawBackground(ctx, G.time);
  drawTopBar(ctx, G);
  text(ctx, 'THE ROAD TO THE HOLLOW THRONE', VIEW_W / 2, 110, 'bold 28px Georgia, serif', COLORS.gold);
  text(ctx, `HP  ${G.run.hp} / ${G.run.maxHp}    ·    Deck  ${G.run.deck.length} cards    ·    Battles won  ${G.run.battlesWon}`, VIEW_W / 2, 148, '16px Verdana, sans-serif', '#f4ead3');
  const nodes = [
    { x: 200, y: 420, label: 'Ember Gate', foe: 'Cinder Imp' },
    { x: 500, y: 300, label: 'Ashen Halls', foe: 'Ash Warden' },
    { x: 800, y: 420, label: 'Gloom Spire', foe: 'Gloom Herald' },
    { x: 1080, y: 300, label: 'Hollow Throne', foe: 'The Hollow King' },
  ];
  ctx.strokeStyle = 'rgba(232,182,76,0.5)';
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(nodes[0].x, nodes[0].y);
  for (let i = 1; i < nodes.length; i += 1) ctx.lineTo(nodes[i].x, nodes[i].y);
  ctx.stroke();
  ctx.setLineDash([]);
  nodes.forEach((node, i) => {
    const done = i < G.run.stage;
    const current = i === G.run.stage;
    ctx.beginPath();
    ctx.arc(node.x, node.y, current ? 46 : 38, 0, Math.PI * 2);
    ctx.fillStyle = done ? '#3d8b4f' : current ? COLORS.gold : '#4a4a4a';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f4ead3';
    ctx.stroke();
    text(ctx, done ? '✓' : String(i + 1), node.x, node.y + 2, 'bold 26px Georgia, serif', '#ffffff');
    text(ctx, node.label, node.x, node.y + 68, 'bold 15px Verdana, sans-serif', current ? COLORS.gold : '#f4ead3');
    text(ctx, node.foe, node.x, node.y + 90, '13px Verdana, sans-serif', 'rgba(244,234,211,0.8)');
    if (current) {
      G.hits.push({ id: 'btn-map-node', x: node.x - 52, y: node.y - 52, w: 104, h: 104, data: { stage: i } });
      text(ctx, '▼  CLICK TO FIGHT  ▼', node.x, node.y + 122, 'bold 12px Verdana, sans-serif', COLORS.gold);
    }
  });
  text(ctx, 'Your deck grows after every victory. Rest well — the King does not.', VIEW_W / 2, 600, '15px Georgia, serif', 'rgba(244,234,211,0.8)');
  G.hits.push(drawButton(ctx, 'btn-title', 40, VIEW_H - 64, 160, 40, 'TITLE', { fontSize: 14 }));
}

function handLayout(hand) {
  const n = hand.length;
  const cx = VIEW_W / 2;
  const baseY = 500;
  const spacing = Math.min(142, Math.min(1080, (n - 1) * 118 + CARD_W) / Math.max(1, n));
  return hand.map((card, i) => {
    const offset = i - (n - 1) / 2;
    return {
      uid: card.uid,
      x: cx + offset * spacing - CARD_W / 2,
      y: baseY + Math.abs(offset) * 7,
      rot: offset * 0.045,
    };
  });
}

function drawBattle(ctx, G) {
  const b = G.battle;
  drawBackground(ctx, G.time);
  const shake = shakeOffset(G.anim);
  ctx.save();
  ctx.translate(shake.x, shake.y);
  drawTopBar(ctx, G);

  // Enemy portrait + bars.
  const ex = 560;
  const ey = 235;
  drawEnemyArt(ctx, b.enemy, ex, ey, 1.15, G.time);
  text(ctx, b.enemy.def.name, ex, 84, 'bold 24px Georgia, serif', '#ffffff');
  text(ctx, b.enemy.def.title, ex, 108, '13px Georgia, serif', 'rgba(244,234,211,0.8)');
  drawHealthBar(ctx, ex - 130, 122, 260, 22, b.enemy.hp, b.enemy.maxHp, 'HP');
  if (b.enemy.block > 0) {
    text(ctx, `BLOCK ${b.enemy.block}`, ex, 160, 'bold 14px Verdana, sans-serif', COLORS.blockBlue);
  }

  // The opponent's hand: its two revealed intent cards.
  text(ctx, "THE FOE'S NEXT MOVES", 880, 84, 'bold 12px Verdana, sans-serif', COLORS.gold, 'left');
  b.enemy.intents.forEach((intent, i) => {
    drawIntentCard(ctx, intent, 880 + i * 118, 100);
  });
  if (b.phase === 'enemy') {
    text(ctx, 'The foe is acting…', 880, 272, 'bold 14px Verdana, sans-serif', '#ff9f1c', 'left');
  }

  // Player panel (left).
  roundRect(ctx, 40, 300, 240, 200, 12);
  ctx.fillStyle = 'rgba(10, 14, 10, 0.55)';
  ctx.fill();
  text(ctx, 'EMBER KNIGHT', 160, 326, 'bold 15px Verdana, sans-serif', COLORS.gold);
  drawHealthBar(ctx, 58, 342, 204, 22, b.player.hp, b.player.maxHp, 'HP');
  if (b.player.block > 0) {
    text(ctx, `BLOCK ${b.player.block}`, 160, 388, 'bold 14px Verdana, sans-serif', COLORS.blockBlue);
  }
  text(ctx, `Turn ${b.turn}`, 160, 414, '14px Verdana, sans-serif', '#f4ead3');
  text(ctx, `Draw ${b.piles.draw.length}   Discard ${b.piles.discard.length}`, 160, 438, '13px Verdana, sans-serif', 'rgba(244,234,211,0.8)');

  // Energy orbs, inside the player panel.
  for (let i = 0; i < b.player.maxEnergy; i += 1) {
    ctx.beginPath();
    ctx.arc(70 + i * 34, 470, 13, 0, Math.PI * 2);
    ctx.fillStyle = i < b.player.energy ? COLORS.energyBlue : 'rgba(120,120,120,0.6)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f4ead3';
    ctx.stroke();
  }
  text(ctx, 'ENERGY', 178, 470, 'bold 11px Verdana, sans-serif', '#f4ead3', 'left');

  // Battle log (last 3 lines), top-left under the stage bar.
  const logLines = b.log.slice(-3);
  logLines.forEach((line, i) => {
    text(ctx, line, 40, 76 + i * 20, '12px Verdana, sans-serif', 'rgba(244,234,211,0.75)', 'left');
  });

  // End Turn button.
  const endHover = G.hoverId === 'btn-endturn';
  G.hits.push(drawButton(ctx, 'btn-endturn', 1090, 560, 150, 52, 'END TURN', {
    hover: endHover, disabled: b.phase !== 'player', fontSize: 16,
  }));
  text(ctx, 'or press E', 1165, 628, '12px Verdana, sans-serif', 'rgba(244,234,211,0.7)');

  // The player's hand, fanned along the bottom.
  const layout = handLayout(b.piles.hand);
  for (const slot of layout) {
    const card = b.piles.hand.find((c) => c.uid === slot.uid);
    const def = cardDef(card.id);
    const disp = G.display.get(card.uid) || { x: slot.x, y: slot.y + 260, rot: slot.rot };
    G.display.set(card.uid, disp);
    const hovered = G.hoverUid === card.uid;
    const targetY = hovered ? slot.y - 34 : slot.y;
    const targetX = slot.x;
    disp.x += (targetX - disp.x) * 0.2;
    disp.y += (targetY - disp.y) * 0.2;
    disp.rot += (slot.rot - disp.rot) * 0.2;
    const scale = hovered ? 1.08 : 1;
    ctx.save();
    ctx.translate(disp.x + CARD_W / 2, disp.y + CARD_H / 2);
    ctx.rotate(disp.rot);
    ctx.scale(scale, scale);
    drawCardFace(ctx, def, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, {
      affordable: def.cost <= b.player.energy,
      dim: b.phase !== 'player',
    });
    ctx.restore();
    G.hits.push({
      id: 'card', x: disp.x - 6, y: disp.y - 6, w: CARD_W + 12, h: CARD_H + 12,
      data: { uid: card.uid },
    });
  }

  // Flying cards (played cards travelling to the foe).
  for (const f of G.flying) {
    ctx.save();
    ctx.globalAlpha = f.alpha;
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.scale(f.scale, f.scale);
    drawCardFace(ctx, cardDef(f.cardId), -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, {});
    ctx.restore();
  }

  // Floating combat text.
  for (const fl of G.anim.floaters) {
    const t = fl.age / fl.life;
    ctx.globalAlpha = 1 - t;
    text(ctx, fl.text, fl.x, fl.y - t * 46, `bold ${fl.size}px Georgia, serif`, fl.color);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Turn banner / message toast.
  if (G.message) {
    text(ctx, G.message, VIEW_W / 2, 40, 'bold 15px Verdana, sans-serif', '#ff9f1c');
  }
  if (b.phase === 'player' && b.player.energy === 0 && b.piles.hand.length > 0) {
    text(ctx, 'Out of energy — press E to end your turn', VIEW_W / 2, 470, 'bold 14px Verdana, sans-serif', 'rgba(244,234,211,0.85)');
  }
}

function drawReward(ctx, G) {
  drawBackground(ctx, G.time);
  text(ctx, 'VICTORY!', VIEW_W / 2, 110, 'bold 52px Georgia, serif', COLORS.gold);
  text(ctx, `${G.lastFoeName} is defeated. Choose a card to add to your deck · +${6} HP restored`, VIEW_W / 2, 152, '16px Georgia, serif', '#f4ead3');
  G.rewards.forEach((id, i) => {
    const x = VIEW_W / 2 + (i - 1) * 190 - CARD_W / 2;
    const y = 240;
    const hovered = G.hoverReward === id;
    ctx.save();
    if (hovered) {
      ctx.translate(x + CARD_W / 2, y + CARD_H / 2);
      ctx.scale(1.07, 1.07);
      ctx.translate(-(x + CARD_W / 2), -(y + CARD_H / 2));
    }
    drawCardFace(ctx, cardDef(id), x, y, CARD_W, CARD_H, {});
    ctx.restore();
    G.hits.push({ id: 'reward', x: x - 6, y: y - 6, w: CARD_W + 12, h: CARD_H + 12, data: { cardId: id } });
  });
  G.hits.push(drawButton(ctx, 'btn-skip', VIEW_W / 2 - 110, 500, 220, 44, 'SKIP REWARD', {}));
  text(ctx, `Deck: ${G.run.deck.length} cards · Score ${G.run.score}`, VIEW_W / 2, 580, '15px Verdana, sans-serif', '#f4ead3');
}

function drawVictory(ctx, G) {
  drawBackground(ctx, G.time);
  drawParticles(ctx, G.particles);
  text(ctx, 'THE THRONE IS YOURS', VIEW_W / 2, 150, 'bold 54px Georgia, serif', COLORS.gold);
  text(ctx, 'The Hollow King falls. The ember burns on — because of you.', VIEW_W / 2, 196, '18px Georgia, serif', '#f4ead3');
  const s = G.finalStats;
  roundRect(ctx, 390, 240, 500, 220, 14);
  ctx.fillStyle = 'rgba(10, 14, 10, 0.6)';
  ctx.fill();
  const rows = [
    ['Damage dealt', `${s.damageDealt}`],
    ['Battles won', `${s.battlesWon} / 4`],
    ['HP remaining', `${s.hpLeft}  (+${s.hpLeft * 2} bonus)`],
    ['FINAL SCORE', `${s.score}`],
  ];
  rows.forEach(([label, value], i) => {
    const y = 280 + i * 44;
    const big = i === rows.length - 1;
    text(ctx, label, 420, y, `${big ? 'bold 20px' : '16px'} Verdana, sans-serif`, big ? COLORS.gold : '#f4ead3', 'left');
    text(ctx, value, 860, y, `${big ? 'bold 22px' : '16px'} Verdana, sans-serif`, big ? COLORS.gold : '#ffffff', 'right');
  });
  if (s.newBest) {
    text(ctx, '★ NEW BEST SCORE ★', VIEW_W / 2, 492, 'bold 18px Verdana, sans-serif', COLORS.gold);
  }
  G.hits.push(drawButton(ctx, 'btn-again', VIEW_W / 2 - 280, 530, 260, 48, 'PLAY AGAIN', {}));
  G.hits.push(drawButton(ctx, 'btn-title', VIEW_W / 2 + 20, 530, 260, 48, 'TITLE', {}));
}

function drawDefeat(ctx, G) {
  drawBackground(ctx, G.time);
  text(ctx, 'THE EMBER FADES', VIEW_W / 2, 170, 'bold 54px Georgia, serif', '#c0392b');
  text(ctx, `${G.lastFoeName} stands over you. The run ends here — but the ember remembers.`, VIEW_W / 2, 216, '17px Georgia, serif', '#f4ead3');
  const s = G.finalStats;
  text(ctx, `SCORE  ${s.score}`, VIEW_W / 2, 300, 'bold 30px Georgia, serif', '#ffffff');
  text(ctx, `You reached Stage ${s.stageReached} of 4 · ${s.damageDealt} damage dealt · Best score ${s.bestScore}`, VIEW_W / 2, 344, '16px Verdana, sans-serif', 'rgba(244,234,211,0.85)');
  G.hits.push(drawButton(ctx, 'btn-again', VIEW_W / 2 - 280, 420, 260, 48, 'TRY AGAIN', {}));
  G.hits.push(drawButton(ctx, 'btn-title', VIEW_W / 2 + 20, 420, 260, 48, 'TITLE', {}));
}

function drawPause(ctx, G) {
  ctx.fillStyle = 'rgba(8, 10, 8, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'PAUSED', VIEW_W / 2, 210, 'bold 44px Georgia, serif', COLORS.gold);
  const bw = 260;
  const bx = VIEW_W / 2 - bw / 2;
  G.hits.push(drawButton(ctx, 'btn-resume', bx, 280, bw, 46, 'RESUME', {}));
  G.hits.push(drawButton(ctx, 'btn-restart', bx, 338, bw, 46, 'RESTART RUN', {}));
  G.hits.push(drawButton(ctx, 'btn-quit', bx, 396, bw, 46, 'QUIT TO TITLE', {}));
  G.hits.push(drawButton(ctx, 'btn-mute', bx, 454, bw, 46, isMuted() ? 'SOUND: OFF' : 'SOUND: ON', {}));
}

export function render(ctx, G) {
  G.hits = [];
  if (G.screen === 'title') drawTitle(ctx, G);
  else if (G.screen === 'how') drawHowTo(ctx, G);
  else if (G.screen === 'map') drawMap(ctx, G);
  else if (G.screen === 'battle') drawBattle(ctx, G);
  else if (G.screen === 'reward') drawReward(ctx, G);
  else if (G.screen === 'victory') drawVictory(ctx, G);
  else if (G.screen === 'defeat') drawDefeat(ctx, G);
  if (G.paused && (G.screen === 'battle' || G.screen === 'map')) drawPause(ctx, G);
}
