const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = BigInt(ALPHABET.length);

function encode(num) {
  let number = BigInt(num);
  if (number === 0n) return ALPHABET[0];
  
  let result = '';
  while (number > 0n) {
    const remainder = Number(number % BASE);
    result = ALPHABET[remainder] + result;
    number = number / BASE;
  }
  return result;
}

module.exports = {
  encode
};
