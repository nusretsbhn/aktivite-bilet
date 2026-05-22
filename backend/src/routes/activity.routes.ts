import { Router } from "express";
import * as activityController from "../controllers/activity.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { requireRoles } from "../middlewares/roles.js";

export const activityRouter = Router();

activityRouter.use(authenticate);

activityRouter.get("/", activityController.listAll);
activityRouter.get("/:id", activityController.getById);

activityRouter.use(requireRoles("ADMIN", "MANAGER"));

activityRouter.post("/", activityController.create);
activityRouter.put("/:id", activityController.update);
activityRouter.delete("/:id", activityController.remove);
