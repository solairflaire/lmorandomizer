(<any>global).eval = global.eval = (arg) => {
  // seedrandom
  if (arg === 'this') {
    return global;
  }
  throw new Error(`Sorry, this app does not support window.eval().`);
};

import randomize from './applications/randomize';
declare const WebAssembly: any;

onmessage = async (e) => {
  const res = await fetch('../wasm/decode.wasm');
  const bytes = await res.arrayBuffer();
  const result = await WebAssembly.instantiate(bytes, {});
  console.log(result);
  console.log(result.instance.exports.sum(2, 3));
  const randomized = randomize(e.data.scriptDat, e.data.supplementFiles, e.data.options);
  postMessage(randomized, <any>undefined, [randomized]);
};
