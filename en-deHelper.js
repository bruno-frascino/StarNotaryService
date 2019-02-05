
function encodeAsciiToHex( ascii ){

  let bytes = new Buffer(ascii, 'ascii');

  const hexEncoded = Buffer.from(bytes).toString('hex');

  return hexEncoded;
}

function decodeHexToAscii( hex ){

  let bytes = new Buffer(hex, 'hex');

  const asciiDecoded = Buffer.from(bytes).toString('ascii');

  return asciiDecoded;
}

module.exports = { encodeAsciiToHex, decodeHexToAscii };