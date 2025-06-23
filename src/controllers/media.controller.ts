import { NextFunction, Request, Response } from "express";
import Authenticate from "../decorators/authenticate";
import Authorize from "../decorators/authorize";
import Controller from "../decorators/controller";
import { Post } from "../decorators/handlers";

import config from "../configuration";
import {
  compressImageWithFFmpeg,
  getNameFromFilename,
  handleUploadImage,
  handleUploadPDF,
} from "../utils/file";
import { MediaType } from "../utils/enums";
import path from "path";

@Controller("/medias")
@Authenticate()
export default class MediaController {
  @Post("/upload-image")
  @Authorize()
  public async uploadImage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const files: any = await handleUploadImage(req);
      const file = files[0];
      const filePath = file.filepath;
      const name = getNameFromFilename(file.newFilename);

      // Ép đuôi file về .jpg
      const newFilename = `${name}.jpg`;
      const outputPath = path.resolve(config.upload_image_dir, newFilename);

      await compressImageWithFFmpeg(filePath, outputPath);

      res.locals.data = {
        url: `${config.serverSite}/static/image/${newFilename}`,
        type: MediaType.Image,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Post("/upload-pdf")
  @Authorize()
  public async uploadPDF(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const files: any = await handleUploadPDF(req);
      const fileName = files[0].newFilename;

      res.locals.data = {
        url: `${config.serverSite}/static/pdfs/${fileName}`,
        type: MediaType.Pdf,
      };

      next();
    } catch (error) {
      next(error);
    }
  }
}
