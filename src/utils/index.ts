import { sign } from "jsonwebtoken";
import config from "../configuration";
import { hashSync } from "bcryptjs";
import { generate } from "generate-password";
import CryptoJS from "crypto-js";
import Holiday from "../database/entities/Holiday";
import { AppDataSource } from "../database/data-source";
import { workingTime } from "./enums";
import { IDayWithStatus, IUserPermission } from "./interfaces";
export const getAccessToken = (userId: string) => {
  return sign({ iss: userId }, config.jwtAccessKey, { expiresIn: "1d" });
};

export const getRefreshToken = (userId: string) => {
  return sign({ iss: userId }, config.jwtRefreshKey, { expiresIn: "30d" });
};

export const validateEmail = (email: string) => {
  const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-z]{2,6}$/;
  return regex.test(email);
};
export const validateNumber = (number: string) => {
  const temp = removeCommas(number);
  const regex = /^-?\d+(\.\d+)?$/;
  return regex.test(temp);
};

// min 8 characters and least one lowercase letter, uppercase letter, number and symbol.
export const validatePassword = (password: string) => {
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$@$!%*?&])[A-Za-z\d$@$!%*?&]{8,}$/;
  return regex.test(password);
};

export const getHashPassword = (password: string) => {
  return hashSync(password, 12);
};

export const generateUniqueString = (length = 50) => {
  return generate({ length, numbers: true });
};

export const omit = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  // Create a shallow copy of the object
  const result = { ...obj };

  // Iterate over the keys to be omitted
  keys.forEach((key) => {
    // Delete the key from the result object if it exists
    if (key in result) {
      delete result[key];
    }
  });

  return result;
};

export const pick = <T extends object, K extends keyof T>(
  object: T,
  keys: K[]
): Pick<T, K> => {
  const result: Partial<T> = {};

  for (const key of keys) {
    if (key in object) {
      result[key] = object[key];
    }
  }

  return result as Pick<T, K>;
};

export const encryptSalary = (salary: number | string): string => {
  const salaryString = String(salary);
  const encrypted = CryptoJS.AES.encrypt(
    salaryString,
    config.cryptoKey
  ).toString();
  return encrypted;
};

export const decryptSalary = (encryptedSalary: string): number => {
  if (!encryptedSalary) {
    return 0;
  }

  const bytes = CryptoJS.AES.decrypt(encryptedSalary, config.cryptoKey);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  return parseFloat(decrypted);
};

// Function to remove commas
export const removeCommas = (value: string | number): string => {
  if (typeof value === "string") {
    // Replace commas or dots used as thousand separators (only before groups of three digits)
    const cleanedValue = value.replace(/[,\.](?=\d{3})/g, "");
    return parseFloat(cleanedValue).toString();
  }
  return value.toString();
};

export const getDaysInMonth = (
  month: number,
  year: number
): IDayWithStatus[] => {
  let days: IDayWithStatus[] = [];

  // Get the last day of the month
  const lastDayOfMonth = new Date(year, month, 0); // Last day of the specified month
  // Loop through the days of the month
  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    const currentDate = new Date(year, month - 1, day); // Create date object for the current day

    // Check if the current day is Saturday (6) or Sunday (0)
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;

    // Push an object with the date and weekend status
    days.push({
      date: currentDate.toLocaleDateString(),
      isWeekend,
    });
  }

  return days;
};

export const compareDatesByDayMonthYear = (
  date1: Date,
  date2: Date
): number => {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());

  if (d1 > d2) {
    return 1; // date1 is greater (later)
  } else if (d1 < d2) {
    return -1; // date1 is less (later)
  } else {
    return 0; // dates are equal
  }
};

export const generateFileName = (
  name: string = "file",
  hasExtension: boolean = false,
  extension: string = "txt"
) => {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[-:T.]/g, "")
    .slice(0, 14); // YYYYMMDDHHMMSS
  if (hasExtension) {
    return `${name}_${timestamp}.${extension}`;
  }
  return `${name}_${timestamp}`;
};

export const isHoliday = async (date: Date): Promise<Boolean> => {
  const holidayRepository = AppDataSource.getRepository(Holiday);

  const holiday = await holidayRepository
    .createQueryBuilder("holiday")
    .where(":date BETWEEN holiday.startDate AND holiday.endDate", { date })
    .getOne();

  if (holiday) {
    return true;
  }

  return false;
};

export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

