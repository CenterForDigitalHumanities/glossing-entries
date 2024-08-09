 /*
  Store the calculated encrypted text here, so we can decrypt the message later.
  */
 //let encryptedText

 const knownPublicKey = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArwqNWB3KH6aDKQgnL+yLkxJqBugC8B9Y9niVo00jZF+tiA54pjyg+wzX83LK1LLw+USodGQ2a2f3NmOkTsUGzHi/Bz14I3HGW8XkYXQjyMQR5VO6ZaqveUvgwzjZ8Am+chN+3myxBpx2NPcOuibewO4qa06HGTwBAncKRO3M8pJgKUHzo/lIEZNslIFfEm8gM5a1u+2fRe98iEHRnJ6qMLwLnbnu2Yta39U6VKIrFJ0QwrGC6JumtnpK92x0DTfwE41jaD1wri9fwteFUUFZLCafvrGECxjnAohIpHAQLl5wFVV1iCBDWYnwc96WrYCF/+9g+Nbx8IPU1P2J7r3ihwIDAQAB"
 const knownPrivateKey = "MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCvCo1YHcofpoMpCCcv7IuTEmoG6ALwH1j2eJWjTSNkX62IDnimPKD7DNfzcsrUsvD5RKh0ZDZrZ/c2Y6ROxQbMeL8HPXgjccZbxeRhdCPIxBHlU7plqq95S+DDONnwCb5yE37ebLEGnHY09w66Jt7A7iprTocZPAECdwpE7czykmApQfOj+UgRk2yUgV8SbyAzlrW77Z9F73yIQdGcnqowvAudue7Zi1rf1TpUoisUnRDCsYLom6a2ekr3bHQNN/ATjWNoPXCuL1/C14VRQVksJp++sYQLGOcCiEikcBAuXnAVVXWIIENZifBz3patgIX/72D41vHwg9TU/YnuveKHAgMBAAECggEAVCwz2grBNsUgz2tvRLlwSPIS8G1DdGruod9MvfGLMmpcDVBALlh7ZR5A/n3WEcBW5tdgVlAWZ0HgfFQgIAzY/xyVaArkKc89fsZD06VAy/uVS30e5mLU7PRTCi3dh3N4FG1Rle4YlsBIi6G+gD/O4GHnHiDuEHFtXt0VoB3mb0Kt9Zevr07anaZx8+6c1LQJuHROOP//jVHf4q6nr8PUuYCyFr97Z/8PsoiYwgp4hdyYS7NMcN3/YTsaDEomlisNSk6BPgeixtFzMC+39HWpMDkLaOuqjrnrIu1gWaY97JWQxpII6W5PIuB4KaqUDA2F6AhZNfZFcsRuF5rCzquZiQKBgQDnrynh4D2SN78VTCrmgg2j79HQoYsIE+aXTnegPJDMp+V/7/EXtwmIa37JbTf3Yw17JKtaENCOpM4O2Kex5RpRj3D1D18RTByfPkHBnWtM2yHYFo6Xul1qBAqzqdY5yMrNv3FYkwwDUPiuVBUWOmq+0NVF6f9N9QjJbzHv7mcizQKBgQDBaYSCv8G0sX1UUIeHQ6aiUUkoe1lVehNALxIvX56TH8McPgnOy+1ZqsCEuByx18d4XyV07kpyO9gW2zT/HCc9yoxa4Tt9S/4m2QaLbqWD7iiQsjE1MVlSTvIjZrslTl+DZs4QJLYVFcVLbqHWwrpDbCtjw/Wk3hFdKiYCLUGiowKBgCQrFTe84P/NkhgKDvxzOxvnmXKfdWvqZ2ohhs1OBzDb2RkS5SlVmrhgR6e8VCtbnEQoIlPqIhTSp5RrwComYOhwoyqunqG9pw45Etzd7V1PLEZmpxYKswCU5vLLRbU5omdiRpiURCDUaC4W1D/nGLj3MwQ6FnAeG6QOptYU+qbVAoGAQPJk2972de3P7xsnl4VhFEqFbYGWKvzWMAxeZ+gNAMx+oSI3+uhBqIWNJkQI5rNVuRcCJfTKrPdphatQbYYPq1EztmTBrD5zdqoT54hdLiMwHf6oRXtvyhLWforFty5NJnvEIGmjdwsbeEwLLmmvUGqnW1X3S8iCPi2kG8EEtE8CgYB/muovtb15BfzZL3IJefeAobJLLAjrbLUdNC7IT9KSEGsH7jxlYBQgow78/DJLh63Do4neCTdmp8EciehE2gaSojCSI327rAUmOVOf8OLvKFz+lkDRIFRl18r/lcsbdm5KaTJeud60huCkohO6eYn+rgMGF1dIqoX5iN2Mi1VcfA=="

 async function generateGoGKeys() {
  let keyPair = await window.crypto.subtle
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

    console.log("SAVE THIS PUBLIC KEY")
    console.log(await publicKeyAsHash(keyPair.publicKey))

    console.log("SAVE THIS PRIVATE KEY")
    console.log(await privateKeyAsHash(keyPair.privateKey))
    // console.log(await encryptMessage(keyPair_1.publicKey))
    // console.log(await decryptMessage(keyPair_1.privateKey))
 }

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf))
}

