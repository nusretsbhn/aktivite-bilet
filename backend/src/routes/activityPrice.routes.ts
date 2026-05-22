import { Router } from "express";
import * as activityPriceController from "../controllers/activityPrice.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { requireRoles } from "../middlewares/roles.js";

export const activityPriceRouter = Router();

activityPriceRouter.use(authenticate);

activityPriceRouter.get("/for-date", activityPriceController.getForDate);

activityPriceRouter.use(requireRoles("ADMIN", "MANAGER"));

activityPriceRouter.get("/", activityPriceController.list);
activityPriceRouter.post("/", activityPriceController.create);
activityPriceRouter.put("/:id", activityPriceController.update);
activityPriceRouter.delete("/:id", activityPriceController.remove);