export const calculateWorkHours = (start: Date, end: Date): number => {
  const clampTime = (date: Date, minHour: number, maxHour: number): Date => {
    const clampedDate = new Date(date);
    const hours = date.getHours();
    if (hours < minHour) clampedDate.setHours(minHour, 0, 0, 0);
    if (hours >= maxHour) clampedDate.setHours(maxHour, 0, 0, 0);
    return clampedDate;
  };

  start = clampTime(
    start,
    workingTime.WORK_HOURS_START,
    workingTime.WORK_HOURS_END
  );
  end = clampTime(
    end,
    workingTime.WORK_HOURS_START,
    workingTime.WORK_HOURS_END
  );

  let totalMilliseconds = end.getTime() - start.getTime();

  const breakStart = new Date(start);
  const breakEnd = new Date(start);
  breakStart.setHours(workingTime.BREAK_HOURS_START, 0, 0, 0);
  breakEnd.setHours(workingTime.BREAK_HOURS_END, 0, 0, 0);

  if (start < breakEnd && end > breakStart) {
    totalMilliseconds -=
      Math.min(end.getTime(), breakEnd.getTime()) -
      Math.max(start.getTime(), breakStart.getTime());
  }

  return totalMilliseconds / (60 * 60 * 1000);
};

export const calculateNumberOfDays = async (
  startDate: Date,
  endDate: Date
): Promise<number> => {
  if (!startDate || !endDate) return 0;

  if (compareDatesByDayMonthYear(startDate, endDate) === 0) {
    return isWeekend(startDate) || (await isHoliday(startDate)).valueOf()
      ? 0
      : calculateWorkHours(startDate, endDate) / workingTime.WORK_HOURS_PER_DAY;
  }

  let totalWorkDays = 0;
  let currentDate = new Date(startDate);

  // Add working hours for the first day
  if (!isWeekend(currentDate) && !(await isHoliday(currentDate))) {
    totalWorkDays +=
      calculateWorkHours(
        startDate,
        new Date(currentDate.setHours(workingTime.WORK_HOURS_END, 0, 0, 0))
      ) / workingTime.WORK_HOURS_PER_DAY;
  }

  // Add full work days between start and end
  currentDate.setDate(currentDate.getDate() + 1);
  currentDate.setHours(0, 0, 0, 0);
  while (compareDatesByDayMonthYear(currentDate, endDate) < 0) {
    if (!isWeekend(currentDate) && !(await isHoliday(currentDate))) {
      totalWorkDays += 1;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Add working hours for the last day
  if (!isWeekend(endDate) && !(await isHoliday(endDate))) {
    totalWorkDays +=
      calculateWorkHours(
        new Date(currentDate.setHours(workingTime.WORK_HOURS_START, 0, 0, 0)),
        endDate
      ) / workingTime.WORK_HOURS_PER_DAY;
  }

  return Number(totalWorkDays.toFixed(1));
};

export const checkPermission = (
  expectedPermission: IUserPermission,
  myPermission: IUserPermission[]
) => {
  const existPermission = myPermission.find(
    (item: IUserPermission) => item.permission === expectedPermission.permission
  );
  if (existPermission) {
    for (const key of Object.keys(expectedPermission)) {
      if (!Object.keys(existPermission).includes(key)) {
        return false;
      }
    }
    return true;
  }
  return false;
};

export const calculateDistanceInDays = (date1: Date, date2: Date): number => {
  const timeDifference = Math.abs(date2.getTime() - date1.getTime());
  const millisecondsInADay = 24 * 60 * 60 * 1000;
  return Math.ceil(timeDifference / millisecondsInADay);
};

export const calculateMinutesBetweenTimes = (
  time1: string,
  time2: string
): number => {
  const startTime = new Date(`1970-01-01T${time1}`);
  const endTime = new Date(`1970-01-01T${time2}`);

  const differenceInMs = endTime.getTime() - startTime.getTime();

  return differenceInMs / (1000 * 60);
};

export const convertHoursToTime = (hours: number): string => {
  const wholeHours = Math.floor(hours);

  const minutes = Math.round((hours - wholeHours) * 60);

  return `${wholeHours}:${minutes.toString().padStart(2, "0")}`;
};

export const clearSignAndUppercase = (text: string): string => {
  // Remove diacritical marks (e.g., accents)
  text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Convert to uppercase
  return text.toUpperCase();
};

export const removeEmptyValues = <T extends Record<string, any>>(obj: T): T => {
  Object.keys(obj).forEach((key: string) => {
    if (obj[key] === null || obj[key] === undefined || obj[key] === "") {
      delete obj[key];
    }
  });
  return obj;
};