/*
Convert a string into an ArrayBuffer
from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
*/
function str2ab(str) {
  const buf = new ArrayBuffer(str.length)
  const bufView = new Uint8Array(buf)
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i)
  }
  return buf
}

/**
 * Convert a base64 encoded private key into a SubtleCrypto private key
 */ 
async function convertPrivateKeyHash(key) {
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
    ["decrypt"]
  )
  return cryptoKey
}

/**
 * Convert a SubtleCrypto private key into a base64 encoded private key
 */ 
async function privateKeyAsHash(key) {
  const exported = await window.crypto.subtle.exportKey("pkcs8", key).then(e => e)
  const exportedAsString = ab2str(exported)
  const exportedAsBase64 = window.btoa(exportedAsString)
  //const pemExported = `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64}\n-----END PRIVATE KEY-----`;
  return exportedAsBase64
}

/**
 * Convert a base64 encoded public key into a SubtleCrypto public key
 */ 
async function convertPublicKeyHash(key) {
  // base64 decode the string to get the binary data
  const binaryDerString = window.atob(key)
  // convert from a binary string to an ArrayBuffer
  const binaryDer = str2ab(binaryDerString)
  const cryptoKey = await window.crypto.subtle.importKey(
    "spki",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  )
  return cryptoKey
}

/**
 * Convert a SubtleCrypto public key into a base64 encoded public key
 */ 
async function publicKeyAsHash(key) {
  const exported = await window.crypto.subtle.exportKey("spki", key)
  const exportedAsString = ab2str(exported)
  const exportedAsBase64 = window.btoa(exportedAsString)
  //const pemExported = `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;
  return exportedAsBase64
}

/*
   Get the encoded public key from the app config and encrypt a string into a hash
 */
 async function encryptMessage(key=null, message=null) {
  if(!key){
    // get key from app settings
    key = knownPublicKey
  }
  if(!message){
    message = "Hello World! Bryan here.  Winning as a hash, NFT, woot."
  }
  let cryptoKey = await convertPublicKeyHash(key)
  let enc = new TextEncoder()
  let encoded = enc.encode(message)
  let encryptedText = await window.crypto.subtle.encrypt({
      name: "RSA-OAEP"
    },
    cryptoKey,
    encoded
  )
  console.log("ET")
  console.log(encryptedText)
  return encryptedText
 }

 async function decryptMessage(key=null, encryptedMessage=null) {
  if(!key){
    // get key from app settings
    key = knownPrivateKey
  }
  if(!encryptedMessage){
    throw new Error("No message provided")
  }
  let cryptoKey = await convertPrivateKeyHash(key)
  let decrypted = await window.crypto.subtle.decrypt({
      name: "RSA-OAEP"
    },
    cryptoKey,
    encryptedMessage
  )
  let dec = new TextDecoder()
  let decodedText = dec.decode(decrypted)
  return decodedText
 }

