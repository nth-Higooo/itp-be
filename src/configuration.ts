import "dotenv/config";
import path from "path";

interface ConfigValues {
  env: string;
  port: number;
  dbHost: string;
  dbPort: number;
  dbUsername: string;
  dbPassword: string;
  dbDatabase: string;
  dbSynchronize: boolean;
  dbLogging: boolean;
  dbEntitiesDir: string;
  dbSubscribersDir: string;
  dbMigrationsDir: string;
  jwtAccessKey: string;
  jwtRefreshKey: string;
  clientSite: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
}

class Config implements ConfigValues {
  env = process.env.NODE_ENV || "development";
  port = parseInt(process.env.PORT || "4000", 10);
  dbHost = process.env.DB_HOST || "localhost";
  dbPort = parseInt(process.env.DB_PORT || "5432", 10);
  dbUsername = process.env.DB_USERNAME || "postgres";
  dbPassword = process.env.DB_PASSWORD || "postgres";
  dbDatabase = process.env.DB_DATABASE || "hrms";
  dbSynchronize = process.env.DB_SYNCHRONIZE
    ? process.env.DB_SYNCHRONIZE === "true"
    : true;
  dbLogging = process.env.DB_LOGGING ? process.env.DB_LOGGING === "true" : true;
  dbEntitiesDir = process.env.DB_ENTITIES_DIR || "src/database/entities/*.ts";
  dbSubscribersDir =
    process.env.DB_SUBSCRIBERS_DIR || "src/database/subscribers/*.ts";
  dbMigrationsDir =
    process.env.DB_MIGRATIONS_DIR || "src/database/migrations/*.ts";
  jwtAccessKey = process.env.JWT_ACCESS_KEY || "THIS IS ACCESS KEY";
  jwtRefreshKey = process.env.JWT_REFRESH_KEY || "THIS IS REFRESH KEY";
  clientSite = process.env.CLIENT_SITE || "http://localhost:5173";
  smtpHost = process.env.SMTP_HOST || "mail9066.maychuemail.com";
  smtpPort = parseInt(process.env.SMTP_PORT || "25", 10);
  smtpSecure = process.env.SMTP_SECURE === "true";
  smtpUser = process.env.SMTP_USER || "";
  smtpPassword = process.env.SMTP_PASSWORD || "";

  zkIP = process.env.ZK_IP || "";
  zkPort = parseInt(process.env.ZK_PORT || "4370", 10);
  zkInPort = parseInt(process.env.ZK_IN_PORT || "5200", 10);

  upload_image_temp_dir = path.resolve(
    process.env.UPLOAD_IMAGE_TEMP_DIR || "uploads/images/temp"
  );
  upload_image_dir = path.resolve(
    process.env.UPLOAD_IMAGE_DIR || "uploads/images"
  );
  upload_pdf_temp_dir = path.resolve(
    process.env.UPLOAD_IMAGE_TEMP_DIR || "uploads/pdfs/temp"
  );
  upload_pdf_dir = path.resolve(process.env.UPLOAD_IMAGE_DIR || "uploads/pdfs");
  upload_excel_temp_dir = path.resolve(
    process.env.UPLOAD_EXCEL_TEMP_DIR || "uploads/excels/temp"
  );
  upload_excel_dir = path.resolve(
    process.env.UPLOAD_EXCEL_DIR || "uploads/excels"
  );
  upload_csv_temp_dir = path.resolve(
    process.env.UPLOAD_CSV_TEMP_DIR || "uploads/csvs/temp"
  );
  upload_csv_dir = path.resolve(process.env.UPLOAD_CSV_DIR || "uploads/csvs");

  upload_time_sheet_temp_dir = path.resolve(
    process.env.UPLOAD_TIME_SHEET_TEMP_DIR || "uploads/time_sheets/temp"
  );
  upload_time_sheet_dir = path.resolve(
    process.env.UPLOAD_TIME_SHEET_DIR || "uploads/time_sheets"
  );
  serverSite = process.env.SERVER_SITE || "http://localhost:4000";
  cryptoKey = process.env.CRYPTO_KEY || "THIS IS CRYPTO KEY";
}

export default new Config();
