interface RGBA {
    r: number;
    g: number;
    b: number;
    a?: number;
  }
  
  interface HSL {
    h: number;
    s: number;
    l: number;
  }
  
  function hue2rgb(p: number, q: number, t: number): number {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
  
  export class Color {
    private _r: number;
    private _g: number;
    private _b: number;
    private _a: number;
  
    constructor({ r, g, b, a }: RGBA) {
      this._r = r;
      this._g = g;
      this._b = b;
      this._a = a || 1;
    }
  
    static rgb(r: number, g: number, b: number): Color {
      return new this({ r: r, g: g, b: b, a: 1 });
    }
  
    static rgba(r: number, g: number, b: number, a: number) {
      return new this({ r: r, g: g, b: b, a: a });
    }
  
    static hsl(h: number, s: number, l: number) {
      let r, g, b;
  
      if (s === 0) {
        r = g = b = l;
      } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }
  
      return new this({
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
        a: 1,
      });
    }
  
    static hsv(h: number, s: number, v: number) {
      let r = 0;
      let g = 0;
      let b = 0;
      let i = Math.floor(h * 6);
      let f = h * 6 - i;
      let p = v * (1 - s);
      let q = v * (1 - f * s);
      let t = v * (1 - (1 - f) * s);
  
      switch (i % 6) {
        case 0:
          r = v, g = t, b = p;
          break;
        case 1:
          r = q, g = v, b = p;
          break;
        case 2:
          r = p, g = v, b = t;
          break;
        case 3:
          r = p, g = q, b = v;
          break;
        case 4:
          r = t, g = p, b = v;
          break;
        case 5:
          r = v, g = p, b = q;
          break;
      }
  
      return new this({
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
        a: 1,
      });
    }
  
    static hex(code: string) {
  
    }
  
    get rgb() {
      return {r: this._r, g: this._g, b: this._b};
    }
  }
  