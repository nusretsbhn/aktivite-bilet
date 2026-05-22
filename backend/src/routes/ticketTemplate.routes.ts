import { Router } from "express";
import * as templateController from "../controllers/ticketTemplate.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { requireRoles } from "../middlewares/roles.js";

export const ticketTemplateRouter = Router();

ticketTemplateRouter.use(authenticate);
ticketTemplateRouter.use(requireRoles("ADMIN"));

ticketTemplateRouter.get("/", templateController.list);
ticketTemplateRouter.post("/", templateController.create);
ticketTemplateRouter.put("/:id", templateController.update);
ticketTemplateRouter.delete("/:id", templateController.remove);
