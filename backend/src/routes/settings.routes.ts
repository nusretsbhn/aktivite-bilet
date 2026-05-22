import { Router } from "express";
import * as settingsController from "../controllers/settings.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { requireRoles } from "../middlewares/roles.js";

export const settingsRouter = Router();

settingsRouter.use(authenticate);
settingsRouter.use(requireRoles("ADMIN"));

settingsRouter.get("/", settingsController.get);
settingsRouter.put("/", settingsController.update);
settingsRouter.post("/logo", settingsController.uploadLogo);
