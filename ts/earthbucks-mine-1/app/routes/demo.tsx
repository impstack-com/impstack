import type { MetaFunction } from "@remix-run/node";
import Button from "../button";
import { Buffer } from "buffer";
import PowGpu from "../.client/pow-gpu";
import { blake3Sync, blake3Async } from "earthbucks-blake3/src/blake3-async";
import { $image } from "~/util";

export const meta: MetaFunction = () => {
  return [
    { title: "EarthBucks Mine 1" },
    { name: "description", content: "Welcome to EarthBucks Mine 1!" },
  ];
};

export default function Landing() {
  async function onComputing() {
    console.log("begin");
    // gpupow matrixCalculationFloat
    {
      console.time("gpupow matrixCalculationFloat");
      let previousBlockIds = [blake3Sync(Buffer.from("previousBlockId"))];
      let workingBlockId = blake3Sync(Buffer.from("workingBlockId"));
      let gpupow = new PowGpu(workingBlockId, previousBlockIds);

      for (let i = 0; i < 100; i++) {
        let workingBlockId = blake3Sync(Buffer.from("workingBlockId" + i));
        gpupow.updateWorkingBlockId(workingBlockId);
        let reducedBufs = await gpupow.algo1627();
        gpupow
          .reducedBufsHashAsync(reducedBufs, blake3Async)
          .then((matrixHashBuf) => {
            console.log(matrixHashBuf.toString("hex"));
          });
      }
      console.timeEnd("gpupow matrixCalculationFloat");
    }
    console.log("end");
  }
  return (
    <div className="">
      <div className="my-4 flex">
        <div className="mx-auto">
          <div className="inline-block align-middle">
            <img
              src={$image("/button-logo.png")}
              alt=""
              className="mx-auto mb-4 block aspect-square w-[120px] rounded-full bg-[#020a2c] p-[1px] shadow-lg shadow-[#04408d]"
            />
            <div className="hidden dark:block">
              <img
                src={$image("/compubutton-text-white.png")}
                alt="EarthBucks Mine 1"
                className="mx-auto block w-[300px]"
              />
            </div>
            <div className="block dark:hidden">
              <img
                src={$image("/compubutton-text-black.png")}
                alt="EarthBucks Mine 1"
                className="mx-auto block w-[300px]"
              />
            </div>
            <div className="mt-4 text-center text-black dark:text-white">
              EarthBucks proof-of-GPU demonstration.
              <br />
              Watch your browser console.
            </div>
          </div>
        </div>
      </div>
      <div className="mb-4 mt-4 h-[80px]">
        <div className="mx-auto w-[320px]">
          <Button initialText="Compute" mode="mine" onComputing={onComputing} />
        </div>
      </div>
    </div>
  );
}