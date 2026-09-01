const zlib = require('zlib'), fs = require('fs');

function crc32(buf){
  let t = crc32.t;
  if(!t){ t = crc32.t = []; for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c = c&1 ? 0xedb88320 ^ (c>>>1) : c>>>1; t[n]=c>>>0; } }
  let c = 0xffffffff;
  for(let i=0;i<buf.length;i++) c = t[(c ^ buf[i]) & 0xff] ^ (c>>>8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type,'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, rgba){
  const raw = Buffer.alloc((w*4+1)*h);
  for(let y=0;y<h;y++){ raw[y*(w*4+1)] = 0; rgba.copy(raw, y*(w*4+1)+1, y*w*4, (y+1)*w*4); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  return Buffer.concat([
    Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, {level:9})),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const BG = [0x0f,0x14,0x19], GREEN = [0x34,0xd4,0x7f], LIGHT = [0xe8,0xec,0xf1];

// Coverage of a pixel for a shape fn, 3x3 supersampled.
function cov(x, y, fn){
  let n = 0;
  for(let sy=0; sy<3; sy++) for(let sx=0; sx<3; sx++)
    if(fn(x + (sx+0.5)/3, y + (sy+0.5)/3)) n++;
  return n/9;
}
function mix(dst, i, col, a){
  for(let c=0;c<3;c++) dst[i+c] = Math.round(dst[i+c]*(1-a) + col[c]*a);
  dst[i+3] = 255;
}

// `inset` is the safe-zone shrink factor for maskable icons.
function draw(size, inset){
  const px = Buffer.alloc(size*size*4);
  const cx = size/2, cy = size/2, S = size/512 * inset;
  const rOut = 172*S, rIn = 140*S;               // clock ring
  const handW = 15*S;
  const hourLen = 76*S, minLen = 112*S;

  const ring = (x,y) => { const d = Math.hypot(x-cx, y-cy); return d <= rOut && d >= rIn; };
  // minute hand: straight up. hour hand: to the right and slightly down (≈ 4 o'clock feel)
  const vert = (x,y) => Math.abs(x-cx) <= handW/2 && y <= cy + handW/2 && y >= cy - minLen;
  const horz = (x,y) => Math.abs(y-cy) <= handW/2 && x >= cx - handW/2 && x <= cx + hourLen;
  const cap  = (x,y) => Math.hypot(x-cx, y-cy) <= handW*0.85;

  for(let y=0;y<size;y++) for(let x=0;x<size;x++){
    const i = (y*size + x)*4;
    px[i]=BG[0]; px[i+1]=BG[1]; px[i+2]=BG[2]; px[i+3]=255;
    const a = cov(x,y,ring);
    if(a > 0) mix(px, i, GREEN, a);
    const b = Math.max(cov(x,y,vert), cov(x,y,horz), cov(x,y,cap));
    if(b > 0) mix(px, i, LIGHT, b);
  }
  return png(size, size, px);
}

fs.writeFileSync('icon-192.png', draw(192, 1));
fs.writeFileSync('icon-512.png', draw(512, 1));
fs.writeFileSync('icon-maskable-512.png', draw(512, 0.72));  // 72% keeps art inside the maskable safe zone
console.log('icons written');
