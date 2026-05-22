import { Router } from "express";
import * as bankAccountController from "../controllers/bankAccount.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { requireRoles } from "../middlewares/roles.js";

export const bankAccountRouter = Router();

bankAccountRouter.use(authenticate);

bankAccountRouter.get("/picklist", bankAccountController.listPicklist);

bankAccountRouter.use(requireRoles("ADMIN", "MANAGER"));

bankAccountRouter.get("/", bankAccountController.list);
bankAccountRouter.post("/", bankAccountController.create);
bankAccountRouter.put("/:id", bankAccountController.update);
bankAccountRouter.get("/:id/transactions", bankAccountController.getTransactions);
