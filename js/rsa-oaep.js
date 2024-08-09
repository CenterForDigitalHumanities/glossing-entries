 /*
  Store the calculated ciphertext here, so we can decrypt the message later.
  */
 let ciphertext


 /*
 Get the encoded message, encrypt it and display a representation
 of the ciphertext in the "Ciphertext" element.
 */
 async function encryptMessage(key) {
  let plaintext = "Hello World! Bryan here.  Winning as a hash, NFT, woot."
  let enc = new TextEncoder()
  let encoded = enc.encode(plaintext)
  ciphertext = await window.crypto.subtle.encrypt({
      name: "RSA-OAEP"
    },
    key,
    encoded
  )
  return ciphertext
 }

 /*
 Fetch the ciphertext and decrypt it.
 Write the decrypted message into the "Decrypted" box.
 */
 async function decryptMessage(key) {
  let decrypted = await window.crypto.subtle.decrypt({
      name: "RSA-OAEP"
    },
    key,
    ciphertext
  )
  let dec = new TextDecoder()
  return dec.decode(decrypted)
 }




 async function miniTest() {
  let keyPair_1 = await window.crypto.subtle
    .generateKey({
        name: "RSA-OAEP",
        // Consider using a 4096-bit key for systems that require long-term security
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    )
    .then(keyPair => {
      return keyPair
    })
    .catch(err => err)

  let keyPair_2 = await window.crypto.subtle
    .generateKey({
        name: "RSA-OAEP",
        // Consider using a 4096-bit key for systems that require long-term security
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    )
    .then(keyPair => {
      return keyPair
    })
    .catch(err => err)
    console.log(await exportCryptoKey(keyPair_1.publicKey))
    // console.log(await encryptMessage(keyPair_1.publicKey))
    // console.log(await decryptMessage(keyPair_1.privateKey))
 }

async function importPrivateKey(key_base64) {
  // base64 decode the string to get the binary data
  const binaryDerString = window.atob(key)
  // convert from a binary string to an ArrayBuffer
  const binaryDer = str2ab(binaryDerString)

  const cryptoKey = await window.crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  ).then(key => key)
  return cryptoKey
}

async function exportPrivateKey(key) {
  // As a JWK JSON Object
  // const exported = await window.crypto.subtle.exportKey("jwk", key)
  // console.log(exported)

  function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf))
  }

  const exported = await window.crypto.subtle.exportKey("pkcs8", key).then(e => e)
  const exportedAsString = ab2str(exported)
  const exportedAsBase64 = window.btoa(exportedAsString)
  console.log(exportedAsBase64)
  return exportedAsBase64
}

async function importPublicKey(key_base64) {
  // TODO
}

async function exportPublicKey(key) {
  // TODO
}