async function miniTest(){
  // const message = 
  // `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin vitae massa pulvinar, dictum diam porta, aliquet diam. Morbi eu erat ex. Vestibulum in vehicula arcu, non vulputate arcu. Duis id mi metus. Curabitur rutrum egestas purus, a viverra lorem fringilla ut. Proin vulputate magna in arcu laoreet, in vulputate ex lobortis. Morbi aliquet, sapien non maximus mattis, mi arcu auctor libero, quis interdum felis arcu faucibus nunc. Etiam pulvinar efficitur erat, et efficitur nisi imperdiet sit amet. Morbi sit amet est ac velit auctor mattis. Quisque at felis at neque facilisis malesuada.

  // Phasellus ac semper sapien, et auctor enim. Aliquam posuere nibh ut nulla venenatis eleifend. Aliquam ullamcorper, sem quis pulvinar venenatis, elit lorem placerat ligula, vel pellentesque turpis neque nec elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec velit urna, aliquam eu iaculis sed, tempus a ante. Fusce ante turpis, lobortis sit amet laoreet id, dignissim vestibulum mi. Quisque posuere, est ut semper ullamcorper, massa urna lacinia eros, eu accumsan velit felis eu purus. Etiam turpis nulla, sagittis quis nunc eu, consequat dapibus augue. Donec facilisis dui sit amet erat facilisis faucibus.

  // In hac habitasse platea dictumst. Aenean est leo, auctor eu velit et, suscipit congue lectus. Nulla tortor erat, consectetur a ante eget, malesuada convallis lacus. Mauris posuere nisl erat, dictum imperdiet tortor auctor nec. Nulla sed aliquet diam. Morbi risus mauris, auctor nec orci in, facilisis pulvinar dui. Ut varius ipsum risus, nec rhoncus nisl vestibulum vel. Ut et pharetra massa.

  // Nunc ac ante quam. Morbi sit amet interdum velit, non condimentum ante. Aliquam at lorem sed arcu finibus pharetra eget et erat. Morbi nec ullamcorper elit. Phasellus aliquet, justo at lobortis venenatis, mi massa eleifend metus, sit amet dignissim sapien augue non nisi. Mauris quis leo quis ante pharetra venenatis vel ac nulla. Quisque convallis, leo non cursus interdum, odio tellus imperdiet erat, ut aliquam est velit id ipsum. Sed porta, lectus pulvinar porttitor bibendum, enim est condimentum lorem, in bibendum felis augue convallis lorem. Mauris malesuada blandit lorem.

  // Sed pretium dignissim lectus, at dapibus eros scelerisque sit amet. Nullam imperdiet, nisi at vulputate facilisis, quam erat ullamcorper massa, vel mollis est massa eu nunc. Curabitur id dolor nunc. Sed vel lorem viverra, sollicitudin nunc iaculis, vulputate lacus. Fusce eu leo vel est pulvinar congue ut et ante. Pellentesque finibus, elit ullamcorper elementum venenatis, nibh dui vestibulum magna, sit amet suscipit nulla lorem eget arcu. Aenean non mauris porttitor, ullamcorper lorem at, viverra massa. Maecenas scelerisque ultrices urna. Duis pulvinar ullamcorper leo, non ornare sem fermentum et. Ut id neque dui.

  // Praesent eget porta nibh. Vestibulum et vestibulum libero, ut interdum enim. Nullam varius, erat vitae rutrum fringilla, leo odio semper velit, varius dictum mi purus vel sapien. Phasellus semper enim in elit tincidunt dignissim. Donec pellentesque, mi sit amet sollicitudin scelerisque, dui nibh mollis tortor, a eleifend massa orci et nunc. Sed iaculis felis vitae aliquet euismod. Sed a vehicula felis. Vivamus rutrum orci eros, eget faucibus turpis egestas non. Etiam pretium pulvinar enim at laoreet. Phasellus fringilla laoreet orci, ut interdum urna varius nec. Interdum et malesuada fames ac ante ipsum primis in faucibus.

  // Phasellus viverra metus lacus, vitae laoreet nibh dictum vel. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Suspendisse potenti. Sed scelerisque sagittis volutpat. Nam erat augue, accumsan non convallis eu, viverra at tellus. Pellentesque ultricies diam eu arcu feugiat semper. Phasellus sit amet cursus tellus.

  // Cras quis nulla mollis, auctor nunc id, placerat dolor. Vivamus ac semper dui. Suspendisse luctus urna diam, ac ultricies nisl finibus ac. Integer finibus, est in suscipit mollis, nisi est molestie quam, eu faucibus magna justo nec nulla. Pellentesque dictum arcu eu sem pharetra, dapibus tincidunt mi iaculis. Curabitur dolor sapien, gravida at odio sed, rhoncus blandit massa. Pellentesque non laoreet quam, ac egestas risus. Fusce a nunc aliquam, pretium lectus quis, vestibulum magna. Praesent porta metus vitae tellus vulputate semper. Phasellus vitae suscipit libero. Suspendisse at vulputate erat, id rutrum libero. Vestibulum neque massa, commodo in tincidunt eu, tincidunt nec orci. Nunc suscipit dolor ut neque posuere pretium.

  // Aenean nisl mi, dictum non erat id, sollicitudin maximus erat. Sed dapibus quam nec felis ultrices eleifend sed at turpis. Sed tellus nisl, vestibulum ac metus at, accumsan ultrices ex. Mauris eget consectetur lorem. Nam turpis augue, bibendum nec mi sed, blandit malesuada arcu. Pellentesque vitae sapien sed velit fringilla efficitur. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.

  // Vestibulum malesuada risus pulvinar, pharetra ipsum quis, tempus elit. Proin fringilla consequat mattis. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Nullam est lacus, convallis at nunc et, sollicitudin bibendum est. Cras tortor nisi, cursus quis volutpat eu, gravida vel ipsum. In accumsan, augue quis rutrum tempus, mi lacus pretium lorem, sit amet varius lorem massa non est. Vivamus accumsan eros vel sapien interdum, sit amet auctor nulla vehicula. Sed mollis luctus commodo. Sed consectetur quis enim a vulputate. Maecenas tincidunt augue ac lorem elementum, efficitur porta est sodales. Ut viverra nisl non tellus pharetra sagittis. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Aenean tincidunt condimentum rhoncus. Cras pulvinar sagittis pellentesque.

  // Mauris vel lorem molestie, convallis diam ac, molestie erat. Aenean aliquam tortor nec lectus sollicitudin tempor. Vestibulum a lectus vitae nibh eleifend laoreet. Maecenas sapien tortor, sagittis ut hendrerit a, molestie at orci. Sed efficitur est enim, eu lobortis erat dapibus in. Vivamus commodo erat diam, non aliquet diam gravida at. Integer lobortis erat metus, a fermentum metus mollis at. Praesent feugiat enim id mi vehicula efficitur. Vivamus metus ante, ornare non suscipit sed, mattis ac augue. Nulla non lectus vehicula, elementum ipsum eu, interdum ante. Maecenas non fringilla massa.

  // Phasellus pretium enim at euismod gravida. Cras condimentum neque eget tortor interdum, sit amet tincidunt lectus hendrerit. Nullam eu nulla ex. Mauris hendrerit neque eget ultrices euismod. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus iaculis bibendum magna eu suscipit. Nullam accumsan nisi non eros lobortis, id lobortis urna ullamcorper. Sed ac urna sit amet enim pulvinar congue ut at ex. Nullam ornare nisi vitae lorem pellentesque aliquam. Phasellus eu nibh convallis, ullamcorper ante auctor, molestie lorem.

  // Integer volutpat maximus magna cursus dapibus. Fusce odio ipsum, porta in ante quis, dignissim vehicula risus. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Etiam pretium augue urna, at consequat arcu malesuada eget. Nunc quis quam lacus. Nulla purus nisl, consectetur sed velit sed, cursus porttitor purus. Mauris tempus nunc elit, non ultrices massa sollicitudin finibus.

  // Vivamus vehicula urna metus, vitae vulputate diam feugiat in. Nulla at risus eget neque molestie iaculis. Vivamus finibus vestibulum efficitur. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus ante odio, sodales quis eros id, sollicitudin feugiat mi. Morbi eget eros sit amet urna facilisis placerat. Proin varius, diam eu scelerisque consectetur, augue lectus lobortis nulla, id vulputate tortor erat non tellus. Etiam a lectus id ex lacinia consequat eget eget lorem. Maecenas iaculis rhoncus maximus. Donec accumsan eleifend augue, vitae blandit augue lobortis non.

  // Nam eget lectus et felis lacinia fermentum viverra vel diam. Quisque eu urna nec leo efficitur aliquam vestibulum nec magna. Sed quam quam, porta eget ante commodo, pretium elementum nisl. Phasellus blandit id magna eget suscipit. Nam tempus tristique est, ac feugiat dui sodales a. Donec magna neque, varius ac sem sit amet, interdum hendrerit libero. Vivamus vulputate, dui quis hendrerit vestibulum, diam mauris blandit mi, quis venenatis odio nulla et ipsum. Suspendisse mauris orci, lacinia in eros nec, mattis bibendum erat. Nulla mollis sagittis felis vitae dictum. Curabitur at porttitor orci. Etiam lectus est, sagittis sit amet auctor id, fringilla vel diam. Ut cursus tellus in cursus aliquet. Nunc sodales elementum ex. In hac habitasse platea dictumst. Interdum et malesuada fames ac ante ipsum primis in faucibus.`

  const message = "Hello World! Bryan here.  Winning as a hash, NFT, woot."

  const encryptedMessage = await encryptMessage(null, message)
  .then(cryptic => cryptic)
  .catch(err => {
    console.error(err)
    throw err
  })

  console.log("THE ENCRYPTED MESSAGE IS....")
  console.log(encryptedMessage)
  const decryptedMessage = await decryptMessage(null, encryptedMessage).then(cryptic => cryptic).catch(err => err)
  console.log(decryptedMessage)
}