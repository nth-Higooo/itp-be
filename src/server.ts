import { createServer } from "http";
import "reflect-metadata";
import { Server } from "socket.io";

import application from "./application";
import Logger from "./utils/logger";
import config from "./configuration";
import { AppDataSource } from "./database/data-source";
import { createTransport } from "nodemailer";
import configuration from "./configuration";
import "dotenv/config";
const { instance: app } = application;
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: configuration.clientSite,
    credentials: true,
  },
});

io.on("connection", (socket) => {
  app.locals.socket = socket;

  Logger.info(`Socket.IO start with id: ${socket.id}`);
  socket.on("disconnect", (reason) => {
    Logger.info(`Socket.IO end by ${reason}`);
  });
});

AppDataSource.initialize()
  .then(() => {
    Logger.info("✅ Database connected successfully!");

    // Start the server after DB is ready
    httpServer.listen(config.port, () => {
      Logger.info(`🚀 Server is running on http://localhost:${config.port}`);
    });
  })
  .catch((err) => {
    Logger.error(`❌ Error during Data Source initialization: ${err.message}`);
    process.exit(1);
  });

app.locals.dataSource = AppDataSource;

const nodeMailer = createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: config.smtpSecure,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPassword,
  },
});
app.locals.nodeMailer = nodeMailer;
