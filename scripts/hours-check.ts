import { openState } from "../lib/hours";

function assert(label: string, value: boolean) {
  if (!value) {
    console.error("FAIL", label);
    process.exitCode = 1;
  } else {
    console.log("ok", label);
  }
}

const fridayEvening = new Date("2026-11-06T23:30:00-06:00");
const fridayMorning = new Date("2026-11-06T10:00:00-06:00");
const sundayNoon = new Date("2026-11-01T12:00:00-06:00");
const hardRock = "Su-Th 11:00-22:00; Fr-Sa 11:00-24:00";

assert("friday evening open", openState(hardRock, fridayEvening)?.open === true);
assert("friday morning closed", openState(hardRock, fridayMorning)?.open === false);
assert("sunday noon open", openState(hardRock, sundayNoon)?.open === true);
assert("24/7", openState("24/7", fridayMorning)?.open === true);
assert("weekend off", openState("Mo-Fr 09:00-17:00", sundayNoon)?.open === false);
assert("rejects months", openState("Mar-Oct: Mo-Su 10:00-20:00") === null);

const overnight = new Date("2026-11-07T01:00:00-06:00");
assert("overnight spill", openState("Fr 18:00-02:00", overnight)?.open === true);
