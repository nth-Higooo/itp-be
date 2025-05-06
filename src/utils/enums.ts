export enum MetadataKeys {
  BASE_PATH = "base_path",
  ROUTERS = "routers",
  AUTHORIZE = "authorize",
  AUTHENTICATE = "authenticate",
}

export enum HttpMethods {
  GET = "get",
  POST = "post",
  PUT = "put",
  DELETE = "delete",
}

export enum MediaType {
  Image = "image",
  Video = "video",
  Pdf = "pdf",
}

export const enum workingTime {
  WORK_HOURS_START = 9,
  WORK_HOURS_END = 18,
  BREAK_HOURS_START = 12,
  BREAK_HOURS_END = 13,
  WORK_HOURS_PER_DAY = WORK_HOURS_END -
    WORK_HOURS_START -
    (BREAK_HOURS_END - BREAK_HOURS_START),
}

export const enum NotificationContentType {
  MAIL = "mail",
  CHAT = "chat",
  ORDER = "order",
  DELIVERY = "delivery",
}
