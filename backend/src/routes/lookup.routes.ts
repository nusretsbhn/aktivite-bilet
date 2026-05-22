import { Router } from "express";
import * as lookupController from "../controllers/lookup.controller.js";
import { authenticate } from "../middlewares/auth.js";

export const lookupRouter = Router();

lookupRouter.use(authenticate);

