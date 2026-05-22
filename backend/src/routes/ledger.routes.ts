import { Router } from "express";
import * as ledgerController from "../controllers/ledger.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { requireRoles } from "../middlewares/roles.js";

export const ledgerRouter = Router();

ledgerRouter.use(authenticate);
ledgerRouter.use(requireRoles("ADMIN", "MANAGER"));

ledgerRouter.get("/", ledgerController.list);
ledgerRouter.get("/summary", ledgerController.summary);
ledgerRouter.get("/categories", ledgerController.categories);
ledgerRouter.post("/", ledgerController.create);
ledgerRouter.put("/:id", ledgerController.update);
ledgerRouter.delete("/:id", ledgerController.remove);
