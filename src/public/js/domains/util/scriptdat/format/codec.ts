import assert from 'assert';
import iconv from 'iconv-lite';

const KEY = 0b01100001;

export const CODE_MAP: ReadonlyArray<Readonly<{
  code: number;
  char: string;
}>> = (() => {
  const src = [
    0x00, '０１２３４５６７８９\nＢＣＤＥＦ',
    0x10, 'ＳｄＯ新⑩倍母天道書者闇死地古文',
    0x7F, '代'
    + '形勇気年杯体をぁぃぅぇぉゃゅょっ'
    + '真あいうえおかきくけこさしすせそ'
    + '実',
    0xE0, 'たちつてとなにぬねのはひふへほま'
    + 'みむめもやゆよらりるれろわん我▼',
  ];
  const list: Readonly<{
    code: number;
    char: string;
  }>[] = [];
  for (let i = 0; i < src.length; i += 2) {
    (<string>src[i + 1])
      .split('')
      .map((x, j) => ({
        code: (<number>src[i]) + j,
        char: x,
      }))
      .forEach((x) => {
        list.push(x);
      });
  }
  return list;
})();

const CHAR_TO_CODE: { [char: string]: number }
  // tslint:disable-next-line:prefer-object-spread
  = CODE_MAP.reduce((p, c) => ({ ...p, [c.char]: c.code }), {});
const CODE_TO_CHAR: { [code: number]: string }
  // tslint:disable-next-line:prefer-object-spread
  = CODE_MAP.reduce((p, c) => Object.assign(p, { [c.code]: c.char }), {});

export function decode(bin: ArrayBuffer) {
  let str = '';
  for (const item of new Uint8Array(bin)) {
    str += toChar(item ^ KEY);
  }
  return str;
}

export function encode(nativeLib: any, txt: string, len: number, buf: Uint8Array) {
  for (let i = 0; i < txt.length; i += 1) {
    buf[i] = toCode(nativeLib, txt.charAt(i)) ^ KEY;
  }
}

export function textToShopData(text: string) {
  return Uint8Array.from(
    text
      .split('')
      .map(x => js_toCode(x)),
  );
}

function js_toCode(char: string) {
  const code = CHAR_TO_CODE[char];
  if (code == null) {
    return iconv.encode(char, 'Shift_JIS')[0];
  }
  return code;
}

function toCode(nativeLib: any, char: string) {
  const code: number = nativeLib.to_code(char.codePointAt(0));
  if (code < 0) {
    return iconv.encode(char, 'Shift_JIS')[0];
  }
  return code;

  // const code = CHAR_TO_CODE[char];
  // if (code == null) {
  //   return iconv.encode(char, 'Shift_JIS')[0];
  // }
  // return code;
}

export function shopItemDataToText(shopItemData: Uint8Array) {
  assert.equal(shopItemData.length, 7 * 3);
  return [...shopItemData].map(toChar).join('');
}

function toChar(code: number) {
  const char = CODE_TO_CHAR[code];
  if (char == null) {
    return iconv.decode(<any>[code], 'Shift_JIS');
  }
  return char;
}
