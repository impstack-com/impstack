import { describe, expect, test, beforeEach, it } from '@jest/globals'
import TxBuilder from '../src/tx-builder'
import TxOutputMap from '../src/tx-output-map'
import TxOutput from '../src/tx-output'
import Script from '../src/script'
import Key from '../src/key'
import Address from '../src/address'
import AddressKeyMap from '../src/address-key-map'
import TxSigner from '../src/tx-signer'
import ScriptInterpreter from 'earthbucks-lib/src/script-interpreter'

describe('TxSigner', () => {
  let txBuilder: TxBuilder
  let txSigner: TxSigner
  let txOutMap: TxOutputMap
  let addressKeyMap: AddressKeyMap

  beforeEach(() => {
    txOutMap = new TxOutputMap()
    addressKeyMap = new AddressKeyMap()
    // generate 5 keys, 5 outputs, and add them to the txOutMap
    for (let i = 0; i < 5; i++) {
      const key = Key.fromRandom()
      const address = new Address(key.publicKey)
      addressKeyMap.add(key, address.address)
      const script = Script.fromAddressOutput(address.address)
      const output = new TxOutput(BigInt(100), script)
      txOutMap.add(output, Buffer.from('00'.repeat(32), 'hex'), i)
    }

    const changeScript = Script.fromString('')
    txBuilder = new TxBuilder(txOutMap, changeScript)
  })

  test('should sign a tx', () => {
    const key = Key.fromRandom()
    const address = new Address(key.publicKey)
    const script = Script.fromAddressOutput(address.address)
    const output = new TxOutput(BigInt(50), script)
    txBuilder.addOutput(BigInt(50), Script.fromString(''))

    const tx = txBuilder.build()

    expect(tx.inputs.length).toBe(1)
    expect(tx.outputs.length).toBe(2)
    expect(tx.outputs[0].value).toBe(BigInt(50))

    txSigner = new TxSigner(tx, txOutMap, addressKeyMap)
    const signed = txSigner.sign(0)
    expect(signed).toBe(true)

    const txInput = tx.inputs[0]
    const txOutput = txOutMap.get(txInput.inputTxId, txInput.inputTxIndex)
    const execScript = txOutput?.script as Script
    const sigBuf = txInput.script.chunks[0].buffer as Uint8Array
    expect(sigBuf?.length).toBe(65)
    const pubKeyBuf = txInput.script.chunks[1].buffer as Uint8Array
    expect(pubKeyBuf?.length).toBe(33)

    const stack = [sigBuf, pubKeyBuf]

    const scriptInterpreter = ScriptInterpreter.fromOutputScriptTx(
      execScript,
      tx,
      0,
      stack,
      100n,
    )

    const result = scriptInterpreter.evalScript()
    expect(result).toBe(true)
  })

  test('should sign two inputs', () => {
    const key = Key.fromRandom()
    const address = new Address(key.publicKey)
    const script = Script.fromAddressOutput(address.address)
    const output = new TxOutput(BigInt(50), script)
    txBuilder.addOutput(BigInt(100), Script.fromString(''))
    txBuilder.addOutput(BigInt(100), Script.fromString(''))

    const tx = txBuilder.build()

    expect(tx.inputs.length).toBe(2)
    expect(tx.outputs.length).toBe(2)
    expect(tx.outputs[0].value).toBe(BigInt(100))
    expect(tx.outputs[1].value).toBe(BigInt(100))

    txSigner = new TxSigner(tx, txOutMap, addressKeyMap)
    const signed1 = txSigner.sign(0)
    expect(signed1).toBe(true)
    const signed2 = txSigner.sign(1)
    expect(signed2).toBe(true)

    const txInput1 = tx.inputs[0]
    const txOutput1 = txOutMap.get(txInput1.inputTxId, txInput1.inputTxIndex)
    const execScript1 = txOutput1?.script as Script
    const sigBuf1 = txInput1.script.chunks[0].buffer as Uint8Array
    expect(sigBuf1?.length).toBe(65)
    const pubKeyBuf1 = txInput1.script.chunks[1].buffer as Uint8Array
    expect(pubKeyBuf1?.length).toBe(33)

    const stack1 = [sigBuf1, pubKeyBuf1]

    const scriptInterpreter1 = ScriptInterpreter.fromOutputScriptTx(
      execScript1,
      tx,
      0,
      stack1,
      100n,
    )

    const result1 = scriptInterpreter1.evalScript()
    expect(result1).toBe(true)

    const txInput2 = tx.inputs[1]
    const txOutput2 = txOutMap.get(txInput2.inputTxId, txInput2.inputTxIndex)
    const execScript2 = txOutput2?.script as Script
    const sigBuf2 = txInput2.script.chunks[0].buffer as Uint8Array
    expect(sigBuf2?.length).toBe(65)
    const pubKeyBuf2 = txInput2.script.chunks[1].buffer as Uint8Array
    expect(pubKeyBuf2?.length).toBe(33)

    const stack2 = [sigBuf2, pubKeyBuf2]

    const scriptInterpreter2 = ScriptInterpreter.fromOutputScriptTx(
      execScript2,
      tx,
      1,
      stack2,
      100n,
    )

    const result2 = scriptInterpreter2.evalScript()
    expect(result2).toBe(true)
  })
})