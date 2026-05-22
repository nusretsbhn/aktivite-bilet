import { Router } from "express";
import * as currentAccountController from "../controllers/currentAccount.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { requireRoles } from "../middlewares/roles.js";

export const currentAccountRouter = Router();

currentAccountRouter.use(authenticate);
currentAccountRouter.use(requireRoles("ADMIN", "MANAGER"));

currentAccountRouter.get("/summary", currentAccountController.summary);
currentAccountRouter.get("/", currentAccountController.list);
currentAccountRouter.post("/", currentAccountController.create);
