import { Router } from "express";
import * as agencyController from "../controllers/agency.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { requireRoles } from "../middlewares/roles.js";

const managerUp = requireRoles("ADMIN", "MANAGER");

export const agencyRouter = Router();
export const agencyPriceRouter = Router();

agencyRouter.use(authenticate);
agencyPriceRouter.use(authenticate);

agencyRouter.get("/", agencyController.list);
agencyRouter.get("/:id", agencyController.getById);
agencyRouter.post("/", managerUp, agencyController.create);
agencyRouter.put("/:id", managerUp, agencyController.update);
agencyRouter.delete("/:id", managerUp, agencyController.remove);

agencyPriceRouter.get("/", agencyController.listPrices);
agencyPriceRouter.post("/", managerUp, agencyController.createPrice);
agencyPriceRouter.put("/:id", managerUp, agencyController.updatePrice);
agencyPriceRouter.delete("/:id", managerUp, agencyController.removePrice);
