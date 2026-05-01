function drawQr(canvas, text) {
  const qr = makeQr(text);
  const ctx = canvas.getContext("2d");
  const modules = qr.length;
  const quiet = 4;
  const size = canvas.width;
  const scale = Math.floor(size / (modules + quiet * 2));
  const offset = Math.floor((size - scale * (modules + quiet * 2)) / 2);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#111827";
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      if (qr[y][x]) {
        ctx.fillRect(offset + (x + quiet) * scale, offset + (y + quiet) * scale, scale, scale);
      }
    }
  }
}

function makeQr(text) {
  const version = 5;
  const size = version * 4 + 17;
  const dataCodewords = 108;
  const eccCodewords = 26;
  const bytes = [...new TextEncoder().encode(text)];
  if (bytes.length > 106) throw new Error("QR text too long");

  const bits = [];
  appendBits(bits, 4, 4);
  appendBits(bits, bytes.length, 8);
  for (const byte of bytes) appendBits(bits, byte, 8);
  appendBits(bits, 0, Math.min(4, dataCodewords * 8 - bits.length));
  while (bits.length % 8) bits.push(0);

  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    data.push(Number.parseInt(bits.slice(i, i + 8).join(""), 2));
  }
  for (let pad = 0; data.length < dataCodewords; pad++) {
    data.push(pad % 2 ? 0x11 : 0xec);
  }

  const codewords = [...data, ...reedSolomon(data, eccCodewords)];
  const matrix = Array.from({ length: size }, () => Array(size).fill(null));
  const reserved = Array.from({ length: size }, () => Array(size).fill(false));

  addFinder(matrix, reserved, 0, 0);
  addFinder(matrix, reserved, size - 7, 0);
  addFinder(matrix, reserved, 0, size - 7);
  addTiming(matrix, reserved);
  addAlignment(matrix, reserved, 6, 30);
  reserveFormat(matrix, reserved);
  matrix[size - 8][8] = true;
  reserved[size - 8][8] = true;

  const codeBits = [];
  for (const word of codewords) appendBits(codeBits, word, 8);
  placeData(matrix, reserved, codeBits);

  let best = null;
  for (let mask = 0; mask < 8; mask++) {
    const candidate = matrix.map((row) => row.slice());
    applyMask(candidate, reserved, mask);
    addFormat(candidate, reserved, mask);
    const penalty = score(candidate);
    if (!best || penalty < best.penalty) best = { matrix: candidate, penalty };
  }
  return best.matrix;
}

function appendBits(bits, value, length) {
  for (let i = length - 1; i >= 0; i--) bits.push(((value >>> i) & 1) === 1);
}

function addFinder(matrix, reserved, x, y) {
  for (let dy = -1; dy <= 7; dy++) {
    for (let dx = -1; dx <= 7; dx++) {
      const xx = x + dx;
      const yy = y + dy;
      if (!inBounds(matrix, xx, yy)) continue;
      reserved[yy][xx] = true;
      const on = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6
        && (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
      matrix[yy][xx] = on;
    }
  }
}

function addTiming(matrix, reserved) {
  const size = matrix.length;
  for (let i = 8; i < size - 8; i++) {
    const on = i % 2 === 0;
    matrix[6][i] = on;
    matrix[i][6] = on;
    reserved[6][i] = true;
    reserved[i][6] = true;
  }
}

function addAlignment(matrix, reserved, cx, cy) {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (!inBounds(matrix, x, y) || reserved[y][x]) continue;
      matrix[y][x] = Math.max(Math.abs(dx), Math.abs(dy)) !== 1;
      reserved[y][x] = true;
    }
  }
}

function reserveFormat(matrix, reserved) {
  const size = matrix.length;
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      reserved[8][i] = true;
      reserved[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }
}

function addFormat(matrix, reserved, mask) {
  const size = matrix.length;
  const format = formatBits(mask);
  const first = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  const second = [
    [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8], [size - 5, 8], [size - 6, 8], [size - 7, 8],
    [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5], [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1]
  ];
  for (let i = 0; i < 15; i++) {
    const bit = ((format >>> i) & 1) === 1;
    matrix[first[i][1]][first[i][0]] = bit;
    matrix[second[i][1]][second[i][0]] = bit;
    reserved[first[i][1]][first[i][0]] = true;
    reserved[second[i][1]][second[i][0]] = true;
  }
}

function formatBits(mask) {
  let data = (1 << 3) | mask;
  let value = data << 10;
  const generator = 0x537;
  for (let i = 14; i >= 10; i--) {
    if ((value >>> i) & 1) value ^= generator << (i - 10);
  }
  return ((data << 10) | value) ^ 0x5412;
}

function placeData(matrix, reserved, bits) {
  const size = matrix.length;
  let index = 0;
  let upward = true;
  for (let x = size - 1; x > 0; x -= 2) {
    if (x === 6) x--;
    for (let step = 0; step < size; step++) {
      const y = upward ? size - 1 - step : step;
      for (let dx = 0; dx < 2; dx++) {
        const xx = x - dx;
        if (reserved[y][xx]) continue;
        matrix[y][xx] = bits[index++] || false;
      }
    }
    upward = !upward;
  }
}

function applyMask(matrix, reserved, mask) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix.length; x++) {
      if (reserved[y][x]) continue;
      if (maskOn(mask, x, y)) matrix[y][x] = !matrix[y][x];
    }
  }
}

function maskOn(mask, x, y) {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    case 7: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return false;
  }
}

function score(matrix) {
  const size = matrix.length;
  let penalty = 0;
  for (let y = 0; y < size; y++) penalty += linePenalty(matrix[y]);
  for (let x = 0; x < size; x++) penalty += linePenalty(matrix.map((row) => row[x]));
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const color = matrix[y][x];
      if (matrix[y][x + 1] === color && matrix[y + 1][x] === color && matrix[y + 1][x + 1] === color) penalty += 3;
    }
  }
  let dark = 0;
  for (const row of matrix) for (const cell of row) if (cell) dark++;
  penalty += Math.abs(Math.floor((dark * 100) / (size * size) / 5) * 5 - 50) * 2;
  return penalty;
}

function linePenalty(line) {
  let penalty = 0;
  let runColor = line[0];
  let runLength = 1;
  for (let i = 1; i < line.length; i++) {
    if (line[i] === runColor) {
      runLength++;
    } else {
      if (runLength >= 5) penalty += 3 + runLength - 5;
      runColor = line[i];
      runLength = 1;
    }
  }
  if (runLength >= 5) penalty += 3 + runLength - 5;
  return penalty;
}

function reedSolomon(data, degree) {
  const generator = rsGenerator(degree);
  const result = Array(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ result.shift();
    result.push(0);
    for (let i = 0; i < degree; i++) result[i] ^= gfMul(generator[i], factor);
  }
  return result;
}

function rsGenerator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], 1);
      next[j + 1] ^= gfMul(poly[j], gfPow(2, i));
    }
    poly = next;
  }
  return poly.slice(1);
}

function gfPow(value, power) {
  let result = 1;
  for (let i = 0; i < power; i++) result = gfMul(result, value);
  return result;
}

function gfMul(a, b) {
  let result = 0;
  while (b) {
    if (b & 1) result ^= a;
    a <<= 1;
    if (a & 0x100) a ^= 0x11d;
    b >>>= 1;
  }
  return result;
}

function inBounds(matrix, x, y) {
  return y >= 0 && y < matrix.length && x >= 0 && x < matrix.length;
}
