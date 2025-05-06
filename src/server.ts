import { createServer } from "http";
import "reflect-metadata";
import { Server } from "socket.io";
import "dotenv/config";

import application from "./application";
import Logger from "./utils/logger";
import config from "./configuration";
import { AppDataSource } from "./database/data-source";
import { createTransport } from "nodemailer";

const { instance: app } = application;
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: config.clientSite,
    credentials: true,
  },
});

io.on("connection", (socket) => {
  app.locals.socket = socket;
  Logger.info(`Socket.IO connected with ID: ${socket.id}`);

  socket.on("disconnect", (reason) => {
    Logger.info(`Socket.IO disconnected due to: ${reason}`);
  });
});

AppDataSource.initialize()
  .then(() => {
    Logger.info("✅ Database connected successfully!");

    // ✅ Ensure dynamic PORT for Render
    const PORT = process.env.PORT
      ? parseInt(process.env.PORT, 10)
      : config.port || 3000;

    httpServer.listen(PORT, () => {
      Logger.info(`🚀 Server is running on http://localhost:${PORT}`);
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
