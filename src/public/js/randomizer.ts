(<any>global).eval = global.eval = (arg) => {
  // seedrandom
  if (arg === 'this') {
    return global;
  }
  throw new Error(`Sorry, this app does not support window.eval().`);
};

import randomize from './applications/randomize';
import { CODE_MAP } from './domains/util/scriptdat/format/codec';
declare const WebAssembly: any;

onmessage = async (e) => {
  let memory: any;
  const imports = {
    env: {
      js_console_log: (ptr: number, size: number) => {
        const buf = new Uint8Array(memory.buffer, ptr, size);
        const message = String.fromCodePoint(...buf);
        console.log(message);
      },
    },
  };
  const res = await fetch('../wasm/lib.wasm');
  const bytes = await res.arrayBuffer();
  const { instance, module } = await WebAssembly.instantiate(bytes, imports);
  const exports = instance.exports;
  memory = exports.memory;
  exports.init();

  const charListPtr: number = exports.alloc_char_list(CODE_MAP.length);
  const codeListPtr: number = exports.alloc_code_list(CODE_MAP.length);
  const buffer: ArrayBuffer = instance.exports.memory.buffer;
  const charList = new Uint32Array(buffer.slice(charListPtr, charListPtr + CODE_MAP.length * 4));
  const codeList = new Uint8Array(buffer.slice(codeListPtr, codeListPtr + CODE_MAP.length));
  CODE_MAP.forEach((x, i) => {
    charList[i] = x.char.codePointAt(0)!;
    codeList[i] = x.code;
  });
  exports.init_code_map();

  const randomized = randomize(exports, e.data.scriptDat, e.data.supplementFiles, e.data.options);
  postMessage(randomized, <any>undefined, [randomized]);
};
