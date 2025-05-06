import cron from "node-cron";
import { birthdayRemind } from "./birthdayRemind";
import { contractRemind } from "./contractRemind";
import { remainingAnnual } from "./remainingAnnual";
import { expiredContract } from "./expiredContract";

export const initCronModule = () => {
  // Every day at 00:00:01
  if (!cron.getTasks().has("1 0 * * *")) {
    cron.schedule("1 0 * * *", async () => {
      try {
        birthdayRemind();
        contractRemind();
        remainingAnnual();
        expiredContract();
      } catch (error) {
        console.log("Cron Error: " + error);
      }
    });
  }
};
