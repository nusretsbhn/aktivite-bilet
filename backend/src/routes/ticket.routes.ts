import { Router } from "express";
import * as ticketController from "../controllers/ticket.controller.js";
import * as calendarController from "../controllers/calendar.controller.js";
import { authenticate } from "../middlewares/auth.js";

export const ticketRouter = Router();

ticketRouter.use(authenticate);

ticketRouter.get("/calendar", calendarController.getCalendar);
ticketRouter.get("/", ticketController.list);
ticketRouter.post("/", ticketController.create);
ticketRouter.get("/:id/images", ticketController.listImages);
ticketRouter.get("/:id/image", ticketController.getImage);
ticketRouter.get("/:id", ticketController.getById);
ticketRouter.put("/:id", ticketController.update);
ticketRouter.delete("/:id", ticketController.cancel);
